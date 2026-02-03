/**
 * VoteCraft Vote Page Application
 *
 * Two-panel interface combining representative lookup with
 * civic reform issue exploration and nonprofit alignment.
 */

class VoteApp {
    constructor() {
        // DOM elements
        this.addressInput = document.getElementById('address-input');
        this.lookupBtn = document.getElementById('lookup-btn');
        this.toggleRepsBtn = document.getElementById('toggle-reps');
        this.toggleIssuesBtn = document.getElementById('toggle-issues');
        this.repsPanel = document.getElementById('reps-panel');
        this.issuesPanel = document.getElementById('issues-panel');
        this.federalSection = document.getElementById('federal-section');
        this.localSection = document.getElementById('local-section');
        this.stateSection = document.getElementById('state-section');
        this.federalList = document.getElementById('federal-list');
        this.localList = document.getElementById('local-list');
        this.stateList = document.getElementById('state-list');
        this.issuesGridView = document.getElementById('issues-grid-view');
        this.issueDetailView = document.getElementById('issue-detail-view');
        this.issuesGrid = document.getElementById('issues-grid');
        this.issuesSidebarList = document.getElementById('issues-sidebar-list');
        this.loadingScreen = document.getElementById('loading-screen');
        this.errorScreen = document.getElementById('error-screen');
        this.errorText = document.getElementById('error-text');
        this.backBtn = document.getElementById('back-btn');

        // Issue detail elements
        this.issueTitle = document.getElementById('issue-title');
        this.issueHeroImg = document.getElementById('issue-hero-img');
        this.issueDescription = document.getElementById('issue-description');
        this.repAlignmentCard = document.getElementById('rep-alignment-card');
        this.repCardPhoto = document.getElementById('rep-card-photo');
        this.repCardName = document.getElementById('rep-card-name');
        this.repAlignmentScore = document.getElementById('rep-alignment-score');
        this.repAlignmentBills = document.getElementById('rep-alignment-bills');
        this.nonprofitsGrid = document.getElementById('nonprofits-grid');

        // State
        this.legislators = [];
        this.selectedRep = null;
        this.selectedIssue = null;
        this.currentJurisdiction = null;
        this.currentCoords = null;
        this.billCache = {};

        this.hasSearched = false;

        this.bindEvents();
        this.renderIssuesGrid();
        this.renderIssuesSidebar();
        this.showPlaceholderReps();
    }

    // ========== EVENTS ==========

