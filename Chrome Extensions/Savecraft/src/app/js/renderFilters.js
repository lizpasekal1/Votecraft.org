// ===== ITEM FILTERING / SORTING =====

import { state, CURATED_ITEMS, CATEGORIES, PRIMARY_FOLDER_ID } from './state.js';
import {
  SPLIT_TITLE_CREATOR_CATEGORIES, splitCuratedTitleCreator, getStaticCuratedCreator,
} from './curatedCreatorLookup.js';
import { isItunesArtworkUrl } from './utils.js';

// An item counts as belonging to a category's primary folder if it's actually filed there, or
// if it has no folder at all (un-foldered items are treated as primary so nothing already-saved
// appears to vanish). Categories with no primary folder (e.g. Visual Art) match on category alone.
// Shared by the top-level tab filter, the primary-folder-clicked-directly case, and both sidebar
// count calculations below — previously duplicated inline at each of those four call sites.
export function matchesPrimaryOrUnfoldered(item, category) {
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
  } else if (state.view.startsWith('savedlist:')) {
    // Sidebar's Saved Lists child rows (Favorites/Health/Motivation/anything user-added) — set
    // via the detail modal's star "Save to:" menu (detailModalHeader.js's _toggleSaveToMenu()),
    // checkbox-style so an item can belong to several lists at once. default-favorites (checked
    // by id, not display name — "Favorites" is renameable, e.g. to "All Saves") drives the
    // existing item.favorite boolean (matching _isListSelected()'s own id check there); every
    // other list matches against item.savedListIds (an array, not a single id). An id that no
    // longer matches any state.savedLists entry (list was since removed) shows empty rather than
    // falling through to "all".
    const listId = state.view.slice(10);
    const list = state.savedLists.find(l => l.id === listId);
    items = !list ? [] : listId === 'default-favorites'
      ? items.filter(i => i.favorite)
      : items.filter(i => (i.savedListIds || []).includes(listId));
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
