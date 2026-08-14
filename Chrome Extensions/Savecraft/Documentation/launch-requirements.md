# SaveCraft — Launch Requirements for User Testing

A working to-do list of what's outstanding before inviting real (non-team) users to test
savecraft.org and/or the Chrome extension. Grounded in a review of the codebase — re-check items
against the code before assuming they're still accurate, especially anything unconfirmed. Each
top-level item is broken into smaller steps; check them off as you go.

Organized by how much each item actually blocks a safe, usable test.

---

## 🔴 Blockers — fix before any real user's data touches this

### 1. ✅ Confirm Firestore security rules are deployed live — done, real bug found and fixed
Confirmed they did **not** match — and worse than the "just not deployed yet" worry above: the live
ruleset (last deployed Jul 16, predating `savecraft_users` being added to the rules file) was
missing the `savecraft_users` match block **entirely**. Firestore rules are default-deny per path,
so this didn't leak anyone's data — it did the opposite: nobody, not even the rightful owner, could
read or write their own synced items/folders/authors. Per-user cloud sync on web has been silently
broken in production until this was caught. Verified empirically against the live REST API (not
just reading rule text) both before and after the fix, including a real throwaway signed-in test
account. Two secondary discrepancies fixed in the same deploy: `curated_items` write was
`if request.auth != null` live (any signed-in user could edit curated data) instead of
`if false` (console-only); `jokeVotes` write allowed any signed-in user to write *any* vote doc
instead of only their own.

- [x] Open console.firebase.google.com → `votecraft-789` → Firestore → Rules, and compare what's
      live against the local `firestore.rules` file
- [x] They didn't match — ran `firebase deploy --only firestore:rules --project votecraft-789`
- [x] Manually verified: a real signed-in test account cannot read/write another account's
      `savecraft_users/{uid}` document (403, both before and after the fix)
- [x] Confirmed `curated_items`/`curated_genres` reads are public; writes now correctly gated
- [x] Updated `savecraft-profile-security.md`'s security-status section to reflect this

### 2. Privacy policy & Terms of Service
✅ Drafted and live — `src/webpage/privacy-policy.html` and `src/webpage/terms-of-service.html`,
linked from the Profile page, Settings dropdown, and the Sponsored Statements footer. Follow-ups
before they're truly final:

- [x] Draft Privacy Policy page
- [x] Draft Terms of Service page
- [x] Link both from Profile page (desktop + mobile), Settings dropdown, Sponsored Statements footer
- [ ] Fill in the `[insert state/jurisdiction]` governing-law placeholder in Terms of Service
- [ ] Get both pages reviewed by someone with actual legal judgment, then remove the yellow
      "working draft" banner from each

---

## 🟡 Should fix — real gaps likely to surface fast in testing

### 3. ✅ "Forgot password" flow — done
Built via the Firebase Auth REST API's `sendOobCode` (password-reset mode) — no custom email infra.
A "Forgot password?" link on the sign-in modal triggers the reset email; the button's own text
becomes the "check your email" confirmation state rather than a separate screen. Same
email-enumeration-safe behavior as sign-in itself (doesn't reveal whether an email has an
account).

- [x] Decide on approach — Firebase Auth's built-in reset-email flow, reused the existing setup
- [x] Add a "Forgot password?" link to the sign-in modal
- [x] Wire it to trigger the reset email
- [x] Add a "check your email" confirmation state to the modal
- [x] Test the full loop end-to-end: request → email arrives → reset → sign in with new password

### 4. savecraft.org requires signing in to use at all
Unlike the extension (local-only browsing allowed), the website currently requires an account,
with only a temporary "View Demo" as a workaround.

- [ ] Decide: should savecraft.org get the extension's account-optional local browsing too, or
      stay sign-in-required for testing?
