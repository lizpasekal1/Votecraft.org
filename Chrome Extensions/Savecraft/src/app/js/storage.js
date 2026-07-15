// ===== STORAGE =====
// Everything that reads from or writes to chrome.storage.sync/local, plus the Firestore
// curated-data loader. No rendering or DOM logic lives here.

import { state, setCuratedItems } from './state.js';
// Circular import with auth.js (auth.js imports runInitialSync from here) — safe under this
// codebase's established convention, see auth.js's own note on the same import.
import { getCurrentUser, getValidIdToken } from './auth.js';

const _FIREBASE_PROJECT = 'votecraft-789';
const _FIREBASE_API_KEY = 'AIzaSyArJ6pkXUDbZf4jcxRita0qcdr-hT46kI8';
const _CURATED_CACHE_VERSION = 5;

const _CAT_NORMALIZE = {
  'Movies': 'Movie', 'Books': 'Book', 'Games': 'Game',
  'Shows': 'Show', 'Musicians': 'Musician', 'Music': 'Music Album', 'Music Albums': 'Music Album',
};

// ===== SYNCED PERSONAL LIBRARY (Firestore dual-write, only active when signed in) =====
// Every persist*/remove* function below still writes to chrome.storage.sync exactly as before
// — that write is never awaited-on by these helpers and never blocked by them. When signed in,
// each function ALSO fires an unawaited Firestore write gated on getCurrentUser(); failures are
// caught and logged, never surfaced to the caller. Signed-out users get zero extra work.

function _syncError(err) {
  console.warn('[SaveCraft] Firestore sync failed (local save unaffected):', err);
}

function _toFirestoreValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(_toFirestoreValue) } };
  if (typeof v === 'object') return { mapValue: { fields: _toFirestoreFields(v) } };
  return { nullValue: null };
}

function _toFirestoreFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue; // omit undefined keys entirely
    fields[k] = _toFirestoreValue(v);
  }
  return fields;
}

function _fromFirestoreValue(v) {
  if (!v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return parseInt(v.integerValue, 10);
  if ('doubleValue' in v) return v.doubleValue;
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(_fromFirestoreValue);
  if ('mapValue' in v) return _fromFirestoreFields(v.mapValue.fields || {});
  if ('timestampValue' in v) return v.timestampValue;
  return null;
}

function _fromFirestoreFields(fields) {
  const obj = {};
  for (const [k, v] of Object.entries(fields || {})) obj[k] = _fromFirestoreValue(v);
  return obj;
}

// PATCH with no updateMask replaces the whole document — correct for items/folders/authors,
// where the caller always has (and sends) the complete current object.
async function _firestoreUpsert(path, fields) {
  const idToken = await getValidIdToken();
  if (!idToken) return;
  const url = `https://firestore.googleapis.com/v1/projects/${_FIREBASE_PROJECT}/databases/(default)/documents/${path}?key=${_FIREBASE_API_KEY}`;
  const body = { fields: { ..._toFirestoreFields(fields), updatedAt: { timestampValue: new Date().toISOString() } } };
  const resp = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
    body: JSON.stringify(body),
  });
  const data = await resp.json();
  if (data.error) throw new Error(data.error.message);
}

// Same, but with an updateMask so a partial writer (e.g. persistViewState, which only knows
// view+sidebarMode) never clobbers sibling fields (sort, theme, ...) in the shared settings doc.
async function _firestoreUpsertFields(path, partialFields) {
  const idToken = await getValidIdToken();
  if (!idToken) return;
  const keys = [...Object.keys(partialFields), 'updatedAt'];
  const url = new URL(`https://firestore.googleapis.com/v1/projects/${_FIREBASE_PROJECT}/databases/(default)/documents/${path}`);
  url.searchParams.set('key', _FIREBASE_API_KEY);
  keys.forEach(k => url.searchParams.append('updateMask.fieldPaths', k));
  const body = { fields: { ..._toFirestoreFields(partialFields), updatedAt: { timestampValue: new Date().toISOString() } } };
  const resp = await fetch(url.toString(), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
    body: JSON.stringify(body),
  });
  const data = await resp.json();
  if (data.error) throw new Error(data.error.message);
}

