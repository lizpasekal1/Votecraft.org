// ===== ONE-TIME PERSONAL BULK IMPORT — Spotify "Following" list =====
// Built per direct request to add a large batch of artists (transcribed from ~39 scrolled
// screenshots of a Spotify "Following" list, since Spotify doesn't offer an easy export) into the
// signed-in user's own SaveCraft account as real Musician items, plus the one-time follow-up
// cleanup/backfill companions that import turned out to need. Deliberately NOT wired into any UI —
// each function only runs when explicitly called from the browser console while signed into
// savecraft.org; nothing here executes on its own just by loading the app. Once the whole batch
// (import, genre/album backfill, and any bad-entry cleanup) is confirmed done, this file and its
// `import './bulkImportArtists.js';` in main.js should both be deleted — there's no reason to keep
// shipping an ~800-name personal artist list and its one-time scripts to every visitor forever.
//
// Mirrors the real Add-modal's own new-Musician item shape (see handleSaveItem, addEditModal.js)
// and enrichment source (ensureArtistWikipediaInfo, same as kickOffTitleEnrichment uses) rather
// than reimplementing either — this is the same shape/API calls a normal manual save produces,
// just driven headlessly for ~500 names instead of one at a time through the modal. Genre-bucket
// resolution is deliberately NOT duplicated here — backfillMusicianGenres() (authors.js) already
// runs automatically the next time the Music landing page renders and will pick up every new item
// with no genre yet, same as it already does for pre-existing saves.
//
// Dedup, per direct request ("please don't add duplicate artists... i knoow some of the
// screenshots have the same artists"): case-insensitive/trimmed against both (a) this list's own
// entries (the screenshots scroll with heavy overlap between consecutive shots) and (b) every
// Musician already in state.items, so re-running this is always safe/idempotent.

import { state } from './state.js';
import { persistItem, persistArtistGenreCache, removeItem } from './storage.js';
import { ensureArtistWikipediaInfo, isItunesRateLimited } from './api.js';
import { renderSidebar } from './render.js';
import { renderGrid } from './render.js';
import { backfillMusicianGenres } from './authors.js';
import { autoImportMusicianAlbums } from './addEditModal.js';

