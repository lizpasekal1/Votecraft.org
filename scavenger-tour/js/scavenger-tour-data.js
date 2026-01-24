/**
 * VoteCraft Civic Music Tours - Boston
 * Location-based civic education through music discovery
 */

// Map configuration - centered on Freedom Trail / Government Center area
const PLANETUNE_MAP_CONFIG = {
    center: [42.3580, -71.0600], // Government Center / Park Street area
    zoom: 16,
    minZoom: 14,
    maxZoom: 19
};

// Civic theme categories
const CIVIC_THEMES = {
    VOTING: { name: "Voting Rights", color: "#3B82F6", icon: "ballot" },
    HEALTHCARE: { name: "Healthcare", color: "#10B981", icon: "health" },
    DEMOCRACY: { name: "Democracy", color: "#8B5CF6", icon: "capitol" },
    IMMIGRATION: { name: "Immigration", color: "#F59E0B", icon: "globe" },
    ECONOMY: { name: "Economic Justice", color: "#EF4444", icon: "chart" },
    CLIMATE: { name: "Climate Action", color: "#06B6D4", icon: "leaf" },
    EDUCATION: { name: "Education", color: "#EC4899", icon: "book" },
    HOUSING: { name: "Housing", color: "#F97316", icon: "home" },
    JOURNALISM: { name: "Press Freedom", color: "#F59E0B", icon: "newspaper" },
    SCOTUS: { name: "Court Reform", color: "#EF4444", icon: "gavel" }
};

