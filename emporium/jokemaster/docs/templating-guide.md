# JokeMaster Templating System Guide

## Overview

This guide explains how to use the new templating system for efficiently scaling JokeMaster to support 200+ contacts and many cities.

## Architecture

### Key Files

1. **`src/scripts/data.js`** - Centralized data store
   - Contains all cities, contacts, jokes, comedians, and artifacts
   - Single source of truth for game content
   - Easy to expand with new content

2. **`src/scripts/templates.js`** - Reusable UI templates
   - Template functions for all UI components
   - Consistent styling and structure
   - Easy to maintain and update

## How It Works

### 1. Data Structure (data.js)

All game data is organized in the `GameData` object:

```javascript
const GameData = {
    cities: {
        'London': {
            id: 'london',
            emoji: '🇬🇧',
            country: 'United Kingdom',
            contacts: [ /* array of contacts */ ]
        },
        // ... more cities
    },
    comedians: [ /* array of comedians */ ],
    artifacts: [ /* array of artifacts */ ],
    jokes: [ /* array of jokes */ ]
};
```

### 2. Templates (templates.js)

Templates are functions that return HTML strings:

```javascript
const Templates = {
    contactCard: (contact) => `<div class="contact-card">...</div>`,
    cityItem: (city) => `<div class="city-item">...</div>`,
    // ... more templates
};
```

### 3. Usage Example

Here's how to use the system in your page scripts:

```javascript
// Get data from centralized store
const london = GameData.cities['London'];

// Generate HTML using templates
const contactsHTML = london.contacts
    .map(contact => Templates.contactCard(contact))
    .join('');

// Insert into DOM
document.getElementById('contactsList').innerHTML = contactsHTML;
```

## Adding New Content

### Adding a New City

Edit `src/scripts/data.js`:

```javascript
GameData.cities['Berlin'] = {
    id: 'berlin',
    emoji: '🇩🇪',
    country: 'Germany',
    latitude: 52.5,
    longitude: 13.4,
    locked: true,  // or false if unlocked
    contacts: [
        {
            id: 'unique-id',
            name: "Contact Name",
            portrait: "🎨",
            role: "Artist",
            location: "Berlin, Germany",
            details: "Short description",
            completed: false
        }
        // ... more contacts
    ]
};
```

### Adding a New Contact

Simply add to the `contacts` array within a city:

```javascript
{
    id: 'contact-id',  // unique identifier
    name: "Full Name",
    portrait: "🎭",  // emoji or icon
    role: "Job Title",
    location: "City, Country",
    details: "Brief description",
    completed: false,
    // Optional: for completed interactions
    bio: "Longer biography text...",
    interaction: "Story of how you met...",
    jokeTypes: ["Type1", "Type2"],
    funding: 5000,
    referralMessage: "Who they refer you to..."
}
```

### Adding a New Comedian

```javascript
GameData.comedians.push({
    id: 'unique-id',
    name: "Comedian Name",
    emoji: "🎤",
    style: "Comedy Style",
    location: "City Name",
    description: "What makes them special",
    bonus: {
        type: "tag_boost",
        tags: ["tag1", "tag2"],
        boost: 5
    },
    cost: 2,  // Laugh Energy cost
    recruited: false,
    locked: false  // or true
});
```

### Adding a New Artifact

```javascript
GameData.artifacts.push({
    id: 'unique-id',
    name: "Artifact Name",
    emoji: "🎭",
    description: "Flavor text",
    effect: "What it does (user-friendly text)",
    rarity: "common",  // or "uncommon", "rare"
    location: "City Name",
    found: false,
    locked: false
});
```

### Adding a New Joke

```javascript
GameData.jokes.push({
    id: 9,  // unique number
    text: "The joke text goes here...",
    tags: ["tag1", "tag2", "tag3"],
    energyCost: 2,
    appeal: "Medium"  // "Safe", "Medium", or "Risky"
});
```

## Template Customization

### Modifying a Template

Edit `src/scripts/templates.js`:

