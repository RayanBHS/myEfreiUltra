// =============================================
//  MYEFREI ULTRA — Module Planning (planning.js)
// =============================================

(function () {
  'use strict';

  console.log('📅 MyEfrei ULTRA — Module Planning (Chargé)');

  // ──────────────────────────────────────────────
  // ÉTAT GLOBAL
  // ──────────────────────────────────────────────
  let state = {
    currentDate: new Date(), // Date de référence affichée
    currentView: 'week',     // 'day', 'week', 'month'
    events: [],              // Cours de la période courante
    loading: true
  };

  const defaultSettings = {
    colors: {
      'CC': '#ff3b30',
      'CE': '#ff3b30',
      'DE': '#ff3b30',
      'TAI': '#ff3b30',
      'CM': '#34c759',
      'TD': '#007aff',
      'TP': '#ff9500',
      'Projet': '#af52de',
      'Cours': '#8e8e93'
    },
    displayStart: 7.5,
    displayEnd: 20.0
  };

  let userSettings = { ...defaultSettings };

  function loadSettings() {
    try {
      const saved = localStorage.getItem('mye-planning-settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        userSettings = { ...defaultSettings, ...parsed };
        userSettings.colors = { ...defaultSettings.colors, ...(parsed.colors || {}) };
      }
    } catch(e) {}
  }

  function saveSettings() {
    localStorage.setItem('mye-planning-settings', JSON.stringify(userSettings));
  }

  function applyColors() {
    let styleTag = document.getElementById('mye-custom-colors');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'mye-custom-colors';
      document.head.appendChild(styleTag);
    }
    
    let css = '';
    Object.entries(userSettings.colors).forEach(([type, hex]) => {
      // Nettoyer les accents/espaces pour correspondre aux classes CSS
      let tNorm = type.toLowerCase();
      if (tNorm === 'cours') tNorm = 'cours'; // default fallback
      const cls = '.mac-course-' + tNorm;
      const lightHex = hex.length === 7 ? hex + '26' : hex; // 15% opacity
      css += `${cls} { --course-bg: ${hex} !important; --course-bg-light: ${lightHex} !important; }\n`;
    });
    styleTag.textContent = css;
  }

  // ──────────────────────────────────────────────
  // FONCTIONS DE DATES
  // ──────────────────────────────────────────────

  function getPeriodRange(date, view) {
    const current = new Date(date);
    let start, end;

    if (view === 'day') {
      start = new Date(current);
      start.setHours(0, 0, 0, 0);
      end = new Date(current);
      end.setHours(23, 59, 59, 999);
    } else if (view === 'week') {
      const day = current.getDay();
      const diff = current.getDate() - day + (day === 0 ? -6 : 1);
      start = new Date(current.setDate(diff));
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else if (view === 'month') {
      start = new Date(current.getFullYear(), current.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      end = new Date(current.getFullYear(), current.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
    }

    return { start, end };
  }

  function formatDateISO(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function formatTime(date) {
    if (!date) return '—';
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  // ──────────────────────────────────────────────
  // RÉCUPÉRATION DES DONNÉES (DIRECT FETCH)
  // ──────────────────────────────────────────────

  async function fetchPlanningForPeriod(date) {
    const { start, end } = getPeriodRange(date, state.currentView);
    
    let fetchStart = start;
    let fetchEnd = end;

    // Pour le mois, on a besoin de déborder sur la semaine complète précédente et suivante
    if (state.currentView === 'month') {
      const startDay = start.getDay();
      const diffStart = start.getDate() - startDay + (startDay === 0 ? -6 : 1);
      fetchStart = new Date(start.setDate(diffStart));
      fetchStart.setHours(0,0,0,0);

      const endDay = end.getDay();
      const diffEnd = end.getDate() + (endDay === 0 ? 0 : 7 - endDay);
      fetchEnd = new Date(end.setDate(diffEnd));
      fetchEnd.setHours(23,59,59,999);
    }

    const startDateVal = fetchStart.toISOString();
    const endDateVal = fetchEnd.toISOString();

    const url = new URL('/api/rest/student/planning', window.location.origin);
    url.searchParams.set('startDate', startDateVal);
    url.searchParams.set('endDate', endDateVal);

    showSpinner();

    try {
      const res = await fetch(url.toString(), { credentials: 'include' });
      if (!res.ok) throw new Error('API planning failed');
      const data = await res.json();
      handlePlanningData(data);
    } catch (e) {
      console.error('📡 Erreur fetch planning:', e);
      showError();
    }
  }

  function handlePlanningData(rawData) {
    state.loading = false;
    
    let rawEvents = [];
    if (Array.isArray(rawData)) {
      rawEvents = rawData;
    } else if (rawData && typeof rawData === 'object') {
      for (const key of ['events', 'planning', 'agenda', 'data', 'lessons', 'courses']) {
        if (Array.isArray(rawData[key])) {
          rawEvents = rawData[key];
          break;
        }
      }
    }

    state.events = rawEvents.map(mapEvent).filter(ev => ev.start !== null);
    state.events.sort((a, b) => a.start - b.start);
    renderPlanning();
  }

  function mapEvent(raw) {
    let title = raw.subject || raw.title || raw.name || raw.label || raw.summary || raw.matiere || 'Cours';
    if (typeof title === 'object') title = title.name || title.label || JSON.stringify(title);

    let startVal = raw.start || raw.startDate || raw.startTime || raw.begin || raw.debut || raw.dateDebut;
    let endVal = raw.end || raw.endDate || raw.endTime || raw.fin || raw.dateFin;
    let start = startVal ? new Date(startVal) : null;
    let end = endVal ? new Date(endVal) : null;

    let room = raw.room || raw.classroom || raw.location || raw.salle || '';
    if (typeof room === 'object') room = room.name || room.code || room.label || JSON.stringify(room);

    let teacher = raw.teacher || raw.professor || raw.intervenant || raw.enseignant || '';
    if (typeof teacher === 'object') {
      teacher = `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() || teacher.name || teacher.label || JSON.stringify(teacher);
    }

    let type = raw.type || raw.courseActivity || raw.category || raw.sessionType || 'Cours';
    if (typeof type === 'object') type = type.name || type.label || JSON.stringify(type);

    let link = raw.link || raw.url || raw.teamsUrl || raw.moodleUrl || '';
    if (!link) {
      for (let key in raw) {
        if (typeof raw[key] === 'string' && (raw[key].startsWith('http://') || raw[key].startsWith('https://'))) {
          link = raw[key];
          break;
        }
      }
    }

    return { title, start, end, room, teacher, type, link, raw };
  }

  // ──────────────────────────────────────────────
  // STRUCTURE DE LA PAGE
  // ──────────────────────────────────────────────

  function openSettingsModal() {
    const colorsContainer = document.getElementById('mye-settings-colors');
    let colorsHTML = '';
    Object.entries(userSettings.colors).forEach(([type, hex]) => {
      colorsHTML += `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0;">
          <span style="font-size: 14px;">${type}</span>
          <input type="color" class="mye-color-input" data-type="${type}" value="${hex}" style="width: 30px; height: 30px; border: none; border-radius: 4px; cursor: pointer; padding: 0;">
        </div>
      `;
    });
    colorsContainer.innerHTML = colorsHTML;
    
    document.getElementById('mye-setting-start').value = userSettings.displayStart;
    document.getElementById('mye-setting-end').value = userSettings.displayEnd;
    
    document.getElementById('mye-settings-modal').style.display = 'flex';
  }

  function buildPageStructure() {
    const existing = document.getElementById('mye-planning-container');
    if (existing) return;

    document.body.classList.add('mye-clean-screen');

    const container = document.createElement('div');
    container.id = 'mye-planning-container';
    container.className = 'mye-page-container';
    
    container.innerHTML = `
      <div class="mac-cal-sidebar" style="border-right: none;">
        <div class="mac-cal-sidebar-section" style="height: 100%; display: flex; flex-direction: column; padding-bottom: 20px;">
          <div class="mye-sidebar-card" style="flex: 1; display: flex; flex-direction: column; margin-bottom: 0;">
            <div class="mac-cal-sidebar-title">Charge & Événements</div>
            <div class="mye-planning-stats">
              <div class="mye-planning-gauge-wrapper">
                <svg width="120" height="120" viewBox="0 0 120 120" class="mye-planning-gauge">
                  <circle cx="60" cy="60" r="50" class="mye-planning-gauge-bg"></circle>
                  <circle cx="60" cy="60" r="50" class="mye-planning-gauge-fill" id="mye-planning-arc"></circle>
                </svg>
                <div class="mye-planning-gauge-text">
                  <span id="mye-planning-hours">0</span>
                  <small>Heures</small>
                </div>
              </div>
              
              <div class="mye-countdown-list">
                <div class="mye-countdown-item type-projet">
                  <span class="mye-cd-label">Projet</span>
                  <span class="mye-cd-value" id="mye-cd-projet">...</span>
                </div>
                <div class="mye-countdown-item type-exam">
                  <span class="mye-cd-label">TAI</span>
                  <span class="mye-cd-value" id="mye-cd-tai">...</span>
                </div>
                <div class="mye-countdown-item type-exam">
                  <span class="mye-cd-label">CE</span>
                  <span class="mye-cd-value" id="mye-cd-ce">...</span>
                </div>
                <div class="mye-countdown-item type-exam">
                  <span class="mye-cd-label">DE</span>
                  <span class="mye-cd-value" id="mye-cd-de">...</span>
                </div>
              </div>
            </div>

            <hr style="border: none; border-top: 1px solid #f0f0f0; margin: 30px 0;">

            <div class="mac-cal-sidebar-title">Mini-Calendrier</div>
            <div class="mac-cal-minical" id="mac-cal-minical" style="margin-bottom: 20px;"></div>
            
            <div style="margin-top: auto;">
              <button id="mye-settings-btn" style="width: 100%; padding: 12px; border-radius: 12px; border: none; background: #f5f5f7; color: #1d1d1f; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                Paramètres
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="mac-cal-main">
        <div class="mac-cal-toolbar">
          <div class="mac-cal-toolbar-left">
            <div class="mac-cal-title" id="mye-period-label">Chargement…</div>
          </div>
          <div class="mac-cal-view-toggles">
            <button class="mac-cal-toggle-btn" data-view="day">Jour</button>
            <button class="mac-cal-toggle-btn active" data-view="week">Semaine</button>
            <button class="mac-cal-toggle-btn" data-view="month">Mois</button>
          </div>
          <div class="mac-cal-toolbar-right">
            <div class="mac-cal-nav">
              <button class="mac-cal-icon-btn" id="mye-period-prev">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <button class="mac-cal-today-btn" id="mye-period-today">Aujourd'hui</button>
              <button class="mac-cal-icon-btn" id="mye-period-next">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>
          </div>
        </div>
          <div class="mac-cal-content" id="mye-planning-right">
          </div>
        </div>
      </div>

      <div id="mye-settings-modal" class="mye-modal-overlay" style="display: none;">
        <div class="mye-modal">
          <div class="mye-modal-header">
            <h3>Paramètres d'Affichage</h3>
            <button id="mye-settings-close" class="mac-cal-icon-btn">&times;</button>
          </div>
          <div class="mye-modal-body">
            <h4>Couleurs des Matières</h4>
            <div class="mye-settings-colors" id="mye-settings-colors"></div>
            
            <h4 style="margin-top: 20px;">Amplitude Horaire (Jour/Semaine)</h4>
            <div class="mye-settings-row">
              <label>Heure de début :
                <input type="number" id="mye-setting-start" min="0" max="23" step="0.5" value="${userSettings.displayStart}" style="width:60px">
              </label>
              <label>Heure de fin :
                <input type="number" id="mye-setting-end" min="1" max="24" step="0.5" value="${userSettings.displayEnd}" style="width:60px">
              </label>
            </div>
            <p style="font-size: 12px; color: #86868b; margin-top: 8px;">Exemple: 7.5 pour 7h30.</p>
          </div>
          <div class="mye-modal-footer">
            <button class="mac-cal-btn" id="mye-settings-reset" style="background: #e5e5ea; color: #1d1d1f;">Réinitialiser</button>
            <button class="mac-cal-btn" id="mye-settings-save" style="background: #007aff; color: #fff;">Sauvegarder</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(container);

    // Événements boutons de vues
    document.querySelectorAll('.mac-cal-toggle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.mac-cal-toggle-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        state.currentView = e.target.getAttribute('data-view');
        updatePeriodLabel();
        fetchPlanningForPeriod(state.currentDate);
      });
    });

    // Événements navigation
    document.getElementById('mye-period-prev').addEventListener('click', () => navigatePeriod(-1));
    document.getElementById('mye-period-next').addEventListener('click', () => navigatePeriod(1));
    document.getElementById('mye-period-today').addEventListener('click', () => {
      state.currentDate = new Date();
      updatePeriodLabel();
      fetchPlanningForPeriod(state.currentDate);
    });

    // Clic sur le mini calendrier
    document.getElementById('mac-cal-minical').addEventListener('click', (e) => {
      const dayEl = e.target.closest('.mac-minical-day');
      if (dayEl && dayEl.dataset.date) {
        state.currentDate = new Date(dayEl.dataset.date);
        updatePeriodLabel();
        fetchPlanningForPeriod(state.currentDate);
      }
    });

    // Paramètres
    document.getElementById('mye-settings-btn').addEventListener('click', openSettingsModal);
    document.getElementById('mye-settings-close').addEventListener('click', () => {
      document.getElementById('mye-settings-modal').style.display = 'none';
    });
    document.getElementById('mye-settings-reset').addEventListener('click', () => {
      userSettings = { ...defaultSettings };
      userSettings.colors = { ...defaultSettings.colors };
      saveSettings();
      applyColors();
      document.getElementById('mye-settings-modal').style.display = 'none';
      renderPlanning();
    });
    document.getElementById('mye-settings-save').addEventListener('click', () => {
      userSettings.displayStart = parseFloat(document.getElementById('mye-setting-start').value) || 7.5;
      userSettings.displayEnd = parseFloat(document.getElementById('mye-setting-end').value) || 20.0;
      
      const colorInputs = document.querySelectorAll('.mye-color-input');
      colorInputs.forEach(input => {
        userSettings.colors[input.dataset.type] = input.value;
      });
      
      saveSettings();
      applyColors();
      document.getElementById('mye-settings-modal').style.display = 'none';
      renderPlanning();
    });

    updatePeriodLabel();
    showSpinner();
  }

  function updatePeriodLabel() {
    const { start, end } = getPeriodRange(state.currentDate, state.currentView);
    const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
    let label = '';

    if (state.currentView === 'day') {
      const parts = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).formatToParts(state.currentDate);
      const str = cap(parts.map(p => p.value).join(''));
      label = `${str} <span class="year">${state.currentDate.getFullYear()}</span>`;
    } else {
      const startMonth = start.toLocaleDateString('fr-FR', { month: 'long' });
      const endMonth = end.toLocaleDateString('fr-FR', { month: 'long' });
      const startYear = start.getFullYear();
      const endYear = end.getFullYear();

      if (startMonth === endMonth && startYear === endYear) {
        label = `${cap(startMonth)} <span class="year">${startYear}</span>`;
      } else if (startYear === endYear) {
        label = `${cap(startMonth)} - ${cap(endMonth)} <span class="year">${startYear}</span>`;
      } else {
        label = `${cap(startMonth)} ${startYear} - ${cap(endMonth)} <span class="year">${endYear}</span>`;
      }
    }

    const labelEl = document.getElementById('mye-period-label');
    if (labelEl) labelEl.innerHTML = label;

    renderMiniCalendar(state.currentDate);
  }

  function renderMiniCalendar(refDate) {
    const container = document.getElementById('mac-cal-minical');
    if (!container) return;

    const year = refDate.getFullYear();
    const month = refDate.getMonth();
    const today = new Date();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let startDayIdx = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // 0 = Lundi, 6 = Dimanche
    
    let html = `
      <div class="mac-minical-header">
        <div class="mac-minical-title">${firstDay.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).replace(/^./, c => c.toUpperCase())}</div>
        <div class="mac-minical-nav">
          <button onclick="document.getElementById('mye-period-prev').click()">‹</button>
          <button onclick="document.getElementById('mye-period-next').click()">›</button>
        </div>
      </div>
      <div class="mac-minical-grid">
        <div class="mac-minical-dow">L</div>
        <div class="mac-minical-dow">M</div>
        <div class="mac-minical-dow">M</div>
        <div class="mac-minical-dow">J</div>
        <div class="mac-minical-dow">V</div>
        <div class="mac-minical-dow">S</div>
        <div class="mac-minical-dow">D</div>
    `;

    for (let i = 0; i < startDayIdx; i++) {
      html += `<div class="mac-minical-day empty"></div>`;
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const isToday = (d === today.getDate() && month === today.getMonth() && year === today.getFullYear());
      
      const dDate = new Date(year, month, d);
      const { start: pStart, end: pEnd } = getPeriodRange(refDate, state.currentView);
      const isSelectedPeriod = dDate >= pStart && dDate <= pEnd;

      let cls = 'mac-minical-day';
      if (isToday) cls += ' today';
      if (isSelectedPeriod && !isToday) cls += ' selected-week';

      // Pour éviter les problèmes de fuseau, on crée la date à midi en UTC
      const isoDate = new Date(Date.UTC(year, month, d, 12, 0, 0)).toISOString();
      html += `<div class="${cls}" data-date="${isoDate}" style="cursor: pointer;">${d}</div>`;
    }

    html += `</div>`;
    container.innerHTML = html;
  }

  function navigatePeriod(direction) {
    const nextDate = new Date(state.currentDate);
    if (state.currentView === 'day') {
      nextDate.setDate(nextDate.getDate() + direction);
    } else if (state.currentView === 'week') {
      nextDate.setDate(nextDate.getDate() + (direction * 7));
    } else if (state.currentView === 'month') {
      nextDate.setMonth(nextDate.getMonth() + direction);
    }
    state.currentDate = nextDate;
    updatePeriodLabel();
    fetchPlanningForPeriod(state.currentDate);
  }

  function showSpinner() {
    const panel = document.getElementById('mye-planning-right');
    if (!panel) return;
    panel.innerHTML = `
      <div class="mye-planning-loading">
        <div class="mye-planning-spinner"></div>
        <div class="mye-planning-loading-text">Chargement de votre emploi du temps…</div>
      </div>
    `;
  }

  function showError() {
    const panel = document.getElementById('mye-planning-right');
    if (!panel) return;
    panel.innerHTML = `
      <div class="mye-planning-error">
        <div class="mye-planning-error-icon">⚠️</div>
        <div class="mye-planning-error-text">Impossible de charger le planning. Veuillez rafraîchir ou vous reconnecter.</div>
      </div>
    `;
  }

  // ──────────────────────────────────────────────
  // RENDU PRINCIPAL
  // ──────────────────────────────────────────────

  function renderPlanning() {
    updateGauge();
    if (state.currentView === 'month') {
      renderMonthView();
    } else {
      renderGrid();
    }
  }

  function renderMonthView() {
    const panel = document.getElementById('mye-planning-right');
    if (!panel) return;

    if (state.events.length === 0) {
      panel.innerHTML = `<div class="mye-planning-empty"><div class="mye-planning-empty-icon">🏖️</div><div class="mye-planning-empty-text">Aucun cours prévu ce mois-ci !</div></div>`;
      return;
    }

    const year = state.currentDate.getFullYear();
    const month = state.currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    
    // Trouver le lundi de la première semaine
    const startDay = firstDay.getDay();
    const diffStart = firstDay.getDate() - startDay + (startDay === 0 ? -6 : 1);
    let iterDate = new Date(firstDay.setDate(diffStart));
    iterDate.setHours(0,0,0,0);

    let html = `
      <div class="mac-apple-calendar-month">
        <div class="mac-cal-month-header">
          <div>LUN</div><div>MAR</div><div>MER</div><div>JEU</div><div>VEN</div><div>SAM</div><div>DIM</div>
        </div>
        <div class="mac-cal-month-grid">
    `;

    // 6 semaines = 42 jours max
    for (let i = 0; i < 42; i++) {
      const dStr = formatDateISO(iterDate);
      const isCurrentMonth = iterDate.getMonth() === month;
      const isToday = dStr === formatDateISO(new Date());

      // Filtrer les événements de ce jour
      const dayEvents = state.events.filter(ev => formatDateISO(ev.start) === dStr);
      
      let eventsHTML = '';
      dayEvents.forEach(ev => {
        const normType = normalizeType(ev.type);
        const classModifier = 'mac-course-' + normType.toLowerCase();
        let evLink = ev.link ? `onclick="window.open('${ev.link}', '_blank'); event.stopPropagation();"` : '';
        
        eventsHTML += `
          <div class="mac-cal-month-event ${classModifier}" ${evLink} title="${escapeHTML(ev.title)}">
            <div class="mac-cal-month-event-inner">
              <span class="mac-cal-month-event-time">${formatTime(ev.start)}</span>
              <span class="mac-cal-month-event-title">${escapeHTML(ev.title)}</span>
            </div>
          </div>
        `;
      });

      html += `
        <div class="mac-cal-month-cell ${isCurrentMonth ? '' : 'mac-cal-month-cell-dim'}">
          <div class="mac-cal-month-date ${isToday ? 'today' : ''}">${iterDate.getDate()}</div>
          <div class="mac-cal-month-events">${eventsHTML}</div>
        </div>
      `;

      iterDate.setDate(iterDate.getDate() + 1);
    }

    html += `
        </div>
      </div>
    `;

    panel.innerHTML = html;
  }

  function renderGrid() {
    const panel = document.getElementById('mye-planning-right');
    if (!panel) return;

    if (state.events.length === 0) {
      panel.innerHTML = `<div class="mye-planning-empty"><div class="mye-planning-empty-icon">🏖️</div><div class="mye-planning-empty-text">Aucun cours prévu sur cette période !</div></div>`;
      return;
    }

    const daysMap = {
      1: { name: 'Lun', date: null, events: [] },
      2: { name: 'Mar', date: null, events: [] },
      3: { name: 'Mer', date: null, events: [] },
      4: { name: 'Jeu', date: null, events: [] },
      5: { name: 'Ven', date: null, events: [] },
      6: { name: 'Sam', date: null, events: [] },
      0: { name: 'Dim', date: null, events: [] }
    };

    const { start: pStart } = getPeriodRange(state.currentDate, 'week');
    
    // Initialiser les dates pour la semaine même en vue Jour (pour cohérence)
    for (let i = 0; i < 7; i++) {
      const d = new Date(pStart);
      d.setDate(pStart.getDate() + i);
      daysMap[d.getDay()].date = d;
    }

    let minHour = 0;
    let maxHour = 23;

    let daysOrder = [1, 2, 3, 4, 5, 6, 0];
    if (state.currentView === 'day') {
      const todayNum = state.currentDate.getDay();
      daysOrder = [todayNum];
      // Force correct date for 'day' view
      daysMap[todayNum].date = new Date(state.currentDate);
    }

    state.events.forEach(ev => {
      const dayNum = ev.start.getDay();
      if (daysMap[dayNum]) {
        // En vue Jour, on ignore les événements des autres jours
        if (state.currentView === 'day' && dayNum !== state.currentDate.getDay()) return;
        
        daysMap[dayNum].events.push(ev);
      }
    });

    if (state.currentView === 'week') {
      const hasSunday = daysMap[0].events.length > 0;
      const hasSaturday = daysMap[6].events.length > 0;
      if (!hasSunday) daysOrder.pop();
      if (!hasSaturday && !hasSunday) daysOrder.pop();
    }
    
    let headerHTML = `<div class="mac-cal-header"><div class="mac-cal-time-col-header"></div>`;
    daysOrder.forEach(dayNum => {
      const dayData = daysMap[dayNum];
      const isToday = formatDateISO(dayData.date) === formatDateISO(new Date());
      headerHTML += `
        <div class="mac-cal-day-header ${isToday ? 'mac-cal-today' : ''}">
          <div class="mac-cal-day-name">${dayData.name}</div>
          <div class="mac-cal-day-num">${dayData.date.getDate()}</div>
        </div>
      `;
    });
    headerHTML += `</div>`;

    let PIXELS_PER_HOUR = 60;
    const duration = userSettings.displayEnd - userSettings.displayStart;
    if (panel.clientHeight > 100) {
      const availableScrollHeight = panel.clientHeight - 50;
      PIXELS_PER_HOUR = Math.max(40, availableScrollHeight / duration);
    }
    const totalGridHeight = 24 * PIXELS_PER_HOUR;

    let timeColHTML = `<div class="mac-cal-time-col">`;
    for (let h = minHour; h <= maxHour; h++) {
      timeColHTML += `<div class="mac-cal-time-slot" style="height:${PIXELS_PER_HOUR}px"><span>${h}:00</span></div>`;
    }
    timeColHTML += `</div>`;

    let daysColsHTML = `<div class="mac-cal-day-cols">`;
    daysOrder.forEach(dayNum => {
      const dayData = daysMap[dayNum];
      const isToday = formatDateISO(dayData.date) === formatDateISO(new Date());
      let eventsHTML = '';
      
      dayData.events.forEach(ev => {
        eventsHTML += buildCourseCard(ev, minHour, PIXELS_PER_HOUR);
      });
      
      daysColsHTML += `
        <div class="mac-cal-day-col ${isToday ? 'mac-cal-today-col' : ''}">
          ${eventsHTML}
          ${isToday ? buildCurrentTimeIndicator(minHour, PIXELS_PER_HOUR) : ''}
        </div>
      `;
    });
    daysColsHTML += `</div>`;

    const calendarHTML = `
      <div class="mac-apple-calendar">
        ${headerHTML}
        <div class="mac-cal-scroll-area">
          <div class="mac-cal-body" style="height:${totalGridHeight}px">
            ${timeColHTML}
            <div class="mac-cal-grid">
              ${daysColsHTML}
            </div>
          </div>
        </div>
      </div>
    `;

    panel.innerHTML = calendarHTML;
    
    const scrollArea = panel.querySelector('.mac-cal-scroll-area');
    if (scrollArea) {
      scrollArea.scrollTop = userSettings.displayStart * PIXELS_PER_HOUR;
    }
  }

  function buildCurrentTimeIndicator(minHour, pxPerHour) {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    if (h < minHour) return '';
    const topPx = ((h - minHour) + (m / 60)) * pxPerHour;
    return `
      <div class="mac-cal-current-time" style="top:${topPx}px">
        <div class="mac-cal-current-time-dot"></div>
        <div class="mac-cal-current-time-line"></div>
      </div>
    `;
  }

  function normalizeType(type) {
    if (!type) return 'Cours';
    const t = type.toLowerCase();
    
    if (/\bCE\b/.test(type)) return 'CE';
    if (/\bDE\b/.test(type)) return 'DE';
    if (/\bTAI\b/i.test(type)) return 'TAI';
    if (/\bCC\b/.test(type)) return 'CC';

    if (t.includes('exam') || t.includes('eval') || t.includes('contrôle') || t.includes('dst') || t.includes('partiel')) return 'CC';
    if (t.includes('tp') || t.includes('pratique') || t.includes('lab')) return 'TP';
    if (t.includes('td') || t.includes('dirigé')) return 'TD';
    if (t.includes('cours') || t.includes('cm') || t.includes('magistral')) return 'CM';
    if (t.includes('projet') || t.includes('soutenance') || /\bPRJ\b/i.test(type)) return 'Projet';
    return 'Cours';
  }

  function buildCourseCard(ev, minHour, pxPerHour) {
    const normType = normalizeType(ev.type);
    let classModifier = 'mac-course-' + normType.toLowerCase();

    const startH = ev.start.getHours();
    const startM = ev.start.getMinutes();
    const topPx = ((startH - minHour) + (startM / 60)) * pxPerHour;
    
    const diffMs = ev.end - ev.start;
    const durationHours = (diffMs / 60000) / 60;
    const heightPx = Math.max(15, (durationHours * pxPerHour) - 2);

    let actionBtnHTML = '';
    if (ev.link) {
      const isTeams = ev.link.includes('teams.microsoft') || ev.link.includes('teams.live');
      const btnLabel = isTeams ? 'Teams' : 'Lien';
      actionBtnHTML = `<a href="${ev.link}" target="_blank" class="mac-cal-event-btn" onclick="event.stopPropagation()">${btnLabel}</a>`;
    }

    return `
      <div class="mac-cal-event ${classModifier}" style="top:${topPx}px; height:${heightPx}px;">
        <div class="mac-cal-event-inner">
          <div class="mac-cal-event-header">
            <div class="mac-cal-event-title" title="${escapeHTML(ev.title)}">${escapeHTML(ev.title)}</div>
            ${actionBtnHTML}
          </div>
          <div class="mac-cal-event-time">${formatTime(ev.start)} - ${formatTime(ev.end)}</div>
          ${ev.room ? `<div class="mac-cal-event-room">${escapeHTML(ev.room)}</div>` : ''}
          ${ev.teacher ? `<div class="mac-cal-event-teacher">${escapeHTML(ev.teacher)}</div>` : ''}
        </div>
      </div>
    `;
  }

  function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function updateGauge() {
    let totalMinutes = 0;
    state.events.forEach(ev => {
      if (ev.start && ev.end) {
        totalMinutes += (ev.end - ev.start) / 60000;
      }
    });
    const hours = Math.round(totalMinutes / 60);
    const hoursEl = document.getElementById('mye-planning-hours');
    if (hoursEl) hoursEl.textContent = hours;

    const arc = document.getElementById('mye-planning-arc');
    if (arc) {
      let maxHours = 35;
      if (state.currentView === 'day') maxHours = 8;
      if (state.currentView === 'month') maxHours = 140;
      
      const ratio = Math.min(hours / maxHours, 1);
      const CIRCUMFERENCE = 314.159; // r=50 -> 2*PI*50
      const offset = CIRCUMFERENCE * (1 - ratio);
      arc.style.strokeDashoffset = offset;
    }
  }

  async function fetchFutureEvents() {
    const now = new Date();
    
    // Fetch par blocs de 30 jours pour éviter la limitation de l'API Efrei
    const fetchChunk = async (startDays, endDays) => {
      const s = new Date(now);
      s.setDate(s.getDate() + startDays);
      const e = new Date(now);
      e.setDate(e.getDate() + endDays);
      
      const url = new URL('/api/rest/student/planning', window.location.origin);
      url.searchParams.set('startDate', s.toISOString());
      url.searchParams.set('endDate', e.toISOString());
      
      try {
        const res = await fetch(url.toString(), { credentials: 'include' });
        if (!res.ok) return [];
        const rawData = await res.json();
        let rawEvents = [];
        if (Array.isArray(rawData)) rawEvents = rawData;
        else if (rawData && typeof rawData === 'object') {
          for (const key of ['events', 'planning', 'agenda', 'data', 'lessons', 'courses']) {
            if (Array.isArray(rawData[key])) { rawEvents = rawData[key]; break; }
          }
        }
        return rawEvents.map(mapEvent).filter(ev => ev.start !== null);
      } catch(err) {
        return [];
      }
    };

    const [chunk1, chunk2, chunk3] = await Promise.all([
      fetchChunk(0, 30),
      fetchChunk(30, 60),
      fetchChunk(60, 90)
    ]);
    
    let futureEvents = [...chunk1, ...chunk2, ...chunk3];
    futureEvents.sort((a, b) => a.start - b.start);
    
    let nextProjet = null;
    let nextCE = null;
    let nextDE = null;
    let nextTAI = null;
    const nowTime = now.getTime();
    
    const isCE = (t1, t2) => /\bCE\b/.test(t1) || /\bCE\b/.test(t2);
    const isDE = (t1, t2) => /\bDE\b/.test(t1) || /\bDE\b/.test(t2);
    const isPRJ = (t1, t2) => /\bPRJ\b/i.test(t1) || /\bPRJ\b/i.test(t2) || /\bPROJET\b/i.test(t1) || /\bPROJET\b/i.test(t2);
    const isTAI = (t1, t2) => /\bTAI\b/i.test(t1) || /\bTAI\b/i.test(t2);

    for (const ev of futureEvents) {
      if (ev.start.getTime() < nowTime) continue;
      const title = ev.title || '';
      const type = ev.type || '';
      
      if (!nextProjet && isPRJ(title, type)) nextProjet = ev.start;
      if (!nextCE && isCE(title, type)) nextCE = ev.start;
      if (!nextDE && isDE(title, type)) nextDE = ev.start;
      if (!nextTAI && isTAI(title, type)) nextTAI = ev.start;
      if (nextProjet && nextCE && nextDE && nextTAI) break;
    }

    const msInHour = 1000 * 60 * 60;
    const msInDay = msInHour * 24;
    const setLabel = (id, dateStr) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (!dateStr) {
        el.textContent = '> 1 mois';
      } else {
        const diffMs = dateStr.getTime() - nowTime;
        const diffHours = Math.ceil(diffMs / msInHour);
        if (diffHours < 72) {
          el.textContent = `${diffHours}h`;
        } else {
          const diffDays = Math.ceil(diffMs / msInDay);
          el.textContent = `J-${diffDays}`;
        }
      }
    };

    setLabel('mye-cd-projet', nextProjet);
    setLabel('mye-cd-ce', nextCE);
    setLabel('mye-cd-de', nextDE);
    setLabel('mye-cd-tai', nextTAI);
  }

  // ──────────────────────────────────────────────
  // INITIALISATION
  // ──────────────────────────────────────────────

  function init() {
    console.log('📅 Initialisation de la page du planning…');
    loadSettings();
    applyColors();
    buildPageStructure();
    fetchPlanningForPeriod(state.currentDate);
    fetchFutureEvents();
  }

  function waitAndInit() {
    document.body.classList.add('mye-clean-screen');

    const container = document.getElementById('mye-planning-container');
    if (container) container.style.display = 'flex';

    const checkHeader = setInterval(() => {
      if (document.getElementById('mye-custom-header-wrapper') || document.getElementById('mye-custom-header')) {
        clearInterval(checkHeader);
        if (!document.getElementById('mye-planning-container')) {
          setTimeout(init, 200);
        }
      }
    }, 200);

    setTimeout(() => {
      clearInterval(checkHeader);
      if (!document.getElementById('mye-planning-container')) {
        init();
      }
    }, 5000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (window.location.pathname.includes('/portal/student/planning')) waitAndInit();
    });
  } else {
    if (window.location.pathname.includes('/portal/student/planning')) waitAndInit();
  }

  let lastUrl = window.location.href;
  setInterval(() => {
    if (lastUrl !== window.location.href) {
      lastUrl = window.location.href;
      
      if (window.location.pathname.includes('/portal/student/planning')) {
        if (!document.getElementById('mye-planning-container')) {
          waitAndInit();
        } else {
          document.body.classList.add('mye-clean-screen');
          document.getElementById('mye-planning-container').style.display = 'flex';
        }
      } else {
        document.body.classList.remove('mye-clean-screen');
        const container = document.getElementById('mye-planning-container');
        if (container) container.style.display = 'none';
      }
    }
  }, 500);

})();
