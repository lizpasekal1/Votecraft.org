// ===== SHARED SAVES PAGE =====
// A mostly-inert visual preview — nonprofit-sponsored curated lists (same source data as the
// Cause Curated pages) and a demo Friends slider. The cards themselves don't link anywhere; each
// section's plus button is wired, but only as a placeholder back to the Cause Curated page, since
// there's no real "add" flow built yet.

import { state, CURATED_DIRECTORY_CONTENT } from './state.js';
import { escapeHtml } from './utils.js';
import { persistViewState } from './storage.js';
import { _wireCarouselArrows } from './dashboard.js';
import { renderSidebar, renderGrid, resolveOrgImageUrl } from './render.js';

// Rotated across every vertical card's avatar circle.
const SHARED_VCARD_COLORS = ['#5B5BEF', '#E0507A', '#2A9D8F', '#E76F51', '#8E44AD', '#F4A340'];

// A generic "photo goes here" placeholder — used for any card without its own icon (currently
// just Friends, which has no real photo data to show).
const PLACEHOLDER_IMAGE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" height="26px" viewBox="0 -960 960 960" width="26px" fill="currentColor"><path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm80-120h480L570-480 450-320l-90-120-120 160Z"/></svg>';

// A handful of fictional demo people — purely illustrative, no real friend-graph data exists yet
// (see profile.js's own "Friends — coming soon" stub, which this page's Friends section replaces).
const DEMO_FRIENDS = [
  { name: 'Jordan Lee', imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
  { name: 'Sam Rivera', imageUrl: 'https://images.unsplash.com/photo-1592621385612-4d7129426394?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
  { name: 'Casey Kim', imageUrl: 'https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?q=80&w=1335&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
  { name: 'Morgan Blake', imageUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=1480&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
  { name: 'Taylor Osei', imageUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=1364&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
];

// One reusable vertical-card carousel builder — avatar circle, name, tagline, a title/tag pill —
// shared by both sections below so they read as the same visual language.
function buildVerticalCardSlider({ sectionClass, title, cards }) {
  const tripled = [...cards, ...cards, ...cards];
  const cardsHtml = tripled.map((c, i) => {
    const color = SHARED_VCARD_COLORS[i % SHARED_VCARD_COLORS.length];
    const avatarContent = c.imageUrl
      ? `<img src="${escapeHtml(resolveOrgImageUrl(c.imageUrl))}" alt="" loading="lazy" decoding="async">`
      : (c.icon || PLACEHOLDER_IMAGE_SVG);
    return `
      <div class="shared-vcard">
        <div class="shared-vcard-avatar" style="background:${color}">${avatarContent}</div>
        <span class="shared-vcard-name">${escapeHtml(c.name)}</span>
        ${c.tagline ? `<span class="shared-vcard-tagline">${escapeHtml(c.tagline)}</span>` : ''}
        ${c.tag ? `<span class="bare-list-tag bare-list-tag--muted">${escapeHtml(c.tag)}</span>` : ''}
      </div>`;
  }).join('');

  return `
    <div class="dash-card ${sectionClass}">
      <div class="profile-card-header"><span class="profile-card-title">${escapeHtml(title)}</span><button class="top100-row-add-btn" aria-label="Add"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button></div>
      <div class="dash-carousel shared-vcard-carousel">
        <button class="dash-carousel-prev" aria-label="Previous">‹</button>
        <div class="dash-carousel-strip">${cardsHtml}</div>
        <button class="dash-carousel-next" aria-label="Next">›</button>
      </div>
    </div>`;
}

function buildNonprofitSliderSection() {
  const cards = CURATED_DIRECTORY_CONTENT.categories
    .map(({ label, orgs }) => ({ name: orgs[0].name, tagline: orgs[0].tagline, tag: label, icon: orgs[0].icon, imageUrl: orgs[0].imageUrl }));
  return buildVerticalCardSlider({ sectionClass: 'shared-card--nonprofits', title: "Curated Lists You've Connected", cards });
}

function buildFriendsSection() {
  const cards = DEMO_FRIENDS.map(f => ({ name: f.name, imageUrl: f.imageUrl }));
  return buildVerticalCardSlider({ sectionClass: 'shared-card--friends', title: "Friends You've Shared Lists With", cards });
}

function wireCarousels(container) {
  container.querySelectorAll('.shared-vcard-carousel').forEach(carousel => {
    const strip = carousel.querySelector('.dash-carousel-strip');
    if (strip) _wireCarouselArrows(carousel, strip);
  });
}

// Placeholder destination for now — both plus buttons just go to the Cause Curated page, since
// there's no real "add a list"/"add a friend" flow built yet.
function wireAddButtons(container) {
  container.querySelectorAll('.top100-row-add-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.sidebarMode = 'curated';
      state.view = 'curated';
      persistViewState();
      renderSidebar();
      renderGrid();
    });
  });
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
      ${buildNonprofitSliderSection()}
      <div class="shared-section-divider"></div>
      ${buildFriendsSection()}
    </div>`;

  wireCarousels(container);
  wireAddButtons(container);
}
