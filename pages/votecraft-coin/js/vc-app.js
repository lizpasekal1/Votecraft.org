/**
 * VoteCraft App — Coinbase-style Dashboard
 */

// ============ DATA ============

const CATEGORIES = [
    { id: 'all', label: 'All' },
    { id: 'rcv', label: 'RCV' },
    { id: 'debt', label: 'Debt Reform' },
    { id: 'citizens-united', label: "Citizens United" },
    { id: 'healthcare', label: 'Healthcare' },
    { id: 'scotus', label: 'SCOTUS Reform' },
    { id: 'news', label: 'News Reform' }
];

const NONPROFITS = [
    { id: 'rank-the-vote', name: 'Rank the Vote', category: 'rcv', desc: 'National campaign to adopt RCV for federal elections.', logo: 'https://rankthevote.us/wp-content/uploads/2021/08/4.png', tags: { contribution: 'Monetary', impact: 'Democracy', effort: 'Supportive' }, featured: true, pairedGame: 'joke-master' },
    { id: 'fairvote', name: 'FairVote', category: 'rcv', desc: 'Leading organization for ranked choice voting advocacy and research.', logo: 'https://fairvote.org/wp-content/uploads/2022/09/New-web-1024x512.jpg', tags: { contribution: 'Monetary', impact: 'Democracy', effort: 'Supportive' }, featured: true, pairedGame: 'power-plays' },
    { id: 'afr', name: 'Americans for Financial Reform', category: 'debt', desc: 'Coalition working to create a fair financial system.', logo: '', tags: { contribution: 'Monetary', impact: 'Justice', effort: 'Supportive' }, featured: false },
    { id: 'sbpc', name: 'Student Borrower Protection Center', category: 'debt', desc: 'Advocates for student loan borrower rights and debt reform.', logo: '', tags: { contribution: 'Monetary', impact: 'Justice', effort: 'Supportive' }, featured: false },
    { id: 'demos', name: 'Demos', category: 'debt', desc: 'Public policy organization working for an equal democracy and economy.', logo: '', tags: { contribution: 'Monetary', impact: 'Justice', effort: 'Supportive' }, featured: false },
    { id: 'ecu', name: 'End Citizens United', category: 'citizens-united', desc: 'PAC dedicated to electing reform champions and passing campaign finance reform.', logo: 'https://votecraft.org/wp-content/uploads/2025/06/Citizens-united.jpg', tags: { contribution: 'Monetary', impact: 'Democracy', effort: 'Supportive' }, featured: true, pairedGame: 'civic-quiz' },
    { id: 'issue-one', name: 'Issue One', category: 'citizens-united', desc: 'Cross-partisan organization working to reduce the power of money in politics.', logo: '', tags: { contribution: 'Monetary', impact: 'Democracy', effort: 'Supportive' }, featured: false },
    { id: 'clc', name: 'Campaign Legal Center', category: 'citizens-united', desc: 'Nonpartisan legal organization advancing democracy through law.', logo: '', tags: { contribution: 'Monetary', impact: 'Democracy', effort: 'Supportive' }, featured: false },
    { id: 'pnhp', name: 'Physicians for a National Health Program', category: 'healthcare', desc: 'Physicians advocating for single-payer national health insurance.', logo: '', tags: { contribution: 'Monetary', impact: 'Healthcare', effort: 'Supportive' }, featured: false },
    { id: 'families-usa', name: 'Families USA', category: 'healthcare', desc: 'National voice for healthcare consumers, fighting for affordable care.', logo: '', tags: { contribution: 'Monetary', impact: 'Healthcare', effort: 'Supportive' }, featured: false },
    { id: 'community-catalyst', name: 'Community Catalyst', category: 'healthcare', desc: 'National advocacy organization working to build health equity.', logo: '', tags: { contribution: 'Monetary', impact: 'Healthcare', effort: 'Supportive' }, featured: false },
    { id: 'fix-the-court', name: 'Fix the Court', category: 'scotus', desc: 'Nonpartisan organization advocating for Supreme Court transparency.', logo: '', tags: { contribution: 'Monetary', impact: 'Justice', effort: 'Supportive' }, featured: false },
    { id: 'demand-justice', name: 'Demand Justice', category: 'scotus', desc: 'Organization working to restore the legitimacy of the federal judiciary.', logo: 'https://votecraft.org/wp-content/uploads/2025/06/supreme-court2.jpg', tags: { contribution: 'Monetary', impact: 'Justice', effort: 'Supportive' }, featured: true, pairedGame: 'ballot-blitz' },
    { id: 'afj', name: 'Alliance for Justice', category: 'scotus', desc: 'Progressive legal advocacy organization focused on judicial reform.', logo: '', tags: { contribution: 'Monetary', impact: 'Justice', effort: 'Supportive' }, featured: false },
    { id: 'free-press', name: 'Free Press', category: 'news', desc: 'Fighting for media that serves the public interest and strengthens democracy.', logo: '', tags: { contribution: 'Monetary', impact: 'Civic Education', effort: 'Supportive' }, featured: false },
    { id: 'nrh', name: 'News Revenue Hub', category: 'news', desc: 'Helping news organizations build sustainable reader revenue models.', logo: '', tags: { contribution: 'Monetary', impact: 'Civic Education', effort: 'Supportive' }, featured: false },
    { id: 'rfa', name: 'Report for America', category: 'news', desc: 'Placing talented journalists in local newsrooms across the country.', logo: 'https://votecraft.org/wp-content/uploads/2026/02/news_paywall_reform_feature.jpg', tags: { contribution: 'Monetary', impact: 'Civic Education', effort: 'Supportive' }, featured: true, pairedGame: 'power-plays' }
];