const PLANETUNE_PLAYLISTS = [
    {
        id: 1,
        name: "Faneuil Hall: Cradle of Liberty",
        location: "Faneuil Hall, Congress St",
        coordinates: [42.3600, -71.0569], // Faneuil Hall
        creator: "VoteCraft Boston",
        likes: 312,
        civicTheme: CIVIC_THEMES.DEMOCRACY,
        widget: "rcv-demo", // Ranked Choice Voting widget
        description: "Where Samuel Adams and the Sons of Liberty debated independence. Today, explore how Ranked Choice Voting gives every voice power - just as the founders intended.",
        learnMore: "Massachusetts voters approved RCV for local elections. See how it works!",
        soundcloudUrl: "https://soundcloud.com/public-enemy-music/fight-the-power-1"
    },
    {
        id: 2,
        name: "State House: Healthcare Policy",
        location: "24 Beacon St (Golden Dome)",
        coordinates: [42.3587, -71.0637], // Massachusetts State House
        creator: "VoteCraft Boston",
        likes: 189,
        civicTheme: CIVIC_THEMES.HEALTHCARE,
        widget: "healthcare-cost", // Healthcare cost widget
        description: "Under the golden dome, legislators debate healthcare policy. Massachusetts pioneered universal coverage - but costs still burden millions.",
        learnMore: "Americans pay 2-3x more for healthcare than other wealthy nations.",
        soundcloudUrl: "https://soundcloud.com/bill-withers-official/lean-on-me-2"
    },
    {
        id: 3,
        name: "Old State House: Voting Rights",
        location: "206 Washington St",
        coordinates: [42.3588, -71.0578], // Old State House
        creator: "VoteCraft Boston",
        likes: 256,
        civicTheme: CIVIC_THEMES.VOTING,
        widget: "voter-turnout", // Voter participation widget
        description: "The Boston Massacre happened here, sparking a revolution for representation. Today, voter suppression threatens that legacy. See the data.",
        learnMore: "Only 66% of eligible Americans voted in 2020 - the highest in 120 years.",
        soundcloudUrl: "https://soundcloud.com/samcooke/a-change-is-gonna-come"
    },
    {
        id: 4,
        name: "Park Street: People's Common",
        location: "Park Street Church & Common",
        coordinates: [42.3564, -71.0621], // Park Street Church
        creator: "VoteCraft Boston",
        likes: 198,
        civicTheme: CIVIC_THEMES.HOUSING,
        widget: "housing-cost", // Housing affordability widget
        description: "America's oldest public park - land that belongs to everyone. But who can afford to live near it? Explore Boston's housing crisis data.",
        learnMore: "Boston median rent: $3,200/month. Median income needed: $128,000/year.",
        soundcloudUrl: "https://soundcloud.com/tracychapmanofficial/tracy-chapman-fast-car"
    },
    {
        id: 5,
        name: "Granary: Founders' Legacy",
        location: "Granary Burying Ground, Tremont St",
        coordinates: [42.3573, -71.0610], // Granary Burying Ground
        creator: "VoteCraft Boston",
        likes: 234,
        civicTheme: CIVIC_THEMES.IMMIGRATION,
        widget: "immigration-data", // Immigration statistics widget
        description: "Samuel Adams, Paul Revere, and other founders rest here - all descendants of immigrants. America has always been shaped by newcomers seeking freedom.",
        learnMore: "Immigrants founded 45% of Fortune 500 companies.",
        soundcloudUrl: "https://soundcloud.com/brucespringsteen/this-land-is-your-land-live"
    },
    {
        id: 6,
        name: "Old City Hall: Economic Power",
        location: "45 School St",
        coordinates: [42.3580, -71.0594], // Old City Hall
        creator: "VoteCraft Boston",
        likes: 145,
        civicTheme: CIVIC_THEMES.ECONOMY,
        widget: "wealth-inequality", // Wealth distribution widget
        description: "Boston's former seat of power, now luxury offices. Walk these cobblestones and explore how wealth concentration shapes American politics.",
        learnMore: "The top 1% own more wealth than the bottom 90% combined.",
        soundcloudUrl: "https://soundcloud.com/dollyparton/9-to-5-10"
    },
    {
        id: 7,
        name: "Old South Meeting House",
        location: "310 Washington St",
        coordinates: [42.3567, -71.0585], // Old South Meeting House
        creator: "VoteCraft Boston",
        likes: 178,
        civicTheme: CIVIC_THEMES.CLIMATE,
        widget: "climate-impact", // Climate/sea level widget
        description: "Where colonists planned the Tea Party to protest taxation. Today, we face a new crisis: climate change threatens Boston's waterfront and economy.",
        learnMore: "By 2050, parts of Boston could flood 90+ days per year.",
        soundcloudUrl: "https://soundcloud.com/jonimitchell/big-yellow-taxi"
    },
    {
        id: 8,
        name: "King's Chapel: Knowledge & Faith",
        location: "58 Tremont St",
        coordinates: [42.3581, -71.0603], // King's Chapel
        creator: "VoteCraft Boston",
        likes: 212,
        civicTheme: CIVIC_THEMES.EDUCATION,
        widget: "student-debt", // Student debt widget
        description: "Boston's first public school was founded near here in 1635. Education was radical then - today, student debt tops $1.7 trillion. What happened?",
        learnMore: "Average student debt: $37,000. Total US student debt: $1.77 trillion.",
        soundcloudUrl: "https://soundcloud.com/grandmasterflashmusic/the-message-12-single-version"
    }
];

