// =============================================
//  MYEFREI ULTRA — Module Notes (grades.js)
// =============================================

(function () {
  'use strict';

  console.log('📊 MyEfrei ULTRA — Module Notes (Chargé)');

  // ──────────────────────────────────────────────
  // CONSTANTES
  // ──────────────────────────────────────────────
  const API_GRADES = '/api/rest/student/grades';
  const CIRCLE_RADIUS = 90;
  const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

  // ──────────────────────────────────────────────
  // ÉTAT
  // ──────────────────────────────────────────────
  let state = {
    currentPeriod: null,       // ex: "S4"
    currentSchoolYear: null,   // ex: "2025-2026"
    semesters: [],             // [{period, schoolYear, label}]
    grades: null,              // Données parsées
    average: null
  };

  // ──────────────────────────────────────────────
  // UTILITAIRES
  // ──────────────────────────────────────────────

  /** Formater une note au format français (virgule, 2 décimales) */
  function formatGrade(value) {
    if (value == null || value === '' || isNaN(value)) return '—';
    return parseFloat(value).toFixed(2).replace('.', ',');
  }

  /** Déterminer l'année scolaire courante */
  function getCurrentSchoolYear() {
    const now = new Date();
    const month = now.getMonth(); // 0-11
    const year = now.getFullYear();
    const startYear = month >= 7 ? year : year - 1; // Août+ = nouvelle année
    return `${startYear}-${startYear + 1}`;
  }

  /** Générer le label du semestre : "Semestre X - ANNÉE" */
  function getSemesterLabel(period, schoolYear) {
    const num = parseInt(period.replace('S', ''), 10);
    const years = schoolYear.split('-');
    // Impair → 1ère année, Pair → 2ème année
    const displayYear = (num % 2 !== 0) ? years[0] : years[1];
    return `Semestre ${num} - ${displayYear}`;
  }

  // ──────────────────────────────────────────────
  // DÉTECTION DES SEMESTRES DISPONIBLES
  // ──────────────────────────────────────────────

  /**
   * Utilise l'API de MyEfrei pour récupérer les semestres
   */
  async function discoverSemesters() {
    try {
      console.log('📊 Fetching periods from API...');
      const res = await fetch('/api/rest/student/periods?withHistory=true', { credentials: 'include' });
      if (!res.ok) throw new Error('Periods API failed');
      
      const periodsData = await res.json();
      const found = [];
      
      // periodsData est probablement un tableau d'objets du genre { period: 'S4', schoolYear: '2025-2026', ... }
      if (Array.isArray(periodsData)) {
        for (const p of periodsData) {
          if (p.period && p.schoolYear) {
            found.push({
              period: p.period,
              schoolYear: p.schoolYear,
              data: null // On chargera les notes à la volée
            });
          }
        }
      }
      
      // Si on n'a rien trouvé via l'API (format inattendu), on fallback sur le bruteforce
      if (found.length === 0) {
        console.warn('📊 Format de /periods inconnu, fallback sur le bruteforce...');
        return await fallbackDiscoverSemesters();
      }

      // Trier chronologiquement (S1 -> S10)
      found.sort((a, b) => {
        const numA = parseInt(a.period.replace('S', ''), 10) || 0;
        const numB = parseInt(b.period.replace('S', ''), 10) || 0;
        return numA - numB;
      });

      return found;
    } catch (e) {
      console.warn('📊 Erreur avec /periods, fallback sur le bruteforce...', e);
      return await fallbackDiscoverSemesters();
    }
  }

  /**
   * Fallback: Sonde l'API pour découvrir les semestres disponibles.
   */
  async function fallbackDiscoverSemesters() {
    const currentSY = getCurrentSchoolYear();
    const startYear = parseInt(currentSY.split('-')[0], 10);
    const schoolYears = [];
    for (let i = 0; i < 5; i++) {
      schoolYears.push(`${startYear - i}-${startYear - i + 1}`);
    }

    const found = [];
    for (const sy of schoolYears) {
      const probes = [];
      for (let s = 1; s <= 10; s++) {
        const period = `S${s}`;
        probes.push(
          fetch(`${API_GRADES}?schoolYear=${sy}&period=${period}`, { credentials: 'include' })
            .then(r => {
              if (!r.ok) return null;
              return r.json().then(data => {
                if (data && ((Array.isArray(data) && data.length > 0) ||
                  (!Array.isArray(data) && typeof data === 'object' && Object.keys(data).length > 0))) {
                  return { period, schoolYear: sy, data };
                }
                return null;
              }).catch(() => null);
            })
            .catch(() => null)
        );
      }
      const results = await Promise.all(probes);
      found.push(...results.filter(r => r !== null));
    }

    found.sort((a, b) => {
      const numA = parseInt(a.period.replace('S', ''), 10);
      const numB = parseInt(b.period.replace('S', ''), 10);
      return numA - numB;
    });

    return found;
  }

  // ──────────────────────────────────────────────
  // APPEL API
  // ──────────────────────────────────────────────

  async function fetchGrades(schoolYear, period) {
    const url = `${API_GRADES}?schoolYear=${schoolYear}&period=${period}`;
    console.log(`📊 Fetching grades: ${url}`);

    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) {
      throw new Error(`API Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('📊 Raw API response:', JSON.stringify(data, null, 2));
    return data;
  }

  // ──────────────────────────────────────────────
  // PARSING DE LA RÉPONSE API
  // ──────────────────────────────────────────────

  /**
   * Parse la réponse de l'API en un format normalisé.
   * Format normalisé :
   * {
   *   average: number,
   *   ues: [{
   *     name: string,
   *     average: number,
   *     subjects: [{
   *       name: string,
   *       code: string,
   *       coefficient: number,
   *       average: number,
   *       evaluations: [{ type: string, coefficient: number, value: number }]
   *     }]
   *   }]
   * }
   */
  function parseGradesResponse(raw) {
    let uesArray = null;

    // Format exact MyEfrei : raw.grades.ues
    if (raw && raw.grades && Array.isArray(raw.grades.ues)) {
      uesArray = raw.grades.ues;
    } 
    // Fallback generique
    else if (Array.isArray(raw)) {
      uesArray = raw;
    } 
    else if (raw && typeof raw === 'object') {
      for (const key of ['ues', 'data', 'results']) {
        if (raw[key] && Array.isArray(raw[key])) uesArray = raw[key];
      }
    }

    if (!uesArray) {
      console.error('📊 Format API non reconnu. Données brutes :', raw);
      return null;
    }

    // Le filtrage et le calcul de la moyenne sont faits dans parseUEArray
    return parseUEArray(uesArray);
  }

  function parseUEArray(arr) {
    // 1. D'abord on mappe toutes les UE
    let ues = arr.map(ue => {
      const ueName = ue.name || ue.code || 'UE inconnue';
      const ueAverage = ue.grade != null ? parseFloat(ue.grade) : (ue.average != null ? parseFloat(ue.average) : null);
      const ueCoef = ue.coef != null ? parseFloat(ue.coef) : (ue.ectsAttempted != null ? parseFloat(ue.ectsAttempted) : 1);

      // Trouver les matières (modules)
      const subjectsRaw = ue.modules || ue.courses || ue.subjects || [];

      const subjects = subjectsRaw.map(sub => {
        const subName = sub.name || sub.code || 'Matière inconnue';
        const subCode = sub.code || '';
        const subCoef = sub.coef != null ? parseFloat(sub.coef) : (sub.coefficient != null ? parseFloat(sub.coefficient) : null);
        const subAvg = sub.grade != null ? parseFloat(sub.grade) : (sub.average != null ? parseFloat(sub.average) : null);

        // Trouver les évaluations (grades)
        const evalsRaw = sub.grades || sub.evaluations || sub.marks || [];
        const evaluations = evalsRaw.map(ev => {
          return {
            type: ev.courseActivity || ev.type || ev.name || '?',
            coefficient: ev.coef != null ? parseFloat(ev.coef) : (ev.coefficient != null ? parseFloat(ev.coefficient) : null),
            value: ev.grade != null ? parseFloat(ev.grade) : (ev.value != null ? parseFloat(ev.value) : null),
            examFile: ev.examFile || null
          };
        });

        return {
          name: subName,
          code: subCode,
          coefficient: subCoef,
          average: subAvg,
          evaluations
        };
      });

      return {
        name: ueName,
        average: ueAverage,
        originalCoef: ueCoef,
        subjects
      };
    });

    // 2. On recalcule la moyenne générale uniquement avec les UE ayant au moins 2 matières
    let totalWeightedSum = 0;
    let totalCoef = 0;

    ues.forEach(ue => {
      // On ne prend en compte que les UE qui ont au moins 2 matières pour le calcul
      if (ue.subjects.length >= 2 && ue.average != null) {
        totalWeightedSum += ue.average * ue.originalCoef;
        totalCoef += ue.originalCoef;
      }
    });

    const average = totalCoef > 0 ? totalWeightedSum / totalCoef : null;

    return { average, ues };
  }

  // ──────────────────────────────────────────────
  // CONSTRUCTION DE L'UI
  // ──────────────────────────────────────────────

  function buildPageStructure() {
    // Injecter un style pour cacher le contenu Angular original
    const hideStyle = document.createElement('style');
    hideStyle.id = 'mye-grades-hide-style';
    hideStyle.innerHTML = `
      /* Cacher le contenu Angular de la page des notes */
      app-student-grades,
      app-student-home,
      .mat-tab-nav-panel,
      mat-sidenav-container > mat-sidenav-content > :not(app-header):not(#mye-custom-header-wrapper):not(#mye-grades-container) {
        display: none !important;
      }
      /* Fond de page */
      body {
        background-color: #F0F0F0 !important;
      }
    `;
    document.head.appendChild(hideStyle);

    // Créer le conteneur principal
    const container = document.createElement('div');
    container.id = 'mye-grades-container';

    container.innerHTML = `
      <div class="mye-grades-left">
        <div class="mye-semester-selector" id="mye-semester-selector">
          <button class="mye-semester-btn" id="mye-semester-btn">
            <span id="mye-semester-label">Chargement…</span>
            <span class="mye-semester-arrow">▼</span>
          </button>
          <div class="mye-semester-dropdown" id="mye-semester-dropdown"></div>
        </div>
        <div class="mye-grade-circle-container">
          <div class="mye-grade-label">Moyenne</div>
          <div class="mye-grade-circle">
            <svg viewBox="0 0 200 200">
              <circle class="mye-grade-circle-bg" cx="100" cy="100" r="${CIRCLE_RADIUS}" />
              <circle class="mye-grade-circle-fill" id="mye-grade-arc" cx="100" cy="100" r="${CIRCLE_RADIUS}"
                stroke-dasharray="${CIRCLE_CIRCUMFERENCE}"
                stroke-dashoffset="${CIRCLE_CIRCUMFERENCE}" />
            </svg>
            <div class="mye-grade-circle-value" id="mye-grade-value">—</div>
          </div>
          <div class="mye-grade-disclaimer">Les notes ne sont pas définitives</div>
        </div>
      </div>
      <div class="mye-grades-right" id="mye-grades-right">
        <div class="mye-grades-loading">
          <div class="mye-grades-spinner"></div>
          <div class="mye-grades-loading-text">Chargement des notes…</div>
        </div>
      </div>
    `;

    document.body.appendChild(container);

    // Événements du sélecteur de semestre
    initSemesterEvents();
  }

  // ──────────────────────────────────────────────
  // SÉLECTEUR DE SEMESTRE
  // ──────────────────────────────────────────────

  function initSemesterEvents() {
    const btn = document.getElementById('mye-semester-btn');
    const dropdown = document.getElementById('mye-semester-dropdown');

    if (!btn || !dropdown) return;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      btn.classList.toggle('open');
      dropdown.classList.toggle('show');
    });

    // Fermer au clic extérieur
    document.addEventListener('click', () => {
      btn.classList.remove('open');
      dropdown.classList.remove('show');
    });

    dropdown.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  function populateSemesterDropdown() {
    const dropdown = document.getElementById('mye-semester-dropdown');
    if (!dropdown) return;

    dropdown.innerHTML = '';

    // Afficher du plus récent au plus ancien
    const sorted = [...state.semesters].reverse();

    sorted.forEach(sem => {
      const option = document.createElement('button');
      option.className = 'mye-semester-option';
      if (sem.period === state.currentPeriod && sem.schoolYear === state.currentSchoolYear) {
        option.classList.add('active');
      }
      option.textContent = sem.label;
      option.addEventListener('click', () => {
        selectSemester(sem);
      });
      dropdown.appendChild(option);
    });
  }

  async function selectSemester(sem) {
    // Fermer le dropdown
    const btn = document.getElementById('mye-semester-btn');
    const dropdown = document.getElementById('mye-semester-dropdown');
    btn.classList.remove('open');
    dropdown.classList.remove('show');

    // Mettre à jour l'état
    state.currentPeriod = sem.period;
    state.currentSchoolYear = sem.schoolYear;

    // Mettre à jour le label
    document.getElementById('mye-semester-label').textContent = sem.label;

    // Mettre à jour le dropdown (classe active)
    populateSemesterDropdown();

    // Recharger les notes
    await loadAndRenderGrades(sem.schoolYear, sem.period, sem.data);
  }

  // ──────────────────────────────────────────────
  // CHARGEMENT & RENDU DES NOTES
  // ──────────────────────────────────────────────

  async function loadAndRenderGrades(schoolYear, period, cachedData) {
    const rightPanel = document.getElementById('mye-grades-right');
    if (!rightPanel) return;

    // Afficher le chargement
    rightPanel.innerHTML = `
      <div class="mye-grades-loading">
        <div class="mye-grades-spinner"></div>
        <div class="mye-grades-loading-text">Chargement des notes…</div>
      </div>
    `;

    try {
      const raw = cachedData || await fetchGrades(schoolYear, period);
      const parsed = parseGradesResponse(raw);

      if (!parsed || !parsed.ues || parsed.ues.length === 0) {
        rightPanel.innerHTML = `
          <div class="mye-grades-error">
            <div class="mye-grades-error-icon">📭</div>
            <div class="mye-grades-error-text">Aucune note disponible pour ce semestre.</div>
          </div>
        `;
        updateCircle(null);
        return;
      }

      state.grades = parsed;
      state.average = parsed.average;

      // Mettre à jour le cercle
      updateCircle(parsed.average);

      // Générer les blocs UE
      renderUEBlocks(parsed.ues, rightPanel);

    } catch (err) {
      console.error('📊 Erreur lors du chargement des notes:', err);
      
      let rawDataStr = "Non disponible";
      try {
        if (cachedData) rawDataStr = JSON.stringify(cachedData, null, 2);
        else if (state.semesters.length > 0) rawDataStr = JSON.stringify(state.semesters[state.semesters.length-1].data, null, 2);
      } catch(e) {}

      rightPanel.innerHTML = `
        <div class="mye-grades-error">
          <div class="mye-grades-error-icon">⚠️</div>
          <div class="mye-grades-error-text">Le format des données a changé ! J'ai besoin de ce code :</div>
          <textarea style="width:100%; height:300px; font-family:monospace; font-size:11px; margin-top:15px; padding:10px; border:2px solid #1d3b64; border-radius:10px;" onclick="this.select()">${rawDataStr}</textarea>
        </div>
      `;
      updateCircle(null);
    }
  }

  function updateCircle(average) {
    const arc = document.getElementById('mye-grade-arc');
    const valueEl = document.getElementById('mye-grade-value');
    if (!arc || !valueEl) return;

    if (average == null || isNaN(average)) {
      arc.style.strokeDashoffset = CIRCLE_CIRCUMFERENCE;
      valueEl.textContent = '—';
      return;
    }

    const ratio = Math.min(average / 20, 1);
    const offset = CIRCLE_CIRCUMFERENCE * (1 - ratio);
    arc.style.strokeDashoffset = offset;
    valueEl.textContent = formatGrade(average);
  }

  function renderUEBlocks(ues, container) {
    container.innerHTML = '';

    ues.forEach(ue => {
      const block = document.createElement('div');
      block.className = 'mye-ue-block';

      // Trouver le nombre max d'évaluations parmi les matières de cette UE
      let maxEvals = 0;
      ue.subjects.forEach(sub => {
        if (sub.evaluations.length > maxEvals) {
          maxEvals = sub.evaluations.length;
        }
      });

      // Header de l'UE
      const headerHTML = `
        <div class="mye-ue-header">
          <h2 class="mye-ue-title">${escapeHTML(ue.name)}</h2>
          <div class="mye-ue-grade">${formatGrade(ue.average)}</div>
        </div>
      `;

      // Cartes matières
      const subjectsHTML = ue.subjects.map(sub => buildSubjectCard(sub, maxEvals)).join('');

      block.innerHTML = `
        ${headerHTML}
        <div class="mye-ue-subjects">${subjectsHTML}</div>
      `;

      container.appendChild(block);
    });
  }

  function buildSubjectCard(subject, maxEvals) {
    // Construire les lignes de détails
    const detailsHTML = subject.evaluations.map(ev => `
      <div class="mye-detail-row">
        <div class="mye-detail-left">
          <span class="mye-detail-type">${escapeHTML(ev.type)}</span>
          <span class="mye-detail-separator">-</span>
          <span class="mye-detail-coef">Coef ${formatCoef(ev.coefficient)}</span>
        </div>
        <div class="mye-detail-right">
          ${ev.examFile ? `
          <a href="${getExamFileUrl(ev.examFile)}" class="mye-exam-file-link" title="Consulter la copie">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM13 9V3.5L18.5 9H13z"/>
            </svg>
          </a>` : ''}
          <div class="mye-detail-value">${formatGrade(ev.value)}</div>
        </div>
      </div>
    `).join('');

    // Ajouter des lignes vides pour uniformiser la hauteur des cartes
    let emptyRows = '';
    const emptyCount = maxEvals - subject.evaluations.length;
    for (let i = 0; i < emptyCount; i++) {
      emptyRows += '<div class="mye-detail-row" style="visibility:hidden"><div class="mye-detail-left"><span class="mye-detail-type">-</span></div></div>';
    }

    return `
      <div class="mye-subject-card">
        <div class="mye-subject-top">
          <div class="mye-subject-name-container">
            <div class="mye-subject-name">${escapeHTML(subject.name)}</div>
            <div class="mye-subject-coef">${subject.coefficient != null ? `Coef. ${subject.coefficient}` : ''}</div>
          </div>
          <div class="mye-subject-grade">${formatGrade(subject.average)}</div>
        </div>
        <div class="mye-subject-bottom">
          <div class="mye-subject-details">
            ${detailsHTML}
            ${emptyRows}
          </div>
          ${subject.code ? `<div class="mye-subject-code">${escapeHTML(subject.code)}</div>` : ''}
        </div>
      </div>
    `;
  }

  function formatCoef(value) {
    if (value == null) return '?';
    let val = parseFloat(value);
    // L'API renvoie des pourcentages entre 0 et 1 pour les evals (ex: 0.20000)
    // On les convertit en entiers (20)
    if (val > 0 && val <= 1) {
      val = Math.round(val * 100);
    }
    return val.toString().replace('.', ',');
  }

  function getExamFileUrl(fileInfo) {
    if (!fileInfo) return '#';
    let path = '';
    if (typeof fileInfo === 'string') path = fileInfo;
    else if (fileInfo.pathname) path = fileInfo.pathname;
    else if (fileInfo.path) path = fileInfo.path;
    else if (fileInfo.url) return fileInfo.url;
    
    if (path) {
      // Si l'API renvoie déjà une URL complète ou relative valide
      if (path.startsWith('http') || path.startsWith('/api/')) return path;
      
      // Sinon on assume que c'est le pathname (ex: 2026\\05\\19\\...PDF)
      // L'API utilise ce pathname en paramètre GET
      return `/api/rest/student/exam/file?pathname=${encodeURIComponent(path)}`;
    }
    
    return '#';
  }

  // Écouteur global pour intercepter les clics sur les liens de copie d'examen
  // On utilise la délégation d'événements car c'est le seul moyen fiable
  // dans un content script (le monde isolé empêche les onclick inline)
  document.addEventListener('click', function(e) {
    const link = e.target.closest('.mye-exam-file-link');
    if (link) {
      e.preventDefault();
      e.stopPropagation();
      const url = link.getAttribute('href') || link.href;
      if (url && url !== '#') {
        myeOpenPdf(url);
      }
    }
  }, true);

  async function myeOpenPdf(url) {
    let overlay = document.getElementById('mye-pdf-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'mye-pdf-overlay';
      overlay.className = 'mye-pdf-overlay';
      overlay.innerHTML = `
        <div class="mye-pdf-modal" id="mye-pdf-modal">
          <div class="mye-pdf-header">
            <button class="mye-pdf-btn mye-pdf-close" id="mye-pdf-close-btn" title="Fermer">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
            <h3 class="mye-pdf-title">Copie d'examen</h3>
            <div class="mye-pdf-actions">
              <a id="mye-pdf-download" class="mye-pdf-btn" href="#" target="_blank" download title="Télécharger">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
              </a>
            </div>
          </div>
          <div class="mye-pdf-body">
            <iframe id="mye-pdf-iframe" class="mye-pdf-iframe" src=""></iframe>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      
      // Empêcher les clics sur la modale de la fermer (remplace le onclick inline)
      document.getElementById('mye-pdf-modal').addEventListener('click', function(e) {
        e.stopPropagation();
      });
      
      // Ajout des écouteurs de fermeture
      document.getElementById('mye-pdf-close-btn').addEventListener('click', function(e) {
        e.stopPropagation();
        myeClosePdf();
      });
      overlay.addEventListener('click', myeClosePdf);
    }
    
    const iframe = document.getElementById('mye-pdf-iframe');
    const downloadBtn = document.getElementById('mye-pdf-download');
    
    downloadBtn.href = url;
    
    // Afficher l'état de chargement
    iframe.removeAttribute('src');
    iframe.srcdoc = '<html style="height:100%;"><body style="display:flex;justify-content:center;align-items:center;height:100%;margin:0;font-family:sans-serif;color:#1d3b64;"><h3>Chargement de la copie en cours...</h3></body></html>';
    
    // Afficher la modale immédiatement
    setTimeout(() => {
      overlay.classList.add('mye-pdf-show');
    }, 10);

    // Télécharger le fichier via fetch pour contourner le téléchargement forcé de l'API
    try {
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Erreur réseau');
      
      const blob = await response.blob();
      const pdfBlob = new Blob([blob], { type: 'application/pdf' });
      const objectUrl = URL.createObjectURL(pdfBlob);
      
      iframe.removeAttribute('srcdoc');
      iframe.src = objectUrl;
      
      // Stocker l'URL pour la nettoyer à la fermeture
      overlay.dataset.objectUrl = objectUrl;
    } catch (err) {
      console.error("Erreur chargement PDF:", err);
      iframe.srcdoc = '<html style="height:100%;"><body style="display:flex;justify-content:center;align-items:center;height:100%;margin:0;font-family:sans-serif;color:#ff3385;"><h3>Erreur : Impossible de charger la copie.</h3></body></html>';
    }
  };

  function myeClosePdf() {
    const overlay = document.getElementById('mye-pdf-overlay');
    if (overlay) {
      overlay.classList.remove('mye-pdf-show');
      if (overlay.dataset.objectUrl) {
        URL.revokeObjectURL(overlay.dataset.objectUrl);
        overlay.dataset.objectUrl = '';
      }
      setTimeout(() => {
        const iframe = document.getElementById('mye-pdf-iframe');
        if (iframe) iframe.removeAttribute('src');
      }, 300); // Vider après l'animation de fermeture
    }
  }

  function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ──────────────────────────────────────────────
  // POINT D'ENTRÉE
  // ──────────────────────────────────────────────

  async function init() {
    console.log('📊 Initialisation de la page des notes…');

    // Construire la structure de la page
    buildPageStructure();

    try {
      // Découvrir les semestres disponibles
      console.log('📊 Recherche des semestres disponibles…');
      const found = await discoverSemesters();

      if (found.length === 0) {
        // Aucun semestre trouvé — essayer avec le semestre actuel calculé
        console.warn('📊 Aucun semestre trouvé automatiquement');
        document.getElementById('mye-semester-label').textContent = 'Aucun semestre';
        document.getElementById('mye-grades-right').innerHTML = `
          <div class="mye-grades-error">
            <div class="mye-grades-error-icon">📭</div>
            <div class="mye-grades-error-text">Aucun semestre avec des notes n'a été trouvé.</div>
            <div class="mye-grades-error-detail">Vérifiez que vous êtes connecté à myEfrei.</div>
          </div>
        `;
        return;
      }

      // Construire la liste des semestres
      state.semesters = found.map(f => ({
        period: f.period,
        schoolYear: f.schoolYear,
        label: getSemesterLabel(f.period, f.schoolYear),
        data: f.data  // Cache les données pour éviter de refetcher
      }));

      // Le semestre courant est le dernier trouvé (le plus récent)
      const current = state.semesters[state.semesters.length - 1];
      state.currentPeriod = current.period;
      state.currentSchoolYear = current.schoolYear;

      // Mettre à jour le label du sélecteur
      document.getElementById('mye-semester-label').textContent = current.label;

      // Populer le dropdown
      populateSemesterDropdown();

      // Charger les notes du semestre courant (utiliser les données cachées)
      await loadAndRenderGrades(current.schoolYear, current.period, current.data);

    } catch (err) {
      console.error('📊 Erreur fatale:', err);
      
      // Tentative de récupération du dernier JSON brut
      let rawDataStr = "Non disponible";
      try {
        if (state.semesters && state.semesters.length > 0) {
          rawDataStr = JSON.stringify(state.semesters[state.semesters.length - 1].data, null, 2);
        }
      } catch(e) {}

      document.getElementById('mye-grades-right').innerHTML = `
        <div class="mye-grades-error">
          <div class="mye-grades-error-icon">⚠️</div>
          <div class="mye-grades-error-text">Le format des données a changé ! J'ai besoin de ce code :</div>
          <textarea style="width:100%; height:300px; font-family:monospace; font-size:11px; margin-top:15px; padding:10px; border:2px solid #1d3b64; border-radius:10px;">${rawDataStr}</textarea>
        </div>
      `;
    }
  }

  // Démarrer après que le DOM soit prêt et que portal.js ait eu le temps de s'exécuter
  function waitAndInit() {
    // Masquer TOUT le contenu original pour ne laisser que l'extension
    const hideStyle = document.createElement('style');
    hideStyle.id = 'mye-hide-all-style';
    hideStyle.innerHTML = `
      body > *:not(#mye-custom-header-wrapper):not(#mye-grades-container):not(#mye-pdf-overlay):not(script):not(style):not(link) {
        display: none !important;
      }
      html, body {
        background-color: #F0F0F0 !important;
      }
    `;
    
    // Remplacer s'il existe déjà
    const existingStyle = document.getElementById('mye-hide-all-style');
    if (existingStyle) existingStyle.remove();
    document.head.appendChild(hideStyle);

    // S'assurer que notre conteneur est visible s'il existait déjà
    const container = document.getElementById('mye-grades-container');
    if (container) container.style.display = 'block';

    // Attendre que le header personnalisé soit injecté par portal.js
    const checkHeader = setInterval(() => {
      if (document.getElementById('mye-custom-header-wrapper') || document.getElementById('mye-custom-header')) {
        clearInterval(checkHeader);
        // Petit délai supplémentaire pour laisser le DOM se stabiliser
        if (!document.getElementById('mye-grades-container')) setTimeout(init, 300);
      }
    }, 200);

    // Timeout de sécurité : lancer quand même après 5 secondes
    setTimeout(() => {
      clearInterval(checkHeader);
      if (!document.getElementById('mye-grades-container')) {
        init();
      }
    }, 5000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (window.location.pathname.includes('/portal/student/grades')) waitAndInit();
    });
  } else {
    if (window.location.pathname.includes('/portal/student/grades')) waitAndInit();
  }

  // ──────────────────────────────────────────────
  // GESTION DU ROUTAGE ANGULAR (SPA) ET NETTOYAGE
  // ──────────────────────────────────────────────
  let lastGradesUrl = window.location.href;
  setInterval(() => {
    if (lastGradesUrl !== window.location.href) {
      lastGradesUrl = window.location.href;
      
      if (window.location.pathname.includes('/portal/student/grades')) {
        // On arrive ou on reste sur la page des notes
        if (!document.getElementById('mye-grades-container')) {
          waitAndInit();
        } else {
          // On s'assure qu'il est visible et que le masquage est actif
          const hideStyle = document.getElementById('mye-hide-all-style');
          if (!hideStyle) waitAndInit();
          else document.getElementById('mye-grades-container').style.display = 'block';
        }
      } else {
        // CLEANUP : On quitte la page des notes !
        // 1. On retire le style qui cache le site original
        const hideStyle = document.getElementById('mye-hide-all-style');
        if (hideStyle) hideStyle.remove();
        
        // 2. On cache notre interface des notes
        const container = document.getElementById('mye-grades-container');
        if (container) container.style.display = 'none';
      }
    }
  }, 500);

})();
