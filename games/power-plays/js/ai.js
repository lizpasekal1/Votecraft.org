/**
 * Power Plays - AI Controller
 * Computer opponent decision making
 */

/**
 * Controls AI player decisions
 */
class AIController {
    constructor(game) {
        this.game = game;
    }

    /**
     * Get a random delay for AI "thinking"
     */
    getThinkingDelay() {
        const min = GAME_CONFIG.AI_THINK_DELAY_MIN;
        const max = GAME_CONFIG.AI_THINK_DELAY_MAX;
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * Execute AI turn
     */
    async takeTurn(playerIndex) {
        const state = this.game.state;
        const player = state.getPlayer(playerIndex);
        const topCard = state.getTopCard();
        const activeColor = state.activeColor;

        // Simulate thinking
        await this.delay(this.getThinkingDelay());

        // Get playable cards (respect vote ban)
        const voteBan = state.voteBanTurnsLeft > 0;
        const playableCards = player.getPlayableCards(topCard, activeColor, voteBan);

        if (playableCards.length > 0) {
            // Choose a card to play
            const chosenCard = this.selectCardToPlay(player, playableCards, state);
            const cardIndex = player.findCardIndex(chosenCard.id);

            // Get target info if needed
            let targetInfo = null;
            if (chosenCard.type === CARD_TYPES.GIVE_1) {
                targetInfo = this.selectGive1Target(player, state);
            } else if (chosenCard.type === CARD_TYPES.VOTE) {
                targetInfo = { color: this.selectColorForVote(player) };
            }

            // Play the card
            await this.game.playCard(playerIndex, cardIndex, targetInfo);
        } else if (this.shouldUseLobbyCard(player, state)) {
            // Use a lobby card to change color instead of drawing
            await this.game.useLobbyCardForColor(player);
        } else {
            // Must draw
            await this.game.drawCard(playerIndex);
        }
    }

    /**
     * Select the best card to play
     */
    selectCardToPlay(player, playableCards, state) {
        const difficulty = state.aiDifficulty;

        // Easy: random choice with 50% chance
        if (difficulty === AI_DIFFICULTY.EASY && Math.random() < 0.5) {
            return playableCards[Math.floor(Math.random() * playableCards.length)];
        }

        // Score each playable card
        const scored = playableCards.map(card => ({
            card,
            score: this.evaluateCard(card, player, state)
        }));

        // Sort by score (highest first)
        scored.sort((a, b) => b.score - a.score);

        // Hard mode might occasionally make suboptimal plays for unpredictability
        if (difficulty === AI_DIFFICULTY.HARD && Math.random() < 0.1 && scored.length > 1) {
            return scored[1].card;
        }

        return scored[0].card;
    }

    /**
     * Evaluate a card's priority for playing
     */
    evaluateCard(card, player, state) {
        let score = 0;
        const nextPlayer = state.getPlayerAtOffset(1);
        const colorCounts = player.getColorCounts();

        // Base score for numbers - prefer playing high numbers
        if (card.type === CARD_TYPES.NUMBER) {
            score += card.value;
        }

        // Action card evaluations
        switch (card.type) {
            case CARD_TYPES.INFLATION:
                score += 20;
                // Extra value if next player has few cards
                if (nextPlayer.handSize() <= 2) {
                    score += 15;
                }
                break;

            case CARD_TYPES.MOTION:
            case CARD_TYPES.VETO:
                score += 10;
                // Better when next player is close to winning
                if (nextPlayer.handSize() <= 3) {
                    score += 10;
                }
                break;

            case CARD_TYPES.GIVE_1:
                // Good for getting rid of cards, especially bad ones
                score += 8;
                // Better if we have many cards
                if (player.handSize() > 5) {
                    score += 5;
                }
                break;

            case CARD_TYPES.VOTE:
                // Save vote cards for strategic moments
                score -= 5;
                // Bonus if we have strong cards in a color
                const dominantColor = player.getDominantColor();
                const highCardsInDominant = player.hand.filter(c =>
                    c.color === dominantColor &&
                    c.type === CARD_TYPES.NUMBER &&
                    c.value >= 7
                );
                if (highCardsInDominant.length >= 2) {
                    score += 15;
                }
                break;
        }

        // Color strategy - prefer playing from abundant colors
        if (card.color && colorCounts[card.color] > 2) {
            score += 5;
        }

        // Hard mode: consider keeping variety
        if (state.aiDifficulty === AI_DIFFICULTY.HARD) {
            if (card.color && colorCounts[card.color] === 1) {
                score -= 3;
            }
        }

        return score;
    }

    /**
     * Select target and card for Give 1 (Gratuities)
     */
    selectGive1Target(player, state) {
        const others = state.getOtherPlayers();

        // Target player closest to winning (fewest cards)
        others.sort((a, b) => a.handSize() - b.handSize());
        const targetPlayer = others[0];

        // Give away the least useful card (highest value of our most abundant color,
        // or an action card we don't need)
        let cardToGive = null;

        // Prefer giving action cards that aren't very useful
        const actionCards = player.hand.filter(c => c.type !== CARD_TYPES.NUMBER && c.type !== CARD_TYPES.VOTE);
        if (actionCards.length > 1) {
            cardToGive = actionCards[0];
        }

        // Fallback: give the highest number card (least strategic value)
        if (!cardToGive) {
            const numberCards = player.hand.filter(c => c.type === CARD_TYPES.NUMBER);
            if (numberCards.length > 0) {
                numberCards.sort((a, b) => b.value - a.value);
                cardToGive = numberCards[0];
            }
        }

        // Last resort: give any card that isn't a vote
        if (!cardToGive) {
            cardToGive = player.hand.find(c => c.type !== CARD_TYPES.VOTE) || player.hand[0];
        }

        const giveCardIndex = player.findCardIndex(cardToGive.id);

        return {
            targetPlayerIndex: targetPlayer.index,
            giveCardIndex: giveCardIndex
        };
    }

    /**
     * Select color when playing Vote card
     */
    selectColorForVote(player) {
        let bestColor = COLOR_LIST[0];
        let bestValue = -1;

        COLOR_LIST.forEach(color => {
            const highCard = player.getHighestNumberCard(color);
            if (highCard) {
                const value = highCard.getVoteValue();
                if (value > bestValue) {
                    bestValue = value;
                    bestColor = color;
                }
            }
        });

        return bestColor;
    }

    /**
     * Decide whether to counter an action
     */
    shouldCounter(player, pendingAction, counterCard, state) {
        const difficulty = state.aiDifficulty;

        // Always counter inflation (draw 2) and motion (skip) — they're harmful
        if (pendingAction.type === 'inflation' || pendingAction.type === 'motion') {
            if (difficulty === AI_DIFFICULTY.EASY) {
                return Math.random() < 0.6; // Easy sometimes doesn't counter
            }
            return true; // Medium and Hard always counter
        }

        // Veto: counter if direction change is bad for us
        if (pendingAction.type === 'veto') {
            if (difficulty === AI_DIFFICULTY.HARD) {
                // Check if the player after us (in reversed direction) is close to winning
                const nextPlayer = state.getPlayerAtOffset(1);
                return nextPlayer.handSize() <= 3;
            }
            return Math.random() < 0.5;
        }

        // Give 1: counter to return the card
        if (pendingAction.type === 'give1') {
            if (difficulty === AI_DIFFICULTY.EASY) {
                return Math.random() < 0.4;
            }
            return true; // Medium/Hard always counter gifts
        }

        return false;
    }

    /**
     * Decide whether AI should use a lobby card to change color
     */
    shouldUseLobbyCard(player, state) {
        if (!player.canUseLobbyCard()) return false;
        const topCard = state.getTopCard();
        const voteBan = state.voteBanTurnsLeft > 0;
        // Use lobby card if AI can't play anything
        const canPlay = player.hand.some(c => {
            if (voteBan && c.type === CARD_TYPES.VOTE) return false;
            return c.canPlayOn(topCard, state.activeColor);
        });
        if (canPlay) return false;
        // Only use if there's a color with multiple playable cards
        return COLOR_LIST.some(color => {
            const count = player.hand.filter(c => c.color === color).length;
            return count >= 2;
        });
    }

    /**
     * Choose the best color for lobby card (most cards of that color)
     */
    chooseBestColor(player, state) {
        let bestColor = COLOR_LIST[0];
        let bestCount = 0;
        COLOR_LIST.forEach(color => {
            const count = player.hand.filter(c => c.color === color).length;
            if (count > bestCount) {
                bestCount = count;
                bestColor = color;
            }
        });
        return bestColor;
    }

    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AIController };
}
