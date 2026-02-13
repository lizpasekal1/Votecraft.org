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

    // ====== POPUP MODAL (iframe) ======

    const popupModal = document.getElementById('popup-modal');
    const popupIframe = document.getElementById('popup-iframe');
    const popupClose = document.getElementById('popup-modal-close');

    function openPopup(url) {
        popupIframe.src = url;
        popupModal.classList.add('open');
    }

    function closePopup() {
        popupModal.classList.remove('open');
        setTimeout(() => { popupIframe.src = ''; }, 300);
    }

    document.querySelectorAll('[data-popup]').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            openPopup(el.dataset.popup);
        });
    });

    popupClose.addEventListener('click', closePopup);
    popupModal.addEventListener('click', (e) => {
        if (e.target === popupModal) closePopup();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && popupModal.classList.contains('open')) {
            closePopup();
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
