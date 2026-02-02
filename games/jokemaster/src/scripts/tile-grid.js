/**
 * TileGrid Component System
 *
 * State-driven tile grid that can render either:
 * - DotTile: Circular tile with a letter (walkable)
 * - BuildingTile: D3 isometric building (character location)
 * - Empty: No tile (null object)
 * - PlayerTile: Rain's current position
 */

// ========================================
// TILE STATE DEFINITIONS
// ========================================

/**
 * TileState object structure:
 * {
 *   type: 'empty' | 'dot' | 'building' | 'player',
 *   letter: string (A-Z, for dot tiles),
 *   character: object | null (character data for building tiles),
 *   position: { x: number, y: number },
 *   isWalkable: boolean,
 *   isSelected: boolean (for word-search highlighting),
 *   buildingType: number (0-3 for building variety)
 * }
 */

// ========================================
// TILE GRID STATE MANAGER
// ========================================

class TileGrid {
    constructor(width = 6, height = 6) {
        this.width = width;
        this.height = height;
        this.tiles = [];
        this.playerPosition = { x: 2, y: 2 };
        this.onTileClick = null; // Callback for tile clicks
        this.onBuildingClick = null; // Callback for building clicks

        // Initialize empty grid
        this.initializeGrid();
    }

    /**
     * Initialize grid with empty tiles
     */
    initializeGrid() {
        this.tiles = [];
        for (let y = 0; y < this.height; y++) {
            this.tiles[y] = [];
            for (let x = 0; x < this.width; x++) {
                this.tiles[y][x] = this.createEmptyTile(x, y);
            }
        }
    }

    /**
     * Create an empty tile state
     */
    createEmptyTile(x, y) {
        return {
            type: 'empty',
            letter: null,
            character: null,
            position: { x, y },
            isWalkable: false,
            isSelected: false,
            buildingType: 0
        };
    }

    /**
     * Create a dot tile (walkable with letter)
     */
    createDotTile(x, y, letter = null) {
        return {
            type: 'dot',
            letter: letter || this.generateRandomLetter(),
            character: null,
            position: { x, y },
            isWalkable: true,
            isSelected: false,
            buildingType: 0
        };
    }

    /**
     * Create a building tile (character location)
     */
    createBuildingTile(x, y, character, buildingType = 0) {
        return {
            type: 'building',
            letter: null,
            character: character,
            position: { x, y },
            isWalkable: false, // Buildings block movement
            isSelected: false,
            buildingType: buildingType
        };
    }

    /**
     * Create a player tile
     */
    createPlayerTile(x, y) {
        return {
            type: 'player',
            letter: null,
            character: null,
            position: { x, y },
            isWalkable: false,
            isSelected: false,
            buildingType: 0
        };
    }

    /**
     * Generate a random letter A-Z
     */
    generateRandomLetter() {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        return letters.charAt(Math.floor(Math.random() * letters.length));
    }

    /**
     * Set a tile at position
     */
    setTile(x, y, tileState) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            this.tiles[y][x] = tileState;
        }
    }

    /**
     * Get tile at position
     */
    getTile(x, y) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            return this.tiles[y][x];
        }
        return null;
    }

    /**
     * Set player position
     */
    setPlayerPosition(x, y) {
        this.playerPosition = { x, y };
    }

    /**
     * Toggle tile selection (for word-search)
     */
    toggleTileSelection(x, y) {
        const tile = this.getTile(x, y);
        if (tile) {
            tile.isSelected = !tile.isSelected;
        }
    }

    /**
     * Clear all tile selections
     */
    clearSelections() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                this.tiles[y][x].isSelected = false;
            }
        }
    }

    /**
     * Populate grid from map layout and characters
     * @param {Array} mapLayout - 2D array of tile types (0=empty, 1=walkable, 2=building)
     * @param {Array} characters - Array of character objects with positions
     * @param {Object} letterOverrides - Optional: { "x,y": "LETTER" } for specific letter placement
     */
    populateFromLayout(mapLayout, characters = [], letterOverrides = {}) {
        for (let y = 0; y < this.height && y < mapLayout.length; y++) {
            for (let x = 0; x < this.width && x < mapLayout[y].length; x++) {
                const tileType = mapLayout[y][x];
                const tileKey = `${x},${y}`;

                // Check if there's a character at this position
                const characterAtPos = characters.find(c => c.position.x === x && c.position.y === y);

                if (characterAtPos) {
                    // Create building tile for character
                    const charIndex = characters.indexOf(characterAtPos);
                    this.setTile(x, y, this.createBuildingTile(x, y, characterAtPos, charIndex % 4));
                } else if (tileType === 1) {
                    // Walkable tile - use override letter if provided
                    const letter = letterOverrides[tileKey] || null;
                    this.setTile(x, y, this.createDotTile(x, y, letter));
                } else {
                    // Empty or non-walkable
                    this.setTile(x, y, this.createEmptyTile(x, y));
                }
            }
        }
    }

    /**
     * Set specific letters on the grid (for word-search puzzles)
     * @param {Object} letterMap - { "x,y": "LETTER" }
     */
    setLetters(letterMap) {
        for (const [key, letter] of Object.entries(letterMap)) {
            const [x, y] = key.split(',').map(Number);
            const tile = this.getTile(x, y);
            if (tile && tile.type === 'dot') {
                tile.letter = letter;
            }
        }
    }
}

// ========================================
// DOT TILE RENDERER
// ========================================

/**
 * Render a dot tile (circle with letter)
 * @param {Object} tileState - The tile state object
 * @returns {string} HTML string for the tile
 */
