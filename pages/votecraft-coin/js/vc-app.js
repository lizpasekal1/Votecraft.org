/**
 * VoteCraft App — Navigation & Flow Logic
 * Mobile-first SPA with tab navigation and drill-down sub-views
 */

// ============ DATA ============

const ISSUES = [
    {
        id: 'rcv', title: 'Rank Choice Voting',
        heroImage: 'https://votecraft.org/wp-content/uploads/2025/06/rank-the-vote.jpg',
        tags: { contribution: 'Monetary', impact: 'Democracy', effort: 'Supportive' },
        nonprofits: [
            { name: 'Common Cause', logo: 'https://www.commoncause.org/ohio/wp-content/uploads/2024/08/OH.png', desc: 'Nonpartisan grassroots organization dedicated to upholding democratic values.', donateUrl: 'https://www.commoncause.org/donate/' },
            { name: 'Rank the Vote', logo: 'https://rankthevote.us/wp-content/uploads/2021/08/4.png', desc: 'National campaign to adopt RCV for federal elections.', donateUrl: 'https://rankthevote.us/donate/' },
            { name: 'FairVote', logo: 'https://fairvote.org/wp-content/uploads/2022/09/New-web-1024x512.jpg', desc: 'Leading organization for ranked choice voting advocacy and research.', donateUrl: 'https://www.fairvote.org/donate' }
        ]
    },
    {
        id: 'debt', title: 'Public Debt Profiteering',
        heroImage: 'https://votecraft.org/wp-content/uploads/2026/02/end_public-debt-profiteering_feature.jpg',
        tags: { contribution: 'Monetary', impact: 'Justice', effort: 'Supportive' },
        nonprofits: [
            { name: 'Americans for Financial Reform', logo: '', desc: 'Coalition working to create a fair financial system that serves the public.', donateUrl: 'https://ourfinancialsecurity.org/donate/' },
            { name: 'Student Borrower Protection Center', logo: '', desc: 'Advocates for student loan borrower rights and debt reform.', donateUrl: 'https://protectborrowers.org/donate/' },
            { name: 'Demos', logo: '', desc: 'Public policy organization working for an equal democracy and economy.', donateUrl: 'https://www.demos.org/donate' }
        ]
    },
    {
        id: 'citizens-united', title: "Ending Citizen's United",
        heroImage: 'https://votecraft.org/wp-content/uploads/2025/06/Citizens-united.jpg',
        tags: { contribution: 'Monetary', impact: 'Democracy', effort: 'Supportive' },
        nonprofits: [
            { name: 'End Citizens United', logo: '', desc: 'PAC dedicated to electing reform champions and passing campaign finance reform.', donateUrl: 'https://endcitizensunited.org/donate/' },
            { name: 'Issue One', logo: '', desc: 'Cross-partisan organization working to reduce the power of money in politics.', donateUrl: 'https://issueone.org/donate/' },
            { name: 'Campaign Legal Center', logo: '', desc: 'Nonpartisan legal organization advancing democracy through law.', donateUrl: 'https://campaignlegal.org/donate' }
        ]
    },
    {
        id: 'healthcare', title: 'Universal Basic Healthcare',
        heroImage: 'https://votecraft.org/wp-content/uploads/2025/06/healthcare1.jpg',
        tags: { contribution: 'Monetary', impact: 'Healthcare', effort: 'Supportive' },
        nonprofits: [
            { name: 'Physicians for a National Health Program', logo: '', desc: 'Organization of physicians advocating for single-payer national health insurance.', donateUrl: 'https://pnhp.org/donate/' },
            { name: 'Families USA', logo: '', desc: 'National voice for healthcare consumers, fighting for affordable care.', donateUrl: 'https://familiesusa.org/donate/' },
            { name: 'Community Catalyst', logo: '', desc: 'National advocacy organization working to build health equity.', donateUrl: 'https://communitycatalyst.org/donate/' }
        ]
    },
    {
        id: 'scotus', title: 'Supreme Court Reform',
        heroImage: 'https://votecraft.org/wp-content/uploads/2025/06/supreme-court2.jpg',
        tags: { contribution: 'Monetary', impact: 'Justice', effort: 'Supportive' },
        nonprofits: [
            { name: 'Fix the Court', logo: '', desc: 'Nonpartisan organization advocating for Supreme Court transparency and accountability.', donateUrl: 'https://fixthecourt.com/donate/' },
            { name: 'Demand Justice', logo: '', desc: 'Organization working to restore the legitimacy of the federal judiciary.', donateUrl: 'https://demandjustice.org/donate/' },
            { name: 'Alliance for Justice', logo: '', desc: 'Progressive legal advocacy organization focused on judicial nominations and reform.', donateUrl: 'https://www.afj.org/donate/' }
        ]
    },
    {
        id: 'news', title: 'News Paywall Reform',
        heroImage: 'https://votecraft.org/wp-content/uploads/2026/02/news_paywall_reform_feature.jpg',
        tags: { contribution: 'Monetary', impact: 'Civic Education', effort: 'Supportive' },
        nonprofits: [
            { name: 'Free Press', logo: '', desc: 'Fighting for media that serves the public interest and strengthens democracy.', donateUrl: 'https://www.freepress.net/donate' },
            { name: 'News Revenue Hub', logo: '', desc: 'Helping news organizations build sustainable reader revenue models.', donateUrl: 'https://fundjournalism.org/donate/' },
            { name: 'Report for America', logo: '', desc: 'Placing talented journalists in local newsrooms across the country.', donateUrl: 'https://www.reportforamerica.org/donate/' }
        ]
    }
];

