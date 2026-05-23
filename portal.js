console.log("🚀 Extension MyEfrei v8 — Portail");

// INITIALISATION DU THEME (OLED Black Dark Mode)
const savedTheme = localStorage.getItem('mye-theme') || 'light';
if (savedTheme === 'dark') {
  document.documentElement.classList.add('dark-mode');
  if(document.body) document.body.classList.add('dark-mode');
  else document.addEventListener('DOMContentLoaded', () => document.body.classList.add('dark-mode'));
}

// URLs des assets (scope global pour être accessibles partout)
const LOGO_URL = chrome.runtime.getURL('img/logoEfrei.png');
const LOGO_MYEFREI_URL = chrome.runtime.getURL('img/logoMyEfrei.png');
const TOUR_ASSAS_URL = chrome.runtime.getURL('img/tourAssas.png');

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
        <div class="mye-profile-pill mye-has-dropdown" id="mye-profile-btn" data-target="mye-dropdown-profile">
          <div class="mye-profile-info">
            <span class="mye-profile-first" id="mye-first-name">Prénom</span>
            <span class="mye-profile-last" id="mye-last-name">Nom</span>
          </div>
          <div class="mye-profile-avatar-container" id="mye-custom-avatar"></div>
        </div>
        <div class="mye-hamburger-btn" id="mye-hamburger-btn">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
 
    <!-- Menus déroulants (Popups) -->
    <div class="mye-dropdown-menu" id="mye-dropdown-scolarite">
      <a href="/portal/student/grades" class="mye-dropdown-link">
         <span class="mye-link-icon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72l5 2.73 5-2.73v-3.72z"/></svg></span>Notes
      </a>
      <a href="/portal/student/absences" class="mye-dropdown-link">
         <span class="mye-link-icon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg></span>Absences et retards
      </a>
      <a href="https://efrei.bluera.com/efrei/" class="mye-dropdown-link" target="_blank">
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
    <div class="mye-dropdown-menu" id="mye-dropdown-profile">
      <div class="mye-dropdown-link mye-theme-toggle-container" id="mye-theme-toggle" style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;">
        <div style="display:flex; align-items:center;">
          <span class="mye-link-icon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3a9 9 0 109 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 01-4.4 2.26 5.403 5.403 0 01-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/></svg></span>
          Mode Sombre
        </div>
        <div class="mye-switch ${localStorage.getItem('mye-theme') === 'dark' ? 'active' : ''}" id="mye-theme-switch"></div>
      </div>
      <div class="mye-dropdown-link" style="cursor:pointer;" id="mye-desk-account">
        <span class="mye-link-icon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></span>Gérer mon compte
      </div>
      <div class="mye-dropdown-link" style="cursor:pointer; color: #ff3b30;" id="mye-desk-logout">
        <span class="mye-link-icon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg></span>Se déconnecter
      </div>
    </div>
 
    <!-- Tiroir Mobile (Drawer) -->
    <div id="mye-mobile-drawer" class="mye-mobile-drawer">
      <div class="mye-drawer-header">
        <button class="mye-drawer-close" id="mye-drawer-close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
      
      <!-- Section profil transformée en accordéon pour mobile -->
      <div class="mye-drawer-collapsible">
        <div class="mye-drawer-profile mye-drawer-trigger" id="mye-drawer-profile-btn">
          <div class="mye-drawer-avatar" id="mye-drawer-avatar"></div>
          <span class="mye-drawer-name" id="mye-drawer-name">Prénom Nom</span>
          <svg class="mye-chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </div>
        <div class="mye-drawer-submenu">
          <div class="mye-drawer-subitem" style="cursor:pointer;" id="mye-mob-account">Gérer mon compte</div>
          <div class="mye-drawer-subitem" style="cursor:pointer;" id="mye-mob-logout">Se déconnecter</div>
        </div>
      </div>
      
      <div class="mye-drawer-nav">
        <!-- Accueil -->
        <a href="/portal/student/home" class="mye-drawer-item mye-drawer-active">Accueil</a>
        
        <!-- Planning -->
        <a href="/portal/student/planning" class="mye-drawer-item">Planning</a>
        
        <!-- Scolarité (Collapsible) -->
        <div class="mye-drawer-collapsible">
          <div class="mye-drawer-item mye-drawer-trigger">
            <span>Scolarité</span>
            <svg class="mye-chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>
          <div class="mye-drawer-submenu">
            <a href="/portal/student/grades" class="mye-drawer-subitem">Notes</a>
            <a href="/portal/student/absences" class="mye-drawer-subitem">Absences et retards</a>
            <a href="https://efrei.bluera.com/efrei/" class="mye-drawer-subitem" target="_blank">Répondre à mes enquêtes Efrei</a>
            <a href="https://www.myefrei.fr/portal/student/moodle-courses" class="mye-drawer-subitem">Mes espaces Moodle</a>
            <a href="/portal/student/lxp" class="mye-drawer-subitem">Learning XP</a>
            <a href="/portal/student/documents" class="mye-drawer-subitem">Mes documents</a>
          </div>
        </div>
        
        <!-- L'École (Collapsible) -->
        <div class="mye-drawer-collapsible">
          <div class="mye-drawer-item mye-drawer-trigger">
            <span>L'école</span>
            <svg class="mye-chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>
          <div class="mye-drawer-submenu">
            <a href="https://www.myefrei.fr/portal/common/news" class="mye-drawer-subitem">Actualités</a>
            <a href="https://www.myefrei.fr/portal/student/campus" class="mye-drawer-subitem">Nos campus</a>
            <a href="https://www.efrei-alumni.org/" class="mye-drawer-subitem" target="_blank">Efrei Alumni</a>
            <a href="https://internationalmobility.efrei.fr/" class="mye-drawer-subitem" target="_blank">Portail international</a>
            <a href="https://www.myefrei.fr/portal/student/available-rooms" class="mye-drawer-subitem">Salles de cours libres</a>
          </div>
        </div>
        
        <!-- Vie étudiante (Collapsible) -->
        <div class="mye-drawer-collapsible">
          <div class="mye-drawer-item mye-drawer-trigger">
            <span>Vie étudiante</span>
            <svg class="mye-chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>
          <div class="mye-drawer-submenu">
            <a href="https://www.myefrei.fr/portal/common/calendars" class="mye-drawer-subitem">Calendriers</a>
            <a href="https://www.myefrei.fr/portal/common/resources/categories/65ae98ef1211ad59481ac7a5" class="mye-drawer-subitem">Innovation LAB</a>
            <a href="https://efrei.glyps.fr/portal" class="mye-drawer-subitem" target="_blank">Plateforme des Associations (Glyps)</a>
            <a href="https://www.myefrei.fr/portal/common/resources/categories/67e12844821661185dde6c01" class="mye-drawer-subitem">Bons Plans</a>
          </div>
        </div>
        
        <!-- Outils (Collapsible) -->
        <div class="mye-drawer-collapsible">
          <div class="mye-drawer-item mye-drawer-trigger">
            <span>Outils</span>
            <svg class="mye-chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>
          <div class="mye-drawer-submenu">
            <a href="https://teams.microsoft.com/" class="mye-drawer-subitem" target="_blank">Teams</a>
            <a href="https://moodle.myefrei.fr/my/" class="mye-drawer-subitem" target="_blank">Moodle</a>
            <a href="https://www.office.com/?auth=2" class="mye-drawer-subitem" target="_blank">Office 365</a>
            <a href="https://app.sowesign.com/login" class="mye-drawer-subitem" target="_blank">SoWeSign</a>
            <a href="https://univ.scholarvox.com/" class="mye-drawer-subitem" target="_blank">Scholarvox</a>
            <a href="https://efrei.studapart.com/" class="mye-drawer-subitem" target="_blank">Studapart</a>
            <a href="https://www.myefrei.fr/public/mobile/telechargement" class="mye-drawer-subitem" target="_blank">Application myEfrei</a>
          </div>
        </div>
        
        <!-- Stages et alternances (Collapsible) -->
        <div class="mye-drawer-collapsible">
          <div class="mye-drawer-item mye-drawer-trigger">
            <span>Stages et alternances</span>
            <svg class="mye-chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>
          <div class="mye-drawer-submenu">
            <a href="https://www.izia-efrei.com/login" class="mye-drawer-subitem" target="_blank">Izia by Efrei</a>
            <a href="https://online.goinglobal.com/?0=ip_login_no_cache%3D9f8c7c095da7645fe4391123d2aa74d0" class="mye-drawer-subitem" target="_blank">GoinGlobal</a>
          </div>
        </div>
        
        <!-- Aides (Collapsible) -->
        <div class="mye-drawer-collapsible">
          <div class="mye-drawer-item mye-drawer-trigger">
            <span>Aides</span>
            <svg class="mye-chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>
          <div class="mye-drawer-submenu">
            <a href="https://www.myefrei.fr/portal/common/resources" class="mye-drawer-subitem">Ressources</a>
            <a href="https://www.myefrei.fr/portal/student/contacts" class="mye-drawer-subitem">Contacts</a>
            <a href="https://assas-universite.signalement.net/entreprises" class="mye-drawer-subitem" target="_blank">#ReagirAssas</a>
            <a href="https://my.medaviz.io/onboarding/organization/efrei" class="mye-drawer-subitem" target="_blank">Plateforme de Soin (Medaviz)</a>
            <a href="https://efreiparis.myfreshworks.com/login" class="mye-drawer-subitem" target="_blank">Incidents et Demandes</a>
          </div>
        </div>
        
        <!-- SI Scolarité Neo -->
        <a href="/portal/student/neo" class="mye-drawer-item">SI Scolarité Neo</a>
      </div>
    </div>
 
    <!-- Arrière-plan transparent sombre pour le tiroir -->
    <div id="mye-drawer-overlay" class="mye-drawer-overlay"></div>
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
    document.querySelectorAll('.mye-has-dropdown').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const targetId = item.getAttribute('data-target');
            const menu = document.getElementById(targetId);

            // Fermer les autres
            document.querySelectorAll('.mye-dropdown-menu').forEach(m => {
                if (m !== menu) m.classList.remove('show');
            });
            document.querySelectorAll('.mye-nav-item, .mye-profile-pill, .searchBar').forEach(nav => {
                if (nav !== item) {
                    nav.classList.remove('active');
                    if (nav.classList.contains('searchBar')) nav.classList.remove('mye-search-active');
                }
            });
            // Toggle
            menu.classList.toggle('show');
            item.classList.toggle('active');
        });
        
        // Empêcher la propagation si on clique dans le menu pour ne pas le fermer accidentellement
        const targetId = item.getAttribute('data-target');
        const menu = document.getElementById(targetId);
        if (menu) {
            menu.addEventListener('click', (ev) => ev.stopPropagation());
        }
    });

    // Fermer les dropdowns quand on clique ailleurs
    document.addEventListener('click', (e) => {
        // Fermer les popups de menu
        document.querySelectorAll('.mye-nav-item, .mye-profile-pill').forEach(nav => nav.classList.remove('active'));
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

    // Fonction sécurisée pour trouver les boutons du header
    const findOriginalHeaderButton = (selectors) => {
        let found = null;
        document.querySelectorAll(selectors).forEach(el => {
            // On ignore tout ce qui est dans le contenu principal des notes ou du dashboard
            if (!found && !el.closest('app-student-grades') && !el.closest('#mye-grades-container') && !el.closest('app-student-home')) {
                found = el;
            }
        });
        // Si on n'a rien trouvé, on prend le premier (comportement par défaut)
        if (!found) found = document.querySelector(selectors);
        return found;
    };

    // Clic sur l'icône de recherche : Ouvre la VRAIE barre de recherche
    const searchBtn = document.getElementById('mye-custom-search-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const origSearchBar = findOriginalHeaderButton('.searchBar');
            if (origSearchBar) {
                const isActive = origSearchBar.classList.toggle('mye-search-active');
                if (isActive) {
                    searchBtn.classList.add('active');
                    // Fermer les autres menus
                    document.querySelectorAll('.mye-dropdown-menu').forEach(m => m.classList.remove('show'));

                    // Positionnement dynamique : utiliser Fixed
                    const rect = searchBtn.getBoundingClientRect();
                    const searchWidth = 550; // Plus large (550px au lieu de 450px)

                    // On applique le style via setProperty pour forcer le !important avec JS
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
    // et repositionner les popups de notification/profil près des boutons custom
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

        // Repositionner les popovers MUI ou Angular (profil) près du bouton profil custom
        // On cible spécifiquement role="dropDownMenu" pour ne pas capturer l'autocomplete de la barre de recherche !
        document.querySelectorAll('.MuiPopover-root, .cdk-overlay-pane, .MuiPopperUnstyled-root[role="dropDownMenu"]').forEach(popover => {
            // Ignorer l'autocomplete de la recherche si jamais il est intercepté
            if (popover.querySelector('[role="listbox"]') || popover.classList.contains('MuiAutocomplete-popper')) return;

            const paper = popover.querySelector('.MuiPopover-paper, .MuiPaper-root, .mat-menu-panel') || popover;
            if (paper && popover.style.display !== 'none' && popover.style.visibility !== 'hidden') {
                const customProfileBtn = document.getElementById('mye-profile-btn');
                if (customProfileBtn) {
                    const btnRect = customProfileBtn.getBoundingClientRect();
                    const paperWidth = paper.offsetWidth || 200;
                    
                    // Transmettre les coordonnées à nos variables CSS protégées au lieu du style en ligne
                    document.body.style.setProperty('--mye-profile-top', `${btnRect.bottom}px`);
                    document.body.style.setProperty('--mye-profile-left', `${Math.max(10, btnRect.right - paperWidth)}px`);
                    
                    // Optionnel: On peut garder le z-index en ligne au cas où, mais le CSS gère le reste
                    popover.style.setProperty('z-index', '2147483649', 'important');
                }
            }
        });

        // Repositionner le menu de notifications
        const notifPopper = document.getElementById('simple-popper-efrei');
        if (notifPopper && notifPopper.style.display !== 'none') {
            const customNotifBtn = document.getElementById('mye-custom-notif-btn');
            if (customNotifBtn) {
                const btnRect = customNotifBtn.getBoundingClientRect();
                
                // Transmettre les coordonnées aux variables CSS protégées
                document.body.style.setProperty('--mye-notif-top', `${btnRect.bottom}px`);
                document.body.style.setProperty('--mye-notif-left', `${btnRect.left - 150}px`);
                
                notifPopper.style.setProperty('z-index', '2147483649', 'important');
            }
        }
    }, 50);

    // Procuration de clics pour les Notifications
    const notifBtn = document.getElementById('mye-custom-notif-btn');
    if (notifBtn) {
        notifBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            let origNotifBtn = findOriginalHeaderButton('button[aria-controls="simple-popper-efrei"]');
            if (!origNotifBtn) {
                origNotifBtn = findOriginalHeaderButton('button[aria-label*="notif"], button[aria-label*="bell"]');
            }
            if (origNotifBtn) {
                const event = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
                origNotifBtn.dispatchEvent(event);
            }
        });
    }

    // Procuration de clics pour le Profil (bureau)
    const triggerOriginalProfileClick = () => {
        // Le HTML d'Efrei utilise aria-labelledby="composition-button" pour le menu profil
        let clickTarget = document.getElementById('composition-button') || document.querySelector('div[data-tutorial="profile"]');
        
        if (!clickTarget) {
            const nameEl = document.querySelector('h6[role="userName"]');
            if (nameEl) {
                clickTarget = nameEl.closest('button, .MuiButtonBase-root, .MuiIconButton-root, div[role="button"], [role="dropDownMenu"]') || nameEl.parentElement;
            }
        }
        
        if (!clickTarget) {
            const avatar = document.querySelector('.MuiAvatar-root, app-user-avatar, .user-avatar-container, img[alt*="avatar"]');
            if (avatar) {
                clickTarget = avatar.closest('button, .MuiButtonBase-root, .MuiIconButton-root, div[role="button"], [role="dropDownMenu"]') || avatar;
            }
        }

        if (clickTarget) {
            // Un SEUL événement propre, sans toucher à la visibilité pour ne pas déclencher la fermeture automatique de React
            const event = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
            clickTarget.dispatchEvent(event);
        } else {
            console.error("Bouton de profil original introuvable.");
        }
    };

    // Retrait de triggerOriginalProfileClick() sur profileBtn, géré via mye-has-dropdown

    // TIROIR MOBILE (DRAWER) ÉVÉNEMENTS
    const hamburgerBtn = document.getElementById('mye-hamburger-btn');
    const mobileDrawer = document.getElementById('mye-mobile-drawer');
    const drawerOverlay = document.getElementById('mye-drawer-overlay');
    const drawerClose = document.getElementById('mye-drawer-close');

    if (hamburgerBtn && mobileDrawer && drawerOverlay) {
        hamburgerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            mobileDrawer.classList.add('active');
            drawerOverlay.classList.add('active');
        });
    }

    const closeDrawer = () => {
        if (mobileDrawer) mobileDrawer.classList.remove('active');
        if (drawerOverlay) drawerOverlay.classList.remove('active');
    };

    if (drawerClose) drawerClose.addEventListener('click', closeDrawer);
    if (drawerOverlay) drawerOverlay.addEventListener('click', closeDrawer);

    // Accordéons (Collapsible triggers) dans le tiroir mobile
    document.querySelectorAll('.mye-drawer-trigger').forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const collapsible = trigger.closest('.mye-drawer-collapsible');
            if (collapsible) {
                // Fermer les autres accordéons
                document.querySelectorAll('.mye-drawer-collapsible').forEach(c => {
                    if (c !== collapsible) c.classList.remove('expanded');
                });
                // Toggle l'actuel
                collapsible.classList.toggle('expanded');
            }
        });
    });

    // Clic procuration pour les boutons du sous-menu profil mobile
    const clickOriginalByText = (searchText) => {
        // Le bouton de déconnexion d'Efrei a souvent l'attribut role="logoutButton"
        if (searchText.toLowerCase().includes("déconnecter")) {
            const logoutBtn = document.querySelector('[role="logoutButton"]');
            if (logoutBtn) {
                logoutBtn.click();
                return;
            }
        }
        
        // Pour "Gérer mon compte", le texte varie (invité, étudiant, profil...)
        // On cible le premier élément du menu de profil qui est généralement le lien du compte
        if (searchText.toLowerCase().includes("compte")) {
            const profileMenu = document.querySelector('[role="profileMenu"]');
            if (profileMenu) {
                const firstItem = profileMenu.querySelector('[role="menuitem"], .MuiMenuItem-root');
                if (firstItem) {
                    firstItem.click();
                    return;
                }
            }
        }

        const elements = document.querySelectorAll('span, p, h6, a, div, li');
        for (const el of elements) {
            // Ignorer le DOM trop haut pour éviter des correspondances accidentelles
            if (el.children.length > 2) continue;

            if (el.textContent.trim().toLowerCase().includes(searchText.toLowerCase())) {
                // Ignorer les éléments qui font partie de notre extension
                if (el.closest('#mye-custom-header-wrapper')) continue;
                
                const btn = el.closest('button, [role="button"], .MuiButtonBase-root, .MuiMenuItem-root, [role="logoutButton"], [role="menuitem"]') || el;
                btn.click();
                return;
            }
        }
        console.error("Option originale non trouvée pour :", searchText);
    };

    // Theme toggle
    const themeToggleBtn = document.getElementById('mye-theme-toggle');
    const themeSwitch = document.getElementById('mye-theme-switch');
    if (themeToggleBtn && themeSwitch) {
        themeToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isDark = document.body.classList.toggle('dark-mode');
            document.documentElement.classList.toggle('dark-mode', isDark);
            themeSwitch.classList.toggle('active', isDark);
            localStorage.setItem('mye-theme', isDark ? 'dark' : 'light');
        });
    }

    // Gérer mon compte / Se déconnecter (bureau)
    const deskAccountBtn = document.getElementById('mye-desk-account');
    if (deskAccountBtn) {
        deskAccountBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('mye-dropdown-profile').classList.remove('show');
            triggerOriginalProfileClick();
            setTimeout(() => clickOriginalByText("Gérer mon compte"), 100);
        });
    }

    const deskLogoutBtn = document.getElementById('mye-desk-logout');
    if (deskLogoutBtn) {
        deskLogoutBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('mye-dropdown-profile').classList.remove('show');
            triggerOriginalProfileClick();
            setTimeout(() => clickOriginalByText("Se déconnecter"), 100);
        });
    }

    const mobAccountBtn = document.getElementById('mye-mob-account');
    if (mobAccountBtn) {
        mobAccountBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeDrawer();
            triggerOriginalProfileClick();
            setTimeout(() => clickOriginalByText("Gérer mon compte"), 100);
        });
    }

    const mobLogoutBtn = document.getElementById('mye-mob-logout');
    if (mobLogoutBtn) {
        mobLogoutBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeDrawer();
            triggerOriginalProfileClick();
            setTimeout(() => clickOriginalByText("Se déconnecter"), 100);
        });
    }
}

