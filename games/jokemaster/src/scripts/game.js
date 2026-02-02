// Game State
const gameState = {
    funding: 0,
    fundingGoal: 50000,
    currentCharacterIndex: 0,
    usedCards: new Set(),
    energy: 5,
    maxEnergy: 5,
    turnsWithCharacter: 0,
    maxTurns: 5,
    discoveredPreferences: new Set(),
    mode: 'overworld',
    playerPosition: { x: 2, y: 2 }, // Center of map
    completedCharacters: new Set(),
    hasStartedWalking: false, // Track if player has moved yet
    tutorialStep: 0, // 0 = not started, 1 = moved once (show Lab), 2 = at Lab, 3+ = tutorial complete
    // New system layers
    laughEnergy: 3,
    maxLaughEnergy: 10,
    recruitedComedians: new Set(),
    maxComedians: 3,
    artifacts: new Set(),
    tileLetters: {} // Store persistent letters for each tile
};

// Character Database
const characters = [
    {
        name: "Dr. Sarah Williams",
        role: "Research Scientist",
        emoji: "🔬",
        position: { x: 1, y: 2 },
        location: "Columbia University Lab",
        locationDesc: "A leading cognitive psychology researcher specializing in the neuroscience of humor and laughter.",
        dialogue: "Welcome, Rain. I study the psychology of humor and laughter. Your comedic techniques are fascinating from a scientific perspective. Let's see if you can make me laugh while I analyze why.",
        favor: 50,
        likes: ["observational", "clever", "self-deprecating"],
        dislikes: ["crude", "controversial"],
        fundingAmount: 3500
    },
    {
        name: "Michael Torres",
        role: "Sports Agent",
        emoji: "🏀",
        position: { x: 3, y: 0 },
        location: "Sports Agency Office",
        locationDesc: "Represents top athletes in basketball and understands high-pressure performance.",
        dialogue: "Rain! I work with athletes who perform under immense pressure. Timing and confidence are everything. Show me you've got both.",
        favor: 50,
        likes: ["ambitious", "observational", "self-deprecating"],
        dislikes: ["wholesome", "political"],
        fundingAmount: 5000
    },
    {
        name: "Rachel Green",
        role: "Fashion Designer",
        emoji: "👗",
        position: { x: 4, y: 3 },
        location: "Fashion Studio",
        locationDesc: "Creative director at a luxury fashion brand in Manhattan's Garment District.",
        dialogue: "Rain, darling. In fashion, presentation is everything. You need to sell your vision with style and confidence. Impress me.",
        favor: 50,
        likes: ["clever", "boastful", "ambitious"],
        dislikes: ["crude", "political"],
        fundingAmount: 4000
    },
    {
        name: "David Park",
        role: "Software Engineer",
        emoji: "💻",
        position: { x: 2, y: 4 },
        location: "Tech Company HQ",
        locationDesc: "Lead developer at a major tech company, building products used by millions.",
        dialogue: "Hey Rain. I spend my days debugging code and solving complex problems. I appreciate clever solutions and good timing. Let's see what you've got.",
        favor: 50,
        likes: ["tech", "clever", "observational"],
        dislikes: ["boastful", "political"],
        fundingAmount: 4500
    }
];

// Map Layout (6x6 grid - all walkable)
const mapLayout = [
    [1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1]
];

const mapEmojis = {
    0: '',
    1: '',
    2: ''
};

// Joke Cards Database
const jokeCards = [
    {
        id: 1,
        type: "Self-Deprecating",
        setup: "I tried to start a world-changing movement once before. Turns out, I couldn't even get my roommate to recycle.",
        tags: ["self-deprecating", "observational"],
        energy: 1,
        strategyHint: "Safe opener. Works well with humble personalities and grassroots organizers.",
        favorImpact: {
            "self-deprecating": 15,
            "observational": 10
        }
    },
    {
        id: 2,
        type: "Tech Humor",
        setup: "My project is like a startup: overpromised, underfunded, and one pivot away from selling artisanal coffee subscriptions.",
        tags: ["tech", "self-deprecating", "ambitious"],
        energy: 2,
        strategyHint: "Resonates with tech entrepreneurs. Shows you understand the startup world.",
        favorImpact: {
            "tech": 15,
            "self-deprecating": 10,
            "ambitious": 5
        }
    },
    {
        id: 3,
        type: "Political",
        setup: "They say change comes from within. I say it comes from filling out the right grant applications and knowing whose calls to return.",
        tags: ["political", "observational"],
        energy: 2,
        strategyHint: "For insiders who understand how the system really works. Can backfire with idealists.",
        favorImpact: {
            "political": 15,
            "observational": 10
        }
    },
    {
        id: 4,
        type: "Wholesome",
        setup: "You know what's harder than changing the world? Convincing my mom I'm doing something practical with my life. But here we are!",
        tags: ["wholesome", "self-deprecating"],
        energy: 1,
        strategyHint: "Humanizing and relatable. Builds trust with community-focused people.",
        favorImpact: {
            "wholesome": 15,
            "self-deprecating": 10
        }
    },
    {
        id: 5,
        type: "Ambitious",
        setup: "Most people see problems. I see opportunities waiting for someone bold enough to grab them. That someone is me.",
        tags: ["boastful", "ambitious"],
        energy: 3,
        strategyHint: "High-risk, high-reward. Impresses VCs and bold thinkers, alienates humble types.",
        favorImpact: {
            "boastful": 15,
            "ambitious": 15
        }
    },
    {
        id: 6,
        type: "Corporate Satire",
        setup: "I've been to enough board meetings to know that 'synergy' is just a fancy word for 'we have no idea what we're doing.'",
        tags: ["corporate", "observational"],
        energy: 2,
        strategyHint: "Mocks corporate culture. Great for non-profits, risky with business leaders.",
        favorImpact: {
            "corporate": -10,
            "observational": 15
        }
    },
    {
        id: 7,
        type: "Observational",
        setup: "Funny how everyone wants to change the world until they find out it involves actual work and not just Instagram posts.",
        tags: ["observational", "political"],
        energy: 1,
        strategyHint: "Calls out performative activism. Appeals to serious changemakers.",
        favorImpact: {
            "observational": 15,
            "political": 5
        }
    },
    {
        id: 8,
        type: "Controversial",
        setup: "The system isn't broken - it's working exactly as designed. Just not for us. Time to redesign it.",
        tags: ["political", "controversial"],
        energy: 3,
        strategyHint: "Bold and polarizing. Can deeply connect or completely alienate.",
        favorImpact: {
            "political": 10,
            "controversial": -5
        }
    }
];

