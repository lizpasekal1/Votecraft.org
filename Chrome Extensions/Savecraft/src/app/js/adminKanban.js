// ===== ADMIN KANBAN =====
// A second, separate board from the main "My Saves Queue" (kanban.js) — reached from the
// Dashboard's Admin Kanban widget. Cards here aren't saved items at all, just a name + a details
// field (state.adminKanbanCards, local-only — see storage.js's persistAdminKanbanCards) for
// tracking SaveCraft's own to-do list. Board cards are sized/styled identically to the real
// board's .kcard, and clicking one opens a popup to edit it — same "compact card, full editor in
// a modal" split kanban.js itself uses (openDetailModal), just a much smaller modal here since
// there's only two fields. The modal is built and injected once, on first use, rather than
// living as static markup in index.html — this whole feature is expected to be reworked/removed
// later (per direct request), so keeping it self-contained in this one file makes that easy.

import { state } from './state.js';
import { escapeHtml } from './utils.js';
import { persistAdminKanbanCards } from './storage.js';
import { storageSync } from './platform.js';

// One global sort applied across every column (unlike the real board's own per-column
// kanbanSort) — driven by a dedicated dropdown next to this page's own title, not the shared
// #sort-select singleton (its fixed option set — Newest/Oldest/A→Z/Z→A/Release Date — belongs to
// the main items grid; repurposing it here would mean restoring it correctly everywhere else).
// Comparators read cards already filtered to one column (see _cardsInColumn) — urgency-asc/desc
// both push cards with no urgency rating to the end, regardless of direction.
const SORT_MODES = [
  { key: 'manual',        label: 'Custom order',           cmp: null },
  { key: 'az',             label: 'A → Z',                  cmp: (a, b) => (a.name || '').localeCompare(b.name || '') },
  { key: 'za',             label: 'Z → A',                  cmp: (a, b) => (b.name || '').localeCompare(a.name || '') },
  { key: 'newest',         label: 'Newest → Oldest',        cmp: (a, b) => b.createdAt - a.createdAt },
  { key: 'oldest',         label: 'Oldest → Newest',        cmp: (a, b) => a.createdAt - b.createdAt },
  { key: 'urgency-desc',   label: 'Urgency (High → Low)',   cmp: (a, b) => (b.urgency ?? -Infinity) - (a.urgency ?? -Infinity) },
  { key: 'urgency-asc',    label: 'Urgency (Low → High)',   cmp: (a, b) => (a.urgency ?? Infinity) - (b.urgency ?? Infinity) },
];

export const ADMIN_KANBAN_COLUMNS = [
  { key: 'todo',        label: 'TO DO' },
  { key: 'in-progress', label: 'IN PROGRESS' },
  { key: 'blocked',     label: 'BLOCKED / NOTES' },
  { key: 'done',        label: 'DONE' },
];

// Per-column "drag cards here" hint shown when a non-first column is empty — same convention as
// kanban.js's own hints, first column excluded there too (it's always the natural landing spot,
// nothing to invite dragging into).
const EMPTY_HINTS = {
  'in-progress': 'Drag cards to progress',
  'blocked':     'Drag cards to blocked / notes',
  'done':        'Drag cards to done',
};

// Same plus/minus glyphs as kanban.js's own expand button (duplicated, not imported — kept
// self-contained since this whole feature is expected to be reworked/removed later).
// Expand button's icon (top-right of each column, .kanban-expand-btn) — per direct request, was
// a plain "+". fill is currentColor (not the pasted SVG's own hardcoded #1f1f1f) so it inherits
// the button's own color, including its hover state, same fix as ADD_CARD_ARROW_SVG below.
const EXPAND_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" height="12px" viewBox="0 -960 960 960" width="12px" fill="currentColor"><path d="M480-344 240-584l56-56 184 184 184-184 56 56-240 240Z"/></svg>';
const COLLAPSE_ICON_SVG = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>';
// "+ Add card"'s icon — reverted back to a plain plus (was briefly the arrow SVG below, per an
// earlier request, then reverted per a follow-up once the expand button's own icon became an
// arrow instead — the two buttons read more distinctly now: this one "+" (add), that one an
// arrow (expand/collapse direction)). Same cross-line style EXPAND_ICON_SVG used before its own
// icon changed above.
const ADD_CARD_PLUS_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';

// Column currently expanded full-width, or null — not persisted, resets on reload, same as
// kanban.js's state.kanbanExpandedCol. No format picker here (unlike the real board): expanded
// just means a comfortable 2-column grid instead of the 1-across list.
let _expandedCol = null;

// Registered once (not per-render, which would stack a new listener on `document` every time the
// board redraws) — same idiom kanban.js uses for its own sort/format dropdowns.
let _sortDropdownDocListenerAdded = false;

