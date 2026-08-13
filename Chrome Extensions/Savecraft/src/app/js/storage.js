// ===== STORAGE =====
// Everything that reads from or writes to storageSync/local, plus the Firestore
// curated-data loader. No rendering or DOM logic lives here.

import { state, setCuratedItems } from './state.js';
// Circular import with auth.js (auth.js imports runInitialSync from here) — safe under this
// codebase's established convention, see auth.js's own note on the same import.
import { getCurrentUser, getValidIdToken } from './auth.js';
import {
  SPLIT_TITLE_CREATOR_CATEGORIES, splitCuratedTitleCreator, getStaticCuratedCreator,
} from './curatedCreatorLookup.js';
import { storageSync, storageLocal } from './platform.js';

const _FIREBASE_PROJECT = 'votecraft-789';
const _FIREBASE_API_KEY = 'AIzaSyArJ6pkXUDbZf4jcxRita0qcdr-hT46kI8';
const _CURATED_CACHE_VERSION = 10;

const _CAT_NORMALIZE = {
  'Movies': 'Movie', 'Books': 'Book', 'Games': 'Game',
  'Shows': 'Show', 'Musicians': 'Musician', 'Music Albums': 'Music Album',
  // NOTE: raw category "Music" (no "Album") is deliberately NOT mapped to 'Music Album' here.
  // Live Firestore data confirmed genre="Top 100" + category="Music" is a legacy duplicate of
  // the Musicians list (101 docs, titles are artist names like "The Beatles", not albums) that
  // was previously leaking into the Music Album bucket via this exact mapping, showing musician
  // cards under "Music Albums". Left unmapped, these docs land in an inert "Music" bucket that
  // nothing in the app reads, instead of being force-merged somewhere they don't belong.
};

// ===== SYNCED PERSONAL LIBRARY (Firestore dual-write, only active when signed in) =====
// Every persist*/remove* function below still writes to storageSync exactly as before
// — that write is never awaited-on by these helpers and never blocked by them. When signed in,
// each function ALSO fires an unawaited Firestore write gated on getCurrentUser(); failures are
// caught and logged, never surfaced to the caller. Signed-out users get zero extra work.

function _syncError(err) {
  console.warn('[SaveCraft] Firestore sync failed (local save unaffected):', err);
}

function _toFirestoreValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(_toFirestoreValue) } };
  if (typeof v === 'object') return { mapValue: { fields: _toFirestoreFields(v) } };
  return { nullValue: null };
}

function _toFirestoreFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue; // omit undefined keys entirely
    fields[k] = _toFirestoreValue(v);
  }
  return fields;
}

function _fromFirestoreValue(v) {
  if (!v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return parseInt(v.integerValue, 10);
  if ('doubleValue' in v) return v.doubleValue;
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(_fromFirestoreValue);
  if ('mapValue' in v) return _fromFirestoreFields(v.mapValue.fields || {});
  if ('timestampValue' in v) return v.timestampValue;
  return null;
}

function _fromFirestoreFields(fields) {
  const obj = {};
  for (const [k, v] of Object.entries(fields || {})) obj[k] = _fromFirestoreValue(v);
  return obj;
}

// PATCH with no updateMask replaces the whole document — correct for items/folders/authors,
// where the caller always has (and sends) the complete current object.
async function _firestoreUpsert(path, fields) {
  const idToken = await getValidIdToken();
  if (!idToken) return;
  const url = `https://firestore.googleapis.com/v1/projects/${_FIREBASE_PROJECT}/databases/(default)/documents/${path}?key=${_FIREBASE_API_KEY}`;
  const body = { fields: { ..._toFirestoreFields(fields), updatedAt: { timestampValue: new Date().toISOString() } } };
  const resp = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
    body: JSON.stringify(body),
  });
  const data = await resp.json();
  if (data.error) throw new Error(data.error.message);
}

// Same, but with an updateMask so a partial writer (e.g. persistViewState, which only knows
// view+sidebarMode) never clobbers sibling fields (sort, theme, ...) in the shared settings doc.
async function _firestoreUpsertFields(path, partialFields) {
  const idToken = await getValidIdToken();
  if (!idToken) return;
  const keys = [...Object.keys(partialFields), 'updatedAt'];
  const url = new URL(`https://firestore.googleapis.com/v1/projects/${_FIREBASE_PROJECT}/databases/(default)/documents/${path}`);
  url.searchParams.set('key', _FIREBASE_API_KEY);
  keys.forEach(k => url.searchParams.append('updateMask.fieldPaths', k));
  const body = { fields: { ..._toFirestoreFields(partialFields), updatedAt: { timestampValue: new Date().toISOString() } } };
  const resp = await fetch(url.toString(), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
    body: JSON.stringify(body),
  });
  const data = await resp.json();
  if (data.error) throw new Error(data.error.message);
}

async function _firestoreDelete(path) {
  const idToken = await getValidIdToken();
  if (!idToken) return;
  const url = `https://firestore.googleapis.com/v1/projects/${_FIREBASE_PROJECT}/databases/(default)/documents/${path}?key=${_FIREBASE_API_KEY}`;
  const resp = await fetch(url, { method: 'DELETE', headers: { 'Authorization': `Bearer ${idToken}` } });
  const data = await resp.json().catch(() => null);
  if (data?.error) throw new Error(data.error.message);
}

async function _firestoreGetDoc(path, idToken) {
  const url = `https://firestore.googleapis.com/v1/projects/${_FIREBASE_PROJECT}/databases/(default)/documents/${path}?key=${_FIREBASE_API_KEY}`;
  const resp = await fetch(url, { headers: { 'Authorization': `Bearer ${idToken}` } });
  const data = await resp.json();
  if (data.error) {
    if (data.error.status === 'NOT_FOUND' || data.error.code === 404) return null;
    throw new Error(data.error.message);
  }
  return data.fields ? _fromFirestoreFields(data.fields) : null;
}

async function _firestoreListCollection(path, idToken) {
  let allDocs = [];
  let pageToken = null;
  do {
    const url = new URL(`https://firestore.googleapis.com/v1/projects/${_FIREBASE_PROJECT}/databases/(default)/documents/${path}`);
    url.searchParams.set('key', _FIREBASE_API_KEY);
    url.searchParams.set('pageSize', '300');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const resp = await fetch(url.toString(), { headers: { 'Authorization': `Bearer ${idToken}` } });
    const data = await resp.json();
    if (data.error) throw new Error(data.error.message);
    if (data.documents) allDocs = allDocs.concat(data.documents);
    pageToken = data.nextPageToken || null;
  } while (pageToken);
  return allDocs.map(doc => _fromFirestoreFields(doc.fields));
}

