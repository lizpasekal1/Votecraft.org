// ===== PROFILE PAGE =====
// A full-page view (state.view === 'profile'). Demo mode: every nav entry point (dashboard.js's
// Profile widget, main.js's Settings-dropdown #btn-profile, the sidebar link) currently skips
// the sign-in gate and always lands here — re-add the `getCurrentUser() ? ... : openAuthModal()`
// branching at each of those once real auth is part of the demo. Five stacked sections: Account,
// Connections (Last.fm), Interests (curator-branded curated lists), Your Music Taste, and a
// static Friends placeholder.

import { state, CURATED_GENRES } from './state.js';
import { escapeHtml } from './utils.js';
import { getCurrentUser } from './auth.js';
import { persistFollowedCuratedLists, disconnectLastfm } from './storage.js';
import { ensureLastfmRecentTracks } from './api.js';
import { CURATED_LIST_DISPLAY_NAMES, DEMO_PROFILE_NAME } from './dashboard.js';
import { openAuthModal, openLastfmModal } from './main.js';

// ===== account =====

function buildAccountSection(user) {
  // Demo mode: no real user is signed in yet, so show the same demo persona used on the
  // Dashboard's greeting rather than a blank email.
  const displayName = user ? escapeHtml(user.email) : `${DEMO_PROFILE_NAME} (demo)`;
  return `
    <div class="profile-card profile-card--account">
      <div class="profile-card-header"><span class="profile-card-title">Account</span></div>
      <div class="profile-account-email">${displayName}</div>
      <button class="btn-cancel" id="profile-manage-account">Manage account</button>
    </div>`;
}

function wireAccountSection(container) {
  container.querySelector('#profile-manage-account')?.addEventListener('click', openAuthModal);
}

// ===== connections (Last.fm) =====

const LASTFM_CONNECTION_COPY = 'SaveCraft only reads your public Last.fm username to show your recent scrobbles — no password, no Last.fm login, and nothing is ever posted on your behalf.';

