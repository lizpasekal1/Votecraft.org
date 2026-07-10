let selectedCategory = null;
let currentTab = null;

// Load current tab info
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  currentTab = tabs[0] || null;

  if (!currentTab || !currentTab.url) return;

  const url = currentTab.url;

  // Chrome internal pages can't be saved
  if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:')) {
    document.getElementById('page-preview').classList.add('hidden');
    document.getElementById('unsaveable-msg').classList.remove('hidden');
    document.getElementById('btn-save').disabled = true;
    return;
  }

  let domain = '';
  try { domain = new URL(url).hostname.replace('www.', ''); } catch {}

  document.getElementById('page-title').textContent = currentTab.title || domain || 'Unknown page';
  document.getElementById('page-domain').textContent = domain;
});

// Category selection
document.querySelectorAll('.cat-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedCategory = btn.dataset.cat;
  });
});

// Open full library page
document.getElementById('btn-open-library').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'openLibrary' });
  window.close();
});

// Save current page
document.getElementById('btn-save').addEventListener('click', async () => {
  if (!currentTab || !currentTab.url) return;
  if (!selectedCategory) {
    // Pulse the category section to prompt selection
    document.querySelector('.cat-grid').style.outline = '2px solid #EF4444';
    document.querySelector('.cat-grid').style.borderRadius = '8px';
    setTimeout(() => {
      document.querySelector('.cat-grid').style.outline = '';
    }, 1200);
    return;
  }

  const url = currentTab.url;
  const title = currentTab.title || '';

  document.getElementById('btn-save').disabled = true;
  document.getElementById('btn-save').textContent = 'Saving...';

  // Try to get og:image from content script
  let imageUrl = null;
  try {
    const response = await chrome.tabs.sendMessage(currentTab.id, { action: 'getPageInfo' });
    imageUrl = response?.imageUrl || null;
  } catch {
    // Content script not available — fall back to Microlink
  }

  // If no image, ask background to fetch via Microlink
  if (!imageUrl) {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'fetchImage', url });
      imageUrl = response?.imageUrl || null;
    } catch {}
  }

  const id = Date.now().toString();
  const item = {
    id,
    url,
    title: title || new URL(url).hostname.replace('www.', ''),
    imageUrl,
    category: selectedCategory,
    folderId: null,
    done: false,
    savedAt: Date.now(),
  };

  chrome.storage.sync.set({ [`item_${id}`]: item }, () => {
    document.getElementById('btn-save').style.display = 'none';
    document.getElementById('saved-msg').classList.remove('hidden');
    setTimeout(() => window.close(), 1000);
  });
});
