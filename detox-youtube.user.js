// ==UserScript==
// @name         Detox YouTube
// @namespace    DETOX_YOUTUBE
// @version      2026-03-27
// @description  Removes YT shorts to avoid excessive scrolling.
// @author       Theo Coombes
// @match        *://*.youtube.com/*
// @grant        none
// @license      MIT
// @run-at       document-idle
// @downloadURL  https://cdn.jsdelivr.net/gh/TheoCoombes/Detox/detox-youtube.user.js
// @updateURL    https://cdn.jsdelivr.net/gh/TheoCoombes/Detox/detox-youtube.user.js
// ==/UserScript==

(function () {
    'use strict';

    // State trackers to prevent re-running heavy layout heuristics once successful
    let sidebarRemovedForUrl = null;
    let moreRemovedForUrl = null;

    // ----- REMOVE YOUTUBE SHORTS -----

    function removeShorts() {
        // 1. Redirect shorts URLs to the standard video player.
        const match = location.pathname.match(/^\/(shorts|reels)\/([^/?]+)/);
        if (match) {
            const videoId = match[2];
            location.replace(`/watch?v=${videoId}`);
            return;
        }

        // 2. Replace shorts links with regular video links.
        document.querySelectorAll('a[href^="/shorts"], a[href^="/reels"]').forEach(a => {
            const href = a.getAttribute('href');
            if (!href) return;

            const linkMatch = href.match(/^\/(shorts|reels)\/([^/?]+)/);
            if (linkMatch) {
                const videoId = linkMatch[2];
                a.setAttribute('href', `/watch?v=${videoId}`);
            }
        });

        // 3. Dynamically remove shorts menu items & shelves.
        const xpath = "//text()[normalize-space()='Shorts']/parent::*";
        const result = document.evaluate(xpath, document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);

        for (let i = 0; i < result.snapshotLength; i++) {
            let elem = result.snapshotItem(i);

            if (elem.dataset.detoxProcessed) continue;
            elem.dataset.detoxProcessed = "true";

            const initialHeight = elem.getBoundingClientRect().height;
            if (initialHeight === 0) continue;

            let container = elem;
            let foundContainer = false;

            while (container.parentElement && container.parentElement !== document.body) {
                container = container.parentElement;
                const parentHeight = container.getBoundingClientRect().height;

                if (parentHeight >= initialHeight * 1.8) {
                    foundContainer = true;
                    break;
                }
            }

            if (foundContainer) {
                let targetToHide = container;
                targetToHide = container.closest('a') || targetToHide;
                targetToHide = container.closest('[role="tab"], [role="button"], [role="menuitem"]') || targetToHide;
                targetToHide.style.display = 'none';
            }
        }
    }

    // ----- REMOVE SIDEBAR -----

    function removeSidebar() {
        if (!location.pathname.startsWith('/watch')) return;
        if (sidebarRemovedForUrl === location.href) return; // Skip if already handled for this video

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const isMobile = viewportWidth < 1000;

        const items = document.querySelectorAll("*");        
        for (let i = 0; i < items.length; i++) {
            const el = items[i];
            const rect = el.getBoundingClientRect();
            
            if (rect.width === 0 || rect.height === 0) continue;

            // Desktop Shape: Right side, taller than it is wide, significant height
            const isRightSide = rect.left > (viewportWidth / 2);
            const isTall = rect.height > (rect.width * 1.5); 
            const isSignificantHeight = rect.height > (viewportHeight / 2);
            const isDesktopShape = isRightSide && isTall && isSignificantHeight;

            // Mobile Shape: Bottom of screen, wide, significant height
            const isBottom = rect.top > (viewportHeight / 2);
            const isWide = rect.width > (viewportWidth * 0.8);
            const isMobileShape = isBottom && isWide && isSignificantHeight;

            if ((isMobile && !isMobileShape) || (!isMobile && !isDesktopShape)) continue;

            const images = el.querySelectorAll('img');
            let nonSquareImageCount = 0;
            
            for (let j = 0; j < images.length; j++) {
                const imgRect = images[j].getBoundingClientRect();

                if (imgRect.width === 0 || imgRect.height === 0) continue;

                const aspectRatio = imgRect.width / imgRect.height;
                if (aspectRatio > 1.7 && aspectRatio < 1.8) {
                    nonSquareImageCount++;
                }

                if (nonSquareImageCount >= 5) {
                    el.style.display = 'none';
                    sidebarRemovedForUrl = location.href; // Cache success state
                    return;
                }
            }
        }
    }

    // ----- REMOVE MORE FROM YOUTUBE -----

    function removeMoreFromYoutube() {
        if (moreRemovedForUrl === location.href) return; // Skip if already handled

        const xpath = "//text()[normalize-space()='More from YouTube']/parent::*";
        const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        
        let container = result.singleNodeValue;
        if (!container) return;

        const initialHeight = container.getBoundingClientRect().height;
        if (initialHeight === 0) return;

        while (container.parentElement && container.parentElement !== document.body) {
            container = container.parentElement;
            const parentHeight = container.getBoundingClientRect().height;

            if (parentHeight >= initialHeight * 3) {
                container.style.display = 'none';
                moreRemovedForUrl = location.href; // Cache success state
                break;
            }
        }
    }
    
    // ----- RUNNERS -----

    function runAll() {
        removeShorts();
        removeSidebar();
        removeMoreFromYoutube();
    }

    // Run on DOM changes (with optimized element check)
    let debounceTimer;
    const observer = new MutationObserver((mutations) => {
        const hasElements = mutations.some(m => Array.from(m.addedNodes).some(n => n.nodeType === 1));
        if (!hasElements) return;

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(runAll, 150);
    });
    
    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    document.addEventListener('yt-navigate-finish', () => {
        // Reset state variables on navigation in case the user clicked back/forward
        if (sidebarRemovedForUrl !== location.href) sidebarRemovedForUrl = null;
        if (moreRemovedForUrl !== location.href) moreRemovedForUrl = null;
        runAll();
    });

    // Run immediately on initial load
    runAll();
})();