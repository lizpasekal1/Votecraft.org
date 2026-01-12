/**
 * Rank Choice Voting Interactive Demo
 * Simulates an RCV election with drag-and-drop ballot ranking
 */

class RCVDemo {
    constructor() {
        this.candidateList = document.getElementById('candidate-list');
        this.castVoteBtn = document.getElementById('cast-vote-btn');
        this.resetBtn = document.getElementById('reset-demo-btn');
        this.resultsDisplay = document.getElementById('results-display');

        // Simulated voter preferences (other voters' ballots)
        this.simulatedVoters = this.generateSimulatedVoters();

        this.init();
    }

    init() {
        this.setupDragAndDrop();
        this.castVoteBtn.addEventListener('click', () => this.runElection());
        this.resetBtn.addEventListener('click', () => this.resetDemo());
    }

    generateSimulatedVoters() {
        // Generate 99 other voters with various preferences
        // This creates a scenario where RCV matters (no majority winner in round 1)
        const voters = [];
        const candidates = ['Pizza Party', 'Taco Team', 'Burger Brigade', 'Sushi Squad'];

        // Create voting blocs with different preferences
        // Pizza supporters (30 voters)
        for (let i = 0; i < 30; i++) {
            voters.push(['Pizza Party', 'Burger Brigade', 'Taco Team', 'Sushi Squad']);
        }

        // Taco supporters (25 voters)
        for (let i = 0; i < 25; i++) {
            voters.push(['Taco Team', 'Pizza Party', 'Sushi Squad', 'Burger Brigade']);
        }

        // Burger supporters (24 voters)
        for (let i = 0; i < 24; i++) {
            voters.push(['Burger Brigade', 'Taco Team', 'Pizza Party', 'Sushi Squad']);
        }

        // Sushi supporters (20 voters)
        for (let i = 0; i < 20; i++) {
            voters.push(['Sushi Squad', 'Taco Team', 'Burger Brigade', 'Pizza Party']);
        }

        return voters;
    }

