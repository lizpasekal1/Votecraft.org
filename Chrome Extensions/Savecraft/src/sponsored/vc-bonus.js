// VoteCraft Coin (VC) preview on the pricing tiers.
//
// VC has no real backend anywhere in Votecraft yet (confirmed against both the live
// votecraft.org VC app and its design doc — everything is a front-end mockup, no Firebase, no
// ledger). So this is deliberately a *preview*, not a real award: clicking a tier's badge shows
// what that tier is expected to earn "once VoteCraft Coin launches," using the same $10 = 1,000 VC
// rate already live on votecraft.org's VC app dashboard. It never claims VC has actually been
// credited, and it doesn't replace the real payment flow — the panel's own CTA still goes to the
// same mailto: inquiry the page already used.
//
// Uses plain localStorage (not chrome.storage) so this works the same whether the page is opened
// from the extension or the web build — this page has no other storage dependency to match.

(function () {
  var SEEN_KEY = 'savecraft_vc_preview_seen';
  var CONTACT_EMAIL = 'hello@votecraft.com';
  var alreadySeen = false;
  try { alreadySeen = !!localStorage.getItem(SEEN_KEY); } catch (e) { /* ignore, animation just plays every time */ }

  function buildPanel(badge) {
    var vc = badge.dataset.vc;
    var tier = badge.dataset.tier;
    var subject = badge.dataset.subject;
    var mailHref = 'mailto:' + CONTACT_EMAIL + '?subject=' + encodeURIComponent(subject);

    var panel = document.createElement('div');
    panel.className = 'vc-preview-panel' + (alreadySeen ? ' vc-no-anim' : '');
    panel.innerHTML =
      '<div class="coin-mini">VC</div>' +
      '<div class="vc-preview-text">' +
        '<div class="vc-preview-headline">~' + vc + ' VC once VoteCraft Coin launches</div>' +
        '<div class="vc-preview-sub">' + tier + ' is a digital-only sponsorship, so it\'s eligible for a VC bonus on top of your payment — an estimate, not a balance you can spend yet.</div>' +
        '<span class="vc-tag-pill">Civic Sponsor</span>' +
        '<span class="vc-tag-pill">Early Supporter</span>' +
        '<div><a class="vc-preview-cta" href="' + mailHref + '">Continue to email →</a></div>' +
      '</div>';
    return panel;
  }

  document.querySelectorAll('.vc-badge').forEach(function (badge) {
    badge.addEventListener('click', function () {
      var grid = badge.closest('.pricing-grid');
      var existing = grid.querySelector('.vc-preview-panel');
      if (existing) existing.remove();

      var card = badge.closest('.pricing-card');
      card.insertAdjacentElement('afterend', buildPanel(badge));

      alreadySeen = true;
      try { localStorage.setItem(SEEN_KEY, '1'); } catch (e) { /* ignore, preview still works */ }
    });
  });
})();
