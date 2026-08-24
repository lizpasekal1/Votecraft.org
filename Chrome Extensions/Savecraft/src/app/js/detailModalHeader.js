// ===== DETAIL MODAL: HEADER (image, sponsored tag, bookmark/favorite, title/author, website CTA) =====

import { state, CURATED_ITEMS, CATEGORY_WHY_TEXT, CURATED_NOTES_CATEGORIES, CREATOR_CARD_CATEGORY } from './state.js';
import { escapeHtml, catClass, isMusicAlbumsSectionView, isOwnAuthorPageView, getVideoEmbedUrl, isYoutubeThumbnailUrl } from './utils.js';
import { persistItem, persistAuthor } from './storage.js';
import { ensureArtistWebsite } from './api.js';
import { findAuthor, navigateToAuthor, ensureLiveItem, getCachedAlbumArt, ensureAlbumArt } from './authors.js';
import { closeDetailModal, getDetailItem, openImageLightbox, openVideoLightbox } from './detailModal.js';
import { renderSidebar, renderGrid } from './render.js';
import { toggleQueueFromHeader } from './detailModalQueue.js';
import { resourceUrl } from './platform.js';
import { navigateToView } from './navigation.js';

const BOOKMARK_OUTLINE = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M200-120v-640q0-33 23.5-56.5T280-840h400q33 0 56.5 23.5T760-760v640L480-240 200-120Zm80-122 200-86 200 86v-518H280v518Zm0-518h400-400Z"/></svg>`;
const BOOKMARK_FILLED = `<svg xmlns="http://www.w3.org/2000/svg" height="22px" viewBox="0 -960 960 960" width="22px" fill="currentColor"><path d="M200-120v-640q0-33 23.5-56.5T280-840h400q33 0 56.5 23.5T760-760v640L480-240 200-120Z"/></svg>`;
const FAVORITE_STAR_OUTLINE = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m354-287 126-76 126 77-33-144 111-96-146-13-58-136-58 135-146 13 111 97-33 143ZM233-120l65-281L80-590l288-25 112-265 112 265 288 25-218 189 65 281-247-149-247 149Zm247-350Z"/></svg>`;
const FAVORITE_STAR_FILLED = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m233-120 65-281L80-590l288-25 112-265 112 265 288 25-218 189 65 281-247-149-247 149Z"/></svg>`;

function updateDetailActions() {
  // Always visible now — editing an unsaved curated item auto-adds it to the user's saves
  // (see the 'cur-' branch of handleSaveItem in addEditModal.js), so there's no longer a
  // state where editing wouldn't be a valid, safe action.
  document.getElementById('detail-edit').style.display = '';
}

export function updateBookmarkIcon(item) {
  // Reflects queue status specifically (not just "saved") — deselecting via the header icon
  // clears queueStatus but deliberately leaves the item in state.items, so a plain saved-check
  // would still show the filled icon after deselecting.
  const liveItem = state.items.find(i => i.id === item.id);
  const queued = !!liveItem?.queueStatus;
  const btn = document.getElementById('detail-bookmark-btn');
  if (btn) {
    btn.innerHTML = queued ? BOOKMARK_FILLED : BOOKMARK_OUTLINE;
    btn.classList.toggle('detail-bookmark-btn--saved', queued);
    const tooltip = queued ? 'Remove from Queue' : 'Add to Queue';
    btn.title = tooltip;
    btn.setAttribute('data-tooltip', tooltip);
  }
  updateDetailActions();
}

export function updateFavoriteIcon(item) {
  const favBtn = document.getElementById('detail-favorite-btn');
  if (!favBtn) return;
  const liveItem = state.items.find(i => i.id === item.id);
  const favorited = !!liveItem?.favorite;
  favBtn.innerHTML = favorited ? FAVORITE_STAR_FILLED : FAVORITE_STAR_OUTLINE;
  favBtn.classList.toggle('detail-favorite-btn--active', favorited);
}

