/**
 * Power Plays - Action Resolver
 * Handles card effect resolution
 */

/**
 * Resolves card effects when played
 */
class ActionResolver {
    constructor(game) {
        this.game = game;
    }

    /**
     * Resolve a played card's effect
     */
    async resolve(card, player, targetInfo = null) {
        const state = this.game.state;

        // Record the action
        state.recordAction({
            action: 'play',
            card: card.toJSON(),
            cardType: card.type
        });

        // Handle based on card type
        switch (card.type) {
            case CARD_TYPES.NUMBER:
                // Numbers have no special effect
                return { type: 'number', value: card.value };

            case CARD_TYPES.SKIP:
                return this.resolveSkip();

            case CARD_TYPES.REVERSE:
                return this.resolveReverse();

            case CARD_TYPES.DRAW_2:
                return this.resolveDraw2();

            case CARD_TYPES.SWAP:
                return await this.resolveSwap(player, targetInfo);

            case CARD_TYPES.BLOCK:
                return this.resolveBlock();

            case CARD_TYPES.VOTE:
                return await this.resolveVote(player, targetInfo);

            default:
                return { type: 'unknown' };
        }
    }

    /**
     * Skip - next player loses their turn
     */
    resolveSkip() {
        const state = this.game.state;
        state.skipNext = true;
        state.lastAction = { type: 'skip' };

        const skippedPlayer = state.getPlayerAtOffset(1);

        return {
            type: 'skip',
            skippedPlayer: skippedPlayer.index,
            message: `${skippedPlayer.name} was skipped!`
        };
    }

    /**
     * Reverse - change play direction
     */
    resolveReverse() {
        const state = this.game.state;
        state.reverseDirection();
        state.lastAction = { type: 'reverse' };

        // In 2-player game, reverse acts like skip
        if (state.players.length === 2) {
            state.skipNext = true;
            return {
                type: 'reverse',
                newDirection: state.direction,
                message: 'Direction reversed! (acts as skip in 2-player)'
            };
        }

        return {
            type: 'reverse',
            newDirection: state.direction,
            message: `Direction reversed! Now going ${state.direction === 1 ? 'clockwise' : 'counter-clockwise'}`
        };
    }

    /**
     * Draw 2 - next player draws 2 cards and loses turn
     */
    resolveDraw2() {
        const state = this.game.state;
        const targetPlayer = state.getPlayerAtOffset(1);

        // Draw 2 cards for the target
        const drawnCards = state.drawCards(2);
        targetPlayer.addCards(drawnCards);

        // Skip their turn
        state.skipNext = true;
        state.lastAction = { type: 'draw2', target: targetPlayer.index };

        return {
            type: 'draw2',
            targetPlayer: targetPlayer.index,
            cardsDrawn: drawnCards.length,
            message: `${targetPlayer.name} drew 2 cards and was skipped!`
        };
    }

    /**
     * Swap Hands - trade hands with another player
     */
    async resolveSwap(player, targetInfo) {
        const state = this.game.state;
        let targetPlayer;

        if (targetInfo && targetInfo.targetPlayerIndex !== undefined) {
            targetPlayer = state.getPlayer(targetInfo.targetPlayerIndex);
        } else {
            // Need to get target from UI
            targetPlayer = await this.game.ui.promptTargetPlayer(
                state.getOtherPlayers(),
                'Choose a player to swap hands with'
            );
        }

        if (!targetPlayer) {
            return { type: 'swap', cancelled: true };
        }

        // Swap the hands
        const tempHand = player.hand;
        player.hand = targetPlayer.hand;
        targetPlayer.hand = tempHand;

        // Reset Power! status for both
        player.hasCalledPower = false;
        targetPlayer.hasCalledPower = false;

        state.lastAction = { type: 'swap', target: targetPlayer.index };

        return {
            type: 'swap',
            targetPlayer: targetPlayer.index,
            message: `${player.name} swapped hands with ${targetPlayer.name}!`
        };
    }

    /**
     * Block - cancel the last action (if applicable)
     */
    resolveBlock() {
        const state = this.game.state;
        const lastAction = state.lastAction;

        // Check if there's something to block
        if (!lastAction || !this.isBlockable(lastAction)) {
            return {
                type: 'block',
                blocked: false,
                message: 'Nothing to block!'
            };
        }

        // Undo the last action
        const undoResult = this.undoAction(lastAction);

        state.lastAction = { type: 'block' };

        return {
            type: 'block',
            blocked: true,
            blockedAction: lastAction.type,
            message: `Blocked the ${lastAction.type}!`,
            undoResult
        };
    }

    /**
     * Check if an action can be blocked
     */
    isBlockable(action) {
        const blockableTypes = ['skip', 'draw2', 'reverse', 'swap'];
        return blockableTypes.includes(action.type);
    }

    /**
     * Undo a previous action
     */
    undoAction(action) {
        const state = this.game.state;

        switch (action.type) {
            case 'skip':
                state.skipNext = false;
                return { undone: 'skip' };

            case 'draw2':
                // Return the drawn cards (can't easily undo this perfectly)
                // For simplicity, we just cancel the skip
                state.skipNext = false;
                return { undone: 'draw2_skip' };

            case 'reverse':
                state.reverseDirection(); // Reverse back
                if (state.players.length === 2) {
                    state.skipNext = false;
                }
                return { undone: 'reverse' };

            case 'swap':
                // Can't easily undo swap - would need to track original hands
                return { undone: 'swap_partial' };

            default:
                return { undone: false };
        }
    }

    /**
     * Vote card - triggers voting mechanic
     */
    async resolveVote(player, targetInfo) {
        const state = this.game.state;
        let chosenColor;

        if (targetInfo && targetInfo.color) {
            chosenColor = targetInfo.color;
        } else {
            // Need to get color from UI
            chosenColor = await this.game.ui.promptColorChoice();
        }

        if (!chosenColor) {
            return { type: 'vote', cancelled: true };
        }

        // Set the active color
        state.setActiveColor(chosenColor);
        state.lastAction = { type: 'vote', color: chosenColor };

        // Start the vote
        await this.game.voteManager.initiateVote(player.index, chosenColor);

        return {
            type: 'vote',
            color: chosenColor,
            message: `${player.name} called a vote! Color: ${chosenColor}`
        };
    }

    /**
     * Validate if a play is legal
     */
    validatePlay(card, player) {
        const state = this.game.state;

        // Must be player's turn
        if (state.currentPlayerIndex !== player.index) {
            return { valid: false, reason: 'Not your turn' };
        }

        // Must be in playing phase
        if (state.phase !== GAME_PHASES.PLAYING) {
            return { valid: false, reason: 'Cannot play during this phase' };
        }

        // Card must be playable
        const topCard = state.getTopCard();
        if (topCard && !card.canPlayOn(topCard, state.activeColor)) {
            return { valid: false, reason: 'Card does not match color or symbol' };
        }

        return { valid: true };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ActionResolver };
}
