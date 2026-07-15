// Resolves a curated Top 100 item's creator name — the logic half of the Movie/Show/Game
// creator-card system (see curatedCreatorData.js for the actual data this reads).
import { CURATED_MOVIE_DIRECTOR, CURATED_SHOW_CREATOR, CURATED_GAME_STUDIO } from './curatedCreatorData.js';

// Curated Top 100 Book/Movie/Game/Show items store "Title — Creator" combined in a single
// .title field (with the real plot synopsis/description in .notes) — unlike Music Album, which
// gets a clean title plus the artist name separately in .notes. Confirmed the same combined-title
// convention applies to Book (Movie/Game/Show titles turned out to be plain — see
// getStaticCuratedCreator below for how those resolve creator names instead).
export const SPLIT_TITLE_CREATOR_CATEGORIES = ['Book', 'Movie', 'Game', 'Show'];
export function splitCuratedTitleCreator(title) {
  const idx = title?.indexOf(' — ');
  if (idx == null || idx === -1) return { title, author: null };
  return { title: title.slice(0, idx), author: title.slice(idx + 3) };
}

// Movie/Show/Game curated items have no creator embedded in Firestore at all (unlike Book's
// combined title) — resolved externally and kept as static in-app data (curatedCreatorData.js).
// `name` stays the clean director/creator/studio name (used for navigation/matching); `hasMore`
// flags a co-directed movie so renderers can append a "…" purely for display, without corrupting
// the name used to link back to that director's own page.
export function getStaticCuratedCreator(cat, title) {
  if (cat === 'Movie') {
    const entry = CURATED_MOVIE_DIRECTOR[title];
    return entry ? { name: entry.name, hasMore: entry.coDirectorCount > 1 } : null;
  }
  if (cat === 'Show') {
    const name = CURATED_SHOW_CREATOR[title];
    return name ? { name, hasMore: false } : null;
  }
  if (cat === 'Game') {
    const name = CURATED_GAME_STUDIO[title];
    return name ? { name, hasMore: false } : null;
  }
  return null;
}
