// ===== PROFILE PAGE =====
// A full-page view (state.view === 'profile'). Both nav entry points (dashboard.js's Profile
// widget and main.js's Settings-dropdown #btn-profile) gate on getCurrentUser() before landing
// here — a signed-out click opens the auth modal instead. Account sits full-width at the top;
// below it, a 2x2 widget grid: Connections (Last.fm, Steam), Interests (curator-branded curated
// lists), My Notes (placeholder — future home for finding items with notes on them), and Saved
// Lists (per-list category/folder scoping — the old "Friends" 4th-slot placeholder this grid was
// originally sized for never got built; these replaced it).

import { state, CURATED_GENRES, CATEGORIES, CAT_LABEL } from './state.js';
import { escapeHtml } from './utils.js';
import { getCurrentUser, resendVerificationEmail } from './auth.js';
import { persistFollowedCuratedLists, persistSavedLists, persistFolder, disconnectLastfm, disconnectSteam } from './storage.js';
import { ensureLastfmRecentTracks, ensureSteamRecentGames } from './api.js';
import { CURATED_LIST_DISPLAY_NAMES, DEMO_PROFILE_NAME } from './dashboard.js';
import { openAuthModal, openLastfmModal, openSteamModal } from './main.js';

// ===== account =====

function buildAccountSection(user) {
  // The Profile page is browsable without signing in (a deliberate choice — see the "Intentionally
  // NOT gated" comments on the two nav entry points, main.js/dashboard.js) — this is where that
  // shows up: no real user yet, so show the same demo persona used on the Dashboard's greeting
  // rather than a blank email. "Manage account" below is the actual sign-in entry point.
  const displayName = user ? escapeHtml(user.email) : `${DEMO_PROFILE_NAME} (demo)`;
  // Purely informational — never blocks anything, same "never lock people out" stance as the rest
  // of this app's auth handling (matches the identical reminder in main.js's applyAuthUI, which
  // covers the auth modal's own signed-in view).
  const verifyBanner = (user && !user.emailVerified) ? `
    <div class="profile-verify-banner">
      Please verify your email — check your inbox for a link.
      <button type="button" id="profile-resend-verify" class="auth-resend-link">Resend email</button>
    </div>` : '';
  return `
    <div class="profile-card profile-card--account">
      <div class="profile-account-row">
        <div class="profile-account-identity">
          <span class="profile-avatar">ZP</span>
          <div class="profile-account-text">
            <div class="profile-card-title">Account</div>
            <div class="profile-account-email">${displayName}</div>
          </div>
        </div>
        <button class="btn-cancel" id="profile-manage-account">Manage account</button>
      </div>
      ${verifyBanner}
    </div>`;
}

function wireAccountSection(container) {
  container.querySelector('#profile-manage-account')?.addEventListener('click', openAuthModal);
  container.querySelector('#profile-resend-verify')?.addEventListener('click', async e => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.textContent = 'Sending…';
    const result = await resendVerificationEmail();
    btn.textContent = result.ok ? 'Sent!' : 'Resend email';
    btn.disabled = false;
  });
}

// ===== connections (Last.fm, Steam) =====
// One "Connections" card holding a row per platform, keeping the card count at 4 so the widget
// grid stays exactly the Dashboard's 2x2 shape (see renderProfilePage below) — a new card per
// platform would break that. Each row follows the same not-connected/connected shape:
// name + copy on the left, a Connect/Disconnect button on the right, vertically centered.

const NO_LOGIN_REQUIRED_COPY = 'No password, no login required.';
const LASTFM_CONNECTION_COPY = 'We only access your public Last.fm profile.';
const STEAM_CONNECTION_COPY = 'We only access your public Steam profile.';