// Pre-compute search index
NONPROFITS.forEach(np => {
    np._search = (np.name + ' ' + np.desc).toLowerCase();
});

const GAMES = [
    { id: 'power-plays', name: 'Power Plays', icon: '⚡', desc: 'Campaign strategy card game', price: 4, regularPrice: 10 },
    { id: 'joke-master', name: 'JOKE MASTER', icon: '🃏', desc: 'Ranked choice voting simulator', price: 4, regularPrice: 10 },
    { id: 'civic-quiz', name: 'Civic Quiz', icon: '🧠', desc: 'Test your civic knowledge', price: 2, regularPrice: 5 },
    { id: 'ballot-blitz', name: 'Ballot Blitz', icon: '🗂️', desc: 'Fast-paced election trivia', price: 2, regularPrice: 5 }
];

// ============ STATE ============

let activeCategory = 'all';
let searchQuery = '';
let selectedNonprofit = null;
let selectedAmount = 10;

// ============ EXPLORE: CATEGORIES ============

function renderCategoryChips() {
    var container = document.getElementById('categoryChips');
    if (!container) return;
    container.innerHTML = CATEGORIES.map(cat =>
        '<button class="category-chip' + (cat.id === activeCategory ? ' active' : '') + '" data-cat="' + cat.id + '">' + cat.label + '</button>'
    ).join('');

    container.querySelectorAll('.category-chip').forEach(chip => {
        chip.addEventListener('click', function () {
            activeCategory = this.dataset.cat;
            renderCategoryChips();
            renderNonprofitList();
        });
    });
}

// ============ EXPLORE: NONPROFIT LIST ============

function getFilteredNonprofits() {
    return NONPROFITS.filter(np => {
        var matchCat = activeCategory === 'all' || np.category === activeCategory;
        var matchSearch = !searchQuery || np._search.includes(searchQuery);
        return matchCat && matchSearch;
    });
}

function renderNonprofitList() {
    var list = document.getElementById('nonprofitList');
    var count = document.getElementById('resultsCount');
    var empty = document.getElementById('exploreEmpty');
    if (!list) return;

    var filtered = getFilteredNonprofits();
    count.textContent = filtered.length + ' nonprofit' + (filtered.length !== 1 ? 's' : '');

    if (filtered.length === 0) {
        list.innerHTML = '';
        empty.hidden = false;
        return;
    }

    empty.hidden = true;
    list.innerHTML = filtered.map(np => {
        var catLabel = CATEGORIES.find(c => c.id === np.category);
        var logoHtml = np.logo
            ? '<div class="asset-icon-img"><img src="' + np.logo + '" alt="' + np.name + '" loading="lazy"></div>'
            : '<div class="np-initial">' + np.name.charAt(0) + '</div>';
        return '<div class="asset-row" data-np-id="' + np.id + '">' +
            logoHtml +
            '<div class="asset-info">' +
                '<div class="asset-name">' + np.name + '</div>' +
                '<div class="asset-sub">' + np.desc + '</div>' +
            '</div>' +
            (catLabel ? '<span class="np-category-badge">' + catLabel.label + '</span>' : '') +
            '<div class="asset-arrow">›</div>' +
        '</div>';
    }).join('');

    list.querySelectorAll('.asset-row').forEach(row => {
        row.addEventListener('click', function () {
            var np = NONPROFITS.find(n => n.id === this.dataset.npId);
            if (np) selectNonprofit(np);
        });
    });
}

