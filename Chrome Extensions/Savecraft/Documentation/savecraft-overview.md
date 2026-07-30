# SaveCraft — Project Overview

SaveCraft is a Chrome extension that acts as a personal media library. Users save links to movies, shows, music, books, games, and other content they want to experience. Curated recommendations from Votecraft are surfaced alongside personal saves, and a Kanban board ("My Saves Queue") lets users track what they've watched, read, or listened to.

---

## Recent Additions (latest session)

This session replaced the Music Album gallery's single low-res iTunes cover with a real multi-image gallery sourced from MusicBrainz + the Cover Art Archive, then iterated through several rounds of UI polish on the detail modal.

- **MusicBrainz + Cover Art Archive album art gallery** — the detail modal's featured image lightbox is no longer a single static photo. `fetchAlbumArtFromMusicBrainz(artist, title)` (new, `api.js`) searches MusicBrainz's release-group endpoint (confident-match-only: exact title+artist or MusicBrainz `score >= 90`, else no match), then queries Cover Art Archive's `/release-group/{mbid}` endpoint, which aggregates every scanned image (front, back, medium/disc, booklet/insert pages, etc.) across any release in that group — capped at 20 images, sorted Front → Back → API order. Deliberately does **not** fall back to a per-release search on a miss, to keep it to one MusicBrainz call per check. Results are cached forever (cover art doesn't change) in a new `state.albumArtCache` / `chrome.storage.local` key `savecraft_album_art_cache`, keyed by iTunes `collectionId` when known, else normalized `artist|title` — new `getCachedAlbumArt()`/`ensureAlbumArt()` in `authors.js` (mirrors the existing `ensureAlbumTrackList` cache pattern). For a personal (non-curated) item, a found "Front" image also opportunistically upgrades `item.imageUrl` via the existing `applyArtistPhotoToItem`/`patchCardImage` helpers — curated preview items stay gallery-only, never mutated.
- **Lightbox became a real gallery** (`detailModal.js`, `index.html`) — `openImageLightbox()` now takes an array of `{full, thumb, type}` images plus a start index, with new `showNextImage()`/`showPrevImage()` exports and a thumbnail strip (click-to-jump, active-state border) rendered below the full-size image. Left/Right arrow keys and on-screen prev/next chevrons navigate; a single-image call (the default, before any extra art has been checked) renders exactly as before — no arrows, no strip.
- **"Check for more art" button** — deliberately fetched **on demand only** (a manual button, not automatic on modal open), to respect MusicBrainz's ~1 req/sec rate limit and avoid firing background requests across a whole saved library. Went through a placement iteration: first tried as a small pill on the header thumbnail's bottom-right corner, then moved into the lightbox itself, sitting directly below the full-size enlarged image (matching a reference screenshot) — more room, more discoverable, and it's genuinely part of "looking at the art," not the thumbnail. Styled purple/white. Shows "Checking…" while in flight; on a genuine fetch failure shows "Couldn't check — Retry"; on success — whether or not extra art was found — the button disappears permanently for that album (so it can't be re-clicked into a dead end; this is intentional even for the zero-results case, worth knowing if a "why doesn't the button show up" question comes up again for an album already checked). If the check completes and finds nothing extra, an `alert("No data available currently")` pop-up tells the user so, rather than silently doing nothing.
- **Album art hover-dim** — the modal's featured image now dims (`filter: brightness(0.7)`) and shows a pointer cursor on hover, scoped to Music Album only via a new `.detail-image--clickable` class (signals it's clickable to open the gallery).
- **"Your Statement" sponsored-tag callout flipped to open downward** — previously opened upward from the badge (which sits at the bottom edge of the featured image), overlapping the artwork on hover. Now opens below the badge instead, with the pointer-tail triangle flipped to point up into it — never covers the image.
- **Year removed from the Music Album detail modal** (kept on grid cards, untouched) — the purple "Artist | Year" line under the title is now just "Artist"; `_albumArtistYearHtml` and the now-dead `.detail-album-artist-year` CSS were removed.

---

## Recent Additions (previous session)

This session seeded 214 more IMDb Top 250 movies into curated Top 100, then reshaped "Curated SaveCraft" into a real two-tier browsing experience, and wired up the previously-dead "Shared Saves" dropdown item for the first time.

