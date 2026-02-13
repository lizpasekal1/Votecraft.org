/* ====== VoteCraft Coin — Page Interactions ====== */

(function () {
    'use strict';

    // ====== DOM REFS ======
    const badgeToggle = document.getElementById('badge-toggle');
    const badgeName = document.getElementById('badge-name');

    // ====== SCROLL ANIMATIONS (Intersection Observer) ======

    const animateObserver = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const delay = parseInt(entry.target.dataset.delay || '0', 10);
                    setTimeout(() => {
                        entry.target.classList.add('visible');
                    }, delay * 150);
                    animateObserver.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.15 }
    );

    document.querySelectorAll('.animate-in').forEach((el) => {
        animateObserver.observe(el);
    });

    // ====== PATRON BADGE TOGGLE ======

    let badgeShowName = true;

    badgeToggle.addEventListener('click', () => {
        badgeShowName = !badgeShowName;
        badgeToggle.classList.toggle('active', badgeShowName);

        if (badgeShowName) {
            badgeName.textContent = 'Alex M.';
            badgeName.classList.remove('anonymous');
            badgeToggle.querySelector('.toggle-label').textContent = 'Show my name';
        } else {
            badgeName.textContent = 'Anonymous Patron';
            badgeName.classList.add('anonymous');
            badgeToggle.querySelector('.toggle-label').textContent = 'Stay anonymous';
        }
    });

    // Initialize toggle as active (showing name)
    badgeToggle.classList.add('active');

    // ====== SOCIAL PROOF TICKER (infinite scroll) ======

    function initTicker() {
        const content = document.getElementById('ticker-content');
        if (!content) return;
        // Duplicate items for seamless loop
        const items = content.innerHTML;
        content.innerHTML = items + items;
    }

    initTicker();

    // ====== CONTRIBUTOR QUIZ ======

    const quizTypes = {
        doer: {
            icon: '&#9889;',
            title: 'The Civic Doer',
            desc: 'You lead with action. When something needs fixing, you show up. Volunteering, canvassing, organizing — you turn energy into impact. VC rewards the hands-on work that keeps communities moving.',
            paths: [
                { action: 'Volunteer with partner orgs', vc: '+15 VC/session' },
                { action: 'Support reform nonprofits', vc: '+25 VC' },
                { action: 'Help with voter registration', vc: '+10 VC' },
            ],
        },
        learner: {
            icon: '&#128218;',
            title: 'The Informed Citizen',
            desc: 'You believe knowledge is power. You dig into policy, understand root causes, and make decisions based on evidence. VC rewards the curiosity that makes democracy smarter.',
            paths: [
                { action: 'Complete civic deep dives', vc: '+5 VC/module' },
                { action: 'Share research with community', vc: '+8 VC' },
                { action: 'Support reform nonprofits', vc: '+25 VC' },
            ],
        },
        connector: {
            icon: '&#127760;',
            title: 'The Community Connector',
            desc: 'You bring people together. You know that change happens when communities organize, share skills, and lift each other up. VC rewards the social fabric that makes civic action possible.',
            paths: [
                { action: 'Exchange civic skills via VC', vc: '+10-20 VC' },
                { action: 'Rally others to support reform', vc: '+15 VC' },
                { action: 'Host civic events', vc: '+12 VC' },
            ],
        },
        supporter: {
            icon: '&#10084;',
            title: 'The Steady Supporter',
            desc: 'You believe in putting your resources where your values are. You find the organizations doing the work and fuel their mission. VC rewards the generosity that makes reform possible.',
            paths: [
                { action: 'Donate to reform nonprofits', vc: '+25 VC' },
                { action: 'Earn Patron Badge ($50+)', vc: 'Badge + VC' },
                { action: 'Learn about the issues you fund', vc: '+5 VC' },
            ],
        },
    };

    let quizAnswers = [];
    let currentQuizStep = 1;

    function initQuiz() {
        const container = document.getElementById('quiz-container');
        if (!container) return;

        container.addEventListener('click', (e) => {
            const option = e.target.closest('.quiz-option');
            if (!option) return;

            const type = option.dataset.type;
            quizAnswers.push(type);

            // Highlight selected
            option.classList.add('selected');

            // Advance after brief delay
            setTimeout(() => {
                currentQuizStep++;
                if (currentQuizStep <= 3) {
                    showQuizStep(currentQuizStep);
                } else {
                    showQuizResult();
                }
            }, 400);
        });

        // Retake button
        const retake = document.getElementById('quiz-retake');
        if (retake) {
            retake.addEventListener('click', () => {
                quizAnswers = [];
                currentQuizStep = 1;
                document.getElementById('quiz-result').hidden = true;
                document.querySelectorAll('.quiz-step').forEach((s) => s.classList.remove('active'));
                document.querySelectorAll('.quiz-option').forEach((o) => o.classList.remove('selected'));
                document.querySelector('.quiz-step[data-step="1"]').classList.add('active');
            });
        }
    }

    function showQuizStep(step) {
        document.querySelectorAll('.quiz-step').forEach((s) => s.classList.remove('active'));
        const next = document.querySelector(`.quiz-step[data-step="${step}"]`);
        if (next) next.classList.add('active');
    }

    function showQuizResult() {
        // Count type occurrences
        const counts = {};
        quizAnswers.forEach((t) => { counts[t] = (counts[t] || 0) + 1; });
        const winner = Object.keys(counts).reduce((a, b) => counts[a] >= counts[b] ? a : b);
        const result = quizTypes[winner];

        // Hide questions, show result
        document.querySelectorAll('.quiz-step').forEach((s) => s.classList.remove('active'));
        const resultEl = document.getElementById('quiz-result');
        resultEl.hidden = false;

        document.getElementById('quiz-result-icon').innerHTML = result.icon;
        document.getElementById('quiz-result-title').textContent = result.title;
        document.getElementById('quiz-result-desc').textContent = result.desc;

        const pathsEl = document.getElementById('quiz-result-paths');
        pathsEl.innerHTML = result.paths
            .map(
                (p) => `
            <div class="quiz-path">
                <span class="quiz-path-action">${p.action}</span>
                <span class="quiz-path-vc">${p.vc}</span>
            </div>
        `
            )
            .join('');
    }

    initQuiz();

    // ====== NOT CRYPTO MODAL ======

    const notCryptoBtn = document.getElementById('not-crypto-btn');
    const notCryptoModal = document.getElementById('not-crypto-modal');
    const modalClose = document.getElementById('modal-close');

    notCryptoBtn.addEventListener('click', () => {
        notCryptoModal.classList.add('open');
    });

    modalClose.addEventListener('click', () => {
        notCryptoModal.classList.remove('open');
    });

    notCryptoModal.addEventListener('click', (e) => {
        if (e.target === notCryptoModal) {
            notCryptoModal.classList.remove('open');
        }
    });

    // ====== LISTING ACCORDIONS ======

    document.querySelectorAll('#stories .exchange-listing').forEach(listing => {
        listing.addEventListener('click', () => {
            const wasExpanded = listing.classList.contains('expanded');
            // Close all others
            document.querySelectorAll('#stories .exchange-listing.expanded').forEach(el => {
                el.classList.remove('expanded');
            });
            // Toggle clicked one
            if (!wasExpanded) {
                listing.classList.add('expanded');
            }
        });
    });

    // ====== NONPROFIT MODAL ======

    const supportNonprofitCard = document.getElementById('support-nonprofit-card');
    const nonprofitModal = document.getElementById('nonprofit-modal');
    const nonprofitModalClose = document.getElementById('nonprofit-modal-close');

    supportNonprofitCard.addEventListener('click', () => {
        nonprofitModal.classList.add('open');
    });

    nonprofitModalClose.addEventListener('click', () => {
        nonprofitModal.classList.remove('open');
    });

    nonprofitModal.addEventListener('click', (e) => {
        if (e.target === nonprofitModal) {
            nonprofitModal.classList.remove('open');
        }
    });

    // ====== LEARN MODULE MODAL ======

    const learnIssueCard = document.getElementById('learn-issue-card');
    const learnModal = document.getElementById('learn-modal');
    const learnModalClose = document.getElementById('learn-modal-close');

    learnIssueCard.addEventListener('click', () => {
        learnModal.classList.add('open');
    });

    learnModalClose.addEventListener('click', () => {
        learnModal.classList.remove('open');
    });

    learnModal.addEventListener('click', (e) => {
        if (e.target === learnModal) {
            learnModal.classList.remove('open');
        }
    });

    // ====== QUIZ MODAL ======

    const contributeTimeCard = document.getElementById('contribute-time-card');
    const quizModal = document.getElementById('quiz-modal');
    const quizModalClose = document.getElementById('quiz-modal-close');

    contributeTimeCard.addEventListener('click', () => {
        quizModal.classList.add('open');
    });

    quizModalClose.addEventListener('click', () => {
        quizModal.classList.remove('open');
    });

    quizModal.addEventListener('click', (e) => {
        if (e.target === quizModal) {
            quizModal.classList.remove('open');
        }
    });

    // ====== ESCAPE KEY FOR ALL MODALS ======

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (notCryptoModal.classList.contains('open')) {
                notCryptoModal.classList.remove('open');
            }
            if (quizModal.classList.contains('open')) {
                quizModal.classList.remove('open');
            }
        }
    });

    // ====== INTERACTIVE ALTRUISM TAGS ======

    function initAltruismTags() {
        const transactionTags = document.getElementById('transaction-tags');
        const grid = document.getElementById('altruism-tags-grid');
        if (!transactionTags || !grid) return;

        // Track active tags
        const activeTags = new Set();

        function renderTransaction() {
            transactionTags.innerHTML = '';
            if (activeTags.size === 0) {
                const hint = document.createElement('span');
                hint.className = 'tags-empty-hint';
                hint.textContent = 'Click tags below to add them';
                transactionTags.appendChild(hint);
                return;
            }
            activeTags.forEach(key => {
                const [type, name] = key.split('::');
                const tag = document.createElement('span');
                tag.className = 'atag atag-' + type + ' atag-removable';
                tag.textContent = name;
                tag.dataset.tag = name;
                tag.dataset.type = type;
                tag.title = 'Click to remove';
                transactionTags.appendChild(tag);
            });
        }

        function syncCategoryStates() {
            grid.querySelectorAll('.atag[data-tag]').forEach(el => {
                const key = el.dataset.type + '::' + el.dataset.tag;
                el.classList.toggle('atag-active', activeTags.has(key));
            });
        }

        // Click category tags to add
        grid.addEventListener('click', e => {
            const tag = e.target.closest('.atag[data-tag]');
            if (!tag) return;
            const key = tag.dataset.type + '::' + tag.dataset.tag;
            if (activeTags.has(key)) {
                activeTags.delete(key);
            } else {
                activeTags.add(key);
            }
            renderTransaction();
            syncCategoryStates();
        });

        // Click transaction tags to remove
        transactionTags.addEventListener('click', e => {
            const tag = e.target.closest('.atag[data-tag]');
            if (!tag) return;
            const key = tag.dataset.type + '::' + tag.dataset.tag;
            activeTags.delete(key);
            renderTransaction();
            syncCategoryStates();
        });

        // Pre-populate with 3 default tags
        activeTags.add('contribution::Volunteer');
        activeTags.add('impact::Civic Education');
        activeTags.add('effort::Helpful');
        renderTransaction();
        syncCategoryStates();
    }

    initAltruismTags();

    // ====== HERO PARTICLES ======

    function createHeroParticles() {
        const container = document.getElementById('particles');
        const count = 30;

        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.top = (60 + Math.random() * 40) + '%';
            particle.style.animationDuration = (8 + Math.random() * 12) + 's';
            particle.style.animationDelay = Math.random() * 10 + 's';

            const colors = ['#14CCB0', '#2563eb', '#F32B44'];
            particle.style.background = colors[Math.floor(Math.random() * colors.length)];

            container.appendChild(particle);
        }
    }

    createHeroParticles();

    // ====== COIN COLOR CYCLE ======
    // Each face changes while hidden, new color revealed only on flip
    // Spin: front at 0/3/6/9/12s, back at 1.5/4.5/7.5/10.5/13.5s (6s cycle)
    const fronts = document.querySelectorAll('.coin-front');
    const backs = document.querySelectorAll('.coin-back');
    if (fronts.length) {
        const cycle = () => {
            setTimeout(() => fronts.forEach(f => f.classList.add('teal')), 1500);    // front hidden → snap teal
            setTimeout(() => backs.forEach(b => b.classList.add('teal')), 3000);     // back hidden → snap teal
            setTimeout(() => fronts.forEach(f => f.classList.remove('teal')), 7500); // front hidden → snap red
            setTimeout(() => backs.forEach(b => b.classList.remove('teal')), 9000);  // back hidden → snap blue
        };
        cycle();
        setInterval(cycle, 12000);
    }
})();
