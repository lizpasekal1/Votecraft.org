# SaveCraft — Project Overview

SaveCraft is a Chrome extension that acts as a personal media library. Users save links to movies, shows, music, books, games, and other content they want to experience. Curated recommendations from Votecraft are surfaced alongside personal saves, and a Kanban board ("My Saves Queue") lets users track what they've watched, read, or listened to.

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
│   └── logos/                   — Source-attribution logos (Rolling Stone, Steam, NYT) used in Curated SaveCraft
├── rules/
│   └── youtube_referer_rules.json — declarativeNetRequest rule for YouTube embed Referer header
├── scripts/                     — One-off admin tooling to seed/update Firestore curated data (not loaded by the extension)
├── src/
│   ├── background/
│   │   └── background.js        — Service worker: context menus, badge, Microlink image fetch
│   ├── content/
│   │   └── content.js           — Injected into every page; reads og:image for right-click saves
│   ├── popup/
│   │   ├── popup.html           — Quick-save widget (shown when clicking toolbar icon)
│   │   ├── popup.css
│   │   └── popup.js
│   ├── sponsored/
│   │   └── sponsored.html       — Standalone "Sponsored Statement" page linked from curated Top 100 detail modals
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

The library used to be one ~3,700-line `app.js`. It's now split into 13 ES modules, loaded via `<script type="module" src="js/main.js">` in `index.html`. Modules import/export between each other (some circularly — safe under ES modules since nothing is called at module-evaluation time, only from inside functions):

| Module | Responsibility |
|--------|-----------------|
| `state.js` | Shared `state` object + static constants (`CATEGORIES`, `CAT_LABEL`, `CAT_EMOJI`, `CATEGORY_PLATFORMS`, etc.) |
| `storage.js` | All `persist*`/`remove*` functions, `loadAll()`, Firestore curated-data loading (`_loadCuratedFromFirestore`, `initCuratedItems`) |
| `utils.js` | Pure helpers: `escapeHtml`, `catClass`, `debounce`, `formatTrackDuration`, `patchCardImage`, etc. |
| `api.js` | External network calls: iTunes, Open Library, Steam, Wikipedia, MusicBrainz/Wikidata, YouTube (`YOUTUBE_API_KEY` lives here) |
| `authors.js` | Author/musician profile CRUD, navigation, album-metadata backfill |
| `render.js` | `renderSidebar`, `renderGrid`, `renderCard`, `renderAuthorPage`, curated-image fetch helpers |
| `kanban.js` | Kanban board rendering and queue-status updates (`KANBAN_DEMO`/`KANBAN_COLUMNS` exported for reuse by the Dashboard) |
| `detailModal.js` | The item detail modal — largest module, all accordions live here |
| `addEditModal.js` | Add/Edit item modal — the 3-screen add wizard (category → search → review) plus the single-page Edit form |
| `fetchAlbumsModal.js` | Fetch Albums (bulk iTunes import) modal |
| `dashboard.js` | The Dashboard home page — hero collage + 4 widget cards (see "Dashboard (Home Page)" below) |
| `share.js` | Share modal, CSV export |
| `main.js` | Entry point — search, sort, theme, sidebar collapse, mobile sidebar, `init()`, all DOMContentLoaded event wiring |

### `src/app/css/` stylesheets

Split along the same lines from the original `app.css`, loaded as separate `<link>` tags in a fixed order (order matters — later files can override earlier ones): `base.css` (reset, theme variables, header), `sidebar.css` (includes the collapsible desktop rail), `cards.css` (grid, cards, author pages), `detailModal.css`, `addEditModal.css`, `fetchAlbumsModal.css`, `kanban.css`, `dashboard.css`, `misc.css` (share modal, scrollbar, mobile responsive overrides).

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

Categories use **singular names** in storage and the Add Item dropdown, and **plural names** in the sidebar:

| Storage / dropdown value | Sidebar label |
|--------------------------|---------------|
| Book | Books |
| Game | Games |
| Movie | Movies |
| Musician | Musicians |
| Music Album | *(hidden — accessed via subfolder)* |
| Show | Shows |
| Visual Art | Visual Art |

The `Music Album` category is not shown as a top-level sidebar entry. Instead, a permanent **Music Albums** subfolder appears under **Musicians** in the sidebar. This subfolder also works in Curated SaveCraft mode, navigating to the curated music album list for the selected genre.

---

## Key Features

### Quick-Save Popup
Clicking the toolbar icon opens a small popup where the user can paste a URL and pick a category. The item is saved to `chrome.storage.sync` immediately.

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