// Shown in TO DO only, only while the board has no real cards at all yet — same "one demo card
// so the board doesn't read as four empty boxes" idea as kanban.js's own KANBAN_DEMO(), but
// static here (not draggable/clickable/deletable) rather than replicating that file's fake-drag
// bookkeeping for something whose only job is showing what a card looks like.
function _adminDemoCard() {
  return {
    id: '__admin_demo__',
    name: 'Drag to progress',
    details: 'Click + Add card to create your first real task.',
    status: 'todo',
    _isDemo: true,
  };
}

// Exported for dashboard.js's mini preview widget — same ordering the full board uses.
export function _cardsInColumn(colKey) {
  const mode = SORT_MODES.find(m => m.key === state.adminKanbanSort) || SORT_MODES[0];
  const cmp = mode.cmp || ((a, b) => (a.manualOrder ?? Infinity) - (b.manualOrder ?? Infinity) || a.createdAt - b.createdAt);
  const real = state.adminKanbanCards
    .filter(c => c.status === colKey)
    .sort(cmp);
  if (colKey === 'todo' && state.adminKanbanCards.length === 0) return [_adminDemoCard()];
  return real;
}

// ===== card editor modal (built lazily, once) =====

let _modalEl = null;
// null while creating a brand-new card (column comes from the "+ Add card" button that opened
// it); the existing card object while editing one that already exists.
let _editingCard = null;
let _newCardColumn = null;

function _ensureModal() {
  if (_modalEl) return _modalEl;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'admin-kcard-modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="position:relative; width:420px;">
      <button class="modal-x-close" id="admin-kcard-modal-close" title="Close">&#x2715;</button>
      <div class="modal-header">
        <h2 id="admin-kcard-modal-title">Task</h2>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <input type="text" id="admin-kcard-name-input" placeholder="Card name" maxlength="120" autocomplete="off">
        </div>
        <div class="form-group">
          <textarea id="admin-kcard-details-input" placeholder="Details…" rows="6"></textarea>
        </div>
        <div class="form-group">
          <label class="admin-kcard-urgency-field-label" for="admin-kcard-urgency-input">Urgency (1–10)</label>
          <input type="number" id="admin-kcard-urgency-input" min="1" max="10" step="1" placeholder="Optional">
        </div>
      </div>
      <div class="modal-actions admin-kcard-modal-actions">
        <button class="admin-kcard-delete-link" id="admin-kcard-delete-btn" type="button">Delete</button>
        <div class="admin-kcard-modal-actions-right">
          <button class="btn-cancel" id="admin-kcard-cancel-btn" type="button">Cancel</button>
          <button class="btn-primary" id="admin-kcard-save-btn" type="button">Save</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  _modalEl = overlay;

  overlay.addEventListener('click', e => { if (e.target === overlay) _closeCardModal(); });
  document.getElementById('admin-kcard-modal-close').addEventListener('click', _closeCardModal);
  document.getElementById('admin-kcard-cancel-btn').addEventListener('click', _closeCardModal);
  document.getElementById('admin-kcard-save-btn').addEventListener('click', _saveCardModal);
  document.getElementById('admin-kcard-delete-btn').addEventListener('click', () => {
    if (_editingCard) {
      state.adminKanbanCards = state.adminKanbanCards.filter(c => c.id !== _editingCard.id);
      persistAdminKanbanCards();
    }
    _closeCardModal();
    renderAdminKanbanBoard();
  });
  document.getElementById('admin-kcard-name-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); _saveCardModal(); }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) _closeCardModal();
  });

  return overlay;
}

function _openCardModal(card, newInColumn) {
  _ensureModal();
  _editingCard = card || null;
  _newCardColumn = newInColumn || null;

  document.getElementById('admin-kcard-modal-title').textContent = card ? 'Edit Task' : 'New Task';
  document.getElementById('admin-kcard-name-input').value = card?.name || '';
  document.getElementById('admin-kcard-details-input').value = card?.details || '';
  document.getElementById('admin-kcard-urgency-input').value = card?.urgency ?? '';
  // Nothing to delete yet on a brand-new, unsaved card.
  document.getElementById('admin-kcard-delete-btn').style.display = card ? '' : 'none';

  _modalEl.classList.add('open');
  document.getElementById('admin-kcard-name-input').focus();
}

function _closeCardModal() {
  _modalEl?.classList.remove('open');
  _editingCard = null;
  _newCardColumn = null;
}