async function _firestoreDelete(path) {
  const idToken = await getValidIdToken();
  if (!idToken) return;
  const url = `https://firestore.googleapis.com/v1/projects/${_FIREBASE_PROJECT}/databases/(default)/documents/${path}?key=${_FIREBASE_API_KEY}`;
  const resp = await fetch(url, { method: 'DELETE', headers: { 'Authorization': `Bearer ${idToken}` } });
  const data = await resp.json().catch(() => null);
  if (data?.error) throw new Error(data.error.message);
}

async function _firestoreGetDoc(path, idToken) {
  const url = `https://firestore.googleapis.com/v1/projects/${_FIREBASE_PROJECT}/databases/(default)/documents/${path}?key=${_FIREBASE_API_KEY}`;
  const resp = await fetch(url, { headers: { 'Authorization': `Bearer ${idToken}` } });
  const data = await resp.json();
  if (data.error) {
    if (data.error.status === 'NOT_FOUND' || data.error.code === 404) return null;
    throw new Error(data.error.message);
  }
  return data.fields ? _fromFirestoreFields(data.fields) : null;
}

async function _firestoreListCollection(path, idToken) {
  let allDocs = [];
  let pageToken = null;
  do {
    const url = new URL(`https://firestore.googleapis.com/v1/projects/${_FIREBASE_PROJECT}/databases/(default)/documents/${path}`);
    url.searchParams.set('key', _FIREBASE_API_KEY);
    url.searchParams.set('pageSize', '300');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const resp = await fetch(url.toString(), { headers: { 'Authorization': `Bearer ${idToken}` } });
    const data = await resp.json();
    if (data.error) throw new Error(data.error.message);
    if (data.documents) allDocs = allDocs.concat(data.documents);
    pageToken = data.nextPageToken || null;
  } while (pageToken);
  return allDocs.map(doc => _fromFirestoreFields(doc.fields));
}

async function _loadCuratedFromFirestore() {
  const base = `https://firestore.googleapis.com/v1/projects/${_FIREBASE_PROJECT}/databases/(default)/documents/curated_items`;
  let allDocs = [];
  let pageToken = null;
  do {
    const url = new URL(base);
    url.searchParams.set('pageSize', '300');
    url.searchParams.set('key', _FIREBASE_API_KEY);
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const resp = await fetch(url.toString());
    const data = await resp.json();
    if (data.error) throw new Error(`Firestore error: ${data.error.message}`);
    if (data.documents) allDocs = allDocs.concat(data.documents);
    pageToken = data.nextPageToken || null;
  } while (pageToken);

  function fv(v) {
    if (!v) return null;
    if ('stringValue' in v) return v.stringValue;
    return null;
  }

  const result = {};
  for (const doc of allDocs) {
    const f = doc.fields;
    const genre = fv(f.genre);
    const rawCat = fv(f.category);
    if (!genre || !rawCat) continue;
    const category = _CAT_NORMALIZE[rawCat] || rawCat;
    const item = { id: fv(f.id), title: fv(f.title), url: fv(f.url), imageUrl: fv(f.imageUrl), notes: fv(f.notes) };
    if (!result[genre])           result[genre] = {};
    if (!result[genre][category]) result[genre][category] = [];
    result[genre][category].push(item);
  }
  return result;
}

async function _getCuratedItems() {
  return new Promise(resolve => {
    chrome.storage.local.get({ savecraft_curated_data: null }, async cached => {
      const c = cached.savecraft_curated_data;
      if (c?.data && c?.version === _CURATED_CACHE_VERSION && Date.now() - (c.fetchedAt || 0) < 24 * 60 * 60 * 1000) {
        return resolve(c.data);
      }
      try {
        const fresh = await _loadCuratedFromFirestore();
        chrome.storage.local.set({ savecraft_curated_data: { data: fresh, fetchedAt: Date.now(), version: _CURATED_CACHE_VERSION } });
        resolve(fresh);
      } catch {
        resolve(c?.data || {});
      }
    });
  });
}

