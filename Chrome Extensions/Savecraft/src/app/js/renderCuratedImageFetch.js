// ===== LIVE-FETCH MISSING CURATED IMAGES/PHOTOS (grid + curated genre landing rows) =====

import { state } from './state.js';
import { persistCuratedImgCache } from './storage.js';
import { patchCardImage, isItunesArtworkUrl } from './utils.js';
import { ensureArtistWikipediaInfo, fetchWikipediaThumbnailForUrl } from './api.js';

// Tracks item ids with a lookup currently in flight, so a renderGrid() firing again before the
// previous round-trip resolves (e.g. rapid filter/search changes) doesn't fire a duplicate fetch.
const _curatedImgFetchInFlight = new Set();
export function fetchMissingCuratedImages(items) {
  const missing = items.filter(i => i.curated && !i.imageUrl && !_curatedImgFetchInFlight.has(i.id));
  if (!missing.length) return;
  missing.forEach(item => {
    _curatedImgFetchInFlight.add(item.id);
    const applyImage = imgUrl => {
      if (!imgUrl) return;
      state.curatedImgCache[item.id] = imgUrl;
      persistCuratedImgCache();
      // patchCardImage() (utils.js) handles both plain .card elements and the Top 100 landing
      // page's .top100-row-card — this used to duplicate just the .card half inline here, which
      // silently never patched a row card's thumbnail once its image arrived (only picked up on
      // the next full re-render, via resolveRowItemImage() reading the now-populated cache).
      patchCardImage(item.id, imgUrl);
    };
    // Wikipedia-sourced curated items (most Movie/Book/Show/Game entries) get their poster/cover
    // straight from Wikipedia's own REST summary first — Microlink is a shared third-party quota
    // (confirmed: it can and does run out for a whole day), and Wikipedia is the actual source of
    // truth for these items anyway, not just a fallback of convenience.
    fetchWikipediaThumbnailForUrl(item.url)
      .then(imgUrl => {
        if (imgUrl) { applyImage(imgUrl); return null; }
        return fetch(`https://api.microlink.io?url=${encodeURIComponent(item.url)}`)
          .then(r => r.json())
          .then(data => applyImage(data?.data?.image?.url));
      })
      .catch(() => {})
      .finally(() => _curatedImgFetchInFlight.delete(item.id));
  });
}

// Same idea as fetchMissingCuratedImages(), but for curated Musician cards whose photo is
// missing or still the iTunes stand-in — looks up (and caches) the Wikipedia photo per artist,
// then live-patches any matching cards already on screen. Staggered (150ms apart) rather than
// fired all at once — a full Top 100 Musicians grid can have up to 100 of these queue up on a
// single render, and Wikipedia's REST API rate-limits bursts; fetchWikipediaSummary() already
// retries a single 429, but spacing the requests out in the first place means far fewer of them
// ever need to.
const _curatedMusicianPhotoFetchInFlight = new Set();
export function fetchMissingCuratedMusicianPhotos(items) {
  const missing = items.filter(i => i.curated && i.category === 'Musician' && (!i.imageUrl || isItunesArtworkUrl(i.imageUrl)) && !_curatedMusicianPhotoFetchInFlight.has(i.id));
  if (!missing.length) return;
  missing.forEach((item, i) => {
    _curatedMusicianPhotoFetchInFlight.add(item.id);
    setTimeout(() => {
      ensureArtistWikipediaInfo(item.title)
        .then(({ photoUrl }) => {
          if (!photoUrl) return;
          patchCardImage(item.id, photoUrl);
        })
        .finally(() => _curatedMusicianPhotoFetchInFlight.delete(item.id));
    }, i * 150);
  });
}
