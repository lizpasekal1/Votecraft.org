/**
 * VoteCraft Civic Music Tours - Vanilla JavaScript Implementation
 * Location-based civic education through music discovery
 */

(function() {
    'use strict';

    // State
    let selectedPin = null;
    let map = null;
    let markers = {};

    // DOM Elements
    const playlistContainer = document.getElementById('playlist-container');
    const modalsContainer = document.getElementById('modals');
    const mapElement = document.getElementById('map');

    // Icons as SVG strings
    const icons = {
        user: `<svg class="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>`,
        heart: `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>`,
        message: `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>`,
        share: `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>`,
        play: `<svg class="w-3 h-3 text-white fill-current" viewBox="0 0 24 24"><path d="M6 4v16l14-8z"/></svg>`,
        x: `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>`,
        music: `<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/></svg>`,
        chart: `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>`,
        lightbulb: `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>`
    };

    // Create marker icon with civic theme color
    function createMarkerIcon(isSelected, themeColor) {
        const size = isSelected ? 44 : 36;
        const color = isSelected ? '#3b82f6' : (themeColor || '#22c55e');
        return L.divIcon({
            className: 'custom-marker',
            html: `<div class="marker-pin ${isSelected ? 'selected' : ''}">
                <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="1.5">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3" fill="white"></circle>
                </svg>
            </div>`,
            iconSize: [size, size],
            iconAnchor: [size/2, size],
            popupAnchor: [0, -size]
        });
    }

    // Initialize map
    function initMap() {
        const config = PLANETUNE_MAP_CONFIG;
        map = L.map(mapElement, {
            center: config.center,
            zoom: config.zoom,
            minZoom: config.minZoom,
            maxZoom: config.maxZoom,
            zoomControl: false
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(map);

        L.control.zoom({ position: 'topleft' }).addTo(map);

        // Add markers with civic theme colors
        const playlists = getCurrentPlaylists();
        playlists.forEach(playlist => {
            const themeColor = playlist.civicTheme ? playlist.civicTheme.color : '#22c55e';
            const marker = L.marker(playlist.coordinates, {
                icon: createMarkerIcon(false, themeColor)
            });
            marker.bindPopup(`<strong>${playlist.name}</strong><br>${playlist.location}`, {
                closeButton: false,
                autoPanPaddingTopLeft: L.point(10, 20)
            });
            marker.on('click', () => selectPlaylistFromMap(playlist.id));
            marker.addTo(map);
            markers[playlist.id] = marker;
        });
    }

    // Get current tour playlists (defined early for initMap)
    function getCurrentPlaylists() {
        return ALL_TOURS[currentTourId] || PLANETUNE_PLAYLISTS;
    }

    // Update card selection visually without re-rendering
    function updateCardSelection() {
        const cards = playlistContainer.querySelectorAll('.playlist-card');
        cards.forEach(card => {
            const cardId = parseInt(card.dataset.playlistId);
            if (cardId === selectedPin) {
                card.classList.add('ring-2', 'ring-blue-500');
                const locationText = card.querySelector('p.text-xs');
                if (locationText) {
                    locationText.classList.remove('text-gray-400');
                    locationText.classList.add('text-green-500');
                }
            } else {
                card.classList.remove('ring-2', 'ring-blue-500');
                const locationText = card.querySelector('p.text-xs');
                if (locationText) {
                    locationText.classList.remove('text-green-500');
                    locationText.classList.add('text-gray-400');
                }
            }
        });
    }

    // Select playlist (from card click - no scroll)
    function selectPlaylist(id) {
        // Close all popups first to ensure clean state on mobile
        map.closePopup();
        Object.values(markers).forEach(m => m.closePopup());

        selectedPin = id;
        updateMarkers();
        updateCardSelection();

        // Pan map to selected location
        const playlists = getCurrentPlaylists();
        const playlist = playlists.find(p => p.id === id);
        if (playlist && map) {
            map.panTo(playlist.coordinates);
            // Delay popup to ensure it opens after icon update completes (mobile fix)
            setTimeout(() => {
                markers[id].openPopup();
            }, 100);
        }
    }

    // Select playlist from map pin click (with scroll)
    function selectPlaylistFromMap(id) {
        // Close all popups first to ensure clean state on mobile
        map.closePopup();
        Object.values(markers).forEach(m => m.closePopup());

        selectedPin = id;
        updateMarkers();
        updateCardSelection();

        // Pan map to selected location
        const playlists = getCurrentPlaylists();
        const playlist = playlists.find(p => p.id === id);
        if (playlist && map) {
            map.panTo(playlist.coordinates);
            // Delay popup to ensure it opens after icon update completes (mobile fix)
            setTimeout(() => {
                markers[id].openPopup();
            }, 100);
        }

        // Scroll playlist card to right under the map
        setTimeout(() => {
            const card = playlistContainer.querySelector(`[data-playlist-id="${id}"]`);
            if (card) {
                card.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 150);
    }

    // Update marker styles
    function updateMarkers() {
        const playlists = getCurrentPlaylists();
        Object.entries(markers).forEach(([id, marker]) => {
            const isSelected = parseInt(id) === selectedPin;
            const playlist = playlists.find(p => p.id === parseInt(id));
            const themeColor = playlist && playlist.civicTheme ? playlist.civicTheme.color : '#22c55e';
            marker.setIcon(createMarkerIcon(isSelected, themeColor));
        });
    }

    // Generate card HTML for a playlist
    function generateCardHTML(playlist, suffix = '') {
        const theme = playlist.civicTheme;
        const themeColor = theme ? theme.color : '#22c55e';
        const imageStyle = playlist.image
            ? `background-image: url('${playlist.image}'); background-size: cover; background-position: center;`
            : `background: linear-gradient(135deg, ${themeColor}33, ${themeColor}66);`;

        return `
        <div id="playlist-${playlist.id}${suffix}"
             data-playlist-id="${playlist.id}"
             onclick="selectPlaylist(${playlist.id})"
             class="bg-gray-800 rounded-xl overflow-hidden mb-3 shadow-lg flex transition-all playlist-card cursor-pointer ${selectedPin === playlist.id ? 'ring-2 ring-blue-500' : ''}">
            <!-- Featured Image -->
            <div class="w-28 flex-shrink-0 relative" style="${imageStyle}">
            </div>

            <!-- Content -->
            <div class="flex-1 flex flex-col p-3 min-w-0 justify-center">
                <h3 class="text-white text-base font-bold mb-1 truncate leading-tight">${playlist.name}</h3>
                <p class="text-sm truncate leading-tight ${selectedPin === playlist.id ? 'text-green-500' : 'text-gray-400'}">
                    ${playlist.location}
                </p>
            </div>

            <!-- Play Button - Vertically Centered -->
            <div class="flex items-center pr-3" onclick="event.stopPropagation()">
                <button onclick="openLocationDetail(${playlist.id})"
                        class="w-9 h-9 rounded-full flex items-center justify-center hover:opacity-80 transition-all shadow-lg play-button"
                        style="background: ${themeColor};">
                    ${icons.play}
                </button>
            </div>
        </div>
    `;
    }

    // Render playlist cards
    function renderPlaylists() {
        const playlists = getCurrentPlaylists();
        playlistContainer.innerHTML = playlists.map(p => generateCardHTML(p, '')).join('');
    }

    // Show playlist detail modal
    window.showPlaylistDetail = function(id) {
        const playlists = getCurrentPlaylists();
        const playlist = playlists.find(p => p.id === id);
        if (!playlist) return;

        const theme = playlist.civicTheme;
        const themeColor = theme ? theme.color : '#22c55e';
        const themeName = theme ? theme.name : '';

        modalsContainer.innerHTML = `
            <div class="fixed inset-0 bg-black z-50 flex flex-col max-w-2xl mx-auto">
                <div class="bg-white px-4 py-2 flex items-center justify-between shadow-sm flex-shrink-0">
                    <div class="flex items-center gap-2">
                        <div class="w-10 h-10 rounded-full flex items-center justify-center" style="background: ${themeColor};">
                            ${icons.music}
                        </div>
                        <div class="text-xl font-bold">
                            <span class="text-gray-800">VoteCraft</span>
                            <span style="color: ${themeColor};">Tour</span>
                        </div>
                    </div>
                </div>

                <div class="flex-1 overflow-y-auto pb-20 px-4 pt-4">
                    <button onclick="closeModal()" class="flex items-center gap-2 text-white mb-4 px-4 py-2 border border-gray-700 rounded-xl hover:bg-gray-800 transition-colors">
                        <span>&larr;</span>
                        <span class="text-sm">Back to Tour</span>
                    </button>

                    <!-- Civic Theme Badge -->
                    ${theme ? `
                        <div class="mb-4">
                            <span class="text-white text-sm font-bold px-3 py-1.5 rounded-full" style="background: ${themeColor};">
                                ${themeName}
                            </span>
                        </div>
                    ` : ''}

                    <h1 class="text-white text-2xl font-bold leading-tight mb-2">${playlist.name}</h1>
                    <p class="text-gray-400 text-sm mb-4">${playlist.location}</p>

                    <p class="text-gray-300 text-sm leading-relaxed mb-4">${playlist.description}</p>

                    <!-- Learn More Fact -->
                    ${playlist.learnMore ? `
                        <div class="bg-gray-900 border-l-4 rounded-r-lg p-4 mb-4" style="border-color: ${themeColor};">
                            <div class="flex items-start gap-3">
                                <div class="text-yellow-400 flex-shrink-0 mt-0.5">${icons.lightbulb}</div>
                                <div>
                                    <p class="text-white text-sm font-semibold mb-1">Did You Know?</p>
                                    <p class="text-gray-300 text-sm">${playlist.learnMore}</p>
                                </div>
                            </div>
                        </div>
                    ` : ''}

                    <!-- Explore the Data Button -->
                    ${playlist.widget ? `
                        <button onclick="showWidget('${playlist.widget}')"
                                class="w-full text-white font-bold py-4 rounded-xl mb-6 flex items-center justify-center gap-3 hover:opacity-90 transition-all"
                                style="background: ${themeColor};">
                            ${icons.chart}
                            <span>Explore the Data</span>
                        </button>
                    ` : ''}

                    <div class="bg-gray-900 rounded-xl p-4">
                        <h2 class="text-white text-lg font-bold mb-3">Soundtrack</h2>
                        <div class="bg-gray-800 rounded-lg p-4 mb-3">
                            <p class="text-gray-400 text-xs mb-2">Linked from SoundCloud</p>
                            <div class="space-y-2">
                                ${playlist.tracks.map(track => `
                                    <div class="flex items-center gap-3 py-2">
                                        <div class="w-8 h-8 rounded flex items-center justify-center flex-shrink-0" style="background: ${themeColor}33;">
                                            <svg class="w-4 h-4" style="color: ${themeColor};" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
                                            </svg>
                                        </div>
                                        <div class="flex-1 min-w-0">
                                            <p class="text-white font-semibold text-sm truncate">${track.name}</p>
                                            <p class="text-gray-400 text-xs truncate">${track.artist}</p>
                                        </div>
                                        <button class="hover:opacity-80" style="color: ${themeColor};">
                                            <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                        </button>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    };

    // Show widget modal
    window.showWidget = function(widgetName) {
        const widgetTitles = {
            'rcv-demo': 'Ranked Choice Voting',
            'healthcare-cost': 'Healthcare Costs',
            'voter-turnout': 'Voter Participation',
            'housing-cost': 'Housing Affordability',
            'immigration-data': 'Immigration Statistics',
            'wealth-inequality': 'Wealth Distribution',
            'climate-impact': 'Climate Projections',
            'student-debt': 'Student Debt Crisis'
        };

        modalsContainer.innerHTML = `
            <div class="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col max-w-2xl mx-auto">
                <div class="bg-gray-900 px-4 py-3 flex items-center justify-between shadow-sm flex-shrink-0">
                    <h2 class="text-white font-bold">${widgetTitles[widgetName] || 'Explore Data'}</h2>
                    <button onclick="closeModal()" class="text-white hover:bg-gray-800 p-2 rounded-full">
                        ${icons.x}
                    </button>
                </div>
                <div class="flex-1 overflow-y-auto p-4">
                    <div class="bg-gray-800 rounded-xl p-6 text-center">
                        <div class="text-6xl mb-4">${icons.chart}</div>
                        <p class="text-white text-lg font-bold mb-2">Interactive Widget</p>
                        <p class="text-gray-400 text-sm mb-4">The ${widgetTitles[widgetName] || widgetName} widget will be embedded here.</p>
                        <p class="text-gray-500 text-xs">Widget: ${widgetName}</p>
                    </div>
                </div>
            </div>
        `;
    };

    // Tour types available
    const TOUR_TYPES = [
        {
            id: 'civic-sampler',
            name: 'Freedom Trail Sampler',
            description: 'Experience all civic themes across Boston landmarks',
            icon: '🗽',
            color: '#3B82F6',
            stops: 8
        },
        {
            id: 'healthcare',
            name: 'Healthcare Justice Tour',
            description: 'Explore the healthcare system through music and data',
            icon: '🏥',
            color: '#10B981',
            stops: 4
        },
        {
            id: 'voting-rights',
            name: 'Voting Rights Tour',
            description: 'From the Revolution to today - the fight for every vote',
            icon: '🗳️',
            color: '#8B5CF6',
            stops: 4
        },
        {
            id: 'art-action',
            name: 'ART ACTION TOUR',
            description: 'The role of journalism in democracy',
            icon: '🎨',
            color: '#F59E0B',
            stops: 4
        }
    ];

    // Show navigation drawer
    window.showTourMenu = function() {
        // Create drawer HTML
        modalsContainer.innerHTML = `
            <div class="nav-drawer-overlay" onclick="closeDrawer()"></div>
            <nav class="nav-drawer" role="navigation" aria-label="Tour selection">
                <div class="nav-drawer-header">
                    <button class="nav-drawer-close" onclick="closeDrawer()" aria-label="Close menu">
                        ${icons.x}
                    </button>
                    <div class="flex flex-col items-center text-center mb-2">
                        <div class="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mb-2">
                            ${icons.music}
                        </div>
                        <div class="text-xl font-bold text-white">VoteCraft</div>
                        <div class="text-blue-200 text-sm">Civic Music Tours</div>
                    </div>
                </div>

                <div class="nav-drawer-content">
                    <!-- Menu Items -->
                    <div class="nav-menu-list">
                        <!-- Home -->
                        <a href="#" class="nav-menu-item" onclick="navigateTo('home'); return false;">
                            <svg class="nav-menu-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                            </svg>
                            <span>Home</span>
                        </a>

                        <!-- Tour Type Accordion -->
                        <div class="accordion">
                            <button class="accordion-trigger nav-menu-item" onclick="toggleAccordion()" aria-expanded="false">
                                <svg class="nav-menu-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
                                </svg>
                                <span class="flex-1 text-left">Tour Type</span>
                                <svg class="accordion-chevron w-4 h-4 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
                                </svg>
                            </button>

                            <div class="accordion-content">
                                ${TOUR_TYPES.map(tour => `
                                    <div class="accordion-item ${currentTourId === tour.id ? 'active' : ''}"
                                         onclick="selectTourFromDrawer('${tour.id}')"
                                         role="button"
                                         tabindex="0">
                                        <span class="text-xl">${tour.icon}</span>
                                        <div class="flex-1">
                                            <div class="text-white font-medium text-sm">${tour.name}</div>
                                        </div>
                                        ${currentTourId === tour.id ? `
                                            <svg class="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                                            </svg>
                                        ` : ''}
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <!-- Itinerary -->
                        <a href="#" class="nav-menu-item" onclick="navigateTo('itinerary'); return false;">
                            <svg class="nav-menu-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
                            </svg>
                            <span>Itinerary</span>
                        </a>

                        <!-- User/Profile -->
                        <a href="#" class="nav-menu-item" onclick="navigateTo('user'); return false;">
                            <svg class="nav-menu-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                            </svg>
                            <span>Account</span>
                        </a>

                        <!-- Settings Accordion -->
                        <div class="accordion" id="settings-accordion">
                            <button class="accordion-trigger nav-menu-item" onclick="toggleSettingsAccordion()" aria-expanded="false">
                                <svg class="nav-menu-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                </svg>
                                <span class="flex-1 text-left">Settings</span>
                                <svg class="accordion-chevron w-4 h-4 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
                                </svg>
                            </button>

                            <div class="accordion-content">
                                <!-- Notification Preferences -->
                                <div class="accordion-item settings-item" onclick="toggleSetting('notifications')">
                                    <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                                    </svg>
                                    <div class="flex-1">
                                        <div class="text-white font-medium text-sm">Notifications</div>
                                        <div class="text-gray-500 text-xs">Tour alerts & reminders</div>
                                    </div>
                                    <div id="notifications-toggle" class="w-10 h-6 bg-gray-600 rounded-full relative cursor-pointer">
                                        <div class="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform"></div>
                                    </div>
                                </div>

                                <!-- Music Volume -->
                                <div class="accordion-item settings-item">
                                    <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/>
                                    </svg>
                                    <div class="flex-1">
                                        <div class="text-white font-medium text-sm">Music Volume</div>
                                        <div class="mt-2">
                                            <input type="range" id="volume-slider" min="0" max="100" value="80"
                                                   class="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                                   oninput="updateVolume(this.value)">
                                        </div>
                                    </div>
                                    <span id="volume-value" class="text-gray-400 text-sm ml-2">80%</span>
                                </div>

                                <!-- Offline Mode -->
                                <div class="accordion-item settings-item" onclick="toggleOfflineMode()">
                                    <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                                    </svg>
                                    <div class="flex-1">
                                        <div class="text-white font-medium text-sm">Offline Mode</div>
                                        <div class="text-gray-500 text-xs">Download tour data</div>
                                    </div>
                                    <div id="offline-toggle" class="w-10 h-6 bg-gray-600 rounded-full relative cursor-pointer">
                                        <div class="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- About Section -->
                    <div class="mt-6 pt-4 border-t border-gray-700">
                        <p class="text-gray-500 text-xs px-1 mb-3">About</p>
                        <div class="text-gray-400 text-sm leading-relaxed">
                            Explore Boston's Freedom Trail through civic-themed audio tours. Each stop connects historic sites to modern civic issues.
                        </div>
                    </div>
                </div>

                <div class="nav-drawer-footer">
                </div>
            </nav>
        `;

        // Trigger animation after DOM update
        requestAnimationFrame(() => {
            document.querySelector('.nav-drawer-overlay').classList.add('open');
            document.querySelector('.nav-drawer').classList.add('open');
            document.body.classList.add('drawer-open');
        });
    };

    // Toggle accordion open/close
    window.toggleAccordion = function() {
        const accordion = document.querySelector('.accordion:not(#settings-accordion)');
        const trigger = accordion.querySelector('.accordion-trigger');
        const isOpen = accordion.classList.contains('open');

        accordion.classList.toggle('open');
        trigger.setAttribute('aria-expanded', !isOpen);
    };

    // Toggle settings accordion open/close
    window.toggleSettingsAccordion = function() {
        const accordion = document.getElementById('settings-accordion');
        const trigger = accordion.querySelector('.accordion-trigger');
        const isOpen = accordion.classList.contains('open');

        accordion.classList.toggle('open');
        trigger.setAttribute('aria-expanded', !isOpen);
    };

    // Toggle notification setting
    window.toggleSetting = function(setting) {
        const toggle = document.getElementById(`${setting}-toggle`);
        if (!toggle) return;

        const isOn = toggle.classList.contains('active');
        const knob = toggle.querySelector('div');

        if (isOn) {
            toggle.classList.remove('active');
            toggle.style.background = '#4B5563';
            knob.style.transform = 'translateX(0)';
            localStorage.setItem(`votecraft_${setting}`, 'false');
        } else {
            toggle.classList.add('active');
            toggle.style.background = '#3B82F6';
            knob.style.transform = 'translateX(16px)';
            localStorage.setItem(`votecraft_${setting}`, 'true');
        }
    };

    // Update volume
    window.updateVolume = function(value) {
        document.getElementById('volume-value').textContent = value + '%';
        localStorage.setItem('votecraft_volume', value);
    };

    // Toggle offline mode
    window.toggleOfflineMode = function() {
        const toggle = document.getElementById('offline-toggle');
        if (!toggle) return;

        const isOn = toggle.classList.contains('active');
        const knob = toggle.querySelector('div');

        if (isOn) {
            toggle.classList.remove('active');
            toggle.style.background = '#4B5563';
            knob.style.transform = 'translateX(0)';
            localStorage.setItem('votecraft_offline', 'false');
        } else {
            toggle.classList.add('active');
            toggle.style.background = '#3B82F6';
            knob.style.transform = 'translateX(16px)';
            localStorage.setItem('votecraft_offline', 'true');
            // Could trigger download of tour data here
        }
    };

    // Navigate to menu item
    window.navigateTo = function(destination) {
        switch(destination) {
            case 'home':
                window.location.href = 'index.html';
                break;
            case 'itinerary':
                window.location.href = `itinerary.html?tour=${currentTourId}`;
                break;
            case 'user':
                window.location.href = `profile.html?tour=${currentTourId}`;
                break;
        }
    };

    // Close navigation drawer
    window.closeDrawer = function() {
        const overlay = document.querySelector('.nav-drawer-overlay');
        const drawer = document.querySelector('.nav-drawer');

        if (overlay && drawer) {
            overlay.classList.remove('open');
            drawer.classList.remove('open');
            document.body.classList.remove('drawer-open');

            // Remove from DOM after animation
            setTimeout(() => {
                modalsContainer.innerHTML = '';
            }, 300);
        }
    };

    // Select tour from drawer
    window.selectTourFromDrawer = function(tourId) {
        closeDrawer();
        setTimeout(() => {
            selectTour(tourId);
        }, 150);
    };

    // Select a tour
    window.selectTour = function(tourId) {
        const tour = TOUR_TYPES.find(t => t.id === tourId);
        if (!tour) return;

        // Update current tour
        currentTourId = tourId;
        selectedPin = null;

        // Update UI
        closeModal();
        reloadMap();
        renderPlaylists();

        // Update header title
        const headerTitle = document.getElementById('tour-title');
        if (headerTitle) {
            headerTitle.textContent = tour.name;
        }

        // Update map overlay
        updateMapTourName(tourId, tour.name);
    };

    // Helper to update the map tour name overlay
    function updateMapTourName(tourId, tourName) {
        const mapTourName = document.getElementById('map-tour-name');
        if (!mapTourName) return;

        // Format the name: remove "TOUR", convert to title case, add "Itinerary"
        let displayName = tourName
            .replace(/\s*TOUR\s*/gi, ' ')
            .trim()
            .toLowerCase()
            .replace(/\b\w/g, c => c.toUpperCase());

        // All tour titles get white rounded outline and link to itinerary
        mapTourName.innerHTML = `
            <div class="flex justify-center">
                <a href="itinerary.html?tour=${tourId}"
                   class="inline-flex items-center gap-2 text-white text-xl font-bold border-2 border-white rounded-lg px-4 py-2 hover:bg-white/20 transition-colors">
                    ${displayName} Itinerary
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
                    </svg>
                </a>
            </div>
        `;
    }

    // Reload map markers for current tour
    function reloadMap() {
        // Remove existing markers
        Object.values(markers).forEach(marker => {
            map.removeLayer(marker);
        });
        markers = {};

        // Add new markers
        const playlists = getCurrentPlaylists();
        playlists.forEach(playlist => {
            const themeColor = playlist.civicTheme ? playlist.civicTheme.color : '#22c55e';
            const marker = L.marker(playlist.coordinates, {
                icon: createMarkerIcon(false, themeColor)
            });
            marker.bindPopup(`<strong>${playlist.name}</strong><br>${playlist.location}`, {
                closeButton: false,
                autoPanPaddingTopLeft: L.point(10, 20)
            });
            marker.on('click', () => selectPlaylistFromMap(playlist.id));
            marker.addTo(map);
            markers[playlist.id] = marker;
        });

        // Fit bounds to show all markers
        if (playlists.length > 0) {
            const bounds = L.latLngBounds(playlists.map(p => p.coordinates));
            map.fitBounds(bounds, { padding: [30, 30] });
        }
    }

    // Show plastic savers popup
    window.showPlasticSavers = function() {
        modalsContainer.innerHTML = `
            <div class="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4 modal-backdrop" onclick="closeModal()">
                <div class="bg-green-500 rounded-2xl max-w-sm w-full p-6 relative modal-content" onclick="event.stopPropagation()">
                    <button onclick="closeModal()" class="absolute top-3 right-3 text-white hover:bg-green-600 p-1 rounded-full transition-colors">
                        ${icons.x}
                    </button>

                    <div class="flex items-center gap-3 mb-4">
                        <div class="text-3xl">&#9851;</div>
                        <h2 class="text-white text-xl font-bold leading-tight">Plastic Savers Initiative</h2>
                    </div>

                    <p class="text-white text-sm leading-relaxed mb-5">
                        This user is encouraging people to be plastic savers! Bring your own water bottles, containers, bags, and utensils. They encourage people to share selfies in this location with their plastic saver items.
                    </p>

                    <button onclick="closeModal()" class="w-full bg-white text-green-600 font-bold py-3 rounded-full hover:bg-gray-100 transition-colors text-base">
                        Check it out
                    </button>
                </div>
            </div>
        `;
    };

    // Show profile modal
    window.showProfile = function() {
        // Get liked locations from localStorage
        const likedLocations = JSON.parse(localStorage.getItem('votecraft_likes') || '[]');
        const savedSongs = JSON.parse(localStorage.getItem('votecraft_saved_songs') || '[]');
        const favoriteThemes = JSON.parse(localStorage.getItem('votecraft_favorite_themes') || '[]');

        // Get location names for liked items
        const likedLocationsList = likedLocations.map(item => {
            const tour = ALL_TOURS[item.tourId];
            if (tour) {
                const location = tour.find(l => l.id === item.locationId);
                if (location) {
                    return `<div class="flex items-center gap-3 py-2 border-b border-gray-700 last:border-0">
                        <svg class="w-5 h-5 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                        </svg>
                        <span class="text-white text-sm">${location.name}</span>
                    </div>`;
                }
            }
            return '';
        }).filter(Boolean).join('') || '<p class="text-gray-500 text-sm">No liked locations yet</p>';

        // Get saved songs list
        const savedSongsList = savedSongs.map(song => `
            <div class="flex items-center gap-3 py-2 border-b border-gray-700 last:border-0">
                <svg class="w-5 h-5 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
                </svg>
                <span class="text-white text-sm">${song.name}</span>
            </div>
        `).join('') || '<p class="text-gray-500 text-sm">No saved songs yet</p>';

        // Get favorite themes with colors
        const themeColors = {
            'Democracy': '#3B82F6',
            'Voting': '#8B5CF6',
            'Healthcare': '#10B981',
            'Education': '#F59E0B',
            'Economy': '#EF4444',
            'Housing': '#EC4899',
            'Climate': '#22C55E',
            'Journalism': '#6366F1',
            'Immigration': '#14B8A6',
            'SCOTUS': '#DC2626'
        };
        const favoriteThemesList = favoriteThemes.map(theme => `
            <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold text-white mr-2 mb-2" style="background: ${themeColors[theme] || '#6B7280'}">
                ${theme}
            </span>
        `).join('') || '<p class="text-gray-500 text-sm">No favorite themes yet</p>';

        modalsContainer.innerHTML = `
            <div class="fixed inset-0 bg-gray-900 z-50 flex flex-col max-w-2xl mx-auto">
                <div class="bg-white px-4 py-2 flex items-center justify-between shadow-sm flex-shrink-0">
                    <div class="flex items-center gap-2">
                        <div class="w-10 h-10 rounded-full flex items-center justify-center" style="background: #4269FF;">
                            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                            </svg>
                        </div>
                        <div class="text-xl font-bold">
                            <span class="text-gray-800">VoteCraft</span>
                            <span style="color: #4269FF;">Account</span>
                        </div>
                    </div>
                    <button onclick="closeModal()" class="text-gray-600 hover:bg-gray-100 p-2 rounded-full">
                        ${icons.x}
                    </button>
                </div>

                <div class="flex-1 overflow-y-auto pb-20">
                    <!-- Profile Basics -->
                    <div class="flex flex-col items-center pt-8 pb-6 px-4">
                        <div class="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center mb-4 border-4 border-blue-500">
                            <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                            </svg>
                        </div>
                        <h2 class="text-white text-2xl font-bold mb-1">Guest User</h2>
                        <p class="text-gray-400 text-sm mb-4">Sign in to save your progress</p>
                        <button class="px-6 py-2 rounded-full font-semibold text-white text-sm" style="background: #4269FF;">
                            Sign In / Create Account
                        </button>
                    </div>

                    <div class="px-4 space-y-4">
                        <!-- Liked Locations -->
                        <div class="bg-gray-800 rounded-2xl p-5">
                            <div class="flex items-center gap-3 mb-4">
                                <svg class="w-6 h-6 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                                </svg>
                                <h3 class="text-white text-lg font-bold">Liked Locations</h3>
                                <span class="ml-auto text-gray-500 text-sm">${likedLocations.length}</span>
                            </div>
                            <div class="max-h-40 overflow-y-auto">
                                ${likedLocationsList}
                            </div>
                        </div>

                        <!-- Saved Songs -->
                        <div class="bg-gray-800 rounded-2xl p-5">
                            <div class="flex items-center gap-3 mb-4">
                                <svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
                                </svg>
                                <h3 class="text-white text-lg font-bold">Saved Songs</h3>
                                <span class="ml-auto text-gray-500 text-sm">${savedSongs.length}</span>
                            </div>
                            <div class="max-h-40 overflow-y-auto">
                                ${savedSongsList}
                            </div>
                        </div>

                        <!-- Favorite Civic Themes -->
                        <div class="bg-gray-800 rounded-2xl p-5">
                            <div class="flex items-center gap-3 mb-4">
                                <svg class="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                                </svg>
                                <h3 class="text-white text-lg font-bold">Favorite Themes</h3>
                            </div>
                            <div class="flex flex-wrap">
                                ${favoriteThemesList}
                            </div>
                        </div>

                        <!-- Tour Progress -->
                        <div class="bg-gray-800 rounded-2xl p-5">
                            <div class="flex items-center gap-3 mb-4">
                                <svg class="w-6 h-6 text-green-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                                <h3 class="text-white text-lg font-bold">Tour Progress</h3>
                            </div>
                            <div class="space-y-3">
                                <div class="flex items-center justify-between">
                                    <span class="text-gray-300 text-sm">Freedom Trail</span>
                                    <span class="text-gray-500 text-xs">0/10 stops</span>
                                </div>
                                <div class="w-full bg-gray-700 rounded-full h-2">
                                    <div class="bg-blue-500 h-2 rounded-full" style="width: 0%"></div>
                                </div>
                                <div class="flex items-center justify-between mt-3">
                                    <span class="text-gray-300 text-sm">Healthcare</span>
                                    <span class="text-gray-500 text-xs">0/15 stops</span>
                                </div>
                                <div class="w-full bg-gray-700 rounded-full h-2">
                                    <div class="bg-green-500 h-2 rounded-full" style="width: 0%"></div>
                                </div>
                                <div class="flex items-center justify-between mt-3">
                                    <span class="text-gray-300 text-sm">Voting Rights</span>
                                    <span class="text-gray-500 text-xs">0/20 stops</span>
                                </div>
                                <div class="w-full bg-gray-700 rounded-full h-2">
                                    <div class="bg-purple-500 h-2 rounded-full" style="width: 0%"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    };

    // Close modal
    window.closeModal = function() {
        modalsContainer.innerHTML = '';
    };

    // Navigate to location detail page
    function openLocationDetail(id) {
        window.location.href = `location-detail.html?id=${id}&tour=${currentTourId}`;
    }

    // Make functions available globally
    window.selectPlaylist = selectPlaylist;
    window.openLocationDetail = openLocationDetail;

    // Initialize
    document.addEventListener('DOMContentLoaded', function() {
        // Check for tour parameter in URL (for returning from detail page)
        const urlParams = new URLSearchParams(window.location.search);
        const tourParam = urlParams.get('tour');
        if (tourParam && ALL_TOURS[tourParam]) {
            currentTourId = tourParam;
            const tour = TOUR_TYPES.find(t => t.id === tourParam);
            if (tour) {
                const headerTitle = document.getElementById('tour-title');
                if (headerTitle) {
                    headerTitle.textContent = tour.name;
                }
                updateMapTourName(tourParam, tour.name);
            }
        }

        initMap();
        renderPlaylists();

        // Menu button
        document.getElementById('btn-menu').addEventListener('click', showTourMenu);
    });
})();
