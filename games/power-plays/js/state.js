/**
 * Power Plays - Game State Management
 */

/**
 * Manages the complete state of the game
 */
class GameState {
    constructor() {
        this.reset();
    }

    /**
     * Reset state to initial values
     */
    reset() {
        // Game settings
        this.mode = GAME_MODES.SINGLE_PLAYER;
        this.phase = GAME_PHASES.SETUP;
        this.aiDifficulty = AI_DIFFICULTY.MEDIUM;

        // Players
        this.players = [];
        this.currentPlayerIndex = 0;
        this.direction = 1; // 1 = clockwise, -1 = counter-clockwise

        // Card piles
        this.drawPile = [];
        this.playPile = [];

        // Active game state
        this.activeColor = null;
        this.pendingDraws = 0; // For stacked Draw 2s
        this.skipNext = false;
        this.lastAction = null;
        this.lastPlayedCard = null;

        // Vote state
        this.activeVote = null;

        // History for potential undo/replay
        this.turnHistory = [];
        this.turnNumber = 0;
    }

    /**
     * Initialize game with players
     */
    initGame(playerCount, mode, humanPlayerIndex = 0) {
        this.reset();
        this.mode = mode;

        // Create players
        for (let i = 0; i < playerCount; i++) {
            const isHuman = mode === GAME_MODES.LOCAL_MULTIPLAYER || i === humanPlayerIndex;
            const name = isHuman ? `Player ${i + 1}` : `CPU ${i + 1}`;
            this.players.push(new Player(i, name, isHuman));
        }
    }

    /**
     * Get current player
     */
    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex];
    }

    /**
     * Get top card of play pile
     */
    getTopCard() {
        if (this.playPile.length === 0) return null;
        return this.playPile[this.playPile.length - 1];
    }

    /**
     * Check if a player can play a specific card
     */
    canPlayCard(playerIndex, card) {
        if (playerIndex !== this.currentPlayerIndex) return false;
        if (this.phase !== GAME_PHASES.PLAYING) return false;

        const topCard = this.getTopCard();
        if (!topCard) return true; // Can play anything on empty pile

        return card.canPlayOn(topCard, this.activeColor);
    }

    /**
     * Advance to next player based on direction
     */
    advancePlayer() {
        this.currentPlayerIndex = this.getNextPlayerIndex();
    }

    /**
     * Get the next player index (without advancing)
     */
    getNextPlayerIndex() {
        let next = this.currentPlayerIndex + this.direction;
        if (next >= this.players.length) next = 0;
        if (next < 0) next = this.players.length - 1;
        return next;
    }

    /**
     * Get player at specific offset from current (for targeting)
     */
    getPlayerAtOffset(offset) {
        let index = this.currentPlayerIndex;
        for (let i = 0; i < offset; i++) {
            index += this.direction;
            if (index >= this.players.length) index = 0;
            if (index < 0) index = this.players.length - 1;
        }
        return this.players[index];
    }

    /**
     * Reverse play direction
     */
    reverseDirection() {
        this.direction *= -1;
    }

    /**
     * Add card to play pile
     */
    playCard(card) {
        this.playPile.push(card);
        this.lastPlayedCard = card;

        // Update active color
        if (card.color) {
            this.activeColor = card.color;
        }
        // For wild cards, color is set separately via setActiveColor
    }

    /**
     * Set active color (for wild cards)
     */
    setActiveColor(color) {
        this.activeColor = color;
    }

    /**
     * Draw cards from draw pile
     */
    drawCards(count = 1) {
        const drawn = [];
        for (let i = 0; i < count; i++) {
            if (this.drawPile.length === 0) {
                this.reshufflePlayPile();
            }
            if (this.drawPile.length > 0) {
                drawn.push(this.drawPile.pop());
            }
        }
        return drawn;
    }

    /**
     * Reshuffle play pile into draw pile (keeping top card)
     */
    reshufflePlayPile() {
        if (this.playPile.length <= 1) return;

        const topCard = this.playPile.pop();
        const toShuffle = this.playPile;
        this.playPile = [topCard];

        // Shuffle and add to draw pile
        for (let i = toShuffle.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [toShuffle[i], toShuffle[j]] = [toShuffle[j], toShuffle[i]];
        }

        this.drawPile = toShuffle;
    }

    /**
     * Check if game is over
     */
    isGameOver() {
        return this.players.some(p => p.handSize() === 0);
    }

    /**
     * Get winner (player with empty hand)
     */
    getWinner() {
        return this.players.find(p => p.handSize() === 0) || null;
    }

    /**
     * Start a vote
     */
    startVote(initiatorIndex, color) {
        this.phase = GAME_PHASES.VOTING;
        this.activeVote = {
            initiator: initiatorIndex,
            color: color,
            votes: {},
            resolved: false,
            winner: null
        };

        // Initialize vote slots for all players
        this.players.forEach(p => {
            this.activeVote.votes[p.index] = {
                card: null,
                submitted: false
            };
        });
    }

    /**
     * Submit a vote
     */
    submitVote(playerIndex, card) {
        if (!this.activeVote) return;

        this.activeVote.votes[playerIndex] = {
            card: card,
            submitted: true
        };
    }

    /**
     * Check if all votes are submitted
     */
    allVotesSubmitted() {
        if (!this.activeVote) return false;
        return Object.values(this.activeVote.votes).every(v => v.submitted);
    }

    /**
     * End vote and return to playing
     */
    endVote(winner) {
        if (this.activeVote) {
            this.activeVote.resolved = true;
            this.activeVote.winner = winner;
        }
        this.phase = GAME_PHASES.PLAYING;
    }

    /**
     * Record action in history
     */
    recordAction(action) {
        this.turnHistory.push({
            turn: this.turnNumber,
            player: this.currentPlayerIndex,
            ...action,
            timestamp: Date.now()
        });
    }

    /**
     * Get other players (excluding current)
     */
    getOtherPlayers() {
        return this.players.filter(p => p.index !== this.currentPlayerIndex);
    }

    /**
     * Get player by index
     */
    getPlayer(index) {
        return this.players[index] || null;
    }

    /**
     * Serialize state for save/restore
     */
    toJSON() {
        return {
            mode: this.mode,
            phase: this.phase,
            aiDifficulty: this.aiDifficulty,
            players: this.players.map(p => p.toJSON()),
            currentPlayerIndex: this.currentPlayerIndex,
            direction: this.direction,
            drawPile: this.drawPile.map(c => c.toJSON()),
            playPile: this.playPile.map(c => c.toJSON()),
            activeColor: this.activeColor,
            pendingDraws: this.pendingDraws,
            skipNext: this.skipNext,
            lastAction: this.lastAction,
            activeVote: this.activeVote,
            turnNumber: this.turnNumber
        };
    }

    /**
     * Restore from serialized data
     */
    static fromJSON(data) {
        const state = new GameState();
        state.mode = data.mode;
        state.phase = data.phase;
        state.aiDifficulty = data.aiDifficulty;
        state.players = data.players.map(p => Player.fromJSON(p));
        state.currentPlayerIndex = data.currentPlayerIndex;
        state.direction = data.direction;
        state.drawPile = data.drawPile.map(c => Card.fromJSON(c));
        state.playPile = data.playPile.map(c => Card.fromJSON(c));
        state.activeColor = data.activeColor;
        state.pendingDraws = data.pendingDraws;
        state.skipNext = data.skipNext;
        state.lastAction = data.lastAction;
        state.activeVote = data.activeVote;
        state.turnNumber = data.turnNumber;
        return state;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GameState };
}
