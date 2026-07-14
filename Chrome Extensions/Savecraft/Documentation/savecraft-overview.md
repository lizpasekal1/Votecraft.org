# SaveCraft — Project Overview

SaveCraft is a Chrome extension that acts as a personal media library. Users save links to movies, shows, music, books, games, and other content they want to experience. Curated recommendations from Votecraft are surfaced alongside personal saves, and a Kanban board ("My Saves Queue") lets users track what they've watched, read, or listened to.

---

## Recent Additions (latest session)

This session had two halves: a cleanup pass on the previous session's work, then a full rebuild of the browser-toolbar popup into a real wizard.

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

The library used to be one ~3,700-line `app.js`. It's now split into 15 ES modules, loaded via `<script type="module" src="js/main.js">` in `index.html`. Modules import/export between each other (some circularly — safe under ES modules since nothing is called at module-evaluation time, only from inside functions):

| Module | Responsibility |
|--------|-----------------|
| `state.js` | Shared `state` object + static constants (`CATEGORIES`, `CAT_LABEL`, `CAT_EMOJI`, `CATEGORY_PLATFORMS`, etc.) |
| `storage.js` | All `persist*`/`remove*` functions, `loadAll()`, Firestore curated-data loading (`_loadCuratedFromFirestore`, `initCuratedItems`), Firestore dual-write helpers for the account-sync feature |
| `utils.js` | Pure helpers: `escapeHtml`, `catClass`, `debounce`, `formatTrackDuration`, `patchCardImage`, etc. |
| `api.js` | External network calls: iTunes, Open Library, Steam, Wikipedia, MusicBrainz/Wikidata, YouTube, Last.fm, Steam Web API (unset API key constants live here) |
| `auth.js` | Email/password auth via the Firebase Auth REST API — no SDK, independent from any shared Votecraft account |
| `authors.js` | Author/musician profile CRUD, navigation, album-metadata backfill |
| `render.js` | `renderSidebar`, `renderGrid`, `renderCard`, `renderAuthorPage`, curated-image fetch helpers |
| `kanban.js` | Kanban board rendering and queue-status updates (`KANBAN_DEMO`/`KANBAN_COLUMNS` exported for reuse by the Dashboard) |
| `detailModal.js` | The item detail modal — largest module, all accordions live here |
| `addEditModal.js` | Add/Edit item modal — the 3-screen add wizard (category → search → review) plus the single-page Edit form |
| `fetchAlbumsModal.js` | Fetch Albums (bulk iTunes import) modal |
| `dashboard.js` | The Dashboard home page — hero collage + 4 widget cards (see "Dashboard (Home Page)" below) |
| `profile.js` | The Profile page — account info, Connections (Last.fm/Steam/Instagram), Interests, Your Music Taste, Friends |
| `share.js` | Share modal, CSV export |
| `main.js` | Entry point — search, sort, theme, sidebar collapse, mobile sidebar, `init()`, all DOMContentLoaded event wiring |

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
- **Left sidebar** — category navigation plus a "My Saves Queue" entry that switches to the Kanban view. Musicians has a permanent Music Albums subfolder. Collapsible on desktop to a 64px icon-only rail (toggle button in the sidebar header, top-left) — collapse state persists across reloads via `chrome.storage.sync`. The mobile drawer is unaffected (full-width overlay, unchanged).
- **Dashboard (Home)** — the persistent landing page shown on every app open; see its own section below
- **Main grid** — responsive card grid of saved items with cover images, filtered by the selected category/search
- **Curated SaveCraft** — a separate sidebar mode surfacing Votecraft-curated recommendations from Firestore, organized by genre and category
- **Kanban board** — "My Saves Queue" view with four columns: In Queue, In Progress, My Review, Done

### Dashboard (Home Page)
`js/dashboard.js` + `css/dashboard.css`. A persistent home page — the first thing shown on every app open (`main.js`'s `init()` forces `state.view = 'dashboard'` before the first render, regardless of whatever view was last active; the real last-active view stays saved in `chrome.storage.sync` untouched, so it's still there once the user navigates away from the dashboard). Reachable at any time via the sidebar's "🏠 Home" mode-tab (mobile drawer) or the "🏠 Home" entry at the top of the desktop hamburger menu (`#my-options-dropdown`).

