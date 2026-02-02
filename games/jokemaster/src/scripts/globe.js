// Globe Visualization using D3.js
// Global variables for rotation/zoom animation
let globeProjection;
let globePath;
let globeGroup;
let globeUpdateFunction;
let initialRadius;

// Initialize after page loads
document.addEventListener('DOMContentLoaded', initGlobe);

function initGlobe() {
    // Update header with current game state
    updateHeader();

    // Get viewport dimensions for proper sizing
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const isMobile = viewportWidth <= 768;

    // Calculate appropriate dimensions
    // On mobile, use larger size to allow expansion beyond screen
    // On desktop, use 90% of viewport to leave room for expansion
    let width, height, radius;

    if (isMobile) {
        // Mobile: Allow globe to be 110% of viewport so it can expand beyond screen
        width = Math.min(viewportWidth * 1.1, 1000);
        height = Math.min(viewportHeight * 1.1, 1000);
        radius = Math.min(width, height) * 0.4;
    } else {
        // Desktop: Use 90% of viewport
        width = Math.min(viewportWidth * 0.9, 800);
        height = Math.min(viewportHeight * 0.9, 800);
        radius = Math.min(width, height) * 0.35;
    }

    initialRadius = radius;

    // Create SVG
    const svg = d3.select('#globe')
        .attr('width', width)
        .attr('height', height);

    // Define radial gradient for sun highlight (MUCH brighter and more dramatic)
    const defs = svg.append('defs');

    const sunGradient = defs.append('radialGradient')
        .attr('id', 'sunHighlight')
        .attr('cx', '25%')  // Sun position from the left
        .attr('cy', '25%')  // Sun position from the top
        .attr('r', '85%');  // Even larger radius

    sunGradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', '#ffffff')
        .attr('stop-opacity', 0.85);  // VERY bright center - almost full white

    sunGradient.append('stop')
        .attr('offset', '30%')
        .attr('stop-color', '#ffffff')
        .attr('stop-opacity', 0.5);  // Still very bright

    sunGradient.append('stop')
        .attr('offset', '60%')
        .attr('stop-color', '#000000')
        .attr('stop-opacity', 0.2);  // Beginning of shadow

    sunGradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', '#000000')
        .attr('stop-opacity', 0.7);  // Very dark shadow on night side

    // Create projection
    const projection = d3.geoOrthographic()
        .scale(radius)
        .center([0, 0])
        .rotate([0, -20, 0])
        .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);

    // Store globally for rotation/zoom animation
    globeProjection = projection;
    globePath = path;

    // Create globe sphere
    const globe = { type: 'Sphere' };

    // Add sphere background
    svg.append('path')
        .datum(globe)
        .attr('class', 'sphere')
        .attr('d', path);

    // Add graticule (lat/long lines)
    const graticule = d3.geoGraticule();
    svg.append('path')
        .datum(graticule)
        .attr('class', 'graticule')
        .attr('d', path);

    // Group for all rotatable elements
    globeGroup = svg.append('g');

    // Load and render world map data from real geographic data
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
        .then(response => response.json())
        .then(world => {
            // Convert TopoJSON to GeoJSON
            const land = topojson.feature(world, world.objects.countries);

            globeGroup.append('path')
                .datum(land)
                .attr('class', 'land')
                .attr('d', path);

            // Add sun highlight overlay AFTER land (layered on top for realistic lighting)
            const sunHighlight = svg.append('path')
                .datum(globe)
                .attr('class', 'sun-highlight')
                .attr('d', path)
                .attr('fill', 'url(#sunHighlight)')
                .attr('pointer-events', 'none');

            // After land is loaded, add character markers
            addCharacterMarkers();
        })
        .catch(error => {
            console.error('Error loading world data:', error);
            // Fallback to simplified world if fetch fails
            const worldData = createSimplifiedWorld();
            globeGroup.append('path')
                .datum(worldData)
                .attr('class', 'land')
                .attr('d', path);

            // Add sun highlight overlay in fallback too
            const sunHighlight = svg.append('path')
                .datum(globe)
                .attr('class', 'sun-highlight')
                .attr('d', path)
                .attr('fill', 'url(#sunHighlight)')
                .attr('pointer-events', 'none');

            addCharacterMarkers();
        });

    function addCharacterMarkers() {
        // Get city locations
        const cityLocations = getCityLocations();

        // Add city markers
        const markers = globeGroup.selectAll('.character-marker-group')
            .data(cityLocations)
            .enter()
            .append('g')
            .attr('class', 'character-marker-group')
            .style('opacity', 0);

        // Add pulse circle (appears on hover)
        markers.append('circle')
            .attr('class', 'marker-pulse')
            .attr('r', 20)
            .attr('cx', 0)
            .attr('cy', 0);

        // Add marker circle background
        markers.append('circle')
            .attr('class', 'character-marker-circle')
            .attr('r', 16)
            .attr('cx', 0)
            .attr('cy', 0);

        // Add emoji (city flag)
        markers.append('text')
            .attr('class', 'character-marker-emoji')
            .attr('x', 0)
            .attr('y', 0)
            .text(d => d.emoji);

        // City name labels removed - showing only emoji icons

        // Add class based on marker type (contact or comedian)
        markers.each(function(d) {
            if (d.type === 'comedian') {
                d3.select(this).classed('comedian-marker', true);
            }
        });

        // Click handler for city markers - navigate to city page with city name
        markers.on('click', function(event, d) {
            event.stopPropagation();
            event.preventDefault();
            console.log('City clicked:', d.name);
            // Navigate to city page with city name as URL parameter
            const citySlug = d.name.replace(/\s+/g, '-');
            window.location.href = `city.html?city=${citySlug}`;
        });

        // Update globe elements
        function updateGlobe() {
            // Update sphere (blue background)
            svg.select('.sphere').attr('d', path);

            // Update land
            globeGroup.selectAll('path').attr('d', path);

            // Update marker positions and visibility
            markers.attr('transform', d => {
                const pos = projection([d.longitude, d.latitude]);
                return `translate(${pos[0]}, ${pos[1]})`;
            })
            .style('opacity', d => {
                // Hide markers on the back of the globe
                const angle = d3.geoDistance([d.longitude, d.latitude],
                                            [-projection.rotate()[0], -projection.rotate()[1]]);
                return angle > Math.PI / 2 ? 0 : 1;
            });

            // Update graticule
            svg.select('.graticule').attr('d', path);

            // Update sun highlight - stays fixed in space as Earth rotates
            svg.select('.sun-highlight').attr('d', path);
        }

        // Store globally for rotation/zoom animation
        globeUpdateFunction = updateGlobe;

        // Initial update
        updateGlobe();

        // Animate markers fading in
        markers.transition()
            .duration(800)
            .delay((d, i) => i * 150)
            .style('opacity', d => {
                const angle = d3.geoDistance([d.longitude, d.latitude],
                                            [-projection.rotate()[0], -projection.rotate()[1]]);
                return angle > Math.PI / 2 ? 0 : 1;
            });

        // Auto-rotate globe continuously
        d3.timer(function(elapsed) {
            const rotation = projection.rotate();
            projection.rotate([rotation[0] + 0.15, rotation[1]]);
            updateGlobe();
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            const containerWidth = container.clientWidth;
            const containerHeight = container.clientHeight;

            const newWidth = Math.min(containerWidth, 800);
            const newHeight = containerHeight > 100 ? Math.min(containerHeight, 800) : 600;
            const newRadius = Math.min(newWidth, newHeight) * 0.4;

            svg.attr('width', newWidth).attr('height', newHeight);
            projection.scale(newRadius).translate([newWidth / 2, newHeight / 2]);
            updateGlobe();
        });
    }
}

