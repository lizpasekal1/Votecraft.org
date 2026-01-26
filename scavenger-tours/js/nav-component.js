/**
 * VoteCraft Scavenger Tours - Shared Navigation Component
 * Include this file on all pages that need the nav drawer
 */

(function() {
    'use strict';

    // Tour types available
    const NAV_TOUR_TYPES = [
        {
            id: 'civic-sampler',
            name: 'Freedom Trail Sampler',
            icon: '🗽',
            color: '#3B82F6'
        },
        {
            id: 'healthcare',
            name: 'Healthcare Justice Tour',
            icon: '🏥',
            color: '#10B981'
        },
        {
            id: 'voting-rights',
            name: 'Voting Rights Tour',
            icon: '🗳️',
            color: '#8B5CF6'
        },
        {
            id: 'art-action',
            name: 'ART ACTION TOUR',
            icon: '🎨',
            color: '#F59E0B'
        }
    ];

    // Get current tour from URL or default
    function getCurrentTourId() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('tour') || 'civic-sampler';
    }

    // Icons
    const navIcons = {
        x: `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
        </svg>`,
        map: `<svg class="nav-menu-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
        </svg>`,
        itinerary: `<svg class="nav-menu-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
        </svg>`,
        user: `<svg class="nav-menu-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
        </svg>`,
        chevron: `<svg class="accordion-chevron w-4 h-4 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
        </svg>`,
        check: `<svg class="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
        </svg>`
    };

    // Ensure modals container exists
    function getModalsContainer() {
        let container = document.getElementById('modals');
        if (!container) {
            container = document.createElement('div');
            container.id = 'modals';
            document.body.appendChild(container);
        }
        return container;
    }

    // Show navigation drawer
    window.showTourMenu = function() {
        const currentTourId = getCurrentTourId();
        const modalsContainer = getModalsContainer();

        modalsContainer.innerHTML = `
            <div class="nav-drawer-overlay" onclick="closeDrawer()"></div>
            <nav class="nav-drawer" role="navigation" aria-label="Tour selection">
                <div class="nav-drawer-top">
                    <button class="nav-drawer-close" onclick="closeDrawer()" aria-label="Close menu">
                        ${navIcons.x}
                    </button>
                </div>

                <div class="nav-drawer-content">
                    <div class="nav-menu-list">
                        <!-- Tour Map -->
                        <a href="scavenger-tours.html?tour=${currentTourId}" class="nav-menu-item">
                            ${navIcons.map}
                            <span>Tour Map</span>
                        </a>

                        <!-- Switch Tour Accordion -->
                        <div class="accordion" id="tour-accordion">
                            <button class="accordion-trigger nav-menu-item" onclick="toggleNavAccordion('tour-accordion')" aria-expanded="false">
                                ${navIcons.map}
                                <span class="flex-1 text-left">Switch Tour</span>
                                ${navIcons.chevron}
                            </button>

                            <div class="accordion-content">
                                ${NAV_TOUR_TYPES.map(tour => `
                                    <div class="accordion-item ${currentTourId === tour.id ? 'active' : ''}"
                                         onclick="selectTourFromNav('${tour.id}')"
                                         role="button"
                                         tabindex="0">
                                        <span class="text-xl">${tour.icon}</span>
                                        <div class="flex-1">
                                            <div class="text-white font-medium text-sm">${tour.name}</div>
                                        </div>
                                        ${currentTourId === tour.id ? navIcons.check : ''}
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <!-- Itinerary -->
                        <a href="itinerary.html?tour=${currentTourId}" class="nav-menu-item">
                            ${navIcons.itinerary}
                            <span>Itinerary</span>
                        </a>

                        <!-- Account -->
                        <a href="profile.html?tour=${currentTourId}" class="nav-menu-item">
                            ${navIcons.user}
                            <span>Account</span>
                        </a>
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

    // Close drawer
    window.closeDrawer = function() {
        const overlay = document.querySelector('.nav-drawer-overlay');
        const drawer = document.querySelector('.nav-drawer');
        if (overlay) overlay.classList.remove('open');
        if (drawer) drawer.classList.remove('open');
        document.body.classList.remove('drawer-open');

        setTimeout(() => {
            const modalsContainer = document.getElementById('modals');
            if (modalsContainer) modalsContainer.innerHTML = '';
        }, 300);
    };

    // Toggle accordion
    window.toggleNavAccordion = function(accordionId) {
        const accordion = document.getElementById(accordionId);
        if (!accordion) return;

        const trigger = accordion.querySelector('.accordion-trigger');
        const isOpen = accordion.classList.contains('open');

        accordion.classList.toggle('open');
        if (trigger) trigger.setAttribute('aria-expanded', !isOpen);
    };

    // Select tour from nav
    window.selectTourFromNav = function(tourId) {
        closeDrawer();
        // Navigate to map page with new tour
        setTimeout(() => {
            window.location.href = `scavenger-tours.html?tour=${tourId}`;
        }, 300);
    };

    // Auto-attach to menu button if it exists
    document.addEventListener('DOMContentLoaded', function() {
        const menuBtn = document.getElementById('btn-menu');
        if (menuBtn && !menuBtn._navAttached) {
            menuBtn.addEventListener('click', showTourMenu);
            menuBtn._navAttached = true;
        }
    });
})();
