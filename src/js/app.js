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

        // Map
        this.map = null;
        this.marker = null;

        // State
        this.legislators = [];
        this.currentAddress = '';
        this.currentCoords = null;

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
                <div class="legislator-photo">🏛️</div>
                <div class="legislator-info">
                    <div class="legislator-name">Your U.S. Senator</div>
                    <div class="legislator-details">
                        <span class="legislator-party">Search to find</span>
                    </div>
                </div>
                <span class="chamber-badge upper">Senate</span>
            </div>
            <div class="legislator-item placeholder-item">
                <div class="legislator-photo">🏛️</div>
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
                <div class="legislator-photo">🏢</div>
                <div class="legislator-info">
                    <div class="legislator-name">Your State Senator</div>
                    <div class="legislator-details">
                        <span class="legislator-party">Search to find</span>
                    </div>
                </div>
                <span class="chamber-badge upper">Senate</span>
            </div>
            <div class="legislator-item placeholder-item">
                <div class="legislator-photo">🏢</div>
                <div class="legislator-info">
                    <div class="legislator-name">Your State Representative</div>
                    <div class="legislator-details">
                        <span class="legislator-party">Search to find</span>
                    </div>
                </div>
                <span class="chamber-badge lower">House</span>
            </div>
        `;

        // Initialize map with USA view
        this.initPlaceholderMap();
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

            this.renderLegislators();
            this.initMap();
            this.showLoading(false);

        } catch (error) {
            console.error('Lookup error:', error);
            this.showLoading(false);
            this.showError(error.message || 'Unable to find legislators. Please check the address and try again.');
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
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.votecraftApp = new VotecraftApp();
});