// Comedians Database - Collectible allies with unique comedy styles
const comedians = [
    {
        id: 'robin',
        name: "Robin Quick",
        emoji: "🎤",
        comedyStyle: "improvisation",
        location: "London",
        coordinates: { lat: 51.5074, lng: -0.1278 },
        position: { x: 1, y: 1 },
        description: "A master of spontaneous wit, Robin can turn any awkward moment into comedic gold.",
        passiveBonus: {
            type: "tag_boost",
            tags: ["observational", "self-deprecating"],
            boost: 5
        },
        cost: { laughEnergy: 2 },
        recruited: false
    },
    {
        id: 'maria',
        name: "Maria Santos",
        emoji: "🎭",
        comedyStyle: "storytelling",
        location: "São Paulo",
        coordinates: { lat: -23.5505, lng: -46.6333 },
        position: { x: 3, y: 5 },
        description: "Her narratives weave humor and heart, making audiences feel deeply while they laugh.",
        passiveBonus: {
            type: "tag_boost",
            tags: ["wholesome", "political"],
            boost: 5
        },
        cost: { laughEnergy: 2 },
        recruited: false
    },
    {
        id: 'kai',
        name: "Kai Chen",
        emoji: "💻",
        comedyStyle: "tech-satire",
        location: "Singapore",
        coordinates: { lat: 1.3521, lng: 103.8198 },
        position: { x: 5, y: 3 },
        description: "A tech comedian who perfectly skewers startup culture and digital absurdities.",
        passiveBonus: {
            type: "tag_boost",
            tags: ["tech", "ambitious"],
            boost: 5
        },
        cost: { laughEnergy: 2 },
        recruited: false
    },
    {
        id: 'amara',
        name: "Amara Okafor",
        emoji: "🌟",
        comedyStyle: "bold-provocateur",
        location: "Lagos",
        coordinates: { lat: 6.5244, lng: 3.3792 },
        position: { x: 2, y: 4 },
        description: "Fearless and sharp, Amara tackles controversial topics with intelligence and charm.",
        passiveBonus: {
            type: "tag_boost",
            tags: ["political", "controversial"],
            boost: 5
        },
        cost: { laughEnergy: 2 },
        recruited: false
    },
    {
        id: 'diego',
        name: "Diego Rivera",
        emoji: "😎",
        comedyStyle: "confident-showman",
        location: "Mexico City",
        coordinates: { lat: 19.4326, lng: -99.1332 },
        position: { x: 0, y: 3 },
        description: "A charismatic performer who commands any room with big energy and bold humor.",
        passiveBonus: {
            type: "tag_boost",
            tags: ["boastful", "ambitious"],
            boost: 5
        },
        cost: { laughEnergy: 2 },
        recruited: false
    }
];

// Comedic Artifacts Database - Collectible items with special effects
const artifacts = [
    {
        id: 'fake_mustache',
        name: "Groucho's Disguise",
        emoji: "🥸",
        description: "A classic fake mustache. Makes you 10% more mysterious, 100% more ridiculous.",
        effect: {
            type: "favor_buffer",
            value: 5
        },
        rarity: "common",
        findLocation: "London",
        found: false
    },
    {
        id: 'red_nose',
        name: "Clown's Courage",
        emoji: "🔴",
        description: "A bright red nose that reminds you not to take yourself too seriously.",
        effect: {
            type: "laugh_energy_gain",
            value: 1,
            trigger: "after_joke"
        },
        rarity: "common",
        findLocation: "São Paulo",
        found: false
    },
    {
        id: 'monocle',
        name: "Distinguished Monocle",
        emoji: "🧐",
        description: "Wear this to appear more sophisticated. Works surprisingly well.",
        effect: {
            type: "tag_modifier",
            boostTags: ["corporate", "ambitious"],
            boost: 8
        },
        rarity: "uncommon",
        findLocation: "Singapore",
        found: false
    },
    {
        id: 'jester_hat',
        name: "Court Jester's Cap",
        emoji: "🎪",
        description: "A jingling hat that grants you the fool's privilege to speak truth to power.",
        effect: {
            type: "tag_modifier",
            boostTags: ["political", "controversial"],
            boost: 8
        },
        rarity: "uncommon",
        findLocation: "Lagos",
        found: false
    },
    {
        id: 'comedy_badge',
        name: "Veteran's Comedy Badge",
        emoji: "🏅",
        description: "Proof you've been doing this long enough to know what works.",
        effect: {
            type: "energy_discount",
            value: 1
        },
        rarity: "rare",
        findLocation: "Mexico City",
        found: false
    },
    {
        id: 'lucky_tie',
        name: "The Lucky Tie",
        emoji: "👔",
        description: "A hideous tie that somehow always brings good fortune.",
        effect: {
            type: "reroll_chance",
            chance: 0.2
        },
        rarity: "rare",
        findLocation: "New York",
        found: false
    }
];

// Initialize Game
function initGame() {
    gameState.funding = 0;
    gameState.currentCharacterIndex = 0;
    gameState.usedCards = new Set();
    gameState.energy = gameState.maxEnergy;
    gameState.turnsWithCharacter = 0;
    gameState.discoveredPreferences = new Set();
    gameState.mode = 'overworld';
    gameState.playerPosition = { x: 2, y: 2 }; // Center of map
    gameState.completedCharacters = new Set();
    gameState.hasStartedWalking = false;
    gameState.laughEnergy = 3;
    gameState.recruitedComedians = new Set();
    gameState.artifacts = new Set();
    updateFundingDisplay();
    renderOverworld();
}

// Helper function to get or create persistent letter for a tile
function getLetterForTile(x, y) {
    const tileKey = `${x},${y}`;
    if (!gameState.tileLetters[tileKey]) {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        gameState.tileLetters[tileKey] = letters.charAt(Math.floor(Math.random() * letters.length));
    }
    return gameState.tileLetters[tileKey];
}

