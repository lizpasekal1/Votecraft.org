// ===== ADD / EDIT ITEM MODAL =====
// Add is a three-screen wizard: Screen A picks a category, Screen B searches a category-
// appropriate free API for a match, Screen C (also used standalone for Edit) reviews/refines
// the result before saving. A single back icon (top-left of the modal) steps back one screen at
// a time. Search results are normalized to one shared shape so Screen C's pre-fill logic and the
// results-dropdown renderer don't need to special-case each source.

import { state, CATEGORIES, CAT_LABEL, CAT_EMOJI, CATEGORY_PLATFORMS, MODAL_BOOKMARK_ICON_SVG } from './state.js';
import { escapeHtml, isItunesArtworkUrl } from './utils.js';
import { persistItem, persistCuratedOverrides } from './storage.js';
import { renderSidebar, renderGrid } from './render.js';
import {
  searchMusicians, searchMusicAlbums, searchShows, searchBooks, searchGames, searchMoviesWikipedia,
  ensureArtistWikipediaInfo, ensureItemWikipediaInfo, fetchAlbumsFromItunes,
} from './api.js';
import { autoSaveMusician } from './authors.js';

// ===== ADD-MODAL WIZARD STATE (screen 'category' → 'search' → 'review') =====
let _wizardScreen = 'category';    // which screen is currently visible — drives what the back icon does
let _wizardResults = [];           // last-rendered search results, indexed for click-to-select
let _wizardFetchedImageUrl = null; // image resolved from search selection / review-screen enrichment; merged into item.imageUrl at save time only if the user hasn't typed a manual override
let _wizardToken = 0;              // bumped on every open/close/back/advance — in-flight search or enrichment callbacks compare against this and no-op if stale

const STEP1_SEARCH_FN = {
  Musician: searchMusicians,
  'Music Album': searchMusicAlbums,
  Show: searchShows,
  Book: searchBooks,
  Game: searchGames,
  Movie: searchMoviesWikipedia,
  // 'Visual Art' intentionally omitted — no search source; its category tile goes straight to the review screen.
};

const STEP1_PLACEHOLDER = {
  Musician: 'Search for an artist…',
  'Music Album': 'Search for an album…',
  Show: 'Search for a show…',
  Book: 'Search for a book…',
  Game: 'Search for a game…',
  Movie: 'Search for a movie…',
};

// Only Music Album (artist) and Book (author) have a meaningful separate "Author" — every other
// category collapses the Title/Author row to a single field so it doesn't sit there empty.
const CATEGORIES_WITH_AUTHOR = new Set(['Music Album', 'Book']);
const SINGLE_FIELD_PLACEHOLDER = { Musician: 'Name' }; // everything else defaults to "Title"

// Purely visual (hide/show + placeholder) — deliberately never clears #input-author's value,
// even when hiding it, so opening Edit on an older item that happens to have author data set
// doesn't silently blank it on save. For the Add wizard this is a non-issue anyway: none of the
// author-less categories' search results ever populate `author` in the first place.
export function updateTitleAuthorLayout(category) {
  const row = document.querySelector('.title-author-row');
  const showsAuthor = CATEGORIES_WITH_AUTHOR.has(category);
  row.classList.toggle('title-author-row--single', !showsAuthor);
  document.getElementById('input-title').placeholder = showsAuthor
    ? 'Title'
    : (SINGLE_FIELD_PLACEHOLDER[category] || 'Title');
}

export function updatePlatformSummary() {
  const count = document.querySelectorAll('#platform-chips input:checked').length;
  document.getElementById('platform-summary-text').textContent =
    count === 0 ? 'No platforms selected' : `${count} platform${count === 1 ? '' : 's'} selected`;
}

export function updatePlatformsSection(cat) {
  const section = document.getElementById('platforms-section');
  const config = CATEGORY_PLATFORMS[cat];
  if (!config) { section.style.display = 'none'; return; }

  document.getElementById('platforms-label-text').textContent = config.label;
  const list = document.getElementById('platform-chips');
  list.innerHTML = config.platforms.map(p =>
    `<label class="platform-option"><input type="checkbox" value="${p.id}" checked> ${p.name}</label>`
  ).join('');
  document.getElementById('platform-dropdown').open = false;
  section.style.display = '';
  updatePlatformSummary();
}

