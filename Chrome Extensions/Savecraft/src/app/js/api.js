// ===== EXTERNAL API CALLS =====
// iTunes, Wikipedia, MusicBrainz/Wikidata, YouTube — every fetch() to a third-party service
// lives here. No DOM/rendering logic.

import { state } from './state.js';
import {
  persistArtistBioCache, persistArtistWebsiteCache, persistArtistGenreCache, persistItemWikiCache,
  persistLastfmCache, persistSteamCache, persistCreatorCache,
} from './storage.js';
import { getYoutubeVideoId, getVimeoVideoId } from './utils.js';

// Shared check for "does this Wikidata/Wikipedia result actually describe a musician/band" —
// used to reject same-name but wrong-topic matches (e.g. "Eagles" the bird) rather than guessing.
const MUSIC_ENTITY_KEYWORDS = /\b(band|singer|musician|rapper|duo|group|composer|songwriter|dj)\b/i;

const ARTIST_WEBSITE_CACHE_MISS_TTL = 90 * 24 * 60 * 60 * 1000; // 90 days
const ARTIST_BIO_CACHE_MISS_TTL = 90 * 24 * 60 * 60 * 1000; // 90 days
const ARTIST_GENRE_CACHE_MISS_TTL = 90 * 24 * 60 * 60 * 1000; // 90 days
const ITEM_WIKI_CACHE_MISS_TTL = 90 * 24 * 60 * 60 * 1000; // 90 days

// REAL BUG, found and fixed: a 403 from iTunes (confirmed live via a DevTools screenshot — a
// per-client/IP throttle, not the endpoint being down; a plain server-side curl to the same
// endpoint succeeded) used to just get silently retried on every subsequent call, flooding the
// console with hundreds of doomed requests instead of backing off. Shared across every
// itunes.apple.com call in this file (search-for-albums, musicArtist genre lookup, ...) — a 403 on
// any one of them almost certainly means the whole domain is throttled for this client right now,
// not just that one endpoint. Session-only (not persisted) — a page reload clears it, but the
// very first real 403 after that reload re-trips it immediately.
const ITUNES_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
let _itunesBlockedUntil = 0;
export function isItunesRateLimited() {
  return Date.now() < _itunesBlockedUntil;
}

// Every itunes.apple.com call in this file (search-for-albums, musicArtist genre lookup, the
// Add-modal typeahead searches, artist-photo lookup, ...) goes through this one helper — REAL BUG,
// found and fixed: the breaker used to be checked/tripped by hand inside two of the seven call
// sites (fetchAlbumsFromItunes, ensureArtistGenre), while the other five (searchMusicians,
// searchMusicAlbums, searchShows, fetchArtistPhotoFromItunes) quietly kept hitting iTunes even
// while the breaker was open, undermining the whole point of it and making the domain-wide
// throttle worse. Throws on a rate-limited breaker or a non-ok response; every caller here already
// wraps its own call in a try/catch (either locally or up the call chain) and treats a thrown error
// as "no result", so a shared throw-based contract needs no per-caller special-casing.
//
// One free retry on a genuine network-level failure (fetch() itself rejecting — connection
// dropped/reset, DNS hiccup, "Load failed" in Safari/"Failed to fetch" in Chrome) — reported live:
// fetchAlbumsFromItunes's own request is far heavier than this file's other iTunes calls (up to 200
// unfiltered results, since it has to search broadly then filter down to the exact artist
// client-side — see fetchAlbumsModal.js), and a large response is more likely to get cut off
// mid-transfer on a weak/flaky connection than the small ones (search typeahead, single-artist
// genre lookup) that were succeeding right alongside it on the same device/network. A short pause
// then one retry is usually enough to ride out a transient drop like that. Deliberately NOT applied
// to a real HTTP error (resp.status, e.g. 403/500) or the breaker being open — neither of those
// fixes itself by immediately trying again, so they still throw straight through on the first try.
async function itunesFetch(url) {
  if (isItunesRateLimited()) throw new Error('iTunes API rate-limited — breaker open');
  let resp;
  try {
    resp = await fetch(url);
  } catch (err) {
    if (!(err instanceof TypeError)) throw err;
    await new Promise(r => setTimeout(r, 1200));
    resp = await fetch(url); // one retry; a second failure here just throws normally
  }
  if (resp.status === 403) _itunesBlockedUntil = Date.now() + ITUNES_COOLDOWN_MS;
  if (!resp.ok) throw new Error(`iTunes API error: ${resp.status}`);
  return resp.json();
}

