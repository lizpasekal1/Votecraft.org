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

// Freedom Trail Civic Sampler - 10 stops covering all themes
const PLANETUNE_PLAYLISTS = [
    {
        id: 1,
        name: "Faneuil Hall: Cradle of Liberty",
        location: "Faneuil Hall, Congress St",
        coordinates: [42.3600, -71.0569],
        creator: "VoteCraft Boston",
        likes: 312,
        civicTheme: CIVIC_THEMES.DEMOCRACY,
        widget: "rcv-demo",
        image: "https://picsum.photos/seed/faneuil/400/300",
        description: "Built in 1742 by merchant Peter Faneuil, this hall hosted the debates that sparked a revolution. Samuel Adams, James Otis, and the Sons of Liberty gathered here to protest the Stamp Act and rally colonists toward independence. The phrase 'Cradle of Liberty' was earned here.",
        learnMore: "Frederick Douglass, Susan B. Anthony, and JFK all spoke from this same stage. Massachusetts voters approved RCV for local elections in 2020.",
        soundcloudUrl: "https://soundcloud.com/public-enemy-music/fight-the-power-1"
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
        image: "https://picsum.photos/seed/statehouse/400/300",
        description: "Charles Bulfinch designed this iconic building in 1798. The golden dome (originally wood, then copper by Paul Revere, gilded in 1874) has watched over Massachusetts politics for over 225 years. In 2006, Governor Romney signed the nation's first universal healthcare law here.",
        learnMore: "The 'Sacred Cod' hanging in the House chamber has been there since 1784, symbolizing the fishing industry's importance. MA's healthcare law became the model for the ACA.",
        soundcloudUrl: "https://soundcloud.com/bill-withers-official/lean-on-me-2"
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
        image: "https://picsum.photos/seed/oldstate/400/300",
        description: "On March 5, 1770, British soldiers fired into a crowd here, killing five colonists including Crispus Attucks, a Black man who became the first martyr of the Revolution. The cobblestone circle marks where blood was shed for the cause of representation.",
        learnMore: "John Adams defended the British soldiers in court to prove the colonies could provide fair trials. Only 66% of eligible Americans voted in 2020 - the highest in 120 years.",
        soundcloudUrl: "https://soundcloud.com/samcooke/a-change-is-gonna-come"
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
        image: "https://picsum.photos/seed/bostonpark/400/300",
        description: "Established in 1634, this is America's oldest public park - common land where anyone could graze cattle. It's been a British Army camp, a public hanging site, and a gathering place for protests. The Common represents land that belongs to everyone.",
        learnMore: "Martin Luther King Jr. spoke here in 1965. Today, Boston's median rent is $3,200/month - requiring an income of $128,000/year to afford.",
        soundcloudUrl: "https://soundcloud.com/tracychapmanofficial/tracy-chapman-fast-car"
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
        image: "https://picsum.photos/seed/granary/400/300",
        description: "Samuel Adams, Paul Revere, John Hancock, and victims of the Boston Massacre rest here among 2,300 graves. These founders were descendants of immigrants who fled religious persecution in Europe. America has always been shaped by newcomers seeking freedom.",
        learnMore: "Paul Revere's family were French Huguenot refugees. Immigrants or their children founded 45% of Fortune 500 companies.",
        soundcloudUrl: "https://soundcloud.com/brucespringsteen/this-land-is-your-land-live"
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
        image: "https://picsum.photos/seed/cityhall/400/300",
        description: "This French Second Empire building served as Boston's City Hall from 1865-1969. Benjamin Franklin was born on this street in 1706. The building that once housed democratic power is now luxury offices and a steakhouse - a metaphor for America's economy.",
        learnMore: "The donkey statue outside commemorates the Democratic Party's symbol. The top 1% now own more wealth than the bottom 90% combined.",
        soundcloudUrl: "https://soundcloud.com/dollyparton/9-to-5-10"
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
        image: "https://picsum.photos/seed/meetinghouse/400/300",
        description: "On December 16, 1773, 5,000 colonists packed this church to debate the tea tax. When Governor Hutchinson refused to let tea ships leave, Samuel Adams gave the signal: 'This meeting can do nothing more.' The Boston Tea Party began. Today we face a new crisis.",
        learnMore: "The tea dumped was worth $1.7 million in today's dollars. By 2050, parts of Boston could flood 90+ days per year due to climate change.",
        soundcloudUrl: "https://soundcloud.com/jonimitchell/big-yellow-taxi"
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
        image: "https://picsum.photos/seed/kingschapel/400/300",
        description: "Founded in 1686 as the first Anglican church in Puritan Boston, King's Chapel stands near the site of America's first public school (Boston Latin, 1635). The Puritans believed education was radical - everyone should read scripture. Today, student debt tops $1.7 trillion.",
        learnMore: "Boston Latin School alumni include Samuel Adams, Benjamin Franklin, and John Hancock. Average student debt: $37,000.",
        soundcloudUrl: "https://soundcloud.com/grandmasterflashmusic/the-message-12-single-version"
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
        image: "https://picsum.photos/seed/paulrevere/400/300",
        description: "Paul Revere lived here from 1770-1800. His midnight ride spread the news: 'The British are coming!' In an era before mass media, information traveled by horseback. Revere was an early 'influencer' - his engraving of the Boston Massacre shaped public opinion.",
        learnMore: "Revere's engraving was propaganda - it depicted soldiers firing in formation, not the chaotic reality. Only 32% of Americans trust the media today.",
        soundcloudUrl: "https://soundcloud.com/therollingstones/sympathy-for-the-devil"
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
        image: "https://picsum.photos/seed/oldnorth/400/300",
        description: "On April 18, 1775, sexton Robert Newman hung two lanterns in this steeple: 'Two if by sea.' The signal launched the Revolution. This church reminds us that ordinary people, taking courageous action, can change history. The balance of power matters.",
        learnMore: "The church's box pews were originally owned by wealthy families. Supreme Court approval dropped to 40% in 2023 - the lowest ever recorded.",
        soundcloudUrl: "https://soundcloud.com/u2official/sunday-bloody-sunday"
    }
];

