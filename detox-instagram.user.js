// ==UserScript==
// @name         Detox Instagram
// @namespace    DETOX_INSTAGRAM
// @version      2026-01-25
// @description  Removes ads, reels and the explore page from Instagram. The page also slowly fades out after spending time on the site.
// @author       Theo Coombes
// @match        https://www.instagram.com/*
// @grant        none
// @license      MIT
// @downloadURL  https://cdn.jsdelivr.net/gh/TheoCoombes/Detox/detox-instagram.user.js
// @updateURL    https://cdn.jsdelivr.net/gh/TheoCoombes/Detox/detox-instagram.user.js
// ==/UserScript==

(function () {
    'use strict';

    const INITIAL_DELAY_MS = 2.5 * 60 * 1000; // 2.5 minutes
    const FADE_DURATION_MS = 2.5 * 60 * 1000; // 2.5 minutes
    const TOTAL_LIFETIME_MS = 10 * 60 * 1000; // 10 minutes
    const UPDATE_INTERVAL_MS = 5 * 1000; // 5 seconds
    const STORAGE_KEY = 'detox_fade_state_instagram';

    let sessionStartTime = null;
    let elapsedTimeAtPause = 0;
    let isWindowActive = true;
    let updateIntervalId = null;
    let storageIntervalId = null;
    const VISUAL_UPDATE_INTERVAL_MS = 100; // 100ms for smooth opacity changes
    const STORAGE_UPDATE_INTERVAL_MS = 5 * 1000; // 5 seconds for localStorage saves

    function forceRedirectIfReels() {
        const match = location.pathname.match(/^\/reels\/([^/?]+)/);
        if (!match) return;

        const postId = match[1];
        location.replace(`/p/${postId}/`);
    }

    function handleMainVisibility() {
        const mainElement = document.querySelector('main');
        if (!mainElement) return;

        const path = location.pathname;
        const isReelsPage = path.startsWith('/reels/');
        const isExplorePage = path.startsWith('/explore/');

        if (isReelsPage) {
            mainElement.style.display = 'none';
        }
        else if (isExplorePage) {
            const links = document.querySelectorAll('a[href^="/p/"], a[href^="/reels/"]');
            
            let found;
            links.forEach(link => {
                let current = link;
                while (current) {
                    const parent = current.parentElement;
                    if (parent?.getAttribute('role') === 'presentation') {
                        found = true;
                        parent.remove();
                        break;
                    }
                    current = parent;

                    if (found) break;
                }
            });
        }
    }

    function removeReelsNavLinks() {
        const links = document.querySelectorAll('a[href^="/reels/"]');

        links.forEach(link => {
            const p1 = link.parentElement;
            const p2 = p1?.parentElement;
            const p3 = p2?.parentElement;
            p3.remove();
        });
    }

    function removeAdsAndSponsoredPosts() {
        // Case 1: "•" span followed by "Follow"
        const dotSpans = Array.from(document.querySelectorAll('span'))
            .filter(span => span.textContent.trim() === '•');

        dotSpans.forEach(span => {
            const parentSpan = span.parentElement;
            const nextSibling = parentSpan?.nextElementSibling;

            if (
                nextSibling &&
                nextSibling.tagName === 'DIV' &&
                nextSibling.textContent.trim() === 'Follow'
            ) {
                const article = nextSibling.closest('article');
                if (article) article.style.visibility = "hidden";
            }
        });

        // Case 2: "Sponsored"
        const sponsoredSpans = Array.from(document.querySelectorAll('span'))
            .filter(span => span.textContent.trim() === 'Sponsored');

        sponsoredSpans.forEach(span => {
            const article = span.closest('article');
            if (article) article.style.visibility = "hidden";
        });

        // Case 3: "and" surrounded by <div> or <a> pattern
        const andSpans = Array.from(document.querySelectorAll('span'))
            .filter(span => span.textContent.trim() === 'and');

        andSpans.forEach(span => {
            const prevSibling = span.previousElementSibling;
            const nextSibling = span.nextElementSibling;

            if (
                prevSibling &&
                prevSibling.tagName === 'DIV' &&
                nextSibling &&
                nextSibling.tagName === 'DIV'
            ) {
                const article = span.closest('article');
                if (article) article.style.visibility = "hidden";
            }
            else if (
                prevSibling &&
                prevSibling.tagName === 'A' &&
                nextSibling &&
                nextSibling.tagName === 'A'
            ) {
                const article = span.closest('article');
                if (article) article.style.visibility = "hidden";
            }
        });
    }
    
    // Initialize or resume session
    function initializeSession() {
        const stored = localStorage.getItem(STORAGE_KEY);

        if (stored) {
            const state = JSON.parse(stored);
            const timeSinceExpiry = Date.now() - state.timestamp;

            if (timeSinceExpiry < TOTAL_LIFETIME_MS) {
                // Resume existing session
                sessionStartTime = Date.now() - state.elapsedTime;
                elapsedTimeAtPause = 0;
            } else {
                // Session expired, start new one
                sessionStartTime = Date.now();
                localStorage.removeItem(STORAGE_KEY);
            }
        } else {
            // Start new session
            sessionStartTime = Date.now();
        }

        startUpdateLoop();
        attachWindowListeners();
    }

    function attachWindowListeners() {
        window.addEventListener('focus', () => {
            isWindowActive = true;
        });

        window.addEventListener('blur', () => {
            isWindowActive = false;
            elapsedTimeAtPause = getElapsedTime();
        });
    }

    function getElapsedTime() {
        if (!isWindowActive) {
            return elapsedTimeAtPause;
        }
        return Date.now() - sessionStartTime;
    }

    function updateFadeState() {
        const elapsedTime = getElapsedTime();

        // Calculate opacity
        let opacity = 0;

        if (elapsedTime < INITIAL_DELAY_MS) {
            // Before fade starts
            opacity = 0;
        } else if (elapsedTime < INITIAL_DELAY_MS + FADE_DURATION_MS) {
            // During fade
            const fadeProgress = (elapsedTime - INITIAL_DELAY_MS) / FADE_DURATION_MS;
            opacity = Math.min(fadeProgress, 1);
        } else {
            // Fully faded
            opacity = 1;
        }

        document.body.style.opacity = opacity.toString();

        // Check if we should stop updating (fully faded for a bit)
        if (elapsedTime > TOTAL_LIFETIME_MS) {
            stopUpdateLoop();
            localStorage.removeItem(STORAGE_KEY);
        }
    }

    function updateStorage() {
        const elapsedTime = getElapsedTime();

        // Save state to localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            elapsedTime: elapsedTime,
            timestamp: Date.now(),
        }));
    }

    function startUpdateLoop() {
        if (updateIntervalId) return;
        updateIntervalId = setInterval(updateFadeState, VISUAL_UPDATE_INTERVAL_MS);
        storageIntervalId = setInterval(updateStorage, STORAGE_UPDATE_INTERVAL_MS);
        // Initial update
        updateFadeState();
        updateStorage();
    }

    function stopUpdateLoop() {
        if (updateIntervalId) {
            clearInterval(updateIntervalId);
            updateIntervalId = null;
        }
        if (storageIntervalId) {
            clearInterval(storageIntervalId);
            storageIntervalId = null;
        }
    }

    function runAll() {
        forceRedirectIfReels();
        handleMainVisibility();
        removeReelsNavLinks();
        removeAdsAndSponsoredPosts();
    }

    // Initial run
    runAll();
    
    // Start the fadeout session
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeSession);
    } else {
        initializeSession();
    }

    // runAll on DOM changes
    const observer = new MutationObserver(runAll);
    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    //runAll on path change
    let lastPath = location.pathname;
    setInterval(() => {
        if (location.pathname !== lastPath) {
            lastPath = location.pathname;
            runAll();
        }
    }, 250);
})();