// iTunes's Search API has no dedicated "artist photo" field — the closest available image is
// an album cover, so we use the most relevant album's artwork as a stand-in for the artist photo.
export async function fetchArtistPhotoFromItunes(artistName) {
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(artistName)}&entity=album&media=music&limit=5`;
    const data = await itunesFetch(url);
    const lowerName = artistName.trim().toLowerCase();
    const match = data.results.find(r => r.collectionType && r.artistName?.toLowerCase() === lowerName)
      || data.results.find(r => r.collectionType);
    return match?.artworkUrl100?.replace('100x100bb', '300x300bb') || null;
  } catch {
    return null;
  }
}

export async function fetchAlbumsFromItunes(artistName) {
  // limit=200 (iTunes' max) used to be requested outright — reported live: this is by far the
  // heaviest request this file makes (a broad term match, filtered down to the exact artist
  // client-side, not a targeted lookup), and the one request failing with a raw network-level
  // error on a phone where every lighter iTunes call on the same device/network succeeded. Trimmed
  // to a smaller response as a mitigation regardless of the exact root cause — 100 raw (pre-filter)
  // hits already comfortably covers even a prolific artist's real discography once narrowed down to
  // just their own collectionType results, so this shouldn't cost real coverage in practice.
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(artistName)}&entity=album&media=music&limit=100`;
  const data = await itunesFetch(url);
  return data.results
    .filter(r => r.collectionType)
    .sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate))
    .map(r => ({
      title: r.collectionName,
      artist: r.artistName,
      year: r.releaseDate ? r.releaseDate.slice(0, 4) : '',
      imageUrl: r.artworkUrl100?.replace('100x100bb', '600x600bb') || null,
      url: r.collectionViewUrl || null,
      genre: r.primaryGenreName || null,
      type: r.collectionType,
      collectionId: r.collectionId || null,
    }));
}

// ===== STEP 1 SEARCH (Add-modal category typeahead) =====
// Each function takes a raw search term and returns a normalized result array:
// { title, author, imageUrl, imageUrlLarge, url, year, meta }. No caching here — unlike the
// ensure*WikipediaInfo functions below, these are live typeahead queries, not enrichment
// lookups, so there's nothing worth persisting.

export async function searchMusicians(term) {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=musicArtist&limit=8`;
  const data = await itunesFetch(url);
  return (data.results || []).map(r => ({
    title: r.artistName,
    author: null,
    imageUrl: null, // no artwork on this entity — photo arrives later via ensureArtistWikipediaInfo
    imageUrlLarge: null,
    url: r.artistLinkUrl || null,
    year: null,
    meta: r.primaryGenreName || null,
  }));
}

// Generalizes the fetch logic that used to live only in handleAuthorItunesLookup — same
// endpoint/params, but no longer filtered to "artist name starts with the typed word" (that
// heuristic only made sense when the search box was specifically an Author field).
export async function searchMusicAlbums(term) {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=album&media=music&limit=15`;
  const data = await itunesFetch(url);
  return data.results
    .filter(r => r.collectionType)
    .filter(r => !/\s[-–]\s*(single|ep)\s*$/i.test(r.collectionName))
    .slice(0, 8)
    .map(r => ({
      title: r.collectionName,
      author: r.artistName,
      imageUrl: r.artworkUrl100?.replace('100x100bb', '600x600bb') || null,
      imageUrlLarge: r.artworkUrl100?.replace('100x100bb', '600x600bb') || null,
      url: r.collectionViewUrl || null,
      year: r.releaseDate?.slice(0, 4) || null,
      meta: [r.artistName, r.releaseDate?.slice(0, 4)].filter(Boolean).join(' · ') || null,
    }));
}

