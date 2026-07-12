// ===== SHARED STATE + STATIC CONFIG =====
// Every other module imports `state` (and CURATED_ITEMS) from here and mutates it directly —
// ES module bindings are live references, so this works exactly like the single-file closure
// this codebase used to be, just spread across files.

export const CATEGORIES = ['Book', 'Game', 'Movie', 'Musician', 'Music Album', 'Show', 'Visual Art'];
// Categories whose empty accordion (in the placeholder slot between My Notes and Web Links)
// is labeled "Summary" instead of "Placeholder", and which get a Wikipedia fallback for a
// missing image/summary. Visual Art and the music categories are intentionally excluded.
export const SUMMARY_PLACEHOLDER_CATEGORIES = ['Book', 'Show', 'Movie', 'Game'];
export const MODAL_BOOKMARK_ICON_SVG = '<svg class="modal-bookmark-icon" xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="M200-120v-640q0-33 23.5-56.5T280-840h400q33 0 56.5 23.5T760-760v640L480-240 200-120Z"/></svg>';
export const CURATED_GENRES = ['Top 100', 'Futurism', 'Fantasy', 'Thriller', 'Pop', 'Classic', 'Jazz', 'Comedy'];
export const GENRE_EMOJI = {
  'Top 100':  '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M852-212 732-332l56-56 120 120-56 56ZM708-692l-56-56 120-120 56 56-120 120Zm-456 0L132-812l56-56 120 120-56 56ZM108-212l-56-56 120-120 56 56-120 120Zm246-75 126-76 126 77-33-144 111-96-146-13-58-136-58 135-146 13 111 97-33 143ZM233-120l65-281L80-590l288-25 112-265 112 265 288 25-218 189 65 281-247-149-247 149Zm247-361Z"/></svg>',
  'Futurism': '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m240-198 79-32q-10-29-18.5-59T287-349l-47 32v119Zm160-42h160q18-40 29-97.5T600-455q0-99-33-187.5T480-779q-54 48-87 136.5T360-455q0 60 11 117.5t29 97.5Zm23.5-223.5Q400-487 400-520t23.5-56.5Q447-600 480-600t56.5 23.5Q560-553 560-520t-23.5 56.5Q513-440 480-440t-56.5-23.5ZM720-198v-119l-47-32q-5 30-13.5 60T641-230l79 32ZM480-881q99 72 149.5 183T680-440l84 56q17 11 26.5 29t9.5 38v237l-199-80H359L160-80v-237q0-20 9.5-38t26.5-29l84-56q0-147 50.5-258T480-881Z"/></svg>',
  'Fantasy':  '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M200-80v-160q0-23 12-41.5t32-29.5l196-99v-70l-139 69q-12 6-25 9t-26 3q-31 0-58.5-16T149-461q-14-27-12-57.5t19-56.5l124-185-80-120h240q133 0 226.5 93T760-560v480H200Zm80-80h400v-400q0-100-70-170t-170-70h-90l26 40-153 230q-5 8-5.5 16.5T221-497q5 11 13.5 14.5T251-479q3 0 15-3l254-128v250L280-240v80Zm160-320Z"/></svg>',
  'Thriller': '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M240-80v-170q-39-17-68.5-45.5t-50-64.5q-20.5-36-31-77T80-520q0-158 112-259t288-101q176 0 288 101t112 259q0 42-10.5 83t-31 77q-20.5 36-50 64.5T720-250v170H240Zm80-80h40v-80h80v80h80v-80h80v80h40v-142q38-9 67.5-30t50-50q20.5-29 31.5-64t11-74q0-125-88.5-202.5T480-800q-143 0-231.5 77.5T160-520q0 39 11 74t31.5 64q20.5 29 50.5 50t67 30v142Zm100-200h120l-60-120-60 120Zm-80-80q33 0 56.5-23.5T420-520q0-33-23.5-56.5T340-600q-33 0-56.5 23.5T260-520q0 33 23.5 56.5T340-440Zm280 0q33 0 56.5-23.5T700-520q0-33-23.5-56.5T620-600q-33 0-56.5 23.5T540-520q0 33 23.5 56.5T620-440ZM480-160Z"/></svg>',
  'Pop':      '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m440-803-83 83H240v117l-83 83 83 83v117h117l83 83 100-100 168 85-86-167 101-101-83-83v-117H523l-83-83Zm0-113 116 116h164v164l116 116-116 116 115 226q7 13 4 25.5T828-132q-8 8-20.5 11t-25.5-4L556-240 440-124 324-240H160v-164L44-520l116-116v-164h164l116-116Zm0 396Z"/></svg>',
  'Classic':  '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M320-160q-33 0-56.5-23.5T240-240v-120h120v-90q-35-2-66.5-15.5T236-506v-44h-46L60-680q36-46 89-65t107-19q27 0 52.5 4t51.5 15v-55h480v520q0 50-35 85t-85 35H320Zm120-200h240v80q0 17 11.5 28.5T720-240q17 0 28.5-11.5T760-280v-440H440v24l240 240v56h-56L510-514l-8 8q-14 14-29.5 25T440-464v104ZM224-630h92v86q12 8 25 11t27 3q23 0 41.5-7t36.5-25l8-8-56-56q-29-29-65-43.5T256-684q-20 0-38 3t-36 9l42 42Zm376 350H320v40h286q-3-9-4.5-19t-1.5-21Zm-280 40v-40 40Z"/></svg>',
  'Jazz':     '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M280-120v-123q-104-14-172-93T40-520h80q0 83 58.5 141.5T320-320h10q5 0 10-1 13 20 28 37.5t32 32.5q-10 3-19.5 4.5T360-243v123h-80Zm20-282q-43-8-71.5-40.5T200-520v-240q0-50 35-85t85-35q50 0 85 35t35 85v160H280v80q0 31 5 60.5t15 57.5Zm255-33q-35-35-35-85v-240q0-50 35-85t85-35q50 0 85 35t35 85v240q0 50-35 85t-85 35q-50 0-85-35Zm45 315v-123q-104-14-172-93t-68-184h80q0 83 58.5 141.5T640-320q83 0 141.5-58.5T840-520h80q0 105-68 184t-172 93v123h-80Zm68.5-371.5Q680-503 680-520v-240q0-17-11.5-28.5T640-800q-17 0-28.5 11.5T600-760v240q0 17 11.5 28.5T640-480q17 0 28.5-11.5ZM640-640Z"/></svg>',
  'Comedy':   '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M480-280q66 0 113-47t47-113H320q0 66 47 113t113 47ZM280-600h160q0-33-23.5-56.5T360-680q-33 0-56.5 23.5T280-600Zm240 0h160q0-33-23.5-56.5T600-680q-33 0-56.5 23.5T520-600ZM480-80q-75 0-140.5-28.5t-114-77q-48.5-48.5-77-114T120-440v-440h720v440q0 75-28.5 140.5t-77 114q-48.5 48.5-114 77T480-80Zm0-80q116 0 198-82t82-198v-360H200v360q0 116 82 198t198 82Zm0-320Z"/></svg>',
};
export const CAT_LABEL = {
  'Book': 'Books', 'Game': 'Games', 'Movie': 'Movies',
  'Musician': 'Musicians', 'Music Album': 'Music Albums',
  'Show': 'Shows', 'Visual Art': 'Visual Art',
};

