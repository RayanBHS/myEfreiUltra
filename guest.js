// =============================================
//  MYEFREI ULTRA — Module Compte Invité
// =============================================

(function () {
  'use strict';

  console.log('👤 MyEfrei ULTRA — Module Compte Invité (Chargé)');

  // ──────────────────────────────────────────────
  // INITIALISATION
  // ──────────────────────────────────────────────
  function init() {
    console.log('👤 Initialisation Module Compte Invité...');
    document.body.classList.add('mye-clean-screen');

    // Inject body background style
    if (!document.getElementById('mye-guest-hide-style')) {
      const hideStyle = document.createElement('style');
      hideStyle.id = 'mye-guest-hide-style';
      hideStyle.innerHTML = `
        body {
          background-color: #F0F0F0 !important;
        }
      `;
      document.head.appendChild(hideStyle);
    }

    // Build the custom container
    if (!document.getElementById('mye-guest-container')) {
      const container = document.createElement('div');
      container.id = 'mye-guest-container';
      container.className = 'mye-page-container';

      container.innerHTML = `
        <div class="mye-guest-left">
            <div class="mye-guest-action-card">
              <div class="mye-guest-action-icon-bg">
                <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="8.5" cy="7" r="4"></circle>
                  <line x1="20" y1="8" x2="20" y2="14"></line>
                  <line x1="23" y1="11" x2="17" y2="11"></line>
                </svg>
              </div>
              <h2 class="mye-guest-action-title">Gestion du compte</h2>
              <p class="mye-guest-action-desc">Créez ou gérez l'accès invité à votre espace étudiant MyEfrei.</p>
              
              <button class="mye-guest-create-btn" id="mye-guest-create-btn" style="display: none;">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Créer un accès invité
              </button>

              <div class="mye-guest-existing-card" id="mye-guest-existing-card">
                <h3 class="mye-guest-existing-title">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  Compte Actif
                </h3>
                <div class="mye-guest-existing-details">
                  <p>Identifiant : <strong id="mye-guest-current-user">...</strong></p>
                  <p style="display: flex; align-items: center; gap: 8px;">
                    Mot de passe : <strong id="mye-guest-current-pass">******</strong>
                    <button id="mye-guest-show-pass-btn" style="display: none; background: none; border: none; padding: 4px; cursor: pointer; color: #64748b; margin-top: 2px;" title="Afficher/Masquer le mot de passe">
                      <svg id="mye-guest-eye-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    </button>
                  </p>
                </div>
                <button class="mye-guest-delete-btn" id="mye-guest-delete-btn">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                  Supprimer l'accès
                </button>
              </div>
            </div>

            <!-- Disclaimer -->
            <div class="mye-guest-disclaimer-card">
              <p>En utilisant ce service, je suis informé et consens expressément à la création d'un compte « invité » permettant à des tiers l'accès à certaines informations des dossiers administratif et scolaire de l'étudiant. Toute communication de l'identifiant et du mot de passe (distincts de ceux de l'étudiant) autorisant l'accès à ce compte invité sera sous la responsabilité exclusive de l'étudiant. Je confirme vouloir créer un compte invité.</p>
            </div>
        </div>

        <div class="mye-guest-right">
            <!-- Section Description -->
            <div class="mye-guest-block">
                <div class="mye-guest-block-header">
                    <h2 class="mye-guest-block-title">Description du service</h2>
                </div>
                <div class="mye-guest-info-content">
                    <div class="mye-guest-info-row">
                      <div class="mye-guest-info-icon">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                          <circle cx="9" cy="7" r="4"></circle>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                      </div>
                      <p>Cette fonctionnalité vous permet de configurer <strong>un accès invité unique et restreint</strong> à votre compte étudiant. Vous êtes libre de communiquer cet accès aux personnes de votre choix (tels que vos parents par exemple).</p>
                    </div>

                    <div class="mye-guest-info-row">
                      <div class="mye-guest-info-icon">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                      </div>
                      <p>Vous avez aussi la possibilité de <strong>révoquer cet accès à tout moment</strong>.</p>
                    </div>
                </div>
            </div>

            <!-- Section Écrans Accessibles -->
            <div class="mye-guest-block">
                <div class="mye-guest-block-header">
                    <h2 class="mye-guest-block-title">Écrans accessibles aux invités</h2>
                </div>
                <div class="mye-guest-subjects">
                    
                    <div class="mye-guest-subject-card">
                      <div class="mye-guest-subject-top">
                        <div class="mye-guest-subject-name-container">
                          <h3 class="mye-guest-subject-name">Notes et crédits</h3>
                        </div>
                        <div class="mye-guest-subject-icon blue">
                          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        </div>
                      </div>
                      <div class="mye-guest-subject-bottom"></div>
                    </div>

                    <div class="mye-guest-subject-card">
                      <div class="mye-guest-subject-top">
                        <div class="mye-guest-subject-name-container">
                          <h3 class="mye-guest-subject-name">Absences</h3>
                        </div>
                        <div class="mye-guest-subject-icon orange">
                          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path><path d="M12 6v6l4 2"></path></svg>
                        </div>
                      </div>
                      <div class="mye-guest-subject-bottom"></div>
                    </div>

                    <div class="mye-guest-subject-card">
                      <div class="mye-guest-subject-top">
                        <div class="mye-guest-subject-name-container">
                          <h3 class="mye-guest-subject-name">Planning</h3>
                        </div>
                        <div class="mye-guest-subject-icon green">
                          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        </div>
                      </div>
                      <div class="mye-guest-subject-bottom"></div>
                    </div>

                    <div class="mye-guest-subject-card">
                      <div class="mye-guest-subject-top">
                        <div class="mye-guest-subject-name-container">
                          <h3 class="mye-guest-subject-name">Bulletins & Factures</h3>
                        </div>
                        <div class="mye-guest-subject-icon purple">
                          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        </div>
                      </div>
                      <div class="mye-guest-subject-bottom"></div>
                    </div>

                </div>
            </div>
        </div>
      `;

      document.body.appendChild(container);

      // Inject Custom Popup HTML avec gestion d'état
      const popupHtml = `
        <div class="mye-guest-custom-popup-overlay" id="mye-guest-popup">
          <div class="mye-guest-custom-popup">
            <div id="mye-guest-state-confirm">
              <h3 class="mye-guest-popup-title">Création de compte invité</h3>
              <p class="mye-guest-popup-desc">Vous êtes sur le point de créer un accès invité.</p>
              <p class="mye-guest-popup-subdesc">En cliquant sur "Créer l'accès", vous recevrez instantanément un mot de passe qui sera généré automatiquement.</p>
              <div class="mye-guest-popup-actions">
                <button class="mye-guest-popup-btn mye-guest-popup-cancel" id="mye-guest-popup-cancel">ANNULER</button>
                <button class="mye-guest-popup-btn mye-guest-popup-confirm" id="mye-guest-popup-confirm">CRÉER L'ACCÈS</button>
              </div>
            </div>
            <div id="mye-guest-state-success" style="display: none;">
              <h3 class="mye-guest-popup-title">Compte créé avec succès</h3>
              <p class="mye-guest-popup-desc">Veuillez noter ces informations, le mot de passe ne sera plus affiché.</p>
              <div style="background: #f1f5f9; padding: 15px; border-radius: 10px; margin-bottom: 20px; text-align: left; border: 1px solid #e2e8f0;">
                <p style="margin: 0 0 10px; font-size: 15px; color: #333; font-family: 'Alliance No.2 Regular', sans-serif;"><strong>Identifiant :</strong> <span id="mye-guest-new-user" style="color: #163767;"></span></p>
                <p style="margin: 0; font-size: 15px; color: #333; font-family: 'Alliance No.2 Regular', sans-serif;"><strong>Mot de passe :</strong> <span id="mye-guest-new-pass" style="color: #163767; font-family: monospace; font-size: 18px;"></span></p>
              </div>
              <button class="mye-guest-popup-btn mye-guest-popup-confirm" id="mye-guest-popup-close">FERMER</button>
            </div>
          </div>
        </div>
      `;
      container.insertAdjacentHTML('beforeend', popupHtml);
      
      const popupOverlay = document.getElementById('mye-guest-popup');
      const stateConfirm = document.getElementById('mye-guest-state-confirm');
      const stateSuccess = document.getElementById('mye-guest-state-success');
      const btnCancel = document.getElementById('mye-guest-popup-cancel');
      const btnConfirm = document.getElementById('mye-guest-popup-confirm');
      const btnClose = document.getElementById('mye-guest-popup-close');
      
      const newUserEl = document.getElementById('mye-guest-new-user');
      const newPassEl = document.getElementById('mye-guest-new-pass');

      const createBtn = document.getElementById('mye-guest-create-btn');

      if (createBtn) {
        createBtn.addEventListener('click', () => {
          stateConfirm.style.display = 'block';
          stateSuccess.style.display = 'none';
          btnConfirm.textContent = "CRÉER L'ACCÈS";
          btnConfirm.style.pointerEvents = 'auto';
          popupOverlay.classList.add('show');
        });
      }
      
      if (btnCancel) {
        btnCancel.addEventListener('click', () => {
          popupOverlay.classList.remove('show');
        });
      }
      
      if (btnClose) {
        btnClose.addEventListener('click', () => {
          popupOverlay.classList.remove('show');
          window.location.reload();
        });
      }
      
      if (btnConfirm) {
        btnConfirm.addEventListener('click', () => {
          btnConfirm.textContent = 'CRÉATION...';
          btnConfirm.style.pointerEvents = 'none';
          
          // Récupération du token XSRF depuis les cookies
          const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
          const xsrfToken = match ? match[1] : '';

          fetch('/api/rest/student/guest', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
              'X-XSRF-TOKEN': xsrfToken
            }
          })
          .then(res => {
            if (!res.ok) throw new Error('Network response was not ok');
            return res.json();
          })
          .then(data => {
            if (data && data.username && data.password) {
               newUserEl.textContent = data.username;
               newPassEl.textContent = data.password;
               
               // Sauvegarde locale du mot de passe
               localStorage.setItem('myeGuestPassword', data.password);
               
               stateConfirm.style.display = 'none';
               stateSuccess.style.display = 'block';
            } else {
               throw new Error('Invalid data');
            }
          })
          .catch(err => {
             console.error("Erreur API :", err);
             btnConfirm.textContent = 'ERREUR';
             setTimeout(() => {
                 btnConfirm.textContent = "CRÉER L'ACCÈS";
                 btnConfirm.style.pointerEvents = 'auto';
             }, 2000);
          });
        });
      }

      // Initial API Fetch to check if account exists
      const matchXsrf = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
      const tokenXsrf = matchXsrf ? matchXsrf[1] : '';
      
      const existingCard = document.getElementById('mye-guest-existing-card');
      const currentUserEl = document.getElementById('mye-guest-current-user');
      const deleteBtn = document.getElementById('mye-guest-delete-btn');

      fetch('/api/rest/student/guest', {
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      })
      .then(res => {
         if(res.status === 204) return null;
         return res.text().then(text => text ? JSON.parse(text) : null);
      })
      .then(data => {
         if (data && data.username) {
            if (createBtn) createBtn.style.display = 'none';
            if (existingCard) existingCard.style.display = 'block';
            if (currentUserEl) currentUserEl.textContent = data.username;
            
            const currentPassEl = document.getElementById('mye-guest-current-pass');
            const showPassBtn = document.getElementById('mye-guest-show-pass-btn');
            if (currentPassEl && showPassBtn) {
               // Si l'API retourne le mot de passe, ou si on l'a en cache local
               const savedPassword = data.password || localStorage.getItem('myeGuestPassword');
               
               if (savedPassword) {
                  showPassBtn.style.display = 'inline-block';
                  let isVisible = false;
                  showPassBtn.addEventListener('click', () => {
                     isVisible = !isVisible;
                     if (isVisible) {
                        currentPassEl.textContent = savedPassword;
                        document.getElementById('mye-guest-eye-icon').innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
                     } else {
                        currentPassEl.textContent = '******';
                        document.getElementById('mye-guest-eye-icon').innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
                     }
                  });
               } else {
                  // Si on a rien (ni API ni local)
                  showPassBtn.style.display = 'none';
                  currentPassEl.innerHTML = '<em style="font-size:13px; color:#94a3b8; font-weight:normal;">Non communiqué (non sauvegardé)</em>';
               }
            }
         } else {
            if (createBtn) createBtn.style.display = 'inline-flex';
            if (existingCard) existingCard.style.display = 'none';
         }
      })
      .catch(err => console.error("Erreur API Init :", err));
      
      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
          deleteBtn.textContent = 'SUPPRESSION...';
          deleteBtn.style.pointerEvents = 'none';
          
          fetch('/api/rest/student/guest', {
            method: 'DELETE',
            headers: {
              'Accept': 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
              'X-XSRF-TOKEN': tokenXsrf
            }
          })
          .then(res => res.text())
          .then(text => {
            const data = text ? JSON.parse(text) : {};
            if (data && data.status === 'success') {
               // Suppression de la sauvegarde locale
               localStorage.removeItem('myeGuestPassword');
               window.location.reload();
            } else {
               throw new Error('Deletion failed');
            }
          })
          .catch(err => {
             console.error("Erreur suppression :", err);
             deleteBtn.textContent = 'ERREUR';
             setTimeout(() => {
                deleteBtn.innerHTML = "<svg viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polyline points=\"3 6 5 6 21 6\"></polyline><path d=\"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2\"></path></svg> Supprimer l'accès";
                deleteBtn.style.pointerEvents = 'auto';
             }, 2000);
          });
        });
      }
    }
  }

  // ──────────────────────────────────────────────
  // HOOKS DE NAVIGATION (SPA)
  // ──────────────────────────────────────────────
  function isGuestPage() {
    return window.location.pathname.includes('/portal/student/guest');
  }

  function waitAndInit() {
    document.body.classList.add('mye-clean-screen');

    const checkHeader = setInterval(() => {
      if (document.getElementById('mye-custom-header-wrapper') || document.getElementById('mye-custom-header')) {
        clearInterval(checkHeader);
        if (!document.getElementById('mye-guest-container')) {
          setTimeout(init, 200);
        }
      }
    }, 200);

    setTimeout(() => {
      clearInterval(checkHeader);
      if (!document.getElementById('mye-guest-container')) {
        init();
      }
    }, 5000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (isGuestPage()) waitAndInit();
    });
  } else {
    if (isGuestPage()) waitAndInit();
  }

  let lastUrl = window.location.href;
  setInterval(() => {
    if (lastUrl !== window.location.href) {
      lastUrl = window.location.href;

      if (isGuestPage()) {
        if (!document.getElementById('mye-guest-container')) {
          waitAndInit();
        }
      } else {
        const container = document.getElementById('mye-guest-container');
        if (container) container.remove();
        const hideStyle = document.getElementById('mye-guest-hide-style');
        if (hideStyle) hideStyle.remove();
      }
    }
  }, 300);

})();
