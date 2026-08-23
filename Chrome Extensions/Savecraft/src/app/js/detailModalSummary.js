// ===== DETAIL MODAL: SUMMARY / ALBUMS ACCORDION =====
// Covers Musician's known-albums list, Book/Show/Movie/Game's item summary, Music Album's hidden
// slot (it has its own Song List accordion instead, in detailModalNotes.js), and Visual Art's
// empty placeholder — one accordion row, four different bodies depending on category.

import { state, SUMMARY_PLACEHOLDER_CATEGORIES } from './state.js';
import { escapeHtml, isItunesArtworkUrl, applyArtistPhotoToItem, patchCardImage } from './utils.js';
import { persistItem, persistAuthor } from './storage.js';
import { ensureArtistWikipediaInfo, ensureItemWikipediaInfo } from './api.js';
import { findAuthor, getKnownAlbumsForArtist, navigateToAuthor } from './authors.js';
import { openDetailModal, closeDetailModal, getDetailItem } from './detailModal.js';
import { autoImportMusicianAlbums } from './addEditModal.js';
import { registerAccordion, closeAccordionsExcept } from './detailModalAccordions.js';
import { applyMusicianBioFallback } from './detailModalNotes.js';

export function setupSummary(item, { isMusicAlbum, isMusicianItem, ctaAuthorName, ctaAuthor }) {
  let _ctaAuthor = ctaAuthor; // local, reassignable copy — never written back to Header's own

  // Declared here (ahead of the Summary section below) so renderSummaryText() can write into
  // the Summary accordion for Book/Show/Movie/Game; actual content is built further down.
  const albumsAccordionHeaderEl = document.getElementById('detail-albums-accordion-header');
  const albumsListEl = document.getElementById('detail-albums-list');
  const albumsAccordionLabelEl = albumsAccordionHeaderEl.querySelector('span');
  albumsListEl.classList.remove('detail-albums-list--summary'); // re-added below only for Summary categories
  // Extra top gap needed only for the Book Summary header — the preceding My Notes section
  // (with the chapter list folded into it) sits flush against it otherwise when collapsed.
  albumsAccordionHeaderEl.classList.toggle('detail-accordion-header--book-summary', item.category === 'Book');
  registerAccordion('albums', albumsAccordionHeaderEl, albumsListEl);

  const summaryEl = document.getElementById('detail-summary');
  const summaryToggleEl = document.getElementById('detail-summary-toggle');

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

  // Musician's bio never displays here, per direct request — it belongs in the My Notes "Summary"
  // row instead (see the zeroFallback wiring in detailModalNotes.js). REAL BUG, found and fixed:
  // item.summary is actually populated for Musician now (kickOffTitleEnrichment, addEditModal.js,
  // fills it in at Add time even though the Add form's own Summary field stays hidden for
  // Musician), so this plain block was quietly showing the bio here too — excluding
  // isMusicianItem is what actually enforces the design intent described above.
  const summaryText = isMusicianItem ? '' : (item.summary || '');
  renderSummaryText(summaryText);

  // Appends a "Wikipedia" link into the Web Links accordion once a page is actually found —
  // fired from the async bio/photo lookups below (Web Links itself renders synchronously,
  // before either lookup resolves), so this patches the DOM in after the fact.
  function addWikipediaLink(wikiUrl) {
    if (!wikiUrl || getDetailItem() !== item) return;
    const linksWrap = document.getElementById('detail-streaming')?.querySelector('.streaming-links-wrap');
    if (!linksWrap || linksWrap.querySelector('.streaming-link-wikipedia')) return;
    linksWrap.insertAdjacentHTML('beforeend', `<a class="streaming-link-btn streaming-link-wikipedia" href="${escapeHtml(wikiUrl)}" target="_blank">Wikipedia</a>`);
  }

  const _needsBio = isMusicianItem && !summaryText;
  const _needsPhoto = isMusicianItem && (!item.imageUrl || isItunesArtworkUrl(item.imageUrl));
  // Always looked up (cached after the first time) rather than only when bio/photo are missing —
  // the Wikipedia link in Web Links should show up even for items that already have both.
  if (ctaAuthorName) {
    ensureArtistWikipediaInfo(ctaAuthorName).then(({ bio, photoUrl, wikiUrl }) => {
      if ((!bio && !photoUrl && !wikiUrl) || getDetailItem() !== item) return; // nothing found, or modal moved on
      addWikipediaLink(wikiUrl);
      let author = findAuthor(ctaAuthorName, 'Musician');
      if (!author) {
        author = { id: Date.now().toString(), name: ctaAuthorName, category: 'Musician', bio: null, imageUrl: null, websiteUrl: null, savedAt: Date.now() };
        state.authors.push(author);
      }
      let authorChanged = applyArtistPhotoToItem(author, photoUrl);
      if (bio && !author.bio) { author.bio = bio; authorChanged = true; }
      if (authorChanged) persistAuthor(author);
      _ctaAuthor = author;
      if (_needsBio && bio && !item.summary) applyMusicianBioFallback(item, bio);

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
  // title, not an author) — mirrors the Musician bio/photo lookup above. Always looked up
  // (cached after the first time), not just when summary/image are missing, so the Wikipedia
  // link in Web Links shows up even for items that already have both.
  // Excludes Movie's "Videos" folder — those are manually added trailers/clips, and their title
  // often happens to match an unrelated real movie's Wikipedia page (e.g. a fan video sharing a
  // real film's name), which would otherwise silently overwrite the item with that film's summary/
  // director/poster the first time it's viewed.
  const _needsItemWiki = SUMMARY_PLACEHOLDER_CATEGORIES.includes(item.category) && item.folderId !== 'default-movies-videos';
  if (_needsItemWiki && item.title) {
    ensureItemWikipediaInfo(item.title, item.category).then(({ bio, photoUrl, wikiUrl }) => {
      if ((!bio && !photoUrl && !wikiUrl) || getDetailItem() !== item) return; // nothing found, or modal moved on
      addWikipediaLink(wikiUrl);
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
            // isMusicianItem is always false for SUMMARY_PLACEHOLDER_CATEGORIES (Book/Show/Movie/
            // Game), so this always resolves to plain 'detail-image' — recomputed rather than
            // hardcoded to mirror the original's _imageClass exactly.
            const _imageClass = `detail-image${isMusicianItem ? ' detail-image--faces' : ''}`;
            cropEl.innerHTML = `<img class="${_imageClass}" src="${escapeHtml(item.imageUrl)}" alt="">`;
          }
        }
      }
      if (changed && state.items.some(i => i.id === item.id)) persistItem(item);
    });
  }

  if (isMusicianItem) {
    albumsAccordionLabelEl.textContent = 'Albums';
    albumsAccordionHeaderEl.classList.remove('open');
    albumsListEl.classList.remove('open');
    albumsAccordionHeaderEl.style.display = '';
    albumsListEl.style.display = '';
    albumsListEl.classList.add('detail-accordion-collapsible');

    // Pulled out into its own function (rather than inlined once, as this used to be) so the
    // "fetch, then fill in" button below (per direct request — "when the accordian opens up the
    // button 'fetch albums' is there and then it fills in with the few and the see all") can
    // re-render this same content in place once the fetch lands, without reopening the modal or
    // resetting the accordion's own open/closed state the way re-running all of setupSummary
    // would.
    const renderKnownAlbumsList = () => {
      const knownAlbums = getKnownAlbumsForArtist(item.title);
      if (knownAlbums.length) {
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
      } else {
        // No known albums yet — a "Fetch Albums" button in the same row slot instead of either an
        // empty accordion or a separate modal, per direct request. Reuses the same
        // autoImportMusicianAlbums() the bulk-import tooling uses (addEditModal.js) — auto-saves
        // whatever it finds directly, no selection step — rather than fetchAlbumsModal.js's picker
        // modal, since the request was specifically for this row to "fill in" in place.
        albumsListEl.innerHTML = `<button type="button" class="detail-album-row detail-album-row--fetch" id="detail-albums-fetch-btn">Fetch Albums</button>`;
        document.getElementById('detail-albums-fetch-btn')?.addEventListener('click', async e => {
          const btn = e.currentTarget;
          btn.disabled = true;
          btn.textContent = 'Fetching…';
          await autoImportMusicianAlbums({ title: item.title });
          if (getKnownAlbumsForArtist(item.title).length) {
            renderKnownAlbumsList();
          } else {
            btn.disabled = false;
            btn.textContent = 'No albums found — Retry';
          }
        });
      }
    };
    renderKnownAlbumsList();
  } else if (isMusicAlbum) {
    // Music Album has its own Song List accordion in this slot instead — see below.
    albumsAccordionHeaderEl.style.display = 'none';
    albumsListEl.style.display = 'none';
    albumsListEl.innerHTML = '';
    albumsListEl.classList.remove('detail-accordion-collapsible', 'open');
  } else if (SUMMARY_PLACEHOLDER_CATEGORIES.includes(item.category)) {
    // Book/Show/Movie/Game show the item's summary inside this accordion instead of the plain
    // text block above notes — content is populated/updated by renderSummaryText() above.
    albumsAccordionLabelEl.textContent = item.category === 'Book' ? 'Book Summary' : 'Summary';
    albumsAccordionHeaderEl.classList.remove('open');
    albumsListEl.classList.remove('open');
    albumsAccordionHeaderEl.style.display = '';
    albumsListEl.style.display = '';
    albumsListEl.classList.add('detail-accordion-collapsible', 'detail-albums-list--summary');
  } else {
    // Placeholder accordion for Visual Art — visible but intentionally empty for now.
    albumsAccordionLabelEl.textContent = 'Placeholder';
    albumsAccordionHeaderEl.classList.remove('open');
    albumsListEl.classList.remove('open');
    albumsAccordionHeaderEl.style.display = '';
    albumsListEl.style.display = '';
    albumsListEl.classList.add('detail-accordion-collapsible');
    albumsListEl.innerHTML = '';
  }

  // Same open/close behavior regardless of which branch above populated the accordion (Music
  // Album leaves it display:none, so this is inert but harmless there).
  albumsAccordionHeaderEl.onclick = () => {
    const nowOpen = albumsAccordionHeaderEl.classList.toggle('open');
    albumsListEl.classList.toggle('open', nowOpen);
    if (nowOpen) closeAccordionsExcept('albums');
  };
}
