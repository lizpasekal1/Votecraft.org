// Shared Firebase configuration — project: votecraft-789
// Used by: SaveCraft (Chrome extension), VoteCraft (web), JokeMaster (game),
//          Scavenger Tours, Power Plays, and any future Votecraft.org apps.
//
// Copy these credentials into each app that needs Firebase access.
// Never commit service-account keys here — admin access stays local only.

const firebaseConfig = {
  apiKey:            'AIzaSyArJ6pkXUDbZf4jcxRita0qcdr-hT46kI8',
  authDomain:        'votecraft-789.firebaseapp.com',
  projectId:         'votecraft-789',
  storageBucket:     'votecraft-789.firebasestorage.app',
  messagingSenderId: '939909708303',
  appId:             '1:939909708303:web:b0663ec86e15c05b3a817a',
  measurementId:     'G-NFG76MP9P8',
};

// ---------------------------------------------------------------------------
// Firestore collections map
// ---------------------------------------------------------------------------
//
// Collection          Owner app     Access
// ------------------  ------------  ----------------------------------------
// curated_items       SaveCraft     read — public; write — console/seed only
// curated_genres      SaveCraft     read — public; write — console/seed only
// gameStates          JokeMaster    read/write — authenticated user (own doc)
// jokeVotes           JokeMaster    read/write — authenticated user (own docs)
//
// Auth: Email + Password (votecraft-789 project)
