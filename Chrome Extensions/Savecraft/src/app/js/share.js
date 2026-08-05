// ===== SHARE =====

import { state, CATEGORIES, CAT_LABEL } from './state.js';
import { getFilteredSortedItems } from './render.js';
import { persistShareCount } from './storage.js';
import { escapeHtml, folderIconHtml } from './utils.js';
import { openEmbedBuilder } from './embedBuilder.js';

// Which Saved List (if any) the "Share a Saved List" scroll list has selected — radio-style,
// single selection, tap-to-deselect, same pattern as the detail modal's own "Save to:" menu
// (detailModalHeader.js's _toggleSaveToMenu). Kept as a Set (size 0 or 1) rather than a plain
// id so getSelectedShareListItems()/selectedShareListNames() below don't need two code paths —
// renderShareLists()'s own click handler is what actually enforces "only one at a time" by
// clearing the set before adding. Reset to empty every time the modal opens. Note: this only
// governs *which items* get shared (this list's, vs. whatever's currently open in the sidebar
// when nothing's selected) — it does not yet implement per-share view permissions ("View — My
// Notes Excluded" / "View — My Notes Included" / "Admin") the user's described wanting
// eventually; notes aren't part of the share payload at all today (see buildShareUrl's item
// mapping below), so nothing needs stripping on the recipient's end yet either.
let _selectedShareListIds = new Set();

// "Anyone with the link" on/off toggle (replaces the old static "Viewer" label) — reset to on
// every time the modal opens. Off just grays out Copy link/Send (see updateLinkSharingUi()
// below); there's no real access-control backend behind this yet, so it can't actually revoke a
// link someone already copied — same "no real enforcement" caveat as the future permission-tier
// note above.
let _linkSharingEnabled = true;

function updateLinkSharingUi() {
  const icon = document.getElementById('share-access-icon');
  const title = document.getElementById('share-access-title');
  const sub = document.getElementById('share-access-sub');
  icon.classList.toggle('share-access-icon--off', !_linkSharingEnabled);
  icon.innerHTML = _linkSharingEnabled
    ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>'
    : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
  title.textContent = _linkSharingEnabled ? 'Anyone with the link' : 'Link sharing is off';
  sub.textContent = _linkSharingEnabled
    ? 'Anyone on the internet with the link can view'
    : 'Turn on to let anyone with the link view this';
  updateActionButtonsDisabled();
}

function updateActionButtonsDisabled() {
  document.getElementById('btn-copy-link').disabled = !_linkSharingEnabled || !_selectedShareListIds.size;
  const email = document.getElementById('share-email-input').value.trim();
  document.getElementById('btn-share-modal-send').disabled = !_linkSharingEnabled || !email;
}

function renderShareLists() {
  const container = document.getElementById('share-lists-scroll');
  if (!state.savedLists.length) {
    container.innerHTML = '<div class="share-lists-empty">No saved lists yet</div>';
    return;
  }
  container.innerHTML = state.savedLists.map(list => {
    const selected = _selectedShareListIds.has(list.id);
    return `
    <button type="button" class="share-list-item ${selected ? 'share-list-item--selected' : ''}" data-list-id="${escapeHtml(list.id)}">
      ${folderIconHtml(list.id, 16)}
      <span class="share-list-item-name">${escapeHtml(list.name)}</span>
      <span class="share-list-radio ${selected ? 'share-list-radio--selected' : ''}"></span>
    </button>`;
  }).join('');

  container.querySelectorAll('[data-list-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.listId;
      // Exclusive, not additive — clearing first (rather than just toggling this one id) is what
      // keeps this a single-selection radio, not a checkbox list: picking a different list always
      // replaces whichever one was selected before, and re-picking the same one deselects it.
      const wasSelected = _selectedShareListIds.has(id);
      _selectedShareListIds.clear();
      if (!wasSelected) _selectedShareListIds.add(id);
      renderShareLists();
      updateActionButtonsDisabled();
    });
  });
}

// Union of every checked list's own items (default-favorites — checked by id, not display name —
// checks item.favorite, same as the detail modal's own "Save to:" menu; every other list checks
// item.savedListIds — an array now, since an item can belong to multiple lists at once), deduped
// by id since an item could show up under more than one checked list either way — null if
// nothing's checked, so callers fall back to the current sidebar view.
function getSelectedShareListItems() {
  if (!_selectedShareListIds.size) return null;
  const seen = new Set();
  const items = [];
  for (const list of state.savedLists) {
    if (!_selectedShareListIds.has(list.id)) continue;
    const matches = list.id === 'default-favorites'
      ? state.items.filter(i => i.favorite)
      : state.items.filter(i => (i.savedListIds || []).includes(list.id));
    for (const item of matches) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      items.push(item);
    }
  }
  return items;
}

// Names of every checked list, in state.savedLists order (not check order) — shared by
// buildShareUrl (payload title) and sendViaEmail (subject/body) below.
function selectedShareListNames() {
  return state.savedLists.filter(l => _selectedShareListIds.has(l.id)).map(l => l.name);
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

  document.getElementById('share-embed-dd').addEventListener('click', () => {
    openEmbedBuilder();
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

  document.getElementById('share-access-toggle-input').addEventListener('change', e => {
    _linkSharingEnabled = e.target.checked;
    updateLinkSharingUi();
  });

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
  _selectedShareListIds = new Set();
  _linkSharingEnabled = true;
  document.getElementById('share-access-toggle-input').checked = true;
  renderShareLists();
  updateLinkSharingUi(); // also resets both action buttons' disabled state
  const copyBtn = document.getElementById('btn-copy-link');
  copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> Copy link`;
  copyBtn.classList.remove('copied');
  document.getElementById('share-modal-overlay').classList.add('open');
  document.getElementById('share-email-input').focus();

  document.getElementById('share-email-input').oninput = updateActionButtonsDisabled;
}

export function closeShareModal() {
  document.getElementById('share-modal-overlay').classList.remove('open');
}

// Human-readable name for whatever state.view currently points at ("SaveCraft Library" for the
// all-view, the raw category name for a top-level tab, a folder's own name otherwise). Shared by
// buildShareUrl() below (its own fallback when no Saved List is selected) and embedBuilder.js
// (which always operates on the current view, never a selected Saved List).
export function getCurrentViewLabel() {
  return state.view === 'all'
    ? 'SaveCraft Library'
    : (CATEGORIES.includes(state.view) ? state.view : (() => {
        const f = state.folders.find(f => f.id === state.view);
        return f ? f.name : 'My List';
      })());
}

export function buildShareUrl() {
  const selectedListItems = getSelectedShareListItems();
  const items = (selectedListItems || getFilteredSortedItems()).map(({ url, title, category, imageUrl }) =>
    ({ url, title, category, imageUrl })
  );
  const viewLabel = selectedListItems ? (selectedShareListNames().join(', ') || 'My List') : getCurrentViewLabel();

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

  const selectedNames = selectedShareListNames();
  const viewLabel = selectedNames.length
    ? `my "${selectedNames.join(', ')}" list${selectedNames.length > 1 ? 's' : ''}`
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
