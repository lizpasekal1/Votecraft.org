// ===== CUSTOM SORT DROPDOWN (#sort-select) =====
// Replaces what used to be a native <select> with an app-styled trigger button + dropdown panel
// (index.html), per direct request. The dropdown's last row is a real text input that filters the
// current page (main.js's existing handleSearch()/state.search — unchanged, just a new UI entry
// point into it); the header's own search icon is a SEPARATE, genuinely global search instead
// (globalSearch.js) — the two are deliberately kept apart so neither leaks into the other.
//
// #sort-select stays the id on the OUTER wrapper (index.html), not the trigger button — every
// other file's existing `document.getElementById('sort-select').style.display = ...` calls (its
// visibility per view) and the two places that physically reparent the singleton node (Top 100's
// hero, renderCuratedPages.js; back into .grid-header-right at the top of every renderGrid.js
// render) all keep working completely unchanged against this wrapper, exactly as they did against
// the old <select>. Only the native `.value`/`change` API is gone — this file's own
// setSortSelectValue() replaces every `.value = ` write (main.js's init, azIndexRail.js's forced
// switch to 'az'), and option clicks call handleSort() directly instead of a `change` listener.
//
// The dropdown's own markup is static (index.html), unlike e.g. Admin Kanban's own sort dropdown
// (adminKanban.js), which rebuilds via innerHTML on every render — this one is built once and
// never destroyed, so the embedded search input's typed value survives every renderGrid() call
// for free, with no extra state-preservation logic needed.

import { state } from './state.js';
import { handleSort, handleSearch } from './main.js';

const SORT_LABELS = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  az: 'A → Z',
  za: 'Z → A',
  'release-new': 'Release Date (Newest)',
  'release-old': 'Release Date (Oldest)',
};

// Updates the trigger's visible label + the dropdown's active-row highlight — the replacement for
// the old native `sortSelect.value = ...` write. Safe to call even before initSortSelect() has run
// (main.js's init() calls this before initSortSelect(), to set the correct label on first paint).
export function setSortSelectValue(sort) {
  const label = document.getElementById('sort-select-trigger-label');
  if (label) label.textContent = SORT_LABELS[sort] || SORT_LABELS.newest;
  document.querySelectorAll('#sort-select-dropdown .saves-list-option').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.sort === sort);
  });
}

let _sortSelectDocListenerAdded = false;

export function initSortSelect() {
  const trigger = document.getElementById('sort-select-trigger');
  const dropdown = document.getElementById('sort-select-dropdown');
  const searchInput = document.getElementById('sort-select-search-input');
  if (!trigger || !dropdown) return;

  const closeDropdown = () => { dropdown.hidden = true; };
  const openDropdown = () => {
    dropdown.hidden = false;
    // Keeps the embedded field truthful if the dropdown is reopened after state.search changed
    // some other way — cheap defensive sync, not a two-way binding (typing here is state.search's
    // only real writer today).
    if (searchInput) searchInput.value = state.search || '';
  };

  trigger.addEventListener('click', e => {
    e.stopPropagation();
    dropdown.hidden ? openDropdown() : closeDropdown();
  });

  dropdown.querySelectorAll('.saves-list-option[data-sort]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      handleSort(btn.dataset.sort);
      setSortSelectValue(btn.dataset.sort);
      closeDropdown();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('click', e => e.stopPropagation());
    searchInput.addEventListener('input', e => handleSearch(e.target.value));
    // Escape closes the panel without clearing state.search — unlike the header search's own
    // Escape (globalSearch.js), which deliberately clears its transient query on close, this field
    // is a page filter meant to persist across opening/closing the dropdown, not a popover search.
    searchInput.addEventListener('keydown', e => {
      if (e.key === 'Escape') { closeDropdown(); trigger.focus(); }
      else if (e.key === 'Enter') e.preventDefault();
    });
  }

  // Guarded so this is attached exactly once regardless of how many times initSortSelect() were
  // ever called — same "attach once" convention as Admin Kanban's/My Saves Queue's own sort
  // dropdowns (adminKanban.js/kanban.js), which this component's whole shape is modeled on.
  if (!_sortSelectDocListenerAdded) {
    document.addEventListener('click', e => {
      if (!dropdown.hidden && !trigger.contains(e.target) && !dropdown.contains(e.target)) {
        closeDropdown();
      }
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !dropdown.hidden) closeDropdown();
    });
    _sortSelectDocListenerAdded = true;
  }
}
