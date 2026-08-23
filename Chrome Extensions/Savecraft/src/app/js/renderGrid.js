// ===== MAIN GRID + CARD RENDERING =====

import {
  state, CURATED_ITEMS, CATEGORIES, CAT_LABEL, CAT_EMOJI, CURATED_NOTES_CATEGORIES,
  CREATOR_CARD_CATEGORY, BOOKMARK_OUTLINE_SVG, BOOKMARK_FILLED_SVG, CURATED_GENRE_LANDING_CONTENT,
  MUSIC_GENRE_BUCKETS, MUSIC_GENRE_BUCKET_EMOJI, MUSIC_ALL_LABEL, PRIMARY_FOLDER_ID,
} from './state.js';
import {
  escapeHtml, catClass, badgeLabel, isMusicAlbumsSectionView, isOwnAuthorPageView, getDomain,
  isAdminUser, folderIconHtml,
} from './utils.js';
import { persistViewState, persistItem, persistHiddenCurated, removeItem } from './storage.js';
import { navigateToView } from './navigation.js';
import { getCurrentUser } from './auth.js';
import { wireCardAuthorLinks, backfillMusicianGenres, tagsForMusicGenreBucket, findAuthor } from './authors.js';
import { renderKanbanBoard } from './kanban.js';
import { renderAdminKanbanBoard } from './adminKanban.js';
import { openDetailModal } from './detailModal.js';
import { openEditModal } from './addEditModal.js';
import { renderDashboard } from './dashboard.js';
import { renderProfilePage } from './profile.js';
import { renderSharedSavesPage } from './sharedSaves.js';
import { renderAboutPage } from './about.js';
import { renderEmbedBuilder } from './embedBuilder.js';
import { renderSidebar } from './renderSidebar.js';
import { renderAuthorPage } from './renderAuthorPage.js';
import { renderCuratedGenreLanding, renderCuratedDirectory, renderCuratedBareList } from './renderCuratedPages.js';
import { wireQuickQueueButtons } from './renderCardActions.js';
import { fetchMissingCuratedImages, fetchMissingCuratedMusicianPhotos } from './renderCuratedImageFetch.js';
import { getFilteredSortedItems, getMusicGenreBucketCounts, getCategoryFolderCounts } from './renderFilters.js';
import { updateAzIndexRail } from './azIndexRail.js';
import { resourceUrl } from './platform.js';

// News cards' publication byline is folder-based, not author-based, so it doesn't go through
// navigateToAuthor/wireCardAuthorLinks — it just navigates straight to the outlet's existing
// folder view (same routing a sidebar folder click already uses).
function wirePublicationLinks(container) {
  container.querySelectorAll('.card-publication-link').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      navigateToView(btn.dataset.folderId);
    });
  });
}

// Thin wrapper around the real render (below) — every view branch inside it has its own early
// `return`, so rather than thread a "did we just render a flat card list" flag through each one,
// the A-Z index rail (azIndexRail.js) just inspects the DOM afterward and shows/hides itself
// based on what actually got rendered, same generic approach regardless of which branch ran.
export function renderGrid() {
  _renderGridBody();
  updateAzIndexRail();
}

