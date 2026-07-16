// ===== ENTRY POINT: search, sort, theme, mobile sidebar, live storage sync, init/event wiring =====

import { state, STREAMING_DOMAINS } from './state.js';
import {
  loadAll, loadLocalCache, initCuratedItems, persistSort, persistTheme, persistSidebarCollapsed,
  persistLastfmUsername, disconnectLastfm, persistViewState, persistSteamId, disconnectSteam,
} from './storage.js';
import { initAuth, onAuthChange, getCurrentUser, signUp, signIn, signOut } from './auth.js';
import { ensureLastfmRecentTracks, isLastfmConfigured, ensureSteamRecentGames, isSteamConfigured } from './api.js';
import { debounce, escapeHtml } from './utils.js';
import { renderSidebar, renderGrid } from './render.js';
import { initShare } from './share.js';
import {
  openAddModal, closeAddModal, handleSaveItem, updatePlatformSummary, updatePlatformsSection,
  openEditModal, selectStep1Category, handleStep1Search, hideSearchResults, handleStep1ManualAdd,
  handleModalBack, refreshStep2ImagePreviewFromManualInput, updateTitleAuthorLayout,
} from './addEditModal.js';
import { closeDetailModal, closeImageLightbox, getDetailItem } from './detailModal.js';
import { closeFetchAlbumsModal, handleImportAlbums, renderFetchAlbumsList } from './fetchAlbumsModal.js';

// ===== SEARCH =====
let searchDebounce;
export function handleSearch(query) {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    state.search = query.trim();
    renderGrid();
  }, 220);
}

export function initSearch() {
  const wrap = document.getElementById('search-expand-wrap');
  const input = document.getElementById('search-expand-input');
  const btn = document.getElementById('btn-search-icon');

  function openSearch() {
    wrap.classList.add('open');
    input.focus();
  }

  function closeSearch() {
    wrap.classList.remove('open');
    input.value = '';
    if (state.search) { state.search = ''; renderGrid(); }
  }

  btn.addEventListener('click', () => {
    wrap.classList.contains('open') ? closeSearch() : openSearch();
  });

  input.addEventListener('input', e => handleSearch(e.target.value));

  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeSearch();
  });

  document.addEventListener('click', e => {
    if (!wrap.contains(e.target) && wrap.classList.contains('open')) {
      if (!input.value) closeSearch();
    }
  });
}

// ===== SORT =====
export function handleSort(sort) {
  state.sort = sort;
  persistSort(sort);
  renderGrid();
}

// ===== LIVE STORAGE UPDATES =====
// Keeps the library in sync when items are added via right-click or popup
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;
  let changed = false;

  for (const [key, { newValue, oldValue }] of Object.entries(changes)) {
    if (key.startsWith('item_')) {
      if (newValue === undefined) {
        state.items = state.items.filter(i => `item_${i.id}` !== key);
      } else if (!oldValue) {
        if (!state.items.find(i => `item_${i.id}` === key)) state.items.unshift(newValue);
      } else {
        const idx = state.items.findIndex(i => `item_${i.id}` === key);
        if (idx >= 0) state.items[idx] = newValue;
        else state.items.unshift(newValue);
      }
      changed = true;
    }
    if (key.startsWith('folder_')) {
      if (newValue === undefined) {
        state.folders = state.folders.filter(f => `folder_${f.id}` !== key);
      } else if (!state.folders.find(f => `folder_${f.id}` === key)) {
        state.folders.push(newValue);
      }
      changed = true;
    }
    if (key.startsWith('author_')) {
      if (newValue === undefined) {
        state.authors = state.authors.filter(a => `author_${a.id}` !== key);
      } else {
        const idx = state.authors.findIndex(a => `author_${a.id}` === key);
        if (idx >= 0) state.authors[idx] = newValue; else state.authors.push(newValue);
      }
      changed = true;
    }
  }

  if (changed) {
    renderSidebar();
    renderGrid();
  }
});

// ===== THEME =====
export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const label = document.getElementById('theme-label');
  if (label) label.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
}

