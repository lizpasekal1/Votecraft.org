# SaveCraft — Session Context for AI

This file helps Claude (or any AI assistant) quickly regain context on the SaveCraft project without re-reading the full codebase.

---

## Latest Session Summary

**Theme: a very long, rapid-fire session (mostly one-line instructions with almost no back-and-forth) that added image/hyperlink support to the My Notes formatting toolbar, then restructured category/sidebar navigation across four separate asks (TV Shows → Films, Musicians → Music, News tab removed, an Articles shortcut added), then fixed three real bugs the user found live — a highlighting bug, a sidebar single-tab navigation bug, and a toolbar spacing issue — and closed with a self-review pass that found and fixed one more small issue. Verified throughout with off-screen-positioned headed Playwright (`chromium.launchPersistentContext`, `headless:false` + `--window-position=-32000,-32000` — this session's environment had a regression where the previously-reliable `headless:true`/`--headless=new` pattern stopped loading extensions at all; the off-screen-window workaround is the new default going forward unless headless is confirmed working again).**

- **My Notes toolbar gained a 4th button: insert image** (`detailModalNotes.js`, `noteSanitizer.js`, `index.html`) — a prompt-based image-URL insert (`_insertImageLink()`, same `prompt()` pattern `promptAddFolder()` already used) via `execCommand('insertHTML', ...)`. Required extending the sanitizer, which previously stripped every attribute off every allowed tag — `IMG` is now allowed with a `src`/`alt` allow-list and a `SAFE_IMG_SRC` scheme gate (`http(s):`/`data:image/`), dropping the whole tag if the src fails rather than leaving a broken-image icon. **Real bug found and fixed**: the blur handler's "clear a stray auto-inserted `<br>`" cleanup checked `!inputEl.textContent.trim()` to decide "this row is empty" — but an image-only note has real content with *no text at all* (`<img>` contributes nothing to `.textContent`), so it was silently wiping the image the moment the row lost focus. Fixed in both the blur handler and the persist-vs-delete check (new shared `noteHtmlHasContent()` helper in `noteSanitizer.js`, replacing the old `!!plainTextFromNoteHtml(...)` truthiness checks everywhere).
- **Hyperlinks added to notes** — `<a href>` now survives the sanitizer too (`SAFE_LINK_HREF`, `http(s):` only — stricter than images, no `data:`), and a new `_linkifyTextNodes()` pass auto-wraps plain-text URLs the user types or pastes into real `<a>` tags on every sanitize (save and load), trimming trailing sentence punctuation off the match. Styled with the standard web blue+underline (`#3B82F6`), not the app's own purple accent. Clicking a link calls `chrome.tabs.create({ url })` rather than `window.open()`/a synthetic anchor click — this app's own page runs at a `chrome-extension://` origin, where neither of those reliably opens a new tab; `chrome.tabs.create` (already used by `share.js`) does.
- **Highlight color → yellow, bold → brighter** (`detailModal.css`) — `<mark>` background changed from the app's themed purple to a plain `#FDE047` yellow (fixed dark text color alongside it, since near-white dark-mode text would be illegible on yellow); `<b>` now uses `var(--text-primary)` instead of inheriting the note's dimmer base gray.
- **Real bug found and fixed: partial-selection dehighlighting** — un-highlighting only *part* of an already-highlighted selection (e.g. selecting just "hello" out of a highlighted "hello world") either left an empty, unselectable `<mark></mark>` "artifact" or silently did nothing. Root cause, confirmed via isolated (non-app) DOM testing rather than guesswork: `Range.extractContents()` doesn't reliably preserve a `<mark>` wrapper around the extracted slice (only clones it when the selection crosses an element boundary, not when it's fully inside one text node — the common case), and can leave an empty husk behind in the live document either way. Rewrote `_wrapSelectionInMark()` to decide "was this fully highlighted" from the **live DOM** before touching anything (not the unreliable post-extraction fragment), strip/sweep any marks extraction left behind, and explicitly hoist the reinsertion point out of any remaining `<mark>` before putting content back (insertNode() at a collapsed point *inside* a shrunk-but-non-empty mark was otherwise landing new content right back inside it). Confirmed Bold/Bullet/Highlight already correctly *toggle off* on a second click when the whole selection matches (native `execCommand` behavior for the first two; this fix's own unwrap logic for the third) — no separate "reverse effect" feature was needed, just this bug fix.
- **Category/sidebar restructuring, four separate asks in sequence**:
  - **TV Shows moved from the Shows category into Films** — after confirming scope via `AskUserQuestion` (user chose "move existing items too," not just add an empty new folder), Shows' old "TV Shows" folder (`default-shows-shows`) is retired; Films gained a new "Series" folder (`default-movies-series`) in its place. A one-time migration in `storage.js`'s `loadAll()` recategorizes any item already filed in the old folder (`category: 'Show'` → `'Movie'`, `folderId` → the new Series folder) and deletes the old folder, guarded the same way the existing "Music Albums" → "Albums" rename was. `PRIMARY_FOLDER_ID['Show']` was removed as part of this (Shows' remaining folders — Podcasts/Webseries/Tutorials/Creators — have no one folder that represents "the whole category" anymore, so the Shows tab is now unfiltered, same as Visual Art).
  - **Musicians tab renamed to Music** (`CAT_LABEL['Musician']`) — the folders underneath (Albums/Playlists/Musicians) were explicitly left untouched per the request ("leave the folders as is").
  - **News tab removed** — dropped from `CATEGORIES` entirely (existing News items still fully functional wherever already reachable — search, curated pages, direct open — just no dedicated nav entry or wizard tile anymore). Web Links' "Blogs" folder renamed to "News" as its informal replacement, via the same rename-migration pattern as the Music Albums/Series folder renames.
  - **New "Articles" shortcut tile** in the Add Item wizard (both the popup and the main app) — not a real category (no `CATEGORIES` entry, no sidebar tab), just a `__articles__` special-case tile (mirroring how `__music__` already worked, in the opposite direction) that routes straight to Web Links, pre-filed into the Articles folder, skipping the folder-picker screen entirely.
  - **Sidebar/wizard tab order changed** to Websites, Shows, Music, Games, Films, Books, Arts (`CATEGORIES` array order in `state.js` drives both).
- **Real bug found and fixed: sidebar allowed multiple tabs open at once** — expanding a category tab was silently re-expanding the Dashboard row (and its "Queue Kanban" link) as a side effect, because Dashboard's collapse state was deliberately excluded from the categories' mutual-exclusion group (an old, since-outdated design choice), and the category-tab click handler rebuilt `state.collapsed` from a category-only list that never included `'dashboard'`. Fixed by including Dashboard in the mutual-exclusion group both directions — `wireDashboardLink()` now takes an `otherCollapsibleIds` param (can't close over `sidebarCategoryList` directly, since it's also called from the curated-genre-picker branch, textually before that list is computed) and expanding Dashboard now collapses every category tab the same way expanding a category collapses Dashboard.
- **Real bug found and fixed: toolbar spacing** — `.detail-note-toolbar-btn--expand`'s `margin-left: auto` (meant to visually separate the Bold/Highlight/Bullet formatting cluster from the Expand/Close action cluster) pushed the action cluster all the way to the toolbar's right edge — fine with 3 formatting buttons, but once Image became a 4th, the row no longer filled the available width evenly and the auto-margin gap grew large and unbalanced. Replaced with a fixed `margin-left: 20px`.
- **AI-slop self-review, on request** — read the session's full diff back looking for redundant/dead code; found one real (minor) issue: `noteHtmlHasContent()` parsed the same HTML string into a `<template>` twice (once inside `plainTextFromNoteHtml()`, again for the `<img>` check). Merged into one parse.

---

## Previous Session Summary

**Theme: a very long, highly iterative session (mostly live screenshot-driven feedback, one instruction at a time) that rebuilt the Add/Edit Item modal from scratch — a 4-screen wizard with a separate search screen and a dozen-plus fields collapsed into a 3-screen wizard where the Title field itself doubles as the search box and the review screen shows just Title+URL — then a long tail of header/spacing/alignment polish on top of that, a from-scratch feature for Movie's "Videos" folder (thumbnail fetch, embedded video lightbox, Wikipedia-enrichment opt-out), a generalized card-badge system, and category renames. Verified throughout with headless Playwright (`chromium.launchPersistentContext`, `--load-extension`/`--headless=new`) — every fix checked against both a targeted repro and the full existing regression script (`pw-test/test.js`) before being called done.**

- **Add Item simplified from 4 screens to 3** (`addEditModal.js`) — the old dedicated "live search" screen (Screen B) is gone. Category tiles → folder picker (unchanged) → a single review screen showing only **Title** and **URL**. For Music Album/Show/Book/Game/Movie, the Title field itself doubles as the live search box (placeholder "Search title", small icon on the right, same debounced ~500ms search against the same free APIs as before) — picking a result silently fills the *hidden* Author/Image-URL fields (still saved, just not shown at add time) so cards/detail pages still get correct art/links. Musician (and Visual Art/Web Links/News, which never had a search source) gets a plain "Title" field. Background Wikipedia/creator enrichment still fires — on result-select, or on Title-field blur for manual entries. This was a large, deliberate scope decision confirmed via `AskUserQuestion` before starting (user picked "full replacement" over "simplify UI but keep rich fields").
- **Edit Item field layout reworked** (`addEditModal.js`, `index.html`, `addEditModal.css`) — Title/Author row order swapped (Title first now); Image URL/URL row moved above Summary; Web Links/Platforms is now always the *last* field section (previously positioned right after Platforms wherever that fell per-category) — its dropdown now opens **upward** instead of down, since being last meant it used to get clipped by the modal's own scroll boundary with almost no room below it. A "YouTube URL" custom-link row (the same `#youtube-url-group`/`item.youtubeUrl` field, just relocated) is appended as the last row *inside* that dropdown, after the per-service checkboxes — lets the user add one specific video link without cluttering the main form; padding/horizontal-inset matched to the checkbox rows above it (14px, previously flush with the dropdown edge). The old separate "YouTube URL" section standalone in the main form is gone for every category except Musician/Music Album/Favorite Albums (which keep their own separate compact paired layout with Platforms, untouched throughout this whole session per an explicit early "leave music as-is" instruction).
- **Real bug found and fixed**: moving `#youtube-url-group` into `#platform-chips` broke on the *second* category switch — `updatePlatformsSection()`'s `list.innerHTML = ...` rebuild detaches any manually-appended child (a detached node is invisible to `getElementById`), so the very next call's `list.appendChild(document.getElementById('youtube-url-group'))` passed `null` and threw. Fixed by relocating the group out to a safe parent (`#modal-step2`) *before* the `innerHTML` wipe, every time.
- **Header/chrome polish** — no more X close button (click-outside/Escape still close it); the back arrow now carries the current folder/category name as a label next to it (mirroring the toolbar popup's own header, which was itself used as the direct visual reference); "Choose a folder"/the Musician-vs-Album sub-choice screen (renamed from "Musician or Album?" to just "Choose a folder", matching every other folder screen) drop their bookmark icon; the review screen has no heading at all now, just the back arrow + folder name (was "Add to SaveCraft" + icon); "Edit Item"'s heading is left-aligned so the icon lines up with the fields below instead of sitting centered above them; both the Category and Folder `<select>`s got a custom dropdown arrow (native browser arrows aren't positionable) placed at the same 6px right-inset as the "✕" clear buttons elsewhere, via a new `.select-with-arrow` wrapper span (required threading the display-toggle target in `addEditModal.js` from the select itself to the new wrapper at all 6 call sites, since a native `<select>` can't contain a sibling SVG). Popup (`popup.css`) and the desktop modal both got rounded corners (popup's `body` had none before; desktop's `.modal` already did).
- **Real bug found and fixed**: a generic `.form-group input` CSS rule was unintentionally matching the Title/Author fields too (nested inside a `.form-group`, just via a bordered `.title-author-row` wrapper instead of its own border) — gave them their own border on top of the row's, invisible at rest (same gray) but a visible double line once focused, since only the row's own `:focus-within` tinted purple. Fixed by raising the "no border" rule's specificity (`.title-author-row .title-author-input`) rather than touching the generic rule.
- **Movie's "Videos" folder — new special-cased behavior throughout**, for manually-added clips (YouTube/Vimeo) rather than real movies:
  - No title search, no Wikipedia enrichment on add (`updateTitleSearchUi`/`kickOffTitleEnrichment` early-return for this folder).
  - **Real bug found and fixed, independent of the above**: `detailModalSummary.js`'s Book/Show/Movie/Game Wikipedia fallback ran on every *view* of the item too (not just add), keyed off title alone — a clip whose title happened to match a real movie's Wikipedia page got silently overwritten with that movie's summary/director/poster the first time it was opened, even though add-time enrichment had correctly been skipped. Excluded via `item.folderId !== 'default-movies-videos'`.
  - URL field relabeled "Video URL" for this folder specifically; the old separate `#youtube-url-group` field is hidden here (redundant — `item.url` is what the new thumbnail/lightbox features actually read, and `item.youtubeUrl` was never touched by them).
  - **Thumbnail fetch**: Microlink (the existing post-save image fallback, used for every other category) actively blocks YouTube with an anti-bot error — new `fetchVideoThumbnail()` (`api.js`) gets it straight from the host instead: YouTube's `img.youtube.com/vi/<id>/hqdefault.jpg` is fully derivable from the video id (`getYoutubeVideoId()`, `utils.js`, no network call needed), Vimeo goes through its public oEmbed endpoint. No free summary source exists without an API key, so summary is deliberately left empty rather than guessing.
  - **New video lightbox** — clicking the featured image on a Videos-folder item's detail modal opens an embedded YouTube/Vimeo player (`openVideoLightbox()`/`closeVideoLightbox()`, `detailModal.js`, new `#video-lightbox-overlay` markup) instead of the plain image-zoom lightbox every other category gets; `getVideoEmbedUrl()` (`utils.js`) builds the iframe `src`. Image dims on hover (reused `.detail-image--clickable`, the same treatment Music Album's gallery image already had).
  - Author-field placeholder is "Creator", not "Director", for this folder.
  - Folder display order is now Movies → Videos → Directors (was alphabetical, which put Directors first) — new `sortFoldersForDisplay()` (`utils.js`), used consistently by the Add wizard's folder screen, the sidebar, the popup, and Edit's folder `<select>`.
- **Card badges generalized** (`renderGrid.js`) — every card's top-right badge is colored by category (unchanged) but now shows the item's **folder name** instead of the generic category label when it has one (e.g. a Book in "Authors" shows "AUTHORS", not "BOOK") — replaces a separate folder-icon label that used to sit next to it. Built for Movie's Videos folder specifically first ("Video" badge, no icon), then explicitly generalized to every category per a follow-up instruction ("this should be the standard throughout").
- **Category renames**: `Musician`'s `CAT_LABEL` "Music" → "Musicians"; `Music Album`'s "Music Albums" → "Albums" (default folder name, sidebar's permanent subfolder link, and the category `<select>` option all updated to match — plus a one-time storage migration renaming the folder for installs that already had it seeded under the old name, since the seed-if-missing logic alone wouldn't touch existing folders). Movie's category-select option "Movie" → "Films" (was already `CAT_LABEL['Movie'] === 'Films'` everywhere else; just this one hardcoded `<option>` hadn't matched).
- **Auto-fetch featured image extended to Edit** (`handleSaveItem`) — the post-save Microlink image fallback used to only run for brand-new items (`!state.editingId`); now also runs when editing an item that still has no image and gets a URL added/changed. Also fixed a related staleness bug while doing this: the fetch's callback only ever called `persistItem()` (storage), never updated the in-memory `state.items` entry or re-rendered — so a freshly-fetched image wouldn't actually appear on screen until a full reload, for both this new Edit case and the pre-existing Videos-folder/Microlink paths.

---

## Earlier Session Summary

**Theme: rebuilt the detail modal's My Notes (plus Book's Chapters, Music Album's Song List) from a single plain textarea into a numbered-notes system with a formatting toolbar, a distraction-free focus mode, and per-row rename — then a long tail of live visual/spacing polish and several real bugs found along the way. This session also had a working way to actually run the extension: headless Playwright (`chromium.launchPersistentContext` with `--load-extension`/`--headless=new`), a real change from every prior session's "can't load a Chrome extension" limitation — every fix below was verified against a full regression script plus a targeted repro before being called done, not just reasoned about from reading CSS.**

- **Numbered notes, not a textarea** (`detailModalNotes.js`, `noteSanitizer.js` new) — `renderNumberedNoteList()` is the shared row renderer for My Notes (every category), Book's Chapters, and (a separate, simpler code path) Music Album's Song List: a favorite-star-turned-pencil-turned-plus icon opens/closes a per-row `contenteditable` note body, sanitized through a new allow-list HTML sanitizer (`sanitizeNoteHtml`/`plainTextFromNoteHtml` — parses via an inert `<template>` fragment, no external library) so pasted HTML can't inject scripts/styles. Row 0 ("Summary"/"Basic Notes") falls back to the item's old plain-text notes/bio until the user actually edits it (a `*ZeroSeeded` flag stops the fallback from reappearing after an intentional clear — same pattern Book's Chapter 0 already used).
- **Formatting toolbar (Bold/Highlight/Bullet/Expand)** replaces the modal's sticky title the instant "My Notes" or "Song List" is open. Went through a full redesign mid-session: the first version tied toolbar visibility to *which row had focus*, which proved fragile to a real timing race (`.focus()` on a newly-clicked row was gated behind `await ensureLiveItem()`/`await persistItem()` — genuine `chrome.storage.sync.set` I/O, not just a microtask — so an earlier "defer the blur cleanup by one tick" fix wasn't reliably enough of a head start, and the toolbar flickered shut switching between rows). Rebuilt around a simpler, robust model instead: `_updateNoteEditingUi()` reads `#detail-notes-list`/`#detail-tracklist`'s own `open` class directly, and a `MutationObserver` (set up once in `initNoteToolbar()`) reacts to that class changing no matter what caused it — including a *different* accordion force-closing one of them via `closeAccordionsExcept()`, a path that never called back into this file before.
- **Focus mode** (the toolbar's Expand button) hides the image, edit/bookmark/favorite icons, the artist header, and — added later in the session — the Albums/Web Links/Add to Queue accordion rows too, so the open note is the only thing left on screen; the divider line below My Notes/Song List also hides in this mode. Two of those three accordion rows carry their own inline `style.display` (toggled per-category in `detailModalSummary.js`/`detailModalQueue.js`), which always wins over a plain CSS class rule — hiding them from focus-mode CSS needed `!important` to reliably override that.
- **Material Design 3 motion** applied throughout (new `--m3-standard`/`--m3-standard-accelerate`/`--m3-emphasized-decelerate` etc. easing tokens, `base.css`) — asymmetric easing (quicker "accelerate" on exit, gentler "decelerate" on enter), the title↔toolbar swap reading as one continuous upward slide in both directions, accordion sections sliding open/closed with no opacity fade. The "feels like it fades before it opens" complaint mid-session traced back to `.detail-accordion-collapsible` animating `max-height` toward a deliberately oversized static cap (320px/2000px, so open-ended content like more notes never needs its own nested scrollbar) — a `max-height` transition always animates its *full declared range* regardless of real content size, so short content reached its true size almost instantly while the invisible climb toward the cap kept the transition "running." Fixed with `_fitAccordionSection()`, which JS-measures each section's real `scrollHeight` and sets that as an exact `max-height` override instead of relying on the static cap — a genuine "sliding door" that animates exactly as far as it needs to, no further.
- **Rename a note's title** — a small pencil next to each row's label, shown only once that row is expanded (hidden again the moment renaming actually starts — needed `!important`, since `:has()`'s specificity comes from its argument, and the 2-class "show while open" selector actually outweighs the 1-class "hide while editing" one regardless of source order). Clicking it clears the field to empty and shows a "Rename…" placeholder (same `:empty::before` ghost-text convention the note body's own placeholder already used), with a real collapsed/blinking caret rather than a browser text-selection block. Custom titles persist per row number in new `noteTitles`/`chapterTitles` item fields, mirroring `noteTexts`/`chapterNotes`. Blurring *without ever typing* (tracked via a one-shot `input` listener) just restores whatever was showing before without touching storage at all — clearing the field on entry made this necessary, since otherwise merely clicking the pencil and clicking away again would silently wipe an existing custom title back to the default. The row's own "open this note" icon changed pencil → plus-in-a-circle so it's no longer visually identical to the new, smaller rename pencil sitting right next to it in the same row; Song List's per-track rows deliberately kept the plain pencil and never got a rename control at all — those are real iTunes track titles, not user-editable.
- **Real bugs found and fixed, not just polish**: (1) `closeAccordionsExcept()` (the shared registry, `detailModalAccordions.js`) only ever removes CSS classes — it had no idea `_fitAccordionSection()` leaves an inline `style.maxHeight` override behind, and inline styles always beat a base class's `max-height: 0`, so a force-closed section's header correctly showed collapsed while its content stayed fully visible underneath (confirmed on a Music Album item: My Notes closed by Song List opening, chevron collapsed, rows still rendered). `_updateNoteEditingUi()` now clears that inline override independently for whichever of the two sections isn't currently open, every time it runs. (2) Escape while renaming a title was bubbling up to `main.js`'s global document-level keydown handler and closing the *entire detail modal* — `preventDefault()` alone doesn't stop propagation; needed `stopPropagation()` too. (3) An early version of the rename field left the *existing* title text in place and just moved the caret to its end (to get a real blinking cursor without `execCommand('selectAll')`'s static highlight) — but typing then silently appended onto the old label instead of replacing it (`"Note"` + typed `"My Custom"` saved as `"NoteMy Custom"`, caught via a headless test reading the persisted value back from storage). Fixed by clearing the field on entry and tracking "was it actually touched" separately, as described above.
- **A long tail of live spacing/icon polish**, each verified with a targeted headless Playwright measurement rather than eyeballing a screenshot: the gap below an open accordion section trimmed from 12px to a standard 8px (margin-bottom on `.detail-accordion-collapsible.open` was stacking on top of `#detail-body`'s own 8px flex gap instead of just providing it); 20px of breathing room added below both "+ Add Note" and Song List's last track row (neither had any before, so the button/row sat flush against the divider); the rename field's own light-gray editable-box background (`var(--search-bg)`, same treatment as the search input, theme-aware) narrowed to stop 5px short of the plus/circle icon instead of butting against it; several rounds of pixel-level pencil/plus positioning and sizing nudges.
- **Not done**: the headless-Playwright testing loop covers rendering, class/state toggling, persistence round-trips, and event-propagation bugs — real coverage this session had that prior sessions didn't — but it's still not a substitute for a human clicking through the real popup UI on a real saved library; no visual regression check across both light and dark themes was done for every change in this batch.

---

## Earlier Session Summary (superseded)

*The session before that — replaced the Music Album gallery's single low-res iTunes image with a real multi-image gallery sourced from MusicBrainz + the Cover Art Archive (with prev/next/thumbnail-strip navigation and an on-demand "Check for more art" button in the lightbox), plus several rounds of detail-modal visual polish (hover-dim on the album art, the sponsored-tag tooltip flipped to open downward, Year dropped from the modal's Artist line). Before that — a string of detail-modal visual tweaks, an "AI slop" cleanup pass, deleting the long-dead `app.js`/`app.css` monolith backup, splitting both `render.js` and `detailModal.js` (991 lines) into focused per-concern modules, a real scroll-when-closed bug fix, and moving Musician's bio into My Notes. See git history around that era if needed.*

---

## File Locations

| What | Path |
|------|------|
| Chrome extension source | `/Users/lizpasekal/Documents/Votecraft.org/Chrome Extensions/Savecraft/` |
| Manifest | `…/Savecraft/manifest.json` (must stay at extension root — Chrome requirement) |
| Main library page | `…/Savecraft/src/app/index.html` |
| Library logic | `…/Savecraft/src/app/js/*.js` — 30 ES modules; see `savecraft-overview.md`'s module table for what lives where (`render.js` and `detailModal.js` are now thin barrels/orchestrators over several `render*.js`/`detailModal*.js` files, not single large modules) |
| Library styles | `…/Savecraft/src/app/css/*.css` — 10 files split by feature area |
| Background service worker | `…/Savecraft/src/background/background.js` |
| Content script | `…/Savecraft/src/content/content.js` |
| Popup | `…/Savecraft/src/popup/popup.{html,css,js}` |
| Sponsored page | `…/Savecraft/src/sponsored/sponsored.html` |
| Logo assets | `…/Savecraft/images/logos/` |
| Documentation | `/Users/lizpasekal/Documents/Votecraft.org/Chrome Extensions/Savecraft/Documentation/` |

Always edit source code in `Votecraft.org/Chrome Extensions/Savecraft/`. Docs go in the same folder under `Documentation/`.

**Note:** The original monolithic `src/app/app.js`/`app.css` have been deleted (2026-07-29) — the module split was confirmed working, and their one remaining dependent, `scripts/seed-curated.js`, was repointed at `scripts/seed-payload.json` (which already held the same curated data, extracted earlier) first.

---

## Categories

```js
// News dropped as its own top-level tab this session — no CATEGORIES entry, but CAT_LABEL/
// CAT_EMOJI/CATEGORY_PLATFORMS['News'] etc. are deliberately still defined below, since an
// existing News item is still fully functional wherever it's already reachable.
const CATEGORIES = ['Web Links', 'Show', 'Musician', 'Music Album', 'Game', 'Movie', 'Book', 'Visual Art'];

const CAT_LABEL = {
  'Web Links': 'Websites', 'News': 'News',
  'Book': 'Books', 'Game': 'Games', 'Movie': 'Films',
  'Musician': 'Music', 'Music Album': 'Albums', // 'Musician' renamed this session (was 'Musicians')
  'Show': 'Shows', 'Visual Art': 'Arts',
};

const PRIMARY_FOLDER_ID = {
  'Movie': 'default-movies-movies',
  // 'Show' entry removed this session — Shows' old "TV Shows" folder (which was primary) moved
  // into Films as "Series"; Shows' remaining folders have no one folder that represents "the
  // whole category" anymore, so the Shows tab is now unfiltered, same as Visual Art.
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
  authorReturnView: string | null, // the view to restore when leaving an author page via its back button — also what the sidebar falls back to (sidebarEffectiveView) so browsing a curated genre survives visiting an author page, see Sidebar Structure below
  activeCuratedFolderId: string | null, // new — which sidebar subfolder was actually clicked while browsing a curated genre; not derivable from state.view alone since several sibling folders can route to the identical view string, see Sidebar Structure below. Not persisted.
  kanbanSort: { [colKey]: 'newest' | 'oldest' | 'az' | 'za' | 'manual' }, // per-column; 'manual' new this session — see Kanban Drag-and-Drop below
  // ...curated state, etc.
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
| `'author:Movie:Bong Joon-ho'` | Director page for Bong Joon-ho (new this session — same mechanism as Musician, generalized to Book/Movie/Show/Game) |
| `'genre:Jazz'` | Curated genre landing — shows category list in sidebar |
| `'genre:Jazz:Movie'` | Curated genre + category drilldown — shows curated items |
| `'genre:Top 100:Musician'` | Curated Top 100 musician entries (100 artists) |
| `'genre:Top 100:Music Album'` | Curated Top 100 albums (~2,439 entries — bulk auto-synced, not an actual hand-curated shortlist, see Curated Data below) |
| `'genre:Top 100:Book Author'` / `'Movie Director'` / `'Show Creator'` / `'Game Studio'` | Curated "creator card" buckets (83/78/89/82 entries), reached via each category's Authors/Directors/Creators/Game Companies folder |
| `'curated'` | **New this session.** The top-level Curated SaveCraft landing — a bare-bones, ActBlue-style flat list of nonprofit-sponsored orgs (`renderCuratedBareList()`), not the old plain "Pick a category" empty state |
| `'curated-full-list'` | **New this session.** The rich hero+carousel-rows page (`renderCuratedDirectory()` — this is the *same function* that used to be the direct top-level landing before this session's split), reached via the "See all →" button on `'curated'` above |
| `'shared'` | **New this session.** The Shared Saves dashboard (`renderSharedSavesPage()`, `sharedSaves.js`) — "Lists You Follow" portal cards (one per genre in `state.followedCuratedLists`, real navigation) + a Friends stub (moved here from the Profile page) |

**Updated this session — this table entry used to say otherwise:** `main.js`'s `init()` no longer force-applies `'dashboard'` on load; every navigation call site (including arriving at Dashboard or Profile) now calls `persistViewState()`, so a reload restores whatever page the user actually last had open, not always the Dashboard.

`renderGrid()` early-returns to `renderAuthorPage()` when `state.view.startsWith('author:')`.

For `author:Musician:X` views, `getFilteredSortedItems()` returns:
1. User-saved `Musician` and `Music Album` items with `author === name`
2. Curated `Music Album` items from `CURATED_ITEMS` where `notes === name`

Generalized this session to every `author:<cat>:X` view (`cat` one of `Musician`/`Book`/`Movie`/`Show`/`Game`):
1. User-saved items in `cat` (or `Music Album` for `cat === 'Musician'`) with `author === name`
2. Matching curated items pulled in from **every genre** in `CURATED_ITEMS`, via `resolveCuratedCreatorName(curatedCat, item)` — tries `item.author`, then Book's split-title, then Movie/Show/Game's static `curatedCreatorLookup.js` data, then (Musician only) `item.notes === name`. Deduped by resolved title (not just id) — the same work is frequently curated separately per genre.

---

## Author / Artist Profile System

### Key functions
- `navigateToAuthor(name, category)` — sets `state.view = 'author:<category>:<name>'`, auto-creates stub profile if none exists
- `findAuthor(name, category)` — looks up by exact name + category match (case-sensitive by design)
- `persistAuthor(author)` — saves to `chrome.storage.sync` as `author_<id>`
- `renderAuthorPage()` — renders full author page into `#cards-grid`

All in `js/authors.js` (profile CRUD/navigation) and `js/renderAuthorPage.js` (`renderAuthorPage`). Note: there used to be an "Edit Profile" modal (`openAuthorEditModal`/`handleSaveAuthor`) — it was dead code (never wired to a trigger) and was removed during the app.js → ES module split. Author photo/bio/website are now only ever set automatically via the Wikipedia/MusicBrainz enrichment lookups, not user-editable through the UI.

### Author page structure
- Back button in `#grid-title` → returns to category view (or, if reached from curated genre browsing, keeps the sidebar showing that genre — see Sidebar Structure below)
- Header: photo, name, bio, website — bio/photo enrichment is Musician-only; Book/Movie/Show/Game profile pages show a plain name until that's built (their curated "creator card" already has bio/photo, just not yet copied onto this stub — a known/flagged gap, not an oversight)
- For `Musician` category: **Fetch Albums** button appears on the header
- Works grid: all items by this author. For `Musician`, includes curated Music Albums from `CURATED_ITEMS` where `notes === artistName`. Generalized this session to Book/Movie/Show/Game — see the `author:` view routing entry above for the full resolution order.
- Clicking a card on the author page opens the detail popup

### Clickable names
`CREATOR_CARD_CATEGORY` (`state.js`) — `{ Musician: 'Musician', 'Book Author': 'Book', 'Movie Director': 'Movie', 'Show Creator': 'Show', 'Game Studio': 'Game' }` — generalizes what used to be Musician-only logic:
- **Curated creator cards** (Musician, and — new this session — Book Author/Movie Director/Show Creator/Game Studio): the title itself is rendered as a `card-author-link card-title` button (main grid) / the `_titleHtml` branch (detail modal, gated on `CREATOR_CARD_CATEGORY[item.category] && !isOwnAuthorPageView(item.title)`) → clicking it calls `navigateToAuthor(item.title, CREATOR_CARD_CATEGORY[item.category])`
- **Curated Music Album cards**: the `item.notes` (artist name) is shown as a `card-author-link` above the title → navigates to that musician's page
- **Curated Book/Movie/Show/Game cards** (the works themselves, not the creator cards): the resolved author/director/creator/studio name (`item.author`, filled in via `splitCuratedTitleCreator`/`getStaticCuratedCreator` at render time, see Curated Data below) shown as a `card-author-link` above the title, same as Music Album
- **Detail modal**: creator-card title or work's author/artist name is a `.detail-author-link` → closes modal and navigates to that profile page
- A co-directed movie's byline shows `${name} …` (`item.authorHasMore`) — display-only, the `data-author` attribute driving the actual link always stays the clean name
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

**Mutual exclusion with category tabs** (fixed this session — was a real bug) — Dashboard's collapse state is now part of the *same* mutual-exclusion group the category tabs share, not a standalone toggle: expanding a category tab collapses Dashboard, and expanding Dashboard collapses whichever category tab was open, so at most one top-level sidebar tab is ever expanded at once. Previously Dashboard was deliberately excluded from that group (`state.collapsed = new Set(sidebarCategoryList)` never included `'dashboard'` when a category was expanded), which meant expanding *any* category silently dropped `'dashboard'` back out of the collapsed set as a side effect — Dashboard (and its Queue Kanban link) would visibly re-expand every time a different tab was clicked. `wireDashboardLink()` now takes an `otherCollapsibleIds` param (`sidebarCategoryList` in normal mode, `[]` in the curated genre-picker, which has nothing else collapsible to close) rather than closing over `sidebarCategoryList` directly, since it's called from both branches and the genre-picker one runs before that list is even computed.

### Collapsible desktop rail
Desktop-only (the mobile drawer is a separate full-width overlay and unaffected). `#btn-sidebar-collapse` (in `.sidebar-header-controls`) toggles a `.sidebar-collapsed` class on both `#sidebar` and `#header-sidebar`, shrinking them to a 64px icon-only rail — CSS-only hiding via a `.sidebar-label-text` span that wraps just the text portion of each category/genre label (added specifically so it could be hidden without touching the icon or the click-handling/wiring, which is unchanged). Persisted via `chrome.storage.sync` (`savecraft_sidebar_collapsed`), applied in `main.js`'s `init()` the same way theme is (`applySidebarCollapsed()`/`toggleSidebarCollapsed()`, mirroring `applyTheme()`/`toggleTheme()`).

### Curated-genre subfolder navigation (new this session)
Every subfolder row (Authors, Directors, Movies, Videos, Board Games, ...) computes a single `curatedTarget` string in `renderSidebar.js`'s `subfolderRows` map, used both for the row's `data-curated-target` attribute and its `isActive` check:

```js
const curatedTarget = FOLDER_ID_TO_CURATED_CATEGORY[folder.id]
  || (FOLDER_SHOWS_FULL_CURATED_CATEGORY.has(folder.id) ? cat : folder.id);
```

- **`FOLDER_ID_TO_CURATED_CATEGORY`** (`renderSidebar.js`) — folders that are their own dedicated curated "creator card" bucket: `{ 'default-books-authors': 'Book Author', 'default-movies-directors': 'Movie Director', 'default-shows-creators': 'Show Creator', 'default-games-companies': 'Game Studio' }`.
- **`FOLDER_SHOWS_FULL_CURATED_CATEGORY`** (`renderSidebar.js`, a `Set`) — folders that represent "the whole category" closely enough to show the full curated list: `default-books-books`, `default-movies-movies`, `default-shows-shows`, `default-games-console`, `default-musicians-musicians` (the last one easy to forget — it's Musician's *own* primary folder, not a creator-card bucket, but still needs the full-category fallback or it silently shows 0 like a real no-data folder would).
- **Anything else** (Videos, Podcasts, Webseries, Tutorials, Board Games, Mobile Games) falls through to `folder.id` itself as `curatedTarget` — since a real folder id never matches a key in `CURATED_ITEMS[genre]`, this is a deliberate no-op that resolves to an empty list via the exact same `if (cat && CURATED_ITEMS[genre] && CURATED_ITEMS[genre][cat]) {...} else { items = []; }` fallback `getFilteredSortedItems()`'s `genre:` branch already had — no new empty-state code needed, just routing into the existing one correctly.

The subfolder click handler then does exactly one thing differently depending on what's on the row:
```js
if (isCuratedGenre && el.dataset.permanent) {          // the hardcoded Music Albums link
  state.view = `genre:${curatedGenreBase}:${el.dataset.view}`;
} else if (isCuratedGenre && el.dataset.curatedTarget) { // every real subfolder, while browsing a curated genre
  state.view = `genre:${curatedGenreBase}:${el.dataset.curatedTarget}`;
  state.activeCuratedFolderId = el.dataset.view;          // el.dataset.view is still the folder's own real id here
} else {                                                  // My Saves mode — unaffected by any of this
  state.view = el.dataset.view;
}
```
This is what fixes the original bug (clicking any subfolder while browsing Top 100 used to drop the `genre:` prefix and bounce back to "My SaveCraft") — every branch that's reachable while `isCuratedGenre` is true keeps the prefix.

**Active-row highlighting** (`state.activeCuratedFolderId`) exists because `curatedTarget` isn't always unique per folder — before `FOLDER_SHOWS_FULL_CURATED_CATEGORY`/the empty-fallback were introduced, several sibling folders (Movie's Movies/Videos, Show's four folders, Game's four folders) all resolved to the *same* `curatedTarget` and would all light up as active together. The row's `isActive` check is:
```js
const isActive = isCuratedGenre
  ? state.view === `genre:${curatedGenreBase}:${curatedTarget}` && state.activeCuratedFolderId === folder.id
  : state.view === folder.id;
```
Set on every curated-mode subfolder click, cleared (`= null`) whenever navigating away from a specific folder — the category-tile click handler, the plain (My Saves) branch, and the permanent Music Albums link all reset it, so a stale highlight never lingers on an unrelated row.