// Get city locations for markers on the globe
function getCityLocations() {
    // Cities where contacts are located
    const contactCities = [
        {
            name: 'London',
            emoji: '🇬🇧',
            latitude: 51.5,
            longitude: -0.1,
            type: 'contact'
        },
        {
            name: 'New York',
            emoji: '🗽',
            latitude: 40.7,
            longitude: -74.0,
            type: 'contact'
        },
        {
            name: 'Paris',
            emoji: '🇫🇷',
            latitude: 48.8,
            longitude: 2.3,
            type: 'contact'
        },
        {
            name: 'Tokyo',
            emoji: '🇯🇵',
            latitude: 35.6,
            longitude: 139.7,
            type: 'contact'
        },
        {
            name: 'Sydney',
            emoji: '🇦🇺',
            latitude: -33.8,
            longitude: 151.2,
            type: 'contact'
        },
        {
            name: 'Dubai',
            emoji: '🇦🇪',
            latitude: 25.2,
            longitude: 55.3,
            type: 'contact'
        },
        {
            name: 'São Paulo',
            emoji: '🇧🇷',
            latitude: -23.5,
            longitude: -46.6,
            type: 'contact'
        },
        {
            name: 'Mumbai',
            emoji: '🇮🇳',
            latitude: 19.0,
            longitude: 72.8,
            type: 'contact'
        }
    ];

    // Comedian locations (from game.js comedian database)
    const comedianCities = [
        {
            name: 'Robin Quick',
            location: 'London',
            emoji: '🎤',
            latitude: 51.5074,
            longitude: -0.1278,
            type: 'comedian',
            comedianId: 'robin'
        },
        {
            name: 'Maria Santos',
            location: 'São Paulo',
            emoji: '🎭',
            latitude: -23.5505,
            longitude: -46.6333,
            type: 'comedian',
            comedianId: 'maria'
        },
        {
            name: 'Kai Chen',
            location: 'Singapore',
            emoji: '💻',
            latitude: 1.3521,
            longitude: 103.8198,
            type: 'comedian',
            comedianId: 'kai'
        },
        {
            name: 'Amara Okafor',
            location: 'Lagos',
            emoji: '🌟',
            latitude: 6.5244,
            longitude: 3.3792,
            type: 'comedian',
            comedianId: 'amara'
        },
        {
            name: 'Diego Rivera',
            location: 'Mexico City',
            emoji: '😎',
            latitude: 19.4326,
            longitude: -99.1332,
            type: 'comedian',
            comedianId: 'diego'
        }
    ];

    // Only return contact cities (not individual comedians)
    return contactCities;
}

