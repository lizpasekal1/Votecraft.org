// ===== PROFILE PAGE =====
// A full-page view (state.view === 'profile'). Both nav entry points (dashboard.js's Profile
// widget and main.js's Settings-dropdown #btn-profile) gate on getCurrentUser() before landing
// here — a signed-out click opens the auth modal instead. Account sits full-width at the top;
// below it, a 2x2 widget grid: Connections (Last.fm, Steam), Interests (curator-branded curated
// lists), My Notes (placeholder — future home for finding items with notes on them), and Saved
// Lists (per-list category/folder scoping — the old "Friends" 4th-slot placeholder this grid was
// originally sized for never got built; these replaced it).

import { state, CURATED_GENRES, CATEGORIES, CAT_LABEL, CAT_EMOJI } from './state.js';
import { escapeHtml } from './utils.js';
import { getCurrentUser, resendVerificationEmail, changeEmail, sendPasswordReset } from './auth.js';
import { persistFollowedCuratedLists, persistSavedLists, persistFolder, persistItem, persistSelectedSharedFriends, disconnectLastfm, disconnectSteam, persistDisplayName, persistFullName, persistRecoveryEmail, persistTimeZone } from './storage.js';
import { ensureLastfmRecentTracks, ensureSteamRecentGames } from './api.js';
import { CURATED_LIST_DISPLAY_NAMES, DEMO_PROFILE_NAME } from './dashboard.js';
import { openAuthModal, openLastfmModal, openSteamModal } from './main.js';
import { renderSidebar, renderGrid } from './render.js';
import { navigateToView } from './navigation.js';
import { DEMO_FRIENDS } from './sharedSaves.js';
import { resourceUrl } from './platform.js';
import { openDetailModal } from './detailModal.js';
import { inspectNoteHtml, plainTextFromNoteHtml } from './noteSanitizer.js';

const PRIVACY_POLICY_URL = resourceUrl('src/webpage/privacy-policy.html');
const TERMS_OF_SERVICE_URL = resourceUrl('src/webpage/terms-of-service.html');

// Shared by both the desktop card and the mobile page-end duplicate below — one legal-links row
// (Privacy Policy · Terms of Service) rather than two separate elements needing their own mobile
// swap class each.
// Exported — the new in-app About page (about.js) reuses this exact row instead of duplicating
// the Privacy Policy/Terms of Service markup.
export function buildLegalLinksRow(extraClass = '') {
  return `
    <div class="profile-legal-links${extraClass ? ` ${extraClass}` : ''}">
      <a href="${PRIVACY_POLICY_URL}" target="_blank" rel="noopener">Privacy Policy</a>
      <span class="profile-legal-sep">·</span>
      <a href="${TERMS_OF_SERVICE_URL}" target="_blank" rel="noopener">Terms of Service</a>
    </div>`;
}

// ===== account =====

