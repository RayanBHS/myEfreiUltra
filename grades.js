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
    semesters: [],             // [{period, schoolYear, label, data}]
    grades: null,              // Données parsées
    average: null,
    simulated: {}              // Simulateur de notes: clé: "ueIdx-subIdx-evalIdx", valeur: note (nombre)
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
    const displayYear = (num % 2 !== 0) ? years[0] : years[1];
    return `Semestre ${num} - ${displayYear}`;
  }

  // ──────────────────────────────────────────────
  // DÉCOUVERTE DYNAMIQUE DES SEMESTRES
  // ──────────────────────────────────────────────

  /**
   * Tente de récupérer la liste des périodes depuis l'API Efrei
   * Si l'API échoue, on bruteforce pour trouver les semestres valides.
   */
  async function discoverSemesters() {
    try {
      console.log('📊 Fetching periods from API...');
      const res = await fetch('/api/rest/student/periods?withHistory=true', { credentials: 'include' });
      if (!res.ok) throw new Error('Periods API failed');
      
      const periodsData = await res.json();
      const found = [];
      
      if (Array.isArray(periodsData)) {
        for (const p of periodsData) {
          if (p.period && p.schoolYear) {
            found.push({
              period: p.period,
              schoolYear: p.schoolYear,
              data: null // Chargement à la volée
            });
          }
        }
      }
      
      if (found.length === 0) {
        console.warn('📊 Format de /periods inconnu, fallback sur le bruteforce...');
        return await fallbackDiscoverSemesters();
      }

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
   */
  function parseGradesResponse(raw) {
    let uesArray = null;

    if (raw && raw.grades && Array.isArray(raw.grades.ues)) {
      uesArray = raw.grades.ues;
    } 
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

    return parseUEArray(uesArray);
  }

  function parseUEArray(arr) {
    let ues = arr.map(ue => {
      const ueName = ue.name || ue.code || 'UE inconnue';
      const ueAverage = ue.grade != null ? parseFloat(ue.grade) : (ue.average != null ? parseFloat(ue.average) : null);
      const ueCoef = ue.coef != null ? parseFloat(ue.coef) : (ue.ectsAttempted != null ? parseFloat(ue.ectsAttempted) : 1);

      const subjectsRaw = ue.modules || ue.courses || ue.subjects || [];

      const subjects = subjectsRaw.map(sub => {
        const subName = sub.name || sub.code || 'Matière inconnue';
        const subCode = sub.code || '';
        const subCoef = sub.coef != null ? parseFloat(sub.coef) : (sub.coefficient != null ? parseFloat(sub.coefficient) : null);
        const subAvg = sub.grade != null ? parseFloat(sub.grade) : (sub.average != null ? parseFloat(sub.average) : null);

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

    let totalWeightedSum = 0;
    let totalCoef = 0;

    ues.forEach(ue => {
      if (ue.subjects.length >= 2 && ue.average != null) {
        totalWeightedSum += ue.average * ue.originalCoef;
        totalCoef += ue.originalCoef;
      }
    });

    const average = totalCoef > 0 ? totalWeightedSum / totalCoef : null;

    return { average, ues };
  }

  // ──────────────────────────────────────────────
  // CALCULS ESTIMATIONS & SIMULATEUR
  // ──────────────────────────────────────────────

  /**
   * Retourne la moyenne réelle, la moyenne simulée et l'état de simulation d'une matière
   */
  function getSubjectAverages(ueIdx, subIdx) {
    if (!state.grades || !state.grades.ues[ueIdx]) return { realAverage: null, simulatedAverage: null, hasSimulation: false };

    const sub = state.grades.ues[ueIdx].subjects[subIdx];

    // Créer la liste des évaluations incluant une évaluation virtuelle si coef total < 100%
    let evals = [...sub.evaluations];
    let sumCoef = evals.reduce((sum, ev) => sum + (ev.coefficient || 0), 0);
    if (sumCoef > 0 && sumCoef < 0.99) {
      evals.push({
        type: 'Évaluation(s) future(s)',
        coefficient: 1.0 - sumCoef,
        value: null,
        isVirtual: true
      });
    }

    let realWeightedSum = 0;
    let realCoefSum = 0;
    let simWeightedSum = 0;
    let simCoefSum = 0;
    let hasSimulation = false;

    evals.forEach((ev, evIdx) => {
      const coef = (ev.coefficient != null && ev.coefficient > 0) ? ev.coefficient : 1.0;

      // Note réelle
      if (ev.value != null) {
        realWeightedSum += ev.value * coef;
        realCoefSum += coef;
      }

      // Note simulée
      const simKey = `${ueIdx}-${subIdx}-${evIdx}`;
      const simVal = state.simulated[simKey];
      if (simVal !== undefined) {
        if (simVal !== null) {
          simWeightedSum += simVal * coef;
          simCoefSum += coef;
          hasSimulation = true;
        }
      } else if (ev.value != null) {
        simWeightedSum += ev.value * coef;
        simCoefSum += coef;
      }
    });

    const realAvg = sub.average != null ? sub.average : (realCoefSum > 0 ? realWeightedSum / realCoefSum : null);
    const simAvg = simCoefSum > 0 ? simWeightedSum / simCoefSum : null;

    return {
      realAverage: realAvg,
      simulatedAverage: simAvg,
      hasSimulation
    };
  }

  /**
   * Calcule les moyennes réelle et simulée pour une UE
   */
  function getUEAverages(ueIdx) {
    if (!state.grades || !state.grades.ues[ueIdx]) return { realAverage: null, simulatedAverage: null, hasSimulation: false };

    const ue = state.grades.ues[ueIdx];
    
    let realWeightedSum = 0;
    let realCoefSum = 0;
    let simWeightedSum = 0;
    let simCoefSum = 0;
    let hasSimulation = false;

    ue.subjects.forEach((sub, subIdx) => {
      const coef = sub.coefficient != null ? sub.coefficient : 1.0;
      const { realAverage, simulatedAverage, hasSimulation: subHasSim } = getSubjectAverages(ueIdx, subIdx);

      if (realAverage != null) {
        realWeightedSum += realAverage * coef;
        realCoefSum += coef;
      }

      if (simulatedAverage != null) {
        simWeightedSum += simulatedAverage * coef;
        simCoefSum += coef;
      }
      if (subHasSim) hasSimulation = true;
    });

    const realAvg = ue.average != null ? ue.average : (realCoefSum > 0 ? realWeightedSum / realCoefSum : null);
    const simAvg = simCoefSum > 0 ? simWeightedSum / simCoefSum : null;

    return {
      realAverage: realAvg,
      simulatedAverage: simAvg,
      hasSimulation
    };
  }

  /**
   * Calcule les moyennes générale réelle et simulée
   */
  function getGlobalAverages() {
    if (!state.grades) return { realAverage: null, simulatedAverage: null, hasSimulation: false };

    let realWeightedSum = 0;
    let realCoefSum = 0;
    let simWeightedSum = 0;
    let simCoefSum = 0;
    let hasSimulation = false;

    state.grades.ues.forEach((ue, ueIdx) => {
      if (ue.subjects.length >= 2) {
        const coef = ue.originalCoef != null ? ue.originalCoef : 1.0;
        const { realAverage, simulatedAverage, hasSimulation: ueHasSim } = getUEAverages(ueIdx);

        if (realAverage != null) {
          realWeightedSum += realAverage * coef;
          realCoefSum += coef;
        }

        if (simulatedAverage != null) {
          simWeightedSum += simulatedAverage * coef;
          simCoefSum += coef;
        }
        if (ueHasSim) hasSimulation = true;
      }
    });

    const realAvg = state.grades.average != null ? state.grades.average : (realCoefSum > 0 ? realWeightedSum / realCoefSum : null);
    const simAvg = simCoefSum > 0 ? simWeightedSum / simCoefSum : null;

    return {
      realAverage: realAvg,
      simulatedAverage: simAvg,
      hasSimulation
    };
  }

  // ──────────────────────────────────────────────
  // CONSTRUCTION DE L'UI
  // ──────────────────────────────────────────────

  function buildPageStructure() {
    const hideStyle = document.createElement('style');
    hideStyle.id = 'mye-grades-hide-style';
    hideStyle.innerHTML = `
      /* Au lieu de display: none, on utilise une méthode qui préserve l'existence dans le DOM 
         afin que les boutons d'origine (Recherche, Profil, Notifs) puissent toujours calculer leurs coordonnées */
      app-student-grades,
      app-student-home {
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        width: 0 !important;
        height: 0 !important;
        overflow: hidden !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }
      body {
        background-color: #F0F0F0 !important;
      }
    `;
    
    const oldStyle = document.getElementById('mye-grades-hide-style');
    if (oldStyle) oldStyle.remove();
    document.head.appendChild(hideStyle);

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
          <div class="mye-grade-label">Moyenne Générale</div>
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
        <div class="mye-grade-circle-container mye-grade-circle-container-sim" id="mye-grade-circle-container-sim" style="display:none; margin-top:20px;">
          <div class="mye-grade-label" style="color:#10b981;">Moyenne Estimée</div>
          <div class="mye-grade-circle">
            <svg viewBox="0 0 200 200">
              <circle class="mye-grade-circle-bg" cx="100" cy="100" r="${CIRCLE_RADIUS}" />
              <circle class="mye-grade-circle-fill" id="mye-grade-arc-sim" cx="100" cy="100" r="${CIRCLE_RADIUS}"
                stroke-dasharray="${CIRCLE_CIRCUMFERENCE}"
                stroke-dashoffset="${CIRCLE_CIRCUMFERENCE}" style="stroke:#10b981;" />
            </svg>
            <div class="mye-grade-circle-value" id="mye-grade-value-sim" style="color:#10b981;">—</div>
          </div>
        </div>
      </div>
      <div class="mye-grades-right" id="mye-grades-right">
        <div class="mye-grades-loading">
          <div class="mye-grades-spinner"></div>
          <div class="mye-grades-loading-text">Chargement des notes…</div>
        </div>
      </div>
    `;

    const oldContainer = document.getElementById('mye-grades-container');
    if (oldContainer) oldContainer.remove();
    document.body.appendChild(container);

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
    const btn = document.getElementById('mye-semester-btn');
    const dropdown = document.getElementById('mye-semester-dropdown');
    btn.classList.remove('open');
    dropdown.classList.remove('show');

    state.currentPeriod = sem.period;
    state.currentSchoolYear = sem.schoolYear;
    state.simulated = {}; // Réinitialiser le simulateur au changement de semestre

    document.getElementById('mye-semester-label').textContent = sem.label;
    populateSemesterDropdown();

    await loadAndRenderGrades(sem.schoolYear, sem.period, sem.data);
  }

  // ──────────────────────────────────────────────
  // CHARGEMENT & RENDU DES NOTES
  // ──────────────────────────────────────────────

  async function loadAndRenderGrades(schoolYear, period, cachedData) {
    const rightPanel = document.getElementById('mye-grades-right');
    if (!rightPanel) return;

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
        updateCircle();
        return;
      }

      state.grades = parsed;
      state.average = parsed.average;

      // Mettre en cache pour éviter de refetcher
      const semObj = state.semesters.find(s => s.period === period && s.schoolYear === schoolYear);
      if (semObj) {
        semObj.data = raw;
      }

      updateCircle();
      renderUEBlocks(parsed.ues, rightPanel);

    } catch (err) {
      console.error('📊 Erreur lors du chargement des notes:', err);
      
      let rawDataStr = "Non disponible";
      try {
        if (cachedData) rawDataStr = JSON.stringify(cachedData, null, 2);
        else {
          const activeSem = state.semesters.find(s => s.period === state.currentPeriod && s.schoolYear === state.currentSchoolYear);
          if (activeSem && activeSem.data) rawDataStr = JSON.stringify(activeSem.data, null, 2);
        }
      } catch(e) {}

      rightPanel.innerHTML = `
        <div class="mye-grades-error">
          <div class="mye-grades-error-icon">⚠️</div>
          <div class="mye-grades-error-text">Le format des données a changé ! J'ai besoin de ce code :</div>
          <textarea style="width:100%; height:300px; font-family:monospace; font-size:11px; margin-top:15px; padding:10px; border:2px solid #1d3b64; border-radius:10px;" onclick="this.select()">${rawDataStr}</textarea>
        </div>
      `;
      updateCircle();
    }
  }

  function updateCircle() {
    const arc = document.getElementById('mye-grade-arc');
    const arcSim = document.getElementById('mye-grade-arc-sim');
    const valueEl = document.getElementById('mye-grade-value');
    const valueSimEl = document.getElementById('mye-grade-value-sim');
    const containerSim = document.getElementById('mye-grade-circle-container-sim');
    if (!arc || !valueEl) return;

    const { realAverage, simulatedAverage, hasSimulation } = getGlobalAverages();

    // 1. Moyenne Réelle
    if (realAverage == null || isNaN(realAverage)) {
      arc.style.strokeDashoffset = CIRCLE_CIRCUMFERENCE;
      valueEl.innerHTML = '—';
    } else {
      const ratio = Math.min(realAverage / 20, 1);
      const offset = CIRCLE_CIRCUMFERENCE * (1 - ratio);
      arc.style.strokeDashoffset = offset;
      valueEl.innerHTML = `<div class="mye-grade-circle-value-real">${formatGrade(realAverage)}</div>`;
    }

    // 2. Moyenne Estimée (dans un second cercle en dessous)
    if (containerSim) {
      if (hasSimulation && simulatedAverage != null) {
        containerSim.style.display = 'block';
        if (arcSim && valueSimEl) {
          const ratioSim = Math.min(simulatedAverage / 20, 1);
          const offsetSim = CIRCLE_CIRCUMFERENCE * (1 - ratioSim);
          arcSim.style.strokeDashoffset = offsetSim;
          valueSimEl.innerHTML = `<div class="mye-grade-circle-value-sim">${formatGrade(simulatedAverage)}</div>`;
        }
      } else {
        containerSim.style.display = 'none';
      }
    }
  }

  function renderUEBlocks(ues, container) {
    container.innerHTML = '';

    ues.forEach((ue, ueIdx) => {
      const block = document.createElement('div');
      block.className = 'mye-ue-block';

      let maxEvals = 0;
      ue.subjects.forEach(sub => {
        let evalsCount = sub.evaluations.length;
        let sumCoef = sub.evaluations.reduce((sum, ev) => sum + (ev.coefficient || 0), 0);
        if (sumCoef > 0 && sumCoef < 0.99) evalsCount++;
        
        if (evalsCount > maxEvals) {
          maxEvals = evalsCount;
        }
      });

      const { realAverage: ueRealAvg, simulatedAverage: ueSimAvg, hasSimulation: ueHasSim } = getUEAverages(ueIdx);
      let ueGradeHTML = `<div class="mye-ue-grade">${formatGrade(ueRealAvg)}</div>`;
      if (ueHasSim && ueSimAvg != null) {
        ueGradeHTML = `
          <div class="mye-ue-grade" style="display:flex; align-items:baseline; gap:8px; padding:4px 12px;">
            <span>${formatGrade(ueRealAvg)}</span>
            <span style="font-size:13px; font-weight:700; color:#10b981; background-color:rgba(16,185,129,0.15); padding:2px 8px; border-radius:999px;">${formatGrade(ueSimAvg)} Est.</span>
          </div>
        `;
      }

      const headerHTML = `
        <div class="mye-ue-header">
          <h2 class="mye-ue-title">${escapeHTML(ue.name)}</h2>
          ${ueGradeHTML}
        </div>
      `;

      const subjectsHTML = ue.subjects.map((sub, subIdx) => buildSubjectCard(sub, maxEvals, ueIdx, subIdx)).join('');

      block.innerHTML = `
        ${headerHTML}
        <div class="mye-ue-subjects">${subjectsHTML}</div>
      `;

      container.appendChild(block);
    });
  }

  function buildSubjectCard(subject, maxEvals, ueIdx, subIdx) {
    const { realAverage, simulatedAverage, hasSimulation } = getSubjectAverages(ueIdx, subIdx);
    const hasSimClass = hasSimulation ? ' has-sim' : '';

    let gradeHTML = `<div class="mye-subject-grade">${formatGrade(realAverage)}</div>`;
    if (hasSimulation && simulatedAverage != null) {
      gradeHTML = `
        <div class="mye-subject-grade" style="display:flex; align-items:baseline; gap:6px;">
          <span class="mye-subject-grade-val">${formatGrade(realAverage)}</span>
          <span class="mye-subject-grade-sim" style="font-size:14px; color:#10b981; font-weight:700; background-color:#e8f8f0; padding:2px 6px; border-radius:6px; white-space:nowrap;">${formatGrade(simulatedAverage)} Est.</span>
        </div>
      `;
    }

    let evals = [...subject.evaluations];
    let sumCoef = evals.reduce((sum, ev) => sum + (ev.coefficient || 0), 0);
    if (sumCoef > 0 && sumCoef < 0.99) {
      evals.push({
        type: 'Évaluation(s) future(s)',
        coefficient: 1.0 - sumCoef,
        value: null,
        isVirtual: true
      });
    }

    const detailsHTML = evals.map((ev, evIdx) => {
      const simKey = `${ueIdx}-${subIdx}-${evIdx}`;
      const simVal = state.simulated[simKey];
      const isSimulated = simVal !== undefined;
      const displayVal = isSimulated ? simVal : ev.value;
      const simulatedStyle = isSimulated ? 'style="color:#10b981; font-weight:700;"' : '';

      return `
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
            <div class="mye-detail-value" ${simulatedStyle}>${formatGrade(displayVal)}</div>
          </div>
        </div>
      `;
    }).join('');

    let emptyRows = '';
    const emptyCount = maxEvals - evals.length;
    for (let i = 0; i < emptyCount; i++) {
      emptyRows += '<div class="mye-detail-row" style="visibility:hidden"><div class="mye-detail-left"><span class="mye-detail-type">-</span></div></div>';
    }

    return `
      <div class="mye-subject-card${hasSimClass}" data-ue-idx="${ueIdx}" data-sub-idx="${subIdx}">
        <div class="mye-subject-top">
          <div class="mye-subject-name-container">
            <div class="mye-subject-name">${escapeHTML(subject.name)}</div>
            <div class="mye-subject-coef">${subject.coefficient != null ? `Coef. ${subject.coefficient}` : ''}</div>
          </div>
          ${gradeHTML}
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
      if (path.startsWith('http') || path.startsWith('/api/')) return path;
      return `/api/rest/student/exam/file?pathname=${encodeURIComponent(path)}`;
    }
    
    return '#';
  }

  // ──────────────────────────────────────────────
  // LOGIQUE DU SIMULATEUR DE NOTES
  // ──────────────────────────────────────────────

  function updateMainPageGrades() {
    if (!state.grades) return;
    updateCircle();
    const rightPanel = document.getElementById('mye-grades-right');
    if (rightPanel) {
      renderUEBlocks(state.grades.ues, rightPanel);
    }
  }

  function updateModalRequiredGrades(ueIdx, subIdx) {
    const reqBox = document.getElementById('mye-sim-req-box');
    if (!reqBox) return;

    const ue = state.grades.ues[ueIdx];
    const sub = ue.subjects[subIdx];

    let evals = [...sub.evaluations];
    let sumCoef = evals.reduce((sum, ev) => sum + (ev.coefficient || 0), 0);
    if (sumCoef > 0 && sumCoef < 0.99) {
      evals.push({
        type: 'Évaluation(s) future(s)',
        coefficient: 1.0 - sumCoef,
        value: null,
        isVirtual: true
      });
    }

    const missingEvals = evals.filter((ev, evIdx) => {
      const simKey = `${ueIdx}-${subIdx}-${evIdx}`;
      return ev.value == null && state.simulated[simKey] === undefined;
    });

    if (missingEvals.length === 0) {
      reqBox.style.display = 'none';
      return;
    }

    reqBox.style.display = 'flex';

    let sumUECoef = 0;
    let sumUEWeightedVal = 0;
    let thisSubCoef = sub.coefficient != null ? sub.coefficient : 1.0;

    ue.subjects.forEach((otherSub, otherIdx) => {
      const coef = otherSub.coefficient != null ? otherSub.coefficient : 1.0;
      sumUECoef += coef;
      if (otherIdx !== parseInt(subIdx, 10)) {
        const { simulatedAverage } = getSubjectAverages(ueIdx, otherIdx);
        if (simulatedAverage != null) {
          sumUEWeightedVal += simulatedAverage * coef;
        }
      }
    });

    let T_ue = (10 * sumUECoef - sumUEWeightedVal) / thisSubCoef;
    if (T_ue < 0) T_ue = 0;

    let otherSubsFailedNames = [];
    ue.subjects.forEach((otherSub, otherIdx) => {
      if (otherIdx !== parseInt(subIdx, 10)) {
        const { simulatedAverage } = getSubjectAverages(ueIdx, otherIdx);
        if (simulatedAverage != null && simulatedAverage < 8) {
          otherSubsFailedNames.push(otherSub.name);
        }
      }
    });

    const isCompensationPossible = otherSubsFailedNames.length === 0;
    const T_direct = Math.max(8, T_ue);
    const T_comp = Math.max(6, T_ue);

    let sumECoef = evals.reduce((sum, ev) => sum + (ev.coefficient || (sumCoef === 0 ? 1.0 : 0)), 0);
    if (sumCoef === 0) sumECoef = evals.length;

    let sumKWeighted = 0;
    let sumMCoef = 0;

    evals.forEach((ev, evIdx) => {
      const coef = ev.coefficient != null ? ev.coefficient : 1.0;
      const simKey = `${ueIdx}-${subIdx}-${evIdx}`;
      const simVal = state.simulated[simKey];

      if (simVal !== undefined) {
        if (simVal !== null) sumKWeighted += simVal * coef;
      } else if (ev.value != null) {
        sumKWeighted += ev.value * coef;
      } else {
        sumMCoef += coef;
      }
    });

    let html = '';

    if (sumMCoef > 0) {
      const G_direct = (T_direct * sumECoef - sumKWeighted) / sumMCoef;
      
      if (!isCompensationPossible) {
        reqBox.className = 'mye-sim-req-box mye-sim-req-comp';
        html = `
          <h5 class="mye-sim-req-title">⚠️ Compensation non disponible</h5>
          <p style="margin: 0; font-size: 13px; color: #78350f;">La matière <strong>${escapeHTML(otherSubsFailedNames.join(', '))}</strong> est en dessous de 8. Vous ne pouvez pas compenser.</p>
          <ul class="mye-sim-req-list">
            <li>Pour valider le module : il vous faut au moins <strong>${G_direct > 20 ? 'Impossible' : (G_direct <= 0 ? 'Déjà atteint' : G_direct.toFixed(2).replace('.', ','))}/20</strong> aux évaluations restantes.</li>
          </ul>
        `;
      } else {
        reqBox.className = 'mye-sim-req-box';
        const G_comp = (T_comp * sumECoef - sumKWeighted) / sumMCoef;

        const formatReqGrade = (g) => {
          if (g > 20) return '<span style="color:#ef4444; font-weight:700;">Impossible (>20)</span>';
          if (g <= 0) return '<span style="color:#2ecc71; font-weight:700;">Déjà atteint (0/20)</span>';
          return `au moins <strong>${g.toFixed(2).replace('.', ',')}/20</strong>`;
        };

        html = `
          <h5 class="mye-sim-req-title">🎯 Notes minimales requises</h5>
          <ul class="mye-sim-req-list">
            <li><strong>Validation directe (Matière &ge; ${T_direct.toFixed(1).replace('.', ',')}) :</strong> ${formatReqGrade(G_direct)}</li>
            <li><strong>Validation par compensation (Matière &ge; ${T_comp.toFixed(1).replace('.', ',')}) :</strong> ${formatReqGrade(G_comp)}</li>
          </ul>
        `;
      }
    } else {
      reqBox.style.display = 'none';
    }

    reqBox.innerHTML = html;
  }

  function updateModalStatuses(ueIdx, subIdx) {
    const subAvgEl = document.getElementById('mye-sim-sub-avg');
    const subStatusEl = document.getElementById('mye-sim-sub-status');
    const ueAvgEl = document.getElementById('mye-sim-ue-avg');
    const ueStatusEl = document.getElementById('mye-sim-ue-status');

    if (!subAvgEl || !subStatusEl || !ueAvgEl || !ueStatusEl) return;

    const ue = state.grades.ues[ueIdx];
    const { simulatedAverage: subSimAvg } = getSubjectAverages(ueIdx, subIdx);
    const { simulatedAverage: ueSimAvg } = getUEAverages(ueIdx);

    subAvgEl.textContent = formatGrade(subSimAvg);
    ueAvgEl.textContent = formatGrade(ueSimAvg);

    let otherSubsFailedCount = 0;
    ue.subjects.forEach((otherSub, otherIdx) => {
      if (otherIdx !== parseInt(subIdx, 10)) {
        const { simulatedAverage } = getSubjectAverages(ueIdx, otherIdx);
        if (simulatedAverage != null && simulatedAverage < 8) {
          otherSubsFailedCount++;
        }
      }
    });

    if (subSimAvg == null) {
      subStatusEl.textContent = 'Aucune note';
      subStatusEl.className = 'mye-sim-status-badge';
    } else if (subSimAvg >= 8) {
      subStatusEl.textContent = 'Validée';
      subStatusEl.className = 'mye-sim-status-badge mye-badge-valid';
    } else if (subSimAvg >= 6 && otherSubsFailedCount === 0 && ueSimAvg != null && ueSimAvg >= 10) {
      subStatusEl.textContent = 'Compensée';
      subStatusEl.className = 'mye-sim-status-badge mye-badge-compensated';
    } else {
      subStatusEl.textContent = 'Non validée';
      subStatusEl.className = 'mye-sim-status-badge mye-badge-invalid';
    }

    let ueValid = false;
    if (ueSimAvg != null && ueSimAvg >= 10) {
      let under8Count = 0;
      let under6Count = 0;
      ue.subjects.forEach((otherSub, idx) => {
        const { simulatedAverage } = getSubjectAverages(ueIdx, idx);
        if (simulatedAverage != null) {
          if (simulatedAverage < 6) under6Count++;
          else if (simulatedAverage < 8) under8Count++;
        }
      });
      if (under6Count === 0 && under8Count <= 1) {
        ueValid = true;
      }
    }

    if (ueSimAvg == null) {
      ueStatusEl.textContent = 'Aucune note';
      ueStatusEl.className = 'mye-sim-status-badge';
    } else if (ueValid) {
      ueStatusEl.textContent = 'Validé';
      ueStatusEl.className = 'mye-sim-status-badge mye-badge-valid';
    } else {
      ueStatusEl.textContent = 'Non validé';
      ueStatusEl.className = 'mye-sim-status-badge mye-badge-invalid';
    }
  }

  function openSimulator(ueIdx, subIdx) {
    let overlay = document.getElementById('mye-simulator-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'mye-simulator-overlay';
      overlay.className = 'mye-simulator-overlay';
      document.body.appendChild(overlay);
    }

    const ue = state.grades.ues[ueIdx];
    const sub = ue.subjects[subIdx];

    let evals = [...sub.evaluations];
    let sumCoef = evals.reduce((sum, ev) => sum + (ev.coefficient || 0), 0);
    if (sumCoef > 0 && sumCoef < 0.99) {
      evals.push({
        type: 'Évaluation(s) future(s)',
        coefficient: 1.0 - sumCoef,
        value: null,
        isVirtual: true
      });
    }

    let evalRowsHTML = evals.map((ev, evIdx) => {
      const simKey = `${ueIdx}-${subIdx}-${evIdx}`;
      const simVal = state.simulated[simKey];
      const isSimulated = simVal !== undefined;
      const currentVal = isSimulated ? simVal : ev.value;
      const isDefinitive = ev.value != null;
      const disabledAttr = isDefinitive ? 'disabled' : '';
      const inputClass = isSimulated ? 'simulated' : (ev.value == null ? 'placeholder-sim' : '');

      return `
        <div class="mye-sim-eval-row">
          <div class="mye-sim-eval-info">
            <span class="mye-sim-eval-name">${escapeHTML(ev.type)}</span>
            <span class="mye-sim-eval-coef">Coef ${formatCoef(ev.coefficient)}</span>
          </div>
          <div class="mye-sim-eval-input-container">
            <input type="number" step="0.25" min="0" max="20"
                   class="mye-sim-eval-input ${inputClass}"
                   data-ue-idx="${ueIdx}" data-sub-idx="${subIdx}" data-eval-idx="${evIdx}"
                   value="${currentVal !== null && currentVal !== undefined ? currentVal : ''}"
                   placeholder="${ev.value == null ? 'Simuler' : ''}"
                   ${disabledAttr}>
            <span class="mye-sim-eval-max">/20</span>
          </div>
        </div>
      `;
    }).join('');

    const { realAverage: realSubAvg, simulatedAverage: simSubAvg } = getSubjectAverages(ueIdx, subIdx);
    const { realAverage: realUEAvg, simulatedAverage: simUEAvg } = getUEAverages(ueIdx);

    overlay.innerHTML = `
      <div class="mye-simulator-modal" id="mye-simulator-modal">
        <div class="mye-simulator-header">
          <button class="mye-simulator-close" id="mye-simulator-close-btn" title="Fermer">&times;</button>
          <div class="mye-simulator-header-text">
            <h3 class="mye-simulator-subject-name">${escapeHTML(sub.name)}</h3>
            <p class="mye-simulator-ue-name">${escapeHTML(ue.name)}</p>
          </div>
        </div>
        <div class="mye-simulator-body">
          <div class="mye-sim-status-box">
            <div class="mye-sim-stat">
              <span class="mye-sim-stat-label">Moyenne Matière</span>
              <div class="mye-sim-stat-values">
                <span class="mye-sim-val-real">${formatGrade(realSubAvg)}</span>
                <span class="mye-sim-val-sep">→</span>
                <span class="mye-sim-val-sim" id="mye-sim-sub-avg">${formatGrade(simSubAvg)}</span>
              </div>
              <span class="mye-sim-status-badge" id="mye-sim-sub-status">...</span>
            </div>
            
            <div class="mye-sim-stat">
              <span class="mye-sim-stat-label">Moyenne UE</span>
              <div class="mye-sim-stat-values">
                <span class="mye-sim-val-real">${formatGrade(realUEAvg)}</span>
                <span class="mye-sim-val-sep">→</span>
                <span class="mye-sim-val-sim" id="mye-sim-ue-avg">${formatGrade(simUEAvg)}</span>
              </div>
              <span class="mye-sim-status-badge" id="mye-sim-ue-status">...</span>
            </div>
          </div>

          <div class="mye-sim-req-box" id="mye-sim-req-box">
            <!-- Rempli en JS -->
          </div>

          <div class="mye-sim-eval-list">
            <h4>Simulateur de Notes</h4>
            <div id="mye-sim-eval-rows">
              ${evalRowsHTML}
            </div>
          </div>
        </div>
        <div class="mye-simulator-footer">
          <button class="mye-sim-btn-reset" id="mye-sim-reset-btn">Réinitialiser</button>
        </div>
      </div>
    `;

    overlay.classList.add('show');

    const closeBtn = document.getElementById('mye-simulator-close-btn');
    closeBtn.onclick = () => overlay.classList.remove('show');
    overlay.onclick = (e) => {
      if (e.target === overlay) overlay.classList.remove('show');
    };

    updateModalStatuses(ueIdx, subIdx);
    updateModalRequiredGrades(ueIdx, subIdx);

    const inputs = overlay.querySelectorAll('.mye-sim-eval-input');
    inputs.forEach(input => {
      input.addEventListener('input', (e) => {
        const valStr = e.target.value.trim();
        const evIdx = input.getAttribute('data-eval-idx');
        const simKey = `${ueIdx}-${subIdx}-${evIdx}`;

        if (valStr === '') {
          delete state.simulated[simKey];
          input.classList.remove('simulated');
          if (evals[evIdx].value == null) {
            input.classList.add('placeholder-sim');
          }
        } else {
          let val = parseFloat(valStr.replace(',', '.'));
          if (isNaN(val)) val = 0;
          if (val < 0) val = 0;
          if (val > 20) val = 20;

          state.simulated[simKey] = val;
          input.classList.add('simulated');
          input.classList.remove('placeholder-sim');
        }

        updateModalStatuses(ueIdx, subIdx);
        updateModalRequiredGrades(ueIdx, subIdx);
        updateMainPageGrades();
      });
    });

    const resetBtn = document.getElementById('mye-sim-reset-btn');
    resetBtn.onclick = () => {
      evals.forEach((_, evIdx) => {
        const simKey = `${ueIdx}-${subIdx}-${evIdx}`;
        delete state.simulated[simKey];
      });

      inputs.forEach((input, evIdx) => {
        input.value = evals[evIdx].value != null ? evals[evIdx].value : '';
        input.classList.remove('simulated');
        if (evals[evIdx].value == null) {
          input.classList.add('placeholder-sim');
        }
      });

      updateModalStatuses(ueIdx, subIdx);
      updateModalRequiredGrades(ueIdx, subIdx);
      updateMainPageGrades();
    };
  }

  // Écouteur global pour intercepter les clics sur les matières et ouvrir le simulateur
  document.addEventListener('click', function(e) {
    if (e.target.closest('.mye-exam-file-link') || e.target.closest('.mye-pdf-overlay') || e.target.closest('.mye-simulator-overlay')) return;

    const card = e.target.closest('.mye-subject-card');
    if (card) {
      e.preventDefault();
      e.stopPropagation();
      const ueIdx = card.getAttribute('data-ue-idx');
      const subIdx = card.getAttribute('data-sub-idx');
      if (ueIdx !== null && subIdx !== null) {
        openSimulator(ueIdx, subIdx);
      }
    }
  }, true);

  // ──────────────────────────────────────────────
  // GESTION DU LECTEUR DE PDF
  // ──────────────────────────────────────────────

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
      
      document.getElementById('mye-pdf-modal').addEventListener('click', function(e) {
        e.stopPropagation();
      });
      
      document.getElementById('mye-pdf-close-btn').addEventListener('click', function(e) {
        e.stopPropagation();
        myeClosePdf();
      });
      overlay.addEventListener('click', myeClosePdf);
    }
    
    const iframe = document.getElementById('mye-pdf-iframe');
    const downloadBtn = document.getElementById('mye-pdf-download');
    
    downloadBtn.href = url;
    iframe.removeAttribute('src');
    iframe.srcdoc = '<html style="height:100%;"><body style="display:flex;justify-content:center;align-items:center;height:100%;margin:0;font-family:sans-serif;color:#1d3b64;"><h3>Chargement de la copie en cours...</h3></body></html>';
    
    setTimeout(() => {
      overlay.classList.add('mye-pdf-show');
    }, 10);

    try {
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Erreur réseau');
      
      const blob = await response.blob();
      const pdfBlob = new Blob([blob], { type: 'application/pdf' });
      const objectUrl = URL.createObjectURL(pdfBlob);
      
      iframe.removeAttribute('srcdoc');
      iframe.src = objectUrl;
      overlay.dataset.objectUrl = objectUrl;
    } catch (err) {
      console.error("Erreur chargement PDF:", err);
      iframe.srcdoc = '<html style="height:100%;"><body style="display:flex;justify-content:center;align-items:center;height:100%;margin:0;font-family:sans-serif;color:#ff3385;"><h3>Erreur : Impossible de charger la copie.</h3></body></html>';
    }
  }

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
      }, 300);
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
    buildPageStructure();

    try {
      console.log('📊 Recherche des semestres disponibles…');
      const found = await discoverSemesters();

      if (found.length === 0) {
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

      state.semesters = found.map(f => ({
        period: f.period,
        schoolYear: f.schoolYear,
        label: getSemesterLabel(f.period, f.schoolYear),
        data: f.data
      }));

      const current = state.semesters[state.semesters.length - 1];
      state.currentPeriod = current.period;
      state.currentSchoolYear = current.schoolYear;

      document.getElementById('mye-semester-label').textContent = current.label;
      populateSemesterDropdown();

      await loadAndRenderGrades(current.schoolYear, current.period, current.data);

    } catch (err) {
      console.error('📊 Erreur fatale:', err);
      
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

  function waitAndInit() {
    const hideStyle = document.createElement('style');
    hideStyle.id = 'mye-hide-all-style';
    hideStyle.innerHTML = `
      body > *:not(#mye-custom-header-wrapper):not(#mye-grades-container):not(#mye-pdf-overlay):not(#mye-simulator-overlay):not(script):not(style):not(link):not(.MuiPopover-root):not(.MuiPopper-root):not(.MuiModal-root):not(#simple-popper-efrei):not(.MuiAutocomplete-popper) {
        visibility: hidden !important;
        position: absolute !important;
        width: 0 !important;
        height: 0 !important;
        overflow: hidden !important;
        pointer-events: none !important;
      }
      html, body {
        background-color: #F0F0F0 !important;
      }
    `;
    
    const existingStyle = document.getElementById('mye-hide-all-style');
    if (existingStyle) existingStyle.remove();
    document.head.appendChild(hideStyle);

    const container = document.getElementById('mye-grades-container');
    if (container) container.style.display = 'block';

    const checkHeader = setInterval(() => {
      if (document.getElementById('mye-custom-header-wrapper') || document.getElementById('mye-custom-header')) {
        clearInterval(checkHeader);
        if (!document.getElementById('mye-grades-container')) setTimeout(init, 300);
      }
    }, 200);

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

  let lastGradesUrl = window.location.href;
  setInterval(() => {
    if (lastGradesUrl !== window.location.href) {
      lastGradesUrl = window.location.href;
      
      if (window.location.pathname.includes('/portal/student/grades')) {
        if (!document.getElementById('mye-grades-container')) {
          waitAndInit();
        } else {
          const hideStyle = document.getElementById('mye-hide-all-style');
          if (!hideStyle) waitAndInit();
          else document.getElementById('mye-grades-container').style.display = 'block';
        }
      } else {
        const hideStyle = document.getElementById('mye-hide-all-style');
        if (hideStyle) hideStyle.remove();
        const container = document.getElementById('mye-grades-container');
        if (container) container.style.display = 'none';
      }
    }
  }, 500);

})();
