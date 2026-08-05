// ===== EMBED BUILDER =====
// Full-screen in-extension page (state.view === 'embed-builder') for building a customizable
// slider/carousel of specific assets from the current folder/view, for embedding on an external
// website via an <iframe> snippet — opened from the Share dropdown's "Embed options" button
// (share.js). Phase 1 (this file, initial version): fully client-side — checkbox include/
// exclude, drag-to-reorder, a style panel, and a live carousel preview reusing dashboard.js's
// _wireCarouselArrows. Nothing persists yet; closing the page discards the in-progress config.
// Firestore persistence (a public, sign-in-gated "savecraft_embeds" doc per embed) + a "Your
// Embeds" section on the Profile page, plus the actual hosted public embed.html rendering page
// and its generated <iframe> snippet, are a deliberately separate follow-up phase.

import { state } from './state.js';
import { escapeHtml } from './utils.js';
import { getFilteredSortedItems, renderSidebar, renderGrid } from './render.js';
import { getCurrentViewLabel } from './share.js';
import { _wireCarouselArrows } from './dashboard.js';

// Snapshot of the source view the Builder was opened for — captured once in openEmbedBuilder(),
// before state.view gets reassigned to 'embed-builder', and read (never re-derived from
// state.view) everywhere else in this file.
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
  _sourceViewKey = state.view;
  _sourceItems = getFilteredSortedItems();
  _sourceLabel = getCurrentViewLabel();
  _selectedIds = new Set(_sourceItems.map(i => i.id));
  _orderedIds = _sourceItems.map(i => i.id);
  _styleOptions = _defaultStyleOptions();
  _dragId = null;
  _dropTargetId = null;
  _dropPosition = null;

  // No persistViewState() here, deliberately — same convention every other pseudo-view
  // (dashboard/profile/shared) already follows, so a reload never strands the user on an
  // orphaned builder view with no source scope to return to.
  state.view = 'embed-builder';
  renderGrid();
}

function _closeEmbedBuilder() {
  if (_autoplayTimer) { clearInterval(_autoplayTimer); _autoplayTimer = null; }
  state.view = _sourceViewKey || 'all';
  renderSidebar();
  renderGrid();
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

  container.innerHTML = `
    <div class="embed-builder-page">
      <div class="embed-builder-header">
        <button class="embed-builder-back" id="embed-builder-back" title="Back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div class="embed-builder-title">
          <h1>Embed options</h1>
          <p>Building a slider from <strong>${escapeHtml(_sourceLabel)}</strong></p>
        </div>
      </div>
      <div class="embed-builder-body">
        ${_buildAssetListHtml()}
        ${_buildStylePanelHtml()}
      </div>
      <div class="embed-builder-preview-section">
        <div class="embed-builder-panel-title">Live preview</div>
        <div class="embed-builder-preview" id="embed-builder-preview"></div>
      </div>
    </div>
  `;

  _wireHeader(container);
  _wireAssetList(container);
  _wireStylePanel(container);
  _renderPreview();
}

// ===== header =====

function _wireHeader(container) {
  container.querySelector('#embed-builder-back').addEventListener('click', _closeEmbedBuilder);
}

// ===== asset list (checkbox include/exclude + reorder) =====

function _buildAssetListHtml() {
  if (!_sourceItems.length) {
    return `
    <div class="embed-builder-panel embed-builder-assets">
      <div class="embed-builder-panel-title">Assets</div>
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
    <div class="embed-builder-panel-title">Assets (<span id="embed-asset-count">${_selectedIds.size}</span> selected)</div>
    <div class="embed-asset-list" id="embed-asset-list">${rowsHtml}</div>
  </div>`;
}

function _wireAssetList(container) {
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

function _buildStylePanelHtml() {
  const s = _styleOptions;
  return `
  <div class="embed-builder-panel embed-builder-style">
    <div class="embed-builder-panel-title">Style</div>

    <div class="embed-style-row">
      <label for="embed-style-slides">Visible slides</label>
      <select id="embed-style-slides" class="embed-style-select">
        ${[1, 2, 3, 4, 5].map(n => `<option value="${n}" ${s.visibleSlides === n ? 'selected' : ''}>${n}</option>`).join('')}
      </select>
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
      <label for="embed-style-branding">Show "Powered by SaveCraft"</label>
      <label class="share-access-toggle">
        <input type="checkbox" id="embed-style-branding" ${s.showBranding ? 'checked' : ''} />
        <span class="share-access-toggle-slider"></span>
      </label>
    </div>
  </div>`;
}

function _wireStylePanel(container) {
  container.querySelector('#embed-style-slides').addEventListener('change', e => {
    _styleOptions.visibleSlides = parseInt(e.target.value, 10);
    _renderPreview();
  });
  container.querySelector('#embed-style-autoplay').addEventListener('change', e => {
    _styleOptions.autoplay = e.target.checked;
    container.querySelector('#embed-style-speed-row').style.display = e.target.checked ? '' : 'none';
    _renderPreview();
  });
  container.querySelector('#embed-style-speed').addEventListener('input', e => {
    _styleOptions.autoplaySpeed = parseInt(e.target.value, 10);
    container.querySelector('#embed-style-speed-label').textContent = `${_styleOptions.autoplaySpeed}s`;
    _renderPreview();
  });
  container.querySelector('#embed-style-nav').addEventListener('change', e => {
    _styleOptions.navStyle = e.target.value;
    _renderPreview();
  });
  container.querySelector('#embed-style-theme').addEventListener('change', e => {
    _styleOptions.theme = e.target.checked ? 'dark' : 'light';
    _renderPreview();
  });
  container.querySelector('#embed-style-aspect').addEventListener('change', e => {
    _styleOptions.aspectRatio = e.target.value;
    _renderPreview();
  });
  container.querySelector('#embed-style-branding').addEventListener('change', e => {
    _styleOptions.showBranding = e.target.checked;
    _renderPreview();
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

  if (!items.length) {
    preview.innerHTML = '<div class="embed-builder-empty">Select at least one asset to preview.</div>';
    return;
  }

  // Tripled for _wireCarouselArrows()'s fake-infinite-scroll mechanic — same convention
  // dashboard.js's own carousels use (see its comment on _wireCarouselArrows for why).
  const tripled = [...items, ...items, ...items];
  const cardsHtml = tripled.map(item => `
    <div class="embed-preview-card">
      <div class="embed-preview-art">
        ${item.imageUrl ? `<img src="${escapeHtml(item.imageUrl)}" alt="" loading="lazy" decoding="async" onerror="this.style.display='none'">` : ''}
      </div>
      <span class="embed-preview-label">${escapeHtml(item.title || 'Untitled')}</span>
    </div>`).join('');

  const showArrows = _styleOptions.navStyle === 'arrows' || _styleOptions.navStyle === 'both';
  const showDots = _styleOptions.navStyle === 'dots' || _styleOptions.navStyle === 'both';

  preview.innerHTML = `
    <div class="dash-carousel embed-preview-carousel"${_styleOptions.autoplay ? ' data-autoplay="true"' : ''}>
      ${showArrows ? '<button class="dash-carousel-prev" aria-label="Previous">‹</button>' : ''}
      <div class="dash-carousel-strip">${cardsHtml}</div>
      ${showArrows ? '<button class="dash-carousel-next" aria-label="Next">›</button>' : ''}
    </div>
    ${showDots ? `<div class="embed-preview-dots">${items.map(() => '<span class="embed-preview-dot"></span>').join('')}</div>` : ''}
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
