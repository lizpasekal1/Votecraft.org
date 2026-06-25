# SaveCraft — Session Context for AI

This file helps Claude (or any AI assistant) quickly regain context on the SaveCraft project without re-reading the full codebase.

---

## File Locations

| What | Path |
|------|------|
| Chrome extension source | `/Users/lizpasekal/Documents/Votecraft.org/Chrome Extensions/Savecraft/` |
| Manifest | `…/Savecraft/manifest.json` |
| Main library page | `…/Savecraft/app/index.html` |
| All library logic | `…/Savecraft/app/app.js` (~2500+ lines) |
| All library styles | `…/Savecraft/app/app.css` |
| Votecraft.org docs | `/Users/lizpasekal/Documents/Votecraft.org/savecraft/Documentation/` |

Always edit source code in `Votecraft.org/Chrome Extensions/Savecraft/`. Docs go in `Votecraft.org/savecraft/Documentation/`.

---

## Categories

```js
const CATEGORIES = ['Book', 'Game', 'Movie', 'Musician', 'Music Album', 'Show', 'Visual Art'];

const CAT_LABEL = {
  'Book': 'Books', 'Game': 'Games', 'Movie': 'Movies',
  'Musician': 'Musicians', 'Music Album': 'Music Albums',
  'Show': 'Shows', 'Visual Art': 'Visual Art',
};
```

- **Singular** values used in storage and the Add Item dropdown
- **CAT_LABEL** values used in the sidebar and grid title
- `Music Album` is **filtered out of the sidebar** category list — it appears only as a permanent hardcoded subfolder under `Musician` in the sidebar
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
  // ...curated state, kanban state, etc.
}
```

---

## View Routing

`state.view` drives what `renderGrid()` shows:

| Value | Shows |
|-------|-------|
| `'All'` | All items |
| `'Music Album'` | Items with category === 'Music Album' |
| `'Musician'` | Items with category === 'Musician' |
| `'<folder-id>'` | Items in that folder |
| `'author:Musician:Gorillaz'` | Author page for Gorillaz (Musician category) |
| `'genre:<name>'` | Curated genre view |

`renderGrid()` early-returns to `renderAuthorPage()` when `state.view.startsWith('author:')`.

For `author:Musician:X` views, `getFilteredSortedItems()` returns both `Musician` AND `Music Album` items by that author — so a musician's albums show on their profile page.

---

## Author / Artist Profile System

### Key functions
- `navigateToAuthor(name, category)` — sets `state.view = 'author:<category>:<name>'`, auto-creates stub profile if none exists
- `findAuthor(name, category)` — looks up by exact name + category match (case-sensitive by design)
- `persistAuthor(author)` — saves to `chrome.storage.sync` as `author_<id>`
- `renderAuthorPage()` — renders full author page into `#cards-grid`
- `openAuthorEditModal(name, category)` — opens the Edit Profile modal
- `handleSaveAuthor()` — saves profile changes

### Author page structure
- Back button in `#grid-title` → returns to category view
- Header: photo, name, bio, website, action buttons
- For `Musician` category: **Fetch Albums** button appears next to Edit Profile
- Works grid: all items by this author (includes Music Albums for Musician pages)

### Author name is immutable
Name is the lookup key. Changing it in the edit modal is intentionally blocked — it would break the link to all items. Users rename by editing items individually.

---

## iTunes Integration

### Host permission
`itunes.apple.com` is declared in `manifest.json` `host_permissions`. Required for all iTunes fetch calls.

### Fetch Albums (author page)
`openFetchAlbumsModal(artistName)` — opens modal, calls `fetchAlbumsFromItunes()`, renders results.

`renderFetchAlbumsList(allAlbums, artistName, mode, hideSingles)`:
- `mode: 'exact'` — filters to `artist.toLowerCase() === artistName.toLowerCase()`
- `mode: 'any'` — shows all iTunes results
- `hideSingles: true` — filters out items matching `/ - (single|ep)$/i` in title OR `type === 'Single'`
- Singles/EPs default to **unchecked**; proper albums default to **checked**
- Already-saved albums are disabled

`handleImportAlbums()` — creates `Music Album` items from checked results. Each gets title, author, imageUrl (600×600), url, and genre (in notes field).

### Add Modal Autosuggest
When category is `Music Album` and the author field has 2+ chars, a debounced (600ms) iTunes search runs and shows a dropdown of matching albums. Clicking a suggestion fills title, imageUrl, and url (only if those fields are currently empty).

Key functions: `handleAuthorItunesLookup()`, `showItunesSuggestions()`, `hideItunesSuggestions()`, `applyItunesSuggestion()`.

Note: `debounce(fn, ms)` utility is defined near these functions.

---

## Sidebar Structure

`renderSidebar()` iterates `CATEGORIES.filter(cat => cat !== 'Music Album')` — so Music Album is never a top-level sidebar entry.

For the `Musician` category specifically, a **permanent hardcoded subfolder** is injected before user-created subfolders:
```js
const permanentSubfolders = cat === 'Musician' ? `
  <div class="sidebar-item sidebar-subfolder ..." data-view="Music Album" data-permanent="true">
    [Music Albums icon] Music Albums
  </div>
` : '';
```
Clicking it sets `state.view = 'Music Album'` (shows all Music Album items).

---

## Key Architectural Patterns

### Curated vs. Personal Items
- **Curated items** are fetched from Firestore at startup. IDs are prefixed `cur-`. They are **read-only**.
- `state.hiddenCurated` — Set of curated IDs the user has dismissed.
- `state.curatedOverrides` — User edits to curated items (notes, etc.) stored separately.
- When a user **bookmarks** a curated item, `ensureLiveItem()` clones it into `state.items` with its original `cur-` ID. Trash logic must check `state.items.find(i => i.id === id)` before deciding hide vs. delete.

### `chrome.storage.onChanged`
Handles `item_`, `folder_`, and `author_` key prefixes. Guards against double-adding items:
```js
if (!state.items.find(i => `item_${i.id}` === key)) state.items.unshift(newValue);
```

### Bookmark / Save Logic
- Bookmark outline = not in personal list. Filled = saved.
- Tapping **Add to Queue** auto-saves (calls `ensureLiveItem()` then sets `queueStatus`).
- Edit button in detail modal hidden for unsaved curated items.

---

## Known Open Issues

### Header Alignment Bug (unresolved)
The left edge of **"+ Add Item"** and **"ALL QUEUES"** are visually misaligned. Multiple CSS attempts haven't fixed it. Needs live DOM inspection via DevTools.

---

## Planned But Not Yet Built

### Spotify Integration
Phase 2 of iTunes integration. Will add Spotify OAuth for richer artist data (artist photos, full discography). Requires a backend or Chrome extension OAuth flow. The iTunes path is already established — Spotify would augment it.

### Kanban Search & Tutorial Banner
Plan saved at: `/Users/lizpasekal/.claude/plans/on-the-main-my-nifty-rain.md`
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

No build step — changes are live after reload.