async function _loadCuratedFromFirestore() {
  const base = `https://firestore.googleapis.com/v1/projects/${_FIREBASE_PROJECT}/databases/(default)/documents/curated_items`;
  let allDocs = [];
  let pageToken = null;
  do {
    const url = new URL(base);
    url.searchParams.set('pageSize', '300');
    url.searchParams.set('key', _FIREBASE_API_KEY);
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const resp = await fetch(url.toString());
    const data = await resp.json();
    if (data.error) throw new Error(`Firestore error: ${data.error.message}`);
    if (data.documents) allDocs = allDocs.concat(data.documents);
    pageToken = data.nextPageToken || null;
  } while (pageToken);

  function fv(v) {
    if (!v) return null;
    if ('stringValue' in v) return v.stringValue;
    return null;
  }

  const result = {};
  for (const doc of allDocs) {
    const f = doc.fields;
    const genre = fv(f.genre);
    const rawCat = fv(f.category);
    if (!genre || !rawCat) continue;
    const category = _CAT_NORMALIZE[rawCat] || rawCat;
    const item = { id: fv(f.id), title: fv(f.title), url: fv(f.url), imageUrl: fv(f.imageUrl), notes: fv(f.notes) };
    if (!result[genre])           result[genre] = {};
    if (!result[genre][category]) result[genre][category] = [];
    result[genre][category].push(item);
  }
  return result;
}

async function _getCuratedItems() {
  return new Promise(resolve => {
    storageLocal.get({ savecraft_curated_data: null }, async cached => {
      const c = cached.savecraft_curated_data;
      if (c?.data && c?.version === _CURATED_CACHE_VERSION && Date.now() - (c.fetchedAt || 0) < 24 * 60 * 60 * 1000) {
        return resolve(c.data);
      }
      try {
        const fresh = await _loadCuratedFromFirestore();
        storageLocal.set({ savecraft_curated_data: { data: fresh, fetchedAt: Date.now(), version: _CURATED_CACHE_VERSION } });
        resolve(fresh);
      } catch {
        resolve(c?.data || {});
      }
    });
  });
}

// Fetches curated items (from cache if fresh, else Firestore) and installs them into the
// shared state.js CURATED_ITEMS live binding.
export async function initCuratedItems() {
  setCuratedItems(await _getCuratedItems());
}

// One-time Admin Kanban seed — the launch-requirements.md checklist (Documentation/), one card
// per sub-task rather than one card per top-level item, per direct request. Column keys match
// adminKanban.js's ADMIN_KANBAN_COLUMNS ('todo'/'in-progress'/'blocked'/'done'); the three
// already-completed Privacy Policy/Terms sub-tasks seed straight into 'done' so the board reflects
// real progress already made, not just what's left.
function _seedAdminKanbanCards() {
  // 3rd tuple element is urgency (1-10, matching the card's own colored dot — blue 1-3/yellow
  // 4-7/red 8-10) — highest on the Firestore-rules blocker and its immediate legal-page
  // follow-ups, lowest on cross-browser/cleanup. Omitted (undefined) on the 'done' group — an
  // already-finished task has nothing left to prioritize.
  const groups = {
    todo: [
      ['Compare live Firestore rules vs. local file', 'console.firebase.google.com → votecraft-789 → Firestore → Rules. Compare against firebase/firestore.rules.', 10],
      ['Deploy Firestore rules if they don’t match', 'firebase deploy --only firestore:rules --project votecraft-789', 10],
      ['Verify per-user Firestore isolation', 'Signed in as one test account, confirm you can’t read/write another account’s savecraft_users/{uid} doc.', 9],
      ['Confirm curated content stays public-read/write-denied', 'curated_items / curated_genres collections.', 8],
      ['Update security doc once rules are confirmed live', 'savecraft-profile-security.md → "One thing to actually do" section.', 6],
      ['Fill in governing-law placeholder in Terms of Service', 'The [insert state/jurisdiction] line in terms-of-service.html.', 7],
      ['Get Privacy Policy + Terms reviewed by someone with real legal judgment', 'Then remove the yellow "working draft" banner from both pages.', 8],
      ['Decide on a forgot-password approach', 'Firebase Auth’s built-in sendPasswordResetEmail is the simplest fit.', 6],
      ['Add a "Forgot password?" link to the sign-in modal', '', 5],
      ['Wire the forgot-password link to send the reset email', '', 5],
      ['Add a "check your email" confirmation state to the modal', '', 4],
      ['Test the full password-reset loop end-to-end', 'Request → email arrives → reset → sign in with the new password.', 5],
      ['Decide: should savecraft.org allow local-only browsing?', 'Extension already allows it without an account — decide if the website should too, or stay sign-in-required.', 5],
      ['Scope the local-browsing gating work for web', 'If bringing it to web — platform.js’s localStorage shim already exists, likely just gating logic in main.js’s init().', 4],
      ['Decide what "View Demo" should permanently be', 'If staying sign-in-required for the website.', 4],
      ['Update security doc with the sign-in-requirement decision', '', 3],
      ['Pick an error/usage monitoring tool', 'Firebase Analytics (least setup, same project) vs. Sentry vs. just asking testers to check console.', 5],
      ['Add the monitoring SDK/snippet', '', 5],
      ['Confirm monitoring events actually show up', 'Send a real test event and check the dashboard.', 4],
      ['Write testers a "how to report a bug" note', 'What to screenshot/copy.', 3],
      ['Mobile pass: Dashboard', 'Hero, all 5 widgets including the new Admin Kanban tile.', 5],
      ['Mobile pass: Queue Kanban board', '', 5],
      ['Mobile pass: Admin Kanban board', 'Brand new — never mobile-tested at all yet.', 4],
      ['Mobile pass: Curated pages', 'Landing, genre pages, Cause Curated bare list.', 5],
      ['Mobile pass: Shared Saves page', '', 4],
      ['Mobile pass: Modals', 'Add/Edit item, Detail modal, Auth/sign-in modal.', 5],
      ['Cross-browser test: Android Chrome', '', 3],
      ['Cross-browser test: Desktop Firefox', '', 2],
      ['Cross-browser test: Desktop Safari', '', 2],
      ['Cross-browser test: Desktop Chrome', 'Sanity check — likely fine but unconfirmed.', 1],
      ['Confirm the games/ and api/ deletions are actually unwanted', 'Called a mistake earlier — double-check before restoring.', 3],
      ['Restore games/api deletions via git', 'git restore / git checkout -- for games/jokemaster, games/power-plays, games/scavenger-tours, and the affected api/* files.', 3],
      ['Double-check nothing else in the working tree needs cleanup', '', 2],
      ['Check Chrome Web Store publish status', 'Published, unlisted, or not submitted at all?', 3],
      ['Decide: publish unlisted vs. have testers sideload', '', 2],
      ['Write sideload install instructions', 'Only needed if testers will sideload rather than install from the Store.', 2],
    ],
    done: [
      ['Draft Privacy Policy page', 'src/webpage/privacy-policy.html'],
      ['Draft Terms of Service page', 'src/webpage/terms-of-service.html'],
      ['Link Privacy Policy + Terms from the app', 'Profile page (desktop + mobile), Settings dropdown, Sponsored Statements footer.'],
    ],
  };
  const now = Date.now();
  let i = 0;
  const cards = [];
  for (const [status, entries] of Object.entries(groups)) {
    entries.forEach(([name, details, urgency], manualOrder) => {
      cards.push({ id: `admin-seed-${i}`, name, details, urgency: urgency ?? null, status, manualOrder, createdAt: now + (i++) });
    });
  }
  return cards;
}