// Render Overworld
function renderOverworld() {
    gameState.mode = 'overworld';

    let mapHTML = '';
    for (let y = 0; y < mapLayout.length; y++) {
        for (let x = 0; x < mapLayout[y].length; x++) {
            const tileType = mapLayout[y][x];
            const isPlayer = gameState.playerPosition.x === x && gameState.playerPosition.y === y;

            const characterAtPos = characters.find(c => c.position.x === x && c.position.y === y);
            const isCharacter = characterAtPos !== undefined;
            const isCompleted = isCharacter && gameState.completedCharacters.has(characterAtPos.name);

            let tileClass = 'map-tile';
            let emoji = '';
            let clickHandler = '';

            if (isPlayer) {
                tileClass += ' player';
                emoji = '🚶🏿‍♂️';
            } else if (isCharacter) {
                tileClass += ' character';
                if (isCompleted) tileClass += ' completed';
                // Generate D3 building instead of emoji
                const characterIndex = characters.findIndex(c => c.position.x === x && c.position.y === y);
                if (typeof generateD3Building === 'function') {
                    emoji = generateD3Building(characterAtPos, characterIndex);
                } else {
                    emoji = characterAtPos.emoji; // Fallback to emoji if function not loaded
                }
                clickHandler = `onclick="handleTileClick(${x}, ${y}, true)"`;
            } else if (tileType === 1) {
                tileClass += ' walkable';
                clickHandler = `onclick="handleTileClick(${x}, ${y}, false)"`;
                emoji = getLetterForTile(x, y); // Add persistent letter to walkable tiles
            } else if (tileType === 2) {
                tileClass += ' building';
                emoji = mapEmojis[tileType];
            } else {
                emoji = mapEmojis[tileType];
            }

            mapHTML += `<div class="${tileClass}" ${clickHandler} data-x="${x}" data-y="${y}">${emoji}</div>`;
        }
    }

    const html = `
        <div class="overworld-container">
            <div class="map-title">NEW YORK</div>

            <div class="map-container">
                <div class="compass-rose"></div>
                <div class="map-grid">
                    ${mapHTML}
                    <!-- Callout for Rain -->
                    <div class="callout-template rain-callout ${gameState.hasStartedWalking ? '' : 'visible'}" id="rainCallout" style="${gameState.hasStartedWalking ? 'display: none;' : ''}">
                        <div class="callout-arrow arrow-bottom pos-center"></div>
                        <div class="callout-content">
                            Tap a dot space to move Rain on the map.
                        </div>
                    </div>

                    <!-- Location callout (hidden by default) -->
                    <div class="callout-template location-callout" id="locationCallout" style="display: none;">
                        <div class="callout-arrow" id="locationCalloutArrow"></div>
                        <div class="callout-content" id="locationCalloutContent"></div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('conversationArea').innerHTML = html;

    // Render D3 buildings and initialize UI elements after DOM is ready
    requestAnimationFrame(() => {
        // Render D3 buildings for all characters
        if (typeof renderD3Building === 'function') {
            characters.forEach((character, characterIndex) => {
                // Character-specific building type mapping
                let buildingType;
                if (character.name === "Michael Torres") {
                    buildingType = 2; // Theater building (red, 60 height)
                } else if (character.name === "Rachel Green") {
                    buildingType = 1; // Office building (tan, 100 height)
                } else {
                    buildingType = characterIndex % 4; // Default for others
                }

                const buildingId = `building-${character.name.replace(/[^a-zA-Z0-9]+/g, '-')}`;
                const svgElement = document.getElementById(buildingId);
                if (svgElement) {
                    renderD3Building(buildingId, buildingType);
                }
            });
        }

        // Position callout and add event listeners
        requestAnimationFrame(() => {
            positionRainCallout();
            addCharacterCalloutListeners();
        });
    });

    // Initialize Material Design icons after rendering
    if (typeof initMaterialIcons === 'function') {
        initMaterialIcons();
    }
}

// Detect if we're on mobile
function isMobileView() {
    return window.innerWidth <= 430;
}

// Get callout dimensions based on viewport
function getCalloutDimensions(isRainCallout = false) {
    if (isMobileView()) {
        return {
            width: 180, // Same width for both callout types on mobile
            height: isRainCallout ? 70 : 90 // Increased for two-line content
        };
    }
    return {
        width: isRainCallout ? 240 : 200,
        height: isRainCallout ? 90 : 100 // Increased for two-line content
    };
}

// Position callout with smart edge detection
// Returns the best position and arrow configuration with pixel-accurate arrow placement
function calculateCalloutPosition(targetRect, gridRect, calloutWidth, calloutHeight) {
    const isMobile = isMobileView();
    const CALLOUT_PADDING = isMobile ? 5 : 10;
    const ARROW_SIZE = isMobile ? 8 : 10;
    const ARROW_MIN_EDGE = isMobile ? 15 : 20; // Min distance from callout edge

    // Calculate target center relative to grid
    const targetCenterX = targetRect.left - gridRect.left + (targetRect.width / 2);
    const targetTop = targetRect.top - gridRect.top;
    const targetBottom = targetRect.bottom - gridRect.top;

    // Default: position above the target, centered
    let calloutLeft = targetCenterX - (calloutWidth / 2);
    let calloutTop = targetTop - calloutHeight - ARROW_SIZE;
    let arrowDirection = 'arrow-bottom';

    // Check if callout would go above the grid (position below instead)
    if (calloutTop < CALLOUT_PADDING) {
        calloutTop = targetBottom + ARROW_SIZE;
        arrowDirection = 'arrow-top';
    }

    // Clamp callout to grid bounds
    if (calloutLeft < CALLOUT_PADDING) {
        calloutLeft = CALLOUT_PADDING;
    }
    const rightEdge = calloutLeft + calloutWidth;
    if (rightEdge > gridRect.width - CALLOUT_PADDING) {
        calloutLeft = gridRect.width - calloutWidth - CALLOUT_PADDING;
    }

    // Calculate exact arrow position (in pixels from left edge of callout)
    // Arrow should point at target center
    let arrowLeftPx = targetCenterX - calloutLeft;

    // Clamp arrow position to stay within callout bounds (with padding from edges)
    arrowLeftPx = Math.max(ARROW_MIN_EDGE, Math.min(calloutWidth - ARROW_MIN_EDGE, arrowLeftPx));

    return {
        left: calloutLeft,
        top: calloutTop,
        arrowDirection,
        arrowLeftPx // Pixel position for arrow
    };
}

// Position Rain callout above player
function positionRainCallout() {
    const rainCallout = document.getElementById('rainCallout');
    if (!rainCallout) return;

    const playerTile = document.querySelector('.map-tile.player');
    if (!playerTile) return;

    const mapGrid = document.querySelector('.map-grid');
    if (!mapGrid) return;

    const playerRect = playerTile.getBoundingClientRect();
    const gridRect = mapGrid.getBoundingClientRect();

    // Get callout dimensions based on viewport
    const dims = getCalloutDimensions(true); // true = rain callout
    const calloutWidth = dims.width;
    const calloutHeight = rainCallout.offsetHeight || dims.height;

    const position = calculateCalloutPosition(playerRect, gridRect, calloutWidth, calloutHeight);

    rainCallout.style.left = `${position.left}px`;
    rainCallout.style.top = `${position.top}px`;

    // Update arrow with pixel-accurate positioning
    const arrow = rainCallout.querySelector('.callout-arrow');
    if (arrow) {
        arrow.className = `callout-arrow ${position.arrowDirection}`;
        arrow.style.left = `${position.arrowLeftPx}px`;
        arrow.style.transform = 'translateX(-50%)';
    }
}

// Add event listeners for character callouts
function addCharacterCalloutListeners() {
    const characterTiles = document.querySelectorAll('.map-tile.character');
    const locationCallout = document.getElementById('locationCallout');
    const locationCalloutContent = document.getElementById('locationCalloutContent');
    const locationCalloutArrow = document.getElementById('locationCalloutArrow');

    let hideTimeout = null;

    characterTiles.forEach(tile => {
        const x = parseInt(tile.getAttribute('data-x'));
        const y = parseInt(tile.getAttribute('data-y'));
        const character = characters.find(c => c.position.x === x && c.position.y === y);

        if (!character) return;

        const isCompleted = gameState.completedCharacters.has(character.name);

        // Show callout on hover/tap
        const showCallout = (e) => {
            // Don't show callouts until Rain starts walking
            if (!gameState.hasStartedWalking) return;

            // During tutorial step 1, only allow Lab callout
            if (gameState.tutorialStep === 1) {
                const isLabCharacter = character.location.includes('Lab');
                if (!isLabCharacter) return;
            }

            // Clear any pending hide timeout
            if (hideTimeout) {
                clearTimeout(hideTimeout);
                hideTimeout = null;
            }

            e.stopPropagation();
            const mapGrid = document.querySelector('.map-grid');
            if (!mapGrid) return;

            const tileRect = tile.getBoundingClientRect();
            const gridRect = mapGrid.getBoundingClientRect();

            locationCalloutContent.innerHTML = `
                <div class="location-name">${character.emoji} ${character.location}</div>
                <div class="location-description">Meet ${character.name}, ${character.role}</div>
                ${isCompleted ? '<div style="color: #4CAF50; margin-top: 8px; font-size: 12px; font-style: italic;">✓ Conversation completed</div>' : ''}
            `;

            // Show callout off-screen first to measure actual height
            locationCallout.style.visibility = 'hidden';
            locationCallout.style.display = 'block';
            locationCallout.style.left = '0px';
            locationCallout.style.top = '0px';

            // Force reflow to get actual dimensions
            const dims = getCalloutDimensions(false);
            const calloutWidth = dims.width;
            const calloutHeight = locationCallout.offsetHeight || dims.height;

            // Now calculate proper position with actual height
            const position = calculateCalloutPosition(tileRect, gridRect, calloutWidth, calloutHeight);

            locationCallout.style.left = `${position.left}px`;
            locationCallout.style.top = `${position.top}px`;
            locationCallout.style.visibility = 'visible';

            // Update arrow with pixel-accurate positioning
            if (locationCalloutArrow) {
                locationCalloutArrow.className = `callout-arrow ${position.arrowDirection}`;
                locationCalloutArrow.style.left = `${position.arrowLeftPx}px`;
                locationCalloutArrow.style.transform = 'translateX(-50%)';
            }

            locationCallout.classList.add('visible');
        };

        // Hide callout with delay
        const hideCallout = () => {
            // Don't hide during tutorial step 1 for the Lab
            if (gameState.tutorialStep === 1 && character.location.includes('Lab')) {
                return;
            }
            hideTimeout = setTimeout(() => {
                locationCallout.classList.remove('visible');
                setTimeout(() => {
                    if (!locationCallout.classList.contains('visible')) {
                        locationCallout.style.display = 'none';
                    }
                }, 300);
            }, 100);
        };

        tile.addEventListener('mouseenter', showCallout);
        tile.addEventListener('mouseleave', hideCallout);
        tile.addEventListener('touchstart', showCallout);
    });

    // Keep callout visible when hovering over it
    locationCallout.addEventListener('mouseenter', () => {
        if (hideTimeout) {
            clearTimeout(hideTimeout);
            hideTimeout = null;
        }
    });

    locationCallout.addEventListener('mouseleave', () => {
        // Don't hide during tutorial step 1
        if (gameState.tutorialStep === 1) return;

        hideTimeout = setTimeout(() => {
            locationCallout.classList.remove('visible');
            setTimeout(() => {
                if (!locationCallout.classList.contains('visible')) {
                    locationCallout.style.display = 'none';
                }
            }, 300);
        }, 100);
    });

    // Click on callout - during tutorial, navigate to Lab
    locationCallout.addEventListener('click', () => {
        // During tutorial step 1, clicking the Lab callout should navigate there
        if (gameState.tutorialStep === 1) {
            const labCharacter = characters.find(c => c.location.includes('Lab'));
            if (labCharacter) {
                handleTileClick(labCharacter.position.x, labCharacter.position.y, true);
            }
            return;
        }

        if (hideTimeout) {
            clearTimeout(hideTimeout);
            hideTimeout = null;
        }
        locationCallout.classList.remove('visible');
        setTimeout(() => {
            locationCallout.style.display = 'none';
        }, 300);
    });
}

// Handle Tile Click - pathfinding and animated movement
function handleTileClick(targetX, targetY, isCharacter) {
    // If clicking a character, try to approach it
    if (isCharacter) {
        const character = characters.find(c => c.position.x === targetX && c.position.y === targetY);
        if (!character) return;

        // During tutorial step 1, only allow approaching the Lab
        if (gameState.tutorialStep === 1) {
            const isLabCharacter = character.location.includes('Lab');
            if (!isLabCharacter) return;
        }

        const dx = Math.abs(gameState.playerPosition.x - targetX);
        const dy = Math.abs(gameState.playerPosition.y - targetY);

        // If already adjacent, start conversation
        if (dx <= 1 && dy <= 1) {
            approachCharacter(targetX, targetY);
            return;
        }

        // Otherwise, try to move next to the character
        const path = findPath(gameState.playerPosition.x, gameState.playerPosition.y, targetX, targetY, true);
        if (path && path.length > 0) {
            animateMovement(path);
        }
        return;
    }

    // For walkable tiles, find path and move
    const path = findPath(gameState.playerPosition.x, gameState.playerPosition.y, targetX, targetY, false);
    if (path && path.length > 0) {
        animateMovement(path);
    }
}

// Simple pathfinding (A* algorithm)
function findPath(startX, startY, endX, endY, stopBeforeEnd) {
    const openSet = [{x: startX, y: startY, g: 0, h: 0, f: 0, parent: null}];
    const closedSet = new Set();

    while (openSet.length > 0) {
        // Find node with lowest f score
        openSet.sort((a, b) => a.f - b.f);
        const current = openSet.shift();

        const key = `${current.x},${current.y}`;
        closedSet.add(key);

        // Check if we reached the goal (or one tile before if character)
        const reachedGoal = stopBeforeEnd ?
            (Math.abs(current.x - endX) <= 1 && Math.abs(current.y - endY) <= 1) :
            (current.x === endX && current.y === endY);

        if (reachedGoal) {
            // Reconstruct path
            const path = [];
            let node = current;
            while (node.parent) {
                path.unshift({x: node.x, y: node.y});
                node = node.parent;
            }
            return path;
        }

        // Check neighbors
        const neighbors = [
            {x: current.x + 1, y: current.y},
            {x: current.x - 1, y: current.y},
            {x: current.x, y: current.y + 1},
            {x: current.x, y: current.y - 1}
        ];

        for (const neighbor of neighbors) {
            // Check bounds
            if (neighbor.x < 0 || neighbor.x >= mapLayout[0].length ||
                neighbor.y < 0 || neighbor.y >= mapLayout.length) {
                continue;
            }

            const neighborKey = `${neighbor.x},${neighbor.y}`;
            if (closedSet.has(neighborKey)) continue;

            // Check if walkable
            const tileType = mapLayout[neighbor.y][neighbor.x];
            if (tileType !== 1) continue;

            // Check for characters (unless it's the end goal)
            const characterAtPos = characters.find(c => c.position.x === neighbor.x && c.position.y === neighbor.y);
            if (characterAtPos && !(neighbor.x === endX && neighbor.y === endY)) continue;

            const g = current.g + 1;
            const h = Math.abs(neighbor.x - endX) + Math.abs(neighbor.y - endY);
            const f = g + h;

            const existing = openSet.find(n => n.x === neighbor.x && n.y === neighbor.y);
            if (!existing || g < existing.g) {
                if (existing) {
                    existing.g = g;
                    existing.f = f;
                    existing.parent = current;
                } else {
                    openSet.push({...neighbor, g, h, f, parent: current});
                }
            }
        }
    }

    return null; // No path found
}

// Animate movement along path with smooth gliding
function animateMovement(path) {
    if (path.length === 0) return;

    // Hide Rain callout when starting to walk
    if (!gameState.hasStartedWalking) {
        gameState.hasStartedWalking = true;
        const rainCallout = document.getElementById('rainCallout');
        if (rainCallout && rainCallout.classList.contains('visible')) {
            rainCallout.classList.remove('visible');
            setTimeout(() => {
                rainCallout.style.display = 'none';
            }, 500);
        }
    }

    let index = 0;
    const moveInterval = setInterval(() => {
        if (index >= path.length) {
            clearInterval(moveInterval);

            // After first move completes, trigger tutorial step 1 (show Lab callout)
            if (gameState.tutorialStep === 0) {
                gameState.tutorialStep = 1;
                showTutorialLabCallout();
            } else if (gameState.tutorialStep === 1) {
                // Keep Lab callout visible and updated during tutorial
                showTutorialLabCallout();
            }
            return;
        }

        gameState.playerPosition.x = path[index].x;
        gameState.playerPosition.y = path[index].y;
        renderOverworld();

        index++;
    }, 500); // Move every 500ms - slower so you can see the movement
}

// Show the Lab callout during tutorial
function showTutorialLabCallout() {
    // Find Dr. Sarah Williams (the Lab character)
    const labCharacter = characters.find(c => c.location.includes('Lab'));
    if (!labCharacter) return;

    const labTile = document.querySelector(`.map-tile.character[data-x="${labCharacter.position.x}"][data-y="${labCharacter.position.y}"]`);
    if (!labTile) return;

    const locationCallout = document.getElementById('locationCallout');
    const locationCalloutContent = document.getElementById('locationCalloutContent');
    const locationCalloutArrow = document.getElementById('locationCalloutArrow');
    const mapGrid = document.querySelector('.map-grid');

    if (!locationCallout || !locationCalloutContent || !mapGrid) return;

    const tileRect = labTile.getBoundingClientRect();
    const gridRect = mapGrid.getBoundingClientRect();

    // Show tutorial-specific content
    locationCalloutContent.innerHTML = `
        <div class="location-name">${labCharacter.emoji} ${labCharacter.location}</div>
        <div class="location-description">Bring Rain here to meet ${labCharacter.name}!</div>
    `;

    // Show callout off-screen first to measure actual height
    locationCallout.style.visibility = 'hidden';
    locationCallout.style.display = 'block';
    locationCallout.style.left = '0px';
    locationCallout.style.top = '0px';

    // Force reflow to get actual dimensions
    const dims = getCalloutDimensions(false);
    const calloutWidth = dims.width;
    const calloutHeight = locationCallout.offsetHeight || dims.height;

    // Calculate position
    const position = calculateCalloutPosition(tileRect, gridRect, calloutWidth, calloutHeight);

    locationCallout.style.left = `${position.left}px`;
    locationCallout.style.top = `${position.top}px`;
    locationCallout.style.visibility = 'visible';

    // Update arrow
    if (locationCalloutArrow) {
        locationCalloutArrow.className = `callout-arrow ${position.arrowDirection}`;
        locationCalloutArrow.style.left = `${position.arrowLeftPx}px`;
        locationCalloutArrow.style.transform = 'translateX(-50%)';
    }

    // Add tutorial highlight class
    locationCallout.classList.add('visible', 'tutorial-highlight');

    // Add pulsing effect to the Lab building
    labTile.classList.add('tutorial-target');
}

// Move Player
function movePlayer(dx, dy) {
    const newX = gameState.playerPosition.x + dx;
    const newY = gameState.playerPosition.y + dy;

    if (newX < 0 || newX >= mapLayout[0].length || newY < 0 || newY >= mapLayout.length) {
        return;
    }

    const tileType = mapLayout[newY][newX];
    if (tileType !== 1) {
        return;
    }

    const characterAtPos = characters.find(c => c.position.x === newX && c.position.y === newY);
    if (characterAtPos) {
        return;
    }

    gameState.playerPosition.x = newX;
    gameState.playerPosition.y = newY;

    renderOverworld();
}

// Exit Conversation
function exitConversation() {
    // Reset conversation state
    gameState.energy = gameState.maxEnergy;
    gameState.turnsWithCharacter = 0;
    gameState.discoveredPreferences = new Set();
    gameState.usedCards.clear();
    gameState.mode = 'overworld';

    // Clear saved conversation state
    localStorage.removeItem('gameState');

    // Check if we're on the character page (separate page) or city page (same page)
    if (window.location.pathname.includes('character.html')) {
        // Navigate back to city page
        window.location.href = 'city.html';
    } else {
        // Legacy behavior - fade out conversation, then fade in overworld
        const conversationArea = document.getElementById('conversationArea');
        conversationArea.style.opacity = '0';
        conversationArea.style.transition = 'opacity 0.5s ease';

        setTimeout(() => {
            // Remove in-conversation class from body
            document.body.classList.remove('in-conversation');

            // Show the static footer again
            const actionIcons = document.querySelector('.action-icons');
            if (actionIcons) {
                actionIcons.style.display = 'flex';
            }

            // Return to overworld
            renderOverworld();

            // Fade in
            setTimeout(() => {
                conversationArea.style.opacity = '1';
            }, 50);
        }, 500);
    }
}

// Approach Character
function approachCharacter(x, y) {
    const character = characters.find(c => c.position.x === x && c.position.y === y);
    if (!character) return;

    const dx = Math.abs(gameState.playerPosition.x - x);
    const dy = Math.abs(gameState.playerPosition.y - y);

    if (dx <= 1 && dy <= 1) {
        // If in tutorial step 1 and reaching the Lab, advance tutorial
        if (gameState.tutorialStep === 1 && character.location.includes('Lab')) {
            gameState.tutorialStep = 2;
            // Remove tutorial highlight classes
            const locationCallout = document.getElementById('locationCallout');
            if (locationCallout) {
                locationCallout.classList.remove('tutorial-highlight');
            }
            const labTile = document.querySelector('.map-tile.character.tutorial-target');
            if (labTile) {
                labTile.classList.remove('tutorial-target');
            }
        }

        // Navigate to character page
        const characterUrlName = character.name.replace(/\s+/g, '-');
        window.location.href = `character.html?name=${characterUrlName}`;
    }
}

// Load Current Character
function loadCharacter(characterName = null) {
    let character;

    // If character name is provided (from URL), find by name
    if (characterName) {
        character = characters.find(c => c.name === characterName);
        if (character) {
            gameState.currentCharacterIndex = characters.indexOf(character);
        } else {
            console.error('Character not found:', characterName);
            window.location.href = 'city.html';
            return;
        }
    } else {
        // Load by current index (legacy behavior)
        if (gameState.currentCharacterIndex >= characters.length) {
            endGame(true);
            return;
        }
        character = characters[gameState.currentCharacterIndex];
    }

    // Set up conversation mode
    gameState.mode = 'conversation';
    gameState.energy = gameState.maxEnergy;
    gameState.turnsWithCharacter = 0;
    gameState.discoveredPreferences = new Set();
    gameState.usedCards.clear();

    const preferencesHTML = gameState.discoveredPreferences.size > 0 ? `
        <div class="character-preferences revealed">
            <div class="preference-title">Discovered Preferences</div>
            <div class="preference-tags">
                ${Array.from(gameState.discoveredPreferences).map(pref => {
                    const isLiked = character.likes.includes(pref);
                    return `<span class="preference-tag ${isLiked ? 'likes' : 'dislikes'}">${isLiked ? '👍' : '👎'} ${pref}</span>`;
                }).join('')}
            </div>
        </div>
    ` : '';

    const characterImage = character.name.replace(/\s+/g, '-');
    const cacheBuster = Date.now();

    const html = `
        <div class="conversation-top">
            <div class="character-portrait-frame">
                <img src="../../assets/images/characters/${characterImage}.png?v=${cacheBuster}" alt="${character.name}" class="character-portrait-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="character-portrait-fallback" style="display:none;">${character.emoji}</div>
            </div>
            <div class="dialogue-container">
                <div class="character-header">
                    <span class="character-name">${character.name}</span>
                    <span class="character-role-dot">•</span>
                    <span class="character-role">${character.role}</span>
                </div>
                <div class="dialogue-box">
                    <button class="close-dialogue-btn" onclick="exitConversation()">✕</button>
                    <div class="dialogue-text" id="dialogueText" data-full-text="${character.dialogue}"></div>
                    <div class="favor-meter">
                        <span class="favor-label">FAVOR</span>
                        <div class="favor-bar">
                            <div class="favor-fill" id="favorFill" style="width: 0%"></div>
                        </div>
                    </div>
                </div>
                ${preferencesHTML}
            </div>
        </div>
        <div class="ornamental-divider"></div>
        <div class="cards-area">
            <div class="energy-display">
                <span class="energy-icon">⚡</span>
                <span>Energy: <span class="energy-amount" id="energyAmount">${gameState.energy}/${gameState.maxEnergy}</span></span>
                <span style="color: var(--faded-ink);">|</span>
                <span style="color: var(--faded-ink);">Turn ${gameState.turnsWithCharacter + 1}/${gameState.maxTurns}</span>
            </div>
            <div class="cards-title">What will you say?</div>
            <div class="cards-hand" id="cardsHand">
                ${renderCards()}
            </div>
            <div class="card-pagination" id="cardPagination"></div>
            <button class="exit-conversation-btn" onclick="exitConversation()">🚪 Just say goodbye</button>
        </div>
    `;

    // Fade out current content, then fade in conversation
    const conversationArea = document.getElementById('conversationArea');
    conversationArea.style.opacity = '0';
    conversationArea.style.transition = 'opacity 0.5s ease';

    setTimeout(() => {
        conversationArea.innerHTML = html;

        // Add in-conversation class to body for proper styling
        document.body.classList.add('in-conversation');

        // Hide the static footer during conversations
        const actionIcons = document.querySelector('.action-icons');
        if (actionIcons) {
            actionIcons.style.display = 'none';
        }

        // Fade in
        setTimeout(() => {
            conversationArea.style.opacity = '1';
        }, 50);

        attachCardListeners();
        renderPaginationDots();
        typeDialogue();
    }, 500);
}

// Typing animation for dialogue text
function typeDialogue() {
    const dialogueElement = document.getElementById('dialogueText');
    if (!dialogueElement) return;

    const fullText = dialogueElement.getAttribute('data-full-text');
    let currentIndex = 0;
    const typingSpeed = 30; // milliseconds per character

    dialogueElement.textContent = '';

    function typeNextChar() {
        if (currentIndex < fullText.length) {
            dialogueElement.textContent += fullText.charAt(currentIndex);
            currentIndex++;
            setTimeout(typeNextChar, typingSpeed);
        } else {
            // Typing complete - zoom in the cards area
            const cardsArea = document.querySelector('.cards-area');
            if (cardsArea) {
                cardsArea.classList.add('zoom-in');
            }
        }
    }

    typeNextChar();
}

// Card gallery state
let currentCardIndex = 0;
let availableHandCards = [];

// Render Cards - Single card gallery view
function renderCards() {
    const availableCards = jokeCards.filter(card => !gameState.usedCards.has(card.id));
    const shuffled = availableCards.sort(() => Math.random() - 0.5);
    availableHandCards = shuffled.slice(0, 4);

    // Start from middle position for infinite scroll
    currentCardIndex = availableHandCards.length;

    return renderCardGallery();
}

// Render single card in gallery with infinite scrolling
function renderCardGallery() {
    if (availableHandCards.length === 0) {
        return '<div class="no-cards">No cards available</div>';
    }

    // Create infinite loop by duplicating cards (prev + current + next)
    const extendedCards = [
        ...availableHandCards,
        ...availableHandCards,
        ...availableHandCards
    ];

    const cardsHTML = extendedCards.map((card, index) => {
        const canAfford = gameState.energy >= card.energy;
        // Calculate the card number in the original hand (1-4)
        const cardNumber = (index % availableHandCards.length) + 1;
        return `
            <div class="card-container">
                <div class="joke-card ${!canAfford ? 'disabled' : ''}">
                    <div class="card-number">${cardNumber}</div>
                    <div class="card-bookmark">🔖</div>
                    <div class="card-setup">${card.setup}</div>
                    <div class="card-tags">
                        ${card.tags.map(tag => `<span class="card-tag">${tag}</span>`).join('')}
                    </div>
                    <button class="card-play-btn" onclick="playCard(${card.id})" ${!canAfford ? 'disabled' : ''}>
                        Play Joke
                    </button>
                </div>
            </div>
        `;
    }).join('');

    return `
        <button class="card-nav-arrow left" onclick="navigateCard(-1)">◀</button>
        <div class="cards-gallery-wrapper" id="cardsGalleryWrapper">
            ${cardsHTML}
        </div>
        <button class="card-nav-arrow right" onclick="navigateCard(1)">▶</button>
    `;
}

// Render pagination dots
function renderPaginationDots() {
    const pagination = document.getElementById('cardPagination');
    if (!pagination || availableHandCards.length === 0) return;

    const actualIndex = currentCardIndex % availableHandCards.length;
    const dotsHTML = availableHandCards.map((_, index) => {
        const activeClass = index === actualIndex ? 'active' : '';
        return `<div class="pagination-dot ${activeClass}" onclick="goToCard(${index})"></div>`;
    }).join('');

    pagination.innerHTML = dotsHTML;
}

// Go to specific card
function goToCard(index) {
    currentCardIndex = availableHandCards.length + index;
    updateGalleryPosition(false);
}

// Navigate between cards (infinite loop)
function navigateCard(direction) {
    currentCardIndex += direction;
    updateGalleryPosition(true);
}

// Update gallery scroll position with infinite loop
function updateGalleryPosition(withTransition = true) {
    const wrapper = document.getElementById('cardsGalleryWrapper');
    if (!wrapper) return;

    const totalCards = availableHandCards.length;

    // Normalize currentCardIndex to stay within reasonable bounds
    // Keep it between 0 and totalCards * 3 for the triple-buffer
    while (currentCardIndex < 0) {
        currentCardIndex += totalCards;
    }
    while (currentCardIndex >= totalCards * 3) {
        currentCardIndex -= totalCards;
    }

    // Calculate display position in the triple-buffer
    const offset = -currentCardIndex * 100;

    if (withTransition) {
        wrapper.style.transition = 'transform 0.3s ease-in-out';
    } else {
        wrapper.style.transition = 'none';
    }

    wrapper.style.transform = `translateX(${offset}%)`;

    // Reset position to middle buffer when at boundaries (for seamless infinite loop)
    if (withTransition) {
        setTimeout(() => {
            // If we're in the first buffer (0 to totalCards-1), jump to middle buffer
            if (currentCardIndex < totalCards) {
                wrapper.style.transition = 'none';
                currentCardIndex += totalCards;
                const newOffset = -currentCardIndex * 100;
                wrapper.style.transform = `translateX(${newOffset}%)`;
            }
            // If we're in the last buffer (totalCards*2 to totalCards*3-1), jump to middle buffer
            else if (currentCardIndex >= totalCards * 2) {
                wrapper.style.transition = 'none';
                currentCardIndex -= totalCards;
                const newOffset = -currentCardIndex * 100;
                wrapper.style.transform = `translateX(${newOffset}%)`;
            }
        }, 300);
    }

    // Update pagination dots
    renderPaginationDots();
}

// Attach Card Click Listeners - Drag and swipe functionality with infinite loop
function attachCardListeners() {
    const cardsHand = document.getElementById('cardsHand');
    const wrapper = document.getElementById('cardsGalleryWrapper');
    if (!cardsHand || !wrapper) return;

    let isDragging = false;
    let startX = 0;
    let currentTranslate = 0;
    let previousTranslate = 0;
    let animationID = null;
    let dragStartIndex = 0;

    // Get current offset based on card index
    function getCurrentOffset() {
        const totalCards = availableHandCards.length;
        const displayIndex = totalCards + (currentCardIndex % totalCards);
        return -displayIndex * 100;
    }

    // Touch events
    cardsHand.addEventListener('touchstart', touchStart);
    cardsHand.addEventListener('touchmove', touchMove);
    cardsHand.addEventListener('touchend', touchEnd);

    // Mouse events
    cardsHand.addEventListener('mousedown', touchStart);
    cardsHand.addEventListener('mousemove', touchMove);
    cardsHand.addEventListener('mouseup', touchEnd);
    cardsHand.addEventListener('mouseleave', touchEnd);

    function touchStart(e) {
        // Don't interfere with buttons
        if (e.target.closest('.card-play-btn') || e.target.closest('.card-nav-arrow')) {
            return;
        }

        isDragging = true;
        startX = getPositionX(e);
        dragStartIndex = currentCardIndex;
        previousTranslate = getCurrentOffset();
        wrapper.style.transition = 'none';

        animationID = requestAnimationFrame(animation);
        cardsHand.style.cursor = 'grabbing';
    }

    function touchMove(e) {
        if (!isDragging) return;

        const currentPosition = getPositionX(e);
        const movedBy = ((currentPosition - startX) / cardsHand.offsetWidth) * 100;
        currentTranslate = previousTranslate + movedBy;
    }

    function touchEnd() {
        if (!isDragging) return;

        isDragging = false;
        cancelAnimationFrame(animationID);
        cardsHand.style.cursor = 'grab';

        const movedBy = currentTranslate - previousTranslate;

        // Determine how many cards to advance based on drag distance
        // Moved left (negative) = next card, Moved right (positive) = previous card
        if (movedBy < -20) {
            // Dragged left - go to next card
            const cardsToAdvance = Math.round(-movedBy / 100) || 1;
            currentCardIndex += cardsToAdvance;
            updateGalleryPosition(true);
        } else if (movedBy > 20) {
            // Dragged right - go to previous card
            const cardsToRetreat = Math.round(movedBy / 100) || 1;
            currentCardIndex -= cardsToRetreat;
            updateGalleryPosition(true);
        } else {
            // Snap back to current card
            wrapper.style.transition = 'transform 0.3s ease-in-out';
            updateGalleryPosition(false);
        }
    }

    function getPositionX(e) {
        return e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    }

    function animation() {
        if (isDragging) {
            wrapper.style.transform = `translateX(${currentTranslate}%)`;
            animationID = requestAnimationFrame(animation);
        }
    }

    // Prevent context menu on long press
    cardsHand.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });
}

// Play a Card
async function playCard(cardId) {
    const card = jokeCards.find(c => c.id === cardId);
    const character = characters[gameState.currentCharacterIndex];

    gameState.energy -= card.energy;
    gameState.turnsWithCharacter++;

    gameState.usedCards.add(cardId);

    let favorChange = 0;
    let matchedPreferences = [];
    let conflictedPreferences = [];

    card.tags.forEach(tag => {
        if (character.likes.includes(tag)) {
            favorChange += (card.favorImpact[tag] || 10);
            matchedPreferences.push(tag);
            gameState.discoveredPreferences.add(tag);
        }
        if (character.dislikes.includes(tag)) {
            favorChange -= 15;
            conflictedPreferences.push(tag);
            gameState.discoveredPreferences.add(tag);
        }
    });

    character.favor = Math.max(0, Math.min(100, character.favor + favorChange));

    const energyDisplay = document.getElementById('energyAmount');
    if (energyDisplay) {
        energyDisplay.textContent = `${gameState.energy}/${gameState.maxEnergy}`;
    }

    // Update header to show jokes collected
    updateFundingDisplay();

    // Save to Firestore
    await saveGameToFirestore();

    showReaction(card, character, favorChange, matchedPreferences, conflictedPreferences);
}

// Show Reaction
function showReaction(card, character, favorChange, matched, conflicted) {
    let emoji, reactionText, impactClass, laughEnergyGain = 0;

    // Gain laugh energy when jokes land well
    if (favorChange > 10) {
        emoji = "😄";
        reactionText = `${character.name} laughs and leans forward. You're connecting.`;
        impactClass = "positive";
        laughEnergyGain = 2;
    } else if (favorChange > 0) {
        emoji = "🙂";
        reactionText = `${character.name} nods with a slight smile. You're on the right track.`;
        impactClass = "positive";
        laughEnergyGain = 1;
    } else if (favorChange < -10) {
        emoji = "😠";
        reactionText = `${character.name} shifts uncomfortably. That didn't land well.`;
        impactClass = "negative";
    } else {
        emoji = "😐";
        reactionText = `${character.name} maintains a polite but distant expression.`;
        impactClass = "negative";
    }

    // Add laugh energy (capped at max)
    if (laughEnergyGain > 0) {
        gameState.laughEnergy = Math.min(gameState.maxLaughEnergy, gameState.laughEnergy + laughEnergyGain);
        updateFundingDisplay();
    }

    const laughEnergyDisplay = laughEnergyGain > 0 ? `<div class="laugh-energy-gain">+${laughEnergyGain} Laugh Energy 😂</div>` : '';

    const overlay = document.createElement('div');
    overlay.className = 'reaction-overlay';
    overlay.innerHTML = `
        <div class="reaction-box">
            <div class="reaction-emoji">${emoji}</div>
            <div class="reaction-text">${reactionText}</div>
            <div class="reaction-impact ${impactClass}">Favor ${favorChange > 0 ? '+' : ''}${favorChange}%</div>
            ${laughEnergyDisplay}
            <button class="continue-btn" onclick="continueGame()">Continue</button>
        </div>
    `;
    document.body.appendChild(overlay);

    updateFavorDisplay(character.favor);
}

