# SaveCraft — Session Context for AI

This file helps Claude (or any AI assistant) quickly regain context on the SaveCraft project without re-reading the full codebase.

---

## Latest Session Summary

**Theme: cleanup pass on the previous session's folder overhaul, a full rebuild of the browser-toolbar popup into a real wizard, then a Kanban board expand/focus feature plus a batch of smaller fixes.**

- **Kanban column expand/focus mode** (`js/kanban.js`, `css/kanban.css`) — `KANBAN_EXPANDED_FORMATS` (5 entries: `two-col`/`four-col`/`large`/`detail`/`simple`, each `{key, label}`) drives a format picker shown only inside an expanded column. `state.kanbanExpandedCol`/`state.kanbanExpandedFormat` (both ephemeral, never persisted) control which column (if any) is expanded and which format is active. In `renderKanbanBoard()`, the render branches three ways now: no-results / `state.kanbanExpandedCol` set (renders **only** that one `KANBAN_COLUMNS` entry, wrapped in `.kanban-board--expanded`, with `.kanban-cards--${format}` driving CSS grid density) / normal (unchanged `.map()` over all 4 columns). The same circular top-right button (`.kanban-expand-btn`) toggles `state.kanbanExpandedCol` between `col.key` and `null`; CSS `.kanban-expand-btn--active` recolors it purple with a "−" icon (`COLLAPSE_ICON_SVG`, vs. `EXPAND_ICON_SVG`'s "+") when it's the expanded column's own button. Drag-and-drop wiring (`dragstart`/`dragover`/`dragleave`/`drop`, previously unconditional at the bottom of `renderKanbanBoard()`) is now wrapped in `if (!state.kanbanExpandedCol)` — cards render `draggable="false"` in every formatted variant, since the other three columns (the only other valid drop targets) aren't in the DOM while one is expanded. `renderKanbanCard(item, format = null)` — no `format` renders byte-identical output to before this feature (verified this is the exact same template as pre-change); each format branch controls thumb size/position (row vs. thumb-on-top vs. no-thumb), whether the `item.notes || item.summary` snippet + `savedAt` date render, and whether the snippet is `-webkit-line-clamp`'d or shown in full (Detail Card). **Caught mid-implementation**: `cards.map(renderKanbanCard)` would have passed the array index as `format` (`Array.map`'s callback signature is `(item, index, array)`) — fixed to `cards.map(item => renderKanbanCard(item))`/`renderKanbanCard(item, format)`. An earlier version of this button briefly wired to `openAddModal(btn.dataset.col)` (opening Add Item with a preset `queueStatus`) before the user reversed course to the expand behavior — that plumbing (`_wizardPresetQueueStatus`, the `presetQueueStatus` param on `openAddModal()`) was fully reverted from `addEditModal.js`, not left in as dead code.
- **"Queue Kanban" sidebar link** (`js/render.js`, `dashboardLinkHtml`) — a `.sidebar-item.sidebar-subfolder.sidebar-kanban-link` row (reuses the folder-row visual class, but excluded from the generic `.sidebar-subfolder` click-wiring via `:not(.sidebar-kanban-link)` since it's already wired explicitly in `wireDashboardLink()` — avoids a double-fire). Sets `state.view = 'kanban'`, which `renderGrid()` already dispatched to `renderKanbanBoard()` unconditionally (pre-existing code, not new). The Dashboard row gained a category-style collapse arrow (`data-toggle="dashboard"`, `state.collapsed.has('dashboard')`) — **not** part of the categories' mutual-exclusion accordion group (its own standalone toggle). `state.collapsed`'s default (`state.js`) changed from `new Set(CATEGORIES)` to `new Set([...CATEGORIES, 'dashboard'])` so it starts collapsed on every fresh load — confirmed `state.collapsed` is never persisted to `chrome.storage.sync`, so this default alone is sufficient, no migration needed.
- **Markdown export** (`js/share.js`) — `exportAsMarkdown()`, wired to a new `#share-export-md-dd` button in the Share dropdown (`index.html`, right below the existing CSV button). Groups `getFilteredSortedItems()` by `item.category` (ordered via `CATEGORIES`, unrecognized/curated categories appended after), one `## ${CAT_LABEL[cat]}` heading per group, each item a `- [x]`/`- [ ]` line (`item.done`) with the title as a markdown link to `item.url` and the saved date. Escapes `[`/`]` in titles so a bracket-containing title can't break the link syntax — caught and fixed a backslash-direction bug (`]\\` vs the correct `\\]`) in this before it shipped.
- **Kanban Categories filter dropdown fix** (`js/kanban.js`, `renderBoardFilterDropdown()`) — was showing raw `CATEGORIES` storage values (`Web Links`, `Musician`, `Music Album`, etc.) including `Music Album`, which isn't a real sidebar entry. Now imports `CAT_LABEL`, filters `.filter(cat => cat !== 'Music Album')`, and renders `CAT_LABEL[cat] || cat` — matches the sidebar's list/order/labels exactly.
- **New "Shops" folder** — `default-weblinks-shops` added to `storage.js`'s `defaults` seeding array (`parentCategory: 'Web Links'`) and `FOLDER_ICON` in `state.js` (user-pasted shopping-cart SVG, fill swapped to `#5B5BEF` per the established convention). No changes needed in either folder-picker screen (`addEditModal.js`'s `showFolderScreen()` or `popup.js`'s equivalent) — both already read `state.folders`/`chrome.storage.sync` filtered by `parentCategory`, no hardcoded folder lists anywhere.
- **Popup fixes**: `openLibrary()` in `popup.js` was firing `chrome.runtime.sendMessage({action:'openLibrary'})` then immediately `window.close()` — a real race against Manifest V3's service-worker cold-start (the worker unloads when idle; if it wasn't already awake, the popup could close before the message was ever received, silently dropping the "open library" click). Fixed by `await`-ing the promise-based `sendMessage()` (the background handler already calls `sendResponse()` synchronously right after `chrome.tabs.create()`, so this closes the race cleanly) before closing. `screen-folder-book` (Book's Authors/Books folder screen, stacked layout) generalized to `screen-folder-stacked` and extended to also cover Movie's Movies/Videos folder screen (`selectedCategory === 'Book' || selectedCategory === 'Movie'`). `body.size-tall`'s hardcoded `480px` (`545px` with the unsaveable-page banner) replaced with `height: auto` plus `#step-review { padding-bottom: 40px; }` — the old fixed numbers were a guess that left an unpredictable gap below the Save button depending on category/banner state; the new approach guarantees exactly 40px in every case since it's driven by actual content height, not an estimate.
- **Popup wizard visual polish** (on top of the rebuild below) — `setHeader(text, showBack, backLabel)` grew a third param: a `#modal-back-label` span (purple, inside `#btn-back`) showing the current category/tile-group name next to the arrow (`CAT_LABEL[selectedCategory]` on the folder and review screens, hardcoded `'Music'` on the music-choice screen). `setScreen()` also toggles a `screen-<name>` class on `<body>` (`screen-folder`/`screen-music-choice`/`screen-review`) purely so `popup.css` can scope per-screen visual tweaks without touching shared rules: header pushed down + enlarged, bookmark icon hidden, back-arrow given an equal-and-opposite negative `margin-top` so it doesn't drift with the header's shift, and the tile grid re-centered against the new header height. The Musician/Music-Album sub-choice grid switched from `grid-template-columns: 1fr 1fr` to a single stacked column with narrower (`calc(100% - 70px)`), centered (`margin: 0 auto`) buttons. None of this touches the plain category tile screen (`step-category` has no `screen-*` class).
- **Popup rebuild (`src/popup/popup.{html,css,js}`)** — the popup used to be one flat screen: paste a URL, pick from a hardcoded 6-category list (`Music`/`Shows`/`Books`/`Movies`/`Games`/`Memes`), save instantly. None of those category strings matched the real `CATEGORIES` values in `state.js` (`Musician`/`Show`/`Book`/`Movie`/`Game`, no `Memes` at all) — since `render.js` filters with an exact `item.category === category` check, anything ever saved via the old popup silently never showed up under its category tab, only in "All". Rebuilt as a proper wizard mirroring `addEditModal.js`'s flow, and `popup.js` is now `type="module"`, importing `CATEGORIES`/`CAT_LABEL`/`CAT_EMOJI` from `../app/js/state.js` and `folderIconHtml`/`escapeHtml` from `../app/js/utils.js` directly (both modules are side-effect-free, safe to import without pulling in the rest of the app) — this is the first code-sharing between the popup and the main app; previously they were fully independent. New screen flow: category tiles (`currentScreen = 'category'`) → music sub-choice for the combined `__music__` tile (`'music-choice'`, mirrors `showMusicChoiceScreen()`) → folder picker, reading `folder_*` keys directly out of `chrome.storage.sync` and auto-skipping when a category has 0 or 1 folders (`'folder'`, mirrors `showFolderScreenOrSkip()`) → review screen (`'review'`) with editable Title/Image URL (with live preview + clear button)/URL, pre-filled from the active tab (title, URL, `og:image` via the content script or Microlink fallback, same fetch logic as before). Back navigation (`btn-back`) is an explicit state machine tracking `hadMusicChoiceScreen`/`hadFolderScreen`, same nested-chain idea as `handleModalBack()`. After a successful save, `saved-msg` now shows two buttons — **"Open Library →"** and **"Close"** — instead of auto-`window.close()`-ing after 1 second. Theme now reads the real `savecraft_theme` value from `chrome.storage.sync` (defaulting to `'dark'`, same default as the main app) via `data-theme` on `<html>`, replacing the old `prefers-color-scheme` media-query approach. The popup window is fixed at exactly two sizes via a class on `<body>` — `size-compact` (320px, tile-picker screens) / `size-tall` (480px, review screen) — set in `setScreen()`, instead of free-resizing to fit whatever screen is showing.
- **Category icon/label changes** (`state.js`) — `CAT_EMOJI['Movie']` and `CAT_EMOJI['Visual Art']` replaced with hand-pasted custom SVGs (source files kept at `images/icons/movies.svg` / `arts.svg` for reference); both keep their own SVG's native `viewBox` (`0 2 24 24` / `0 0 24 24`) rather than the app's usual `0 -960 960 960` Material-Symbols convention, since path coordinates are viewBox-specific — plus a hardcoded `fill="#5B5BEF"` like every other `CAT_EMOJI`/`FOLDER_ICON` entry. `CAT_LABEL` changes: `'Movie': 'Films'` (was "Movies" — the `default-movies-movies`/`default-movies-videos` *folder* names were deliberately left unchanged), `'Web Links': 'Websites'` (was "Website"), `'Musician': 'Music'` (was "Musicians"). `Movie` was also moved in the `CATEGORIES` array to sit directly after `Book` (see the updated array below).
- **Dead-code cleanup pass** — the fully-orphaned YouTube promo-video lookup feature was removed after verifying (via grep, not memory) that nothing else referenced it: `ensureArtistMusicVideoId()`/`YOUTUBE_API_KEY`/`ARTIST_VIDEO_CACHE_MISS_TTL` (`api.js`), `persistArtistVideoCache()` (`storage.js`), `state.artistVideoCache` (`state.js`), `extractYoutubeVideoId()` (`utils.js`), and the `loadLocalCache('savecraft_artist_video_cache', ...)` call in `main.js`. `render.js` gained a shared `matchesPrimaryOrUnfoldered(item, category)` helper, replacing four copy-pasted inline predicates (top-level category filter, folder-view filter, sidebar category count, sidebar per-folder count). Removed dead CSS: `.detail-video-frame`, `.empty-state--sponsored`, `.sidebar-mode-tab--sponsored.active`, `.step1-category-tile--no-icon`.
- **Dashboard hero collage fix** (`dashboard.js`/`dashboard.css`) — thumbnails sometimes rendered as empty squares or popped in visibly late. Root cause: `.dash-hero-thumb` had no background color (see-through void during image load) and its `<img>` tags used `loading="lazy"` despite the collage being always-visible (a marquee, not something scrolled into view) — lazy-loading was actively counterproductive there. Fixed with `background: var(--surface)` + switching to `loading="eager"`. Confirmed via code inspection this wasn't a data-race — `init()` already awaits both `loadAll()` and `initCuratedItems()` before the first render.
- **Folder assignment was completely broken before this session** — the only thing that ever set `item.folderId` was the old Favorites mechanism (which was itself a folder). Fixed via: a mandatory folder-picker screen in the Add wizard (`showFolderScreenOrSkip()`/`showFolderScreen()` in `addEditModal.js`, auto-skipped when a category has 0 or 1 folders), an Edit-mode `<select id="input-folder-select">` (`populateFolderSelect()`), and fixing `handleSaveItem()` which used to hardcode `const folderId = null` on every save (silently wiping any existing folder on edit).
- **`PRIMARY_FOLDER_ID`** (new export, `state.js`) — `{ category: folderId }`. `getFilteredSortedItems()` in `render.js` now filters a top-level category tab to `item.category === state.view && (item.folderId === primaryId || !item.folderId)` instead of a plain category match; the same union logic applies when the primary folder is clicked directly (so tab and folder show identical results), and to the sidebar's folder-count badges. Categories with no `PRIMARY_FOLDER_ID` entry (Game, News, Visual Art) are unfiltered, unchanged from before.
- **`FOLDER_ICON`** (new export, `state.js`) + **`folderIconHtml(folderId, sizePx)`** (new export, `utils.js`) — per-folder custom icons for official/seeded folders, generic fallback (`GENERIC_FOLDER_ICON_PATH`) for user-created ones. Official folders (id prefixed `default-`) can't be deleted from the sidebar (no × rendered); user-created ones can, with the pre-existing `confirm()` prompt.
- **New/changed default folders** (`storage.js`'s `defaults` seeding array + a `legacyIds` cleanup list for ones being retired): Movie gained `default-movies-movies` (Movies, primary) + `default-movies-videos` (Videos); Show gained `default-shows-shows` (TV Shows, primary — tab label stayed "Shows") + Podcasts + Webseries + Tutorials, and lost "Official News"; Musician gained `default-musicians-musicians` (Musicians, primary — previously had zero folders); Music Album lost the redundant `default-music-musicians` folder (kept Music Albums-primary + Playlists); Book gained `default-books-books` (Books, primary) and lost Genres; Web Links gained `default-weblinks-websites` (Website, primary) and lost its News folder; Visual Art gained Dance/Comics/Painting/Sculpture (its first-ever folders). **Folder renames**: seeding only ever inserts once, so renaming an already-shipped folder needs a separate one-time `FOLDER_RENAMES` migration in `loadAll()` (used for `default-shows-shows`'s "Shows"→"TV Shows" rename) — a `defaults`-array text edit alone won't reach anyone who already loaded the old name.
- **"Website" category** — `'Web Links'` promoted from a sidebar-only pseudo-category into a real `CATEGORIES` member (first in the array), shown as "Website" everywhere via `CAT_LABEL['Web Links']` (no more separate hardcoded "Webpages" text in three different places — `render.js`'s sidebar/gridTitle special-casing and the old `WEBPAGES_ICON_SVG` local constant are gone, replaced by `CAT_EMOJI['Web Links']`). No `CATEGORY_PLATFORMS` entry (falls through `updatePlatformsSection()`'s existing `!config` hide-path). `advanceFromFolderScreen()` skips the search screen for it, same as Visual Art.
- **"News" category** — same no-search-screen treatment, but folder selection is source-verification, not just organization: `handleSaveItem()` checks `category === 'News' && folderId` and, if the chosen folder has a `domain` field, validates the pasted URL's hostname matches (`hostname === domain || hostname.endsWith('.'+domain)`) before allowing the save — blocks with the same red-border-flash pattern used for a missing title. A starter curated-outlet folder set (AP/Reuters/NPR/PBS, each with `domain`+`paywalled` fields) was built and then removed via `legacyIds` pending a real editorial list; the validation code is unconditional on folder data existing, so it silently no-ops (and News behaves like a plain category) until folders are re-added.
- **Musician/Music Album combined Add-wizard tile** — `renderCategoryTiles()` renders one `data-category="__music__"` tile in place of both; `selectStep1Category()` routes it to a new `showMusicChoiceScreen()`/`selectMusicChoice()` pair (modeled directly on the folder-picker screen's pattern) offering the two real categories, then continues into the completely unmodified existing flow for whichever was picked. New `_wizardHadMusicChoiceScreen` wizard-state flag threads through `handleModalBack()`'s nested back-navigation (category → music-choice → folder → search → review). **Not** a data-level merge — deliberately, since a huge amount of code (`isMusicAlbum`/`isMusicianItem` branches in `detailModal.js`, `badgeLabel()`, CSS classes, `fetchAlbumsModal.js`, the Profile page's taste widget) uses `item.category === 'Music Album'` as a type discriminator that would all need replacing for a real merge, for no functional gain over the wizard-only approach.
- **Favorites decoupled from folders** — `item.favorite` (boolean) replaces the old `favorites-<category>` folder mechanism entirely. `detailModal.js`'s favorite click handler is now just `liveItem.favorite = !liveItem.favorite; await persistItem(liveItem);` — `getFavoritesFolder()` and all the find-or-create-folder logic are gone. `render.js`'s sort pass now runs an unconditional final `.sort()` after the `state.sort` switch: favorites first (alphabetical among themselves, reusing the `'az'` case's numbers-last comparator), non-favorites keep whatever order the chosen sort mode produced (stable sort). One-time migration in `storage.js`'s `loadAll()`: any item whose `folderId` points at a folder named "Favorites" gets `favorite: true, folderId: null`, and those now-empty Favorites folders are removed via the existing `removeFolder()`.
- **Promo Vid removed from Musicians** — the whole `if (isMusicianItem) { ... }` block in `detailModal.js` (button, click handler, `extractYoutubeVideoId`/`ensureArtistMusicVideoId` calls, YouTube-search fallback) is deleted; `_promoToggleHtml` is now `isMusicAlbum ? '<button... Album Art...>' : ''`. The now-dead `.detail-video-frame` CSS rule and a stale "don't clobber an actively-playing promo video" guard/comment were cleaned up too.
- **`item.youtubeUrl`** (new field) — a manual "YouTube URL" input in the Add/Edit modal (`#input-youtube-url`, `input-with-clear` pattern matching Image URL). Surfaces in the detail modal's Web Links accordion as a real link (`item.youtubeUrl` directly, not `p.searchUrl(query)`) for any category, appended alongside the existing `websiteBtn`.
- **Sponsored Statement badge repositioned** — moved from a static "WHY VOTECRAFT RECOMMENDS" block (`#detail-vc-why`, now removed from `index.html` entirely) onto the item image itself, reusing the exact slot/positioning `.btn-promo-toggle` used (`.vc-sponsored-tag--overlay`, stacks above the Album Art toggle via `.vc-sponsored-tag--stacked` when both are present on a Music Album). The "why" text is now a hover-triggered callout (`.vc-sponsored-tooltip`) nested inside the badge `<a>` itself, not a separate always-visible section. **Real bug fixed**: `isCuratedTop100` used to guess hardcoded id prefixes (`cur-top100b-` for Books etc.) that didn't match reality — replaced with `CURATED_ITEMS['Top 100']?.[item.category]?.some(i => i.id === item.id)`, and the per-category "why" text lookup switched from id-prefix guessing to a plain `CATEGORY_WHY_TEXT[item.category]` map.
- **`src/sponsored/sponsored.html` redesign** — brand color aligned to the app's actual `#5B5BEF` (was a slightly different `#7C6FF5`), CSS custom properties added (`--primary`, `--surface`, etc., mirroring the app's own variable names), wider layout (960px), a product-mockup preview card reused in two places, section order changed to Why it exists → Pricing → What's included → CTA. Inline `<script>` for the "SaveCraft" wordmark link was **blocked by Manifest V3's extension-page CSP** (no `'unsafe-inline'` allowed) — moved to an external `sponsored.js`, same as every other page in the extension. Also linked from a new Settings-dropdown item (`#link-sponsored-statements`, href set via `chrome.runtime.getURL()` in `main.js`).
- **"VoteCraft Picks" now functional** — both entry points (`main.js`'s mobile-dropdown handler, `render.js`'s sidebar `data-sidebar-opt="sponsored"` handler) now set `state.sidebarMode = 'curated'; state.view = 'genre:Top 100'` instead of the old `'sponsored'` placeholder view (`render.js`'s `state.view === 'sponsored'` block and its `sidebarMode === 'sponsored'` title branch are still present but now unreachable from the UI — left in place, not removed).
- **Reload/persistence**: `main.js`'s `init()` used to force `state.view = 'dashboard'` on every load regardless of what was saved — removed. Every navigation call site now calls `persistViewState()`, so a reload genuinely restores the last-active page (this includes Dashboard and Profile, previously deliberately excluded — **the View Routing section below is stale on this point, see the note there**).
- **`js/auth.js`** — Firebase Auth REST API (email/password), no SDK. `getCurrentUser()`/`onAuthChange()`/`signUp()`/`signIn()`/`signOut()`/`getValidIdToken()`.
- **`js/profile.js`** — Account card + Connections (Last.fm/Steam, public-username-only, no OAuth)/Interests/Your Music Taste/Friends-placeholder, still demo-mode (sign-in gate skipped at both entry points).

---

## File Locations

| What | Path |
|------|------|
| Chrome extension source | `/Users/lizpasekal/Documents/Votecraft.org/Chrome Extensions/Savecraft/` |
| Manifest | `…/Savecraft/manifest.json` (must stay at extension root — Chrome requirement) |
| Main library page | `…/Savecraft/src/app/index.html` |
| Library logic | `…/Savecraft/src/app/js/*.js` — 15 ES modules (`state.js`, `storage.js`, `utils.js`, `api.js`, `auth.js`, `authors.js`, `render.js`, `kanban.js`, `detailModal.js`, `addEditModal.js`, `fetchAlbumsModal.js`, `dashboard.js`, `profile.js`, `share.js`, `main.js`); see `savecraft-overview.md` for what lives where |
| Library styles | `…/Savecraft/src/app/css/*.css` — 10 files split by feature area |
| Background service worker | `…/Savecraft/src/background/background.js` |
| Content script | `…/Savecraft/src/content/content.js` |
| Popup | `…/Savecraft/src/popup/popup.{html,css,js}` |
| Sponsored page | `…/Savecraft/src/sponsored/sponsored.html` |
| Logo assets | `…/Savecraft/images/logos/` |
| Documentation | `/Users/lizpasekal/Documents/Votecraft.org/Chrome Extensions/Savecraft/Documentation/` |

Always edit source code in `Votecraft.org/Chrome Extensions/Savecraft/`. Docs go in the same folder under `Documentation/`.

**Note:** The original monolithic `src/app/app.js`/`app.css` still exist as an unused backup (not loaded by `index.html` anymore) — safe to delete once the module split is confirmed working in a real Chrome load.

---

## Categories

```js
const CATEGORIES = ['Web Links', 'Visual Art', 'Book', 'Movie', 'Game', 'News', 'Musician', 'Music Album', 'Show'];

const CAT_LABEL = {
  'Web Links': 'Websites', 'News': 'News',
  'Book': 'Books', 'Game': 'Games', 'Movie': 'Films',
  'Musician': 'Music', 'Music Album': 'Music Albums',
  'Show': 'Shows', 'Visual Art': 'Arts',
};

const PRIMARY_FOLDER_ID = {
  'Movie': 'default-movies-movies', 'Show': 'default-shows-shows',
  'Musician': 'default-musicians-musicians', 'Music Album': 'default-music-albums',
  'Book': 'default-books-books', 'Web Links': 'default-weblinks-websites',
};
```

- **Singular** values used in storage and the Add Item dropdown
- **CAT_LABEL** values used in the sidebar, grid title, and Add-wizard tile — all read from this same map now (previously the sidebar had separate hardcoded "Webpages" text for `'Web Links'`, since removed)
- `CATEGORIES`' array order directly drives both the sidebar and Add-wizard tile order — `'Web Links'` (Website) is first
- `Music Album` is **filtered out of the sidebar** category list — it appears only as a permanent hardcoded subfolder under `Musician` in the sidebar
- A category's entry in `PRIMARY_FOLDER_ID` (if any) determines what its top-level tab actually filters to — see "Latest Session Summary" above
- CSS class names use `catClass(cat)` helper: `'Music Album' → 'Music-Album'`, `'Visual Art' → 'Visual-Art'`

---

## Storage Layout (`chrome.storage.sync`)

| Key pattern | Contents |
|------------|----------|
| `item_<id>` | Personal item object |
| `author_<id>` | Author/artist profile object |
| `folder_<id>` | User-created folder |
| `savecraft_view` | Last active view string (restored on open) |
| `savecraft_kanban_sort` | Per-column sort prefs |
| `savecraft_kanban_lists` | Kanban column definitions |
| `savecraft_hidden_curated` | Array of dismissed curated IDs |
| `savecraft_curated_overrides` | User edits to curated items |

---

## State Object

```js
state = {
  items: [],          // personal items
  folders: [],        // user folders
  authors: [],        // author profiles
  view: string,       // current view (see View Routing below)
  search: string,
  sort: string,
  editingId: string | null,
  sidebarMode: 'categories' | 'curated' | 'sponsored' | 'home',
  modalCategory: string | null,  // currently-selected category in the Add-modal wizard (also drives Screen C's #modal-category select)
  // ...curated state, kanban state, etc.
}
```

---

## View Routing

`state.view` drives what `renderGrid()` shows:

| Value | Shows |
|-------|-------|
| `'dashboard'` | The Dashboard home page (`renderDashboard()`, in `js/dashboard.js`) — the default for a brand-new install with no saved state; no longer force-applied on every load (see the note below the table) |
| `'All'` | All items |
| `'Music Album'` | Items with category === 'Music Album' |
| `'Musician'` | Items with category === 'Musician' |
| `'<folder-id>'` | Items in that folder |
| `'author:Musician:Gorillaz'` | Author page for Gorillaz (Musician category) |
| `'genre:Jazz'` | Curated genre landing — shows category list in sidebar |
| `'genre:Jazz:Movie'` | Curated genre + category drilldown — shows curated items |
| `'genre:Top 100:Musician'` | Curated Top 100 musician entries (100 artists) |
| `'genre:Top 100:Music Album'` | Curated Top 100 albums (2444 entries) |

**Updated this session — this table entry used to say otherwise:** `main.js`'s `init()` no longer force-applies `'dashboard'` on load; every navigation call site (including arriving at Dashboard or Profile) now calls `persistViewState()`, so a reload restores whatever page the user actually last had open, not always the Dashboard.

`renderGrid()` early-returns to `renderAuthorPage()` when `state.view.startsWith('author:')`.

For `author:Musician:X` views, `getFilteredSortedItems()` returns:
1. User-saved `Musician` and `Music Album` items with `author === name`
2. Curated `Music Album` items from `CURATED_ITEMS` where `notes === name`

---

## Author / Artist Profile System

### Key functions
- `navigateToAuthor(name, category)` — sets `state.view = 'author:<category>:<name>'`, auto-creates stub profile if none exists
- `findAuthor(name, category)` — looks up by exact name + category match (case-sensitive by design)
- `persistAuthor(author)` — saves to `chrome.storage.sync` as `author_<id>`
- `renderAuthorPage()` — renders full author page into `#cards-grid`

All in `js/authors.js` (profile CRUD/navigation) and `js/render.js` (`renderAuthorPage`). Note: there used to be an "Edit Profile" modal (`openAuthorEditModal`/`handleSaveAuthor`) — it was dead code (never wired to a trigger) and was removed during the app.js → ES module split. Author photo/bio/website are now only ever set automatically via the Wikipedia/MusicBrainz enrichment lookups, not user-editable through the UI.

### Author page structure
- Back button in `#grid-title` → returns to category view
- Header: photo, name, bio, website
- For `Musician` category: **Fetch Albums** button appears on the header
- Works grid: all items by this author (includes curated Music Albums from CURATED_ITEMS where `notes === artistName`)
- Clicking an album card on the author page opens the detail popup

### Clickable names
- **Curated Musician cards**: the title itself is rendered as a `card-author-link card-title` button → clicking it calls `navigateToAuthor(item.title, 'Musician')`
- **Curated Music Album cards**: the `item.notes` (artist name) is shown as a `card-author-link` above the title → navigates to that musician's page
- **Detail modal**: musician title or album artist name is a `.detail-author-link` → closes modal and navigates to musician page
- Author name is immutable — it's the lookup key. Changing it would break the link to all items.

### Auto-save musician
`autoSaveMusician(artistName)` is called from `ensureLiveItem()` whenever a `Music Album` item is saved for the first time (e.g. when queued). It:
1. Checks if a `Musician` item with that title already exists in `state.items`
2. If not, creates one — pulling `url` and `imageUrl` from `CURATED_ITEMS[genre]['Musician']` if available
3. Persists it to `chrome.storage.sync`

The reverse direction: `autoImportMusicianAlbums(musicianItem)` (in `js/addEditModal.js`) runs whenever a brand-new `Musician` is saved via `handleSaveItem()` — fire-and-forget, not awaited before the modal closes. Calls `fetchAlbumsFromItunes(artistName)`, filters to `artist === artistName` (exact, case-insensitive) and excludes anything matching the singles/EPs title pattern or `type === 'Single'` (same filter `fetchAlbumsModal.js` uses), dedupes against any already-saved albums by title, then creates+persists the rest as `Music Album` items and re-renders.

---

## External Search Integrations

### Host permissions
`itunes.apple.com`, `openlibrary.org`, `store.steampowered.com`, `en.wikipedia.org` are all declared in `manifest.json` `host_permissions` — required for the respective `fetch()` calls to work from the extension page. Cover-art CDN hosts (`covers.openlibrary.org`, `cdn.akamai.steamstatic.com`, iTunes's `mzstatic.com`) do **not** need entries — they're only ever loaded via plain `<img src>`, not `fetch()`.

### Fetch Albums (author page)
`openFetchAlbumsModal(artistName)` — opens modal, calls `fetchAlbumsFromItunes()`, renders results.

`renderFetchAlbumsList(allAlbums, artistName, mode, hideSingles)`:
- `mode: 'exact'` — filters to `artist.toLowerCase() === artistName.toLowerCase()`
- `mode: 'any'` — shows all iTunes results
- `hideSingles: true` — filters out items matching `/ - (single|ep)$/i` in title OR `type === 'Single'`
- Singles/EPs default to **unchecked**; proper albums default to **checked**
- Already-saved albums are disabled

`handleImportAlbums()` — creates `Music Album` items from checked results.

### Add Modal Wizard (Screen B: category search)
Add is a 3-screen wizard in `js/addEditModal.js`: category grid → live search → review/refine. Each category dispatches to a different search function in `js/api.js`, all returning the same normalized shape (`{ title, author, imageUrl, imageUrlLarge, url, year, meta }`) so the results-dropdown renderer and the review-screen pre-fill don't special-case each source:

| Category | Function | Source |
|----------|----------|--------|
| Musician | `searchMusicians()` | iTunes `entity=musicArtist` |
| Music Album | `searchMusicAlbums()` | iTunes `entity=album` (generalized from the old author-field-only lookup) |
| Show | `searchShows()` | iTunes `entity=tvSeason`, deduped by `artistId` |
| Book | `searchBooks()` | Open Library `search.json` |
| Game | `searchGames()` | Steam `storesearch` |
| Movie | `searchMoviesWikipedia()` | Wikipedia `generator=search` — iTunes movie search is dead |

Search is debounced ~500ms on `#step1-search-input`. Selecting a result (or typing a title with no match and continuing manually) advances to the review screen (`showReviewScreen()`), which then kicks off background enrichment via the *existing* `ensureArtistWikipediaInfo`/`ensureItemWikipediaInfo` (Musician / Book·Show·Movie·Game respectively) to fill in Summary and upgrade the image — Music Album already has full data from iTunes, Visual Art has no source, neither triggers a lookup.

`handleSaveItem()` no longer requires a URL — Title is the required field instead (same red-border-flash validation UX, just checking a different field). This also fixed a latent bug: editing a curated item with a blank Title used to silently write `title: null` over the curated base item.

---

## Sidebar Structure

`renderSidebar()` iterates `CATEGORIES.filter(cat => cat !== 'Music Album')` — Music Album is never a top-level sidebar entry.

For the `Musician` category, a **permanent hardcoded subfolder** is injected:
```js
<div class="sidebar-item sidebar-subfolder ..." data-view="Music Album" data-permanent="true">
  [Music Albums icon] Music Albums
</div>
```

In **regular mode**: clicking it sets `state.view = 'Music Album'`.

In **curated genre mode**: clicking it sets `state.view = 'genre:<genre>:Music Album'` — the `data-permanent="true"` attribute triggers this branch in the subfolder click handler.

### Dashboard row + "Queue Kanban" link
`dashboardLinkHtml` (rendered above the category list in every non-curated-picker branch) now has two rows: the Dashboard link itself, and a `.sidebar-subfolder.sidebar-kanban-link` row styled like a folder row, setting `state.view = 'kanban'`. The Dashboard row is collapsible (`data-toggle="dashboard"`, arrow on the right, no count badge) — `state.collapsed.has('dashboard')` gates whether the Queue Kanban row renders at all. `state.collapsed`'s default is `new Set([...CATEGORIES, 'dashboard'])` (`state.js`), so it's collapsed on first load; this is never persisted to `chrome.storage.sync`; it's pure in-memory default state that resets every reload. The Queue Kanban row is excluded from the generic `.sidebar-subfolder` click-wiring loop (`:not(.sidebar-kanban-link)`) since `wireDashboardLink()` already wires it explicitly — without the exclusion it'd get a second, redundant click handler.

### Collapsible desktop rail
Desktop-only (the mobile drawer is a separate full-width overlay and unaffected). `#btn-sidebar-collapse` (in `.sidebar-header-controls`) toggles a `.sidebar-collapsed` class on both `#sidebar` and `#header-sidebar`, shrinking them to a 64px icon-only rail — CSS-only hiding via a `.sidebar-label-text` span that wraps just the text portion of each category/genre label (added specifically so it could be hidden without touching the icon or the click-handling/wiring, which is unchanged). Persisted via `chrome.storage.sync` (`savecraft_sidebar_collapsed`), applied in `main.js`'s `init()` the same way theme is (`applySidebarCollapsed()`/`toggleSidebarCollapsed()`, mirroring `applyTheme()`/`toggleTheme()`).

---

## Curated Data (Firestore)

### Firestore project
- Project: `votecraft-789`
- Collection: `curated_items`
- API key (read-only, safe to expose): in `_FIREBASE_API_KEY` constant in `js/storage.js`

### Loading
`_loadCuratedFromFirestore()` (in `js/storage.js`) paginates the collection in 300-doc pages.
Loaded at startup via `initCuratedItems()`, which calls `setCuratedItems()` (in `js/state.js`) to populate the module-level `CURATED_ITEMS` binding — this indirection exists because ES modules can't let other files directly reassign an imported `let`, only the exporting module can, so `state.js` exposes a setter for it. `init()` (in `js/main.js`) calls `initCuratedItems()` on startup.
Cached in `chrome.storage.local` for 24 hours. Cache version: `_CURATED_CACHE_VERSION` in `js/storage.js` (bump to force refresh).

### Category normalization
Firestore stores plural/legacy category names. `_CAT_NORMALIZE` maps them to internal singular names:
```js
const _CAT_NORMALIZE = {
  'Movies': 'Movie', 'Books': 'Book', 'Games': 'Game',
  'Shows': 'Show', 'Musicians': 'Musician',
  'Music': 'Music Album', 'Music Albums': 'Music Album',
};
```
Applied in `_loadCuratedFromFirestore()` before building `CURATED_ITEMS`.

### CURATED_ITEMS structure
```js
CURATED_ITEMS = {
  'Top 100': {
    'Musician':    [ { id, title, url, imageUrl, notes, genre, category }, ... ],  // 100 artists
    'Music Album': [ { id, title, url, imageUrl, notes, genre, category }, ... ],  // 2444 albums
  },
  'Classic': { 'Movie': [...], 'Show': [...], 'Music Album': [...], ... },
  'Jazz':    { 'Movie': [...], 'Music Album': [...], ... },
  // ... other genres
}
```

### Musician / Music Album data
- **Artist entries** (`id: artist_itunes_<artistId>`): `category: 'Musician'`, title = artist name, `notes: null`
- **Album entries** (`id: itunes_<collectionId>`): `category: 'Music Album'`, title = album title, `notes` = artist name
- All Top 100 entries have `genre: 'Top 100'`
- Singles/EPs filtered out by title pattern at import time

### Populating curated data (admin scripts)
Scripts live in the Claude session scratchpad. To re-run, the Firestore `curated_items` rule must temporarily be `allow write: if true`. After running, revert to `allow write: if request.auth != null` and bump `_CURATED_CACHE_VERSION`.

---

## Dashboard (`js/dashboard.js`)

The persistent home page. `renderDashboard()` is the sole export, dispatched from `renderGrid()` when `state.view === 'dashboard'`. Everything else in the module is private, split into per-widget `build*()` (returns an HTML string) / `wire*()` (attaches listeners after `innerHTML` is set) pairs — same idiom as the rest of this codebase's rendering.

- **Favorites aggregation** — `getAllFavoriteItems()` walks every `state.folders` entry named `'Favorites'` (one per category, created on-demand by `detailModal.js`) and collects their combined `folderId` membership from `state.items`. No prior helper did this across categories. `resolveFavoriteSlides()` falls back to `CURATED_ITEMS['Top 100']['Musician']` + `['Music Album']` (both defensively optional-chained) when the real list is empty.
- **Slideshow state** (`_favSlides`, `_favIndex`, `_favIsDemo`, `_favTimer`) is module-level, not part of `state` — ephemeral per-render UI state nothing else reads, matching how `kanban.js`/`render.js`/`detailModal.js` already keep private UI state module-local. The auto-advance `setInterval` self-clears on its own next tick if `.dash-fav-slideshow` is no longer in the DOM (i.e. the user navigated away), rather than relying on every navigation path remembering to call a cleanup function.
- **Kanban mini-board** reuses `KANBAN_COLUMNS` and `KANBAN_DEMO()` (both exported from `kanban.js` specifically for this reuse) so the widget's columns/labels/demo content stay in sync with the real board by construction, not by copy-pasted constants.
- **`.grid-header` gotcha**: `renderDashboard()` hides the `.grid-header` wrapper (sort/filter controls) entirely, not just its children — an earlier version only hid the children, leaving the wrapper's own `margin-bottom: 20px` unaccounted for in the "fill exactly this much height, no scroll" layout math, which caused a stray scrollbar. `renderGrid()`'s existing top-of-function reset block restores `.grid-header` to visible before any other view renders, so this doesn't leak into other views.

---

## Key Architectural Patterns

### Curated vs. Personal Items
- Curated items are read-only in the UI. IDs: `cur-*` (original), `itunes_*` (albums), `artist_itunes_*` (musicians).
- `state.hiddenCurated` — Set of curated IDs the user has dismissed.
- `state.curatedOverrides` — User edits to curated items stored separately.
- `ensureLiveItem()` — clones a curated item into `state.items` the first time a user queues or bookmarks it.
- When a `Music Album` is first saved via `ensureLiveItem()`, `autoSaveMusician()` is also called.

### `chrome.storage.onChanged`
Handles `item_`, `folder_`, and `author_` key prefixes. Guards against double-adding items.

### Bookmark / Save Logic
- Bookmark outline = not in personal list. Filled = saved.
- Tapping **Add to Queue** auto-saves (calls `ensureLiveItem()` then sets `queueStatus`).

---

## Known Open Issues

### Header Alignment Bug (unresolved)
The left edge of **"+ Add Item"** and **"ALL QUEUES"** are visually misaligned. Multiple CSS attempts haven't fixed it. Needs live DOM inspection via DevTools.

---

## Planned But Not Yet Built

### Spotify Integration
Phase 2 of iTunes integration. Will add Spotify OAuth for richer artist data (artist photos, full discography). iTunes path is already established — Spotify would augment it.

### Kanban Search & Tutorial Banner
- Add search/sort filtering inside `renderKanbanBoard()` (currently ignores `state.search`)
- Add a first-time tutorial banner, permanently dismissed via `savecraft_tutorial_seen`

---

## CSS Design Tokens

```css
--primary         /* purple accent */
--surface         /* card/modal background */
--border          /* border color */
--text-primary    /* main text */
--text-secondary  /* secondary text */
--text-muted      /* muted/icon text */
--hover-bg        /* hover state background */
```

---

## How to Reload After Changes

1. Edit any file in `Chrome Extensions/Savecraft/`
2. Go to `chrome://extensions`
3. Click the **↺ refresh** icon on the SaveCraft card
4. Reopen the library tab (or hard-refresh it)

No build step — changes are live after reload. `src/app/js/main.js` is loaded as an ES module (`<script type="module">`), so `import`/`export` typos surface as console errors on the library tab, not silent failures — always check DevTools console after a reload when editing `js/` or `css/` files.
