/**
 * Power Plays - Player Class
 */

/**
 * Represents a player in the game
 */
class Player {
    constructor(index, name, isHuman = true) {
        this.index = index;
        this.name = name;
        this.isHuman = isHuman;
        this.hand = [];
        // Lobbying cards (secret until revealed)
        this.lobbyCards = [];
        this.usedLobbyThisTurn = false;
        // Earned Lobby Cards — from countering, voting, etc. (used for win condition)
        this.earnedLobbyCards = 0;
    }

    /**
     * Add cards to the player's hand
     */
    addCards(cards) {
        const toAdd = Array.isArray(cards) ? cards : [cards];
        this.hand.push(...toAdd);
    }

    /**
     * Remove a card from hand by index
     */
    removeCard(cardIndex) {
        if (cardIndex >= 0 && cardIndex < this.hand.length) {
            return this.hand.splice(cardIndex, 1)[0];
        }
        return null;
    }

    /**
     * Remove a card from hand by card ID
     */
    removeCardById(cardId) {
        const index = this.hand.findIndex(c => c.id === cardId);
        if (index !== -1) {
            return this.hand.splice(index, 1)[0];
        }
        return null;
    }

    /**
     * Get all playable cards given the current game state
     */
    getPlayableCards(topCard, activeColor, voteBan = false) {
        return this.hand.filter(card => {
            if (voteBan && card.type === CARD_TYPES.VOTE) return false;
            return card.canPlayOn(topCard, activeColor);
        });
    }

    /**
     * Check if player can play any card
     */
    canPlay(topCard, activeColor) {
        return this.getPlayableCards(topCard, activeColor).length > 0;
    }

    /**
     * Get number of cards in hand
     */
    handSize() {
        return this.hand.length;
    }

    /**
     * Check if player has any cards of a specific color
     */
    hasCardOfColor(color) {
        return this.hand.some(card => card.color === color);
    }

    /**
     * Get all cards of a specific color
     */
    getCardsOfColor(color) {
        return this.hand.filter(card => card.color === color);
    }

    /**
     * Get the highest number card of a specific color (for voting)
     */
    getHighestNumberCard(color) {
        const colorCards = this.getCardsOfColor(color);
        if (colorCards.length === 0) return null;

        return colorCards.reduce((best, card) => {
            const cardValue = card.getVoteValue();
            const bestValue = best ? best.getVoteValue() : -1;
            return cardValue > bestValue ? card : best;
        }, null);
    }

    /**
     * Get the lowest number card of a specific color
     */
    getLowestNumberCard(color) {
        const colorCards = this.getCardsOfColor(color);
        if (colorCards.length === 0) return null;

        return colorCards.reduce((best, card) => {
            const cardValue = card.getVoteValue();
            const bestValue = best ? best.getVoteValue() : 10;
            return cardValue < bestValue ? card : best;
        }, null);
    }

    /**
     * Get the dominant color in hand (most cards)
     */
    getDominantColor() {
        const counts = {};
        COLOR_LIST.forEach(color => counts[color] = 0);

        this.hand.forEach(card => {
            if (card.color) {
                counts[card.color]++;
            }
        });

        let maxColor = COLOR_LIST[0];
        let maxCount = 0;

        Object.entries(counts).forEach(([color, count]) => {
            if (count > maxCount) {
                maxColor = color;
                maxCount = count;
            }
        });

        return maxColor;
    }

    /**
     * Get count of each color in hand
     */
    getColorCounts() {
        const counts = {};
        COLOR_LIST.forEach(color => counts[color] = 0);

        this.hand.forEach(card => {
            if (card.color) {
                counts[card.color]++;
            }
        });

        return counts;
    }

    /**
     * Earn a Lobby Card (from countering, winning votes, etc.)
     */
    earnLobbyCard() {
        this.earnedLobbyCards++;
        this.lobbyCards.push({ type: LOBBY_TYPES.EARNED, used: false });
    }

    clearHand() {
        this.hand = [];
        this.usedLobbyThisTurn = false;
        // Lobby cards persist forever — they're kept but can only be used once
        // earnedLobbyCards also persists across rounds
    }

    // ==================== LOBBY CARD METHODS ====================

    /**
     * Add a lobby card to player's collection
     */
    addLobbyCard(lobbyType) {
        this.lobbyCards.push({
            type: lobbyType,
            used: false
        });
    }

    /**
     * Check if player can use a lobby card (has any unused)
     */
    canUseLobbyCard() {
        return this.lobbyCards.some(lc => !lc.used);
    }

    /**
     * Use a lobby card — marks one unused card as used, returns its type
     */
    useLobbyCard() {
        const lobbyCard = this.lobbyCards.find(lc => !lc.used);
        if (lobbyCard) {
            lobbyCard.used = true;
            return lobbyCard.type;
        }
        return false;
    }

    /**
     * Get count of unused lobby cards
     */
    getUnusedLobbyCount() {
        return this.lobbyCards.filter(lc => !lc.used).length;
    }

    /**
     * Get all unused lobby cards
     */
    getUnusedLobbyCards() {
        return this.lobbyCards.filter(lc => !lc.used);
    }

    /**
     * Reset turn-based lobby card state
     */
    resetTurnState() {
        this.usedLobbyThisTurn = false;
    }

    /**
     * Get card at specific index
     */
    getCard(index) {
        return this.hand[index] || null;
    }

    /**
     * Find card index by ID
     */
    findCardIndex(cardId) {
        return this.hand.findIndex(c => c.id === cardId);
    }

    /**
     * Sort hand by color then value
     */
    sortHand() {
        this.hand.sort((a, b) => {
            // Wild cards go to the end
            if (!a.color && b.color) return 1;
            if (a.color && !b.color) return -1;
            if (!a.color && !b.color) return 0;

            // Sort by color
            const colorOrder = COLOR_LIST.indexOf(a.color) - COLOR_LIST.indexOf(b.color);
            if (colorOrder !== 0) return colorOrder;

            // Then by type (numbers first)
            if (a.type === CARD_TYPES.NUMBER && b.type !== CARD_TYPES.NUMBER) return -1;
            if (a.type !== CARD_TYPES.NUMBER && b.type === CARD_TYPES.NUMBER) return 1;

            // Then by value
            const aVal = a.value || 0;
            const bVal = b.value || 0;
            return aVal - bVal;
        });
    }

    /**
     * Serialize player data
     */
    toJSON() {
        return {
            index: this.index,
            name: this.name,
            isHuman: this.isHuman,
            hand: this.hand.map(card => card.toJSON()),
            lobbyCards: this.lobbyCards,
            usedLobbyThisTurn: this.usedLobbyThisTurn,
            earnedLobbyCards: this.earnedLobbyCards
        };
    }

    /**
     * Create from serialized data
     */
    static fromJSON(data) {
        const player = new Player(data.index, data.name, data.isHuman);
        player.hand = data.hand.map(cardData => Card.fromJSON(cardData));
        player.lobbyCards = data.lobbyCards || [];
        player.usedLobbyThisTurn = data.usedLobbyThisTurn || false;
        player.earnedLobbyCards = data.earnedLobbyCards || 0;
        return player;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Player };
}
