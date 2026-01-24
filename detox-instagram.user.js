// ==UserScript==
// @name         Detox Instagram
// @namespace    DETOX_INSTAGRAM
// @version      2026-01-20
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

    const TIME_KEY = 'detox_instagram_time_spent';
    const LAST_SAVED_KEY = 'detox_instagram_last_saved';
    const FADE_START_MS = 2 * 60 * 1000; // 2 minutes before fade starts
    const FADE_RATE = 0.0001; // opacity lost per millisecond after fade start
    const SAVE_INTERVAL_MS = 10 * 1000; // Save every 10 seconds
    
    let sessionStartTime = Date.now();
    let totalTimeSpent = 0; // Accumulated time from previous sessions

    // Generate a unique session ID to prevent cheating via localStorage manipulation
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    function getStoredTimeSpent() {
        try {
            const stored = localStorage.getItem(TIME_KEY);
            if (!stored) return 0;
            
            const data = JSON.parse(stored);
            
            // Validate that stored data has reasonable structure
            if (typeof data.totalTime !== 'number' || data.totalTime < 0) {
                return 0;
            }
            
            // Check last save time to detect manipulation
            const lastSaved = parseInt(localStorage.getItem(LAST_SAVED_KEY), 10);
            const now = Date.now();
            
            // If last save was in the future, data was tampered with
            if (lastSaved > now) {
                localStorage.removeItem(TIME_KEY);
                localStorage.removeItem(LAST_SAVED_KEY);
                return 0;
            }
            
            return data.totalTime;
        } catch (e) {
            return 0;
        }
    }

    function saveTimeSpent() {
        try {
            const now = Date.now();
            const elapsedInSession = now - sessionStartTime;
            const newTotal = totalTimeSpent + elapsedInSession;
            
            localStorage.setItem(TIME_KEY, JSON.stringify({
                totalTime: newTotal,
                sessionId: sessionId
            }));
            localStorage.setItem(LAST_SAVED_KEY, now.toString());
            
            // Reset session timer after save
            sessionStartTime = now;
            totalTimeSpent = newTotal;
        } catch (e) {
            console.warn('Failed to save time spent:', e);
        }
    }

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

    function calculateOpacity() {
        const now = Date.now();
        const elapsedInSession = now - sessionStartTime;
        const totalTime = totalTimeSpent + elapsedInSession;

        // No fade for first 2 minutes
        if (totalTime < FADE_START_MS) {
            return 1;
        }

        // Calculate fade: loses opacity gradually after 2 minutes
        const fadeAmount = (totalTime - FADE_START_MS) * FADE_RATE;
        return Math.max(0, 1 - fadeAmount);
    }

    function updateOpacity() {
        const opacity = calculateOpacity();
        document.body.style.opacity = opacity;
    }
    
    function runAll() {
        forceRedirectIfReels();
        handleMainVisibility();
        removeReelsNavLinks();
        removeAdsAndSponsoredPosts();
    }

    // Initial run
    runAll();

    // Initialize with stored time
    totalTimeSpent = getStoredTimeSpent();
    updateOpacity();

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

    // Update opacity continuously
    setInterval(updateOpacity, 100);

    // Save progress periodically
    setInterval(saveTimeSpent, SAVE_INTERVAL_MS);

    // Save when page is hidden
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            saveTimeSpent();
        }
    });

    // Save when page unloads
    window.addEventListener('beforeunload', () => {
        saveTimeSpent();
    });
})();