**Sidebar surviving author-page navigation** (`sidebarEffectiveView`, top of `renderSidebar()`):
```js
const sidebarEffectiveView = (state.view.startsWith('author:') && state.authorReturnView?.startsWith('genre:'))
  ? state.authorReturnView
  : state.view;
```
Every "which sidebar screen to show" decision in `renderSidebar()` — the top-level genre-picker-vs-category-tree branch, `isCuratedGenre`/`curatedGenreBase`, `isCuratedDrilldown`, `sidebarTitle`, and the sidebar's own back-button handler — reads `sidebarEffectiveView` instead of `state.view` directly. `isActive` checks throughout the rest of the function deliberately keep comparing the *real* `state.view`, so nothing shows falsely highlighted while genuinely on an author page (which matches no folder/category exactly, so correctly nothing lights up). Root cause this fixed: `navigateToAuthor()` sets `state.view = 'author:<cat>:<name>'`, which starts with neither `genre:` nor anything else the sidebar recognized, so every one of those decisions used to see "not in genre mode" and fall back to the top-level genre picker under a wrong "My Saves" label — reached by clicking *any* creator name while browsing a curated genre, not an edge case.

Top-level category tab counts (Books 89, Films 100, etc.) are suppressed while `isCuratedGenre` is true — `countLabel = (!isCuratedGenre && count > 0) ? ... : ''` — subfolder counts (`fCountLabel`, computed from `curatedTarget` the same way) are unaffected.

