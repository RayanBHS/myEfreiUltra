console.log("🚀 Extension MyEfrei v8 — Final");

// URLs des assets (scope global pour être accessibles partout)
const LOGO_URL     = chrome.runtime.getURL('img/logoEfrei.png');
const CAMPUS_URL   = chrome.runtime.getURL('img/Campus.png');
const TOURASSAS_URL = chrome.runtime.getURL('img/tourAssas.png');

// Injecter les variables CSS globales (nécessaire pour les pseudo-éléments ::after)
document.documentElement.style.setProperty('--tour-assas-url', `url('${TOURASSAS_URL}')`);

// ──────────────────────────────────────────────
// Utilitaire React
// ──────────────────────────────────────────────
function setReactInputValue(input, value) {
    if (!input) return;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    if (setter) {
        setter.call(input, value);
        input.dispatchEvent(new Event('input',  { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
    }
}

// ──────────────────────────────────────────────
// HTML de l'interface principale
// ──────────────────────────────────────────────
function getMainHTML(errorMsg = '') {
    const originalImgEl = document.getElementById('background-image');
    const fallbackUrl   = (originalImgEl && originalImgEl.src)
        ? originalImgEl.src
        : 'https://auth.myefrei.fr/static/media/background.354e2a8d.jpg';

    return `
    <div id="mye-left">
      <img id="mye-bg-img"
        src="${CAMPUS_URL}"
        onerror="this.src='${fallbackUrl}'"
        alt="Campus Efrei">
    </div>
    <div id="mye-right">
      <img id="mye-logo"
        src="${LOGO_URL}"
        onerror="this.src='https://www.efrei.fr/wp-content/uploads/2022/01/LOGO_EFREI-PRINT_EFREI-WEB.png'"
        alt="Efrei">
      <h1 id="mye-title">Connexion</h1>
      <p id="mye-legal">
        En me connectant, j'accepte les
        <a href="https://www.myefrei.fr/public/sso/donnees-personnelles" target="_blank">conditions d'utilisations</a>
        du service SSO Efrei notamment en matière de données personnelles.
        Protection par reCAPTCHA ·
        <a href="https://policies.google.com/privacy" target="_blank">Confidentialité</a> ·
        <a href="https://policies.google.com/terms" target="_blank">Conditions</a>.
        Identifiants oubliés ? <a href="tel:+33188289250">Contactez-le +33 188 289 250</a>
      </p>
      <input id="mye-username" type="text"     placeholder="Identifiant"  autocomplete="username">
      <input id="mye-password" type="password" placeholder="Mot de passe" autocomplete="current-password">
      <button id="mye-submit" type="button">Se Connecter</button>
      ${errorMsg ? `<div id="mye-error-popup"><span id="mye-error-icon">⚠️</span>${errorMsg}</div>` : '<p id="mye-error"></p>'}
    </div>
  `;
}

// ──────────────────────────────────────────────
// Écran de chargement
// ──────────────────────────────────────────────
function showLoadingScreen() {
    const overlay = document.getElementById('myefrei-overlay');
    if (!overlay) return;
    overlay.innerHTML = `
    <div id="mye-loading">
      <img id="mye-loading-logo"
        src="${LOGO_URL}"
        onerror="this.src='https://www.efrei.fr/wp-content/uploads/2022/01/LOGO_EFREI-PRINT_EFREI-WEB.png'"
        alt="Efrei">
      <div id="mye-spinner"></div>
    </div>
  `;
}

// ──────────────────────────────────────────────
// Restaurer l'overlay avec un message d'erreur
// ──────────────────────────────────────────────
function restoreOverlayWithError(msg) {
    // Re-masquer le contenu original
    document.querySelectorAll('body > *:not(#myefrei-overlay)').forEach(el => {
        el.style.visibility = 'hidden';
    });

    const overlay = document.getElementById('myefrei-overlay');
    if (!overlay) return;

    overlay.innerHTML = getMainHTML(msg);
    attachFormEvents();
}

// ──────────────────────────────────────────────
// Gestion de la soumission
// ──────────────────────────────────────────────
function handleSubmit() {
    const login     = document.getElementById('mye-username').value.trim();
    const password  = document.getElementById('mye-password').value;

    if (!login || !password) {
        restoreOverlayWithError('Veuillez remplir tous les champs.');
        return;
    }

    const realUser = document.querySelector('form input[type="text"], form input:not([type="password"]):not([type="hidden"])');
    const realPass = document.querySelector('form input[type="password"]');
    const realBtn  = document.querySelector('form button[type="submit"], form button');

    setReactInputValue(realUser, login);
    setReactInputValue(realPass, password);

    // Afficher l'écran de chargement
    showLoadingScreen();

    // Rendre la page originale visible pour que le formulaire puisse soumettre
    document.querySelectorAll('body > *:not(#myefrei-overlay)').forEach(el => {
        el.style.visibility = '';
    });

    setTimeout(() => {
        if (realBtn) realBtn.click();

        // Si on est encore sur auth après 5s → les identifiants sont mauvais
        setTimeout(() => {
            if (window.location.hostname.startsWith('auth.')) {
                restoreOverlayWithError('Identifiant ou mot de passe incorrect.');
            }
        }, 5000);
    }, 200);
}

// ──────────────────────────────────────────────
// Attacher les événements au formulaire
// ──────────────────────────────────────────────
function attachFormEvents() {
    const submitBtn = document.getElementById('mye-submit');
    const overlay   = document.getElementById('myefrei-overlay');
    if (submitBtn) submitBtn.addEventListener('click', handleSubmit);
    if (overlay)   overlay.addEventListener('keydown', e => { if (e.key === 'Enter') handleSubmit(); });
}

// ──────────────────────────────────────────────
// Construction initiale de l'overlay
// ──────────────────────────────────────────────
function buildOverlay() {
    if (document.getElementById('myefrei-overlay')) return;
    if (!document.querySelector('form')) return;

    const overlay = document.createElement('div');
    overlay.id = 'myefrei-overlay';
    overlay.innerHTML = getMainHTML();
    document.body.appendChild(overlay);

    // Masquer le contenu original
    document.querySelectorAll('body > *:not(#myefrei-overlay)').forEach(el => {
        el.style.visibility = 'hidden';
    });

    attachFormEvents();
}

// ──────────────────────────────────────────────
// HEADER PERSONNALISÉ
// ──────────────────────────────────────────────
function getHeaderHTML() {
    return `
    <div id="mye-custom-header">
      <div class="mye-header-left">
        <a href="/portal/student/home">
          <img src="${LOGO_URL}" alt="Efrei" class="mye-logo" />
        </a>
      </div>
      <div class="mye-header-nav">
        <div class="mye-nav-item" data-target="link" data-href="/portal/student/planning">Planning</div>
        <div class="mye-nav-item mye-has-dropdown" data-target="mye-dropdown-scolarite">Scolarité</div>
        <div class="mye-nav-item mye-has-dropdown" data-target="mye-dropdown-ecole">L'École</div>
        <div class="mye-nav-item mye-has-dropdown" data-target="mye-dropdown-vie">Vie Étudiante</div>
        <div class="mye-nav-item mye-has-dropdown" data-target="mye-dropdown-outils">Outils</div>
        <div class="mye-nav-item mye-has-dropdown" data-target="mye-dropdown-stages">Stages et alternances</div>
        <div class="mye-nav-item mye-has-dropdown" data-target="mye-dropdown-aides">Aides</div>
      </div>
      <div class="mye-header-right">
        <!-- RECHERCHE : Juste l'icône loupe -->
        <div class="mye-icon-btn" id="mye-custom-search-btn"></div>
        
        <div class="mye-icon-btn" id="mye-custom-notif-btn"></div>
        <div class="mye-profile-pill" id="mye-profile-btn">
          <div class="mye-profile-info">
            <span class="mye-profile-first" id="mye-first-name">Prénom</span>
            <span class="mye-profile-last" id="mye-last-name">Nom</span>
          </div>
          <div class="mye-profile-avatar-container" id="mye-custom-avatar"></div>
        </div>
      </div>
    </div>

    <!-- Menus déroulants (Popups) -->
    <div class="mye-dropdown-menu" id="mye-dropdown-scolarite">
      <a href="/portal/student/grades" class="mye-dropdown-link">
         <span class="mye-link-icon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72l5 2.73 5-2.73v3.72z"/></svg></span>Notes
      </a>
      <a href="/portal/student/absences" class="mye-dropdown-link">
         <span class="mye-link-icon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg></span>Absences et retards
      </a>
      <a href="/portal/student/surveys" class="mye-dropdown-link">
         <span class="mye-link-icon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg></span>Répondre à mes enquêtes Efrei
      </a>
      <a href="https://www.myefrei.fr/portal/student/moodle-courses" class="mye-dropdown-link">
         <span class="mye-link-icon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg></span>Mes espaces Moodle
      </a>
      <a href="/portal/student/lxp" class="mye-dropdown-link">
         <span class="mye-link-icon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0011 15.9V19H7v2h10v-2h-4v-3.1a5.01 5.01 0 003.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"/></svg></span>Learning XP
      </a>
      <a href="/portal/student/documents" class="mye-dropdown-link">
         <span class="mye-link-icon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg></span>Mes documents
      </a>
    </div>
    <div class="mye-dropdown-menu" id="mye-dropdown-ecole">
      <a href="https://www.myefrei.fr/portal/common/news" class="mye-dropdown-link">
         <span class="mye-link-icon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-5 14H4v-4h11v4zm0-5H4V9h11v4zm5 5h-4V9h4v9z"/></svg></span>Actualités
      </a>
      <a href="https://www.myefrei.fr/portal/student/campus" class="mye-dropdown-link">
         <span class="mye-link-icon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></span>Nos campus
      </a>
      <a href="https://www.efrei-alumni.org/" class="mye-dropdown-link" target="_blank">
         <span class="mye-link-icon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></span>Efrei Alumni
      </a>
      <a href="https://internationalmobility.efrei.fr/" class="mye-dropdown-link" target="_blank">
         <span class="mye-link-icon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.91 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2 0 .68.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.9-4.33-3.56zm2.95-8H5.08c.96-1.66 2.49-2.93 4.33-3.56C8.81 5.55 8.35 6.75 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2 0-.68.07-1.35.16-2h4.68c.09.65.16 1.32.16 2 0 .68-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95c-.96 1.65-2.49 2.93-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2 0-.68-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z"/></svg></span>Portail international
      </a>
      <a href="https://www.myefrei.fr/portal/student/available-rooms" class="mye-dropdown-link">
         <span class="mye-link-icon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 19V4h-4V3H5v16H3v2h12V6h2v15h4v-2h-2zm-6 0H7V5h6v14zm-3-8h2v2h-2z"/></svg></span>Salles de cours libres
      </a>
    </div>
    <div class="mye-dropdown-menu" id="mye-dropdown-vie">
      <a href="https://www.myefrei.fr/portal/common/calendars" class="mye-dropdown-link">
         <span class="mye-link-icon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/></svg></span>Calendriers
      </a>
      <a href="https://www.myefrei.fr/portal/common/resources/categories/65ae98ef1211ad59481ac7a5" class="mye-dropdown-link">
         <span class="mye-link-icon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2.85 11.1l-.85.6V16h-4v-1.3l-.85-.6C7.8 13.16 7 11.18 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 2.18-.8 4.16-2.15 5.1z"/></svg></span>Innovation LAB
      </a>
      <a href="https://auth.glyps.fr/realms/prod/protocol/openid-connect/auth?client_id=efrei-student&redirect_uri=https://efrei.glyps.fr/portal&state=106e9b6c-dc07-4030-95b7-35407100b6ea&response_mode=fragment&response_type=code&scope=openid&nonce=2a6f7784-2d43-4a74-93e0-7aca5b0fa0a4&code_challenge=eNdIiuxxLZsvXFh-wB662ADhsKBulmLehLjDRliHFCc&code_challenge_method=S256" class="mye-dropdown-link" target="_blank">
         <span class="mye-link-icon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg></span>Plateforme des Associations (Glyps)
      </a>
      <a href="https://www.myefrei.fr/portal/common/resources/categories/67e12844821661185dde6c01" class="mye-dropdown-link">
         <span class="mye-link-icon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z"/></svg></span>Bons Plans
      </a>
    </div>
    <div class="mye-dropdown-menu" id="mye-dropdown-outils">
      <a href="https://teams.microsoft.com/" class="mye-dropdown-link" target="_blank">
        <span class="mye-link-icon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2v20c5.523 0 10-4.477 10-10S17.523 2 12 2z"/></svg></span>Teams
      </a>
      <a href="https://moodle.myefrei.fr/my/" class="mye-dropdown-link" target="_blank">
        <span class="mye-link-icon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg></span>Moodle
      </a>
      <a href="https://www.office.com/?auth=2" class="mye-dropdown-link" target="_blank">
        <span class="mye-link-icon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h8v8H3zM3 13h8v8H3zM13 3h8v8h-8zM13 13h8v8h-8z"/></svg></span>Office 365
      </a>
      <a href="https://app.sowesign.com/login" class="mye-dropdown-link" target="_blank">
        <span class="mye-link-icon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg></span>SoWeSign
      </a>
      <a href="https://univ.scholarvox.com/" class="mye-dropdown-link" target="_blank">
        <span class="mye-link-icon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72l5 2.73 5-2.73v3.72z"/></svg></span>Scholarvox
      </a>
      <a href="https://efrei.studapart.com/" class="mye-dropdown-link" target="_blank">
        <span class="mye-link-icon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z"/></svg></span>Studapart
      </a>
      <a href="https://www.myefrei.fr/public/mobile/telechargement" class="mye-dropdown-link" target="_blank">
        <span class="mye-link-icon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14zm-4-15h-2V3h2v1z"/></svg></span>Application myEfrei
      </a>
    </div>
    <div class="mye-dropdown-menu" id="mye-dropdown-stages">
      <a href="https://www.izia-efrei.com/login" class="mye-dropdown-link" target="_blank">
        <span class="mye-link-icon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg></span>Izia by Efrei
      </a>
      <a href="https://online.goinglobal.com/?0=ip_login_no_cache%3D9f8c7c095da7645fe4391123d2aa74d0" class="mye-dropdown-link" target="_blank">
        <span class="mye-link-icon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.91 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2 0 .68.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.9-4.33-3.56zm2.95-8H5.08c.96-1.66 2.49-2.93 4.33-3.56C8.81 5.55 8.35 6.75 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2 0-.68.07-1.35.16-2h4.68c.09.65.16 1.32.16 2 0 .68-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95c-.96 1.65-2.49 2.93-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2 0-.68-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z"/></svg></span>GoinGlobal
      </a>
    </div>
    <div class="mye-dropdown-menu" id="mye-dropdown-aides">
      <a href="https://www.myefrei.fr/portal/common/resources" class="mye-dropdown-link">
        <span class="mye-link-icon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg></span>Ressources
      </a>
      <a href="https://www.myefrei.fr/portal/student/contacts" class="mye-dropdown-link">
        <span class="mye-link-icon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg></span>Contacts
      </a>
      <a href="https://assas-universite.signalement.net/entreprises" class="mye-dropdown-link" target="_blank">
        <span class="mye-link-icon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg></span>#ReagirAssas
      </a>
      <a href="https://my.medaviz.io/onboarding/organization/efrei" class="mye-dropdown-link" target="_blank">
        <span class="mye-link-icon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-1.99.9-1.99 2L3 19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 11h-4v4h-4v-4H6v-4h4V6h4v4h4v4z"/></svg></span>Plateforme de Soin (Medaviz)
      </a>
      <a href="https://efreiparis.myfreshworks.com/login?client_id=134315043955409715&redirect_uri=https://efreiparis.freshservice.com/freshid/authorize_callback?hd%3Dservices.efrei.fr&account_id=616282803414392709" class="mye-dropdown-link" target="_blank">
        <span class="mye-link-icon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.22C21 6.73 16.74 3 12 3c-4.69 0-9 3.65-9 9.28C2.4 12.62 2 13.26 2 14v2c0 1.1.9 2 2 2h1v-6.1c0-3.87 3.13-7 7-7s7 3.13 7 7V19h-8v2h8c1.1 0 2-.9 2-2v-1.22c.59-.31 1-.92 1-1.64v-2.3c0-.7-.41-1.31-1-1.62z"/></svg></span>Incidents et Demandes
      </a>
    </div>
  `;
}

function initCustomHeaderEvents() {
    // Navigation clics simples
    document.querySelectorAll('.mye-nav-item[data-target="link"]').forEach(item => {
        item.addEventListener('click', () => {
            window.location.href = item.getAttribute('data-href');
        });
    });

    // Menus déroulants (pour le header)
    document.querySelectorAll('.mye-nav-item.mye-has-dropdown').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const targetId = item.getAttribute('data-target');
            const menu = document.getElementById(targetId);

            // Fermer les autres
            document.querySelectorAll('.mye-dropdown-menu').forEach(m => {
                if (m !== menu) m.classList.remove('show');
            });
            document.querySelectorAll('.mye-nav-item, .searchBar').forEach(nav => {
                if (nav !== item) {
                    nav.classList.remove('active');
                    if (nav.classList.contains('searchBar')) nav.classList.remove('mye-search-active');
                }
            });

            // Toggle
            menu.classList.toggle('show');
            item.classList.toggle('active');

            // Positionnement sous le bouton
            if (menu.classList.contains('show')) {
                const rect = item.getBoundingClientRect();
                menu.style.left = `${rect.left + (rect.width / 2)}px`;
                menu.style.top = '60px'; // Sous le header
            }
        });
    });

    // Fermer les dropdowns quand on clique ailleurs
    document.addEventListener('click', (e) => {
        // Fermer les popups de menu
        document.querySelectorAll('.mye-nav-item').forEach(nav => nav.classList.remove('active'));
        document.querySelectorAll('.mye-dropdown-menu').forEach(menu => menu.classList.remove('show'));

        // Fermer la barre de recherche d'origine CSS-teleportée si on clique ailleurs
        const origSearchBar = document.querySelector('.searchBar');
        if (origSearchBar && origSearchBar.classList.contains('mye-search-active')) {
            if (!origSearchBar.contains(e.target) && e.target.id !== 'mye-custom-search-btn' && !e.target.closest('#mye-custom-search-btn')) {
                origSearchBar.classList.remove('mye-search-active');
                const searchBtn = document.getElementById('mye-custom-search-btn');
                if(searchBtn) searchBtn.classList.remove('active');
            }
        }
    });

    // Clic sur l'icône de recherche : Ouvre la VRAIE barre de recherche
    const searchBtn = document.getElementById('mye-custom-search-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const origSearchBar = document.querySelector('.searchBar');
            if (origSearchBar) {
                const isActive = origSearchBar.classList.toggle('mye-search-active');
                if (isActive) {
                    searchBtn.classList.add('active');
                    // Fermer les autres menus
                    document.querySelectorAll('.mye-dropdown-menu').forEach(m => m.classList.remove('show'));

                    // Positionnement dynamique : utiliser Fixed
                    const rect = searchBtn.getBoundingClientRect();
                    const searchWidth = 550; // Plus large (550px au lieu de 450px)

                    // On applique le style via setProperty pour forcer le !important avec JS, ou on laisse le CSS le faire.
                    origSearchBar.style.setProperty('position', 'fixed', 'important');
                    origSearchBar.style.setProperty('top', '70px', 'important');
                    origSearchBar.style.setProperty('width', `${searchWidth}px`, 'important');
                    // Aligner le bord droit de la recherche avec le bord droit de l'icône
                    origSearchBar.style.setProperty('left', `${rect.right - searchWidth}px`, 'important');
                    origSearchBar.style.setProperty('z-index', '2147483648', 'important');

                    // Focus l'input de la vraie barre
                    const origInput = origSearchBar.querySelector('input');
                    if (origInput) setTimeout(() => origInput.focus(), 50);
                } else {
                    searchBtn.classList.remove('active');
                }
            }
        });
    }

    // Tâche de fond pour forcer la position des résultats de recherche sous la barre
    // Ceci contrecarre la logique de Popper.js d'Efrei qui se perd quand on met en position fixed
    setInterval(() => {
        const origSearchBar = document.querySelector('.searchBar.mye-search-active');
        const popper = document.querySelector('.MuiAutocomplete-popper');
        if (origSearchBar && popper) {
            const rect = origSearchBar.getBoundingClientRect();
            // On force Popper à s'afficher exactement sous notre barre
            popper.style.setProperty('position', 'fixed', 'important');
            popper.style.setProperty('top', `${rect.bottom + 5}px`, 'important');
            popper.style.setProperty('left', `${rect.left}px`, 'important');
            popper.style.setProperty('width', `${rect.width}px`, 'important');
            popper.style.setProperty('transform', 'none', 'important');
        }
    }, 50);

    // Procuration de clics pour les Notifications
    document.getElementById('mye-custom-notif-btn').addEventListener('click', () => {
        let origNotifBtn = document.querySelector('button[aria-controls="simple-popper-efrei"]');
        if (!origNotifBtn) {
            origNotifBtn = document.querySelector('button[aria-label*="notif"], button[aria-label*="bell"]');
        }
        if (origNotifBtn) origNotifBtn.click();
    });

    // Procuration de clics pour le Profil
    document.getElementById('mye-profile-btn').addEventListener('click', () => {
        let origProfileBtn = document.querySelector('.MuiAvatar-root');
        if (!origProfileBtn) {
            origProfileBtn = document.querySelector('div[data-tutorial="profile"]');
        }

        if (origProfileBtn) {
            origProfileBtn.click();
        } else {
            console.error("Bouton de profil original introuvable.");
        }
    });
}

