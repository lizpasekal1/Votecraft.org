// ===== DASHBOARD (persistent home page) =====
// Four widget cards over a decorative hero collage: a Kanban-board summary, a favorites
// slideshow (falls back to curated Top 100 picks when the user has no favorites yet), a
// browsable strip of Votecraft's curated genre lists, and a decorative profile placeholder.

import { state, CURATED_GENRES, GENRE_EMOJI, CURATED_ITEMS } from './state.js';
import { escapeHtml, catClass } from './utils.js';
import { persistViewState } from './storage.js';
import { openDetailModal } from './detailModal.js';
import { KANBAN_DEMO, KANBAN_COLUMNS } from './kanban.js';
import { renderSidebar, renderGrid } from './render.js';

let _favSlides = [];
let _favIndex = 0;
let _favIsDemo = false;
let _favTimer = null;

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

// ===== favorites slideshow =====

function stopFavoriteAutoAdvance() {
  if (_favTimer) { clearInterval(_favTimer); _favTimer = null; }
}

function startFavoriteAutoAdvance() {
  stopFavoriteAutoAdvance();
  if (_favSlides.length < 2) return;
  _favTimer = setInterval(() => {
    // Self-cleaning guard: if the dashboard is no longer the visible view (navigated away via
    // any widget link, the sidebar, search, etc.), this element is gone even though the
    // interval is still alive — stop it instead of touching detached/nonexistent nodes.
    const el = document.querySelector('.dash-fav-slideshow');
    if (!el) { stopFavoriteAutoAdvance(); return; }
    advanceFavoriteSlide(1);
  }, 4500);
}

function advanceFavoriteSlide(delta) {
  _favIndex = (_favIndex + delta + _favSlides.length) % _favSlides.length;
  updateFavoriteSlideDOM();
}

function goToFavoriteSlide(index) {
  _favIndex = index;
  updateFavoriteSlideDOM();
}

// Live-patches only the active-slide/dot classes rather than rebuilding innerHTML — same
// targeted-DOM-patch idiom as utils.js's patchCardImage().
function updateFavoriteSlideDOM() {
  const wrap = document.querySelector('.dash-fav-slideshow');
  if (!wrap) return;
  wrap.querySelectorAll('.dash-fav-slide').forEach((el, i) => el.classList.toggle('active', i === _favIndex));
  document.querySelectorAll('.dash-fav-dot').forEach((el, i) => el.classList.toggle('active', i === _favIndex));
}

function wireFavoritesWidget(container) {
  const wrap = container.querySelector('.dash-fav-slideshow');
  if (!wrap) return; // zero slides even after the curated fallback — buildFavoritesWidget() rendered its own empty state instead

  wrap.querySelector('.dash-fav-prev')?.addEventListener('click', e => {
    e.stopPropagation();
    advanceFavoriteSlide(-1);
    startFavoriteAutoAdvance(); // reset the countdown on manual interaction
  });
  wrap.querySelector('.dash-fav-next')?.addEventListener('click', e => {
    e.stopPropagation();
    advanceFavoriteSlide(1);
    startFavoriteAutoAdvance();
  });
  container.querySelectorAll('.dash-fav-dot').forEach((dot, i) => {
    dot.addEventListener('click', e => {
      e.stopPropagation();
      goToFavoriteSlide(i);
      startFavoriteAutoAdvance();
    });
  });

  wrap.addEventListener('mouseenter', stopFavoriteAutoAdvance);
  wrap.addEventListener('mouseleave', startFavoriteAutoAdvance);

  wrap.addEventListener('click', () => {
    const item = _favSlides[_favIndex];
    if (item) openDetailModal(item);
  });
}

function buildFavoritesWidget() {
  if (_favSlides.length === 0) {
    return `
      <div class="dash-card dash-card--favorites">
        <div class="dash-card-header"><span class="dash-card-title">Favorites Spotlight</span></div>
        <div class="dash-fav-empty">Star an item to see it here.</div>
      </div>`;
  }

  const slidesHtml = _favSlides.map((item, i) => `
    <div class="dash-fav-slide${i === 0 ? ' active' : ''}">
      <img src="${escapeHtml(item.imageUrl || '')}" alt="" loading="lazy" decoding="async"
           onerror="this.style.display='none'">
      <div class="dash-fav-slide-info">${escapeHtml(item.title || '')}</div>
      ${_favIsDemo ? '<span class="dash-fav-demo-badge">✨ Demo · Top 100</span>' : ''}
    </div>`).join('');

  const dotsHtml = _favSlides.length > 1
    ? `<div class="dash-fav-dots">${_favSlides.map((_, i) => `<span class="dash-fav-dot${i === 0 ? ' active' : ''}"></span>`).join('')}</div>`
    : '';

  const arrowsHtml = _favSlides.length > 1 ? `
    <button class="dash-fav-prev" aria-label="Previous">‹</button>
    <button class="dash-fav-next" aria-label="Next">›</button>` : '';

  return `
    <div class="dash-card dash-card--favorites">
      <div class="dash-card-header"><span class="dash-card-title">Favorites Spotlight</span></div>
      <div class="dash-fav-slideshow">${slidesHtml}${arrowsHtml}</div>
      ${dotsHtml}
    </div>`;
}

