/**
 * Isometric Buildings Generator
 * Creates CSS-based 3D isometric buildings for character locations
 */

// Building types with different styles and colors - IsoCity aesthetic
const buildingTypes = [
    {
        name: 'lab',
        color: '#5B9BD5',
        roofColor: '#4A7FB8',
        height: 85,
        floors: 6,
        style: 'modern'
    },
    {
        name: 'office',
        color: '#D4A574',
        roofColor: '#B8895E',
        height: 100,
        floors: 8,
        style: 'corporate'
    },
    {
        name: 'theater',
        color: '#C55A5A',
        roofColor: '#A44848',
        height: 65,
        floors: 4,
        style: 'cultural'
    },
    {
        name: 'cafe',
        color: '#8B7355',
        roofColor: '#6B5838',
        height: 50,
        floors: 3,
        style: 'cozy'
    }
];

/**
 * Generate floor segments for a building
 * @param {Object} building - Building configuration
 * @returns {string} HTML for floor blocks
 */
function generateFloors(building) {
    const leftColor = adjustBrightness(building.color, -10);
    const rightColor = adjustBrightness(building.color, -25);
    const floorHeight = Math.floor((building.height - 30) / building.floors);

    let floorsHTML = '';
    for (let i = 0; i < building.floors; i++) {
        const offset = i * floorHeight;
        floorsHTML += `
            <div class="iso-floor" style="bottom: ${offset}px;">
                <div class="iso-floor-left" style="background: ${leftColor}; height: ${floorHeight}px;"></div>
                <div class="iso-floor-right" style="background: ${rightColor}; height: ${floorHeight}px;"></div>
            </div>
        `;
    }
    return floorsHTML;
}

/**
 * Generate isometric building HTML for a character
 * @param {Object} character - Character data with emoji, name, etc.
 * @param {number} index - Character index for building variety
 * @returns {string} HTML for isometric building
 */
function generateIsometricBuilding(character, index = 0) {
    const building = buildingTypes[index % buildingTypes.length];
    const floors = generateFloors(building);

    return `
        <div class="iso-building" data-character="${character.name}">
            <div class="iso-building-container" style="height: ${building.height}px;">
                <div class="iso-top" style="background: ${building.roofColor};"></div>
                ${floors}
            </div>
        </div>
    `;
}

/**
 * Adjust color brightness
 * @param {string} color - Hex color
 * @param {number} percent - Brightness adjustment (-100 to 100)
 * @returns {string} Adjusted hex color
 */
function adjustBrightness(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;

    return '#' + (0x1000000 +
        (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
        (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
        (B < 255 ? (B < 1 ? 0 : B) : 255))
        .toString(16).slice(1);
}

// Export for use in game.js
window.generateIsometricBuilding = generateIsometricBuilding;
