/**
 * Votecraft App - Main Application Logic
 * Plural Policy inspired design
 */

class VotecraftApp {
    constructor() {
        // Elements
        this.loadingOverlay = document.getElementById('loading-screen');
        this.errorScreen = document.getElementById('error-screen');
        this.resultsHeader = document.getElementById('results-header');

        // Address elements
        this.addressInput = document.getElementById('address-input');
        this.lookupBtn = document.getElementById('lookup-btn');
        this.locationBtn = document.getElementById('use-location-btn');
        this.errorText = document.getElementById('error-text');
        this.searchedAddress = document.getElementById('searched-address');

        // Legislator lists
        this.federalSection = document.getElementById('federal-section');
        this.stateSection = document.getElementById('state-section');
        this.federalList = document.getElementById('federal-list');
        this.stateList = document.getElementById('state-list');

        // Activity section
        this.activitySection = document.getElementById('activity-section');
        this.activityList = document.getElementById('activity-list');

        // Votes section
        this.votesSection = document.getElementById('votes-section');
        this.votesList = document.getElementById('votes-list');

        // Topics section
        this.topicsSection = document.getElementById('topics-section');
        this.topicsFilters = document.getElementById('topics-filters');
        this.topicsList = document.getElementById('topics-list');

        // Ballot section
        this.ballotSection = document.getElementById('ballot-section');
        this.ballotInfo = document.getElementById('ballot-info');
        this.ballotContests = document.getElementById('ballot-contests');

        // Map
        this.map = null;
        this.marker = null;

        // State
        this.legislators = [];
        this.bills = [];
        this.voteRecords = [];
        this.voterInfo = null;
        this.currentAddress = '';
        this.currentCoords = null;
        this.currentJurisdiction = null;
        this.selectedTopic = null;

        this.bindEvents();
        this.showPlaceholderState();
    }

    showPlaceholderState() {
        // Show placeholder legislators with emojis
        const placeholderLegislators = [
            { name: '👤 Your Senator', office: 'State Senator', level: 'state', party: 'Party', photoUrl: null, district: '?', urls: [] },
            { name: '👤 Your Representative', office: 'State Representative', level: 'state', party: 'Party', photoUrl: null, district: '?', urls: [] }
        ];

        // Render placeholder federal section
        this.federalSection.style.display = 'flex';
        this.federalList.innerHTML = `
            <div class="legislator-item placeholder-item">
                <div class="legislator-photo placeholder-icon">?</div>
                <div class="legislator-info">
                    <div class="legislator-name">Your U.S. Senator</div>
                    <div class="legislator-details">
                        <span class="legislator-party">Search to find</span>
                    </div>
                </div>
                <span class="chamber-badge upper">Senate</span>
            </div>
            <div class="legislator-item placeholder-item">
                <div class="legislator-photo placeholder-icon">?</div>
                <div class="legislator-info">
                    <div class="legislator-name">Your U.S. Representative</div>
                    <div class="legislator-details">
                        <span class="legislator-party">Search to find</span>
                    </div>
                </div>
                <span class="chamber-badge lower">House</span>
            </div>
        `;

        // Render placeholder state section
        this.stateSection.style.display = 'flex';
        this.stateList.innerHTML = `
            <div class="legislator-item placeholder-item">
                <div class="legislator-photo placeholder-icon">?</div>
                <div class="legislator-info">
                    <div class="legislator-name">Your State Senator</div>
                    <div class="legislator-details">
                        <span class="legislator-party">Search to find</span>
                    </div>
                </div>
                <span class="chamber-badge upper">Senate</span>
            </div>
            <div class="legislator-item placeholder-item">
                <div class="legislator-photo placeholder-icon">?</div>
                <div class="legislator-info">
                    <div class="legislator-name">Your State Representative</div>
                    <div class="legislator-details">
                        <span class="legislator-party">Search to find</span>
                    </div>
                </div>
                <span class="chamber-badge lower">House</span>
            </div>
        `;

        // Render placeholder activity section
        this.showPlaceholderBills();

        // Render placeholder votes section
        this.showPlaceholderVotes();

        // Render placeholder topics section
        this.showPlaceholderTopics();

        // Render placeholder ballot section
        this.showPlaceholderBallot();

        // Initialize map with USA view
        this.initPlaceholderMap();
    }

