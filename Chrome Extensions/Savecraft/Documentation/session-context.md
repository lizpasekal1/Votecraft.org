# SaveCraft — Session Context for AI

This file helps Claude (or any AI assistant) quickly regain context on the SaveCraft project without re-reading the full codebase.

---

## Latest Session Summary

**Theme: a live-feedback-driven UI polish pass on the sidebar's collapsible sections (Dashboard and every top-level category) — a Spotify-reference-driven gray "open section" highlight, several rounds of live color correction, and a genuine open/close animation via the View Transitions API that surfaced (and fixed) two real rendering bugs along the way. Closed with a `/simplify` pass (4 parallel review agents) over the session's diff.**

- **Sidebar accordion gray fill** (`renderSidebar.js`, `sidebar.css`) — per a Spotify screenshot reference, opening any collapsible section now fills the *entire* open block with one continuous gray highlight, not just the header row (previously `.sidebar-item.active` only lit up whichever single row was the current view). Generalized into a shared `.sidebar-group`/`.sidebar-group-bg` wrapper applied uniformly to Dashboard (Queue Kanban, Admin Kanban, Saved Lists, Curated Lists) and every top-level category (Sources, Shows, Music, Games, Films, Literature, Arts, and their own nested folders) — rounded only at the very top/bottom of the block, flush/square between rows in between, so it reads as one shape rather than a stack of separate pills. The fill color itself went through several live-corrected rounds — lighter gray (`#45454A`) → black (per request) → finally `var(--bg)`, the same dark gray already used for the page's own content-area background (too-harsh black, per request) — each landing in a new `--active-bg-light` CSS variable (`base.css`) rather than overloading the shared `--hover-bg` (~50 other hover states across the app key off that one).
- **Row hover simplified** — `.sidebar-item:hover`'s own gray background patch removed entirely, per request (it read as a mismatched patch against the new full-section fill); hover now only turns the row's text purple.
- **Real bug found and fixed: mobile subfolder rows lost their nesting indent** — the mobile drawer's `.sidebar-items-scroll .sidebar-item` override (`misc.css`) set a flat `padding: 8px 16px 8px 20px` shorthand on every row, which unintentionally clobbered `.sidebar-subfolder`/`.sidebar-subfolder--nested`'s own deeper 46px/66px indent (equal specificity, later source order) — Queue Kanban, Saved Lists, and every category's own subfolders lined up flush with their parent instead of nesting under it, mobile only (desktop was never affected, nothing there overrides padding-left this broadly). Fixed by dropping `padding-left` from that shorthand entirely, letting each row's own indent rule apply the same as desktop.
- **"Opens down" transition, added then reworked twice** — accordion open/close now animates via the View Transitions API (`withViewTransition` helper, feature-detected/no-op on browsers without support — Safari shipped same-document support in v18). **Two real bugs found and fixed live**: (1) naming the whole `.sidebar-group` for the transition made the browser cross-fade a *stretched* snapshot of the actual row text as the box grew, visibly warping it ("bouncing" text, reported live) — fixed by moving `view-transition-name` onto a new, empty `.sidebar-group-bg` layer behind the rows instead, so only an invisible solid-color rectangle ever gets stretched, never real content. (2) That bg layer's `z-index: -1` then made the whole fill disappear on open — `.sidebar-group` had `position: relative` but no explicit `z-index`, so it never actually established its own stacking context, letting the `-1` child escape past it and sink behind the sidebar's own background; fixed with `z-index: 0` on `.sidebar-group`.
- **`/simplify` pass** — 4 parallel review agents (Reuse/Simplification/Efficiency/Altitude) over the session's diff (`base.css`, `sidebar.css`, `misc.css`, `renderSidebar.js`, diffed against the commit before this session started). Applied: the transition-name sanitizer now reuses the existing `catClass()` helper (`utils.js`) instead of a second one-off regex, and is memoized (its input set — `CATEGORIES` + `'dashboard'` — is fixed at load time but was being recomputed every `renderSidebar()` call, a hot path called throughout the app); the `::view-transition-group(*)` timing rule moved from `sidebar.css` to `base.css` (necessarily page-wide, not sidebar-scoped — that pseudo-selector only accepts a literal name or `*`) and its hardcoded easing curve swapped for the existing `--m3-standard` token (already earmarked, per its own comment, for "smaller, quieter" transitions like an accordion row); `.sidebar-item.active`'s background simplified from a "set it, then immediately cancel it back out inside `.sidebar-group.open`" pair into one rule scoped to `.sidebar-group:not(.open)`. Skipped, noted rather than applied: `navigateToView()`'s storage write + full grid rebuild running inside the View Transition's capture callback (real cost, but restructuring `navigateToView`'s shared contract risks the ~10 other call sites depending on it); extracting the two toggle handlers' duplicated collapse/navigate logic (predates this session's diff); the `--active-bg-light`/`--bg` alias (deliberate, cheap, already explained in its own comment); the always-rendered-but-invisible-when-collapsed `.sidebar-group-bg` divs (negligible cost, needed for the transition to have a stable element to animate).
- Deployed after every change (`firebase deploy --only hosting --project votecraft-789`), per standing instruction. Committed in two scoped batches (main feature work, then the `/simplify` pass) — several other pre-existing uncommitted changes already sitting in the working tree (`dashboard.css`, `kanban.css`, `adminKanban.js`, `dashboard.js`, `kanban.js`, and large `api/`/`games/` deletions) were left untouched both times, not authored this session.

---

## Previous Session Summary

**Theme: a very long, live-feedback-driven session spanning three distinct efforts — a Profile page mobile pass, new Privacy Policy/Terms of Service pages, and a brand-new "Admin Kanban" board built from scratch for tracking SaveCraft's own project tasks — closed by discovering and fixing a genuinely important pre-existing bug: native HTML5 drag-and-drop never worked on iOS touch at all, on *either* kanban board, not something this session broke. A concurrent second agent was independently editing the sidebar/Curated/Shared Saves pages in the same repo mid-session (see the entry below, now bumped to "Previous") — same `git status`-before-every-stage discipline used to avoid touching their in-progress files.**

- **Profile page mobile pass** — text sizes bumped across every card (base sizes in `profile.css`, a further mobile-only bump in `misc.css`), Interests' checkbox grid forced to 2 columns on mobile (its `auto-fill, minmax(160px,1fr)` collapsed to 1 column and 8 stacked rows on a phone), Connections rows restructured to stack (description full-width, button below) instead of squeezing description text into ~150px next to a fixed-width button, Connect Last.fm/Steam's `<br>` hidden on mobile only (`.profile-connect-break`, `display:none` inside the mobile media query) so the button fits its label on one line while desktop keeps its original 2-line look, and the "No password, no login required" line merged into the same paragraph as the sentence above it (was a hardcoded `<br>`). **Real bug found and fixed**: `.profile-widget-grid`'s `grid-template-rows: repeat(2, 1fr)` was still pairing row 1 (Connections) with row 2 (Interests) into equal-height tracks even in the mobile single-column layout — after Connections grew a second line per row, Interests got stretched to match, leaving a large empty gap under its own content; fixed with `grid-template-rows: none` on mobile so every card sizes to its own content. Interests' checkboxes also switched from `align-items: center` to `flex-start` so a wrapped 2-line label doesn't drift the checkbox to its vertical center.
- **New: Privacy Policy & Terms of Service pages** (`src/webpage/privacy-policy.html`, `terms-of-service.html`) — modeled on Raindrop.io's structure and philosophy where it fit (the numbered-section layout, a legal-grounds/consent-withdrawal paragraph, a deliberately vague "we use your data to understand usage" analytics framing so a future partner-analytics feature wouldn't contradict it), but written to honestly describe what SaveCraft actually does today rather than copying Raindrop's specifics — no fabricated payment/refund terms (SaveCraft is free), no API Terms section (no public API exists). Both carry a visible yellow "working draft, not reviewed legal text" banner. Linked from the Profile page (desktop card + mobile page-end duplicate, as one "Privacy Policy · Terms of Service" row), the Settings dropdown, and a new footer on the Sponsored Statements page.
- **New: Admin Kanban** (`src/app/js/adminKanban.js`) — a second, separate board from the real "My Saves Queue," for tracking SaveCraft's own launch to-do list rather than saved items. Same visual system as the real board (`.kcard` sizing, the circular expand button, empty-column drop hints, `.kanban-wrap`/`.kanban-board` structure) but simpler cards — just a name + details field, edited via a small popup (built once, injected into `document.body` rather than living as static `index.html` markup, since this whole feature is expected to be reworked/removed later) instead of inline. Reachable from a new 5th Dashboard widget (full-width, landing below Curated Lists — `.dash-widget-grid`'s `grid-template-rows` gained an explicit `auto` third track) and a new sidebar entry next to Queue Kanban. Cards can carry an optional 1-10 urgency rating, shown as a colored dot (bottom-right) and a left-edge strip (blue 1-3, deep orange 4-7, red 8-10 — orange rather than yellow so its number can stay white like the other two). A dedicated global sort dropdown (A→Z, Z→A, Newest→Oldest, Oldest→Newest, Urgency High→Low, Urgency Low→High, Custom order) is rendered as the board's own content rather than repurposing the shared `#sort-select` singleton, whose fixed option set belongs to the main items grid. Seeded exactly once (flag-gated) with the `launch-requirements.md` checklist below, one card per sub-task, each pre-rated by urgency; a separate one-time backfill pass patches urgency onto boards that were already seeded before the urgency field existed.
- **New: `Documentation/launch-requirements.md`** — a checklist of what's outstanding before real user testing (Firestore rules confirmation, forgot-password flow, the sign-in-required-on-web decision, error monitoring, a per-view mobile spot-check, cross-browser testing, a `games/`/`api/` cleanup, Chrome Web Store status), broken into ~30 concrete sub-tasks — the source for the seeded Admin Kanban cards above.
- **Real bug found and fixed: Dashboard's Admin Kanban mini-preview referenced a stale `c.text` field** — a leftover from an earlier single-textarea card design that got redesigned into separate name/details fields partway through the session; would have silently shown "Untitled" for every real card. Caught while wiring the urgency feature through and fixed to read `c.name`.
- **Real bug found and fixed: a mobile layout attempt broke page scrolling entirely** — trying to put Admin Kanban's title and sort dropdown on one line by switching `.grid-area` itself to `flex-direction: row` broke the flex-column/`overflow:hidden` contract `.grid-area:has(.kanban-wrap)` depends on (shared by both boards), breaking mobile scrolling outright (reported live). Reverted immediately and rebuilt safely: title + sort dropdown are now rendered as the board's own content entirely inside `#cards-grid` (which was already safely `flex:1`/`min-height:0` inside that same contract), never touching `.grid-area`'s own layout again.
- **Real bug found and fixed: the floating "+ Add card" button silently swallowed nearby drops** — made absolutely-positioned (floating over the bottom of the column, cards scrolling underneath, per direct request) so columns could reach the full height of the screen instead of the button eating into their flex-allocated space as a normal sibling; but as a separate element visually overlapping the drop zone, drops landing on/near it had no handler and did nothing.
- **The real closing fix: native HTML5 drag-and-drop never fires from touch on iOS Safari at all** — true of the pre-existing Queue Kanban board too (reported live: "I can't drag on the queue kanban either… can you make it so I can drag on my iPhone"), not something this session broke. Reimplemented the interaction manually with real touch events (`touchstart`/`touchmove`/`touchend`, a movement threshold so a plain tap still falls through to the card's own click-to-open handler, `document.elementFromPoint` standing in for the missing touch equivalent of `dragover`) in *both* `kanban.js` and `adminKanban.js`, each factored so the mouse `drop` handler and the touch `touchend` handler call the exact same `performDrop()` reorder/persist logic instead of duplicating it. `touch-action: none` added to `.kcard` so the browser's own default touch-scroll doesn't race the drag gesture before the threshold engages.
- Deployed after every change (`firebase deploy --only hosting --project votecraft-789`), per standing instruction. Committed in two scoped batches once a natural stopping point was reached (`bbc3019`, `c9d1d39`) rather than per-change, given the volume of iteration.

---

## Earlier Session Summary (Mobile Sidebar / Curated / Shared Saves Polish)

**Theme: another long, live-feedback-driven mobile polish pass — this time across the mobile sidebar drawer, the Curated SaveCraft bare-list page, and the Shared Saves page — with the same `[hidden]`-vs-`display` CSS bug recurring three separate times in three different components, and a stacked-ancestor-padding math error recurring twice more. A concurrent second agent was independently editing the Profile page in the same repo mid-session, requiring careful `git status` inspection before every `git add` to avoid staging or committing their in-progress work. Closed with a `/simplify` pass (4 parallel review agents) over the session's diff.**

- **Mobile sidebar drawer** (`misc.css`) — width fixed to a plain `240px` (not `vw`, which renders slightly wide on iOS Safari — see the codebase's existing `vw`-quirk notes), overlay tint lightened to `rgba(0,0,0,0.25)`, `.sidebar-item` padding/min-height tightened, and the Curated mode-tab (`[data-sidebar-opt="curated"]`) made permanently purple with a white outline when `.active` (an attribute-selector override placed after `.active` in source order to win the specificity tie — flagged by this session's own `/simplify` altitude pass as a fragile pattern, not fixed, see below). The Dashboard link row got its own tighter mobile-only indent/padding (`.sidebar-dashboard-link`, `padding-left: 10px`, shorter top/bottom). `renderSidebar.js`'s `[data-sidebar-opt]` click handler now calls `closeSidebar()` after switching to Curated or Shared mode, so tapping either tab on mobile actually closes the drawer instead of leaving it open over the new page.
- **Curated SaveCraft bare-list page** (`cards.css`/`renderCuratedPages.js`) — `.bare-list-row` restructured to CSS Grid on mobile (`display: contents` on `.bare-list-info` to "unwrap" its children up into the grandparent grid — title next to avatar, tagline/tag get their own full-width rows), avatar shrunk, the redundant "View" button replaced by a chevron (`::after`), and the Cause Area filter chips collapsed to the first 5 with a "View more" toggle plus a new "Why Curated Lists" collapsible accordion. `.bare-list-hero`'s `margin-left: -20px` bleed was missing a matching `margin-right` — asymmetric on both pages this shared component appears on (Cause Curated and Shared Saves) until fixed.
- **Shared Saves page** (`sharedSaves.css`/`sharedSaves.js`) — fixed a real horizontal-centering bug (`padding-left` with no matching `padding-right`, the same bug class as the Curated page above); added FAB bottom-clearance; halved card sizing on mobile (Friends cards shrunk further still, then Cause Curated/Group Lists later matched back to the same height after initially being trimmed to fit their now-hidden description); mobile-only shorter section titles via a CSS-only `.shared-title-full`/`.shared-title-compact` swap (`sharedSaves.js` gained a `mobileTitle` param); slider title alignment went through several live iterations (centered-grouped → `flex: 1` pushing the Add icon away, reverted → grouped-centered again → **final: `justify-content: flex-start`**, left-aligned); sliders now bleed to the true right screen edge, accounting for two stacked layers of mobile padding (`.grid-area`'s own plus `.shared-page-wrap`'s own), with the prev/next arrows overlaid on the cards instead of sitting beside the strip.
- **Recurring bug pattern, found 3 times**: an author-stylesheet rule giving an element its own non-`none` `display` (e.g. `display: flex`) silently outranks the browser's built-in `[hidden] { display: none }` UA rule at equal specificity, regardless of `@media`-block nesting — the cascade tiebreak is source order. Hit and fixed on the auth modal's Demo button, the Cause Area chips' "View more" overflow group, and the Shared Saves compact-title swap; each time fixed by moving the base `display: none` rule earlier in source order than the later override.
- **Recurring bug pattern, found twice**: a negative margin meant to bleed an element past its parent's padding only accounted for the nearest ancestor's padding, missing that `.grid-area` (misc.css, applied to every page on mobile) stacks its own padding on top of a page wrapper's own copy of the same padding — `-16px` alone left 16px still visible; needed `-32px`. Reported live both times ("still not enough into the corner").
- **Concurrent-agent git handling** — mid-session, the user warned another agent was independently saving Profile page changes in the same repo. `git status` was checked before every stage; files that showed as already-staged-but-not-by-this-session (`profile.css`, `profile.js`, `misc.css`, `index.html`) were left completely untouched (no `git add`, no `git reset`, no commit) rather than assumed safe to bundle in. The other agent's commit (`669ba47`) landed cleanly with zero file overlap against this session's own scoped commits.
- **`/simplify` pass** — 4 parallel review agents (Reuse/Simplification/Efficiency/Altitude) over the session's diff. Applied: two new CSS custom properties in `misc.css` (`--fab-clearance: 96px`, `--page-mobile-pad: 16px`) so the FAB-clearance and standard mobile-page-padding values are each defined once instead of re-derived by hand per page; `.shared-page-wrap`'s `margin-top: -10px` (fighting `.grid-area`'s own padding-top from the child side) replaced with a direct `.grid-area:has(.shared-page-wrap) { padding-top: 6px }` override, matching the `:has()` idiom Dashboard/Profile already use for their own FAB clearance; the Shared Saves carousel's `-32px` bleed margin now derives from `calc(var(--page-mobile-pad) * -2)` instead of a bare literal; the Curated page's "View more"/"Why Curated Lists" toggles now flip their own `hidden`/class attributes directly instead of re-running the entire bare-list render just to reveal a few more chips. Skipped, noted rather than applied: consolidating the new accordion-chevron pattern with two near-identical ones already in `detailModal.css` (real duplication, but reconciling rotation/timing/hover-state details risked a visible change unsafe to verify blind); a couple of minor duplicated magic numbers (56px avatar size, a `1.4` line-height re-hardcoded in a `min-height` calc); replacing the "always purple" curated sidebar tab's attribute-selector + source-order tiebreak with an explicit JS-emitted modifier class (real, but a JS+CSS coordination change for a cosmetic-only win); a single global `[hidden] { display: none !important }` base rule to replace ~6 scattered local per-component overrides across `kanban.css`/`cards.css` (the deeper fix for the recurring bug pattern above, but touches files well outside this session's diff); and structurally removing the double-counted 16px mobile padding rather than just documenting the relationship via the new shared variable — the actual padding values were live-verified against real screenshots this session, and changing the visible result isn't safe to do blind while screenshot review was intermittently broken (see below).
- **Screenshot pipeline broke mid-session** — two consecutive user-sent screenshots failed to process/transmit; asked the user to describe the issue in words instead of relying on visual confirmation for the remainder of the session's later fixes.
- **Deployed after every change** (`firebase deploy --only hosting --project votecraft-789`), per standing instruction. Committed in scoped batches as the concurrent-agent situation required (`759a4f6`, `3a23cc6`, `eabc8f7`, `acf4451`, `8986739`) rather than one end-of-session commit.

---

## Earlier Session Summary (Add Item Modal Redesign)

**Theme: a two-day, almost entirely live-feedback-driven polish pass on the Add Item modal (`src/app/index.html`/`addEditModal.css`/`addEditModal.js`) — mobile first, then bringing desktop to visual parity with it — one-line/screenshot instructions iterated in rapid single-property steps (a padding value nudged 3-4 times in a row as screenshots came back). Two small features landed along the way (Save button disabled until Title/URL is filled; a new "Lists Explainer" info screen). Closed with a `/simplify` pass (4 parallel review agents) over the full two-day diff.**

- **Desktop parity pass for the wizard's tile screens** ("What are you adding to?" and "Choose a folder") — fixed-height modal on desktop too (`45vh`/`45dvh`, landed after live back-and-forth: 85→65→50→35→42→45, mirroring mobile's own fixed-height fix from the previous session), tile grids capped to a centered `330px` `max-width` (`#step1-category-grid`/`#step1-folder-grid`/`#step1-music-choice-grid`) so tiles don't stretch full-width, column/row-gap unified to `20px`, icon+label padding tuned (`padding-left: 10px`, `padding-right: 15px`), and the bookmark icon in front of "What are you adding to?" removed (desktop only — `.modal-h2--category-screen .modal-bookmark-icon { display: none }`).
- **Review/input screen (Title/URL/Select Lists) redesign, both breakpoints** — title now reads **"Add &lt;singular noun&gt;"** (`singularize()`, new — handles the common English plural suffixes plus an explicit override list for words the suffix rule gets wrong, e.g. "Movies"→"Movie" not "Movy", "Web Series"/"News" left unchanged) instead of the raw plural folder/category name; white on this screen specifically (`.modal-h2--review-title .modal-category-title { color: #fff }`), purple everywhere else. "Select Lists" pill restyled: purple background/white text (was the shared dark dropdown style), pill-shaped (`border-radius: 999px`), height-matched to the grid/kanban toolbar's own `.sort-select` pill, widened twice (+15px, then +15px again), right-aligned to the fields' own edge (not the modal's, which needed a `-22px` correction once the fields themselves got a `-3px`/`25px` inset trick to sit exactly 25px off the modal edge instead of the `28px` default). Save button widened twice (+15px, then +15px again) and now **disabled until Title or URL has content** (`updateSaveButtonEnabled()`, wired to both fields' `input` events plus called directly wherever the fields get programmatically filled — `showReviewScreen`, `openEditModal`, `selectTitleSearchResult`).
- **New: "Lists Explainer" info screen** — a small circular info icon (top-right corner, `.modal-corner-icon` shared base with the existing back-arrow icon) that opens a 3-step vertical infographic (Category → Folder → Lists, connected by a CSS-drawn line) explaining that a save can belong to multiple lists at once, like tabs. Placement went through several live corrections before landing: initially built for the category-tile screen, then explicitly moved to the review/input screen instead (next to Select Lists, since that's what it actually explains) — Add flow only, never shown in Edit. The back arrow returns to the review screen with whatever the user had already typed intact (`backToReviewScreen()`, not a destructive re-run of `showReviewScreen()`'s own field-clearing reset).
- **`/simplify` pass** — 4 parallel review agents (Reuse/Simplification/Efficiency/Altitude) over the full 2-day diff (`git diff HEAD` on the 4 touched files). Applied: removed dead `#modal-back-label` (span + CSS + 7 call sites — always set to `''`, a leftover from before category titles moved into the h2); cached `#modal-overlay h2` once at module scope + new `setModalHeading(html, screenClass)` helper, replacing ~10 duplicated 3-line `classList.remove/add + innerHTML` sequences across every wizard screen-transition function; factored a shared `reviewTitleHtml()` helper so the info screen's back-nav (renamed `returnFromInfoScreen` → `backToReviewScreen`, matching the existing `backToXScreen` naming convention) recomputes the title fresh instead of snapshotting/restoring raw HTML; deduped two near-identical outside-click dropdown-closers into one generalized `.platform-dropdown[open]` listener in `main.js`; extracted a shared `.modal-corner-icon` base class for the back/info icons; merged split/duplicate CSS rule blocks (`#saved-lists-wrap .platform-dropdown-summary`, the three separate tile-grid `max-width`/centering rules). Skipped, noted rather than applied: restructuring the hand-tuned mobile pixel offsets and the `.modal-step2` negative-margin/padding inset trick (both are live-device-verified values a code-only refactor could silently regress without a way to re-verify visually this session); a full declarative per-screen state table (real improvement, too large a rewrite for a simplify pass); consolidating the file's 3 separate desktop `@media` blocks into one (skipped — fights the file's own established convention of keeping desktop overrides physically near their related mobile/base rule).
- **Deployed after every single change** (`firebase deploy --only hosting --project votecraft-789`) — dozens of small deploys this session, per standing instruction to deploy automatically without asking. Committed once at the end, this session's diff only (`src/app/index.html`, `src/app/js/addEditModal.js`, `src/app/js/main.js`, `src/app/css/addEditModal.css`) — see git log.

---

## Earlier Session Summary (superseded)

*Connected VoteCraft Coin (VC) — Votecraft's civic-engagement reward concept — to the Sponsored Statements partner-pitch page, always framed as an estimate/preview (never an already-credited balance) since VC has no real backend anywhere in Votecraft yet; added a plain-language VC explainer section; corrected an initial pass's use of VC's own teal brand color back to SaveCraft's purple throughout, per direct instruction; and fixed a real bug where `sponsored.js` crashed on the web build (`chrome.runtime.getURL()` called unconditionally) by rewriting it as an ES module using the `platform.js` shim.* Continued the mobile-layout pass against a live iPhone 16 Pro — consolidated ~14 duplicate `touch-action: pan-y` declarations down to one rule on `body` (CSS's `touch-action` already intersects down the whole DOM subtree from an ancestor), fixed the detail modal's mobile sizing/image-scale/CTA-button-width, and fixed a Safari `fit-content`-centering bug on the sponsored badge. Mobile drawer tabs (Curated/⚡ Shared) gained real hover/active states and the second tab was wired to the real Shared Saves view instead of a hardcoded Top 100 shortcut, plus a new `collapseAllSidebarSections()` helper (with a real bug fixed along the way: tapping Curated then Dashboard used to leave every accordion open). Then a substantial rename/unification effort retired "Favorites" in favor of "All My Saves" and unified it with Dashboard as the same navigation destination — took several rounds of clarification since Dashboard, the "All My Saves" Saved List, and a separate dead `state.view === 'all'` grid turned out to be three different things in the existing code. Closed with a `/simplify` pass (3 of 4 agents converged on the same `collapseAllSidebarSections()` duplication finding, fixed; 2 converged on a redundant double-write in the Favorites-rename storage migration, also fixed).* Before that — made SaveCraft dual-mode — the same `src/app/` codebase also runs as a plain web app at savecraft.org (Firebase Hosting, project `votecraft-789`) via a new `platform.js` runtime shim (`isExtension`/`storageSync`/`storageLocal`/`openInNewTab`/`resourceUrl`, swapping `chrome.*` calls for `localStorage`/`window.open`-backed equivalents), with a required sign-in gate on web since it has no `chrome.storage.sync`-style device sync. Same session, a full mobile-layout pass against a live iPhone 16 Pro (Playwright-verified) found and fixed six real bugs: Dashboard not scrolling on mobile, the welcome banner collapsing to ~90px (percentage-height-of-`auto`-parent bug), the sign-in modal's three buttons wrapping, a curated hero banner's icon badge overlapping its text, curated org-list rows squeezed to half-width, and the mobile sidebar drawer collapsing to 64px whenever desktop's own collapsed-sidebar preference was set. Before that — landed real Saved Lists sidebar navigation (clicking a Saved List now actually filters the grid), a from-scratch Share modal redesign (a Saved Lists picker replacing free-text Message, an on/off link-sharing toggle), broadened the sponsor pitch page from one offering to three, and built the Embed Builder feature end to end (source picker, style panel, live carousel preview, shareable "Embed code" link) — two real bugs along the way (a CSS Grid track-blowout from an unbreakable URL string, a temporal-dead-zone crash from a `const` referenced before its own declaration line ran). Before that — My Notes toolbar gained image + hyperlink support (image insert via a prompt-based URL, sanitizer extended with `src`/`alt` allow-lists and a scheme gate; auto-linkified plain-text URLs) — two real bugs along the way (an image-only note silently wiped on blur since the "is this empty" check only looked at `.textContent`; partial-selection dehighlighting left empty `<mark>` artifacts, fixed by deciding "was this fully highlighted" from the live DOM before touching anything). Then a four-part category/sidebar restructuring (TV Shows moved into Films as a new "Series" folder, Musicians renamed to Music, News tab dropped, an Articles wizard shortcut added) plus a real bug fix (Dashboard excluded from the sidebar's tab mutual-exclusion group, so expanding a category silently left Dashboard open too). Toolbar spacing/color scheme redesigned (solid-purple resting state, inverted on hover/active). Before that — rebuilt the Add/Edit Item modal from scratch (4-screen wizard → 3 screens, Title field doubling as the search box), plus a long tail of header/spacing polish, a from-scratch feature for Movie's "Videos" folder (thumbnail fetch, embedded video lightbox), a generalized card-badge system, and category renames — with a couple of real bugs along the way (a detached-node crash on the 2nd category switch, a double-border CSS specificity bug). Before that — rebuilt the detail modal's My Notes (plus Book's Chapters, Music Album's Song List) from a single plain textarea into a numbered-notes system with a formatting toolbar, a distraction-free focus mode, and per-row rename — including several real bugs (a `max-height`-transition "fades before it opens" illusion, a force-closed accordion leaving an inline style override behind, Escape-while-renaming closing the whole modal). Before that — replaced the Music Album gallery's single low-res iTunes image with a real multi-image gallery sourced from MusicBrainz + the Cover Art Archive, plus several rounds of detail-modal visual polish. Before that — a string of detail-modal visual tweaks, an "AI slop" cleanup pass, deleting the long-dead `app.js`/`app.css` monolith backup, splitting both `render.js` and `detailModal.js` into focused per-concern modules, a real scroll-when-closed bug fix, and moving Musician's bio into My Notes. See git history around those eras if needed.*

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
| Sponsored/partner page | `…/Savecraft/src/sponsored/sponsored.html` + `sponsored.js` (module, wordmark link) + `vc-bonus.js` (VC bonus preview) — runs on extension and savecraft.org web build |
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
| `savecraft_saved_lists` | Array of `{ id, name }` — Saved Lists ("All My Saves"/Health/Motivation seeded, plus any user-added ones); an item's membership lives on the item itself (`item.favorite` for `default-favorites`, `item.savedListId` for every other list), not here. `default-favorites`'s display name has migrated in place twice — "Favorites" → "All Saves" → "All My Saves" (same id throughout, everything that cares checks the id, not the label) |
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
  sidebarMode: 'categories' | 'curated' | 'shared' | 'home',
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
| `'savedlist:<id>'` | A Saved Lists sidebar row — for every list **except** `default-favorites`, shows a placeholder landing card ("Pick an option from the sidebar to add your specific saves"), not yet a real filtered grid (`renderGrid.js`'s `savedlist:` branch is deliberately unconditional, doesn't route through `getFilteredSortedItems()`'s own dormant `savedlist:` branch). `savedlist:default-favorites` specifically is never actually navigated to anymore — clicking that row (labeled "All My Saves") instead sets `state.view = 'dashboard'`, same destination as the Dashboard sidebar link itself; see Sidebar Structure below |
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

`handleSaveItem()` no longer requires a URL — Title is the required field instead (same red-border-flash validation UX, just checking a different field). This also fixed a latent bug: editing a curated item with a blank Title used to silently write `title: null` over the curated base item. **Note (latest session)**: the Save button's own disabled/grayed-out state (`updateSaveButtonEnabled()`, `addEditModal.js`) is looser than this — it enables as soon as *either* Title or URL has content, so it's possible to enable the button with URL alone and still hit this Title-required validation on click. Intentional as shipped (per direct request), not a bug.

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

**Mutual exclusion with category tabs** — Dashboard's collapse state is part of the *same* mutual-exclusion group the category tabs share, not a standalone toggle: expanding a category tab collapses Dashboard, and expanding Dashboard collapses whichever category tab was open, so at most one top-level sidebar tab is ever expanded at once. `wireDashboardLink()`'s expand branch calls the shared `collapseAllSidebarSections()` helper (below) and then `state.collapsed.delete('dashboard')` to reopen just itself — it used to instead rebuild `state.collapsed` from an `otherCollapsibleIds` param closed over whichever render pass had wired the click handler (`sidebarCategoryList` in normal mode, `[]` in the curated genre-picker), which was a real, live-reported bug: clicking Dashboard from the curated-picker render left every category un-collapsed once the click switched back to the normal categorized sidebar, since that render pass's own `otherCollapsibleIds` was empty. Reusing the canonical category list `collapseAllSidebarSections()` builds fixed it for good, regardless of which render pass wired the click.

**`collapseAllSidebarSections()`** (`renderSidebar.js`, exported and re-exported via `render.js`) — the canonical "close every accordion" helper: `dashboard`, `saved-lists`, `curated-lists`, and every real category (`CATEGORIES` minus Music Album, which is never its own top-level row). Called whenever the sidebar switches top-level mode — the mobile drawer's Curated/⚡ Shared tabs, and the desktop options dropdown (`main.js`) — so the new mode always starts fully collapsed instead of carrying over whatever was left open under the previous one. A superset is fine even when the new mode doesn't render every one of those ids; `state.collapsed` is just a lookup Set, an unused id in it is inert.

**Open-section gray highlight + animation (`.sidebar-group`/`.sidebar-group-bg`)** — Dashboard's own template and every category's own template (`renderSidebar.js`) each wrap their header row + expanded children in a `<div class="sidebar-group${open ? ' open' : ''}">`, with a `<div class="sidebar-group-bg">` as its first child. `.sidebar-group-bg` is what actually carries the gray fill (`background: var(--active-bg-light)`, `opacity: 0` → `1` on `.open`) and the rounded-right shape — it's a plain, absolutely-positioned, empty layer sitting *behind* the real row content (`z-index: -1`; `.sidebar-group` itself needs an explicit `z-index: 0`, not just `position: relative`, to actually contain that `-1` — otherwise it escapes past the sidebar's own stacking context and the fill renders invisible, a bug hit live). Clicking a header (`wireDashboardLink`'s Dashboard handler, and the `.sidebar-category` click handler) wraps its state-mutation + `navigateToView()` call in `withViewTransition()` (`document.startViewTransition`, feature-detected) so the section grows/shrinks smoothly instead of snapping. The `view-transition-name` given to each `.sidebar-group-bg` (via the memoized `sidebarGroupVtName()`/`catClass()`) is deliberately **not** on the row content itself — naming a growing/shrinking element makes the browser cross-fade a *stretched* snapshot of it mid-animation, invisible for a plain color fill but visibly warps real text (hit live, "bouncing" text). Saved Lists/Curated Lists' own nested toggle (`[data-toggle-list]`, inside `_renderDashboardListRow`) is a separate, simpler collapse — no `.sidebar-group` wrapper, no transition, still an instant snap.

**Dashboard and "All My Saves" are the same destination** — the Saved Lists row labeled "All My Saves" (`item.id === 'default-favorites'`) and the Dashboard sidebar link both set `state.view = 'dashboard'` on click (rather than the generic `savedlist:default-favorites` placeholder every other Saved List still uses), and both rows' `isActive` checks reflect that (the Saved List row needed an explicit `itemIsActive` override for this, since its normal `viewPrefix`-derived check would never match `'dashboard'`). The sidebar's own title bar (`sidebarTitle`) reads "My Saves" for this case — a deliberate override, not the list's actual stored name ("All My Saves," still shown on the row itself) — same as the generic default title used everywhere else nothing more specific applies.

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

- **Favorites Spotlight widget, displayed as "Recent Saves"** — internal names (`.dash-card--favorites`, `_favSlides`, `buildFavoritesWidget()`, etc.) still say "Favorites" throughout this module; only the widget's own on-screen title text was renamed, so don't be thrown by the mismatch when grepping.
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
--active-bg-light /* open/current sidebar section fill — currently == var(--bg), kept separate since the two are conceptually distinct */
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
