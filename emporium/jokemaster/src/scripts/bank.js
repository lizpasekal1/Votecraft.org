// Bank Page - Comedy Arsenal Management
document.addEventListener('DOMContentLoaded', async function() {
    // Get user ID
    const userId = await getOrCreateUserId();
    window.currentUserId = userId;

    // Load game state from Firestore first, fallback to localStorage
    let gameState = await loadGameState(userId);
    if (!gameState) {
        const localState = localStorage.getItem('jokeMasterGameState');
        gameState = localState ? JSON.parse(localState) : {};
    }

    // Ensure new properties exist
    if (gameState.laughEnergy === undefined) gameState.laughEnergy = 3;
    if (gameState.maxLaughEnergy === undefined) gameState.maxLaughEnergy = 10;
    if (!gameState.recruitedComedians) gameState.recruitedComedians = [];
    if (!gameState.artifacts) gameState.artifacts = [];

    // Convert arrays to Sets
    window.gameState = {
        ...gameState,
        recruitedComedians: new Set(gameState.recruitedComedians),
        artifacts: new Set(gameState.artifacts)
    };

    // Update header
    updateHeader(window.gameState);

    // Render all sections
    renderEnergySection();
    renderComediansSection();
    renderArtifactsSection();
});

function updateHeader(gameState) {
    const headerMoney = document.getElementById('headerMoney');
    const headerCollected = document.getElementById('headerCollected');
    const headerLaughEnergy = document.getElementById('headerLaughEnergy');

    if (headerMoney && gameState.funding !== undefined) {
        if (gameState.funding > 0) {
            headerMoney.textContent = `£${gameState.funding.toLocaleString()}`;
        } else {
            headerMoney.textContent = `£${gameState.funding || 0} FUNDING`;
        }
    }

    if (headerCollected && gameState.usedCards) {
        const jokesCollected = gameState.usedCards ? (gameState.usedCards.length || gameState.usedCards.size || 0) : 0;
        headerCollected.textContent = `${jokesCollected} collected`;
    }

    if (headerLaughEnergy) {
        const laughEnergy = gameState.laughEnergy !== undefined ? gameState.laughEnergy : 3;
        const maxLaughEnergy = gameState.maxLaughEnergy !== undefined ? gameState.maxLaughEnergy : 10;
        headerLaughEnergy.textContent = `😂 ${laughEnergy}/${maxLaughEnergy}`;
    }
}

function renderEnergySection() {
    const energyFill = document.getElementById('energyFill');
    const energyText = document.getElementById('energyText');

    const laughEnergy = window.gameState.laughEnergy || 3;
    const maxLaughEnergy = window.gameState.maxLaughEnergy || 10;
    const percentage = (laughEnergy / maxLaughEnergy) * 100;

    if (energyFill) {
        energyFill.style.width = `${percentage}%`;
    }

    if (energyText) {
        energyText.textContent = `${laughEnergy} / ${maxLaughEnergy}`;
    }
}

function renderComediansSection() {
    const comediansGrid = document.getElementById('comediansGrid');
    const comedianCount = document.getElementById('comedianCount');

    if (!comediansGrid) return;

    const recruitedCount = window.gameState.recruitedComedians.size;
    const maxComedians = 3;

    if (comedianCount) {
        comedianCount.textContent = `${recruitedCount} / ${maxComedians} recruited`;
    }

    // Get comedians from centralized GameData
    const allComedians = GameData.comedians || [];

    comediansGrid.innerHTML = allComedians.map(comedian => {
        const isRecruited = window.gameState.recruitedComedians.has(comedian.id);
        const canRecruit = recruitedCount < maxComedians && window.gameState.laughEnergy >= comedian.cost;
        const isLocked = !isRecruited && recruitedCount >= maxComedians;

        return `
            <div class="comedian-card ${isRecruited ? 'recruited' : ''} ${isLocked ? 'locked' : ''}"
                 ${!isRecruited && !isLocked ? `onclick="showComedianModal('${comedian.id}')"` : ''}>
                <div class="comedian-header">
                    <div class="comedian-emoji">${comedian.emoji}</div>
                    <div class="comedian-info">
                        <h3 class="comedian-name">${comedian.name}</h3>
                        <div class="comedian-style">${comedian.style}</div>
                    </div>
                </div>
                <div class="comedian-location">📍 ${comedian.location}</div>
                <p class="comedian-description">${comedian.description}</p>
                <div class="comedian-bonus">
                    <div class="bonus-label">Passive Bonus</div>
                    <div class="bonus-tags">
                        ${comedian.bonus.tags.map(tag =>
                            `<span class="bonus-tag">+${comedian.bonus.boost} ${tag}</span>`
                        ).join('')}
                    </div>
                </div>
                ${isRecruited ?
                    `<div class="recruited-badge">✓ Recruited</div>` :
                    isLocked ?
                    `<div class="comedian-cost">Max comedians recruited</div>` :
                    `<div class="comedian-cost">Cost: ${comedian.cost} 😂 Laugh Energy</div>
                     <button class="recruit-btn"
                             onclick="event.stopPropagation(); showComedianModal('${comedian.id}')"
                             ${!canRecruit ? 'disabled' : ''}>
                        ${canRecruit ? 'Recruit' : 'Insufficient Energy'}
                     </button>`
                }
            </div>
        `;
    }).join('');
}

