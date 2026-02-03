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
        description: 'Ranked Choice Voting lets voters rank candidates by preference, ensuring winners have broad support while reducing vote-splitting and negative campaigning. Instead of choosing just one candidate, voters rank their choices. If no candidate wins a majority of first-choice votes, the candidate with the fewest votes is eliminated, and those voters\' next choices are counted. This continues until someone earns a majority.',
        heroImage: 'https://votecraft.org/wp-content/uploads/2025/06/rank-the-vote.jpg',
        learnMoreUrl: 'https://votecraft.org/solutions/rank-choice-voting/',
        billKeywords: ['ranked choice voting', 'instant runoff', 'preferential voting'],
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
        description: 'Public debt profiteering occurs when financial institutions and private actors exploit government borrowing mechanisms for outsized profits at taxpayer expense. This includes predatory lending practices, student loan servicing abuses, and the financialization of public debt. Reform efforts aim to increase transparency in government borrowing, cap interest rates on public debt instruments, and protect consumers from predatory financial practices.',
        heroImage: 'https://votecraft.org/wp-content/uploads/2026/02/end_public-debt-profiteering_feature.jpg',
        learnMoreUrl: '',
        billKeywords: ['public debt', 'predatory lending', 'student debt relief', 'debt transparency'],
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
        description: 'The Citizens United v. FEC Supreme Court decision opened the floodgates for unlimited corporate spending in elections. The ruling allows corporations and outside groups to spend unlimited money on political campaigns through super PACs and dark money organizations. Reform efforts seek to overturn or mitigate this decision through constitutional amendments, increased disclosure requirements, and public campaign financing.',
        heroImage: 'https://votecraft.org/wp-content/uploads/2025/06/Citizens-united.jpg',
        learnMoreUrl: '',
        billKeywords: ['citizens united', 'campaign finance reform', 'dark money', 'political spending disclosure'],
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
        description: 'Universal basic healthcare ensures that every person has access to essential medical services regardless of income, employment, or pre-existing conditions. Proposals range from single-payer systems like Medicare for All to public option plans that expand coverage alongside private insurance. The goal is to guarantee that healthcare is treated as a right, not a privilege, while controlling costs and improving outcomes.',
        heroImage: 'https://votecraft.org/wp-content/uploads/2025/06/healthcare1.jpg',
        learnMoreUrl: '',
        billKeywords: ['universal healthcare', 'medicare for all', 'public option', 'health coverage expansion'],
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
        description: 'Supreme Court reform encompasses proposals to restructure the nation\'s highest court to restore public trust and ensure fair, balanced rulings. Proposals include term limits for justices (replacing lifetime appointments), expanding the number of seats, implementing binding ethics codes, and increasing transparency in the court\'s operations. These reforms aim to depoliticize the court and ensure it reflects the will of the people.',
        heroImage: 'https://votecraft.org/wp-content/uploads/2025/06/supreme-court2.jpg',
        learnMoreUrl: '',
        billKeywords: ['supreme court reform', 'judicial term limits', 'court expansion', 'judicial ethics'],
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
        description: 'The rise of news paywalls has created an information divide where access to quality journalism depends on ability to pay. While news organizations need sustainable revenue, civic information should be accessible to all. Reform proposals include public funding for local journalism, tax incentives for news organizations that provide free civic reporting, and cooperative ownership models that keep news accountable to communities rather than shareholders.',
        heroImage: 'https://votecraft.org/wp-content/uploads/2026/02/news_paywall_reform_feature.jpg',
        learnMoreUrl: '',
        billKeywords: ['local journalism', 'news access', 'press freedom', 'journalism funding'],
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
