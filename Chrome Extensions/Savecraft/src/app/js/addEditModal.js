// ===== ADD / EDIT ITEM MODAL =====
// Add is a simple three-screen wizard: Screen A picks a category, Screen A2 picks a folder (only
// if the category has any), Screen B (also used standalone for Edit) is the single review form —
// just Title and URL for most categories, since the old separate search step and the extra
// Author/Summary/Platforms/Video-URL fields made adding an item feel like too much work. For
// Music Album/Show/Book/Game/Movie specifically, the Title field doubles as a live search box
// (see TITLE_SEARCH_FN below) — picking a result silently fills the hidden Author/Image URL
// fields so cards/detail pages still get correct art and links, without showing the extra fields
// or a separate search screen. A single back icon (top-left of the modal) steps back one screen
// at a time.

import { state, CATEGORIES, CAT_LABEL, CAT_EMOJI, CATEGORY_PLATFORMS, MODAL_BOOKMARK_ICON_SVG } from './state.js';
import { escapeHtml, isItunesArtworkUrl, folderIconHtml, sortFoldersForDisplay } from './utils.js';
import { persistItem, persistCuratedOverrides } from './storage.js';
import { renderSidebar, renderGrid, promptAddFolder } from './render.js';
import {
  searchMusicAlbums, searchShows, searchBooks, searchGames, searchMoviesWikipedia,
  ensureArtistWikipediaInfo, ensureItemWikipediaInfo, ensureItemCreator, fetchAlbumsFromItunes,
  fetchVideoThumbnail,
} from './api.js';
import { autoSaveMusician } from './authors.js';

// ===== ADD-MODAL WIZARD STATE (screen 'category' → 'review') =====
let _wizardScreen = 'category';    // which screen is currently visible — drives what the back icon does
let _wizardResults = [];           // last-rendered title-search results, indexed for click-to-select
let _wizardFetchedImageUrl = null; // image resolved from a title-search selection / background enrichment; merged into item.imageUrl at save time only if the user hasn't typed a manual override
let _wizardToken = 0;              // bumped on every open/close/back/advance — in-flight search or enrichment callbacks compare against this and no-op if stale
let _wizardFolderId = null;        // folder chosen on the folder-picker screen (null = "No folder")
let _wizardHadFolderScreen = false; // whether the current category actually showed a folder screen — drives Back navigation
let _wizardHadMusicChoiceScreen = false; // whether the combined "Music" tile's Musician/Album sub-choice screen was shown — drives Back navigation

// Musician is deliberately excluded — its background Wikipedia lookup (kickOffTitleEnrichment)
// works fine off a plain typed name, and matching an exact catalog entry doesn't matter the way
// it does for these five (which need the right result selected for links/art to populate
// correctly). Visual Art/Web Links/News have no search source at all.
const TITLE_SEARCH_FN = {
  'Music Album': searchMusicAlbums,
  Show: searchShows,
  Book: searchBooks,
  Game: searchGames,
  Movie: searchMoviesWikipedia,
};

// Music Album (artist), Book (author), Movie (director), Show (creator), and Game (studio) each
// have a meaningful separate "Author"-equivalent field — every other category collapses the
// Title/Author row to a single field so it doesn't sit there empty.
const CATEGORIES_WITH_AUTHOR = new Set(['Music Album', 'Book', 'Movie', 'Show', 'Game']);
const SINGLE_FIELD_PLACEHOLDER = { Musician: 'Name' }; // everything else defaults to "Title"
const AUTHOR_FIELD_LABEL = { 'Music Album': 'Artist', Book: 'Author', Movie: 'Director', Show: 'Creator', Game: 'Studio' };

// Edit-mode only now — the Add flow always shows the single-field (Title-only) layout regardless
// of category (see showReviewScreen). Purely visual (hide/show + placeholder) — deliberately
// never clears #input-author's value, even when hiding it, so opening Edit on an older item that
// happens to have author data set doesn't silently blank it on save.
export function updateTitleAuthorLayout(category, folderId) {
  const row = document.querySelector('.title-author-row');
  const showsAuthor = CATEGORIES_WITH_AUTHOR.has(category);
  row.classList.toggle('title-author-row--single', !showsAuthor);
  document.getElementById('input-title').placeholder = showsAuthor
    ? 'Title'
    : (SINGLE_FIELD_PLACEHOLDER[category] || 'Title');
  // Movie's "Videos" folder has no director — it's a channel/uploader, so "Creator" fits better
  // than the default "Director" label there specifically.
  const isVideosFolder = category === 'Movie' && folderId === 'default-movies-videos';
  document.getElementById('input-author').placeholder = isVideosFolder ? 'Creator' : (AUTHOR_FIELD_LABEL[category] || 'Author');
}

