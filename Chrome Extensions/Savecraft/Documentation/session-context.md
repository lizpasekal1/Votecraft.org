# SaveCraft — Session Context for AI

This file helps Claude (or any AI assistant) quickly regain context on the SaveCraft project without re-reading the full codebase.

---

## Latest Session Summary

**Theme: two connected efforts. First, made SaveCraft dual-mode — the same `src/app/` codebase now also runs as a plain web app at savecraft.org (Firebase Hosting, project `votecraft-789`), via a new `platform.js` runtime shim, with a required-sign-in gate since web has no `chrome.storage.sync`-style device sync to fall back on. Second (the bulk of the session, entirely live-feedback-driven, mostly one-line instructions plus real phone screenshots as the spec), a full mobile-layout pass against a live iPhone 16 Pro turned up and fixed six real, previously-unnoticed mobile bugs, verified throughout with a Playwright script emulating the iPhone 16 Pro device profile (screenshot + DOM/computed-style inspection, no headed browser needed since this was against the live deployed site, not localhost) — each fix redeployed (`firebase deploy --only hosting`) and re-verified before moving to the next.**

- **New: web app at savecraft.org** — `src/app/js/platform.js` (new) exports `isExtension` (`typeof chrome !== 'undefined' && !!chrome.runtime?.id`), `storageSync`/`storageLocal` (real `chrome.storage.*` in the extension; a `localStorage`-backed shim with the identical `get`/`set`/`remove`/`onChanged` call shape on web — chosen specifically so `storage.js`'s existing merge/load logic needed zero changes, just a swapped backing store), `openInNewTab` (`chrome.tabs.create` vs `window.open`), and `resourceUrl` (`chrome.runtime.getURL` vs a site-root-relative path). Every file that used to call `chrome.*` directly (`storage.js`, `auth.js`, `main.js`, `kanban.js`, `renderSidebar.js`, `share.js`, `detailModalQueue.js`, `detailModalHeader.js`, `renderCuratedPages.js`, `renderGrid.js`, `detailModalNotes.js`) now routes through it. `main.js`'s `requireWebSignIn()` blocks `init()` until a web visitor is signed in (no-ops instantly on the extension); a `_authGateActive` flag makes the auth modal temporarily non-dismissable for the duration. `index.html`'s CSS/JS tags switched from page-relative to site-root-absolute paths (`/src/app/css/...`, `/src/app/js/main.js`) — required so the same file resolves correctly both packed in the extension and served at the bare `savecraft.org/` domain via a Firebase Hosting rewrite (`/` → `/src/app/index.html`). New `firebase.json`/`.firebaserc` at the repo root (`no-cache` headers on the app's own HTML/JS/CSS, since the default 1-hour cache meant deploys didn't visibly update without a hard refresh) and `Documentation/web-deploy.md` (deploy steps, the Namecheap DNS gotchas actually hit connecting the domain — a "Custom DNS"/cPanel-routed domain needing a switch to "Namecheap BasicDNS" before Host Records were even editable, default parking records that had to be deleted first, and Firebase's own domain-verification cache lagging well behind public DNS). **Temporary, marked for removal**: `index.html`'s `#btn-auth-demo` ("View Demo") button lets a web visitor skip the sign-in gate for early demo purposes (local-only storage, same as the extension's signed-out behavior) — every call site is commented `TEMPORARY`.
- **Real bug found and fixed: Dashboard didn't scroll on mobile** (`dashboard.css`) — `.grid-area:has(.dashboard-wrap) { overflow: hidden }` was written on the assumption the hero+widget-grid always fits the viewport exactly (true on desktop); on mobile the same 4 widget cards stack vertically instead of sitting in a 2×2 grid, reliably taller than any phone screen, so content past the fold was simply unreachable. Fixed with a `@media (max-width: 768px)` override (`overflow-y: auto`, and `.dashboard-wrap`'s `max-height: 100%` relaxed to `none` so it can actually grow past the fold instead of being clipped to it).
- **Real bug found and fixed: Dashboard's welcome banner collapsed to ~90px on mobile** (`misc.css`) — an existing mobile rule set `.dash-hero`'s height to `auto`; `.dash-hero-content` (the greeting text) is `height: 100%` of that same parent, and a percentage height resolves to `auto` when its containing block's own height is indeterminate — so the greeting text ended up the *only* thing sizing the hero (~90px), with the collage thumbnails (absolutely positioned, 150px square, uncounted in that sizing) clipped to almost nothing. Rebuilt with a real fixed mobile height (172px), greeting anchored to the bottom over a solid-fading-to-transparent gradient (reversed from the old attempt, which faded transparent *at* the text instead of away from it), and thumbnails shrunk from 150px to 90px so more of the strip fits a phone width.
- **Real bug found and fixed: sign-in modal's three buttons wrapped onto two lines each** (`addEditModal.css`) — "View Demo"/"Create account"/"Sign in" were flex-shrinking narrower than their own text's width once all three had to share one row under ~480px. Stacked full-width below that breakpoint instead.
- **Real bug found and fixed: curated hero banner's icon badge overlapped its description text on mobile** (`cards.css`, `.top100-hero`) — the badge is absolutely positioned and vertically centered against the hero's full height, with the text column given a fixed 171px `padding-left` on desktop to clear it horizontally. On mobile that same fixed padding left almost no room for the text, so it wrapped severely, the hero grew tall to fit it, and the badge — still centered on that now-tall hero — ended up floating mid-paragraph. Existing mobile override only touched padding/font-size, never this. Fixed by switching to `flex-direction: column-reverse` on mobile (badge shrunk and stacked above the text, no HTML reorder needed since the badge is already the second DOM child).
- **Real bug found and fixed: curated org-list rows squeezed to half-width on mobile** (`cards.css`, `.bare-list-*`) — an existing mobile override correctly stacked the filter rail above the row list (`.bare-list-body { flex-direction: column }`), but never reset the row list's own desktop `max-width: 50%` + `margin-left: 160px` (sized to sit *beside* a filter rail that no longer exists in that position on mobile), so rows stayed squeezed into half the screen and shoved right, severely word-wrapping every row's text.
- **Real bug found and fixed: mobile sidebar drawer squeezed to 64px whenever the user had previously collapsed the sidebar on desktop** (`misc.css`) — `.sidebar.sidebar-collapsed`'s 64px desktop width rule (two classes) out-specifies the mobile drawer's own `.sidebar` rule (one class, `85vw`/max 300px), despite `sidebar.css`'s own comment claiming the desktop collapse feature "isn't affected" by the mobile drawer — that was never actually enforced. Confirmed by reproducing the exact precondition (pre-seeding `savecraft_sidebar_collapsed: true` in storage before opening the drawer) both before and after the fix. Fixed by re-asserting the mobile width at equal specificity (`.sidebar.sidebar-collapsed { width: 85vw; max-width: 300px }`) inside the same mobile media query.
- **Mobile-only trims, per direct request**: removed the redundant "My Saves" entry from the desktop hamburger's options dropdown (`.my-options-item[data-option="home"] { display: none }` on mobile) and the redundant "🏠 Home"/"My Saves" pair from the sidebar drawer's own mode-tabs row (`renderSidebar.js` — Curated + ⚡VC remain) — both duplicated the sidebar's own Home nav item one level down.
- All the mobile fixes above are plain `@media (max-width: 768px)` CSS, no device/touch detection — confirmed a desktop browser window resized down to the same width gets identical behavior automatically, per direct request to verify this rather than assume it.
- **Verification method this session**: no local dev server — every fix was tested against the *live deployed* site (`https://votecraft-789.web.app`, later also `https://savecraft.org` once DNS/SSL finished) using Playwright's built-in `devices['iPhone 16 Pro']` profile (`npm install playwright` + `npx playwright install chromium` in the scratchpad dir, not a project dependency), screenshotting real interaction sequences and cross-checking specific hypotheses via `page.evaluate()` (computed styles, `getBoundingClientRect()`, ancestor-chain walks) rather than guessing from CSS alone. One dead end worth remembering: a `.kanban-board` screenshot that *looked* cut off at the right edge turned out to be fully functional (`scrollLeft` swipe confirmed via direct test) — not every "looks wrong in a screenshot" is a real bug, native `overflow-x: auto` swipe panels don't show a scrollbar on mobile by default.

