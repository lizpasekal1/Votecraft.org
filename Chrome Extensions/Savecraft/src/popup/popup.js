// Reuses the real app's category config + folder-icon helper so the popup can never drift out
// of sync with the categories/icons/folders the main app actually has (state.js/utils.js have no
// side effects — safe to import here without pulling in the full app).
import { CATEGORIES, CAT_LABEL, CAT_EMOJI } from '../app/js/state.js';
import { folderIconHtml, escapeHtml, sortFoldersForDisplay } from '../app/js/utils.js';

let selectedCategory = null;
let selectedFolderId = null;
let currentScreen = 'category'; // 'category' | 'music-choice' | 'folder' | 'review'
let hadMusicChoiceScreen = false;
let hadFolderScreen = false;
let currentTab = null;
let pageIsSaveable = true;
let reviewPrefilled = false;
// Fetched silently in the background (og:image via the content script, Microlink fallback) and
// saved with the item — no visible/editable field for it here, only Edit Item (main app) lets the
// user override an image manually.
let fetchedImageUrl = null;
// Same checkbox-multi-select model as the main app's own Add flow (addEditModal.js's
// _wizardSelectedListIds) — which of the user's saved lists (beyond the always-on "All My
// Saves") this item should also be added to. Persists across category/folder navigation within
// this popup session, same as the title/url fields do.
const selectedListIds = new Set();
// Lazily fetched (see loadSavedLists below) and cached — null until the first review-screen visit
// actually needs it, so a page that's never saved from never pays for a storage read.
let savedLists = null;

// Match whatever theme the user has set in the main app (defaults to dark, same as there).
chrome.storage.sync.get({ savecraft_theme: 'dark' }, data => {
  document.documentElement.setAttribute('data-theme', data.savecraft_theme);
});

// Load current tab info
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  currentTab = tabs[0] || null;

  if (!currentTab || !currentTab.url) return;

  const url = currentTab.url;

  // Chrome internal pages can't be saved
  if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:')) {
    pageIsSaveable = false;
    document.getElementById('unsaveable-msg').classList.remove('hidden');
    document.body.classList.add('has-banner');
  }
});

// ===== Screen 1: category tiles =====
// Musician and Music Album are combined into one "Music" tile here, same as the main app's Add
// wizard — picking it leads to a small sub-choice screen instead of showing both as separate
// top-level entries.
// "Articles" is a similar special case in the opposite direction: not a top-level category at
// all (no sidebar tab of its own — it's Web Links' "Articles" folder), just a shortcut tile here
// so saving an article skips both the Websites tile and the folder-picker screen.

function renderCategoryGrid() {
  const grid = document.getElementById('cat-grid');
  const tiles = CATEGORIES.filter(cat => cat !== 'Music Album').map(cat => cat === 'Musician' ? `
    <button type="button" class="cat-btn" data-category="__music__">
      ${CAT_EMOJI['Music Album'] || ''}
      <span class="cat-btn-label">Music</span>
    </button>` : `
    <button type="button" class="cat-btn" data-category="${cat}">
      ${CAT_EMOJI[cat] || ''}
      <span class="cat-btn-label">${CAT_LABEL[cat] || cat}</span>
    </button>`);
  // Inserted right after Websites (index 0) — Articles is a Web Links sub-concept, so it reads
  // naturally next to the tile it's a shortcut off of.
  tiles.splice(1, 0, `
    <button type="button" class="cat-btn" data-category="__articles__">
      ${folderIconHtml('default-weblinks-articles', 28)}
      <span class="cat-btn-label">Articles</span>
    </button>`);
  grid.innerHTML = tiles.join('');

  grid.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.category === '__music__') showMusicChoiceScreen();
      else if (btn.dataset.category === '__articles__') selectArticlesShortcut();
      else selectCategory(btn.dataset.category);
    });
  });
}

// Shortcut tile's target: Web Links, pre-filed straight into the "Articles" folder — skips the
// folder-picker screen entirely (selectCategory() would normally show it, since Web Links has
// more than one folder).
function selectArticlesShortcut() {
  selectedCategory = 'Web Links';
  selectedFolderId = 'default-weblinks-articles';
  hadFolderScreen = false;
  showReviewScreen();
}

// ===== Screen 1.5: Musician vs Music Album sub-choice =====

function showMusicChoiceScreen() {
  currentScreen = 'music-choice';
  hadMusicChoiceScreen = true;
  setScreen('music-choice');
  setHeader('Choose a folder', true, 'Music');

  // CAT_LABEL['Musician'] is "Music" (used for the combined top-level tile/tab) — on this
  // specific sub-choice screen that reads as ambiguous next to "Album", so it's overridden to
  // the more specific singular "Musician" here only.
  const musicChoiceLabels = { Musician: 'Musician', 'Music Album': CAT_LABEL['Music Album'] };
  const grid = document.getElementById('music-choice-grid');
  grid.innerHTML = ['Musician', 'Music Album'].map(cat => `
    <button type="button" class="cat-btn" data-category="${cat}">
      ${CAT_EMOJI[cat] || ''}
      <span class="cat-btn-label">${musicChoiceLabels[cat] || cat}</span>
    </button>`).join('');

  grid.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => selectCategory(btn.dataset.category));
  });
}

