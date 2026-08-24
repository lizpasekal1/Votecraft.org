// ===== PURE / SHARED HELPERS =====

import { state, FOLDER_ICON, GENERIC_FOLDER_ICON_PATH } from './state.js';

// Admin gate for Admin Kanban (renderSidebar.js/renderGrid.js/storage.js) — per request, two
// mechanisms combined rather than picking one: a small hardcoded allowlist (simplest, no extra
// data model, covers the account that actually needs this today) OR an explicit 'admin' role on
// the signed-in account's own synced data (savecraft_role, storage.js) so a future admin could be
// added via the Firebase console alone, no code deploy required. Pure function — takes the email/
// role explicitly rather than importing auth.js/state.js's own copies, so it has no import-order
// dependency on either (auth.js already has documented circular-import concerns with storage.js).
const ADMIN_EMAILS = ['lizpasekal@gmail.com'];
export function isAdminUser(email, role) {
  // Lowercased on both sides — a plain .includes() would silently fail (no error, just no admin
  // access) if the email ever comes back differently-cased than the allowlist entry, e.g. a
  // mobile keyboard auto-capitalizing the first letter at sign-up.
  return (!!email && ADMIN_EMAILS.includes(email.toLowerCase())) || role === 'admin';
}

// Movie's "Videos" folder (YouTube/Vimeo links) — pure URL parsing, no network. Used both to
// build a thumbnail URL (YouTube's is fully derivable from the id; Vimeo's isn't, so that one's
// fetched via oEmbed in api.js instead) and to build the lightbox's embeddable player src.
export function getYoutubeVideoId(url) {
  return url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/)?.[1] || null;
}
export function getVimeoVideoId(url) {
  return url?.match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1] || null;
}
// TikTok has no single numeric id worth extracting on its own (its oEmbed call, api.js, just
// takes the whole url) — this is purely a "is this a TikTok link" check, same role
// getYoutubeVideoId/getVimeoVideoId play for their own platforms.
export function isTiktokUrl(url) {
  return !!url && /tiktok\.com\//i.test(url);
}
// True for a YouTube-hosted thumbnail image url (img.youtube.com/vi/<id>/...), not a YouTube
// video url itself (that's getYoutubeVideoId above) — used to give these a slight extra zoom-crop
// (.card-image--zoom/.detail-image--zoom, cards.css/detailModal.css) on top of the existing
// object-fit: cover, since some of these thumbnails have real black letterboxing/pillarboxing
// baked into their own pixels (fetchVideoThumbnail's own comment, api.js) that a plain crop can
// shrink but not fully eliminate on whichever axis isn't the one already being cropped.
export function isYoutubeThumbnailUrl(url) {
  return !!url && /^https?:\/\/img\.youtube\.com\//i.test(url);
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
// REAL BUG, found and fixed: this list matches by folder NAME, not id — 'Series' stopped matching
// anything once that folder was renamed to 'Shows' this session (storage.js), silently pushing it
// to the alphabetical-fallback tail instead of its intended second position.
const CUSTOM_FOLDER_ORDER = {
  Movie: ['Movies', 'Shows', 'Videos', 'Directors'],
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

// A folder's direct subfolders (folder.parentFolderId === parentId) — shared by every place that
// walks the subfolder tree (renderSidebar.js's recursive row rendering, addEditModal.js's
// flattened folder <select>, the delete-cascade below), instead of each hand-rolling the same
// `.filter(f => f.parentFolderId === X)` independently.
export function getChildFolders(folders, parentId) {
  // Normalizes both sides through `|| null` — pre-existing folders (seeded before subfolders
  // existed) never got a parentFolderId field at all, so their own value is `undefined`, not
  // `null`; a strict === null on the caller's "top-level" query would otherwise miss them.
  return folders.filter(f => (f.parentFolderId || null) === (parentId || null));
}

// A folder id plus every descendant subfolder id, recursively — used when deleting a folder needs
// to also remove its whole subtree, not just the one folder directly acted on.
export function getFolderDescendantIds(folders, folderId) {
  const ids = [folderId];
  getChildFolders(folders, folderId).forEach(child => {
    ids.push(...getFolderDescendantIds(folders, child.id));
  });
  return ids;
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

// Matches the stable ids storage.js's _seedQueueDemoItems() assigns (queue-demo-0, queue-demo-1,
// …) — shared here since kanban.js/dashboard.js's card renderers and storage.js's own one-time
// title backfill all need to recognize these same seeded cards.
export function isQueueDemoId(id) { return /^queue-demo-\d+$/.test(id); }

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

// REAL BUG, found and fixed: returned `url` unchanged on failure — for a null/missing url (a
// title-only save with no URL, which the app explicitly allows), that's `null`, not a string.
// renderCard()/detailModal.js's own header both do `getDomain(item.url)[0]` (a fallback "first
// letter" avatar) with no guard against the return value itself being null — `null[0]` throws
// and, since this runs inside a card-list .map(), aborts the whole render mid-way, leaving
// whatever view was on screen before still showing underneath the new page's title (reported
// live: saving a Musician with no URL, then browsing to Musicians, looked like a totally
// different page's cards frozen in place). '' (an empty string) is safe everywhere a string was
// already expected, including `''[0]` which is just `undefined`, not a crash.
export function getDomain(url) {
  if (!url) return '';
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
