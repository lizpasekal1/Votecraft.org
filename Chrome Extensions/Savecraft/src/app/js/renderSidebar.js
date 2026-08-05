// ===== SIDEBAR =====

import {
  state, CURATED_ITEMS, CATEGORIES, CAT_LABEL, CAT_EMOJI, CURATED_GENRES, GENRE_EMOJI,
  PRIMARY_FOLDER_ID,
} from './state.js';
import { escapeHtml, folderIconHtml, sortFoldersForDisplay } from './utils.js';
import { persistViewState, persistItem, persistFolder, removeFolder } from './storage.js';
import { closeSidebar } from './main.js';
import { matchesPrimaryOrUnfoldered } from './renderFilters.js';
import { renderGrid } from './renderGrid.js';

// Fill swapped from the source icon's #1f1f1f (near-black, invisible against .cat-icon's dark
// background) to the same #5B5BEF used by every other sidebar cat-icon SVG (CAT_EMOJI in
// state.js) so it's actually visible in the app's dark theme.
const DASHBOARD_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#5B5BEF"><path d="M160-120v-480l320-240 320 240v480H560v-280H400v280H160Z"/></svg>';
// Sized/colored to match a folder row's icon (folderIconHtml(id, 16), fill="#5B5BEF"), since the
// Queue Kanban link renders as a subfolder-styled row nested under Dashboard, not a category icon.
const KANBAN_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="#5B5BEF"><path d="M280-160v-640h400v640H280Zm-160-80v-480h80v480h-80Zm640 0v-480h80v480h-80Zm-400 0h240v-480H360v480Zm0 0v-480 480Z"/></svg>';
// Same sizing/color convention as KANBAN_ICON_SVG above — another subfolder-styled row nested
// under Dashboard. Not wired to a view yet (see wireDashboardLink and the exclusion in the
// generic subfolder click-wiring loop below) — placeholder row until there's a real destination.
const SAVED_LISTS_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="#5B5BEF"><path d="M160-120q-33 0-56.5-23.5T80-200v-280h80v280h360v80H160Zm160-160q-33 0-56.5-23.5T240-360v-280h80v280h360v80H320Zm160-160q-33 0-56.5-23.5T400-520v-240q0-33 23.5-56.5T480-840h320q33 0 56.5 23.5T880-760v240q0 33-23.5 56.5T800-440H480Zm0-80h320v-160H480v160Z"/></svg>';
// Same sizing/color convention again — Curated Lists is Saved Lists' sibling under Dashboard,
// same collapsible-with-its-own-children structure, just its own (currently empty) list.
const CURATED_LISTS_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="#5B5BEF"><path d="m280-80 160-300-320-40 480-460h80L520-580l320 40L360-80h-80Zm222-247 161-154-269-34 63-117-160 154 268 33-63 118Zm-22-153Z"/></svg>';

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
// Games' "Console Games" folder — curated Top 100 games are all console/PC titles, there's no
// board/mobile game curated data). Every other regular folder (Videos, Series, Podcasts,
// Webseries, Tutorials, Board Games, Mobile Games) has no curated-specific data at all and
// correctly shows empty rather than duplicating a sibling folder's content. Shows no longer has
// an entry here — its old "TV Shows" folder (which did) moved into Films as "Series", a regular
// (not curated-backed) folder there, same as Videos/Directors.
const FOLDER_SHOWS_FULL_CURATED_CATEGORY = new Set([
  'default-books-books',
  'default-movies-movies',
  'default-games-console',
  'default-musicians-musicians',
]);

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
  // Collapsible exactly like a category row (arrow on the right, click toggles), and — same as
  // every category — expanding it collapses every other top-level tab first (see
  // wireDashboardLink's otherCollapsibleIds param below), so at most one tab is ever open across
  // the whole sidebar, Dashboard included. No count badge before the arrow (unlike categories)
  // since "Queue Kanban" isn't a countable quantity.
  const isDashboardCollapsed = state.collapsed.has('dashboard');
  const dashboardArrow = isDashboardCollapsed ? '▶' : '▼';

  // The Queue Kanban row is styled exactly like a category's folder row (same classes/icon
  // sizing as subfolderRows below) so it reads as "a folder nested under Dashboard" — but it's
  // static (no "+ New folder" affordance, can't be deleted/renamed) since Dashboard isn't a real
  // category with `state.folders` entries.
  //
  // Saved Lists / Curated Lists are a level deeper: each is its OWN collapsible row (own arrow,
  // own state.collapsed key, collapsed by default — not tied to Dashboard's own collapse state),
  // with a user-creatable, user-named list of children (state.savedLists/curatedListsRows) shown
  // only while expanded, same "+ New folder" prompt pattern real category folders use. Neither
  // list's children are wired to any view yet.
  function _renderDashboardListRow({ key, icon, label, items, linkClass, childClass, addClass }) {
    const rowCollapsed = state.collapsed.has(key);
    const rowArrow = rowCollapsed ? '▶' : '▼';
    return `
    <div class="sidebar-item sidebar-subfolder ${linkClass}" data-toggle-list="${key}">
      <span class="sidebar-label">${icon} ${label}</span>
      <span class="sidebar-right"><span class="sidebar-arrow">${rowArrow}</span></span>
    </div>
    ${rowCollapsed ? '' : `
    ${items.map(item => `
    <div class="sidebar-item sidebar-subfolder sidebar-subfolder--nested ${childClass}">
      <span class="cat-icon"></span> ${escapeHtml(item.name)}
    </div>`).join('')}
    <div class="sidebar-item sidebar-add-folder sidebar-subfolder--nested ${addClass}">
      + New folder
    </div>`}
    `;
  }

  const dashboardLinkHtml = `
    <div class="sidebar-item sidebar-dashboard-link ${state.view === 'dashboard' ? 'active' : ''}" data-view="dashboard" data-toggle="dashboard">
      <span class="sidebar-label"><span class="cat-icon">${DASHBOARD_ICON_SVG}</span><span class="sidebar-label-text"> Dashboard</span></span>
      <span class="sidebar-right"><span class="sidebar-arrow">${dashboardArrow}</span></span>
    </div>
    ${isDashboardCollapsed ? '' : `
    <div class="sidebar-item sidebar-subfolder sidebar-kanban-link ${state.view === 'kanban' ? 'active' : ''}" data-view="kanban">
      ${KANBAN_ICON_SVG} Queue Kanban
    </div>
    ${_renderDashboardListRow({
      key: 'saved-lists', icon: SAVED_LISTS_ICON_SVG, label: 'Saved Lists', items: state.savedLists,
      linkClass: 'sidebar-saved-lists-link', childClass: 'sidebar-saved-lists-child', addClass: 'sidebar-add-saved-list',
    })}
    ${_renderDashboardListRow({
      key: 'curated-lists', icon: CURATED_LISTS_ICON_SVG, label: 'Curated Lists', items: state.curatedListsRows,
      linkClass: 'sidebar-curated-lists-link', childClass: 'sidebar-curated-lists-child', addClass: 'sidebar-add-curated-list',
    })}`}
    <div class="sidebar-divider"></div>
  `;

  // otherCollapsibleIds: every other top-level tab id currently rendered alongside Dashboard in
  // this render pass (the category list in normal mode, or none in the curated genre-picker,
  // which has nothing else collapsible to close) — expanding Dashboard collapses all of them,
  // same mutual-exclusion the category tabs themselves already had. Passed in rather than closed
  // over sidebarCategoryList directly: this function is also called from the curated-picker
  // branch, textually before sidebarCategoryList is even computed further down.
  function wireDashboardLink(otherCollapsibleIds) {
    sidebar.querySelector('.sidebar-dashboard-link')?.addEventListener('click', () => {
      if (state.collapsed.has('dashboard')) {
        // 'saved-lists'/'curated-lists' always re-added here too — this Set is a full rebuild,
        // not a toggle, so anything not explicitly included in it defaults to expanded; without
        // this, expanding Dashboard from a category tab silently blew away their own independent
        // collapsed-by-default state every time (a real bug, caught via testing before shipping).
        state.collapsed = new Set([...otherCollapsibleIds, 'saved-lists', 'curated-lists']);
      } else {
        state.collapsed.add('dashboard');
      }
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
    // Saved Lists / Curated Lists — each toggles its own independent collapse state (not tied to
    // Dashboard's, and not mutually exclusive with anything else), just expanding/collapsing its
    // own children in place. No view change, no re-render of the grid needed.
    sidebar.querySelectorAll('[data-toggle-list]').forEach(el => {
      el.addEventListener('click', () => {
        const key = el.dataset.toggleList;
        if (state.collapsed.has(key)) state.collapsed.delete(key);
        else state.collapsed.add(key);
        renderSidebar();
      });
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
    wireDashboardLink([]); // genre rows aren't collapsible/tracked in state.collapsed at all
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
    const subfolders = sortFoldersForDisplay(state.folders.filter(f => f.parentCategory === cat), cat);
    const isActive = isCuratedGenre
      ? state.view === `genre:${curatedGenreBase}:${cat}`
      : state.view === cat;
    const isCollapsed = state.collapsed.has(cat);
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
        <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M500-360q42 0 71-29t29-71v-220h120v-80H560v220q-13-10-28-15t-32-5q-42 0-71 29t-29 71q0 42 29 71t71 29ZM320-240q-33 0-56.5-23.5T240-320v-480q0-33 23.5-56.5T320-880h480q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H320Zm0-80h480v-480H320v480ZM160-80q-33 0-56.5-23.5T80-160v-560h80v560h560v80H160Zm160-720v480-480Z"/></svg> Albums
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
        <span class="sidebar-right"><span class="sidebar-arrow">${arrow}</span></span>
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
  wireDashboardLink(sidebarCategoryList);

  // Category header: toggle collapse OR switch view
  sidebar.querySelectorAll('.sidebar-category').forEach(el => {
    el.addEventListener('click', () => {
      const cat = el.dataset.toggle;
      if (state.collapsed.has(cat)) {
        // Expanding — collapse all others first, Dashboard included (sidebarCategoryList excludes
        // Music Album, which has its own separate collapse state via the Musician "Music Albums"
        // permanent subfolder link). 'saved-lists'/'curated-lists' included too — same full-Set-
        // rebuild issue as wireDashboardLink's own expand handler above.
        state.collapsed = new Set([...sidebarCategoryList, 'dashboard', 'saved-lists', 'curated-lists']);
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
  // doesn't get a second, redundant click handler. Saved Lists uses the same styling too, but
  // has no data-view/real destination yet — excluded so a click doesn't set state.view to
  // undefined and break navigation).
  sidebar.querySelectorAll('.sidebar-subfolder:not(.sidebar-kanban-link):not(.sidebar-saved-lists-link):not(.sidebar-saved-lists-child):not(.sidebar-curated-lists-link):not(.sidebar-curated-lists-child)').forEach(el => {
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

  sidebar.querySelector('.sidebar-add-saved-list')?.addEventListener('click', e => {
    e.stopPropagation();
    promptAddSavedList();
  });
  sidebar.querySelector('.sidebar-add-curated-list')?.addEventListener('click', e => {
    e.stopPropagation();
    promptAddCuratedListRow();
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

// ===== SAVED LISTS =====
// Same "+ New folder" prompt pattern as promptAddFolder above, but "Saved Lists" isn't a real
// category — no parentCategory, no per-item folder_<id> storage key, just one flat array
// persisted under a single savecraft_saved_lists key (same convention state.kanbanLists uses).
// Not yet wired to any view when clicked (see the sidebar-saved-lists-child exclusion in
// renderSidebar()'s click-wiring) — this only covers creating the entries themselves.
export function promptAddSavedList() {
  const name = prompt('New saved list name:');
  if (!name?.trim()) return;

  const list = { id: Date.now().toString(), name: name.trim() };
  state.savedLists.push(list);
  chrome.storage.sync.set({ savecraft_saved_lists: state.savedLists });
  renderSidebar();
}

// Same as promptAddSavedList above, for Curated Lists' own (separate, currently unwired) children.
export function promptAddCuratedListRow() {
  const name = prompt('New curated list name:');
  if (!name?.trim()) return;

  const row = { id: Date.now().toString(), name: name.trim() };
  state.curatedListsRows.push(row);
  chrome.storage.sync.set({ savecraft_curated_lists_rows: state.curatedListsRows });
  renderSidebar();
}
