# Votecraft - Know Your Ballot

An embeddable widget that makes local election information fun and accessible.

## Features

- Enter an address to find your elected representatives
- View federal and state legislators with party affiliation
- See recent bills sponsored by your legislators
- Track voting records on key legislation
- Explore bills by topic (Education, Healthcare, Taxes, etc.)
- Check your ballot for upcoming elections
- View polling locations
- Link to your state's official elections website
- Mobile-friendly responsive design
- PDF export functionality

## Quick Start

### Prerequisites

- Node.js 18+ installed
- npm or yarn

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The development server will start at `http://localhost:3000/Votecraft.org/`

### Code Quality

```bash
# Run ESLint
npm run lint

# Fix ESLint issues
npm run lint:fix

# Format code with Prettier
npm run format
```

## APIs Used

This project integrates with multiple government data APIs:

- **OpenStates API** - State and federal legislator data, bills, and votes
- **Google Civic Information API** - Election and ballot information
- **OpenStreetMap Nominatim** - Address geocoding

## Project Structure

```
Votecraft.org/
├── src/
│   ├── css/
│   │   ├── styles.css        # Main stylesheet
│   │   ├── variables.css     # CSS custom properties
│   │   ├── base.css          # Base/reset styles
│   │   ├── layout.css        # Layout styles
│   │   └── components/       # Component styles
│   └── js/
│       ├── main.js           # Entry point
│       ├── civic-api.js      # API client
│       └── app.js            # Main application
├── index.html                # Main widget
├── embed.html                # Embed documentation
├── package.json              # Dependencies and scripts
├── vite.config.js            # Vite configuration
├── eslint.config.js          # ESLint configuration
└── .prettierrc               # Prettier configuration
```

## Embedding on WordPress/Elementor

1. The widget is deployed to GitHub Pages automatically
2. In Elementor, add an HTML widget
3. Paste this code:

```html
<iframe
    src="https://lizpasekal1.github.io/Votecraft.org/"
    width="100%"
    height="800"
    frameborder="0"
    style="border-radius: 16px; max-width: 1000px; display: block; margin: 0 auto;"
></iframe>
```

## Deployment

The project automatically deploys to GitHub Pages when you push to the main branch.

Live URL: `https://lizpasekal1.github.io/Votecraft.org/`

### Manual Deployment

```bash
# Build the project
npm run build

# The dist/ folder contains the production build
```

## Tech Stack

- **Vite** - Build tool and dev server
- **Vanilla JavaScript** - No framework dependencies
- **Leaflet.js** - Interactive maps
- **ESLint** - Code linting
- **Prettier** - Code formatting

## Roadmap

- [x] State and federal legislator lookup
- [x] Bills sponsored by legislators
- [x] Voting records
- [x] Topic-based bill filtering
- [x] Ballot and election information
- [x] State elections website links
- [ ] Add more detailed candidate info cards
- [ ] Add "save my ballot" feature
- [ ] Add sharing functionality
- [ ] Community discussion features

## License

MIT
