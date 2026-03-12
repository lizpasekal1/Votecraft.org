/**
 * Power Plays - Main Game Orchestrator
 */

/**
 * Main game class that coordinates all systems
 */
class PowerPlaysGame {
    constructor() {
        this.state = new GameState();
        this.deck = null;
        this.actionResolver = new ActionResolver(this);
        this.voteManager = new VoteManager(this);
        this.ai = new AIController(this);
        this.ui = null; // Set after DOM ready
        this.isPaused = false;

        // Undo support
        this.undoSnapshot = null;

        // Event listeners
        this.listeners = {};
    }

    /**
     * Toggle pause state
     */
    togglePause() {
        this.isPaused = !this.isPaused;
        this.emit('pauseToggled', { isPaused: this.isPaused });

        // If unpausing and it's an AI turn, resume AI
        if (!this.isPaused) {
            const player = this.state.getCurrentPlayer();
            if (player && !player.isHuman && !this.state.gameOver) {
                this.ai.takeTurn(player.index);
            }
        }

        return this.isPaused;
    }

    /**
     * Initialize the game
     */
    init(uiManager) {
        this.ui = uiManager;
        this.ui.init();
    }

    /**
     * Start a new game
     */
    async startGame(config) {
        const {
            playerCount = 2,
            mode = GAME_MODES.SINGLE_PLAYER,
            difficulty = AI_DIFFICULTY.MEDIUM,
            playerNames = []
        } = config;

        // Initialize state
        this.state.initGame(playerCount, mode, 0);
        this.state.aiDifficulty = difficulty;

        // Set custom player names if provided
        playerNames.forEach((name, i) => {
            if (this.state.players[i] && name) {
                this.state.players[i].name = name;
            }
        });

        // Create and shuffle deck
        this.deck = Deck.createStandardDeck();
        this.deck.shuffle();

        // Deal cards
        this.dealCards();

        // Set up play pile
        this.setupPlayPile();

        // Deal lobby cards to all players
        await this.dealLobbyCards();

        // Start playing
        this.state.phase = GAME_PHASES.PLAYING;

        // Emit game started event
        this.emit('gameStarted', { playerCount, mode });

        // Render initial state
        this.ui.render();

        // Start first turn
        await this.startTurn();
    }

    /**
     * Deal lobby cards - each player gets one secret lobby card
     */
    async dealLobbyCards() {
        for (const player of this.state.players) {
            if (player.isHuman) {
                const lobbyType = await this.ui.promptLobbyCardChoice(player);
                player.addLobbyCard(lobbyType);
            } else {
                const lobbyType = Math.random() < 0.5 ? LOBBY_TYPES.BILL : LOBBY_TYPES.COURT_CASE;
                player.addLobbyCard(lobbyType);
            }
        }
    }

    /**
     * Deal initial cards to all players
     */
    dealCards() {
        const handSize = GAME_CONFIG.STARTING_HAND_SIZE;

        this.state.players.forEach(player => {
            const cards = this.deck.draw(handSize);
            player.addCards(cards);
            player.sortHand();
        });

        // Set remaining deck as draw pile
        this.state.drawPile = this.deck.getAll();

        // Ensure human player (index 0) has at least one vote card
        const humanPlayer = this.state.players[0];
        const hasVoteCard = humanPlayer.hand.some(card => card.type === CARD_TYPES.VOTE);

        if (!hasVoteCard) {
            const voteCardIndex = this.state.drawPile.findIndex(card => card.type === CARD_TYPES.VOTE);

            if (voteCardIndex !== -1) {
                const voteCard = this.state.drawPile.splice(voteCardIndex, 1)[0];
                const nonVoteCard = humanPlayer.hand.find(card => card.type !== CARD_TYPES.VOTE);

                if (nonVoteCard) {
                    humanPlayer.removeCard(humanPlayer.findCardIndex(nonVoteCard.id));
                    this.state.drawPile.push(nonVoteCard);
                    humanPlayer.addCards([voteCard]);
                    humanPlayer.sortHand();

                    // Shuffle draw pile
                    for (let i = this.state.drawPile.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [this.state.drawPile[i], this.state.drawPile[j]] =
                            [this.state.drawPile[j], this.state.drawPile[i]];
                    }
                }
            }
        }
    }

    /**
     * Set up initial play pile
     */
    setupPlayPile() {
        let startCard = this.state.drawCards(1)[0];

        while (startCard.isAction()) {
            this.state.drawPile.unshift(startCard);
            for (let i = this.state.drawPile.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [this.state.drawPile[i], this.state.drawPile[j]] =
                    [this.state.drawPile[j], this.state.drawPile[i]];
            }
            startCard = this.state.drawCards(1)[0];
        }

        this.state.playPile = [startCard];
        this.state.activeColor = startCard.color;
    }

