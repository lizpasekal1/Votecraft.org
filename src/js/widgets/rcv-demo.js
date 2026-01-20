/**
 * Rank Choice Voting Interactive Demo
 * Simulates an RCV election with tap-to-rank ballot
 */

class RCVDemo {
    constructor() {
        this.candidateList = document.getElementById('candidate-list');
        this.castVoteBtn = document.getElementById('cast-vote-btn');
        this.resetBtn = document.getElementById('reset-demo-btn');
        this.resultsDisplay = document.getElementById('results-display');
        this.rcvModeBtn = document.getElementById('rcv-mode-btn');
        this.wtaModeBtn = document.getElementById('wta-mode-btn');

        // Voting mode: 'rcv' or 'wta' (winner take all)
        this.votingMode = 'rcv';

        // Track user's ranking selections
        this.userRankings = [];

        // Simulated voter preferences (other voters' ballots)
        this.simulatedVoters = this.generateSimulatedVoters();

        this.init();
    }

    init() {
        this.setupTapToRank();
        this.castVoteBtn.addEventListener('click', () => this.runElection());
        this.resetBtn.addEventListener('click', () => this.resetDemo());

        // Mode toggle buttons
        this.rcvModeBtn.addEventListener('click', () => this.setMode('rcv'));
        this.wtaModeBtn.addEventListener('click', () => this.setMode('wta'));
    }

    setMode(mode) {
        this.votingMode = mode;
        this.rcvModeBtn.classList.toggle('active', mode === 'rcv');
        this.wtaModeBtn.classList.toggle('active', mode === 'wta');
        this.resetDemo();
    }

    generateSimulatedVoters() {
        // Generate simulated voters with preferences
        // This creates a "Fun Food Coalition" split scenario (like Bernie/Warren in 2020)
        // Pi Za Pies + Pete Zah together have majority support but split the vote
        const voters = [];

        // FUN FOOD COALITION (combined 54% - but split between two candidates!)
        // Pi Za Pies supporters (27 voters) - prefer Pete Zah as 2nd choice
        for (let i = 0; i < 27; i++) {
            voters.push(['Pi Za Pies', 'Pete Zah', 'Anita Bath', 'Crystal Ball', 'Frank N. Stein']);
        }

        // Pete Zah supporters (27 voters) - prefer Pi Za Pies as 2nd choice
        for (let i = 0; i < 27; i++) {
            voters.push(['Pete Zah', 'Pi Za Pies', 'Anita Bath', 'Crystal Ball', 'Frank N. Stein']);
        }

        // OTHER CANDIDATES (combined 45%)
        // Frank N. Stein supporters (30 voters) - the "moderate" who wins WTA
        for (let i = 0; i < 30; i++) {
            voters.push(['Frank N. Stein', 'Anita Bath', 'Crystal Ball', 'Pi Za Pies', 'Pete Zah']);
        }

        // Anita Bath supporters (10 voters)
        for (let i = 0; i < 10; i++) {
            voters.push(['Anita Bath', 'Frank N. Stein', 'Crystal Ball', 'Pi Za Pies', 'Pete Zah']);
        }

        // Crystal Ball supporters (5 voters)
        for (let i = 0; i < 5; i++) {
            voters.push(['Crystal Ball', 'Frank N. Stein', 'Anita Bath', 'Pete Zah', 'Pi Za Pies']);
        }

        return voters;
    }

    setupTapToRank() {
        const items = this.candidateList.querySelectorAll('.candidate-item');

        // Initialize all rank badges as empty
        items.forEach(item => {
            item.querySelector('.rank-badge').textContent = '';
            item.classList.add('unranked');
            item.removeAttribute('draggable');

            item.addEventListener('click', () => this.handleCandidateClick(item));
        });
    }

