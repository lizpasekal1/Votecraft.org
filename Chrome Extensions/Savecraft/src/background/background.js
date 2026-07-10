const CATEGORIES = [
  { id: 'Music', label: '🎵 Music' },
  { id: 'Shows', label: '📺 Shows' },
  { id: 'Books', label: '📚 Books' },
  { id: 'Movies', label: '🎬 Movies' },
  { id: 'Games', label: '🎮 Games' },
  { id: 'Memes', label: '🤣 Memes' },
];

// Create context menus on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'savecraft-parent',
    title: 'Save to SaveCraft',
    contexts: ['page', 'link'],
  });

  CATEGORIES.forEach(cat => {
    chrome.contextMenus.create({
      id: `save-${cat.id}`,
      parentId: 'savecraft-parent',
      title: cat.label,
      contexts: ['page', 'link'],
    });
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const catId = info.menuItemId.replace('save-', '');
  if (!CATEGORIES.find(c => c.id === catId)) return;

  const isLink = !!info.linkUrl;
  const url = info.linkUrl || info.pageUrl;
  const title = isLink
    ? (info.selectionText || getDomain(url))
    : (tab.title || getDomain(url));

  let imageUrl = null;

  if (!isLink && tab.id) {
    // Try to get og:image from the current page via content script
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getPageInfo' });
      imageUrl = response?.imageUrl || null;
    } catch {
      // Content script not available (e.g. chrome:// pages)
    }
  }

  // For links or if no image found, try Microlink
  if (!imageUrl) {
    imageUrl = await fetchImageFromMicrolink(url);
  }

  await saveItem({ url, title, imageUrl, category: catId });
});

// Handle messages from popup and app page
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'openLibrary') {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/app/index.html') });
    sendResponse({ ok: true });
  }

  if (msg.action === 'fetchImage') {
    fetchImageFromMicrolink(msg.url).then(imageUrl => sendResponse({ imageUrl }));
    return true; // keep channel open for async response
  }
});

async function fetchImageFromMicrolink(url) {
  try {
    const res = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`);
    const data = await res.json();
    return data?.data?.image?.url || data?.data?.logo?.url || null;
  } catch {
    return null;
  }
}

async function saveItem(itemData) {
  const id = Date.now().toString();
  const item = {
    id,
    url: itemData.url,
    title: itemData.title,
    imageUrl: itemData.imageUrl || null,
    category: itemData.category,
    folderId: null,
    done: false,
    savedAt: Date.now(),
  };
  return new Promise(resolve => {
    chrome.storage.sync.set({ [`item_${id}`]: item }, resolve);
  });
}

function getDomain(url) {
  try { return new URL(url).hostname.replace('www.', ''); }
  catch { return url; }
}
