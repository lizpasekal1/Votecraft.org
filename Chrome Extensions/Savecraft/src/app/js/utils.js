// ===== PURE / SHARED HELPERS =====

import { state, FOLDER_ICON, GENERIC_FOLDER_ICON_PATH } from './state.js';

// True for a photo already auto-fetched from the iTunes album-cover fallback (identifiable by
// Apple's CDN domain) — safe to replace with a real Wikipedia photo once one's available, unlike
// a URL the user pasted in manually, which is never overwritten by auto-fetch.
export function isItunesArtworkUrl(url) {
  return !!url && /mzstatic\.com/i.test(url);
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
}

export function catClass(cat) { return (cat || '').replace(/\s+/g, '-'); }

// Shorter display text for category badges (the underlying category value is unchanged).
export function badgeLabel(cat) { return cat === 'Music Album' ? 'Album' : cat; }

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

// Pulls the 11-char video ID out of any common YouTube URL shape (watch?v=, youtu.be/, embed/,
// shorts/) so a manually-pasted link can be embedded the same way as an auto-resolved video ID.
export function extractYoutubeVideoId(url) {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  return match ? match[1] : null;
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
