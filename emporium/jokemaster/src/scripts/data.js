/**
 * Centralized Game Data for JokeMaster
 *
 * This file contains all static game content including:
 * - Cities with their contacts
 * - Comedians available for recruitment
 * - Artifacts to collect
 * - Jokes for gameplay
 *
 * To scale to 200+ contacts:
 * 1. Add new cities to the cities object
 * 2. Add contacts to each city's contacts array
 * 3. No code changes needed - templates handle rendering automatically
 *
 * @see TEMPLATING_GUIDE.md for detailed instructions
 * @version 1.0
 */

const GameData = {
    // Cities with their contacts
    cities: {
        'London': {
            id: 'london',
            emoji: '🇬🇧',
            country: 'United Kingdom',
            latitude: 51.5,
            longitude: -0.1,
            locked: false,
            contacts: [
                {
                    id: 'marcus-chen',
                    name: "Marcus Chen",
                    portrait: "🎩",
                    role: "Tech Entrepreneur",
                    location: "London, UK",
                    details: "Founder of several successful startups",
                    completed: false,
                    bio: "Marcus is a serial tech entrepreneur who has founded several successful startups in the fintech and AI space. He's known for his sharp business acumen and love of British humor.",
                    interaction: "You met Marcus at a technology conference in London where he was captivated by your jokes about startup culture and venture capital. He laughed so hard at your 'pivot or perish' bit that he nearly spilled his Earl Grey tea.",
                    jokeTypes: ["Observational", "Wordplay", "Dark Humor"],
                    funding: 5000,
                    referralMessage: "You absolutely must meet Victoria Holmes, my publisher friend. She's looking for someone with your wit to write comedy pieces for her new anthology. Tell her I sent you!"
                },
                {
                    id: 'victoria-holmes',
                    name: "Victoria Holmes",
                    portrait: "📚",
                    role: "Publisher",
                    location: "London, UK",
                    details: "CEO of independent publishing house",
                    completed: false
                },
                {
                    id: 'amir-khan',
                    name: "Amir Khan",
                    portrait: "🎵",
                    role: "Music Producer",
                    location: "London, UK",
                    details: "Grammy-nominated producer and composer",
                    completed: false
                }
            ]
        },
        'Mumbai': {
            id: 'mumbai',
            emoji: '🇮🇳',
            country: 'India',
            latitude: 19.0,
            longitude: 72.8,
            locked: false,
            contacts: [
                {
                    id: 'raj-patel',
                    name: "Raj Patel",
                    portrait: "🎬",
                    role: "Film Producer",
                    location: "Mumbai, India",
                    details: "Bollywood producer with global reach",
                    completed: false,
                    bio: "Raj is a prominent Bollywood film producer with connections across the global entertainment industry. His productions are known for blending traditional Indian cinema with modern storytelling.",
                    interaction: "You encountered Raj at a film festival in Mumbai. Your comedic timing and observational humor about the entertainment industry impressed him so much that he asked for your contact information to discuss potential collaborations.",
                    jokeTypes: ["Observational", "One-liners", "Absurdist"],
                    funding: 8000,
                    referralMessage: "I'm working with Priya Sharma on my next film. She's an incredible choreographer who appreciates good humor. You two would get along brilliantly - go introduce yourself!"
                },
                {
                    id: 'priya-sharma',
                    name: "Priya Sharma",
                    portrait: "💃",
                    role: "Choreographer",
                    location: "Mumbai, India",
                    details: "Award-winning dance director",
                    completed: false
                },
                {
                    id: 'arjun-mehta',
                    name: "Arjun Mehta",
                    portrait: "🏢",
                    role: "Venture Capitalist",
                    location: "Mumbai, India",
                    details: "Founding partner at tech investment firm",
                    completed: false
                },
                {
                    id: 'kavya-singh',
                    name: "Kavya Singh",
                    portrait: "📱",
                    role: "App Developer",
                    location: "Mumbai, India",
                    details: "Founder of successful startup",
                    completed: false
                }
            ]
        },
        'New York': {
            id: 'new-york',
            emoji: '🗽',
            country: 'United States',
            latitude: 40.7,
            longitude: -74.0,
            locked: false,
            contacts: [
                {
                    id: 'sarah-williams',
                    name: "Dr. Sarah Williams",
                    portrait: "🔬",
                    role: "Research Scientist",
                    location: "New York, USA",
                    details: "Leading expert in cognitive psychology",
                    completed: false,
                    bio: "Dr. Williams is a leading cognitive psychology researcher at Columbia University, specializing in the neuroscience of humor and laughter. Her work has been published in major scientific journals.",
                    interaction: "You met Dr. Williams after performing at a corporate event in New York. She approached you to discuss how your comedic techniques align with psychological principles of humor. Your joke about overthinking made her genuinely laugh while taking notes.",
                    jokeTypes: ["Clever", "Observational", "Self-deprecating"],
                    funding: 3500,
                    referralMessage: "There's a sports agent named Michael Torres I collaborate with on performance psychology. He works with high-pressure athletes and could use someone who understands timing like you do."
                },
                {
                    id: 'michael-torres',
                    name: "Michael Torres",
                    portrait: "🏀",
                    role: "Sports Agent",
                    location: "New York, USA",
                    details: "Represents top athletes in basketball",
                    completed: false
                },
                {
                    id: 'rachel-green',
                    name: "Rachel Green",
                    portrait: "👗",
                    role: "Fashion Designer",
                    location: "New York, USA",
                    details: "Creative director at luxury fashion brand",
                    completed: false
                },
                {
                    id: 'david-park',
                    name: "David Park",
                    portrait: "💻",
                    role: "Software Engineer",
                    location: "New York, USA",
                    details: "Lead developer at major tech company",
                    completed: false
                }
            ]
        },
        'Paris': {
            id: 'paris',
            emoji: '🇫🇷',
            country: 'France',
            latitude: 48.8,
            longitude: 2.3,
            locked: false,
            contacts: [
                {
                    id: 'james-rodriguez',
                    name: "James Rodriguez",
                    portrait: "🎭",
                    role: "Theater Director",
                    location: "Paris, France",
                    details: "Renowned for avant-garde productions",
                    completed: false
                },
                {
                    id: 'camille-dubois',
                    name: "Camille Dubois",
                    portrait: "🍷",
                    role: "Sommelier",
                    location: "Paris, France",
                    details: "Master sommelier and wine consultant",
                    completed: false,
                    bio: "Camille is a master sommelier and wine consultant who has worked with Michelin-starred restaurants across France. She has an encyclopedic knowledge of wine and a sophisticated sense of humor.",
                    interaction: "You crossed paths with Camille at a wine tasting event in Paris. Your witty observations about wine culture and French sophistication charmed her, and she spent the evening sharing stories and recommending her favorite vintages.",
                    jokeTypes: ["Sophisticated", "Wordplay", "Puns"],
                    funding: 4500,
                    referralMessage: "My friend James Rodriguez directs theater here in Paris. He's always looking for fresh comedic perspectives for his productions. Mention my name and he'll give you a warm welcome."
                }
            ]
        },
        'Tokyo': {
            id: 'tokyo',
            emoji: '🇯🇵',
            country: 'Japan',
            latitude: 35.6,
            longitude: 139.7,
            locked: true,
            contacts: [
                {
                    id: 'zara-okonkwo',
                    name: "Zara Okonkwo",
                    portrait: "⚓",
                    role: "Business Executive",
                    location: "Tokyo, Japan",
                    details: "CEO of international trading company",
                    completed: false
                },
                {
                    id: 'hiroshi-tanaka',
                    name: "Hiroshi Tanaka",
                    portrait: "🎮",
                    role: "Game Developer",
                    location: "Tokyo, Japan",
                    details: "Creative director at gaming studio",
                    completed: false
                },
                {
                    id: 'yuki-nakamura',
                    name: "Yuki Nakamura",
                    portrait: "🍱",
                    role: "Chef",
                    location: "Tokyo, Japan",
                    details: "Michelin-starred sushi master",
                    completed: false
                }
            ]
        },
        'Sydney': {
            id: 'sydney',
            emoji: '🇦🇺',
            country: 'Australia',
            latitude: -33.8,
            longitude: 151.2,
            locked: true,
            contacts: [
                {
                    id: 'emma-thompson',
                    name: "Emma Thompson",
                    portrait: "🎨",
                    role: "Creative Director",
                    location: "Sydney, Australia",
                    details: "Award-winning advertising executive",
                    completed: false
                }
            ]
        },
        'Dubai': {
            id: 'dubai',
            emoji: '🇦🇪',
            country: 'United Arab Emirates',
            latitude: 25.2,
            longitude: 55.3,
            locked: true,
            contacts: [
                {
                    id: 'omar-hassan',
                    name: "Omar Hassan",
                    portrait: "🏗️",
                    role: "Real Estate Developer",
                    location: "Dubai, UAE",
                    details: "Visionary architect and property mogul",
                    completed: false
                },
                {
                    id: 'fatima-al-sayed',
                    name: "Fatima Al-Sayed",
                    portrait: "✈️",
                    role: "Airline Executive",
                    location: "Dubai, UAE",
                    details: "VP of operations at international airline",
                    completed: false
                }
            ]
        },
        'São Paulo': {
            id: 'sao-paulo',
            emoji: '🇧🇷',
            country: 'Brazil',
            latitude: -23.5,
            longitude: -46.6,
            locked: true,
            contacts: [
                {
                    id: 'isabella-santos',
                    name: "Isabella Santos",
                    portrait: "⚽",
                    role: "Sports Marketing Director",
                    location: "São Paulo, Brazil",
                    details: "Former athlete turned marketing innovator",
                    completed: false
                },
                {
                    id: 'lucas-silva',
                    name: "Lucas Silva",
                    portrait: "🎸",
                    role: "Musician",
                    location: "São Paulo, Brazil",
                    details: "Lead guitarist in popular Brazilian band",
                    completed: false
                },
                {
                    id: 'ana-oliveira',
                    name: "Ana Oliveira",
                    portrait: "🌿",
                    role: "Environmental Scientist",
                    location: "São Paulo, Brazil",
                    details: "Rainforest conservation specialist",
                    completed: false
                }
            ]
        },
        'Toronto': {
            id: 'toronto',
            emoji: '🇨🇦',
            country: 'Canada',
            latitude: 43.6,
            longitude: -79.4,
            locked: true,
            contacts: [
                {
                    id: 'sophie-laurent',
                    name: "Sophie Laurent",
                    portrait: "💼",
                    role: "Investment Banker",
                    location: "Toronto, Canada",
                    details: "Managing director at major financial firm",
                    completed: false
                },
                {
                    id: 'james-oconnor',
                    name: "James O'Connor",
                    portrait: "🏒",
                    role: "Hockey Coach",
                    location: "Toronto, Canada",
                    details: "Former professional player and analyst",
                    completed: false
                }
            ]
        }
    },

    // Comedians database
    comedians: [
        {
            id: 'robin',
            name: "Robin Quick",
            emoji: "🎤",
            style: "Improvisation Master",
            location: "London",
            description: "A master of spontaneous wit, Robin can turn any awkward moment into comedic gold.",
            bonus: {
                type: "tag_boost",
                tags: ["observational", "self-deprecating"],
                boost: 5
            },
            cost: 2,
            recruited: false,
            locked: false
        },
        {
            id: 'maria',
            name: "Maria Santos",
            emoji: "🎭",
            style: "Storytelling Specialist",
            location: "São Paulo",
            description: "Her narratives weave humor and heart, making audiences feel deeply while they laugh.",
            bonus: {
                type: "tag_boost",
                tags: ["wholesome", "political"],
                boost: 5
            },
            cost: 2,
            recruited: false,
            locked: true
        },
        {
            id: 'kai',
            name: "Kai Chen",
            emoji: "💻",
            style: "Tech Satirist",
            location: "Singapore",
            description: "A tech comedian who perfectly skewers startup culture and digital absurdities.",
            bonus: {
                type: "tag_boost",
                tags: ["tech", "ambitious"],
                boost: 5
            },
            cost: 2,
            recruited: false,
            locked: true
        }
    ],

    // Artifacts database
    artifacts: [
        {
            id: 'fake_mustache',
            name: "Groucho's Disguise",
            emoji: "🥸",
            description: "A classic fake mustache. Makes you 10% more mysterious, 100% more ridiculous.",
            effect: "Reduces favor loss by 5 points when jokes don't land",
            rarity: "common",
            location: "London",
            found: false,
            locked: false
        },
        {
            id: 'red_nose',
            name: "Clown's Courage",
            emoji: "🔴",
            description: "A bright red nose that reminds you not to take yourself too seriously.",
            effect: "+1 Laugh Energy after each successful joke",
            rarity: "common",
            location: "São Paulo",
            found: false,
            locked: true
        },
        {
            id: 'monocle',
            name: "Distinguished Monocle",
            emoji: "🧐",
            description: "Wear this to appear more sophisticated. Works surprisingly well.",
            effect: "+8 favor when using 'corporate' or 'ambitious' tags",
            rarity: "uncommon",
            location: "Singapore",
            found: false,
            locked: true
        },
        {
            id: 'jester_hat',
            name: "Court Jester's Cap",
            emoji: "🎪",
            description: "A jingling hat that grants you the fool's privilege to speak truth to power.",
            effect: "+8 favor when using 'political' or 'controversial' tags",
            rarity: "uncommon",
            location: "Lagos",
            found: false,
            locked: true
        },
        {
            id: 'comedy_badge',
            name: "Veteran's Comedy Badge",
            emoji: "🏅",
            description: "Proof you've been doing this long enough to know what works.",
            effect: "All jokes cost 1 less energy (minimum 1)",
            rarity: "rare",
            location: "Mexico City",
            found: false,
            locked: true
        },
        {
            id: 'lucky_tie',
            name: "The Lucky Tie",
            emoji: "👔",
            description: "A hideous tie that somehow always brings good fortune.",
            effect: "20% chance to reroll a failed joke outcome",
            rarity: "rare",
            location: "New York",
            found: false,
            locked: true
        }
    ],

    // Jokes database
    jokes: [
        {
            id: 1,
            text: "I tried to start a world-changing movement once before. Turns out, I couldn't even get my roommate to recycle.",
            tags: ["self-deprecating", "observational"],
            energyCost: 1,
            appeal: "Safe"
        },
        {
            id: 2,
            text: "My project is like a startup: overpromised, underfunded, and one pivot away from selling artisanal coffee subscriptions.",
            tags: ["tech", "self-deprecating", "ambitious"],
            energyCost: 2,
            appeal: "Medium"
        },
        {
            id: 3,
            text: "They say change comes from within. I say it comes from filling out the right grant applications and knowing whose calls to return.",
            tags: ["political", "observational"],
            energyCost: 2,
            appeal: "Medium"
        },
        {
            id: 4,
            text: "You know what's harder than changing the world? Convincing my mom I'm doing something practical with my life. But here we are!",
            tags: ["wholesome", "self-deprecating"],
            energyCost: 1,
            appeal: "Safe"
        },
        {
            id: 5,
            text: "Most people see problems. I see opportunities waiting for someone bold enough to grab them. That someone is me.",
            tags: ["boastful", "ambitious"],
            energyCost: 3,
            appeal: "Risky"
        },
        {
            id: 6,
            text: "I've been to enough board meetings to know that 'synergy' is just a fancy word for 'we have no idea what we're doing.'",
            tags: ["corporate", "observational"],
            energyCost: 2,
            appeal: "Medium"
        },
        {
            id: 7,
            text: "Funny how everyone wants to change the world until they find out it involves actual work and not just Instagram posts.",
            tags: ["observational", "political"],
            energyCost: 1,
            appeal: "Safe"
        },
        {
            id: 8,
            text: "The system isn't broken - it's working exactly as designed. Just not for us. Time to redesign it.",
            tags: ["political", "controversial"],
            energyCost: 3,
            appeal: "Risky"
        }
    ]
};

// Helper functions for data access
GameData.getCityById = function(cityId) {
    return Object.values(this.cities).find(city => city.id === cityId);
};

GameData.getContactById = function(contactId) {
    for (const city of Object.values(this.cities)) {
        const contact = city.contacts.find(c => c.id === contactId);
        if (contact) return contact;
    }
    return null;
};

GameData.getComedianById = function(comedianId) {
    return this.comedians.find(c => c.id === comedianId);
};

GameData.getArtifactById = function(artifactId) {
    return this.artifacts.find(a => a.id === artifactId);
};

GameData.getJokeById = function(jokeId) {
    return this.jokes.find(j => j.id === jokeId);
};

// Export for use in other scripts
window.GameData = GameData;
