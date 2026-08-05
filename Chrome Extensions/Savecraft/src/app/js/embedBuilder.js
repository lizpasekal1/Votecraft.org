// ===== EMBED BUILDER =====
// Full-screen in-extension page (state.view === 'embed-builder') for building a customizable
// slider/carousel of specific assets, for embedding on an external website via an <iframe>
// snippet — opened from the Share dropdown's "Embed options" button (share.js). One screen
// throughout, not a wizard: the Assets panel itself walks through picking a source in place
// (categories -> a whole section or one of its individual folders -> OR a hand-picked Custom
// Slider), then morphs into the real asset list once a source is finalized. The style panel and
// live preview sit alongside it the whole time. The category/folder tiles reuse the exact visual
// language of the Add Item wizard's own first two screens (addEditModal.js's
// renderCategoryTiles()/showFolderScreen()/.step1-category-tile) so picking a slider's source
// feels like picking a folder to save into, not a separate new pattern — the top-level grid
// drops the wizard's own "Articles" shortcut (still reachable one level down, as an ordinary
// folder under Sources) and appends a "Custom Slider" tile last instead. Phase 1 (this
// file, initial version): fully client-side — checkbox include/exclude, drag-to-reorder, a style
// panel, and a live carousel preview reusing dashboard.js's _wireCarouselArrows. Nothing persists
// yet; closing the page discards the in-progress config. Firestore persistence (a public,
// sign-in-gated "savecraft_embeds" doc per embed) + a "Your Embeds" section on the Profile page,
// plus the actual hosted public embed.html rendering page and its generated <iframe> snippet, are
// a deliberately separate follow-up phase.

import { state, CATEGORIES, CAT_LABEL, CAT_EMOJI, PRIMARY_FOLDER_ID } from './state.js';
import { escapeHtml, folderIconHtml, sortFoldersForDisplay } from './utils.js';
import { renderSidebar, renderGrid } from './render.js';
import { matchesPrimaryOrUnfoldered } from './renderFilters.js';
import { _wireCarouselArrows } from './dashboard.js';

// A curated list rather than a free-text field — arbitrary font names would just silently fall
// back to the visitor's default if not installed, since the embed is a static page with no font
// loading of its own (see the Phase 3 note on savecraft/embed.html at the top of this file).
// These are the classic cross-platform "web safe" stack, each with its own generic-family
// fallback chain. Declared up here, before any module-level state that reads it (specifically
// _defaultStyleOptions(), called immediately below to seed _styleOptions) — a const declared
// later in the file is in the temporal dead zone until its own line runs, so referencing it from
// a function called before that point throws, even though the function itself is hoisted.
const WEB_SAFE_FONTS = [
  { value: 'inherit', label: 'Default (matches SaveCraft)' },
  { value: 'Arial, Helvetica, sans-serif', label: 'Arial' },
  { value: '"Helvetica Neue", Helvetica, Arial, sans-serif', label: 'Helvetica' },
  { value: 'Verdana, Geneva, sans-serif', label: 'Verdana' },
  { value: 'Tahoma, Geneva, sans-serif', label: 'Tahoma' },
  { value: '"Trebuchet MS", Helvetica, sans-serif', label: 'Trebuchet MS' },
  { value: 'Georgia, "Times New Roman", serif', label: 'Georgia' },
  { value: '"Times New Roman", Times, serif', label: 'Times New Roman' },
  { value: '"Courier New", Courier, monospace', label: 'Courier New' },
];

// state.view at the moment "Embed options" was clicked — where the Builder returns to when
// closed via the header's back arrow (its only exit, since this isn't a modal).
let _returnViewKey = null;

// Which layer of the Assets panel's own source-picking flow is showing, while _sourceViewKey is
// still null: 'categories' (top-level tile grid) -> 'folders' (one category's own subfolders,
// plus a "All X" tile) or 'custom' (hand-picked cross-category list). Reset to 'categories'
// once a source is finalized (below) or the panel is sent "back" to it.
let _pickerScreen = 'categories';
let _pickerCategory = null; // which category's folders 'folders' is currently showing

// In-progress picks while building a Custom Slider — separate from _selectedIds/_orderedIds
// (below) until "Use this list" finalizes them, since Custom Slider starts opt-in (nothing
// checked) rather than the opt-out default (everything checked) a folder/section source gets.
let _customSelectedIds = new Set();
let _customSearch = '';

// The chosen embed source once finalized — a category (e.g. "Literature"), the synthetic
// "__music__" union of Musician + Music Album, a specific folder id, or "__custom__" for a
// hand-picked Custom Slider. Null until then, at which point the Assets panel swaps from the
// tile grid to the real asset list in place.
let _sourceViewKey = null;
let _sourceLabel = '';
let _sourceItems = [];

