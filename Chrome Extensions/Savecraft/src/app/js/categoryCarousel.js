// ===== CATEGORY LANDING CAROUSEL =====
// A horizontal, center-emphasis carousel added below the folder-picker cards on every top-level
// category landing page (renderCategoryFolderLanding, renderGrid.js) EXCEPT Musician/Music Album,
// per direct request ("do not add this slider to the music section though"). Content is the same
// generic demo set the Dashboard's own "Recent Saves" widget already resolves (real favorites if
// the user has any, else the admin-configured demo cards, else the curated Top 100 fallback —
// resolveFavoriteSlides(), dashboard.js), per direct follow-up ("put the generic 'demo' content in
// here that you're using for the recent saves widget") — not a second, unrelated placeholder set.
//
// The centered slide scales up and reveals a title/category overlay, playing a one-shot
// slide-in-from-the-left entrance animation as it becomes active; scrolling the strip (drag,
// wheel, or the prev/next arrows) loops infinitely in either direction — reuses the Dashboard's
// own triple-copy/recenter carousel mechanics (_wireCarouselArrows, dashboard.js) rather than
// building a second infinite-loop implementation; that function's own header comment already
// documents it as generic/reusable ("doesn't care what a 'card' looks like, only how wide the
// strip's first child is"). Clicking a slide opens that item's real detail modal — genuine
// behavior now that this is real save data, not decorative placeholder art.

import { CAT_LABEL, state, PRIMARY_FOLDER_ID } from './state.js';
import { escapeHtml, debounce, catClass } from './utils.js';
import { _wireCarouselArrows, resolveFavoriteSlides } from './dashboard.js';
import { openDetailModal } from './detailModal.js';

// The folder-name badge shown on a real (non-demo) slide, in the same lower-right spot the "Demo"
// badge occupies on a demo one — per direct request ("the carosule shuold have the folder tag
// where the demo tag was"). item.folderId is the real, explicitly-filed folder if set; otherwise
// falls back to the category's own primary folder (same "un-foldered counts as primary" convention
// matchesPrimaryOrUnfoldered uses, renderFilters.js), and finally to the plain category label for
// categories with no primary folder at all (e.g. Visual Art, Game).
function resolveSlideFolderName(item) {
  const explicitFolder = item.folderId ? state.folders.find(f => f.id === item.folderId) : null;
  if (explicitFolder) return explicitFolder.name;
  const primaryId = PRIMARY_FOLDER_ID[item.category];
  const primaryFolder = primaryId ? state.folders.find(f => f.id === primaryId) : null;
  return primaryFolder ? primaryFolder.name : (CAT_LABEL[item.category] || item.category || '');
}

// The exact item objects the currently-rendered strip's slides map to, one-to-one with the
// tripled DOM order below — set fresh each render, read back by initCategoryCarousel() to wire
// each slide's click without a second resolveFavoriteSlides() call (its own result already
// reflects a specific moment's admin-config/favorites/curated-fallback state; re-deriving it a
// second time separately, right after, is both wasted work and a theoretical (if unlikely) risk of
// disagreeing with what actually got rendered).
let _lastSlideItems = [];

