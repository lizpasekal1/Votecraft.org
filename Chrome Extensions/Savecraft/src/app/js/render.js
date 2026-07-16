// ===== MAIN GRID / SIDEBAR / AUTHOR PAGE RENDERING =====

import {
  state, CURATED_ITEMS, CATEGORIES, CAT_LABEL, CAT_EMOJI, CURATED_GENRES, GENRE_EMOJI,
  PRIMARY_FOLDER_ID, CURATED_NOTES_CATEGORIES, CREATOR_CARD_CATEGORY,
  BOOKMARK_OUTLINE_SVG, BOOKMARK_FILLED_SVG, CURATED_GENRE_LANDING_CONTENT, CURATED_DIRECTORY_CONTENT,
} from './state.js';
import {
  SPLIT_TITLE_CREATOR_CATEGORIES, splitCuratedTitleCreator, getStaticCuratedCreator,
} from './curatedCreatorLookup.js';
import {
  escapeHtml, catClass, badgeLabel, isMusicAlbumsSectionView, isOwnAuthorPageView, getDomain,
  isItunesArtworkUrl, patchCardImage, folderIconHtml,
} from './utils.js';
import {
  persistViewState, persistItem, persistHiddenCurated, persistCuratedImgCache,
  persistFolder, removeFolder, removeItem,
} from './storage.js';
import { ensureArtistWikipediaInfo, fetchWikipediaThumbnailForUrl } from './api.js';
import { findAuthor, resolveMusicianItem, wireCardAuthorLinks, backfillAlbumYears, ensureLiveItem } from './authors.js';
import { renderKanbanBoard } from './kanban.js';
import { openDetailModal } from './detailModal.js';
import { openEditModal } from './addEditModal.js';
import { openFetchAlbumsModal } from './fetchAlbumsModal.js';
import { renderDashboard, _wireCarouselArrows } from './dashboard.js';
import { renderProfilePage } from './profile.js';
import { renderSharedSavesPage } from './sharedSaves.js';
import { closeSidebar } from './main.js';

// Fill swapped from the source icon's #1f1f1f (near-black, invisible against .cat-icon's dark
// background) to the same #5B5BEF used by every other sidebar cat-icon SVG (CAT_EMOJI in
// state.js) so it's actually visible in the app's dark theme.
const DASHBOARD_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#5B5BEF"><path d="M160-120v-480l320-240 320 240v480H560v-280H400v280H160Z"/></svg>';
// Sized/colored to match a folder row's icon (folderIconHtml(id, 16), fill="#5B5BEF"), since the
// Queue Kanban link renders as a subfolder-styled row nested under Dashboard, not a category icon.
const KANBAN_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="#5B5BEF"><path d="M280-160v-640h400v640H280Zm-160-80v-480h80v480h-80Zm640 0v-480h80v480h-80Zm-400 0h240v-480H360v480Zm0 0v-480 480Z"/></svg>';

// An item counts as belonging to a category's primary folder if it's actually filed there, or
// if it has no folder at all (un-foldered items are treated as primary so nothing already-saved
// appears to vanish). Categories with no primary folder (e.g. Visual Art) match on category alone.
// Shared by the top-level tab filter, the primary-folder-clicked-directly case, and both sidebar
// count calculations below — previously duplicated inline at each of those four call sites.
function matchesPrimaryOrUnfoldered(item, category) {
  const primaryId = PRIMARY_FOLDER_ID[category];
  return item.category === category && (!primaryId || item.folderId === primaryId || !item.folderId);
}

// Resolves a raw (pre-merge) curated item's creator name, trying every source in the same order
// the main genre: view branch above does — an explicit .author field, then the Book-style split
// title, then the static Movie/Show/Game lookup. Used to match curated items against an author
// page's name without needing to build the full merged item first.
function resolveCuratedCreatorName(cat, item) {
  if (item.author) return item.author;
  if (SPLIT_TITLE_CREATOR_CATEGORIES.includes(cat)) {
    const split = splitCuratedTitleCreator(item.title);
    if (split.author) return split.author;
  }
  return getStaticCuratedCreator(cat, item.title)?.name || null;
}

// Folders that double as an entry point into a curated "creator card" bucket when browsing a
// curated genre — see the sidebar-subfolder rendering/wiring below.
const FOLDER_ID_TO_CURATED_CATEGORY = {
  'default-books-authors': 'Book Author',
  'default-movies-directors': 'Movie Director',
  'default-shows-creators': 'Show Creator',
  'default-games-companies': 'Game Studio',
};

// Folders that represent "the whole category" closely enough to show the full curated Top
// 100/genre list when browsing a curated genre (Books' "Books" folder, Movies' "Movies" folder,
// Shows' "TV Shows" folder, Games' "Console Games" folder — curated Top 100 games are all
// console/PC titles, there's no board/mobile game curated data). Every other regular folder
// (Videos, Podcasts, Webseries, Tutorials, Board Games, Mobile Games) has no curated-specific
// data at all and correctly shows empty rather than duplicating a sibling folder's content.
const FOLDER_SHOWS_FULL_CURATED_CATEGORY = new Set([
  'default-books-books',
  'default-movies-movies',
  'default-shows-shows',
  'default-games-console',
  'default-musicians-musicians',
]);

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
          if (SPLIT_TITLE_CREATOR_CATEGORIES.includes(cat) && !base.author) {
            const split = splitCuratedTitleCreator(base.title);
            base.title = split.title;
            base.author = split.author;
          }
          if (!base.author) {
            const staticCreator = getStaticCuratedCreator(cat, base.title);
            if (staticCreator) {
              base.author = staticCreator.name;
              base.authorHasMore = staticCreator.hasMore;
            }
          }
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
    // Also pull in matching curated Top 100 items — Music Album stashes the creator's name in
    // `.notes` (there's no dedicated creator field in the curated Firestore schema); Book/Movie/
    // Game/Show combine it into `.title` instead ("Title — Creator"), see
    // splitCuratedTitleCreator() below. Musician's related curated category is Music Album (a
    // different category); for Book/Movie/Game/Show the curated category is the page's own
    // category. Keyed by the author-page's `cat` (e.g. 'Musician'), not `item.category` (e.g.
    // 'Music Album') — a different axis than CURATED_NOTES_CATEGORIES above, so kept as its own
    // local list.
    const AUTHOR_PAGE_CURATED_NOTES_CATS = ['Musician', 'Book', 'Movie', 'Game', 'Show'];
    if (AUTHOR_PAGE_CURATED_NOTES_CATS.includes(cat)) {
      const curatedCat = cat === 'Musician' ? 'Music Album' : cat;
      const existingIds = new Set(items.map(i => i.id));
      // The same work is frequently curated separately for multiple genres (e.g. a movie in both
      // "Top 100" and "Thriller") — each is its own Firestore doc with its own id, so id-based
      // dedup alone lets the exact same title through twice when this loop crosses genres. Track
      // titles actually added here too so an author's page shows each work once.
      const seenTitles = new Set(items.map(i => i.title));
      const matchesCreator = curatedCat === 'Music Album'
        ? i => i.notes === name
        : i => resolveCuratedCreatorName(curatedCat, i) === name;
      for (const genre of Object.keys(CURATED_ITEMS)) {
        (CURATED_ITEMS[genre][curatedCat] || [])
          .filter(i => matchesCreator(i) && !state.hiddenCurated.has(i.id) && !existingIds.has(i.id))
          .forEach(i => {
            const override = state.curatedOverrides[i.id] || {};
            const merged = { ...i, ...override, category: curatedCat, curated: true, done: false, savedAt: 0, folderId: null };
            if (SPLIT_TITLE_CREATOR_CATEGORIES.includes(curatedCat)) {
              const split = splitCuratedTitleCreator(merged.title);
              merged.title = split.title;
              merged.author = split.author;
            }
            if (!merged.author) {
              const staticCreator = getStaticCuratedCreator(curatedCat, merged.title);
              if (staticCreator) {
                merged.author = staticCreator.name;
                merged.authorHasMore = staticCreator.hasMore;
              }
            }
            if (seenTitles.has(merged.title)) return;
            seenTitles.add(merged.title);
            // Year/collectionId enrichment is Music Album-specific (iTunes track-list metadata) —
            // doesn't apply to the other categories' curated items.
            if (curatedCat === 'Music Album') {
              const meta = state.curatedAlbumMetaCache[i.id];
              if (meta) {
                if (!merged.year && meta.year) merged.year = meta.year;
                if (!merged.collectionId && meta.collectionId) merged.collectionId = meta.collectionId;
              }
            }
            items.push(merged);
          });
      }
    }
  } else if (CATEGORIES.includes(state.view)) {
    // A top-level tab shows only its "primary" folder's items, plus anything with no folder
    // assigned yet — see matchesPrimaryOrUnfoldered() above.
    items = items.filter(i => matchesPrimaryOrUnfoldered(i, state.view));
  } else {
    const folder = state.folders.find(f => f.id === state.view);
    const isPrimaryFolder = folder && PRIMARY_FOLDER_ID[folder.parentCategory] === folder.id;
    items = isPrimaryFolder
      // Clicking the primary folder directly shows exactly what its category tab shows.
      ? items.filter(i => matchesPrimaryOrUnfoldered(i, folder.parentCategory))
      : items.filter(i => i.folderId === state.view);
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

  // Favorites float to the top regardless of sort mode, alphabetized among themselves;
  // non-favorites keep whatever order the switch above just produced.
  items.sort((a, b) => {
    const favA = a.favorite ? 1 : 0, favB = b.favorite ? 1 : 0;
    if (favA !== favB) return favB - favA;
    if (!favA) return 0;
    const ta = a.title || '', tb = b.title || '';
    const aNum = /^\d/.test(ta), bNum = /^\d/.test(tb);
    if (aNum !== bNum) return aNum ? 1 : -1;
    return ta.localeCompare(tb);
  });

  return items;
}