function _renderGridBody() {
  const container = document.getElementById('cards-grid');
  const gridTitle = document.getElementById('grid-title');

  // The Top 100 landing page (renderCuratedGenreLanding() below) physically relocates the real
  // #sort-select node into its own content, below the hero — safe to do since it's the same
  // singleton element (not cloned, so main.js's existing change listener keeps working
  // regardless of where it sits), but it means every render needs to put it back in its normal
  // .grid-header-right home FIRST, before any view (including a plain container.innerHTML= wipe)
  // could otherwise destroy it as an orphaned child of #cards-grid. .grid-header-right (not
  // .grid-header directly) since the Music landing page's #musicgenre-select now sits paired with
  // it there (index.html) — both need the same "always its real home first" guarantee, though only
  // #sort-select ever actually gets relocated elsewhere today.
  const sortSelect = document.getElementById('sort-select');
  const musicGenreSelect = document.getElementById('musicgenre-select');
  const gridHeader = document.querySelector('.grid-header');
  const gridHeaderRight = document.querySelector('.grid-header-right');
  if (sortSelect.parentElement !== gridHeaderRight) gridHeaderRight.appendChild(sortSelect);
  gridHeader.style.display = '';
  musicGenreSelect.style.display = 'none';
  // Default-off; renderMusiciansDropdownShell() (below) turns this back on for the one render path
  // that actually shows #musicgenre-select alongside #sort-select — see its own comment.
  gridHeaderRight.classList.remove('grid-header-right--dual');

  document.getElementById('btn-kanban-dashboard').style.display = 'none';
  document.getElementById('saves-list-wrap').style.display = 'none';
  document.getElementById('saves-list-dropdown')?.setAttribute('hidden', '');
  document.getElementById('board-filter-wrap').style.display = 'none';
  document.getElementById('board-filter-dropdown')?.setAttribute('hidden', '');
  document.getElementById('board-info-wrap').style.display = 'none';
  document.getElementById('board-info-popup')?.setAttribute('hidden', '');
  sortSelect.style.display = '';
  gridTitle.style.display = '';

  if (state.view === 'kanban') {
    renderKanbanBoard();
    return;
  }

  // isAdminUser gate here too, not just hiding the sidebar link (renderSidebar.js) — otherwise a
  // non-admin landing directly on ?v=admin-kanban (bookmarked, typed, or a stale link) would still
  // render it. Redirects to Dashboard rather than rendering nothing — navigateToView() calls back
  // into renderSidebar()/renderGrid() itself, but only once: 'dashboard' doesn't hit this branch.
  if (state.view === 'admin-kanban') {
    if (isAdminUser(getCurrentUser()?.email, state.role)) {
      renderAdminKanbanBoard();
      return;
    }
    navigateToView('dashboard', { replace: true });
    return;
  }

  if (state.view === 'dashboard') {
    renderDashboard();
    return;
  }

  if (state.view === 'profile') {
    renderProfilePage();
    return;
  }

  if (state.view === 'shared') {
    renderSharedSavesPage();
    return;
  }

  if (state.view === 'about') {
    renderAboutPage();
    return;
  }

  if (state.view === 'embed-builder') {
    renderEmbedBuilder();
    return;
  }

  if (state.view === 'all' && state.sidebarMode === 'categories') {
    renderKanbanBoard();
    return;
  }

  if (state.view.startsWith('author:')) {
    renderAuthorPage();
    return;
  }

  // Music landing page — replaces what used to be a flat A→Z Musician grid here, per direct
  // request. 'Musician' itself is deliberately kept as this exact view string (rather than
  // introducing a new root view) so navigateToView/the sidebar's own active-state check
  // (state.view === cat, renderSidebar.js) both keep working unchanged; only the one-level-deeper
  // drill-in (musicgenre:<bucket>, below) is new. The sidebar's own plain "Musicians" row
  // (data-view=<primary folder id>) is untouched — still the unfiltered, all-musicians escape
  // hatch, exactly as it works today.
  if (state.view === 'Musician') {
    renderMusicGenreLanding();
    return;
  }

  // Category folder-picker landing — every other top-level category tab (Musician/Music Album
  // excluded per direct request: "DO NOT make this change for music though. leave the cards on
  // music the way we have it") now shows its real subfolders as a picker grid instead of the
  // primary-folder+unfoldered item list directly, per direct request — the old direct-list view
  // could read as "Nothing here yet" even when the category actually had saved content, just
  // filed under a different folder than the primary one. Modeled on the Music landing page's own
  // card-grid mechanics (renderMusicGenreLanding, below) but a purple-OUTLINED style instead of
  // Music's solid-fill (.category-folder-card, cards.css), and driven by this category's actual
  // folders (state.folders) instead of a fixed bucket taxonomy. The folder some(...) check is
  // defensive — every real category has folders today, but this falls through to the normal
  // item-list rendering below instead of showing an empty grid if that ever weren't true.
  if (CATEGORIES.includes(state.view) && !['Musician', 'Music Album'].includes(state.view)
      && state.folders.some(f => f.parentCategory === state.view)) {
    renderCategoryFolderLanding(state.view);
    return;
  }

  container.className = 'cards-grid';

  // "Sources | Civics" — appended to the page's own title while browsing inside a scoped Saved
  // List, so it stays visible even on a plain category/folder page whose own name isn't the
  // list's. Purple + a real link back to that list's own landing card (savedlist:<id>), same
  // destination the sidebar's own "‹ Civics" back-button already goes to. Only the two branches
  // below that show a real category/folder page use it — genre:/author:/etc. pages never carry an
  // active list scope in the first place (navigateToView's default-clear behavior).
  const scopedListName = state.activeSavedListId
    ? state.savedLists.find(l => l.id === state.activeSavedListId)?.name
    : null;
  const scopedListSuffix = scopedListName
    ? ` <button type="button" class="grid-title-scope-link grid-title-savedlist-link">| ${escapeHtml(scopedListName)}</button>`
    : '';

  // Shared "Musicians" title + genre-dropdown shell — both the musicgenre: flat-list branch and
  // the sidebar's own plain Musicians folder page below render this exact same shell. Always shows
  // the dropdown now — REAL BUG, found and fixed: "All Music" used to reach a THIRD, dropdown-less
  // destination of its own (musicgenre:All Music, distinct from both the picker and this folder
  // page), a leftover from an earlier "hide the dropdown so this reads as unfiltered" request that
  // nobody reconciled against the folder page's later, different escape-hatch-dropdown treatment —
  // reported live as "is there a redundant extra 'musician' page or state without the dropdown?".
  // musicgenre:All Music is no longer reachable at all (see the redirect at the top of the
  // musicgenre: branch below, plus the picker card's and the dropdown's own click/change handlers),
  // so this function never needs to hide its own dropdown anymore — one shell, one behavior.
  const renderMusiciansDropdownShell = selectedBucket => {
    gridTitle.innerHTML = `${CAT_EMOJI['Musician']} Musicians${scopedListSuffix}`;
    musicGenreSelect.innerHTML = [MUSIC_ALL_LABEL, ...MUSIC_GENRE_BUCKETS]
      .map(b => `<option value="${escapeHtml(b)}"${b === selectedBucket ? ' selected' : ''}>${escapeHtml(b)}</option>`)
      .join('');
    musicGenreSelect.style.display = '';
    // Marks .grid-header-right as actually holding both selects right now — mobile CSS (misc.css)
    // keys off this to size the pair to share one row, rather than narrowing #sort-select
    // everywhere it appears just because this function ran once during the render.
    gridHeaderRight.classList.add('grid-header-right--dual');
  };

  if (state.view === 'all') {
    gridTitle.textContent = 'All Items';
  } else if (state.view.startsWith('genre:')) {
    const parts = state.view.slice(6).split(':');
    const genre = parts[0];
    const genreContent = CURATED_GENRE_LANDING_CONTENT[genre];
    // On a curated drilldown (e.g. "Top 100 Books"), just the genre word links back to that
    // genre's own landing page (genre:<genre> — see renderCuratedGenreLanding()); the category
    // name stays plain text. Styled to read as ordinary title text, not an obvious button — see
    // .grid-title-link in cards.css. Generic for any genre with its own landing content (today:
    // Top 100 and RCV) — REAL BUG, found and fixed: this used to be hardcoded to the literal
    // string 'Top 100', so a second curated list would never have gotten this same
    // breadcrumb/logo treatment at all, no matter what content it had.
    const isCuratedDrilldown = !!genreContent && parts.length === 2;
    const genreLabel = isCuratedDrilldown
      ? `<button class="grid-title-link" data-view="genre:${escapeHtml(genre)}">${escapeHtml(genre)}</button>`
      : escapeHtml(genre);
    // Title reads "<Category> | <shortName>" when this category has its own data-provenance logo
    // (categoryLogos, state.js) — same "<Category> | <thing>" pattern as the Saved List scope
    // suffix above, just pointing at this genre's own landing page instead of a saved list. The
    // publication logo sits on this same row (#grid-title is itself a flex row — see cards.css),
    // pushed to the right edge via its own margin-left: auto.
    const categoryLogo = genreContent?.categoryLogos?.[parts[1]];
    if (categoryLogo && genreContent.shortName) {
      const logoInner = categoryLogo.svg
        // The New York Times' own wordmark — no image asset for this one, so it's the one
        // genuinely bespoke piece left (an inline SVG can't be generalized into a plain <img>
        // src the way every other logo here can).
        ? `<svg viewBox="0 0 452.8 59.5" xmlns="http://www.w3.org/2000/svg" aria-label="${escapeHtml(categoryLogo.alt || '')}"><path d="M33.9,6.1c0-4.9-4.7-6.1-8.4-6.1v0.7c2.2,0,3.9,0.7,3.9,2.5c0,1-0.7,2.5-3,2.5c-1.7,0-5.4-1-8.1-2c-3.2-1.2-6.1-2.2-8.6-2.2c-4.9,0-8.4,3.7-8.4,7.9c0,3.7,2.7,4.9,3.7,5.4l0.2-0.5c-0.5-0.5-1.2-1-1.2-2.5c0-1,1-2.7,3.4-2.7c2.2,0,5.2,1,9.1,2.2c3.4,1,7.1,1.7,9.1,2v7.6l-3.7,3.2v0.2l3.7,3.2v10.6c-2,1.2-4.2,1.5-6.1,1.5c-3.7,0-6.9-1-9.6-3.9l10.1-4.9v-17L7.9,19.2c1-3.2,3.7-5.4,6.4-6.9L14,11.6c-7.4,2-14,8.9-14,17.2C0,38.6,8.1,46,17.2,46c9.8,0,16.2-7.9,16.2-16H33c-1.5,3.2-3.7,6.1-6.4,7.6V27.5l3.9-3.2v-0.2l-3.9-3.2v-7.6C30.3,13.3,33.9,10.8,33.9,6.1z M12.5,33.2l-3,1.5c-1.7-2.2-2.7-5.2-2.7-9.3c0-1.7,0-3.7,0.5-5.2l5.2-2.2V33.2z M38.6,38.9l-3.2,2.5l0.5,0.5l1.5-1.2l5.4,4.9l7.4-4.9l-0.2-0.5l-2,1.2l-2.5-2.5V22.1l2-1.5l4.2,3.4v15c0,9.3-2,10.8-6.1,12.3v0.7c6.9,0.2,13.3-2,13.3-14V21.9l2.2-1.7l-0.5-0.5l-2,1.5L52.4,16l-6.9,5.2V1H45l-8.6,5.9v0.5c1,0.5,2.5,1,2.5,3.7C38.9,11.1,38.6,38.9,38.6,38.9z M83.6,36.2l-6.1,4.7l-6.1-4.9v-3l11.6-7.9v-0.2L77,16l-12.8,6.9v16.2l-2.5,2l0.5,0.5l2.2-1.7l8.4,6.1l11.1-8.9C83.9,37.1,83.6,36.2,83.6,36.2z M71.3,32V19.9l0.5-0.2l5.4,8.6C77.2,28.3,71.3,32,71.3,32z M130.6,3.9c0-0.7-0.2-1.5-0.5-2.2h-0.5c-0.7,2-1.7,3-4.2,3c-2.2,0-3.7-1.2-4.7-2.2l-7.1,8.1l0.5,0.5l2.5-2.2c1.5,1.2,2.7,2.2,6.1,2.5v20.4L108.2,6.9c-1.2-2-3-4.7-6.4-4.7c-3.9,0-7.4,3.4-6.9,8.9h0.7c0.2-1.5,1-3.2,2.7-3.2c1.2,0,2.5,1.2,3.2,2.5v8.1c-4.4,0-7.4,2-7.4,5.7c0,2,1,4.9,3.9,5.7v-0.5c-0.5-0.5-0.7-1-0.7-1.7c0-1.2,1-2.2,2.7-2.2h1.2v10.3c-5.2,0-9.3,3-9.3,7.9c0,4.7,3.9,6.9,8.4,6.6v-0.5c-2.7-0.2-3.9-1.5-3.9-3.2c0-2.2,1.5-3.2,3.4-3.2c2,0,3.7,1.2,4.9,2.7l7.1-7.9l-0.5-0.5l-1.7,2c-2.7-2.5-4.2-3.2-7.4-3.7V11.3L122,45.7h1.5V11.3C127.1,11.1,130.6,8.1,130.6,3.9z M148.5,36.2l-6.1,4.7l-6.1-4.9v-3l11.6-7.9v-0.2l-5.9-8.9l-12.8,6.9v16.2l-2.5,2l0.5,0.5l2.2-1.7l8.4,6.1l11.1-8.9C148.8,37.1,148.5,36.2,148.5,36.2z M136.2,32V19.9l0.5-0.2l5.4,8.6C142.2,28.3,136.2,32,136.2,32z M188.6,18.7l-1.7,1.2l-4.7-3.9l-5.4,4.9l2.2,2.2v18.4l-5.9-3.7V22.6l2-1.2l-5.7-5.4l-5.4,4.9l2.2,2.2v17.7l-0.7,0.5l-5.2-3.7V22.9c0-3.4-1.7-4.4-3.7-5.7c-1.7-1.2-2.7-2-2.7-3.7c0-1.5,1.5-2.2,2.2-2.7v-0.5c-2,0-7.1,2-7.1,6.6c0,2.5,1.2,3.4,2.5,4.7c1.2,1.2,2.5,2.2,2.5,4.4v14.3l-2.7,2l0.5,0.5l2.5-2l5.7,4.9l6.1-4.2l6.9,4.2l13-7.6V21.6l3.2-2.5L188.6,18.7L188.6,18.7z M234.4,5.2l-2.5,2.2l-5.4-4.9l-8.1,5.9V3h-0.7l0.2,39.8c-0.7,0-3-0.5-4.7-1l-0.5-33.2c0-2.5-1.7-5.9-6.1-5.9s-7.4,3.4-7.4,6.9h0.7c0.2-1.5,1-2.7,2.5-2.7c1.5,0,2.7,1,2.7,4.2v9.6c-4.4,0.2-7.1,2.7-7.1,5.9c0,2,1,4.9,3.9,4.9V31c-1-0.5-1.2-1.2-1.2-1.7c0-1.5,1.2-2,3.2-2h1v15.2c-3.7,1.2-5.2,3.9-5.2,6.9c0,4.2,3.2,7.1,8.1,7.1c3.4,0,6.4-0.5,9.3-1.2c2.5-0.5,5.7-1.2,7.1-1.2c2,0,2.7,1,2.7,2.2c0,1.7-0.7,2.5-1.7,2.7v0.5c3.9-0.7,6.4-3.2,6.4-6.9s-3.7-5.9-7.6-5.9c-2,0-6.1,0.7-9.1,1.2c-3.4,0.7-6.9,1.2-7.9,1.2c-1.7,0-3.7-0.7-3.7-3.2c0-2,1.7-3.7,5.9-3.7c2.2,0,4.9,0.2,7.6,1c3,0.7,5.7,1.5,8.1,1.5c3.7,0,6.9-1.2,6.9-6.4V8.1l3-2.5L234.4,5.2L234.4,5.2z M224.3,20.2c-0.7,0.7-1.7,1.5-3,1.5s-2.5-0.7-3-1.5V9.3l2.5-1.7l3.4,3.2C224.3,10.8,224.3,20.2,224.3,20.2z M224.3,27.5c-0.5-0.5-1.7-1.2-3-1.2s-2.5,0.7-3,1.2v-6.4c0.5,0.5,1.7,1.2,3,1.2s2.5-0.7,3-1.2V27.5z M224.3,39.1c0,2-1.2,3.9-3.9,3.9h-2V28.5c0.5-0.5,1.7-1.2,3-1.2s2.2,0.7,3,1.2C224.3,28.5,224.3,39.1,224.3,39.1z M258,21.6l-7.9-5.7l-12.1,6.9v16l-2.5,2l0.2,0.5l2-1.5l7.9,5.9l12.3-7.4C258,38.4,258,21.6,258,21.6z M244.7,37.1V19.4l6.1,4.4v17.5C250.9,41.3,244.7,37.1,244.7,37.1z M281.4,16.5h-0.5c-0.7,0.5-1.5,1-2.2,1c-1,0-2.2-0.5-2.7-1.2h-0.5l-4.2,4.7l-4.2-4.7l-7.4,4.9l0.2,0.5l2-1.2l2.5,2.7v15.5l-3.2,2.5l0.5,0.5l1.5-1.2l5.9,4.9l7.6-5.2l-0.2-0.5l-2.2,1.2l-3-2.5V21.2c1.2,1.2,2.7,2.5,4.4,2.5C279.1,23.9,281.1,20.4,281.4,16.5L281.4,16.5z M310.9,40.1l-8.4,5.7l-11.3-17.2l8.1-12.5h0.5c1,1,2.5,2,4.2,2c1.7,0,3-1,3.7-2h0.5c-0.2,4.9-3.7,7.9-6.1,7.9c-2.5,0-3.7-1.2-5.2-2l-0.7,1.2l12.3,18.2l2.5-1.5V40.1z M283.8,38.9l-3.2,2.5l0.5,0.5l1.5-1.2l5.4,4.9l7.4-4.9l-0.5-0.5l-2,1.2l-2.5-2.5V1h-0.2l-8.9,5.9v0.5c1,0.5,2.5,0.7,2.5,3.7C283.8,11.1,283.8,38.9,283.8,38.9z M351.7,6.1c0-4.9-4.7-6.1-8.4-6.1v0.7c2.2,0,3.9,0.7,3.9,2.5c0,1-0.7,2.5-3,2.5c-1.7,0-5.4-1-8.1-2c-3.2-1-6.1-2-8.6-2c-4.9,0-8.4,3.7-8.4,7.9c0,3.7,2.7,4.9,3.7,5.4l0.2-0.5c-0.7-0.5-1.5-1-1.5-2.5c0-1,1-2.7,3.4-2.7c2.2,0,5.2,1,9.1,2.2c3.4,1,7.1,1.7,9.1,2v7.6l-3.7,3.2v0.2l3.7,3.2v10.6c-2,1.2-4.2,1.5-6.1,1.5c-3.7,0-6.9-1-9.6-3.9l10.1-4.9V13.8l-12.3,5.4c1.2-3.2,3.9-5.4,6.4-7.1l-0.2-0.5c-7.4,2-14,8.6-14,17c0,9.8,8.1,17.2,17.2,17.2c9.8,0,16.2-7.9,16.2-16h-0.5c-1.5,3.2-3.7,6.1-6.4,7.6V27.3l3.9-3.2v-0.2l-3.7-3.2v-7.4C348,13.3,351.7,10.8,351.7,6.1z M330.3,33.2l-3,1.5c-1.7-2.2-2.7-5.2-2.7-9.3c0-1.7,0.2-3.7,0.7-5.2l5.2-2.2L330.3,33.2z M360.3,3.7H360l-4.9,4.2v0.2l4.2,4.7h0.5l4.9-4.2V8.4L360.3,3.7L360.3,3.7z M367.7,40.1l-2,1.2l-2.5-2.5v-17l2.5-1.7l-0.5-0.5l-1.7,1.5l-4.4-5.2l-7.1,4.9l0.5,0.7l1.7-1.2l2.2,2.7v16l-3.2,2.5l0.2,0.5l1.7-1.2l5.4,4.9l7.4-4.9L367.7,40.1L367.7,40.1z M408.7,39.8l-1.7,1.2l-2.7-2.5V21.9l2.5-2l-0.5-0.5l-2,1.7l-5.7-5.2l-7.4,5.2l-5.7-5.2l-6.9,5.2l-4.4-5.2l-7.1,4.9l0.2,0.7l1.7-1.2l2.5,2.7v16l-2,2l5.7,4.7l5.4-4.9l-2.2-2.2V21.9l2.2-1.5l3.7,3.4v14.8l-2,2l5.7,4.7l5.4-4.9l-2.2-2.2V21.9l2-1.2l3.9,3.4v14.8l-1.7,1.7l5.7,5.2l7.6-5.2L408.7,39.8L408.7,39.8z M430.1,36.2l-6.1,4.7l-6.1-4.9v-3l11.6-7.9v-0.2l-5.9-8.9l-12.8,6.9v16.7l8.6,6.1l11.1-8.9C430.4,36.9,430.1,36.2,430.1,36.2z M417.8,32V19.9l0.5-0.2l5.4,8.6C423.7,28.3,417.8,32,417.8,32z M452.5,29.8l-4.7-3.7c3.2-2.7,4.4-6.4,4.4-8.9v-1.5h-0.5c-0.5,1.2-1.5,2.5-3.4,2.5c-2,0-3.2-1-4.4-2.5l-11.1,6.1v8.9l4.2,3.2c-4.2,3.7-4.9,6.1-4.9,8.1c0,2.5,1.2,4.2,3.2,4.9l0.2-0.5c-0.5-0.5-1-0.7-1-2c0-0.7,1-2,3-2c2.5,0,3.9,1.7,4.7,2.5l10.6-6.4v-8.9C452.8,29.8,452.5,29.8,452.5,29.8z M449.8,22.4c-1.7,3-5.4,5.9-7.6,7.4l-2.7-2.2v-8.6c1,2.5,3.7,4.4,6.4,4.4C447.6,23.4,448.6,23.1,449.8,22.4z M445.6,42.1c-1.2-2.7-4.2-4.7-7.1-4.7c-0.7,0-2.7,0-4.7,1.2c1.2-2,4.4-5.4,8.6-7.9l3,2.5L445.6,42.1L445.6,42.1z"/></svg>`
        : `<img src="${resourceUrl(categoryLogo.imageUrl)}" class="${escapeHtml(categoryLogo.imgClassName || '')}" alt="${escapeHtml(categoryLogo.alt || '')}">`;
      gridTitle.innerHTML = `${escapeHtml(CAT_LABEL[parts[1]] || parts[1])} <button type="button" class="grid-title-scope-link grid-title-top100-link">| ${escapeHtml(genreContent.shortName)}</button>` +
        `<span class="${escapeHtml(categoryLogo.wrapClassName)}">${logoInner}</span>`;
    } else if (isCuratedDrilldown) {
      gridTitle.innerHTML = `${genreLabel} ${escapeHtml(parts[1])}`;
    } else {
      gridTitle.textContent = parts.length === 2
        ? `${parts[0]} ${parts[1]}`
        : `${parts[0]} Saves`;
    }
    document.querySelector('.grid-title-link')?.addEventListener('click', e => {
      e.preventDefault();
      navigateToView(e.currentTarget.dataset.view);
    });
  } else if (state.view.startsWith('musicgenre:')) {
    const bucket = state.view.slice(11);
    // "All Music" isn't a real bucket to filter by — it belongs on the actual Musicians page
    // (PRIMARY_FOLDER_ID.Musician) instead, not this one. Redirects rather than rendering here so
    // musicgenre:All Music can't be reached at all (typed/bookmarked URL, a stray old link, ...),
    // not just avoided by the picker card and dropdown's own handlers below — one canonical
    // "unfiltered" destination, not two that happen to show the same items differently.
    if (bucket === MUSIC_ALL_LABEL) {
      navigateToView(PRIMARY_FOLDER_ID.Musician, { replace: true });
      return;
    }
    // Music landing page drill-in — same page shape as any other category (search/sort/cards all
    // work unchanged below), just an extra genre filter. #musicgenre-select pairs with #sort-select
    // in .grid-header-right (index.html) — populated fresh each render so it always reflects the
    // current bucket, same as sortSelect.value being set from state.sort elsewhere. Title stays
    // "Musicians" regardless of which bucket is active — per direct request/correction, the
    // dropdown itself is what shows/defines the current genre, not the page title (this used to
    // swap the title to the bucket name, e.g. "Pop"). "Musicians" (not CAT_LABEL['Musician'], which
    // stays "Music" for the sidebar's own category row) per a further direct request.
    renderMusiciansDropdownShell(bucket);
  } else if (state.view.startsWith('savedlist:')) {
    // Saved Lists (Favorites/Health/Motivation/anything user-added) now show their own actual
    // saved content here — same page shape as any other category/folder (search/sort/cards all
    // work unchanged below) — per direct request, replacing the placeholder landing card this
    // used to be. getFilteredSortedItems()'s own "savedlist:" branch (renderFilters.js) already
    // did the actual item filtering; it just was never reached before now.
    const listId = state.view.slice(10);
    const list = state.savedLists.find(l => l.id === listId);
    const listName = list ? list.name : 'List';
    // "All My Saves" (default-favorites) never actually reaches this branch in practice today —
    // the sidebar routes it straight to state.view === 'dashboard' instead (renderSidebar.js) —
    // but this mirrors the placeholder's own "no ' Saves' suffix" exception defensively, in case
    // it's ever reached directly (e.g. a bookmarked/typed ?v=savedlist:default-favorites URL).
    gridTitle.textContent = listId === 'default-favorites' ? listName : `${listName} Saves`;
  } else if (CATEGORIES.includes(state.view)) {
    gridTitle.innerHTML = `${CAT_EMOJI[state.view]} ${CAT_LABEL[state.view] || state.view}${scopedListSuffix}`;
  } else {
    const folder = state.folders.find(f => f.id === state.view);
    // The sidebar's own plain "Musicians" accordion row (folder.id === PRIMARY_FOLDER_ID.Musician)
    // — confirmed a deliberately separate destination from the picker (see renderSidebar.js's own
    // comment: routes here via its own real folder id, not through the picker at all), but shares
    // the exact same "Musicians" title + genre-dropdown shell the musicgenre: pages use, and is now
    // ALSO the one and only "unfiltered, every musician" destination — both the picker's "All
    // Music" card and the dropdown's own "All Music" option (main.js) navigate straight here
    // instead of to a musicgenre:All Music page of their own. Selecting a real bucket from the
    // dropdown here hands off to the real musicgenre:<bucket> page rather than duplicating that
    // filtering logic on this view; the items shown before that happens are already the full
    // unfiltered set (matchesPrimaryOrUnfoldered, renderFilters.js).
    if (folder && folder.id === PRIMARY_FOLDER_ID.Musician) {
      renderMusiciansDropdownShell(MUSIC_ALL_LABEL);
    } else if (folder && folder.parentCategory === 'News') {
      // News outlet folders double as "publication profile pages" — a richer header (domain +
      // paywalled badge, both already on the folder from the News-category work) instead of just
      // the bare folder name every other folder gets.
      const domainHtml = folder.domain ? `<span class="grid-title-domain">${escapeHtml(folder.domain)}</span>` : '';
      const paywalledHtml = folder.paywalled ? `<span class="grid-title-paywalled-badge">Paywalled</span>` : '';
      gridTitle.innerHTML = `${escapeHtml(folder.name)} ${domainHtml}${paywalledHtml}${scopedListSuffix}`;
    } else {
      gridTitle.innerHTML = `${escapeHtml(folder ? folder.name : 'Folder')}${scopedListSuffix}`;
    }
  }

  // scopedListSuffix's own link — stopPropagation not needed (unlike the sidebar's equivalent
  // click handlers) since the page title itself has no click behavior of its own to collide with.
  // state.activeSavedListId is already known here (it's what produced scopedListSuffix above), so
  // the link needs no data-attribute of its own to carry it back out on click. Own class (not the
  // shared .grid-title-scope-link, which both this and the Top 100 title link below reuse purely
  // for visual styling) so a generic selector here can't accidentally pick up the other one.
  document.querySelector('.grid-title-savedlist-link')?.addEventListener('click', () => {
    navigateToView(`savedlist:${state.activeSavedListId}`, { activeSavedListId: state.activeSavedListId });
  });
  // "| Votecraft" — the Top 100 title suffix's own link, same reasoning as above. Always goes to
  // the Top 100/VoteCraft landing page regardless of how deep the current drilldown is, same as
  // the sidebar's own "‹ VoteCraft" title click.
  document.querySelector('.grid-title-top100-link')?.addEventListener('click', () => {
    navigateToView('genre:Top 100');
  });

  const items = getFilteredSortedItems();

  if (items.length === 0) {
    const isSearch = !!state.search;
    const isCuratedTop = state.view.startsWith('genre:') && state.view.split(':').length === 2;
    const isCuratedLanding = state.view === 'curated';
    const isCuratedFullList = state.view === 'curated-full-list';
    const genre = isCuratedTop ? state.view.slice(6) : null;

    // A handful of curated genres (currently just Top 100) get a richer, distinct landing page
    // here instead of the plain "Pick a category" empty state below — see
    // CURATED_GENRE_LANDING_CONTENT in state.js for which genres and what content.
    const landingContent = isCuratedTop && !isSearch ? CURATED_GENRE_LANDING_CONTENT[genre] : null;
    if (landingContent) {
      renderCuratedGenreLanding(container, genre, landingContent);
      return;
    }

    // "Curated-full-list" — the rich hero + carousel-rows directory of many nonprofit-sponsored
    // lists (CURATED_DIRECTORY_CONTENT in state.js). Reached via the link on the bare-bones
    // top-level page below, not directly from the sidebar.
    if (isCuratedFullList && !isSearch) {
      renderCuratedDirectory(container);
      return;
    }

    // The top-level "Curated SaveCraft" landing (no genre picked yet) gets a bare-bones,
    // ActBlue-style flat list of the same nonprofit-sponsored orgs instead of the plain "Pick a
    // category" empty state below, with a link through to the fuller Curated-full-list page.
    if (isCuratedLanding && !isSearch) {
      renderCuratedBareList(container);
      return;
    }

    container.className = (isCuratedTop || isCuratedLanding || !isSearch) ? 'cards-grid landing-state' : 'cards-grid';
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">${isSearch ? '🔍' : isCuratedLanding ? '✨' : isCuratedTop ? '✨' : '📦'}</div>
        <h3>${isSearch ? 'No results found' : isCuratedLanding ? 'Pick a category' : isCuratedTop ? `${genre} Saves` : 'Nothing here yet'}</h3>
        <p>${isSearch ? `No items match "${escapeHtml(state.search)}"` : isCuratedLanding ? 'Explore the sidebar to see our curated picks.' : isCuratedTop ? 'Pick a category from the sidebar to explore curated picks.' : '+ Add Item to start building this library.'}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = items.map(item => renderCard(item)).join('');
  persistViewState();
  fetchMissingCuratedImages(items);
  fetchMissingCuratedMusicianPhotos(items);

  container.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('.card-action-btn')) return;
      let item = state.items.find(i => i.id === card.dataset.id);
      if (!item) {
        for (const genre of Object.keys(CURATED_ITEMS)) {
          for (const cat of Object.keys(CURATED_ITEMS[genre])) {
            const found = CURATED_ITEMS[genre][cat].find(i => i.id === card.dataset.id);
            if (found) { item = { ...found, category: cat, curated: true }; break; }
          }
          if (item) break;
        }
      }
      if (item) openDetailModal(item);
    });
  });

  wireCardAuthorLinks(container);
  wirePublicationLinks(container);
  wireQuickQueueButtons(container);

  container.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      let item = state.items.find(i => i.id === btn.dataset.id);
      if (!item) {
        // Look up from curated data
        for (const genre of Object.keys(CURATED_ITEMS)) {
          for (const cat of Object.keys(CURATED_ITEMS[genre])) {
            const found = CURATED_ITEMS[genre][cat].find(i => i.id === btn.dataset.id);
            if (found) { item = { ...found, category: cat, curated: true }; break; }
          }
          if (item) break;
        }
      }
      if (!item) return;
      openEditModal(item);
    });
  });

  container.querySelectorAll('.btn-save-curated').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const id = btn.dataset.id;
      if (state.items.some(i => i._curatedSourceId === id)) {
        btn.title = 'Already saved!';
        btn.style.color = '#5B5BEF';
        setTimeout(() => { btn.title = 'Save to My Saves'; btn.style.color = ''; }, 1500);
        return;
      }
      let source = null;
      let sourceCat = null;
      for (const genre of Object.keys(CURATED_ITEMS)) {
        for (const cat of Object.keys(CURATED_ITEMS[genre])) {
          const found = CURATED_ITEMS[genre][cat].find(i => i.id === id);
          if (found) { source = found; sourceCat = cat; break; }
        }
        if (source) break;
      }
      if (!source) return;
      const newItem = {
        id: Date.now().toString(),
        url: source.url,
        title: source.title,
        notes: source.notes || null,
        imageUrl: source.imageUrl || state.curatedImgCache[id] || null,
        description: null,
        category: sourceCat,
        folderId: null,
        platforms: null,
        done: false,
        savedAt: Date.now(),
        _curatedSourceId: id,
      };
      await persistItem(newItem);
      state.items.unshift(newItem);
      btn.style.color = '#5B5BEF';
      btn.title = 'Saved!';
      setTimeout(() => { btn.style.color = ''; btn.title = 'Save to My Saves'; }, 1500);
      renderSidebar();
    });
  });

  container.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const id = btn.dataset.id;
      if (!confirm('Remove this item from SaveCraft?')) return;
      if (id.startsWith('cur-') && !state.items.find(i => i.id === id)) {
        state.hiddenCurated.add(id);
        await persistHiddenCurated();
      } else {
        await removeItem(id);
        state.items = state.items.filter(i => i.id !== id);
      }
      renderSidebar();
      renderGrid();
    });
  });
}