- **Image** — 16:9 cropped cover (object-fit: cover). Musicians show a "Promo Vid" toggle (fetches a YouTube Data API-backed music video for the artist, filtered to the Music category) that swaps the photo for an inline video player; Music Albums show an "Album Art ▶" button that opens the full uncropped cover art in a lightbox. Other categories show neither toggle.
- **Header overlay** — an "Official Website" pill overlays the top of the image for every category. For Musician/Music Album it resolves via MusicBrainz → Wikidata (cached per artist); every other category falls back to the item's own saved `url`.
- **Title area** — Musicians show their name with a clickable arrow to their author page. Music Albums show a bold "Artist | Year" line (in the brand purple) above the album title. Other categories show a plain title (no arrow, not a link).
- **Bookmark / Favorite** — the save/bookmark icon lives inside the "Add to Queue" button (for every category now); the top-right corner is a Favorite star instead. Favoriting an item adds it to an auto-created "Favorites" folder for that item's category in the sidebar (the folder is removed again once nothing in it remains favorited).
- **Accordion rows** (icon + label + chevron, mutually exclusive — opening one closes the others):
  - **My Notes** — live-editable textarea, debounced auto-save, shown for every category.
  - Second row, category-dependent: **Albums** (Musician only — the artist's known albums, capped at 5 with a "See all →" link to their profile) / **Song List** (Music Album only — the album's tracks, lazily fetched via the iTunes lookup API on first expand using the item's `collectionId`; a one-time backfill resolves `collectionId`/`year` for older items that predate this field) / **Summary** (Book, Show, Movie, Game — shows `item.summary`, auto-backfilled from Wikipedia if missing; see below) / **Placeholder** (Visual Art — reserved, intentionally empty for now).
  - **Web Links** — same accordion treatment for every category.
- **Add to Queue** — a standalone pill button below the accordion stack for every category (rather than sharing a header row with Web Links, as it used to for non-music categories).

**Wikipedia fallback (Book/Show/Movie/Game only)** — when one of these items is missing an image or summary, `ensureItemWikipediaInfo(title, category)` looks the title up on Wikipedia, validated against category-specific keywords (e.g. a Movie result must mention "film"/"movie" in its description) with a category-biased search retry if the direct title match fails or is a disambiguation page — this stops a generic title (e.g. a movie called "Up") from pulling in the wrong same-named article. Results are cached indefinitely in `chrome.storage.local` (`state.itemWikiCache`), keyed by `category:title`. Note: Wikipedia serves non-free poster/cover art at reduced resolution for fair-use reasons, so fetched images are sometimes lower quality than the original source — this is a known limitation, not a bug.

For curated albums, the artist name is a clickable link in the title area (unless already on that artist's own page).

### Add / Edit Modal
**Add is a 3-screen wizard** (`js/addEditModal.js`), replacing the old single flat form:

1. **Category screen** — "What are you adding to?" plus a 7-tile category grid (icon + label, same icons as the sidebar). No back icon here (nothing to go back to).
2. **Search screen** — its own screen, header shows the selected category name. Live-typing (debounced ~500ms) searches a category-appropriate free API and shows a results dropdown (thumbnail + title + meta line). A "Can't find it? Add '...' manually" link/Enter-to-continue lets the user skip straight to the review screen with just a typed title if nothing matches. Visual Art has no search source — its tile jumps straight to the review screen.
3. **Review screen** (also used standalone for Edit — no search step there) — pre-filled Title/Author (or a single "Name"/"Title" field for author-less categories — see below), a small auto-fetched image preview, Summary, My Notes, Platforms, Image URL + URL (URL is optional — no longer required to save; Title is the required field instead).

A single back icon (top-left of the modal, mirroring the X close button top-right) steps back exactly one screen at a time — Review → Search (or straight to Category for Visual Art) → Category. Stepping back is non-destructive: the search screen's term/results are left exactly as the user left them. There's no bottom Cancel button anymore — the X icon, clicking outside, or Escape all close the modal.

**Per-category search source** (all free, no API key):
| Category | Source | Notes |
|----------|--------|-------|
| Musician | iTunes (`entity=musicArtist`) | No artwork on this entity — photo/bio arrive via the existing Wikipedia enrichment once a title is chosen |
| Music Album | iTunes (`entity=album`) | Full art/artist/year/URL directly from the search result |
| Show | iTunes (`entity=tvSeason`) | Deduped by `artistId` to one row per show, not per season |
| Book | Open Library (`openlibrary.org/search.json`) | Cover art via `covers.openlibrary.org` |
| Game | Steam (`store.steampowered.com/api/storesearch`) | Cover art via `cdn.akamai.steamstatic.com` |
| Movie | Wikipedia (`generator=search`) | iTunes's movie search is dead — verified live, 0 results for well-known titles since Apple moved movie purchases to the Apple TV app |
| Visual Art | *(none)* | Manual entry only, same as before |

Once a Review screen loads, background enrichment (`ensureArtistWikipediaInfo`/`ensureItemWikipediaInfo`, both already used elsewhere in the app) fills in Summary and upgrades the image a moment later, without blocking the screen from showing instantly.

**Title/Author field**: only Music Album (artist) and Book (author) show a separate Author field — every other category collapses to a single field, labeled "Name" for Musician and "Title" everywhere else, since a permanently-empty Author box was confusing. This is purely visual (the underlying field is never cleared programmatically), so editing an older item that happens to have Author data set doesn't silently lose it.

Edit (`openEditModal`) always opens directly to the review-screen layout — no category grid, no search step, no back icon.

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
  category: string,        // singular: 'Book', 'Musician', 'Music Album', etc.
  platforms: string[] | null,
  savedAt: number,
  queueStatus: 'in-queue' | 'in-progress' | 'my-review' | 'done' | null,
  folderId: string | null,
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
}
```

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
| Phase 2 | Planned | Spotify integration for Musician/Music Album richer artist data (photos, full discography) |
| Phase 3 | Planned | Sharing with contacts (requires Firebase Auth + Firestore write access) |
| Phase 4 | Planned | AI recommendations (requires Claude API via Firebase Function) |
| Chrome Web Store | Future | One-time $5 developer fee; publish when Phase 1 is stable |