// ===== SIDEBAR =====
export function renderSidebar() {
  const sidebar = document.getElementById('sidebar');
  // An author/creator page (Book author, Movie director…) reached from curated genre browsing
  // sets state.view to 'author:<cat>:<name>', which starts with neither 'genre:' nor anything
  // else the sidebar recognizes — every mode/context decision below used to read state.view
  // directly, so visiting an author page from Top 100 bounced the whole sidebar back to the
  // top-level genre picker, losing all context. state.authorReturnView (set by
  // navigateToAuthor()) remembers where the user actually was; fall back to it here for every
  // "which sidebar screen" decision while leaving the real state.view alone for isActive checks
  // further down, so nothing shows falsely highlighted while genuinely on an author page.
  const sidebarEffectiveView = (state.view.startsWith('author:') && state.authorReturnView?.startsWith('genre:'))
    ? state.authorReturnView
    : state.view;
  let sidebarTitle = 'My Saves';
  if (sidebarEffectiveView.startsWith('genre:')) {
    sidebarTitle = sidebarEffectiveView.slice(6).split(':')[0] + ' Saves';
  } else if (state.sidebarMode === 'curated') {
    sidebarTitle = 'Cause Curated';
  } else if (state.sidebarMode === 'shared') {
    sidebarTitle = 'Shared Saves';
  }
  const headerTitleEl = document.getElementById('sidebar-header-title');
  const isCuratedDrilldown = state.sidebarMode === 'curated' && sidebarEffectiveView.startsWith('genre:');
  if (isCuratedDrilldown) {
    headerTitleEl.innerHTML = `<button class="sidebar-back-btn" id="sidebar-back-btn" title="Back to genres"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg><span>${escapeHtml(sidebarTitle)}</span></button>`;
  } else {
    headerTitleEl.textContent = sidebarTitle;
  }
  document.getElementById('sidebar-back-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    // Uses sidebarEffectiveView (not the raw state.view) so this also works correctly from an
    // author page reached via curated browsing — it steps back to the genre-level view instead
    // of trying to parse the 'author:<cat>:<name>' string as if it were a 'genre:' one.
    const parts = sidebarEffectiveView.slice(6).split(':'); // strip 'genre:' prefix -> [genre, category?]
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
      <button class="sidebar-mode-tab sidebar-mode-tab--sponsored" data-sidebar-opt="sponsored">⚡ VC</button>
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
          // "VoteCraft Picks" links straight into the real curated Top 100 saves area.
          state.sidebarMode = 'curated'; state.view = 'genre:Top 100';
        } else {
          state.sidebarMode = 'categories'; state.view = 'all';
        }
        persistViewState();
        renderSidebar();
        renderGrid();
      });
    });
  }

  // Keyed off state.view rather than state.sidebarMode — every other sidebar click handler
  // (category, subfolder, "All Items") reliably updates state.view but doesn't reset
  // sidebarMode away from 'home', so checking sidebarMode here left this link stuck active
  // after navigating away from the dashboard.
  // Collapsible exactly like a category row (arrow on the right, click toggles), but with its
  // own standalone entry in state.collapsed — not part of the categories' mutual-exclusion
  // accordion group, since Dashboard isn't rendered in that list. No count badge before the
  // arrow (unlike categories) since "Queue Kanban" isn't a countable quantity.
  const isDashboardCollapsed = state.collapsed.has('dashboard');
  const dashboardArrow = isDashboardCollapsed ? '▶' : '▼';

  // The Queue Kanban row is styled exactly like a category's folder row (same classes/icon
  // sizing as subfolderRows below) so it reads as "a folder nested under Dashboard" — but it's
  // static (no "+ New folder" affordance, can't be deleted/renamed) since Dashboard isn't a real
  // category with `state.folders` entries.
  const dashboardLinkHtml = `
    <div class="sidebar-item sidebar-dashboard-link ${state.view === 'dashboard' ? 'active' : ''}" data-view="dashboard" data-toggle="dashboard">
      <span class="sidebar-label"><span class="cat-icon">${DASHBOARD_ICON_SVG}</span><span class="sidebar-label-text"> Dashboard</span></span>
      <span class="sidebar-right"><span class="sidebar-arrow">${dashboardArrow}</span></span>
    </div>
    ${isDashboardCollapsed ? '' : `
    <div class="sidebar-item sidebar-subfolder sidebar-kanban-link ${state.view === 'kanban' ? 'active' : ''}" data-view="kanban">
      ${KANBAN_ICON_SVG} Queue Kanban
    </div>`}
    <div class="sidebar-divider"></div>
  `;

  function wireDashboardLink() {
    sidebar.querySelector('.sidebar-dashboard-link')?.addEventListener('click', () => {
      if (state.collapsed.has('dashboard')) state.collapsed.delete('dashboard');
      else state.collapsed.add('dashboard');
      state.sidebarMode = 'home';
      state.view = 'dashboard';
      persistViewState();
      renderSidebar();
      renderGrid();
    });
    sidebar.querySelector('.sidebar-kanban-link')?.addEventListener('click', () => {
      state.sidebarMode = 'home';
      state.view = 'kanban';
      persistViewState();
      renderSidebar();
      renderGrid();
    });
  }

  // Curated mode: genre picker until a genre is selected, then show categories
  if (state.sidebarMode === 'curated' && !sidebarEffectiveView.startsWith('genre:')) {
    sidebar.innerHTML = mobileHeader + `
      <div class="sidebar-items-scroll">
        ${dashboardLinkHtml}
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
    wireDashboardLink();
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

  const isCuratedGenre = sidebarEffectiveView.startsWith('genre:');
  const curatedGenreBase = isCuratedGenre ? sidebarEffectiveView.slice(6).split(':')[0] : null;

  // 'Web Links' ("Website") is a real CATEGORIES member, so the generic filter below already
  // includes it — excluded here only from curated-genre drilldowns, since there's no curated
  // "Web Links" content and it'd always be an empty, dead entry there.
  const sidebarCategoryList = isCuratedGenre
    ? CATEGORIES.filter(cat => cat !== 'Music Album' && cat !== 'Web Links')
    : CATEGORIES.filter(cat => cat !== 'Music Album');

  const categorySections = sidebarCategoryList.map(cat => {
    const primaryId = PRIMARY_FOLDER_ID[cat];
    const count = isCuratedGenre
      ? (CURATED_ITEMS[curatedGenreBase]?.[cat]?.filter(i => !state.hiddenCurated.has(i.id)).length ?? 0)
      // Matches what tapping the tab actually reveals: the primary folder plus un-foldered items.
      : state.items.filter(i => matchesPrimaryOrUnfoldered(i, cat)).length;
    const subfolders = state.folders.filter(f => f.parentCategory === cat).sort((a, b) => a.name.localeCompare(b.name));
    const isActive = isCuratedGenre
      ? state.view === `genre:${curatedGenreBase}:${cat}`
      : state.view === cat;
    const isCollapsed = state.collapsed.has(cat);
    // Top-level category tabs don't show a count while browsing a curated genre — only the
    // subfolders underneath do (Authors/Directors/etc., the full-category folder, and the
    // explicitly-empty ones) per the user's request; personal "My Saves" browsing keeps its count.
    const countLabel = (!isCuratedGenre && count > 0) ? `<span class="sidebar-count">${count}</span>` : '';
    const arrow = isCollapsed ? '▶' : '▼';

    const musicAlbumActive = isCuratedGenre
      ? state.view === `genre:${curatedGenreBase}:Music Album`
      : state.view === 'Music Album';
    const musicAlbumCount = isCuratedGenre
      ? (CURATED_ITEMS[curatedGenreBase]?.['Music Album']?.length ?? 0)
      : state.items.filter(i => matchesPrimaryOrUnfoldered(i, 'Music Album')).length;
    const musicAlbumCountLabel = musicAlbumCount > 0 ? `<span class="sidebar-count">${musicAlbumCount}</span>` : '';
    const permanentSubfolders = cat === 'Musician' ? `
      <div class="sidebar-item sidebar-subfolder ${musicAlbumActive ? 'active' : ''}"
           data-view="Music Album" data-permanent="true">
        <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M500-360q42 0 71-29t29-71v-220h120v-80H560v220q-13-10-28-15t-32-5q-42 0-71 29t-29 71q0 42 29 71t71 29ZM320-240q-33 0-56.5-23.5T240-320v-480q0-33 23.5-56.5T320-880h480q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H320Zm0-80h480v-480H320v480ZM160-80q-33 0-56.5-23.5T80-160v-560h80v560h560v80H160Zm160-720v480-480Z"/></svg> Music Albums
        ${musicAlbumCountLabel}
      </div>
    ` : '';

    const subfolderRows = subfolders.map(folder => {
      const isPrimaryFolder = primaryId === folder.id;
      // What this folder maps to while browsing a curated genre: its own dedicated "creator
      // card" bucket (Authors/Directors/Creators/Game Companies) if it has one; else the full
      // parent category if it's one of the handful of folders that closely represent "the whole
      // category" (Books/Movies/TV Shows/Console Games); else the folder's own id, which never
      // matches a real CURATED_ITEMS bucket and so naturally (and correctly) resolves to an
      // empty list — Videos/Podcasts/Webseries/Tutorials/Board Games/Mobile Games have no
      // curated-specific data at all, and showing a sibling folder's content under their name
      // would be misleading. Keeping the "genre:" prefix either way is what stays inside Top
      // 100/Fantasy/etc. instead of bouncing back to "My SaveCraft" (the original Authors bug).
      const curatedTarget = FOLDER_ID_TO_CURATED_CATEGORY[folder.id]
        || (FOLDER_SHOWS_FULL_CURATED_CATEGORY.has(folder.id) ? cat : folder.id);
      const fCount = isCuratedGenre
        ? (CURATED_ITEMS[curatedGenreBase]?.[curatedTarget]?.length ?? 0)
        : state.items.filter(i => isPrimaryFolder ? matchesPrimaryOrUnfoldered(i, cat) : i.folderId === folder.id).length;
      const fCountLabel = fCount > 0 ? `<span class="sidebar-count">${fCount}</span>` : '';
      // Official/default folders (seeded in storage.js's `defaults` array, always id-prefixed
      // "default-") can't be deleted from the sidebar — only user-created ones (Date.now() ids) can.
      const isOfficialFolder = folder.id.startsWith('default-');
      const deleteBtn = isOfficialFolder ? '' : `<button class="sidebar-delete-folder" data-folder-id="${folder.id}" title="Delete folder">×</button>`;
      // Several sibling folders can share the exact same curatedTarget (e.g. none currently do
      // after the empty-fallback above, but kept for safety/future folders) — state.view alone
      // can't always tell which specific folder was clicked, so state.activeCuratedFolderId
      // (set on click) disambiguates which single row shows as active.
      const isActive = isCuratedGenre
        ? state.view === `genre:${curatedGenreBase}:${curatedTarget}` && state.activeCuratedFolderId === folder.id
        : state.view === folder.id;
      return `
        <div class="sidebar-item sidebar-subfolder ${isActive ? 'active' : ''}"
             data-view="${folder.id}" data-curated-target="${escapeHtml(curatedTarget)}">
          ${folderIconHtml(folder.id, 16)} ${escapeHtml(folder.name)}
          ${fCountLabel}
          ${deleteBtn}
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
        <span class="sidebar-label"><span class="cat-icon">${CAT_EMOJI[cat] || ''}</span><span class="sidebar-label-text"> ${CAT_LABEL[cat] || cat}</span></span>
        <span class="sidebar-right">${countLabel}<span class="sidebar-arrow">${arrow}</span></span>
      </div>
      ${expandedContent}
    `;
  }).join('<div class="sidebar-divider"></div>');

  sidebar.innerHTML = mobileHeader + `
    <div class="sidebar-items-scroll">
      ${dashboardLinkHtml}
      ${categorySections}
    </div>
  `;
  wireMobileHeader();
  wireDashboardLink();

  // Category header: toggle collapse OR switch view
  sidebar.querySelectorAll('.sidebar-category').forEach(el => {
    el.addEventListener('click', () => {
      const cat = el.dataset.toggle;
      if (state.collapsed.has(cat)) {
        // Expanding — collapse all others first (sidebarCategoryList excludes Music Album, which
        // has its own separate collapse state via the Musician "Music Albums" permanent subfolder link)
        state.collapsed = new Set(sidebarCategoryList);
        state.collapsed.delete(cat);
      } else {
        state.collapsed.add(cat);
      }
      if (isCuratedGenre) {
        state.view = `genre:${curatedGenreBase}:${cat}`;
      } else {
        state.view = cat;
      }
      state.activeCuratedFolderId = null;
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

  // Subfolder view-switching (the Queue Kanban row also uses .sidebar-subfolder for its visual
  // styling, but it's already wired explicitly in wireDashboardLink() — excluded here so it
  // doesn't get a second, redundant click handler).
  sidebar.querySelectorAll('.sidebar-subfolder:not(.sidebar-kanban-link)').forEach(el => {
    el.addEventListener('click', () => {
      if (isCuratedGenre && el.dataset.permanent) {
        state.view = `genre:${curatedGenreBase}:${el.dataset.view}`;
        state.activeCuratedFolderId = null;
      } else if (isCuratedGenre && el.dataset.curatedTarget) {
        // Stays inside the genre by routing to this folder's curatedTarget (a dedicated creator
        // bucket, the full parent category, or — for folders with no curated data at all — the
        // folder's own id, which naturally resolves to an empty list). See the curatedTarget
        // computation in the row-render above for the full explanation.
        state.view = `genre:${curatedGenreBase}:${el.dataset.curatedTarget}`;
        state.activeCuratedFolderId = el.dataset.view;
      } else {
        state.view = el.dataset.view;
        state.activeCuratedFolderId = null;
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
    const applyImage = imgUrl => {
      if (!imgUrl) return;
      state.curatedImgCache[item.id] = imgUrl;
      persistCuratedImgCache();
      // patchCardImage() (utils.js) handles both plain .card elements and the Top 100 landing
      // page's .top100-row-card — this used to duplicate just the .card half inline here, which
      // silently never patched a row card's thumbnail once its image arrived (only picked up on
      // the next full re-render, via resolveRowItemImage() reading the now-populated cache).
      patchCardImage(item.id, imgUrl);
    };
    // Wikipedia-sourced curated items (most Movie/Book/Show/Game entries) get their poster/cover
    // straight from Wikipedia's own REST summary first — Microlink is a shared third-party quota
    // (confirmed: it can and does run out for a whole day), and Wikipedia is the actual source of
    // truth for these items anyway, not just a fallback of convenience.
    fetchWikipediaThumbnailForUrl(item.url)
      .then(imgUrl => {
        if (imgUrl) { applyImage(imgUrl); return null; }
        return fetch(`https://api.microlink.io?url=${encodeURIComponent(item.url)}`)
          .then(r => r.json())
          .then(data => applyImage(data?.data?.image?.url));
      })
      .catch(() => {})
      .finally(() => _curatedImgFetchInFlight.delete(item.id));
  });
}

