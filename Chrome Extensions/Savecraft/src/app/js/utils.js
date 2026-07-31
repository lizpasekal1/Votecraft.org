// ===== PURE / SHARED HELPERS =====

import { state, FOLDER_ICON, GENERIC_FOLDER_ICON_PATH } from './state.js';

// Movie's "Videos" folder (YouTube/Vimeo links) — pure URL parsing, no network. Used both to
// build a thumbnail URL (YouTube's is fully derivable from the id; Vimeo's isn't, so that one's
// fetched via oEmbed in api.js instead) and to build the lightbox's embeddable player src.
export function getYoutubeVideoId(url) {
  return url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/)?.[1] || null;
}
export function getVimeoVideoId(url) {
  return url?.match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1] || null;
}
export function getVideoEmbedUrl(url) {
  const ytId = getYoutubeVideoId(url);
  if (ytId) return `https://www.youtube.com/embed/${ytId}?autoplay=1`;
  const vimeoId = getVimeoVideoId(url);
  if (vimeoId) return `https://player.vimeo.com/video/${vimeoId}?autoplay=1`;
  return null;
}

// True for a photo already auto-fetched from the iTunes album-cover fallback (identifiable by
// Apple's CDN domain) — safe to replace with a real Wikipedia photo once one's available, unlike
// a URL the user pasted in manually, which is never overwritten by auto-fetch.
export function isItunesArtworkUrl(url) {
  return !!url && /mzstatic\.com/i.test(url);
}

// Movie's folders show in a fixed order (not alphabetical) so "Directors" sits last, after
// "Videos" — every other category still sorts its folders alphabetically by name.
const CUSTOM_FOLDER_ORDER = {
  Movie: ['Movies', 'Videos', 'Directors'],
};
export function sortFoldersForDisplay(folders, category) {
  const order = CUSTOM_FOLDER_ORDER[category];
  if (!order) return [...folders].sort((a, b) => a.name.localeCompare(b.name));
  return [...folders].sort((a, b) => {
    const ai = order.indexOf(a.name);
    const bi = order.indexOf(b.name);
    if (ai === -1 && bi === -1) return a.name.localeCompare(b.name);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

// Renders a folder's sidebar/wizard icon — its own custom icon (FOLDER_ICON, keyed by folder id)
// if it has one, else the plain generic folder icon every user-created folder uses.
export function folderIconHtml(folderId, sizePx) {
  const icon = FOLDER_ICON[folderId];
  if (icon?.type === 'emoji') {
    return `<span style="font-size:${sizePx}px;line-height:1">${icon.value}</span>`;
  }
  const path = icon?.type === 'svg' ? icon.path : GENERIC_FOLDER_ICON_PATH;
  return `<svg xmlns="http://www.w3.org/2000/svg" height="${sizePx}px" viewBox="0 -960 960 960" width="${sizePx}px" fill="#5B5BEF"><path d="${path}"/></svg>`;
}

// Sets imageUrl on an author record or item if it's empty or still the replaceable iTunes
// stand-in — never overwrites a real (curated or user-provided) photo. Returns true if changed.
export function applyArtistPhotoToItem(target, photoUrl) {
  if (!photoUrl || !target) return false;
  if (target.imageUrl && !isItunesArtworkUrl(target.imageUrl)) return false;
  target.imageUrl = photoUrl;
  return true;
}

// Swaps in a newly-fetched image on any already-rendered card for this item, mirroring the
// same live-patch technique fetchMissingCuratedImages() uses for curated thumbnails.
export function patchCardImage(itemId, imageUrl) {
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
    img.loading = 'lazy';
    img.decoding = 'async';
    img.onerror = () => { img.style.display = 'none'; placeholder.style.display = 'flex'; };
    placeholder.style.display = 'none';
    card.insertBefore(img, placeholder);
  });
  // Same idea for the Top 100 landing page's row cards (render.js's renderCuratedGenreLanding)
  // — a different DOM shape (.top100-row-card-art wraps either an <img> or a text fallback span,
  // no separate placeholder element to hide/show), so patched separately rather than shoehorning
  // it into the .card branch above.
  document.querySelectorAll(`.top100-row-card[data-id="${itemId}"]`).forEach(card => {
    const art = card.querySelector('.top100-row-card-art');
    if (!art || art.querySelector('img')) return;
    art.innerHTML = '';
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    art.appendChild(img);
  });
}

export function catClass(cat) { return (cat || '').replace(/\s+/g, '-'); }

// Kanban list membership: modern items carry `listIds` (an array); a lone leftover `listId`
// (pre-multi-list schema) is normalized into a one-element array instead of being migrated on
// load, since not every item is guaranteed to pass through a migration pass.
export function getListIds(item) {
  if (!item) return [];
  if (Array.isArray(item.listIds)) return item.listIds;
  if (item.listId) return [item.listId];
  return [];
}

// Shorter display text for category badges (the underlying category value is unchanged).
export function badgeLabel(cat) {
  if (cat === 'Music Album') return 'Album';
  if (cat === 'Book Author') return 'Author';
  if (cat === 'Movie Director') return 'Director';
  if (cat === 'Show Creator') return 'Creator';
  if (cat === 'Game Studio') return 'Studio';
  return cat;
}

// True when browsing the dedicated "Music Albums" section (the Musicians > Music Albums
// sidebar subfolder, personal or curated) — artist names aren't clickable links there.
export function isMusicAlbumsSectionView() {
  return state.view === 'Music Album' || (state.view.startsWith('genre:') && state.view.endsWith(':Music Album'));
}

// True when viewing a musician's own author page and this is one of their own works —
// the author-name link would just point back to the page already open, so it isn't a link there.
export function isOwnAuthorPageView(authorName) {
  if (!state.view.startsWith('author:')) return false;
  const rest = state.view.slice(7);
  const name = rest.slice(rest.indexOf(':') + 1);
  return name === authorName;
}

export function getDomain(url) {
  try { return new URL(url).hostname.replace('www.', ''); }
  catch { return url; }
}

export function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatTrackDuration(ms) {
  if (!ms) return '';
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
