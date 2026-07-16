// ===== SHARED SAVES PAGE =====
// A dashboard of "portals" — one card per curated list the user follows (via
// state.followedCuratedLists, set from Profile > Interests) plus a lightweight Friends section.
// Unlike the Curated SaveCraft directory (render.js's renderCuratedDirectory(), fully inert), the
// portal cards here are real navigation into genres the user has actually opted into.

import { state, CURATED_GENRES, GENRE_EMOJI } from './state.js';
import { escapeHtml } from './utils.js';
import { persistViewState } from './storage.js';
import { CURATED_LIST_DISPLAY_NAMES, CURATED_LIST_COVER_OVERRIDES, _resolveGenreCover } from './dashboard.js';
import { renderSidebar, renderGrid } from './render.js';

function buildFollowedListsSection() {
  const followed = CURATED_GENRES.filter(genre => state.followedCuratedLists.has(genre));

  if (followed.length === 0) {
    return `
      <div class="dash-card shared-card--lists">
        <div class="profile-card-header"><span class="profile-card-title">Lists You Follow</span></div>
        <p class="profile-card-copy">Follow some curated lists from Profile → Interests to see them here.</p>
      </div>`;
  }

  const cardsHtml = followed.map(genre => {
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
    <div class="dash-card shared-card--lists">
      <div class="profile-card-header"><span class="profile-card-title">Lists You Follow</span></div>
      <div class="shared-portals-grid">${cardsHtml}</div>
    </div>`;
}

function wireFollowedListsSection(container) {
  container.querySelectorAll('.shared-card--lists .dash-thumb-card').forEach(btn => {
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
}

function buildFriendsSection() {
  return `
    <div class="dash-card shared-card--friends">
      <div class="profile-card-header"><span class="profile-card-title">Friends</span></div>
      <p class="profile-card-copy">Coming soon — connect with friends to see what they're saving.</p>
    </div>`;
}

export function renderSharedSavesPage() {
  const container = document.getElementById('cards-grid');
  document.getElementById('grid-title').style.display = 'none';
  document.getElementById('sort-select').style.display = 'none';
  document.querySelector('.grid-header').style.display = 'none';
  container.className = 'shared-page-wrap';

  container.innerHTML = `
    <div class="shared-page">
      <div class="bare-list-header bare-list-hero">
        <h2 class="bare-list-title">Shared Saves</h2>
        <p class="bare-list-desc">Curated lists you follow, and friends you've connected with.</p>
      </div>
      ${buildFollowedListsSection()}
      ${buildFriendsSection()}
    </div>`;

  wireFollowedListsSection(container);
}