const ACTIVITIES = [
    { id: 'dance', name: 'Community Dance', icon: '💃', vc: 5, desc: 'Social dances, cultural events', color: 'var(--purple-dim)' },
    { id: 'tutoring', name: 'Tutoring Session', icon: '📚', vc: 10, desc: 'Educational help and mentoring', color: 'var(--blue-dim)' },
    { id: 'volunteer', name: 'Volunteer Shift', icon: '🤝', vc: 15, desc: 'Community service work', color: 'var(--teal-dim)' },
    { id: 'meal', name: 'Community Meal', icon: '🍽️', vc: 5, desc: 'Shared meals and food events', color: 'var(--orange-dim)' },
    { id: 'workshop', name: 'Workshop / Class', icon: '🎓', vc: 8, desc: 'Skills training and education', color: 'var(--blue-dim)' },
    { id: 'cleanup', name: 'Neighborhood Cleanup', icon: '🌿', vc: 12, desc: 'Environmental stewardship', color: 'var(--teal-dim)' },
    { id: 'art', name: 'Art & Culture Event', icon: '🎨', vc: 7, desc: 'Creative and cultural gatherings', color: 'var(--purple-dim)' },
    { id: 'childcare', name: 'Childcare Co-op', icon: '👶', vc: 10, desc: 'Shared childcare support', color: 'var(--orange-dim)' }
];

// ============ STATE ============

let currentTab = 'home';
let selectedIssue = null;
let selectedNonprofit = null;
let selectedAmount = 25;
let selectedVc = 25;
let selectedActivity = null;
let selectedTags = { contribution: null, impact: null, effort: null };

// ============ NAVIGATION ============

function switchTab(tab) {
    currentTab = tab;

    // Update nav tabs
    document.querySelectorAll('.nav-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === tab);
    });

    // Update views
    document.querySelectorAll('.view').forEach(v => {
        v.classList.toggle('active', v.dataset.view === tab);
    });

    // Reset sub-views to default when switching tabs
    const view = document.getElementById('view-' + tab);
    if (view) {
        const subViews = view.querySelectorAll('.sub-view');
        subViews.forEach((sv, i) => {
            sv.classList.toggle('active', i === 0);
        });
    }

    // Scroll to top
    const scroll = view?.querySelector('.view-scroll');
    if (scroll) scroll.scrollTop = 0;
}

function showSubView(subViewId) {
    const subView = document.getElementById(subViewId);
    if (!subView) return;

    const parent = subView.closest('.view');
    parent.querySelectorAll('.sub-view').forEach(sv => {
        sv.classList.remove('active');
    });
    subView.classList.add('active');

    // Scroll to top of the view
    const scroll = parent.querySelector('.view-scroll');
    if (scroll) scroll.scrollTop = 0;
}

// ============ EXPLORE FLOW ============

function renderIssueCards() {
    const container = document.getElementById('issueCards');
    container.innerHTML = ISSUES.map(issue => `
        <div class="issue-card" data-issue-id="${issue.id}">
            <div class="issue-card-image">
                <img src="${issue.heroImage}" alt="${issue.title}" loading="lazy">
            </div>
            <div class="issue-card-title">${issue.title}</div>
        </div>
    `).join('');

    container.querySelectorAll('.issue-card').forEach(card => {
        card.addEventListener('click', () => {
            const issueId = card.dataset.issueId;
            selectedIssue = ISSUES.find(i => i.id === issueId);
            openNonprofits();
        });
    });
}

