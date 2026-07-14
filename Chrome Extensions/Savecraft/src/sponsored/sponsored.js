// Navigates this tab back into the SaveCraft app (window.opener isn't available here since
// the link that opened this page uses rel="noopener").
document.getElementById('link-savecraft').href = chrome.runtime.getURL('src/app/index.html');