function updateCustomAvatar(src) {
    const avatarContainer = document.getElementById('mye-custom-avatar');
    const drawerAvatar = document.getElementById('mye-drawer-avatar');
    let updated = false;

    if (avatarContainer && src) {
        const currentImg = avatarContainer.querySelector('img');
        if (!currentImg || currentImg.src !== src) {
            const img = document.createElement('img');
            img.src = src;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.borderRadius = '50%';
            img.style.objectFit = 'cover';
            avatarContainer.innerHTML = '';
            avatarContainer.appendChild(img);
            updated = true;
        }
    }
    
    if (drawerAvatar && src) {
        const currentDImg = drawerAvatar.querySelector('img');
        if (!currentDImg || currentDImg.src !== src) {
            const img = document.createElement('img');
            img.src = src;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.borderRadius = '50%';
            img.style.objectFit = 'cover';
            drawerAvatar.innerHTML = '';
            drawerAvatar.appendChild(img);
            updated = true;
        }
    }
    return updated;
}

function updateCustomName(firstName, lastName) {
    const myeFirstNameEl = document.getElementById('mye-first-name');
    const myeLastNameEl = document.getElementById('mye-last-name');
    const drawerName = document.getElementById('mye-drawer-name');
    let updated = false;

    // Accepter la mise à jour même si firstName ou lastName est vide (mais pas les deux)
    if (!firstName && !lastName) return false;

    if (myeFirstNameEl && myeFirstNameEl.textContent !== firstName) {
        myeFirstNameEl.textContent = firstName || '';
        updated = true;
    }
    if (myeLastNameEl && myeLastNameEl.textContent !== lastName) {
        myeLastNameEl.textContent = lastName || '';
        updated = true;
    }
    if (drawerName) {
        const fullName = `${firstName || ''} ${lastName || ''}`.trim();
        if (fullName && drawerName.textContent !== fullName) {
            drawerName.textContent = fullName;
            updated = true;
        }
    }
    return updated;
}