// Healthcare Justice Tour - 10 stops (multicolored pins showing interconnected issues)
const HEALTHCARE_TOUR = [
    {
        id: 1,
        name: "State House: Healthcare Pioneer",
        location: "24 Beacon St (Golden Dome)",
        coordinates: [42.3587, -71.0637],
        creator: "VoteCraft Boston",
        likes: 289,
        civicTheme: CIVIC_THEMES.HEALTHCARE,
        widget: "healthcare-cost",
        description: "In 2006, Massachusetts became the first state to require health insurance for all residents. Governor Mitt Romney, a Republican, signed the law that became the blueprint for Obamacare. Healthcare policy is made under this golden dome.",
        learnMore: "Before 'Romneycare,' 6% of MA residents were uninsured. After: under 3%. Nationally, 27 million remain uninsured.",
        soundcloudUrl: "https://soundcloud.com/bill-withers-official/lean-on-me-2"
    },
    {
        id: 2,
        name: "Faneuil Hall: Healthcare Debates",
        location: "Faneuil Hall, Congress St",
        coordinates: [42.3600, -71.0569],
        creator: "VoteCraft Boston",
        likes: 234,
        civicTheme: CIVIC_THEMES.DEMOCRACY,
        widget: "healthcare-compare",
        description: "The Cradle of Liberty has hosted debates on every major American issue. In 1850, abolitionists and slavery defenders clashed here. Today, healthcare is equally contentious. Should it be a right or a privilege?",
        learnMore: "Americans pay 2-3x more for healthcare than citizens of other wealthy nations, but rank last in health outcomes among developed countries.",
        soundcloudUrl: "https://soundcloud.com/marvingaye/whats-going-on"
    },
    {
        id: 3,
        name: "Boston Common: Public Health Origins",
        location: "Boston Common",
        coordinates: [42.3550, -71.0656],
        creator: "VoteCraft Boston",
        likes: 178,
        civicTheme: CIVIC_THEMES.CLIMATE,
        widget: "life-expectancy",
        description: "During Colonial epidemics, Boston Common served as an emergency burial ground. The 1721 smallpox outbreak killed 844 Bostonians. Cotton Mather controversially promoted inoculation - early public health activism that saved countless lives.",
        learnMore: "Life expectancy in Boston varies by 30 years depending on neighborhood. Roxbury: 59 years. Back Bay: 92 years.",
        soundcloudUrl: "https://soundcloud.com/beegees/stayin-alive"
    },
    {
        id: 4,
        name: "Massachusetts General Hospital",
        location: "55 Fruit St",
        coordinates: [42.3632, -71.0686],
        creator: "VoteCraft Boston",
        likes: 298,
        civicTheme: CIVIC_THEMES.HEALTHCARE,
        widget: "healthcare-cost",
        description: "Founded in 1811, MGH is the third-oldest general hospital in the US. The 'Ether Dome' witnessed the first public demonstration of surgical anesthesia in 1846 - a Boston innovation that transformed medicine worldwide.",
        learnMore: "MGH is consistently ranked among the top hospitals globally. Yet medical bills are the leading cause of US bankruptcies.",
        soundcloudUrl: "https://soundcloud.com/michaeljackson/heal-the-world"
    },
    {
        id: 5,
        name: "Old South Meeting House: Dorothea Dix",
        location: "310 Washington St",
        coordinates: [42.3567, -71.0585],
        creator: "VoteCraft Boston",
        likes: 198,
        civicTheme: CIVIC_THEMES.EDUCATION,
        widget: "mental-health",
        description: "Dorothea Dix taught Sunday school in this building in the 1820s before becoming America's greatest mental health reformer. She documented horrific asylum conditions and convinced 20 states to build humane treatment facilities.",
        learnMore: "1 in 5 Americans experience mental illness yearly, but 60% don't receive treatment due to cost, stigma, or lack of access.",
        soundcloudUrl: "https://soundcloud.com/rem-official/everybody-hurts"
    },
    {
        id: 6,
        name: "Granary Burying Ground: Colonial Medicine",
        location: "Tremont St",
        coordinates: [42.3573, -71.0610],
        creator: "VoteCraft Boston",
        likes: 212,
        civicTheme: CIVIC_THEMES.VOTING,
        widget: "life-expectancy",
        description: "Among the 2,300 buried here are victims of epidemics that regularly devastated colonial Boston. Average life expectancy in 1750 was just 36 years. Public health measures, vaccines, and sanitation have more than doubled human lifespan.",
        learnMore: "In 1900, US life expectancy was 47. Today it's 76 - but has been declining since 2014, the only developed nation with this trend.",
        soundcloudUrl: "https://soundcloud.com/gloriaganyor/i-will-survive"
    },
    {
        id: 7,
        name: "Park Street Church: Temperance Movement",
        location: "Park Street Church",
        coordinates: [42.3564, -71.0621],
        creator: "VoteCraft Boston",
        likes: 167,
        civicTheme: CIVIC_THEMES.IMMIGRATION,
        widget: "mental-health",
        description: "Called 'Brimstone Corner' for its fiery sermons, this church led the temperance movement against alcohol abuse - an early public health campaign. Addiction was seen as moral failure then; today we understand it as a disease requiring treatment.",
        learnMore: "Over 100,000 Americans die annually from drug overdoses. The opioid crisis has killed more Americans than Vietnam, Iraq, and Afghanistan combined.",
        soundcloudUrl: "https://soundcloud.com/johnnyca$h/hurt"
    },
    {
        id: 8,
        name: "Haymarket: Food & Health",
        location: "Haymarket Square",
        coordinates: [42.3610, -71.0577],
        creator: "VoteCraft Boston",
        likes: 189,
        civicTheme: CIVIC_THEMES.ECONOMY,
        widget: "healthcare-compare",
        description: "Boston's oldest open-air market has operated since 1830, providing fresh produce to generations. Food access is healthcare - diet-related diseases like diabetes and heart disease are leading causes of death, especially in 'food deserts.'",
        learnMore: "23 million Americans live in food deserts without access to fresh groceries. Diet-related diseases cost the US $1 trillion annually.",
        soundcloudUrl: "https://soundcloud.com/bobmarley/one-love"
    },
    {
        id: 9,
        name: "North End: Immigrant Health",
        location: "Hanover St, North End",
        coordinates: [42.3647, -71.0542],
        creator: "VoteCraft Boston",
        likes: 223,
        civicTheme: CIVIC_THEMES.IMMIGRATION,
        widget: "healthcare-cost",
        description: "Boston's oldest neighborhood has been home to waves of immigrants - Irish, Jewish, Italian. Each faced discrimination and poor health conditions. The North End's narrow streets were once tenement slums; today it's one of Boston's healthiest neighborhoods.",
        learnMore: "Immigrants use less healthcare than native-born Americans but pay into the system. Undocumented immigrants pay $12 billion in taxes annually.",
        soundcloudUrl: "https://soundcloud.com/franksinatra/new-york-new-york"
    },
    {
        id: 10,
        name: "Charlestown Navy Yard: VA Healthcare",
        location: "Charlestown Navy Yard",
        coordinates: [42.3726, -71.0545],
        creator: "VoteCraft Boston",
        likes: 245,
        civicTheme: CIVIC_THEMES.SCOTUS,
        widget: "healthcare-compare",
        description: "This naval shipyard built USS Constitution and served the nation for 174 years. Veterans who served here and elsewhere now rely on the VA - America's largest single-payer healthcare system, serving 9 million veterans annually.",
        learnMore: "The VA has higher patient satisfaction than private healthcare. Medicare for All would extend similar single-payer coverage to all Americans.",
        soundcloudUrl: "https://soundcloud.com/brucespringsteen/born-in-the-usa"
    }
];