- **Hero collage** — a time-of-day greeting ("Good morning"/"afternoon"/"evening"/"night") over an ambient, auto-scrolling horizontal strip of up to 24 rotated cover-art thumbnails, pulled from the user's own saved items (falling back to curated Top 100 Musician/Music Album art if the library has fewer than 8 images). Pure CSS marquee (`@keyframes`, track duplicated once for a seamless loop), respects `prefers-reduced-motion`. No boxed/card background — the fade at the collage edges and behind the greeting text blends into the actual page background color, not a surface color.
- **Continue Your Queue** — a scaled-down peek at the real Kanban board: the same 4 columns/order/labels, laid out 2×2, each showing up to 2 mini cards (thumbnail + title) with a "+N more" indicator. Clicking a mini card opens its detail modal directly; "Open Board →" navigates to the real board. Shows the same demo card (`KANBAN_DEMO()`, exported from `kanban.js` for reuse here) the real board shows when there's nothing queued yet.
- **Favorites Spotlight** — an auto-rotating slideshow (prev/next arrows, dot indicators, pause-on-hover, ~4.5s auto-advance) cycling through every item favorited in *any* category (a new aggregator, `getAllFavoriteItems()`, walks every "Favorites" folder — no existing helper did this across categories). Falls back to curated Top 100 Musician/Music Album picks tagged "✨ Demo · Top 100" when the user has no favorites yet. Clicking the active slide opens its detail modal.
- **Curated Lists** — a horizontal strip of `CURATED_GENRES` chips (Top 100, Jazz, Classic, Fantasy, etc.), styled with the same glossy `.cat-icon` chip used in the sidebar. Clicking one navigates into the existing curated genre-landing route — fully functional, no new routing.
- **Profile** — a decorative placeholder only (generic avatar, "Your Library", "Profile customization coming soon"). No real computed stats — there's no user-identity system to back it, and the Settings → Profile button elsewhere in the app is likewise a no-op today.

All 4 widget cards stretch to equal height and fill the available vertical space down to a bottom margin matching the top margin above the hero (`.dashboard-wrap` fills `.grid-area`'s content-box height; both share the same 24px padding by construction, not a hardcoded value).

### Author / Artist Profile Pages
Every author name on a card or in a detail modal is a clickable link. Clicking it navigates to a dedicated **author profile page** for that person within that category:

- **Profile header** — photo, name, bio, website link
- **Works grid** — all saved items by that author in that category. For **Musician** profiles, Music Album items by the same artist are also shown — including curated albums from Firestore where the artist name matches.
- Author profiles are stored in `chrome.storage.sync` under keys `author_<id>`
- Navigating to an author auto-creates a stub profile if one doesn't exist yet
- The URL view format is `author:<category>:<name>` (e.g. `author:Musician:Gorillaz`)

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
- **Music Albums** — 2,444 albums from those artists, each showing the artist name as a clickable link; the Music Albums subfolder under Musicians navigates to this view
- **Clicking a musician card** opens the detail popup; clicking the musician's name navigates to their profile
- **Curated cache** — data is cached in `chrome.storage.local` for 24 hours; cache is versioned so bumping `_CURATED_CACHE_VERSION` in `js/storage.js` forces a fresh fetch
- **Top 100 lists** — the "Top 100" genre shows a source-attribution logo next to the section title, indicating which outlet curated that list: Rolling Stone (Musicians, Shows, Books), The New York Times (Movies), Steam (Games). Hovering any logo shows a tooltip explaining the attribution. Curated categories are keyed by their singular `CATEGORIES` name internally (e.g. `genre:Top 100:Musician`, not `genre:Top 100:Music`) — this tripped up the logo-matching logic once before, so keep that in mind if extending it.

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
  id: string,          // 'itunes_<collectionId>' or 'artist_itunes_<artistId>' or 'cur-*'
  title: string,
  category: string,    // stored as plural in Firestore ('Movies', 'Music Album'), normalized on load
  genre: string,       // e.g. 'Top 100', 'Classic', 'Jazz'
  url: string | null,
  imageUrl: string | null,
  notes: string | null, // for Music Album entries: the artist name
}
```

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
- Firestore writes (for populating curated data) require temporarily setting `allow write: if true` on the `curated_items` rule in Firebase Console → Firestore → Rules. Always revert after.

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
