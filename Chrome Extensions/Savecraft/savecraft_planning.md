# SaveCraft — Chrome Extension

A personal media library. Save links to movies, shows, music, books, and games you want to experience. Inspired by Google Keep.

---

## Current Phase: Phase 1 — Core Extension (No Backend)

**Storage:** Chrome's built-in `chrome.storage.sync` (free, zero setup, auto-syncs across your own Chrome devices)

**No Firebase needed yet** — Firebase is only required when adding sharing with other users (Phase 2).

---

## File Structure

```
savecraft/
├── savecraft_planning.md       ← this file
├── manifest.json               ← extension config
├── background.js               ← service worker (context menus, badge)
├── content.js                  ← reads og:image from pages
├── popup/
│   ├── popup.html              ← quick save widget (click extension icon)
│   ├── popup.css
│   └── popup.js
└── app/
    ├── index.html              ← full library page (opens as new tab)
    ├── app.css
    └── app.js
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

Requires setting up Firebase:
1. Create project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Firestore + Google Auth
3. Add Firebase config to `app/firebase.js`
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
