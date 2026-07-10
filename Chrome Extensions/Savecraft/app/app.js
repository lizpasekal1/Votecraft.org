// ===== CONSTANTS =====
const CATEGORIES = ['Book', 'Game', 'Movie', 'Musician', 'Music Album', 'Show', 'Visual Art'];
const CURATED_GENRES = ['Top 100', 'Futurism', 'Fantasy', 'Thriller', 'Pop', 'Classic', 'Jazz', 'Comedy'];
const GENRE_EMOJI = {
  'Top 100':  '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M852-212 732-332l56-56 120 120-56 56ZM708-692l-56-56 120-120 56 56-120 120Zm-456 0L132-812l56-56 120 120-56 56ZM108-212l-56-56 120-120 56 56-120 120Zm246-75 126-76 126 77-33-144 111-96-146-13-58-136-58 135-146 13 111 97-33 143ZM233-120l65-281L80-590l288-25 112-265 112 265 288 25-218 189 65 281-247-149-247 149Zm247-361Z"/></svg>',
  'Futurism': '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m240-198 79-32q-10-29-18.5-59T287-349l-47 32v119Zm160-42h160q18-40 29-97.5T600-455q0-99-33-187.5T480-779q-54 48-87 136.5T360-455q0 60 11 117.5t29 97.5Zm23.5-223.5Q400-487 400-520t23.5-56.5Q447-600 480-600t56.5 23.5Q560-553 560-520t-23.5 56.5Q513-440 480-440t-56.5-23.5ZM720-198v-119l-47-32q-5 30-13.5 60T641-230l79 32ZM480-881q99 72 149.5 183T680-440l84 56q17 11 26.5 29t9.5 38v237l-199-80H359L160-80v-237q0-20 9.5-38t26.5-29l84-56q0-147 50.5-258T480-881Z"/></svg>',
  'Fantasy':  '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M200-80v-160q0-23 12-41.5t32-29.5l196-99v-70l-139 69q-12 6-25 9t-26 3q-31 0-58.5-16T149-461q-14-27-12-57.5t19-56.5l124-185-80-120h240q133 0 226.5 93T760-560v480H200Zm80-80h400v-400q0-100-70-170t-170-70h-90l26 40-153 230q-5 8-5.5 16.5T221-497q5 11 13.5 14.5T251-479q3 0 15-3l254-128v250L280-240v80Zm160-320Z"/></svg>',
  'Thriller': '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M240-80v-170q-39-17-68.5-45.5t-50-64.5q-20.5-36-31-77T80-520q0-158 112-259t288-101q176 0 288 101t112 259q0 42-10.5 83t-31 77q-20.5 36-50 64.5T720-250v170H240Zm80-80h40v-80h80v80h80v-80h80v80h40v-142q38-9 67.5-30t50-50q20.5-29 31.5-64t11-74q0-125-88.5-202.5T480-800q-143 0-231.5 77.5T160-520q0 39 11 74t31.5 64q20.5 29 50.5 50t67 30v142Zm100-200h120l-60-120-60 120Zm-80-80q33 0 56.5-23.5T420-520q0-33-23.5-56.5T340-600q-33 0-56.5 23.5T260-520q0 33 23.5 56.5T340-440Zm280 0q33 0 56.5-23.5T700-520q0-33-23.5-56.5T620-600q-33 0-56.5 23.5T540-520q0 33 23.5 56.5T620-440ZM480-160Z"/></svg>',
  'Pop':      '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m440-803-83 83H240v117l-83 83 83 83v117h117l83 83 100-100 168 85-86-167 101-101-83-83v-117H523l-83-83Zm0-113 116 116h164v164l116 116-116 116 115 226q7 13 4 25.5T828-132q-8 8-20.5 11t-25.5-4L556-240 440-124 324-240H160v-164L44-520l116-116v-164h164l116-116Zm0 396Z"/></svg>',
  'Classic':  '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M320-160q-33 0-56.5-23.5T240-240v-120h120v-90q-35-2-66.5-15.5T236-506v-44h-46L60-680q36-46 89-65t107-19q27 0 52.5 4t51.5 15v-55h480v520q0 50-35 85t-85 35H320Zm120-200h240v80q0 17 11.5 28.5T720-240q17 0 28.5-11.5T760-280v-440H440v24l240 240v56h-56L510-514l-8 8q-14 14-29.5 25T440-464v104ZM224-630h92v86q12 8 25 11t27 3q23 0 41.5-7t36.5-25l8-8-56-56q-29-29-65-43.5T256-684q-20 0-38 3t-36 9l42 42Zm376 350H320v40h286q-3-9-4.5-19t-1.5-21Zm-280 40v-40 40Z"/></svg>',
  'Jazz':     '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M280-120v-123q-104-14-172-93T40-520h80q0 83 58.5 141.5T320-320h10q5 0 10-1 13 20 28 37.5t32 32.5q-10 3-19.5 4.5T360-243v123h-80Zm20-282q-43-8-71.5-40.5T200-520v-240q0-50 35-85t85-35q50 0 85 35t35 85v160H280v80q0 31 5 60.5t15 57.5Zm255-33q-35-35-35-85v-240q0-50 35-85t85-35q50 0 85 35t35 85v240q0 50-35 85t-85 35q-50 0-85-35Zm45 315v-123q-104-14-172-93t-68-184h80q0 83 58.5 141.5T640-320q83 0 141.5-58.5T840-520h80q0 105-68 184t-172 93v123h-80Zm68.5-371.5Q680-503 680-520v-240q0-17-11.5-28.5T640-800q-17 0-28.5 11.5T600-760v240q0 17 11.5 28.5T640-480q17 0 28.5-11.5ZM640-640Z"/></svg>',
  'Comedy':   '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M480-280q66 0 113-47t47-113H320q0 66 47 113t113 47ZM280-600h160q0-33-23.5-56.5T360-680q-33 0-56.5 23.5T280-600Zm240 0h160q0-33-23.5-56.5T600-680q-33 0-56.5 23.5T520-600ZM480-80q-75 0-140.5-28.5t-114-77q-48.5-48.5-77-114T120-440v-440h720v440q0 75-28.5 140.5t-77 114q-48.5 48.5-114 77T480-80Zm0-80q116 0 198-82t82-198v-360H200v360q0 116 82 198t198 82Zm0-320Z"/></svg>',
};
const CAT_LABEL = {
  'Book': 'Books', 'Game': 'Games', 'Movie': 'Movies',
  'Musician': 'Musicians', 'Music Album': 'Music Albums',
  'Show': 'Shows', 'Visual Art': 'Visual Art',
};

const CAT_EMOJI = { 'Music Album': '<svg xmlns="http://www.w3.org/2000/svg" height="28px" viewBox="0 -960 960 960" width="28px" fill="#5B5BEF"><path d="M447-207q-47-47-47-113t47-113q47-47 113-47 23 0 42.5 5.5T640-458v-342h240v120H720v360q0 66-47 113t-113 47q-66 0-113-47ZM80-320q0-99 38-186.5T221-659q65-65 152.5-103T560-800v80q-82 0-155 31.5t-127.5 86q-54.5 54.5-86 127T160-320H80Zm160 0q0-66 25.5-124.5t69-102Q378-590 436-615t124-25v80q-100 0-170 70t-70 170h-80Z"/></svg>', Musician: '<svg xmlns="http://www.w3.org/2000/svg" height="28px" viewBox="0 -960 960 960" width="28px" fill="#5B5BEF"><path d="M447-207q-47-47-47-113t47-113q47-47 113-47 23 0 42.5 5.5T640-458v-342h240v120H720v360q0 66-47 113t-113 47q-66 0-113-47ZM80-320q0-99 38-186.5T221-659q65-65 152.5-103T560-800v80q-82 0-155 31.5t-127.5 86q-54.5 54.5-86 127T160-320H80Zm160 0q0-66 25.5-124.5t69-102Q378-590 436-615t124-25v80q-100 0-170 70t-70 170h-80Z"/></svg>', Show: '<svg xmlns="http://www.w3.org/2000/svg" height="28px" viewBox="0 -960 960 960" width="28px" fill="#5B5BEF"><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm120-200h80v-240h70l90 240h80l120-320H660l-60 180-60-180H200v80h120v240Z"/></svg>', Book: '<svg xmlns="http://www.w3.org/2000/svg" height="28px" viewBox="0 -960 960 960" width="28px" fill="#5B5BEF"><path d="M270-80q-45 0-77.5-30.5T160-186v-558q0-38 23.5-68t61.5-38l395-78v640l-379 76q-9 2-15 9.5t-6 16.5q0 11 9 18.5t21 7.5h450v-640h80v720H270Zm10-217 80-16v-478l-80 16v478Z"/></svg>', Movie: '<svg xmlns="http://www.w3.org/2000/svg" height="28px" viewBox="0 -960 960 960" width="28px" fill="#5B5BEF"><path d="m460-380 280-180-280-180v360ZM320-240q-33 0-56.5-23.5T240-320v-480q0-33 23.5-56.5T320-880h480q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H320ZM160-80q-33 0-56.5-23.5T80-160v-560h80v560h560v80H160Z"/></svg>', Game: '<svg xmlns="http://www.w3.org/2000/svg" height="28px" viewBox="0 -960 960 960" width="28px" fill="#5B5BEF"><path d="M182-200q-51 0-79-35.5T82-322l42-300q9-60 53.5-99T282-760h396q60 0 104.5 39t53.5 99l42 300q7 51-21 86.5T778-200q-21 0-39-7.5T706-230l-90-90H344l-90 90q-15 15-33 22.5t-39 7.5Zm526.5-251.5Q720-463 720-480t-11.5-28.5Q697-520 680-520t-28.5 11.5Q640-497 640-480t11.5 28.5Q663-440 680-440t28.5-11.5Zm-80-120Q640-583 640-600t-11.5-28.5Q617-640 600-640t-28.5 11.5Q560-617 560-600t11.5 28.5Q583-560 600-560t28.5-11.5ZM310-440h60v-70h70v-60h-70v-70h-60v70h-70v60h70v70Z"/></svg>', 'Visual Art': '<svg xmlns="http://www.w3.org/2000/svg" height="28px" viewBox="0 -960 960 960" width="28px" fill="#5B5BEF"><path d="M480-80q-82 0-155-31.5t-127.5-86Q143-252 111.5-325T80-480q0-83 32.5-156t88-127Q256-817 330-848.5T488-880q80 0 151 27.5t124.5 76q53.5 48.5 85 115T880-518q0 115-70 176.5T640-280h-74q-9 0-12.5 5t-3.5 11q0 12 15 34.5t15 51.5q0 50-27.5 74T480-80ZM303-457q17-17 17-43t-17-43q-17-17-43-17t-43 17q-17 17-17 43t17 43q17 17 43 17t43-17Zm120-160q17-17 17-43t-17-43q-17-17-43-17t-43 17q-17 17-17 43t17 43q17 17 43 17t43-17Zm200 0q17-17 17-43t-17-43q-17-17-43-17t-43 17q-17 17-17 43t17 43q17 17 43 17t43-17Zm120 160q17-17 17-43t-17-43q-17-17-43-17t-43 17q-17 17-17 43t17 43q17 17 43 17t43-17Z"/></svg>', 'Favorite Albums': '💿', 'Web Links': '🎧' };

const CATEGORY_PLATFORMS = {
  'Music Album':  { label: 'Web Links', platforms: [
    { id: 'spotify',     name: 'Spotify',       searchUrl: q => `https://open.spotify.com/search/${encodeURIComponent(q)}` },
    { id: 'apple',       name: 'Apple Music',   searchUrl: q => `https://music.apple.com/search?term=${encodeURIComponent(q)}` },
    { id: 'youtube',     name: 'YouTube Music', searchUrl: q => `https://music.youtube.com/search?q=${encodeURIComponent(q)}` },
    { id: 'tidal',       name: 'Tidal',         searchUrl: q => `https://listen.tidal.com/search/${encodeURIComponent(q)}` },
    { id: 'soundcloud',  name: 'SoundCloud',    searchUrl: q => `https://soundcloud.com/search?q=${encodeURIComponent(q)}` },
    { id: 'amazon',      name: 'Amazon Music',  searchUrl: q => `https://music.amazon.com/search/${encodeURIComponent(q)}` },
    { id: 'deezer',      name: 'Deezer',        searchUrl: q => `https://www.deezer.com/search/${encodeURIComponent(q)}` },
  ]},
  'Musician':     { label: 'Web Links', platforms: null },
  'Favorite Albums': { label: 'Web Links', platforms: null },
  'Web Links':    { label: 'Web Links', platforms: null },
  'Show':         { label: 'Web Links', platforms: [
    { id: 'netflix',     name: 'Netflix',       searchUrl: q => `https://www.netflix.com/search?q=${encodeURIComponent(q)}` },
    { id: 'hulu',        name: 'Hulu',          searchUrl: q => `https://www.hulu.com/search?q=${encodeURIComponent(q)}` },
    { id: 'disney',      name: 'Disney+',       searchUrl: q => `https://www.disneyplus.com/search/${encodeURIComponent(q)}` },
    { id: 'max',         name: 'Max',           searchUrl: q => `https://www.max.com/search?q=${encodeURIComponent(q)}` },
    { id: 'prime',       name: 'Prime Video',   searchUrl: q => `https://www.amazon.com/s?k=${encodeURIComponent(q)}&i=instant-video` },
    { id: 'appletv',     name: 'Apple TV+',     searchUrl: q => `https://tv.apple.com/search?term=${encodeURIComponent(q)}` },
    { id: 'peacock',     name: 'Peacock',       searchUrl: q => `https://www.peacocktv.com/search?q=${encodeURIComponent(q)}` },
    { id: 'paramount',   name: 'Paramount+',    searchUrl: q => `https://www.paramountplus.com/search/${encodeURIComponent(q)}/` },
  ]},
  'Movie':        { label: 'Web Links', platforms: null },
  'Game':         { label: 'Web Links', platforms: [
    { id: 'steam',       name: 'Steam',         searchUrl: q => `https://store.steampowered.com/search/?term=${encodeURIComponent(q)}` },
    { id: 'epic',        name: 'Epic Games',    searchUrl: q => `https://store.epicgames.com/en-US/browse?q=${encodeURIComponent(q)}` },
    { id: 'xbox',        name: 'Xbox',          searchUrl: q => `https://www.xbox.com/en-US/Search/Results?q=${encodeURIComponent(q)}` },
    { id: 'playstation', name: 'PlayStation',   searchUrl: q => `https://store.playstation.com/en-us/search/${encodeURIComponent(q)}` },
    { id: 'nintendo',    name: 'Nintendo',      searchUrl: q => `https://www.nintendo.com/search/#q=${encodeURIComponent(q)}` },
    { id: 'gog',         name: 'GOG',           searchUrl: q => `https://www.gog.com/games?search=${encodeURIComponent(q)}` },
  ]},
  'Book':         { label: 'Web Links', platforms: [
    { id: 'kindle',      name: 'Kindle',        searchUrl: q => `https://www.amazon.com/s?k=${encodeURIComponent(q)}&i=digital-text` },
    { id: 'audible',     name: 'Audible',       searchUrl: q => `https://www.audible.com/search?keywords=${encodeURIComponent(q)}` },
    { id: 'googlebooks', name: 'Google Books',  searchUrl: q => `https://books.google.com/books?q=${encodeURIComponent(q)}` },
    { id: 'applebooks',  name: 'Apple Books',   searchUrl: q => `https://books.apple.com/us/search?term=${encodeURIComponent(q)}` },
    { id: 'libby',       name: 'Libby',         searchUrl: q => `https://libbyapp.com/search/all/search/query-${encodeURIComponent(q)}` },
    { id: 'scribd',      name: 'Scribd',        searchUrl: q => `https://www.scribd.com/search?query=${encodeURIComponent(q)}` },
  ]},
};

// Share platforms between categories that are identical
CATEGORY_PLATFORMS['Musician'].platforms           = CATEGORY_PLATFORMS['Music Album'].platforms;
CATEGORY_PLATFORMS['Favorite Albums'].platforms    = CATEGORY_PLATFORMS['Music Album'].platforms;
CATEGORY_PLATFORMS['Web Links'].platforms          = CATEGORY_PLATFORMS['Music Album'].platforms;
CATEGORY_PLATFORMS['Movie'].platforms              = CATEGORY_PLATFORMS['Show'].platforms;

