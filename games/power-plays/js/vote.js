/**
 * Power Plays - Vote Manager
 * Handles the Vote card mechanic
 */

/**
 * Manages voting when a Vote card is played
 */
class VoteManager {
    constructor(game) {
        this.game = game;
    }

    /**
     * Start a vote
     */
    async initiateVote(initiatorIndex, color) {
        const state = this.game.state;

        // Start vote in state
        state.startVote(initiatorIndex, color);

        // Collect votes from all players
        await this.collectVotes(color);

        // Resolve the vote
        const result = this.resolveVote();

        // Apply rewards if there's a winner
        if (result.winner !== null) {
            this.applyVoteReward(result.winner);
        }

        // End the vote
        state.endVote(result.winner);

        // Show results via UI
        await this.game.ui.showVoteResults(result);

        return result;
    }

    /**
     * Collect votes from all players
     */
    async collectVotes(color) {
        const state = this.game.state;

        for (const player of state.players) {
            let voteCard = null;

            if (player.isHuman) {
                // Get vote from human player
                voteCard = await this.game.ui.promptVoteCard(player, color);
            } else {
                // Get vote from AI
                voteCard = this.getAIVote(player, color);
            }

            // Submit the vote
            if (voteCard) {
                // Remove the card from player's hand
                player.removeCardById(voteCard.id);
            }
            state.submitVote(player.index, voteCard);
        }
    }

    /**
     * AI vote selection
     */
    getAIVote(player, color) {
        const cardsOfColor = player.getCardsOfColor(color);

        if (cardsOfColor.length === 0) {
            return null; // No card to vote with
        }

        const difficulty = this.game.state.aiDifficulty;

        // Easy: random card
        if (difficulty === AI_DIFFICULTY.EASY) {
            return cardsOfColor[Math.floor(Math.random() * cardsOfColor.length)];
        }

        // Medium: play highest card
        if (difficulty === AI_DIFFICULTY.MEDIUM) {
            return player.getHighestNumberCard(color);
        }

        // Hard: strategic - consider if we can win
        const highestCard = player.getHighestNumberCard(color);
        const highestValue = highestCard ? highestCard.getVoteValue() : 0;

        // If we have a weak hand, save our best card
        if (highestValue < 5 && cardsOfColor.length > 1) {
            // Play lowest card to save the better one
            return player.getLowestNumberCard(color);
        }

        // Otherwise, play to win
        return highestCard;
    }

    /**
     * Resolve the vote and determine winner
     */
    resolveVote() {
        const state = this.game.state;
        const { color, votes } = state.activeVote;

        // Collect all submitted votes with values
        const results = [];

        for (const [playerIndex, vote] of Object.entries(votes)) {
            if (vote.submitted && vote.card !== null) {
                results.push({
                    playerIndex: parseInt(playerIndex),
                    player: state.getPlayer(parseInt(playerIndex)),
                    card: vote.card,
                    value: vote.card.getVoteValue()
                });
            }
        }

        // No participants
        if (results.length === 0) {
            return {
                winner: null,
                reason: 'no_participants',
                message: 'No one had a card of that color!',
                votes: votes
            };
        }

        // Sort by value (highest first)
        results.sort((a, b) => b.value - a.value);

        const highestValue = results[0].value;
        const tied = results.filter(r => r.value === highestValue);

        // Clear winner
        if (tied.length === 1) {
            return {
                winner: tied[0].playerIndex,
                winnerName: tied[0].player.name,
                winningCard: tied[0].card,
                value: highestValue,
                reason: 'highest_value',
                message: `${tied[0].player.name} wins the vote with ${highestValue}!`,
                votes: votes,
                results: results
            };
        }

        // Tie-breaker: fewer cards in hand wins
        const tiedWithHandSize = tied.map(t => ({
            ...t,
            handSize: t.player.handSize()
        }));

        tiedWithHandSize.sort((a, b) => a.handSize - b.handSize);

        const lowestHandSize = tiedWithHandSize[0].handSize;
        const stillTied = tiedWithHandSize.filter(t => t.handSize === lowestHandSize);

        if (stillTied.length === 1) {
            return {
                winner: stillTied[0].playerIndex,
                winnerName: stillTied[0].player.name,
                winningCard: stillTied[0].card,
                value: highestValue,
                reason: 'fewer_cards',
                message: `${stillTied[0].player.name} wins the tie with fewer cards!`,
                votes: votes,
                results: results
            };
        }

        // Complete tie - no winner
        return {
            winner: null,
            reason: 'complete_tie',
            message: 'Complete tie! No winner.',
            votes: votes,
            results: results
        };
    }

    /**
     * Apply reward for winning a vote
     * Winner gains another lobby card matching their existing type
     */
    applyVoteReward(winnerIndex) {
        const state = this.game.state;
        const winner = state.getPlayer(winnerIndex);

        // Find the type of lobby card the winner has (used or unused)
        let rewardType = null;

        if (winner.lobbyCards.some(lc => lc.type === LOBBY_TYPES.BILL)) {
            rewardType = LOBBY_TYPES.BILL;
        } else if (winner.lobbyCards.some(lc => lc.type === LOBBY_TYPES.COURT_CASE)) {
            rewardType = LOBBY_TYPES.COURT_CASE;
        }

        if (rewardType) {
            winner.addLobbyCard(rewardType);
            this.game.ui.showMessage(`${winner.name} gained a ${LOBBY_CARDS[rewardType].name} lobby card!`);
        }

        state.recordAction({
            action: 'vote_won',
            winner: winnerIndex,
            lobbyCardRewarded: rewardType
        });
    }

    /**
     * Get vote summary for display
     */
    getVoteSummary() {
        const state = this.game.state;
        if (!state.activeVote) return null;

        const { color, votes, winner } = state.activeVote;

        const summary = {
            color: color,
            participants: [],
            winner: winner,
            winnerName: winner !== null ? state.getPlayer(winner).name : null
        };

        for (const [playerIndex, vote] of Object.entries(votes)) {
            const player = state.getPlayer(parseInt(playerIndex));
            summary.participants.push({
                name: player.name,
                card: vote.card,
                value: vote.card ? vote.card.getVoteValue() : null,
                hasCard: vote.card !== null
            });
        }

        return summary;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { VoteManager };
}
