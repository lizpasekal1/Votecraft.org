# SaveCraft — Project Overview

SaveCraft is a Chrome extension that acts as a personal media library. Users save links to movies, shows, music, books, games, and other content they want to experience. Curated recommendations from Votecraft are surfaced alongside personal saves, and a Kanban board ("My Saves Queue") lets users track what they've watched, read, or listened to.

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
savecraft/
├── manifest.json               — Extension config (Manifest V3)
├── background.js               — Service worker: context menus, badge, Microlink image fetch
├── content.js                  — Injected into every page; reads og:image for right-click saves
├── popup/
│   ├── popup.html              — Quick-save widget (shown when clicking toolbar icon)
│   ├── popup.css
│   └── popup.js
└── app/
    ├── index.html              — Full library page (opens as a new tab)
    ├── app.js                  — All library logic: state, rendering, storage, modals (~2500+ lines)
    └── app.css                 — All library styles
```

---

## Architecture

**Runtime:** Chrome Extension, Manifest V3. No bundler — plain HTML/CSS/JS.

**Storage:**
- `chrome.storage.sync` — user's personal saves, folders, authors, settings, Kanban config (syncs across the user's Chrome devices automatically, up to ~100KB total)
- `chrome.storage.local` — curated item image cache (larger, device-only)
- Firestore (read-only) — curated item data fetched at startup via a direct REST call to the `curated_items` collection

**No build step.** Editing a `.js` or `.css` file and refreshing the extension in `chrome://extensions` is all that's needed to see changes.

---

## Categories

Categories use **singular names** in storage and the Add Item dropdown, and **plural names** in the sidebar:

| Storage / dropdown value | Sidebar label |
|--------------------------|---------------|
| Book | Books |
| Game | Games |
| Movie | Movies |
| Musician | Musicians |
| Music Album | *(hidden — accessed via subfolder)* |
| Show | Shows |
| Visual Art | Visual Art |

The `Music Album` category is not shown as a top-level sidebar entry. Instead, a permanent **Music Albums** subfolder appears under **Musicians** in the sidebar.

---

## Key Features

### Quick-Save Popup
Clicking the toolbar icon opens a small popup where the user can paste a URL and pick a category. The item is saved to `chrome.storage.sync` immediately.

### Right-Click Context Menu
Right-clicking any page or link shows **Save to SaveCraft → [category]**. The service worker (`background.js`) reads `og:image` from the page via the content script and saves the item automatically.

### Full Library (`app/index.html`)
Opens as a new tab. Contains:
- **Left sidebar** — category navigation plus a "My Saves Queue" entry that switches to the Kanban view. Musicians has a permanent Music Albums subfolder.
- **Main grid** — responsive card grid of saved items with cover images, filtered by the selected category/search
- **Curated section** — when a user is browsing a category, Votecraft-curated recommendations are shown below personal saves (fetched from Firestore, read-only)
- **Kanban board** — "My Saves Queue" view with four columns: In Queue, In Progress, My Review, Done

### Author / Artist Profile Pages
Every author name on a card or in a detail modal is a clickable link. Clicking it navigates to a dedicated **author profile page** for that person within that category:

- **Profile header** — photo, name, bio, website link, Edit Profile button
- **Works grid** — all saved items by that author in that category. For **Musician** profiles, Music Album items by the same artist are also shown.
- **Edit Profile modal** — lets the user set a photo URL, bio, and website for the author
- Author profiles are stored in `chrome.storage.sync` under keys `author_<id>`
- Navigating to an author auto-creates a stub profile if one doesn't exist yet
- The URL view format is `author:<category>:<name>` (e.g. `author:Musician:Gorillaz`)

### Fetch Albums (iTunes Integration)
On a **Musician** author profile page, a **Fetch Albums** button queries the iTunes Search API and presents a selectable list of that artist's albums to bulk-import as Music Album items.