function handleMainContact(mainContact) {
    if (!mainContact) return;
    const firstName = mainContact.firstName || '';
    const lastName = mainContact.lastName || '';
    updateCustomName(firstName, lastName);

    if (mainContact.azureId) {
        const avatarUrl = `/api/rest/student/profile/picture/${mainContact.azureId}`;
        fetch(avatarUrl)
            .then(res => {
                if (res.ok) return res.text();
                throw new Error("Photo fetch failed");
            })
            .then(photoData => {
                if (photoData && photoData.length > 50) {
                    const src = photoData.startsWith('data:') ? photoData : `data:image/jpeg;base64,${photoData}`;
                    updateCustomAvatar(src);
                } else {
                    updateCustomAvatar(avatarUrl);
                }
            })
            .catch(() => {
                updateCustomAvatar(avatarUrl);
            });
    }
}

function injectMainWorldBridge() {
    // Intentionally left blank.
    // The previous inline script injection triggered Content Security Policy (CSP) errors.
    // We now rely on fetchProfileFromAPI() and startDOMScraping() which do not violate CSP.
}

function fetchProfileFromAPI() {
    fetch('/api/rest/student/profile')
        .then(res => {
            if (res.ok) return res.json();
            throw new Error("Profile API failed");
        })
        .then(profile => {
            if (profile) handleMainContact(profile);
        })
        .catch(err => console.log("Profile API error:", err));
}

