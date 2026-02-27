// ==UserScript==
// @name         Detox Instagram
// @namespace    DETOX_INSTAGRAM
// @version      2026-01-30
// @description  Removes ads, reels and the explore page on Instagram to avoid excessive scrolling.
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

    // ----- REMOVE ADS + REELS + EXPLORE PAGE -----

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
})();
