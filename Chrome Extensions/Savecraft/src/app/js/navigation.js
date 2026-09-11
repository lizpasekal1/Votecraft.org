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
// current view-string shape (colons in `author:Music:Name`, spaces in `Top 100`, arbitrary
// folder ids) with no custom parsing. Everything else worth restoring (sidebarMode,
// activeCuratedFolderId, authorReturnView, activeSavedListId) travels in history.state instead of
// the URL, handed straight back on popstate — keeps the URL itself minimal and stable.
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

// A handful of internal state.view values read poorly (or, after the category rename below,
// differently than they used to) as a public, shareable URL — this table is the one place that
// distinction lives; everything else (state.view, history.state.view, CATEGORIES, folder ids,
// ...) keeps using the real internal name/id unchanged.
//
// 'default-musicians-musicians' is a real folder id (storage.js's seed data) that reads poorly
// as a URL, so it gets the short `?v=default-musicians` alias, per direct request — unrelated to
// the category rename below.
//
// The other 8 entries exist for a different reason: CATEGORIES itself was renamed (state.js) from
// old technical names (Web Links/Show/Musician/Music Album/Game/Movie/Book/Visual Art) to the
// friendly names every visitor already saw (Sources/Series/Music/Albums/Games/Films/Literature/
// Arts). Without this table, a link shared BEFORE that rename (e.g. `?v=Movie`) would silently
// stop resolving to anything the moment `state.view` started using the new value ('Films')
// instead — this table keeps every old public URL permanently valid by aliasing the OLD spelling
// (the public, already-shared vocabulary, left stable forever) to the NEW internal state.view
// value, decoupling the two completely. 'Musician' -> 'Music' is a coincidence worth noting: the
// public URL for that tab already read `?v=Music` before this rename (a pre-existing alias, for
// the same "reads poorly as a URL" reason above), which happens to already equal its own new
// internal name — included here anyway for consistency/clarity, though it's a no-op today.
const VIEW_TO_URL_PARAM = {
  'default-musicians-musicians': 'default-musicians',
  Music: 'Music',       // was Musician
  Films: 'Movie',        // was Movie
  Series: 'Show',        // was Show
  Literature: 'Book',    // was Book
  Games: 'Game',         // was Game
  Sources: 'Web Links',  // was Web Links
  Albums: 'Music Album', // was Music Album
  Arts: 'Visual Art',    // was Visual Art
};
const URL_PARAM_TO_VIEW = Object.fromEntries(Object.entries(VIEW_TO_URL_PARAM).map(([k, v]) => [v, k]));

// Reverses a raw `?v=` query value back to the internal view string it stands in for — exported
// for main.js's own two raw-URL reads (initial load, and the popstate fallback for a history
// entry this app didn't create), so both sides of the round-trip agree without duplicating this
// table. A param with no alias just passes through unchanged.
export function urlParamToView(param) {
  return URL_PARAM_TO_VIEW[param] || param;
}

export function navigateToView(view, opts = {}) {
  const { sidebarMode, activeCuratedFolderId, authorReturnView, activeSavedListId, replace = false } = opts;

  state.view = view;
  if (sidebarMode !== undefined) state.sidebarMode = sidebarMode;
  if (activeCuratedFolderId !== undefined) state.activeCuratedFolderId = activeCuratedFolderId;
  if (authorReturnView !== undefined) state.authorReturnView = authorReturnView;
  // Opposite default from the three fields above (which only overwrite when passed, else stay
  // unchanged) — this one resolves to null on every navigation unless a caller explicitly passes
  // a value, so the ~25 call sites elsewhere in the app that never mention it correctly clear any
  // active Saved List scope by default; only the sidebar's own category/subfolder clicks (which
  // preserve it) and the Saved List row itself (which sets it) need to say otherwise.
  state.activeSavedListId = activeSavedListId ?? null;

  if (!NON_HISTORY_VIEWS.has(view)) {
    const historyState = {
      view,
      sidebarMode: state.sidebarMode,
      activeCuratedFolderId: state.activeCuratedFolderId,
      authorReturnView: state.authorReturnView,
      activeSavedListId: state.activeSavedListId,
    };
    const url = `?v=${encodeURIComponent(VIEW_TO_URL_PARAM[view] || view)}`;
    if (replace) history.replaceState(historyState, '', url);
    else history.pushState(historyState, '', url);
  }

  persistViewState();
  renderSidebar();
  renderGrid();
}
