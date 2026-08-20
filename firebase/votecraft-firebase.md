# Firebase Plan — Votecraft.org Ecosystem

## Project
Firebase project: **votecraft-789**
Config reference: `firebase/firebase-config.js`
Firestore rules: `firebase/firestore.rules`

---

## Apps Using This Firebase Project

| App | Type | Firebase Features Used |
|-----|------|------------------------|
| **JokeMaster** | Browser game | Auth (email+password), Firestore (game state, joke votes) |
| **SaveCraft** | Chrome extension + web app (savecraft.org) | Auth (email+password), Firestore (public curated library read-only; per-user synced library and shared Admin Kanban board, both auth-gated read/write) |
| **SaveCraft WordPress plugin** | wp-admin (votecraft.org), server-side only | Firestore (`admin_kanban_cards` only), via a dedicated bot Auth account — see its own section below |
| **Scavenger Tours** | Browser game (future) | TBD |
| **Power Plays** | Browser game (future) | TBD |

---

## Firestore Collections

### `curated_items` — SaveCraft
Holds the curated media library (movies, music, shows, books, games, visual art).
Public read, no client writes. Managed via Firebase console.

**Document ID:** `{genre-slug}-{category-slug}-{item-id}`
(Composite key because the same item can appear in multiple genre/category buckets.)

**Fields:**
| Field | Type | Example |
|-------|------|---------|
| `id` | string | `cur-top100-1` |
| `title` | string | `Parasite` |
| `url` | string | `https://en.wikipedia.org/wiki/...` |
| `imageUrl` | string \| null | `null` (fetched lazily via Microlink) |
| `notes` | string | `Bong Joon-ho's class warfare thriller.` |
| `genre` | string | `Top 100` |
| `category` | string | `Movies` |

**Genres:** Top 100, Futurism, Fantasy, Thriller, Pop, Classic, Jazz, Comedy
**Categories per genre:** Movies, Music, Shows, Books, Games, Visual Art (not all genres have all categories)
**Current count:** 663 items

**How SaveCraft loads it:** REST API (`fetch` to `firestore.googleapis.com`), reconstructs
the nested `CURATED_ITEMS[genre][category]` shape in memory. Cached in
`chrome.storage.local` with a 24-hour TTL.

**Seed tool:** `Chrome Extensions/savecraft/scripts/seed-firestore.html`
Open in Chrome, sign in, click Seed. Run after any bulk data changes.

---

### `curated_genres` — SaveCraft
Sidebar genre order. Public read, no client writes.

**Document ID:** `{genre-slug}` (e.g., `top-100`, `futurism`)

**Fields:**
| Field | Type | Example |
|-------|------|---------|
| `name` | string | `Top 100` |
| `order` | number | `0` |

---

### `gameStates` — JokeMaster
Per-user game progress. Auth-gated (users can only access their own doc).

**Document ID:** `{firebase-auth-uid}`

---

### `jokeVotes` — JokeMaster
Per-user joke votes. Auth-gated.

**Document ID:** `{userId}_{jokeId}`

---

### `savecraft_users` — SaveCraft
Per-user synced library — the extension's `chrome.storage.sync` data mirrored to the cloud so a future mobile web app (savecraft.org) can read/write the same data. Auth-gated, one doc + three subcollections per user, mirroring the `gameStates` pattern above.

**Document ID:** `{firebase-auth-uid}`

- `savecraft_users/{uid}` — settings singleton: `sort`, `tutorialSeen`, `kanbanSort`, `kanbanLists`, `hiddenCurated`, `curatedOverrides`, `view`, `sidebarMode`, `theme`, `sidebarCollapsed`, `shareCount`, `updatedAt`
- `savecraft_users/{uid}/items/{itemId}` — one doc per saved item, `itemId` matches the extension's local item id
- `savecraft_users/{uid}/folders/{folderId}` — one doc per folder
- `savecraft_users/{uid}/authors/{authorId}` — one doc per author/artist profile

**Auth is SaveCraft-specific, not the shared Emporium account** (see the "Auth implication" note below — this is a deliberate divergence from this doc's original vision, decided directly with the user). Uses the same Firebase project and the same email+password provider, but a SaveCraft sign-up does not double as a Votecraft account. Written via the Firebase Auth REST API directly from the extension (no SDK — the extension has no bundler), not through any shared Emporium sign-in flow.

---

### `admin_kanban_cards` — SaveCraft
SaveCraft's internal project-task board ("Admin Kanban") — a single **shared** collection, not
per-user (unlike `savecraft_users` above). Auth-gated to accounts the app/rules consider admins.

**Document ID:** the card's own `id` (also duplicated inside its own fields, matching the
`items`/`folders`/`authors` convention — see `_mergeCollection` in `storage.js`).

**Fields:** `id`, `name`, `details`, `urgency` (`'low'|'medium'|'high'|null`), `status`
(`'todo'|'in-progress'|'blocked'|'done'`), `manualOrder`, `createdAt`, `updatedAt`.

**Rule (`firestore.rules`) deliberately mirrors `utils.js`'s `isAdminUser(email, role)` logic in
rules syntax** rather than a static human-UID allowlist — `request.auth.token.email.lower()` against
the same hardcoded email list, OR a `get()` lookup of the requester's own `savecraft_users/{uid}.role`
field, OR one hardcoded UID for the dedicated WordPress bot account
(`wp-savecraft-bot@votecraft-789.internal`) — see the rule's own comment for the full reasoning.

