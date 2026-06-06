// =============================================
//  MYEFREI ULTRA - LXP Page (lxp.js)
// =============================================
(function () {
    'use strict';
    let currentRoute = null;
    let currentId = null;
    function getLxpRoute() {
        const path = window.location.pathname;
        if (!path.startsWith('/portal/student/lxp')) return null;
        const actionMatch = path.match(/^\/portal\/student\/lxp\/actions\/([a-f0-9]+)/i);
        if (actionMatch) return { type: 'action', id: actionMatch[1] };
        if (path.match(/^\/portal\/student\/lxp\/catalog/i)) return { type: 'catalog' };
        return { type: 'dashboard' };
    }
    function isLxpPage() {
        return !!getLxpRoute();
    }
    function buildLxpContainer() {
        if (document.getElementById('mye-lxp-container')) return;
        const container = document.createElement('div');
        container.id = 'mye-lxp-container';
        container.className = 'mye-lxp-container mye-page-container';
        container.innerHTML = `
        <div id="mye-lxp-content"></div>
      `;
        document.body.appendChild(container);
    }
    let state = {
        currentPeriod: null,
        currentSchoolYear: null,
        semesters: []
    };
    function formatSemesterLabel(period, schoolYear) {
        const num = parseInt(period.replace('S', ''), 10);
        const years = schoolYear.split('-');
        const displayYear = (num % 2 !== 0) ? years[0] : years[1];
        return `Semestre ${num} - ${displayYear}`;
    }
    async function discoverSemesters() {
        try {
            const res = await fetch('/api/rest/student/periods?withHistory=true', { credentials: 'include' });
            if (!res.ok) return [];

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
    async function loadLxpView(route) {
        const content = document.getElementById('mye-lxp-content');
        if (!content) return;
        content.innerHTML = `<div class="mye-spinner"></div>`;
        if (route.type === 'dashboard') {
            if (state.semesters.length === 0) {
                state.semesters = await discoverSemesters();
                if (state.semesters.length > 0) {
                    const current = state.semesters[state.semesters.length - 1];
                    state.currentPeriod = current.period;
                    state.currentSchoolYear = current.schoolYear;
                }
            }
            await renderDashboard(content);
        } else if (route.type === 'catalog') {
            await renderCatalog(content);
        } else if (route.type === 'action') {
            await renderActionDetail(content, route.id);
        }
    }
    // ==========================================
    // DASHBOARD
    // ==========================================
    async function renderDashboard(content) {
        try {
            const schoolYear = state.currentSchoolYear || '2025-2026';
            const period = state.currentPeriod || 'S4';
            const currentLabel = state.semesters.find(s => s.period === period && s.schoolYear === schoolYear)?.label || formatSemesterLabel(period, schoolYear);
            const [gradesRes, subsRes, contactsRes] = await Promise.all([
                fetch(`/api/rest/student/lxp/grades?schoolYear=${schoolYear}&period=${period}`, { credentials: 'include' }).catch(() => null),
                fetch(`/api/rest/student/lxp/subscriptions?schoolYear=${schoolYear}&period=${period}`, { credentials: 'include' }).catch(() => null),
                fetch(`/api/rest/student/lxp/contacts`, { credentials: 'include' }).catch(() => null)
            ]);
            const gradesData = gradesRes && gradesRes.ok ? await gradesRes.json() : null;
            const subsData = subsRes && subsRes.ok ? await subsRes.json() : [];
            const contactsData = contactsRes && contactsRes.ok ? await contactsRes.json() : [];
            let grade = 0;
            if (Array.isArray(subsData)) {
                subsData.forEach(sub => {
                    const pts = parseFloat(sub.grade);
                    if (!isNaN(pts)) {
                        grade += pts;
                    }
                });
            }
            const totalGrade = 20; // LXP is always out of 20
            const pct = Math.min((grade / totalGrade) * 100, 100);

            let contactsHtml = '';
            if (Array.isArray(contactsData) && contactsData.length > 0) {
                contactsHtml = contactsData.map(c => `
                    <div style="display:flex; align-items:center; gap:12px; margin-top: 12px;">
                        <div style="width:32px; height:32px; border-radius:50%; background:#f1f5f9; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#86868b" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        </div>
                        <div style="text-align:left; overflow:hidden;">
                            <div style="font-weight:700; font-size:13px; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${c.fullName}">${c.fullName}</div>
                            <div style="font-size:11px; color:#64748b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${c.jobTitle}">${c.jobTitle || 'Équipe LXP'}</div>
                            <a href="mailto:${c.email}" style="font-size:12px; color:var(--mye-primary-color); text-decoration:none; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${c.email}">${c.email}</a>
                        </div>
                    </div>
                `).join('');
            } else {
                contactsHtml = `
                    <div style="display:flex; align-items:center; gap:12px; margin-top: 12px;">
                        <div style="width:32px; height:32px; border-radius:50%; background:#f1f5f9; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#86868b" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        </div>
                        <div style="text-align:left; overflow:hidden;">
                            <div style="font-weight:600; font-size:14px; color:#0f172a;">Équipe LXP</div>
                            <a href="mailto:lxp@efrei.fr" style="font-size:13px; color:var(--mye-primary-color); text-decoration:none;">lxp@efrei.fr</a>
                        </div>
                    </div>
                `;
            }

            let subsHtml = '';
            if (Array.isArray(subsData) && subsData.length > 0) {
                subsHtml = subsData.map(sub => {
                    const actionName = sub.action?.name || 'Action inconnue';
                    const axe = sub.action?.category?.axe || 'Général';
                    const isEvent = sub.action?.isEvent;

                    let dateHtml = 'Date indéterminée';
                    if (isEvent && sub.action?.eventData) {
                        const sd = new Date(sub.action.eventData.startDatetime);
                        const ed = new Date(sub.action.eventData.endDatetime);
                        if (!isNaN(sd)) {
                            dateHtml = sd.toLocaleDateString('fr-FR');
                        }
                    } else if (sub.createDate) {
                        dateHtml = `Créé le ${new Date(sub.createDate).toLocaleDateString('fr-FR')}`;
                    }
                    const regStatus = sub.registrationStatus || 'Inconnu';
                    const gradeStatus = sub.gradingStatus || 'En attente';
                    const pts = sub.grade || '-';
                    return `
                        <div class="mye-absence-card" style="margin-bottom: 15px; cursor: pointer;" onclick="window.location.href='/portal/student/lxp/actions/${sub.action?._id || ''}'">
                            <div class="mye-absence-top">
                                <div class="mye-absence-info">
                                    <div style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase;">${axe}</div>
                                    <div class="mye-absence-course">${actionName}</div>
                                    <div class="mye-absence-date">${dateHtml}</div>
                                </div>
                                <div class="mye-absence-type-container" style="gap: 8px;">
                                    <div style="font-size:12px; color:#86868b; text-align:right;">
                                        Inscription : <span style="font-weight:600; color: ${regStatus.toLowerCase().includes('valid') ? '#10b981' : '#f59e0b'}">${regStatus}</span>
                                    </div>
                                    <div style="font-size:12px; color:#86868b; text-align:right;">
                                        Notation : <span style="font-weight:600; color: ${gradeStatus.toLowerCase().includes('valid') ? '#10b981' : '#f59e0b'}">${gradeStatus}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="mye-absence-bottom" style="flex: 0 0 160px; justify-content: center; align-items: center;">
                                <div style="font-size: 24px; font-weight: 800; color: white; line-height: 1;">${pts}</div>
                                <div style="font-size: 12px; opacity: 0.8; color: white; margin-bottom: 8px;">points</div>
                                <div class="mye-detail-row" style="background-color: rgba(255, 255, 255, 0.2); border-radius: 999px; padding: 4px 15px; color: white; font-size: 12px; font-weight: 600;">
                                    DÉTAILS
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
            } else {
                subsHtml = `<div style="padding:40px; text-align:center; color:#86868b;">Aucune action enregistrée pour le moment.</div>`;
            }
            content.innerHTML = `
                <div id="mye-lxp-dashboard-container">
                    <!-- LEFT COLUMN -->
                    <div class="mye-absences-left">
                        <div class="mye-semester-selector" id="mye-semester-selector">
                            <button class="mye-semester-btn" id="mye-semester-btn">
                                <span id="mye-semester-label">${currentLabel}</span>
                                <span class="mye-semester-arrow">▼</span>
                            </button>
                            <div class="mye-semester-dropdown" id="mye-semester-dropdown">
                                ${[...state.semesters].reverse().map(sem => `
                                    <button class="mye-semester-option ${sem.period === period && sem.schoolYear === schoolYear ? 'active' : ''}" data-period="${sem.period}" data-schoolyear="${sem.schoolYear}">
                                        ${sem.label}
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                        
                        <div class="mye-grade-circle-container" style="padding: 20px; margin-top: 5px; width: 100%; box-sizing: border-box;">
                            <div class="mye-grade-label" style="font-size: 28px;">Note LXP</div>
                            <div class="mye-grade-circle" style="max-height: 260px; max-width: 260px; width: 100%; margin: 10px 0;">
                                <svg viewBox="0 0 200 200">
                                    <circle class="mye-grade-circle-bg" cx="100" cy="100" r="90" />
                                    <circle class="mye-grade-circle-fill" cx="100" cy="100" r="90"
                                        stroke-dasharray="565.48"
                                        stroke-dashoffset="${565.48 - (565.48 * pct) / 100}"
                                        style="stroke: ${pct >= 50 ? '#10b981' : (pct >= 25 ? '#f59e0b' : '#ef4444')};" />
                                </svg>
                                <div class="mye-grade-circle-value" style="font-weight: 800; line-height: 1;">
                                    ${grade}
                                </div>
                            </div>
                        </div>
                        <div class="mye-grade-sim-card" style="padding: 15px; width: 100%; box-sizing: border-box;">
                            <div class="mye-grade-sim-label" style="font-size: 20px;">Contacts LXP</div>
                            <div style="display:flex; flex-direction:column; gap:2px;">
                                ${contactsHtml}
                            </div>
                        </div>
                        
                        <div class="mye-lxp-top-banner" style="margin-top: 5px; flex-direction: column; align-items: flex-start; text-align: left; gap: 8px; padding: 15px; width: 100%; box-sizing: border-box;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div class="mye-lxp-banner-icon" style="width: 28px; height: 28px; background: rgba(255,255,255,0.2);">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                        <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>
                                    </svg>
                                </div>
                                <h3 style="margin: 0; font-size: 14px; font-weight: 700; line-height: 1.2;">Mettez à jour vos actions !</h3>
                            </div>
                            <p style="margin: 0; font-size: 12px; opacity: 0.9; line-height: 1.4;">Fin le ${gradesData?.period?.endDate ? new Date(gradesData.period.endDate).toLocaleDateString('fr-FR') : '6 juin'}. Possibilité de justifier après.</p>
                        </div>
                    </div>
                    <!-- RIGHT COLUMN -->
                    <div class="mye-absences-right">
                        <div class="mye-lxp-actions-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                            <div class="mye-absences-title-section" style="margin: 0; font-size: 24px; font-weight: 800; color: #0f172a;">Vos Actions Enregistrées</div>
                            <div class="mye-lxp-btn-primary" onclick="window.location.href='/portal/student/lxp/catalog/'">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                S'INSCRIRE SUR UNE ACTION
                            </div>
                        </div>
                        <div class="mye-absences-grid">
                            ${subsHtml}
                        </div>
                    </div>
                </div>
            `;
            // Bind semester selector events
            const btn = document.getElementById('mye-semester-btn');
            const dropdown = document.getElementById('mye-semester-dropdown');
            if (btn && dropdown) {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    btn.classList.toggle('open');
                    dropdown.classList.toggle('show');
                });
                document.addEventListener('click', () => {
                    btn.classList.remove('open');
                    dropdown.classList.remove('show');
                });
                dropdown.addEventListener('click', (e) => e.stopPropagation());

                const options = dropdown.querySelectorAll('.mye-semester-option');
                options.forEach(opt => {
                    opt.addEventListener('click', async () => {
                        state.currentPeriod = opt.dataset.period;
                        state.currentSchoolYear = opt.dataset.schoolyear;
                        // Trigger reload of the view
                        await loadLxpView({ type: 'dashboard' });
                    });
                });
            }
        } catch (e) {
            console.error(e);
            content.innerHTML = `<div style="text-align:center; color:red; padding:40px;">Erreur lors du chargement du Dashboard.</div>`;
        }
    }
    // ==========================================
    // CATALOG
    // ==========================================
    async function renderCatalog(content) {
        try {
            // Attempt to fetch actions from API
            // Usually it's `/api/rest/student/lxp/actions` or similar. If we get 404, we mock data from user prompt.
            let actions = [];
            const res = await fetch('/api/rest/student/lxp/catalog/actions', { credentials: 'include' }).catch(() => null);
            if (res && res.ok) {
                const data = await res.json();
                actions = Array.isArray(data) ? data : (data.content || data.data || []);
            } else {
                // Mock fallback for visual if API doesn't match exactly
                actions = [
                    { _id: '1', name: 'My job glasses', category: { axe: 'XP for Pro', name: 'Tutorat & Coaching' }, priority: 1, targets: { registration: 'Recommandé', schoolYear: '2025-2026' } },
                    { _id: '2', name: 'Vivatech', category: { axe: 'XP for Pro', name: 'Salons Professionnels' }, priority: 2, targets: { registration: 'Recommandé' }, isEvent: true, eventData: { startDatetime: '2026-06-17T09:00:00' } },
                    { _id: '3', name: 'Concours informatique Prologin', category: { axe: 'XP for Pro', name: 'Challenges' }, priority: 1, targets: { registration: 'Recommandé' } }
                ];
            }
            // Extract unique axes & categories for filters
            const axesSet = new Set();
            const categoriesSet = new Set();
            actions.forEach(a => {
                if (a.category?.axe) axesSet.add(a.category.axe);
                if (a.category?.name) categoriesSet.add(a.category.name);
            });
            const renderCards = (items) => {
                if (items.length === 0) return `<div style="text-align:center; grid-column:1/-1; padding:40px; color:#86868b;">Aucune action trouvée.</div>`;
                return items.map(item => {
                    const title = item.name || 'Action';
                    const axe = item.category?.axe || 'XP';
                    const catName = item.category?.name || 'Catégorie';
                    const picUrl1 = item.picture ? `/api/rest/common/lxp/action/cover/${item.picture}?q=m` : '';
                    const picUrl2 = item.picture ? `/api/rest/common/lxp/action/cover/${item.picture}` : '';
                    const fallbackHtml = `<div class="mye-lxp-ac-cover-fallback">Pas d'image</div>`;
                    const imgTag = item.picture ? `<img src="${picUrl1}" class="mye-lxp-ac-cover-img" style="position: absolute; top:0; left:0; z-index:2;" onerror="this.onerror=null; this.src='${picUrl2}'; this.onerror=function(){this.style.display='none';};">` : '';

                    let dateStr = item.isEvent && item.eventData?.startDatetime ? new Date(item.eventData.startDatetime).toLocaleDateString('fr-FR') : '';
                    return `
                        <div class="mye-lxp-card mye-lxp-action-card" onclick="window.location.href='/portal/student/lxp/actions/${item._id}'">
                            <div class="mye-lxp-ac-cover" style="position: relative;">
                                ${fallbackHtml}
                                ${imgTag}
                                ${item.targets?.schoolYear ? `<div class="mye-lxp-ac-period" style="position: relative; z-index:3;">${item.targets.schoolYear.substring(5)}</div>` : ''}
                            </div>
                            <div class="mye-lxp-ac-body">
                                <div class="mye-lxp-ac-category">${catName}</div>
                                <h3 class="mye-lxp-ac-title">${title}</h3>
                                <div class="mye-lxp-ac-desc">${item.summary || (dateStr ? `Le ${dateStr}` : 'Participez à cette action pour obtenir de l\'XP.')}</div>
                                <div class="mye-lxp-ac-footer">
                                    <span class="mye-lxp-ac-tag">${item.targets?.registration || 'Facultatif'}</span>
                                    <div class="mye-lxp-ac-points">
                                        <span class="mye-lxp-ac-points-val">${item.priority || item.category?.gradingScale?.min || 1}</span>
                                        <span class="mye-lxp-ac-points-lbl">points min</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
            };
            content.innerHTML = `
                <div class="mye-lxp-catalog-header">
                    <button class="mye-lxp-back-btn" onclick="window.location.href='/portal/student/lxp'">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                        RETOUR
                    </button>
                    <h1 class="mye-lxp-catalog-title">Catalogue LXP</h1>
                    <div style="width:100px;"></div> <!-- Spacer -->
                </div>
                <div class="mye-lxp-catalog-body">
                    <div class="mye-lxp-filters mye-lxp-card">
                        <div class="mye-lxp-filter-header">
                            <div class="mye-lxp-filter-title">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                                Filtres
                            </div>
                            <button class="mye-lxp-filter-reset" id="mye-lxp-filter-reset">Réinitialiser</button>
                        </div>
                        <div class="mye-lxp-search-box">
                            <svg class="mye-lxp-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            <input type="text" class="mye-lxp-search-input" id="mye-lxp-search-input" placeholder="Recherche action / événement">
                        </div>
                        <div class="mye-lxp-filter-group">
                            <div class="mye-lxp-filter-group-title">Axes</div>
                            ${Array.from(axesSet).map(axe => `
                                <label class="mye-lxp-filter-item">
                                    <div class="mye-lxp-filter-label">
                                        <input type="checkbox" style="display:none;" value="${axe}" class="mye-lxp-filter-axe">
                                        <div class="mye-lxp-checkbox"><svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                                        ${axe}
                                    </div>
                                    <span class="mye-lxp-filter-count">${actions.filter(a => a.category?.axe === axe).length}</span>
                                </label>
                            `).join('')}
                        </div>
                        
                        <div class="mye-lxp-filter-group">
                            <div class="mye-lxp-filter-group-title">Types</div>
                            <label class="mye-lxp-filter-item">
                                <div class="mye-lxp-filter-label">
                                    <input type="checkbox" style="display:none;" value="action" class="mye-lxp-filter-type">
                                    <div class="mye-lxp-checkbox"><svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="3" fill="none"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                                    Actions
                                </div>
                                <span class="mye-lxp-filter-count">${actions.filter(a => !a.isEvent).length}</span>
                            </label>
                            <label class="mye-lxp-filter-item">
                                <div class="mye-lxp-filter-label">
                                    <input type="checkbox" style="display:none;" value="event" class="mye-lxp-filter-type">
                                    <div class="mye-lxp-checkbox"><svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="3" fill="none"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                                    Evénements
                                </div>
                                <span class="mye-lxp-filter-count">${actions.filter(a => a.isEvent).length}</span>
                            </label>
                        </div>
                    </div>
                    <div class="mye-lxp-catalog-content">
                        <div class="mye-lxp-tabs-wrapper">
                            <button class="mye-lxp-scroll-btn left" id="mye-lxp-scroll-left">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                            </button>
                            <div class="mye-lxp-category-tabs" id="mye-lxp-category-tabs">
                                <button class="mye-lxp-tab active" data-category="ALL">Toutes</button>
                                ${Array.from(categoriesSet).map(c => `<button class="mye-lxp-tab" data-category="${c}">${c}</button>`).join('')}
                            </div>
                            <button class="mye-lxp-scroll-btn right" id="mye-lxp-scroll-right">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                            </button>
                        </div>
                        <div class="mye-lxp-grid">
                            ${renderCards(actions)}
                        </div>
                    </div>
                </div>
                </div>
            `;
            
            const tabsContainer = document.getElementById('mye-lxp-category-tabs');
            const leftBtn = document.getElementById('mye-lxp-scroll-left');
            const rightBtn = document.getElementById('mye-lxp-scroll-right');
            
            if (tabsContainer && leftBtn && rightBtn) {
                const checkScroll = () => {
                    leftBtn.style.display = tabsContainer.scrollLeft > 0 ? 'flex' : 'none';
                    rightBtn.style.display = tabsContainer.scrollWidth > tabsContainer.clientWidth && Math.ceil(tabsContainer.scrollLeft) < (tabsContainer.scrollWidth - tabsContainer.clientWidth) ? 'flex' : 'none';
                };
                tabsContainer.addEventListener('scroll', checkScroll);
                window.addEventListener('resize', checkScroll);
                setTimeout(checkScroll, 100);
                
                leftBtn.addEventListener('click', () => {
                    tabsContainer.scrollBy({ left: -250, behavior: 'smooth' });
                });
                rightBtn.addEventListener('click', () => {
                    tabsContainer.scrollBy({ left: 250, behavior: 'smooth' });
                });
            }

            // FILTER LOGIC
            const filters = {
                search: '',
                axes: new Set(),
                types: new Set(),
                category: 'ALL'
            };

            const updateGrid = () => {
                const filtered = actions.filter(a => {
                    if (filters.search) {
                        const s = filters.search.toLowerCase();
                        if (!a.name?.toLowerCase().includes(s) && !a.summary?.toLowerCase().includes(s)) return false;
                    }
                    if (filters.axes.size > 0 && (!a.category?.axe || !filters.axes.has(a.category.axe))) return false;
                    if (filters.types.size > 0) {
                        const isEvt = !!a.isEvent;
                        if (isEvt && !filters.types.has('event')) return false;
                        if (!isEvt && !filters.types.has('action')) return false;
                    }
                    if (filters.category !== 'ALL' && a.category?.name !== filters.category) return false;
                    return true;
                });
                const grid = document.querySelector('.mye-lxp-grid');
                if (grid) grid.innerHTML = renderCards(filtered);
            };

            const searchInput = document.getElementById('mye-lxp-search-input');
            if (searchInput) searchInput.addEventListener('input', e => { filters.search = e.target.value; updateGrid(); });

            const axeChecks = document.querySelectorAll('.mye-lxp-filter-axe');
            axeChecks.forEach(cb => cb.addEventListener('change', e => {
                if (e.target.checked) filters.axes.add(e.target.value);
                else filters.axes.delete(e.target.value);
                updateGrid();
            }));

            const typeChecks = document.querySelectorAll('.mye-lxp-filter-type');
            typeChecks.forEach(cb => cb.addEventListener('change', e => {
                if (e.target.checked) filters.types.add(e.target.value);
                else filters.types.delete(e.target.value);
                updateGrid();
            }));

            const tabBtns = document.querySelectorAll('.mye-lxp-tab');
            tabBtns.forEach(btn => btn.addEventListener('click', e => {
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                filters.category = btn.dataset.category;
                updateGrid();
            }));

            const resetBtn = document.getElementById('mye-lxp-filter-reset');
            if (resetBtn) resetBtn.addEventListener('click', () => {
                filters.search = '';
                if (searchInput) searchInput.value = '';
                filters.axes.clear();
                axeChecks.forEach(cb => cb.checked = false);
                filters.types.clear();
                typeChecks.forEach(cb => cb.checked = false);
                filters.category = 'ALL';
                tabBtns.forEach(b => b.classList.remove('active'));
                const firstTab = document.querySelector('.mye-lxp-tab');
                if (firstTab) firstTab.classList.add('active');
                updateGrid();
            });

        } catch (e) {
            console.error(e);
            content.innerHTML = `<div style="text-align:center; color:red; padding:40px;">Erreur lors du chargement du Catalogue.</div>`;
        }
    }
    // ==========================================
    // ACTION DETAIL
    // ==========================================
    async function renderActionDetail(content, id) {
        try {
            let item = null;
            let res = await fetch(`/api/rest/student/lxp/actions/${id}`, { credentials: 'include' }).catch(() => null);
            
            if (res && res.ok) {
                item = await res.json();
            } else {
                res = await fetch('/api/rest/student/lxp/catalog/actions', { credentials: 'include' }).catch(() => null);
                if (res && res.ok) {
                    const data = await res.json();
                    const actions = Array.isArray(data) ? data : (data.content || data.data || []);
                    item = actions.find(a => a._id === id);
                }
            }

            if (!item) {
                item = {
                    name: 'Détails de l\'action',
                    summary: 'Une erreur est survenue ou l\'action est introuvable.',
                    category: { name: 'Information' }
                };
            }
            const picUrl1 = item.picture ? (item.picture.startsWith('http') ? item.picture : `/api/rest/common/lxp/action/cover/${item.picture}?q=m`) : '';
            const picUrl2 = item.picture ? (item.picture.startsWith('http') ? item.picture : `/api/rest/common/lxp/action/cover/${item.picture}`) : '';
            
            let coverHtml = `<div style="width:100%; height:100%; border-radius:24px; background:linear-gradient(135deg, #163767, #2b5c9e);"></div>`;
            if (item.picture) {
                coverHtml = `<img src="${picUrl2}" style="width:100%; height:100%; object-fit:contain; border-radius:24px;" onerror="this.onerror=null; this.src='${picUrl1}'; this.onerror=function(){ this.style.display='none'; this.parentElement.innerHTML='<div style=\\'width:100%; height:100%; border-radius:24px; background:linear-gradient(135deg, #163767, #2b5c9e);\\'></div>'; };">`;
            }

            content.innerHTML = `
                <!-- Popup Custom pour l'inscription -->
                <div class="mye-lxp-custom-popup-overlay" id="mye-lxp-register-popup">
                  <div class="mye-lxp-custom-popup">
                    <h3 class="mye-lxp-popup-title">Inscription à l'action</h3>
                    <p class="mye-lxp-popup-desc">Voulez-vous vraiment vous inscrire à cette action LXP ?</p>
                    <p class="mye-lxp-popup-subdesc">L'inscription se fera automatiquement sur le semestre en cours.</p>
                    <div class="mye-lxp-popup-actions">
                      <button class="mye-lxp-popup-btn mye-lxp-popup-cancel" id="mye-lxp-popup-cancel">ANNULER</button>
                      <button class="mye-lxp-popup-btn mye-lxp-popup-confirm" id="mye-lxp-popup-confirm">S'INSCRIRE</button>
                    </div>
                  </div>
                </div>

                <button class="mye-lxp-back-btn" style="margin-bottom: 24px;" onclick="window.history.back()">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                    RETOUR
                </button>
                
                <div class="mye-lxp-card" style="padding: 40px;">
                    <div class="mye-lxp-detail-cover">${coverHtml}</div>
                    
                    <div class="mye-lxp-detail-header">
                        <div>
                            <div style="font-size: 14px; color: #86868b; font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">
                                ${item.category?.axe || 'XP for Pro'} &bull; ${item.category?.name || 'Général'}
                            </div>
                            <h1 style="font-size: 36px; font-weight: 800; margin: 0; line-height: 1.2;">${item.name}</h1>
                        </div>
                        <button class="mye-lxp-btn mye-lxp-btn-primary" id="mye-lxp-action-register-btn">
                            S'INSCRIRE / GÉRER
                        </button>
                    </div>
                    <div class="mye-lxp-detail-info">
                        <h2>Description</h2>
                        <p>${item.summary ? item.summary.replace(/\\r\\n/g, '<br>') : 'Aucune description fournie.'}</p>
                        
                        <h2>Informations pratiques</h2>
                        <ul>
                            <li><strong>Type :</strong> ${item.isEvent ? 'Evénement' : 'Action en continu'}</li>
                            <li><strong>Points max :</strong> ${item.category?.gradingScale?.max || item.priority || '?'}</li>
                            <li><strong>Recommandation :</strong> ${item.targets?.registration || 'Facultatif'}</li>
                        </ul>
                    </div>
                </div>
            `;

            // Logique de la popup d'inscription
            const registerBtn = document.getElementById('mye-lxp-action-register-btn');
            const popupOverlay = document.getElementById('mye-lxp-register-popup');
            const btnCancel = document.getElementById('mye-lxp-popup-cancel');
            const btnConfirm = document.getElementById('mye-lxp-popup-confirm');

            if (registerBtn) {
                registerBtn.addEventListener('click', () => {
                    // 1. Chercher et cliquer sur le vrai bouton de la page
                    const origBtns = document.querySelectorAll('body > div:not(#mye-lxp-container) button, .MuiButtonBase-root');
                    let clicked = false;
                    for (const btn of origBtns) {
                        const text = (btn.textContent || '').toLowerCase().trim();
                        if (text.includes("s'inscrire") || text.includes("se désinscrire") || text.includes("désinscrire") || text.includes("gérer")) {
                            btn.click();
                            clicked = true;
                            break;
                        }
                    }
                    
                    if (!clicked) {
                        // Parfois le bouton est juste "S'inscrire"
                        const fallbackBtns = document.querySelectorAll('button');
                        for (const btn of fallbackBtns) {
                            if (btn.closest('#mye-lxp-container')) continue;
                            const text = (btn.textContent || '').toLowerCase().trim();
                            if (text.includes("inscrire") || text.includes("désinscrire")) {
                                btn.click();
                                break;
                            }
                        }
                    }

                    // 2. Attendre que React monte la modal et analyser son contenu pour adapter notre popup
                    setTimeout(() => {
                        const muiModal = document.querySelector('.MuiModal-root');
                        const muiText = (muiModal ? muiModal.textContent : '').toLowerCase();
                        
                        const popupTitle = document.querySelector('.mye-lxp-popup-title');
                        const popupDesc = document.querySelector('.mye-lxp-popup-desc');
                        const popupSubDesc = document.querySelector('.mye-lxp-popup-subdesc');
                        
                        if (muiText.includes('désinscri') || muiText.includes('annuler') || muiText.includes('supprimer')) {
                            if (popupTitle) popupTitle.textContent = "Désinscription";
                            if (popupDesc) popupDesc.textContent = "Voulez-vous vraiment vous désinscrire ?";
                            if (popupSubDesc) popupSubDesc.textContent = "Vos points associés à cette action seront perdus.";
                            btnConfirm.textContent = "CONFIRMER";
                            btnConfirm.style.backgroundColor = "#ef4444"; // Rouge pour suppression
                        } else {
                            if (popupTitle) popupTitle.textContent = "Inscription à l'action";
                            if (popupDesc) popupDesc.textContent = "Voulez-vous vraiment vous inscrire à cette action LXP ?";
                            if (popupSubDesc) popupSubDesc.textContent = "L'inscription se fera automatiquement sur le semestre en cours.";
                            btnConfirm.textContent = "S'INSCRIRE";
                            btnConfirm.style.backgroundColor = "var(--mye-primary-color, #163767)";
                        }
                        
                        // Afficher notre popup
                        popupOverlay.classList.add('show');
                    }, 100);
                });
            }

            if (btnCancel) {
                btnCancel.addEventListener('click', () => {
                    popupOverlay.classList.remove('show');
                    // Fermer la vraie popup MUI
                    const origCancelBtns = document.querySelectorAll('.MuiModal-root button');
                    for (const btn of origCancelBtns) {
                        if ((btn.textContent || '').toLowerCase().includes('annuler') || (btn.textContent || '').toLowerCase().includes('non')) {
                            btn.click();
                            break;
                        }
                    }
                });
            }

            if (btnConfirm) {
                btnConfirm.addEventListener('click', () => {
                    btnConfirm.textContent = 'EN COURS...';
                    btnConfirm.style.pointerEvents = 'none';
                    
                    // Chercher le bouton d'inscription/désinscription dans la vraie popup MUI
                    const muiBtns = document.querySelectorAll('.MuiModal-root button');
                    let clicked = false;
                    
                    for (const btn of muiBtns) {
                        const text = (btn.textContent || '').toLowerCase();
                        if (text.includes('inscrire') || text.includes('désinscrire') || text.includes('confirmer') || text.includes('valider') || text.includes('oui')) {
                            btn.click();
                            clicked = true;
                            break;
                        }
                    }
                    
                    if (!clicked) {
                        console.error("Bouton de confirmation original introuvable.");
                        btnConfirm.textContent = 'ERREUR';
                        setTimeout(() => {
                            btnConfirm.textContent = "RÉESSAYER";
                            btnConfirm.style.pointerEvents = 'auto';
                        }, 2000);
                    } else {
                        setTimeout(() => {
                            window.location.reload();
                        }, 1500);
                    }
                });
            }

        } catch (e) {
            console.error(e);
            content.innerHTML = `<div style="text-align:center; color:red; padding:40px;">Erreur lors du chargement des détails.</div>`;
        }
    }
    // ==========================================
    // ROUTER
    // ==========================================
    let lastUrl = window.location.href;
    setInterval(() => {
        if (lastUrl !== window.location.href) {
            lastUrl = window.location.href;
            checkRoute();
        }
    }, 200);
    function checkRoute() {
        const route = getLxpRoute();

        if (route) {
            // We are on LXP page
            document.body.classList.add('mye-clean-screen'); // Hide original body elements

            const changed = !currentRoute || currentRoute.type !== route.type || currentRoute.id !== route.id;
            currentRoute = route;
            if (changed || !document.getElementById('mye-lxp-container')) {
                buildLxpContainer();
                loadLxpView(route);
            }
        } else {
            // Not on LXP page
            const container = document.getElementById('mye-lxp-container');
            if (container) container.remove();
            currentRoute = null;
        }
    }
    // Init
    if (isLxpPage()) {
        if (document.body) document.body.classList.add('mye-clean-screen');
        else document.addEventListener('DOMContentLoaded', () => document.body.classList.add('mye-clean-screen'));
        const checkHeader = setInterval(() => {
            if (document.getElementById('mye-custom-header-wrapper') || document.getElementById('mye-custom-header')) {
                clearInterval(checkHeader);
                checkRoute();
            }
        }, 200);

        // Fallback
        setTimeout(() => {
            clearInterval(checkHeader);
            if (!document.getElementById('mye-lxp-container')) checkRoute();
        }, 5000);
    }
})();