const CAT_EMOJI_NOTE_ICON = '<svg xmlns="http://www.w3.org/2000/svg" height="28px" viewBox="0 -960 960 960" width="28px" fill="#5B5BEF"><path d="M447-207q-47-47-47-113t47-113q47-47 113-47 23 0 42.5 5.5T640-458v-342h240v120H720v360q0 66-47 113t-113 47q-66 0-113-47ZM80-320q0-99 38-186.5T221-659q65-65 152.5-103T560-800v80q-82 0-155 31.5t-127.5 86q-54.5 54.5-86 127T160-320H80Zm160 0q0-66 25.5-124.5t69-102Q378-590 436-615t124-25v80q-100 0-170 70t-70 170h-80Z"/></svg>';
export const CAT_EMOJI = { 'Music Album': CAT_EMOJI_NOTE_ICON, Musician: CAT_EMOJI_NOTE_ICON, Show: '<svg xmlns="http://www.w3.org/2000/svg" height="28px" viewBox="0 -960 960 960" width="28px" fill="#5B5BEF"><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm120-200h80v-240h70l90 240h80l120-320H660l-60 180-60-180H200v80h120v240Z"/></svg>', Book: '<svg xmlns="http://www.w3.org/2000/svg" height="28px" viewBox="0 -960 960 960" width="28px" fill="#5B5BEF"><path d="M270-80q-45 0-77.5-30.5T160-186v-558q0-38 23.5-68t61.5-38l395-78v640l-379 76q-9 2-15 9.5t-6 16.5q0 11 9 18.5t21 7.5h450v-640h80v720H270Zm10-217 80-16v-478l-80 16v478Z"/></svg>', Movie: '<svg xmlns="http://www.w3.org/2000/svg" height="28px" viewBox="0 -960 960 960" width="28px" fill="#5B5BEF"><path d="m460-380 280-180-280-180v360ZM320-240q-33 0-56.5-23.5T240-320v-480q0-33 23.5-56.5T320-880h480q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H320ZM160-80q-33 0-56.5-23.5T80-160v-560h80v560h560v80H160Z"/></svg>', Game: '<svg xmlns="http://www.w3.org/2000/svg" height="28px" viewBox="0 -960 960 960" width="28px" fill="#5B5BEF"><path d="M182-200q-51 0-79-35.5T82-322l42-300q9-60 53.5-99T282-760h396q60 0 104.5 39t53.5 99l42 300q7 51-21 86.5T778-200q-21 0-39-7.5T706-230l-90-90H344l-90 90q-15 15-33 22.5t-39 7.5Zm526.5-251.5Q720-463 720-480t-11.5-28.5Q697-520 680-520t-28.5 11.5Q640-497 640-480t11.5 28.5Q663-440 680-440t28.5-11.5Zm-80-120Q640-583 640-600t-11.5-28.5Q617-640 600-640t-28.5 11.5Q560-617 560-600t11.5 28.5Q583-560 600-560t28.5-11.5ZM310-440h60v-70h70v-60h-70v-70h-60v70h-70v60h70v70Z"/></svg>', 'Visual Art': '<svg xmlns="http://www.w3.org/2000/svg" height="28px" viewBox="0 -960 960 960" width="28px" fill="#5B5BEF"><path d="M480-80q-82 0-155-31.5t-127.5-86Q143-252 111.5-325T80-480q0-83 32.5-156t88-127Q256-817 330-848.5T488-880q80 0 151 27.5t124.5 76q53.5 48.5 85 115T880-518q0 115-70 176.5T640-280h-74q-9 0-12.5 5t-3.5 11q0 12 15 34.5t15 51.5q0 50-27.5 74T480-80ZM303-457q17-17 17-43t-17-43q-17-17-43-17t-43 17q-17 17-17 43t17 43q17 17 43 17t43-17Zm120-160q17-17 17-43t-17-43q-17-17-43-17t-43 17q-17 17-17 43t17 43q17 17 43 17t43-17Zm200 0q17-17 17-43t-17-43q-17-17-43-17t-43 17q-17 17-17 43t17 43q17 17 43 17t43-17Zm120 160q17-17 17-43t-17-43q-17-17-43-17t-43 17q-17 17-17 43t17 43q17 17 43 17t43-17Z"/></svg>', 'Favorite Albums': '💿', 'Web Links': '🎧' };

