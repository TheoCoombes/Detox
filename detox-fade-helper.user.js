// ==UserScript==
// @name         Detox Fade Helper
// @namespace    DETOX_FADE_HELPER
// @version      2026-03-27
// @description  Alerts the user when Detox Fade is disabled to prevent excessive scrolling on Reddit/Instagram/YouTube.
// @author       Theo Coombes
// @match        *://*.reddit.com/*
// @match        *://*.instagram.com/*
// @match        *://*.youtube.com/*
// @grant        none
// @license      MIT
// @run-at       document-idle
// @downloadURL  https://cdn.jsdelivr.net/gh/TheoCoombes/Detox/detox-fade-helper.user.js
// @updateURL    https://cdn.jsdelivr.net/gh/TheoCoombes/Detox/detox-fade-helper.user.js
// ==/UserScript==

(function () {
    'use strict';

    // ----- CONFIG -----

    const IGNORE_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds
    const STORAGE_KEY = 'detox_fade_last_warned';

    // ----- FADEOUT CHECK -----

    // Using a self-clearing check to ensure the timeout logic only executes once
    if (window.hasDetoxCheckInitialized) return;
    window.hasDetoxCheckInitialized = true;

    function checkDetoxFade() {
        if (!location.href.match(/reddit\.com|instagram\.com|youtube\.com/)) {
            return;
        }

        const now = Date.now();
        const lastWarned = localStorage.getItem(STORAGE_KEY);

        // 1. Check if we are still within the "OK" grace period
        if (lastWarned && (now - lastWarned < IGNORE_DURATION)) {
            console.log('Detox Fade check skipped: within the 5-minute grace period.');
            return;
        }

        // 2. Check the actual opacity
        const opacity = parseFloat(getComputedStyle(document.documentElement).opacity);
        
        if (opacity >= 1) {
            alert('WARNING: Detox Fade is not enabled. Consider enabling Detox Fade to prevent excessive scrolling!');
            
            // 3. Record the time the user hit "OK"
            localStorage.setItem(STORAGE_KEY, Date.now());
        }
    }

    // Run 2.5 seconds after page load
    setTimeout(checkDetoxFade, 2500);
})();