// The Builder's own in-progress config — kept separate from state.items entirely (Phase 1 has
// no persistence, so there's nothing to write back yet).
let _selectedIds = new Set();
let _orderedIds = [];
let _styleOptions = _defaultStyleOptions();

function _defaultStyleOptions() {
  return {
    visibleSlides: 3,
    slideMargin: 12, // px gap between slides — capped 4-50px (see the "Slide spacing" control
                      // below), not a free-form input, so this can't be pushed to something that
                      // breaks the layout
    fontFamily: WEB_SAFE_FONTS[0].value,
    autoplay: false,
    autoplaySpeed: 4,
    navStyle: 'arrows', // 'arrows' | 'dots' | 'both'
    theme: 'light',     // preview-only theme, independent of the extension's own active theme
    aspectRatio: 'square', // 'square' | 'wide' | 'tall'
    showBranding: true,
  };
}

// Drag-reorder state for the asset list — same before/after-cursor-position pattern as
// kanban.js's per-card dragover tracking (see its dragstart/dragover/drop wiring), just for one
// flat list instead of columns.
let _dragId = null;
let _dropTargetId = null;
let _dropPosition = null; // 'before' | 'after'

let _autoplayTimer = null;

export function openEmbedBuilder() {
  _returnViewKey = state.view;
  _pickerScreen = 'categories';
  _pickerCategory = null;
  _customSelectedIds = new Set();
  _customSearch = '';
  _sourceViewKey = null;
  _sourceLabel = '';
  _sourceItems = [];
  _selectedIds = new Set();
  _orderedIds = [];
  _styleOptions = _defaultStyleOptions();
  _dragId = null;
  _dropTargetId = null;
  _dropPosition = null;

  // No persistViewState() here, deliberately — same convention every other pseudo-view
  // (dashboard/profile/shared) already follows, so a reload never strands the user on an
  // orphaned builder view with no return scope.
  state.view = 'embed-builder';
  renderGrid();
}

function _closeEmbedBuilder() {
  if (_autoplayTimer) { clearInterval(_autoplayTimer); _autoplayTimer = null; }
  state.view = _returnViewKey || 'all';
  renderSidebar();
  renderGrid();
}

// Sorted newest-first — exact order doesn't matter much since the asset list is manually
// reorderable anyway. Shared by both "whole section"/"__music__" finalization and the individual-
// folder one below.
function _sortNewestFirst(items) {
  return [...items].sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
}

// Finalizes a whole-category (or the synthetic "__music__" union of Musician + Music Album)
// source — categories reuse matchesPrimaryOrUnfoldered (the same "primary folder or unfoldered"
// rule the sidebar's own category tabs use). The wizard's combined "Music" tile skips its own
// Musician-vs-Album sub-choice screen here — a mixed slider is a reasonable default and keeps
// this to one tap.
function _selectSectionSource(cat) {
  const items = cat === '__music__'
    ? state.items.filter(i => matchesPrimaryOrUnfoldered(i, 'Musician') || matchesPrimaryOrUnfoldered(i, 'Music Album'))
    : state.items.filter(i => matchesPrimaryOrUnfoldered(i, cat));
  _sourceViewKey = cat;
  _sourceLabel = cat === '__music__' ? 'Music' : (CAT_LABEL[cat] || cat);
  _finalizeSource(_sortNewestFirst(items));
}

// Finalizes one specific folder within a category — the folder's own primary-folder-ness (does
// it represent "the whole category", like clicking a primary folder directly in the sidebar does)
// decides whether it matches matchesPrimaryOrUnfoldered's broader rule or just its own folderId.
function _selectFolderSource(folderId) {
  const folder = state.folders.find(f => f.id === folderId);
  if (!folder) return;
  const isPrimary = PRIMARY_FOLDER_ID[folder.parentCategory] === folder.id;
  const items = isPrimary
    ? state.items.filter(i => matchesPrimaryOrUnfoldered(i, folder.parentCategory))
    : state.items.filter(i => i.folderId === folderId);
  _sourceViewKey = folderId;
  _sourceLabel = folder.name;
  _finalizeSource(_sortNewestFirst(items));
}

// Finalizes a hand-picked Custom Slider — unlike the two above, starts from exactly what the user
// already checked in the custom picker (_customSelectedIds), not "everything, opt-out".
function _selectCustomSource() {
  if (!_customSelectedIds.size) return;
  const ids = [..._customSelectedIds];
  const byId = new Map(state.items.map(i => [i.id, i]));
  _sourceViewKey = '__custom__';
  _sourceLabel = 'Custom Slider';
  _sourceItems = ids.map(id => byId.get(id)).filter(Boolean);
  _selectedIds = new Set(ids);
  _orderedIds = [...ids];
  _styleOptions = _defaultStyleOptions();
  _pickerScreen = 'categories';
  _customSelectedIds = new Set();
  _customSearch = '';
  renderEmbedBuilder();
}