// Voting Rights Tour - 10 stops (multicolored pins showing interconnected issues)
const VOTING_TOUR = [
    {
        id: 1,
        name: "Old State House: Taxation & Representation",
        location: "206 Washington St",
        coordinates: [42.3588, -71.0578],
        creator: "VoteCraft Boston",
        likes: 412,
        civicTheme: CIVIC_THEMES.VOTING,
        widget: "voter-turnout",
        description: "The Boston Massacre began steps from here on March 5, 1770. 'No taxation without representation' became the Revolution's rallying cry. But who could actually vote in 1776? Only white male property owners - about 6% of the population.",
        learnMore: "Crispus Attucks, a Black man, was the first to die. Black men couldn't vote until 1870; women until 1920; Native Americans until 1924.",
        soundcloudUrl: "https://soundcloud.com/samcooke/a-change-is-gonna-come"
    },
    {
        id: 2,
        name: "Faneuil Hall: Frederick Douglass",
        location: "Faneuil Hall, Congress St",
        coordinates: [42.3600, -71.0569],
        creator: "VoteCraft Boston",
        likes: 387,
        civicTheme: CIVIC_THEMES.DEMOCRACY,
        widget: "voting-timeline",
        description: "Frederick Douglass, the formerly enslaved abolitionist, spoke here multiple times demanding citizenship and voting rights for Black Americans. 'What to the Slave is the Fourth of July?' he asked in 1852. Susan B. Anthony also spoke here for women's suffrage.",
        learnMore: "It took 95 years from the Declaration of Independence to the 15th Amendment. Women waited 144 years. The Voting Rights Act wasn't passed until 1965.",
        soundcloudUrl: "https://soundcloud.com/arethafranklin/respect"
    },
    {
        id: 3,
        name: "African Meeting House",
        location: "8 Smith Court, Beacon Hill",
        coordinates: [42.3598, -71.0650],
        creator: "VoteCraft Boston",
        likes: 356,
        civicTheme: CIVIC_THEMES.JOURNALISM,
        widget: "voter-suppression",
        description: "Built in 1806, this is the oldest Black church building still standing in America. William Lloyd Garrison founded the New England Anti-Slavery Society here in 1832. This was the center of Boston's abolitionist movement and the fight for Black voting rights.",
        learnMore: "After the 15th Amendment passed in 1870, Southern states used poll taxes, literacy tests, and violence to suppress Black voters for another century.",
        soundcloudUrl: "https://soundcloud.com/ninasimonefans/mississippi-goddam"
    },
    {
        id: 4,
        name: "Granary Burying Ground: Founders' Franchise",
        location: "Tremont St",
        coordinates: [42.3573, -71.0610],
        creator: "VoteCraft Boston",
        likes: 345,
        civicTheme: CIVIC_THEMES.SCOTUS,
        widget: "rcv-demo",
        description: "Samuel Adams, John Hancock, and Paul Revere lie here - men who risked everything for self-governance. Yet they limited voting to people like themselves. Adams wrote the Massachusetts Constitution requiring property ownership to vote.",
        learnMore: "Today, felony disenfranchisement bars 5.2 million Americans from voting. In Florida, 1 in 5 Black adults cannot vote.",
        soundcloudUrl: "https://soundcloud.com/peteseeger/we-shall-overcome"
    },
    {
        id: 5,
        name: "State House: Modern Voting Laws",
        location: "24 Beacon St",
        coordinates: [42.3587, -71.0637],
        creator: "VoteCraft Boston",
        likes: 298,
        civicTheme: CIVIC_THEMES.HEALTHCARE,
        widget: "voter-suppression",
        description: "Voting laws are made in state houses. Massachusetts has some of the most accessible voting in the nation - same-day registration, early voting, mail ballots. Other states have passed hundreds of restrictions since 2020.",
        learnMore: "Since 2010, 25 states have enacted new voting restrictions. Texas closed 750 polling places in primarily Black and Hispanic neighborhoods.",
        soundcloudUrl: "https://soundcloud.com/bobmarley/get-up-stand-up"
    },
    {
        id: 6,
        name: "Boston Common: Protest & Voice",
        location: "Boston Common",
        coordinates: [42.3550, -71.0656],
        creator: "VoteCraft Boston",
        likes: 267,
        civicTheme: CIVIC_THEMES.CLIMATE,
        widget: "voter-turnout",
        description: "The First Amendment protects assembly - the right to gather and demand change. Martin Luther King Jr. spoke here in 1965. The Vietnam War protests drew 100,000. Black Lives Matter marches filled these paths. Protest is democracy in action.",
        learnMore: "Youth voter turnout doubled between 2014 and 2018. Gen Z votes at higher rates than previous generations at their age.",
        soundcloudUrl: "https://soundcloud.com/johnlegend/glory"
    },
    {
        id: 7,
        name: "Old South Meeting House: Tea Party Vote",
        location: "310 Washington St",
        coordinates: [42.3567, -71.0585],
        creator: "VoteCraft Boston",
        likes: 312,
        civicTheme: CIVIC_THEMES.ECONOMY,
        widget: "rcv-demo",
        description: "On December 16, 1773, colonists voted here on what to do about the tea tax. When legal options failed, they chose direct action. Democracy requires both voting and activism - the ballot and the streets working together.",
        learnMore: "Ranked Choice Voting lets you rank candidates. If no one gets 50%, last-place candidates are eliminated and votes redistribute until someone wins a majority.",
        soundcloudUrl: "https://soundcloud.com/publicenemy/fight-the-power"
    },
    {
        id: 8,
        name: "Park Street Church: Women's Suffrage",
        location: "Park Street Church",
        coordinates: [42.3564, -71.0621],
        creator: "VoteCraft Boston",
        likes: 234,
        civicTheme: CIVIC_THEMES.EDUCATION,
        widget: "voting-timeline",
        description: "William Lloyd Garrison gave his first major anti-slavery speech here in 1829. The church supported both abolition and women's suffrage - understanding that expanding rights for some opens doors for all. Lucy Stone, a suffragist, attended services here.",
        learnMore: "Women couldn't vote until 1920. Black women in the South couldn't practically exercise that right until 1965. Progress is never linear.",
        soundcloudUrl: "https://soundcloud.com/helenreddy/i-am-woman"
    },
    {
        id: 9,
        name: "Old City Hall: Political Machines",
        location: "45 School St",
        coordinates: [42.3580, -71.0594],
        creator: "VoteCraft Boston",
        likes: 189,
        civicTheme: CIVIC_THEMES.IMMIGRATION,
        widget: "voter-turnout",
        description: "James Michael Curley served as mayor from this building four times, once while under federal indictment. Boston's political machines controlled votes through patronage and favors. Machine politics shows both democracy's resilience and its vulnerabilities.",
        learnMore: "Gerrymandering is the modern political machine. In 2018, Wisconsin Republicans won 63% of state seats with only 45% of votes.",
        soundcloudUrl: "https://soundcloud.com/thewho/wont-get-fooled-again"
    },
    {
        id: 10,
        name: "Government Center: Your Voice",
        location: "City Hall Plaza",
        coordinates: [42.3604, -71.0589],
        creator: "VoteCraft Boston",
        likes: 256,
        civicTheme: CIVIC_THEMES.HOUSING,
        widget: "voter-turnout",
        description: "Boston's controversial Brutalist City Hall sits on land once called Scollay Square. This is where democracy happens daily - permits, licenses, marriages, and yes, voter registration. The building is open to all. So is democracy, if we protect it.",
        learnMore: "In the 2020 election, 159 million Americans voted - the highest turnout in 120 years. Your vote matters.",
        soundcloudUrl: "https://soundcloud.com/pattismith/people-have-the-power"
    }
];

