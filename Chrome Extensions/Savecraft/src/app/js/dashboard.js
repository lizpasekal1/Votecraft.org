// ===== DASHBOARD (persistent home page) =====
// Four widget cards over a decorative hero collage: a Kanban-board summary, a favorites
// carousel (falls back to curated Top 100 picks when the user has no favorites yet), a
// browsable carousel of Votecraft's curated genre lists, and a decorative profile placeholder.
// Favorites and Curated Lists deliberately share the same thumbnail-carousel look (see the
// .dash-thumb-* / .dash-carousel-* classes in dashboard.css).

import { state, CATEGORIES, CURATED_GENRES, GENRE_EMOJI, CURATED_ITEMS } from './state.js';
import { escapeHtml, catClass } from './utils.js';
import { persistViewState } from './storage.js';
import { openDetailModal } from './detailModal.js';
import { KANBAN_DEMO, KANBAN_COLUMNS } from './kanban.js';
import { renderSidebar, renderGrid } from './render.js';
import { getCurrentUser, onAuthChange } from './auth.js';
import { openAuthModal } from './main.js';

let _favSlides = [];
let _favIsDemo = false;
let _favCategoryFilter = null; // null = "All Categories"
const FAV_SLIDER_LIMIT = 10;

const HERO_ROTATIONS = [-6, 4, -3, 7, -8, 2];
const GENERIC_PERSON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M234-276q51-39 114-61.5T480-360q69 0 132 22.5T726-276q35-41 54.5-93T800-480q0-133-93.5-226.5T480-800q-133 0-226.5 93.5T160-480q0 59 19.5 111t54.5 93Zm246-164q-59 0-99.5-40.5T340-580q0-59 40.5-99.5T480-720q59 0 99.5 40.5T620-580q0 59-40.5 99.5T480-440Z"/></svg>`;

// ===== favorites aggregation =====

// Collects every item favorited in ANY category, by walking every "Favorites" folder rather
// than one category at a time — mirrors the per-category lookup detailModal.js's
// getFavoritesFolder() does (folder naming convention: `favorites-<category-slug>`), just
// across all of them at once.
function getAllFavoriteItems() {
  const favFolderIds = new Set(state.folders.filter(f => f.name === 'Favorites').map(f => f.id));
  if (!favFolderIds.size) return [];
  return state.items.filter(i => favFolderIds.has(i.folderId));
}

function resolveFavoriteSlides() {
  const real = getAllFavoriteItems();
  if (real.length > 0) return { items: real, isDemo: false };

  // Fallback: curated Top 100 Musician + Music Album — the two categories confirmed to have
  // real populated Top 100 data. Guarded against either being absent/empty.
  const musicians = CURATED_ITEMS['Top 100']?.['Musician'] || [];
  const albums = CURATED_ITEMS['Top 100']?.['Music Album'] || [];
  const demo = [...musicians, ...albums]
    .filter(i => i && i.imageUrl)
    .slice(0, 12)
    .map(i => ({ ...i, category: musicians.includes(i) ? 'Musician' : 'Music Album', curated: true }));
  return { items: demo, isDemo: true };
}

// ===== shared carousel arrow wiring (Favorites + Curated Lists) =====

// buildX() renders each widget's card list three times in a row (see CAROUSEL_LOOP_COPIES)
// so there's always more (visually identical) content to page into in either direction — next
// past the "last" card pages smoothly into the next copy instead of jumping/scrolling back
// across the whole strip. Whenever we've drifted a full copy-width away from the middle copy,
// silently re-anchor back to it right before the next click's scroll starts — nothing is
// animating at that moment, and the two positions look pixel-identical, so it's imperceptible.
// Exported for reuse by render.js's Top 100 landing rows — the scroll/infinite-loop mechanics
// here don't care what a "card" looks like, only how wide the strip's first child is, so this
// works for any card style, not just .dash-thumb-card.
export function _wireCarouselArrows(card, strip) {
  const copyWidth = () => strip.scrollWidth / 3;

  const recenter = () => {
    const w = copyWidth();
    if (!w) return;
    if (strip.scrollLeft < w * 0.5) strip.scrollLeft += w;
    else if (strip.scrollLeft > w * 1.5) strip.scrollLeft -= w;
  };

  const scrollByCard = dir => {
    recenter();
    const item = strip.firstElementChild;
    const amount = item ? item.getBoundingClientRect().width + 14 : 140;
    strip.scrollBy({ left: dir * amount, behavior: 'smooth' });
  };

  strip.scrollLeft = copyWidth(); // start centered in the middle copy
  card.querySelector('.dash-carousel-prev')?.addEventListener('click', () => scrollByCard(-1));
  card.querySelector('.dash-carousel-next')?.addEventListener('click', () => scrollByCard(1));
}