// Fetches curated items (from cache if fresh, else Firestore) and installs them into the
// shared state.js CURATED_ITEMS live binding.
export async function initCuratedItems() {
  setCuratedItems(await _getCuratedItems());
}

export async function loadAll() {
  return new Promise(resolve => {
    chrome.storage.sync.get(null, data => {
      state.items = Object.entries(data)
        .filter(([k]) => k.startsWith('item_'))
        .map(([, v]) => v);
      state.folders = Object.entries(data)
        .filter(([k]) => k.startsWith('folder_'))
        .map(([, v]) => v);
      state.authors = Object.entries(data)
        .filter(([k]) => k.startsWith('author_'))
        .map(([, v]) => v);
      state.sort = data.savecraft_sort || 'az';
      state.tutorialSeen = data.savecraft_tutorial_seen || false;
      if (data.savecraft_kanban_sort) state.kanbanSort = { ...state.kanbanSort, ...data.savecraft_kanban_sort };
      const defaultLists = [
        { id: 'group',   name: 'Group Queue'   },
        { id: 'project', name: 'Project Queue' },
        { id: 'work',    name: 'Work Queue'    },
      ];
      const oldNames = { 'Group Saves': 'Group Queue', 'Project Saves': 'Project Queue', 'Work Saves': 'Work Queue' };
      if (data.savecraft_kanban_lists) {
        state.kanbanLists = data.savecraft_kanban_lists.map(l => oldNames[l.name] ? { ...l, name: oldNames[l.name] } : l);
        chrome.storage.sync.set({ savecraft_kanban_lists: state.kanbanLists });
      } else {
        state.kanbanLists = defaultLists;
      }
      state.hiddenCurated = new Set(data.savecraft_hidden_curated || []);
      state.curatedOverrides = data.savecraft_curated_overrides || {};
      state.lastfmUsername = data.savecraft_lastfm_username || null;
      state.followedCuratedLists = new Set(data.savecraft_followed_curated_lists || []);
      state.steamId = data.savecraft_steam_id || null;
      if (data.savecraft_view?.startsWith('author:')) {
        const rest = data.savecraft_view.slice(7);
        const colonIdx = rest.indexOf(':');
        const cat = rest.slice(0, colonIdx);
        const name = rest.slice(colonIdx + 1);
        state.view = state.authors.find(a => a.name === name && a.category === cat)
          ? data.savecraft_view : cat;
      } else if (data.savecraft_view) {
        state.view = data.savecraft_view;
      }
      if (data.savecraft_sidebar_mode) state.sidebarMode = data.savecraft_sidebar_mode;

      // Clean up legacy default folders no longer used
      const legacyIds = [
        'default-music-albums', 'default-music-streaming',
        // News outlet curation is being reworked — pull these back out for now.
        'default-news-ap', 'default-news-reuters', 'default-news-npr', 'default-news-pbs',
        'default-shows-news',
        'default-weblinks-news',
        'default-books-genres',
        // Redundant with the real Musician category now — confusingly asked "pick Musician" twice.
        'default-music-musicians',
      ];
      const legacyKeys = legacyIds.map(id => `folder_${id}`).filter(k => data[k]);
      state.folders = state.folders.filter(f => !legacyIds.includes(f.id));

      // Migrate old category names to new ones
      const CAT_MIGRATION = { Books: 'Book', Games: 'Game', Movies: 'Movie', Music: 'Music Album', Shows: 'Show' };
      const migrated = [];
      state.items.forEach(item => {
        if (CAT_MIGRATION[item.category]) {
          item.category = CAT_MIGRATION[item.category];
          migrated.push(item);
        }
      });
      if (migrated.length) {
        const toMigrate = {};
        migrated.forEach(item => { toMigrate[`item_${item.id}`] = item; });
        chrome.storage.sync.set(toMigrate);
      }

      // Migrate the old folder-based "Favorites" mechanism to the new item.favorite boolean —
      // favoriting used to overwrite folderId to point at a per-category "Favorites" folder,
      // clobbering whatever real folder the item was in. Can't recover that lost folder, so this
      // resets folderId to null (un-foldered now counts as a category's primary folder).
      const favoritesFolderIds = new Set(state.folders.filter(f => f.name === 'Favorites').map(f => f.id));
      if (favoritesFolderIds.size) {
        const favMigrated = [];
        state.items.forEach(item => {
          if (favoritesFolderIds.has(item.folderId)) {
            item.favorite = true;
            item.folderId = null;
            favMigrated.push(item);
          }
        });
        if (favMigrated.length) {
          const toMigrate = {};
          favMigrated.forEach(item => { toMigrate[`item_${item.id}`] = item; });
          chrome.storage.sync.set(toMigrate);
        }
        state.folders = state.folders.filter(f => !favoritesFolderIds.has(f.id));
        favoritesFolderIds.forEach(id => removeFolder(id));
      }

      // Rename a couple of already-seeded default folders — seeding only ever inserts a folder
      // once, so a name change made here later never reaches anyone who already loaded the old one.
      const FOLDER_RENAMES = { 'default-shows-shows': 'TV Shows' };
      Object.entries(FOLDER_RENAMES).forEach(([id, name]) => {
        const folder = state.folders.find(f => f.id === id);
        if (folder && folder.name !== name) {
          folder.name = name;
          persistFolder(folder);
        }
      });

      // Backfill: curated Music Album items stash their artist name in .notes while curated (see
      // detailModal.js's _detailAuthorName). Before a fix, promoting one to a real saved item
      // (detailModal.js's ensureLiveItem) left the artist name stranded in .notes instead of
      // moving it into .author, silently losing the artist link/website CTA. Move it now for any
      // personal (non-curated) Music Album still in that shape — safe to run every load, since
      // it's a no-op once .author is set.
      const authorBackfilled = [];
      state.items.forEach(item => {
        if (item.category === 'Music Album' && !item.curated && !item.author && item.notes) {
          item.author = item.notes;
          item.notes = null;
          authorBackfilled.push(item);
        }
      });
      if (authorBackfilled.length) {
        const toBackfill = {};
        authorBackfilled.forEach(item => { toBackfill[`item_${item.id}`] = item; });
        chrome.storage.sync.set(toBackfill);
      }

      // Seed new default folders if not present
      const defaults = [
        { id: 'default-music-albums',     name: 'Music Albums', parentCategory: 'Music Album' },
        { id: 'default-music-playlists',  name: 'Playlists',    parentCategory: 'Music Album' },
        { id: 'default-books-authors',    name: 'Authors',      parentCategory: 'Book' },
        { id: 'default-weblinks-articles', name: 'Articles',    parentCategory: 'Web Links' },
        { id: 'default-weblinks-blogs',    name: 'Blogs',       parentCategory: 'Web Links' },
        { id: 'default-movies-videos',   name: 'Videos',        parentCategory: 'Movie' },
        { id: 'default-shows-podcasts',  name: 'Podcasts',      parentCategory: 'Show' },
        { id: 'default-shows-webseries', name: 'Webseries',     parentCategory: 'Show' },
        { id: 'default-shows-tutorials', name: 'Tutorials',     parentCategory: 'Show' },
        { id: 'default-movies-movies',       name: 'Movies',    parentCategory: 'Movie' },
        { id: 'default-shows-shows',         name: 'TV Shows',  parentCategory: 'Show' },
        { id: 'default-musicians-musicians', name: 'Musicians', parentCategory: 'Musician' },
        { id: 'default-books-books',         name: 'Books',     parentCategory: 'Book' },
        { id: 'default-weblinks-websites',   name: 'Website',   parentCategory: 'Web Links' },
        { id: 'default-weblinks-shops',      name: 'Shops',     parentCategory: 'Web Links' },
        { id: 'default-art-dance',     name: 'Dance',     parentCategory: 'Visual Art' },
        { id: 'default-art-comics',    name: 'Comics',    parentCategory: 'Visual Art' },
        { id: 'default-art-painting',  name: 'Painting',  parentCategory: 'Visual Art' },
        { id: 'default-art-sculpture', name: 'Sculpture', parentCategory: 'Visual Art' },
        // Curated News outlet folders removed for now — coming back to this (see legacyIds above).
      ];
      const toSave = {};
      for (const df of defaults) {
        if (!state.folders.find(f => f.id === df.id)) {
          state.folders.push(df);
          toSave[`folder_${df.id}`] = df;
        }
      }

      if (legacyKeys.length) {
        chrome.storage.sync.remove(legacyKeys, () => {
          if (Object.keys(toSave).length) chrome.storage.sync.set(toSave, resolve);
          else resolve();
        });
      } else if (Object.keys(toSave).length) {
        chrome.storage.sync.set(toSave, resolve);
      } else {
        resolve();
      }
    });
  });
}

