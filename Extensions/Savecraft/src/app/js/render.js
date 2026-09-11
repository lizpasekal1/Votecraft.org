// ===== RENDER BARREL =====
// This used to be one ~1,486-line file. It's now split by concern into renderFilters.js,
// renderSidebar.js, renderCuratedImageFetch.js, renderGrid.js, renderAuthorPage.js,
// renderCuratedPages.js, and renderCardActions.js (see each for its own contents) — this file
// just re-exports the subset those other modules' external consumers actually import, so no
// other file's `from './render.js'` import line needs to change.

export { getFilteredSortedItems } from './renderFilters.js';
export { renderSidebar, promptAddFolder, collapseAllSidebarSections } from './renderSidebar.js';
export { renderGrid, renderCard } from './renderGrid.js';
export { renderAuthorPage } from './renderAuthorPage.js';
export { resolveOrgImageUrl } from './renderCuratedPages.js';
