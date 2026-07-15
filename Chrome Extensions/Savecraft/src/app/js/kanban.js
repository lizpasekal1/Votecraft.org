// ===== KANBAN BOARD ("My Saves Queue") =====

import { state, CATEGORIES, CAT_LABEL } from './state.js';
import { escapeHtml, catClass, badgeLabel } from './utils.js';
import { persistViewState, persistItem } from './storage.js';
import { openDetailModal } from './detailModal.js';

export const KANBAN_COLUMNS = [
  { key: 'in-queue',     label: 'QUEUE' },
  { key: 'in-progress',  label: 'IN PROGRESS' },
  { key: 'my-review',    label: 'MY NOTES' },
  { key: 'done',         label: 'ARCHIVE' },
];

// Card/grid formats offered by the format picker once a column is expanded full-width. The
// first two control cards-per-row (a grid-density choice); the last three control what a card
// actually shows (a content-density choice) — see renderKanbanCard()'s format branches.
const KANBAN_EXPANDED_FORMATS = [
  { key: 'two-col',  label: 'Two Column' },
  { key: 'four-col', label: 'Four Column' },
  { key: 'large',    label: 'Large Card' },
  { key: 'detail',   label: 'Detail Card' },
  { key: 'simple',   label: 'Simple Text' },
];

// Same top-right circular button in both states — a plain "+" when this column can be expanded,
// swapping to a purple "−" (via .kanban-expand-btn--active in CSS) when it's the one currently
// expanded, so clicking it again visibly reads as "shrink back down."
const EXPAND_ICON_SVG = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
const COLLAPSE_ICON_SVG = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>';

let _demoStatus = 'in-queue';
let _kanbanSortListenerAdded = false;
export function KANBAN_DEMO() {
  return {
    id: '__demo__',
    title: 'Drag to progress',
    category: 'Books',
    imageUrl: null,
    queueStatus: _demoStatus,
    _isDemo: true,
  };
}

// Any item with an author (Music Album, Book, etc.) gets the same artist/title text hierarchy
// as the main grid's cards (.card-author-name/.card-title--album in cards.css) — small gray
// byline above a bold title, instead of the plain title-then-author stacking every other card
// uses. Release year (Music Album's own field) shows below the title when present.
function renderKcardInfo(item) {
  if (item.author) {
    const authorDisplay = escapeHtml(item.author) + (item.authorHasMore ? ' …' : '');
    return `
      <div class="kcard-artist">${authorDisplay}</div>
      <div class="kcard-title kcard-title--byline">${escapeHtml(item.title || '?')}</div>
      ${item.year ? `<div class="kcard-year">${escapeHtml(item.year)}</div>` : ''}
    `;
  }
  return `<div class="kcard-title">${escapeHtml(item.title || '?')}</div>`;
}

// `format` is only ever set while a column is expanded (see KANBAN_EXPANDED_FORMATS) — with no
// format, this renders the exact same card the normal 4-column board has always shown.
function renderKanbanCard(item, format = null) {
  const letter    = (item.title || '?')[0].toUpperCase();
  const thumb     = item.imageUrl
    ? `<img class="kcard-thumb" src="${escapeHtml(item.imageUrl)}" alt="" loading="lazy" decoding="async" onerror="this.style.display='none'">`
    : `<div class="kcard-thumb kcard-thumb--placeholder placeholder-${catClass(item.category)}">${letter}</div>`;

  const demoTag   = item._isDemo ? `<span class="kcard-demo-badge">DEMO</span>` : '';
  const removeBtn = !item._isDemo
    ? `<button class="kcard-remove" data-id="${item.id}" title="Remove from board">✕</button>` : '';
  const badge     = `<span class="kcard-badge badge-${catClass(item.category)}">${badgeLabel(item.category)}</span>`;

  if (!format) {
    return `
      <div class="kcard${item._isDemo ? ' kcard--demo' : ''}" data-id="${item.id}" draggable="true"${item._isDemo ? ' title="Open any item and tap \'Add to Queue\' to add it here"' : ''}>
        ${thumb}
        <div class="kcard-content">
          <div class="kcard-info">
            ${demoTag}
            ${renderKcardInfo(item)}
          </div>
          ${removeBtn}
        </div>
        ${badge}
      </div>`;
  }

  // Cross-column drag targets (the other three columns) aren't in the DOM while expanded, so
  // dragging is disabled entirely for every formatted card — see the wiring in renderKanbanBoard().
  if (format === 'simple') {
    return `
      <div class="kcard kcard--simple${item._isDemo ? ' kcard--demo' : ''}" data-id="${item.id}" draggable="false">
        <div class="kcard-title">${escapeHtml(item.title || '?')}</div>
        ${badge}
        ${removeBtn}
      </div>`;
  }

  const noteText = item.notes || item.summary || '';
  const dateText = item.savedAt ? new Date(item.savedAt).toLocaleDateString() : '';
  // Four Column stays denser (title + author only) so four comfortably fit per row.
  const showExtras = format !== 'four-col';
  const noteHtml = showExtras && noteText
    ? `<div class="kcard-note${format === 'detail' ? ' kcard-note--full' : ''}">${escapeHtml(noteText)}</div>` : '';
  const dateHtml = showExtras && dateText ? `<div class="kcard-date">Saved ${dateText}</div>` : '';

  return `
    <div class="kcard kcard--${format}${item._isDemo ? ' kcard--demo' : ''}" data-id="${item.id}" draggable="false">
      ${thumb}
      <div class="kcard-content">
        <div class="kcard-info">
          ${demoTag}
          ${renderKcardInfo(item)}
          ${noteHtml}
          ${dateHtml}
        </div>
        ${removeBtn}
      </div>
      ${badge}
    </div>`;
}