export function setSelectedPlatforms(ids) {
  document.querySelectorAll('#platform-chips input[type="checkbox"]').forEach(cb => {
    cb.checked = ids.includes(cb.value);
  });
  updatePlatformSummary();
}

export function getSelectedPlatforms() {
  return [...document.querySelectorAll('#platform-chips input:checked')].map(cb => cb.value);
}

// ===== SCREEN A: category tiles =====

function renderCategoryTiles() {
  const grid = document.getElementById('step1-category-grid');
  grid.innerHTML = CATEGORIES.map(cat => `
    <button type="button" class="step1-category-tile" data-category="${cat}">
      <span class="cat-icon">${CAT_EMOJI[cat] || ''}</span>
      <span class="step1-category-tile-label">${CAT_LABEL[cat] || cat}</span>
    </button>`).join('');
}

export function selectStep1Category(cat) {
  state.modalCategory = cat;
  document.getElementById('modal-category').value = cat;
  document.querySelectorAll('.step1-category-tile').forEach(t =>
    t.classList.toggle('selected', t.dataset.category === cat));

  if (cat === 'Visual Art') {
    showReviewScreen(null);
    return;
  }

  showSearchScreen(cat);
}

// ===== SCREEN B: live search for the selected category =====

function showSearchScreen(cat) {
  _wizardScreen = 'search';
  _wizardToken += 1;

  document.getElementById('modal-step1').style.display = 'none';
  document.getElementById('modal-step-search').style.display = '';
  document.getElementById('modal-step2').style.display = 'none';
  document.getElementById('btn-modal-back').style.display = '';
  document.getElementById('btn-modal-save').style.display = 'none';
  document.querySelector('#modal-overlay h2').innerHTML = `${MODAL_BOOKMARK_ICON_SVG}${CAT_LABEL[cat] || cat}`;

  const input = document.getElementById('step1-search-input');
  input.value = '';
  input.placeholder = STEP1_PLACEHOLDER[cat] || 'Search…';
  hideSearchResults();
  document.getElementById('step1-manual-add').style.display = 'none';
  input.focus();
}

export async function handleStep1Search() {
  const input = document.getElementById('step1-search-input');
  const term = input.value.trim();
  const manualAdd = document.getElementById('step1-manual-add');
  manualAdd.style.display = term ? '' : 'none';
  document.getElementById('step1-manual-add-text').textContent = term;

  const searchFn = STEP1_SEARCH_FN[state.modalCategory];
  if (!searchFn || term.length < 2) { hideSearchResults(); return; }

  const myToken = _wizardToken;
  let results = [];
  try { results = await searchFn(term); } catch { results = []; }
  if (myToken !== _wizardToken) return;   // wizard moved on while this was in flight
  if (input.value.trim() !== term) return; // a newer search is already in flight/rendered
  _wizardResults = results;
  renderSearchResults(results);
}

function renderSearchResults(results) {
  const el = document.getElementById('step1-search-results');
  if (results.length === 0) { el.style.display = 'none'; el.innerHTML = ''; return; }
  el.style.display = '';
  const placeholderIcon = CAT_EMOJI[state.modalCategory] || '';
  el.innerHTML = results.map((r, i) => `
    <div class="step1-result-row" data-index="${i}">
      ${r.imageUrl
        ? `<img class="step1-result-art" src="${escapeHtml(r.imageUrl)}" alt="" loading="lazy" decoding="async"
                onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
           <div class="step1-result-art step1-result-art-placeholder" style="display:none">${placeholderIcon}</div>`
        : `<div class="step1-result-art step1-result-art-placeholder">${placeholderIcon}</div>`}
      <div class="step1-result-info">
        <div class="step1-result-title">${escapeHtml(r.title)}</div>
        ${r.meta ? `<div class="step1-result-meta">${escapeHtml(r.meta)}</div>` : ''}
      </div>
    </div>`).join('');

  el.querySelectorAll('.step1-result-row').forEach(row => {
    row.addEventListener('mousedown', e => {
      e.preventDefault();
      const result = _wizardResults[parseInt(row.dataset.index, 10)];
      if (result) showReviewScreen(result);
    });
  });
}

export function hideSearchResults() {
  const el = document.getElementById('step1-search-results');
  if (el) { el.style.display = 'none'; el.innerHTML = ''; }
}

export function handleStep1ManualAdd() {
  const term = document.getElementById('step1-search-input').value.trim();
  if (!term) return;
  showReviewScreen({ title: term });
}

