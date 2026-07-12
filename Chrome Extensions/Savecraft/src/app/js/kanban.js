// ===== KANBAN BOARD ("My Saves Queue") =====

import { state, CATEGORIES } from './state.js';
import { escapeHtml, catClass, badgeLabel } from './utils.js';
import { persistViewState, persistItem } from './storage.js';
import { openDetailModal } from './detailModal.js';

export const KANBAN_COLUMNS = [
  { key: 'in-queue',     label: 'QUEUE' },
  { key: 'in-progress',  label: 'IN PROGRESS' },
  { key: 'my-review',    label: 'MY NOTES' },
  { key: 'done',         label: 'ARCHIVE' },
];

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

function renderKanbanCard(item) {
  const letter    = (item.title || '?')[0].toUpperCase();
  const thumb     = item.imageUrl
    ? `<img class="kcard-thumb" src="${escapeHtml(item.imageUrl)}" alt="" loading="lazy" decoding="async" onerror="this.style.display='none'">`
    : `<div class="kcard-thumb kcard-thumb--placeholder placeholder-${catClass(item.category)}">${letter}</div>`;

  const demoTag   = item._isDemo ? `<span class="kcard-demo-badge">DEMO</span>` : '';
  const removeBtn = !item._isDemo
    ? `<button class="kcard-remove" data-id="${item.id}" title="Remove from board">✕</button>` : '';

  return `
    <div class="kcard${item._isDemo ? ' kcard--demo' : ''}" data-id="${item.id}" draggable="true"${item._isDemo ? ' title="Open any item and tap \'Add to Queue\' to add it here"' : ''}>
      ${thumb}
      <div class="kcard-content">
        <div class="kcard-info">
          ${demoTag}
          <div class="kcard-title">${escapeHtml(item.title || '?')}</div>
          ${item.author ? `<div class="kcard-author">${escapeHtml(item.author)}</div>` : ''}
        </div>
        ${removeBtn}
      </div>
      <span class="kcard-badge badge-${catClass(item.category)}">${badgeLabel(item.category)}</span>
    </div>`;
}

function renderBoardFilterDropdown() {
  const dd = document.getElementById('board-filter-dropdown');
  if (!dd) return;
  const labelEl = document.getElementById('board-filter-label');
  if (labelEl) labelEl.textContent = state.kanbanCategory ? state.kanbanCategory.toUpperCase() : 'CATEGORIES';

  const allOption = `<button class="saves-list-option${!state.kanbanCategory ? ' active' : ''}" data-cat="">All Categories</button>`;
  const catOptions = CATEGORIES.map(cat =>
    `<button class="saves-list-option${state.kanbanCategory === cat ? ' active' : ''}" data-cat="${cat}">${cat}</button>`
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
      default: return c;
    }
  }

  const SORT_LABELS = { newest: 'Newest first', oldest: 'Oldest first', az: 'A → Z', za: 'Z → A' };

  if (isSearching && allItems.length === 0) {
    container.innerHTML = `
      <div class="kanban-board">
        <div class="kanban-no-results">🔍 No results for "<strong>${escapeHtml(state.search)}</strong>"</div>
      </div>`;
  } else {
    container.innerHTML = `<div class="kanban-board">` + KANBAN_COLUMNS.map(col => {
      const cards = sortCards(allItems.filter(i => i.queueStatus === col.key), col.key);
      const currentSort = state.kanbanSort[col.key] || 'newest';
      return `
        <div class="kanban-column">
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
          </div>
          <div class="kanban-cards" data-col="${col.key}">
            ${cards.map(renderKanbanCard).join('') || (() => {
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

  board.querySelectorAll('.kanban-sort-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const col = btn.dataset.col;
      const dropdown = board.querySelector(`.kanban-sort-dropdown[data-col="${col}"]`);
      const isOpen = !dropdown.hidden;
      board.querySelectorAll('.kanban-sort-dropdown').forEach(d => d.setAttribute('hidden', ''));
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
  if (!_kanbanSortListenerAdded) {
    _kanbanSortListenerAdded = true;
    document.addEventListener('click', () => {
      document.querySelectorAll('.kanban-sort-dropdown').forEach(d => d.setAttribute('hidden', ''));
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

  let dragId = null;
  board.querySelectorAll('.kcard').forEach(card => {
    card.addEventListener('dragstart', e => {
      dragId = card.dataset.id;
      card.classList.add('kcard--dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('kcard--dragging');
      board.querySelectorAll('.kanban-column').forEach(col => col.classList.remove('kanban-column--over'));
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
      if (!dragId) return;
      const newStatus = col.dataset.col;
      if (dragId === '__demo__') { _demoStatus = newStatus; dragId = null; renderKanbanBoard(); }
      else { await updateQueueStatus(dragId, newStatus); dragId = null; }
    });
  });
}

export async function updateQueueStatus(id, newStatus) {
  const item = state.items.find(i => i.id === id);
  if (!item) return;
  item.queueStatus = newStatus;
  await persistItem(item);
  renderKanbanBoard();
}