// Create highly detailed world map GeoJSON using actual geographic data
function createSimplifiedWorld() {
    return {
        type: 'FeatureCollection',
        features: [
            // North America - More detailed with Alaska, Canada, US, Mexico, Central America
            {
                type: 'Feature',
                geometry: {
                    type: 'Polygon',
                    coordinates: [[
                        // Alaska
                        [-168, 65.5], [-166, 66], [-164, 67], [-161, 68], [-158, 69], [-155, 70], [-152, 70.5],
                        [-148, 70.8], [-145, 70.5], [-142, 69.8], [-138, 69.5], [-135, 69.2], [-132, 69],
                        [-130, 70], [-128, 69.5], [-126, 69.2], [-124, 69], [-122, 69.5], [-120, 69.8],
                        // Northern Canada
                        [-118, 70.2], [-115, 70.5], [-112, 71], [-108, 71.5], [-105, 72], [-102, 72.5],
                        [-98, 73], [-95, 73.5], [-92, 73.8], [-88, 74], [-84, 74], [-80, 74.2],
                        [-76, 74], [-72, 73.5], [-68, 73], [-65, 72], [-62, 71], [-60, 70],
                        // Eastern Canada
                        [-58, 68.5], [-56, 67], [-54, 65.5], [-53, 64], [-52, 62.5], [-52, 61],
                        [-52.5, 59], [-53, 57], [-53.5, 55.5], [-54, 54], [-55, 52.5], [-56, 51],
                        [-57, 49.5], [-58, 48.5], [-59, 47.5], [-60, 47], [-61, 46.5], [-62, 46.2],
                        // Maritime provinces
                        [-63, 46], [-64, 46.2], [-65, 46], [-66, 45.5], [-67, 45.2], [-68, 45],
                        [-69, 44.8], [-70, 44.5], [-71, 44.2], [-72, 43.5], [-73, 42.8],
                        // Eastern US
                        [-74, 41.5], [-74.5, 40.5], [-75, 39.5], [-75.5, 38.5], [-76, 37.5],
                        [-76.5, 36.5], [-77, 35.5], [-78, 34.5], [-79, 33.5], [-80, 32.5],
                        // Florida
                        [-80.5, 31], [-81, 29.5], [-81.5, 28], [-82, 26.5], [-82.5, 25.5],
                        // Gulf Coast
                        [-83, 25], [-84, 24.8], [-85, 25], [-86, 25.5], [-87, 26], [-88, 26.5],
                        [-89, 27], [-90, 27.5], [-91, 28], [-92, 28.5], [-93, 29], [-94, 29.5],
                        [-95, 29], [-96, 28.5], [-97, 27.5], [-97.5, 26.5],
                        // Mexico
                        [-98, 25.5], [-98.5, 24], [-99, 22.5], [-99.5, 21], [-100, 19.5],
                        [-100.5, 18], [-101, 17], [-101.5, 16], [-102, 15.5], [-103, 15.2],
                        // Central America
                        [-104, 15], [-105, 15.2], [-106, 15.5], [-107, 16], [-108, 16.5],
                        [-109, 17.2], [-110, 18], [-110.5, 19], [-111, 20.5], [-111.5, 22],
                        [-112, 24], [-112.5, 26], [-113, 28], [-113.5, 29.5], [-114, 31],
                        // Baja California
                        [-114.5, 32.5], [-115, 33], [-115.5, 32.5], [-116, 32],
                        // Western US
                        [-116.5, 33], [-117, 34], [-117.5, 35], [-118, 36], [-118.5, 37],
                        [-119, 38], [-119.5, 39], [-120, 40], [-120.5, 41], [-121, 42],
                        [-121.5, 43], [-122, 44], [-122.5, 45], [-123, 46], [-123.5, 47],
                        [-124, 48], [-124.5, 48.5],
                        // Pacific Northwest
                        [-125, 49], [-125.5, 49.5], [-126, 50], [-127, 50.5], [-128, 51],
                        [-129, 51.5], [-130, 52], [-131, 52.5], [-132, 53], [-133, 53.5],
                        [-134, 54], [-135, 54.5], [-136, 55], [-137, 55.5], [-138, 56],
                        [-139, 56.5], [-140, 57], [-141, 57.5], [-142, 58], [-143, 58.5],
                        [-145, 59], [-147, 59.5], [-149, 60], [-151, 60.5], [-153, 61],
                        [-155, 61.5], [-157, 62], [-159, 62.5], [-161, 63], [-163, 63.5],
                        [-165, 64], [-167, 64.5], [-168, 65.5]
                    ]]
                }
            },
            // South America - More detailed with Brazil, Argentina, Chile
            {
                type: 'Feature',
                geometry: {
                    type: 'Polygon',
                    coordinates: [[
                        // Northern coast
                        [-80, 12], [-79, 11], [-78, 10], [-77, 9], [-76, 8], [-75, 7],
                        [-74, 6], [-73, 5], [-72, 4], [-71, 3], [-70, 2], [-69, 1],
                        [-68, 0], [-67, -1], [-66, -2], [-65, -3], [-64, -4],
                        // Eastern Brazil
                        [-63, -5], [-62, -6], [-61, -7], [-60, -8], [-59, -9], [-58, -10],
                        [-57, -11], [-56, -12], [-55, -13], [-54, -14], [-53, -15.5],
                        [-52, -17], [-51, -18.5], [-50, -20], [-49, -21.5], [-48, -23],
                        [-47.5, -24.5], [-47, -26], [-47, -27.5],
                        // Southern Brazil
                        [-47.5, -29], [-48, -30.5], [-48.5, -32], [-49, -33], [-49.5, -34],
                        // Uruguay/Argentina
                        [-50, -34.5], [-51, -35], [-52, -36], [-53, -37.5], [-54, -39],
                        [-54.5, -40.5], [-55, -42], [-55.5, -43.5], [-56, -45],
                        // Patagonia
                        [-56.5, -46.5], [-57, -48], [-58, -49.5], [-59, -51], [-60, -52],
                        [-61, -52.8], [-62, -53.5], [-63, -54], [-64, -54.5], [-65, -54.8],
                        // Chile (going north)
                        [-66, -54.5], [-67, -54], [-68, -53.5], [-69, -52.8], [-70, -52],
                        [-71, -51], [-72, -50], [-73, -49], [-74, -48], [-75, -47],
                        [-76, -45.5], [-77, -44], [-78, -42.5], [-79, -41], [-80, -39.5],
                        [-81, -38], [-82, -36.5], [-83, -35], [-84, -33.5], [-85, -32],
                        [-85.5, -30], [-86, -28], [-86.5, -26], [-86.8, -24], [-87, -22],
                        [-86.5, -20], [-86, -18], [-85.5, -16], [-85, -14], [-84.5, -12],
                        [-84, -10], [-83.5, -8], [-83, -6], [-82.5, -4], [-82, -2],
                        [-81.5, 0], [-81, 2], [-81, 4], [-81, 6], [-81.5, 8], [-82, 10],
                        [-81.5, 11], [-81, 11.5], [-80, 12]
                    ]]
                }
            },
            // Europe - More detailed with Scandinavia, Mediterranean
            {
                type: 'Feature',
                geometry: {
                    type: 'Polygon',
                    coordinates: [[
                        // Iceland/North Atlantic
                        [-25, 64], [-22, 65], [-18, 65.5], [-14, 65.8], [-10, 66],
                        // Norway
                        [-8, 67], [-6, 68], [-4, 69], [-2, 70], [0, 70.5], [2, 71],
                        [4, 71], [6, 70.8], [8, 70.5], [10, 70], [12, 69.5], [14, 69],
                        [16, 68.5], [18, 68], [20, 67.5], [22, 67], [24, 66.5], [26, 66],
                        [28, 66.2], [30, 66.5], [31, 67], [32, 67.5], [33, 68],
                        // Northern Russia
                        [34, 68.5], [36, 69], [38, 69.5], [40, 70], [42, 69.8],
                        [44, 69.5], [45, 69], [46, 68], [47, 67], [48, 66],
                        // Eastern Europe
                        [48, 64], [48, 62], [47, 60], [46, 58], [45, 56], [44, 54],
                        [43, 52], [42, 50], [40, 48], [38, 47], [36, 46],
                        // Black Sea
                        [34, 45.5], [32, 45], [30, 44.5], [28, 44], [26, 43.5],
                        // Balkans
                        [24, 43], [22, 42], [20, 41], [19, 40], [18, 39.5],
                        // Italy
                        [17, 40], [16, 40.5], [15, 41], [14, 41.5], [13, 42],
                        [12, 43], [11, 44], [10, 44.5], [9, 44.8], [8, 45],
                        [7, 44.5], [6, 44], [5, 43.5], [4, 43],
                        // Spain/Portugal
                        [3, 42.5], [2, 42], [1, 41.5], [0, 41], [-1, 40.5],
                        [-2, 40], [-3, 39.5], [-4, 39], [-5, 38.5], [-6, 38],
                        [-7, 37.5], [-8, 37], [-8.5, 37.5], [-9, 38], [-9, 39],
                        [-9, 40], [-9, 41], [-9, 42], [-8, 43], [-7, 43.5],
                        // France
                        [-6, 44], [-5, 44.5], [-4, 45], [-3, 45.5], [-2, 46],
                        [-1.5, 47], [-1, 48], [-1, 49], [-2, 49.5], [-3, 50],
                        // British Isles
                        [-4, 50.5], [-5, 51], [-5.5, 52], [-6, 53], [-6.5, 54],
                        [-7, 55], [-7, 56], [-6.5, 57], [-6, 58], [-5, 58.5],
                        [-4, 58.8], [-3, 59], [-2, 59], [-1, 58.5], [0, 58],
                        [1, 57.5], [1.5, 57], [2, 56.5],
                        // North Sea
                        [3, 56], [4, 55.5], [5, 55], [6, 54.5], [7, 54], [8, 53.5],
                        [9, 53], [10, 52.5], [11, 52], [12, 51.5], [13, 51],
                        // Germany/Poland
                        [14, 51.5], [15, 52], [16, 52.5], [17, 53], [18, 54],
                        [19, 54.5], [20, 55], [21, 55.5], [22, 56], [23, 57],
                        [24, 58], [25, 59], [26, 60], [27, 61], [28, 62],
                        [29, 63], [28, 64], [26, 64.5], [24, 65], [22, 65.5],
                        [20, 66], [18, 66.5], [16, 67], [14, 67.5], [12, 68],
                        [10, 68.5], [8, 69], [6, 69.5], [4, 70], [2, 70.5],
                        [0, 71], [-2, 70.5], [-4, 70], [-6, 69.5], [-8, 69],
                        [-10, 68.5], [-12, 68], [-14, 67.5], [-16, 67],
                        [-18, 66.5], [-20, 66], [-22, 65.5], [-24, 65], [-25, 64]
                    ]]
                }
            },
            // Africa - More detailed with Madagascar
            {
                type: 'Feature',
                geometry: {
                    type: 'Polygon',
                    coordinates: [[
                        // Northern coast (Mediterranean)
                        [-17, 35.5], [-16, 34.5], [-15, 33.5], [-14, 32.5], [-13, 31.5],
                        [-12, 30.5], [-11, 29.5], [-10, 28.5], [-9, 27.5], [-8, 26.5],
                        [-7, 25.5], [-6, 24.5], [-5, 23.5], [-4, 22.5], [-3, 21.5],
                        [-2, 20.5], [-1, 19.5], [0, 18.5], [1, 17.5], [2, 16.5],
                        [3, 15.5], [4, 14.5], [5, 13.5], [6, 12.8], [7, 12.2],
                        [8, 11.5], [9, 11], [10, 10.5], [11, 10], [12, 9.5],
                        [13, 9.2], [14, 9], [15, 8.8], [16, 8.5], [17, 8.2],
                        [18, 7.8], [19, 7.5], [20, 7.2], [21, 6.8], [22, 6.5],
                        [23, 6.2], [24, 5.8], [25, 5.5], [26, 5.2], [27, 5],
                        [28, 4.8], [29, 4.6], [30, 4.5], [31, 4.4], [32, 4.3],
                        [33, 4.5], [34, 4.8], [35, 5.2], [36, 5.5], [37, 6],
                        // Horn of Africa
                        [38, 6.5], [39, 7], [40, 7.8], [41, 8.5], [42, 9.5],
                        [43, 10.5], [44, 11.5], [45, 12.5], [46, 13.5], [47, 14.5],
                        [48, 15.5], [49, 16.5], [50, 17], [51, 17.5], [51.5, 17],
                        // East Africa
                        [51.8, 16], [52, 15], [52, 14], [52, 13], [52, 12], [52, 11],
                        [52, 10], [51.8, 9], [51.5, 8], [51.2, 7], [51, 6], [51, 5],
                        [51, 4], [51, 3], [51, 2], [51, 1], [51, 0], [50.8, -1],
                        [50.5, -2], [50.2, -3], [50, -4], [49.5, -5], [49, -6],
                        [48.5, -7], [48, -8], [47.5, -9], [47, -10], [46.5, -11],
                        [46, -12], [45.5, -13], [45, -14], [44.5, -15], [44, -16],
                        [43.5, -17], [43, -18], [42.5, -19], [42, -20], [41.5, -21],
                        [41, -22], [40.5, -23], [40, -24], [39.5, -25], [39, -26],
                        [38.5, -26.5], [38, -27], [37.5, -27.5], [37, -28],
                        // Southern Africa
                        [36, -28.5], [35, -29], [34, -29.5], [33, -30], [32, -30.5],
                        [31, -31], [30, -31.5], [29, -32], [28, -32.5], [27, -33],
                        [26, -33.5], [25, -34], [24, -34.3], [23, -34.5], [22, -34.6],
                        [21, -34.5], [20, -34.3], [19, -34], [18.5, -33.8], [18, -33.5],
                        [17.5, -33], [17, -32.5], [16.5, -32], [16, -31.5], [15.5, -31],
                        // West coast
                        [15, -30.5], [14.5, -30], [14, -29.5], [13.5, -29], [13, -28.5],
                        [12.5, -28], [12, -27.5], [11.5, -27], [11.5, -26.5], [11.5, -26],
                        [11.8, -25], [12, -24], [12.2, -23], [12.5, -22], [12.8, -21],
                        [13, -20], [13, -19], [13, -18], [12.8, -17], [12.5, -16],
                        [12.2, -15], [12, -14], [11.8, -13], [11.5, -12], [11.2, -11],
                        [11, -10], [10.8, -9], [10.5, -8], [10, -7], [9.5, -6],
                        [9, -5], [8.5, -4], [8.5, -3], [8.5, -2], [8.8, -1],
                        [9, 0], [9, 1], [9, 2], [9, 3], [9, 4], [9, 5],
                        [9, 6], [8.5, 7], [8, 8], [7, 9], [6, 10], [5, 11],
                        [4, 11.5], [3, 12], [2, 12.5], [1, 13], [0, 13.5],
                        [-1, 14], [-2, 14.5], [-3, 15], [-4, 15.5], [-5, 16],
                        [-6, 16.5], [-7, 17], [-8, 17.5], [-9, 18], [-10, 18.5],
                        [-11, 19], [-12, 19.5], [-13, 20.5], [-14, 21.5], [-15, 23],
                        [-15.5, 24.5], [-16, 26], [-16.5, 27.5], [-17, 29],
                        [-17, 30.5], [-17, 32], [-17, 33.5], [-17, 35.5]
                    ]]
                }
            },
            // Asia - Much more detailed with India, Southeast Asia, Japan
            {
                type: 'Feature',
                geometry: {
                    type: 'Polygon',
                    coordinates: [[
                        // Northern Siberia
                        [40, 77], [42, 77.5], [44, 78], [46, 78.5], [48, 79], [50, 79.5],
                        [52, 80], [55, 80.2], [58, 80.3], [60, 80.3], [62, 80.2], [65, 80],
                        [68, 79.8], [70, 79.5], [73, 79.2], [75, 78.8], [78, 78.5],
                        [80, 78], [83, 77.5], [85, 77], [88, 76.5], [90, 76],
                        [93, 75.5], [95, 75], [98, 74.5], [100, 74], [103, 73.5],
                        [105, 73], [108, 72.5], [110, 72], [113, 71.5], [115, 71],
                        [118, 70.5], [120, 70], [123, 69.5], [125, 69], [128, 68.5],
                        [130, 68], [133, 67.5], [135, 67], [138, 66.5], [140, 66],
                        // Eastern Russia
                        [143, 65.5], [145, 65], [148, 64.5], [150, 64], [153, 63.5],
                        [155, 63], [158, 62], [160, 61], [162, 60], [164, 59],
                        [165, 58], [166, 57], [167, 56], [168, 55], [169, 54],
                        [170, 53], [170.5, 52], [171, 51], [171, 50], [170.5, 49],
                        [170, 48], [169, 47], [168, 46], [167, 45], [166, 44],
                        [165, 43], [164, 42.5], [163, 42], [162, 41.5], [161, 41],
                        [160, 40.5], [159, 40], [158, 39.5], [157, 39],
                        // Japan (approximate)
                        [156, 38], [155, 37], [154, 36], [153, 35], [152, 34.5],
                        [151, 34], [150, 33.5], [149, 33.2], [148, 33], [147, 33.2],
                        [146, 33.5], [145, 34], [144, 35], [143, 36], [142, 37.5],
                        [141, 39], [140.5, 40.5], [140, 42], [139.5, 43.5], [139, 45],
                        // Back to mainland
                        [138, 44], [137, 43], [136, 42], [135, 41], [134, 40],
                        [133, 39], [132, 38], [131, 37], [130, 36], [129, 35],
                        [128, 34], [127, 33], [126, 32.5], [125, 32], [124, 31.5],
                        [123, 31], [122, 30.5], [121, 30], [120, 29.5], [119, 29],
                        // China coast
                        [118, 28.5], [117, 28], [116, 27.5], [115, 27], [114, 26.5],
                        [113, 26], [112, 25.5], [111, 25], [110, 24.5], [109, 24],
                        [108, 23.5], [107, 23], [106, 22.5], [105, 22], [104, 21.5],
                        [103, 21], [102, 20.5], [101, 20], [100, 19.5], [99, 19],
                        // Southeast Asia
                        [98, 18.5], [97, 18], [96, 17.5], [95, 17], [94, 16.5],
                        [93, 16], [92, 15.5], [91, 15], [90, 14.5], [89, 14],
                        [88, 13.5], [87, 13], [86, 12.5], [85, 12], [84, 11.5],
                        [83, 11], [82, 10.5], [81, 10], [80, 9.5], [79, 9],
                        [78, 8.5], [77, 8], [76, 7.5], [75, 7], [74, 6.5],
                        [73, 6], [72, 5.5], [71, 5], [70, 4.5], [69, 4.2],
                        [68, 4], [67.5, 4.2], [67, 4.5],
                        // India (going around)
                        [66.5, 5], [66, 5.5], [65.5, 6], [65, 6.5], [64.5, 7],
                        [64, 7.5], [63.5, 8], [63, 8.5], [62.5, 9], [62, 9.5],
                        [61.5, 10], [61, 10.5], [60.5, 11], [60.2, 11.5], [60, 12],
                        [60, 12.5], [60.2, 13], [60.5, 13.5], [61, 14], [61.5, 14.5],
                        [62, 15], [62.5, 15.5], [63, 16], [63.5, 16.5], [64, 17],
                        [64.5, 17.5], [65, 18], [65.5, 18.5], [66, 19], [66.5, 19.5],
                        [67, 20], [67.5, 20.5], [68, 21], [68.5, 21.5], [69, 22],
                        [69.5, 22.5], [70, 23], [70.5, 23.5], [71, 24], [71.5, 24.5],
                        [72, 25], [72.5, 25.5], [73, 26], [73.5, 26.5], [74, 27],
                        [74.5, 27.5], [75, 28], [75.5, 28.5], [76, 29], [76.5, 29.5],
                        [77, 30], [77.5, 30.5], [78, 31], [78.5, 31.5], [79, 32],
                        [79.5, 32.5], [80, 33], [80.5, 33.5], [81, 34], [81.5, 34.5],
                        [82, 35], [82.5, 35.5], [83, 36], [83.5, 36.5], [84, 37],
                        // Central Asia
                        [84.5, 37.5], [85, 38], [85.5, 38.5], [86, 39], [86.5, 39.5],
                        [87, 40], [87.5, 40.5], [88, 41], [88.5, 41.5], [89, 42],
                        [89.5, 42.5], [90, 43], [90.5, 43.5], [91, 44], [91.5, 44.5],
                        [92, 45], [92.5, 45.5], [93, 46], [93.5, 46.5], [94, 47],
                        [94.5, 47.5], [95, 48], [95.5, 48.5], [96, 49], [96.5, 49.5],
                        [97, 50], [97.5, 50.5], [98, 51], [98.5, 51.5], [99, 52],
                        [99.5, 52.5], [100, 53], [100, 53.5], [100, 54], [99.5, 54.5],
                        [99, 55], [98.5, 55.5], [98, 56], [97.5, 56.5], [97, 57],
                        // Northern Asia
                        [96, 57.5], [95, 58], [94, 58.5], [93, 59], [92, 59.5],
                        [91, 60], [90, 60.5], [89, 61], [88, 61.5], [87, 62],
                        [86, 62.5], [85, 63], [84, 63.5], [83, 64], [82, 64.5],
                        [81, 65], [80, 65.5], [79, 66], [78, 66.5], [77, 67],
                        [76, 67.5], [75, 68], [74, 68.5], [73, 69], [72, 69.5],
                        [71, 70], [70, 70.5], [69, 71], [68, 71.5], [67, 72],
                        [66, 72.5], [65, 73], [64, 73.5], [63, 74], [62, 74.5],
                        [61, 75], [60, 75.5], [59, 76], [58, 76.2], [57, 76.4],
                        [56, 76.5], [55, 76.6], [54, 76.7], [53, 76.8], [52, 77],
                        [50, 77.2], [48, 77.4], [46, 77.5], [44, 77.6], [42, 77.7],
                        [40, 77]
                    ]]
                }
            },
            // Australia - More detailed with Tasmania
            {
                type: 'Feature',
                geometry: {
                    type: 'Polygon',
                    coordinates: [[
                        // Northern coast
                        [113, -10.5], [114, -11], [115, -11.5], [116, -12], [117, -12.5],
                        [118, -13], [119, -13.5], [120, -14], [121, -14.5], [122, -15],
                        [123, -15.5], [124, -16], [125, -16.5], [126, -17], [127, -17.5],
                        [128, -18], [129, -18.5], [130, -19], [131, -19.5], [132, -20],
                        [133, -20.5], [134, -21], [135, -21.5], [136, -22], [137, -22.5],
                        // Eastern coast
                        [138, -23], [139, -23.5], [140, -24], [141, -24.5], [142, -25],
                        [143, -25.5], [144, -26], [145, -26.5], [146, -27.5], [147, -28.5],
                        [148, -29.5], [149, -30.5], [150, -31.5], [151, -32.5], [152, -33.5],
                        [153, -34.5], [153.5, -35.5], [153.8, -36.5], [154, -37.5],
                        // Tasmania
                        [153.5, -38.5], [153, -39.5], [152, -40.5], [151, -41.5],
                        [150, -42.5], [149, -43], [148, -43.2], [147, -43], [146, -42.5],
                        [145, -42], [144.5, -41.5], [144, -41], [143.5, -40.5],
                        // Southern coast
                        [143, -40], [142, -39.5], [141, -39.2], [140, -39], [139, -38.8],
                        [138, -38.8], [137, -39], [136, -39.2], [135, -39.5], [134, -39.8],
                        [133, -40], [132, -40.2], [131, -40.3], [130, -40.2], [129, -40],
                        [128, -39.8], [127, -39.5], [126, -39.2], [125, -38.8], [124, -38.5],
                        [123, -38.2], [122, -38], [121, -37.8], [120, -37.5], [119, -37.2],
                        [118, -37], [117, -36.8], [116, -36.5], [115, -36], [114, -35.5],
                        // Western coast
                        [113.5, -35], [113, -34.5], [112.8, -34], [112.5, -33], [112.2, -32],
                        [112, -31], [111.8, -30], [111.5, -29], [111.2, -28], [111, -27],
                        [110.8, -26], [110.5, -25], [110.2, -24], [110, -23], [109.8, -22],
                        [109.5, -21], [109.2, -20], [109, -19], [109, -18], [109, -17],
                        [109.2, -16], [109.5, -15], [110, -14], [110.5, -13], [111, -12],
                        [111.5, -11.5], [112, -11], [112.5, -10.5], [113, -10.5]
                    ]]
                }
            },
            // Greenland - More detailed
            {
                type: 'Feature',
                geometry: {
                    type: 'Polygon',
                    coordinates: [[
                        [-73, 83.5], [-72, 83.6], [-71, 83.6], [-70, 83.5], [-68, 83.3],
                        [-66, 83], [-64, 82.8], [-62, 82.5], [-60, 82.2], [-58, 82],
                        [-56, 81.8], [-54, 81.5], [-52, 81.2], [-50, 81], [-48, 80.5],
                        [-46, 80], [-44, 79.5], [-42, 79], [-40.5, 78], [-40, 77],
                        [-39.5, 76], [-39.2, 75], [-39, 74], [-39, 73], [-39, 72],
                        [-39.2, 71], [-39.5, 70], [-40, 69], [-40.5, 68.5], [-41, 68],
                        [-42, 67.5], [-43, 67], [-44, 66.5], [-45, 66.2], [-46, 66],
                        [-47, 65.8], [-48, 65.5], [-49, 65.2], [-50, 65], [-51, 64.5],
                        [-52, 64], [-53, 63.5], [-54, 63], [-55, 62.5], [-56, 62],
                        [-57, 61.5], [-58, 61.2], [-59, 61], [-60, 61], [-61, 61.2],
                        [-62, 61.5], [-63, 62], [-64, 62.5], [-65, 63], [-66, 63.5],
                        [-67, 64], [-68, 65], [-69, 66], [-70, 67.5], [-71, 69],
                        [-72, 70.5], [-72.5, 72], [-73, 73.5], [-73.5, 75], [-73.8, 76.5],
                        [-74, 78], [-74, 79.5], [-74, 81], [-73.8, 82], [-73.5, 82.8],
                        [-73, 83.5]
                    ]]
                }
            },
            // Antarctica - More detailed
            {
                type: 'Feature',
                geometry: {
                    type: 'Polygon',
                    coordinates: [[
                        [-180, -60], [-175, -61], [-170, -62], [-165, -62.5], [-160, -63],
                        [-155, -63.5], [-150, -64], [-145, -64.5], [-140, -65], [-135, -65.5],
                        [-130, -66], [-125, -66.5], [-120, -67], [-115, -67.5], [-110, -68],
                        [-105, -68.5], [-100, -69], [-95, -69.5], [-90, -70], [-85, -70.2],
                        [-80, -70.3], [-75, -70.3], [-70, -70.2], [-65, -70], [-60, -69.5],
                        [-55, -69], [-50, -68.5], [-45, -68], [-40, -67.5], [-35, -67],
                        [-30, -66.5], [-25, -66.2], [-20, -66], [-15, -66.2], [-10, -66.5],
                        [-5, -67], [0, -67.5], [5, -68], [10, -68.2], [15, -68.3],
                        [20, -68.3], [25, -68.2], [30, -68], [35, -67.5], [40, -67],
                        [45, -66.5], [50, -66.2], [55, -66], [60, -66.2], [65, -66.5],
                        [70, -67], [75, -67.5], [80, -68], [85, -68.5], [90, -69],
                        [95, -69.5], [100, -70], [105, -70.2], [110, -70.3], [115, -70.3],
                        [120, -70.2], [125, -70], [130, -69.5], [135, -69], [140, -68.5],
                        [145, -68], [150, -67.5], [155, -67], [160, -66.5], [165, -66],
                        [170, -65.5], [175, -65], [180, -64.5], [180, -90], [-180, -90], [-180, -60]
                    ]]
                }
            },
            // New Zealand
            {
                type: 'Feature',
                geometry: {
                    type: 'Polygon',
                    coordinates: [[
                        // North Island
                        [172, -34.5], [173, -35], [174, -35.5], [175, -36], [176, -36.5],
                        [177, -37], [178, -37.5], [178.5, -38], [178.8, -38.5], [178.5, -39],
                        [178, -39.5], [177.5, -40], [177, -40.5], [176.5, -41], [176, -41.3],
                        [175.5, -41.5], [175, -41.6], [174.5, -41.5], [174, -41.3],
                        [173.5, -41], [173, -40.5], [172.8, -40], [172.5, -39.5],
                        [172.2, -39], [172, -38.5], [172, -38], [172, -37.5], [172, -37],
                        [172, -36.5], [172, -36], [172, -35.5], [172, -35], [172, -34.5],
                        // South Island
                        [172.5, -42], [173, -42.5], [173.5, -43], [174, -43.5], [174.5, -44],
                        [175, -44.5], [175.5, -45], [176, -45.5], [176.5, -46], [177, -46.5],
                        [177.5, -47], [177, -47.2], [176.5, -47.3], [176, -47.2], [175.5, -47],
                        [175, -46.8], [174.5, -46.5], [174, -46.2], [173.5, -46], [173, -45.8],
                        [172.5, -45.5], [172, -45.2], [171.5, -45], [171, -44.8], [170.5, -44.5],
                        [170, -44.2], [169.5, -44], [169, -43.8], [168.5, -43.5], [168.2, -43.2],
                        [168, -43], [168.2, -42.8], [168.5, -42.5], [169, -42.3], [169.5, -42.2],
                        [170, -42.2], [170.5, -42.2], [171, -42.2], [171.5, -42.1], [172, -42],
                        [172.5, -42]
                    ]]
                }
            },
            // Madagascar
            {
                type: 'Feature',
                geometry: {
                    type: 'Polygon',
                    coordinates: [[
                        [43.2, -12], [43.5, -12.5], [44, -13], [44.5, -13.5], [45, -14],
                        [45.5, -14.5], [46, -15], [46.5, -15.5], [47, -16], [47.5, -16.5],
                        [48, -17], [48.5, -17.5], [49, -18], [49.5, -18.5], [50, -19],
                        [50.2, -19.5], [50.3, -20], [50.3, -20.5], [50.2, -21], [50, -21.5],
                        [49.8, -22], [49.5, -22.5], [49.2, -23], [49, -23.5], [48.8, -24],
                        [48.5, -24.5], [48.2, -25], [47.8, -25.2], [47.5, -25.3], [47, -25.3],
                        [46.5, -25.2], [46, -25], [45.5, -24.8], [45, -24.5], [44.5, -24.2],
                        [44.2, -24], [44, -23.5], [43.8, -23], [43.5, -22.5], [43.2, -22],
                        [43, -21.5], [43, -21], [43, -20.5], [43, -20], [43, -19.5],
                        [43, -19], [43, -18.5], [43, -18], [43, -17.5], [43, -17],
                        [43, -16.5], [43, -16], [43, -15.5], [43, -15], [43, -14.5],
                        [43, -14], [43, -13.5], [43, -13], [43, -12.5], [43.2, -12]
                    ]]
                }
            }
        ]
    };
}

