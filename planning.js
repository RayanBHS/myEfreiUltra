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
    currentDate: new Date(), // Date de référence pour la semaine affichée
    events: [],              // Cours de la semaine courante
    loading: true
  };

  // ──────────────────────────────────────────────
  // FONCTIONS DE DATES
  // ──────────────────────────────────────────────

  // Trouver le lundi et le dimanche de la semaine de la date donnée
  function getWeekRange(date) {
    const current = new Date(date);
    const day = current.getDay();
    const diff = current.getDate() - day + (day === 0 ? -6 : 1); // Ajuster pour que la semaine commence le lundi
    const monday = new Date(current.setDate(diff));
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return { start: monday, end: sunday };
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

  async function fetchPlanningForWeek(date) {
    const { start, end } = getWeekRange(date);
    
    // Formater en ISO strict avec fuseau UTC (Z) comme attendu par l'API Efrei
    const startDateVal = start.toISOString();
    const endDateVal = end.toISOString();

    const url = new URL('/api/rest/student/planning', window.location.origin);
    url.searchParams.set('startDate', startDateVal);
    url.searchParams.set('endDate', endDateVal);

    showSpinner();

    try {
      console.log(`📡 [MyEfrei Ultra] Fetching planning: ${url.toString()}`);
      const res = await fetch(url.toString(), { credentials: 'include' });
      if (!res.ok) throw new Error('API planning failed');
      const data = await res.json();
      handlePlanningData(data);
    } catch (e) {
      console.error('📡 Erreur fetch planning:', e);
      showError();
    }
  }

  // Traiter les données reçues de l'API
  function handlePlanningData(rawData) {
    state.loading = false;
    
    // Extraire les événements
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

    // Traduire dans notre format standardisé
    state.events = rawEvents.map(mapEvent).filter(ev => ev.start !== null);
    
    // Trier par date/heure
    state.events.sort((a, b) => a.start - b.start);

    // Faire le rendu
    renderPlanning();
  }

  // Standardiser un événement API
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
  // STRUCTURE DE LA PAGE ET RENDU
  // ──────────────────────────────────────────────

  function buildPageStructure() {
    const existing = document.getElementById('mye-planning-container');
    if (existing) return;

    // Injecter un style pour masquer le contenu original
    const hideStyle = document.createElement('style');
    hideStyle.id = 'mye-planning-hide-style';
    hideStyle.innerHTML = `
      body > *:not(#mye-custom-header-wrapper):not(#mye-planning-container):not(#mye-pdf-overlay):not(script):not(style):not(link) {
        display: none !important;
      }
      body {
        background-color: #F0F0F0 !important;
      }
    `;
    
    const oldStyle = document.getElementById('mye-planning-hide-style');
    if (oldStyle) oldStyle.remove();
    document.head.appendChild(hideStyle);

    // Conteneur principal
    const container = document.createElement('div');
    container.id = 'mye-planning-container';
    container.innerHTML = `
      <div class="mye-planning-left">
        <!-- Sélecteur de date / semaine -->
        <div class="mye-week-card">
          <div class="mye-week-nav">
            <button class="mye-week-nav-btn" id="mye-week-prev" title="Semaine précédente">◄</button>
            <button class="mye-week-today-btn" id="mye-week-today">Aujourd'hui</button>
            <button class="mye-week-nav-btn" id="mye-week-next" title="Semaine suivante">►</button>
          </div>
          <div class="mye-week-label" id="mye-week-label">Chargement…</div>
        </div>

        <!-- Statistiques de la semaine -->
        <div class="mye-planning-stats">
          <div class="mye-stats-title">Ma semaine</div>
          <div class="mye-stats-circle-container">
            <svg viewBox="0 0 200 200" class="mye-stats-svg">
              <circle class="mye-stats-circle-bg" cx="100" cy="100" r="75" />
              <circle class="mye-stats-circle-fill" id="mye-stats-arc" cx="100" cy="100" r="75"
                stroke-dasharray="471.2"
                stroke-dashoffset="471.2" />
            </svg>
            <div class="mye-stats-value" id="mye-stats-hours">0h</div>
          </div>
          <div class="mye-stats-summary" id="mye-stats-summary">
            <!-- Rempli par JS -->
          </div>
        </div>
      </div>

      <div class="mye-planning-right" id="mye-planning-right">
        <!-- Rempli par le chargement ou rendu -->
      </div>
    `;

    document.body.appendChild(container);

    // Bind les boutons de navigation
    document.getElementById('mye-week-prev').addEventListener('click', () => navigateWeek(-7));
    document.getElementById('mye-week-next').addEventListener('click', () => navigateWeek(7));
    document.getElementById('mye-week-today').addEventListener('click', () => {
      state.currentDate = new Date();
      updateWeekLabel();
      fetchPlanningForWeek(state.currentDate);
    });

    updateWeekLabel();
    showSpinner();
  }

  function updateWeekLabel() {
    const { start, end } = getWeekRange(state.currentDate);
    const label = `Semaine du ${start.getDate()} ${start.toLocaleDateString('fr-FR', { month: 'short' })} au ${end.getDate()} ${end.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}`;
    const labelEl = document.getElementById('mye-week-label');
    if (labelEl) labelEl.textContent = label;
  }

  function navigateWeek(days) {
    const nextDate = new Date(state.currentDate);
    nextDate.setDate(nextDate.getDate() + days);
    state.currentDate = nextDate;
    updateWeekLabel();
    fetchPlanningForWeek(state.currentDate);
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

  // Rendu global
  function renderPlanning() {
    const panel = document.getElementById('mye-planning-right');
    if (!panel) return;

    if (state.events.length === 0) {
      panel.innerHTML = `
        <div class="mye-planning-empty">
          <div class="mye-planning-empty-icon">🏖️</div>
          <div class="mye-planning-empty-text">Aucun cours prévu pour cette semaine !</div>
        </div>
      `;
      updateStats(0, {});
      return;
    }

    // Grouper les événements par jour de la semaine
    const daysMap = {
      1: { name: 'Lundi', events: [] },
      2: { name: 'Mardi', events: [] },
      3: { name: 'Mercredi', events: [] },
      4: { name: 'Jeudi', events: [] },
      5: { name: 'Vendredi', events: [] },
      6: { name: 'Samedi', events: [] },
      0: { name: 'Dimanche', events: [] }
    };

    let totalMinutes = 0;
    const statsTypes = {};

    const { start: mon, end: sun } = getWeekRange(state.currentDate);

    // Initialiser les jours avec les bonnes dates
    for (let i = 0; i < 7; i++) {
      const d = new Date(mon);
      d.setDate(mon.getDate() + i);
      const dayNum = d.getDay();
      daysMap[dayNum].date = d;
    }

    state.events.forEach(ev => {
      const dayNum = ev.start.getDay();
      daysMap[dayNum].events.push(ev);

      // Calculer la durée
      if (ev.end && ev.start) {
        const diffMs = ev.end - ev.start;
        const diffMins = Math.round(diffMs / 60000);
        totalMinutes += diffMins;
      }

      // Calculer stats par type
      const typeLabel = normalizeType(ev.type);
      statsTypes[typeLabel] = (statsTypes[typeLabel] || 0) + 1;
    });

    // Mettre à jour les stats à gauche
    const totalHours = Math.round(totalMinutes / 60) || 0;
    updateStats(totalHours, statsTypes);

    // Vider le panneau droit
    panel.innerHTML = '';

    // Parcourir les jours (Lundi à Samedi ou Dimanche si cours)
    const daysOrder = [1, 2, 3, 4, 5, 6, 0];
    daysOrder.forEach(dayNum => {
      const dayData = daysMap[dayNum];
      if (dayNum === 0 && dayData.events.length === 0) return; // Ne pas afficher dimanche si vide

      const dayBlock = document.createElement('div');
      dayBlock.className = 'mye-day-block';

      // Vérifier si c'est aujourd'hui
      const isToday = formatDateISO(dayData.date) === formatDateISO(new Date());
      if (isToday) {
        dayBlock.classList.add('mye-today');
      }

      const dayHeaderHTML = `
        <div class="mye-day-header">
          <h2 class="mye-day-title">${dayData.name}</h2>
          <div class="mye-day-date">${dayData.date.getDate()} ${dayData.date.toLocaleDateString('fr-FR', { month: 'long' })}</div>
        </div>
      `;

      let cardsHTML = '';
      if (dayData.events.length === 0) {
        cardsHTML = `<div class="mye-course-empty">Aucun cours</div>`;
      } else {
        cardsHTML = dayData.events.map(ev => buildCourseCard(ev)).join('');
      }

      dayBlock.innerHTML = `
        ${dayHeaderHTML}
        <div class="mye-day-courses">${cardsHTML}</div>
      `;

      panel.appendChild(dayBlock);
    });
  }

  // Normaliser le type de cours pour les catégories et classes CSS
  function normalizeType(type) {
    if (!type) return 'Cours';
    const t = type.toLowerCase();
    if (t.includes('exam') || t.includes('eval') || t.includes('contrôle') || t.includes('dst') || t.includes('partiel')) return 'Examen';
    if (t.includes('tp') || t.includes('pratique') || t.includes('lab')) return 'TP';
    if (t.includes('td') || t.includes('dirigé')) return 'TD';
    if (t.includes('cours') || t.includes('cm') || t.includes('magistral')) return 'CM';
    if (t.includes('projet') || t.includes('soutenance')) return 'Projet';
    return 'Cours';
  }

  function buildCourseCard(ev) {
    const normType = normalizeType(ev.type);
    let classModifier = 'mye-course-' + normType.toLowerCase();

    // Liens de réunion / Teams / Moodle
    let actionBtnHTML = '';
    if (ev.link) {
      const isTeams = ev.link.includes('teams.microsoft') || ev.link.includes('teams.live');
      const btnLabel = isTeams ? 'Rejoindre Teams' : 'Accéder';
      const btnClass = isTeams ? 'mye-course-btn-teams' : 'mye-course-btn-link';
      actionBtnHTML = `
        <a href="${ev.link}" target="_blank" class="mye-course-btn ${btnClass}">
          ${btnLabel}
        </a>
      `;
    }

    return `
      <div class="mye-course-card ${classModifier}">
        <div class="mye-course-time">
          <span class="mye-course-start">${formatTime(ev.start)}</span>
          <span class="mye-course-duration-arrow">↓</span>
          <span class="mye-course-end">${formatTime(ev.end)}</span>
        </div>
        <div class="mye-course-details">
          <div class="mye-course-title-row">
            <h3 class="mye-course-title">${escapeHTML(ev.title)}</h3>
            <span class="mye-course-badge">${normType}</span>
          </div>
          <div class="mye-course-meta">
            ${ev.room ? `
              <span class="mye-course-meta-item" title="Salle">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                ${escapeHTML(ev.room)}
              </span>
            ` : ''}
            ${ev.teacher ? `
              <span class="mye-course-meta-item" title="Enseignant">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                ${escapeHTML(ev.teacher)}
              </span>
            ` : ''}
          </div>
        </div>
        ${actionBtnHTML ? `<div class="mye-course-actions">${actionBtnHTML}</div>` : ''}
      </div>
    `;
  }

  function updateStats(hours, types) {
    const arc = document.getElementById('mye-stats-arc');
    const hoursEl = document.getElementById('mye-stats-hours');
    const summaryEl = document.getElementById('mye-stats-summary');

    if (!arc || !hoursEl || !summaryEl) return;

    hoursEl.textContent = `${hours}h`;

    const ratio = Math.min(hours / 35, 1);
    const offset = 471.2 * (1 - ratio);
    arc.style.strokeDashoffset = offset;

    let summaryHTML = '';
    for (const [type, count] of Object.entries(types)) {
      let icon = '📖';
      if (type === 'Examen') icon = '✍️';
      if (type === 'TP') icon = '💻';
      if (type === 'TD') icon = '✏️';
      if (type === 'Projet') icon = '🚀';

      summaryHTML += `
        <div class="mye-stat-row">
          <span>${icon} ${type}</span>
          <strong>${count} cours</strong>
        </div>
      `;
    }
    summaryEl.innerHTML = summaryHTML || '<div style="color:#888; text-align:center; padding:10px;">Aucune donnée</div>';
  }

  function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ──────────────────────────────────────────────
  // INITIALISATION ET ROUTAGE (SPA)
  // ──────────────────────────────────────────────

  function init() {
    console.log('📅 Initialisation de la page du planning…');
    buildPageStructure();
    fetchPlanningForWeek(state.currentDate);
  }

  // Attendre Angular et démarrer si on est sur la bonne page
  function waitAndInit() {
    // Masquage temporaire immédiat du corps pour éviter les sauts visuels
    const style = document.createElement('style');
    style.id = 'mye-planning-hide-all-style';
    style.innerHTML = `
      body > *:not(#mye-custom-header-wrapper):not(#mye-planning-container):not(#mye-pdf-overlay):not(script):not(style):not(link) {
        display: none !important;
      }
      html, body {
        background-color: #F0F0F0 !important;
      }
    `;
    const oldStyle = document.getElementById('mye-planning-hide-all-style');
    if (oldStyle) oldStyle.remove();
    document.head.appendChild(style);

    const container = document.getElementById('mye-planning-container');
    if (container) container.style.display = 'flex';

    // Attendre que le header personnalisé soit injecté par portal.js
    const checkHeader = setInterval(() => {
      if (document.getElementById('mye-custom-header-wrapper') || document.getElementById('mye-custom-header')) {
        clearInterval(checkHeader);
        if (!document.getElementById('mye-planning-container')) {
          setTimeout(init, 200);
        }
      }
    }, 200);

    // Timeout de sécurité
    setTimeout(() => {
      clearInterval(checkHeader);
      if (!document.getElementById('mye-planning-container')) {
        init();
      }
    }, 5000);
  }

  // Routage
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
          const hideStyle = document.getElementById('mye-planning-hide-all-style');
          if (!hideStyle) waitAndInit();
          else document.getElementById('mye-planning-container').style.display = 'flex';
        }
      } else {
        // Cleanup : masquer et restaurer
        const hideStyle = document.getElementById('mye-planning-hide-all-style');
        if (hideStyle) hideStyle.remove();
        const container = document.getElementById('mye-planning-container');
        if (container) container.style.display = 'none';
      }
    }
  }, 500);

})();