// Healthcare Justice Tour
const HEALTHCARE_TOUR = [
    {
        id: 1,
        name: "State House: Where Policy is Made",
        location: "24 Beacon St (Golden Dome)",
        coordinates: [42.3587, -71.0637],
        creator: "VoteCraft Boston",
        likes: 289,
        civicTheme: CIVIC_THEMES.HEALTHCARE,
        widget: "healthcare-cost",
        description: "Massachusetts passed the nation's first universal healthcare law in 2006. But costs keep rising. Stand where legislators debate life-and-death policy.",
        learnMore: "MA's 2006 law became the model for the Affordable Care Act.",
        soundcloudUrl: "https://soundcloud.com/healthcare-tour/policy",
        tracks: [
            { name: "Heal the World", artist: "Michael Jackson" },
            { name: "Lean on Me", artist: "Bill Withers" },
            { name: "What's Going On", artist: "Marvin Gaye" }
        ]
    },
    {
        id: 2,
        name: "Faneuil Hall: Healthcare Debates",
        location: "Faneuil Hall, Congress St",
        coordinates: [42.3600, -71.0569],
        creator: "VoteCraft Boston",
        likes: 234,
        civicTheme: CIVIC_THEMES.HEALTHCARE,
        widget: "healthcare-compare",
        description: "The Cradle of Liberty hosted debates on every major American issue. Today, healthcare is the most contentious. See how the US compares globally.",
        learnMore: "Americans pay 2-3x more than other wealthy nations for worse outcomes.",
        soundcloudUrl: "https://soundcloud.com/healthcare-tour/debates",
        tracks: [
            { name: "People Get Ready", artist: "The Impressions" },
            { name: "Stand By Me", artist: "Ben E. King" },
            { name: "Bridge Over Troubled Water", artist: "Simon & Garfunkel" }
        ]
    },
    {
        id: 3,
        name: "Park Street: Public Health History",
        location: "Park Street Church",
        coordinates: [42.3564, -71.0621],
        creator: "VoteCraft Boston",
        likes: 178,
        civicTheme: CIVIC_THEMES.HEALTHCARE,
        widget: "life-expectancy",
        description: "Boston Common was once a burial ground during epidemics. Public health transformed cities. Now life expectancy varies by ZIP code.",
        learnMore: "Life expectancy can differ by 20 years between neighborhoods.",
        soundcloudUrl: "https://soundcloud.com/healthcare-tour/history",
        tracks: [
            { name: "Stayin' Alive", artist: "Bee Gees" },
            { name: "I Will Survive", artist: "Gloria Gaynor" },
            { name: "Fight Song", artist: "Rachel Platten" }
        ]
    },
    {
        id: 4,
        name: "Old South: Mental Health Movement",
        location: "310 Washington St",
        coordinates: [42.3567, -71.0585],
        creator: "VoteCraft Boston",
        likes: 198,
        civicTheme: CIVIC_THEMES.HEALTHCARE,
        widget: "mental-health",
        description: "Dorothea Dix, the mental health reformer, began her crusade in Boston. Today, mental health remains underfunded and stigmatized.",
        learnMore: "1 in 5 Americans experience mental illness yearly; most don't get treatment.",
        soundcloudUrl: "https://soundcloud.com/healthcare-tour/mental",
        tracks: [
            { name: "Everybody Hurts", artist: "R.E.M." },
            { name: "True Colors", artist: "Cyndi Lauper" },
            { name: "Beautiful", artist: "Christina Aguilera" }
        ]
    }
];

// Voting Rights Tour
const VOTING_TOUR = [
    {
        id: 1,
        name: "Old State House: No Taxation",
        location: "206 Washington St",
        coordinates: [42.3588, -71.0578],
        creator: "VoteCraft Boston",
        likes: 312,
        civicTheme: CIVIC_THEMES.VOTING,
        widget: "voter-turnout",
        description: "The Boston Massacre sparked a revolution over representation. 'No taxation without representation' - but who could actually vote in 1776?",
        learnMore: "In 1776, only white male property owners (about 6% of the population) could vote.",
        soundcloudUrl: "https://soundcloud.com/voting-tour/massacre",
        tracks: [
            { name: "Revolution", artist: "The Beatles" },
            { name: "Fight the Power", artist: "Public Enemy" },
            { name: "Wake Up", artist: "Rage Against the Machine" }
        ]
    },
    {
        id: 2,
        name: "Faneuil Hall: Expanding the Vote",
        location: "Faneuil Hall, Congress St",
        coordinates: [42.3600, -71.0569],
        creator: "VoteCraft Boston",
        likes: 287,
        civicTheme: CIVIC_THEMES.VOTING,
        widget: "voting-timeline",
        description: "Frederick Douglass and Susan B. Anthony spoke here, demanding the vote. The struggle for suffrage took centuries - and continues today.",
        learnMore: "Women couldn't vote until 1920; Black voters faced barriers until 1965.",
        soundcloudUrl: "https://soundcloud.com/voting-tour/suffrage",
        tracks: [
            { name: "Respect", artist: "Aretha Franklin" },
            { name: "Sisters Are Doin' It", artist: "Eurythmics" },
            { name: "Glory", artist: "John Legend & Common" }
        ]
    },
    {
        id: 3,
        name: "Granary: Founders & Franchises",
        location: "Granary Burying Ground",
        coordinates: [42.3573, -71.0610],
        creator: "VoteCraft Boston",
        likes: 245,
        civicTheme: CIVIC_THEMES.VOTING,
        widget: "rcv-demo",
        description: "Samuel Adams and Paul Revere rest here. They fought for representation - but limited it to people like themselves. Who decides who votes?",
        learnMore: "Today, felony disenfranchisement bars 5.2 million Americans from voting.",
        soundcloudUrl: "https://soundcloud.com/voting-tour/founders",
        tracks: [
            { name: "A Change Is Gonna Come", artist: "Sam Cooke" },
            { name: "We Shall Overcome", artist: "Pete Seeger" },
            { name: "Blowin' in the Wind", artist: "Bob Dylan" }
        ]
    },
    {
        id: 4,
        name: "State House: Modern Barriers",
        location: "24 Beacon St",
        coordinates: [42.3587, -71.0637],
        creator: "VoteCraft Boston",
        likes: 198,
        civicTheme: CIVIC_THEMES.VOTING,
        widget: "voter-suppression",
        description: "Voter ID laws, gerrymandering, and polling place closures - modern barriers to voting are debated under this golden dome.",
        learnMore: "Since 2010, 25 states have enacted new voting restrictions.",
        soundcloudUrl: "https://soundcloud.com/voting-tour/modern",
        tracks: [
            { name: "Get Up, Stand Up", artist: "Bob Marley" },
            { name: "People Have the Power", artist: "Patti Smith" },
            { name: "Waiting on the World to Change", artist: "John Mayer" }
        ]
    }
];