// One-time backfill for urgency on cards seeded before this feature existed — _seedAdminKanbanCards()
// above now bakes urgency in from the start for anyone seeding fresh, but this user's board was
// very likely already seeded (without urgency) before this shipped. Matches by the same stable
// admin-seed-N ids rather than re-seeding, so it only ever touches those specific cards — nothing
// the user added themselves — and only ever runs once (savecraft_admin_kanban_urgency_backfilled).
function _backfillSeedUrgency(cards) {
  const byId = new Map(_seedAdminKanbanCards().map(c => [c.id, c.urgency]));
  let changed = false;
  cards.forEach(c => {
    if (byId.has(c.id) && (c.urgency === undefined || c.urgency === null) && byId.get(c.id) != null) {
      c.urgency = byId.get(c.id);
      changed = true;
    }
  });
  return changed;
}

export async function loadAll() {
  return new Promise(resolve => {
    storageSync.get(null, data => {
      state.items = Object.entries(data)
        .filter(([k]) => k.startsWith('item_'))
        .map(([, v]) => v);
      state.folders = Object.entries(data)
        .filter(([k]) => k.startsWith('folder_'))
        .map(([, v]) => v);
      state.authors = Object.entries(data)
        .filter(([k]) => k.startsWith('author_'))
        .map(([, v]) => v);
      state.sort = data.savecraft_sort || 'az';
      state.tutorialSeen = data.savecraft_tutorial_seen || false;
      if (data.savecraft_kanban_sort) state.kanbanSort = { ...state.kanbanSort, ...data.savecraft_kanban_sort };
      if (data.savecraft_admin_kanban_sort) state.adminKanbanSort = data.savecraft_admin_kanban_sort;
      // Seeded exactly once, gated on its own savecraft_admin_kanban_seeded flag rather than
      // "does savecraft_admin_kanban_cards exist" (defaultLists' own convention just below) —
      // this board had already been tested live before this seed was written, so that check could
      // easily see a real (non-empty) array already there and skip seeding entirely. The flag
      // guarantees this runs exactly once regardless of what's already saved (appending to it,
      // never overwriting), and — just as importantly — never re-adds a seeded card the user
      // later deletes, since the flag stays set after that first run.
      if (!data.savecraft_admin_kanban_seeded) {
        state.adminKanbanCards = [...(data.savecraft_admin_kanban_cards || []), ..._seedAdminKanbanCards()];
        storageSync.set({ savecraft_admin_kanban_cards: state.adminKanbanCards, savecraft_admin_kanban_seeded: true });
      } else {
        state.adminKanbanCards = data.savecraft_admin_kanban_cards || [];
        // One-time patch for boards seeded before urgency existed as a field — see
        // _backfillSeedUrgency's own comment. Only relevant on this branch: the fresh-seed branch
        // above already gets urgency baked in from _seedAdminKanbanCards() directly.
        if (!data.savecraft_admin_kanban_urgency_backfilled) {
          _backfillSeedUrgency(state.adminKanbanCards);
          storageSync.set({ savecraft_admin_kanban_cards: state.adminKanbanCards, savecraft_admin_kanban_urgency_backfilled: true });
        }
      }
      const defaultLists = [
        { id: 'group',   name: 'Group Queue'   },
        { id: 'project', name: 'Project Queue' },
        { id: 'work',    name: 'Work Queue'    },
      ];
      const oldNames = { 'Group Saves': 'Group Queue', 'Project Saves': 'Project Queue', 'Work Saves': 'Work Queue' };
      if (data.savecraft_kanban_lists) {
        state.kanbanLists = data.savecraft_kanban_lists.map(l => oldNames[l.name] ? { ...l, name: oldNames[l.name] } : l);
        storageSync.set({ savecraft_kanban_lists: state.kanbanLists });
      } else {
        state.kanbanLists = defaultLists;
      }
      // Sidebar's "Saved Lists" row (under Dashboard) — seeded once with three starter entries;
      // never re-seeded once the key exists, same "seed if missing" convention as kanbanLists above.
      if (data.savecraft_saved_lists) {
        state.savedLists = data.savecraft_saved_lists;
        // Renamed "Dance" -> "Motivation" — same id (default-dance), just a different label, so
        // any install that already seeded the old name picks up the new one on next load rather
        // than being stuck forever (seed-if-missing above only ever fires once).
        const danceList = state.savedLists.find(l => l.id === 'default-dance');
        if (danceList && danceList.name === 'Dance') {
          danceList.name = 'Motivation';
          storageSync.set({ savecraft_saved_lists: state.savedLists });
        }
        // Renamed "Favorites" -> "All Saves" -> "All My Saves" — same id (default-favorites) for
        // the same reason each time ("All Saves" read as ambiguous with a possible future generic
        // "all saves" search/filter concept). Every place that needs to know "is this specifically
        // the Favorites list" (it's the one that drives item.favorite instead of
        // item.savedListIds — detailModalHeader.js, renderFilters.js, share.js) checks this id,
        // not the display name, so it keeps working regardless of what the list is labeled. Both
        // old names checked in one pass (not two sequential ifs) so an install still on the
        // original "Favorites" name jumps straight to "All My Saves" in a single write, rather
        // than persisting through "All Saves" as an intermediate step.
        const favoritesList = state.savedLists.find(l => l.id === 'default-favorites');
        if (favoritesList && (favoritesList.name === 'Favorites' || favoritesList.name === 'All Saves')) {
          favoritesList.name = 'All My Saves';
          storageSync.set({ savecraft_saved_lists: state.savedLists });
        }
      } else {
        state.savedLists = [
          { id: 'default-favorites', name: 'All My Saves' },
          { id: 'default-health', name: 'Health' },
          { id: 'default-motivation', name: 'Motivation' },
        ];
        storageSync.set({ savecraft_saved_lists: state.savedLists });
      }
      // "Curated Lists" row (Saved Lists' sibling under Dashboard) — seeded with two starter
      // entries, "Votecraft" then "RCV" below it (two separate folders, not one combined entry —
      // see the "default-votecraft-rcv" migration below); the user can add more via its own
      // "+ New folder" prompt. Checked by id rather than gated purely on the key's existence
      // (unlike savedLists' seed-if-missing above) since an install could already have this key
      // set from adding its own custom row before these starter entries existed — the id checks
      // re-add whatever's missing either way.
      if (data.savecraft_curated_lists_rows) {
        state.curatedListsRows = data.savecraft_curated_lists_rows;
        let changed = false;
        // Splits the original single "Votecraft and RCV" entry (briefly shipped) into its own
        // two rows, in place, so any install that already picked it up isn't stuck with the
        // combined version forever.
        const combinedIdx = state.curatedListsRows.findIndex(l => l.id === 'default-votecraft-rcv');
        if (combinedIdx !== -1) {
          state.curatedListsRows.splice(combinedIdx, 1, { id: 'default-votecraft', name: 'Votecraft' }, { id: 'default-rcv', name: 'RCV' });
          changed = true;
        } else {
          if (!state.curatedListsRows.some(l => l.id === 'default-rcv')) {
            state.curatedListsRows.unshift({ id: 'default-rcv', name: 'RCV' });
            changed = true;
          }
          if (!state.curatedListsRows.some(l => l.id === 'default-votecraft')) {
            state.curatedListsRows.unshift({ id: 'default-votecraft', name: 'Votecraft' });
            changed = true;
          }
        }
        if (changed) storageSync.set({ savecraft_curated_lists_rows: state.curatedListsRows });
      } else {
        state.curatedListsRows = [{ id: 'default-votecraft', name: 'Votecraft' }, { id: 'default-rcv', name: 'RCV' }];
        storageSync.set({ savecraft_curated_lists_rows: state.curatedListsRows });
      }
      state.hiddenCurated = new Set(data.savecraft_hidden_curated || []);
      state.curatedOverrides = data.savecraft_curated_overrides || {};
      state.lastfmUsername = data.savecraft_lastfm_username || null;
      state.followedCuratedLists = new Set(data.savecraft_followed_curated_lists || []);
      state.steamId = data.savecraft_steam_id || null;
      if (data.savecraft_view?.startsWith('author:')) {
        const rest = data.savecraft_view.slice(7);
        const colonIdx = rest.indexOf(':');
        const cat = rest.slice(0, colonIdx);
        const name = rest.slice(colonIdx + 1);
        state.view = state.authors.find(a => a.name === name && a.category === cat)
          ? data.savecraft_view : cat;
      } else if (data.savecraft_view) {
        state.view = data.savecraft_view;
      }
      if (data.savecraft_sidebar_mode) state.sidebarMode = data.savecraft_sidebar_mode;

      // Clean up legacy default folders no longer used
      const legacyIds = [
        'default-music-albums', 'default-music-streaming',
        // News outlet curation is being reworked — pull these back out for now.
        'default-news-ap', 'default-news-reuters', 'default-news-npr', 'default-news-pbs',
        'default-shows-news',
        'default-weblinks-news',
        'default-books-genres',
        // Redundant with the real Musician category now — confusingly asked "pick Musician" twice.
        'default-music-musicians',
        // Removed from Visual Art per request.
        'default-art-painting', 'default-art-sculpture',
        // Removed from Web Links (Sources) per request — went through several live renames
        // (Shops -> Memes -> Publications) before landing on "just remove it"; matching by id
        // here (not name) is what actually catches every install regardless of which of those
        // names it happened to get stuck on.
        'default-weblinks-shops',
      ];
      const legacyKeys = legacyIds.map(id => `folder_${id}`).filter(k => data[k]);
      state.folders = state.folders.filter(f => !legacyIds.includes(f.id));

      // Migrate old category names to new ones
      const CAT_MIGRATION = { Books: 'Book', Games: 'Game', Movies: 'Movie', Music: 'Music Album', Shows: 'Show' };
      const migrated = [];
      state.items.forEach(item => {
        if (CAT_MIGRATION[item.category]) {
          item.category = CAT_MIGRATION[item.category];
          migrated.push(item);
        }
      });
      if (migrated.length) {
        const toMigrate = {};
        migrated.forEach(item => { toMigrate[`item_${item.id}`] = item; });
        storageSync.set(toMigrate);
      }

      // Migrate the old folder-based "Favorites" mechanism to the new item.favorite boolean —
      // favoriting used to overwrite folderId to point at a per-category "Favorites" folder,
      // clobbering whatever real folder the item was in. Can't recover that lost folder, so this
      // resets folderId to null (un-foldered now counts as a category's primary folder).
      const favoritesFolderIds = new Set(state.folders.filter(f => f.name === 'Favorites').map(f => f.id));
      if (favoritesFolderIds.size) {
        const favMigrated = [];
        state.items.forEach(item => {
          if (favoritesFolderIds.has(item.folderId)) {
            item.favorite = true;
            item.folderId = null;
            favMigrated.push(item);
          }
        });
        if (favMigrated.length) {
          const toMigrate = {};
          favMigrated.forEach(item => { toMigrate[`item_${item.id}`] = item; });
          storageSync.set(toMigrate);
        }
        state.folders = state.folders.filter(f => !favoritesFolderIds.has(f.id));
        favoritesFolderIds.forEach(id => removeFolder(id));
      }

      // One-time migration: item.savedListId (singular — radio-style, one custom Saved List at a
      // time) -> item.savedListIds (array — the detail modal's "Save to:" menu is checkbox-style
      // now, so an item can belong to multiple lists at once, including Favorites simultaneously).
      const savedListIdMigrated = [];
      state.items.forEach(item => {
        if (item.savedListId) {
          item.savedListIds = [item.savedListId];
          delete item.savedListId;
          savedListIdMigrated.push(item);
        }
      });
      if (savedListIdMigrated.length) {
        const toMigrate = {};
        savedListIdMigrated.forEach(item => { toMigrate[`item_${item.id}`] = item; });
        storageSync.set(toMigrate);
      }

      // One-time migration: TV Shows moved from the Shows category into Films — every item
      // already saved in Shows' old "TV Shows" folder (default-shows-shows) gets recategorized
      // as a Movie item and refiled into Films' new "Series" folder (default-movies-series,
      // seeded below), and the now-retired Shows folder itself is deleted. Shows keeps its
      // remaining folders (Podcasts/Webseries/Tutorials/Creators) untouched.
      const oldTvShowsFolder = state.folders.find(f => f.id === 'default-shows-shows');
      if (oldTvShowsFolder) {
        const tvShowsMigrated = [];
        state.items.forEach(item => {
          if (item.folderId === 'default-shows-shows') {
            item.category = 'Movie';
            item.folderId = 'default-movies-series';
            tvShowsMigrated.push(item);
          }
        });
        if (tvShowsMigrated.length) {
          const toMigrate = {};
          tvShowsMigrated.forEach(item => { toMigrate[`item_${item.id}`] = item; });
          storageSync.set(toMigrate);
        }
        state.folders = state.folders.filter(f => f.id !== 'default-shows-shows');
        removeFolder('default-shows-shows');
      }

      // Backfill: curated Music Album items stash their artist name in .notes while curated (see
      // detailModal.js's _detailAuthorName). Before a fix, promoting one to a real saved item
      // (detailModal.js's ensureLiveItem) left the artist name stranded in .notes instead of
      // moving it into .author, silently losing the artist link/website CTA. Move it now for any
      // personal (non-curated) Music Album still in that shape — safe to run every load, since
      // it's a no-op once .author is set.
      const authorBackfilled = [];
      state.items.forEach(item => {
        if (item.category === 'Music Album' && !item.curated && !item.author && item.notes) {
          item.author = item.notes;
          item.notes = null;
          authorBackfilled.push(item);
        }
        // Same idea for Book/Movie/Show/Game items saved before the creator-name resolution
        // existed (or before it worked correctly) — Book's combined "Title — Author" was never
        // split into item.author, and Movie/Show/Game's item.author was never filled in from the
        // static Wikidata/Steam-sourced lookup, so these were stuck showing their raw combined
        // title (or no byline at all) on cards/Kanban forever, since ensureLiveItem() only runs
        // once, at first-save time.
        if (!item.curated && !item.author && SPLIT_TITLE_CREATOR_CATEGORIES.includes(item.category)) {
          const split = splitCuratedTitleCreator(item.title);
          if (split.author) {
            item.title = split.title;
            item.author = split.author;
            authorBackfilled.push(item);
          } else {
            const staticCreator = getStaticCuratedCreator(item.category, item.title);
            if (staticCreator) {
              item.author = staticCreator.name;
              item.authorHasMore = staticCreator.hasMore;
              authorBackfilled.push(item);
            }
          }
        }
      });
      if (authorBackfilled.length) {
        const toBackfill = {};
        authorBackfilled.forEach(item => { toBackfill[`item_${item.id}`] = item; });
        storageSync.set(toBackfill);
      }

      // Seed new default folders if not present
      const defaults = [
        { id: 'default-music-albums',     name: 'Albums',       parentCategory: 'Music Album' },
        { id: 'default-music-playlists',  name: 'Playlists',    parentCategory: 'Music Album' },
        { id: 'default-books-authors',    name: 'Authors',      parentCategory: 'Book' },
        { id: 'default-weblinks-articles', name: 'Articles',    parentCategory: 'Web Links' },
        { id: 'default-weblinks-blogs',    name: 'News',        parentCategory: 'Web Links' },
        { id: 'default-movies-videos',   name: 'Videos',        parentCategory: 'Movie' },
        { id: 'default-movies-directors', name: 'Directors',    parentCategory: 'Movie' },
        { id: 'default-shows-podcasts',  name: 'Podcasts',      parentCategory: 'Show' },
        { id: 'default-shows-webseries', name: 'Web Series',    parentCategory: 'Show' },
        { id: 'default-shows-tutorials', name: 'Tutorials',     parentCategory: 'Show' },
        { id: 'default-shows-creators',  name: 'Creators',      parentCategory: 'Show' },
        { id: 'default-movies-movies',       name: 'Movies',    parentCategory: 'Movie' },
        // TV Shows moved from Shows into Films — see the one-time migration below that also
        // recategorizes any items already saved in the old Shows "TV Shows" folder into this one.
        { id: 'default-movies-series',       name: 'Series',    parentCategory: 'Movie' },
        { id: 'default-musicians-musicians', name: 'Musicians', parentCategory: 'Musician' },
        { id: 'default-books-books',         name: 'Books',     parentCategory: 'Book' },
        { id: 'default-books-pdfs',          name: 'PDFs',      parentCategory: 'Book' },
        { id: 'default-books-quotes',        name: 'Quotes',    parentCategory: 'Book' },
        { id: 'default-weblinks-websites',   name: 'Websites',  parentCategory: 'Web Links' },
        // Fresh id, not the old 'default-weblinks-shops' (permanently retired via legacyIds
        // above, after that id got stuck mid-rename in a live install — see that entry's
        // comment) — reusing it would just fight the legacyIds cleanup forever.
        { id: 'default-weblinks-publications', name: 'Publications', parentCategory: 'Web Links' },
        { id: 'default-art-dance',     name: 'Movement', parentCategory: 'Visual Art' },
        { id: 'default-art-comics',    name: 'Comics',    parentCategory: 'Visual Art' },
        { id: 'default-art-memes',     name: 'Memes',     parentCategory: 'Visual Art' },
        { id: 'default-art-artists',   name: 'Artists',   parentCategory: 'Visual Art' },
        { id: 'default-games-board',      name: 'Board Games',    parentCategory: 'Game' },
        { id: 'default-games-console',    name: 'Console Games',  parentCategory: 'Game' },
        { id: 'default-games-mobile',     name: 'Mobile Games',   parentCategory: 'Game' },
        { id: 'default-games-companies',  name: 'Game Companies', parentCategory: 'Game' },
        // Curated News outlet folders removed for now — coming back to this (see legacyIds above).
      ];
      const toSave = {};
      for (const df of defaults) {
        if (!state.folders.find(f => f.id === df.id)) {
          state.folders.push(df);
          toSave[`folder_${df.id}`] = df;
        }
      }

      // Renamed "Music Albums" -> "Albums" — installs that already seeded this folder under its
      // old name keep it forever otherwise, since the block above only seeds when missing.
      const musicAlbumsFolder = state.folders.find(f => f.id === 'default-music-albums');
      if (musicAlbumsFolder && musicAlbumsFolder.name === 'Music Albums') {
        musicAlbumsFolder.name = 'Albums';
        toSave[`folder_${musicAlbumsFolder.id}`] = musicAlbumsFolder;
      }

      // Renamed Web Links' "Blogs" -> "News" (same reasoning) — News' own top-level tab was
      // dropped separately (see CATEGORIES in state.js), with this folder taking over as where
      // News-flavored links get filed under Web Links instead.
      const blogsFolder = state.folders.find(f => f.id === 'default-weblinks-blogs');
      if (blogsFolder && blogsFolder.name === 'Blogs') {
        blogsFolder.name = 'News';
        toSave[`folder_${blogsFolder.id}`] = blogsFolder;
      }

      // Renamed Web Links' "Website" -> "Websites" (plural, matching every other folder name's
      // plural convention).
      const websitesFolder = state.folders.find(f => f.id === 'default-weblinks-websites');
      if (websitesFolder && websitesFolder.name === 'Website') {
        websitesFolder.name = 'Websites';
        toSave[`folder_${websitesFolder.id}`] = websitesFolder;
      }

      // Renamed Visual Art's "Dance" -> "Movement".
      const danceFolder = state.folders.find(f => f.id === 'default-art-dance');
      if (danceFolder && danceFolder.name === 'Dance') {
        danceFolder.name = 'Movement';
        toSave[`folder_${danceFolder.id}`] = danceFolder;
      }

      // Renamed Shows' "Webseries" -> "Web Series" (two words, so it wraps to two lines on the
      // mobile Add-Item folder picker — see folderTileLabelHtml in addEditModal.js).
      const webseriesFolder = state.folders.find(f => f.id === 'default-shows-webseries');
      if (webseriesFolder && webseriesFolder.name === 'Webseries') {
        webseriesFolder.name = 'Web Series';
        toSave[`folder_${webseriesFolder.id}`] = webseriesFolder;
      }

      if (legacyKeys.length) {
        storageSync.remove(legacyKeys, () => {
          if (Object.keys(toSave).length) storageSync.set(toSave, resolve);
          else resolve();
        });
      } else if (Object.keys(toSave).length) {
        storageSync.set(toSave, resolve);
      } else {
        resolve();
      }
    });
  });
}

