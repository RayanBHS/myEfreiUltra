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
        
        // Sanitize any leftover advanced color objects into simple strings
        Object.keys(userSettings.colors).forEach(key => {
          if (typeof userSettings.colors[key] === 'object') {
            userSettings.colors[key] = userSettings.colors[key].simple || '#8e8e93';
          }
        });
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
    Object.entries(userSettings.colors).forEach(([type, simpleHex]) => {
      let tNorm = type.toLowerCase();
      const cls = '.mac-course-' + tNorm;
      
      let r = 142, g = 142, b = 147; // Default gray
      if (simpleHex && simpleHex.length === 7) {
        r = parseInt(simpleHex.slice(1,3), 16);
        g = parseInt(simpleHex.slice(3,5), 16);
        b = parseInt(simpleHex.slice(5,7), 16);
      }
      // Convert transparent rgba to a solid color assuming a white background
      const solidR = Math.round(r * 0.15 + 255 * 0.85);
      const solidG = Math.round(g * 0.15 + 255 * 0.85);
      const solidB = Math.round(b * 0.15 + 255 * 0.85);
      const lightBg = `rgb(${solidR}, ${solidG}, ${solidB})`;
      const hoverBg = `rgb(${Math.max(0, solidR - 10)}, ${Math.max(0, solidG - 10)}, ${Math.max(0, solidB - 10)})`;
      
      css += `
        ${cls} .mac-cal-event-inner {
          background-color: ${lightBg} !important;
          border-left-color: ${simpleHex} !important;
        }
        ${cls}:hover .mac-cal-event-inner {
          background-color: ${hoverBg} !important;
        }
        ${cls} .mac-cal-event-title {
          color: #1d1d1f !important;
        }
        ${cls} .mac-cal-event-time, ${cls} .mac-cal-event-room, ${cls} .mac-cal-event-teacher {
          color: #3a3a3c !important;
        }
        ${cls} .mye-event-type-pill {
          background-color: ${simpleHex} !important;
          color: #1d1d1f !important;
        }
      `;
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

  let moodleSpacesCache = null;
  let moodleSpacesPromise = null;
  function getMoodleSpaces() {
      if (moodleSpacesCache) return Promise.resolve(moodleSpacesCache);
      if (moodleSpacesPromise) return moodleSpacesPromise;
      const date = new Date();
      const year = date.getMonth() >= 7 ? date.getFullYear() : date.getFullYear() - 1;
      const schoolYear = `${year}-${year + 1}`;
      moodleSpacesPromise = fetch(`/api/rest/student/courses/spaces?schoolYear=${schoolYear}`)
          .then(res => res.json())
          .then(data => {
              moodleSpacesCache = Array.isArray(data) ? data : (data || []);
              return moodleSpacesCache;
          })
          .catch(e => {
              console.error('BME: Failed to fetch Moodle spaces', e);
              moodleSpacesCache = [];
              return moodleSpacesCache;
          });
      return moodleSpacesPromise;
  }

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
      await handlePlanningData(data);
    } catch (e) {
      console.error('📡 Erreur fetch planning:', e);
      showError();
    }
  }

  async function handlePlanningData(rawData) {
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

    const moodleSpaces = await getMoodleSpaces();

    state.events = rawEvents.map(raw => {
       let ev = mapEvent(raw);
       if (!ev.raw.moodleUrl && (ev.moduleCode || ev.title)) {
           let space = null;
           const searchId = ev.moduleCode ? ev.moduleCode.toUpperCase() : null;
           const searchName = ev.title ? ev.title.toLowerCase() : null;
           
           if (searchId) {
               space = moodleSpaces.find(s => (s.code || '').toUpperCase() === searchId);
               if (!space) {
                   space = moodleSpaces.find(s => {
                       const scode = (s.code || '').toUpperCase();
                       return scode && searchId.startsWith(scode);
                   });
               }
           }
           if (!space && searchName) {
               space = moodleSpaces.find(s => (s.name || '').toLowerCase().includes(searchName));
           }
           
           if (space && (space.url || space.moodleUrl || space.link)) {
               ev.raw.moodleUrl = space.url || space.moodleUrl || space.link;
           }
       }
       return ev;
    }).filter(ev => ev.start !== null);
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

    let possibleRoomFields = [raw.rooms, raw.room, raw.classrooms, raw.classroom, raw.locations, raw.location, raw.salles, raw.salle, raw.building, raw.buildings, raw.sites, raw.site];
    if (Array.isArray(raw.resources)) {
      raw.resources.forEach(res => {
        if (res && (String(res.type).toLowerCase().includes('room') || String(res.category).toLowerCase().includes('room') || String(res.type).toLowerCase() === 'salle')) {
          possibleRoomFields.push(res.name || res.label || res.code);
        }
      });
    }

    let allRoomStrings = [];
    possibleRoomFields.forEach(rData => {
      if (Array.isArray(rData)) {
        rData.forEach(r => {
          if (typeof r === 'object' && r) {
            let rn = r.room || r.code || r.name || r.label || '';
            let bn = r.building || r.bat || r.site || r.campus || '';
            if (rn && bn) allRoomStrings.push(`${rn} - ${bn}`);
            else if (rn) allRoomStrings.push(rn);
            else if (bn) allRoomStrings.push(bn);
          }
          else if (r) allRoomStrings.push(String(r));
        });
      } else if (typeof rData === 'object' && rData !== null) {
        let rn = rData.room || rData.code || rData.name || rData.label || '';
        let bn = rData.building || rData.bat || rData.site || rData.campus || '';
        if (rn && bn) allRoomStrings.push(`${rn} - ${bn}`);
        else if (rn) allRoomStrings.push(rn);
        else if (bn) allRoomStrings.push(bn);
        else allRoomStrings.push(JSON.stringify(rData));
      } else if (rData) {
        allRoomStrings.push(String(rData));
      }
    });

    let rawStr = [...new Set(allRoomStrings)].filter(Boolean).join(' - ');
    
    let clean = str => str.replace(/B[aâ]timent\s*[A-Z]?\s*/gi, '')
                          .replace(/Bat\.\s*[A-Z]?\s*/gi, '')
                          .replace(/Site\s*/gi, '')
                          .replace(/Campus\s*/gi, '')
                          .trim();
                          
    let cleanedParts = rawStr.split('-').map(clean).filter(Boolean);
    let roomLong = [...new Set(cleanedParts)].join(' - ');
    // We want the room code (e.g. H213) which usually contains digits, to show on the card,
    // rather than the building name (e.g. La Factory).
    let room = cleanedParts.find(p => /\d/.test(p)) || (cleanedParts.length > 0 ? cleanedParts[0] : '');

    let tData = raw.teacher || raw.teachers || raw.professor || raw.intervenant || raw.enseignant || raw.instructors || raw.staffs || raw.staff || raw.intervenants;
    let teacher = '';
    if (Array.isArray(tData)) {
      teacher = tData.map(t => typeof t === 'object' ? (`${t.firstName || ''} ${t.lastName || ''}`.trim() || t.name || t.label) : t).filter(Boolean).join(', ');
    } else if (typeof tData === 'object' && tData !== null) {
      teacher = `${tData.firstName || ''} ${tData.lastName || ''}`.trim() || tData.name || tData.label || JSON.stringify(tData);
    } else if (tData) {
      teacher = String(tData);
    }

    let type = raw.type || raw.courseActivity || raw.category || raw.sessionType || 'Cours';
    if (typeof type === 'object') type = type.name || type.label || JSON.stringify(type);

    let moduleCode = raw.moduleCode || raw.code || raw.teachingModule || '';
    if (typeof moduleCode === 'object') moduleCode = moduleCode.code || moduleCode.name || '';
    
    let modalityRaw = raw.modality || raw.modalityType || '';
    let modality = 'Présentiel';
    if (String(modalityRaw).toLowerCase().includes('dist') || String(modalityRaw).toLowerCase().includes('online')) modality = 'Distanciel';
    else if (String(modalityRaw).toLowerCase().includes('in_person') || String(modalityRaw).toLowerCase().includes('present')) modality = 'Présentiel';
    else if (modalityRaw) modality = modalityRaw;
    
    let groups = raw.group || raw.groups || raw.studentGroups || [];
    if (!Array.isArray(groups)) groups = [groups];
    let groupNames = groups.map(g => typeof g === 'object' ? (g.name || g.label || '') : g).join(', ');

    let link = raw.link || raw.url || raw.teamsUrl || raw.moodleUrl || '';
    if (!link) {
      for (let g of groups) {
        if (g && typeof g === 'object' && (g.teamsUrl || g.link || g.url)) {
          link = g.teamsUrl || g.link || g.url;
          break;
        }
      }
    }
    if (!link) {
      for (let key in raw) {
        if (typeof raw[key] === 'string' && (raw[key].startsWith('http://') || raw[key].startsWith('https://'))) {
          link = raw[key];
          break;
        }
      }
    }
    // Regex fallback to find ANY Teams or Zoom link in the entire raw object
    if (!link) {
      const strRaw = JSON.stringify(raw);
      const match = strRaw.match(/https:\/\/(?:teams\.microsoft\.com|teams\.cloud\.microsoft|zoom\.us|meet\.google\.com)[^\s"'}\\]+/i);
      if (match) link = match[0];
    }

    return { title, start, end, room, roomLong, teacher, type, link, moduleCode, modality, groupNames, raw };
  }

  // ──────────────────────────────────────────────
  // STRUCTURE DE LA PAGE
  // ──────────────────────────────────────────────

  function openSettingsModal() {
    const colorsContainer = document.getElementById('mye-settings-colors');
    let colorsHTML = '';
    
    Object.entries(userSettings.colors).forEach(([type, colorData]) => {
      let simpleHex = typeof colorData === 'string' ? colorData : (colorData.simple || '#8e8e93');
      // Ensure we sanitize userSettings immediately to remove old advanced objects
      userSettings.colors[type] = simpleHex;

      let r = 142, g = 142, b = 147;
      if (simpleHex.length === 7) {
        r = parseInt(simpleHex.slice(1,3), 16);
        g = parseInt(simpleHex.slice(3,5), 16);
        b = parseInt(simpleHex.slice(5,7), 16);
      }
      const lightBg = `rgba(${r}, ${g}, ${b}, 0.15)`;
      
      const iconBorder = simpleHex;
      const iconBg = lightBg;
      
      let typeLabel = type;
      if (type === 'Projet') typeLabel = 'Projet';
      else if (type === 'CM') typeLabel = 'CM (Cours magistral)';
      else if (type === 'TD') typeLabel = 'TD (Travaux dirigés)';
      else if (type === 'TP') typeLabel = 'TP (Travaux pratiques)';
      else if (type === 'CE') typeLabel = 'CE (Contrôle écrit)';
      else if (type === 'DE') typeLabel = 'DE (Devoir écrit)';

      colorsHTML += `
        <div class="mye-color-card" data-type="${type}" style="position: relative; overflow: hidden; display: flex; flex-direction: column; padding: 12px; background: #fff; border: 1px solid #e5e5ea; border-radius: 12px; margin-bottom: 8px; cursor: pointer; transition: background 0.2s;">
          <input type="color" class="mye-color-input" data-type="${type}" value="${simpleHex}" style="position: absolute; top: -10px; left: -10px; width: calc(100% + 20px); height: calc(100% + 20px); opacity: 0; cursor: pointer; z-index: 1; border: none; padding: 0; margin: 0;">
          <div class="mye-color-card-header" style="position: relative; z-index: 2; display: flex; align-items: center; justify-content: space-between; pointer-events: none;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div class="mye-color-card-icon" style="width: 20px; height: 20px; border-radius: 6px; border: 2px solid ${iconBorder}; background-color: ${iconBg};"></div>
              <span class="mye-color-card-title" style="font-size: 14px; font-weight: 600; color: #1d1d1f;">${typeLabel}</span>
            </div>
            <div class="mye-color-card-actions" style="display: flex; align-items: center; gap: 8px; pointer-events: none;">
              <input type="text" class="mye-color-hex" value="${simpleHex.toUpperCase()}" style="pointer-events: auto; width: 65px; font-size: 13px; font-family: monospace; border: 1px solid #d1d1d6; border-radius: 6px; padding: 4px; color: #1d1d1f; text-align: center; background: #f5f5f7;">
              <div class="mye-color-preview-box" style="width: 24px; height: 24px; border-radius: 4px; background: ${simpleHex}; border: 1px solid rgba(0,0,0,0.1);"></div>
              <button class="mye-reset-btn" data-type="${type}" title="Réinitialiser" style="pointer-events: auto; background: none; border: none; font-size: 16px; cursor: pointer; color: #8e8e93; padding: 0 4px;">↺</button>
            </div>
          </div>
        </div>
      `;
    });
    colorsContainer.innerHTML = colorsHTML;
    
    // Add hover effect
    document.querySelectorAll('.mye-color-card').forEach(card => {
      card.addEventListener('mouseenter', () => card.style.background = '#f9f9fb');
      card.addEventListener('mouseleave', () => card.style.background = '#fff');
    });

    function updateColorFromHex(card, type, hex) {
      if (/^#[0-9A-F]{6}$/i.test(hex)) {
        userSettings.colors[type] = hex;
        
        card.querySelector('.mye-color-input').value = hex;
        card.querySelector('.mye-color-hex').value = hex.toUpperCase();
        
        let r = parseInt(hex.slice(1,3), 16);
        let g = parseInt(hex.slice(3,5), 16);
        let b = parseInt(hex.slice(5,7), 16);
        card.querySelector('.mye-color-card-icon').style.borderColor = hex;
        card.querySelector('.mye-color-card-icon').style.backgroundColor = `rgba(${r}, ${g}, ${b}, 0.15)`;
      }
    }

    // Update from native color picker
    document.querySelectorAll('.mye-color-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const hex = e.target.value.toUpperCase();
        const type = e.target.getAttribute('data-type');
        const card = e.target.closest('.mye-color-card');
        updateColorFromHex(card, type, hex);
      });
    });

    // Update from text input
    document.querySelectorAll('.mye-color-hex').forEach(input => {
      input.addEventListener('change', (e) => {
        let hex = e.target.value.trim();
        if (!hex.startsWith('#')) hex = '#' + hex;
        if (/^#[0-9A-Fa-f]{3}$/.test(hex)) {
          hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
        }
        const card = e.target.closest('.mye-color-card');
        const type = card.getAttribute('data-type');
        updateColorFromHex(card, type, hex);
      });
    });
    
    // Reset individual color
    document.querySelectorAll('.mye-reset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const type = btn.getAttribute('data-type');
        const defaultHex = typeof defaultSettings.colors[type] === 'string' ? defaultSettings.colors[type] : (defaultSettings.colors[type]?.simple || '#8e8e93');
        const card = btn.closest('.mye-color-card');
        updateColorFromHex(card, type, defaultHex);
      });
    });
    
    const startInput = document.getElementById('mye-setting-start');
    const endInput = document.getElementById('mye-setting-end');
    startInput.value = userSettings.displayStart;
    endInput.value = userSettings.displayEnd;
    startInput.dispatchEvent(new Event('input'));
    endInput.dispatchEvent(new Event('input'));
    
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

            <hr style="border: none; border-top: 1px solid #f0f0f0; margin: 20px 0 0 0;">

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
            <div class="mye-settings-row" style="display: flex; flex-direction: column; margin-top: 12px; background: #fff; border: 1px solid #e5e5ea; border-radius: 12px; padding: 12px;">
              <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 500; color: #1d1d1f; margin-bottom: 8px;">
                <span>De <span id="mye-setting-start-val" style="color: #007aff; font-variant-numeric: tabular-nums;"></span></span>
                <span>À <span id="mye-setting-end-val" style="color: #007aff; font-variant-numeric: tabular-nums;"></span></span>
              </div>
              <style>
                .mye-dual-slider-container { position: relative; width: 100%; height: 24px; display: flex; align-items: center; }
                .mye-dual-slider-track { position: absolute; top: 50%; left: 0; right: 0; height: 4px; background: #e5e5ea; border-radius: 2px; transform: translateY(-50%); }
                .mye-dual-slider-range { position: absolute; top: 50%; height: 4px; background: #007aff; border-radius: 2px; transform: translateY(-50%); pointer-events: none; }
                .mye-dual-slider-input { position: absolute !important; width: 100% !important; left: 0 !important; -webkit-appearance: none !important; appearance: none !important; background: transparent !important; pointer-events: none !important; margin: 0 !important; outline: none !important; }
                .mye-dual-slider-input::-webkit-slider-thumb { pointer-events: auto; -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%; background: #fff; border: 1px solid #d1d1d6; box-shadow: 0 1px 3px rgba(0,0,0,0.1); cursor: pointer; }
                .mye-dual-slider-input::-moz-range-thumb { pointer-events: auto; width: 20px; height: 20px; border-radius: 50%; background: #fff; border: 1px solid #d1d1d6; box-shadow: 0 1px 3px rgba(0,0,0,0.1); cursor: pointer; }
              </style>
              <div class="mye-dual-slider-container">
                <div class="mye-dual-slider-track"></div>
                <div id="mye-dual-slider-range" class="mye-dual-slider-range"></div>
                <input type="range" id="mye-setting-start" class="mye-dual-slider-input" min="0" max="23.5" step="0.5" value="${userSettings.displayStart}" style="z-index: 4;">
                <input type="range" id="mye-setting-end" class="mye-dual-slider-input" min="0.5" max="24" step="0.5" value="${userSettings.displayEnd}" style="z-index: 5;">
              </div>
            </div>
          </div>
          <div class="mye-modal-footer">
            <button class="mac-cal-btn" id="mye-settings-reset" style="background: #e5e5ea; color: #1d1d1f;">Réinitialiser</button>
            <button class="mac-cal-btn" id="mye-settings-save" style="background: #007aff; color: #fff;">Sauvegarder</button>
          </div>
        </div>
      </div>

      <div id="mye-event-modal" class="mye-modal-overlay" style="display: none;">
        <div class="mye-modal" style="max-width: 500px; width: 100%;">
          <div class="mye-modal-header" style="flex-direction: row-reverse; align-items: flex-start; padding: 20px 24px;">
            <button id="mye-event-close" class="mac-cal-icon-btn" style="background: rgba(255, 255, 255, 0.1); border: none; border-radius: 50%; width: 32px; height: 32px; font-size: 24px; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center;">&times;</button>
            <div id="mye-em-header-text" style="display: flex; flex-direction: column; gap: 4px;">
              <!-- Title and type injected here -->
            </div>
          </div>
          <div class="mye-modal-body" id="mye-em-body" style="padding: 24px; display: flex; flex-direction: column; gap: 20px; max-height: 70vh; overflow-y: auto;">
            <!-- Content injected dynamically -->
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
    const formatHour = (val) => {
      const v = parseFloat(val);
      const h = Math.floor(v);
      const m = (v % 1) * 60;
      return `${h.toString().padStart(2, '0')}h${m > 0 ? m.toString().padStart(2, '0') : '00'}`;
    };
    const startInput = document.getElementById('mye-setting-start');
    const endInput = document.getElementById('mye-setting-end');
    const startValEl = document.getElementById('mye-setting-start-val');
    const endValEl = document.getElementById('mye-setting-end-val');
    const rangeBar = document.getElementById('mye-dual-slider-range');
    
    const updateDualSlider = () => {
      let start = parseFloat(startInput.value);
      let end = parseFloat(endInput.value);
      
      if (start >= end) {
        if (document.activeElement === startInput) {
          startInput.value = end - 0.5;
          start = end - 0.5;
        } else {
          endInput.value = start + 0.5;
          end = start + 0.5;
        }
      }
      
      startValEl.textContent = formatHour(start);
      endValEl.textContent = formatHour(end);
      
      const min = 0;
      const max = 24;
      
      const leftPercent = ((start - min) / (max - min)) * 100;
      const rightPercent = ((max - end) / (max - min)) * 100;
      
      rangeBar.style.left = leftPercent + '%';
      rangeBar.style.right = rightPercent + '%';
    };

    startInput.addEventListener('input', updateDualSlider);
    endInput.addEventListener('input', updateDualSlider);
    updateDualSlider();

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
      
      saveSettings();
      applyColors();
      document.getElementById('mye-settings-modal').style.display = 'none';
      renderPlanning();
    });

    document.getElementById('mye-event-close').addEventListener('click', () => {
      document.getElementById('mye-event-modal').style.display = 'none';
    });
    document.getElementById('mye-event-modal').addEventListener('click', (e) => {
      if (e.target.id === 'mye-event-modal') e.target.style.display = 'none';
    });

    updatePeriodLabel();
    showSpinner();
  }

  function getWeekNumber(d) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
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
    
    const todayBtn = document.getElementById('mye-period-today');
    if (todayBtn) {
      if (state.currentView === 'month') {
        todayBtn.textContent = "Aujourd'hui";
      } else {
        const weekNum = getWeekNumber(state.currentDate);
        todayBtn.textContent = `Semaine ${weekNum}`;
      }
    }

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
    attachEventModalListeners();
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
        const index = state.events.indexOf(ev);
        
        eventsHTML += `
          <div class="mac-cal-month-event ${classModifier} mye-open-modal-evt" data-index="${index}" title="${escapeHTML(ev.title)}">
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
      const isWeek = state.currentView === 'week';
      headerHTML += `
        <div class="mac-cal-day-header ${isToday ? 'mac-cal-today' : ''} ${isWeek ? 'mye-clickable-day' : ''}" data-date="${dayData.date.toISOString()}">
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

    let gridLinesHTML = `<div class="mac-cal-grid-lines">`;
    for (let h = minHour; h <= maxHour; h++) {
      const topPx = (h - minHour) * PIXELS_PER_HOUR;
      gridLinesHTML += `<div class="mac-cal-grid-line" style="top:${topPx}px"></div>`;
    }
    gridLinesHTML += `</div>`;

    const calendarHTML = `
      <div class="mac-apple-calendar">
        ${headerHTML}
        <div class="mac-cal-scroll-area">
          <div class="mac-cal-body" style="height:${totalGridHeight}px">
            ${timeColHTML}
            <div class="mac-cal-grid">
              ${gridLinesHTML}
              ${daysColsHTML}
            </div>
          </div>
        </div>
      </div>
    `;

    panel.innerHTML = calendarHTML;
    
    // Add click listener for switching to day view
    panel.querySelectorAll('.mye-clickable-day').forEach(header => {
      header.addEventListener('click', (e) => {
        if (state.currentView !== 'week') return;
        const dateStr = header.getAttribute('data-date');
        state.currentDate = new Date(dateStr);
        state.currentView = 'day';
        
        document.querySelectorAll('.mac-cal-toggle-btn').forEach(b => b.classList.remove('active'));
        const dayBtn = document.querySelector('.mac-cal-toggle-btn[data-view="day"]');
        if (dayBtn) dayBtn.classList.add('active');
        
        updatePeriodLabel();
        renderPlanning();
      });
    });
    
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
    const index = state.events.indexOf(ev);

    const startH = ev.start.getHours();
    const startM = ev.start.getMinutes();
    const topPx = ((startH - minHour) + (startM / 60)) * pxPerHour;
    
    const diffMs = ev.end - ev.start;
    const durationHours = (diffMs / 60000) / 60;
    const heightPx = Math.max(15, (durationHours * pxPerHour) - 2);

    let actionBtnHTML = '';
    // intentionally left empty to not display Teams/Moodle buttons on the calendar square

    let typePill = '';
    let isThin = heightPx < 70;

    if (ev.type && heightPx > 20) {
      typePill = `<div class="mye-event-type-pill" style="${isThin ? 'margin-right: 4px; flex-shrink: 0;' : 'margin-bottom: 2px; align-self: flex-start;'}">${escapeHTML(ev.type)}</div>`;
    }

    let innerHTML = '';
    if (isThin) {
      innerHTML = `
        <div class="mac-cal-event-inner" style="display: flex; flex-direction: column; height: 100%;">
          <div class="mac-cal-event-header" style="display: flex; flex-direction: row; align-items: center;">
            ${typePill}
            <div class="mac-cal-event-title" title="${escapeHTML(ev.title)}" style="-webkit-line-clamp: 1;">${escapeHTML(ev.title)}</div>
            ${actionBtnHTML}
          </div>
          <div style="flex-grow: 1;"></div>
          <div style="display: flex; flex-direction: row; justify-content: space-between; align-items: center; opacity: 0.8; font-size: 10px;">
            ${ev.room ? `<div class="mac-cal-event-room" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 4px;">
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:2px; vertical-align:-1px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              ${escapeHTML(ev.room)}
            </div>` : '<div></div>'}
            <div class="mac-cal-event-time">${formatTime(ev.start)}</div>
          </div>
        </div>
      `;
    } else {
      innerHTML = `
        <div class="mac-cal-event-inner" style="display: flex; flex-direction: column; height: 100%;">
          ${typePill}
          <div class="mac-cal-event-header">
            <div class="mac-cal-event-title" title="${escapeHTML(ev.title)}">${escapeHTML(ev.title)}</div>
            ${actionBtnHTML}
          </div>
          <div style="flex-grow: 1;"></div>
          ${ev.room ? `<div class="mac-cal-event-room">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:2px; vertical-align:-1px; opacity:0.7;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            ${escapeHTML(ev.room)}
          </div>` : ''}
          <div class="mac-cal-event-time" style="opacity: 0.8;">${formatTime(ev.start)} - ${formatTime(ev.end)}</div>
        </div>
      `;
    }

    return `
      <div class="mac-cal-event ${classModifier} mye-open-modal-evt" style="top:${topPx}px; height:${heightPx}px;" data-index="${index}">
        ${innerHTML}
      </div>
    `;
  }

  function attachEventModalListeners() {
    document.querySelectorAll('.mye-open-modal-evt').forEach(el => {
      el.addEventListener('click', (e) => {
        const index = el.getAttribute('data-index');
        openEventModal(index);
      });
    });
  }

  function openEventModal(index) {
    const ev = state.events[index];
    if (!ev) return;
    
    const normType = normalizeType(ev.type);
    let colorData = userSettings.colors[normType] || userSettings.colors['Cours'] || '#8e8e93';
    let bgColor = typeof colorData === 'string' ? colorData : (colorData.bordure || colorData.simple || '#8e8e93');
    
    const headerText = document.getElementById('mye-em-header-text');
    if (headerText) {
      headerText.innerHTML = `
        ${ev.moduleCode ? `<div style="font-size:13px; color:rgba(255,255,255,0.8); margin:0; font-weight:500;">${escapeHTML(ev.moduleCode)}</div>` : ''}
        <div style="font-size: 22px; font-weight: 700; color: white; margin: 0; line-height: 1.2;">${escapeHTML(ev.title)}</div>
      `;
    }
    
    const body = document.getElementById('mye-em-body');
    if (body) {
      let teamsHtml = '';
      let actionButtons = [];
      if (normType !== 'DE' && normType !== 'CE' && normType !== 'CC') {
         let hasMoodle = false;
         
         if (ev.link) {
             const linkLower = ev.link.toLowerCase();
             if (linkLower.includes('teams.microsoft') || linkLower.includes('teams.live') || linkLower.includes('teams.cloud')) {
                 actionButtons.push(`<a href="${ev.link}" target="_blank" style="margin-top: 10px; background: #eef2ff; color: #4f46e5; padding: 10px 20px; border-radius: 999px; font-weight: 600; font-size: 14px; border: 1px solid #c7d2fe; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.2s; max-width: max-content;"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M21 15.46L14 18V13.8L21 16.36V15.46ZM14 10.2L21 12.76V11.86L14 9.3V10.2ZM12 8.44V15.56L3 18V6L12 8.44Z"/></svg> Teams</a>`);
             } else if (linkLower.includes('moodle') || linkLower.includes('elearning')) {
                 actionButtons.push(`<a href="${ev.link}" target="_blank" style="margin-top: 10px; background: #fffbeb; color: #b45309; padding: 10px 20px; border-radius: 999px; font-weight: 600; font-size: 14px; border: 1px solid #fde68a; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.2s; max-width: max-content;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg> Moodle</a>`);
                 hasMoodle = true;
             } else if (linkLower.includes('zoom.us')) {
                 actionButtons.push(`<a href="${ev.link}" target="_blank" style="margin-top: 10px; background: #e0f2fe; color: #0284c7; padding: 10px 20px; border-radius: 999px; font-weight: 600; font-size: 14px; border: 1px solid #bae6fd; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.2s; max-width: max-content;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14v-4z"/><rect x="3" y="6" width="12" height="12" rx="2" ry="2"/></svg> Zoom</a>`);
             } else {
                 actionButtons.push(`<a href="${ev.link}" target="_blank" style="margin-top: 10px; background: #f3f4f6; color: #374151; padding: 10px 20px; border-radius: 999px; font-weight: 600; font-size: 14px; border: 1px solid #d1d5db; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.2s; max-width: max-content;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg> Lien</a>`);
             }
         }
         
         if (ev.raw && ev.raw.moodleUrl && ev.raw.moodleUrl !== ev.link) {
             actionButtons.push(`<a href="${ev.raw.moodleUrl}" target="_blank" style="margin-top: 10px; background: #fffbeb; color: #b45309; padding: 10px 20px; border-radius: 999px; font-weight: 600; font-size: 14px; border: 1px solid #fde68a; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.2s; max-width: max-content;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg> Moodle</a>`);
             hasMoodle = true;
         }
         
         if (!hasMoodle && (ev.moduleCode || ev.title)) {
             const searchQuery = encodeURIComponent(ev.moduleCode || ev.title);
             const searchMoodle = `https://moodle.myefrei.fr/course/search.php?search=${searchQuery}`;
             actionButtons.push(`<a href="${searchMoodle}" target="_blank" style="margin-top: 10px; background: #fffbeb; color: #b45309; padding: 10px 20px; border-radius: 999px; font-weight: 600; font-size: 14px; border: 1px solid #fde68a; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.2s; max-width: max-content;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg> Moodle</a>`);
         }
      }
      teamsHtml = actionButtons.length > 0 ? `<div style="display:flex; gap: 10px; flex-wrap: wrap;">${actionButtons.join('')}</div>` : '';
      
      const dateStr = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(ev.start);
      const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
      
      body.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
          <div style="background-color: #1d3b64; border-radius: 20px; padding: 20px; display: flex; flex-direction: column; align-items: center; gap: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
            <div style="font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 0.5px;">Horaire</div>
            <div style="font-size: 15px; font-weight: 600; color: white; text-align: center;">${cap(dateStr)}</div>
            <div style="font-size: 13px; color: rgba(255,255,255,0.8);">${formatTime(ev.start)} - ${formatTime(ev.end)}</div>
          </div>
          
          <div style="background-color: #1d3b64; border-radius: 20px; padding: 20px; display: flex; flex-direction: column; align-items: center; gap: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
            <div style="font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 0.5px;">Type</div>
            <div style="font-size: 18px; font-weight: 600; color: white;">${escapeHTML(ev.type)}</div>
            <div class="mye-event-type-pill" style="background-color: ${bgColor}; color: #1d1d1f; margin-top: 4px;">${escapeHTML(ev.type)}</div>
          </div>
        </div>
        
        <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 15px;">
          <div style="flex: 1 1 calc(50% - 5px); min-width: 140px; background: #f8fafc; border-radius: 12px; padding: 12px; display: flex; align-items: center; gap: 10px; border: 1px solid #e2e8f0;">
            <div style="font-size: 20px; width: 24px; text-align: center;">${ev.modality && ev.modality.toLowerCase().includes('distanciel') ? '💻' : '🏢'}</div>
            <div style="display: flex; flex-direction: column; overflow: hidden;">
              <span style="font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase;">Modalité</span>
              <span style="font-size: 13px; font-weight: 600; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHTML(ev.modality)}</span>
            </div>
          </div>
          
          ${ev.roomLong || ev.room ? `
          <div style="flex: 1 1 calc(50% - 5px); min-width: 140px; background: #f8fafc; border-radius: 12px; padding: 12px; display: flex; align-items: center; gap: 10px; border: 1px solid #e2e8f0;">
            <div style="font-size: 20px; width: 24px; text-align: center;">📍</div>
            <div style="display: flex; flex-direction: column; overflow: hidden;">
              <span style="font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase;">Salle(s)</span>
              <span style="font-size: 13px; font-weight: 600; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHTML(ev.roomLong || ev.room)}">${escapeHTML(ev.roomLong || ev.room)}</span>
            </div>
          </div>` : ''}
          
          ${ev.groupNames ? `
          <div style="flex: 1 1 calc(50% - 5px); min-width: 140px; background: #f8fafc; border-radius: 12px; padding: 12px; display: flex; align-items: center; gap: 10px; border: 1px solid #e2e8f0;">
            <div style="font-size: 20px; width: 24px; text-align: center;">👥</div>
            <div style="display: flex; flex-direction: column; overflow: hidden;">
              <span style="font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase;">Groupe(s)</span>
              <span style="font-size: 13px; font-weight: 500; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHTML(ev.groupNames)}">${escapeHTML(ev.groupNames)}</span>
            </div>
          </div>` : ''}
          
          ${ev.teacher ? `
          <div style="flex: 1 1 calc(50% - 5px); min-width: 140px; background: #f8fafc; border-radius: 12px; padding: 12px; display: flex; align-items: center; gap: 10px; border: 1px solid #e2e8f0;">
            <div style="font-size: 20px; width: 24px; text-align: center;">👨‍🏫</div>
            <div style="display: flex; flex-direction: column; overflow: hidden;">
              <span style="font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase;">Intervenant</span>
              <span style="font-size: 13px; font-weight: 600; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHTML(ev.teacher)}">${escapeHTML(ev.teacher)}</span>
            </div>
          </div>` : ''}
        </div>
        
        ${ev.comments ? `
        <div style="background: #fff; border-radius: 12px; padding: 12px 16px; display: flex; flex-direction: column; gap: 4px; border: 1px solid #e2e8f0; margin-top: 10px;">
          <span style="font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase;">Remarques</span>
          <span style="font-size: 13px; color: #334155; line-height: 1.4;">${escapeHTML(ev.comments).replace(/\\n/g, '<br>')}</span>
        </div>` : ''}
        
        ${teamsHtml}

          <div style="margin-top: 10px; border-top: 1px solid #eee; padding-top: 10px;">
            <button onclick="document.getElementById('mye-debug-raw').style.display = document.getElementById('mye-debug-raw').style.display === 'none' ? 'block' : 'none'" style="background:none; border:none; color:#007aff; cursor:pointer; font-size:12px; padding:0;">[+] Voir les données brutes de l'API</button>
            <pre id="mye-debug-raw" style="display:none; background:#f5f5f7; padding:10px; border-radius:6px; font-size:11px; max-height:200px; overflow:auto; margin-top:10px; white-space:pre-wrap; word-break:break-all;">${escapeHTML(JSON.stringify(ev.raw, null, 2))}</pre>
          </div>
        </div>
      `;
    }
    
    document.getElementById('mye-event-modal').style.display = 'flex';
  }

  function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function updateGauge() {
    let totalMinutes = 0;
    const { start, end } = getPeriodRange(state.currentDate, state.currentView);
    
    state.events.forEach(ev => {
      if (ev.start && ev.end) {
        // Only sum events that fall within the current view's date range
        if (ev.start >= start && ev.start <= end) {
          totalMinutes += (ev.end - ev.start) / 60000;
        }
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
        const moodleSpaces = await getMoodleSpaces();
        return rawEvents.map(raw => {
           let ev = mapEvent(raw);
           if (!ev.raw.moodleUrl && (ev.moduleCode || ev.title)) {
               let space = null;
               const searchId = ev.moduleCode ? ev.moduleCode.toUpperCase() : null;
               const searchName = ev.title ? ev.title.toLowerCase() : null;
               
               if (searchId) {
                   space = moodleSpaces.find(s => (s.code || '').toUpperCase() === searchId);
                   if (!space) {
                       space = moodleSpaces.find(s => {
                           const scode = (s.code || '').toUpperCase();
                           return scode && searchId.startsWith(scode);
                       });
                   }
               }
               if (!space && searchName) {
                   space = moodleSpaces.find(s => (s.name || '').toLowerCase().includes(searchName));
               }
               
               if (space && (space.url || space.moodleUrl || space.link)) {
                   ev.raw.moodleUrl = space.url || space.moodleUrl || space.link;
               }
           }
           return ev;
        }).filter(ev => ev.start !== null);
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
      
      if (!nextProjet && isPRJ(title, type)) nextProjet = ev;
      if (!nextCE && isCE(title, type)) nextCE = ev;
      if (!nextDE && isDE(title, type)) nextDE = ev;
      if (!nextTAI && isTAI(title, type)) nextTAI = ev;
      if (nextProjet && nextCE && nextDE && nextTAI) break;
    }

    const msInHour = 1000 * 60 * 60;
    const msInDay = msInHour * 24;
    const setLabel = (id, targetEv) => {
      const el = document.getElementById(id);
      if (!el) return;
      const parentItem = el.closest('.mye-countdown-item');
      if (!targetEv) {
        el.textContent = '> 1 mois';
        if (parentItem) {
          parentItem.style.order = 999999999;
          parentItem.style.cursor = 'default';
          parentItem.onclick = null;
        }
      } else {
        const dateStr = targetEv.start;
        const diffMs = dateStr.getTime() - nowTime;
        if (parentItem) {
          parentItem.style.order = Math.max(0, Math.floor(diffMs / 1000));
          parentItem.style.cursor = 'pointer';
          parentItem.onclick = async () => {
            state.currentDate = new Date(dateStr);
            if (state.currentView !== 'day' && state.currentView !== 'week') {
              state.currentView = 'week';
              document.querySelectorAll('.mac-cal-toggle-btn').forEach(b => b.classList.remove('active'));
              const weekBtn = document.querySelector('.mac-cal-toggle-btn[data-view="week"]');
              if (weekBtn) weekBtn.classList.add('active');
            }
            updatePeriodLabel();
            
            await fetchPlanningForPeriod(state.currentDate);
            
            const newEvIndex = state.events.findIndex(e => e.start.getTime() === dateStr.getTime() && e.title === targetEv.title);
            if (newEvIndex !== -1) {
              openEventModal(newEvIndex);
            }
          };
        }
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
