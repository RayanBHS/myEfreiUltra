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
  setter.call(input, value);
  input.dispatchEvent(new Event('input',  { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
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
// Point d'entrée
// ──────────────────────────────────────────────
function tryBuild() {
  if (!window.location.hostname.startsWith('auth.')) return;
  if (document.querySelector('form')) {
    buildOverlay();
  } else {
    setTimeout(tryBuild, 300);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', tryBuild);
} else {
  tryBuild();
}
