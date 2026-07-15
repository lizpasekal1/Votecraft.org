# SaveCraft — Project Overview

SaveCraft is a Chrome extension that acts as a personal media library. Users save links to movies, shows, music, books, games, and other content they want to experience. Curated recommendations from Votecraft are surfaced alongside personal saves, and a Kanban board ("My Saves Queue") lets users track what they've watched, read, or listened to.

---

## Recent Additions (latest session)

This session generalized the Musician "creator has their own profile page" pattern to Book (authors), Movie (directors), Game (studios), and Show (creators) — the most-requested extension of the app's most successful design pattern — then spent most of the rest of the session hardening curated-genre sidebar navigation, which turned out to have several real bugs once four more categories started routing through it, plus a Kanban board layout fix and a new drag-to-reorder feature.

- **Creator profile pages extended to Book/Movie/Game/Show** (`render.js`, `detailModal.js`, `state.js`) — any Book author, Movie director, Show creator, or Game studio name is now a clickable link (on cards and in the detail modal) that navigates to a dedicated profile page listing everything by them, exactly like Musician already worked. `CREATOR_CARD_CATEGORY` (moved to `state.js` so both `render.js` and `detailModal.js` can share it) maps each curated "creator card" pseudo-category to the real category it files under: `{ Musician: 'Musician', 'Book Author': 'Book', 'Movie Director': 'Movie', 'Show Creator': 'Show', 'Game Studio': 'Game' }`.
- **332 new curated Firestore documents seeded**: 83 Book Author cards, 78 Movie Director cards, 89 Show Creator cards, 82 Game Studio cards — each `{id, title, url, imageUrl, notes (bio), genre: 'Top 100', category}`. Sourced externally per category:
  - **Movie director** — Wikidata property P57 (two-hop `wbsearchentities` → `Special:EntityData` → `wbgetentities` to resolve the entity reference to a name)
  - **Show creator** — same two-hop Wikidata pattern, property P170 (P57 on a TV series returns per-episode directors, not a single showrunner)
  - **Game studio** — Steam's `appdetails` endpoint (`developers` field), using the Steam app ID already embedded in each curated game's stored URL
  - **Bio/photo for all of the above** — Wikipedia REST summary API, same pattern `ensureItemWikipediaInfo` already used elsewhere, with manual verification-and-correction passes for cases where an automated keyword-filtered search matched the wrong person/company (documented in the code as a recurring failure mode worth watching for: a too-narrow keyword regex rejects a correct direct match and falls through to a wrong search-retry result)
  - Two standalone seeder tools in `scripts/`: `seed-book-authors.html` (83 docs) and `seed-creator-cards.html` (the other 249) — plain `fetch()` against the Firestore REST API + Firebase Auth REST API, no SDK, no build step. Both now have a **"Create Account"** button (not just Sign In) so seeding doesn't require an existing SaveCraft login.
