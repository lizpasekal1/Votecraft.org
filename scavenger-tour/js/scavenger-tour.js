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
            marker.bindPopup(`<strong>${playlist.name}</strong><br>${playlist.location}`);
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
        selectedPin = id;
        updateMarkers();
        updateCardSelection();

        // Pan map to selected location
        const playlists = getCurrentPlaylists();
        const playlist = playlists.find(p => p.id === id);
        if (playlist && map) {
            map.panTo(playlist.coordinates);
            markers[id].openPopup();
        }
    }

    // Select playlist from map pin click (with scroll)
    function selectPlaylistFromMap(id) {
        selectedPin = id;
        updateMarkers();
        updateCardSelection();

        // Pan map to selected location
        const playlists = getCurrentPlaylists();
        const playlist = playlists.find(p => p.id === id);
        if (playlist && map) {
            map.panTo(playlist.coordinates);
            markers[id].openPopup();
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
             class="bg-gray-800 rounded-xl overflow-hidden mb-3 shadow-lg flex transition-all h-32 playlist-card cursor-pointer ${selectedPin === playlist.id ? 'ring-2 ring-blue-500' : ''}">
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
            id: 'journalism',
            name: 'Press Freedom Tour',
            description: 'The role of journalism in democracy',
            icon: '📰',
            color: '#F59E0B',
            stops: 4
        },
        {
            id: 'scotus',
            name: 'Supreme Court Reform Tour',
            description: 'Understanding the highest court and calls for reform',
            icon: '⚖️',
            color: '#EF4444',
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
                    <div class="flex items-center gap-3 mb-2">
                        <div class="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                            ${icons.music}
                        </div>
                        <div>
                            <div class="text-xl font-bold text-white">VoteCraft</div>
                            <div class="text-blue-200 text-sm">Civic Music Tours</div>
                        </div>
                    </div>
                </div>

                <div class="nav-drawer-content">
                    <p class="text-gray-400 text-xs uppercase tracking-wider mb-3 px-1">Choose Your Tour</p>
                    ${TOUR_TYPES.map(tour => `
                        <div class="nav-drawer-item ${currentTourId === tour.id ? 'active' : ''}"
                             onclick="selectTourFromDrawer('${tour.id}')"
                             role="button"
                             tabindex="0">
                            <div class="icon">${tour.icon}</div>
                            <div class="content">
                                <div class="title">
                                    ${tour.name}
                                    ${currentTourId === tour.id ? `<span class="badge" style="background: ${tour.color}; color: white;">Active</span>` : ''}
                                </div>
                                <div class="description">${tour.description}</div>
                                <div class="text-gray-500 text-xs mt-1">${tour.stops} stops</div>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div class="nav-drawer-footer">
                    <p class="text-gray-500 text-xs text-center">All tours are ~15 min walks around Government Center</p>
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
        const mapTourName = document.getElementById('map-tour-name');
        if (mapTourName) {
            mapTourName.querySelector('span').textContent = tour.name;
        }
    };

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
            marker.bindPopup(`<strong>${playlist.name}</strong><br>${playlist.location}`);
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
        modalsContainer.innerHTML = `
            <div class="fixed inset-0 bg-gray-900 z-50 flex flex-col max-w-2xl mx-auto">
                <div class="bg-white px-4 py-2 flex items-center justify-between shadow-sm flex-shrink-0">
                    <div class="flex items-center gap-2">
                        <div class="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                            ${icons.music}
                        </div>
                        <div class="text-xl font-bold">
                            <span class="text-green-600">Planetune</span>
                            <span class="text-blue-500">.up</span>
                        </div>
                    </div>
                    <button onclick="closeModal()" class="text-gray-600 hover:bg-gray-100 p-2 rounded-full">
                        ${icons.x}
                    </button>
                </div>

                <div class="flex-1 overflow-y-auto pb-20">
                    <div class="flex flex-col items-center pt-8 pb-6">
                        <div class="w-32 h-32 rounded-full bg-gray-700 flex items-center justify-center mb-4">
                            <svg class="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                            </svg>
                        </div>
                        <h2 class="text-white text-3xl font-bold mb-2">DJ Groove</h2>
                        <p class="text-gray-400 text-sm">Profile data from Instagram.</p>
                    </div>

                    <div class="px-4 space-y-4">
                        <div class="bg-gray-800 rounded-2xl p-5">
                            <div class="flex items-center gap-3 mb-3">
                                <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                                </svg>
                                <h3 class="text-white text-lg font-bold">Instagram Account</h3>
                            </div>
                            <p class="text-gray-400 mb-4 text-sm leading-relaxed">
                                Link your Instagram to sync your profile and share photos on your playlists.
                            </p>
                            <div class="flex items-center gap-2 text-green-500">
                                <div class="w-5 h-5 rounded-full border-2 border-green-500 flex items-center justify-center">
                                    <span class="text-xs">&#10003;</span>
                                </div>
                                <span class="font-semibold text-sm">Account Linked</span>
                            </div>
                        </div>

                        <div class="bg-gray-800 rounded-2xl p-5">
                            <div class="flex items-center gap-3 mb-3">
                                ${icons.music}
                                <h3 class="text-white text-lg font-bold">Spotify Account</h3>
                            </div>
                            <p class="text-gray-400 mb-4 text-sm leading-relaxed">
                                Link your Spotify to feature your favorite tracks.
                            </p>
                            <div class="flex items-center gap-2 text-green-500">
                                <div class="w-5 h-5 rounded-full border-2 border-green-500 flex items-center justify-center">
                                    <span class="text-xs">&#10003;</span>
                                </div>
                                <span class="font-semibold text-sm">Account Linked</span>
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
                const mapTourName = document.getElementById('map-tour-name');
                if (mapTourName) {
                    mapTourName.querySelector('span').textContent = tour.name;
                }
            }
        }

        initMap();
        renderPlaylists();

        // Menu button
        document.getElementById('btn-menu').addEventListener('click', showTourMenu);
    });
})();