function _timeAgo(timestamp) {
  const diffMin = Math.floor((Date.now() - timestamp) / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;
}

function buildConnectionsSection() {
  const username = state.lastfmUsername;

  if (!username) {
    return `
      <div class="dash-card profile-card--connections">
        <div class="profile-card-header"><span class="profile-card-title">Connections</span></div>
        <div class="profile-connection-row">
          <div class="profile-connection-info">
            <span class="profile-connection-name">Last.fm</span>
            <p class="profile-connection-copy">${escapeHtml(LASTFM_CONNECTION_COPY)}</p>
          </div>
          <button class="btn-primary" id="profile-connect-lastfm">Connect Last.fm</button>
        </div>
      </div>`;
  }

  const cached = state.lastfmCache[username.trim().toLowerCase()];
  const tracks = cached?.tracks || [];
  const fetchedAgo = cached?.fetchedAt ? _timeAgo(cached.fetchedAt) : null;
  const statusLine = fetchedAgo
    ? ` Showing your ${tracks.length} most recent scrobble${tracks.length === 1 ? '' : 's'}, last updated ${fetchedAgo}.`
    : '';

  const tracksHtml = tracks.length ? tracks.map(t => `
    <div class="profile-track-row">
      ${t.imageUrl ? `<img class="profile-track-art" src="${escapeHtml(t.imageUrl)}" alt="" loading="lazy" decoding="async">` : '<span class="profile-track-art profile-track-art--placeholder"></span>'}
      <div class="profile-track-info">
        <span class="profile-track-title">${escapeHtml(t.title || '')}</span>
        <span class="profile-track-artist">${escapeHtml(t.artist || '')}</span>
      </div>
      ${t.nowPlaying ? '<span class="profile-track-nowplaying">Now playing</span>' : ''}
    </div>`).join('') : '<div class="profile-connection-empty">No recent tracks found.</div>';

  return `
    <div class="dash-card profile-card--connections">
      <div class="profile-card-header">
        <span class="profile-card-title">Connections</span>
        <button class="btn-cancel" id="profile-disconnect-lastfm">Disconnect</button>
      </div>
      <div class="profile-connection-row">
        <div class="profile-connection-info">
          <span class="profile-connection-name">Last.fm — connected as ${escapeHtml(username)}</span>
          <p class="profile-connection-copy">${escapeHtml(LASTFM_CONNECTION_COPY)}${escapeHtml(statusLine)}</p>
        </div>
      </div>
      <div class="profile-track-list">${tracksHtml}</div>
    </div>`;
}

// Live-refreshes just the Connections card in place once a fresh fetch resolves, same
// targeted-rebuild idiom dashboard.js uses for its Favorites/Profile cards.
function _rebuildConnectionsCard() {
  const card = document.querySelector('.profile-card--connections');
  if (!card) return;
  const parent = card.parentElement;
  card.outerHTML = buildConnectionsSection();
  wireConnectionsSection(parent);
}

function wireConnectionsSection(container) {
  container.querySelector('#profile-connect-lastfm')?.addEventListener('click', openLastfmModal);
  container.querySelector('#profile-disconnect-lastfm')?.addEventListener('click', () => {
    disconnectLastfm();
    _rebuildConnectionsCard();
  });
}

// ===== interests =====

function buildInterestsSection() {
  const optionsHtml = CURATED_GENRES.map(genre => {
    const label = CURATED_LIST_DISPLAY_NAMES[genre] || genre;
    const checked = state.followedCuratedLists.has(genre) ? 'checked' : '';
    return `
      <label class="profile-interest-option">
        <input type="checkbox" data-genre="${escapeHtml(genre)}" ${checked}>
        <span>${escapeHtml(label)}</span>
      </label>`;
  }).join('');

  return `
    <div class="dash-card profile-card--interests">
      <div class="profile-card-header"><span class="profile-card-title">Interests</span></div>
      <p class="profile-card-copy">Pick which curated lists you'd like to follow.</p>
      <div class="profile-interests-grid">${optionsHtml}</div>
    </div>`;
}

function wireInterestsSection(container) {
  container.querySelectorAll('.profile-interest-option input[type="checkbox"]').forEach(input => {
    input.addEventListener('change', () => {
      const genre = input.dataset.genre;
      if (input.checked) state.followedCuratedLists.add(genre);
      else state.followedCuratedLists.delete(genre);
      persistFollowedCuratedLists();
    });
  });
}

// ===== your music taste =====

// Only reflects item.genre already present on saved Music Album items (populated today via
// "Fetch Albums" and the auto-discography-import flow, both sourced from iTunes) — deliberately
// not backfilled with a live per-item iTunes lookup here, which would mean an unbounded fan-out
// of network calls sized to the whole library on every page load.
function buildMusicTasteSection() {
  const counts = {};
  state.items.forEach(item => {
    if (item.category === 'Music Album' && item.genre) {
      counts[item.genre] = (counts[item.genre] || 0) + 1;
    }
  });
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);

  if (ranked.length === 0) {
    return `
      <div class="dash-card profile-card--taste">
        <div class="profile-card-header"><span class="profile-card-title">Your Music Taste</span></div>
        <p class="profile-card-copy">Add albums via "Fetch Albums" on an artist's page to see your top genres here.</p>
      </div>`;
  }

  const max = ranked[0][1];
  const rowsHtml = ranked.map(([genre, count]) => `
    <div class="profile-genre-row">
      <span class="profile-genre-label">${escapeHtml(genre)}</span>
      <div class="profile-genre-bar-track"><div class="profile-genre-bar-fill" style="width:${Math.round((count / max) * 100)}%"></div></div>
      <span class="profile-genre-count">${count}</span>
    </div>`).join('');

  return `
    <div class="dash-card profile-card--taste">
      <div class="profile-card-header"><span class="profile-card-title">Your Music Taste</span></div>
      <div class="profile-genre-list">${rowsHtml}</div>
    </div>`;
}

// ===== friends (placeholder) =====

function buildFriendsPlaceholderSection() {
  return `
    <div class="dash-card profile-card--friends">
      <div class="profile-card-header"><span class="profile-card-title">Friends</span></div>
      <p class="profile-card-copy">Coming soon — connect with friends to see what they're saving.</p>
    </div>`;
}

// ===== entry point =====

export function renderProfilePage() {
  const container = document.getElementById('cards-grid');
  document.getElementById('grid-title').style.display = 'none';
  document.getElementById('sort-select').style.display = 'none';
  document.querySelector('.grid-header').style.display = 'none';
  container.className = 'profile-page-wrap';

  const user = getCurrentUser();

  container.innerHTML = `
    <div class="profile-page">
      ${buildAccountSection(user)}
      <div class="profile-widget-grid">
        ${buildConnectionsSection()}
        ${buildInterestsSection()}
        ${buildMusicTasteSection()}
        ${buildFriendsPlaceholderSection()}
      </div>
    </div>`;

  wireAccountSection(container);
  wireConnectionsSection(container);
  wireInterestsSection(container);

  if (state.lastfmUsername) {
    ensureLastfmRecentTracks(state.lastfmUsername).then(() => {
      if (state.view === 'profile') _rebuildConnectionsCard();
    });
  }
}