function buildAccountSection(user) {
  // The Profile page is browsable without signing in (a deliberate choice — see the "Intentionally
  // NOT gated" comments on the two nav entry points, main.js/dashboard.js) — this is where that
  // shows up: no real user yet, so show the same demo persona used on the Dashboard's greeting
  // rather than a blank email. "Manage account" below is the actual sign-in entry point.
  // Editable (Profile > Account, pencil-on-hover, wireAccountSection below) once signed in —
  // falls back to the account's email until a name is actually set. Signed-out demo view keeps
  // its own hardcoded persona (nothing to edit without a real account to persist it to).
  // Generic "Demo email" placeholder for the signed-out view, per direct request — the DEMO_PROFILE_NAME
  // persona ('Zil') is also the exact name a real signed-in user might set as their own displayName
  // (state.displayName, Profile > Account's pencil edit), so reusing it here risked reading like a
  // real account's real data rather than an obviously-generic demo.
  const nameText = user ? escapeHtml(state.displayName || user.email) : 'Demo email';
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
          <span class="profile-avatar">VCA</span>
          <div class="profile-account-text">
            <div class="profile-card-title">Account</div>
            <div class="profile-account-name-row">
              <span class="profile-account-email" id="profile-account-name-text">${nameText}</span>
              ${user ? `<button type="button" class="profile-name-edit-btn" id="profile-edit-name-btn" title="Edit name" aria-label="Edit name"><svg xmlns="http://www.w3.org/2000/svg" height="14px" viewBox="0 -960 960 960" width="14px" fill="currentColor"><path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"/></svg></button>` : ''}
            </div>
          </div>
        </div>
        <div class="profile-account-actions">
          <button class="btn-cancel" id="profile-manage-account">Manage account</button>
          ${buildLegalLinksRow()}
        </div>
      </div>
      ${verifyBanner}
    </div>`;
}

function wireAccountSection(container) {
  container.querySelector('#profile-manage-account')?.addEventListener('click', openAuthModal);
  // Mobile-only duplicate of the button above, at the very end of the page (profile.css/misc.css
  // hide/show whichever one applies) — see renderProfilePage's own template for where it's
  // placed. Separate id (can't reuse #profile-manage-account on two elements) but the same handler.
  container.querySelector('#profile-manage-account-mobile')?.addEventListener('click', openAuthModal);
  container.querySelector('#profile-resend-verify')?.addEventListener('click', async e => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.textContent = 'Sending…';
    const result = await resendVerificationEmail();
    btn.textContent = result.ok ? 'Sent!' : 'Resend email';
    btn.disabled = false;
  });
  container.querySelector('#profile-edit-name-btn')?.addEventListener('click', () => {
    const row = container.querySelector('.profile-account-name-row');
    const nameSpan = container.querySelector('#profile-account-name-text');
    if (!row || !nameSpan) return;
    const user = getCurrentUser();
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'profile-name-edit-input';
    input.maxLength = 60;
    input.value = state.displayName || '';
    input.placeholder = user?.email || 'Your name';
    // Swap the pencil button out for the input rather than hiding it — a floating edit control
    // next to a focused text field would be confusing/redundant; Enter or blur below finishes
    // the edit and swaps the static text (rebuilt by renderProfilePage) back in either way.
    row.querySelector('#profile-edit-name-btn')?.remove();
    nameSpan.replaceWith(input);
    input.focus();
    input.select();
    let done = false;
    const finish = save => {
      if (done) return;
      done = true;
      const trimmed = input.value.trim();
      if (save && trimmed !== (state.displayName || '')) {
        state.displayName = trimmed || null;
        persistDisplayName(state.displayName);
      }
      renderProfilePage();
    };
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') finish(true);
      else if (e.key === 'Escape') finish(false);
    });
    input.addEventListener('blur', () => finish(true));
  });
}

// ===== account details =====
// Only rendered when actually signed in — every field here (Full Name, Recovery Email, Time
// Zone, Change Email, Reset Password) needs a real account to persist to, so the signed-out demo
// view just skips this card entirely rather than showing fields with nowhere to save.

// A short, commonly-used IANA zone list rather than the full ~400-zone Intl.supportedValuesOf
// set — this is a plain <select>, not a searchable picker, so a shorter list stays usable. Falls
// back to just the browser's own detected zone if it's not already one of these (still selected
// correctly; just means the dropdown has one extra, unlabeled-by-region option at the top).
const TIME_ZONE_OPTIONS = [
  'Pacific/Honolulu', 'America/Anchorage', 'America/Los_Angeles', 'America/Denver',
  'America/Chicago', 'America/New_York', 'America/Sao_Paulo', 'UTC', 'Europe/London',
  'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow', 'Africa/Cairo', 'Asia/Dubai',
  'Asia/Kolkata', 'Asia/Shanghai', 'Asia/Tokyo', 'Australia/Sydney', 'Pacific/Auckland',
];

function buildAccountDetailsSection(user) {
  if (!user) return '';
  const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const tzOptions = TIME_ZONE_OPTIONS.includes(state.timeZone || detectedTz)
    ? TIME_ZONE_OPTIONS
    : [state.timeZone || detectedTz, ...TIME_ZONE_OPTIONS];
  const selectedTz = state.timeZone || detectedTz;
  return `
    <div class="profile-card profile-card--account-details">
      <div class="profile-card-title">Account Details</div>
      <div class="form-group">
        <label>Full Name</label>
        <input type="text" id="profile-full-name-input" value="${escapeHtml(state.fullName || '')}" placeholder="Your full name" maxlength="100" />
      </div>
      <div class="form-group">
        <label>Email</label>
        <input type="email" value="${escapeHtml(user.email)}" disabled />
      </div>
      <div class="profile-account-details-row">
        <button type="button" class="btn-cancel" id="profile-change-email-btn">Change Email</button>
      </div>
      <div class="form-group">
        <label>Recovery Email</label>
        <div class="profile-masked-field-row">
          <input type="password" id="profile-recovery-email-input" value="${escapeHtml(state.recoveryEmail || '')}" placeholder="Not set" autocomplete="off" />
          <!-- Masked (type="password") by default, per direct request — flips to type="text"
               only while this button is actively held down (wireAccountDetailsSection below),
               re-masking the instant it's released, rather than a click-to-toggle switch. -->
          <button type="button" class="profile-reveal-btn" id="profile-recovery-email-reveal" title="Hold to reveal" aria-label="Hold to reveal recovery email">
            <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M480-320q75 0 127.5-52.5T660-500q0-75-52.5-127.5T480-680q-75 0-127.5 52.5T300-500q0 75 52.5 127.5T480-320Zm0-72q-45 0-76.5-31.5T372-500q0-45 31.5-76.5T480-608q45 0 76.5 31.5T588-500q0 45-31.5 76.5T480-392Zm0 192q-146 0-266-81.5T40-500q54-137 174-218.5T480-800q146 0 266 81.5T920-500q-54 137-174 218.5T480-200Z"/></svg>
          </button>
        </div>
      </div>
      <div class="form-group">
        <label>Time Zone</label>
        <select id="profile-timezone-select">
          ${tzOptions.map(tz => `<option value="${escapeHtml(tz)}"${tz === selectedTz ? ' selected' : ''}>${escapeHtml(tz.replace(/_/g, ' '))}</option>`).join('')}
        </select>
      </div>
      <div class="profile-account-details-row">
        <button type="button" class="btn-cancel" id="profile-reset-password-btn">Reset Password</button>
      </div>
    </div>`;
}

function wireAccountDetailsSection(container) {
  const user = getCurrentUser();
  if (!user) return;

  const fullNameInput = container.querySelector('#profile-full-name-input');
  fullNameInput?.addEventListener('blur', () => {
    const trimmed = fullNameInput.value.trim();
    if (trimmed === (state.fullName || '')) return;
    state.fullName = trimmed || null;
    persistFullName(state.fullName);
  });
  fullNameInput?.addEventListener('keydown', e => { if (e.key === 'Enter') fullNameInput.blur(); });

  const recoveryInput = container.querySelector('#profile-recovery-email-input');
  recoveryInput?.addEventListener('blur', () => {
    const trimmed = recoveryInput.value.trim();
    if (trimmed === (state.recoveryEmail || '')) return;
    state.recoveryEmail = trimmed || null;
    persistRecoveryEmail(state.recoveryEmail);
  });
  recoveryInput?.addEventListener('keydown', e => { if (e.key === 'Enter') recoveryInput.blur(); });

  // Press-and-hold reveal, per direct request — mousedown/touchstart unmasks, and every plausible
  // "stopped holding" signal (mouseup/mouseleave/touchend/touchcancel) re-masks, so it can't get
  // stuck revealed if the pointer drags off the button or the touch is interrupted.
  const revealBtn = container.querySelector('#profile-recovery-email-reveal');
  if (revealBtn && recoveryInput) {
    const reveal = () => { recoveryInput.type = 'text'; };
    const mask = () => { recoveryInput.type = 'password'; };
    revealBtn.addEventListener('mousedown', reveal);
    revealBtn.addEventListener('touchstart', e => { e.preventDefault(); reveal(); }, { passive: false });
    ['mouseup', 'mouseleave', 'touchend', 'touchcancel'].forEach(evt => revealBtn.addEventListener(evt, mask));
  }

  container.querySelector('#profile-timezone-select')?.addEventListener('change', e => {
    state.timeZone = e.target.value;
    persistTimeZone(state.timeZone);
  });

  container.querySelector('#profile-change-email-btn')?.addEventListener('click', async () => {
    const newEmail = prompt('New email address:', user.email);
    if (!newEmail || !newEmail.trim() || newEmail.trim() === user.email) return;
    const result = await changeEmail(newEmail.trim());
    if (result.ok) {
      alert('Email updated — check your inbox to verify the new address.');
      renderProfilePage();
    } else {
      alert(result.error || 'Could not change email.');
    }
  });

  container.querySelector('#profile-reset-password-btn')?.addEventListener('click', async e => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.textContent = 'Sending…';
    const result = await sendPasswordReset(user.email);
    btn.textContent = result.ok ? 'Sent!' : 'Reset Password';
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
          <p class="profile-card-copy">${escapeHtml(LASTFM_CONNECTION_COPY)} ${escapeHtml(NO_LOGIN_REQUIRED_COPY)}</p>
        </div>
        <button class="btn-primary" id="profile-connect-lastfm">Connect <br class="profile-connect-break">Last.fm</button>
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
        <p class="profile-card-copy">${escapeHtml(LASTFM_CONNECTION_COPY)} ${escapeHtml(NO_LOGIN_REQUIRED_COPY)}${escapeHtml(statusLine)}</p>
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
          <p class="profile-card-copy">${escapeHtml(STEAM_CONNECTION_COPY)} ${escapeHtml(NO_LOGIN_REQUIRED_COPY)}</p>
        </div>
        <button class="btn-primary" id="profile-connect-steam">Connect <br class="profile-connect-break">Steam</button>
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
        <p class="profile-card-copy">${escapeHtml(STEAM_CONNECTION_COPY)} ${escapeHtml(NO_LOGIN_REQUIRED_COPY)}${escapeHtml(statusLine)}</p>
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

// Shared "label+checkbox grid" recipe — Interests and Shared Lists (below) are both this same
// shape (a fixed list of options, each independently toggleable, persisted the same way), just
// with different option sources/state, so one parametrized pair replaces what used to be two
// near-identical build/wire function pairs.
function buildChecklistCard({ cardClass, title, copy, options, dataAttr, isChecked }) {
  const optionsHtml = options.map(({ value, label }) => `
      <label class="profile-interest-option">
        <input type="checkbox" data-${dataAttr}="${escapeHtml(value)}" ${isChecked(value) ? 'checked' : ''}>
        <span>${escapeHtml(label)}</span>
      </label>`).join('');

  return `
    <div class="dash-card ${cardClass}">
      <div class="profile-card-header"><span class="profile-card-title">${escapeHtml(title)}</span></div>
      <p class="profile-card-copy">${escapeHtml(copy)}</p>
      <div class="profile-interests-grid">${optionsHtml}</div>
      <button type="button" class="btn-primary profile-widget-add-new-btn">+ Add New</button>
    </div>`;
}

function wireChecklistCard(container, { cardClass, dataAttr, onToggle }) {
  container.querySelectorAll(`.${cardClass} .profile-interest-option input[type="checkbox"]`).forEach(input => {
    input.addEventListener('change', () => onToggle(input.dataset[dataAttr], input.checked));
  });
}

function buildInterestsSection() {
  const options = CURATED_GENRES.map(genre => ({
    value: genre,
    // Trailing " List" dropped here per direct request — same technique sharedSaves.js's own
    // nonprofit slider already uses on these exact display names, scoped to just this widget's
    // own labels rather than changing CURATED_LIST_DISPLAY_NAMES itself (other consumers, e.g.
    // that same slider, still want the full "___ List" name).
    label: (CURATED_LIST_DISPLAY_NAMES[genre] || genre).replace(/\s+List$/i, ''),
  }));
  return buildChecklistCard({
    cardClass: 'profile-card--interests',
    title: 'Interests',
    copy: "Pick which curated lists you'd like to follow.",
    options,
    dataAttr: 'genre',
    isChecked: genre => state.followedCuratedLists.has(genre),
  });
}

function wireInterestsSection(container) {
  wireChecklistCard(container, {
    cardClass: 'profile-card--interests',
    dataAttr: 'genre',
    onToggle: (genre, checked) => {
      if (checked) state.followedCuratedLists.add(genre);
      else state.followedCuratedLists.delete(genre);
      persistFollowedCuratedLists();
    },
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
    <div class="profile-saved-list-row ${expanded ? 'profile-saved-list-row--expanded' : ''}" data-list-id="${escapeHtml(list.id)}">
      <span class="profile-saved-list-arrow">${arrow}</span>
      <span class="profile-saved-list-name">${escapeHtml(list.name)}</span>
      <span class="profile-saved-list-actions">
        <button type="button" class="profile-saved-list-rename" data-list-id="${escapeHtml(list.id)}" title="Rename list">
          <svg xmlns="http://www.w3.org/2000/svg" height="14px" viewBox="0 -960 960 960" width="14px" fill="currentColor"><path d="M200-200h57l391-391-57-57-391 391v57Zm-40 80q-17 0-28.5-11.5T120-160v-97q0-16 6-30.5t17-25.5l505-504q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L313-143q-11 11-25.5 17t-30.5 6h-97Zm600-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"/></svg>
        </button>
        <button type="button" class="profile-saved-list-delete" data-list-id="${escapeHtml(list.id)}" title="Delete list">×</button>
      </span>
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

// Two-step delete, per direct request: (1) a plain "are you sure" confirm, then (2) — only if
// there's another real list it could go into — a small picker offering to fold this list's items
// into another list before it's gone, since otherwise deleting a list just silently drops every
// item's membership in it with no way to get that back. "All My Saves" (default-favorites) is
// excluded as a merge target — it's the catch-all every item already belongs to via its own
// `favorite` flag, not a savedListIds-tracked list to merge into.
async function _promptDeleteSavedList(listId) {
  const list = _getSavedListById(listId);
  if (!list) return;
  if (!confirm(`Are you sure you want to delete "${list.name}"?`)) return;

  const otherLists = state.savedLists.filter(l => l.id !== listId && l.id !== 'default-favorites');
  const mergeTargetId = otherLists.length ? await _promptMergeTarget(list, otherLists) : '';
  if (mergeTargetId === null) return; // explicit Cancel from the merge picker — abort the whole delete

  const affected = state.items.filter(i => (i.savedListIds || []).includes(listId));
  for (const item of affected) {
    item.savedListIds = item.savedListIds.filter(id => id !== listId);
    if (mergeTargetId && !item.savedListIds.includes(mergeTargetId)) item.savedListIds.push(mergeTargetId);
    await persistItem(item);
  }

  state.savedLists = state.savedLists.filter(l => l.id !== listId);
  await persistSavedLists();

  // Only a real navigation if the deleted list was the active view — otherwise just re-render in
  // place, same convention as renderSidebar.js's own folder-delete handler.
  if (state.view === `savedlist:${listId}`) navigateToView('dashboard', { sidebarMode: 'home' });
  else { renderSidebar(); renderGrid(); }
  _rebuildSavedListsCard();
}

// Small transient modal — creates the overlay div, injects the given .modal markup, and appends
// it to body (built fresh each call, removed on close, unlike Admin Kanban's own build-once-and-
// toggle card editor, which persists across renders). Shared by every one-off modal below instead
// of each hand-rolling its own create/append/remove lifecycle. Returns { overlay, close } — close
// just removes the DOM node; what "dismissed" actually means (resolving a pending Promise with a
// specific value, or just closing) is still each caller's own, since that differs per modal.
function _openTransientModal(modalHtml) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.innerHTML = modalHtml;
  document.body.appendChild(overlay);
  return { overlay, close: () => overlay.remove() };
}

// Resolves to: a list id (merge into that list), '' (don't merge, just delete), or null (the user
// cancelled the picker itself — the caller treats this as aborting the whole delete, not just the
// merge step).
function _promptMergeTarget(list, otherLists) {
  return new Promise(resolve => {
    const { overlay, close: closeModal } = _openTransientModal(`
      <div class="modal" style="position:relative; width:380px;">
        <div class="modal-header"><h2>Delete "${escapeHtml(list.name)}"</h2></div>
        <div class="modal-body">
          <p>Would you like to merge this list's items into another list first? Items aren't removed from SaveCraft either way — this only changes which list(s) they show up under.</p>
          <div class="form-group">
            <label for="merge-target-select">Merge into</label>
            <select id="merge-target-select">
              <option value="">Don't merge — just delete</option>
              ${otherLists.map(l => `<option value="${escapeHtml(l.id)}">${escapeHtml(l.name)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn-cancel" id="merge-target-cancel">Cancel</button>
          <button type="button" class="btn-primary" id="merge-target-confirm">Delete</button>
        </div>
      </div>`);
    const close = value => { closeModal(); resolve(value); };
    overlay.querySelector('#merge-target-cancel').addEventListener('click', () => close(null));
    overlay.querySelector('#merge-target-confirm').addEventListener('click', () => {
      close(overlay.querySelector('#merge-target-select').value || '');
    });
    overlay.addEventListener('click', e => { if (e.target === overlay) close(null); });
  });
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

  container.querySelectorAll('.profile-saved-list-rename').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation(); // don't also trigger the row's own expand/collapse toggle
      const list = _getSavedListById(btn.dataset.listId);
      if (!list) return;
      const name = prompt('Rename list:', list.name);
      if (!name?.trim() || name.trim() === list.name) return;
      list.name = name.trim();
      await persistSavedLists();
      _rebuildSavedListsCard();
      renderSidebar(); // the sidebar's own Saved Lists row shows the same list names
    });
  });

  container.querySelectorAll('.profile-saved-list-delete').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      _promptDeleteSavedList(btn.dataset.listId);
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
// An accordion timeline of every item with real notes on it — one row per item (not per note;
// icons on a collapsed row summarize across all of that item's notes combined), expandable to see
// each individual note, sortable by category via the header dropdown. Deliberately scoped to
// noteTexts/chapterNotes only (the actual "My Notes"/"Chapters" feature this widget is named
// after) — Music Album's separate Song List (trackNotes) is a conceptually distinct per-track
// feature with its own name/accordion elsewhere, not "My Notes" by this widget's own definition.