// Press Freedom / Journalism Tour
const JOURNALISM_TOUR = [
    {
        id: 1,
        name: "Old South: Where News Spread",
        location: "310 Washington St",
        coordinates: [42.3567, -71.0585],
        creator: "VoteCraft Boston",
        likes: 267,
        civicTheme: CIVIC_THEMES.JOURNALISM,
        widget: "media-trust",
        description: "5,000 colonists gathered here to hear news and debate action before the Tea Party. Today, trust in media is at historic lows.",
        learnMore: "Only 32% of Americans say they trust the media - down from 72% in 1976.",
        soundcloudUrl: "https://soundcloud.com/journalism-tour/origins",
        tracks: [
            { name: "The Sound of Silence", artist: "Simon & Garfunkel" },
            { name: "Radio Ga Ga", artist: "Queen" },
            { name: "Killing in the Name", artist: "Rage Against the Machine" }
        ]
    },
    {
        id: 2,
        name: "Faneuil Hall: Free Speech",
        location: "Faneuil Hall, Congress St",
        coordinates: [42.3600, -71.0569],
        creator: "VoteCraft Boston",
        likes: 234,
        civicTheme: CIVIC_THEMES.JOURNALISM,
        widget: "press-freedom",
        description: "William Lloyd Garrison nearly died here for publishing anti-slavery news. A free press has always faced threats from those in power.",
        learnMore: "The US ranks 45th globally in press freedom (2024).",
        soundcloudUrl: "https://soundcloud.com/journalism-tour/freespeech",
        tracks: [
            { name: "Freedom", artist: "Beyoncé" },
            { name: "Talkin' Bout a Revolution", artist: "Tracy Chapman" },
            { name: "Where Is the Love?", artist: "Black Eyed Peas" }
        ]
    },
    {
        id: 3,
        name: "Old City Hall: Local News Crisis",
        location: "45 School St",
        coordinates: [42.3580, -71.0594],
        creator: "VoteCraft Boston",
        likes: 189,
        civicTheme: CIVIC_THEMES.JOURNALISM,
        widget: "news-deserts",
        description: "City Hall used to be covered by dozens of reporters. Now local news is dying - and corruption thrives in the shadows.",
        learnMore: "Since 2005, the US has lost 2,500 newspapers and 30,000 journalism jobs.",
        soundcloudUrl: "https://soundcloud.com/journalism-tour/localnews",
        tracks: [
            { name: "Bad News", artist: "Kanye West" },
            { name: "Newspaper Taxi", artist: "The Beatles" },
            { name: "Dirty Laundry", artist: "Don Henley" }
        ]
    },
    {
        id: 4,
        name: "King's Chapel: Truth & Power",
        location: "58 Tremont St",
        coordinates: [42.3581, -71.0603],
        creator: "VoteCraft Boston",
        likes: 212,
        civicTheme: CIVIC_THEMES.JOURNALISM,
        widget: "misinformation",
        description: "The first newspaper in the colonies was published near here. Today, misinformation spreads faster than facts ever did.",
        learnMore: "False news stories are 70% more likely to be shared than true ones.",
        soundcloudUrl: "https://soundcloud.com/journalism-tour/truth",
        tracks: [
            { name: "Lies", artist: "Thompson Twins" },
            { name: "The Pretender", artist: "Foo Fighters" },
            { name: "Fake Plastic Trees", artist: "Radiohead" }
        ]
    }
];