function _saveCardModal() {
  const name = document.getElementById('admin-kcard-name-input').value.trim();
  const details = document.getElementById('admin-kcard-details-input').value.trim();
  // Clamped 1-10, same as the input's own min/max — belt-and-suspenders in case those get
  // bypassed (e.g. pasting a value in), since this number also picks a CSS color class on the
  // card. Empty input -> null (urgency stays optional, no dot shown on the card).
  const urgencyRaw = document.getElementById('admin-kcard-urgency-input').value;
  const urgency = urgencyRaw === '' ? null : Math.max(1, Math.min(10, Math.round(Number(urgencyRaw))));
  if (!name && !details) { _closeCardModal(); return; } // nothing worth keeping

  if (_editingCard) {
    _editingCard.name = name;
    _editingCard.details = details;
    _editingCard.urgency = urgency;
  } else {
    state.adminKanbanCards.push({
      id: 'admin-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      name,
      details,
      urgency,
      status: _newCardColumn,
      manualOrder: _cardsInColumn(_newCardColumn).length,
      createdAt: Date.now(),
    });
  }
  persistAdminKanbanCards();
  _closeCardModal();
  renderAdminKanbanBoard();
}

// ===== board =====

// Same fixed box .kcard uses on the real board (100px tall, hover shadow) — .admin-kcard only
// swaps out the internal layout (no thumb; just name + details, since there's nothing else to
// show for a plain task card). Delete ("✕", hover-revealed) is a quick path straight from the
// board, matching .kcard-remove on the real board — separate from (and faster than) the modal's
// own Delete button, per direct request. Never shown on the demo card, same as the real board.
// 1-3 blue, 4-7 deep orange, 8-10 red, per direct request — orange (not the original yellow) so
// its number can stay white like the other two, instead of needing its own dark-text override.
function _urgencyColorClass(n) {
  if (n <= 3) return 'admin-kcard-urgency--blue';
  if (n <= 7) return 'admin-kcard-urgency--orange';
  return 'admin-kcard-urgency--red';
}

function renderAdminCard(card) {
  const detailsHtml = card.details
    ? `<div class="admin-kcard-details">${escapeHtml(card.details)}</div>` : '';
  const demoTag = card._isDemo ? '<span class="kcard-demo-badge">DEMO</span>' : '';
  const removeBtn = !card._isDemo
    ? `<button class="admin-kcard-remove" data-id="${card.id}" title="Delete card">✕</button>` : '';
  const urgencyDot = card.urgency
    ? `<span class="admin-kcard-urgency ${_urgencyColorClass(card.urgency)}" title="Urgency: ${card.urgency}/10">${card.urgency}</span>` : '';
  const urgencyStrip = card.urgency
    ? `<span class="admin-kcard-urgency-strip ${_urgencyColorClass(card.urgency)}"></span>` : '';
  return `
    <div class="kcard admin-kcard${card._isDemo ? ' kcard--demo' : ''}" data-id="${card.id}" draggable="${!card._isDemo}">
      ${urgencyStrip}
      <div class="admin-kcard-body">
        ${demoTag}
        <div class="admin-kcard-name">${escapeHtml(card.name) || 'Untitled'}</div>
        ${detailsHtml}
      </div>
      ${removeBtn}
      ${urgencyDot}
    </div>`;
}

function renderAdminColumn(col) {
  const cards = _cardsInColumn(col.key);
  const isExpanded = _expandedCol === col.key;
  const emptyHtml = EMPTY_HINTS[col.key]
    ? `<div class="progress-drop-hint">${EMPTY_HINTS[col.key]}</div>`
    : '<div class="kanban-empty"></div>';

  return `
    <div class="kanban-column${isExpanded ? ' kanban-column--expanded' : ''}">
      <button class="kanban-expand-btn${isExpanded ? ' kanban-expand-btn--active' : ''}" data-col="${col.key}" title="${isExpanded ? 'Shrink back to the full board' : `Expand ${col.label}`}">
        ${isExpanded ? COLLAPSE_ICON_SVG : EXPAND_ICON_SVG}
      </button>
      <div class="kanban-column-title">${col.label}</div>
      <div class="kanban-cards admin-kanban-cards${isExpanded ? ' kanban-cards--two-col' : ''}" data-col="${col.key}">
        ${cards.map(renderAdminCard).join('') || emptyHtml}
      </div>
      <button class="admin-kcard-add-btn" data-col="${col.key}" title="Add card">${ADD_CARD_PLUS_SVG}</button>
    </div>`;
}

function renderSortDropdown() {
  const current = SORT_MODES.find(m => m.key === state.adminKanbanSort) || SORT_MODES[0];
  return `
    <div class="admin-kanban-sort-wrap">
      <button class="btn-board-filter admin-kanban-sort-btn" id="admin-kanban-sort-btn">
        <span>${escapeHtml(current.label)}</span>
        <svg width="10" height="6" viewBox="0 0 10 6" fill="currentColor"><path d="M0 0l5 6 5-6z"/></svg>
      </button>
      <div class="board-filter-dropdown admin-kanban-sort-dropdown" id="admin-kanban-sort-dropdown" hidden>
        ${SORT_MODES.map(m => `
          <button class="saves-list-option${m.key === state.adminKanbanSort ? ' active' : ''}" data-sort="${m.key}">${escapeHtml(m.label)}</button>
        `).join('')}
      </div>
    </div>`;
}