function _timeAgo(timestamp) {
  const diffMin = Math.floor((Date.now() - timestamp) / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;
}

function buildLastfmRow() {
  const username = state.lastfmUsername;

  if (!username) {
    return `
      <div class="profile-connection-row">
        <div class="profile-connection-info">
          <span class="profile-connection-name">Last.fm</span>
          <p class="profile-card-copy">${escapeHtml(LASTFM_CONNECTION_COPY)}<br>${escapeHtml(NO_LOGIN_REQUIRED_COPY)}</p>
        </div>
        <button class="btn-primary" id="profile-connect-lastfm">Connect<br>Last.fm</button>
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
    <div class="profile-connection-row">
      <div class="profile-connection-info">
        <span class="profile-connection-name">Last.fm — connected as ${escapeHtml(username)}</span>
        <p class="profile-card-copy">${escapeHtml(LASTFM_CONNECTION_COPY)}<br>${escapeHtml(NO_LOGIN_REQUIRED_COPY)}${escapeHtml(statusLine)}</p>
      </div>
      <button class="btn-cancel" id="profile-disconnect-lastfm">Disconnect</button>
    </div>
    <div class="profile-track-list">${tracksHtml}</div>`;
}

function buildSteamRow() {
  const steamId = state.steamId;

  if (!steamId) {
    return `
      <div class="profile-connection-row">
        <div class="profile-connection-info">
          <span class="profile-connection-name">Steam</span>
          <p class="profile-card-copy">${escapeHtml(STEAM_CONNECTION_COPY)}<br>${escapeHtml(NO_LOGIN_REQUIRED_COPY)}</p>
        </div>
        <button class="btn-primary" id="profile-connect-steam">Connect<br>Steam</button>
      </div>`;
  }

  const cached = state.steamCache[steamId.trim().toLowerCase()];
  const games = cached?.games || [];
  const fetchedAgo = cached?.fetchedAt ? _timeAgo(cached.fetchedAt) : null;
  const statusLine = fetchedAgo
    ? ` Showing your ${games.length} recently played game${games.length === 1 ? '' : 's'}, last updated ${fetchedAgo}.`
    : '';

  const gamesHtml = games.length ? games.map(g => `
    <div class="profile-track-row">
      ${g.imageUrl ? `<img class="profile-track-art" src="${escapeHtml(g.imageUrl)}" alt="" loading="lazy" decoding="async">` : '<span class="profile-track-art profile-track-art--placeholder"></span>'}
      <div class="profile-track-info">
        <span class="profile-track-title">${escapeHtml(g.name || '')}</span>
        <span class="profile-track-artist">${g.playtime2Weeks ? `${Math.round(g.playtime2Weeks / 60 * 10) / 10} hrs past 2 weeks` : ''}</span>
      </div>
    </div>`).join('') : '<div class="profile-connection-empty">No recently played games found.</div>';

  return `
    <div class="profile-connection-row">
      <div class="profile-connection-info">
        <span class="profile-connection-name">Steam — connected as ${escapeHtml(steamId)}</span>
        <p class="profile-card-copy">${escapeHtml(STEAM_CONNECTION_COPY)}<br>${escapeHtml(NO_LOGIN_REQUIRED_COPY)}${escapeHtml(statusLine)}</p>
      </div>
      <button class="btn-cancel" id="profile-disconnect-steam">Disconnect</button>
    </div>
    <div class="profile-track-list">${gamesHtml}</div>`;
}

// Not wired up, and there's no known path yet — Meta shut down the personal-account Instagram
// Basic Display API in Dec 2024; what's left (the Graph API) only supports Business/Creator
// accounts and requires Meta's App Review process. Placeholder only, flagging intent to revisit
// once there's an actual plan for how this would work.
function buildInstagramRow() {
  return `
    <div class="profile-connection-row">
      <div class="profile-connection-info">
        <span class="profile-connection-name">Instagram</span>
        <p class="profile-card-copy">Coming soon — no confirmed path yet (Instagram's personal-account API was discontinued; the replacement requires a Business/Creator account and Meta app review).</p>
      </div>
      <button class="btn-primary" disabled>Coming soon</button>
    </div>`;
}

function buildConnectionsSection() {
  return `
    <div class="dash-card profile-card--connections">
      <div class="profile-card-header"><span class="profile-card-title">Connections</span></div>
      <div class="profile-connections-list">
        ${buildLastfmRow()}
        <div class="profile-connection-divider"></div>
        ${buildSteamRow()}
        <div class="profile-connection-divider"></div>
        ${buildInstagramRow()}
      </div>
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
  container.querySelector('#profile-connect-steam')?.addEventListener('click', openSteamModal);
  container.querySelector('#profile-disconnect-steam')?.addEventListener('click', () => {
    disconnectSteam();
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

// ===== saved lists (folder scoping) =====
// Lets the user choose which category folders are relevant to each custom Saved List (Health,
// Motivation, anything user-added) — e.g. Health might not want a "Games" section at all, or
// might want it narrowed down to just "Mobile Games". Deliberately excludes the built-in
// "All My Saves" (default-favorites) list — that one's the catch-all and is always unrestricted, so
// there's nothing to configure for it. See renderSidebar.js's activeSavedListFolderScope() for
// where this actually filters the sidebar's category>folder tree while a scoped list is active.

const _expandedProfileSavedLists = new Set(); // page-local (which list rows are expanded) —
                                               // doesn't persist across visits, same lifecycle as
                                               // the detail modal's own accordion state
const _expandedProfileSavedListCategories = new Set(); // page-local, keyed "<listId>::<category>"
                                               // — each category group is its own nested
                                               // accordion, collapsed by default, so a list with
                                               // many user-added folders doesn't dump everything
                                               // on screen at once

function _allFolderIds() {
  return state.folders.map(f => f.id);
}

function _getSavedListById(id) {
  return state.savedLists.find(l => l.id === id);
}

// Adds/removes a single folder id from a list's allowedFolderIds, materializing it from the
// unrestricted (null) default on first touch. Normalizes back to null once every folder that
// exists is present again, so "fully unrestricted" stays a clean explicit state rather than a
// maxed-out array that silently stops covering folders added later elsewhere.
function _setFolderAllowed(list, folderId, allowed) {
  const all = _allFolderIds();
  let current = list.allowedFolderIds ? [...list.allowedFolderIds] : [...all];
  if (allowed) {
    if (!current.includes(folderId)) current.push(folderId);
  } else {
    current = current.filter(id => id !== folderId);
  }
  list.allowedFolderIds = (current.length === all.length) ? null : current;
}

function _buildSavedListCategoryTree(list) {
  const scope = list.allowedFolderIds || null; // null = unrestricted, everything checked
  const categoriesHtml = CATEGORIES.map(cat => {
    const folders = state.folders.filter(f => f.parentCategory === cat);
    if (!folders.length) return ''; // nothing to restrict for a category with no folders at all
    const checkedCount = scope ? folders.filter(f => scope.includes(f.id)).length : folders.length;
    const catChecked = checkedCount === folders.length;
    const catIndeterminate = checkedCount > 0 && checkedCount < folders.length;
    // Each category is its own nested accordion (arrow is a separate click target from the
    // checkbox/label, so expanding/collapsing a category never fights with toggling its
    // selection) — collapsed by default so a list with lots of user-added folders doesn't dump
    // every checkbox on screen at once.
    const catKey = `${list.id}::${cat}`;
    const catExpanded = _expandedProfileSavedListCategories.has(catKey);
    const catArrow = catExpanded ? '▼' : '▶';
    const folderRows = folders.map(f => {
      const checked = !scope || scope.includes(f.id);
      return `
        <label class="profile-saved-list-folder">
          <input type="checkbox" data-list-id="${escapeHtml(list.id)}" data-folder-id="${escapeHtml(f.id)}" ${checked ? 'checked' : ''}>
          <span>${escapeHtml(f.name)}</span>
        </label>`;
    }).join('');
    // New folder here is a real category folder (state.folders — shared globally, same as the
    // sidebar's own "+ New folder"), not something scoped to this list alone; it's auto-included
    // in *this* list's allowedFolderIds on creation (see wireSavedListsSection's handler) since
    // the user explicitly added it while configuring this list, but every other list follows its
    // own normal default (auto-included if unrestricted, needs manual inclusion otherwise).
    const addFolderRow = `
        <div class="profile-saved-list-add-folder" data-list-id="${escapeHtml(list.id)}" data-category="${escapeHtml(cat)}">+ Add new</div>`;
    return `
      <div class="profile-saved-list-category-group">
        <div class="profile-saved-list-category-row">
          <span class="profile-saved-list-category-arrow" data-list-id="${escapeHtml(list.id)}" data-category="${escapeHtml(cat)}">${catArrow}</span>
          <label class="profile-saved-list-category">
            <input type="checkbox" class="profile-saved-list-category-checkbox" data-list-id="${escapeHtml(list.id)}" data-category="${escapeHtml(cat)}" ${catChecked ? 'checked' : ''} data-indeterminate="${catIndeterminate}">
            <span>${escapeHtml(CAT_LABEL[cat] || cat)}</span>
          </label>
        </div>
        ${catExpanded ? `<div class="profile-saved-list-folders">${folderRows}${addFolderRow}</div>` : ''}
      </div>`;
  }).join('');
  return `<div class="profile-saved-list-tree">${categoriesHtml}</div>`;
}

function _buildSavedListRow(list) {
  const expanded = _expandedProfileSavedLists.has(list.id);
  const arrow = expanded ? '▼' : '▶';
  return `
    <div class="profile-saved-list-row" data-list-id="${escapeHtml(list.id)}">
      <span class="profile-saved-list-arrow">${arrow}</span>
      <span class="profile-saved-list-name">${escapeHtml(list.name)}</span>
    </div>
    ${expanded ? _buildSavedListCategoryTree(list) : ''}`;
}

function buildSavedListsSection() {
  const lists = state.savedLists.filter(l => l.id !== 'default-favorites');
  const rowsHtml = lists.map(_buildSavedListRow).join('');
  return `
    <div class="dash-card profile-card--saved-lists">
      <div class="profile-card-header"><span class="profile-card-title">Saved Lists</span></div>
      <p class="profile-card-copy">Choose which folders are relevant to each list.</p>
      <div class="profile-saved-lists-tree">${rowsHtml}</div>
    </div>`;
}

// Same targeted-rebuild idiom as _rebuildConnectionsCard() above.
function _rebuildSavedListsCard() {
  const card = document.querySelector('.profile-card--saved-lists');
  if (!card) return;
  const parent = card.parentElement;
  card.outerHTML = buildSavedListsSection();
  wireSavedListsSection(parent);
}

function wireSavedListsSection(container) {
  container.querySelectorAll('.profile-saved-list-row').forEach(row => {
    row.addEventListener('click', () => {
      const listId = row.dataset.listId;
      if (_expandedProfileSavedLists.has(listId)) _expandedProfileSavedLists.delete(listId);
      else _expandedProfileSavedLists.add(listId);
      _rebuildSavedListsCard();
    });
  });

  container.querySelectorAll('.profile-saved-list-category-arrow').forEach(arrow => {
    arrow.addEventListener('click', () => {
      const key = `${arrow.dataset.listId}::${arrow.dataset.category}`;
      if (_expandedProfileSavedListCategories.has(key)) _expandedProfileSavedListCategories.delete(key);
      else _expandedProfileSavedListCategories.add(key);
      _rebuildSavedListsCard();
    });
  });

  container.querySelectorAll('.profile-saved-list-add-folder').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.category;
      const name = prompt(`New folder name in ${CAT_LABEL[cat] || cat}:`);
      if (!name?.trim()) return;
      const folder = { id: Date.now().toString(), name: name.trim(), parentCategory: cat, createdAt: Date.now() };
      state.folders.push(folder);
      persistFolder(folder);
      // Auto-included in *this* list only — see the comment above addFolderRow's markup.
      const list = _getSavedListById(btn.dataset.listId);
      if (list) {
        _setFolderAllowed(list, folder.id, true);
        persistSavedLists();
      }
      _rebuildSavedListsCard();
    });
  });

  container.querySelectorAll('.profile-saved-list-folder input[type="checkbox"]').forEach(input => {
    input.addEventListener('change', () => {
      const list = _getSavedListById(input.dataset.listId);
      if (!list) return;
      _setFolderAllowed(list, input.dataset.folderId, input.checked);
      persistSavedLists();
      _rebuildSavedListsCard();
    });
  });

  container.querySelectorAll('.profile-saved-list-category-checkbox').forEach(input => {
    input.addEventListener('change', () => {
      const list = _getSavedListById(input.dataset.listId);
      if (!list) return;
      const folderIds = state.folders.filter(f => f.parentCategory === input.dataset.category).map(f => f.id);
      folderIds.forEach(id => _setFolderAllowed(list, id, input.checked));
      persistSavedLists();
      _rebuildSavedListsCard();
    });
    // Checkbox "indeterminate" (some but not all of a category's folders allowed) can only be set
    // as a DOM property, not an HTML attribute — read back the marker baked into the markup above.
    if (input.dataset.indeterminate === 'true') input.indeterminate = true;
  });
}

// ===== my notes =====
// Placeholder for now — future home for an easy way to find which saved items have notes on
// them. Text-only per explicit scope; the actual note-listing logic is a later, separate task.
function buildMyNotesSection() {
  return `
    <div class="dash-card profile-card--notes">
      <div class="profile-card-header"><span class="profile-card-title">My Notes</span></div>
      <p class="profile-card-copy">Coming soon — an easy way to see everywhere you've taken notes.</p>
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
        ${buildMyNotesSection()}
        ${buildSavedListsSection()}
      </div>
    </div>`;

  wireAccountSection(container);
  wireConnectionsSection(container);
  wireInterestsSection(container);
  wireSavedListsSection(container);

  if (state.lastfmUsername) {
    ensureLastfmRecentTracks(state.lastfmUsername).then(() => {
      if (state.view === 'profile') _rebuildConnectionsCard();
    });
  }
  if (state.steamId) {
    ensureSteamRecentGames(state.steamId).then(() => {
      if (state.view === 'profile') _rebuildConnectionsCard();
    });
  }
}