// Shared tail of _selectSectionSource/_selectFolderSource — both start opt-out (everything
// selected), unlike _selectCustomSource above.
function _finalizeSource(items) {
  _sourceItems = items;
  _selectedIds = new Set(items.map(i => i.id));
  _orderedIds = items.map(i => i.id);
  _styleOptions = _defaultStyleOptions();
  _pickerScreen = 'categories';
  _pickerCategory = null;
  renderEmbedBuilder();
}

// Lets the user pick a different source without leaving the Builder entirely — sends the Assets
// panel back to its own top-level tile grid, in place.
function _changeSource() {
  _sourceViewKey = null;
  _sourceLabel = '';
  _sourceItems = [];
  _selectedIds = new Set();
  _orderedIds = [];
  _pickerScreen = 'categories';
  _pickerCategory = null;
  renderEmbedBuilder();
}

function _orderedSelectedItems() {
  const byId = new Map(_sourceItems.map(i => [i.id, i]));
  return _orderedIds.filter(id => _selectedIds.has(id)).map(id => byId.get(id)).filter(Boolean);
}

export function renderEmbedBuilder() {
  const container = document.getElementById('cards-grid');
  document.getElementById('grid-title').style.display = 'none';
  document.getElementById('sort-select').style.display = 'none';
  document.querySelector('.grid-header').style.display = 'none';
  container.className = 'embed-builder-page-wrap';

  const subtitle = _sourceViewKey !== null
    ? `Building a slider from <strong>${escapeHtml(_sourceLabel)}</strong>`
    : 'Pick which of your saved folders to build a slider from.';

  container.innerHTML = `
    <div class="embed-builder-page">
      ${_buildHeaderHtml('Embed options', subtitle)}
      <div class="embed-builder-body">
        ${_buildAssetsPanelHtml()}
        ${_buildStylePanelHtml()}
      </div>
      <div class="embed-builder-preview-section">
        <div class="embed-builder-panel-title">Live preview</div>
        <div class="embed-builder-preview" id="embed-builder-preview"></div>
      </div>
    </div>
  `;

  _wireHeader(container);
  _wireAssetsPanel(container);
  _wireStylePanel(container);
  _renderPreview();
}

// ===== header =====

// subtitleHtml is trusted, pre-escaped markup (built by renderEmbedBuilder() above, which already
// escapeHtml()s any user/data-derived text before interpolating it in) — not raw user input.
function _buildHeaderHtml(title, subtitleHtml) {
  return `
    <div class="embed-builder-header">
      <button class="embed-builder-back" id="embed-builder-back" title="Back">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <div class="embed-builder-title">
        <h1>${escapeHtml(title)}</h1>
        <p>${subtitleHtml}</p>
      </div>
    </div>`;
}

// Always closes the whole Builder — going back within the Assets panel's own source-picking flow
// (categories -> folders/custom, or changing an already-finalized source) has its own dedicated
// links inside the panel instead (see _wireAssetsPanel below), so this stays a single, consistent
// "leave the Builder" action throughout.
function _wireHeader(container) {
  container.querySelector('#embed-builder-back').addEventListener('click', _closeEmbedBuilder);
}

// ===== assets panel: source-picking (categories -> folders/custom) or the real asset list =====

function _buildAssetsPanelHtml() {
  if (_sourceViewKey !== null) return _buildAssetListHtml();
  if (_pickerScreen === 'folders') return _buildFolderPickerHtml();
  if (_pickerScreen === 'custom') return _buildCustomPickerHtml();
  return _buildCategoryPickerHtml();
}

function _wireAssetsPanel(container) {
  if (_sourceViewKey !== null) { _wireAssetList(container); return; }
  if (_pickerScreen === 'folders') { _wireFolderPicker(container); return; }
  if (_pickerScreen === 'custom') { _wireCustomPicker(container); return; }
  _wireCategoryPicker(container);
}

