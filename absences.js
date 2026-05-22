// =============================================
//  MYEFREI ULTRA — Module Absences
// =============================================

(function () {
  'use strict';

  console.log('🛑 MyEfrei ULTRA — Module Absences (Chargé)');

  const CIRCLE_RADIUS = 90;
  const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

  let state = {
    currentPeriod: null,
    currentSchoolYear: null,
    semesters: [],
    absencesData: [],
    maxAbsences: 15
  };

  // ──────────────────────────────────────────────
  // INITIALISATION
  // ──────────────────────────────────────────────
  async function init() {
    console.log('🛑 Initialisation Module Absences...');
    document.body.classList.add('mye-clean-screen');
    
    // Inject Style for Body
    if (!document.getElementById('mye-absences-hide-style')) {
      const hideStyle = document.createElement('style');
      hideStyle.id = 'mye-absences-hide-style';
      hideStyle.innerHTML = `
        body {
          background-color: #F0F0F0 !important;
        }
      `;
      document.head.appendChild(hideStyle);
    }
    
    // Inject Container
    if (!document.getElementById('mye-absences-container')) {
      const container = document.createElement('div');
      container.id = 'mye-absences-container';
      container.className = 'mye-page-container';
      
      container.innerHTML = `
        <div class="mye-absences-left">
          <div class="mye-semester-selector" id="mye-semester-selector">
            <button class="mye-semester-btn" id="mye-semester-btn">
              <span id="mye-semester-label">Chargement…</span>
              <span class="mye-semester-arrow">▼</span>
            </button>
            <div class="mye-semester-dropdown" id="mye-semester-dropdown"></div>
          </div>
          
          <div class="mye-grade-sim-card">
            <div class="mye-grade-sim-label" style="font-size: 24px;">Absences non excusées</div>
            <div class="mye-grade-sim-value" id="mye-abs-value" style="font-size: 48px;">—</div>
            <div class="mye-grade-sim-track">
              <div class="mye-grade-sim-progress" id="mye-abs-arc" style="width: 0%; background-color: #ef4444;"></div>
            </div>
            <div class="mye-grade-disclaimer" style="margin-top: 15px; color: #666; font-size: 13px;">Sur 15 autorisées</div>
          </div>

          <div class="mye-grade-sim-card">
            <div class="mye-grade-sim-label" style="font-size: 24px;">Retards</div>
            <div class="mye-grade-sim-value" id="mye-ret-value" style="font-size: 48px;">—</div>
            <div class="mye-grade-sim-track">
              <div class="mye-grade-sim-progress" id="mye-ret-arc" style="width: 0%; background-color: #f59e0b;"></div>
            </div>
          </div>
        </div>

        <div class="mye-absences-right" id="mye-absences-right">
          <div class="mye-grades-loading">
            <div class="mye-grades-spinner"></div>
            <div class="mye-grades-loading-text">Chargement des absences…</div>
          </div>
        </div>
      `;
      
      document.body.appendChild(container);
      initSemesterEvents();
    }

    try {
      state.semesters = await discoverSemesters();
      if (state.semesters.length > 0) {
        // Selection du plus recent
        const current = state.semesters[state.semesters.length - 1];
        await selectSemester(current);
      }
    } catch (e) {
      console.error('Erreur init absences:', e);
    }
  }

  // ──────────────────────────────────────────────
  // SÉLECTEUR DE SEMESTRE (COPIÉ DE GRADES.JS)
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
    
    // Copie inversée pour avoir le plus récent en premier
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
    if (btn) btn.classList.remove('open');
    if (dropdown) dropdown.classList.remove('show');

    state.currentPeriod = sem.period;
    state.currentSchoolYear = sem.schoolYear;
    
    document.getElementById('mye-semester-label').textContent = sem.label;
    populateSemesterDropdown();

    await loadAndRenderAbsences(sem.schoolYear, sem.period);
  }

  async function discoverSemesters() {
    try {
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
              label: formatSemesterLabel(p.period, p.schoolYear)
            });
          }
        }
      }
      
      found.sort((a, b) => {
        const numA = parseInt(a.period.replace('S', ''), 10) || 0;
        const numB = parseInt(b.period.replace('S', ''), 10) || 0;
        return numA - numB;
      });
      return found;
    } catch (e) {
      return [];
    }
  }

  function formatSemesterLabel(period, schoolYear) {
    const num = parseInt(period.replace('S', ''), 10);
    const years = schoolYear.split('-');
    const displayYear = (num % 2 !== 0) ? years[0] : years[1];
    return `Semestre ${num} - ${displayYear}`;
  }

  // ──────────────────────────────────────────────
  // CHARGEMENT ET RENDU
  // ──────────────────────────────────────────────
  async function loadAndRenderAbsences(schoolYear, period) {
    const rightPanel = document.getElementById('mye-absences-right');
    if (!rightPanel) return;

    rightPanel.innerHTML = `
      <div class="mye-grades-loading">
        <div class="mye-grades-spinner"></div>
        <div class="mye-grades-loading-text">Chargement des absences…</div>
      </div>
    `;

    try {
      const res = await fetch(`/api/rest/student/absences?schoolYear=${schoolYear}&period=${period}`, { credentials: 'include' });
      let data = [];
      if (res.ok) {
          const raw = await res.json();
          state.rawApiData = raw;
          console.log('📦 RÉPONSE BRUTE API ABSENCES:', raw);
          if (Array.isArray(raw)) data = raw;
          else if (raw && Array.isArray(raw.data)) data = raw.data;
          else if (raw && Array.isArray(raw.absences)) data = raw.absences;
      }
      state.absencesData = data;
    } catch(e) {
      console.error("Erreur API Absences", e);
      state.absencesData = [];
    }
    
    renderData();
  }

  function renderData() {
    const rightPanel = document.getElementById('mye-absences-right');
    
    let absCountUnjustified = 0;
    let absCountTotal = 0;
    let retCount = 0;

    let html = '<div class="mye-absences-title-section">Liste de vos absences et retards</div>';

    if (!state.absencesData || state.absencesData.length === 0) {
      html += `
        <div class="mye-absences-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 15px; opacity: 0.5;">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          Aucune absence ni retard pour ce semestre !
        </div>
      `;
    } else {
      let nonExcusedHtml = '';
      let excusedHtml = '';

      state.absencesData.sort((a, b) => new Date(b.startDateTime || b.date || 0) - new Date(a.startDateTime || a.date || 0));

      state.absencesData.forEach(item => {
        const itemType = (item.type || '').toLowerCase();
        const itemStatus = (item.status || '').toLowerCase();

        const isRetard = itemType === 'lateness' || itemType === 'late' || (item.label && item.label.toLowerCase().includes('retard'));
        const isAbsence = !isRetard;
        const justified = item.justified === true || itemStatus === 'excused' || itemStatus === 'justified';
        
        if (isAbsence) {
            absCountTotal++;
            if (!justified) absCountUnjustified++;
        }
        if (isRetard) retCount++;

        let typeClass = isAbsence ? 'absence' : 'retard';
        let typeLabel = isAbsence ? 'ABSENCE' : 'RETARD';
        
        if (justified) {
            typeLabel = 'EXCUSÉ(E)';
            typeClass = 'excused';
        }
        
        let dateLabel = item.startDateTime || item.date || item.start || 'Date inconnue';
        let startDateObj = null;
        if (dateLabel && dateLabel.includes('T')) {
           startDateObj = new Date(dateLabel);
           dateLabel = startDateObj.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', ' à');
        }
        
        let remainingDaysHtml = '';
        if (!justified && startDateObj && !isNaN(startDateObj.getTime())) {
            const deadline = new Date(startDateObj);
            deadline.setDate(deadline.getDate() + 15);
            const now = new Date();
            const diffTime = deadline - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays > 0) {
                remainingDaysHtml = `<div style="font-size: 11px; color: #f59e0b; margin-top: 5px; font-weight: 600;">⚠️ Reste ${diffDays} jour${diffDays > 1 ? 's' : ''} pour justifier</div>`;
            } else {
                remainingDaysHtml = `<div style="font-size: 11px; color: #ef4444; margin-top: 5px; font-weight: 600;">❌ Délai dépassé (15j)</div>`;
            }
        }
        
        const courseName = item.moduleName || item.courseName || item.course || item.subject || 'Cours indéterminé';

        const cardHtml = `
          <div class="mye-absence-card">
            <div class="mye-absence-top">
              <div class="mye-absence-info">
                <div class="mye-absence-course">${courseName}</div>
                <div class="mye-absence-date">${dateLabel}</div>
              </div>
              <div class="mye-absence-type-container">
                <div class="mye-absence-type ${typeClass}">${typeLabel}</div>
                ${remainingDaysHtml}
              </div>
            </div>
            <div class="mye-absence-bottom">
              <div class="mye-detail-row" style="background-color: rgba(255, 255, 255, 0.15); border-radius: 999px; padding: 4px 15px; display: flex; justify-content: space-between; align-items: center; color: white; font-size: 13px;">
                <div class="mye-detail-left" style="display: flex; gap: 8px; align-items: center;">
                  <span style="font-weight: 500;">Statut</span>
                </div>
                <div class="mye-detail-right" style="display: flex; align-items: center; gap: 6px; font-weight: 500; color: ${justified ? '#2ecc71' : '#ef4444'};">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    ${justified 
                      ? '<path d="M20 6L9 17l-5-5"></path>'
                      : '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>'
                    }
                  </svg>
                  ${justified ? 'Excusé(e)' : 'Non excusé(e)'}
                </div>
              </div>
            </div>
          </div>
        `;

        if (justified) {
            excusedHtml += cardHtml;
        } else {
            nonExcusedHtml += cardHtml;
        }
      });
      
      html = '';
      if (nonExcusedHtml !== '') {
          html += `
            <div class="mye-absences-title-section" style="margin-top: 0;">À justifier</div>
            <div class="mye-absences-grid">
              ${nonExcusedHtml}
            </div>
          `;
      }
      
      if (excusedHtml !== '') {
          html += `
            <div class="mye-absences-title-section" style="margin-top: ${nonExcusedHtml !== '' ? '40px' : '0'};">Absences et retards excusés</div>
            <div class="mye-absences-grid">
              ${excusedHtml}
            </div>
          `;
      }
      
      if (html === '') {
          // Fallback if everything somehow filtered out but array length > 0
          html = '<div class="mye-absences-empty">Aucune donnée à afficher.</div>';
      }
    }

    if (rightPanel) rightPanel.innerHTML = html;

    // Update Circles
    const absValue = document.getElementById('mye-abs-value');
    const absArc = document.getElementById('mye-abs-arc');
    if (absValue) absValue.textContent = absCountUnjustified;
    
    if (absArc) {
      let pct = Math.min(absCountUnjustified / state.maxAbsences, 1);
      setTimeout(() => {
        absArc.style.width = (pct * 100) + '%';
        if (absCountUnjustified === 0) absArc.style.backgroundColor = '#10b981';
        else if (absCountUnjustified > 0 && absCountUnjustified < 10) absArc.style.backgroundColor = '#f59e0b';
        else absArc.style.backgroundColor = '#ef4444';
      }, 50);
    }

    const retValue = document.getElementById('mye-ret-value');
    const retArc = document.getElementById('mye-ret-arc');
    if (retValue) retValue.textContent = retCount;
    if (retArc) {
      let pct = Math.min(retCount / 10, 1);
      setTimeout(() => {
        retArc.style.width = (pct * 100) + '%';
        if (retCount === 0) retArc.style.backgroundColor = '#10b981';
        else retArc.style.backgroundColor = '#f59e0b';
      }, 50);
    }
  }

  // ──────────────────────────────────────────────
  // HOOKS DE NAVIGATION
  // ──────────────────────────────────────────────
  function waitAndInit() {
    setTimeout(() => {
      if (!document.getElementById('mye-absences-container')) {
        init();
      }
    }, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (window.location.pathname.includes('/portal/student/absences')) waitAndInit();
    });
  } else {
    if (window.location.pathname.includes('/portal/student/absences')) waitAndInit();
  }

  let lastUrl = window.location.href;
  setInterval(() => {
    if (lastUrl !== window.location.href) {
      lastUrl = window.location.href;
      
      if (window.location.pathname.includes('/portal/student/absences')) {
        if (!document.getElementById('mye-absences-container')) {
          waitAndInit();
        } else {
          document.body.classList.add('mye-clean-screen');
          document.getElementById('mye-absences-container').style.display = 'flex';
        }
      } else {
        document.body.classList.remove('mye-clean-screen');
        const container = document.getElementById('mye-absences-container');
        if (container) container.style.display = 'none';
      }
    }
  }, 500);

})();
