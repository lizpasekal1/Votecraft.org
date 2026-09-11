/**
 * SaveCraft Admin — "Admin Users" section. Lists every WordPress user who has the
 * manage_savecraft_admin capability, with an assigned role label (plain WP user meta —
 * no Firestore involved, unlike every other section in this plugin). Viewing is open to any
 * SaveCraft Admin; editing a role label requires manage_options (a true site Administrator) —
 * enforced both server-side (the REST route's own permission_callback) and here (disabled
 * inputs / no Save button when vcSaveCraftUsers.canEdit is false).
 */
(function () {
  'use strict';

  var CFG = window.vcSaveCraftUsers || {};

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

  function showError(msg) {
    var el = document.getElementById('vc-savecraft-users-error');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
  }
  function clearError() {
    var el = document.getElementById('vc-savecraft-users-error');
    if (el) el.style.display = 'none';
  }

  function rowHtml(u) {
    var editable = !!CFG.canEdit;
    return '' +
      '<tr class="vc-user-row" data-id="' + esc(u.id) + '">' +
        '<td class="vc-user-avatar"><img src="' + esc(u.avatarUrl) + '" alt="" width="40" height="40"></td>' +
        '<td>' +
          '<strong>' + esc(u.name) + '</strong>' + (u.isSiteAdmin ? ' <span class="vc-user-badge">Site Administrator</span>' : '') +
          '<br><span class="description">' + esc(u.email) + '</span>' +
        '</td>' +
        '<td><input type="text" data-field="roleLabel" class="regular-text" placeholder="e.g. Content Curator" value="' + esc(u.roleLabel || '') + '"' + (editable ? '' : ' disabled') + '></td>' +
        '<td>' + (editable ? '<button type="button" class="button button-small" data-action="save-user">Save</button>' : '') + '</td>' +
      '</tr>';
  }

  function render(users) {
    var box = document.getElementById('vc-savecraft-users-list');
    if (!box) return;
    if (!users.length) {
      box.innerHTML = '<p><em>No one has SaveCraft Admin access yet.</em></p>';
      return;
    }
    box.innerHTML = '' +
      '<table class="widefat vc-users-table"><thead><tr>' +
        '<th></th><th>Name</th><th>Role</th><th></th>' +
      '</tr></thead><tbody>' +
        users.map(rowHtml).join('') +
      '</tbody></table>';
  }

  function load() {
    var box = document.getElementById('vc-savecraft-users-list');
    clearError();
    apiFetch('admin-users', { method: 'GET' }).then(function (users) {
      render(Array.isArray(users) ? users : []);
    }).catch(function (err) {
      showError('Failed to load: ' + err.message);
      if (box) box.innerHTML = '';
    });
  }

  function wire() {
    var box = document.getElementById('vc-savecraft-users-list');
    if (!box) return;
    box.addEventListener('click', function (e) {
      if (e.target.dataset.action !== 'save-user') return;
      var row = e.target.closest('.vc-user-row');
      if (!row) return;
      var input = row.querySelector('[data-field="roleLabel"]');
      var roleLabel = input ? input.value.trim() : '';
      clearError();
      e.target.disabled = true;
      apiFetch('admin-users/' + encodeURIComponent(row.dataset.id), {
        method: 'POST',
        body: JSON.stringify({ roleLabel: roleLabel })
      }).catch(function (err) {
        showError('Save failed: ' + err.message);
      }).then(function () {
        e.target.disabled = false;
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!document.getElementById('vc-savecraft-users-list')) return; // section not on this page
    wire();
    load();
  });
})();
