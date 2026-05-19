console.log("🚀 Extension MyEfrei v8 — Connexion");

// URLs des assets (scope global pour être accessibles partout)
const LOGO_URL     = chrome.runtime.getURL('img/logoEfrei.png');
const CAMPUS_URL   = chrome.runtime.getURL('img/Campus.png');
const TOURASSAS_URL = chrome.runtime.getURL('img/tourAssas.png');

// Injecter les variables CSS globales (nécessaire pour les pseudo-éléments ::after)
document.documentElement.style.setProperty('--tour-assas-url', `url('${TOURASSAS_URL}')`);

// Icones d'œil pour la visibilité du mot de passe
const EYE_OPEN = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
const EYE_CLOSED = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

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
      <div id="mye-password-wrapper">
        <input id="mye-password" type="password" placeholder="Mot de passe" autocomplete="current-password">
        <button id="mye-toggle-password" type="button" aria-label="Afficher le mot de passe">
          ${EYE_OPEN}
        </button>
      </div>
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

    const toggleBtn = document.getElementById('mye-toggle-password');
    const passwordInput = document.getElementById('mye-password');
    if (toggleBtn && passwordInput) {
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            toggleBtn.innerHTML = isPassword ? EYE_CLOSED : EYE_OPEN;
        });
    }
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
// Point d'entrée
// ──────────────────────────────────────────────
function tryBuild() {
    const host = window.location.hostname;
    // Condition de précaution si le script est injecté par erreur sur un autre domaine
    if (host.startsWith('auth.') || host === 'localhost' || host === '127.0.0.1') {
        if (document.querySelector('form')) {
            buildOverlay();
        } else {
            setTimeout(tryBuild, 300);
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryBuild);
} else {
    tryBuild();
}