// Same idea as fetchMissingCuratedImages(), but for curated Musician cards whose photo is
// missing or still the iTunes stand-in — looks up (and caches) the Wikipedia photo per artist,
// then live-patches any matching cards already on screen. Staggered (150ms apart) rather than
// fired all at once — a full Top 100 Musicians grid can have up to 100 of these queue up on a
// single render, and Wikipedia's REST API rate-limits bursts; fetchWikipediaSummary() already
// retries a single 429, but spacing the requests out in the first place means far fewer of them
// ever need to.
const _curatedMusicianPhotoFetchInFlight = new Set();
export function fetchMissingCuratedMusicianPhotos(items) {
  const missing = items.filter(i => i.curated && i.category === 'Musician' && (!i.imageUrl || isItunesArtworkUrl(i.imageUrl)) && !_curatedMusicianPhotoFetchInFlight.has(i.id));
  if (!missing.length) return;
  missing.forEach((item, i) => {
    _curatedMusicianPhotoFetchInFlight.add(item.id);
    setTimeout(() => {
      ensureArtistWikipediaInfo(item.title)
        .then(({ photoUrl }) => {
          if (!photoUrl) return;
          patchCardImage(item.id, photoUrl);
        })
        .finally(() => _curatedMusicianPhotoFetchInFlight.delete(item.id));
    }, i * 150);
  });
}

