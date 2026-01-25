// ==UserScript==
// @name         Detox Reddit
// @namespace    DETOX_REDDIT
// @version      2026-01-25
// @description  Slowly fade out Reddit after excessive scrolling.
// @author       Theo Coombes
// @match        https://www.reddit.com/*
// @grant        none
// @license      MIT
// @downloadURL  https://cdn.jsdelivr.net/gh/TheoCoombes/Detox/detox-reddit.user.js
// @updateURL    https://cdn.jsdelivr.net/gh/TheoCoombes/Detox/detox-reddit.user.js
// ==/UserScript==

(function () {
    'use strict';

    const INITIAL_DELAY_MS = 2.5 * 60 * 1000; // 2.5 minutes
    const FADE_DURATION_MS = 2.5 * 60 * 1000; // 2.5 minutes
    const TOTAL_LIFETIME_MS = 10 * 60 * 1000; // 10 minutes
    const UPDATE_INTERVAL_MS = 5 * 1000; // 5 seconds
    const STORAGE_KEY = 'detox_fade_state';

    let sessionStartTime = null;
    let elapsedTimeAtPause = 0;
    let isWindowActive = true;
    let updateIntervalId = null;
    let storageIntervalId = null;
    const VISUAL_UPDATE_INTERVAL_MS = 100; // 100ms for smooth opacity changes
    const STORAGE_UPDATE_INTERVAL_MS = 5 * 1000; // 5 seconds for localStorage saves

    // Initialize or resume session
    function initializeSession() {
        const stored = localStorage.getItem(STORAGE_KEY);

        if (stored) {
            const state = JSON.parse(stored);
            const timeSinceExpiry = Date.now() - state.timestamp;

            if (timeSinceExpiry < TOTAL_LIFETIME_MS) {
                // Resume existing session
                sessionStartTime = Date.now() - state.elapsedTime;
                elapsedTimeAtPause = 0;
            } else {
                // Session expired, start new one
                sessionStartTime = Date.now();
                localStorage.removeItem(STORAGE_KEY);
            }
        } else {
            // Start new session
            sessionStartTime = Date.now();
        }

        startUpdateLoop();
        attachWindowListeners();
    }

    function attachWindowListeners() {
        window.addEventListener('focus', () => {
            isWindowActive = true;
        });

        window.addEventListener('blur', () => {
            isWindowActive = false;
            elapsedTimeAtPause = getElapsedTime();
        });
    }

    function getElapsedTime() {
        if (!isWindowActive) {
            return elapsedTimeAtPause;
        }
        return Date.now() - sessionStartTime;
    }

    function updateFadeState() {
        const elapsedTime = getElapsedTime();

        // Calculate opacity
        let opacity = 0;

        if (elapsedTime < INITIAL_DELAY_MS) {
            // Before fade starts
            opacity = 0;
        } else if (elapsedTime < INITIAL_DELAY_MS + FADE_DURATION_MS) {
            // During fade
            const fadeProgress = (elapsedTime - INITIAL_DELAY_MS) / FADE_DURATION_MS;
            opacity = Math.min(fadeProgress, 1);
        } else {
            // Fully faded
            opacity = 1;
        }

        document.body.style.opacity = opacity.toString();

        // Check if we should stop updating (fully faded for a bit)
        if (elapsedTime > TOTAL_LIFETIME_MS) {
            stopUpdateLoop();
            localStorage.removeItem(STORAGE_KEY);
        }
    }

    function updateStorage() {
        const elapsedTime = getElapsedTime();

        // Save state to localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            elapsedTime: elapsedTime,
            timestamp: Date.now(),
        }));
    }

    function startUpdateLoop() {
        if (updateIntervalId) return;
        updateIntervalId = setInterval(updateFadeState, VISUAL_UPDATE_INTERVAL_MS);
        storageIntervalId = setInterval(updateStorage, STORAGE_UPDATE_INTERVAL_MS);
        // Initial update
        updateFadeState();
        updateStorage();
    }

    function stopUpdateLoop() {
        if (updateIntervalId) {
            clearInterval(updateIntervalId);
            updateIntervalId = null;
        }
        if (storageIntervalId) {
            clearInterval(storageIntervalId);
            storageIntervalId = null;
        }
    }

    // Start the session when page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeSession);
    } else {
        initializeSession();
    }
})();