- [ ] If bringing local browsing to web: scope what that takes (platform.js's localStorage shim
      already exists, so this may mostly be gating logic in `main.js`'s `init()`)
- [ ] If staying sign-in-required: decide what "View Demo" should permanently look/feel like for
      testers
- [ ] Update `savecraft-profile-security.md` to reflect whichever decision is made

### 5. No error/usage monitoring
No Sentry, analytics, or error-tracking found anywhere in `src/`.

- [ ] Pick a tool — Firebase Analytics (free, same project, least setup) vs. Sentry vs. just
      asking testers to check the browser console
- [ ] Add the SDK/snippet
- [ ] Confirm events actually show up in the dashboard (send a real test event)
- [ ] Write testers a one-line "how to report a bug" note (e.g. what to screenshot/copy)

### 6. Spot-check the other main views on mobile
Profile alone turned up ~8 distinct mobile bugs this session despite already having its own
responsive CSS — don't assume the rest are clean without an actual look on a phone.

- [ ] Dashboard (hero, all 5 widgets including the new Admin Kanban tile)
- [ ] Queue Kanban board
- [ ] Admin Kanban board (brand new, never mobile-tested at all)
- [ ] Curated pages (landing, genre pages, Cause Curated bare list)
- [ ] Shared Saves page
- [ ] Modals — Add/Edit item, Detail modal, Auth/sign-in modal

---

## 🟢 Lower priority — worth knowing, not blocking

### 7. Cross-browser/device coverage is thin
CSS comments point to testing specifically on iPhone Safari — no evidence of other
browsers/devices.

- [ ] Test on Android Chrome
- [ ] Test on desktop Firefox
- [ ] Test on desktop Safari
- [ ] Test on desktop Chrome (sanity check, likely fine but unconfirmed)

### 8. Unresolved `games/`/`api/` deletions in the working tree
A large, accidental set of deletions has been sitting uncommitted in the broader Votecraft.org
repo (called a mistake earlier) — unrelated to SaveCraft itself, not a launch blocker, but worth
closing out.

- [ ] Confirm the deletions are actually unwanted (vs. some other intentional cleanup)
- [ ] Restore via `git restore`/`git checkout --` for `games/jokemaster`, `games/power-plays`,
      `games/scavenger-tours`, and the affected `api/*` files
- [ ] Double check nothing else in the working tree needs the same treatment

### 9. Chrome Web Store status unconfirmed
`manifest.json` is at version 1.0 — unclear if testers would install the real extension or just
visit savecraft.org.

- [ ] Check whether SaveCraft is already published (even unlisted) on the Chrome Web Store
- [ ] If not published, decide: publish unlisted, or have testers sideload manually?
- [ ] If sideloading, write brief install instructions for testers

### 10. WordPress admin bridge — staff-only, not a real-user-testing blocker
Trusted staff can now manage the Admin Kanban board directly from wp-admin instead of needing a
separate SaveCraft login. Not something real (non-team) testers would ever see or touch, but
tracked here since it's a new credential/attack surface. Full design and current status live in
`/Users/lizpasekal/.claude/plans/can-we-separtarate-the-adaptive-breeze.md`.

- [x] Phase 1 (Admin Kanban in wp-admin) — built, tested, deployed. Dedicated bot Firebase account,
      scoped by `firestore.rules` to exactly the `admin_kanban_cards` collection; browser-side
      wp-admin JS never sees any Firestore credential, only the plugin's own REST routes.
- [x] Add `VOTECRAFT_SAVECRAFT_BOT_REFRESH_TOKEN` to the real `wp-config.php`, upload/activate the
      `plugins/votecraft-savecraft-admin/` plugin ZIP — done and confirmed live 2026-08-14. One
      real gotcha hit along the way: the site's Elementor Cloud edge caching served a stale HTML
      response for the brand-new REST route on first load (looked like a broken endpoint —
      `Unexpected token '<'... is not valid JSON` — until confirmed working in an Incognito
      window). Purging the host cache, and excluding `/wp-json/*` from caching if the host
      supports it, avoids this biting the next staff member who opens the page cold.
- [ ] Confirm a non-admin WP user genuinely can't see the SaveCraft Admin menu — still outstanding,
      can't be done from outside Liz's own WordPress site.
- [ ] Phase 2 (viewing SaveCraft accounts in wp-admin) — designed, **paused**: requires switching
      the Firebase project off its free Spark plan onto Blaze (pay-as-you-go) for Cloud Functions.
      Not built. Resume by re-confirming that billing decision first.

---

## Bottom line

**#1 and the remaining #2 follow-ups are the real gate.** Everything else is normal pre-launch
polish that can happen *during* a small, trusted user test — but the sign-up link shouldn't go to
strangers until the Firestore rules are confirmed live and the legal pages have had a real review.