// ===== favorites carousel =====

// The slider only ever shows the 10 most recently saved favorites (optionally narrowed to one
// category via the header dropdown) — a spotlight, not a full archive of every favorite.
function _visibleFavoriteSlides() {
  const filtered = _favCategoryFilter
    ? _favSlides.filter(i => i.category === _favCategoryFilter)
    : _favSlides;
  return [...filtered].sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0)).slice(0, FAV_SLIDER_LIMIT);
}

function _rebuildFavoritesCard() {
  const card = document.querySelector('.dash-card--favorites');
  if (!card) return;
  const parent = card.parentElement;
  card.outerHTML = buildFavoritesWidget();
  wireFavoritesWidget(parent);
}

// Registered once at module load (rather than inside wireFavoritesWidget, which reruns on every
// category selection) — re-querying the live dropdown each click avoids stacking a new listener
// on `document` per rebuild.
document.addEventListener('click', e => {
  const dd = document.querySelector('.dash-fav-category-dropdown');
  if (dd && !dd.hidden && !e.target.closest('.dash-fav-category-wrap')) dd.setAttribute('hidden', '');
});

function wireFavoritesWidget(container) {
  const card = container.querySelector('.dash-card--favorites');
  if (!card) return;

  const dd = card.querySelector('.dash-fav-category-dropdown');
  if (dd) {
    const allOption = `<button class="saves-list-option${!_favCategoryFilter ? ' active' : ''}" data-cat="">All Categories</button>`;
    const catOptions = CATEGORIES.map(cat =>
      `<button class="saves-list-option${_favCategoryFilter === cat ? ' active' : ''}" data-cat="${escapeHtml(cat)}">${escapeHtml(cat)}</button>`
    ).join('');
    dd.innerHTML = allOption + `<div class="saves-list-divider"></div>` + catOptions;

    card.querySelector('.dash-fav-category-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      dd.toggleAttribute('hidden');
    });
    dd.querySelectorAll('.saves-list-option').forEach(opt => {
      opt.addEventListener('click', e => {
        e.stopPropagation();
        _favCategoryFilter = opt.dataset.cat || null;
        _rebuildFavoritesCard();
      });
    });
  }

  const strip = card.querySelector('.dash-carousel-strip');
  if (!strip) return; // zero slides even after the curated fallback — buildFavoritesWidget() rendered its own empty state instead

  card.querySelectorAll('.dash-thumb-card').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = _favSlides.find(i => i.id === btn.dataset.id);
      if (item) openDetailModal(item);
    });
  });

  _wireCarouselArrows(card, strip);
}

