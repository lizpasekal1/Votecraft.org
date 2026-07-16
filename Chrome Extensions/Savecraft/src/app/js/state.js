// ===== SHARED STATE + STATIC CONFIG =====
// Every other module imports `state` (and CURATED_ITEMS) from here and mutates it directly —
// ES module bindings are live references, so this works exactly like the single-file closure
// this codebase used to be, just spread across files.

export const CATEGORIES = ['Web Links', 'Visual Art', 'Book', 'Movie', 'Game', 'News', 'Musician', 'Music Album', 'Show'];
// Categories whose empty accordion (in the placeholder slot between My Notes and Web Links)
// is labeled "Summary" instead of "Placeholder", and which get a Wikipedia fallback for a
// missing image/summary. Visual Art and the music categories are intentionally excluded.
export const SUMMARY_PLACEHOLDER_CATEGORIES = ['Book', 'Show', 'Movie', 'Game'];
// Categories whose curated (Top 100) items stash the creator's name in a clean `.notes` field —
// confirmed Music Album is the only one. Book/Movie/Game/Show instead combine "Title — Creator"
// into `.title`, with a real description in `.notes` — see splitCuratedTitleCreator() in
// render.js, which parses those apart into a real item.author at load time instead.
export const CURATED_NOTES_CATEGORIES = ['Music Album'];
// Curated "creator card" pseudo-categories (a person/studio's own card, e.g. a curated Musician
// or Book Author entry) map to the real CATEGORIES member their profile page/works are filed
// under — Musician already works this way natively (it IS a real category); Book Author/Movie
// Director/Show Creator/Game Studio are curated-only buckets that map back to the real
// Book/Movie/Show/Game category for navigateToAuthor().
export const CREATOR_CARD_CATEGORY = {
  Musician: 'Musician',
  'Book Author': 'Book',
  'Movie Director': 'Movie',
  'Show Creator': 'Show',
  'Game Studio': 'Game',
};
// Landing-page content for the curated genre picker (render.js's renderTop100Landing() and
// friends) — keyed by genre so a future sponsored genre can get the same treatment later just by
// adding an entry here, with no new rendering code. Only 'Top 100' is populated for now; every
// other genre keeps the plain "Pick a category" empty state. `rows` picks which curated
// categories get their own horizontal row and in what order — deliberately excludes Music Album
// (not an actual curated shortlist, see CURATED_NOTES_CATEGORIES/session docs) and Visual Art
// (no curated data exists for it at all).
export const CURATED_GENRE_LANDING_CONTENT = {
  'Top 100': {
    headline: 'The Votecraft List',
    description: 'Explore and bookmark recommendations from major publications and experts! This collection has been assembled from the 100 essential picks across music, film, books, and games. Inquire to create a sponsored SaveCraft curated list!',
    rows: [
      // `titles`, when set, hand-picks exactly these items (by exact title match) in this exact
      // order instead of the default "first 15 curated docs" — see renderCuratedGenreLanding()
      // in render.js.
      { category: 'Musician', label: 'Top Musicians', titles: ['The Beatles', 'Aretha Franklin', 'Queen', 'Stevie Wonder', 'The Rolling Stones', 'Joni Mitchell', 'Muse', 'Johnny Cash'] },
      { category: 'Movie', label: 'Top Films', titles: ['Everything Everywhere All at Once', 'Eternal Sunshine of the Spotless Mind', 'Arrival', 'Spirited Away', 'Citizen Kane', 'The Godfather', '2001: A Space Odyssey'] },
      { category: 'Book', label: 'Top Books' },
      { category: 'Game', label: 'Top Games' },
    ],
  },
};
// Content for the Curated SaveCraft directory — shared by the bare-bones top-level landing
// (renderCuratedBareList()) and the fuller hero+carousel page (renderCuratedDirectory()), both in
// render.js. ActBlue-style cause groupings, mostly a demo/pitch surface: only 5 of these orgs are
// real (matching CURATED_LIST_DISPLAY_NAMES in dashboard.js); the rest are invented placeholders
// for volume, with emoji standing in for a real logo/cover. Nothing is clickable by default —
// an org can opt in with a `linkTo` (a real state.view string) for the rare case, like Votecraft
// List, where a real destination already exists.
export const CURATED_DIRECTORY_CONTENT = {
  headline: 'Sponsored Lists, Powered by Partners',
  description: "Every list below imagines a nonprofit or advocacy partner's own curated SaveCraft collection — a preview of what's possible when culture and civic life share a spotlight. This directory is a work in progress. Inquire to bring your organization's list to life!",
  categories: [
    {
      label: 'Voting & Democracy',
      orgs: [
        { name: 'Votecraft List', tagline: 'The essential picks behind every ballot conversation.', icon: '🗳️', imageUrl: 'images/logos/votecraft_icon_white.png', linkTo: 'genre:Top 100' },
        { name: 'FairVote List', tagline: 'Ranked-choice voting, explained through story.', icon: '⚖️', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/FairVote_logo_2022.svg/1280px-FairVote_logo_2022.svg.png' },
        { name: 'Represent-Us List', tagline: 'Pop culture with a civic pulse.', icon: '🎤', imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRLN7Vhtsq9mGoooXabqvbP_J_LqfXhzUfXVqVQUGx01VMKYovqsPFRC43U&s=10' },
      ],
    },
    {
      label: 'Social Justice & Equity',
      orgs: [
        { name: 'Progressive List', tagline: 'Bold worldbuilding for a bolder politics.', icon: '🔥', imageUrl: 'https://scorecard.progressivemass.com/static/progressive-mass-logo-48694f1da6be76049871b17018f2a8ef.png' },
        { name: 'End Citizens United', tagline: 'Getting big money out of politics, one story at a time.', icon: '🚫', imageUrl: 'https://www.ricklarsen.org/media/uploads/blog/ECU_Blue.png' },
        { name: 'Strict Scrutiny', tagline: 'The Supreme Court, explained without the jargon.', icon: '⚖️', imageUrl: 'https://i.scdn.co/image/ab67656300005f1fc5c7f6044944383b1333420a' },
        { name: 'Racial Equity Now', tagline: 'Media that centers stories of racial justice.', icon: '✊' },
        { name: 'Housing For All Coalition', tagline: 'Stories of displacement, and the fight against it.', icon: '🏠' },
        { name: 'Immigrant Justice Network', tagline: 'Amplifying immigrant voices in film and print.', icon: '🌍' },
      ],
    },
    {
      label: 'Arts & Culture',
      orgs: [
        { name: 'The Jazz Word List', tagline: 'Jazz history as a living archive.', icon: '🎷' },
        { name: 'Comedy for Change List', tagline: 'Satire with a point of view.', icon: '🎭' },
        { name: 'Independent Film Fund', tagline: "Distribution support for films that wouldn't otherwise get seen.", icon: '🎬' },
        { name: 'Reading Rights Collective', tagline: 'Defending banned books, one list at a time.', icon: '📚' },
      ],
    },
    {
      label: 'Civic Participation',
      orgs: [
        { name: 'Youth Vote Initiative', tagline: 'Culture picks built by and for first-time voters.', icon: '🎓' },
        { name: 'Rank The Vote', tagline: 'Explaining electoral reform through story and song.', icon: '🔢' },
        { name: 'Civic Tech Collective', tagline: 'Technology, transparency, and the future of democracy.', icon: '💻' },
      ],
    },
    {
      label: 'Environment & Climate',
      orgs: [
        { name: 'Climate Forward Fund', tagline: 'Stories that make the climate crisis feel personal.', icon: '🌱' },
        { name: 'Ocean Guardians Alliance', tagline: 'Protecting our oceans, one recommendation at a time.', icon: '🌊' },
        { name: 'Green Future Coalition', tagline: 'Optimistic climate fiction and nonfiction.', icon: '🌳' },
      ],
    },
    {
      label: 'Health & Justice',
      orgs: [
        { name: 'Reproductive Freedom Fund', tagline: 'Centering bodily autonomy in culture and story.', icon: '🩺' },
        { name: 'Community Health Access Project', tagline: 'Health equity, told through narrative.', icon: '💞' },
        { name: 'Criminal Justice Reform Now', tagline: 'Stories from inside a broken system, and beyond it.', icon: '⛓️' },
      ],
    },
    {
      label: 'Education & Literacy',
      orgs: [
        { name: 'First Chapter Fund', tagline: 'Early literacy programs, told through story.', icon: '📖' },
        { name: 'Teach Forward Alliance', tagline: 'Supporting educators in under-resourced schools.', icon: '🍎' },
      ],
    },
    {
      label: 'Housing & Economic Justice',
      orgs: [
        { name: 'Fair Wage Coalition', tagline: 'The fight for a living wage, in culture and in courtrooms.', icon: '💵' },
        { name: 'Tenant Power Network', tagline: 'Renters organizing for stability and dignity.', icon: '🏘️' },
      ],
    },
    {
      label: 'Global & Humanitarian',
      orgs: [
        { name: 'Refugee Voices Project', tagline: 'Displacement stories, told by the people living them.', icon: '🕊️' },
        { name: 'Clean Water Collective', tagline: 'Access to clean water, one community at a time.', icon: '💧' },
      ],
    },
    {
      label: 'Digital & Consumer Rights',
      orgs: [
        { name: 'Privacy First Coalition', tagline: 'Data rights and digital privacy, explained simply.', icon: '🔒' },
        { name: 'Open Internet Fund', tagline: 'Keeping the internet fair, open, and accessible.', icon: '🌐' },
      ],
    },
  ],
};
export const MODAL_BOOKMARK_ICON_SVG = '<svg class="modal-bookmark-icon" xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="M200-120v-640q0-33 23.5-56.5T280-840h400q33 0 56.5 23.5T760-760v640L480-240 200-120Z"/></svg>';
// Shared outline/filled bookmark pair — used by the card grid's quick-queue button (curated
// cards only) and mirrors the detail modal's own bookmark icons (which keep their own local
// copies, unrelated to this export — not worth the churn of switching an already-working spot).
export const BOOKMARK_OUTLINE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M200-120v-640q0-33 23.5-56.5T280-840h400q33 0 56.5 23.5T760-760v640L480-240 200-120Zm80-122 200-86 200 86v-518H280v518Zm0-518h400-400Z"/></svg>';
export const BOOKMARK_FILLED_SVG = '<svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M200-120v-640q0-33 23.5-56.5T280-840h400q33 0 56.5 23.5T760-760v640L480-240 200-120Z"/></svg>';
export const CURATED_GENRES = ['Top 100', 'Futurism', 'Fantasy', 'Thriller', 'Pop', 'Classic', 'Jazz', 'Comedy'];
export const GENRE_EMOJI = {
  'Top 100':  '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M852-212 732-332l56-56 120 120-56 56ZM708-692l-56-56 120-120 56 56-120 120Zm-456 0L132-812l56-56 120 120-56 56ZM108-212l-56-56 120-120 56 56-120 120Zm246-75 126-76 126 77-33-144 111-96-146-13-58-136-58 135-146 13 111 97-33 143ZM233-120l65-281L80-590l288-25 112-265 112 265 288 25-218 189 65 281-247-149-247 149Zm247-361Z"/></svg>',
  'Futurism': '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m240-198 79-32q-10-29-18.5-59T287-349l-47 32v119Zm160-42h160q18-40 29-97.5T600-455q0-99-33-187.5T480-779q-54 48-87 136.5T360-455q0 60 11 117.5t29 97.5Zm23.5-223.5Q400-487 400-520t23.5-56.5Q447-600 480-600t56.5 23.5Q560-553 560-520t-23.5 56.5Q513-440 480-440t-56.5-23.5ZM720-198v-119l-47-32q-5 30-13.5 60T641-230l79 32ZM480-881q99 72 149.5 183T680-440l84 56q17 11 26.5 29t9.5 38v237l-199-80H359L160-80v-237q0-20 9.5-38t26.5-29l84-56q0-147 50.5-258T480-881Z"/></svg>',
  'Fantasy':  '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M200-80v-160q0-23 12-41.5t32-29.5l196-99v-70l-139 69q-12 6-25 9t-26 3q-31 0-58.5-16T149-461q-14-27-12-57.5t19-56.5l124-185-80-120h240q133 0 226.5 93T760-560v480H200Zm80-80h400v-400q0-100-70-170t-170-70h-90l26 40-153 230q-5 8-5.5 16.5T221-497q5 11 13.5 14.5T251-479q3 0 15-3l254-128v250L280-240v80Zm160-320Z"/></svg>',
  'Thriller': '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M240-80v-170q-39-17-68.5-45.5t-50-64.5q-20.5-36-31-77T80-520q0-158 112-259t288-101q176 0 288 101t112 259q0 42-10.5 83t-31 77q-20.5 36-50 64.5T720-250v170H240Zm80-80h40v-80h80v80h80v-80h80v80h40v-142q38-9 67.5-30t50-50q20.5-29 31.5-64t11-74q0-125-88.5-202.5T480-800q-143 0-231.5 77.5T160-520q0 39 11 74t31.5 64q20.5 29 50.5 50t67 30v142Zm100-200h120l-60-120-60 120Zm-80-80q33 0 56.5-23.5T420-520q0-33-23.5-56.5T340-600q-33 0-56.5 23.5T260-520q0 33 23.5 56.5T340-440Zm280 0q33 0 56.5-23.5T700-520q0-33-23.5-56.5T620-600q-33 0-56.5 23.5T540-520q0 33 23.5 56.5T620-440ZM480-160Z"/></svg>',
  'Pop':      '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m440-803-83 83H240v117l-83 83 83 83v117h117l83 83 100-100 168 85-86-167 101-101-83-83v-117H523l-83-83Zm0-113 116 116h164v164l116 116-116 116 115 226q7 13 4 25.5T828-132q-8 8-20.5 11t-25.5-4L556-240 440-124 324-240H160v-164L44-520l116-116v-164h164l116-116Zm0 396Z"/></svg>',
  'Classic':  '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M320-160q-33 0-56.5-23.5T240-240v-120h120v-90q-35-2-66.5-15.5T236-506v-44h-46L60-680q36-46 89-65t107-19q27 0 52.5 4t51.5 15v-55h480v520q0 50-35 85t-85 35H320Zm120-200h240v80q0 17 11.5 28.5T720-240q17 0 28.5-11.5T760-280v-440H440v24l240 240v56h-56L510-514l-8 8q-14 14-29.5 25T440-464v104ZM224-630h92v86q12 8 25 11t27 3q23 0 41.5-7t36.5-25l8-8-56-56q-29-29-65-43.5T256-684q-20 0-38 3t-36 9l42 42Zm376 350H320v40h286q-3-9-4.5-19t-1.5-21Zm-280 40v-40 40Z"/></svg>',
  'Jazz':     '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M280-120v-123q-104-14-172-93T40-520h80q0 83 58.5 141.5T320-320h10q5 0 10-1 13 20 28 37.5t32 32.5q-10 3-19.5 4.5T360-243v123h-80Zm20-282q-43-8-71.5-40.5T200-520v-240q0-50 35-85t85-35q50 0 85 35t35 85v160H280v80q0 31 5 60.5t15 57.5Zm255-33q-35-35-35-85v-240q0-50 35-85t85-35q50 0 85 35t35 85v240q0 50-35 85t-85 35q-50 0-85-35Zm45 315v-123q-104-14-172-93t-68-184h80q0 83 58.5 141.5T640-320q83 0 141.5-58.5T840-520h80q0 105-68 184t-172 93v123h-80Zm68.5-371.5Q680-503 680-520v-240q0-17-11.5-28.5T640-800q-17 0-28.5 11.5T600-760v240q0 17 11.5 28.5T640-480q17 0 28.5-11.5ZM640-640Z"/></svg>',
  'Comedy':   '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M480-280q66 0 113-47t47-113H320q0 66 47 113t113 47ZM280-600h160q0-33-23.5-56.5T360-680q-33 0-56.5 23.5T280-600Zm240 0h160q0-33-23.5-56.5T600-680q-33 0-56.5 23.5T520-600ZM480-80q-75 0-140.5-28.5t-114-77q-48.5-48.5-77-114T120-440v-440h720v440q0 75-28.5 140.5t-77 114q-48.5 48.5-114 77T480-80Zm0-80q116 0 198-82t82-198v-360H200v360q0 116 82 198t198 82Zm0-320Z"/></svg>',
};
export const CAT_LABEL = {
  'Web Links': 'Websites',
  'News': 'News',
  'Book': 'Books', 'Game': 'Games', 'Movie': 'Films',
  'Musician': 'Music', 'Music Album': 'Music Albums',
  'Show': 'Shows', 'Visual Art': 'Arts',
};

const CAT_EMOJI_NOTE_ICON = '<svg xmlns="http://www.w3.org/2000/svg" height="28px" viewBox="0 -960 960 960" width="28px" fill="#5B5BEF"><path d="M447-207q-47-47-47-113t47-113q47-47 113-47 23 0 42.5 5.5T640-458v-342h240v120H720v360q0 66-47 113t-113 47q-66 0-113-47ZM80-320q0-99 38-186.5T221-659q65-65 152.5-103T560-800v80q-82 0-155 31.5t-127.5 86q-54.5 54.5-86 127T160-320H80Zm160 0q0-66 25.5-124.5t69-102Q378-590 436-615t124-25v80q-100 0-170 70t-70 170h-80Z"/></svg>';
export const CAT_EMOJI = { 'News': '<svg xmlns="http://www.w3.org/2000/svg" height="28px" viewBox="0 -960 960 960" width="28px" fill="#5B5BEF"><path d="M160-120q-33 0-56.5-23.5T80-200v-640l67 67 66-67 67 67 67-67 66 67 67-67 67 67 66-67 67 67 67-67 66 67 67-67v640q0 33-23.5 56.5T800-120H160Zm0-80h280v-240H160v240Zm360 0h280v-80H520v80Zm0-160h280v-80H520v80ZM160-520h640v-120H160v120Z"/></svg>', 'Music Album': '<svg xmlns="http://www.w3.org/2000/svg" height="28px" viewBox="0 -960 960 960" width="28px" fill="#5B5BEF"><path d="M500-360q42 0 71-29t29-71v-220h120v-80H560v220q-13-10-28-15t-32-5q-42 0-71 29t-29 71q0 42 29 71t71 29ZM320-240q-33 0-56.5-23.5T240-320v-480q0-33 23.5-56.5T320-880h480q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H320Zm0-80h480v-480H320v480ZM160-80q-33 0-56.5-23.5T80-160v-560h80v560h560v80H160Zm160-720v480-480Z"/></svg>', Musician: CAT_EMOJI_NOTE_ICON, Show: '<svg xmlns="http://www.w3.org/2000/svg" height="28px" viewBox="0 -960 960 960" width="28px" fill="#5B5BEF"><path d="m460-380 280-180-280-180v360ZM320-240q-33 0-56.5-23.5T240-320v-480q0-33 23.5-56.5T320-880h480q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H320ZM160-80q-33 0-56.5-23.5T80-160v-560h80v560h560v80H160Z"/></svg>', Book: '<svg xmlns="http://www.w3.org/2000/svg" height="28px" viewBox="0 -960 960 960" width="28px" fill="#5B5BEF"><path d="M270-80q-45 0-77.5-30.5T160-186v-558q0-38 23.5-68t61.5-38l395-78v640l-379 76q-9 2-15 9.5t-6 16.5q0 11 9 18.5t21 7.5h450v-640h80v720H270Zm10-217 80-16v-478l-80 16v478Z"/></svg>', Movie: '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 2 24 24" width="24px" fill="#5B5BEF"><path d="m7.727,7L13.727,1h3.422l-6,6h-3.422Zm9.672,0l5.4-5.4c-.501-.377-1.124-.6-1.798-.6h-1.023l-6,6h3.422Zm6.52-3.692l-3.692,3.692h3.773v-3c0-.238-.029-.47-.081-.692ZM4.898,7L10.898,1h-3.403L1.496,7h3.403ZM3,1C1.346,1,0,2.346,0,4v1.667L4.667,1h-1.667ZM0,9h24v14H0v-14Zm10,10.5l5.833-3.5-5.833-3.5v7Z"/></svg>', Game: '<svg xmlns="http://www.w3.org/2000/svg" height="28px" viewBox="0 -960 960 960" width="28px" fill="#5B5BEF"><path d="M182-200q-51 0-79-35.5T82-322l42-300q9-60 53.5-99T282-760h396q60 0 104.5 39t53.5 99l42 300q7 51-21 86.5T778-200q-21 0-39-7.5T706-230l-90-90H344l-90 90q-15 15-33 22.5t-39 7.5Zm526.5-251.5Q720-463 720-480t-11.5-28.5Q697-520 680-520t-28.5 11.5Q640-497 640-480t11.5 28.5Q663-440 680-440t28.5-11.5Zm-80-120Q640-583 640-600t-11.5-28.5Q617-640 600-640t-28.5 11.5Q560-617 560-600t11.5 28.5Q583-560 600-560t28.5-11.5ZM310-440h60v-70h70v-60h-70v-70h-60v70h-70v60h70v70Z"/></svg>', 'Visual Art': '<svg xmlns="http://www.w3.org/2000/svg" height="28px" viewBox="0 0 24 24" width="28px" fill="#5B5BEF"><path d="M5.61,12.17c-.12.12-.18.25-.18.4,0,.17.06.31.18.42.12.11.3.16.53.16s.47-.06.68-.18c.21-.12.36-.26.45-.43.09-.17.13-.39.13-.66v-.35c-.3.11-.61.2-.94.28-.44.12-.73.23-.84.35Z"/><path d="M19.94,2.82H4.06c-1.3,0-2.35,1.05-2.35,2.35v10.07c0,1.3,1.05,2.35,2.35,2.35h9.45l2.4,3.75,2.4-3.75h1.63c1.3,0,2.35-1.05,2.35-2.35V5.17c0-1.3-1.05-2.35-2.35-2.35ZM7.75,14.24c-.08-.15-.14-.26-.16-.34s-.05-.2-.08-.36c-.29.28-.57.47-.85.59-.39.16-.84.24-1.35.24-.68,0-1.2-.16-1.55-.47-.35-.32-.53-.7-.53-1.17,0-.43.13-.79.38-1.07s.72-.49,1.41-.62c.82-.16,1.35-.28,1.6-.35.24-.07.5-.15.77-.26,0-.27-.06-.46-.17-.56s-.31-.16-.59-.16c-.36,0-.63.06-.81.17-.14.09-.25.26-.34.5l-2.09-.22c.08-.37.19-.65.34-.86.15-.21.36-.39.64-.55.2-.11.48-.2.83-.26s.73-.09,1.14-.09c.66,0,1.18.04,1.58.11.4.07.73.23.99.46.19.16.33.39.44.68.11.3.16.58.16.85v2.52c0,.27.02.48.05.63.03.15.11.35.22.58h-2.05ZM10.86,8.54h2.05v.93c.2-.4.4-.68.61-.83.21-.15.47-.23.78-.23s.67.1,1.06.3l-.68,1.56c-.26-.11-.46-.16-.61-.16-.29,0-.51.12-.67.35-.23.33-.34.96-.34,1.87v1.91h-2.2v-5.7ZM18.68,14.37c-.54,0-.95-.07-1.2-.21-.26-.14-.45-.35-.57-.64-.12-.29-.19-.74-.19-1.38v-2.01h-.81v-1.6h.81v-1.05l2.19-1.12v2.17h1.2v1.6h-1.2v2.02c0,.24.02.4.07.48.07.12.2.18.38.18.16,0,.39-.05.68-.14l.16,1.51c-.54.12-1.05.18-1.51.18Z"/></svg>', 'Favorite Albums': '💿', 'Web Links': '<svg xmlns="http://www.w3.org/2000/svg" height="28px" viewBox="0 -960 960 960" width="28px" fill="#5B5BEF"><path d="M325-111.5q-73-31.5-127.5-86t-86-127.5Q80-398 80-480.5t31.5-155q31.5-72.5 86-127t127.5-86Q398-880 480.5-880t155 31.5q72.5 31.5 127 86t86 127Q880-563 880-480.5T848.5-325q-31.5 73-86 127.5t-127 86Q563-80 480.5-80T325-111.5ZM480-162q26-36 45-75t31-83H404q12 44 31 83t45 75Zm-104-16q-18-33-31.5-68.5T322-320H204q29 50 72.5 87t99.5 55Zm208 0q56-18 99.5-55t72.5-87H638q-9 38-22.5 73.5T584-178ZM170-400h136q-3-20-4.5-39.5T300-480q0-21 1.5-40.5T306-560H170q-5 20-7.5 39.5T160-480q0 21 2.5 40.5T170-400Zm216 0h188q3-20 4.5-39.5T580-480q0-21-1.5-40.5T574-560H386q-3 20-4.5 39.5T380-480q0 21 1.5 40.5T386-400Zm268 0h136q5-20 7.5-39.5T800-480q0-21-2.5-40.5T790-560H654q3 20 4.5 39.5T660-480q0 21-1.5 40.5T654-400Zm-16-240h118q-29-50-72.5-87T584-782q18 33 31.5 68.5T638-640Zm-234 0h152q-12-44-31-83t-45-75q-26 36-45 75t-31 83Zm-200 0h118q9-38 22.5-73.5T376-782q-56 18-99.5 55T204-640Z"/></svg>' };

export const CATEGORY_PLATFORMS = {
  'Music Album':  { label: 'Web Links', platforms: [
    { id: 'spotify',     name: 'Spotify',       searchUrl: q => `https://open.spotify.com/search/${encodeURIComponent(q)}` },
    { id: 'apple',       name: 'Apple Music',   searchUrl: q => `https://music.apple.com/search?term=${encodeURIComponent(q)}` },
    { id: 'youtube',     name: 'YouTube Music', searchUrl: q => `https://music.youtube.com/search?q=${encodeURIComponent(q)}` },
    { id: 'tidal',       name: 'Tidal',         searchUrl: q => `https://listen.tidal.com/search/${encodeURIComponent(q)}` },
    { id: 'soundcloud',  name: 'SoundCloud',    searchUrl: q => `https://soundcloud.com/search?q=${encodeURIComponent(q)}` },
    { id: 'amazon',      name: 'Amazon Music',  searchUrl: q => `https://music.amazon.com/search/${encodeURIComponent(q)}` },
    { id: 'deezer',      name: 'Deezer',        searchUrl: q => `https://www.deezer.com/search/${encodeURIComponent(q)}` },
  ]},
  'Musician':     { label: 'Web Links', platforms: null },
  'Favorite Albums': { label: 'Web Links', platforms: null },
  'Show':         { label: 'Web Links', platforms: [
    { id: 'netflix',     name: 'Netflix',       searchUrl: q => `https://www.netflix.com/search?q=${encodeURIComponent(q)}` },
    { id: 'hulu',        name: 'Hulu',          searchUrl: q => `https://www.hulu.com/search?q=${encodeURIComponent(q)}` },
    { id: 'disney',      name: 'Disney+',       searchUrl: q => `https://www.disneyplus.com/search/${encodeURIComponent(q)}` },
    { id: 'max',         name: 'Max',           searchUrl: q => `https://www.max.com/search?q=${encodeURIComponent(q)}` },
    { id: 'prime',       name: 'Prime Video',   searchUrl: q => `https://www.amazon.com/s?k=${encodeURIComponent(q)}&i=instant-video` },
    { id: 'appletv',     name: 'Apple TV+',     searchUrl: q => `https://tv.apple.com/search?term=${encodeURIComponent(q)}` },
    { id: 'peacock',     name: 'Peacock',       searchUrl: q => `https://www.peacocktv.com/search?q=${encodeURIComponent(q)}` },
    { id: 'paramount',   name: 'Paramount+',    searchUrl: q => `https://www.paramountplus.com/search/${encodeURIComponent(q)}/` },
  ]},
  'Movie':        { label: 'Web Links', platforms: null },
  'Game':         { label: 'Web Links', platforms: [
    { id: 'steam',       name: 'Steam',         searchUrl: q => `https://store.steampowered.com/search/?term=${encodeURIComponent(q)}` },
    { id: 'epic',        name: 'Epic Games',    searchUrl: q => `https://store.epicgames.com/en-US/browse?q=${encodeURIComponent(q)}` },
    { id: 'xbox',        name: 'Xbox',          searchUrl: q => `https://www.xbox.com/en-US/Search/Results?q=${encodeURIComponent(q)}` },
    { id: 'playstation', name: 'PlayStation',   searchUrl: q => `https://store.playstation.com/en-us/search/${encodeURIComponent(q)}` },
    { id: 'nintendo',    name: 'Nintendo',      searchUrl: q => `https://www.nintendo.com/search/#q=${encodeURIComponent(q)}` },
    { id: 'gog',         name: 'GOG',           searchUrl: q => `https://www.gog.com/games?search=${encodeURIComponent(q)}` },
  ]},
  'Book':         { label: 'Web Links', platforms: [
    { id: 'kindle',      name: 'Kindle',        searchUrl: q => `https://www.amazon.com/s?k=${encodeURIComponent(q)}&i=digital-text` },
    { id: 'audible',     name: 'Audible',       searchUrl: q => `https://www.audible.com/search?keywords=${encodeURIComponent(q)}` },
    { id: 'googlebooks', name: 'Google Books',  searchUrl: q => `https://books.google.com/books?q=${encodeURIComponent(q)}` },
    { id: 'applebooks',  name: 'Apple Books',   searchUrl: q => `https://books.apple.com/us/search?term=${encodeURIComponent(q)}` },
    { id: 'libby',       name: 'Libby',         searchUrl: q => `https://libbyapp.com/search/all/search/query-${encodeURIComponent(q)}` },
    { id: 'scribd',      name: 'Scribd',        searchUrl: q => `https://www.scribd.com/search?query=${encodeURIComponent(q)}` },
  ]},
};

// Share platforms between categories that are identical
CATEGORY_PLATFORMS['Musician'].platforms           = CATEGORY_PLATFORMS['Music Album'].platforms;
CATEGORY_PLATFORMS['Favorite Albums'].platforms    = CATEGORY_PLATFORMS['Music Album'].platforms;
CATEGORY_PLATFORMS['Movie'].platforms              = CATEGORY_PLATFORMS['Show'].platforms;

// The default folder (seeded in storage.js) representing a category's "normal" content — a
// top-level tab filters to this folder plus any un-foldered items (see getFilteredSortedItems()
// in render.js), so other subfolders (Videos, Authors, Genres, etc.) stay excluded from the flat
// tab view unless opened directly. Categories with no entry here (Visual Art) are unfiltered.
export const PRIMARY_FOLDER_ID = {
  'Movie': 'default-movies-movies',
  'Show': 'default-shows-shows',
  'Musician': 'default-musicians-musicians',
  'Music Album': 'default-music-albums',
  'Book': 'default-books-books',
  'Web Links': 'default-weblinks-websites',
};

// Path data (viewBox "0 -960 960 960") for the plain folder icon every subfolder falls back to
// unless it has its own entry in FOLDER_ICON below.
export const GENERIC_FOLDER_ICON_PATH = 'M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h240l80 80h320q33 0 56.5 23.5T880-640v400q0 33-23.5 56.5T800-160H160Z';

// Custom icons for specific official/default folders (keyed by the folder's seeded id, see
// storage.js's `defaults` array) — user-created folders always get GENERIC_FOLDER_ICON_PATH.
// { type: 'svg', path } or { type: 'emoji', value }.
export const FOLDER_ICON = {
  'default-movies-videos':      { type: 'svg', path: 'm160-840 80 160h120l-80-160h80l80 160h120l-80-160h80l80 160h120l-80-160h120q33 0 56.5 23.5T880-760v560q0 33-23.5 56.5T800-120H160q-33 0-56.5-23.5T80-200v-560q0-33 23.5-56.5T160-840Zm160 600h320v-22q0-44-44-71t-116-27q-72 0-116 27t-44 71v22Zm216.5-183.5Q560-447 560-480t-23.5-56.5Q513-560 480-560t-56.5 23.5Q400-513 400-480t23.5 56.5Q447-400 480-400t56.5-23.5Z' },
  'default-movies-movies':      { type: 'svg', path: 'M200-320h400L462-500l-92 120-62-80-108 140Zm-40 160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h480q33 0 56.5 23.5T720-720v180l160-160v440L720-420v180q0 33-23.5 56.5T640-160H160Z' },
  'default-shows-podcasts':     { type: 'svg', path: 'M440-80v-331q-18-11-29-28.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 23-11 41t-29 28v331h-80ZM204-190q-57-55-90.5-129.5T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 86-33.5 161T756-190l-56-56q46-44 73-104.5T800-480q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 69 27 129t74 104l-57 57Zm113-113q-35-33-56-78.5T240-480q0-100 70-170t170-70q100 0 170 70t70 170q0 53-21 99t-56 78l-57-57q25-23 39.5-54t14.5-66q0-66-47-113t-113-47q-66 0-113 47t-47 113q0 36 14.5 66.5T374-360l-57 57Z' },
  'default-shows-webseries':    { type: 'svg', path: 'M160-80q-33 0-56.5-23.5T80-160v-400q0-33 23.5-56.5T160-640h640q33 0 56.5 23.5T880-560v400q0 33-23.5 56.5T800-80H160Zm240-120 240-160-240-160v320ZM160-680v-80h640v80H160Zm120-120v-80h400v80H280Z' },
  'default-shows-shows':        { type: 'svg', path: 'm460-380 280-180-280-180v360ZM320-240q-33 0-56.5-23.5T240-320v-480q0-33 23.5-56.5T320-880h480q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H320ZM160-80q-33 0-56.5-23.5T80-160v-560h80v560h560v80H160Z' },
  'default-weblinks-articles':  { type: 'svg', path: 'M123-440q-1-10-1.5-20t-.5-20q0-75 28-140.5t77-114q49-48.5 114-77T480-840q75 0 140.5 28.5t114 77q48.5 48.5 77 114T840-480q0 10-.5 20t-1.5 20h-81q2-10 2.5-20t.5-20q0-10-.5-20t-2.5-20H639q1 10 1 20v40q0 10-1 20h-79v-33q0-12-.5-24t-1.5-23H403q-1 11-1.5 23t-.5 24v33h-79q-1-10-1-20v-40q0-10 1-20H204q-2 10-2.5 20t-.5 20q0 10 .5 20t2.5 20h-81Zm105-160h103q8-43 20-77.5t26-62.5q-48 18-87 54.5T228-600Zm186 0h132q-10-43-25-84t-41-76q-26 35-41.5 76T414-600Zm216 0h103q-23-49-62.5-85.5T583-740q14 30 26.5 63.5T630-600ZM440-120v-40q0-50-35-85t-85-35H80v-80h240q48 0 89.5 21t70.5 59q29-38 70.5-59t89.5-21h240v80H640q-50 0-85 35t-35 85v40h-80Z' },
  'default-weblinks-blogs':     { type: 'svg', path: 'M40-200v-560h80v560H40Zm160 0v-560h80v560h-80Zm240 0q-33 0-56.5-23.5T360-280v-400q0-33 23.5-56.5T440-760h400q33 0 56.5 23.5T920-680v400q0 33-23.5 56.5T840-200H440Zm40-160h320L696-500l-76 100-56-74-84 114Z' },
  'default-weblinks-websites':  { type: 'svg', path: 'M325-111.5q-73-31.5-127.5-86t-86-127.5Q80-398 80-480.5t31.5-155q31.5-72.5 86-127t127.5-86Q398-880 480.5-880t155 31.5q72.5 31.5 127 86t86 127Q880-563 880-480.5T848.5-325q-31.5 73-86 127.5t-127 86Q563-80 480.5-80T325-111.5ZM480-162q26-36 45-75t31-83H404q12 44 31 83t45 75Zm-104-16q-18-33-31.5-68.5T322-320H204q29 50 72.5 87t99.5 55Zm208 0q56-18 99.5-55t72.5-87H638q-9 38-22.5 73.5T584-178ZM170-400h136q-3-20-4.5-39.5T300-480q0-21 1.5-40.5T306-560H170q-5 20-7.5 39.5T160-480q0 21 2.5 40.5T170-400Zm216 0h188q3-20 4.5-39.5T580-480q0-21-1.5-40.5T574-560H386q-3 20-4.5 39.5T380-480q0 21 1.5 40.5T386-400Zm268 0h136q5-20 7.5-39.5T800-480q0-21-2.5-40.5T790-560H654q3 20 4.5 39.5T660-480q0 21-1.5 40.5T654-400Zm-16-240h118q-29-50-72.5-87T584-782q18 33 31.5 68.5T638-640Zm-234 0h152q-12-44-31-83t-45-75q-26 36-45 75t-31 83Zm-200 0h118q9-38 22.5-73.5T376-782q-56 18-99.5 55T204-640Z' },
  'default-weblinks-shops':     { type: 'svg', path: 'M223.5-103.5Q200-127 200-160t23.5-56.5Q247-240 280-240t56.5 23.5Q360-193 360-160t-23.5 56.5Q313-80 280-80t-56.5-23.5Zm400 0Q600-127 600-160t23.5-56.5Q647-240 680-240t56.5 23.5Q760-193 760-160t-23.5 56.5Q713-80 680-80t-56.5-23.5ZM246-720l96 200h280l110-200H246Zm-38-80h590q23 0 35 20.5t1 41.5L692-482q-11 20-29.5 31T622-440H324l-44 80h480v80H280q-45 0-68-39.5t-2-78.5l54-98-144-304H40v-80h130l38 80Zm134 280h280-280Z' },
  'default-books-authors':      { type: 'svg', path: 'M280-600h400v-80H280v80Zm-80 480q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v258q-23-45-66-71.5T680-600q-45 0-84 21t-65 59H280v80h221q-2 20 0 40t9 40H280v80h157q-19 22-28 48.5t-9 55.5v56H200Zm280 0v-56q0-24 12.5-44.5T528-250q36-15 74.5-22.5T680-280q39 0 77.5 7.5T832-250q23 9 35.5 29.5T880-176v56H480Zm129-229q-29-29-29-71t29-71q29-29 71-29t71 29q29 29 29 71t-29 71q-29 29-71 29t-71-29Z' },
  'default-books-books':        { type: 'svg', path: 'M270-80q-45 0-77.5-30.5T160-186v-558q0-38 23.5-68t61.5-38l395-78v640l-379 76q-9 2-15 9.5t-6 16.5q0 11 9 18.5t21 7.5h450v-640h80v720H270Zm10-217 80-16v-478l-80 16v478Z' },
  // Placeholder reusing the app's existing music-note icon — the pasted "Musician" icon came
  // through as corrupted/unreadable text, ask for a clean re-paste to replace this.
  'default-musicians-musicians': { type: 'svg', path: 'M447-207q-47-47-47-113t47-113q47-47 113-47 23 0 42.5 5.5T640-458v-342h240v120H720v360q0 66-47 113t-113 47q-66 0-113-47ZM80-320q0-99 38-186.5T221-659q65-65 152.5-103T560-800v80q-82 0-155 31.5t-127.5 86q-54.5 54.5-86 127T160-320H80Zm160 0q0-66 25.5-124.5t69-102Q378-590 436-615t124-25v80q-100 0-170 70t-70 170h-80Z' },
};

export const STREAMING_DOMAINS = [
  'open.spotify.com', 'spotify.com',
  'music.apple.com',
  'music.youtube.com',
  'tidal.com', 'listen.tidal.com',
  'music.amazon.com',
  'soundcloud.com',
  'deezer.com',
];

// ===== CURATED ITEMS (loaded from Firestore by storage.js) =====
export let CURATED_ITEMS = {};
export function setCuratedItems(data) { CURATED_ITEMS = data; }

// ===== STATE =====
export const state = {
  items: [],
  folders: [],
  authors: [],
  view: 'dashboard', // 'all', category name, folder id, or 'dashboard'/'profile' — this default
                     // only ever applies to a genuinely first-ever load (no saved savecraft_view
                     // yet); any returning session restores wherever it last was, via loadAll()
  authorReturnView: null, // view to restore when leaving an author page via its back button
  sort: 'az',
  search: '',
  modalCategory: null,
  editingId: null,
  collapsed: new Set([...CATEGORIES, 'dashboard']), // all collapsed by default, including the Dashboard row's Queue Kanban link
  sidebarMode: 'categories', // 'categories' | 'curated' | 'home' | 'shared'
  // Which sidebar subfolder was actually clicked while browsing a curated genre — several
  // folders under the same category (e.g. Movie's "Movies" and "Videos") route to the exact
  // same genre:<genre>:<category> view since curated data isn't split into personal-style
  // subfolders, so state.view alone can't tell them apart for highlighting purposes. Not
  // persisted — resets to no-subfolder-highlighted on reload, which is a safe default.
  activeCuratedFolderId: null,
  hiddenCurated: new Set(), // curated item IDs the user has dismissed
  curatedOverrides: {}, // { [curatedItemId]: { url, title, notes, imageUrl } }
  curatedImgCache: {},  // { [curatedItemId]: imageUrl } — auto-fetched via Microlink
  curatedAlbumMetaCache: {}, // { [curatedItemId]: { year, collectionId } } — auto-fetched via iTunes (curated albums have neither field in Firestore)
  albumTrackListCache: {}, // { [collectionId]: { tracks: [{number,title,durationMs}], fetchedAt } } — auto-fetched via iTunes lookup, never expires
  artistWebsiteCache: {}, // { [normalizedArtistName]: { url: string|null, fetchedAt: number } } — auto-fetched via MusicBrainz/Wikidata
  artistBioCache: {}, // { [normalizedArtistName]: { bio: string|null, photoUrl: string|null, fetchedAt: number } } — auto-fetched via Wikipedia
  itemWikiCache: {}, // { [normalizedTitle]: { bio: string|null, photoUrl: string|null, fetchedAt: number } } — auto-fetched via Wikipedia for Book/Show/Movie/Game items
  creatorCache: {}, // { [category:title]: { creator: string|null, fetchedAt: number } } — Movie director/Show creator via Wikidata, Game studio via Steam
  tutorialSeen: false,
  kanbanSort: { 'in-queue': 'newest', 'in-progress': 'newest', 'my-review': 'newest', 'done': 'newest' },
  kanbanLists: [],
  activeListId: null,
  kanbanCategory: null,
  kanbanExpandedCol: null,         // column key currently expanded full-width, or null for the normal 4-column board — not persisted, resets every load
  kanbanExpandedFormat: 'two-col', // 'two-col' | 'four-col' | 'large' | 'detail' | 'simple' — only meaningful while a column is expanded, not persisted
  lastfmUsername: null,            // Last.fm account username the user has linked, or null
  followedCuratedLists: new Set(), // Set of CURATED_GENRES keys the user has opted into via Profile > Interests
  lastfmCache: {}, // { [normalizedUsername]: { tracks: [...]|null, fetchedAt } } — auto-fetched via Last.fm, short TTL
  steamId: null,   // Steam vanity URL or numeric SteamID64 the user has linked, or null
  steamCache: {},  // { [normalizedInput]: { games: [...]|null, fetchedAt } } — auto-fetched via Steam Web API
};