export function renderGrid() {
  const container = document.getElementById('cards-grid');
  const gridTitle = document.getElementById('grid-title');

  // The Top 100 landing page (renderCuratedGenreLanding() below) physically relocates the real
  // #sort-select node into its own content, below the hero — safe to do since it's the same
  // singleton element (not cloned, so main.js's existing change listener keeps working
  // regardless of where it sits), but it means every render needs to put it back in its normal
  // .grid-header home FIRST, before any view (including a plain container.innerHTML= wipe)
  // could otherwise destroy it as an orphaned child of #cards-grid.
  const sortSelect = document.getElementById('sort-select');
  const gridHeader = document.querySelector('.grid-header');
  if (sortSelect.parentElement !== gridHeader) gridHeader.appendChild(sortSelect);
  gridHeader.style.display = '';

  document.getElementById('saves-list-wrap').style.display = 'none';
  document.getElementById('saves-list-dropdown')?.setAttribute('hidden', '');
  document.getElementById('board-filter-wrap').style.display = 'none';
  document.getElementById('board-filter-dropdown')?.setAttribute('hidden', '');
  document.getElementById('board-info-wrap').style.display = 'none';
  document.getElementById('board-info-popup')?.setAttribute('hidden', '');
  sortSelect.style.display = '';
  gridTitle.style.display = '';

  if (state.view === 'kanban') {
    renderKanbanBoard();
    return;
  }

  if (state.view === 'dashboard') {
    renderDashboard();
    return;
  }

  if (state.view === 'profile') {
    renderProfilePage();
    return;
  }

  if (state.view === 'shared') {
    renderSharedSavesPage();
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
    // On a Top 100 drilldown (e.g. "Top 100 Books"), just the "Top 100" word links back to the
    // Top 100 landing page (genre:Top 100 — see renderCuratedGenreLanding()); the category name
    // stays plain text. Styled to read as ordinary title text, not an obvious button — see
    // .grid-title-link in cards.css.
    const isTop100Drilldown = parts[0] === 'Top 100' && parts.length === 2;
    const top100Label = isTop100Drilldown
      ? `<button class="grid-title-link" data-view="genre:Top 100">Top 100</button>`
      : 'Top 100';
    // NOTE: curated categories are keyed by their singular CATEGORIES names (e.g. 'Musician',
    // 'Show'), not display plurals — these checks previously used the wrong strings and never
    // matched, so none of these logos ever actually rendered.
    if (state.view === 'genre:Top 100:Musician' || state.view === 'genre:Top 100:Show' || state.view === 'genre:Top 100:Book') {
      const label = `${top100Label} ${escapeHtml(CAT_LABEL[parts[1]] || parts[1])}`;
      gridTitle.innerHTML = `${label} <span class="rs-logo-wrap"><img src="${chrome.runtime.getURL('images/logos/pngkey.com-rolling-stones-tongue-png-3135824.png')}" class="rs-logo-img" alt="Rolling Stone"></span>`;
    } else if (state.view === 'genre:Top 100:Game') {
      gridTitle.innerHTML = `${top100Label} Games <span class="steam-logo-wrap"><img src="${chrome.runtime.getURL('images/logos/steam.png')}" class="steam-logo-img" alt="Steam"></span>`;
    } else if (state.view === 'genre:Top 100:Movie') {
      const catLabel = `${top100Label} ${escapeHtml(CAT_LABEL[parts[1]] || parts[1])}`;
      gridTitle.innerHTML = `${catLabel} <span class="nyt-logo-wrap"><svg viewBox="0 0 452.8 59.5" xmlns="http://www.w3.org/2000/svg" aria-label="The New York Times"><path d="M33.9,6.1c0-4.9-4.7-6.1-8.4-6.1v0.7c2.2,0,3.9,0.7,3.9,2.5c0,1-0.7,2.5-3,2.5c-1.7,0-5.4-1-8.1-2c-3.2-1.2-6.1-2.2-8.6-2.2c-4.9,0-8.4,3.7-8.4,7.9c0,3.7,2.7,4.9,3.7,5.4l0.2-0.5c-0.5-0.5-1.2-1-1.2-2.5c0-1,1-2.7,3.4-2.7c2.2,0,5.2,1,9.1,2.2c3.4,1,7.1,1.7,9.1,2v7.6l-3.7,3.2v0.2l3.7,3.2v10.6c-2,1.2-4.2,1.5-6.1,1.5c-3.7,0-6.9-1-9.6-3.9l10.1-4.9v-17L7.9,19.2c1-3.2,3.7-5.4,6.4-6.9L14,11.6c-7.4,2-14,8.9-14,17.2C0,38.6,8.1,46,17.2,46c9.8,0,16.2-7.9,16.2-16H33c-1.5,3.2-3.7,6.1-6.4,7.6V27.5l3.9-3.2v-0.2l-3.9-3.2v-7.6C30.3,13.3,33.9,10.8,33.9,6.1z M12.5,33.2l-3,1.5c-1.7-2.2-2.7-5.2-2.7-9.3c0-1.7,0-3.7,0.5-5.2l5.2-2.2V33.2z M38.6,38.9l-3.2,2.5l0.5,0.5l1.5-1.2l5.4,4.9l7.4-4.9l-0.2-0.5l-2,1.2l-2.5-2.5V22.1l2-1.5l4.2,3.4v15c0,9.3-2,10.8-6.1,12.3v0.7c6.9,0.2,13.3-2,13.3-14V21.9l2.2-1.7l-0.5-0.5l-2,1.5L52.4,16l-6.9,5.2V1H45l-8.6,5.9v0.5c1,0.5,2.5,1,2.5,3.7C38.9,11.1,38.6,38.9,38.6,38.9z M83.6,36.2l-6.1,4.7l-6.1-4.9v-3l11.6-7.9v-0.2L77,16l-12.8,6.9v16.2l-2.5,2l0.5,0.5l2.2-1.7l8.4,6.1l11.1-8.9C83.9,37.1,83.6,36.2,83.6,36.2z M71.3,32V19.9l0.5-0.2l5.4,8.6C77.2,28.3,71.3,32,71.3,32z M130.6,3.9c0-0.7-0.2-1.5-0.5-2.2h-0.5c-0.7,2-1.7,3-4.2,3c-2.2,0-3.7-1.2-4.7-2.2l-7.1,8.1l0.5,0.5l2.5-2.2c1.5,1.2,2.7,2.2,6.1,2.5v20.4L108.2,6.9c-1.2-2-3-4.7-6.4-4.7c-3.9,0-7.4,3.4-6.9,8.9h0.7c0.2-1.5,1-3.2,2.7-3.2c1.2,0,2.5,1.2,3.2,2.5v8.1c-4.4,0-7.4,2-7.4,5.7c0,2,1,4.9,3.9,5.7v-0.5c-0.5-0.5-0.7-1-0.7-1.7c0-1.2,1-2.2,2.7-2.2h1.2v10.3c-5.2,0-9.3,3-9.3,7.9c0,4.7,3.9,6.9,8.4,6.6v-0.5c-2.7-0.2-3.9-1.5-3.9-3.2c0-2.2,1.5-3.2,3.4-3.2c2,0,3.7,1.2,4.9,2.7l7.1-7.9l-0.5-0.5l-1.7,2c-2.7-2.5-4.2-3.2-7.4-3.7V11.3L122,45.7h1.5V11.3C127.1,11.1,130.6,8.1,130.6,3.9z M148.5,36.2l-6.1,4.7l-6.1-4.9v-3l11.6-7.9v-0.2l-5.9-8.9l-12.8,6.9v16.2l-2.5,2l0.5,0.5l2.2-1.7l8.4,6.1l11.1-8.9C148.8,37.1,148.5,36.2,148.5,36.2z M136.2,32V19.9l0.5-0.2l5.4,8.6C142.2,28.3,136.2,32,136.2,32z M188.6,18.7l-1.7,1.2l-4.7-3.9l-5.4,4.9l2.2,2.2v18.4l-5.9-3.7V22.6l2-1.2l-5.7-5.4l-5.4,4.9l2.2,2.2v17.7l-0.7,0.5l-5.2-3.7V22.9c0-3.4-1.7-4.4-3.7-5.7c-1.7-1.2-2.7-2-2.7-3.7c0-1.5,1.5-2.2,2.2-2.7v-0.5c-2,0-7.1,2-7.1,6.6c0,2.5,1.2,3.4,2.5,4.7c1.2,1.2,2.5,2.2,2.5,4.4v14.3l-2.7,2l0.5,0.5l2.5-2l5.7,4.9l6.1-4.2l6.9,4.2l13-7.6V21.6l3.2-2.5L188.6,18.7L188.6,18.7z M234.4,5.2l-2.5,2.2l-5.4-4.9l-8.1,5.9V3h-0.7l0.2,39.8c-0.7,0-3-0.5-4.7-1l-0.5-33.2c0-2.5-1.7-5.9-6.1-5.9s-7.4,3.4-7.4,6.9h0.7c0.2-1.5,1-2.7,2.5-2.7c1.5,0,2.7,1,2.7,4.2v9.6c-4.4,0.2-7.1,2.7-7.1,5.9c0,2,1,4.9,3.9,4.9V31c-1-0.5-1.2-1.2-1.2-1.7c0-1.5,1.2-2,3.2-2h1v15.2c-3.7,1.2-5.2,3.9-5.2,6.9c0,4.2,3.2,7.1,8.1,7.1c3.4,0,6.4-0.5,9.3-1.2c2.5-0.5,5.7-1.2,7.1-1.2c2,0,2.7,1,2.7,2.2c0,1.7-0.7,2.5-1.7,2.7v0.5c3.9-0.7,6.4-3.2,6.4-6.9s-3.7-5.9-7.6-5.9c-2,0-6.1,0.7-9.1,1.2c-3.4,0.7-6.9,1.2-7.9,1.2c-1.7,0-3.7-0.7-3.7-3.2c0-2,1.7-3.7,5.9-3.7c2.2,0,4.9,0.2,7.6,1c3,0.7,5.7,1.5,8.1,1.5c3.7,0,6.9-1.2,6.9-6.4V8.1l3-2.5L234.4,5.2L234.4,5.2z M224.3,20.2c-0.7,0.7-1.7,1.5-3,1.5s-2.5-0.7-3-1.5V9.3l2.5-1.7l3.4,3.2C224.3,10.8,224.3,20.2,224.3,20.2z M224.3,27.5c-0.5-0.5-1.7-1.2-3-1.2s-2.5,0.7-3,1.2v-6.4c0.5,0.5,1.7,1.2,3,1.2s2.5-0.7,3-1.2V27.5z M224.3,39.1c0,2-1.2,3.9-3.9,3.9h-2V28.5c0.5-0.5,1.7-1.2,3-1.2s2.2,0.7,3,1.2C224.3,28.5,224.3,39.1,224.3,39.1z M258,21.6l-7.9-5.7l-12.1,6.9v16l-2.5,2l0.2,0.5l2-1.5l7.9,5.9l12.3-7.4C258,38.4,258,21.6,258,21.6z M244.7,37.1V19.4l6.1,4.4v17.5C250.9,41.3,244.7,37.1,244.7,37.1z M281.4,16.5h-0.5c-0.7,0.5-1.5,1-2.2,1c-1,0-2.2-0.5-2.7-1.2h-0.5l-4.2,4.7l-4.2-4.7l-7.4,4.9l0.2,0.5l2-1.2l2.5,2.7v15.5l-3.2,2.5l0.5,0.5l1.5-1.2l5.9,4.9l7.6-5.2l-0.2-0.5l-2.2,1.2l-3-2.5V21.2c1.2,1.2,2.7,2.5,4.4,2.5C279.1,23.9,281.1,20.4,281.4,16.5L281.4,16.5z M310.9,40.1l-8.4,5.7l-11.3-17.2l8.1-12.5h0.5c1,1,2.5,2,4.2,2c1.7,0,3-1,3.7-2h0.5c-0.2,4.9-3.7,7.9-6.1,7.9c-2.5,0-3.7-1.2-5.2-2l-0.7,1.2l12.3,18.2l2.5-1.5V40.1z M283.8,38.9l-3.2,2.5l0.5,0.5l1.5-1.2l5.4,4.9l7.4-4.9l-0.5-0.5l-2,1.2l-2.5-2.5V1h-0.2l-8.9,5.9v0.5c1,0.5,2.5,0.7,2.5,3.7C283.8,11.1,283.8,38.9,283.8,38.9z M351.7,6.1c0-4.9-4.7-6.1-8.4-6.1v0.7c2.2,0,3.9,0.7,3.9,2.5c0,1-0.7,2.5-3,2.5c-1.7,0-5.4-1-8.1-2c-3.2-1-6.1-2-8.6-2c-4.9,0-8.4,3.7-8.4,7.9c0,3.7,2.7,4.9,3.7,5.4l0.2-0.5c-0.7-0.5-1.5-1-1.5-2.5c0-1,1-2.7,3.4-2.7c2.2,0,5.2,1,9.1,2.2c3.4,1,7.1,1.7,9.1,2v7.6l-3.7,3.2v0.2l3.7,3.2v10.6c-2,1.2-4.2,1.5-6.1,1.5c-3.7,0-6.9-1-9.6-3.9l10.1-4.9V13.8l-12.3,5.4c1.2-3.2,3.9-5.4,6.4-7.1l-0.2-0.5c-7.4,2-14,8.6-14,17c0,9.8,8.1,17.2,17.2,17.2c9.8,0,16.2-7.9,16.2-16h-0.5c-1.5,3.2-3.7,6.1-6.4,7.6V27.3l3.9-3.2v-0.2l-3.7-3.2v-7.4C348,13.3,351.7,10.8,351.7,6.1z M330.3,33.2l-3,1.5c-1.7-2.2-2.7-5.2-2.7-9.3c0-1.7,0.2-3.7,0.7-5.2l5.2-2.2L330.3,33.2z M360.3,3.7H360l-4.9,4.2v0.2l4.2,4.7h0.5l4.9-4.2V8.4L360.3,3.7L360.3,3.7z M367.7,40.1l-2,1.2l-2.5-2.5v-17l2.5-1.7l-0.5-0.5l-1.7,1.5l-4.4-5.2l-7.1,4.9l0.5,0.7l1.7-1.2l2.2,2.7v16l-3.2,2.5l0.2,0.5l1.7-1.2l5.4,4.9l7.4-4.9L367.7,40.1L367.7,40.1z M408.7,39.8l-1.7,1.2l-2.7-2.5V21.9l2.5-2l-0.5-0.5l-2,1.7l-5.7-5.2l-7.4,5.2l-5.7-5.2l-6.9,5.2l-4.4-5.2l-7.1,4.9l0.2,0.7l1.7-1.2l2.5,2.7v16l-2,2l5.7,4.7l5.4-4.9l-2.2-2.2V21.9l2.2-1.5l3.7,3.4v14.8l-2,2l5.7,4.7l5.4-4.9l-2.2-2.2V21.9l2-1.2l3.9,3.4v14.8l-1.7,1.7l5.7,5.2l7.6-5.2L408.7,39.8L408.7,39.8z M430.1,36.2l-6.1,4.7l-6.1-4.9v-3l11.6-7.9v-0.2l-5.9-8.9l-12.8,6.9v16.7l8.6,6.1l11.1-8.9C430.4,36.9,430.1,36.2,430.1,36.2z M417.8,32V19.9l0.5-0.2l5.4,8.6C423.7,28.3,417.8,32,417.8,32z M452.5,29.8l-4.7-3.7c3.2-2.7,4.4-6.4,4.4-8.9v-1.5h-0.5c-0.5,1.2-1.5,2.5-3.4,2.5c-2,0-3.2-1-4.4-2.5l-11.1,6.1v8.9l4.2,3.2c-4.2,3.7-4.9,6.1-4.9,8.1c0,2.5,1.2,4.2,3.2,4.9l0.2-0.5c-0.5-0.5-1-0.7-1-2c0-0.7,1-2,3-2c2.5,0,3.9,1.7,4.7,2.5l10.6-6.4v-8.9C452.8,29.8,452.5,29.8,452.5,29.8z M449.8,22.4c-1.7,3-5.4,5.9-7.6,7.4l-2.7-2.2v-8.6c1,2.5,3.7,4.4,6.4,4.4C447.6,23.4,448.6,23.1,449.8,22.4z M445.6,42.1c-1.2-2.7-4.2-4.7-7.1-4.7c-0.7,0-2.7,0-4.7,1.2c1.2-2,4.4-5.4,8.6-7.9l3,2.5L445.6,42.1L445.6,42.1z"/></svg></span>`;
    } else if (isTop100Drilldown) {
      gridTitle.innerHTML = `${top100Label} ${escapeHtml(parts[1])}`;
    } else {
      gridTitle.textContent = parts.length === 2
        ? `${parts[0]} ${parts[1]}`
        : `${parts[0]} Saves`;
    }
    document.querySelector('.grid-title-link')?.addEventListener('click', e => {
      e.preventDefault();
      state.view = e.currentTarget.dataset.view;
      persistViewState();
      renderSidebar();
      renderGrid();
    });
  } else if (CATEGORIES.includes(state.view)) {
    gridTitle.innerHTML = `${CAT_EMOJI[state.view]} ${CAT_LABEL[state.view] || state.view}`;
  } else {
    const folder = state.folders.find(f => f.id === state.view);
    // News outlet folders double as "publication profile pages" — a richer header (domain +
    // paywalled badge, both already on the folder from the News-category work) instead of just
    // the bare folder name every other folder gets.
    if (folder && folder.parentCategory === 'News') {
      const domainHtml = folder.domain ? `<span class="grid-title-domain">${escapeHtml(folder.domain)}</span>` : '';
      const paywalledHtml = folder.paywalled ? `<span class="grid-title-paywalled-badge">Paywalled</span>` : '';
      gridTitle.innerHTML = `${escapeHtml(folder.name)} ${domainHtml}${paywalledHtml}`;
    } else {
      gridTitle.textContent = folder ? folder.name : 'Folder';
    }
  }

  const items = getFilteredSortedItems();

  if (items.length === 0) {
    const isSearch = !!state.search;
    const isCuratedTop = state.view.startsWith('genre:') && state.view.split(':').length === 2;
    const isCuratedLanding = state.view === 'curated';
    const isCuratedFullList = state.view === 'curated-full-list';
    const genre = isCuratedTop ? state.view.slice(6) : null;

    // A handful of curated genres (currently just Top 100) get a richer, distinct landing page
    // here instead of the plain "Pick a category" empty state below — see
    // CURATED_GENRE_LANDING_CONTENT in state.js for which genres and what content.
    const landingContent = isCuratedTop && !isSearch ? CURATED_GENRE_LANDING_CONTENT[genre] : null;
    if (landingContent) {
      renderCuratedGenreLanding(container, genre, landingContent);
      return;
    }

    // "Curated-full-list" — the rich hero + carousel-rows directory of many nonprofit-sponsored
    // lists (CURATED_DIRECTORY_CONTENT in state.js). Reached via the link on the bare-bones
    // top-level page below, not directly from the sidebar.
    if (isCuratedFullList && !isSearch) {
      renderCuratedDirectory(container);
      return;
    }

    // The top-level "Curated SaveCraft" landing (no genre picked yet) gets a bare-bones,
    // ActBlue-style flat list of the same nonprofit-sponsored orgs instead of the plain "Pick a
    // category" empty state below, with a link through to the fuller Curated-full-list page.
    if (isCuratedLanding && !isSearch) {
      renderCuratedBareList(container);
      return;
    }

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
  wirePublicationLinks(container);
  wireQuickQueueButtons(container);

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
  wireQuickQueueButtons(worksGrid);

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

// News cards' publication byline is folder-based, not author-based, so it doesn't go through
// navigateToAuthor/wireCardAuthorLinks — it just navigates straight to the outlet's existing
// folder view (same routing a sidebar folder click already uses).
function wirePublicationLinks(container) {
  container.querySelectorAll('.card-publication-link').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      state.view = btn.dataset.folderId;
      persistViewState();
      renderSidebar();
      renderGrid();
    });
  });
}