function buildFavoritesWidget() {
  const categoryFilterHtml = `
    <div class="board-filter-wrap dash-fav-category-wrap">
      <button class="btn-board-filter dash-fav-category-btn">
        <span>${escapeHtml(_favCategoryFilter ? _favCategoryFilter.toUpperCase() : 'Categories')}</span>
        <svg width="10" height="6" viewBox="0 0 10 6" fill="currentColor"><path d="M0 0l5 6 5-6z"/></svg>
      </button>
      <div class="board-filter-dropdown dash-fav-category-dropdown" hidden></div>
    </div>`;

  if (_favSlides.length === 0) {
    return `
      <div class="dash-card dash-card--favorites">
        <div class="dash-card-header"><span class="dash-card-title">Favorites Spotlight</span></div>
        <div class="dash-fav-empty">Star an item to see it here.</div>
      </div>`;
  }

  const visible = _visibleFavoriteSlides();
  // Tripled so _wireCarouselArrows() always has room to page into on either side — see its
  // comment for why.
  const cardsHtml = visible.length ? [...visible, ...visible, ...visible].map(item => `
    <button class="dash-thumb-card" data-id="${escapeHtml(item.id)}">
      <div class="dash-thumb-art">
        <img src="${escapeHtml(item.imageUrl || '')}" alt="" loading="lazy" decoding="async" onerror="this.style.display='none'">
        ${_favIsDemo ? '<span class="dash-thumb-badge">✨ Demo</span>' : ''}
      </div>
      <span class="dash-thumb-label">${escapeHtml(item.title || '')}</span>
    </button>`).join('') : `<div class="dash-fav-empty">No favorites in this category yet.</div>`;

  return `
    <div class="dash-card dash-card--favorites">
      <div class="dash-card-header">
        <span class="dash-card-title">Favorites Spotlight</span>
        ${categoryFilterHtml}
      </div>
      <div class="dash-carousel">
        <button class="dash-carousel-prev" aria-label="Previous">‹</button>
        <div class="dash-carousel-strip">${cardsHtml}</div>
        <button class="dash-carousel-next" aria-label="Next">›</button>
      </div>
    </div>`;
}

// ===== kanban widget — a scaled-down peek at the real board, same 4 columns/order =====

const MINI_CARDS_PER_COLUMN = 3;

function buildMiniKanbanCard(item) {
  const letter = (item.title || '?')[0].toUpperCase();
  const thumb = item.imageUrl
    ? `<img class="dash-kmini-thumb" src="${escapeHtml(item.imageUrl)}" alt="" loading="lazy" decoding="async" onerror="this.style.display='none'">`
    : `<div class="dash-kmini-thumb dash-kmini-thumb--placeholder placeholder-${catClass(item.category)}">${letter}</div>`;
  const demoTag = item._isDemo ? `<span class="dash-kmini-demo-badge">DEMO</span>` : '';
  return `
    <div class="dash-kmini-card" data-id="${item.id}">
      ${thumb}
      <div class="dash-kmini-info">
        ${demoTag}
        <span class="dash-kmini-title">${escapeHtml(item.title || '?')}</span>
      </div>
    </div>`;
}

// The dashboard is a peek, not the full board — only the two "active work" columns are shown
// here, so each gets the full column height instead of being squeezed 2-per-column with
// My Notes/Archive. The real board (via "Open Board →") still shows all four.
const DASHBOARD_KANBAN_COLUMNS = KANBAN_COLUMNS.slice(0, 2);

function buildKanbanWidget() {
  const queueItems = state.items.filter(i => i.queueStatus);
  const isEmpty = queueItems.length === 0;

  const columnsHtml = DASHBOARD_KANBAN_COLUMNS.map((col, colIndex) => {
    let colItems = queueItems.filter(i => i.queueStatus === col.key);
    // Nothing queued anywhere yet — show one demo card in the first column only, so the mini
    // board still reads as "a board with columns" rather than four empty boxes.
    if (isEmpty && colIndex === 0) colItems = [KANBAN_DEMO()];

    const shown = colItems.slice(0, MINI_CARDS_PER_COLUMN);
    const remaining = colItems.length - shown.length;
    const cardsHtml = shown.map(buildMiniKanbanCard).join('')
      + (remaining > 0 ? `<div class="dash-kmini-more">+${remaining} more</div>` : '');

    return `
      <div class="dash-kmini-col">
        <div class="dash-kmini-col-header">${col.label}<span>${colItems.length}</span></div>
        <div class="dash-kmini-col-cards">${cardsHtml || '<div class="dash-kmini-col-empty">—</div>'}</div>
      </div>`;
  }).join('');

  return `
    <div class="dash-card dash-card--kanban">
      <div class="dash-card-header">
        <span class="dash-card-title">Continue Your Queue</span>
        <button class="dash-kanban-open">Open Board →</button>
      </div>
      <div class="dash-kanban-mini-board">${columnsHtml}</div>
    </div>`;
}