const STREAMING_DOMAINS = [
  'open.spotify.com', 'spotify.com',
  'music.apple.com',
  'music.youtube.com',
  'tidal.com', 'listen.tidal.com',
  'music.amazon.com',
  'soundcloud.com',
  'deezer.com',
];

// ===== CURATED ITEMS (loaded from Firestore) =====
let CURATED_ITEMS = {};

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
// ===== STATE =====
const state = {
  items: [],
  folders: [],
  authors: [],
  view: 'Books',     // 'all', category name, or folder id
  authorReturnView: null, // view to restore when leaving an author page via its back button
  sort: 'az',
  search: '',
  modalCategory: null,
  editingId: null,
  collapsed: new Set(CATEGORIES), // all collapsed by default
  sidebarMode: 'categories', // 'categories' | 'curated'
  hiddenCurated: new Set(), // curated item IDs the user has dismissed
  curatedOverrides: {}, // { [curatedItemId]: { url, title, notes, imageUrl } }
  curatedImgCache: {},  // { [curatedItemId]: imageUrl } — auto-fetched via Microlink
  curatedAlbumMetaCache: {}, // { [curatedItemId]: { year, collectionId } } — auto-fetched via iTunes (curated albums have neither field in Firestore)
  albumTrackListCache: {}, // { [collectionId]: { tracks: [{number,title,durationMs}], fetchedAt } } — auto-fetched via iTunes lookup, never expires
  artistWebsiteCache: {}, // { [normalizedArtistName]: { url: string|null, fetchedAt: number } } — auto-fetched via MusicBrainz/Wikidata
  artistBioCache: {}, // { [normalizedArtistName]: { bio: string|null, photoUrl: string|null, fetchedAt: number } } — auto-fetched via Wikipedia
  artistVideoCache: {}, // { [normalizedArtistName]: { videoId: string|null, fetchedAt: number } } — auto-fetched via YouTube Data API
  tutorialSeen: false,
  kanbanSort: { 'in-queue': 'newest', 'in-progress': 'newest', 'my-review': 'newest', 'done': 'newest' },
  kanbanLists: [],
  activeListId: null,
  kanbanCategory: null,
};

// ===== STORAGE =====
async function loadAll() {
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

function persistItem(item) {
  return new Promise(resolve => chrome.storage.sync.set({ [`item_${item.id}`]: item }, resolve));
}

function removeItem(id) {
  return new Promise(resolve => chrome.storage.sync.remove(`item_${id}`, resolve));
}

async function autoSaveMusician(artistName) {
  if (!artistName) return;
  let musicianItem = state.items.find(i => i.category === 'Musician' && i.title === artistName);
  if (!musicianItem) {
    let curated = null;
    for (const genre of Object.keys(CURATED_ITEMS)) {
      curated = (CURATED_ITEMS[genre]['Musician'] || []).find(m => m.title === artistName);
      if (curated) break;
    }
    musicianItem = {
      id: `item_${Date.now()}`,
      title: artistName,
      category: 'Musician',
      author: null,
      url: curated?.url || '',
      imageUrl: curated?.imageUrl || null,
      notes: null,
      savedAt: Date.now(),
      curated: false,
      done: false,
      folderId: null,
    };
    state.items.push(musicianItem);
    await persistItem(musicianItem);
  }

  // Ensure an author profile exists so a website lookup has somewhere to attach
  let author = findAuthor(artistName, 'Musician');
  if (!author) {
    author = { id: Date.now().toString(), name: artistName, category: 'Musician', bio: null, imageUrl: null, websiteUrl: null, savedAt: Date.now() };
    state.authors.push(author);
    await persistAuthor(author);
  }
  if (!author.websiteUrl) {
    ensureArtistWebsite(artistName).then(url => {
      if (!url) return;
      author.websiteUrl = url;
      persistAuthor(author);
    });
  }
  const _needsAuthorUpdate = !author.imageUrl || isItunesArtworkUrl(author.imageUrl) || !author.bio;
  const _needsItemUpdate = !musicianItem.imageUrl || isItunesArtworkUrl(musicianItem.imageUrl);
  if (_needsAuthorUpdate || _needsItemUpdate) {
    ensureArtistWikipediaInfo(artistName).then(({ bio, photoUrl }) => {
      let changed = false;
      if (applyArtistPhotoToItem(author, photoUrl)) changed = true;
      if (!author.bio && bio) { author.bio = bio; changed = true; }
      if (changed) persistAuthor(author);
      if (applyArtistPhotoToItem(musicianItem, photoUrl)) {
        persistItem(musicianItem);
        patchCardImage(musicianItem.id, musicianItem.imageUrl);
      }
    });
  }
}

function persistHiddenCurated() {
  return new Promise(resolve => chrome.storage.sync.set({ savecraft_hidden_curated: [...state.hiddenCurated] }, resolve));
}

function persistCuratedOverrides() {
  return new Promise(resolve => chrome.storage.sync.set({ savecraft_curated_overrides: state.curatedOverrides }, resolve));
}

function persistCuratedImgCache() {
  chrome.storage.local.set({ savecraft_curated_img: state.curatedImgCache });
}

function persistCuratedAlbumMetaCache() {
  chrome.storage.local.set({ savecraft_curated_album_meta: state.curatedAlbumMetaCache });
}

function persistAlbumTrackListCache() {
  chrome.storage.local.set({ savecraft_album_tracklist: state.albumTrackListCache });
}

function persistArtistWebsiteCache() {
  chrome.storage.local.set({ savecraft_artist_website_cache: state.artistWebsiteCache });
}

// _v2: bumped when the cached shape grew a photoUrl field, so old bio-only cache entries
// (which would otherwise short-circuit the photo lookup) don't linger.
function persistArtistBioCache() {
  chrome.storage.local.set({ savecraft_artist_bio_cache_v2: state.artistBioCache });
}

function persistArtistVideoCache() {
  chrome.storage.local.set({ savecraft_artist_video_cache: state.artistVideoCache });
}

// Shared check for "does this Wikidata/Wikipedia result actually describe a musician/band" —
// used to reject same-name but wrong-topic matches (e.g. "Eagles" the bird) rather than guessing.
const MUSIC_ENTITY_KEYWORDS = /\b(band|singer|musician|rapper|duo|group|composer|songwriter|dj)\b/i;

const ARTIST_WEBSITE_CACHE_MISS_TTL = 90 * 24 * 60 * 60 * 1000; // 90 days
const ARTIST_BIO_CACHE_MISS_TTL = 90 * 24 * 60 * 60 * 1000; // 90 days

// True for a photo already auto-fetched from the iTunes album-cover fallback (identifiable by
// Apple's CDN domain) — safe to replace with a real Wikipedia photo once one's available, unlike
// a URL the user pasted in manually, which is never overwritten by auto-fetch.
function isItunesArtworkUrl(url) {
  return !!url && /mzstatic\.com/i.test(url);
}

// Sets imageUrl on an author record or item if it's empty or still the replaceable iTunes
// stand-in — never overwrites a real (curated or user-provided) photo. Returns true if changed.
function applyArtistPhotoToItem(target, photoUrl) {
  if (!photoUrl || !target) return false;
  if (target.imageUrl && !isItunesArtworkUrl(target.imageUrl)) return false;
  target.imageUrl = photoUrl;
  return true;
}

// Swaps in a newly-fetched image on any already-rendered card for this item, mirroring the
// same live-patch technique fetchMissingCuratedImages() uses for curated thumbnails.
function patchCardImage(itemId, imageUrl) {
  if (!imageUrl) return;
  document.querySelectorAll(`.card[data-id="${itemId}"]`).forEach(card => {
    const existingImg = card.querySelector('.card-image');
    if (existingImg) { existingImg.src = imageUrl; return; }
    const placeholder = card.querySelector('.card-placeholder');
    if (!placeholder) return;
    const img = document.createElement('img');
    img.className = 'card-image';
    img.src = imageUrl;
    img.alt = '';
    img.onerror = () => { img.style.display = 'none'; placeholder.style.display = 'flex'; };
    placeholder.style.display = 'none';
    card.insertBefore(img, placeholder);
  });
}

// Looks up a short bio paragraph AND a photo via Wikipedia (both come from the same page
// summary, so they're fetched together). Rejects (returns nulls rather than guessing) any
// candidate page whose description/extract doesn't read as being about a musician/band, to
// avoid pulling in data about an unrelated same-named topic (e.g. "Eagles" the bird). Falls
// back to an iTunes album-cover stand-in for the photo only if Wikipedia has no image at all.
async function ensureArtistWikipediaInfo(artistName) {
  if (!artistName) return { bio: null, photoUrl: null };
  const key = artistName.trim().toLowerCase();
  const cached = state.artistBioCache[key];
  if (cached && ((cached.bio || cached.photoUrl) || (Date.now() - cached.fetchedAt < ARTIST_BIO_CACHE_MISS_TTL))) {
    return { bio: cached.bio || null, photoUrl: cached.photoUrl || null };
  }
  const summary = await fetchArtistWikipediaSummary(artistName);
  let photoUrl = summary?.originalimage?.source || summary?.thumbnail?.source || null;
  if (!photoUrl) photoUrl = await fetchArtistPhotoFromItunes(artistName);
  const result = { bio: summary?.extract || null, photoUrl };
  state.artistBioCache[key] = { ...result, fetchedAt: Date.now() };
  persistArtistBioCache();
  return result;
}

// Set this to a YouTube Data API v3 key (restricted to that API only) to enable inline promo
// video playback. Without one, the Promo Vid button falls back to opening a YouTube search
// in a new tab. Get a key at https://console.cloud.google.com (enable "YouTube Data API v3",
// then Credentials → Create Credentials → API Key).
const YOUTUBE_API_KEY = '';

const ARTIST_VIDEO_CACHE_MISS_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

// Resolves a real, embeddable YouTube video ID for an artist via the YouTube Data API,
// scoped to videoCategoryId=10 ("Music") so results are actual music videos rather than
// interviews, live performances mislabeled otherwise, fan content, etc. Cached per artist.
async function ensureArtistMusicVideoId(artistName) {
  if (!artistName || !YOUTUBE_API_KEY) return null;
  const key = artistName.trim().toLowerCase();
  const cached = state.artistVideoCache[key];
  if (cached && (cached.videoId || (Date.now() - cached.fetchedAt < ARTIST_VIDEO_CACHE_MISS_TTL))) {
    return cached.videoId;
  }
  let videoId = null;
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=1&q=${encodeURIComponent(artistName + ' official music video')}&key=${YOUTUBE_API_KEY}`;
    const resp = await fetch(url);
    if (resp.ok) {
      const data = await resp.json();
      videoId = data.items?.[0]?.id?.videoId || null;
    }
  } catch { /* no video found */ }
  state.artistVideoCache[key] = { videoId, fetchedAt: Date.now() };
  persistArtistVideoCache();
  return videoId;
}

async function fetchWikipediaSummary(title) {
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}?redirect=true`;
    const resp = await fetch(url);
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

function isMusicEntitySummary(summary) {
  if (!summary || summary.type === 'disambiguation') return false;
  return MUSIC_ENTITY_KEYWORDS.test(`${summary.description || ''} ${summary.extract || ''}`);
}

// Returns a validated (confirmed-music-topic) Wikipedia summary object — includes `extract`
// (bio text) and `thumbnail`/`originalimage` (photo) — or null if nothing music-related is found.
async function fetchArtistWikipediaSummary(artistName) {
  const direct = await fetchWikipediaSummary(artistName);
  if (isMusicEntitySummary(direct)) return direct;

  // Direct title was missing, a disambiguation page, or about the wrong topic (e.g. "Eagles"
  // the bird) — search instead, biased toward music, and only accept a confirmed music match.
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(artistName + ' band OR musician')}&format=json&origin=*`;
    const resp = await fetch(searchUrl);
    if (!resp.ok) return null;
    const data = await resp.json();
    for (const result of (data.query?.search || []).slice(0, 5)) {
      const candidate = await fetchWikipediaSummary(result.title);
      if (isMusicEntitySummary(candidate)) return candidate;
    }
  } catch { /* no confirmed music match found */ }
  return null;
}

// Looks up an artist's official homepage via MusicBrainz (preferred) then Wikidata (fallback).
// Cached indefinitely on success; cached "not found" results expire after ARTIST_WEBSITE_CACHE_MISS_TTL.
async function ensureArtistWebsite(artistName) {
  if (!artistName) return null;
  const key = artistName.trim().toLowerCase();
  const cached = state.artistWebsiteCache[key];
  if (cached && (cached.url || (Date.now() - cached.fetchedAt < ARTIST_WEBSITE_CACHE_MISS_TTL))) {
    return cached.url;
  }
  const url = await fetchArtistWebsite(artistName);
  state.artistWebsiteCache[key] = { url, fetchedAt: Date.now() };
  persistArtistWebsiteCache();
  return url;
}

// iTunes's Search API has no dedicated "artist photo" field — the closest available image is
// an album cover, so we use the most relevant album's artwork as a stand-in for the artist photo.
async function fetchArtistPhotoFromItunes(artistName) {
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(artistName)}&entity=album&media=music&limit=5`;
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const data = await resp.json();
    const lowerName = artistName.trim().toLowerCase();
    const match = data.results.find(r => r.collectionType && r.artistName?.toLowerCase() === lowerName)
      || data.results.find(r => r.collectionType);
    return match?.artworkUrl100?.replace('100x100bb', '1200x1200bb') || null;
  } catch {
    return null;
  }
}

async function fetchArtistWebsite(artistName) {
  try {
    const mbUrl = await fetchArtistWebsiteFromMusicBrainz(artistName);
    if (mbUrl) return mbUrl;
  } catch { /* fall through to Wikidata */ }
  try {
    const wdUrl = await fetchArtistWebsiteFromWikidata(artistName);
    if (wdUrl) return wdUrl;
  } catch { /* no website found anywhere */ }
  return null;
}

async function fetchArtistWebsiteFromMusicBrainz(artistName) {
  const searchUrl = `https://musicbrainz.org/ws/2/artist?query=${encodeURIComponent(artistName)}&fmt=json&limit=5`;
  const searchResp = await fetch(searchUrl);
  if (!searchResp.ok) return null;
  const searchData = await searchResp.json();
  const lowerName = artistName.trim().toLowerCase();
  const match = (searchData.artists || []).find(a =>
    a.name?.toLowerCase() === lowerName || a.score >= 90
  );
  if (!match) return null;

  const lookupUrl = `https://musicbrainz.org/ws/2/artist/${match.id}?inc=url-rels&fmt=json`;
  const lookupResp = await fetch(lookupUrl);
  if (!lookupResp.ok) return null;
  const lookupData = await lookupResp.json();
  const homepage = (lookupData.relations || []).find(r => r.type === 'official homepage' && !r.ended);
  return homepage?.url?.resource || null;
}

async function fetchArtistWebsiteFromWikidata(artistName) {
  const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(artistName)}&language=en&type=item&format=json&limit=5`;
  const searchResp = await fetch(searchUrl);
  if (!searchResp.ok) return null;
  const searchData = await searchResp.json();
  const results = searchData.search || [];
  if (!results.length) return null;

  const candidate = results.find(r => MUSIC_ENTITY_KEYWORDS.test(r.description || '')) || results[0];

  const entityUrl = `https://www.wikidata.org/wiki/Special:EntityData/${candidate.id}.json`;
  const entityResp = await fetch(entityUrl);
  if (!entityResp.ok) return null;
  const entityData = await entityResp.json();
  const claims = entityData.entities?.[candidate.id]?.claims?.P856 || [];
  if (!claims.length) return null;
  const preferred = claims.find(c => c.rank === 'preferred') || claims.find(c => c.rank !== 'deprecated');
  return preferred?.mainsnak?.datavalue?.value || null;
}