// Transcribed from the screenshots, in the order they were shared — duplicates (both within this
// list and against already-saved artists) are dropped at import time below, not here, so this
// stays a faithful transcription rather than a hand-deduped one.
const SPOTIFY_FOLLOWING_ARTISTS = [
  'Yaima', 'Yann Tiersen', 'Yeah Yeah Yeahs', 'Yeasayer', 'Yenkee', 'Yoko Ono', 'Yoste',
  'YOU LOVE HER', 'Young Magic', 'Young Thug', 'Yuja Wang', 'Yung Lean', 'Zara Larsson', 'Zaz',
  'Zero 7', 'ZHU', 'ziwe',
  'Wabie', 'Waking Vision', 'The Warlocks', 'The War On Drugs', 'Washed Out', 'Wax Tailor',
  'The Weeknd', 'Welder', 'Wet Leg', 'Weyes Blood', 'What So Not', 'Whethan', 'Whitebear',
  'White Zombie', 'Willie Nelson', 'WILLIS', 'Within Temptation', 'Wizkid', 'Woodkid', 'Woulg',
  'Wu-Tang Clan', 'The xx',
  'Tune-Yards', 'TV Girl', 'TV On The Radio', 'TWICE', 'Tycho', 'Tyla', 'Tyler, The Creator',
  'Ty Segall', 'Ukulele Lovers', 'The Ukulele Orchestra of Great Britain', 'Uma Mohan',
  'Vance Joy', 'Vangelis', 'Van Halen', 'Various Artists', 'Vendredi sur Mer', 'The Ventures',
  'VibeSquaD', 'Vince Guaraldi Trio', 'Vintage Trouble', 'VNV Nation', 'Vybz Kartel',
  'This Is The Kit', 'Thomas Jack', 'Thompson Twins', 'Thrice', 'Thriftworks', 'Thundercat',
  'T.I.', 'Tim Heidecker', 'Tipper', 'TOKiMONSTA', 'Tom Waits', 'TOOL', 'Toro y Moi', 'Tortoise',
  'Townes Van Zandt', 'The Toxic Avenger', 'Traveling North', 'Travis Scott',
  'A Tribe Called Quest', 'Trombone Shorty', 'True Faith', 'Tsunami Bomb',
  'Summer Fling', 'Sun Glitters', 'Surfer Blood', 'Swing Republic', 'Swingrowers', 'Sylvan Esso',
  'System Of A Down', 'Szymon', 'Takénobu', 'Talking Heads', 'Tally Hall', 'Tame Impala',
  'Tape Five', 'Tears For Fears', 'Teebs', 'Teleman', 'The Temper Trap', 'Tep No', 'Tesk',
  'Thelonious Monk', 'Thievery Corporation', 'Thieves Like Us',
  'Soda Island', 'SOFIA ISELLA', 'SOFI TUKKER', 'Solange', 'Sonic Youth', 'Soren', 'Spindrift',
  'Spoon', 'Spoonbill', 'STACEY', 'Static-X', 'Staunch', 'Stereolab', 'Steve Miller Band',
  'Stevie Nicks', 'Stevie Wonder', 'Still Woozy', 'The Stone Foxes', 'The Stooges',
  'Streetlight Manifesto', 'STRFKR', 'Sublab', 'The Submarines',
  'Sex Pistols', 'Seyi Shay', 'Shawn Mendes', 'The Shins', 'Shlohmo', 'Sickick', 'Silk Rhodes',
  'The Simpsons', 'Sixis', 'SkiiTour', 'The Slackers', 'Slayer', 'Sleater-Kinney', 'Sleep',
  'Sleigh Bells', 'The Slits', 'Slow Magic', 'The Smile', 'The Smiths',
  'Smokey Robinson & The Miracles', 'Snail Mail', 'Soccer Mommy',
  'Quintron', 'Rachel K Collier', 'Radiohead', 'Rage Against The Machine',
  'Rainbow Kitten Surprise', 'Rammstein', 'Ramones', 'RamonPang', 'Ramsey', 'Ramsey Lewis',
  'Rancid', 'Random Rab', 'Randy Bachman', 'Ra Ra Riot', 'Raspberry Pie', 'Ray Conniff', 'RAYE',
  'Real Estate', 'Reggie Watts', 'Rehab', 'Richard Barbieri', 'Richy Mitch & The Coal Miners',
  'Rihanna', 'Rilo Kiley',
  'Rising Appalachia', 'RJD2', 'Robert Johnson', 'Robin Thicke', 'Rob Zombie', 'Roosevelt',
  'Rory Fresco', 'Roy Cousins and the Royals', 'Röyksopp', 'RS_TTYL', 'Rubblebucket', 'Ruger',
  'Run DMT', 'Russ Liquid', 'Sabaton', 'Saib', 'Sam Cooke', 'Sammy Rae & The Friends', 'San Holo',
  'Sepultura', 'Seven Lions',
  'Pantera', 'Pantyraid', 'Papadosio', 'Paperhaus', 'Paris Combo', 'Parov Stelar', 'Passion Pit',
  'Pat Benatar', 'Pat Metheny', 'Paul Simon', 'Paul Whiteman', "Payin' Top Dolla", 'Pearl Jam',
  'People Under The Stairs', 'A Perfect Circle', 'Perfume Genius', 'Perturbator', 'Pete Yorn',
  'Pet Shop Boys', 'Phantogram', 'Pharrell Williams', 'Phlocalyst',
  'Photay', 'Phutureprimitive', 'Pilgrims of Yearning', 'The Platters', 'pluko', 'The Pogues',
  'The Polish Ambassador', 'The Polyphonic Spree', 'Popcaan', 'Portugal. The Man',
  'Pretty Girls Make Graves', 'Pretty Lights', 'Primus', 'Prince', 'Princess Nokia',
  'The Prodigy', 'Propellerheads', 'Psychic TV', 'Psymbionic', 'PUP', 'Purity Ring',
  'Pussy Riot', 'Queens of the Stone Age',
  'ODESZA', 'Of Monsters and Men', 'of Montreal', 'Ola Szmidt', 'Olga Kern', 'Olivia Ruiz',
  'OMAH LAY', 'Ooah', 'Opiuo', 'Orgy', 'Orion Sun', 'Orville Peck', 'Otis Redding', 'Ott',
  'Outkast', 'Overseer', 'OVERWERK', 'Owl Vision', 'Pablo Moses', 'PAINT', 'Palaye Royale',
  'Panic! At The Disco',
  'Neil Young', 'Neon Indian', 'Neutral Milk Hotel', 'NF', 'Nick Cave', 'Nightmares On Wax',
  'Nightwish', 'Nina Simone', 'Nine Inch Nails', 'Ninja Sex Party', 'Noah Kahan', 'No Doubt',
  'NOFX', 'NoMBe', 'Noname', 'N.O.R.E.', 'Nosaj Thing', 'noturgf', 'Novo Amor', 'Nujabes',
  'O.A.R.',
  'Moondog', 'Moon Hooch', 'Mophono', 'Morgan Sorne', 'Morningsiders', 'Mort Garson',
  'Mötley Crüe', 'Mouldy Soul', 'Mount Kimbie', "The Mowgli's", 'Mr. Bill', 'Ms. Lauryn Hill',
  'múm', 'Muse', 'MWALIM DaPhunkee Professor', 'my bloody valentine',
  'Nahko And Medicine For The People', 'Nascent', 'Natasza Zylska', 'Nat King Cole', 'Neat Beats',
  'Nehruviandoom', 'The Neighborhood Kids',
  'M.I.A.', 'MicrOpaqu3', 'Miike Snow', 'Mika Miko', 'Mildlife', 'Miles Davis', 'MiM0SA',
  'Mindchatter', 'Mindless Self Indulgence', 'Miriam Makeba', 'Misfits', 'Missy Elliott',
  'Mitch Hedberg', 'Mitski', 'MØ', 'Moby', 'Mochipet', 'Model Man', 'Moderat', 'Modeselektor',
  'Modest Mouse', 'Monster Rally',
  'Lyle Mays', 'Machinedrum', 'Macy Gray', 'Madelline', 'The Magnetic Fields', 'Major Lazer',
  'Maneesh de Moor', 'Man Man', 'Ma Rainey', 'Marilyn Manson', 'MARINA', 'Maroon 5',
  'The Mars Volta', 'Masakatsu Takagi', 'Massive Attack', 'Mavado', 'McCafferty', 'Medasin',
  'Melanie Martinez', 'Men I Trust', 'Meshuggah', 'Mew', 'MF DOOM',
  'Lily Allen', 'Lindsay Lou', 'Lindstrøm', 'LION BABE', 'Little Billy Lost', 'Little Dragon',
  'Little People', 'The Living Tombstone', 'Lizzo', 'LoBounce', 'Local Natives',
  'The London Souls', 'Lord Huron', 'Lordi', 'Lotus', 'Louise Dowd', 'The Lovemongers',
  "The Lovin' Spoonful", 'LUNAX', 'Lusine', 'Lyle Lovett',
  'Kronos Quartet', 'Kurt Vile', 'KX CHR', 'Kygo', 'Kyle McEvoy', 'Kyuss', 'Ladji Mouflet',
  'Lake Street Dive', 'Laura Mvula', 'Lawrence', 'LCD Soundsystem', 'Left Spine Down', 'Lemaitre',
  'Lennon & Maisy', 'Leo Sayer', 'Les Claypool', 'Le Tigre', 'Lettuce', 'Liana Flores',
  'Lianne La Havas', 'The Lijadu Sisters', 'Lila Downs', 'Lil Dicky',
  'The Kinks', 'Kittie', 'Klaypex', 'kLL sMTH', 'KNOWER', 'KOAN Sound', 'Koda', 'Kodomo',
  'The Kooks', 'KOOL A.D.', 'Kool & The Gang', 'Kormac', 'Kraddy', 'Kraftwerk', 'Kristoff Krane',
  'Junglepussy', 'Junior Murvin', 'Jupe', 'Kae Tempest', 'Kalya Scintilla', 'Kaminanda',
  'Kanye West', 'KARD', 'Kasbo', 'Kate Bush', 'Kavinsky', 'KAYTRANADA', 'Kendrick Lamar',
  'Kenya Grace', 'Keys N Krates', 'Khruangbin', 'Kim Dracula', 'King Crimson', 'King Iso',
  'King Krule', 'Kings of Leon',
  'Jazzinuf', 'JC Brooks & The Uptown Sound', 'J Dilla', 'Jedi Mind Tricks', 'Jerry Lee Lewis',
  'Jesper Kyd', 'Jethro Tull', 'Jhené Aiko', 'Jim Croce', 'Jim Jefferies', 'Jockstrap',
  'Joe Sample', 'Johannes Brahms', 'John The Conqueror', 'Joji', 'Jonathan Coulton',
  'Jorja Smith', 'José González', 'Joy Division', 'Jucamav', 'Jukebox The Ghost', 'Julien Baker',
  'Jungle',
  'The HU', 'Hundred Waters', 'Hypnagog', 'Iggy Pop', 'Illangelo', 'ill-esha', 'ill.gates',
  'Imagination Audio Books', "I'm From Barcelona", 'Immortal Technique', 'Interpol', 'Ishawna',
  'Jackie Wilson', 'Jaco Pastorius', 'Jacuzzi Boys', 'Jades Goudreault', 'Jagwar Ma', 'Jai Wolf',
  'James Bird', 'James Mercer', 'Janelle Monáe', "Jane's Addiction",
  'Gone Gone Beyond', 'Gorgon City', 'Gorillaz', 'Gramatik', 'Grandmaster Melle Mel',
  'Greta Van Fleet', 'Grimes', 'Gringo Star', 'GRiZ', 'Grizzly Bear', 'Groundislava', 'HABITAAT',
  'Halsey', 'Handsome Boy Modeling School', 'Haunt', 'Hawkwind', 'HEALTH', 'Heart',
  'Herbie Hancock', 'Hip Songs 4 Learning', 'Hole', 'How Great Were the Robins',
  'Future Islands', 'Galactic', 'Galantis', 'Galaxie 500', 'Garbage', 'Gareth Emery', 'Garoad',
  'Gaussian Curve', 'George Gershwin', 'Geotic', 'Gerry Rafferty', 'Ghostemane',
  'Ghostland Observatory', 'Glasfabrik', 'Glass Animals', 'Glenn Miller', 'The Glitch Mob',
  'The Glitter Boys', 'Gnarls Barkley', 'Godspeed You! Black Emperor', 'GoldLink', 'Gold Panda',
  'FKJ', 'The Flaming Lips', 'The Flashbulb', 'FLEECE', 'Fleet Foxes', 'Fleetwood Mac',
  'Flight of the Conchords', 'Flogging Molly', 'Florence + The Machine', 'Flume', 'Flux Pavilion',
  'Flying Lotus', 'Forest Swords', 'Fossil Youth', 'Frank Ocean', 'Franz Schubert',
  'The Fratellis', 'Freddy Todd', 'Free the Robots', 'Front Line Assembly', 'Fumaratto',
  'Funkadelic',
  'Else', 'Elton John', 'Emaciator', 'Emancipator', 'Emiliana Torrini', 'Emmylou Harris',
  'Emotional Oranges', 'Empire Of The Sun', 'Emre Kabak', 'EOTO', 'Eprom', 'Erik Satie',
  'Erykah Badu', 'Esperanza Spalding', 'Eternal Classic Audio Books', 'Evil Needle',
  'Faith No More', 'Fantastic Negrito', 'Father John Misty', 'Faun', 'Felix Mendelssohn',
  'Fifth Harmony', 'Filter',
  'Dr. Dre', 'Dream Theater', 'Dredg', 'Dresage', 'Dr. Octagon', 'DROELOE', 'Drugdealer',
  'Dua Lipa', 'Dubmood', 'Dubvirus', 'Duke Ellington', 'Durand Bernarr', 'Eagles',
  'Earth, Wind & Fire', 'Edan', 'edIT', 'Ekali', 'Electric Light Orchestra',
  'The Electric Swing Circus', 'Electrocado', 'Elephant Revival', 'Eligh', 'Eloise',
  'Demeter', 'Dennis Lloyd', 'Department Of Eagles', 'Depeche Mode', 'Devendra Banhart',
  'The Devil Makes Three', 'DEVO', 'Diamond Saints', 'Digitalism', 'Dimond Saints', 'Diplo',
  'DIR EN GREY', 'Dirtwire', 'Dirty Honkers', 'Dirty Projectors', 'Disturbed', 'ditto',
  'Django Django', 'Django Reinhardt', 'DJ Shadow', 'Donna Summer', 'Drake', 'Dr. Dog',
  'Das Racist', 'Dave McCabe', 'David Bowie', 'David Gilmour', 'David Guetta', 'David Zinman',
  'Dead Kennedys', 'Dead Meadow', 'Dead Prez', 'Deca', 'The Delta Saints', 'Deltron 3030',
  'Dem Atlas',
  'Coconut Records', 'CocoRosie', 'Computer Kill', 'Count Basie', 'Creedence Clearwater Revival',
  'Crooked Colours', 'Crooked Still', 'Crumb', 'Crystal Castles', 'The Crystal Method', 'Cujo',
  'CunninLynguists', 'Cure for Paranoia', 'Cut Copy', 'Cynthia Lin', 'Daedelus', 'Daft Punk',
  'Daisychain', 'Dan Deacon', 'Dan Farber', 'Danny Jonokuchi & The Revisionists',
  'Daryl Hall & John Oates',
  'Charles Mingus', 'Charlie Parker', 'Charli xcx', 'The Chemical Brothers', 'Che Sudaka',
  'Chet Baker', 'Childish Gambino', 'Chill Bump', 'Chinese Man', 'Chong the Nomad', 'Chromatics',
  'Chrome', 'Chromeo', 'Chrome Sparks', 'Chuck Berry', 'Circuit Bent', 'CKay', 'Clairo',
  'The Clash', 'Client Liaison', 'CloZee', 'Clutch', 'The Coathangers',
  'Bruce Haack', 'Bruce Springsteen', 'Bumble', 'Burial', 'Buzzcocks', 'C2C', 'Cage The Elephant',
  'Cailin Russo', 'CAKE', 'Calvin Harris', 'Cannons', 'Capital Cities', 'Caravan Palace',
  'Car Bomb', 'Carla Bruni', 'Carole King', 'Cashmere Cat', 'Cat Power', 'Cayetana', 'Cello Joe',
  'Cerebral Desecration', 'Chance the Rapper',
  'Blackalicious', 'Blackbird Blackbird', 'Black Flag', 'Black Moth Super Rainbow', 'BLACKPINK',
  'The Blank Tapes', 'Blood on Guitars', 'Blue Foundation', 'Bluetech', 'Bluewerks',
  'Boards of Canada', 'Bodikhuu', 'Bon Iver', 'Bonobo', 'BØRNS', 'Boston Cream',
  'The Boswell Sisters', 'boygenius', 'Boztown', 'The Brian Jonestown Massacre', 'Broken Bells',
  'Broken Social Scene',
  'Balam Acab', 'Bardcore', 'Bassnectar', 'Baths', 'Bauer Audio Books', 'The Beatles',
  'Beats Antique', 'Belle and Sebastian', 'BENNETT', 'Bequem', 'Berlin', 'Bernie Sanders',
  'Betty Davis', 'Between The Buried And Me', 'Bibio', 'The Big Moon', 'Big Thief', 'Big Wild',
  'Bikini Kill', 'Billy Lemos', 'Bing Crosby', 'the bird and the bee',
  'Arch Enemy', 'Arctic Monkeys', 'Aretha Franklin', 'Aries', 'Arjun Bruggeman',
  'Arms and Sleepers', 'Art Tatum', 'Asake', 'Ásgeir', 'Asking Alexandria', 'Astrud Gilberto',
  'AURORA', 'Autograf', 'Avalonia', 'Avenged Sevenfold', 'Axian', 'Ayra Starr',
  'Babes In Toyland', 'BADBADNOTGOOD', 'BAD NINJA', 'Bad Religion', 'Bakermat',
  'Andrew Huang', 'The Andrews Sisters', 'Andy Shauf', 'ANIMA!', 'Anitta', 'An-Ten-Nae',
  'Antônio Carlos Jobim', 'Antonio Vivaldi', 'Anúna', 'Anyma', 'Aphex Twin', 'Arcade Fire',
  '100 gecs', '3TEETH', 'ABSRDST', 'Aesop Rock', 'Aether', 'Agent Fresco', 'Agnes Obel', 'Air',
  'Aldous Harding', 'Alestorm', 'Alice Glass', 'Alice Phoebe Lou', 'Alina Baraz', 'alt-J',
  'Amaranthe', 'Amelia Day', 'Amon Tobin', 'Amy Winehouse', 'Anderson .Paak', 'André 3000',
  'Andreilien', 'Andrew Bird',
  // Final screenshot — a differently-sorted (non-alphabetical) view of the same Following list,
  // included for completeness; every name here is also expected to already appear above.
  'Deca', 'Richy Mitch & The Coal Miners', 'Astrud Gilberto', 'Eagles', 'Panic! At The Disco',
  'Aesop Rock', 'Stevie Wonder', 'Donna Summer', 'Kool & The Gang', 'Earth, Wind & Fire',
  'Father John Misty', 'Computer Kill', 'Arcade Fire', 'BLACKPINK', 'Eloise', 'Cure for Paranoia',
  'Noah Kahan', 'HABITAAT', 'Jucamav', 'Jaco Pastorius', 'Streetlight Manifesto',
];

