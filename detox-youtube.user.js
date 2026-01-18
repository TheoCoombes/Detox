// ==UserScript==
// @name         Detox YouTube
// @namespace    DETOX_YOUTUBE
// @version      2026-01-18-3
// @description  Removes Shorts UI and aggressively converts Shorts/Reels navigation to standard watch pages on m.youtube.com.
// @author       Theo Coombes
// @match        https://*.youtube.com/*
// @grant        none
// @license      MIT
// @downloadURL  https://cdn.jsdelivr.net/gh/TheoCoombes/Detox/detox-youtube.user.js
// @updateURL    https://cdn.jsdelivr.net/gh/TheoCoombes/Detox/detox-youtube.user.js
// ==/UserScript==

(function () {
    'use strict';

    /* ---------------- REDIRECTION ---------------- */

    function forceRedirectIfShorts() {
        const match = location.pathname.match(/^\/(shorts|reels)\/([^/?]+)/);
        if (!match) return;

        const videoId = match[2];
        location.replace(`/watch?v=${videoId}`);
    }

    /* ---------------- LINK REWRITING ---------------- */

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

    /* ---------------- UI REMOVALS ---------------- */

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

    /* ---------------- RUNNER ---------------- */

    function runAll() {
        forceRedirectIfShorts();
        rewriteShortsLinks();
        removeSecondPivotIfFourExist();
        removeGridShelfViewModels();
        removeShortsOverlays();
    }

    // Initial run
    runAll();

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