export function persistItem(item) {
  const local = new Promise(resolve => chrome.storage.sync.set({ [`item_${item.id}`]: item }, resolve));
  const user = getCurrentUser();
  if (user) _firestoreUpsert(`savecraft_users/${user.uid}/items/${item.id}`, item).catch(_syncError);
  return local;
}

export function removeItem(id) {
  const local = new Promise(resolve => chrome.storage.sync.remove(`item_${id}`, resolve));
  const user = getCurrentUser();
  if (user) _firestoreDelete(`savecraft_users/${user.uid}/items/${id}`).catch(_syncError);
  return local;
}

export function persistHiddenCurated() {
  const local = new Promise(resolve => chrome.storage.sync.set({ savecraft_hidden_curated: [...state.hiddenCurated] }, resolve));
  const user = getCurrentUser();
  if (user) _firestoreUpsertFields(`savecraft_users/${user.uid}`, { hiddenCurated: [...state.hiddenCurated] }).catch(_syncError);
  return local;
}

export function persistCuratedOverrides() {
  const local = new Promise(resolve => chrome.storage.sync.set({ savecraft_curated_overrides: state.curatedOverrides }, resolve));
  const user = getCurrentUser();
  if (user) _firestoreUpsertFields(`savecraft_users/${user.uid}`, { curatedOverrides: state.curatedOverrides }).catch(_syncError);
  return local;
}