function fetchMissingCuratedImages(items) {
  const missing = items.filter(i => i.curated && !i.imageUrl);
  if (!missing.length) return;
  missing.forEach(item => {
    fetch(`https://api.microlink.io?url=${encodeURIComponent(item.url)}`)
      .then(r => r.json())
      .then(data => {
        const imgUrl = data?.data?.image?.url;
        if (!imgUrl) return;
        state.curatedImgCache[item.id] = imgUrl;
        persistCuratedImgCache();
        // Swap placeholder with image directly in the DOM
        const card = document.querySelector(`.card[data-id="${item.id}"]`);
        if (!card) return;
        if (card.querySelector('.card-image')) return; // already has an image, don't double-insert
        const placeholder = card.querySelector('.card-placeholder');
        if (!placeholder) return;
        const img = document.createElement('img');
        img.className = 'card-image';
        img.src = imgUrl;
        img.alt = '';
        img.onerror = () => { img.style.display = 'none'; placeholder.style.display = 'flex'; };
        placeholder.style.display = 'none'; // hide placeholder before image arrives
        card.insertBefore(img, placeholder);
      })
      .catch(() => {});
  });
}

// Same idea as fetchMissingCuratedImages(), but for curated Musician cards whose photo is
// missing or still the iTunes stand-in — looks up (and caches) the Wikipedia photo per artist,
// then live-patches any matching cards already on screen.
function fetchMissingCuratedMusicianPhotos(items) {
  const missing = items.filter(i => i.curated && i.category === 'Musician' && (!i.imageUrl || isItunesArtworkUrl(i.imageUrl)));
  if (!missing.length) return;
  missing.forEach(item => {
    ensureArtistWikipediaInfo(item.title).then(({ photoUrl }) => {
      if (!photoUrl) return;
      patchCardImage(item.id, photoUrl);
    });
  });
}

function persistViewState() {
  chrome.storage.sync.set({ savecraft_view: state.view, savecraft_sidebar_mode: state.sidebarMode });
}

function persistFolder(folder) {
  return new Promise(resolve => chrome.storage.sync.set({ [`folder_${folder.id}`]: folder }, resolve));
}

function removeFolder(id) {
  return new Promise(resolve => chrome.storage.sync.remove(`folder_${id}`, resolve));
}

function persistAuthor(author) {
  return new Promise(resolve => chrome.storage.sync.set({ [`author_${author.id}`]: author }, resolve));
}

function removeAuthor(id) {
  return new Promise(resolve => chrome.storage.sync.remove(`author_${id}`, resolve));
}

function findAuthor(name, category) {
  return state.authors.find(a => a.name === name && a.category === category) ?? null;
}

async function navigateToAuthor(name, category) {
  state.authorReturnView = state.view;
  let author = findAuthor(name, category);
  if (!author) {
    author = { id: Date.now().toString(), name, category, bio: null, imageUrl: null, websiteUrl: null, savedAt: Date.now() };
    state.authors.push(author);
    await persistAuthor(author);
  }
  state.view = `author:${category}:${name}`;
  persistViewState();
  renderSidebar();
  renderGrid();

  if (category === 'Musician' && !author.websiteUrl) {
    ensureArtistWebsite(name).then(url => {
      if (!url) return;
      author.websiteUrl = url;
      persistAuthor(author);
      if (state.view === `author:${category}:${name}`) renderGrid();
    });
  }

  const _navMusicianItem = state.items.find(i => i.category === 'Musician' && i.title === name);
  const _navNeedsAuthorUpdate = !author.imageUrl || isItunesArtworkUrl(author.imageUrl) || !author.bio;
  const _navNeedsItemUpdate = _navMusicianItem && (!_navMusicianItem.imageUrl || isItunesArtworkUrl(_navMusicianItem.imageUrl));
  if (category === 'Musician' && (_navNeedsAuthorUpdate || _navNeedsItemUpdate)) {
    ensureArtistWikipediaInfo(name).then(({ bio, photoUrl }) => {
      let changed = false;
      if (applyArtistPhotoToItem(author, photoUrl)) changed = true;
      if (!author.bio && bio) { author.bio = bio; changed = true; }
      if (changed) persistAuthor(author);

      if (_navMusicianItem && applyArtistPhotoToItem(_navMusicianItem, photoUrl)) {
        persistItem(_navMusicianItem);
        patchCardImage(_navMusicianItem.id, _navMusicianItem.imageUrl);
        changed = true;
      }

      if (changed && state.view === `author:${category}:${name}`) renderGrid();
    });
  }
}

// Finds (or builds a lightweight stand-in for) a Musician item to show in the quick-preview
// detail modal — used when clicking an artist's own name on their own album page, where
// navigating to the page you're already on wouldn't make sense.
function resolveMusicianItem(name) {
  const personal = state.items.find(i => i.category === 'Musician' && i.title === name);
  if (personal) return personal;
  for (const genre of Object.keys(CURATED_ITEMS)) {
    const curated = (CURATED_ITEMS[genre]['Musician'] || []).find(m => m.title === name);
    if (curated) return { ...curated, category: 'Musician', curated: true, done: false, savedAt: 0, folderId: null };
  }
  const author = findAuthor(name, 'Musician');
  return {
    id: `virtual-author-${name}`,
    title: name,
    category: 'Musician',
    author: null,
    url: author?.websiteUrl || null,
    imageUrl: author?.imageUrl || null,
    summary: author?.bio || null,
    notes: null,
    curated: true,
    done: false,
    savedAt: 0,
    folderId: null,
  };
}

// Finds already-known Music Album items for an artist — personal saves plus curated entries —
// for the Albums accordion in the Musician quick-preview modal. Mirrors the same two lookups
// getFilteredSortedItems() already does for the author:Musician:<name> full-page view.
function getKnownAlbumsForArtist(name) {
  const personal = state.items.filter(i => i.category === 'Music Album' && i.author === name);
  const existingIds = new Set(personal.map(i => i.id));
  const curated = [];
  for (const genre of Object.keys(CURATED_ITEMS)) {
    (CURATED_ITEMS[genre]['Music Album'] || [])
      .filter(i => i.notes === name && !state.hiddenCurated.has(i.id) && !existingIds.has(i.id))
      .forEach(i => {
        const override = state.curatedOverrides[i.id] || {};
        curated.push({ ...i, ...override, category: 'Music Album', curated: true, done: false, savedAt: 0, folderId: null });
      });
  }
  return [...personal, ...curated];
}

// Wires clicks on card artist-name links: normally navigates to the author's page, but for
// the "open artist modal" variant (used on the artist's own album page) it opens the quick
// preview modal instead, since navigating to the page already open wouldn't make sense.
function wireCardAuthorLinks(container) {
  container.querySelectorAll('.card-author-link').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      if (btn.classList.contains('card-open-artist-modal')) {
        openDetailModal(resolveMusicianItem(btn.dataset.artist));
      } else {
        navigateToAuthor(btn.dataset.author, btn.dataset.category);
      }
    });
  });
}

// ===== HELPERS =====
function catClass(cat) { return (cat || '').replace(/\s+/g, '-'); }

// Shorter display text for category badges (the underlying category value is unchanged).
function badgeLabel(cat) { return cat === 'Music Album' ? 'Album' : cat; }

// True when browsing the dedicated "Music Albums" section (the Musicians > Music Albums
// sidebar subfolder, personal or curated) — artist names aren't clickable links there.
function isMusicAlbumsSectionView() {
  return state.view === 'Music Album' || (state.view.startsWith('genre:') && state.view.endsWith(':Music Album'));
}

// True when viewing a musician's own author page and this is one of their own works —
// the author-name link would just point back to the page already open, so it isn't a link there.
function isOwnAuthorPageView(authorName) {
  if (!state.view.startsWith('author:')) return false;
  const rest = state.view.slice(7);
  const name = rest.slice(rest.indexOf(':') + 1);
  return name === authorName;
}

function getDomain(url) {
  try { return new URL(url).hostname.replace('www.', ''); }
  catch { return url; }
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getFilteredSortedItems() {
  let items = [...state.items];

  // View filter
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
function renderSidebar() {
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
        if (opt === 'curated') {
          state.sidebarMode = 'curated'; state.view = 'curated';
        } else if (opt === 'sponsored') {
          state.sidebarMode = 'sponsored'; state.view = 'sponsored';
        } else {
          state.sidebarMode = 'categories'; state.view = 'all';
        }
        persistViewState();
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
            <span class="sidebar-label"><span class="cat-icon">${GENRE_EMOJI[genre] || '📁'}</span> ${escapeHtml(genre)}</span>
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
        <span class="sidebar-label"><span class="cat-icon">${CAT_EMOJI[cat]}</span> ${CAT_LABEL[cat] || cat}</span>
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

  // Add-folder
  sidebar.querySelectorAll('[data-add-folder]').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      promptAddFolder(el.dataset.addFolder);
    });
  });

  // Delete-folder
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

// ===== KANBAN BOARD =====
const KANBAN_COLUMNS = [
  { key: 'in-queue',     label: 'QUEUE' },
  { key: 'in-progress',  label: 'IN PROGRESS' },
  { key: 'my-review',    label: 'MY NOTES' },
  { key: 'done',         label: 'ARCHIVE' },
];

let _demoStatus = 'in-queue';
let _kanbanSortListenerAdded = false;
const KANBAN_DEMO = () => ({
  id: '__demo__',
  title: 'Drag to progress',
  category: 'Books',
  imageUrl: null,
  queueStatus: _demoStatus,
  _isDemo: true,
});

function renderKanbanCard(item) {
  const letter    = (item.title || '?')[0].toUpperCase();
  const thumb     = item.imageUrl
    ? `<img class="kcard-thumb" src="${escapeHtml(item.imageUrl)}" alt="" onerror="this.style.display='none'">`
    : `<div class="kcard-thumb kcard-thumb--placeholder placeholder-${catClass(item.category)}">${letter}</div>`;

  const demoTag   = item._isDemo ? `<span class="kcard-demo-badge">DEMO</span>` : '';
  const removeBtn = !item._isDemo
    ? `<button class="kcard-remove" data-id="${item.id}" title="Remove from board">✕</button>` : '';

  return `
    <div class="kcard${item._isDemo ? ' kcard--demo' : ''}" data-id="${item.id}" draggable="true"${item._isDemo ? ' title="Open any item and tap \'Add to Queue\' to add it here"' : ''}>
      ${thumb}
      <div class="kcard-content">
        <div class="kcard-info">
          ${demoTag}
          <div class="kcard-title">${escapeHtml(item.title || '?')}</div>
          ${item.author ? `<div class="kcard-author">${escapeHtml(item.author)}</div>` : ''}
        </div>
        ${removeBtn}
      </div>
      <span class="kcard-badge badge-${catClass(item.category)}">${badgeLabel(item.category)}</span>
    </div>`;
}

function renderBoardFilterDropdown() {
  const dd = document.getElementById('board-filter-dropdown');
  if (!dd) return;
  const labelEl = document.getElementById('board-filter-label');
  if (labelEl) labelEl.textContent = state.kanbanCategory ? state.kanbanCategory.toUpperCase() : 'CATEGORIES';

  const allOption = `<button class="saves-list-option${!state.kanbanCategory ? ' active' : ''}" data-cat="">All Categories</button>`;
  const catOptions = CATEGORIES.map(cat =>
    `<button class="saves-list-option${state.kanbanCategory === cat ? ' active' : ''}" data-cat="${cat}">${cat}</button>`
  ).join('');
  dd.innerHTML = allOption + `<div class="saves-list-divider"></div>` + catOptions;

  dd.querySelectorAll('.saves-list-option').forEach(opt => {
    opt.addEventListener('click', e => {
      e.stopPropagation();
      state.kanbanCategory = opt.dataset.cat || null;
      dd.setAttribute('hidden', '');
      renderKanbanBoard();
    });
  });
}

function renderSavesListDropdown() {
  const dd = document.getElementById('saves-list-dropdown');
  if (!dd) return;
  const activeList = state.kanbanLists.find(l => l.id === state.activeListId);
  const activeLabel = activeList ? activeList.name : 'All Queues';
  const labelEl = document.getElementById('saves-list-label');
  if (labelEl) labelEl.textContent = activeLabel.toUpperCase();

  const allOption = `<button class="saves-list-option${!state.activeListId ? ' active' : ''}" data-list="">All Queues</button>`;
  const listOptions = state.kanbanLists.map(l =>
    `<button class="saves-list-option${state.activeListId === l.id ? ' active' : ''}" data-list="${l.id}">${l.name}</button>`
  ).join('');
  dd.innerHTML = allOption + listOptions
    + `<div class="saves-list-divider"></div>`
    + `<button class="saves-list-option saves-list-add" id="btn-add-new-list">+ Add list</button>`;

  dd.querySelectorAll('.saves-list-option:not(.saves-list-add)').forEach(opt => {
    opt.addEventListener('click', e => {
      e.stopPropagation();
      state.activeListId = opt.dataset.list || null;
      dd.setAttribute('hidden', '');
      renderKanbanBoard();
    });
  });

  document.getElementById('btn-add-new-list')?.addEventListener('click', e => {
    e.stopPropagation();
    dd.innerHTML = `
      <div class="saves-list-new-wrap" id="saves-list-new-wrap">
        <input class="saves-list-new-input" id="saves-list-new-input" placeholder="List name…" maxlength="40" autofocus>
        <button class="saves-list-new-confirm" id="saves-list-new-confirm">Create</button>
        <button class="saves-list-new-cancel" id="saves-list-new-cancel">✕</button>
      </div>`;
    dd.querySelector('.saves-list-new-wrap')?.addEventListener('click', ev => ev.stopPropagation());
    const input = document.getElementById('saves-list-new-input');
    input?.focus();
    const cancelList = () => { renderSavesListDropdown(); };
    const createList = () => {
      const name = input?.value.trim();
      if (!name) { cancelList(); return; }
      const id = 'list-' + Date.now();
      state.kanbanLists.push({ id, name });
      chrome.storage.sync.set({ savecraft_kanban_lists: state.kanbanLists });
      state.activeListId = id;
      dd.setAttribute('hidden', '');
      renderKanbanBoard();
    };
    document.getElementById('saves-list-new-confirm')?.addEventListener('click', createList);
    document.getElementById('saves-list-new-cancel')?.addEventListener('click', e => { e.stopPropagation(); cancelList(); });
    input?.addEventListener('keydown', ev => { if (ev.key === 'Enter') createList(); if (ev.key === 'Escape') cancelList(); });
  });
}