function wireKanbanWidget(container) {
  container.querySelector('.dash-kanban-open')?.addEventListener('click', () => {
    state.sidebarMode = 'categories';
    state.view = 'all';
    persistViewState();
    renderSidebar();
    renderGrid();
  });

  container.querySelectorAll('.dash-kmini-card').forEach(card => {
    card.addEventListener('click', e => {
      e.stopPropagation();
      const item = state.items.find(i => i.id === card.dataset.id);
      if (item) openDetailModal(item);
    });
  });
}

// ===== curated lists widget =====

// Cosmetic-only relabeling for a few genres — previews a "these lists come from different
// sponsored/curator groups" direction (see savecraft_planning notes), without touching the real
// genre keys anything else (navigation, CURATED_ITEMS lookups) relies on. Only 3 genres are
// overridden for now; the rest still show their real genre name until there's a fuller set of
// curator names to use.
export const CURATED_LIST_DISPLAY_NAMES = {
  'Top 100': 'Votecraft List',
  'Futurism': 'Art Club List',
  'Fantasy': 'Progressive List',
  'Thriller': 'FairVote List',
  'Pop': 'Represent-Us List',
};

// Cover-image overrides for the same relabeled lists — takes priority over the dynamically
// resolved genre cover below. Exported so sharedSaves.js's followed-lists portals can reuse the
// same cover-art resolution as this widget.
export const CURATED_LIST_COVER_OVERRIDES = {
  'Top 100': 'https://epe.brightspotcdn.com/dims4/default/22ecff5/2147483647/strip/true/crop/1720x1167+0+141/resize/840x570!/quality/90/?url=https%3A%2F%2Fepe-brightspot.s3.us-east-1.amazonaws.com%2Faf%2F4d%2Fb3599f274134a7d658fcdcc879e0%2F112024-opinion-mirra-teaching-democracy-crisis-2135716019.jpg',
  'Futurism': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT8STeiTkB-qTlmQ3P1RIDrzfbm7ZTepEySa3IgNo6bakUuHFnTNxmQBdED&s=10',
  'Thriller': 'https://fairvote.org/wp-content/uploads/2022/09/New-web.jpg',
  'Fantasy': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQqYbEFh5smoRNjJntnkEZevDOLSot_YbUMWQHIRVdX4DpO5l2R_zpjsTk&s=10',
  'Pop': 'https://represent.us/wp-content/uploads/2022/06/repus-logo.png',
  'Comedy': 'https://lionhearttheatre.org/wp-content/uploads/2016/01/download-14.jpg',
  'Jazz': 'https://i0.wp.com/thejazzword.com/wp-content/uploads/2026/06/Warren-Wolf-Smooth-Vibes-feature-the-jazz-word.jpg?resize=678%2C381&ssl=1',
};

// Display order (and exclusions) for this widget only — CURATED_GENRES itself stays untouched
// since the sidebar's curated genre-picker (render.js) shares that same array and shouldn't be
// reordered/trimmed by this. 'Classic' is deliberately left out of this widget.
const DASHBOARD_CURATED_ORDER = ['Top 100', 'Thriller', 'Pop', 'Fantasy', 'Jazz', 'Comedy', 'Futurism'];

// One representative cover image per genre — first item with an imageUrl across any category
// in that genre, so the card reads as "a list with a face" rather than a bare icon. Exported for
// the same reason as CURATED_LIST_COVER_OVERRIDES above.
export function _resolveGenreCover(genre) {
  const byCategory = CURATED_ITEMS[genre] || {};
  for (const items of Object.values(byCategory)) {
    const hit = (items || []).find(i => i && i.imageUrl);
    if (hit) return hit.imageUrl;
  }
  return null;
}

