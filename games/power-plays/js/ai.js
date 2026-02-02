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

        // Get playable cards
        const playableCards = player.getPlayableCards(topCard, activeColor);

        if (playableCards.length > 0) {
            // Choose a card to play
            const chosenCard = this.selectCardToPlay(player, playableCards, state);
            const cardIndex = player.findCardIndex(chosenCard.id);

            // Get target info if needed
            let targetInfo = null;
            if (chosenCard.type === CARD_TYPES.SWAP) {
                targetInfo = { targetPlayerIndex: this.selectSwapTarget(player, state) };
            } else if (chosenCard.type === CARD_TYPES.VOTE) {
                targetInfo = { color: this.selectColorForVote(player) };
            }

            // Play the card
            await this.game.playCard(playerIndex, cardIndex, targetInfo);

            // Check if should call Power!
            if (player.handSize() === 1 && !player.hasCalledPower) {
                await this.delay(300);
                if (this.shouldCallPower(state)) {
                    this.game.callPower(playerIndex);
                }
            }
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
            case CARD_TYPES.DRAW_2:
                score += 20;
                // Extra value if next player has few cards
                if (nextPlayer.handSize() <= 2) {
                    score += 15;
                }
                break;

            case CARD_TYPES.SKIP:
            case CARD_TYPES.REVERSE:
                score += 10;
                // Better when next player is close to winning
                if (nextPlayer.handSize() <= 3) {
                    score += 10;
                }
                break;

            case CARD_TYPES.SWAP:
                // Only valuable if we have more cards than someone else
                const minOtherHand = Math.min(
                    ...state.getOtherPlayers().map(p => p.handSize())
                );
                if (player.handSize() > minOtherHand + 2) {
                    score += 25;
                } else {
                    score -= 10; // Don't swap if we'd be worse off
                }
                break;

            case CARD_TYPES.BLOCK:
                // Save block cards for defense
                score -= 5;
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
            // Prefer not to empty a color completely
            if (card.color && colorCounts[card.color] === 1) {
                score -= 3;
            }
        }

        return score;
    }

    /**
     * Select target for Swap Hands
     */
    selectSwapTarget(player, state) {
        const others = state.getOtherPlayers();

        // Target player with fewest cards
        others.sort((a, b) => a.handSize() - b.handSize());

        return others[0].index;
    }

    /**
     * Select color when playing Vote card
     */
    selectColorForVote(player) {
        // Choose the color where we have the highest card
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
     * Decide whether to call Power!
     */
    shouldCallPower(state) {
        const difficulty = state.aiDifficulty;

        // Easy: sometimes forget
        if (difficulty === AI_DIFFICULTY.EASY) {
            return Math.random() > 0.3; // 30% chance to forget
        }

        // Medium and Hard: always call
        return true;
    }

    /**
     * Decide whether to challenge another player's Power! call
     */
    shouldChallengePower(targetPlayer, state) {
        // Only challenge if target hasn't called Power! and has 1 card
        if (!targetPlayer.canBeCaughtForPower()) {
            return false;
        }

        const difficulty = state.aiDifficulty;

        // Easy: rarely catches
        if (difficulty === AI_DIFFICULTY.EASY) {
            return Math.random() < 0.2;
        }

        // Medium: catches half the time
        if (difficulty === AI_DIFFICULTY.MEDIUM) {
            return Math.random() < 0.5;
        }

        // Hard: almost always catches
        return Math.random() < 0.9;
    }

    /**
     * Decide whether to activate a lobby card
     */
    shouldActivateLobby(player, lobbyType, state) {
        const difficulty = state.aiDifficulty;

        // Easy: random decision
        if (difficulty === AI_DIFFICULTY.EASY) {
            return Math.random() < 0.5;
        }

        // Medium: usually activate
        if (difficulty === AI_DIFFICULTY.MEDIUM) {
            return Math.random() < 0.8;
        }

        // Hard: strategic decision based on game state
        // Use Bill (draw bonus) when hand is small
        if (lobbyType === LOBBY_TYPES.BILL) {
            return player.handSize() <= 3;
        }

        // Use Court Case when opponent is close to winning
        if (lobbyType === LOBBY_TYPES.COURT_CASE) {
            const others = state.getOtherPlayers();
            const anyCloseToWinning = others.some(p => p.handSize() <= 2);
            return anyCloseToWinning;
        }

        return true;
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