export function persistCuratedImgCache() {
  chrome.storage.local.set({ savecraft_curated_img: state.curatedImgCache });
}

export function persistCuratedAlbumMetaCache() {
  chrome.storage.local.set({ savecraft_curated_album_meta: state.curatedAlbumMetaCache });
}

export function persistAlbumTrackListCache() {
  chrome.storage.local.set({ savecraft_album_tracklist: state.albumTrackListCache });
}

export function persistArtistWebsiteCache() {
  chrome.storage.local.set({ savecraft_artist_website_cache: state.artistWebsiteCache });
}

// _v2: bumped when the cached shape grew a photoUrl field, so old bio-only cache entries
// (which would otherwise short-circuit the photo lookup) don't linger.
export function persistArtistBioCache() {
  chrome.storage.local.set({ savecraft_artist_bio_cache_v2: state.artistBioCache });
}

export function persistItemWikiCache() {
  chrome.storage.local.set({ savecraft_item_wiki_cache: state.itemWikiCache });
}

export function persistViewState() {
  chrome.storage.sync.set({ savecraft_view: state.view, savecraft_sidebar_mode: state.sidebarMode });
  const user = getCurrentUser();
  if (user) _firestoreUpsertFields(`savecraft_users/${user.uid}`, { view: state.view, sidebarMode: state.sidebarMode }).catch(_syncError);
}

