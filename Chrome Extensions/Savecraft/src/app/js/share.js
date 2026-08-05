// ===== SHARE =====

import { state, CATEGORIES, CAT_LABEL } from './state.js';
import { getFilteredSortedItems } from './render.js';
import { persistShareCount } from './storage.js';
import { escapeHtml, folderIconHtml } from './utils.js';

// Which Saved List (if any) the "Share a Saved List" scroll list has selected — radio-style,
// single selection, tap-to-deselect, same pattern as the detail modal's own "Save to:" menu
// (detailModalHeader.js's _toggleSaveToMenu). Reset to null every time the modal opens. Note:
// this only governs *which items* get shared (this list's, vs. whatever's currently open in the
// sidebar when nothing's selected) — it does not yet implement per-share view permissions
// ("View — My Notes Excluded" / "View — My Notes Included" / "Admin") the user's described
// wanting eventually; notes aren't part of the share payload at all today (see buildShareUrl's
// item mapping below), so nothing needs stripping on the recipient's end yet either.
let _selectedShareListId = null;

function renderShareLists() {
  const container = document.getElementById('share-lists-scroll');
  if (!state.savedLists.length) {
    container.innerHTML = '<div class="share-lists-empty">No saved lists yet</div>';
    return;
  }
  container.innerHTML = state.savedLists.map(list => {
    const selected = list.id === _selectedShareListId;
    return `
    <button type="button" class="share-list-item ${selected ? 'share-list-item--selected' : ''}" data-list-id="${escapeHtml(list.id)}">
      ${folderIconHtml(list.id, 16)}
      <span class="share-list-item-name">${escapeHtml(list.name)}</span>
      ${selected ? '<svg class="share-list-item-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
    </button>`;
  }).join('');

  container.querySelectorAll('[data-list-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.listId;
      _selectedShareListId = _selectedShareListId === id ? null : id;
      renderShareLists();
      document.getElementById('btn-copy-link').disabled = !_selectedShareListId;
    });
  });
}

// Resolves the selected Saved List's own items (Favorites checks item.favorite, same as the
// detail modal's own "Save to:" menu; every other list checks item.savedListId) — null if
// nothing's selected, so callers fall back to the current sidebar view.
function getSelectedShareListItems() {
  if (!_selectedShareListId) return null;
  const list = state.savedLists.find(l => l.id === _selectedShareListId);
  if (!list) return null;
  return list.name === 'Favorites'
    ? state.items.filter(i => i.favorite)
    : state.items.filter(i => i.savedListId === _selectedShareListId);
}

export function initShare() {
  const wrap = document.getElementById('share-btn-wrap');
  const dropdown = document.getElementById('share-dropdown');

  function closeDropdown() { dropdown.classList.remove('open'); }

  document.getElementById('btn-share').addEventListener('click', () => {
    closeDropdown();
    openShareModal();
  });

  document.getElementById('btn-share-arrow').addEventListener('click', e => {
    e.stopPropagation();
    dropdown.classList.toggle('open');
  });

  document.addEventListener('click', e => {
    if (!wrap.contains(e.target)) closeDropdown();
  });

  document.getElementById('share-export-csv-dd').addEventListener('click', () => {
    exportAsCsv();
    closeDropdown();
  });

  document.getElementById('share-export-md-dd').addEventListener('click', () => {
    exportAsMarkdown();
    closeDropdown();
  });

  chrome.storage.sync.get({ savecraft_share_count: 0 }, data => {
    updateShareCount(data.savecraft_share_count);
  });

  document.getElementById('btn-share-modal-cancel').addEventListener('click', closeShareModal);
  document.getElementById('share-modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('share-modal-overlay')) closeShareModal();
  });
  document.getElementById('btn-share-modal-send').addEventListener('click', sendViaEmail);

  document.getElementById('btn-copy-link').addEventListener('click', () => {
    const url = buildShareUrl();
    navigator.clipboard.writeText(url).then(() => {
      const btn = document.getElementById('btn-copy-link');
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Copied!`;
      btn.classList.add('copied');
      setTimeout(() => {
        btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> Copy link`;
        btn.classList.remove('copied');
      }, 2000);
    });
  });
}

