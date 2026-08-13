// ===== SIDEBAR =====

import {
  state, CURATED_ITEMS, CATEGORIES, CAT_LABEL, CAT_EMOJI, CURATED_GENRES, GENRE_EMOJI,
  PRIMARY_FOLDER_ID,
} from './state.js';
import { escapeHtml, folderIconHtml, sortFoldersForDisplay } from './utils.js';
import { persistItem, persistFolder, removeFolder, persistSavedLists } from './storage.js';
import { closeSidebar } from './main.js';
import { matchesPrimaryOrUnfoldered } from './renderFilters.js';
import { renderGrid } from './renderGrid.js';
import { storageSync } from './platform.js';
import { navigateToView } from './navigation.js';

// Collapses every accordion in the sidebar — Dashboard, Saved Lists, Curated Lists, and every
// real category (Music Album excluded, same as sidebarCategoryList's own filter further down;
// it's never rendered as its own top-level collapsible row). Used wherever the sidebar switches
// top-level mode (the mobile drawer's Curated/Shared tabs below, and the desktop options
// dropdown in main.js) so the new mode always starts fully collapsed rather than carrying over
// whatever was left expanded under the previous one. A superset is fine even when the new mode
// won't render every one of these ids (e.g. a curated-genre view has no "Web Links" row) —
// state.collapsed is just a lookup Set, an unused id in it is inert.
export function collapseAllSidebarSections() {
  state.collapsed = new Set([...CATEGORIES.filter(cat => cat !== 'Music Album'), 'dashboard', 'saved-lists', 'curated-lists']);
}

// Wraps a state-change + re-render so the browser can animate between the old and new sidebar DOM
// instead of the section just snapping open/closed — purely additive: renderSidebar() itself is
// still a full innerHTML rebuild either way, but the View Transitions API can smoothly morph a
// named element's old bounding box into its new one across that rebuild without us having to
// preserve any actual DOM nodes ourselves. Feature-detected — Safari didn't ship same-document
// support until v18, so anyone on an older browser just gets today's instant toggle, same as
// before this existed, never a broken/half-animated state.
function withViewTransition(fn) {
  if (document.startViewTransition) {
    document.startViewTransition(fn);
  } else {
    fn();
  }
}

// view-transition-name has to be a valid CSS custom-ident (no spaces/punctuation) — several
// category names aren't ("Web Links"), so this strips anything that isn't alphanumeric. Applied to
// every .sidebar-group regardless of open/collapsed state (see renderSidebar below) so the same
// name persists across a toggle and the browser can match old → new snapshots by it.
function sidebarGroupVtName(key) {
  return 'sidebar-group-' + String(key).replace(/[^a-zA-Z0-9]+/g, '-');
}