function extractOriginalAssets() {
    const fallbackNotif = `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"/></svg>`;
    const fallbackAvatar = `<svg viewBox="0 0 24 24" width="35" height="35" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`;
    const fallbackSearchIcon = `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>`;

    const notifContainer = document.getElementById('mye-custom-notif-btn');
    if (notifContainer && notifContainer.innerHTML === '') notifContainer.innerHTML = fallbackNotif;

    const searchContainer = document.getElementById('mye-custom-search-btn');
    if (searchContainer && searchContainer.innerHTML === '') searchContainer.innerHTML = fallbackSearchIcon;

    const avatarContainer = document.getElementById('mye-custom-avatar');
    if (avatarContainer && avatarContainer.innerHTML === '') {
        const origAvatarImg = document.querySelector('app-user-avatar img, .user-avatar-container img, [alt*="avatar"], [src*="avatar"]');
        if (origAvatarImg && origAvatarImg.src) {
            const img = document.createElement('img');
            img.src = origAvatarImg.src;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.borderRadius = '50%';
            img.style.objectFit = 'cover';
            avatarContainer.appendChild(img);
        } else {
            avatarContainer.innerHTML = fallbackAvatar;
        }
    }

    // Tâche légère pour récupérer le nom généré tardivement par React
    let nameAttempts = 0;
    const checkName = setInterval(() => {
        nameAttempts++;
        const nameEl = document.querySelector('h6[role="userName"]');
        if (nameEl && nameEl.innerText.trim()) {
            const parts = nameEl.innerText.trim().split(' ');
            const firstName = parts[0] || '';
            const lastName = parts.slice(1).join(' ') || '';

            const myeFirstNameEl = document.getElementById('mye-first-name');
            const myeLastNameEl = document.getElementById('mye-last-name');

            if (myeFirstNameEl) myeFirstNameEl.innerText = firstName;
            if (myeLastNameEl) myeLastNameEl.innerText = lastName;

            clearInterval(checkName);
        }
        // On arrête après 3 secondes (30 * 100ms) pour ne pas ralentir le navigateur
        if (nameAttempts > 30) clearInterval(checkName);
    }, 100);
}