// Top-level tile grid, mirroring the Add Item wizard's own first screen (addEditModal.js's
// renderCategoryTiles()/.step1-category-tile) — same categories, same combined "Music" tile, but
// without the wizard's own "Articles" shortcut (still reachable one level down, as an ordinary
// folder under Sources) and with a "Custom Slider" tile appended last instead.
function _buildCategoryPickerHtml() {
  const tiles = CATEGORIES.filter(cat => cat !== 'Music Album').map(cat => cat === 'Musician' ? `
    <button type="button" class="step1-category-tile" data-category="__music__">
      <span class="cat-icon">${CAT_EMOJI['Music Album'] || ''}</span>
      <span class="step1-category-tile-label">Music</span>
    </button>` : `
    <button type="button" class="step1-category-tile" data-category="${escapeHtml(cat)}">
      <span class="cat-icon">${CAT_EMOJI[cat] || ''}</span>
      <span class="step1-category-tile-label">${escapeHtml(CAT_LABEL[cat] || cat)}</span>
    </button>`);
  tiles.push(`
    <button type="button" class="step1-category-tile" data-custom-slider="true">
      <span class="cat-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5B5BEF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg></span>
      <span class="step1-category-tile-label">Custom Slider</span>
    </button>`);

  return `
  <div class="embed-builder-panel embed-builder-assets">
    <div class="embed-builder-panel-title">Assets</div>
    <div class="step1-category-grid">${tiles.join('')}</div>
  </div>`;
}

function _wireCategoryPicker(container) {
  container.querySelectorAll('[data-category]').forEach(tile => {
    tile.addEventListener('click', () => {
      const cat = tile.dataset.category;
      // __music__ has no real state.folders entries of its own to drill into (it's a synthetic
      // union of two categories) — finalize it directly instead of showing an empty folder screen.
      if (cat === '__music__') { _selectSectionSource(cat); return; }
      _pickerCategory = cat;
      _pickerScreen = 'folders';
      renderEmbedBuilder();
    });
  });
  container.querySelector('[data-custom-slider]')?.addEventListener('click', () => {
    _pickerScreen = 'custom';
    renderEmbedBuilder();
  });
}

// One category's own subfolders (same sortFoldersForDisplay()/folderIconHtml() the Add Item
// wizard's own folder screen uses — addEditModal.js's showFolderScreen()), plus a "All X" tile
// so the category-as-a-whole is still one tap away from here, not just from the top-level grid.
function _buildFolderPickerHtml() {
  const cat = _pickerCategory;
  const folders = sortFoldersForDisplay(state.folders.filter(f => f.parentCategory === cat), cat);
  const wholeTile = `
    <button type="button" class="step1-category-tile" data-whole-category="true">
      <span class="cat-icon">${CAT_EMOJI[cat] || ''}</span>
      <span class="step1-category-tile-label">All ${escapeHtml(CAT_LABEL[cat] || cat)}</span>
    </button>`;
  const folderTiles = folders.map(f => `
    <button type="button" class="step1-category-tile" data-folder-id="${escapeHtml(f.id)}">
      <span class="cat-icon">${folderIconHtml(f.id, 28)}</span>
      <span class="step1-category-tile-label">${escapeHtml(f.name)}</span>
    </button>`).join('');

  return `
  <div class="embed-builder-panel embed-builder-assets">
    <div class="embed-builder-panel-title-row">
      <button type="button" class="embed-builder-change-source" id="embed-picker-back">‹ Categories</button>
    </div>
    <div class="step1-category-grid">${wholeTile}${folderTiles}</div>
  </div>`;
}

function _wireFolderPicker(container) {
  container.querySelector('#embed-picker-back')?.addEventListener('click', () => {
    _pickerScreen = 'categories';
    _pickerCategory = null;
    renderEmbedBuilder();
  });
  container.querySelector('[data-whole-category]')?.addEventListener('click', () => _selectSectionSource(_pickerCategory));
  container.querySelectorAll('[data-folder-id]').forEach(tile => {
    tile.addEventListener('click', () => _selectFolderSource(tile.dataset.folderId));
  });
}

// Hand-picked, cross-category asset list — a simple search box over every saved item, capped at
// 200 rows so a large library doesn't render thousands of checkboxes at once (the search box is
// there specifically so that cap is never really a practical limit).
function _buildCustomPickerHtml() {
  const q = _customSearch.trim().toLowerCase();
  const pool = _sortNewestFirst(state.items.filter(i => !q || (i.title || '').toLowerCase().includes(q))).slice(0, 200);

  const rowsHtml = pool.length ? pool.map(item => `
    <label class="embed-custom-pick-row">
      <input type="checkbox" class="embed-custom-pick-checkbox" data-id="${escapeHtml(item.id)}" ${_customSelectedIds.has(item.id) ? 'checked' : ''} />
      <span class="embed-asset-thumb">
        ${item.imageUrl ? `<img src="${escapeHtml(item.imageUrl)}" alt="" loading="lazy" decoding="async" onerror="this.style.display='none'">` : ''}
      </span>
      <span class="embed-asset-name">${escapeHtml(item.title || 'Untitled')}</span>
      <span class="embed-custom-pick-cat">${escapeHtml(CAT_LABEL[item.category] || item.category || '')}</span>
    </label>`).join('') : '<div class="embed-builder-empty">No matches.</div>';

  return `
  <div class="embed-builder-panel embed-builder-assets">
    <div class="embed-builder-panel-title-row">
      <button type="button" class="embed-builder-change-source" id="embed-picker-back">‹ Categories</button>
      <span id="embed-custom-count">${_customSelectedIds.size} picked</span>
    </div>
    <input type="text" class="embed-custom-search" id="embed-custom-search" placeholder="Search your saves…" value="${escapeHtml(_customSearch)}" />
    <div class="embed-custom-pick-list" id="embed-custom-pick-list">${rowsHtml}</div>
    <button type="button" class="embed-custom-use-btn" id="embed-custom-use-btn" ${_customSelectedIds.size ? '' : 'disabled'}>Use this list (${_customSelectedIds.size})</button>
  </div>`;
}

