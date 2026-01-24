/**
 * Planetune.up - Vanilla JavaScript Implementation
 * Location-based music discovery app
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
        play: `<svg class="w-4 h-4 text-white fill-current ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`,
        x: `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>`,
        music: `<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/></svg>`,
        recycle: `<svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M21.8 15.2l-2.2-3.8 1.4-2.4c.4-.7.2-1.6-.5-2l-1.9-1.1c-.7-.4-1.6-.2-2 .5l-1.4 2.4L12 7.2c-.8-.4-1.7-.4-2.4 0l-1.9 1.1-1.4-2.4c-.4-.7-1.3-.9-2-.5L2.4 6.5c-.7.4-.9 1.3-.5 2l1.4 2.4-2.2 3.8c-.4.7-.2 1.6.5 2l1.9 1.1c.3.2.6.2.9.2.5 0 1-.3 1.2-.7l1.4-2.4 3.2 1.8c.4.2.8.3 1.2.3s.8-.1 1.2-.3l3.2-1.8 1.4 2.4c.2.4.7.7 1.2.7.3 0 .6-.1.9-.2l1.9-1.1c.7-.4.9-1.3.5-2z"/></svg>`
    };

    // Create marker icon
    function createMarkerIcon(isSelected) {
        const size = isSelected ? 44 : 36;
        const color = isSelected ? '#3b82f6' : '#22c55e';
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

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        L.control.zoom({ position: 'topleft' }).addTo(map);

        // Add markers
        PLANETUNE_PLAYLISTS.forEach(playlist => {
            const marker = L.marker(playlist.coordinates, {
                icon: createMarkerIcon(false)
            });
            marker.bindPopup(`<strong>${playlist.name}</strong><br>${playlist.location}`);
            marker.on('click', () => selectPlaylist(playlist.id));
            marker.addTo(map);
            markers[playlist.id] = marker;
        });
    }

    // Select playlist
    function selectPlaylist(id) {
        selectedPin = id;
        updateMarkers();
        renderPlaylists();

        // Pan map to selected location
        const playlist = PLANETUNE_PLAYLISTS.find(p => p.id === id);
        if (playlist && map) {
            map.panTo(playlist.coordinates);
            markers[id].openPopup();
        }
    }

    // Update marker styles
    function updateMarkers() {
        Object.entries(markers).forEach(([id, marker]) => {
            const isSelected = parseInt(id) === selectedPin;
            marker.setIcon(createMarkerIcon(isSelected));
        });
    }

    // Render playlist cards
    function renderPlaylists() {
        // Sort playlists - selected one first
        let sorted = [...PLANETUNE_PLAYLISTS];
        if (selectedPin) {
            const selected = sorted.find(p => p.id === selectedPin);
            const others = sorted.filter(p => p.id !== selectedPin);
            sorted = [selected, ...others];
        }

        playlistContainer.innerHTML = sorted.map(playlist => `
            <div id="playlist-${playlist.id}"
                 class="bg-gray-800 rounded-xl overflow-hidden mb-3 shadow-lg flex transition-all h-28 playlist-card ${selectedPin === playlist.id ? 'ring-2 ring-blue-500' : ''}">
                <!-- Featured Image -->
                <div class="w-28 flex-shrink-0 bg-gradient-to-br from-gray-200 to-white relative">
                    ${playlist.hasPlasticSavers ? `
                        <button onclick="showPlasticSavers()" class="absolute top-2 right-2 w-7 h-7 bg-green-500 rounded-full flex items-center justify-center hover:bg-green-600 transition-colors">
                            ${icons.recycle}
                        </button>
                    ` : ''}
                </div>

                <!-- Content -->
                <div class="flex-1 flex flex-col p-3 min-w-0 justify-between">
                    <div>
                        <h3 class="text-white text-sm font-bold mb-0.5 truncate leading-tight">${playlist.name}</h3>
                        <button onclick="selectPlaylist(${playlist.id})" class="text-left w-full">
                            <p class="text-xs mb-1.5 hover:text-green-400 transition-colors cursor-pointer truncate leading-tight ${selectedPin === playlist.id ? 'text-green-500' : 'text-gray-400'}">
                                ${playlist.location}
                            </p>
                        </button>
                        <div class="flex items-center gap-1.5">
                            <div class="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                                ${icons.user}
                            </div>
                            <span class="text-white text-xs font-medium truncate leading-tight">${playlist.creator}</span>
                        </div>
                    </div>

                    <!-- Actions -->
                    <div class="flex items-center gap-3">
                        <button class="flex items-center gap-1 text-white">
                            ${icons.heart}
                            <span class="text-xs font-semibold">${playlist.likes}</span>
                        </button>
                        <button class="text-white">${icons.message}</button>
                        <button class="text-white">${icons.share}</button>
                        <button onclick="showPlaylistDetail(${playlist.id})"
                                class="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center hover:bg-green-600 transition-all shadow-lg ml-auto flex-shrink-0 play-button">
                            ${icons.play}
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Show playlist detail modal
    window.showPlaylistDetail = function(id) {
        const playlist = PLANETUNE_PLAYLISTS.find(p => p.id === id);
        if (!playlist) return;

        modalsContainer.innerHTML = `
            <div class="fixed inset-0 bg-black z-50 flex flex-col max-w-2xl mx-auto">
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
                </div>

                <div class="flex-1 overflow-y-auto pb-20 px-4 pt-4">
                    <button onclick="closeModal()" class="flex items-center gap-2 text-white mb-4 px-4 py-2 border border-gray-700 rounded-xl hover:bg-gray-800 transition-colors">
                        <span>&larr;</span>
                        <span class="text-sm">Back to Home</span>
                    </button>

                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center">
                            <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                            </svg>
                        </div>
                        <div>
                            <h1 class="text-white text-xl font-bold leading-tight">${playlist.name}</h1>
                            <p class="text-gray-400 text-sm">by ${playlist.creator}</p>
                        </div>
                    </div>

                    <p class="text-gray-300 text-sm leading-relaxed mb-4">${playlist.description}</p>

                    <div class="bg-gray-900 rounded-xl p-4">
                        <h2 class="text-white text-lg font-bold mb-3">Tracklist</h2>
                        <div class="bg-gray-800 rounded-lg p-4 mb-3">
                            <p class="text-gray-400 text-xs mb-2">Linked from Spotify</p>
                            <div class="space-y-2">
                                ${playlist.tracks.map(track => `
                                    <div class="flex items-center gap-3 py-2">
                                        <div class="w-8 h-8 bg-gray-700 rounded flex items-center justify-center flex-shrink-0">
                                            <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
                                            </svg>
                                        </div>
                                        <div class="flex-1 min-w-0">
                                            <p class="text-white font-semibold text-sm truncate">${track.name}</p>
                                            <p class="text-gray-400 text-xs truncate">${track.artist}</p>
                                        </div>
                                        <button class="text-green-500 hover:text-green-400">
                                            <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
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

    // Make selectPlaylist available globally
    window.selectPlaylist = selectPlaylist;

    // Initialize
    document.addEventListener('DOMContentLoaded', function() {
        initMap();
        renderPlaylists();

        // Bottom nav buttons
        document.getElementById('btn-profile').addEventListener('click', showProfile);
        document.getElementById('btn-search').addEventListener('click', function() {
            alert('Search feature coming soon!');
        });
    });
})();