// Each iTunes tvSeason result is one season; dedupe by artistId (stable per-show) and keep
// the first (most relevant) season per show, presenting the show itself as the result.
export async function searchShows(term) {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=tvSeason&media=tvShow&country=US&limit=10`;
  const data = await itunesFetch(url);
  const seen = new Set();
  const shows = [];
  for (const r of (data.results || [])) {
    if (!r.artistId || seen.has(r.artistId)) continue;
    seen.add(r.artistId);
    shows.push({
      title: r.artistName,
      author: null,
      imageUrl: r.artworkUrl100?.replace('100x100bb', '600x600bb') || null,
      imageUrlLarge: r.artworkUrl100?.replace('100x100bb', '600x600bb') || null,
      url: r.artistViewUrl || null,
      year: r.releaseDate?.slice(0, 4) || null,
      meta: r.releaseDate ? r.releaseDate.slice(0, 4) : null,
    });
  }
  return shows.slice(0, 8);
}

export async function searchBooks(term) {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(term)}&limit=8&fields=title,author_name,first_publish_year,cover_i,key`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Open Library error: ${resp.status}`);
  const data = await resp.json();
  return (data.docs || []).map(d => ({
    title: d.title,
    author: d.author_name?.[0] || null,
    imageUrl: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : null,
    imageUrlLarge: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : null,
    url: d.key ? `https://openlibrary.org${d.key}` : null,
    year: d.first_publish_year ? String(d.first_publish_year) : null,
    meta: [d.author_name?.[0], d.first_publish_year].filter(Boolean).join(' · ') || null,
  }));
}

export async function searchGames(term) {
  const url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(term)}&l=english&cc=US`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Steam error: ${resp.status}`);
  const data = await resp.json();
  return (data.items || []).slice(0, 8).map(it => ({
    title: it.name,
    author: null,
    imageUrl: it.tiny_image || `https://cdn.akamai.steamstatic.com/steam/apps/${it.id}/header.jpg`,
    imageUrlLarge: `https://cdn.akamai.steamstatic.com/steam/apps/${it.id}/library_600x900.jpg`,
    url: `https://store.steampowered.com/app/${it.id}/`,
    year: null,
    meta: null,
  }));
}

// Movie typeahead via Wikipedia's generator=search (richer than plain opensearch — returns a
// thumbnail + one-line description per result in a single request). Distinct from
// fetchItemWikipediaSummary/ensureItemWikipediaInfo below, which fetch ONE page's full summary
// for enrichment after a title is already chosen, not a multi-result live search. iTunes has no
// working movie search anymore (Apple sunset movie purchases from this API — verified live,
// zero results for well-known titles across every entity/media combination), so Wikipedia is
// the only viable free source here.
export async function searchMoviesWikipedia(term) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(term + ' film')}&gsrlimit=6&prop=pageimages|description&pithumbsize=100&format=json&origin=*`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Wikipedia error: ${resp.status}`);
  const data = await resp.json();
  const pages = Object.values(data.query?.pages || {});
  // query.pages is an object keyed by pageid, not an array — order isn't guaranteed to match
  // search relevance. MediaWiki's generator=search response includes an `index` field per page
  // reflecting rank; sort by it defensively (falls back to insertion order if ever absent).
  pages.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  return pages.map(p => ({
    title: p.title,
    author: null,
    imageUrl: p.thumbnail?.source || null,
    imageUrlLarge: p.thumbnail?.source || null,
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(p.title.replace(/ /g, '_'))}`,
    year: null,
    meta: p.description || null,
  }));
}

// Show's search is iTunes-first (searchShows above) since it returns real artwork/year inline —
// this is only called as a fallback when iTunes has nothing (older/indie/non-US shows its TV
// catalog doesn't cover), same shape/pattern as searchMoviesWikipedia just biased toward TV
// series instead of film.
export async function searchShowsWikipedia(term) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(term + ' TV series')}&gsrlimit=6&prop=pageimages|description&pithumbsize=100&format=json&origin=*`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Wikipedia error: ${resp.status}`);
  const data = await resp.json();
  const pages = Object.values(data.query?.pages || {});
  pages.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  return pages.map(p => ({
    title: p.title,
    author: null,
    imageUrl: p.thumbnail?.source || null,
    imageUrlLarge: p.thumbnail?.source || null,
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(p.title.replace(/ /g, '_'))}`,
    year: null,
    meta: p.description || null,
  }));
}

