# SaveCraft — Project Overview

SaveCraft is a Chrome extension that acts as a personal media library. Users save links to movies, shows, music, books, games, and other content they want to experience. Curated recommendations from Votecraft are surfaced alongside personal saves, and a Kanban board ("My Saves Queue") lets users track what they've watched, read, or listened to.

---

## Recent Additions (latest session)

Another extremely long session, three arcs. First, real mobile rendering bugs on cards: a
`transform: scale()` image-overlap bug, a CSS percentage-height circularity bug that made card
thumbnails snap to random sizes matching each photo's own aspect ratio, an A-Z jump-index rail
overlapping content, and font-size/line-wrap fixes — see `cards.css`'s `.card-image-crop` (now
`position: absolute`, taken out of flex flow entirely) for the thumbnail fix. Second, a full
editable-profile feature build: a pencil-on-hover display name (`state.displayName`) feeding the
Dashboard greeting, plus a new Profile > Account Details card (Full Name, masked Recovery Email
with press-and-hold reveal, Change Email via a new `auth.js` `changeEmail()`, Reset Password, Time
Zone) — deliberately **not** a "show my password" feature, which is technically impossible
(Firebase never stores a retrievable password). Third, by far the largest arc: an extensive
category-carousel UX pass (click-and-drag panning, momentum glide, bouncy `easeOutBack` easing, a
3-tier fade/zoom cascade toward the edges, two real slide-centering-on-load bugs) that led into a
long cross-device sync investigation — which turned out to be the Firebase project's Spark-plan
50,000-reads/day quota being exhausted by heavy live testing, not a code bug. Closed with two
durable fixes: sync failures now surface a visible on-page banner instead of failing silently
(`auth.js`'s `signIn()`/`signUp()` return a `syncError` field; `main.js` shows it), and a real
**incremental sync rewrite** (`storage.js`) — Firestore `:runQuery` filtering on `updatedAt` plus
soft-delete tombstones, replacing the old "re-list the entire items/folders/authors collections on
every single page load" behavior that was the dominant read cost. A device's first sync (and a
24h safety-net re-run after that) still does the original full listing; every sync in between is
now cheap. See "Syncing" below and `session-context.md` for the full blow-by-blow.

---

## Recent Additions (previous session)

An extremely long session, two major arcs. First, dozens of live-feedback polish rounds on the
category folder-picker landing pages/carousel built last session — sizing, edge-to-edge mobile
layout, a gradient edge fade, three real bugs found and fixed along the way (a
`-webkit-overflow-scrolling: touch` scroll-trap, a `flex:1;min-height:0` scroll-clamp bug hiding
the "+ Add" FAB behind content, an off-center-on-load carousel bug) — closing with FAB clearance
becoming a standing "every mobile page gets this by default" convention. Second, by far the larger
arc: extending that same folder-picker + carousel treatment to **curated** genre drilldown pages
too, which required threading a brand-new `folderId` concept through curated Firestore data for
the first time (see "Curated Data" below), paired with a real taxonomy overhaul (TV-show content
moved from Shows into Films, several folder/tab renames, a Creators→Short Form folder swap) and a
significant real bug where one-time data migrations were being silently reverted by Firestore's
own "cloud wins" sync — fixed by making every migration's Firestore write both real and genuinely
awaited before the next sync step can run. Two new manual admin seed tools (same pattern as the
existing `seed-firestore.html`) still need to be run by hand. See `session-context.md` for the full
blow-by-blow.

---

## Recent Additions (Music Taxonomy Finalized / iTunes Rate-Limit Fixes / Global Search+Sort Dropdown / Folder-Picker Landing Pages)