export function persistItem(item) {
  const local = new Promise(resolve => storageSync.set({ [`item_${item.id}`]: item }, resolve));
  const user = getCurrentUser();
  if (user) _firestoreUpsert(`savecraft_users/${user.uid}/items/${item.id}`, item).catch(_syncError);
  return local;
}

export function removeItem(id) {
  const local = new Promise(resolve => storageSync.remove(`item_${id}`, resolve));
  const user = getCurrentUser();
  if (user) _firestoreDelete(`savecraft_users/${user.uid}/items/${id}`).catch(_syncError);
  return local;
}

export function persistHiddenCurated() {
  const local = new Promise(resolve => storageSync.set({ savecraft_hidden_curated: [...state.hiddenCurated] }, resolve));
  const user = getCurrentUser();
  if (user) _firestoreUpsertFields(`savecraft_users/${user.uid}`, { hiddenCurated: [...state.hiddenCurated] }).catch(_syncError);
  return local;
}

export function persistCuratedOverrides() {
  const local = new Promise(resolve => storageSync.set({ savecraft_curated_overrides: state.curatedOverrides }, resolve));
  const user = getCurrentUser();
  if (user) _firestoreUpsertFields(`savecraft_users/${user.uid}`, { curatedOverrides: state.curatedOverrides }).catch(_syncError);
  return local;
}

