# SaveCraft — Session Context for AI

This file helps Claude (or any AI assistant) quickly regain context on the SaveCraft project without re-reading the full codebase.

---

## Latest Session Summary

**Theme: seeded 214 more IMDb Top 250 movies into curated Top 100, then built out "Curated SaveCraft" into a real two-tier browsing experience (a bare-bones ActBlue-style directory + the existing rich landing page, now reached one level deeper) and wired up the previously-dead "Shared Saves" dropdown item into a real page — plus a long tail of hamburger-menu and fine-grained styling requests.**

- **214 more IMDb Top 250 movies seeded into curated Top 100** (`storage.js`'s `_CURATED_CACHE_VERSION` bumped 9 → 10) — diffed the user's full pasted IMDb Top 250 list against the 103 movies already in Firestore, resolved a real Wikipedia article for each of the 214 missing titles (REST summary API, with a validator requiring the description actually mention "film"/"movie"/"anime" — an earlier naive pass had wrongly matched several generic-word titles to unrelated concept articles, e.g. "Casino" → the gambling-facility article, "Heat" → the 2013 comedy instead of the 1995 Michael Mann film; both hand-corrected), then wrote all 214 via the same disposable-Firebase-Auth-account technique used in earlier sessions (temporarily reopened `curated_items`'s write rule, `Anonymous` sign-in also had to be re-enabled in the Firebase Console this time since the technique now failed with `ADMIN_ONLY_OPERATION` until the user did so). One title (a 2024 anime compilation film with no standalone English Wikipedia article) links to IMDb instead, as a documented exception to the usual Wikipedia-URL convention.
- **Hamburger dropdown polish** (`index.html`, `main.js`, `base.css`) — "Home" relabeled "My Saves" with an icon; "Shared Saves" and "Curated SaveCraft" also gained icons (all inline SVGs the user supplied, `fill="currentColor"` so they inherit the dropdown's white/gold text color). `.my-options-item` switched from `display: block` to a flex row with `gap` to fit the icon.
- **Curated SaveCraft split into two tiers** (`render.js`, `state.js`, `cards.css`) — the existing hero+carousel-rows page (previously the direct top-level landing) is now internally called **"Curated-full-list"**, reached via `state.view === 'curated-full-list'` and a "See all →" button at the bottom of the new page below. The actual top-level landing (`state.view === 'curated'`, what "Curated SaveCraft" in the sidebar/dropdown now shows) is a new **`renderCuratedBareList()`** — a bare-bones, ActBlue-inspired flat list: a short gradient hero strip, a "Cause Area" filter rail (now 10 categories, up from the original 6 — chips actually filter the list client-side, a real interaction even though the underlying orgs are still fictional demo data) plus a "Why Curated Lists" blurb, and a scrollable list of boxed org rows (colored avatar circle with an emoji stand-in for a logo, name, one-line tagline, cause-area pill tag, a solid-purple pill "View" button). Rows have link-like hover feedback (lift + shadow + name turns purple) and a demo-only bookmark icon (top-right, hover-revealed, no circle background, toggles purple on click) — explicitly **not wired to anything real**: no Kanban queue, no persistence, purely a CSS class toggle, since this whole page is a pitch/demo surface, same spirit as the Top 100 landing page.
  - `CURATED_DIRECTORY_CONTENT` (`state.js`) grew from 6 to 10 cause-area categories (added Education & Literacy, Housing & Economic Justice, Global & Humanitarian, Digital & Consumer Rights) and now ~30 orgs total, still a mix of the 5 real branded lists (`CURATED_LIST_DISPLAY_NAMES`) and invented placeholders.
  - A subtle but real bug caught and fixed along the way: `container.className = 'cards-grid bare-list-page'` inherited `.cards-grid`'s base `display: grid; grid-template-columns: repeat(2, 1fr);`, squeezing the single-child bare-list page into just the first column (~half the screen) — fixed with the same `display: block` override `.top100-landing` already uses for the same reason.
- **"Shared Saves" wired up for the first time** (`sharedSaves.js`, new file; `main.js`, `render.js`) — previously a complete no-op (the dropdown button existed but had no `else if` branch and no `state.view`/`renderGrid()` case at all). Now a real dashboard page: a "Lists You Follow" section showing one real, clickable portal card per genre in `state.followedCuratedLists` (previously a write-only preference set from Profile → Interests with zero consumers anywhere — this is its first actual reader), reusing the Dashboard's own cover-art resolution (`CURATED_LIST_COVER_OVERRIDES`/`_resolveGenreCover()`, both newly exported from `dashboard.js` for this), plus the Friends "coming soon" stub — moved here from `profile.js` (whose `.profile-widget-grid` shrank from a 2×2 four-card grid to a 3-column single row accordingly). Unlike the inert Curated-full-list/bare-list pages above, these portal cards **do** navigate for real, since they represent genres the user has actually opted into.
- **A long tail of fine-grained bare-list styling requests**, iterated live against the ActBlue reference screenshot the user shared: thumbnail/avatar size taken from 48px → 80px → 96px; the row list narrowed and re-positioned several times (max-width and margin-left both adjusted repeatedly, margin-left ending at 160px past the filter rail); the "Organization" tag removed, the remaining cause-area tag made pill-shaped with a transparent-purple background; a one-sentence tagline added under each org name; row backgrounds went from a plain divider line → purple box → neutral dark box → back to a plain divider → back to a `var(--hover-bg)` gray box with the divider removed (final state), with title-text color following the same back-and-forth (blue → white → blue → white, final state **white** — flagged more than once to the user that this reads poorly in light theme against the current light-gray row background, not yet resolved).

---

## Previous Session Summary

**Theme: a quick-queue bookmark for curated cards, then a full "Top 100" landing page — hero banner, Netflix-style carousel rows, real VoteCraft branding — built as a live demo for pitching nonprofits on sponsoring their own curated list.**

- **Quick-queue bookmark** (`render.js`, `authors.js`, `utils.js`, `state.js`) — curated cards (main grid + author/creator profile pages) gained a hover-revealed bookmark button in the same top-right corner personal cards use for edit/delete. Click → `ensureLiveItem(item)` (newly extracted from a closure private to `detailModal.js`'s "Add to Queue" handler into a shared export in `authors.js`, same signature minus the implicit `item` closure capture) → `queueStatus = 'in-queue'` → live-patches just that button (icon swap + class toggle) rather than a full re-render. Click again while active → un-queues (`queueStatus = null`), same live-patch in reverse. New shared `BOOKMARK_OUTLINE_SVG`/`BOOKMARK_FILLED_SVG` exports in `state.js` (the detail modal keeps its own pre-existing local copies of the same paths — not worth the churn of switching an already-working spot). Went through two rounds of visual iteration on the active state: circle background → icon-only purple (no circle) → circle restored, because the icon-only look turned out hard to see against the Top 100 landing page's varied thumbnail art once that was built (see below) — the circle is back for good now, everywhere this button appears.
- **Real bug fixed in the process**: the Sponsored Statement badge (`detailModal.js`) was gated on `item.curated`, which `ensureLiveItem()` flips to `false` the moment an item is actually saved — so bookmarking a Top 100 item made the badge disappear on next open, even though it's still the same Top 100 item. `isCuratedTop100`'s check dropped the `item.curated &&` prefix, now purely `!!item.id && CURATED_ITEMS['Top 100'][item.category].some(i => i.id === item.id)` — a manually-added item's `Date.now()`-based id can never coincidentally match a real curated doc's id, so this still correctly excludes anything the user actually created.
- **Top 100 landing page** (`render.js`'s new `renderCuratedGenreLanding()`, wired into `renderGrid()`'s existing empty-state branch via `isCuratedTop && genre === 'Top 100'`) — replaces the plain "Pick a category" state for Top 100 specifically; every other curated genre is untouched. Content (headline, description, which categories get a row and in what order) lives in `CURATED_GENRE_LANDING_CONTENT` (`state.js`), keyed by genre — only `'Top 100'` populated, but the shape supports a future sponsored genre reusing this same render path with zero new code.
- **Rows reuse the Dashboard's carousel mechanics, not its look** — `dashboard.js`'s `_wireCarouselArrows(card, strip)` is now `export`ed and generalized: it used to hardcode `strip.querySelector('.dash-thumb-card')` to measure per-click scroll width, which would've silently found nothing (falling back to a wrong hardcoded `140` amount) for any other card shape; now `strip.firstElementChild`, works for any card class. The Dashboard's own two carousels (Curated Lists, Favorites Spotlight) are unaffected — same call sites, same behavior. New `.top100-row-card` (264×149 landscape, hover lift) is a deliberately distinct visual from the Dashboard's `.dash-thumb-card` (170×112) — explicit user direction that this should feel like its own destination, not a reskinned Dashboard widget, even while sharing the underlying scroll code.
- **Real bug fixed**: rows initially built cards straight from raw `CURATED_ITEMS[genre][category]` docs, skipping the image-resolution fallback chain `getFilteredSortedItems()`'s `genre:` branch already applies (`state.curatedImgCache` merge, then `state.artistBioCache` photo merge for Musicians) — almost everything showed the emoji fallback instead of real art, even for items that already had a cached image from being viewed elsewhere. Fixed by replicating that same merge inline (`resolveRowItemImage()`), then triggering the existing `fetchMissingCuratedImages()`/`fetchMissingCuratedMusicianPhotos()` for whatever's still missing after the merge. `patchCardImage()` (`utils.js`) gained a second `.top100-row-card` branch to actually receive those live patches — different DOM shape than `.card` (`.top100-row-card-art` wraps either an `<img>` or a text fallback `<span>`, no separate placeholder element to hide/show), so patched with its own logic rather than forced into the existing branch.
- **Quick-queue bookmark extended to row thumbnails** — same button/behavior as the main-grid version above, with one real wrinkle: rows triple every item for the carousel's infinite-scroll illusion (see `_wireCarouselArrows`'s doc comment), so the same item's bookmark can appear 3× in the DOM at once. `wireQuickQueueButtons()` (`render.js`) was generalized (`setButtonState()` helper) to patch every DOM copy sharing a clicked button's `data-id`, not just the one clicked — a no-op change for every other existing caller, where an item only ever appears once. Also had to change `.top100-row-card` from a `<button>` to a `<div>` — nesting a real `<button>` (the bookmark) inside a `<button>` is invalid HTML; the click wiring is `addEventListener`-based either way so the tag swap changes nothing behaviorally.
- **Real VoteCraft branding, not placeholder text** — the user supplied two actual logo assets mid-session (`images/logos/votecraft-logo_white.png`, a 5095×1161 wordmark, and `votecraft_icon_white.png`, a 1160×1160 square icon mark — both plain-white PNGs with alpha transparency, which is why they rendered as blank white rectangles both in the user's pasted screenshot and in a direct `Read` of the file — a real transparency-vs-white-background rendering gotcha worth remembering, not a transmission failure). Both added to `manifest.json`'s `web_accessible_resources` alongside the existing Rolling Stone/Steam entries. The wordmark sits in the hero as-is; the icon mark sits in a new `.top100-icon-badge` — a solid-color (not gradient — the white icon needs a flat backdrop to read) square badge `position: absolute`'d to overlap the hero's bottom-left edge, LinkedIn-cover-photo/avatar style, bordered in `var(--bg)` so it reads as "cut out" of the banner. Went through a couple of rounds of layout fixes: the badge initially overlapped the description text (fixed by giving the text block its own `padding-left` — `.top100-hero-text` — so it starts clear of the badge horizontally, rather than the first attempted fix of just adding more vertical padding, which the user correctly redirected away from), then both the badge and its icon were sized up 20% per direct request, with the text's padding-left recalculated to match the badge's new width.
- **Sort dropdown relocated below the hero; redundant title hidden** — the standard `#grid-title` ("Top 100 Saves") and `.grid-header` toolbar (whose only visible content on this view was the sort dropdown) are hidden for this view specifically (the hero is the real header now; the sidebar's own separate "Top 100 Saves" back-button label is untouched). The real singleton `#sort-select` node (main.js already has a change listener bound to it) is physically relocated via DOM API into a new `.top100-sort-wrap` below the hero, right-aligned to match its original position. Since it's the same node, not a clone, this only works safely because `renderGrid()` now restores it to its normal `.grid-header` parent at the very top of the function (`if (sortSelect.parentElement !== gridHeader) gridHeader.appendChild(sortSelect);`), before any view's own rendering logic runs — otherwise a plain `container.innerHTML = ...` in some other view could destroy the node entirely as an orphaned child of `#cards-grid`, breaking sort functionality app-wide until reload.
- **CTA banner** at the bottom of the landing page links to the existing Sponsored Statement page (`chrome.runtime.getURL('src/sponsored/sponsored.html')`, same URL-building pattern the Sponsored Statement badge already uses elsewhere) — that page's own content is untouched this session.
- **Netflix-row visual iteration** (direct user requests, in order): rows started as square 140×140 thumbnails → increased 20% to 168×168 → switched to landscape 220×124 (~16:9) per a reference screenshot, explicitly keeping the title label below the art rather than overlaid on it → increased 20% again to 264×149, with the carousel's inter-card gap also widened 14px → 24px (scoped to `.top100-carousel .dash-carousel-strip` specifically, since the base 14px gap is shared with the Dashboard's own carousel).
- **Gray circle restored on the active (queued) bookmark icon** (`.card-quick-queue-btn--active`, `cards.css`) — the icon-only "no circle" treatment landed a few turns earlier this session per a direct request, but turned out hard to see against the Top 100 rows' varied thumbnail art once those existed; `background: transparent` → `background: var(--hover-bg)` (matching the resting/hover state's circle), applies everywhere this button is used (main grid, author pages, Top 100 rows) since they share one class.
- **Plus-in-circle button next to each row title** (`.top100-row-add-btn`) — sits right after `.top100-row-title`, distinct from `.top100-row-see-all` further right in the same header. No dedicated click handler: it's a plain child of `.top100-row-header`, which already has a click listener covering the whole row (title, whitespace, this button) via normal event bubbling, and clicking it should do the exact same thing as the header anyway (open that category's full curated view, sidebar-highlighting included, per explicit clarification — "so if I tapped Top Musicians, the slider would open the Music tab so I can see Musicians is highlighted"). Required changing `.top100-row-header` from a `<button>` to a `<div>` — nesting a real `<button>` (the plus) inside a `<button>` is invalid HTML; same fix already applied to `.top100-row-card` earlier for the same reason. Went through one styling iteration: a custom transparent/white-bordered circle with a filled Material-icon plus path, replaced with an exact match to `.kanban-expand-btn` (`kanban.css`) — same 20×20 size, `var(--border)`/`var(--surface)`/`var(--text-secondary)` resting state, purple-fill-on-hover, and the identical stroke-based plus icon (two `<line>`s, `stroke-width="3"`, 12×12, `viewBox="0 0 24 24"`) instead of the filled-path Material icon used at first — a direct request to reuse that established visual language exactly rather than a new one-off style.
- **"Top 100" title links back to the landing page** (`renderGrid()`'s `genre:` title-building block, all four branches: Musician/Show/Book with the Rolling Stone logo, Game with Steam, Movie with NYT, and the generic no-logo fallback) — new `isTop100Drilldown`/`top100Label` locals compute once, reused by all four branches so the fix didn't need touching the giant inline NYT SVG string. Only the literal "Top 100" word is wrapped in a `<button class="grid-title-link" data-view="genre:Top 100">` (styled via `font: inherit; color: inherit;` in `cards.css` to read as ordinary title text until hovered) — the category name after it (e.g. "Books", "Games") stays plain text, per explicit clarification ("just the word top one hundred") after an initial version wrapped the whole label. Click wiring (`document.querySelector('.grid-title-link')?.addEventListener(...)`) sits right after the title-building if/else chain, inside the same `state.view.startsWith('genre:')` branch, so it re-wires fresh on every render (the old button element is discarded along with the rest of `gridTitle`'s old `innerHTML` each time, so there's no stale-listener accumulation to worry about).

---

## Earlier Session Summary

**Theme: generalize Musician's "creator has their own profile page" pattern to Book/Movie/Show/Game, seed the real curated data behind it, then a long tail of curated-genre sidebar navigation bugs that only surfaced once four more categories started routing through the same code paths, plus a Kanban layout fix and a new drag-to-reorder feature.**

- **`CREATOR_CARD_CATEGORY`** (moved to `state.js` from a private `render.js` constant so `detailModal.js` can also import it) — `{ Musician: 'Musician', 'Book Author': 'Book', 'Movie Director': 'Movie', 'Show Creator': 'Show', 'Game Studio': 'Game' }`. Anywhere a title/name needs to become a clickable creator link now checks this map instead of hardcoding `item.category === 'Musician'` — `render.js`'s `renderCard()` title block and `detailModal.js`'s `_titleHtml`/`_isCuratedMusician` (kept that variable name, but its condition is now `item.curated && !!CREATOR_CARD_CATEGORY[item.category]`, i.e. "is this curated item's own title a creator-card link").
- **`js/curatedCreatorLookup.js`** (new module, zero dependencies — imported by both `render.js` and `storage.js`, which is why this logic isn't just a `render.js`-local function like it started as). Two parts:
  1. Auto-generated data: `CURATED_MOVIE_DIRECTOR` (`{ [movieTitle]: { name, coDirectorCount } }`), `CURATED_SHOW_CREATOR` (`{ [showTitle]: creatorName }`), `CURATED_GAME_STUDIO` (`{ [gameTitle]: studioName }`) — sourced externally (Wikidata P57/P170, Steam `appdetails`) since the live curated Firestore data has no creator field for these three categories at all (confirmed: plain titles like "Parasite"/"Counter-Strike 2", real description in `.notes`, nothing else).
  2. Shared functions: `SPLIT_TITLE_CREATOR_CATEGORIES = ['Book', 'Movie', 'Game', 'Show']` + `splitCuratedTitleCreator(title)` (parses Book's `"Title — Author"` combined field — a no-op for Movie/Show/Game since their titles never contain that separator, confirmed via live data, not assumed) + `getStaticCuratedCreator(cat, title)` (looks up the static Movie/Show/Game data, returns `{ name, hasMore }` — `hasMore` is `coDirectorCount > 1` for Movie, always `false` for Show/Game — kept separate from `name` specifically so a co-directed movie's "…" suffix is purely a *display* concern and never corrupts the string used for navigation/matching).
- **`resolveCuratedCreatorName(cat, item)`** (stays in `render.js`, the one function *not* moved to the shared module since it's render-specific glue) — tries `item.author`, then the split-title, then the static lookup, in that order. Used both when building the `genre:` view's items (`getFilteredSortedItems()`) and when matching curated items against an author page's name (`resolveCuratedCreatorName` replaces what used to be an inline `matchesCreator` ternary that only handled the Book-style split, not the Movie/Show/Game static-lookup case).
- **Cross-genre duplicate bug, found and fixed** — the `author:` view's curated-items pull-in loops over every key in `CURATED_ITEMS` (every genre), since e.g. a Musician's Music Albums can legitimately be curated under several different genres. This is *wrong* for Book/Movie/Show/Game though: the same work (verified live — 20 movies, including Parasite/The Dark Knight/Get Out, are curated separately under both "Top 100" and "Thriller" as distinct Firestore docs with distinct ids) would show up once per genre it happens to be curated under. The loop previously deduped only by a `Set` of ids built once *before* the loop started; now also tracks a `seenTitles` Set updated *during* the loop (after the title-split/static-lookup resolution, so it compares the final display title, not the raw one), skipping a curated item whose resolved title has already been added from an earlier genre.
- **Backfill migration for already-saved items** (`storage.js`, inside `loadAll()`, same spot/pattern as the pre-existing Music Album `.notes`→`.author` migration) — items saved *before* the creator-resolution logic above existed (or before it was correct) are stuck forever with whatever `.author`/`.title` shape they had at save time, since `ensureLiveItem()` (`detailModal.js`) only runs once, the first time an item is saved. New backfill: for any personal (non-curated) item in `SPLIT_TITLE_CREATOR_CATEGORIES` still missing `.author`, try the title-split first (Book), then `getStaticCuratedCreator()` (Movie/Show/Game, also sets `.authorHasMore`). Runs unconditionally on every `loadAll()` — safe/no-op once `.author` is set, same guarantee the Music Album migration already relies on.
- **Sidebar curated-genre-browsing overhaul** — see the updated "Sidebar Structure" section below for the full mechanism; summarized here as a punch list of the actual bugs found (all live-reproduced via screenshots during the session, not theoretical):
  1. Clicking *any* subfolder (not just Authors) while browsing a curated genre dropped `state.view`'s `genre:` prefix entirely, bouncing the sidebar back to "My SaveCraft".
  2. Once fixed generically (every subfolder falls back to showing its parent category), sibling folders that share the same fallback category (Movie's "Movies"/"Videos", Show's "TV Shows"/"Podcasts"/"Webseries"/"Tutorials", Game's four folders) all showed as duplicating each other's content *and* all lit up as "active" simultaneously.
  3. Corrected to: only folders that genuinely represent "the whole category" (`FOLDER_SHOWS_FULL_CURATED_CATEGORY`) fall back to the full list; every other folder resolves to an inert placeholder (its own id, which never matches a real `CURATED_ITEMS` bucket) and correctly shows empty.
  4. Active-row highlighting fixed by tracking which specific folder was clicked (`state.activeCuratedFolderId`) separately from the derived `state.view`, since multiple folders can legitimately route to the identical view string.
  5. Visiting an author/creator page (`state.view = 'author:<cat>:<name>'`, doesn't start with `genre:`) while browsing a curated genre reset the *entire* sidebar to the top-level genre picker under a wrong "My Saves" title — fixed via `sidebarEffectiveView` (falls back to `state.authorReturnView` on an author page) used for every sidebar mode/context decision, while `isActive` checks keep comparing the real `state.view` so nothing shows falsely highlighted.
  6. Top-level category tab counts (e.g. "Books 89") hidden while browsing a curated genre — user-requested simplification, subfolder counts underneath are unaffected.
- **Data-quality bug found and fixed**: `_CAT_NORMALIZE`'s `'Music': 'Music Album'` entry was merging a legacy, mislabeled Firestore bucket (101 docs, `category: "Music"`, titles are artist names like "The Beatles"/"Bob Dylan" — confirmed via direct Firestore query to be a stale duplicate of the real `Musician` list, docIds `top-100-music-cur-rs100-*`) into the `Music Album` curated bucket, which is what was rendering Musician-name cards under "Music Albums." That mapping entry is removed (`'Music Albums': 'Music Album'` — the *plural* spelling — is untouched and still valid). The remaining ~2,439 genuine `Music Album` docs under Top 100 are real albums but bulk auto-synced (`itunes_*` ids), not an actual hand-curated Top 100 shortlist — flagged as a separate, not-yet-addressed editorial gap, not something this fix touches.
- **`_CURATED_CACHE_VERSION`**: `5 → 6 → 7` across this session (once for the new creator-card categories/folders, again for the `_CAT_NORMALIZE` fix) — bump this whenever `_loadCuratedFromFirestore()`'s parsing/bucketing logic changes, not just when the underlying Firestore *data* changes (the cache stores the already-bucketed `CURATED_ITEMS` shape, not raw docs).
- **332 new curated Firestore docs seeded directly** (not just built and left for the user to run) — 83 Book Author + 78 Movie Director + 89 Show Creator + 82 Game Studio. Two `scripts/seed-*.html` tools were built (`seed-book-authors.html`, `seed-creator-cards.html`), each a plain-`fetch()` Firestore REST + Firebase Auth REST client (no SDK), then actually *run* on the user's behalf: the assistant signed up a disposable Firebase Auth account via the REST `accounts:signUp` endpoint (any authenticated user satisfies the temporarily-loosened `allow write: if request.auth != null;` rule — no real user credentials needed or requested) and PATCHed all 332 docs directly via `curl`/Node `fetch()`, verified live against Firestore afterward. **A real bug was caught in the process**: `seed-book-authors.html` had been built in an earlier (summarized-away) part of the session but its `__PAYLOAD__` placeholder was never actually substituted with the real 83-item payload — the file on disk would have thrown a JSON parse error if the user had tried to run it. Caught by inspecting the file directly before pointing the user at it, not assumed working from memory.
- **Game studio bio/photo data-quality pass** — the automated Wikipedia keyword-search match (same technique used for Movie directors/Show creators) had a much higher wrong-match rate for company names than person names (e.g. "Iron Gate" matched "Baldur's Gate 3", "Sky" and "Team PEAK" both matched an unrelated "video game industry layoffs" article). Fixed with an automated sanity filter (rejects a match unless the studio name and article title actually share a normalized substring) rather than hand-checking all ~80 — kept 47 automatically, hand-verified and restored 5 more legitimate edge cases (e.g. "ConcernedApe" → person "Eric Barone", "EA Canada" → renamed "EA Vancouver"), left ~27 (mostly small indie studios with no Wikipedia coverage) without a bio/photo — expected and fine, same sparse-card treatment as any item with no fetched summary.
- **Kanban layout fix** (`kanban.css`) — `.kanban-board`/`.kanban-wrap` previously used a hardcoded `height`/`min-height: calc(100vh - 180px)` guess that fell short of the real available space (the true chrome above it — `.header`'s 64px + `.grid-area`'s 24px top/bottom padding + the visible toolbar row — doesn't reduce to a stable constant, since `.grid-area` also has its own `overflow-y: auto`, creating a nested-scroll-container situation). Replaced with `flex: 1; min-height: 0;` on both, plus a new `.grid-area:has(.kanban-wrap) { display: flex; flex-direction: column; overflow: hidden; }` override — the exact same `:has()` scoping technique `dashboard.css` already established for `.grid-area:has(.dashboard-wrap)`. Also removed `.kanban-column`'s `border-radius: 8px` per a direct user request (was rounding the divider lines' top/bottom corners).
- **Kanban drag-to-reorder within a column** (`kanban.js`) — new `manual` sort mode (`SORT_LABELS.manual = 'Custom order'`), sorts by `item.manualOrder ?? Infinity` with a `savedAt`-descending tiebreak so never-dragged cards land in a sane spot. Drag state grew two new closure variables (`dropTargetId`/`dropPosition`, alongside the pre-existing `dragId`) set via a new per-card `dragover` listener (previously only the column container had one) that compares the cursor's Y position to the hovered card's vertical midpoint. The `drop` handler now: builds the target column's current on-screen order (`currentColumnOrder()`, reuses the existing `sortCards()`), removes the dragged item, re-inserts it at the tracked drop position (or appends if dropped on empty space), assigns every item in that final order a fresh sequential `manualOrder`, flips that column's `state.kanbanSort` to `'manual'`, and persists all of it. The now-redundant standalone `updateQueueStatus(id, newStatus)` export was deleted — confirmed via grep across the whole live source tree (not just the modules that seemed likely) that its only call site was the exact code this replaced; the legacy unloaded `src/app/app.js` backup file also referenced it but is confirmed dead (not in `index.html`'s script tags), so left untouched.

---

## Earlier Session Summary (superseded)

*The session before this one — a popup rebuild, Kanban expand/focus mode, and folder-system cleanup — has rolled off this file's 3-tier window. See git history around that era if needed.*

---

## File Locations

| What | Path |
|------|------|
| Chrome extension source | `/Users/lizpasekal/Documents/Votecraft.org/Chrome Extensions/Savecraft/` |
| Manifest | `…/Savecraft/manifest.json` (must stay at extension root — Chrome requirement) |
| Main library page | `…/Savecraft/src/app/index.html` |
| Library logic | `…/Savecraft/src/app/js/*.js` — 16 ES modules (`state.js`, `storage.js`, `utils.js`, `api.js`, `auth.js`, `authors.js`, `curatedCreatorLookup.js`, `render.js`, `kanban.js`, `detailModal.js`, `addEditModal.js`, `fetchAlbumsModal.js`, `dashboard.js`, `profile.js`, `share.js`, `main.js`); see `savecraft-overview.md` for what lives where |
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

All in `js/authors.js` (profile CRUD/navigation) and `js/render.js` (`renderAuthorPage`). Note: there used to be an "Edit Profile" modal (`openAuthorEditModal`/`handleSaveAuthor`) — it was dead code (never wired to a trigger) and was removed during the app.js → ES module split. Author photo/bio/website are now only ever set automatically via the Wikipedia/MusicBrainz enrichment lookups, not user-editable through the UI.

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

### Collapsible desktop rail
Desktop-only (the mobile drawer is a separate full-width overlay and unaffected). `#btn-sidebar-collapse` (in `.sidebar-header-controls`) toggles a `.sidebar-collapsed` class on both `#sidebar` and `#header-sidebar`, shrinking them to a 64px icon-only rail — CSS-only hiding via a `.sidebar-label-text` span that wraps just the text portion of each category/genre label (added specifically so it could be hidden without touching the icon or the click-handling/wiring, which is unchanged). Persisted via `chrome.storage.sync` (`savecraft_sidebar_collapsed`), applied in `main.js`'s `init()` the same way theme is (`applySidebarCollapsed()`/`toggleSidebarCollapsed()`, mirroring `applyTheme()`/`toggleTheme()`).

### Curated-genre subfolder navigation (new this session)
Every subfolder row (Authors, Directors, Movies, Videos, Board Games, ...) computes a single `curatedTarget` string in `render.js`'s `subfolderRows` map, used both for the row's `data-curated-target` attribute and its `isActive` check:

```js
const curatedTarget = FOLDER_ID_TO_CURATED_CATEGORY[folder.id]
  || (FOLDER_SHOWS_FULL_CURATED_CATEGORY.has(folder.id) ? cat : folder.id);
```

- **`FOLDER_ID_TO_CURATED_CATEGORY`** (`render.js`) — folders that are their own dedicated curated "creator card" bucket: `{ 'default-books-authors': 'Book Author', 'default-movies-directors': 'Movie Director', 'default-shows-creators': 'Show Creator', 'default-games-companies': 'Game Studio' }`.
- **`FOLDER_SHOWS_FULL_CURATED_CATEGORY`** (`render.js`, a `Set`) — folders that represent "the whole category" closely enough to show the full curated list: `default-books-books`, `default-movies-movies`, `default-shows-shows`, `default-games-console`, `default-musicians-musicians` (the last one easy to forget — it's Musician's *own* primary folder, not a creator-card bucket, but still needs the full-category fallback or it silently shows 0 like a real no-data folder would).
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
- `curatedCreatorLookup.js` also exports the shared `getStaticCuratedCreator(cat, title)` (returns `{ name, hasMore }`) and `SPLIT_TITLE_CREATOR_CATEGORIES` — imported by both `render.js` (rendering) and `storage.js` (the already-saved-items backfill migration, see Latest Session Summary above).

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
```

---

## How to Reload After Changes

1. Edit any file in `Chrome Extensions/Savecraft/`
2. Go to `chrome://extensions`
3. Click the **↺ refresh** icon on the SaveCraft card
4. Reopen the library tab (or hard-refresh it)

No build step — changes are live after reload. `src/app/js/main.js` is loaded as an ES module (`<script type="module">`), so `import`/`export` typos surface as console errors on the library tab, not silent failures — always check DevTools console after a reload when editing `js/` or `css/` files.
