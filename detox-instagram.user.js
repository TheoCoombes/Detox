// ==UserScript==
// @name         Detox Instagram
// @namespace    DETOX_INSTAGRAM
// @version      2026-01-18
// @description  Removes ads, reels and the explore page from Instagram. The page also slowly fades out after excessive scrolling.
// @author       Theo Coombes
// @match        https://www.instagram.com/*
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    const CACHE_KEY = 'detox_instagram_scroll_depth';
    const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
    const SCROLL_THRESHOLD = 5000; // pixels before fade starts
    const FADE_MULTIPLIER = 50000; // speed of which fade occurs
    let maxScrollReached = 0; // Track max scroll in current session

    function getCachedScrollDepth() {
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (!cached) return 0;

            const { scrollDepth, timestamp } = JSON.parse(cached);
            const now = Date.now();

            // Check if cache has expired
            if (now - timestamp > CACHE_EXPIRY_MS) {
                localStorage.removeItem(CACHE_KEY);
                return 0;
            }

            return scrollDepth;
        } catch (e) {
            return 0;
        }
    }

    function setCachedScrollDepth(scrollDepth) {
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                scrollDepth,
                timestamp: Date.now()
            }));
        } catch (e) {
            console.warn('Failed to cache scroll depth:', e);
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
            links.forEach(link => link.remove());
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

    function applyScrollOpacityPenalty() {
        const cachedDepth = getCachedScrollDepth();
        const currentScroll = window.scrollY;
        
        // Track the maximum scroll reached in this session
        maxScrollReached = Math.max(maxScrollReached, currentScroll);
        const totalScrollDepth = cachedDepth + maxScrollReached;

        // Calculate opacity based on total depth including cached scrolling
        let opacity;
        if (totalScrollDepth > SCROLL_THRESHOLD) {
            opacity = Math.max(0, 1 - (totalScrollDepth - SCROLL_THRESHOLD) / FADE_MULTIPLIER);
        } else {
            opacity = 1;
        }

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

    // Restore opacity on page load based on cached scroll depth
    const cachedScrollDepth = getCachedScrollDepth();
    if (cachedScrollDepth > 0) {
        const opacityFromCache = Math.max(0, 1 - (cachedScrollDepth - SCROLL_THRESHOLD) / FADE_MULTIPLIER);
        document.body.style.opacity = opacityFromCache;
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

    // Add scroll listener for opacity penalty
    window.addEventListener('scroll', applyScrollOpacityPenalty);

    // Save accumulated scroll depth when page visibility changes
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // Page is hidden, save the scroll depth
            const cachedDepth = getCachedScrollDepth();
            setCachedScrollDepth(cachedDepth + maxScrollReached);
        } else {
            // Page is visible again, force refresh to reset
            location.reload();
        }
    });
})();
