// ==UserScript==
// @name         Detox Reddit
// @namespace    DETOX_REDDIT
// @version      2026-01-16
// @description  Slowly fade out Reddit after excessive scrolling.
// @author       Theo Coombes
// @match        https://www.reddit.com/*
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    const CACHE_KEY = 'detox_reddit_scroll_depth';
    const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
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

    function applyScrollOpacityPenalty() {
        const scrollThreshold = 5000; // pixels before fade starts
        const cachedDepth = getCachedScrollDepth();
        const currentScroll = window.scrollY;
        
        // Track the maximum scroll reached in this session
        maxScrollReached = Math.max(maxScrollReached, currentScroll);
        
        const totalScrollDepth = cachedDepth + maxScrollReached;

        // Calculate opacity based on total depth including cached scrolling
        let opacity;
        if (totalScrollDepth > scrollThreshold) {
            opacity = Math.max(0, 1 - (totalScrollDepth - scrollThreshold) / 20000);
        } else {
            opacity = 1;
        }

        document.body.style.opacity = opacity;
    }

    // Restore opacity on page load based on cached scroll depth
    const cachedScrollDepth = getCachedScrollDepth();
    if (cachedScrollDepth > 0) {
        const scrollThreshold = 5000;
        const opacityFromCache = Math.max(0, 1 - (cachedScrollDepth - scrollThreshold) / 20000);
        document.body.style.opacity = opacityFromCache;
    }

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