function openNonprofits() {
    if (!selectedIssue) return;

    document.getElementById('nonprofitIssueTitle').textContent = selectedIssue.title;
    document.getElementById('backToIssuesLabel').textContent = 'Issues';

    const container = document.getElementById('nonprofitCards');
    container.innerHTML = selectedIssue.nonprofits.map((np, i) => `
        <div class="nonprofit-card" data-np-index="${i}">
            <div class="nonprofit-card-logo" style="background: ${selectedIssue.color}">
                ${np.logo ? `<img src="${np.logo}" alt="${np.name}">` : np.name.charAt(0)}
            </div>
            <div class="nonprofit-card-info">
                <div class="nonprofit-card-name">${np.name}</div>
                <div class="nonprofit-card-desc">${np.desc}</div>
            </div>
            <div class="nonprofit-card-arrow">&#x203A;</div>
        </div>
    `).join('');

    container.querySelectorAll('.nonprofit-card').forEach(card => {
        card.addEventListener('click', () => {
            selectedNonprofit = selectedIssue.nonprofits[card.dataset.npIndex];
            openDonate();
        });
    });

    showSubView('explore-nonprofits');
}

function openDonate() {
    if (!selectedNonprofit || !selectedIssue) return;

    // Set nonprofit info
    const logoEl = document.getElementById('donateNonprofitLogo');
    if (selectedNonprofit.logo) {
        logoEl.innerHTML = `<img src="${selectedNonprofit.logo}" alt="${selectedNonprofit.name}">`;
    } else {
        logoEl.textContent = selectedNonprofit.name.charAt(0);
    }
    document.getElementById('donateNonprofitName').textContent = selectedNonprofit.name;
    document.getElementById('donateNonprofitDesc').textContent = selectedNonprofit.desc;
    document.getElementById('backToNonprofitsLabel').textContent = selectedIssue.title;

    // Set tag preview
    const tags = selectedIssue.tags;
    document.getElementById('donateTagPreview').innerHTML = `
        <span class="tag-pill tag-pill-contribution">${tags.contribution}</span>
        <span class="tag-pill tag-pill-impact">${tags.impact}</span>
        <span class="tag-pill tag-pill-effort">${tags.effort}</span>
    `;

    // Reset amount selection
    selectedAmount = 25;
    selectedVc = 25;
    updateDonateButton();
    document.querySelectorAll('.amount-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.amount === '25');
    });

    showSubView('explore-donate');
}

function updateDonateButton() {
    const btn = document.getElementById('donateProceedBtn');
    btn.textContent = `Donate $${selectedAmount} to ${selectedNonprofit?.name || 'Nonprofit'}`;
}

function completeDonation() {
    // Show confirmation
    document.getElementById('confirmVcAmount').textContent = selectedVc;

    const tags = selectedIssue.tags;
    document.getElementById('confirmTags').innerHTML = `
        <span class="tag-pill tag-pill-contribution">${tags.contribution}</span>
        <span class="tag-pill tag-pill-impact">${tags.impact}</span>
        <span class="tag-pill tag-pill-effort">${tags.effort}</span>
    `;

    showSubView('explore-confirm');
}

// ============ SEND FLOW ============

function renderActivityCards() {
    const container = document.getElementById('activityTypeCards');
    container.innerHTML = ACTIVITIES.map(act => `
        <div class="activity-type-card" data-activity-id="${act.id}">
            <div class="activity-type-icon" style="background: ${act.color}">${act.icon}</div>
            <div class="activity-type-info">
                <div class="activity-type-name">${act.name}</div>
                <div class="activity-type-desc">${act.desc}</div>
            </div>
            <div class="activity-type-vc">+${act.vc} VC</div>
        </div>
    `).join('');

    container.querySelectorAll('.activity-type-card').forEach(card => {
        card.addEventListener('click', () => {
            selectedActivity = ACTIVITIES.find(a => a.id === card.dataset.activityId);
            openSendDetail();
        });
    });
}

function openSendDetail() {
    if (!selectedActivity) return;

    document.getElementById('sendActivityIcon').textContent = selectedActivity.icon;
    document.getElementById('sendActivityName').textContent = selectedActivity.name;
    document.getElementById('sendActivityVc').textContent = `+${selectedActivity.vc} VC for both of you`;

    // Reset form
    document.getElementById('sendRecipient').value = '';
    document.getElementById('sendAmount').value = '';
    document.getElementById('sendDescription').value = '';
    selectedTags = { contribution: null, impact: null, effort: null };

    // Reset tag selections
    document.querySelectorAll('.tag-option').forEach(opt => opt.classList.remove('selected'));

    updateSendButton();
    showSubView('send-detail');
}

