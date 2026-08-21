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

import { state, CATEGORIES, CAT_LABEL, CAT_EMOJI, CATEGORY_PLATFORMS, MODAL_BOOKMARK_ICON_SVG, PRIMARY_FOLDER_ID } from './state.js';
import { escapeHtml, isItunesArtworkUrl, folderIconHtml, sortFoldersForDisplay, getChildFolders } from './utils.js';
import { persistItem, persistCuratedOverrides } from './storage.js';
import { renderSidebar, renderGrid, promptAddFolder } from './render.js';
import {
  searchMusicians, searchMusicAlbums, searchShows, searchShowsWikipedia, searchBooks, searchGames, searchMoviesWikipedia,
  ensureArtistWikipediaInfo, ensureItemWikipediaInfo, ensureItemCreator, fetchAlbumsFromItunes,
  fetchVideoThumbnail,
} from './api.js';
import { autoSaveMusician } from './authors.js';
import { openDetailModal } from './detailModal.js';
import { openSwitchConfirm } from './confirmModal.js';
import { showSaveConfirmationToast } from './toast.js';

// ===== ADD-MODAL WIZARD STATE (screen 'category' → 'review') =====
let _wizardScreen = 'category';    // which screen is currently visible — drives what the back icon does
let _wizardResults = [];           // last-rendered title-search results, indexed for click-to-select
let _wizardFetchedImageUrl = null; // image resolved from a title-search selection / background enrichment; merged into item.imageUrl at save time only if the user hasn't typed a manual override
let _wizardToken = 0;              // bumped on every open/close/back/advance — in-flight search or enrichment callbacks compare against this and no-op if stale
let _wizardFolderId = null;        // folder chosen on the folder-picker screen (null = "No folder")
let _wizardHadFolderScreen = false; // whether the current category actually showed a folder screen — drives Back navigation
let _wizardHadMusicChoiceScreen = false; // whether the combined "Music" tile's Musician/Album sub-choice screen was shown — drives Back navigation
let _wizardSelectedListIds = new Set(); // saved lists (other than the always-on "All My Saves") picked on the review screen's saved-lists dropdown — reset fresh each time showReviewScreen runs

// The modal's single shared h2 — every wizard screen-transition function below re-labels this same
// element rather than each screen owning its own heading. Cached once (static element, never
// removed/replaced) instead of re-querying it on every classList/innerHTML touch.
const _modalH2 = document.querySelector('#modal-overlay h2');
// Same caching rationale as _modalH2 above — toggled by openEditModal/openAddModal below for the
// Edit-flow-only width override (addEditModal.css's .modal--edit-item).
const _modalEl = document.querySelector('#modal-overlay .modal');
// The four classes that track "which screen is the heading currently styled for" — mutually
// exclusive, so every screen transition needs to clear all of them before applying (at most) its
// own. .modal-h2--left (Edit's own alignment tweak) is a separate, orthogonal concern and not part
// of this set.
const MODAL_H2_SCREEN_CLASSES = ['modal-h2--folder-offset', 'modal-h2--music-offset', 'modal-h2--review-title', 'modal-h2--category-screen'];
function setModalHeading(html, screenClass) {
  _modalH2.classList.remove(...MODAL_H2_SCREEN_CLASSES);
  if (screenClass) _modalH2.classList.add(screenClass);
  _modalH2.innerHTML = html;
}

// Words whose plural doesn't singularize by the generic suffix rule below (SINGULARIZE_SUFFIX),
// either because it's already invariant ("Web Series"/"Series"/"News") or because the "-ies" rule
// would misfire on a word that just happens to end in "-ies" without being a "-y" plural ("Movies"
// is "Movie" + "s", not "Movy" + "ies"). Keyed exactly as the folder/category name appears.
const SINGULARIZE_OVERRIDES = { 'Movies': 'Movie', 'Web Series': 'Web Series', 'Series': 'Series', 'News': 'News', 'PDFs': 'PDF' };
// Review screen's title reads "Add <folder/category>" (e.g. "Add Podcast") instead of the plural
// folder/category name as-is, per request. Handles the common English plural suffixes for the
// current (and any future, user-created) folder names; anything that doesn't fit those rules
// falls back to SINGULARIZE_OVERRIDES or, failing that, is left unchanged.
function singularize(name) {
  if (!name) return name;
  if (SINGULARIZE_OVERRIDES[name]) return SINGULARIZE_OVERRIDES[name];
  if (/ies$/i.test(name)) return name.slice(0, -3) + 'y';
  if (/[^s]s$/i.test(name)) return name.slice(0, -1);
  return name;
}

