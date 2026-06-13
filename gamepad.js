(function() {
    'use strict';

    let toast = null;
    let virtualCursor = null;
    let cursorX = window.innerWidth / 2;
    let cursorY = window.innerHeight / 2;
    const cursorSpeed = 12; // Speed of virtual mouse cursor
    let lastMouseX = null;
    let lastMouseY = null;
    let isScrolling = false; // Flag to lockout mouse deactivation during scroll
    let lastNumpadActionTime = 0; // Timestamp to prevent accidental deactivation upon numpad events
    let activeNumpadTarget = null;
    let numpadValue = '';
    let originalNumpadValue = '';

    function initDOM() {
        try {
            console.log("[MyEfrei ULTRA Gamepad] initDOM called.");
            if (!document.body) {
                document.addEventListener('DOMContentLoaded', initDOM);
                return;
            }

        // CSS variables and custom styles injection
        if (!document.getElementById('mye-gamepad-styles')) {
            const style = document.createElement('style');
            style.id = 'mye-gamepad-styles';
            style.innerHTML = `
            /* Surbrillance manette - Vibrant electric blue for light mode */
            .mye-gamepad-focused {
                outline: 3px solid #0066ff !important;
                outline-offset: 2px !important;
                box-shadow: 0 0 16px rgba(0, 102, 255, 0.45) !important;
                transform: scale(1.025) !important;
                transition: transform 0.15s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.15s ease, outline 0.15s ease !important;
                z-index: 99999 !important;
            }

            /* Neon cyan override for dark mode */
            html.dark-mode .mye-gamepad-focused,
            body.dark-mode .mye-gamepad-focused {
                outline-color: #00d2ff !important;
                box-shadow: 0 0 18px rgba(0, 210, 255, 0.75) !important;
            }

            /* Indicateur manette pour les sélecteurs */
            .mye-select-gamepad-hint {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                margin-top: 6px;
                font-size: 11px;
                font-weight: 700;
                color: #0066ff;
                animation: mye-fade-in-hint 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            }
            html.dark-mode .mye-select-gamepad-hint,
            body.dark-mode .mye-select-gamepad-hint {
                color: #00d2ff;
            }
            .mye-select-gamepad-hint span {
                background: #ffffff;
                color: #000000;
                border: 1px solid rgba(0,0,0,0.15);
                border-radius: 4px;
                padding: 1px 5px;
                font-size: 9px;
                font-weight: bold;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            @keyframes mye-fade-in-hint {
                from { opacity: 0; transform: translateY(-4px); }
                to { opacity: 1; transform: translateY(0); }
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

            /* Clavier numérique virtuel manette */
            #mye-virtual-numpad {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -40%) scale(0.95);
                opacity: 0;
                background: rgba(20, 20, 20, 0.92);
                backdrop-filter: blur(20px) saturate(180%);
                border: 1px solid rgba(255, 255, 255, 0.15);
                border-radius: 24px;
                padding: 24px;
                color: #ffffff;
                display: none;
                flex-direction: column;
                gap: 16px;
                box-shadow: 0 24px 60px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.1);
                z-index: 2147483647;
                width: 260px;
                transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
                box-sizing: border-box;
            }
            #mye-virtual-numpad.show {
                transform: translate(-50%, -50%) scale(1);
                opacity: 1;
            }
            .mye-numpad-header {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                padding-bottom: 12px;
            }
            .mye-numpad-title {
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 1.5px;
                color: rgba(255, 255, 255, 0.5);
                font-weight: 700;
            }
            .mye-numpad-preview {
                font-size: 32px;
                font-weight: 800;
                color: #ffffff;
                font-family: monospace;
            }
            .mye-numpad-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 12px;
            }
            .mye-numpad-key {
                background: rgba(255, 255, 255, 0.08);
                border: 1px solid rgba(255, 255, 255, 0.1);
                color: #ffffff;
                border-radius: 16px;
                padding: 14px 0;
                font-size: 20px;
                font-weight: 700;
                cursor: pointer;
                transition: background 0.15s ease, transform 0.1s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                box-sizing: border-box;
            }
            .mye-numpad-key:hover,
            .mye-numpad-key.mye-gamepad-focused {
                background: #0066ff !important;
                border-color: #0066ff !important;
                box-shadow: 0 0 12px rgba(0, 102, 255, 0.5);
                transform: scale(1.05);
            }
            html.dark-mode .mye-numpad-key:hover,
            html.dark-mode .mye-numpad-key.mye-gamepad-focused,
            body.dark-mode .mye-numpad-key:hover,
            body.dark-mode .mye-numpad-key.mye-gamepad-focused {
                background: #00d2ff !important;
                border-color: #00d2ff !important;
                box-shadow: 0 0 12px rgba(0, 210, 255, 0.5);
                color: #000000 !important;
            }
            .mye-numpad-backspace {
                background: rgba(255, 59, 48, 0.15);
                border-color: rgba(255, 59, 48, 0.25);
                color: #ff3b30;
            }
            .mye-numpad-ok-btn {
                background: #0066ff;
                border: none;
                color: #ffffff;
                border-radius: 16px;
                padding: 14px 0;
                font-size: 16px;
                font-weight: 700;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(0, 102, 255, 0.3);
                transition: background 0.15s ease, transform 0.1s ease;
                box-sizing: border-box;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .mye-numpad-ok-btn:hover,
            .mye-numpad-ok-btn.mye-gamepad-focused {
                background: #0052cc !important;
                transform: scale(1.02);
                box-shadow: 0 6px 18px rgba(0, 102, 255, 0.5);
            }
            html.dark-mode .mye-numpad-ok-btn {
                background: #00d2ff;
                color: #000000;
                box-shadow: 0 4px 12px rgba(0, 210, 255, 0.3);
            }
            html.dark-mode .mye-numpad-ok-btn:hover,
            html.dark-mode .mye-numpad-ok-btn.mye-gamepad-focused,
            body.dark-mode .mye-numpad-ok-btn:hover,
            body.dark-mode .mye-numpad-ok-btn.mye-gamepad-focused {
                background: #00bfe6 !important;
                color: #000000 !important;
                transform: scale(1.02);
                box-shadow: 0 6px 18px rgba(0, 210, 255, 0.5);
            }
        `;
            document.documentElement.appendChild(style);
        }

        // Create Toast DOM Element
        let existingToast = document.getElementById('mye-gamepad-toast');
        if (!existingToast || !document.body.contains(existingToast)) {
            if (existingToast) existingToast.remove();
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
                <div class="mye-help-row"><span>Naviguer Semaines</span><span class="mye-badge-container"><span class="mye-badge-text">LT</span> / <span class="mye-badge-text">RT</span></span></div>
                <div class="mye-help-row"><span>Souris Virtuelle</span><span class="mye-badge-container">Stick D</span></div>
                <div class="mye-help-row"><span>Clic Virtuel</span><span class="mye-badge-container"><span class="mye-badge-text">R2</span></span></div>
                <div class="mye-help-row"><span>Mode Sombre</span><span class="mye-badge-container"><span class="mye-btn-badge mye-badge-x">X</span></span></div>
                <div class="mye-help-row"><span>Menu mobile / Accueil</span><span class="mye-badge-container"><span class="mye-badge-text">Start</span> / <span class="mye-btn-badge mye-badge-y">Y</span></span></div>
            </div>
        `;
            document.body.appendChild(toast);
        } else {
            toast = existingToast;
        }

        // Create Virtual Cursor DOM Element
        let existingCursor = document.getElementById('mye-virtual-cursor');
        if (!existingCursor || !document.body.contains(existingCursor)) {
            if (existingCursor) existingCursor.remove();
            virtualCursor = document.createElement('div');
            virtualCursor.id = 'mye-virtual-cursor';
            document.body.appendChild(virtualCursor);
        } else {
            virtualCursor = existingCursor;
        }

        // Create Virtual Numpad DOM Element
        let existingNumpad = document.getElementById('mye-virtual-numpad');
        if (!existingNumpad || !document.body.contains(existingNumpad)) {
            if (existingNumpad) existingNumpad.remove();
            const numpad = document.createElement('div');
            numpad.id = 'mye-virtual-numpad';
            numpad.style.display = 'none';
            numpad.innerHTML = `
                <div class="mye-numpad-header">
                    <span class="mye-numpad-title">Note Estimée</span>
                    <span class="mye-numpad-preview">0.00</span>
                </div>
                <div class="mye-numpad-grid">
                    <button class="mye-numpad-key" data-val="7">7</button>
                    <button class="mye-numpad-key" data-val="8">8</button>
                    <button class="mye-numpad-key" data-val="9">9</button>
                    
                    <button class="mye-numpad-key" data-val="4">4</button>
                    <button class="mye-numpad-key" data-val="5">5</button>
                    <button class="mye-numpad-key" data-val="6">6</button>
                    
                    <button class="mye-numpad-key" data-val="1">1</button>
                    <button class="mye-numpad-key" data-val="2">2</button>
                    <button class="mye-numpad-key" data-val="3">3</button>
                    
                    <button class="mye-numpad-key" data-val="0">0</button>
                    <button class="mye-numpad-key" data-val=".">.</button>
                    <button class="mye-numpad-key mye-numpad-backspace" data-val="back">⌫</button>
                </div>
                <button class="mye-numpad-ok-btn" id="mye-numpad-ok">Valider</button>
            `;
            document.body.appendChild(numpad);

            numpad.querySelectorAll('.mye-numpad-key').forEach(key => {
                key.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const val = key.getAttribute('data-val');
                    if (val === 'back') {
                        numpadValue = numpadValue.slice(0, -1);
                    } else {
                        if (val === '.' && numpadValue.includes('.')) return;
                        if (numpadValue.length >= 5) return;
                        numpadValue += val;
                    }
                    updateNumpadPreview();
                    if (activeNumpadTarget) {
                        activeNumpadTarget.value = numpadValue;
                        activeNumpadTarget.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                });
            });

            const okBtn = numpad.querySelector('#mye-numpad-ok');
            if (okBtn) {
                okBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    closeNumpad(true);
                });
            }
        }
        console.log("[MyEfrei ULTRA Gamepad] initDOM completed successfully.");
        } catch (err) {
            console.error("[MyEfrei ULTRA Gamepad] initDOM failed:", err);
            alert("[MyEfrei ULTRA Gamepad] initDOM error: " + err.message + "\nStack: " + err.stack);
        }
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
    function updateToastVisibility() {
        initDOM();
        if (!toast) return;
        
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        let anyConnected = false;
        for (let i = 0; i < gamepads.length; i++) {
            if (gamepads[i]) {
                anyConnected = true;
                break;
            }
        }
        
        if (anyConnected && window.location.pathname.includes('/portal/student/home')) {
            toast.classList.add('show');
        } else {
            toast.classList.remove('show');
        }
    }

    // Show/hide toast notifications
    function showToast() {
        updateToastVisibility();
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
        '.mye-subject-card',
        '.mye-open-modal-evt',
        '.mac-cal-event',
        '.mye-moodle-action-btn',
        '.mye-moodle-year-btn',
        '.mye-news-card',
        '.mye-event-card',
        '.mye-social-card',
        '.mye-carousel-slide',
        '.mye-hamburger-btn',
        '.mye-segmented-item'
    ].join(',');

    function getActiveModal() {
        const modalSelectors = [
            '#mye-virtual-numpad.show',
            '#mye-simulator-overlay.show',
            '#mye-resource-modal-overlay.show',
            '#mye-settings-modal',
            '#mye-event-modal',
            '#mye-pdf-overlay.show',
            '.mye-modal-overlay',
            '.mye-simulator-overlay.show',
            '.mye-resource-modal-overlay.show',
            '.mye-pdf-overlay.show'
        ];
        for (const selector of modalSelectors) {
            const el = document.querySelector(selector);
            if (el) {
                const rect = el.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    const style = window.getComputedStyle(el);
                    if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
                        return el;
                    }
                }
            }
        }
        return null;
    }

    function openNumpad(inputEl) {
        try {
            console.log("[MyEfrei ULTRA Gamepad] openNumpad called with element:", inputEl);
            lastNumpadActionTime = Date.now();
            initDOM(); // Ensure all DOM elements exist and are attached to the body
            activeNumpadTarget = inputEl;
            originalNumpadValue = inputEl.value || '';
            numpadValue = originalNumpadValue;
            updateNumpadPreview();
            
            const numpad = document.getElementById('mye-virtual-numpad');
            if (numpad) {
                numpad.style.display = 'flex';
                numpad.offsetHeight; // force layout
                numpad.classList.add('show');
                console.log("[MyEfrei ULTRA Gamepad] Numpad displayed successfully.");
                
                // Set focus to the first button (7)
                const firstKey = numpad.querySelector('.mye-numpad-key');
                if (firstKey) {
                    setTimeout(() => {
                        setFocus(firstKey, false);
                    }, 50);
                }
            } else {
                console.error("[MyEfrei ULTRA Gamepad] Numpad element not found in DOM.");
            }
        } catch (err) {
            console.error("[MyEfrei ULTRA Gamepad] openNumpad failed:", err);
            alert("[MyEfrei ULTRA Gamepad] openNumpad error: " + err.message + "\nStack: " + err.stack);
        }
    }

    function updateNumpadPreview() {
        const preview = document.querySelector('.mye-numpad-preview');
        if (preview) {
            preview.textContent = numpadValue || '0.00';
        }
    }

    function closeNumpad(save = true) {
        lastNumpadActionTime = Date.now();
        const numpad = document.getElementById('mye-virtual-numpad');
        if (numpad && numpad.style.display !== 'none') {
            numpad.classList.remove('show');
            setTimeout(() => {
                numpad.style.display = 'none';
            }, 200);
            
            if (activeNumpadTarget) {
                if (save) {
                    activeNumpadTarget.value = numpadValue;
                    activeNumpadTarget.dispatchEvent(new Event('input', { bubbles: true }));
                    activeNumpadTarget.dispatchEvent(new Event('change', { bubbles: true }));
                } else {
                    activeNumpadTarget.value = originalNumpadValue;
                    activeNumpadTarget.dispatchEvent(new Event('input', { bubbles: true }));
                    activeNumpadTarget.dispatchEvent(new Event('change', { bubbles: true }));
                }
                const lastTarget = activeNumpadTarget;
                activeNumpadTarget = null;
                setTimeout(() => {
                    setFocus(lastTarget, true);
                }, 100);
            }
        }
    }

    function getVisualFocusElement(el) {
        if (!el) return null;
        if (el.classList.contains('mye-carousel-slide')) {
            return el.closest('.mye-carousel-container') || el;
        }
        return el;
    }

    function removeSelectHint() {
        const existing = document.querySelector('.mye-select-gamepad-hint');
        if (existing) {
            existing.remove();
        }
    }

    function showSelectHint(selectEl) {
        removeSelectHint();
        const hint = document.createElement('div');
        hint.className = 'mye-select-gamepad-hint';
        hint.innerHTML = `<span>◀</span> Utiliser Joystick G / D-Pad <span>▶</span>`;
        if (selectEl.parentNode) {
            selectEl.parentNode.insertBefore(hint, selectEl.nextSibling);
        }
    }

    function isVisible(el) {
        if (!el) return false;

        // Restrict focus strictly inside the active modal if one is open
        const activeModal = getActiveModal();
        if (activeModal) {
            if (!activeModal.contains(el)) {
                return false;
            }
        }

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
        return elements.filter(el => {
            if (el.classList.contains('mye-carousel-btn')) return false;
            return isVisible(el);
        });
    }

    // Apply visual focus class
    function setFocus(el, shouldScroll = true) {
        if (focusedElement) {
            const visualEl = getVisualFocusElement(focusedElement);
            if (visualEl) visualEl.classList.remove('mye-gamepad-focused');
            removeSelectHint();
        }
        focusedElement = el;
        if (focusedElement && gamepadActive) {
            const visualEl = getVisualFocusElement(focusedElement);
            if (visualEl) visualEl.classList.add('mye-gamepad-focused');
            
            if (focusedElement.tagName === 'SELECT') {
                showSelectHint(focusedElement);
            }
            
            // Prevent scrolling-induced mousemove events from immediately deactivating visuals
            lastMouseX = null;
            lastMouseY = null;
            
            if (shouldScroll) {
                scrollElementIntoView(focusedElement);
            }
        }
    }

    // Custom scroll function that respects the sticky header height
    function scrollElementIntoView(el) {
        // If inside a modal, use native scrollIntoView since z-index covers the header
        const activeModal = getActiveModal();
        if (activeModal) {
            isScrolling = true;
            el.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'nearest'
            });
            setTimeout(() => {
                isScrolling = false;
            }, 350);
            return;
        }

        isScrolling = true;
        
        // 1. Perform native scroll first to bring it generally into view
        el.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'nearest'
        });

        // 2. Adjust for fixed header after a short delay to allow layout/scroll values to update
        setTimeout(() => {
            const rect = el.getBoundingClientRect();
            const header = document.getElementById('mye-custom-header');
            const headerBottom = header ? header.getBoundingClientRect().bottom : 75;
            const viewportTop = headerBottom + 15; // Bottom of header + 15px safety margin

            if (rect.top < viewportTop) {
                const scrollOffset = viewportTop - rect.top;
                const parent = getScrollParent(el);
                
                if (parent === document.documentElement || parent === document.body || parent === document.scrollingElement) {
                    window.scrollBy({
                        top: -scrollOffset,
                        behavior: 'smooth'
                    });
                } else {
                    parent.scrollBy({
                        top: -scrollOffset,
                        behavior: 'smooth'
                    });
                }
            }
            
            // Release scroll lock after transition finishes
            setTimeout(() => {
                isScrolling = false;
            }, 250);
        }, 80);
    }

    // Helper to find the scrollable container of an element
    function getScrollParent(node) {
        if (node == null) {
            return null;
        }
        if (node.scrollHeight > node.clientHeight) {
            const style = window.getComputedStyle(node);
            if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
                return node;
            }
        }
        return getScrollParent(node.parentNode) || document.scrollingElement || document.documentElement;
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

        // Special case: Carousel navigation via Left/Right joystick or D-pad
        if (focusedElement && focusedElement.classList.contains('mye-carousel-slide')) {
            if (direction === 'LEFT') {
                const prevBtn = document.getElementById('mye-carousel-prev');
                if (prevBtn) {
                    prevBtn.click();
                    const activeSlide = document.querySelector('.mye-carousel-slide.active');
                    if (activeSlide) {
                        setFocus(activeSlide, false);
                    }
                    return;
                }
            } else if (direction === 'RIGHT') {
                const nextBtn = document.getElementById('mye-carousel-next');
                if (nextBtn) {
                    nextBtn.click();
                    const activeSlide = document.querySelector('.mye-carousel-slide.active');
                    if (activeSlide) {
                        setFocus(activeSlide, false);
                    }
                    return;
                }
            }
        }

        // Special case: Select elements (use LEFT/RIGHT to cycle options)
        if (focusedElement && focusedElement.tagName === 'SELECT') {
            if (direction === 'LEFT') {
                const len = focusedElement.options.length;
                if (len > 1) {
                    const newIndex = Math.max(0, focusedElement.selectedIndex - 1);
                    if (focusedElement.selectedIndex !== newIndex) {
                        focusedElement.selectedIndex = newIndex;
                        focusedElement.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }
                return;
            } else if (direction === 'RIGHT') {
                const len = focusedElement.options.length;
                if (len > 1) {
                    const newIndex = Math.min(len - 1, focusedElement.selectedIndex + 1);
                    if (focusedElement.selectedIndex !== newIndex) {
                        focusedElement.selectedIndex = newIndex;
                        focusedElement.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }
                return;
            }
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
                const visualEl = getVisualFocusElement(focusedElement);
                if (visualEl) visualEl.classList.add('mye-gamepad-focused');
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
                    console.log("[MyEfrei ULTRA Gamepad] Button A pressed on focusedElement:", clickedEl, 
                                "tagName:", clickedEl.tagName, 
                                "classList:", Array.from(clickedEl.classList), 
                                "type:", clickedEl.type);
                    if (clickedEl.tagName === 'INPUT' && (clickedEl.classList.contains('mye-sim-eval-input') || clickedEl.type === 'number')) {
                        console.log("[MyEfrei ULTRA Gamepad] Matching numeric/grade input, calling openNumpad()");
                        openNumpad(clickedEl);
                        break;
                    }
                    if (clickedEl.tagName === 'SELECT') {
                        try {
                            clickedEl.showPicker();
                        } catch (err) {
                            console.error("[MyEfrei ULTRA Gamepad] showPicker failed:", err);
                        }
                    } else {
                        clickedEl.click();
                    }
                    if (clickedEl.tagName === 'INPUT' || clickedEl.tagName === 'TEXTAREA') {
                        clickedEl.focus();
                    } else if (clickedEl.tagName !== 'SELECT') {
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

                        // Modal popup auto-focus first visible element inside modal
                        setTimeout(() => {
                            const activeModal = getActiveModal();
                            if (activeModal) {
                                const subitems = Array.from(activeModal.querySelectorAll(INTERACTIVE_SELECTORS));
                                const visibleSubitems = subitems.filter(isVisible);
                                if (visibleSubitems.length > 0) {
                                    setFocus(visibleSubitems[0]);
                                }
                            }
                        }, 100);
                    }
                }
                break;
            case 1: // B (Circle) - Cancel/Back
                // 1. Close active modal if any
                const activeModal = getActiveModal();
                if (activeModal) {
                    if (activeModal.id === 'mye-virtual-numpad') {
                        closeNumpad(false);
                        break;
                    }
                    const closeBtn = activeModal.querySelector('.mye-simulator-close, #mye-resource-modal-close, #mye-settings-close, #mye-event-close, .mye-modal-close, [class*="close"], [id*="close"]');
                    if (closeBtn) {
                        closeBtn.click();
                    } else {
                        activeModal.classList.remove('show');
                        activeModal.style.display = 'none';
                    }
                    
                    // Reset D-pad focus to first element on main page
                    setTimeout(() => {
                        const candidates = getNavigableElements();
                        if (candidates.length > 0) {
                            setFocus(candidates[0]);
                        }
                    }, 100);
                    break;
                }

                // 2. Close dropdown and focus parent trigger if inside dropdown
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

                // 3. Close mobile drawer if active
                const mobileDrawer = document.getElementById('mye-mobile-drawer');
                if (mobileDrawer && mobileDrawer.classList.contains('active')) {
                    const closeBtn = document.getElementById('mye-drawer-close') || document.getElementById('mye-drawer-overlay');
                    if (closeBtn) closeBtn.click();
                    break;
                }

                // 4. Fallback: Go back
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
            case 6: // LT (Left Trigger) - Navigate calendar previous period
                if (virtualCursor && virtualCursor.style.opacity === '1') {
                    // Virtual cursor active - no default action
                } else {
                    const prevBtn = document.getElementById('mye-period-prev');
                    if (prevBtn) prevBtn.click();
                }
                break;
            case 7: // R2 (Right Trigger) - Click at virtual cursor OR next period
            case 11: // R3 (Right Stick Click) - Click at virtual cursor location
                if (virtualCursor && virtualCursor.style.opacity === '1') {
                    const hoveredEl = document.elementFromPoint(cursorX, cursorY);
                    const interactiveEl = hoveredEl ? hoveredEl.closest(INTERACTIVE_SELECTORS) : null;
                    if (interactiveEl) {
                        console.log("[MyEfrei ULTRA Gamepad] Virtual click on interactiveEl:", interactiveEl,
                                    "tagName:", interactiveEl.tagName,
                                    "classList:", Array.from(interactiveEl.classList),
                                    "type:", interactiveEl.type);
                        if (interactiveEl.tagName === 'INPUT' && (interactiveEl.classList.contains('mye-sim-eval-input') || interactiveEl.type === 'number')) {
                            console.log("[MyEfrei ULTRA Gamepad] Matching numeric/grade input via virtual click, calling openNumpad()");
                            openNumpad(interactiveEl);
                        } else if (interactiveEl.tagName === 'SELECT') {
                            try {
                                interactiveEl.showPicker();
                            } catch (err) {
                                console.error("[MyEfrei ULTRA Gamepad] showPicker failed:", err);
                            }
                        } else {
                            interactiveEl.click();
                        }
                        if (interactiveEl.tagName === 'INPUT' || interactiveEl.tagName === 'TEXTAREA') {
                            interactiveEl.focus();
                        }
                    }
                } else if (buttonIndex === 7) { // Only for R2/RT, not R3
                    const nextBtn = document.getElementById('mye-period-next');
                    if (nextBtn) nextBtn.click();
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
                if (focusedElement) {
                    const visualEl = getVisualFocusElement(focusedElement);
                    if (visualEl) visualEl.classList.add('mye-gamepad-focused');
                } else {
                    navigate(navDirection);
                }
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
            
            if (!virtualCursor || !document.body.contains(virtualCursor)) {
                initDOM();
            }
            
            if (virtualCursor && (virtualCursor.style.display === 'none' || virtualCursor.style.opacity === '0')) {
                virtualCursor.style.display = 'block';
                virtualCursor.offsetHeight; // force layout recalculation
                virtualCursor.style.opacity = '1';

                // Clear D-pad focus highlight
                if (focusedElement) {
                    const visualEl = getVisualFocusElement(focusedElement);
                    if (visualEl) visualEl.classList.remove('mye-gamepad-focused');
                    removeSelectHint();
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
                    const visualEl = getVisualFocusElement(focusedElement);
                    if (visualEl) visualEl.classList.remove('mye-gamepad-focused');
                    removeSelectHint();
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
        if (toast) {
            toast.classList.remove('show');
        }
        if (focusedElement) {
            const visualEl = getVisualFocusElement(focusedElement);
            if (visualEl) visualEl.classList.remove('mye-gamepad-focused');
        }
        removeSelectHint();
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
    function deactivateGamepadVisuals(reason) {
        console.log(`[MyEfrei ULTRA Gamepad] Deactivating visuals. Reason: ${reason || 'unknown'}`);
        if (gamepadActive) {
            gamepadActive = false;
            if (focusedElement) {
                const visualEl = getVisualFocusElement(focusedElement);
                if (visualEl) visualEl.classList.remove('mye-gamepad-focused');
            }
            removeSelectHint();
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
        if (isScrolling) return; // Block mousemove deactivation during scroll animation
        if (Date.now() - lastNumpadActionTime < 1000) return; // Lockout mouse deactivation for 1s after numpad actions

        // If virtual mouse is active and visible, block deactivation since user is actively using right stick
        if (virtualCursor && virtualCursor.style.opacity === '1') return;

        if (lastMouseX === null || lastMouseY === null) {
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
            return;
        }

        const dx = e.clientX - lastMouseX;
        const dy = e.clientY - lastMouseY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Only deactivate if the mouse moves more than 8 pixels (ignores micro-jitters and scroll noise)
        if (distance > 8) {
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
            deactivateGamepadVisuals(`mousemove (moved ${Math.round(distance)}px)`);
        }
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', () => deactivateGamepadVisuals('mousedown'));
    window.addEventListener('keydown', (e) => {
        deactivateGamepadVisuals(`keydown: ${e.key}`);
    });
    window.addEventListener('wheel', () => deactivateGamepadVisuals('mousewheel'));

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

    // Watch for route changes (Angular SPA) to show/hide the toast dynamically
    let myeGamepadLastUrl = window.location.href;
    setInterval(() => {
        if (myeGamepadLastUrl !== window.location.href) {
            myeGamepadLastUrl = window.location.href;
            updateToastVisibility();
        }
    }, 500);
})();
