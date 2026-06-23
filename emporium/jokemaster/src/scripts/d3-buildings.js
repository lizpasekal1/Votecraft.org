/**
 * D3 Isometric Building Generator
 * Creates SVG-based isometric cube buildings for character locations
 */

// Building types with different colors and heights
const buildingTypes = [
    {
        name: 'lab',
        color: '#5B9BD5',
        height: 80,
        width: 30,
        depth: 25
    },
    {
        name: 'office',
        color: '#D4A574',
        height: 100,
        width: 35,
        depth: 30
    },
    {
        name: 'theater',
        color: '#C55A5A',
        height: 60,
        width: 40,
        depth: 35
    },
    {
        name: 'cafe',
        color: '#8B7355',
        height: 50,
        width: 28,
        depth: 28
    }
];

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

/**
 * Generate D3 isometric building for a character
 * @param {Object} character - Character data with emoji, name, etc.
 * @param {number} index - Character index for building variety
 * @returns {string} HTML for SVG building container
 */
function generateD3Building(character, index = 0) {
    // Create a unique ID for this building (replace all non-alphanumeric chars with hyphens)
    const buildingId = `building-${character.name.replace(/[^a-zA-Z0-9]+/g, '-')}`;

    return `
        <div class="d3-building-container" data-character="${character.name}">
            <svg id="${buildingId}" width="120" height="190" viewBox="0 0 120 190"></svg>
        </div>
    `;
}

/**
 * Render D3 isometric cube building into an SVG element
 * @param {string} buildingId - ID of the SVG element
 * @param {number} index - Building type index
 */
function renderD3Building(buildingId, index = 0) {
    const building = buildingTypes[index % buildingTypes.length];

    const svg = d3.select(`#${buildingId}`);

    // Clear any existing content
    svg.selectAll('*').remove();

    // Isometric rectangle parameters (varying sizes)
    const cubeWidth = building.width;  // Width of the building base
    const cubeDepth = building.depth;  // Depth of the building base
    const cubeHeight = building.height;

    // Center position (adjusted for viewBox - bottom anchor point)
    const centerX = 60;
    const centerY = 145;

    // Isometric angles (26.565 degrees for true isometric)
    const isoAngle = Math.PI / 6; // 30 degrees for easier calculation

    // Calculate isometric offsets
    const widthOffset = cubeWidth * Math.cos(isoAngle);
    const widthHeight = cubeWidth * Math.sin(isoAngle);
    const depthOffset = cubeDepth * Math.cos(isoAngle);
    const depthHeight = cubeDepth * Math.sin(isoAngle);

    // Define the three visible faces of the cube

    // Top face (diamond/rhombus)
    const topPoints = [
        [centerX, centerY - cubeHeight],                                    // Top
        [centerX + widthOffset, centerY - cubeHeight + widthHeight],       // Right
        [centerX, centerY - cubeHeight + widthHeight + depthHeight],       // Bottom
        [centerX - depthOffset, centerY - cubeHeight + depthHeight]        // Left
    ];

    // Left face (parallelogram)
    const leftPoints = [
        [centerX - depthOffset, centerY - cubeHeight + depthHeight],       // Top-left
        [centerX, centerY - cubeHeight + widthHeight + depthHeight],       // Top-right
        [centerX, centerY + widthHeight + depthHeight],                    // Bottom-right
        [centerX - depthOffset, centerY + depthHeight]                     // Bottom-left
    ];

    // Right face (parallelogram)
    const rightPoints = [
        [centerX, centerY - cubeHeight + widthHeight + depthHeight],       // Top-left
        [centerX + widthOffset, centerY - cubeHeight + widthHeight],       // Top-right
        [centerX + widthOffset, centerY + widthHeight],                    // Bottom-right
        [centerX, centerY + widthHeight + depthHeight]                     // Bottom-left
    ];

    // Colors for the three faces
    const topColor = adjustBrightness(building.color, 10);
    const leftColor = adjustBrightness(building.color, -10);
    const rightColor = adjustBrightness(building.color, -25);

    // Draw left face (darker)
    svg.append('polygon')
        .attr('points', leftPoints.map(p => p.join(',')).join(' '))
        .attr('fill', leftColor)
        .attr('stroke', '#000')
        .attr('stroke-width', 1);

    // Draw right face (darkest)
    svg.append('polygon')
        .attr('points', rightPoints.map(p => p.join(',')).join(' '))
        .attr('fill', rightColor)
        .attr('stroke', '#000')
        .attr('stroke-width', 1);

    // Draw top face (lightest)
    svg.append('polygon')
        .attr('points', topPoints.map(p => p.join(',')).join(' '))
        .attr('fill', topColor)
        .attr('stroke', '#000')
        .attr('stroke-width', 1);
}

// Export for use in game.js
window.generateD3Building = generateD3Building;
window.renderD3Building = renderD3Building;
