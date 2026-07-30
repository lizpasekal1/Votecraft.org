// ===== CURATED (TOP 100 / DIRECTORY / BARE-LIST) LANDING PAGE RENDERING =====

import {
  state, CURATED_ITEMS, CAT_EMOJI, CURATED_DIRECTORY_CONTENT,
  BOOKMARK_OUTLINE_SVG, BOOKMARK_FILLED_SVG,
} from './state.js';
import { escapeHtml, isItunesArtworkUrl } from './utils.js';
import { persistViewState } from './storage.js';
import { openDetailModal } from './detailModal.js';
import { renderSidebar } from './renderSidebar.js';
import { renderGrid } from './renderGrid.js';
import { wireQuickQueueButtons } from './renderCardActions.js';
import { fetchMissingCuratedImages, fetchMissingCuratedMusicianPhotos } from './renderCuratedImageFetch.js';
import { _wireCarouselArrows } from './dashboard.js';

// Wraps the literal phrase "Inquire to create" in the hero description with a link to the
// Sponsored pitch page, underlined so it reads as a call-to-action inline with the copy.
function linkifyHeroDescription(description) {
  const phrase = 'Inquire to create';
  const idx = description.indexOf(phrase);
  if (idx === -1) return escapeHtml(description);
  const before = description.slice(0, idx);
  const after = description.slice(idx + phrase.length);
  const sponsoredUrl = chrome.runtime.getURL('src/sponsored/sponsored.html');
  return `${escapeHtml(before)}<a class="top100-hero-desc-link" href="${sponsoredUrl}" target="_blank" rel="noopener">${escapeHtml(phrase)}</a>${escapeHtml(after)}`;
}

// Bare-bones filter state for the flat directory below — resets each session (not persisted),
// since it's just a display convenience for this fully inert demo list, not real data filtering.
let _bareListCategoryFilter = null;

// A palette rotated across avatar circles, standing in for a real org logo/photo.
const DIRECTORY_AVATAR_COLORS = ['#5B5BEF', '#E0507A', '#2A9D8F', '#E76F51', '#8E44AD', '#F4A340'];

// An org's optional imageUrl (CURATED_DIRECTORY_CONTENT) can be either a real external URL (a
// logo hosted elsewhere) or a path local to this extension's own images/ folder — only the
// latter needs chrome.runtime.getURL(), and calling it on an already-absolute URL would break it.
export function resolveOrgImageUrl(imageUrl) {
  return /^https?:\/\//.test(imageUrl) ? imageUrl : chrome.runtime.getURL(imageUrl);
}