export const CATEGORY_PLATFORMS = {
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

export const STREAMING_DOMAINS = [
  'open.spotify.com', 'spotify.com',
  'music.apple.com',
  'music.youtube.com',
  'tidal.com', 'listen.tidal.com',
  'music.amazon.com',
  'soundcloud.com',
  'deezer.com',
];

// ===== CURATED ITEMS (loaded from Firestore by storage.js) =====
export let CURATED_ITEMS = {};
export function setCuratedItems(data) { CURATED_ITEMS = data; }

// ===== STATE =====
export const state = {
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
  sidebarMode: 'categories', // 'categories' | 'curated' | 'sponsored' | 'home'
  hiddenCurated: new Set(), // curated item IDs the user has dismissed
  curatedOverrides: {}, // { [curatedItemId]: { url, title, notes, imageUrl } }
  curatedImgCache: {},  // { [curatedItemId]: imageUrl } — auto-fetched via Microlink
  curatedAlbumMetaCache: {}, // { [curatedItemId]: { year, collectionId } } — auto-fetched via iTunes (curated albums have neither field in Firestore)
  albumTrackListCache: {}, // { [collectionId]: { tracks: [{number,title,durationMs}], fetchedAt } } — auto-fetched via iTunes lookup, never expires
  artistWebsiteCache: {}, // { [normalizedArtistName]: { url: string|null, fetchedAt: number } } — auto-fetched via MusicBrainz/Wikidata
  artistBioCache: {}, // { [normalizedArtistName]: { bio: string|null, photoUrl: string|null, fetchedAt: number } } — auto-fetched via Wikipedia
  artistVideoCache: {}, // { [normalizedArtistName]: { videoId: string|null, fetchedAt: number } } — auto-fetched via YouTube Data API
  itemWikiCache: {}, // { [normalizedTitle]: { bio: string|null, photoUrl: string|null, fetchedAt: number } } — auto-fetched via Wikipedia for Book/Show/Movie/Game items
  tutorialSeen: false,
  kanbanSort: { 'in-queue': 'newest', 'in-progress': 'newest', 'my-review': 'newest', 'done': 'newest' },
  kanbanLists: [],
  activeListId: null,
  kanbanCategory: null,
};
