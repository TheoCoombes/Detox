// ==UserScript==
// @name         Detox Fade
// @namespace    DETOX_FADE
// @version      2026-03-13
// @description  Slowly fades out Reddit/Instagram/YouTube to avoid excessive scrolling.
// @author       Theo Coombes
// @match        https://*.reddit.com/*
// @match        https://www.instagram.com/*
// @match        https://*.youtube.com/*
// @grant        none
// @license      MIT
// @run-at       document-idle
// @downloadURL  https://cdn.jsdelivr.net/gh/TheoCoombes/Detox/detox-fade.user.js
// @updateURL    https://cdn.jsdelivr.net/gh/TheoCoombes/Detox/detox-fade.user.js
// ==/UserScript==

(function () {
    'use strict';

    // ----- CONFIG -----

    const SECONDS_UNTIL_BLACK = 5 * 60;     // Default: 5 minutes
    const SECONDS_UNTIL_RESET = 10 * 60;    // Default: 10 minutes

    // ----- PAGE FADEOUT -----

    const STORAGE_KEY = 'detox_start_time';
    let initialized = false;

    function getStartTimeData() {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) return null;

        try {
            return JSON.parse(data);
        } catch {
            return null;
        }
    }

    function saveStartTimeData(startTime) {
        const data = {
            startTime: startTime,
            expires: Date.now() + (SECONDS_UNTIL_RESET * 1000)
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    function updateOpacity() {
        const data = getStartTimeData();
        if (!data || data.expires < Date.now()) {
            // Reset if expired.
            saveStartTimeData(Date.now());
            document.documentElement.style.opacity = 1;
            return;
        }

        const elapsedSeconds = (Date.now() - data.startTime) / 1000;
        const opacity = Math.max(0, 1 - (elapsedSeconds / SECONDS_UNTIL_BLACK));
        document.documentElement.style.opacity = opacity;
    }

    function initFadeout() {
        if (initialized) return;
        initialized = true;
        
        // Initialise opacity.
        updateOpacity();

        // Update opacity every 250ms for a smooth fadeout effect.
        setInterval(updateOpacity, 250);
    }

    initFadeout();
})();