// `override` — { items, isDemo } — lets a caller supply its own slide source instead of the
// generic Dashboard-style resolveFavoriteSlides() fallback. Used by the curated folder-picker page
// (renderCuratedCategoryFolderLanding, renderGrid.js) to show that genre+category's own real
// curated picks (resolveGenreRowItems, renderCuratedPages.js — the exact same items its landing
// page's own row shows) instead of generic favorites/demo content, per direct request ("put the
// corresponding content from the votecraft landing page into the carousel"). `isDemo` badges every
// slide uniformly unless an individual item carries its own `_demoFallback` boolean (see
// renderCategoryFolderLanding's blended real-saves-plus-demo-filler strip below), which wins for
// that slide specifically. Every other caller (the curated folder-picker page above) passes
// nothing per-item and gets the original all-or-nothing behavior unchanged.
export function renderCategoryCarouselHtml(override = null) {
  const { items, isDemo } = override || resolveFavoriteSlides();
  _lastSlideItems = items;
  if (!items.length) return ''; // no real saves and no curated fallback data available at all — nothing to show

  // Rendered three times in a row (same convention as the Dashboard's own carousels,
  // dashboard.js's buildFavoritesWidget/buildCuratedListsWidget) so _wireCarouselArrows always has
  // more (visually identical) content to page into in either direction — the actual infinite-loop
  // illusion.
  const tripled = [...items, ...items, ...items];
  // No on-image title/category overlay text anymore, per direct request ("remove the text on the
  // carosel cards") — the active slide's title is still shown via .category-carousel-caption
  // (below the whole strip, wired in _updateActiveSlide), so nothing is lost, just no longer
  // duplicated on top of the image itself.
  const slidesHtml = tripled.map((item, i) => {
    // Per-item demo flag (item._demoFallback) wins when a caller sets it — lets a blended strip
    // (some real saves, some demo filler, renderCategoryFolderLanding) badge only the demo slides
    // instead of all-or-nothing; falls back to the whole-strip `isDemo` for every existing caller
    // that doesn't set it (uniformly all-demo or all-real), unchanged.
    const slideIsDemo = item._demoFallback !== undefined ? item._demoFallback : isDemo;
    // No image (or one that fails to actually load — the onerror swap below) used to just leave
    // a flat, empty-looking box, per direct report ("the empty unloaded images look odd"). Same
    // gradient-background placeholder every plain item card already falls back to
    // (.card-placeholder/.placeholder-<Category>, cards.css/renderGrid.js) — reused here rather
    // than inventing a second fallback treatment. A large white first-letter-of-the-title
    // monogram, per direct follow-up ("change the icon to a white first letter of the item. make
    // that letter large") — not the category icon (CAT_EMOJI) this started as, and not a
    // domain-letter either, since there's no single item.url this slide reads from consistently
    // across both real saves and curated/demo content.
    const monogramLetter = (item.title || '?').trim()[0]?.toUpperCase() || '?';
    const placeholderHtml = `<div class="category-carousel-slide-placeholder placeholder-${catClass(item.category)}"${item.imageUrl ? ' style="display:none;"' : ''}>${escapeHtml(monogramLetter)}</div>`;
    return `
    <button type="button" class="category-carousel-slide" data-index="${i}" title="${escapeHtml(item.title || '')}">
      ${item.imageUrl
        ? `<img class="category-carousel-slide-img" src="${escapeHtml(item.imageUrl)}" alt="" loading="lazy" decoding="async" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`
        : ''}
      ${placeholderHtml}
      ${slideIsDemo
        ? '<span class="category-carousel-slide-demo-badge"><span class="category-carousel-slide-demo-badge-icon">✨</span> Demo</span>'
        : `<span class="category-carousel-slide-folder-badge">${escapeHtml(resolveSlideFolderName(item))}</span>`}
    </button>
  `;
  }).join('');
  return `
    <div class="category-carousel-heading-wrap">
      <div class="category-carousel-heading">Featured Saves</div>
      <div class="category-carousel-divider"></div>
    </div>
    <div class="category-carousel-wrap">
      <button type="button" class="category-carousel-arrow dash-carousel-prev" aria-label="Previous">&lsaquo;</button>
      <div class="category-carousel-strip" id="category-carousel-strip">${slidesHtml}</div>
      <button type="button" class="category-carousel-arrow dash-carousel-next" aria-label="Next">&rsaquo;</button>
    </div>
    <button type="button" class="category-carousel-caption" id="category-carousel-caption"></button>
  `;
}