function updateSendButton() {
    const btn = document.getElementById('sendProceedBtn');
    const recipient = document.getElementById('sendRecipient').value.trim();
    const amount = document.getElementById('sendAmount').value;
    const hasAllTags = selectedTags.contribution && selectedTags.impact && selectedTags.effort;

    btn.disabled = !(recipient && amount && hasAllTags);

    if (amount) {
        btn.textContent = `Send $${parseFloat(amount).toFixed(2)} + ${selectedActivity?.vc || 0} VC`;
    } else {
        btn.textContent = 'Send Payment';
    }
}

function completeSend() {
    document.getElementById('sendConfirmVc').textContent = selectedActivity.vc;

    const tagsHtml = [];
    if (selectedTags.contribution) tagsHtml.push(`<span class="tag-pill tag-pill-contribution">${selectedTags.contribution}</span>`);
    if (selectedTags.impact) tagsHtml.push(`<span class="tag-pill tag-pill-impact">${selectedTags.impact}</span>`);
    if (selectedTags.effort) tagsHtml.push(`<span class="tag-pill tag-pill-effort">${selectedTags.effort}</span>`);
    document.getElementById('sendConfirmTags').innerHTML = tagsHtml.join('');

    showSubView('send-confirm');
}

// ============ EVENT LISTENERS ============

document.addEventListener('DOMContentLoaded', () => {

    // Bottom nav tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // Quick action cards → navigate to tabs
    document.querySelectorAll('[data-goto]').forEach(el => {
        el.addEventListener('click', () => switchTab(el.dataset.goto));
    });

    // Sub-view navigation (back buttons)
    document.querySelectorAll('[data-back]').forEach(btn => {
        btn.addEventListener('click', () => showSubView(btn.dataset.back));
    });

    // Sub-view navigation (secondary buttons)
    document.querySelectorAll('[data-subview]').forEach(btn => {
        btn.addEventListener('click', () => showSubView(btn.dataset.subview));
    });

    // Amount buttons
    document.querySelectorAll('.amount-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.amount-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedAmount = parseFloat(btn.dataset.amount);
            selectedVc = parseInt(btn.dataset.vc);
            updateDonateButton();
        });
    });

    // Donate proceed button
    document.getElementById('donateProceedBtn').addEventListener('click', () => {
        // In production: open PayPal, wait for confirmation
        // For now: simulate success
        completeDonation();
    });

    // Tag picker (send flow)
    document.querySelectorAll('.tag-option').forEach(opt => {
        opt.addEventListener('click', () => {
            const category = opt.closest('.tag-options').dataset.category;
            // Deselect others in same category
            opt.closest('.tag-options').querySelectorAll('.tag-option').forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
            selectedTags[category] = opt.dataset.tag;
            updateSendButton();
        });
    });

    // Send form inputs → update button state
    ['sendRecipient', 'sendAmount', 'sendDescription'].forEach(id => {
        document.getElementById(id).addEventListener('input', updateSendButton);
    });

    // Send proceed button
    document.getElementById('sendProceedBtn').addEventListener('click', () => {
        if (document.getElementById('sendProceedBtn').disabled) return;
        // In production: generate PayPal.me link, open in new tab
        // For now: simulate success
        completeSend();
    });

    // VC balance pill → go to profile
    document.getElementById('vcBalancePill').addEventListener('click', () => switchTab('profile'));

    // Render dynamic content
    renderIssueCards();
    renderActivityCards();

    // Hero particles
    const particleContainer = document.getElementById('particles');
    if (particleContainer) {
        const colors = ['#14CCB0', '#2563eb', '#F32B44'];
        for (let i = 0; i < 30; i++) {
            const p = document.createElement('div');
            p.className = 'particle';
            p.style.left = Math.random() * 100 + '%';
            p.style.top = (60 + Math.random() * 40) + '%';
            p.style.animationDuration = (8 + Math.random() * 12) + 's';
            p.style.animationDelay = Math.random() * 10 + 's';
            p.style.background = colors[Math.floor(Math.random() * colors.length)];
            particleContainer.appendChild(p);
        }
    }

    // Coin color cycle — each face changes while hidden, revealed on flip
    const fronts = document.querySelectorAll('.coin-front');
    const backs = document.querySelectorAll('.coin-back');
    if (fronts.length) {
        const cycle = () => {
            setTimeout(() => fronts.forEach(f => f.classList.add('teal')), 1500);
            setTimeout(() => backs.forEach(b => b.classList.add('teal')), 3000);
            setTimeout(() => fronts.forEach(f => f.classList.remove('teal')), 7500);
            setTimeout(() => backs.forEach(b => b.classList.remove('teal')), 9000);
        };
        cycle();
        setInterval(cycle, 12000);
    }
});