// Start character conversation (same as clicking on map)
function startCharacterConversation(characterIndex) {
    console.log('startCharacterConversation called with index:', characterIndex);

    // Load or initialize game state
    let savedState = localStorage.getItem('gameState');
    let gameState;

    if (savedState) {
        gameState = JSON.parse(savedState);
    } else {
        // Initialize default game state if it doesn't exist
        gameState = {
            funding: 0,
            fundingGoal: 50000,
            currentCharacterIndex: 0,
            usedCards: [],
            energy: 5,
            maxEnergy: 5,
            turnsWithCharacter: 0,
            maxTurns: 5,
            discoveredPreferences: [],
            mode: 'overworld',
            playerPosition: { x: 2, y: 3 },
            completedCharacters: []
        };
    }

    // Set character and conversation mode
    gameState.currentCharacterIndex = characterIndex;
    gameState.mode = 'conversation';
    gameState.energy = gameState.maxEnergy;
    gameState.turnsWithCharacter = 0;

    // Save updated state
    localStorage.setItem('gameState', JSON.stringify(gameState));

    // Navigate to game
    window.location.href = 'jokemaster.html';
}

// Update header from game state
function updateHeader() {
    const savedState = localStorage.getItem('gameState');
    if (savedState) {
        const state = JSON.parse(savedState);
        document.getElementById('headerMoney').textContent = `£${state.funding.toLocaleString()} FUNDING`;
        const completed = state.completedCharacters ? state.completedCharacters.length : 0;
        document.getElementById('headerCollected').textContent = `${completed} collected`;

        // Update laugh energy (default to 3/10 if not present)
        const laughEnergy = state.laughEnergy !== undefined ? state.laughEnergy : 3;
        const maxLaughEnergy = state.maxLaughEnergy !== undefined ? state.maxLaughEnergy : 10;
        const headerLaughEnergy = document.getElementById('headerLaughEnergy');
        if (headerLaughEnergy) {
            headerLaughEnergy.textContent = `😂 ${laughEnergy}/${maxLaughEnergy}`;
        }
    }
}