const _expandedProfileNotesItems = new Set(); // page-local, same lifecycle as the Saved Lists
                                               // widget's own _expandedProfileSavedLists above —
                                               // doesn't persist across visits.
let _notesCategoryFilter = ''; // '' = All Categories, else one CATEGORIES value

const NOTES_LINK_ICON = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';
const NOTES_VOICE_ICON = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v1a7 7 0 0 0 14 0v-1"/><line x1="12" y1="18" x2="12" y2="22"/></svg>';
const NOTES_IMAGE_ICON = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>';

// Every item with at least one real note, plus its individual note rows — computed fresh on every
// build (no caching layer; matches this codebase's existing pattern for state.items scans, e.g.
// Dashboard's favorites/queue widgets, which also recompute live on every render).
function _collectNotesItems() {
  return state.items
    .map(item => {
      const isBook = item.category === 'Book';
      const textsField = isBook ? 'chapterNotes' : 'noteTexts';
      const titlesField = isBook ? 'chapterTitles' : 'noteTitles';
      const rows = Object.entries(item[textsField] || {})
        .map(([num, html]) => ({ num: Number(num), html, ...inspectNoteHtml(html) }))
        .filter(r => r.hasContent)
        .sort((a, b) => a.num - b.num)
        .map(r => ({
          ...r,
          label: item[titlesField]?.[r.num]
            || (r.num === 0 ? (isBook ? 'Basic Notes' : 'Summary') : (isBook ? `Chapter ${r.num}` : 'Note')),
        }));
      if (!rows.length) return null;
      return {
        item, rows,
        hasVoice: rows.some(r => r.hasVoice),
        hasImage: rows.some(r => r.hasImage),
        hasLink: rows.some(r => r.hasLink),
      };
    })
    .filter(Boolean)
    .sort((a, b) => (b.item.savedAt || 0) - (a.item.savedAt || 0));
}