// Quick "add to queue" button on curated cards (see renderCard()) — promotes the curated item
// into a real personal one via the shared ensureLiveItem() and queues it immediately, without
// opening the detail modal; tapping it again un-queues it (queueStatus back to null — same as
// the Kanban board's own remove-from-queue, doesn't delete the now-personal item entirely).
// Live-patches just this button afterward (icon + active state) rather than a full re-render,
// same technique patchCardImage() already uses elsewhere.
function wireQuickQueueButtons(container) {
  // The Top 100 landing page's rows triple every item for the carousel's infinite-scroll
  // illusion (renderCuratedGenreLanding()), so the same item's bookmark can appear more than
  // once in the same container — patch every matching copy, not just the one actually clicked,
  // so they never fall out of sync with each other. A no-op generalization for every other
  // caller, where an item only ever appears once.
  function setButtonState(matchBtn, active) {
    container.querySelectorAll(`.card-quick-queue-btn[data-id="${matchBtn.dataset.id}"]`).forEach(b => {
      b.classList.toggle('card-quick-queue-btn--active', active);
      b.title = active ? 'In your queue' : 'Add to queue';
      b.innerHTML = active ? BOOKMARK_FILLED_SVG : BOOKMARK_OUTLINE_SVG;
    });
  }

  container.querySelectorAll('.card-quick-queue-btn').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const isActive = btn.classList.contains('card-quick-queue-btn--active');
      if (isActive) {
        const liveItem = state.items.find(i => i.id === btn.dataset.id);
        if (!liveItem) return;
        liveItem.queueStatus = null;
        await persistItem(liveItem);
        setButtonState(btn, false);
        return;
      }
      let item = state.items.find(i => i.id === btn.dataset.id);
      if (!item) {
        for (const genre of Object.keys(CURATED_ITEMS)) {
          for (const cat of Object.keys(CURATED_ITEMS[genre])) {
            const found = CURATED_ITEMS[genre][cat].find(i => i.id === btn.dataset.id);
            if (found) { item = { ...found, category: cat, curated: true }; break; }
          }
          if (item) break;
        }
      }
      if (!item) return;
      const liveItem = await ensureLiveItem(item);
      liveItem.queueStatus = 'in-queue';
      await persistItem(liveItem);
      setButtonState(btn, true);
    });
  });
}

