// ==UserScript==
// @name         Detox Reddit
// @namespace    DETOX_REDDIT
// @version      2026-01-28-2
// @description  Slowly fade out Reddit after excessive scrolling.
// @author       Theo Coombes
// @match        https://www.reddit.com/*
// @grant        none
// @license      MIT
// @run-at       document-idle
// @downloadURL  https://cdn.jsdelivr.net/gh/TheoCoombes/Detox/detox-reddit.user.js
// @updateURL    https://cdn.jsdelivr.net/gh/TheoCoombes/Detox/detox-reddit.user.js
// ==/UserScript==

(function () {
    'use strict';

    const MAX_TIME_SECONDS = 5 * 60; // 5 minutes until fully invisible
    const EXPIRATION_TIME = 10 * 60 * 1000; // 10 minutes
    const STORAGE_KEY = 'detox_reddit_time_spent';

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

    setupTimeTracking();
})();
