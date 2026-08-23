// ===== CATEGORY LANDING CAROUSEL =====
// A horizontal, center-emphasis carousel added below the folder-picker cards on every top-level
// category landing page (renderCategoryFolderLanding, renderGrid.js) EXCEPT Musician/Music Album,
// per direct request ("do not add this slider to the music section though"). Demo content only for
// now, per direct request — the same fixed slide set renders identically on every category page;
// swapping in real per-category content is a later step, not part of this pass.
//
// The centered slide scales up and reveals a title/description/CTA overlay, playing a one-shot
// slide-in-from-the-left entrance animation as it becomes active; scrolling the strip (drag,
// wheel, or the prev/next arrows) loops infinitely in either direction, per direct request ("the
// carosel should scroll as if it is on an infinite wheel") — reuses the Dashboard's own
// triple-copy/recenter carousel mechanics (_wireCarouselArrows, dashboard.js) rather than building
// a second infinite-loop implementation; that function's own header comment already documents it
// as generic/reusable ("doesn't care what a 'card' looks like, only how wide the strip's first
// child is").

import { escapeHtml, debounce } from './utils.js';
import { _wireCarouselArrows } from './dashboard.js';

// Placeholder art via CSS gradients (no external image hosting/rights concerns for demo content) —
// swap for real per-category imagery once this has real data behind it.
const DEMO_SLIDES = [
  { gradient: 'linear-gradient(135deg, #74716D 0%, #A79E93 100%)', title: 'Discover', desc: 'Explore curated picks tailored to you.' },
  { gradient: 'linear-gradient(135deg, #2E2A28 0%, #5B4A3F 100%)', title: 'Inspire', desc: 'Find your next favorite in seconds.' },
  { gradient: 'linear-gradient(135deg, #7A2E12 0%, #C2571F 100%)', title: 'Connect', desc: 'See what’s trending across your saves.' },
  { gradient: 'linear-gradient(135deg, #2B2E33 0%, #4A5560 100%)', title: 'Precision', desc: 'Create focused layouts with clear visual hierarchy.' },
  { gradient: 'linear-gradient(135deg, #3D3835 0%, #6B5D52 100%)', title: 'Explore', desc: 'Dive into fresh recommendations.' },
  { gradient: 'linear-gradient(135deg, #5B1E1E 0%, #8B3A2E 100%)', title: 'Curated', desc: 'Handpicked selections just for you.' },
  { gradient: 'linear-gradient(135deg, #1E3A3A 0%, #2F6B63 100%)', title: 'Highlight', desc: 'Surface the saves that matter most.' },
];

export function renderCategoryCarouselHtml() {
  // Rendered three times in a row (same convention as the Dashboard's own carousels,
  // dashboard.js's buildFavoritesWidget/buildCuratedListsWidget) so _wireCarouselArrows always has
  // more (visually identical) content to page into in either direction — the actual infinite-loop
  // illusion. Three independently-mapped copies (not one string repeated), matching that same
  // convention, though nothing here currently keys off data-index.
  const slidesHtml = [...DEMO_SLIDES, ...DEMO_SLIDES, ...DEMO_SLIDES].map((slide, i) => `
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
      <button type="button" class="category-carousel-arrow dash-carousel-prev" aria-label="Previous">&lsaquo;</button>
      <div class="category-carousel-strip" id="category-carousel-strip">${slidesHtml}</div>
      <button type="button" class="category-carousel-arrow dash-carousel-next" aria-label="Next">&rsaquo;</button>
    </div>
  `;
}

// The slide that most recently played the "entering" animation below — module-level, not
// per-strip, since only one of these carousels is ever in the DOM at once (a single-page app view
// swap, not multiple simultaneous instances). Reset implicitly on each fresh render since
// initCategoryCarousel() below always runs against a brand-new strip.
let _prevActiveSlide = null;

function _updateActiveSlide(strip, { animate = true } = {}) {
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
  // Per direct request ("the large center feature item should change to the next item, come from
  // the left side") — the newly-active slide plays a one-shot slide-in-from-the-left animation
  // (.category-carousel-slide--entering, cards.css) instead of just popping to its enlarged size
  // in place. Only when the active slide actually CHANGES (not every scroll-tick recompute while
  // it's still the same one), and only once scrolling has actually happened (animate:false on the
  // very first call, from initCategoryCarousel() below) — no entrance animation on first paint.
  if (animate && closest && closest !== _prevActiveSlide) {
    closest.classList.remove('category-carousel-slide--entering');
    void closest.offsetWidth; // forces a reflow so re-adding the class below restarts the animation
    closest.classList.add('category-carousel-slide--entering');
    closest.addEventListener('animationend', () => closest.classList.remove('category-carousel-slide--entering'), { once: true });
  }
  slides.forEach(slide => slide.classList.toggle('category-carousel-slide--active', slide === closest));
  _prevActiveSlide = closest;
}

export function initCategoryCarousel(container) {
  const strip = container.querySelector('#category-carousel-strip');
  if (!strip) return;

  // Infinite-wheel scroll + prev/next arrow wiring (dashboard.js) — sets its own initial
  // scrollLeft (one full copy-width in, i.e. the start of the middle copy) as a side effect, which
  // this immediately refines below into an actually-centered starting position.
  _wireCarouselArrows(container, strip);
  // Centers the scrollable content's own midpoint in the viewport (not any one slide's specific
  // offset — more robust against margin/gap rounding) so a real slide lands at the strip's true
  // center on load, rather than just the start of the middle copy _wireCarouselArrows leaves it at.
  strip.scrollLeft = (strip.scrollWidth - strip.clientWidth) / 2;

  _updateActiveSlide(strip, { animate: false });
  strip.addEventListener('scroll', debounce(() => _updateActiveSlide(strip), 60));
}