// Add-flow only — Edit always passes enabled=false, since re-searching an item you're already
// editing (with its own Author/Summary fields visible) doesn't make sense. Movie's own "Videos"
// folder (trailers/clips) is excluded even though Movie itself has a search source — those are
// manually added, not looked up by title, same as Musician/Visual Art/Web Links/News.
export function updateTitleSearchUi(category, enabled) {
  const hasSearch = enabled && !!TITLE_SEARCH_FN[category] && _wizardFolderId !== 'default-movies-videos';
  document.querySelector('.title-author-row').classList.toggle('has-search-icon', hasSearch);
  document.getElementById('btn-title-search').style.display = hasSearch ? '' : 'none';
  document.getElementById('input-title').placeholder = hasSearch ? 'Search title' : 'Title';
  hideTitleSearchResults();
}

// Add is just Title + URL for every category — Author/Summary/Platforms/Video-URL still get
// populated in the background (title-search selection, kickOffTitleEnrichment) so the data is
// there for cards/detail pages, they're just not shown/editable at add time. Editing an existing
// item still shows all of them, same as before.
function setAddSimpleMode(isSimple) {
  document.getElementById('summary-group').style.display = isSimple ? 'none' : '';
  document.getElementById('youtube-url-group').style.display = isSimple ? 'none' : '';
  document.getElementById('music-url-pair-row').style.display = isSimple ? 'none' : '';
  document.getElementById('image-url-group').style.display = isSimple ? 'none' : '';
  if (isSimple) document.getElementById('platforms-section').style.display = 'none';
}

// Musician/Music Album/Favorite Albums keep the original compact side-by-side pairing with
// Platforms, untouched, per explicit request. Every other category instead gets this field tucked
// inside the Web Links/Platforms dropdown itself, as a custom-link row after the per-service
// checkboxes (see updatePlatformsSection) — lets the user add e.g. one specific YouTube video
// link that isn't one of the generic per-service search links. The placeholder text (the actual
// youtube.com/watch?v=… suggestion) is intentionally left unchanged in every case — still the
// expected kind of link regardless of the label. appendChild always moves a node to its new spot
// (removing it from wherever it currently sits), so this is safe to call on every category switch
// regardless of the field's current position/parent.
const MUSIC_URL_PAIR_CATEGORIES = new Set(['Musician', 'Music Album', 'Favorite Albums']);
export function updateVideoUrlLayout(category, folderId) {
  const group = document.getElementById('youtube-url-group');
  const labelText = document.getElementById('youtube-url-label-text');
  const platformsSection = document.getElementById('platforms-section');
  const musicPairRow = document.getElementById('music-url-pair-row');

  labelText.textContent = category === 'Movie' ? 'Video URL' : 'YouTube URL';

  // Movie's "Videos" folder already has its own "Video URL" field (the plain #input-url one,
  // relabeled in showReviewScreen/openEditModal) which is the field the thumbnail/lightbox
  // features actually read — this separate #input-youtube-url one would just be a confusing,
  // functionally-dead duplicate there, so it's hidden entirely for that specific case.
  const isVideosFolder = category === 'Movie' && folderId === 'default-movies-videos';
  group.style.display = isVideosFolder ? 'none' : '';

  if (MUSIC_URL_PAIR_CATEGORIES.has(category)) {
    musicPairRow.appendChild(platformsSection);
    musicPairRow.appendChild(group);
  } else {
    // Platforms/"Web Links" is always the very last field section for every non-Music category —
    // appended to the end of the whole form. The video-link field's own position within it
    // (appended inside #platform-chips) is handled by updatePlatformsSection instead, not here.
    document.getElementById('modal-step2').appendChild(platformsSection);
  }
}

