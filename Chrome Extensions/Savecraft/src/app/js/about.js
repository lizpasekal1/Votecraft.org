// ===== ABOUT PAGE =====
// A small in-app page (state.view === 'about') — per direct request, reuses Shared Saves' own
// page shell (.shared-page-wrap/.shared-page/.bare-list-header.bare-list-hero) so it reads as the
// same kind of page, but its own content is just the same "Privacy Policy · Terms of Service" row
// already used on the Profile page (profile.js's buildLegalLinksRow, reused rather than
// duplicated — per a live reference screenshot of exactly that row). Reached from the header's
// Settings dropdown (was briefly an external link straight to the marketing page instead —
// corrected per direct follow-up: "about should still be in the savecraft app").

import { buildLegalLinksRow } from './profile.js';

export function renderAboutPage() {
  const container = document.getElementById('cards-grid');
  document.getElementById('grid-title').style.display = 'none';
  document.getElementById('sort-select').style.display = 'none';
  document.querySelector('.grid-header').style.display = 'none';
  container.className = 'shared-page-wrap';

  container.innerHTML = `
    <div class="shared-page">
      <div class="bare-list-header bare-list-hero">
        <h2 class="bare-list-title">About Us</h2>
        <p class="bare-list-desc">SaveCraft is a VoteCraft.org product.</p>
        <p class="bare-list-desc">VoteCraft creates immersive civic engagement—through educational demos, games, and currency. Empower Democracy with us today.</p>
      </div>
      ${buildLegalLinksRow('about-legal-links')}
    </div>`;
}