// Wraps the literal phrase "Inquire to create" in the hero description with a link to the
// Sponsored pitch page, underlined so it reads as a call-to-action inline with the copy.
function linkifyHeroDescription(description) {
  const phrase = 'Inquire to create';
  const idx = description.indexOf(phrase);
  if (idx === -1) return escapeHtml(description);
  const before = description.slice(0, idx);
  const after = description.slice(idx + phrase.length);
  const sponsoredUrl = chrome.runtime.getURL('src/sponsored/sponsored.html');
  return `${escapeHtml(before)}<a class="top100-hero-desc-link" href="${sponsoredUrl}" target="_blank" rel="noopener">${escapeHtml(phrase)}</a>${escapeHtml(after)}`;
}

// The top-level Curated SaveCraft directory — a fully inert visual pitch/demo of many
// nonprofit-sponsored lists at once (see CURATED_DIRECTORY_CONTENT in state.js). Unlike
// renderCuratedGenreLanding() below, nothing here is clickable: no card navigates anywhere, since
// most of these orgs are invented placeholders for volume, not real curated content. Reuses the
// Top 100 landing page's hero/CTA classes for visual consistency, and the same
// tripled-list + _wireCarouselArrows sliding mechanics for the category rows — only the card
// markup itself (.directory-org-card) and the lack of any click wiring are new.
// Bare-bones filter state for the flat directory below — resets each session (not persisted),
// since it's just a display convenience for this fully inert demo list, not real data filtering.
let _bareListCategoryFilter = null;

// A palette rotated across avatar circles, standing in for a real org logo/photo.
const DIRECTORY_AVATAR_COLORS = ['#5B5BEF', '#E0507A', '#2A9D8F', '#E76F51', '#8E44AD', '#F4A340'];

// An org's optional imageUrl (CURATED_DIRECTORY_CONTENT) can be either a real external URL (a
// logo hosted elsewhere) or a path local to this extension's own images/ folder — only the
// latter needs chrome.runtime.getURL(), and calling it on an already-absolute URL would break it.
export function resolveOrgImageUrl(imageUrl) {
  return /^https?:\/\//.test(imageUrl) ? imageUrl : chrome.runtime.getURL(imageUrl);
}

