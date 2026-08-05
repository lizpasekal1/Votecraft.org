# SaveCraft — Project Overview

SaveCraft is a Chrome extension that acts as a personal media library. Users save links to movies, shows, music, books, games, and other content they want to experience. Curated recommendations from Votecraft are surfaced alongside personal saves, and a Kanban board ("My Saves Queue") lets users track what they've watched, read, or listened to.

---

## Recent Additions (latest session)

This session landed real Saved Lists sidebar navigation, rebuilt the Share modal (Message → a Saved Lists picker, a link-sharing on/off toggle), broadened the sponsor pitch page to three offerings, and — the bulk of the session — built a brand-new **Embed Builder** feature end to end: pick a source (a whole category, an individual folder, or a hand-picked "Custom Slider"), customize a slider's look, and copy a shareable "Embed code" link. Two real bugs were found and fixed along the way (a CSS Grid track-blowout, a JS temporal-dead-zone crash).

- **Saved Lists sidebar rows wired to real navigation** — clicking Favorites/Health/Motivation (or any user-added Saved List) under the Dashboard's Saved Lists row now actually filters the grid to that list's items, instead of being an inert placeholder; their icons switched to plain folder icons (no boxed container). Curated Lists' own child rows are still unwired except one: the seeded "Votecraft" row links to the real Votecraft List curated genre. Curated Lists also gained a seeded "Votecraft"/"RCV" starter pair.
- **Share modal rebuilt** — the free-text "Message" field is gone, replaced by a scrollable, single-select (radio-style, tap-to-deselect) list of the user's Saved Lists; picking one shares that list's own items instead of whatever's open in the sidebar. "Anyone with the link" gained a real on/off toggle (grays out Copy/Send and turns pink/red when off — a client-side gate only, no real access-control backend yet).
- **Sponsor pitch page broadened from one offering to three** (`src/sponsored/sponsored.html`) — now covers Your Own Sponsored Page (the existing Cause Curated directory concept), Sponsored Statements (unchanged), and Embed Anywhere (the new Embed Builder, in marketing terms), with pricing tiers reframed to show which offerings each tier includes.
- **New feature: Embed Builder** (`embedBuilder.js`/`embedBuilder.css`, new) — reached via a new "Embed options" button in the Share dropdown, this is a new pseudo-view (`state.view === 'embed-builder'`) for building a customizable slider/carousel from specific saved assets, meant for pasting onto an external site as an `<iframe>`. Single screen throughout, no wizard-style transitions:
  - **Source picking** happens within the Assets panel itself: a top-level category-tile grid (visually identical to the Add Item wizard's own first screen) leads either into that category's own folders (with an "All X" tile for the whole section) or into a searchable cross-category "Custom Slider" picker for a hand-built list.
  - **Style panel** — visible slide count, slide spacing, autoplay, nav style, a preview-only dark theme, aspect ratio, a curated web-safe font list, and a branding toggle — all reflected live in a carousel preview that shows gray placeholder slides before any real assets are picked.
  - **"Embed code" box** — a YouTube-share-style URL + Copy pill, always visible, generating a link via the same base64 encoding the existing Share link already uses. Points at a hosted page (`savecraft/embed.html`) that doesn't exist yet — Copy works today, the link itself is a placeholder for a deferred follow-up phase (Firestore persistence + the actual hosted rendering page), which was scoped and approved via a plan-mode pass but not built this session.
- **Real bug found and fixed: CSS Grid track blown out by an unbreakable string** — the long, unbreakable embed-code URL forced its own min-content width, and Grid items default to `min-width: auto` (not `0`), so the panel's "equal width" split silently broke once a real URL populated it, pushing every row's controls off past the visible edge. Fixed with `min-width: 0` on the grid item.
- **Real bug found and fixed: temporal-dead-zone crash silently broke the entire Builder** — a `const` font list was referenced by code that ran at module-load time *before* that `const`'s own declaration line executed, throwing a `ReferenceError` with no visible on-page error. Fixed by reordering the declaration above the state that depends on it.

---

## Recent Additions (previous session)

This session added image/hyperlink support to the My Notes formatting toolbar, then restructured category/sidebar navigation across four separate requests, then fixed three real bugs found live (a partial-highlight bug, a sidebar multi-tab-open bug, a toolbar spacing issue), and closed with a self-review pass.

- **My Notes toolbar gained a 4th button: insert image** — a prompt-based image-URL insert, sanitizer-gated to `http(s):`/`data:image/` sources (drops the tag entirely rather than leaving a broken-image icon if the URL fails). **Real bug found and fixed**: the note row's blur-cleanup handler used to treat "no visible text" as "this row is empty" and wipe it — but an image-only note has real content with no text at all, so it was silently deleting the image the moment the row lost focus.
- **Hyperlinks in notes** — pasted `<a href>` links now survive the sanitizer, and plain-text URLs the user types or pastes are auto-linkified into real links on save. Styled with the standard web blue+underline, not the app's purple accent. Clicking a link opens it via `chrome.tabs.create` (needed instead of `window.open()`, which doesn't reliably work from this app's `chrome-extension://` origin).
- **Highlight color changed to yellow, bold text made brighter** — the note-formatting `<mark>` background moved from the app's themed purple to a plain yellow highlighter color; `<b>` text now uses a brighter color than the note's own dimmer base gray.
- **Real bug found and fixed: partial-selection dehighlighting** — un-highlighting only part of an already-highlighted note selection used to either leave an invisible, unselectable colored "artifact" behind or silently do nothing, traced to `Range.extractContents()` not reliably preserving element wrappers around the extracted content. Rewritten to determine "is this fully highlighted" from the live document before any DOM mutation, rather than trusting the (unreliable) post-extraction result.
- **Category/sidebar restructuring**: TV Shows moved from the Shows category into a new Films → Series folder (existing items auto-migrate); the Musicians tab renamed to Music; the News tab removed (Web Links' Blogs folder renamed to News as an informal replacement); a new "Articles" shortcut tile added to the Add Item wizard (routes straight into Web Links → Articles, no sidebar tab of its own); sidebar/wizard tab order changed to Websites, Shows, Music, Games, Films, Books, Arts.
- **Real bug found and fixed: sidebar allowed more than one tab open at once** — expanding a category tab was silently re-expanding the collapsible Dashboard row as an unintended side effect, since Dashboard's collapse state wasn't part of the categories' mutual-exclusion group. Fixed — now only one top-level sidebar tab is ever expanded at a time, Dashboard included.
- **Toolbar spacing, iterated to a final fix** — the gap separating the note-formatting buttons from the Expand/Close buttons was sized via `margin-left: auto`, which looked fine with 3 formatting buttons but grew into an oversized, unbalanced gap once Image became a 4th. Settled on a uniform gap between every button plus centering the whole row within the toolbar bar (equal left/right padding, equal top/bottom padding so the buttons sit vertically centered too) after a fixed-margin attempt still read as uneven.
- **Toolbar button colors redesigned** — resting buttons are now filled the same solid purple as the toolbar bar itself, with a dark icon/outline (matching the modal's own background color) for contrast — hover and the toggled-on "active" state (e.g. Focus mode engaged) both invert this, dark fill with a purple icon, so hovering previews what "on" looks like. Disabled buttons still read as grayed-out as before.

---

## Recent Additions (older session)

This session rebuilt the detail modal's "My Notes" (and Book's Chapters/Music Album's Song List) from a single plain textarea into a full numbered-notes system with a formatting toolbar, a distraction-free focus mode, and per-row rename — then iterated through many rounds of live visual polish and fixed several real bugs the new interaction surfaced along the way.

- **Numbered notes replace the plain textarea** — every category now gets a "+ Add Note" list (Note 1, Note 2, …, plus a "Summary" row 0 that falls back to old notes/bio text until edited) instead of one shrink-to-fit textarea; Book's existing Chapter list and Music Album's Song List use the same underlying row/favorite/note-input markup (`renderNumberedNoteList()`, `detailModalNotes.js`). Note bodies are `contenteditable` divs (not `<textarea>`), sanitized through a new allow-list HTML sanitizer (`noteSanitizer.js`, no external library — parses via an inert `<template>` fragment) so pasted content can't inject scripts/styles.
- **Formatting toolbar** (Bold/Highlight/Bullet + an Expand/focus-mode toggle — gained a 4th, Image, in the latest session above) replaces the modal's sticky title the moment "My Notes" or "Song List" is open — tied to the *section* being open (`_updateNoteEditingUi()` reading `#detail-notes-list`/`#detail-tracklist`'s own `open` class directly, via a `MutationObserver` so it also reacts when a *different* accordion force-closes one of them), not to which individual row has focus. An earlier row-focus-driven design was scrapped mid-session after proving fragile to a real async-storage race (`.focus()` gated behind awaited `ensureLiveItem`/`persistItem` calls delayed it past a deferred blur-cleanup tick, flickering the toolbar shut when switching rows) — the section-driven redesign sidesteps the race entirely.
- **Focus mode** (the toolbar's Expand button) hides the image, edit/bookmark/favorite icons, the artist header, *and* the Albums/Web Links/Add to Queue accordion rows, so the open note is the only thing left on screen — the divider line below My Notes/Song List also hides in this mode, since there's nothing left below it to divide from. Two of the three focus-mode accordions carry their own inline `style.display` (set per-category elsewhere), so hiding them from CSS needed `!important` to reliably win.
- **Material Design 3 motion** applied throughout the modal's transitions — new `--m3-standard`/`--m3-standard-accelerate`/`--m3-emphasized-decelerate` etc. easing tokens (`base.css`); the title↔toolbar swap slides up in both directions; accordion sections slide open/closed (no opacity fade — an early attempt paired opacity with a deliberately-oversized `max-height` cap, which reads as "fades in, *then* finishes growing" since a max-height transition always animates its full numeric range regardless of real content size — fixed by JS-measuring each section's exact `scrollHeight` instead, `_fitAccordionSection()`).
- **Rename a note's title** — a small pencil next to each row's label (only shown once that row is expanded, hidden again while actively renaming) turns the title into an inline-editable field: clears to empty with a "Rename…" placeholder (same `:empty::before` ghost-text convention the note body itself uses) and a real blinking caret, not a browser text-selection block. Custom titles persist per row number in new `noteTitles`/`chapterTitles` item fields (mirrors `noteTexts`/`chapterNotes`). Blurring *without ever typing* just restores whatever was showing before, without touching storage — otherwise merely clicking the pencil and clicking away would silently wipe an existing custom title back to the default. The row's own "open this note" icon changed from a pencil to a plus-in-a-circle so it's no longer visually identical to the smaller rename pencil now sitting next to it in the same row (Song List's per-track rows keep the plain pencil — those are real iTunes track titles, not renameable).
- **Real bugs found and fixed while building this**: (1) a `closeAccordionsExcept()`-driven cross-accordion bug where a force-closed section's header correctly showed collapsed but its content stayed fully visible underneath — `closeAccordionsExcept()` only ever removed CSS classes, with no idea `_fitAccordionSection()` had left an inline `style.maxHeight` override behind, and inline styles always beat a base class's `max-height: 0`; (2) cancelling a title rename via Escape was bubbling up to `main.js`'s global document-level Escape handler and closing the *entire modal*, since `preventDefault()` alone doesn't stop propagation — needed `stopPropagation()` too; (3) an early version of the rename field placed the caret at the end of the *existing* title text instead of clearing it first, so typing silently appended onto the old label (`"Note"` + `"My Custom"` saved as `"NoteMy Custom"`) rather than replacing it.

*(The session before that — replaced the Music Album gallery's single low-res iTunes cover with a real multi-image gallery sourced from MusicBrainz + the Cover Art Archive, plus several rounds of detail-modal visual polish (hover-dim, a repositioned sponsored-tag tooltip, Year removed from the modal's title area). Before that — 214 more IMDb Top 250 movies seeded into curated Top 100, "Curated SaveCraft" reshaped into a two-tier browsing experience, and the previously-dead "Shared Saves" dropdown item wired up for the first time. See git history around that era if needed.)*

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
| `kanban.js` | Kanban board rendering, drag-and-drop (cross-column + within-column reorder) — `KANBAN_DEMO`/`KANBAN_COLUMNS` exported for reuse by the Dashboard |
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
| `main.js` | Entry point — search, sort, theme, sidebar collapse, mobile sidebar, `init()`, all DOMContentLoaded event wiring |

### `scripts/` (admin tooling, not loaded by the extension)

One-off HTML tools for seeding curated Firestore data — plain `fetch()` against the Firestore REST API + Firebase Auth REST API, no SDK, no build step. Each has a Sign In *and* Create Account button, so seeding doesn't require an existing SaveCraft login. Require the `curated_items` Firestore rule to temporarily allow `if request.auth != null` (revert to `if false` after running). Notable ones: `seed-book-authors.html` (83 Book Author docs), `seed-creator-cards.html` (249 Movie Director/Show Creator/Game Studio docs combined).

### `src/app/css/` stylesheets

Split along the same lines from the original `app.css`, loaded as separate `<link>` tags in a fixed order (order matters — later files can override earlier ones): `base.css` (reset, theme variables, header), `sidebar.css` (includes the collapsible desktop rail), `cards.css` (grid, cards, author pages), `detailModal.css`, `addEditModal.css`, `fetchAlbumsModal.css`, `kanban.css`, `dashboard.css`, `profile.css` (Profile page + its Connect Last.fm/Steam modals), `sharedSaves.css`, `embedBuilder.css` (Embed Builder page), `misc.css` (share modal, scrollbar, mobile responsive overrides).

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
| Musician | Music | Musicians |
| Music Album | *(hidden — accessed via subfolder)* | Albums |
| Show | Shows | *(none — see Recent Additions: Shows' old primary folder moved into Films as "Series")* |

`CATEGORIES`' order (`state.js`) directly drives both the sidebar and the Add-wizard tile grid order — that's why the table above is in that order, not alphabetical. **News is no longer a `CATEGORIES` member** (dropped this session — see Recent Additions); an existing News item is still fully functional wherever already reachable, it just has no dedicated nav tab or wizard tile anymore. Web Links' "Blogs" folder was renamed "News" as an informal replacement destination.

The `Music Album` category is not shown as a top-level sidebar entry. Instead, a permanent **Albums** subfolder (renamed from "Music Albums" — the badge/tag system below made the "Music" part redundant) appears under **Music** in the sidebar (the tab itself renamed from "Musicians" this session — see Recent Additions — but the permanent hardcoded subfolder for Musician items themselves is still labeled "Musicians"). This subfolder also works in Curated SaveCraft mode, navigating to the curated music album list for the selected genre.

Beyond each category's primary folder, several categories also have a **creator-card folder** — a non-primary subfolder that doubles as an entry point into a curated "creator card" bucket when browsing a curated genre (see "Author / Artist Profile Pages" below): Book → **Authors**, Movie → **Directors**, Show → **Creators**, Game → **Game Companies**. Game additionally has **Board Games**/**Console Games**/**Mobile Games** (its first-ever folders besides Game Companies) — of these, only Console Games maps to the full curated Games list (Top 100 games are all console/PC titles); Board Games and Mobile Games correctly show empty while browsing a curated genre, since there's no curated data for those types yet. Films additionally has a **Series** folder (new this session — see Recent Additions), alongside its existing Movies/Videos/Directors.

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
- **Left sidebar** — category navigation plus a "My Saves Queue" entry that switches to the Kanban view. A collapsible "Dashboard" row (arrow on the right, like a category, collapsed by default) reveals a "Queue Kanban" link straight to the board. Music (renamed from "Musicians" this session) has a permanent Albums subfolder. Collapsible on desktop to a 64px icon-only rail (toggle button in the sidebar header, top-left) — collapse state persists across reloads via `chrome.storage.sync`. The mobile drawer is unaffected (full-width overlay, unchanged).
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
The search bar and sort dropdown in the header filter both the grid view and the Kanban board in real time. Sort options: Newest/Oldest first (by save date), A → Z / Z → A (title), and Release Date (Newest/Oldest) — the latter two sort by an item's `year` field (populated for Music Albums via Fetch Albums import or the auto-backfill).

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
| Phase 3.5 | Scoped, not built | Embed Builder backend — a public, sign-in-gated `savecraft_embeds` Firestore collection (mirroring the existing `curated_items` public-read/admin-write-only rule pattern), a "Your Embeds" section on the Profile page, and the actual hosted `savecraft/embed.html` rendering page + generated `<iframe>` snippet. The client-side Builder UI itself (source picking, style panel, live preview, "Embed code" link) is already built — see "Embed Builder" above |
| Phase 4 | Planned | AI recommendations (requires Claude API via Firebase Function) |
| Chrome Web Store | Future | One-time $5 developer fee; publish when Phase 1 is stable |
