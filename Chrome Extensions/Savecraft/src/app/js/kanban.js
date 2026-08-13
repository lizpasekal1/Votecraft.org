// ===== KANBAN BOARD ("My Saves Queue") =====

import { state, CATEGORIES, CAT_LABEL } from './state.js';
import { escapeHtml, catClass, badgeLabel, getListIds, isQueueDemoId } from './utils.js';
import { persistViewState, persistItem } from './storage.js';
import { openDetailModal } from './detailModal.js';
import { storageSync } from './platform.js';

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
  // The seeded queue-demo-N items (storage.js) keep a "D" placeholder letter regardless of their
  // own title's first letter, per direct request — a leftover visual marker for "this is demo
  // content" now that their titles themselves no longer carry a "Demo:" prefix saying so.
  const letter    = isQueueDemoId(item.id) ? 'D' : (item.title || '?')[0].toUpperCase();
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
  // Four Column stays denser (title + author only) so four comfortably fit per row.
  const showExtras = format !== 'four-col';
  const noteHtml = showExtras && noteText
    ? `<div class="kcard-note${format === 'detail' ? ' kcard-note--full' : ''}">${escapeHtml(noteText)}</div>` : '';

  return `
    <div class="kcard kcard--${format}${item._isDemo ? ' kcard--demo' : ''}" data-id="${item.id}" draggable="false">
      ${thumb}
      <div class="kcard-content">
        <div class="kcard-info">
          ${demoTag}
          ${renderKcardInfo(item)}
          ${noteHtml}
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
      storageSync.set({ savecraft_kanban_lists: state.kanbanLists });
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
  document.getElementById('btn-kanban-dashboard').style.display = '';
  document.getElementById('saves-list-wrap').style.display = '';
  document.getElementById('board-filter-wrap').style.display = '';
  document.getElementById('board-info-wrap').style.display = '';
  document.getElementById('sort-select').style.display = 'none';

  let queueItems = state.items.filter(i => i.queueStatus);
  if (state.kanbanCategory) {
    queueItems = queueItems.filter(i => i.category === state.kanbanCategory);
  }
  if (state.activeListId) {
    queueItems = queueItems.filter(i => getListIds(i).includes(state.activeListId));
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
    storageSync.set({ savecraft_tutorial_seen: true });
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
      storageSync.set({ savecraft_kanban_sort: state.kanbanSort });
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
    // Which column the drag started in, and (only meaningful within that same column) which
    // card it's currently hovering above/below — per direct request, reordering up/down within
    // a section is still precise; only a drop into a *different* section always lands at the top.
    let dragOriginCol = null;
    let dropTargetId = null;
    let dropPosition = null; // 'before' | 'after'

    function clearDropIndicators() {
      board.querySelectorAll('.kcard--drop-before, .kcard--drop-after').forEach(c => c.classList.remove('kcard--drop-before', 'kcard--drop-after'));
      hidePlaceholder();
    }

    // ===== reorder placeholder — a dashed "landing spot" box, same floating-card language as
    // the touch ghost — so dragging a card up/down within its own section visibly shows where it
    // will land, per direct request ("I want to use the same floating card affect for up and down
    // dragging"; a thin box-shadow line on the neighboring card wasn't reading as an actual
    // "floating card" cue). One shared node, moved to wherever it's currently needed rather than
    // recreated each time.
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
      const refCard = colEl.querySelector('.kcard');
      const ph = ensurePlaceholder(refCard ? refCard.getBoundingClientRect().height : 100);
      colEl.appendChild(ph);
    }

    function hidePlaceholder() {
      placeholderEl?.remove();
    }

    // The column's cards in their current on-screen order (respects whatever sort mode is
    // active), so dropping without a specific target card still inserts at a sensible spot.
    function currentColumnOrder(colKey) {
      return sortCards(allItems.filter(i => i.queueStatus === colKey && i.id !== '__demo__'), colKey);
    }

    function clearOverHighlight() {
      board.querySelectorAll('.kanban-column').forEach(col => {
        col.classList.remove('kanban-column--over');
        const hint = col.querySelector('.progress-drop-hint');
        if (hint) hint.style.opacity = '';
      });
    }

    // Shared commit step for both the mouse 'drop' handler and touch's touchend below, so the
    // actual reorder logic exists exactly once. colEl is the .kanban-cards element dropped into.
    async function performDrop(colEl) {
      colEl.closest('.kanban-column').classList.remove('kanban-column--over');
      clearDropIndicators();
      if (!dragId) return;
      const newStatus = colEl.dataset.col;
      if (dragId === '__demo__') {
        _demoStatus = newStatus;
        dragId = null;
        renderKanbanBoard();
        flashJustDropped('__demo__');
        centerColumnInView(newStatus);
        return;
      }

      const draggedItem = state.items.find(i => i.id === dragId);
      if (!draggedItem) { dragId = null; return; }

      // Within the same section, reordering up/down is still precise — drop on a specific card
      // to land exactly above/below it, or in empty space to land at the bottom. Only a drop into
      // a *different* section always lands at the top, per direct request. Then give every card
      // in the target column a fresh sequential manualOrder and switch it to "Custom order" — so
      // the manual position actually sticks instead of being immediately overridden by whatever
      // sort mode (newest/oldest/A→Z) was active before.
      const targetOrder = currentColumnOrder(newStatus).filter(i => i.id !== dragId);
      let insertAt = targetOrder.length;
      if (newStatus === dragOriginCol) {
        if (dropTargetId && dropTargetId !== dragId) {
          const idx = targetOrder.findIndex(i => i.id === dropTargetId);
          if (idx !== -1) insertAt = dropPosition === 'before' ? idx : idx + 1;
        }
      } else {
        insertAt = 0;
      }
      targetOrder.splice(insertAt, 0, draggedItem);

      draggedItem.queueStatus = newStatus;
      targetOrder.forEach((item, i) => { item.manualOrder = i; });
      state.kanbanSort[newStatus] = 'manual';
      storageSync.set({ savecraft_kanban_sort: state.kanbanSort });
      await Promise.all(targetOrder.map(item => persistItem(item)));

      const droppedId = draggedItem.id;
      dragId = null;
      dropTargetId = null;
      dropPosition = null;
      renderKanbanBoard();
      flashJustDropped(droppedId);
      centerColumnInView(newStatus);
    }

    // Purple flash (kcard-drop-flash, kanban.css) on whichever card just landed, so it's still
    // identifiable a moment after the board re-renders and every card's position shifts. Queried
    // via `container` (the stable #cards-grid element, never itself replaced) rather than the
    // local `board` reference above — that one points at the specific .kanban-board *node*
    // renderKanbanBoard()'s innerHTML rebuild just discarded, not whatever replaced it.
    function flashJustDropped(id) {
      const el = container.querySelector(`.kcard[data-id="${id}"]`);
      el?.classList.add('kcard--just-dropped');
    }

    // Scrolls the board so the column just dropped into is centered in view — per direct request
    // ("if I drop the card in a particular section, I want the mobile window to center on that
    // section"; previously the re-render left the board wherever it happened to already be
    // scrolled, usually back at "To Do"). Re-queries board fresh from `container` rather than
    // using the closed-over `board` reference above, same reason as flashJustDropped: that one
    // points at the specific .kanban-board node renderKanbanBoard()'s innerHTML rebuild just
    // discarded.
    function centerColumnInView(colKey) {
      const freshBoard = container.querySelector('.kanban-board');
      const colEl = freshBoard?.querySelector(`.kanban-cards[data-col="${colKey}"]`)?.closest('.kanban-column');
      if (!freshBoard || !colEl) return;
      const boardRect = freshBoard.getBoundingClientRect();
      const colRect = colEl.getBoundingClientRect();
      const target = freshBoard.scrollLeft + (colRect.left - boardRect.left) - (boardRect.width - colRect.width) / 2;
      freshBoard.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
    }

    board.querySelectorAll('.kcard').forEach(card => {
      card.addEventListener('dragstart', e => {
        dragId = card.dataset.id;
        dragOriginCol = card.closest('.kanban-cards')?.dataset.col || null;
        card.classList.add('kcard--dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      card.addEventListener('dragend', () => {
        card.classList.remove('kcard--dragging');
        clearOverHighlight();
        clearDropIndicators();
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
        if (card.closest('.kanban-cards')?.dataset.col !== dragOriginCol) return;
        const rect = card.getBoundingClientRect();
        const before = (e.clientY - rect.top) < rect.height / 2;
        dropTargetId = card.dataset.id;
        dropPosition = before ? 'before' : 'after';
        showPlaceholderAt(card, before);
      });
    });

    board.querySelectorAll('.kanban-cards').forEach(col => {
      col.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        col.closest('.kanban-column').classList.add('kanban-column--over');
        const hint = col.querySelector('.progress-drop-hint');
        if (hint) hint.style.opacity = '0';
        // Hovering blank space (not a specific card) within the section the drag started in
        // still shows the floating placeholder, landing at the bottom — the per-card dragover
        // above already handles placement while actually over a card (this listener still fires
        // too, since dragover bubbles, so it's guarded to skip that case and only cover the empty
        // space below/between cards).
        if (dragId && col.dataset.col === dragOriginCol) {
          // Hovering the placeholder itself (the gap it just opened up) shouldn't move it —
          // otherwise this would treat "not directly over a real card" as "empty space" and snap
          // it to the bottom the instant it appeared under the cursor. Real bug, found and fixed.
          const overPlaceholder = placeholderEl && (e.target === placeholderEl || placeholderEl.contains(e.target));
          if (!overPlaceholder && !e.target.closest('.kcard')) {
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
    // Native HTML5 drag-and-drop (wired above) never fires from a touch interaction on iOS
    // Safari — reported live ("can't drag on my iPhone"). Reimplemented manually: track the
    // touch, figure out what card/column is under the finger on every move via elementFromPoint
    // (there's no touch equivalent of dragover), reuse the exact same visual feedback classes the
    // mouse path already uses, and call the same performDrop() on release.
    //
    // REAL BUG, found and fixed: an earlier version engaged a drag as soon as the touch moved
    // past a small threshold — but that's indistinguishable from the start of an ordinary scroll
    // swipe (both are "finger down on a card, then move vertically"), so it broke the ability to
    // scroll the column at all by touching a card first, which is most of the column's surface
    // (reported live: "unable to scroll"). Switched to a long-press to engage instead — hold
    // still for TOUCH_DRAG_HOLD_MS before a drag starts; move before that timer fires and this
    // backs out entirely (never calls preventDefault), leaving the gesture to the browser's own
    // native scroll handling, same as if these listeners weren't here at all.
    const TOUCH_DRAG_MOVE_CANCEL = 10; // px of movement before the hold timer fires -> treat as a scroll, not a drag
    const TOUCH_DRAG_HOLD_MS = 350;
    let touchStartX = 0, touchStartY = 0, touchDragging = false, touchCardEl = null, touchHoldTimer = null;

    function touchUpdateTargets(x, y) {
      // REAL BUG, found and fixed: once the placeholder appears mid-list, the finger is very
      // often hovering directly over the placeholder itself (the gap it just opened up) on the
      // very next touchmove — elementFromPoint then resolves to the placeholder, which isn't a
      // .kcard, so this used to read as "empty space" and immediately snap the placeholder back
      // to the bottom of the column. That fought itself into a jittery loop the instant the
      // placeholder showed up, which read as dragging (and even scrolling, since the column is
      // locked mid-drag) simply not working at all. Leave the placeholder exactly where it is
      // whenever the finger is still over it — nothing to update.
      if (placeholderEl) {
        const phRect = placeholderEl.getBoundingClientRect();
        if (x >= phRect.left && x <= phRect.right && y >= phRect.top && y <= phRect.bottom) {
          return placeholderEl.closest('.kanban-cards');
        }
      }
      const el = document.elementFromPoint(x, y);
      const overCard = el?.closest('.kcard');
      const overCol = el?.closest('.kanban-cards');
      clearDropIndicators();
      clearOverHighlight();
      // Only the column you'd actually be dropping into lights up — not wherever the card
      // started, even though that's technically "under" your finger too until you've moved it
      // somewhere else, per direct request.
      if (overCol && overCol.dataset.col !== dragOriginCol) {
        overCol.closest('.kanban-column').classList.add('kanban-column--over');
        const hint = overCol.querySelector('.progress-drop-hint');
        if (hint) hint.style.opacity = '0';
      }
      // Per-card before/after targeting only within the section the drag started in — so the
      // user can still drag a card up/down to reorder it there; crossing into a different section
      // always lands at the top regardless (performDrop), so there's nothing to target there.
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
      // Set directly rather than relying on the CSS class alone — this is what keeps the ghost
      // from shadowing the real card/column underneath it in elementFromPoint (touchUpdateTargets).
      ghost.style.pointerEvents = 'none';
      ghost.style.zIndex = '1000';
      // Finger's offset from the card's own top-left corner, preserved for the life of the drag
      // so the ghost tracks naturally under the finger instead of snapping its corner there.
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
      board.querySelectorAll('.kanban-cards').forEach(col => { col.style.overflowY = 'hidden'; });
    }
    function unlockColumnScroll() {
      board.querySelectorAll('.kanban-cards').forEach(col => { col.style.overflowY = ''; });
    }

    // ===== auto-scroll the board horizontally while dragging near an edge =====
    // On mobile not all columns fit on screen at once, and a single finger can't both hold the
    // drag position AND perform a separate swipe-to-scroll gesture at the same time — so the
    // finger's own horizontal position drives an auto-scroll of the board's columns instead, per
    // direct request ("hold the card and scroll left or right... so I can place it in Done").
    // board itself (.kanban-board) is the horizontally-scrollable flex row (overflow-x: auto).
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

    board.querySelectorAll('.kcard').forEach(card => {
      card.addEventListener('touchstart', e => {
        const t = e.touches[0];
        touchStartX = t.clientX;
        touchStartY = t.clientY;
        touchDragging = false;
        touchCardEl = card;
        dragId = card.dataset.id;
        dragOriginCol = card.closest('.kanban-cards')?.dataset.col || null;
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
          const t = e.changedTouches[0]; // touches is empty by now; this carries the release position
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
}