// The top-level Curated SaveCraft landing — a bare-bones, ActBlue-style flat list of the same
// nonprofit-sponsored orgs as CURATED_DIRECTORY_CONTENT (state.js), with a link through to the
// fuller "Curated-full-list" hero+carousel page (renderCuratedDirectory() below). Still fully
// inert — org rows don't navigate anywhere real — but the cause-area filter chips do actually
// filter this flat list client-side, since that doesn't imply any of these orgs are real/live.
export function renderCuratedBareList(container) {
  container.className = 'cards-grid bare-list-page';
  document.getElementById('grid-title').style.display = 'none';
  document.querySelector('.grid-header').style.display = 'none';

  const content = CURATED_DIRECTORY_CONTENT;
  const allOrgs = content.categories.flatMap(({ label, orgs }) => orgs.map(org => ({ ...org, category: label })));
  const visibleOrgs = _bareListCategoryFilter ? allOrgs.filter(o => o.category === _bareListCategoryFilter) : allOrgs;

  const filterChipsHtml = content.categories.map(({ label }) => `
    <button class="bare-list-chip${_bareListCategoryFilter === label ? ' bare-list-chip--active' : ''}" data-category="${escapeHtml(label)}">${escapeHtml(label)}</button>
  `).join('');

  const rowsHtml = visibleOrgs.map((org, i) => {
    // Progressive List's logo specifically needs a white backdrop to read correctly; Votecraft
    // List always gets the actual SaveCraft brand purple, not whichever color the rotation lands
    // on; every other avatar (real logo or emoji) keeps the normal rotating brand color.
    const color = org.name === 'Progressive List' ? '#fff'
      : org.name === 'Votecraft List' ? '#5B5BEF'
      : DIRECTORY_AVATAR_COLORS[i % DIRECTORY_AVATAR_COLORS.length];
    const avatarContent = org.imageUrl
      ? `<img src="${escapeHtml(resolveOrgImageUrl(org.imageUrl))}" alt="">`
      : org.icon;
    return `
      <div class="bare-list-row"${org.linkTo ? ` data-link-to="${escapeHtml(org.linkTo)}"` : ''}>
        <button class="bare-list-bookmark-btn" title="Add to your curated list slider" aria-label="Bookmark">${BOOKMARK_OUTLINE_SVG}</button>
        <div class="bare-list-avatar" style="background:${color}">${avatarContent}</div>
        <div class="bare-list-info">
          <span class="bare-list-org-name">${escapeHtml(org.name)}</span>
          <span class="bare-list-org-tagline">${escapeHtml(org.tagline)}</span>
          <div class="bare-list-tags">
            <span class="bare-list-tag bare-list-tag--muted">${escapeHtml(org.category)}</span>
          </div>
        </div>
        <button class="bare-list-view-btn">View</button>
      </div>`;
  }).join('');

  container.innerHTML = `
    <div class="bare-list-page-inner">
      <div class="bare-list-header bare-list-hero">
        <h2 class="bare-list-title">Cause Curated</h2>
        <p class="bare-list-desc">Browse nonprofit-sponsored curated lists.</p>
      </div>
      <div class="bare-list-body">
        <div class="bare-list-filters">
          <div class="bare-list-filter-section-title">Cause Area</div>
          <div class="bare-list-chips">${filterChipsHtml}</div>
          <div class="bare-list-filter-section-title bare-list-why-title">Why Curated Lists</div>
          <p class="bare-list-why-copy">A good list is a shortcut — built by people who already did the digging, so you don't have to. Curated lists surface what's worth your time from partners whose values you trust, instead of leaving it to chance.</p>
        </div>
        <div class="bare-list-rows">
          ${rowsHtml}
          <button class="bare-list-seeall-btn" data-view="curated-full-list">See all →</button>
        </div>
      </div>
    </div>
  `;

  container.querySelector('.bare-list-seeall-btn')?.addEventListener('click', () => {
    state.view = 'curated-full-list';
    persistViewState();
    renderSidebar();
    renderGrid();
  });

  // The rare row backed by a real destination (currently just Votecraft List -> VoteCraft Picks,
  // via CURATED_DIRECTORY_CONTENT's optional org.linkTo) actually navigates; every other row here
  // stays inert, per the page's usual demo/pitch purpose.
  container.querySelectorAll('.bare-list-row[data-link-to]').forEach(row => {
    row.addEventListener('click', e => {
      if (e.target.closest('.bare-list-bookmark-btn')) return;
      state.sidebarMode = 'curated';
      state.view = row.dataset.linkTo;
      persistViewState();
      renderSidebar();
      renderGrid();
    });
  });

  // Demo-only toggle — purely visual, doesn't persist or touch the Kanban queue. This directory is
  // a pitch/demo page (see renderCuratedDirectory() above), not real data.
  container.querySelectorAll('.bare-list-bookmark-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const active = btn.classList.toggle('bare-list-bookmark-btn--active');
      btn.innerHTML = active ? BOOKMARK_FILLED_SVG : BOOKMARK_OUTLINE_SVG;
    });
  });

  container.querySelectorAll('.bare-list-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const cat = chip.dataset.category;
      _bareListCategoryFilter = _bareListCategoryFilter === cat ? null : cat;
      renderCuratedBareList(container);
    });
  });
}

