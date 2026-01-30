// ==UserScript==
// @name         Detox YouTube
// @namespace    DETOX_YOUTUBE
// @version      2026-01-30
// @description  Slowly fades out Youtube and removes YT shorts to avoid excessive scrolling.
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

    // ----- REMOVE YOUTUBE SHORTS -----

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

    // ----- RUNNERS -----

    function runAll() {
        forceRedirectIfShorts();
        rewriteShortsLinks();
        removeSecondPivotIfFourExist();
        removeGridShelfViewModels();
        removeShortsOverlays();
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

    runAll();
    initFadeout();
})();