function _buildNotesBadges({ hasLink, hasVoice, hasImage }) {
  return `<span class="profile-notes-badges">`
    + (hasLink ? `<span class="profile-notes-badge" title="Contains a link">${NOTES_LINK_ICON}</span>` : '')
    + (hasVoice ? `<span class="profile-notes-badge" title="Contains a voice note">${NOTES_VOICE_ICON}</span>` : '')
    + (hasImage ? `<span class="profile-notes-badge" title="Contains an image">${NOTES_IMAGE_ICON}</span>` : '')
    + `</span>`;
}

function _buildNotesItemRow(entry) {
  const { item, rows } = entry;
  const expanded = _expandedProfileNotesItems.has(item.id);
  const arrow = expanded ? '▼' : '▶';
  // Only parsed (plainTextFromNoteHtml does a real DOM-template parse per row) when the row is
  // actually expanded and this HTML gets used — most rows start collapsed, and this is rebuilt on
  // every category-filter change and every arrow-toggle click.
  const subRows = !expanded ? '' : rows.map(r => `
    <div class="profile-notes-subrow" data-item-id="${escapeHtml(item.id)}">
      <span class="profile-notes-subrow-label">${escapeHtml(r.label)}</span>
      ${_buildNotesBadges(r)}
      <span class="profile-notes-subrow-preview">${escapeHtml(plainTextFromNoteHtml(r.html)) || '—'}</span>
    </div>`).join('');
  return `
    <div class="profile-notes-row" data-item-id="${escapeHtml(item.id)}">
      <span class="profile-notes-arrow">${arrow}</span>
      <span class="profile-notes-cat-icon">${CAT_EMOJI[item.category] || ''}</span>
      <span class="profile-notes-title">${escapeHtml(item.title || '')}</span>
      ${_buildNotesBadges(entry)}
    </div>
    ${expanded ? `<div class="profile-notes-subrows">${subRows}</div>` : ''}`;
}

