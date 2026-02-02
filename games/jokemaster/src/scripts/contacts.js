// Contacts page functionality
document.addEventListener('DOMContentLoaded', async function() {
    // Get or create user ID
    const userId = await getOrCreateUserId();

    // Try to load game state from Firestore first, then fallback to localStorage
    let gameState = await loadGameState(userId);

    if (!gameState) {
        // Fallback to localStorage if no Firestore data
        gameState = JSON.parse(localStorage.getItem('jokeMasterGameState') || '{}');
    }

    // Initialize completed characters if not exists
    if (!gameState.completedCharacters) {
        gameState.completedCharacters = ['Marcus Chen', 'Raj Patel', 'Dr. Sarah Williams', 'Camille Dubois'];
        // Save to both localStorage and Firestore
        localStorage.setItem('jokeMasterGameState', JSON.stringify(gameState));
        await saveGameState(userId, gameState);
    }

    // Update header with current funding
    updateHeader(gameState);

    // Load cities and contacts
    loadCitiesAndContacts(gameState);

    // Store userId globally for other functions
    window.currentUserId = userId;
});

function updateHeader(gameState) {
    const headerMoney = document.getElementById('headerMoney');
    const headerCollected = document.getElementById('headerCollected');

    if (headerMoney && gameState.funding !== undefined) {
        if (gameState.funding > 0) {
            headerMoney.textContent = `£${gameState.funding.toLocaleString()}`;
        } else {
            headerMoney.textContent = `£${gameState.funding || 0} FUNDING`;
        }
    }

    if (headerCollected && gameState.usedCards) {
        const jokesCollected = gameState.usedCards ? gameState.usedCards.length : 0;
        headerCollected.textContent = `${jokesCollected} collected`;
    }
}

// Interaction details for completed contacts
const interactionDetails = {
    "Marcus Chen": {
        bio: "Marcus is a serial tech entrepreneur who has founded several successful startups in the fintech and AI space. He's known for his sharp business acumen and love of British humor.",
        interaction: "You met Marcus at a technology conference in London where he was captivated by your jokes about startup culture and venture capital. He laughed so hard at your 'pivot or perish' bit that he nearly spilled his Earl Grey tea.",
        jokeTypes: ["Observational", "Wordplay", "Dark Humor"],
        funding: 5000,
        referralMessage: "You absolutely must meet Victoria Holmes, my publisher friend. She's looking for someone with your wit to write comedy pieces for her new anthology. Tell her I sent you!"
    },
    "Raj Patel": {
        bio: "Raj is a prominent Bollywood film producer with connections across the global entertainment industry. His productions are known for blending traditional Indian cinema with modern storytelling.",
        interaction: "You encountered Raj at a film festival in Mumbai. Your comedic timing and observational humor about the entertainment industry impressed him so much that he asked for your contact information to discuss potential collaborations.",
        jokeTypes: ["Observational", "One-liners", "Absurdist"],
        funding: 8000,
        referralMessage: "I'm working with Priya Sharma on my next film. She's an incredible choreographer who appreciates good humor. You two would get along brilliantly - go introduce yourself!"
    },
    "Dr. Sarah Williams": {
        bio: "Dr. Williams is a leading cognitive psychology researcher at Columbia University, specializing in the neuroscience of humor and laughter. Her work has been published in major scientific journals.",
        interaction: "You met Dr. Williams after performing at a corporate event in New York. She approached you to discuss how your comedic techniques align with psychological principles of humor. Your joke about overthinking made her genuinely laugh while taking notes.",
        jokeTypes: ["Clever", "Observational", "Self-deprecating"],
        funding: 3500,
        referralMessage: "There's a sports agent named Michael Torres I collaborate with on performance psychology. He works with high-pressure athletes and could use someone who understands timing like you do."
    },
    "Camille Dubois": {
        bio: "Camille is a master sommelier and wine consultant who has worked with Michelin-starred restaurants across France. She has an encyclopedic knowledge of wine and a sophisticated sense of humor.",
        interaction: "You crossed paths with Camille at a wine tasting event in Paris. Your witty observations about wine culture and French sophistication charmed her, and she spent the evening sharing stories and recommending her favorite vintages.",
        jokeTypes: ["Sophisticated", "Wordplay", "Puns"],
        funding: 4500,
        referralMessage: "My friend James Rodriguez directs theater here in Paris. He's always looking for fresh comedic perspectives for his productions. Mention my name and he'll give you a warm welcome."
    }
};