    /**
     * Start a turn
     */
    async startTurn() {
        const state = this.state;
        const player = state.getCurrentPlayer();

        state.turnNumber++;

        // Clear undo when human's next turn starts (undo window is over)
        if (player.isHuman && player.index === 0) {
            this.clearUndo();
        }

        // Check if this player is marked to skip (from Court Case)
        if (player.skipNextTurn) {
            player.skipNextTurn = false;
            this.ui.showMessage(`${player.name} skips their turn! (Court Case)`, 1500);
            this.ui.render();
            await new Promise(r => setTimeout(r, 1200));
            await this.advanceToNextTurn();
            return;
        }

        // Reset turn-based state
        player.resetTurnState();

        // Decrement vote ban counter
        if (this.state.voteBanTurnsLeft > 0) {
            this.state.voteBanTurnsLeft--;
        }

        // Emit turn started
        this.emit('turnStarted', {
            playerIndex: player.index,
            playerName: player.name
        });

        // ─── Counter opportunity check ───
        if (state.pendingAction && state.pendingAction.targetIndex === player.index) {
            const handled = await this.handleCounterOpportunity(player, state.pendingAction);
            // handled.countered = true/false
            // handled.turnEnds = true if the player's turn should end (motion/inflation not countered)

            state.pendingAction = null;

            if (handled.turnEnds) {
                // Player's turn is over (they were skipped or drew cards)
                this.ui.render();
                await this.advanceToNextTurn();
                return;
            }
            // Otherwise player keeps their turn (either countered or veto/give1 that doesn't skip)
        }

        // Handle pass & play transition for local multiplayer
        if (state.mode === GAME_MODES.LOCAL_MULTIPLAYER && player.isHuman) {
            await this.ui.showPassAndPlayScreen(player.name);
        }

        // Render the game state
        this.ui.render();

        // If AI player, let AI take turn (unless paused)
        if (!player.isHuman && !this.isPaused) {
            await this.ai.takeTurn(player.index);
        }
    }

    /**
     * Handle counter opportunity for the current player
     * Returns { countered: bool, turnEnds: bool }
     */
    async handleCounterOpportunity(player, pendingAction) {
        const counterCard = this.actionResolver.getCounterCard(player, pendingAction);

        let willCounter = false;

        if (counterCard) {
            if (player.isHuman) {
                // Show counter opportunity to human
                willCounter = await this.ui.promptCounterOpportunity(
                    player, pendingAction, counterCard
                );
            } else {
                // AI decides
                willCounter = this.ai.shouldCounter(player, pendingAction, counterCard, this.state);
            }
        }

        if (willCounter && counterCard) {
            // Play the counter card onto the pile
            const cardIndex = player.findCardIndex(counterCard.id);
            player.removeCard(cardIndex);

            // Add counter card to play pile
            this.state.playCard(counterCard);

            // Animate counter card play
            await this.ui.animateCardPlay(counterCard, player.index);

            // Apply counter effects
            this.actionResolver.applyCounter(pendingAction, player, counterCard);

            this.ui.render();

            // Check win condition after counter play
            if (player.handSize() === 0) {
                await this.endGame(player);
                return { countered: true, turnEnds: true };
            }

            // Counter succeeded — player keeps their turn
            return { countered: true, turnEnds: false };
        }

        // No counter — apply the original action
        this.actionResolver.applyPendingAction(pendingAction);

        // Veto ends the target's turn (skip)
        if (pendingAction.type === 'veto') {
            return { countered: false, turnEnds: true };
        }

        // Inflation: player draws but keeps their turn
        if (pendingAction.type === 'inflation') {
            return { countered: false, turnEnds: false };
        }

        // Motion in 2-player acts as skip
        if (pendingAction.type === 'motion' && this.state.players.length === 2) {
            return { countered: false, turnEnds: true };
        }

        // Motion (multi-player) and Give 1 don't end the turn
        return { countered: false, turnEnds: false };
    }