// ===== Screen 2: folder picker =====

function selectCategory(cat) {
  selectedCategory = cat;
  chrome.storage.sync.get(null, data => {
    const folders = sortFoldersForDisplay(Object.entries(data)
      .filter(([k]) => k.startsWith('folder_'))
      .map(([, v]) => v)
      .filter(f => f.parentCategory === cat), cat);

    // A single (or no) folder is no real choice — auto-assign and skip straight to review,
    // same rule the main app's wizard uses.
    if (folders.length <= 1) {
      hadFolderScreen = false;
      selectedFolderId = folders[0]?.id || null;
      showReviewScreen();
      return;
    }
    showFolderScreen(folders);
  });
}

function showFolderScreen(folders) {
  currentScreen = 'folder';
  hadFolderScreen = true;
  setScreen('folder');
  setHeader('Choose a folder', true, CAT_LABEL[selectedCategory] || selectedCategory);
  // Book's (Authors/Books) and Movie's (Movies/Videos) folder screens stack like the Musician/
  // Music Album screen instead of the usual 2-column folder-tile layout — every other category's
  // folder screen is unaffected.
  document.body.classList.toggle('screen-folder-stacked', selectedCategory === 'Book' || selectedCategory === 'Movie');

  const grid = document.getElementById('folder-grid');
  grid.innerHTML = folders.map(f => `
    <button type="button" class="cat-btn" data-folder-id="${f.id}">
      ${folderIconHtml(f.id, 18)}
      <span class="cat-btn-label">${escapeHtml(f.name)}</span>
    </button>`).join('');

  grid.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedFolderId = btn.dataset.folderId;
      showReviewScreen();
    });
  });
}

// ===== Saved-lists dropdown (review screen only) =====
// Reads the same storage key the main app writes (savecraft_saved_lists — see storage.js) directly
// via chrome.storage.sync, the same way selectCategory()/showFolderScreen() above already read the
// user's folders — the popup has no access to the main app's in-memory `state`, only to storage.
function loadSavedLists() {
  if (savedLists) return Promise.resolve(savedLists);
  return new Promise(resolve => {
    chrome.storage.sync.get({ savecraft_saved_lists: [] }, data => {
      savedLists = data.savecraft_saved_lists || [];
      resolve(savedLists);
    });
  });
}

function renderListsDropdown(lists) {
  const options = document.getElementById('lists-options');
  options.innerHTML = lists.map(list => {
    // default-favorites ("All My Saves") is the unrestricted catch-all every save belongs to —
    // shown checked and locked, same as the main app's own dropdown, not a real per-item choice.
    const isFavorites = list.id === 'default-favorites';
    const checked = isFavorites || selectedListIds.has(list.id);
    return `
    <label class="lists-option${isFavorites ? ' lists-option--locked' : ''}">
      <span class="lists-option-name">${escapeHtml(list.name)}</span>
      <input type="checkbox" data-list-id="${escapeHtml(list.id)}" ${checked ? 'checked' : ''} ${isFavorites ? 'disabled' : ''} />
    </label>`;
  }).join('');

  options.querySelectorAll('input[type="checkbox"]:not(:disabled)').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) selectedListIds.add(cb.dataset.listId);
      else selectedListIds.delete(cb.dataset.listId);
    });
  });
}

// <details> doesn't close on an outside click natively — same fix the main app needed for its own
// equivalent dropdowns (main.js's generic ".platform-dropdown" listener); the popup has no such
// shared listener of its own, so this is scoped just to the one dropdown it actually has.
document.addEventListener('click', e => {
  const wrap = document.getElementById('lists-wrap');
  if (wrap?.open && !wrap.contains(e.target)) wrap.open = false;
});

// ===== Screen 3: review + save =====

