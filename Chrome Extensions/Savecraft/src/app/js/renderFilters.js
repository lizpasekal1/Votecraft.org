// ===== ITEM FILTERING / SORTING =====

import { state, CURATED_ITEMS, CATEGORIES, PRIMARY_FOLDER_ID, MUSIC_ALL_LABEL } from './state.js';
import {
  SPLIT_TITLE_CREATOR_CATEGORIES, splitCuratedTitleCreator, getStaticCuratedCreator,
} from './curatedCreatorLookup.js';
import { isItunesArtworkUrl, isQueueDemoId } from './utils.js';
import { bucketForMusicianItem } from './authors.js';

// An item counts as belonging to a category's primary folder if it's actually filed there, or
// if it has no folder at all (un-foldered items are treated as primary so nothing already-saved
// appears to vanish). Categories with no primary folder (e.g. Visual Art) match on category alone.
// Shared by the top-level tab filter, the primary-folder-clicked-directly case, and both sidebar
// count calculations below — previously duplicated inline at each of those four call sites.
export function matchesPrimaryOrUnfoldered(item, category) {
  const primaryId = PRIMARY_FOLDER_ID[category];
  return item.category === category && (!primaryId || item.folderId === primaryId || !item.folderId);
}

// Whether `item` (already normalized to have .category/.folderId, personal or curated alike)
// belongs in `folderId`'s bucket within `category` — the primary folder catches un-foldered items
// too (matchesPrimaryOrUnfoldered's own rule above), any other folder needs an exact item.folderId
// match. Used by the new curated-folder-picker machinery below (getCuratedCategoryFolderCounts,
// and the genre: branch's own folder-drilldown filter) — same membership rule
// getCategoryFolderCounts/the plain-folder-page branch already apply to personal items, just
// exposed as a reusable function instead of only inlined at those two call sites.
export function matchesFolder(item, category, folderId) {
  return PRIMARY_FOLDER_ID[category] === folderId
    ? matchesPrimaryOrUnfoldered(item, category)
    : item.category === category && item.folderId === folderId;
}