export function renderCuratedDirectory(container) {
  container.className = 'cards-grid top100-landing';
  document.getElementById('grid-title').style.display = 'none';
  document.querySelector('.grid-header').style.display = 'none';

  const content = CURATED_DIRECTORY_CONTENT;
  const categoriesHtml = content.categories.map(({ label, orgs }) => {
    const tripled = [...orgs, ...orgs, ...orgs];
    const cardsHtml = tripled.map(org => {
      const artContent = org.imageUrl
        ? `<img class="directory-org-logo" src="${escapeHtml(resolveOrgImageUrl(org.imageUrl))}" alt="">`
        : `<span class="directory-org-icon">${org.icon}</span>`;
      return `
      <div class="directory-org-card">
        <div class="directory-org-art">${artContent}</div>
        <span class="directory-org-name">${escapeHtml(org.name)}</span>
        <span class="directory-org-tagline">${escapeHtml(org.tagline)}</span>
      </div>`;
    }).join('');
    return `
      <div class="directory-category">
        <div class="directory-category-title">${escapeHtml(label)}</div>
        <div class="dash-carousel directory-carousel">
          <button class="dash-carousel-prev" aria-label="Previous">‹</button>
          <div class="dash-carousel-strip">${cardsHtml}</div>
          <button class="dash-carousel-next" aria-label="Next">›</button>
        </div>
      </div>`;
  }).join('');

  container.innerHTML = `
    <div class="top100-hero">
      <div class="top100-hero-text">
        <div class="top100-wordmark"><img src="${chrome.runtime.getURL('images/logos/votecraft-logo_white.png')}" alt="VoteCraft" class="top100-wordmark-logo"></div>
        <h2 class="top100-hero-title">${escapeHtml(content.headline)}</h2>
        <p class="top100-hero-desc">${escapeHtml(content.description)}</p>
      </div>
      <div class="top100-icon-badge"><img src="${chrome.runtime.getURL('images/logos/votecraft_icon_white.png')}" alt=""></div>
    </div>
    ${categoriesHtml}
    <div class="top100-cta">
      <span class="top100-cta-text">Want your organization's picks featured here?</span>
      <a class="top100-cta-btn" href="${chrome.runtime.getURL('src/sponsored/sponsored.html')}" target="_blank" rel="noopener">Become a Sponsor →</a>
    </div>
  `;

  container.querySelectorAll('.directory-carousel').forEach(carousel => {
    const strip = carousel.querySelector('.dash-carousel-strip');
    if (strip) _wireCarouselArrows(carousel, strip);
  });
}