// The top-level Curated SaveCraft landing — a bare-bones, ActBlue-style flat list of the same
// nonprofit-sponsored orgs as CURATED_DIRECTORY_CONTENT (state.js), with a link through to the
// fuller "Curated-full-list" hero+carousel page (renderCuratedDirectory() below). Still fully
// inert — org rows don't navigate anywhere real — but the cause-area filter chips do actually
// filter this flat list client-side, since that doesn't imply any of these orgs are real/live.
function renderCuratedBareList(container) {
  container.className = 'cards-grid bare-list-page';
  document.getElementById('grid-title').style.display = 'none';
  document.querySelector('.grid-header').style.display = 'none';

  const content = CURATED_DIRECTORY_CONTENT;
  const allOrgs = content.categories.flatMap(({ label, orgs }) => orgs.map(org => ({ ...org, category: label })));
  const visibleOrgs = _bareListCategoryFilter ? allOrgs.filter(o => o.category === _bareListCategoryFilter) : allOrgs;

  const filterChipsHtml = content.categories.map(({ label }) => `
    <button class="bare-list-chip${_bareListCategoryFilter === label ? ' bare-list-chip--active' : ''}" data-category="${escapeHtml(label)}">${escapeHtml(label)}</button>
  `).join('');

  const rowsHtml = visibleOrgs.map((org, i) => {
    // Progressive List's logo specifically needs a white backdrop to read correctly; every other
    // avatar (real logo or emoji) keeps the normal rotating brand color.
    const color = org.name === 'Progressive List' ? '#fff' : DIRECTORY_AVATAR_COLORS[i % DIRECTORY_AVATAR_COLORS.length];
    const avatarContent = org.imageUrl
      ? `<img src="${escapeHtml(resolveOrgImageUrl(org.imageUrl))}" alt="">`
      : org.icon;
    return `
      <div class="bare-list-row"${org.linkTo ? ` data-link-to="${escapeHtml(org.linkTo)}"` : ''}>
        <button class="bare-list-bookmark-btn" title="Add to your curated list slider" aria-label="Bookmark">${BOOKMARK_OUTLINE_SVG}</button>
        <div class="bare-list-avatar" style="background:${color}">${avatarContent}</div>
        <div class="bare-list-info">
          <span class="bare-list-org-name">${escapeHtml(org.name)}</span>
          <span class="bare-list-org-tagline">${escapeHtml(org.tagline)}</span>
          <div class="bare-list-tags">
            <span class="bare-list-tag bare-list-tag--muted">${escapeHtml(org.category)}</span>
          </div>
        </div>
        <button class="bare-list-view-btn">View</button>
      </div>`;
  }).join('');

  container.innerHTML = `
    <div class="bare-list-page-inner">
      <div class="bare-list-header bare-list-hero">
        <h2 class="bare-list-title">Cause Curated</h2>
        <p class="bare-list-desc">Browse nonprofit-sponsored curated lists.</p>
      </div>
      <div class="bare-list-body">
        <div class="bare-list-filters">
          <div class="bare-list-filter-section-title">Cause Area</div>
          <div class="bare-list-chips">${filterChipsHtml}</div>
          <div class="bare-list-filter-section-title bare-list-why-title">Why Curated Lists</div>
          <p class="bare-list-why-copy">A good list is a shortcut — built by people who already did the digging, so you don't have to. Curated lists surface what's worth your time from partners whose values you trust, instead of leaving it to chance.</p>
        </div>
        <div class="bare-list-rows">
          ${rowsHtml}
          <button class="bare-list-seeall-btn" data-view="curated-full-list">See all →</button>
        </div>
      </div>
    </div>
  `;

  container.querySelector('.bare-list-seeall-btn')?.addEventListener('click', () => {
    state.view = 'curated-full-list';
    persistViewState();
    renderSidebar();
    renderGrid();
  });

  // The rare row backed by a real destination (currently just Votecraft List -> VoteCraft Picks,
  // via CURATED_DIRECTORY_CONTENT's optional org.linkTo) actually navigates; every other row here
  // stays inert, per the page's usual demo/pitch purpose.
  container.querySelectorAll('.bare-list-row[data-link-to]').forEach(row => {
    row.addEventListener('click', e => {
      if (e.target.closest('.bare-list-bookmark-btn')) return;
      state.sidebarMode = 'curated';
      state.view = row.dataset.linkTo;
      persistViewState();
      renderSidebar();
      renderGrid();
    });
  });

  // Demo-only toggle — purely visual, doesn't persist or touch the Kanban queue. This directory is
  // a pitch/demo page (see renderCuratedDirectory() above), not real data.
  container.querySelectorAll('.bare-list-bookmark-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const active = btn.classList.toggle('bare-list-bookmark-btn--active');
      btn.innerHTML = active ? BOOKMARK_FILLED_SVG : BOOKMARK_OUTLINE_SVG;
    });
  });

  container.querySelectorAll('.bare-list-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const cat = chip.dataset.category;
      _bareListCategoryFilter = _bareListCategoryFilter === cat ? null : cat;
      renderCuratedBareList(container);
    });
  });
}

function renderCuratedDirectory(container) {
  container.className = 'cards-grid top100-landing';
  document.getElementById('grid-title').style.display = 'none';
  document.querySelector('.grid-header').style.display = 'none';

  const content = CURATED_DIRECTORY_CONTENT;
  const categoriesHtml = content.categories.map(({ label, orgs }) => {
    const tripled = [...orgs, ...orgs, ...orgs];
    const cardsHtml = tripled.map(org => {
      const artContent = org.imageUrl
        ? `<img class="directory-org-logo" src="${escapeHtml(resolveOrgImageUrl(org.imageUrl))}" alt="">`
        : `<span class="directory-org-icon">${org.icon}</span>`;
      return `
      <div class="directory-org-card">
        <div class="directory-org-art">${artContent}</div>
        <span class="directory-org-name">${escapeHtml(org.name)}</span>
        <span class="directory-org-tagline">${escapeHtml(org.tagline)}</span>
      </div>`;
    }).join('');
    return `
      <div class="directory-category">
        <div class="directory-category-title">${escapeHtml(label)}</div>
        <div class="dash-carousel directory-carousel">
          <button class="dash-carousel-prev" aria-label="Previous">‹</button>
          <div class="dash-carousel-strip">${cardsHtml}</div>
          <button class="dash-carousel-next" aria-label="Next">›</button>
        </div>
      </div>`;
  }).join('');

  container.innerHTML = `
    <div class="top100-hero">
      <div class="top100-hero-text">
        <div class="top100-wordmark"><img src="${chrome.runtime.getURL('images/logos/votecraft-logo_white.png')}" alt="VoteCraft" class="top100-wordmark-logo"></div>
        <h2 class="top100-hero-title">${escapeHtml(content.headline)}</h2>
        <p class="top100-hero-desc">${escapeHtml(content.description)}</p>
      </div>
      <div class="top100-icon-badge"><img src="${chrome.runtime.getURL('images/logos/votecraft_icon_white.png')}" alt=""></div>
    </div>
    ${categoriesHtml}
    <div class="top100-cta">
      <span class="top100-cta-text">Want your organization's picks featured here?</span>
      <a class="top100-cta-btn" href="${chrome.runtime.getURL('src/sponsored/sponsored.html')}" target="_blank" rel="noopener">Become a Sponsor →</a>
    </div>
  `;

  container.querySelectorAll('.directory-carousel').forEach(carousel => {
    const strip = carousel.querySelector('.dash-carousel-strip');
    if (strip) _wireCarouselArrows(carousel, strip);
  });
}