---

## Previous Session Summary

**Theme: another very long, rapid-fire session (mostly one-line live-feedback instructions, screenshots used as the primary spec format for the newer UI work). Landed real Saved Lists sidebar navigation (folder-icon styling, a "Save to:" radio menu now actually filters items when the list is clicked), a from-scratch redesign of the Share modal (Message replaced by a Saved Lists picker, an on/off link-sharing toggle), broadened the sponsor pitch page from one offering to three, and — the bulk of the session — built a brand-new **Embed Builder** feature end to end: a Share-dropdown entry, a single-screen source picker (whole category / individual folder / hand-picked Custom Slider), a full style panel, a live carousel preview, and a shareable "Embed code" link. Two real bugs were found and fixed along the way — one CSS Grid track-blowout, one JS temporal-dead-zone crash — both caught by the same off-screen-positioned headed Playwright harness (`chromium.launchPersistentContext`, `headless:false` + `--window-position=-32000,-32000`) every fix in this window was verified against, DOM/storage checks only, no screenshots (an explicit standing instruction from earlier in this session).**

- **Saved Lists sidebar rows wired to real navigation** (`renderSidebar.js`, `renderFilters.js`) — clicking Favorites/Health/Motivation (or any user-added Saved List) under the Dashboard's Saved Lists row now actually filters the grid to that list's items (`state.view = 'savedlist:<id>'`, a new branch in `getFilteredSortedItems()` — "Favorites" checks `item.favorite`, every other list checks `item.savedListId`), instead of being an inert placeholder. Their icons switched from an empty boxed `.cat-icon` placeholder to the same generic folder icon a real subfolder row uses (`folderIconHtml`), no box. Curated Lists' own child rows were deliberately left unwired (not requested), except one: the seeded "Votecraft" row now links to the real "Votecraft List" curated genre (`genre:Top 100`), same destination as the mobile header's "VoteCraft Picks" option. Curated Lists also gained a seeded "Votecraft"/"RCV" starter pair (two separate rows, not one combined entry — went through one iteration after an initial single "Votecraft and RCV" tile).
- **Share modal rebuilt** (`share.js`, `index.html`, `misc.css`) — the old free-text "Message" field is gone, replaced by a scrollable, radio-style (single-select, tap-to-deselect) list of the user's Saved Lists; picking one shares that list's own items instead of whatever's currently open in the sidebar, with the radio dot moved to the right side of each row per live feedback. "Anyone with the link" lost its static "Viewer" label in favor of an actual on/off toggle — off grays out both Copy link and Send and swaps the access icon to pink/red with "Link sharing is off" (no real access-control backend behind it yet, it's a client-side gate only). Also: 6px of breathing room added below the "Share" title, the divider line above "Anyone with the link" removed.
- **Sponsor pitch page broadened from one offering to three** (`src/sponsored/sponsored.html`) — previously pitched Sponsored Statements exclusively; now covers **Your Own Sponsored Page** (the existing Cause Curated directory concept — the Votecraft List entry already lives this way), **Sponsored Statements** (unchanged), and **Embed Anywhere** (the new Embed Builder, described in marketing terms). New hero copy, a three-card overview strip, one deep-dive section per offering, and pricing tiers reframed with an inline feature checklist per tier (dollar amounts unchanged since nothing indicated they should move).
- **New feature: Embed Builder** (`embedBuilder.js` new, `embedBuilder.css` new, `share.js`, `renderGrid.js`, `index.html`) — a new pseudo-view (`state.view === 'embed-builder'`, same dispatch pattern as `kanban`/`dashboard`/`profile`/`shared`) reached via a new "Embed options" button in the Share dropdown (`</>` code-brackets icon). Builds a customizable slider/carousel from specific saved assets, for pasting onto an external site as an `<iframe>`. Single screen throughout — no wizard-style step transitions; only the Assets panel's own content morphs in place:
  - **Source picking, three ways**, all within the Assets panel: a top-level category-tile grid mirrors the Add Item wizard's own first screen exactly (`addEditModal.js`'s `.step1-category-tile` classes reused directly) — minus the wizard's "Articles" shortcut (still reachable one level down, as an ordinary folder under Sources) and with a "Custom Slider" tile (circle-plus icon) appended **last**. Picking a category drills into that category's own folders (same tile styling the wizard's folder screen uses), with an "All X" tile alongside individual folders so the whole section is still one tap away. "Custom Slider" opens a searchable, cross-category checklist (capped at 200 rows) for a hand-picked list not tied to any folder — starts with nothing checked (opt-in), unlike folder/section sources which start fully checked (opt-out). A "‹ Change source"/"‹ Categories" link returns to the tile grid in place without leaving the Builder; the header's own back arrow always closes the whole thing.
  - **Asset list** — checkbox include/exclude, native HTML5 drag-and-drop reorder (same before/after-cursor-position pattern as `kanban.js`'s card reordering) plus up/down button fallback.
  - **Style panel** ("Style slider") — visible slide count, slide spacing (4-24px range, deliberately capped modest per request), autoplay + speed, arrow/dot/both nav style, a preview-only dark-theme toggle (independent of the extension's own theme), aspect ratio, a curated web-safe font dropdown (Arial/Helvetica/Verdana/Tahoma/Trebuchet MS/Georgia/Times New Roman/Courier New, plus a "Default" — not free text, since the eventual hosted embed page has no font-loading of its own), and a "Powered by SaveCraft" branding toggle.
  - **Live preview** reuses `dashboard.js`'s existing `_wireCarouselArrows` infinite-loop mechanic rather than new scroll logic. Shows gray placeholder "Slide 1/2/3…" cards before any real assets are picked, so every style control is visible/testable immediately rather than behind an empty-state message.
  - **"Embed code" box**, styled as a YouTube-share-style pill (URL + Copy button) — always rendered (matching the always-visible style controls), just empty with Copy disabled until at least one asset is selected. The URL reuses `share.js`'s existing `buildShareUrl()` base64 encoding convention, extended with a `style` field, pointing at a **new hosted page that doesn't exist yet** (`savecraft/embed.html`, sibling of the existing `savecraft/view.html`) — Copy works today, visiting the link 404s until that page ships (an explicitly separate, deferred follow-up phase; a full phased plan — Firestore persistence for a "live" embed, a Profile page "Your Embeds" section, then the hosted page itself — was approved via plan mode before any of this started, only the first phase (this client-side UI) was built).
  - Both the Assets panel and the Embed code/Style panel are always equal width and height (`align-items: stretch`, `grid-template-columns: 1fr 1fr` on `.embed-builder-body`), regardless of asset-list length or how many style rows are showing.
- **Real bug found and fixed: CSS Grid track blown out by an unbreakable string** — the embed code URL (one long base64 token, no spaces to wrap on) was forcing its own min-content width, and CSS Grid items default to `min-width: auto` (not `0`), so the "1fr 1fr" split silently stopped being equal once a real (long) URL populated the box — every row's right-aligned control (selects, toggles) got pushed off past the visible edge, caught via a live screenshot from the user. Fixed with `min-width: 0` on `.embed-builder-panel` (the grid item itself), the standard fix for this well-known Grid gotcha.
- **Real bug found and fixed: temporal-dead-zone crash silently broke the entire Builder** — `WEB_SAFE_FONTS` (a `const`) was declared *after* the module-top-level `let _styleOptions = _defaultStyleOptions();` line that reads it inside its own function body; since `const`/`let` bindings aren't initialized until their own declaration line runs (regardless of the containing function being hoisted), this threw `ReferenceError: Cannot access 'WEB_SAFE_FONTS' before initialization` at module-evaluation time — the whole Builder rendered nothing, with no visible `pageerror` in the test harness. Fixed by moving the declaration above all state that depends on it, right after the imports.

---

## Earlier Session Summary

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
- **Toolbar spacing, iterated to a final fix**: `.detail-note-toolbar-btn--expand`'s `margin-left: auto` (meant to visually separate the Bold/Highlight/Bullet formatting cluster from the Expand/Close action cluster) pushed the action cluster all the way to the toolbar's right edge — fine with 3 formatting buttons, but once Image became a 4th, the row no longer filled the available width evenly and the auto-margin gap grew large and unbalanced. A first fix (a fixed `margin-left: 20px`) still read as "a gap" to the user; the actual fix removed the special-case margin entirely (uniform 7px `gap` for every button) and centered the whole row (`justify-content: center`, equal 12px left/right padding, removing the `margin-right: 12px` that had been carrying the old right-edge inset) so the box's leftover space — it's wider than 6 small icon buttons — splits evenly instead of piling onto one side. Also equalized the toolbar's top/bottom padding (was 11px/7px) so the buttons sit truly vertically centered within the purple bar, not just within an already off-center content box.
- **Toolbar button color scheme redesigned** (`detailModal.css`) — resting buttons are now filled the same solid purple as the toolbar bar itself (`var(--primary)`), with icon and border both `var(--modal-bg)` (dark) for contrast against that fill — a button now reads as "a piece of the modal poking through the purple bar" rather than a separately-colored dark-surface chrome element. Hover and the `--active` (toggled-on, e.g. Focus mode engaged) state both invert this — `var(--modal-bg)` fill, purple icon/border — so hovering previews exactly what "toggled on" looks like. The `[disabled]` state (no row focused) still reads as grayed-out via its existing `opacity: 0.4`, unaffected by the color swap since opacity-based dimming works the same regardless of the underlying colors. Border width went through a couple of live-feedback rounds (1px → 3px → settled on 2px).
- **AI-slop self-review, on request** — read the session's full diff back looking for redundant/dead code; found one real (minor) issue: `noteHtmlHasContent()` parsed the same HTML string into a `<template>` twice (once inside `plainTextFromNoteHtml()`, again for the `<img>` check). Merged into one parse.

---

## Earlier Session Summary (superseded)

*Rebuilt the Add/Edit Item modal from scratch (4-screen wizard → 3 screens, Title field doubling as the search box), plus a long tail of header/spacing polish, a from-scratch feature for Movie's "Videos" folder (thumbnail fetch, embedded video lightbox), a generalized card-badge system, and category renames — with a couple of real bugs along the way (a detached-node crash on the 2nd category switch, a double-border CSS specificity bug). Before that — rebuilt the detail modal's My Notes (plus Book's Chapters, Music Album's Song List) from a single plain textarea into a numbered-notes system with a formatting toolbar, a distraction-free focus mode, and per-row rename — including several real bugs (a `max-height`-transition "fades before it opens" illusion, a force-closed accordion leaving an inline style override behind, Escape-while-renaming closing the whole modal). Before that — replaced the Music Album gallery's single low-res iTunes image with a real multi-image gallery sourced from MusicBrainz + the Cover Art Archive, plus several rounds of detail-modal visual polish. Before that — a string of detail-modal visual tweaks, an "AI slop" cleanup pass, deleting the long-dead `app.js`/`app.css` monolith backup, splitting both `render.js` and `detailModal.js` into focused per-concern modules, a real scroll-when-closed bug fix, and moving Musician's bio into My Notes. See git history around those eras if needed.*

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

## Storage Layout (`chrome.storage.sync` in the extension / `localStorage` on web, same keys)

Key names below are identical in both environments — `platform.js`'s `storageSync`/`storageLocal` give `storage.js` an identical `get`/`set`/`remove` shape regardless of which one is actually backing it, so this table doesn't fork per-platform. On web these same keys additionally dual-write to Firestore (`savecraft_users/<uid>/...`) whenever signed in, which is mandatory there — see "Architecture" in `savecraft-overview.md`.

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
| `savecraft_saved_lists` | Array of `{ id, name }` — Saved Lists (Favorites/Health/Motivation seeded, plus any user-added ones); an item's membership lives on the item itself (`item.favorite` for Favorites, `item.savedListId` for every other list), not here |
| `savecraft_curated_lists_rows` | Array of `{ id, name }` — Curated Lists' own child rows (seeded with "Votecraft"/"RCV"); only the seeded "Votecraft" row (`default-votecraft`) has a real destination (`genre:Top 100`), the rest are still inert placeholders |

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
| `'shared'` | The Shared Saves dashboard (`renderSharedSavesPage()`, `sharedSaves.js`) — "Lists You Follow" portal cards (one per genre in `state.followedCuratedLists`, real navigation) + a Friends stub (moved here from the Profile page) |
| `'savedlist:<id>'` | **New this session.** A Saved Lists sidebar row's items — `getFilteredSortedItems()`'s new branch checks `item.favorite` for the Favorites list, `item.savedListId === id` for every other list |
| `'embed-builder'` | **New this session.** The Embed Builder pseudo-view (`renderEmbedBuilder()`, `embedBuilder.js`) — reached via the Share dropdown's "Embed options" button, never persisted via `persistViewState()` (same as every other pseudo-view below) so a reload can't strand the user on an orphaned builder with no return scope |

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

### Remove the temporary web "View Demo" sign-in bypass
`index.html`'s `#btn-auth-demo` and its handling in `main.js`'s `requireWebSignIn()` — both commented `TEMPORARY` — let a web visitor skip the mandatory sign-in gate for early demo purposes. Remove before real visitors are expected at savecraft.org.

### Sidebar drawer's icon-only mobile nav has no text labels
Flagged live during the mobile pass — usable if you already know what each icon means, not self-explanatory otherwise. Open question, not yet decided either way.

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

**Web app** (savecraft.org / `votecraft-789.web.app`): `firebase deploy --only hosting` from the Savecraft folder, then a normal page reload — no hard-refresh needed, `firebase.json` sets `no-cache` on the app's own HTML/JS/CSS specifically so this stays true. See `Documentation/web-deploy.md`.