function _wireCustomPicker(container) {
  container.querySelector('#embed-picker-back')?.addEventListener('click', () => {
    _pickerScreen = 'categories';
    renderEmbedBuilder();
  });
  const searchInput = container.querySelector('#embed-custom-search');
  searchInput?.addEventListener('input', e => {
    _customSearch = e.target.value;
    const cursor = e.target.selectionStart;
    renderEmbedBuilder();
    // renderEmbedBuilder() replaces the whole panel's innerHTML, including this input itself —
    // restore focus/cursor position so typing a search query doesn't lose focus after every
    // keystroke.
    const newInput = document.getElementById('embed-custom-search');
    if (newInput) { newInput.focus(); newInput.setSelectionRange(cursor, cursor); }
  });
  container.querySelectorAll('.embed-custom-pick-checkbox').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) _customSelectedIds.add(cb.dataset.id); else _customSelectedIds.delete(cb.dataset.id);
      renderEmbedBuilder();
    });
  });
  container.querySelector('#embed-custom-use-btn')?.addEventListener('click', _selectCustomSource);
}

// ===== asset list (checkbox include/exclude + reorder) =====

function _buildAssetListHtml() {
  const changeSourceLink = `<button type="button" class="embed-builder-change-source" id="embed-change-source">‹ Change source</button>`;

  if (!_sourceItems.length) {
    return `
    <div class="embed-builder-panel embed-builder-assets">
      <div class="embed-builder-panel-title-row">
        ${changeSourceLink}
      </div>
      <div class="embed-builder-empty">Nothing saved here yet.</div>
    </div>`;
  }

  const rowsHtml = _orderedIds.map(id => {
    const item = _sourceItems.find(i => i.id === id);
    if (!item) return '';
    const checked = _selectedIds.has(id);
    return `
    <div class="embed-asset-row${checked ? '' : ' embed-asset-row--unchecked'}" data-id="${escapeHtml(id)}" draggable="true">
      <span class="embed-asset-drag-handle" title="Drag to reorder">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>
      </span>
      <input type="checkbox" class="embed-asset-checkbox" data-id="${escapeHtml(id)}" ${checked ? 'checked' : ''} />
      <span class="embed-asset-thumb">
        ${item.imageUrl ? `<img src="${escapeHtml(item.imageUrl)}" alt="" loading="lazy" decoding="async" onerror="this.style.display='none'">` : ''}
      </span>
      <span class="embed-asset-name">${escapeHtml(item.title || 'Untitled')}</span>
      <span class="embed-asset-reorder-btns">
        <button type="button" class="embed-asset-move-up" data-id="${escapeHtml(id)}" title="Move up">▲</button>
        <button type="button" class="embed-asset-move-down" data-id="${escapeHtml(id)}" title="Move down">▼</button>
      </span>
    </div>`;
  }).join('');

  return `
  <div class="embed-builder-panel embed-builder-assets">
    <div class="embed-builder-panel-title-row">
      ${changeSourceLink}
      <span>(<span id="embed-asset-count">${_selectedIds.size}</span> selected)</span>
    </div>
    <div class="embed-asset-list" id="embed-asset-list">${rowsHtml}</div>
  </div>`;
}