- **Movie/Show/Game curated items have no creator field in Firestore at all** (unlike Book, whose curated title is `"Title — Author"` combined) — resolved externally and kept as **static in-app data** (`js/curatedCreatorLookup.js`, auto-generated) rather than rewriting 300+ existing production `curated_items` documents' title fields. Exports `CURATED_MOVIE_DIRECTOR`/`CURATED_SHOW_CREATOR`/`CURATED_GAME_STUDIO` (raw data) plus the shared helpers `splitCuratedTitleCreator()`, `getStaticCuratedCreator()`, and `SPLIT_TITLE_CREATOR_CATEGORIES` — imported by both `render.js` (rendering) and `storage.js` (the backfill migration below), which is why these live in their own dependency-free module rather than inside `render.js`.
- **Lead-director "…" indicator** — a co-directed movie's card byline shows the lead director's name followed by "…" (`item.authorHasMore`, display-only — the actual name used for the clickable link/navigation stays clean, so clicking it still correctly opens that director's own profile page).
- **New folders**: Movie → **Directors**; Show → **Creators**; Game → **Board Games**, **Console Games**, **Mobile Games**, **Game Companies** (Game had zero folders before this session).
- **Curated-genre sidebar navigation — several real bugs found and fixed**, all variations of the same root cause (a folder/page's `state.view` not staying prefixed `genre:...` while browsing a curated genre, which silently bounced the whole sidebar back out to "My SaveCraft" or the top-level genre picker):
  - Clicking **any** subfolder (not just the ones with their own curated bucket) while browsing a curated genre used to drop out of that genre entirely — now every subfolder computes a `curatedTarget` (its own dedicated bucket like Authors/Directors/Creators/Game Companies, or the full parent category for the handful of folders that represent "the whole category" — Books/Movies/TV Shows/Console Games/Musicians — or its own id as an inert placeholder for folders with no curated-specific data at all, like Videos/Podcasts/Webseries/Tutorials/Board Games/Mobile Games, which now correctly show **empty** instead of duplicating a sibling folder's content).
  - Only the folder actually clicked highlights now — several sibling folders (e.g. Movie's "Movies" and "Videos") can route to the exact same underlying view, which previously made them both light up as active; `state.activeCuratedFolderId` tracks the specific folder clicked, separate from the derived `state.view`.
  - Top-level category tabs (Books, Films, Games, Music, Shows) no longer show a count badge while browsing a curated genre — only the subfolders underneath do.
  - **Visiting an author/creator page from curated browsing no longer resets the sidebar.** `navigateToAuthor()` sets `state.view` to `author:<cat>:<name>`, which doesn't start with `genre:` — every sidebar mode/context decision used to read `state.view` directly, so clicking an author's name while browsing Top 100 bounced the sidebar back to the top-level genre picker under a wrong "My Saves" label. `renderSidebar()` now computes a `sidebarEffectiveView` that falls back to `state.authorReturnView` (already tracked, just previously unused for this) whenever on an author page, and uses it for every "which sidebar screen" decision while leaving the real `state.view` alone for `isActive` highlighting.
  - **Duplicate cards on author/director pages** — the same work is frequently curated separately for multiple genres (e.g. a movie in both "Top 100" and "Thriller", 20 such overlaps confirmed live), each its own Firestore doc with its own id. The author-page pull-in loop crosses every genre and was only deduping by id, so the same movie showed up twice under its director. Now also dedupes by title.
- **Data-quality fix: Music Albums were showing Musician cards.** A legacy `category: "Music"` Firestore bucket (101 docs, titles are artist names like "The Beatles" — a stale duplicate of the Musicians list, unrelated to real albums) was being merged into "Music Album" by `_CAT_NORMALIZE`'s `'Music': 'Music Album'` mapping. That mapping is removed — those legacy docs now land in an inert bucket nothing reads instead of leaking into Albums. (The remaining ~2,400 real `Music Album` docs under Top 100 are genuine albums but not an actual curated Top 100 shortlist — a separate, not-yet-addressed editorial gap.)
- **Backfill migration for already-saved items** (`storage.js`, `loadAll()`) — Book/Movie/Show/Game items saved before the above creator-resolution logic existed (or worked correctly) were stuck showing a raw combined title or no byline at all forever, since the creator-name resolution only ever ran once, at first-save time. A one-time backfill (same pattern as the pre-existing Music Album `.notes`→`.author` migration) now splits Book's combined title or fills in Movie/Show/Game's author from the static lookup, for any already-saved item still missing it.
- **`_CURATED_CACHE_VERSION` bumped 5 → 7** across the session's Firestore/normalization changes, forcing a fresh fetch instead of serving stale 24-hour-cached bucketing.
- **Kanban board layout fixed to fill the actual window height** (`kanban.css`) — `.kanban-board`/`.kanban-wrap` used a hardcoded `height: calc(100vh - 180px)` guess that fell short of the real available space, leaving the column divider lines and per-column scroll areas stopping short of the bottom of the window. Replaced with proper flexbox fill (`.grid-area:has(.kanban-wrap) { display: flex; flex-direction: column; overflow: hidden; }`, mirroring the existing `.grid-area:has(.dashboard-wrap)` pattern) — no more magic numbers. Column divider lines also lost their rounded top/bottom corners (`border-radius` removed from `.kanban-column`) for a cleaner straight line.
- **Cards can now be dragged up/down within a column to reorder them** (`kanban.js`) — dropping a card above/below another card inserts it at that exact spot (tracked via per-card `dragover`, not just the column-level one) and assigns every card in that column a fresh sequential `item.manualOrder`, switching that column to a new **"Custom order"** sort mode (also selectable from the existing per-column sort dropdown) so the manual order persists instead of being overridden by newest/oldest/A→Z on the next render. Cross-column drag (changing `queueStatus`) still works and now also respects drop position within the target column. The now-redundant standalone `updateQueueStatus()` export was removed (its only call site was the drop handler this replaced).

---

## Recent Additions (previous session)

This session had three halves: a cleanup pass on the previous session's work, a full rebuild of the browser-toolbar popup into a real wizard, and then a Kanban board expand/focus feature plus a batch of smaller fixes.

- **Kanban column expand/focus mode** (`js/kanban.js`, `css/kanban.css`) — each column now has a small circular button in its top-right corner (a "+", matching every column) that expands that one column to the full width of the board and removes the other three from the DOM entirely (not just hidden — this is also what disables cross-column drag-and-drop while expanded, since the other columns aren't valid drop targets anymore). The button on the expanded column turns into a purple "−"; clicking it again shrinks back to the normal 4-column board. While expanded, a pill-shaped format picker (styled like the existing "Categories" filter pill) offers five named layouts — **Two Column** (image on the left, notes/date shown), **Four Column** (denser, title+author only), **Large Card** (thumb on top, big), **Detail Card** (thumb on top, notes shown in full instead of clamped), **Simple Text** (no thumbnail, dense 2-column list) — each driving both a CSS grid density and a `renderKanbanCard(item, format)` content variant. None of this touches the normal 4-column board's cards, which still render exactly as before when no format is passed. The expanded/format choice is ephemeral (`state.kanbanExpandedCol`/`kanbanExpandedFormat`), resetting on every reload. (An earlier version of this button briefly opened the Add Item modal instead — abandoned in favor of the expand behavior before shipping.)
- **"Queue Kanban" sidebar link** (`js/render.js`) — a new row styled exactly like a category's folder row (same `.sidebar-subfolder` icon/indentation) sits nested under the sidebar's "Dashboard" entry, linking straight to the Kanban board (`state.view = 'kanban'`). The Dashboard row itself is now collapsible (arrow on the right, like a category — but no count badge), collapsed by default on every fresh load.
- **Markdown export** (`js/share.js`, alongside the existing CSV export in the Share dropdown) — `exportAsMarkdown()` downloads the current view as a `# SaveCraft Library` document, grouped into `## Category` sections (same order as the sidebar), each item as a `- [x]`/`- [ ]` checklist line linking its title to its URL with the saved date.
- **Kanban board's Categories filter dropdown now matches the sidebar** — it was showing raw storage values (`Web Links`, `Musician`, `Music Album`, ...); now uses `CAT_LABEL` for display text and excludes `Music Album`, same list/order/labels as the sidebar.
- **New "Shops" folder** under Websites, alongside Articles/Blogs/Website — a real seeded default folder with its own icon, so it also appears automatically in both the desktop Add Item modal's and the popup's folder-picker screens (both already read folders dynamically, no hardcoded lists to update).
- **Popup fixes**: fixed a real race condition where clicking "Open Library →" sometimes required two clicks — `chrome.runtime.sendMessage()` followed immediately by `window.close()` could close the popup before a cold-starting Manifest V3 service worker ever received the message; now `await`s the response first. Book's and Movie's folder-picker screens (Authors/Books, Movies/Videos) now stack vertically like the Musician/Music Album screen. The review screen's height is now sized to its actual content (`height: auto` + a precise `padding-bottom: 40px`) instead of a guessed fixed pixel value that left an unpredictable gap below the Save button depending on category/banner state.
- **Popup wizard visual polish pass** (`src/popup/`, on top of the rebuild below) — each wizard screen now shows the current category/tile group's name next to the back arrow in the brand purple (e.g. "Arts" on the folder screen, "Games" on the review screen), via a `modal-back-label` span populated by `setHeader()`'s new third argument. The folder-picker and Musician/Music-Album screens both got their header pushed down and enlarged, their bookmark icon dropped, and their tiles nudged up/tightened for better balance against the extra header height. The Musician/Music Album sub-choice specifically switched from a 2-column layout to two stacked, narrower, centered buttons. Each of these tweaks is scoped via a `screen-<name>` class toggled on `<body>` in `setScreen()` (`screen-folder`/`screen-music-choice`/`screen-review`), not global — the plain category tile screen is untouched.
- **Popup rebuilt from a single flat screen into a real multi-screen wizard** (`src/popup/`) — previously it was one screen (paste URL, pick a category from a hardcoded 6-item list, instant save). It's now `type="module"` and imports `CATEGORIES`/`CAT_LABEL`/`CAT_EMOJI` directly from `js/state.js` and `folderIconHtml`/`escapeHtml` from `js/utils.js` — the first time the popup shares code with the main app instead of duplicating it. Flow now mirrors the Add Item modal: category tile screen → Musician-vs-Music-Album sub-choice for the combined "Music" tile → folder-picker screen (reads `folder_*` keys straight from `chrome.storage.sync`, auto-skipped when a category has 0 or 1 folders) → a review screen with editable Title/Image URL/URL (previously saved instantly with no chance to fix anything). A real bug got fixed in the process: the old popup's category values (`"Movies"`, `"Books"`, `"Shows"`, `"Games"`, `"Memes"`, `"Music"`) never matched the real `CATEGORIES` strings at all, so anything saved from the popup before this rebuild silently never filed under its category tab — only visible in "All". After saving, the popup now asks **"Open Library →" or "Close"** instead of auto-closing after 1 second. Dark theme now syncs with the main app's saved `savecraft_theme` preference (was hardcoded to follow OS `prefers-color-scheme` before). The window uses exactly two fixed sizes (320px "compact" for tile-picker screens, 480px "tall" for the review screen) instead of resizing per screen.
- **Category icon/label polish** — Movie's icon replaced with a custom film-strip SVG, Visual Art's with a custom tag/label SVG (both pasted by hand, source files kept at `images/icons/` for reference); sidebar tab labels changed: Movie → "Films" (the `Movies`/`Videos` *subfolder* names were deliberately left alone), Web Links → "Websites" (was "Website"), Musician → "Music" (was "Musicians"). `Movie` was also reordered in `CATEGORIES` to sit directly after `Book`.
- **Dead-code cleanup pass** — removed the fully-orphaned YouTube promo-video lookup feature (`ensureArtistMusicVideoId()`, `YOUTUBE_API_KEY`, `ARTIST_VIDEO_CACHE_MISS_TTL`, `persistArtistVideoCache()`, `state.artistVideoCache`, `extractYoutubeVideoId()`) — verified fully unreferenced before deleting, not just assumed from memory. Extracted a shared `matchesPrimaryOrUnfoldered(item, category)` helper in `render.js`, replacing four copy-pasted inline predicates. Removed several dead CSS rules (`.detail-video-frame`, `.empty-state--sponsored`, `.sidebar-mode-tab--sponsored.active`, `.step1-category-tile--no-icon`) and a dead `state.view === 'sponsored'` placeholder block.
- **Dashboard hero collage fix** — thumbnails sometimes showed as empty squares or popped in late; fixed with `background: var(--surface)` on `.dash-hero-thumb` (fills the square while its image loads) and switching `loading="lazy"` → `loading="eager"` (the collage is always visible, so lazy-loading was actively counterproductive here).
- **Folder assignment actually works now.** Previously the only thing that ever set `item.folderId` was the Favorite star (see below) — every seeded default folder (Authors, Genres, etc.) was permanently empty. The Add wizard now has a dedicated folder-picker screen between category and search/review (skipped automatically when a category has 0 or exactly 1 folder — no pointless single-choice click); Edit mode has a folder `<select>`. Picking a folder is mandatory — there's no "Skip"/"No folder" option anymore.
- **"Primary folder" tab filtering** (`PRIMARY_FOLDER_ID` in `state.js`) — this is the big behavioral change. A top-level category tab (e.g. "Movies") now shows only that category's designated *primary* folder plus anything with no folder assigned — not everything in the category. Other folders (e.g. "Videos" under Movie, "Podcasts"/"Webseries" under Show) are excluded from the flat tab view unless opened directly. Clicking the primary folder itself shows the identical result as the tab. Nothing already saved "disappears" — un-foldered items count as primary automatically, no migration needed.
- **New default folders per category**, each with its own custom icon (`FOLDER_ICON` map in `state.js` + `folderIconHtml()` helper in `utils.js`; official/default folders can't be deleted from the sidebar — no × shown — only user-created ones can, with a confirm prompt): Movie → Movies (primary) + Videos; Show → TV Shows (primary, tab still labeled "Shows") + Podcasts + Webseries + Tutorials; Musician → Musicians (primary); Music Album → Music Albums (primary) + Playlists; Book → Books (primary) + Authors; Website → Website (primary) + Articles + Blogs; Visual Art (tab now labeled "Arts") → Dance, Comics, Painting, Sculpture, plus an "Add New Folder" quick-link specific to that screen.
- **"Website" is now a real category** — the old sidebar-only "Web Links" pseudo-category was promoted into a full `CATEGORIES` member, selectable in the Add wizard (first tile). No search source (manual title/URL entry, like Visual Art); no streaming-platform picker section.
- **New "News" category** — source-verified by design: the folder-picker is the *only* way to attribute a News item (no free URL paste), and when a folder has a `domain` field, `handleSaveItem()` validates the pasted URL's hostname actually matches before allowing the save. A starter set of curated wire-service folders (AP/Reuters/NPR/PBS) was built with this domain-validation infrastructure but then pulled back out pending a real editorial list — the mandatory-picker and domain-check code stays in place and reactivates automatically once folders exist again.
- **Musician + Music Album combined into one "Music" tile** in the Add wizard only — picking it shows a small Musician-vs-Album sub-choice screen, then continues into the exact same underlying flow as before. The two categories are **not** merged at the data level (still separate `item.category` values, separate search sources) — this is purely a wizard-entry convenience, since research showed a real merge would require touching a large amount of existing category-discriminator logic (badges, detail-modal rendering, CSS) for no functional gain.
- **Favorites decoupled from folders.** The old mechanism was itself a folder (`favorites-<category>`) and overwrote `item.folderId` when toggled — which actively conflicted with the new primary-folder system (favoriting something would silently move it out of whatever folder it was in). Favorite is now a plain `item.favorite` boolean, independent of `folderId`. Favorited items float to the top of every list, sorted alphabetically among themselves regardless of the active sort mode. A one-time migration in `storage.js` converts anyone who favorited something under the old mechanism.
- **Detail modal**: the "Promo Vid" YouTube toggle is removed from Musician items entirely (button, click handler, YouTube Data API lookup, search fallback — all gone; Music Album's "Album Art" toggle is untouched). A new manual **"YouTube URL"** field in the Add/Edit modal lets you paste a specific video link for any item; it now surfaces as a real "YouTube" link in the Web Links accordion (not a generic search) whenever set.
- **Sponsored Statement redesign** — the old static "WHY VOTECRAFT RECOMMENDS" text block at the bottom of the modal is gone. The "⚡ Your Sponsored Statement" badge now sits directly on the item image (same corner slot the old Promo Vid/Album Art toggle used), with the "why" explanation as a hover callout on the badge itself. Also fixed a real bug: the curated-Top-100 detection used to guess at hardcoded ID prefixes (wrong for at least Books); it now checks actual membership in `CURATED_ITEMS['Top 100'][item.category]`, so it's correct for every category automatically. The linked page (`src/sponsored/sponsored.html` + new `sponsored.js`) got a full visual redesign — brand-aligned purple (`#5B5BEF`, matching the app instead of a slightly-off shade), a wider/roomier layout, a product-mockup preview card, and reordered sections (Why it exists → Pricing → What's included → Get in touch). Also newly reachable from Settings dropdown → "Sponsored Statements".
- **"VoteCraft Picks"** (mobile header dropdown + sidebar "⚡ VC" tab) now links straight into the real curated Top 100 saves area instead of a "Coming soon" placeholder.
- **Reload now restores your actual last page** — the old "always force Dashboard on load" behavior was removed; every navigation path persists `state.view`, including Dashboard and Profile (previously deliberately excluded).
- **Curated Lists relabeled** — several Dashboard curated-genre cards now show sponsor/org-branded display names (e.g. "Top 100" → "Votecraft List", "Thriller" → "FairVote List") purely cosmetically via `CURATED_LIST_DISPLAY_NAMES`/`CURATED_LIST_COVER_OVERRIDES` in `dashboard.js`.
- **Accounts + Firestore sync** — SaveCraft has its own email/password sign-in (`js/auth.js`), independent from any shared Votecraft account. Every `persist*` call in `storage.js` dual-writes to Firestore when signed in.
- **Profile page** (`js/profile.js`) — Account card + Connections (Last.fm/Steam, both public-username-only, no OAuth)/Interests/Your Music Taste/Friends-placeholder. Still in demo mode — every entry point skips the sign-in gate.

---

## Loading the Extension in Chrome

The extension runs as an unpacked developer extension — it is not yet published to the Chrome Web Store.

1. Open Chrome and go to `chrome://extensions`
2. Toggle **Developer mode** ON (top-right corner)
3. Click **Load unpacked**
4. Navigate to and select `Votecraft.org/Chrome Extensions/Savecraft/` (the folder containing `manifest.json`)
5. The SaveCraft icon appears in the Chrome toolbar

**After editing any file**, click the **↺ refresh icon** on the extension card in `chrome://extensions` to reload the changes. You do NOT need to remove and re-add the extension — refresh is enough.

To open the full library from the extension: click the toolbar icon → click **Open Library →** in the popup.

---

## File Structure

```
Savecraft/
├── manifest.json                — Extension config (Manifest V3)
├── images/
│   ├── logos/                   — Source-attribution logos (Rolling Stone, Steam, NYT) used in Curated SaveCraft
│   └── icons/                   — Source SVGs for hand-pasted category icons (Movie, Visual Art), kept for reference; the actual icons are inlined in state.js's CAT_EMOJI
├── rules/
│   └── youtube_referer_rules.json — declarativeNetRequest rule for YouTube embed Referer header
├── scripts/                     — One-off admin tooling to seed/update Firestore curated data (not loaded by the extension)
├── src/
│   ├── background/
│   │   └── background.js        — Service worker: context menus, badge, Microlink image fetch
│   ├── content/
│   │   └── content.js           — Injected into every page; reads og:image for right-click saves
│   ├── popup/
│   │   ├── popup.html           — Quick-save wizard (shown when clicking toolbar icon); mirrors the Add Item modal's flow
│   │   ├── popup.css
│   │   └── popup.js             — ES module; imports category config + helpers from src/app/js/state.js and utils.js
│   ├── sponsored/
│   │   ├── sponsored.html       — Standalone "Sponsored Statement" page linked from curated Top 100 detail modals + the Settings dropdown
│   │   └── sponsored.js         — External script (extension-page CSP blocks inline <script>) — sets the "SaveCraft" wordmark link's href
│   └── app/
│       ├── index.html           — Full library page (opens as a new tab); loads js/main.js as an ES module + the css/ stylesheets
│       ├── js/                  — Library logic, split into ES modules (see below)
│       └── css/                 — Library styles, split by feature area (see below)
└── Documentation/
    ├── savecraft-overview.md    — This file
    ├── session-context.md       — Technical reference for AI assistants
    └── savecraft_planning.md    — Original Phase 1 planning doc (historical)
```

### `src/app/js/` modules

The library used to be one ~3,700-line `app.js`. It's now split into 16 ES modules, loaded via `<script type="module" src="js/main.js">` in `index.html`. Modules import/export between each other (some circularly — safe under ES modules since nothing is called at module-evaluation time, only from inside functions):

| Module | Responsibility |
|--------|-----------------|
| `state.js` | Shared `state` object + static constants (`CATEGORIES`, `CAT_LABEL`, `CAT_EMOJI`, `CATEGORY_PLATFORMS`, `CREATOR_CARD_CATEGORY`, etc.) |
| `storage.js` | All `persist*`/`remove*` functions, `loadAll()` (incl. one-time backfill migrations), Firestore curated-data loading (`_loadCuratedFromFirestore`, `initCuratedItems`), Firestore dual-write helpers for the account-sync feature |
| `utils.js` | Pure helpers: `escapeHtml`, `catClass`, `debounce`, `formatTrackDuration`, `patchCardImage`, etc. |
| `api.js` | External network calls: iTunes, Open Library, Steam, Wikipedia, MusicBrainz/Wikidata, YouTube, Last.fm, Steam Web API (unset API key constants live here) |
| `auth.js` | Email/password auth via the Firebase Auth REST API — no SDK, independent from any shared Votecraft account |
| `authors.js` | Author/musician profile CRUD, navigation, album-metadata backfill |
| `curatedCreatorLookup.js` | Auto-generated static data: curated Top 100 Movie/Show/Game title → director/creator/studio name (no dependencies — Firestore has no creator field for these, unlike Book's combined title), plus the shared `splitCuratedTitleCreator()`/`getStaticCuratedCreator()` helpers, imported by both `render.js` and `storage.js` |
| `render.js` | `renderSidebar`, `renderGrid`, `renderCard`, `renderAuthorPage`, curated-image fetch helpers |
| `kanban.js` | Kanban board rendering, drag-and-drop (cross-column + within-column reorder) — `KANBAN_DEMO`/`KANBAN_COLUMNS` exported for reuse by the Dashboard |
| `detailModal.js` | The item detail modal — largest module, all accordions live here |
| `addEditModal.js` | Add/Edit item modal — the 3-screen add wizard (category → search → review) plus the single-page Edit form |
| `fetchAlbumsModal.js` | Fetch Albums (bulk iTunes import) modal |
| `dashboard.js` | The Dashboard home page — hero collage + 4 widget cards (see "Dashboard (Home Page)" below) |
| `profile.js` | The Profile page — account info, Connections (Last.fm/Steam/Instagram), Interests, Your Music Taste, Friends |
| `share.js` | Share modal, CSV export, Markdown export |
| `main.js` | Entry point — search, sort, theme, sidebar collapse, mobile sidebar, `init()`, all DOMContentLoaded event wiring |

### `scripts/` (admin tooling, not loaded by the extension)

One-off HTML tools for seeding curated Firestore data — plain `fetch()` against the Firestore REST API + Firebase Auth REST API, no SDK, no build step. Each has a Sign In *and* Create Account button, so seeding doesn't require an existing SaveCraft login. Require the `curated_items` Firestore rule to temporarily allow `if request.auth != null` (revert to `if false` after running). Notable ones: `seed-book-authors.html` (83 Book Author docs), `seed-creator-cards.html` (249 Movie Director/Show Creator/Game Studio docs combined).

### `src/app/css/` stylesheets

Split along the same lines from the original `app.css`, loaded as separate `<link>` tags in a fixed order (order matters — later files can override earlier ones): `base.css` (reset, theme variables, header), `sidebar.css` (includes the collapsible desktop rail), `cards.css` (grid, cards, author pages), `detailModal.css`, `addEditModal.css`, `fetchAlbumsModal.css`, `kanban.css`, `dashboard.css`, `profile.css` (Profile page + its Connect Last.fm/Steam modals), `misc.css` (share modal, scrollbar, mobile responsive overrides).

The original monolithic `app.js`/`app.css` are still present in `src/app/` as an unused backup but are no longer loaded by anything — safe to delete once the module split has been confirmed working via a real (non-headless) Chrome smoke test.

---

## Architecture

**Runtime:** Chrome Extension, Manifest V3. No bundler — plain HTML/CSS/JS.

**Storage:**
- `chrome.storage.sync` — user's personal saves, folders, authors, settings, Kanban config (syncs across the user's Chrome devices automatically, up to ~100KB total)
- `chrome.storage.local` — curated item cache (larger, device-only; 24-hour TTL)
- Firestore (read-only at runtime) — curated item data fetched at startup via REST from the `curated_items` collection in project `votecraft-789`

**No build step.** Editing a `.js` or `.css` file and refreshing the extension in `chrome://extensions` is all that's needed to see changes.

---

## Categories

Categories use **singular names** in storage and the Add Item dropdown, and **plural names** (mostly) in the sidebar:

| Storage / dropdown value | Sidebar label | Primary folder |
|--------------------------|---------------|-----------------|
| Web Links | Websites | Website |
| Visual Art | Arts | *(none — Dance/Comics/Painting/Sculpture are all equal, non-primary folders)* |
| Book | Books | Books |
| Movie | Films | Movies |
| Game | Games | *(none)* |
| News | News | *(none currently — see Recent Additions)* |
| Musician | Music | Musicians |
| Music Album | *(hidden — accessed via subfolder)* | Music Albums |
| Show | Shows | TV Shows |

`CATEGORIES`' order (`state.js`) directly drives both the sidebar and the Add-wizard tile grid order — that's why the table above is in that order, not alphabetical.

The `Music Album` category is not shown as a top-level sidebar entry. Instead, a permanent **Music Albums** subfolder appears under **Musicians** in the sidebar. This subfolder also works in Curated SaveCraft mode, navigating to the curated music album list for the selected genre.

Beyond each category's primary folder, several categories also have a **creator-card folder** — a non-primary subfolder that doubles as an entry point into a curated "creator card" bucket when browsing a curated genre (see "Author / Artist Profile Pages" below): Book → **Authors**, Movie → **Directors**, Show → **Creators**, Game → **Game Companies**. Game additionally has **Board Games**/**Console Games**/**Mobile Games** (its first-ever folders besides Game Companies) — of these, only Console Games maps to the full curated Games list (Top 100 games are all console/PC titles); Board Games and Mobile Games correctly show empty while browsing a curated genre, since there's no curated data for those types yet.

**`Web Links`** is a real `CATEGORIES` member now (promoted from a sidebar-only pseudo-category), shown as **Website** everywhere — sidebar, grid title, and Add-wizard tile all read from the same `CAT_LABEL['Web Links']` value now, no more special-cased "Webpages" text.

A category's **primary folder** (`PRIMARY_FOLDER_ID` in `state.js`, keyed by category → the seeded folder's id) is what its top-level tab actually filters to — see "Primary folder tab filtering" in Recent Additions above. Categories with no entry (Game, News currently, Visual Art) show every item in the category unfiltered, same as before this session.

---

## Key Features

### Quick-Save Popup
Clicking the toolbar icon opens a small wizard-style popup (`src/popup/`) mirroring the Add Item modal: category tile screen (imports `CATEGORIES`/`CAT_LABEL`/`CAT_EMOJI` straight from `js/state.js`) → Musician-vs-Music-Album sub-choice for the combined "Music" tile → folder-picker screen (auto-skipped when the category has 0 or 1 folders) → a review screen with editable Title/Image URL/URL, pre-filled from the current tab (title, URL, and an auto-fetched `og:image` via the content script or Microlink fallback). After saving, it asks **"Open Library →"** or **"Close"** rather than auto-closing. Matches the main app's dark/light theme automatically. Fixed at two sizes — compact for the tile-picker screens, taller for the review screen — never freely resizing mid-navigation.

### Right-Click Context Menu
Right-clicking any page or link shows **Save to SaveCraft → [category]**. The service worker (`background.js`) reads `og:image` from the page via the content script and saves the item automatically.

### Full Library (`src/app/index.html`)
Opens as a new tab. Contains:
- **Left sidebar** — category navigation plus a "My Saves Queue" entry that switches to the Kanban view. A collapsible "Dashboard" row (arrow on the right, like a category, collapsed by default) reveals a "Queue Kanban" link straight to the board. Musicians has a permanent Music Albums subfolder. Collapsible on desktop to a 64px icon-only rail (toggle button in the sidebar header, top-left) — collapse state persists across reloads via `chrome.storage.sync`. The mobile drawer is unaffected (full-width overlay, unchanged).
- **Dashboard (Home)** — the persistent landing page shown on every app open; see its own section below
- **Main grid** — responsive card grid of saved items with cover images, filtered by the selected category/search
- **Curated SaveCraft** — a separate sidebar mode surfacing Votecraft-curated recommendations from Firestore, organized by genre and category
- **Kanban board** — "My Saves Queue" view with four columns: In Queue, In Progress, My Review, Done; see its own section below for the column expand/focus mode

### Dashboard (Home Page)
`js/dashboard.js` + `css/dashboard.css`. A persistent home page — the first thing shown on every app open (`main.js`'s `init()` forces `state.view = 'dashboard'` before the first render, regardless of whatever view was last active; the real last-active view stays saved in `chrome.storage.sync` untouched, so it's still there once the user navigates away from the dashboard). Reachable at any time via the sidebar's "🏠 Home" mode-tab (mobile drawer) or the "🏠 Home" entry at the top of the desktop hamburger menu (`#my-options-dropdown`).

- **Hero collage** — a time-of-day greeting ("Good morning"/"afternoon"/"evening"/"night") over an ambient, auto-scrolling horizontal strip of up to 24 rotated cover-art thumbnails, pulled from the user's own saved items (falling back to curated Top 100 Musician/Music Album art if the library has fewer than 8 images). Pure CSS marquee (`@keyframes`, track duplicated once for a seamless loop), respects `prefers-reduced-motion`. No boxed/card background — the fade at the collage edges and behind the greeting text blends into the actual page background color, not a surface color.
- **Continue Your Queue** — a scaled-down peek at the real Kanban board: the same 4 columns/order/labels, laid out 2×2, each showing up to 2 mini cards (thumbnail + title) with a "+N more" indicator. Clicking a mini card opens its detail modal directly; "Open Board →" navigates to the real board. Shows the same demo card (`KANBAN_DEMO()`, exported from `kanban.js` for reuse here) the real board shows when there's nothing queued yet.
- **Favorites Spotlight** — an auto-rotating slideshow (prev/next arrows, dot indicators, pause-on-hover, ~4.5s auto-advance) cycling through every item favorited in *any* category (a new aggregator, `getAllFavoriteItems()`, walks every "Favorites" folder — no existing helper did this across categories). Falls back to curated Top 100 Musician/Music Album picks tagged "✨ Demo · Top 100" when the user has no favorites yet. Clicking the active slide opens its detail modal.
- **Curated Lists** — a horizontal strip of `CURATED_GENRES` chips (Top 100, Jazz, Classic, Fantasy, etc.), styled with the same glossy `.cat-icon` chip used in the sidebar. Clicking one navigates into the existing curated genre-landing route — fully functional, no new routing.
- **Profile** — a decorative placeholder only (generic avatar, "Your Library", "Profile customization coming soon"). No real computed stats — there's no user-identity system to back it, and the Settings → Profile button elsewhere in the app is likewise a no-op today.

All 4 widget cards stretch to equal height and fill the available vertical space down to a bottom margin matching the top margin above the hero (`.dashboard-wrap` fills `.grid-area`'s content-box height; both share the same 24px padding by construction, not a hardcoded value).

### Kanban Board ("My Saves Queue")
`js/kanban.js` + `css/kanban.css`. Four columns — Queue, In Progress, My Notes, Archive (`KANBAN_COLUMNS`) — each holding items with a matching `item.queueStatus`. Cards support drag-and-drop between columns, a per-column sort dropdown (Newest/Oldest/A→Z/Z→A/**Custom order**, persisted in `state.kanbanSort`), and a Categories filter pill (matches the sidebar's labels/order exactly, excludes Music Album).

**Layout fills the actual window height** — `.kanban-board`/`.kanban-wrap` use flexbox (`flex: 1; min-height: 0;`) to fill whatever space `.grid-area` actually has left below the toolbar row, with `.grid-area:has(.kanban-wrap) { overflow: hidden; }` (mirroring the Dashboard's `:has(.dashboard-wrap)` pattern) so the page itself never scrolls — only the individual columns do. Column divider lines (`.kanban-column`'s `border-right`) have no rounded corners, so they run as a clean straight line all the way to the bottom.

**Drag-to-reorder within a column** — dropping a card above/below another card (tracked via a `dragover` listener on each `.kcard`, not just the column container, computing before/after from the cursor's Y position against the hovered card's midpoint) inserts it at that exact spot rather than always appending to the end. Every card in the target column then gets a fresh sequential `item.manualOrder`, and that column's sort mode switches to **"Custom order"** — otherwise the manual position would just get overridden by whatever sort (newest/oldest/A→Z) was active. Cross-column drops (changing `item.queueStatus`) respect drop position the same way. A `.kcard--drop-before`/`.kcard--drop-after` box-shadow shows the insertion point live while dragging.

**Column expand/focus mode** — every column has a small circular button in its top-right corner:
- Normal state: a plain "+". Clicking it expands that column to the full width of the board and removes the other three columns from the render entirely — not just visually hidden, actually absent from the DOM, which is also what disables drag-and-drop while expanded (the other columns aren't valid drop targets anymore; cards render with `draggable="false"`).
- Expanded state: the same button turns into a purple "−" (`.kanban-expand-btn--active`); clicking it again collapses back to the normal 4-column board.
- While expanded, a pill-shaped **format picker** (visually matching the "Categories" filter pill, positioned just left of the expand/collapse button) offers five layouts, each combining a grid density with a card content style:

| Format | Layout | Card shows |
|--------|--------|------------|
| Two Column | 2 per row | Image on the left (row layout), title, author, badge, notes/summary snippet, saved date |
| Four Column | 4 per row | Denser row layout — title + author only, no notes/date |
| Large Card | 1-2 per row | Thumb on top, big, longer notes/summary snippet, saved date |
| Detail Card | 2 per row | Thumb on top, notes/summary shown **in full** (not clamped) |
| Simple Text | 2 per row | No thumbnail — just the title as a dense text row |

`renderKanbanCard(item, format)` — passing no `format` renders the exact same card the 4-column board has always shown (this code path is untouched by the whole feature). The expanded column and format choice (`state.kanbanExpandedCol`/`state.kanbanExpandedFormat`) are ephemeral — never written to `chrome.storage.sync`, so they reset to the normal board on every reload.

### Author / Artist / Director / Studio / Creator Profile Pages
Every author/director/studio/creator name on a card or in a detail modal is a clickable link (`CREATOR_CARD_CATEGORY` in `state.js`, extended this session from Musician-only to Book/Movie/Show/Game). Clicking it navigates to a dedicated **profile page** for that person/studio within that category:

- **Profile header** — photo, name, bio, website link. Bio/photo enrichment (like Musician's) is not yet built for the new categories — the header shows a plain name until that's added; the curated "creator card" itself (in the Authors/Directors/Creators/Game Companies folder) already has bio/photo, just not yet copied onto this stub.
- **Works grid** — all saved items by that person in that category. For **Musician** profiles, Music Album items by the same artist are also shown — including curated albums from Firestore where the artist name matches. For Book/Movie/Show/Game, curated items across every genre are pulled in too (a director's page shows their movies from Top 100 *and* Thriller *and* any other genre they're curated under), deduped by title since the same work is frequently curated separately per genre.
- Author profiles are stored in `chrome.storage.sync` under keys `author_<id>`
- Navigating to an author auto-creates a stub profile if one doesn't exist yet
- The URL view format is `author:<category>:<name>` (e.g. `author:Musician:Gorillaz`, `author:Movie:Bong Joon-ho`)
- Visiting one of these pages while browsing a curated genre keeps the sidebar showing that genre's category tree (via `state.authorReturnView`) instead of resetting to the top-level genre picker — see `session-context.md`'s Sidebar Structure section for the mechanism.

### Auto-Save Musician
When a user queues or saves any **Music Album** item for the first time, the artist is automatically added to their **Musicians** saves. The `autoSaveMusician()` function pulls the artist's iTunes URL and cover art from the curated Firestore data if available.

The reverse direction also happens automatically: when a brand-new **Musician** is added via the Add modal (see below), `autoImportMusicianAlbums()` fetches their real full-length albums from iTunes in the background and saves them as Music Album items — excluding singles/EPs and anything not attributed to them as the primary artist. Fire-and-forget; the modal closes immediately and the albums populate a moment later.

### Fetch Albums (iTunes Integration)
On a **Musician** author profile page, a **Fetch Albums** button queries the iTunes Search API and presents a selectable list of that artist's albums to bulk-import as Music Album items.

**Fetch Albums modal controls:**
- **Exact artist / Any mention** toggle — filters results to albums where the primary artist exactly matches, vs. any album that mentions the name (features, collaborations)
- **Include singles** checkbox — unchecked by default; check to also show singles and EPs. Singles are detected by title pattern (`- Single`, `- EP`) since iTunes doesn't set `collectionType` reliably.
- **Deselect all / Select all** link — bulk-toggle all checkboxes
- Albums already saved are shown faded and disabled ("Already saved")
- Each imported album is created as a `Music Album` item with cover art (600×600), iTunes URL, and genre (stored in Notes)

### Curated SaveCraft
A separate browsing mode (toggled via the sidebar options menu) that surfaces Votecraft-curated recommendations from Firestore:

- **Genre picker** — genres like Top 100, Classic, Jazz, Pop, etc.
- **Category drilldown** — clicking a genre shows categories; clicking a category shows curated items
- **Musicians** — 100 top artists (from iTunes charts), each card's name links to their author profile page
- **Music Albums** — a `Music Album`-category Firestore bucket under Top 100 (~2,400 docs), each showing the artist name as a clickable link; the Music Albums subfolder under Musicians navigates to this view. **Not currently a genuine curated Top 100 shortlist** — it's bulk auto-synced album metadata, not a hand-picked list; a real editorial pass is still needed (see Recent Additions' data-quality fix for a related bug that was found and fixed here — a legacy mislabeled category was leaking Musician-name cards into this bucket).
- **Book Authors / Movie Directors / Show Creators / Game Studios** — curated "creator card" buckets (83/78/89/82 entries respectively), reached via each category's Authors/Directors/Creators/Game Companies folder. Same idea as Musicians, generalized this session — see "Recent Additions" for how the creator names were sourced (Wikidata/Steam) and why they're kept as static in-app data rather than stored in Firestore for Movie/Show/Game.
- **Clicking a creator card** opens the detail popup; clicking the name navigates to their profile
- **Curated cache** — data is cached in `chrome.storage.local` for 24 hours; cache is versioned so bumping `_CURATED_CACHE_VERSION` in `js/storage.js` forces a fresh fetch (currently `7`)
- **Top 100 lists** — the "Top 100" genre shows a source-attribution logo next to the section title, indicating which outlet curated that list: Rolling Stone (Musicians, Shows, Books), The New York Times (Movies), Steam (Games). Hovering any logo shows a tooltip explaining the attribution. Curated categories are keyed by their singular `CATEGORIES` name internally (e.g. `genre:Top 100:Musician`, not `genre:Top 100:Music`) — this tripped up the logo-matching logic once before, so keep that in mind if extending it.
- **Sidebar navigation while browsing a curated genre** — every subfolder click stays inside the current genre (routing to a dedicated creator bucket, the full parent category, or an inert empty state — see Recent Additions), only the actually-clicked folder highlights, and visiting an author/creator page no longer resets the sidebar. See `session-context.md`'s Sidebar Structure section for the full mechanism (`sidebarEffectiveView`, `state.activeCuratedFolderId`, `FOLDER_SHOWS_FULL_CURATED_CATEGORY`).

### Item Detail Modal
Clicking a card opens a detail modal. **Every category now shares the same accordion-based layout** (this used to be Musician/Music-Album-only, but was extended to all categories):

- **Image** — 16:9 cropped cover (object-fit: cover). Music Albums show an "Album Art ▶" button that opens the full uncropped cover art in a lightbox. Musicians no longer have a "Promo Vid" toggle — it was removed this session (see Recent Additions); a curated Top 100 item of any category instead shows the "⚡ Your Sponsored Statement" badge in that same corner.
- **Header overlay** — an "Official Website" pill overlays the top of the image for every category. For Musician/Music Album it resolves via MusicBrainz → Wikidata (cached per artist); every other category falls back to the item's own saved `url`.
- **Title area** — Musicians show their name with a clickable arrow to their author page. Music Albums show a bold "Artist | Year" line (in the brand purple) above the album title. Other categories show a plain title (no arrow, not a link).
- **Bookmark / Favorite** — the save/bookmark icon lives inside the "Add to Queue" button (for every category now); the top-right corner is a Favorite star instead. Favoriting is now a plain `item.favorite` boolean (see Recent Additions) — it no longer touches `item.folderId` or creates a "Favorites" folder.
- **Accordion rows** (icon + label + chevron, mutually exclusive — opening one closes the others):
  - **My Notes** — live-editable textarea, debounced auto-save, shown for every category.
  - Second row, category-dependent: **Albums** (Musician only — the artist's known albums, capped at 5 with a "See all →" link to their profile) / **Song List** (Music Album only — the album's tracks, lazily fetched via the iTunes lookup API on first expand using the item's `collectionId`; a one-time backfill resolves `collectionId`/`year` for older items that predate this field) / **Summary** (Book, Show, Movie, Game — shows `item.summary`, auto-backfilled from Wikipedia if missing; see below) / **Placeholder** (Visual Art — reserved, intentionally empty for now).
  - **Web Links** — same accordion treatment for every category; now also shows a real "YouTube" link (the item's own saved `youtubeUrl`, not a search) whenever one's set, regardless of category.
- **Add to Queue** — a standalone pill button below the accordion stack for every category (rather than sharing a header row with Web Links, as it used to for non-music categories).

**Wikipedia fallback (Book/Show/Movie/Game only)** — when one of these items is missing an image or summary, `ensureItemWikipediaInfo(title, category)` looks the title up on Wikipedia, validated against category-specific keywords (e.g. a Movie result must mention "film"/"movie" in its description) with a category-biased search retry if the direct title match fails or is a disambiguation page — this stops a generic title (e.g. a movie called "Up") from pulling in the wrong same-named article. Results are cached indefinitely in `chrome.storage.local` (`state.itemWikiCache`), keyed by `category:title`. Note: Wikipedia serves non-free poster/cover art at reduced resolution for fair-use reasons, so fetched images are sometimes lower quality than the original source — this is a known limitation, not a bug.

For curated albums, the artist name is a clickable link in the title area (unless already on that artist's own page).

### Add / Edit Modal
**Add is now up to a 4-screen wizard** (`js/addEditModal.js`), each screen skipped automatically when there's nothing to choose:

1. **Category screen** — "What are you adding to?" plus a category tile grid (icon + label, same icons as the sidebar). Musician and Music Album are combined into one **"Music"** tile here — picking it shows a small Musician-vs-Album sub-choice screen before continuing, but doesn't change which underlying category the item ends up as. No back icon here (nothing to go back to).
2. **Folder-picker screen** — shown only when the chosen category has 2+ folders (0 or 1 auto-skips straight through, since there's no real choice to make). Picking a folder is mandatory — there is no "Skip"/"No folder" tile. For News specifically, this doubles as source verification (see below).
3. **Search screen** — its own screen, header shows the selected category name. Live-typing (debounced ~500ms) searches a category-appropriate free API and shows a results dropdown (thumbnail + title + meta line). A "Can't find it? Add '...' manually" link/Enter-to-continue lets the user skip straight to the review screen with just a typed title if nothing matches. Visual Art ("Arts") and Website have no search source — their tile jumps straight to the review screen.
4. **Review screen** (also used standalone for Edit — no search/folder steps there, folder reassignment is a `<select>` instead) — pre-filled Title/Author (or a single "Name"/"Title" field for author-less categories — see below), a small auto-fetched image preview, Summary, My Notes, Platforms, Image URL, **YouTube URL** (new — a specific video link, separate from the platform search links), and URL (optional — Title is the only required field).

A single back icon (top-left of the modal, mirroring the X close button top-right) steps back exactly one screen at a time through whichever of the above actually appeared for that category. Stepping back is non-destructive: the search screen's term/results are left exactly as the user left them. There's no bottom Cancel button anymore — the X icon, clicking outside, or Escape all close the modal.

**Per-category search source** (all free, no API key):
| Category | Source | Notes |
|----------|--------|-------|
| Musician | iTunes (`entity=musicArtist`) | No artwork on this entity — photo/bio arrive via the existing Wikipedia enrichment once a title is chosen |
| Music Album | iTunes (`entity=album`) | Full art/artist/year/URL directly from the search result |
| Show | iTunes (`entity=tvSeason`) | Deduped by `artistId` to one row per show, not per season |
| Book | Open Library (`openlibrary.org/search.json`) | Cover art via `covers.openlibrary.org` |
| Game | Steam (`store.steampowered.com/api/storesearch`) | Cover art via `cdn.akamai.steamstatic.com` |
| Movie | Wikipedia (`generator=search`) | iTunes's movie search is dead — verified live, 0 results for well-known titles since Apple moved movie purchases to the Apple TV app |
| Visual Art ("Arts") | *(none)* | Manual entry only |
| Website | *(none)* | Manual entry only |
| News | *(none)* | Manual entry, but gated: the pasted URL's hostname must match the chosen folder's `domain` field, or the save is blocked with an inline error — see Recent Additions |

Once a Review screen loads, background enrichment (`ensureArtistWikipediaInfo`/`ensureItemWikipediaInfo`, both already used elsewhere in the app) fills in Summary and upgrades the image a moment later, without blocking the screen from showing instantly.

**Title/Author field**: only Music Album (artist) and Book (author) show a separate Author field — every other category collapses to a single field, labeled "Name" for Musician and "Title" everywhere else, since a permanently-empty Author box was confusing. This is purely visual (the underlying field is never cleared programmatically), so editing an older item that happens to have Author data set doesn't silently lose it.

Edit (`openEditModal`) always opens directly to the review-screen layout — no category grid, no search/folder-picker step, no back icon.

### Search & Sort
The search bar and sort dropdown in the header filter both the grid view and the Kanban board in real time. Sort options: Newest/Oldest first (by save date), A → Z / Z → A (title), and Release Date (Newest/Oldest) — the latter two sort by an item's `year` field (populated for Music Albums via Fetch Albums import or the auto-backfill).

---

## Data Model

### Personal Item (`item_<id>`)
```js
{
  id: string,
  url: string | null,
  title: string | null,
  author: string | null,
  summary: string | null,
  notes: string | null,
  imageUrl: string | null,
  youtubeUrl: string | null, // new — a specific saved video link, shown in the Web Links accordion
  category: string,        // singular: 'Book', 'Musician', 'Music Album', etc.
  platforms: string[] | null,
  savedAt: number,
  queueStatus: 'in-queue' | 'in-progress' | 'my-review' | 'done' | null,
  folderId: string | null, // null now means "counts as the category's primary folder", not "unfiled" — see PRIMARY_FOLDER_ID
  favorite: boolean,       // new — replaces the old folder-based Favorites mechanism entirely
  genre: string | null,    // Music Album only; not currently rendered anywhere
  year: string | null,     // Music Album only; 4-digit release year
  collectionId: number | null, // Music Album only; iTunes collection ID, used to fetch the Song List
  authorHasMore: boolean | undefined, // Movie only — true for a co-directed movie, shows "…" after the lead director's name on the card/byline (display-only, never part of the name used for navigation)
  manualOrder: number | undefined,    // Kanban only — sequential position within its column once the user has dragged it; only meaningful when that column's state.kanbanSort is 'manual' ("Custom order")
}
```

### Author Profile (`author_<id>`)
```js
{
  id: string,
  name: string,
  category: string,        // e.g. 'Musician', 'Book'
  bio: string | null,
  imageUrl: string | null,
  websiteUrl: string | null,
  savedAt: number,
}
```

### Folder (`folder_<id>`)
```js
{
  id: string,
  name: string,
  parentCategory: string,  // e.g. 'Music Album'
  domain: string | null,   // News folders only — the URL a saved item's link must match
  paywalled: boolean | undefined, // News folders only — shown as a "Paywalled" badge in the picker
}
```
Default/official folder ids are always prefixed `default-` (e.g. `default-movies-videos`) — the sidebar delete-button and the Add-wizard "no icon fallback" logic both key off that prefix to distinguish them from user-created folders (which use a `Date.now()` timestamp id).

### Curated Item (Firestore `curated_items` document)
```js
{
  id: string,          // 'itunes_<collectionId>' or 'artist_itunes_<artistId>' or 'cur-*' or 'top-100-<kind>-<slug>'
  title: string,
  category: string,    // stored as plural in Firestore ('Movies', 'Music Album'), normalized on load —
                        // 'Book Author'/'Movie Director'/'Show Creator'/'Game Studio' are stored exactly
                        // as-is (curated-only pseudo-categories, not real CATEGORIES members)
  genre: string,       // e.g. 'Top 100', 'Classic', 'Jazz'
  url: string | null,
  imageUrl: string | null,
  notes: string | null, // for Music Album entries: the artist name; for the four creator pseudo-categories: their bio
}
```
Book's curated `.title` combines `"Title — Author"` in one field (split apart at load time — see `splitCuratedTitleCreator()` in `curatedCreatorLookup.js`); Movie/Show/Game curated items have no creator anywhere in Firestore at all (plain title, real description in `.notes`) — their creator name comes from the static `curatedCreatorLookup.js` data instead, keyed by title.

### Other `chrome.storage.sync` keys
| Key | Contents |
|-----|----------|
| `savecraft_view` | Last active view (restored on open) |
| `savecraft_kanban_sort` | Per-column sort preferences |
| `savecraft_kanban_lists` | Kanban column definitions |
| `savecraft_hidden_curated` | Array of curated IDs the user has dismissed |
| `savecraft_curated_overrides` | User edits to curated items (notes, etc.) |

---

## External APIs

| API | Used for | Auth required |
|-----|----------|---------------|
| iTunes Search/Lookup API (`itunes.apple.com`) | Fetch Albums modal, Add modal search (Musician/Music Album/Show), curated data population, artist photo fallback, album year/collectionId backfill, Song List track lookup | None — free, public |
| Open Library (`openlibrary.org`, `covers.openlibrary.org`) | Add modal search for Book | None — free, public |
| Steam Store (`store.steampowered.com`, `cdn.akamai.steamstatic.com`) | Add modal search for Game | None — free, public |
| Microlink (`api.microlink.io`) | Fetch og:image for right-click saves | None |
| Firestore REST (`firestore.googleapis.com`) | Curated item data (read-only at runtime) | None for reads; Firebase Auth required for writes |
| MusicBrainz (`musicbrainz.org`) → Wikidata (`www.wikidata.org`) | Resolving a Musician's official website | None — free, public |
| Wikipedia (`en.wikipedia.org`) | Add modal search for Movie; artist bio/photo fallback (Musician); image/summary fallback for Book, Show, Movie, Game items missing one | None — free, public |
| YouTube Data API v3 (`www.googleapis.com`) | Promo Vid search (Musician modal), filtered to the Music category | API key (`YOUTUBE_API_KEY` in `js/api.js`) — falls back to opening a YouTube search in a new tab if unset |

All of the above are declared in `manifest.json` under `host_permissions`. YouTube video embeds additionally rely on a `declarativeNetRequestWithHostAccess` rule (`rules/youtube_referer_rules.json`) that sets the `Referer` header the embedded player requires, since extension pages don't send one natively.

**Note:** iTunes's classic movie search (`entity=movie`) is dead — Apple sunset movie purchases from this API when they moved to the Apple TV app. Verified live: 0 results for well-known titles across every entity/media parameter combination. There's no working free, structured movie-poster API — Wikipedia search is the only viable free source, which is why Movie is the one category whose Add modal search doesn't use iTunes.

---

## Development Tips

- The extension page URL is `chrome-extension://<extension-id>/src/app/index.html`. Open DevTools on it like any webpage (F12 while the library tab is active).
- To inspect the background service worker: go to `chrome://extensions` → find SaveCraft → click **"service worker"** link.
- To wipe all saved data during testing: open the library → DevTools console → `chrome.storage.sync.clear()` then reload.
- Curated data is cached in `chrome.storage.local`. To force a fresh fetch from Firestore, bump `_CURATED_CACHE_VERSION` in `src/app/js/storage.js` and refresh the extension.
- Firestore writes (for populating curated data) require temporarily setting the `curated_items` rule in Firebase Console → Firestore → Rules to `allow write: if request.auth != null;` (any authenticated user, not `if true`) — the `scripts/seed-*.html` tools sign in a real account first. Always revert to `allow write: if false;` after. A disposable Firebase Auth account (created via the REST `accounts:signUp` endpoint, same one the seeder tools' "Create Account" button uses) satisfies this rule just as well as a real user login and never touches anyone's actual data — useful for scripted/one-off seeding without needing real credentials.

---

## Roadmap

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | ✅ Active | Core extension — personal saves, curated recommendations, Kanban, author pages, iTunes integration |
| Phase 1.5 | ✅ Active (demo mode) | Accounts + Firestore sync + Profile page — see "Recent Additions" above |
| Phase 2 | Planned | Spotify integration for Musician/Music Album richer artist data (photos, full discography) |
| Phase 3 | Unblocked, not built | Sharing with contacts — Firebase Auth + Firestore write access now exist (Phase 1.5); the sharing feature itself still isn't built |
| Phase 4 | Planned | AI recommendations (requires Claude API via Firebase Function) |
| Chrome Web Store | Future | One-time $5 developer fee; publish when Phase 1 is stable |
