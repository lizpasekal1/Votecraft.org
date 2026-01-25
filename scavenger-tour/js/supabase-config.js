// VoteCraft Supabase Configuration
// Shared authentication and data sync across all VoteCraft games

const SUPABASE_URL = 'https://xvtgmjsselzlyjdzwoth.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2dGdtanNzZWx6bHlqZHp3b3RoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNDE5NjMsImV4cCI6MjA4NDkxNzk2M30.bCTM3N05iESFyqBCxlbxwxYrpeXIqXPq-x3j8UImL1Q';
const CURRENT_GAME_ID = 'scavenger-tour';

// Check if Supabase library is loaded
if (typeof window.supabase === 'undefined') {
    console.error('Supabase library not loaded. Make sure to include the Supabase CDN script before this file.');
}

// Initialize Supabase client
const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// Auth state management
const VoteCraftAuth = {
    currentUser: null,

    // Initialize auth state
    async init() {
        if (!supabase) {
            console.error('Supabase not initialized');
            return null;
        }
        const { data: { session } } = await supabase.auth.getSession();
        this.currentUser = session?.user || null;

        // Listen for auth changes
        supabase.auth.onAuthStateChange((event, session) => {
            this.currentUser = session?.user || null;
            window.dispatchEvent(new CustomEvent('votecraft-auth-change', {
                detail: { user: this.currentUser, event }
            }));
        });

        return this.currentUser;
    },

    // Sign up with email
    async signUp(email, password, displayName) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { display_name: displayName }
            }
        });

        if (error) throw error;

        // Create user profile
        if (data.user) {
            await supabase.from('user_profiles').insert({
                id: data.user.id,
                email: email,
                display_name: displayName
            });
        }

        return data;
    },

    // Sign in with email
    async signIn(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;
        return data;
    },

    // Sign out
    async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    },

    // Get current user
    getUser() {
        return this.currentUser;
    },

    // Check if signed in
    isSignedIn() {
        return !!this.currentUser;
    }
};

// Cloud sync for game progress
const VoteCraftSync = {
    // Save progress to cloud
    async saveProgress(gameId = CURRENT_GAME_ID) {
        if (!VoteCraftAuth.isSignedIn()) return null;

        // Gather all localStorage data for this game
        const data = {
            likes: JSON.parse(localStorage.getItem('votecraft_likes') || '[]'),
            savedSongs: JSON.parse(localStorage.getItem('votecraft_saved_songs') || '[]'),
            favoriteThemes: JSON.parse(localStorage.getItem('votecraft_favorite_themes') || '[]'),
            settings: {
                notifications: localStorage.getItem('votecraft_notifications'),
                volume: localStorage.getItem('votecraft_volume'),
                offline: localStorage.getItem('votecraft_offline')
            },
            itineraries: {}
        };

        // Get all itinerary data
        ['civic-sampler', 'healthcare', 'voting-rights', 'art-action'].forEach(tourId => {
            const itinerary = localStorage.getItem(`votecraft_itinerary_${tourId}`);
            if (itinerary) {
                data.itineraries[tourId] = JSON.parse(itinerary);
            }
        });

        const { error } = await supabase
            .from('game_progress')
            .upsert({
                user_id: VoteCraftAuth.currentUser.id,
                game_id: gameId,
                data: data,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id,game_id'
            });

        if (error) throw error;
        return true;
    },

    // Load progress from cloud
    async loadProgress(gameId = CURRENT_GAME_ID) {
        if (!VoteCraftAuth.isSignedIn()) return null;

        const { data, error } = await supabase
            .from('game_progress')
            .select('data')
            .eq('user_id', VoteCraftAuth.currentUser.id)
            .eq('game_id', gameId)
            .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
        if (!data) return null;

        // Restore to localStorage
        const progress = data.data;

        if (progress.likes) {
            localStorage.setItem('votecraft_likes', JSON.stringify(progress.likes));
        }
        if (progress.savedSongs) {
            localStorage.setItem('votecraft_saved_songs', JSON.stringify(progress.savedSongs));
        }
        if (progress.favoriteThemes) {
            localStorage.setItem('votecraft_favorite_themes', JSON.stringify(progress.favoriteThemes));
        }
        if (progress.settings) {
            if (progress.settings.notifications !== null) {
                localStorage.setItem('votecraft_notifications', progress.settings.notifications);
            }
            if (progress.settings.volume !== null) {
                localStorage.setItem('votecraft_volume', progress.settings.volume);
            }
            if (progress.settings.offline !== null) {
                localStorage.setItem('votecraft_offline', progress.settings.offline);
            }
        }
        if (progress.itineraries) {
            Object.entries(progress.itineraries).forEach(([tourId, itinerary]) => {
                localStorage.setItem(`votecraft_itinerary_${tourId}`, JSON.stringify(itinerary));
            });
        }

        return progress;
    },

    // Get user profile
    async getProfile() {
        if (!VoteCraftAuth.isSignedIn()) return null;

        const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', VoteCraftAuth.currentUser.id)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    },

    // Update user profile
    async updateProfile(updates) {
        if (!VoteCraftAuth.isSignedIn()) return null;

        const { data, error } = await supabase
            .from('user_profiles')
            .update(updates)
            .eq('id', VoteCraftAuth.currentUser.id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};

// Export for use in other files
window.VoteCraftAuth = VoteCraftAuth;
window.VoteCraftSync = VoteCraftSync;
window.supabaseClient = supabase;
