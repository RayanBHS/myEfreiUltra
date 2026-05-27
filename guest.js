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
        <div class="mye-guest-page-content">
          <!-- Header -->
          <div class="mye-guest-header-section">
            <h1 class="mye-guest-page-title">Compte Invité</h1>
            <p class="mye-guest-page-subtitle">Configurez un accès invité unique et restreint à votre compte étudiant</p>
          </div>

          <!-- Main Content Grid -->
          <div class="mye-guest-grid">
            <!-- Left Column: Info Card -->
            <div class="mye-guest-info-card">
              <div class="mye-guest-card-header">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                <h2>Description du service</h2>
              </div>

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

              <div class="mye-guest-divider"></div>

              <div class="mye-guest-access-title">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="9 11 12 14 22 4"></polyline>
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                </svg>
                <span>Écrans accessibles aux invités</span>
              </div>

              <div class="mye-guest-features-list">
                <div class="mye-guest-feature-item">
                  <div class="mye-guest-feature-icon blue">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                  </div>
                  <span>Notes et crédits</span>
                </div>
                <div class="mye-guest-feature-item">
                  <div class="mye-guest-feature-icon orange">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path><path d="M12 6v6l4 2"></path></svg>
                  </div>
                  <span>Absences</span>
                </div>
                <div class="mye-guest-feature-item">
                  <div class="mye-guest-feature-icon green">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  </div>
                  <span>Planning</span>
                </div>
                <div class="mye-guest-feature-item">
                  <div class="mye-guest-feature-icon purple">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                  </div>
                  <span>Bulletins, certificats et factures</span>
                </div>
              </div>
            </div>

            <!-- Right Column: Action Card -->
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
              <button class="mye-guest-create-btn" id="mye-guest-create-btn">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Créer un accès invité
              </button>
            </div>
          </div>

          <!-- Disclaimer -->
          <div class="mye-guest-disclaimer-card">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0; margin-top:2px;">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <p>En utilisant ce service, je suis informé et consens expressément à la création d'un compte « invité » permettant à des tiers l'accès à certaines informations des dossiers administratif et scolaire de l'étudiant. Toute communication de l'identifiant et du mot de passe (distincts de ceux de l'étudiant) autorisant l'accès à ce compte invité sera sous la responsabilité exclusive de l'étudiant. Je confirme vouloir créer un compte invité.</p>
          </div>
        </div>
      `;

      document.body.appendChild(container);

      // Inject Custom Popup HTML
      const popupHtml = `
        <div class="mye-guest-custom-popup-overlay" id="mye-guest-popup">
          <div class="mye-guest-custom-popup">
            <h3 class="mye-guest-popup-title">Création de compte invité</h3>
            <p class="mye-guest-popup-desc">Vous êtes sur le point de créer un accès invité.</p>
            <p class="mye-guest-popup-subdesc">En cliquant sur "Créer l'accès", vous recevrez instantanément un mot de passe qui sera généré automatiquement.</p>
            <div class="mye-guest-popup-actions">
              <button class="mye-guest-popup-btn mye-guest-popup-cancel" id="mye-guest-popup-cancel">ANNULER</button>
              <button class="mye-guest-popup-btn mye-guest-popup-confirm" id="mye-guest-popup-confirm">CRÉER L'ACCÈS</button>
            </div>
          </div>
        </div>
      `;
      container.insertAdjacentHTML('beforeend', popupHtml);
      
      const popupOverlay = document.getElementById('mye-guest-popup');
      const btnCancel = document.getElementById('mye-guest-popup-cancel');
      const btnConfirm = document.getElementById('mye-guest-popup-confirm');
      
      const createBtn = document.getElementById('mye-guest-create-btn');

      if (createBtn) {
        createBtn.addEventListener('click', () => {
          // 1. Ouvre notre jolie popup
          popupOverlay.classList.add('show');
          
          // 2. Clique sur le vrai bouton de la page pour forcer React à monter sa modal MUI invisible
          const origBtns = document.querySelectorAll('button, .MuiButtonBase-root');
          for (const btn of origBtns) {
            if (btn.id === 'mye-guest-create-btn') continue;
            if (btn.closest('#mye-guest-container')) continue;
            
            const text = (btn.textContent || '').toLowerCase().trim();
            if (text.includes('créer') || text.includes('générer') || text.includes('invité') || text.includes('gérer')) {
              btn.click();
              break;
            }
          }
        });
      }
      
      if (btnCancel) {
        btnCancel.addEventListener('click', () => {
          popupOverlay.classList.remove('show');
          
          // Fermer aussi la popup originale MUI si elle est ouverte
          const origCancelBtns = document.querySelectorAll('.MuiModal-root button');
          for (const btn of origCancelBtns) {
            if ((btn.textContent || '').toLowerCase().includes('annuler')) {
              btn.click();
              break;
            }
          }
        });
      }
      
      if (btnConfirm) {
        btnConfirm.addEventListener('click', () => {
          // Change text to loading state
          btnConfirm.textContent = 'CRÉATION...';
          btnConfirm.style.pointerEvents = 'none';
          
          // Chercher le bouton "Créer l'accès" dans la vraie popup MUI cachée
          const muiBtns = document.querySelectorAll('.MuiModal-root button');
          let clicked = false;
          
          for (const btn of muiBtns) {
            const text = (btn.textContent || '').toLowerCase();
            if (text.includes('créer')) {
              btn.click();
              clicked = true;
              break;
            }
          }
          
          if (!clicked) {
             console.error("Le bouton original MUI n'a pas été trouvé !");
             btnConfirm.textContent = 'ERREUR';
             setTimeout(() => {
                 btnConfirm.textContent = "CRÉER L'ACCÈS";
                 btnConfirm.style.pointerEvents = 'auto';
             }, 2000);
          } else {
             // Laisser React faire son travail, puis recharger pour afficher l'accès.
             setTimeout(() => {
               window.location.reload();
             }, 1500);
          }
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
    setTimeout(() => {
      if (!document.getElementById('mye-guest-container')) {
        init();
      } else {
        // Re-show if hidden
        document.body.classList.add('mye-clean-screen');
        document.getElementById('mye-guest-container').style.display = '';
      }
    }, 100);
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
        } else {
          document.body.classList.add('mye-clean-screen');
          document.getElementById('mye-guest-container').style.display = '';
        }
      } else {
        const container = document.getElementById('mye-guest-container');
        if (container) container.style.display = 'none';
      }
    }
  }, 500);

})();