function buildCuratedListsWidget() {
  // Tripled so _wireCarouselArrows() always has room to page into on either side — see its
  // comment for why. data-genre still drives navigation, so duplicate cards behave identically.
  const tripledOrder = [...DASHBOARD_CURATED_ORDER, ...DASHBOARD_CURATED_ORDER, ...DASHBOARD_CURATED_ORDER];
  const cardsHtml = tripledOrder.map(genre => {
    const cover = CURATED_LIST_COVER_OVERRIDES[genre] || _resolveGenreCover(genre);
    const label = CURATED_LIST_DISPLAY_NAMES[genre] || genre;
    const art = cover
      ? `<img src="${escapeHtml(cover)}" alt="" loading="lazy" decoding="async">`
      : `<span class="dash-thumb-fallback">${GENRE_EMOJI[genre] || '📁'}</span>`;
    return `
      <button class="dash-thumb-card" data-genre="${escapeHtml(genre)}">
        <div class="dash-thumb-art">${art}</div>
        <span class="dash-thumb-label">${escapeHtml(label)}</span>
      </button>`;
  }).join('');

  return `
    <div class="dash-card dash-card--curated">
      <div class="dash-card-header">
        <span class="dash-card-title">Curated Lists</span>
        <button class="dash-card-header-btn dash-curated-add-btn">Add Curated</button>
      </div>
      <div class="dash-carousel">
        <button class="dash-carousel-prev" aria-label="Previous">‹</button>
        <div class="dash-carousel-strip">${cardsHtml}</div>
        <button class="dash-carousel-next" aria-label="Next">›</button>
      </div>
    </div>`;
}

function wireCuratedListsWidget(container) {
  const card = container.querySelector('.dash-card--curated');
  if (!card) return;

  card.querySelector('.dash-curated-add-btn')?.addEventListener('click', () => {
    state.sidebarMode = 'curated';
    state.view = 'curated';
    persistViewState();
    renderSidebar();
    renderGrid();
  });

  card.querySelectorAll('.dash-thumb-card').forEach(btn => {
    btn.addEventListener('click', () => {
      state.sidebarMode = 'curated';
      state.view = `genre:${btn.dataset.genre}`;
      persistViewState();
      renderSidebar();
      renderGrid();
    });

    const img = btn.querySelector('.dash-thumb-art img');
    img?.addEventListener('error', () => {
      btn.querySelector('.dash-thumb-art').innerHTML = `<span class="dash-thumb-fallback">${GENRE_EMOJI[btn.dataset.genre] || '📁'}</span>`;
    });
  });

  const strip = card.querySelector('.dash-carousel-strip');
  if (!strip) return;

  _wireCarouselArrows(card, strip);
}

// ===== profile widget (reflects real SaveCraft sign-in state, see auth.js) =====

function buildProfileWidget() {
  const user = getCurrentUser();
  return `
    <div class="dash-card dash-card--profile" id="dash-profile-card">
      <div class="dash-card-header"><span class="dash-card-title">Profile</span></div>
      <div class="dash-profile-body">
        <div class="dash-profile-avatar cat-icon">${GENERIC_PERSON_SVG}</div>
        <div class="dash-profile-name">${user ? escapeHtml(user.email) : 'Sign in'}</div>
        <div class="dash-profile-sub">${user ? 'View your profile →' : 'Sign in to sync your saves'}</div>
      </div>
    </div>`;
}

function wireProfileWidget(container) {
  container.querySelector('#dash-profile-card')?.addEventListener('click', () => {
    // Demo mode: always go straight to the Profile page, skipping the sign-in gate — re-enable
    // the `getCurrentUser() ? ... : openAuthModal()` branch once real auth is part of the demo.
    state.view = 'profile';
    persistViewState();
    renderSidebar();
    renderGrid();
  });
}

// Keeps the card in sync if it's on-screen when auth state changes elsewhere (e.g. signing out
// via the Settings dropdown modal while the dashboard is the active view).
onAuthChange(() => {
  const card = document.getElementById('dash-profile-card');
  if (!card) return;
  const parent = card.parentElement;
  card.outerHTML = buildProfileWidget();
  wireProfileWidget(parent);
});