function _wireAssetList(container) {
  container.querySelector('#embed-change-source')?.addEventListener('click', _changeSource);

  container.querySelectorAll('.embed-asset-checkbox').forEach(cb => {
    cb.addEventListener('change', () => {
      const id = cb.dataset.id;
      if (cb.checked) _selectedIds.add(id); else _selectedIds.delete(id);
      // Full re-render keeps the "N selected" count and the preview in sync — the asset list is
      // short enough (a single folder's worth of items) that this is cheap.
      renderEmbedBuilder();
    });
  });

  container.querySelectorAll('.embed-asset-move-up').forEach(btn => {
    btn.addEventListener('click', () => _moveAsset(btn.dataset.id, -1));
  });
  container.querySelectorAll('.embed-asset-move-down').forEach(btn => {
    btn.addEventListener('click', () => _moveAsset(btn.dataset.id, 1));
  });

  const rows = container.querySelectorAll('.embed-asset-row');
  rows.forEach(row => {
    row.addEventListener('dragstart', () => {
      _dragId = row.dataset.id;
      row.classList.add('embed-asset-row--dragging');
    });
    row.addEventListener('dragend', () => {
      row.classList.remove('embed-asset-row--dragging');
      _clearDropIndicators(container);
      _dragId = null;
      _dropTargetId = null;
      _dropPosition = null;
    });
    row.addEventListener('dragover', e => {
      e.preventDefault();
      if (!_dragId || row.dataset.id === _dragId) return;
      const rect = row.getBoundingClientRect();
      const before = (e.clientY - rect.top) < rect.height / 2;
      _dropTargetId = row.dataset.id;
      _dropPosition = before ? 'before' : 'after';
      _clearDropIndicators(container);
      row.classList.add(before ? 'embed-asset-row--drop-before' : 'embed-asset-row--drop-after');
    });
    row.addEventListener('drop', e => {
      e.preventDefault();
      if (!_dragId || !_dropTargetId || _dragId === _dropTargetId) return;
      _reorder(_dragId, _dropTargetId, _dropPosition);
      renderEmbedBuilder();
    });
  });
}

function _clearDropIndicators(container) {
  container.querySelectorAll('.embed-asset-row--drop-before, .embed-asset-row--drop-after')
    .forEach(r => r.classList.remove('embed-asset-row--drop-before', 'embed-asset-row--drop-after'));
}

function _moveAsset(id, dir) {
  const idx = _orderedIds.indexOf(id);
  const newIdx = idx + dir;
  if (idx === -1 || newIdx < 0 || newIdx >= _orderedIds.length) return;
  [_orderedIds[idx], _orderedIds[newIdx]] = [_orderedIds[newIdx], _orderedIds[idx]];
  renderEmbedBuilder();
}

function _reorder(dragId, targetId, position) {
  const filtered = _orderedIds.filter(id => id !== dragId);
  const targetIdx = filtered.indexOf(targetId);
  const insertAt = position === 'before' ? targetIdx : targetIdx + 1;
  filtered.splice(insertAt, 0, dragId);
  _orderedIds = filtered;
}

// ===== style panel =====

// Encodes the current selection + style into a shareable link, same UTF-8-safe base64 idiom
// share.js's buildShareUrl() uses (encodeURIComponent -> %XX-to-raw-char swap -> btoa), pointing
// at a new savecraft/embed.html sibling of the existing savecraft/view.html — that hosted page is
// Phase 3 (not built yet, see the header comment), so this link won't resolve until then, but the
// payload/encoding/Copy mechanic all work today and don't need to change once it ships.
function _buildEmbedUrl() {
  const items = _orderedSelectedItems().map(({ url, title, category, imageUrl }) => ({ url, title, category, imageUrl }));
  const payload = { title: _sourceLabel, items, style: _styleOptions };
  const encoded = btoa(encodeURIComponent(JSON.stringify(payload)).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))));
  return `https://lizpasekal1.github.io/Votecraft.org/savecraft/embed.html#${encoded}`;
}

// Always rendered (same as the style controls below it) — just empty/disabled until there's
// something to link to, rather than swapping in an instructional message that would make the box
// change shape/prominence depending on state.
function _buildEmbedCodeBoxHtml() {
  const hasItems = _orderedSelectedItems().length > 0;
  const url = hasItems ? _buildEmbedUrl() : '';
  return `
  <div class="embed-code-section">
    <div class="embed-builder-panel-title">Embed code</div>
    <div class="embed-code-box">
      <span class="embed-code-url" id="embed-code-url">${escapeHtml(url)}</span>
      <button type="button" class="embed-code-copy-btn" id="embed-code-copy-btn" ${hasItems ? '' : 'disabled'}>Copy</button>
    </div>
  </div>`;
}

// Refreshes just the embed code box's URL text in place — called after style-only changes below,
// which intentionally don't trigger a full renderEmbedBuilder() (that would blow away focus/state
// on the very input the user is mid-interaction with, e.g. the autoplay speed slider).
function _updateEmbedCodeBox() {
  const urlEl = document.getElementById('embed-code-url');
  const copyBtn = document.getElementById('embed-code-copy-btn');
  if (!urlEl || !copyBtn) return;
  const hasItems = _orderedSelectedItems().length > 0;
  urlEl.textContent = hasItems ? _buildEmbedUrl() : '';
  copyBtn.disabled = !hasItems;
}

