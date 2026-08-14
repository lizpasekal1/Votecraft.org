/**
 * SaveCraft Admin — "Demo Content" section. Edits the 3 Dashboard widgets' fallback content
 * (dashboard_demo_config Firestore collection, public-read/admin-write) via this plugin's own
 * REST routes — same never-touch-Firestore-from-the-browser shape as admin-kanban.js.
 */
(function () {
  'use strict';

  var CATEGORIES = ['Web Links', 'Show', 'Musician', 'Music Album', 'Game', 'Movie', 'Book', 'Visual Art'];
  var CURATED_GENRES = ['Top 100', 'Futurism', 'Fantasy', 'Thriller', 'Pop', 'Classic', 'Jazz', 'Comedy'];

  var rsCards = []; // Recent Saves demo cards, kept in sync with Firestore on every add/remove
  var curatedSearchCache = null; // lazily fetched, cached for the life of the page

  function showError(message) {
    var el = document.getElementById('vc-savecraft-demo-error');
    if (!el) return;
    el.textContent = message;
    el.style.display = 'block';
  }
  function clearError() {
    var el = document.getElementById('vc-savecraft-demo-error');
    if (el) el.style.display = 'none';
  }

  function apiFetch(path, options) {
    options = options || {};
    options.headers = Object.assign(
      { 'X-WP-Nonce': vcSaveCraftDemoContent.nonce, 'Content-Type': 'application/json' },
      options.headers || {}
    );
    return fetch(vcSaveCraftDemoContent.restUrl + path, options).then(function (resp) {
      return resp.json().then(function (data) {
        if (!resp.ok) throw new Error(data.message || 'Request failed (' + resp.status + ')');
        return data;
      });
    });
  }

  function escapeHtml(s) {
    var div = document.createElement('div');
    div.textContent = s == null ? '' : String(s);
    return div.innerHTML;
  }

  /* ─── Queue Kanban demo card ─── */

  function loadQueueKanban() {
    var titleInput = document.getElementById('vc-savecraft-demo-qk-title');
    var catSelect = document.getElementById('vc-savecraft-demo-qk-category');
    var imageInput = document.getElementById('vc-savecraft-demo-qk-image');
    if (!titleInput) return; // section not on this page

    apiFetch('demo-config/queue-kanban', { method: 'GET' }).then(function (data) {
      titleInput.value = data.title || '';
      catSelect.value = data.category || 'Book';
      imageInput.value = data.imageUrl || '';
    }).catch(function (err) { showError('Failed to load Queue Kanban demo config: ' + err.message); });

    document.getElementById('vc-savecraft-demo-qk-save').addEventListener('click', function () {
      clearError();
      apiFetch('demo-config/queue-kanban', {
        method: 'POST',
        body: JSON.stringify({
          title: titleInput.value.trim(),
          category: catSelect.value,
          imageUrl: imageInput.value.trim(),
        }),
      }).catch(function (err) { showError('Failed to save Queue Kanban demo config: ' + err.message); });
    });
  }

  /* ─── Recent Saves demo cards ─── */

  function renderRecentSaves() {
    var list = document.getElementById('vc-savecraft-demo-rs-list');
    if (!list) return;
    if (!rsCards.length) {
      list.innerHTML = '<p class="description">No demo cards configured — falls back to auto-picked Top 100 Musicians/Albums.</p>';
      return;
    }
    list.innerHTML = rsCards.map(function (c, i) {
      return '<div class="vc-savecraft-demo-rs-card">' +
        (c.imageUrl ? '<img src="' + escapeHtml(c.imageUrl) + '" alt="">' : '<span class="vc-savecraft-demo-rs-card-noimg">' + escapeHtml((c.category || '?')[0]) + '</span>') +
        '<span class="vc-savecraft-demo-rs-card-title">' + escapeHtml(c.title) + '</span>' +
        '<span class="vc-savecraft-demo-rs-card-cat">' + escapeHtml(c.category) + '</span>' +
        '<button type="button" class="button-link-delete vc-savecraft-demo-rs-remove" data-i="' + i + '">Remove</button>' +
        '</div>';
    }).join('');
    list.querySelectorAll('.vc-savecraft-demo-rs-remove').forEach(function (btn) {
      btn.addEventListener('click', function () {
        rsCards.splice(parseInt(btn.dataset.i, 10), 1);
        saveRecentSaves();
      });
    });
  }

  function saveRecentSaves() {
    renderRecentSaves();
    clearError();
    return apiFetch('demo-config/recent-saves', {
      method: 'POST',
      body: JSON.stringify({ cards: rsCards }),
    }).catch(function (err) { showError('Failed to save Recent Saves demo cards: ' + err.message); });
  }

  function loadRecentSaves() {
    var list = document.getElementById('vc-savecraft-demo-rs-list');
    if (!list) return;
    apiFetch('demo-config/recent-saves', { method: 'GET' }).then(function (data) {
      rsCards = data.cards || [];
      renderRecentSaves();
    }).catch(function (err) { showError('Failed to load Recent Saves demo cards: ' + err.message); });

    document.getElementById('vc-savecraft-demo-rs-add-custom').addEventListener('click', openCustomCardModal);
    document.getElementById('vc-savecraft-demo-rs-add-curated').addEventListener('click', openCuratedPickerModal);
  }

  /* ─── "Add Custom Card" modal ─── */

  var customModal = null;
  function ensureCustomModal() {
    if (customModal) return customModal;
    var overlay = document.createElement('div');
    overlay.className = 'vc-savecraft-modal-overlay';
    overlay.innerHTML =
      '<div class="vc-savecraft-modal">' +
      '<h2>New Custom Demo Card</h2>' +
      '<p><label>Title<br><input type="text" id="vc-savecraft-custom-title" class="widefat"></label></p>' +
      '<p><label>Image URL<br><input type="url" id="vc-savecraft-custom-image" class="widefat"></label></p>' +
      '<p><label>Category<br><select id="vc-savecraft-custom-category">' +
      CATEGORIES.map(function (c) { return '<option value="' + c + '">' + c + '</option>'; }).join('') +
      '</select></label></p>' +
      '<div class="vc-savecraft-modal-actions"><span></span><span class="vc-savecraft-modal-actions-right">' +
      '<button type="button" class="button" id="vc-savecraft-custom-cancel">Cancel</button> ' +
      '<button type="button" class="button button-primary" id="vc-savecraft-custom-save">Add</button>' +
      '</span></div></div>';
    document.body.appendChild(overlay);
    customModal = overlay;

    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeCustomModal(); });
    document.getElementById('vc-savecraft-custom-cancel').addEventListener('click', closeCustomModal);
    document.getElementById('vc-savecraft-custom-save').addEventListener('click', function () {
      var title = document.getElementById('vc-savecraft-custom-title').value.trim();
      if (!title) { closeCustomModal(); return; }
      rsCards.push({
        id: 'demo-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
        title: title,
        imageUrl: document.getElementById('vc-savecraft-custom-image').value.trim(),
        category: document.getElementById('vc-savecraft-custom-category').value,
      });
      closeCustomModal();
      saveRecentSaves();
    });
    return overlay;
  }
  function openCustomCardModal() {
    ensureCustomModal();
    document.getElementById('vc-savecraft-custom-title').value = '';
    document.getElementById('vc-savecraft-custom-image').value = '';
    customModal.classList.add('open');
  }
  function closeCustomModal() {
    if (customModal) customModal.classList.remove('open');
  }

  /* ─── "Add from Curated" picker modal — searches Top 100 Musicians/Music Albums ─── */

  var pickerModal = null;
  function ensurePickerModal() {
    if (pickerModal) return pickerModal;
    var overlay = document.createElement('div');
    overlay.className = 'vc-savecraft-modal-overlay';
    overlay.innerHTML =
      '<div class="vc-savecraft-modal vc-savecraft-picker-modal">' +
      '<h2>Add from Curated (Top 100)</h2>' +
      '<input type="text" id="vc-savecraft-picker-search" class="widefat" placeholder="Search by title…">' +
      '<div id="vc-savecraft-picker-results" class="vc-savecraft-picker-results"><p>Loading…</p></div>' +
      '<div class="vc-savecraft-modal-actions"><span></span><span class="vc-savecraft-modal-actions-right">' +
      '<button type="button" class="button" id="vc-savecraft-picker-close">Close</button>' +
      '</span></div></div>';
    document.body.appendChild(overlay);
    pickerModal = overlay;

    overlay.addEventListener('click', function (e) { if (e.target === overlay) closePickerModal(); });
    document.getElementById('vc-savecraft-picker-close').addEventListener('click', closePickerModal);
    document.getElementById('vc-savecraft-picker-search').addEventListener('input', function () {
      renderPickerResults(this.value.trim().toLowerCase());
    });
    return overlay;
  }

  function renderPickerResults(query) {
    var el = document.getElementById('vc-savecraft-picker-results');
    if (!curatedSearchCache) return;
    var filtered = query
      ? curatedSearchCache.filter(function (i) { return i.title.toLowerCase().indexOf(query) !== -1; })
      : curatedSearchCache;
    var shown = filtered.slice(0, 60); // bounded — this is a browse/search list, not a full table
    if (!shown.length) {
      el.innerHTML = '<p>No matches.</p>';
      return;
    }
    el.innerHTML = shown.map(function (item) {
      return '<button type="button" class="vc-savecraft-picker-item" data-id="' + escapeHtml(item.id) + '">' +
        '<img src="' + escapeHtml(item.imageUrl) + '" alt="">' +
        '<span>' + escapeHtml(item.title) + '<small>' + escapeHtml(item.category) + '</small></span>' +
        '</button>';
    }).join('');
    el.querySelectorAll('.vc-savecraft-picker-item').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var item = curatedSearchCache.find(function (i) { return i.id === btn.dataset.id; });
        if (!item) return;
        rsCards.push({
          id: 'demo-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
          title: item.title, imageUrl: item.imageUrl, category: item.category,
        });
        saveRecentSaves();
        closePickerModal();
      });
    });
  }

  function openCuratedPickerModal() {
    ensurePickerModal();
    document.getElementById('vc-savecraft-picker-search').value = '';
    pickerModal.classList.add('open');
    if (curatedSearchCache) {
      renderPickerResults('');
      return;
    }
    document.getElementById('vc-savecraft-picker-results').innerHTML = '<p>Loading…</p>';
    apiFetch('curated-search', { method: 'GET' }).then(function (data) {
      curatedSearchCache = data;
      renderPickerResults('');
    }).catch(function (err) {
      document.getElementById('vc-savecraft-picker-results').innerHTML = '<p>Failed to load: ' + escapeHtml(err.message) + '</p>';
    });
  }
  function closePickerModal() {
    if (pickerModal) pickerModal.classList.remove('open');
  }

  /* ─── Curated Lists widget config ─── */

  // No reorder UI yet, per direct request scope — all 8 genres always shown in their default
  // (CURATED_GENRES) order, each with an editable display name + cover image only. Reordering
  // could be added later the same way Admin Kanban's own drag-and-drop works, if needed.
  function loadCuratedLists() {
    var list = document.getElementById('vc-savecraft-demo-cl-list');
    if (!list) return;

    apiFetch('demo-config/curated-lists', { method: 'GET' }).then(function (data) {
      var byGenre = {};
      (data.genres || []).forEach(function (g) { byGenre[g.genre] = g; });

      list.innerHTML = CURATED_GENRES.map(function (genre) {
        var g = byGenre[genre] || {};
        return '<div class="vc-savecraft-demo-cl-row" data-genre="' + escapeHtml(genre) + '">' +
          '<strong>' + escapeHtml(genre) + '</strong>' +
          '<input type="text" class="vc-savecraft-cl-name" placeholder="Display name (default: ' + escapeHtml(genre) + ')" value="' + escapeHtml(g.displayName || '') + '">' +
          '<input type="url" class="vc-savecraft-cl-cover" placeholder="Cover image URL (default: auto)" value="' + escapeHtml(g.coverUrl || '') + '">' +
          '</div>';
      }).join('');
    }).catch(function (err) { showError('Failed to load Curated Lists config: ' + err.message); });

    document.getElementById('vc-savecraft-demo-cl-save').addEventListener('click', function () {
      clearError();
      var genres = Array.prototype.map.call(list.querySelectorAll('.vc-savecraft-demo-cl-row'), function (row) {
        return {
          genre: row.dataset.genre,
          displayName: row.querySelector('.vc-savecraft-cl-name').value.trim(),
          coverUrl: row.querySelector('.vc-savecraft-cl-cover').value.trim(),
        };
      });
      apiFetch('demo-config/curated-lists', {
        method: 'POST',
        body: JSON.stringify({ genres: genres }),
      }).catch(function (err) { showError('Failed to save Curated Lists config: ' + err.message); });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    loadQueueKanban();
    loadRecentSaves();
    loadCuratedLists();
  });
})();
