/**
 * VoteCraft Sidebar Navigation — Frontend JS
 * Desktop: always open by default, toggle button to collapse/expand
 * Mobile: hamburger drawer
 */
(function () {
    'use strict';

    var sidebar      = document.getElementById('vc-sidebar');
    var overlay      = document.getElementById('vc-sidebar-overlay');
    var mobileToggle = document.getElementById('vc-mobile-toggle');
    var MOBILE_BP    = 768;

    if (!sidebar) return;

    var toggleBtn = sidebar.querySelector('.vc-sidebar__toggle');

    /* ─── Desktop: toggle button collapses/expands ─── */

    if (toggleBtn) {
        toggleBtn.addEventListener('click', function () {
            if (window.innerWidth <= MOBILE_BP) {
                closeDrawer();
            } else {
                // Desktop: toggle between open and collapsed
                if (sidebar.classList.contains('vc-sidebar--collapsed')) {
                    openSidebar();
                } else {
                    collapseSidebar();
                }
            }
        });
    }

    /* ─── Mobile hamburger ─── */

    if (mobileToggle) {
        mobileToggle.addEventListener('click', function () {
            openDrawer();
        });
    }

    /* ─── Overlay click → close drawer ─── */

    if (overlay) {
        overlay.addEventListener('click', function () {
            closeDrawer();
        });
    }

    /* ─── Escape key ─── */

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            if (window.innerWidth <= MOBILE_BP) {
                closeDrawer();
            } else {
                collapseSidebar();
            }
        }
    });

    /* ─── Active state based on current URL ─── */

    /**
     * Derive a readable subpage name from the URL slug.
     * Uses document.title first (strips site name suffix), falls back to slug.
     */
    function getSubpageName(currentPath, parentPath) {
        // Try document.title: typically "Page Title – Site Name" or "Page Title | Site Name"
        var title = document.title || '';
        var sep = title.indexOf(' – ') !== -1 ? ' – '
                : title.indexOf(' — ') !== -1 ? ' — '
                : title.indexOf(' | ') !== -1 ? ' | '
                : null;
        if (sep) {
            var pageTitle = title.split(sep)[0].trim();
            if (pageTitle) return pageTitle;
        }

        // Fallback: convert the last slug segment to a readable name
        var sub = currentPath.replace(parentPath, '').replace(/^\/+|\/+$/g, '');
        var lastSegment = sub.split('/').pop();
        if (!lastSegment) return '';
        return lastSegment.replace(/-/g, ' ').replace(/\b\w/g, function (c) {
            return c.toUpperCase();
        });
    }

    function setActiveItem() {
        var path = window.location.pathname.replace(/\/+$/, '') || '/';
        var links = sidebar.querySelectorAll('.vc-sidebar__link');

        links.forEach(function (link) {
            var item = link.parentElement;
            var href = link.getAttribute('href') || '';

            var linkPath;
            try {
                if (href.indexOf('http') === 0) {
                    linkPath = new URL(href).pathname;
                } else {
                    linkPath = href;
                }
            } catch (e) {
                linkPath = href;
            }

            linkPath = linkPath.replace(/\/+$/, '') || '/';

            if (path === linkPath) {
                // Exact match
                item.classList.add('vc-sidebar__item--active');
            } else if (linkPath !== '/' && linkPath.length > 1 && path.indexOf(linkPath + '/') === 0) {
                // Subpage match: current path starts with this menu item's path
                item.classList.add('vc-sidebar__item--active');

                // Inject sublabel if PHP didn't render one
                if (!item.querySelector('.vc-sidebar__sublabel')) {
                    var subName = getSubpageName(path, linkPath);
                    if (subName) {
                        var a = document.createElement('a');
                        a.className = 'vc-sidebar__sublabel';
                        a.textContent = subName;
                        a.href = window.location.pathname;
                        item.appendChild(a);
                    }
                }
            } else {
                item.classList.remove('vc-sidebar__item--active');
                // Remove any JS-injected sublabel when not on subpage
                var oldSub = item.querySelector('.vc-sidebar__sublabel');
                if (oldSub) oldSub.remove();
            }
        });
    }

    setActiveItem();

    /* ─── Page Crossfade Transitions ─── */

    var crossfadeEnabled = sidebar.getAttribute('data-crossfade') !== '0';
    var FADE_OUT_MS      = parseInt(sidebar.getAttribute('data-fade-out'), 10) || 400;

    var content = document.querySelector('.elementor');

    if (crossfadeEnabled && content) {
        // Fade in on page load
        content.classList.add('vc-page-entering');
        content.addEventListener('animationend', function () {
            content.classList.remove('vc-page-entering');
        }, { once: true });
    }

    // Intercept sidebar + mobile tab link clicks → fade out then navigate
    var navLinks = sidebar.querySelectorAll('.vc-sidebar__link');
    var tabBar = document.getElementById('vc-mobile-tabs');
    var tabLinks = tabBar ? tabBar.querySelectorAll('.vc-mobile-tabs__item') : [];

    function handleNavClick(e) {
        if (!crossfadeEnabled) return; // disabled — let browser navigate normally

        var link = e.currentTarget;
        var href = link.getAttribute('href');

        // Skip if no href, same page, external, or modifier key held
        if (!href || href === '#' || e.ctrlKey || e.metaKey || e.shiftKey) return;

        try {
            var url = new URL(href, window.location.origin);
            if (url.origin !== window.location.origin) return;
            if (url.pathname.replace(/\/+$/, '') === window.location.pathname.replace(/\/+$/, '')) return;
        } catch (err) { return; }

        e.preventDefault();

        if (content) {
            content.classList.add('vc-page-leaving');
            setTimeout(function () {
                window.location.href = href;
            }, FADE_OUT_MS);
        } else {
            window.location.href = href;
        }
    }

    navLinks.forEach(function (link) { link.addEventListener('click', handleNavClick); });
    tabLinks.forEach(function (link) { link.addEventListener('click', handleNavClick); });

    /* ─── Swipe-to-close gesture (mobile) ─── */

    var touchStartX = 0;
    var touchStartY = 0;
    var SWIPE_THRESHOLD = 60; // px left swipe to close

    document.addEventListener('touchstart', function (e) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: true });

    document.addEventListener('touchend', function (e) {
        if (window.innerWidth > MOBILE_BP) return;
        if (!sidebar.classList.contains('vc-sidebar--open')) return;

        var dx = e.changedTouches[0].clientX - touchStartX;
        var dy = e.changedTouches[0].clientY - touchStartY;

        // Only close on predominantly horizontal left swipe
        if (dx < -SWIPE_THRESHOLD && Math.abs(dy) < Math.abs(dx)) {
            closeDrawer();
        }
    }, { passive: true });

    /* ─── Resize handler ─── */

    var resizeTimer;
    window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
            if (window.innerWidth > MOBILE_BP) {
                // Back to desktop: close mobile drawer, restore sidebar
                closeDrawer();
                openSidebar();
            } else {
                // Switched to mobile: close sidebar
                sidebar.classList.remove('vc-sidebar--collapsed');
                document.body.classList.remove('vc-sidebar-collapsed');
            }
        }, 150);
    });

    /* ─── Helper functions ─── */

    function openSidebar() {
        sidebar.classList.remove('vc-sidebar--collapsed');
        document.body.classList.remove('vc-sidebar-collapsed');
        if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'true');
    }

    function collapseSidebar() {
        sidebar.classList.add('vc-sidebar--collapsed');
        document.body.classList.add('vc-sidebar-collapsed');
        if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
    }

    function openDrawer() {
        sidebar.classList.add('vc-sidebar--open');
        if (overlay) overlay.classList.add('vc-sidebar__overlay--visible');
        document.body.style.overflow = 'hidden';
        if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'true');
    }

    function closeDrawer() {
        sidebar.classList.remove('vc-sidebar--open');
        if (overlay) overlay.classList.remove('vc-sidebar__overlay--visible');
        document.body.style.overflow = '';
        if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
    }

})();