function renderKanbanBoard() {
  const container = document.getElementById('cards-grid');
  const gridTitle = document.getElementById('grid-title');
  gridTitle.textContent = '';
  gridTitle.style.display = 'none';
  container.className = 'kanban-wrap';

  renderSavesListDropdown();
  renderBoardFilterDropdown();
  document.getElementById('saves-list-wrap').style.display = '';
  document.getElementById('board-filter-wrap').style.display = '';
  document.getElementById('board-info-wrap').style.display = '';
  document.getElementById('sort-select').style.display = 'none';

  let queueItems = state.items.filter(i => i.queueStatus);
  if (state.kanbanCategory) {
    queueItems = queueItems.filter(i => i.category === state.kanbanCategory);
  }
  if (state.activeListId) {
    queueItems = queueItems.filter(i => {
      const ids = Array.isArray(i.listIds) ? i.listIds : (i.listId ? [i.listId] : []);
      return ids.includes(state.activeListId);
    });
  }
  const isSearching = !!state.search;
  if (isSearching) {
    const q = state.search.toLowerCase();
    queueItems = queueItems.filter(i =>
      (i.title || '').toLowerCase().includes(q) ||
      (i.url   || '').toLowerCase().includes(q)
    );
  }

  const useDemo = queueItems.length === 0 && !isSearching && state.items.filter(i => i.queueStatus).length === 0;
  const allItems = useDemo ? [KANBAN_DEMO()] : queueItems;

  document.getElementById('sort-select').style.display = 'none';

  function sortCards(cards, colKey) {
    const s = state.kanbanSort[colKey] || 'newest';
    const c = [...cards];
    switch (s) {
      case 'newest': return c.sort((a, b) => b.savedAt - a.savedAt);
      case 'oldest': return c.sort((a, b) => a.savedAt - b.savedAt);
      case 'az':     return c.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      case 'za':     return c.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
      default: return c;
    }
  }

  const SORT_LABELS = { newest: 'Newest first', oldest: 'Oldest first', az: 'A → Z', za: 'Z → A' };

  if (isSearching && allItems.length === 0) {
    container.innerHTML = `
      <div class="kanban-board">
        <div class="kanban-no-results">🔍 No results for "<strong>${escapeHtml(state.search)}</strong>"</div>
      </div>`;
  } else {
    container.innerHTML = `<div class="kanban-board">` + KANBAN_COLUMNS.map(col => {
      const cards = sortCards(allItems.filter(i => i.queueStatus === col.key), col.key);
      const currentSort = state.kanbanSort[col.key] || 'newest';
      return `
        <div class="kanban-column">
          <div class="kanban-column-title">
            ${col.label}
            <button class="kanban-sort-btn" data-col="${col.key}" title="Sort ${col.label}">
              <svg width="10" height="10" viewBox="0 0 10 6" fill="currentColor"><path d="M0 0l5 6 5-6z"/></svg>
            </button>
            <div class="kanban-sort-dropdown" data-col="${col.key}" hidden>
              ${Object.entries(SORT_LABELS).map(([k, label]) =>
                `<button class="kanban-sort-option${k === currentSort ? ' active' : ''}" data-col="${col.key}" data-sort="${k}">${label}</button>`
              ).join('')}
            </div>
          </div>
          <div class="kanban-cards" data-col="${col.key}">
            ${cards.map(renderKanbanCard).join('') || (() => {
              const hints = { 'in-progress': 'Drag cards to progress', 'my-review': 'Drag cards to my notes', 'done': 'Drag cards to archive' };
              return hints[col.key] ? `<div class="progress-drop-hint">${hints[col.key]}</div>` : '<div class="kanban-empty"></div>';
            })()}
          </div>
        </div>`;
    }).join('') + `</div>`;
  }

  if (!state.tutorialSeen) {
    document.getElementById('board-info-popup').removeAttribute('hidden');
    state.tutorialSeen = true;
    chrome.storage.sync.set({ savecraft_tutorial_seen: true });
  }

  persistViewState();

  const board = container.querySelector('.kanban-board') || container;

  board.querySelectorAll('.kanban-sort-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const col = btn.dataset.col;
      const dropdown = board.querySelector(`.kanban-sort-dropdown[data-col="${col}"]`);
      const isOpen = !dropdown.hidden;
      board.querySelectorAll('.kanban-sort-dropdown').forEach(d => d.setAttribute('hidden', ''));
      if (!isOpen) dropdown.removeAttribute('hidden');
    });
  });
  board.querySelectorAll('.kanban-sort-option').forEach(opt => {
    opt.addEventListener('click', async e => {
      e.stopPropagation();
      const { col, sort } = opt.dataset;
      state.kanbanSort[col] = sort;
      chrome.storage.sync.set({ savecraft_kanban_sort: state.kanbanSort });
      renderKanbanBoard();
    });
  });
  if (!_kanbanSortListenerAdded) {
    _kanbanSortListenerAdded = true;
    document.addEventListener('click', () => {
      document.querySelectorAll('.kanban-sort-dropdown').forEach(d => d.setAttribute('hidden', ''));
    });
  }

  board.querySelectorAll('.kcard').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('.kcard-remove')) return;
      const id = card.dataset.id;
      if (id === '__demo__') return;
      const item = state.items.find(i => i.id === id);
      if (item) openDetailModal(item);
    });
  });

  board.querySelectorAll('.kcard-remove').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const item = state.items.find(i => i.id === id);
      if (!item) return;
      item.queueStatus = null;
      await persistItem(item);
      renderKanbanBoard();
    });
  });

  let dragId = null;
  board.querySelectorAll('.kcard').forEach(card => {
    card.addEventListener('dragstart', e => {
      dragId = card.dataset.id;
      card.classList.add('kcard--dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('kcard--dragging');
      board.querySelectorAll('.kanban-column').forEach(col => col.classList.remove('kanban-column--over'));
    });
  });

  board.querySelectorAll('.kanban-cards').forEach(col => {
    col.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      col.closest('.kanban-column').classList.add('kanban-column--over');
      const hint = col.querySelector('.progress-drop-hint');
      if (hint) hint.style.opacity = '0';
    });
    col.addEventListener('dragleave', e => {
      if (!col.contains(e.relatedTarget)) {
        col.closest('.kanban-column').classList.remove('kanban-column--over');
        const hint = col.querySelector('.progress-drop-hint');
        if (hint) hint.style.opacity = '';
      }
    });
    col.addEventListener('drop', async e => {
      e.preventDefault();
      col.closest('.kanban-column').classList.remove('kanban-column--over');
      if (!dragId) return;
      const newStatus = col.dataset.col;
      if (dragId === '__demo__') { _demoStatus = newStatus; dragId = null; renderKanbanBoard(); }
      else { await updateQueueStatus(dragId, newStatus); dragId = null; }
    });
  });
}

async function updateQueueStatus(id, newStatus) {
  const item = state.items.find(i => i.id === id);
  if (!item) return;
  item.queueStatus = newStatus;
  await persistItem(item);
  renderKanbanBoard();
}