- **214 more movies seeded into curated Top 100** — diffed the user's pasted IMDb Top 250 list against what was already in Firestore (103 movies), resolved a real Wikipedia article for each of the 214 missing titles, and wrote them all via the same disposable-Firebase-Auth-account technique used in prior sessions (`_CURATED_CACHE_VERSION` bumped 9 → 10). A stricter validator was needed mid-way through — the first pass had wrongly matched several generic-word titles to unrelated Wikipedia articles (e.g. "Casino" → the gambling-facility concept page, "Heat" → the 2013 comedy instead of the 1995 Michael Mann film); both caught and hand-corrected. One title (a 2024 anime compilation film with no standalone English Wikipedia article yet) links to IMDb instead, as a documented exception.
- **Hamburger dropdown polish** — "Home" relabeled "My Saves," and "Shared Saves"/"Curated SaveCraft" both gained icons (user-supplied inline SVGs).
- **Curated SaveCraft split into two tiers** — the existing hero+carousel-rows page (previously the direct top-level landing) moved one level deeper, internally called **"Curated-full-list"**, reached via a "See all →" button. The actual top-level "Curated SaveCraft" landing is now a new, bare-bones **`renderCuratedBareList()`** — an ActBlue-inspired flat list: a short gradient banner, a "Cause Area" filter rail (grew from 6 to 10 categories) that actually filters the list client-side, a "Why Curated Lists" blurb, and boxed org rows (avatar circle, name, one-line tagline, cause-area tag, a purple pill "View" button, plus a demo-only hover bookmark icon that toggles purple on click but isn't wired to the Kanban queue or any persistence — this whole page is a pitch/demo surface, same spirit as the Top 100 landing page it sits alongside).
- **"Shared Saves" wired up for the first time** — previously a complete no-op in the dropdown. Now a real page (`sharedSaves.js`, new file): a "Lists You Follow" section showing a real, clickable portal card per genre the user follows via Profile → Interests (the first actual reader of `state.followedCuratedLists`, which had sat write-only until now), plus the Friends "coming soon" stub moved here from the Profile page (whose widget grid shrank from four cards to three accordingly).

---

## Recent Additions (older session)

This session started with a quick-queue bookmark button for curated cards, then built a real landing page for the "Top 100" curated genre — previously a bare "Pick a category" empty state — meant to double as a live demo when pitching nonprofits on creating their own SaveCraft-sponsored curated lists (the existing Sponsored Statement pitch page, `src/sponsored/sponsored.html`, had zero visual demo of what a sponsored list actually looks like; this closes that gap without touching that page itself). Explicit design goal for the landing page: feel like a distinct, fun destination, not a reskinned Dashboard widget, while staying cheap to build.

- **Quick-queue bookmark on curated cards** — a hover-revealed bookmark button in the same corner personal cards use for edit/delete (curated cards had no actions there before), letting the user queue a curated item straight from its card without opening the detail modal; tapping it again un-queues it. Shown on the main grid and author/creator profile pages, deliberately not on Kanban cards (separate markup). Extracted the curated-to-personal promotion logic that used to be private to the detail modal's own "Add to Queue" button into a shared `ensureLiveItem(item)` in `authors.js`, so both call sites share one implementation. Also fixed the Sponsored Statement badge disappearing the moment a Top 100 item got queued — it was gated on `item.curated`, which flips to `false` once `ensureLiveItem()` promotes it; now checks the item's id against the real curated data instead, so the badge persists once bookmarked but still never appears on anything the user added themselves.
- **New `renderCuratedGenreLanding()`** (`render.js`) — wired into `renderGrid()`'s existing empty-state branch, scoped specifically to `state.view === 'genre:Top 100'` (every other curated genre still gets the plain original empty state). Content (headline, description, which categories get a row) lives in `CURATED_GENRE_LANDING_CONTENT` in `state.js`, keyed by genre so a future sponsored genre could reuse this same rendering path later with zero new code — only `'Top 100'` is populated today.
- **Netflix-style horizontal rows** — one per category (Musician, Movie, Book, Game; Music Album and Visual Art deliberately excluded — see Curated SaveCraft below), each a `.dash-carousel` reusing the Dashboard's own proven scroll-snap/infinite-loop mechanics. `dashboard.js`'s previously-private `_wireCarouselArrows()` is now exported and generalized (`strip.querySelector('.dash-thumb-card')` → `strip.firstElementChild`) so it works for any card shape, not just the Dashboard's own. The row cards themselves (`.top100-row-card`) are new/distinct from the Dashboard's `.dash-thumb-card` — landscape thumbnails (264×149, ~16:9) with a hover lift, not the Dashboard's compact 170×112 style — so the page reads as its own thing despite sharing the underlying scroll code.
- **Real cover art, not a fallback icon** — the rows initially skipped the image-resolution pipeline every other curated view uses and mostly showed the emoji fallback. Fixed: rows now merge `state.curatedImgCache`/`state.artistBioCache` the same way `getFilteredSortedItems()` does, then trigger the existing `fetchMissingCuratedImages()`/`fetchMissingCuratedMusicianPhotos()` for anything still missing. `patchCardImage()` (`utils.js`) gained a second branch so its live-patch-on-fetch behavior reaches `.top100-row-card` elements too (different DOM shape than `.card`, so patched separately).
- **Quick-queue bookmark on every row thumbnail** — same hover-revealed bookmark button personal/main-grid cards already have (gray circle, purple icon once queued — the icon-only "no circle" look from earlier this session turned out hard to see against varied thumbnail art, so the gray circle backdrop is back for the active state too, everywhere this button appears). `wireQuickQueueButtons()` was generalized to patch every DOM copy of a clicked item's bookmark, not just the one clicked — the rows triple each item for the carousel illusion, so the same item's button can appear 3× in the DOM and needs to stay in sync.
- **Real VoteCraft branding** — a purple gradient hero band with the actual VoteCraft wordmark (`images/logos/votecraft-logo_white.png`) and a square icon mark in a LinkedIn/cover-photo-style badge overlapping the hero's bottom-left edge (`images/logos/votecraft_icon_white.png`, in a solid-color box bordered in `var(--bg)` so it reads as "cut out" of the banner). Both assets added to `manifest.json`'s `web_accessible_resources`, matching the existing Rolling Stone/Steam logo convention. The text block has its own left padding to stay clear of the badge horizontally rather than overlapping it.
- **CTA banner** at the bottom linking to the existing Sponsored Statement page (`chrome.runtime.getURL('src/sponsored/sponsored.html')`) — the actual "make a nonprofit excited" funnel, built without touching that page's own content in this pass.
- **Sort dropdown relocated below the hero, page title hidden** — the standard `#grid-title` ("Top 100 Saves") and `.grid-header` toolbar are hidden for this view (the hero is the real header now — the sidebar's own "Top 100 Saves" back-button label is untouched), and the real singleton `#sort-select` node is physically moved into the new layout, right-aligned below the hero, instead of duplicating it. Since it's the same DOM node (not a clone), `renderGrid()` now restores it to its normal `.grid-header` home at the very top of the function, before any view's rendering logic runs — necessary so a plain `container.innerHTML = ...` in some other view can never destroy it as an orphaned child of `#cards-grid`.
- **Plus-in-circle button next to each row title** — sits right after the title text (e.g. "Top Musicians ⊕"), distinct from the existing "See all →" affordance further right. Does the exact same thing clicking the row header already does (no separate click handler — it's a child of `.top100-row-header`, covered by that element's existing click listener via normal event bubbling); `.top100-row-header` changed from a `<button>` to a `<div>` since it now needs to contain a real `<button>`. Styled to match `.kanban-expand-btn` (`kanban.css`) exactly, including its stroke-based plus icon — a direct request to reuse that established visual language rather than inventing a new button style.
- **"Top 100" title links back to the landing page** — on any Top 100 drilldown (e.g. "Top 100 Books" next to the Rolling Stone logo, "Top 100 Games" next to Steam, "Top 100 Films" next to the NYT logo, or a plain "Top 100 `<category>`" for anything without a source-attribution logo), just the "Top 100" word is a link back to `genre:Top 100` — the category name stays plain text. Reads as ordinary title text until hovered (`.grid-title-link` in `cards.css`), not an obviously separate button.

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

The library used to be one ~3,700-line `app.js`. It's now split into 30 ES modules, loaded via `<script type="module" src="js/main.js">` in `index.html`. Modules import/export between each other (some circularly — safe under ES modules since nothing is called at module-evaluation time, only from inside functions):

| Module | Responsibility |
|--------|-----------------|
| `state.js` | Shared `state` object + static constants (`CATEGORIES`, `CAT_LABEL`, `CAT_EMOJI`, `CATEGORY_PLATFORMS`, `CREATOR_CARD_CATEGORY`, etc.) |
| `storage.js` | All `persist*`/`remove*` functions, `loadAll()` (incl. one-time backfill migrations), Firestore curated-data loading (`_loadCuratedFromFirestore`, `initCuratedItems`), Firestore dual-write helpers for the account-sync feature |
| `utils.js` | Pure helpers: `escapeHtml`, `catClass`, `debounce`, `formatTrackDuration`, `patchCardImage`, `getDomain`, `getListIds`, etc. |
| `api.js` | External network calls: iTunes, Open Library, Steam, Wikipedia, MusicBrainz/Wikidata/Cover Art Archive, YouTube, Last.fm, Steam Web API (unset API key constants live here) |
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
| `kanban.js` | Kanban board rendering, drag-and-drop (cross-column + within-column reorder) — `KANBAN_DEMO`/`KANBAN_COLUMNS` exported for reuse by the Dashboard |
| `detailModal.js` | Orchestrator for the item detail modal — re-exports `openDetailModal`/`closeDetailModal`/`getDetailItem`/`openImageLightbox`/`closeImageLightbox`/`showNextImage`/`showPrevImage`/`handleGalleryLoadMoreClick`; the modal's actual sections live in the 5 modules below (2026-07-29 split — was one ~990-line file). The lightbox is a real multi-image gallery now (see Recent Additions), tracked as module-private `_galleryImages`/`_galleryIndex`/`_galleryLoadMore` |
| `detailModalAccordions.js` | Shared accordion open/close registry (`registerAccordion`/`closeAccordionsExcept`/`resetAccordions`) every other detail-modal section registers with, instead of each hand-listing every other section's DOM elements |
| `detailModalHeader.js` | Image, sponsored "Your Statement" tag, bookmark/favorite icons, title/author/publication line, Official Website CTA |
| `detailModalSummary.js` | Summary/Albums accordion — Musician's known-albums list, Book/Show/Movie/Game's item summary, or the Visual Art placeholder |
| `detailModalNotes.js` | My Notes + Tracklist/Chapters accordions — kept in one module since Books fold their chapter list directly into My Notes, sharing its open/close state |
| `detailModalQueue.js` | Web Links + Queue accordions, incl. `toggleQueueFromHeader()` (called by `detailModalHeader.js`'s bookmark button) |
| `addEditModal.js` | Add/Edit item modal — the 3-screen add wizard (category → search → review) plus the single-page Edit form |
| `fetchAlbumsModal.js` | Fetch Albums (bulk iTunes import) modal |
| `dashboard.js` | The Dashboard home page — hero collage + 4 widget cards (see "Dashboard (Home Page)" below) |
| `profile.js` | The Profile page — account info, Connections (Last.fm/Steam/Instagram), Interests, Your Music Taste |
| `sharedSaves.js` | The Shared Saves page — followed-curated-list portal cards + a Friends stub (new this session) |
| `share.js` | Share modal, CSV export, Markdown export |
| `main.js` | Entry point — search, sort, theme, sidebar collapse, mobile sidebar, `init()`, all DOMContentLoaded event wiring |

### `scripts/` (admin tooling, not loaded by the extension)

One-off HTML tools for seeding curated Firestore data — plain `fetch()` against the Firestore REST API + Firebase Auth REST API, no SDK, no build step. Each has a Sign In *and* Create Account button, so seeding doesn't require an existing SaveCraft login. Require the `curated_items` Firestore rule to temporarily allow `if request.auth != null` (revert to `if false` after running). Notable ones: `seed-book-authors.html` (83 Book Author docs), `seed-creator-cards.html` (249 Movie Director/Show Creator/Game Studio docs combined).

### `src/app/css/` stylesheets

Split along the same lines from the original `app.css`, loaded as separate `<link>` tags in a fixed order (order matters — later files can override earlier ones): `base.css` (reset, theme variables, header), `sidebar.css` (includes the collapsible desktop rail), `cards.css` (grid, cards, author pages), `detailModal.css`, `addEditModal.css`, `fetchAlbumsModal.css`, `kanban.css`, `dashboard.css`, `profile.css` (Profile page + its Connect Last.fm/Steam modals), `misc.css` (share modal, scrollbar, mobile responsive overrides).

The original monolithic `app.js`/`app.css` have been deleted (2026-07-29) — see `scripts/seed-curated.js`, which used to extract curated-item data out of `app.js` and now reads `scripts/seed-payload.json` instead.

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
- **Top 100 landing page** — clicking into Top 100 (before picking a category) shows a real landing page instead of the plain "Pick a category" state every other genre still has: a branded hero band, then Netflix-style horizontal rows (Musicians/Movies/Books/Games) with a quick-queue bookmark on every thumbnail, then a CTA linking to the Sponsored Statement pitch page. See "Recent Additions" and `renderCuratedGenreLanding()` in `render.js`. Built as a live demo for pitching nonprofits on sponsoring their own list.
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

- **Image** — 16:9 cropped cover (object-fit: cover). Music Albums dim on hover (`.detail-image--clickable`) and clicking one opens a full-screen gallery lightbox — a single image (the iTunes cover) until the user clicks the lightbox's own "Check for more art" button, which checks MusicBrainz + the Cover Art Archive for additional images (front/back/booklet scans) and, once found, turns the lightbox into a real gallery with prev/next arrows and a thumbnail strip. See "MusicBrainz + Cover Art Archive album art gallery" under Recent Additions for the full mechanism. Musicians no longer have a "Promo Vid" toggle — it was removed a prior session; a curated Top 100 item of any category instead shows the "⚡ Your Statement" badge in that same corner (its hover tooltip now opens downward, below the badge, instead of over the artwork).
- **Header overlay** — an "Official Website" pill overlays the top of the image for every category. For Musician/Music Album it resolves via MusicBrainz → Wikidata (cached per artist); every other category falls back to the item's own saved `url`.
- **Title area** — Musicians show their name with a clickable arrow to their author page. Music Albums show the artist name (in the brand purple) above the album title — the release year that used to appear on its own line here was removed; it's still shown on grid cards, just not in the modal.
- **Bookmark / Favorite** — the save/bookmark icon lives inside the "Add to Queue" button (for every category now); the top-right corner is a Favorite star instead. Favoriting is now a plain `item.favorite` boolean (see Recent Additions) — it no longer touches `item.folderId` or creates a "Favorites" folder.
- **Accordion rows** (icon + label + chevron, mutually exclusive — opening one closes the others):
  - **My Notes** — live-editable textarea, debounced auto-save, shown for every category.
  - Second row, category-dependent: **Albums** (Musician only — the artist's known albums, capped at 5 with a "See all →" link to their profile; always shown, even with zero known albums, as an empty placeholder row like Visual Art's below — every category keeps the same accordion row count) / **Song List** (Music Album only — the album's tracks, lazily fetched via the iTunes lookup API on first expand using the item's `collectionId`; a one-time backfill resolves `collectionId`/`year` for older items that predate this field) / **Summary** (Book, Show, Movie, Game — shows `item.summary`, auto-backfilled from Wikipedia if missing; see below) / **Placeholder** (Visual Art — reserved, intentionally empty for now).
  - **My Notes doubles as a bio fallback for Musician** — rather than its own separate read-only block, an artist's Wikipedia bio pre-fills the (still fully editable) My Notes textarea the first time the modal opens for them, same fallback pattern as Book's Chapter 0. An `item.bioNotesSeeded` flag stops it from reappearing once the user edits (or intentionally clears) that field.
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
| Phase 1.5 | ✅ Active (demo mode) | Accounts + Firestore sync + Profile page — see "Recent Additions" above |
| Phase 2 | Planned | Spotify integration for Musician/Music Album richer artist data (photos, full discography) |
| Phase 3 | Unblocked, not built | Sharing with contacts — Firebase Auth + Firestore write access now exist (Phase 1.5); the sharing feature itself still isn't built |
| Phase 4 | Planned | AI recommendations (requires Claude API via Firebase Function) |
| Chrome Web Store | Future | One-time $5 developer fee; publish when Phase 1 is stable |
