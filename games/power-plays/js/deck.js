/**
 * Power Plays - Card and Deck Classes
 */

// Unique ID generator for cards
let cardIdCounter = 0;
function generateCardId() {
    return `card_${++cardIdCounter}`;
}

/**
 * Represents a single card
 */
class Card {
    constructor(color, type, value = null) {
        this.id = generateCardId();
        this.color = color;      // 'blue', 'yellow', 'red', 'green', or null for wild
        this.type = type;        // 'number', 'skip', 'reverse', 'draw2', 'swap', 'block', 'vote'
        this.value = value;      // 0-9 for numbers, null for actions
    }

    /**
     * Check if this card can be played on the given top card
     */
    canPlayOn(topCard, activeColor) {
        // Vote cards (wild) can always be played
        if (this.type === CARD_TYPES.VOTE) {
            return true;
        }

        // Match by color
        if (this.color === activeColor) {
            return true;
        }

        // Match by type (for action cards)
        if (this.type !== CARD_TYPES.NUMBER && this.type === topCard.type) {
            return true;
        }

        // Match by number value
        if (this.type === CARD_TYPES.NUMBER && topCard.type === CARD_TYPES.NUMBER) {
            if (this.value === topCard.value) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get display text for the card
     */
    getDisplayValue() {
        if (this.type === CARD_TYPES.NUMBER) {
            return this.value.toString();
        }
        return CARD_SYMBOLS[this.type] || '';
    }

    /**
     * Get the card's full name
     */
    getName() {
        if (this.type === CARD_TYPES.NUMBER) {
            return `${this.color} ${this.value}`;
        }
        return `${this.color || 'Wild'} ${CARD_NAMES[this.type]}`;
    }

    /**
     * Get numeric value for voting (action cards = 0)
     */
    getVoteValue() {
        if (this.type === CARD_TYPES.NUMBER) {
            return this.value;
        }
        return 0;
    }

    /**
     * Check if this is an action card
     */
    isAction() {
        return this.type !== CARD_TYPES.NUMBER;
    }

    /**
     * Check if this is a wild card
     */
    isWild() {
        return this.color === null;
    }

    /**
     * Clone the card
     */
    clone() {
        const cloned = new Card(this.color, this.type, this.value);
        cloned.id = this.id;
        return cloned;
    }

    /**
     * Serialize for storage
     */
    toJSON() {
        return {
            id: this.id,
            color: this.color,
            type: this.type,
            value: this.value
        };
    }

    /**
     * Create from serialized data
     */
    static fromJSON(data) {
        const card = new Card(data.color, data.type, data.value);
        card.id = data.id;
        return card;
    }
}

/**
 * Represents a deck of cards
 */
class Deck {
    constructor() {
        this.cards = [];
    }

    /**
     * Create a standard Power Plays deck
     */
    static createStandardDeck() {
        const deck = new Deck();

        // Add cards for each color
        COLOR_LIST.forEach(color => {
            // Add number cards
            Object.entries(DECK_COMPOSITION.numbers).forEach(([value, count]) => {
                for (let i = 0; i < count; i++) {
                    deck.cards.push(new Card(color, CARD_TYPES.NUMBER, parseInt(value)));
                }
            });

            // Add action cards
            Object.entries(DECK_COMPOSITION.actions).forEach(([type, count]) => {
                for (let i = 0; i < count; i++) {
                    deck.cards.push(new Card(color, type));
                }
            });
        });

        // Add wild cards (Vote cards)
        Object.entries(DECK_COMPOSITION.wilds).forEach(([type, count]) => {
            for (let i = 0; i < count; i++) {
                deck.cards.push(new Card(null, type));
            }
        });

        return deck;
    }

    /**
     * Shuffle the deck using Fisher-Yates algorithm
     */
    shuffle() {
        const arr = this.cards;
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return this;
    }

    /**
     * Draw cards from the top of the deck
     */
    draw(count = 1) {
        const drawn = [];
        for (let i = 0; i < count && this.cards.length > 0; i++) {
            drawn.push(this.cards.pop());
        }
        return count === 1 ? drawn[0] : drawn;
    }

    /**
     * Look at the top cards without removing them
     */
    peek(count = 1) {
        const start = Math.max(0, this.cards.length - count);
        const peeked = this.cards.slice(start).reverse();
        return count === 1 ? peeked[0] : peeked;
    }

    /**
     * Add cards to the bottom of the deck
     */
    addToBottom(cards) {
        const toAdd = Array.isArray(cards) ? cards : [cards];
        this.cards.unshift(...toAdd);
    }

    /**
     * Add cards to the top of the deck
     */
    addToTop(cards) {
        const toAdd = Array.isArray(cards) ? cards : [cards];
        this.cards.push(...toAdd);
    }

    /**
     * Check if deck is empty
     */
    isEmpty() {
        return this.cards.length === 0;
    }

    /**
     * Get remaining card count
     */
    remaining() {
        return this.cards.length;
    }

    /**
     * Get all cards (for reshuffling from discard)
     */
    getAll() {
        return [...this.cards];
    }

    /**
     * Clear all cards
     */
    clear() {
        this.cards = [];
    }

    /**
     * Set cards (used when reshuffling)
     */
    setCards(cards) {
        this.cards = cards;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Card, Deck, generateCardId };
}