// ===== "Save to:" dropdown (star button) =====
// Built/torn down on demand (not static markup in index.html) — only ever one instance, closed on
// outside click/Escape/re-toggle. Checkbox-style, multi-select across state.savedLists (whatever's
// currently seeded there — Favorites/Health/Motivation today, and anything the sidebar's own
// "+ New folder" adds later, automatically, since this just reads the same array): each option
// toggles independently, so an item can end up in any combination of lists at once — including
// all of them simultaneously — not just one at a time. Still styled to look like a radio button
// (a plain circle, not a checkbox square — see .detail-save-to-menu-radio in detailModal.css) per
// this app's original "Save to:" visual design; it's the underlying *selection logic* that's
// checkbox-like now, not the look. "Favorites" is the one special case, driving the existing
// item.favorite boolean (Dashboard's Favorites Spotlight, getAllFavoriteItems(), etc. all already
// read that field) rather than a second, redundant membership record; every other list uses the
// item.savedListIds array. The menu stays open across multiple picks (only the clicked row's own
// state changes) — closes only on outside click/Escape/re-toggling the star, not per-selection.
let _saveToMenuEl = null;

function _closeSaveToMenu() {
  _saveToMenuEl?.remove();
  _saveToMenuEl = null;
  document.removeEventListener('click', _saveToMenuOutsideClickHandler, true);
  document.removeEventListener('keydown', _saveToMenuEscHandler, true);
}

// Registered on document with capture:true, so it fires *before* a row button's own bubble-phase
// click handler even runs — a plain e.stopPropagation() inside that handler can't stop this (it
// already fired, earlier in the same click's capture phase, by the time bubble phase reaches the
// button). Checking containment here instead is what actually keeps the menu open while picking
// multiple options: only a genuine click outside the menu closes it.
function _saveToMenuOutsideClickHandler(e) {
  if (_saveToMenuEl?.contains(e.target)) return;
  _closeSaveToMenu();
}

function _saveToMenuEscHandler(e) {
  if (e.key === 'Escape') _closeSaveToMenu();
}

// Checked by id, not display name ("Favorites" is renameable, e.g. to "All My Saves" — see
// storage.js's migration) — default-favorites is the one list id that drives the existing
// item.favorite boolean instead of item.savedListIds.
function _isListSelected(liveItem, list) {
  return list.id === 'default-favorites' ? !!liveItem.favorite : (liveItem.savedListIds || []).includes(list.id);
}

async function _toggleSaveToMenu(item) {
  if (_saveToMenuEl) { _closeSaveToMenu(); return; }

  const liveItem = state.items.find(i => i.id === item.id) || item;

  const menu = document.createElement('div');
  menu.className = 'detail-save-to-menu';
  const rowsHtml = state.savedLists.map(list => {
    const checked = _isListSelected(liveItem, list);
    return `
    <button type="button" class="detail-save-to-menu-item" data-list-id="${escapeHtml(list.id)}" data-list-name="${escapeHtml(list.name)}">
      <span class="detail-save-to-menu-radio${checked ? ' detail-save-to-menu-radio--checked' : ''}"></span>
      <span class="detail-save-to-menu-item-name">${escapeHtml(list.name)}</span>
    </button>`;
  }).join('');
  menu.innerHTML = `<div class="detail-save-to-menu-title">Save to:</div>${rowsHtml}`;
  document.getElementById('detail-favorite-btn').insertAdjacentElement('afterend', menu);
  _saveToMenuEl = menu;

  menu.querySelectorAll('[data-list-id]').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const list = { id: btn.dataset.listId, name: btn.dataset.listName };
      const target = await ensureLiveItem(item);
      const wasSelected = _isListSelected(target, list);
      // Toggles just this one list's membership — every other list's own selection (including
      // Favorites) is left exactly as it was, so any combination can end up checked at once.
      if (list.id === 'default-favorites') {
        target.favorite = !wasSelected;
      } else {
        const ids = new Set(target.savedListIds || []);
        if (wasSelected) ids.delete(list.id); else ids.add(list.id);
        target.savedListIds = [...ids];
      }
      await persistItem(target);
      updateFavoriteIcon(item);
      btn.querySelector('.detail-save-to-menu-radio').classList.toggle('detail-save-to-menu-radio--checked', !wasSelected);
      renderSidebar();
      renderGrid();
    });
  });

  // Deferred a tick — the click that opened the menu would otherwise immediately bubble to this
  // same listener and close it right back.
  setTimeout(() => {
    document.addEventListener('click', _saveToMenuOutsideClickHandler, true);
    document.addEventListener('keydown', _saveToMenuEscHandler, true);
  }, 0);
}

