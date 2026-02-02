// Your Jokes page functionality
let allJokes = [];
let selectedFilters = [];
let jokeVotes = {}; // Track votes for each joke
let currentDownvoteJoke = null; // Track which joke is being downvoted
let currentPage = 1;
const jokesPerPage = 6;

document.addEventListener('DOMContentLoaded', async function() {
    // Initialize Firebase
    initializeFirebase();

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

    // Initialize dropdown
    initializeDropdown();

    // Load jokes
    loadJokes(gameState);

    // Load saved votes from Firestore first, fallback to localStorage
    const firestoreVotes = await loadJokeVotes(userId);
    if (firestoreVotes && Object.keys(firestoreVotes).length > 0) {
        jokeVotes = firestoreVotes;
    } else {
        // Fallback to localStorage
        const savedVotes = localStorage.getItem('jokeVotes');
        if (savedVotes) {
            jokeVotes = JSON.parse(savedVotes);
        }
    }

    // Update stats
    updateStats();
});

function updateHeader(gameState) {
    const headerMoney = document.getElementById('headerMoney');
    const headerCollected = document.getElementById('headerCollected');

    if (headerMoney && gameState.funding !== undefined) {
        if (gameState.funding > 0) {
            headerMoney.textContent = '£' + gameState.funding.toLocaleString();
        } else {
            headerMoney.textContent = '£' + (gameState.funding || 0) + ' FUNDING';
        }
    }

    if (headerCollected && gameState.usedCards) {
        const jokesCollected = gameState.usedCards ? gameState.usedCards.length : 0;
        headerCollected.textContent = jokesCollected + ' collected';
    }
}

function initializeDropdown() {
    const dropdownToggle = document.getElementById('dropdownToggle');
    const dropdownMenu = document.getElementById('dropdownMenu');
    const checkboxes = document.querySelectorAll('.filter-checkbox');

    // Toggle dropdown
    dropdownToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle('show');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!document.getElementById('searchDropdown').contains(e.target)) {
            dropdownMenu.classList.remove('show');
        }
    });

    // Handle checkbox changes
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            selectedFilters = Array.from(checkboxes)
                .filter(cb => cb.checked)
                .map(cb => cb.value);

            filterJokes();
        });
    });
}

function updateStats() {
    const jokesWonEl = document.getElementById('jokesWon');
    const jokesSavedEl = document.getElementById('jokesSaved');
    const jokesVotedEl = document.getElementById('jokesVoted');

    if (jokesWonEl) jokesWonEl.textContent = allJokes.length;
    if (jokesSavedEl) jokesSavedEl.textContent = allJokes.length;
    if (jokesVotedEl) jokesVotedEl.textContent = '0';
}