**Two writers, both server-side/app-side only, never a portable Firestore credential in a browser
beyond the signed-in user's own scoped ID token:**
1. SaveCraft's own app/extension, when a signed-in admin uses the Admin Kanban board (`storage.js`'s
   `persistAdminKanbanCard`/`removeAdminKanbanCard`).
2. `plugins/votecraft-savecraft-admin/` (WordPress) — server-side PHP only
   (`includes/class-firestore-client.php`), using the bot account's refresh token stored in
   `wp-config.php`. The browser-side wp-admin JS never touches Firestore directly, only this
   plugin's own REST routes.

A second, read-only surface (viewing SaveCraft accounts from wp-admin) was designed but is paused —
it needs a Cloud Function + dedicated IAM service account (`roles/firebaseauth.viewer`), which
requires moving this project off the free Spark plan onto Blaze. Full plan:
`/Users/lizpasekal/.claude/plans/can-we-separtarate-the-adaptive-breeze.md`.

---

## Auth Setup
- **Method:** Email + Password
- **Anonymous auth:** Enabled (used by JokeMaster for guest play)
- **No public profiles** — users share content with each other directly (Google Docs style), no public discovery

---

## Security Rules
See `firebase/firestore.rules` for the full rules file.

Key decisions:
- Curated collections are **public read** so SaveCraft can fetch without requiring users to sign in
- Curated collections have **no client writes** — content is managed via the Firebase console or seeder scripts
- JokeMaster data is **auth-gated** to the owning user

---

## Brand Strategy — Apps as Standalone Products

Each Votecraft.org app is designed to be experienced as a **fully standalone product**.
SaveCraft, for example, is intended to be published to the **Chrome Web Store** as a media
library app. Users who find it there have no reason to know it is part of a civic education
platform — and that's intentional.

**How users discover the ecosystem:**
The curated lists are the bridge. SaveCraft users who engage deeply with the curation
— Top 100 films, genre collections, etc. — will start to notice a distinctive point of view.
That curiosity ("who made this?") is the natural moment to surface the Votecraft connection.
Discovery happens through **taste**, not a brand introduction.

**Design principles:**
- No Votecraft branding inside SaveCraft's UI — the extension feels self-contained
- Users arriving via the Chrome Web Store see a media library app, nothing more
- At a natural moment (e.g., "sync saves across devices", "who curated this?"), the larger
  ecosystem is introduced — never forced
- Different audiences enter through different doors:
  - SaveCraft → media enthusiasts, general web users
  - JokeMaster → casual gamers
  - VoteCraft (the civic platform) → civically engaged users

**Firebase / auth implication:**
When an app prompts users to create an account, the flow uses Votecraft account infrastructure
but is framed around that app's own value — not "join Votecraft." One account works everywhere,
but branding stays local to each app. The Emporium (`votecraft.org/emporium/`) is for users
who actively want to explore the full ecosystem — opt-in, not the default entry point.

**Divergence for SaveCraft (decided directly with the user, current implementation):** SaveCraft
does *not* follow the "one shared account" model above. It has its own independent sign-up —
a SaveCraft account is a SaveCraft account, full stop, not secretly a Votecraft account under
different branding. The reasoning: a shared account, even invisibly branded, is still the same
account from day one — closer to "Votecraft in disguise" than "a standalone tool that happens to
connect later." A future "Connect to Votecraft" step (not yet built) will let a user *explicitly*
link their already-independent SaveCraft account to a Votecraft account, rather than the two
being the same account implicitly. If other apps adopt the shared-account model above, SaveCraft
should be treated as the deliberate exception, not a bug to "fix" into consistency.

---

## The Emporium — App Distribution (Future)
`votecraft.org/emporium/` is the central hub where people discover and get Votecraft apps
(SaveCraft, JokeMaster, Scavenger Tours, Power Plays, etc.).

**User experience design:**
- Each app feels **standalone** — users don't need to know about Votecraft to use it
- Apps work fully without an account (local storage, anonymous state)
- At a natural moment within each app, users are **softly prompted** to join the larger
  Votecraft ecosystem (e.g., "Save your progress across devices", "Share with friends")
- Signing up for one app creates a single Votecraft account that works everywhere

**Firebase role:**
- The `votecraft-789` project IS the ecosystem auth layer — one account, all apps
- Email + password auth is already in place; the Emporium page would link to each app
  and eventually host a unified sign-in/sign-up flow
- No separate auth per app — signing into SaveCraft and JokeMaster uses the same credentials

**Not started yet.** Document this vision here so Firebase architecture decisions
(single project, shared auth) are made with this future in mind.

---

## Cross-App Sharing (Future)
Goal: users can share saved lists between apps (e.g., a SaveCraft list shared with a friend,
or a VoteCraft issue list shared for collaboration). Planned approach:
- Firebase Auth as the identity layer (email+password, same account works across all apps)
- Firestore collection per feature: `savecraft_shares/{shareId}`, etc.
- Share links encode a Firestore doc ID, recipient signs in to claim

---

## Admin / Seeding
To add or update curated items in bulk:
1. Edit `curated_items` directly in the Firebase console, OR
2. Update `CURATED_ITEMS` in SaveCraft's `app/app.js` and re-run the seeder

**Seeder flow:**
1. Temporarily set Firestore rules to `allow write: if request.auth != null` for curated collections
2. Open `Chrome Extensions/savecraft/scripts/seed-firestore.html` in Chrome
3. Sign in → click Seed → wait for completion
4. Revert rules to `allow write: if false`
5. Users' 24hr cache clears automatically; or clear `savecraft_curated_data` from `chrome.storage.local`