```javascript
Templates.contactCard = (contact) => `
    <div class="contact-card ${contact.completed ? 'completed' : ''}">
        <div class="contact-portrait">${contact.portrait}</div>
        <div class="contact-info">
            <div class="contact-name">${contact.name}</div>
            <div class="contact-role">${contact.role}</div>
            <!-- Add new elements here -->
        </div>
    </div>
`;
```

### Creating a New Template

Add to the `Templates` object:

```javascript
Templates.newComponent = (data) => `
    <div class="new-component">
        <h3>${data.title}</h3>
        <p>${data.description}</p>
    </div>
`;
```

## Helper Functions

The `GameData` object includes helper functions:

```javascript
// Get a city by ID
const city = GameData.getCityById('london');

// Get a contact by ID (searches all cities)
const contact = GameData.getContactById('marcus-chen');

// Get a comedian by ID
const comedian = GameData.getComedianById('robin');

// Get an artifact by ID
const artifact = GameData.getArtifactById('fake_mustache');

// Get a joke by ID
const joke = GameData.getJokeById(1);
```

## Best Practices

### 1. Data Separation
- Keep data in `data.js`
- Keep templates in `templates.js`
- Keep logic in page-specific `.js` files

### 2. Consistent IDs
- Use kebab-case for IDs: `'marcus-chen'`, `'new-york'`
- Keep IDs unique across the entire game
- Use descriptive names

### 3. Template Conventions
- Always escape user data (though we control all data in this game)
- Use template literals for multi-line HTML
- Keep templates focused on presentation

### 4. Performance
- Use `.map().join('')` instead of string concatenation in loops
- Consider pagination for very long lists (50+ items)
- Lazy-load images if needed

## Integration Checklist

When adding the templating system to a new page:

1. **Add script tags to HTML:**
   ```html
   <script src="../scripts/data.js"></script>
   <script src="../scripts/templates.js"></script>
   ```

2. **Use templates in page script:**
   ```javascript
   // Example: contacts.js
   function renderContacts() {
       const contactsHTML = GameData.cities['London'].contacts
           .map(contact => Templates.contactCard(contact))
           .join('');
       document.getElementById('contactsList').innerHTML = contactsHTML;
   }
   ```

3. **Update game state management:**
   - Track contact completion by ID
   - Save state to Firestore/localStorage
   - Merge saved state with GameData on load

## Scaling to 200 Contacts

The templating system handles this efficiently:

```javascript
// All cities with all contacts
let allContactsHTML = '';
for (const cityName in GameData.cities) {
    const city = GameData.cities[cityName];

    // Use the cityItem template
    allContactsHTML += Templates.cityItem({
        ...city,
        name: cityName,
        contacts: city.contacts,
        contactsCompleted: city.contacts.filter(c => c.completed).length,
        totalContacts: city.contacts.length
    });
}

document.getElementById('citiesList').innerHTML = allContactsHTML;
```

This approach:
- ✅ Keeps code DRY (Don't Repeat Yourself)
- ✅ Makes updates easy (change template once, affects all instances)
- ✅ Scales efficiently (same code for 10 or 200 contacts)
- ✅ Maintains consistency across the game

## Troubleshooting

### Template not rendering?
- Check browser console for JavaScript errors
- Verify script load order (data.js and templates.js before page scripts)
- Ensure `GameData` and `Templates` are defined (`console.log(window.GameData)`)

### Data not updating?
- Check that you're modifying the correct object reference
- Verify Firestore save/load is working
- Clear localStorage cache if testing

### Performance issues?
- Profile with browser DevTools
- Consider implementing virtual scrolling for 100+ items
- Lazy-load images and content below the fold

## Future Enhancements

Potential improvements for scaling further:

1. **Data Pagination** - Load cities/contacts in batches
2. **Search & Filter** - Add search functionality for 200+ contacts
3. **Lazy Loading** - Load contact details only when viewed
4. **Data Compression** - Minimize data transfer from Firestore
5. **Caching** - Cache frequently accessed data

---

**Version:** 1.0
**Last Updated:** December 26, 2024
**Status:** Ready for production
