// ===== MAIN GRID / SIDEBAR / AUTHOR PAGE RENDERING =====

import { state, CURATED_ITEMS, CATEGORIES, CAT_LABEL, CAT_EMOJI, CURATED_GENRES, GENRE_EMOJI } from './state.js';
import {
  escapeHtml, catClass, badgeLabel, isMusicAlbumsSectionView, isOwnAuthorPageView, getDomain,
  isItunesArtworkUrl, patchCardImage,
} from './utils.js';
import {
  persistViewState, persistItem, persistHiddenCurated, persistCuratedImgCache,
  persistFolder, removeFolder, removeItem,
} from './storage.js';
import { ensureArtistWikipediaInfo } from './api.js';
import { findAuthor, resolveMusicianItem, wireCardAuthorLinks, backfillAlbumYears } from './authors.js';
import { renderKanbanBoard } from './kanban.js';
import { openDetailModal } from './detailModal.js';
import { openEditModal } from './addEditModal.js';
import { openFetchAlbumsModal } from './fetchAlbumsModal.js';
import { renderDashboard } from './dashboard.js';
import { closeSidebar } from './main.js';

export function getFilteredSortedItems() {
  let items = [...state.items];

  if (state.view === 'all') {
    // no filter
  } else if (state.view.startsWith('genre:')) {
    const parts = state.view.slice(6).split(':');
    const genre = parts[0];
    const cat = parts[1];
    if (cat && CURATED_ITEMS[genre] && CURATED_ITEMS[genre][cat]) {
      items = CURATED_ITEMS[genre][cat]
        .filter(i => !state.hiddenCurated.has(i.id))
        .map(i => {
          const override = state.curatedOverrides[i.id] || {};
          const base = { ...i, ...override, category: cat, done: false, savedAt: 0, folderId: null, curated: true };
          if (!base.imageUrl && state.curatedImgCache[i.id]) base.imageUrl = state.curatedImgCache[i.id];
          if (cat === 'Music Album') {
            const meta = state.curatedAlbumMetaCache[i.id];
            if (meta) {
              if (!base.year && meta.year) base.year = meta.year;
              if (!base.collectionId && meta.collectionId) base.collectionId = meta.collectionId;
            }
          }
          if (cat === 'Musician') {
            const wikiPhoto = state.artistBioCache[(base.title || '').trim().toLowerCase()]?.photoUrl;
            if (wikiPhoto && (!base.imageUrl || isItunesArtworkUrl(base.imageUrl))) base.imageUrl = wikiPhoto;
          }
          return base;
        });
    } else {
      items = [];
    }
  } else if (state.view.startsWith('author:')) {
    const rest = state.view.slice(7);
    const colonIdx = rest.indexOf(':');
    const cat  = rest.slice(0, colonIdx);
    const name = rest.slice(colonIdx + 1);
    const relatedCats = cat === 'Musician' ? ['Musician', 'Music Album'] : [cat];
    items = items.filter(i => relatedCats.includes(i.category) && i.author === name);
    if (cat === 'Musician') {
      const existingIds = new Set(items.map(i => i.id));
      for (const genre of Object.keys(CURATED_ITEMS)) {
        (CURATED_ITEMS[genre]['Music Album'] || [])
          .filter(i => i.notes === name && !state.hiddenCurated.has(i.id) && !existingIds.has(i.id))
          .forEach(i => {
            const override = state.curatedOverrides[i.id] || {};
            const merged = { ...i, ...override, category: 'Music Album', curated: true, done: false, savedAt: 0, folderId: null };
            const meta = state.curatedAlbumMetaCache[i.id];
            if (meta) {
              if (!merged.year && meta.year) merged.year = meta.year;
              if (!merged.collectionId && meta.collectionId) merged.collectionId = meta.collectionId;
            }
            items.push(merged);
          });
      }
    }
  } else if (CATEGORIES.includes(state.view)) {
    items = items.filter(i => i.category === state.view);
  } else {
    items = items.filter(i => i.folderId === state.view);
  }

  // Search filter
  if (state.search) {
    const q = state.search.toLowerCase();
    items = items.filter(i =>
      (i.title || '').toLowerCase().includes(q) ||
      (i.url || '').toLowerCase().includes(q)
    );
  }

  // Sort
  switch (state.sort) {
    case 'newest': items.sort((a, b) => b.savedAt - a.savedAt); break;
    case 'oldest': items.sort((a, b) => a.savedAt - b.savedAt); break;
    case 'az': items.sort((a, b) => {
      const ta = a.title || '', tb = b.title || '';
      const aNum = /^\d/.test(ta), bNum = /^\d/.test(tb);
      if (aNum !== bNum) return aNum ? 1 : -1;
      return ta.localeCompare(tb);
    }); break;
    case 'za': items.sort((a, b) => {
      const ta = a.title || '', tb = b.title || '';
      const aNum = /^\d/.test(ta), bNum = /^\d/.test(tb);
      if (aNum !== bNum) return aNum ? 1 : -1;
      return tb.localeCompare(ta);
    }); break;
    case 'release-new': items.sort((a, b) => (parseInt(b.year) || -Infinity) - (parseInt(a.year) || -Infinity)); break;
    case 'release-old': items.sort((a, b) => (parseInt(a.year) || Infinity) - (parseInt(b.year) || Infinity)); break;
  }

  return items;
}

