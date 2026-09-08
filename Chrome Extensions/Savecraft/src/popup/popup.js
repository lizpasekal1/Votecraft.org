// ===== TOOLBAR POPUP — capture-and-handoff only =====
// This used to fully re-implement the main app's own Add-item wizard here (category tiles,
// folder picker, review form, saved-lists picker, save logic) — a second copy of UI/logic that
// already exists, actively maintained, on savecraft.org itself. Per direct request ("simplify
// the code so that we're not maintaining the redundant extension UI that can just be handled by
// the savecraft.org website"), this now only does what a website fundamentally can't: read the
// current tab's URL/title and best-effort page image. Everything else — category, folder, saved
// lists, the actual save — happens on the real site after handoff (see openSaveCraft below and
// main.js's init()/setPendingCapture in addEditModal.js on the receiving end).

const SAVECRAFT_URL = 'https://savecraft.org';

let currentTab = null;
let fetchedImageUrl = null;

// Match whatever theme the user has set in the main app.
chrome.storage.sync.get({ savecraft_theme: 'dark' }, data => {
  document.documentElement.setAttribute('data-theme', data.savecraft_theme);
});

chrome.tabs.query({ active: true, currentWindow: true }, async tabs => {
  currentTab = tabs[0] || null;
  if (!currentTab || !currentTab.url) return;

  const url = currentTab.url;

  // Chrome internal pages have no real URL/content to capture.
  if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:')) {
    document.getElementById('unsaveable-msg').classList.remove('hidden');
    document.getElementById('capture-preview').classList.add('hidden');
    document.getElementById('btn-save').disabled = true;
    return;
  }

  document.getElementById('capture-preview-title').textContent = currentTab.title || url;
  document.getElementById('capture-preview-url').textContent = url;

  // Best-effort image — the content script's og:image first, Microlink (via the background
  // worker) as a fallback, same chain the old review screen used silently. Purely cosmetic here
  // (the preview thumbnail below); savecraft.org's own Add flow can always add/change an image
  // manually regardless of whether this finds one.
  try {
    const response = await chrome.tabs.sendMessage(currentTab.id, { action: 'getPageInfo' });
    fetchedImageUrl = response?.imageUrl || null;
  } catch {} // no content script on this page (e.g. it loaded before the extension did)
  if (!fetchedImageUrl) {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'fetchImage', url });
      fetchedImageUrl = response?.imageUrl || null;
    } catch {}
  }
  if (fetchedImageUrl) {
    const img = document.getElementById('capture-preview-img');
    img.src = fetchedImageUrl;
    img.classList.remove('hidden');
  }
});

function openSaveCraft(path) {
  chrome.tabs.create({ url: SAVECRAFT_URL + path });
  window.close();
}

document.getElementById('btn-save').addEventListener('click', () => {
  if (!currentTab?.url) return;
  // Param names main.js's init() looks for on load — see setPendingCapture()/showReviewScreen()
  // in addEditModal.js on the receiving end.
  const params = new URLSearchParams({ captureUrl: currentTab.url, captureTitle: currentTab.title || '' });
  if (fetchedImageUrl) params.set('captureImage', fetchedImageUrl);
  openSaveCraft(`/?${params.toString()}`);
});

document.getElementById('btn-open-library').addEventListener('click', () => openSaveCraft('/'));