// Single entry point for the #modal-category <select> (main.js) — it's shown in both Add and Edit,
// but the two modes react to a category change differently: Edit re-lays-out the full field set,
// while Add just needs the Title field's search-icon/placeholder to match the new category (every
// other field stays hidden regardless of category, per setAddSimpleMode).
export function updateCategoryDependentUi(category) {
  if (state.editingId) {
    const folderId = document.getElementById('input-folder-select').value || null;
    updatePlatformsSection(category);
    updateTitleAuthorLayout(category, folderId);
    updateVideoUrlLayout(category, folderId);
  } else {
    updateTitleSearchUi(category, true);
  }
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
  // Once a category switch has nested #youtube-url-group inside #platform-chips (below), it's a
  // descendant of `list` — overwriting list.innerHTML would detach it from the document entirely,
  // and a detached node is invisible to getElementById, permanently losing the reference on the
  // very next call. Moved out to a safe parent first so it survives the rebuild regardless of
  // where it was living coming in.
  document.getElementById('modal-step2').appendChild(document.getElementById('youtube-url-group'));
  list.innerHTML = config.platforms.map(p =>
    `<label class="platform-option"><input type="checkbox" value="${p.id}" checked> ${p.name}</label>`
  ).join('');
  // Custom-link row (the same #youtube-url-group field, just relocated) appended as the last row
  // in the dropdown, after the per-service checkboxes — lets the user add one specific video link
  // (e.g. a particular YouTube upload) that isn't a generic per-service search. Music categories
  // keep their own separate paired layout instead (see updateVideoUrlLayout) and are skipped here
  // so the two don't fight over where the field lives.
  if (!MUSIC_URL_PAIR_CATEGORIES.has(cat)) {
    list.appendChild(document.getElementById('youtube-url-group'));
  }
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

// Musician and Music Album are one combined "Music" tile here — picking it leads to a small
// sub-choice screen (showMusicChoiceScreen) instead of two separate tiles. Nothing about the
// underlying categories themselves changes; this is purely a wizard-entry-point convenience.
function renderCategoryTiles() {
  const grid = document.getElementById('step1-category-grid');
  grid.innerHTML = CATEGORIES.filter(cat => cat !== 'Music Album').map(cat => cat === 'Musician' ? `
    <button type="button" class="step1-category-tile" data-category="__music__">
      <span class="cat-icon">${CAT_EMOJI['Music Album'] || ''}</span>
      <span class="step1-category-tile-label">Musicians</span>
    </button>` : `
    <button type="button" class="step1-category-tile" data-category="${cat}">
      <span class="cat-icon">${CAT_EMOJI[cat] || ''}</span>
      <span class="step1-category-tile-label">${CAT_LABEL[cat] || cat}</span>
    </button>`).join('');
}

export function selectStep1Category(cat) {
  document.querySelectorAll('.step1-category-tile').forEach(t =>
    t.classList.toggle('selected', t.dataset.category === cat));

  if (cat === '__music__') {
    showMusicChoiceScreen();
    return;
  }

  state.modalCategory = cat;
  document.getElementById('modal-category').value = cat;
  showFolderScreenOrSkip(cat);
}

// ===== SCREEN A1.5: Musician vs Music Album sub-choice (only for the combined "Music" tile) =====

function showMusicChoiceScreen() {
  _wizardScreen = 'music-choice';
  _wizardHadMusicChoiceScreen = true;
  _wizardToken += 1;

  document.getElementById('modal-step1').style.display = 'none';
  document.getElementById('modal-step-music-choice').style.display = '';
  document.getElementById('modal-step-folder').style.display = 'none';
  document.getElementById('modal-step2').style.display = 'none';
  document.getElementById('btn-modal-back').style.display = '';
  document.getElementById('btn-modal-save').style.display = 'none';
  document.getElementById('modal-back-label').textContent = 'Musicians';
  document.querySelector('#modal-overlay h2').innerHTML = 'Choose a folder';

  // CAT_LABEL['Musician'] is "Musicians" (used for the combined top-level tile) — on this
  // specific sub-choice screen that duplicates the tile you just clicked, so it's overridden to
  // the singular "Musician" here only (mirrors the popup's own musicChoiceLabels).
  const musicChoiceLabels = { Musician: 'Musician', 'Music Album': CAT_LABEL['Music Album'] };
  const grid = document.getElementById('step1-music-choice-grid');
  grid.innerHTML = ['Musician', 'Music Album'].map(cat => `
    <button type="button" class="step1-category-tile" data-category="${cat}">
      <span class="cat-icon">${CAT_EMOJI[cat] || ''}</span>
      <span class="step1-category-tile-label">${musicChoiceLabels[cat] || cat}</span>
    </button>`).join('');

  grid.querySelectorAll('.step1-category-tile').forEach(t => {
    t.addEventListener('click', () => selectMusicChoice(t.dataset.category));
  });
}

function selectMusicChoice(cat) {
  state.modalCategory = cat;
  document.getElementById('modal-category').value = cat;
  showFolderScreenOrSkip(cat);
}

// ===== SCREEN A2: folder picker (shown only when the category has at least one folder) =====

function showFolderScreenOrSkip(cat) {
  const folders = sortFoldersForDisplay(state.folders.filter(f => f.parentCategory === cat), cat);
  // With no "Skip" option, a single folder is no real choice — auto-assign it and move on
  // instead of forcing a click on the only tile that could ever be picked.
  if (folders.length <= 1) {
    _wizardHadFolderScreen = false;
    _wizardFolderId = folders[0]?.id || null;
    showReviewScreen();
    return;
  }
  showFolderScreen(cat, folders);
}

function showFolderScreen(cat, folders) {
  _wizardScreen = 'folder';
  _wizardHadFolderScreen = true;
  _wizardToken += 1;

  document.getElementById('modal-step1').style.display = 'none';
  document.getElementById('modal-step-music-choice').style.display = 'none';
  document.getElementById('modal-step-folder').style.display = '';
  document.getElementById('modal-step2').style.display = 'none';
  document.getElementById('btn-modal-back').style.display = '';
  document.getElementById('btn-modal-save').style.display = 'none';
  const isNews = cat === 'News';
  document.getElementById('modal-back-label').textContent = CAT_LABEL[cat] || cat;
  document.querySelector('#modal-overlay h2').innerHTML = isNews ? 'Choose a source' : 'Choose a folder';

  // No "Skip" — a folder must always be picked; there is no path to the review screen without one.
  const grid = document.getElementById('step1-folder-grid');
  grid.innerHTML = folders.map(f => `
    <button type="button" class="step1-category-tile" data-folder-id="${f.id}">
      <span class="cat-icon">${folderIconHtml(f.id, 28)}</span>
      <span class="step1-category-tile-label">${escapeHtml(f.name)}${f.paywalled ? ' <span class="step1-paywalled-badge">Paywalled</span>' : ''}</span>
    </button>`).join('');

  grid.querySelectorAll('.step1-category-tile').forEach(t => {
    t.addEventListener('click', () => selectStep1Folder(t.dataset.folderId || null));
  });

  const addFolderLink = document.getElementById('step1-add-folder-link');
  addFolderLink.style.display = cat === 'Visual Art' ? '' : 'none';
  addFolderLink.onclick = () => {
    promptAddFolder(cat);
    const updatedFolders = sortFoldersForDisplay(state.folders.filter(f => f.parentCategory === cat), cat);
    showFolderScreen(cat, updatedFolders);
  };
}

function selectStep1Folder(folderId) {
  _wizardFolderId = folderId;
  showReviewScreen();
}

// ===== SCREEN B: review form (Title + URL, Title doubles as search for some categories) =====

function showReviewScreen() {
  _wizardScreen = 'review';
  _wizardToken += 1;

  document.getElementById('modal-step1').style.display = 'none';
  document.getElementById('modal-step-music-choice').style.display = 'none';
  document.getElementById('modal-step-folder').style.display = 'none';
  document.getElementById('modal-step2').style.display = '';
  document.getElementById('modal-category-wrap').style.display = '';
  document.getElementById('btn-modal-back').style.display = '';
  document.getElementById('btn-modal-save').style.display = '';
  document.getElementById('folder-select-group').style.display = 'none'; // Add flow assigns folder via the wizard screen, not this select
  // The chosen folder (e.g. "Blogs") is more specific/useful here than the category name — falls
  // back to the category (e.g. "Websites") when no folder was chosen (categories with 0 or 1
  // folders skip the folder-picker screen entirely, per showFolderScreenOrSkip).
  const chosenFolder = _wizardFolderId ? state.folders.find(f => f.id === _wizardFolderId) : null;
  document.getElementById('modal-back-label').textContent = chosenFolder?.name || CAT_LABEL[state.modalCategory] || state.modalCategory || '';
  document.querySelector('#modal-overlay h2').innerHTML = '';

  document.getElementById('input-title').value = '';
  document.getElementById('input-author').value = '';
  document.getElementById('input-summary').value = '';
  document.getElementById('input-image-url').value = '';
  document.getElementById('input-youtube-url').value = '';
  document.getElementById('input-url').value = '';
  _wizardFetchedImageUrl = null;
  _wizardResults = [];

  document.querySelector('.title-author-row').classList.add('title-author-row--single');
  updateTitleSearchUi(state.modalCategory, true);
  setAddSimpleMode(true);
  renderStep2ImagePreview(null);

  // Movie's "Videos" folder is exclusively for video links (YouTube, Vimeo, etc.) — the plain
  // "URL" field/placeholder don't communicate that, so both get relabeled here specifically.
  // Every other folder/category keeps the generic URL field.
  const isVideosFolder = _wizardFolderId === 'default-movies-videos';
  document.getElementById('input-url-label-text').textContent = isVideosFolder ? 'Video URL' : 'URL';
  document.getElementById('input-url').placeholder = isVideosFolder ? 'https://youtube.com/watch?v=…' : 'https://…';

  document.getElementById('input-title').focus();
}

// ===== BACK NAVIGATION =====
// Single back icon, top-left of the modal — steps back exactly one screen through the nested
// chain: category → [music-choice, only for the combined "Music" tile] → [folder, only if the
// category has folders] → review.
export function handleModalBack() {
  if (_wizardScreen === 'folder') {
    if (_wizardHadMusicChoiceScreen) backToMusicChoiceScreen();
    else backToCategoryScreen();
  } else if (_wizardScreen === 'music-choice') {
    backToCategoryScreen();
  } else if (_wizardHadFolderScreen) {
    backToFolderScreen();
  } else if (_wizardHadMusicChoiceScreen) {
    backToMusicChoiceScreen();
  } else {
    backToCategoryScreen();
  }
}

function backToFolderScreen() {
  _wizardScreen = 'folder';
  _wizardToken += 1;
  document.getElementById('modal-step2').style.display = 'none';
  document.getElementById('modal-step-folder').style.display = '';
  document.getElementById('modal-category-wrap').style.display = 'none';
  document.getElementById('btn-modal-save').style.display = 'none';
  document.getElementById('modal-back-label').textContent = CAT_LABEL[state.modalCategory] || state.modalCategory || '';
  document.querySelector('#modal-overlay h2').innerHTML = 'Choose a folder';
  // Folder tiles/listeners are left exactly as rendered — non-destructive re-entry.
}

function backToMusicChoiceScreen() {
  _wizardScreen = 'music-choice';
  _wizardToken += 1;
  document.getElementById('modal-step2').style.display = 'none';
  document.getElementById('modal-step-folder').style.display = 'none';
  document.getElementById('modal-step-music-choice').style.display = '';
  document.getElementById('modal-category-wrap').style.display = 'none';
  document.getElementById('btn-modal-save').style.display = 'none';
  document.getElementById('modal-back-label').textContent = 'Musicians';
  document.querySelector('#modal-overlay h2').innerHTML = 'Choose a folder';
  // Tiles/listeners are left exactly as rendered — non-destructive re-entry, same as backToFolderScreen's pattern.
}

function backToCategoryScreen() {
  _wizardScreen = 'category';
  _wizardToken += 1; // invalidate any in-flight search or enrichment
  // Both must reset here, not just get overwritten going forward — landing back on the category
  // screen means whatever path got here (a real one, or a stale flag) is over. Without this, e.g.
  // Add → Musicians tile → Back → Books → folder screen → Back would wrongly land on the
  // Musician/Album sub-choice screen instead of the category tiles, since handleModalBack() still
  // saw the stale flag from the earlier Musicians pick. Mirrors the popup's own backToCategoryScreen().
  _wizardHadMusicChoiceScreen = false;
  _wizardHadFolderScreen = false;
  document.getElementById('modal-step2').style.display = 'none';
  document.getElementById('modal-step-folder').style.display = 'none';
  document.getElementById('modal-step-music-choice').style.display = 'none';
  document.getElementById('modal-step1').style.display = '';
  document.getElementById('modal-category-wrap').style.display = 'none';
  document.getElementById('btn-modal-back').style.display = 'none';
  document.getElementById('btn-modal-save').style.display = 'none';
  document.querySelector('#modal-overlay h2').innerHTML = `${MODAL_BOOKMARK_ICON_SVG}What are you adding to?`;
}

// ===== Title-field live search (Music Album/Show/Book/Game/Movie only) =====
// Collapses the old separate search screen into the Title field itself: typing searches, picking
// a result fills Title + the hidden Author/Image URL fields (still saved, just not shown) so
// cards/detail pages get correct art and links without an extra screen or visible clutter.

export async function handleTitleSearch() {
  if (state.editingId) return; // Edit mode never searches
  const input = document.getElementById('input-title');
  const term = input.value.trim();
  // Movie's "Videos" folder is manually added (trailers/clips), not looked up by title — same
  // exclusion as updateTitleSearchUi's icon/placeholder.
  const searchFn = _wizardFolderId === 'default-movies-videos' ? null : TITLE_SEARCH_FN[state.modalCategory];
  if (!searchFn || term.length < 2) { hideTitleSearchResults(); return; }

  const myToken = _wizardToken;
  let results = [];
  try { results = await searchFn(term); } catch { results = []; }
  if (myToken !== _wizardToken) return;    // wizard moved on while this was in flight
  if (input.value.trim() !== term) return; // a newer search is already in flight/rendered
  _wizardResults = results;
  renderTitleSearchResults(results);
}

function renderTitleSearchResults(results) {
  const el = document.getElementById('review-search-results');
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
      if (result) selectTitleSearchResult(result);
    });
  });
}