// This is the shared low-level fetch every Wikipedia lookup in this file funnels through (up to
// 6 calls per single artist/item lookup once the search-fallback candidates are counted), and
// render.js's fetchMissingCuratedMusicianPhotos() can fire dozens of these back-to-back with no
// pacing when a curated Musician grid renders (e.g. Top 100's 100 artists). A 429 here used to
// look identical to a genuine "no Wikipedia page" — silently returning null, which every ensure*
// caller then caches as a 90-day miss, permanently hiding a real artist's photo/bio just because
// it happened to be rate-limited on first render. Retries a 429 with backoff before giving up
// (can't set a real User-Agent here — browsers silently drop script-set User-Agent headers on
// fetch(), unlike the Node-based admin scripts elsewhere in this project, so pacing/backoff is
// the only lever actually available in this environment).
async function fetchWikipediaSummary(title) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}?redirect=true`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const resp = await fetch(url);
      if (resp.status === 429) {
        await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
        continue;
      }
      if (!resp.ok) return null;
      return await resp.json();
    } catch {
      return null;
    }
  }
  return null;
}

// Direct-source thumbnail lookup for a curated item whose `.url` already points at a Wikipedia
// article (common for curated Movie/Book/Show/Game items — see fetchMissingCuratedImages() in
// render.js) — pulls the poster/cover straight from Wikipedia's own REST summary instead of
// depending on Microlink, which is a shared third-party quota that curated-image fetching
// shouldn't be the sole thing at the mercy of. Returns null for a non-Wikipedia url or no image.
export async function fetchWikipediaThumbnailForUrl(url) {
  const match = /^https?:\/\/en\.wikipedia\.org\/wiki\/([^?#]+)/.exec(url || '');
  if (!match) return null;
  const summary = await fetchWikipediaSummary(decodeURIComponent(match[1]));
  return summary?.originalimage?.source || summary?.thumbnail?.source || null;
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

// Looks up a short bio paragraph AND a photo via Wikipedia (both come from the same page
// summary, so they're fetched together). Rejects (returns nulls rather than guessing) any
// candidate page whose description/extract doesn't read as being about a musician/band, to
// avoid pulling in data about an unrelated same-named topic (e.g. "Eagles" the bird). Falls
// back to an iTunes album-cover stand-in for the photo only if Wikipedia has no image at all.
export async function ensureArtistWikipediaInfo(artistName) {
  if (!artistName) return { bio: null, photoUrl: null, wikiUrl: null };
  const key = artistName.trim().toLowerCase();
  const cached = state.artistBioCache[key];
  // 'wikiUrl' in cached: entries cached before that field existed force one refetch to backfill
  // it, rather than being treated as a permanent hit that silently never picks it up.
  if (cached && 'wikiUrl' in cached && ((cached.bio || cached.photoUrl) || (Date.now() - cached.fetchedAt < ARTIST_BIO_CACHE_MISS_TTL))) {
    return { bio: cached.bio || null, photoUrl: cached.photoUrl || null, wikiUrl: cached.wikiUrl || null };
  }
  const summary = await fetchArtistWikipediaSummary(artistName);
  let photoUrl = summary?.thumbnail?.source || summary?.originalimage?.source || null;
  if (!photoUrl) photoUrl = await fetchArtistPhotoFromItunes(artistName);
  const result = { bio: summary?.extract || null, photoUrl, wikiUrl: summary?.content_urls?.desktop?.page || null };
  state.artistBioCache[key] = { ...result, fetchedAt: Date.now() };
  persistArtistBioCache();
  return result;
}

// Keyword validators + search-query hints per category — same "confirm the topic before
// trusting it" approach as isMusicEntitySummary/fetchArtistWikipediaSummary above, so a generic
// title (e.g. a movie called "Up" or "Cars") doesn't pull in the wrong same-named Wikipedia page.
const CATEGORY_WIKI_KEYWORDS = {
  Movie: /\b(film|movie)\b/i,
  Show: /\b(television series|tv series|television show|web series)\b/i,
  Game: /\b(video game)\b/i,
  Book: /\b(novel|book|memoir)\b/i,
};
const CATEGORY_WIKI_SEARCH_HINT = {
  Movie: 'film',
  Show: 'TV series',
  Game: 'video game',
  Book: 'novel',
};

function isCategoryEntitySummary(summary, category) {
  if (!summary || summary.type === 'disambiguation') return false;
  const keywords = CATEGORY_WIKI_KEYWORDS[category];
  return keywords ? keywords.test(`${summary.description || ''} ${summary.extract || ''}`) : true;
}

// Returns a validated (confirmed-topic) Wikipedia summary for a Book/Show/Movie/Game title, or
// null if nothing matching that category is found — mirrors fetchArtistWikipediaSummary.
async function fetchItemWikipediaSummary(title, category) {
  const direct = await fetchWikipediaSummary(title);
  if (isCategoryEntitySummary(direct, category)) return direct;

  const hint = CATEGORY_WIKI_SEARCH_HINT[category];
  if (!hint) return null;
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(title + ' ' + hint)}&format=json&origin=*`;
    const resp = await fetch(searchUrl);
    if (!resp.ok) return null;
    const data = await resp.json();
    for (const result of (data.query?.search || []).slice(0, 5)) {
      const candidate = await fetchWikipediaSummary(result.title);
      if (isCategoryEntitySummary(candidate, category)) return candidate;
    }
  } catch { /* no confirmed match found */ }
  return null;
}