// ===== SCREEN C: review / refine =====

function showReviewScreen(result) {
  _wizardScreen = 'review';
  _wizardToken += 1;
  const myToken = _wizardToken;

  document.getElementById('modal-step1').style.display = 'none';
  document.getElementById('modal-step-search').style.display = 'none';
  document.getElementById('modal-step2').style.display = '';
  document.getElementById('modal-category').style.display = '';
  document.getElementById('btn-modal-back').style.display = '';
  document.getElementById('btn-modal-save').style.display = '';
  document.querySelector('#modal-overlay h2').innerHTML = `${MODAL_BOOKMARK_ICON_SVG}Add to SaveCraft`;

  document.getElementById('input-title').value = result?.title || '';
  document.getElementById('input-author').value = result?.author || '';
  document.getElementById('input-summary').value = '';
  document.getElementById('input-notes').value = '';
  document.getElementById('input-image-url').value = '';
  document.getElementById('input-url').value = result?.url || '';
  updateTitleAuthorLayout(state.modalCategory);
  updatePlatformsSection(state.modalCategory || '');

  _wizardFetchedImageUrl = result?.imageUrlLarge || result?.imageUrl || null;
  renderStep2ImagePreview(_wizardFetchedImageUrl);

  document.getElementById('input-title').focus();
  kickOffStep2Enrichment(myToken);
}

// ===== BACK NAVIGATION =====
// Single back icon, top-left of the modal — steps back exactly one screen. From 'review' this
// goes to 'search' for categories that have one, or straight to 'category' for Visual Art
// (which has no search screen to return to). From 'search' it always goes to 'category'.
export function handleModalBack() {
  if (_wizardScreen === 'review' && state.modalCategory && state.modalCategory !== 'Visual Art') {
    backToSearchScreen();
  } else {
    backToCategoryScreen();
  }
}

function backToSearchScreen() {
  _wizardScreen = 'search';
  _wizardToken += 1; // invalidate any in-flight review-screen enrichment
  document.getElementById('modal-step2').style.display = 'none';
  document.getElementById('modal-step-search').style.display = '';
  document.getElementById('modal-category').style.display = 'none';
  document.getElementById('btn-modal-save').style.display = 'none';
  document.querySelector('#modal-overlay h2').innerHTML = `${MODAL_BOOKMARK_ICON_SVG}${CAT_LABEL[state.modalCategory] || state.modalCategory}`;
  // The search screen's term/results are left exactly as the user left them (only display
  // toggles) — no reset here — so stepping back into it is non-destructive.
}

function backToCategoryScreen() {
  _wizardScreen = 'category';
  _wizardToken += 1; // invalidate any in-flight search or enrichment
  document.getElementById('modal-step2').style.display = 'none';
  document.getElementById('modal-step-search').style.display = 'none';
  document.getElementById('modal-step1').style.display = '';
  document.getElementById('modal-category').style.display = 'none';
  document.getElementById('btn-modal-back').style.display = 'none';
  document.getElementById('btn-modal-save').style.display = 'none';
  document.querySelector('#modal-overlay h2').innerHTML = `${MODAL_BOOKMARK_ICON_SVG}What are you adding to?`;
}

// ===== review-screen enrichment + image preview =====

function kickOffStep2Enrichment(token) {
  const category = state.modalCategory;
  const title = document.getElementById('input-title').value.trim();
  if (!title) return;

  if (category === 'Musician') {
    ensureArtistWikipediaInfo(title).then(({ bio, photoUrl }) => {
      if (token !== _wizardToken) return; // Back/close/re-select happened before this resolved
      applyStep2Enrichment(bio, photoUrl);
    });
  } else if (category === 'Book' || category === 'Show' || category === 'Movie' || category === 'Game') {
    ensureItemWikipediaInfo(title, category).then(({ bio, photoUrl }) => {
      if (token !== _wizardToken) return;
      applyStep2Enrichment(bio, photoUrl);
    });
  }
  // Music Album already has full title/author/art/url straight from iTunes; Visual Art has no
  // enrichment source at all — neither needs a background lookup here.
}

function applyStep2Enrichment(bio, photoUrl) {
  const summaryEl = document.getElementById('input-summary');
  if (bio && !summaryEl.value.trim()) summaryEl.value = bio;
  if (photoUrl && (!_wizardFetchedImageUrl || isItunesArtworkUrl(_wizardFetchedImageUrl))) {
    _wizardFetchedImageUrl = photoUrl;
    renderStep2ImagePreview(_wizardFetchedImageUrl);
  }
}

