(function() {
    'use strict';

    // Verify this is a RACYWAMA portal page
    const isRacywama = window.location.pathname.toLowerCase().includes('racywama') || 
                       document.title.toLowerCase().includes('racywama') || 
                       document.getElementById('sidebar-logo') !== null ||
                       document.querySelector('.sidebar-logo-img') !== null;

    if (!isRacywama) return;

    console.log('[MyEfrei ULTRA Sync] Content script active on portal page.');

    const keys = [
        'mye_user_name',
        'mye_user_first_name',
        'mye_user_last_name',
        'mye_user_avatar',
        'mye_user_class',
        'mye_user_email',
        'mye_user_average',
        'mye_user_absences',
        'mye_user_retards',
        'mye_user_theme',
        'mye_user_darkmode',
        'mye_user_enabled',
        'mye-planning-settings',
        'mye-calendars-settings'
    ];

    // Read extension storage and sync to page localStorage
    function syncFromExtensionToPortal() {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(keys, (data) => {
                if (chrome.runtime.lastError) {
                    console.error('[MyEfrei ULTRA Sync] Error reading extension storage:', chrome.runtime.lastError);
                    return;
                }

                let changed = false;
                keys.forEach(key => {
                    if (data[key] !== undefined && data[key] !== null) {
                        const valStr = String(data[key]);
                        if (localStorage.getItem(key) !== valStr) {
                            localStorage.setItem(key, valStr);
                            changed = true;
                        }
                    }
                });

                if (changed) {
                    console.log('[MyEfrei ULTRA Sync] Local storage updated from extension.');
                    window.dispatchEvent(new CustomEvent('mye-sync-data'));
                }
                updateDeactivationPopup();
            });
        }
    }

    // Run initial sync
    syncFromExtensionToPortal();

    // Trigger background session validation to ensure data is fresh and detect session expirations
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ action: 'check_sync_status' }, (response) => {
            if (chrome.runtime.lastError) {
                console.warn('[MyEfrei ULTRA Sync] Failed to request background sync status:', chrome.runtime.lastError.message);
                return;
            }
            console.log('[MyEfrei ULTRA Sync] Sync status check complete:', response);
            if (response && response.status === 'connected') {
                syncFromExtensionToPortal();
            } else if (response && response.status === 'disconnected') {
                // Open login popup automatically if enabled and not already auto-shown in this session
                const isEnabled = localStorage.getItem('mye_user_enabled') !== 'false';
                if (isEnabled && !sessionStorage.getItem('mye_login_popup_auto_shown')) {
                    sessionStorage.setItem('mye_login_popup_auto_shown', 'true');
                    chrome.runtime.sendMessage({ action: 'open_login_popup' });
                }
            }
        });
    }

    // Intercept manual connection clicks to open them in the popup
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (link && link.href && (link.href.includes('auth.myefrei.fr') || link.href.includes('dcYDgSKBVvpcvzDMq9liF'))) {
            e.preventDefault();
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                chrome.runtime.sendMessage({ action: 'open_login_popup' });
            }
        }
    });

    // Listen for storage changes in the extension (real-time sync)
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
        chrome.storage.onChanged.addListener((changes, areaName) => {
            if (areaName === 'local') {
                let changed = false;
                keys.forEach(key => {
                    if (changes[key]) {
                        const newValue = changes[key].newValue;
                        if (newValue !== undefined && newValue !== null) {
                            const valStr = String(newValue);
                            if (localStorage.getItem(key) !== valStr) {
                                  localStorage.setItem(key, valStr);
                                  changed = true;
                            }
                        } else {
                            if (localStorage.getItem(key) !== null) {
                                localStorage.removeItem(key);
                                changed = true;
                            }
                        }
                    }
                });

                if (changed) {
                    console.log('[MyEfrei ULTRA Sync] Real-time storage update from extension changes.');
                    window.dispatchEvent(new CustomEvent('mye-sync-data'));
                }
                updateDeactivationPopup();
            }
        });
    }

    // Listen for saves from the portal to sync back to the extension
    window.addEventListener('mye-portal-save', (e) => {
        const { key, value } = e.detail || {};
        if (key && keys.includes(key)) {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                const updateObj = {};
                updateObj[key] = value;
                chrome.storage.local.set(updateObj, () => {
                    console.log(`[MyEfrei ULTRA Sync] Preferences synced back to extension: ${key} = ${value}`);
                });
            }
        }
    });

    // Handle clear/reset event (which deletes multiple keys)
    window.addEventListener('mye-portal-reset', () => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.remove(keys.filter(k => k !== 'mye_user_enabled'), () => {
                console.log('[MyEfrei ULTRA Sync] School data cleared from extension storage.');
            });
        }
    });

    // ──────────────────────────────────────────────
    // POPUP DE DESACTIVATION & REACTIVATION
    // ──────────────────────────────────────────────
    function updateDeactivationPopup() {
        const isEnabled = localStorage.getItem('mye_user_enabled') !== 'false';
        
        // Remove existing popup if any
        const existing = document.getElementById('mye-deactivation-popup');
        if (existing) {
            existing.remove();
        }

        if (isEnabled) {
            return;
        }

        // Inject styles for the popup if not present
        if (!document.getElementById('mye-deactivation-styles')) {
            const style = document.createElement('style');
            style.id = 'mye-deactivation-styles';
            style.textContent = `
                #mye-deactivation-popup {
                    position: fixed;
                    bottom: 24px;
                    right: 24px;
                    background: rgba(255, 255, 255, 0.75);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border: 1px solid rgba(0, 0, 0, 0.08);
                    border-radius: 20px;
                    padding: 16px 20px;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
                    z-index: 999999;
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    cursor: pointer;
                    user-select: none;
                    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    animation: myeSlideInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                #mye-deactivation-popup:hover {
                    transform: translateY(-4px) scale(1.02);
                    box-shadow: 0 14px 35px rgba(0, 0, 0, 0.12);
                    border-color: rgba(0, 0, 0, 0.15);
                }
                #mye-deactivation-popup:active {
                    transform: translateY(-2px) scale(0.99);
                }
                .mye-popup-dot {
                    width: 10px;
                    height: 10px;
                    background-color: #ff3b30;
                    border-radius: 50%;
                    box-shadow: 0 0 8px #ff3b30;
                    flex-shrink: 0;
                }
                .mye-popup-content {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }
                .mye-popup-title {
                    font-size: 14px;
                    font-weight: 600;
                    color: #1d1d1f;
                }
                .mye-popup-subtitle {
                    font-size: 12px;
                    color: #86868b;
                }
                @keyframes myeSlideInUp {
                    from {
                        transform: translateY(100px) scale(0.9);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0) scale(1);
                        opacity: 1;
                    }
                }
                
                /* Confirmation Modal styles */
                #mye-confirm-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    background: rgba(0, 0, 0, 0.4);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    z-index: 1000000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.3s ease;
                }
                #mye-confirm-modal-overlay.show {
                    opacity: 1;
                    pointer-events: auto;
                }
                .mye-confirm-modal {
                    background: #ffffff;
                    border-radius: 24px;
                    padding: 28px;
                    width: 90%;
                    max-width: 380px;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.15);
                    text-align: center;
                    transform: scale(0.9);
                    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                #mye-confirm-modal-overlay.show .mye-confirm-modal {
                    transform: scale(1);
                }
                .mye-modal-icon {
                    width: 56px;
                    height: 56px;
                    background: #eef2ff;
                    color: #4f46e5;
                    font-size: 24px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 16px;
                }
                .mye-modal-title {
                    font-size: 19px;
                    font-weight: 700;
                    color: #1d1d1f;
                    margin-bottom: 8px;
                }
                .mye-modal-text {
                    font-size: 14px;
                    color: #86868b;
                    line-height: 1.5;
                    margin-bottom: 24px;
                }
                .mye-modal-buttons {
                    display: flex;
                    gap: 12px;
                }
                .mye-modal-btn {
                    flex: 1;
                    border: none;
                    border-radius: 12px;
                    padding: 12px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .mye-modal-btn-cancel {
                    background: #f5f5f7;
                    color: #1d1d1f;
                }
                .mye-modal-btn-cancel:hover {
                    background: #e8e8ed;
                }
                .mye-modal-btn-confirm {
                    background: #0071e3;
                    color: #ffffff;
                }
                .mye-modal-btn-confirm:hover {
                    background: #0077ed;
                }
            `;
            document.head.appendChild(style);
        }

        // Create the popup element
        const popup = document.createElement('div');
        popup.id = 'mye-deactivation-popup';
        popup.innerHTML = `
            <div class="mye-popup-dot"></div>
            <div class="mye-popup-content">
                <span class="mye-popup-title">myEfrei ULTRA désactivé</span>
                <span class="mye-popup-subtitle">Cliquez ici pour réactiver l'extension</span>
            </div>
        `;

        document.body.appendChild(popup);

        // Add event listener to show confirmation modal
        popup.addEventListener('click', () => {
            showReactivationModal();
        });
    }

    function showReactivationModal() {
        let overlay = document.getElementById('mye-confirm-modal-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'mye-confirm-modal-overlay';
            overlay.innerHTML = `
                <div class="mye-confirm-modal">
                    <div class="mye-modal-icon">✨</div>
                    <div class="mye-modal-title">Réactiver l'extension ?</div>
                    <div class="mye-modal-text">Souhaitez-vous réactiver MyEfrei ULTRA et restaurer le tableau de bord et la scolarité personnalisés ?</div>
                    <div class="mye-modal-buttons">
                        <button class="mye-modal-btn mye-modal-btn-cancel" id="mye-modal-cancel">Annuler</button>
                        <button class="mye-modal-btn mye-modal-btn-confirm" id="mye-modal-confirm">Réactiver</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);

            overlay.querySelector('#mye-modal-cancel').addEventListener('click', (e) => {
                e.stopPropagation();
                overlay.classList.remove('show');
            });

            overlay.querySelector('#mye-modal-confirm').addEventListener('click', (e) => {
                e.stopPropagation();
                overlay.classList.remove('show');
                reactivateExtension();
            });

            overlay.addEventListener('click', () => {
                overlay.classList.remove('show');
            });

            overlay.querySelector('.mye-confirm-modal').addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

        setTimeout(() => {
            overlay.classList.add('show');
        }, 10);
    }

    function reactivateExtension() {
        localStorage.setItem('mye_user_enabled', 'true');
        
        // Dispatch save event to sync back to extension storage
        window.dispatchEvent(new CustomEvent('mye-portal-save', { 
            detail: { key: 'mye_user_enabled', value: 'true' } 
        }));

        // Dispatch sync event so the page can reload its parameters and update the toggles
        window.dispatchEvent(new CustomEvent('mye-sync-data'));

        // Hide popup
        updateDeactivationPopup();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateDeactivationPopup);
    } else {
        updateDeactivationPopup();
    }

})();
