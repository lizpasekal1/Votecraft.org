/* ====== VoteCraft Coin — Interactive Purchase Flow Demo ====== */

(function () {
    'use strict';

    // ====== DATA ======

    var GAME_PRICE = 2;
    var REGULAR_PRICE = 5;
    var DONATION_OPTIONS = [10, 20, 30, 50];

    const GAMES = {
        'power-plays':  { name: 'Power Plays',  icon: '⚡', desc: 'Campaign strategy card game'    },
        'rcv-demo':     { name: 'JOKE MASTER',   icon: '🃏', desc: 'Ranked choice voting simulator' },
        'civic-quiz':   { name: 'Civic Quiz',   icon: '🧠', desc: 'Test your civic knowledge'      },
        'ballot-blitz': { name: 'Ballot Blitz', icon: '🗂️', desc: 'Fast-paced election trivia'     }
    };

    const NONPROFITS = {
        'rank-the-vote': {
            name: 'Rank the Vote',
            img: 'https://rankthevote.us/wp-content/uploads/2021/08/4.png',
            desc: 'Grassroots RCV campaign',
            tag1: { type: 'impact', name: 'Voting Rights' },
            tag2: { type: 'contribution', name: 'Organizer' }
        },
        'end-citizens-united': {
            name: 'End Citizens United',
            img: 'https://votecraft.org/wp-content/uploads/2025/06/Citizens-united.jpg',
            desc: 'Campaign finance reform',
            tag1: { type: 'impact', name: 'Finance Reform' },
            tag2: { type: 'effort', name: 'Advocate' }
        },
        'supreme-court-reform': {
            name: 'Supreme Court Reform',
            img: 'https://votecraft.org/wp-content/uploads/2025/06/supreme-court2.jpg',
            desc: 'Judicial accountability & reform',
            tag1: { type: 'impact', name: 'Good Governance' },
            tag2: { type: 'effort', name: 'Civic Action' }
        },
        'news-paywall-reform': {
            name: 'News Paywall Reform',
            img: 'https://votecraft.org/wp-content/uploads/2026/02/news_paywall_reform_feature.jpg',
            desc: 'Open access to public interest journalism',
            tag1: { type: 'impact', name: 'Civic Education' },
            tag2: { type: 'contribution', name: 'Advocate' }
        }
    };

    // ====== STATE ======

    const state = {
        path: 'nonprofit',
        step: 1,
        selectedGame: null,
        selectedNonprofit: null,
        selectedDonation: null
    };

    // ====== DOM REFS ======

    const demoShell = document.getElementById('demo-shell');
    if (!demoShell) return; // bail if demo section absent

    // ====== CARD RENDERING ======

    function fmt(n) {
        return '$' + n.toFixed(2);
    }

    function renderPickCards(containerId, data, type, hidePrice) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';

        Object.entries(data).forEach(function ([key, item]) {
            const card = document.createElement('div');
            card.className = 'demo-pick-card';
            card.dataset[type] = key;

            if (type === 'game') {
                var priceBlock = hidePrice ? '' :
                    '<div class="demo-pick-price">' +
                        '<span class="price-bundled">' + fmt(GAME_PRICE) + '</span>' +
                        '<span class="price-regular">reg. ' + fmt(REGULAR_PRICE) + '</span>' +
                    '</div>';
                card.innerHTML =
                    '<div class="demo-pick-icon">' + item.icon + '</div>' +
                    '<div class="demo-pick-name">' + item.name + '</div>' +
                    '<div class="demo-pick-desc">' + item.desc + '</div>' +
                    priceBlock;
            } else {
                card.className = 'demo-pick-card demo-pick-card-np';
                card.innerHTML =
                    '<div class="demo-np-img"><img src="' + item.img + '" alt="' + item.name + '"></div>' +
                    '<div class="demo-np-body">' +
                        '<div class="demo-np-name">' + item.name + '</div>' +
                        '<div class="demo-np-tags">' +
                            '<span class="atag atag-' + item.tag1.type + '">' + item.tag1.name + '</span>' +
                            '<span class="atag atag-' + item.tag2.type + '">' + item.tag2.name + '</span>' +
                        '</div>' +
                    '</div>';
            }

            container.appendChild(card);
        });
    }

    function renderDonationCards(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';

        DONATION_OPTIONS.forEach(function (amount) {
            const card = document.createElement('div');
            card.className = 'demo-pick-card demo-donation-card';
            card.dataset.donation = amount;
            var vcEarned = amount * 10;
            var cashValue = (amount * 0.10).toFixed(2);
            card.innerHTML =
                '<div class="demo-donation-amount">$' + amount + '</div>' +
                '<div class="demo-donation-vc">+' + vcEarned + ' VC</div>' +
                '<div class="demo-donation-value">$' + cashValue + ' off next</div>';
            container.appendChild(card);
        });
    }

    // ====== PROGRESS ======

    function updateProgress() {
        document.querySelectorAll('.demo-progress-step').forEach(function (stepEl) {
            var n = parseInt(stepEl.dataset.step, 10);
            stepEl.classList.remove('demo-progress-active', 'demo-progress-done');
            if (n < state.step) stepEl.classList.add('demo-progress-done');
            else if (n === state.step) stepEl.classList.add('demo-progress-active');
        });

        var label1 = document.getElementById('progress-label-1');
        var label2 = document.getElementById('progress-label-2');
        var label3 = document.getElementById('progress-label-3');

        if (state.path === 'game') {
            if (label1) label1.textContent = state.step > 1 ? 'Your game' : 'Pick a game';
            if (label2) label2.textContent = state.step > 2 ? 'Your cause' : 'Pick a cause';
        } else {
            if (label1) label1.textContent = state.step > 1 ? 'Your cause' : 'Pick a cause';
            if (label2) label2.textContent = state.step > 2 ? 'Your game' : 'Pick a game';
        }
        if (label3) label3.textContent = state.step > 3 ? 'Your donation' : 'Donation';
    }

    // ====== STEP RENDERING ======

    function renderStep() {
        // Hide all steps
        demoShell.querySelectorAll('.demo-step').forEach(function (el) {
            el.classList.add('demo-step-hidden');
        });

        var targetId;
        if (state.step === 1) {
            targetId = state.path === 'game' ? 'step-1-game' : 'step-1-nonprofit';
        } else if (state.step === 2) {
            targetId = state.path === 'game' ? 'step-2-nonprofit' : 'step-2-game';
        } else if (state.step === 3) {
            targetId = 'step-3-donation';
        } else {
            targetId = 'step-4-summary';
        }

        var target = document.getElementById(targetId);
        if (target) {
            target.classList.remove('demo-step-hidden');
            // Trigger entry animation
            target.classList.remove('demo-step-entering');
            void target.offsetWidth; // force reflow
            target.classList.add('demo-step-entering');
        }

        // Populate context strips for step 2
        if (state.step === 2) {
            if (state.path === 'game' && state.selectedGame) {
                var ctx1 = document.getElementById('step2-context-game');
                if (ctx1) ctx1.innerHTML = 'You picked <strong>' + GAMES[state.selectedGame].name + '</strong>. Now choose a cause to support:';
            } else if (state.path === 'nonprofit' && state.selectedNonprofit) {
                var ctx2 = document.getElementById('step2-context-nonprofit');
                if (ctx2) ctx2.innerHTML = 'You\'re supporting <strong>' + NONPROFITS[state.selectedNonprofit].name + '</strong>. Pick your gift game:';
            }
        }


        if (state.step === 4) renderSummary();

        updateProgress();
    }

    // ====== SUMMARY ======

    function renderSummary() {
        if (!state.selectedGame || !state.selectedNonprofit || !state.selectedDonation) return;

        var game = GAMES[state.selectedGame];
        var np = NONPROFITS[state.selectedNonprofit];
        var donation = state.selectedDonation;

        var total    = GAME_PRICE + donation;
        var vcAmt    = donation * 0.05;
        var causeAmt = donation * 0.95;
        var vcBonus  = donation * 10;

        function setText(id, text) {
            var el = document.getElementById(id);
            if (el) el.textContent = text;
        }
        function setHTML(id, html) {
            var el = document.getElementById(id);
            if (el) el.innerHTML = html;
        }
        function setStyle(id, prop, val) {
            var el = document.getElementById(id);
            if (el) el.style[prop] = val;
        }

        setText('summary-pay-label', state.path === 'nonprofit' ? 'You donate' : 'You pay');
        setText('summary-total-price', fmt(donation));
        setText('summary-game-name', game.name);
        setHTML('summary-game-share', '<s class="summary-was-price">' + fmt(REGULAR_PRICE) + '</s> ' + fmt(GAME_PRICE));
        setText('summary-nonprofit-name', np.name);
        setText('summary-cause-share', fmt(causeAmt));
        setText('summary-vc-share', fmt(vcAmt));
        setText('summary-vc', '+' + vcBonus + ' VC');

        // Row order: primary recipient first
        var rowGame  = document.getElementById('summary-row-game');
        var rowCause = document.getElementById('summary-row-cause');
        if (rowGame && rowCause) {
            var parent = rowGame.parentNode;
            if (state.path === 'nonprofit') {
                parent.insertBefore(rowCause, rowGame);
            } else {
                parent.insertBefore(rowGame, rowCause);
            }
        }

        // Distribution bar (3 segments, proportional to total)
        var gamePct  = Math.round(GAME_PRICE / total * 100);
        var vcPct    = Math.round(vcAmt / total * 100);
        var causePct = 100 - gamePct - vcPct;
        setStyle('summary-fill-game',     'width', gamePct  + '%');
        setStyle('summary-fill-cause',    'width', causePct + '%');
        setStyle('summary-fill-platform', 'width', vcPct    + '%');

        setHTML('summary-tags',
            '<span class="atag atag-' + np.tag1.type + ' atag-summary">' + np.tag1.name + '</span>' +
            '<span class="atag atag-' + np.tag2.type + ' atag-summary">' + np.tag2.name + '</span>'
        );
    }

    // ====== PATH TOGGLE ======

    function setPath(newPath) {
        state.path = newPath;
        state.step = 1;
        state.selectedGame = null;
        state.selectedNonprofit = null;
        state.selectedDonation = null;

        document.querySelectorAll('.demo-toggle-btn').forEach(function (btn) {
            btn.classList.toggle('demo-toggle-active', btn.dataset.path === newPath);
        });

        demoShell.querySelectorAll('.demo-pick-card.demo-pick-card-selected').forEach(function (c) {
            c.classList.remove('demo-pick-card-selected');
        });

        renderStep();
    }

    // ====== EVENT HANDLERS ======

    function handleToggleClick(e) {
        var btn = e.target.closest('.demo-toggle-btn');
        if (!btn || btn.dataset.path === state.path) return;
        setPath(btn.dataset.path);
    }

    function handleCardClick(e) {
        var card = e.target.closest('.demo-pick-card');
        if (!card) return;

        // Deselect siblings in the same grid
        var parent = card.parentElement;
        parent.querySelectorAll('.demo-pick-card.demo-pick-card-selected').forEach(function (c) {
            c.classList.remove('demo-pick-card-selected');
        });
        card.classList.add('demo-pick-card-selected');

        if (card.dataset.game) {
            state.selectedGame = card.dataset.game;
        } else if (card.dataset.nonprofit) {
            state.selectedNonprofit = card.dataset.nonprofit;
        } else if (card.dataset.donation) {
            state.selectedDonation = parseInt(card.dataset.donation, 10);
        }

        state.step++;
        setTimeout(renderStep, 220);
    }

    function handleReset() {
        state.step = 1;
        state.selectedGame = null;
        state.selectedNonprofit = null;
        state.selectedDonation = null;
        demoShell.querySelectorAll('.demo-pick-card.demo-pick-card-selected').forEach(function (c) {
            c.classList.remove('demo-pick-card-selected');
        });
        renderStep();
    }

    // ====== GO BACK ======

    function handleProgressClick(e) {
        var stepEl = e.target.closest('.demo-progress-step');
        if (!stepEl) return;
        var targetStep = parseInt(stepEl.dataset.step, 10);
        if (targetStep >= state.step) return; // can only go back

        if (targetStep === 1) {
            state.selectedGame = null;
            state.selectedNonprofit = null;
            state.selectedDonation = null;
            demoShell.querySelectorAll('.demo-pick-card.demo-pick-card-selected').forEach(function (c) {
                c.classList.remove('demo-pick-card-selected');
            });
        } else if (targetStep === 2) {
            state.selectedDonation = null;
            if (state.path === 'game') {
                state.selectedNonprofit = null;
            } else {
                state.selectedGame = null;
            }
            demoShell.querySelectorAll('#nonprofit-cards .demo-pick-card-selected, #nonprofit-cards-primary .demo-pick-card-selected, #game-cards-secondary .demo-pick-card-selected').forEach(function (c) {
                c.classList.remove('demo-pick-card-selected');
            });
        } else if (targetStep === 3) {
            state.selectedDonation = null;
            demoShell.querySelectorAll('#donation-cards .demo-pick-card-selected').forEach(function (c) {
                c.classList.remove('demo-pick-card-selected');
            });
        }

        state.step = targetStep;
        renderStep();
    }

    // ====== BIND EVENTS ======

    var demoToggle = document.getElementById('demo-toggle');
    if (demoToggle) demoToggle.addEventListener('click', handleToggleClick);
    demoShell.addEventListener('click', handleCardClick);
    var resetBtn = document.getElementById('demo-reset');
    if (resetBtn) resetBtn.addEventListener('click', handleReset);
    var demoProgress = document.getElementById('demo-progress');
    if (demoProgress) demoProgress.addEventListener('click', handleProgressClick);

    // ====== INIT ======

    renderPickCards('game-cards', GAMES, 'game');
    renderPickCards('game-cards-secondary', GAMES, 'game', true);
    renderPickCards('nonprofit-cards', NONPROFITS, 'nonprofit');
    renderPickCards('nonprofit-cards-primary', NONPROFITS, 'nonprofit');
    renderDonationCards('donation-cards');
    renderStep();

})();