function renderStep2ImagePreview(url) {
  const wrap = document.getElementById('step2-image-preview-wrap');
  const img = document.getElementById('step2-image-preview');
  if (url) { img.src = url; wrap.style.display = ''; }
  else { img.src = ''; wrap.style.display = 'none'; }
}

export function refreshStep2ImagePreviewFromManualInput() {
  const manual = document.getElementById('input-image-url').value.trim();
  renderStep2ImagePreview(manual || _wizardFetchedImageUrl);
}

// ===== OPEN / CLOSE =====

export function openAddModal() {
  state.modalCategory = null;
  state.editingId = null;
  _wizardScreen = 'category';
  _wizardResults = [];
  _wizardFetchedImageUrl = null;
  _wizardToken += 1;

  document.getElementById('input-url').value = '';
  document.getElementById('input-title').value = '';
  document.getElementById('input-author').value = '';
  document.getElementById('input-summary').value = '';
  document.getElementById('input-notes').value = '';
  document.getElementById('input-image-url').value = '';
  updatePlatformsSection('');
  document.getElementById('modal-category').value = '';
  document.getElementById('modal-category').style.display = 'none';
  renderStep2ImagePreview(null);

  renderCategoryTiles();
  document.querySelectorAll('.step1-category-tile').forEach(t => t.classList.remove('selected'));
  document.getElementById('step1-search-input').value = '';
  hideSearchResults();
  document.getElementById('step1-manual-add').style.display = 'none';

  document.getElementById('modal-step1').style.display = '';
  document.getElementById('modal-step-search').style.display = 'none';
  document.getElementById('modal-step2').style.display = 'none';
  document.getElementById('btn-modal-back').style.display = 'none';
  document.getElementById('btn-modal-save').style.display = 'none';

  document.querySelector('#modal-overlay h2').innerHTML = `${MODAL_BOOKMARK_ICON_SVG}What are you adding to?`;
  document.getElementById('modal-overlay').classList.add('open');
}

export function openEditModal(item) {
  state.editingId = item.id;
  state.modalCategory = item.category || null;
  _wizardScreen = 'review';
  _wizardFetchedImageUrl = null;
  _wizardToken += 1;

  document.getElementById('input-url').value = item.url || '';
  document.getElementById('input-title').value = item.title || '';
  document.getElementById('input-author').value = item.author || '';
  document.getElementById('input-summary').value = item.summary || '';
  document.getElementById('input-notes').value = item.notes || '';
  document.getElementById('input-image-url').value = item.imageUrl || '';
  updateTitleAuthorLayout(item.category);
  document.getElementById('modal-category').value = item.category || '';
  document.getElementById('modal-category').style.display = '';
  updatePlatformsSection(item.category || '');
  if (item.platforms) setSelectedPlatforms(item.platforms);
  renderStep2ImagePreview(item.imageUrl || null);

  document.getElementById('modal-step1').style.display = 'none';
  document.getElementById('modal-step-search').style.display = 'none';
  document.getElementById('modal-step2').style.display = '';
  document.getElementById('btn-modal-back').style.display = 'none'; // Edit never has a prior screen, so no Back
  document.getElementById('btn-modal-save').style.display = '';

  document.querySelector('#modal-overlay h2').innerHTML = `${MODAL_BOOKMARK_ICON_SVG}Edit Item`;
  document.getElementById('btn-modal-save').textContent = 'Update';

  document.getElementById('modal-overlay').classList.add('open');
  document.getElementById('input-title').focus();
}

export function closeAddModal() {
  _wizardToken += 1; // invalidate any in-flight search or enrichment
  document.getElementById('modal-overlay').classList.remove('open');
}

// ===== SAVE =====

