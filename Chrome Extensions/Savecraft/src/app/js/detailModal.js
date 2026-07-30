// ===== ITEM DETAIL MODAL (the accordion-based modal shared by every category) =====
// Orchestrates the modal's five sections, each in its own file: detailModalHeader.js (image,
// sponsored tag, bookmark/favorite, title/author, website CTA), detailModalSummary.js
// (Summary/Albums accordion), detailModalNotes.js (My Notes + Tracklist/Chapters, kept together
// — see that file's header comment for why), and detailModalQueue.js (Web Links + Queue). Shared
// accordion open/close state lives in detailModalAccordions.js.

import { getDomain } from './utils.js';
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

  const domain = getDomain(item.url);
  const isMusicAlbum = item.category === 'Music Album';
  const isMusicianItem = item.category === 'Musician';

  const { ctaAuthorName, ctaAuthor } = setupHeader(item, { domain, isMusicAlbum, isMusicianItem });
  setupSummary(item, { isMusicAlbum, isMusicianItem, ctaAuthorName, ctaAuthor });
  setupNotesAndTracklist(item, { isMusicAlbum });
  setupQueue(item, { domain, isMusicAlbum });

  document.getElementById('detail-modal-overlay').classList.add('open');
}

export function closeDetailModal() {
  document.getElementById('detail-modal-overlay').classList.remove('open');
  document.body.style.overflow = ''; // restore background scroll
}

export function openImageLightbox(imageUrl) {
  document.getElementById('image-lightbox-img').src = imageUrl;
  document.getElementById('image-lightbox-overlay').classList.add('open');
}

export function closeImageLightbox() {
  document.getElementById('image-lightbox-overlay').classList.remove('open');
}
