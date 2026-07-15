// Reuses the real app's category config + folder-icon helper so the popup can never drift out
// of sync with the categories/icons/folders the main app actually has (state.js/utils.js have no
// side effects — safe to import here without pulling in the full app).
import { CATEGORIES, CAT_LABEL, CAT_EMOJI } from '../app/js/state.js';
import { folderIconHtml, escapeHtml } from '../app/js/utils.js';

let selectedCategory = null;
let selectedFolderId = null;
let currentScreen = 'category'; // 'category' | 'music-choice' | 'folder' | 'review'
let hadMusicChoiceScreen = false;
let hadFolderScreen = false;
let currentTab = null;
let pageIsSaveable = true;
let reviewPrefilled = false;

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

function renderCategoryGrid() {
  const grid = document.getElementById('cat-grid');
  grid.innerHTML = CATEGORIES.filter(cat => cat !== 'Music Album').map(cat => cat === 'Musician' ? `
    <button type="button" class="cat-btn" data-category="__music__">
      ${CAT_EMOJI['Music Album'] || ''}
      <span class="cat-btn-label">Music</span>
    </button>` : `
    <button type="button" class="cat-btn" data-category="${cat}">
      ${CAT_EMOJI[cat] || ''}
      <span class="cat-btn-label">${CAT_LABEL[cat] || cat}</span>
    </button>`).join('');

  grid.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.category === '__music__') showMusicChoiceScreen();
      else selectCategory(btn.dataset.category);
    });
  });
}

// ===== Screen 1.5: Musician vs Music Album sub-choice =====

function showMusicChoiceScreen() {
  currentScreen = 'music-choice';
  hadMusicChoiceScreen = true;
  setScreen('music-choice');
  setHeader('Choose a folder', true, 'Music');

  // CAT_LABEL['Musician'] is "Music" (used for the combined top-level tile/tab) — on this
  // specific sub-choice screen that reads as ambiguous next to "Music Album", so it's
  // overridden to the more specific "Musician" here only.
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
    const folders = Object.entries(data)
      .filter(([k]) => k.startsWith('folder_'))
      .map(([, v]) => v)
      .filter(f => f.parentCategory === cat)
      .sort((a, b) => a.name.localeCompare(b.name));

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

// ===== Screen 3: review + save =====

async function showReviewScreen() {
  currentScreen = 'review';
  setScreen('review');
  setHeader('Add to SaveCraft', true, CAT_LABEL[selectedCategory] || selectedCategory);
  document.getElementById('btn-save').disabled = !pageIsSaveable;

  if (!reviewPrefilled && currentTab?.url) {
    reviewPrefilled = true;
    let domain = '';
    try { domain = new URL(currentTab.url).hostname.replace('www.', ''); } catch {}
    document.getElementById('input-title').value = currentTab.title || domain || '';
    document.getElementById('input-url').value = currentTab.url;
    document.getElementById('input-title').focus();

    // Try to get og:image from the content script, falling back to Microlink via the background.
    let imageUrl = null;
    try {
      const response = await chrome.tabs.sendMessage(currentTab.id, { action: 'getPageInfo' });
      imageUrl = response?.imageUrl || null;
    } catch {}
    if (!imageUrl) {
      try {
        const response = await chrome.runtime.sendMessage({ action: 'fetchImage', url: currentTab.url });
        imageUrl = response?.imageUrl || null;
      } catch {}
    }
    if (imageUrl) {
      document.getElementById('input-image-url').value = imageUrl;
      renderImagePreview(imageUrl);
    }
  } else {
    renderImagePreview(document.getElementById('input-image-url').value);
  }
}

function renderImagePreview(url) {
  const wrap = document.getElementById('image-preview-wrap');
  if (!url) { wrap.style.display = 'none'; return; }
  document.getElementById('image-preview').src = url;
  wrap.style.display = '';
}

document.getElementById('input-image-url').addEventListener('input', e => renderImagePreview(e.target.value.trim()));
document.getElementById('btn-clear-image').addEventListener('click', () => {
  document.getElementById('input-image-url').value = '';
  renderImagePreview('');
});

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
      const folders = Object.entries(data)
        .filter(([k]) => k.startsWith('folder_'))
        .map(([, v]) => v)
        .filter(f => f.parentCategory === selectedCategory)
        .sort((a, b) => a.name.localeCompare(b.name));
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

// Open full library page
function openLibrary() {
  chrome.runtime.sendMessage({ action: 'openLibrary' });
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
  const imageUrl = document.getElementById('input-image-url').value.trim() || null;
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
    favorite: false,
    done: false,
    savedAt: Date.now(),
  };

  chrome.storage.sync.set({ [`item_${id}`]: item }, () => {
    document.getElementById('btn-save').style.display = 'none';
    document.getElementById('saved-msg').classList.remove('hidden');
  });
});

renderCategoryGrid();
