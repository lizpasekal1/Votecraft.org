// ===== EXTERNAL API CALLS =====
// iTunes, Wikipedia, MusicBrainz/Wikidata, YouTube — every fetch() to a third-party service
// lives here. No DOM/rendering logic.

import { state } from './state.js';
import {
  persistArtistBioCache, persistArtistVideoCache, persistArtistWebsiteCache, persistItemWikiCache,
  persistLastfmCache, persistSteamCache,
} from './storage.js';

// Shared check for "does this Wikidata/Wikipedia result actually describe a musician/band" —
// used to reject same-name but wrong-topic matches (e.g. "Eagles" the bird) rather than guessing.
const MUSIC_ENTITY_KEYWORDS = /\b(band|singer|musician|rapper|duo|group|composer|songwriter|dj)\b/i;

const ARTIST_WEBSITE_CACHE_MISS_TTL = 90 * 24 * 60 * 60 * 1000; // 90 days
const ARTIST_BIO_CACHE_MISS_TTL = 90 * 24 * 60 * 60 * 1000; // 90 days
const ITEM_WIKI_CACHE_MISS_TTL = 90 * 24 * 60 * 60 * 1000; // 90 days

// iTunes's Search API has no dedicated "artist photo" field — the closest available image is
// an album cover, so we use the most relevant album's artwork as a stand-in for the artist photo.
export async function fetchArtistPhotoFromItunes(artistName) {
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(artistName)}&entity=album&media=music&limit=5`;
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const data = await resp.json();
    const lowerName = artistName.trim().toLowerCase();
    const match = data.results.find(r => r.collectionType && r.artistName?.toLowerCase() === lowerName)
      || data.results.find(r => r.collectionType);
    return match?.artworkUrl100?.replace('100x100bb', '300x300bb') || null;
  } catch {
    return null;
  }
}

export async function fetchAlbumsFromItunes(artistName) {
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
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`iTunes error: ${resp.status}`);
  const data = await resp.json();
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
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`iTunes error: ${resp.status}`);
  const data = await resp.json();
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
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`iTunes error: ${resp.status}`);
  const data = await resp.json();
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

// Looks up a short bio paragraph AND a photo via Wikipedia (both come from the same page
// summary, so they're fetched together). Rejects (returns nulls rather than guessing) any
// candidate page whose description/extract doesn't read as being about a musician/band, to
// avoid pulling in data about an unrelated same-named topic (e.g. "Eagles" the bird). Falls
// back to an iTunes album-cover stand-in for the photo only if Wikipedia has no image at all.
export async function ensureArtistWikipediaInfo(artistName) {
  if (!artistName) return { bio: null, photoUrl: null };
  const key = artistName.trim().toLowerCase();
  const cached = state.artistBioCache[key];
  if (cached && ((cached.bio || cached.photoUrl) || (Date.now() - cached.fetchedAt < ARTIST_BIO_CACHE_MISS_TTL))) {
    return { bio: cached.bio || null, photoUrl: cached.photoUrl || null };
  }
  const summary = await fetchArtistWikipediaSummary(artistName);
  let photoUrl = summary?.thumbnail?.source || summary?.originalimage?.source || null;
  if (!photoUrl) photoUrl = await fetchArtistPhotoFromItunes(artistName);
  const result = { bio: summary?.extract || null, photoUrl };
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
  if (!title) return { bio: null, photoUrl: null };
  const key = `${category}:${title}`.trim().toLowerCase();
  const cached = state.itemWikiCache[key];
  if (cached && ((cached.bio || cached.photoUrl) || (Date.now() - cached.fetchedAt < ITEM_WIKI_CACHE_MISS_TTL))) {
    return { bio: cached.bio || null, photoUrl: cached.photoUrl || null };
  }
  const summary = await fetchItemWikipediaSummary(title, category);
  const result = {
    bio: summary?.extract || null,
    photoUrl: summary?.thumbnail?.source || summary?.originalimage?.source || null,
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

// Set this to a YouTube Data API v3 key (restricted to that API only) to enable inline promo
// video playback. Without one, the Promo Vid button falls back to opening a YouTube search
// in a new tab. Get a key at https://console.cloud.google.com (enable "YouTube Data API v3",
// then Credentials → Create Credentials → API Key).
const YOUTUBE_API_KEY = '';

const ARTIST_VIDEO_CACHE_MISS_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

// Resolves a real, embeddable YouTube video ID for an artist via the YouTube Data API,
// scoped to videoCategoryId=10 ("Music") so results are actual music videos rather than
// interviews, live performances mislabeled otherwise, fan content, etc. Cached per artist.
export async function ensureArtistMusicVideoId(artistName) {
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

// Set this to a free Last.fm API key (https://www.last.fm/api/account/create) to enable the
// Profile page's "Connect Last.fm" recent-tracks card. Without one, the Connections section
// still shows the connect UI, but this returns null and the card explains no key is configured
// yet — same graceful-empty behavior as YOUTUBE_API_KEY above when it's blank.
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
