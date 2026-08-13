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
const EXPAND_ICON_SVG = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
const COLLAPSE_ICON_SVG = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>';

// Column currently expanded full-width, or null — not persisted, resets on reload, same as
// kanban.js's state.kanbanExpandedCol. No format picker here (unlike the real board): expanded
// just means a comfortable 2-column grid instead of the 1-across list.
let _expandedCol = null;

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
  const real = state.adminKanbanCards
    .filter(c => c.status === colKey)
    .sort((a, b) => (a.manualOrder ?? Infinity) - (b.manualOrder ?? Infinity) || a.createdAt - b.createdAt);
  if (colKey === 'todo' && state.adminKanbanCards.length === 0) return [_adminDemoCard()];
  return real;
}

// ===== card editor modal (built lazily, once) =====

let _modalEl = null;
// null while creating a brand-new card (column comes from the "+ Add card" button that opened
// it); the existing card object while editing one that already exists.
let _editingCard = null;
let _newCardColumn = null;
// Called after a save/delete instead of unconditionally re-rendering the full board — the modal
// can be opened from the Dashboard's mini-preview widget too (dashboard.js), where the full board
// isn't even on screen; unconditionally calling renderAdminKanbanBoard() there would silently
// navigate the user away from the Dashboard as a side effect of editing a card. Defaults to the
// full board's own re-render, which is what every board-opened card uses.
let _onModalDone = renderAdminKanbanBoard;

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
    const done = _onModalDone;
    _closeCardModal();
    done();
  });
  document.getElementById('admin-kcard-name-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); _saveCardModal(); }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) _closeCardModal();
  });

  return overlay;
}

// onDone (optional) overrides what re-renders after Save/Delete — defaults to the full board's
// own render. See _onModalDone's own comment above for why the Dashboard widget needs to pass
// its own, lighter refresh instead.
function _openCardModal(card, newInColumn, onDone) {
  _ensureModal();
  _editingCard = card || null;
  _newCardColumn = newInColumn || null;
  _onModalDone = onDone || renderAdminKanbanBoard;

  document.getElementById('admin-kcard-modal-title').textContent = card ? 'Edit Task' : 'New Task';
  document.getElementById('admin-kcard-name-input').value = card?.name || '';
  document.getElementById('admin-kcard-details-input').value = card?.details || '';
  document.getElementById('admin-kcard-urgency-input').value = card?.urgency ?? '';
  // Nothing to delete yet on a brand-new, unsaved card.
  document.getElementById('admin-kcard-delete-btn').style.display = card ? '' : 'none';

  _modalEl.classList.add('open');
  document.getElementById('admin-kcard-name-input').focus();
}

// Exported so dashboard.js's mini-preview cards can open the same editor — see _onModalDone's
// comment for why it passes its own refresh callback rather than relying on the default.
export function openAdminCardEditor(card, onDone) {
  _openCardModal(card, null, onDone);
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
  const done = _onModalDone;
  _closeCardModal();
  done();
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
      <button class="admin-kcard-add-btn" data-col="${col.key}">+ Add card</button>
    </div>`;
}

export function renderAdminKanbanBoard() {
  const container = document.getElementById('cards-grid');
  // Visible page title (unlike the real board, which hides #grid-title and relies on its own
  // saves-list dropdown instead) — Admin Kanban has no such dropdown, so a plain title sits above
  // the board instead, per direct request.
  const gridTitle = document.getElementById('grid-title');
  gridTitle.textContent = 'Admin Kanban';
  gridTitle.style.display = '';
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
    <div class="kanban-board admin-kanban-board${_expandedCol ? ' kanban-board--expanded' : ''}">
      ${columns.map(renderAdminColumn).join('')}
    </div>`;

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
  // Same shape as kanban.js's own wiring, simplified: no sort-mode bookkeeping to preserve,
  // manualOrder is the only ordering signal here.
  let dragId = null;
  let dropTargetId = null;
  let dropPosition = null; // 'before' | 'after'

  function clearDropIndicators() {
    board.querySelectorAll('.kcard--drop-before, .kcard--drop-after')
      .forEach(c => c.classList.remove('kcard--drop-before', 'kcard--drop-after'));
  }

  board.querySelectorAll('.admin-kcard').forEach(card => {
    card.addEventListener('dragstart', e => {
      dragId = card.dataset.id;
      card.classList.add('kcard--dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('kcard--dragging');
      board.querySelectorAll('.kanban-column').forEach(col => col.classList.remove('kanban-column--over'));
      clearDropIndicators();
      dragId = null;
      dropTargetId = null;
      dropPosition = null;
    });
    card.addEventListener('dragover', e => {
      e.preventDefault();
      if (!dragId || card.dataset.id === dragId) return;
      const rect = card.getBoundingClientRect();
      const before = (e.clientY - rect.top) < rect.height / 2;
      dropTargetId = card.dataset.id;
      dropPosition = before ? 'before' : 'after';
      clearDropIndicators();
      card.classList.add(before ? 'kcard--drop-before' : 'kcard--drop-after');
    });
  });

  board.querySelectorAll('.admin-kanban-cards').forEach(col => {
    col.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      col.closest('.kanban-column').classList.add('kanban-column--over');
      const hint = col.querySelector('.progress-drop-hint');
      if (hint) hint.style.opacity = '0';
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
      col.closest('.kanban-column').classList.remove('kanban-column--over');
      clearDropIndicators();
      if (!dragId) return;

      const draggedCard = state.adminKanbanCards.find(c => c.id === dragId);
      if (!draggedCard) { dragId = null; return; }

      const newStatus = col.dataset.col;
      const targetOrder = _cardsInColumn(newStatus).filter(c => c.id !== dragId);
      let insertAt = targetOrder.length;
      if (dropTargetId && dropTargetId !== dragId) {
        const idx = targetOrder.findIndex(c => c.id === dropTargetId);
        if (idx !== -1) insertAt = dropPosition === 'before' ? idx : idx + 1;
      }
      targetOrder.splice(insertAt, 0, draggedCard);

      draggedCard.status = newStatus;
      targetOrder.forEach((c, i) => { c.manualOrder = i; });
      persistAdminKanbanCards();

      dragId = null;
      dropTargetId = null;
      dropPosition = null;
      renderAdminKanbanBoard();
    });
  });
}