// ============ FEATURED NONPROFITS (Home) ============

function renderFeaturedNonprofits() {
    var container = document.getElementById('featuredNonprofits');
    if (!container) return;
    var featured = NONPROFITS.filter(np => np.featured);

    container.innerHTML = featured.map(np => {
        var catLabel = CATEGORIES.find(c => c.id === np.category);
        var logoHtml = np.logo
            ? '<div class="asset-icon-img"><img src="' + np.logo + '" alt="' + np.name + '" loading="lazy"></div>'
            : '<div class="np-initial">' + np.name.charAt(0) + '</div>';
        var gameHtml = '';
        if (np.pairedGame) {
            var game = GAMES.find(g => g.id === np.pairedGame);
            if (game) {
                gameHtml = '<span class="paired-game-plus">+</span>' +
                '<div class="asset-paired-game">' +
                    '<span class="paired-game-icon">' + game.icon + '</span>' +
                    '<span class="paired-game-name">' + game.name + '</span>' +
                '</div>';
            }
        }
        return '<div class="asset-row" data-np-id="' + np.id + '">' +
            logoHtml +
            '<div class="asset-info">' +
                '<div class="asset-name">' + np.name + '</div>' +
                '<div class="asset-sub">' + (catLabel ? catLabel.label : '') + '</div>' +
            '</div>' +
            gameHtml +
            '<button class="asset-donate-btn" data-np-id="' + np.id + '">Donate</button>' +
            '<span class="asset-vc-hint">+VC</span>' +
        '</div>';
    }).join('');

    container.querySelectorAll('.asset-donate-btn').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            var np = NONPROFITS.find(n => n.id === this.dataset.npId);
            if (np) selectNonprofit(np);
        });
    });

    container.querySelectorAll('.asset-row').forEach(row => {
        row.addEventListener('click', function () {
            var np = NONPROFITS.find(n => n.id === this.dataset.npId);
            if (np) {
                selectNonprofit(np);
            }
        });
    });
}

// ============ GAMES LIST ============

function renderGamesList() {
    var container = document.getElementById('gamesList');
    if (!container) return;
    container.innerHTML = GAMES.map(g =>
        '<div class="asset-row">' +
            '<div class="np-initial">' + g.icon + '</div>' +
            '<div class="asset-info">' +
                '<div class="asset-name">' + g.name + '</div>' +
                '<div class="asset-sub">' + g.desc + '</div>' +
            '</div>' +
            '<div class="asset-price-group">' +
                '<span class="asset-price-regular">$' + g.regularPrice + '</span>' +
                '<span class="asset-price-bundled">$' + g.price + '</span>' +
            '</div>' +
            '<div class="asset-arrow">›</div>' +
        '</div>'
    ).join('');
}

// ============ SELECT NONPROFIT → UPDATE PANEL ============

function selectNonprofit(np) {
    selectedNonprofit = np;
    var nameEl = document.getElementById('panelNonprofitName');
    var btn = document.getElementById('panelDonateBtn');
    if (nameEl) nameEl.textContent = np.name;
    if (btn) {
        btn.disabled = false;
        btn.textContent = 'Donate $' + selectedAmount + ' to ' + np.name;
    }
    updatePanelAmount();
}

function updatePanelAmount() {
    var valueEl = document.getElementById('panelAmountValue');
    var vcEl = document.getElementById('panelAmountVc');
    var btn = document.getElementById('panelDonateBtn');
    if (valueEl) {
        valueEl.textContent = selectedAmount;
        valueEl.classList.toggle('has-value', selectedAmount > 0);
    }
    if (vcEl) vcEl.innerHTML = 'With this donation you get: <strong>' + (selectedAmount * 10) + ' VC</strong>';
    if (btn && selectedNonprofit) {
        btn.textContent = 'Donate $' + selectedAmount + ' to ' + selectedNonprofit.name;
    }
}

// ============ PANEL TABS ============

function switchPanelTab(tabName) {
    document.querySelectorAll('.panel-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.panelTab === tabName);
    });
    document.getElementById('panelDonate').classList.toggle('active', tabName === 'donate');
    document.getElementById('panelEarn').classList.toggle('active', tabName === 'earn');
    document.getElementById('panelRedeem').classList.toggle('active', tabName === 'redeem');
}

// ============ INIT ============

