# Votecraft - Know Your Ballot

An embeddable widget that makes local election information fun and accessible.

## Features

- Enter an address to see what's on your ballot
- Swipeable cards for each race and ballot measure
- Mobile-friendly design
- Works as an embed on any website

## Quick Start

1. Open `index.html` in a browser to see the widget
2. Open `embed.html` to see how it looks embedded

Currently uses mock data for testing. See below to enable real data.

## Enable Real Election Data

1. Go to [Google Cloud Console](https://console.developers.google.com/)
2. Create a new project
3. Enable the **Google Civic Information API**
4. Create an API key (APIs & Services → Credentials)
5. Edit `src/js/civic-api.js`:
   - Replace `'YOUR_API_KEY'` with your actual key
   - Change the last line from `window.CivicAPI = MockCivicAPI` to `window.CivicAPI = CivicAPI`

## Embedding on WordPress/Elementor

1. Host the widget (GitHub Pages, Vercel, or Netlify)
2. In Elementor, add an HTML widget
3. Paste this code:

```html
<iframe
    src="https://your-hosted-url.com/index.html"
    width="100%"
    height="650"
    frameborder="0"
    style="border-radius: 16px; max-width: 480px; display: block; margin: 0 auto;"
></iframe>
```

## Deploy to GitHub Pages

```bash
git add .
git commit -m "Initial Votecraft widget"
git push origin main
```

Then go to your repo Settings → Pages → Deploy from main branch.

Your widget will be live at: `https://lizpasekal1.github.io/Votecraft.org/`

## Project Structure

```
Votecraft.org/
├── index.html          # Main widget
├── embed.html          # Embed preview/example
├── src/
│   ├── css/
│   │   └── styles.css  # Widget styles
│   └── js/
│       ├── civic-api.js # Google Civic API client
│       └── app.js       # Main app logic
└── README.md
```

## Roadmap

- [ ] Add real Google Civic API integration
- [ ] Add more detailed candidate info cards
- [ ] Add "save my ballot" feature
- [ ] Add sharing functionality
- [ ] Add more fun animations
- [ ] Community discussion features
