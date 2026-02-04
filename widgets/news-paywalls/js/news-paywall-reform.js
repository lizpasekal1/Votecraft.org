// Stats data for both views
const statsData = {
    current: [
        { value: '76%', label: 'Of quality news is paywalled', type: 'negative' },
        { value: '$40B', label: 'Lost in news revenue since 2008', type: 'negative' },
        { value: '2.5x', label: 'More misinformation in free content', type: 'negative' },
        { value: '68%', label: 'Support public news funding', type: 'negative' }
    ]
};

// Calculate stats based on number of reforms selected
function getReformedStats(selectedCount) {
    if (selectedCount === 0) {
        return [
            { value: '76%', label: 'Of quality news is paywalled', type: 'negative' },
            { value: '$40B', label: 'Lost in news revenue since 2008', type: 'negative' },
            { value: '0', label: 'Reforms implemented', type: 'neutral' },
            { value: '2.5x', label: 'More misinformation in free content', type: 'negative' }
        ];
    } else if (selectedCount === 1) {
        return [
            { value: '50%', label: 'Access to quality journalism', type: 'positive' },
            { value: '$8-12', label: 'Cost per person per year', type: 'positive' },
            { value: '1.5x', label: 'More informed electorate', type: 'positive' },
            { value: '15%', label: 'Reduction in misinformation spread', type: 'positive' }
        ];
    } else if (selectedCount === 2) {
        return [
            { value: '70%', label: 'Access to quality journalism', type: 'positive' },
            { value: '$6-10', label: 'Cost per person per year', type: 'positive' },
            { value: '2x', label: 'More informed electorate', type: 'positive' },
            { value: '25%', label: 'Reduction in misinformation spread', type: 'positive' }
        ];
    } else if (selectedCount === 3) {
        return [
            { value: '85%', label: 'Access to quality journalism', type: 'positive' },
            { value: '$5-8', label: 'Cost per person per year', type: 'positive' },
            { value: '2.5x', label: 'More informed electorate', type: 'positive' },
            { value: '35%', label: 'Reduction in misinformation spread', type: 'positive' }
        ];
    } else {
        return [
            { value: '100%', label: 'Access to quality journalism for all', type: 'positive' },
            { value: '$5-10', label: 'Cost per person per year', type: 'positive' },
            { value: '3x', label: 'More informed electorate', type: 'positive' },
            { value: '45%', label: 'Reduction in misinformation spread', type: 'positive' }
        ];
    }
}

// Add click handlers to all news items
document.addEventListener('DOMContentLoaded', function() {
    const newsItems = document.querySelectorAll('.news-item');
    newsItems.forEach(item => {
        item.addEventListener('click', function() {
            this.classList.toggle('selected');

            // Check which view is active
            const currentContainer = document.querySelector('.news-container.current');
            const reformedContainer = document.querySelector('.news-container.reformed');

            if (currentContainer && currentContainer.classList.contains('active')) {
                // Update stats for current system based on selections
                updateCurrentStats();
            } else if (reformedContainer && reformedContainer.classList.contains('active')) {
                updateReformedStats();
            }
        });
    });

    // Initialize stats with empty containers
    initializeEmptyStats();
});

function initializeEmptyStats() {
    const statsGrid = document.getElementById('stats-grid');
    const stats = statsData.current;

    statsGrid.innerHTML = stats.map(stat => `
        <div class="stat-card ${stat.type}">
            <div class="stat-label hidden">${stat.label}</div>
            <div class="stat-value hidden">${stat.value}</div>
        </div>
    `).join('');
}

function updateCurrentStats() {
    const currentContainer = document.querySelector('.news-container.current');
    const selectedItems = currentContainer.querySelectorAll('.news-item.selected');
    const hasSelection = selectedItems.length > 0;
    const allSelected = selectedItems.length === 4;

    // Check if any clickbait/free news is selected
    const clickbaitSelected = currentContainer.querySelectorAll('.news-item.clickbait.selected').length > 0;

    const statsGrid = document.getElementById('stats-grid');
    const statCards = statsGrid.querySelectorAll('.stat-card');
    const stats = statsData.current;

    statCards.forEach((card, index) => {
        const stat = stats[index];
        const statLabel = card.querySelector('.stat-label');
        const statValue = card.querySelector('.stat-value');

        // Hide the misinformation stat unless clickbait is selected
        const isMisinfoStat = stat.label === 'More misinformation in free content';
        // Hide the support stat unless all four items are selected
        const isSupportStat = stat.label === 'Support public news funding';
        const shouldShow = hasSelection && (!isMisinfoStat || clickbaitSelected) && (!isSupportStat || allSelected);

        // Update classes to trigger CSS transitions
        if (shouldShow) {
            statLabel.classList.remove('hidden');
            statValue.classList.remove('hidden');
        } else {
            statLabel.classList.add('hidden');
            statValue.classList.add('hidden');
        }

        // Update card type
        card.className = `stat-card ${stat.type}`;
    });
}

