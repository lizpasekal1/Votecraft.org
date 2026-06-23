/**
 * Shared Top Bar Component
 * Provides consistent header across all pages
 */

const TopBar = {
    // Configuration for different page types
    configs: {
        home: {
            showBack: false,
            title: { prefix: 'VoteCraft', suffix: 'Tours', suffixColor: '#3B82F6' },
            icon: 'music',
            iconBg: '#3B82F6'
        },
        itinerary: {
            showBack: true,
            backUrl: 'scavenger-tours.html',
            title: { prefix: 'My', suffix: 'Itinerary', suffixColor: '#4269FF' },
            icon: 'checklist',
            iconBg: '#4269FF'
        },
        detail: {
            showBack: true,
            backUrl: 'scavenger-tours.html',
            title: { prefix: 'Location', suffix: 'Details', suffixColor: '#22c55e' },
            icon: 'location',
            iconBg: '#22c55e'
        },
        profile: {
            showBack: true,
            backUrl: 'scavenger-tours.html',
            title: { prefix: 'My', suffix: 'Profile', suffixColor: '#4269FF' },
            icon: 'user',
            iconBg: '#4269FF'
        },
        tourSelect: {
            showBack: true,
            backUrl: 'scavenger-tours.html',
            title: { prefix: 'Select', suffix: 'Tour', suffixColor: '#4269FF' },
            icon: 'list',
            iconBg: '#4269FF'
        }
    },

    // SVG icons
    icons: {
        music: `<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/></svg>`,
        checklist: `<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>`,
        location: `<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>`,
        user: `<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>`,
        list: `<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>`,
        back: `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>`,
        menu: `<svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>`
    },

    /**
     * Render the top bar
     * @param {string} pageType - One of: home, itinerary, detail, profile, tourSelect
     * @param {Object} options - Override options (backUrl, title, etc.)
     * @returns {string} HTML string
     */
    render(pageType, options = {}) {
        const config = { ...this.configs[pageType], ...options };
        const { showBack, backUrl, title, icon, iconBg } = config;

        const backButton = showBack ? `
            <a href="${backUrl}" id="back-link" class="btn-back absolute left-4 top-1/2 -translate-y-1/2 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                ${this.icons.back}
            </a>
        ` : '';

        return `
            <div class="top-bar bg-white px-4 py-2 shadow-sm sticky top-0 z-30 relative">
                ${backButton}
                <!-- Centered Logo -->
                <div class="flex items-center justify-center gap-2 py-1">
                    <div class="logo-icon w-10 h-10 rounded-full flex items-center justify-center" style="background: ${iconBg};">
                        ${this.icons[icon]}
                    </div>
                    <div class="logo-text text-xl font-bold">
                        <span class="text-gray-800">${title.prefix}</span>
                        <span style="color: ${title.suffixColor};">${title.suffix}</span>
                    </div>
                </div>
                <!-- Menu Button (absolute right) -->
                <button id="btn-menu" class="btn-menu absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-100 rounded-lg">
                    ${this.icons.menu}
                </button>
            </div>
        `;
    },

    /**
     * Initialize the top bar in a container
     * @param {string} containerId - ID of the container element
     * @param {string} pageType - Page type
     * @param {Object} options - Override options
     */
    init(containerId, pageType, options = {}) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = this.render(pageType, options);
        }
    }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TopBar;
}