// Whole-array write (same convention as the savecraft_saved_lists loading/seeding block above) —
// used both by renderSidebar.js's addSavedList() and by Profile > Saved Lists (profile.js) when
// toggling a list's allowedFolderIds scope.
export function persistSavedLists() {
  const local = new Promise(resolve => storageSync.set({ savecraft_saved_lists: state.savedLists }, resolve));
  const user = getCurrentUser();
  if (user) _firestoreUpsertFields(`savecraft_users/${user.uid}`, { savedLists: state.savedLists }).catch(_syncError);
  return local;
}

// Whole-array write, local-only — same convention as kanbanSort/kanbanLists (kanban.js), not
// dual-written to Firestore. Admin Kanban is a personal task board, not part of the synced
// item/folder/author data model.
export function persistAdminKanbanCards() {
  return new Promise(resolve => storageSync.set({ savecraft_admin_kanban_cards: state.adminKanbanCards }, resolve));
}

export function persistCuratedImgCache() {
  storageLocal.set({ savecraft_curated_img: state.curatedImgCache });
}

export function persistCuratedAlbumMetaCache() {
  storageLocal.set({ savecraft_curated_album_meta: state.curatedAlbumMetaCache });
}

export function persistAlbumTrackListCache() {
  storageLocal.set({ savecraft_album_tracklist: state.albumTrackListCache });
}