export function renderAdminKanbanBoard() {
  const container = document.getElementById('cards-grid');
  // #grid-title and #sort-select are hidden entirely here (not shown-with-custom-text like an
  // earlier version of this function did) — same convention every other non-grid view already
  // follows (dashboard.js, kanban.js, profile.js, embedBuilder.js, sharedSaves.js all hide
  // #sort-select outright). Title + sort control are rendered as this page's own content below
  // instead, entirely inside #cards-grid — safer than fighting #grid-title/.grid-header's layout
  // (see the mobile flex-direction regression this replaced) and lets the sort dropdown actually
  // carry Admin-Kanban-specific options instead of the shared control's fixed Newest/Oldest/A→Z
  // set, which belongs to the main items grid and shouldn't be overwritten out from under it.
  document.getElementById('grid-title').style.display = 'none';
  document.getElementById('sort-select').style.display = 'none';
  document.getElementById('btn-kanban-dashboard').style.display = '';
  // Second class is a hook for misc.css's mobile override — btn-kanban-dashboard (".‹ Dashboard")
  // is a shared header element (index.html), not scoped per-view on its own, so hiding it just
  // for this board on mobile needs something in the DOM to key off; plain .kanban-wrap alone is
  // shared with the real Queue board too, which still wants it shown.
  container.className = 'kanban-wrap admin-kanban-wrap';

  // While a column is expanded, only that column renders — same reasoning as kanban.js: the
  // other three (the only valid cross-column drop targets) aren't on screen, so there's nothing
  // to drag between.
  const columns = _expandedCol ? ADMIN_KANBAN_COLUMNS.filter(c => c.key === _expandedCol) : ADMIN_KANBAN_COLUMNS;
  container.innerHTML = `
    <div class="admin-kanban-header">
      <h2 class="admin-kanban-title">Admin Kanban</h2>
      ${renderSortDropdown()}
    </div>
    <div class="kanban-board admin-kanban-board${_expandedCol ? ' kanban-board--expanded' : ''}">
      ${columns.map(renderAdminColumn).join('')}
    </div>`;

  const sortBtn = container.querySelector('#admin-kanban-sort-btn');
  const sortDropdown = container.querySelector('#admin-kanban-sort-dropdown');
  sortBtn?.addEventListener('click', e => {
    e.stopPropagation();
    sortDropdown.toggleAttribute('hidden');
  });
  sortDropdown?.querySelectorAll('[data-sort]').forEach(opt => {
    opt.addEventListener('click', e => {
      e.stopPropagation();
      state.adminKanbanSort = opt.dataset.sort;
      storageSync.set({ savecraft_admin_kanban_sort: state.adminKanbanSort });
      renderAdminKanbanBoard();
    });
  });
  if (!_sortDropdownDocListenerAdded) {
    _sortDropdownDocListenerAdded = true;
    document.addEventListener('click', () => {
      document.getElementById('admin-kanban-sort-dropdown')?.setAttribute('hidden', '');
    });
  }

  const board = container.querySelector('.admin-kanban-board');

  board.querySelectorAll('.kanban-expand-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      _expandedCol = _expandedCol === btn.dataset.col ? null : btn.dataset.col;
      renderAdminKanbanBoard();
    });
  });

  board.querySelectorAll('.admin-kcard-add-btn').forEach(btn => {
    btn.addEventListener('click', () => _openCardModal(null, btn.dataset.col));
  });

  board.querySelectorAll('.admin-kcard').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('.admin-kcard-remove')) return;
      if (card.dataset.id === '__admin_demo__') return;
      const found = state.adminKanbanCards.find(c => c.id === card.dataset.id);
      if (found) _openCardModal(found, null);
    });
  });

  board.querySelectorAll('.admin-kcard-remove').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      state.adminKanbanCards = state.adminKanbanCards.filter(c => c.id !== btn.dataset.id);
      persistAdminKanbanCards();
      renderAdminKanbanBoard();
    });
  });

  if (_expandedCol) return; // no cross-column drag target while collapsed to one column

  // ===== drag-and-drop between/within columns =====
  // Mouse (native HTML5 drag-and-drop, dragstart/dragover/drop) and touch (manual — see
  // wireTouchDrag below) both funnel into the same performDrop() once a target is known, so the
  // actual reorder logic exists exactly once.
  let dragId = null;
  // Which column the drag started in, and (only meaningful within that same column) which card
  // it's currently hovering above/below — per direct request, reordering up/down within a
  // section is still precise; only a drop into a *different* section always lands at the top.
  let dragOriginCol = null;
  let dropTargetId = null;
  let dropPosition = null; // 'before' | 'after'

  function clearDropIndicators() {
    board.querySelectorAll('.kcard--drop-before, .kcard--drop-after')
      .forEach(c => c.classList.remove('kcard--drop-before', 'kcard--drop-after'));
    hidePlaceholder();
  }

  // ===== reorder placeholder — a dashed "landing spot" box, same floating-card language as the
  // touch ghost — so dragging a card up/down within its own section visibly shows where it will
  // land, per direct request ("I want to use the same floating card affect for up and down
  // dragging"). One shared node, moved to wherever it's currently needed rather than recreated
  // each time.
  let placeholderEl = null;

  function ensurePlaceholder(height) {
    if (!placeholderEl) {
      placeholderEl = document.createElement('div');
      placeholderEl.className = 'kcard-placeholder';
    }
    placeholderEl.style.height = `${height}px`;
    return placeholderEl;
  }

  function showPlaceholderAt(targetCard, before) {
    const ph = ensurePlaceholder(targetCard.getBoundingClientRect().height);
    targetCard.insertAdjacentElement(before ? 'beforebegin' : 'afterend', ph);
  }

  function showPlaceholderAtEnd(colEl) {
    const refCard = colEl.querySelector('.admin-kcard');
    const ph = ensurePlaceholder(refCard ? refCard.getBoundingClientRect().height : 100);
    colEl.appendChild(ph);
  }

  function hidePlaceholder() {
    placeholderEl?.remove();
  }

  function clearOverHighlight() {
    board.querySelectorAll('.kanban-column').forEach(col => {
      col.classList.remove('kanban-column--over');
      const hint = col.querySelector('.progress-drop-hint');
      if (hint) hint.style.opacity = '';
    });
  }

  // Shared commit step — colEl is the .admin-kanban-cards element being dropped into.
  function performDrop(colEl) {
    colEl.closest('.kanban-column').classList.remove('kanban-column--over');
    clearDropIndicators();
    if (!dragId) return;

    const draggedCard = state.adminKanbanCards.find(c => c.id === dragId);
    if (!draggedCard) { dragId = null; return; }

    const newStatus = colEl.dataset.col;
    // Within the same section, reordering up/down is still precise — drop on a specific card to
    // land exactly above/below it, or in empty space to land at the bottom. Only a drop into a
    // *different* section always lands at the top, per direct request.
    const targetOrder = _cardsInColumn(newStatus).filter(c => c.id !== dragId);
    let insertAt = targetOrder.length;
    if (newStatus === dragOriginCol) {
      if (dropTargetId && dropTargetId !== dragId) {
        const idx = targetOrder.findIndex(c => c.id === dropTargetId);
        if (idx !== -1) insertAt = dropPosition === 'before' ? idx : idx + 1;
      }
    } else {
      insertAt = 0;
    }
    targetOrder.splice(insertAt, 0, draggedCard);

    draggedCard.status = newStatus;
    targetOrder.forEach((c, i) => { c.manualOrder = i; });
    persistAdminKanbanCards();
    // Dragging only visibly reorders anything under "Custom order" — under any other active
    // sort, _cardsInColumn's own comparator would just re-sort right past whatever manualOrder
    // this drag just set, making the drag appear to silently do nothing. Same fix the real
    // board applies per-column (kanban.js's own drop handler sets state.kanbanSort[col] =
    // 'manual').
    if (state.adminKanbanSort !== 'manual') {
      state.adminKanbanSort = 'manual';
      storageSync.set({ savecraft_admin_kanban_sort: 'manual' });
    }

    const droppedId = draggedCard.id;
    dragId = null;
    dropTargetId = null;
    dropPosition = null;
    renderAdminKanbanBoard();
    flashJustDropped(droppedId);
    centerColumnInView(newStatus);
  }

  // Purple flash (kcard-drop-flash, kanban.css) on whichever card just landed, so it's still
  // identifiable a moment after the board re-renders and every card's position shifts. Queried
  // via `container` (the stable #cards-grid element, never itself replaced) rather than the
  // local `board` reference above — that one points at the specific .admin-kanban-board *node*
  // renderAdminKanbanBoard()'s innerHTML rebuild just discarded, not whatever replaced it.
  function flashJustDropped(id) {
    const el = container.querySelector(`.admin-kcard[data-id="${id}"]`);
    el?.classList.add('kcard--just-dropped');
  }

  // Scrolls the board so the column just dropped into is centered in view — per direct request
  // ("if I drop the card in a particular section, I want the mobile window to center on that
  // section"; previously the re-render left the board wherever it happened to already be
  // scrolled, usually back at "To Do"). Re-queries board fresh from `container` rather than using
  // the closed-over `board` reference above, same reason as flashJustDropped: that one points at
  // the specific .admin-kanban-board node renderAdminKanbanBoard()'s innerHTML rebuild just
  // discarded.
  function centerColumnInView(colKey) {
    const freshBoard = container.querySelector('.admin-kanban-board');
    const colEl = freshBoard?.querySelector(`.admin-kanban-cards[data-col="${colKey}"]`)?.closest('.kanban-column');
    if (!freshBoard || !colEl) return;
    const boardRect = freshBoard.getBoundingClientRect();
    const colRect = colEl.getBoundingClientRect();
    const target = freshBoard.scrollLeft + (colRect.left - boardRect.left) - (boardRect.width - colRect.width) / 2;
    freshBoard.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
  }

  board.querySelectorAll('.admin-kcard').forEach(card => {
    card.addEventListener('dragstart', e => {
      dragId = card.dataset.id;
      dragOriginCol = card.closest('.admin-kanban-cards')?.dataset.col || null;
      card.classList.add('kcard--dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('kcard--dragging');
      clearOverHighlight();
      clearDropIndicators();
      dragId = null;
      dropTargetId = null;
      dropPosition = null;
    });
    // Lets a card be dropped above/below any other card within its own section, so the user can
    // still drag it up/down to reorder — only relevant while hovering a card in the column the
    // drag started in; cards in other columns are still swallowed (below) but never targeted,
    // since crossing into a different section always lands at the top regardless.
    card.addEventListener('dragover', e => {
      e.preventDefault();
      if (!dragId || card.dataset.id === dragId) return;
      if (card.closest('.admin-kanban-cards')?.dataset.col !== dragOriginCol) return;
      const rect = card.getBoundingClientRect();
      const before = (e.clientY - rect.top) < rect.height / 2;
      dropTargetId = card.dataset.id;
      dropPosition = before ? 'before' : 'after';
      showPlaceholderAt(card, before);
    });
  });

  board.querySelectorAll('.admin-kanban-cards').forEach(col => {
    col.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      col.closest('.kanban-column').classList.add('kanban-column--over');
      const hint = col.querySelector('.progress-drop-hint');
      if (hint) hint.style.opacity = '0';
      // Hovering blank space (not a specific card) within the section the drag started in still
      // shows the floating placeholder, landing at the bottom — the per-card dragover above
      // already handles placement while actually over a card (this listener still fires too,
      // since dragover bubbles, so it's guarded to skip that case).
      if (dragId && col.dataset.col === dragOriginCol) {
        // Hovering the placeholder itself (the gap it just opened up) shouldn't move it —
        // otherwise this would treat "not directly over a real card" as "empty space" and snap
        // it to the bottom the instant it appeared under the cursor. Real bug, found and fixed.
        const overPlaceholder = placeholderEl && (e.target === placeholderEl || placeholderEl.contains(e.target));
        if (!overPlaceholder && !e.target.closest('.admin-kcard')) {
          dropTargetId = null;
          dropPosition = null;
          showPlaceholderAtEnd(col);
        }
      } else {
        // A different section — always lands at the top there, so there's nothing to preview.
        hidePlaceholder();
      }
    });
    col.addEventListener('dragleave', e => {
      if (!col.contains(e.relatedTarget)) {
        col.closest('.kanban-column').classList.remove('kanban-column--over');
        const hint = col.querySelector('.progress-drop-hint');
        if (hint) hint.style.opacity = '';
      }
    });
    col.addEventListener('drop', e => {
      e.preventDefault();
      performDrop(col);
    });
  });

  // ===== touch drag-and-drop =====
  // Native HTML5 drag-and-drop (dragstart/dragover/drop, wired above) never fires from a touch
  // interaction on iOS Safari — reported live ("can't drag on my iPhone"), and true of the real
  // Queue board too (same underlying API, see kanban.js's identical fix). This reimplements the
  // same interaction manually: track the touch, figure out what card/column is under the finger
  // on every move via elementFromPoint (there's no touch equivalent of dragover), reuse the exact
  // same visual feedback classes the mouse path already uses, and call the same performDrop() on
  // release.
  //
  // REAL BUG, found and fixed: an earlier version engaged a drag as soon as the touch moved past
  // a small threshold — but that's indistinguishable from the start of an ordinary scroll swipe
  // (both are "finger down on a card, then move vertically"), so it broke the ability to scroll
  // the column at all by touching a card first, which is most of the column's surface (reported
  // live: "unable to scroll"). Switched to a long-press to engage instead — hold still for
  // TOUCH_DRAG_HOLD_MS before a drag starts; move before that timer fires and this backs out
  // entirely (never calls preventDefault), leaving the gesture to the browser's own native scroll
  // handling, same as if these listeners weren't here at all.
  const TOUCH_DRAG_MOVE_CANCEL = 10; // px of movement before the hold timer fires -> treat as a scroll, not a drag
  const TOUCH_DRAG_HOLD_MS = 350;
  let touchStartX = 0, touchStartY = 0, touchDragging = false, touchCardEl = null, touchHoldTimer = null;

  function touchUpdateTargets(x, y) {
    // REAL BUG, found and fixed: once the placeholder appears mid-list, the finger is very often
    // hovering directly over the placeholder itself (the gap it just opened up) on the very next
    // touchmove — elementFromPoint then resolves to the placeholder, which isn't a .admin-kcard,
    // so this used to read as "empty space" and immediately snap the placeholder back to the
    // bottom of the column. That fought itself into a jittery loop the instant the placeholder
    // showed up, which read as dragging (and even scrolling, since the column is locked mid-drag)
    // simply not working at all. Leave the placeholder exactly where it is whenever the finger is
    // still over it — nothing to update.
    if (placeholderEl) {
      const phRect = placeholderEl.getBoundingClientRect();
      if (x >= phRect.left && x <= phRect.right && y >= phRect.top && y <= phRect.bottom) {
        return placeholderEl.closest('.admin-kanban-cards');
      }
    }
    const el = document.elementFromPoint(x, y);
    const overCard = el?.closest('.admin-kcard');
    const overCol = el?.closest('.admin-kanban-cards');
    clearDropIndicators();
    clearOverHighlight();
    // Only the column you'd actually be dropping into lights up — not wherever the card started,
    // even though that's technically "under" your finger too until you've moved it somewhere
    // else, per direct request.
    if (overCol && overCol.dataset.col !== dragOriginCol) {
      overCol.closest('.kanban-column').classList.add('kanban-column--over');
      const hint = overCol.querySelector('.progress-drop-hint');
      if (hint) hint.style.opacity = '0';
    }
    // Per-card before/after targeting only within the section the drag started in — so the user
    // can still drag a card up/down to reorder it there; crossing into a different section always
    // lands at the top regardless (performDrop), so there's nothing to target there.
    if (overCard && overCard.dataset.id !== dragId && overCol?.dataset.col === dragOriginCol) {
      const rect = overCard.getBoundingClientRect();
      const before = (y - rect.top) < rect.height / 2;
      dropTargetId = overCard.dataset.id;
      dropPosition = before ? 'before' : 'after';
      showPlaceholderAt(overCard, before);
    } else if (overCol && overCol.dataset.col === dragOriginCol) {
      // Over blank space within the section the drag started in (not a specific card) — still
      // preview landing at the bottom.
      dropTargetId = null;
      dropPosition = null;
      showPlaceholderAtEnd(overCol);
    }
    return overCol;
  }

  // ===== floating "ghost" — makes the card visibly follow the finger while dragging =====
  // Native mouse drag-and-drop gets this for free (the browser draws its own drag image); the
  // touch path has nothing built-in, so the card just sat in place dimmed with no sense of
  // "where it currently is" (reported live: "is there some way I can see the card appear to
  // drag"). A cloned, fixed-position, pointer-events:none copy tracks the finger directly —
  // pointer-events:none is what keeps it from shadowing the real card/column underneath it in
  // touchUpdateTargets' own elementFromPoint lookup.
  let touchGhostEl = null;

  function createTouchGhost(card, x, y) {
    const rect = card.getBoundingClientRect();
    const ghost = card.cloneNode(true);
    ghost.classList.add('kcard--ghost');
    ghost.style.position = 'fixed';
    ghost.style.left = `${rect.left}px`;
    ghost.style.top = `${rect.top}px`;
    ghost.style.width = `${rect.width}px`;
    ghost.style.height = `${rect.height}px`;
    ghost.style.pointerEvents = 'none';
    ghost.style.zIndex = '1000';
    ghost.dataset.offsetX = x - rect.left;
    ghost.dataset.offsetY = y - rect.top;
    document.body.appendChild(ghost);
    return ghost;
  }

  function moveTouchGhost(x, y) {
    if (!touchGhostEl) return;
    touchGhostEl.style.left = `${x - touchGhostEl.dataset.offsetX}px`;
    touchGhostEl.style.top = `${y - touchGhostEl.dataset.offsetY}px`;
  }

  function removeTouchGhost() {
    touchGhostEl?.remove();
    touchGhostEl = null;
  }

  // While a drag is actively engaged, none of the columns should be able to scroll underneath
  // the finger, per direct request. e.preventDefault() on touchmove alone isn't fully reliable
  // for this — iOS Safari only honors it if called on the very first touchmove of the whole
  // gesture, but the natural jitter of a real finger holding still through the long-press can
  // already nudge the column's native scroll before our timer even fires. Belt-and-suspenders:
  // flip every column's own overflow off outright for the duration of the drag, which stops
  // scrolling regardless of what iOS already decided.
  function lockColumnScroll() {
    board.querySelectorAll('.admin-kanban-cards').forEach(col => { col.style.overflowY = 'hidden'; });
  }
  function unlockColumnScroll() {
    board.querySelectorAll('.admin-kanban-cards').forEach(col => { col.style.overflowY = ''; });
  }

  // ===== auto-scroll the board horizontally while dragging near an edge =====
  // On mobile not all columns fit on screen at once, and a single finger can't both hold the
  // drag position AND perform a separate swipe-to-scroll gesture at the same time — so the
  // finger's own horizontal position drives an auto-scroll of the board's columns instead, per
  // direct request ("hold the card and scroll left or right... so I can place it in Done").
  // board itself (.admin-kanban-board) is the horizontally-scrollable flex row (overflow-x: auto).
  const EDGE_SCROLL_ZONE = 60;  // px from the board's left/right edge that triggers auto-scroll
  const EDGE_SCROLL_SPEED = 12; // px scrolled per animation frame
  let edgeScrollDir = 0; // -1 left, 0 none, 1 right
  let edgeScrollRAF = null;

  function edgeScrollStep() {
    if (!edgeScrollDir) { edgeScrollRAF = null; return; }
    board.scrollLeft += edgeScrollDir * EDGE_SCROLL_SPEED;
    edgeScrollRAF = requestAnimationFrame(edgeScrollStep);
  }

  function updateEdgeScroll(x) {
    const rect = board.getBoundingClientRect();
    let dir = 0;
    if (x < rect.left + EDGE_SCROLL_ZONE) dir = -1;
    else if (x > rect.right - EDGE_SCROLL_ZONE) dir = 1;
    edgeScrollDir = dir;
    if (dir && !edgeScrollRAF) edgeScrollRAF = requestAnimationFrame(edgeScrollStep);
  }

  function stopEdgeScroll() {
    edgeScrollDir = 0;
    if (edgeScrollRAF) { cancelAnimationFrame(edgeScrollRAF); edgeScrollRAF = null; }
  }

  board.querySelectorAll('.admin-kcard').forEach(card => {
    card.addEventListener('touchstart', e => {
      if (card.dataset.id === '__admin_demo__') return;
      const t = e.touches[0];
      touchStartX = t.clientX;
      touchStartY = t.clientY;
      touchDragging = false;
      touchCardEl = card;
      dragId = card.dataset.id;
      dragOriginCol = card.closest('.admin-kanban-cards')?.dataset.col || null;
      clearTimeout(touchHoldTimer);
      touchHoldTimer = setTimeout(() => {
        if (touchCardEl !== card) return; // finger already lifted, or moved enough to cancel below
        touchDragging = true;
        card.classList.add('kcard--dragging');
        touchGhostEl = createTouchGhost(card, touchStartX, touchStartY);
        lockColumnScroll();
      }, TOUCH_DRAG_HOLD_MS);
    }, { passive: true });

    card.addEventListener('touchmove', e => {
      if (!dragId || card !== touchCardEl) return;
      const t = e.touches[0];
      if (!touchDragging) {
        const dx = t.clientX - touchStartX, dy = t.clientY - touchStartY;
        if (Math.hypot(dx, dy) > TOUCH_DRAG_MOVE_CANCEL) {
          // Moved before the long-press engaged — a scroll attempt, not a drag. Back out
          // entirely; nothing was ever preventDefault'd, so the browser's native scroll just
          // continues handling this touch as normal.
          clearTimeout(touchHoldTimer);
          touchCardEl = null;
          dragId = null;
        }
        return;
      }
      e.preventDefault(); // actively dragging now — stop the page from also scrolling underneath it
      moveTouchGhost(t.clientX, t.clientY);
      touchUpdateTargets(t.clientX, t.clientY);
      updateEdgeScroll(t.clientX);
    }, { passive: false });

    card.addEventListener('touchend', e => {
      clearTimeout(touchHoldTimer);
      if (card !== touchCardEl) return;
      card.classList.remove('kcard--dragging');
      removeTouchGhost();
      unlockColumnScroll();
      stopEdgeScroll();
      if (touchDragging) {
        // touches is empty by now (finger already lifted) — changedTouches carries the release
        // position instead, same coordinates dragover would have reported at this point.
        const t = e.changedTouches[0];
        const overCol = touchUpdateTargets(t.clientX, t.clientY);
        if (overCol) performDrop(overCol);
        else { clearOverHighlight(); clearDropIndicators(); dragId = null; dropTargetId = null; dropPosition = null; }
      } else {
        dragId = null; // was just a tap (or a cancelled scroll attempt) — let the card's own click handler take it from here
      }
      touchCardEl = null;
      touchDragging = false;
    });

    card.addEventListener('touchcancel', () => {
      clearTimeout(touchHoldTimer);
      card.classList.remove('kcard--dragging');
      removeTouchGhost();
      unlockColumnScroll();
      stopEdgeScroll();
      clearOverHighlight();
      clearDropIndicators();
      dragId = null; dropTargetId = null; dropPosition = null;
      touchCardEl = null; touchDragging = false;
    });
  });
}