// A richer landing page for a curated genre (currently just Top 100 — see
// CURATED_GENRE_LANDING_CONTENT in state.js), shown instead of the plain "Pick a category" empty
// state. Deliberately styled distinct from the Dashboard (see cards.css's .top100-* rules) even
// though it reuses the Dashboard's proven scroll-carousel mechanics (_wireCarouselArrows) —
// same plumbing, different skin, so this reads as its own destination, not "the Dashboard again."
function renderCuratedGenreLanding(container, genre, content) {
  container.className = 'cards-grid top100-landing';

  // The hero band below is this view's real header — hide the standard #grid-title ("Top 100
  // Saves") and empty out .grid-header (its sort dropdown gets moved into the hero area itself,
  // see below) so the hero sits flush at the top instead of leaving a redundant gap above it.
  // The sidebar's own "Top 100 Saves" back-button label is a separate element, untouched.
  document.getElementById('grid-title').style.display = 'none';
  document.querySelector('.grid-header').style.display = 'none';

  // Every other curated view resolves an item's displayed image through this same fallback
  // chain (see getFilteredSortedItems()'s genre: branch) before ever falling back to a live
  // fetch — skipping it here was why these rows showed the fallback icon for almost everything
  // instead of real cover art, even for items that already had a cached image sitting in
  // storage from being viewed elsewhere in the app.
  function resolveRowItemImage(i, category) {
    let imageUrl = i.imageUrl || null;
    if (!imageUrl && state.curatedImgCache[i.id]) imageUrl = state.curatedImgCache[i.id];
    if (category === 'Musician') {
      const wikiPhoto = state.artistBioCache[(i.title || '').trim().toLowerCase()]?.photoUrl;
      if (wikiPhoto && (!imageUrl || isItunesArtworkUrl(imageUrl))) imageUrl = wikiPhoto;
    }
    return imageUrl;
  }

  const allRowItems = []; // flattened, de-tripled — fed to the live-fetch calls below
  const rowsHtml = content.rows.map(({ category, label, titles }) => {
    const categoryItems = CURATED_ITEMS[genre]?.[category] || [];
    // `titles` (see CURATED_GENRE_LANDING_CONTENT in state.js) hand-picks exactly these items, by
    // exact title match, in this exact order — falls back to the default "first 15" otherwise.
    const rawItems = titles
      ? titles.map(t => categoryItems.find(i => i.title === t)).filter(i => i && !state.hiddenCurated.has(i.id))
      : categoryItems.filter(i => !state.hiddenCurated.has(i.id)).slice(0, 15);
    if (!rawItems.length) return '';
    const rowItems = rawItems.map(i => ({ ...i, category, curated: true, imageUrl: resolveRowItemImage(i, category) }));
    allRowItems.push(...rowItems);
    // Tripled for the same "always room to scroll either direction" trick
    // _wireCarouselArrows() (dashboard.js) already relies on for the Dashboard's own rows.
    const tripled = [...rowItems, ...rowItems, ...rowItems];
    const cardsHtml = tripled.map(item => {
      const art = item.imageUrl
        ? `<img src="${escapeHtml(item.imageUrl)}" alt="" loading="lazy" decoding="async">`
        : `<span class="top100-row-card-fallback">${CAT_EMOJI[category] || '🎬'}</span>`;
      const isQueued = !!state.items.find(i => i.id === item.id && i.queueStatus);
      // A plain div, not a <button> — it needs to contain the bookmark <button> below, and
      // nesting a button inside a button is invalid HTML (the click wiring below works
      // identically either way, since it's addEventListener-based, not relying on native
      // <button> semantics).
      return `
        <div class="top100-row-card" data-id="${escapeHtml(item.id)}" data-category="${escapeHtml(category)}">
          <div class="top100-row-card-art">
            ${art}
            <button class="card-quick-queue-btn${isQueued ? ' card-quick-queue-btn--active' : ''}" data-id="${escapeHtml(item.id)}" title="${isQueued ? 'In your queue' : 'Add to queue'}">${isQueued ? BOOKMARK_FILLED_SVG : BOOKMARK_OUTLINE_SVG}</button>
          </div>
          <span class="top100-row-card-label">${escapeHtml(item.title || '')}</span>
        </div>`;
    }).join('');
    return `
      <div class="top100-row">
        <div class="top100-row-header" data-genre="${escapeHtml(genre)}" data-category="${escapeHtml(category)}">
          <span class="top100-row-title">${escapeHtml(label)}</span>
          <button class="top100-row-add-btn" aria-label="Open ${escapeHtml(label)}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
          <span class="top100-row-see-all">See all →</span>
        </div>
        <div class="dash-carousel top100-carousel">
          <button class="dash-carousel-prev" aria-label="Previous">‹</button>
          <div class="dash-carousel-strip">${cardsHtml}</div>
          <button class="dash-carousel-next" aria-label="Next">›</button>
        </div>
      </div>`;
  }).join('');

  container.innerHTML = `
    <div class="top100-hero">
      <div class="top100-hero-text">
        <div class="top100-wordmark"><img src="${chrome.runtime.getURL('images/logos/votecraft-logo_white.png')}" alt="VoteCraft" class="top100-wordmark-logo"></div>
        <h2 class="top100-hero-title">${escapeHtml(content.headline)}</h2>
        <p class="top100-hero-desc">${linkifyHeroDescription(content.description)}</p>
      </div>
      <div class="top100-icon-badge"><img src="${chrome.runtime.getURL('images/logos/votecraft_icon_white.png')}" alt=""></div>
    </div>
    <div class="top100-sort-wrap"></div>
    ${rowsHtml}
    <div class="top100-cta">
      <span class="top100-cta-text">Want your organization's picks featured like this?</span>
      <a class="top100-cta-btn" href="${chrome.runtime.getURL('src/sponsored/sponsored.html')}" target="_blank" rel="noopener">Become a Sponsor →</a>
    </div>
  `;

  // Physically relocates the real, singleton #sort-select node (safe — see the comment at the
  // top of renderGrid() for why) into this view's own layout, below the hero, instead of its
  // usual spot in the now-hidden .grid-header toolbar.
  const sortWrap = container.querySelector('.top100-sort-wrap');
  const sortSelect = document.getElementById('sort-select');
  sortWrap.appendChild(sortSelect);
  sortSelect.style.display = '';

  // Same live-fetch-and-patch pipeline the main curated grid uses for anything still missing an
  // image after the cache-merge above (Microlink for a general thumbnail, Wikipedia specifically
  // for Musicians) — patchCardImage() (utils.js) has a .top100-row-card branch to receive it.
  fetchMissingCuratedImages(allRowItems);
  fetchMissingCuratedMusicianPhotos(allRowItems);

  container.querySelectorAll('.top100-carousel').forEach(carousel => {
    const strip = carousel.querySelector('.dash-carousel-strip');
    if (strip) _wireCarouselArrows(carousel, strip);
  });

  container.querySelectorAll('.top100-row-card').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = allRowItems.find(i => i.id === btn.dataset.id && i.category === btn.dataset.category);
      if (item) openDetailModal(item);
    });
  });

  container.querySelectorAll('.top100-row-header').forEach(btn => {
    btn.addEventListener('click', () => {
      state.view = `genre:${btn.dataset.genre}:${btn.dataset.category}`;
      persistViewState();
      renderSidebar();
      renderGrid();
    });
  });

  wireQuickQueueButtons(container);
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
          const aName = item.author || (item.curated && CURATED_NOTES_CATEGORIES.includes(item.category) ? item.notes : null);
          // When the name comes from the curated `.notes` fallback (no item.author), the profile
          // page to link to is 'Musician' for a Music Album (the one category whose
          // curated-notes creator isn't its own category) and item.category for everything else.
          const aCat = item.author ? item.category : (item.category === 'Music Album' ? 'Musician' : item.category);
          if (!aName) return '';
          // A co-directed movie shows the lead director's name plus "…" to indicate collaborators
          // — display-only, never part of the name used to link to/match that director's page.
          const aDisplay = escapeHtml(aName) + (item.authorHasMore ? ' …' : '');
          if ((item.category === 'Music Album' && isMusicAlbumsSectionView()) || isOwnAuthorPageView(aName)) {
            return `<div class="card-author-name">${aDisplay}</div>`;
          }
          return `<button class="card-author-link" data-author="${escapeHtml(aName)}" data-category="${escapeHtml(aCat)}">${aDisplay}</button>`;
        })()}
        ${(() => {
          // News items don't have item.author — they're attributed via item.folderId pointing
          // at a curated outlet folder instead (see the folder-header treatment in renderGrid()).
          if (item.category !== 'News' || !item.folderId) return '';
          const outletFolder = state.folders.find(f => f.id === item.folderId);
          if (!outletFolder) return '';
          return state.view === item.folderId
            ? `<div class="card-author-name">${escapeHtml(outletFolder.name)}</div>`
            : `<button class="card-author-link card-publication-link" data-folder-id="${escapeHtml(item.folderId)}">${escapeHtml(outletFolder.name)}</button>`;
        })()}
        ${CREATOR_CARD_CATEGORY[item.category] && !isOwnAuthorPageView(item.title)
          ? `<button class="card-author-link card-title" data-author="${escapeHtml(item.title)}" data-category="${CREATOR_CARD_CATEGORY[item.category]}">${escapeHtml(item.title || '')}</button>`
          : `<div class="card-title${item.category === 'Music Album' ? ' card-title--album' : ''}">${escapeHtml(item.title || '')}</div>`
        }
        ${item.category === 'Music Album' && item.year ? `<div class="card-album-year">${escapeHtml(item.year)}</div>` : ''}
        <div class="card-meta">
          ${folderLabel}
          <span class="card-badge badge-${catClass(item.category)}" style="margin-left:auto">${badgeLabel(item.category)}</span>
        </div>
      </div>
      ${item.curated ? (() => {
        // Quick "add to queue" for curated cards (Top 100 and every other curated genre) — lets
        // the user queue something straight from the grid without opening the detail modal.
        // Personal (non-curated) cards don't get this: they already have their own queue toggle
        // inside the detail modal, and the edit/delete pair above occupies this same corner.
        // Deliberately not rendered on Kanban cards (kanban.js has its own separate card markup
        // that never calls renderCard()).
        const isQueued = !!state.items.find(i => i.id === item.id && i.queueStatus);
        return `<button class="card-quick-queue-btn${isQueued ? ' card-quick-queue-btn--active' : ''}" data-id="${item.id}" title="${isQueued ? 'In your queue' : 'Add to queue'}">${isQueued ? BOOKMARK_FILLED_SVG : BOOKMARK_OUTLINE_SVG}</button>`;
      })() : `<div class="card-actions">
        <button class="card-action-btn btn-delete" data-id="${item.id}" title="Remove"><svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg></button>
        <button class="card-action-btn btn-edit" data-id="${item.id}" title="Edit"><svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"/></svg></button>
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
