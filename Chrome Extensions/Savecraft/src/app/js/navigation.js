// ===== NAVIGATION: single entry point for every state.view change =====
// Centralizes what used to be ~25 separately-repeated
// "state.view = X; persistViewState(); renderSidebar(); renderGrid();" blocks scattered across
// the app, and additionally keeps the browser's History API (URL + Back/Forward button) in sync
// with every one of those changes — previously this app had zero History API integration at
// all, so Back just left the page instead of navigating within it (reported live).
//
// URL scheme: a single query param, `?v=<encodeURIComponent(state.view)>` — not a path-based
// scheme, deliberately. Firebase Hosting (firebase.json) only rewrites the bare `/` path, so a
// path-based URL would 404 on reload/share without a hosting-config change; a query param keeps
// the requested path as `/` and needs none. encodeURIComponent also losslessly round-trips every
// current view-string shape (colons in `author:Musician:Name`, spaces in `Top 100`, arbitrary
// folder ids) with no custom parsing. Everything else worth restoring (sidebarMode,
// activeCuratedFolderId, authorReturnView) travels in history.state instead of the URL, handed
// straight back on popstate — keeps the URL itself minimal and stable.
//
// See main.js's popstate listener for the read side of this, and its init() for how the very
// first paint resolves either a `?v=` in the URL or the last-stored view into one replaceState.

import { state } from './state.js';
import { persistViewState } from './storage.js';
import { renderSidebar, renderGrid } from './render.js';

// Pseudo-views that intentionally never get a history entry or URL — currently just Embed
// Builder, which already opts out of persistViewState() for the same reason (see its own
// comment: no orphaned builder view with no return scope to reload into). Kept as a Set, not an
// inline string check, so a future pseudo-view can opt out the same way in one place.
const NON_HISTORY_VIEWS = new Set(['embed-builder']);

export function navigateToView(view, opts = {}) {
  const { sidebarMode, activeCuratedFolderId, authorReturnView, replace = false } = opts;

  state.view = view;
  if (sidebarMode !== undefined) state.sidebarMode = sidebarMode;
  if (activeCuratedFolderId !== undefined) state.activeCuratedFolderId = activeCuratedFolderId;
  if (authorReturnView !== undefined) state.authorReturnView = authorReturnView;

  if (!NON_HISTORY_VIEWS.has(view)) {
    const historyState = {
      view,
      sidebarMode: state.sidebarMode,
      activeCuratedFolderId: state.activeCuratedFolderId,
      authorReturnView: state.authorReturnView,
    };
    const url = `?v=${encodeURIComponent(view)}`;
    if (replace) history.replaceState(historyState, '', url);
    else history.pushState(historyState, '', url);
  }

  persistViewState();
  renderSidebar();
  renderGrid();
}