// ===== GRID =====
function renderGrid() {
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

  if (state.view === 'kanban') {
    renderKanbanBoard();
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
    if (state.view === 'genre:Top 100:Music' || state.view === 'genre:Top 100:Shows') {
      const label = state.view === 'genre:Top 100:Music' ? 'Top 100 Music' : 'Top 100 Shows';
      gridTitle.innerHTML = `${label} <span class="rs-logo-wrap" title="As selected by Rolling Stone"><img src="${chrome.runtime.getURL('app/rs-logo.png')}" class="rs-logo-img" alt="Rolling Stone"></span>`;
    } else if (state.view === 'genre:Top 100:Games') {
      gridTitle.innerHTML = `Top 100 Games <span class="steam-logo-wrap" title="Most played on Steam"><img src="${chrome.runtime.getURL('app/steam-logo.png')}" class="steam-logo-img" alt="Steam"></span>`;
    } else if (state.view === 'genre:Top 100:Movies' || state.view === 'genre:Top 100:Books') {
      const catLabel = state.view === 'genre:Top 100:Movies' ? 'Top 100 Movies' : 'Top 100 Books';
      gridTitle.innerHTML = `${catLabel} <span class="nyt-logo-wrap" title="As selected by The New York Times"><svg viewBox="0 0 452.8 59.5" xmlns="http://www.w3.org/2000/svg" aria-label="The New York Times"><path d="M33.9,6.1c0-4.9-4.7-6.1-8.4-6.1v0.7c2.2,0,3.9,0.7,3.9,2.5c0,1-0.7,2.5-3,2.5c-1.7,0-5.4-1-8.1-2c-3.2-1.2-6.1-2.2-8.6-2.2c-4.9,0-8.4,3.7-8.4,7.9c0,3.7,2.7,4.9,3.7,5.4l0.2-0.5c-0.5-0.5-1.2-1-1.2-2.5c0-1,1-2.7,3.4-2.7c2.2,0,5.2,1,9.1,2.2c3.4,1,7.1,1.7,9.1,2v7.6l-3.7,3.2v0.2l3.7,3.2v10.6c-2,1.2-4.2,1.5-6.1,1.5c-3.7,0-6.9-1-9.6-3.9l10.1-4.9v-17L7.9,19.2c1-3.2,3.7-5.4,6.4-6.9L14,11.6c-7.4,2-14,8.9-14,17.2C0,38.6,8.1,46,17.2,46c9.8,0,16.2-7.9,16.2-16H33c-1.5,3.2-3.7,6.1-6.4,7.6V27.5l3.9-3.2v-0.2l-3.9-3.2v-7.6C30.3,13.3,33.9,10.8,33.9,6.1z M12.5,33.2l-3,1.5c-1.7-2.2-2.7-5.2-2.7-9.3c0-1.7,0-3.7,0.5-5.2l5.2-2.2V33.2z M38.6,38.9l-3.2,2.5l0.5,0.5l1.5-1.2l5.4,4.9l7.4-4.9l-0.2-0.5l-2,1.2l-2.5-2.5V22.1l2-1.5l4.2,3.4v15c0,9.3-2,10.8-6.1,12.3v0.7c6.9,0.2,13.3-2,13.3-14V21.9l2.2-1.7l-0.5-0.5l-2,1.5L52.4,16l-6.9,5.2V1H45l-8.6,5.9v0.5c1,0.5,2.5,1,2.5,3.7C38.9,11.1,38.6,38.9,38.6,38.9z M83.6,36.2l-6.1,4.7l-6.1-4.9v-3l11.6-7.9v-0.2L77,16l-12.8,6.9v16.2l-2.5,2l0.5,0.5l2.2-1.7l8.4,6.1l11.1-8.9C83.9,37.1,83.6,36.2,83.6,36.2z M71.3,32V19.9l0.5-0.2l5.4,8.6C77.2,28.3,71.3,32,71.3,32z M130.6,3.9c0-0.7-0.2-1.5-0.5-2.2h-0.5c-0.7,2-1.7,3-4.2,3c-2.2,0-3.7-1.2-4.7-2.2l-7.1,8.1l0.5,0.5l2.5-2.2c1.5,1.2,2.7,2.2,6.1,2.5v20.4L108.2,6.9c-1.2-2-3-4.7-6.4-4.7c-3.9,0-7.4,3.4-6.9,8.9h0.7c0.2-1.5,1-3.2,2.7-3.2c1.2,0,2.5,1.2,3.2,2.5v8.1c-4.4,0-7.4,2-7.4,5.7c0,2,1,4.9,3.9,5.7v-0.5c-0.5-0.5-0.7-1-0.7-1.7c0-1.2,1-2.2,2.7-2.2h1.2v10.3c-5.2,0-9.3,3-9.3,7.9c0,4.7,3.9,6.9,8.4,6.6v-0.5c-2.7-0.2-3.9-1.5-3.9-3.2c0-2.2,1.5-3.2,3.4-3.2c2,0,3.7,1.2,4.9,2.7l7.1-7.9l-0.5-0.5l-1.7,2c-2.7-2.5-4.2-3.2-7.4-3.7V11.3L122,45.7h1.5V11.3C127.1,11.1,130.6,8.1,130.6,3.9z M148.5,36.2l-6.1,4.7l-6.1-4.9v-3l11.6-7.9v-0.2l-5.9-8.9l-12.8,6.9v16.2l-2.5,2l0.5,0.5l2.2-1.7l8.4,6.1l11.1-8.9C148.8,37.1,148.5,36.2,148.5,36.2z M136.2,32V19.9l0.5-0.2l5.4,8.6C142.2,28.3,136.2,32,136.2,32z M188.6,18.7l-1.7,1.2l-4.7-3.9l-5.4,4.9l2.2,2.2v18.4l-5.9-3.7V22.6l2-1.2l-5.7-5.4l-5.4,4.9l2.2,2.2v17.7l-0.7,0.5l-5.2-3.7V22.9c0-3.4-1.7-4.4-3.7-5.7c-1.7-1.2-2.7-2-2.7-3.7c0-1.5,1.5-2.2,2.2-2.7v-0.5c-2,0-7.1,2-7.1,6.6c0,2.5,1.2,3.4,2.5,4.7c1.2,1.2,2.5,2.2,2.5,4.4v14.3l-2.7,2l0.5,0.5l2.5-2l5.7,4.9l6.1-4.2l6.9,4.2l13-7.6V21.6l3.2-2.5L188.6,18.7L188.6,18.7z M234.4,5.2l-2.5,2.2l-5.4-4.9l-8.1,5.9V3h-0.7l0.2,39.8c-0.7,0-3-0.5-4.7-1l-0.5-33.2c0-2.5-1.7-5.9-6.1-5.9s-7.4,3.4-7.4,6.9h0.7c0.2-1.5,1-2.7,2.5-2.7c1.5,0,2.7,1,2.7,4.2v9.6c-4.4,0.2-7.1,2.7-7.1,5.9c0,2,1,4.9,3.9,4.9V31c-1-0.5-1.2-1.2-1.2-1.7c0-1.5,1.2-2,3.2-2h1v15.2c-3.7,1.2-5.2,3.9-5.2,6.9c0,4.2,3.2,7.1,8.1,7.1c3.4,0,6.4-0.5,9.3-1.2c2.5-0.5,5.7-1.2,7.1-1.2c2,0,2.7,1,2.7,2.2c0,1.7-0.7,2.5-1.7,2.7v0.5c3.9-0.7,6.4-3.2,6.4-6.9s-3.7-5.9-7.6-5.9c-2,0-6.1,0.7-9.1,1.2c-3.4,0.7-6.9,1.2-7.9,1.2c-1.7,0-3.7-0.7-3.7-3.2c0-2,1.7-3.7,5.9-3.7c2.2,0,4.9,0.2,7.6,1c3,0.7,5.7,1.5,8.1,1.5c3.7,0,6.9-1.2,6.9-6.4V8.1l3-2.5L234.4,5.2L234.4,5.2z M224.3,20.2c-0.7,0.7-1.7,1.5-3,1.5s-2.5-0.7-3-1.5V9.3l2.5-1.7l3.4,3.2C224.3,10.8,224.3,20.2,224.3,20.2z M224.3,27.5c-0.5-0.5-1.7-1.2-3-1.2s-2.5,0.7-3,1.2v-6.4c0.5,0.5,1.7,1.2,3,1.2s2.5-0.7,3-1.2V27.5z M224.3,39.1c0,2-1.2,3.9-3.9,3.9h-2V28.5c0.5-0.5,1.7-1.2,3-1.2s2.2,0.7,3,1.2C224.3,28.5,224.3,39.1,224.3,39.1z M258,21.6l-7.9-5.7l-12.1,6.9v16l-2.5,2l0.2,0.5l2-1.5l7.9,5.9l12.3-7.4C258,38.4,258,21.6,258,21.6z M244.7,37.1V19.4l6.1,4.4v17.5C250.9,41.3,244.7,37.1,244.7,37.1z M281.4,16.5h-0.5c-0.7,0.5-1.5,1-2.2,1c-1,0-2.2-0.5-2.7-1.2h-0.5l-4.2,4.7l-4.2-4.7l-7.4,4.9l0.2,0.5l2-1.2l2.5,2.7v15.5l-3.2,2.5l0.5,0.5l1.5-1.2l5.9,4.9l7.6-5.2l-0.2-0.5l-2.2,1.2l-3-2.5V21.2c1.2,1.2,2.7,2.5,4.4,2.5C279.1,23.9,281.1,20.4,281.4,16.5L281.4,16.5z M310.9,40.1l-8.4,5.7l-11.3-17.2l8.1-12.5h0.5c1,1,2.5,2,4.2,2c1.7,0,3-1,3.7-2h0.5c-0.2,4.9-3.7,7.9-6.1,7.9c-2.5,0-3.7-1.2-5.2-2l-0.7,1.2l12.3,18.2l2.5-1.5V40.1z M283.8,38.9l-3.2,2.5l0.5,0.5l1.5-1.2l5.4,4.9l7.4-4.9l-0.5-0.5l-2,1.2l-2.5-2.5V1h-0.2l-8.9,5.9v0.5c1,0.5,2.5,0.7,2.5,3.7C283.8,11.1,283.8,38.9,283.8,38.9z M351.7,6.1c0-4.9-4.7-6.1-8.4-6.1v0.7c2.2,0,3.9,0.7,3.9,2.5c0,1-0.7,2.5-3,2.5c-1.7,0-5.4-1-8.1-2c-3.2-1-6.1-2-8.6-2c-4.9,0-8.4,3.7-8.4,7.9c0,3.7,2.7,4.9,3.7,5.4l0.2-0.5c-0.7-0.5-1.5-1-1.5-2.5c0-1,1-2.7,3.4-2.7c2.2,0,5.2,1,9.1,2.2c3.4,1,7.1,1.7,9.1,2v7.6l-3.7,3.2v0.2l3.7,3.2v10.6c-2,1.2-4.2,1.5-6.1,1.5c-3.7,0-6.9-1-9.6-3.9l10.1-4.9V13.8l-12.3,5.4c1.2-3.2,3.9-5.4,6.4-7.1l-0.2-0.5c-7.4,2-14,8.6-14,17c0,9.8,8.1,17.2,17.2,17.2c9.8,0,16.2-7.9,16.2-16h-0.5c-1.5,3.2-3.7,6.1-6.4,7.6V27.3l3.9-3.2v-0.2l-3.7-3.2v-7.4C348,13.3,351.7,10.8,351.7,6.1z M330.3,33.2l-3,1.5c-1.7-2.2-2.7-5.2-2.7-9.3c0-1.7,0.2-3.7,0.7-5.2l5.2-2.2L330.3,33.2z M360.3,3.7H360l-4.9,4.2v0.2l4.2,4.7h0.5l4.9-4.2V8.4L360.3,3.7L360.3,3.7z M367.7,40.1l-2,1.2l-2.5-2.5v-17l2.5-1.7l-0.5-0.5l-1.7,1.5l-4.4-5.2l-7.1,4.9l0.5,0.7l1.7-1.2l2.2,2.7v16l-3.2,2.5l0.2,0.5l1.7-1.2l5.4,4.9l7.4-4.9L367.7,40.1L367.7,40.1z M408.7,39.8l-1.7,1.2l-2.7-2.5V21.9l2.5-2l-0.5-0.5l-2,1.7l-5.7-5.2l-7.4,5.2l-5.7-5.2l-6.9,5.2l-4.4-5.2l-7.1,4.9l0.2,0.7l1.7-1.2l2.5,2.7v16l-2,2l5.7,4.7l5.4-4.9l-2.2-2.2V21.9l2.2-1.5l3.7,3.4v14.8l-2,2l5.7,4.7l5.4-4.9l-2.2-2.2V21.9l2-1.2l3.9,3.4v14.8l-1.7,1.7l5.7,5.2l7.6-5.2L408.7,39.8L408.7,39.8z M430.1,36.2l-6.1,4.7l-6.1-4.9v-3l11.6-7.9v-0.2l-5.9-8.9l-12.8,6.9v16.7l8.6,6.1l11.1-8.9C430.4,36.9,430.1,36.2,430.1,36.2z M417.8,32V19.9l0.5-0.2l5.4,8.6C423.7,28.3,417.8,32,417.8,32z M452.5,29.8l-4.7-3.7c3.2-2.7,4.4-6.4,4.4-8.9v-1.5h-0.5c-0.5,1.2-1.5,2.5-3.4,2.5c-2,0-3.2-1-4.4-2.5l-11.1,6.1v8.9l4.2,3.2c-4.2,3.7-4.9,6.1-4.9,8.1c0,2.5,1.2,4.2,3.2,4.9l0.2-0.5c-0.5-0.5-1-0.7-1-2c0-0.7,1-2,3-2c2.5,0,3.9,1.7,4.7,2.5l10.6-6.4v-8.9C452.8,29.8,452.5,29.8,452.5,29.8z M449.8,22.4c-1.7,3-5.4,5.9-7.6,7.4l-2.7-2.2v-8.6c1,2.5,3.7,4.4,6.4,4.4C447.6,23.4,448.6,23.1,449.8,22.4z M445.6,42.1c-1.2-2.7-4.2-4.7-7.1-4.7c-0.7,0-2.7,0-4.7,1.2c1.2-2,4.4-5.4,8.6-7.9l3,2.5L445.6,42.1L445.6,42.1z"/></svg></span>`;
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

  // Save curated item to personal My Saves
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

const _albumYearBackfillAttempted = new Set();
async function backfillAlbumYears(artistName, items) {
  const key = artistName.trim().toLowerCase();
  if (_albumYearBackfillAttempted.has(key)) return;
  // Also backfills collectionId (needed for the Song List accordion's iTunes track lookup) —
  // reuses this same per-artist iTunes search rather than adding a second network pass.
  const missing = items.filter(i => i.category === 'Music Album' && (!i.year || !i.collectionId));
  if (missing.length === 0) return;
  _albumYearBackfillAttempted.add(key);
  let albums;
  try {
    albums = await fetchAlbumsFromItunes(artistName);
  } catch {
    return;
  }
  let changed = false;
  for (const merged of missing) {
    const match = albums.find(a => a.title === merged.title) || albums.find(a => a.title.toLowerCase() === merged.title.toLowerCase());
    if (!match?.year && !match?.collectionId) continue;
    if (merged.curated) {
      const meta = state.curatedAlbumMetaCache[merged.id] || {};
      if (match.year) meta.year = match.year;
      if (match.collectionId) meta.collectionId = match.collectionId;
      state.curatedAlbumMetaCache[merged.id] = meta;
      persistCuratedAlbumMetaCache();
    } else {
      const liveItem = state.items.find(i => i.id === merged.id);
      if (liveItem) {
        if (match.year) liveItem.year = match.year;
        if (match.collectionId) liveItem.collectionId = match.collectionId;
        await persistItem(liveItem);
      }
    }
    changed = true;
  }
  if (changed && state.view === `author:Musician:${artistName}`) renderAuthorPage();
}

// Resolves an iTunes collectionId for a Music Album item so its track list can be looked up.
// Prefers whatever the year/collectionId backfill already found; falls back to a fresh
// per-item iTunes search (so Song List still works even if the artist's author page — where
// the bulk backfill runs — was never visited), persisting the result once found.
async function resolveAlbumCollectionId(item) {
  if (item.collectionId) return item.collectionId;
  if (item.curated && state.curatedAlbumMetaCache[item.id]?.collectionId) {
    return state.curatedAlbumMetaCache[item.id].collectionId;
  }
  const artistName = item.author || (item.curated ? item.notes : null);
  if (!artistName || !item.title) return null;
  let albums;
  try {
    albums = await fetchAlbumsFromItunes(artistName);
  } catch {
    return null;
  }
  const match = albums.find(a => a.title === item.title) || albums.find(a => a.title.toLowerCase() === item.title.toLowerCase());
  if (!match?.collectionId) return null;
  if (item.curated) {
    const meta = state.curatedAlbumMetaCache[item.id] || {};
    meta.collectionId = match.collectionId;
    if (match.year && !meta.year) meta.year = match.year;
    state.curatedAlbumMetaCache[item.id] = meta;
    persistCuratedAlbumMetaCache();
  } else {
    const liveItem = state.items.find(i => i.id === item.id);
    if (liveItem) {
      liveItem.collectionId = match.collectionId;
      await persistItem(liveItem);
    }
  }
  return match.collectionId;
}

// Fetches (and caches forever, since track lists don't change) an album's track list via the
// iTunes lookup endpoint. Returns null if no collectionId could be resolved or the lookup fails.
async function ensureAlbumTrackList(item) {
  const collectionId = await resolveAlbumCollectionId(item);
  if (!collectionId) return null;
  const cached = state.albumTrackListCache[collectionId];
  if (cached) return cached.tracks;
  try {
    const resp = await fetch(`https://itunes.apple.com/lookup?id=${collectionId}&entity=song`);
    if (!resp.ok) return null;
    const data = await resp.json();
    const tracks = data.results
      .filter(r => r.wrapperType === 'track')
      .map(r => ({ number: r.trackNumber, title: r.trackName, durationMs: r.trackTimeMillis }))
      .sort((a, b) => (a.number || 0) - (b.number || 0));
    state.albumTrackListCache[collectionId] = { tracks, fetchedAt: Date.now() };
    persistAlbumTrackListCache();
    return tracks;
  } catch {
    return null;
  }
}

function formatTrackDuration(ms) {
  if (!ms) return '';
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function renderAuthorPage() {
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
    ? `<img class="author-page-photo" src="${escapeHtml(author.imageUrl)}" alt=""
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

function renderCard(item) {
  const domain = getDomain(item.url);
  const letter = domain[0]?.toUpperCase() || '?';
  const folder = item.folderId ? state.folders.find(f => f.id === item.folderId) : null;

  const imageSection = item.imageUrl
    ? `<img class="card-image" src="${escapeHtml(item.imageUrl)}" alt=""
            onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
       <div class="card-placeholder placeholder-${catClass(item.category)}" style="display:none;">${letter}</div>`
    : `<div class="card-placeholder placeholder-${catClass(item.category)}">${letter}</div>`;

  const folderLabel = folder
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
function promptAddFolder(category) {
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

// ===== ADD ITEM MODAL =====
function updatePlatformSummary() {
  const count = document.querySelectorAll('#platform-chips input:checked').length;
  document.getElementById('platform-summary-text').textContent =
    count === 0 ? 'No platforms selected' : `${count} platform${count === 1 ? '' : 's'} selected`;
}

function updatePlatformsSection(cat) {
  const section = document.getElementById('platforms-section');
  const config = CATEGORY_PLATFORMS[cat];
  if (!config) { section.style.display = 'none'; return; }

  document.getElementById('platforms-label-text').textContent = config.label;
  const list = document.getElementById('platform-chips');
  list.innerHTML = config.platforms.map(p =>
    `<label class="platform-option"><input type="checkbox" value="${p.id}" checked> ${p.name}</label>`
  ).join('');
  document.getElementById('platform-dropdown').open = false;
  section.style.display = '';
  updatePlatformSummary();
}

function setSelectedPlatforms(ids) {
  document.querySelectorAll('#platform-chips input[type="checkbox"]').forEach(cb => {
    cb.checked = ids.includes(cb.value);
  });
  updatePlatformSummary();
}

function getSelectedPlatforms() {
  return [...document.querySelectorAll('#platform-chips input:checked')].map(cb => cb.value);
}

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

async function handleAuthorItunesLookup() {
  const author   = document.getElementById('input-author').value.trim();
  const category = document.getElementById('modal-category').value;

  if (category !== 'Music Album' || author.length < 2) {
    hideItunesSuggestions();
    return;
  }

  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(author)}&entity=album&media=music&limit=15`;
    const resp = await fetch(url);
    const data = await resp.json();
    const lowerFirst = author.split(' ')[0].toLowerCase();
    const albums = data.results
      .filter(r => r.collectionType && r.artistName.toLowerCase().includes(lowerFirst))
      .filter(r => !/\s[-–]\s*(single|ep)\s*$/i.test(r.collectionName))
      .slice(0, 8)
      .map(r => ({
        title: r.collectionName,
        artist: r.artistName,
        imageUrl: r.artworkUrl100?.replace('100x100bb', '1200x1200bb') || null,
        url: r.collectionViewUrl || null,
        year: r.releaseDate?.slice(0, 4) || '',
      }));

    if (albums.length === 0) { hideItunesSuggestions(); return; }
    showItunesSuggestions(albums);
  } catch {
    hideItunesSuggestions();
  }
}

function showItunesSuggestions(albums) {
  const el = document.getElementById('itunes-suggestions');
  el.style.display = '';
  el.innerHTML = albums.map((a, i) => `
    <div class="itunes-suggestion-row" data-index="${i}">
      ${a.imageUrl
        ? `<img class="itunes-suggestion-art" src="${escapeHtml(a.imageUrl)}" alt=""
                onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
           <div class="itunes-suggestion-art itunes-suggestion-art-placeholder" style="display:none">♪</div>`
        : `<div class="itunes-suggestion-art itunes-suggestion-art-placeholder">♪</div>`}
      <div class="itunes-suggestion-info">
        <div class="itunes-suggestion-title">${escapeHtml(a.title)}</div>
        <div class="itunes-suggestion-meta">${escapeHtml(a.artist)}${a.year ? ` · ${a.year}` : ''}</div>
      </div>
    </div>`).join('');

  el.querySelectorAll('.itunes-suggestion-row').forEach(row => {
    row.addEventListener('mousedown', e => {
      e.preventDefault();
      applyItunesSuggestion(albums[parseInt(row.dataset.index)]);
    });
  });
}

function hideItunesSuggestions() {
  const el = document.getElementById('itunes-suggestions');
  if (el) { el.style.display = 'none'; el.innerHTML = ''; }
}

function applyItunesSuggestion(album) {
  const titleInput = document.getElementById('input-title');
  const imageInput = document.getElementById('input-image-url');
  const urlInput   = document.getElementById('input-url');
  if (!titleInput.value.trim()) titleInput.value = album.title;
  if (!imageInput.value.trim() && album.imageUrl) imageInput.value = album.imageUrl;
  if (!urlInput.value.trim() && album.url)         urlInput.value   = album.url;
  hideItunesSuggestions();
}

function openAddModal() {
  state.modalCategory = null;
  state.editingId = null;
  hideItunesSuggestions();
  document.getElementById('input-url').value = '';
  document.getElementById('input-title').value = '';
  document.getElementById('input-author').value = '';
  document.getElementById('input-summary').value = '';
  document.getElementById('input-notes').value = '';
  document.getElementById('input-image-url').value = '';
  updatePlatformsSection('');
  document.getElementById('modal-category').value = '';
  document.querySelector('#modal-overlay h2').innerHTML = `<svg class="modal-bookmark-icon" xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="M200-120v-640q0-33 23.5-56.5T280-840h400q33 0 56.5 23.5T760-760v640L480-240 200-120Z"/></svg>Add to SaveCraft`;
  document.getElementById('btn-modal-save').textContent = 'Save';
  document.getElementById('modal-overlay').classList.add('open');
  document.getElementById('input-url').focus();
}

function openEditModal(item) {
  state.editingId = item.id;
  document.getElementById('input-url').value = item.url || '';
  document.getElementById('input-title').value = item.title || '';
  document.getElementById('input-author').value = item.author || '';
  document.getElementById('input-summary').value = item.summary || '';
  document.getElementById('input-notes').value = item.notes || '';
  document.getElementById('input-image-url').value = item.imageUrl || '';
  document.getElementById('modal-category').value = item.category || '';
  updatePlatformsSection(item.category || '');
  if (item.platforms) setSelectedPlatforms(item.platforms);
  document.querySelector('#modal-overlay h2').innerHTML = `<svg class="modal-bookmark-icon" xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="M200-120v-640q0-33 23.5-56.5T280-840h400q33 0 56.5 23.5T760-760v640L480-240 200-120Z"/></svg>Edit Item`;
  document.getElementById('btn-modal-save').textContent = 'Update';

  document.getElementById('modal-overlay').classList.add('open');
  document.getElementById('input-title').focus();
}

function closeAddModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}

async function fetchAlbumsFromItunes(artistName) {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(artistName)}&entity=album&media=music&limit=200`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`iTunes API error: ${resp.status}`);
  const data = await resp.json();
  return data.results
    .filter(r => r.collectionType)
    .sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate))
    .map(r => ({
      title: r.collectionName,
      artist: r.artistName,
      year: r.releaseDate ? r.releaseDate.slice(0, 4) : '',
      imageUrl: r.artworkUrl100?.replace('100x100bb', '1200x1200bb') || null,
      url: r.collectionViewUrl || null,
      genre: r.primaryGenreName || null,
      type: r.collectionType,
      collectionId: r.collectionId || null,
    }));
}

function renderFetchAlbumsList(allAlbums, artistName, mode, hideSingles) {
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
          ? `<img class="fetch-album-art" src="${escapeHtml(album.imageUrl)}" alt=""
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

function openFetchAlbumsModal(artistName) {
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

function updateImportCount() {
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

function closeFetchAlbumsModal() {
  document.getElementById('fetch-albums-overlay').classList.remove('open');
}

async function handleImportAlbums() {
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

function openAuthorEditModal(name, category) {
  const author = findAuthor(name, category);
  document.getElementById('author-modal-name').textContent = name;
  document.getElementById('author-modal-category').textContent = category;
  document.getElementById('author-input-image').value   = author?.imageUrl   || '';
  document.getElementById('author-input-bio').value     = author?.bio        || '';
  document.getElementById('author-input-website').value = author?.websiteUrl || '';
  document.getElementById('author-website-status').textContent = '';
  const findBtn = document.getElementById('btn-find-website');
  findBtn.style.display = category === 'Musician' ? '' : 'none';
  findBtn.disabled = false;
  findBtn.textContent = 'Find website';
  document.getElementById('author-modal-overlay').classList.add('open');
  document.getElementById('author-input-bio').focus();
}

async function handleFindWebsite() {
  const name = document.getElementById('author-modal-name').textContent;
  const btn = document.getElementById('btn-find-website');
  const status = document.getElementById('author-website-status');
  btn.disabled = true;
  btn.textContent = 'Searching…';
  status.textContent = 'Searching MusicBrainz…';
  const url = await fetchArtistWebsite(name); // bypass cache — this is an explicit user-initiated retry
  const key = name.trim().toLowerCase();
  state.artistWebsiteCache[key] = { url, fetchedAt: Date.now() };
  persistArtistWebsiteCache();
  btn.disabled = false;
  btn.textContent = 'Find website';
  if (url) {
    document.getElementById('author-input-website').value = url;
    status.textContent = 'Found';
  } else {
    status.textContent = 'No official site found — enter manually';
  }
}

function closeAuthorEditModal() {
  document.getElementById('author-modal-overlay').classList.remove('open');
}

async function handleSaveAuthor() {
  const name     = document.getElementById('author-modal-name').textContent;
  const category = document.getElementById('author-modal-category').textContent;
  const imageUrl   = document.getElementById('author-input-image').value.trim()   || null;
  const bio        = document.getElementById('author-input-bio').value.trim()       || null;
  const websiteUrl = document.getElementById('author-input-website').value.trim()  || null;

  let author = findAuthor(name, category);
  if (!author) {
    author = { id: Date.now().toString(), name, category, savedAt: Date.now() };
    state.authors.push(author);
  }
  author.imageUrl   = imageUrl;
  author.bio        = bio;
  author.websiteUrl = websiteUrl;

  await persistAuthor(author);
  closeAuthorEditModal();
  if (state.view.startsWith('author:')) renderGrid();
}

let _detailItem = null;

function openDetailModal(item) {
  document.body.style.overflow = 'hidden'; // lock background scroll while the modal is open
  _detailItem = item;
  const domain = (() => { try { return new URL(item.url).hostname.replace('www.', ''); } catch { return item.url; } })();

  const wrap = document.getElementById('detail-image-wrap');
  const isMusicAlbum = item.category === 'Music Album';
  const isMusicianItem = item.category === 'Musician';
  const _imageClass = `detail-image${isMusicianItem ? ' detail-image--faces' : ''}`;
  document.getElementById('detail-body').classList.toggle('detail-body--tight-bottom', isMusicianItem);
  document.getElementById('detail-bookmark-btn').style.display = isMusicianItem ? 'none' : '';
  document.getElementById('detail-favorite-btn').style.display = isMusicianItem ? '' : 'none';

  const PLAY_ICON_SVG = `<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
  const _promoToggleHtml = isMusicianItem
    ? `<button class="btn-promo-toggle" id="btn-promo-toggle" title="Watch on YouTube"><span>Promo Vid</span>${PLAY_ICON_SVG}</button>`
    : isMusicAlbum
    ? `<button class="btn-promo-toggle" id="btn-fullart-toggle" title="View full album art"><span>Full Album Art</span>${PLAY_ICON_SVG}</button>`
    : '';

  if (item.imageUrl) {
    wrap.innerHTML = `<div class="detail-image-crop"><img class="${_imageClass}" src="${escapeHtml(item.imageUrl)}" alt=""></div>${_promoToggleHtml}`;
    wrap.style.display = '';
    if (isMusicAlbum) {
      wrap.querySelector('.detail-image').addEventListener('click', () => openImageLightbox(item.imageUrl));
    }
  } else {
    const letter = (item.title || domain || '?')[0].toUpperCase();
    wrap.innerHTML = `<div class="detail-image-crop"><div class="detail-placeholder placeholder-${catClass(item.category || 'Music-Album')}">${letter}</div></div>${_promoToggleHtml}`;
    wrap.style.display = '';
  }

  if (isMusicianItem) {
    let _showingPromoVideo = false;
    const promoBtn = document.getElementById('btn-promo-toggle');
    const promoLabelEl = promoBtn.querySelector('span');
    promoBtn.onclick = async () => {
      const cropEl = wrap.querySelector('.detail-image-crop');
      if (_showingPromoVideo) {
        _showingPromoVideo = false;
        cropEl.innerHTML = item.imageUrl
          ? `<img class="${_imageClass}" src="${escapeHtml(item.imageUrl)}" alt="">`
          : `<div class="detail-placeholder placeholder-${catClass(item.category)}">${(item.title || '?')[0].toUpperCase()}</div>`;
        promoLabelEl.textContent = 'Promo Vid';
        return;
      }
      promoBtn.disabled = true;
      promoLabelEl.textContent = 'Loading…';
      const videoId = await ensureArtistMusicVideoId(item.title);
      promoBtn.disabled = false;
      if (_detailItem !== item) return; // modal moved on to a different item while awaiting
      if (!videoId) {
        // No API key set yet, or no match found — fall back to a real search in a new tab.
        promoLabelEl.textContent = 'Promo Vid';
        const searchQuery = encodeURIComponent(`${item.title || ''} official music video`);
        window.open(`https://www.youtube.com/results?search_query=${searchQuery}`, '_blank', 'noopener');
        return;
      }
      _showingPromoVideo = true;
      cropEl.innerHTML = `<iframe class="detail-video-frame" src="https://www.youtube-nocookie.com/embed/${videoId}?rel=0&autoplay=1" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
      promoLabelEl.textContent = 'Featured Photos';
    };
  }

  if (isMusicAlbum) {
    document.getElementById('btn-fullart-toggle').onclick = () => {
      if (item.imageUrl) openImageLightbox(item.imageUrl);
    };
  }

  const BOOKMARK_OUTLINE = `<svg xmlns="http://www.w3.org/2000/svg" height="22px" viewBox="0 -960 960 960" width="22px" fill="currentColor"><path d="M200-120v-640q0-33 23.5-56.5T280-840h400q33 0 56.5 23.5T760-760v640L480-240 200-120Zm80-122 200-86 200 86v-518H280v518Zm0-518h400-400Z"/></svg>`;
  const BOOKMARK_FILLED = `<svg xmlns="http://www.w3.org/2000/svg" height="22px" viewBox="0 -960 960 960" width="22px" fill="currentColor"><path d="M200-120v-640q0-33 23.5-56.5T280-840h400q33 0 56.5 23.5T760-760v640L480-240 200-120Z"/></svg>`;
  const FAVORITE_STAR = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m354-287 126-76 126 77-33-144 111-96-146-13-58-136-58 135-146 13 111 97-33 143ZM233-120l65-281L80-590l288-25 112-265 112 265 288 25-218 189 65 281-247-149-247 149Zm247-350Z"/></svg>`;
  function updateDetailActions() {
    const isSaved = !!state.items.find(i => i.id === item.id);
    document.getElementById('detail-edit').style.display = (!item.curated || isSaved) ? '' : 'none';
  }
  function getFavoritesFolder(category) {
    return state.folders.find(f => f.name === 'Favorites' && f.parentCategory === category);
  }
  function updateFavoriteIcon() {
    const favBtn = document.getElementById('detail-favorite-btn');
    if (!favBtn) return;
    const liveItem = state.items.find(i => i.id === item.id);
    const favFolder = getFavoritesFolder(item.category);
    const favorited = !!liveItem && !!favFolder && liveItem.folderId === favFolder.id;
    favBtn.innerHTML = FAVORITE_STAR;
    favBtn.classList.toggle('detail-favorite-btn--active', favorited);
  }
  function updateBookmarkIcon() {
    const saved = !!state.items.find(i => i.id === item.id);
    const btn = document.getElementById('detail-bookmark-btn');
    if (btn) {
      btn.innerHTML = saved ? BOOKMARK_FILLED : BOOKMARK_OUTLINE;
      btn.classList.toggle('detail-bookmark-btn--saved', saved);
    }
    const queueBookmarkEl = document.getElementById('standalone-queue-bookmark');
    if (queueBookmarkEl) {
      queueBookmarkEl.innerHTML = saved ? BOOKMARK_FILLED : BOOKMARK_OUTLINE;
      queueBookmarkEl.classList.toggle('detail-bookmark-btn--saved', saved);
    }
    updateDetailActions();
  }
  updateBookmarkIcon();
  updateFavoriteIcon();
  const _detailAuthorName = item.author
    || (item.curated && item.category === 'Music Album' ? item.notes : null);
  const _detailAuthorCat = item.author ? item.category : 'Musician';
  const _isCuratedMusician = item.curated && item.category === 'Musician';

  // The website CTA overlays the top of the image for both Musician and Music Album (the
  // header container holds only that button now — the artist name for Music Album moved
  // into its own "Artist | Year" line above the title, built below).
  const _showArtistHeaderAbove = isMusicianItem || isMusicAlbum;

  const _titleHtml = item.category === 'Musician'
    ? `<button class="detail-author-link" data-author="${escapeHtml(item.title)}" data-category="Musician">${escapeHtml(item.title || '')}<svg class="detail-title-arrow" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m321-80-71-71 329-329-329-329 71-71 400 400L321-80Z"/></svg></button>`
    : escapeHtml(item.title || '');

  const _authorHtml = !_isCuratedMusician && _detailAuthorName && !isMusicAlbum
    ? `<span class="detail-title-sep"> | </span><button class="detail-author-link" data-author="${escapeHtml(_detailAuthorName)}" data-category="${escapeHtml(_detailAuthorCat)}">${escapeHtml(_detailAuthorName)}</button>`
    : '';

  // "Artist | Year" line above the album title — replaces the old header-block placement.
  // Genre is intentionally kept on item.genre (still fetched/stored/backfilled) but not
  // rendered anywhere in this modal per current design.
  const _albumArtistYearHtml = isMusicAlbum && _detailAuthorName
    ? `<div class="detail-album-artist-year">${isMusicAlbumsSectionView()
        ? escapeHtml(_detailAuthorName)
        : `<button class="detail-author-link" data-author="${escapeHtml(_detailAuthorName)}" data-category="${escapeHtml(_detailAuthorCat)}">${escapeHtml(_detailAuthorName)}</button>`
      }${item.year ? ` <span class="detail-title-sep">|</span> ${escapeHtml(item.year)}` : ''}</div>`
    : '';

  // Official website CTA — resolves the relevant musician (the item itself, or the album's artist).
  // Scoped strictly to Musician/Music Album so an unrelated item.author (e.g. a Book's author) never
  // gets matched against an existing Musician profile of the same name.
  const _ctaAuthorName = item.category === 'Musician' ? item.title
    : item.category === 'Music Album' ? _detailAuthorName
    : null;
  let _ctaAuthor = _ctaAuthorName ? findAuthor(_ctaAuthorName, 'Musician') : null;
  const buildWebsiteCta = () => _ctaAuthor?.websiteUrl
    ? `<a class="btn-detail-website" id="detail-website-cta" href="${escapeHtml(_ctaAuthor.websiteUrl)}" target="_blank" rel="noopener">Official Website</a>`
    : '';

  const artistHeaderEl = document.getElementById('detail-artist-header');
  const _headerContentHtml = buildWebsiteCta();
  // Both Musician and Music Album pin the website CTA inline over the top of the image now.
  artistHeaderEl.classList.add('detail-artist-header--inline');
  if (_showArtistHeaderAbove && _headerContentHtml) {
    artistHeaderEl.innerHTML = _headerContentHtml;
    artistHeaderEl.style.display = '';
  } else {
    artistHeaderEl.innerHTML = '';
    artistHeaderEl.style.display = 'none';
  }

  document.getElementById('detail-title').innerHTML = `${_albumArtistYearHtml}<span class="detail-title-text">${_titleHtml}${_authorHtml}</span>`;

  if (_ctaAuthorName && !_ctaAuthor?.websiteUrl) {
    ensureArtistWebsite(_ctaAuthorName).then(url => {
      if (!url || _detailItem !== item) return; // no result, or modal moved on to a different item
      let author = findAuthor(_ctaAuthorName, 'Musician');
      if (!author) {
        author = { id: Date.now().toString(), name: _ctaAuthorName, category: 'Musician', bio: null, imageUrl: null, websiteUrl: null, savedAt: Date.now() };
        state.authors.push(author);
      }
      author.websiteUrl = url;
      persistAuthor(author);
      _ctaAuthor = author;
      if (document.getElementById('detail-website-cta')) return; // already inserted
      const headerEl = document.getElementById('detail-artist-header');
      headerEl.insertAdjacentHTML('beforeend', buildWebsiteCta());
      headerEl.style.display = ''; // reveal it if it started empty/hidden (Musician with no prior website)
    });
  }

  async function toggleBookmark() {
    const liveItem = state.items.find(i => i.id === item.id);
    if (!liveItem) {
      await ensureLiveItem();
    } else {
      const idx = state.items.indexOf(liveItem);
      state.items.splice(idx, 1);
      await removeItem(liveItem.id);
    }
    updateBookmarkIcon();
  }
  document.getElementById('detail-bookmark-btn').onclick = toggleBookmark;
  const standaloneQueueBookmarkEl = document.getElementById('standalone-queue-bookmark');
  standaloneQueueBookmarkEl.onclick = (e) => {
    e.stopPropagation();
    toggleBookmark();
  };

  document.getElementById('detail-favorite-btn').onclick = async () => {
    const liveItem = await ensureLiveItem();
    const favFolder = getFavoritesFolder(liveItem.category);
    const isFavorited = !!favFolder && liveItem.folderId === favFolder.id;
    if (isFavorited) {
      liveItem.folderId = null;
      await persistItem(liveItem);
      const stillHasItems = state.items.some(i => i.folderId === favFolder.id);
      if (!stillHasItems) {
        state.folders = state.folders.filter(f => f.id !== favFolder.id);
        await removeFolder(favFolder.id);
      }
    } else {
      let folder = favFolder;
      if (!folder) {
        folder = { id: `favorites-${liveItem.category.toLowerCase().replace(/\s+/g, '-')}`, name: 'Favorites', parentCategory: liveItem.category };
        state.folders.push(folder);
        await persistFolder(folder);
      }
      liveItem.folderId = folder.id;
      await persistItem(liveItem);
    }
    updateBookmarkIcon();
    updateFavoriteIcon();
    renderSidebar();
    renderGrid();
  };

  const metaEl = document.getElementById('detail-meta');
  metaEl.innerHTML = '';
  metaEl.style.display = 'none';

  const summaryEl = document.getElementById('detail-summary');
  const summaryLabelEl = document.getElementById('detail-summary-label');
  const summaryToggleEl = document.getElementById('detail-summary-toggle');
  summaryLabelEl.style.display = 'none';

  function renderSummaryText(text) {
    summaryEl.textContent = text;
    summaryEl.style.display = text ? '' : 'none';
    summaryEl.classList.remove('detail-summary-text--expanded');
    summaryToggleEl.classList.remove('detail-summary-toggle--open');
    summaryToggleEl.style.display = 'none';
    if (text) {
      requestAnimationFrame(() => {
        if (summaryEl.scrollHeight > summaryEl.clientHeight + 1) {
          summaryToggleEl.style.display = '';
        }
      });
    }
  }

  summaryToggleEl.onclick = () => {
    const expanded = summaryEl.classList.toggle('detail-summary-text--expanded');
    summaryToggleEl.classList.toggle('detail-summary-toggle--open', expanded);
  };

  const summaryText = item.summary || (isMusicianItem ? _ctaAuthor?.bio : null) || '';
  renderSummaryText(summaryText);

  const _needsBio = isMusicianItem && !summaryText;
  const _needsPhoto = isMusicianItem && (!item.imageUrl || isItunesArtworkUrl(item.imageUrl));
  if ((_needsBio || _needsPhoto) && _ctaAuthorName) {
    ensureArtistWikipediaInfo(_ctaAuthorName).then(({ bio, photoUrl }) => {
      if ((!bio && !photoUrl) || _detailItem !== item) return; // nothing found, or modal moved on
      let author = findAuthor(_ctaAuthorName, 'Musician');
      if (!author) {
        author = { id: Date.now().toString(), name: _ctaAuthorName, category: 'Musician', bio: null, imageUrl: null, websiteUrl: null, savedAt: Date.now() };
        state.authors.push(author);
      }
      let authorChanged = applyArtistPhotoToItem(author, photoUrl);
      if (bio && !author.bio) { author.bio = bio; authorChanged = true; }
      if (authorChanged) persistAuthor(author);
      _ctaAuthor = author;
      if (_needsBio && bio && !item.summary) renderSummaryText(bio);

      if (_needsPhoto && applyArtistPhotoToItem(item, photoUrl)) {
        if (state.items.some(i => i.id === item.id)) persistItem(item);
        patchCardImage(item.id, item.imageUrl);
        const wrap = document.getElementById('detail-image-wrap');
        const cropEl = wrap.querySelector('.detail-image-crop');
        if (cropEl && !cropEl.querySelector('.detail-video-frame')) { // don't clobber an actively-playing promo video
          const imgEl = cropEl.querySelector('.detail-image');
          if (imgEl) {
            imgEl.src = item.imageUrl;
          } else {
            cropEl.innerHTML = `<img class="detail-image detail-image--faces" src="${escapeHtml(item.imageUrl)}" alt="">`;
          }
        }
      }
    });
  }

  const notesEl = document.getElementById('detail-notes');
  const notesInputEl = document.getElementById('detail-notes-input');
  const notesLabelEl = document.getElementById('detail-notes-label');
  const notesAccordionHeaderEl = document.getElementById('detail-notes-accordion-header');
  // Curated (not-yet-saved) Music Album items stash the artist name in item.notes (see
  // _detailAuthorName above) — that's never real user notes, so exclude it here or the
  // editable textarea below would pre-fill with the artist name instead of being empty.
  const _curatedAlbumNotesIsArtistName = item.curated && isMusicAlbum;
  const text = (_curatedAlbumNotesIsArtistName ? null : item.notes) || item.description || '';
  const linerPanelEl = document.getElementById('liner-notes-panel');
  linerPanelEl.innerHTML = '';
  linerPanelEl.style.display = 'none';
  if (isMusicianItem || isMusicAlbum) {
    // My Notes is always shown as its own accordion row for Musician/Music Album modals, even
    // with no notes yet — it's a directly-editable textarea instead of read-only text, auto-saving
    // (debounced) as the user types. Genre (item.genre) is intentionally kept on the item but
    // not rendered anywhere in this modal.
    notesLabelEl.style.display = 'none'; // replaced by the accordion header below
    notesEl.style.display = 'none';
    notesEl.classList.remove('detail-accordion-collapsible', 'open');

    notesInputEl.value = text;
    notesInputEl.style.display = '';
    notesInputEl.classList.add('detail-accordion-collapsible');
    notesInputEl.classList.remove('open');
    notesAccordionHeaderEl.classList.remove('open');
    notesAccordionHeaderEl.style.display = '';
    notesAccordionHeaderEl.onclick = () => {
      const nowOpen = notesAccordionHeaderEl.classList.toggle('open');
      notesInputEl.classList.toggle('open', nowOpen);
      if (nowOpen) {
        albumsAccordionHeaderEl.classList.remove('open');
        albumsListEl.classList.remove('open');
        tracklistAccordionHeaderEl.classList.remove('open');
        tracklistEl.classList.remove('open');
        streamingEl.classList.remove('open');
        notesInputEl.focus();
      }
    };

    const saveNotes = debounce(async () => {
      const newNotes = notesInputEl.value.trim() || null;
      let liveItem = state.items.find(i => i.id === item.id);
      if (!liveItem) liveItem = await ensureLiveItem();
      if (liveItem.notes === newNotes) return;
      liveItem.notes = newNotes;
      item.notes = newNotes;
      await persistItem(liveItem);
    }, 600);
    notesInputEl.oninput = saveNotes;
  } else {
    linerPanelEl.innerHTML = '';
    linerPanelEl.style.display = 'none';
    notesAccordionHeaderEl.style.display = 'none';
    notesInputEl.style.display = 'none';
    notesEl.classList.remove('detail-accordion-collapsible', 'open');
    notesEl.textContent = text;
    notesEl.style.display = text ? '' : 'none';
    notesLabelEl.style.display = text ? '' : 'none';
  }

  const albumsAccordionHeaderEl = document.getElementById('detail-albums-accordion-header');
  const albumsListEl = document.getElementById('detail-albums-list');
  if (isMusicianItem) {
    const knownAlbums = getKnownAlbumsForArtist(item.title);
    albumsAccordionHeaderEl.classList.remove('open');
    albumsListEl.classList.remove('open');
    if (knownAlbums.length) {
      albumsAccordionHeaderEl.style.display = '';
      albumsListEl.style.display = '';
      albumsListEl.classList.add('detail-accordion-collapsible');
      albumsListEl.innerHTML = knownAlbums.slice(0, 5).map(a => `
        <button class="detail-album-row" data-album-id="${escapeHtml(a.id)}">
          ${a.imageUrl ? `<img class="detail-album-row-thumb" src="${escapeHtml(a.imageUrl)}" alt="">` : `<span class="detail-album-row-thumb"></span>`}
          <span class="detail-album-row-title">${escapeHtml(a.title || '')}</span>
        </button>`).join('')
        + `<button class="detail-album-row detail-album-row--see-all" id="detail-albums-see-all">See all →</button>`;
      albumsListEl.querySelectorAll('.detail-album-row[data-album-id]').forEach(row => {
        row.addEventListener('click', () => {
          const album = knownAlbums.find(a => a.id === row.dataset.albumId);
          if (album) openDetailModal(album);
        });
      });
      document.getElementById('detail-albums-see-all')?.addEventListener('click', () => {
        closeDetailModal();
        navigateToAuthor(item.title, 'Musician');
      });
      albumsAccordionHeaderEl.onclick = () => {
        const nowOpen = albumsAccordionHeaderEl.classList.toggle('open');
        albumsListEl.classList.toggle('open', nowOpen);
        if (nowOpen) {
          notesAccordionHeaderEl.classList.remove('open');
          notesEl.classList.remove('open');
          tracklistAccordionHeaderEl.classList.remove('open');
          tracklistEl.classList.remove('open');
          streamingEl.classList.remove('open');
        }
      };
    } else {
      albumsAccordionHeaderEl.style.display = 'none';
      albumsListEl.style.display = 'none';
      albumsListEl.innerHTML = '';
    }
  } else {
    albumsAccordionHeaderEl.style.display = 'none';
    albumsListEl.style.display = 'none';
    albumsListEl.innerHTML = '';
    albumsListEl.classList.remove('detail-accordion-collapsible', 'open');
  }

  const tracklistAccordionHeaderEl = document.getElementById('detail-tracklist-accordion-header');
  const tracklistEl = document.getElementById('detail-tracklist');
  tracklistAccordionHeaderEl.classList.remove('open');
  tracklistEl.classList.remove('open');
  if (isMusicAlbum) {
    tracklistAccordionHeaderEl.style.display = '';
    tracklistEl.style.display = '';
    tracklistEl.classList.add('detail-accordion-collapsible');
    tracklistEl.innerHTML = '';
    let _tracklistLoaded = false;
    tracklistAccordionHeaderEl.onclick = async () => {
      const nowOpen = tracklistAccordionHeaderEl.classList.toggle('open');
      tracklistEl.classList.toggle('open', nowOpen);
      if (!nowOpen) return;
      notesAccordionHeaderEl.classList.remove('open');
      notesInputEl.classList.remove('open');
      streamingEl.classList.remove('open');
      if (_tracklistLoaded) return;
      _tracklistLoaded = true;
      tracklistEl.innerHTML = `<div class="detail-tracklist-row detail-tracklist-row--status">Loading…</div>`;
      const tracks = await ensureAlbumTrackList(item);
      if (_detailItem !== item) return; // modal moved on to a different item while awaiting
      if (!tracklistAccordionHeaderEl.classList.contains('open')) return; // user closed it already
      if (!tracks || tracks.length === 0) {
        tracklistEl.innerHTML = `<div class="detail-tracklist-row detail-tracklist-row--status">Track list unavailable</div>`;
      } else {
        tracklistEl.innerHTML = tracks.map(t => `
          <div class="detail-tracklist-row">
            <span class="detail-tracklist-number">${t.number || ''}</span>
            <span class="detail-tracklist-title">${escapeHtml(t.title || '')}</span>
            <span class="detail-tracklist-duration">${formatTrackDuration(t.durationMs)}</span>
          </div>`).join('');
      }
    };
  } else {
    tracklistAccordionHeaderEl.style.display = 'none';
    tracklistEl.style.display = 'none';
    tracklistEl.innerHTML = '';
    tracklistEl.classList.remove('detail-accordion-collapsible', 'open');
  }

  const streamingEl = document.getElementById('detail-streaming');
  // Web Links normally has margin-top:auto + padding-top to push it toward the bottom of a
  // short modal; in the Musician/Music Album accordion stack it should instead sit flush like
  // My Notes/Albums/Song List.
  streamingEl.classList.toggle('detail-streaming--tight', isMusicianItem || isMusicAlbum);
  const queueEl = document.getElementById('detail-queue');
  queueEl.classList.toggle('detail-queue--tight', isMusicianItem || isMusicAlbum);
  const catConfig = CATEGORY_PLATFORMS[item.category];
  const query = item.title || domain;
  const websiteLinkLabel = isMusicAlbum ? 'View on Apple Music' : (domain || 'View Source');
  const websiteBtn = item.url
    ? `<a class="streaming-link-btn streaming-link-website" href="${escapeHtml(item.url)}" target="_blank">${escapeHtml(websiteLinkLabel)}</a>`
    : '';
  const arrowSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;

  const headerLabel = catConfig ? escapeHtml(catConfig.label) : 'Web Links';

  function getListIds(liveItem) {
    if (!liveItem) return [];
    if (Array.isArray(liveItem.listIds)) return liveItem.listIds;
    if (liveItem.listId) return [liveItem.listId];
    return [];
  }

  function updateQueueLabel() {
    const liveItem = state.items.find(i => i.id === item.id);
    const isQueued = !!liveItem?.queueStatus;
    const labelEl = streamingEl.querySelector('.queue-label') || document.getElementById('btn-standalone-queue');
    const textEl = streamingEl.querySelector('.queue-label-text') || document.getElementById('standalone-queue-text');
    if (textEl) textEl.textContent = 'Add to Queue';
    if (labelEl) labelEl.classList.toggle('queue-label--active', isQueued);
  }

  // Musician/Music Album modals present Web Links as its own accordion row (icon + label +
  // chevron, matching My Notes/Albums/Song List) with "Add to Queue" pulled out as a standalone
  // button below the accordion stack, instead of sharing a header row with it like other
  // categories do.
  const WEB_LINKS_ICON_SVG = `<svg class="detail-accordion-icon" xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="currentColor"><path d="M440-280H280q-83 0-141.5-58.5T80-480q0-83 58.5-141.5T280-680h160v80H280q-50 0-85 35t-35 85q0 50 35 85t85 35h160v80ZM320-440v-80h320v80H320Zm200 160v-80h160q50 0 85-35t35-85q0-50-35-85t-85-35H520v-80h160q83 0 141.5 58.5T880-480q0 83-58.5 141.5T680-280H520Z"/></svg>`;
  const buildStreamingHeader = () => (isMusicianItem || isMusicAlbum)
    ? `<div class="detail-accordion-header how-to-read-label">${WEB_LINKS_ICON_SVG}<span>${headerLabel}</span><svg class="detail-accordion-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></div>`
    : `<div class="streaming-header">
        <div class="streaming-label how-to-read-label">${headerLabel}${arrowSvg}</div>
        <div class="streaming-label queue-label"><span class="queue-label-text">Add to Queue</span>${arrowSvg}</div>
      </div>`;

  const btnStandaloneQueueEl = document.getElementById('btn-standalone-queue');
  btnStandaloneQueueEl.style.display = (isMusicianItem || isMusicAlbum) ? '' : 'none';

  const buildStreaming = (linksHtml) => buildStreamingHeader() + `<div class="streaming-links-wrap">${linksHtml}</div>`;

  if (catConfig && catConfig.platforms) {
    const savedPlatforms = item.platforms;
    const platformsToShow = (savedPlatforms && savedPlatforms.length > 0)
      ? catConfig.platforms.filter(p => savedPlatforms.includes(p.id))
      : catConfig.platforms;
    streamingEl.innerHTML = buildStreaming(websiteBtn + platformsToShow.map(p => `<a class="streaming-link-btn" href="${p.searchUrl(query)}" target="_blank">${p.name}</a>`).join(''));
  } else {
    streamingEl.innerHTML = buildStreaming(websiteBtn);
  }
  streamingEl.style.display = '';
  streamingEl.querySelector('.how-to-read-label')?.addEventListener('click', () => {
    const nowOpen = streamingEl.classList.toggle('open');
    if (nowOpen) {
      notesAccordionHeaderEl.classList.remove('open');
      notesEl.classList.remove('open');
      albumsAccordionHeaderEl.classList.remove('open');
      albumsListEl.classList.remove('open');
      tracklistAccordionHeaderEl.classList.remove('open');
      tracklistEl.classList.remove('open');
    }
  });
  async function ensureLiveItem() {
    let liveItem = state.items.find(i => i.id === item.id);
    if (!liveItem) {
      // Curated item not yet saved — create a real copy
      liveItem = { ...item, curated: false, savedAt: Date.now() };
      state.items.push(liveItem);
      await persistItem(liveItem);
      if (liveItem.category === 'Music Album') {
        await autoSaveMusician(liveItem.notes || liveItem.author);
      }
    }
    return liveItem;
  }

  (streamingEl.querySelector('.queue-label') || btnStandaloneQueueEl).onclick = async () => {
    const liveItem = state.items.find(i => i.id === item.id);
    if (!liveItem?.queueStatus) {
      const live = await ensureLiveItem();
      live.queueStatus = 'in-queue';
      await persistItem(live);
      updateBookmarkIcon();
      updateQueueLabel();
      queueEl.innerHTML = buildQueueSection();
      wireQueueSection();
      queueEl.classList.add('open');
    } else {
      queueEl.classList.toggle('open');
    }
  };

  function buildQueueSection() {
    const liveItem = state.items.find(i => i.id === item.id);
    const listIds = getListIds(liveItem);
    const isQueued = !!liveItem?.queueStatus;
    const baseTag = `<button class="queue-tag queue-tag-base${isQueued ? ' active' : ''}" id="btn-queue-base">${isQueued ? 'Deselect Queue' : 'Select Queue'}</button>`;
    const makeTag = l => `<button class="queue-tag${listIds.includes(l.id) ? ' active' : ''}" data-list-id="${l.id}">${l.name}</button>`;
    const addBtn = `<button class="queue-tag queue-tag-add" id="btn-queue-add-list">+ Add list</button>`;
    const lists = state.kanbanLists;
    const listTags = lists.map(makeTag).join('');
    return `<div class="streaming-links-wrap">
      ${baseTag}${listTags}${addBtn}
    </div>`;
  }

  function wireQueueSection() {
    updateQueueLabel();

    // Base "Queue" tag — dequeues when tapped while active
    document.getElementById('btn-queue-base')?.addEventListener('click', async () => {
      const liveItem = state.items.find(i => i.id === item.id);
      if (!liveItem) return;
      if (liveItem.queueStatus) {
        liveItem.queueStatus = null;
        liveItem.listIds = [];
        liveItem.listId = null;
        await persistItem(liveItem);
        updateQueueLabel();
        queueEl.innerHTML = buildQueueSection();
        wireQueueSection();
        queueEl.classList.remove('open');
      }
    });

    // List tags — toggle membership
    queueEl.querySelectorAll('.queue-tag:not(.queue-tag-add):not(.queue-tag-base)').forEach(tag => {
      tag.addEventListener('click', async () => {
        const liveItem = await ensureLiveItem();
        if (!liveItem) return;
        const listIds = getListIds(liveItem);
        const id = tag.dataset.listId;
        const idx = listIds.indexOf(id);
        if (idx === -1) listIds.push(id); else listIds.splice(idx, 1);
        liveItem.listIds = listIds;
        liveItem.listId = null;
        if (!liveItem.queueStatus) liveItem.queueStatus = 'in-queue';
        await persistItem(liveItem);
        queueEl.innerHTML = buildQueueSection();
        wireQueueSection();
      });
    });

    document.getElementById('btn-queue-add-list')?.addEventListener('click', () => {
      const linksWrap = queueEl.querySelector('.streaming-links-wrap');
      linksWrap.innerHTML = `
        <div class="queue-new-wrap">
          <input class="queue-new-input" id="queue-new-input" placeholder="List name…" maxlength="40">
          <button class="queue-new-confirm" id="queue-new-confirm">Create</button>
          <button class="queue-new-cancel" id="queue-new-cancel">✕</button>
        </div>`;
      const input = document.getElementById('queue-new-input');
      input?.focus();
      const cancelQueue = () => { queueEl.innerHTML = buildQueueSection(); wireQueueSection(); };
      const createAndAssign = async () => {
        const name = input?.value.trim();
        if (!name) { cancelQueue(); return; }
        const newId = 'list-' + Date.now();
        state.kanbanLists.push({ id: newId, name });
        chrome.storage.sync.set({ savecraft_kanban_lists: state.kanbanLists });
        if (!item.curated) {
          const liveItem = state.items.find(i => i.id === item.id);
          if (liveItem) {
            const listIds = getListIds(liveItem);
            listIds.push(newId);
            liveItem.listIds = listIds;
            liveItem.listId = null;
            liveItem.queueStatus = 'in-queue';
            await persistItem(liveItem);
          }
        }
        queueEl.innerHTML = buildQueueSection();
        wireQueueSection();
      };
      document.getElementById('queue-new-confirm')?.addEventListener('click', createAndAssign);
      document.getElementById('queue-new-cancel')?.addEventListener('click', cancelQueue);
      input?.addEventListener('keydown', ev => { if (ev.key === 'Enter') createAndAssign(); if (ev.key === 'Escape') cancelQueue(); });
    });
  }

  queueEl.innerHTML = buildQueueSection();
  queueEl.classList.remove('open');
  wireQueueSection();
  updateQueueLabel();

  // VoteCraft recommends section (Top 100 curated items only)
  const vcWhyEl = document.getElementById('detail-vc-why');
  const isCuratedTop100 = item.curated && item.id && (item.id.startsWith('cur-top100-') || item.id.startsWith('cur-top100g-') || item.id.startsWith('cur-top100b-') || item.id.startsWith('cur-rs100-') || item.id.startsWith('cur-rstv-'));
  if (isCuratedTop100) {
    const isMusic = item.id.startsWith('cur-rs100-');
    const isShows = item.id.startsWith('cur-rstv-');
    const isGames = item.id.startsWith('cur-top100g-');
    const isBooks = item.id.startsWith('cur-top100b-');
    const whyText = isMusic
      ? 'Music shapes culture, identity, and resistance — the same forces that drive civic change.'
      : isShows
      ? 'The stories we follow on screen shape our empathy, our politics, and how we see each other.'
      : isGames
      ? 'Games build communities, test strategy, and spark collaboration — skills at the core of civic life.'
      : isBooks
      ? 'Great books expand our understanding of the world and each other — the foundation of an engaged citizenry.'
      : 'What we watch shapes how we see power and justice — the same questions at the heart of civic life.';
    vcWhyEl.innerHTML = `
      <div class="vc-why-title">WHY VOTECRAFT RECOMMENDS</div>
      <p class="vc-why-text">${whyText}</p>
      <div style="text-align:center;margin-top:10px"><a class="vc-sponsored-tag" href="${chrome.runtime.getURL('sponsored.html')}" target="_blank">⚡ Your Sponsored Statement</a></div>
    `;
    vcWhyEl.style.display = '';
  } else {
    vcWhyEl.style.display = 'none';
  }

  document.getElementById('detail-modal-overlay').classList.add('open');

  document.querySelectorAll('.detail-author-link').forEach(el => {
    el.addEventListener('click', () => {
      closeDetailModal();
      navigateToAuthor(el.dataset.author, el.dataset.category);
    });
  });
}

function closeDetailModal() {
  document.getElementById('detail-modal-overlay').classList.remove('open');
  document.body.style.overflow = ''; // restore background scroll
}

function openImageLightbox(imageUrl) {
  document.getElementById('image-lightbox-img').src = imageUrl;
  document.getElementById('image-lightbox-overlay').classList.add('open');
}

function closeImageLightbox() {
  document.getElementById('image-lightbox-overlay').classList.remove('open');
}

async function handleSaveItem() {
  const url = document.getElementById('input-url').value.trim();
  const titleInput = document.getElementById('input-title').value.trim();
  const author = document.getElementById('input-author').value.trim() || null;
  const category = document.getElementById('modal-category').value || null;
  const folderId = null;
  const summary = document.getElementById('input-summary').value.trim() || null;
  const notes = document.getElementById('input-notes').value.trim() || null;
  const manualImageUrl = document.getElementById('input-image-url').value.trim() || null;
  const platforms = getSelectedPlatforms();

  if (!url) {
    document.getElementById('input-url').focus();
    document.getElementById('input-url').style.borderColor = '#EF4444';
    setTimeout(() => document.getElementById('input-url').style.borderColor = '', 1500);
    return;
  }

  if (!category) {
    const catSelect = document.getElementById('modal-category');
    if (catSelect) { catSelect.style.outline = '2px solid #EF4444'; setTimeout(() => catSelect.style.outline = '', 1500); }
    return;
  }

  const saveBtn = document.getElementById('btn-modal-save');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  const title = titleInput || null;

  let item;
  if (state.editingId && state.editingId.startsWith('cur-')) {
    // Curated item edit — save as an override, not a new personal item
    state.curatedOverrides[state.editingId] = { url, title, author, summary, notes, imageUrl: manualImageUrl };
    await persistCuratedOverrides();
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save';
    closeAddModal();
    renderGrid();
    return;
  } else if (state.editingId) {
    const existing = state.items.find(i => i.id === state.editingId);
    item = { ...existing, url, title, author, summary, notes, imageUrl: manualImageUrl, category, folderId, platforms };
    const idx = state.items.findIndex(i => i.id === state.editingId);
    if (idx >= 0) state.items[idx] = item;
  } else {
    item = {
      id: Date.now().toString(), url, title, author, summary, notes,
      imageUrl: manualImageUrl || null, description: null,
      category, folderId, platforms, done: false, savedAt: Date.now(),
    };
  }

  await persistItem(item);
  saveBtn.disabled = false;
  saveBtn.textContent = 'Save';
  closeAddModal();
  renderSidebar();
  renderGrid();

  const needsMeta = !state.editingId && (!item.imageUrl || !titleInput);
  if (needsMeta && !manualImageUrl) {
    fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`)
      .then(r => r.json())
      .then(data => {
        const updated = { ...item };
        if (!item.imageUrl) updated.imageUrl = data?.data?.image?.url || null;
        if (!titleInput) { updated.title = data?.data?.title || getDomain(url); updated.description = data?.data?.description || null; }
        if (updated.imageUrl !== item.imageUrl || updated.title !== item.title) {
          persistItem(updated);
        }
      })
      .catch(() => {});
  }

}

// ===== SHARE =====
function initShare() {
  const wrap = document.getElementById('share-btn-wrap');
  const dropdown = document.getElementById('share-dropdown');

  function closeDropdown() { dropdown.classList.remove('open'); }

  document.getElementById('btn-share').addEventListener('click', () => {
    closeDropdown();
    openShareModal();
  });

  document.getElementById('btn-share-arrow').addEventListener('click', e => {
    e.stopPropagation();
    dropdown.classList.toggle('open');
  });

  document.addEventListener('click', e => {
    if (!wrap.contains(e.target)) closeDropdown();
  });

  document.getElementById('share-export-csv-dd').addEventListener('click', () => {
    exportAsCsv();
    closeDropdown();
  });

  chrome.storage.sync.get({ savecraft_share_count: 0 }, data => {
    updateShareCount(data.savecraft_share_count);
  });

  document.getElementById('btn-share-modal-cancel').addEventListener('click', closeShareModal);
  document.getElementById('share-modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('share-modal-overlay')) closeShareModal();
  });
  document.getElementById('btn-share-modal-send').addEventListener('click', sendViaEmail);

  document.getElementById('btn-copy-link').addEventListener('click', () => {
    const url = buildShareUrl();
    navigator.clipboard.writeText(url).then(() => {
      const btn = document.getElementById('btn-copy-link');
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Copied!`;
      btn.classList.add('copied');
      setTimeout(() => {
        btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> Copy link`;
        btn.classList.remove('copied');
      }, 2000);
    });
  });
}

function openShareModal() {
  document.getElementById('share-email-input').value = '';
  document.getElementById('share-message-input').value = '';
  document.getElementById('btn-share-modal-send').disabled = true;
  const copyBtn = document.getElementById('btn-copy-link');
  copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> Copy link`;
  copyBtn.classList.remove('copied');
  document.getElementById('share-modal-overlay').classList.add('open');
  document.getElementById('share-email-input').focus();

  document.getElementById('share-email-input').oninput = e => {
    document.getElementById('btn-share-modal-send').disabled = !e.target.value.trim();
  };
}

function closeShareModal() {
  document.getElementById('share-modal-overlay').classList.remove('open');
}

function buildShareUrl() {
  const items = getFilteredSortedItems().map(({ url, title, category, imageUrl }) =>
    ({ url, title, category, imageUrl })
  );
  const viewLabel = state.view === 'all'
    ? 'SaveCraft Library'
    : (CATEGORIES.includes(state.view) ? state.view : (() => {
        const f = state.folders.find(f => f.id === state.view);
        return f ? f.name : 'My List';
      })());

  const payload = { title: viewLabel, items };
  const encoded = btoa(encodeURIComponent(JSON.stringify(payload)).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))));
  return `https://lizpasekal1.github.io/Votecraft.org/savecraft/view.html#${encoded}`;
}

function updateShareCount(count) {
  const el = document.getElementById('share-people-count');
  if (el) el.textContent = `Shared with ${count} ${count === 1 ? 'person' : 'people'}`;
}

function sendViaEmail() {
  const email = document.getElementById('share-email-input').value.trim();
  if (!email) {
    document.getElementById('share-email-input').style.borderColor = '#EF4444';
    setTimeout(() => document.getElementById('share-email-input').style.borderColor = '', 1500);
    return;
  }

  const viewLabel = state.view === 'all'
    ? 'my SaveCraft library'
    : (CATEGORIES.includes(state.view) ? `my ${state.view} list` : 'a list');

  const message = document.getElementById('share-message-input').value.trim();
  const shareUrl = buildShareUrl();
  const subject = encodeURIComponent(`Check out ${viewLabel} on SaveCraft`);
  const bodyText = message
    ? `${message}\n\n${shareUrl}\n\n— Shared via SaveCraft`
    : `Hey,\n\nI wanted to share ${viewLabel} with you:\n\n${shareUrl}\n\n— Shared via SaveCraft`;
  const body = encodeURIComponent(bodyText);
  const mailto = `mailto:${encodeURIComponent(email)}?subject=${subject}&body=${body}`;

  chrome.tabs.create({ url: mailto });

  chrome.storage.sync.get({ savecraft_share_count: 0 }, data => {
    const newCount = data.savecraft_share_count + 1;
    chrome.storage.sync.set({ savecraft_share_count: newCount });
    updateShareCount(newCount);
  });

  closeShareModal();
}

function exportAsCsv() {
  const items = getFilteredSortedItems();
  const rows = [['Title', 'URL', 'Category', 'Date Saved', 'Done']];
  items.forEach(item => {
    const date = new Date(item.savedAt).toLocaleDateString();
    rows.push([
      `"${(item.title || '').replace(/"/g, '""')}"`,
      `"${(item.url || '').replace(/"/g, '""')}"`,
      item.category || '',
      date,
      item.done ? 'Yes' : 'No',
    ]);
  });
  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'savecraft-export.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

// ===== SEARCH =====
let searchDebounce;
function handleSearch(query) {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    state.search = query.trim();
    renderGrid();
  }, 220);
}

function initSearch() {
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
function handleSort(sort) {
  state.sort = sort;
  chrome.storage.sync.set({ savecraft_sort: sort });
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
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const label = document.getElementById('theme-label');
  if (label) label.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  chrome.storage.sync.set({ savecraft_theme: next });
}

// ===== MOBILE SIDEBAR =====
function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebar-overlay').classList.add('open');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('open');
}

// ===== INIT =====
async function init() {
  await loadAll();
  CURATED_ITEMS = await _getCuratedItems();

  // Load curated image cache from local storage (separate from sync)
  await new Promise(resolve => {
    chrome.storage.local.get({ savecraft_curated_img: {} }, data => {
      state.curatedImgCache = data.savecraft_curated_img;
      resolve();
    });
  });

  // Load curated album metadata cache from local storage (separate from sync)
  await new Promise(resolve => {
    chrome.storage.local.get({ savecraft_curated_album_meta: {} }, data => {
      state.curatedAlbumMetaCache = data.savecraft_curated_album_meta;
      resolve();
    });
  });

  // Load album track-list cache from local storage (separate from sync)
  await new Promise(resolve => {
    chrome.storage.local.get({ savecraft_album_tracklist: {} }, data => {
      state.albumTrackListCache = data.savecraft_album_tracklist;
      resolve();
    });
  });

  // Load artist website cache from local storage (separate from sync)
  await new Promise(resolve => {
    chrome.storage.local.get({ savecraft_artist_website_cache: {} }, data => {
      state.artistWebsiteCache = data.savecraft_artist_website_cache;
      resolve();
    });
  });

  // Load artist bio cache from local storage (separate from sync)
  await new Promise(resolve => {
    chrome.storage.local.get({ savecraft_artist_bio_cache_v2: {} }, data => {
      state.artistBioCache = data.savecraft_artist_bio_cache_v2;
      resolve();
    });
  });

  // Load artist video cache from local storage (separate from sync)
  await new Promise(resolve => {
    chrome.storage.local.get({ savecraft_artist_video_cache: {} }, data => {
      state.artistVideoCache = data.savecraft_artist_video_cache;
      resolve();
    });
  });

  chrome.storage.sync.get({ savecraft_theme: 'dark' }, data => {
    applyTheme(data.savecraft_theme);
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
  });
  document.addEventListener('click', e => {
    if (!settingsWrap.contains(e.target)) settingsDropdown.setAttribute('hidden', '');
  });

  const sortSelect = document.getElementById('sort-select');
  sortSelect.value = state.sort;

  renderSidebar();
  renderGrid();
  initShare();
  initSearch();

  sortSelect.addEventListener('change', () => handleSort(sortSelect.value));

  const menuBtn = document.getElementById('btn-sidebar-menu');
  const myOptionsDropdown = document.getElementById('my-options-dropdown');
  menuBtn.addEventListener('click', e => {
    e.stopPropagation();
    myOptionsDropdown.classList.toggle('open');
  });
  myOptionsDropdown.querySelectorAll('.my-options-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const opt = btn.dataset.option;
      if (opt === 'curated') {
        state.sidebarMode = 'curated';
        state.view = 'curated';
        renderSidebar();
        renderGrid();
      } else if (opt === 'my-lists') {
        state.sidebarMode = 'categories';
        state.view = 'all';
        renderSidebar();
        renderGrid();
      } else if (opt === 'sponsored') {
        state.sidebarMode = 'sponsored';
        state.view = 'sponsored';
        renderSidebar();
        renderGrid();
      }
      myOptionsDropdown.classList.remove('open');
    });
  });
  document.addEventListener('click', e => {
    if (!document.getElementById('sidebar-menu-wrap').contains(e.target)) {
      myOptionsDropdown.classList.remove('open');
    }
  });

  document.getElementById('btn-add').addEventListener('click', openAddModal);

  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay')) closeAddModal();
  });

  document.getElementById('btn-modal-cancel').addEventListener('click', closeAddModal);
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
    if (!_detailItem) return;
    closeDetailModal();
    const liveItem = state.items.find(i => i.id === _detailItem.id);
    openEditModal(liveItem || _detailItem);
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

  document.getElementById('modal-category').addEventListener('change', e => {
    updatePlatformsSection(e.target.value);
    hideItunesSuggestions();
  });

  const _debouncedItunesLookup = debounce(handleAuthorItunesLookup, 600);
  document.getElementById('input-author').addEventListener('input', _debouncedItunesLookup);
  document.getElementById('input-author').addEventListener('blur', () => {
    setTimeout(hideItunesSuggestions, 150);
  });

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

  document.getElementById('btn-author-modal-close').addEventListener('click', closeAuthorEditModal);
  document.getElementById('btn-author-modal-cancel').addEventListener('click', closeAuthorEditModal);
  document.getElementById('btn-author-modal-save').addEventListener('click', handleSaveAuthor);
  document.getElementById('btn-find-website').addEventListener('click', handleFindWebsite);
  document.getElementById('author-modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('author-modal-overlay')) closeAuthorEditModal();
  });
  document.getElementById('author-modal-overlay').addEventListener('keydown', e => {
    if (e.key === 'Escape') closeAuthorEditModal();
    if (e.key === 'Enter' && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'TEXTAREA') handleSaveAuthor();
  });

  document.getElementById('fab-add').addEventListener('click', openAddModal);
}

document.addEventListener('DOMContentLoaded', init);
