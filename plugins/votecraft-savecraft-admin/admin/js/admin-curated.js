/**
 * SaveCraft Admin — "Curated Lists" / "Topics" / "Curated Items" sections.
 * Drives the curated_lists / curated_topics / curated_items Firestore collections through this
 * plugin's own REST routes (votecraft-savecraft/v1/curated-*). Same never-touch-Firestore-from-
 * the-browser shape as admin-kanban.js / admin-demo-content.js.
 */
(function () {
  'use strict';

  var CFG = window.vcSaveCraftCurated || {};
  var CATEGORIES = CFG.categories || [];
  var FOLDERS = CFG.folders || {}; // { [category]: { folderId: label } }

  var lists = [];   // curated_lists docs
  var topics = [];  // curated_topics docs

  function apiFetch(path, options) {
    options = options || {};
    options.headers = Object.assign(
      { 'X-WP-Nonce': CFG.nonce, 'Content-Type': 'application/json' },
      options.headers || {}
    );
    return fetch(CFG.restUrl + path, options).then(function (resp) {
      return resp.json().then(function (data) {
        if (!resp.ok) throw new Error((data && data.message) || 'Request failed (' + resp.status + ')');
        return data;
      });
    });
  }

  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }
  function slugify(s) {
    return String(s || '').toLowerCase().trim().replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '');
  }
  function showError(id, msg) {
    var el = document.getElementById(id);
    if (el) { el.textContent = msg; el.style.display = 'block'; }
  }
  function clearError(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'none';
  }
  function rand() { return Math.random().toString(36).slice(2, 8); }

  /* ─────────────────────────── Curated Lists ─────────────────────────── */

  function listFormHtml(list, isNew) {
    var enabled = list.enabledCategories || [];
    var listTopics = list.topics || [];
    var catBoxes = CATEGORIES.map(function (c) {
      return '<label class="vc-inline"><input type="checkbox" data-field="cat" value="' + esc(c) + '"' +
        (enabled.indexOf(c) !== -1 ? ' checked' : '') + '> ' + esc(c) + '</label>';
    }).join('');
    var topicBoxes = topics.length ? topics.map(function (t) {
      return '<label class="vc-inline"><input type="checkbox" data-field="topic" value="' + esc(t.slug) + '"' +
        (listTopics.indexOf(t.slug) !== -1 ? ' checked' : '') + '> ' + esc(t.name || t.slug) + '</label>';
    }).join('') : '<em>No topics yet — add one in the Topics section.</em>';

    return '' +
      '<div class="vc-curated-form" data-slug="' + esc(list.slug || '') + '">' +
        '<table class="form-table"><tbody>' +
          '<tr><th>Name</th><td><input type="text" data-field="name" class="regular-text" value="' + esc(list.name || '') + '"></td></tr>' +
          '<tr><th>Slug</th><td><input type="text" data-field="slug" class="regular-text" value="' + esc(list.slug || '') + '"' + (isNew ? '' : ' readonly') + '>' +
            (isNew ? ' <span class="description">lowercase, letters/numbers/dashes. This is the app URL key.</span>' : '') + '</td></tr>' +
          '<tr><th>Short name</th><td><input type="text" data-field="shortName" class="regular-text" value="' + esc(list.shortName || '') + '"></td></tr>' +
          '<tr><th>Headline</th><td><input type="text" data-field="headline" class="regular-text" value="' + esc(list.headline || '') + '"></td></tr>' +
          '<tr><th>Description</th><td><textarea data-field="description" class="large-text" rows="3">' + esc(list.description || '') + '</textarea></td></tr>' +
          '<tr><th>Wordmark URL</th><td><input type="url" data-field="wordmarkUrl" class="regular-text" value="' + esc(list.wordmarkUrl || '') + '"></td></tr>' +
          '<tr><th>Icon URL</th><td><input type="url" data-field="iconUrl" class="regular-text" value="' + esc(list.iconUrl || '') + '"></td></tr>' +
          '<tr><th>Cover URL</th><td><input type="url" data-field="coverUrl" class="regular-text" value="' + esc(list.coverUrl || '') + '"></td></tr>' +
          '<tr><th>Category tabs</th><td class="vc-checkgrid">' + catBoxes + '</td></tr>' +
          '<tr><th>Topics</th><td class="vc-checkgrid">' + topicBoxes + '</td></tr>' +
          '<tr><th>Published</th><td><label><input type="checkbox" data-field="published"' + (list.published ? ' checked' : '') + '> visible in the app</label></td></tr>' +
          '<tr><th>WP owner user ID</th><td><input type="number" data-field="wpOwnerUserId" value="' + esc(list.wpOwnerUserId == null ? '' : list.wpOwnerUserId) + '"> <span class="description">Phase 2 — leave blank</span></td></tr>' +
          '<tr><th>Client owner UID</th><td><input type="text" data-field="clientOwnerUid" class="regular-text" value="' + esc(list.clientOwnerUid || '') + '"> <span class="description">Phase 2 — leave blank</span></td></tr>' +
        '</tbody></table>' +
        '<p>' +
          '<button type="button" class="button button-primary" data-action="save-list">Save</button> ' +
          (isNew ? '' : '<button type="button" class="button" data-action="delete-list">Delete</button> ') +
          '<button type="button" class="button-link" data-action="cancel-list">Cancel</button>' +
        '</p>' +
      '</div>';
  }

  function renderLists() {
    var box = document.getElementById('vc-savecraft-curated-lists');
    if (!box) return;
    if (!lists.length) {
      box.innerHTML = '<p><em>No nonprofit lists yet.</em></p>';
      return;
    }
    box.innerHTML = lists.map(function (l) {
      return '<div class="vc-curated-row">' +
        '<button type="button" class="button-link vc-curated-toggle" data-slug="' + esc(l.slug) + '">' +
          esc(l.name || l.slug) + ' <code>' + esc(l.slug) + '</code>' + (l.published ? '' : ' <em>(draft)</em>') +
        '</button>' +
        '<div class="vc-curated-detail" data-slug="' + esc(l.slug) + '" hidden></div>' +
      '</div>';
    }).join('');
  }

  function collectListForm(form) {
    var v = function (f) { var i = form.querySelector('[data-field="' + f + '"]'); return i ? i.value.trim() : ''; };
    var checked = function (f) { var i = form.querySelector('[data-field="' + f + '"]'); return !!(i && i.checked); };
    return {
      name: v('name'),
      slug: slugify(v('slug')),
      shortName: v('shortName'),
      headline: v('headline'),
      description: v('description'),
      wordmarkUrl: v('wordmarkUrl'),
      iconUrl: v('iconUrl'),
      coverUrl: v('coverUrl'),
      enabledCategories: Array.prototype.map.call(form.querySelectorAll('[data-field="cat"]:checked'), function (c) { return c.value; }),
      topics: Array.prototype.map.call(form.querySelectorAll('[data-field="topic"]:checked'), function (c) { return c.value; }),
      published: checked('published'),
      wpOwnerUserId: v('wpOwnerUserId'),
      clientOwnerUid: v('clientOwnerUid')
    };
  }

  function wireLists() {
    var box = document.getElementById('vc-savecraft-curated-lists');
    var addBtn = document.getElementById('vc-savecraft-curated-list-add');
    if (!box || !addBtn) return;

    box.addEventListener('click', function (e) {
      var toggle = e.target.closest('.vc-curated-toggle');
      if (toggle) {
        var detail = box.querySelector('.vc-curated-detail[data-slug="' + toggle.dataset.slug + '"]');
        if (!detail) return;
        if (detail.hidden) {
          var list = lists.filter(function (l) { return l.slug === toggle.dataset.slug; })[0] || {};
          detail.innerHTML = listFormHtml(list, false);
          detail.hidden = false;
        } else {
          detail.hidden = true;
          detail.innerHTML = '';
        }
        return;
      }
      var action = e.target.dataset.action;
      if (!action) return;
      var form = e.target.closest('.vc-curated-form');
      if (!form) return;

      if (action === 'cancel-list') {
        var d = form.closest('.vc-curated-detail');
        if (d) { d.hidden = true; d.innerHTML = ''; } else { renderLists(); }
      } else if (action === 'save-list') {
        var data = collectListForm(form);
        if (!data.slug) { alert('A slug is required.'); return; }
        clearError('vc-savecraft-curated-error');
        e.target.disabled = true;
        apiFetch('curated-lists/' + encodeURIComponent(data.slug), { method: 'POST', body: JSON.stringify(data) })
          .then(function () { return reloadLists(); })
          .then(function () { populateItemsListSelect(); })
          .catch(function (err) { showError('vc-savecraft-curated-error', 'Save failed: ' + err.message); })
          .then(function () { e.target.disabled = false; });
      } else if (action === 'delete-list') {
        if (!confirm('Delete this nonprofit list? Its curated_items are NOT deleted.')) return;
        var slug = form.dataset.slug;
        apiFetch('curated-lists/' + encodeURIComponent(slug), { method: 'DELETE' })
          .then(function () { return reloadLists(); })
          .then(function () { populateItemsListSelect(); })
          .catch(function (err) { showError('vc-savecraft-curated-error', 'Delete failed: ' + err.message); });
      }
    });

    addBtn.addEventListener('click', function () {
      var holder = document.createElement('div');
      holder.className = 'vc-curated-detail';
      holder.innerHTML = listFormHtml({}, true);
      box.appendChild(holder);
      holder.scrollIntoView({ block: 'nearest' });
    });
  }

  function reloadLists() {
    return apiFetch('curated-lists', { method: 'GET' }).then(function (data) {
      lists = (Array.isArray(data) ? data : []).sort(function (a, b) {
        return String(a.name || a._docId).localeCompare(String(b.name || b._docId));
      }).map(function (l) { return Object.assign({ slug: l.slug || l._docId }, l); });
      renderLists();
    });
  }

  /* ─────────────────────────── Topics ─────────────────────────── */

  function topicFormHtml(topic, isNew) {
    return '' +
      '<div class="vc-curated-form" data-slug="' + esc(topic.slug || '') + '">' +
        '<table class="form-table"><tbody>' +
          '<tr><th>Name</th><td><input type="text" data-field="name" class="regular-text" value="' + esc(topic.name || '') + '"></td></tr>' +
          '<tr><th>Slug</th><td><input type="text" data-field="slug" class="regular-text" value="' + esc(topic.slug || '') + '"' + (isNew ? '' : ' readonly') + '></td></tr>' +
          '<tr><th>Short name</th><td><input type="text" data-field="shortName" class="regular-text" value="' + esc(topic.shortName || '') + '"></td></tr>' +
          '<tr><th>Headline</th><td><input type="text" data-field="headline" class="regular-text" value="' + esc(topic.headline || '') + '"></td></tr>' +
          '<tr><th>Description</th><td><textarea data-field="description" class="large-text" rows="3">' + esc(topic.description || '') + '</textarea></td></tr>' +
          '<tr><th>Icon URL</th><td><input type="url" data-field="iconUrl" class="regular-text" value="' + esc(topic.iconUrl || '') + '"></td></tr>' +
          '<tr><th>Cover URL</th><td><input type="url" data-field="coverUrl" class="regular-text" value="' + esc(topic.coverUrl || '') + '"></td></tr>' +
          '<tr><th>Published</th><td><label><input type="checkbox" data-field="published"' + (topic.published ? ' checked' : '') + '> visible in the app</label></td></tr>' +
        '</tbody></table>' +
        '<p>' +
          '<button type="button" class="button button-primary" data-action="save-topic">Save</button> ' +
          (isNew ? '' : '<button type="button" class="button" data-action="delete-topic">Delete</button> ') +
          '<button type="button" class="button-link" data-action="cancel-topic">Cancel</button>' +
        '</p>' +
      '</div>';
  }

  function renderTopics() {
    var box = document.getElementById('vc-savecraft-topics');
    if (!box) return;
    box.innerHTML = topics.length ? topics.map(function (t) {
      return '<div class="vc-curated-row">' +
        '<button type="button" class="button-link vc-topic-toggle" data-slug="' + esc(t.slug) + '">' +
          esc(t.name || t.slug) + ' <code>' + esc(t.slug) + '</code>' + (t.published ? '' : ' <em>(draft)</em>') +
        '</button>' +
        '<div class="vc-topic-detail" data-slug="' + esc(t.slug) + '" hidden></div>' +
      '</div>';
    }).join('') : '<p><em>No topics yet.</em></p>';
  }

  function collectTopicForm(form) {
    var v = function (f) { var i = form.querySelector('[data-field="' + f + '"]'); return i ? i.value.trim() : ''; };
    var checked = function (f) { var i = form.querySelector('[data-field="' + f + '"]'); return !!(i && i.checked); };
    return {
      name: v('name'), slug: slugify(v('slug')), shortName: v('shortName'),
      headline: v('headline'), description: v('description'),
      iconUrl: v('iconUrl'), coverUrl: v('coverUrl'), published: checked('published')
    };
  }

  function wireTopics() {
    var box = document.getElementById('vc-savecraft-topics');
    var addBtn = document.getElementById('vc-savecraft-topic-add');
    if (!box || !addBtn) return;

    box.addEventListener('click', function (e) {
      var toggle = e.target.closest('.vc-topic-toggle');
      if (toggle) {
        var detail = box.querySelector('.vc-topic-detail[data-slug="' + toggle.dataset.slug + '"]');
        if (!detail) return;
        if (detail.hidden) {
          var topic = topics.filter(function (t) { return t.slug === toggle.dataset.slug; })[0] || {};
          detail.innerHTML = topicFormHtml(topic, false);
          detail.hidden = false;
        } else { detail.hidden = true; detail.innerHTML = ''; }
        return;
      }
      var action = e.target.dataset.action;
      if (!action) return;
      var form = e.target.closest('.vc-curated-form');
      if (!form) return;

      if (action === 'cancel-topic') {
        var d = form.closest('.vc-topic-detail');
        if (d) { d.hidden = true; d.innerHTML = ''; } else { renderTopics(); }
      } else if (action === 'save-topic') {
        var data = collectTopicForm(form);
        if (!data.slug) { alert('A slug is required.'); return; }
        clearError('vc-savecraft-topics-error');
        e.target.disabled = true;
        apiFetch('curated-topics/' + encodeURIComponent(data.slug), { method: 'POST', body: JSON.stringify(data) })
          .then(function () { return reloadTopics(); })
          .then(function () { renderLists(); })
          .catch(function (err) { showError('vc-savecraft-topics-error', 'Save failed: ' + err.message); })
          .then(function () { e.target.disabled = false; });
      } else if (action === 'delete-topic') {
        if (!confirm('Delete this topic? Lists tagged with it keep the tag string until you edit them.')) return;
        apiFetch('curated-topics/' + encodeURIComponent(form.dataset.slug), { method: 'DELETE' })
          .then(function () { return reloadTopics(); })
          .then(function () { renderLists(); })
          .catch(function (err) { showError('vc-savecraft-topics-error', 'Delete failed: ' + err.message); });
      }
    });

    addBtn.addEventListener('click', function () {
      var holder = document.createElement('div');
      holder.className = 'vc-topic-detail';
      holder.innerHTML = topicFormHtml({}, true);
      box.appendChild(holder);
      holder.scrollIntoView({ block: 'nearest' });
    });
  }

  function reloadTopics() {
    return apiFetch('curated-topics', { method: 'GET' }).then(function (data) {
      topics = (Array.isArray(data) ? data : []).sort(function (a, b) {
        return String(a.name || a._docId).localeCompare(String(b.name || b._docId));
      }).map(function (t) { return Object.assign({ slug: t.slug || t._docId }, t); });
      renderTopics();
    });
  }

  /* ─────────────────────────── Curated Items ─────────────────────────── */

  var itemsForList = [];      // current list's items
  var currentItemsList = null; // the selected curated_lists doc

  function populateItemsListSelect() {
    var sel = document.getElementById('vc-savecraft-items-list');
    if (!sel) return;
    var keep = sel.value;
    sel.innerHTML = '<option value="">— pick a list —</option>' + lists.map(function (l) {
      return '<option value="' + esc(l.slug) + '">' + esc(l.name || l.slug) + '</option>';
    }).join('');
    if (keep && lists.some(function (l) { return l.slug === keep; })) sel.value = keep;
  }

  function folderOptions(category, selected) {
    var map = FOLDERS[category] || {};
    var opts = '<option value="">— no folder —</option>';
    Object.keys(map).forEach(function (fid) {
      opts += '<option value="' + esc(fid) + '"' + (fid === selected ? ' selected' : '') + '>' + esc(map[fid]) + '</option>';
    });
    return opts;
  }

  function itemRowHtml(item) {
    var cats = (currentItemsList.enabledCategories || []);
    var catOpts = cats.map(function (c) {
      return '<option value="' + esc(c) + '"' + (c === item.category ? ' selected' : '') + '>' + esc(c) + '</option>';
    }).join('');
    return '' +
      '<tr class="vc-item-row" data-id="' + esc(item._docId || item.id) + '">' +
        '<td><input type="text" data-field="title" value="' + esc(item.title || '') + '" placeholder="Title"></td>' +
        '<td><input type="url" data-field="url" value="' + esc(item.url || '') + '" placeholder="https://"></td>' +
        '<td><input type="url" data-field="imageUrl" value="' + esc(item.imageUrl || '') + '" placeholder="image URL"></td>' +
        '<td><select data-field="category">' + catOpts + '</select></td>' +
        '<td><select data-field="folderId">' + folderOptions(item.category || cats[0], item.folderId || '') + '</select></td>' +
        '<td><input type="text" data-field="notes" value="' + esc(item.notes || '') + '" placeholder="note"></td>' +
        '<td>' +
          '<button type="button" class="button button-small" data-action="save-item">Save</button> ' +
          '<button type="button" class="button button-small" data-action="delete-item">✕</button>' +
        '</td>' +
      '</tr>';
  }

  function renderItems() {
    var box = document.getElementById('vc-savecraft-items');
    if (!box) return;
    if (!currentItemsList) { box.innerHTML = ''; return; }
    box.innerHTML = '' +
      '<table class="widefat vc-items-table"><thead><tr>' +
        '<th>Title</th><th>URL</th><th>Image URL</th><th>Category</th><th>Folder / tab</th><th>Note</th><th></th>' +
      '</tr></thead><tbody>' +
        itemsForList.map(itemRowHtml).join('') +
      '</tbody></table>';
  }

  function collectItemRow(row) {
    var v = function (f) { var i = row.querySelector('[data-field="' + f + '"]'); return i ? i.value.trim() : ''; };
    return {
      list: currentItemsList.slug,
      id: row.dataset.id,
      title: v('title'), url: v('url'), imageUrl: v('imageUrl'),
      category: v('category'), folderId: v('folderId'), notes: v('notes')
    };
  }

  function wireItems() {
    var sel = document.getElementById('vc-savecraft-items-list');
    var addBtn = document.getElementById('vc-savecraft-item-add');
    var box = document.getElementById('vc-savecraft-items');
    if (!sel || !addBtn || !box) return;

    sel.addEventListener('change', function () {
      clearError('vc-savecraft-items-error');
      var slug = sel.value;
      currentItemsList = lists.filter(function (l) { return l.slug === slug; })[0] || null;
      addBtn.disabled = !currentItemsList;
      if (!currentItemsList) { itemsForList = []; renderItems(); return; }
      box.innerHTML = '<p>Loading…</p>';
      apiFetch('curated-items?list=' + encodeURIComponent(slug), { method: 'GET' }).then(function (data) {
        itemsForList = (Array.isArray(data) ? data : []).sort(function (a, b) {
          return String(a.title || '').localeCompare(String(b.title || ''));
        });
        renderItems();
      }).catch(function (err) { showError('vc-savecraft-items-error', 'Load failed: ' + err.message); box.innerHTML = ''; });
    });

    box.addEventListener('change', function (e) {
      if (e.target.dataset.field === 'category') {
        var row = e.target.closest('.vc-item-row');
        var folderSel = row.querySelector('[data-field="folderId"]');
        folderSel.innerHTML = folderOptions(e.target.value, '');
      }
    });

    box.addEventListener('click', function (e) {
      var action = e.target.dataset.action;
      if (!action) return;
      var row = e.target.closest('.vc-item-row');
      if (!row || !currentItemsList) return;

      if (action === 'save-item') {
        var data = collectItemRow(row);
        if (!data.title) { alert('A title is required.'); return; }
        clearError('vc-savecraft-items-error');
        e.target.disabled = true;
        apiFetch('curated-items/' + encodeURIComponent(data.id), { method: 'POST', body: JSON.stringify(data) })
          .catch(function (err) { showError('vc-savecraft-items-error', 'Save failed: ' + err.message); })
          .then(function () { e.target.disabled = false; });
      } else if (action === 'delete-item') {
        if (!confirm('Delete this item?')) return;
        apiFetch('curated-items/' + encodeURIComponent(row.dataset.id), { method: 'DELETE' })
          .then(function () { row.parentNode.removeChild(row); })
          .catch(function (err) { showError('vc-savecraft-items-error', 'Delete failed: ' + err.message); });
      }
    });

    addBtn.addEventListener('click', function () {
      if (!currentItemsList) return;
      var cats = currentItemsList.enabledCategories || [];
      var newItem = {
        _docId: currentItemsList.slug + '-' + (cats[0] || 'item').toLowerCase().replace(/[^\w]+/g, '') + '-' + rand(),
        id: 'cur-' + currentItemsList.slug + '-' + rand(),
        category: cats[0] || '', folderId: '', title: '', url: '', imageUrl: '', notes: ''
      };
      var tbody = box.querySelector('tbody');
      if (!tbody) { itemsForList.unshift(newItem); renderItems(); return; }
      tbody.insertAdjacentHTML('afterbegin', itemRowHtml(newItem));
    });
  }

  /* ─────────────────────────── Init ─────────────────────────── */

  document.addEventListener('DOMContentLoaded', function () {
    if (!document.getElementById('vc-savecraft-curated-lists')) return; // section not on this page

    wireLists();
    wireTopics();
    wireItems();

    // Topics first — the Curated Lists form needs them for its topic checklist.
    reloadTopics()
      .then(reloadLists)
      .then(function () {
        renderLists();
        populateItemsListSelect();
      })
      .catch(function (err) {
        showError('vc-savecraft-curated-error', 'Failed to load: ' + err.message);
      });
  });
})();
