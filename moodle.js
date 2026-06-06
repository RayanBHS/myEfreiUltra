// =============================================
//  MYEFREI ULTRA — Mes Espaces Moodle (moodle.js)
// =============================================

(function () {
  'use strict';

  console.log('📚 MyEfrei ULTRA — Module Moodle (Chargé)');

  // ──────────────────────────────────────────────
  // ÉTAT & CONSTANTES
  // ──────────────────────────────────────────────
  let state = {
    currentSchoolYear: getCurrentSchoolYear(),
    courses: [],
    loading: true
  };

  const API_MOODLE = '/api/rest/student/courses/spaces';

  // ──────────────────────────────────────────────
  // UTILITAIRES
  // ──────────────────────────────────────────────
  function getCurrentSchoolYear() {
    const now = new Date();
    const month = now.getMonth(); // 0-11
    const year = now.getFullYear();
    const startYear = month >= 7 ? year : year - 1; // Août+ = nouvelle année
    return `${startYear}-${startYear + 1}`;
  }

  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ──────────────────────────────────────────────
  // INITIALISATION
  // ──────────────────────────────────────────────
  function waitAndInit() {
    if (document.body) {
      initMoodlePage();
    } else {
      setTimeout(waitAndInit, 50);
    }
  }

  // Surveiller les changements d'URL
  let lastUrl = window.location.href;
  let wasOnMoodle = window.location.pathname.includes('/portal/student/moodle-courses');

  function checkMoodleRoute() {
    const isOnMoodle = window.location.pathname.includes('/portal/student/moodle-courses');
    if (isOnMoodle) {
      wasOnMoodle = true;
      waitAndInit();
    } else if (wasOnMoodle) {
      wasOnMoodle = false;
      const container = document.getElementById('mye-moodle-container');
      if (container) container.remove();
    }
  }

  new MutationObserver(() => {
    if (lastUrl !== window.location.href) {
      lastUrl = window.location.href;
      checkMoodleRoute();
    }
  }).observe(document, { subtree: true, childList: true });

  setInterval(() => {
    if (lastUrl !== window.location.href) {
      lastUrl = window.location.href;
      checkMoodleRoute();
    }
  }, 300);

  checkMoodleRoute();

  // ──────────────────────────────────────────────
  // CONSTRUCTION DE LA PAGE
  // ──────────────────────────────────────────────
  function initMoodlePage() {
    // Nettoyer l'affichage d'origine
    document.body.classList.add('mye-clean-screen');

    // Re-show container if it was hidden by a previous navigation
    const existing = document.getElementById('mye-moodle-container');
    if (existing) {
      existing.style.display = '';
      return; // Already built, just re-show
    }

    // Construire le conteneur principal s'il n'existe pas
    if (!document.getElementById('mye-moodle-container')) {
      const container = document.createElement('div');
      container.id = 'mye-moodle-container';
      container.className = 'mye-page-container';

      container.innerHTML = `
        <div class="mye-moodle-header">
          <div class="mye-moodle-title-box">
            <h1 class="mye-moodle-title">Mes espaces Moodle</h1>
            <div class="mye-moodle-subtitle">Accédez à tous vos cours et supports en ligne.</div>
          </div>
          
          <div class="mye-moodle-actions">
            <!-- Sélecteur d'année -->
            <div class="mye-moodle-year-selector">
              <button class="mye-moodle-year-btn" id="mye-moodle-year-btn">
                <span>Année : ${state.currentSchoolYear}</span>
              </button>
            </div>
            
            <!-- Boutons originaux (re-designés) -->
            <a href="https://moodle.myefrei.fr/course/index.php?categoryid=1635" target="_blank" class="mye-moodle-action-btn">
              Infos Générales
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            </a>
            <a href="https://moodle.myefrei.fr/course/index.php?categoryid=1654" target="_blank" class="mye-moodle-action-btn primary">
              Promotions et majeures
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            </a>
          </div>
        </div>
        
        <div id="mye-moodle-content">
          <div class="mye-moodle-loading">
            <div class="mye-moodle-spinner"></div>
            <div class="mye-moodle-empty-text">Récupération de vos espaces Moodle...</div>
          </div>
        </div>
      `;

      document.body.appendChild(container);
    }

    // Lancer le fetch
    fetchMoodleCourses();
  }

  // ──────────────────────────────────────────────
  // LOGIQUE API ET RENDU
  // ──────────────────────────────────────────────
  async function fetchMoodleCourses() {
    const content = document.getElementById('mye-moodle-content');
    if (!content) return;

    try {
      console.log(`📚 Récupération des cours pour ${state.currentSchoolYear}...`);
      const res = await fetch(`${API_MOODLE}?schoolYear=${state.currentSchoolYear}`, { credentials: 'include' });
      
      if (!res.ok) throw new Error('Erreur réseau / API');
      
      const data = await res.json();
      state.courses = Array.isArray(data) ? data : [];
      
      renderCourses(state.courses);
    } catch (e) {
      console.error('📚 Erreur lors de la récupération des cours:', e);
      content.innerHTML = `
        <div class="mye-moodle-empty">
          <div class="mye-moodle-empty-icon">⚠️</div>
          <div class="mye-moodle-empty-text">Impossible de charger les espaces Moodle.</div>
        </div>
      `;
    }
  }

  function getUeName(code) {
    if (!code) return 'Autres';
    const c = code.toUpperCase();
    if (c.startsWith('SM')) return 'Mathématiques (SM)';
    if (c.startsWith('TI')) return 'Informatique (TI)';
    if (c.startsWith('SP') || c.startsWith('TE')) return 'Sciences Physiques & Systèmes Électroniques (SP/TE)';
    if (c.startsWith('FE') || c.startsWith('FH') || c.startsWith('FL') || c.startsWith('FHS')) return 'Formation Humaine, Langues & Économie';
    if (c.startsWith('LXP')) return 'Projets & LXP';
    if (c.startsWith('ST')) return 'Stages (ST)';
    if (c.startsWith('RE')) return 'Relations Entreprises (RE)';
    if (c.startsWith('RA')) return 'Réunions & Amphis (RA)';
    if (c.startsWith('CTRLCON')) return 'Contrôle Continu';
    return 'Autres';
  }

  function renderCourses(courses) {
    const content = document.getElementById('mye-moodle-content');
    if (!content) return;

    if (courses.length === 0) {
      content.innerHTML = `
        <div class="mye-moodle-empty">
          <div class="mye-moodle-empty-icon">📭</div>
          <div class="mye-moodle-empty-text">Aucun espace Moodle trouvé pour l'année ${state.currentSchoolYear}.</div>
        </div>
      `;
      return;
    }

    // Grouper par UE
    const grouped = {};
    courses.forEach(course => {
      const ueName = getUeName(course.code);
      if (!grouped[ueName]) grouped[ueName] = [];
      grouped[ueName].push(course);
    });

    let contentHTML = '';

    for (const [ueName, ueCourses] of Object.entries(grouped)) {
      const gridHTML = ueCourses.map(course => {
        const title = escapeHTML(course.name || 'Cours sans nom');
        const code = escapeHTML(course.code || 'CODE INCONNU');
        const moodleId = course.moodleId || '';
        const link = escapeHTML(course.link || `https://moodle.myefrei.fr/course/view.php?id=${moodleId}`);

        return `
          <div class="mye-moodle-card">
            <div class="mye-moodle-card-header">
              <span class="mye-moodle-card-code">${code}</span>
              <h3 class="mye-moodle-card-title">${title}</h3>
            </div>
            <div class="mye-moodle-card-footer">
              <span class="mye-moodle-card-id">ID: ${moodleId}</span>
              <a href="${link}" target="_blank" class="mye-moodle-card-link">
                Ouvrir
                <svg viewBox="0 0 24 24"><path d="M14 3h7v7M10 14L21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
              </a>
            </div>
          </div>
        `;
      }).join('');

      contentHTML += `
        <div class="mye-moodle-ue-section">
          <h2 class="mye-moodle-ue-title">${escapeHTML(ueName)}</h2>
          <div class="mye-moodle-grid">${gridHTML}</div>
        </div>
      `;
    }

    content.innerHTML = contentHTML;
  }

})();