    setupDragAndDrop() {
        const items = this.candidateList.querySelectorAll('.candidate-item');
        let draggedItem = null;

        items.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                draggedItem = item;
                item.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                draggedItem = null;
                this.updateRankBadges();
            });

            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            });

            item.addEventListener('dragenter', (e) => {
                e.preventDefault();
                if (item !== draggedItem) {
                    item.classList.add('drag-over');
                }
            });

            item.addEventListener('dragleave', () => {
                item.classList.remove('drag-over');
            });

            item.addEventListener('drop', (e) => {
                e.preventDefault();
                item.classList.remove('drag-over');

                if (item !== draggedItem) {
                    const allItems = [...this.candidateList.querySelectorAll('.candidate-item')];
                    const draggedIdx = allItems.indexOf(draggedItem);
                    const targetIdx = allItems.indexOf(item);

                    if (draggedIdx < targetIdx) {
                        item.parentNode.insertBefore(draggedItem, item.nextSibling);
                    } else {
                        item.parentNode.insertBefore(draggedItem, item);
                    }
                }
            });

            // Touch support for mobile
            item.addEventListener('touchstart', (e) => {
                draggedItem = item;
                item.classList.add('dragging');
            });

            item.addEventListener('touchmove', (e) => {
                e.preventDefault();
                const touch = e.touches[0];
                const target = document.elementFromPoint(touch.clientX, touch.clientY);
                if (target && target.classList.contains('candidate-item') && target !== draggedItem) {
                    const allItems = [...this.candidateList.querySelectorAll('.candidate-item')];
                    const draggedIdx = allItems.indexOf(draggedItem);
                    const targetIdx = allItems.indexOf(target);

                    if (draggedIdx < targetIdx) {
                        target.parentNode.insertBefore(draggedItem, target.nextSibling);
                    } else {
                        target.parentNode.insertBefore(draggedItem, target);
                    }
                }
            });

            item.addEventListener('touchend', () => {
                item.classList.remove('dragging');
                draggedItem = null;
                this.updateRankBadges();
            });
        });
    }

    updateRankBadges() {
        const items = this.candidateList.querySelectorAll('.candidate-item');
        items.forEach((item, index) => {
            item.querySelector('.rank-badge').textContent = index + 1;
        });
    }

    getUserBallot() {
        const items = this.candidateList.querySelectorAll('.candidate-item');
        return [...items].map(item => item.dataset.candidate);
    }

    runElection() {
        const userBallot = this.getUserBallot();
        const allBallots = [...this.simulatedVoters, userBallot];

        this.castVoteBtn.style.display = 'none';
        this.resetBtn.style.display = 'inline-block';

        // Disable dragging
        const items = this.candidateList.querySelectorAll('.candidate-item');
        items.forEach(item => {
            item.draggable = false;
            item.classList.add('locked');
        });

        this.animateElection(allBallots);
    }

    async animateElection(ballots) {
        const candidates = ['Pizza Party', 'Taco Team', 'Burger Brigade', 'Sushi Squad'];
        let activeCandidates = [...candidates];
        let currentBallots = ballots.map(b => [...b]);
        let round = 1;
        const totalVotes = ballots.length;
        const majorityNeeded = Math.floor(totalVotes / 2) + 1;

        this.resultsDisplay.innerHTML = `
            <div class="election-info">
                <p><strong>Total Voters:</strong> ${totalVotes} (including you!)</p>
                <p><strong>Majority Needed:</strong> ${majorityNeeded} votes</p>
            </div>
            <div id="rounds-container"></div>
        `;

        const roundsContainer = document.getElementById('rounds-container');

        while (activeCandidates.length > 1) {
            // Count first-choice votes
            const counts = {};
            activeCandidates.forEach(c => counts[c] = 0);

            currentBallots.forEach(ballot => {
                // Find first choice among active candidates
                for (const choice of ballot) {
                    if (activeCandidates.includes(choice)) {
                        counts[choice]++;
                        break;
                    }
                }
            });

            // Create round display
            const roundDiv = document.createElement('div');
            roundDiv.className = 'round-result';
            roundDiv.innerHTML = `<h4>Round ${round}</h4>`;

            // Sort by votes
            const sortedCandidates = activeCandidates.sort((a, b) => counts[b] - counts[a]);

            // Check for winner
            const leader = sortedCandidates[0];
            const leaderVotes = counts[leader];

            if (leaderVotes >= majorityNeeded) {
                // We have a winner!
                const barsHtml = sortedCandidates.map(candidate => {
                    const votes = counts[candidate];
                    const percentage = (votes / totalVotes * 100).toFixed(1);
                    const icon = this.getCandidateIcon(candidate);
                    const isWinner = candidate === leader;
                    return `
                        <div class="vote-bar ${isWinner ? 'winner' : ''}">
                            <div class="bar-label">
                                <span>${icon} ${candidate}</span>
                                <span>${votes} votes (${percentage}%)</span>
                            </div>
                            <div class="bar-track">
                                <div class="bar-fill" style="width: 0%" data-width="${percentage}"></div>
                                ${isWinner ? '<span class="winner-badge">WINNER!</span>' : ''}
                            </div>
                        </div>
                    `;
                }).join('');

                roundDiv.innerHTML += barsHtml;
                roundsContainer.appendChild(roundDiv);

                // Animate bars
                await this.delay(100);
                roundDiv.querySelectorAll('.bar-fill').forEach(bar => {
                    bar.style.width = bar.dataset.width + '%';
                });

                // Show winner message
                await this.delay(800);
                const winnerMessage = document.createElement('div');
                winnerMessage.className = 'winner-message';
                winnerMessage.innerHTML = `
                    <h3>${this.getCandidateIcon(leader)} ${leader} Wins!</h3>
                    <p>With ${leaderVotes} votes (${(leaderVotes / totalVotes * 100).toFixed(1)}%), ${leader} has a majority!</p>
                `;
                roundsContainer.appendChild(winnerMessage);

                return;
            }

            // No winner yet - show round results
            const loser = sortedCandidates[sortedCandidates.length - 1];

            const barsHtml = sortedCandidates.map(candidate => {
                const votes = counts[candidate];
                const percentage = (votes / totalVotes * 100).toFixed(1);
                const icon = this.getCandidateIcon(candidate);
                const isEliminated = candidate === loser;
                return `
                    <div class="vote-bar ${isEliminated ? 'eliminated' : ''}">
                        <div class="bar-label">
                            <span>${icon} ${candidate}</span>
                            <span>${votes} votes (${percentage}%)</span>
                        </div>
                        <div class="bar-track">
                            <div class="bar-fill" style="width: 0%" data-width="${percentage}"></div>
                            ${isEliminated ? '<span class="eliminated-badge">ELIMINATED</span>' : ''}
                        </div>
                    </div>
                `;
            }).join('');

            roundDiv.innerHTML += barsHtml;
            roundDiv.innerHTML += `<p class="round-note">No majority yet! ${loser} is eliminated, and their votes transfer to next choices.</p>`;
            roundsContainer.appendChild(roundDiv);

            // Animate bars
            await this.delay(100);
            roundDiv.querySelectorAll('.bar-fill').forEach(bar => {
                bar.style.width = bar.dataset.width + '%';
            });

            // Remove loser from active candidates
            await this.delay(1200);
            activeCandidates = activeCandidates.filter(c => c !== loser);
            round++;
        }
    }

    getCandidateIcon(candidate) {
        const icons = {
            'Pizza Party': '🍕',
            'Taco Team': '🌮',
            'Burger Brigade': '🍔',
            'Sushi Squad': '🍣'
        };
        return icons[candidate] || '👤';
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    resetDemo() {
        // Re-enable dragging
        const items = this.candidateList.querySelectorAll('.candidate-item');
        items.forEach(item => {
            item.draggable = true;
            item.classList.remove('locked');
        });

        // Reset buttons
        this.castVoteBtn.style.display = 'inline-block';
        this.resetBtn.style.display = 'none';

        // Reset results
        this.resultsDisplay.innerHTML = '<p class="results-placeholder">Cast your vote to see how RCV works!</p>';

        // Regenerate simulated voters for variety
        this.simulatedVoters = this.generateSimulatedVoters();
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new RCVDemo();
});
