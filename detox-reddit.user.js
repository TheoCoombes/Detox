// ==UserScript==
// @name         Detox Reddit
// @namespace    DETOX_REDDIT
// @version      2026-01-30
// @description  Slowly fades out Reddit to avoid excessive scrolling.
// @author       Theo Coombes
// @match        https://*.reddit.com/*
// @grant        none
// @license      MIT
// @run-at       document-idle
// @downloadURL  https://cdn.jsdelivr.net/gh/TheoCoombes/Detox/detox-reddit.user.js
// @updateURL    https://cdn.jsdelivr.net/gh/TheoCoombes/Detox/detox-reddit.user.js
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

    initFadeout();
})();