// Supreme Court Reform Tour
const SCOTUS_TOUR = [
    {
        id: 1,
        name: "Old City Hall: Halls of Justice",
        location: "45 School St",
        coordinates: [42.3580, -71.0594],
        creator: "VoteCraft Boston",
        likes: 256,
        civicTheme: CIVIC_THEMES.SCOTUS,
        widget: "scotus-approval",
        description: "Boston's courts once upheld slavery in the Dred Scott case echoes. Today, the Supreme Court's approval rating has hit historic lows.",
        learnMore: "Supreme Court approval dropped to 40% in 2023 - the lowest ever recorded.",
        soundcloudUrl: "https://soundcloud.com/scotus-tour/justice",
        tracks: [
            { name: "Justice", artist: "Metallica" },
            { name: "I Fought the Law", artist: "The Clash" },
            { name: "Killing in the Name", artist: "Rage Against the Machine" }
        ]
    },
    {
        id: 2,
        name: "Faneuil Hall: Constitutional Debates",
        location: "Faneuil Hall, Congress St",
        coordinates: [42.3600, -71.0569],
        creator: "VoteCraft Boston",
        likes: 234,
        civicTheme: CIVIC_THEMES.SCOTUS,
        widget: "court-expansion",
        description: "The founders debated the Constitution here - including how to structure the courts. The number of justices has changed 7 times.",
        learnMore: "The Constitution doesn't specify how many Supreme Court justices there should be.",
        soundcloudUrl: "https://soundcloud.com/scotus-tour/constitution",
        tracks: [
            { name: "Born in the U.S.A.", artist: "Bruce Springsteen" },
            { name: "American Idiot", artist: "Green Day" },
            { name: "Fortunate Son", artist: "Creedence Clearwater Revival" }
        ]
    },
    {
        id: 3,
        name: "State House: Judicial Selection",
        location: "24 Beacon St",
        coordinates: [42.3587, -71.0637],
        creator: "VoteCraft Boston",
        likes: 198,
        civicTheme: CIVIC_THEMES.SCOTUS,
        widget: "judicial-terms",
        description: "Federal judges serve for life. State judges often face elections or term limits. Which system serves justice better?",
        learnMore: "The average Supreme Court justice now serves 26 years - up from 15 in 1970.",
        soundcloudUrl: "https://soundcloud.com/scotus-tour/selection",
        tracks: [
            { name: "Won't Get Fooled Again", artist: "The Who" },
            { name: "Changes", artist: "David Bowie" },
            { name: "The Times They Are A-Changin'", artist: "Bob Dylan" }
        ]
    },
    {
        id: 4,
        name: "Old State House: Rule of Law",
        location: "206 Washington St",
        coordinates: [42.3588, -71.0578],
        creator: "VoteCraft Boston",
        likes: 289,
        civicTheme: CIVIC_THEMES.SCOTUS,
        widget: "ethics-reform",
        description: "The Declaration of Independence was read from this balcony. The founders feared concentrated power - including in the judiciary.",
        learnMore: "SCOTUS has no binding ethics code - the only federal court without one.",
        soundcloudUrl: "https://soundcloud.com/scotus-tour/ethics",
        tracks: [
            { name: "For What It's Worth", artist: "Buffalo Springfield" },
            { name: "Power to the People", artist: "John Lennon" },
            { name: "Testify", artist: "Rage Against the Machine" }
        ]
    }
];

// All tours data
const ALL_TOURS = {
    'civic-sampler': PLANETUNE_PLAYLISTS,
    'healthcare': HEALTHCARE_TOUR,
    'voting-rights': VOTING_TOUR,
    'journalism': JOURNALISM_TOUR,
    'scotus': SCOTUS_TOUR
};

// Current active tour
let currentTourId = 'civic-sampler';