export function persistFolder(folder) {
  const local = new Promise(resolve => chrome.storage.sync.set({ [`folder_${folder.id}`]: folder }, resolve));
  const user = getCurrentUser();
  if (user) _firestoreUpsert(`savecraft_users/${user.uid}/folders/${folder.id}`, folder).catch(_syncError);
  return local;
}

export function removeFolder(id) {
  const local = new Promise(resolve => chrome.storage.sync.remove(`folder_${id}`, resolve));
  const user = getCurrentUser();
  if (user) _firestoreDelete(`savecraft_users/${user.uid}/folders/${id}`).catch(_syncError);
  return local;
}

export function persistAuthor(author) {
  const local = new Promise(resolve => chrome.storage.sync.set({ [`author_${author.id}`]: author }, resolve));
  const user = getCurrentUser();
  if (user) _firestoreUpsert(`savecraft_users/${user.uid}/authors/${author.id}`, author).catch(_syncError);
  return local;
}

// All local-only caches (curated images, artist lookups, etc.) are stored separately from
// chrome.storage.sync — this loads one of them into `state` at startup.
export function loadLocalCache(storageKey, stateProp) {
  return new Promise(resolve => {
    chrome.storage.local.get({ [storageKey]: {} }, data => {
      state[stateProp] = data[storageKey];
      resolve();
    });
  });
}

// Thin wrappers around three call sites (main.js's handleSort/toggleTheme/toggleSidebarCollapsed)
// and one in share.js that previously called chrome.storage.sync.set directly, bypassing this
// file entirely — bringing them under the same dual-write umbrella as everything else here.
export function persistSort(sort) {
  chrome.storage.sync.set({ savecraft_sort: sort });
  const user = getCurrentUser();
  if (user) _firestoreUpsertFields(`savecraft_users/${user.uid}`, { sort }).catch(_syncError);
}

export function persistTheme(theme) {
  chrome.storage.sync.set({ savecraft_theme: theme });
  const user = getCurrentUser();
  if (user) _firestoreUpsertFields(`savecraft_users/${user.uid}`, { theme }).catch(_syncError);
}

export function persistSidebarCollapsed(collapsed) {
  chrome.storage.sync.set({ savecraft_sidebar_collapsed: collapsed });
  const user = getCurrentUser();
  if (user) _firestoreUpsertFields(`savecraft_users/${user.uid}`, { sidebarCollapsed: collapsed }).catch(_syncError);
}

export function persistShareCount(count) {
  chrome.storage.sync.set({ savecraft_share_count: count });
  const user = getCurrentUser();
  if (user) _firestoreUpsertFields(`savecraft_users/${user.uid}`, { shareCount: count }).catch(_syncError);
}

// ===== PROFILE PAGE (Connections + Interests) =====
export function persistLastfmUsername(username) {
  chrome.storage.sync.set({ savecraft_lastfm_username: username });
  const user = getCurrentUser();
  if (user) _firestoreUpsertFields(`savecraft_users/${user.uid}`, { lastfmUsername: username }).catch(_syncError);
}

export function disconnectLastfm() {
  state.lastfmUsername = null;
  chrome.storage.sync.set({ savecraft_lastfm_username: null });
  const user = getCurrentUser();
  if (user) _firestoreUpsertFields(`savecraft_users/${user.uid}`, { lastfmUsername: null }).catch(_syncError);
}

export function persistFollowedCuratedLists() {
  const list = [...state.followedCuratedLists];
  chrome.storage.sync.set({ savecraft_followed_curated_lists: list });
  const user = getCurrentUser();
  if (user) _firestoreUpsertFields(`savecraft_users/${user.uid}`, { followedCuratedLists: list }).catch(_syncError);
}