// ===== kanban widget — a scaled-down peek at the real board, same 4 columns/order =====

const MINI_CARDS_PER_COLUMN = 2;

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

function buildKanbanWidget() {
  const queueItems = state.items.filter(i => i.queueStatus);
  const isEmpty = queueItems.length === 0;

  const columnsHtml = KANBAN_COLUMNS.map((col, colIndex) => {
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

function buildCuratedListsWidget() {
  const chipsHtml = CURATED_GENRES.map(genre => `
    <button class="dash-genre-chip" data-genre="${escapeHtml(genre)}">
      <span class="cat-icon dash-genre-icon">${GENRE_EMOJI[genre] || '📁'}</span>
      <span class="dash-genre-label">${escapeHtml(genre)}</span>
    </button>`).join('');

  return `
    <div class="dash-card dash-card--curated">
      <div class="dash-card-header"><span class="dash-card-title">Curated Lists</span></div>
      <div class="dash-genre-strip">${chipsHtml}</div>
    </div>`;
}

function wireCuratedListsWidget(container) {
  container.querySelectorAll('.dash-genre-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      state.sidebarMode = 'curated';
      state.view = `genre:${btn.dataset.genre}`;
      persistViewState();
      renderSidebar();
      renderGrid();
    });
  });
}

// ===== profile widget (decorative placeholder only — no real data/identity system exists) =====

function buildProfileWidget() {
  return `
    <div class="dash-card dash-card--profile">
      <div class="dash-profile-avatar cat-icon">${GENERIC_PERSON_SVG}</div>
      <div class="dash-profile-name">Your Library</div>
      <div class="dash-profile-sub">Profile customization coming soon.</div>
    </div>`;
}

// ===== hero collage =====

function buildHeroCollage() {
  const hour = new Date().getHours();
  const greeting = hour < 5 ? 'Good night' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  let images = state.items.map(i => i.imageUrl).filter(Boolean);
  if (images.length < 8) {
    const fallback = [
      ...(CURATED_ITEMS['Top 100']?.['Musician'] || []),
      ...(CURATED_ITEMS['Top 100']?.['Music Album'] || []),
    ].map(i => i.imageUrl).filter(Boolean);
    images = images.concat(fallback);
  }
  images = images.slice(0, 24);
  const noCollage = images.length === 0;
  const marqueeImages = [...images, ...images]; // duplicated for a seamless CSS marquee loop

  const thumbsHtml = marqueeImages.map((url, i) => `
    <div class="dash-hero-thumb" style="--rot:${HERO_ROTATIONS[i % HERO_ROTATIONS.length]}deg">
      <img src="${escapeHtml(url)}" alt="" loading="lazy" decoding="async" onerror="this.parentElement.style.display='none'">
    </div>`).join('');

  return `
    <section class="dash-hero${noCollage ? ' dash-hero--no-collage' : ''}">
      <div class="dash-hero-collage" aria-hidden="true">
        <div class="dash-hero-collage-track">${thumbsHtml}</div>
      </div>
      <div class="dash-hero-content">
        <h1 class="dash-hero-greeting">${greeting}</h1>
        <p class="dash-hero-sub">Here's what's waiting in your library.</p>
      </div>
    </section>`;
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

  stopFavoriteAutoAdvance(); // clear any leftover interval before rebuilding

  const fav = resolveFavoriteSlides();
  _favSlides = fav.items;
  _favIsDemo = fav.isDemo;
  _favIndex = 0;

  container.innerHTML = `
    ${buildHeroCollage()}
    <div class="dash-widget-grid">
      ${buildKanbanWidget()}${buildFavoritesWidget()}${buildCuratedListsWidget()}${buildProfileWidget()}
    </div>`;

  wireKanbanWidget(container);
  wireFavoritesWidget(container);
  wireCuratedListsWidget(container);
  startFavoriteAutoAdvance();
  // Deliberately no persistViewState() call here — arriving at/returning to the dashboard is
  // never written to storage as the "last view," so the real last-active view a user was
  // browsing before closing the tab stays intact until they actually navigate somewhere.
}
