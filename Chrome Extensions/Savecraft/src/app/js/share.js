// ===== SHARE =====

import { state, CATEGORIES } from './state.js';
import { getFilteredSortedItems } from './render.js';

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
  document.getElementById('share-message-input').value = '';
  document.getElementById('btn-share-modal-send').disabled = true;
  const copyBtn = document.getElementById('btn-copy-link');
  copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> Copy link`;
  copyBtn.classList.remove('copied');
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
  const items = getFilteredSortedItems().map(({ url, title, category, imageUrl }) =>
    ({ url, title, category, imageUrl })
  );
  const viewLabel = state.view === 'all'
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

  const viewLabel = state.view === 'all'
    ? 'my SaveCraft library'
    : (CATEGORIES.includes(state.view) ? `my ${state.view} list` : 'a list');

  const message = document.getElementById('share-message-input').value.trim();
  const shareUrl = buildShareUrl();
  const subject = encodeURIComponent(`Check out ${viewLabel} on SaveCraft`);
  const bodyText = message
    ? `${message}\n\n${shareUrl}\n\n— Shared via SaveCraft`
    : `Hey,\n\nI wanted to share ${viewLabel} with you:\n\n${shareUrl}\n\n— Shared via SaveCraft`;
  const body = encodeURIComponent(bodyText);
  const mailto = `mailto:${encodeURIComponent(email)}?subject=${subject}&body=${body}`;

  chrome.tabs.create({ url: mailto });

  chrome.storage.sync.get({ savecraft_share_count: 0 }, data => {
    const newCount = data.savecraft_share_count + 1;
    chrome.storage.sync.set({ savecraft_share_count: newCount });
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
