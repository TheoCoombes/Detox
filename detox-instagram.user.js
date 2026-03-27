// ==UserScript==
// @name         Detox Instagram
// @namespace    DETOX_INSTAGRAM
// @version      2026-03-27-2
// @description  Removes ads, reels and the explore page on Instagram to avoid excessive scrolling.
// @author       Theo Coombes
// @match        *://*.instagram.com/*
// @grant        none
// @license      MIT
// @run-at       document-idle
// @downloadURL  https://cdn.jsdelivr.net/gh/TheoCoombes/Detox/detox-instagram.user.js
// @updateURL    https://cdn.jsdelivr.net/gh/TheoCoombes/Detox/detox-instagram.user.js
// ==/UserScript==

(function () {
    'use strict';

    // ----- REMOVE ADS + REELS + EXPLORE PAGE -----

    function removeReels() {
        // 1. Handle specific reel IDs (e.g., /reels/<xxx>/)
        const match = location.pathname.match(/^\/reels\/([^/?]+)/);
        if (match) {
            const postId = match[1];
            location.replace(`/p/${postId}/`);
            return;
        }

        // 2. Handle the exact match for /reels or /reels/
        if (location.pathname.startsWith('/reels')) {
            location.replace('/');
            return;
        }

        // 3. Remove reels from navbar, and other feeds.
        const links = document.querySelectorAll('a[href^="/reels/"]:not([data-detox-processed="true"])');
        links.forEach(link => {
            link.dataset.detoxProcessed = "true"; // Cache state
            
            const linkRect = link.getBoundingClientRect();
            let current = link;
            let currentParent = link.parentElement;
            const linkArea = linkRect.width * linkRect.height;

            if (linkArea === 0) return;

            // Traverse up the DOM until we hit the body or find a large container
            while (currentParent && currentParent !== document.body) {
                const parentRect = currentParent.getBoundingClientRect();
                const parentArea = parentRect.width * parentRect.height;

                // Check if the parent is more than 1.8x the size of the original link
                if (parentArea > linkArea * 1.8) {
                    current.style.display = 'none';
                    break;
                }

                current = currentParent;
                currentParent = current.parentElement;
            }
        });
    }

    function removeExplorePage() {
        const isExplorePage = location.pathname.startsWith('/explore/');
        if (!isExplorePage) return;

        const links = document.querySelectorAll('a[href^="/p/"]:not([data-detox-processed="true"]), a[href^="/reels/"]:not([data-detox-processed="true"])');
        links.forEach(link => {
            link.dataset.detoxProcessed = "true"; // Cache state
            
            const linkRect = link.getBoundingClientRect();
            let current = link;
            let currentParent = link.parentElement;
            const linkArea = linkRect.width * linkRect.height;

            if (linkArea === 0) return;

            // Traverse up the DOM until we hit the body or find a large container
            while (currentParent && currentParent !== document.body) {
                const parentRect = currentParent.getBoundingClientRect();
                const parentArea = parentRect.width * parentRect.height;

                // Check if the parent is more than 1.8x the size of the original link
                if (parentArea > linkArea * 1.8) {
                    current.style.visibility = 'hidden';
                    break;
                }

                current = currentParent;
                currentParent = current.parentElement;
            }
        });
    }

    function removeAdsAndSponsoredPosts() {
        const articles = document.querySelectorAll('article:not([data-detox-processed="true"])');
        
        // Matches exact strings. \b ensures word boundaries.
        // Captures: Ad, Advert, Advertisement, Sponsored, Suggested, Suggested for you, Follow
        const adRegex = /^(Ad|Advert|Advertisement|Sponsored|Suggested|Suggested for you|Follow)$/i;

        articles.forEach(article => {
            article.dataset.detoxProcessed = "true"; // Cache state

            if (article.style.visibility === 'hidden') return;

            let shouldHide = false;

            // 1. Check for specific keywords
            const textNodes = article.querySelectorAll('span, div, a, button');
            for (let node of textNodes) {
                if (node.children.length === 0 && node.textContent) {
                    const text = node.textContent.trim();
                    if (adRegex.test(text)) {
                        shouldHide = true;
                        break;
                    }
                }
            }

            // 2. Check for an excessive number of profile links
            if (!shouldHide) {
                const links = article.querySelectorAll('a[href]');
                let profileLinksCount = 0;

                links.forEach(link => {
                    const href = link.getAttribute('href');
                    
                    const isExplicitIgUrl = href.includes('instagram.com/');
                    const isRelativeProfile = /^\/[a-zA-Z0-9._]+\/?$/.test(href) && 
                                              !href.includes('/p/') && 
                                              !href.includes('/reels/') && 
                                              !href.includes('/explore/');

                    if (isExplicitIgUrl || isRelativeProfile) {
                        profileLinksCount++;
                    }
                });

                if (profileLinksCount > 2) {
                    shouldHide = true;
                }
            }

            // Hide the article if it triggers any conditions
            if (shouldHide) {
                article.style.visibility = 'hidden';
            }
        });
    }

    function runAll() {
        removeReels();
        removeExplorePage();
        removeAdsAndSponsoredPosts();
    }

    // Run on DOM changes
    let debounceTimer;
    const observer = new MutationObserver((mutations) => {
        const hasElements = mutations.some(m => Array.from(m.addedNodes).some(n => n.nodeType === 1));
        if (!hasElements) return;

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(runAll, 150);
    });
    
    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    const triggerLocationChange = () => {
        window.dispatchEvent(new Event('locationchange'));
    };

    const originalPushState = history.pushState;
    history.pushState = function() {
        originalPushState.apply(this, arguments);
        triggerLocationChange();
    };

    const originalReplaceState = history.replaceState;
    history.replaceState = function() {
        originalReplaceState.apply(this, arguments);
        triggerLocationChange();
    };

    window.addEventListener('popstate', triggerLocationChange);
    window.addEventListener('locationchange', runAll);

    // Run on page load.
    runAll();
})();