function renderBoardFilterDropdown() {
  const dd = document.getElementById('board-filter-dropdown');
  if (!dd) return;
  const labelEl = document.getElementById('board-filter-label');
  if (labelEl) labelEl.textContent = state.kanbanCategory ? (CAT_LABEL[state.kanbanCategory] || state.kanbanCategory).toUpperCase() : 'CATEGORIES';

  // Same list/order/labels the sidebar shows — excludes Music Album (folded into Musician's
  // "Music Albums" subfolder there, never its own top-level entry).
  const allOption = `<button class="saves-list-option${!state.kanbanCategory ? ' active' : ''}" data-cat="">All Categories</button>`;
  const catOptions = CATEGORIES.filter(cat => cat !== 'Music Album').map(cat =>
    `<button class="saves-list-option${state.kanbanCategory === cat ? ' active' : ''}" data-cat="${cat}">${CAT_LABEL[cat] || cat}</button>`
  ).join('');
  dd.innerHTML = allOption + `<div class="saves-list-divider"></div>` + catOptions;

  dd.querySelectorAll('.saves-list-option').forEach(opt => {
    opt.addEventListener('click', e => {
      e.stopPropagation();
      state.kanbanCategory = opt.dataset.cat || null;
      dd.setAttribute('hidden', '');
      renderKanbanBoard();
    });
  });
}

function renderSavesListDropdown() {
  const dd = document.getElementById('saves-list-dropdown');
  if (!dd) return;
  const activeList = state.kanbanLists.find(l => l.id === state.activeListId);
  const activeLabel = activeList ? activeList.name : 'All Queues';
  const labelEl = document.getElementById('saves-list-label');
  if (labelEl) labelEl.textContent = activeLabel.toUpperCase();

  const allOption = `<button class="saves-list-option${!state.activeListId ? ' active' : ''}" data-list="">All Queues</button>`;
  const listOptions = state.kanbanLists.map(l =>
    `<button class="saves-list-option${state.activeListId === l.id ? ' active' : ''}" data-list="${l.id}">${l.name}</button>`
  ).join('');
  dd.innerHTML = allOption + listOptions
    + `<div class="saves-list-divider"></div>`
    + `<button class="saves-list-option saves-list-add" id="btn-add-new-list">+ Add list</button>`;

  dd.querySelectorAll('.saves-list-option:not(.saves-list-add)').forEach(opt => {
    opt.addEventListener('click', e => {
      e.stopPropagation();
      state.activeListId = opt.dataset.list || null;
      dd.setAttribute('hidden', '');
      renderKanbanBoard();
    });
  });

  document.getElementById('btn-add-new-list')?.addEventListener('click', e => {
    e.stopPropagation();
    dd.innerHTML = `
      <div class="saves-list-new-wrap" id="saves-list-new-wrap">
        <input class="saves-list-new-input" id="saves-list-new-input" placeholder="List name…" maxlength="40" autofocus>
        <button class="saves-list-new-confirm" id="saves-list-new-confirm">Create</button>
        <button class="saves-list-new-cancel" id="saves-list-new-cancel">✕</button>
      </div>`;
    dd.querySelector('.saves-list-new-wrap')?.addEventListener('click', ev => ev.stopPropagation());
    const input = document.getElementById('saves-list-new-input');
    input?.focus();
    const cancelList = () => { renderSavesListDropdown(); };
    const createList = () => {
      const name = input?.value.trim();
      if (!name) { cancelList(); return; }
      const id = 'list-' + Date.now();
      state.kanbanLists.push({ id, name });
      chrome.storage.sync.set({ savecraft_kanban_lists: state.kanbanLists });
      state.activeListId = id;
      dd.setAttribute('hidden', '');
      renderKanbanBoard();
    };
    document.getElementById('saves-list-new-confirm')?.addEventListener('click', createList);
    document.getElementById('saves-list-new-cancel')?.addEventListener('click', e => { e.stopPropagation(); cancelList(); });
    input?.addEventListener('keydown', ev => { if (ev.key === 'Enter') createList(); if (ev.key === 'Escape') cancelList(); });
  });
}