async function showReviewScreen() {
  currentScreen = 'review';
  setScreen('review');
  setHeader('Add to SaveCraft', true, CAT_LABEL[selectedCategory] || selectedCategory);
  document.getElementById('btn-save').disabled = !pageIsSaveable;
  renderListsDropdown(await loadSavedLists());

  if (!reviewPrefilled && currentTab?.url) {
    reviewPrefilled = true;
    let domain = '';
    try { domain = new URL(currentTab.url).hostname.replace('www.', ''); } catch {}
    document.getElementById('input-title').value = currentTab.title || domain || '';
    document.getElementById('input-url').value = currentTab.url;
    document.getElementById('input-title').focus();

    // Try to get og:image from the content script, falling back to Microlink via the background —
    // silent, no visible field/preview for it here (see fetchedImageUrl above).
    try {
      const response = await chrome.tabs.sendMessage(currentTab.id, { action: 'getPageInfo' });
      fetchedImageUrl = response?.imageUrl || null;
    } catch {}
    if (!fetchedImageUrl) {
      try {
        const response = await chrome.runtime.sendMessage({ action: 'fetchImage', url: currentTab.url });
        fetchedImageUrl = response?.imageUrl || null;
      } catch {}
    }
  }
}

// ===== Header + screen switching =====

function setHeader(text, showBack, backLabel) {
  document.getElementById('modal-title-text').textContent = text;
  document.getElementById('btn-back').style.display = showBack ? '' : 'none';
  document.getElementById('modal-back-label').textContent = backLabel || '';
}

function setScreen(name) {
  document.getElementById('step-category').style.display = name === 'category' ? '' : 'none';
  document.getElementById('step-music-choice').style.display = name === 'music-choice' ? '' : 'none';
  document.getElementById('step-folder').style.display = name === 'folder' ? '' : 'none';
  document.getElementById('step-review').style.display = name === 'review' ? '' : 'none';
  document.body.classList.toggle('size-tall', name === 'review');
  document.body.classList.toggle('size-compact', name !== 'review');
  document.body.classList.toggle('screen-folder', name === 'folder');
  document.body.classList.toggle('screen-music-choice', name === 'music-choice');
  document.body.classList.toggle('screen-review', name === 'review');
}

function backToCategoryScreen() {
  currentScreen = 'category';
  hadMusicChoiceScreen = false;
  hadFolderScreen = false;
  setScreen('category');
  setHeader('What are you adding to?', false);
}

// Single back icon, top-left — steps back exactly one screen through the nested chain:
// category → [music-choice, only for the combined "Music" tile] → [folder, only if the category
// has folders] → review. Mirrors the main app's handleModalBack().
document.getElementById('btn-back').addEventListener('click', () => {
  if (currentScreen === 'review' && hadFolderScreen) {
    chrome.storage.sync.get(null, data => {
      const folders = sortFoldersForDisplay(Object.entries(data)
        .filter(([k]) => k.startsWith('folder_'))
        .map(([, v]) => v)
        .filter(f => f.parentCategory === selectedCategory), selectedCategory);
      showFolderScreen(folders);
    });
  } else if (currentScreen === 'review' && hadMusicChoiceScreen) {
    showMusicChoiceScreen();
  } else if (currentScreen === 'folder' && hadMusicChoiceScreen) {
    showMusicChoiceScreen();
  } else {
    backToCategoryScreen();
  }
});

// Open full library page. Waits for the background service worker to actually acknowledge the
// message before closing — MV3 service workers unload when idle, so firing sendMessage and
// closing the popup in the same tick could close it before a cold-starting worker ever received
// the message, silently dropping the request (this is why it sometimes took a second click).
async function openLibrary() {
  try {
    await chrome.runtime.sendMessage({ action: 'openLibrary' });
  } catch {}
  window.close();
}
document.getElementById('btn-open-library').addEventListener('click', openLibrary);
document.getElementById('btn-saved-open-library').addEventListener('click', openLibrary);
document.getElementById('btn-saved-close').addEventListener('click', () => window.close());

// Save current page
document.getElementById('btn-save').addEventListener('click', () => {
  if (!currentTab || !currentTab.url || !pageIsSaveable) return;

  const title = document.getElementById('input-title').value.trim();
  const url = document.getElementById('input-url').value.trim();
  const imageUrl = fetchedImageUrl;
  if (!title || !url) return;

  document.getElementById('btn-save').disabled = true;
  document.getElementById('btn-save').textContent = 'Saving...';

  const id = Date.now().toString();
  const item = {
    id,
    url,
    title,
    imageUrl,
    category: selectedCategory,
    folderId: selectedFolderId,
    // favorite: true — "All My Saves" (default-favorites) is always on for a new save, same
    // convention the main app's own Add flow uses (addEditModal.js). REAL BUG, found and fixed:
    // this was hardcoded false, so nothing saved from the toolbar popup ever showed up under "All
    // My Saves" at all. savedListIds carries whatever other lists were picked in the dropdown
    // above (empty array when none were).
    favorite: true,
    savedListIds: [...selectedListIds],
    done: false,
    savedAt: Date.now(),
  };

  chrome.storage.sync.set({ [`item_${id}`]: item }, () => {
    document.getElementById('btn-save').style.display = 'none';
    document.getElementById('saved-msg').classList.remove('hidden');
  });
});

renderCategoryGrid();
