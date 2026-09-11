// ===== PLATFORM SHIM =====
// Lets the rest of the app run unmodified in two environments: as the packed Chrome extension
// (chrome.* APIs available) and as a plain web page at savecraft.org (no chrome.* APIs at all —
// Firestore is the sole data store there, behind a required sign-in gate, see main.js's init()).
// Every other file imports from here instead of touching chrome.* directly, so environment
// detection happens exactly once.

export const isExtension = typeof chrome !== 'undefined' && !!chrome.runtime?.id;

// ===== STORAGE: chrome.storage.sync/local -> localStorage on web =====
// Same get/set/remove/onChanged call shape as chrome.storage.sync/local, so storage.js's
// existing merge/load logic (loadAll, runInitialSync, _mergeCollection) needs zero logic changes
// — only the backing store differs. localStorage has no built-in cross-device sync, but that's
// fine here: on web, signed-in Firestore is the real source of truth (runInitialSync already
// merges it down into this "local" store on sign-in); this is just a fast local cache.

const _SYNC_PREFIX = 'savecraft_sync::';
const _LOCAL_PREFIX = 'savecraft_local::';

function _parse(raw) {
  if (raw === null) return undefined;
  try { return JSON.parse(raw); } catch { return undefined; }
}

function _webStorageArea(prefix, areaName) {
  const listeners = [];
  if (typeof window !== 'undefined') {
    // Native cross-tab signal — fires in every OTHER same-origin tab when localStorage changes,
    // never in the tab that made the write itself. That matches chrome.storage.onChanged's actual
    // role here (see main.js): reflecting writes made elsewhere (another tab; on the extension,
    // also the right-click capture background script) into an already-open library view, not
    // echoing a tab's own actions back to itself (callers already update `state` directly for those).
    window.addEventListener('storage', e => {
      if (e.key === null || !e.key.startsWith(prefix)) return;
      const key = e.key.slice(prefix.length);
      const changes = { [key]: { newValue: _parse(e.newValue), oldValue: _parse(e.oldValue) } };
      listeners.forEach(cb => cb(changes, areaName));
    });
  }
  return {
    get(keys, callback) {
      const result = {};
      if (keys === null || keys === undefined) {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(prefix)) result[k.slice(prefix.length)] = _parse(localStorage.getItem(k));
        }
      } else if (typeof keys === 'string') {
        const v = _parse(localStorage.getItem(prefix + keys));
        if (v !== undefined) result[keys] = v;
      } else if (Array.isArray(keys)) {
        keys.forEach(k => {
          const v = _parse(localStorage.getItem(prefix + k));
          if (v !== undefined) result[k] = v;
        });
      } else {
        // Object of {key: default} — chrome.storage's third calling convention.
        Object.keys(keys).forEach(k => {
          const v = _parse(localStorage.getItem(prefix + k));
          result[k] = v !== undefined ? v : keys[k];
        });
      }
      // chrome.storage callbacks are always asynchronous — preserve that contract so callers
      // that fire-and-forget (no await) never accidentally rely on synchronous completion.
      if (callback) queueMicrotask(() => callback(result));
    },
    set(items, callback) {
      Object.entries(items).forEach(([k, v]) => localStorage.setItem(prefix + k, JSON.stringify(v)));
      if (callback) queueMicrotask(callback);
    },
    remove(keys, callback) {
      (Array.isArray(keys) ? keys : [keys]).forEach(k => localStorage.removeItem(prefix + k));
      if (callback) queueMicrotask(callback);
    },
    onChanged: { addListener(cb) { listeners.push(cb); } },
  };
}

export const storageSync = isExtension ? chrome.storage.sync : _webStorageArea(_SYNC_PREFIX, 'sync');
export const storageLocal = isExtension ? chrome.storage.local : _webStorageArea(_LOCAL_PREFIX, 'local');

// main.js listens on one combined chrome.storage.onChanged (both areas route through it, filtered
// by area name) — mirror that same combined shape here.
export const storageOnChanged = {
  addListener(cb) {
    if (isExtension) { chrome.storage.onChanged.addListener(cb); return; }
    storageSync.onChanged.addListener(cb);
    storageLocal.onChanged.addListener(cb);
  },
};

// ===== OPEN A URL IN A NEW TAB =====
// chrome.tabs.create is required inside the extension — a chrome-extension:// page doesn't
// reliably honor a plain new-tab open (see detailModalNotes.js) — but doesn't exist on web, where
// window.open is the normal mechanism.
export function openInNewTab(url) {
  if (isExtension) chrome.tabs.create({ url });
  else window.open(url, '_blank');
}

// ===== RESOLVE A PACKAGE-RELATIVE ASSET PATH =====
// chrome.runtime.getURL() only exists inside the extension; on the web deploy the same paths
// (images/, src/sponsored/sponsored.html) are served from the site root, so a leading slash is
// all that's needed. Absolute http(s) URLs pass through unchanged either way.
export function resourceUrl(path) {
  if (/^https?:\/\//.test(path)) return path;
  if (isExtension) return chrome.runtime.getURL(path);
  return '/' + path.replace(/^\/+/, '');
}
