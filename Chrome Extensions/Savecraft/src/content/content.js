// Listens for messages from the background service worker or popup
// and returns metadata from the current page (og:image, title, description)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'getPageInfo') {
    const imageUrl =
      document.querySelector('meta[property="og:image"]')?.content ||
      document.querySelector('meta[name="twitter:image"]')?.content ||
      document.querySelector('meta[name="twitter:image:src"]')?.content ||
      null;

    const title =
      document.querySelector('meta[property="og:title"]')?.content ||
      document.title ||
      null;

    const description =
      document.querySelector('meta[property="og:description"]')?.content ||
      document.querySelector('meta[name="description"]')?.content ||
      null;

    sendResponse({ imageUrl, title, description });
  }
  return true; // keep message channel open for async response
});