// Whether item belongs to the currently active Saved List scope (state.activeSavedListId) —
// trivially true when nothing's scoped. Shared by getFilteredSortedItems()'s category/folder
// branches below and renderSidebar.js's own folder/subfolder count badges, so there's exactly one
// implementation of "does this item belong to the currently-scoped Saved List" rather than the
// same membership check copy-pasted at each call site.
export function matchesActiveSavedListScope(item) {
  return !state.activeSavedListId || (item.savedListIds || []).includes(state.activeSavedListId);
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
  // REAL BUG, found and fixed: the queue-demo-N cards seeded for the Kanban board demo
  // (storage.js's _seedQueueDemoItems) live in state.items with a real `category`, spreading
  // them across every category too — since they're placeholder cards with url:null (never meant
  // to be browsable "saved items"), renderCard() crashed (`getDomain(null)[0]`) the moment one
  // showed up in a normal category grid, silently leaving that view's previous DOM (often the
  // Dashboard, whichever view was open before) on screen instead of the real content. Excluded
  // here, at the single shared source every view/category/search filters from, rather than
  // patched per-view.
  let items = state.items.filter(item => !isQueueDemoId(item.id));

  if (state.view === 'all') {
    // no filter
  } else if (state.view.startsWith('genre:')) {
    const parts = state.view.slice(6).split(':');
    const genre = parts[0];
    const cat = parts[1];
    // A 3rd segment (genre:<genre>:<category>:<folderId>) is a curated folder-picker drilldown one
    // level deeper than the plain genre:<genre>:<category> list — renderCuratedCategoryFolderLanding
    // (renderGrid.js) is what links a folder card here. Undefined for the plain 2-part shape.
    const folderId = parts[2];
    if (cat && CURATED_ITEMS[genre] && CURATED_ITEMS[genre][cat]) {
      items = CURATED_ITEMS[genre][cat]
        .filter(i => !state.hiddenCurated.has(i.id))
        .map(i => {
          const override = state.curatedOverrides[i.id] || {};
          // folderId: real now (i.folderId, threaded from Firestore by _loadCuratedFromFirestore —
          // storage.js) for the handful of curated items that have been explicitly filed into a
          // folder (e.g. the Shows->Movie/Series retag); null for every other curated item, same
          // as before this field existed.
          const base = { ...i, ...override, category: cat, done: false, savedAt: 0, folderId: i.folderId || null, curated: true };
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
        })
        // Folder-scoped drilldown (3-part view shape) — same primary-folder-catches-unfoldered
        // rule personal folder pages use (matchesFolder above). No-op (keeps every item) for the
        // plain 2-part genre:<genre>:<category> shape, where folderId is undefined.
        .filter(base => !folderId || matchesFolder(base, cat, folderId));
    } else {
      items = [];
    }
  } else if (state.view.startsWith('savedlist:')) {
    // Sidebar's Saved Lists child rows (Favorites/Health/Motivation/anything user-added) — set
    // via the detail modal's star "Save to:" menu (detailModalHeader.js's _toggleSaveToMenu()),
    // checkbox-style so an item can belong to several lists at once. default-favorites (checked
    // by id, not display name — "Favorites" is renameable, e.g. to "All My Saves") drives the
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
  } else if (state.view.startsWith('musicgenre:')) {
    // Music landing page drill-in (renderGrid.js's renderMusicGenreLanding()) — same base set the
    // plain 'Musician' category view uses, further narrowed to one of the 15 genre buckets (see
    // bucketForMusicianItem, authors.js, and MUSIC_GENRE_BUCKET_MAP, state.js). Deliberately not
    // `genre:` — that prefix is SaveCraft's own unrelated curated-content-browsing concept
    // (handled above), so this uses a distinct `musicgenre:` prefix to avoid colliding with it.
    const bucket = state.view.slice(11);
    items = items.filter(i => matchesPrimaryOrUnfoldered(i, 'Musician'));
    // "All Music" (the landing grid's own pinned-first card, MUSIC_ALL_LABEL) isn't a real bucket
    // — every musician, no further narrowing — so every real bucket still routes through the same
    // one page/dropdown instead of a genuinely different destination (reported live: clicking it
    // landed somewhere with no genre dropdown at all).
    if (bucket !== MUSIC_ALL_LABEL) items = items.filter(i => bucketForMusicianItem(i) === bucket);
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

  // Browsing a category or folder "inside" a Saved List (renderSidebar.js preserves
  // state.activeSavedListId across category/subfolder clicks) — narrow down to just that list's
  // items, via the same membership check the savedlist: branch above already uses. Applied once
  // here (only the two branches above can actually reach this with activeSavedListId set) rather
  // than duplicated into each one. default-favorites never sets this field (it's the unrestricted
  // catch-all), so no favorite/savedListIds ambiguity.
  if (state.activeSavedListId) items = items.filter(matchesActiveSavedListScope);

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

// Counts for the Music landing page's 15 genre-bucket cards, including the pinned-first "All
// Music" card's own total (renderGrid.js's renderMusicGenreLanding()) — one pass over state.items,
// not two: `counts` (grouped by bucketForMusicianItem) and `total` (every saved musician,
// unfiltered) used to be two separate exported functions that each independently re-filtered the
// exact same base set (matchesPrimaryOrUnfoldered + matchesActiveSavedListScope + queue-demo
// exclusion) every render, purely because they were built one request apart. Musicians with no
// bucket (unmapped/unresolved genre) still count toward `total` but not toward any bucket in
// `counts` — same "not lost, just not genre-browsable" behavior as the musicgenre: filter branch
// above.
export function getMusicGenreBucketCounts() {
  const counts = {};
  let total = 0;
  state.items
    .filter(i => !isQueueDemoId(i.id) && matchesPrimaryOrUnfoldered(i, 'Musician') && matchesActiveSavedListScope(i))
    .forEach(i => {
      total++;
      const bucket = bucketForMusicianItem(i);
      if (bucket) counts[bucket] = (counts[bucket] || 0) + 1;
    });
  return { counts, total };
}

// Per-folder save counts for a category's folder-picker landing page
// (renderCategoryFolderLanding(), renderGrid.js) — every real subfolder of `category`
// (state.folders), each counted using the exact same membership rule its own folder page already
// uses if clicked directly (getFilteredSortedItems()'s own folder branch, below): the primary
// folder's count includes un-foldered items too (matchesPrimaryOrUnfoldered), same as clicking it
// directly does, so the number on the card matches what you'll actually see one click later; every
// other folder counts only items actually filed there.
// The user's own most-recently-saved items in `category` — for that category's own carousel
// (renderCategoryFolderLanding, renderGrid.js), per direct request ("update the carousels on the
// category pages to actually show the recent saves from those sections"). Same isQueueDemoId/
// Saved-List-scope exclusions every other item list here uses. Empty (not a fallback itself) when
// the user hasn't saved anything in this category yet — the caller falls back to the existing
// generic favorites/demo carousel content in that case, per direct follow-up ("if not then just
// keep showing the demo content").
export function getRecentCategoryItems(category, limit = 10) {
  return state.items
    .filter(i => !isQueueDemoId(i.id) && i.category === category && matchesActiveSavedListScope(i))
    .sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0))
    .slice(0, limit);
}

export function getCategoryFolderCounts(category) {
  const counts = {};
  state.folders
    .filter(f => f.parentCategory === category)
    .forEach(folder => {
      const isPrimary = PRIMARY_FOLDER_ID[category] === folder.id;
      counts[folder.id] = state.items.filter(i => !isQueueDemoId(i.id) && matchesActiveSavedListScope(i) &&
        (isPrimary ? matchesPrimaryOrUnfoldered(i, category) : i.folderId === folder.id)
      ).length;
    });
  return counts;
}

// Curated-data equivalent of getCategoryFolderCounts() above, for the new curated folder-picker
// landing page (renderCuratedCategoryFolderLanding, renderGrid.js) — same per-folder counting idea,
// same primary-folder-catches-unfoldered rule (via matchesFolder), just sourced from
// CURATED_ITEMS[genre][category] instead of state.items (curated items have no Saved-List scoping
// or queue-demo placeholders to exclude, so this is simpler than its personal-item counterpart).
export function getCuratedCategoryFolderCounts(genre, category) {
  const counts = {};
  const rawItems = CURATED_ITEMS[genre]?.[category] || [];
  state.folders
    .filter(f => f.parentCategory === category)
    .forEach(folder => {
      counts[folder.id] = rawItems.filter(i => matchesFolder({ category, folderId: i.folderId || null }, category, folder.id)).length;
    });
  return counts;
}
