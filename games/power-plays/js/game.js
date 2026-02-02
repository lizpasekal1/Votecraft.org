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
                // Human player chooses their lobby card
                const lobbyType = await this.ui.promptLobbyCardChoice(player);
                player.addLobbyCard(lobbyType);
            } else {
                // AI gets a random lobby card
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
            // Find a vote card in the draw pile
            const voteCardIndex = this.state.drawPile.findIndex(card => card.type === CARD_TYPES.VOTE);

            if (voteCardIndex !== -1) {
                // Swap: take vote card from draw pile, put a non-vote card back
                const voteCard = this.state.drawPile.splice(voteCardIndex, 1)[0];
                const nonVoteCard = humanPlayer.hand.find(card => card.type !== CARD_TYPES.VOTE);

                if (nonVoteCard) {
                    // Remove non-vote card from hand and add to draw pile
                    humanPlayer.removeCard(nonVoteCard);
                    this.state.drawPile.push(nonVoteCard);

                    // Add vote card to hand
                    humanPlayer.addCards([voteCard]);
                    humanPlayer.sortHand();

                    // Shuffle draw pile so the swapped card isn't predictably on top
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
        // Draw until we get a non-action card to start
        let startCard = this.state.drawCards(1)[0];

        while (startCard.isAction()) {
            // Put action card back and reshuffle
            this.state.drawPile.unshift(startCard);
            // Shuffle draw pile
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

        // Reset turn-based state
        player.resetTurnState();

        // Emit turn started
        this.emit('turnStarted', {
            playerIndex: player.index,
            playerName: player.name
        });

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
        // Human players interact via UI
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
            this.ui.render(); // Show the vote card on the pile
            await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5 second pause
        }

        // Resolve card effects
        const result = await this.actionResolver.resolve(card, player, targetInfo);

        // Emit card played
        this.emit('cardPlayed', {
            playerIndex,
            card: card.toJSON(),
            result
        });

        // Check if player can activate a lobby card
        if (card.color && player.canActivateLobby(card.color)) {
            const lobbyActivated = await this.handleLobbyActivation(player, card.color);
            if (lobbyActivated) {
                // Lobby card effects are handled, may affect game flow
            }
        }

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

        // Draw a card
        const drawnCards = state.drawCards(1);
        if (drawnCards.length === 0) {
            // Deck is empty even after reshuffle
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
        if (drawnCard.canPlayOn(state.getTopCard(), state.activeColor)) {
            if (player.isHuman) {
                // Human can choose to play or keep
                this.ui.highlightPlayableCard(drawnCard);
            } else {
                // AI plays if beneficial
                const playableCards = player.getPlayableCards(state.getTopCard(), state.activeColor);
                if (playableCards.length > 0) {
                    const cardToPlay = this.ai.selectCardToPlay(player, playableCards, state);
                    const cardIdx = player.findCardIndex(cardToPlay.id);
                    await this.playCard(playerIndex, cardIdx);
                    return true;
                }
            }
        }

        // If human, render and wait for their action
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

        // Handle skip
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
     * Handle lobby card activation opportunity
     */
    async handleLobbyActivation(player, cardColor) {
        const lobbyType = player.getActivatableLobbyType(cardColor);
        if (!lobbyType) return false;

        let shouldActivate = false;

        if (player.isHuman) {
            // Prompt human player
            shouldActivate = await this.ui.promptLobbyActivation(player, lobbyType);
        } else {
            // AI decides whether to activate
            shouldActivate = this.ai.shouldActivateLobby(player, lobbyType, this.state);
        }

        if (shouldActivate) {
            return await this.activateLobbyCard(player, lobbyType);
        }

        return false;
    }

    /**
     * Activate a lobby card and apply its effect
     */
    async activateLobbyCard(player, lobbyType) {
        // Mark the lobby card as used
        player.useLobbyCard(lobbyType);

        // Emit event
        this.emit('lobbyCardActivated', {
            playerIndex: player.index,
            lobbyType: lobbyType
        });

        // Show animation
        await this.ui.showLobbyCardReveal(player, lobbyType);

        // Apply bonus based on lobby type
        if (lobbyType === LOBBY_TYPES.BILL) {
            // Bill bonus: Draw 1 card and play again
            const drawnCard = this.state.drawCards(1)[0];
            if (drawnCard) {
                player.addCards(drawnCard);
                this.ui.showMessage(`${player.name} activated Bill! Drew 1 card.`);
            }
            // Note: "play again" effect would need additional turn handling
            // For simplicity, we just give the draw bonus
        } else if (lobbyType === LOBBY_TYPES.COURT_CASE) {
            // Court Case bonus: Force any opponent to discard 1 card
            let targetPlayer;
            if (player.isHuman) {
                targetPlayer = await this.ui.promptTargetPlayer(
                    this.state.getOtherPlayers(),
                    'Choose a player to discard a card'
                );
            } else {
                // AI picks player with most cards
                const others = this.state.getOtherPlayers();
                others.sort((a, b) => b.handSize() - a.handSize());
                targetPlayer = others[0];
            }

            if (targetPlayer && targetPlayer.handSize() > 0) {
                // Remove a random card from their hand
                const discardIndex = Math.floor(Math.random() * targetPlayer.handSize());
                const discarded = targetPlayer.removeCard(discardIndex);
                this.ui.showMessage(`${player.name} activated Court Case! ${targetPlayer.name} discarded a card.`);
            }
        }

        this.ui.render();
        return true;
    }

    /**
     * Call Power!
     */
    callPower(playerIndex) {
        const player = this.state.getPlayer(playerIndex);

        if (player.callPower()) {
            this.emit('powerCalled', { playerIndex, playerName: player.name });
            this.ui.showPowerCallAnimation(playerIndex);
            return true;
        }
        return false;
    }

    /**
     * Challenge a player for not calling Power!
     */
    challengePower(challengerIndex, targetIndex) {
        const target = this.state.getPlayer(targetIndex);

        if (target.canBeCaughtForPower()) {
            // Target was caught - draw penalty cards
            const penaltyCards = this.state.drawCards(GAME_CONFIG.POWER_PENALTY_CARDS);
            target.addCards(penaltyCards);

            this.emit('powerChallengeSuccess', {
                challenger: challengerIndex,
                target: targetIndex,
                penaltyCards: penaltyCards.length
            });

            this.ui.render();
            return true;
        }

        return false;
    }

    /**
     * End the game
     */
    async endGame(winner) {
        this.state.phase = GAME_PHASES.GAME_OVER;

        this.emit('gameOver', {
            winner: winner.index,
            winnerName: winner.name
        });

        await this.ui.showGameOverScreen(winner);
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