export function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  persistTheme(next);
}

// ===== SIDEBAR COLLAPSE (desktop rail — mobile drawer is unaffected) =====
function applySidebarCollapsed(collapsed) {
  document.getElementById('header-sidebar').classList.toggle('sidebar-collapsed', collapsed);
  document.getElementById('sidebar').classList.toggle('sidebar-collapsed', collapsed);
}

function toggleSidebarCollapsed() {
  const collapsed = !document.getElementById('sidebar').classList.contains('sidebar-collapsed');
  applySidebarCollapsed(collapsed);
  persistSidebarCollapsed(collapsed);
}

// ===== AUTH MODAL =====
export function openAuthModal() {
  document.getElementById('auth-error').style.display = 'none';
  document.getElementById('auth-modal-overlay').classList.add('open');
}
function closeAuthModal() {
  document.getElementById('auth-modal-overlay').classList.remove('open');
  document.getElementById('auth-email').value = '';
  document.getElementById('auth-password').value = '';
}

function showAuthError(message) {
  const el = document.getElementById('auth-error');
  el.textContent = message;
  el.style.display = 'block';
}

function applyAuthUI(user) {
  const label = document.getElementById('profile-label');
  if (label) label.textContent = user ? user.email : 'Sign in';

  document.getElementById('auth-modal-title').textContent = user
    ? 'Your account'
    : 'Sign in to sync your saves';
  document.getElementById('auth-signed-out-fields').style.display = user ? 'none' : '';
  document.getElementById('auth-password-field').style.display = user ? 'none' : '';
  document.getElementById('auth-signed-out-actions').style.display = user ? 'none' : '';
  document.getElementById('auth-signed-in-info').style.display = user ? '' : 'none';
  document.getElementById('auth-signed-in-actions').style.display = user ? '' : 'none';
  if (user) {
    document.getElementById('auth-signed-in-info').innerHTML = `Signed in as <strong>${user.email}</strong>`;
  }
}

async function handleAuthSubmit(fn) {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  document.getElementById('auth-error').style.display = 'none';
  const result = await fn(email, password);
  if (result.ok) {
    closeAuthModal();
  } else {
    showAuthError(result.error);
  }
}

// ===== LAST.FM MODAL (Profile page's Connections section) =====
export function openLastfmModal() {
  document.getElementById('lastfm-error').style.display = 'none';
  document.getElementById('lastfm-username').value = state.lastfmUsername || '';
  applyLastfmModalUI(state.lastfmUsername);
  document.getElementById('lastfm-modal-overlay').classList.add('open');
}
function closeLastfmModal() {
  document.getElementById('lastfm-modal-overlay').classList.remove('open');
}
function showLastfmError(message) {
  const el = document.getElementById('lastfm-error');
  el.textContent = message;
  el.style.display = 'block';
}
function applyLastfmModalUI(username) {
  document.getElementById('lastfm-username-field').style.display = username ? 'none' : '';
  document.getElementById('lastfm-disconnected-actions').style.display = username ? 'none' : '';
  document.getElementById('lastfm-connected-actions').style.display = username ? '' : 'none';
  document.getElementById('lastfm-connected-info').style.display = username ? '' : 'none';
  if (username) {
    document.getElementById('lastfm-connected-info').innerHTML = `Connected as <strong>${escapeHtml(username)}</strong>`;
  }
}

// ===== STEAM MODAL (Profile page's Connections section) =====
export function openSteamModal() {
  document.getElementById('steam-error').style.display = 'none';
  document.getElementById('steam-username').value = state.steamId || '';
  applySteamModalUI(state.steamId);
  document.getElementById('steam-modal-overlay').classList.add('open');
}
function closeSteamModal() {
  document.getElementById('steam-modal-overlay').classList.remove('open');
}
function showSteamError(message) {
  const el = document.getElementById('steam-error');
  el.textContent = message;
  el.style.display = 'block';
}
function applySteamModalUI(steamId) {
  document.getElementById('steam-username-field').style.display = steamId ? 'none' : '';
  document.getElementById('steam-disconnected-actions').style.display = steamId ? 'none' : '';
  document.getElementById('steam-connected-actions').style.display = steamId ? '' : 'none';
  document.getElementById('steam-connected-info').style.display = steamId ? '' : 'none';
  if (steamId) {
    document.getElementById('steam-connected-info').innerHTML = `Connected as <strong>${escapeHtml(steamId)}</strong>`;
  }
}