export function hideTitleSearchResults() {
  const el = document.getElementById('review-search-results');
  if (el) { el.style.display = 'none'; el.innerHTML = ''; }
}

function selectTitleSearchResult(result) {
  document.getElementById('input-title').value = result.title || '';
  document.getElementById('input-author').value = result.author || '';
  document.getElementById('input-url').value = result.url || '';
  _wizardFetchedImageUrl = result.imageUrlLarge || result.imageUrl || null;
  hideTitleSearchResults();
  kickOffTitleEnrichment();
}

// Fires on selecting a title-search result (above) or on the Title field losing focus after
// manual typing (wired in main.js) — same background bio/photo/creator lookups the old search
// screen kicked off on arriving at the review screen, just retriggered from wherever a title
// actually settles now that there's no separate "arrived at review" moment for manual entries.
// Reads _wizardToken itself (rather than taking it as a param) so main.js's blur listener can
// call this with no arguments and still get correct in-flight-request invalidation.
export function kickOffTitleEnrichment() {
  if (state.editingId) return; // Edit mode's fields are already complete; no silent auto-fill
  if (_wizardFolderId === 'default-movies-videos') return; // manually added — no title lookup to piggyback on
  const token = _wizardToken;
  const category = state.modalCategory;
  const title = document.getElementById('input-title').value.trim();
  if (!title) return;

  if (category === 'Musician') {
    ensureArtistWikipediaInfo(title).then(({ bio, photoUrl }) => {
      if (token !== _wizardToken) return; // Back/close/re-select happened before this resolved
      applyTitleEnrichment(bio, photoUrl);
    });
  } else if (category === 'Book' || category === 'Show' || category === 'Movie' || category === 'Game') {
    ensureItemWikipediaInfo(title, category).then(({ bio, photoUrl }) => {
      if (token !== _wizardToken) return;
      applyTitleEnrichment(bio, photoUrl);
    });
  }
  // Music Album already has full title/author/art/url straight from iTunes; Visual Art has no
  // enrichment source at all — neither needs a background lookup here.

  // Director/Creator/Studio auto-fill — separate from (and runs alongside) the bio/image
  // enrichment above, since Movie/Show/Game need both. Book/Music Album already get `author`
  // straight from their search results, so they don't need this.
  if (category === 'Movie' || category === 'Show' || category === 'Game') {
    const url = document.getElementById('input-url').value.trim();
    ensureItemCreator(title, category, { url }).then(creator => {
      if (token !== _wizardToken) return;
      const authorEl = document.getElementById('input-author');
      if (creator && !authorEl.value.trim()) authorEl.value = creator;
    });
  }
}

