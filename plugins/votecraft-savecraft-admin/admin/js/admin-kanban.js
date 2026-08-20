/**
 * SaveCraft Admin Kanban — wp-admin side. Talks only to this plugin's own REST routes
 * (votecraft-savecraft/v1/kanban), never to Firestore directly — see class-firestore-client.php
 * for why. Vanilla JS, no jQuery dependency, to keep this plugin's footprint small.
 *
 * Card shape and column keys are fixed to match the SaveCraft app's own adminKanban.js exactly
 * (see ADMIN_KANBAN_COLUMNS there) so cards created/edited here read correctly in the app, and
 * vice versa: { id, name, details, urgency: 'low'|'medium'|'high'|null, status, manualOrder,
 * createdAt }.
 */
(function () {
  'use strict';

  var COLUMNS = [
    { key: 'todo', label: 'TO DO' },
    { key: 'in-progress', label: 'IN PROGRESS' },
    { key: 'blocked', label: 'BLOCKED / NOTES' },
    { key: 'done', label: 'DONE' },
  ];

  var cards = [];
  var boardEl = document.getElementById('vc-savecraft-kanban-board');
  var errorEl = document.getElementById('vc-savecraft-kanban-error');
  var modalEl = null;
  var editingId = null; // null while adding a new card
  var newCardColumn = null;
  var dragId = null;

  function showError(message) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
  }
  function clearError() {
    errorEl.style.display = 'none';
  }

  function apiFetch(path, options) {
    options = options || {};
    options.headers = Object.assign(
      { 'X-WP-Nonce': vcSaveCraftAdmin.nonce, 'Content-Type': 'application/json' },
      options.headers || {}
    );
    return fetch(vcSaveCraftAdmin.restUrl + path, options).then(function (resp) {
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

  function cardsInColumn(key) {
    return cards
      .filter(function (c) { return c.status === key; })
      .sort(function (a, b) { return (a.manualOrder || 0) - (b.manualOrder || 0); });
  }

  function urgencyClass(u) {
    return u ? 'vc-urgency-' + u : '';
  }

  function render() {
    var html = '<div class="vc-savecraft-kanban-cols">';
    COLUMNS.forEach(function (col) {
      var colCards = cardsInColumn(col.key);
      html += '<div class="vc-savecraft-kanban-col" data-col="' + col.key + '">';
      html += '<div class="vc-savecraft-kanban-col-head">' + col.label +
        ' <span class="vc-savecraft-kanban-count">' + colCards.length + '</span></div>';
      html += '<div class="vc-savecraft-kanban-col-cards" data-col="' + col.key + '">';
      colCards.forEach(function (card) {
        html += '<div class="vc-savecraft-kcard ' + urgencyClass(card.urgency) + '" draggable="true" data-id="' + escapeHtml(card.id) + '">' +
          '<button type="button" class="vc-savecraft-kcard-remove" data-id="' + escapeHtml(card.id) + '" title="Delete">&times;</button>' +
          '<div class="vc-savecraft-kcard-name">' + escapeHtml(card.name) + '</div>' +
          (card.details ? '<div class="vc-savecraft-kcard-details">' + escapeHtml(card.details) + '</div>' : '') +
          '</div>';
      });
      html += '</div>';
      html += '<button type="button" class="button vc-savecraft-kanban-add" data-col="' + col.key + '">+ Add Task</button>';
      html += '</div>';
    });
    html += '</div>';
    boardEl.innerHTML = html;
    wireBoard();
  }

  function wireBoard() {
    boardEl.querySelectorAll('.vc-savecraft-kcard').forEach(function (el) {
      el.addEventListener('click', function (e) {
        if (e.target.closest('.vc-savecraft-kcard-remove')) return;
        openModal(cards.find(function (c) { return c.id === el.dataset.id; }));
      });
      el.addEventListener('dragstart', function () { dragId = el.dataset.id; });
    });
    boardEl.querySelectorAll('.vc-savecraft-kcard-remove').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        removeCard(btn.dataset.id);
      });
    });
    boardEl.querySelectorAll('.vc-savecraft-kanban-add').forEach(function (btn) {
      btn.addEventListener('click', function () { openModal(null, btn.dataset.col); });
    });
    boardEl.querySelectorAll('.vc-savecraft-kanban-col-cards').forEach(function (colEl) {
      colEl.addEventListener('dragover', function (e) { e.preventDefault(); });
      colEl.addEventListener('drop', function (e) {
        e.preventDefault();
        if (!dragId) return;
        handleDrop(colEl.dataset.col);
        dragId = null;
      });
    });
  }

  function handleDrop(newStatus) {
    var dragged = cards.find(function (c) { return c.id === dragId; });
    if (!dragged) return;
    var target = cardsInColumn(newStatus).filter(function (c) { return c.id !== dragId; });
    target.push(dragged);
    dragged.status = newStatus;
    target.forEach(function (c, i) { c.manualOrder = i; });
    render();
    // One POST per card whose manualOrder/status actually changed — same reasoning as the
    // SaveCraft app's own storage.js persistAdminKanbanCards(changedCards): each write only
    // touches its own doc, so it can't clobber a concurrent edit to some other card.
    target.forEach(function (c) { saveCard(c, { silent: true }); });
  }

  function removeCard(id) {
    if (!confirm('Delete this task?')) return;
    cards = cards.filter(function (c) { return c.id !== id; });
    render();
    apiFetch('/' + encodeURIComponent(id), { method: 'DELETE' }).catch(function (err) {
      showError('Failed to delete: ' + err.message);
      loadCards(); // re-sync with the server since the optimistic local removal may be wrong
    });
  }

  function saveCard(card, opts) {
    opts = opts || {};
    return apiFetch('/' + encodeURIComponent(card.id), {
      method: 'POST',
      body: JSON.stringify(card),
    }).catch(function (err) {
      if (!opts.silent) showError('Failed to save: ' + err.message);
      throw err;
    });
  }

  /* ─── modal ─── */

  function ensureModal() {
    if (modalEl) return modalEl;
    var overlay = document.createElement('div');
    overlay.className = 'vc-savecraft-modal-overlay';
    overlay.innerHTML =
      '<div class="vc-savecraft-modal">' +
      '<h2 id="vc-savecraft-modal-title">New Task</h2>' +
      '<p><label>Name<br><input type="text" id="vc-savecraft-name-input" class="widefat"></label></p>' +
      '<p><label>Details<br><textarea id="vc-savecraft-details-input" class="widefat" rows="4"></textarea></label></p>' +
      '<p><label>Urgency<br><select id="vc-savecraft-urgency-input">' +
      '<option value="">None</option><option value="low">Low</option>' +
      '<option value="medium">Medium</option><option value="high">High</option>' +
      '</select></label></p>' +
      '<p><label>Column<br><select id="vc-savecraft-status-input">' +
      COLUMNS.map(function (c) { return '<option value="' + c.key + '">' + c.label + '</option>'; }).join('') +
      '</select></label></p>' +
      '<div class="vc-savecraft-modal-actions">' +
      '<button type="button" class="button-link-delete" id="vc-savecraft-delete-btn">Delete</button>' +
      '<span class="vc-savecraft-modal-actions-right">' +
      '<button type="button" class="button" id="vc-savecraft-cancel-btn">Cancel</button> ' +
      '<button type="button" class="button button-primary" id="vc-savecraft-save-btn">Save</button>' +
      '</span></div></div>';
    document.body.appendChild(overlay);
    modalEl = overlay;

    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });
    document.getElementById('vc-savecraft-cancel-btn').addEventListener('click', closeModal);
    document.getElementById('vc-savecraft-save-btn').addEventListener('click', handleSave);
    document.getElementById('vc-savecraft-delete-btn').addEventListener('click', function () {
      if (editingId) removeCard(editingId);
      closeModal();
    });
    return overlay;
  }

  function openModal(card, columnForNew) {
    ensureModal();
    editingId = card ? card.id : null;
    newCardColumn = columnForNew || null;
    document.getElementById('vc-savecraft-modal-title').textContent = card ? 'Edit Task' : 'New Task';
    document.getElementById('vc-savecraft-name-input').value = card ? card.name : '';
    document.getElementById('vc-savecraft-details-input').value = card ? card.details : '';
    document.getElementById('vc-savecraft-urgency-input').value = card && card.urgency ? card.urgency : '';
    document.getElementById('vc-savecraft-status-input').value = card ? card.status : (columnForNew || 'todo');
    document.getElementById('vc-savecraft-delete-btn').style.display = card ? '' : 'none';
    modalEl.classList.add('open');
    document.getElementById('vc-savecraft-name-input').focus();
  }

  function closeModal() {
    if (modalEl) modalEl.classList.remove('open');
    editingId = null;
    newCardColumn = null;
  }

  function handleSave() {
    var name = document.getElementById('vc-savecraft-name-input').value.trim();
    var details = document.getElementById('vc-savecraft-details-input').value.trim();
    var urgencyRaw = document.getElementById('vc-savecraft-urgency-input').value;
    var status = document.getElementById('vc-savecraft-status-input').value;
    if (!name && !details) { closeModal(); return; }

    var card;
    if (editingId) {
      card = cards.find(function (c) { return c.id === editingId; });
      card.name = name;
      card.details = details;
      card.urgency = urgencyRaw || null;
      card.status = status;
    } else {
      card = {
        id: 'admin-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
        name: name,
        details: details,
        urgency: urgencyRaw || null,
        status: status,
        manualOrder: cardsInColumn(status).length,
        createdAt: Date.now(),
      };
      cards.push(card);
    }
    closeModal();
    render();
    clearError();
    saveCard(card);
  }

  /* ─── load ─── */

  function loadCards() {
    apiFetch('', { method: 'GET' })
      .then(function (data) {
        cards = data;
        clearError();
        render();
      })
      .catch(function (err) {
        boardEl.innerHTML = '';
        showError('Failed to load Admin Kanban: ' + err.message);
      });
  }

  document.addEventListener('DOMContentLoaded', loadCards);
})();