    handleCandidateClick(item) {
        if (item.classList.contains('locked')) return;

        const candidate = item.dataset.candidate;
        const currentRankIndex = this.userRankings.indexOf(candidate);

        if (currentRankIndex !== -1) {
            // Already ranked - remove this ranking and all after it
            this.userRankings = this.userRankings.slice(0, currentRankIndex);
        } else {
            // Not ranked yet - add to rankings
            this.userRankings.push(candidate);
        }

        this.updateRankDisplay();
    }

    updateRankDisplay() {
        const items = this.candidateList.querySelectorAll('.candidate-item');

        items.forEach(item => {
            const candidate = item.dataset.candidate;
            const rankIndex = this.userRankings.indexOf(candidate);
            const badge = item.querySelector('.rank-badge');

            if (rankIndex !== -1) {
                badge.textContent = rankIndex + 1;
                item.classList.remove('unranked');
                item.classList.add('ranked');
            } else {
                badge.textContent = '';
                item.classList.remove('ranked');
                item.classList.add('unranked');
            }
        });
    }

    getUserBallot() {
        // If user hasn't ranked all candidates, fill in remaining randomly
        const allCandidates = ['Pi Za Pies', 'Frank N. Stein', 'Anita Bath', 'Crystal Ball', 'Pete Zah'];
        const unranked = allCandidates.filter(c => !this.userRankings.includes(c));
        return [...this.userRankings, ...unranked];
    }