function renderArtifactsSection() {
    const artifactsGrid = document.getElementById('artifactsGrid');
    const artifactCount = document.getElementById('artifactCount');

    if (!artifactsGrid) return;

    const foundCount = window.gameState.artifacts.size;
    const totalArtifacts = GameData.artifacts.length;

    if (artifactCount) {
        artifactCount.textContent = `${foundCount} / ${totalArtifacts} collected`;
    }

    // Get artifacts from centralized GameData
    const allArtifacts = GameData.artifacts || [];

    artifactsGrid.innerHTML = allArtifacts.map(artifact => {
        const isFound = window.gameState.artifacts.has(artifact.id);

        // Use the simplified effect description from GameData
        const effectDescription = artifact.effect;

        return `
            <div class="artifact-card ${isFound ? 'found' : 'locked'}">
                <div class="artifact-rarity ${artifact.rarity}">${artifact.rarity}</div>
                <div class="artifact-emoji">${isFound ? artifact.emoji : '❓'}</div>
                <h3 class="artifact-name">${isFound ? artifact.name : 'Unknown Artifact'}</h3>
                <p class="artifact-description">
                    ${isFound ? artifact.description : 'Discover this artifact in ' + artifact.location}
                </p>
                ${isFound ? `
                    <div class="artifact-effect">
                        <div class="effect-label">Effect</div>
                        <div class="effect-description">${effectDescription}</div>
                    </div>
                    <div class="found-badge">✓ Collected</div>
                ` : `
                    <div class="artifact-location">Find in ${artifact.location}</div>
                `}
            </div>
        `;
    }).join('');
}

function showComedianModal(comedianId) {
    const comedian = GameData.getComedianById(comedianId);
    if (!comedian) return;

    const isRecruited = window.gameState.recruitedComedians.has(comedianId);
    const canRecruit = window.gameState.recruitedComedians.size < 3 &&
                      window.gameState.laughEnergy >= comedian.cost;

    const modalBody = document.getElementById('comedianModalBody');
    modalBody.innerHTML = `
        <div class="modal-comedian-emoji">${comedian.emoji}</div>
        <h2 class="modal-comedian-name">${comedian.name}</h2>
        <div class="modal-comedian-style">${comedian.style}</div>

        <div class="modal-section">
            <div class="modal-section-title">About</div>
            <div class="modal-section-content">${comedian.description}</div>
        </div>

        <div class="modal-section">
            <div class="modal-section-title">Location</div>
            <div class="modal-section-content">📍 ${comedian.location}</div>
        </div>

        <div class="modal-section">
            <div class="modal-section-title">Passive Bonus</div>
            <div class="modal-section-content">
                Permanently gain +${comedian.bonus.boost} favor when using ${comedian.bonus.tags.join(' or ')} jokes.
            </div>
        </div>

        ${!isRecruited ? `
            <div class="modal-section">
                <div class="modal-section-title">Recruitment Cost</div>
                <div class="modal-section-content">
                    ${comedian.cost} 😂 Laugh Energy
                    <br>
                    <small style="opacity: 0.7;">Current energy: ${window.gameState.laughEnergy} / ${window.gameState.maxLaughEnergy}</small>
                </div>
            </div>

            <div class="modal-actions">
                <button class="modal-btn modal-btn-secondary" onclick="closeComedianModal()">Cancel</button>
                <button class="modal-btn modal-btn-primary"
                        onclick="recruitComedian('${comedianId}')"
                        ${!canRecruit ? 'disabled' : ''}>
                    ${canRecruit ? 'Recruit Comedian' : 'Insufficient Energy'}
                </button>
            </div>
        ` : `
            <div class="modal-actions">
                <button class="modal-btn modal-btn-primary" onclick="closeComedianModal()">Close</button>
            </div>
        `}
    `;

    document.getElementById('comedianModal').classList.add('show');
}

function closeComedianModal() {
    document.getElementById('comedianModal').classList.remove('show');
}

async function recruitComedian(comedianId) {
    const comedian = GameData.getComedianById(comedianId);
    if (!comedian) return;

    // Check if can recruit
    if (window.gameState.recruitedComedians.size >= 3) {
        alert('You can only recruit up to 3 comedians.');
        return;
    }

    if (window.gameState.laughEnergy < comedian.cost) {
        alert('Not enough Laugh Energy to recruit this comedian.');
        return;
    }

    // Deduct energy and recruit
    window.gameState.laughEnergy -= comedian.cost;
    window.gameState.recruitedComedians.add(comedianId);

    // Save to Firestore
    if (window.currentUserId) {
        const stateToSave = {
            ...window.gameState,
            recruitedComedians: Array.from(window.gameState.recruitedComedians),
            artifacts: Array.from(window.gameState.artifacts)
        };
        await saveGameState(window.currentUserId, stateToSave);
    }

    // Update UI
    updateHeader(window.gameState);
    renderEnergySection();
    renderComediansSection();
    closeComedianModal();

    // Show success message
    alert(`${comedian.name} has joined your team! You now gain ${comedian.bonus.boost} bonus favor when using ${comedian.bonus.tags.join(' or ')} jokes.`);
}

// Close modal on outside click
document.getElementById('comedianModal')?.addEventListener('click', function(e) {
    if (e.target === this) {
        closeComedianModal();
    }
});
