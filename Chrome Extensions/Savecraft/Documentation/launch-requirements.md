# SaveCraft — Launch Requirements for User Testing

A working to-do list of what's outstanding before inviting real (non-team) users to test
savecraft.org and/or the Chrome extension. Grounded in a review of the codebase — re-check items
against the code before assuming they're still accurate, especially anything unconfirmed. Each
top-level item is broken into smaller steps; check them off as you go.

Organized by how much each item actually blocks a safe, usable test.

---

## 🔴 Blockers — fix before any real user's data touches this

### 1. Confirm Firestore security rules are deployed live
The rules file (`~/Documents/Votecraft.org/firebase/firestore.rules`, shared across Votecraft.org
projects) looks correct as written — but no one has confirmed it's actually the *live* ruleset on
`votecraft-789`, vs. just sitting in the repo. This is the single most important thing standing
between "your data" and "everyone's data."

- [ ] Open console.firebase.google.com → `votecraft-789` → Firestore → Rules, and compare what's
      live against the local `firestore.rules` file
- [ ] If they don't match (or nothing's deployed), run
      `firebase deploy --only firestore:rules --project votecraft-789`
- [ ] Manually verify: signed in as one test account, confirm you *cannot* read/write another
      account's `savecraft_users/{uid}` document
- [ ] Confirm `curated_items`/`curated_genres` are still public-read but write-denied
- [ ] Update `savecraft-profile-security.md`'s "One thing to actually do" section once confirmed

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

### 3. No "forgot password" flow
Confirmed absent in `src/app/js/auth.js`. A forgotten password is currently a dead end for
self-serve testers.

- [ ] Decide on approach — Firebase Auth's built-in `sendPasswordResetEmail` is the simplest fit
      (reuses the existing Firebase Auth setup, no custom email infra needed)
- [ ] Add a "Forgot password?" link to the sign-in modal
- [ ] Wire it to trigger the reset email
- [ ] Add a "check your email" confirmation state to the modal
- [ ] Test the full loop end-to-end: request → email arrives → reset → sign in with new password

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

---

## Bottom line

**#1 and the remaining #2 follow-ups are the real gate.** Everything else is normal pre-launch
polish that can happen *during* a small, trusted user test — but the sign-up link shouldn't go to
strangers until the Firestore rules are confirmed live and the legal pages have had a real review.
