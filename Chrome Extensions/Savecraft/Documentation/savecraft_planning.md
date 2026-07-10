# SaveCraft — Chrome Extension

A personal media library. Save links to movies, shows, music, books, and games you want to experience. Inspired by Google Keep.

---

## Current Phase: Phase 1 — Core Extension

**Storage:** Chrome's built-in `chrome.storage.sync` for personal saves/folders/authors (free, zero setup, auto-syncs across your own Chrome devices), plus `chrome.storage.local` as a device-only cache.

**Firestore is already in use** — read-only, for Votecraft-curated recommendations (the `curated_items` collection in the `votecraft-789` project, fetched at startup and cached locally for 24 hours). This predates and is separate from Phase 2 below: Phase 2 needs Firebase *Auth* plus *write* access to Firestore (for sharing), neither of which exist yet.

---

## File Structure

> This section reflects the current layout — updated after a later reorganization into a `src/` tree with the library code split into ES modules. See `savecraft-overview.md` for full details.

```
Savecraft/
├── manifest.json               ← extension config (must stay at extension root)
├── images/logos/                ← Rolling Stone / Steam / NYT attribution logos
├── src/
│   ├── background/background.js ← service worker (context menus, badge)
│   ├── content/content.js      ← reads og:image from pages
│   ├── popup/
│   │   ├── popup.html          ← quick save widget (click extension icon)
│   │   ├── popup.css
│   │   └── popup.js
│   ├── sponsored/sponsored.html
│   └── app/
│       ├── index.html          ← full library page (opens as new tab)
│       ├── js/                 ← library logic, 12 ES modules
│       └── css/                ← library styles, split by feature area
└── Documentation/
    ├── savecraft_planning.md   ← this file
    ├── savecraft-overview.md
    └── session-context.md
```

---

## How to Test Locally

1. Go to `chrome://extensions`
2. Toggle **Developer mode** ON (top right)
3. Click **Load unpacked**
4. Select this `savecraft/` folder
5. Extension appears in toolbar — click it to open the quick save popup
6. To view the full library: click "Open Library →" in the popup
7. After editing any file: click the **refresh ↺ icon** on the extension card in `chrome://extensions`

---

## Features (Phase 1)

- [x] Right-click any page → Save to SaveCraft → pick category
- [x] Popup quick-save with category picker
- [x] Full library page (Google Keep style)
- [x] Left sidebar: Music, Shows, Books, Movies, Games
- [x] Custom subfolders under each category
- [x] 2-column card grid with featured images (og:image)
- [x] Fallback colored placeholder cards when no image
- [x] Sort: Newest, Oldest, A→Z, Z→A
- [x] Search
- [x] Mark items as done (greyed out + strikethrough)
- [x] Delete items
- [ ] Sharing with contacts (Phase 2 — requires Firebase)
- [ ] AI recommendations (Phase 3 — requires Claude API)

---

## Featured Images

- **Right-click save on current page**: `content.js` reads `og:image` from the page DOM
- **Manual URL entry in popup/library**: Calls [Microlink API](https://api.microlink.io) (free, 100 req/day) to fetch the og:image for any URL
- **Fallback**: Colored gradient card with the first letter of the domain

---

## Phase 2 (Future) — Sharing with Contacts

The Firebase project (`votecraft-789`) already exists and Firestore is already read from at runtime (see above) — what's missing for sharing is *write* access and *auth*:
1. Enable Google Auth on the existing Firebase project
2. Add write rules to the `curated_items`/new share-related collections (currently locked down — read-only)
3. Add Firebase Auth + write-capable Firestore config to a new `src/app/js/firebase.js` module
4. Deploy Firebase Functions for the share API

Cost: Free tier handles small-to-medium use.

---

## Phase 3 (Future) — AI Recommendations

Requires Claude API key (via Firebase Function so the key stays private).
Cost: ~$0.01–0.05 per request.

---

## Chrome Web Store Launch

- One-time $5 developer account fee
- Extension hosting on the Web Store is free
- Publish when Phase 1 feels solid