---

## Curated Data (Firestore)

### Firestore project
- Project: `votecraft-789`
- Collection: `curated_items`
- API key (read-only, safe to expose): in `_FIREBASE_API_KEY` constant in `js/storage.js`

### Loading
`_loadCuratedFromFirestore()` (in `js/storage.js`) paginates the collection in 300-doc pages.
Loaded at startup via `initCuratedItems()`, which calls `setCuratedItems()` (in `js/state.js`) to populate the module-level `CURATED_ITEMS` binding — this indirection exists because ES modules can't let other files directly reassign an imported `let`, only the exporting module can, so `state.js` exposes a setter for it. `init()` (in `js/main.js`) calls `initCuratedItems()` on startup.
Cached in `chrome.storage.local` for 24 hours. Cache version: `_CURATED_CACHE_VERSION` in `js/storage.js`, currently **10** (bump to force refresh — necessary any time `_loadCuratedFromFirestore()`'s parsing/bucketing logic changes, not just when the underlying Firestore data changes, since the cache stores the already-bucketed shape).

### Category normalization
Firestore stores plural/legacy category names. `_CAT_NORMALIZE` maps them to internal singular names:
```js
const _CAT_NORMALIZE = {
  'Movies': 'Movie', 'Books': 'Book', 'Games': 'Game',
  'Shows': 'Show', 'Musicians': 'Musician', 'Music Albums': 'Music Album',
  // NOTE: raw category "Music" (no "Album") is deliberately NOT mapped here — see below.
};
```
Applied in `_loadCuratedFromFirestore()` before building `CURATED_ITEMS`. **Bug fixed this session**: `'Music': 'Music Album'` used to be in this map. Live Firestore data confirmed `genre: "Top 100"` + `category: "Music"` is a legacy, mislabeled duplicate of the Musicians list (101 docs, `docId` pattern `top-100-music-cur-rs100-*`, titles are artist names like "The Beatles") — that mapping was silently merging those 101 mislabeled docs into the `Music Album` bucket, rendering Musician-name cards under "Music Albums." Removed the mapping entirely; those docs now land in an inert `CURATED_ITEMS[genre]['Music']` bucket nothing reads, instead of leaking into a bucket they don't belong in. `'Music Album'`/`'Music Albums'` (the real album categories) are untouched.

`'Book Author'`, `'Movie Director'`, `'Show Creator'`, `'Game Studio'` (new curated-only pseudo-categories, seeded this session) pass through unmapped/unchanged — they're stored in Firestore exactly as-typed, no normalization needed.

### CURATED_ITEMS structure
```js
CURATED_ITEMS = {
  'Top 100': {
    'Musician':       [ { id, title, url, imageUrl, notes, genre, category }, ... ],  // 100 artists
    'Music Album':    [ ... ],  // ~2,439 albums — bulk auto-synced, not an actual curated shortlist (see below)
    'Book Author':    [ ... ],  // 83 — new this session
    'Movie Director': [ ... ],  // 78 — new this session
    'Show Creator':   [ ... ],  // 89 — new this session
    'Game Studio':    [ ... ],  // 82 — new this session
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
- **Not an actual curated Top 100 album shortlist** — confirmed this session via direct Firestore aggregation query (~2,439 docs, all `itunes_*` ids) that this is bulk auto-synced album metadata, not a hand-picked list. Flagged as a real editorial gap, separate from (and not fixed by) the category-normalization bug above.

### Book/Movie/Show/Game creator data (new this session)
Unlike Music Album, **Movie/Show/Game curated items have no creator field anywhere in Firestore** — confirmed via direct query: plain titles ("Parasite", "Counter-Strike 2"), real description in `.notes`, nothing else. Resolved externally and kept as **static in-app data** (`js/curatedCreatorLookup.js`) rather than rewriting 300+ existing production `curated_items` documents:
- **Movie director** — Wikidata property P57, two-hop resolution: `wbsearchentities` (search by title, filtered by a description-keyword regex) → `Special:EntityData/<QID>.json` (read the P57 claim) → if the claim value is itself an entity reference, a second `wbgetentities` call resolves it to a name.
- **Show creator** — same two-hop pattern, property P170 (not P57 — verified P57 on a TV series returns per-episode directors, not a single showrunner).
- **Game studio** — simpler: Steam's `appdetails` endpoint (`developers` field), using the Steam app ID already embedded in each curated game's stored `url` (`/app/(\d+)/`) — no search/entity-resolution step needed.
- Bio/photo for all three — Wikipedia REST summary API, same pattern `ensureItemWikipediaInfo` already used. **Known failure mode, hit repeatedly**: an automated keyword-filtered match can reject a correct direct hit and fall through to a wrong search-retry result — happened for ~8 Show creators (fixed via direct `curl` verification against the expected exact title) and was much worse for Game studios (company names are far more ambiguous than person names — e.g. "Iron Gate" matched "Baldur's Gate 3"). Fixed for studios via an automated sanity filter (reject unless the studio name and matched article title share a normalized substring) rather than hand-checking all ~80.
- Book is different — its curated `.title` combines `"Title — Author"` in one field (pre-existing data, not something this session added), split apart via `splitCuratedTitleCreator()`.
- `curatedCreatorLookup.js` also exports the shared `getStaticCuratedCreator(cat, title)` (returns `{ name, hasMore }`) and `SPLIT_TITLE_CREATOR_CATEGORIES` — imported by `renderFilters.js`/`renderGrid.js` (rendering, since the 2026-07-29 `render.js` split) and `storage.js` (the already-saved-items backfill migration, see Earlier Session Summary above).

### Populating curated data (admin scripts)
`scripts/seed-book-authors.html` and `scripts/seed-creator-cards.html` (the 332 docs seeded this session) are real files in the repo now, not scratchpad-only — plain `fetch()` against the Firestore REST API + Firebase Auth REST API, no SDK. Both have a Sign In *and* Create Account button. To re-run any seeding, the Firestore `curated_items` rule must temporarily be `allow write: if request.auth != null;` (not `if true` — the seeder tools sign in a real or disposable account first). After running, revert to `allow write: if false;` and bump `_CURATED_CACHE_VERSION`.

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
--search-bg       /* search input / light-gray editable-field background */

/* Material Design 3 motion easing curves (added for the detail modal's note-toolbar/accordion
   transitions) — asymmetric on purpose: "accelerate" curves for exits (quick start, snappy finish),
   "decelerate" for entrances (gentle settle), "emphasized" variants for more prominent motion. */
--m3-standard
--m3-standard-accelerate
--m3-standard-decelerate
--m3-emphasized-accelerate
--m3-emphasized-decelerate
```

---

## How to Reload After Changes

1. Edit any file in `Chrome Extensions/Savecraft/`
2. Go to `chrome://extensions`
3. Click the **↺ refresh** icon on the SaveCraft card
4. Reopen the library tab (or hard-refresh it)

No build step — changes are live after reload. `src/app/js/main.js` is loaded as an ES module (`<script type="module">`), so `import`/`export` typos surface as console errors on the library tab, not silent failures — always check DevTools console after a reload when editing `js/` or `css/` files.