function updateStats(view) {
    const statsGrid = document.getElementById('stats-grid');
    const stats = statsData[view];

    statsGrid.innerHTML = stats.map(stat => `
        <div class="stat-card ${stat.type}">
            <div class="stat-label">${stat.label}</div>
            <div class="stat-value">${stat.value}</div>
        </div>
    `).join('');
}

function updateReformedStats() {
    const reformedContainer = document.querySelector('.news-container.reformed');
    const selectedItems = reformedContainer.querySelectorAll('.news-item.selected');
    const selectedCount = selectedItems.length;
    const hasSelection = selectedCount > 0;

    const stats = getReformedStats(selectedCount);
    const statsGrid = document.getElementById('stats-grid');
    const statCards = statsGrid.querySelectorAll('.stat-card');

    statCards.forEach((card, index) => {
        const stat = stats[index];
        const statLabel = card.querySelector('.stat-label');
        const statValue = card.querySelector('.stat-value');

        // Update label text
        statLabel.textContent = stat.label;
        statValue.textContent = stat.value;

        // Update classes to trigger CSS transitions
        if (hasSelection) {
            statValue.classList.remove('hidden');
        } else {
            statValue.classList.add('hidden');
        }

        // Labels always visible in reform view
        statLabel.classList.remove('hidden');

        // Update card type
        card.className = `stat-card ${hasSelection ? stat.type : 'neutral'}`;
    });
}

function switchView(view) {
    // Clear all selections from both containers
    const allNewsItems = document.querySelectorAll('.news-item.selected');
    allNewsItems.forEach(item => {
        item.classList.remove('selected');
    });

    // Update toggle buttons
    const buttons = document.querySelectorAll('.toggle-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`.toggle-btn.${view}`).classList.add('active');

    // Update content containers
    const containers = document.querySelectorAll('.news-container');
    containers.forEach(container => {
        container.classList.remove('active');
    });
    document.querySelector(`.news-container.${view}`).classList.add('active');

    // Update stats based on view
    if (view === 'current') {
        updateCurrentStats();
    } else {
        updateReformedStats();
    }
}

function toggleSolution(card) {
    card.classList.toggle('selected');
}

function updateAccess() {
    const income = parseInt(document.getElementById('income-slider').value);
    document.getElementById('income-display').textContent = `$${income.toLocaleString()}/year`;

    const currentAccess = document.getElementById('current-access');
    const reformedAccess = document.getElementById('reformed-access');

    // Current system logic
    if (income < 40000) {
        currentAccess.className = 'access-result limited';
        currentAccess.innerHTML = `
            <div class="result-text">\u274C Severely Limited Access</div>
            <div class="result-details">At this income, you likely can't afford any subscriptions ($10-30/month each). You rely on free sources, which are often lower quality or sensationalized.</div>
        `;
    } else if (income < 75000) {
        currentAccess.className = 'access-result limited';
        currentAccess.innerHTML = `
            <div class="result-text">\u26A0\uFE0F Limited Access</div>
            <div class="result-details">You can afford 1-2 subscriptions ($10-30/month). Most quality reporting from other outlets remains locked behind paywalls.</div>
        `;
    } else if (income < 100000) {
        currentAccess.className = 'access-result limited';
        currentAccess.innerHTML = `
            <div class="result-text">\uD83D\uDCF0 Moderate Access</div>
            <div class="result-details">You can afford 2-3 subscriptions ($30-60/month). You have access to some quality news, but many important sources are still inaccessible.</div>
        `;
    } else {
        currentAccess.className = 'access-result full';
        currentAccess.innerHTML = `
            <div class="result-text">\u2713 Good Access</div>
            <div class="result-details">You can afford multiple subscriptions ($60+/month). You have broad access to quality journalism, but this level of access is out of reach for most Americans.</div>
        `;
    }

    // Reformed system - everyone gets access
    reformedAccess.className = 'access-result full';
    reformedAccess.innerHTML = `
        <div class="result-text">\u2713 Full Access For All</div>
        <div class="result-details">Through public libraries, subsidized programs, civic licenses, and tax credits, you have access to quality journalism from all major sources\u2014regardless of income.</div>
    `;
}

// Initialize
updateAccess();
