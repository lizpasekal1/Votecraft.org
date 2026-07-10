// ===== STORAGE =====
// Everything that reads from or writes to chrome.storage.sync/local, plus the Firestore
// curated-data loader. No rendering or DOM logic lives here.

import { state, setCuratedItems } from './state.js';

const _FIREBASE_PROJECT = 'votecraft-789';
const _FIREBASE_API_KEY = 'AIzaSyArJ6pkXUDbZf4jcxRita0qcdr-hT46kI8';
const _CURATED_CACHE_VERSION = 5;

const _CAT_NORMALIZE = {
  'Movies': 'Movie', 'Books': 'Book', 'Games': 'Game',
  'Shows': 'Show', 'Musicians': 'Musician', 'Music': 'Music Album', 'Music Albums': 'Music Album',
};

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
      const legacyIds = ['default-music-albums', 'default-music-streaming'];
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

      // Seed new default folders if not present
      const defaults = [
        { id: 'default-music-albums',     name: 'Music Albums', parentCategory: 'Music Album' },
        { id: 'default-music-musicians',  name: 'Musicians',    parentCategory: 'Music Album' },
        { id: 'default-music-playlists',  name: 'Playlists',    parentCategory: 'Music Album' },
        { id: 'default-books-authors',    name: 'Authors',      parentCategory: 'Book' },
        { id: 'default-books-genres',     name: 'Genres',       parentCategory: 'Book' },
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
  return new Promise(resolve => chrome.storage.sync.set({ [`item_${item.id}`]: item }, resolve));
}

export function removeItem(id) {
  return new Promise(resolve => chrome.storage.sync.remove(`item_${id}`, resolve));
}

export function persistHiddenCurated() {
  return new Promise(resolve => chrome.storage.sync.set({ savecraft_hidden_curated: [...state.hiddenCurated] }, resolve));
}

export function persistCuratedOverrides() {
  return new Promise(resolve => chrome.storage.sync.set({ savecraft_curated_overrides: state.curatedOverrides }, resolve));
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

export function persistArtistVideoCache() {
  chrome.storage.local.set({ savecraft_artist_video_cache: state.artistVideoCache });
}

export function persistItemWikiCache() {
  chrome.storage.local.set({ savecraft_item_wiki_cache: state.itemWikiCache });
}

export function persistViewState() {
  chrome.storage.sync.set({ savecraft_view: state.view, savecraft_sidebar_mode: state.sidebarMode });
}

export function persistFolder(folder) {
  return new Promise(resolve => chrome.storage.sync.set({ [`folder_${folder.id}`]: folder }, resolve));
}

export function removeFolder(id) {
  return new Promise(resolve => chrome.storage.sync.remove(`folder_${id}`, resolve));
}

export function persistAuthor(author) {
  return new Promise(resolve => chrome.storage.sync.set({ [`author_${author.id}`]: author }, resolve));
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