// Rotate and zoom globe to New York, then execute callback
function rotateToNewYork(callback) {
    if (!globeProjection || !globeUpdateFunction) {
        console.error('Globe not initialized');
        if (callback) callback();
        return;
    }

    // New York coordinates
    const newYorkLongitude = -74.006;
    const newYorkLatitude = 40.7128;

    // Calculate target rotation (invert longitude, keep latitude)
    const targetRotation = [-newYorkLongitude, -newYorkLatitude, 0];
    const currentRotation = globeProjection.rotate();

    // Target zoom scale (30% larger)
    const targetScale = initialRadius * 1.3;
    const currentScale = globeProjection.scale();

    // Find New York marker
    const newYorkMarker = d3.selectAll('.character-marker-group')
        .filter(function(d) { return d && d.name === 'New York'; });

    // Animate rotation and zoom over 2.5 seconds
    const duration = 2500;
    const startTime = Date.now();

    function animate() {
        const elapsed = Date.now() - startTime;
        const t = Math.min(elapsed / duration, 1);

        // Easing function (ease-in-out)
        const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

        // Interpolate rotation
        const rotation = [
            currentRotation[0] + (targetRotation[0] - currentRotation[0]) * eased,
            currentRotation[1] + (targetRotation[1] - currentRotation[1]) * eased,
            0
        ];

        // Interpolate scale
        const scale = currentScale + (targetScale - currentScale) * eased;

        // Update projection
        globeProjection.rotate(rotation);
        globeProjection.scale(scale);

        // Redraw globe
        globeUpdateFunction();

        if (t < 1) {
            requestAnimationFrame(animate);
        } else {
            // Animation complete, pause and highlight New York icon
            // Make New York marker 20% bigger with smooth, slow animation
            // Gradually fade in glow effect during expansion
            const circle = newYorkMarker.select('.character-marker-circle');
            const startTime = Date.now();
            const glowDuration = 800;

            function animateGlow() {
                const elapsed = Date.now() - startTime;
                const t = Math.min(elapsed / glowDuration, 1);
                const eased = d3.easeCubicOut(t);

                // Gradually increase glow opacity
                const glowOpacity = eased;
                circle.style('filter', `drop-shadow(0 0 ${8 * glowOpacity}px rgba(255, 215, 0, ${glowOpacity})) drop-shadow(0 0 ${16 * glowOpacity}px rgba(255, 215, 0, ${glowOpacity * 0.6}))`);

                if (t < 1) {
                    requestAnimationFrame(animateGlow);
                }
            }

            // Start size and color transition
            circle
                .transition()
                .duration(800)
                .ease(d3.easeCubicOut)
                .attr('r', 16 * 1.2)
                .attr('stroke', '#FFD700');

            // Start glow animation
            animateGlow();

            newYorkMarker.select('.character-marker-emoji')
                .transition()
                .duration(800)
                .ease(d3.easeCubicOut)
                .style('font-size', '24px');

            // Hold for 1.5 seconds to let viewer see New York
            setTimeout(() => {
                if (callback) callback();
            }, 1500);
        }
    }

    animate();
}
