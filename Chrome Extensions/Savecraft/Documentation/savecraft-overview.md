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
├── app/
│   ├── index.html              — Full library page (opens as a new tab)
│   ├── app.js                  — All library logic: state, rendering, storage, modals (~2700+ lines)
│   └── app.css                 — All library styles
└── Documentation/
    ├── savecraft-overview.md   — This file
    └── session-context.md      — Technical reference for AI assistants
```

---

## Architecture

**Runtime:** Chrome Extension, Manifest V3. No bundler — plain HTML/CSS/JS.

**Storage:**
- `chrome.storage.sync` — user's personal saves, folders, authors, settings, Kanban config (syncs across the user's Chrome devices automatically, up to ~100KB total)
- `chrome.storage.local` — curated item cache (larger, device-only; 24-hour TTL)
- Firestore (read-only at runtime) — curated item data fetched at startup via REST from the `curated_items` collection in project `votecraft-789`

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

The `Music Album` category is not shown as a top-level sidebar entry. Instead, a permanent **Music Albums** subfolder appears under **Musicians** in the sidebar. This subfolder also works in Curated SaveCraft mode, navigating to the curated music album list for the selected genre.

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
- **Curated SaveCraft** — a separate sidebar mode surfacing Votecraft-curated recommendations from Firestore, organized by genre and category
- **Kanban board** — "My Saves Queue" view with four columns: In Queue, In Progress, My Review, Done

### Author / Artist Profile Pages
Every author name on a card or in a detail modal is a clickable link. Clicking it navigates to a dedicated **author profile page** for that person within that category:

- **Profile header** — photo, name, bio, website link, Edit Profile button
- **Works grid** — all saved items by that author in that category. For **Musician** profiles, Music Album items by the same artist are also shown — including curated albums from Firestore where the artist name matches.
- **Edit Profile modal** — lets the user set a photo URL, bio, and website for the author
- Author profiles are stored in `chrome.storage.sync` under keys `author_<id>`
- Navigating to an author auto-creates a stub profile if one doesn't exist yet
- The URL view format is `author:<category>:<name>` (e.g. `author:Musician:Gorillaz`)

### Auto-Save Musician
When a user queues or saves any **Music Album** item for the first time, the artist is automatically added to their **Musicians** saves. The `autoSaveMusician()` function pulls the artist's iTunes URL and cover art from the curated Firestore data if available.

### Fetch Albums (iTunes Integration)
On a **Musician** author profile page, a **Fetch Albums** button queries the iTunes Search API and presents a selectable list of that artist's albums to bulk-import as Music Album items.

**Fetch Albums modal controls:**
- **Exact artist / Any mention** toggle — filters results to albums where the primary artist exactly matches, vs. any album that mentions the name (features, collaborations)
- **Include singles** checkbox — unchecked by default; check to also show singles and EPs. Singles are detected by title pattern (`- Single`, `- EP`) since iTunes doesn't set `collectionType` reliably.
- **Deselect all / Select all** link — bulk-toggle all checkboxes
- Albums already saved are shown faded and disabled ("Already saved")
- Each imported album is created as a `Music Album` item with cover art (600×600), iTunes URL, and genre (stored in Notes)

### iTunes Autosuggest (Add Modal)
When adding a new item with category **Music Album**, typing in the Author field triggers a live iTunes search (debounced 600ms). A dropdown appears below showing matching albums with cover art, artist name, and year. Clicking a suggestion auto-fills Title, Image URL, and URL if those fields are currently empty.

### Curated SaveCraft
A separate browsing mode (toggled via the sidebar options menu) that surfaces Votecraft-curated recommendations from Firestore:

- **Genre picker** — genres like Top 100, Classic, Jazz, Pop, etc.
- **Category drilldown** — clicking a genre shows categories; clicking a category shows curated items
- **Musicians** — 100 top artists (from iTunes charts), each card's name links to their author profile page
- **Music Albums** — 2,444 albums from those artists, each showing the artist name as a clickable link; the Music Albums subfolder under Musicians navigates to this view
- **Clicking a musician card** opens the detail popup; clicking the musician's name navigates to their profile
- **Curated cache** — data is cached in `chrome.storage.local` for 24 hours; cache is versioned so bumping `_CURATED_CACHE_VERSION` in `app.js` forces a fresh fetch

### Item Detail Modal
Clicking a card opens a detail modal showing cover image, title, author link (clickable → author page), platform tags, notes, and queue status controls.

**Musician and Music Album modals** share a distinct accordion-based layout, different from every other category:
- **Image** — 16:9 cropped cover (object-fit: cover). Musicians show a "Promo Vid" toggle (fetches a YouTube Data API-backed music video for the artist, filtered to the Music category) that swaps the photo for an inline video player; Music Albums show a "Full Album Art ▶" button that opens the full uncropped cover art in a lightbox.
- **Header overlay** — an "Official Website" pill (auto-discovered via MusicBrainz → Wikidata, cached per artist) overlays the top of the image for both categories.
- **Title area** — Musicians show their name with a clickable arrow to their author page. Music Albums show a bold "Artist | Year" line (in the brand purple) above the album title.
- **Accordion rows** (icon + label + chevron, mutually exclusive — opening one closes the others): **My Notes** (live-editable textarea, debounced auto-save), **Albums** (Musician-only — the artist's known albums, capped at 5 with a "See all →" link to their profile), **Song List** (Music Album-only — the album's tracks, lazily fetched via the iTunes lookup API on first expand using the item's `collectionId`; a one-time backfill resolves `collectionId`/`year` for older items that predate this field), and **Web Links**.
- **Add to Queue** — a standalone pill button below the accordion stack (rather than sharing a header row with Web Links, as other categories do).
- **Bookmark / Favorite** — the save/bookmark icon lives inside the "Add to Queue" button for Musicians (top-right corner is reserved for a Favorite star instead); other categories keep the bookmark as a separate top-right circular button. Favoriting a Musician adds it to an auto-created "Favorites" folder for that category in the sidebar (the folder is removed again once nothing in it remains favorited).

For curated albums, the artist name is a clickable link in the title area (unless already on that artist's own page).

### Add / Edit Modal
- **Author** field (wider, first) + **Title** field side by side
- iTunes autosuggest dropdown appears for Music Album category when author is typed
- Summary, My Notes, Platforms
- Image URL + URL side by side at the bottom
- Category dropdown (singular names, no icons)

### Search & Sort
The search bar and sort dropdown in the header filter both the grid view and the Kanban board in real time. Sort options: Newest/Oldest first (by save date), A → Z / Z → A (title), and Release Date (Newest/Oldest) — the latter two sort by an item's `year` field (populated for Music Albums via Fetch Albums import or the auto-backfill).

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
  genre: string | null,    // Music Album only; not currently rendered anywhere
  year: string | null,     // Music Album only; 4-digit release year
  collectionId: number | null, // Music Album only; iTunes collection ID, used to fetch the Song List
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

### Curated Item (Firestore `curated_items` document)
```js
{
  id: string,          // 'itunes_<collectionId>' or 'artist_itunes_<artistId>' or 'cur-*'
  title: string,
  category: string,    // stored as plural in Firestore ('Movies', 'Music Album'), normalized on load
  genre: string,       // e.g. 'Top 100', 'Classic', 'Jazz'
  url: string | null,
  imageUrl: string | null,
  notes: string | null, // for Music Album entries: the artist name
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
| iTunes Search/Lookup API (`itunes.apple.com`) | Fetch Albums modal, Add modal autosuggest, curated data population, artist photo fallback, album year/collectionId backfill, Song List track lookup | None — free, public |
| Microlink (`api.microlink.io`) | Fetch og:image for right-click saves | None |
| Firestore REST (`firestore.googleapis.com`) | Curated item data (read-only at runtime) | None for reads; Firebase Auth required for writes |
| MusicBrainz (`musicbrainz.org`) → Wikidata (`www.wikidata.org`) | Resolving a Musician's official website | None — free, public |
| Wikipedia (`en.wikipedia.org`) | Artist bio/photo fallback | None — free, public |
| YouTube Data API v3 (`www.googleapis.com`) | Promo Vid search (Musician modal), filtered to the Music category | API key (`YOUTUBE_API_KEY` in `app.js`) — falls back to opening a YouTube search in a new tab if unset |

All of the above are declared in `manifest.json` under `host_permissions`. YouTube video embeds additionally rely on a `declarativeNetRequestWithHostAccess` rule (`rules/youtube_referer_rules.json`) that sets the `Referer` header the embedded player requires, since extension pages don't send one natively.

---

## Development Tips

- The extension page URL is `chrome-extension://<extension-id>/app/index.html`. Open DevTools on it like any webpage (F12 while the library tab is active).
- To inspect the background service worker: go to `chrome://extensions` → find SaveCraft → click **"service worker"** link.
- To wipe all saved data during testing: open the library → DevTools console → `chrome.storage.sync.clear()` then reload.
- Curated data is cached in `chrome.storage.local`. To force a fresh fetch from Firestore, bump `_CURATED_CACHE_VERSION` in `app.js` and refresh the extension.
- Firestore writes (for populating curated data) require temporarily setting `allow write: if true` on the `curated_items` rule in Firebase Console → Firestore → Rules. Always revert after.

---

## Roadmap

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | ✅ Active | Core extension — personal saves, curated recommendations, Kanban, author pages, iTunes integration |
| Phase 2 | Planned | Spotify integration for Musician/Music Album richer artist data (photos, full discography) |
| Phase 3 | Planned | Sharing with contacts (requires Firebase Auth + Firestore write access) |
| Phase 4 | Planned | AI recommendations (requires Claude API via Firebase Function) |
| Chrome Web Store | Future | One-time $5 developer fee; publish when Phase 1 is stable |