// Continue Game
function continueGame() {
    document.querySelector('.reaction-overlay')?.remove();

    const character = characters[gameState.currentCharacterIndex];

    if (character.favor >= 70) {
        gameState.funding += character.fundingAmount;
        updateFundingDisplay();

        showSuccessOverlay(character);
    }
    else if (character.favor <= 20) {
        showFailureOverlay(character);
    }
    else if (gameState.energy <= 0 || gameState.turnsWithCharacter >= gameState.maxTurns) {
        showTimeUpOverlay(character);
    }
    else {
        // Refresh the card gallery with new cards
        const cardsHand = document.getElementById('cardsHand');
        if (cardsHand) {
            cardsHand.innerHTML = renderCards();
            attachCardListeners();
            renderPaginationDots();
        }

        // Update favor display
        updateFavorDisplay(character.favor);
    }
}

// Show Time Up Overlay
function showTimeUpOverlay(character) {
    const partial = character.favor >= 50;
    const emoji = partial ? "⏰" : "😔";
    const result = partial ? "Partial Success" : "Time's Up";
    const message = partial ?
        `"Look, we're out of time. You made an impression, I'll give you that. I can contribute something, but it's not what you were hoping for."` :
        `"I appreciate your effort, Rain, but I'm not convinced this is the right fit. I'll have to pass."`;

    const funding = partial ? Math.floor(character.fundingAmount * 0.4) : 0;

    if (funding > 0) {
        gameState.funding += funding;
        updateFundingDisplay();
    }

    const overlay = document.createElement('div');
    overlay.className = 'reaction-overlay';
    overlay.innerHTML = `
        <div class="reaction-box">
            <div class="reaction-emoji">${emoji}</div>
            <div class="reaction-text">${message}</div>
            <div class="reaction-impact ${partial ? 'positive' : 'negative'}">
                ${funding > 0 ? `+$${funding.toLocaleString()} secured` : 'No funding secured'}
            </div>
            <button class="continue-btn" onclick="nextCharacter()">Move On</button>
        </div>
    `;
    document.body.appendChild(overlay);
}

