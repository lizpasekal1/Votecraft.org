/**
 * VoteCraft Civic Music Tours - Boston
 * Location-based civic education through music discovery
 */

// Map configuration - centered on Freedom Trail / Government Center area
const VOTECRAFT_MAP_CONFIG = {
    center: [42.3580, -71.0600], // Government Center / Park Street area
    zoom: 16,
    minZoom: 3,
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

// Freedom Trail Civic Sampler - 10 stops covering all themes
const CIVIC_SAMPLER_TOUR = [
    {
        id: 1,
        name: "Faneuil Hall: Cradle of Liberty",
        location: "Faneuil Hall, Congress St",
        coordinates: [42.3600, -71.0569],
        creator: "VoteCraft Boston",
        likes: 312,
        civicTheme: CIVIC_THEMES.DEMOCRACY,
        widget: "rcv-demo",
        image: "https://upload.wikimedia.org/wikipedia/commons/3/35/2017_Faneuil_Hall.jpg",
        description: "Built in 1742 by merchant Peter Faneuil, this hall hosted the debates that sparked a revolution. Samuel Adams, James Otis, and the Sons of Liberty gathered here to protest the Stamp Act and rally colonists toward independence. The phrase 'Cradle of Liberty' was earned here.",
        learnMore: "Frederick Douglass, Susan B. Anthony, and JFK all spoke from this same stage. The grasshopper weathervane on the roof, made by Shem Drowne in 1742, has been a Boston landmark for nearly 300 years.",
        songs: [
            { title: "We Shall Overcome", url: "https://soundcloud.com/peteseeger/we-shall-overcome", reason: "The anthem of the civil rights movement, echoing the spirit of peaceful protest that filled these halls." },
            { title: "Won't Back Down", url: "https://soundcloud.com/tompettyandtheheartbreakers/i-won-t-back-down-1", reason: "A defiant declaration of standing firm in the face of opposition." },
            { title: "Fanfare for the Common Man", url: "https://soundcloud.com/naborchestra/fanfare-for-the-common-man", reason: "Aaron Copland's majestic brass fanfare celebrating ordinary citizens who build democracy." }
        ]
    },
    {
        id: 2,
        name: "Massachusetts State House",
        location: "24 Beacon St (Golden Dome)",
        coordinates: [42.3587, -71.0637],
        creator: "VoteCraft Boston",
        likes: 289,
        civicTheme: CIVIC_THEMES.HEALTHCARE,
        widget: "healthcare-cost",
        image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Massachusetts_State_House_-_Boston%2C_MA_-_DSC04664.JPG/3840px-Massachusetts_State_House_-_Boston%2C_MA_-_DSC04664.JPG",
        description: "Charles Bulfinch designed this iconic building in 1798. The golden dome was originally wood shingles, then covered in copper by Paul Revere's company, and finally gilded with 23-karat gold leaf in 1874. It has watched over Massachusetts politics for over 225 years.",
        learnMore: "The 'Sacred Cod' wooden carving has hung in the House chamber since 1784, symbolizing the fishing industry's importance to the colony. In 1933, Harvard students 'codnapped' it as a prank.",
        songs: [
            { title: "Lean on Me", url: "https://soundcloud.com/bill-withers-official/lean-on-me-2", reason: "A timeless call for community support that embodies the spirit of universal healthcare." },
            { title: "Heal the World", url: "https://soundcloud.com/michaeljackson/heal-the-world", reason: "A plea for compassion and taking care of one another." },
            { title: "What a Wonderful World", url: "https://soundcloud.com/louisarmstrongofficial/what-a-wonderful-world", reason: "Louis Armstrong's jazz standard celebrating the beauty of life and human connection." }
        ]
    },
    {
        id: 3,
        name: "Old State House: Boston Massacre",
        location: "206 Washington St",
        coordinates: [42.3588, -71.0578],
        creator: "VoteCraft Boston",
        likes: 356,
        civicTheme: CIVIC_THEMES.VOTING,
        widget: "voter-turnout",
        image: "https://upload.wikimedia.org/wikipedia/commons/1/19/Old_State_House_Boston_2009f.JPG",
        description: "On March 5, 1770, British soldiers fired into a crowd here, killing five colonists including Crispus Attucks, a Black man who became the first martyr of the Revolution. The cobblestone circle marks where blood was shed for the cause of representation.",
        learnMore: "John Adams defended the British soldiers in court to prove the colonies could provide fair trials. The Declaration of Independence was read from the balcony on July 18, 1776.",
        songs: [
            { title: "A Change Is Gonna Come", url: "https://soundcloud.com/samcooke/a-change-is-gonna-come", reason: "A civil rights anthem about the ongoing struggle for equal representation." },
            { title: "Respect", url: "https://soundcloud.com/arethafranklin/respect", reason: "A demand for dignity and recognition that became a civil rights anthem." },
            { title: "Strange Fruit", url: "https://soundcloud.com/billie-holiday-official/strange-fruit", reason: "Billie Holiday's haunting jazz protest against racial violence and injustice." }
        ]
    },
    {
        id: 4,
        name: "Boston Common: America's Park",
        location: "Park Street Church & Common",
        coordinates: [42.3564, -71.0621],
        creator: "VoteCraft Boston",
        likes: 298,
        civicTheme: CIVIC_THEMES.HOUSING,
        widget: "housing-cost",
        image: "https://upload.wikimedia.org/wikipedia/commons/6/60/Boston_Common_view.jpg",
        description: "Established in 1634, this is America's oldest public park - common land where anyone could graze cattle. It's been a British Army camp, a public hanging site, and a gathering place for protests. The Common represents land that belongs to everyone.",
        learnMore: "Martin Luther King Jr. spoke here in 1965 to 22,000 people. During the Revolution, British troops camped here, and the Common was used as a staging ground for the march to Lexington.",
        songs: [
            { title: "Fast Car", url: "https://soundcloud.com/tracychapmanofficial/tracy-chapman-fast-car", reason: "An urgent plea for escape from poverty that resonates with today's housing crisis." },
            { title: "Allentown", url: "https://soundcloud.com/billyjoel/allentown", reason: "A portrait of working-class struggle in a changing economy." },
            { title: "Rhapsody in Blue", url: "https://soundcloud.com/george-gershwin-official/rhapsody-in-blue", reason: "Gershwin's jazz-classical fusion capturing the energy and struggle of urban American life." }
        ]
    },
    {
        id: 5,
        name: "Granary Burying Ground",
        location: "Tremont St at Park St",
        coordinates: [42.3573, -71.0610],
        creator: "VoteCraft Boston",
        likes: 334,
        civicTheme: CIVIC_THEMES.IMMIGRATION,
        widget: "immigration-data",
        image: "https://upload.wikimedia.org/wikipedia/commons/1/14/Boston_Granary_Burying_Ground_Grabstein_Totenkopf_9441_20190429.jpg",
        description: "Samuel Adams, Paul Revere, John Hancock, and victims of the Boston Massacre rest here among 2,300 graves. These founders were descendants of immigrants who fled religious persecution in Europe. America has always been shaped by newcomers seeking freedom.",
        learnMore: "Paul Revere's family were French Huguenot refugees (originally named Rivoire). Benjamin Franklin's parents and the parents of John Hancock are also buried here.",
        songs: [
            { title: "This Land Is Your Land", url: "https://soundcloud.com/brucespringsteen/this-land-is-your-land-live", reason: "A folk anthem reminding us that America was built by immigrants seeking freedom." },
            { title: "American Tune", url: "https://soundcloud.com/paulsimon/american-tune", reason: "Paul Simon's gentle reflection on the immigrant experience and American identity." },
            { title: "New World Symphony", url: "https://soundcloud.com/antonindvorak/symphony-no-9-new-world", reason: "Dvořák's symphony celebrating America, written by a Czech immigrant inspired by spirituals." }
        ]
    },
    {
        id: 6,
        name: "Old City Hall",
        location: "45 School St",
        coordinates: [42.3580, -71.0594],
        creator: "VoteCraft Boston",
        likes: 245,
        civicTheme: CIVIC_THEMES.ECONOMY,
        widget: "wealth-inequality",
        image: "https://upload.wikimedia.org/wikipedia/commons/4/4a/Old_City_Hall_in_Boston%2C_Massachusetts.jpg",
        description: "This French Second Empire building served as Boston's City Hall from 1865-1969. Benjamin Franklin was born on Milk Street nearby in 1706, and a statue of him stands in the courtyard. The bronze donkey outside has been rubbed shiny by visitors for good luck.",
        learnMore: "The donkey and elephant statues outside commemorate the first use of these party symbols. A sidewalk mosaic marks the site of Boston Latin School where Franklin was a student.",
        songs: [
            { title: "9 to 5", url: "https://soundcloud.com/dollyparton/9-to-5-10", reason: "A working-class anthem highlighting economic inequality and the struggle of everyday workers." },
            { title: "Money", url: "https://soundcloud.com/pinkfloydofficial/money", reason: "A satirical take on greed and the corrupting power of wealth." },
            { title: "Take Five", url: "https://soundcloud.com/davebrubeck/take-five", reason: "Dave Brubeck's cool jazz classic - sophistication meets the working rhythm of American life." }
        ]
    },
    {
        id: 7,
        name: "Old South Meeting House",
        location: "310 Washington St",
        coordinates: [42.3567, -71.0585],
        creator: "VoteCraft Boston",
        likes: 378,
        civicTheme: CIVIC_THEMES.CLIMATE,
        widget: "climate-impact",
        image: "https://upload.wikimedia.org/wikipedia/commons/d/d2/The_Old_South_Meeting_House.jpg",
        description: "On December 16, 1773, 5,000 colonists packed this church to debate the tea tax. When Governor Hutchinson refused to let the tea ships leave, Samuel Adams gave the signal: 'This meeting can do nothing more.' That night, the Boston Tea Party began.",
        learnMore: "The tea dumped was worth over $1.7 million in today's dollars. British troops nearly demolished the building during occupation, using it as a riding school.",
        songs: [
            { title: "Big Yellow Taxi", url: "https://soundcloud.com/jonimitchell/big-yellow-taxi", reason: "An environmental classic warning about losing paradise before it's too late." },
            { title: "Mercy Mercy Me", url: "https://soundcloud.com/marvingaye/mercy-mercy-me-the-ecology", reason: "Marvin Gaye's soulful plea for environmental awareness." },
            { title: "The Four Seasons - Spring", url: "https://soundcloud.com/antoniovivaldi/the-four-seasons-spring", reason: "Vivaldi's celebration of nature's cycles - a reminder of what we stand to lose." }
        ]
    },
    {
        id: 8,
        name: "King's Chapel",
        location: "58 Tremont St",
        coordinates: [42.3581, -71.0603],
        creator: "VoteCraft Boston",
        likes: 212,
        civicTheme: CIVIC_THEMES.EDUCATION,
        widget: "student-debt",
        image: "https://upload.wikimedia.org/wikipedia/commons/0/0a/Boston_-_King%27s_Chapel_%2848718908106%29.jpg",
        description: "Founded in 1686 as the first Anglican church in Puritan Boston, King's Chapel was built on a corner of the town burying ground because no colonist would sell land for a Church of England. The current granite building dates to 1754.",
        learnMore: "The adjacent King's Chapel Burying Ground (1630) is Boston's oldest cemetery. Notable burials include Mary Chilton, the first woman to step off the Mayflower, and William Dawes, who rode with Paul Revere.",
        songs: [
            { title: "The Message", url: "https://soundcloud.com/grandmasterflashmusic/the-message-12-single-version", reason: "Groundbreaking social commentary on how student debt traps a generation." },
            { title: "Another Brick in the Wall", url: "https://soundcloud.com/pinkfloydofficial/another-brick-in-the-wall-pt-2", reason: "Pink Floyd's critique of rigid education systems." },
            { title: "Clair de Lune", url: "https://soundcloud.com/claudedebussy/clair-de-lune", reason: "Debussy's dreamy piano piece - the beauty of classical education and contemplation." }
        ]
    },
    {
        id: 9,
        name: "Paul Revere House",
        location: "19 North Square",
        coordinates: [42.3637, -71.0536],
        creator: "VoteCraft Boston",
        likes: 267,
        civicTheme: CIVIC_THEMES.JOURNALISM,
        widget: "media-trust",
        image: "https://upload.wikimedia.org/wikipedia/commons/c/cf/Paul_Revere_House%2C_Boston%2C_2023-02-21.jpg",
        description: "Paul Revere lived here from 1770-1800. His midnight ride spread the news: 'The British are coming!' In an era before mass media, information traveled by horseback. Revere was an early 'influencer' - his engraving of the Boston Massacre shaped public opinion.",
        learnMore: "Revere's engraving of the Boston Massacre was propaganda - it depicted soldiers firing in formation, not the chaotic reality. This is the oldest remaining structure in downtown Boston (c. 1680).",
        songs: [
            { title: "The Sound of Silence", url: "https://soundcloud.com/simonandgarfunkel/the-sound-of-silence", reason: "A haunting meditation on communication and how people fail to truly connect." },
            { title: "Dirty Laundry", url: "https://soundcloud.com/donhenley/dirty-laundry", reason: "Don Henley's critique of sensationalist media." },
            { title: "So What", url: "https://soundcloud.com/milesdavis/so-what", reason: "Miles Davis' cool jazz masterpiece - questioning everything with sophistication." }
        ]
    },
    {
        id: 10,
        name: "Old North Church",
        location: "193 Salem St",
        coordinates: [42.3663, -71.0546],
        creator: "VoteCraft Boston",
        likes: 345,
        civicTheme: CIVIC_THEMES.SCOTUS,
        widget: "scotus-approval",
        image: "https://upload.wikimedia.org/wikipedia/commons/5/56/Paul_Revere_church_interior%2C_Boston%2C_Mass._2.jpg",
        description: "On April 18, 1775, sexton Robert Newman hung two lanterns in this steeple: 'Two if by sea.' The signal launched the Revolution. This church reminds us that ordinary people, taking courageous action, can change history. The balance of power matters.",
        learnMore: "Built in 1723, this is Boston's oldest surviving church building. The steeple, rebuilt after hurricanes in 1804 and 1954, holds eight bells cast in 1744 - the oldest church bells in North America.",
        songs: [
            { title: "Blowin' in the Wind", url: "https://soundcloud.com/bobdylan/blowin-in-the-wind", reason: "Dylan's timeless questions about peace, freedom, and how long change takes." },
            { title: "The Times They Are A-Changin", url: "https://soundcloud.com/bobdylan/the-times-they-are-a-changin", reason: "Dylan's timeless call for leaders to heed the winds of change." },
            { title: "A Love Supreme", url: "https://soundcloud.com/johncoltrane/a-love-supreme", reason: "Coltrane's spiritual jazz meditation on justice, faith, and transcendence." }
        ]
    }
];

// Healthcare Justice Tour - 15 stops in Longwood Medical Area
const HEALTHCARE_TOUR = [
    {
        id: 1,
        name: "Harvard Medical School",
        location: "25 Shattuck St, Longwood",
        coordinates: [42.3354, -71.1037],
        creator: "VoteCraft Boston",
        likes: 423,
        civicTheme: CIVIC_THEMES.EDUCATION,
        widget: "healthcare-cost",
        image: "https://upload.wikimedia.org/wikipedia/commons/b/b5/Harvard_Medical_School_HDR.jpg",
        description: "Founded in 1782, Harvard Medical School trains the doctors who shape American medicine. Its iconic marble quadrangle represents both medical excellence and a history of exclusion - the first Black graduate wasn't until 1850, women not until 1945.",
        learnMore: "Medical school costs average $250,000. The US has fewer doctors per capita than most developed nations, contributing to healthcare access gaps.",
        soundcloudUrl: "https://soundcloud.com/bill-withers-official/lean-on-me-2",
        songReason: "A timeless message of mutual support - being there when someone needs you."
    },
    {
        id: 2,
        name: "Brigham and Women's Hospital",
        location: "75 Francis St, Longwood",
        coordinates: [42.3358, -71.1070],
        creator: "VoteCraft Boston",
        likes: 378,
        civicTheme: CIVIC_THEMES.HEALTHCARE,
        widget: "healthcare-compare",
        description: "One of America's top hospitals, Brigham pioneered organ transplantation and performs groundbreaking research. But even here, studies show Black patients receive different care than white patients for the same conditions - a crisis the hospital is working to address.",
        learnMore: "Black women are 3x more likely to die from pregnancy complications than white women, even at top hospitals. Racism in medicine is a public health crisis.",
        soundcloudUrl: "https://soundcloud.com/marvingaye/whats-going-on",
        songReason: "A plea for understanding and equality that speaks to persistent racial disparities."
    },
    {
        id: 3,
        name: "Boston Children's Hospital",
        location: "300 Longwood Ave",
        coordinates: [42.3373, -71.1060],
        creator: "VoteCraft Boston",
        likes: 456,
        civicTheme: CIVIC_THEMES.VOTING,
        widget: "life-expectancy",
        image: "https://upload.wikimedia.org/wikipedia/commons/0/09/Boston_Children%27s_Hospital.jpg",
        description: "America's first pediatric hospital, founded in 1869 to serve children regardless of ability to pay. Today it leads in pediatric research and treatment, but 4 million American children still lack health insurance.",
        learnMore: "Child poverty rates in the US are among the highest in developed nations. Children in poverty are 2x more likely to have chronic health conditions.",
        soundcloudUrl: "https://soundcloud.com/michaeljackson/heal-the-world",
        songReason: "A call to heal the world and make it better for future generations."
    },
    {
        id: 4,
        name: "Dana-Farber Cancer Institute",
        location: "450 Brookline Ave",
        coordinates: [42.3380, -71.1080],
        creator: "VoteCraft Boston",
        likes: 389,
        civicTheme: CIVIC_THEMES.HEALTHCARE,
        widget: "healthcare-cost",
        description: "A world leader in cancer research and treatment, Dana-Farber has pioneered immunotherapy and targeted treatments. But cancer drugs can cost $10,000+ per month - forcing patients to choose between treatment and financial ruin.",
        learnMore: "42% of cancer patients deplete their life savings within 2 years of diagnosis. 'Financial toxicity' is now recognized as a side effect of cancer treatment.",
        soundcloudUrl: "https://soundcloud.com/rem-official/everybody-hurts",
        songReason: "A compassionate message of perseverance for those facing life's hardest battles."
    },
    {
        id: 5,
        name: "Joslin Diabetes Center",
        location: "1 Joslin Pl, Longwood",
        coordinates: [42.3365, -71.1065],
        creator: "VoteCraft Boston",
        likes: 267,
        civicTheme: CIVIC_THEMES.ECONOMY,
        widget: "healthcare-compare",
        description: "The world's largest diabetes research and treatment center, Joslin has led the fight against this epidemic since 1898. Diabetes affects 37 million Americans - and insulin, discovered 100 years ago, still costs Americans 10x what Canadians pay.",
        learnMore: "1 in 4 diabetics ration insulin due to cost. The same vial costs $30 in Canada and $300 in the US. Insulin's inventors sold the patent for $1.",
        soundcloudUrl: "https://soundcloud.com/dollyparton/9-to-5-10",
        songReason: "A working-class anthem for those who work hard but still can't afford life-saving medicine."
    },
    {
        id: 6,
        name: "Harvard School of Public Health",
        location: "677 Huntington Ave",
        coordinates: [42.3355, -71.1012],
        creator: "VoteCraft Boston",
        likes: 234,
        civicTheme: CIVIC_THEMES.CLIMATE,
        widget: "life-expectancy",
        description: "Public health saved more lives than all medical treatments combined - through vaccines, clean water, and sanitation. This school trains leaders who fight epidemics, but also studies how zip code predicts health more than genetic code.",
        learnMore: "Life expectancy varies by 30 years between Boston neighborhoods. Public health is about addressing the social conditions that make people sick.",
        soundcloudUrl: "https://soundcloud.com/beegees/stayin-alive",
        songReason: "A disco anthem celebrating survival against all odds - also used to teach CPR rhythm."
    },
    {
        id: 7,
        name: "Beth Israel Deaconess",
        location: "330 Brookline Ave",
        coordinates: [42.3390, -71.1030],
        creator: "VoteCraft Boston",
        likes: 298,
        civicTheme: CIVIC_THEMES.IMMIGRATION,
        widget: "healthcare-cost",
        description: "Born from the merger of two hospitals - one founded by Jewish immigrants in 1916, another by Protestant deaconesses in 1896. Both served communities facing discrimination. Today, immigrant healthcare workers make up 17% of the US healthcare workforce.",
        learnMore: "29% of US physicians are immigrants. During COVID, immigrant healthcare workers were essential - yet many faced deportation threats.",
        soundcloudUrl: "https://soundcloud.com/franksinatra/new-york-new-york",
        songReason: "An immigrant success story honoring the essential workers who care for us."
    },
    {
        id: 8,
        name: "Fenway Community Health",
        location: "1340 Boylston St, Fenway",
        coordinates: [42.3435, -71.0970],
        creator: "VoteCraft Boston",
        likes: 312,
        civicTheme: CIVIC_THEMES.DEMOCRACY,
        widget: "mental-health",
        description: "Founded in 1971, Fenway Health pioneered LGBTQ+ healthcare when mainstream medicine pathologized queer identities. It led HIV/AIDS treatment when the government ignored the epidemic. Community health centers now serve 30 million Americans.",
        learnMore: "LGBTQ+ youth are 4x more likely to attempt suicide. Fenway's model - affirming care, community-driven - saves lives and has spread nationwide.",
        soundcloudUrl: "https://soundcloud.com/gloriaganyor/i-will-survive",
        songReason: "A disco anthem of resilience that became an LGBTQ+ empowerment hymn."
    },
    {
        id: 9,
        name: "The Fens & Victory Gardens",
        location: "The Fenway, near Agassiz Rd",
        coordinates: [42.3420, -71.0960],
        creator: "VoteCraft Boston",
        likes: 189,
        civicTheme: CIVIC_THEMES.HOUSING,
        widget: "life-expectancy",
        description: "America's oldest community garden, the Victory Gardens have fed Bostonians since WWII. Green space is healthcare - studies show access to parks reduces stress, heart disease, and mental illness. But park access is unequal across neighborhoods.",
        learnMore: "Low-income neighborhoods have 4x less park space than wealthy areas. 'Nature deficit disorder' contributes to childhood obesity and anxiety.",
        soundcloudUrl: "https://soundcloud.com/jonimitchell/big-yellow-taxi",
        songReason: "An environmental warning about preserving the green spaces that keep us healthy."
    },
    {
        id: 10,
        name: "Isabella Stewart Gardner Museum",
        location: "25 Evans Way",
        coordinates: [42.3384, -71.0990],
        creator: "VoteCraft Boston",
        likes: 267,
        civicTheme: CIVIC_THEMES.EDUCATION,
        widget: "mental-health",
        description: "Art heals. Museums across Boston partner with hospitals for 'art therapy' programs, and research shows viewing art reduces cortisol and anxiety. Gardner built this museum to bring beauty to everyone - admission is free on your birthday.",
        learnMore: "Hospitals now prescribe museum visits for mental health. Studies show 30 minutes in a museum reduces stress hormones as effectively as meditation.",
        soundcloudUrl: "https://soundcloud.com/bobmarley/one-love",
        songReason: "A message of unity and healing through human connection."
    },
    {
        id: 11,
        name: "Massachusetts Eye and Ear",
        location: "243 Charles St",
        coordinates: [42.3362, -71.1045],
        creator: "VoteCraft Boston",
        likes: 245,
        civicTheme: CIVIC_THEMES.HEALTHCARE,
        widget: "healthcare-cost",
        description: "Founded in 1824, this specialty hospital pioneered treatments for hearing loss and blindness. Today it leads research into gene therapy for inherited eye diseases. Access to specialized care remains deeply unequal - rural Americans travel hours for specialists.",
        learnMore: "1 in 8 Americans has hearing loss. Hearing aids cost $2,000-7,000 and Medicare didn't cover them until 2024. Untreated hearing loss increases dementia risk.",
        soundcloudUrl: "https://soundcloud.com/stevie-wonder-official/superstition",
        songReason: "Music that transcends physical limitations - celebrating what we can do, not what we can't."
    },
    {
        id: 12,
        name: "Countway Library of Medicine",
        location: "10 Shattuck St, Longwood",
        coordinates: [42.3350, -71.1030],
        creator: "VoteCraft Boston",
        likes: 178,
        civicTheme: CIVIC_THEMES.EDUCATION,
        widget: "healthcare-compare",
        description: "One of the world's largest medical libraries, Countway holds 650,000 volumes including rare texts documenting the evolution of medical ethics. Here you can trace how medicine moved from bloodletting to evidence-based care - and the harm done along the way.",
        learnMore: "The Tuskegee syphilis study, Nazi experiments, and forced sterilizations are documented here. Medical ethics emerged from acknowledging past atrocities.",
        soundcloudUrl: "https://soundcloud.com/lauryn-hill-official/everything-is-everything",
        songReason: "A philosophical reflection on how everything changes - including how we heal."
    },
    {
        id: 13,
        name: "Schepens Eye Research Institute",
        location: "20 Staniford St, Longwood",
        coordinates: [42.3368, -71.1055],
        creator: "VoteCraft Boston",
        likes: 156,
        civicTheme: CIVIC_THEMES.VOTING,
        widget: "life-expectancy",
        description: "Founded by Dr. Charles Schepens, who invented the binocular indirect ophthalmoscope and worked for the Belgian resistance during WWII. Vision loss affects 12 million Americans over 40 - and those without insurance often go untreated until it's too late.",
        learnMore: "Diabetic retinopathy is the leading cause of blindness in working-age adults. Regular screening prevents 90% of vision loss, but millions skip it.",
        soundcloudUrl: "https://soundcloud.com/eagles/hotel-california",
        songReason: "A haunting song about being trapped - and the importance of early intervention."
    },
    {
        id: 14,
        name: "Harvard Dental School",
        location: "188 Longwood Ave",
        coordinates: [42.3385, -71.1048],
        creator: "VoteCraft Boston",
        likes: 134,
        civicTheme: CIVIC_THEMES.ECONOMY,
        widget: "healthcare-cost",
        description: "Dental care is healthcare, but America treats it separately. 74 million Americans lack dental insurance. Poor dental health causes heart disease, diabetes complications, and chronic pain. The mouth-body divide in medicine costs lives.",
        learnMore: "1 in 4 adults has untreated cavities. In the ER, dental problems are the #1 reason for visits that could have been prevented with basic care.",
        soundcloudUrl: "https://soundcloud.com/prince/little-red-corvette",
        songReason: "An energetic song about taking chances - and the gambles people take when they can't afford care."
    },
    {
        id: 15,
        name: "MassArt & Mental Health",
        location: "621 Huntington Ave",
        coordinates: [42.3368, -71.0985],
        creator: "VoteCraft Boston",
        likes: 223,
        civicTheme: CIVIC_THEMES.SCOTUS,
        widget: "mental-health",
        description: "Art therapy programs at MassArt partner with hospitals throughout the medical area. Creative expression reduces anxiety, manages chronic pain, and helps process trauma. Yet arts programs are first to be cut when budgets tighten.",
        learnMore: "Veterans with PTSD show 30% reduction in symptoms after art therapy. Hospitals are increasingly prescribing creative activities alongside medication.",
        soundcloudUrl: "https://soundcloud.com/coldplay/yellow",
        songReason: "A tender song about seeing someone's inner light and the healing power of creativity."
    }
];

// Voting Rights Tour - 20 stops along the Freedom Trail (all 10 Freedom Trail stops + 10 voting-specific locations)
const VOTING_TOUR = [
    // Freedom Trail Stop 1: Faneuil Hall
    {
        id: 1,
        name: "Faneuil Hall: Cradle of Liberty",
        location: "Faneuil Hall, Congress St",
        coordinates: [42.3600, -71.0569],
        creator: "VoteCraft Boston",
        likes: 387,
        civicTheme: CIVIC_THEMES.DEMOCRACY,
        widget: "voting-timeline",
        image: "https://upload.wikimedia.org/wikipedia/commons/3/35/2017_Faneuil_Hall.jpg",
        description: "Built in 1742, this hall hosted debates that sparked a revolution. Frederick Douglass spoke here demanding voting rights for Black Americans. Susan B. Anthony spoke here for women's suffrage. The 'Cradle of Liberty' has witnessed 280 years of fights for the vote.",
        learnMore: "It took 95 years from the Declaration to the 15th Amendment. Women waited 144 years. The Voting Rights Act wasn't passed until 1965.",
        soundcloudUrl: "https://soundcloud.com/arethafranklin/respect",
        songReason: "A civil rights anthem demanding R-E-S-P-E-C-T for every citizen's voice."
    },
    // Freedom Trail Stop 2: Massachusetts State House
    {
        id: 2,
        name: "State House: Where Voting Laws Are Made",
        location: "24 Beacon St (Golden Dome)",
        coordinates: [42.3587, -71.0637],
        creator: "VoteCraft Boston",
        likes: 298,
        civicTheme: CIVIC_THEMES.VOTING,
        widget: "voter-suppression",
        image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Massachusetts_State_House_-_Boston%2C_MA_-_DSC04664.JPG/3840px-Massachusetts_State_House_-_Boston%2C_MA_-_DSC04664.JPG",
        description: "Voting laws are made in state houses. Massachusetts has some of the most accessible voting in the nation - same-day registration, early voting, mail ballots. Other states have passed hundreds of restrictions since 2020.",
        learnMore: "Since 2010, 25 states have enacted new voting restrictions. Texas closed 750 polling places in primarily Black and Hispanic neighborhoods.",
        soundcloudUrl: "https://soundcloud.com/bobmarley/get-up-stand-up",
        songReason: "A call to stand up for your rights wherever laws are written and contested."
    },
    // Freedom Trail Stop 3: Old State House
    {
        id: 3,
        name: "Old State House: No Taxation Without Representation",
        location: "206 Washington St",
        coordinates: [42.3588, -71.0578],
        creator: "VoteCraft Boston",
        likes: 412,
        civicTheme: CIVIC_THEMES.VOTING,
        widget: "voter-turnout",
        image: "https://upload.wikimedia.org/wikipedia/commons/1/19/Old_State_House_Boston_2009f.JPG",
        description: "The Boston Massacre began steps from here on March 5, 1770. 'No taxation without representation' became the Revolution's rallying cry. But who could actually vote in 1776? Only white male property owners - about 6% of the population.",
        learnMore: "Crispus Attucks, a Black man, was the first to die. Black men couldn't vote until 1870; women until 1920; Native Americans until 1924.",
        soundcloudUrl: "https://soundcloud.com/samcooke/a-change-is-gonna-come",
        songReason: "A hopeful civil rights anthem about the long wait for true equality."
    },
    // Freedom Trail Stop 4: Boston Common
    {
        id: 4,
        name: "Boston Common: Protest & Voice",
        location: "Boston Common, Park St",
        coordinates: [42.3564, -71.0621],
        creator: "VoteCraft Boston",
        likes: 298,
        civicTheme: CIVIC_THEMES.HOUSING,
        widget: "voter-turnout",
        image: "https://upload.wikimedia.org/wikipedia/commons/6/60/Boston_Common_view.jpg",
        description: "The First Amendment protects assembly - the right to gather and demand change. Martin Luther King Jr. spoke here in 1965. The Vietnam War protests drew 100,000. Black Lives Matter marches filled these paths. Protest is democracy in action.",
        learnMore: "Youth voter turnout doubled between 2014 and 2018. Gen Z votes at higher rates than previous generations at their age.",
        soundcloudUrl: "https://soundcloud.com/johnlegend/glory",
        songReason: "An Oscar-winning civil rights anthem connecting past struggles to the ongoing fight for voting rights."
    },
    // Freedom Trail Stop 5: Granary Burying Ground
    {
        id: 5,
        name: "Granary Burying Ground: Founders' Franchise",
        location: "Tremont St at Park St",
        coordinates: [42.3573, -71.0610],
        creator: "VoteCraft Boston",
        likes: 345,
        civicTheme: CIVIC_THEMES.SCOTUS,
        widget: "rcv-demo",
        image: "https://upload.wikimedia.org/wikipedia/commons/1/14/Boston_Granary_Burying_Ground_Grabstein_Totenkopf_9441_20190429.jpg",
        description: "Samuel Adams, John Hancock, and Paul Revere lie here - men who risked everything for self-governance. Yet they limited voting to people like themselves. Adams wrote the Massachusetts Constitution requiring property ownership to vote.",
        learnMore: "Today, felony disenfranchisement bars 5.2 million Americans from voting. In Florida, 1 in 5 Black adults cannot vote.",
        soundcloudUrl: "https://soundcloud.com/peteseeger/we-shall-overcome",
        songReason: "A civil rights anthem that united generations of activists - a struggle not yet won."
    },
    // Freedom Trail Stop 6: Old City Hall
    {
        id: 6,
        name: "Old City Hall: Political Machines",
        location: "45 School St",
        coordinates: [42.3580, -71.0594],
        creator: "VoteCraft Boston",
        likes: 189,
        civicTheme: CIVIC_THEMES.ECONOMY,
        widget: "voter-turnout",
        image: "https://upload.wikimedia.org/wikipedia/commons/4/4a/Old_City_Hall_in_Boston%2C_Massachusetts.jpg",
        description: "James Michael Curley served as mayor from this building four times, once while under federal indictment. Boston's political machines controlled votes through patronage and favors. Machine politics shows both democracy's resilience and its vulnerabilities.",
        learnMore: "Gerrymandering is the modern political machine. In 2018, Wisconsin Republicans won 63% of state seats with only 45% of votes.",
        soundcloudUrl: "https://soundcloud.com/thewho/wont-get-fooled-again",
        songReason: "A skeptical anthem about political power and the promise of change."
    },
    // Freedom Trail Stop 7: Old South Meeting House
    {
        id: 7,
        name: "Old South Meeting House: The Tea Party Vote",
        location: "310 Washington St",
        coordinates: [42.3567, -71.0585],
        creator: "VoteCraft Boston",
        likes: 312,
        civicTheme: CIVIC_THEMES.CLIMATE,
        widget: "rcv-demo",
        image: "https://upload.wikimedia.org/wikipedia/commons/d/d2/The_Old_South_Meeting_House.jpg",
        description: "On December 16, 1773, colonists voted here on what to do about the tea tax. When legal options failed, they chose direct action. Democracy requires both voting and activism - the ballot and the streets working together.",
        learnMore: "Ranked Choice Voting lets you rank candidates. If no one gets 50%, last-place candidates are eliminated until someone wins a majority.",
        soundcloudUrl: "https://soundcloud.com/publicenemy/fight-the-power",
        songReason: "A revolutionary call to action channeling the spirit of protest against unjust power."
    },
    // Freedom Trail Stop 8: King's Chapel
    {
        id: 8,
        name: "King's Chapel: Separation of Church & State",
        location: "58 Tremont St",
        coordinates: [42.3581, -71.0603],
        creator: "VoteCraft Boston",
        likes: 212,
        civicTheme: CIVIC_THEMES.EDUCATION,
        widget: "voting-timeline",
        image: "https://upload.wikimedia.org/wikipedia/commons/0/0a/Boston_-_King%27s_Chapel_%2848718908106%29.jpg",
        description: "Founded in 1686 as the first Anglican church in Puritan Boston, King's Chapel stands near America's first public school (Boston Latin, 1635). Religious freedom and voting rights are intertwined - both require separating political power from any single belief.",
        learnMore: "17 states had religious requirements for voting at independence. Maryland required belief in the Trinity. Jews couldn't vote in some states until 1828.",
        soundcloudUrl: "https://soundcloud.com/grandmasterflashmusic/the-message-12-single-version",
        songReason: "Groundbreaking social commentary - the message matters for everyone."
    },
    // Freedom Trail Stop 9: Paul Revere House
    {
        id: 9,
        name: "Paul Revere House: Spreading the Word",
        location: "19 North Square",
        coordinates: [42.3637, -71.0536],
        creator: "VoteCraft Boston",
        likes: 267,
        civicTheme: CIVIC_THEMES.JOURNALISM,
        widget: "media-trust",
        image: "https://upload.wikimedia.org/wikipedia/commons/c/cf/Paul_Revere_House%2C_Boston%2C_2023-02-21.jpg",
        description: "Paul Revere's midnight ride spread the news: 'The British are coming!' In an era before mass media, information traveled by horseback. Today, voting information - and disinformation - spreads instantly. An informed electorate requires a free press.",
        learnMore: "Revere's engraving of the Boston Massacre was propaganda - he depicted soldiers firing in formation, not the chaotic reality. Media literacy has always mattered.",
        soundcloudUrl: "https://soundcloud.com/therollingstones/sympathy-for-the-devil",
        songReason: "An examination of manipulation and the different faces we show to shape perception."
    },
    // Freedom Trail Stop 10: Old North Church
    {
        id: 10,
        name: "Old North Church: One if by Land",
        location: "193 Salem St",
        coordinates: [42.3663, -71.0546],
        creator: "VoteCraft Boston",
        likes: 345,
        civicTheme: CIVIC_THEMES.DEMOCRACY,
        widget: "voter-turnout",
        image: "https://upload.wikimedia.org/wikipedia/commons/5/56/Paul_Revere_church_interior%2C_Boston%2C_Mass._2.jpg",
        description: "On April 18, 1775, sexton Robert Newman hung two lanterns in this steeple: 'Two if by sea.' The signal launched the Revolution. Ordinary people, taking courageous action, can change history. Every vote is a signal that democracy still lives.",
        learnMore: "The church's box pews were originally owned by wealthy families - only property owners could vote. Universal suffrage took nearly 200 years to achieve.",
        soundcloudUrl: "https://soundcloud.com/u2official/sunday-bloody-sunday",
        songReason: "A protest song about violence and injustice that demands we never forget."
    },
    // Additional Voting Rights Stop 11
    {
        id: 11,
        name: "African Meeting House",
        location: "8 Smith Court, Beacon Hill",
        coordinates: [42.3598, -71.0650],
        creator: "VoteCraft Boston",
        likes: 356,
        civicTheme: CIVIC_THEMES.VOTING,
        widget: "voter-suppression",
        description: "Built in 1806, this is the oldest Black church building still standing in America. William Lloyd Garrison founded the New England Anti-Slavery Society here in 1832. This was the center of Boston's abolitionist movement and the fight for Black voting rights.",
        learnMore: "After the 15th Amendment passed in 1870, Southern states used poll taxes, literacy tests, and violence to suppress Black voters for another century.",
        soundcloudUrl: "https://soundcloud.com/ninasimonefans/mississippi-goddam",
        songReason: "A fierce protest song capturing the righteous anger of those who fought for freedom."
    },
    // Additional Voting Rights Stop 12
    {
        id: 12,
        name: "Robert Gould Shaw Memorial",
        location: "Beacon St & Park St",
        coordinates: [42.3576, -71.0635],
        creator: "VoteCraft Boston",
        likes: 423,
        civicTheme: CIVIC_THEMES.IMMIGRATION,
        widget: "voting-timeline",
        description: "This bronze relief honors Colonel Shaw and the 54th Massachusetts Infantry - the first Black regiment in the Civil War. These men fought and died for a country that denied them citizenship and voting rights. The 15th Amendment came 5 years after the war ended.",
        learnMore: "Half the 54th died in their assault on Fort Wagner. Black soldiers were paid less than white soldiers until Congress equalized pay in 1864.",
        soundcloudUrl: "https://soundcloud.com/samcooke/a-change-is-gonna-come",
        songReason: "A civil rights anthem honoring those who fought and died for a freedom they never lived to see."
    },
    // Additional Voting Rights Stop 13
    {
        id: 13,
        name: "Boston Women's Memorial",
        location: "Commonwealth Ave Mall",
        coordinates: [42.3523, -71.0774],
        creator: "VoteCraft Boston",
        likes: 345,
        civicTheme: CIVIC_THEMES.EDUCATION,
        widget: "voting-timeline",
        description: "This sculpture honors Abigail Adams (who urged 'remember the ladies'), Lucy Stone (suffragist who kept her maiden name), and Phillis Wheatley (first published African American poet). Women's suffrage took 72 years of organized struggle after Seneca Falls.",
        learnMore: "When Abigail wrote to John Adams about women's rights in 1776, he laughed it off. It took 144 years for women to win the vote nationally.",
        soundcloudUrl: "https://soundcloud.com/helenreddy/i-am-woman",
        songReason: "A feminist anthem capturing the perseverance of those who fought for decades for equality."
    },
    // Additional Voting Rights Stop 14
    {
        id: 14,
        name: "Government Center: Your Voice",
        location: "City Hall Plaza",
        coordinates: [42.3604, -71.0589],
        creator: "VoteCraft Boston",
        likes: 256,
        civicTheme: CIVIC_THEMES.HOUSING,
        widget: "voter-turnout",
        description: "Boston's Brutalist City Hall sits where democracy happens daily - permits, licenses, marriages, and voter registration. The building is open to all. So is democracy, if we protect it. This is where you register to vote.",
        learnMore: "In the 2020 election, 159 million Americans voted - the highest turnout in 120 years. Massachusetts had 76% turnout.",
        soundcloudUrl: "https://soundcloud.com/pattismith/people-have-the-power",
        songReason: "A rallying cry reminding us that power lives in the people who show up."
    },
    // Additional Voting Rights Stop 15
    {
        id: 15,
        name: "Crispus Attucks Monument",
        location: "Boston Common, Tremont St",
        coordinates: [42.3558, -71.0618],
        creator: "VoteCraft Boston",
        likes: 389,
        civicTheme: CIVIC_THEMES.JOURNALISM,
        widget: "voter-suppression",
        description: "This 1888 monument honors the five victims of the Boston Massacre, with Crispus Attucks prominently featured. Attucks was the first person killed in the American Revolution - a Black man dying for a freedom he did not possess.",
        learnMore: "For decades, Boston refused to honor Attucks. It took 118 years from his death to erect this monument. History remembers who it chooses to remember.",
        soundcloudUrl: "https://soundcloud.com/kendricklamar/alright",
        songReason: "An anthem of Black resilience echoing across centuries of struggle."
    },
    // Additional Voting Rights Stop 16
    {
        id: 16,
        name: "Harriet Tubman Square",
        location: "Columbus Ave, South End",
        coordinates: [42.3396, -71.0810],
        creator: "VoteCraft Boston",
        likes: 412,
        civicTheme: CIVIC_THEMES.HEALTHCARE,
        widget: "voter-suppression",
        description: "The 'Step on Board' sculpture shows Harriet Tubman leading enslaved people to freedom. Boston was a key stop on the Underground Railroad. Tubman said, 'I freed a thousand slaves. I could have freed a thousand more if only they knew they were slaves.'",
        learnMore: "Tubman made 13 missions and rescued about 70 enslaved people. She later served as a Union spy. She'll appear on the $20 bill - eventually.",
        soundcloudUrl: "https://soundcloud.com/beyonce/freedom",
        songReason: "A powerful anthem of fearless pursuit of freedom for oneself and others."
    },
    // Additional Voting Rights Stop 17
    {
        id: 17,
        name: "Irish Famine Memorial",
        location: "School St & Washington St",
        coordinates: [42.3574, -71.0590],
        creator: "VoteCraft Boston",
        likes: 267,
        civicTheme: CIVIC_THEMES.IMMIGRATION,
        widget: "voter-turnout",
        description: "These sculptures show starving Irish during the 1845-1852 famine, and prosperous Irish-Americans decades later. Over 100,000 Irish fled to Boston, facing 'No Irish Need Apply' signs. Within generations, they controlled the ballot box and City Hall.",
        learnMore: "The famine killed 1 million Irish and drove 2 million to emigrate. Today's debates about immigration echo the nativist backlash the Irish faced.",
        soundcloudUrl: "https://soundcloud.com/u2official/pride-in-the-name-of-love",
        songReason: "A tribute to the journey from persecution to political power through perseverance."
    },
    // Additional Voting Rights Stop 18
    {
        id: 18,
        name: "The Embrace (MLK Memorial)",
        location: "Boston Common, near Tremont St",
        coordinates: [42.3551, -71.0625],
        creator: "VoteCraft Boston",
        likes: 456,
        civicTheme: CIVIC_THEMES.DEMOCRACY,
        widget: "voter-turnout",
        description: "This 20-foot bronze depicts Martin Luther King Jr. and Coretta Scott King embracing. MLK spoke on Boston Common in 1965, the same year as the Voting Rights Act. 'The vote is the most powerful instrument ever devised by man for breaking down injustice.'",
        learnMore: "MLK called Boston his 'second home' - he met Coretta at the New England Conservatory and earned his PhD at Boston University.",
        soundcloudUrl: "https://soundcloud.com/stevie-wonder-official/happy-birthday",
        songReason: "A song that helped make MLK Day a federal holiday - celebrating love and legacy."
    },
    // Additional Voting Rights Stop 19
    {
        id: 19,
        name: "New England Holocaust Memorial",
        location: "Congress St, near Faneuil Hall",
        coordinates: [42.3612, -71.0573],
        creator: "VoteCraft Boston",
        likes: 478,
        civicTheme: CIVIC_THEMES.ECONOMY,
        widget: "voter-suppression",
        description: "Six glass towers represent six million Jews killed. The Holocaust began with voting - Hitler was elected, then dismantled democracy. The memorial warns: democracy can be destroyed from within if citizens don't protect it.",
        learnMore: "The memorial was vandalized twice in 2017. Democracy requires vigilance against hate. The path through the towers quotes survivors.",
        soundcloudUrl: "https://soundcloud.com/leonardcohen/hallelujah",
        songReason: "A spiritual meditation on brokenness and praise - finding beauty in sorrow."
    },
    // Additional Voting Rights Stop 20
    {
        id: 20,
        name: "Park Street Church: First Amendment",
        location: "Park Street Church",
        coordinates: [42.3565, -71.0619],
        creator: "VoteCraft Boston",
        likes: 234,
        civicTheme: CIVIC_THEMES.VOTING,
        widget: "voting-timeline",
        description: "William Lloyd Garrison gave his first major anti-slavery speech here in 1829. 'America, it is to thee' was first sung here on July 4, 1831. Free speech, assembly, and petition are the foundation of voting rights - citizens must be able to organize.",
        learnMore: "Women couldn't vote until 1920. Black women in the South couldn't practically exercise that right until 1965. Progress is never linear.",
        soundcloudUrl: "https://soundcloud.com/brucespringsteen/born-to-run",
        songReason: "An urgent anthem of escape and hope - the American dream in motion."
    }
];

// Civic Art Tour - Murals & Sculptures of Democracy (multicolored pins showing interconnected issues)
const ART_TOUR = [
    {
        id: 1,
        name: "The Embrace (MLK Memorial)",
        location: "Boston Common, near Tremont St",
        coordinates: [42.3551, -71.0625],
        creator: "VoteCraft Boston",
        likes: 456,
        civicTheme: CIVIC_THEMES.DEMOCRACY,
        widget: "voting-timeline",
        image: "https://upload.wikimedia.org/wikipedia/en/5/5a/The_Embrace%2C_a_sculpture_in_Boston_Common_in_Boston.jpg",
        description: "Unveiled in 2023, this 20-foot bronze sculpture by Hank Willis Thomas depicts the embrace of Martin Luther King Jr. and Coretta Scott King. It commemorates their 1965 speech on Boston Common and represents love as a force for social change.",
        learnMore: "MLK called Boston his 'second home' - he met Coretta at the New England Conservatory and earned his PhD at Boston University. The sculpture sparked debate about how we memorialize leaders.",
        soundcloudUrl: "https://soundcloud.com/stevie-wonder-official/happy-birthday",
        songReason: "A song that campaigned for years to honor a leader - celebrating love as a force for change."
    },
    {
        id: 2,
        name: "Robert Gould Shaw Memorial",
        location: "Beacon St & Park St, Boston Common",
        coordinates: [42.3576, -71.0635],
        creator: "VoteCraft Boston",
        likes: 523,
        civicTheme: CIVIC_THEMES.VOTING,
        widget: "voter-turnout",
        image: "https://upload.wikimedia.org/wikipedia/commons/7/77/Robert_Gould_Shaw_Memorial_-_detail.jpg",
        description: "Augustus Saint-Gaudens spent 14 years creating this bronze relief honoring Colonel Robert Gould Shaw and the 54th Massachusetts Infantry - the first Black regiment in the Civil War. The soldiers march toward death and glory, fighting for a country that denied them citizenship.",
        learnMore: "Half the 54th died in their assault on Fort Wagner. The film 'Glory' tells their story. Black soldiers were paid less than white soldiers until Congress equalized pay in 1864.",
        soundcloudUrl: "https://soundcloud.com/samcooke/a-change-is-gonna-come",
        songReason: "A civil rights anthem about the sacrifice of those who fought for a country that denied them equality."
    },
    {
        id: 3,
        name: "Crispus Attucks Monument",
        location: "Boston Common, Tremont St",
        coordinates: [42.3558, -71.0618],
        creator: "VoteCraft Boston",
        likes: 389,
        civicTheme: CIVIC_THEMES.JOURNALISM,
        widget: "voter-suppression",
        image: "https://upload.wikimedia.org/wikipedia/commons/8/89/Boston_Massacre_Memorial_-_IMG_9560.JPG",
        description: "This 1888 monument honors the five victims of the Boston Massacre, with Crispus Attucks - a Black sailor of African and Native American descent - prominently featured. Attucks was the first person killed in the American Revolution, a Black man dying for a freedom he did not possess.",
        learnMore: "For decades, Boston refused to honor Attucks. It took 118 years from his death to erect this monument. History remembers who it chooses to remember.",
        soundcloudUrl: "https://soundcloud.com/ninasimonefans/mississippi-goddam",
        songReason: "A fierce protest song channeling centuries of rage at injustice and violence."
    },
    {
        id: 4,
        name: "Boston Women's Memorial",
        location: "Commonwealth Ave Mall, near Fairfield St",
        coordinates: [42.3523, -71.0774],
        creator: "VoteCraft Boston",
        likes: 345,
        civicTheme: CIVIC_THEMES.EDUCATION,
        widget: "voting-timeline",
        image: "https://www.boston.gov/sites/default/files/styles/800_embedded_ckeditor/public/img/library/photos/2023/10/women-big.jpg?itok=cdHTlwFv",
        description: "Meredith Bergmann's 2003 sculpture honors three Massachusetts women: Abigail Adams (who urged her husband to 'remember the ladies'), Lucy Stone (suffragist who kept her maiden name), and Phillis Wheatley (the first published African American poet).",
        learnMore: "When Abigail wrote to John Adams about women's rights in 1776, he laughed it off. It took 144 years for women to win the vote.",
        soundcloudUrl: "https://soundcloud.com/arethafranklin/respect",
        songReason: "A demand for respect honoring generations of women who fought for recognition."
    },
    {
        id: 5,
        name: "Harriet Tubman 'Step on Board'",
        location: "Harriet Tubman Square, South End",
        coordinates: [42.3396, -71.0810],
        creator: "VoteCraft Boston",
        likes: 412,
        civicTheme: CIVIC_THEMES.IMMIGRATION,
        widget: "voter-suppression",
        image: "https://upload.wikimedia.org/wikipedia/commons/8/81/Harriet_Tubman_Memorial_Boston.jpg",
        description: "Fern Cunningham's 1999 sculpture shows Harriet Tubman leading enslaved people to freedom on the Underground Railroad. Boston was a key stop on that railroad, with abolitionists hiding freedom seekers in Beacon Hill homes just blocks from the State House.",
        learnMore: "Tubman made 13 missions and rescued about 70 enslaved people. She later served as a Union spy. She'll appear on the $20 bill - eventually.",
        soundcloudUrl: "https://soundcloud.com/beyonce/freedom",
        songReason: "A powerful anthem embodying fearless leadership on the path to freedom."
    },
    {
        id: 6,
        name: "Samuel Adams Statue",
        location: "Faneuil Hall, Congress St",
        coordinates: [42.3601, -71.0568],
        creator: "VoteCraft Boston",
        likes: 298,
        civicTheme: CIVIC_THEMES.DEMOCRACY,
        widget: "rcv-demo",
        image: "https://images.unsplash.com/photo-1575936123452-b67c3203c357?w=800&q=80",
        description: "Anne Whitney's 1880 bronze depicts the 'Father of the American Revolution' pointing defiantly, as if challenging British authority. Adams organized the Sons of Liberty, planned the Boston Tea Party, and signed the Declaration. He stands before the 'Cradle of Liberty.'",
        learnMore: "Adams was a failed businessman but a brilliant propagandist. He wrote under dozens of pen names, flooding newspapers with revolutionary ideas.",
        soundcloudUrl: "https://soundcloud.com/public-enemy-music/fight-the-power-1",
        songReason: "A revolutionary anthem channeling the radical spirit of resistance against tyranny."
    },
    {
        id: 7,
        name: "Irish Famine Memorial",
        location: "School St & Washington St",
        coordinates: [42.3574, -71.0590],
        creator: "VoteCraft Boston",
        likes: 267,
        civicTheme: CIVIC_THEMES.HOUSING,
        widget: "immigration-data",
        image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
        description: "Robert Shure's 1998 sculptures show two groups: starving Irish during the 1845-1852 famine, and prosperous Irish-Americans decades later. Over 100,000 Irish fled to Boston, facing 'No Irish Need Apply' signs. Within generations, they ran the city.",
        learnMore: "The famine killed 1 million Irish and drove 2 million to emigrate. Today's debates about immigration echo the nativist backlash the Irish faced.",
        soundcloudUrl: "https://soundcloud.com/u2official/sunday-bloody-sunday",
        songReason: "A protest song connecting legacies of suffering to ongoing struggles for justice."
    },
    {
        id: 8,
        name: "Soldiers and Sailors Monument",
        location: "Boston Common, Flagstaff Hill",
        coordinates: [42.3553, -71.0662],
        creator: "VoteCraft Boston",
        likes: 234,
        civicTheme: CIVIC_THEMES.SCOTUS,
        widget: "voter-turnout",
        image: "https://images.unsplash.com/photo-1569974507005-6dc61f97fb5c?w=800&q=80",
        description: "Martin Milmore's 1877 monument honors Civil War soldiers and sailors. Four bronze figures represent Peace, History, the Navy, and the Army. At the base, relief sculptures depict departure for war, battle, the sanitary commission, and the return home.",
        learnMore: "Massachusetts sent over 150,000 men to fight in the Civil War. The monument cost $93,000 - equivalent to about $2.5 million today.",
        soundcloudUrl: "https://soundcloud.com/brucespringsteen/born-in-the-usa",
        songReason: "A complex portrait of soldiers and the sacrifices made in the name of country."
    },
    {
        id: 9,
        name: "New England Holocaust Memorial",
        location: "Congress St, near Faneuil Hall",
        coordinates: [42.3612, -71.0573],
        creator: "VoteCraft Boston",
        likes: 478,
        civicTheme: CIVIC_THEMES.HEALTHCARE,
        widget: "voter-suppression",
        image: "https://images.unsplash.com/photo-1590012314607-cda9d9b699ae?w=800&q=80",
        description: "Six luminous glass towers, each 54 feet tall, represent the six million Jews killed and the six major death camps. Steam rises from grates below, evoking crematorium smoke. Numbers etched in glass memorialize individual victims. Never forget.",
        learnMore: "The memorial was vandalized twice in 2017. Democracy requires vigilance against hate. The path through the towers quotes survivors.",
        soundcloudUrl: "https://soundcloud.com/leonardcohen/hallelujah",
        songReason: "A meditation on broken faith and transcendence - finding light in darkness."
    },
    {
        id: 10,
        name: "Frederick Douglass Mural",
        location: "Tremont St at Ruggles, Roxbury",
        coordinates: [42.3365, -71.0896],
        creator: "VoteCraft Boston",
        likes: 356,
        civicTheme: CIVIC_THEMES.ECONOMY,
        widget: "voting-timeline",
        image: "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=800&q=80",
        description: "This vibrant mural depicts Frederick Douglass, who spoke throughout Boston demanding abolition and equal rights. Roxbury's streets feature numerous murals celebrating Black history, from civil rights leaders to local heroes. Public art makes history visible.",
        learnMore: "Douglass escaped slavery and became America's most powerful voice against it. He advised Lincoln, recruited Black soldiers, and fought for women's suffrage.",
        soundcloudUrl: "https://soundcloud.com/kendricklamar/alright",
        songReason: "An anthem of Black resilience and hope channeling the spirit of perseverance."
    },
    {
        id: 11,
        name: "What Lifts You Wings Mural",
        location: "The Lenox Hotel, Boylston & Exeter St",
        coordinates: [42.3491, -71.0766],
        creator: "VoteCraft Boston",
        likes: 534,
        civicTheme: CIVIC_THEMES.HEALTHCARE,
        widget: "life-expectancy",
        image: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=800&q=80",
        description: "Artist Kelsey Montague painted these giant blue and yellow wings on The Lenox Hotel, steps from the Boston Marathon finish line. Part of her #WhatLiftsYou series, visitors pose with the wings behind them. The interactive mural celebrates resilience, aspiration, and the spirit of Boston Strong.",
        learnMore: "Montague's wings have appeared in cities worldwide, each asking 'What lifts you?' Near the marathon finish, runners and survivors pose with wings representing triumph over adversity.",
        soundcloudUrl: "https://soundcloud.com/beyonce/freedom",
        songReason: "An anthem of liberation and triumph celebrating resilience and aspiration."
    }
];

// Supreme Court Reform Tour - 10 stops (multicolored pins showing interconnected issues)
const SCOTUS_TOUR = [
    {
        id: 1,
        name: "Old City Hall: Halls of Justice",
        location: "45 School St",
        coordinates: [42.3580, -71.0594],
        creator: "VoteCraft Boston",
        likes: 356,
        civicTheme: CIVIC_THEMES.SCOTUS,
        widget: "scotus-approval",
        description: "Boston's courts upheld the Fugitive Slave Act in the 1850s, forcing the return of escaped slaves. Judge Lemuel Shaw, Herman Melville's father-in-law, was among those who enforced unjust laws. Courts reflect their times - and can perpetuate injustice.",
        learnMore: "Supreme Court approval dropped to 40% in 2023 - the lowest ever recorded. Trust in judicial institutions is declining.",
        soundcloudUrl: "https://soundcloud.com/metallica/and-justice-for-all"
    },
    {
        id: 2,
        name: "Faneuil Hall: Constitutional Debates",
        location: "Faneuil Hall, Congress St",
        coordinates: [42.3600, -71.0569],
        creator: "VoteCraft Boston",
        likes: 334,
        civicTheme: CIVIC_THEMES.DEMOCRACY,
        widget: "court-expansion",
        image: "https://upload.wikimedia.org/wikipedia/commons/3/35/2017_Faneuil_Hall.jpg",
        description: "The founders debated everything here - including how to structure the courts. The Constitution doesn't specify how many Supreme Court justices there should be. Congress has changed the number seven times, from 5 to 10 to the current 9.",
        learnMore: "FDR tried to expand the Court to 15 justices in 1937. He failed, but the threat may have influenced the Court to uphold New Deal programs.",
        soundcloudUrl: "https://soundcloud.com/brucespringsteen/born-in-the-usa"
    },
    {
        id: 3,
        name: "State House: Judicial Selection",
        location: "24 Beacon St",
        coordinates: [42.3587, -71.0637],
        creator: "VoteCraft Boston",
        likes: 298,
        civicTheme: CIVIC_THEMES.VOTING,
        widget: "judicial-terms",
        description: "Federal judges serve for life; Massachusetts judges face mandatory retirement at 70. State judicial selection varies: elections, appointments, commissions. Each method has tradeoffs between independence and accountability.",
        learnMore: "The average Supreme Court justice now serves 26 years - up from 15 in 1970. Longer terms mean fewer opportunities to shape the Court.",
        soundcloudUrl: "https://soundcloud.com/davidbowie/changes"
    },
    {
        id: 4,
        name: "Old State House: Rule of Law",
        location: "206 Washington St",
        coordinates: [42.3588, -71.0578],
        creator: "VoteCraft Boston",
        likes: 389,
        civicTheme: CIVIC_THEMES.JOURNALISM,
        widget: "ethics-reform",
        description: "The Declaration of Independence was read from this balcony. It accused King George of obstructing justice and making judges dependent on his will. The founders feared concentrated judicial power - yet created lifetime appointments.",
        learnMore: "SCOTUS has no binding ethics code - the only federal court without one. Justices have received millions in undisclosed gifts.",
        soundcloudUrl: "https://soundcloud.com/bobdylan/the-times-they-are-a-changin"
    },
    {
        id: 5,
        name: "Granary: Founders on Courts",
        location: "Tremont St",
        coordinates: [42.3573, -71.0610],
        creator: "VoteCraft Boston",
        likes: 267,
        civicTheme: CIVIC_THEMES.IMMIGRATION,
        widget: "court-expansion",
        description: "John Adams, buried here, championed an independent judiciary. He wrote the Massachusetts Constitution's 'rule of law' clause. Adams defended British soldiers after the Boston Massacre, proving even unpopular defendants deserve justice.",
        learnMore: "Adams said, 'Facts are stubborn things.' He believed in rule of law even when politically costly. Six accused soldiers were acquitted.",
        soundcloudUrl: "https://soundcloud.com/buffalospringfield/for-what-its-worth"
    },
    {
        id: 6,
        name: "Boston Massacre Site: Justice Tested",
        location: "State St & Congress St",
        coordinates: [42.3589, -71.0574],
        creator: "VoteCraft Boston",
        likes: 312,
        civicTheme: CIVIC_THEMES.ECONOMY,
        widget: "scotus-approval",
        description: "The circle of cobblestones marks where Crispus Attucks and four others died. John Adams' defense of the soldiers proved the colonies could provide fair trials. 'Counsel ought to be the last thing that an accused person should want,' he said.",
        learnMore: "Public opinion demanded conviction; Adams secured acquittals. Independence of the judiciary means ruling against popular sentiment when justice requires.",
        soundcloudUrl: "https://soundcloud.com/rageagainstthemachine/killing-in-the-name"
    },
    {
        id: 7,
        name: "Old South Meeting House: Judicial Review",
        location: "310 Washington St",
        coordinates: [42.3567, -71.0585],
        creator: "VoteCraft Boston",
        likes: 234,
        civicTheme: CIVIC_THEMES.HEALTHCARE,
        widget: "judicial-terms",
        description: "Colonial courts had limited power over Parliament. After independence, Marbury v. Madison (1803) established judicial review - courts can strike down laws as unconstitutional. This power isn't in the Constitution; the Court claimed it.",
        learnMore: "Judicial review makes the Supreme Court extraordinarily powerful. No other democracy gives courts such unchecked authority over legislation.",
        soundcloudUrl: "https://soundcloud.com/johnlennon/power-to-the-people"
    },
    {
        id: 8,
        name: "African Meeting House: Dred Scott's Shadow",
        location: "8 Smith Court",
        coordinates: [42.3598, -71.0650],
        creator: "VoteCraft Boston",
        likes: 287,
        civicTheme: CIVIC_THEMES.HOUSING,
        widget: "ethics-reform",
        description: "In 1857, the Supreme Court's Dred Scott decision declared Black people could never be citizens. Boston's abolitionists gathered here in outrage. The decision is considered the worst in Court history - proof that the Court can be catastrophically wrong.",
        learnMore: "Dred Scott accelerated the Civil War. Other reviled decisions: Plessy v. Ferguson (segregation), Korematsu (Japanese internment), Citizens United (unlimited money in politics).",
        soundcloudUrl: "https://soundcloud.com/ninasimonefans/mississippi-goddam"
    },
    {
        id: 9,
        name: "Park Street Church: Moral Authority",
        location: "Park Street Church",
        coordinates: [42.3564, -71.0621],
        creator: "VoteCraft Boston",
        likes: 198,
        civicTheme: CIVIC_THEMES.EDUCATION,
        widget: "scotus-approval",
        description: "Churches and courts both claim moral authority. When the Supreme Court ruled against prayer in schools (1962) and for abortion rights (1973), religious conservatives began a decades-long campaign to reshape the judiciary.",
        learnMore: "The Federalist Society, founded in 1982, has successfully placed conservative judges throughout the federal judiciary.",
        soundcloudUrl: "https://soundcloud.com/rem-official/losing-my-religion"
    },
    {
        id: 10,
        name: "Government Center: We the People",
        location: "City Hall Plaza",
        coordinates: [42.3604, -71.0589],
        creator: "VoteCraft Boston",
        likes: 245,
        civicTheme: CIVIC_THEMES.CLIMATE,
        widget: "court-expansion",
        description: "Democracy requires that power flows from the people. The Supreme Court, with lifetime appointments and no elections, seems to contradict this. Reformers propose term limits, expansion, or rotation. The debate over judicial power continues.",
        learnMore: "Proposals include: 18-year terms, adding 4 justices, rotating appeals court judges to SCOTUS, or requiring supermajority votes to overturn laws.",
        soundcloudUrl: "https://soundcloud.com/youngbloods/get-together"
    }
];

// Update tour types with new stop counts
const ALL_TOURS = {
    'civic-sampler': CIVIC_SAMPLER_TOUR,
    'healthcare': HEALTHCARE_TOUR,
    'voting-rights': VOTING_TOUR,
    'art-action': ART_TOUR
};

// Current active tour
let currentTourId = 'civic-sampler';