// Music landing page (state.view === 'Musician', called from renderGrid() above) — a fixed
// 15-card grid of genre buckets (icon + name + save count) instead of a flat item list, per
// direct request. Structurally modeled on the savedlist: placeholder-landing branch above (no
// items, no sort dropdown, its own container class) rather than the normal item-card path, since
// this screen has nothing to sort/search — it's 15 fixed picker cards, not saved items.
function renderMusicGenreLanding() {
  const container = document.getElementById('cards-grid');
  const gridTitle = document.getElementById('grid-title');
  const sortSelect = document.getElementById('sort-select');
  const musicGenreSelect = document.getElementById('musicgenre-select');

  gridTitle.style.display = '';
  gridTitle.innerHTML = `${CAT_EMOJI['Musician']} ${CAT_LABEL['Musician']}`;
  sortSelect.style.display = 'none';
  musicGenreSelect.style.display = 'none';

  const { counts, total } = getMusicGenreBucketCounts();
  // Hover callout listing the raw iTunes genre tags (MUSIC_GENRE_BUCKET_MAP, state.js) that sort
  // into each bucket — not which saved musicians happen to be in it, per direct correction. Same
  // visual language as the detail modal's "Why VoteCraft Recommends" tooltip
  // (.vc-sponsored-tooltip), reused here as .musicgenre-tooltip so it reads as the same kind of
  // purple, arrow-pointing-up-at-the-trigger callout rather than a new, unfamiliar tooltip style.
  const buildTooltipHtml = tags => `
    <span class="musicgenre-tooltip">
      <span class="musicgenre-tooltip-title">Tags contained:</span>
      <span class="musicgenre-tooltip-text">${tags.map(t => escapeHtml(t)).join(' | ')}</span>
    </span>
  `;
  // "All Music" — a shortcut to the existing unfiltered "every saved musician" view (same
  // destination the sidebar's own plain "Musicians" row already goes to), not a real genre
  // bucket — pinned first, ahead of the alphabetical genre cards, per direct request. No hover
  // callout of its own, per direct follow-up — it isn't a real bucket in MUSIC_GENRE_BUCKET_MAP,
  // so "every tag" wouldn't tell the user anything a specific bucket's own callout doesn't already.
  const allBucketHtml = `
    <button type="button" class="musicgenre-card" data-bucket="${escapeHtml(MUSIC_ALL_LABEL)}">
      <span class="musicgenre-card-icon">${MUSIC_GENRE_BUCKET_EMOJI[MUSIC_ALL_LABEL] || ''}</span>
      <span class="musicgenre-card-name">${escapeHtml(MUSIC_ALL_LABEL)}</span>
      <span class="musicgenre-card-count">${total}</span>
    </button>
  `;
  container.className = 'musicgenre-landing-grid';
  container.innerHTML = allBucketHtml + MUSIC_GENRE_BUCKETS.map(bucket => `
    <button type="button" class="musicgenre-card" data-bucket="${escapeHtml(bucket)}">
      <span class="musicgenre-card-icon">${MUSIC_GENRE_BUCKET_EMOJI[bucket] || ''}</span>
      <span class="musicgenre-card-name">${escapeHtml(bucket)}</span>
      <span class="musicgenre-card-count">${counts[bucket] || 0}</span>
      ${buildTooltipHtml(tagsForMusicGenreBucket(bucket))}
    </button>
  `).join('');

  container.querySelectorAll('.musicgenre-card').forEach(card => {
    card.addEventListener('click', () => {
      const bucket = card.dataset.bucket;
      // "All Music" goes straight to the real Musicians page (PRIMARY_FOLDER_ID.Musician) — REAL
      // BUG, found and fixed: this used to route through musicgenre:All Music, a third
      // "unfiltered, every musician" destination of its own that only differed from the Musicians
      // page by lacking its genre dropdown (reported live as a confusing redundant state). Every
      // real bucket still goes to its own musicgenre:<bucket> page, unchanged.
      navigateToView(bucket === MUSIC_ALL_LABEL ? PRIMARY_FOLDER_ID.Musician : `musicgenre:${bucket}`);
    });
  });

  // Most already-saved musicians won't have a genre yet — it's only ever been fetched for a
  // freshly-added Musician or one whose own author page has been opened. Backfills the rest in
  // the background and re-renders these counts as each one resolves, so they settle in shortly
  // after arriving here instead of staying permanently uncounted, per direct request ("sort the
  // musicians I have into these 15 categories so the numbers on the cards are accurate").
  backfillMusicianGenres();

  persistViewState();
}

