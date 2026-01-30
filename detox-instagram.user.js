// ==UserScript==
// @name         Detox Instagram
// @namespace    DETOX_INSTAGRAM
// @version      2026-01-30
// @description  Slowly fades out Instagram and removes ads, reels and the explore page to avoid excessive scrolling.
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

    // ----- CONFIG -----

    const SECONDS_UNTIL_BLACK = 5 * 60;     // Default: 5 minutes
    const SECONDS_UNTIL_RESET = 10 * 60;    // Default: 10 minutes

    // ----- PAGE FADEOUT -----

    const STORAGE_KEY = 'detox_time_spent';
    let initialized = false;

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
            expires: Date.now() + (SECONDS_UNTIL_RESET * 1000)
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    function tickOpacity() {
        // Fetch existing time spent data from localStorage; increment if existing data is valid.
        let data = getTimeSpentData();
        let seconds = (!data || data.expires < Date.now()) ? 0 : data.seconds + 1;

        // Save time spent to localStorage.
        saveTimeSpentData(seconds);

        // Update the page's opacity.
        const opacity = Math.max(0, 1 - (seconds / SECONDS_UNTIL_BLACK));
        document.documentElement.style.opacity = opacity;
    }

    function initFadeout() {
        if (initialized) return;
        initialized = true;
        
        // Initialize state.
        tickOpacity();

        // Track every second when page is focused.
        setInterval(() => {
            if (document.hasFocus()) {
                tickOpacity();
            }
        }, 1000);
    }

    // ----- REMOVE REELS + EXPLORE PAGE -----

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
        // Case 1: "•" span followed by "Follow".
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

        // Case 2: "Sponsored".
        const sponsoredSpans = Array.from(document.querySelectorAll('span'))
            .filter(span => span.textContent.trim() === 'Sponsored');

        sponsoredSpans.forEach(span => {
            const article = span.closest('article');
            if (article) article.style.visibility = "hidden";
        });

        // Case 3: "and" surrounded by <div> or <a> pattern.
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

    // Run on DOM changes.
    const observer = new MutationObserver(runAll);
    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    // Run on path changes.
    let lastPath = location.pathname;
    setInterval(() => {
        if (location.pathname !== lastPath) {
            lastPath = location.pathname;
            runAll();
        }
    }, 250);

    // Run on page load.
    runAll();
    initFadeout();
})();