export function openShareModal() {
  document.getElementById('share-email-input').value = '';
  document.getElementById('btn-share-modal-send').disabled = true;
  _selectedShareListId = null;
  renderShareLists();
  const copyBtn = document.getElementById('btn-copy-link');
  copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> Copy link`;
  copyBtn.classList.remove('copied');
  copyBtn.disabled = true; // grayed out until a Saved List is selected above
  document.getElementById('share-modal-overlay').classList.add('open');
  document.getElementById('share-email-input').focus();

  document.getElementById('share-email-input').oninput = e => {
    document.getElementById('btn-share-modal-send').disabled = !e.target.value.trim();
  };
}

export function closeShareModal() {
  document.getElementById('share-modal-overlay').classList.remove('open');
}

export function buildShareUrl() {
  const selectedListItems = getSelectedShareListItems();
  const items = (selectedListItems || getFilteredSortedItems()).map(({ url, title, category, imageUrl }) =>
    ({ url, title, category, imageUrl })
  );
  const viewLabel = selectedListItems
    ? state.savedLists.find(l => l.id === _selectedShareListId)?.name || 'My List'
    : state.view === 'all'
    ? 'SaveCraft Library'
    : (CATEGORIES.includes(state.view) ? state.view : (() => {
        const f = state.folders.find(f => f.id === state.view);
        return f ? f.name : 'My List';
      })());

  const payload = { title: viewLabel, items };
  const encoded = btoa(encodeURIComponent(JSON.stringify(payload)).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))));
  return `https://lizpasekal1.github.io/Votecraft.org/savecraft/view.html#${encoded}`;
}

export function updateShareCount(count) {
  const el = document.getElementById('share-people-count');
  if (el) el.textContent = `Shared with ${count} ${count === 1 ? 'person' : 'people'}`;
}

export function sendViaEmail() {
  const email = document.getElementById('share-email-input').value.trim();
  if (!email) {
    document.getElementById('share-email-input').style.borderColor = '#EF4444';
    setTimeout(() => document.getElementById('share-email-input').style.borderColor = '', 1500);
    return;
  }

  const selectedList = _selectedShareListId && state.savedLists.find(l => l.id === _selectedShareListId);
  const viewLabel = selectedList
    ? `my "${selectedList.name}" list`
    : state.view === 'all'
    ? 'my SaveCraft library'
    : (CATEGORIES.includes(state.view) ? `my ${state.view} list` : 'a list');

  const shareUrl = buildShareUrl();
  const subject = encodeURIComponent(`Check out ${viewLabel} on SaveCraft`);
  const bodyText = `Hey,\n\nI wanted to share ${viewLabel} with you:\n\n${shareUrl}\n\n— Shared via SaveCraft`;
  const body = encodeURIComponent(bodyText);
  const mailto = `mailto:${encodeURIComponent(email)}?subject=${subject}&body=${body}`;

  chrome.tabs.create({ url: mailto });

  chrome.storage.sync.get({ savecraft_share_count: 0 }, data => {
    const newCount = data.savecraft_share_count + 1;
    persistShareCount(newCount);
    updateShareCount(newCount);
  });

  closeShareModal();
}

export function exportAsCsv() {
  const items = getFilteredSortedItems();
  const rows = [['Title', 'URL', 'Category', 'Date Saved', 'Done']];
  items.forEach(item => {
    const date = new Date(item.savedAt).toLocaleDateString();
    rows.push([
      `"${(item.title || '').replace(/"/g, '""')}"`,
      `"${(item.url || '').replace(/"/g, '""')}"`,
      item.category || '',
      date,
      item.done ? 'Yes' : 'No',
    ]);
  });
  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'savecraft-export.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

// Grouped by category (in CATEGORIES order, matching the sidebar) so the file reads like a
// real document rather than a flat table — CSV already covers the flat/spreadsheet case.
export function exportAsMarkdown() {
  const items = getFilteredSortedItems();
  const byCategory = new Map();
  items.forEach(item => {
    const cat = item.category || 'Other';
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat).push(item);
  });

  const orderedCats = [...CATEGORIES.filter(c => byCategory.has(c)), ...[...byCategory.keys()].filter(c => !CATEGORIES.includes(c))];

  const lines = ['# SaveCraft Library', ''];
  orderedCats.forEach(cat => {
    lines.push(`## ${CAT_LABEL[cat] || cat}`, '');
    byCategory.get(cat).forEach(item => {
      const title = (item.title || 'Untitled').replace(/\[/g, '\\[').replace(/\]/g, '\\]');
      const date = new Date(item.savedAt).toLocaleDateString();
      const doneMark = item.done ? 'x' : ' ';
      const link = item.url ? `[${title}](${item.url})` : title;
      lines.push(`- [${doneMark}] ${link} — saved ${date}`);
    });
    lines.push('');
  });

  const md = lines.join('\n');
  const blob = new Blob([md], { type: 'text/markdown' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'savecraft-export.md';
  a.click();
  URL.revokeObjectURL(a.href);
}