// The slide that most recently played the "entering" animation below — module-level, not
// per-strip, since only one of these carousels is ever in the DOM at once (a single-page app view
// swap, not multiple simultaneous instances). Reset implicitly on each fresh render since
// initCategoryCarousel() below always runs against a brand-new strip. Also doubles as "whichever
// slide is currently active" for the caption's own click handler (initCategoryCarousel) — no
// separate _activeCaptionItem needed, since _itemForSlide() below can derive the real item from
// this directly, the same way every other click handler in this file already does.
let _prevActiveSlide = null;

// Resolves a slide element back to its real item — the tripled DOM order maps onto _lastSlideItems
// via `dataset.index % _lastSlideItems.length` (renderCategoryCarouselHtml sets `data-index`).
// Shared by the per-slide click wiring, the caption's click handler, and _updateActiveSlide — one
// lookup formula instead of it being written out at each call site separately.
function _itemForSlide(slideEl) {
  if (!slideEl) return null;
  return _lastSlideItems[parseInt(slideEl.dataset.index, 10) % _lastSlideItems.length] || null;
}

// Writes strip.scrollLeft with scroll-behavior forced to 'auto' for the duration, so it applies
// instantly instead of respecting .category-carousel-strip's own CSS scroll-behavior: smooth —
// shared by both the initial sync centering pass and the double-rAF safety net in
// initCategoryCarousel below, which both need this same "move scrollLeft right now, no animation"
// guarantee (previously duplicated as its own save/set/flush/restore sequence in each spot).
// Callers are still responsible for their own category-carousel-strip--no-transition toggling
// around this call (also suppresses scroll-snap-type, cards.css) since the two passes need it at
// slightly different scopes — this only owns the scroll-behavior half of that suppression.
function _setScrollLeftInstantly(strip, newScrollLeft) {
  const prevBehavior = strip.style.scrollBehavior;
  strip.style.scrollBehavior = 'auto';
  strip.scrollLeft = newScrollLeft;
  void strip.offsetWidth; // flushes the instant write before scroll-behavior is restored
  strip.style.scrollBehavior = prevBehavior;
}

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
  // The active slide's own title, centered in purple below the whole carousel — per direct
  // request ("put the title center cards title below it in purple text centered below all the
  // cards"). Reads the same title the on-image overlay already shows (the button's own `title`
  // attribute, set once in renderCategoryCarouselHtml() above) rather than duplicating it as a
  // separate data attribute.
  const caption = document.getElementById('category-carousel-caption');
  if (caption && closest) caption.textContent = closest.title || '';
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

  strip.querySelectorAll('.category-carousel-slide').forEach(slide => {
    const item = _itemForSlide(slide);
    if (item) slide.addEventListener('click', () => openDetailModal(item));
  });
  // Per direct request ("make it so on desktop and mobile the center card title purple text is
  // a link to that card") — wired once here (not per-render inside _updateActiveSlide, which
  // runs on every scroll tick) since the caption element itself is never replaced/re-created,
  // only its text/target item change. Resolves whichever slide is active right now via
  // _prevActiveSlide (kept current by _updateActiveSlide) rather than tracking a separate,
  // redundant "active item" variable — same _itemForSlide lookup every other click handler here
  // already uses.
  document.getElementById('category-carousel-caption')?.addEventListener('click', () => {
    const item = _itemForSlide(_prevActiveSlide);
    if (item) openDetailModal(item);
  });

  // Infinite-wheel scroll + prev/next arrow wiring (dashboard.js) — sets its own initial
  // scrollLeft (one full copy-width in, i.e. the start of the middle copy) as a side effect, which
  // this immediately refines below into an actually-centered starting position.
  _wireCarouselArrows(container, strip);
  // REAL BUG, found and fixed: .category-carousel-strip has its own CSS scroll-behavior: smooth
  // (cards.css) — every scrollLeft assignment below (this one and the fine-centering correction
  // further down) was respecting that and animating into place with the browser's own native
  // smooth-scroll instead of snapping there instantly, so the page's actual first paint (and any
  // screenshot taken shortly after) could still show the strip mid-glide toward center rather
  // than already centered — reported live, screenshot confirmed, even surviving a hard refresh:
  // "the center card is not in the center on page launch... it still looks like that." Centers
  // the scrollable content's own midpoint in the viewport (not any one slide's specific offset —
  // more robust against margin/gap rounding) via _setScrollLeftInstantly, so a real slide lands
  // at the strip's true center on load, rather than just the start of the middle copy
  // _wireCarouselArrows leaves it at.
  _setScrollLeftInstantly(strip, (strip.scrollWidth - strip.clientWidth) / 2);

  // REAL BUG, found and fixed: .category-carousel-slide's width/height/transform/margin all
  // animate now (the "zoom out as it gets replaced" fix, cards.css) — measuring the active
  // slide's real geometry immediately after toggling the class (below) caught it still
  // mid-transition, still close to its smaller resting size, undershooting the centering math
  // and landing it slightly off-center on first paint (reported live: "the center card is not
  // in the center on page launch... it looks like it's slightly to the left"). Suppressing the
  // transition just for this one initial, non-animated activation (animate: false already says
  // "no entrance animation on first paint" — this extends that same intent to the underlying
  // CSS transition, not just the JS-driven --entering keyframe) makes it settle to its final
  // size instantly, so the measurement below reads the true final geometry. Also suppresses
  // scroll-snap-type for the same window (cards.css) — see _setScrollLeftInstantly's own comment
  // for why that matters for the scrollLeft write just below.
  strip.classList.add('category-carousel-strip--no-transition');
  _updateActiveSlide(strip, { animate: false });
  // REAL BUG, found and fixed (this replaces 4 earlier sequential attempts at this exact bug —
  // transition timing, scroll-snap-type suppression, scroll-behavior: smooth forcing, and a
  // double-rAF re-measure pass — none of which held up on a real device: "the mobile carousel is
  // still launching with the center card on the left side" persisted through all four). Every
  // earlier attempt hand-computed a scrollLeft delta from getBoundingClientRect() and wrote it
  // directly, then fought the browser's own async scroll-snap/smooth-scroll machinery trying to
  // make that raw write "stick." scrollIntoView({ inline: 'center', behavior: 'instant' }) hands
  // the entire "center this specific element within its scrollable ancestor" computation to the
  // browser's own native, spec'd implementation instead of reimplementing it by hand — behavior:
  // 'instant' is defined to override the element's own CSS scroll-behavior for this one call, and
  // being the browser's own primitive for exactly this task, it's far less likely to lose a race
  // against the browser's own scroll-snap settling than a hand-rolled scrollLeft write is.
  // block: 'nearest' stops it from also trying to vertically scroll the whole page into view.
  const initialActive = strip.querySelector('.category-carousel-slide--active');
  initialActive?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'instant' });
  strip.classList.remove('category-carousel-strip--no-transition');
  strip.addEventListener('scroll', debounce(() => _updateActiveSlide(strip), 60));

  // Same scrollIntoView() approach, deferred a full paint cycle via double-rAF, as a safety net
  // against any remaining first-paint mobile Safari quirk (scroll-snap-type is still suppressed
  // for this call, same reasoning as above) — kept even though scrollIntoView is far more robust
  // than the old hand-rolled version, since this exact bug has already survived several
  // "should be fixed now" attempts. Desktop-only (pointer: fine) skips this entirely — confirmed
  // live the synchronous call above always lands correctly there, so there's nothing for a
  // second pass to catch, and running it anyway would be pure wasted work every page load.
  if (!window.matchMedia('(pointer: fine)').matches) {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const settledActive = strip.querySelector('.category-carousel-slide--active');
      if (!settledActive) return;
      strip.classList.add('category-carousel-strip--no-transition');
      settledActive.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'instant' });
      strip.classList.remove('category-carousel-strip--no-transition');
    }));
  }
}
