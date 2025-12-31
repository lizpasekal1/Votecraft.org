/**
 * Civic Data API Client
 *
 * Uses OpenStates API for state legislators
 * Uses Census Geocoder for address -> lat/lng conversion
 */

const CivicAPI = {
    // OpenStates API key - get yours at https://open.pluralpolicy.com/
    OPENSTATES_API_KEY: '064f1e91-b0a3-4e4b-b4c7-4313e70bc47d',
    OPENSTATES_URL: 'https://v3.openstates.org',

    // CORS proxy for OpenStates API (needed for browser requests)
    // corsproxy.io blocks curl but works from browsers
    CORS_PROXY: 'https://corsproxy.io/?',

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
        const apiUrl = new URL(`${this.OPENSTATES_URL}/people.geo`);
        apiUrl.searchParams.append('lat', lat);
        apiUrl.searchParams.append('lng', lng);
        apiUrl.searchParams.append('apikey', this.OPENSTATES_API_KEY);

        // Use CORS proxy for browser requests (corsproxy.io doesn't need encoding)
        const url = this.CORS_PROXY + apiUrl.toString();

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
        // Use 'q' parameter for text search since 'sponsor' filter is unreliable
        const apiUrl = new URL(`${this.OPENSTATES_URL}/bills`);
        apiUrl.searchParams.append('jurisdiction', jurisdiction);
        apiUrl.searchParams.append('q', sponsorName);
        apiUrl.searchParams.append('include', 'sponsorships');
        apiUrl.searchParams.append('per_page', limit.toString());
        apiUrl.searchParams.append('sort', 'latest_action_desc');
        apiUrl.searchParams.append('apikey', this.OPENSTATES_API_KEY);

        const url = this.CORS_PROXY + apiUrl.toString();

        console.log(`  API URL: ${apiUrl.toString()}`);

        try {
            const response = await fetch(url);
            if (!response.ok) {
                console.error('Bills API error:', response.status);
                return [];
            }
            const data = await response.json();
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
    async getBillsForLegislators(legislators, billsPerLegislator = 3) {
        const allBills = [];
        const seenBillIds = new Set();

        // Get state legislators only
        const stateLegislators = legislators.filter(l => l.level === 'state');

        for (const legislator of stateLegislators) {
            // Extract last name for sponsor search
            const nameParts = legislator.name.split(' ');
            const lastName = nameParts[nameParts.length - 1];

            console.log(`Fetching bills for ${legislator.name} (${lastName}) in ${legislator.jurisdiction}`);

            if (!legislator.jurisdiction) {
                console.log('  Skipping - no jurisdiction');
                continue;
            }

            const bills = await this.getBillsBySponsor(
                legislator.jurisdiction,
                lastName,
                billsPerLegislator
            );

            console.log(`  Found ${bills.length} bills for ${lastName}`);

            // Filter to only bills where this legislator is a primary sponsor
            // and add legislator reference
            for (const bill of bills) {
                if (seenBillIds.has(bill.id)) continue;

                // Check if this legislator is a primary sponsor
                // Match by last name (case-insensitive) or full name contains last name
                const isPrimarySponsor = bill.sponsorships?.some(s => {
                    if (!s.primary) return false;
                    const sponsorName = s.name.toLowerCase();
                    const searchName = lastName.toLowerCase();
                    return sponsorName === searchName ||
                           sponsorName.includes(searchName) ||
                           searchName.includes(sponsorName);
                });

                if (isPrimarySponsor) {
                    seenBillIds.add(bill.id);
                    allBills.push({
                        ...bill,
                        sponsorLegislator: legislator
                    });
                }
            }
        }

        // Sort by latest action date
        allBills.sort((a, b) =>
            new Date(b.latest_action_date) - new Date(a.latest_action_date)
        );

        return allBills.slice(0, 6); // Return top 6 most recent
    },

    /**
     * Get voter/ballot info - placeholder for future election data
     * Note: This would need an election data source
     */
    async getVoterInfo(address) {
        // For now, return empty - ballot data requires active elections
        return {
            election: null,
            contests: []
        };
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
    }
};

// Export the API
window.CivicAPI = CivicAPI;