**Fetch Albums modal controls:**
- **Exact artist / Any mention** toggle — filters results to albums where the primary artist exactly matches, vs. any album that mentions the name (features, collaborations)
- **Include singles** checkbox — unchecked by default; check to also show singles and EPs. Singles are detected by title pattern (`- Single`, `- EP`) since iTunes doesn't set `collectionType` reliably.
- **Deselect all / Select all** link — bulk-toggle all checkboxes
- Albums already saved are shown faded and disabled ("Already saved")
- Each imported album is created as a `Music Album` item with cover art (600×600), iTunes URL, and genre (stored in Notes)

### iTunes Autosuggest (Add Modal)
When adding a new item with category **Music Album**, typing in the Author field triggers a live iTunes search (debounced 600ms). A dropdown appears below showing matching albums with cover art, artist name, and year. Clicking a suggestion auto-fills:
- **Title** (if the field is empty)
- **Image URL** (if empty) — 600×600 cover art
- **URL** (if empty) — iTunes album page

### Curated vs. Personal Items
- **Curated items** (from Firestore) have IDs prefixed with `cur-`. They are read-only.
- Users can **bookmark** a curated item to save a personal copy. Once saved, they can add notes, edit, and delete it.
- Dismissing a curated item from the grid hides it permanently in that category.

### Item Detail Modal
Clicking a card opens a detail modal showing cover image, bookmark toggle, title, summary, author (clickable → author page), platform tags, notes, and queue status controls.

### Add / Edit Modal
- **Author** field (wider, first) + **Title** field side by side
- iTunes autosuggest dropdown appears for Music Album category when author is typed
- Summary, My Notes, Platforms
- Image URL + URL side by side at the bottom
- Category dropdown (singular names, no icons)

### Search & Sort
The search bar and sort dropdown in the header filter both the grid view and the Kanban board in real time.

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
  category: string,        // singular: 'Book', 'Musician', 'Music Album', etc.
  platforms: string[] | null,
  savedAt: number,
  queueStatus: 'in-queue' | 'in-progress' | 'my-review' | 'done' | null,
  folderId: string | null,
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
}
```

### Other `chrome.storage.sync` keys
| Key | Contents |
|-----|----------|
| `savecraft_view` | Last active view (restored on open) |
| `savecraft_kanban_sort` | Per-column sort preferences |
| `savecraft_kanban_lists` | Kanban column definitions |
| `savecraft_hidden_curated` | Array of curated IDs the user has dismissed |
| `savecraft_curated_overrides` | User edits to curated items (notes, etc.) |

---

## External APIs

| API | Used for | Auth required |
|-----|----------|---------------|
| iTunes Search API (`itunes.apple.com`) | Fetch Albums modal, Add modal autosuggest | None — free, public |
| Microlink (`api.microlink.io`) | Fetch og:image for right-click saves | None |
| Firestore REST | Curated item data | None (read-only public collection) |

Both `itunes.apple.com` and `api.microlink.io` are declared in `manifest.json` under `host_permissions`.

---

## Development Tips

- The extension page URL is `chrome-extension://<extension-id>/app/index.html`. Open DevTools on it like any webpage (F12 while the library tab is active).
- To inspect the background service worker: go to `chrome://extensions` → find SaveCraft → click **"service worker"** link.
- To wipe all saved data during testing: open the library → DevTools console → `chrome.storage.sync.clear()` then reload.
- Curated data is cached in `chrome.storage.local`. To force a fresh fetch: `chrome.storage.local.clear()` then reload.

---

## Roadmap

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | ✅ Active | Core extension — personal saves, curated recommendations, Kanban, author pages, iTunes integration |
| Phase 2 | Planned | Spotify integration for Musician/Music Album auto-population |
| Phase 3 | Planned | Sharing with contacts (requires Firebase Auth + Firestore write access) |
| Phase 4 | Planned | AI recommendations (requires Claude API via Firebase Function) |
| Chrome Web Store | Future | One-time $5 developer fee; publish when Phase 1 is stable |
