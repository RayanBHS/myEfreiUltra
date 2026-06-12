(function() {
    'use strict';

    let toast = null;
    let virtualCursor = null;
    let cursorX = window.innerWidth / 2;
    let cursorY = window.innerHeight / 2;
    const cursorSpeed = 12; // Speed of virtual mouse cursor
    let lastMouseX = null;
    let lastMouseY = null;

    function initDOM() {
        if (!document.body) {
            document.addEventListener('DOMContentLoaded', initDOM);
            return;
        }

        if (document.getElementById('mye-gamepad-toast')) {
            toast = document.getElementById('mye-gamepad-toast');
            virtualCursor = document.getElementById('mye-virtual-cursor');
            return;
        }

        // CSS variables and custom styles injection
        const style = document.createElement('style');
        style.innerHTML = `
            /* Surbrillance manette */
            .mye-gamepad-focused {
                outline: 3px solid var(--mye-primary-color, #163767) !important;
                outline-offset: 2px !important;
                box-shadow: 0 0 18px var(--mye-primary-color, #163767) !important;
                transform: scale(1.025) !important;
                transition: transform 0.15s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.15s ease, outline 0.15s ease !important;
                z-index: 99999 !important;
            }

            /* Curseur virtuel manette */
            #mye-virtual-cursor {
                position: fixed;
                width: 16px;
                height: 16px;
                background: rgba(0, 122, 255, 0.45);
                border: 2px solid #ffffff;
                border-radius: 50%;
                box-shadow: 0 0 10px rgba(0, 122, 255, 0.8), 0 0 20px rgba(0, 122, 255, 0.4);
                pointer-events: none;
                z-index: 2147483648;
                display: none;
                opacity: 0;
                transition: opacity 0.2s ease;
                transform: translate(-8px, -8px); /* Center on coordinates */
            }

            /* HUD Toast de notification de manette */
            #mye-gamepad-toast {
                position: fixed;
                bottom: 24px;
                right: 24px;
                background: rgba(18, 18, 18, 0.88);
                backdrop-filter: blur(14px) saturate(180%);
                border: 1px solid rgba(255, 255, 255, 0.15);
                border-radius: 12px;
                padding: 14px 20px;
                color: #ffffff;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                font-size: 13.5px;
                z-index: 2147483647;
                display: flex;
                flex-direction: column;
                gap: 8px;
                box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1);
                transform: translateY(150px);
                opacity: 0;
                transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.5s ease;
                pointer-events: none;
                width: 290px;
            }
            #mye-gamepad-toast.show {
                transform: translateY(0);
                opacity: 1;
            }
            .mye-toast-header {
                display: flex;
                align-items: center;
                gap: 10px;
                font-weight: 700;
                color: #4cd964;
            }
            .mye-toast-pulse {
                width: 8px;
                height: 8px;
                background-color: #4cd964;
                border-radius: 50%;
                box-shadow: 0 0 8px #4cd964;
                animation: mye-pulse 2s infinite;
            }
            .mye-toast-help {
                display: flex;
                flex-direction: column;
                gap: 6px;
                font-size: 11px;
                color: rgba(255, 255, 255, 0.75);
                border-top: 1px solid rgba(255, 255, 255, 0.15);
                padding-top: 8px;
                margin-top: 2px;
            }
            .mye-help-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            .mye-badge-container {
                display: inline-flex;
                align-items: center;
            }
            .mye-btn-badge {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 16px;
                height: 16px;
                border-radius: 50%;
                font-weight: bold;
                font-size: 10px;
                color: #000000;
                margin-left: 5px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.3);
            }
            .mye-badge-a { background: #4cd964; }
            .mye-badge-b { background: #ff3b30; }
            .mye-badge-x { background: #007aff; }
            .mye-badge-y { background: #ffcc00; }
            .mye-badge-text {
                background: #ffffff;
                color: #000000;
                padding: 1px 4px;
                border-radius: 3px;
                font-size: 9px;
                font-weight: bold;
                margin-left: 5px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.3);
            }

            @keyframes mye-pulse {
                0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(76, 217, 100, 0.7); }
                70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(76, 217, 100, 0); }
                100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(76, 217, 100, 0); }
            }
        `;
        document.documentElement.appendChild(style);

        // Create Toast DOM Element
        toast = document.createElement('div');
        toast.id = 'mye-gamepad-toast';
        toast.innerHTML = `
            <div class="mye-toast-header">
                <div class="mye-toast-pulse"></div>
                <span>Manette Connectée</span>
            </div>
            <div class="mye-toast-help">
                <div class="mye-help-row"><span>Déplacer le focus</span><span class="mye-badge-container">Stick G / D-Pad</span></div>
                <div class="mye-help-row"><span>Sélectionner</span><span class="mye-badge-container"><span class="mye-btn-badge mye-badge-a">A</span></span></div>
                <div class="mye-help-row"><span>Retour / Fermer</span><span class="mye-badge-container"><span class="mye-btn-badge mye-badge-b">B</span></span></div>
                <div class="mye-help-row"><span>Naviguer Header</span><span class="mye-badge-container"><span class="mye-badge-text">LB</span> / <span class="mye-badge-text">RB</span></span></div>
                <div class="mye-help-row"><span>Souris Virtuelle</span><span class="mye-badge-container">Stick D</span></div>
                <div class="mye-help-row"><span>Clic Virtuel</span><span class="mye-badge-container"><span class="mye-badge-text">R2</span></span></div>
                <div class="mye-help-row"><span>Mode Sombre</span><span class="mye-badge-container"><span class="mye-btn-badge mye-badge-x">X</span></span></div>
                <div class="mye-help-row"><span>Menu mobile / Accueil</span><span class="mye-badge-container"><span class="mye-badge-text">Start</span> / <span class="mye-btn-badge mye-badge-y">Y</span></span></div>
            </div>
        `;
        document.body.appendChild(toast);

        // Create Virtual Cursor DOM Element
        virtualCursor = document.createElement('div');
        virtualCursor.id = 'mye-virtual-cursor';
        document.body.appendChild(virtualCursor);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDOM);
    } else {
        initDOM();
    }

    // State variables
    let focusedElement = null;
    let gamepadActive = false; // flag to show if gamepad is currently active
    let buttonStates = [];
    let lastNavTime = 0;
    const NAV_COOLDOWN = 180; // cooldown in ms for navigation movements
    let animationFrameId = null;

    // Show/hide toast notifications
    function showToast() {
        if (!toast) initDOM();
        if (!toast) return;
        toast.classList.add('show');
        setTimeout(() => {
            if (toast) toast.classList.remove('show');
        }, 5000);
    }

    // List of selector strings that define navigable elements
    const INTERACTIVE_SELECTORS = [
        'a',
        'button',
        'input:not([type="hidden"])',
        'select',
        'textarea',
        '[tabindex="0"]',
        '.mye-nav-item',
        '.mye-dropdown-link',
        '.mye-drawer-item',
        '.mye-drawer-subitem',
        '.mye-landing-btn',
        '.mye-color-option',
        '.mye-profile-pill',
        '.mye-icon-btn',
        '.mye-switch',
        '.mye-drawer-trigger',
        '.mye-drawer-close',
        '.mye-error-btn',
        '.mye-landing-link',
        '.mye-color-option'
    ].join(',');

    function isVisible(el) {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return false;
        
        // Check computed styles
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
        
        // Check if covered by drawer overlay or something similar
        // Unless the element is inside the drawer and drawer is open
        const isInsideDrawer = el.closest('#mye-mobile-drawer');
        const drawerActive = document.getElementById('mye-mobile-drawer')?.classList.contains('active');
        if (drawerActive && !isInsideDrawer) {
            const isDrawerControl = el.id === 'mye-drawer-overlay' || el.id === 'mye-drawer-close' || el.closest('#mye-drawer-close');
            if (!isDrawerControl) return false;
        }

        return true;
    }

    function getNavigableElements() {
        const elements = Array.from(document.querySelectorAll(INTERACTIVE_SELECTORS));
        return elements.filter(isVisible);
    }

    // Apply visual focus class
    function setFocus(el, shouldScroll = true) {
        if (focusedElement) {
            focusedElement.classList.remove('mye-gamepad-focused');
        }
        focusedElement = el;
        if (focusedElement && gamepadActive) {
            focusedElement.classList.add('mye-gamepad-focused');
            
            // Prevent scrolling-induced mousemove events from immediately deactivating visuals
            lastMouseX = null;
            lastMouseY = null;
            
            if (shouldScroll) {
                // Auto scroll to element if not fully in viewport
                focusedElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'nearest'
                });
            }
        }
    }

    // Navigation algorithm based on spatial 2D placement
    function navigate(direction) {
        const candidates = getNavigableElements();
        if (candidates.length === 0) return;

        // If no element is currently focused or focused element is no longer visible
        if (!focusedElement || !isVisible(focusedElement)) {
            setFocus(candidates[0]);
            return;
        }

        const rectA = focusedElement.getBoundingClientRect();
        const centerAX = rectA.left + rectA.width / 2;
        const centerAY = rectA.top + rectA.height / 2;

        let bestCandidate = null;
        let minScore = Infinity;

        candidates.forEach(candidate => {
            if (candidate === focusedElement) return;

            const rectB = candidate.getBoundingClientRect();
            const centerBX = rectB.left + rectB.width / 2;
            const centerBY = rectB.top + rectB.height / 2;

            const dx = centerBX - centerAX;
            const dy = centerBY - centerAY;

            let isHeading = false;

            if (direction === 'UP') {
                isHeading = dy < -2;
            } else if (direction === 'DOWN') {
                isHeading = dy > 2;
            } else if (direction === 'LEFT') {
                isHeading = dx < -2;
            } else if (direction === 'RIGHT') {
                isHeading = dx > 2;
            }

            if (!isHeading) return;

            // Compute distance score with a higher weight for the perpendicular axis
            let score = 0;
            if (direction === 'UP' || direction === 'DOWN') {
                score = (dy * dy) + 3.5 * (dx * dx);
            } else {
                score = (dx * dx) + 3.5 * (dy * dy);
            }

            if (score < minScore) {
                minScore = score;
                bestCandidate = candidate;
            }
        });

        if (bestCandidate) {
            setFocus(bestCandidate);
        }
    }

    // Get all navigation elements inside the header
    function getHeaderItems() {
        const items = Array.from(document.querySelectorAll('.mye-nav-item, #mye-custom-search-btn, #mye-custom-notif-btn, #mye-profile-btn'));
        return items.filter(isVisible).sort((a, b) => {
            return a.getBoundingClientRect().left - b.getBoundingClientRect().left;
        });
    }

    // Focus navigation through header items via LB/RB
    function navigateHeader(direction) {
        const headerItems = getHeaderItems();
        if (headerItems.length === 0) return;

        if (!gamepadActive) {
            gamepadActive = true;
        }

        // Hide virtual cursor when moving using buttons
        if (virtualCursor) {
            virtualCursor.style.opacity = '0';
        }

        let currentIndex = headerItems.indexOf(focusedElement);
        let nextIndex = 0;

        if (currentIndex === -1) {
            nextIndex = (direction === 'PREV') ? headerItems.length - 1 : 0;
        } else {
            if (direction === 'PREV') {
                nextIndex = (currentIndex - 1 + headerItems.length) % headerItems.length;
            } else {
                nextIndex = (currentIndex + 1) % headerItems.length;
            }
        }

        // Close dropdowns when changing header items
        document.querySelectorAll('.mye-dropdown-menu.show').forEach(menu => {
            menu.classList.remove('show');
        });
        document.querySelectorAll('.mye-nav-item, .mye-profile-pill').forEach(nav => {
            nav.classList.remove('active');
        });

        setFocus(headerItems[nextIndex]);
    }

    // Handle gamepad buttons presses
    function handleButtonPress(buttonIndex) {
        if (!gamepadActive) {
            gamepadActive = true;
            if (focusedElement) {
                focusedElement.classList.add('mye-gamepad-focused');
            } else {
                const candidates = getNavigableElements();
                if (candidates.length > 0) setFocus(candidates[0]);
            }
            return;
        }

        switch (buttonIndex) {
            case 0: // A (Cross) - Click/Confirm
                if (focusedElement) {
                    const clickedEl = focusedElement;
                    clickedEl.click();
                    if (clickedEl.tagName === 'INPUT' || clickedEl.tagName === 'TEXTAREA') {
                        clickedEl.focus();
                    } else {
                        // Dropdown trigger auto-focus first visible menu item
                        const targetId = clickedEl.getAttribute('data-target');
                        if (targetId) {
                            const menu = document.getElementById(targetId);
                            setTimeout(() => {
                                if (menu && menu.classList.contains('show')) {
                                    const subitems = Array.from(menu.querySelectorAll('a, .mye-dropdown-link, .mye-drawer-subitem'));
                                    const visibleSubitems = subitems.filter(isVisible);
                                    if (visibleSubitems.length > 0) {
                                        setFocus(visibleSubitems[0]);
                                    }
                                }
                            }, 80);
                        }
                    }
                }
                break;
            case 1: // B (Circle) - Cancel/Back
                // 1. Close dropdown and focus parent trigger if inside dropdown
                if (focusedElement) {
                    const parentMenu = focusedElement.closest('.mye-dropdown-menu');
                    if (parentMenu) {
                        const trigger = document.querySelector(`[data-target="${parentMenu.id}"]`);
                        parentMenu.classList.remove('show');
                        document.querySelectorAll('.mye-nav-item, .mye-profile-pill').forEach(nav => nav.classList.remove('active'));
                        if (trigger) {
                            setFocus(trigger);
                        }
                        break;
                    }
                }

                // 2. Close mobile drawer if active
                const mobileDrawer = document.getElementById('mye-mobile-drawer');
                if (mobileDrawer && mobileDrawer.classList.contains('active')) {
                    const closeBtn = document.getElementById('mye-drawer-close') || document.getElementById('mye-drawer-overlay');
                    if (closeBtn) closeBtn.click();
                    break;
                }

                // 3. Fallback: Go back
                window.history.back();
                break;
            case 2: // X (Square) - Toggle Theme (Oled Dark mode / Light mode)
                const themeToggle = document.getElementById('mye-theme-toggle') || document.getElementById('mye-theme-switch');
                if (themeToggle) themeToggle.click();
                break;
            case 3: // Y (Triangle) - Home / Dashboard
                const homeLink = document.querySelector('a[href="/portal/student/home"], .mye-nav-item[data-href="/portal/student/home"]');
                if (homeLink) homeLink.click();
                else window.location.href = '/portal/student/home';
                break;
            case 4: // LB (Left bumper) - Header Nav left
                navigateHeader('PREV');
                break;
            case 5: // RB (Right bumper) - Header Nav right
                navigateHeader('NEXT');
                break;
            case 7: // R2 (Right Trigger) - Click at virtual cursor location
            case 11: // R3 (Right Stick Click) - Click at virtual cursor location
                if (virtualCursor && virtualCursor.style.opacity === '1') {
                    const hoveredEl = document.elementFromPoint(cursorX, cursorY);
                    const interactiveEl = hoveredEl ? hoveredEl.closest(INTERACTIVE_SELECTORS) : null;
                    if (interactiveEl) {
                        interactiveEl.click();
                        if (interactiveEl.tagName === 'INPUT' || interactiveEl.tagName === 'TEXTAREA') {
                            interactiveEl.focus();
                        }
                    }
                }
                break;
            case 8: // Select - Toggle Notifications
                const notifBtn = document.getElementById('mye-custom-notif-btn');
                if (notifBtn) notifBtn.click();
                break;
            case 9: // Start - Toggle mobile menu
                const hamburger = document.getElementById('mye-hamburger-btn');
                const closeBtn = document.getElementById('mye-drawer-close');
                const drawer = document.getElementById('mye-mobile-drawer');
                if (drawer && drawer.classList.contains('active')) {
                    if (closeBtn) closeBtn.click();
                } else {
                    if (hamburger) hamburger.click();
                }
                break;
        }
    }

    // Main Gamepad Polling loop
    function updateGamepad() {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        let gp = null;
        for (let i = 0; i < gamepads.length; i++) {
            if (gamepads[i]) {
                gp = gamepads[i];
                break;
            }
        }

        if (!gp) {
            animationFrameId = requestAnimationFrame(updateGamepad);
            return;
        }

        const now = Date.now();

        // 1. Process D-pad or Left Stick for spatial navigation
        let navDirection = null;

        const axisX = gp.axes[0];
        const axisY = gp.axes[1];

        if (axisY < -0.5 || gp.buttons[12]?.pressed) {
            navDirection = 'UP';
        } else if (axisY > 0.5 || gp.buttons[13]?.pressed) {
            navDirection = 'DOWN';
        } else if (axisX < -0.5 || gp.buttons[14]?.pressed) {
            navDirection = 'LEFT';
        } else if (axisX > 0.5 || gp.buttons[15]?.pressed) {
            navDirection = 'RIGHT';
        }

        if (navDirection && (now - lastNavTime > NAV_COOLDOWN)) {
            lastNavTime = now;
            // Hide virtual cursor on D-pad movements
            if (virtualCursor) {
                virtualCursor.style.opacity = '0';
            }
            if (!gamepadActive) {
                gamepadActive = true;
                if (focusedElement) focusedElement.classList.add('mye-gamepad-focused');
                else navigate(navDirection);
            } else {
                navigate(navDirection);
            }
        }

        // 2. Process virtual mouse cursor via Right Stick (axes 2 & 3)
        const stickRX = gp.axes[2];
        const stickRY = gp.axes[3];

        if (stickRX && stickRY && (Math.abs(stickRX) > 0.15 || Math.abs(stickRY) > 0.15)) {
            if (!gamepadActive) {
                gamepadActive = true;
            }
            
            if (virtualCursor && (virtualCursor.style.display === 'none' || virtualCursor.style.opacity === '0')) {
                virtualCursor.style.display = 'block';
                virtualCursor.offsetHeight; // force layout recalculation
                virtualCursor.style.opacity = '1';

                // Clear D-pad focus highlight
                if (focusedElement) {
                    focusedElement.classList.remove('mye-gamepad-focused');
                    focusedElement = null;
                }
            }

            // Move coordinates
            cursorX += stickRX * cursorSpeed;
            cursorY += stickRY * cursorSpeed;

            // Clamp values
            cursorX = Math.max(5, Math.min(window.innerWidth - 5, cursorX));
            cursorY = Math.max(5, Math.min(window.innerHeight - 5, cursorY));

            // Position visual cursor
            if (virtualCursor) {
                virtualCursor.style.left = cursorX + 'px';
                virtualCursor.style.top = cursorY + 'px';
            }

            // Detect element under cursor
            const hoveredEl = document.elementFromPoint(cursorX, cursorY);
            const interactiveEl = hoveredEl ? hoveredEl.closest(INTERACTIVE_SELECTORS) : null;
            if (interactiveEl && isVisible(interactiveEl)) {
                // Focus element without page jumping
                setFocus(interactiveEl, false);
            } else {
                if (focusedElement) {
                    focusedElement.classList.remove('mye-gamepad-focused');
                    focusedElement = null;
                }
            }

            // Auto scrolling at borders
            const borderLimit = 45;
            if (cursorY > window.innerHeight - borderLimit) {
                window.scrollBy(0, 10);
                cursorY = window.innerHeight - borderLimit;
            } else if (cursorY < borderLimit) {
                window.scrollBy(0, -10);
                cursorY = borderLimit;
            }
        }

        // 3. Process button presses
        for (let b = 0; b < gp.buttons.length; b++) {
            const buttonPressed = gp.buttons[b].pressed;
            const previousState = buttonStates[b] || false;

            if (buttonPressed && !previousState) {
                handleButtonPress(b);
            }

            buttonStates[b] = buttonPressed;
        }

        animationFrameId = requestAnimationFrame(updateGamepad);
    }

    // Start/Stop listeners
    window.addEventListener('gamepadconnected', (e) => {
        console.log(`[MyEfrei ULTRA] Gamepad connected: ${e.gamepad.id}.`);
        showToast();
        buttonStates = new Array(e.gamepad.buttons.length).fill(false);
        if (!animationFrameId) {
            updateGamepad();
        }
    });

    window.addEventListener('gamepaddisconnected', (e) => {
        console.log('[MyEfrei ULTRA] Gamepad disconnected.');
        if (focusedElement) {
            focusedElement.classList.remove('mye-gamepad-focused');
        }
        gamepadActive = false;
        
        if (virtualCursor) {
            virtualCursor.style.opacity = '0';
            setTimeout(() => {
                if (virtualCursor) virtualCursor.style.display = 'none';
            }, 200);
        }

        const gamepads = navigator.getGamepads();
        let activeGamepad = false;
        for (let i = 0; i < gamepads.length; i++) {
            if (gamepads[i]) activeGamepad = true;
        }
        if (!activeGamepad && animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    });

    // Disable Gamepad visual effects on mouse/keyboard activity
    function deactivateGamepadVisuals() {
        if (gamepadActive) {
            gamepadActive = false;
            if (focusedElement) {
                focusedElement.classList.remove('mye-gamepad-focused');
            }
        }
        // Hide virtual cursor
        if (virtualCursor) {
            virtualCursor.style.opacity = '0';
            setTimeout(() => {
                if (virtualCursor && virtualCursor.style.opacity === '0') {
                    virtualCursor.style.display = 'none';
                }
            }, 200);
        }
    }

    function handleMouseMove(e) {
        if (lastMouseX === null || lastMouseY === null) {
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
            return;
        }

        if (e.clientX !== lastMouseX || e.clientY !== lastMouseY) {
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
            deactivateGamepadVisuals();
        }
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', deactivateGamepadVisuals);
    window.addEventListener('keydown', deactivateGamepadVisuals);
    window.addEventListener('wheel', deactivateGamepadVisuals);

    // Initial check: if gamepad is already plugged in when script runs
    setTimeout(() => {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        let anyConnected = false;
        for (let i = 0; i < gamepads.length; i++) {
            if (gamepads[i]) {
                anyConnected = true;
                buttonStates = new Array(gamepads[i].buttons.length).fill(false);
            }
        }
        if (anyConnected) {
            console.log('[MyEfrei ULTRA] Gamepad found on startup.');
            showToast();
            updateGamepad();
        }
    }, 1000);
})();