// ===== MOBILE SIDEBAR =====
export function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebar-overlay').classList.add('open');
}
export function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('open');
}

// ===== INIT =====
async function init() {
  await initAuth();
  await loadAll();
  await initCuratedItems();

  await loadLocalCache('savecraft_curated_img', 'curatedImgCache');
  await loadLocalCache('savecraft_curated_album_meta', 'curatedAlbumMetaCache');
  await loadLocalCache('savecraft_album_tracklist', 'albumTrackListCache');
  await loadLocalCache('savecraft_artist_website_cache', 'artistWebsiteCache');
  await loadLocalCache('savecraft_artist_bio_cache_v2', 'artistBioCache');
  await loadLocalCache('savecraft_item_wiki_cache', 'itemWikiCache');
  await loadLocalCache('savecraft_creator_cache', 'creatorCache');
  await loadLocalCache('savecraft_lastfm_cache', 'lastfmCache');
  await loadLocalCache('savecraft_steam_cache', 'steamCache');

  chrome.storage.sync.get({ savecraft_theme: 'dark' }, data => {
    applyTheme(data.savecraft_theme);
  });

  chrome.storage.sync.get({ savecraft_sidebar_collapsed: true }, data => {
    applySidebarCollapsed(data.savecraft_sidebar_collapsed);
  });
  document.getElementById('btn-sidebar-collapse').addEventListener('click', toggleSidebarCollapsed);

  // Clicking any nav item while the rail is collapsed expands it back open — the user can
  // still re-collapse it manually via the toggle button above. Delegated on the sidebar
  // container itself (registered once here) rather than per-item, since renderSidebar()
  // rebuilds the sidebar's innerHTML on nearly every navigation.
  document.getElementById('sidebar').addEventListener('click', e => {
    const sidebarEl = document.getElementById('sidebar');
    if (sidebarEl.classList.contains('sidebar-collapsed') && e.target.closest('.sidebar-item')) {
      applySidebarCollapsed(false);
      persistSidebarCollapsed(false);
    }
  });

  const settingsWrap = document.getElementById('settings-wrap');
  const settingsDropdown = document.getElementById('settings-dropdown');
  document.getElementById('btn-theme').addEventListener('click', e => {
    e.stopPropagation();
    settingsDropdown.hidden ? settingsDropdown.removeAttribute('hidden') : settingsDropdown.setAttribute('hidden', '');
  });
  document.getElementById('btn-toggle-theme').addEventListener('click', () => {
    toggleTheme();
    settingsDropdown.setAttribute('hidden', '');
  });
  document.getElementById('btn-profile').addEventListener('click', () => {
    settingsDropdown.setAttribute('hidden', '');
    // Demo mode: always go straight to the Profile page, skipping the sign-in gate — re-enable
    // the `getCurrentUser() ? ... : openAuthModal()` branch once real auth is part of the demo.
    state.view = 'profile';
    persistViewState();
    renderSidebar();
    renderGrid();
  });
  document.getElementById('link-sponsored-statements').href = chrome.runtime.getURL('src/sponsored/sponsored.html');
  document.addEventListener('click', e => {
    if (!settingsWrap.contains(e.target)) settingsDropdown.setAttribute('hidden', '');
  });

  onAuthChange(applyAuthUI);
  applyAuthUI(getCurrentUser());

  document.getElementById('btn-auth-close').addEventListener('click', closeAuthModal);
  document.getElementById('auth-modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('auth-modal-overlay')) closeAuthModal();
  });
  document.getElementById('btn-auth-signup').addEventListener('click', () => handleAuthSubmit(signUp));
  document.getElementById('btn-auth-signin').addEventListener('click', () => handleAuthSubmit(signIn));
  document.getElementById('btn-auth-signout').addEventListener('click', async () => {
    await signOut();
    closeAuthModal();
  });
  document.getElementById('auth-modal-overlay').addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') handleAuthSubmit(signIn);
    if (e.key === 'Escape') closeAuthModal();
  });

  document.getElementById('btn-lastfm-close').addEventListener('click', closeLastfmModal);
  document.getElementById('btn-lastfm-cancel').addEventListener('click', closeLastfmModal);
  document.getElementById('lastfm-modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('lastfm-modal-overlay')) closeLastfmModal();
  });
  document.getElementById('btn-lastfm-connect').addEventListener('click', async () => {
    const username = document.getElementById('lastfm-username').value.trim();
    if (!username) { showLastfmError('Enter a Last.fm username.'); return; }
    if (!isLastfmConfigured()) { showLastfmError('Last.fm isn’t configured yet — check back soon.'); return; }
    const tracks = await ensureLastfmRecentTracks(username);
    if (tracks === null) { showLastfmError('Could not find that Last.fm username.'); return; }
    state.lastfmUsername = username;
    persistLastfmUsername(username);
    closeLastfmModal();
    if (state.view === 'profile') renderGrid();
  });
  document.getElementById('btn-lastfm-disconnect').addEventListener('click', () => {
    disconnectLastfm();
    closeLastfmModal();
    if (state.view === 'profile') renderGrid();
  });
  document.getElementById('lastfm-modal-overlay').addEventListener('keydown', e => {
    if (e.key === 'Escape') closeLastfmModal();
  });

  document.getElementById('btn-steam-close').addEventListener('click', closeSteamModal);
  document.getElementById('btn-steam-cancel').addEventListener('click', closeSteamModal);
  document.getElementById('steam-modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('steam-modal-overlay')) closeSteamModal();
  });
  document.getElementById('btn-steam-connect').addEventListener('click', async () => {
    const username = document.getElementById('steam-username').value.trim();
    if (!username) { showSteamError('Enter a Steam vanity URL or SteamID64.'); return; }
    if (!isSteamConfigured()) { showSteamError('Steam isn’t configured yet — check back soon.'); return; }
    const games = await ensureSteamRecentGames(username);
    if (games === null) { showSteamError('Could not find that Steam profile — make sure Game Details is set to Public.'); return; }
    state.steamId = username;
    persistSteamId(username);
    closeSteamModal();
    if (state.view === 'profile') renderGrid();
  });
  document.getElementById('btn-steam-disconnect').addEventListener('click', () => {
    disconnectSteam();
    closeSteamModal();
    if (state.view === 'profile') renderGrid();
  });
  document.getElementById('steam-modal-overlay').addEventListener('keydown', e => {
    if (e.key === 'Escape') closeSteamModal();
  });

  const sortSelect = document.getElementById('sort-select');
  sortSelect.value = state.sort;

  // Reloading lands back on whatever view/sidebarMode was last active — loadAll() above already
  // restored both from chrome.storage.sync, so no override needed here.
  renderSidebar();
  renderGrid();
  initShare();
  initSearch();

  sortSelect.addEventListener('change', () => handleSort(sortSelect.value));

  // The options dropdown (Home/Shared Saves/Curated/⚡ VC) now lives under the same
  // button that toggles sidebar collapse — shown on hover (pure CSS, see .sidebar-collapse-wrap
  // in sidebar.css), so no click-to-open/click-outside-to-close JS is needed for visibility.
  const myOptionsDropdown = document.getElementById('my-options-dropdown');
  myOptionsDropdown.querySelectorAll('.my-options-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const opt = btn.dataset.option;
      if (opt === 'home') {
        state.sidebarMode = 'home';
        state.view = 'dashboard';
      } else if (opt === 'curated') {
        state.sidebarMode = 'curated';
        state.view = 'curated';
      } else if (opt === 'shared') {
        state.sidebarMode = 'shared';
        state.view = 'shared';
      } else if (opt === 'sponsored') {
        // "VoteCraft Picks" links straight into the real curated Top 100 saves area.
        state.sidebarMode = 'curated';
        state.view = 'genre:Top 100';
      }
      persistViewState();
      renderSidebar();
      renderGrid();
    });
  });

  document.getElementById('btn-add').addEventListener('click', () => openAddModal());

  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay')) closeAddModal();
  });

  document.getElementById('btn-modal-cancel-x').addEventListener('click', closeAddModal);
  document.getElementById('btn-modal-save').addEventListener('click', handleSaveItem);

  document.getElementById('platform-chips').addEventListener('change', updatePlatformSummary);

  document.addEventListener('click', e => {
    const dropdown = document.getElementById('platform-dropdown');
    if (dropdown && dropdown.open && !dropdown.contains(e.target)) {
      dropdown.open = false;
    }
  });

  document.getElementById('btn-saves-list').addEventListener('click', e => {
    e.stopPropagation();
    const dd = document.getElementById('saves-list-dropdown');
    document.getElementById('board-filter-dropdown')?.setAttribute('hidden', '');
    document.getElementById('board-info-popup')?.setAttribute('hidden', '');
    dd.toggleAttribute('hidden');
  });

  document.getElementById('btn-board-filter').addEventListener('click', e => {
    e.stopPropagation();
    const dd = document.getElementById('board-filter-dropdown');
    document.getElementById('saves-list-dropdown')?.setAttribute('hidden', '');
    document.getElementById('board-info-popup')?.setAttribute('hidden', '');
    dd.toggleAttribute('hidden');
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('#board-filter-wrap')) {
      document.getElementById('board-filter-dropdown')?.setAttribute('hidden', '');
    }
  });

  document.getElementById('btn-board-info').addEventListener('click', e => {
    e.stopPropagation();
    document.getElementById('saves-list-dropdown')?.setAttribute('hidden', '');
    const popup = document.getElementById('board-info-popup');
    popup.toggleAttribute('hidden');
  });
  document.addEventListener('click', e => {
    const popup = document.getElementById('board-info-popup');
    if (!popup.hidden && !e.target.closest('#board-info-wrap')) {
      popup.setAttribute('hidden', '');
    }
    if (!document.getElementById('saves-list-dropdown')?.hidden && !e.target.closest('#saves-list-wrap')) {
      document.getElementById('saves-list-dropdown').setAttribute('hidden', '');
    }
  });

  document.getElementById('detail-edit').addEventListener('click', () => {
    const detailItem = getDetailItem();
    if (!detailItem) return;
    closeDetailModal();
    const liveItem = state.items.find(i => i.id === detailItem.id);
    openEditModal(liveItem || detailItem);
  });
  document.getElementById('detail-modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('detail-modal-overlay')) closeDetailModal();
  });
  document.getElementById('image-lightbox-overlay').addEventListener('click', closeImageLightbox);
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (document.getElementById('image-lightbox-overlay').classList.contains('open')) {
      closeImageLightbox();
    } else {
      closeDetailModal();
    }
  });

  document.getElementById('modal-overlay').addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') handleSaveItem();
    if (e.key === 'Escape') closeAddModal();
  });

  // Clear image URL on focus when editing so user can paste a new one; restore if left empty
  const imageUrlInput = document.getElementById('input-image-url');
  let _savedImageUrl = '';
  imageUrlInput.addEventListener('focus', () => {
    if (state.editingId) {
      _savedImageUrl = imageUrlInput.value;
      imageUrlInput.value = '';
    }
  });
  imageUrlInput.addEventListener('blur', () => {
    if (state.editingId && imageUrlInput.value.trim() === '') {
      imageUrlInput.value = _savedImageUrl;
    }
  });

  document.getElementById('btn-clear-image').addEventListener('click', () => {
    imageUrlInput.value = '';
    _savedImageUrl = '';
    imageUrlInput.focus();
  });

  document.getElementById('btn-clear-youtube').addEventListener('click', () => {
    const youtubeUrlInput = document.getElementById('input-youtube-url');
    youtubeUrlInput.value = '';
    youtubeUrlInput.focus();
  });

  document.getElementById('modal-category').addEventListener('change', e => {
    state.modalCategory = e.target.value;
    updatePlatformsSection(e.target.value);
    updateTitleAuthorLayout(e.target.value);
  });

  document.getElementById('step1-category-grid').addEventListener('click', e => {
    const tile = e.target.closest('.step1-category-tile');
    if (tile) selectStep1Category(tile.dataset.category);
  });

  const _debouncedStep1Search = debounce(handleStep1Search, 500);
  document.getElementById('step1-search-input').addEventListener('input', _debouncedStep1Search);
  document.getElementById('step1-search-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); handleStep1ManualAdd(); }
  });
  document.getElementById('step1-search-input').addEventListener('blur', () => {
    setTimeout(hideSearchResults, 150);
  });
  document.getElementById('step1-manual-add').addEventListener('click', handleStep1ManualAdd);
  document.getElementById('btn-modal-back').addEventListener('click', handleModalBack);
  document.getElementById('input-image-url').addEventListener('input', refreshStep2ImagePreviewFromManualInput);

  // Auto-set category to "Web Links" when a streaming URL is pasted
  document.getElementById('input-url').addEventListener('input', e => {
    if (state.editingId) return; // don't override on edit
    const raw = e.target.value.trim();
    let hostname = '';
    try { hostname = new URL(raw).hostname.replace('www.', ''); } catch { return; }
    const isStreaming = STREAMING_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d));
    if (!isStreaming) return;

    const catSelect = document.getElementById('modal-category');
    if (catSelect.value) return; // user already picked a category, don't override

    catSelect.value = 'Web Links';
  });


  document.getElementById('btn-hamburger').addEventListener('click', () => {
    document.getElementById('sidebar').classList.contains('open') ? closeSidebar() : openSidebar();
  });

  document.getElementById('sidebar-overlay').addEventListener('click', closeSidebar);

  document.getElementById('sidebar').addEventListener('click', e => {
    if (window.innerWidth <= 768 && e.target.closest('.sidebar-item')) {
      closeSidebar();
    }
  });


  document.getElementById('btn-fetch-albums-close').addEventListener('click', closeFetchAlbumsModal);
  document.getElementById('btn-fetch-albums-cancel').addEventListener('click', closeFetchAlbumsModal);
  document.getElementById('btn-fetch-albums-import').addEventListener('click', handleImportAlbums);
  document.getElementById('fetch-albums-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('fetch-albums-overlay')) closeFetchAlbumsModal();
  });
  document.getElementById('fetch-albums-toggle').addEventListener('click', e => {
    const btn = e.target.closest('.fetch-toggle-btn');
    if (!btn) return;
    const overlay = document.getElementById('fetch-albums-overlay');
    document.querySelectorAll('.fetch-toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const allAlbums = JSON.parse(overlay.dataset.allAlbums || '[]');
    const hideSingles = !document.getElementById('fetch-hide-singles').checked;
    renderFetchAlbumsList(allAlbums, overlay.dataset.artist, btn.dataset.mode, hideSingles);
  });
  document.getElementById('fetch-hide-singles').addEventListener('change', () => {
    const overlay = document.getElementById('fetch-albums-overlay');
    const allAlbums = JSON.parse(overlay.dataset.allAlbums || '[]');
    const mode = document.querySelector('.fetch-toggle-btn.active')?.dataset.mode || 'exact';
    const hideSingles = !document.getElementById('fetch-hide-singles').checked;
    renderFetchAlbumsList(allAlbums, overlay.dataset.artist, mode, hideSingles);
  });

  document.getElementById('fab-add').addEventListener('click', () => openAddModal());
}

document.addEventListener('DOMContentLoaded', init);