export function persistAlbumArtCache() {
  storageLocal.set({ savecraft_album_art_cache: state.albumArtCache });
}

export function persistArtistWebsiteCache() {
  storageLocal.set({ savecraft_artist_website_cache: state.artistWebsiteCache });
}

// _v2: bumped when the cached shape grew a photoUrl field, so old bio-only cache entries
// (which would otherwise short-circuit the photo lookup) don't linger.
export function persistArtistBioCache() {
  storageLocal.set({ savecraft_artist_bio_cache_v2: state.artistBioCache });
}

export function persistItemWikiCache() {
  storageLocal.set({ savecraft_item_wiki_cache: state.itemWikiCache });
}

export function persistCreatorCache() {
  storageLocal.set({ savecraft_creator_cache: state.creatorCache });
}

export function persistViewState() {
  storageSync.set({ savecraft_view: state.view, savecraft_sidebar_mode: state.sidebarMode });
  const user = getCurrentUser();
  if (user) _firestoreUpsertFields(`savecraft_users/${user.uid}`, { view: state.view, sidebarMode: state.sidebarMode }).catch(_syncError);
}

export function persistFolder(folder) {
  const local = new Promise(resolve => storageSync.set({ [`folder_${folder.id}`]: folder }, resolve));
  const user = getCurrentUser();
  if (user) _firestoreUpsert(`savecraft_users/${user.uid}/folders/${folder.id}`, folder).catch(_syncError);
  return local;
}