// Show Success Overlay
function showSuccessOverlay(character) {
    const overlay = document.createElement('div');
    overlay.className = 'reaction-overlay';
    overlay.innerHTML = `
        <div class="reaction-box">
            <div class="reaction-emoji">🎉</div>
            <div class="reaction-text">"Alright, Rain. You've convinced me. Let's make this happen."</div>
            <div class="reaction-impact positive">+$${character.fundingAmount.toLocaleString()} secured!</div>
            <button class="continue-btn" onclick="nextCharacter()">Return to Map</button>
        </div>
    `;
    document.body.appendChild(overlay);
}

// Show Failure Overlay
function showFailureOverlay(character) {
    const overlay = document.createElement('div');
    overlay.className = 'reaction-overlay';
    overlay.innerHTML = `
        <div class="reaction-box">
            <div class="reaction-emoji">😔</div>
            <div class="reaction-text">"I don't think this is going to work out, Rain. Best of luck with your project."</div>
            <div class="reaction-impact negative">No funding secured</div>
            <button class="continue-btn" onclick="nextCharacter()">Return to Map</button>
        </div>
    `;
    document.body.appendChild(overlay);
}

// Next Character
async function nextCharacter() {
    document.querySelector('.reaction-overlay')?.remove();

    const currentCharacter = characters[gameState.currentCharacterIndex];
    gameState.completedCharacters.add(currentCharacter.name);

    // Save to Firestore
    await saveGameToFirestore();

    if (gameState.completedCharacters.size >= characters.length) {
        endGame(true);
    } else {
        renderOverworld();
    }
}