export function renderKanbanBoard() {
  const container = document.getElementById('cards-grid');
  const gridTitle = document.getElementById('grid-title');
  gridTitle.textContent = '';
  gridTitle.style.display = 'none';
  container.className = 'kanban-wrap';

  renderSavesListDropdown();
  renderBoardFilterDropdown();
  document.getElementById('saves-list-wrap').style.display = '';
  document.getElementById('board-filter-wrap').style.display = '';
  document.getElementById('board-info-wrap').style.display = '';
  document.getElementById('sort-select').style.display = 'none';

  let queueItems = state.items.filter(i => i.queueStatus);
  if (state.kanbanCategory) {
    queueItems = queueItems.filter(i => i.category === state.kanbanCategory);
  }
  if (state.activeListId) {
    queueItems = queueItems.filter(i => {
      const ids = Array.isArray(i.listIds) ? i.listIds : (i.listId ? [i.listId] : []);
      return ids.includes(state.activeListId);
    });
  }
  const isSearching = !!state.search;
  if (isSearching) {
    const q = state.search.toLowerCase();
    queueItems = queueItems.filter(i =>
      (i.title || '').toLowerCase().includes(q) ||
      (i.url   || '').toLowerCase().includes(q)
    );
  }

  const useDemo = queueItems.length === 0 && !isSearching && state.items.filter(i => i.queueStatus).length === 0;
  const allItems = useDemo ? [KANBAN_DEMO()] : queueItems;

  document.getElementById('sort-select').style.display = 'none';

  function sortCards(cards, colKey) {
    const s = state.kanbanSort[colKey] || 'newest';
    const c = [...cards];
    switch (s) {
      case 'newest': return c.sort((a, b) => b.savedAt - a.savedAt);
      case 'oldest': return c.sort((a, b) => a.savedAt - b.savedAt);
      case 'az':     return c.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      case 'za':     return c.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
      // Dragging a card up/down within a column (see the per-card dragover/drop wiring below)
      // assigns every card in that column a fresh sequential manualOrder and switches the
      // column to this mode — falls back to savedAt for any card that's never been touched by
      // a drag yet (manualOrder still undefined), so newly-queued cards land in a sane spot
      // instead of jumping to the very front.
      case 'manual': return c.sort((a, b) => (a.manualOrder ?? Infinity) - (b.manualOrder ?? Infinity) || b.savedAt - a.savedAt);
      default: return c;
    }
  }

  const SORT_LABELS = { newest: 'Newest first', oldest: 'Oldest first', az: 'A → Z', za: 'Z → A', manual: 'Custom order' };

  // Shared by both layouts below — just the label + sort control row.
  function renderColumnTitle(col, currentSort) {
    return `
      <div class="kanban-column-title">
        ${col.label}
        <button class="kanban-sort-btn" data-col="${col.key}" title="Sort ${col.label}">
          <svg width="10" height="10" viewBox="0 0 10 6" fill="currentColor"><path d="M0 0l5 6 5-6z"/></svg>
        </button>
        <div class="kanban-sort-dropdown" data-col="${col.key}" hidden>
          ${Object.entries(SORT_LABELS).map(([k, label]) =>
            `<button class="kanban-sort-option${k === currentSort ? ' active' : ''}" data-col="${col.key}" data-sort="${k}">${label}</button>`
          ).join('')}
        </div>
      </div>`;
  }

  if (isSearching && allItems.length === 0) {
    container.innerHTML = `
      <div class="kanban-board">
        <div class="kanban-no-results">🔍 No results for "<strong>${escapeHtml(state.search)}</strong>"</div>
      </div>`;
  } else if (state.kanbanExpandedCol) {
    const col = KANBAN_COLUMNS.find(c => c.key === state.kanbanExpandedCol);
    const format = state.kanbanExpandedFormat;
    const cards = sortCards(allItems.filter(i => i.queueStatus === col.key), col.key);
    const currentSort = state.kanbanSort[col.key] || 'newest';
    // Format picker sits in the top-right corner, positioned via CSS right next to the
    // collapse button — not inline in the centered title row like the sort control.
    const formatPicker = `
      <button class="kanban-format-btn" title="Card format">
        <span class="kanban-format-btn-label">${KANBAN_EXPANDED_FORMATS.find(f => f.key === format)?.label || ''}</span>
        <svg width="10" height="10" viewBox="0 0 10 6" fill="currentColor"><path d="M0 0l5 6 5-6z"/></svg>
      </button>
      <div class="kanban-format-dropdown" hidden>
        ${KANBAN_EXPANDED_FORMATS.map(f =>
          `<button class="kanban-format-option${f.key === format ? ' active' : ''}" data-format="${f.key}">${f.label}</button>`
        ).join('')}
      </div>`;
    container.innerHTML = `
      <div class="kanban-board kanban-board--expanded">
        <div class="kanban-column kanban-column--expanded">
          ${formatPicker}
          <button class="kanban-expand-btn kanban-expand-btn--active" data-col="${col.key}" title="Shrink back to the full board">
            ${COLLAPSE_ICON_SVG}
          </button>
          ${renderColumnTitle(col, currentSort)}
          <div class="kanban-cards kanban-cards--${format}" data-col="${col.key}">
            ${cards.map(item => renderKanbanCard(item, format)).join('') || '<div class="kanban-empty"></div>'}
          </div>
        </div>
      </div>`;
  } else {
    container.innerHTML = `<div class="kanban-board">` + KANBAN_COLUMNS.map(col => {
      const cards = sortCards(allItems.filter(i => i.queueStatus === col.key), col.key);
      const currentSort = state.kanbanSort[col.key] || 'newest';
      return `
        <div class="kanban-column">
          <button class="kanban-expand-btn" data-col="${col.key}" title="Expand ${col.label}">
            ${EXPAND_ICON_SVG}
          </button>
          ${renderColumnTitle(col, currentSort)}
          <div class="kanban-cards" data-col="${col.key}">
            ${cards.map(item => renderKanbanCard(item)).join('') || (() => {
              const hints = { 'in-progress': 'Drag cards to progress', 'my-review': 'Drag cards to my notes', 'done': 'Drag cards to archive' };
              return hints[col.key] ? `<div class="progress-drop-hint">${hints[col.key]}</div>` : '<div class="kanban-empty"></div>';
            })()}
          </div>
        </div>`;
    }).join('') + `</div>`;
  }

  if (!state.tutorialSeen) {
    document.getElementById('board-info-popup').removeAttribute('hidden');
    state.tutorialSeen = true;
    chrome.storage.sync.set({ savecraft_tutorial_seen: true });
  }

  persistViewState();

  const board = container.querySelector('.kanban-board') || container;

  board.querySelectorAll('.kanban-expand-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const col = btn.dataset.col;
      state.kanbanExpandedCol = state.kanbanExpandedCol === col ? null : col;
      renderKanbanBoard();
    });
  });
  board.querySelectorAll('.kanban-sort-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const col = btn.dataset.col;
      const dropdown = board.querySelector(`.kanban-sort-dropdown[data-col="${col}"]`);
      const isOpen = !dropdown.hidden;
      board.querySelectorAll('.kanban-sort-dropdown, .kanban-format-dropdown').forEach(d => d.setAttribute('hidden', ''));
      if (!isOpen) dropdown.removeAttribute('hidden');
    });
  });
  board.querySelectorAll('.kanban-sort-option').forEach(opt => {
    opt.addEventListener('click', async e => {
      e.stopPropagation();
      const { col, sort } = opt.dataset;
      state.kanbanSort[col] = sort;
      chrome.storage.sync.set({ savecraft_kanban_sort: state.kanbanSort });
      renderKanbanBoard();
    });
  });
  board.querySelectorAll('.kanban-format-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const dropdown = board.querySelector('.kanban-format-dropdown');
      const isOpen = !dropdown.hidden;
      board.querySelectorAll('.kanban-sort-dropdown, .kanban-format-dropdown').forEach(d => d.setAttribute('hidden', ''));
      if (!isOpen) dropdown.removeAttribute('hidden');
    });
  });
  board.querySelectorAll('.kanban-format-option').forEach(opt => {
    opt.addEventListener('click', e => {
      e.stopPropagation();
      state.kanbanExpandedFormat = opt.dataset.format;
      renderKanbanBoard();
    });
  });
  if (!_kanbanSortListenerAdded) {
    _kanbanSortListenerAdded = true;
    document.addEventListener('click', () => {
      document.querySelectorAll('.kanban-sort-dropdown, .kanban-format-dropdown').forEach(d => d.setAttribute('hidden', ''));
    });
  }

  board.querySelectorAll('.kcard').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('.kcard-remove')) return;
      const id = card.dataset.id;
      if (id === '__demo__') return;
      const item = state.items.find(i => i.id === id);
      if (item) openDetailModal(item);
    });
  });

  board.querySelectorAll('.kcard-remove').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const item = state.items.find(i => i.id === id);
      if (!item) return;
      item.queueStatus = null;
      await persistItem(item);
      renderKanbanBoard();
    });
  });

  // Drag-and-drop between columns only makes sense when all four columns are actually on
  // screen — while one is expanded, the other three (the only other valid drop targets) aren't
  // in the DOM at all, so cards render with draggable="false" and none of this gets wired up.
  if (!state.kanbanExpandedCol) {
    let dragId = null;
    // Which card (and above/below it) the dragged card would land on if dropped right now —
    // tracked via per-card dragover below, read at drop time to place the card exactly where
    // the user is hovering rather than always appending to the end of the column.
    let dropTargetId = null;
    let dropPosition = null; // 'before' | 'after'

    function clearDropIndicators() {
      board.querySelectorAll('.kcard--drop-before, .kcard--drop-after').forEach(c => c.classList.remove('kcard--drop-before', 'kcard--drop-after'));
    }

    // The column's cards in their current on-screen order (respects whatever sort mode is
    // active), so dropping without a specific target card still inserts at a sensible spot.
    function currentColumnOrder(colKey) {
      return sortCards(allItems.filter(i => i.queueStatus === colKey && i.id !== '__demo__'), colKey);
    }

    board.querySelectorAll('.kcard').forEach(card => {
      card.addEventListener('dragstart', e => {
        dragId = card.dataset.id;
        dropTargetId = null;
        dropPosition = null;
        card.classList.add('kcard--dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      card.addEventListener('dragend', () => {
        card.classList.remove('kcard--dragging');
        board.querySelectorAll('.kanban-column').forEach(col => col.classList.remove('kanban-column--over'));
        clearDropIndicators();
        dropTargetId = null;
        dropPosition = null;
      });
      // Lets a card be dropped above/below any other card, not just anywhere in the column —
      // this is what actually lets the user move a card up or down within the same column.
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

    board.querySelectorAll('.kanban-cards').forEach(col => {
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
      col.addEventListener('drop', async e => {
        e.preventDefault();
        col.closest('.kanban-column').classList.remove('kanban-column--over');
        clearDropIndicators();
        if (!dragId) return;
        const newStatus = col.dataset.col;
        if (dragId === '__demo__') { _demoStatus = newStatus; dragId = null; dropTargetId = null; dropPosition = null; renderKanbanBoard(); return; }

        const draggedItem = state.items.find(i => i.id === dragId);
        if (!draggedItem) { dragId = null; return; }

        // Re-insert the dragged card into the target column's order at the exact spot it was
        // dropped, then give every card in that column a fresh sequential manualOrder and switch
        // the column to "Custom order" — so the manual position actually sticks instead of being
        // immediately overridden by whatever sort mode (newest/oldest/A→Z) was active before.
        const targetOrder = currentColumnOrder(newStatus).filter(i => i.id !== dragId);
        let insertAt = targetOrder.length;
        if (dropTargetId && dropTargetId !== dragId) {
          const idx = targetOrder.findIndex(i => i.id === dropTargetId);
          if (idx !== -1) insertAt = dropPosition === 'before' ? idx : idx + 1;
        }
        targetOrder.splice(insertAt, 0, draggedItem);

        draggedItem.queueStatus = newStatus;
        targetOrder.forEach((item, i) => { item.manualOrder = i; });
        state.kanbanSort[newStatus] = 'manual';
        chrome.storage.sync.set({ savecraft_kanban_sort: state.kanbanSort });
        await Promise.all(targetOrder.map(item => persistItem(item)));

        dragId = null;
        dropTargetId = null;
        dropPosition = null;
        renderKanbanBoard();
      });
    });
  }
}