export async function bulkImportMyArtists() {
  const seen = new Set();
  const uniqueNames = [];
  for (const raw of SPOTIFY_FOLLOWING_ARTISTS) {
    const name = raw.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueNames.push(name);
  }

  const existingTitles = new Set(
    state.items.filter(i => i.category === 'Musician').map(i => (i.title || '').trim().toLowerCase())
  );
  const toAdd = uniqueNames.filter(name => !existingTitles.has(name.toLowerCase()));
  const skippedAlreadySaved = uniqueNames.length - toAdd.length;

  console.log(`[bulkImportMyArtists] ${SPOTIFY_FOLLOWING_ARTISTS.length} transcribed, ${uniqueNames.length} unique, ${skippedAlreadySaved} already in your library, importing ${toAdd.length}...`);

  let idCounter = 0;
  for (let i = 0; i < toAdd.length; i++) {
    const title = toAdd[i];
    let bio = null, photoUrl = null;
    try {
      const info = await ensureArtistWikipediaInfo(title);
      bio = info?.bio || null;
      photoUrl = info?.photoUrl || null;
    } catch { /* best-effort enrichment only — a lookup miss shouldn't block the save */ }

    const item = {
      id: `${Date.now()}_${idCounter++}`, url: null, title, author: null, summary: bio,
      imageUrl: photoUrl, youtubeUrl: null, description: null,
      category: 'Musician', folderId: null, platforms: [], done: false,
      savedAt: Date.now(), favorite: true, savedListIds: [],
    };
    state.items.push(item);
    await persistItem(item);
    console.log(`[bulkImportMyArtists] ${i + 1}/${toAdd.length} added: ${title}`);
  }

  renderSidebar();
  renderGrid();
  console.log(`[bulkImportMyArtists] Done. Added ${toAdd.length}, skipped ${skippedAlreadySaved} already-saved duplicates. Genre buckets will fill in automatically next time you open the Music landing page.`);
  return { added: toAdd.length, skippedAlreadySaved };
}

