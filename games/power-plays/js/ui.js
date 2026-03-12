/**
 * Power Plays - UI Manager
 * Handles all rendering and user interactions
 */

/**
 * Manages the game UI
 */
class UIManager {
    constructor(game) {
        this.game = game;
        this.elements = {};
        this.selectedCardIndex = null;
        this.pendingPromise = null;
    }

    /**
     * Initialize UI
     */
    init() {
        this.cacheElements();
        this.bindEvents();
        this.showStartScreen();
    }

    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.elements = {
            // Screens
            startScreen: document.getElementById('start-screen'),
            gameScreen: document.getElementById('game-screen'),

            // Start screen elements
            playerCountSelect: document.getElementById('player-count'),
            gameModeSelect: document.getElementById('game-mode'),
            difficultySelect: document.getElementById('difficulty'),
            startButton: document.getElementById('start-button'),

            // Game board
            gameBoard: document.getElementById('game-board'),
            opponentArea: document.getElementById('opponent-area'),
            centerArea: document.getElementById('center-area'),
            playerArea: document.getElementById('player-area'),

            // Center elements
            drawPile: document.getElementById('draw-pile'),
            playPile: document.getElementById('play-pile'),
            activeColorIndicator: document.getElementById('active-color'),
            directionIndicator: document.getElementById('direction-indicator'),

            // Player hand
            playerHandInfo: document.getElementById('player-hand-info'),
            playerHand: document.getElementById('player-hand'),
            turnText: document.getElementById('turn-text'),
            skipBtn: document.getElementById('skip-btn'),
            useLobbyBtn: document.getElementById('use-lobby-btn'),
            undoBtn: document.getElementById('undo-btn'),

            // Status
            messageDisplay: document.getElementById('message-display'),
            infoBtn: document.getElementById('info-btn'),
            pauseButton: document.getElementById('pause-btn'),

            // Modals
            modalOverlay: document.getElementById('modal-overlay'),
            colorPickerModal: document.getElementById('color-picker-modal'),
            targetPickerModal: document.getElementById('target-picker-modal'),
            voteModal: document.getElementById('vote-modal'),
            passPlayModal: document.getElementById('pass-play-modal'),
            gameOverModal: document.getElementById('game-over-modal'),
            lobbyPickerModal: document.getElementById('lobby-picker-modal'),
            lobbyActivateModal: document.getElementById('lobby-activate-modal'),
            infoModal: document.getElementById('info-modal'),
            infoCloseBtn: document.getElementById('info-close-btn')
        };
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Start button
        this.elements.startButton?.addEventListener('click', () => this.handleStartGame());

        // Draw pile click
        this.elements.drawPile?.addEventListener('click', () => this.handleDrawClick());

        // Skip button
        this.elements.skipBtn?.addEventListener('click', () => this.handleEndTurnClick());

        // Use Lobby Card button
        this.elements.useLobbyBtn?.addEventListener('click', () => this.handleUseLobbyClick());

        // Undo button
        this.elements.undoBtn?.addEventListener('click', () => this.handleUndoClick());

        // Info button
        this.elements.infoBtn?.addEventListener('click', () => this.showModal('infoModal'));
        this.elements.infoCloseBtn?.addEventListener('click', () => this.hideModal('infoModal'));

        // Pause button
        this.elements.pauseButton?.addEventListener('click', () => this.handlePauseClick());

