// ===== ADD / EDIT ITEM MODAL =====

import { state, CATEGORY_PLATFORMS, MODAL_BOOKMARK_ICON_SVG } from './state.js';
import { escapeHtml, getDomain } from './utils.js';
import { persistItem, persistCuratedOverrides } from './storage.js';
import { renderSidebar, renderGrid } from './render.js';

export function updatePlatformSummary() {
  const count = document.querySelectorAll('#platform-chips input:checked').length;
  document.getElementById('platform-summary-text').textContent =
    count === 0 ? 'No platforms selected' : `${count} platform${count === 1 ? '' : 's'} selected`;
}

export function updatePlatformsSection(cat) {
  const section = document.getElementById('platforms-section');
  const config = CATEGORY_PLATFORMS[cat];
  if (!config) { section.style.display = 'none'; return; }

  document.getElementById('platforms-label-text').textContent = config.label;
  const list = document.getElementById('platform-chips');
  list.innerHTML = config.platforms.map(p =>
    `<label class="platform-option"><input type="checkbox" value="${p.id}" checked> ${p.name}</label>`
  ).join('');
  document.getElementById('platform-dropdown').open = false;
  section.style.display = '';
  updatePlatformSummary();
}

export function setSelectedPlatforms(ids) {
  document.querySelectorAll('#platform-chips input[type="checkbox"]').forEach(cb => {
    cb.checked = ids.includes(cb.value);
  });
  updatePlatformSummary();
}

export function getSelectedPlatforms() {
  return [...document.querySelectorAll('#platform-chips input:checked')].map(cb => cb.value);
}

