// ===== ITEM DETAIL MODAL (the accordion-based modal shared by every category) =====
// Orchestrates the modal's five sections, each in its own file: detailModalHeader.js (image,
// sponsored tag, bookmark/favorite, title/author, website CTA), detailModalSummary.js
// (Summary/Albums accordion), detailModalNotes.js (My Notes + Tracklist/Chapters, kept together
// — see that file's header comment for why), and detailModalQueue.js (Web Links + Queue). Shared
// accordion open/close state lives in detailModalAccordions.js.

import { getDomain, escapeHtml } from './utils.js';
import { resetAccordions } from './detailModalAccordions.js';
import { setupHeader } from './detailModalHeader.js';
import { setupSummary } from './detailModalSummary.js';
import { setupNotesAndTracklist } from './detailModalNotes.js';
import { setupQueue } from './detailModalQueue.js';

let _detailItem = null;

export function getDetailItem() {
  return _detailItem;
}

export function openDetailModal(item) {
  document.body.style.overflow = 'hidden'; // lock background scroll while the modal is open
  _detailItem = item;
  resetAccordions();
  document.getElementById('detail-body').scrollTop = 0; // don't carry over a previous item's scroll position now that the title is sticky

  const domain = getDomain(item.url);
  const isMusicAlbum = item.category === 'Music Album';
  const isMusicianItem = item.category === 'Musician';

  const { ctaAuthorName, ctaAuthor } = setupHeader(item, { domain, isMusicAlbum, isMusicianItem });
  setupSummary(item, { isMusicAlbum, isMusicianItem, ctaAuthorName, ctaAuthor });
  setupNotesAndTracklist(item, { isMusicAlbum, isMusicianItem, ctaAuthor });
  setupQueue(item, { domain, isMusicAlbum });

  document.getElementById('detail-modal-overlay').classList.add('open');
}

export function closeDetailModal() {
  document.getElementById('detail-modal-overlay').classList.remove('open');
  document.body.style.overflow = ''; // restore background scroll
}

let _galleryImages = [];
let _galleryIndex = 0;
let _galleryLoadMore = null; // click handler for the lightbox's own "Load More Art" button, or null to hide it

function _renderGalleryChrome() {
  const overlay = document.getElementById('image-lightbox-overlay');
  const isGallery = _galleryImages.length > 1;
  overlay.classList.toggle('image-lightbox-overlay--gallery', isGallery);
  document.getElementById('image-lightbox-img').src = _galleryImages[_galleryIndex]?.full || '';
  const loadMoreBtn = document.getElementById('image-lightbox-load-art-btn');
  loadMoreBtn.style.display = _galleryLoadMore ? '' : 'none';
  loadMoreBtn.disabled = false;
  loadMoreBtn.textContent = 'Check for more art';
  const thumbsEl = document.getElementById('image-lightbox-thumbs');
  if (!isGallery) { thumbsEl.innerHTML = ''; return; }
  thumbsEl.innerHTML = _galleryImages.map((img, i) => `
    <button class="image-lightbox-thumb${i === _galleryIndex ? ' active' : ''}" data-index="${i}" title="${escapeHtml(img.type || '')}">
      <img src="${escapeHtml(img.thumb || img.full)}" alt="">
    </button>`).join('');
  thumbsEl.querySelectorAll('.image-lightbox-thumb').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation(); // don't bubble to the overlay's close-on-click listener in main.js
      _galleryIndex = Number(btn.dataset.index);
      _renderGalleryChrome();
    });
  });
  thumbsEl.querySelector('.image-lightbox-thumb.active')?.scrollIntoView({ block: 'nearest', inline: 'center' });
}

// `images` is an array of { full, thumb, type }; a single-image call (the default before any
// extra art has been fetched) just passes a one-element array, preserving the original
// no-arrows/no-strip look exactly. `loadMoreHandler`, if given, is called with the button element
// itself when the user clicks the lightbox's own "Load More Art" button (below the full-size
// image) — the caller (detailModalHeader.js) owns the fetch/loading-state logic and is expected
// to call openImageLightbox again with the refreshed images (and loadMoreHandler: null) once done.
export function openImageLightbox(images, startIndex = 0, loadMoreHandler = null) {
  _galleryImages = images || [];
  _galleryIndex = Math.min(Math.max(startIndex, 0), Math.max(_galleryImages.length - 1, 0));
  _galleryLoadMore = loadMoreHandler;
  _renderGalleryChrome();
  document.getElementById('image-lightbox-overlay').classList.add('open');
}

export function closeImageLightbox() {
  document.getElementById('image-lightbox-overlay').classList.remove('open');
}

// Wired once in main.js's static event setup; reads whichever handler the currently-open gallery
// registered via openImageLightbox's loadMoreHandler param.
export function handleGalleryLoadMoreClick(btn) {
  if (_galleryLoadMore) _galleryLoadMore(btn);
}

// Videos-folder items only (see detailModalHeader.js) — embeds the actual YouTube/Vimeo player
// instead of the plain image lightbox above. `embedUrl` is already a playable iframe src (see
// utils.js's getVideoEmbedUrl), not the item's original watch-page URL.
export function openVideoLightbox(embedUrl) {
  document.getElementById('video-lightbox-iframe').src = embedUrl;
  document.getElementById('video-lightbox-overlay').classList.add('open');
}

export function closeVideoLightbox() {
  document.getElementById('video-lightbox-overlay').classList.remove('open');
  document.getElementById('video-lightbox-iframe').src = ''; // stop playback
}

export function showNextImage() {
  if (_galleryImages.length < 2) return;
  _galleryIndex = (_galleryIndex + 1) % _galleryImages.length;
  _renderGalleryChrome();
}

export function showPrevImage() {
  if (_galleryImages.length < 2) return;
  _galleryIndex = (_galleryIndex - 1 + _galleryImages.length) % _galleryImages.length;
  _renderGalleryChrome();
}