function injectCustomHeader() {
    if (document.getElementById('mye-custom-header-wrapper')) return;

    const wrapper = document.createElement('div');
    wrapper.id = 'mye-custom-header-wrapper';
    wrapper.innerHTML = getHeaderHTML();
    document.body.prepend(wrapper);

    initCustomHeaderEvents();

    // Masquer le header original
    const style = document.createElement('style');
    style.innerHTML = `
    /* On cache le header d'origine mais en le laissant fonctionnel */
    app-header, .app-header, header, 
    mat-toolbar, .mat-toolbar, nav.top-nav, .top-bar,
    .mat-tab-nav-panel {
      position: absolute !important;
      top: -9999px !important;
      left: -9999px !important;
      visibility: hidden !important; 
      transform: none !important;
    }
    body {
      margin: 0;
      padding-top: 0;
    }
    app-student-home {
      display: none !important;
    }
  `;
    document.head.appendChild(style);

    // Extraire les avatars et icones statiques
    extractOriginalAssets();
}

// ──────────────────────────────────────────────
// Point d'entrée
// ──────────────────────────────────────────────
function tryBuild() {
    const host = window.location.hostname;

    if (host.startsWith('auth.')) {
        if (document.querySelector('form')) {
            buildOverlay();
        } else {
            setTimeout(tryBuild, 300);
        }
    } else if (host === 'www.myefrei.fr') {
        // Injecter le header personnalisé sur toutes les pages du portail
        injectCustomHeader();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryBuild);
} else {
    tryBuild();
}
