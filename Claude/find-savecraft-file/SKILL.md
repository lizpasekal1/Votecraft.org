---
name: find-savecraft-file
description: Locates the correct live JS/CSS file for a SaveCraft feature (e.g. "where's the kanban search bar styled/handled?"). Use whenever editing SaveCraft UI or behavior, to avoid editing dead/orphaned files.
---

## Context

SaveCraft lives at `Extensions/Savecraft/` inside this Votecraft.org folder.

`src/app/app.js` and `src/app/app.css` are **ORPHANED/DEAD FILES** — `index.html` never
loads them. Editing them has no visible effect. Real logic and styles are split across:

- JS: `src/app/js/*.js` — one file per feature area: main.js, detailModal.js,
  addEditModal.js, kanban.js, dashboard.js, profile.js, render.js, share.js,
  sharedSaves.js, state.js, storage.js, utils.js, authors.js, api.js, auth.js,
  fetchAlbumsModal.js, curatedCreatorData.js, curatedCreatorLookup.js
- CSS: `src/app/css/*.css`, loaded in this order from index.html: base.css,
  sidebar.css, cards.css, detailModal.css, addEditModal.css, fetchAlbumsModal.css,
  kanban.css, dashboard.css, profile.css, sharedSaves.css, misc.css

Other source folders: `src/popup/` (popup.html/js/css), `src/background/background.js`,
`src/content/content.js`, `src/sponsored/` (sponsored.html/js).

## Instructions

When asked where a feature/class/function lives, or before editing SaveCraft UI/behavior:

1. Grep for the class name, function name, or feature keyword across
   `Extensions/Savecraft/src/app/js/` and `Extensions/Savecraft/src/app/css/`
   (and `src/popup/`, `src/background/`, `src/content/`, `src/sponsored/` if not found).
2. **Never** treat a hit in `app.js` or `app.css` as live — confirm the real file by
   checking that `index.html` (or the relevant popup/background/content HTML) actually
   `<script>`s or `<link>`s it.
3. Report the specific file:line to the user before making changes there.

Documentation for SaveCraft lives at
`Extensions/Savecraft/Documentation/` — check there for anything not obvious
from code alone.