// A richer landing page for a curated genre (currently just Top 100 — see
// CURATED_GENRE_LANDING_CONTENT in state.js), shown instead of the plain "Pick a category" empty
// state. Deliberately styled distinct from the Dashboard (see cards.css's .top100-* rules) even
// though it reuses the Dashboard's proven scroll-carousel mechanics (_wireCarouselArrows) —
// same plumbing, different skin, so this reads as its own destination, not "the Dashboard again."
export function renderCuratedGenreLanding(container, genre, content) {
  container.className = 'cards-grid top100-landing';

  // The hero band below is this view's real header — hide the standard #grid-title ("Top 100
  // Saves") and empty out .grid-header (its sort dropdown gets moved into the hero area itself,
  // see below) so the hero sits flush at the top instead of leaving a redundant gap above it.
  // The sidebar's own "Top 100 Saves" back-button label is a separate element, untouched.
  document.getElementById('grid-title').style.display = 'none';
  document.querySelector('.grid-header').style.display = 'none';

  // Every other curated view resolves an item's displayed image through this same fallback
  // chain (see getFilteredSortedItems()'s genre: branch) before ever falling back to a live
  // fetch — skipping it here was why these rows showed the fallback icon for almost everything
  // instead of real cover art, even for items that already had a cached image sitting in
  // storage from being viewed elsewhere in the app.
  function resolveRowItemImage(i, category) {
    let imageUrl = i.imageUrl || null;
    if (!imageUrl && state.curatedImgCache[i.id]) imageUrl = state.curatedImgCache[i.id];
    if (category === 'Musician') {
      const wikiPhoto = state.artistBioCache[(i.title || '').trim().toLowerCase()]?.photoUrl;
      if (wikiPhoto && (!imageUrl || isItunesArtworkUrl(imageUrl))) imageUrl = wikiPhoto;
    }
    return imageUrl;
  }

  const allRowItems = []; // flattened, de-tripled — fed to the live-fetch calls below
  const rowsHtml = content.rows.map(({ category, label, titles }) => {
    const categoryItems = CURATED_ITEMS[genre]?.[category] || [];
    // `titles` (see CURATED_GENRE_LANDING_CONTENT in state.js) hand-picks exactly these items, by
    // exact title match, in this exact order — falls back to the default "first 15" otherwise.
    const rawItems = titles
      ? titles.map(t => categoryItems.find(i => i.title === t)).filter(i => i && !state.hiddenCurated.has(i.id))
      : categoryItems.filter(i => !state.hiddenCurated.has(i.id)).slice(0, 15);
    if (!rawItems.length) return '';
    const rowItems = rawItems.map(i => ({ ...i, category, curated: true, imageUrl: resolveRowItemImage(i, category) }));
    allRowItems.push(...rowItems);
    // Tripled for the same "always room to scroll either direction" trick
    // _wireCarouselArrows() (dashboard.js) already relies on for the Dashboard's own rows.
    const tripled = [...rowItems, ...rowItems, ...rowItems];
    const cardsHtml = tripled.map(item => {
      const art = item.imageUrl
        ? `<img src="${escapeHtml(item.imageUrl)}" alt="" loading="lazy" decoding="async">`
        : `<span class="top100-row-card-fallback">${CAT_EMOJI[category] || '🎬'}</span>`;
      const isQueued = !!state.items.find(i => i.id === item.id && i.queueStatus);
      // A plain div, not a <button> — it needs to contain the bookmark <button> below, and
      // nesting a button inside a button is invalid HTML (the click wiring below works
      // identically either way, since it's addEventListener-based, not relying on native
      // <button> semantics).
      return `
        <div class="top100-row-card" data-id="${escapeHtml(item.id)}" data-category="${escapeHtml(category)}">
          <div class="top100-row-card-art">
            ${art}
            <button class="card-quick-queue-btn${isQueued ? ' card-quick-queue-btn--active' : ''}" data-id="${escapeHtml(item.id)}" title="${isQueued ? 'In your queue' : 'Add to queue'}">${isQueued ? BOOKMARK_FILLED_SVG : BOOKMARK_OUTLINE_SVG}</button>
          </div>
          <span class="top100-row-card-label">${escapeHtml(item.title || '')}</span>
        </div>`;
    }).join('');
    return `
      <div class="top100-row">
        <div class="top100-row-header" data-genre="${escapeHtml(genre)}" data-category="${escapeHtml(category)}">
          <span class="top100-row-title">${escapeHtml(label)}</span>
          <button class="top100-row-add-btn" aria-label="Open ${escapeHtml(label)}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
          <span class="top100-row-see-all">See all →</span>
        </div>
        <div class="dash-carousel top100-carousel">
          <button class="dash-carousel-prev" aria-label="Previous">‹</button>
          <div class="dash-carousel-strip">${cardsHtml}</div>
          <button class="dash-carousel-next" aria-label="Next">›</button>
        </div>
      </div>`;
  }).join('');

  container.innerHTML = `
    <div class="top100-hero">
      <div class="top100-hero-text">
        <div class="top100-wordmark"><img src="${chrome.runtime.getURL('images/logos/votecraft-logo_white.png')}" alt="VoteCraft" class="top100-wordmark-logo"></div>
        <h2 class="top100-hero-title">${escapeHtml(content.headline)}</h2>
        <p class="top100-hero-desc">${linkifyHeroDescription(content.description)}</p>
      </div>
      <div class="top100-icon-badge"><img src="${chrome.runtime.getURL('images/logos/votecraft_icon_white.png')}" alt=""></div>
    </div>
    <div class="top100-sort-wrap"></div>
    ${rowsHtml}
    <div class="top100-cta">
      <span class="top100-cta-text">Want your organization's picks featured like this?</span>
      <a class="top100-cta-btn" href="${chrome.runtime.getURL('src/sponsored/sponsored.html')}" target="_blank" rel="noopener">Become a Sponsor →</a>
    </div>
  `;

  // Physically relocates the real, singleton #sort-select node (safe — see the comment at the
  // top of renderGrid() for why) into this view's own layout, below the hero, instead of its
  // usual spot in the now-hidden .grid-header toolbar.
  const sortWrap = container.querySelector('.top100-sort-wrap');
  const sortSelect = document.getElementById('sort-select');
  sortWrap.appendChild(sortSelect);
  sortSelect.style.display = '';

  // Same live-fetch-and-patch pipeline the main curated grid uses for anything still missing an
  // image after the cache-merge above (Microlink for a general thumbnail, Wikipedia specifically
  // for Musicians) — patchCardImage() (utils.js) has a .top100-row-card branch to receive it.
  fetchMissingCuratedImages(allRowItems);
  fetchMissingCuratedMusicianPhotos(allRowItems);

  container.querySelectorAll('.top100-carousel').forEach(carousel => {
    const strip = carousel.querySelector('.dash-carousel-strip');
    if (strip) _wireCarouselArrows(carousel, strip);
  });

  container.querySelectorAll('.top100-row-card').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = allRowItems.find(i => i.id === btn.dataset.id && i.category === btn.dataset.category);
      if (item) openDetailModal(item);
    });
  });

  container.querySelectorAll('.top100-row-header').forEach(btn => {
    btn.addEventListener('click', () => {
      state.view = `genre:${btn.dataset.genre}:${btn.dataset.category}`;
      persistViewState();
      renderSidebar();
      renderGrid();
    });
  });

  wireQuickQueueButtons(container);
}