// ===== hero collage =====

// No real profile-name field exists yet (auth.js only tracks email) — hardcoded for the demo
// until there's an actual name to pull from.
export const DEMO_PROFILE_NAME = 'Zil';

// The (deduped, non-marquee-doubled) items currently shown in the hero collage — kept around so
// wireHeroCollage() can look up which real item a clicked thumbnail (from either marquee copy)
// corresponds to.
let _heroItems = [];

function buildHeroCollage() {
  const hour = new Date().getHours();
  const greeting = hour < 5 ? 'Good night' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const greetingWithName = `${greeting}, ${DEMO_PROFILE_NAME}`;

  let heroItems = state.items.filter(i => i.imageUrl);
  if (heroItems.length < 8) {
    const fallback = [
      ...(CURATED_ITEMS['Top 100']?.['Musician'] || []),
      ...(CURATED_ITEMS['Top 100']?.['Music Album'] || []),
    ].filter(i => i && i.imageUrl);
    heroItems = heroItems.concat(fallback);
  }
  heroItems = heroItems.slice(0, 24);
  _heroItems = heroItems;
  const noCollage = heroItems.length === 0;
  const marqueeItems = [...heroItems, ...heroItems]; // duplicated for a seamless CSS marquee loop

  // loading="eager" (not "lazy") — every thumbnail here is immediately visible the moment the
  // Dashboard renders, so deferring their fetch (the point of lazy-loading) only delays them
  // showing up, which is exactly the "pops in late" feeling this is meant to avoid.
  const thumbsHtml = marqueeItems.map((item, i) => `
    <div class="dash-hero-thumb" data-id="${escapeHtml(item.id)}" style="--rot:${HERO_ROTATIONS[i % HERO_ROTATIONS.length]}deg">
      <img src="${escapeHtml(item.imageUrl)}" alt="" loading="eager" decoding="async" onerror="this.parentElement.style.display='none'">
    </div>`).join('');

  return `
    <section class="dash-hero${noCollage ? ' dash-hero--no-collage' : ''}">
      <div class="dash-hero-collage">
        <div class="dash-hero-collage-track">${thumbsHtml}</div>
      </div>
      <div class="dash-hero-content">
        <h1 class="dash-hero-greeting">${escapeHtml(greetingWithName)}</h1>
        <p class="dash-hero-sub">Here's what's waiting in your SaveCraft library</p>
      </div>
    </section>`;
}

function wireHeroCollage(container) {
  container.querySelectorAll('.dash-hero-thumb').forEach(thumb => {
    thumb.addEventListener('click', () => {
      const item = _heroItems.find(i => i.id === thumb.dataset.id);
      if (item) openDetailModal(item);
    });
  });
}

// ===== entry point =====

export function renderDashboard() {
  const container = document.getElementById('cards-grid');
  document.getElementById('grid-title').style.display = 'none';
  document.getElementById('sort-select').style.display = 'none';
  // .grid-header wraps sort-select and the (already-hidden) saves-list/board-filter/board-info
  // controls — even with every child hidden, the wrapper div itself stays in flow and keeps its
  // own margin-bottom, which would silently break the "fill exactly this much height, no
  // scroll" math below. Hide the whole wrapper, not just its children.
  document.querySelector('.grid-header').style.display = 'none';
  container.className = 'dashboard-wrap';

  const fav = resolveFavoriteSlides();
  _favSlides = fav.items;
  _favIsDemo = fav.isDemo;

  container.innerHTML = `
    ${buildHeroCollage()}
    <div class="dash-widget-grid">
      ${buildKanbanWidget()}${buildFavoritesWidget()}${buildCuratedListsWidget()}${buildProfileWidget()}
    </div>`;

  wireHeroCollage(container);
  wireKanbanWidget(container);
  wireFavoritesWidget(container);
  wireCuratedListsWidget(container);
  wireProfileWidget(container);
  // Persistence for "arriving at the dashboard" happens at each navigation call site (sidebar
  // link, mobile tab, etc.), not here — same layering as every other view's render function.
}
