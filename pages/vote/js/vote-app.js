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
        this.federalSenatorsSection = document.getElementById('federal-senators-section');
        this.stateSenatorsSection = document.getElementById('state-senators-section');
        this.houseSection = document.getElementById('house-section');
        this.stateSection = document.getElementById('state-section');
        this.executiveSection = document.getElementById('executive-section');
        this.federalSenatorsList = document.getElementById('federal-senators-list');
        this.stateSenatorsList = document.getElementById('state-senators-list');
        this.houseList = document.getElementById('house-list');
        this.stateList = document.getElementById('state-list');
        this.executiveList = document.getElementById('executive-list');
        this.issuesGridView = document.getElementById('issues-grid-view');
        this.issueDetailView = document.getElementById('issue-detail-view');
        this.issuesGrid = document.getElementById('issues-grid');
        this.issuesSidebarList = document.getElementById('issues-sidebar-list');
        this.loadingScreen = document.getElementById('loading-screen');
        this.errorScreen = document.getElementById('error-screen');
        this.errorText = document.getElementById('error-text');
        this.switchIssueBtn = document.getElementById('switch-issue-btn');

        // Issue detail elements
        this.issueTitle = document.getElementById('issue-title');
        this.issueHeroImg = document.getElementById('issue-hero-img');
        this.issueDescription = document.getElementById('issue-description');
        this.repAlignmentCard = document.getElementById('rep-alignment-card');
        this.repCardPhoto = document.getElementById('rep-card-photo');
        this.repCardName = document.getElementById('rep-card-name');
        this.repAlignmentScore = document.getElementById('rep-alignment-score');
        this.repAlignmentBills = document.getElementById('rep-alignment-bills');
        this.nonprofitsSection = document.getElementById('nonprofits-section');
        this.nonprofitsGrid = document.getElementById('nonprofits-grid');
        this.topSupportersWidget = document.getElementById('top-supporters-widget');
        this.topSupportersList = document.getElementById('top-supporters-list');
        this.viewAllSupportersBtn = document.getElementById('view-all-supporters-btn');
        this.learnMoreBtn = document.getElementById('learn-more-btn');
        this.learnMoreModal = document.getElementById('learn-more-modal');
        this.learnMoreIframe = document.getElementById('learn-more-iframe');
        this.learnMoreClose = document.getElementById('learn-more-close');

        // Rep website modal
        this.repWebsiteModal = document.getElementById('rep-website-modal');
        this.repWebsiteIframe = document.getElementById('rep-website-iframe');
        this.repWebsiteClose = document.getElementById('rep-website-close');

        // State
        this.legislators = [];
        this.selectedRep = null;
        this.selectedIssue = null;
        this.currentJurisdiction = null;
        this.currentCoords = null;
        this.billCache = {};
        this.activeStance = null;
        this.issueMap = null;

        this.hasSearched = false;
        this._topSupportersVersion = 0;

        this.bindEvents();
        this.renderIssuesGrid();
        this.renderIssuesSidebar();
        this.showPlaceholderReps();
    }

    // ========== MAP ==========

    initMap() {
        if (this.issueMap) {
            this.issueMap.invalidateSize();
            return;
        }
        this.issueMap = L.map('issue-map', {
            center: [37.8, -96],
            zoom: 4,
            zoomControl: false,
            attributionControl: false
        });
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19
        }).addTo(this.issueMap);
        this.districtLayer = null;
    }

    async showDistrictOnMap(legislator) {
        if (!this.issueMap || !this.currentCoords) return;

        // Clear previous district
        if (this.districtLayer) {
            this.issueMap.removeLayer(this.districtLayer);
            this.districtLayer = null;
        }

        const isUpper = legislator.office.toLowerCase().includes('senator') ||
                        legislator.office.toLowerCase().includes('senate');

        try {
            let district = null;

            if (legislator.level === 'congress' && isUpper) {
                // US Senator — show state boundary
                district = await window.CivicAPI.getStateBoundary(
                    this.currentCoords.lat, this.currentCoords.lng
                );
            } else {
                const boundaries = await window.CivicAPI.getDistrictBoundaries(
                    this.currentCoords.lat, this.currentCoords.lng
                );

                if (legislator.level === 'congress') {
                    // US Representative — congressional district
                    district = boundaries.congressional;
                } else {
                    // State legislator
                    district = isUpper ? boundaries.stateSenate : boundaries.stateHouse;
                }
            }

            if (district) {
                this.districtLayer = L.geoJSON(district, {
                    style: {
                        color: '#2563eb',
                        weight: 2,
                        fillColor: '#2563eb',
                        fillOpacity: 0.15
                    }
                }).addTo(this.issueMap);
                this.issueMap.fitBounds(this.districtLayer.getBounds(), { padding: [20, 20] });
            } else {
                this.issueMap.setView([this.currentCoords.lat, this.currentCoords.lng], 10);
            }
        } catch (err) {
            console.error('Error loading district boundary:', err);
            this.issueMap.setView([this.currentCoords.lat, this.currentCoords.lng], 10);
        }
    }

    syncHeights() {
        const hero = document.getElementById('issue-hero');
        const mapCard = document.getElementById('issue-map-card');
        if (!hero || !mapCard) return;

        requestAnimationFrame(() => {
            // Align title left edge with hero left edge
            const view = this.issueDetailView;
            if (hero && view && this.issueTitle) {
                const heroLeft = hero.getBoundingClientRect().left;
                const viewLeft = view.getBoundingClientRect().left;
                this.issueTitle.style.marginLeft = (heroLeft - viewLeft) + 'px';
            }

            if (this.issueMap) this.issueMap.invalidateSize();
        });
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

        this.switchIssueBtn.addEventListener('click', (e) => { e.preventDefault(); this.goBack(); });

        document.getElementById('to-top-btn').addEventListener('click', () => {
            this.issueDetailView.scrollIntoView({ behavior: 'smooth' });
        });

        // Support overlay
        this.supportOverlay = document.getElementById('support-overlay');
        document.getElementById('support-overlay-close').addEventListener('click', () => this.closeSupportOverlay());
        this.nonprofitsGrid.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-donate');
            if (btn) {
                e.preventDefault();
                this.openSupportOverlay(btn);
            }
        });

        // Donate frequency toggle
        this.supportOverlay.querySelectorAll('.donate-freq-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.supportOverlay.querySelectorAll('.donate-freq-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Donate amount selection
        this.supportOverlay.querySelectorAll('.donate-amount-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.supportOverlay.querySelectorAll('.donate-amount-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            });
        });

        this.viewAllSupportersBtn.addEventListener('click', () => this.openSidebarSupporters());

        // Top supporters widget click delegation
        this.topSupportersList.addEventListener('click', (e) => {
            const item = e.target.closest('.top-supporter-item');
            if (item && item.dataset.index !== undefined) {
                const index = parseInt(item.dataset.index);
                if (!isNaN(index) && this.legislators[index]) {
                    this.selectRep(this.legislators[index]);
                }
            }
        });

        this.learnMoreBtn.addEventListener('click', () => this.openLearnMore());
        this.learnMoreClose.addEventListener('click', () => this.closeLearnMore());
        this.repWebsiteClose.addEventListener('click', () => this.closeRepWebsite());

        // Panel expand/collapse
        const expandLeftBtn = document.getElementById('expand-left-btn');
        const expandRightBtn = document.getElementById('expand-right-btn');
        const restoreBtn = document.getElementById('restore-btn');
        const layout = document.querySelector('.vote-layout');
        const isMobile = () => window.matchMedia('(max-width: 900px)').matches;

        // Start with sidebar full screen on mobile
        if (isMobile()) {
            layout.classList.add('expand-left');
        }

        if (expandLeftBtn) {
            expandLeftBtn.addEventListener('click', () => {
                if (isMobile()) {
                    // Mobile: up arrow = slide sidebar up, reveal content
                    layout.classList.remove('expand-left');
                    layout.classList.add('expand-right');
                } else {
                    layout.classList.remove('expand-right');
                    layout.classList.add('expand-left');
                }
                restoreBtn.classList.add('visible');
                if (this.issueMap) {
                    setTimeout(() => this.issueMap.invalidateSize(), 650);
                }
            });
        }
        if (expandRightBtn) {
            expandRightBtn.addEventListener('click', () => {
                if (isMobile()) {
                    // Mobile: down arrow = slide content down, reveal sidebar
                    layout.classList.remove('expand-right');
                    layout.classList.add('expand-left');
                } else {
                    layout.classList.remove('expand-left');
                    layout.classList.add('expand-right');
                }
                restoreBtn.classList.add('visible');
                if (this.issueMap) {
                    setTimeout(() => this.issueMap.invalidateSize(), 650);
                }
            });
        }
        if (restoreBtn) {
            restoreBtn.addEventListener('click', () => {
                layout.classList.remove('expand-left', 'expand-right');
                restoreBtn.classList.remove('visible');
                if (this.issueMap) {
                    setTimeout(() => this.issueMap.invalidateSize(), 650);
                }
                this.syncHeights();
            });
        }

        // Issue grid click delegation
        this.issuesGrid.addEventListener('click', (e) => {
            const card = e.target.closest('.issue-card');
            if (card) this.showIssueDetail(card.dataset.issueId);
        });

        // Issues sidebar click delegation
        this.issuesSidebarList.addEventListener('click', (e) => {
            // Explore button — switch to Issues tab and restore split view
            const exploreBtn = e.target.closest('.explore-stance');
            if (exploreBtn) {
                e.stopPropagation();
                const layout = document.querySelector('.vote-layout');
                const restoreBtn = document.getElementById('restore-btn');
                layout.classList.remove('expand-left', 'expand-right');
                if (restoreBtn) restoreBtn.classList.remove('visible');
                this.togglePanel('issues');
                if (this.issueMap) {
                    setTimeout(() => this.issueMap.invalidateSize(), 650);
                }
                return;
            }

            // Stance button clicks
            const stanceBtn = e.target.closest('.stance-btn');
            if (stanceBtn) {
                e.stopPropagation();
                const issueId = stanceBtn.dataset.issueId;
                const stance = stanceBtn.dataset.stance;
                this.toggleStance(issueId, stance);
                return;
            }

            // Stance rep item clicks (supporters/opposed in sidebar)
            const stanceRep = e.target.closest('.stance-rep-item');
            if (stanceRep && !stanceRep.classList.contains('placeholder')) {
                e.stopPropagation();
                const index = parseInt(stanceRep.dataset.index);
                console.log('Clicked stance rep item, index:', index, 'legislators count:', this.legislators.length);
                if (!isNaN(index) && index >= 0 && this.legislators[index]) {
                    this.selectRep(this.legislators[index]);
                    // Scroll the rep alignment card into view on mobile
                    if (window.innerWidth <= 900 && this.repAlignmentCard) {
                        setTimeout(() => this.repAlignmentCard.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
                    }
                } else {
                    console.warn('Invalid index or legislator not found:', index);
                }
                return;
            }

            // Issue item clicks — toggle open/close
            const item = e.target.closest('.issue-sidebar-item');
            if (item) {
                const issueId = item.dataset.issueId;
                if (this.selectedIssue && this.selectedIssue.id === issueId) {
                    this.collapseIssue();
                } else {
                    this.showIssueDetail(issueId);
                }
            }
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
        this.activeStance = null;
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

        // Check if input is just a state name
        const stateNames = [
            'alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado',
            'connecticut', 'delaware', 'florida', 'georgia', 'hawaii', 'idaho',
            'illinois', 'indiana', 'iowa', 'kansas', 'kentucky', 'louisiana',
            'maine', 'maryland', 'massachusetts', 'michigan', 'minnesota', 'mississippi',
            'missouri', 'montana', 'nebraska', 'nevada', 'new hampshire', 'new jersey',
            'new mexico', 'new york', 'north carolina', 'north dakota', 'ohio', 'oklahoma',
            'oregon', 'pennsylvania', 'rhode island', 'south carolina', 'south dakota',
            'tennessee', 'texas', 'utah', 'vermont', 'virginia', 'washington',
            'west virginia', 'wisconsin', 'wyoming', 'district of columbia'
        ];
        const inputLower = address.toLowerCase().trim();
        const matchedState = stateNames.find(s => s === inputLower);

        if (matchedState) {
            // Direct state search - fetch all legislators for this state
            const stateName = matchedState.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            this.currentJurisdiction = stateName;

            try {
                const [allPeople, congressRaw] = await Promise.all([
                    window.CivicAPI.getAllLegislators(stateName),
                    window.CivicAPI.getCongressMembers(null, stateName)
                ]);
                const congressParsed = window.CivicAPI.parseRepresentatives({ officials: congressRaw });
                this.localLegislators = [...congressParsed];
                this.stateLegislators = window.CivicAPI.parseRepresentatives({ officials: allPeople });
                this.legislators = [...this.localLegislators, ...this.stateLegislators];
                this.renderReps();
                this.showLoading(false);
                this.hasSearched = true;

                if (this.legislators.length > 0) {
                    this.selectRep(this.legislators[0]);
                }
                return;
            } catch (err) {
                console.error('Error fetching state legislators:', err);
                this.showLoading(false);
                this.showError('Could not load legislators for ' + stateName);
                return;
            }
        }

        try {
            const coords = await window.CivicAPI.geocodeAddress(address);
            this.currentCoords = coords;

            // Get local legislators for this address
            const data = await window.CivicAPI.getStateLegislators(coords.lat, coords.lng);
            this.localLegislators = window.CivicAPI.parseRepresentatives({
                officials: data.results || []
            });

            // Determine the state jurisdiction
            const stateLegislators = this.localLegislators.filter(l => l.level === 'state');
            if (stateLegislators.length > 0 && stateLegislators[0].jurisdiction) {
                this.currentJurisdiction = stateLegislators[0].jurisdiction;
            } else if (coords.state) {
                this.currentJurisdiction = coords.state;
            }

            // Fetch Congress members from local DB if people.geo didn't return any
            const hasCongressMembers = this.localLegislators.some(l => l.level === 'congress');
            if (!hasCongressMembers && this.currentJurisdiction) {
                try {
                    const congressRaw = await window.CivicAPI.getCongressMembers(null, this.currentJurisdiction);
                    if (congressRaw.length > 0) {
                        const congressParsed = window.CivicAPI.parseRepresentatives({ officials: congressRaw });
                        this.localLegislators = [...congressParsed, ...this.localLegislators];
                        console.log(`Added ${congressParsed.length} Congress members from local DB`);
                    }
                } catch (err) {
                    console.log('Could not fetch Congress members:', err.message);
                }
            }

            // If people.geo returned nothing but we have a state, fetch all legislators
            if (this.localLegislators.length === 0 && this.currentJurisdiction) {
                try {
                    const [allPeople, congressRaw] = await Promise.all([
                        window.CivicAPI.getAllLegislators(this.currentJurisdiction),
                        window.CivicAPI.getCongressMembers(null, this.currentJurisdiction)
                    ]);
                    const congressParsed = window.CivicAPI.parseRepresentatives({ officials: congressRaw });
                    this.localLegislators = [...congressParsed];
                    this.stateLegislators = window.CivicAPI.parseRepresentatives({ officials: allPeople });
                    this.legislators = [...this.localLegislators, ...this.stateLegislators];
                    this.renderReps();
                    this.showLoading(false);
                    this.hasSearched = true;
                    if (this.legislators.length > 0) {
                        this.selectRep(this.legislators[0]);
                    }
                    return;
                } catch (err) {
                    console.error('Fallback state lookup failed:', err);
                }
            }

            if (this.localLegislators.length === 0) {
                this.showLoading(false);
                this.showError('No legislators found for this location. Please try a different address.');
                return;
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
                // Show loading spinner in state section
                this.stateSection.style.display = '';
                this.stateList.innerHTML = '<div class="state-loading"><div class="mini-loader"></div>Loading state legislators...</div>';

                try {
                    const allPeople = await window.CivicAPI.getAllLegislators(this.currentJurisdiction);

                    // Build maps for deduplication (by ID and by normalized last name)
                    const localIds = new Set(this.localLegislators.map(l => l.id));
                    const localByLastName = new Map();
                    this.localLegislators.forEach((l, idx) => {
                        localByLastName.set(this.normalizeNameForDedup(l.name), idx);
                    });

                    // Helper to score how much data a legislator has
                    // Image is weighted heavily as it's the key indicator of a complete record
                    const dataScore = (l) => {
                        let score = 0;
                        if (l.party && l.party !== 'Unknown') score += 1;
                        if (l.photoUrl) score += 5; // Image is most important
                        if (l.emails && l.emails.length > 0) score += 1;
                        if (l.phones && l.phones.length > 0) score += 1;
                        if (l.district) score += 1;
                        return score;
                    };

                    this.stateLegislators = window.CivicAPI.parseRepresentatives({
                        officials: allPeople
                    }).filter(l => {
                        // Skip if same ID
                        if (localIds.has(l.id)) return false;
                        // Check if same last name (likely duplicate Congress rep with different format)
                        const normalizedName = this.normalizeNameForDedup(l.name);
                        if (localByLastName.has(normalizedName)) {
                            const localIdx = localByLastName.get(normalizedName);
                            const localLeg = this.localLegislators[localIdx];
                            const stateScore = dataScore(l);
                            const localScore = dataScore(localLeg);
                            // Compare data - keep the one with more info
                            if (stateScore > localScore) {
                                console.log('Replacing duplicate with better data:', localLeg.name, `(score ${localScore})`, '->', l.name, `(score ${stateScore})`);
                                this.localLegislators[localIdx] = l;
                            } else {
                                console.log('Skipping duplicate (local has more data):', l.name, `(state: ${stateScore}, local: ${localScore})`);
                            }
                            return false;
                        }
                        return true;
                    }).sort((a, b) => (a.district || '').localeCompare(b.district || '', undefined, { numeric: true }));

                    // Update combined list and re-render
                    this.legislators = [...this.localLegislators, ...this.stateLegislators];
                    this.renderReps();

                    // Re-select the current rep to keep it highlighted
                    if (this.selectedRep) {
                        this.selectRep(this.selectedRep);
                    }

                    // Refresh top supporters now that full legislator list is available
                    if (this.selectedIssue) {
                        this.loadTopSupporters(this.selectedIssue);
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
        const federalSenatorPlaceholders = [
            { name: 'Your Senator', party: '???', office: 'U.S. Senator', district: '', level: 'congress', photoUrl: '' },
            { name: 'Your Senator', party: '???', office: 'U.S. Senator', district: '', level: 'congress', photoUrl: '' }
        ];
        const housePlaceholders = [
            { name: 'Your Representative', party: '???', office: 'U.S. Representative', district: '', level: 'congress', photoUrl: '' }
        ];
        this.federalSenatorsList.innerHTML = federalSenatorPlaceholders.map(l => this.renderRepItem(l, true)).join('');
        this.stateSenatorsList.innerHTML = '<p style="color: #9ca3af; font-size: 0.85rem; padding: 8px;">Search to see your state senators</p>';
        this.houseList.innerHTML = housePlaceholders.map(l => this.renderRepItem(l, true)).join('');
        this.stateList.innerHTML = '<p style="color: #9ca3af; font-size: 0.85rem; padding: 8px;">Search to see all state legislators</p>';
        this.executiveList.innerHTML = '<p style="color: #9ca3af; font-size: 0.85rem; padding: 8px;">Search to see executive branch officials</p>';
    }

    renderReps() {
        // Helper to check if a legislator is a Senator (upper chamber)
        const isSenator = (l) => {
            const office = (l.office || '').toLowerCase();
            return office.includes('senator') || office.includes('senate');
        };

        // Get legislators by level from localLegislators
        const congressMembers = this.localLegislators ? this.localLegislators.filter(l => l.level === 'congress') : [];
        const stateLocalMembers = this.localLegislators ? this.localLegislators.filter(l => l.level === 'state') : [];
        const localExecutives = this.localLegislators ? this.localLegislators.filter(l => l.level === 'executive') : [];

        // Split congress into Federal Senators and House Representatives
        const federalSenators = congressMembers.filter(isSenator);
        const houseReps = congressMembers.filter(l => !isSenator(l));

        // Get state senators from state local members
        const stateSenators = stateLocalMembers.filter(isSenator);

        // Get executive officials from stateLegislators as well
        const stateExecutives = this.stateLegislators ? this.stateLegislators.filter(l => l.level === 'executive') : [];

        // Combine and deduplicate executives by name
        const executiveMap = new Map();
        [...localExecutives, ...stateExecutives].forEach(e => {
            if (!executiveMap.has(e.name)) {
                executiveMap.set(e.name, e);
            }
        });
        const executiveOfficials = Array.from(executiveMap.values());

        // Federal Senators section (US Senators)
        if (federalSenators.length > 0) {
            this.federalSenatorsSection.style.display = '';
            this.federalSenatorsList.innerHTML = federalSenators.map(l => this.renderRepItem(l)).join('');
        } else {
            this.federalSenatorsSection.style.display = 'none';
        }

        // State Senators section (local state senators from address lookup)
        if (stateSenators.length > 0) {
            this.stateSenatorsSection.style.display = '';
            this.stateSenatorsList.innerHTML = stateSenators.map(l => this.renderRepItem(l)).join('');
        } else {
            this.stateSenatorsSection.style.display = 'none';
        }

        // House of Representatives section (US Representatives)
        if (houseReps.length > 0) {
            this.houseSection.style.display = '';
            this.houseList.innerHTML = houseReps.map(l => this.renderRepItem(l)).join('');
        } else {
            this.houseSection.style.display = 'none';
        }

        // Executive Branch section
        if (executiveOfficials.length > 0) {
            this.executiveSection.style.display = '';
            this.executiveList.innerHTML = executiveOfficials.map(l => this.renderRepItem(l)).join('');
        } else {
            this.executiveSection.style.display = 'none';
        }

        // State section: grouped by chamber, House sub-grouped by county
        // Filter to only include state legislators (not executives or congress)
        const stateLegislatorsFiltered = this.stateLegislators ? this.stateLegislators.filter(l => l.level === 'state') : [];

        if (stateLegislatorsFiltered.length > 0) {
            this.stateSection.style.display = '';

            const isSenate = l =>
                l.office.toLowerCase().includes('senator') || l.office.toLowerCase().includes('senate');

            const senate = stateLegislatorsFiltered.filter(isSenate)
                .sort((a, b) => (a.district || '').localeCompare(b.district || '', undefined, { numeric: true }));

            const house = stateLegislatorsFiltered.filter(l => !isSenate(l))
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

            // Explore badge click — switch to Issues tab only
            const exploreBadge = item.querySelector('.explore-badge');
            if (exploreBadge) {
                exploreBadge.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.togglePanel('issues');
                });
            }
        });
    }

    renderRepItem(legislator, isPlaceholder = false) {
        const index = isPlaceholder ? -1 : this.legislators.indexOf(legislator);
        const photoHtml = legislator.photoUrl
            ? `<img src="${legislator.photoUrl}" alt="${legislator.name}" onerror="this.style.display='none'; this.parentElement.textContent='${this.getInitials(legislator.name)}';">`
            : this.getInitials(legislator.name);

        const isUpper = legislator.office.toLowerCase().includes('senator') ||
                        legislator.office.toLowerCase().includes('senate');
        const chamberLabel = isUpper ? 'Senate' : 'House';

        const partyLower = legislator.party.toLowerCase();
        let partyClass = '';
        if (partyLower.includes('democrat')) partyClass = 'democratic';
        else if (partyLower.includes('republican')) partyClass = 'republican';

        const districtText = legislator.district ? `District ${legislator.district}` : '';

        return `
            <div class="rep-item ${isPlaceholder ? 'placeholder' : ''}" data-index="${index}">
                <div class="rep-photo">${photoHtml}</div>
                <div class="rep-info">
                    <div class="rep-name">${legislator.name}</div>
                    <div class="rep-details">
                        <span class="rep-party ${partyClass}">${legislator.party}</span>
                        <span class="rep-separator">•</span>
                        <span class="rep-chamber">${chamberLabel}</span>
                    </div>
                    ${districtText ? `<div class="rep-district">${districtText}</div>` : ''}
                </div>
                <span class="explore-badge">Explore</span>
            </div>
        `;
    }

    selectRep(legislator) {
        this.selectedRep = legislator;
        const index = this.legislators.indexOf(legislator);
        console.log('selectRep called:', legislator.name, 'index:', index);

        // Update visual selection in reps panel
        document.querySelectorAll('.rep-item').forEach(item => {
            item.classList.remove('selected');
            if (parseInt(item.dataset.index) === index) {
                item.classList.add('selected');
            }
        });

        // Update visual selection in stance list
        document.querySelectorAll('.stance-rep-item').forEach(item => {
            item.classList.remove('selected');
            if (parseInt(item.dataset.index) === index) {
                item.classList.add('selected');
            }
        });

        // Always show the rep card with basic info
        this.showRepCard(legislator);

        // If issue detail is showing, load alignment and update map
        if (this.selectedIssue) {
            this.loadRepAlignment(legislator, this.selectedIssue);
            this.showDistrictOnMap(legislator);
        }
    }

    showRepCard(rep) {
        // Show basic rep info in the alignment card even without full alignment data
        this.repAlignmentCard.classList.remove('placeholder');
        this.repAlignmentCard.style.display = '';

        const photoHtml = rep.photoUrl
            ? `<img src="${rep.photoUrl}" alt="${rep.name}" onerror="this.style.display='none'; this.parentElement.textContent='${this.getInitials(rep.name)}';">`
            : this.getInitials(rep.name);
        this.repCardPhoto.innerHTML = photoHtml;

        const partyLower = (rep.party || '').toLowerCase();
        let partyClass = '';
        if (partyLower.includes('democrat')) partyClass = 'democratic';
        else if (partyLower.includes('republican')) partyClass = 'republican';

        const districtText = rep.district ? ` &middot; District ${rep.district}` : '';
        const levelText = rep.level === 'congress' ? ' &middot; U.S. Congress' : '';

        // Make name clickable if rep has personal website
        const nameClass = rep.personalWebsite ? 'rep-card-name-link' : '';
        const nameHtml = rep.personalWebsite
            ? `<span class="${nameClass}" data-website="${rep.personalWebsite}">${rep.name}</span>`
            : rep.name;
        this.repCardName.innerHTML = `${nameHtml}<div class="rep-card-subtitle"><span class="rep-party ${partyClass}">${rep.party || 'Unknown'}</span>${districtText}${levelText}</div>`;

        // Add click handler for name link
        const nameLink = this.repCardName.querySelector('.rep-card-name-link');
        if (nameLink) {
            nameLink.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openRepWebsite(rep.personalWebsite);
            });
        }

        // Show office info if available
        if (rep.office) {
            this.repAlignmentScore.innerHTML = `<strong>${rep.office}</strong>`;
        } else {
            this.repAlignmentScore.textContent = '';
        }

        // Clear bills section or show prompt
        if (!this.selectedIssue) {
            this.repAlignmentBills.innerHTML = '<p class="alignment-prompt">Select an issue above to see bill alignment.</p>';
        }
    }

    // ========== RIGHT PANEL: ISSUES GRID ==========

    buildAwarenessChart(data) {
        if (!data || data.length < 2) {
            return `<svg viewBox="0 0 300 160" xmlns="http://www.w3.org/2000/svg">
                <line x1="40" y1="10" x2="40" y2="130" stroke="#ccc" stroke-width="0.5"/>
                <line x1="40" y1="130" x2="290" y2="130" stroke="#ccc" stroke-width="0.5"/>
                <text x="165" y="75" text-anchor="middle" font-size="12" fill="#999">No data yet</text>
            </svg>`;
        }
        const w = 300, h = 160;
        const padL = 40, padR = 10, padT = 10, padB = 25;
        const chartW = w - padL - padR;
        const chartH = h - padT - padB;
        const minY = 0, maxY = 100;
        const minX = data[0].year, maxX = data[data.length - 1].year;
        const pts = data.map(d => {
            const x = padL + ((d.year - minX) / (maxX - minX)) * chartW;
            const y = padT + chartH - ((d.pct - minY) / (maxY - minY)) * chartH;
            return { x, y, pct: d.pct, year: d.year };
        });
        const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
        const area = line + ` L${pts[pts.length-1].x},${padT + chartH} L${pts[0].x},${padT + chartH} Z`;
        const yTicks = [0, 25, 50, 75, 100];
        const gridLines = yTicks.map(v => {
            const y = padT + chartH - ((v - minY) / (maxY - minY)) * chartH;
            return `<line x1="${padL}" y1="${y}" x2="${w - padR}" y2="${y}" stroke="#e2e8f0" stroke-width="0.5" stroke-dasharray="3,3"/>
                    <text x="${padL - 5}" y="${y + 4}" text-anchor="end" font-size="10" fill="#94a3b8">${v}%</text>`;
        }).join('');
        const xLabels = data.map(d => {
            const x = padL + ((d.year - minX) / (maxX - minX)) * chartW;
            return `<text x="${x}" y="${h - 5}" text-anchor="middle" font-size="10" fill="#94a3b8">${d.year}</text>`;
        }).join('');
        const lastPt = pts[pts.length - 1];
        return `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
            ${gridLines}${xLabels}
            <path d="${area}" fill="rgba(59,130,246,0.1)"/>
            <path d="${line}" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            ${pts.map(p => `<circle cx="${p.x}" cy="${p.y}" r="3" fill="#3b82f6"/>`).join('')}
            <text x="${lastPt.x}" y="${lastPt.y - 8}" text-anchor="middle" font-size="11" font-weight="bold" fill="#3b82f6">${lastPt.pct}%</text>
        </svg>`;
    }

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
        const activeIssueId = this.selectedIssue ? this.selectedIssue.id : null;
        const activeStance = this.activeStance || null;

        this.issuesSidebarList.innerHTML = window.ISSUES_CATALOG.map(issue => {
            const isActive = issue.id === activeIssueId;
            let html = `
                <div class="issue-sidebar-item ${isActive ? 'active' : ''}" data-issue-id="${issue.id}">
                    <div class="issue-sidebar-header">
                        <span class="issue-sidebar-title">${issue.title}</span>
                        <span class="issue-toggle-arrow">&#9662;</span>
                    </div>`;

            if (isActive) {
                html += `
                    <div class="issue-stance-buttons">
                        <button class="stance-btn ${activeStance === 'supporters' ? 'active' : ''}"
                                data-issue-id="${issue.id}" data-stance="supporters">Supporters</button>
                        <button class="stance-btn explore-stance"
                                data-issue-id="${issue.id}" data-stance="explore">Explore</button>
                    </div>
                    <div id="stance-list-${issue.id}" class="stance-list" style="${activeStance ? '' : 'display:none;'}"></div>`;
            }

            html += `</div>`;
            return html;
        }).join('');
    }

    // ========== RIGHT PANEL: ISSUE DETAIL ==========

    showIssueDetail(issueId) {
        const issue = window.ISSUES_CATALOG.find(i => i.id === issueId);
        if (!issue) return;

        this.selectedIssue = issue;
        this.activeStance = null;

        // Switch views
        this.issuesGridView.style.display = 'none';
        this.issueDetailView.style.display = '';

        // Render content
        this.issueTitle.textContent = issue.title;
        this.issueHeroImg.src = issue.heroImage;
        this.issueHeroImg.alt = issue.title;
        this.issueDescription.textContent = issue.description;
        this.learnMoreBtn.style.display = issue.learnMoreUrl ? '' : 'none';

        // Render awareness chart
        const chartContainer = document.getElementById('awareness-chart-container');
        chartContainer.innerHTML = `
            <div class="chart-header">Public Awareness</div>
            ${this.buildAwarenessChart(issue.publicAwareness)}
            ${issue.chartSource ? `<div class="chart-footnote">${issue.chartSource}</div>` : ''}
        `;

        // Render nonprofits
        this.nonprofitsSection.style.display = '';
        this.renderNonprofits(issue);

        // Re-render sidebar to show accordion buttons for selected issue
        this.renderIssuesSidebar();

        // Show rep alignment if a rep is selected
        if (this.selectedRep) {
            this.repAlignmentCard.classList.remove('placeholder');
            this.repAlignmentCard.style.display = '';
            this.loadRepAlignment(this.selectedRep, issue);
        } else {
            this.repAlignmentCard.classList.add('placeholder');
            this.repAlignmentCard.style.display = '';
            this.repCardPhoto.innerHTML = '<div style="font-size:2rem;">?</div>';
            this.repCardName.textContent = 'Select a representative';
            this.repAlignmentScore.textContent = '';
            this.repAlignmentBills.innerHTML = '<p class="alignment-prompt">Search for your location and select a representative to see how they align on this issue.</p>';
        }

        // Initialize / refresh the Leaflet map, then sync heights
        setTimeout(() => {
            this.initMap();
            this.syncHeights();
            if (this.selectedRep) {
                this.showDistrictOnMap(this.selectedRep);
            }
        }, 50);

        // Load top 2 supporters widget
        this.loadTopSupporters(issue);
    }

    collapseIssue() {
        this.selectedIssue = null;
        this.activeStance = null;
        this.renderIssuesSidebar();
    }

    renderNonprofits(issue) {
        if (!issue.nonprofits || issue.nonprofits.length === 0) {
            this.nonprofitsGrid.innerHTML = '';
            return;
        }

        const labels = ['Support Locally', 'Support Nationally', 'Support Globally'];
        this.nonprofitsGrid.innerHTML = issue.nonprofits.map((np, i) => {
            const logoHtml = np.logo
                ? `<img src="${np.logo}" alt="${np.name}" onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\'np-initials\\'>${this.getInitials(np.name)}</div>';">`
                : `<div class="np-initials">${this.getInitials(np.name)}</div>`;

            return `
                <div class="nonprofit-card" data-np-index="${i}">
                    <div class="nonprofit-logo">${logoHtml}</div>
                    <div class="btn-donate-row">
                        <span class="btn-donate-num">${i + 1}<span class="btn-num-tooltip"><strong><u>Email me&mdash;</u></strong>data analytics for this website for free!</span></span>
                        <a href="${np.donateUrl}" target="_blank" rel="noopener" class="btn-donate">${labels[i] || 'Donate'}</a>
                    </div>
                </div>
            `;
        }).join('');
    }

    openSupportOverlay(btn) {
        // If this button is already active, close the overlay
        if (btn.classList.contains('donate-active')) {
            this.closeSupportOverlay();
            return;
        }

        const card = btn.closest('.nonprofit-card');
        const index = parseInt(card.dataset.npIndex);
        const np = this.selectedIssue?.nonprofits?.[index];
        if (!np) return;

        // Reset any previously active button
        this.closeSupportOverlay();

        const logoEl = document.getElementById('support-overlay-logo');
        if (np.logo) {
            logoEl.innerHTML = `<img src="${np.logo}" alt="${np.name}">`;
        } else {
            logoEl.innerHTML = `<div class="np-initials">${this.getInitials(np.name)}</div>`;
        }
        document.getElementById('support-overlay-name').textContent = np.name;
        document.getElementById('support-overlay-desc').textContent = np.description || '';
        const donateLink = document.getElementById('support-overlay-donate');
        donateLink.href = np.donateUrl;
        donateLink.textContent = btn.textContent;

        // Activate overlay and toggle button state
        this.supportOverlay.classList.add('active');
        this._activeDonateBtn = btn;
        this._activeDonateOriginalText = btn.textContent;
        this._activeCard = card;
        btn.classList.add('donate-active');
        card.classList.add('np-card-active');
        btn.textContent = 'Close Support';
    }

    closeSupportOverlay() {
        this.supportOverlay.classList.remove('active');
        if (this._activeDonateBtn) {
            this._activeDonateBtn.classList.remove('donate-active');
            this._activeDonateBtn.textContent = this._activeDonateOriginalText;
            this._activeDonateBtn = null;
            this._activeDonateOriginalText = null;
        }
        if (this._activeCard) {
            this._activeCard.classList.remove('np-card-active');
            this._activeCard = null;
        }
    }

    openLearnMore() {
        if (!this.selectedIssue || !this.selectedIssue.learnMoreUrl) return;
        this.learnMoreIframe.src = this.selectedIssue.learnMoreUrl;
        this.learnMoreModal.style.display = 'flex';
        this.learnMoreIframe.onload = () => {
            try {
                const doc = this.learnMoreIframe.contentDocument;
                if (!doc) return;
                // Hide WordPress admin toolbar and site header, remove gap
                const style = doc.createElement('style');
                style.textContent = `
                    #wpadminbar, header, .site-header, #masthead, .wp-site-header { display: none !important; }
                    html, body { margin-top: 0 !important; padding-top: 0 !important; }
                `;
                doc.head.appendChild(style);
            } catch (e) {
                // Cross-origin: cannot access iframe content
            }
        };
    }

    closeLearnMore() {
        this.learnMoreModal.style.display = 'none';
        this.learnMoreIframe.src = '';
    }

    openRepWebsite(url) {
        if (!url) return;
        this.repWebsiteIframe.src = url;
        this.repWebsiteModal.style.display = 'flex';
    }

    closeRepWebsite() {
        this.repWebsiteModal.style.display = 'none';
        this.repWebsiteIframe.src = '';
    }

    goBack() {
        this.closeLearnMore();
        this.issueDetailView.style.display = 'none';
        this.nonprofitsSection.style.display = 'none';
        this.issuesGridView.style.display = '';
        this.selectedIssue = null;
        this.activeStance = null;
        this.renderIssuesSidebar();
    }

    // ========== SIDEBAR STANCE ACCORDION ==========

    toggleStance(issueId, stance) {
        const issue = window.ISSUES_CATALOG.find(i => i.id === issueId);
        if (!issue) return;

        // Toggle off if already active
        if (this.activeStance === stance) {
            this.activeStance = null;
            this.renderIssuesSidebar();
            return;
        }

        this.activeStance = stance;
        this.renderIssuesSidebar();

        if (stance === 'supporters') {
            this.loadIssueSupporters(issue);
        }
    }

    renderStancePlaceholders(listEl) {
        listEl.innerHTML = [
            { name: 'Your Senator', party: '???', chamber: 'upper', label: 'Senate' },
            { name: 'Your Representative', party: '???', chamber: 'lower', label: 'House' }
        ].map(p => `
            <div class="stance-rep-item placeholder">
                <div class="stance-rep-photo">${this.getInitials(p.name)}</div>
                <div class="stance-rep-info">
                    <div class="stance-rep-name">${p.name}</div>
                    <div class="stance-rep-detail">${p.party}</div>
                </div>
                <span class="chamber-badge ${p.chamber}">${p.label}</span>
            </div>
        `).join('');
    }

    async loadIssueSupporters(issue) {
        const listEl = document.getElementById(`stance-list-${issue.id}`);
        if (!listEl) return;

        listEl.style.display = '';

        // Show placeholders if no location searched
        if (!this.currentJurisdiction || this.legislators.length === 0) {
            this.renderStancePlaceholders(listEl);
            return;
        }

        listEl.innerHTML = '<div class="stance-loading"><div class="mini-loader"></div>Finding supporters...</div>';

        const jurisdiction = this.currentJurisdiction;

        // Fetch bills (reuses billCache)
        const allBills = await this.fetchIssueBills(issue, jurisdiction);

        if (allBills.length === 0) {
            listEl.innerHTML = '<div class="stance-empty">No related bills found in current session.</div>';
            return;
        }

        // Check all legislators for sponsorship
        const supporters = [];
        for (const leg of this.legislators) {
            const alignment = this.computeAlignmentScore(leg, allBills);
            if (alignment.sponsoredCount > 0) {
                supporters.push({ legislator: leg, count: alignment.sponsoredCount });
            }
        }

        supporters.sort((a, b) => b.count - a.count);

        if (supporters.length === 0) {
            listEl.innerHTML = '<div class="stance-empty">No legislators found who sponsored related bills.</div>';
            return;
        }

        listEl.innerHTML = supporters.map(s => this.renderStanceRepItem(s.legislator, `${s.count} bill${s.count === 1 ? '' : 's'}`, false)).join('');
    }

    async loadIssueOpposed(issue) {
        const listEl = document.getElementById(`stance-list-${issue.id}`);
        if (!listEl) return;

        listEl.style.display = '';

        // Show placeholders if no location searched
        if (!this.currentJurisdiction || this.legislators.length === 0) {
            this.renderStancePlaceholders(listEl);
            return;
        }

        listEl.innerHTML = '<div class="stance-loading"><div class="mini-loader"></div>Finding opposition...</div>';

        const jurisdiction = this.currentJurisdiction;

        // Fetch bills (reuses billCache — now includes votes)
        const allBills = await this.fetchIssueBills(issue, jurisdiction);

        if (allBills.length === 0) {
            listEl.innerHTML = '<div class="stance-empty">No related bills found in current session.</div>';
            return;
        }

        // Find legislators who voted nay on related bills
        const opposedMap = {};
        for (const bill of allBills) {
            if (!bill.votes || bill.votes.length === 0) continue;
            for (const vote of bill.votes) {
                const individualVotes = vote.votes || [];
                for (const leg of this.legislators) {
                    const lastName = leg.name.split(' ').pop().toLowerCase();
                    const theirVote = individualVotes.find(v => {
                        const voterName = (v.voter_name || '').toLowerCase();
                        return voterName.includes(lastName) || lastName.includes(voterName);
                    });
                    if (theirVote && theirVote.option === 'nay') {
                        const key = leg.id || leg.name;
                        if (!opposedMap[key]) {
                            opposedMap[key] = { legislator: leg, count: 0 };
                        }
                        opposedMap[key].count++;
                    }
                }
            }
        }

        const opposed = Object.values(opposedMap).sort((a, b) => b.count - a.count);

        if (opposed.length === 0) {
            listEl.innerHTML = '<div class="stance-empty">No nay votes found on related bills.</div>';
            return;
        }

        listEl.innerHTML = opposed.map(o => this.renderStanceRepItem(o.legislator, `${o.count} nay vote${o.count === 1 ? '' : 's'}`, true)).join('');
    }

    async fetchIssueBills(issue, jurisdiction) {
        const cacheKey = `${issue.id}_${jurisdiction}`;
        if (this.billCache[cacheKey]) {
            return this.billCache[cacheKey];
        }

        const allBills = [];
        const seenIds = new Set();

        for (const keyword of issue.billKeywords) {
            try {
                const bills = await window.CivicAPI.getBillsBySubject(jurisdiction, keyword, 10);
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

        this.billCache[cacheKey] = allBills;
        return allBills;
    }

    renderStanceRepItem(legislator, detail, isOpposed) {
        const index = this.legislators.indexOf(legislator);
        const photoHtml = legislator.photoUrl
            ? `<img src="${legislator.photoUrl}" alt="${legislator.name}" onerror="this.style.display='none'; this.parentElement.textContent='${this.getInitials(legislator.name)}';">`
            : this.getInitials(legislator.name);

        const partyLower = legislator.party.toLowerCase();
        let partyClass = '';
        if (partyLower.includes('democrat')) partyClass = 'democratic';
        else if (partyLower.includes('republican')) partyClass = 'republican';

        const isSelected = this.selectedRep && this.legislators.indexOf(this.selectedRep) === index;

        return `
            <div class="stance-rep-item ${isSelected ? 'selected' : ''}" data-index="${index}">
                <div class="stance-rep-photo">${photoHtml}</div>
                <div class="stance-rep-info">
                    <div class="stance-rep-name">${legislator.name}</div>
                    <div class="stance-rep-detail"><span class="rep-party ${partyClass}">${legislator.party}</span></div>
                </div>
                <span class="stance-bill-count ${isOpposed ? 'opposed' : ''}">${detail}</span>
            </div>
        `;
    }

    // ========== TOP SUPPORTERS WIDGET (Right Panel) ==========

    async loadTopSupporters(issue) {
        const myVersion = ++this._topSupportersVersion;

        if (!this.currentJurisdiction || this.legislators.length === 0) {
            // Show placeholder state — white card matching rep alignment card
            this.topSupportersWidget.style.display = '';
            this.topSupportersWidget.classList.add('placeholder');
            this.viewAllSupportersBtn.textContent = 'All Supporters';
            this.topSupportersList.innerHTML = [
                { name: 'Your Senator', party: '???', chamber: 'upper', label: 'Senate' },
                { name: 'Your Representative', party: '???', chamber: 'lower', label: 'House' }
            ].map(p => `
                <div class="top-supporter-item placeholder">
                    <div class="top-supporter-photo">${this.getInitials(p.name)}</div>
                    <div class="top-supporter-info">
                        <div class="top-supporter-name">${p.name}</div>
                        <div class="top-supporter-detail">${p.party}</div>
                    </div>
                    <span class="chamber-badge ${p.chamber}">${p.label}</span>
                </div>
            `).join('');
            return;
        }

        this.topSupportersWidget.classList.remove('placeholder');
        this.viewAllSupportersBtn.textContent = 'View All Supporters';
        this.topSupportersWidget.style.display = '';
        this.topSupportersList.innerHTML = '<div class="stance-loading"><div class="mini-loader"></div>Finding top supporters...</div>';

        const allBills = await this.fetchIssueBills(issue, this.currentJurisdiction);

        // Stale call — a newer loadTopSupporters was triggered while we were fetching
        if (myVersion !== this._topSupportersVersion) {
            return;
        }

        if (allBills.length === 0) {
            this.topSupportersList.innerHTML = '<p class="alignment-prompt">No related bills found for this issue in the current session.</p>';
            return;
        }

        const supporters = [];
        for (const leg of this.legislators) {
            const alignment = this.computeAlignmentScore(leg, allBills);
            if (alignment.sponsoredCount > 0) {
                supporters.push({ legislator: leg, count: alignment.sponsoredCount });
            }
        }

        supporters.sort((a, b) => b.count - a.count);

        if (supporters.length === 0) {
            this.topSupportersList.innerHTML = '<p class="alignment-prompt">No bill sponsors found among current legislators.</p>';
            return;
        }

        const top2 = supporters.slice(0, 2);
        this.topSupportersList.innerHTML = top2.map(s => {
            const leg = s.legislator;
            const photoHtml = leg.photoUrl
                ? `<img src="${leg.photoUrl}" alt="${leg.name}" onerror="this.style.display='none'; this.parentElement.textContent='${this.getInitials(leg.name)}';">`
                : this.getInitials(leg.name);

            const partyLower = leg.party.toLowerCase();
            let partyClass = '';
            if (partyLower.includes('democrat')) partyClass = 'democratic';
            else if (partyLower.includes('republican')) partyClass = 'republican';

            return `
                <div class="top-supporter-item" data-index="${this.legislators.indexOf(leg)}" style="cursor:pointer;">
                    <div class="top-supporter-photo">${photoHtml}</div>
                    <div class="top-supporter-info">
                        <div class="top-supporter-name">${leg.name}</div>
                        <div class="top-supporter-detail"><span class="rep-party ${partyClass}">${leg.party}</span></div>
                    </div>
                    <span class="top-supporter-count">${s.count} bill${s.count === 1 ? '' : 's'}</span>
                </div>
            `;
        }).join('');
    }

    openSidebarSupporters() {
        if (!this.selectedIssue) return;

        // Switch to Issues tab
        this.togglePanel('issues');

        // Set the stance to supporters and re-render
        this.activeStance = 'supporters';
        this.renderIssuesSidebar();

        // Load the supporters list
        this.loadIssueSupporters(this.selectedIssue);
    }

    // ========== REP ALIGNMENT ==========

    async loadRepAlignment(rep, issue) {
        // Show loading state in alignment card
        this.repAlignmentCard.classList.remove('placeholder');
        this.repAlignmentCard.style.display = '';
        const photoHtml = rep.photoUrl
            ? `<img src="${rep.photoUrl}" alt="${rep.name}" onerror="this.style.display='none'; this.parentElement.textContent='${this.getInitials(rep.name)}';">`
            : this.getInitials(rep.name);
        this.repCardPhoto.innerHTML = photoHtml;

        const partyLower = rep.party.toLowerCase();
        let partyClass = '';
        if (partyLower.includes('democrat')) partyClass = 'democratic';
        else if (partyLower.includes('republican')) partyClass = 'republican';
        const districtText = rep.district ? ` &middot; District ${rep.district}` : '';

        // Make name clickable if rep has personal website
        const nameClass = rep.personalWebsite ? 'rep-card-name-link' : '';
        const nameHtml = rep.personalWebsite
            ? `<span class="${nameClass}" data-website="${rep.personalWebsite}">${rep.name}</span>`
            : rep.name;
        this.repCardName.innerHTML = `${nameHtml}<div class="rep-card-subtitle"><span class="rep-party ${partyClass}">${rep.party}</span>${districtText}</div>`;

        // Add click handler for name link
        const nameLink = this.repCardName.querySelector('.rep-card-name-link');
        if (nameLink) {
            nameLink.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openRepWebsite(rep.personalWebsite);
            });
        }

        this.repAlignmentScore.textContent = 'Loading alignment...';
        this.repAlignmentBills.innerHTML = '<div class="alignment-loading"><div class="mini-loader"></div>Searching bills...</div>';

        // Use the state jurisdiction for bill searches
        // Congress reps use their state's bills as well
        const jurisdiction = rep.jurisdiction || this.currentJurisdiction;

        if (!jurisdiction) {
            this.repAlignmentScore.textContent = 'Unable to determine jurisdiction';
            this.repAlignmentBills.innerHTML = '<p class="alignment-prompt">Could not determine the legislative jurisdiction for this representative.</p>';
            return;
        }

        // Check cache (keyed by issue + jurisdiction + rep level)
        const cacheKey = `${issue.id}_${jurisdiction}_${rep.level || 'state'}`;
        let allBills = this.billCache[cacheKey];

        console.log(`loadRepAlignment: ${rep.name}, level=${rep.level}, office=${rep.office}, jurisdiction=${jurisdiction}`);

        if (!allBills) {
            allBills = [];
            const seenIds = new Set();

            // Query local DB for bills by keyword
            // For Congress members, search federal bills; for state legislators, search state bills
            const billJurisdiction = (rep.level === 'congress') ? 'Federal' : jurisdiction;
            console.log(`Fetching bills from local DB for ${rep.name} (${billJurisdiction})...`);

            for (let i = 0; i < issue.billKeywords.length; i++) {
                const keyword = issue.billKeywords[i];
                // Delay between calls to avoid rate limiting (proxy may hit live API as fallback)
                if (i > 0) await new Promise(r => setTimeout(r, 500));
                try {
                    console.log(`Fetching bills for "${keyword}" in ${billJurisdiction}...`);
                    const bills = await window.CivicAPI.getBillsBySubject(
                        billJurisdiction, keyword, 10
                    );
                    console.log(`Got ${bills.length} bills for "${keyword}"`);
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

            this.billCache[cacheKey] = allBills;
        }

        // Add any manually associated bills for this legislator and issue
        const manualAssociations = window.MANUAL_BILL_ASSOCIATIONS || {};
        if (manualAssociations[rep.name] && manualAssociations[rep.name][issue.id]) {
            const manualBills = manualAssociations[rep.name][issue.id];
            console.log(`Adding ${manualBills.length} manually associated bills for ${rep.name} on ${issue.id}`);

            for (const manualBill of manualBills) {
                // Check if bill already exists in list
                const existingIndex = allBills.findIndex(b =>
                    b.identifier === manualBill.id ||
                    b.id === manualBill.id ||
                    (b.identifier && manualBill.id && b.identifier.replace(/\s+/g, '').toLowerCase() === manualBill.id.replace(/\s+/g, '').toLowerCase())
                );

                if (existingIndex === -1) {
                    // Add the manual bill
                    allBills.push({
                        id: manualBill.id,
                        identifier: manualBill.id,
                        title: manualBill.title || manualBill.id,
                        openstates_url: manualBill.url || '#',
                        sponsorships: [{ name: rep.name, primary: true }],
                        isManualAssociation: true
                    });
                }
            }
        }

        // Filter out excluded bills
        const excludedBills = window.EXCLUDED_BILLS || {};
        if (excludedBills[rep.name] && excludedBills[rep.name][issue.id]) {
            const excludedList = excludedBills[rep.name][issue.id];
            const beforeCount = allBills.length;
            allBills = allBills.filter(bill => {
                const billId = bill.identifier || bill.billNumber || bill.id;
                // Normalize bill ID for comparison (remove spaces, lowercase)
                const normalizedBillId = billId ? billId.replace(/\s+/g, '').toLowerCase() : '';
                return !excludedList.some(excId => {
                    const normalizedExcId = excId.replace(/\s+/g, '').toLowerCase();
                    return normalizedBillId === normalizedExcId;
                });
            });
            if (beforeCount !== allBills.length) {
                console.log(`Filtered ${beforeCount - allBills.length} excluded bills for ${rep.name} on ${issue.id}`);
            }
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

    normalizeNameForDedup(name) {
        // Extract last name for deduplication
        // Handles "Markey, Edward J." -> "markey" and "Ed Markey" -> "markey"
        if (!name) return '';
        const cleaned = name.toLowerCase().replace(/[.,]/g, '').trim();
        // If name is "Last, First" format
        if (cleaned.includes(',')) {
            return cleaned.split(',')[0].trim();
        }
        // Otherwise take last word as last name
        const parts = cleaned.split(' ').filter(Boolean);
        return parts[parts.length - 1] || '';
    }

    getInitials(name) {
        return name.split(' ')
            .map(word => word[0])
            .filter(Boolean)
            .join('')
            .toUpperCase()
            .substring(0, 2);
    }

    /**
     * Build a proper Congress.gov website URL for a bill
     * @param {string} type - Bill type (HR, S, HRES, SRES, HJRES, SJRES, HCONRES, SCONRES)
     * @param {number} congress - Congress number (e.g., 118)
     * @param {number} number - Bill number
     * @returns {string} - Website URL
     */
    buildCongressGovUrl(type, congress, number) {
        // Map bill type codes to URL-friendly names
        const typeMap = {
            'HR': 'house-bill',
            'S': 'senate-bill',
            'HRES': 'house-resolution',
            'SRES': 'senate-resolution',
            'HJRES': 'house-joint-resolution',
            'SJRES': 'senate-joint-resolution',
            'HCONRES': 'house-concurrent-resolution',
            'SCONRES': 'senate-concurrent-resolution'
        };
        const typeName = typeMap[(type || '').toUpperCase()] || 'bill';
        return `https://www.congress.gov/bill/${congress}th-congress/${typeName}/${number}`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.voteApp = new VoteApp();
});