// ===== SIDEBAR =====
export function renderSidebar() {
  const sidebar = document.getElementById('sidebar');
  let sidebarTitle = 'My Saves';
  if (state.view.startsWith('author:')) {
    sidebarTitle = 'My Saves';
  } else if (state.view.startsWith('genre:')) {
    sidebarTitle = state.view.slice(6).split(':')[0] + ' Saves';
  } else if (state.sidebarMode === 'curated') {
    sidebarTitle = 'Curated SaveCraft';
  } else if (state.sidebarMode === 'sponsored') {
    sidebarTitle = 'VoteCraft Picks';
  }
  const headerTitleEl = document.getElementById('sidebar-header-title');
  const isCuratedDrilldown = state.sidebarMode === 'curated' && state.view.startsWith('genre:');
  if (isCuratedDrilldown) {
    headerTitleEl.innerHTML = `<button class="sidebar-back-btn" id="sidebar-back-btn" title="Back to genres"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg><span>${escapeHtml(sidebarTitle)}</span></button>`;
  } else {
    headerTitleEl.textContent = sidebarTitle;
  }
  document.getElementById('sidebar-back-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const parts = state.view.slice(6).split(':'); // strip 'genre:' prefix -> [genre, category?]
    state.view = parts.length > 1 ? `genre:${parts[0]}` : 'curated';
    persistViewState();
    renderSidebar();
    renderGrid();
  });

  const mobileHeader = `
    <div class="sidebar-mobile-header">
      <span class="sidebar-mobile-title">${escapeHtml(sidebarTitle)}</span>
      <button class="sidebar-close-btn" aria-label="Close menu">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="sidebar-mode-tabs">
      <button class="sidebar-mode-tab ${state.sidebarMode === 'home' ? 'active' : ''}" data-sidebar-opt="home">🏠 Home</button>
      <button class="sidebar-mode-tab ${state.sidebarMode === 'categories' ? 'active' : ''}" data-sidebar-opt="my-lists">My Saves</button>
      <button class="sidebar-mode-tab ${state.sidebarMode === 'curated' ? 'active' : ''}" data-sidebar-opt="curated">Curated</button>
      <button class="sidebar-mode-tab sidebar-mode-tab--sponsored ${state.sidebarMode === 'sponsored' ? 'active' : ''}" data-sidebar-opt="sponsored">⚡ VC</button>
    </div>
  `;

  function wireMobileHeader() {
    sidebar.querySelector('.sidebar-close-btn')?.addEventListener('click', closeSidebar);
    sidebar.querySelectorAll('[data-sidebar-opt]').forEach(btn => {
      btn.addEventListener('click', () => {
        const opt = btn.dataset.sidebarOpt;
        if (opt === 'home') {
          state.sidebarMode = 'home'; state.view = 'dashboard';
        } else if (opt === 'curated') {
          state.sidebarMode = 'curated'; state.view = 'curated';
        } else if (opt === 'sponsored') {
          state.sidebarMode = 'sponsored'; state.view = 'sponsored';
        } else {
          state.sidebarMode = 'categories'; state.view = 'all';
        }
        // Arriving at the dashboard is never persisted as the "last view" — see main.js's
        // init() for why — so the real last-active view stays intact until the user actually
        // navigates somewhere else.
        if (opt !== 'home') persistViewState();
        renderSidebar();
        renderGrid();
      });
    });
  }

  // Curated mode: genre picker until a genre is selected, then show categories
  if (state.sidebarMode === 'curated' && !state.view.startsWith('genre:')) {
    sidebar.innerHTML = mobileHeader + `
      <div class="sidebar-items-scroll">
        ${CURATED_GENRES.map((genre, i) => `
          ${i > 0 ? '<div class="sidebar-divider"></div>' : ''}
          <div class="sidebar-item sidebar-genre" data-genre="${genre}">
            <span class="sidebar-label"><span class="cat-icon">${GENRE_EMOJI[genre] || '📁'}</span><span class="sidebar-label-text"> ${escapeHtml(genre)}</span></span>
            <svg class="sidebar-genre-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        `).join('')}
      </div>
    `;
    wireMobileHeader();
    sidebar.querySelectorAll('.sidebar-genre').forEach(el => {
      el.addEventListener('click', () => {
        state.view = 'genre:' + el.dataset.genre;
        persistViewState();
        renderSidebar();
        renderGrid();
      });
    });
    return;
  }

  const isCuratedGenre = state.view.startsWith('genre:');
  const curatedGenreBase = isCuratedGenre ? state.view.slice(6).split(':')[0] : null;
  const categorySections = CATEGORIES.filter(cat => cat !== 'Music Album').map(cat => {
    const count = isCuratedGenre
      ? (CURATED_ITEMS[curatedGenreBase]?.[cat]?.filter(i => !state.hiddenCurated.has(i.id)).length ?? 0)
      : state.items.filter(i => i.category === cat).length;
    const subfolders = state.folders.filter(f => f.parentCategory === cat);
    const isActive = isCuratedGenre
      ? state.view === `genre:${curatedGenreBase}:${cat}`
      : state.view === cat;
    const isCollapsed = state.collapsed.has(cat);
    const countLabel = count > 0 ? `<span class="sidebar-count">${count}</span>` : '';
    const arrow = isCollapsed ? '▶' : '▼';

    const musicAlbumActive = isCuratedGenre
      ? state.view === `genre:${curatedGenreBase}:Music Album`
      : state.view === 'Music Album';
    const permanentSubfolders = cat === 'Musician' ? `
      <div class="sidebar-item sidebar-subfolder ${musicAlbumActive ? 'active' : ''}"
           data-view="Music Album" data-permanent="true">
        <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M500-360q42 0 71-29t29-71v-220h120v-80H560v220q-13-10-28-15t-32-5q-42 0-71 29t-29 71q0 42 29 71t71 29ZM320-240q-33 0-56.5-23.5T240-320v-480q0-33 23.5-56.5T320-880h480q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H320Zm0-80h480v-480H320v480ZM160-80q-33 0-56.5-23.5T80-160v-560h80v560h560v80H160Zm160-720v480-480Z"/></svg> Music Albums
      </div>
    ` : '';

    const subfolderRows = subfolders.map(folder => {
      const fCount = isCuratedGenre ? 0 : state.items.filter(i => i.folderId === folder.id).length;
      const fCountLabel = fCount > 0 ? `<span class="sidebar-count">${fCount}</span>` : '';
      return `
        <div class="sidebar-item sidebar-subfolder ${state.view === folder.id ? 'active' : ''}"
             data-view="${folder.id}">
          <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h240l80 80h320q33 0 56.5 23.5T880-640v400q0 33-23.5 56.5T800-160H160Z"/></svg> ${escapeHtml(folder.name)}
          ${fCountLabel}
          <button class="sidebar-delete-folder" data-folder-id="${folder.id}" title="Delete folder">×</button>
        </div>
      `;
    }).join('');

    const expandedContent = isCollapsed ? '' : `
      ${permanentSubfolders}
      ${subfolderRows}
      <div class="sidebar-item sidebar-add-folder" data-add-folder="${cat}">
        + New folder
      </div>
    `;

    return `
      <div class="sidebar-item sidebar-category ${isActive ? 'active' : ''}"
           data-view="${cat}" data-toggle="${cat}">
        <span class="sidebar-label"><span class="cat-icon">${CAT_EMOJI[cat]}</span><span class="sidebar-label-text"> ${CAT_LABEL[cat] || cat}</span></span>
        <span class="sidebar-right">${countLabel}<span class="sidebar-arrow">${arrow}</span></span>
      </div>
      ${expandedContent}
    `;
  }).join('<div class="sidebar-divider"></div>');

  sidebar.innerHTML = mobileHeader + `
    <div class="sidebar-items-scroll">
      ${categorySections}
    </div>
  `;
  wireMobileHeader();

  // Category header: toggle collapse OR switch view
  sidebar.querySelectorAll('.sidebar-category').forEach(el => {
    el.addEventListener('click', () => {
      const cat = el.dataset.toggle;
      if (state.collapsed.has(cat)) {
        // Expanding — collapse all others first
        state.collapsed = new Set(CATEGORIES);
        state.collapsed.delete(cat);
      } else {
        state.collapsed.add(cat);
      }
      if (isCuratedGenre) {
        state.view = `genre:${curatedGenreBase}:${cat}`;
      } else {
        state.view = cat;
      }
      renderSidebar();
      renderGrid();
    });
  });

  // All Items
  sidebar.querySelectorAll('[data-view="all"]').forEach(el => {
    el.addEventListener('click', () => {
      state.view = 'all';
      renderSidebar();
      renderGrid();
    });
  });

  // Subfolder view-switching
  sidebar.querySelectorAll('.sidebar-subfolder').forEach(el => {
    el.addEventListener('click', () => {
      if (isCuratedGenre && el.dataset.permanent) {
        state.view = `genre:${curatedGenreBase}:${el.dataset.view}`;
      } else {
        state.view = el.dataset.view;
      }
      persistViewState();
      renderSidebar();
      renderGrid();
    });
  });

  sidebar.querySelectorAll('[data-add-folder]').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      promptAddFolder(el.dataset.addFolder);
    });
  });

  sidebar.querySelectorAll('.sidebar-delete-folder').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const folderId = btn.dataset.folderId;
      if (!confirm('Delete this folder? Items inside will stay in the category.')) return;

      const affected = state.items.filter(i => i.folderId === folderId);
      for (const item of affected) {
        item.folderId = null;
        await persistItem(item);
      }

      state.folders = state.folders.filter(f => f.id !== folderId);
      await removeFolder(folderId);

      if (state.view === folderId) state.view = 'all';
      renderSidebar();
      renderGrid();
    });
  });
}

// Tracks item ids with a lookup currently in flight, so a renderGrid() firing again before the
// previous round-trip resolves (e.g. rapid filter/search changes) doesn't fire a duplicate fetch.
const _curatedImgFetchInFlight = new Set();
export function fetchMissingCuratedImages(items) {
  const missing = items.filter(i => i.curated && !i.imageUrl && !_curatedImgFetchInFlight.has(i.id));
  if (!missing.length) return;
  missing.forEach(item => {
    _curatedImgFetchInFlight.add(item.id);
    fetch(`https://api.microlink.io?url=${encodeURIComponent(item.url)}`)
      .then(r => r.json())
      .then(data => {
        const imgUrl = data?.data?.image?.url;
        if (!imgUrl) return;
        state.curatedImgCache[item.id] = imgUrl;
        persistCuratedImgCache();
        const card = document.querySelector(`.card[data-id="${item.id}"]`);
        if (!card) return;
        if (card.querySelector('.card-image')) return; // already has an image, don't double-insert
        const placeholder = card.querySelector('.card-placeholder');
        if (!placeholder) return;
        const img = document.createElement('img');
        img.className = 'card-image';
        img.src = imgUrl;
        img.alt = '';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.onerror = () => { img.style.display = 'none'; placeholder.style.display = 'flex'; };
        placeholder.style.display = 'none'; // hide placeholder before image arrives
        card.insertBefore(img, placeholder);
      })
      .catch(() => {})
      .finally(() => _curatedImgFetchInFlight.delete(item.id));
  });
}