    showPlaceholderBills() {
        if (this.activitySection) {
            this.activitySection.style.display = 'flex';
        }
        if (this.activityList) {
            this.activityList.innerHTML = `
                <div class="bill-item placeholder-bill">
                    <div class="bill-header">
                        <span class="bill-id placeholder-bill-id">📜 Bill #???</span>
                        <span class="bill-date">Search to find</span>
                    </div>
                    <div class="bill-title">
                        Recent legislation from your representatives
                    </div>
                    <div class="bill-meta">
                        <span class="bill-sponsor">Sponsored by your legislator</span>
                    </div>
                    <div class="bill-status">
                        Enter your address to see activity
                    </div>
                </div>
                <div class="bill-item placeholder-bill">
                    <div class="bill-header">
                        <span class="bill-id placeholder-bill-id">📜 Bill #???</span>
                        <span class="bill-date">Search to find</span>
                    </div>
                    <div class="bill-title">
                        See what your representatives are working on
                    </div>
                    <div class="bill-meta">
                        <span class="bill-sponsor">Sponsored by your legislator</span>
                    </div>
                    <div class="bill-status">
                        Enter your address to see activity
                    </div>
                </div>
            `;
        }
    }

    showPlaceholderVotes() {
        if (this.votesSection) {
            this.votesSection.style.display = 'flex';
        }
        if (this.votesList) {
            this.votesList.innerHTML = `
                <div class="vote-item placeholder-vote">
                    <div class="vote-indicator vote-unknown">?</div>
                    <div class="vote-content">
                        <div class="vote-bill">🗳️ Bill #???</div>
                        <div class="vote-title">See how your representatives voted</div>
                        <div class="vote-meta">
                            <span class="vote-legislator">Your Legislator</span>
                            <span class="vote-date">Search to find</span>
                        </div>
                    </div>
                </div>
                <div class="vote-item placeholder-vote">
                    <div class="vote-indicator vote-unknown">?</div>
                    <div class="vote-content">
                        <div class="vote-bill">🗳️ Bill #???</div>
                        <div class="vote-title">Track voting records on key issues</div>
                        <div class="vote-meta">
                            <span class="vote-legislator">Your Legislator</span>
                            <span class="vote-date">Search to find</span>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    showPlaceholderTopics() {
        if (this.topicsSection) {
            this.topicsSection.style.display = 'flex';
        }
        if (this.topicsFilters) {
            this.topicsFilters.innerHTML = window.CivicAPI.BILL_SUBJECTS.map(subject => `
                <button class="topic-btn placeholder-topic" disabled>
                    <span class="topic-emoji">${subject.emoji}</span>
                    <span class="topic-label">${subject.label}</span>
                </button>
            `).join('');
        }
        if (this.topicsList) {
            this.topicsList.innerHTML = `
                <div class="topics-placeholder">
                    <p>📋 Enter your address to explore bills by topic</p>
                </div>
            `;
        }
    }

    showPlaceholderBallot() {
        if (this.ballotSection) {
            this.ballotSection.style.display = 'flex';
        }
        if (this.ballotInfo) {
            this.ballotInfo.innerHTML = `
                <div class="ballot-election-info placeholder-ballot">
                    <div class="election-icon">🗳️</div>
                    <div class="election-details">
                        <div class="election-name">Upcoming Election</div>
                        <div class="election-date">Enter your address to see your ballot</div>
                    </div>
                </div>
            `;
        }
        if (this.ballotContests) {
            this.ballotContests.innerHTML = `
                <div class="contest-item placeholder-contest">
                    <div class="contest-header">
                        <span class="contest-office">🏛️ Office ???</span>
                        <span class="contest-level">Search to find</span>
                    </div>
                    <div class="contest-candidates">
                        <div class="candidate-item">
                            <span class="candidate-name">�� Candidate Name</span>
                            <span class="candidate-party">Party</span>
                        </div>
                        <div class="candidate-item">
                            <span class="candidate-name">👤 Candidate Name</span>
                            <span class="candidate-party">Party</span>
                        </div>
                    </div>
                </div>
                <div class="contest-item placeholder-contest">
                    <div class="contest-header">
                        <span class="contest-office">📜 Ballot Measure ???</span>
                        <span class="contest-level">Search to find</span>
                    </div>
                    <div class="contest-description">
                        See ballot measures and referendums for your area
                    </div>
                </div>
            `;
        }
    }

    initPlaceholderMap() {
        // Initialize map centered on USA
        this.map = L.map('map', {
            zoomControl: true,
            scrollWheelZoom: false
        }).setView([39.8283, -98.5795], 4); // Center of USA

        // Use CartoDB Positron for a clean, light map style
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(this.map);

        // Fix map rendering issues
        setTimeout(() => {
            this.map.invalidateSize();
        }, 100);
    }

    bindEvents() {
        // Address form
        this.lookupBtn.addEventListener('click', () => this.lookupInfo());
        this.addressInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.lookupInfo();
        });

        // Location button
        if (this.locationBtn) {
            this.locationBtn.addEventListener('click', () => this.useCurrentLocation());
        }

        // PDF button
        const pdfBtn = document.getElementById('save-pdf-btn');
        if (pdfBtn) {
            pdfBtn.addEventListener('click', () => this.savePDF());
        }
    }

    savePDF() {
        window.print();
    }

    showLoading(show) {
        if (show) {
            this.loadingOverlay.classList.add('active');
            this.hideError();
        } else {
            this.loadingOverlay.classList.remove('active');
        }
    }

    hideError() {
        this.errorScreen.style.display = 'none';
    }

    async useCurrentLocation() {
        if (!navigator.geolocation) {
            this.showError('Geolocation is not supported by your browser.');
            return;
        }

        this.showLoading(true);

        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    timeout: 10000,
                    enableHighAccuracy: true
                });
            });

            const { latitude, longitude } = position.coords;
            this.currentCoords = { lat: latitude, lng: longitude };

            // Get legislators directly with coordinates
            const legislators = await window.CivicAPI.getStateLegislators(latitude, longitude);

            this.legislators = window.CivicAPI.parseRepresentatives({
                officials: legislators.results || []
            });

            this.currentAddress = 'Your current location';
            this.renderLegislators();
            this.initMap();

            // Fetch bills in background
            this.loadBills();

            this.showLoading(false);

        } catch (error) {
            console.error('Location error:', error);
            this.showLoading(false);
            this.showError('Could not get your location. Please enter an address instead.');
        }
    }

    async lookupInfo() {
        const address = this.addressInput.value.trim();

        if (!address) {
            this.addressInput.focus();
            this.addressInput.style.borderColor = '#ef4444';
            setTimeout(() => {
                this.addressInput.style.borderColor = '';
            }, 2000);
            return;
        }

        this.currentAddress = address;
        this.showLoading(true);

        try {
            // Geocode first to get coordinates for the map
            const coords = await window.CivicAPI.geocodeAddress(address);
            this.currentCoords = coords;

            // Get legislators
            const legislators = await window.CivicAPI.getStateLegislators(coords.lat, coords.lng);
            this.legislators = window.CivicAPI.parseRepresentatives({
                officials: legislators.results || []
            });

            console.log('Legislators found:', this.legislators.length);
            console.log('Legislators data:', this.legislators);

            if (this.legislators.length === 0) {
                this.showLoading(false);
                this.showError('No legislators found for this address. Please try a different address.');
                return;
            }

            // Store jurisdiction for topic filtering
            const stateLegislators = this.legislators.filter(l => l.level === 'state');
            if (stateLegislators.length > 0 && stateLegislators[0].jurisdiction) {
                this.currentJurisdiction = stateLegislators[0].jurisdiction;
            }

            this.renderLegislators();
            this.initMap();

            // Fetch bills, votes, ballot, and enable topics in background (don't block main results)
            this.loadBills();
            this.loadBallot();
            this.enableTopicFilters();

            this.showLoading(false);

        } catch (error) {
            console.error('Lookup error:', error);
            this.showLoading(false);
            this.showError(error.message || 'Unable to find legislators. Please check the address and try again.');
        }
    }

    async loadBills() {
        try {
            console.log('Fetching bills for legislators...');
            this.showBillsLoading();
            this.showVotesLoading();
            this.bills = await window.CivicAPI.getBillsForLegislators(this.legislators);
            console.log('Bills found:', this.bills.length);
            this.renderBills();

            // Extract and render vote records from the bills
            this.voteRecords = window.CivicAPI.extractVoteRecords(this.bills, this.legislators);
            console.log('Vote records found:', this.voteRecords.length);
            this.renderVotes();
        } catch (error) {
            console.error('Error loading bills:', error);
            // Hide loading on error
            if (this.activitySection) {
                this.activitySection.style.display = 'none';
            }
            if (this.votesSection) {
                this.votesSection.style.display = 'none';
            }
        }
    }

    showBillsLoading() {
        if (this.activitySection) {
            this.activitySection.style.display = 'flex';
        }
        if (this.activityList) {
            this.activityList.innerHTML = `
                <div class="bills-loading">
                    <div class="bills-loader"></div>
                    <p>Loading legislative activity...</p>
                </div>
            `;
        }
    }

    showVotesLoading() {
        if (this.votesSection) {
            this.votesSection.style.display = 'flex';
        }
        if (this.votesList) {
            this.votesList.innerHTML = `
                <div class="bills-loading">
                    <div class="bills-loader"></div>
                    <p>Loading vote records...</p>
                </div>
            `;
        }
    }

    renderLegislators() {
        // Show results header with searched address
        if (this.resultsHeader) {
            this.resultsHeader.style.display = 'flex';
        }
        if (this.searchedAddress) {
            this.searchedAddress.textContent = `Results for: ${this.currentAddress}`;
        }

        // Separate federal and state legislators
        const federal = this.legislators.filter(l => l.level === 'federal');
        const state = this.legislators.filter(l => l.level === 'state');

        // Render federal section
        if (federal.length > 0) {
            this.federalSection.style.display = 'flex';
            this.federalList.innerHTML = federal.map(l => this.renderLegislatorItem(l)).join('');
        } else {
            this.federalSection.style.display = 'none';
        }

        // Render state section
        if (state.length > 0) {
            this.stateSection.style.display = 'flex';
            this.stateList.innerHTML = state.map(l => this.renderLegislatorItem(l)).join('');
        } else {
            this.stateSection.style.display = 'none';
        }
    }

    renderLegislatorItem(legislator) {
        const photoHtml = legislator.photoUrl
            ? `<img src="${legislator.photoUrl}" alt="${legislator.name}" onerror="this.style.display='none'; this.parentElement.textContent='${this.getInitials(legislator.name)}';">`
            : this.getInitials(legislator.name);

        // Determine chamber (upper = Senate, lower = House/Assembly)
        const isUpper = legislator.office.toLowerCase().includes('senator') ||
                        legislator.office.toLowerCase().includes('senate');
        const chamberClass = isUpper ? 'upper' : 'lower';
        const chamberLabel = isUpper ? 'Senate' : 'House';

        // Party class
        const partyLower = legislator.party.toLowerCase();
        let partyClass = '';
        if (partyLower.includes('democrat')) {
            partyClass = 'democratic';
        } else if (partyLower.includes('republican')) {
            partyClass = 'republican';
        }

        // Profile link
        const profileLink = legislator.urls && legislator.urls.length > 0
            ? `<a href="${legislator.urls[0]}" target="_blank" class="legislator-link">View Profile →</a>`
            : '';

        // District display
        const districtText = legislator.district ? `District ${legislator.district}` : '';

        return `
            <div class="legislator-item">
                <div class="legislator-photo">${photoHtml}</div>
                <div class="legislator-info">
                    <div class="legislator-name">
                        ${legislator.urls && legislator.urls.length > 0
                            ? `<a href="${legislator.urls[0]}" target="_blank">${legislator.name}</a>`
                            : legislator.name}
                    </div>
                    <div class="legislator-details">
                        <span class="legislator-party ${partyClass}">${legislator.party}</span>
                        ${districtText ? `<span class="legislator-district">• ${districtText}</span>` : ''}
                    </div>
                </div>
                <span class="chamber-badge ${chamberClass}">${chamberLabel}</span>
            </div>
        `;
    }

    getInitials(name) {
        return name.split(' ')
            .map(word => word[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();
    }

    renderBills() {
        if (!this.bills || this.bills.length === 0) {
            if (this.activitySection) {
                this.activitySection.style.display = 'none';
            }
            return;
        }

        if (this.activitySection) {
            this.activitySection.style.display = 'flex';
        }

        if (this.activityList) {
            this.activityList.innerHTML = this.bills.map(bill => this.renderBillItem(bill)).join('');
        }
    }

    renderBillItem(bill) {
        const sponsor = bill.sponsorLegislator;
        const sponsorName = sponsor ? sponsor.name : 'Unknown';

        // Format date
        const actionDate = bill.latest_action_date
            ? new Date(bill.latest_action_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            })
            : '';

        // Determine bill status color
        let statusClass = 'status-pending';
        const action = (bill.latest_action_description || '').toLowerCase();
        if (action.includes('passed') || action.includes('approved') || action.includes('enacted')) {
            statusClass = 'status-passed';
        } else if (action.includes('failed') || action.includes('vetoed') || action.includes('died')) {
            statusClass = 'status-failed';
        }

        // Truncate title if too long
        const title = bill.title.length > 100
            ? bill.title.substring(0, 100) + '...'
            : bill.title;

        return `
            <div class="bill-item">
                <div class="bill-header">
                    <span class="bill-id">${bill.identifier}</span>
                    <span class="bill-date">${actionDate}</span>
                </div>
                <div class="bill-title">
                    <a href="${bill.openstates_url}" target="_blank">${title}</a>
                </div>
                <div class="bill-meta">
                    <span class="bill-sponsor">Sponsored by ${sponsorName}</span>
                </div>
                <div class="bill-status ${statusClass}">
                    ${bill.latest_action_description || 'No recent action'}
                </div>
            </div>
        `;
    }

    initMap() {
        if (!this.currentCoords) return;

        // Map already exists from placeholder, update it
        if (this.map) {
            this.map.setView([this.currentCoords.lat, this.currentCoords.lng], 11);

            // Add or update the location circle
            if (this.locationCircle) {
                this.locationCircle.setLatLng([this.currentCoords.lat, this.currentCoords.lng]);
            } else {
                this.locationCircle = L.circle([this.currentCoords.lat, this.currentCoords.lng], {
                    color: '#14CCB0',
                    fillColor: '#14CCB0',
                    fillOpacity: 0.15,
                    radius: 3000,
                    weight: 2
                }).addTo(this.map);
            }

            // Add or update the marker
            const customIcon = L.divIcon({
                className: 'custom-marker',
                html: `<div class="marker-pin"></div>`,
                iconSize: [30, 40],
                iconAnchor: [15, 40],
                popupAnchor: [0, -40]
            });

            if (this.marker) {
                this.marker.setLatLng([this.currentCoords.lat, this.currentCoords.lng]);
                this.marker.setPopupContent(`<b>${this.currentAddress}</b>`);
            } else {
                this.marker = L.marker([this.currentCoords.lat, this.currentCoords.lng], { icon: customIcon }).addTo(this.map);
                this.marker.bindPopup(`<b>${this.currentAddress}</b>`);
            }

            this.map.invalidateSize();
            return;
        }

        // Initialize new map (shouldn't happen with placeholder, but keep as fallback)
        this.map = L.map('map', {
            zoomControl: true,
            scrollWheelZoom: false
        }).setView([this.currentCoords.lat, this.currentCoords.lng], 11);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(this.map);

        this.locationCircle = L.circle([this.currentCoords.lat, this.currentCoords.lng], {
            color: '#14CCB0',
            fillColor: '#14CCB0',
            fillOpacity: 0.15,
            radius: 3000,
            weight: 2
        }).addTo(this.map);

        const customIcon = L.divIcon({
            className: 'custom-marker',
            html: `<div class="marker-pin"></div>`,
            iconSize: [30, 40],
            iconAnchor: [15, 40],
            popupAnchor: [0, -40]
        });

        this.marker = L.marker([this.currentCoords.lat, this.currentCoords.lng], { icon: customIcon }).addTo(this.map);
        this.marker.bindPopup(`<b>${this.currentAddress}</b>`);

        setTimeout(() => {
            this.map.invalidateSize();
        }, 100);
    }

    showError(message) {
        this.errorText.textContent = message;
        this.errorScreen.style.display = 'block';
    }

    renderVotes() {
        if (!this.voteRecords || this.voteRecords.length === 0) {
            if (this.votesSection) {
                this.votesSection.style.display = 'none';
            }
            return;
        }

        if (this.votesSection) {
            this.votesSection.style.display = 'flex';
        }

        if (this.votesList) {
            this.votesList.innerHTML = this.voteRecords.map(record => this.renderVoteItem(record)).join('');
        }
    }

    renderVoteItem(record) {
        // Determine vote indicator
        let voteClass = 'vote-unknown';
        let voteSymbol = '?';
        const vote = (record.vote || '').toLowerCase();

        if (vote === 'yea' || vote === 'yes' || vote === 'aye') {
            voteClass = 'vote-yea';
            voteSymbol = '✓';
        } else if (vote === 'nay' || vote === 'no') {
            voteClass = 'vote-nay';
            voteSymbol = '✗';
        } else if (vote === 'abstain' || vote === 'not voting' || vote === 'absent') {
            voteClass = 'vote-abstain';
            voteSymbol = '—';
        }

        // Format date
        const voteDate = record.voteDate
            ? new Date(record.voteDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            })
            : '';

        // Truncate title
        const title = record.bill.title.length > 80
            ? record.bill.title.substring(0, 80) + '...'
            : record.bill.title;

        return `
            <div class="vote-item">
                <div class="vote-indicator ${voteClass}">${voteSymbol}</div>
                <div class="vote-content">
                    <div class="vote-bill">
                        <a href="${record.bill.url}" target="_blank">${record.bill.identifier}</a>
                    </div>
                    <div class="vote-title">${title}</div>
                    <div class="vote-meta">
                        <span class="vote-legislator">${record.legislator.name}</span>
                        <span class="vote-result">${record.result || ''}</span>
                        <span class="vote-date">${voteDate}</span>
                    </div>
                </div>
            </div>
        `;
    }

    enableTopicFilters() {
        if (!this.currentJurisdiction || !this.topicsFilters) return;

        // Re-render topic buttons as enabled
        this.topicsFilters.innerHTML = window.CivicAPI.BILL_SUBJECTS.map(subject => `
            <button class="topic-btn" data-topic="${subject.id}">
                <span class="topic-emoji">${subject.emoji}</span>
                <span class="topic-label">${subject.label}</span>
            </button>
        `).join('');

        // Add click handlers
        this.topicsFilters.querySelectorAll('.topic-btn').forEach(btn => {
            btn.addEventListener('click', () => this.loadTopicBills(btn.dataset.topic));
        });

        // Clear placeholder
        if (this.topicsList) {
            this.topicsList.innerHTML = `
                <div class="topics-placeholder">
                    <p>Select a topic above to see related bills</p>
                </div>
            `;
        }
    }

    async loadTopicBills(topic) {
        if (!this.currentJurisdiction) return;

        // Update selected state
        this.selectedTopic = topic;
        this.topicsFilters.querySelectorAll('.topic-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.topic === topic);
        });

        // Show loading
        if (this.topicsList) {
            this.topicsList.innerHTML = `
                <div class="bills-loading">
                    <div class="bills-loader"></div>
                    <p>Loading ${topic} bills...</p>
                </div>
            `;
        }

        try {
            const bills = await window.CivicAPI.getBillsBySubject(this.currentJurisdiction, topic, 6);

            if (bills.length === 0) {
                this.topicsList.innerHTML = `
                    <div class="topics-placeholder">
                        <p>No recent bills found for "${topic}"</p>
                    </div>
                `;
                return;
            }

            this.topicsList.innerHTML = bills.map(bill => this.renderTopicBill(bill)).join('');
        } catch (error) {
            console.error('Error loading topic bills:', error);
            this.topicsList.innerHTML = `
                <div class="topics-placeholder">
                    <p>Error loading bills. Please try again.</p>
                </div>
            `;
        }
    }

    renderTopicBill(bill) {
        // Format date
        const actionDate = bill.latest_action_date
            ? new Date(bill.latest_action_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            })
            : '';

        // Truncate title
        const title = bill.title.length > 100
            ? bill.title.substring(0, 100) + '...'
            : bill.title;

        // Get primary sponsor
        const sponsor = bill.sponsorships?.find(s => s.primary)?.name || 'Unknown';

        return `
            <div class="bill-item topic-bill">
                <div class="bill-header">
                    <span class="bill-id">${bill.identifier}</span>
                    <span class="bill-date">${actionDate}</span>
                </div>
                <div class="bill-title">
                    <a href="${bill.openstates_url}" target="_blank">${title}</a>
                </div>
                <div class="bill-meta">
                    <span class="bill-sponsor">Sponsored by ${sponsor}</span>
                </div>
                <div class="bill-status">
                    ${bill.latest_action_description || 'No recent action'}
                </div>
            </div>
        `;
    }

    async loadBallot() {
        try {
            console.log('Fetching ballot info...');
            this.showBallotLoading();
            this.voterInfo = await window.CivicAPI.getVoterInfo(this.currentAddress);
            console.log('Voter info:', this.voterInfo);
            this.renderBallot();
        } catch (error) {
            console.error('Error loading ballot:', error);
            if (this.ballotSection) {
                this.ballotSection.style.display = 'none';
            }
        }
    }

    showBallotLoading() {
        if (this.ballotSection) {
            this.ballotSection.style.display = 'flex';
        }
        if (this.ballotInfo) {
            this.ballotInfo.innerHTML = `
                <div class="bills-loading">
                    <div class="bills-loader"></div>
                    <p>Checking for upcoming elections...</p>
                </div>
            `;
        }
        if (this.ballotContests) {
            this.ballotContests.innerHTML = '';
        }
    }

    renderBallot() {
        if (!this.voterInfo || this.voterInfo.noElection) {
            // No active election - show helpful message
            if (this.ballotInfo) {
                this.ballotInfo.innerHTML = `
                    <div class="ballot-election-info no-election">
                        <div class="election-icon">📅</div>
                        <div class="election-details">
                            <div class="election-name">No Upcoming Elections</div>
                            <div class="election-date">There are no elections with ballot data available for your area right now. Check back closer to election day!</div>
                        </div>
                    </div>
                `;
            }
            if (this.ballotContests) {
                this.ballotContests.innerHTML = '';
            }
            return;
        }

        // Show election info
        if (this.ballotInfo && this.voterInfo.election) {
            const election = this.voterInfo.election;
            const electionDate = election.electionDay
                ? new Date(election.electionDay).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                })
                : '';

            this.ballotInfo.innerHTML = `
                <div class="ballot-election-info">
                    <div class="election-icon">🗳️</div>
                    <div class="election-details">
                        <div class="election-name">${election.name}</div>
                        <div class="election-date">${electionDate}</div>
                    </div>
                </div>
                ${this.renderPollingLocations()}
            `;
        }

        // Show contests
        if (this.ballotContests && this.voterInfo.contests.length > 0) {
            this.ballotContests.innerHTML = this.voterInfo.contests
                .map(contest => this.renderContest(contest))
                .join('');
        } else if (this.ballotContests) {
            this.ballotContests.innerHTML = `
                <div class="topics-placeholder">
                    <p>Ballot details not yet available for this election</p>
                </div>
            `;
        }
    }

    renderPollingLocations() {
        const locations = [
            ...this.voterInfo.pollingLocations || [],
            ...this.voterInfo.earlyVoteSites || [],
            ...this.voterInfo.dropOffLocations || []
        ];

        if (locations.length === 0) return '';

        const location = locations[0];
        const address = location.address;
        const addressStr = address
            ? `${address.line1 || ''}, ${address.city || ''}, ${address.state || ''} ${address.zip || ''}`
            : '';

        return `
            <div class="polling-location">
                <div class="polling-label">📍 Your Polling Place</div>
                <div class="polling-name">${location.name || 'Polling Location'}</div>
                <div class="polling-address">${addressStr}</div>
                ${location.pollingHours ? `<div class="polling-hours">Hours: ${location.pollingHours}</div>` : ''}
            </div>
        `;
    }

    renderContest(contest) {
        if (contest.type === 'Referendum') {
            return this.renderReferendum(contest);
        }
        return this.renderRace(contest);
    }

    renderRace(contest) {
        const candidates = contest.candidates || [];

        return `
            <div class="contest-item">
                <div class="contest-header">
                    <span class="contest-office">${contest.office || 'Office'}</span>
                    <span class="contest-level">${contest.level?.join(', ') || ''}</span>
                </div>
                <div class="contest-candidates">
                    ${candidates.map(c => `
                        <div class="candidate-item">
                            <span class="candidate-name">${c.name}</span>
                            <span class="candidate-party">${c.party || ''}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderReferendum(contest) {
        return `
            <div class="contest-item referendum">
                <div class="contest-header">
                    <span class="contest-office">📜 ${contest.referendumTitle || contest.office || 'Ballot Measure'}</span>
                </div>
                <div class="contest-description">
                    ${contest.referendumSubtitle || contest.referendumBrief || contest.referendumText || 'No description available'}
                </div>
                ${contest.referendumProStatement ? `
                    <div class="referendum-arguments">
                        <div class="argument pro">
                            <strong>For:</strong> ${contest.referendumProStatement}
                        </div>
                        ${contest.referendumConStatement ? `
                            <div class="argument con">
                                <strong>Against:</strong> ${contest.referendumConStatement}
                            </div>
                        ` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.votecraftApp = new VotecraftApp();
});