// Press Freedom / Journalism Tour - 10 stops (multicolored pins showing interconnected issues)
const JOURNALISM_TOUR = [
    {
        id: 1,
        name: "Old South Meeting House: News Spreads",
        location: "310 Washington St",
        coordinates: [42.3567, -71.0585],
        creator: "VoteCraft Boston",
        likes: 367,
        civicTheme: CIVIC_THEMES.JOURNALISM,
        widget: "media-trust",
        description: "On December 16, 1773, 5,000 colonists gathered here for news about the tea ships. In an age before mass media, churches and meeting houses were how information spread. Samuel Adams knew that controlling the narrative meant winning the revolution.",
        learnMore: "Only 32% of Americans say they trust the media 'a great deal' - down from 72% in 1976. The information ecosystem has fractured.",
        soundcloudUrl: "https://soundcloud.com/simonandgarfunkel/the-sounds-of-silence"
    },
    {
        id: 2,
        name: "Faneuil Hall: William Lloyd Garrison",
        location: "Faneuil Hall, Congress St",
        coordinates: [42.3600, -71.0569],
        creator: "VoteCraft Boston",
        likes: 334,
        civicTheme: CIVIC_THEMES.DEMOCRACY,
        widget: "press-freedom",
        description: "In 1835, a pro-slavery mob dragged abolitionist editor William Lloyd Garrison through Boston's streets with a rope around his neck. His crime? Publishing The Liberator, an anti-slavery newspaper. He survived and published for 30 more years.",
        learnMore: "The US ranks 45th globally in press freedom (2024). Journalists face increasing harassment, legal threats, and violence.",
        soundcloudUrl: "https://soundcloud.com/beyonce/freedom"
    },
    {
        id: 3,
        name: "King's Chapel: First Newspaper",
        location: "58 Tremont St",
        coordinates: [42.3581, -71.0603],
        creator: "VoteCraft Boston",
        likes: 289,
        civicTheme: CIVIC_THEMES.EDUCATION,
        widget: "misinformation",
        description: "Near here, Publick Occurrences Both Forreign and Domestick was published on September 25, 1690 - the first newspaper in the American colonies. It was immediately suppressed by the colonial government. The tension between press and power is as old as America.",
        learnMore: "False news stories are 70% more likely to be shared on social media than true ones. The speed of lies outpaces fact-checking.",
        soundcloudUrl: "https://soundcloud.com/radiohead/fake-plastic-trees"
    },
    {
        id: 4,
        name: "Old City Hall: Local News Crisis",
        location: "45 School St",
        coordinates: [42.3580, -71.0594],
        creator: "VoteCraft Boston",
        likes: 256,
        civicTheme: CIVIC_THEMES.ECONOMY,
        widget: "news-deserts",
        description: "City Hall was once covered by dozens of beat reporters who knew every alderman's name. Today, one reporter might cover three cities. When local journalism dies, corruption thrives. Studies show that municipal borrowing costs rise when newspapers close.",
        learnMore: "Since 2005, the US has lost 2,500 newspapers and 30,000 journalism jobs. 1,800 communities are now 'news deserts' with no local coverage.",
        soundcloudUrl: "https://soundcloud.com/donhenley/dirty-laundry"
    },
    {
        id: 5,
        name: "Paul Revere House: The Original Influencer",
        location: "19 North Square",
        coordinates: [42.3637, -71.0536],
        creator: "VoteCraft Boston",
        likes: 312,
        civicTheme: CIVIC_THEMES.JOURNALISM,
        widget: "media-trust",
        description: "Paul Revere was a silversmith, but his most powerful tool was the printing press. His engraving of the Boston Massacre - showing soldiers firing in formation - was propaganda that shaped public opinion. Revere understood the power of images.",
        learnMore: "Revere's engraving wasn't accurate journalism - it was persuasion. Today's memes serve the same function, spreading faster than facts.",
        soundcloudUrl: "https://soundcloud.com/therollingstones/sympathy-for-the-devil"
    },
    {
        id: 6,
        name: "Old State House: Declaration Announced",
        location: "206 Washington St",
        coordinates: [42.3588, -71.0578],
        creator: "VoteCraft Boston",
        likes: 378,
        civicTheme: CIVIC_THEMES.VOTING,
        widget: "press-freedom",
        description: "The Declaration of Independence was first read to Bostonians from this balcony on July 18, 1776. News took two weeks to travel from Philadelphia. Today, information moves at the speed of light - but truth still struggles to keep up with lies.",
        learnMore: "The Declaration itself was printed in newspapers and pamphlets. Thomas Paine's Common Sense sold 500,000 copies - in a nation of 2.5 million.",
        soundcloudUrl: "https://soundcloud.com/greenday/american-idiot"
    },
    {
        id: 7,
        name: "Globe Corner Bookstore",
        location: "1 School St",
        coordinates: [42.3578, -71.0591],
        creator: "VoteCraft Boston",
        likes: 234,
        civicTheme: CIVIC_THEMES.SCOTUS,
        widget: "news-deserts",
        description: "This historic building has housed booksellers since 1829. The Boston Globe, founded in 1872, won the Pulitzer Prize for its Spotlight team's investigation of clergy abuse. Quality investigative journalism requires resources most outlets can no longer afford.",
        learnMore: "The Spotlight investigation took a year and a team of reporters. Most newspapers can't fund investigations anymore. Stories go untold.",
        soundcloudUrl: "https://soundcloud.com/brucespringsteen/the-rising"
    },
    {
        id: 8,
        name: "Boston Public Library",
        location: "700 Boylston St",
        coordinates: [42.3495, -71.0783],
        creator: "VoteCraft Boston",
        likes: 298,
        civicTheme: CIVIC_THEMES.IMMIGRATION,
        widget: "media-trust",
        description: "The Boston Public Library, opened in 1852, was the first large free public library in the United States. Its mission: 'Free to All.' Libraries remain essential for information access and media literacy - skills needed now more than ever.",
        learnMore: "Librarians are now trained in 'news literacy' to help patrons identify misinformation. Libraries are democracy's infrastructure.",
        soundcloudUrl: "https://soundcloud.com/u2official/pride"
    },
    {
        id: 9,
        name: "Emerson College",
        location: "120 Boylston St",
        coordinates: [42.3528, -71.0652],
        creator: "VoteCraft Boston",
        likes: 212,
        civicTheme: CIVIC_THEMES.CLIMATE,
        widget: "press-freedom",
        description: "Emerson College has trained journalists since 1880. Today's journalism students face a transformed industry - podcasts, substacks, social media. The platforms change, but the mission remains: hold power accountable with facts.",
        learnMore: "Journalism jobs have declined 26% since 2008, but new models are emerging. Nonprofit newsrooms grew 35% between 2018-2022.",
        soundcloudUrl: "https://soundcloud.com/foofighters/the-pretender"
    },
    {
        id: 10,
        name: "WGBH Studios",
        location: "1 Guest St, Brighton",
        coordinates: [42.3534, -71.1284],
        creator: "VoteCraft Boston",
        likes: 267,
        civicTheme: CIVIC_THEMES.HEALTHCARE,
        widget: "media-trust",
        description: "WGBH is the largest producer of PBS content in the nation. Frontline, NOVA, and American Experience are made here. Public media was created to serve the public interest - providing journalism that commercial pressures might suppress.",
        learnMore: "Public broadcasting receives about $1.35 per American in federal funding. The UK spends about $80 per citizen on the BBC.",
        soundcloudUrl: "https://soundcloud.com/sesamestreet/sunny-days"
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
    'civic-sampler': PLANETUNE_PLAYLISTS,
    'healthcare': HEALTHCARE_TOUR,
    'voting-rights': VOTING_TOUR,
    'art-in-action': JOURNALISM_TOUR
};

// Current active tour
let currentTourId = 'civic-sampler';
