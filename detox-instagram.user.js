// ==UserScript==
// @name         Detox Instagram
// @namespace    DETOX_INSTAGRAM
// @version      2026-01-28-2
// @description  Removes ads, reels and the explore page from Instagram. The page also slowly fades out after spending time on the site.
// @author       Theo Coombes
// @match        https://www.instagram.com/*
// @grant        none
// @license      MIT
// @run-at       document-idle
// @downloadURL  https://cdn.jsdelivr.net/gh/TheoCoombes/Detox/detox-instagram.user.js
// @updateURL    https://cdn.jsdelivr.net/gh/TheoCoombes/Detox/detox-instagram.user.js
// ==/UserScript==

(function () {
    'use strict';

    const MAX_TIME_SECONDS = 5 * 60; // 5 minutes until fully invisible
    const EXPIRATION_TIME = 10 * 60 * 1000; // 10 minutes
    const STORAGE_KEY = 'detox_instagram_time_spent';

    function getTimeSpentData() {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) return null;

        try {
            return JSON.parse(data);
        } catch {
            return null;
        }
    }

    function saveTimeSpentData(seconds) {
        const data = {
            seconds: seconds,
            expires: Date.now() + EXPIRATION_TIME
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    function incrementTimeSpent() {
        let data = getTimeSpentData();

        // Check if expired or doesn't exist
        if (!data || data.expires < Date.now()) {
            saveTimeSpentData(1);
            return 1;
        }

        // Increment
        const newSeconds = data.seconds + 1;
        saveTimeSpentData(newSeconds);
        return newSeconds;
    }

    function updateOpacity() {
        const seconds = getTimeSpentData()?.seconds || 0;
        const opacity = Math.max(0, 1 - (seconds / MAX_TIME_SECONDS));
        document.documentElement.style.opacity = opacity;
    }

    function setupTimeTracking() {
        // Update opacity immediately
        updateOpacity();

        // Track every second when page is focused
        setInterval(() => {
            if (document.hasFocus()) {
                incrementTimeSpent();
                updateOpacity();
            }
        }, 1000);
    }

    // ---

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

    function runAll() {
        forceRedirectIfReels();
        handleMainVisibility();
        removeReelsNavLinks();
        removeAdsAndSponsoredPosts();
    }

    // runAll on DOM changes
    const observer = new MutationObserver(runAll);
    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    // runAll on path change
    let lastPath = location.pathname;
    setInterval(() => {
        if (location.pathname !== lastPath) {
            lastPath = location.pathname;
            runAll();
        }
    }, 250);

    runAll();
    setupTimeTracking();
})();