    /**
     * Play a card (called from UI or AI)
     */
    async playCard(playerIndex, cardIndex, targetInfo = null) {
        const state = this.state;
        const player = state.getPlayer(playerIndex);
        const card = player.getCard(cardIndex);

        // Validate
        const validation = this.actionResolver.validatePlay(card, player);
        if (!validation.valid) {
            this.emit('invalidPlay', { reason: validation.reason });
            return false;
        }

        // Save undo snapshot for human player
        if (playerIndex === 0) {
            this.saveUndoSnapshot();
        }

        // Remove card from hand
        player.removeCard(cardIndex);

        // Update display before animation so card disappears from hand
        if (playerIndex === 0) {
            this.ui.renderPlayerHand();
        } else {
            this.ui.renderOpponents();
        }

        // Animate card play (card flies to pile)
        await this.ui.animateCardPlay(card, playerIndex);

        // Add to play pile after animation
        state.playCard(card);

        // Pause on vote cards so players can see them
        if (card.type === CARD_TYPES.VOTE) {
            this.ui.render();
            await new Promise(resolve => setTimeout(resolve, 1500));
        }

        // Resolve card effects
        const result = await this.actionResolver.resolve(card, player, targetInfo);

        // Emit card played
        this.emit('cardPlayed', {
            playerIndex,
            card: card.toJSON(),
            result
        });

        // Check win condition
        if (player.handSize() === 0) {
            await this.endGame(player);
            return true;
        }

        // Update UI
        this.ui.render();

        // Advance to next turn
        await this.advanceToNextTurn();

        return true;
    }

    /**
     * Draw a card (called from UI or AI)
     */
    async drawCard(playerIndex) {
        const state = this.state;
        const player = state.getPlayer(playerIndex);

        // Validate it's the player's turn
        if (state.currentPlayerIndex !== playerIndex) {
            return false;
        }

        // Save undo snapshot for human player
        if (playerIndex === 0) {
            this.saveUndoSnapshot();
        }

        // Draw a card
        const drawnCards = state.drawCards(1);
        if (drawnCards.length === 0) {
            return false;
        }

        const drawnCard = drawnCards[0];
        player.addCards(drawnCard);

        // Animate draw
        await this.ui.animateCardDraw(drawnCard, playerIndex);

        // Record action
        state.recordAction({
            action: 'draw',
            cardDrawn: true
        });

        // Emit card drawn
        this.emit('cardDrawn', {
            playerIndex,
            canPlayDrawn: drawnCard.canPlayOn(state.getTopCard(), state.activeColor)
        });

        // Check if drawn card can be played
        const canPlayDrawn = drawnCard.canPlayOn(state.getTopCard(), state.activeColor) &&
            !(drawnCard.type === CARD_TYPES.VOTE && state.voteBanTurnsLeft > 0);
        if (canPlayDrawn) {
            if (player.isHuman) {
                this.ui.highlightPlayableCard(drawnCard);
            } else {
                const voteBan = state.voteBanTurnsLeft > 0;
                const playableCards = player.getPlayableCards(state.getTopCard(), state.activeColor, voteBan);
                if (playableCards.length > 0) {
                    const cardToPlay = this.ai.selectCardToPlay(player, playableCards, state);
                    const cardIdx = player.findCardIndex(cardToPlay.id);
                    await this.playCard(playerIndex, cardIdx);
                    return true;
                }
            }
        }

        if (player.isHuman) {
            this.ui.render();
            return true;
        }

        // AI ends turn if can't play drawn card
        await this.advanceToNextTurn();
        return true;
    }

    /**
     * End turn and advance to next player
     */
    async advanceToNextTurn() {
        const state = this.state;

        // Note: skipNext is no longer used for motion/inflation (handled by pendingAction)
        // but kept for edge cases
        if (state.skipNext) {
            state.advancePlayer();
            state.skipNext = false;

            this.emit('playerSkipped', {
                skippedPlayer: state.currentPlayerIndex
            });
        }

        // Advance to next player
        state.advancePlayer();

        // Start next turn
        await this.startTurn();
    }

    /**
     * Use a lobby card to change the active color (takes the player's whole turn)
     */
    async useLobbyCardForColor(player) {
        if (!player.canUseLobbyCard()) return false;

        // Save undo snapshot for human player
        if (player.isHuman) {
            this.saveUndoSnapshot();
        }

        let chosenColor;
        if (player.isHuman) {
            chosenColor = await this.ui.promptColorChoice();
        } else {
            chosenColor = this.ai.chooseBestColor(player, this.state);
        }

        const lobbyType = player.useLobbyCard();
        this.state.activeColor = chosenColor;

        this.emit('lobbyCardActivated', {
            playerIndex: player.index,
            color: chosenColor
        });

        this.ui.showMessage(`${player.name} used a Lobby Card! Color changed to ${chosenColor.toUpperCase()}.`, 2000);

        // Apply type-specific bonus
        if (lobbyType === LOBBY_TYPES.BILL) {
            await this.applyBillBonus(player);
        } else if (lobbyType === LOBBY_TYPES.COURT_CASE) {
            await this.applyCourtCaseBonus(player);
        }

        this.ui.render();
        await this.advanceToNextTurn();
        return true;
    }