// Fallback image + summary source for Book/Show/Movie/Game items that don't have one saved —
// looked up by the item's own title (no author/artist involved), validated against the item's
// category so a wrong same-named topic isn't accepted. Cached indefinitely on success; cached
// "not found" results expire after ITEM_WIKI_CACHE_MISS_TTL.
export async function ensureItemWikipediaInfo(title, category) {
  if (!title) return { bio: null, photoUrl: null, wikiUrl: null };
  const key = `${category}:${title}`.trim().toLowerCase();
  const cached = state.itemWikiCache[key];
  // 'wikiUrl' in cached: entries cached before that field existed force one refetch to backfill
  // it, rather than being treated as a permanent hit that silently never picks it up.
  if (cached && 'wikiUrl' in cached && ((cached.bio || cached.photoUrl) || (Date.now() - cached.fetchedAt < ITEM_WIKI_CACHE_MISS_TTL))) {
    return { bio: cached.bio || null, photoUrl: cached.photoUrl || null, wikiUrl: cached.wikiUrl || null };
  }
  const summary = await fetchItemWikipediaSummary(title, category);
  const result = {
    bio: summary?.extract || null,
    photoUrl: summary?.thumbnail?.source || summary?.originalimage?.source || null,
    wikiUrl: summary?.content_urls?.desktop?.page || null,
  };
  state.itemWikiCache[key] = { ...result, fetchedAt: Date.now() };
  persistItemWikiCache();
  return result;
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

export async function fetchArtistWebsite(artistName) {
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

// Lucene field-query syntax (releasegroup:"..." AND artist:"...") breaks if the title/artist
// itself contains a literal double-quote — strip rather than escape, simplest safe fix.
const _luceneSafe = s => s.replace(/"/g, '');

// Release-group search picks one abstract album rather than per-pressing releases (no need to
// disambiguate country/format/deluxe-edition variants). MusicBrainz already sorts hits by
// relevance `score` (0-100) — trust that ordering, but only accept the top hit on a confident
// match (exact case-insensitive title+artist, or score >= 90); anything weaker returns null
// rather than risking art from the wrong album. Retries a 429 with backoff, same idiom as
// fetchWikipediaSummary above (browsers drop script-set User-Agent on fetch(), so pacing/backoff
// is the only lever available here).
async function fetchReleaseGroupId(artist, title) {
  const query = `releasegroup:"${_luceneSafe(title)}" AND artist:"${_luceneSafe(artist)}"`;
  const url = `https://musicbrainz.org/ws/2/release-group/?query=${encodeURIComponent(query)}&fmt=json&limit=5`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const resp = await fetch(url);
    if (resp.status === 429) {
      await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
      continue;
    }
    if (!resp.ok) return null;
    const data = await resp.json();
    const groups = data['release-groups'] || [];
    if (!groups.length) return null;
    const lowerTitle = title.trim().toLowerCase();
    const lowerArtist = artist.trim().toLowerCase();
    const exact = groups.find(g => g.title?.toLowerCase() === lowerTitle
      && g['artist-credit']?.some(ac => ac.name?.toLowerCase() === lowerArtist));
    const best = exact || groups.find(g => (g.score || 0) >= 90);
    return best?.id || null;
  }
  return null;
}

// Front first, then Back, then API order; capped at 20 (booklet/insert scans can run long for
// boxed sets).
function _normalizeCaaImages(images) {
  const rank = t => (t === 'Front' ? 0 : t === 'Back' ? 1 : 2);
  return (images || [])
    .map(img => ({
      full: img.image,
      thumb: img.thumbnails?.small || img.thumbnails?.['250'] || img.image,
      type: img.types?.[0] || 'Image',
    }))
    .sort((a, b) => rank(a.type) - rank(b.type))
    .slice(0, 20);
}

// Higher-quality, multi-image album art (front, back, booklet/insert pages, etc.) via MusicBrainz
// + the Cover Art Archive — supplements the single low-res iTunes artwork already used elsewhere.
// Returns [] for "confirmed no extra art" (no MusicBrainz match, or CAA 404 for that
// release-group) — safe for the caller to cache permanently. Throws on a genuine network/5xx
// failure so the caller can tell "not found" apart from "couldn't check" and avoid caching a
// transient failure as a dead end. Deliberately does not fall back to a per-release search on a
// CAA 404 — the release-group endpoint already aggregates art from any release in the group, and
// a second MusicBrainz call would add rate-limit exposure for marginal benefit.
export async function fetchAlbumArtFromMusicBrainz(artist, title) {
  if (!artist || !title) return [];
  const mbid = await fetchReleaseGroupId(artist, title);
  if (!mbid) return [];
  const resp = await fetch(`https://coverartarchive.org/release-group/${mbid}`);
  if (resp.status === 404) return [];
  if (!resp.ok) throw new Error(`Cover Art Archive error: ${resp.status}`);
  const data = await resp.json();
  return _normalizeCaaImages(data.images);
}

// Looks up an artist's official homepage via MusicBrainz (preferred) then Wikidata (fallback).
// Cached indefinitely on success; cached "not found" results expire after ARTIST_WEBSITE_CACHE_MISS_TTL.
export async function ensureArtistWebsite(artistName) {
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

// Looks up an artist's genre via iTunes' musicArtist search (the same endpoint/field
// searchMusicians already uses as its typeahead subtitle, api.js above — just a dedicated
// single-artist lookup here instead, since that one's result gets discarded once a search result
// is picked). iTunes only exposes one genre per artist, not a list — this returns a single string
// or null, never an array. Cached indefinitely on success; cached "not found" results expire
// after ARTIST_GENRE_CACHE_MISS_TTL, mirroring ensureArtistWebsite above exactly. A transient
// failure (network error, or any non-ok response) is never cached as a miss — only a genuine
// successful response (even one with zero results) is a stable enough fact to cache for 90 days.
export async function ensureArtistGenre(artistName) {
  if (!artistName) return null;
  const key = artistName.trim().toLowerCase();
  const cached = state.artistGenreCache[key];
  if (cached && (cached.genre || (Date.now() - cached.fetchedAt < ARTIST_GENRE_CACHE_MISS_TTL))) {
    return cached.genre;
  }
  let data;
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(artistName)}&entity=musicArtist&limit=1`;
    data = await itunesFetch(url);
  } catch {
    return null; // breaker open, network error, or non-ok response — leave uncached, retried fresh next time
  }
  const genre = data.results?.[0]?.primaryGenreName || null;
  state.artistGenreCache[key] = { genre, fetchedAt: Date.now() };
  persistArtistGenreCache();
  return genre;
}

// ===== Creator auto-fill (Movie director, Show creator, Game studio) =====
// Movie/Show use the same Wikidata two-hop pattern as fetchArtistWebsiteFromWikidata above, but
// the property value itself is a Wikidata entity reference (a QID), not a plain string like
// P856's URL — so a second lookup is needed to resolve that QID to a readable name. Game instead
// pulls straight from Steam's appdetails endpoint, which returns the studio name directly.
const CREATOR_CACHE_MISS_TTL = 90 * 24 * 60 * 60 * 1000; // 90 days

async function fetchWikidataEntityLabelViaProperty(title, property, descriptionRegex) {
  const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(title)}&language=en&type=item&format=json&limit=5`;
  const searchResp = await fetch(searchUrl);
  if (!searchResp.ok) return null;
  const searchData = await searchResp.json();
  const results = searchData.search || [];
  if (!results.length) return null;

  const candidate = results.find(r => descriptionRegex.test(r.description || '')) || results[0];

  const entityUrl = `https://www.wikidata.org/wiki/Special:EntityData/${candidate.id}.json`;
  const entityResp = await fetch(entityUrl);
  if (!entityResp.ok) return null;
  const entityData = await entityResp.json();
  const claims = entityData.entities?.[candidate.id]?.claims?.[property] || [];
  if (!claims.length) return null;
  const preferred = claims.find(c => c.rank === 'preferred') || claims.find(c => c.rank !== 'deprecated');
  const targetId = preferred?.mainsnak?.datavalue?.value?.id;
  if (!targetId) return null;

  const labelUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${targetId}&props=labels&languages=en&format=json`;
  const labelResp = await fetch(labelUrl);
  if (!labelResp.ok) return null;
  const labelData = await labelResp.json();
  return labelData.entities?.[targetId]?.labels?.en?.value || null;
}

// P57 = director. A film's director claim is a single (or a couple, for co-directors) entity —
// unlike a TV series (see below), this reliably names "the director."
async function fetchMovieDirectorFromWikidata(title) {
  return fetchWikidataEntityLabelViaProperty(title, 'P57', CATEGORY_WIKI_KEYWORDS.Movie);
}

// P170 = creator, not P57 (director) — verified live that a TV series' P57 lists dozens of
// per-episode directors, not a single showrunner, while P170 correctly names just the creator.
async function fetchShowCreatorFromWikidata(title) {
  return fetchWikidataEntityLabelViaProperty(title, 'P170', CATEGORY_WIKI_KEYWORDS.Show);
}

// Steam's appdetails endpoint (distinct from searchGames()'s storesearch endpoint) returns the
// studio directly — no entity-resolution hop needed. The app id isn't its own field on the
// normalized search result, so it's pulled back out of the URL searchGames() already built.
async function fetchGameStudioFromSteam(url) {
  const appId = url?.match(/\/app\/(\d+)/)?.[1];
  if (!appId) return null;
  const resp = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}`);
  if (!resp.ok) return null;
  const data = await resp.json();
  const developers = data?.[appId]?.data?.developers;
  return developers?.length ? developers.join(', ') : null;
}

// Auto-fills the Director/Creator/Studio field on the review screen for Movie/Show/Game — mirrors
// every other ensure*() cache shape in this file. Cached indefinitely on success; cached "not
// found" results expire after CREATOR_CACHE_MISS_TTL.
export async function ensureItemCreator(title, category, { url } = {}) {
  if (!title) return null;
  const key = `${category}:${title}`.trim().toLowerCase();
  const cached = state.creatorCache[key];
  if (cached && (cached.creator || (Date.now() - cached.fetchedAt < CREATOR_CACHE_MISS_TTL))) {
    return cached.creator;
  }
  let creator = null;
  try {
    if (category === 'Movie') creator = await fetchMovieDirectorFromWikidata(title);
    else if (category === 'Show') creator = await fetchShowCreatorFromWikidata(title);
    else if (category === 'Game') creator = await fetchGameStudioFromSteam(url);
  } catch { /* no creator found */ }
  state.creatorCache[key] = { creator, fetchedAt: Date.now() };
  persistCreatorCache();
  return creator;
}

// Movie's "Videos" folder — Microlink (used for every other category's post-save image fallback,
// see addEditModal.js's handleSaveItem) actively blocks YouTube with an antibot error, so this
// gets the thumbnail straight from the video host instead. YouTube's is a plain predictable URL,
// no request needed; Vimeo's isn't, so that one goes through its public oEmbed endpoint (no key).
export async function fetchVideoThumbnail(url) {
  const ytId = getYoutubeVideoId(url);
  if (ytId) return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
  if (getVimeoVideoId(url)) {
    try {
      const resp = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`);
      if (!resp.ok) return null;
      const data = await resp.json();
      return data.thumbnail_url || null;
    } catch { return null; }
  }
  return null;
}

// Set this to a free Last.fm API key (https://www.last.fm/api/account/create) to enable the
// Profile page's "Connect Last.fm" recent-tracks card. Without one, the Connections section
// still shows the connect UI, but this returns null and the card explains no key is configured yet.
const LASTFM_API_KEY = '';

// Lets callers show "not configured yet" instead of a misleading "username not found" when the
// key above is still blank.
export function isLastfmConfigured() {
  return !!LASTFM_API_KEY;
}

// Short TTL — unlike the other ensure* caches above (artist bio/website/video, all 30-90 day
// TTLs for slow-changing data), "recent tracks" is only meaningful when fresh.
const LASTFM_RECENT_TRACKS_CACHE_MISS_TTL = 5 * 60 * 1000; // 5 minutes

// Reads a Last.fm user's recent scrobbles via the public (no OAuth, no login) user.getrecenttracks
// endpoint — just a username + API key. Returns null if no key is configured, the username
// doesn't exist, or the request fails; returns an array (possibly empty) otherwise.
export async function ensureLastfmRecentTracks(username) {
  if (!username || !LASTFM_API_KEY) return null;
  const key = username.trim().toLowerCase();
  const cached = state.lastfmCache[key];
  if (cached && Date.now() - cached.fetchedAt < LASTFM_RECENT_TRACKS_CACHE_MISS_TTL) {
    return cached.tracks;
  }
  let tracks = null;
  try {
    const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${encodeURIComponent(username)}&api_key=${LASTFM_API_KEY}&format=json&limit=8`;
    const resp = await fetch(url);
    if (resp.ok) {
      const data = await resp.json();
      if (!data.error) {
        tracks = (data.recenttracks?.track || []).map(t => ({
          title: t.name || null,
          artist: t.artist?.['#text'] || null,
          imageUrl: t.image?.find(i => i.size === 'medium')?.['#text'] || null,
          nowPlaying: t['@attr']?.nowplaying === 'true',
          url: t.url || null,
        }));
      }
    }
  } catch { /* leave tracks null — treated as "couldn't fetch," not "empty history" */ }
  state.lastfmCache[key] = { tracks, fetchedAt: Date.now() };
  persistLastfmCache();
  return tracks;
}

// Set this to a free Steam Web API key (https://steamcommunity.com/dev/apikey) to enable the
// Profile page's "Connect Steam" recently-played card. Same graceful-empty behavior as the keys
// above when left blank — requires the linked profile's game details to be set to public.
const STEAM_API_KEY = '';

export function isSteamConfigured() {
  return !!STEAM_API_KEY;
}

const STEAM_RECENT_GAMES_CACHE_MISS_TTL = 30 * 60 * 1000; // 30 minutes — more stable than "now playing", but still worth refreshing periodically

// Steam identifies profiles by a numeric SteamID64, but most people only know their custom
// "vanity URL" name (steamcommunity.com/id/<this>) — resolves that to a SteamID64 via
// ISteamUser/ResolveVanityURL, passing through unchanged if the input already looks like a raw
// SteamID64 (17 digits, Steam's fixed format).
async function _resolveSteamId(input) {
  if (/^\d{17}$/.test(input)) return input;
  try {
    const url = `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${STEAM_API_KEY}&vanityurl=${encodeURIComponent(input)}`;
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.response?.success === 1 ? data.response.steamid : null;
  } catch {
    return null;
  }
}

// Reads a Steam user's recently-played games via the public (no OAuth, no login) Web API — a
// vanity URL or SteamID64 plus an API key. Returns null if no key is configured, the profile
// can't be resolved, or its game details aren't public; returns an array (possibly empty)
// otherwise.
export async function ensureSteamRecentGames(usernameOrId) {
  if (!usernameOrId || !STEAM_API_KEY) return null;
  const key = usernameOrId.trim().toLowerCase();
  const cached = state.steamCache[key];
  if (cached && Date.now() - cached.fetchedAt < STEAM_RECENT_GAMES_CACHE_MISS_TTL) {
    return cached.games;
  }
  let games = null;
  try {
    const steamId = await _resolveSteamId(usernameOrId.trim());
    if (steamId) {
      const url = `https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v1/?key=${STEAM_API_KEY}&steamid=${steamId}&format=json`;
      const resp = await fetch(url);
      if (resp.ok) {
        const data = await resp.json();
        games = (data.response?.games || []).map(g => ({
          name: g.name || null,
          imageUrl: g.img_icon_url
            ? `https://media.steampowered.com/steamcommunity/public/images/apps/${g.appid}/${g.img_icon_url}.jpg`
            : null,
          playtime2Weeks: g.playtime_2weeks || 0,
          appid: g.appid,
        }));
      }
    }
  } catch { /* leave games null — treated as "couldn't fetch," not "empty history" */ }
  state.steamCache[key] = { games, fetchedAt: Date.now() };
  persistSteamCache();
  return games;
}