function renderDotTile(tileState) {
    const { position, letter, isSelected } = tileState;
    const selectedClass = isSelected ? ' selected' : '';

    // Include onclick for compatibility with game.js handleTileClick
    return `<div class="map-tile walkable${selectedClass}"
                 onclick="handleTileClick(${position.x}, ${position.y}, false)"
                 data-x="${position.x}"
                 data-y="${position.y}"
                 data-letter="${letter}"
                 data-tile-type="dot">${letter}</div>`;
}

// ========================================
// BUILDING TILE RENDERER
// ========================================

/**
 * Render a building tile (D3 isometric building)
 * @param {Object} tileState - The tile state object
 * @returns {string} HTML string for the tile
 */
function renderBuildingTile(tileState) {
    const { position, character, buildingType, isSelected } = tileState;
    const selectedClass = isSelected ? ' selected' : '';
    const characterName = character ? character.name : 'unknown';
    const buildingId = `building-${characterName.replace(/[^a-zA-Z0-9]+/g, '-')}`;

    // Generate D3 building SVG container
    const buildingHTML = `
        <div class="d3-building-container" data-character="${characterName}">
            <svg id="${buildingId}" width="120" height="190" viewBox="0 0 120 190"></svg>
        </div>
    `;

    // Include onclick for compatibility with game.js handleTileClick
    return `<div class="map-tile character${selectedClass}"
                 onclick="handleTileClick(${position.x}, ${position.y}, true)"
                 data-x="${position.x}"
                 data-y="${position.y}"
                 data-character="${characterName}"
                 data-tile-type="building">${buildingHTML}</div>`;
}

// ========================================
// PLAYER TILE RENDERER
// ========================================

/**
 * Render the player tile (Rain)
 * @param {Object} tileState - The tile state object
 * @returns {string} HTML string for the tile
 */
function renderPlayerTile(tileState) {
    const { position } = tileState;

    return `<div class="map-tile player"
                 data-x="${position.x}"
                 data-y="${position.y}"
                 data-tile-type="player">🚶🏿‍♂️</div>`;
}

// ========================================
// EMPTY TILE RENDERER
// ========================================

/**
 * Render an empty tile
 * @param {Object} tileState - The tile state object
 * @returns {string} HTML string for the tile
 */
function renderEmptyTile(tileState) {
    const { position } = tileState;

    return `<div class="map-tile"
                 data-x="${position.x}"
                 data-y="${position.y}"
                 data-tile-type="empty"></div>`;
}

// ========================================
// GRID RENDERER
// ========================================

/**
 * Render the entire grid from TileGrid state
 * @param {TileGrid} tileGrid - The TileGrid instance
 * @returns {string} HTML string for the entire grid
 */
function renderTileGrid(tileGrid) {
    let html = '';

    for (let y = 0; y < tileGrid.height; y++) {
        for (let x = 0; x < tileGrid.width; x++) {
            const tile = tileGrid.getTile(x, y);
            const isPlayerPosition = tileGrid.playerPosition.x === x && tileGrid.playerPosition.y === y;

            if (isPlayerPosition) {
                // Render player at this position
                html += renderPlayerTile(tileGrid.createPlayerTile(x, y));
            } else if (tile) {
                // Render based on tile type
                switch (tile.type) {
                    case 'dot':
                        html += renderDotTile(tile);
                        break;
                    case 'building':
                        html += renderBuildingTile(tile);
                        break;
                    case 'empty':
                    default:
                        html += renderEmptyTile(tile);
                        break;
                }
            }
        }
    }

    return html;
}

// ========================================
// CLICK HANDLER SETUP
// ========================================

/**
 * Set up click handlers for tiles after rendering
 * @param {TileGrid} tileGrid - The TileGrid instance
 * @param {HTMLElement} container - The container element with the grid
 */
function setupTileClickHandlers(tileGrid, container) {
    const tiles = container.querySelectorAll('.map-tile[data-tile-type]');

    tiles.forEach(tile => {
        const tileType = tile.dataset.tileType;
        const x = parseInt(tile.dataset.x);
        const y = parseInt(tile.dataset.y);

        tile.addEventListener('click', (event) => {
            if (tileType === 'dot' && tileGrid.onTileClick) {
                const letter = tile.dataset.letter;
                tileGrid.onTileClick(x, y, letter, event);
            } else if (tileType === 'building' && tileGrid.onBuildingClick) {
                const characterName = tile.dataset.character;
                tileGrid.onBuildingClick(x, y, characterName, event);
            }
        });
    });
}

/**
 * Initialize D3 buildings after rendering
 * @param {TileGrid} tileGrid - The TileGrid instance
 */
function initializeBuildings(tileGrid) {
    if (typeof renderD3Building !== 'function') {
        console.warn('renderD3Building not available');
        return;
    }

    for (let y = 0; y < tileGrid.height; y++) {
        for (let x = 0; x < tileGrid.width; x++) {
            const tile = tileGrid.getTile(x, y);
            if (tile && tile.type === 'building' && tile.character) {
                const buildingId = `building-${tile.character.name.replace(/[^a-zA-Z0-9]+/g, '-')}`;
                const svgElement = document.getElementById(buildingId);
                if (svgElement) {
                    renderD3Building(buildingId, tile.buildingType);
                }
            }
        }
    }
}

// ========================================
// EXPORTS
// ========================================

// Export for use in other scripts
window.TileGrid = TileGrid;
window.renderTileGrid = renderTileGrid;
window.renderDotTile = renderDotTile;
window.renderBuildingTile = renderBuildingTile;
window.renderPlayerTile = renderPlayerTile;
window.renderEmptyTile = renderEmptyTile;
window.setupTileClickHandlers = setupTileClickHandlers;
window.initializeBuildings = initializeBuildings;