// Same idea as fetchMissingCuratedImages(), but for curated Musician cards whose photo is
// missing or still the iTunes stand-in — looks up (and caches) the Wikipedia photo per artist,
// then live-patches any matching cards already on screen.
const _curatedMusicianPhotoFetchInFlight = new Set();
export function fetchMissingCuratedMusicianPhotos(items) {
  const missing = items.filter(i => i.curated && i.category === 'Musician' && (!i.imageUrl || isItunesArtworkUrl(i.imageUrl)) && !_curatedMusicianPhotoFetchInFlight.has(i.id));
  if (!missing.length) return;
  missing.forEach(item => {
    _curatedMusicianPhotoFetchInFlight.add(item.id);
    ensureArtistWikipediaInfo(item.title)
      .then(({ photoUrl }) => {
        if (!photoUrl) return;
        patchCardImage(item.id, photoUrl);
      })
      .finally(() => _curatedMusicianPhotoFetchInFlight.delete(item.id));
  });
}

export function renderGrid() {
  const container = document.getElementById('cards-grid');
  const gridTitle = document.getElementById('grid-title');

  document.getElementById('saves-list-wrap').style.display = 'none';
  document.getElementById('saves-list-dropdown')?.setAttribute('hidden', '');
  document.getElementById('board-filter-wrap').style.display = 'none';
  document.getElementById('board-filter-dropdown')?.setAttribute('hidden', '');
  document.getElementById('board-info-wrap').style.display = 'none';
  document.getElementById('board-info-popup')?.setAttribute('hidden', '');
  document.getElementById('sort-select').style.display = '';
  gridTitle.style.display = '';
  document.querySelector('.grid-header').style.display = ''; // dashboard.js hides this wrapper entirely; every other view needs it restored

  if (state.view === 'kanban') {
    renderKanbanBoard();
    return;
  }

  if (state.view === 'dashboard') {
    renderDashboard();
    return;
  }

  if (state.view === 'sponsored') {
    gridTitle.textContent = '';
    container.className = 'cards-grid landing-state';
    container.innerHTML = `
      <div class="empty-state empty-state--sponsored">
        <div class="empty-state-icon">⚡</div>
        <h3>VoteCraft Picks</h3>
        <p>Curated picks brought to you by VoteCraft.<br>Coming soon.</p>
      </div>
    `;
    persistViewState();
    return;
  }

  if (state.view === 'all' && state.sidebarMode === 'categories') {
    renderKanbanBoard();
    return;
  }

  if (state.view.startsWith('author:')) {
    renderAuthorPage();
    return;
  }

  container.className = 'cards-grid';

  if (state.view === 'all') {
    gridTitle.textContent = 'All Items';
  } else if (state.view.startsWith('genre:')) {
    const parts = state.view.slice(6).split(':');
    // NOTE: curated categories are keyed by their singular CATEGORIES names (e.g. 'Musician',
    // 'Show'), not display plurals — these checks previously used the wrong strings and never
    // matched, so none of these logos ever actually rendered.
    if (state.view === 'genre:Top 100:Musician' || state.view === 'genre:Top 100:Show' || state.view === 'genre:Top 100:Book') {
      const label = `Top 100 ${escapeHtml(CAT_LABEL[parts[1]] || parts[1])}`;
      gridTitle.innerHTML = `${label} <span class="rs-logo-wrap"><img src="${chrome.runtime.getURL('images/logos/pngkey.com-rolling-stones-tongue-png-3135824.png')}" class="rs-logo-img" alt="Rolling Stone"></span>`;
    } else if (state.view === 'genre:Top 100:Game') {
      gridTitle.innerHTML = `Top 100 Games <span class="steam-logo-wrap"><img src="${chrome.runtime.getURL('images/logos/steam.png')}" class="steam-logo-img" alt="Steam"></span>`;
    } else if (state.view === 'genre:Top 100:Movie') {
      const catLabel = `Top 100 ${escapeHtml(CAT_LABEL[parts[1]] || parts[1])}`;
      gridTitle.innerHTML = `${catLabel} <span class="nyt-logo-wrap"><svg viewBox="0 0 452.8 59.5" xmlns="http://www.w3.org/2000/svg" aria-label="The New York Times"><path d="M33.9,6.1c0-4.9-4.7-6.1-8.4-6.1v0.7c2.2,0,3.9,0.7,3.9,2.5c0,1-0.7,2.5-3,2.5c-1.7,0-5.4-1-8.1-2c-3.2-1.2-6.1-2.2-8.6-2.2c-4.9,0-8.4,3.7-8.4,7.9c0,3.7,2.7,4.9,3.7,5.4l0.2-0.5c-0.5-0.5-1.2-1-1.2-2.5c0-1,1-2.7,3.4-2.7c2.2,0,5.2,1,9.1,2.2c3.4,1,7.1,1.7,9.1,2v7.6l-3.7,3.2v0.2l3.7,3.2v10.6c-2,1.2-4.2,1.5-6.1,1.5c-3.7,0-6.9-1-9.6-3.9l10.1-4.9v-17L7.9,19.2c1-3.2,3.7-5.4,6.4-6.9L14,11.6c-7.4,2-14,8.9-14,17.2C0,38.6,8.1,46,17.2,46c9.8,0,16.2-7.9,16.2-16H33c-1.5,3.2-3.7,6.1-6.4,7.6V27.5l3.9-3.2v-0.2l-3.9-3.2v-7.6C30.3,13.3,33.9,10.8,33.9,6.1z M12.5,33.2l-3,1.5c-1.7-2.2-2.7-5.2-2.7-9.3c0-1.7,0-3.7,0.5-5.2l5.2-2.2V33.2z M38.6,38.9l-3.2,2.5l0.5,0.5l1.5-1.2l5.4,4.9l7.4-4.9l-0.2-0.5l-2,1.2l-2.5-2.5V22.1l2-1.5l4.2,3.4v15c0,9.3-2,10.8-6.1,12.3v0.7c6.9,0.2,13.3-2,13.3-14V21.9l2.2-1.7l-0.5-0.5l-2,1.5L52.4,16l-6.9,5.2V1H45l-8.6,5.9v0.5c1,0.5,2.5,1,2.5,3.7C38.9,11.1,38.6,38.9,38.6,38.9z M83.6,36.2l-6.1,4.7l-6.1-4.9v-3l11.6-7.9v-0.2L77,16l-12.8,6.9v16.2l-2.5,2l0.5,0.5l2.2-1.7l8.4,6.1l11.1-8.9C83.9,37.1,83.6,36.2,83.6,36.2z M71.3,32V19.9l0.5-0.2l5.4,8.6C77.2,28.3,71.3,32,71.3,32z M130.6,3.9c0-0.7-0.2-1.5-0.5-2.2h-0.5c-0.7,2-1.7,3-4.2,3c-2.2,0-3.7-1.2-4.7-2.2l-7.1,8.1l0.5,0.5l2.5-2.2c1.5,1.2,2.7,2.2,6.1,2.5v20.4L108.2,6.9c-1.2-2-3-4.7-6.4-4.7c-3.9,0-7.4,3.4-6.9,8.9h0.7c0.2-1.5,1-3.2,2.7-3.2c1.2,0,2.5,1.2,3.2,2.5v8.1c-4.4,0-7.4,2-7.4,5.7c0,2,1,4.9,3.9,5.7v-0.5c-0.5-0.5-0.7-1-0.7-1.7c0-1.2,1-2.2,2.7-2.2h1.2v10.3c-5.2,0-9.3,3-9.3,7.9c0,4.7,3.9,6.9,8.4,6.6v-0.5c-2.7-0.2-3.9-1.5-3.9-3.2c0-2.2,1.5-3.2,3.4-3.2c2,0,3.7,1.2,4.9,2.7l7.1-7.9l-0.5-0.5l-1.7,2c-2.7-2.5-4.2-3.2-7.4-3.7V11.3L122,45.7h1.5V11.3C127.1,11.1,130.6,8.1,130.6,3.9z M148.5,36.2l-6.1,4.7l-6.1-4.9v-3l11.6-7.9v-0.2l-5.9-8.9l-12.8,6.9v16.2l-2.5,2l0.5,0.5l2.2-1.7l8.4,6.1l11.1-8.9C148.8,37.1,148.5,36.2,148.5,36.2z M136.2,32V19.9l0.5-0.2l5.4,8.6C142.2,28.3,136.2,32,136.2,32z M188.6,18.7l-1.7,1.2l-4.7-3.9l-5.4,4.9l2.2,2.2v18.4l-5.9-3.7V22.6l2-1.2l-5.7-5.4l-5.4,4.9l2.2,2.2v17.7l-0.7,0.5l-5.2-3.7V22.9c0-3.4-1.7-4.4-3.7-5.7c-1.7-1.2-2.7-2-2.7-3.7c0-1.5,1.5-2.2,2.2-2.7v-0.5c-2,0-7.1,2-7.1,6.6c0,2.5,1.2,3.4,2.5,4.7c1.2,1.2,2.5,2.2,2.5,4.4v14.3l-2.7,2l0.5,0.5l2.5-2l5.7,4.9l6.1-4.2l6.9,4.2l13-7.6V21.6l3.2-2.5L188.6,18.7L188.6,18.7z M234.4,5.2l-2.5,2.2l-5.4-4.9l-8.1,5.9V3h-0.7l0.2,39.8c-0.7,0-3-0.5-4.7-1l-0.5-33.2c0-2.5-1.7-5.9-6.1-5.9s-7.4,3.4-7.4,6.9h0.7c0.2-1.5,1-2.7,2.5-2.7c1.5,0,2.7,1,2.7,4.2v9.6c-4.4,0.2-7.1,2.7-7.1,5.9c0,2,1,4.9,3.9,4.9V31c-1-0.5-1.2-1.2-1.2-1.7c0-1.5,1.2-2,3.2-2h1v15.2c-3.7,1.2-5.2,3.9-5.2,6.9c0,4.2,3.2,7.1,8.1,7.1c3.4,0,6.4-0.5,9.3-1.2c2.5-0.5,5.7-1.2,7.1-1.2c2,0,2.7,1,2.7,2.2c0,1.7-0.7,2.5-1.7,2.7v0.5c3.9-0.7,6.4-3.2,6.4-6.9s-3.7-5.9-7.6-5.9c-2,0-6.1,0.7-9.1,1.2c-3.4,0.7-6.9,1.2-7.9,1.2c-1.7,0-3.7-0.7-3.7-3.2c0-2,1.7-3.7,5.9-3.7c2.2,0,4.9,0.2,7.6,1c3,0.7,5.7,1.5,8.1,1.5c3.7,0,6.9-1.2,6.9-6.4V8.1l3-2.5L234.4,5.2L234.4,5.2z M224.3,20.2c-0.7,0.7-1.7,1.5-3,1.5s-2.5-0.7-3-1.5V9.3l2.5-1.7l3.4,3.2C224.3,10.8,224.3,20.2,224.3,20.2z M224.3,27.5c-0.5-0.5-1.7-1.2-3-1.2s-2.5,0.7-3,1.2v-6.4c0.5,0.5,1.7,1.2,3,1.2s2.5-0.7,3-1.2V27.5z M224.3,39.1c0,2-1.2,3.9-3.9,3.9h-2V28.5c0.5-0.5,1.7-1.2,3-1.2s2.2,0.7,3,1.2C224.3,28.5,224.3,39.1,224.3,39.1z M258,21.6l-7.9-5.7l-12.1,6.9v16l-2.5,2l0.2,0.5l2-1.5l7.9,5.9l12.3-7.4C258,38.4,258,21.6,258,21.6z M244.7,37.1V19.4l6.1,4.4v17.5C250.9,41.3,244.7,37.1,244.7,37.1z M281.4,16.5h-0.5c-0.7,0.5-1.5,1-2.2,1c-1,0-2.2-0.5-2.7-1.2h-0.5l-4.2,4.7l-4.2-4.7l-7.4,4.9l0.2,0.5l2-1.2l2.5,2.7v15.5l-3.2,2.5l0.5,0.5l1.5-1.2l5.9,4.9l7.6-5.2l-0.2-0.5l-2.2,1.2l-3-2.5V21.2c1.2,1.2,2.7,2.5,4.4,2.5C279.1,23.9,281.1,20.4,281.4,16.5L281.4,16.5z M310.9,40.1l-8.4,5.7l-11.3-17.2l8.1-12.5h0.5c1,1,2.5,2,4.2,2c1.7,0,3-1,3.7-2h0.5c-0.2,4.9-3.7,7.9-6.1,7.9c-2.5,0-3.7-1.2-5.2-2l-0.7,1.2l12.3,18.2l2.5-1.5V40.1z M283.8,38.9l-3.2,2.5l0.5,0.5l1.5-1.2l5.4,4.9l7.4-4.9l-0.5-0.5l-2,1.2l-2.5-2.5V1h-0.2l-8.9,5.9v0.5c1,0.5,2.5,0.7,2.5,3.7C283.8,11.1,283.8,38.9,283.8,38.9z M351.7,6.1c0-4.9-4.7-6.1-8.4-6.1v0.7c2.2,0,3.9,0.7,3.9,2.5c0,1-0.7,2.5-3,2.5c-1.7,0-5.4-1-8.1-2c-3.2-1-6.1-2-8.6-2c-4.9,0-8.4,3.7-8.4,7.9c0,3.7,2.7,4.9,3.7,5.4l0.2-0.5c-0.7-0.5-1.5-1-1.5-2.5c0-1,1-2.7,3.4-2.7c2.2,0,5.2,1,9.1,2.2c3.4,1,7.1,1.7,9.1,2v7.6l-3.7,3.2v0.2l3.7,3.2v10.6c-2,1.2-4.2,1.5-6.1,1.5c-3.7,0-6.9-1-9.6-3.9l10.1-4.9V13.8l-12.3,5.4c1.2-3.2,3.9-5.4,6.4-7.1l-0.2-0.5c-7.4,2-14,8.6-14,17c0,9.8,8.1,17.2,17.2,17.2c9.8,0,16.2-7.9,16.2-16h-0.5c-1.5,3.2-3.7,6.1-6.4,7.6V27.3l3.9-3.2v-0.2l-3.7-3.2v-7.4C348,13.3,351.7,10.8,351.7,6.1z M330.3,33.2l-3,1.5c-1.7-2.2-2.7-5.2-2.7-9.3c0-1.7,0.2-3.7,0.7-5.2l5.2-2.2L330.3,33.2z M360.3,3.7H360l-4.9,4.2v0.2l4.2,4.7h0.5l4.9-4.2V8.4L360.3,3.7L360.3,3.7z M367.7,40.1l-2,1.2l-2.5-2.5v-17l2.5-1.7l-0.5-0.5l-1.7,1.5l-4.4-5.2l-7.1,4.9l0.5,0.7l1.7-1.2l2.2,2.7v16l-3.2,2.5l0.2,0.5l1.7-1.2l5.4,4.9l7.4-4.9L367.7,40.1L367.7,40.1z M408.7,39.8l-1.7,1.2l-2.7-2.5V21.9l2.5-2l-0.5-0.5l-2,1.7l-5.7-5.2l-7.4,5.2l-5.7-5.2l-6.9,5.2l-4.4-5.2l-7.1,4.9l0.2,0.7l1.7-1.2l2.5,2.7v16l-2,2l5.7,4.7l5.4-4.9l-2.2-2.2V21.9l2.2-1.5l3.7,3.4v14.8l-2,2l5.7,4.7l5.4-4.9l-2.2-2.2V21.9l2-1.2l3.9,3.4v14.8l-1.7,1.7l5.7,5.2l7.6-5.2L408.7,39.8L408.7,39.8z M430.1,36.2l-6.1,4.7l-6.1-4.9v-3l11.6-7.9v-0.2l-5.9-8.9l-12.8,6.9v16.7l8.6,6.1l11.1-8.9C430.4,36.9,430.1,36.2,430.1,36.2z M417.8,32V19.9l0.5-0.2l5.4,8.6C423.7,28.3,417.8,32,417.8,32z M452.5,29.8l-4.7-3.7c3.2-2.7,4.4-6.4,4.4-8.9v-1.5h-0.5c-0.5,1.2-1.5,2.5-3.4,2.5c-2,0-3.2-1-4.4-2.5l-11.1,6.1v8.9l4.2,3.2c-4.2,3.7-4.9,6.1-4.9,8.1c0,2.5,1.2,4.2,3.2,4.9l0.2-0.5c-0.5-0.5-1-0.7-1-2c0-0.7,1-2,3-2c2.5,0,3.9,1.7,4.7,2.5l10.6-6.4v-8.9C452.8,29.8,452.5,29.8,452.5,29.8z M449.8,22.4c-1.7,3-5.4,5.9-7.6,7.4l-2.7-2.2v-8.6c1,2.5,3.7,4.4,6.4,4.4C447.6,23.4,448.6,23.1,449.8,22.4z M445.6,42.1c-1.2-2.7-4.2-4.7-7.1-4.7c-0.7,0-2.7,0-4.7,1.2c1.2-2,4.4-5.4,8.6-7.9l3,2.5L445.6,42.1L445.6,42.1z"/></svg></span>`;
    } else {
      gridTitle.textContent = parts.length === 2
        ? `${parts[0]} ${parts[1]}`
        : `${parts[0]} Saves`;
    }
  } else if (CATEGORIES.includes(state.view)) {
    gridTitle.innerHTML = `${CAT_EMOJI[state.view]} ${CAT_LABEL[state.view] || state.view}`;
  } else {
    const folder = state.folders.find(f => f.id === state.view);
    gridTitle.textContent = folder ? folder.name : 'Folder';
  }

  const items = getFilteredSortedItems();

  if (items.length === 0) {
    const isSearch = !!state.search;
    const isCuratedTop = state.view.startsWith('genre:') && state.view.split(':').length === 2;
    const isCuratedLanding = state.view === 'curated';
    const genre = isCuratedTop ? state.view.slice(6) : null;
    container.className = (isCuratedTop || isCuratedLanding || !isSearch) ? 'cards-grid landing-state' : 'cards-grid';
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">${isSearch ? '🔍' : isCuratedLanding ? '✨' : isCuratedTop ? '✨' : '📦'}</div>
        <h3>${isSearch ? 'No results found' : isCuratedLanding ? 'Pick a category' : isCuratedTop ? `${genre} Saves` : 'Nothing here yet'}</h3>
        <p>${isSearch ? `No items match "${escapeHtml(state.search)}"` : isCuratedLanding ? 'Explore the sidebar to see our curated picks.' : isCuratedTop ? 'Pick a category from the sidebar to explore curated picks.' : 'Right-click any page to save it, or click + Add Item.'}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = items.map(item => renderCard(item)).join('');
  persistViewState();
  fetchMissingCuratedImages(items);
  fetchMissingCuratedMusicianPhotos(items);

  container.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('.card-action-btn')) return;
      let item = state.items.find(i => i.id === card.dataset.id);
      if (!item) {
        for (const genre of Object.keys(CURATED_ITEMS)) {
          for (const cat of Object.keys(CURATED_ITEMS[genre])) {
            const found = CURATED_ITEMS[genre][cat].find(i => i.id === card.dataset.id);
            if (found) { item = { ...found, category: cat, curated: true }; break; }
          }
          if (item) break;
        }
      }
      if (item) openDetailModal(item);
    });
  });

  wireCardAuthorLinks(container);

  container.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      let item = state.items.find(i => i.id === btn.dataset.id);
      if (!item) {
        // Look up from curated data
        for (const genre of Object.keys(CURATED_ITEMS)) {
          for (const cat of Object.keys(CURATED_ITEMS[genre])) {
            const found = CURATED_ITEMS[genre][cat].find(i => i.id === btn.dataset.id);
            if (found) { item = { ...found, category: cat, curated: true }; break; }
          }
          if (item) break;
        }
      }
      if (!item) return;
      openEditModal(item);
    });
  });

  container.querySelectorAll('.btn-save-curated').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const id = btn.dataset.id;
      if (state.items.some(i => i._curatedSourceId === id)) {
        btn.title = 'Already saved!';
        btn.style.color = '#5B5BEF';
        setTimeout(() => { btn.title = 'Save to My Saves'; btn.style.color = ''; }, 1500);
        return;
      }
      let source = null;
      let sourceCat = null;
      for (const genre of Object.keys(CURATED_ITEMS)) {
        for (const cat of Object.keys(CURATED_ITEMS[genre])) {
          const found = CURATED_ITEMS[genre][cat].find(i => i.id === id);
          if (found) { source = found; sourceCat = cat; break; }
        }
        if (source) break;
      }
      if (!source) return;
      const newItem = {
        id: Date.now().toString(),
        url: source.url,
        title: source.title,
        notes: source.notes || null,
        imageUrl: source.imageUrl || state.curatedImgCache[id] || null,
        description: null,
        category: sourceCat,
        folderId: null,
        platforms: null,
        done: false,
        savedAt: Date.now(),
        _curatedSourceId: id,
      };
      await persistItem(newItem);
      state.items.unshift(newItem);
      btn.style.color = '#5B5BEF';
      btn.title = 'Saved!';
      setTimeout(() => { btn.style.color = ''; btn.title = 'Save to My Saves'; }, 1500);
      renderSidebar();
    });
  });

  container.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const id = btn.dataset.id;
      if (!confirm('Remove this item from SaveCraft?')) return;
      if (id.startsWith('cur-') && !state.items.find(i => i.id === id)) {
        state.hiddenCurated.add(id);
        await persistHiddenCurated();
      } else {
        await removeItem(id);
        state.items = state.items.filter(i => i.id !== id);
      }
      renderSidebar();
      renderGrid();
    });
  });
}