// One-time companion fixup, per the ensureArtistGenre bug found and fixed alongside this file
// (api.js) — a burst this large hit iTunes rate-limiting for a real fraction of the ~800 lookups,
// and the old code cached those transient failures identically to a genuine "no genre data"
// result for 90 days. The fix stops that going forward, but doesn't retroactively clear whatever
// got wrongly cached during THIS import's own burst — this does that one-time clear, then kicks
// off a fresh backfill pass immediately so every musician gets a real second attempt under the
// corrected logic instead of silently reading back the same stuck miss.
export function resetArtistGenreCache() {
  const count = Object.keys(state.artistGenreCache).length;
  state.artistGenreCache = {};
  persistArtistGenreCache();
  console.log(`[resetArtistGenreCache] Cleared ${count} cached genre lookups (hits and misses alike). Starting a fresh backfill pass...`);
  backfillMusicianGenres();
}

// One-time companion for the bulk import above, per direct follow-up ("i am not seeing their
// albums coming in") — bulkImportMyArtists() deliberately skipped autoImportMusicianAlbums()
// (addEditModal.js, exported for reuse here) at import time, since ~800 extra iTunes calls on top
// of the genre lookups was too much for one burst. This runs it for every saved Musician
// separately, paced 3 seconds apart — Apple doesn't publish an official rate limit for this
// endpoint, but the commonly-reported unofficial threshold other developers hit is roughly ~20
// requests/minute per IP; this session's first attempt at 600ms (~100/min) tripped the breaker
// almost immediately, well above that. Only processes artists with zero Music Album items of
// their own yet — autoImportMusicianAlbums() already dedupes against existing album titles, but
// skipping here too means re-running this after a rate-limit stop doesn't waste calls re-checking
// artists already done, it just picks up where it left off.
export async function bulkImportAlbumsForMyArtists() {
  const albumAuthors = new Set(
    state.items.filter(i => i.category === 'Music Album' && i.author).map(i => i.author.trim().toLowerCase())
  );
  const musicianItems = state.items.filter(i => i.category === 'Musician' && !albumAuthors.has((i.title || '').trim().toLowerCase()));
  console.log(`[bulkImportAlbumsForMyArtists] Importing albums for ${musicianItems.length} musicians with none yet...`);

  let processed = 0;
  for (const item of musicianItems) {
    if (isItunesRateLimited()) {
      console.log(`[bulkImportAlbumsForMyArtists] Stopped after ${processed}/${musicianItems.length} — iTunes is rate-limiting this browser right now. Wait a few minutes and run this again; it'll pick up right where it left off.`);
      return { processed, total: musicianItems.length, stoppedEarly: true };
    }
    await autoImportMusicianAlbums(item);
    processed++;
    if (processed % 10 === 0) console.log(`[bulkImportAlbumsForMyArtists] ${processed}/${musicianItems.length}...`);
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  console.log(`[bulkImportAlbumsForMyArtists] Done — processed all ${processed} musicians.`);
  return { processed, total: musicianItems.length, stoppedEarly: false };
}

// Companion cleanup for the bulk import above — per direct report, a handful of the transcribed
// screenshot rows turned out to be song titles rather than artist names (an OCR/transcription slip
// against the real Spotify "Following" list, which only ever lists artists), and came in as
// ordinary Musician items indistinguishable from a real save. Takes a list of exact titles (case-
// insensitive, trimmed) and removes each matching Musician item — same removeItem() + state.items
// splice the card grid's own delete button uses (renderGrid.js), just batched for a one-time
// console cleanup instead of clicking delete on each one individually.
export async function removeMusicianItemsByTitle(titles) {
  const wanted = new Set(titles.map(t => t.trim().toLowerCase()));
  const toRemove = state.items.filter(i => i.category === 'Musician' && wanted.has((i.title || '').trim().toLowerCase()));
  const foundKeys = new Set(toRemove.map(i => (i.title || '').trim().toLowerCase()));
  const notFound = [...wanted].filter(t => !foundKeys.has(t));
  if (notFound.length) console.log(`[removeMusicianItemsByTitle] Not found (already removed, or a typo?): ${notFound.join(', ')}`);

  for (const item of toRemove) {
    await removeItem(item.id);
    console.log(`[removeMusicianItemsByTitle] Removed: ${item.title}`);
  }
  state.items = state.items.filter(i => !toRemove.includes(i));

  renderSidebar();
  renderGrid();
  console.log(`[removeMusicianItemsByTitle] Done. Removed ${toRemove.length}/${titles.length} requested.`);
  return { removed: toRemove.length, notFound };
}

if (typeof window !== 'undefined') {
  window.bulkImportMyArtists = bulkImportMyArtists;
  window.resetArtistGenreCache = resetArtistGenreCache;
  window.bulkImportAlbumsForMyArtists = bulkImportAlbumsForMyArtists;
  window.removeMusicianItemsByTitle = removeMusicianItemsByTitle;
}
