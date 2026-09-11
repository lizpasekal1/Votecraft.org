/* ===================================================================================
 * CURATED CMS — DEMO CONTENT PAYLOAD
 * ===================================================================================
 * Hand-authored demo content for the "Cause Curated" CMS. Consumed by
 * scripts/seed-curated-lists.html, which writes it to Firestore (curated_topics +
 * curated_lists + curated_items) when opened in a browser signed in as a SaveCraft admin.
 *
 * A plain .js file (not .json) so the seeder can <script src> it straight off disk —
 * a file:// page can't fetch() a sibling .json.
 *
 * SHAPES
 *   topics[] — one per shared cause. Doc id == slug (e.g. "ranked-choice-voting").
 *     { id, name, slug, shortName, headline, description, iconUrl?, coverUrl?, published:true }
 *   lists[]  — one per nonprofit page. Doc id == slug (e.g. "fairvote").
 *     { id, name, slug, shortName, headline, description,
 *       wordmarkUrl?, iconUrl?, coverUrl?,             // omit or "" for a text-only hero
 *       enabledCategories: [ <CATEGORIES member>, ... ],   // which tabs the list shows
 *       topics: [ <topic slug>, ... ],                 // which shared causes it belongs to
 *       rows: [ { category, label, titles? } ],        // one carousel per row on the landing page
 *       published: true }
 *   items[] — curated_items docs (all string fields — the app reads strings only).
 *     { docId, id, genre, category, folderId?, title, url?, imageUrl?, notes? }
 *       genre    == the owning list's slug
 *       category  = a CATEGORIES member in that list's enabledCategories
 *       folderId  = a default-* folder id for that category (storage.js `defaults`), or ""
 *
 * FOLDER IDS by category (from storage.js `defaults`):
 *   Films:      default-movies-movies | default-movies-videos | default-movies-directors | default-movies-series
 *   Series:     default-shows-podcasts | default-shows-webseries | default-shows-tutorials | default-shows-shortform
 *   Literature: default-books-books | default-books-authors | default-books-pdfs | default-books-quotes
 *   Sources:    default-weblinks-websites | default-weblinks-articles | default-weblinks-blogs | default-weblinks-publications
 *   Music:      default-musicians-musicians
 *   Albums:     default-music-albums | default-music-playlists
 *   Games:      default-games-console | default-games-board | default-games-mobile | default-games-companies
 *   Arts:       default-art-artists | default-art-dance | default-art-comics | default-art-memes
 * =================================================================================== */

