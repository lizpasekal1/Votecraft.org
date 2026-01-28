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
            playerHand: document.getElementById('player-hand'),
            powerButton: document.getElementById('power-button'),
            endTurnButton: document.getElementById('end-turn-button'),

            // Status
            currentPlayerDisplay: document.getElementById('current-player'),
            messageDisplay: document.getElementById('message-display'),

            // Modals
            modalOverlay: document.getElementById('modal-overlay'),
            colorPickerModal: document.getElementById('color-picker-modal'),
            targetPickerModal: document.getElementById('target-picker-modal'),
            voteModal: document.getElementById('vote-modal'),
            passPlayModal: document.getElementById('pass-play-modal'),
            gameOverModal: document.getElementById('game-over-modal'),
            lobbyPickerModal: document.getElementById('lobby-picker-modal'),
            lobbyActivateModal: document.getElementById('lobby-activate-modal')
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

        // Power button
        this.elements.powerButton?.addEventListener('click', () => this.handlePowerClick());

        // End turn button
        this.elements.endTurnButton?.addEventListener('click', () => this.handleEndTurnClick());

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
        const state = this.game.state;

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
     * Positions: 2P = top, 3P = left/top, 4P = left/top/right
     */
    renderOpponents() {
        const state = this.game.state;
        const currentPlayer = state.getCurrentPlayer();
        const opponents = state.players.filter(p => p.index !== 0);
        const playerCount = state.players.length;

        this.elements.opponentArea.innerHTML = '';

        opponents.forEach(opponent => {
            // Determine position class based on player count
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

            const lobbyIndicator = this.renderLobbyIndicator(opponent);

            opponentEl.innerHTML = `
                <div class="opponent-name ${isCurrent ? 'current-turn' : ''}">${opponent.name}</div>
                <div class="opponent-cards">
                    ${this.renderCardBacks(opponent.handSize())}
                </div>
                <div class="opponent-count">${opponent.handSize()} cards</div>
                ${lobbyIndicator}
                ${opponent.hasCalledPower && opponent.handSize() === 1 ? '<div class="power-badge">POWER!</div>' : ''}
            `;

            // Challenge button for Power!
            if (opponent.canBeCaughtForPower() && currentPlayer.isHuman) {
                const challengeBtn = document.createElement('button');
                challengeBtn.className = 'challenge-btn';
                challengeBtn.textContent = 'Catch!';
                challengeBtn.addEventListener('click', () => {
                    this.game.challengePower(0, opponent.index);
                });
                opponentEl.appendChild(challengeBtn);
            }

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
        const player = state.getPlayer(0); // Human player is always index 0 in single player
        const isMyTurn = state.currentPlayerIndex === 0;
        const topCard = state.getTopCard();

        this.elements.playerHand.innerHTML = '';

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

        return `
            <div class="card ${colorClass} ${playableClass} ${typeClass}" data-card-id="${card.id}">
                ${card.color ? `<div class="card-icon">${branchIcon}</div>` : ''}
                <div class="card-center">${symbol}</div>
                ${card.color ? `<div class="card-theme">${branchName}</div>` : ''}
            </div>
        `;
    }

    /**
     * Render status displays
     */
    renderStatus() {
        const state = this.game.state;
        const currentPlayer = state.getCurrentPlayer();

        this.elements.currentPlayerDisplay.textContent = `${currentPlayer.name}'s Turn`;
        this.elements.currentPlayerDisplay.className = state.currentPlayerIndex === 0 ? 'your-turn' : '';
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
        const state = this.game.state;
        const player = state.getPlayer(0);
        const isMyTurn = state.currentPlayerIndex === 0;

        // Power button
        const showPower = isMyTurn && player.handSize() === 1 && !player.hasCalledPower;
        this.elements.powerButton.classList.toggle('hidden', !showPower);

        // End turn button (shown after drawing if can't play)
        this.elements.endTurnButton.classList.toggle('hidden', !isMyTurn);
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

        // For cards that need additional input
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

        if (card.type === CARD_TYPES.SWAP) {
            this.selectedCardIndex = cardIndex;
            this.promptTargetPlayer(state.getOtherPlayers(), 'Choose player to swap with').then(target => {
                if (target) {
                    this.game.playCard(0, cardIndex, { targetPlayerIndex: target.index });
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
     * Handle Power button click
     */
    handlePowerClick() {
        this.game.callPower(0);
        this.elements.powerButton.classList.add('hidden');
    }

    /**
     * Handle end turn click
     */
    handleEndTurnClick() {
        this.game.endTurn(0);
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyPress(e) {
        if (e.key === 'p' || e.key === 'P') {
            this.handlePowerClick();
        }
        if (e.key === 'd' || e.key === 'D') {
            this.handleDrawClick();
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
        // Could add more elaborate vote reveal animation here
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
    showPowerCallAnimation(playerIndex) {
        this.showMessage('POWER!', 1500);
        // Could add more elaborate animation
    }

    /**
     * Highlight playable card (after draw)
     */
    highlightPlayableCard(card) {
        // Card is already highlighted via playable class in render
        this.showMessage('You can play this card!', 2000);
    }

    /**
     * Show game over screen
     */
    showGameOverScreen(winner) {
        return new Promise(resolve => {
            const modal = this.elements.gameOverModal;
            modal.querySelector('.winner-name').textContent = winner.name;

            this.showModal('gameOverModal');

            // Auto-resolve after showing
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
                // For human player, find the selected card in hand or use center of hand area
                const selectedCard = this.elements.playerHand.querySelector('.card-wrapper.selected .card') ||
                                    this.elements.playerHand.querySelector('.card-wrapper:hover .card');

                if (selectedCard) {
                    const cardRect = selectedCard.getBoundingClientRect();
                    startX = cardRect.left;
                    startY = cardRect.top;
                } else {
                    // Fallback to center of player hand area
                    const handRect = this.elements.playerHand.getBoundingClientRect();
                    startX = handRect.left + handRect.width / 2 - 30;
                    startY = handRect.top;
                }
            } else {
                // For opponents, start from their area
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

            // Human player: show the actual card face immediately
            // Opponent: start with card back, flip to reveal
            if (isHumanPlayer) {
                flyingCard.innerHTML = this.createCardElement(card, { faceUp: true });
                flyingCard.classList.add('player-card-fly');
            } else {
                flyingCard.innerHTML = '<div class="card card-back"></div>';
            }

            document.body.appendChild(flyingCard);

            // Animate position using CSS transition
            flyingCard.style.transition = 'left 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), top 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';

            // Trigger animation after a frame
            requestAnimationFrame(() => {
                if (isHumanPlayer) {
                    flyingCard.classList.add('animate');
                } else {
                    flyingCard.classList.add('flipping');
                }

                flyingCard.style.left = `${endX}px`;
                flyingCard.style.top = `${endY}px`;

                // For opponents, swap to card face halfway through
                if (!isHumanPlayer) {
                    setTimeout(() => {
                        flyingCard.innerHTML = this.createCardElement(card, { faceUp: true });
                    }, 200);
                }
            });

            // Clean up after animation
            const animDuration = isHumanPlayer ? 450 : 550;
            setTimeout(() => {
                flyingCard.remove();
                // Add landing effect to play pile
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
     * Prompt player to choose their lobby card at game start
     */
    promptLobbyCardChoice(player) {
        return new Promise(resolve => {
            const modal = this.elements.lobbyPickerModal;
            if (!modal) {
                // Fallback if modal doesn't exist - random choice
                resolve(Math.random() < 0.5 ? LOBBY_TYPES.BILL : LOBBY_TYPES.COURT_CASE);
                return;
            }

            const titleEl = modal.querySelector('.modal-title');
            if (titleEl) {
                titleEl.textContent = `${player.name}, choose your secret Lobby Card`;
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
     * Prompt player to activate their lobby card
     */
    promptLobbyActivation(player, lobbyType) {
        return new Promise(resolve => {
            const modal = this.elements.lobbyActivateModal;
            if (!modal) {
                // Fallback - auto activate
                resolve(true);
                return;
            }

            const lobbyInfo = LOBBY_CARDS[lobbyType];
            const titleEl = modal.querySelector('.modal-title');
            const descEl = modal.querySelector('.lobby-description');
            const bonusEl = modal.querySelector('.lobby-bonus');

            if (titleEl) titleEl.textContent = `Activate ${lobbyInfo.name}?`;
            if (descEl) descEl.textContent = lobbyInfo.description;
            if (bonusEl) bonusEl.textContent = `Bonus: ${lobbyInfo.bonus}`;

            const yesBtn = modal.querySelector('.lobby-yes-btn');
            const noBtn = modal.querySelector('.lobby-no-btn');

            const cleanup = () => {
                this.hideModal('lobbyActivateModal');
                yesBtn?.removeEventListener('click', handleYes);
                noBtn?.removeEventListener('click', handleNo);
            };

            const handleYes = () => { cleanup(); resolve(true); };
            const handleNo = () => { cleanup(); resolve(false); };

            yesBtn?.addEventListener('click', handleYes);
            noBtn?.addEventListener('click', handleNo);

            this.showModal('lobbyActivateModal');
        });
    }

    /**
     * Show lobby card reveal animation
     */
    async showLobbyCardReveal(player, lobbyType) {
        const lobbyInfo = LOBBY_CARDS[lobbyType];
        this.showMessage(`${player.name} reveals ${lobbyInfo.icon} ${lobbyInfo.name}!`, 2500);
        return new Promise(resolve => setTimeout(resolve, 1000));
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
            // Legislative (Blue) - Capitol building with columns
            [COLORS.BLUE]: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M200-280v-280h80v280h-80Zm240 0v-280h80v280h-80ZM80-120v-80h800v80H80Zm600-160v-280h80v280h-80ZM80-640v-80l400-200 400 200v80H80Zm178-80h444-444Zm0 0h444L480-830 258-720Z"/></svg>`,
            // Executive (Yellow) - President/person figure
            [COLORS.YELLOW]: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M185-80q-17 0-29.5-12.5T143-122v-105q0-90 56-159t144-88q-40 28-62 70.5T259-312v190q0 11 3 22t10 20h-87Zm147 0q-17 0-29.5-12.5T290-122v-190q0-70 49.5-119T459-480h189q70 0 119 49t49 119v64q0 70-49 119T648-80H332Zm148-484q-66 0-112-46t-46-112q0-66 46-112t112-46q66 0 112 46t46 112q0 66-46 112t-112 46Z"/></svg>`,
            // Judicial (Red) - Scales of justice
            [COLORS.RED]: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M80-120v-80h360v-447q-26-9-45-28t-28-45H240l120 280q0 50-41 85t-99 35q-58 0-99-35t-41-85l120-280h-80v-80h247q12-35 43-57.5t70-22.5q39 0 70 22.5t43 57.5h247v80h-80l120 280q0 50-41 85t-99 35q-58 0-99-35t-41-85l120-280H593q-9 26-28 45t-45 28v447h360v80H80Zm585-320h150l-75-174-75 174Zm-520 0h150l-75-174-75 174Zm335-280q17 0 28.5-11.5T520-760q0-17-11.5-28.5T480-800q-17 0-28.5 11.5T440-760q0 17 11.5 28.5T480-720Z"/></svg>`,
            // Fed Reserve (Green) - Money/bank note
            [COLORS.GREEN]: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M600-320h160v-160h-60v100H600v60Zm-120-40q50 0 85-35t35-85q0-50-35-85t-85-35q-50 0-85 35t-35 85q0 50 35 85t85 35ZM200-480h60v-100h100v-60H200v160ZM80-200v-560h800v560H80Zm80-80h640v-400H160v400Zm0 0v-400 400Z"/></svg>`
        };
        return icons[color] || '';
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { UIManager };
}
