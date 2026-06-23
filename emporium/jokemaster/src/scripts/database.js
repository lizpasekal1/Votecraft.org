// Database helper functions for JokeMaster
// This file provides easy-to-use functions for interacting with Firestore

/**
 * Save game state to Firestore
 * @param {string} userId - User ID (can be anonymous or authenticated)
 * @param {object} gameState - The game state object to save
 */
async function saveGameState(userId, gameState) {
    try {
        const db = firebase.firestore();
        await db.collection('gameStates').doc(userId).set({
            ...gameState,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        console.log('Game state saved successfully');
        return true;
    } catch (error) {
        console.error('Error saving game state:', error);
        return false;
    }
}

/**
 * Load game state from Firestore
 * @param {string} userId - User ID to load state for
 */
async function loadGameState(userId) {
    try {
        const db = firebase.firestore();
        const doc = await db.collection('gameStates').doc(userId).get();

        if (doc.exists) {
            console.log('Game state loaded successfully');
            return doc.data();
        } else {
            console.log('No saved game state found');
            return null;
        }
    } catch (error) {
        console.error('Error loading game state:', error);
        return null;
    }
}

/**
 * Save a joke vote to Firestore
 * @param {string} userId - User ID
 * @param {string} jokeId - Joke ID
 * @param {number} vote - Vote value (1 for upvote, 0 for neutral)
 */
async function saveJokeVote(userId, jokeId, vote) {
    try {
        const db = firebase.firestore();
        await db.collection('jokeVotes').doc(`${userId}_${jokeId}`).set({
            userId,
            jokeId,
            vote,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log('Joke vote saved successfully');
        return true;
    } catch (error) {
        console.error('Error saving joke vote:', error);
        return false;
    }
}

/**
 * Load all joke votes for a user
 * @param {string} userId - User ID
 */
async function loadJokeVotes(userId) {
    try {
        const db = firebase.firestore();
        const snapshot = await db.collection('jokeVotes')
            .where('userId', '==', userId)
            .get();

        const votes = {};
        snapshot.forEach(doc => {
            const data = doc.data();
            votes[data.jokeId] = data.vote;
        });

        console.log('Joke votes loaded successfully');
        return votes;
    } catch (error) {
        console.error('Error loading joke votes:', error);
        return {};
    }
}

/**
 * Save completed characters to Firestore
 * @param {string} userId - User ID
 * @param {array} completedCharacters - Array of character names
 */
async function saveCompletedCharacters(userId, completedCharacters) {
    try {
        const db = firebase.firestore();
        await db.collection('gameStates').doc(userId).update({
            completedCharacters,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log('Completed characters saved successfully');
        return true;
    } catch (error) {
        console.error('Error saving completed characters:', error);
        return false;
    }
}

/**
 * Get or create anonymous user ID
 * Uses Firebase Anonymous Authentication
 */
async function getOrCreateUserId() {
    try {
        const auth = firebase.auth();

        // Check if user is already signed in
        if (auth.currentUser) {
            return auth.currentUser.uid;
        }

        // Sign in anonymously
        const userCredential = await auth.signInAnonymously();
        console.log('Anonymous user created:', userCredential.user.uid);
        return userCredential.user.uid;

    } catch (error) {
        console.error('Error getting user ID:', error);
        // Fallback to localStorage-based ID
        let userId = localStorage.getItem('jokeMasterUserId');
        if (!userId) {
            userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('jokeMasterUserId', userId);
        }
        return userId;
    }
}

/**
 * Sync localStorage data to Firestore
 * Useful for migrating existing data
 */
async function syncLocalStorageToFirestore() {
    try {
        const userId = await getOrCreateUserId();

        // Get game state from localStorage
        const gameState = JSON.parse(localStorage.getItem('jokeMasterGameState') || '{}');
        if (Object.keys(gameState).length > 0) {
            await saveGameState(userId, gameState);
        }

        // Get joke votes from localStorage
        const jokeVotes = JSON.parse(localStorage.getItem('jokeVotes') || '{}');
        for (const [jokeId, vote] of Object.entries(jokeVotes)) {
            await saveJokeVote(userId, jokeId, vote);
        }

        console.log('Local data synced to Firestore successfully');
        return true;
    } catch (error) {
        console.error('Error syncing to Firestore:', error);
        return false;
    }
}

// Export functions for use in other files
window.saveGameState = saveGameState;
window.loadGameState = loadGameState;
window.saveJokeVote = saveJokeVote;
window.loadJokeVotes = loadJokeVotes;
window.saveCompletedCharacters = saveCompletedCharacters;
window.getOrCreateUserId = getOrCreateUserId;
window.syncLocalStorageToFirestore = syncLocalStorageToFirestore;