function _buildStylePanelHtml() {
  const s = _styleOptions;
  return `
  <div class="embed-builder-panel embed-builder-style">
    ${_buildEmbedCodeBoxHtml()}
    <div class="embed-builder-panel-title">Style slider</div>

    <div class="embed-style-row">
      <label for="embed-style-slides">Visible slides</label>
      <select id="embed-style-slides" class="embed-style-select">
        ${[1, 2, 3, 4, 5].map(n => `<option value="${n}" ${s.visibleSlides === n ? 'selected' : ''}>${n}</option>`).join('')}
      </select>
    </div>

    <div class="embed-style-row">
      <label for="embed-style-margin">Slide spacing</label>
      <input type="range" id="embed-style-margin" min="4" max="50" step="2" value="${s.slideMargin}" />
      <span id="embed-style-margin-label">${s.slideMargin}px</span>
    </div>

    <div class="embed-style-row">
      <label for="embed-style-autoplay">Autoplay</label>
      <label class="share-access-toggle">
        <input type="checkbox" id="embed-style-autoplay" ${s.autoplay ? 'checked' : ''} />
        <span class="share-access-toggle-slider"></span>
      </label>
    </div>

    <div class="embed-style-row" id="embed-style-speed-row" style="${s.autoplay ? '' : 'display:none;'}">
      <label for="embed-style-speed">Autoplay speed</label>
      <input type="range" id="embed-style-speed" min="2" max="10" step="1" value="${s.autoplaySpeed}" />
      <span id="embed-style-speed-label">${s.autoplaySpeed}s</span>
    </div>

    <div class="embed-style-row">
      <label for="embed-style-nav">Navigation style</label>
      <select id="embed-style-nav" class="embed-style-select">
        <option value="arrows" ${s.navStyle === 'arrows' ? 'selected' : ''}>Arrows</option>
        <option value="dots" ${s.navStyle === 'dots' ? 'selected' : ''}>Dots</option>
        <option value="both" ${s.navStyle === 'both' ? 'selected' : ''}>Both</option>
      </select>
    </div>

    <div class="embed-style-row">
      <label for="embed-style-theme">Dark preview</label>
      <label class="share-access-toggle" title="Preview in dark theme (doesn't affect the extension's own theme)">
        <input type="checkbox" id="embed-style-theme" ${s.theme === 'dark' ? 'checked' : ''} />
        <span class="share-access-toggle-slider"></span>
      </label>
    </div>

    <div class="embed-style-row">
      <label for="embed-style-aspect">Aspect ratio</label>
      <select id="embed-style-aspect" class="embed-style-select">
        <option value="square" ${s.aspectRatio === 'square' ? 'selected' : ''}>Square</option>
        <option value="wide" ${s.aspectRatio === 'wide' ? 'selected' : ''}>Wide (16:9)</option>
        <option value="tall" ${s.aspectRatio === 'tall' ? 'selected' : ''}>Tall (2:3)</option>
      </select>
    </div>

    <div class="embed-style-row">
      <label for="embed-style-font">Font</label>
      <select id="embed-style-font" class="embed-style-select">
        ${WEB_SAFE_FONTS.map(f => `<option value="${escapeHtml(f.value)}" ${s.fontFamily === f.value ? 'selected' : ''} style="font-family: ${escapeHtml(f.value)};">${escapeHtml(f.label)}</option>`).join('')}
      </select>
    </div>

    <div class="embed-style-row">
      <label for="embed-style-branding">Show "Powered by SaveCraft"</label>
      <label class="share-access-toggle">
        <input type="checkbox" id="embed-style-branding" ${s.showBranding ? 'checked' : ''} />
        <span class="share-access-toggle-slider"></span>
      </label>
    </div>
  </div>`;
}

// Every style control's change handler needs both of these — bundled so neither gets forgotten
// as controls are added/changed.
function _onStyleChanged() {
  _renderPreview();
  _updateEmbedCodeBox();
}