// Local-only cache — re-fetchable, not user-authored data, same treatment as
// persistArtistWebsiteCache() etc. above.
export function persistLastfmCache() {
  chrome.storage.local.set({ savecraft_lastfm_cache: state.lastfmCache });
}

export function persistSteamId(steamId) {
  chrome.storage.sync.set({ savecraft_steam_id: steamId });
  const user = getCurrentUser();
  if (user) _firestoreUpsertFields(`savecraft_users/${user.uid}`, { steamId }).catch(_syncError);
}

export function disconnectSteam() {
  state.steamId = null;
  chrome.storage.sync.set({ savecraft_steam_id: null });
  const user = getCurrentUser();
  if (user) _firestoreUpsertFields(`savecraft_users/${user.uid}`, { steamId: null }).catch(_syncError);
}

export function persistSteamCache() {
  chrome.storage.local.set({ savecraft_steam_cache: state.steamCache });
}

// ===== INITIAL SYNC (runs once, right after a successful sign-up/sign-in) =====
// Deliberately simple union-by-ID merge, not a general bidirectional sync engine. Settings are
// whole-doc (cloud wins wholesale if it exists); items/folders/authors merge independently by
// ID, with cloud winning any same-ID collision on this very first merge (pre-existing local
// records have no updatedAt, treated as oldest possible) — every edit after this first merge
// dual-writes with a real timestamp, so any later first-sync-on-a-new-device merge has genuine
// last-write-wins semantics on both sides.

function _readLocalSettingsSnapshot() {
  return new Promise(resolve => {
    chrome.storage.sync.get({
      savecraft_sort: 'az',
      savecraft_tutorial_seen: false,
      savecraft_kanban_sort: {},
      savecraft_kanban_lists: [],
      savecraft_hidden_curated: [],
      savecraft_curated_overrides: {},
      savecraft_view: 'Book',
      savecraft_sidebar_mode: 'home',
      savecraft_theme: 'dark',
      savecraft_sidebar_collapsed: true,
      savecraft_share_count: 0,
      savecraft_lastfm_username: null,
      savecraft_followed_curated_lists: [],
      savecraft_steam_id: null,
    }, data => resolve({
      sort: data.savecraft_sort,
      tutorialSeen: data.savecraft_tutorial_seen,
      kanbanSort: data.savecraft_kanban_sort,
      kanbanLists: data.savecraft_kanban_lists,
      hiddenCurated: data.savecraft_hidden_curated,
      curatedOverrides: data.savecraft_curated_overrides,
      view: data.savecraft_view,
      sidebarMode: data.savecraft_sidebar_mode,
      theme: data.savecraft_theme,
      sidebarCollapsed: data.savecraft_sidebar_collapsed,
      shareCount: data.savecraft_share_count,
      lastfmUsername: data.savecraft_lastfm_username,
      followedCuratedLists: data.savecraft_followed_curated_lists,
      steamId: data.savecraft_steam_id,
    }));
  });
}

// Strips the Firestore-only updatedAt bookkeeping field before a cloud record is written back
// into chrome.storage.sync — that field must never leak into the shape the rest of the app
// (render.js, kanban.js, detailModal.js, etc.) expects for an item/folder/author.
function _stripSyncMeta(doc) {
  const { updatedAt, ...rest } = doc;
  return rest;
}

