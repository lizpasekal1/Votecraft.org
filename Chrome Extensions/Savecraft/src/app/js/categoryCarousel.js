// ===== CATEGORY LANDING CAROUSEL =====
// A horizontal, center-emphasis carousel added below the folder-picker cards on every top-level
// category landing page (renderCategoryFolderLanding, renderGrid.js) EXCEPT Musician/Music Album,
// per direct request ("do not add this slider to the music section though"). Demo content only for
// now, per direct request — the same fixed slide set renders identically on every category page;
// swapping in real per-category content is a later step, not part of this pass.
//
// The centered slide scales up and reveals a title/description/CTA overlay; scrolling the strip
// (drag, wheel, or the prev/next arrows) re-centers a different slide. No infinite-loop trick like
// the Dashboard's own .dash-carousel (dashboard.js) — this is a short, bounded demo list, so a
// plain scrollable strip that stops at either end is simpler and sufficient; revisit if this ever
// needs to loop.

import { escapeHtml, debounce } from './utils.js';

// Placeholder art via CSS gradients (no external image hosting/rights concerns for demo content) —
// swap for real per-category imagery once this has real data behind it.
const DEMO_SLIDES = [
  { gradient: 'linear-gradient(135deg, #74716D 0%, #A79E93 100%)', title: 'Discover', desc: 'Explore curated picks tailored to you.' },
  { gradient: 'linear-gradient(135deg, #2E2A28 0%, #5B4A3F 100%)', title: 'Inspire', desc: 'Find your next favorite in seconds.' },
  { gradient: 'linear-gradient(135deg, #7A2E12 0%, #C2571F 100%)', title: 'Connect', desc: 'See what’s trending across your saves.' },
  { gradient: 'linear-gradient(135deg, #2B2E33 0%, #4A5560 100%)', title: 'Precision', desc: 'Create focused layouts with clear visual hierarchy.' },
  { gradient: 'linear-gradient(135deg, #3D3835 0%, #6B5D52 100%)', title: 'Explore', desc: 'Dive into fresh recommendations.' },
  { gradient: 'linear-gradient(135deg, #5B1E1E 0%, #8B3A2E 100%)', title: 'Curated', desc: 'Handpicked selections just for you.' },
];

export function renderCategoryCarouselHtml() {
  const slidesHtml = DEMO_SLIDES.map((slide, i) => `
    <div class="category-carousel-slide" data-index="${i}" style="background:${slide.gradient}">
      <div class="category-carousel-slide-overlay">
        <div class="category-carousel-slide-title">${escapeHtml(slide.title)}</div>
        <div class="category-carousel-slide-desc">${escapeHtml(slide.desc)}</div>
        <button type="button" class="category-carousel-slide-btn">Discover</button>
      </div>
    </div>
  `).join('');
  return `
    <div class="category-carousel-wrap">
      <button type="button" class="category-carousel-arrow category-carousel-prev" aria-label="Previous">&lsaquo;</button>
      <div class="category-carousel-strip" id="category-carousel-strip">${slidesHtml}</div>
      <button type="button" class="category-carousel-arrow category-carousel-next" aria-label="Next">&rsaquo;</button>
    </div>
  `;
}

function _updateActiveSlide(strip) {
  const stripRect = strip.getBoundingClientRect();
  const stripCenter = stripRect.left + stripRect.width / 2;
  let closest = null;
  let closestDist = Infinity;
  const slides = strip.querySelectorAll('.category-carousel-slide');
  slides.forEach(slide => {
    const r = slide.getBoundingClientRect();
    const dist = Math.abs((r.left + r.width / 2) - stripCenter);
    if (dist < closestDist) { closestDist = dist; closest = slide; }
  });
  slides.forEach(slide => slide.classList.toggle('category-carousel-slide--active', slide === closest));
}

export function initCategoryCarousel(container) {
  const strip = container.querySelector('#category-carousel-strip');
  if (!strip) return;

  _updateActiveSlide(strip);
  strip.addEventListener('scroll', debounce(() => _updateActiveSlide(strip), 60));

  const scrollByOne = dir => {
    const slide = strip.querySelector('.category-carousel-slide');
    if (!slide) return;
    const gap = 18; // matches .category-carousel-strip's own gap, cards.css
    strip.scrollBy({ left: dir * (slide.getBoundingClientRect().width + gap), behavior: 'smooth' });
  };
  container.querySelector('.category-carousel-prev')?.addEventListener('click', () => scrollByOne(-1));
  container.querySelector('.category-carousel-next')?.addEventListener('click', () => scrollByOne(1));
}