export async function handleAuthorItunesLookup() {
  const author   = document.getElementById('input-author').value.trim();
  const category = document.getElementById('modal-category').value;

  if (category !== 'Music Album' || author.length < 2) {
    hideItunesSuggestions();
    return;
  }

  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(author)}&entity=album&media=music&limit=15`;
    const resp = await fetch(url);
    const data = await resp.json();
    const lowerFirst = author.split(' ')[0].toLowerCase();
    const albums = data.results
      .filter(r => r.collectionType && r.artistName.toLowerCase().includes(lowerFirst))
      .filter(r => !/\s[-–]\s*(single|ep)\s*$/i.test(r.collectionName))
      .slice(0, 8)
      .map(r => ({
        title: r.collectionName,
        artist: r.artistName,
        imageUrl: r.artworkUrl100?.replace('100x100bb', '600x600bb') || null,
        url: r.collectionViewUrl || null,
        year: r.releaseDate?.slice(0, 4) || '',
      }));

    if (albums.length === 0) { hideItunesSuggestions(); return; }
    showItunesSuggestions(albums);
  } catch {
    hideItunesSuggestions();
  }
}

export function showItunesSuggestions(albums) {
  const el = document.getElementById('itunes-suggestions');
  el.style.display = '';
  el.innerHTML = albums.map((a, i) => `
    <div class="itunes-suggestion-row" data-index="${i}">
      ${a.imageUrl
        ? `<img class="itunes-suggestion-art" src="${escapeHtml(a.imageUrl)}" alt="" loading="lazy" decoding="async"
                onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
           <div class="itunes-suggestion-art itunes-suggestion-art-placeholder" style="display:none">♪</div>`
        : `<div class="itunes-suggestion-art itunes-suggestion-art-placeholder">♪</div>`}
      <div class="itunes-suggestion-info">
        <div class="itunes-suggestion-title">${escapeHtml(a.title)}</div>
        <div class="itunes-suggestion-meta">${escapeHtml(a.artist)}${a.year ? ` · ${a.year}` : ''}</div>
      </div>
    </div>`).join('');

  el.querySelectorAll('.itunes-suggestion-row').forEach(row => {
    row.addEventListener('mousedown', e => {
      e.preventDefault();
      applyItunesSuggestion(albums[parseInt(row.dataset.index)]);
    });
  });
}

export function hideItunesSuggestions() {
  const el = document.getElementById('itunes-suggestions');
  if (el) { el.style.display = 'none'; el.innerHTML = ''; }
}

export function applyItunesSuggestion(album) {
  const titleInput = document.getElementById('input-title');
  const imageInput = document.getElementById('input-image-url');
  const urlInput   = document.getElementById('input-url');
  if (!titleInput.value.trim()) titleInput.value = album.title;
  if (!imageInput.value.trim() && album.imageUrl) imageInput.value = album.imageUrl;
  if (!urlInput.value.trim() && album.url)         urlInput.value   = album.url;
  hideItunesSuggestions();
}

export function openAddModal() {
  state.modalCategory = null;
  state.editingId = null;
  hideItunesSuggestions();
  document.getElementById('input-url').value = '';
  document.getElementById('input-title').value = '';
  document.getElementById('input-author').value = '';
  document.getElementById('input-summary').value = '';
  document.getElementById('input-notes').value = '';
  document.getElementById('input-image-url').value = '';
  updatePlatformsSection('');
  document.getElementById('modal-category').value = '';
  document.querySelector('#modal-overlay h2').innerHTML = `${MODAL_BOOKMARK_ICON_SVG}Add to SaveCraft`;
  document.getElementById('btn-modal-save').textContent = 'Save';
  document.getElementById('modal-overlay').classList.add('open');
  document.getElementById('input-url').focus();
}

export function openEditModal(item) {
  state.editingId = item.id;
  document.getElementById('input-url').value = item.url || '';
  document.getElementById('input-title').value = item.title || '';
  document.getElementById('input-author').value = item.author || '';
  document.getElementById('input-summary').value = item.summary || '';
  document.getElementById('input-notes').value = item.notes || '';
  document.getElementById('input-image-url').value = item.imageUrl || '';
  document.getElementById('modal-category').value = item.category || '';
  updatePlatformsSection(item.category || '');
  if (item.platforms) setSelectedPlatforms(item.platforms);
  document.querySelector('#modal-overlay h2').innerHTML = `${MODAL_BOOKMARK_ICON_SVG}Edit Item`;
  document.getElementById('btn-modal-save').textContent = 'Update';

  document.getElementById('modal-overlay').classList.add('open');
  document.getElementById('input-title').focus();
}

export function closeAddModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}

export async function handleSaveItem() {
  const url = document.getElementById('input-url').value.trim();
  const titleInput = document.getElementById('input-title').value.trim();
  const author = document.getElementById('input-author').value.trim() || null;
  const category = document.getElementById('modal-category').value || null;
  const folderId = null;
  const summary = document.getElementById('input-summary').value.trim() || null;
  const notes = document.getElementById('input-notes').value.trim() || null;
  const manualImageUrl = document.getElementById('input-image-url').value.trim() || null;
  const platforms = getSelectedPlatforms();

  if (!url) {
    document.getElementById('input-url').focus();
    document.getElementById('input-url').style.borderColor = '#EF4444';
    setTimeout(() => document.getElementById('input-url').style.borderColor = '', 1500);
    return;
  }

  if (!category) {
    const catSelect = document.getElementById('modal-category');
    if (catSelect) { catSelect.style.outline = '2px solid #EF4444'; setTimeout(() => catSelect.style.outline = '', 1500); }
    return;
  }

  const saveBtn = document.getElementById('btn-modal-save');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  const title = titleInput || null;

  let item;
  if (state.editingId && state.editingId.startsWith('cur-')) {
    // Curated item edit — save as an override, not a new personal item
    state.curatedOverrides[state.editingId] = { url, title, author, summary, notes, imageUrl: manualImageUrl };
    await persistCuratedOverrides();
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save';
    closeAddModal();
    renderGrid();
    return;
  } else if (state.editingId) {
    const existing = state.items.find(i => i.id === state.editingId);
    item = { ...existing, url, title, author, summary, notes, imageUrl: manualImageUrl, category, folderId, platforms };
    const idx = state.items.findIndex(i => i.id === state.editingId);
    if (idx >= 0) state.items[idx] = item;
  } else {
    item = {
      id: Date.now().toString(), url, title, author, summary, notes,
      imageUrl: manualImageUrl || null, description: null,
      category, folderId, platforms, done: false, savedAt: Date.now(),
    };
  }

  await persistItem(item);
  saveBtn.disabled = false;
  saveBtn.textContent = 'Save';
  closeAddModal();
  renderSidebar();
  renderGrid();

  const needsMeta = !state.editingId && (!item.imageUrl || !titleInput);
  if (needsMeta && !manualImageUrl) {
    fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`)
      .then(r => r.json())
      .then(data => {
        const updated = { ...item };
        if (!item.imageUrl) updated.imageUrl = data?.data?.image?.url || null;
        if (!titleInput) { updated.title = data?.data?.title || getDomain(url); updated.description = data?.data?.description || null; }
        if (updated.imageUrl !== item.imageUrl || updated.title !== item.title) {
          persistItem(updated);
        }
      })
      .catch(() => {});
  }

}
