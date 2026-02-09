/**
 * VoteCraft Issues Catalog
 *
 * Static data for the 6 civic reform issues.
 * Bill keywords are used to search the OpenStates API for related legislation.
 * Nonprofits are organizations working on each issue.
 */

const ISSUES_CATALOG = [
    {
        id: 'rcv',
        title: 'Rank Choice Voting',
        shortTitle: 'RCV',
        description: 'Ranked Choice Voting lets voters rank candidates by preference, ensuring winners have broad support while reducing vote-splitting and negative campaigning. If no candidate wins a majority, the lowest-ranked is eliminated and those votes transfer until someone earns a majority.',
        heroImage: 'https://votecraft.org/wp-content/uploads/2025/06/rank-the-vote.jpg',
        learnMoreUrl: 'https://votecraft.org/solutions/rank-choice-voting/',
        publicAwareness: [
            { year: 2016, pct: 9 }, { year: 2018, pct: 24 },
            { year: 2020, pct: 55 }, { year: 2022, pct: 52 },
            { year: 2023, pct: 55 }, { year: 2024, pct: 53 }
        ],
        chartSource: 'FairVote/Ipsos (2020); Gallup (2022); Pew Research (2023); AP-NORC (2024). Pre-2020 estimates from state ballot measure exit polls.',
        billKeywords: ['ranked choice', 'ranked-choice', 'ranked choice voting', 'instant runoff', 'preferential voting', 'alternative voting', 'final five voting', 'rank the vote', 'rcv', 'local option voting', 'municipal election voting'],
        nonprofits: [
            {
                name: 'FairVote',
                logo: 'https://fairvote.org/wp-content/uploads/2022/09/New-web-1024x512.jpg',
                donateUrl: 'https://www.fairvote.org/donate',
                description: 'Leading organization for ranked choice voting advocacy and research.'
            },
            {
                name: 'Rank the Vote',
                logo: 'https://rankthevote.us/wp-content/uploads/2021/08/4.png',
                donateUrl: 'https://rankthevote.us/donate/',
                description: 'National campaign to adopt RCV for federal elections.'
            },
            {
                name: 'Common Cause',
                logo: 'https://www.commoncause.org/ohio/wp-content/uploads/2024/08/OH.png',
                donateUrl: 'https://www.commoncause.org/donate/',
                description: 'Nonpartisan grassroots organization dedicated to upholding democratic values.'
            }
        ]
    },
    {
        id: 'debt-profiteering',
        title: 'Public Debt Profiteering',
        shortTitle: 'Debt Reform',
        description: 'Public debt profiteering occurs when financial institutions exploit government borrowing for outsized profits at taxpayer expense, including predatory lending and student loan abuses. Reform efforts aim to increase transparency, cap interest rates, and protect consumers.',
        heroImage: 'https://votecraft.org/wp-content/uploads/2026/02/end_public-debt-profiteering_feature.jpg',
        learnMoreUrl: 'https://votecraft.org/solutions/debt-profiteering/',
        publicAwareness: [
            { year: 2007, pct: 53 }, { year: 2009, pct: 53 },
            { year: 2011, pct: 64 }, { year: 2012, pct: 69 },
            { year: 2013, pct: 72 }, { year: 2015, pct: 64 },
            { year: 2016, pct: 56 }, { year: 2018, pct: 48 },
            { year: 2019, pct: 48 }, { year: 2020, pct: 53 },
            { year: 2021, pct: 45 }, { year: 2022, pct: 45 },
            { year: 2023, pct: 57 }, { year: 2024, pct: 56 }
        ],
        chartSource: 'Pew Research Center, "Public\'s Top Policy Priorities" surveys (2007-2024)',
        billKeywords: ['public debt', 'predatory lending', 'student debt', 'student loan', 'debt relief', 'debt collection', 'payday loan', 'loan forgiveness', 'borrower', 'consumer financial'],
        nonprofits: [
            {
                name: 'Americans for Financial Reform',
                logo: '',
                donateUrl: 'https://ourfinancialsecurity.org/donate/',
                description: 'Coalition working to create a fair financial system that serves the public.'
            },
            {
                name: 'Student Borrower Protection Center',
                logo: '',
                donateUrl: 'https://protectborrowers.org/donate/',
                description: 'Advocates for student loan borrower rights and debt reform.'
            },
            {
                name: 'Demos',
                logo: '',
                donateUrl: 'https://www.demos.org/donate',
                description: 'Public policy organization working for an equal democracy and economy.'
            }
        ]
    },
    {
        id: 'citizens-united',
        title: "Ending Citizen's United",
        shortTitle: 'Citizens United',
        description: 'The Citizens United v. FEC decision opened the floodgates for unlimited corporate spending in elections through super PACs and dark money. Reform efforts seek to overturn this through constitutional amendments, disclosure requirements, and public campaign financing.',
        heroImage: 'https://votecraft.org/wp-content/uploads/2025/06/Citizens-united.jpg',
        learnMoreUrl: 'https://votecraft.org/solutions/end-dark-money/',
        publicAwareness: [
            { year: 2010, pct: 65 }, { year: 2012, pct: 75 },
            { year: 2015, pct: 76 }, { year: 2018, pct: 77 },
            { year: 2019, pct: 77 }, { year: 2020, pct: 66 },
            { year: 2023, pct: 72 }
        ],
        chartSource: 'Pew Research Center (2010-2023). % supporting campaign spending limits.',
        billKeywords: ['citizens united', 'campaign finance', 'dark money', 'super pac', 'political action committee', 'corporate political', 'campaign spending', 'political contribution', 'money in politics', 'disclose act', 'for the people act', 'freedom to vote', 'democracy for all', 'honest ads', 'foreign money', 'election integrity', 'voter disclosure', 'political spending', 'corporate money'],
        nonprofits: [
            {
                name: 'End Citizens United',
                logo: '',
                donateUrl: 'https://endcitizensunited.org/donate/',
                description: 'PAC dedicated to electing reform champions and passing campaign finance reform.'
            },
            {
                name: 'Issue One',
                logo: '',
                donateUrl: 'https://issueone.org/donate/',
                description: 'Cross-partisan organization working to reduce the power of money in politics.'
            },
            {
                name: 'Campaign Legal Center',
                logo: '',
                donateUrl: 'https://campaignlegal.org/donate',
                description: 'Nonpartisan legal organization advancing democracy through law.'
            }
        ]
    },
    {
        id: 'healthcare',
        title: 'Universal Basic Healthcare',
        shortTitle: 'Healthcare',
        description: 'Universal basic healthcare ensures every person has access to essential medical services regardless of income or pre-existing conditions. Proposals range from Medicare for All to public option plans, treating healthcare as a right while controlling costs.',
        heroImage: 'https://votecraft.org/wp-content/uploads/2025/06/healthcare1.jpg',
        learnMoreUrl: 'https://votecraft.org/solutions/universal-basic-healthcare/',
        publicAwareness: [
            { year: 2000, pct: 64 }, { year: 2002, pct: 62 },
            { year: 2004, pct: 64 }, { year: 2006, pct: 69 },
            { year: 2008, pct: 54 }, { year: 2010, pct: 47 },
            { year: 2012, pct: 44 }, { year: 2014, pct: 42 },
            { year: 2016, pct: 51 }, { year: 2018, pct: 60 },
            { year: 2020, pct: 63 }, { year: 2023, pct: 59 }
        ],
        chartSource: 'Gallup, "Healthcare System" (2000-2016); Pew Research Center (2018-2023). % saying govt should ensure coverage.',
        billKeywords: ['universal health', 'medicare for all', 'public option', 'medicaid expansion', 'single payer', 'affordable care', 'healthcare for all', 'drug pricing', 'prescription drug', 'health care coverage', 'health insurance'],
        nonprofits: [
            {
                name: 'Physicians for a National Health Program',
                logo: '',
                donateUrl: 'https://pnhp.org/donate/',
                description: 'Organization of physicians advocating for single-payer national health insurance.'
            },
            {
                name: 'Families USA',
                logo: '',
                donateUrl: 'https://familiesusa.org/donate/',
                description: 'National voice for healthcare consumers, fighting for affordable care.'
            },
            {
                name: 'Community Catalyst',
                logo: '',
                donateUrl: 'https://communitycatalyst.org/donate/',
                description: 'National advocacy organization working to build health equity.'
            }
        ]
    },
    {
        id: 'scotus',
        title: 'Supreme Court Reform',
        shortTitle: 'SCOTUS Reform',
        description: 'Supreme Court reform proposals aim to restore public trust through term limits for justices, expanding the number of seats, binding ethics codes, and increased transparency. These reforms seek to depoliticize the court and ensure it reflects the will of the people.',
        heroImage: 'https://votecraft.org/wp-content/uploads/2025/06/supreme-court2.jpg',
        learnMoreUrl: 'https://votecraft.org/solutions/supreme-court-reform/',
        publicAwareness: [
            { year: 2014, pct: 60 }, { year: 2018, pct: 61 },
            { year: 2020, pct: 77 }, { year: 2021, pct: 63 },
            { year: 2022, pct: 67 }, { year: 2023, pct: 74 },
            { year: 2024, pct: 73 }
        ],
        chartSource: 'Fix the Court/Ipsos (2014, 2018, 2020); AP-NORC (2021-2022); Pew Research (2023); Marquette Law School (2024). % supporting term limits.',
        billKeywords: ['supreme court', 'judicial term limits', 'court expansion', 'judicial ethics', 'court reform', 'judicial accountability', 'scotus', 'justice term limit'],
        nonprofits: [
            {
                name: 'Fix the Court',
                logo: '',
                donateUrl: 'https://fixthecourt.com/donate/',
                description: 'Nonpartisan organization advocating for Supreme Court transparency and accountability.'
            },
            {
                name: 'Demand Justice',
                logo: '',
                donateUrl: 'https://demandjustice.org/donate/',
                description: 'Organization working to restore the legitimacy of the federal judiciary.'
            },
            {
                name: 'Alliance for Justice',
                logo: '',
                donateUrl: 'https://www.afj.org/donate/',
                description: 'Progressive legal advocacy organization focused on judicial nominations and reform.'
            }
        ]
    },
    {
        id: 'news-paywalls',
        title: 'News Paywall Reform',
        shortTitle: 'News Paywalls',
        description: 'News paywalls have created an information divide where access to quality journalism depends on ability to pay. Reform proposals include public funding for local journalism, tax incentives for free civic reporting, and cooperative ownership models.',
        heroImage: 'https://votecraft.org/wp-content/uploads/2026/02/news_paywall_reform_feature.jpg',
        learnMoreUrl: 'https://votecraft.org/solutions/news-paywall-reform/',
        publicAwareness: [
            { year: 2013, pct: 5 }, { year: 2014, pct: 10 },
            { year: 2016, pct: 11 }, { year: 2017, pct: 16 },
            { year: 2019, pct: 16 }, { year: 2020, pct: 20 },
            { year: 2021, pct: 21 }, { year: 2022, pct: 19 },
            { year: 2023, pct: 21 }, { year: 2024, pct: 22 }
        ],
        chartSource: 'Reuters Institute Digital News Report (2013-2024). % who paid for online news.',
        billKeywords: ['local journalism', 'journalism funding', 'local news', 'news deserts', 'journalism tax credit', 'community news', 'newsroom', 'journalism preservation'],
        nonprofits: [
            {
                name: 'Free Press',
                logo: '',
                donateUrl: 'https://www.freepress.net/donate',
                description: 'Fighting for media that serves the public interest and strengthens democracy.'
            },
            {
                name: 'News Revenue Hub',
                logo: '',
                donateUrl: 'https://fundjournalism.org/donate/',
                description: 'Helping news organizations build sustainable reader revenue models.'
            },
            {
                name: 'Report for America',
                logo: '',
                donateUrl: 'https://www.reportforamerica.org/donate/',
                description: 'Placing talented journalists in local newsrooms across the country.'
            }
        ]
    }
];