function applyTitleEnrichment(bio, photoUrl) {
  const summaryEl = document.getElementById('input-summary');
  if (bio && !summaryEl.value.trim()) summaryEl.value = bio;
  if (photoUrl && (!_wizardFetchedImageUrl || isItunesArtworkUrl(_wizardFetchedImageUrl))) {
    _wizardFetchedImageUrl = photoUrl;
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

// Edit-mode-only folder reassignment — the Add flow uses the dedicated wizard folder screen
// instead, so this is only ever called from openEditModal().
function populateFolderSelect(category, folderId) {
  const wrap = document.getElementById('folder-select-group');
  const select = document.getElementById('input-folder-select');
  const folders = sortFoldersForDisplay(state.folders.filter(f => f.parentCategory === category), category);
  if (folders.length === 0) {
    wrap.style.display = 'none';
    select.innerHTML = '';
    return;
  }
  wrap.style.display = '';
  select.innerHTML = `<option value="">No folder</option>` +
    folders.map(f => `<option value="${f.id}">${escapeHtml(f.name)}</option>`).join('');
  select.value = folderId || '';
}

export function openAddModal() {
  state.modalCategory = null;
  state.editingId = null;
  _wizardScreen = 'category';
  _wizardResults = [];
  _wizardFetchedImageUrl = null;
  _wizardFolderId = null;
  _wizardHadFolderScreen = false;
  _wizardHadMusicChoiceScreen = false;
  _wizardToken += 1;

  document.getElementById('input-url').value = '';
  document.getElementById('input-title').value = '';
  document.getElementById('input-author').value = '';
  document.getElementById('input-summary').value = '';
  document.getElementById('input-image-url').value = '';
  document.getElementById('input-youtube-url').value = '';
  document.getElementById('modal-category').value = '';
  document.getElementById('modal-category-wrap').style.display = 'none';
  hideTitleSearchResults();

  renderCategoryTiles();
  document.querySelectorAll('.step1-category-tile').forEach(t => t.classList.remove('selected'));

  document.getElementById('modal-step1').style.display = '';
  document.getElementById('modal-step-music-choice').style.display = 'none';
  document.getElementById('modal-step-folder').style.display = 'none';
  document.getElementById('modal-step2').style.display = 'none';
  document.getElementById('btn-modal-back').style.display = 'none';
  document.getElementById('btn-modal-save').style.display = 'none';

  document.querySelector('#modal-overlay h2').classList.remove('modal-h2--left');
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
  document.getElementById('input-url').placeholder = 'https://…'; // reset in case a prior Add left it on the Videos-folder wording
  document.getElementById('input-url-label-text').textContent = 'URL';
  document.getElementById('input-title').value = item.title || '';
  document.getElementById('input-author').value = item.author || '';
  document.getElementById('input-summary').value = item.summary || '';
  document.getElementById('input-image-url').value = item.imageUrl || '';
  document.getElementById('input-youtube-url').value = item.youtubeUrl || '';
  setAddSimpleMode(false);
  updateTitleSearchUi(item.category, false);
  updateTitleAuthorLayout(item.category, item.folderId);
  updateVideoUrlLayout(item.category, item.folderId);
  document.getElementById('modal-category').value = item.category || '';
  document.getElementById('modal-category-wrap').style.display = '';
  updatePlatformsSection(item.category || '');
  if (item.platforms) setSelectedPlatforms(item.platforms);
  renderStep2ImagePreview(item.imageUrl || null);
  populateFolderSelect(item.category, item.folderId);

  document.getElementById('modal-step1').style.display = 'none';
  document.getElementById('modal-step-music-choice').style.display = 'none';
  document.getElementById('modal-step-folder').style.display = 'none';
  document.getElementById('modal-step2').style.display = '';
  document.getElementById('btn-modal-back').style.display = 'none'; // Edit never has a prior screen, so no Back
  document.getElementById('btn-modal-save').style.display = '';

  document.querySelector('#modal-overlay h2').classList.add('modal-h2--left');
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
  const folderId = state.editingId
    ? (document.getElementById('input-folder-select').value || null)
    : (_wizardFolderId || null);
  const summary = document.getElementById('input-summary').value.trim() || null;
  const manualImageUrl = document.getElementById('input-image-url').value.trim() || null;
  const youtubeUrl = document.getElementById('input-youtube-url').value.trim() || null;
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

  // News is source-verified, not free-paste: the URL must actually belong to the chosen curated
  // outlet's domain — a picked outlet alone is just a label, this is what makes it enforcement.
  // Gated on folderId being set: the curated outlet folders are pulled out for now (being
  // reworked), so with none configured this is a no-op and News behaves like a plain category.
  if (category === 'News' && folderId) {
    const outletFolder = state.folders.find(f => f.id === folderId);
    const domain = outletFolder?.domain;
    let hostname = null;
    try { hostname = url ? new URL(url).hostname.replace(/^www\./, '') : null; } catch { hostname = null; }
    const matches = !!domain && !!hostname && (hostname === domain || hostname.endsWith(`.${domain}`));
    if (!matches) {
      const urlInput = document.getElementById('input-url');
      urlInput.focus();
      urlInput.style.borderColor = '#EF4444';
      setTimeout(() => urlInput.style.borderColor = '', 2000);
      return;
    }
  }

  const saveBtn = document.getElementById('btn-modal-save');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  const title = titleInput;

  let item;
  if (state.editingId && state.editingId.startsWith('cur-')) {
    // Curated item edit — save as an override (so the correction shows immediately), and also
    // silently add it to the user's saves using the edited fields, since editing a curated item
    // you haven't saved yet implies you want to keep it. Reuses the same 'cur-' id (not a new
    // Date.now() id) so it still matches the curated source for badge/lookup purposes elsewhere.
    // Deliberately does NOT set queueStatus — only the explicit "Add to Queue" button does that.
    state.curatedOverrides[state.editingId] = { url, title, author, summary, imageUrl: manualImageUrl, youtubeUrl };
    await persistCuratedOverrides();
    if (!state.items.find(i => i.id === state.editingId)) {
      const liveItem = {
        id: state.editingId, url, title, author, summary,
        imageUrl: manualImageUrl, youtubeUrl, category, folderId, platforms,
        curated: false, savedAt: Date.now(),
      };
      state.items.push(liveItem);
      await persistItem(liveItem);
    }
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save';
    closeAddModal();
    renderSidebar();
    renderGrid();
    return;
  } else if (state.editingId) {
    const existing = state.items.find(i => i.id === state.editingId);
    // notes deliberately not overridden here — it's no longer edited from this form (moved to the
    // detail modal's own My Notes accordion instead), so the spread above just leaves whatever
    // existing.notes already was untouched.
    item = { ...existing, url, title, author, summary, imageUrl: manualImageUrl, youtubeUrl, category, folderId, platforms };
    const idx = state.items.findIndex(i => i.id === state.editingId);
    if (idx >= 0) state.items[idx] = item;
  } else {
    item = {
      id: Date.now().toString(), url, title, author, summary,
      imageUrl: manualImageUrl || _wizardFetchedImageUrl || null, youtubeUrl, description: null,
      category, folderId, platforms, done: false, savedAt: Date.now(),
    };
  }

  await persistItem(item);
  saveBtn.disabled = false;
  saveBtn.textContent = 'Save';
  closeAddModal();
  renderSidebar();
  renderGrid();

  // Also runs on Edit now (not just Add) — adding/changing a URL on an item that still has no
  // image should fetch its featured image the same way a brand-new save does.
  const needsMeta = !item.imageUrl && url;
  if (needsMeta && !manualImageUrl) {
    // Patches both storage and the in-memory item (persistItem alone only covers storage — since
    // this resolves after renderGrid/renderSidebar already ran above, without this the fetched
    // image wouldn't actually show up on screen until the next full reload).
    const applyFetchedImage = imageUrl => {
      if (!imageUrl || item.imageUrl) return;
      const updated = { ...item, imageUrl };
      const idx = state.items.findIndex(i => i.id === item.id);
      if (idx >= 0) state.items[idx] = updated;
      persistItem(updated);
      renderSidebar();
      renderGrid();
    };
    if (item.folderId === 'default-movies-videos') {
      // Videos-folder items skip Wikipedia enrichment entirely (see detailModalSummary.js) and
      // Microlink actively blocks YouTube — this pulls the thumbnail straight from the video
      // host instead (no summary source without an API key, so summary stays empty).
      fetchVideoThumbnail(url).then(applyFetchedImage).catch(() => {});
    } else {
      fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`)
        .then(r => r.json())
        .then(data => applyFetchedImage(data?.data?.image?.url || null))
        .catch(() => {});
    }
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
