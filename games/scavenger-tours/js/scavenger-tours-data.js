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
        descriptionMore: "The hall's Great Hall on the second floor has witnessed some of the most consequential moments in American history. Abolitionists, suffragists, and labor organizers all used this space to advance their causes. The building was doubled in size by Charles Bulfinch in 1805 but retained its original character as a marketplace on the ground floor and meeting hall above.",
        learnMore: "Frederick Douglass, Susan B. Anthony, and JFK all spoke from this same stage. The grasshopper weathervane on the roof, made by Shem Drowne in 1742, has been a Boston landmark for nearly 300 years.",
        songs: [
            { title: "We Shall Overcome", url: "https://www.youtube.com/watch?v=QhnPVP23rzo", reason: "The anthem of the civil rights movement, echoing the spirit of peaceful protest that filled these halls." },
            { title: "Won't Back Down", url: "https://www.youtube.com/watch?v=nvlTJrNJ5lA", reason: "A defiant declaration of standing firm in the face of opposition." },
            { title: "Fanfare for the Common Man", url: "https://www.youtube.com/watch?v=cr6CnG5dmvM", reason: "Aaron Copland's majestic brass fanfare celebrating ordinary citizens who build democracy." }
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
        descriptionMore: "Massachusetts was the first state to mandate health insurance coverage in 2006, a model that influenced the Affordable Care Act. The State House remains the center of healthcare policy debates, from prescription drug pricing to mental health parity. Laws passed here directly affect millions of residents' access to care.",
        learnMore: "The 'Sacred Cod' wooden carving has hung in the House chamber since 1784, symbolizing the fishing industry's importance to the colony. In 1933, Harvard students 'codnapped' it as a prank.",
        songs: [
            { title: "Lean on Me", url: "https://www.youtube.com/watch?v=fOZ-MySzAac", reason: "A timeless call for community support that embodies the spirit of universal healthcare." },
            { title: "Heal the World", url: "https://www.youtube.com/watch?v=BWf-eARnf6U", reason: "A plea for compassion and taking care of one another." },
            { title: "What a Wonderful World", url: "https://www.youtube.com/watch?v=A3yCcXgbKrE", reason: "Louis Armstrong's jazz standard celebrating the beauty of life and human connection." }
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
        descriptionMore: "The Old State House served as the seat of British colonial government and later became Massachusetts' first State House until 1798. Today it operates as a museum where you can stand in the same Council Chamber where royal governors met and revolutionary leaders debated independence. The building barely survived demolition in 1881 when Chicago offered to move it.",
        learnMore: "John Adams defended the British soldiers in court to prove the colonies could provide fair trials. The Declaration of Independence was read from the balcony on July 18, 1776.",
        songs: [
            { title: "A Change Is Gonna Come", url: "https://www.youtube.com/watch?v=wEBlaMOmKV4", reason: "A civil rights anthem about the ongoing struggle for equal representation." },
            { title: "Respect", url: "https://www.youtube.com/watch?v=6FOUqQt3Kg0", reason: "A demand for dignity and recognition that became a civil rights anthem." },
            { title: "God Bless the Child", url: "https://www.youtube.com/watch?v=Z86pXzjAKHU", reason: "Billie Holiday's tender jazz standard about self-reliance and resilience." }
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
        descriptionMore: "The concept of 'common land' - public space accessible to all regardless of wealth - was radical in colonial times and remains vital today. The Common hosted public executions until 1817, and the Great Elm (until 1876) witnessed both hangings and public celebrations. Today, the Public Garden adjacent to the Common was America's first public botanical garden.",
        learnMore: "Martin Luther King Jr. spoke here in 1965 to 22,000 people. During the Revolution, British troops camped here, and the Common was used as a staging ground for the march to Lexington.",
        songs: [
            { title: "Fast Car", url: "https://www.youtube.com/watch?v=DwrHwZyFN7M", reason: "An urgent plea for escape from poverty that resonates with today's housing crisis." },
            { title: "Allentown", url: "https://www.youtube.com/watch?v=BHnJp0oyOxs", reason: "A portrait of working-class struggle in a changing economy." },
            { title: "Rhapsody in Blue", url: "https://www.youtube.com/watch?v=ynEOo28lsbc", reason: "Gershwin's jazz-classical fusion capturing the energy and struggle of urban American life." }
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
        descriptionMore: "Walking through these centuries-old graves reveals the waves of immigration that built Boston - Puritans fleeing England, Huguenots escaping France, and later Irish, Italian, and Jewish families seeking opportunity. The ornate slate gravestones with their winged skulls and weeping willows tell stories of colonial life, death, and the hopes immigrants carried across the Atlantic.",
        learnMore: "Paul Revere's family were French Huguenot refugees (originally named Rivoire). Benjamin Franklin's parents and the parents of John Hancock are also buried here.",
        songs: [
            { title: "This Land Is Your Land", url: "https://www.youtube.com/watch?v=wxiMrvDbq3s", reason: "A folk anthem reminding us that America was built by immigrants seeking freedom." },
            { title: "American Tune", url: "https://www.youtube.com/watch?v=sFBfMmHJOHo", reason: "Paul Simon's gentle reflection on the immigrant experience and American identity." },
            { title: "New World Symphony", url: "https://www.youtube.com/watch?v=ETNoPqYAIPI", reason: "Dvořák's symphony celebrating America, written by a Czech immigrant inspired by spirituals." }
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
        descriptionMore: "Franklin rose from poverty to become one of America's wealthiest men through hard work, publishing, and shrewd investment. His rags-to-riches story embodies the American Dream, yet today economic mobility has declined significantly. The building now houses a steakhouse and offices, but its granite facade still exudes the civic pride of post-Civil War Boston.",
        learnMore: "The donkey and elephant statues outside commemorate the first use of these party symbols. A sidewalk mosaic marks the site of Boston Latin School where Franklin was a student.",
        songs: [
            { title: "9 to 5", url: "https://www.youtube.com/watch?v=UbxUSsFXYo4", reason: "A working-class anthem highlighting economic inequality and the struggle of everyday workers." },
            { title: "Money", url: "https://www.youtube.com/watch?v=-0kcet4aPpQ", reason: "A satirical take on greed and the corrupting power of wealth." },
            { title: "Take Five", url: "https://www.youtube.com/watch?v=vmDDOFXSgAs", reason: "Dave Brubeck's cool jazz classic - sophistication meets the working rhythm of American life." }
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
        descriptionMore: "The connection between that historic protest and today's climate crisis is direct: the Boston Tea Party was about corporate power and unfair taxation, while modern climate action often confronts fossil fuel companies and their political influence. The building survived near-demolition in 1876 when preservationists launched one of America's first historic preservation campaigns.",
        learnMore: "The tea dumped was worth over $1.7 million in today's dollars. British troops nearly demolished the building during occupation, using it as a riding school.",
        songs: [
            { title: "Big Yellow Taxi", url: "https://www.youtube.com/watch?v=94bdMSCdw20", reason: "An environmental classic warning about losing paradise before it's too late." },
            { title: "Mercy Mercy Me", url: "https://www.youtube.com/watch?v=U5lxiA7wWnQ", reason: "Marvin Gaye's soulful plea for environmental awareness." },
            { title: "The Four Seasons - Spring", url: "https://www.youtube.com/watch?v=6LAPFM3dgag", reason: "Vivaldi's celebration of nature's cycles - a reminder of what we stand to lose." }
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
        descriptionMore: "The tension between religious freedom and established religion played out on this very corner. King's Chapel became Unitarian after the Revolution, rejecting the Trinity - a theological shift that mirrored the political rejection of royal authority. Education and religion were intertwined: Boston Latin School, founded in 1635 across the street, was America's first public school.",
        learnMore: "The adjacent King's Chapel Burying Ground (1630) is Boston's oldest cemetery. Notable burials include Mary Chilton, the first woman to step off the Mayflower, and William Dawes, who rode with Paul Revere.",
        songs: [
            { title: "The Message", url: "https://www.youtube.com/watch?v=gYMkEMCHtJ4", reason: "Groundbreaking social commentary on how student debt traps a generation." },
            { title: "Another Brick in the Wall", url: "https://www.youtube.com/watch?v=YR5ApYxkU-U", reason: "Pink Floyd's critique of rigid education systems." },
            { title: "Clair de Lune", url: "https://www.youtube.com/watch?v=CvFH_6DNRCY", reason: "Debussy's dreamy piano piece - the beauty of classical education and contemplation." }
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
        descriptionMore: "Revere's story reminds us that information has always been power, and those who control it shape history. His engraving of the Massacre was published within weeks and distributed throughout the colonies. Today, as we navigate an era of social media and misinformation, the question of who controls the narrative remains just as vital to democracy.",
        learnMore: "Revere's engraving of the Boston Massacre was propaganda - it depicted soldiers firing in formation, not the chaotic reality. This is the oldest remaining structure in downtown Boston (c. 1680).",
        songs: [
            { title: "The Sound of Silence", url: "https://www.youtube.com/watch?v=4fWyzwo1xg0", reason: "A haunting meditation on communication and how people fail to truly connect." },
            { title: "Dirty Laundry", url: "https://www.youtube.com/watch?v=YHimia_Fxzs", reason: "Don Henley's critique of sensationalist media." },
            { title: "So What", url: "https://www.youtube.com/watch?v=zqNTltOGh5c", reason: "Miles Davis' cool jazz masterpiece - questioning everything with sophistication." }
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
        descriptionMore: "The Supreme Court's role in American life connects directly to this revolutionary history. The founders who gathered in churches like this one debated how to balance power - between branches, between federal and state government, between majority rule and minority rights. That debate continues in every Supreme Court decision today.",
        learnMore: "Built in 1723, this is Boston's oldest surviving church building. The steeple, rebuilt after hurricanes in 1804 and 1954, holds eight bells cast in 1744 - the oldest church bells in North America.",
        songs: [
            { title: "Blowin' in the Wind", url: "https://www.youtube.com/watch?v=vWwgrjjIMXA", reason: "Dylan's timeless questions about peace, freedom, and how long change takes." },
            { title: "The Times They Are A-Changin", url: "https://www.youtube.com/watch?v=90WD_ats6eE", reason: "Dylan's timeless call for leaders to heed the winds of change." },
            { title: "A Love Supreme", url: "https://www.youtube.com/watch?v=ll3CMgiUPuU", reason: "Coltrane's spiritual jazz meditation on justice, faith, and transcendence." }
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
        image: "https://hms.harvard.edu/sites/default/files/teaser-images/750GordonHall_2550%5B4%5D.jpg",
        description: "Founded in 1782, Harvard Medical School trains the doctors who shape American medicine. Its iconic marble quadrangle represents both medical excellence and a history of exclusion - the first Black graduate wasn't until 1850, women not until 1945.",
        descriptionMore: "The five marble buildings surrounding the quad were completed in 1906, designed in neoclassical style to project authority and permanence. Today, HMS is working to address its historical exclusions through diversity initiatives and scholarship programs. The question of who gets to become a doctor - and who can afford treatment - remains central to healthcare justice.",
        learnMore: "Medical school costs average $250,000. The US has fewer doctors per capita than most developed nations, contributing to healthcare access gaps.",
        songs: [
            { title: "Lean on Me", url: "https://www.youtube.com/watch?v=fOZ-MySzAac", reason: "A timeless message of mutual support - being there when someone needs you." },
            { title: "Waiting on the World to Change", url: "https://www.youtube.com/watch?v=oBIxScJ5rlY", reason: "A reflection on the systemic changes needed in healthcare access." },
            { title: "What a Wonderful World", url: "https://www.youtube.com/watch?v=A3yCcXgbKrE", reason: "Louis Armstrong's hopeful vision of a world where healing is possible." }
        ]
    },
    {
        id: 2,
        name: "Brigham and Women's Hospital",
        location: "75 Francis St, Longwood",
        coordinates: [42.3358, -71.1070],
        image: "https://upload.wikimedia.org/wikipedia/commons/f/f5/Brigham_and_Women%E2%80%99s_Hospital_%2854954429093%29.jpg",
        creator: "VoteCraft Boston",
        likes: 378,
        civicTheme: CIVIC_THEMES.HEALTHCARE,
        widget: "healthcare-compare",
        description: "One of America's top hospitals, Brigham pioneered organ transplantation and performs groundbreaking research. But even here, studies show Black patients receive different care than white patients for the same conditions - a crisis the hospital is working to address.",
        descriptionMore: "The hospital was formed in 1980 from the merger of Peter Bent Brigham Hospital and several women's hospitals. It performed the world's first successful human organ transplant in 1954. Today, Brigham researchers are at the forefront of understanding and eliminating racial bias in clinical algorithms and treatment decisions.",
        learnMore: "Black women are 3x more likely to die from pregnancy complications than white women, even at top hospitals. Racism in medicine is a public health crisis.",
        songs: [
            { title: "What's Going On", url: "https://www.youtube.com/watch?v=H-kA3LoLFdA", reason: "A plea for understanding and equality that speaks to persistent racial disparities." },
            { title: "A Change Is Gonna Come", url: "https://www.youtube.com/watch?v=wEBlaMOmKV4", reason: "A civil rights anthem about the hope for equality in healthcare." },
            { title: "People Get Ready", url: "https://www.youtube.com/watch?v=CN0peKFhpMc", reason: "Curtis Mayfield's call for justice and preparation for change." }
        ]
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
        image: "https://media-cldnry.s-nbcnews.com/image/upload/t_fit-1500w,f_auto,q_auto:best/rockcms/2022-08/220816-one-time-use-boston-children-hospital-se-221p-5584be.jpg",
        description: "America's first pediatric hospital, founded in 1869 to serve children regardless of ability to pay. Today it leads in pediatric research and treatment, but 4 million American children still lack health insurance.",
        descriptionMore: "The founding mission of 'serving all children regardless of ability to pay' was radical in 1869 and remains aspirational today. Boston Children's has pioneered treatments for congenital heart defects, childhood cancers, and genetic disorders. Its researchers developed the first polio vaccine trial site and continue to lead in gene therapy research.",
        learnMore: "Child poverty rates in the US are among the highest in developed nations. Children in poverty are 2x more likely to have chronic health conditions.",
        songs: [
            { title: "Heal the World", url: "https://www.youtube.com/watch?v=BWf-eARnf6U", reason: "A call to heal the world and make it better for future generations." },
            { title: "Greatest Love of All", url: "https://www.youtube.com/watch?v=IYzlVDlE72w", reason: "Whitney Houston's anthem about children being our future." },
            { title: "Imagine", url: "https://www.youtube.com/watch?v=YkgkThdzX-8", reason: "A vision of a world where every child has access to care." }
        ]
    },
    {
        id: 4,
        name: "Dana-Farber Cancer Institute",
        location: "450 Brookline Ave",
        coordinates: [42.3380, -71.1080],
        image: "https://www.myaccesshope.org/hs-fs/hubfs/Dana-Farber-architecture-1920.jpg",
        creator: "VoteCraft Boston",
        likes: 389,
        civicTheme: CIVIC_THEMES.HEALTHCARE,
        widget: "healthcare-cost",
        description: "A world leader in cancer research and treatment, Dana-Farber has pioneered immunotherapy and targeted treatments. But cancer drugs can cost $10,000+ per month - forcing patients to choose between treatment and financial ruin.",
        descriptionMore: "Founded in 1947 by Sidney Farber, who achieved the first remission in childhood leukemia, Dana-Farber has transformed cancer from a death sentence into a manageable chronic illness for many. The institute's Jimmy Fund, launched with the Boston Red Sox, has raised billions for research. Yet access to these breakthroughs remains deeply unequal.",
        learnMore: "42% of cancer patients deplete their life savings within 2 years of diagnosis. 'Financial toxicity' is now recognized as a side effect of cancer treatment.",
        songs: [
            { title: "Everybody Hurts", url: "https://www.youtube.com/watch?v=5rOiW_xY-kc", reason: "A compassionate message of perseverance for those facing life's hardest battles." },
            { title: "Fight Song", url: "https://www.youtube.com/watch?v=xo1VInw-SKc", reason: "An anthem of strength and determination for cancer fighters." },
            { title: "Brave", url: "https://www.youtube.com/watch?v=QUQsqBqxoR4", reason: "Sara Bareilles' empowering call to courage in the face of adversity." }
        ]
    },
    {
        id: 5,
        name: "The Fens & Victory Gardens",
        location: "The Fenway, near Agassiz Rd",
        coordinates: [42.3420, -71.0960],
        creator: "VoteCraft Boston",
        likes: 189,
        civicTheme: CIVIC_THEMES.HOUSING,
        widget: "life-expectancy",
        image: "https://www.boston.gov/sites/default/files/img/2016/b/backbay-fens_1.jpg",
        description: "America's oldest community garden, the Victory Gardens have fed Bostonians since WWII. Green space is healthcare - studies show access to parks reduces stress, heart disease, and mental illness. But park access is unequal across neighborhoods.",
        learnMore: "Low-income neighborhoods have 4x less park space than wealthy areas. 'Nature deficit disorder' contributes to childhood obesity and anxiety.",
        songs: [
            { title: "Big Yellow Taxi", url: "https://www.youtube.com/watch?v=94bdMSCdw20", reason: "An environmental warning about preserving the green spaces that keep us healthy." },
            { title: "What a Wonderful World", url: "https://www.youtube.com/watch?v=A3yCcXgbKrE", reason: "Louis Armstrong's appreciation for nature's beauty." },
            { title: "Here Comes the Sun", url: "https://www.youtube.com/watch?v=KQetemT1sWc", reason: "The Beatles' celebration of sunshine and outdoor healing." }
        ]
    },
    {
        id: 6,
        name: "Isabella Stewart Gardner Museum",
        location: "25 Evans Way",
        coordinates: [42.3384, -71.0990],
        creator: "VoteCraft Boston",
        likes: 267,
        civicTheme: CIVIC_THEMES.EDUCATION,
        widget: "mental-health",
        image: "https://www.gardnermuseum.org/sites/default/files/styles/portrait_large/public/images/slides/1908/Story_About_Construction_02.jpg",
        description: "Art heals. Museums across Boston partner with hospitals for 'art therapy' programs, and research shows viewing art reduces cortisol and anxiety. Gardner built this museum to bring beauty to everyone - admission is free on your birthday.",
        learnMore: "Hospitals now prescribe museum visits for mental health. Studies show 30 minutes in a museum reduces stress hormones as effectively as meditation.",
        songs: [
            { title: "One Love", url: "https://www.youtube.com/watch?v=vdB-8eLEW8g", reason: "A message of unity and healing through human connection." },
            { title: "Hallelujah", url: "https://www.youtube.com/watch?v=YrLk4vdY28Q", reason: "Leonard Cohen's spiritual meditation on beauty and brokenness." },
            { title: "Bridge Over Troubled Water", url: "https://www.youtube.com/watch?v=4G-YQA_bsOU", reason: "A soothing promise of support through difficult times." }
        ]
    },
    {
        id: 7,
        name: "Dr. Rebecca Lee Crumpler Memorial",
        location: "Beacon Hill, near Charles St",
        coordinates: [42.3560, -71.0700],
        creator: "VoteCraft Boston",
        likes: 178,
        civicTheme: CIVIC_THEMES.EDUCATION,
        widget: "healthcare-compare",
        image: "https://npr.brightspotcdn.com/dims4/default/53e84c0/2147483647/strip/true/crop/1760x920+0+0/resize/1760x920!/format/webp/quality/90/?url=http%3A%2F%2Fnpr-brightspot.s3.amazonaws.com%2F66%2F13%2Fc77b2cc04f2a80ac817ad1b424a6%2Frebecca-crumpler-1760x920-web.png",
        description: "This bronze sculpture honors Dr. Rebecca Lee Crumpler, the first Black woman to earn a medical degree in the United States, graduating from Boston's New England Female Medical College in 1864. She dedicated her career to serving freed slaves and the poor.",
        learnMore: "Dr. Crumpler wrote 'A Book of Medical Discourses' in 1883, one of the first medical texts by an African American. Today, only 5% of US physicians are Black - a disparity rooted in centuries of exclusion.",
        songs: [
            { title: "Respect", url: "https://www.youtube.com/watch?v=6FOUqQt3Kg0", reason: "Aretha Franklin's anthem for the dignity and recognition denied to pioneers like Dr. Crumpler." },
            { title: "Lovely Day", url: "https://www.youtube.com/watch?v=bEeaS6fuUoA", reason: "Bill Withers' optimism reflecting the hope Crumpler brought to her patients." },
            { title: "A Change Is Gonna Come", url: "https://www.youtube.com/watch?v=wEBlaMOmKV4", reason: "Sam Cooke's anthem about the long arc toward equality in medicine." }
        ]
    },
    {
        id: 8,
        name: "MassArt & Mental Health",
        location: "621 Huntington Ave",
        coordinates: [42.3368, -71.0985],
        creator: "VoteCraft Boston",
        likes: 223,
        civicTheme: CIVIC_THEMES.SCOTUS,
        widget: "mental-health",
        image: "https://e9jn6jeo54q.exactdn.com/app/uploads/2025/10/MAAMArtonthePlazaJuly2025_AmyFink-431-of-484.jpg?strip=all&w=1920",
        description: "Art therapy programs at MassArt partner with hospitals throughout the medical area. Creative expression reduces anxiety, manages chronic pain, and helps process trauma. Yet arts programs are first to be cut when budgets tighten.",
        learnMore: "Veterans with PTSD show 30% reduction in symptoms after art therapy. Hospitals are increasingly prescribing creative activities alongside medication.",
        songs: [
            { title: "Yellow", url: "https://www.youtube.com/watch?v=yKNxeF4KMsY", reason: "A tender song about seeing someone's inner light and the healing power of creativity." },
            { title: "Unwritten", url: "https://www.youtube.com/watch?v=b7k0a5hYnSI", reason: "A song about creative potential and new beginnings." },
            { title: "Lean on Me", url: "https://www.youtube.com/watch?v=fOZ-MySzAac", reason: "Bill Withers' call for mutual support in mental health." }
        ]
    },
    {
        id: 9,
        name: "Vietnam Veterans Memorial",
        location: "100 Park Dr, Boston",
        coordinates: [42.3442, -71.0962],
        creator: "VoteCraft Boston",
        likes: 198,
        civicTheme: CIVIC_THEMES.DEMOCRACY,
        widget: "veteran-health",
        image: "https://storage.googleapis.com/clio-images/large_3758_x800-war-memorial-vietnam-fenway-16x9.jpg.pagespeed.ic.GkjQAsufO0.jpg",
        description: "This poignant memorial honors Massachusetts veterans of the Vietnam War. Beyond remembrance, it reminds us of the healthcare crisis facing veterans. Over 500,000 Vietnam veterans still suffer from PTSD, and veteran suicide rates remain tragically high.",
        learnMore: "Veterans face unique health challenges: Agent Orange exposure, traumatic brain injuries, and PTSD affect millions. Yet VA healthcare funding has struggled to meet demand, with some veterans waiting months for mental health appointments.",
        songs: [
            { title: "Born in the U.S.A.", url: "https://www.youtube.com/watch?v=EPhWR4d3FJQ", reason: "Bruce Springsteen's powerful reflection on the Vietnam veteran experience." },
            { title: "Fortunate Son", url: "https://www.youtube.com/watch?v=ec0XKhAHR5I", reason: "CCR's protest anthem questioning who bears the burden of war." },
            { title: "Blowin' in the Wind", url: "https://www.youtube.com/watch?v=vWwgrjjIMXA", reason: "Bob Dylan's timeless questions about peace, war, and human cost." }
        ]
    },
    {
        id: 10,
        name: "Ether Monument",
        location: "Boston Public Garden",
        coordinates: [42.3540, -71.0695],
        creator: "VoteCraft Boston",
        likes: 167,
        civicTheme: CIVIC_THEMES.HEALTHCARE,
        widget: "healthcare-cost",
        image: "https://upload.wikimedia.org/wikipedia/commons/6/66/Ether_Monument_Overview.JPG",
        description: "This 1868 monument commemorates the first public demonstration of surgical anesthesia at Massachusetts General Hospital in 1846. Before ether, surgery meant unimaginable pain. This Boston breakthrough transformed medicine forever, making modern surgery possible.",
        learnMore: "Dr. William Morton demonstrated ether anesthesia in the 'Ether Dome' at MGH. The discovery ended centuries of surgical agony, yet patent disputes left Morton penniless. Medical breakthroughs don't always reward their creators.",
        songs: [
            { title: "Comfortably Numb", url: "https://www.youtube.com/watch?v=_FrOQC-zEog", reason: "Pink Floyd's meditation on numbness and relief from pain." },
            { title: "Fix You", url: "https://www.youtube.com/watch?v=k4V3Mo61fJM", reason: "Coldplay's tender promise of healing and comfort." },
            { title: "Let It Be", url: "https://www.youtube.com/watch?v=QDYfEBY9NM4", reason: "The Beatles' soothing message of acceptance and peace." }
        ]
    },
    {
        id: 11,
        name: "Grouping of Works from Fountain",
        location: "401 Park, Fenway",
        coordinates: [42.3436, -71.1025],
        creator: "VoteCraft Boston",
        likes: 312,
        civicTheme: CIVIC_THEMES.DEMOCRACY,
        widget: "mental-health",
        image: "https://goodmantaft.com/wp-content/uploads/2019/06/grouping-of-works-from-fountain-nicole-eisenberg-goodmantaft-5-1920x1080.jpg",
        description: "Nicole Eisenman's first permanent public sculpture in the US features three bronze figures of indeterminate gender lounging around a shallow wading pool. Water spurts from their bodies in whimsical ways. The artist insisted visitors can wade in - public art meant to be touched and experienced.",
        learnMore: "Based on Eisenman's 2017 'Sketch for a Fountain' for Germany's Skulptur Projekte Münster, which was vandalized in what organizers called 'fascist violence.' The Boston version was cast in durable bronze. The oversized hands and feet honor physical labor and those who work with their hands.",
        songs: [
            { title: "Splish Splash", url: "https://www.youtube.com/watch?v=Pr-Vfnd7Yno", reason: "Bobby Darin's playful ode to bathing and water fun." },
            { title: "Under Pressure", url: "https://www.youtube.com/watch?v=a01QQZyl-_I", reason: "Queen & Bowie's meditation on human connection under stress - like water under pressure." },
            { title: "Lovely Day", url: "https://www.youtube.com/watch?v=bEeaS6fuUoA", reason: "Bill Withers' sunny optimism perfect for lounging by a fountain." }
        ]
    },
    {
        id: 12,
        name: "Museum of Fine Arts",
        location: "465 Huntington Ave",
        coordinates: [42.3394, -71.0940],
        creator: "VoteCraft Boston",
        likes: 445,
        civicTheme: CIVIC_THEMES.EDUCATION,
        widget: "mental-health",
        image: "https://upload.wikimedia.org/wikipedia/commons/0/06/Museum_of_Fine_Arts%2C_Boston_%2854954248311%29.jpg",
        description: "One of America's great encyclopedic museums, the MFA partners with local hospitals on 'museum prescriptions' for mental health. Research shows that viewing art reduces cortisol, anxiety, and depression. The museum's free admission programs ensure art therapy is accessible to all.",
        learnMore: "Studies show 30 minutes in a museum reduces stress as effectively as medication. The MFA's community programs bring art to patients in hospitals and nursing homes who cannot visit in person.",
        songs: [
            { title: "Beautiful Day", url: "https://www.youtube.com/watch?v=co6WMzDOh1o", reason: "U2's uplifting anthem about finding beauty and hope in the world around us." },
            { title: "Colors", url: "https://www.youtube.com/watch?v=0G383538qzQ", reason: "Black Pumas' soulful meditation on seeing beauty in another person." },
            { title: "What a Wonderful World", url: "https://www.youtube.com/watch?v=A3yCcXgbKrE", reason: "Louis Armstrong's appreciation for the beauty that surrounds us." }
        ]
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
        songs: [
            { title: "Respect", url: "https://www.youtube.com/watch?v=6FOUqQt3Kg0", reason: "A civil rights anthem demanding R-E-S-P-E-C-T for every citizen's voice." },
            { title: "We Shall Overcome", url: "https://www.youtube.com/watch?v=QhnPVP23rzo", reason: "The anthem of the civil rights movement and voting rights struggles." },
            { title: "This Land Is Your Land", url: "https://www.youtube.com/watch?v=wxiMrvDbq3s", reason: "A folk anthem reminding us this land belongs to everyone who participates in democracy." }
        ]
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
        songs: [
            { title: "Get Up, Stand Up", url: "https://www.youtube.com/watch?v=F6iEnUBSYJA", reason: "A call to stand up for your rights wherever laws are written and contested." },
            { title: "Everyday People", url: "https://www.youtube.com/watch?v=YUUhDoCx8zc", reason: "Sly & the Family Stone's uplifting call for unity and understanding." },
            { title: "Express Yourself", url: "https://www.youtube.com/watch?v=u31FO_4d9TY", reason: "A message about speaking your truth and making your voice heard." }
        ]
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
        songs: [
            { title: "A Change Is Gonna Come", url: "https://www.youtube.com/watch?v=wEBlaMOmKV4", reason: "A hopeful civil rights anthem about the long wait for true equality." },
            { title: "People Get Ready", url: "https://www.youtube.com/watch?v=CN0peKFhpMc", reason: "Curtis Mayfield's call for preparation and hope for change." },
            { title: "What's Going On", url: "https://www.youtube.com/watch?v=H-kA3LoLFdA", reason: "Marvin Gaye's plea for understanding in turbulent times." }
        ]
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
        songs: [
            { title: "Glory", url: "https://www.youtube.com/watch?v=HUZOKvYcx_o", reason: "An Oscar-winning civil rights anthem connecting past struggles to the ongoing fight for voting rights." },
            { title: "We're Not Gonna Take It", url: "https://www.youtube.com/watch?v=4xmckWVPRaI", reason: "A defiant anthem of protest and standing up for your rights." },
            { title: "Blowin' in the Wind", url: "https://www.youtube.com/watch?v=vWwgrjjIMXA", reason: "Bob Dylan's timeless questions about freedom and justice." }
        ]
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
        songs: [
            { title: "We Shall Overcome", url: "https://www.youtube.com/watch?v=QhnPVP23rzo", reason: "A civil rights anthem that united generations of activists - a struggle not yet won." },
            { title: "Revolution", url: "https://www.youtube.com/watch?v=BGLGzRXY5Bw", reason: "The Beatles' reflection on the nature of political change." },
            { title: "Fortunate Son", url: "https://www.youtube.com/watch?v=ec0XKhAHR5I", reason: "CCR's commentary on inequality and who bears the burden of democracy." }
        ]
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
        songs: [
            { title: "Won't Get Fooled Again", url: "https://www.youtube.com/watch?v=SHhrZgojY1Q", reason: "A skeptical anthem about political power and the promise of change." },
            { title: "For What It's Worth", url: "https://www.youtube.com/watch?v=gp5JCrSXkJY", reason: "Buffalo Springfield's warning about political tensions." },
            { title: "The Sound of Silence", url: "https://www.youtube.com/watch?v=4fWyzwo1xg0", reason: "A meditation on communication and civic engagement." }
        ]
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
        songs: [
            { title: "Stand By Me", url: "https://www.youtube.com/watch?v=hwZNL7QVJjE", reason: "Ben E. King's timeless anthem about solidarity and supporting one another." },
            { title: "Talkin' Bout a Revolution", url: "https://www.youtube.com/watch?v=Xv8FBLTmLNs", reason: "Tracy Chapman's call for uprising through democratic action." },
            { title: "Power to the People", url: "https://www.youtube.com/watch?v=2rFQs6e4lms", reason: "John Lennon's direct call for participatory democracy." }
        ]
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
        songs: [
            { title: "The Message", url: "https://www.youtube.com/watch?v=PobrSpMwKk4", reason: "Groundbreaking social commentary - the message matters for everyone." },
            { title: "Imagine", url: "https://www.youtube.com/watch?v=YkgkThdzX-8", reason: "John Lennon's vision of a united world without division." },
            { title: "One Love", url: "https://www.youtube.com/watch?v=vdB-8eLEW8g", reason: "Bob Marley's call for unity across all boundaries." }
        ]
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
        songs: [
            { title: "Sympathy for the Devil", url: "https://www.youtube.com/watch?v=GgnClrx8N2k", reason: "An examination of manipulation and the different faces we show to shape perception." },
            { title: "Man in the Mirror", url: "https://www.youtube.com/watch?v=PivWY9wn5ps", reason: "Michael Jackson's call to look inward and be the change we want to see." },
            { title: "Radio Ga Ga", url: "https://www.youtube.com/watch?v=azdwsXLmrHE", reason: "Queen's commentary on the power of media to inform democracy." }
        ]
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
        songs: [
            { title: "Sunday Bloody Sunday", url: "https://www.youtube.com/watch?v=LQZLPV6xcHI", reason: "A protest song about violence and injustice that demands we never forget." },
            { title: "Where Is the Love?", url: "https://www.youtube.com/watch?v=WpYeekQkAdc", reason: "Black Eyed Peas' reflection on the state of democracy and society." },
            { title: "Born to Run", url: "https://www.youtube.com/watch?v=IxuThNgl3YA", reason: "Springsteen's anthem of hope and the promise of freedom." }
        ]
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
        songs: [
            { title: "To Be Young, Gifted and Black", url: "https://www.youtube.com/watch?v=x5cOUA1GZMc", reason: "Nina Simone's inspiring anthem celebrating Black excellence and potential." },
            { title: "Somewhere Over the Rainbow", url: "https://www.youtube.com/watch?v=V1bFr2SWP1I", reason: "A timeless ballad of hope and dreams of a better world." },
            { title: "Say It Loud - I'm Black and I'm Proud", url: "https://www.youtube.com/watch?v=9bJA6W9CqvE", reason: "James Brown's anthem of Black pride and political awakening." }
        ]
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
        songs: [
            { title: "A Change Is Gonna Come", url: "https://www.youtube.com/watch?v=wEBlaMOmKV4", reason: "A civil rights anthem honoring those who fought and died for a freedom they never lived to see." },
            { title: "Lift Every Voice and Sing", url: "https://www.youtube.com/watch?v=lLgSH_ln2hM", reason: "The Black National Anthem - a song of hope and perseverance." },
            { title: "Redemption Song", url: "https://www.youtube.com/watch?v=OFGgbT_VasI", reason: "Bob Marley's meditation on freedom and emancipation." }
        ]
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
        songs: [
            { title: "I Am Woman", url: "https://www.youtube.com/watch?v=rptW7zOPX2E", reason: "A feminist anthem capturing the perseverance of those who fought for decades for equality." },
            { title: "Sisters Are Doin' It for Themselves", url: "https://www.youtube.com/watch?v=drGx7JkFSp4", reason: "A celebration of women's independence and political power." },
            { title: "Run the World (Girls)", url: "https://www.youtube.com/watch?v=VBmMU_iwe6U", reason: "Beyoncé's anthem of female empowerment and leadership." }
        ]
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
        songs: [
            { title: "People Have the Power", url: "https://www.youtube.com/watch?v=pPR-HyGj2d0", reason: "A rallying cry reminding us that power lives in the people who show up." },
            { title: "Waiting on the World to Change", url: "https://www.youtube.com/watch?v=oBIxScJ5rlY", reason: "John Mayer's call for civic participation." },
            { title: "Land of Confusion", url: "https://www.youtube.com/watch?v=QHmH1xQ2Pf4", reason: "Genesis' commentary on political chaos and citizen responsibility." }
        ]
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
        songs: [
            { title: "Alright", url: "https://www.youtube.com/watch?v=Z-48u_uWMHY", reason: "An anthem of Black resilience echoing across centuries of struggle." },
            { title: "Brown Skin Girl", url: "https://www.youtube.com/watch?v=vRFS0MYTC1I", reason: "Beyoncé's tender celebration of Black beauty and self-love." },
            { title: "The Revolution Will Not Be Televised", url: "https://www.youtube.com/watch?v=qGaoXAwl9kw", reason: "Gil Scott-Heron's groundbreaking spoken word about media and activism." }
        ]
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
        songs: [
            { title: "Freedom", url: "https://www.youtube.com/watch?v=DJ4dDAz5onM", reason: "A powerful anthem of fearless pursuit of freedom for oneself and others." },
            { title: "Glory", url: "https://www.youtube.com/watch?v=HUZOKvYcx_o", reason: "John Legend's tribute to the civil rights movement." },
            { title: "Lean on Me", url: "https://www.youtube.com/watch?v=fOZ-MySzAac", reason: "Bill Withers' message of community support on the path to freedom." }
        ]
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
        songs: [
            { title: "Pride (In the Name of Love)", url: "https://www.youtube.com/watch?v=LHcP4MWABGY", reason: "A tribute to the journey from persecution to political power through perseverance." },
            { title: "This Land Is Your Land", url: "https://www.youtube.com/watch?v=wxiMrvDbq3s", reason: "A folk anthem about immigrants finding their place in America." },
            { title: "American Tune", url: "https://www.youtube.com/watch?v=BNoFjr_dV-4", reason: "Paul Simon's gentle reflection on the immigrant American experience." }
        ]
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
        songs: [
            { title: "Happy Birthday", url: "https://www.youtube.com/watch?v=inS9gAgSENE", reason: "A song that helped make MLK Day a federal holiday - celebrating love and legacy." },
            { title: "What's Going On", url: "https://www.youtube.com/watch?v=H-kA3LoLFdA", reason: "Marvin Gaye's plea for understanding and peace." },
            { title: "Three Little Birds", url: "https://www.youtube.com/watch?v=zaGUr6wzyT8", reason: "Bob Marley's reassuring message that every little thing is gonna be alright." }
        ]
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
        songs: [
            { title: "Rise Up", url: "https://www.youtube.com/watch?v=FBuIBaDSOa4", reason: "Andra Day's modern anthem of hope and perseverance through difficult times." },
            { title: "Imagine", url: "https://www.youtube.com/watch?v=YkgkThdzX-8", reason: "John Lennon's vision of a world without division or hate." },
            { title: "Bridge Over Troubled Water", url: "https://www.youtube.com/watch?v=4G-YQA_bsOU", reason: "A promise of comfort through the darkest times." }
        ]
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
        songs: [
            { title: "Born to Run", url: "https://www.youtube.com/watch?v=IxuThNgl3YA", reason: "An urgent anthem of escape and hope - the American dream in motion." },
            { title: "We Shall Overcome", url: "https://www.youtube.com/watch?v=QhnPVP23rzo", reason: "The civil rights anthem connecting speech to action." },
            { title: "Freedom", url: "https://www.youtube.com/watch?v=n1WpP7iowLc", reason: "Pharrell Williams' modern celebration of freedom and equality." }
        ]
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
        songs: [
            { title: "Glory", url: "https://www.youtube.com/watch?v=HUZOKvYcx_o", reason: "John Legend & Common's Oscar-winning tribute to the civil rights movement from 'Selma'." },
            { title: "What's Going On", url: "https://www.youtube.com/watch?v=H-kA3LoLFdA", reason: "Marvin Gaye's plea for understanding that MLK championed." },
            { title: "Happy", url: "https://www.youtube.com/watch?v=ZbZSe6N_BXs", reason: "Pharrell's infectious celebration of joy and positivity." }
        ]
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
        songs: [
            { title: "A Change Is Gonna Come", url: "https://www.youtube.com/watch?v=wEBlaMOmKV4", reason: "A civil rights anthem about the sacrifice of those who fought for a country that denied them equality." },
            { title: "Black Parade", url: "https://www.youtube.com/watch?v=BmU_gVTbgEI", reason: "Beyoncé's 2020 celebration of Black culture and resilience." },
            { title: "Lift Every Voice and Sing", url: "https://www.youtube.com/watch?v=lLgSH_ln2hM", reason: "The Black National Anthem honoring the struggle for equality." }
        ]
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
        songs: [
            { title: "Alright", url: "https://www.youtube.com/watch?v=Z-48u_uWMHY", reason: "Kendrick Lamar's 2015 anthem of Black resilience and hope." },
            { title: "Somewhere Over the Rainbow", url: "https://www.youtube.com/watch?v=V1bFr2SWP1I", reason: "A timeless ballad of hope and dreams of a better world." },
            { title: "Optimistic", url: "https://www.youtube.com/watch?v=Fk_OQDhfCXg", reason: "Sounds of Blackness' uplifting gospel-inspired anthem of hope and perseverance." }
        ]
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
        songs: [
            { title: "Respect", url: "https://www.youtube.com/watch?v=6FOUqQt3Kg0", reason: "A demand for respect honoring generations of women who fought for recognition." },
            { title: "Good as Hell", url: "https://www.youtube.com/watch?v=SmbmeOgWsqE", reason: "Lizzo's modern empowerment anthem celebrating self-worth and independence." },
            { title: "Run the World (Girls)", url: "https://www.youtube.com/watch?v=VBmMU_iwe6U", reason: "Beyoncé's anthem of female empowerment and leadership." }
        ]
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
        songs: [
            { title: "Freedom", url: "https://www.youtube.com/watch?v=DJ4dDAz5onM", reason: "Beyoncé ft. Kendrick Lamar's powerful anthem embodying fearless leadership on the path to freedom." },
            { title: "Redemption Song", url: "https://www.youtube.com/watch?v=OFGgbT_VasI", reason: "Bob Marley's meditation on freedom and emancipation." },
            { title: "I Was Here", url: "https://www.youtube.com/watch?v=i41qWJ6QjPI", reason: "Beyoncé's anthem about leaving a mark on the world - fitting for Tubman's legacy." }
        ]
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
        songs: [
            { title: "Higher Ground", url: "https://www.youtube.com/watch?v=4wZ3ZG_Wams", reason: "Stevie Wonder's uplifting call to keep pushing toward a better world." },
            { title: "Won't Back Down", url: "https://www.youtube.com/watch?v=nvlTJrNJ5lA", reason: "A defiant declaration of standing firm for one's beliefs." },
            { title: "Humble and Kind", url: "https://www.youtube.com/watch?v=awzNHuGqoMc", reason: "Tim McGraw's modern call for civic virtue and treating others well." }
        ]
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
        songs: [
            { title: "Sunday Bloody Sunday", url: "https://www.youtube.com/watch?v=LQZLPV6xcHI", reason: "A protest song connecting legacies of suffering to ongoing struggles for justice." },
            { title: "Immigrants (We Get the Job Done)", url: "https://www.youtube.com/watch?v=6_35a7sn6ds", reason: "K'naan, Snow Tha Product & others' modern anthem celebrating the immigrant contribution to America." },
            { title: "American Tune", url: "https://www.youtube.com/watch?v=BNoFjr_dV-4", reason: "Paul Simon's reflection on the immigrant journey to America." }
        ]
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
        songs: [
            { title: "Born in the U.S.A.", url: "https://www.youtube.com/watch?v=EPhWR4d3FJQ", reason: "A complex portrait of soldiers and the sacrifices made in the name of country." },
            { title: "Fortunate Son", url: "https://www.youtube.com/watch?v=ec0XKhAHR5I", reason: "CCR's commentary on who serves and who is spared." },
            { title: "Soldier", url: "https://www.youtube.com/watch?v=cQS87naBD7Y", reason: "Gavin DeGraw's modern tribute to those who serve and sacrifice." }
        ]
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
        songs: [
            { title: "Hallelujah", url: "https://www.youtube.com/watch?v=YrLk4vdY28Q", reason: "A meditation on broken faith and transcendence - finding light in darkness." },
            { title: "Rise Up", url: "https://www.youtube.com/watch?v=FBuIBaDSOa4", reason: "Andra Day's modern anthem of hope and perseverance through difficult times." },
            { title: "Bridge Over Troubled Water", url: "https://www.youtube.com/watch?v=4G-YQA_bsOU", reason: "A promise of comfort and support through the darkest times." }
        ]
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
        songs: [
            { title: "Alright", url: "https://www.youtube.com/watch?v=Z-48u_uWMHY", reason: "Kendrick Lamar's anthem of Black resilience and hope channeling the spirit of perseverance." },
            { title: "Feeling Good", url: "https://www.youtube.com/watch?v=D5Y11hwjMNs", reason: "Nina Simone's triumphant celebration of freedom and new beginnings." },
            { title: "Respect", url: "https://www.youtube.com/watch?v=6FOUqQt3Kg0", reason: "Aretha Franklin's demand for dignity that Douglass championed." }
        ]
    },
    {
        id: 11,
        name: "Boston Heart and Wings Mural",
        location: "65 Causeway St, near TD Garden",
        coordinates: [42.3662, -71.0622],
        creator: "VoteCraft Boston",
        likes: 534,
        civicTheme: CIVIC_THEMES.HEALTHCARE,
        widget: "life-expectancy",
        image: "https://lh3.googleusercontent.com/gps-cs-s/AHVAweqtpI5lAyYpwG8SHuQo4NFBjsv31L8PSDdt1ekpWF3iHu3s2H7PIJ_oj5IRcQQ3P8NqR6j2Jd7E_JAz61i-ygednbQD9xzfL_SuS2drtiadcihYCzYDNm0a4Re4jWj_Y7QuCjjl=s680-w680-h510-rw",
        description: "This vibrant mural near TD Garden features a red anatomical heart with colorful wings spreading outward. The heart with wings is a universal symbol of love, courage, and freedom - the soaring spirit that art can inspire. Visitors pose here to share their own 'winged hearts' on social media.",
        learnMore: "Street art transforms urban spaces into galleries accessible to everyone. This mural near the sports arena reminds thousands daily that art belongs in public spaces, not just museums.",
        songs: [
            { title: "Fly", url: "https://www.youtube.com/watch?v=I_izvAbhExY", reason: "Maddie & Tae's inspiring anthem about spreading your wings and rising up." },
            { title: "Unbreak My Heart", url: "https://www.youtube.com/watch?v=p2Rch6WvPJE", reason: "Toni Braxton's powerful ballad about hearts that heal and soar again." },
            { title: "Wings", url: "https://www.youtube.com/watch?v=cMPfG0To2OM", reason: "Little Mix's empowering song about finding the strength to fly." }
        ]
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
