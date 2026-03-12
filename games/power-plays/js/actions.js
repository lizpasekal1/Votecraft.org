/**
 * Power Plays - Action Resolver
 * Handles card effect resolution
 *
 * Actions are DEFERRED when they have counter opportunities:
 *   Motion, Veto, Inflation, Give 1 → set a pendingAction on state
 * The targeted player gets a counter opportunity at the start of their turn.
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
                return { type: 'number', value: card.value };

            case CARD_TYPES.MOTION:
                return this.resolveMotion(player);

            case CARD_TYPES.VETO:
                return this.resolveVeto(player);

            case CARD_TYPES.INFLATION:
                return this.resolveInflation(player);

            case CARD_TYPES.GIVE_1:
                return await this.resolveGive1(player, targetInfo);

            case CARD_TYPES.VOTE:
                return await this.resolveVote(player, targetInfo);

            default:
                return { type: 'unknown' };
        }
    }

    /**
     * Motion (Reverse) — reverses direction immediately, but target may counter
     */
    resolveMotion(player) {
        const state = this.game.state;

        // Reverse direction immediately
        state.reverseDirection();

        // The "target" is the next player in the NEW direction
        const targetPlayer = state.getPlayerAtOffset(1);

        // Set pending action so target can counter (reverse back)
        state.pendingAction = {
            type: 'motion',
            sourceIndex: player.index,
            targetIndex: targetPlayer.index
        };

        state.lastAction = { type: 'motion' };

        // In 2-player game, motion acts like skip (same as UNO reverse in 2p)
        if (state.players.length === 2) {
            return {
                type: 'motion',
                newDirection: state.direction,
                message: 'Direction reversed! (acts as skip in 2-player)'
            };
        }

        return {
            type: 'motion',
            newDirection: state.direction,
            message: `Direction reversed! Now going ${state.direction === 1 ? 'clockwise' : 'counter-clockwise'}`
        };
    }

    /**
     * Veto (Skip) — deferred: next player may counter with Yellow Veto
     */
    resolveVeto(player) {
        const state = this.game.state;
        const targetPlayer = state.getPlayerAtOffset(1);

        // Defer the skip — set a pending action for the target to counter
        state.pendingAction = {
            type: 'veto',
            sourceIndex: player.index,
            targetIndex: targetPlayer.index
        };

        state.lastAction = { type: 'veto' };

        return {
            type: 'veto',
            targetPlayer: targetPlayer.index,
            message: `${player.name} played Veto on ${targetPlayer.name}!`
        };
    }

    /**
     * Inflation (Draw Two) — deferred: target may counter with Green Inflation
     */
    resolveInflation(player) {
        const state = this.game.state;
        const targetPlayer = state.getPlayerAtOffset(1);

        // Defer the draw — set pending action
        state.pendingAction = {
            type: 'inflation',
            sourceIndex: player.index,
            targetIndex: targetPlayer.index
        };

        state.lastAction = { type: 'inflation', target: targetPlayer.index };

        return {
            type: 'inflation',
            targetPlayer: targetPlayer.index,
            message: `${player.name} played Inflation on ${targetPlayer.name}!`
        };
    }

    /**
     * Give 1 (Gratuities) — give one card to another player (deferred)
     */
    async resolveGive1(player, targetInfo) {
        const state = this.game.state;
        let targetPlayer;
        let cardToGive;

        if (targetInfo && targetInfo.targetPlayerIndex !== undefined && targetInfo.giveCardIndex !== undefined) {
            targetPlayer = state.getPlayer(targetInfo.targetPlayerIndex);
            cardToGive = player.getCard(targetInfo.giveCardIndex);
        } else {
            // Need to get target and card from UI
            const result = await this.game.ui.promptGive1(
                player,
                state.getOtherPlayers()
            );
            if (!result) {
                return { type: 'give1', cancelled: true };
            }
            targetPlayer = result.targetPlayer;
            cardToGive = result.card;
        }

        if (!targetPlayer || !cardToGive) {
            return { type: 'give1', cancelled: true };
        }

        // Check if giver has a duplicate (two copies of the same card)
        const hasDuplicate = player.hand.some(c =>
            c.id !== cardToGive.id &&
            c.color === cardToGive.color &&
            c.type === cardToGive.type &&
            c.value === cardToGive.value
        );

        // Remove the card from giver's hand but hold it in pending
        const giveCardIndex = player.findCardIndex(cardToGive.id);
        const removedCard = player.removeCard(giveCardIndex);

        // Set pending action — card transfer is deferred until counter opportunity passes
        state.pendingAction = {
            type: 'give1',
            sourceIndex: player.index,
            targetIndex: targetPlayer.index,
            giveCard: removedCard,
            hasDuplicate: hasDuplicate
        };

        state.lastAction = { type: 'give1', target: targetPlayer.index };

        let message = `${player.name} offers a card to ${targetPlayer.name}!`;
        return {
            type: 'give1',
            targetPlayer: targetPlayer.index,
            hasDuplicate,
            message
        };
    }

    /**
     * Apply a pending action when the target does NOT counter
     */
    applyPendingAction(pendingAction) {
        const state = this.game.state;

        switch (pendingAction.type) {
            case 'motion':
                // Direction already reversed, nothing more to do
                // In 2-player, the target is effectively skipped
                if (state.players.length === 2) {
                    // Target's turn ends immediately (skip effect)
                }
                break;

            case 'veto':
                // Skip the target — their turn ends immediately
                // (handled in game.js by ending the turn)
                break;

            case 'inflation':
                // Target draws 2 cards
                const targetPlayer = state.getPlayer(pendingAction.targetIndex);
                const drawnCards = state.drawCards(2);
                targetPlayer.addCards(drawnCards);
                this.game.ui.showMessage(`${targetPlayer.name} drew 2 cards!`);
                break;

            case 'give1':
                // Transfer the card to the target
                const receiver = state.getPlayer(pendingAction.targetIndex);
                receiver.addCards([pendingAction.giveCard]);
                // If giver had duplicate, they earn a Lobby Card
                if (pendingAction.hasDuplicate) {
                    const giver = state.getPlayer(pendingAction.sourceIndex);
                    giver.earnLobbyCard();
                    this.game.ui.showMessage(`${giver.name} earned a Lobby Card (duplicate Gratuities)!`);
                }
                break;
        }
    }

    /**
     * Apply a counter — the target plays the counter card and earns Lobby Cards.
     * Any matching action type earns 1; the specific bonus color earns 2.
     */
    applyCounter(pendingAction, counterPlayer, counterCard) {
        const state = this.game.state;
        const counterReq = COUNTER_MAP[pendingAction.type];
        const isBonusColor = counterCard && counterReq && counterCard.color === counterReq.color;
        const lobbyReward = isBonusColor ? 2 : 1;
        const rewardText = lobbyReward === 2 ? '2 Lobby Cards earned!' : 'Lobby Card earned!';

        switch (pendingAction.type) {
            case 'motion':
                state.reverseDirection();
                this.game.ui.showMessage(`${counterPlayer.name} countered the Motion! Direction restored! ${rewardText}`);
                break;

            case 'veto':
                this.game.ui.showMessage(`${counterPlayer.name} countered the Veto! ${rewardText}`);
                break;

            case 'inflation':
                this.game.ui.showMessage(`${counterPlayer.name} countered the Inflation! ${rewardText}`);
                break;

            case 'give1':
                const giver = state.getPlayer(pendingAction.sourceIndex);
                giver.addCards([pendingAction.giveCard]);
                this.game.ui.showMessage(`${counterPlayer.name} countered the Gratuities! Card returned! ${rewardText}`);
                break;
        }

        for (let i = 0; i < lobbyReward; i++) {
            counterPlayer.earnLobbyCard();
        }
    }

    /**
     * Check if a player has a valid counter card in their hand.
     * Any card of the same action type can counter. Prefers the bonus color.
     */
    getCounterCard(player, pendingAction) {
        const counterReq = COUNTER_MAP[pendingAction.type];
        if (!counterReq) return null;

        // Prefer the bonus color card (earns 2 lobby cards)
        const bonusCard = player.hand.find(card =>
            card.type === counterReq.type && card.color === counterReq.color
        );
        if (bonusCard) return bonusCard;

        // Any card of the same action type can counter (earns 1 lobby card)
        return player.hand.find(card =>
            card.type === counterReq.type
        ) || null;
    }

    /**
     * Vote card — triggers voting mechanic
     */
    async resolveVote(player, targetInfo) {
        const state = this.game.state;
        let chosenColor;

        if (targetInfo && targetInfo.color) {
            chosenColor = targetInfo.color;
        } else {
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

        // Vote cards banned (Court Case effect)
        if (card.type === CARD_TYPES.VOTE && state.voteBanTurnsLeft > 0) {
            return { valid: false, reason: 'Vote cards are banned this round (Court Case)' };
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