function buildMyNotesSection() {
  const allEntries = _collectNotesItems();
  const entries = _notesCategoryFilter
    ? allEntries.filter(e => e.item.category === _notesCategoryFilter)
    : allEntries;
  const dropdownBtnLabel = _notesCategoryFilter ? (CAT_LABEL[_notesCategoryFilter] || _notesCategoryFilter) : 'SORT';
  const body = entries.length
    ? `<div class="profile-notes-list">${entries.map(_buildNotesItemRow).join('')}</div>`
    : `<p class="profile-card-copy">${allEntries.length ? 'No notes in this category yet.' : "No notes yet — add one from any saved item's detail view."}</p>`;
  return `
    <div class="dash-card profile-card--notes">
      <div class="profile-card-header">
        <span class="profile-card-title">My Notes</span>
        <div class="board-filter-wrap profile-notes-category-wrap">
          <button type="button" class="btn-board-filter profile-notes-category-btn">
            <span class="profile-notes-category-label">${escapeHtml(dropdownBtnLabel)}</span>
            <svg width="10" height="6" viewBox="0 0 10 6" fill="currentColor"><path d="M0 0l5 6 5-6z"/></svg>
          </button>
          <div class="board-filter-dropdown profile-notes-category-dropdown" hidden></div>
        </div>
      </div>
      ${body}
    </div>`;
}