export function setupHeader(item, { domain, isMusicAlbum, isMusicianItem }) {
  // Checked against the actual curated data instead of guessing at id-prefix conventions (which
  // turned out wrong for at least Books) — this works for every category with real Top 100
  // curated content, automatically, with no per-category id scheme to keep in sync. Deliberately
  // NOT gated on item.curated — bookmarking/queueing a curated item (ensureLiveItem()) flips
  // curated to false but keeps the same id, and the badge should keep showing for that same Top
  // 100 item once it's saved, not disappear the moment it's queued. A manually-added item's id
  // (a Date.now() timestamp string) will never match a real curated doc's id, so this still
  // correctly excludes anything the user actually created themselves.
  const isCuratedTop100 = !!item.id && !!(CURATED_ITEMS['Top 100']?.[item.category] || []).some(i => i.id === item.id);

  // Movie's "Videos" folder — clicking the featured image opens an embedded player for the
  // actual YouTube/Vimeo link instead of the plain image lightbox every other category gets.
  const _videoEmbedUrl = item.category === 'Movie' && item.folderId === 'default-movies-videos'
    ? getVideoEmbedUrl(item.url)
    : null;

  const wrap = document.getElementById('detail-image-wrap');
  // Extra zoom-crop for YouTube thumbnails specifically (isYoutubeThumbnailUrl, utils.js) — some
  // have real black bars baked into the image itself that a plain object-fit: cover can shrink but
  // not fully eliminate, per direct report ("i don't want to see black bands... expand the youtube
  // video images so they full bleed the image container").
  const _imageClass = `detail-image${isMusicianItem ? ' detail-image--faces' : ''}${(isMusicAlbum || _videoEmbedUrl) ? ' detail-image--clickable' : ''}${isYoutubeThumbnailUrl(item.imageUrl) ? ' detail-image--zoom' : ''}`;
  document.getElementById('detail-body').classList.toggle('detail-body--tight-bottom', isMusicianItem);
  document.getElementById('detail-bookmark-btn').style.display = '';
  document.getElementById('detail-favorite-btn').style.display = '';

  // Only the Sponsored Statement badge appears in this corner now — the Album Art toggle button
  // was removed (clicking the image itself still opens the full-art lightbox, see below).
  let _sponsoredTagHtml = '';
  if (isCuratedTop100) {
    const whyText = CATEGORY_WHY_TEXT[item.category]
      || 'What we watch shapes how we see power and justice — the same questions at the heart of civic life.';
    _sponsoredTagHtml = `
      <a class="vc-sponsored-tag vc-sponsored-tag--overlay" href="${resourceUrl('src/sponsored/sponsored.html')}" target="_blank">⚡ Your Statement<span class="vc-sponsored-tooltip">
          <span class="vc-why-title">WHY VOTECRAFT RECOMMENDS</span>
          <span class="vc-why-tooltip-text">${whyText}</span>
        </span>
      </a>`;
  }

  // Album art gallery — extra images (back cover, booklet/insert pages, etc.) are fetched on
  // demand via the lightbox's own "Load More Art" button, shown below the full-size image (never
  // automatically, to respect MusicBrainz's rate limit and avoid background traffic across a
  // whole saved library). getCachedAlbumArt reads whatever's already cached without ever
  // triggering a fetch itself.
  const _cachedArt = isMusicAlbum ? getCachedAlbumArt(item) : null; // null = never fetched yet
  const _buildGalleryImages = () => {
    const liveItem = item.curated ? item : (state.items.find(i => i.id === item.id) || item);
    const extra = getCachedAlbumArt(item) || [];
    const images = [];
    if (liveItem.imageUrl) images.push({ full: liveItem.imageUrl, thumb: liveItem.imageUrl, type: 'Cover' });
    extra.forEach(img => { if (img.full !== liveItem.imageUrl) images.push(img); });
    return images;
  };
  const _canLoadMoreArt = isMusicAlbum && (item.author || (item.curated && item.notes)) && item.title && _cachedArt === null;
  const _loadMoreArtHandler = _canLoadMoreArt ? async btn => {
    btn.disabled = true;
    btn.textContent = 'Checking…';
    const images = await ensureAlbumArt(item);
    if (getDetailItem() !== item) return; // modal moved on to a different item while awaiting
    if (images === null) {
      btn.disabled = false;
      btn.textContent = 'Couldn’t check — Retry';
      return;
    }
    // Fetch attempt completed — refresh the still-open lightbox in place with whatever's now
    // cached (its button disappears since getCachedAlbumArt now returns non-null) and re-render
    // the header thumbnail too, in case item.imageUrl was upgraded.
    openImageLightbox(_buildGalleryImages(), 0, null);
    setupHeader(item, { domain, isMusicAlbum, isMusicianItem });
    if (images.length === 0) alert('No data available currently');
  } : null;
  const _openGallery = () => openImageLightbox(_buildGalleryImages(), 0, _loadMoreArtHandler);

  if (item.imageUrl) {
    wrap.innerHTML = `<div class="detail-image-crop"><img class="${_imageClass}" src="${escapeHtml(item.imageUrl)}" alt=""></div>${_sponsoredTagHtml}`;
    wrap.style.display = '';
    if (_videoEmbedUrl) {
      wrap.querySelector('.detail-image').addEventListener('click', () => openVideoLightbox(_videoEmbedUrl));
    } else if (isMusicAlbum) {
      wrap.querySelector('.detail-image').addEventListener('click', _openGallery);
    }
  } else {
    const letter = (item.title || domain || '?')[0].toUpperCase();
    wrap.innerHTML = `<div class="detail-image-crop"><div class="detail-placeholder placeholder-${catClass(item.category || 'Music-Album')}">${letter}</div></div>${_sponsoredTagHtml}`;
    wrap.style.display = '';
  }

  updateBookmarkIcon(item);
  updateFavoriteIcon(item);
  const _detailAuthorName = item.author
    || (item.curated && CURATED_NOTES_CATEGORIES.includes(item.category) ? item.notes : null);
  // When the name comes from the curated `.notes` fallback (no item.author), the profile page
  // to link to is 'Musician' for a Music Album (the one category whose curated-notes creator
  // isn't its own category) and item.category for everything else.
  const _detailAuthorCat = item.author ? item.category : (item.category === 'Music Album' ? 'Musician' : item.category);
  // True for any curated "creator card" (Musician, Book Author, Movie Director, Show Creator,
  // Game Studio) — the title itself already IS the creator's name/link, so the separate author
  // byline below would be redundant.
  const _isCuratedMusician = item.curated && !!CREATOR_CARD_CATEGORY[item.category];

  // Music Album now leads with the artist name in the main title line itself — "Harry Styles |
  // Fine Line" — rather than a separate line above it. The artist is a clickable link to their
  // author page (unless we're already on that artist's own Music Albums section, where linking
  // back to themselves would be redundant), styled purple via .detail-album-artist-link; the
  // album title after it stays the title's normal white color.
  const _albumTitleArtistHtml = isMusicAlbum && _detailAuthorName
    ? `${isMusicAlbumsSectionView()
        ? `<span class="detail-album-artist-link">${escapeHtml(_detailAuthorName)}</span>`
        : `<button class="detail-author-link detail-album-artist-link" data-author="${escapeHtml(_detailAuthorName)}" data-category="${escapeHtml(_detailAuthorCat)}">${escapeHtml(_detailAuthorName)}</button>`
      }<span class="detail-title-sep"> | </span>`
    : '';

  const _titleHtml = CREATOR_CARD_CATEGORY[item.category] && !isOwnAuthorPageView(item.title)
    ? `<button class="detail-author-link" data-author="${escapeHtml(item.title)}" data-category="${CREATOR_CARD_CATEGORY[item.category]}">${escapeHtml(item.title || '')}<svg class="detail-title-arrow" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m321-80-71-71 329-329-329-329 71-71 400 400L321-80Z"/></svg></button>`
    : isMusicAlbum
      ? `${_albumTitleArtistHtml}${escapeHtml(item.title || '')}`
      : escapeHtml(item.title || '');

  const _authorHtml = !_isCuratedMusician && _detailAuthorName && !isMusicAlbum
    ? `<span class="detail-title-sep"> | </span><button class="detail-author-link${item.category === 'Book' ? ' detail-book-author-link' : ''}" data-author="${escapeHtml(_detailAuthorName)}" data-category="${escapeHtml(_detailAuthorCat)}">${escapeHtml(_detailAuthorName)}${item.authorHasMore ? ' …' : ''}</button>`
    : '';

  // News items don't have item.author — they're attributed via item.folderId pointing at a
  // curated outlet folder instead, so the publication byline navigates straight to that folder's
  // view rather than through navigateToAuthor.
  const _publicationFolder = item.category === 'News' && item.folderId
    ? state.folders.find(f => f.id === item.folderId) : null;
  const _publicationHtml = _publicationFolder
    ? `<span class="detail-title-sep"> | </span><button class="detail-author-link detail-publication-link" data-folder-id="${escapeHtml(item.folderId)}">${escapeHtml(_publicationFolder.name)}</button>`
    : '';

  // Official website CTA — resolves the relevant musician (the item itself, or the album's artist).
  // Scoped strictly to Musician/Music Album so an unrelated item.author (e.g. a Book's author) never
  // gets matched against an existing Musician profile of the same name. Every other category falls
  // back to the item's own saved URL (same link the Web Links accordion's "View Source" uses).
  const _ctaAuthorName = item.category === 'Musician' ? item.title
    : item.category === 'Music Album' ? _detailAuthorName
    : null;
  let _ctaAuthor = _ctaAuthorName ? findAuthor(_ctaAuthorName, 'Musician') : null;
  const buildWebsiteCta = () => {
    if (_ctaAuthor?.websiteUrl) {
      return `<a class="btn-detail-website" id="detail-website-cta" href="${escapeHtml(_ctaAuthor.websiteUrl)}" target="_blank" rel="noopener">Website</a>`;
    }
    if (!isMusicianItem && !isMusicAlbum && item.url) {
      return `<a class="btn-detail-website" id="detail-website-cta" href="${escapeHtml(item.url)}" target="_blank" rel="noopener">Website</a>`;
    }
    return '';
  };

  const artistHeaderEl = document.getElementById('detail-artist-header');
  const _headerContentHtml = buildWebsiteCta();
  // Website CTA is pinned absolute, centered, in line with the edit/star icon row (same top offset).
  artistHeaderEl.classList.add('detail-artist-header--inline');
  if (_headerContentHtml) {
    artistHeaderEl.innerHTML = _headerContentHtml;
    artistHeaderEl.style.display = '';
  } else {
    artistHeaderEl.innerHTML = '';
    artistHeaderEl.style.display = 'none';
  }

  document.getElementById('detail-title').innerHTML = `<span class="detail-title-text">${_titleHtml}${_authorHtml}${_publicationHtml}</span>`;

  if (_ctaAuthorName && !_ctaAuthor?.websiteUrl) {
    ensureArtistWebsite(_ctaAuthorName).then(url => {
      if (!url || getDetailItem() !== item) return; // no result, or modal moved on to a different item
      let author = findAuthor(_ctaAuthorName, 'Musician');
      if (!author) {
        author = { id: Date.now().toString(), name: _ctaAuthorName, category: 'Musician', bio: null, imageUrl: null, websiteUrl: null, savedAt: Date.now() };
        state.authors.push(author);
      }
      author.websiteUrl = url;
      persistAuthor(author);
      _ctaAuthor = author;
      if (document.getElementById('detail-website-cta')) return; // already inserted
      artistHeaderEl.insertAdjacentHTML('beforeend', buildWebsiteCta());
      artistHeaderEl.style.display = ''; // reveal it if it started empty/hidden (Musician with no prior website)
    });
  }

  // Quick-add shortcut: tapping the header bookmark icon queues the item (via addToQueue() in
  // detailModalQueue.js) without opening the Add to Queue accordion — unlike tapping the
  // accordion row itself. When already queued (icon in its filled/selected state), tapping it
  // again deselects — mirrors the "Deselect Queue" tag inside the accordion, just reachable
  // straight from the corner, also without opening the panel.
  document.getElementById('detail-bookmark-btn').onclick = () => toggleQueueFromHeader(item);

  document.getElementById('detail-favorite-btn').onclick = e => {
    e.stopPropagation(); // otherwise the same click immediately re-triggers the menu's own outside-click close handler
    _toggleSaveToMenu(item);
  };

  // .detail-publication-link also carries .detail-author-link for styling, but navigates via
  // folderId instead of navigateToAuthor — excluded here, wired separately below.
  document.querySelectorAll('.detail-author-link:not(.detail-publication-link)').forEach(el => {
    el.addEventListener('click', () => {
      closeDetailModal();
      navigateToAuthor(el.dataset.author, el.dataset.category);
    });
  });

  document.querySelectorAll('.detail-publication-link').forEach(el => {
    el.addEventListener('click', () => {
      closeDetailModal();
      navigateToView(el.dataset.folderId);
    });
  });

  return { ctaAuthorName: _ctaAuthorName, ctaAuthor: _ctaAuthor };
}