async function _mergeCollection(uid, idToken, subcollection, keyPrefix, localList) {
  const cloudList = await _firestoreListCollection(`savecraft_users/${uid}/${subcollection}`, idToken);
  const cloudById = new Map(cloudList.filter(d => d && d.id).map(d => [d.id, d]));
  const localById = new Map(localList.map(d => [d.id, d]));

  const toUploadLocal = [];
  const toWriteLocal = {};

  for (const [id, localDoc] of localById) {
    const cloudDoc = cloudById.get(id);
    if (!cloudDoc) {
      toUploadLocal.push(localDoc);
    } else {
      // Present in both — cloud wins deterministically on this first merge (see file header).
      toWriteLocal[`${keyPrefix}${id}`] = _stripSyncMeta(cloudDoc);
    }
  }
  for (const [id, cloudDoc] of cloudById) {
    if (!localById.has(id)) toWriteLocal[`${keyPrefix}${id}`] = _stripSyncMeta(cloudDoc);
  }

  for (const doc of toUploadLocal) {
    await _firestoreUpsert(`savecraft_users/${uid}/${subcollection}/${doc.id}`, doc);
  }
  if (Object.keys(toWriteLocal).length) {
    // Fires the extension's existing chrome.storage.onChanged listener (main.js), which already
    // live-patches state.items/folders/authors and re-renders — no new render-wiring needed here.
    await new Promise(resolve => chrome.storage.sync.set(toWriteLocal, resolve));
  }
}

export async function runInitialSync(uid) {
  const idToken = await getValidIdToken();
  if (!idToken) return;

  const cloudSettings = await _firestoreGetDoc(`savecraft_users/${uid}`, idToken);
  if (!cloudSettings) {
    const localSettings = await _readLocalSettingsSnapshot();
    await _firestoreUpsert(`savecraft_users/${uid}`, localSettings);
  } else {
    await new Promise(resolve => chrome.storage.sync.set({
      savecraft_sort: cloudSettings.sort,
      savecraft_tutorial_seen: cloudSettings.tutorialSeen,
      savecraft_kanban_sort: cloudSettings.kanbanSort,
      savecraft_kanban_lists: cloudSettings.kanbanLists,
      savecraft_hidden_curated: cloudSettings.hiddenCurated,
      savecraft_curated_overrides: cloudSettings.curatedOverrides,
      savecraft_view: cloudSettings.view,
      savecraft_sidebar_mode: cloudSettings.sidebarMode,
      savecraft_theme: cloudSettings.theme,
      savecraft_sidebar_collapsed: cloudSettings.sidebarCollapsed,
      savecraft_share_count: cloudSettings.shareCount,
      savecraft_lastfm_username: cloudSettings.lastfmUsername,
      savecraft_followed_curated_lists: cloudSettings.followedCuratedLists,
      savecraft_steam_id: cloudSettings.steamId,
    }, resolve));
    // Reflect into live state immediately for the fields state.js actually tracks (theme,
    // sidebarCollapsed, and shareCount have no state.* mirror — main.js/share.js read those
    // fresh from chrome.storage.sync on their own, so no state update is needed for them).
    if (cloudSettings.sort != null) state.sort = cloudSettings.sort;
    if (cloudSettings.tutorialSeen != null) state.tutorialSeen = cloudSettings.tutorialSeen;
    if (cloudSettings.kanbanSort) state.kanbanSort = { ...state.kanbanSort, ...cloudSettings.kanbanSort };
    if (cloudSettings.kanbanLists) state.kanbanLists = cloudSettings.kanbanLists;
    if (cloudSettings.hiddenCurated) state.hiddenCurated = new Set(cloudSettings.hiddenCurated);
    if (cloudSettings.curatedOverrides) state.curatedOverrides = cloudSettings.curatedOverrides;
    if (cloudSettings.view) state.view = cloudSettings.view;
    if (cloudSettings.sidebarMode) state.sidebarMode = cloudSettings.sidebarMode;
    if (cloudSettings.lastfmUsername !== undefined) state.lastfmUsername = cloudSettings.lastfmUsername;
    if (cloudSettings.followedCuratedLists) state.followedCuratedLists = new Set(cloudSettings.followedCuratedLists);
    if (cloudSettings.steamId !== undefined) state.steamId = cloudSettings.steamId;
  }

  await _mergeCollection(uid, idToken, 'items', 'item_', state.items);
  await _mergeCollection(uid, idToken, 'folders', 'folder_', state.folders);
  await _mergeCollection(uid, idToken, 'authors', 'author_', state.authors);
}