// Registered once at module load (mirrors dashboard.js's own single outside-click listener for
// its category dropdown) — re-queries the live dropdown each click rather than stacking a new
// listener on `document` per rebuild.
document.addEventListener('click', e => {
  const dd = document.querySelector('.profile-notes-category-dropdown');
  if (dd && !dd.hidden && !e.target.closest('.profile-notes-category-wrap')) dd.setAttribute('hidden', '');
});

function _rebuildMyNotesCard() {
  const card = document.querySelector('.profile-card--notes');
  if (!card) return;
  const parent = card.parentElement;
  card.outerHTML = buildMyNotesSection();
  wireMyNotesSection(parent);
}

function wireMyNotesSection(container) {
  const card = container.querySelector('.profile-card--notes');
  if (!card) return;

  const dd = card.querySelector('.profile-notes-category-dropdown');
  if (dd) {
    const allOption = `<button class="saves-list-option${!_notesCategoryFilter ? ' active' : ''}" data-cat="">All Categories</button>`;
    const catOptions = CATEGORIES.filter(cat => cat !== 'Music Album').map(cat =>
      `<button class="saves-list-option${_notesCategoryFilter === cat ? ' active' : ''}" data-cat="${escapeHtml(cat)}">${escapeHtml(CAT_LABEL[cat] || cat)}</button>`
    ).join('');
    dd.innerHTML = allOption + `<div class="saves-list-divider"></div>` + catOptions;

    card.querySelector('.profile-notes-category-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      dd.toggleAttribute('hidden');
    });
    dd.querySelectorAll('.saves-list-option').forEach(opt => {
      opt.addEventListener('click', () => {
        _notesCategoryFilter = opt.dataset.cat || '';
        _rebuildMyNotesCard();
      });
    });
  }

  card.querySelectorAll('.profile-notes-arrow').forEach(arrow => {
    arrow.addEventListener('click', e => {
      e.stopPropagation();
      const itemId = arrow.closest('.profile-notes-row')?.dataset.itemId;
      if (!itemId) return;
      if (_expandedProfileNotesItems.has(itemId)) _expandedProfileNotesItems.delete(itemId);
      else _expandedProfileNotesItems.add(itemId);
      _rebuildMyNotesCard();
    });
  });

  // Clicking the rest of a collapsed row's title also opens/closes it (same "arrow is the visual
  // affordance, not the only tap target" convention Saved Lists' own rows use) — a sub-row instead
  // navigates straight to that item, since it's already identified down to the specific note.
  card.querySelectorAll('.profile-notes-row').forEach(row => {
    row.addEventListener('click', () => row.querySelector('.profile-notes-arrow')?.click());
  });
  card.querySelectorAll('.profile-notes-subrow').forEach(subrow => {
    subrow.addEventListener('click', e => {
      e.stopPropagation();
      const item = state.items.find(i => i.id === subrow.dataset.itemId);
      if (item) openDetailModal(item);
    });
  });
}

