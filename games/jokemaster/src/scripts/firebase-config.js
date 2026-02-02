// Firebase Configuration
// Your Firebase project credentials

const firebaseConfig = {
    apiKey: "AIzaSyCYudBmpHxgjU8THvNwENAumcFp36neEyE",
    authDomain: "jokemaster-3ed37.firebaseapp.com",
    projectId: "jokemaster-3ed37",
    storageBucket: "jokemaster-3ed37.firebasestorage.app",
    messagingSenderId: "581366624766",
    appId: "1:581366624766:web:3ed9e9891288c3d41cd0af",
    measurementId: "G-L214C1ER11"
};

// Initialize Firebase
let db = null;
let auth = null;

function initializeFirebase() {
    if (typeof firebase === 'undefined') {
        console.error('Firebase SDK not loaded. Make sure to include Firebase scripts in your HTML.');
        return false;
    }

    try {
        // Initialize Firebase
        firebase.initializeApp(firebaseConfig);

        // Initialize Firestore
        db = firebase.firestore();

        // Initialize Authentication
        auth = firebase.auth();

        console.log('Firebase initialized successfully');
        return true;
    } catch (error) {
        console.error('Error initializing Firebase:', error);
        return false;
    }
}

// Export for use in other files
window.firebaseDB = db;
window.firebaseAuth = auth;
window.initializeFirebase = initializeFirebase;