document.addEventListener('DOMContentLoaded', function () {

    // Hamburger menu
    var hamburger = document.getElementById('hamburgerBtn');
    var sidebar = document.getElementById('sidebar');
    var overlay = document.getElementById('sidebarOverlay');

    if (hamburger && sidebar && overlay) {
        hamburger.addEventListener('click', function () {
            hamburger.classList.toggle('open');
            sidebar.classList.toggle('open');
            overlay.classList.toggle('open');
        });
        overlay.addEventListener('click', function () {
            hamburger.classList.remove('open');
            sidebar.classList.remove('open');
            overlay.classList.remove('open');
        });
    }

    // Theme toggle
    var savedTheme = localStorage.getItem('vc-theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
    updateThemeIcons(savedTheme);

    var themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function () {
            var current = document.body.getAttribute('data-theme') || 'light';
            var next = current === 'dark' ? 'light' : 'dark';
            document.body.setAttribute('data-theme', next);
            localStorage.setItem('vc-theme', next);
            updateThemeIcons(next);
        });
    }

    function updateThemeIcons(theme) {
        var light = document.querySelector('.theme-icon-light');
        var dark = document.querySelector('.theme-icon-dark');
        if (light) light.style.display = theme === 'dark' ? 'none' : '';
        if (dark) dark.style.display = theme === 'dark' ? '' : 'none';
        // Update stroke color for dark mode
        if (dark) dark.setAttribute('stroke', theme === 'dark' ? '#94a3b8' : '#374151');
        if (light) light.setAttribute('stroke', theme === 'dark' ? '#94a3b8' : '#374151');
    }

    // Panel tabs
    document.querySelectorAll('.panel-tab').forEach(tab => {
        tab.addEventListener('click', function () {
            switchPanelTab(this.dataset.panelTab);
        });
    });

    // Amount presets
    var customAmountInput = document.getElementById('panelCustomAmount');

    document.querySelectorAll('.panel-preset').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.panel-preset').forEach(b => b.classList.remove('active'));
            if (customAmountInput) {
                customAmountInput.classList.remove('active');
                customAmountInput.value = '';
            }
            this.classList.add('active');
            selectedAmount = parseInt(this.dataset.amount, 10);
            updatePanelAmount();
        });
    });

    if (customAmountInput) {
        customAmountInput.addEventListener('focus', function () {
            document.querySelectorAll('.panel-preset').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
        customAmountInput.addEventListener('input', function () {
            var val = parseInt(this.value, 10);
            if (val > 0) {
                selectedAmount = val;
                updatePanelAmount();
            }
        });
    }

    // Earn presets
    var earnAmount = 30;
    document.querySelectorAll('[data-earn]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            document.querySelectorAll('[data-earn]').forEach(function (b) { b.classList.remove('active'); });
            this.classList.add('active');
            earnAmount = parseInt(this.dataset.earn, 10);
            var vc = earnAmount * 100;
            var tags = Math.floor(earnAmount / 10);
            document.getElementById('panelEarnValue').textContent = earnAmount;
            // panelEarnVc removed — info now inline with tag pill
            document.getElementById('panelEarnTagCount').textContent = '×' + tags;
            var vcInline = document.getElementById('panelEarnVcInline');
            var vcFmt = vc.toLocaleString();
            if (vcInline) vcInline.textContent = vcFmt + ' VC +';
            document.getElementById('panelEarnBtn').textContent = 'Buy ' + vcFmt + ' VC';
        });
    });

    // Search
    var searchInput = document.getElementById('nonprofitSearch');
    var searchClear = document.getElementById('searchClear');
    var searchTimeout;

    if (searchInput) {
        searchInput.addEventListener('input', function () {
            clearTimeout(searchTimeout);
            var val = this.value;
            searchTimeout = setTimeout(function () {
                searchQuery = val.trim().toLowerCase();
                if (searchClear) searchClear.hidden = !searchQuery;
                renderNonprofitList();
            }, 150);
        });
    }

    if (searchClear) {
        searchClear.addEventListener('click', function () {
            searchInput.value = '';
            searchQuery = '';
            this.hidden = true;
            renderNonprofitList();
        });
    }

    // Accordion toggles
    document.querySelectorAll('.accordion-trigger').forEach(function (trigger) {
        trigger.addEventListener('click', function () {
            var item = this.closest('.accordion-item');
            item.classList.toggle('open');
        });
    });

    // Render
    renderCategoryChips();
    renderNonprofitList();
    renderFeaturedNonprofits();
    renderGamesList();
    updatePanelAmount();
});
