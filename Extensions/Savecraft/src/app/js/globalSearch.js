// ===== GLOBAL SEARCH (header search icon) =====
// A true library-wide search across every saved item ("All My Saves" — every category, every
// folder), shown as a Spotlight-style results panel under the header's search input — confirmed
// via direct discussion: distinct from the sort dropdown's own embedded search field
// (sortSelect.js), which only filters whatever page is currently open. This module owns the
// header search icon's DOM/behavior entirely (it used to be main.js's initSearch()); state.search
// is NEVER touched here, on purpose, so the two features can't cross-wire each other.
//
// Transient UI state only (the query + last-rendered results) — no state.js/storage.js
// involvement, same treatment as azIndexRail.js's own module-level `_dragging` flag, since this
// is genuinely just "what's currently in the search box," not anything worth persisting.

import { state, CAT_LABEL } from './state.js';
import { escapeHtml, badgeLabel, isQueueDemoId, debounce } from './utils.js';
import { openDetailModal } from './detailModal.js';

const RESULT_LIMIT = 20;
const SEARCH_DEBOUNCE_MS = 220; // same constant handleSearch() (main.js) already uses

let _lastResults = [];

function _matchItems(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  // Same base exclusion every other library-wide scan in this app already uses (renderFilters.js,
  // renderSidebar.js, authors.js, dashboard.js, kanban.js, embedBuilder.js, storage.js) — queue-demo
  // placeholders have no real title/url worth matching against.
  return state.items
    .filter(i => !isQueueDemoId(i.id))
    .filter(i => (i.title || '').toLowerCase().includes(q) || (i.url || '').toLowerCase().includes(q))
    .slice(0, RESULT_LIMIT);
}

function _renderResults(panel, results) {
  if (results.length === 0) {
    panel.innerHTML = `<div class="step1-search-no-results">No matches in your library.</div>`;
    panel.hidden = false;
    return;
  }
  panel.innerHTML = results.map((item, i) => `
    <div class="step1-result-row" data-index="${i}">
      ${item.imageUrl
        ? `<img class="step1-result-art" src="${escapeHtml(item.imageUrl)}" alt="" loading="lazy" decoding="async"
                onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
           <div class="step1-result-art step1-result-art-placeholder" style="display:none">${escapeHtml((item.title || '?')[0].toUpperCase())}</div>`
        : `<div class="step1-result-art step1-result-art-placeholder">${escapeHtml((item.title || '?')[0].toUpperCase())}</div>`}
      <div class="step1-result-info">
        <div class="step1-result-title">${escapeHtml(item.title || '')}</div>
        <div class="step1-result-meta">${escapeHtml(CAT_LABEL[item.category] || badgeLabel(item.category))}</div>
      </div>
    </div>`).join('');
  panel.hidden = false;

  panel.querySelectorAll('.step1-result-row').forEach(row => {
    // mousedown (not click) so this fires before the document-level click-outside closer below
    // would otherwise close the panel first — same reasoning as the Add-modal's own
    // .step1-result-row rows (addEditModal.js's renderTitleSearchResults).
    row.addEventListener('mousedown', e => {
      e.preventDefault();
      const item = results[parseInt(row.dataset.index, 10)];
      if (item) openDetailModal(item);
    });
  });
}

let _globalSearchDocListenerAdded = false;

export function initGlobalSearch() {
  const wrap = document.getElementById('search-expand-wrap');
  const input = document.getElementById('search-expand-input');
  const btn = document.getElementById('btn-search-icon');
  const panel = document.getElementById('global-search-results');
  if (!wrap || !input || !btn || !panel) return;

  const runSearch = debounce(query => {
    _lastResults = _matchItems(query);
    if (!query.trim()) { panel.hidden = true; return; }
    _renderResults(panel, _lastResults);
  }, SEARCH_DEBOUNCE_MS);

  function openSearch() {
    wrap.classList.add('open');
    input.focus();
  }

  function closeSearch() {
    wrap.classList.remove('open');
    input.value = '';
    panel.hidden = true;
    panel.innerHTML = '';
    _lastResults = [];
  }

  btn.addEventListener('click', () => {
    wrap.classList.contains('open') ? closeSearch() : openSearch();
  });

  input.addEventListener('input', e => runSearch(e.target.value));

  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeSearch();
  });

  if (!_globalSearchDocListenerAdded) {
    document.addEventListener('click', e => {
      if (!wrap.contains(e.target) && wrap.classList.contains('open')) {
        if (!input.value) closeSearch();
        else panel.hidden = true; // keep the query, just tuck the panel away
      }
    });
    _globalSearchDocListenerAdded = true;
  }
}