export async function handleSaveItem() {
  const url = document.getElementById('input-url').value.trim() || null;
  const titleInput = document.getElementById('input-title').value.trim();
  const author = document.getElementById('input-author').value.trim() || null;
  const category = document.getElementById('modal-category').value || null;
  const folderId = null;
  const summary = document.getElementById('input-summary').value.trim() || null;
  const notes = document.getElementById('input-notes').value.trim() || null;
  const manualImageUrl = document.getElementById('input-image-url').value.trim() || null;
  const platforms = getSelectedPlatforms();

  if (!titleInput) {
    document.getElementById('input-title').focus();
    document.getElementById('input-title').style.borderColor = '#EF4444';
    setTimeout(() => document.getElementById('input-title').style.borderColor = '', 1500);
    return;
  }

  if (!category) {
    const catSelect = document.getElementById('modal-category');
    if (catSelect) { catSelect.style.outline = '2px solid #EF4444'; setTimeout(() => catSelect.style.outline = '', 1500); }
    return;
  }

  const saveBtn = document.getElementById('btn-modal-save');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  const title = titleInput;

  let item;
  if (state.editingId && state.editingId.startsWith('cur-')) {
    // Curated item edit — save as an override, not a new personal item
    state.curatedOverrides[state.editingId] = { url, title, author, summary, notes, imageUrl: manualImageUrl };
    await persistCuratedOverrides();
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save';
    closeAddModal();
    renderGrid();
    return;
  } else if (state.editingId) {
    const existing = state.items.find(i => i.id === state.editingId);
    item = { ...existing, url, title, author, summary, notes, imageUrl: manualImageUrl, category, folderId, platforms };
    const idx = state.items.findIndex(i => i.id === state.editingId);
    if (idx >= 0) state.items[idx] = item;
  } else {
    item = {
      id: Date.now().toString(), url, title, author, summary, notes,
      imageUrl: manualImageUrl || _wizardFetchedImageUrl || null, description: null,
      category, folderId, platforms, done: false, savedAt: Date.now(),
    };
  }

  await persistItem(item);
  saveBtn.disabled = false;
  saveBtn.textContent = 'Save';
  closeAddModal();
  renderSidebar();
  renderGrid();

  const needsMeta = !state.editingId && !item.imageUrl && url;
  if (needsMeta && !manualImageUrl) {
    fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`)
      .then(r => r.json())
      .then(data => {
        const imageUrl = data?.data?.image?.url || null;
        if (imageUrl && !item.imageUrl) persistItem({ ...item, imageUrl });
      })
      .catch(() => {});
  }

  if (!state.editingId && category === 'Musician') {
    autoImportMusicianAlbums(item); // fire-and-forget, doesn't block the modal closing
  }

  if (!state.editingId && category === 'Music Album' && author) {
    // Fire-and-forget, mirroring the Musician branch above: get-or-create the artist's Musician
    // record (autoSaveMusician already dedupes by exact title match, so re-adding an album by an
    // artist you've already saved won't create a second Musician), then pull in the rest of
    // their discography the same way a brand-new Musician save does.
    autoSaveMusician(author).then(musicianItem => {
      if (musicianItem) autoImportMusicianAlbums(musicianItem);
    });
  }
}

// After adding a brand-new Musician, automatically pulls in their real full-length albums —
// excluding singles/EPs and anything not attributed to them as the primary artist (a same-
// search-term feature, tribute, or compilation) — so the user doesn't have to separately visit
// the artist's page and run Fetch Albums. Mirrors the item shape fetchAlbumsModal.js's
// handleImportAlbums() creates, but runs unattended with no review step.
async function autoImportMusicianAlbums(musicianItem) {
  const artistName = musicianItem.title;
  if (!artistName) return;
  let albums;
  try {
    albums = await fetchAlbumsFromItunes(artistName);
  } catch {
    return;
  }
  const lowerName = artistName.trim().toLowerCase();
  const fullAlbums = albums.filter(a =>
    a.artist?.toLowerCase() === lowerName &&
    a.type !== 'Single' &&
    !/\s[-–]\s*(single|ep)\s*$/i.test(a.title)
  );
  if (fullAlbums.length === 0) return;

  const existingTitles = new Set(
    state.items
      .filter(i => i.category === 'Music Album' && i.author === artistName)
      .map(i => i.title?.toLowerCase())
  );

  let imported = false;
  for (const album of fullAlbums) {
    if (existingTitles.has(album.title?.toLowerCase())) continue;
    const albumItem = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      title: album.title,
      author: artistName,
      category: 'Music Album',
      url: album.url || null,
      imageUrl: album.imageUrl || null,
      notes: null,
      genre: album.genre || null,
      year: album.year || null,
      collectionId: album.collectionId || null,
      folderId: null,
      savedAt: Date.now(),
    };
    state.items.unshift(albumItem);
    await persistItem(albumItem);
    imported = true;
  }
  if (imported) {
    renderSidebar();
    renderGrid();
  }
}