// Category folder-picker landing (state.view === <category>, called from renderGrid() above) —
// every top-level category tab except Musician/Music Album, per direct request. Same card-grid
// shape/mechanics as renderMusicGenreLanding() above, just driven by this category's real folders
// (state.folders) instead of a fixed bucket list, using each folder's own real sidebar icon
// (folderIconHtml, utils.js — the same helper the sidebar's own folder rows use, per direct
// follow-up: "use the same icon for these that is in the sidebar") rather than per-bucket emoji,
// and a purple-OUTLINED card style (.category-folder-card, cards.css) instead of Music's
// solid-fill — visually distinct on purpose, so this doesn't read as a second Music-style page.
function renderCategoryFolderLanding(category) {
  const container = document.getElementById('cards-grid');
  const gridTitle = document.getElementById('grid-title');
  const sortSelect = document.getElementById('sort-select');
  const musicGenreSelect = document.getElementById('musicgenre-select');

  gridTitle.style.display = '';
  gridTitle.innerHTML = `${CAT_EMOJI[category] || ''} ${escapeHtml(CAT_LABEL[category] || category)}`;
  sortSelect.style.display = 'none';
  musicGenreSelect.style.display = 'none';

  const folders = state.folders.filter(f => f.parentCategory === category);
  const counts = getCategoryFolderCounts(category);

  container.className = 'category-folder-landing-grid';
  container.innerHTML = folders.map(folder => `
    <button type="button" class="category-folder-card" data-folder-id="${escapeHtml(folder.id)}">
      <span class="category-folder-card-icon">${folderIconHtml(folder.id, 26)}</span>
      <span class="category-folder-card-name">${escapeHtml(folder.name)}</span>
      <span class="category-folder-card-count">${counts[folder.id] || 0}</span>
    </button>
  `).join('');

  container.querySelectorAll('.category-folder-card').forEach(card => {
    card.addEventListener('click', () => {
      // The folder's own page renders its real content — or its own "Nothing here yet" if it's
      // genuinely empty, exactly like any other folder page — one level deeper than this picker.
      navigateToView(card.dataset.folderId);
    });
  });

  persistViewState();
}