function startDOMScraping() {
    let attempts = 0;
    const interval = setInterval(() => {
        attempts++;
        let nameFound = false;

        // Scraper pour le nom sur le header de bureau
        const nameEl = document.querySelector('h6[role="userName"]');
        if (nameEl && nameEl.textContent.trim()) {
            const parts = nameEl.textContent.trim().split(' ');
            const firstName = parts[0] || '';
            const lastName = parts.slice(1).join(' ') || '';
            if (updateCustomName(firstName, lastName)) {
                nameFound = true;
            }
        }
        
        // Scraper pour le nom sur le menu mobile (basé sur la structure)
        if (!nameFound) {
            const summaries = document.querySelectorAll('.MuiAccordionSummary-content');
            for (const summary of summaries) {
                const avatar = summary.querySelector('.MuiAvatar-root');
                const nameP = summary.querySelector('p');
                if (avatar && nameP && nameP.textContent.trim()) {
                    const parts = nameP.textContent.trim().split(' ');
                    const firstName = parts[0] || '';
                    const lastName = parts.slice(1).join(' ') || '';
                    if (updateCustomName(firstName, lastName)) {
                        nameFound = true;
                        break; 
                    }
                }
            }
        }

        const origAvatarImg = document.querySelector('app-user-avatar img, .user-avatar-container img, [alt*="avatar"], [src*="avatar"]');
        if (origAvatarImg && origAvatarImg.src) {
            updateCustomAvatar(origAvatarImg.src);
        }

        if (nameFound || attempts > 30) {
            clearInterval(interval);
        }
    }, 500);
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
    if (avatarContainer && avatarContainer.innerHTML === '') avatarContainer.innerHTML = fallbackAvatar;

    const drawerAvatar = document.getElementById('mye-drawer-avatar');
    if (drawerAvatar && drawerAvatar.innerHTML === '') drawerAvatar.innerHTML = fallbackAvatar;

    startDOMScraping();
    injectMainWorldBridge();
    // fetchProfileFromAPI(); // Removed because it returns 404
}