// Review screen's own "Add …" heading markup — factored out so backToReviewScreen can rebuild it
// fresh on the way back from the Lists Explainer, the same way every other back-nav function
// recomputes its heading from current wizard state rather than snapshotting/restoring raw HTML.
function reviewTitleHtml() {
  // The chosen folder (e.g. "News") is more specific/useful here than the category name — falls
  // back to the category (e.g. "Sources") when no folder was chosen (categories with 0 or 1
  // folders skip the folder-picker screen entirely, per showFolderScreenOrSkip).
  const chosenFolder = _wizardFolderId ? state.folders.find(f => f.id === _wizardFolderId) : null;
  const reviewTitleName = singularize(chosenFolder?.name || CAT_LABEL[state.modalCategory] || state.modalCategory || '');
  return `<span class="modal-category-title">${escapeHtml(reviewTitleName ? `Add ${reviewTitleName}` : '')}</span>`;
}

// Show's iTunes search (real artwork/year inline) runs first; Wikipedia is only queried as a
// fallback when iTunes has nothing, for the shows its TV catalog doesn't cover — same "search
// through Wikipedia the way Movie does" coverage, without losing iTunes's richer results when it
// does have a match.
async function searchShowsWithFallback(term) {
  let results = [];
  try { results = await searchShows(term); } catch { results = []; }
  if (results.length > 0) return results;
  try { return await searchShowsWikipedia(term); } catch { return []; }
}