// Update Funding Display
function updateFundingDisplay() {
    const percentage = (gameState.funding / gameState.fundingGoal) * 100;
    const fill = document.getElementById('fundingFill');
    if (fill) {
        fill.style.width = percentage + '%';
        fill.textContent = `$${gameState.funding.toLocaleString()} / $${gameState.fundingGoal.toLocaleString()}`;
    }

    // Update header
    const headerMoney = document.getElementById('headerMoney');
    const headerCollected = document.getElementById('headerCollected');
    if (headerMoney) {
        if (gameState.funding > 0) {
            headerMoney.textContent = `£${gameState.funding.toLocaleString()}`;
        } else {
            headerMoney.textContent = `£${gameState.funding.toLocaleString()} FUNDING`;
        }
    }
    if (headerCollected) {
        const jokesUsed = gameState.usedCards.size;
        headerCollected.textContent = `${jokesUsed} collected`;
    }

    // Update laugh energy display
    const headerLaughEnergy = document.getElementById('headerLaughEnergy');
    if (headerLaughEnergy) {
        headerLaughEnergy.textContent = `😂 ${gameState.laughEnergy}/${gameState.maxLaughEnergy}`;
    }
}

// Update Favor Display
function updateFavorDisplay(favor) {
    const fill = document.getElementById('favorFill');
    if (fill) {
        fill.style.width = favor + '%';
    }
}