// ===== shared lists =====
// A checklist of the same demo friends Shared Saves' own Friends section shows (sharedSaves.js's
// DEMO_FRIENDS — no real friend-graph exists yet, so both places draw from the one shared list
// rather than maintaining separate copies) — uses the same buildChecklistCard/wireChecklistCard
// recipe as Interests above, just toggling state.selectedSharedFriends instead of
// state.followedCuratedLists. Per direct request ("the way interests is set up").
function buildSharedListsSection() {
  const options = DEMO_FRIENDS.map(friend => ({ value: friend.name, label: friend.name }));
  return buildChecklistCard({
    cardClass: 'profile-card--shared-lists',
    title: 'Shared Lists',
    copy: "Choose which friends' shared lists you'd like to see.",
    options,
    dataAttr: 'friend',
    isChecked: name => state.selectedSharedFriends.has(name),
  });
}

function wireSharedListsWidget(container) {
  wireChecklistCard(container, {
    cardClass: 'profile-card--shared-lists',
    dataAttr: 'friend',
    onToggle: (name, checked) => {
      if (checked) state.selectedSharedFriends.add(name);
      else state.selectedSharedFriends.delete(name);
      persistSelectedSharedFriends();
    },
  });
}

// ===== VC Connector =====
// Started as a rebuild of the standalone VC-coin promo widget's content
// (widgets/vc-coin-widget/vc-coin-banner.html, embedded elsewhere via iframe — e.g. the Sponsored
// Statements page) as plain markup/CSS in this app's own visual language instead of pulling in
// that widget's separate animated-coin/particle-effects stylesheet — copy/tags have since diverged
// from that source per direct edits (tagline, dropped Learn/Donate tags), only the teal #14CCB0
// "earn" accent remains shared.
function buildVotecraftConnectionSection() {
  return `
    <div class="dash-card profile-card--votecraft-connection">
      <div class="profile-card-header"><span class="profile-card-title">VC Connector</span></div>
      <h3 class="vc-connect-title">Building Capitalism + Altruism</h3>
      <p class="vc-connect-desc">VC is earned through civic action — volunteering, learning about issues, and supporting reform nonprofits. Spend it in the VoteCraft Emporium.</p>
      <div class="vc-connect-tags">
        <span class="vc-connect-tag vc-connect-tag--earn">Volunteer +15 VC</span>
      </div>
      <button type="button" class="btn-primary vc-connect-learn-more-btn" id="vc-connect-learn-more">Learn More</button>
    </div>`;
}

