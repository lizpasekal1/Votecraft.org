# SaveCraft — Session Context for AI

This file helps Claude (or any AI assistant) quickly regain context on the SaveCraft project without re-reading the full codebase.

---

## Latest Session Summary

**Theme: an exceptionally long, almost entirely live-feedback-driven session spanning voice notes, a real My Notes Profile widget, a full sidebar reorganization, a new shared "You're opening X" confirm-popup component (reused 4+ places), a "Saved List scope" feature (browsing categories while scoped to a specific list — grid filtering + sidebar title + folder-hiding all stay in sync), and — by far the largest single piece — dozens of rapid iterative passes rebuilding the Edit Item screen's own popup (size, layout, a purple header bar, field reorganization, consistent field heights, a real cross-category field-ordering bug). Closed with a `/simplify` pass (4 parallel review agents). Every change deployed individually via `firebase deploy --only hosting`, verified live via curl, then committed and synced from the working branch (`savecraft-vc-coin-sponsored-page`) to `main` through a disposable `git worktree` cherry-pick — dozens of small commits, see git log.**

- **Voice notes** — record via the My Notes toolbar's mic icon, redesigned mid-build (per direct feedback: "the user should still be able to add text before or after it") from a per-row IndexedDB attachment into an inline `<img data-audio-id>` marker embedded directly in note HTML, matching the existing image-insertion toolbar pattern. Toolbar icon order: audio, image, bullet, bold, highlight, focus, close.
- **New: real "My Notes" Profile widget** — replaced a placeholder with an accordion timeline of every item with notes, a category-sort dropdown, and link/voice/image indicator badges per item.
- **Sidebar reorganization** — "Dashboard" → "My Dashboard"; Saved Lists/Curated Lists moved to the top of the Dashboard group (above Queue Kanban), given purple rounded-rect icon badges; "Saved Lists" row renamed "My Saves Library"; My Saves Library and Curated Lists made mutually exclusive (opening one closes the other); tapping Open/Explore on a list now collapses that accordion (and, per a later fix, its Dashboard parent too) back closed; every Saved List's own title now always returns to that list's landing card, standardized the same way the VoteCraft/Top 100 title already did (**real bug fixed along the way**: tapping "‹ VoteCraft" while already on the landing page bounced to Cause Curated instead of staying, from a fallthrough "already at top, step out" branch never special-casing the one genre with its own landing banner).
- **New: shared "You're opening X" confirm popup** (`confirmModal.js`, `openSwitchConfirm`) — used by the sidebar's Saved Lists rows, the Curated Lists/VoteCraft row, and Shared Saves' cards; `name` is optional (message-only mode) and `leadText` can be `''` to show a plain title with no lead line, added specifically for the Dashboard-exit confirm below. Many live-feedback rounds on copy/icon size/hover states/button labels.
- **New: "Saved List scope" feature** — browsing a Saved List (e.g. "Health") then clicking a top-level category used to silently drop all list context (grid showed the full unscoped category, title reverted to "My Saves"). Fixed with a new `state.activeSavedListId` field (session-only, not persisted, same pattern as `authorReturnView`) threaded through `navigateToView`'s opts, `main.js`'s popstate handler, `renderFilters.js`'s category/folder branches, and `renderSidebar.js`'s title/back-button/`allowedFolderIds` folder-hiding. Tapping "My Dashboard" while scoped now shows a confirm popup first (extended to Curated Lists too, per a later request). **Real bug fixed along the way**: the sidebar's own folder/subfolder item-count badges weren't scope-aware, so a brand-new empty list's folders still showed the full unscoped counts.
- **Extension toolbar popup** (`src/popup/`) gained the same "Select Lists" checkbox-multi-select dropdown the main app's Add flow already had, which it had simply never gotten. **Real bug fixed along the way**: the popup's save handler hardcoded `favorite: false` on every new item, so nothing saved from the toolbar popup ever actually showed up under "All My Saves."
- **Edit Item screen — the big one.** Started from "the edit item is its own popup, separate from the preview modal, and the box visibly resizes going in and out"; user picked the lower-risk option (keep the two modal elements, make the transition feel seamless) over a full DOM-merge rewrite, then iterated through dozens of concrete asks: matched width/padding to the detail modal (a `.modal--edit-item` class), removed the bookmark icon, put the category select and heading on one row, added a back arrow that returns to the detail/preview modal (`main.js`'s `#btn-modal-back` handler special-cases `state.editingId`), dropped the thumbnail preview (kept the Image URL text field), added a purple header bar (bled to the modal's true edges via negative margins matched to its own padding, later reworked so it stays *within* the modal's rounded corners instead of poking past them since `.modal` has no `overflow: hidden` of its own), relocated the Save button into that bar (renamed back from "Update" to "Save," white/narrower/hover-outlined, pushed toward the corner), stacked Image URL/URL full-width (was side-by-side), added a new "Select List" field (reusing the My Saves Library icon), unified every field/dropdown to one height except Summary, and reduced/retuned spacing several rounds. **Real bugs found and fixed along the way**: `.modal-step2`'s mobile-only vertical-centering + `-35px` nudge (tuned for the Add flow's short Title+URL-only review screen) was also silently applying to Edit's much longer form, rendering its content pulled up above its natural scroll position and visibly intruding behind the header bar on a real iPhone regardless of scroll offset — root-caused via code inspection after two earlier guesses (bumping margin values) didn't fix it; separately, `updatePlatformsSection` unconditionally yanked the YouTube URL field out of Music categories' own paired row every time it ran, undoing `updateVideoUrlLayout`'s placement of it.
- **Queue Kanban's expand-button icon** matched to Admin Kanban's own down-chevron (the two had drifted — Admin Kanban already moved off the shared plain "+" cross, Queue Kanban hadn't).
- **Top 100 category pages** (Musician/Show/Book/Game/Movie) — title now reads "`<Category>` | Votecraft" (same pattern as the Saved List scope suffix, just pointing at the Top 100 landing page), and the publication logo (Rolling Stone/Steam/NYT) sits on that same title row, right-aligned — after a detour through a separate row below the title, moved back per direct follow-up.
- **`/simplify` pass** (4 parallel review agents) — consolidated the Saved-List-scope membership check (independently duplicated 4 ways across `renderFilters.js`/`renderSidebar.js`) into one exported `matchesActiveSavedListScope()`; factored a repeated "resolve scoped list id, falling back to parsing the view string" pattern in `renderSidebar.js` into one helper; fixed `noteSanitizer.js`'s `inspectNoteHtml` re-deriving the same boolean expression `noteHtmlHasContent` already computes; stopped `profile.js`'s My Notes rows parsing every note's HTML even while collapsed; dropped a dead always-`true` parameter in `sharedSaves.js`.
- **Known gap, not resolved this session**: the working branch (`savecraft-vc-coin-sponsored-page`) itself has diverged from its own `origin` remote (14 commits apart — older parallel work from earlier in this same session that got pushed directly at some point). A real merge was attempted, hit conflicts in `sidebar.css`/`renderSidebar.js`/`sharedSaves.js` (the same purple-icon-badge/confirm-popup features built independently on both sides under different names), and was aborted rather than risk a rushed resolution. `main` itself stayed fully up to date throughout via the cherry-pick pattern — this gap is specific to the branch's own remote, not to the actual delivered work.

---

## Previous Session Summary

**Theme: an extremely long, live-feedback-driven session — closed out the mobile Kanban bottom-gap/scrollbar investigation, then found and fixed a genuinely serious real bug (Kanban-demo cards crashing the main library grid on every category with items in it, silently freezing the screen on whatever view was open before), then a long run of feature work (duplicate-URL guard, Saved Lists rename/delete-with-merge, sidebar subfolders, a new in-app About page, two new Profile widgets including a VC-coin-branded "VC Connector"), then dozens of rapid live-feedback polish rounds, closed with a `/simplify` pass (4 parallel review agents) over the whole session's diff. Coordinated throughout with a concurrent second session (see "Earlier Session Summary (WordPress Admin Bridge)" below) via `scripts/deploy-savecraft.sh`'s merge-before-deploy step — no conflicts, several clean auto-merges.**

- **Real bug found and fixed: Kanban-demo placeholder cards crashed every category grid + inflated sidebar counts** — the 10 demo cards seeded for the Kanban board's own empty-state preview (`storage.js`'s `_seedQueueDemoItems()`, `url: null`) live in the same shared `state.items` array as real saves, each carrying a real category. Since the main library grid, sidebar folder/category counts, and Embed Builder's source pickers all read `state.items` directly (or via `getFilteredSortedItems()`, which itself reads `state.items`), these placeholder cards spread across every category — clicking any category containing one crashed `renderCard()` at `getDomain(null)[0]`, which aborted the render before it ever overwrote `#cards-grid`, silently leaving whatever view had been open before (often the Dashboard) frozen on screen with the new category's title/sort-dropdown layered on top. Also inflated sidebar counts with phantom saves (e.g. a "Websites 1" badge with zero real saves). Diagnosed via a DevTools console error the user copied over live. Fixed at the shared source — `getFilteredSortedItems()` (`renderFilters.js`), the two sidebar count filters (`renderSidebar.js`), and Embed Builder's source-finalizing + custom-picker search pool (`embedBuilder.js`) all now exclude `isQueueDemoId()` items.
- **Real bug found and fixed: newly-added items never appeared in the current session** — `handleSaveItem()`'s brand-new-item branch built the item and persisted it to storage, but — unlike its other two branches (curated-edit pushes, existing-edit replaces by index) — never added it to the in-memory `state.items` array; `persistItem()` only writes to storage, it doesn't touch `state.items` itself. The save silently succeeded (item would reappear after a reload) but `renderGrid()`/`renderSidebar()` right after used the still-unchanged in-memory array, so a brand-new item never showed up anywhere without a manual reload. Reported live: adding "climate.us" as an Article, save closed the modal but nothing appeared.
- **Real bug found and fixed: Web Links had no placeholder/badge color at all** — every other category (Musician, Show, Book, Movie, Game, Visual Art, Memes) already had its own placeholder gradient + badge color for a card with no image, but Web Links was missing from both — a card with no fetched/manual image rendered a blank, uncolored box. Added a teal placeholder/badge pair (light + dark theme).
- **New: duplicate-URL guard on Add/Edit** — Save now checks for an existing item with the same `url` AND `folderId` (excluding the item being edited) before persisting anything; if found, a `confirm()` offers to open the existing card's detail modal instead of silently creating a second copy.
- **New: Saved Lists rename + two-step delete, from the Profile page widget** — each list row (hover to reveal, or while expanded) gets a rename icon (`prompt()`) and a delete icon. Delete is two-step: a plain confirm, then — only if another real list exists — a small custom modal asking whether to merge this list's items into another list first (dropdown of every other list, or "Don't merge — just delete") before the list and its membership on every item are actually removed. "All My Saves" (default-favorites) is excluded as a merge target. Saved Lists in the sidebar are now always alphabetized (default-favorites pinned first), a new list slotting into its correct position rather than appending at the end.
- **New: sidebar subfolders** — every folder can now accordion-open (its own arrow, separate control from the row's own click-to-navigate) to reveal its own subfolders plus a nested "+ New folder" row, same shape a category itself already has. Folders gained an optional `parentFolderId`; deleting a folder cascades to its whole subtree recursively instead of orphaning children. The Add Item wizard's own folder-picker screen does NOT yet surface subfolders (deferred, explicitly out of scope for now) — Edit's folder `<select>` does, indented to show hierarchy.
- **New: About page** — a real in-app page (`state.view === 'about'`, `about.js`), reached from the header Settings dropdown (was briefly an external link to the marketing page instead, corrected per direct follow-up). Reuses Shared Saves' own page shell; content is a bold "SaveCraft is a VoteCraft.org product." line, a civic-engagement blurb, and the same "Privacy Policy · Terms of Service" row already used on the Profile page (`profile.js`'s `buildLegalLinksRow`, exported and reused). Settings dropdown itself: Privacy Policy/Terms of Service entries replaced with the single About entry; "Sponsored Statements" renamed to "Sponsors"; About's icon swapped from an emoji to a filled info-circle SVG matching the dropdown's other stroke-icon rows.
- **New: two Profile page widgets — Shared Lists and VC Connector** — Shared Lists is a checklist of Shared Saves' own demo friends (`sharedSaves.js`'s `DEMO_FRIENDS`, exported and reused), persisted via a new `state.selectedSharedFriends` Set (mirrors `hiddenCurated`'s exact persistence shape). VC Connector rebuilds the standalone VC-coin promo widget's content (`widgets/vc-coin-widget/vc-coin-banner.html`) as plain markup/CSS in this app's own visual language — no coin animation/particles. Its "Learn More" button (moved to the bottom of the card, styled like Connect Steam) opens a white, teal-branded confirmation popup ("You're opening / VC Connector" — "Explore the organizations you support and keep track of your VC.") before actually linking out to the VC Wallet. `profile-widget-grid` expanded from a 2x2 to a 3-row grid to fit both new cards. Both Interests and Shared Lists also gained an unwired "+ Add New" placeholder button, per direct request, not yet functional.
- **Widget grid updated: `.profile-widget-grid`** now 3 rows (was 2x2) to fit Saved Lists + Shared Lists + VC Connector alongside Connections/Interests/My Notes.
- **Mobile Kanban bottom-gap/scrollbar saga, closed out** — the horizontal scrollbar on `.kanban-board` (overflow-x: auto, 4+ columns overflow the window width) was rendering as the browser's thick native gray scrollbar instead of the thin themed one, because the site's one global scrollbar rule only set `width` (vertical thickness), never `height` (horizontal thickness) — this was the "gray rectangle" reported on window resize, misdiagnosed for a round as possibly being in the sidebar. Fixed with one line. `.kanban-column`'s own remaining `padding: 12px` (all sides) was also trimmed to `12px 12px 0`, the last piece of the board reaching the true bottom of the window.
- **Many small live-feedback polish rounds** (each deployed+committed individually, see git log for exact wording): Dashboard sidebar icon (and then every top-level sidebar icon) fills solid purple on active AND hover, not just the desktop collapsed rail; SaveCraft logo color changed twice (periwinkle, then `#5e60fb`) and a drop-shadow was added then fully reverted per direct feedback; VC Connector's tagline/description/tags iterated several rounds (final: "Building Capitalism + Altruism," teal, only the Volunteer tag); the VC Wallet popup's title/button layout/colors iterated ~8 rounds; Interests' "List" suffix dropped from option labels and its checklist column gap widened; mobile header logo moved 20px from the hamburger; Cause Curated's mobile Dashboard-link-to-banner gap and banner text alignment adjusted (banner text left-aligned, scoped so Shared Saves' own reuse of the same `.bare-list-hero` class stays centered) — last report on this was unconfirmed (asked the user to hard-refresh before digging further, computed CSS didn't obviously support a large gap being possible).
- **`/simplify` pass** (4 parallel review agents) over the full session's diff (~1500 lines, file-scoped since local HEAD was already even with origin) — applied: merged two sets of byte-identical duplicate CSS rules (sidebar icon active/hover; the two Profile-widget bottom CTA buttons); trimmed a redundant `:hover` re-declaration on the VC Wallet's Open button; fixed a stale code comment; extracted a shared `_openTransientModal()` helper (the Saved Lists merge picker and VC Wallet popup had each hand-rolled the same overlay lifecycle independently); added `getChildFolders()`/`getFolderDescendantIds()` to `utils.js`, replacing three independently hand-rolled folder-tree walks (also fixed a latent parentFolderId-undefined-vs-null inconsistency between them); dropped a redundant array copy in `renderFilters.js`; consolidated Interests/Shared Lists' near-identical widget code into one shared `buildChecklistCard()`/`wireChecklistCard()`. Skipped: two Efficiency findings that traced via `git log -S` to the concurrent session's own commits, not this one's; generalizing queue-demo-id filtering into a single `state.items` accessor (real, but touches the seeding/storage/kanban contract more broadly than a cleanup pass should risk); a theme-variant mechanism for the VC Wallet modal (premature abstraction for the one modal that currently needs it).
- Deployed after every change via `scripts/deploy-savecraft.sh`, each followed by its own scoped commit+push — dozens of small commits this session, see git log for the full list.

---

## Earlier Session Summary (WordPress Admin Bridge)

**Theme: building the WordPress Admin Bridge — trusted staff managing SaveCraft's Admin Kanban board directly from wp-admin, no separate SaveCraft login. Also spanned, earlier in the same session (before this became the focus): sidebar UI polish, a deploy-race infrastructure fix, a real Firestore security-rules bug, a from-scratch admin-account system, and a full auth-modal rebuild through many rapid live-feedback iterations — see git log around this era for those; this entry focuses on the WordPress bridge itself, the last and largest piece of work.**

- **Phase 1 (Admin Kanban in wp-admin) — built, tested, deployed, end to end.** A dedicated Firebase Auth bot account (`wp-savecraft-bot@votecraft-789.internal`) was created specifically for this — not a GCP service account, a plain Identity Toolkit user, matching this codebase's no-SDK REST-only convention. `firebase/firestore.rules` gained an `admin_kanban_cards` rule that deliberately does **not** hardcode a static human-UID allowlist — it mirrors `utils.js`'s `isAdminUser(email, role)` logic directly in rules syntax (`request.auth.token.email.lower() in [...]` OR a `get()` lookup of the requester's own `savecraft_users/{uid}.role` field), plus one hardcoded UID for the bot itself. **Real gap caught during this design**: an earlier version of the rule only allowlisted the bot's UID, which would have silently broken the SaveCraft app's *own* admin sync the moment a real admin (e.g. Liz's own account) tried to write a card — the app-side `isAdminUser()` gate would've shown the UI, but every Firestore write would've 403'd. Fixed by making the rule structurally mirror the JS check instead of hardcoding humans.
- **Admin Kanban moved from local-only to per-card Firestore sync** (`storage.js`) — `persistAdminKanbanCards()` (whole-array, local-only) replaced with `persistAdminKanbanCard(card)`/`removeAdminKanbanCard(id)` (per-document, mirroring the existing `persistItem`/`removeItem` pattern for personal items), plus a new `_syncAdminKanbanCards()` step in `runInitialSync()` — cloud is authoritative once it exists (this is one *shared* board now, not personal per-device data, so no per-card merge like items/folders/authors get). `adminKanban.js`'s four call sites (add/edit, delete via modal, delete via list button, drag reorder) updated accordingly — drag reorder passes every card in the affected column, since `manualOrder` shifts on all of them, not just the one dragged.
- **New WordPress plugin**, `plugins/votecraft-savecraft-admin/` (structured like the existing `votecraft-sidebar-nav/` plugin) — `votecraft-savecraft-admin.php` (capability-gated admin menu + REST routes), `includes/class-firestore-client.php` (a PHP port of `storage.js`'s Firestore REST helpers and `auth.js`'s refresh-token→ID-token exchange, including matching Firestore-value↔native-value conversion so a card round-trips identically regardless of which side wrote it last), `admin/js/admin-kanban.js` (vanilla JS, talks only to this plugin's own REST routes, never Firestore directly). Gated behind a dedicated `manage_savecraft_admin` capability, not `manage_options`, so it's grantable to specific staff without making them full WP Admins.
- **Verification was thorough on the Firestore/security side, more limited on live-browser testing.** Direct REST calls confirmed all three admin-detection paths (bot UID, email match, role match) can read/write `admin_kanban_cards` while staying hard-denied on `savecraft_users`/`curated_items`. Live-browser Playwright testing hit Firebase Auth's rate limit partway through (repeated automated sign-ins from rapid test iteration, not a code issue) — relied on syntax checks (`node --check`, plus a JS-based PHP parser for the new PHP files since no `php` CLI was available in this environment) and the one clean pre-rate-limit browser run instead of exhaustive live re-verification.
- **A live "cards are gone" report turned out to be a false alarm, but worth understanding why**: user saw an empty Admin Kanban board mid-session. Investigation ruled out this session's own (still-undeployed) changes and a concurrent second session's just-landed deploy (confirmed CSS-only, unrelated board). A hard refresh brought the cards back immediately, which itself proves it wasn't real data loss (nothing else could have "restored" local data that was actually gone) — most likely explanation is a page load caught mid-way through the concurrent session's deploy, briefly hitting an inconsistent JS/auth-state moment.
- **Phase 2 (viewing SaveCraft accounts from wp-admin) was designed but is paused, not built.** A Plan agent produced a full implementation plan (Cloud Function + dedicated IAM service account scoped to `roles/firebaseauth.viewer`, shared-secret header auth from WordPress, a second narrower WP capability `view_savecraft_accounts` for the PII exposure this involves) — but Cloud Functions require Firebase's paid Blaze plan, and `votecraft-789` is currently on the free Spark plan. Asked directly; the answer was to pause rather than switch billing plans. Full design preserved, ready to resume, in `/Users/lizpasekal/.claude/plans/can-we-separtarate-the-adaptive-breeze.md` — see also the new [[savecraft-wordpress-admin-bridge]] memory note.
- Committed in three scoped batches (Firestore rules/config, SaveCraft JS sync changes, new plugin), merged cleanly with a concurrent session's own CSS-only work via `scripts/deploy-savecraft.sh`, pushed, and deployed to `votecraft-789.web.app`.

---

## Earlier Session Summary (Kanban Drag-and-Drop / Widget Restyle / Bottom-Gap Fixes)

**Theme: an extremely long, live-feedback-driven polish pass across both Kanban boards (real Queue board and Admin Kanban) — drag-and-drop refinement, a Spotify-style Dashboard widget redesign, and a multi-round "mobile board doesn't reach the bottom of the screen" investigation that turned out to be three separate bugs stacked on top of each other, closed by a fourth, unrelated "gray rectangle" report that turned out to be a missing scrollbar style. Closed with a `/simplify` pass (4 parallel review agents) partway through, plus routine `scripts/deploy-savecraft.sh`-based deploys throughout in coordination with a concurrent second session working the sidebar/Firestore-rules track.**

- **Kanban drag-and-drop polish, both boards** (`kanban.js`/`adminKanban.js`/`kanban.css`) — cross-column drops always land at the top of the destination column; same-column drops support precise before/after positioning via a dashed placeholder that reuses the touch-drag "floating card" visual language. A card turns light purple (inset box-shadow wash) the moment it's picked up, and holds solid purple for ~1s after being dropped before fading (`@keyframes kcard-drop-flash`). Column scrolling locks during an active drag (so a finger drag doesn't fight the column's own scroll), the board auto-scrolls horizontally near its edges during a drag, and the destination column re-centers into view after a drop. **Real bug found and fixed**: the reorder placeholder's own on-screen position was being read by `elementFromPoint` as "empty space," so hovering the placeholder itself made it snap to the bottom of the list every frame — fixed with a rect-based early-return check before hit-testing.
- **Queue Kanban demo seeding** — 10 real, interactive demo cards spread across all 4 columns with mixed categories (The Great Gatsby, Inception, Breaking Bad, Portal 2, Random Access Memories, Radiohead, Starry Night Study, An Interesting Article, Dune, The Matrix), flag-gated one-time seed (`_seedQueueDemoItems()`, `storage.js`). Ids follow a stable `queue-demo-N` pattern (`isQueueDemoId()`, `utils.js`, shared by `kanban.js`/`dashboard.js`/`storage.js`) so their card renders can special-case a "D" placeholder letter. Originally titled "Demo: …" — later stripped to just the title via a one-time backfill pass (`_backfillDemoTitles()`), keeping the "D" placeholder letter intact via the same id check rather than the title text.
- **Admin Kanban urgency simplified** — the old 1-10 numeric urgency rating replaced with a 3-level dropdown (Low/Medium/High; `_urgencyLevel()` normalizes any legacy numeric value for backward compat). The colored dot no longer shows the urgency number — it now shows the card's **order position within its column** (1 at the top), colored by urgency level (blue/green/red; medium was orange, changed to green per direct request). **Real scope mistake caught and reverted**: this position-badge feature was initially (mis)built on the real Queue Kanban board in response to an ambiguous request — corrected mid-session ("i didn't ask you to do anything with the queue board") with a full clean revert before rebuilding it correctly on Admin Kanban only.
- **Dashboard widget restyle — Queue Kanban mini-cards, "Spotify-style"** (`dashboard.css`) — disambiguated via a clarifying question early on. Square thumbnail tiles (final corner radius 4px, after several live-corrected rounds: 9px → 0 → 4px), borderless flat pills, 2-line title clamp, gray card-background removed, "+N more" overflow text removed. A crossing divider between the Queue/In Progress columns was rebuilt using `::before`/`::after` pseudo-elements anchored to the shared grid parent (`.dash-kanban-mini-board`) after an earlier attempt failed to actually cross at the intersection.
- **Widget alignment/spacing polish** — top/bottom padding (`.dash-card-header`) unified across every Dashboard widget, while left/right padding stayed intentionally per-widget per direct instruction. The Recent Saves/Curated Lists "Sort" pill's vertical alignment took three failed attempts (margin-top, `align-self: center`, explicit height-matching all had no visible effect) before `position: relative; top: 8px` — a direct offset bypassing flex-centering math — finally worked; the dead attempts were cleaned up in the later `/simplify` pass. Queue Kanban widget moved up 15px net on mobile (`.dash-card--kanban { margin-top: -10px }`), an intentional side effect of also pulling sibling widgets up, confirmed as the actually-desired behavior rather than a bug.
- **Carousel arrow changes, Recent Saves + Curated Lists widgets only** (`dashboard.css`/`dashboard.js`) — right arrow removed, strip bleeds to the widget's true right edge (`margin-right: -20px`, since `.dash-card`'s own 20px padding was still short of "true edge" the first time this was attempted), the sole remaining (left) arrow's scroll direction reversed to advance forward, and the arrow re-centered on the thumbnail image's own height specifically (not the full card+caption), then dropped down 20px more per direct request. Scoped to `.dash-card--favorites`/`.dash-card--curated` throughout — the underlying `.dash-carousel`/`_wireCarouselArrows()` machinery is shared with Shared Saves, Embed Builder, and the Curated landing pages, and an early unscoped attempt at removing the next-button wiring was caught and reverted before it could regress those other pages.
- **`/simplify` pass** — 4 parallel review agents over the session's diff at that point; applied fixes included deduping a regex, merging a split CSS rule block, and removing dead alignment CSS (the failed `align-self`/height-matching attempts above) once `top: 8px` was confirmed as the real fix.
- **Mobile + desktop Kanban board "doesn't reach the bottom of the screen" — four stacked root causes, found one at a time via live screenshots and user-performed DevTools inspection**: (1) `body`'s static `height: 100vh` (`base.css`) with `overflow: hidden` acted as a hard clipping ceiling for every descendant regardless of their own correct height math — iOS Safari's dynamic toolbar meant `100vh` sat short of the true visible area; fixed with the two-declaration `100vh`/`100dvh` fallback pattern applied directly to `body` (an earlier attempt at the same fix on `.main-layout` in `misc.css` was well-reasoned but couldn't have mattered, since `body`'s own ceiling sat above it). (2) `.kanban-board`'s own fixed 16px bottom padding — removed (`padding: 4px 2px 0`). (3) `.kanban-column:hover`'s full-column-height gray background — lit up the empty space below a sparse column's last card on hover, reading as a separate "gap" region; removed entirely (`.kanban-column--expanded` kept its own always-on version, since that one wasn't purely a hover-workaround). (4) `.kanban-column`'s own remaining `padding: 12px` on all sides still left a 12px-plus gap below the last card even after the board-level fix; trimmed to `padding: 12px 12px 0`.
- **"Gray rectangle" appearing on window resize, persisting after release, reacting to hover** — initially misdiagnosed via a DevTools inspection round pointing at "sidebar nav" (a dead end — no matching rule found there, and the user's own next answer directly contradicted it: "no it's not the side bar"). Actually the horizontal scrollbar on `.kanban-board` (which has `overflow-x: auto`, and 4+ columns that overflow the window width): the site's one global scrollbar rule (`misc.css`) only set `width: 6px`, which styles a *vertical* scrollbar's thickness — it never set `height` (a horizontal scrollbar's thickness), so any horizontal-overflow element fell back to the browser's thick, unstyled, native-gray scrollbar instead of the thin themed one used everywhere else. Fixed with one line: `::-webkit-scrollbar { width: 6px; height: 6px; }`.
- Deployed after every change via `scripts/deploy-savecraft.sh` (never bare `firebase deploy`, to stay merge-aware against the concurrent session sharing this live Firebase project), each deploy followed by its own scoped `git add`/`commit`/`push` since the deploy script's own push only carries already-committed history. Commits this session: touch-drag/placeholder work, demo seeding + title backfill, urgency dropdown + position badge (with its queue-board revert), the Spotify-style widget redesign, the `/simplify` pass, carousel arrow changes, and finally the four kanban-bottom-gap fixes plus the scrollbar fix (`538ffc0`, `5a84450`, `b53e95a`, `51d3ab9`, `fb17fd1`).

---

## Earlier Session Summary (Sidebar Accordion / Firestore savecraft_users Rule Fix)

**Theme: a live-feedback-driven UI polish pass on the sidebar's collapsible sections (Dashboard and every top-level category) — a Spotify-reference-driven gray "open section" highlight, several rounds of live color correction, and a genuine open/close animation via the View Transitions API that surfaced (and fixed) two real rendering bugs along the way. Closed with a `/simplify` pass (4 parallel review agents) over the session's diff.**

- **Sidebar accordion gray fill** (`renderSidebar.js`, `sidebar.css`) — per a Spotify screenshot reference, opening any collapsible section now fills the *entire* open block with one continuous gray highlight, not just the header row (previously `.sidebar-item.active` only lit up whichever single row was the current view). Generalized into a shared `.sidebar-group`/`.sidebar-group-bg` wrapper applied uniformly to Dashboard (Queue Kanban, Admin Kanban, Saved Lists, Curated Lists) and every top-level category (Sources, Shows, Music, Games, Films, Literature, Arts, and their own nested folders) — rounded only at the very top/bottom of the block, flush/square between rows in between, so it reads as one shape rather than a stack of separate pills. The fill color itself went through several live-corrected rounds — lighter gray (`#45454A`) → black (per request) → finally `var(--bg)`, the same dark gray already used for the page's own content-area background (too-harsh black, per request) — each landing in a new `--active-bg-light` CSS variable (`base.css`) rather than overloading the shared `--hover-bg` (~50 other hover states across the app key off that one).
- **Row hover simplified** — `.sidebar-item:hover`'s own gray background patch removed entirely, per request (it read as a mismatched patch against the new full-section fill); hover now only turns the row's text purple.
- **Real bug found and fixed: mobile subfolder rows lost their nesting indent** — the mobile drawer's `.sidebar-items-scroll .sidebar-item` override (`misc.css`) set a flat `padding: 8px 16px 8px 20px` shorthand on every row, which unintentionally clobbered `.sidebar-subfolder`/`.sidebar-subfolder--nested`'s own deeper 46px/66px indent (equal specificity, later source order) — Queue Kanban, Saved Lists, and every category's own subfolders lined up flush with their parent instead of nesting under it, mobile only (desktop was never affected, nothing there overrides padding-left this broadly). Fixed by dropping `padding-left` from that shorthand entirely, letting each row's own indent rule apply the same as desktop.
- **"Opens down" transition, added then reworked twice** — accordion open/close now animates via the View Transitions API (`withViewTransition` helper, feature-detected/no-op on browsers without support — Safari shipped same-document support in v18). **Two real bugs found and fixed live**: (1) naming the whole `.sidebar-group` for the transition made the browser cross-fade a *stretched* snapshot of the actual row text as the box grew, visibly warping it ("bouncing" text, reported live) — fixed by moving `view-transition-name` onto a new, empty `.sidebar-group-bg` layer behind the rows instead, so only an invisible solid-color rectangle ever gets stretched, never real content. (2) That bg layer's `z-index: -1` then made the whole fill disappear on open — `.sidebar-group` had `position: relative` but no explicit `z-index`, so it never actually established its own stacking context, letting the `-1` child escape past it and sink behind the sidebar's own background; fixed with `z-index: 0` on `.sidebar-group`.
- **`/simplify` pass** — 4 parallel review agents (Reuse/Simplification/Efficiency/Altitude) over the session's diff (`base.css`, `sidebar.css`, `misc.css`, `renderSidebar.js`, diffed against the commit before this session started). Applied: the transition-name sanitizer now reuses the existing `catClass()` helper (`utils.js`) instead of a second one-off regex, and is memoized (its input set — `CATEGORIES` + `'dashboard'` — is fixed at load time but was being recomputed every `renderSidebar()` call, a hot path called throughout the app); the `::view-transition-group(*)` timing rule moved from `sidebar.css` to `base.css` (necessarily page-wide, not sidebar-scoped — that pseudo-selector only accepts a literal name or `*`) and its hardcoded easing curve swapped for the existing `--m3-standard` token (already earmarked, per its own comment, for "smaller, quieter" transitions like an accordion row); `.sidebar-item.active`'s background simplified from a "set it, then immediately cancel it back out inside `.sidebar-group.open`" pair into one rule scoped to `.sidebar-group:not(.open)`. Skipped, noted rather than applied: `navigateToView()`'s storage write + full grid rebuild running inside the View Transition's capture callback (real cost, but restructuring `navigateToView`'s shared contract risks the ~10 other call sites depending on it); extracting the two toggle handlers' duplicated collapse/navigate logic (predates this session's diff); the `--active-bg-light`/`--bg` alias (deliberate, cheap, already explained in its own comment); the always-rendered-but-invisible-when-collapsed `.sidebar-group-bg` divs (negligible cost, needed for the transition to have a stable element to animate).
- **Two follow-up fixes on the collapsed desktop rail, both live-reported**: Dashboard's icon was off-center from every other icon on the narrow icon-only rail — `.sidebar-group.open`'s own `margin-right: 12px` (unconditional, matches every non-grouped row's inset in the normal expanded sidebar) wasn't reset for the rail the way the analogous `.sidebar-item` rule already was, so whichever section was open (Dashboard, by default) centered in a narrower box than every other icon; fixed with `.sidebar.sidebar-collapsed .sidebar-group.open { margin-right: 0; }`. Also removed `.sidebar-dashboard-link`'s mobile-only `padding-left: 10px` (a prior session's request to shift it left) — it now visibly misaligned against Sources/Shows/Music/etc. once compared directly, so it falls back to the shared 20px indent like every other row.
- **Discovered mid-session: a concurrent second agent's `firebase deploy` was silently overwriting this session's own deploys, twice** — not a code bug, a deploy-tooling gap. `firebase.json`'s `"public": "."` means every deploy uploads the *entire* directory tree as a snapshot of whatever's on disk in that session's local checkout; it has no concept of git branches, so "last deploy wins" regardless of which session's fixes were actually correct. A git worktree (`/Users/lizpasekal/Documents/Votecraft.org-claude-session`, branch `savecraft-vc-coin-sponsored-page-claude`) was set up for this session specifically to stop *commit* collisions (two sessions sharing one working directory share one git index — a `git commit`/`git add -A` in either can sweep up the other's staged-but-uncommitted files; this had already happened once, bundling this session's sidebar/doc work into the other session's own kanban-work commit) — but worktrees don't fix *deploy* collisions, since both still point at the same live Firebase project regardless of branch. Fixed with a new `scripts/deploy-savecraft.sh` that fetches + merges `origin/savecraft-vc-coin-sponsored-page` before every deploy, so whichever session deploys carries forward both sides' *pushed* work instead of just its own local state (doesn't help for still-uncommitted changes on either side, but removes the failure mode actually hit — a pushed fix getting dropped by the other side's next deploy). See new [[savecraft-concurrent-agents]] memory note.
- **Mobile sidebar drawer CSS moved from `misc.css` into `sidebar.css`** — pure reorganization, no behavior change (verified: selector-by-selector diff, zero console errors, and the moved CSS renders pixel-identical when forced open via a Playwright smoke test against a local `firebase serve`). `sidebar.css` already owned the desktop collapsed-rail CSS; its mobile counterpart had been left behind in `misc.css`'s catch-all instead of living with the rest of the sidebar's own CSS — every other feature file (`cards.css`, `dashboard.css`, `kanban.css`, etc.) already owns its own responsive rules internally, so this fixes `sidebar.css` being the one outlier rather than introducing a new kind of split. `misc.css` keeps `.btn-hamburger`/`.fab-add` (separate mobile-only UI, not sidebar CSS) and everything else not owned by a dedicated feature file.
- **Real bug found and fixed: Firestore security rules deployed live were missing the entire `savecraft_users` match block** — the live ruleset (last deployed Jul 16, predating that path being added to the rules file) had no rule at all covering per-user synced data. Firestore is default-deny per path, so this wasn't a leak — it was the opposite: nobody, not even a document's own rightful owner, could read or write it. Per-user cloud sync on web has been silently non-functional in production until this was caught. Confirmed via direct empirical testing against the live REST API (not just reading rule text) — created a real throwaway signed-in test account, confirmed it was denied reading even its own doc before the fix, then confirmed it could read/write its own doc (and still correctly couldn't touch another uid's) after deploying the corrected `firebase/firestore.rules`. Two secondary discrepancies fixed in the same deploy: `curated_items` write was open to any signed-in user live (should be console-only) and `jokeVotes` write allowed any signed-in user to write any vote doc (should be scoped to their own). `Documentation/launch-requirements.md` item #1 and `savecraft-profile-security.md`'s security-status/cost sections updated to match — the latter also newly documents the free-tier (Spark plan, $0/month) usage limits and what would actually warrant revisiting them, closing out a cost-strategy note deferred from an earlier session.
- Deployed after every change (`firebase deploy --only hosting --project votecraft-789`, later `scripts/deploy-savecraft.sh`), per standing instruction. Committed in several scoped batches across this session (main feature work, the `/simplify` pass, the two rail follow-up fixes, the CSS reorganization) — several other pre-existing uncommitted changes already sitting in the working tree (`dashboard.css`, `kanban.css`, `adminKanban.js`, `dashboard.js`, `kanban.js`, and large `api/`/`games/` deletions) were left untouched throughout, not authored this session.

---

## Earlier Session Summary (Profile Mobile Pass / Admin Kanban Built)

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

## Claude Code Permissions Setup

`…/Savecraft/.claude/settings.json` (new) holds a project-level `permissions.allow` list to cut
down repeated approval prompts, scoped deliberately narrow:

```json
{
  "permissions": {
    "allow": [
      "Bash(grep *)",
      "Bash(dig *)"
    ]
  }
}
```

Both are unconditionally read-only regardless of flags (`grep` never writes; `dig` is a DNS
lookup) — chosen by scanning ~50 recent session transcripts for the most frequent Bash calls,
then keeping only patterns that (a) aren't already covered by Claude Code's own built-in
read-only auto-allow list (`cd`, `cat`, `head`, `tail`, `echo`, `wc`, `ls`, `find`,
`git status`/`diff`/`log`/`branch`/`rev-parse`, `lsof`, etc. — these never needed a rule) and
(b) can't be turned destructive by a hidden flag. `curl` was deliberately left out despite being
the next-most-frequent candidate — most calls used `-s`/`-sI`/`-sf` (all safe), but a wildcard
rule can't distinguish those from `curl -sX POST ... -d '...'`, and this project's owner
explicitly did not want anything that could enable a mutating request to slip through unprompted.
Interpreters/shells/package-runners (`python3`, `node -e`, `npx`, `bash -c`, `source`) are never
allowlisted here even when read-only in a specific observed use, since a wildcard rule covering
them is equivalent to unprompted arbitrary code execution.

**Separate, pre-existing file — not part of this setup, worth knowing about:**
`/Users/lizpasekal/Documents/Votecraft.org/.claude/settings.local.json` (one directory *above*
this project, at the shared monorepo root) already has its own, considerably more permissive
`permissions.allow` list — including blanket `"Edit"`/`"Write"` and two genuinely risky entries,
`Bash(python3 -c ' *)` and `Bash(node -e:*)`, both real arbitrary-code-execution allowances. It
predates this session, wasn't created by this work, and hasn't been modified here. Because it
lives at the monorepo root rather than at this project's own path, it may not even be in effect
for sessions whose working directory is this Savecraft folder specifically (Claude Code project
settings are path-scoped) — which could explain permission prompts persisting despite that file
looking permissive on paper. Flagging this for whoever next touches permissions here, not
recommending any specific change to it.

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

### The working branch (`savecraft-vc-coin-sponsored-page`) has diverged from its own `origin` remote (unresolved, needs manual reconciliation)
A previous divergence between this branch and `main` (documented in an earlier version of this section) was successfully resolved via a real 3-way merge earlier in the "Latest Session Summary" above's session — that one's closed out; `main` has stayed fully up to date since, synced after every change via a disposable `git worktree` cherry-pick.

The gap now is different: the *local* `savecraft-vc-coin-sponsored-page` branch itself is 14 commits behind `origin/savecraft-vc-coin-sponsored-page` — likely older work from earlier in that same long session that got pushed straight to the branch's own remote at some point, never pulled back into this local copy. Attempting `git merge origin/savecraft-vc-coin-sponsored-page` hit real conflicts in `sidebar.css`, `renderSidebar.js`, and `sharedSaves.js` — the remote side had independently built the same purple sidebar-icon-badge and "You're opening X" confirm-popup features this session also built, under different class/function names (`.sidebar-list-icon-chip` vs. this session's `.sidebar-list-icon-box`, for example). The merge was aborted rather than force-resolved, for the same reason as the earlier `main` divergence: picking a side mechanically risks silently discarding real work from the other.

**Current state**: nothing is at risk — every actual feature this session built is live on savecraft.org and safely on `main`. This is purely about getting the local working branch's own history in sync with its remote, which needs an actual side-by-side read of the three conflicting files (not a mechanical merge) to combine both sides' independently-built versions of the same features correctly.

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