// End Game
function endGame(completed) {
    const fundsRaised = gameState.funding;
    const goalMet = fundsRaised >= gameState.fundingGoal;

    let title, message;

    if (goalMet) {
        title = "Mission Accomplished!";
        message = `You raised $${fundsRaised.toLocaleString()} and secured full funding for your project. The doors are open—now the real work begins.`;
    } else if (fundsRaised >= gameState.fundingGoal * 0.75) {
        title = "Partial Success";
        message = `You raised $${fundsRaised.toLocaleString()}. Not quite the full amount, but enough to move forward with some adjustments. Your vision adapts.`;
    } else {
        title = "The Struggle Continues";
        message = `You raised $${fundsRaised.toLocaleString()}—short of your goal. The path forward will require rethinking your strategy.`;
    }

    document.getElementById('conversationArea').innerHTML = `
        <div class="game-over">
            <div class="ornamental-divider"></div>
            <div class="game-over-title">${title}</div>
            <div class="ornamental-divider"></div>
            <div class="game-over-message">${message}</div>
            <button class="restart-btn" onclick="initGame()">Begin Again</button>
        </div>
    `;
}

// Save game state to both localStorage and Firestore
async function saveGameToFirestore() {
    if (!window.currentUserId) return;

    // Convert Sets to Arrays for storage
    const stateToSave = {
        funding: gameState.funding,
        currentCharacterIndex: gameState.currentCharacterIndex,
        usedCards: Array.from(gameState.usedCards),
        energy: gameState.energy,
        turnsWithCharacter: gameState.turnsWithCharacter,
        discoveredPreferences: Array.from(gameState.discoveredPreferences),
        mode: gameState.mode,
        playerPosition: gameState.playerPosition,
        completedCharacters: Array.from(gameState.completedCharacters),
        // New system layers
        laughEnergy: gameState.laughEnergy,
        recruitedComedians: Array.from(gameState.recruitedComedians),
        artifacts: Array.from(gameState.artifacts)
    };

    await saveGameState(window.currentUserId, stateToSave);
}