export function renderCard(item) {
  const domain = getDomain(item.url);
  const letter = domain[0]?.toUpperCase() || '?';
  const folder = item.folderId ? state.folders.find(f => f.id === item.folderId) : null;

  const imageSection = item.imageUrl
    ? `<img class="card-image" src="${escapeHtml(item.imageUrl)}" alt="" loading="lazy" decoding="async"
            onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
       <div class="card-placeholder placeholder-${catClass(item.category)}" style="display:none;">${letter}</div>`
    : `<div class="card-placeholder placeholder-${catClass(item.category)}">${letter}</div>`;

  // One badge now conveys both category (via its color, always badge-${catClass}) and folder
  // (via its text, when the item has one) — consistent across every category, not just Movie's
  // Videos folder. Replaces the old separate folder-icon label entirely. "Favorites" is excluded
  // since it's a cross-category virtual folder, not a real subfolder of this item's own category.
  const showsFolderName = folder && folder.name !== 'Favorites';
  const badgeText = showsFolderName ? folder.name : badgeLabel(item.category);

  // Genre-tag badge, per direct request ("add the tag to the card to the left of musician") —
  // the raw iTunes genre string that sorts this artist/album into a Music landing page bucket:
  // Musician reads it off the artist's own author record (author.genre, editable from Edit Item's
  // genre-tag field); Music Album carries it directly on the item itself (item.genre, set at
  // import time — fetchAlbumsModal.js/addEditModal.js). Only once resolved — no placeholder badge
  // for one that hasn't backfilled yet.
  const genreTag = item.category === 'Musician' ? findAuthor(item.title, 'Musician')?.genre
    : item.category === 'Music Album' ? item.genre
    : null;
  // REAL BUG, found and fixed: this used to render ALONGSIDE the category badge (MUSICIAN/ALBUM),
  // sharing the row's flush-right margin between the two. Per direct follow-up, the genre badge
  // now REPLACES the category badge on these cards (styled in the same pink the category badge
  // used, .card-badge-genre below) rather than sitting next to it — Kanban's cards are unaffected
  // either way, since kanban.js has its own separate card markup that never calls this function.
  const genreBadgeHtml = genreTag
    ? `<span class="card-badge card-badge-genre" style="margin-left:auto">${escapeHtml(genreTag)}</span>`
    : '';

  return `
    <div class="card" data-id="${item.id}">
      ${imageSection}
      <div class="card-body">
        ${(() => {
          const aName = item.author || (item.curated && CURATED_NOTES_CATEGORIES.includes(item.category) ? item.notes : null);
          // When the name comes from the curated `.notes` fallback (no item.author), the profile
          // page to link to is 'Musician' for a Music Album (the one category whose
          // curated-notes creator isn't its own category) and item.category for everything else.
          const aCat = item.author ? item.category : (item.category === 'Music Album' ? 'Musician' : item.category);
          if (!aName) return '';
          // A co-directed movie shows the lead director's name plus "…" to indicate collaborators
          // — display-only, never part of the name used to link to/match that director's page.
          const aDisplay = escapeHtml(aName) + (item.authorHasMore ? ' …' : '');
          if ((item.category === 'Music Album' && isMusicAlbumsSectionView()) || isOwnAuthorPageView(aName)) {
            return `<div class="card-author-name">${aDisplay}</div>`;
          }
          return `<button class="card-author-link" data-author="${escapeHtml(aName)}" data-category="${escapeHtml(aCat)}">${aDisplay}</button>`;
        })()}
        ${(() => {
          // News items don't have item.author — they're attributed via item.folderId pointing
          // at a curated outlet folder instead (see the folder-header treatment in renderGrid()).
          if (item.category !== 'News' || !item.folderId) return '';
          const outletFolder = state.folders.find(f => f.id === item.folderId);
          if (!outletFolder) return '';
          return state.view === item.folderId
            ? `<div class="card-author-name">${escapeHtml(outletFolder.name)}</div>`
            : `<button class="card-author-link card-publication-link" data-folder-id="${escapeHtml(item.folderId)}">${escapeHtml(outletFolder.name)}</button>`;
        })()}
        ${CREATOR_CARD_CATEGORY[item.category] && !isOwnAuthorPageView(item.title)
          ? `<button class="card-author-link card-title" data-author="${escapeHtml(item.title)}" data-category="${CREATOR_CARD_CATEGORY[item.category]}">${escapeHtml(item.title || '')}</button>`
          : `<div class="card-title${item.category === 'Music Album' ? ' card-title--album' : ''}">${escapeHtml(item.title || '')}</div>`
        }
        ${item.category === 'Music Album' && item.year ? `<div class="card-album-year">${escapeHtml(item.year)}</div>` : ''}
        <div class="card-meta">
          ${genreBadgeHtml || `<span class="card-badge badge-${catClass(item.category)}" style="margin-left:auto">${escapeHtml(badgeText)}</span>`}
        </div>
      </div>
      ${item.curated ? (() => {
        // Quick "add to queue" for curated cards (Top 100 and every other curated genre) — lets
        // the user queue something straight from the grid without opening the detail modal.
        // Personal (non-curated) cards don't get this: they already have their own queue toggle
        // inside the detail modal, and the edit/delete pair above occupies this same corner.
        // Deliberately not rendered on Kanban cards (kanban.js has its own separate card markup
        // that never calls renderCard()).
        const isQueued = !!state.items.find(i => i.id === item.id && i.queueStatus);
        return `<button class="card-quick-queue-btn${isQueued ? ' card-quick-queue-btn--active' : ''}" data-id="${item.id}" title="${isQueued ? 'In your queue' : 'Add to queue'}">${isQueued ? BOOKMARK_FILLED_SVG : BOOKMARK_OUTLINE_SVG}</button>`;
      })() : `<div class="card-actions">
        <button class="card-action-btn btn-delete" data-id="${item.id}" title="Remove"><svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg></button>
        <button class="card-action-btn btn-edit" data-id="${item.id}" title="Edit"><svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"/></svg></button>
      </div>`}
    </div>
  `;
}