        // Color picker buttons
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleColorPick(e.target.dataset.color));
        });

        // Pass & play ready button
        document.getElementById('pass-play-ready')?.addEventListener('click', () => {
            this.hideModal('passPlayModal');
            if (this.pendingPromise) {
                this.pendingPromise.resolve();
                this.pendingPromise = null;
            }
        });

        // Game over - play again
        document.getElementById('play-again-btn')?.addEventListener('click', () => {
            this.hideModal('gameOverModal');
            this.showStartScreen();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
    }

    /**
     * Show start screen
     */
    showStartScreen() {
        this.elements.startScreen.classList.remove('hidden');
        this.elements.gameScreen.classList.add('hidden');
    }

    /**
     * Handle game start
     */
    handleStartGame() {
        const playerCount = parseInt(this.elements.playerCountSelect.value);
        const mode = this.elements.gameModeSelect.value;
        const difficulty = this.elements.difficultySelect.value;

        this.elements.startScreen.classList.add('hidden');
        this.elements.gameScreen.classList.remove('hidden');

        this.game.startGame({
            playerCount,
            mode,
            difficulty
        });
    }

    /**
     * Main render function
     */
    render() {
        this.renderOpponents();
        this.renderPlayPile();
        this.renderDrawPile();
        this.renderPlayerHand();
        this.renderStatus();
        this.updateActiveColor();
        this.updateDirection();
        this.updateButtons();
    }

    /**
     * Render opponent hands
     */
    renderOpponents() {
        const state = this.game.state;
        const opponents = state.players.filter(p => p.index !== 0);
        const playerCount = state.players.length;

        this.elements.opponentArea.innerHTML = '';

        opponents.forEach(opponent => {
            let positionClass = '';
            if (playerCount === 3) {
                positionClass = opponent.index === 1 ? 'position-left' : 'position-top';
            } else if (playerCount === 4) {
                if (opponent.index === 1) positionClass = 'position-left';
                else if (opponent.index === 2) positionClass = 'position-top';
                else positionClass = 'position-right';
            }

            const opponentEl = document.createElement('div');
            opponentEl.className = `opponent ${positionClass} ${state.currentPlayerIndex === opponent.index ? 'active' : ''}`.trim();
            opponentEl.dataset.playerIndex = opponent.index;

            const isCurrent = state.currentPlayerIndex === opponent.index;

            opponentEl.innerHTML = `
                <div class="opponent-name ${isCurrent ? 'current-turn' : ''}">${opponent.name}</div>
                <div class="opponent-cards">
                    ${this.renderCardBacks(opponent.handSize())}
                </div>
                <div class="opponent-count">${opponent.handSize()} cards | ${opponent.lobbyCards.length + opponent.earnedLobbyCards} lobby card${(opponent.lobbyCards.length + opponent.earnedLobbyCards) !== 1 ? 's' : ''}</div>
            `;

            this.elements.opponentArea.appendChild(opponentEl);
        });
    }

    /**
     * Render card backs for opponents
     */
    renderCardBacks(count) {
        let html = '';
        const displayCount = Math.min(count, 7);
        for (let i = 0; i < displayCount; i++) {
            html += '<div class="card card-back"></div>';
        }
        if (count > 7) {
            html += `<div class="card-overflow">+${count - 7}</div>`;
        }
        return html;
    }

    /**
     * Render play pile
     */
    renderPlayPile() {
        const topCard = this.game.state.getTopCard();
        if (!topCard) {
            this.elements.playPile.innerHTML = '<div class="card empty-pile"></div>';
            return;
        }

        this.elements.playPile.innerHTML = this.createCardElement(topCard, { faceUp: true });
    }

    /**
     * Render draw pile
     */
    renderDrawPile() {
        const count = this.game.state.drawPile.length;
        this.elements.drawPile.innerHTML = `
            <div class="card card-back draw-pile-card">
                <span class="pile-count">${count}</span>
            </div>
        `;
    }

    /**
     * Render player's hand
     */
    renderPlayerHand() {
        const state = this.game.state;
        const player = state.getPlayer(0);
        const isMyTurn = state.currentPlayerIndex === 0;
        const topCard = state.getTopCard();

        // Update hand info text
        const totalLobby = player.lobbyCards.length + player.earnedLobbyCards;
        this.elements.playerHandInfo.textContent = `${player.handSize()} cards | ${totalLobby} lobby card${totalLobby !== 1 ? 's' : ''}`;

        this.elements.playerHand.innerHTML = '';
        this.elements.playerHand.classList.toggle('my-turn', isMyTurn);

        player.hand.forEach((card, index) => {
            const isPlayable = isMyTurn && card.canPlayOn(topCard, state.activeColor);
            const cardEl = document.createElement('div');
            cardEl.className = `card-wrapper ${isPlayable ? 'playable' : ''} ${this.selectedCardIndex === index ? 'selected' : ''}`;
            cardEl.innerHTML = this.createCardElement(card, {
                faceUp: true,
                playable: isPlayable
            });

            cardEl.addEventListener('click', () => this.handleCardClick(index));

            this.elements.playerHand.appendChild(cardEl);
        });

        // Render lobby card(s) above the draw pile
        this.renderPlayerLobbyCard(player);
    }

    /**
     * Render player's lobby card above the hand on the left
     */
    renderPlayerLobbyCard(player) {
        const playerArea = document.getElementById('player-area');
        let container = document.getElementById('player-lobby-display');
        if (!container) {
            container = document.createElement('div');
            container.id = 'player-lobby-display';
            playerArea.appendChild(container);
        }
        container.innerHTML = '';
        player.lobbyCards.forEach(lc => {
            const lobbyEl = document.createElement('div');
            lobbyEl.className = `hand-lobby-card${lc.used ? ' hand-lobby-used' : ''}`;
            const info = LOBBY_CARDS[lc.type];
            lobbyEl.innerHTML = `<div class="hand-lobby-label">${lc.used ? 'USED' : 'LOBBY'}</div><div class="hand-lobby-icon">${info.icon}</div>`;
            lobbyEl.title = `${info.name} — ${info.bonus}${lc.used ? ' (Used)' : ''}`;
            container.appendChild(lobbyEl);
        });

        // Position above the first card
        const firstCard = this.elements.playerHand.querySelector('.card-wrapper');
        if (firstCard) {
            requestAnimationFrame(() => {
                const areaRect = playerArea.getBoundingClientRect();
                const cardRect = firstCard.getBoundingClientRect();
                container.style.left = (cardRect.left - areaRect.left) + 'px';
            });
        }
    }

    /**
     * Create a card element HTML
     */
    createCardElement(card, options = {}) {
        const { faceUp = true, playable = false } = options;

        if (!faceUp) {
            return '<div class="card card-back"></div>';
        }

        const colorClass = card.color ? `card-${card.color}` : 'card-wild';
        const playableClass = playable ? 'playable' : '';
        const symbol = card.getDisplayValue();
        const typeClass = card.type !== CARD_TYPES.NUMBER ? `card-action card-${card.type}` : '';

        // Get branch name and icon for colored cards
        const branchName = card.color ? COLOR_THEMES[card.color].name : '';
        const branchIcon = card.color ? this.getBranchIcon(card.color) : '';

        // Special rendering for Vote cards
        if (card.type === CARD_TYPES.VOTE) {
            return `
                <div class="card ${colorClass} ${playableClass} ${typeClass}" data-card-id="${card.id}">
                    <div class="vote-corner vote-corner-top"></div>
                    <div class="card-center">
                        <span class="vote-letter vote-letter-v">V</span>
                        <span class="vote-letter vote-letter-o">O</span>
                        <span class="vote-letter vote-letter-t">T</span>
                        <span class="vote-letter vote-letter-e">E</span>
                    </div>
                    <div class="vote-corner vote-corner-bottom"></div>
                </div>
            `;
        }

        const actionLabel = card.type !== CARD_TYPES.NUMBER && card.type !== CARD_TYPES.VOTE
            ? CARD_NAMES[card.type] || ''
            : '';

        const themeLabel = actionLabel || branchName;

        return `
            <div class="card ${colorClass} ${playableClass} ${typeClass}" data-card-id="${card.id}">
                ${card.color ? '<div class="card-oval"></div>' : ''}
                ${card.color ? `<div class="card-icon">${branchIcon}</div>` : ''}
                <div class="card-center">${symbol}</div>
                ${card.color && themeLabel ? `<div class="card-theme">${themeLabel}</div>` : ''}
            </div>
        `;
    }

    /**
     * Render status displays
     */
    renderStatus() {
        const state = this.game.state;
        const currentPlayer = state.getCurrentPlayer();
        const isMyTurn = state.currentPlayerIndex === 0;
        this.elements.turnText.textContent = `${currentPlayer.name}'s Turn`;

        // Show skip button only on player's turn
        this.elements.skipBtn.classList.toggle('hidden', !isMyTurn);

        // Show lobby card button if player has unused lobby cards and it's their turn
        const humanPlayer = state.getPlayer(0);
        const canUseLobby = isMyTurn && humanPlayer.canUseLobbyCard();
        this.elements.useLobbyBtn.classList.toggle('hidden', !canUseLobby);

        // Show undo button when a snapshot exists (human made a move they can take back)
        const canUndo = this.game.undoSnapshot !== null;
        this.elements.undoBtn.classList.toggle('hidden', !canUndo);
    }

    /**
     * Update active color indicator
     */
    updateActiveColor() {
        const color = this.game.state.activeColor;
        this.elements.activeColorIndicator.className = `active-color color-${color}`;
        this.elements.activeColorIndicator.textContent = color ? color.toUpperCase() : '';
    }

    /**
     * Update direction indicator
     */
    updateDirection() {
        const dir = this.game.state.direction;
        this.elements.directionIndicator.textContent = dir === 1 ? '→' : '←';
    }

    /**
     * Update button visibility
     */
    updateButtons() {
    }

    /**
     * Handle card click
     */
    handleCardClick(cardIndex) {
        const state = this.game.state;
        if (state.currentPlayerIndex !== 0) return;
        if (state.phase !== GAME_PHASES.PLAYING) return;

        const player = state.getPlayer(0);
        const card = player.getCard(cardIndex);
        const topCard = state.getTopCard();

        if (!card.canPlayOn(topCard, state.activeColor)) {
            this.showMessage("Can't play that card!");
            return;
        }

        // Vote cards need color selection
        if (card.type === CARD_TYPES.VOTE) {
            this.selectedCardIndex = cardIndex;
            this.promptColorChoice().then(color => {
                if (color) {
                    this.game.playCard(0, cardIndex, { color });
                }
                this.selectedCardIndex = null;
            });
            return;
        }

        // Give 1 (Gratuities) needs target and card selection
        if (card.type === CARD_TYPES.GIVE_1) {
            this.selectedCardIndex = cardIndex;
            this.promptGive1(player, state.getOtherPlayers()).then(result => {
                if (result) {
                    const giveCardIndex = player.findCardIndex(result.card.id);
                    this.game.playCard(0, cardIndex, {
                        targetPlayerIndex: result.targetPlayer.index,
                        giveCardIndex: giveCardIndex
                    });
                }
                this.selectedCardIndex = null;
            });
            return;
        }

        // Regular play
        this.game.playCard(0, cardIndex);
    }

    /**
     * Handle draw pile click
     */
    handleDrawClick() {
        const state = this.game.state;
        if (state.currentPlayerIndex !== 0) return;
        if (state.phase !== GAME_PHASES.PLAYING) return;

        this.game.drawCard(0);
    }

    /**
     * Handle end turn click
     */
    handleEndTurnClick() {
        this.game.endTurn(0);
    }

    /**
     * Handle Use Lobby Card click — prompts color choice then uses lobby card
     */
    async handleUseLobbyClick() {
        const state = this.game.state;
        if (state.currentPlayerIndex !== 0) return;
        const player = state.getPlayer(0);
        if (!player.canUseLobbyCard()) return;

        await this.game.useLobbyCardForColor(player);
    }

    /**
     * Handle undo button click
     */
    async handleUndoClick() {
        await this.game.undo();
    }

    /**
     * Handle pause button click
     */
    handlePauseClick() {
        const isPaused = this.game.togglePause();
        const btn = this.elements.pauseButton;
        if (btn) {
            btn.textContent = isPaused ? '▶' : '⏸';
            btn.classList.toggle('paused', isPaused);
            btn.title = isPaused ? 'Resume Game' : 'Pause Game';
        }
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyPress(e) {
        if (e.key === 'd' || e.key === 'D') {
            this.handleDrawClick();
        }
        if (e.key === 'Escape') {
            this.handlePauseClick();
        }
    }

    /**
     * Show a message
     */
    showMessage(text, duration = 2000) {
        this.elements.messageDisplay.textContent = text;
        this.elements.messageDisplay.classList.add('show');

        setTimeout(() => {
            this.elements.messageDisplay.classList.remove('show');
        }, duration);
    }

    /**
     * Prompt for color choice
     */
    promptColorChoice() {
        return new Promise(resolve => {
            this.showModal('colorPickerModal');

            const handleColorPick = (color) => {
                this.hideModal('colorPickerModal');
                document.querySelectorAll('.color-btn').forEach(btn => {
                    btn.removeEventListener('click', handleClick);
                });
                resolve(color);
            };

            const handleClick = (e) => handleColorPick(e.target.dataset.color);

            document.querySelectorAll('.color-btn').forEach(btn => {
                btn.addEventListener('click', handleClick);
            });
        });
    }

    /**
     * Prompt for target player
     */
    promptTargetPlayer(players, message) {
        return new Promise(resolve => {
            const modal = this.elements.targetPickerModal;
            const container = modal.querySelector('.target-options');

            container.innerHTML = '';
            modal.querySelector('.modal-title').textContent = message;

            players.forEach(player => {
                const btn = document.createElement('button');
                btn.className = 'target-btn';
                btn.textContent = `${player.name} (${player.handSize()} cards)`;
                btn.addEventListener('click', () => {
                    this.hideModal('targetPickerModal');
                    resolve(player);
                });
                container.appendChild(btn);
            });

            this.showModal('targetPickerModal');
        });
    }

    /**
     * Prompt for Give 1 (Gratuities) — select target player then card to give
     */
    async promptGive1(player, otherPlayers) {
        // Step 1: Choose target player
        const targetPlayer = await this.promptTargetPlayer(
            otherPlayers,
            'Choose a player to give a card to'
        );
        if (!targetPlayer) return null;

        // Step 2: Choose card to give (from hand, excluding the Gratuities card being played)
        return new Promise(resolve => {
            const modal = this.elements.voteModal; // Reuse vote modal for card selection
            const container = modal.querySelector('.vote-options');
            modal.querySelector('.modal-title').textContent = 'Choose a card to give away';
            container.innerHTML = '';

            // Show all cards except the Gratuities being played
            const giveableCards = player.hand.filter(c => c.type !== CARD_TYPES.GIVE_1);

            if (giveableCards.length === 0) {
                container.innerHTML = '<p>No cards to give!</p>';
                const cancelBtn = document.createElement('button');
                cancelBtn.className = 'vote-pass-btn';
                cancelBtn.textContent = 'Cancel';
                cancelBtn.addEventListener('click', () => {
                    this.hideModal('voteModal');
                    resolve(null);
                });
                container.appendChild(cancelBtn);
            } else {
                giveableCards.forEach(card => {
                    const cardWrapper = document.createElement('div');
                    cardWrapper.className = 'vote-card-option';
                    cardWrapper.innerHTML = this.createCardElement(card, { faceUp: true });
                    cardWrapper.addEventListener('click', () => {
                        this.hideModal('voteModal');
                        resolve({ targetPlayer, card });
                    });
                    container.appendChild(cardWrapper);
                });
            }

            this.showModal('voteModal');
        });
    }

    /**
     * Prompt counter opportunity for human player
     */
    promptCounterOpportunity(player, pendingAction, counterCard) {
        return new Promise(resolve => {
            const actionNames = {
                motion: 'Motion (Skip)',
                veto: 'Veto (Reverse)',
                inflation: 'Inflation (Draw 2)',
                give1: 'Gratuities (Give 1)'
            };

            const actionName = actionNames[pendingAction.type] || pendingAction.type;
            const sourceName = this.game.state.getPlayer(pendingAction.sourceIndex).name;
            const counterName = `${counterCard.color.toUpperCase()} ${CARD_NAMES[counterCard.type]}`;

            // Use the target picker modal for the counter prompt
            const modal = this.elements.targetPickerModal;
            const container = modal.querySelector('.target-options');
            modal.querySelector('.modal-title').textContent =
                `${sourceName} played ${actionName}! Counter with ${counterName}?`;

            container.innerHTML = '';

            const counterBtn = document.createElement('button');
            counterBtn.className = 'target-btn';
            counterBtn.style.background = '#4CAF50';
            counterBtn.textContent = `Counter! (earn Lobby Card)`;
            counterBtn.addEventListener('click', () => {
                this.hideModal('targetPickerModal');
                resolve(true);
            });
            container.appendChild(counterBtn);

            const acceptBtn = document.createElement('button');
            acceptBtn.className = 'target-btn';
            acceptBtn.style.background = '#f44336';
            acceptBtn.textContent = 'Accept the action';
            acceptBtn.addEventListener('click', () => {
                this.hideModal('targetPickerModal');
                resolve(false);
            });
            container.appendChild(acceptBtn);

            this.showModal('targetPickerModal');
        });
    }

    /**
     * Prompt for vote card selection
     */
    promptVoteCard(player, color) {
        return new Promise(resolve => {
            const modal = this.elements.voteModal;
            const container = modal.querySelector('.vote-options');
            const cardsOfColor = player.getCardsOfColor(color);

            modal.querySelector('.modal-title').textContent = `Vote with a ${color.toUpperCase()} card`;
            container.innerHTML = '';

            if (cardsOfColor.length === 0) {
                container.innerHTML = '<p>You have no cards of this color!</p>';
                const passBtn = document.createElement('button');
                passBtn.className = 'vote-pass-btn';
                passBtn.textContent = 'Pass';
                passBtn.addEventListener('click', () => {
                    this.hideModal('voteModal');
                    resolve(null);
                });
                container.appendChild(passBtn);
            } else {
                cardsOfColor.forEach(card => {
                    const cardWrapper = document.createElement('div');
                    cardWrapper.className = 'vote-card-option';
                    cardWrapper.innerHTML = this.createCardElement(card, { faceUp: true });
                    cardWrapper.addEventListener('click', () => {
                        this.hideModal('voteModal');
                        resolve(card);
                    });
                    container.appendChild(cardWrapper);
                });
            }

            this.showModal('voteModal');
        });
    }

    /**
     * Show vote results
     */
    async showVoteResults(result) {
        this.showMessage(result.message, 3000);
    }

    /**
     * Show pass and play screen
     */
    showPassAndPlayScreen(playerName) {
        return new Promise(resolve => {
            const modal = this.elements.passPlayModal;
            modal.querySelector('.pass-play-name').textContent = playerName;

            this.pendingPromise = { resolve };
            this.showModal('passPlayModal');
        });
    }

    /**
     * Show Power! call animation
     */
    /**
     * Highlight playable card (after draw)
     */
    highlightPlayableCard(card) {
        this.showMessage('You can play this card!', 2000);
    }

    /**
     * Show game over screen — includes Lobby Card count
     */
    showGameOverScreen(powerWinner, playsWinner) {
        return new Promise(resolve => {
            // Set winner names
            document.getElementById('power-winner-name').textContent = powerWinner.name;
            document.getElementById('plays-winner-name').textContent = playsWinner ? playsWinner.name : 'None';

            // Build lobby card summary for all players
            const players = this.game.state.players;
            const summaryEl = document.getElementById('lobby-card-summary');
            let summaryHtml = '';
            players.forEach(p => {
                const isPlaysWinner = playsWinner && p.index === playsWinner.index;
                const totalLobby = p.lobbyCards.length + p.earnedLobbyCards;
                summaryHtml += `<div class="lobby-summary-row${isPlaysWinner ? ' lobby-summary-highlight' : ''}">`;
                summaryHtml += `${p.name}: ${totalLobby} Lobby Card${totalLobby !== 1 ? 's' : ''}`;
                summaryHtml += `</div>`;
            });
            summaryEl.innerHTML = summaryHtml;

            this.showModal('gameOverModal');
            setTimeout(resolve, 500);
        });
    }

    /**
     * Animate card play with flying effect for all players
     */
    async animateCardPlay(card, playerIndex, cardElement = null) {
        return new Promise(resolve => {
            const playPileEl = this.elements.playPile;
            if (!playPileEl) {
                resolve();
                return;
            }

            const playPileRect = playPileEl.getBoundingClientRect();
            const endX = playPileRect.left + playPileRect.width / 2 - 30;
            const endY = playPileRect.top + playPileRect.height / 2 - 45;

            let startX, startY;
            let isHumanPlayer = playerIndex === 0;

            if (isHumanPlayer) {
                const selectedCard = this.elements.playerHand.querySelector('.card-wrapper.selected .card') ||
                                    this.elements.playerHand.querySelector('.card-wrapper:hover .card');

                if (selectedCard) {
                    const cardRect = selectedCard.getBoundingClientRect();
                    startX = cardRect.left;
                    startY = cardRect.top;
                } else {
                    const handRect = this.elements.playerHand.getBoundingClientRect();
                    startX = handRect.left + handRect.width / 2 - 30;
                    startY = handRect.top;
                }
            } else {
                const opponentEl = document.querySelector(`.opponent[data-player-index="${playerIndex}"]`);
                if (!opponentEl) {
                    resolve();
                    return;
                }
                const opponentRect = opponentEl.getBoundingClientRect();
                startX = opponentRect.left + opponentRect.width / 2 - 30;
                startY = opponentRect.top + opponentRect.height / 2 - 45;
            }

            // Create a flying card element
            const flyingCard = document.createElement('div');
            flyingCard.className = 'flying-card';
            flyingCard.style.left = `${startX}px`;
            flyingCard.style.top = `${startY}px`;
            flyingCard.style.width = 'var(--card-width, 60px)';
            flyingCard.style.height = 'var(--card-height, 90px)';

            if (isHumanPlayer) {
                flyingCard.innerHTML = this.createCardElement(card, { faceUp: true });
                flyingCard.classList.add('player-card-fly');
            } else {
                flyingCard.innerHTML = '<div class="card card-back"></div>';
            }

            document.body.appendChild(flyingCard);

            flyingCard.style.transition = 'left 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), top 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';

            requestAnimationFrame(() => {
                if (isHumanPlayer) {
                    flyingCard.classList.add('animate');
                } else {
                    flyingCard.classList.add('flipping');
                }

                flyingCard.style.left = `${endX}px`;
                flyingCard.style.top = `${endY}px`;

                if (!isHumanPlayer) {
                    setTimeout(() => {
                        flyingCard.innerHTML = this.createCardElement(card, { faceUp: true });
                    }, 200);
                }
            });

            const animDuration = isHumanPlayer ? 450 : 550;
            setTimeout(() => {
                flyingCard.remove();
                const pileCard = playPileEl.querySelector('.card');
                if (pileCard) {
                    pileCard.classList.add('play-pile-landing');
                    setTimeout(() => pileCard.classList.remove('play-pile-landing'), 300);
                }
                resolve();
            }, animDuration);
        });
    }

    /**
     * Animate card draw
     */
    async animateCardDraw(card, playerIndex) {
        return new Promise(resolve => {
            setTimeout(resolve, 200);
        });
    }

    /**
     * Show a modal
     */
    showModal(modalName) {
        this.elements.modalOverlay.classList.remove('hidden');
        this.elements[modalName].classList.remove('hidden');
    }

    /**
     * Hide a modal
     */
    hideModal(modalName) {
        this.elements.modalOverlay.classList.add('hidden');
        this.elements[modalName].classList.add('hidden');
    }

    /**
     * Handle color pick from modal
     */
    handleColorPick(color) {
        // Handled in promptColorChoice
    }

    // ==================== LOBBY CARD UI METHODS ====================

    /**
     * Prompt player to choose their lobby card type at game start
     */
    promptLobbyCardChoice(player) {
        return new Promise(resolve => {
            const modal = this.elements.lobbyPickerModal;
            if (!modal) {
                resolve(Math.random() < 0.5 ? LOBBY_TYPES.BILL : LOBBY_TYPES.COURT_CASE);
                return;
            }

            const titleEl = modal.querySelector('.modal-title');
            if (titleEl) {
                titleEl.textContent = `${player.name}, choose your Lobby Card`;
            }

            const billBtn = modal.querySelector('[data-lobby="bill"]');
            const courtBtn = modal.querySelector('[data-lobby="court_case"]');

            const handleChoice = (lobbyType) => {
                this.hideModal('lobbyPickerModal');
                billBtn?.removeEventListener('click', handleBill);
                courtBtn?.removeEventListener('click', handleCourt);
                resolve(lobbyType);
            };

            const handleBill = () => handleChoice(LOBBY_TYPES.BILL);
            const handleCourt = () => handleChoice(LOBBY_TYPES.COURT_CASE);

            billBtn?.addEventListener('click', handleBill);
            courtBtn?.addEventListener('click', handleCourt);

            this.showModal('lobbyPickerModal');
        });
    }

    /**
     * Prompt Bill bonus choice: draw yourself or force opponent to draw
     */
    promptBillChoice() {
        return new Promise(resolve => {
            const modal = this.elements.lobbyActivateModal;
            if (!modal) {
                resolve(true);
                return;
            }

            const titleEl = modal.querySelector('.modal-title');
            const descEl = modal.querySelector('.lobby-description');
            const bonusEl = modal.querySelector('.lobby-bonus');

            if (titleEl) titleEl.textContent = 'Bill Bonus';
            if (descEl) descEl.textContent = 'Choose your legislative action:';
            if (bonusEl) bonusEl.textContent = '';

            const yesBtn = modal.querySelector('.lobby-yes-btn');
            const noBtn = modal.querySelector('.lobby-no-btn');

            if (yesBtn) yesBtn.textContent = 'Draw 1 Card';
            if (noBtn) noBtn.textContent = 'Opponent Draws 1';

            const cleanup = () => {
                this.hideModal('lobbyActivateModal');
                yesBtn?.removeEventListener('click', handleYes);
                noBtn?.removeEventListener('click', handleNo);
                if (yesBtn) yesBtn.textContent = 'Yes, Reveal!';
                if (noBtn) noBtn.textContent = 'No, Keep Hidden';
            };

            const handleYes = () => { cleanup(); resolve(true); };
            const handleNo = () => { cleanup(); resolve(false); };

            yesBtn?.addEventListener('click', handleYes);
            noBtn?.addEventListener('click', handleNo);

            this.showModal('lobbyActivateModal');
        });
    }

    /**
     * Render player's lobby card indicator
     */
    renderLobbyIndicator(player) {
        const unusedCount = player.getUnusedLobbyCount();
        if (unusedCount === 0) return '';

        const lobbyCards = player.getUnusedLobbyCards();
        const icons = lobbyCards.map(lc => LOBBY_CARDS[lc.type].icon).join('');

        return `<div class="lobby-indicator" title="Lobby Cards: ${unusedCount}">${icons}</div>`;
    }

    /**
     * Get SVG icon for a branch color
     */
    getBranchIcon(color) {
        const icons = {
            [COLORS.BLUE]: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M200-280v-280h80v280h-80Zm240 0v-280h80v280h-80ZM80-120v-80h800v80H80Zm600-160v-280h80v280h-80ZM80-640v-80l400-200 400 200v80H80Zm178-80h444-444Zm0 0h444L480-830 258-720Z"/></svg>`,
            [COLORS.YELLOW]: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M185-80q-17 0-29.5-12.5T143-122v-105q0-90 56-159t144-88q-40 28-62 70.5T259-312v190q0 11 3 22t10 20h-87Zm147 0q-17 0-29.5-12.5T290-122v-190q0-70 49.5-119T459-480h189q70 0 119 49t49 119v64q0 70-49 119T648-80H332Zm148-484q-66 0-112-46t-46-112q0-66 46-112t112-46q66 0 112 46t46 112q0 66-46 112t-112 46Z"/></svg>`,
            [COLORS.RED]: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M80-120v-80h360v-447q-26-9-45-28t-28-45H240l120 280q0 50-41 85t-99 35q-58 0-99-35t-41-85l120-280h-80v-80h247q12-35 43-57.5t70-22.5q39 0 70 22.5t43 57.5h247v80h-80l120 280q0 50-41 85t-99 35q-58 0-99-35t-41-85l120-280H593q-9 26-28 45t-45 28v447h360v80H80Zm585-320h150l-75-174-75 174Zm-520 0h150l-75-174-75 174Zm335-280q17 0 28.5-11.5T520-760q0-17-11.5-28.5T480-800q-17 0-28.5 11.5T440-760q0 17 11.5 28.5T480-720Z"/></svg>`,
            [COLORS.GREEN]: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M600-320h160v-160h-60v100H600v60Zm-120-40q50 0 85-35t35-85q0-50-35-85t-85-35q-50 0-85 35t-35 85q0 50 35 85t85 35ZM200-480h60v-100h100v-60H200v160ZM80-200v-560h800v560H80Zm80-80h640v-400H160v400Zm0 0v-400 400Z"/></svg>`
        };
        return icons[color] || '';
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { UIManager };
}