// Fill swapped from the source icon's #1f1f1f (near-black, invisible against .cat-icon's dark
// background) to the same #5B5BEF used by every other sidebar cat-icon SVG (CAT_EMOJI in
// state.js) so it's actually visible in the app's dark theme.
const DASHBOARD_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#5B5BEF"><path d="M160-120v-480l320-240 320 240v480H560v-280H400v280H160Z"/></svg>';
// Sized/colored to match a folder row's icon (folderIconHtml(id, 16), fill="#5B5BEF"), since the
// Queue Kanban link renders as a subfolder-styled row nested under Dashboard, not a category icon.
const KANBAN_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="#5B5BEF"><path d="M280-160v-640h400v640H280Zm-160-80v-480h80v480h-80Zm640 0v-480h80v480h-80Zm-400 0h240v-480H360v480Zm0 0v-480 480Z"/></svg>';
// Checklist glyph, same sizing/color convention as KANBAN_ICON_SVG above — distinct from it so
// the two Dashboard-nested kanban rows (Queue Kanban / Admin Kanban) don't read as duplicates of
// the same icon sitting right next to each other.
const ADMIN_KANBAN_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="#5B5BEF"><path d="M120-80v-80h720v80H120Zm146-206L100-452l56-56 110 110 224-224 56 56-280 280Zm0-320L100-772l56-56 110 110 224-224 56 56-280 280Z"/></svg>';
// Same sizing/color convention as KANBAN_ICON_SVG above — another subfolder-styled row nested
// under Dashboard. Its own toggle row has no view (just expands/collapses, see
// wireDashboardLink); its children each route to "savedlist:<id>" (see the generic subfolder
// click-wiring loop below and getFilteredSortedItems()'s own "savedlist:" branch).
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
  } else if (sidebarEffectiveView.startsWith('savedlist:')) {
    // Mirrors the header reading "<Name> Saves" while browsing that Saved List's own landing
    // card (renderGrid.js) — except default-favorites (labeled "All My Saves" in its own Saved
    // Lists row below, see _renderDashboardListRow) is deliberately overridden to the same "My
    // Saves" the rest of this title defaults to, per direct request — this title bar reads as
    // "back to my stuff" for that one list, not an announcement of its configured name the way
    // every other Saved List's title still is. Also the fallback if the list was since deleted.
    const listId = sidebarEffectiveView.slice(10);
    sidebarTitle = listId === 'default-favorites' ? 'My Saves' : (state.savedLists.find(l => l.id === listId)?.name || 'My Saves');
  } else if (state.sidebarMode === 'curated') {
    sidebarTitle = 'Cause Curated';
  } else if (state.sidebarMode === 'shared') {
    sidebarTitle = 'Shared Saves';
  }
  // Returns null (no restriction — the default) or a Set<folderId> of folders allowed to appear
  // while browsing a Saved List that's been scoped via Profile > Saved Lists (profile.js). "All
  // Saves" (default-favorites) is the catch-all and is never restricted, regardless of its own
  // allowedFolderIds field (which the Profile widget never sets — it excludes that list entirely).
  function activeSavedListFolderScope() {
    if (!sidebarEffectiveView.startsWith('savedlist:')) return null;
    const listId = sidebarEffectiveView.slice(10);
    if (listId === 'default-favorites') return null;
    const list = state.savedLists.find(l => l.id === listId);
    return list?.allowedFolderIds ? new Set(list.allowedFolderIds) : null;
  }
  const folderScope = activeSavedListFolderScope();

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
    navigateToView(parts.length > 1 ? `genre:${parts[0]}` : 'curated');
  });

  const mobileHeader = `
    <div class="sidebar-mobile-header">
      <span class="sidebar-mobile-title">${escapeHtml(sidebarTitle)}</span>
      <button class="sidebar-close-btn" aria-label="Close menu">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="sidebar-mode-tabs">
      <button class="sidebar-mode-tab ${state.sidebarMode === 'curated' ? 'active' : ''}" data-sidebar-opt="curated">Curated</button>
      <button class="sidebar-mode-tab ${state.sidebarMode === 'shared' ? 'active' : ''}" data-sidebar-opt="shared">⚡ Shared</button>
    </div>
  `;

  function wireMobileHeader() {
    sidebar.querySelector('.sidebar-close-btn')?.addEventListener('click', closeSidebar);
    sidebar.querySelectorAll('[data-sidebar-opt]').forEach(btn => {
      btn.addEventListener('click', () => {
        const opt = btn.dataset.sidebarOpt;
        let view, sidebarMode;
        if (opt === 'home') {
          sidebarMode = 'home'; view = 'dashboard';
        } else if (opt === 'curated') {
          sidebarMode = 'curated'; view = 'curated';
        } else if (opt === 'shared') {
          sidebarMode = 'shared'; view = 'shared';
        } else {
          sidebarMode = 'categories'; view = 'all';
        }
        // Switching top-level mode closes every accordion rather than leaving whatever was
        // expanded before still open underneath the new mode. Runs before navigateToView so the
        // collapsed state is already settled by the time it triggers the render.
        collapseAllSidebarSections();
        navigateToView(view, { sidebarMode });
        // Curated/Shared navigate straight to their own full-page view, per request — no reason
        // to leave the mobile drawer open over it the way tapping "My Saves" (which just narrows
        // what the drawer itself is showing) still does.
        if (opt === 'curated' || opt === 'shared') closeSidebar();
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
  // only while expanded, same "+ New folder" prompt pattern real category folders use. Saved
  // Lists' children (Favorites/Health/Motivation/anything user-added) all carry a real data-view
  // ("savedlist:<id>", wired below via the generic subfolder click handler +
  // renderGrid()'s own "savedlist:" landing-card branch — see there for what that currently
  // shows).
  function _renderDashboardListRow({ key, icon, label, items, linkClass, childClass, addClass, viewPrefix, itemExtraClass, itemIsActive, showRadio }) {
    const rowCollapsed = state.collapsed.has(key);
    const rowArrow = rowCollapsed ? '▶' : '▼';
    return `
    <div class="sidebar-item sidebar-subfolder ${linkClass}" data-toggle-list="${key}">
      <span class="sidebar-label">${icon} ${label}</span>
      <span class="sidebar-right"><span class="sidebar-arrow">${rowArrow}</span></span>
    </div>
    ${rowCollapsed ? '' : `
    ${items.map(item => {
      // An item with its own itemExtraClass has a hardcoded destination wired separately (see
      // above) — never give it the generic viewPrefix-derived data-view too, or it'd get two
      // conflicting click behaviors (this one plus the dedicated handler).
      const hasCustomDestination = !!itemExtraClass?.(item);
      const view = (viewPrefix && !hasCustomDestination) ? `${viewPrefix}${item.id}` : null;
      const isActive = (view && state.view === view) || !!itemIsActive?.(item);
      // Curated Lists' children render with the same generic folder icon a real subfolder row uses
      // (folderIconHtml with no FOLDER_ICON entry for these ids falls through to
      // GENERIC_FOLDER_ICON_PATH) — plain, no boxed .cat-icon container, so they read as folders
      // nested a level deeper, not top-level category rows. Saved Lists rows instead get a radio
      // dot (showRadio) — same visual language as the detail modal's own "Save to:" menu — in place
      // of the folder icon, so picking one of these rows reads as choosing a section, not
      // navigating into an ordinary folder the way a real category's subfolders (Films > Series,
      // etc.) or Curated Lists' own rows work. Filled/empty mirrors the row's own active state, not
      // a separately-clickable control.
      const radioHtml = showRadio ? `<span class="sidebar-list-radio${isActive ? ' sidebar-list-radio--checked' : ''}"></span>` : folderIconHtml(item.id, 16);
      return `
    <div class="sidebar-item sidebar-subfolder sidebar-subfolder--nested ${childClass} ${itemExtraClass?.(item) || ''} ${isActive ? 'active' : ''}"
         ${view ? `data-view="${escapeHtml(view)}"` : ''}>
      ${radioHtml} ${escapeHtml(item.name)}
    </div>`;
    }).join('')}
    <div class="sidebar-item sidebar-add-folder sidebar-subfolder--nested ${addClass}">
      + Add List
    </div>`}
    `;
  }

  const dashboardLinkHtml = `
    <div class="sidebar-group${isDashboardCollapsed ? '' : ' open'}" style="view-transition-name: ${sidebarGroupVtName('dashboard')}">
      <div class="sidebar-item sidebar-dashboard-link ${state.view === 'dashboard' ? 'active' : ''}" data-view="dashboard" data-toggle="dashboard">
        <span class="sidebar-label"><span class="cat-icon">${DASHBOARD_ICON_SVG}</span><span class="sidebar-label-text"> Dashboard</span></span>
        <span class="sidebar-right"><span class="sidebar-arrow">${dashboardArrow}</span></span>
      </div>
      ${isDashboardCollapsed ? '' : `
      <div class="sidebar-item sidebar-subfolder sidebar-kanban-link ${state.view === 'kanban' ? 'active' : ''}" data-view="kanban">
        ${KANBAN_ICON_SVG} Queue Kanban
      </div>
      <div class="sidebar-item sidebar-subfolder sidebar-admin-kanban-link ${state.view === 'admin-kanban' ? 'active' : ''}" data-view="admin-kanban">
        ${ADMIN_KANBAN_ICON_SVG} Admin Kanban
      </div>
      ${_renderDashboardListRow({
        key: 'saved-lists', icon: SAVED_LISTS_ICON_SVG, label: 'Saved Lists', items: state.savedLists,
        linkClass: 'sidebar-saved-lists-link', childClass: 'sidebar-saved-lists-child', addClass: 'sidebar-add-saved-list',
        viewPrefix: 'savedlist:', showRadio: true,
        // "All My Saves" routes to state.view === 'dashboard' instead of its own generic
        // 'savedlist:default-favorites' (see the click handler below) — the viewPrefix-derived
        // isActive check above wouldn't ever match that, so it needs this explicit override to still
        // highlight itself while Dashboard (the same destination) is what's actually active.
        itemIsActive: item => item.id === 'default-favorites' && state.view === 'dashboard',
      })}
      ${_renderDashboardListRow({
        key: 'curated-lists', icon: CURATED_LISTS_ICON_SVG, label: 'Curated Lists', items: state.curatedListsRows,
        linkClass: 'sidebar-curated-lists-link', childClass: 'sidebar-curated-lists-child', addClass: 'sidebar-add-curated-list',
        itemExtraClass: item => item.id === 'default-votecraft' ? 'sidebar-curated-votecraft-link' : '',
        itemIsActive: item => item.id === 'default-votecraft' && state.sidebarMode === 'curated' && sidebarEffectiveView === 'genre:Top 100',
      })}`}
    </div>
    <div class="sidebar-divider"></div>
  `;

  function wireDashboardLink() {
    sidebar.querySelector('.sidebar-dashboard-link')?.addEventListener('click', () => {
      // withViewTransition — per request, so opening/closing Dashboard's section morphs smoothly
      // instead of snapping, via .sidebar-group's own view-transition-name above.
      withViewTransition(() => {
        if (state.collapsed.has('dashboard')) {
          // Reuses the same canonical "collapse everything" helper the mode-switch handlers below
          // call, then reopens just Dashboard — this used to re-derive its own category list inline
          // instead (via an otherCollapsibleIds param closed over whichever render pass wired it),
          // which went stale in exactly the situation that matters most: wired from the curated-
          // picker branch (which has no categories to pass) and then clicked, leaving every real
          // category un-collapsed once the click switched back to the normal categorized sidebar
          // (reported live: tap Curated, tap Dashboard, every accordion is open).
          collapseAllSidebarSections();
          state.collapsed.delete('dashboard');
        } else {
          state.collapsed.add('dashboard');
        }
        navigateToView('dashboard', { sidebarMode: 'home' });
      });
    });
    sidebar.querySelector('.sidebar-kanban-link')?.addEventListener('click', () => {
      navigateToView('kanban', { sidebarMode: 'home' });
    });
    sidebar.querySelector('.sidebar-admin-kanban-link')?.addEventListener('click', () => {
      navigateToView('admin-kanban', { sidebarMode: 'home' });
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
    // Curated Lists' "Votecraft" row — its one hardcoded destination (see the itemExtraClass/
    // itemIsActive wiring on its _renderDashboardListRow call above): the real "Votecraft List"
    // curated genre, same place the mobile header's "VoteCraft Picks" option links to (the mobile
    // drawer's own "⚡ Shared" tab now links to Shared Saves instead — see wireMobileHeader above).
    sidebar.querySelector('.sidebar-curated-votecraft-link')?.addEventListener('click', () => {
      navigateToView('genre:Top 100', { sidebarMode: 'curated' });
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
        navigateToView('genre:' + el.dataset.genre);
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
    let subfolders = sortFoldersForDisplay(state.folders.filter(f => f.parentCategory === cat), cat);
    if (folderScope) {
      const hadFolders = subfolders.length > 0;
      subfolders = subfolders.filter(f => folderScope.has(f.id));
      // This category had folders, but the active Saved List's scope allows none of them — hide
      // the whole category (header + rows), not just an empty expanded shell.
      if (hadFolders && subfolders.length === 0) return '';
    }
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
    // Music Album isn't part of sidebarCategoryList's own loop (it's excluded above, line
    // 322-323) — it only ever shows via this "Albums" link nested under Musician, routed through
    // its own primary folder id, so the same folderScope check applies here too.
    const musicAlbumFolderAllowed = !folderScope || folderScope.has(PRIMARY_FOLDER_ID['Music Album']);
    const permanentSubfolders = (cat === 'Musician' && musicAlbumFolderAllowed) ? `
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
      <div class="sidebar-group${isCollapsed ? '' : ' open'}" style="view-transition-name: ${sidebarGroupVtName(cat)}">
        <div class="sidebar-item sidebar-category ${isActive ? 'active' : ''}"
             data-view="${cat}" data-toggle="${cat}">
          <span class="sidebar-label"><span class="cat-icon">${CAT_EMOJI[cat] || ''}</span><span class="sidebar-label-text"> ${CAT_LABEL[cat] || cat}</span></span>
          <span class="sidebar-right"><span class="sidebar-arrow">${arrow}</span></span>
        </div>
        ${expandedContent}
      </div>
    `;
    // A category hidden entirely by folderScope (the early `return ''` above) must drop out of
    // the divider-joined list too — filtered out just below — or its neighbors end up with a
    // stray/doubled divider where the hidden one used to be.
  }).filter(html => html !== '').join('<div class="sidebar-divider"></div>');

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
      // withViewTransition — per request, same smooth open/close morph as Dashboard's own toggle
      // above, via .sidebar-group's view-transition-name.
      withViewTransition(() => {
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
        // Was missing persistViewState() entirely before this migration (a pre-existing bug —
        // reloading after clicking a category header lost the navigation, even though it visibly
        // changed state.view) — navigateToView() fixes that as a side effect of picking up History
        // API support here too.
        navigateToView(isCuratedGenre ? `genre:${curatedGenreBase}:${cat}` : cat, { activeCuratedFolderId: null });
      });
    });
  });

  // All Items — same missing-persistViewState() bug as the category header above, same fix.
  sidebar.querySelectorAll('[data-view="all"]').forEach(el => {
    el.addEventListener('click', () => {
      navigateToView('all');
    });
  });

  // Subfolder view-switching (the Queue Kanban / Admin Kanban rows also use .sidebar-subfolder
  // for their visual styling, but both are already wired explicitly in wireDashboardLink() —
  // excluded here so neither gets a second, redundant click handler. Saved Lists' own toggle row
  // (.sidebar-saved-lists-link) is excluded the same way — its children all carry a real
  // data-view ("savedlist:<id>") and fall through to the generic handler below. Curated Lists —
  // both its toggle row and its children — still has no real destination, so both stay excluded
  // so a click doesn't set state.view to undefined and break navigation).
  sidebar.querySelectorAll('.sidebar-subfolder:not(.sidebar-kanban-link):not(.sidebar-admin-kanban-link):not(.sidebar-saved-lists-link):not(.sidebar-curated-lists-link):not(.sidebar-curated-lists-child)').forEach(el => {
    el.addEventListener('click', () => {
      if (isCuratedGenre && el.dataset.permanent) {
        navigateToView(`genre:${curatedGenreBase}:${el.dataset.view}`, { activeCuratedFolderId: null });
      } else if (isCuratedGenre && el.dataset.curatedTarget) {
        // Stays inside the genre by routing to this folder's curatedTarget (a dedicated creator
        // bucket, the full parent category, or — for folders with no curated data at all — the
        // folder's own id, which naturally resolves to an empty list). See the curatedTarget
        // computation in the row-render above for the full explanation.
        navigateToView(`genre:${curatedGenreBase}:${el.dataset.curatedTarget}`, { activeCuratedFolderId: el.dataset.view });
      } else if (el.dataset.view === 'savedlist:default-favorites') {
        // "All My Saves" — the built-in catch-all Saved List — is the same destination as the
        // Dashboard link itself (per direct request), not the generic savedlist: placeholder
        // landing card every other Saved List still shows. sidebarMode matches wireDashboardLink's
        // own 'home' above so this reads as the same navigation, just from a different row.
        navigateToView('dashboard', { sidebarMode: 'home', activeCuratedFolderId: null });
      } else {
        navigateToView(el.dataset.view, { activeCuratedFolderId: null });
      }
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

      // Only a real navigation (and only then worth a history entry) if the deleted folder was
      // actually the active view — otherwise just re-render in place, the folder list itself is
      // what changed, not what's currently being viewed.
      if (state.view === folderId) navigateToView('all');
      else { renderSidebar(); renderGrid(); }
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
// Each entry's sidebar row routes to "savedlist:<id>" once rendered (see renderSidebar()'s
// generic subfolder click-wiring and getFilteredSortedItems()'s "savedlist:" branch) — this
// function only covers creating the entry itself.
export function addSavedList(name) {
  const list = { id: Date.now().toString(), name: name.trim() };
  state.savedLists.push(list);
  persistSavedLists();
  return list;
}

export function promptAddSavedList() {
  const name = prompt('New saved list name:');
  if (!name?.trim()) return;
  addSavedList(name);
  renderSidebar();
}

// Same as promptAddSavedList above, for Curated Lists' own (separate, currently unwired) children.
export function promptAddCuratedListRow() {
  const name = prompt('New curated list name:');
  if (!name?.trim()) return;

  const row = { id: Date.now().toString(), name: name.trim() };
  state.curatedListsRows.push(row);
  storageSync.set({ savecraft_curated_lists_rows: state.curatedListsRows });
  renderSidebar();
}
