// ===== ITEM DETAIL MODAL (the accordion-based modal shared by every category) =====

import { state, CATEGORY_PLATFORMS, SUMMARY_PLACEHOLDER_CATEGORIES, CURATED_ITEMS } from './state.js';
import {
  escapeHtml, catClass, isMusicAlbumsSectionView, isItunesArtworkUrl, applyArtistPhotoToItem,
  patchCardImage, debounce, formatTrackDuration,
} from './utils.js';
import { persistItem, removeItem, persistAuthor } from './storage.js';
import { ensureArtistWebsite, ensureArtistWikipediaInfo, ensureItemWikipediaInfo } from './api.js';
import { findAuthor, navigateToAuthor, getKnownAlbumsForArtist, autoSaveMusician, ensureAlbumTrackList } from './authors.js';
import { renderSidebar, renderGrid } from './render.js';

let _detailItem = null;

export function getDetailItem() {
  return _detailItem;
}

export function openDetailModal(item) {
  document.body.style.overflow = 'hidden'; // lock background scroll while the modal is open
  _detailItem = item;
  const domain = (() => { try { return new URL(item.url).hostname.replace('www.', ''); } catch { return item.url; } })();

  // Checked against the actual curated data instead of guessing at id-prefix conventions (which
  // turned out wrong for at least Books) — this works for every category with real Top 100
  // curated content, automatically, with no per-category id scheme to keep in sync.
  const isCuratedTop100 = item.curated && !!item.id && !!(CURATED_ITEMS['Top 100']?.[item.category] || []).some(i => i.id === item.id);

  const wrap = document.getElementById('detail-image-wrap');
  const isMusicAlbum = item.category === 'Music Album';
  const isMusicianItem = item.category === 'Musician';
  const _imageClass = `detail-image${isMusicianItem ? ' detail-image--faces' : ''}`;
  document.getElementById('detail-body').classList.toggle('detail-body--tight-bottom', isMusicianItem);
  document.getElementById('detail-bookmark-btn').style.display = 'none';
  document.getElementById('detail-favorite-btn').style.display = '';

  const PLAY_ICON_SVG = `<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
  const _promoToggleHtml = isMusicAlbum
    ? `<button class="btn-promo-toggle" id="btn-fullart-toggle" title="View full album art"><span>Album Art</span>${PLAY_ICON_SVG}</button>`
    : '';
  // Same slot the promo-video/album-art toggle uses — stacked above it when both are present
  // (a curated Top 100 Musician/Music Album item), otherwise it has that corner to itself.
  let _sponsoredTagHtml = '';
  if (isCuratedTop100) {
    const CATEGORY_WHY_TEXT = {
      Musician: 'Music shapes culture, identity, and resistance — the same forces that drive civic change.',
      'Music Album': 'Music shapes culture, identity, and resistance — the same forces that drive civic change.',
      Show: 'The stories we follow on screen shape our empathy, our politics, and how we see each other.',
      Game: 'Games build communities, test strategy, and spark collaboration — skills at the core of civic life.',
      Book: 'Great books expand our understanding of the world and each other — the foundation of an engaged citizenry.',
    };
    const whyText = CATEGORY_WHY_TEXT[item.category]
      || 'What we watch shapes how we see power and justice — the same questions at the heart of civic life.';
    _sponsoredTagHtml = `
      <a class="vc-sponsored-tag vc-sponsored-tag--overlay${_promoToggleHtml ? ' vc-sponsored-tag--stacked' : ''}" href="${chrome.runtime.getURL('src/sponsored/sponsored.html')}" target="_blank">
        ⚡ Your Sponsored Statement
        <span class="vc-sponsored-tooltip">
          <span class="vc-why-title">WHY VOTECRAFT RECOMMENDS</span>
          <span class="vc-why-tooltip-text">${whyText}</span>
        </span>
      </a>`;
  }

  if (item.imageUrl) {
    wrap.innerHTML = `<div class="detail-image-crop"><img class="${_imageClass}" src="${escapeHtml(item.imageUrl)}" alt=""></div>${_promoToggleHtml}${_sponsoredTagHtml}`;
    wrap.style.display = '';
    if (isMusicAlbum) {
      wrap.querySelector('.detail-image').addEventListener('click', () => openImageLightbox(item.imageUrl));
    }
  } else {
    const letter = (item.title || domain || '?')[0].toUpperCase();
    wrap.innerHTML = `<div class="detail-image-crop"><div class="detail-placeholder placeholder-${catClass(item.category || 'Music-Album')}">${letter}</div></div>${_promoToggleHtml}${_sponsoredTagHtml}`;
    wrap.style.display = '';
  }

  if (isMusicAlbum) {
    document.getElementById('btn-fullart-toggle').onclick = () => {
      if (item.imageUrl) openImageLightbox(item.imageUrl);
    };
  }

  const BOOKMARK_OUTLINE = `<svg xmlns="http://www.w3.org/2000/svg" height="22px" viewBox="0 -960 960 960" width="22px" fill="currentColor"><path d="M200-120v-640q0-33 23.5-56.5T280-840h400q33 0 56.5 23.5T760-760v640L480-240 200-120Zm80-122 200-86 200 86v-518H280v518Zm0-518h400-400Z"/></svg>`;
  const BOOKMARK_FILLED = `<svg xmlns="http://www.w3.org/2000/svg" height="22px" viewBox="0 -960 960 960" width="22px" fill="currentColor"><path d="M200-120v-640q0-33 23.5-56.5T280-840h400q33 0 56.5 23.5T760-760v640L480-240 200-120Z"/></svg>`;
  const FAVORITE_STAR = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m354-287 126-76 126 77-33-144 111-96-146-13-58-136-58 135-146 13 111 97-33 143ZM233-120l65-281L80-590l288-25 112-265 112 265 288 25-218 189 65 281-247-149-247 149Zm247-350Z"/></svg>`;
  function updateDetailActions() {
    const isSaved = !!state.items.find(i => i.id === item.id);
    document.getElementById('detail-edit').style.display = (!item.curated || isSaved) ? '' : 'none';
  }
  function updateFavoriteIcon() {
    const favBtn = document.getElementById('detail-favorite-btn');
    if (!favBtn) return;
    const liveItem = state.items.find(i => i.id === item.id);
    const favorited = !!liveItem?.favorite;
    favBtn.innerHTML = FAVORITE_STAR;
    favBtn.classList.toggle('detail-favorite-btn--active', favorited);
  }
  function updateBookmarkIcon() {
    const saved = !!state.items.find(i => i.id === item.id);
    const btn = document.getElementById('detail-bookmark-btn');
    if (btn) {
      btn.innerHTML = saved ? BOOKMARK_FILLED : BOOKMARK_OUTLINE;
      btn.classList.toggle('detail-bookmark-btn--saved', saved);
    }
    const queueBookmarkEl = document.getElementById('standalone-queue-bookmark');
    if (queueBookmarkEl) {
      queueBookmarkEl.innerHTML = saved ? BOOKMARK_FILLED : BOOKMARK_OUTLINE;
      queueBookmarkEl.classList.toggle('detail-bookmark-btn--saved', saved);
    }
    updateDetailActions();
  }
  updateBookmarkIcon();
  updateFavoriteIcon();
  const _detailAuthorName = item.author
    || (item.curated && item.category === 'Music Album' ? item.notes : null);
  const _detailAuthorCat = item.author ? item.category : 'Musician';
  const _isCuratedMusician = item.curated && item.category === 'Musician';

  // The website CTA overlays the top of the image for every category now (the header container
  // holds only that button).
  const _showArtistHeaderAbove = true;

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

  const _titleHtml = item.category === 'Musician'
    ? `<button class="detail-author-link" data-author="${escapeHtml(item.title)}" data-category="Musician">${escapeHtml(item.title || '')}<svg class="detail-title-arrow" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m321-80-71-71 329-329-329-329 71-71 400 400L321-80Z"/></svg></button>`
    : isMusicAlbum
      ? `${_albumTitleArtistHtml}${escapeHtml(item.title || '')}`
      : escapeHtml(item.title || '');

  const _authorHtml = !_isCuratedMusician && _detailAuthorName && !isMusicAlbum
    ? `<span class="detail-title-sep"> | </span><button class="detail-author-link" data-author="${escapeHtml(_detailAuthorName)}" data-category="${escapeHtml(_detailAuthorCat)}">${escapeHtml(_detailAuthorName)}</button>`
    : '';

  // Year alone now (artist moved into the main title line above). Genre is intentionally kept
  // on item.genre (still fetched/stored/backfilled) but not rendered anywhere in this modal per
  // current design.
  const _albumArtistYearHtml = isMusicAlbum && item.year
    ? `<div class="detail-album-artist-year">${escapeHtml(item.year)}</div>`
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
      return `<a class="btn-detail-website" id="detail-website-cta" href="${escapeHtml(_ctaAuthor.websiteUrl)}" target="_blank" rel="noopener">Official Website</a>`;
    }
    if (!isMusicianItem && !isMusicAlbum && item.url) {
      return `<a class="btn-detail-website" id="detail-website-cta" href="${escapeHtml(item.url)}" target="_blank" rel="noopener">Official Website</a>`;
    }
    return '';
  };

  const artistHeaderEl = document.getElementById('detail-artist-header');
  const _headerContentHtml = buildWebsiteCta();
  // Both Musician and Music Album pin the website CTA inline over the top of the image now.
  artistHeaderEl.classList.add('detail-artist-header--inline');
  if (_showArtistHeaderAbove && _headerContentHtml) {
    artistHeaderEl.innerHTML = _headerContentHtml;
    artistHeaderEl.style.display = '';
  } else {
    artistHeaderEl.innerHTML = '';
    artistHeaderEl.style.display = 'none';
  }

  document.getElementById('detail-title').innerHTML = `<span class="detail-title-text">${_titleHtml}${_authorHtml}</span>${_albumArtistYearHtml}`;

  if (_ctaAuthorName && !_ctaAuthor?.websiteUrl) {
    ensureArtistWebsite(_ctaAuthorName).then(url => {
      if (!url || _detailItem !== item) return; // no result, or modal moved on to a different item
      let author = findAuthor(_ctaAuthorName, 'Musician');
      if (!author) {
        author = { id: Date.now().toString(), name: _ctaAuthorName, category: 'Musician', bio: null, imageUrl: null, websiteUrl: null, savedAt: Date.now() };
        state.authors.push(author);
      }
      author.websiteUrl = url;
      persistAuthor(author);
      _ctaAuthor = author;
      if (document.getElementById('detail-website-cta')) return; // already inserted
      const headerEl = document.getElementById('detail-artist-header');
      headerEl.insertAdjacentHTML('beforeend', buildWebsiteCta());
      headerEl.style.display = ''; // reveal it if it started empty/hidden (Musician with no prior website)
    });
  }

  async function toggleBookmark() {
    const liveItem = state.items.find(i => i.id === item.id);
    if (!liveItem) {
      await ensureLiveItem();
    } else {
      const idx = state.items.indexOf(liveItem);
      state.items.splice(idx, 1);
      await removeItem(liveItem.id);
    }
    updateBookmarkIcon();
  }
  document.getElementById('detail-bookmark-btn').onclick = toggleBookmark;
  const standaloneQueueBookmarkEl = document.getElementById('standalone-queue-bookmark');
  standaloneQueueBookmarkEl.onclick = (e) => {
    e.stopPropagation();
    toggleBookmark();
  };

  document.getElementById('detail-favorite-btn').onclick = async () => {
    const liveItem = await ensureLiveItem();
    liveItem.favorite = !liveItem.favorite;
    await persistItem(liveItem);
    updateBookmarkIcon();
    updateFavoriteIcon();
    renderSidebar();
    renderGrid();
  };

  const metaEl = document.getElementById('detail-meta');
  metaEl.innerHTML = '';
  metaEl.style.display = 'none';

  // Declared here (ahead of the Summary section below) so renderSummaryText() can write into
  // the Summary accordion for Book/Show/Movie/Game; actual content is built further down.
  const albumsAccordionHeaderEl = document.getElementById('detail-albums-accordion-header');
  const albumsListEl = document.getElementById('detail-albums-list');
  const albumsAccordionLabelEl = albumsAccordionHeaderEl.querySelector('span');
  albumsListEl.classList.remove('detail-albums-list--summary'); // re-added below only for Summary categories

  const summaryEl = document.getElementById('detail-summary');
  const summaryLabelEl = document.getElementById('detail-summary-label');
  const summaryToggleEl = document.getElementById('detail-summary-toggle');
  summaryLabelEl.style.display = 'none';

  function renderSummaryText(text) {
    if (SUMMARY_PLACEHOLDER_CATEGORIES.includes(item.category)) {
      // These categories show summary text inside the Summary accordion instead of the plain
      // block above notes (the accordion itself is built further down in this function).
      albumsListEl.innerHTML = text ? `<div class="detail-accordion-summary-text">${escapeHtml(text)}</div>` : '';
      summaryEl.style.display = 'none';
      summaryToggleEl.style.display = 'none';
      return;
    }
    summaryEl.textContent = text;
    summaryEl.style.display = text ? '' : 'none';
    summaryEl.classList.remove('detail-summary-text--expanded');
    summaryToggleEl.classList.remove('detail-summary-toggle--open');
    summaryToggleEl.style.display = 'none';
    if (text) {
      requestAnimationFrame(() => {
        if (summaryEl.scrollHeight > summaryEl.clientHeight + 1) {
          summaryToggleEl.style.display = '';
        }
      });
    }
  }

  summaryToggleEl.onclick = () => {
    const expanded = summaryEl.classList.toggle('detail-summary-text--expanded');
    summaryToggleEl.classList.toggle('detail-summary-toggle--open', expanded);
  };

  const summaryText = item.summary || (isMusicianItem ? _ctaAuthor?.bio : null) || '';
  renderSummaryText(summaryText);

  const _needsBio = isMusicianItem && !summaryText;
  const _needsPhoto = isMusicianItem && (!item.imageUrl || isItunesArtworkUrl(item.imageUrl));
  if ((_needsBio || _needsPhoto) && _ctaAuthorName) {
    ensureArtistWikipediaInfo(_ctaAuthorName).then(({ bio, photoUrl }) => {
      if ((!bio && !photoUrl) || _detailItem !== item) return; // nothing found, or modal moved on
      let author = findAuthor(_ctaAuthorName, 'Musician');
      if (!author) {
        author = { id: Date.now().toString(), name: _ctaAuthorName, category: 'Musician', bio: null, imageUrl: null, websiteUrl: null, savedAt: Date.now() };
        state.authors.push(author);
      }
      let authorChanged = applyArtistPhotoToItem(author, photoUrl);
      if (bio && !author.bio) { author.bio = bio; authorChanged = true; }
      if (authorChanged) persistAuthor(author);
      _ctaAuthor = author;
      if (_needsBio && bio && !item.summary) renderSummaryText(bio);

      if (_needsPhoto && applyArtistPhotoToItem(item, photoUrl)) {
        if (state.items.some(i => i.id === item.id)) persistItem(item);
        patchCardImage(item.id, item.imageUrl);
        const wrap = document.getElementById('detail-image-wrap');
        const cropEl = wrap.querySelector('.detail-image-crop');
        if (cropEl) {
          const imgEl = cropEl.querySelector('.detail-image');
          if (imgEl) {
            imgEl.src = item.imageUrl;
          } else {
            cropEl.innerHTML = `<img class="detail-image detail-image--faces" src="${escapeHtml(item.imageUrl)}" alt="">`;
          }
        }
      }
    });
  }

  // Book/Show/Movie/Game fallback: fetch a Wikipedia summary/photo (keyed by the item's own
  // title, not an author) when either is missing — mirrors the Musician bio/photo lookup above.
  const _needsItemWiki = SUMMARY_PLACEHOLDER_CATEGORIES.includes(item.category) && (!item.summary || !item.imageUrl);
  if (_needsItemWiki && item.title) {
    ensureItemWikipediaInfo(item.title, item.category).then(({ bio, photoUrl }) => {
      if ((!bio && !photoUrl) || _detailItem !== item) return; // nothing found, or modal moved on
      let changed = false;
      if (bio && !item.summary) {
        item.summary = bio;
        renderSummaryText(bio);
        changed = true;
      }
      if (photoUrl && !item.imageUrl) {
        item.imageUrl = photoUrl;
        changed = true;
        patchCardImage(item.id, item.imageUrl);
        const wrap = document.getElementById('detail-image-wrap');
        const cropEl = wrap.querySelector('.detail-image-crop');
        if (cropEl) {
          const imgEl = cropEl.querySelector('.detail-image');
          if (imgEl) {
            imgEl.src = item.imageUrl;
          } else {
            cropEl.innerHTML = `<img class="${_imageClass}" src="${escapeHtml(item.imageUrl)}" alt="">`;
          }
        }
      }
      if (changed && state.items.some(i => i.id === item.id)) persistItem(item);
    });
  }

  const notesEl = document.getElementById('detail-notes');
  const notesInputEl = document.getElementById('detail-notes-input');
  const notesLabelEl = document.getElementById('detail-notes-label');
  const notesAccordionHeaderEl = document.getElementById('detail-notes-accordion-header');
  // Curated (not-yet-saved) Music Album items stash the artist name in item.notes (see
  // _detailAuthorName above) — that's never real user notes, so exclude it here or the
  // editable textarea below would pre-fill with the artist name instead of being empty.
  const _curatedAlbumNotesIsArtistName = item.curated && isMusicAlbum;
  const text = (_curatedAlbumNotesIsArtistName ? null : item.notes) || item.description || '';
  const linerPanelEl = document.getElementById('liner-notes-panel');
  linerPanelEl.innerHTML = '';
  linerPanelEl.style.display = 'none';
  // My Notes is shown as its own accordion row for every category now, even with no notes yet
  // — it's a directly-editable textarea instead of read-only text, auto-saving (debounced) as
  // the user types. Genre (item.genre, Music Album only) is intentionally kept on the item but
  // not rendered anywhere in this modal.
  notesLabelEl.style.display = 'none'; // replaced by the accordion header below
  notesEl.style.display = 'none';
  notesEl.classList.remove('detail-accordion-collapsible', 'open');

  notesInputEl.value = text;
  notesInputEl.style.display = '';
  notesInputEl.classList.add('detail-accordion-collapsible');
  notesInputEl.classList.remove('open');
  notesAccordionHeaderEl.classList.remove('open');
  notesAccordionHeaderEl.style.display = '';
  notesAccordionHeaderEl.onclick = () => {
    const nowOpen = notesAccordionHeaderEl.classList.toggle('open');
    notesInputEl.classList.toggle('open', nowOpen);
    if (nowOpen) {
      albumsAccordionHeaderEl.classList.remove('open');
      albumsListEl.classList.remove('open');
      tracklistAccordionHeaderEl.classList.remove('open');
      tracklistEl.classList.remove('open');
      streamingEl.classList.remove('open');
      notesInputEl.focus();
    }
  };

  const saveNotes = debounce(async () => {
    const newNotes = notesInputEl.value.trim() || null;
    let liveItem = state.items.find(i => i.id === item.id);
    if (!liveItem) liveItem = await ensureLiveItem();
    if (liveItem.notes === newNotes) return;
    liveItem.notes = newNotes;
    item.notes = newNotes;
    await persistItem(liveItem);
  }, 600);
  notesInputEl.oninput = saveNotes;

  if (isMusicianItem) {
    albumsAccordionLabelEl.textContent = 'Albums';
    const knownAlbums = getKnownAlbumsForArtist(item.title);
    albumsAccordionHeaderEl.classList.remove('open');
    albumsListEl.classList.remove('open');
    if (knownAlbums.length) {
      albumsAccordionHeaderEl.style.display = '';
      albumsListEl.style.display = '';
      albumsListEl.classList.add('detail-accordion-collapsible');
      albumsListEl.innerHTML = `<button class="detail-album-row detail-album-row--see-all" id="detail-albums-see-all">See all →</button>`
        + knownAlbums.slice(0, 5).map(a => `
        <button class="detail-album-row" data-album-id="${escapeHtml(a.id)}">
          ${a.imageUrl ? `<img class="detail-album-row-thumb" src="${escapeHtml(a.imageUrl)}" alt="" loading="lazy" decoding="async">` : `<span class="detail-album-row-thumb"></span>`}
          <span class="detail-album-row-title">${escapeHtml(a.title || '')}</span>
        </button>`).join('');
      albumsListEl.querySelectorAll('.detail-album-row[data-album-id]').forEach(row => {
        row.addEventListener('click', () => {
          const album = knownAlbums.find(a => a.id === row.dataset.albumId);
          if (album) openDetailModal(album);
        });
      });
      document.getElementById('detail-albums-see-all')?.addEventListener('click', () => {
        closeDetailModal();
        navigateToAuthor(item.title, 'Musician');
      });
      albumsAccordionHeaderEl.onclick = () => {
        const nowOpen = albumsAccordionHeaderEl.classList.toggle('open');
        albumsListEl.classList.toggle('open', nowOpen);
        if (nowOpen) {
          notesAccordionHeaderEl.classList.remove('open');
          notesEl.classList.remove('open');
          tracklistAccordionHeaderEl.classList.remove('open');
          tracklistEl.classList.remove('open');
          streamingEl.classList.remove('open');
        }
      };
    } else {
      albumsAccordionHeaderEl.style.display = 'none';
      albumsListEl.style.display = 'none';
      albumsListEl.innerHTML = '';
    }
  } else if (isMusicAlbum) {
    // Music Album has its own Song List accordion in this slot instead — see below.
    albumsAccordionHeaderEl.style.display = 'none';
    albumsListEl.style.display = 'none';
    albumsListEl.innerHTML = '';
    albumsListEl.classList.remove('detail-accordion-collapsible', 'open');
  } else if (SUMMARY_PLACEHOLDER_CATEGORIES.includes(item.category)) {
    // Book/Show/Movie/Game show the item's summary inside this accordion instead of the plain
    // text block above notes — content is populated/updated by renderSummaryText() above.
    albumsAccordionLabelEl.textContent = 'Summary';
    albumsAccordionHeaderEl.classList.remove('open');
    albumsListEl.classList.remove('open');
    albumsAccordionHeaderEl.style.display = '';
    albumsListEl.style.display = '';
    albumsListEl.classList.add('detail-accordion-collapsible', 'detail-albums-list--summary');
    albumsAccordionHeaderEl.onclick = () => {
      const nowOpen = albumsAccordionHeaderEl.classList.toggle('open');
      albumsListEl.classList.toggle('open', nowOpen);
      if (nowOpen) {
        notesAccordionHeaderEl.classList.remove('open');
        notesEl.classList.remove('open');
        tracklistAccordionHeaderEl.classList.remove('open');
        tracklistEl.classList.remove('open');
        streamingEl.classList.remove('open');
      }
    };
  } else {
    // Placeholder accordion for Visual Art — visible but intentionally empty for now.
    albumsAccordionLabelEl.textContent = 'Placeholder';
    albumsAccordionHeaderEl.classList.remove('open');
    albumsListEl.classList.remove('open');
    albumsAccordionHeaderEl.style.display = '';
    albumsListEl.style.display = '';
    albumsListEl.classList.add('detail-accordion-collapsible');
    albumsListEl.innerHTML = '';
    albumsAccordionHeaderEl.onclick = () => {
      const nowOpen = albumsAccordionHeaderEl.classList.toggle('open');
      albumsListEl.classList.toggle('open', nowOpen);
      if (nowOpen) {
        notesAccordionHeaderEl.classList.remove('open');
        notesEl.classList.remove('open');
        tracklistAccordionHeaderEl.classList.remove('open');
        tracklistEl.classList.remove('open');
        streamingEl.classList.remove('open');
      }
    };
  }

  const tracklistAccordionHeaderEl = document.getElementById('detail-tracklist-accordion-header');
  const tracklistEl = document.getElementById('detail-tracklist');
  tracklistAccordionHeaderEl.classList.remove('open');
  tracklistEl.classList.remove('open');
  if (isMusicAlbum) {
    tracklistAccordionHeaderEl.style.display = '';
    tracklistEl.style.display = '';
    tracklistEl.classList.add('detail-accordion-collapsible');
    tracklistEl.innerHTML = '';
    let _tracklistLoaded = false;
    tracklistAccordionHeaderEl.onclick = async () => {
      const nowOpen = tracklistAccordionHeaderEl.classList.toggle('open');
      tracklistEl.classList.toggle('open', nowOpen);
      if (!nowOpen) return;
      notesAccordionHeaderEl.classList.remove('open');
      notesInputEl.classList.remove('open');
      streamingEl.classList.remove('open');
      if (_tracklistLoaded) return;
      _tracklistLoaded = true;
      tracklistEl.innerHTML = `<div class="detail-tracklist-row detail-tracklist-row--status">Loading…</div>`;
      const tracks = await ensureAlbumTrackList(item);
      if (_detailItem !== item) return; // modal moved on to a different item while awaiting
      if (!tracklistAccordionHeaderEl.classList.contains('open')) return; // user closed it already
      if (!tracks || tracks.length === 0) {
        tracklistEl.innerHTML = `<div class="detail-tracklist-row detail-tracklist-row--status">Track list unavailable</div>`;
      } else {
        tracklistEl.innerHTML = tracks.map(t => `
          <div class="detail-tracklist-row">
            <span class="detail-tracklist-number">${t.number || ''}</span>
            <span class="detail-tracklist-title">${escapeHtml(t.title || '')}</span>
            <span class="detail-tracklist-duration">${formatTrackDuration(t.durationMs)}</span>
          </div>`).join('');
      }
    };
  } else {
    tracklistAccordionHeaderEl.style.display = 'none';
    tracklistEl.style.display = 'none';
    tracklistEl.innerHTML = '';
    tracklistEl.classList.remove('detail-accordion-collapsible', 'open');
  }

  const streamingEl = document.getElementById('detail-streaming');
  // Web Links now always sits flush in the accordion stack (My Notes/Albums or Placeholder/
  // Song List), rather than pushed to the bottom via margin-top:auto like the old combined row.
  streamingEl.classList.add('detail-streaming--tight');
  const queueEl = document.getElementById('detail-queue');
  queueEl.classList.add('detail-queue--tight');
  const catConfig = CATEGORY_PLATFORMS[item.category];
  const query = item.title || domain;
  const websiteLinkLabel = isMusicAlbum ? 'View on Apple Music' : (domain || 'View Source');
  const websiteBtn = item.url
    ? `<a class="streaming-link-btn streaming-link-website" href="${escapeHtml(item.url)}" target="_blank">${escapeHtml(websiteLinkLabel)}</a>`
    : '';
  // The item's own saved YouTube URL (set via the "YouTube URL" field in the Add/Edit modal) —
  // a real link to that specific video, not a generic YouTube search like the other platforms.
  const youtubeBtn = item.youtubeUrl
    ? `<a class="streaming-link-btn" href="${escapeHtml(item.youtubeUrl)}" target="_blank">YouTube</a>`
    : '';

  const headerLabel = catConfig ? escapeHtml(catConfig.label) : 'Web Links';

  function getListIds(liveItem) {
    if (!liveItem) return [];
    if (Array.isArray(liveItem.listIds)) return liveItem.listIds;
    if (liveItem.listId) return [liveItem.listId];
    return [];
  }

  function updateQueueLabel() {
    const liveItem = state.items.find(i => i.id === item.id);
    const isQueued = !!liveItem?.queueStatus;
    const labelEl = streamingEl.querySelector('.queue-label') || document.getElementById('btn-standalone-queue');
    const textEl = streamingEl.querySelector('.queue-label-text') || document.getElementById('standalone-queue-text');
    if (textEl) textEl.textContent = 'Add to Queue';
    if (labelEl) labelEl.classList.toggle('queue-label--active', isQueued);
  }

  // Every category now presents Web Links as its own accordion row (icon + label + chevron,
  // matching My Notes/Albums/Song List) with "Add to Queue" pulled out as a standalone button
  // below the accordion stack, instead of the old combined header row.
  const WEB_LINKS_ICON_SVG = `<svg class="detail-accordion-icon" xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="currentColor"><path d="M440-280H280q-83 0-141.5-58.5T80-480q0-83 58.5-141.5T280-680h160v80H280q-50 0-85 35t-35 85q0 50 35 85t85 35h160v80ZM320-440v-80h320v80H320Zm200 160v-80h160q50 0 85-35t35-85q0-50-35-85t-85-35H520v-80h160q83 0 141.5 58.5T880-480q0 83-58.5 141.5T680-280H520Z"/></svg>`;
  const buildStreamingHeader = () =>
    `<div class="detail-accordion-header how-to-read-label">${WEB_LINKS_ICON_SVG}<span>${headerLabel}</span><svg class="detail-accordion-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></div>`;

  const btnStandaloneQueueEl = document.getElementById('btn-standalone-queue');
  btnStandaloneQueueEl.style.display = '';

  const buildStreaming = (linksHtml) => buildStreamingHeader() + `<div class="streaming-links-wrap">${linksHtml}</div>`;

  if (catConfig && catConfig.platforms) {
    const savedPlatforms = item.platforms;
    const platformsToShow = (savedPlatforms && savedPlatforms.length > 0)
      ? catConfig.platforms.filter(p => savedPlatforms.includes(p.id))
      : catConfig.platforms;
    streamingEl.innerHTML = buildStreaming(websiteBtn + youtubeBtn + platformsToShow.map(p => `<a class="streaming-link-btn" href="${p.searchUrl(query)}" target="_blank">${p.name}</a>`).join(''));
  } else {
    streamingEl.innerHTML = buildStreaming(websiteBtn + youtubeBtn);
  }
  streamingEl.style.display = '';
  streamingEl.querySelector('.how-to-read-label')?.addEventListener('click', () => {
    const nowOpen = streamingEl.classList.toggle('open');
    if (nowOpen) {
      notesAccordionHeaderEl.classList.remove('open');
      notesEl.classList.remove('open');
      albumsAccordionHeaderEl.classList.remove('open');
      albumsListEl.classList.remove('open');
      tracklistAccordionHeaderEl.classList.remove('open');
      tracklistEl.classList.remove('open');
    }
  });
  async function ensureLiveItem() {
    let liveItem = state.items.find(i => i.id === item.id);
    if (!liveItem) {
      liveItem = { ...item, curated: false, savedAt: Date.now() };
      if (liveItem.category === 'Music Album' && !liveItem.author && liveItem.notes) {
        // Curated Music Album items stash the artist name in .notes (see _detailAuthorName
        // above) — once this becomes a real personal item, item.curated flips to false, so that
        // fallback no longer applies. Promote the name into .author now (and clear .notes) or
        // the artist link/website CTA silently vanish on every future open of this item, and the
        // artist name would otherwise show up in My Notes as if it were a real saved note.
        liveItem.author = liveItem.notes;
        liveItem.notes = null;
      }
      state.items.push(liveItem);
      await persistItem(liveItem);
      if (liveItem.category === 'Music Album') {
        await autoSaveMusician(liveItem.author);
      }
    }
    return liveItem;
  }

  (streamingEl.querySelector('.queue-label') || btnStandaloneQueueEl).onclick = async () => {
    const liveItem = state.items.find(i => i.id === item.id);
    if (!liveItem?.queueStatus) {
      const live = await ensureLiveItem();
      live.queueStatus = 'in-queue';
      await persistItem(live);
      updateBookmarkIcon();
      updateQueueLabel();
      queueEl.innerHTML = buildQueueSection();
      wireQueueSection();
      queueEl.classList.add('open');
    } else {
      queueEl.classList.toggle('open');
    }
  };

  function buildQueueSection() {
    const liveItem = state.items.find(i => i.id === item.id);
    const listIds = getListIds(liveItem);
    const isQueued = !!liveItem?.queueStatus;
    const baseTag = `<button class="queue-tag queue-tag-base${isQueued ? ' active' : ''}" id="btn-queue-base">${isQueued ? 'Deselect Queue' : 'Select Queue'}</button>`;
    const makeTag = l => `<button class="queue-tag${listIds.includes(l.id) ? ' active' : ''}" data-list-id="${l.id}">${l.name}</button>`;
    const addBtn = `<button class="queue-tag queue-tag-add" id="btn-queue-add-list">+ Add list</button>`;
    const lists = state.kanbanLists;
    const listTags = lists.map(makeTag).join('');
    return `<div class="streaming-links-wrap">
      ${baseTag}${listTags}${addBtn}
    </div>`;
  }

  function wireQueueSection() {
    updateQueueLabel();

    document.getElementById('btn-queue-base')?.addEventListener('click', async () => {
      const liveItem = state.items.find(i => i.id === item.id);
      if (!liveItem) return;
      if (liveItem.queueStatus) {
        liveItem.queueStatus = null;
        liveItem.listIds = [];
        liveItem.listId = null;
        await persistItem(liveItem);
        updateQueueLabel();
        queueEl.innerHTML = buildQueueSection();
        wireQueueSection();
        queueEl.classList.remove('open');
      }
    });

    // List tags — toggle membership
    queueEl.querySelectorAll('.queue-tag:not(.queue-tag-add):not(.queue-tag-base)').forEach(tag => {
      tag.addEventListener('click', async () => {
        const liveItem = await ensureLiveItem();
        if (!liveItem) return;
        const listIds = getListIds(liveItem);
        const id = tag.dataset.listId;
        const idx = listIds.indexOf(id);
        if (idx === -1) listIds.push(id); else listIds.splice(idx, 1);
        liveItem.listIds = listIds;
        liveItem.listId = null;
        if (!liveItem.queueStatus) liveItem.queueStatus = 'in-queue';
        await persistItem(liveItem);
        queueEl.innerHTML = buildQueueSection();
        wireQueueSection();
      });
    });

    document.getElementById('btn-queue-add-list')?.addEventListener('click', () => {
      const linksWrap = queueEl.querySelector('.streaming-links-wrap');
      linksWrap.innerHTML = `
        <div class="queue-new-wrap">
          <input class="queue-new-input" id="queue-new-input" placeholder="List name…" maxlength="40">
          <button class="queue-new-confirm" id="queue-new-confirm">Create</button>
          <button class="queue-new-cancel" id="queue-new-cancel">✕</button>
        </div>`;
      const input = document.getElementById('queue-new-input');
      input?.focus();
      const cancelQueue = () => { queueEl.innerHTML = buildQueueSection(); wireQueueSection(); };
      const createAndAssign = async () => {
        const name = input?.value.trim();
        if (!name) { cancelQueue(); return; }
        const newId = 'list-' + Date.now();
        state.kanbanLists.push({ id: newId, name });
        chrome.storage.sync.set({ savecraft_kanban_lists: state.kanbanLists });
        if (!item.curated) {
          const liveItem = state.items.find(i => i.id === item.id);
          if (liveItem) {
            const listIds = getListIds(liveItem);
            listIds.push(newId);
            liveItem.listIds = listIds;
            liveItem.listId = null;
            liveItem.queueStatus = 'in-queue';
            await persistItem(liveItem);
          }
        }
        queueEl.innerHTML = buildQueueSection();
        wireQueueSection();
      };
      document.getElementById('queue-new-confirm')?.addEventListener('click', createAndAssign);
      document.getElementById('queue-new-cancel')?.addEventListener('click', cancelQueue);
      input?.addEventListener('keydown', ev => { if (ev.key === 'Enter') createAndAssign(); if (ev.key === 'Escape') cancelQueue(); });
    });
  }

  queueEl.innerHTML = buildQueueSection();
  queueEl.classList.remove('open');
  wireQueueSection();
  updateQueueLabel();

  document.getElementById('detail-modal-overlay').classList.add('open');

  document.querySelectorAll('.detail-author-link').forEach(el => {
    el.addEventListener('click', () => {
      closeDetailModal();
      navigateToAuthor(el.dataset.author, el.dataset.category);
    });
  });
}

export function closeDetailModal() {
  document.getElementById('detail-modal-overlay').classList.remove('open');
  document.body.style.overflow = ''; // restore background scroll
}

export function openImageLightbox(imageUrl) {
  document.getElementById('image-lightbox-img').src = imageUrl;
  document.getElementById('image-lightbox-overlay').classList.add('open');
}

export function closeImageLightbox() {
  document.getElementById('image-lightbox-overlay').classList.remove('open');
}
