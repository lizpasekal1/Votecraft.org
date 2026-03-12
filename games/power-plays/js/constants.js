/**
 * Power Plays - Game Constants
 * Card definitions, colors, and deck composition
 */

// Card colors representing government branches
const COLORS = {
    BLUE: 'blue',       // Legislative
    YELLOW: 'yellow',   // Executive
    RED: 'red',         // Judicial
    GREEN: 'green'      // Federal Reserve
};

const COLOR_LIST = [COLORS.BLUE, COLORS.YELLOW, COLORS.RED, COLORS.GREEN];

// Card types
const CARD_TYPES = {
    NUMBER: 'number',
    MOTION: 'motion',       // Reverse
    VETO: 'veto',           // Skip
    INFLATION: 'inflation', // Draw Two (was DRAW_2)
    GIVE_1: 'give1',        // Gratuities — give one card to another player
    VOTE: 'vote'            // Wild — choose color, all players vote
};

// Visual symbols for action cards
const CARD_SYMBOLS = {
    [CARD_TYPES.MOTION]: '⟲',
    [CARD_TYPES.VETO]: '⊘',
    [CARD_TYPES.INFLATION]: '+2',
    [CARD_TYPES.GIVE_1]: '🎁',
    [CARD_TYPES.VOTE]: 'VOTE'
};

// Card display names
const CARD_NAMES = {
    [CARD_TYPES.NUMBER]: '',
    [CARD_TYPES.MOTION]: 'Motion',
    [CARD_TYPES.VETO]: 'Veto',
    [CARD_TYPES.INFLATION]: 'Inflation',
    [CARD_TYPES.GIVE_1]: 'Gratuities',
    [CARD_TYPES.VOTE]: 'Vote'
};

// Counter map — which color + type counters each action
// Countering happens ON YOUR TURN by playing the matching color version
const COUNTER_MAP = {
    [CARD_TYPES.MOTION]:    { color: COLORS.BLUE,   type: CARD_TYPES.MOTION },
    [CARD_TYPES.VETO]:      { color: COLORS.YELLOW, type: CARD_TYPES.VETO },
    [CARD_TYPES.INFLATION]: { color: COLORS.GREEN,  type: CARD_TYPES.INFLATION },
    [CARD_TYPES.GIVE_1]:    { color: COLORS.RED,    type: CARD_TYPES.GIVE_1 }
};

// Civic theme descriptions for each color
const COLOR_THEMES = {
    [COLORS.BLUE]: {
        name: 'Legislative',
        description: 'Voting, group effects, collective power',
        icon: '🏛️'
    },
    [COLORS.YELLOW]: {
        name: 'Executive',
        description: 'Speed, skips, reversals, direct action',
        icon: '⚡'
    },
    [COLORS.RED]: {
        name: 'Judicial',
        description: 'Blocking, reversing, canceling effects',
        icon: '⚖️'
    },
    [COLORS.GREEN]: {
        name: 'Fed Reserve',
        description: 'Trading hands, discards, indirect influence',
        icon: '💰'
    }
};

// CSS color values for rendering
const COLOR_VALUES = {
    [COLORS.BLUE]: {
        primary: '#2196F3',
        dark: '#1565C0',
        glow: 'rgba(33, 150, 243, 0.5)'
    },
    [COLORS.YELLOW]: {
        primary: '#FFC107',
        dark: '#FF9800',
        glow: 'rgba(255, 193, 7, 0.5)'
    },
    [COLORS.RED]: {
        primary: '#f44336',
        dark: '#c62828',
        glow: 'rgba(244, 67, 54, 0.5)'
    },
    [COLORS.GREEN]: {
        primary: '#4CAF50',
        dark: '#2E7D32',
        glow: 'rgba(76, 175, 80, 0.5)'
    },
    wild: {
        primary: '#424242',
        dark: '#212121',
        glow: 'rgba(100, 100, 100, 0.5)'
    }
};

// Deck composition - how many of each card
const DECK_COMPOSITION = {
    // Numbers per color
    numbers: {
        0: 1,   // One 0 per color
        1: 2, 2: 2, 3: 2, 4: 2, 5: 2,
        6: 2, 7: 2, 8: 2, 9: 2  // Two of each 1-9
    },
    // Action cards per color
    actions: {
        [CARD_TYPES.MOTION]: 2,
        [CARD_TYPES.VETO]: 2,
        [CARD_TYPES.INFLATION]: 2,
        [CARD_TYPES.GIVE_1]: 1
    },
    // Wild cards (no color)
    wilds: {
        [CARD_TYPES.VOTE]: 6
    }
};

// Game settings
const GAME_CONFIG = {
    STARTING_HAND_SIZE: 7,
    MIN_PLAYERS: 2,
    MAX_PLAYERS: 4,
    POWER_PENALTY_CARDS: 2,
    AI_THINK_DELAY_MIN: 800,
    AI_THINK_DELAY_MAX: 2000
};

// Game phases
const GAME_PHASES = {
    SETUP: 'setup',
    PLAYING: 'playing',
    VOTING: 'voting',
    COLOR_SELECT: 'color-select',
    TARGET_SELECT: 'target-select',
    COUNTER_OPPORTUNITY: 'counter-opportunity',
    PASS_PLAY_TRANSITION: 'pass-play-transition',
    GAME_OVER: 'game-over'
};

// Game modes
const GAME_MODES = {
    SINGLE_PLAYER: 'single',
    LOCAL_MULTIPLAYER: 'local'
};

// AI difficulty levels
const AI_DIFFICULTY = {
    EASY: 'easy',
    MEDIUM: 'medium',
    HARD: 'hard'
};

// Lobbying Card types (Black cards)
const LOBBY_TYPES = {
    BILL: 'bill',
    COURT_CASE: 'court_case',
    EARNED: 'earned'  // Generic earned lobby card
};

// Lobbying Card definitions
const LOBBY_CARDS = {
    [LOBBY_TYPES.BILL]: {
        name: 'Bill',
        description: 'Change active color + draw 1 card yourself or force an opponent to draw 1.',
        icon: '📜',
        bonus: 'Draw or force draw'
    },
    [LOBBY_TYPES.COURT_CASE]: {
        name: 'Court Case',
        description: 'Change active color + choose a player to skip their next turn.',
        icon: '⚖️',
        bonus: 'Skip a player'
    },
    [LOBBY_TYPES.EARNED]: {
        name: 'Lobby Card',
        description: 'Change active color. Uses your whole turn.',
        icon: '⭐',
        bonus: 'Change active color'
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        COLORS, COLOR_LIST, CARD_TYPES, CARD_SYMBOLS, CARD_NAMES,
        COLOR_THEMES, COLOR_VALUES, DECK_COMPOSITION, GAME_CONFIG,
        GAME_PHASES, GAME_MODES, AI_DIFFICULTY, COUNTER_MAP
    };
}
