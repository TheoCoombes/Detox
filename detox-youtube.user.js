// ==UserScript==
// @name         Detox YouTube
// @namespace    DETOX_YOUTUBE
// @version      2026-01-28-2
// @description  Removes Shorts UI and aggressively converts Shorts/Reels navigation to standard watch pages on m.youtube.com.
// @author       Theo Coombes
// @match        https://*.youtube.com/*
// @grant        none
// @license      MIT
// @run-at       document-idle
// @downloadURL  https://cdn.jsdelivr.net/gh/TheoCoombes/Detox/detox-youtube.user.js
// @updateURL    https://cdn.jsdelivr.net/gh/TheoCoombes/Detox/detox-youtube.user.js
// ==/UserScript==

(function () {
    'use strict';

    const MAX_TIME_SECONDS = 10 * 60; // 10 minutes until fully invisible
    const EXPIRATION_TIME = 10 * 60 * 1000; // 10 minutes
    const STORAGE_KEY = 'detox_youtube_time_spent';

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

    function forceRedirectIfShorts() {
        const match = location.pathname.match(/^\/(shorts|reels)\/([^/?]+)/);
        if (!match) return;

        const videoId = match[2];
        location.replace(`/watch?v=${videoId}`);
    }

    function rewriteShortsLinks() {
        document.querySelectorAll('a[href]').forEach(a => {
            const href = a.getAttribute('href');
            if (!href) return;

            const match = href.match(/^\/(shorts|reels)\/([^/?]+)/);
            if (!match) return;

            const videoId = match[2];
            a.setAttribute('href', `/watch?v=${videoId}`);
        });
    }

    function removeSecondPivotIfFourExist() {
        const parents = new Set();

        document.querySelectorAll('ytm-pivot-bar-item-renderer').forEach(el => {
            if (el.parentElement) parents.add(el.parentElement);
        });

        parents.forEach(parent => {
            const pivots = parent.querySelectorAll(':scope > ytm-pivot-bar-item-renderer');
            if (pivots.length === 4 && pivots[1]) {
                pivots[1].remove();
            }
        });
    }

    function removeGridShelfViewModels() {
        document.querySelectorAll('grid-shelf-view-model').forEach(el => el.remove());
    }

    function removeShortsOverlays() {
        document
            .querySelectorAll('ytm-thumbnail-overlay-time-status-renderer[data-style="SHORTS"]')
            .forEach(el => el.remove());
    }

    function runAll() {
        forceRedirectIfShorts();
        rewriteShortsLinks();
        removeSecondPivotIfFourExist();
        removeGridShelfViewModels();
        removeShortsOverlays();
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
