// This page is served on both the extension (chrome-extension://) and the web build
// (savecraft.org) — see platform.js for why chrome.runtime.getURL can't be called directly here,
// it doesn't exist on web and throws.
import { resourceUrl } from '../app/js/platform.js';

// Navigates this tab back into the SaveCraft app (window.opener isn't available here since
// the link that opened this page uses rel="noopener").
document.getElementById('link-savecraft').href = resourceUrl('src/app/index.html');