const VOTECRAFT_WALLET_URL = 'https://votecraft.org/wp-content/uploads/pages/votecraft-coin/app/index.html';

// Small transient confirmation modal shown before actually leaving to the VC Wallet — per direct
// request. Uses the same _openTransientModal helper as the Saved Lists merge-target picker above;
// white-themed regardless of SaveCraft's own dark/light setting (per direct request), since it's
// meant to read as a VoteCraft-branded popup, not a SaveCraft-themed one.
function _openVotecraftWalletModal() {
  const { overlay, close } = _openTransientModal(`
    <div class="modal vc-wallet-modal" style="position:relative; width:360px;">
      <div class="modal-header"><h2><span class="vc-wallet-modal-title-lead">You're opening</span><span class="vc-wallet-modal-title-emphasis">VC Connector</span></h2></div>
      <div class="modal-body">
        <p>Explore the organizations you support and keep track of your VC.</p>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn-cancel" id="vc-wallet-cancel">Cancel</button>
        <a class="btn-primary vc-wallet-open-btn" id="vc-wallet-open" href="${VOTECRAFT_WALLET_URL}" target="_blank" rel="noopener">Open</a>
      </div>
    </div>`);
  overlay.querySelector('#vc-wallet-cancel').addEventListener('click', close);
  overlay.querySelector('#vc-wallet-open').addEventListener('click', close); // real <a> navigation still proceeds, this just cleans up the modal
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
}

function wireVotecraftConnectionSection(container) {
  container.querySelector('#vc-connect-learn-more')?.addEventListener('click', _openVotecraftWalletModal);
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
        ${buildSharedListsSection()}
        ${buildVotecraftConnectionSection()}
      </div>
      <!-- Per direct request ("put the whole account details below the other widgets") — moved
           from right after the top Account card to here, below .profile-widget-grid. Stays
           full-width, same as every other section on this page — no side-by-side pairing this
           time (that half-width row never rendered correctly live, reverted entirely). -->
      ${buildAccountDetailsSection(user)}
      <button class="btn-cancel profile-manage-account-mobile" id="profile-manage-account-mobile">Manage account</button>
      ${buildLegalLinksRow('profile-legal-links-mobile')}
    </div>`;

  wireAccountSection(container);
  wireAccountDetailsSection(container);
  wireConnectionsSection(container);
  wireInterestsSection(container);
  wireMyNotesSection(container);
  wireSavedListsSection(container);
  wireSharedListsWidget(container);
  wireVotecraftConnectionSection(container);

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
