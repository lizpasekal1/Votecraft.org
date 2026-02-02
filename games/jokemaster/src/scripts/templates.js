/**
 * Template System for JokeMaster
 *
 * Reusable UI component templates using template literals.
 * These templates generate consistent HTML for game elements.
 *
 * Usage:
 *   const html = Templates.contactCard(contactData);
 *   element.innerHTML = html;
 *
 * Available templates:
 * - contactCard(contact) - Contact display card
 * - cityItem(city) - City with expandable contacts
 * - jokeOption(joke) - Joke selection card
 * - comedianCard(comedian) - Comedian recruitment card
 * - artifactCard(artifact) - Artifact collection card
 * - renderList(items, templateFn) - Helper for rendering arrays
 *
 * @see TEMPLATING_GUIDE.md for customization instructions
 * @version 1.0
 */

const Templates = {
    // Contact Card Template
    contactCard: (contact) => `
        <div class="contact-card ${contact.completed ? 'completed' : ''}" data-contact-id="${contact.id}">
            <div class="contact-portrait">${contact.portrait || '👤'}</div>
            <div class="contact-info">
                <div class="contact-name">${contact.name}</div>
                <div class="contact-role">${contact.role}</div>
                <div class="contact-details">${contact.location}</div>
                <span class="contact-status ${contact.completed ? 'completed' : 'pending'}">
                    ${contact.completed ? 'Completed' : 'Pending'}
                </span>
            </div>
            ${contact.completed ? `
                <div class="contact-plus-icon" onclick="showInteractionDetails('${contact.id}')">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                    </svg>
                </div>
            ` : ''}
        </div>
    `,

    // City Item Template
    cityItem: (city) => `
        <div class="city-item ${city.locked ? 'locked' : ''} ${city.open ? 'open' : ''}" data-city-id="${city.id}">
            <div class="city-header" onclick="${city.locked ? '' : `toggleCity('${city.id}')`}">
                <div class="city-info">
                    <div class="city-emoji">${city.emoji}</div>
                    <div class="city-details">
                        <div class="city-name">${city.name}</div>
                        <div class="city-country">${city.country}</div>
                    </div>
                </div>
                <div class="city-meta">
                    ${city.locked ? '<span class="city-lock-icon">🔒</span>' : `
                        <span class="city-count">${city.contactsCompleted}/${city.totalContacts}</span>
                        <div class="city-chevron">
                            <svg width="24" height="24" viewBox="0 0 24 24">
                                <path d="M7 10l5 5 5-5z"/>
                            </svg>
                        </div>
                    `}
                </div>
            </div>
            <div class="city-contacts">
                ${city.locked ? '' : `
                    ${city.canTravel ? `<button class="travel-to-city-btn" onclick="travelToCity('${city.id}')">Travel to ${city.name}</button>` : ''}
                    ${city.contacts.map(contact => Templates.contactCard(contact)).join('')}
                `}
            </div>
        </div>
    `,

    // Joke Option Template
    jokeOption: (joke) => `
        <div class="joke-option" data-joke-id="${joke.id}">
            <div class="joke-text">${joke.text}</div>
            <div class="joke-tags">
                ${joke.tags.map(tag => `<span class="tag tag-${tag}">${tag}</span>`).join('')}
            </div>
            <div class="joke-stats">
                <span class="joke-energy">⚡ ${joke.energyCost || 0}</span>
                <span class="joke-appeal">💫 ${joke.appeal || 'Medium'}</span>
            </div>
            <button class="tell-joke-btn" onclick="tellJoke('${joke.id}')">Tell This Joke</button>
        </div>
    `,

    // Comedian Card Template
    comedianCard: (comedian) => `
        <div class="comedian-card ${comedian.recruited ? 'recruited' : ''} ${comedian.locked ? 'locked' : ''}"
             onclick="${comedian.locked ? '' : `showComedianModal('${comedian.id}')`}">
            <div class="comedian-header">
                <div class="comedian-emoji">${comedian.emoji}</div>
                <div class="comedian-info">
                    <div class="comedian-name">${comedian.name}</div>
                    <div class="comedian-style">${comedian.style}</div>
                </div>
            </div>
            <div class="comedian-location">${comedian.location}</div>
            <div class="comedian-description">${comedian.description}</div>
            ${comedian.bonus ? `
                <div class="comedian-bonus">
                    <div class="bonus-label">Bonus</div>
                    <div class="bonus-tags">
                        ${comedian.bonus.tags.map(tag => `<span class="bonus-tag">${tag}</span>`).join('')}
                    </div>
                </div>
            ` : ''}
            ${comedian.recruited ? `
                <div class="recruited-badge">✓ Recruited</div>
            ` : `
                <div class="comedian-cost">Cost: ${comedian.cost} Energy</div>
                <button class="recruit-btn" ${comedian.locked ? 'disabled' : ''}>
                    ${comedian.locked ? '🔒 Locked' : 'Recruit'}
                </button>
            `}
        </div>
    `,

    // Artifact Card Template
    artifactCard: (artifact) => `
        <div class="artifact-card ${artifact.found ? 'found' : ''} ${artifact.locked ? 'locked' : ''}">
            <div class="artifact-rarity ${artifact.rarity}">${artifact.rarity}</div>
            <div class="artifact-emoji">${artifact.emoji}</div>
            <div class="artifact-name">${artifact.name}</div>
            <div class="artifact-description">${artifact.description}</div>
            <div class="artifact-effect">
                <div class="effect-label">Effect</div>
                <div class="effect-description">${artifact.effect}</div>
            </div>
            <div class="artifact-location">${artifact.location}</div>
            ${artifact.found ? `<div class="found-badge">✓ Found</div>` : ''}
        </div>
    `,

    // Helper: Render array of items using a template
    renderList: (items, templateFn) => {
        return items.map(item => templateFn(item)).join('');
    },

    // Footer Navigation Icons Template
    footerIcons: (activePage = '') => `
        <div class="action-icons">
            <div class="action-icon ${activePage === 'goal' ? 'active' : ''}" onclick="window.location.href='goal.html'">
                <div class="icon-circle">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
                        <path d="M160-120q-33 0-56.5-23.5T80-200v-440q0-33 23.5-56.5T160-720h160v-80q0-33 23.5-56.5T400-880h160q33 0 56.5 23.5T640-800v80h160q33 0 56.5 23.5T880-640v440q0 33-23.5 56.5T800-120H160Zm240-600h160v-80H400v80Zm400 360H600v80H360v-80H160v160h640v-160Zm-360 0h80v-80h-80v80Zm-280-80h200v-80h240v80h200v-200H160v200Zm320 40Z"/>
                    </svg>
                </div>
                <div class="icon-label">GOAL</div>
            </div>
            <div class="action-icon ${activePage === 'contacts' ? 'active' : ''}" onclick="window.location.href='contacts.html'">
                <div class="icon-circle">👤</div>
                <div class="icon-label">CONTACTS</div>
            </div>
            <div class="action-icon ${activePage === 'globe' ? 'active' : ''}" onclick="window.location.href='globe.html'">
                <div class="icon-circle">🌍</div>
                <div class="icon-label">GLOBE</div>
            </div>
            <div class="action-icon ${activePage === 'jokes' ? 'active' : ''}" onclick="window.location.href='your-jokes.html'">
                <div class="icon-circle">🎭</div>
                <div class="icon-label">JOKES</div>
            </div>
            <div class="action-icon ${activePage === 'bank' ? 'active' : ''}" onclick="window.location.href='bank.html'">
                <div class="icon-circle">£</div>
                <div class="icon-label">BANK</div>
            </div>
        </div>
    `
};

// Export for use in other scripts
window.Templates = Templates;