function loadJokes(gameState) {
    // Sample jokes
    allJokes = [
        {
            id: 'joke-1',
            title: "Pun",
            text: "Why don't scientists trust atoms? Because they make up everything!",
            tags: ["clever", "science", "wordplay"],
            type: "pun"
        },
        {
            id: 'joke-2',
            title: "Observational",
            text: "I told my wife she was drawing her eyebrows too high. She looked surprised.",
            tags: ["observational", "silly"],
            type: "observational"
        },
        {
            id: 'joke-3',
            title: "One-liner",
            text: "I'm reading a book about anti-gravity. It's impossible to put down!",
            tags: ["clever", "science", "absurd"],
            type: "one-liner"
        },
        {
            id: 'joke-4',
            title: "Wordplay",
            text: "What do you call a fake noodle? An impasta!",
            tags: ["wordplay", "silly", "food"],
            type: "wordplay"
        },
        {
            id: 'joke-5',
            title: "Dark Humor",
            text: "My therapist says I have a preoccupation with vengeance. We'll see about that.",
            tags: ["dark", "clever"],
            type: "dark"
        },
        {
            id: 'joke-6',
            title: "Absurdist",
            text: "A man walks into a bar. Ouch.",
            tags: ["absurd", "classic"],
            type: "absurdist"
        },
        {
            id: 'joke-7',
            title: "Pun",
            text: "I used to be a banker, but I lost interest.",
            tags: ["wordplay", "career"],
            type: "pun"
        },
        {
            id: 'joke-8',
            title: "One-liner",
            text: "Parallel lines have so much in common. It's a shame they'll never meet.",
            tags: ["math", "clever"],
            type: "one-liner"
        },
        {
            id: 'joke-9',
            title: "Observational",
            text: "I hate when I'm about to hug someone really sexy and my face hits the mirror.",
            tags: ["self-deprecating", "silly"],
            type: "observational"
        },
        {
            id: 'joke-10',
            title: "Wordplay",
            text: "I'm terrified of elevators, so I'm going to start taking steps to avoid them.",
            tags: ["wordplay", "phobia"],
            type: "wordplay"
        },
        {
            id: 'joke-11',
            title: "Dark Humor",
            text: "I have a fear of speed bumps, but I'm slowly getting over it.",
            tags: ["dark", "wordplay"],
            type: "dark"
        },
        {
            id: 'joke-12',
            title: "Pun",
            text: "Why did the scarecrow win an award? He was outstanding in his field!",
            tags: ["classic", "wordplay"],
            type: "pun"
        },
        {
            id: 'joke-13',
            title: "One-liner",
            text: "I told my computer I needed a break, and now it won't stop sending me Kit-Kats.",
            tags: ["tech", "absurd"],
            type: "one-liner"
        },
        {
            id: 'joke-14',
            title: "Observational",
            text: "The problem with kleptomaniacs is that they always take things literally.",
            tags: ["clever", "wordplay"],
            type: "observational"
        },
        {
            id: 'joke-15',
            title: "Absurdist",
            text: "I wondered why the baseball was getting bigger. Then it hit me.",
            tags: ["absurd", "classic"],
            type: "absurdist"
        }
    ];

    renderJokes(allJokes);
}

function filterJokes() {
    let filtered = allJokes;

    // Check if there are type filters (not sorting options)
    const typeFilters = selectedFilters.filter(f => !['newest', 'oldest'].includes(f));

    if (typeFilters.length > 0) {
        filtered = allJokes.filter(joke =>
            typeFilters.includes(joke.type)
        );
    }

    // Apply sorting if selected
    if (selectedFilters.includes('newest')) {
        filtered = [...filtered].reverse();
    } else if (selectedFilters.includes('oldest')) {
        // Keep original order (oldest first)
        filtered = [...filtered];
    }

    currentPage = 1; // Reset to first page when filtering
    renderJokes(filtered);
}

function renderJokes(jokes) {
    const jokesList = document.getElementById('jokesList');
    jokesList.innerHTML = '';

    // Calculate pagination
    const totalPages = Math.ceil(jokes.length / jokesPerPage);
    const startIndex = (currentPage - 1) * jokesPerPage;
    const endIndex = startIndex + jokesPerPage;
    const jokesToShow = jokes.slice(startIndex, endIndex);

    jokesToShow.forEach((joke) => {
        const jokeCard = document.createElement('div');
        jokeCard.className = 'saved-joke';

        const upvotes = jokeVotes[joke.id] || 0;
        const hasVoted = upvotes > 0;
        const votedClass = hasVoted ? 'voted' : '';

        jokeCard.innerHTML = `
            <div class="joke-share-icon" onclick="shareJoke('${joke.id}')">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
                </svg>
            </div>
            <div class="joke-title">${joke.title}</div>
            <div class="joke-text">${joke.text}</div>
            <div class="joke-tags">
                ${joke.tags.map(tag => '<div class="joke-tag">' + tag + '</div>').join('')}
            </div>
            <div class="joke-voting">
                <div class="vote-btn downvote" onclick="voteJoke('${joke.id}', 'down')">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
                        <path d="M320-120v-320H120l360-440 360 440H640v320H320Zm80-80h160v-320h111L480-754 289-520h111v320Zm80-320Z"/>
                    </svg>
                </div>
                <div class="vote-btn upvote ${votedClass}" id="upvote-${joke.id}" onclick="voteJoke('${joke.id}', 'up')">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
                        <path d="M320-120v-320H120l360-440 360 440H640v320H320Zm80-80h160v-320h111L480-754 289-520h111v320Zm80-320Z"/>
                    </svg>
                    <span class="vote-count" id="vote-count-${joke.id}">${upvotes}</span>
                </div>
            </div>
        `;

        jokesList.appendChild(jokeCard);
    });

    // Render pagination
    renderPagination(totalPages, jokes);
}