window.ISSUES_CATALOG = ISSUES_CATALOG;

/**
 * Fetch keywords from WordPress admin dashboard (if available)
 * Falls back to static keywords if API is unavailable
 */
async function loadKeywordsFromAPI() {
    try {
        const response = await fetch('https://votecraft.org/wp-json/votecraft/v1/keywords');
        if (!response.ok) {
            console.log('Keywords API not available, using static keywords');
            return;
        }
        const apiKeywords = await response.json();

        // Merge API keywords into ISSUES_CATALOG
        for (const issue of ISSUES_CATALOG) {
            if (apiKeywords[issue.id] && Array.isArray(apiKeywords[issue.id])) {
                issue.billKeywords = apiKeywords[issue.id];
                console.log(`Updated keywords for ${issue.id}:`, issue.billKeywords.length, 'keywords');
            }
        }
    } catch (error) {
        console.log('Could not load keywords from API, using static keywords:', error.message);
    }
}

/**
 * Fetch manual bill-legislator associations from WordPress admin
 * Returns an object mapping legislator names to arrays of bills they should show for each issue
 */
async function loadManualAssociations() {
    try {
        const response = await fetch('https://votecraft.org/wp-json/votecraft/v1/bill-associations');
        if (!response.ok) {
            return {};
        }
        const associations = await response.json();
        window.MANUAL_BILL_ASSOCIATIONS = associations;
        console.log('Loaded manual bill associations:', Object.keys(associations).length, 'legislators');
        return associations;
    } catch (error) {
        console.log('Could not load manual bill associations:', error.message);
        window.MANUAL_BILL_ASSOCIATIONS = {};
        return {};
    }
}

/**
 * Fetch excluded bills from WordPress admin
 * Returns an object mapping legislator names to issue IDs to arrays of excluded bill IDs
 */
async function loadExcludedBills() {
    try {
        const response = await fetch('https://votecraft.org/wp-json/votecraft/v1/excluded-bills');
        if (!response.ok) {
            return {};
        }
        const excluded = await response.json();
        window.EXCLUDED_BILLS = excluded;
        console.log('Loaded excluded bills:', Object.keys(excluded).length, 'legislators');
        return excluded;
    } catch (error) {
        console.log('Could not load excluded bills:', error.message);
        window.EXCLUDED_BILLS = {};
        return {};
    }
}

// Load keywords, associations, and exclusions when page loads
document.addEventListener('DOMContentLoaded', async () => {
    await loadKeywordsFromAPI();
    await loadManualAssociations();
    await loadExcludedBills();
});