window.CURATED_LISTS_PAYLOAD = {
  topics: [
    {
      id: 'ranked-choice-voting',
      name: 'Ranked Choice Voting',
      slug: 'ranked-choice-voting',
      shortName: 'RCV',
      headline: 'Ranked Choice Voting',
      description:
        "A curated collection exploring ranked choice voting — how it works, where it's used, " +
        'and why it matters. Resources pooled from every nonprofit working on the issue.',
      iconUrl: '',
      coverUrl: '',
      published: true,
    },
  ],

  lists: [
    {
      id: 'fairvote',
      name: 'FairVote',
      slug: 'fairvote',
      shortName: 'FairVote',
      headline: 'FairVote',
      description:
        'FairVote is a nonpartisan organization advancing voting reforms — ranked choice voting ' +
        'and proportional representation chief among them — to make democracy more functional and ' +
        'representative for every American.',
      wordmarkUrl: '',
      iconUrl: '',
      coverUrl: '',
      enabledCategories: ['Films', 'Sources'],
      topics: ['ranked-choice-voting'],
      rows: [
        { category: 'Films', label: 'Videos' },
        { category: 'Sources', label: 'Resources' },
      ],
      published: true,
    },
  ],

  items: [
    // ── FairVote › Films › Videos ────────────────────────────────────────────────────
    //    FairVote's YouTube channel (@fairvotereform, UCb8R3tlbcYaE5J5-HUBf7mw), 15 most
    //    recent uploads as of Sep 2026. Thumbnails use the img.youtube.com URL the app
    //    already recognizes (utils.js isYoutubeThumbnailUrl). `notes` records the source org.
    _yt('Gf0HIDHfI9Q', 'Why Do We Have to Vote Twice?'),
    _yt('k3lsCHemLwY', "Alaska's 'Dan Sullivans' and Ranked Choice Voting"),
    _yt('aRxXg9WP8rc', "Is Ranked Choice Voting 'One Person, One Vote'?"),
    _yt('VwlVmFGzL-A', 'Pete Buttigieg Explains the Need for Proportional Representation'),
    _yt('7c6mMrC9RB0', 'Wisconsin Picked Its Nominees for Governor. 68,000 Votes Never Counted'),
    _yt('FRO7TW74oC0', 'What Are Zombie Votes?'),
    _yt('4PJaJvXVCvE', "Alaska's Election Reform Worked. Why Are Some Trying to Repeal It?"),
    _yt('HRDlnl8f35s', "Why Don't More Independents Run for Office?"),
    _yt('fdh_Ui7UHYk', '3 Cities Put Ranked Choice Voting on November Ballot'),
    _yt('4HJT8ZzXvRE', 'How We Can Fix Our Broken Elections'),
    _yt('OfInsYTkLI8', 'New Poll Finds Strong Support for Ranked Choice Voting in DC'),
    _yt('Xk3XQTZX-kk', 'California Avoided a Lockout — Again. Ranked Choice Voting Could Fix That for Good'),
    _yt('0sN02OhB6lw', 'DC Voters Share Their Experience With Ranked Choice Voting'),
    _yt('OtJYYfvd0tY', 'How Ranked Choice Voting Is Working in Maine'),
    _yt('6UBTaJUWG3Q', "She Brought Ranked Choice Voting to DC — Now She's Ranking Her Vote"),

    // ── FairVote › Sources › Resources ──────────────────────────────────────────────
    //    FairVote's resources hub (fairvote.org/resources/). Reports and explainers filed
    //    under the Web Links "Articles" folder. No thumbnails — cards fall back to a letter tile.
    _src('neighborhood-representation-with-prcv', 'Proportional RCV and neighborhood representation', 'https://fairvote.org/report/neighborhood-representation-with-prcv/'),
    _src('two-decades-of-rcv-in-california', 'Two decades of ranked choice voting in California', 'https://fairvote.org/report/two-decades-of-rcv-in-california/'),
    _src('rcv-in-new-mexico-report', 'Ranked choice voting in New Mexico', 'https://fairvote.org/report/rcv-in-new-mexico-report/'),
    _src('a-primer-on-party-preferential-voting', 'A primer on party preferential voting', 'https://fairvote.org/report/a-primer-on-party-preferential-voting/'),
    _src('data-on-rcv', 'Data on RCV in practice', 'https://fairvote.org/resources/data-on-rcv/'),
    _src('model-legislation', 'Model legislation', 'https://fairvote.org/resources/model-legislation/'),
    _src('rcv-applications-and-ballot-tools', 'RCV "how-to\'s" and ballot tools', 'https://fairvote.org/resources/rcv-applications-and-ballot-tools/'),
    _src('electoral-systems', 'Electoral systems', 'https://fairvote.org/resources/electoral-systems/'),
    _src('why-congress-is-broken-2025', 'Why Congress is broken', 'https://fairvote.org/resources/why-congress-is-broken-2025/'),
    _src('presidential-elections', 'Presidential elections', 'https://fairvote.org/resources/presidential-elections/'),
    _src('improving-redistricting-with-proportional-representation', 'Improving redistricting with proportional representation', 'https://fairvote.org/improving-redistricting-with-proportional-representation/'),
    _src('voter-turnout', 'Voter turnout', 'https://fairvote.org/resources/voter-turnout/'),
    _src('glossary', 'Glossary of election reform terms', 'https://fairvote.org/resources/glossary/'),
  ],
};

// One FairVote YouTube video → a FairVote › Films › Videos item.
function _yt(videoId, title) {
  return {
    docId: 'fairvote-movie-' + videoId,
    id: 'cur-fairvote-' + videoId,
    genre: 'fairvote',
    category: 'Films',
    folderId: 'default-movies-videos',
    title,
    url: 'https://www.youtube.com/watch?v=' + videoId,
    imageUrl: 'https://img.youtube.com/vi/' + videoId + '/hqdefault.jpg',
    notes: 'FairVote',
  };
}

// One FairVote resource page → a FairVote › Sources › Articles item.
function _src(slug, title, url) {
  return {
    docId: 'fairvote-weblinks-' + slug,
    id: 'cur-fairvote-' + slug,
    genre: 'fairvote',
    category: 'Sources',
    folderId: 'default-weblinks-articles',
    title,
    url,
    imageUrl: '',
    notes: 'FairVote',
  };
}