// Musician added per direct request — searchMusicians (api.js) already existed for this (iTunes
// musicArtist lookup) but wasn't wired in here yet. Its background Wikipedia lookup
// (kickOffTitleEnrichment) still runs the same as before on the picked name, filling in bio/photo;
// the search step now also fills the URL field from the picked result, same as every other
// category below. Visual Art/Web Links/News have no search source at all.
const TITLE_SEARCH_FN = {
  Musician: searchMusicians,
  'Music Album': searchMusicAlbums,
  Show: searchShowsWithFallback,
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

  // #input-url's .form-group is a permanent sibling of #image-url-group inside .form-row--url-pair
  // (hidden just above, isSimple-only) — .form-row--url-pair's own CSS (addEditModal.css) sizes
  // both fields compactly assuming they're shown side by side. With Image URL hidden, URL is left
  // alone in the row but still carries that compact sizing, reading visibly shorter than the
  // Title field above it (reported live, screenshotted twice now: "make both these fields the
  // same height"). This class lets that CSS rule size the lone field normally instead, matching
  // Title's own sizing, only when it's actually alone.
  document.getElementById('input-url').closest('.form-row--url-pair')
    .classList.toggle('form-row--url-pair--single', isSimple);
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
  // where it was living coming in. REAL BUG, found and fixed: this ran unconditionally, including
  // for Music categories — where #youtube-url-group is never a descendant of `list` to begin with
  // (the guard just below keeps it out), so it's not rescuing anything there; it was instead
  // yanking the field straight out of #music-url-pair-row (where updateVideoUrlLayout, called
  // just before this, had correctly placed it), undoing that layout every single time this ran.
  if (!MUSIC_URL_PAIR_CATEGORIES.has(cat)) {
    document.getElementById('modal-step2').appendChild(document.getElementById('youtube-url-group'));
  }
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
// "Articles" is the opposite kind of shortcut: not a category at all (no CATEGORIES entry, no
// sidebar tab) — just Web Links' "Articles" folder, given its own tile so saving an article
// skips both the Websites tile and the folder-picker screen.
function renderCategoryTiles() {
  const grid = document.getElementById('step1-category-grid');
  const tiles = CATEGORIES.filter(cat => cat !== 'Music Album').map(cat => cat === 'Musician' ? `
    <button type="button" class="step1-category-tile" data-category="__music__">
      <span class="cat-icon">${CAT_EMOJI['Music Album'] || ''}</span>
      <span class="step1-category-tile-label">Music</span>
    </button>` : `
    <button type="button" class="step1-category-tile" data-category="${cat}">
      <span class="cat-icon">${CAT_EMOJI[cat] || ''}</span>
      <span class="step1-category-tile-label">${CAT_LABEL[cat] || cat}</span>
    </button>`);
  // Inserted right after Websites (index 0) — reads naturally next to the tile it's a shortcut off of.
  tiles.splice(1, 0, `
    <button type="button" class="step1-category-tile" data-category="__articles__">
      <span class="cat-icon">${folderIconHtml('default-weblinks-articles', 28)}</span>
      <span class="step1-category-tile-label">Articles</span>
    </button>`);
  grid.innerHTML = tiles.join('');
}

export function selectStep1Category(cat) {
  document.querySelectorAll('.step1-category-tile').forEach(t =>
    t.classList.toggle('selected', t.dataset.category === cat));

  if (cat === '__music__') {
    showMusicChoiceScreen();
    return;
  }
  if (cat === '__articles__') {
    state.modalCategory = 'Web Links';
    document.getElementById('modal-category').value = 'Web Links';
    _wizardHadFolderScreen = false;
    _wizardFolderId = 'default-weblinks-articles';
    showReviewScreen();
    return;
  }

  state.modalCategory = cat;
  document.getElementById('modal-category').value = cat;
  showFolderScreenOrSkip(cat);
}

// ===== SCREEN A-INFO: "Lists Explainer" (reached only from #modal-info-icon on the review/input
// screen — Add flow only, next to Select Lists, since that's what this actually explains) =====

export function showInfoScreen() {
  _wizardScreen = 'info';
  _wizardToken += 1;

  document.getElementById('modal-step2').style.display = 'none';
  document.getElementById('modal-info-icon').style.display = 'none';
  document.getElementById('saved-lists-wrap').style.display = 'none'; // review screen's own header control — not part of this screen
  document.getElementById('modal-step-info').style.display = '';
  document.getElementById('btn-modal-back').style.display = '';
  document.getElementById('btn-modal-save').style.display = 'none';
  setModalHeading('Lists Explainer');
}

// Leaving the explainer always returns to the review/input screen it can only be reached from —
// restores that screen's visibility/back-button/heading exactly as showReviewScreen does (heading
// rebuilt fresh via reviewTitleHtml(), same as every other back-nav function recomputes its own
// heading from current wizard state, rather than snapshotting/restoring raw HTML), but without
// showReviewScreen's own field-clearing reset, which would otherwise wipe out whatever the user
// had already typed before tapping the info icon. Named backTo*, not returnFrom*, to match every
// other back-navigation function's naming (backToFolderScreen etc.) — handleModalBack treats it
// identically to those.
function backToReviewScreen() {
  _wizardScreen = 'review';
  _wizardToken += 1;

  document.getElementById('modal-step-info').style.display = 'none';
  document.getElementById('modal-step2').style.display = '';
  document.getElementById('modal-info-icon').style.display = '';
  document.getElementById('saved-lists-wrap').style.display = '';
  document.getElementById('btn-modal-back').style.display = '';
  document.getElementById('btn-modal-save').style.display = '';
  setModalHeading(reviewTitleHtml(), 'modal-h2--review-title');
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
  document.getElementById('modal-info-icon').style.display = 'none';
  setModalHeading('<span class="modal-category-title">Music</span><span class="modal-heading-text">Choose a folder</span>', 'modal-h2--music-offset');

  // CAT_LABEL['Musician'] is "Music" (used for the combined top-level tile) — on this
  // specific sub-choice screen that duplicates the tile you just clicked, so it's overridden to
  // the singular "Musician" here only (mirrors the popup's own musicChoiceLabels).
  const musicChoiceLabels = { Musician: 'Musician', 'Music Album': CAT_LABEL['Music Album'] };
  const grid = document.getElementById('step1-music-choice-grid');
  grid.innerHTML = ['Musician', 'Music Album'].map(cat => `
    <button type="button" class="step1-category-tile${folderTileIsOneLine(musicChoiceLabels[cat] || cat) ? ' step1-category-tile--one-line' : ''}" data-category="${cat}">
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

// Folder tiles wrap naturally now (see #step1-folder-grid .step1-category-tile-label in
// addEditModal.css), but for the common two-word case ("Music Videos", "Book Club") that still
// left the wrap point up to the browser, which doesn't always break exactly between the two words
// depending on how much room the tile has. This forces it explicitly — the second word always
// lands on its own second line — per request. Three+ word (or single-word) names are left to wrap
// naturally, same as before; a forced break only reads as intentional for exactly two words.
// "Web Series" specifically stays on one line — short enough to fit without the forced break
// below, unlike the two-word names that motivated it (Board/Console/Mobile Games, Game
// Companies), so it just reads as an odd short wrap rather than a helpful one (reported live).
const FOLDER_TILE_NO_FORCED_BREAK = new Set(['Web Series']);
function folderTileLabelHtml(name) {
  const words = name.trim().split(/\s+/);
  if (words.length === 2 && !FOLDER_TILE_NO_FORCED_BREAK.has(name.trim())) {
    return `${escapeHtml(words[0])}<br>${escapeHtml(words[1])}`;
  }
  return escapeHtml(name);
}

// A one-line label's icon+text sit noticeably higher than a two-line label's own (both centered
// within the same fixed-height tile, but a shorter content block reads as riding higher, not
// truly centered, once there's a taller sibling tile to compare it against — reported live).
// Class-driven rather than baked into the shared tile padding, since it's specifically the
// one-line case (not just "shorter than two lines" in general, e.g. three+ word names that
// happen to wrap onto one line anyway) that needed the nudge. Word count alone isn't quite the
// right test any more, now that FOLDER_TILE_NO_FORCED_BREAK (above) can keep a two-word name like
// "Web Series" on one line too — that name still needs this same nudge (reported live: "apply
// this to webseries as well — it is still on one line"), so it's checked here as well.
function folderTileIsOneLine(name) {
  return name.trim().split(/\s+/).length === 1 || FOLDER_TILE_NO_FORCED_BREAK.has(name.trim());
}

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
  document.getElementById('modal-info-icon').style.display = 'none';
  const isNews = cat === 'News';
  setModalHeading(`<span class="modal-category-title">${escapeHtml(CAT_LABEL[cat] || cat)}</span><span class="modal-heading-text">${isNews ? 'Choose a source' : 'Choose a folder'}</span>`, 'modal-h2--folder-offset');

  // No "Skip" — a folder must always be picked; there is no path to the review screen without one.
  const grid = document.getElementById('step1-folder-grid');
  grid.innerHTML = folders.map(f => `
    <button type="button" class="step1-category-tile${folderTileIsOneLine(f.name) ? ' step1-category-tile--one-line' : ''}" data-folder-id="${f.id}">
      <span class="cat-icon">${folderIconHtml(f.id, 28)}</span>
      <span class="step1-category-tile-label">${folderTileLabelHtml(f.name)}${f.paywalled ? ' <span class="step1-paywalled-badge">Paywalled</span>' : ''}</span>
    </button>`).join('');

  grid.querySelectorAll('.step1-category-tile').forEach(t => {
    t.addEventListener('click', () => selectStep1Folder(t.dataset.folderId || null));
  });

  const addFolderLink = document.getElementById('step1-add-folder-link');
  // Was shown for Visual Art only (the one category that had it enabled at all) — removed per
  // request, so it's hidden unconditionally now rather than just no longer matching any category.
  addFolderLink.style.display = 'none';
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

// ===== Saved-lists dropdown — Add flow's review screen (header pill, #saved-lists-wrap) AND
// Edit's own field row (#edit-saved-lists-wrap, per direct request) share this one render function,
// just targeting different options-container ids, rather than each hand-rolling its own copy of
// the same checkbox markup/wiring. =====
// Same checkbox-multi-select model as the detail modal's "Save to:" menu (detailModalHeader.js).
// Add: nothing persisted per click, just tracked in _wizardSelectedListIds until Save builds the
// new item. Edit: same tracking, but openEditModal seeds _wizardSelectedListIds from the item's
// existing savedListIds first, and handleSaveItem's edit branch writes the (possibly changed)
// selection back onto the item on Update.
function renderSavedListsCheckboxes(optionsElId) {
  const options = document.getElementById(optionsElId);
  options.innerHTML = state.savedLists.map(list => {
    const isFavorites = list.id === 'default-favorites';
    const checked = isFavorites || _wizardSelectedListIds.has(list.id);
    return `
    <label class="platform-option saved-list-option${isFavorites ? ' saved-list-option--locked' : ''}">
      <span class="saved-list-option-name">${escapeHtml(list.name)}</span>
      <input type="checkbox" data-list-id="${escapeHtml(list.id)}" ${checked ? 'checked' : ''} ${isFavorites ? 'disabled' : ''} />
    </label>`;
  }).join('');

  options.querySelectorAll('input[type="checkbox"]:not(:disabled)').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) _wizardSelectedListIds.add(cb.dataset.listId);
      else _wizardSelectedListIds.delete(cb.dataset.listId);
      updateSavedListsSummaryText();
    });
  });

  updateSavedListsSummaryText();
}

function renderSavedListsDropdown() {
  renderSavedListsCheckboxes('saved-lists-options');
}

function renderEditSavedListsDropdown() {
  renderSavedListsCheckboxes('edit-saved-lists-options');
}

function updateSavedListsSummaryText() {
  // "Select Lists", not "All My Saves" — that's really just the locked first row inside the list
  // itself (always on, not a real choice), not a fitting label for the collapsed button that opens
  // it (reported live). Static label, no selected-count suffix — the checkmarks inside the open
  // dropdown are enough, no need to surface that count on the closed button too (reported live).
  document.getElementById('saved-lists-summary-text').textContent = 'Select Lists';
}

// #saved-lists-wrap closing on outside click (native <details> doesn't do this on its own) is
// handled by the generic "close any open .platform-dropdown" listener in main.js — it already
// existed for #platform-dropdown (the Platforms field's own dropdown), and #saved-lists-wrap
// carries that same .platform-dropdown class, so no separate listener is needed here.

// Save button stays disabled (grayed out, via .btn-primary:disabled) until the user has entered
// at least a title or a URL, per request — re-run on every keystroke in either field (registered
// once at module scope so repeated Add-modal opens don't stack up duplicate listeners) and also
// called directly from showReviewScreen/openEditModal so it starts in the right state for
// whatever's already in the fields (blank for a fresh Add, pre-filled for Edit). Refs cached once
// — these inputs/button are static, never removed/replaced, so there's no need to re-look them up
// on every keystroke.
const _saveBtnTitleInput = document.getElementById('input-title');
const _saveBtnUrlInput = document.getElementById('input-url');
const _saveBtnEl = document.getElementById('btn-modal-save');
function updateSaveButtonEnabled() {
  _saveBtnEl.disabled = !_saveBtnTitleInput.value.trim() && !_saveBtnUrlInput.value.trim();
}
_saveBtnTitleInput.addEventListener('input', updateSaveButtonEnabled);
_saveBtnUrlInput.addEventListener('input', updateSaveButtonEnabled);

// ===== SCREEN B: review form (Title + URL, Title doubles as search for some categories) =====

function showReviewScreen() {
  _wizardScreen = 'review';
  _wizardToken += 1;

  document.getElementById('modal-step1').style.display = 'none';
  document.getElementById('modal-step-music-choice').style.display = 'none';
  document.getElementById('modal-step-folder').style.display = 'none';
  document.getElementById('modal-step2').style.display = '';
  document.getElementById('modal-info-icon').style.display = ''; // Add flow's review/input screen only, per request — next to Select Lists
  // Add flow shows the saved-lists picker here instead of the category select (Edit's own
  // category select is permanently hidden now regardless — see openEditModal's own comment) —
  // category is already established by the wizard screens you just came through, so showing it
  // as an editable field here would be redundant; letting you tag the new item into your own
  // saved lists at the same moment is more useful in this exact spot.
  document.getElementById('btn-modal-back').style.display = '';
  document.getElementById('btn-modal-save').style.display = '';
  document.getElementById('folder-select-group').style.display = 'none'; // Add flow assigns folder via the wizard screen, not this select
  _wizardSelectedListIds = new Set();
  renderSavedListsDropdown();
  const savedListsWrap = document.getElementById('saved-lists-wrap');
  savedListsWrap.style.display = '';
  savedListsWrap.open = false;
  // The chosen folder (e.g. "News") is more specific/useful here than the category name — falls
  // back to the category (e.g. "Sources") when no folder was chosen (categories with 0 or 1
  // folders skip the folder-picker screen entirely, per showFolderScreenOrSkip).
  // Centered in the heading instead of left-aligned next to the back arrow, per request — same
  // move as the "Choose a folder"/"Choose a source" screens' own category title just above.
  setModalHeading(reviewTitleHtml(), 'modal-h2--review-title');

  document.getElementById('input-title').value = '';
  document.getElementById('input-author').value = '';
  document.getElementById('input-summary').value = '';
  document.getElementById('input-image-url').value = '';
  document.getElementById('input-youtube-url').value = '';
  document.getElementById('input-url').value = '';
  updateSaveButtonEnabled();
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

  // Desktop only — on mobile this immediately opened the on-screen keyboard the moment the review
  // screen appeared, covering half the popup before the user had even seen the whole screen
  // (reported live: "I want the user to see the full screen ... and select what they want to add
  // for themselves"). Desktop has no on-screen keyboard to fight, so auto-focusing straight into
  // Title there is still just a convenience, not an obstruction.
  if (!window.matchMedia('(max-width: 480px)').matches) document.getElementById('input-title').focus();
}

// ===== BACK NAVIGATION =====
// Single back icon, top-left of the modal — steps back exactly one screen through the nested
// chain: category → [music-choice, only for the combined "Music" tile] → [folder, only if the
// category has folders] → review.
export function handleModalBack() {
  if (_wizardScreen === 'info') {
    backToReviewScreen();
  } else if (_wizardScreen === 'folder') {
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
  document.getElementById('folder-select-group').style.display = 'none';
  document.getElementById('saved-lists-wrap').style.display = 'none';
  document.getElementById('btn-modal-save').style.display = 'none';
  document.getElementById('modal-info-icon').style.display = 'none';
  setModalHeading(`<span class="modal-category-title">${escapeHtml(CAT_LABEL[state.modalCategory] || state.modalCategory || '')}</span><span class="modal-heading-text">Choose a folder</span>`, 'modal-h2--folder-offset');
  // Folder tiles/listeners are left exactly as rendered — non-destructive re-entry.
}

function backToMusicChoiceScreen() {
  _wizardScreen = 'music-choice';
  _wizardToken += 1;
  document.getElementById('modal-step2').style.display = 'none';
  document.getElementById('modal-step-folder').style.display = 'none';
  document.getElementById('modal-step-music-choice').style.display = '';
  document.getElementById('folder-select-group').style.display = 'none';
  document.getElementById('saved-lists-wrap').style.display = 'none';
  document.getElementById('btn-modal-save').style.display = 'none';
  document.getElementById('modal-info-icon').style.display = 'none';
  setModalHeading('<span class="modal-category-title">Music</span><span class="modal-heading-text">Choose a folder</span>', 'modal-h2--music-offset');
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
  document.getElementById('folder-select-group').style.display = 'none';
  document.getElementById('saved-lists-wrap').style.display = 'none';
  document.getElementById('btn-modal-back').style.display = 'none';
  document.getElementById('btn-modal-save').style.display = 'none';
  document.getElementById('modal-info-icon').style.display = 'none'; // review/input screen only now, per request — not this category screen
  setModalHeading(`${MODAL_BOOKMARK_ICON_SVG}What are you adding to?`, 'modal-h2--category-screen');
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
  el.style.display = '';
  // No hits (search actually ran, just found nothing) — rather than silently hiding, per direct
  // request: nudge the user toward the fallback that always works, adding the item straight from
  // its URL instead of a matched search result.
  if (results.length === 0) {
    el.innerHTML = `<div class="step1-search-no-results">No matches found. You can still add this by pasting its URL below.</div>`;
    return;
  }
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
  updateSaveButtonEnabled();
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

// Recursively orders a category's folders parent-then-children (each parent immediately followed
// by its own subfolders, indented) rather than one flat alphabetical list — a subfolder would
// otherwise sort wherever its own name happened to land, with nothing showing it belongs under
// its parent. depth 0 is a top-level folder; each level deeper adds another "— " prefix.
function _flattenFoldersForSelect(allFolders, category, parentFolderId = null, depth = 0) {
  const level = sortFoldersForDisplay(getChildFolders(allFolders, parentFolderId), category);
  return level.flatMap(f => [
    { folder: f, depth },
    ..._flattenFoldersForSelect(allFolders, category, f.id, depth + 1),
  ]);
}

// Edit-mode-only folder reassignment — the Add flow uses the dedicated wizard folder screen
// instead, so this is only ever called from openEditModal().
function populateFolderSelect(category, folderId) {
  const wrap = document.getElementById('folder-select-group');
  const select = document.getElementById('input-folder-select');
  const categoryFolders = state.folders.filter(f => f.parentCategory === category);
  if (categoryFolders.length === 0) {
    wrap.style.display = 'none';
    select.innerHTML = '';
    return;
  }
  const rows = _flattenFoldersForSelect(categoryFolders, category);
  wrap.style.display = '';
  select.innerHTML = `<option value="">No folder</option>` +
    rows.map(({ folder, depth }) => `<option value="${folder.id}">${'— '.repeat(depth)}${escapeHtml(folder.name)}</option>`).join('');
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
  document.getElementById('folder-select-group').style.display = 'none';
  document.getElementById('saved-lists-wrap').style.display = 'none';
  document.getElementById('edit-saved-lists-group').style.display = 'none'; // Edit-only — reset in case a prior Edit session left it visible
  _wizardSelectedListIds = new Set();
  hideTitleSearchResults();

  renderCategoryTiles();
  document.querySelectorAll('.step1-category-tile').forEach(t => t.classList.remove('selected'));

  document.getElementById('modal-step1').style.display = '';
  document.getElementById('modal-step-music-choice').style.display = 'none';
  document.getElementById('modal-step-folder').style.display = 'none';
  document.getElementById('modal-step2').style.display = 'none';
  document.getElementById('btn-modal-back').style.display = 'none';
  document.getElementById('btn-modal-save').style.display = 'none';
  document.getElementById('modal-info-icon').style.display = 'none'; // review/input screen only now, per request — not this category screen

  // Moves #btn-modal-save back into its normal spot at the bottom (#modal-actions) — a prior Edit
  // session may have relocated it into the header row instead (see openEditModal above).
  document.getElementById('modal-actions').appendChild(document.getElementById('btn-modal-save'));
  document.getElementById('modal-actions').style.display = '';

  _modalH2.classList.remove('modal-h2--left');
  _modalEl.classList.remove('modal--edit-item'); // reset — a prior Edit session may have left this on
  setModalHeading(`${MODAL_BOOKMARK_ICON_SVG}What are you adding to?`, 'modal-h2--category-screen');
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
  updateSaveButtonEnabled();
  document.getElementById('input-author').value = item.author || '';
  document.getElementById('input-summary').value = item.summary || '';
  document.getElementById('input-image-url').value = item.imageUrl || '';
  document.getElementById('input-youtube-url').value = item.youtubeUrl || '';
  setAddSimpleMode(false);
  updateTitleSearchUi(item.category, false);
  updateTitleAuthorLayout(item.category, item.folderId);
  updateVideoUrlLayout(item.category, item.folderId);
  // #modal-category-wrap itself is permanently hidden now (per direct request — "remove the
  // category drop down lists" from Edit Item), never shown/toggled here at all. Its value is
  // still kept in sync, though — handleSaveItem() reads #modal-category's own value on save,
  // Add and Edit alike. Folder's own visibility (#folder-select-group) is handled independently
  // by populateFolderSelect below, which hides it for categories with zero folders.
  document.getElementById('modal-category').value = item.category || '';
  document.getElementById('saved-lists-wrap').style.display = 'none'; // Add-only — see showReviewScreen's own comment
  // Edit's own Saved Lists field, per direct request — seeded from the item's current
  // savedListIds (not a fresh empty Set, unlike Add's own reset in openAddModal below) so the
  // dropdown opens showing what's actually already selected, not blank.
  _wizardSelectedListIds = new Set(item.savedListIds || []);
  document.getElementById('edit-saved-lists-group').style.display = '';
  renderEditSavedListsDropdown();
  updatePlatformsSection(item.category || '');
  if (item.platforms) setSelectedPlatforms(item.platforms);
  // No thumbnail preview on Edit Item itself, per request — the image still shows on the detail/
  // preview modal this screen's own new back arrow returns to (detailModal.js/.css, untouched by
  // this). renderStep2ImagePreview(null) (not item.imageUrl) keeps #step2-image-preview-wrap
  // hidden rather than just skipping the call, in case a prior Add-flow screen left it visible.
  renderStep2ImagePreview(null);
  populateFolderSelect(item.category, item.folderId);

  document.getElementById('modal-step1').style.display = 'none';
  document.getElementById('modal-step-music-choice').style.display = 'none';
  document.getElementById('modal-step-folder').style.display = 'none';
  document.getElementById('modal-step2').style.display = '';
  document.getElementById('modal-info-icon').style.display = 'none';
  // Edit has no wizard screen history of its own, but the same corner icon still doubles as "back
  // to this item's preview" here (main.js's own #btn-modal-back click handler special-cases
  // state.editingId to go there instead of calling handleModalBack), per direct request.
  document.getElementById('btn-modal-back').style.display = '';
  document.getElementById('btn-modal-save').style.display = '';

  _modalH2.classList.add('modal-h2--left');
  // Matches .modal.detail-modal's own width (addEditModal.css) — reported live: opening Edit from
  // the detail modal's pencil icon visibly resized the popup wider, since the shared .modal is
  // wider by default for the wizard's other screens (category tiles, folder picker).
  _modalEl.classList.add('modal--edit-item');
  setModalHeading('Edit Item'); // no bookmark icon here, per request — Add flow's own "What are you adding to?" keeps it
  document.getElementById('btn-modal-save').textContent = 'Save'; // not "Update" — per direct request

  // Relocates the shared #btn-modal-save button into the header row itself (the category select
  // used to sit here — it's since moved to its own row next to Folder, see above) instead of
  // leaving it at the bottom, per direct request. #modal-actions (now empty) is hidden too, rather
  // than left as a stray blank gap. openAddModal is where this gets moved back for the next real
  // Add-flow entry — same "shared node relocated via appendChild" technique updateVideoUrlLayout already
  // uses for #platforms-section/#youtube-url-group.
  document.getElementById('modal-header').appendChild(document.getElementById('btn-modal-save'));
  document.getElementById('modal-actions').style.display = 'none';

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

  // Duplicate guard, per direct request — same URL already saved in this exact folder (not just
  // anywhere in the library) blocks the save entirely rather than silently creating a second copy.
  // Excludes the item currently being edited so re-saving it without changing its own URL/folder
  // doesn't flag itself. folderId matches null-to-null too, so this also catches duplicates among
  // un-foldered items within the same category.
  // REAL BUG, found and fixed: this compared folderId by strict equality, but
  // matchesPrimaryOrUnfoldered() (renderFilters.js) — the function every grid/count view actually
  // uses to decide what shows "in" a category's primary folder — treats an unfoldered item
  // (folderId: null) and one explicitly filed in that category's own primary folder as the SAME
  // thing for display purposes. So saving the same URL once unfoldered and once explicitly into
  // the primary folder (e.g. Web Links' "Websites") slipped past this guard (null !== the primary
  // folder's real id) even though both then rendered together as apparent duplicates (reported
  // live). normalizeFolderId below collapses that same "unfoldered or the category's own primary
  // folder" pair to one value before comparing, matching what actually shows up as duplicates on
  // screen. Also now scoped to the same category — two different categories sharing a null
  // (unfoldered) folderId was never really the same duplicate.
  if (url) {
    const primaryId = PRIMARY_FOLDER_ID[category];
    const normalizeFolderId = fid => (primaryId && (fid === primaryId || !fid)) ? primaryId : fid;
    const duplicate = state.items.find(i =>
      i.id !== state.editingId && i.url === url && i.category === category &&
      normalizeFolderId(i.folderId) === normalizeFolderId(folderId));
    if (duplicate) {
      // Real in-app popup instead of a native confirm(), per direct request — this runs before
      // #btn-modal-save is ever disabled/set to "Saving..." below, so there's nothing to reset
      // here. Cancel just closes the popup and leaves the Add/Edit form as-is (matching
      // confirm()'s own "Cancel" behavior); "View Item" closes this modal and opens the existing
      // card's detail view instead.
      openSwitchConfirm({
        name: 'Already Saved',
        subtitle: `"${duplicate.title || 'Untitled'}" is already saved with this URL.`,
        openLabel: 'View Item',
        onConfirm: () => {
          closeAddModal();
          openDetailModal(duplicate);
        },
      });
      return;
    }
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
    // savedListIds: [..._wizardSelectedListIds] — Edit's own Saved Lists field (openEditModal
    // seeds this Set from the item's existing savedListIds), per direct request. favorite isn't
    // touched here — it stays whatever it already was via the ...existing spread, same as every
    // other untouched field.
    item = { ...existing, url, title, author, summary, imageUrl: manualImageUrl, youtubeUrl, category, folderId, platforms, savedListIds: [..._wizardSelectedListIds] };
    const idx = state.items.findIndex(i => i.id === state.editingId);
    if (idx >= 0) state.items[idx] = item;
  } else {
    item = {
      id: Date.now().toString(), url, title, author, summary,
      imageUrl: manualImageUrl || _wizardFetchedImageUrl || null, youtubeUrl, description: null,
      category, folderId, platforms, done: false, savedAt: Date.now(),
      // favorite: true — "All My Saves" (default-favorites) is always on for a new save, same as
      // its checkbox on the review screen's saved-lists dropdown always showing checked and
      // locked. savedListIds carries whatever other lists were also picked there (see
      // renderSavedListsDropdown/_wizardSelectedListIds above) — same fields the detail modal's
      // own "Save to:" menu already reads/writes for an existing item.
      favorite: true, savedListIds: [..._wizardSelectedListIds],
    };
    // REAL BUG, found and fixed: this branch built `item` and persisted it to storage below, but
    // never added it to the in-memory state.items array the way the other two branches above do
    // (state.items.push/state.items[idx]=) — persistItem() only writes to storage, it doesn't
    // touch state.items itself. The save silently "worked" (item.reappeared after a reload, since
    // loadAll() re-reads storage) but the renderGrid()/renderSidebar() calls right after this
    // function used the still-unchanged in-memory array, so a brand-new item never actually
    // appeared anywhere in the current session (reported live: "it didn't save").
    state.items.push(item);
  }

  await persistItem(item);
  saveBtn.disabled = false;
  saveBtn.textContent = 'Save';
  closeAddModal();
  renderSidebar();
  renderGrid();
  showSaveConfirmationToast(item);

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
  // REAL BUG, found and fixed: iTunes often lists a live album twice — once as the audio album,
  // once as a "(Video Album)" edition of the exact same release (reported live: "Uprising Live!
  // (Live)" and "Uprising Live! (Video Album)" both auto-imported for Bob Marley) — different
  // titles, so the Singles/EPs exclusion below never caught it, and this path has no review step
  // (unlike fetchAlbumsModal.js's manual picker, where showing both is fine — the user can just
  // leave the one they don't want unchecked) to let the user drop the redundant one themselves.
  const fullAlbums = albums.filter(a =>
    a.artist?.toLowerCase() === lowerName &&
    a.type !== 'Single' &&
    !/\s[-–]\s*(single|ep)\s*$/i.test(a.title) &&
    !/\(video album\)\s*$/i.test(a.title)
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