function _wireStylePanel(container) {
  container.querySelector('#embed-code-copy-btn').addEventListener('click', () => {
    const btn = document.getElementById('embed-code-copy-btn');
    if (!btn || btn.disabled) return;
    navigator.clipboard.writeText(_buildEmbedUrl()).then(() => {
      const original = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = original; }, 2000);
    });
  });

  container.querySelector('#embed-style-slides').addEventListener('change', e => {
    _styleOptions.visibleSlides = parseInt(e.target.value, 10);
    _onStyleChanged();
  });
  container.querySelector('#embed-style-margin').addEventListener('input', e => {
    _styleOptions.slideMargin = parseInt(e.target.value, 10);
    container.querySelector('#embed-style-margin-label').textContent = `${_styleOptions.slideMargin}px`;
    _onStyleChanged();
  });
  container.querySelector('#embed-style-autoplay').addEventListener('change', e => {
    _styleOptions.autoplay = e.target.checked;
    container.querySelector('#embed-style-speed-row').style.display = e.target.checked ? '' : 'none';
    _onStyleChanged();
  });
  container.querySelector('#embed-style-speed').addEventListener('input', e => {
    _styleOptions.autoplaySpeed = parseInt(e.target.value, 10);
    container.querySelector('#embed-style-speed-label').textContent = `${_styleOptions.autoplaySpeed}s`;
    _onStyleChanged();
  });
  container.querySelector('#embed-style-nav').addEventListener('change', e => {
    _styleOptions.navStyle = e.target.value;
    _onStyleChanged();
  });
  container.querySelector('#embed-style-theme').addEventListener('change', e => {
    _styleOptions.theme = e.target.checked ? 'dark' : 'light';
    _onStyleChanged();
  });
  container.querySelector('#embed-style-aspect').addEventListener('change', e => {
    _styleOptions.aspectRatio = e.target.value;
    _onStyleChanged();
  });
  container.querySelector('#embed-style-font').addEventListener('change', e => {
    _styleOptions.fontFamily = e.target.value;
    _onStyleChanged();
  });
  container.querySelector('#embed-style-branding').addEventListener('change', e => {
    _styleOptions.showBranding = e.target.checked;
    _onStyleChanged();
  });
}

// ===== live preview =====

function _renderPreview() {
  const preview = document.getElementById('embed-builder-preview');
  if (!preview) return;
  if (_autoplayTimer) { clearInterval(_autoplayTimer); _autoplayTimer = null; }

  const items = _orderedSelectedItems();
  preview.setAttribute('data-embed-theme', _styleOptions.theme);
  preview.setAttribute('data-embed-aspect', _styleOptions.aspectRatio);
  preview.style.setProperty('--embed-visible-slides', _styleOptions.visibleSlides);
  preview.style.setProperty('--embed-slide-gap', `${_styleOptions.slideMargin}px`);
  preview.style.setProperty('--embed-font-family', _styleOptions.fontFamily);

  // No real assets picked yet — show gray placeholder slides (null entries below) instead of
  // just an empty message, so every style control (visible slides, spacing, aspect ratio, nav
  // style) is visible and testable immediately, not only after a source is chosen. Demo count
  // always covers at least one full "page" at the current visible-slides setting.
  const isDemo = items.length === 0;
  const displayItems = isDemo ? Array.from({ length: Math.max(_styleOptions.visibleSlides, 4) }, () => null) : items;

  // Tripled for _wireCarouselArrows()'s fake-infinite-scroll mechanic — same convention
  // dashboard.js's own carousels use (see its comment on _wireCarouselArrows for why).
  const tripled = [...displayItems, ...displayItems, ...displayItems];
  const cardsHtml = tripled.map((item, i) => item ? `
    <div class="embed-preview-card">
      <div class="embed-preview-art">
        ${item.imageUrl ? `<img src="${escapeHtml(item.imageUrl)}" alt="" loading="lazy" decoding="async" onerror="this.style.display='none'">` : ''}
      </div>
      <span class="embed-preview-label">${escapeHtml(item.title || 'Untitled')}</span>
    </div>` : `
    <div class="embed-preview-card embed-preview-card--demo">
      <div class="embed-preview-art embed-preview-art--demo"></div>
      <span class="embed-preview-label embed-preview-label--demo">Slide ${(i % displayItems.length) + 1}</span>
    </div>`).join('');

  const showArrows = _styleOptions.navStyle === 'arrows' || _styleOptions.navStyle === 'both';
  const showDots = _styleOptions.navStyle === 'dots' || _styleOptions.navStyle === 'both';

  preview.innerHTML = `
    <div class="dash-carousel embed-preview-carousel"${_styleOptions.autoplay ? ' data-autoplay="true"' : ''}${isDemo ? ' data-demo="true"' : ''}>
      ${showArrows ? '<button class="dash-carousel-prev" aria-label="Previous">‹</button>' : ''}
      <div class="dash-carousel-strip">${cardsHtml}</div>
      ${showArrows ? '<button class="dash-carousel-next" aria-label="Next">›</button>' : ''}
    </div>
    ${showDots ? `<div class="embed-preview-dots">${displayItems.map(() => '<span class="embed-preview-dot"></span>').join('')}</div>` : ''}
    ${_styleOptions.showBranding ? '<div class="embed-preview-branding">Powered by SaveCraft</div>' : ''}
  `;

  const carouselEl = preview.querySelector('.embed-preview-carousel');
  const strip = preview.querySelector('.dash-carousel-strip');
  _wireCarouselArrows(carouselEl, strip);

  if (_styleOptions.autoplay) {
    _autoplayTimer = setInterval(() => {
      preview.querySelector('.dash-carousel-next')?.click();
    }, _styleOptions.autoplaySpeed * 1000);
  }
}