// Start the game
window.onload = async function() {
    // If city page or character page is handling initialization, skip auto-init
    if (window.forceCityMap || window.forceCharacterPage) {
        return;
    }

    // Initialize Firebase and get user ID
    const userId = await getOrCreateUserId();
    window.currentUserId = userId;

    // Try loading from Firestore first
    let savedState = await loadGameState(userId);

    // Fallback to localStorage if no Firestore data
    if (!savedState) {
        const localState = localStorage.getItem('gameState');
        if (localState) {
            savedState = JSON.parse(localState);
        }
    }

    if (savedState) {
        // Restore the saved state
        Object.assign(gameState, savedState);

        // Convert arrays back to Sets where needed
        if (Array.isArray(savedState.usedCards)) {
            gameState.usedCards = new Set(savedState.usedCards);
        }
        if (Array.isArray(savedState.discoveredPreferences)) {
            gameState.discoveredPreferences = new Set(savedState.discoveredPreferences);
        }
        if (Array.isArray(savedState.completedCharacters)) {
            gameState.completedCharacters = new Set(savedState.completedCharacters);
        }
        if (Array.isArray(savedState.recruitedComedians)) {
            gameState.recruitedComedians = new Set(savedState.recruitedComedians);
        }
        if (Array.isArray(savedState.artifacts)) {
            gameState.artifacts = new Set(savedState.artifacts);
        }

        // Set defaults for new properties if not present
        if (gameState.laughEnergy === undefined) {
            gameState.laughEnergy = 3;
        }
        if (gameState.maxLaughEnergy === undefined) {
            gameState.maxLaughEnergy = 10;
        }
        if (gameState.recruitedComedians === undefined) {
            gameState.recruitedComedians = new Set();
        }
        if (gameState.artifacts === undefined) {
            gameState.artifacts = new Set();
        }

        // If we're in conversation mode, load the character
        if (savedState.mode === 'conversation') {
            loadCharacter();
        } else {
            // Otherwise render the overworld
            updateFundingDisplay();
            renderOverworld();
        }
    } else {
        // No saved state, start fresh
        initGame();
    }
};

// Keyboard controls
document.addEventListener('keydown', (e) => {
    if (gameState.mode !== 'overworld') return;

    switch(e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            e.preventDefault();
            movePlayer(0, -1);
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            e.preventDefault();
            movePlayer(0, 1);
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            e.preventDefault();
            movePlayer(-1, 0);
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            e.preventDefault();
            movePlayer(1, 0);
            break;
    }
});
