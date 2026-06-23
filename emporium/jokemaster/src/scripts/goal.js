// Project selection functionality
document.addEventListener('DOMContentLoaded', async function() {
    // Get user ID
    const userId = await getOrCreateUserId();
    window.currentUserId = userId;

    // Load game state from Firestore first, fallback to localStorage
    let gameState = await loadGameState(userId);
    if (!gameState) {
        gameState = JSON.parse(localStorage.getItem('jokeMasterGameState') || '{}');
    }

    // Update header with current funding
    updateHeader(gameState);

    // Setup accordion functionality for mobile
    setupAccordion();

    // Get all project option elements
    const projectOptions = document.querySelectorAll('.project-option');
    const selectButtons = document.querySelectorAll('.select-project-btn');

    // Animate project tiles fading in one after another
    projectOptions.forEach((option, index) => {
        setTimeout(() => {
            option.classList.add('fade-in');
        }, index * 220); // 220ms delay between each tile
    });

    // Load previously selected project from game state
    const selectedProject = gameState.projectType || localStorage.getItem('selectedProject');
    if (selectedProject) {
        const selectedOption = document.querySelector(`[data-project="${selectedProject}"]`);
        if (selectedOption) {
            selectedOption.classList.add('selected');
            const btn = selectedOption.querySelector('.select-project-btn');
            if (btn) {
                btn.textContent = 'YOUR PROJECT';
            }
        }
    }

    // Add click handlers to all project options (entire tile clickable)
    projectOptions.forEach((projectOption, index) => {
        projectOption.addEventListener('click', async function(e) {
            e.preventDefault();

            const projectType = this.getAttribute('data-project');
            const button = this.querySelector('.select-project-btn');

            // Remove selected class from all options and reset their buttons
            projectOptions.forEach(option => {
                option.classList.remove('selected');
                const btn = option.querySelector('.select-project-btn');
                if (btn) {
                    btn.textContent = 'Select Project';
                }
            });

            // Add selected class to clicked option
            this.classList.add('selected');

            // Save selection to localStorage
            localStorage.setItem('selectedProject', projectType);

            // Update game state with project type
            const currentGameState = JSON.parse(localStorage.getItem('jokeMasterGameState') || '{}');
            currentGameState.projectType = projectType;
            localStorage.setItem('jokeMasterGameState', JSON.stringify(currentGameState));

            // Save to Firestore
            if (window.currentUserId) {
                await saveGameState(window.currentUserId, currentGameState);
            }

            // Update button text to "YOUR PROJECT"
            if (button) {
                button.textContent = 'YOUR PROJECT';
            }
        });
    });
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
        const jokesCollected = gameState.usedCards ? gameState.usedCards.length : 0;
        headerCollected.textContent = `${jokesCollected} collected`;
    }

    // Update laugh energy (default to 3/10 if not present)
    if (headerLaughEnergy) {
        const laughEnergy = gameState.laughEnergy !== undefined ? gameState.laughEnergy : 3;
        const maxLaughEnergy = gameState.maxLaughEnergy !== undefined ? gameState.maxLaughEnergy : 10;
        headerLaughEnergy.textContent = `😂 ${laughEnergy}/${maxLaughEnergy}`;
    }
}

function setupAccordion() {
    const accordionHeaders = document.querySelectorAll('.accordion-header');

    // Function to check if we're on mobile
    function isMobile() {
        return window.innerWidth <= 767;
    }

    // Initialize accordion state
    function initAccordion() {
        if (isMobile()) {
            // On mobile, start with first accordion open
            accordionHeaders.forEach((header, index) => {
                const content = header.nextElementSibling;
                if (index === 0) {
                    header.classList.add('active');
                    content.classList.add('active');
                } else {
                    header.classList.remove('active');
                    content.classList.remove('active');
                }
            });
        } else {
            // On desktop, remove all accordion classes
            accordionHeaders.forEach(header => {
                header.classList.remove('active');
                const content = header.nextElementSibling;
                content.classList.remove('active');
            });
        }
    }

    // Initialize on load
    initAccordion();

    // Re-initialize on window resize
    window.addEventListener('resize', initAccordion);

    // Add click handlers for accordion
    accordionHeaders.forEach(header => {
        header.addEventListener('click', function() {
            // Only work as accordion on mobile
            if (!isMobile()) return;

            const content = this.nextElementSibling;
            const isActive = this.classList.contains('active');

            // Close all accordions
            accordionHeaders.forEach(h => {
                h.classList.remove('active');
                h.nextElementSibling.classList.remove('active');
            });

            // If this wasn't active, open it
            if (!isActive) {
                this.classList.add('active');
                content.classList.add('active');
            }
        });
    });
}
