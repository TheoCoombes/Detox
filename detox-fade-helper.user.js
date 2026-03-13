// ==UserScript==
// @name         Detox Fade Helper
// @namespace    DETOX_FADE_HELPER
// @version      2026-03-09
// @description  Alerts the user when Detox Fade is disabled to prevent excessive scrolling on Reddit/Instagram/YouTube.
// @author       Theo Coombes
// @match        https://*.reddit.com/*
// @match        https://www.instagram.com/*
// @match        https://*.youtube.com/*
// @grant        none
// @license      MIT
// @run-at       document-idle
// @downloadURL  https://cdn.jsdelivr.net/gh/TheoCoombes/Detox/detox-fade-helper.user.js
// @updateURL    https://cdn.jsdelivr.net/gh/TheoCoombes/Detox/detox-fade-helper.user.js
// ==/UserScript==

(function () {
    'use strict';

    // ----- CONFIG -----

    const IGNORE_DURATION = 5 * 60 * 1000;  // Default: 5 minutes

    // ----- CHECK FOR DETOX FADE -----

    const STORAGE_KEY = 'detox_time_spent';
    
    function getTimeSpentData() {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) return null;
        try {
            return JSON.parse(data);
        } catch {
            return null;
        }
    }

    function checkDetoxFade() {
        const data = getTimeSpentData();
        if (!data || data.expires < Date.now()) {
            alert('WARNING: Detox Fade is not enabled. Consider enabling Detox Fade to prevent excessive scrolling!');
        }
    }

    // Run 1.5 seconds after page load to allow Detox Fade to initialize if it's installed.
    setTimeout(checkDetoxFade, 1500);
})();