    runElection() {
        // Must rank at least first choice
        if (this.userRankings.length === 0) {
            alert('Please tap at least one candidate to rank them!');
            return;
        }

        const userBallot = this.getUserBallot();
        const allBallots = [...this.simulatedVoters, userBallot];

        this.castVoteBtn.style.display = 'none';
        this.resetBtn.style.display = 'inline-block';

        // Lock candidates
        const items = this.candidateList.querySelectorAll('.candidate-item');
        items.forEach(item => {
            item.classList.add('locked');
        });

        if (this.votingMode === 'rcv') {
            this.animateElection(allBallots);
        } else {
            this.animateWTAElection(allBallots);
        }

        // Scroll results into view on mobile
        setTimeout(() => {
            this.resultsDisplay.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }

    async animateElection(ballots) {
        const candidates = ['Pi Za Pies', 'Frank N. Stein', 'Anita Bath', 'Crystal Ball', 'Pete Zah'];
        const totalVotes = ballots.length;
        const majorityNeeded = Math.floor(totalVotes / 2) + 1;

        // Pre-calculate all rounds
        const rounds = this.calculateAllRounds(ballots, candidates, totalVotes, majorityNeeded);

        // Store rounds data for step-through
        this.rcvRounds = rounds;
        this.currentRoundIndex = 0;
        this.totalVotes = totalVotes;
        this.majorityNeeded = majorityNeeded;

        this.resultsDisplay.innerHTML = `
            <div class="election-info">
                <p><strong>Total Voters:</strong> ${totalVotes} (including you!)</p>
                <p><strong>Majority Needed:</strong> ${majorityNeeded} votes for the leader to win</p>
            </div>
            <div id="round-display"></div>
            <div id="round-nav"></div>
        `;

        // Show first round
        this.showRound(0);
    }

    calculateAllRounds(ballots, candidates, totalVotes, majorityNeeded) {
        const rounds = [];
        let activeCandidates = [...candidates];
        let currentBallots = ballots.map(b => [...b]);
        let round = 1;

        while (activeCandidates.length > 1) {
            // Count first-choice votes
            const counts = {};
            activeCandidates.forEach(c => counts[c] = 0);

            currentBallots.forEach(ballot => {
                for (const choice of ballot) {
                    if (activeCandidates.includes(choice)) {
                        counts[choice]++;
                        break;
                    }
                }
            });

            // Sort by votes
            const sortedCandidates = [...activeCandidates].sort((a, b) => counts[b] - counts[a]);
            const leader = sortedCandidates[0];
            const leaderVotes = counts[leader];
            const loser = sortedCandidates[sortedCandidates.length - 1];

            const roundData = {
                round,
                counts: { ...counts },
                sortedCandidates: [...sortedCandidates],
                leader,
                leaderVotes,
                loser,
                loserVotes: counts[loser],
                isWinner: leaderVotes >= majorityNeeded,
                activeCandidates: [...activeCandidates]
            };

            rounds.push(roundData);

            if (leaderVotes >= majorityNeeded) {
                break;
            }

            // Remove loser for next round
            activeCandidates = activeCandidates.filter(c => c !== loser);
            round++;
        }

        return rounds;
    }

    showRound(index) {
        const roundDisplay = document.getElementById('round-display');
        const roundNav = document.getElementById('round-nav');
        const roundData = this.rcvRounds[index];
        const isLastRound = index === this.rcvRounds.length - 1;

        // Build round HTML
        let html = `<div class="round-result">`;

        // Vote bars
        roundData.sortedCandidates.forEach(candidate => {
            const votes = roundData.counts[candidate];
            const percentage = (votes / this.totalVotes * 100).toFixed(1);
            const icon = this.getCandidateIcon(candidate);
            const isWinner = roundData.isWinner && candidate === roundData.leader;
            const isEliminated = !roundData.isWinner && candidate === roundData.loser;

            let barClass = '';
            if (isWinner) barClass = 'winner';
            else if (isEliminated) barClass = 'eliminated';

            html += `
                <div class="vote-bar ${barClass}">
                    <div class="bar-label">
                        <span>${icon} ${candidate}</span>
                        <span>${votes} votes (${percentage}%)</span>
                    </div>
                    <div class="bar-track">
                        <div class="bar-fill" style="width: ${percentage}%"></div>
                        ${isWinner ? '<span class="winner-badge">WINNER!</span>' : ''}
                        ${isEliminated ? '<span class="eliminated-badge">ELIMINATED</span>' : ''}
                    </div>
                </div>
            `;
        });

        // Winner message first if final round
        if (roundData.isWinner) {
            html += `
                <div class="winner-message">
                    <h3>${this.getCandidateIcon(roundData.leader)} ${roundData.leader} Wins!</h3>
                    <p>With ${roundData.leaderVotes} votes (${(roundData.leaderVotes / this.totalVotes * 100).toFixed(1)}%), ${roundData.leader} has a majority!</p>
                </div>
            `;
        }

        // Explanation
        if (roundData.isWinner) {
            // Winner round - check if it's the final round with pizza coalition
            if (roundData.round === 4) {
                html += `
                    <div class="round-explanation rcv-success">
                        <p class="round-note"><strong>The Pizza Coalition United!</strong></p>
                        <p class="round-note">Pi Za Pies and Pete Zah had very similar platforms, but with RCV their supporters didn't split the vote. When Pete Zah was eliminated, those 27 votes transferred to Pi Za Pies as their second choice.</p>
                        <p class="round-note"><em>In Winner Take All, these similar candidates would have split the pizza lover vote, letting Frank N. Stein win with only 30%!</em></p>
                    </div>
                `;
            }
        } else {
            // Not a winner round - show elimination explanation
            html += `
                <div class="round-explanation">
                    <p class="round-note"><strong>No winner yet!</strong> ${this.getCandidateIcon(roundData.loser)} <strong>${roundData.loser}</strong> is eliminated.</p>
                    <p class="round-note">Their votes transfer to each voter's next candidate choice.</p>
                </div>
            `;
        }

        html += `</div>`;

        roundDisplay.innerHTML = html;

        // Navigation buttons
        let navHtml = '<div class="round-navigation">';

        if (!isLastRound) {
            navHtml += `<button class="round-nav-btn primary" id="next-round-btn">Next Round &rarr;</button>`;
        }

        navHtml += '</div>';
        roundNav.innerHTML = navHtml;

        // Show/hide the "Winner Take All Demo" button based on whether we're at the final round
        if (isLastRound) {
            this.resetBtn.style.display = 'inline-block';
        } else {
            this.resetBtn.style.display = 'none';
        }

        // Add event listeners
        const nextBtn = document.getElementById('next-round-btn');

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.currentRoundIndex++;
                this.showRound(this.currentRoundIndex);
                // Scroll results into view on mobile
                setTimeout(() => {
                    this.resultsDisplay.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
            });
        }
    }

    async animateWTAElection(ballots) {
        const candidates = ['Pi Za Pies', 'Frank N. Stein', 'Anita Bath', 'Crystal Ball', 'Pete Zah'];
        const totalVotes = ballots.length;
        const majorityNeeded = Math.floor(totalVotes / 2) + 1;

        // Count only first-choice votes (Winner Take All)
        const counts = {};
        candidates.forEach(c => counts[c] = 0);

        ballots.forEach(ballot => {
            const firstChoice = ballot[0];
            if (candidates.includes(firstChoice)) {
                counts[firstChoice]++;
            }
        });

        // Sort by votes
        const sortedCandidates = [...candidates].sort((a, b) => counts[b] - counts[a]);
        const winner = sortedCandidates[0];
        const winnerVotes = counts[winner];
        const winnerPercent = (winnerVotes / totalVotes * 100).toFixed(1);

        this.resultsDisplay.innerHTML = `
            <div class="election-info">
                <p><strong>Total Voters:</strong> ${totalVotes} (including you!)</p>
                <p><strong>Winning Percentage:</strong> Minimum Threshold</p>
            </div>
            <div id="rounds-container"></div>
        `;

        const roundsContainer = document.getElementById('rounds-container');

        // Check if winner has majority
        const hasMajority = winnerVotes >= majorityNeeded;

        // Show results
        const resultsDiv = document.createElement('div');
        resultsDiv.className = 'round-result';

        const barsHtml = sortedCandidates.map(candidate => {
            const votes = counts[candidate];
            const percentage = (votes / totalVotes * 100).toFixed(1);
            const icon = this.getCandidateIcon(candidate);
            const isWinner = candidate === winner;
            const winnerClass = isWinner ? (hasMajority ? 'winner' : 'winner wta-no-majority-winner') : '';
            return `
                <div class="vote-bar ${winnerClass}">
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

        resultsDiv.innerHTML += barsHtml;
        roundsContainer.appendChild(resultsDiv);

        // Animate bars
        await this.delay(100);
        resultsDiv.querySelectorAll('.bar-fill').forEach(bar => {
            bar.style.width = bar.dataset.width + '%';
        });

        // Show winner message first
        await this.delay(800);
        const winnerMessage = document.createElement('div');
        winnerMessage.className = hasMajority ? 'winner-message' : 'winner-message wta-no-majority';
        const othersVotes = totalVotes - winnerVotes;
        const othersPercent = (othersVotes / totalVotes * 100).toFixed(1);
        winnerMessage.innerHTML = hasMajority ? `
            <h3>${this.getCandidateIcon(winner)} ${winner} Wins!</h3>
            <p>With ${winnerVotes} votes (${winnerPercent}%), ${winner} has a true majority!</p>
        ` : `
            <h3>${this.getCandidateIcon(winner)} ${winner} Wins!</h3>
            <ul class="wta-results-list">
                <li>Won WITHOUT majority support!</li>
                <li>They got ${winnerVotes} votes (${winnerPercent}%) the minimum winning threshold</li>
                <li>They won even though ${othersVotes} voters (${othersPercent}%)<br>preferred someone else</li>
            </ul>
        `;
        roundsContainer.appendChild(winnerMessage);

        // Then show vote split analysis (only when no majority)
        if (!hasMajority) {
            const funFoodVotes = counts['Pi Za Pies'] + counts['Pete Zah'];
            const funFoodPercent = (funFoodVotes / totalVotes * 100).toFixed(1);

            const voteSplitDiv = document.createElement('div');
            voteSplitDiv.className = 'vote-split-analysis';
            voteSplitDiv.innerHTML = `
                <h4>🍕 The Sliced Campaigns</h4>
                <p><strong>If Pi Za Pies and Pete Zah were one candidate, they'd have:</strong></p>
                <div class="coalition-bar">
                    <div class="coalition-fill" style="width: ${funFoodPercent}%"></div>
                    <span class="coalition-label">${funFoodVotes} votes (${funFoodPercent}%)</span>
                </div>
                <ul class="split-points">
                    <li>That's <strong>${funFoodVotes > winnerVotes ? 'MORE' : 'fewer'}</strong> votes than the winner!</li>
                    <li>These two similar candidates split the "pizza lover" vote.</li>
                    <li>Most voters want a Pizza candidate, but their votes got thrown out!</li>
                </ul>
            `;
            roundsContainer.appendChild(voteSplitDiv);
        } else {
            const explanationDiv = document.createElement('div');
            explanationDiv.className = 'round-explanation';
            explanationDiv.innerHTML = `
                <p class="round-note"><strong>${this.getCandidateIcon(winner)} ${winner} wins with a majority!</strong></p>
                <p class="round-note">With ${winnerVotes} votes (${winnerPercent}%), they have more than 50% support.</p>
            `;
            roundsContainer.appendChild(explanationDiv);
        }

        // Change reset button text to "RCV Solution" for WTA mode
        if (!hasMajority) {
            this.resetBtn.textContent = '✨ See the RCV Solution';
            this.resetBtn.classList.add('rcv-solution-btn');
        }
    }

    getCandidateIcon(candidate) {
        const icons = {
            'Pi Za Pies': '🍕',
            'Frank N. Stein': '🧟',
            'Anita Bath': '🛁',
            'Crystal Ball': '🔮',
            'Pete Zah': '🍕'
        };
        return icons[candidate] || '👤';
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    resetDemo() {
        // Check if we should switch to RCV mode (when "RCV Solution" button was clicked)
        const switchToRCV = this.resetBtn.classList.contains('rcv-solution-btn');
        // Check if we should switch to WTA mode (when "Winner Take All Demo" button was clicked after RCV)
        const switchToWTA = !switchToRCV && this.votingMode === 'rcv' && this.resetBtn.style.display !== 'none';

        // Reset rankings
        this.userRankings = [];

        // Re-enable clicking and reset display
        const items = this.candidateList.querySelectorAll('.candidate-item');
        items.forEach(item => {
            item.classList.remove('locked', 'ranked');
            item.classList.add('unranked');
            item.querySelector('.rank-badge').textContent = '';
        });

        // Reset button text and styling
        this.resetBtn.textContent = 'Winner Take All Demo';
        this.resetBtn.classList.remove('rcv-solution-btn');

        // Reset buttons
        this.castVoteBtn.style.display = 'inline-block';
        this.resetBtn.style.display = 'none';

        // Regenerate simulated voters for variety
        this.simulatedVoters = this.generateSimulatedVoters();

        // Switch to RCV mode
        if (switchToRCV) {
            this.votingMode = 'rcv';
            this.rcvModeBtn.classList.add('active');
            this.wtaModeBtn.classList.remove('active');
        }
        // Switch to WTA mode
        else if (switchToWTA) {
            this.votingMode = 'wta';
            this.wtaModeBtn.classList.add('active');
            this.rcvModeBtn.classList.remove('active');
        }

        // Reset results with mode-appropriate placeholder
        const placeholderText = this.votingMode === 'rcv'
            ? 'Cast your vote to see how RCV works!'
            : 'Cast your vote to see how Winner Take All Voting works!';
        this.resultsDisplay.innerHTML = `<p class="results-placeholder">${placeholderText}</p>`;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new RCVDemo();
});
