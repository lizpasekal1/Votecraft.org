# Joke Master

A narrative card game where you play as Rain, an idealistic changemaker seeking funding for a world-changing project. Use humor and wit to win over potential funders across global cities!

## Play the Game

[Play Joke Master](https://lizpasekal1.github.io/jokemaster/)

## How to Play

- Navigate the city map by tapping walkable spaces
- Approach characters to start conversations
- Choose joke cards strategically based on each character's preferences
- Build favor to secure funding for your project
- Collect laugh energy and recruit comedians to enhance your abilities
- Discover artifacts in different cities
- Scale your impact across 200+ contacts worldwide

## Features

- **Strategic Card System** - Choose jokes based on character preferences
- **Global City Network** - Travel between cities to meet diverse contacts
- **Dynamic Favor System** - Build relationships through humor
- **Laugh Energy Mechanic** - Renewable resource gained from successful jokes
- **Comedian Recruitment** - Unlock passive bonuses for different joke types
- **Artifact Collection** - Discover special items that enhance gameplay
- **Interactive Globe View** - D3.js-powered world visualization
- **Responsive Design** - Optimized for mobile and desktop
- **PWA Support** - Install as app on mobile devices
- **Firebase Integration** - Cloud save and cross-device sync

## Project Structure

```
jokemaster/
├── index.html                   # Entry point (redirects to goal.html)
├── manifest.json                # PWA manifest for mobile installation
│
├── Documentation/
│   ├── README.md                # This file - project overview
│   ├── GAME_MECHANICS.md        # Complete game mechanics documentation
│   ├── STORY_DESIGN.md          # Narrative framework and story structure
│   └── TEMPLATING_GUIDE.md      # Developer guide for scaling to 200+ contacts
│
├── src/
│   ├── pages/                   # HTML pages
│   │   ├── goal.html            # Project selection and game intro
│   │   ├── contacts.html        # Contacts management by city
│   │   ├── globe.html           # Interactive 3D globe view
│   │   ├── jokemaster.html      # Main game page (flat map)
│   │   ├── your-jokes.html      # Joke collection and voting
│   │   └── bank.html            # Comedy arsenal (energy, comedians, artifacts)
│   │
│   ├── scripts/                 # JavaScript modules
│   │   ├── data.js              # Centralized game data (cities, contacts, jokes, etc.)
│   │   ├── templates.js         # Reusable UI component templates
│   │   ├── game.js              # Core game logic and state management
│   │   ├── contacts.js          # Contacts page functionality
│   │   ├── globe.js             # Globe visualization with D3.js
│   │   ├── goal.js              # Project selection logic
│   │   ├── bank.js              # Arsenal management (comedians/artifacts)
│   │   ├── your-jokes.js        # Joke voting and collection
│   │   ├── icons.js             # Footer navigation icons
│   │   ├── firebase-config.js   # Firebase configuration
│   │   └── database.js          # Firestore database helpers
│   │
│   └── styles/                  # CSS stylesheets
│       ├── styles.css           # Global styles and CSS variables
│       ├── contacts-styles.css  # Contacts page styles
│       ├── globe.css            # Globe view styles
│       ├── goal-styles.css      # Project/goal page styles
│       ├── bank.css             # Arsenal/bank page styles
│       ├── your-jokes-styles.css # Jokes page styles
│       └── icons.css            # Navigation icon styles
│
└── images/                      # Static assets
    ├── characters/              # Character portraits (PNG)
    ├── icon-192.png             # PWA icon 192x192
    ├── icon-512.png             # PWA icon 512x512
    └── jokemaster-map_2.jpg     # Map background image
```

## Tech Stack

### Frontend
- **Pure JavaScript (ES6+)** - No framework dependencies
- **HTML5 & CSS3** - Modern web standards
- **Template System** - Custom templating for scalability
- **D3.js** - Globe visualization and data binding
- **TopoJSON** - Geographic data for globe

### Backend & Services
- **Firebase Firestore** - Cloud database for game state
- **Firebase Auth** - Anonymous user authentication
- **PWA Manifest** - Progressive Web App support
- **LocalStorage** - Local fallback for game state

### Design System
- **Vintage Parchment Aesthetic** - Sepia tones and classic typography
- **Cinzel & Crimson Text Fonts** - Google Fonts
- **Material Design Icons** - SVG icons for navigation
- **Responsive Layout** - Mobile-first with clamp() for fluid typography
- **Teal & Burgundy Palette** - Distinctive color scheme

## Development

### Run Locally
```bash
# Clone the repository
git clone https://github.com/lizpasekal1/jokemaster.git
cd jokemaster

# Open in browser (no build process required)
open index.html
# or simply drag index.html into your browser
```

### Adding Content
See [TEMPLATING_GUIDE.md](TEMPLATING_GUIDE.md) for detailed instructions on:
- Adding new cities and contacts
- Creating jokes and artifacts
- Recruiting comedians
- Scaling to 200+ contacts

### Game Design
See [GAME_MECHANICS.md](GAME_MECHANICS.md) for complete documentation on:
- Core game systems
- Laugh Energy mechanics
- Comedian recruitment
- Artifact collection
- Project goals

### Narrative Design
See [STORY_DESIGN.md](STORY_DESIGN.md) for the narrative framework:
- Rain's journey structure
- Four project types
- Story integration
- Avoiding heavy-handed messaging

## Deployment Options

### Current: GitHub Pages (Web)
Already deployed at: https://lizpasekal1.github.io/jokemaster/

### Future: Desktop (Steam)
Use Electron to package for Windows/Mac/Linux:
```bash
npm install electron
# Build with electron-builder
```

### Future: Mobile (iOS/Android)
Use Capacitor to package for app stores:
```bash
npm install @capacitor/core @capacitor/ios @capacitor/android
npx cap init
npx cap add ios
npx cap add android
```

## Browser Support

- ✅ Chrome/Edge (Chromium) - Recommended
- ✅ Safari (iOS/macOS) - Full support
- ✅ Firefox - Full support
- ✅ Mobile browsers - Optimized with PWA support

## License

All rights reserved.

---

**Version:** 1.0
**Last Updated:** December 26, 2024
**Status:** Active Development

🤖 Built with assistance from [Claude Code](https://claude.com/claude-code)
