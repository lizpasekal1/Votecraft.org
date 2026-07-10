// ===== FETCH ALBUMS MODAL (bulk-import an artist's discography from iTunes) =====

import { state } from './state.js';
import { escapeHtml } from './utils.js';
import { persistItem } from './storage.js';
import { fetchAlbumsFromItunes } from './api.js';
import { renderSidebar, renderGrid, renderAuthorPage } from './render.js';

export function renderFetchAlbumsList(allAlbums, artistName, mode, hideSingles) {
  const lower = artistName.toLowerCase();
  let albums = mode === 'exact'
    ? allAlbums.filter(a => a.artist.toLowerCase() === lower)
    : allAlbums;
  if (hideSingles) albums = albums.filter(a =>
    !/\s[-–]\s*(single|ep)\s*$/i.test(a.title) && a.type !== 'Single'
  );

  const overlay = document.getElementById('fetch-albums-overlay');
  const list    = document.getElementById('fetch-albums-list');
  const status  = document.getElementById('fetch-albums-status');
  const actions = document.getElementById('fetch-albums-actions');

  if (albums.length === 0) {
    list.innerHTML = '';
    actions.style.display = 'none';
    status.textContent = mode === 'exact'
      ? `No albums found as primary artist. Try "Any mention".`
      : 'No results found on iTunes.';
    return;
  }

  status.innerHTML = `${albums.length} album${albums.length !== 1 ? 's' : ''} <button class="fetch-select-all-btn" id="fetch-select-all">Deselect all</button>`;

  list.innerHTML = albums.map((album, i) => {
    const alreadySaved = state.items.some(
      it => it.category === 'Music Album' && it.author === artistName && it.title === album.title
    );
    const isSingle = /\s[-–]\s*(single|ep)\s*$/i.test(album.title) || album.type === 'Single';
    const defaultChecked = !alreadySaved && !isSingle;
    return `
      <label class="fetch-album-row${alreadySaved ? ' fetch-album-saved' : ''}">
        <input type="checkbox" class="fetch-album-check" data-index="${i}"
               ${alreadySaved ? 'disabled' : defaultChecked ? 'checked' : ''}>
        ${album.imageUrl
          ? `<img class="fetch-album-art" src="${escapeHtml(album.imageUrl)}" alt="" loading="lazy" decoding="async"
                  onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
             <div class="fetch-album-art fetch-album-art-placeholder" style="display:none">♪</div>`
          : `<div class="fetch-album-art fetch-album-art-placeholder">♪</div>`}
        <div class="fetch-album-info">
          <div class="fetch-album-title">${escapeHtml(album.title)}</div>
          <div class="fetch-album-meta">${escapeHtml(album.artist)}${album.year ? ` · ${album.year}` : ''}${album.genre ? ` · ${album.genre}` : ''}</div>
          ${alreadySaved ? `<span class="fetch-album-saved-tag">Already saved</span>` : ''}
        </div>
      </label>`;
  }).join('');

  overlay.dataset.filteredAlbums = JSON.stringify(albums);
  actions.style.display = '';
  updateImportCount();
  list.querySelectorAll('.fetch-album-check').forEach(cb => cb.addEventListener('change', updateImportCount));

  document.getElementById('fetch-select-all')?.addEventListener('click', () => {
    const checkboxes = Array.from(document.querySelectorAll('.fetch-album-check:not(:disabled)'));
    const anyChecked = checkboxes.some(cb => cb.checked);
    checkboxes.forEach(cb => { cb.checked = !anyChecked; });
    updateImportCount();
  });
}

export function openFetchAlbumsModal(artistName) {
  const overlay = document.getElementById('fetch-albums-overlay');
  const status  = document.getElementById('fetch-albums-status');
  const list    = document.getElementById('fetch-albums-list');
  const actions  = document.getElementById('fetch-albums-actions');
  const controls = document.getElementById('fetch-albums-controls');

  overlay.dataset.artist = artistName;
  overlay.dataset.allAlbums = '';
  overlay.dataset.filteredAlbums = '';
  status.textContent = 'Fetching albums…';
  status.className = 'fetch-albums-status fetch-albums-loading';
  list.innerHTML = '';
  actions.style.display = 'none';
  controls.style.display = 'none';
  controls.querySelectorAll('.fetch-toggle-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === 'exact');
  });
  document.getElementById('fetch-hide-singles').checked = false;
  overlay.classList.add('open');

  fetchAlbumsFromItunes(artistName).then(allAlbums => {
    status.className = 'fetch-albums-status';
    overlay.dataset.allAlbums = JSON.stringify(allAlbums);
    controls.style.display = allAlbums.length > 0 ? '' : 'none';
    renderFetchAlbumsList(allAlbums, artistName, 'exact', true);
  }).catch(err => {
    status.textContent = `Could not fetch albums: ${err.message}`;
    status.className = 'fetch-albums-status fetch-albums-error';
  });
}

export function updateImportCount() {
  const checkboxes = Array.from(document.querySelectorAll('.fetch-album-check:not(:disabled)'));
  const count = document.querySelectorAll('.fetch-album-check:checked').length;
  const btn = document.getElementById('btn-fetch-albums-import');
  if (btn) {
    btn.textContent = count > 0 ? `Import ${count} Album${count !== 1 ? 's' : ''}` : 'Import Selected';
    btn.disabled = count === 0;
  }
  const selectAllBtn = document.getElementById('fetch-select-all');
  if (selectAllBtn) {
    const anyChecked = checkboxes.some(cb => cb.checked);
    selectAllBtn.textContent = anyChecked ? 'Deselect all' : 'Select all';
  }
}

export function closeFetchAlbumsModal() {
  document.getElementById('fetch-albums-overlay').classList.remove('open');
}

export async function handleImportAlbums() {
  const overlay    = document.getElementById('fetch-albums-overlay');
  const artistName = overlay.dataset.artist;
  const albums     = JSON.parse(overlay.dataset.filteredAlbums || '[]');
  const toImport   = Array.from(document.querySelectorAll('.fetch-album-check:checked'))
    .map(cb => albums[parseInt(cb.dataset.index)]);

  if (toImport.length === 0) return;

  const btn = document.getElementById('btn-fetch-albums-import');
  btn.disabled = true;
  btn.textContent = 'Importing…';

  for (const album of toImport) {
    const item = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      title: album.title,
      author: artistName,
      category: 'Music Album',
      url: album.url || null,
      imageUrl: album.imageUrl || null,
      notes: null,
      genre: album.genre || null, // kept for future use, not currently rendered in the detail modal
      year: album.year || null,
      collectionId: album.collectionId || null,
      folderId: null,
      savedAt: Date.now(),
    };
    state.items.unshift(item);
    await persistItem(item);
  }

  closeFetchAlbumsModal();
  renderSidebar();
  if (state.view.startsWith('author:')) renderAuthorPage();
  else renderGrid();
}
