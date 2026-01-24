// ==UserScript==
// @name         Detox Reddit
// @namespace    DETOX_REDDIT
// @version      2026-01-20
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

    const TIME_KEY = 'detox_reddit_time_spent';
    const LAST_SAVED_KEY = 'detox_reddit_last_saved';
    const FADE_START_MS = 2 * 60 * 1000; // 2 minutes before fade starts
    const FADE_RATE = 0.0001; // opacity lost per millisecond after fade start
    const SAVE_INTERVAL_MS = 10 * 1000; // Save every 10 seconds
    
    let sessionStartTime = Date.now();
    let totalTimeSpent = 0; // Accumulated time from previous sessions

    // Generate a unique session ID to prevent cheating via localStorage manipulation
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    function getStoredTimeSpent() {
        try {
            const stored = localStorage.getItem(TIME_KEY);
            if (!stored) return 0;
            
            const data = JSON.parse(stored);
            
            // Validate that stored data has reasonable structure
            if (typeof data.totalTime !== 'number' || data.totalTime < 0) {
                return 0;
            }
            
            // Check last save time to detect manipulation
            const lastSaved = parseInt(localStorage.getItem(LAST_SAVED_KEY), 10);
            const now = Date.now();
            
            // If last save was in the future, data was tampered with
            if (lastSaved > now) {
                localStorage.removeItem(TIME_KEY);
                localStorage.removeItem(LAST_SAVED_KEY);
                return 0;
            }
            
            return data.totalTime;
        } catch (e) {
            return 0;
        }
    }

    function saveTimeSpent() {
        try {
            const now = Date.now();
            const elapsedInSession = now - sessionStartTime;
            const newTotal = totalTimeSpent + elapsedInSession;
            
            localStorage.setItem(TIME_KEY, JSON.stringify({
                totalTime: newTotal,
                sessionId: sessionId
            }));
            localStorage.setItem(LAST_SAVED_KEY, now.toString());
            
            // Reset session timer after save
            sessionStartTime = now;
            totalTimeSpent = newTotal;
        } catch (e) {
            console.warn('Failed to save time spent:', e);
        }
    }

    function calculateOpacity() {
        const now = Date.now();
        const elapsedInSession = now - sessionStartTime;
        const totalTime = totalTimeSpent + elapsedInSession;

        // No fade for first 2 minutes
        if (totalTime < FADE_START_MS) {
            return 1;
        }

        // Calculate fade: loses opacity gradually after 2 minutes
        const fadeAmount = (totalTime - FADE_START_MS) * FADE_RATE;
        return Math.max(0, 1 - fadeAmount);
    }

    function updateOpacity() {
        const opacity = calculateOpacity();
        document.body.style.opacity = opacity;
    }

    // Initialize with stored time
    totalTimeSpent = getStoredTimeSpent();
    updateOpacity();

    // Update opacity continuously
    setInterval(updateOpacity, 100);

    // Save progress periodically
    setInterval(saveTimeSpent, SAVE_INTERVAL_MS);

    // Save when page is hidden
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            saveTimeSpent();
        }
    });

    // Save when page unloads
    window.addEventListener('beforeunload', () => {
        saveTimeSpent();
    });
})();