function renderPagination(totalPages, jokes) {
    const paginationEl = document.getElementById('pagination');
    if (!paginationEl) return;

    paginationEl.innerHTML = '';

    if (totalPages <= 1) {
        paginationEl.style.display = 'none';
        return;
    }

    paginationEl.style.display = 'flex';

    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('div');
        pageBtn.className = 'page-number' + (i === currentPage ? ' active' : '');
        pageBtn.textContent = i;
        pageBtn.onclick = () => {
            currentPage = i;
            renderJokes(jokes);
        };
        paginationEl.appendChild(pageBtn);
    }
}

function changePage(page, jokes) {
    currentPage = page;
    renderJokes(jokes);
}

async function voteJoke(jokeId, direction) {
    if (direction === 'up') {
        const voteCountEl = document.getElementById(`vote-count-${jokeId}`);
        const upvoteBtn = document.getElementById(`upvote-${jokeId}`);

        // Toggle upvote
        if (jokeVotes[jokeId] && jokeVotes[jokeId] > 0) {
            // Already voted - remove vote
            jokeVotes[jokeId] = 0;

            if (voteCountEl) {
                voteCountEl.textContent = '0';
            }

            if (upvoteBtn) {
                upvoteBtn.classList.remove('voted');
            }
        } else {
            // Not voted yet - add vote
            jokeVotes[jokeId] = 1;

            if (voteCountEl) {
                voteCountEl.textContent = '1';
            }

            if (upvoteBtn) {
                upvoteBtn.classList.add('voted');
            }
        }

        // Save to localStorage
        localStorage.setItem('jokeVotes', JSON.stringify(jokeVotes));

        // Save to Firestore
        if (window.currentUserId) {
            await saveJokeVote(window.currentUserId, jokeId, jokeVotes[jokeId]);
        }
    } else if (direction === 'down') {
        // Show downvote popup
        currentDownvoteJoke = jokeId;
        document.getElementById('downvotePopup').classList.add('show');
    }
}

function closeDownvotePopup() {
    document.getElementById('downvotePopup').classList.remove('show');
    currentDownvoteJoke = null;
    // Reset radio buttons
    document.querySelectorAll('input[name="downvote-reason"]').forEach(radio => {
        radio.checked = false;
    });
}

function submitDownvote() {
    const selectedReason = document.querySelector('input[name="downvote-reason"]:checked');

    if (!selectedReason) {
        return; // No reason selected
    }

    if (currentDownvoteJoke) {
        // Store downvote feedback
        const downvoteFeedback = JSON.parse(localStorage.getItem('downvoteFeedback') || '{}');
        downvoteFeedback[currentDownvoteJoke] = selectedReason.value;
        localStorage.setItem('downvoteFeedback', JSON.stringify(downvoteFeedback));

        // Remove the joke from allJokes array
        allJokes = allJokes.filter(joke => joke.id !== currentDownvoteJoke);

        // Re-render the jokes list
        renderJokes(allJokes);

        // Update stats
        updateStats();

        console.log(`Downvoted joke ${currentDownvoteJoke} for reason: ${selectedReason.value}`);
    }

    closeDownvotePopup();
}

function shareJoke(jokeId) {
    console.log(`Share joke ${jokeId}`);
    // TODO: Implement share functionality
}