export function removeFolder(id) {
  const local = new Promise(resolve => storageSync.remove(`folder_${id}`, resolve));
  const user = getCurrentUser();
  if (user) _firestoreDelete(`savecraft_users/${user.uid}/folders/${id}`).catch(_syncError);
  return local;
}

export function persistAuthor(author) {
  const local = new Promise(resolve => storageSync.set({ [`author_${author.id}`]: author }, resolve));
  const user = getCurrentUser();
  if (user) _firestoreUpsert(`savecraft_users/${user.uid}/authors/${author.id}`, author).catch(_syncError);
  return local;
}

// Called once, right before the Firebase Auth account itself is deleted (see auth.js's
// deleteAccount()) — must happen first, since deleting the Auth account invalidates the idToken
// these deletes need to authenticate (the security rules require request.auth.uid == userId).
// Per-item failures are swallowed (a partial cleanup shouldn't block the account deletion itself
// completing) — this can leave a document orphaned in Firestore if one delete fails, but nobody
// (including the original owner) can ever read/write it again once the account is gone, since the
// rules still require a matching signed-in uid. Local (chrome.storage.sync) items/folders/authors
// are deliberately left untouched here — same as signOut(), which never clears local data either.
export async function deleteAllAccountFirestoreData(uid) {
  for (const item of state.items) await _firestoreDelete(`savecraft_users/${uid}/items/${item.id}`).catch(() => {});
  for (const folder of state.folders) await _firestoreDelete(`savecraft_users/${uid}/folders/${folder.id}`).catch(() => {});
  for (const author of state.authors) await _firestoreDelete(`savecraft_users/${uid}/authors/${author.id}`).catch(() => {});
  await _firestoreDelete(`savecraft_users/${uid}`).catch(() => {});
}

// All local-only caches (curated images, artist lookups, etc.) are stored separately from
// storageSync — this loads one of them into `state` at startup.
export function loadLocalCache(storageKey, stateProp) {
  return new Promise(resolve => {
    storageLocal.get({ [storageKey]: {} }, data => {
      state[stateProp] = data[storageKey];
      resolve();
    });
  });
}

// Thin wrappers around three call sites (main.js's handleSort/toggleTheme/toggleSidebarCollapsed)
// and one in share.js that previously called storageSync.set directly, bypassing this
// file entirely — bringing them under the same dual-write umbrella as everything else here.
export function persistSort(sort) {
  storageSync.set({ savecraft_sort: sort });
  const user = getCurrentUser();
  if (user) _firestoreUpsertFields(`savecraft_users/${user.uid}`, { sort }).catch(_syncError);
}

export function persistTheme(theme) {
  storageSync.set({ savecraft_theme: theme });
  const user = getCurrentUser();
  if (user) _firestoreUpsertFields(`savecraft_users/${user.uid}`, { theme }).catch(_syncError);
}

export function persistSidebarCollapsed(collapsed) {
  storageSync.set({ savecraft_sidebar_collapsed: collapsed });
  const user = getCurrentUser();
  if (user) _firestoreUpsertFields(`savecraft_users/${user.uid}`, { sidebarCollapsed: collapsed }).catch(_syncError);
}

export function persistShareCount(count) {
  storageSync.set({ savecraft_share_count: count });
  const user = getCurrentUser();
  if (user) _firestoreUpsertFields(`savecraft_users/${user.uid}`, { shareCount: count }).catch(_syncError);
}

// ===== PROFILE PAGE (Connections + Interests) =====
export function persistLastfmUsername(username) {
  storageSync.set({ savecraft_lastfm_username: username });
  const user = getCurrentUser();
  if (user) _firestoreUpsertFields(`savecraft_users/${user.uid}`, { lastfmUsername: username }).catch(_syncError);
}

export function disconnectLastfm() {
  state.lastfmUsername = null;
  storageSync.set({ savecraft_lastfm_username: null });
  const user = getCurrentUser();
  if (user) _firestoreUpsertFields(`savecraft_users/${user.uid}`, { lastfmUsername: null }).catch(_syncError);
}

export function persistFollowedCuratedLists() {
  const list = [...state.followedCuratedLists];
  storageSync.set({ savecraft_followed_curated_lists: list });
  const user = getCurrentUser();
  if (user) _firestoreUpsertFields(`savecraft_users/${user.uid}`, { followedCuratedLists: list }).catch(_syncError);
}

// Local-only cache — re-fetchable, not user-authored data, same treatment as
// persistArtistWebsiteCache() etc. above.
export function persistLastfmCache() {
  storageLocal.set({ savecraft_lastfm_cache: state.lastfmCache });
}

export function persistSteamId(steamId) {
  storageSync.set({ savecraft_steam_id: steamId });
  const user = getCurrentUser();
  if (user) _firestoreUpsertFields(`savecraft_users/${user.uid}`, { steamId }).catch(_syncError);
}

export function disconnectSteam() {
  state.steamId = null;
  storageSync.set({ savecraft_steam_id: null });
  const user = getCurrentUser();
  if (user) _firestoreUpsertFields(`savecraft_users/${user.uid}`, { steamId: null }).catch(_syncError);
}

export function persistSteamCache() {
  storageLocal.set({ savecraft_steam_cache: state.steamCache });
}

// ===== INITIAL SYNC (runs once, right after a successful sign-up/sign-in) =====
// Deliberately simple union-by-ID merge, not a general bidirectional sync engine. Settings are
// whole-doc (cloud wins wholesale if it exists); items/folders/authors merge independently by
// ID, with cloud winning any same-ID collision on this very first merge (pre-existing local
// records have no updatedAt, treated as oldest possible) — every edit after this first merge
// dual-writes with a real timestamp, so any later first-sync-on-a-new-device merge has genuine
// last-write-wins semantics on both sides.

