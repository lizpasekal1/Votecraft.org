// ===== AUTHOR / MUSICIAN PROFILE LOGIC =====
// Author-record CRUD helpers, navigation to author pages, and the artist-album-metadata
// backfill (year/collectionId/track-list resolution for Music Album items).

import { state, CURATED_ITEMS } from './state.js';
import { persistAuthor, persistItem, persistCuratedAlbumMetaCache, persistAlbumTrackListCache } from './storage.js';
import { ensureArtistWebsite, ensureArtistWikipediaInfo, fetchAlbumsFromItunes } from './api.js';
import { isItunesArtworkUrl, applyArtistPhotoToItem, patchCardImage } from './utils.js';
import { persistViewState } from './storage.js';
import { renderSidebar, renderGrid } from './render.js';
import { renderAuthorPage } from './render.js';
import { openDetailModal } from './detailModal.js';

export function findAuthor(name, category) {
  return state.authors.find(a => a.name === name && a.category === category) ?? null;
}

// When a user queues or saves any Music Album item for the first time, the artist is
// automatically added to their Musicians saves — pulling iTunes URL/cover art from curated
// Firestore data if available, then enriching further via MusicBrainz/Wikipedia in the background.
export async function autoSaveMusician(artistName) {
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

export async function navigateToAuthor(name, category) {
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
export function resolveMusicianItem(name) {
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
export function getKnownAlbumsForArtist(name) {
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
export function wireCardAuthorLinks(container) {
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

const _albumYearBackfillAttempted = new Set();
export async function backfillAlbumYears(artistName, items) {
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
export async function resolveAlbumCollectionId(item) {
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
export async function ensureAlbumTrackList(item) {
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