    bindEvents() {
        this.lookupBtn.addEventListener('click', () => {
            if (this.hasSearched) {
                this.resetSearch();
            } else {
                this.lookupReps();
            }
        });
        this.addressInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.lookupReps();
        });

        this.toggleRepsBtn.addEventListener('click', () => this.togglePanel('reps'));
        this.toggleIssuesBtn.addEventListener('click', () => this.togglePanel('issues'));

        this.backBtn.addEventListener('click', () => this.goBack());

        // Issue grid click delegation
        this.issuesGrid.addEventListener('click', (e) => {
            const card = e.target.closest('.issue-card');
            if (card) this.showIssueDetail(card.dataset.issueId);
        });

        // Issues sidebar click delegation
        this.issuesSidebarList.addEventListener('click', (e) => {
            const item = e.target.closest('.issue-sidebar-item');
            if (item) this.showIssueDetail(item.dataset.issueId);
        });
    }

    togglePanel(panel) {
        if (panel === 'reps') {
            this.toggleRepsBtn.classList.add('active');
            this.toggleIssuesBtn.classList.remove('active');
            this.repsPanel.style.display = '';
            this.issuesPanel.style.display = 'none';
        } else {
            this.toggleIssuesBtn.classList.add('active');
            this.toggleRepsBtn.classList.remove('active');
            this.issuesPanel.style.display = '';
            this.repsPanel.style.display = 'none';
        }
    }

    // ========== REP LOOKUP ==========

    resetSearch() {
        this.addressInput.value = '';
        this.addressInput.focus();
        this.localLegislators = [];
        this.stateLegislators = [];
        this.legislators = [];
        this.selectedRep = null;
        this.selectedIssue = null;
        this.currentJurisdiction = null;
        this.currentCoords = null;
        this.billCache = {};
        this.hasSearched = false;

        // Reset views
        this.issuesGridView.style.display = '';
        this.issueDetailView.style.display = 'none';
        this.hideError();
        this.showPlaceholderReps();
    }

    async lookupReps() {
        const address = this.addressInput.value.trim();

        // If already searched and input is empty or same, reset for new search
        if (this.hasSearched && !address) {
            this.resetSearch();
            return;
        }

        if (!address) {
            this.addressInput.focus();
            this.addressInput.style.borderColor = '#ef4444';
            setTimeout(() => { this.addressInput.style.borderColor = ''; }, 2000);
            return;
        }

        this.showLoading(true);
        this.hideError();

        try {
            const coords = await window.CivicAPI.geocodeAddress(address);
            this.currentCoords = coords;

            // Get local legislators for this address
            const data = await window.CivicAPI.getStateLegislators(coords.lat, coords.lng);
            this.localLegislators = window.CivicAPI.parseRepresentatives({
                officials: data.results || []
            });

            if (this.localLegislators.length === 0) {
                this.showLoading(false);
                this.showError('No legislators found for this location. Please try a different address.');
                return;
            }

            // Determine the state jurisdiction
            const stateLegislators = this.localLegislators.filter(l => l.level === 'state');
            if (stateLegislators.length > 0 && stateLegislators[0].jurisdiction) {
                this.currentJurisdiction = stateLegislators[0].jurisdiction;
            }

            // Show local/federal reps immediately
            this.stateLegislators = [];
            this.legislators = [...this.localLegislators];
            this.renderReps();
            this.showLoading(false);
            this.hasSearched = true;

            // Auto-select first rep
            if (this.legislators.length > 0) {
                this.selectRep(this.legislators[0]);
            }

            // Fetch all state legislators in the background (non-blocking)
            if (this.currentJurisdiction) {
                const localIds = new Set(this.localLegislators.map(l => l.id));

                // Show loading spinner in state section
                this.stateSection.style.display = '';
                this.stateList.innerHTML = '<div class="state-loading"><div class="mini-loader"></div>Loading state legislators...</div>';

                try {
                    console.log(`Fetching all legislators for ${this.currentJurisdiction}...`);
                    const allPeople = await window.CivicAPI.getAllLegislators(this.currentJurisdiction);
                    console.log(`Got ${allPeople.length} total legislators`);
                    this.stateLegislators = window.CivicAPI.parseRepresentatives({
                        officials: allPeople
                    }).filter(l => !localIds.has(l.id))
                      .sort((a, b) => (a.district || '').localeCompare(b.district || '', undefined, { numeric: true }));
                    console.log(`After filtering local: ${this.stateLegislators.length} state legislators`);

                    // Update combined list and re-render
                    this.legislators = [...this.localLegislators, ...this.stateLegislators];
                    this.renderReps();

                    // Re-select the current rep to keep it highlighted
                    if (this.selectedRep) {
                        this.selectRep(this.selectedRep);
                    }
                } catch (err) {
                    console.error('Error fetching all state legislators:', err);
                }
            }

        } catch (error) {
            console.error('Lookup error:', error);
            this.showLoading(false);
            this.showError(error.message || 'Unable to find legislators. Please check the address and try again.');
        }
    }

    // ========== LEFT PANEL: REPRESENTATIVES ==========

    showPlaceholderReps() {
        const placeholders = [
            { name: 'Your Senator', party: '???', office: 'Senator', district: '', level: 'federal', photoUrl: '' },
            { name: 'Your Senator', party: '???', office: 'Senator', district: '', level: 'federal', photoUrl: '' },
            { name: 'Your Representative', party: '???', office: 'Representative', district: '', level: 'federal', photoUrl: '' }
        ];
        this.federalList.innerHTML = placeholders.map(l => this.renderRepItem(l, true)).join('');
        this.localList.innerHTML = '<p style="color: #9ca3af; font-size: 0.85rem; padding: 8px;">Search to see your local legislators</p>';
        this.stateList.innerHTML = '<p style="color: #9ca3af; font-size: 0.85rem; padding: 8px;">Search to see all state legislators</p>';
    }

    renderReps() {
        // Federal section: US Senators and Representatives
        const federal = this.localLegislators ? this.localLegislators.filter(l => l.level === 'federal') : [];
        if (federal.length > 0) {
            this.federalSection.style.display = '';
            this.federalList.innerHTML = federal.map(l => this.renderRepItem(l)).join('');
        } else {
            this.federalSection.style.display = 'none';
        }

        // Local section: state-level reps from the user's address lookup
        const local = this.localLegislators ? this.localLegislators.filter(l => l.level === 'state') : [];
        if (local.length > 0) {
            this.localSection.style.display = '';
            this.localList.innerHTML = local.map(l => this.renderRepItem(l)).join('');
        } else {
            this.localSection.style.display = 'none';
        }

        // State section: grouped by chamber, House sub-grouped by county
        if (this.stateLegislators && this.stateLegislators.length > 0) {
            this.stateSection.style.display = '';

            const isSenate = l =>
                l.office.toLowerCase().includes('senator') || l.office.toLowerCase().includes('senate');

            const senate = this.stateLegislators.filter(isSenate)
                .sort((a, b) => (a.district || '').localeCompare(b.district || '', undefined, { numeric: true }));

            const house = this.stateLegislators.filter(l => !isSenate(l))
                .sort((a, b) => (a.district || '').localeCompare(b.district || '', undefined, { numeric: true }));

            // Extract county/region from district name (e.g. "3rd Suffolk" -> "Suffolk")
            const getCounty = (district) => {
                if (!district) return 'Other';
                return district.replace(/^\d+(st|nd|rd|th)\s+/i, '').trim() || 'Other';
            };

            // Group House members by county
            const houseByCounty = {};
            for (const rep of house) {
                const county = getCounty(rep.district);
                if (!houseByCounty[county]) houseByCounty[county] = [];
                houseByCounty[county].push(rep);
            }
            const countyKeys = Object.keys(houseByCounty).sort();

            // Group Senate members by county
            const senateByCounty = {};
            for (const rep of senate) {
                const county = getCounty(rep.district);
                if (!senateByCounty[county]) senateByCounty[county] = [];
                senateByCounty[county].push(rep);
            }
            const senateCountyKeys = Object.keys(senateByCounty).sort();

            const senateSubgroups = senateCountyKeys.map(county => {
                const reps = senateByCounty[county];
                const repItems = reps.map(l => this.renderRepItem(l)).join('');
                return `
                    <div class="county-group">
                        <div class="county-header" data-county="${county}">
                            <span class="county-header-title">${county}</span>
                            <span class="district-header-count">${reps.length}</span>
                            <span class="district-toggle">+</span>
                        </div>
                        <div class="county-body" style="display:none;">
                            ${repItems}
                        </div>
                    </div>
                `;
            }).join('');

            const senateHtml = senate.length > 0 ? `
                <div class="district-group">
                    <div class="district-header">
                        <span class="district-header-title">Senate
                            <span class="chamber-desc">State senators are elected from large districts to represent broad communities.</span>
                        </span>
                        <span class="district-header-count">${senate.length}</span>
                        <span class="district-toggle">+</span>
                    </div>
                    <div class="district-body" style="display:none;">
                        ${senateSubgroups}
                    </div>
                </div>
            ` : '';

            // Build House section with county sub-groups
            const houseSubgroups = countyKeys.map(county => {
                const reps = houseByCounty[county];
                const repItems = reps.map(l => this.renderRepItem(l)).join('');
                return `
                    <div class="county-group">
                        <div class="county-header" data-county="${county}">
                            <span class="county-header-title">${county}</span>
                            <span class="district-header-count">${reps.length}</span>
                            <span class="district-toggle">+</span>
                        </div>
                        <div class="county-body" style="display:none;">
                            ${repItems}
                        </div>
                    </div>
                `;
            }).join('');

            const houseHtml = house.length > 0 ? `
                <div class="district-group">
                    <div class="district-header">
                        <span class="district-header-title">House
                            <span class="chamber-desc">House Reps are elected by their local community to specifically represent them.</span>
                        </span>
                        <span class="district-header-count">${house.length}</span>
                        <span class="district-toggle">+</span>
                    </div>
                    <div class="district-body" style="display:none;">
                        ${houseSubgroups}
                    </div>
                </div>
            ` : '';

            this.stateList.innerHTML = senateHtml + houseHtml;

            // Accordion click handlers for chamber + county headers
            this.stateList.querySelectorAll('.district-header, .county-header').forEach(header => {
                header.addEventListener('click', () => {
                    const body = header.nextElementSibling;
                    const toggle = header.querySelector('.district-toggle');
                    const isOpen = body.style.display !== 'none';
                    body.style.display = isOpen ? 'none' : '';
                    toggle.textContent = isOpen ? '+' : '-';
                });
            });
        } else {
            this.stateSection.style.display = 'none';
        }

        // Add click handlers to rep items
        document.querySelectorAll('.rep-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(item.dataset.index);
                if (!isNaN(index) && this.legislators[index]) {
                    this.selectRep(this.legislators[index]);
                }
            });
        });
    }

    renderRepItem(legislator, isPlaceholder = false) {
        const index = isPlaceholder ? -1 : this.legislators.indexOf(legislator);
        const photoHtml = legislator.photoUrl
            ? `<img src="${legislator.photoUrl}" alt="${legislator.name}" onerror="this.style.display='none'; this.parentElement.textContent='${this.getInitials(legislator.name)}';">`
            : this.getInitials(legislator.name);

        const isUpper = legislator.office.toLowerCase().includes('senator') ||
                        legislator.office.toLowerCase().includes('senate');
        const chamberClass = isUpper ? 'upper' : 'lower';
        const chamberLabel = isUpper ? 'Senate' : 'House';

        const partyLower = legislator.party.toLowerCase();
        let partyClass = '';
        if (partyLower.includes('democrat')) partyClass = 'democratic';
        else if (partyLower.includes('republican')) partyClass = 'republican';

        const districtText = legislator.district ? `• District ${legislator.district}` : '';

        return `
            <div class="rep-item ${isPlaceholder ? 'placeholder' : ''}" data-index="${index}">
                <div class="rep-photo">${photoHtml}</div>
                <div class="rep-info">
                    <div class="rep-name">${legislator.name}</div>
                    <div class="rep-details">
                        <span class="rep-party ${partyClass}">${legislator.party}</span>
                        ${districtText ? `<span class="rep-district">${districtText}</span>` : ''}
                    </div>
                </div>
                <span class="chamber-badge ${chamberClass}">${chamberLabel}</span>
            </div>
        `;
    }

    selectRep(legislator) {
        this.selectedRep = legislator;
        const index = this.legislators.indexOf(legislator);

        // Update visual selection
        document.querySelectorAll('.rep-item').forEach(item => {
            item.classList.remove('selected');
            if (parseInt(item.dataset.index) === index) {
                item.classList.add('selected');
            }
        });

        // If issue detail is showing, load alignment
        if (this.selectedIssue) {
            this.loadRepAlignment(legislator, this.selectedIssue);
        }
    }

    // ========== RIGHT PANEL: ISSUES GRID ==========

    renderIssuesGrid() {
        this.issuesGrid.innerHTML = window.ISSUES_CATALOG.map(issue => `
            <div class="issue-card" data-issue-id="${issue.id}">
                <div class="issue-card-image">
                    <img src="${issue.heroImage}" alt="${issue.title}"
                         onerror="this.style.display='none';">
                </div>
                <div class="issue-card-title">${issue.title}</div>
            </div>
        `).join('');
    }

    renderIssuesSidebar() {
        this.issuesSidebarList.innerHTML = window.ISSUES_CATALOG.map(issue => `
            <div class="issue-sidebar-item" data-issue-id="${issue.id}">
                ${issue.title}
            </div>
        `).join('');
    }

    // ========== RIGHT PANEL: ISSUE DETAIL ==========

    showIssueDetail(issueId) {
        const issue = window.ISSUES_CATALOG.find(i => i.id === issueId);
        if (!issue) return;

        this.selectedIssue = issue;

        // Switch views
        this.issuesGridView.style.display = 'none';
        this.issueDetailView.style.display = '';

        // Render content
        this.issueTitle.textContent = issue.title;
        this.issueHeroImg.src = issue.heroImage;
        this.issueHeroImg.alt = issue.title;
        this.issueDescription.textContent = issue.description;

        // Render nonprofits
        this.renderNonprofits(issue);

        // Show rep alignment if a rep is selected
        if (this.selectedRep) {
            this.repAlignmentCard.style.display = '';
            this.loadRepAlignment(this.selectedRep, issue);
        } else {
            this.repAlignmentCard.style.display = '';
            this.repCardPhoto.innerHTML = '<div style="font-size:2rem;">?</div>';
            this.repCardName.textContent = 'Select a representative';
            this.repAlignmentScore.textContent = '';
            this.repAlignmentBills.innerHTML = '<p class="alignment-prompt">Search for your location and select a representative to see how they align on this issue.</p>';
        }
    }

    renderNonprofits(issue) {
        if (!issue.nonprofits || issue.nonprofits.length === 0) {
            this.nonprofitsGrid.innerHTML = '';
            return;
        }

        this.nonprofitsGrid.innerHTML = issue.nonprofits.map(np => {
            const logoHtml = np.logo
                ? `<img src="${np.logo}" alt="${np.name}" onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\'np-initials\\'>${this.getInitials(np.name)}</div>';">`
                : `<div class="np-initials">${this.getInitials(np.name)}</div>`;

            return `
                <div class="nonprofit-card">
                    <div class="nonprofit-logo">${logoHtml}</div>
                    <a href="${np.donateUrl}" target="_blank" rel="noopener" class="btn-donate">Donate</a>
                </div>
            `;
        }).join('');
    }

    goBack() {
        this.issueDetailView.style.display = 'none';
        this.issuesGridView.style.display = '';
        this.selectedIssue = null;
    }

    // ========== REP ALIGNMENT ==========

    async loadRepAlignment(rep, issue) {
        // Show loading state in alignment card
        this.repAlignmentCard.style.display = '';
        const photoHtml = rep.photoUrl
            ? `<img src="${rep.photoUrl}" alt="${rep.name}" onerror="this.style.display='none'; this.parentElement.textContent='${this.getInitials(rep.name)}';">`
            : this.getInitials(rep.name);
        this.repCardPhoto.innerHTML = photoHtml;
        this.repCardName.textContent = rep.name;
        this.repAlignmentScore.textContent = 'Loading alignment...';
        this.repAlignmentBills.innerHTML = '<div class="alignment-loading"><div class="mini-loader"></div>Searching bills...</div>';

        // Use the rep's own jurisdiction — federal reps need federal bill search
        const jurisdiction = rep.level === 'federal'
            ? 'United States'
            : (rep.jurisdiction || this.currentJurisdiction);

        if (!jurisdiction) {
            this.repAlignmentScore.textContent = 'Unable to determine jurisdiction';
            this.repAlignmentBills.innerHTML = '<p class="alignment-prompt">Could not determine the legislative jurisdiction for this representative.</p>';
            return;
        }

        console.log(`Loading alignment for ${rep.name} (${rep.level}) in jurisdiction: ${jurisdiction}`);

        // Check cache (keyed by issue + jurisdiction)
        const cacheKey = `${issue.id}_${jurisdiction}`;
        let allBills = this.billCache[cacheKey];

        if (!allBills) {
            // Fetch bills for each keyword
            allBills = [];
            const seenIds = new Set();

            for (const keyword of issue.billKeywords) {
                try {
                    console.log(`  Searching "${keyword}" in ${jurisdiction}...`);
                    const bills = await window.CivicAPI.getBillsBySubject(
                        jurisdiction, keyword, 10
                    );
                    console.log(`  Found ${bills.length} bills for "${keyword}"`);
                    for (const bill of bills) {
                        if (!seenIds.has(bill.id)) {
                            seenIds.add(bill.id);
                            allBills.push(bill);
                        }
                    }
                } catch (err) {
                    console.error(`Error fetching bills for keyword "${keyword}":`, err);
                }
            }

            console.log(`Total unique bills found: ${allBills.length}`);
            this.billCache[cacheKey] = allBills;
        }

        // Compute alignment
        const alignment = this.computeAlignmentScore(rep, allBills);
        this.renderRepAlignmentCard(rep, alignment);
    }

    computeAlignmentScore(rep, bills) {
        const repLastName = rep.name.split(' ').pop().toLowerCase();
        const matchedBills = [];

        for (const bill of bills) {
            if (!bill.sponsorships) continue;
            for (const sponsor of bill.sponsorships) {
                const sponsorName = (sponsor.name || sponsor.person?.name || '').toLowerCase();
                if (sponsorName.includes(repLastName)) {
                    matchedBills.push(bill);
                    break;
                }
            }
        }

        return {
            totalBills: bills.length,
            sponsoredCount: matchedBills.length,
            matchedBills: matchedBills,
            allBills: bills
        };
    }

    renderRepAlignmentCard(rep, alignment) {
        if (alignment.totalBills === 0) {
            this.repAlignmentScore.textContent = 'No related bills found';
            this.repAlignmentBills.innerHTML = '<p class="alignment-prompt">No bills matching this issue were found in the current legislative session.</p>';
            return;
        }

        // Show sponsorship count if any, otherwise just the bill count
        if (alignment.sponsoredCount > 0) {
            this.repAlignmentScore.textContent = `Sponsored ${alignment.sponsoredCount} of ${alignment.totalBills} related bill${alignment.totalBills === 1 ? '' : 's'}`;
        } else {
            this.repAlignmentScore.textContent = `${alignment.totalBills} related bill${alignment.totalBills === 1 ? '' : 's'} found`;
        }

        // Show sponsored bills first, then other related bills
        const sponsoredBills = alignment.matchedBills.slice(0, 5);
        const otherBills = alignment.allBills
            ? alignment.allBills.filter(b => !alignment.matchedBills.includes(b)).slice(0, 5 - sponsoredBills.length)
            : [];
        const billsToShow = [...sponsoredBills, ...otherBills].slice(0, 5);

        const billsHtml = billsToShow.map(bill => {
            const title = bill.title || bill.identifier || 'Untitled bill';
            const identifier = bill.identifier || '';
            const url = bill.openstates_url || '#';
            const isSponsored = alignment.matchedBills.includes(bill);
            const sponsorBadge = isSponsored ? ' <span style="color: #22c55e; font-weight: 600;">✓ Sponsor</span>' : '';
            return `
                <div class="bill-item">
                    <a href="${url}" target="_blank" rel="noopener">${identifier}</a>${sponsorBadge}
                    <div style="font-size:0.8rem; color: var(--text-light); margin-top: 2px;">${title.length > 80 ? title.substring(0, 80) + '...' : title}</div>
                </div>
            `;
        }).join('');

        this.repAlignmentBills.innerHTML = billsHtml;
    }

    // ========== UTILITY ==========

    showLoading(show) {
        if (show) {
            this.loadingScreen.classList.add('active');
            this.hideError();
        } else {
            this.loadingScreen.classList.remove('active');
        }
    }

    showError(message) {
        this.errorText.textContent = message;
        this.errorScreen.style.display = 'block';
    }

    hideError() {
        this.errorScreen.style.display = 'none';
    }

    getInitials(name) {
        return name.split(' ')
            .map(word => word[0])
            .filter(Boolean)
            .join('')
            .toUpperCase()
            .substring(0, 2);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.voteApp = new VoteApp();
});
