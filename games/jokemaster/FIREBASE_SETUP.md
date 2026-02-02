# Firebase Setup Guide for JokeMaster

This guide will walk you through setting up Firebase/Firestore for the JokeMaster game.

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or **"Create a project"**
3. Enter project name: `jokemaster` (or your preferred name)
4. (Optional) Enable Google Analytics
5. Click **"Create project"**

## Step 2: Register Your Web App

1. In the Firebase Console, click the **web icon** (`</>`) to add a web app
2. Enter app nickname: `JokeMaster Web App`
3. Check **"Also set up Firebase Hosting"** (optional, but recommended)
4. Click **"Register app"**

## Step 3: Get Your Firebase Configuration

You'll see a configuration object that looks like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "jokemaster-xxxxx.firebaseapp.com",
  projectId: "jokemaster-xxxxx",
  storageBucket: "jokemaster-xxxxx.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:xxxxxxxxxxxxxxx"
};
```

**Copy this configuration** - you'll need it in Step 5.

## Step 4: Enable Firestore Database

1. In Firebase Console, go to **"Build" > "Firestore Database"**
2. Click **"Create database"**
3. Choose **"Start in test mode"** (for development)
   - This allows read/write access without authentication
   - **Important:** We'll update security rules in Step 7
4. Choose a location (select closest to your users)
5. Click **"Enable"**

## Step 5: Enable Anonymous Authentication (Recommended)

1. In Firebase Console, go to **"Build" > "Authentication"**
2. Click **"Get started"**
3. Go to **"Sign-in method"** tab
4. Click **"Anonymous"**
5. Toggle **"Enable"**
6. Click **"Save"**

This allows users to have persistent IDs without creating accounts.

## Step 6: Update Your Firebase Configuration

1. Open `src/scripts/firebase-config.js`
2. Replace the placeholder values with your actual Firebase configuration:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_ACTUAL_API_KEY",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

## Step 7: Add Firebase Scripts to Your HTML

Add these script tags to **EVERY HTML page** that needs database access, just before the closing `</body>` tag:

```html
<!-- Firebase SDK -->
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js"></script>

<!-- Your Firebase config and database helper -->
<script src="../scripts/firebase-config.js"></script>
<script src="../scripts/database.js"></script>

<script>
    // Initialize Firebase when page loads
    document.addEventListener('DOMContentLoaded', function() {
        initializeFirebase();
    });
</script>
```

## Step 8: Update Security Rules (After Testing)

Once you've tested and confirmed everything works, update your Firestore security rules:

1. In Firebase Console, go to **"Firestore Database" > "Rules"**
2. Replace the rules with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Game states - users can only read/write their own data
    match /gameStates/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Joke votes - users can only read/write their own votes
    match /jokeVotes/{voteId} {
      allow read, write: if request.auth != null &&
                           voteId.matches('^' + request.auth.uid + '_.*');
    }
  }
}
```

3. Click **"Publish"**

## Step 9: Test Your Integration

1. Open `src/pages/contacts.html` in your browser
2. Open the browser console (F12)
3. You should see: `"Firebase initialized successfully"`
4. Try the test commands:

```javascript
// Get or create user ID
getOrCreateUserId().then(userId => console.log('User ID:', userId));

// Save test data
const testState = { funding: 1000, completedCharacters: ['Marcus Chen'] };
getOrCreateUserId().then(userId => saveGameState(userId, testState));

// Load data back
getOrCreateUserId().then(userId => loadGameState(userId).then(data => console.log('Loaded:', data)));
```

## Database Collections Structure

Your Firestore database will have these collections:

### `gameStates/{userId}`
```javascript
{
  funding: 21000,
  completedCharacters: ['Marcus Chen', 'Raj Patel'],
  usedCards: ['joke-1', 'joke-3', 'joke-5'],
  selectedProject: 'eco-wellness-housing',
  lastUpdated: Timestamp
}
```

### `jokeVotes/{userId}_{jokeId}`
```javascript
{
  userId: "user_abc123",
  jokeId: "joke-1",
  vote: 1,
  timestamp: Timestamp
}
```

## Using the Database Functions

### Save Game State
```javascript
const userId = await getOrCreateUserId();
const gameState = {
    funding: 5000,
    completedCharacters: ['Marcus Chen'],
    selectedProject: 'eco-wellness-housing'
};
await saveGameState(userId, gameState);
```

### Load Game State
```javascript
const userId = await getOrCreateUserId();
const gameState = await loadGameState(userId);
if (gameState) {
    console.log('Loaded game state:', gameState);
}
```

### Save Joke Vote
```javascript
const userId = await getOrCreateUserId();
await saveJokeVote(userId, 'joke-1', 1); // 1 = upvote
```

### Sync Existing LocalStorage Data
```javascript
// Migrate existing localStorage data to Firestore
await syncLocalStorageToFirestore();
```

## Next Steps: Integration

Now that Firebase is set up, you can integrate it into your game:

1. **Modify contacts.js** - Save completed characters to Firestore
2. **Modify your-jokes.js** - Save joke votes to Firestore
3. **Modify game.js** - Save game state (funding, etc.) to Firestore
4. **Add auto-sync** - Automatically save to Firestore whenever data changes

## Troubleshooting

### "Firebase is not defined"
- Make sure Firebase scripts are loaded before your scripts
- Check the script order in your HTML

### "Permission denied" errors
- Check that Anonymous Authentication is enabled
- Verify your security rules match Step 8

### Data not saving
- Open browser console and check for errors
- Verify your Firebase config values are correct
- Check that Firestore is enabled in Firebase Console

## Cost Considerations

Firebase free tier includes:
- **Firestore:** 1 GB storage, 50K reads/day, 20K writes/day
- **Authentication:** Unlimited anonymous users
- **Hosting:** 10 GB storage, 360 MB/day bandwidth

This is more than enough for a small game with hundreds of users.

---

Need help? Check the [Firebase Documentation](https://firebase.google.com/docs/web/setup) or ask for assistance!