function injectCustomHeader() {
    if (document.getElementById('mye-custom-header-wrapper')) return;

    const wrapper = document.createElement('div');
    wrapper.id = 'mye-custom-header-wrapper';
    wrapper.innerHTML = getHeaderHTML();
    document.body.prepend(wrapper);

    // Déplacer les menus déroulants dans leurs boutons respectifs
    document.querySelectorAll('.mye-has-dropdown').forEach(item => {
        const targetId = item.getAttribute('data-target');
        const menu = document.getElementById(targetId);
        if (menu) {
            item.appendChild(menu);
            item.style.position = 'relative';
        }
    });

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
// PAGE D'ACCUEIL (LANDING PAGE) PERSONNALISÉE
// ──────────────────────────────────────────────
function buildLandingOverlay() {
    if (document.getElementById('mye-landing-overlay')) return;

    document.body.classList.add('mye-clean-screen');

    // Garder le fond noir pour le landing
    const hideStyle = document.createElement('style');
    hideStyle.innerHTML = `
      body.mye-clean-screen {
        background-color: #0c0c0c !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
      }
    `;
    document.head.appendChild(hideStyle);

    // Essayer de trouver le bouton de connexion d'origine
    let origBtn = null;
    const findOrigBtn = () => {
        const selectors = [
            '#sso-trigger',
            'a[href*="auth.myefrei.fr"]',
            'a[href*="/sso/"]',
            'a[href*="/login"]',
            'a[href*="/portal"]',
            'button.login-btn',
            'button',
            'a'
        ];
        
        for (const sel of selectors) {
            const elements = document.querySelectorAll(sel);
            for (const el of elements) {
                if (el.id === 'mye-landing-btn' || el.closest('#mye-landing-overlay')) continue;
                
                const txt = el.textContent.toLowerCase();
                if (sel === '#sso-trigger' || sel.includes('auth.myefrei.fr') || sel.includes('/sso/') || 
                    txt.includes('connecter') || txt.includes('connexion') || txt.includes('continuer') || txt.includes('entrer')) {
                    return el;
                }
            }
        }
        const allLinks = document.querySelectorAll('a');
        for (const el of allLinks) {
            if (!el.closest('#mye-landing-overlay')) return el;
        }
        return null;
    };

    origBtn = findOrigBtn();

    if (!origBtn) {
        let attempts = 0;
        const interval = setInterval(() => {
            attempts++;
            origBtn = findOrigBtn();
            if (origBtn || attempts > 25) {
                clearInterval(interval);
            }
        }, 200);
    }

    // Créer l'overlay
    const overlay = document.createElement('div');
    overlay.id = 'mye-landing-overlay';
    overlay.className = 'mye-page-container';
    overlay.style.setProperty('--tour-assas-url', `url('${TOUR_ASSAS_URL}')`);
    
    overlay.innerHTML = `
      <div class="mye-landing-header">
        <img src="${LOGO_MYEFREI_URL}" alt="Efrei" class="mye-landing-logo" />
        <span class="mye-landing-ultra">ULTRA</span>
      </div>
      <div class="mye-landing-card">
        <div class="mye-landing-content">
          <h1 class="mye-landing-title">Bienvenue dans myEfrei ULTRA</h1>
          <p class="mye-landing-subtitle">Retrouvez les services de l'Efrei, mais en mieux</p>
          <button class="mye-landing-btn" id="mye-landing-btn">Continuer</button>
        </div>
        <div class="mye-landing-footer">
          © 2026 Efrei | Établissement d'enseignement supérieur technique privé - <a href="https://www.myefrei.fr/portal/donnees-personnelles" class="mye-landing-link" target="_blank">Données personnelles</a>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Événement Clic sur Continuer
    const continueBtn = document.getElementById('mye-landing-btn');
    if (continueBtn) {
        continueBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (origBtn) {
                origBtn.click();
                if (origBtn.tagName === 'A' && origBtn.href) {
                    setTimeout(() => {
                        window.location.href = origBtn.href;
                    }, 50);
                }
            } else {
                window.location.href = 'https://auth.myefrei.fr/login';
            }
        });
    }
}

function changeFavicon() {
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
    }
    link.href = chrome.runtime.getURL('img/logoEfreiDepInf.png');
}

// Point d'entrée
// ──────────────────────────────────────────────
function tryBuild() {
    const host = window.location.hostname;
    const path = window.location.pathname;
    if (host === 'www.myefrei.fr' || host === 'localhost' || host === '127.0.0.1') {
        changeFavicon();
        if (path.includes('/portal/')) {
            injectCustomHeader();
        } else {
            buildLandingOverlay();
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryBuild);
} else {
    tryBuild();
}

// ──────────────────────────────────────────────
// GESTION DU ROUTAGE ANGULAR (SPA)
// ──────────────────────────────────────────────
let lastUrl = window.location.href;
setInterval(() => {
    if (lastUrl !== window.location.href) {
        lastUrl = window.location.href;
        // Si on navigue, on s'assure que le header est bien là s'il doit l'être
        tryBuild();
    }
}, 500);