export function renderAuthorPage() {
  const rest = state.view.slice(7);
  const colonIdx = rest.indexOf(':');
  const cat  = rest.slice(0, colonIdx);
  const name = rest.slice(colonIdx + 1);

  const container = document.getElementById('cards-grid');
  const gridTitle = document.getElementById('grid-title');
  const author = findAuthor(name, cat);

  gridTitle.style.display = '';
  gridTitle.innerHTML = `<button class="author-back-btn" id="author-back-btn"><span>&#8249;</span><span>${CAT_EMOJI[cat] || ''} ${escapeHtml(CAT_LABEL[cat] || cat)}</span></button>`;
  document.getElementById('author-back-btn').addEventListener('click', () => {
    state.view = state.authorReturnView || cat;
    persistViewState();
    renderSidebar();
    renderGrid();
  });

  const items = getFilteredSortedItems();

  const photoHtml = author?.imageUrl
    ? `<img class="author-page-photo" src="${escapeHtml(author.imageUrl)}" alt="" loading="lazy" decoding="async"
            onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
       <div class="author-page-photo-placeholder placeholder-${catClass(cat)}" style="display:none">${escapeHtml(name[0]?.toUpperCase() || '?')}</div>`
    : `<div class="author-page-photo-placeholder placeholder-${catClass(cat)}">${escapeHtml(name[0]?.toUpperCase() || '?')}</div>`;

  container.className = 'cards-grid author-page-grid';
  container.innerHTML = `
    <div class="author-page-header">
      <div class="author-page-photo-wrap">${photoHtml}</div>
      <div class="author-page-info">
        ${cat === 'Musician'
          ? `<button class="author-page-name author-page-name-btn" id="author-page-name-btn">${escapeHtml(name)}<svg class="detail-title-arrow" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m321-80-71-71 329-329-329-329 71-71 400 400L321-80Z"/></svg></button>`
          : `<div class="author-page-name">${escapeHtml(name)}</div>`
        }
        ${author?.websiteUrl ? `<a class="author-page-website" href="${escapeHtml(author.websiteUrl)}" target="_blank" rel="noopener">${escapeHtml(author.websiteUrl)}</a>` : ''}
      </div>
      <div class="author-page-actions">
        ${cat === 'Musician' ? `<button class="btn-fetch-albums" id="btn-fetch-albums">Fetch Albums</button>` : ''}
      </div>
    </div>
    <div class="author-works-header">Works (${items.length})</div>
    <div class="author-works-grid" id="author-works-grid">
      ${items.length > 0
        ? items.map(item => renderCard(item)).join('')
        : '<div class="author-no-works">No saved works yet.</div>'
      }
    </div>
  `;

  document.getElementById('author-page-name-btn')?.addEventListener('click', () => {
    openDetailModal(resolveMusicianItem(name));
  });

  document.getElementById('btn-fetch-albums')?.addEventListener('click', () => {
    openFetchAlbumsModal(name);
  });

  const worksGrid = document.getElementById('author-works-grid');

  worksGrid.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('.card-action-btn') || e.target.closest('.card-author-link')) return;
      let item = state.items.find(i => i.id === card.dataset.id);
      if (!item) {
        for (const genre of Object.keys(CURATED_ITEMS)) {
          for (const c of Object.keys(CURATED_ITEMS[genre])) {
            const found = CURATED_ITEMS[genre][c].find(i => i.id === card.dataset.id);
            if (found) { item = { ...found, category: c, curated: true }; break; }
          }
          if (item) break;
        }
      }
      if (item) openDetailModal(item);
    });
  });

  wireCardAuthorLinks(worksGrid);

  if (cat === 'Musician') backfillAlbumYears(name, items);

  worksGrid.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const item = state.items.find(i => i.id === btn.dataset.id);
      if (item) openEditModal(item);
    });
  });

  worksGrid.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const id = btn.dataset.id;
      if (!confirm('Remove this item from SaveCraft?')) return;
      await removeItem(id);
      state.items = state.items.filter(i => i.id !== id);
      renderSidebar();
      renderAuthorPage();
    });
  });

  persistViewState();
}

export function renderCard(item) {
  const domain = getDomain(item.url);
  const letter = domain[0]?.toUpperCase() || '?';
  const folder = item.folderId ? state.folders.find(f => f.id === item.folderId) : null;

  const imageSection = item.imageUrl
    ? `<img class="card-image" src="${escapeHtml(item.imageUrl)}" alt="" loading="lazy" decoding="async"
            onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
       <div class="card-placeholder placeholder-${catClass(item.category)}" style="display:none;">${letter}</div>`
    : `<div class="card-placeholder placeholder-${catClass(item.category)}">${letter}</div>`;

  const folderLabel = (folder && folder.name !== 'Favorites')
    ? `<span class="card-folder-label"><svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h240l80 80h320q33 0 56.5 23.5T880-640v400q0 33-23.5 56.5T800-160H160Z"/></svg> ${escapeHtml(folder.name)}</span>`
    : '';

  return `
    <div class="card" data-id="${item.id}">
      ${imageSection}
      <div class="card-body">
        ${(() => {
          const aName = item.author || (item.curated && item.category === 'Music Album' ? item.notes : null);
          const aCat  = item.author ? item.category : 'Musician';
          if (!aName) return '';
          if ((item.category === 'Music Album' && isMusicAlbumsSectionView()) || isOwnAuthorPageView(aName)) {
            return `<div class="card-author-name">${escapeHtml(aName)}</div>`;
          }
          return `<button class="card-author-link" data-author="${escapeHtml(aName)}" data-category="${escapeHtml(aCat)}">${escapeHtml(aName)}</button>`;
        })()}
        ${item.category === 'Musician' && !isOwnAuthorPageView(item.title)
          ? `<button class="card-author-link card-title" data-author="${escapeHtml(item.title)}" data-category="Musician">${escapeHtml(item.title || '')}</button>`
          : `<div class="card-title${item.category === 'Music Album' ? ' card-title--album' : ''}">${escapeHtml(item.title || '')}</div>`
        }
        ${item.category === 'Music Album' && item.year ? `<div class="card-album-year">${escapeHtml(item.year)}</div>` : ''}
        <div class="card-meta">
          ${folderLabel}
          <span class="card-badge badge-${catClass(item.category)}" style="margin-left:auto">${badgeLabel(item.category)}</span>
        </div>
      </div>
      ${item.curated ? '' : `<div class="card-actions">
        <button class="card-action-btn btn-edit" data-id="${item.id}" title="Edit"><svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"/></svg></button>
        <button class="card-action-btn btn-delete" data-id="${item.id}" title="Remove"><svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg></button>
      </div>`}
    </div>
  `;
}

// ===== FOLDERS =====
export function promptAddFolder(category) {
  const name = prompt(`New folder name in ${category}:`);
  if (!name?.trim()) return;

  const folder = {
    id: Date.now().toString(),
    name: name.trim(),
    parentCategory: category,
    createdAt: Date.now(),
  };

  state.folders.push(folder);
  persistFolder(folder);
  renderSidebar();
}