    /**
     * Bill bonus: draw 1 card yourself or force an opponent to draw 1
     */
    async applyBillBonus(player) {
        let drawSelf;
        if (player.isHuman) {
            drawSelf = await this.ui.promptBillChoice();
        } else {
            // AI: force opponent to draw if anyone is close to winning
            const others = this.state.getOtherPlayers();
            drawSelf = !others.some(p => p.handSize() <= 3);
        }

        if (drawSelf) {
            const drawn = this.state.drawCards(1);
            if (drawn.length > 0) {
                player.addCards(drawn);
                this.ui.showMessage(`${player.name} drew 1 card from Bill!`, 1500);
            }
        } else {
            let target;
            if (player.isHuman) {
                target = await this.ui.promptTargetPlayer(
                    this.state.getOtherPlayers(),
                    'Choose a player to draw 1 card'
                );
            } else {
                const others = this.state.getOtherPlayers();
                others.sort((a, b) => a.handSize() - b.handSize());
                target = others[0];
            }
            if (target) {
                const drawn = this.state.drawCards(1);
                if (drawn.length > 0) {
                    target.addCards(drawn);
                    this.ui.showMessage(`${target.name} forced to draw 1 card from Bill!`, 1500);
                }
            }
        }
    }

    /**
     * Court Case bonus: choose a player to skip their next turn + ban Vote cards for one round
     */
    async applyCourtCaseBonus(player) {
        let target;
        if (player.isHuman) {
            target = await this.ui.promptTargetPlayer(
                this.state.getOtherPlayers(),
                'Choose a player to skip their next turn'
            );
        } else {
            const others = this.state.getOtherPlayers();
            others.sort((a, b) => a.handSize() - b.handSize());
            target = others[0];
        }
        if (target) {
            target.skipNextTurn = true;
            this.ui.showMessage(`${target.name} skips next turn! Vote cards banned for 1 round.`, 2000);
        }

        // Ban Vote cards for one full round (number of players = turns in a round)
        this.state.voteBanTurnsLeft = this.state.players.length;
    }

    /**
     * End the game — two winners: Power (emptied hand) and Plays (most Lobby Cards)
     */
    async endGame(powerWinner) {
        this.state.phase = GAME_PHASES.GAME_OVER;

        // Find Plays winner — most total Lobby Cards
        const players = this.state.players;
        let maxLobby = -1;
        let playsWinner = null;
        players.forEach(p => {
            const total = p.lobbyCards.length + p.earnedLobbyCards;
            if (total > maxLobby) {
                maxLobby = total;
                playsWinner = p;
            }
        });

        this.emit('gameOver', {
            powerWinner: powerWinner.index,
            playsWinner: playsWinner ? playsWinner.index : null
        });

        await this.ui.showGameOverScreen(powerWinner, playsWinner);
    }

    /**
     * End turn manually (for human players who draw and can't/won't play)
     */
    async endTurn(playerIndex) {
        if (this.state.currentPlayerIndex !== playerIndex) {
            return false;
        }

        await this.advanceToNextTurn();
        return true;
    }

    /**
     * Save a snapshot of the current state for undo (human turn only)
     */
    saveUndoSnapshot() {
        this.undoSnapshot = this.state.toJSON();
    }

    /**
     * Restore the saved snapshot (undo the human's last action)
     */
    async undo() {
        if (!this.undoSnapshot) return false;

        const snapshot = this.undoSnapshot;
        this.undoSnapshot = null;

        // Restore state
        this.state = GameState.fromJSON(snapshot);

        this.ui.showMessage('Move undone!', 1000);
        this.ui.render();

        return true;
    }

    /**
     * Clear undo snapshot (e.g. when it's no longer valid)
     */
    clearUndo() {
        this.undoSnapshot = null;
    }

    // Event system
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    off(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        }
    }

    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(cb => cb(data));
        }
    }
}

// Global game instance
let game = null;

/**
 * Initialize the game when DOM is ready
 */
function initPowerPlays() {
    game = new PowerPlaysGame();
    const ui = new UIManager(game);
    game.init(ui);

    // Expose to window for debugging
    window.powerPlays = game;
}

// Auto-init when DOM is ready
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPowerPlays);
    } else {
        initPowerPlays();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PowerPlaysGame, initPowerPlays };
}
