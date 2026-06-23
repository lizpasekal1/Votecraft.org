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
| **SaveCraft** | Chrome extension | Firestore (public curated library — read only) |
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
