/**
 * Civic Data API Client
 *
 * Uses OpenStates API for state legislators
 * Uses Census Geocoder for address -> lat/lng conversion
 */

const CivicAPI = {
    // OpenStates API - proxied through WordPress REST API (key is server-side only)
    OPENSTATES_PROXY: 'https://votecraft.org/wp-json/votecraft/v1/openstates',

    // Google Civic Information API key
    // TODO: Move to server-side proxy (see security-plan.md remediation checklist)
    GOOGLE_CIVIC_API_KEY: 'AIzaSyCnUhJKt7HKGMZF8e_VGBbDvvOFLCH7aAw',
    GOOGLE_CIVIC_URL: 'https://www.googleapis.com/civicinfo/v2',

    /**
     * Geocode an address using OpenStreetMap Nominatim (free, CORS-enabled)
     * @param {string} address - Full address to geocode
     * @returns {Promise<{lat: number, lng: number}>} - Coordinates
     */
    async geocodeAddress(address) {
        const url = new URL('https://nominatim.openstreetmap.org/search');
        url.searchParams.append('q', address);
        url.searchParams.append('format', 'json');
        url.searchParams.append('limit', '1');
        url.searchParams.append('countrycodes', 'us');

        console.log('Geocoding address:', address);

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Votecraft/1.0'
            }
        });

        console.log('Geocode response status:', response.status);

        if (!response.ok) {
            throw new Error('Failed to geocode address');
        }

        const data = await response.json();
        console.log('Geocode data:', data);

        if (!data || data.length === 0) {
            throw new Error('Address not found. Please enter a valid US street address (e.g., 123 Main St, City, State).');
        }

        console.log('Coordinates:', data[0].lat, data[0].lon);
        return {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon)
        };
    },

    /**
     * Get state legislators for a location using OpenStates API
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @returns {Promise<object>} - Legislators data
     */
    async getStateLegislators(lat, lng) {
        const url = `${this.OPENSTATES_PROXY}?endpoint=people.geo&lat=${lat}&lng=${lng}`;

        console.log('Fetching legislators for:', lat, lng);
        console.log('URL:', url);

        let response;
        try {
            response = await fetch(url);
        } catch (fetchError) {
            console.error('Fetch error:', fetchError);
            throw new Error('Network error fetching legislators. Please try again.');
        }

        console.log('Response status:', response.status);

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            console.error('API error:', error);
            throw new Error(error.detail || 'Failed to fetch legislators');
        }

        const data = await response.json();
        console.log('Legislators data:', data);
        return data;
    },

    /**
     * Get all legislators for a jurisdiction (state or federal)
     * @param {string} jurisdiction - Jurisdiction name (e.g., "Massachusetts")
     * @param {number} perPage - Results per page (default 300 to get all)
     * @returns {Promise<Array>} - Array of legislator objects
     */
    async getAllLegislators(jurisdiction) {
        // Check sessionStorage cache first
        const cacheKey = `legislators_${jurisdiction}`;
        try {
            const cached = sessionStorage.getItem(cacheKey);
            if (cached) {
                const data = JSON.parse(cached);
                console.log(`Cache hit: ${data.length} legislators for ${jurisdiction}`);
                return data;
            }
        } catch (e) { /* ignore storage errors */ }

        const allResults = [];
        let page = 1;
        let maxPage = 1;

        console.log('Fetching all legislators for:', jurisdiction);

        try {
            do {
                const params = new URLSearchParams({
                    endpoint: 'people',
                    jurisdiction: jurisdiction,
                    per_page: '50',
                    page: page.toString()
                });

                const url = `${this.OPENSTATES_PROXY}?${params.toString()}`;
                const response = await fetch(url);
                if (!response.ok) {
                    console.error('All legislators API error:', response.status, 'page', page);
                    break;
                }
                const data = await response.json();
                const results = data.results || [];
                allResults.push(...results);
                maxPage = data.pagination?.max_page || 1;
                console.log(`Page ${page}/${maxPage}: ${results.length} legislators (${allResults.length} total)`);
                page++;
            } while (page <= maxPage);

            console.log(`All legislators: ${allResults.length} found`);

            // Cache results in sessionStorage
            try {
                sessionStorage.setItem(cacheKey, JSON.stringify(allResults));
            } catch (e) { /* ignore storage errors */ }

            return allResults;
        } catch (error) {
            console.error('Error fetching all legislators:', error);
            return allResults;
        }
    },

    /**
     * Get representatives for an address (main entry point)
     * @param {string} address - Full address to look up
     * @returns {Promise<object>} - Representatives in normalized format
     */
    async getRepresentatives(address) {
        // Step 1: Geocode the address
        const coords = await this.geocodeAddress(address);

        // Step 2: Get state legislators from OpenStates
        const legislators = await this.getStateLegislators(coords.lat, coords.lng);

        // Return in a format compatible with the app
        return {
            officials: legislators.results || [],
            source: 'openstates'
        };
    },

    /**
     * Parse OpenStates legislators into app format
     * @param {object} data - Raw OpenStates response
     * @returns {Array} - Normalized representative array
     */
    parseRepresentatives(data) {
        // OpenStates returns 'results', our wrapper returns 'officials'
        const people = data.officials || data.results || [];

        console.log('Parsing representatives:', people);

        if (people.length === 0) {
            return [];
        }

        return people.map(person => {
            const role = person.current_role || {};
            const jurisdiction = person.jurisdiction || {};

            // Determine level and office title
            let level = 'state';
            let office = role.title || 'Representative';

            if (jurisdiction.classification === 'country') {
                level = 'federal';
                if (role.org_classification === 'upper') {
                    office = 'U.S. Senator';
                } else {
                    office = 'U.S. Representative';
                }
            } else if (jurisdiction.classification === 'state') {
                level = 'state';
                if (role.org_classification === 'upper') {
                    office = 'State Senator';
                } else {
                    office = 'State Assembly Member';
                }
            }

            return {
                id: person.id,  // OpenStates person ID for bill lookups
                name: person.name,
                office: office,
                level: level,
                party: person.party || 'Unknown',
                photoUrl: person.image || null,
                district: role.district || '',
                phones: [],
                emails: person.email ? [person.email] : [],
                urls: person.openstates_url ? [person.openstates_url] : [],
                address: null,
                channels: [],
                jurisdiction: jurisdiction.name || ''
            };
        });
    },

    /**
     * Get recent bills sponsored by a legislator
     * @param {string} jurisdiction - State name (e.g., "California")
     * @param {string} sponsorName - Legislator's last name
     * @param {number} limit - Max bills to return (default 5)
     * @returns {Promise<Array>} - Array of bills
     */
    async getBillsBySponsor(jurisdiction, sponsorName, limit = 5) {
        const params = new URLSearchParams({
            endpoint: 'bills',
            jurisdiction: jurisdiction,
            sponsor: sponsorName,
            include: 'sponsorships',
            per_page: limit.toString(),
            sort: 'latest_action_desc'
        });
        const url = `${this.OPENSTATES_PROXY}?${params.toString()}`;

        console.log(`  Bills API URL: ${url}`);

        try {
            const response = await fetch(url);
            console.log(`  Bills API response status: ${response.status}`);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Bills API error:', response.status, errorText);
                return [];
            }
            const data = await response.json();
            console.log(`  Bills API returned ${data.results?.length || 0} results`);
            return data.results || [];
        } catch (error) {
            console.error('Error fetching bills:', error);
            return [];
        }
    },

    /**
     * Get recent bills for multiple legislators
     * @param {Array} legislators - Array of legislator objects
     * @param {number} billsPerLegislator - Max bills per legislator
     * @returns {Promise<Array>} - Array of bills with legislator info
     */
    async getBillsForLegislators(legislators, billsPerLegislator = 5) {
        const allBills = [];
        const seenBillIds = new Set();

        // Get state legislators only
        const stateLegislators = legislators.filter(l => l.level === 'state');
        console.log(`Total legislators: ${legislators.length}, State legislators: ${stateLegislators.length}`);
        console.log('State legislators:', stateLegislators.map(l => ({ name: l.name, level: l.level, jurisdiction: l.jurisdiction })));

        for (const legislator of stateLegislators) {
            // Use person ID for sponsor search (more reliable than name matching)
            const sponsorId = legislator.id || legislator.name;

            console.log(`Fetching bills for ${legislator.name} (${sponsorId}) in ${legislator.jurisdiction}`);

            if (!legislator.jurisdiction) {
                console.log('  Skipping - no jurisdiction');
                continue;
            }

            const bills = await this.getBillsBySponsor(
                legislator.jurisdiction,
                sponsorId,
                billsPerLegislator
            );

            console.log(`  Found ${bills.length} bills for ${legislator.name}`);

            // Add bills to the list, avoiding duplicates
            for (const bill of bills) {
                if (seenBillIds.has(bill.id)) continue;

                seenBillIds.add(bill.id);
                allBills.push({
                    ...bill,
                    sponsorLegislator: legislator
                });
            }
        }

        // Sort by latest action date
        allBills.sort((a, b) =>
            new Date(b.latest_action_date) - new Date(a.latest_action_date)
        );

        return allBills.slice(0, 8); // Return top 8 most recent
    },

    /**
     * Get bills by subject/topic
     * @param {string} jurisdiction - State name
     * @param {string} subject - Topic to search for (e.g., "education", "healthcare")
     * @param {number} limit - Max bills to return
     * @returns {Promise<Array>} - Array of bills
     */
    async getBillsBySubject(jurisdiction, subject, limit = 10) {
        const params = new URLSearchParams({
            endpoint: 'bills',
            jurisdiction: jurisdiction,
            q: subject,
            include: 'sponsorships,votes',
            per_page: limit.toString(),
            sort: 'latest_action_desc'
        });

        const url = `${this.OPENSTATES_PROXY}?${params.toString()}`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                console.error('Bills by subject API error:', response.status);
                return [];
            }
            const data = await response.json();
            return data.results || [];
        } catch (error) {
            console.error('Error fetching bills by subject:', error);
            return [];
        }
    },

    /**
     * Extract vote records for legislators from bills
     * @param {Array} bills - Array of bills with votes included
     * @param {Array} legislators - Array of legislator objects
     * @returns {Array} - Vote records grouped by legislator
     */
    extractVoteRecords(bills, legislators) {
        const voteRecords = [];

        for (const bill of bills) {
            if (!bill.votes || bill.votes.length === 0) continue;

            for (const vote of bill.votes) {
                // Check if any of our legislators voted on this
                const individualVotes = vote.votes || [];

                for (const legislator of legislators) {
                    if (legislator.level !== 'state') continue;

                    const lastName = legislator.name.split(' ').pop().toLowerCase();

                    const theirVote = individualVotes.find(v => {
                        const voterName = (v.voter_name || '').toLowerCase();
                        return voterName.includes(lastName) || lastName.includes(voterName);
                    });

                    if (theirVote) {
                        voteRecords.push({
                            legislator: legislator,
                            bill: {
                                identifier: bill.identifier,
                                title: bill.title,
                                url: bill.openstates_url
                            },
                            vote: theirVote.option, // yea, nay, abstain, etc.
                            voteDate: vote.start_date,
                            motion: vote.motion_text,
                            result: vote.result
                        });
                    }
                }
            }
        }

        // Sort by date, most recent first
        voteRecords.sort((a, b) => new Date(b.voteDate) - new Date(a.voteDate));

        return voteRecords.slice(0, 12); // Return top 12 vote records
    },

    /**
     * State elections websites - official Secretary of State sites
     */
    STATE_ELECTIONS_WEBSITES: {
        'Alabama': 'https://sos.alabama.gov/alabama-votes',
        'Alaska': 'https://www.elections.alaska.gov/',
        'Arizona': 'https://azsos.gov/elections',
        'Arkansas': 'https://www.sos.arkansas.gov/elections',
        'California': 'https://www.sos.ca.gov/elections',
        'Colorado': 'https://www.sos.state.co.us/pubs/elections/main.html',
        'Connecticut': 'https://portal.ct.gov/SOTS/Common-Elements/V5-Template---Redesign/Elections--Voting--Home-Page',
        'Delaware': 'https://elections.delaware.gov/index.shtml',
        'District of Columbia': 'https://www.dcboe.org/',
        'Florida': 'https://dos.myflorida.com/elections/',
        'Georgia': 'https://sos.ga.gov/index.php/?section=elections',
        'Hawaii': 'http://hawaii.gov/elections',
        'Idaho': 'https://sos.idaho.gov/elections-division/',
        'Illinois': 'https://www.elections.il.gov/',
        'Indiana': 'https://www.in.gov/sos/elections/',
        'Iowa': 'https://sos.iowa.gov/elections/voterinformation/index.html',
        'Kansas': 'https://sos.ks.gov/elections/elections.html',
        'Kentucky': 'https://elect.ky.gov/Pages/default.aspx',
        'Louisiana': 'https://www.sos.la.gov/electionsandvoting/Pages/default.aspx',
        'Maine': 'https://www.maine.gov/sos/cec/elec/',
        'Maryland': 'https://elections.maryland.gov/',
        'Massachusetts': 'https://www.sec.state.ma.us/ele/eleidx.htm',
        'Michigan': 'https://www.michigan.gov/sos/elections',
        'Minnesota': 'https://www.sos.state.mn.us/elections-voting/',
        'Mississippi': 'https://www.sos.ms.gov/elections-voting',
        'Missouri': 'https://www.sos.mo.gov/elections',
        'Montana': 'https://sosmt.gov/elections/',
        'Nebraska': 'https://www.nebraska.gov/featured/elections-voting/',
        'Nevada': 'https://www.nvsos.gov/sos/elections',
        'New Hampshire': 'https://www.sos.nh.gov/elections',
        'New Jersey': 'https://www.state.nj.us/state/elections/index.shtml',
        'New Mexico': 'https://www.sos.state.nm.us/voting-and-elections/',
        'New York': 'https://www.elections.ny.gov/',
        'North Carolina': 'https://www.ncsbe.gov/',
        'North Dakota': 'https://vip.sos.nd.gov/PortalList.aspx',
        'Ohio': 'https://www.ohiosos.gov/elections/',
        'Oklahoma': 'https://oklahoma.gov/elections.html',
        'Oregon': 'https://sos.oregon.gov/voting-elections/Pages/default.aspx',
        'Pennsylvania': 'https://www.dos.pa.gov/VotingElections/Pages/default.aspx',
        'Rhode Island': 'https://vote.sos.ri.gov/',
        'South Carolina': 'https://www.scvotes.org/',
        'South Dakota': 'https://sdsos.gov/elections-voting/default.aspx',
        'Tennessee': 'https://sos.tn.gov/elections',
        'Texas': 'https://www.sos.state.tx.us/elections/index.shtml',
        'Utah': 'https://elections.utah.gov/',
        'Vermont': 'https://sos.vermont.gov/elections/',
        'Virginia': 'https://www.elections.virginia.gov/',
        'Washington': 'https://www.sos.wa.gov/elections/',
        'West Virginia': 'https://sos.wv.gov/elections/Pages/default.aspx',
        'Wisconsin': 'https://elections.wi.gov/',
        'Wyoming': 'https://sos.wyo.gov/Elections/'
    },

    /**
     * Get the official elections website for a state
     * @param {string} stateName - Full state name (e.g., "California")
     * @returns {string|null} - URL or null if not found
     */
    getStateElectionsWebsite(stateName) {
        if (!stateName) return null;
        // Try direct match first
        if (this.STATE_ELECTIONS_WEBSITES[stateName]) {
            return this.STATE_ELECTIONS_WEBSITES[stateName];
        }
        // Try case-insensitive match
        const normalized = stateName.trim();
        for (const [state, url] of Object.entries(this.STATE_ELECTIONS_WEBSITES)) {
            if (state.toLowerCase() === normalized.toLowerCase()) {
                return url;
            }
        }
        return null;
    },

    /**
     * Available bill subjects/topics for filtering
     */
    BILL_SUBJECTS: [
        { id: 'education', label: 'Education', emoji: '📚' },
        { id: 'healthcare', label: 'Healthcare', emoji: '🏥' },
        { id: 'taxes', label: 'Taxes', emoji: '💰' },
        { id: 'environment', label: 'Environment', emoji: '🌿' },
        { id: 'housing', label: 'Housing', emoji: '🏠' },
        { id: 'transportation', label: 'Transportation', emoji: '🚗' },
        { id: 'public safety', label: 'Public Safety', emoji: '🛡️' },
        { id: 'elections', label: 'Elections', emoji: '🗳️' }
    ],

    /**
     * Get voter/ballot info from Google Civic Information API
     * Returns election info, polling places, and ballot contests
     * If no current election, tries to fetch the most recent past election
     * @param {string} address - Full address to look up
     * @returns {Promise<object>} - Voter info including election, polling, contests
     */
    async getVoterInfo(address) {
        // First try without election ID (gets current/upcoming election)
        let result = await this.fetchVoterInfo(address, null);

        // If no current election, try to get the most recent election
        if (result.noElection) {
            console.log('No current election, checking for recent elections...');
            const elections = await this.getElections();

            if (elections.length > 0) {
                // Filter out the "VIP Test Election" and sort by date descending
                const realElections = elections.filter(e =>
                    e.id !== '2000' && !e.name.toLowerCase().includes('test')
                );

                // Sort by election day (most recent first)
                realElections.sort((a, b) => {
                    const dateA = new Date(a.electionDay || '1900-01-01');
                    const dateB = new Date(b.electionDay || '1900-01-01');
                    return dateB - dateA;
                });

                console.log('Available elections:', realElections.map(e => `${e.name} (${e.electionDay})`));

                // Try the most recent elections until we find one with data
                for (const election of realElections.slice(0, 3)) {
                    console.log(`Trying election: ${election.name} (ID: ${election.id})`);
                    const electionResult = await this.fetchVoterInfo(address, election.id);

                    if (!electionResult.noElection && electionResult.contests.length > 0) {
                        electionResult.isPastElection = true;
                        return electionResult;
                    }
                }
            }
        }

        return result;
    },

    /**
     * Fetch voter info for a specific election (or current if no ID)
     * @param {string} address - Full address to look up
     * @param {string|null} electionId - Optional election ID
     * @returns {Promise<object>} - Voter info
     */
    async fetchVoterInfo(address, electionId) {
        const apiUrl = new URL(`${this.GOOGLE_CIVIC_URL}/voterinfo`);
        apiUrl.searchParams.append('address', address);
        apiUrl.searchParams.append('key', this.GOOGLE_CIVIC_API_KEY);
        if (electionId) {
            apiUrl.searchParams.append('electionId', electionId);
        }

        console.log('Fetching voter info for:', address, electionId ? `(election ${electionId})` : '(current)');

        try {
            const response = await fetch(apiUrl.toString());

            if (!response.ok) {
                const error = await response.json();
                console.log('Voter info API response:', error);

                // "Election unknown" or no election means no active election
                if (error.error?.message?.includes('Election') ||
                    error.error?.message?.includes('election') ||
                    error.error?.code === 400) {
                    return {
                        election: null,
                        pollingLocations: [],
                        earlyVoteSites: [],
                        dropOffLocations: [],
                        contests: [],
                        state: null,
                        noElection: true
                    };
                }
                throw new Error(error.error?.message || 'Failed to fetch voter info');
            }

            const data = await response.json();
            console.log('Voter info received:', data);

            return {
                election: data.election || null,
                pollingLocations: data.pollingLocations || [],
                earlyVoteSites: data.earlyVoteSites || [],
                dropOffLocations: data.dropOffLocations || [],
                contests: data.contests || [],
                state: data.state?.[0] || null,
                noElection: false,
                isPastElection: false
            };
        } catch (error) {
            console.error('Error fetching voter info:', error);
            return {
                election: null,
                pollingLocations: [],
                earlyVoteSites: [],
                dropOffLocations: [],
                contests: [],
                state: null,
                noElection: true,
                error: error.message
            };
        }
    },

    /**
     * Get list of elections from Google Civic API
     * @returns {Promise<Array>} - Array of elections
     */
    async getElections() {
        const apiUrl = new URL(`${this.GOOGLE_CIVIC_URL}/elections`);
        apiUrl.searchParams.append('key', this.GOOGLE_CIVIC_API_KEY);

        try {
            const response = await fetch(apiUrl.toString());
            if (!response.ok) {
                throw new Error('Failed to fetch elections');
            }
            const data = await response.json();
            console.log('Elections available:', data.elections?.length || 0);
            return data.elections || [];
        } catch (error) {
            console.error('Error fetching elections:', error);
            return [];
        }
    },

    /**
     * Parse contest data into a simpler format
     * @param {object} voterInfo - Raw voter info response
     * @returns {Array} - Simplified contest array
     */
    parseContests(voterInfo) {
        if (!voterInfo.contests) {
            return [];
        }

        return voterInfo.contests.map(contest => {
            const level = this.determineLevel(contest);

            if (contest.type === 'Referendum') {
                return {
                    type: 'measure',
                    level: level,
                    title: contest.referendumTitle || contest.office || 'Ballot Measure',
                    subtitle: contest.referendumSubtitle || '',
                    description: contest.referendumText || contest.referendumBrief || '',
                    proStatement: contest.referendumProStatement || null,
                    conStatement: contest.referendumConStatement || null,
                    options: contest.ballotResponses || ['Yes', 'No']
                };
            }

            return {
                type: 'race',
                level: level,
                office: contest.office || 'Unknown Office',
                district: contest.district?.name || '',
                candidates: (contest.candidates || []).map(c => ({
                    name: c.name,
                    party: c.party || 'No party listed',
                    photoUrl: c.photoUrl || null,
                    website: c.candidateUrl || null,
                    email: c.email || null,
                    phone: c.phone || null,
                    channels: c.channels || []
                }))
            };
        });
    },

    determineLevel(contest) {
        const office = (contest.office || '').toLowerCase();

        if (office.includes('president') ||
            office.includes('u.s. senator') ||
            office.includes('u.s. representative') ||
            office.includes('united states')) {
            return 'federal';
        }

        if (office.includes('governor') ||
            office.includes('state senator') ||
            office.includes('state representative') ||
            office.includes('state assembly') ||
            office.includes('attorney general') ||
            office.includes('secretary of state')) {
            return 'state';
        }

        return 'local';
    },

    /**
     * Get legislative district boundaries from Census Bureau TIGERweb
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @returns {Promise<object>} - GeoJSON features for districts
     */
    async getDistrictBoundaries(lat, lng) {
        const results = {
            congressional: null,
            stateSenate: null,
            stateHouse: null
        };

        // Census TIGERweb MapServer layers (current/most recent):
        // 0 = 119th Congressional Districts
        // 1 = 2024 State Legislative Districts - Upper (Senate)
        // 2 = 2024 State Legislative Districts - Lower (House/Assembly)

        const baseUrl = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer';

        const layers = [
            { id: 0, name: 'congressional', label: 'Congressional District' },
            { id: 1, name: 'stateSenate', label: 'State Senate District' },
            { id: 2, name: 'stateHouse', label: 'State House District' }
        ];

        // Fetch all district boundaries in parallel
        const promises = layers.map(async (layer) => {
            try {
                const url = `${baseUrl}/${layer.id}/query?` + new URLSearchParams({
                    geometry: `${lng},${lat}`,
                    geometryType: 'esriGeometryPoint',
                    inSR: '4326',
                    spatialRel: 'esriSpatialRelIntersects',
                    outFields: '*',
                    returnGeometry: true,
                    f: 'geojson'
                });

                const response = await fetch(url);
                if (!response.ok) {
                    console.error(`Failed to fetch ${layer.name} district`);
                    return null;
                }

                const data = await response.json();
                if (data.features && data.features.length > 0) {
                    const feature = data.features[0];
                    feature.properties.districtType = layer.name;
                    feature.properties.districtLabel = layer.label;
                    return { name: layer.name, feature };
                }
                return null;
            } catch (error) {
                console.error(`Error fetching ${layer.name} district:`, error);
                return null;
            }
        });

        const districtResults = await Promise.all(promises);

        districtResults.forEach(result => {
            if (result) {
                results[result.name] = result.feature;
            }
        });

        console.log('District boundaries fetched:', results);
        return results;
    },

    /**
     * Get all congressional districts for a state
     * @param {string} stateFips - State FIPS code (e.g., "17" for Illinois)
     * @returns {Promise<Array>} - Array of district features with geometry
     */
    async getAllCongressionalDistricts(stateFips) {
        const baseUrl = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer';

        // Layer 0 = 119th Congressional Districts
        const url = `${baseUrl}/0/query?` + new URLSearchParams({
            where: `STATE='${stateFips}'`,
            outFields: '*',
            returnGeometry: true,
            f: 'geojson'
        });

        try {
            const response = await fetch(url);
            if (!response.ok) {
                console.error('Failed to fetch state congressional districts');
                return [];
            }

            const data = await response.json();
            if (data.features && data.features.length > 0) {
                // Sort by district number
                return data.features.sort((a, b) => {
                    const numA = parseInt(a.properties.CD119FP || a.properties.BASENAME || '0');
                    const numB = parseInt(b.properties.CD119FP || b.properties.BASENAME || '0');
                    return numA - numB;
                });
            }
            return [];
        } catch (error) {
            console.error('Error fetching state congressional districts:', error);
            return [];
        }
    },

    // State name to FIPS code mapping
    STATE_FIPS: {
        'Alabama': '01', 'Alaska': '02', 'Arizona': '04', 'Arkansas': '05',
        'California': '06', 'Colorado': '08', 'Connecticut': '09', 'Delaware': '10',
        'Florida': '12', 'Georgia': '13', 'Hawaii': '15', 'Idaho': '16',
        'Illinois': '17', 'Indiana': '18', 'Iowa': '19', 'Kansas': '20',
        'Kentucky': '21', 'Louisiana': '22', 'Maine': '23', 'Maryland': '24',
        'Massachusetts': '25', 'Michigan': '26', 'Minnesota': '27', 'Mississippi': '28',
        'Missouri': '29', 'Montana': '30', 'Nebraska': '31', 'Nevada': '32',
        'New Hampshire': '33', 'New Jersey': '34', 'New Mexico': '35', 'New York': '36',
        'North Carolina': '37', 'North Dakota': '38', 'Ohio': '39', 'Oklahoma': '40',
        'Oregon': '41', 'Pennsylvania': '42', 'Rhode Island': '44', 'South Carolina': '45',
        'South Dakota': '46', 'Tennessee': '47', 'Texas': '48', 'Utah': '49',
        'Vermont': '50', 'Virginia': '51', 'Washington': '53', 'West Virginia': '54',
        'Wisconsin': '55', 'Wyoming': '56', 'District of Columbia': '11'
    }
};

// Export the API
window.CivicAPI = CivicAPI;