function loadCitiesAndContacts(gameState) {
    const citiesList = document.getElementById('citiesList');

    // Organize characters by city
    const citiesData = {
        'London': {
            emoji: '🇬🇧',
            country: 'United Kingdom',
            latitude: 51.5,
            longitude: -0.1,
            contacts: [
                {
                    name: "Marcus Chen",
                    emoji: "🎩",
                    role: "Tech Entrepreneur",
                    details: "Founder of several successful startups"
                },
                {
                    name: "Victoria Holmes",
                    emoji: "📚",
                    role: "Publisher",
                    details: "CEO of independent publishing house"
                },
                {
                    name: "Amir Khan",
                    emoji: "🎵",
                    role: "Music Producer",
                    details: "Grammy-nominated producer and composer"
                }
            ]
        },
        'New York': {
            emoji: '🗽',
            country: 'United States',
            latitude: 40.7,
            longitude: -74.0,
            contacts: [
                {
                    name: "Dr. Sarah Williams",
                    emoji: "🔬",
                    role: "Research Scientist",
                    details: "Leading expert in cognitive psychology"
                },
                {
                    name: "Michael Torres",
                    emoji: "🏀",
                    role: "Sports Agent",
                    details: "Represents top athletes in basketball"
                },
                {
                    name: "Rachel Green",
                    emoji: "👗",
                    role: "Fashion Designer",
                    details: "Creative director at luxury fashion brand"
                },
                {
                    name: "David Park",
                    emoji: "💻",
                    role: "Software Engineer",
                    details: "Lead developer at major tech company"
                }
            ]
        },
        'Paris': {
            emoji: '🇫🇷',
            country: 'France',
            latitude: 48.8,
            longitude: 2.3,
            contacts: [
                {
                    name: "James Rodriguez",
                    emoji: "🎭",
                    role: "Theater Director",
                    details: "Renowned for avant-garde productions"
                },
                {
                    name: "Camille Dubois",
                    emoji: "🍷",
                    role: "Sommelier",
                    details: "Master sommelier and wine consultant"
                }
            ]
        },
        'Tokyo': {
            emoji: '🇯🇵',
            country: 'Japan',
            latitude: 35.6,
            longitude: 139.7,
            contacts: [
                {
                    name: "Zara Okonkwo",
                    emoji: "⚓",
                    role: "Business Executive",
                    details: "CEO of international trading company"
                },
                {
                    name: "Hiroshi Tanaka",
                    emoji: "🎮",
                    role: "Game Developer",
                    details: "Creative director at gaming studio"
                },
                {
                    name: "Yuki Nakamura",
                    emoji: "🍱",
                    role: "Chef",
                    details: "Michelin-starred sushi master"
                }
            ]
        },
        'Sydney': {
            emoji: '🇦🇺',
            country: 'Australia',
            latitude: -33.8,
            longitude: 151.2,
            contacts: [
                {
                    name: "Emma Thompson",
                    emoji: "🎨",
                    role: "Creative Director",
                    details: "Award-winning advertising executive"
                }
            ]
        },
        'Dubai': {
            emoji: '🇦🇪',
            country: 'United Arab Emirates',
            latitude: 25.2,
            longitude: 55.3,
            contacts: [
                {
                    name: "Omar Hassan",
                    emoji: "🏗️",
                    role: "Real Estate Developer",
                    details: "Visionary architect and property mogul"
                },
                {
                    name: "Fatima Al-Sayed",
                    emoji: "✈️",
                    role: "Airline Executive",
                    details: "VP of operations at international airline"
                }
            ]
        },
        'São Paulo': {
            emoji: '🇧🇷',
            country: 'Brazil',
            latitude: -23.5,
            longitude: -46.6,
            contacts: [
                {
                    name: "Isabella Santos",
                    emoji: "⚽",
                    role: "Sports Marketing Director",
                    details: "Former athlete turned marketing innovator"
                },
                {
                    name: "Lucas Silva",
                    emoji: "🎸",
                    role: "Musician",
                    details: "Lead guitarist in popular Brazilian band"
                },
                {
                    name: "Ana Oliveira",
                    emoji: "🌿",
                    role: "Environmental Scientist",
                    details: "Rainforest conservation specialist"
                }
            ]
        },
        'Mumbai': {
            emoji: '🇮🇳',
            country: 'India',
            latitude: 19.0,
            longitude: 72.8,
            contacts: [
                {
                    name: "Raj Patel",
                    emoji: "🎬",
                    role: "Film Producer",
                    details: "Bollywood producer with global reach"
                },
                {
                    name: "Priya Sharma",
                    emoji: "💃",
                    role: "Choreographer",
                    details: "Award-winning dance director"
                },
                {
                    name: "Arjun Mehta",
                    emoji: "🏢",
                    role: "Venture Capitalist",
                    details: "Founding partner at tech investment firm"
                },
                {
                    name: "Kavya Singh",
                    emoji: "📱",
                    role: "App Developer",
                    details: "Founder of successful startup"
                }
            ]
        },
        'Toronto': {
            emoji: '🇨🇦',
            country: 'Canada',
            latitude: 43.6,
            longitude: -79.4,
            contacts: [
                {
                    name: "Sophie Laurent",
                    emoji: "💼",
                    role: "Investment Banker",
                    details: "Managing director at major financial firm"
                },
                {
                    name: "James O'Connor",
                    emoji: "🏒",
                    role: "Hockey Coach",
                    details: "Former professional player and analyst"
                }
            ]
        }
    };

    const completedCharacters = gameState.completedCharacters || new Set();

    // Define unlocked cities in specific order (New York first as current city)
    const unlockedCities = ['New York', 'London', 'Mumbai', 'Paris'];

    // Get remaining cities (locked) sorted alphabetically
    const lockedCities = Object.keys(citiesData)
        .filter(city => !unlockedCities.includes(city))
        .sort();

    // Combine: unlocked cities first, then locked cities
    const allCitiesOrdered = [...unlockedCities, ...lockedCities];

    // Track when we've added the divider
    let dividerAdded = false;

    allCitiesOrdered.forEach((cityName, index) => {
        const cityData = citiesData[cityName];
        const isLocked = !unlockedCities.includes(cityName);

        // Add section divider before first locked city
        if (isLocked && !dividerAdded) {
            const divider = document.createElement('div');
            divider.className = 'cities-divider';
            divider.innerHTML = `
                <div class="divider-line"></div>
                <div class="divider-text">Cities not yet unlocked</div>
                <div class="divider-line"></div>
            `;
            citiesList.appendChild(divider);
            dividerAdded = true;
        }

        // Count completed contacts in this city
        const completedCount = cityData.contacts.filter(contact =>
            Array.from(completedCharacters).includes(contact.name)
        ).length;
        const totalCount = cityData.contacts.length;

        const cityItem = document.createElement('div');
        cityItem.className = isLocked ? 'city-item locked' : 'city-item';
        cityItem.setAttribute('data-city', cityName);

        // For locked cities, show lock icon; for unlocked, show count
        const metaContent = isLocked
            ? `<div class="city-lock-icon">🔒</div>`
            : `<div class="city-count">${completedCount}/${totalCount}</div>
               <div class="city-chevron">
                   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" width="24" height="24">
                       <path d="M480-344 240-584l56-56 184 184 184-184 56 56-240 240Z"/>
                   </svg>
               </div>`;

        // Check if this is the current/active city (first in list)
        const isCurrentCity = index === 0;

        cityItem.innerHTML = `
            <div class="city-header" onclick="${isLocked ? '' : `toggleCity('${cityName}')`}">
                <div class="city-info">
                    <div class="city-emoji">${cityData.emoji}</div>
                    <div class="city-details">
                        <div class="city-name">${cityName}${isCurrentCity ? '<span class="current-city-dot"></span>' : ''}</div>
                        <div class="city-country">${cityData.country}</div>
                    </div>
                </div>
                <div class="city-meta">
                    ${metaContent}
                </div>
            </div>
            <div class="city-contacts" id="contacts-${cityName}">
                ${!isLocked ? `<button class="travel-to-city-btn" onclick="travelToCity('${cityName}')">Travel to city</button>` : ''}
                ${cityData.contacts.sort((a, b) => a.name.localeCompare(b.name)).map(contact => {
                    const isCompleted = Array.from(completedCharacters).includes(contact.name);
                    // Convert name to URL format (e.g., "Dr. Sarah Williams" -> "Dr.-Sarah-Williams")
                    const characterUrlName = contact.name.replace(/\s+/g, '-');
                    return `
                        <div class="contact-card ${isCompleted ? 'completed' : ''}" onclick="startCharacterMeeting('${characterUrlName}')" style="cursor: pointer;">
                            <div class="contact-portrait">${contact.emoji}</div>
                            <div class="contact-info">
                                <div class="contact-name">${contact.name}</div>
                                <div class="contact-role">${contact.role}</div>
                                <div class="contact-details">${contact.details}</div>
                                <div class="contact-status ${isCompleted ? 'completed' : 'pending'}">
                                    ${isCompleted ? '✓ Have met' : '○ Not Yet Met'}
                                </div>
                            </div>
                            ${isCompleted ? `
                                <div class="contact-plus-icon" onclick="event.stopPropagation(); showInteractionDetails('${contact.name}')">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
                                        <path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z"/>
                                    </svg>
                                </div>
                            ` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        citiesList.appendChild(cityItem);
    });
}

function toggleCity(cityName) {
    const cityItem = document.querySelector(`[data-city="${cityName}"]`);
    const contactsDiv = document.getElementById(`contacts-${cityName}`);

    if (cityItem && contactsDiv) {
        const isOpen = cityItem.classList.contains('open');

        // Close all other cities
        document.querySelectorAll('.city-item').forEach(item => {
            item.classList.remove('open');
        });

        // Toggle this city
        if (!isOpen) {
            cityItem.classList.add('open');
        }
    }
}

function showInteractionDetails(contactName) {
    const details = interactionDetails[contactName];
    if (!details) return;

    // Find the contact's emoji from citiesData
    let contactEmoji = '🎩';
    const citiesData = {
        'London': { contacts: [{ name: "Marcus Chen", emoji: "🎩" }, { name: "Victoria Holmes", emoji: "📚" }, { name: "Amir Khan", emoji: "🎵" }] },
        'New York': { contacts: [{ name: "Dr. Sarah Williams", emoji: "🔬" }, { name: "Michael Torres", emoji: "🏀" }, { name: "Rachel Green", emoji: "👗" }, { name: "David Park", emoji: "💻" }] },
        'Paris': { contacts: [{ name: "James Rodriguez", emoji: "🎭" }, { name: "Camille Dubois", emoji: "🍷" }] },
        'Mumbai': { contacts: [{ name: "Raj Patel", emoji: "🎬" }, { name: "Priya Sharma", emoji: "💃" }, { name: "Arjun Mehta", emoji: "🏢" }, { name: "Kavya Singh", emoji: "📱" }] }
    };

    for (const city in citiesData) {
        const contact = citiesData[city].contacts.find(c => c.name === contactName);
        if (contact) {
            contactEmoji = contact.emoji;
            break;
        }
    }

    const popup = document.getElementById('interactionPopup');
    const iconEl = document.getElementById('interactionIcon');
    const nameEl = document.getElementById('interactionName');
    const bioEl = document.getElementById('interactionBio');
    const jokeTypesEl = document.getElementById('interactionJokeTypes');
    const fundingEl = document.getElementById('interactionFunding');
    const referralEl = document.getElementById('interactionReferral');

    if (iconEl) iconEl.textContent = contactEmoji;
    if (nameEl) nameEl.textContent = contactName;
    if (bioEl) bioEl.textContent = details.bio;

    if (jokeTypesEl) {
        jokeTypesEl.innerHTML = details.jokeTypes.map(type =>
            `<span class="joke-type-tag">${type}</span>`
        ).join('');
    }

    if (fundingEl) {
        fundingEl.textContent = `£${details.funding.toLocaleString()}`;
    }

    if (referralEl) {
        referralEl.textContent = `"${details.referralMessage}"`;
    }

    if (popup) {
        popup.classList.add('show');
    }
}

function closeInteractionPopup() {
    const popup = document.getElementById('interactionPopup');
    if (popup) {
        popup.classList.remove('show');
    }
}

function travelToCity(cityName) {
    // Navigate to the city page
    window.location.href = 'city.html';
}

function startCharacterMeeting(characterUrlName) {
    // Navigate to the character page to start the meeting
    window.location.href = `character.html?name=${characterUrlName}`;
}