function _readLocalSettingsSnapshot() {
  return new Promise(resolve => {
    storageSync.get({
      savecraft_sort: 'az',
      savecraft_tutorial_seen: false,
      savecraft_kanban_sort: {},
      savecraft_kanban_lists: [],
      savecraft_hidden_curated: [],
      savecraft_curated_overrides: {},
      savecraft_view: 'Book',
      savecraft_sidebar_mode: 'home',
      savecraft_theme: 'dark',
      savecraft_sidebar_collapsed: true,
      savecraft_share_count: 0,
      savecraft_lastfm_username: null,
      savecraft_followed_curated_lists: [],
      savecraft_steam_id: null,
    }, data => resolve({
      sort: data.savecraft_sort,
      tutorialSeen: data.savecraft_tutorial_seen,
      kanbanSort: data.savecraft_kanban_sort,
      kanbanLists: data.savecraft_kanban_lists,
      hiddenCurated: data.savecraft_hidden_curated,
      curatedOverrides: data.savecraft_curated_overrides,
      view: data.savecraft_view,
      sidebarMode: data.savecraft_sidebar_mode,
      theme: data.savecraft_theme,
      sidebarCollapsed: data.savecraft_sidebar_collapsed,
      shareCount: data.savecraft_share_count,
      lastfmUsername: data.savecraft_lastfm_username,
      followedCuratedLists: data.savecraft_followed_curated_lists,
      steamId: data.savecraft_steam_id,
    }));
  });
}

// Strips the Firestore-only updatedAt bookkeeping field before a cloud record is written back
// into storageSync — that field must never leak into the shape the rest of the app
// (render.js, kanban.js, detailModal.js, etc.) expects for an item/folder/author.
function _stripSyncMeta(doc) {
  const { updatedAt, ...rest } = doc;
  return rest;
}

async function _mergeCollection(uid, idToken, subcollection, keyPrefix, localList) {
  const cloudList = await _firestoreListCollection(`savecraft_users/${uid}/${subcollection}`, idToken);
  const cloudById = new Map(cloudList.filter(d => d && d.id).map(d => [d.id, d]));
  const localById = new Map(localList.map(d => [d.id, d]));

  const toUploadLocal = [];
  const toWriteLocal = {};

  for (const [id, localDoc] of localById) {
    const cloudDoc = cloudById.get(id);
    if (!cloudDoc) {
      toUploadLocal.push(localDoc);
    } else {
      // Present in both — cloud wins deterministically on this first merge (see file header).
      toWriteLocal[`${keyPrefix}${id}`] = _stripSyncMeta(cloudDoc);
    }
  }
  for (const [id, cloudDoc] of cloudById) {
    if (!localById.has(id)) toWriteLocal[`${keyPrefix}${id}`] = _stripSyncMeta(cloudDoc);
  }

  for (const doc of toUploadLocal) {
    await _firestoreUpsert(`savecraft_users/${uid}/${subcollection}/${doc.id}`, doc);
  }
  if (Object.keys(toWriteLocal).length) {
    // Fires the extension's existing chrome.storage.onChanged listener (main.js), which already
    // live-patches state.items/folders/authors and re-renders — no new render-wiring needed here.
    await new Promise(resolve => storageSync.set(toWriteLocal, resolve));
  }
}

export async function runInitialSync(uid) {
  const idToken = await getValidIdToken();
  if (!idToken) return;

  const cloudSettings = await _firestoreGetDoc(`savecraft_users/${uid}`, idToken);
  if (!cloudSettings) {
    const localSettings = await _readLocalSettingsSnapshot();
    await _firestoreUpsert(`savecraft_users/${uid}`, localSettings);
  } else {
    await new Promise(resolve => storageSync.set({
      savecraft_sort: cloudSettings.sort,
      savecraft_tutorial_seen: cloudSettings.tutorialSeen,
      savecraft_kanban_sort: cloudSettings.kanbanSort,
      savecraft_kanban_lists: cloudSettings.kanbanLists,
      savecraft_hidden_curated: cloudSettings.hiddenCurated,
      savecraft_curated_overrides: cloudSettings.curatedOverrides,
      savecraft_view: cloudSettings.view,
      savecraft_sidebar_mode: cloudSettings.sidebarMode,
      savecraft_theme: cloudSettings.theme,
      savecraft_sidebar_collapsed: cloudSettings.sidebarCollapsed,
      savecraft_share_count: cloudSettings.shareCount,
      savecraft_lastfm_username: cloudSettings.lastfmUsername,
      savecraft_followed_curated_lists: cloudSettings.followedCuratedLists,
      savecraft_steam_id: cloudSettings.steamId,
    }, resolve));
    // Reflect into live state immediately for the fields state.js actually tracks (theme,
    // sidebarCollapsed, and shareCount have no state.* mirror — main.js/share.js read those
    // fresh from storageSync on their own, so no state update is needed for them).
    if (cloudSettings.sort != null) state.sort = cloudSettings.sort;
    if (cloudSettings.tutorialSeen != null) state.tutorialSeen = cloudSettings.tutorialSeen;
    if (cloudSettings.kanbanSort) state.kanbanSort = { ...state.kanbanSort, ...cloudSettings.kanbanSort };
    if (cloudSettings.kanbanLists) state.kanbanLists = cloudSettings.kanbanLists;
    if (cloudSettings.hiddenCurated) state.hiddenCurated = new Set(cloudSettings.hiddenCurated);
    if (cloudSettings.curatedOverrides) state.curatedOverrides = cloudSettings.curatedOverrides;
    if (cloudSettings.view) state.view = cloudSettings.view;
    if (cloudSettings.sidebarMode) state.sidebarMode = cloudSettings.sidebarMode;
    if (cloudSettings.lastfmUsername !== undefined) state.lastfmUsername = cloudSettings.lastfmUsername;
    if (cloudSettings.followedCuratedLists) state.followedCuratedLists = new Set(cloudSettings.followedCuratedLists);
    if (cloudSettings.steamId !== undefined) state.steamId = cloudSettings.steamId;
  }

  await _mergeCollection(uid, idToken, 'items', 'item_', state.items);
  await _mergeCollection(uid, idToken, 'folders', 'folder_', state.folders);
  await _mergeCollection(uid, idToken, 'authors', 'author_', state.authors);
}
