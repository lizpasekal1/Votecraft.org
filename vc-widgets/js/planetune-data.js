/**
 * Planetune.up Location Data
 * Playlist/location data for the map-based music discovery app
 */

const PLANETUNE_PLAYLISTS = [
    {
        id: 1,
        name: "Funky on 45th Diner",
        location: "650 9th Ave, New York, NY",
        creator: "DJ Groove",
        likes: 123,
        hasPlasticSavers: true,
        description: "Feel the buzz of the city at midnight. This playlist captures that electric feeling of being in a classic NYC diner after dark, where the stories are as rich as the milkshakes.",
        spotifyUrl: "https://open.spotify.com/embed/playlist/37i9dQZF1DX4dyzvuaRJ0n",
        tracks: [
            { name: "Midnight City", artist: "M83" },
            { name: "Electric Feel", artist: "MGMT" },
            { name: "Take Five", artist: "Dave Brubeck" }
        ]
    },
    {
        id: 2,
        name: "SoHo Morning Coffee",
        location: "281 Lafayette St, New York, NY",
        creator: "Sarah Martinez",
        likes: 89,
        hasPlasticSavers: false,
        description: "Wake up to the gentle rhythm of SoHo mornings. Acoustic vibes and mellow beats perfect for sipping your latte while watching the neighborhood come alive.",
        spotifyUrl: "https://open.spotify.com/embed/playlist/37i9dQZF1DWXe9gFZP0gtP",
        tracks: [
            { name: "Here Comes The Sun", artist: "The Beatles" },
            { name: "Morning Glow", artist: "Yebba" },
            { name: "Banana Pancakes", artist: "Jack Johnson" }
        ]
    },
    {
        id: 3,
        name: "Brooklyn Bridge Sunset",
        location: "Brooklyn Bridge, New York, NY",
        creator: "Marcus Chen",
        likes: 234,
        hasPlasticSavers: true,
        description: "Golden hour vibes as the sun sets over the East River. This playlist captures the magic of that perfect moment when day turns to night over the iconic bridge.",
        spotifyUrl: "https://open.spotify.com/embed/playlist/37i9dQZF1DX3rxVfibe1L0",
        tracks: [
            { name: "Golden Hour", artist: "Kacey Musgraves" },
            { name: "Sunset Lover", artist: "Petit Biscuit" },
            { name: "Brooklyn", artist: "Goo Goo Dolls" }
        ]
    },
    {
        id: 4,
        name: "Central Park Vibes",
        location: "Central Park West, New York, NY",
        creator: "Alex Rivers",
        likes: 156,
        hasPlasticSavers: false,
        description: "Peaceful strolls through the green heart of Manhattan. The perfect soundtrack for a lazy afternoon walk or picnic under the trees.",
        spotifyUrl: "https://open.spotify.com/embed/playlist/37i9dQZF1DWZd79rJ6a7lp",
        tracks: [
            { name: "Central Park", artist: "Anderson .Paak" },
            { name: "Walking on Sunshine", artist: "Katrina & The Waves" }
        ]
    },
    {
        id: 5,
        name: "Times Square Lights",
        location: "Times Square, New York, NY",
        creator: "Jordan Lee",
        likes: 312,
        hasPlasticSavers: false,
        description: "High energy beats for the crossroads of the world. Feel the pulse of neon lights and endless crowds in the city that never sleeps.",
        spotifyUrl: "https://open.spotify.com/embed/playlist/37i9dQZF1DX4JAvHpjipBk",
        tracks: [
            { name: "Empire State of Mind", artist: "Jay-Z" },
            { name: "Lights", artist: "Ellie Goulding" }
        ]
    },
    {
        id: 6,
        name: "Greenwich Village Jazz",
        location: "Bleecker St, New York, NY",
        creator: "Maya Stone",
        likes: 198,
        hasPlasticSavers: false,
        description: "Smooth jazz from the historic heart of NYC's music scene. Close your eyes and imagine the legendary clubs that shaped American jazz.",
        spotifyUrl: "https://open.spotify.com/embed/playlist/37i9dQZF1DXbITWG1ZJKYt",
        tracks: [
            { name: "Take Five", artist: "Dave Brubeck" },
            { name: "So What", artist: "Miles Davis" }
        ]
    },
    {
        id: 7,
        name: "East Village Beats",
        location: "St Marks Pl, New York, NY",
        creator: "Chris Park",
        likes: 145,
        hasPlasticSavers: false,
        description: "Raw underground energy from the East Village streets. Punk rock meets indie vibes in this tribute to NYC's alternative music heritage.",
        spotifyUrl: "https://open.spotify.com/embed/playlist/37i9dQZF1DX1lVhptIYRda",
        tracks: [
            { name: "Blitzkrieg Bop", artist: "Ramones" },
            { name: "New York, I Love You", artist: "LCD Soundsystem" }
        ]
    },
    {
        id: 8,
        name: "Chelsea Market Tunes",
        location: "75 9th Ave, New York, NY",
        creator: "Sam Taylor",
        likes: 201,
        hasPlasticSavers: true,
        description: "Eclectic sounds for exploring the city's food hall scene. A mix of indie, world music, and pop that matches the diverse flavors of Chelsea.",
        spotifyUrl: "https://open.spotify.com/embed/playlist/37i9dQZF1DWWEcRhUVtL8n",
        tracks: [
            { name: "Chelsea Dagger", artist: "The Fratellis" },
            { name: "Valerie", artist: "Amy Winehouse" }
        ]
    }
];