An exceptionally long session in two connected halves. First, closing out the Music genre-bucket
taxonomy (Alt/Indie rename, Metal merged into "Rock/Metal," a new Meditation bucket, Reggae moved
into R&B/Soul), a one-time bulk import of 791 artists transcribed from Spotify screenshots into the
user's own account, a real two-stage iTunes rate-limiting bug (a cache-poisoning bug, then a
flood-of-retries regression from fixing it), a generic A-Z jump-index rail, a Musician-only raw
genre-tag field/badge, and a full confirmation of the Music section's navigation architecture
(picker vs. flat filtered list vs. the sidebar's own folder page) with custom `?v=Music`/
`?v=default-musicians` URL aliasing. Second, a `/simplify` pass over that work — which surfaced the
real gap actually behind live "Load failed"/iTunes-overload reports (the rate-limit breaker only
covered 2 of 7 iTunes call sites; a genre-backfill loop staggered 20x too fast) — followed by
Web Links platform additions, an inline "Fetch Albums" affordance, eliminating a redundant Music
page/state, and two major new features: a custom-styled sort dropdown with an embedded page-search
field paired with turning the header search icon into a true library-wide search, and — the
largest single piece — folder-picker landing pages (with a demo center-emphasis carousel reusing
the Dashboard's own infinite-loop mechanics and real "Recent Saves" demo content) for every
top-level category except Music. See `session-context.md` for the full blow-by-blow.

---

## Recent Additions (Music Genre Taxonomy / Curated List Template / Bulk Artist Import)

Another very long, live-feedback-driven session, three main arcs: Musician/Music polish (title
search, a genre tag, two real bugs — duplicate iTunes video-album cards, a Musician bio rendering
twice) closing with an in-modal save-confirmation redesign; a new **Music landing page** (15
curated genre-bucket cards with save counts, a genre dropdown, and a background backfill for
already-saved musicians missing a genre); and — the largest arc — generalizing VoteCraft/"Top 100"
from a hardcoded one-off into a real reusable **Curated List template**
(`CURATED_GENRE_LANDING_CONTENT`, see "Curated SaveCraft" below), with "RCV" wired up as a second,
genuinely content-empty real instance proving the template holds. Also fixed a major cross-device
sync bug (`savedLists` was write-only, never pulled back down from Firestore), made Saved Lists
show their own real content instead of a placeholder, and closed with two separately-reported
mobile horizontal-drag bugs on curated pages (one from an unwrapped title row, one from an
invisible hover-tooltip inflating scrollable overflow). See `session-context.md` for the full
blow-by-blow.

---

## Recent Additions (older session)

This session built the WordPress Admin Bridge (see "Key Features" above) — Phase 1 (Admin Kanban
manageable from wp-admin) end to end: a dedicated, narrowly-scoped Firebase bot account; a new
`admin_kanban_cards` Firestore rule mirroring `isAdminUser()`'s own email-allowlist-or-role logic;
Admin Kanban itself moved from a local-only whole-array board (`persistAdminKanbanCards()`) to
per-card Firestore sync (`persistAdminKanbanCard`/`removeAdminKanbanCard`, `storage.js`); and a new
WordPress plugin (`plugins/votecraft-savecraft-admin/`, outside this folder) that talks only to its
own REST routes server-side, never exposing any Firestore credential to the browser. All committed,
merged with a concurrent session's own CSS work, pushed, and deployed. Phase 2 (viewing SaveCraft
accounts from wp-admin) was fully designed but paused on a Blaze-billing decision — see
"WordPress Admin Bridge" above and `/Users/lizpasekal/.claude/plans/can-we-separtarate-the-adaptive-breeze.md`.
See `session-context.md` for the full blow-by-blow.

---

*(Older session: a Profile page mobile pass (text sizes, Interests' checkbox grid, Connections rows restructured to stack), new Privacy Policy/Terms of Service pages, and a brand-new "Admin Kanban" board for tracking SaveCraft's own project tasks — closed by discovering that native HTML5 drag-and-drop never worked on iOS touch at all, on *either* kanban board, and fixing it for both. Same era, a separate pass fixed the mobile sidebar drawer, restructured the Curated bare-list page's mobile row layout, and fixed a real horizontal-centering bug on the Shared Saves page. Older still, spanned voice notes via the My Notes toolbar, a real My Notes Profile widget, a full sidebar reorganization, a new shared "You're opening X" confirm popup, a "Saved List scope" feature for browsing categories while scoped to a specific list, and — the largest single piece — dozens of live-feedback rounds rebuilding the Edit Item modal itself (sizing, a purple header bar, field reorganization). See `session-context.md` for the full blow-by-blow on all of the above.)*

---

*(Older session: redesigned the Sponsored Statements partner-pitch page to connect it to VoteCraft Coin (VC) — each pricing tier gained an estimated VC bonus badge, a plain-language "VoteCraft Coin — a civic reward, not a cryptocurrency" section, styling deliberately kept in SaveCraft's own purple palette (not VC's teal), and a real bug fixed where `sponsored.js` crashed on the web build from an unconditional `chrome.runtime.getURL()` call. Older still, made SaveCraft dual-mode — the same `src/app/` codebase also runs as a plain web app at **savecraft.org** (Firebase Hosting, same `votecraft-789` Firestore project) via a new `src/app/js/platform.js` runtime shim — see "Architecture" → "Storage" below and `Documentation/web-deploy.md`. Same session, a full mobile-layout pass against a live iPhone 16 Pro fixed six real bugs: Dashboard not scrolling on mobile, the welcome banner collapsing to ~90px (a `height:100%`-of-`auto`-parent bug), the sign-in modal's buttons wrapping, a curated hero banner's icon badge overlapping its text, curated org-list rows squeezed to half-width, and the mobile sidebar drawer collapsing to 64px whenever desktop's own collapsed-sidebar preference was set. Earlier sessions: landed real Saved Lists sidebar navigation, rebuilt the Share modal (free-text Message → a Saved Lists picker + an on/off link-sharing toggle), broadened the sponsor pitch page to three offerings, and built a brand-new Embed Builder feature end to end (source picker, style panel, live carousel preview, shareable "Embed code" link) — two real bugs along the way (a CSS Grid track-blowout from an unbreakable URL string, a JS temporal-dead-zone crash from a `const` referenced before its own declaration line ran). Before that — added image/hyperlink support to the My Notes formatting toolbar, restructured category/sidebar navigation across four separate requests, and fixed three real bugs found live (a partial-highlight bug, a sidebar multi-tab-open bug, a toolbar spacing issue). Before that — rebuilt the detail modal's "My Notes"/Chapters/Song List from a plain textarea into a numbered-notes system with a formatting toolbar, focus mode, and per-row rename. Before that — replaced the Music Album gallery's single low-res iTunes cover with a real multi-image gallery sourced from MusicBrainz + the Cover Art Archive, plus several rounds of detail-modal visual polish. Before that — 214 more IMDb Top 250 movies seeded into curated Top 100, "Curated SaveCraft" reshaped into a two-tier browsing experience, and the previously-dead "Shared Saves" dropdown item wired up for the first time. See git history around those eras if needed.)*

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

**Running the web app instead:** same codebase, no separate setup — see `Documentation/web-deploy.md` for deploying/redeploying to Firebase Hosting (`votecraft-789.web.app` / `savecraft.org`). Locally, any static file server pointed at this folder works (e.g. `npx serve .`, then visit `/src/app/index.html`) — `platform.js` auto-detects it isn't running as the extension and switches to web mode (localStorage + a mandatory sign-in gate, since Firestore is the only real data store there).

---

## File Structure

```
Savecraft/
├── manifest.json                — Extension config (Manifest V3) — not part of the web deploy
├── firebase.json                — Web app Hosting config (public dir, ignore list, no-cache headers, / rewrite)
├── .firebaserc                  — Points the Firebase CLI at project votecraft-789 by default
├── images/
│   ├── logos/                   — Source-attribution logos (Rolling Stone, Steam, NYT) used in Curated SaveCraft, plus the real VoteCraft wordmark/icon (votecraft-logo_white.png, votecraft_icon_white.png) used on the Top 100 landing page — all declared in manifest.json's web_accessible_resources
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
│   │   ├── sponsored.html       — Standalone "Partner with SaveCraft" pitch page (Sponsored Statements + 2 other offerings) linked from curated Top 100 detail modals + the Settings dropdown; runs on both the extension and the savecraft.org web build
│   │   ├── sponsored.js         — External ES module (extension-page CSP blocks inline <script>) — sets the "SaveCraft" wordmark link's href via platform.js's resourceUrl()
│   │   └── vc-bonus.js          — VoteCraft Coin bonus preview badges/panel on the pricing tiers (client-side estimate only — no real VC backend exists anywhere in Votecraft yet)
│   ├── webpage/
│   │   ├── privacy-policy.html  — Standalone Privacy Policy page (working draft — see its own banner); linked from Profile, Settings dropdown, Sponsored Statements footer
│   │   └── terms-of-service.html — Standalone Terms of Service page (same working-draft status); cross-links the Privacy Policy
│   └── app/
│       ├── index.html           — Full library page (opens as a new tab); loads js/main.js as an ES module + the css/ stylesheets
│       ├── js/                  — Library logic, split into ES modules (see below)
│       └── css/                 — Library styles, split by feature area (see below)
└── Documentation/
    ├── savecraft-overview.md    — This file
    ├── session-context.md       — Technical reference for AI assistants
    ├── savecraft_planning.md    — Original Phase 1 planning doc (historical)
    └── web-deploy.md            — savecraft.org / Firebase Hosting: deploy steps, DNS setup, caching, the temporary demo-bypass button
```

### `src/app/js/` modules

The library used to be one ~3,700-line `app.js`. It's now split into several dozen ES modules, loaded via `<script type="module" src="js/main.js">` in `index.html`. Modules import/export between each other (some circularly — safe under ES modules since nothing is called at module-evaluation time, only from inside functions):

| Module | Responsibility |
|--------|-----------------|
| `platform.js` | Extension-vs-web runtime shim — `isExtension`, `storageSync`/`storageLocal` (→ `localStorage` on web), `openInNewTab` (→ `window.open`), `resourceUrl` (→ site-root-relative paths). Every other module routes through this instead of calling `chrome.*` directly |
| `state.js` | Shared `state` object + static constants (`CATEGORIES`, `CAT_LABEL`, `CAT_EMOJI`, `CATEGORY_PLATFORMS`, `CREATOR_CARD_CATEGORY`, etc.) |
| `storage.js` | All `persist*`/`remove*` functions, `loadAll()` (incl. one-time backfill migrations), Firestore curated-data loading (`_loadCuratedFromFirestore`, `initCuratedItems`), Firestore dual-write helpers for the account-sync feature |
| `utils.js` | Pure helpers: `escapeHtml`, `catClass`, `debounce`, `formatTrackDuration`, `patchCardImage`, `getDomain`, `getListIds`, `sortFoldersForDisplay` (Movie's custom Directors-last folder order), `getYoutubeVideoId`/`getVimeoVideoId`/`getVideoEmbedUrl` (Movie's Videos-folder lightbox), etc. |
| `api.js` | External network calls: iTunes, Open Library, Steam, Wikipedia, MusicBrainz/Wikidata/Cover Art Archive, YouTube, Last.fm, Steam Web API (unset API key constants live here); `fetchVideoThumbnail()` (YouTube host URL / Vimeo oEmbed, for Movie's Videos folder — Microlink blocks YouTube) |
| `auth.js` | Email/password auth via the Firebase Auth REST API — no SDK, independent from any shared Votecraft account |
| `authors.js` | Author/musician profile CRUD, navigation, album-metadata backfill, album art gallery cache (`getCachedAlbumArt`/`ensureAlbumArt`) |
| `curatedCreatorLookup.js` | Logic that reads `curatedCreatorData.js` (below) — matches a curated Top 100 Movie/Show/Game title to its director/creator/studio name — plus the shared `splitCuratedTitleCreator()`/`getStaticCuratedCreator()` helpers, imported by `renderFilters.js`, `renderGrid.js`, and `storage.js` |
| `curatedCreatorData.js` | Pure auto-generated data (no logic) backing the lookup above — sourced externally (Wikidata/Steam), regenerated via the scripts in `session-context.md` rather than hand-edited |
| `render.js` | Thin barrel re-exporting the public surface of the 7 modules below, so external `from './render.js'` imports didn't need to change when this got split (2026-07-29) |
| `renderFilters.js` | `getFilteredSortedItems`, `matchesPrimaryOrUnfoldered` — item filtering/sorting for every view |
| `renderSidebar.js` | `renderSidebar`, `promptAddFolder` — the left sidebar, curated genre picker, folder rows |
| `renderCuratedImageFetch.js` | `fetchMissingCuratedImages`, `fetchMissingCuratedMusicianPhotos` — live-fetch + live-patch missing curated cover art/photos, called from both the main grid and curated landing rows |
| `renderGrid.js` | `renderGrid`, `renderCard` — the main card grid and the shared card markup |
| `renderAuthorPage.js` | `renderAuthorPage` — an author/creator's profile page and their works grid |
| `renderCuratedPages.js` | `renderCuratedBareList`, `renderCuratedDirectory`, `renderCuratedGenreLanding`, `resolveOrgImageUrl` — the curated Top-100-style landing/directory pages |
| `renderCardActions.js` | `wireQuickQueueButtons` — the quick add-to-queue button shared by grid cards, author-page cards, and curated landing rows |
| `kanban.js` | Kanban board rendering, drag-and-drop (cross-column + within-column reorder, mouse and touch) — `KANBAN_DEMO`/`KANBAN_COLUMNS` exported for reuse by the Dashboard |
| `adminKanban.js` | Second, separate kanban board for SaveCraft's own project tasks (not saved items) — own local-only state, own drag-and-drop (mouse + touch), own card editor popup |
| `detailModal.js` | Orchestrator for the item detail modal — re-exports `openDetailModal`/`closeDetailModal`/`getDetailItem`/`openImageLightbox`/`closeImageLightbox`/`showNextImage`/`showPrevImage`/`handleGalleryLoadMoreClick`; the modal's actual sections live in the 5 modules below (2026-07-29 split — was one ~990-line file). The lightbox is a real multi-image gallery now (see Recent Additions), tracked as module-private `_galleryImages`/`_galleryIndex`/`_galleryLoadMore` |
| `detailModalAccordions.js` | Shared accordion open/close registry (`registerAccordion`/`closeAccordionsExcept`/`resetAccordions`) every other detail-modal section registers with, instead of each hand-listing every other section's DOM elements |
| `detailModalHeader.js` | Image, sponsored "Your Statement" tag, bookmark/favorite icons, title/author/publication line, Official Website CTA |
| `detailModalSummary.js` | Summary/Albums accordion — Musician's known-albums list, Book/Show/Movie/Game's item summary, or the Visual Art placeholder |
| `detailModalNotes.js` | My Notes + Tracklist/Chapters accordions, the numbered-note-list renderer (`renderNumberedNoteList`) they share, the note formatting toolbar + focus mode (`initNoteToolbar`), and per-row rename (`_startRenamingTitle`) — kept in one module since Books fold their chapter list directly into My Notes, sharing its open/close state |
| `detailModalQueue.js` | Web Links + Queue accordions, incl. `toggleQueueFromHeader()` (called by `detailModalHeader.js`'s bookmark button) |
| `addEditModal.js` | Add/Edit item modal — the 3-screen add wizard (category → search → review) plus the single-page Edit form |
| `fetchAlbumsModal.js` | Fetch Albums (bulk iTunes import) modal |
| `dashboard.js` | The Dashboard home page — hero collage + 4 widget cards (see "Dashboard (Home Page)" below) |
| `profile.js` | The Profile page — account info, Connections (Last.fm/Steam/Instagram), Interests, Your Music Taste |
| `sharedSaves.js` | The Shared Saves page — followed-curated-list portal cards + a Friends stub |
| `share.js` | Share dropdown/modal (Saved Lists picker, link-sharing toggle, "Embed options" entry point), CSV export, Markdown export |
| `embedBuilder.js` | The Embed Builder pseudo-view (`state.view === 'embed-builder'`) — source picking (category/folder/Custom Slider), the asset list, the style panel, the live carousel preview, and the "Embed code" link box |
| `main.js` | Entry point — theme, sidebar collapse, mobile sidebar, `init()`, all DOMContentLoaded event wiring; page-scoped search (`handleSearch`, driven by the sort dropdown's own embedded field, see `sortSelect.js`) |
| `navigation.js` | `navigateToView` — single entry point for every `state.view` change (History API sync, `persistViewState`, re-render); `VIEW_TO_URL_PARAM`/`urlParamToView` alias a couple of internal view strings to cleaner public `?v=` URLs |
| `azIndexRail.js` | Generic right-edge A-Z jump-index rail, shown on any scrollable card-list page |
| `sortSelect.js` | Custom-styled replacement for the header's old native sort `<select>` — a trigger+dropdown-panel component whose last row is a real text input driving `main.js`'s page-scoped search |
| `globalSearch.js` | The header search icon's own logic — a true library-wide search (distinct from `sortSelect.js`'s page-scoped one) with a Spotlight-style results dropdown panel; reuses `resolveFavoriteSlides()` (`dashboard.js`) as its result-row visual language |
| `categoryCarousel.js` | The demo center-emphasis carousel shown below the folder-picker cards on every non-Music category landing page (see "Category Landing Pages" below) — reuses `dashboard.js`'s own infinite-loop carousel mechanics and real "Recent Saves" demo content |
| `bulkImportArtists.js` | One-time, console-only personal-migration script (bulk artist import from transcribed Spotify screenshots + follow-up cleanup/backfill helpers) — not part of the app's real feature surface, kept only until its one-time job is fully done |

### `scripts/` (admin tooling, not loaded by the extension)

One-off HTML tools for seeding curated Firestore data — plain `fetch()` against the Firestore REST API + Firebase Auth REST API, no SDK, no build step. Each has a Sign In *and* Create Account button, so seeding doesn't require an existing SaveCraft login. Require the `curated_items` Firestore rule to temporarily allow `if request.auth != null` (revert to `if false` after running). Notable ones: `seed-book-authors.html` (83 Book Author docs), `seed-creator-cards.html` (249 Movie Director/Show Creator/Game Studio docs combined).

Two newer tools follow `seed-firestore.html`'s simpler pattern instead (Firebase JS SDK compat build, no own sign-in UI — rides on an already-authenticated browser session): `migrate-curated-categories.html` (Preview/Run buttons; normalizes stale plural curated category values to the app's real singular naming, and retags Top 100 "Show"/"Show Creator" docs to "Movie"/"Movie Director" with a `folderId`) and `seed-time-podcasts.html` (adds the first 49 of TIME's "100 Best Podcasts of All Time" under Series → Podcasts via the same `folderId` mechanism — the rest of TIME's list isn't reliably fetchable).

### `src/app/css/` stylesheets

Split along the same lines from the original `app.css`, loaded as separate `<link>` tags in a fixed order (order matters — later files can override earlier ones): `base.css` (reset, theme variables, header), `sidebar.css` (the collapsible desktop rail **and** the mobile drawer — the latter moved here from `misc.css` so all of the sidebar's own responsive CSS lives in one file, matching every other feature file's convention of owning its own `@media` rules), `cards.css` (grid, cards, author pages), `detailModal.css`, `addEditModal.css`, `fetchAlbumsModal.css`, `kanban.css`, `dashboard.css`, `profile.css` (Profile page + its Connect Last.fm/Steam modals), `sharedSaves.css`, `embedBuilder.css` (Embed Builder page), `misc.css` (share modal, scrollbar, remaining mobile-only overrides not owned by a specific feature file — hamburger button, FAB, header search, etc.).

The original monolithic `app.js`/`app.css` have been deleted (2026-07-29) — see `scripts/seed-curated.js`, which used to extract curated-item data out of `app.js` and now reads `scripts/seed-payload.json` instead.

---

## Architecture

**Runtime:** Chrome Extension, Manifest V3 — **and** a plain web app at savecraft.org (Firebase Hosting), same `src/app/` codebase for both. `src/app/js/platform.js` detects which environment it's running in (`isExtension = typeof chrome !== 'undefined' && !!chrome.runtime?.id`) and every other file routes `chrome.storage`/`chrome.tabs.create`/`chrome.runtime.getURL` calls through it instead of calling `chrome.*` directly — see `Documentation/web-deploy.md` for the full deploy/hosting story. No bundler — plain HTML/CSS/JS either way.

**Storage:**
- `chrome.storage.sync` (extension) / `localStorage` (web, via `platform.js`) — user's personal saves, folders, authors, settings, Kanban config. In the extension this syncs across the user's Chrome devices automatically (up to ~100KB total); on web there's no such sync, so signing in is required there and Firestore is the real source of truth (`main.js`'s `requireWebSignIn()`).
- `chrome.storage.local` (extension) / `localStorage` (web) — curated item cache (larger, device-only; 24-hour TTL)
- Firestore (read-only at runtime, no auth needed) — curated item data fetched at startup via REST from the `curated_items` collection in project `votecraft-789`
- Firestore (read/write, auth-gated) — when signed in, personal saves/folders/authors/settings dual-write to `savecraft_users/<uid>/...` alongside the local store above (`storage.js`) — this is what the web app relies on exclusively, and what lets the extension and web app share the same library across devices

**Extension-only, no web equivalent:** the right-click "Save to SaveCraft" capture (`src/background/background.js` + `src/content/content.js`) — web visitors add items through the Add modal only.

**No build step.** Editing a `.js` or `.css` file and refreshing the extension in `chrome://extensions` (or just reloading the page, for web) is all that's needed to see changes.

**Mobile FAB clearance — standard practice.** The floating "+ Add Item" button (`#fab-add`, `.fab-add` in `misc.css`) is `position: fixed; bottom: 24px;`, so it sits on top of whatever content is scrolled beneath it. Every normal (scrolling) mobile page must leave room below its last item so that content doesn't end up hidden behind the FAB once scrolled all the way down. This is handled centrally, not per-page: the base `.grid-area` mobile rule (`misc.css`, inside the `@media (max-width: 768px)` block) applies `padding-bottom: var(--fab-clearance)` (currently `130px`, defined once on `:root` in the same block) to every page automatically. **A new mobile page needs no FAB-clearance CSS of its own** unless it opts out of the default `.grid-area` scroll behavior (e.g. a fixed-fit, non-scrolling page like Kanban or Admin Kanban, which use `.grid-area:has(<page-class>) { overflow: hidden; ... }` and manage their own padding) — if such a page hides the FAB entirely (Admin Kanban does, via `body:has(.admin-kanban-wrap) .fab-add { display: none; }`) it doesn't need clearance either. If a page's content wrapper uses `flex: 1; min-height: 0;` (the "shrink to exactly fit the available box" pattern used by fixed-fit desktop layouts), make sure any **mobile** override for that same wrapper resets it back to `flex-shrink: 0; min-height: auto;` — otherwise the wrapper silently compresses its content to fit rather than growing past the viewport, and `.grid-area`'s scroll (and the FAB clearance padding) never actually has anything real to scroll into, even though the CSS looks correct (a real bug hit and fixed on the Category Landing Pages — see "Category Landing Pages" below).

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
| Musician | Music | Musicians |
| Music Album | *(hidden — accessed via subfolder)* | Albums |
| Show | Series (was "Shows" — renamed this session; the category id/dropdown value is still `Show`) | *(none — the old primary/TV-show folder moved into Films, which now has its own "Shows" folder — see Recent Additions)* |

`CATEGORIES`' order (`state.js`) directly drives both the sidebar and the Add-wizard tile grid order — that's why the table above is in that order, not alphabetical. **News is no longer a `CATEGORIES` member** (dropped this session — see Recent Additions); an existing News item is still fully functional wherever already reachable, it just has no dedicated nav tab or wizard tile anymore. Web Links' "Blogs" folder was renamed "News" as an informal replacement destination.

The `Music Album` category is not shown as a top-level sidebar entry. Instead, a permanent **Albums** subfolder (renamed from "Music Albums" — the badge/tag system below made the "Music" part redundant) appears under **Music** in the sidebar (the tab itself renamed from "Musicians" this session — see Recent Additions — but the permanent hardcoded subfolder for Musician items themselves is still labeled "Musicians"). This subfolder also works in Curated SaveCraft mode, navigating to the curated music album list for the selected genre.

Beyond each category's primary folder, several categories also have a **creator-card folder** — a non-primary subfolder that doubles as an entry point into a curated "creator card" bucket when browsing a curated genre (see "Author / Artist Profile Pages" below): Book → **Authors**, Movie → **Directors**, Game → **Game Companies**. **Series no longer has a Creators folder** (retired this session — its old TV-showrunner creator cards moved into Films → Directors instead, alongside Movie Directors) — its own folders are now Podcasts/Tutorials/Web Series/**Short Form** (new this session, replacing Creators). Game additionally has **Board Games**/**Console Games**/**Mobile Games** (its first-ever folders besides Game Companies) — of these, only Console Games maps to the full curated Games list (Top 100 games are all console/PC titles); Board Games and Mobile Games correctly show empty while browsing a curated genre, since there's no curated data for those types yet. Films additionally has a **Shows** folder (renamed from "Series" this session — see Recent Additions, holds the TV-show content that used to live under Series), alongside its existing Movies/Videos/Directors.

**`Web Links`** is a real `CATEGORIES` member now (promoted from a sidebar-only pseudo-category), shown as **Website** everywhere — sidebar, grid title, and Add-wizard tile all read from the same `CAT_LABEL['Web Links']` value now, no more special-cased "Webpages" text. An **"Articles"** shortcut tile (new this session) also appears in the Add Item wizard, filing straight into Web Links' Articles folder without going through the normal Websites tile/folder-picker flow — it's not a real category, no `CATEGORIES` entry or sidebar tab of its own.

A category's **primary folder** (`PRIMARY_FOLDER_ID` in `state.js`, keyed by category → the seeded folder's id) is what its top-level tab actually filters to — see "Primary folder tab filtering" in Recent Additions above. Categories with no entry (Game, Show as of this session, Visual Art) show every item in the category unfiltered.

---

## Key Features

### Quick-Save Popup
Clicking the toolbar icon opens a small wizard-style popup (`src/popup/`) mirroring the Add Item modal: category tile screen (imports `CATEGORIES`/`CAT_LABEL`/`CAT_EMOJI` straight from `js/state.js`) → Musician-vs-Music-Album sub-choice for the combined "Music" tile → folder-picker screen (auto-skipped when the category has 0 or 1 folders) → a review screen with editable Title/Image URL/URL, pre-filled from the current tab (title, URL, and an auto-fetched `og:image` via the content script or Microlink fallback). After saving, it asks **"Open Library →"** or **"Close"** rather than auto-closing. Matches the main app's dark/light theme automatically. Fixed at two sizes — compact for the tile-picker screens, taller for the review screen — never freely resizing mid-navigation.

### Right-Click Context Menu
Right-clicking any page or link shows **Save to SaveCraft → [category]**. The service worker (`background.js`) reads `og:image` from the page via the content script and saves the item automatically.

### Full Library (`src/app/index.html`)
Opens as a new tab. Contains:
- **Left sidebar** — category navigation plus a "My Saves Queue" entry that switches to the Kanban view. A collapsible "My Dashboard" row (renamed from "Dashboard," arrow on the right, like a category, collapsed by default) contains My Saves Library and Curated Lists (pinned at the top, mutually exclusive — opening one closes the other, each with its own purple icon badge) above the "Queue Kanban" link. Browsing a Saved List preserves that scope across category clicks (`state.activeSavedListId`) until the user explicitly leaves it. Music (renamed from "Musicians" this session) has a permanent Albums subfolder. Collapsible on desktop to a 64px icon-only rail (toggle button in the sidebar header, top-left) — collapse state persists across reloads via `chrome.storage.sync`. The mobile drawer is unaffected (full-width overlay, unchanged).
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

### Admin Kanban
`js/adminKanban.js`, styled from `css/kanban.css`. A second, separate board from the real Queue Kanban above — for tracking SaveCraft's own project to-do list, not saved items. Cards are freeform (`name` + `details`, edited via a small popup rather than inline) and live in `state.adminKanbanCards`. **No longer local-only** — each card now also syncs per-document to Firestore's `admin_kanban_cards` collection when the signed-in account is an admin (`isAdminUser()`, gated the same way the board itself is), since the same collection is also read/written by a new WordPress plugin (see "WordPress Admin Bridge" below) — this whole feature is still expected to be reworked or removed later, so it's kept self-contained in this one file rather than woven through the rest of the app.

- **Reached from** a 5th Dashboard widget (full-width, spanning both grid columns, landing below Curated Lists) and a sidebar entry next to Queue Kanban.
- **Same visual system as the real board** — `.kcard` sizing, the circular expand button (per-column full-width toggle), empty-column drop hints — but a fixed white card background with black text regardless of theme (per direct request), and cards float a "+ Add card" button over the bottom of the column (not a normal flex sibling) so columns can reach the full height of the screen.
- **Urgency rating** — an optional 1-10 field in the edit popup, shown as a colored dot (bottom-right) and a left-edge strip: blue 1-3, deep orange 4-7, red 8-10.
- **Sort dropdown** — A→Z, Z→A, Newest→Oldest, Oldest→Newest, Urgency High→Low, Urgency Low→High, and Custom order (drag order) — one global sort across all four columns, rendered as the board's own content rather than reusing the shared `#sort-select` element (whose fixed option set belongs to the main items grid).
- **Seeded once** with `Documentation/launch-requirements.md`'s checklist, one card per sub-task, pre-rated by urgency — gated on its own one-time flag (`savecraft_admin_kanban_seeded`) so it never re-adds a card the user deletes.
- **Touch drag-and-drop** — reimplemented manually (`touchstart`/`touchmove`/`touchend`) alongside the native mouse-based drag, since iOS Safari never fires HTML5 drag-and-drop events from touch at all; the real Queue Kanban board above got the identical fix in the same session.

### WordPress Admin Bridge
Trusted staff can manage the Admin Kanban board directly inside votecraft.org's wp-admin, without a
separate SaveCraft login — new WordPress plugin at `plugins/votecraft-savecraft-admin/` (outside
this folder, alongside the other VoteCraft WordPress plugins). Gated behind a dedicated WordPress
capability (`manage_savecraft_admin`), not `manage_options`, so it can be granted to specific staff
without making them full WP Admins.

**Credential design (the point of the whole thing):** a dedicated Firebase Auth account
(`wp-savecraft-bot@votecraft-789.internal`) whose refresh token lives only in `wp-config.php`,
scoped by `firestore.rules` to exactly the `admin_kanban_cards` collection — nothing under
`savecraft_users`, no writes to `curated_items`, no account listing. The browser never sees this
token or any Firestore-scoped ID token: wp-admin's own JS calls only this plugin's REST routes, and
PHP does the Firestore calls server-side (`includes/class-firestore-client.php`, a PHP port of this
app's own `storage.js` Firestore REST helpers and `auth.js`'s refresh-token→ID-token exchange).

A second phase (viewing SaveCraft accounts from wp-admin, read-only) was fully designed but is
**paused** — it needs Firebase Cloud Functions, which require moving the `votecraft-789` project off
its free Spark plan onto Blaze. Full plan:
`/Users/lizpasekal/.claude/plans/can-we-separtarate-the-adaptive-breeze.md`.

### Author / Artist / Director / Studio / Creator Profile Pages
Every author/director/studio/creator name on a card or in a detail modal is a clickable link (`CREATOR_CARD_CATEGORY` in `state.js`, extended this session from Musician-only to Book/Movie/Show/Game). Clicking it navigates to a dedicated **profile page** for that person/studio within that category:

- **Profile header** — photo, name, bio, website link. Bio/photo enrichment (like Musician's) is not yet built for the new categories — the header shows a plain name until that's added; the curated "creator card" itself (in the Authors/Directors/Creators/Game Companies folder) already has bio/photo, just not yet copied onto this stub.
- **Works grid** — all saved items by that person in that category. For **Musician** profiles, Music Album items by the same artist are also shown — including curated albums from Firestore where the artist name matches. For Book/Movie/Show/Game, curated items across every genre are pulled in too (a director's page shows their movies from Top 100 *and* Thriller *and* any other genre they're curated under), deduped by title since the same work is frequently curated separately per genre.
- Author profiles are stored in `chrome.storage.sync` under keys `author_<id>`
- Navigating to an author auto-creates a stub profile if one doesn't exist yet
- The URL view format is `author:<category>:<name>` (e.g. `author:Musician:Gorillaz`, `author:Movie:Bong Joon-ho`)
- Visiting one of these pages while browsing a curated genre keeps the sidebar showing that genre's category tree (via `state.authorReturnView`) instead of resetting to the top-level genre picker — see `session-context.md`'s Sidebar Structure section for the mechanism.

### Auto-Save Musician
When a user queues or saves any **Music Album** item for the first time, the artist is automatically added to their **Music** saves. The `autoSaveMusician()` function pulls the artist's iTunes URL and cover art from the curated Firestore data if available.

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
- **Top 100 landing page** — clicking into Top 100 (before picking a category) shows a real landing page instead of the plain "Pick a category" state every other genre still has: a branded hero band, then Netflix-style horizontal rows (Musicians/Movies/Books/Games) with a quick-queue bookmark on every thumbnail, then a CTA linking to the Sponsored Statement pitch page. See "Recent Additions" and `renderCuratedGenreLanding()` in `render.js`. Built as a live demo for pitching nonprofits on sponsoring their own list.
- **Category drilldown** — clicking a genre shows categories; clicking a category shows curated items
- **Musicians** — 100 top artists (from iTunes charts), each card's name links to their author profile page
- **Music Albums** — a `Music Album`-category Firestore bucket under Top 100 (~2,400 docs), each showing the artist name as a clickable link; the Albums subfolder under Music navigates to this view. **Not currently a genuine curated Top 100 shortlist** — it's bulk auto-synced album metadata, not a hand-picked list; a real editorial pass is still needed (see Recent Additions' data-quality fix for a related bug that was found and fixed here — a legacy mislabeled category was leaking Musician-name cards into this bucket).
- **Book Authors / Movie Directors / Game Studios** — curated "creator card" buckets, reached via each category's Authors/Directors/Game Companies folder. Same idea as Musicians, generalized this session — see "Recent Additions" for how the creator names were sourced (Wikidata/Steam) and why they're kept as static in-app data rather than stored in Firestore for Movie/Show/Game. **The old "Show Creators" bucket (89 entries, TV showrunners) was folded into Movie Directors this session** — Series no longer has a Creators folder/curated bucket of its own (see "Categories" above).
- **Clicking a creator card** opens the detail popup; clicking the name navigates to their profile
- **Curated cache** — data is cached in `chrome.storage.local` for 24 hours; cache is versioned so bumping `_CURATED_CACHE_VERSION` in `js/storage.js` forces a fresh fetch (currently `7`)
- **Top 100 lists** — the "Top 100" genre shows a source-attribution logo next to the section title, indicating which outlet curated that list: Rolling Stone (Musicians, Shows, Books), The New York Times (Movies), Steam (Games). Hovering any logo shows a tooltip explaining the attribution. Curated categories are keyed by their singular `CATEGORIES` name internally (e.g. `genre:Top 100:Musician`, not `genre:Top 100:Music`) — this tripped up the logo-matching logic once before, so keep that in mind if extending it.
- **Sidebar navigation while browsing a curated genre** — every subfolder click stays inside the current genre (routing to a dedicated creator bucket, the full parent category, or an inert empty state — see Recent Additions), only the actually-clicked folder highlights, and visiting an author/creator page no longer resets the sidebar. See `session-context.md`'s Sidebar Structure section for the full mechanism (`sidebarEffectiveView`, `state.activeCuratedFolderId`, `FOLDER_SHOWS_FULL_CURATED_CATEGORY`).

### Item Detail Modal
Clicking a card opens a detail modal. **Every category now shares the same accordion-based layout** (this used to be Musician/Music-Album-only, but was extended to all categories):

- **Image** — 16:9 cropped cover (object-fit: cover). Music Albums dim on hover (`.detail-image--clickable`) and clicking one opens a full-screen gallery lightbox — a single image (the iTunes cover) until the user clicks the lightbox's own "Check for more art" button, which checks MusicBrainz + the Cover Art Archive for additional images (front/back/booklet scans) and, once found, turns the lightbox into a real gallery with prev/next arrows and a thumbnail strip. See "MusicBrainz + Cover Art Archive album art gallery" under Recent Additions for the full mechanism. Musicians no longer have a "Promo Vid" toggle — it was removed a prior session; a curated Top 100 item of any category instead shows the "⚡ Your Statement" badge in that same corner (its hover tooltip now opens downward, below the badge, instead of over the artwork).
- **Header overlay** — an "Official Website" pill overlays the top of the image for every category. For Musician/Music Album it resolves via MusicBrainz → Wikidata (cached per artist); every other category falls back to the item's own saved `url`.
- **Title area** — Musicians show their name with a clickable arrow to their author page. Music Albums show the artist name (in the brand purple) above the album title — the release year that used to appear on its own line here was removed; it's still shown on grid cards, just not in the modal.
- **Bookmark / Favorite** — the save/bookmark icon lives inside the "Add to Queue" button (for every category now); the top-right corner is a Favorite star instead. Favoriting is now a plain `item.favorite` boolean (see Recent Additions) — it no longer touches `item.folderId` or creates a "Favorites" folder.
- **Accordion rows** (icon + label + chevron, mutually exclusive — opening one closes the others):
  - **My Notes** — a numbered note list ("+ Add Note", each row collapsible via its own pencil-turned-plus icon), not a plain textarea. Row 0 ("Summary") falls back to old notes/description text until edited; every row's title can be renamed via a small pencil that appears once that row is expanded (see "Rename a note's title" under Recent Additions). Opening this section (or Book's Chapters / Music Album's Song List below) swaps the modal's sticky title for a formatting toolbar (Bold/Highlight/Bullet/Image/Expand — Image inserts a note-body image via a pasted URL, new this session) — Expand is a distraction-free focus mode that hides the image, edit/bookmark/favorite icons, and the Albums/Web Links/Add to Queue rows so the open note is the only thing left visible. Note bodies are sanitized `contenteditable` divs (`noteSanitizer.js`), not `<textarea>`s. Shown for every category.
  - Second row, category-dependent: **Albums** (Musician only — the artist's known albums, capped at 5 with a "See all →" link to their profile; always shown, even with zero known albums, as an empty placeholder row like Visual Art's below — every category keeps the same accordion row count) / **Song List** (Music Album only — the album's tracks, lazily fetched via the iTunes lookup API on first expand using the item's `collectionId`; a one-time backfill resolves `collectionId`/`year` for older items that predate this field; per-track notes use the same collapsible-row UI as My Notes, but track titles themselves aren't renameable — they're real iTunes data) / **Summary** (Book, Show, Movie, Game — shows `item.summary`, auto-backfilled from Wikipedia if missing; see below) / **Placeholder** (Visual Art — reserved, intentionally empty for now).
  - **My Notes doubles as a bio fallback for Musician** — rather than its own separate read-only block, an artist's Wikipedia bio pre-fills My Notes' row-0 "Summary" the first time the modal opens for them, same fallback pattern as Book's Chapter 0. An `item.bioNotesSeeded` flag stops it from reappearing once the user edits (or intentionally clears) that field.
  - **Web Links** — same accordion treatment for every category; now also shows a real "YouTube" link (the item's own saved `youtubeUrl`, not a search) whenever one's set, regardless of category.
- **Add to Queue** — a standalone pill button below the accordion stack for every category (rather than sharing a header row with Web Links, as it used to for non-music categories).

**Wikipedia fallback (Book/Show/Movie/Game only)** — when one of these items is missing an image or summary, `ensureItemWikipediaInfo(title, category)` looks the title up on Wikipedia, validated against category-specific keywords (e.g. a Movie result must mention "film"/"movie" in its description) with a category-biased search retry if the direct title match fails or is a disambiguation page — this stops a generic title (e.g. a movie called "Up") from pulling in the wrong same-named article. Results are cached indefinitely in `chrome.storage.local` (`state.itemWikiCache`), keyed by `category:title`. Note: Wikipedia serves non-free poster/cover art at reduced resolution for fair-use reasons, so fetched images are sometimes lower quality than the original source — this is a known limitation, not a bug.

For curated albums, the artist name is a clickable link in the title area (unless already on that artist's own page).

### Add / Edit Modal
**Rebuilt this session into a simpler 3-screen wizard** (`js/addEditModal.js`) — the old separate "live search" screen is gone entirely, and the review screen itself is stripped down to just Title + URL for every category, since the full field set (Author, Summary, Platforms, Video URL, Image URL) made adding an item feel like too much work. Each screen is skipped automatically when there's nothing to choose:

1. **Category screen** — "What are you adding to?" plus a category tile grid (icon + label, same icons as the sidebar). Musician and Music Album are combined into one **"Music"** tile here (renamed from "Musicians" this session) — picking it shows a small Musician-vs-Album sub-choice screen (heading "Choose a folder", matching every other folder-picker screen) before continuing, but doesn't change which underlying category the item ends up as. An **"Articles"** shortcut tile (new this session) sits right after Websites — not a real category, it routes straight to Web Links pre-filed into the Articles folder, skipping the folder-picker screen entirely. No back icon here (nothing to go back to).
2. **Folder-picker screen** — shown only when the chosen category has 2+ folders (0 or 1 auto-skips straight through, since there's no real choice to make). Picking a folder is mandatory — there is no "Skip"/"No folder" tile. Folders sort alphabetically **except** Movie's, which use a fixed order (`sortFoldersForDisplay()`, `utils.js`) so "Directors" sits last, after "Videos". For News specifically, this doubles as source verification (see below).
3. **Review screen** (also used standalone for Edit) — just **Title** and **URL**. For **Music Album, Show, Book, Game, and Movie**, the Title field doubles as a live search box (placeholder "Search title", a small search icon on the right) — typing (debounced ~500ms) searches the same category-appropriate free APIs as before and shows a results dropdown; picking a result silently fills the *hidden* Author/Image-URL fields (still saved, just not shown) so cards/detail pages still get correct art and links. **Musician** (and Visual Art/Web Links/News, which never had a search source) gets a plain "Title" field with no search. Background enrichment (`ensureArtistWikipediaInfo`/`ensureItemWikipediaInfo`/`ensureItemCreator`) still fires — on selecting a search result, or on the Title field losing focus for manual entries — filling in the same hidden Author/Summary/Image fields.

The Author/Summary/Platforms/Image-URL/Video-URL fields all still exist in the DOM and still get saved — they're just not shown or editable at add time. **Editing** an existing item (`openEditModal`) shows the full field set as before: Title | Author/Creator (order swapped this session — Title first), Image URL/URL (moved above Summary), Summary, Folder, and Web Links/Platforms (now always the *last* section, with a "YouTube URL" custom-link row appended after the per-service checkboxes inside that same dropdown — lets the user add one specific video link that isn't a generic per-service search; the dropdown opens *upward* now since it's always last, to avoid being clipped by the modal's bottom edge). Musician/Music Album/Favorite Albums keep a separate compact side-by-side Platforms+Video-URL pairing, untouched by any of the above. Movie's own **Videos** folder hides the standalone Video-URL field entirely (redundant — see below) and shows "Creator" instead of "Director" as the Author-field placeholder.

The header changed shape too: no more X close button (click outside or Escape still close it); the back arrow now carries a label next to it (the current folder/category name, e.g. "‹ Blogs") instead of being a bare icon; "Choose a folder"/"Choose a folder" (music sub-choice) drop their bookmark icon; the review screen has no heading at all (just the back arrow + folder name); "Edit Item"'s heading is left-aligned so its icon lines up with the fields below instead of sitting centered above them. Both the category `<select>` (top-right, Edit only) and the Folder `<select>` now use a custom dropdown arrow (replacing the browser's native one) positioned at the same 6px right-inset as the "✕" clear buttons elsewhere in the form, for visual consistency.

**Per-category search source** (all free, no API key) — same sources as before, just triggered from the Title field instead of a separate screen:
| Category | Source | Notes |
|----------|--------|-------|
| Music Album | iTunes (`entity=album`) | Full art/artist/year/URL directly from the search result |
| Show | iTunes (`entity=tvSeason`) | Deduped by `artistId` to one row per show, not per season |
| Book | Open Library (`openlibrary.org/search.json`) | Cover art via `covers.openlibrary.org` |
| Game | Steam (`store.steampowered.com/api/storesearch`) | Cover art via `cdn.akamai.steamstatic.com` |
| Movie | Wikipedia (`generator=search`) | iTunes's movie search is dead — verified live, 0 results for well-known titles since Apple moved movie purchases to the Apple TV app. Skipped entirely for the **Videos** folder (see below) |
| Musician | *(none — plain title now)* | Enrichment (bio/photo) still fires on blur off a typed name |
| Visual Art ("Arts") / Website / News | *(none)* | Manual entry only. News is additionally gated: the pasted URL's hostname must match the chosen folder's `domain` field, or the save is blocked with an inline error |

**Title/Author field**: in Edit mode, only Music Album (artist)/Book (author)/Movie (director, or "Creator" in the Videos folder)/Show (creator)/Game (studio) show a separate field — every other category collapses to a single field. This is purely visual (the underlying field is never cleared programmatically), so editing an older item that happens to have Author data set doesn't silently lose it. In Add mode, the row is always single-field regardless of category (Author is never shown there at all).

Edit (`openEditModal`) always opens directly to the review-screen layout — no category grid, no search/folder-picker step, no back icon.

#### Movie's "Videos" folder — a special case throughout
This folder (`default-movies-videos`) is for manually-added video clips (YouTube/Vimeo), not real movies, so it opts out of most of the category's normal machinery:
- **No title search, no Wikipedia enrichment** (`updateTitleSearchUi`/`handleTitleSearch`/`kickOffTitleEnrichment`, `addEditModal.js`) — a clip's title often coincidentally matches an unrelated real movie's Wikipedia page, which used to silently overwrite the item with that movie's summary/director/poster (a real bug, found and fixed this session — see `detailModalSummary.js`'s `_needsItemWiki` exclusion, which also stops this from happening later just from *viewing* the item, independent of how it was added).
- **URL field relabeled "Video URL"** with a `youtube.com/watch?v=…` placeholder, and the old separate "Video URL" field (`#youtube-url-group`, driven by `item.youtubeUrl`) is hidden — the plain URL field (`item.url`) is the one actually read by the thumbnail-fetch and lightbox features below.
- **Thumbnail**: Microlink (used for every other category's post-save image fallback) actively blocks YouTube with an anti-bot error, so `fetchVideoThumbnail(url)` (`api.js`) gets it straight from the host instead — YouTube's `img.youtube.com/vi/<id>/hqdefault.jpg` is a plain predictable URL (no request needed, id extracted via `getYoutubeVideoId()`, `utils.js`); Vimeo goes through its public oEmbed endpoint. No summary source exists without an API key, so summary stays empty rather than guessing.
- **Detail-modal lightbox**: clicking the featured image opens an embedded YouTube/Vimeo player (`openVideoLightbox()`/`closeVideoLightbox()`, `detailModal.js`, new `#video-lightbox-overlay` in `index.html`) instead of the plain image-zoom lightbox every other category gets — `getVideoEmbedUrl()` (`utils.js`) builds the iframe `src`. The image dims on hover (`.detail-image--clickable`, same treatment Music Album's clickable gallery image already had).
- **Author-field placeholder is "Creator"**, not "Director" (a YouTube upload has a channel/uploader, not a director).

### Card badges (grid/list cards)
Every card's badge (top-right, e.g. "BOOK"/"FILMS") is colored by category (`badge-${catClass(category)}`, unchanged) but shows the item's **folder name** instead of the generic category label when it has one — e.g. a Book in the "Authors" folder shows "AUTHORS", not "BOOK". This replaced a separate folder-icon label that used to sit next to the badge; one badge now conveys both. "Favorites" folders are excluded (shows the plain category label instead, since Favorites isn't a real subfolder of the category).

### Search & Sort
Two deliberately distinct searches, plus sort:

- **Sort dropdown** (`sortSelect.js`) — a custom-styled trigger+panel (not a native `<select>`), showing a static "Sort" label (the current choice is only surfaced via the panel's own highlighted row + a hover tooltip). Options: Newest/Oldest first (by save date), A → Z / Z → A (title), Release Date (Newest/Oldest) — the latter two sort by an item's `year` field. Its last row is a real text input that filters **the current page only** — the same mechanism the Kanban board's own search already used.
- **Header search icon** (`globalSearch.js`) — a true library-wide search across every category/folder ("All My Saves"), shown as a results dropdown panel (thumbnail/title/category, same visual language as the Add-modal's own title search) rather than filtering the current page. Clicking a result opens that item's detail modal directly. Fully separate state from the sort dropdown's page-search, so neither can cross-wire the other.

### Category Landing Pages
Every top-level category tab except Musician/Music Album (`renderCategoryFolderLanding()`, `renderGrid.js`) shows its real subfolders as a picker grid of solid-purple square cards (icon, name, save count) instead of a flat item list — clicking a card goes to that folder's own real page. Below the folder cards sits a "Featured Saves" center-emphasis carousel (`categoryCarousel.js`, `renderCategoryCarouselHtml()`) that loops infinitely (reusing `dashboard.js`'s own `_wireCarouselArrows` mechanics). Its content, in priority order: (1) that category's own most-recently-saved personal items (`getRecentCategoryItems()`, `renderFilters.js`), if the user has any; (2) for Films/Books/Games specifically, that category's own VoteCraft (Top 100) landing-page row content (`resolveGenreRowItems()`, `renderCuratedPages.js`) as the "nothing saved yet" fallback; (3) every other category falls back to the original generic chain (`resolveFavoriteSlides()`, `dashboard.js` — real global favorites, else admin-configured demo cards, else curated Top 100 Musician/Album). The Music/Musician category is explicitly excluded from the whole feature — it keeps its own 15-card genre-bucket picker instead (see "Music landing page" in Recent Additions).

**Curated genre drilldowns get the same treatment.** A curated genre×category page (e.g. the "Shows | Votecraft" Top 100 page, `genre:<genre>:<category>`) also renders this same folder-picker + carousel shape (`renderCuratedCategoryFolderLanding()`), sourced from `CURATED_ITEMS` instead of `state.items`. This required adding a genuine `folderId` field to curated Firestore items (absent before this session — curated data had no folder concept at all) — threaded through `_loadCuratedFromFirestore()` (`storage.js`) and matched via `matchesFolder()`/`getCuratedCategoryFolderCounts()` (`renderFilters.js`), the curated-data equivalents of the personal `matchesPrimaryOrUnfoldered()`/`getCategoryFolderCounts()`. Clicking a folder card goes one level deeper via a new `genre:<genre>:<category>:<folderId>` view shape, with its own "Nothing here now" empty-state copy (distinct from the plain-folder "Nothing here yet") for folders with no tagged curated content yet.

### Saved Lists / Curated Lists (sidebar, under Dashboard)
Two independently-collapsible rows nested under the sidebar's Dashboard entry, each with its own user-creatable, user-named list of child rows ("+ New folder"):

- **Saved Lists** — seeded with Favorites/Health/Motivation (`savecraft_saved_lists`). Clicking a child row filters the grid to that list's items (`state.view = 'savedlist:<id>'`) — "Favorites" checks `item.favorite`, every other list checks `item.savedListId` (set from the detail modal's star icon, see below). Child rows use the same plain folder icon a real subfolder row uses, no boxed container.
- **Curated Lists** — seeded with "Votecraft"/"RCV" (`savecraft_curated_lists_rows`). Only "Votecraft" has a real destination (links to the Votecraft List curated genre, same as the mobile header's "VoteCraft Picks" option) — every other row (RCV, anything user-added) is still an inert placeholder, not yet wired to a view.

The detail modal's star icon (top-right icon column) opens a small "Save to:" menu — a radio-style (single-select, tap-to-deselect) list of every entry in `state.savedLists` — instead of directly toggling favorite/unfavorite.

### Share (dropdown + modal)
The header's Share button has an arrow revealing a dropdown: **Export as CSV**, **Export as Markdown** (local file downloads of whatever's in the current view), and **Embed options** (opens the Embed Builder, see below). The Share button itself opens a modal for sharing a link:
- A scrollable, single-select list of the user's Saved Lists — picking one shares that list's own items instead of whatever's currently open in the sidebar; the link itself is a frozen, one-time base64-encoded snapshot (`buildShareUrl()`, `share.js`), pointing at `savecraft/view.html` (a real hosted static page, not the extension).
- **"Anyone with the link"** on/off toggle — off grays out both Copy link and Send (client-side only, no real access-control backend behind it).

### Embed Builder
Reached via the Share dropdown's **Embed options** button (`</>` icon) — a new full-screen pseudo-view (`state.view === 'embed-builder'`, `embedBuilder.js`) for building a customizable slider/carousel of specific saved assets, meant for pasting onto an external website as an `<iframe>`. Single screen throughout, no wizard-style step transitions — only the Assets panel's own content changes in place as the user picks a source:

1. **Choose a source** — a top-level category-tile grid (visually identical to the Add Item wizard's own first screen) leads into either that category's own individual folders (with an "All X" tile for the whole section, same `matchesPrimaryOrUnfoldered` rule the sidebar's category tabs use) or a searchable, cross-category **Custom Slider** picker for a hand-built list not tied to any one folder. Folder/section sources start fully checked (opt-out); Custom Slider starts empty (opt-in).
2. **Asset list** — checkbox include/exclude, drag-and-drop (or up/down button) reorder.
3. **Style panel** ("Style slider") — visible slide count, slide spacing (4-24px), autoplay + speed, arrow/dot/both nav style, a preview-only dark theme, aspect ratio, a curated web-safe font list, and a "Powered by SaveCraft" branding toggle — all reflected live in a carousel preview (reusing `dashboard.js`'s `_wireCarouselArrows`) that shows gray placeholder slides before any real assets are picked.
4. **Embed code** — a URL + Copy pill (styled like a native share-link box), always visible, generating a link via the same base64 encoding `buildShareUrl()` uses, extended with the style config. Points at `savecraft/embed.html`, a hosted page that **doesn't exist yet** — Copy works today, the link itself is scoped/deferred work (see Roadmap).

Nothing in the Embed Builder persists to storage yet — closing it discards the in-progress config. A phased follow-up (Firestore persistence for a "live" embed, a Profile page "Your Embeds" section, then the actual hosted rendering page) was scoped and approved but not built this session.

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
  favorite: boolean,       // replaces the old folder-based Favorites mechanism entirely; also drives the "Favorites" Saved List specifically (see Saved Lists below)
  savedListId: string | null, // which Saved List (other than Favorites) this item belongs to, set via the detail modal's star "Save to:" menu — singular, not an array (matches the menu's radio semantics)
  genre: string | null,    // Music Album only; not currently rendered anywhere
  year: string | null,     // Music Album only; 4-digit release year
  collectionId: number | null, // Music Album only; iTunes collection ID, used to fetch the Song List
  authorHasMore: boolean | undefined, // Movie only — true for a co-directed movie, shows "…" after the lead director's name on the card/byline (display-only, never part of the name used for navigation)
  manualOrder: number | undefined,    // Kanban only — sequential position within its column once the user has dragged it; only meaningful when that column's state.kanbanSort is 'manual' ("Custom order")

  // My Notes (every category except Book) — see detailModalNotes.js's renderNumberedNoteList()
  noteCount: number | undefined,       // highest row number added via "+ Add Note", defaults to 3
  noteFavorites: number[] | undefined, // which row number(s) are currently expanded — in practice always 0 or 1 entries, since opening a row closes any other
  noteTexts: Record<number, string> | undefined,  // row number -> sanitized note HTML
  noteTitles: Record<number, string> | undefined, // row number -> custom row title (only present once renamed away from the default "Note"/"Summary")
  noteZeroSeeded: boolean | undefined, // stops row 0's old-notes/bio fallback text from reappearing once the user has edited (or intentionally cleared) it

  // Book's Chapters — folded into the My Notes accordion instead of a separate one; same shape as above, prefixed chapter* instead of note*
  chapterCount: number | undefined, chapterFavorites: number[] | undefined, chapterNotes: Record<number, string> | undefined, chapterTitles: Record<number, string> | undefined, chapterZeroSeeded: boolean | undefined,

  bioNotesSeeded: boolean | undefined, // Musician only — stops the Wikipedia-bio fallback (My Notes' row 0) from reappearing after an intentional edit/clear

  // Music Album's Song List — per-track, keyed by the track's own number (not a sequential row index like above)
  favoriteTracks: number[] | undefined,        // which track number(s) are currently expanded
  trackNotes: Record<number, string> | undefined, // track number -> sanitized note HTML
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
| `savecraft_saved_lists` | Saved Lists (`{ id, name }[]`) — Favorites/Health/Motivation seeded, plus user-added ones; membership lives on the item itself (`item.favorite`/`item.savedListId`), not here |
| `savecraft_curated_lists_rows` | Curated Lists' own child rows (`{ id, name }[]`) — seeded with "Votecraft"/"RCV" |

---

## Syncing (Firestore)

Personal items/folders/authors sync to `savecraft_users/{uid}/{items|folders|authors}` via the
Firestore REST API (no SDK — see `storage.js`'s `_firestoreUpsert`/`_firestoreListCollection`/
`_firestoreQueryUpdatedSince`). `runInitialSync()` (called on every app launch, not just sign-in)
reconciles local `chrome.storage.sync`/`localStorage` against the cloud.

- **Incremental by default.** `_mergeCollection()` dispatches to either a full listing
  (`_mergeCollectionFull`) or a cheap "what changed since my last sync" query
  (`_mergeCollectionIncremental`, via `_firestoreQueryUpdatedSince`'s `:runQuery` structured
  query on the `updatedAt` field every write already carries). A full listing only runs on a
  device's very first sync (no local cursor yet) and, as a safety net, at least once every 24h
  afterward — the only path that can catch a local item whose own push to Firestore silently
  failed and was never retried, which an incremental query can't detect. The cursor
  (`savecraft_sync_cursor_<subcollection>`) is the max `updatedAt` actually seen, not the local
  clock's own `Date.now()` — deliberately clock-skew-tolerant.
- **Deletes are soft (tombstones), not real Firestore deletes.** `removeItem()`/`removeFolder()`
  write `{ deleted: true }` (via `_firestoreUpsert`, a full-document replace) instead of calling
  `_firestoreDelete` — an actually-deleted doc is invisible to a "changed since X" query, so
  without a tombstone, other devices' incremental syncs would never learn the item was removed.
  Both merge paths check `doc.deleted` and remove the item locally instead of writing it down.
  Tombstones are never pruned/garbage-collected (deferred — not needed yet, they're tiny).
- **"Cloud wins"** on any id present in both places during a merge; a local-only doc (never
  synced) gets pushed up. `_stripSyncMeta()` strips the `updatedAt` bookkeeping field before a
  cloud record is written back into local storage — it must never leak into the shape the rest
  of the app expects.
- **Known constraint: the Firebase project (`votecraft-789`) is on the free Spark plan** —
  50,000 Firestore reads/day, *project-wide*, shared across every visitor/device, not per-user.
  Before the incremental-sync rewrite above, a full re-listing of every collection on *every
  single page load* was the dominant read cost and hit this cap twice in one day of live
  testing. If it recurs, `main.js`/`auth.js` now surface a visible red "Sync error: Quota
  exceeded" banner (`showSyncErrorBanner()`) instead of failing silently — check that banner
  before assuming a sync bug. The user has twice declined upgrading to Blaze (pay-as-you-go,
  removes the cap) when asked directly; don't re-offer it unprompted.

---

## External APIs

| API | Used for | Auth required |
|-----|----------|---------------|
| iTunes Search/Lookup API (`itunes.apple.com`) | Fetch Albums modal, Add modal search (Musician/Music Album/Show), curated data population, artist photo fallback, album year/collectionId backfill, Song List track lookup | None — free, public |
| Open Library (`openlibrary.org`, `covers.openlibrary.org`) | Add modal search for Book | None — free, public |
| Steam Store (`store.steampowered.com`, `cdn.akamai.steamstatic.com`) | Add modal search for Game | None — free, public |
| Microlink (`api.microlink.io`) | Fetch og:image for right-click saves | None |
| Firestore REST (`firestore.googleapis.com`) | Curated item data (read-only at runtime) | None for reads; Firebase Auth required for writes |
| MusicBrainz (`musicbrainz.org`) → Wikidata (`www.wikidata.org`) | Resolving a Musician's official website; release-group lookup feeding the Cover Art Archive gallery below | None — free, public |
| Cover Art Archive (`coverartarchive.org`) | Music Album gallery — additional cover art (front/back/booklet scans) beyond the single iTunes image, checked on demand via the lightbox's "Check for more art" button | None — free, public |
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
| Phase 1.5 | ✅ Active | Accounts + Firestore sync + Profile page — see "Recent Additions" above. The Profile page itself is intentionally still browsable without signing in (a demo persona shows until "Manage account" is used); signing in is what unlocks cross-device sync, not a requirement to use the extension at all |
| Phase 2 | Planned | Spotify integration for Musician/Music Album richer artist data (photos, full discography) |
| Phase 3 | Unblocked, not built | Sharing with contacts — Firebase Auth + Firestore write access now exist (Phase 1.5); the sharing feature itself still isn't built |
| Phase 3.5 | Scoped, not built | Embed Builder backend — a public, sign-in-gated `savecraft_embeds` Firestore collection (mirroring the existing `curated_items` public-read/admin-write-only rule pattern), a "Your Embeds" section on the Profile page, and the actual hosted `savecraft/embed.html` rendering page + generated `<iframe>` snippet. The client-side Builder UI itself (source picking, style panel, live preview, "Embed code" link) is already built — see "Embed Builder" above |
| Phase 4 | Planned | AI recommendations (requires Claude API via Firebase Function) |
| Chrome Web Store | Future | One-time $5 developer fee; publish when Phase 1 is stable |
