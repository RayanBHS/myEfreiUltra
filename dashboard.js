// dashboard.js - Custom Dashboard Logic for myEfrei ULTRA

const API_PERIODS = '/api/rest/student/periods?withHistory=true';
const API_GRADES = '/api/rest/student/grades';
const API_ABSENCES = '/api/rest/student/absences';
const API_PLANNING = '/api/rest/student/planning';
const API_SLIDES = '/api/rest/common/slides';

// Instantly prepare the document to prevent original UI from flashing
if (window.location.pathname.includes('/portal/student/home')) {
    document.documentElement.classList.add('mye-dashboard-active');
}

async function fetchDashboardData() {
    try {
        // 1. Fetch current period
        const periodRes = await fetch(API_PERIODS, { credentials: 'include' });
        const periodsData = await periodRes.json();
        
        // Find current period (or default to the first one)
        let currentPeriod = periodsData.find(p => p.isCurrent) || periodsData[0];
        
        if (!currentPeriod) return;
        
        const sy = currentPeriod.schoolYear;
        const periodId = currentPeriod.period;
        
        const badgeEl = document.getElementById('mye-dash-period-badge-el');
        if (badgeEl) badgeEl.textContent = `${periodId} - ${sy}`;

        // Retrieve selected semester from the portal selector if possible

        // 2. Fetch Grades
        fetch(`${API_GRADES}?schoolYear=${sy}&period=${periodId}`, { credentials: 'include' })
            .then(res => res.json())
            .then(raw => {
                const average = parseGradesToAverage(raw);
                if (average !== null) {
                    const avgEl = document.getElementById('mye-dash-moyenne');
                    avgEl.textContent = average.toFixed(2).replace('.', ',');
                    avgEl.style.color = getDashGradeColor(average);
                    
                    const pct = Math.min((average / 20) * 100, 100);
                    const barEl = document.getElementById('mye-dash-moyenne-bar');
                    barEl.style.width = `${pct}%`;
                    barEl.style.backgroundColor = getDashGradeColor(average);
                } else {
                    document.getElementById('mye-dash-moyenne').textContent = '-';
                    document.getElementById('mye-dash-moyenne-bar').style.width = '0%';
                }
            })
            .catch(console.error);

        // 3. Fetch Absences
        fetch(`${API_ABSENCES}?schoolYear=${sy}&period=${periodId}`, { credentials: 'include' })
            .then(res => res.json())
            .then(raw => {
                let data = [];
                if (Array.isArray(raw)) data = raw;
                else if (raw && Array.isArray(raw.data)) data = raw.data;
                else if (raw && Array.isArray(raw.absences)) data = raw.absences;

                let absCountUnjustified = 0;
                let totalRetards = 0;
                data.forEach(item => {
                    const itemType = (item.type || '').toLowerCase();
                    const itemStatus = (item.status || '').toLowerCase();
                    const isRetard = itemType === 'lateness' || itemType === 'late' || (item.label && item.label.toLowerCase().includes('retard'));
                    const isAbsence = !isRetard;
                    const justified = item.justified === true || itemStatus === 'excused' || itemStatus === 'justified';
                    
                    if (isAbsence && !justified) absCountUnjustified++;
                    if (isRetard) totalRetards++;
                });
                
                const absEl = document.getElementById('mye-dash-absences');
                absEl.textContent = absCountUnjustified;
                absEl.style.color = getDashAbsColor(absCountUnjustified);
                
                const retEl = document.getElementById('mye-dash-retards');
                retEl.textContent = totalRetards;
                retEl.style.color = getDashRetColor(totalRetards);
            })
            .catch(console.error);

        // 3.5. Fetch LXP (grouped by pair if even semester)
        try {
            const periodNum = parseInt(periodId.replace('S', ''), 10);
            let prevPeriodId = null;
            let prevSchoolYear = null;
            if (!isNaN(periodNum) && periodNum % 2 === 0) {
                const prev = periodsData.find(p => p.period === `S${periodNum - 1}`);
                if (prev) {
                    prevPeriodId = prev.period;
                    prevSchoolYear = prev.schoolYear;
                }
            }

            const lxpPromises = [
                fetch(`/api/rest/student/lxp/grades?schoolYear=${sy}&period=${periodId}`, { credentials: 'include' }).catch(() => null)
            ];

            if (prevPeriodId && prevSchoolYear) {
                lxpPromises.push(
                    fetch(`/api/rest/student/lxp/grades?schoolYear=${prevSchoolYear}&period=${prevPeriodId}`, { credentials: 'include' }).catch(() => null)
                );
            }

            const lxpResults = await Promise.all(lxpPromises);
            const lxpData = lxpResults[0] && lxpResults[0].ok ? await lxpResults[0].json() : null;
            const prevLxpData = lxpResults[1] && lxpResults[1].ok ? await lxpResults[1].json() : null;

            let lxpGrade = lxpData?.period?.grade || 0;
            if (prevLxpData) {
                lxpGrade += prevLxpData?.period?.grade || 0;
            }

            const lxpCard = document.getElementById('mye-dash-card-lxp');
            if (lxpCard) {
                const valEl = lxpCard.querySelector('.mye-stat-value');
                const barEl = lxpCard.querySelector('.mye-stat-progress-bar');
                if (valEl) valEl.textContent = lxpGrade;
                if (barEl) {
                    const pct = Math.min((lxpGrade / 20) * 100, 100);
                    barEl.style.width = `${pct}%`;
                    barEl.style.backgroundColor = getDashGradeColor(lxpGrade);
                }
            }
        } catch (err) {
            console.error("Erreur chargement LXP dashboard", err);
        }

        // 4. Fetch Planning (Today + next 7 days)
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(startDate.getDate() + 7);
        
        const planningUrl = new URL(API_PLANNING, window.location.origin);
        planningUrl.searchParams.append('startDate', startDate.toISOString().split('T')[0]);
        planningUrl.searchParams.append('endDate', endDate.toISOString().split('T')[0]);
        
        fetch(planningUrl.toString(), { credentials: 'include' })
            .then(res => res.json())
            .then(data => {
                renderPlanning(data);
            })
            .catch(console.error);

        // 5. Fetch Slides
        fetch(API_SLIDES)
            .then(res => res.json())
            .then(data => {
                renderSlides(data);
            })
            .catch(console.error);

        // Hide loader once everything is initiated (it might still be loading images, but data is there)
        setTimeout(() => {
            const loader = document.getElementById('mye-dash-loader');
            if (loader) {
                loader.style.opacity = '0';
                loader.style.transition = 'opacity 0.3s ease';
                setTimeout(() => loader.remove(), 300);
            }
        }, 500);

    } catch (e) {
        console.error("Erreur chargement dashboard", e);
    }
}

function parseGradesToAverage(raw) {
    let uesArray = null;

    if (raw && raw.grades && Array.isArray(raw.grades.ues)) uesArray = raw.grades.ues;
    else if (Array.isArray(raw)) uesArray = raw;
    else if (raw && typeof raw === 'object') {
        for (const key of ['ues', 'data', 'results']) {
            if (raw[key] && Array.isArray(raw[key])) uesArray = raw[key];
        }
    }

    if (!uesArray) return null;

    let totalWeightedSum = 0;
    let totalCoef = 0;

    uesArray.forEach(ue => {
        const ueAverage = ue.grade != null ? parseFloat(ue.grade) : (ue.average != null ? parseFloat(ue.average) : null);
        const ueCoef = ue.coef != null ? parseFloat(ue.coef) : (ue.ectsAttempted != null ? parseFloat(ue.ectsAttempted) : 1);
        const subjectsRaw = ue.modules || ue.courses || ue.subjects || [];
        
        if (subjectsRaw.length >= 2 && ueAverage != null && !isNaN(ueAverage) && !isNaN(ueCoef)) {
            totalWeightedSum += ueAverage * ueCoef;
            totalCoef += ueCoef;
        }
    });

    return totalCoef > 0 ? totalWeightedSum / totalCoef : null;
}

function renderPlanning(classes) {
    const list = document.getElementById('mye-planning-list');
    list.innerHTML = '';
    
    // Sort classes by start time
    classes.sort((a, b) => new Date(a.start) - new Date(b.start));
    
    // Filter future classes only
    const now = new Date();
    const futureClasses = classes.filter(c => new Date(c.end) > now).slice(0, 3);
    
    if (futureClasses.length === 0) {
        list.innerHTML = '<div style="color:white; text-align:center; padding: 20px;">Aucun cours à venir</div>';
        return;
    }
    
    const formatterMonth = new Intl.DateTimeFormat('fr-FR', { month: 'long' });
    const formatterDay = new Intl.DateTimeFormat('fr-FR', { day: '2-digit' });
    const formatterTime = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

    futureClasses.forEach(c => {
        const d = new Date(c.start);
        const endD = new Date(c.end);
        
        const month = formatterMonth.format(d);
        const day = formatterDay.format(d);
        const timeStr = `${formatterTime.format(d).replace(':', 'H')} - ${formatterTime.format(endD).replace(':', 'H')}`;
        
        const { title, room } = extractRoomAndTitle(c);
        
        const html = `
            <div class="mye-planning-item mye-clickable-card" onclick="sessionStorage.setItem('mye_open_event_time', '${d.toISOString()}'); window.location.href='/portal/student/planning';">
                <div class="mye-planning-date">
                    <div class="mye-planning-month">${month}</div>
                    <div class="mye-planning-day">${day}</div>
                </div>
                <div class="mye-planning-info">
                    <div class="mye-planning-course">${title}</div>
                    <div class="mye-planning-details">${room} • ${timeStr}</div>
                </div>
            </div>
        `;
        list.insertAdjacentHTML('beforeend', html);
    });
}

function extractRoomAndTitle(raw) {
    let title = raw.subject || raw.title || raw.name || raw.label || raw.summary || raw.matiere || 'Cours';
    if (typeof title === 'object') title = title.name || title.label || JSON.stringify(title);

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
                } else if (r) allRoomStrings.push(String(r));
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
    let room = cleanedParts.find(p => /\d/.test(p)) || (cleanedParts.length > 0 ? cleanedParts[0] : 'Salle inconnue');

    return { title, room };
}

function getDashGradeColor(val) {
    const n = parseFloat(val);
    if (isNaN(n)) return '';
    if (n < 10) return '#ef4444';       // Rouge
    if (n < 13) return '#f59e0b';       // Orange
    if (n < 15) return '#84cc16';       // Vert clair
    return '#16a34a';                   // Vert foncé
}

function getDashAbsColor(val) {
    const n = parseInt(val, 10);
    if (isNaN(n)) return '';
    if (n === 0) return '#10b981';      // Vert
    if (n <= 3) return '#f59e0b';       // Orange
    return '#ef4444';                   // Rouge
}

function getDashRetColor(val) {
    const n = parseInt(val, 10);
    if (isNaN(n)) return '';
    if (n === 0) return '#10b981';      // Vert
    if (n <= 2) return '#f59e0b';       // Orange
    return '#ef4444';                   // Rouge
}

function renderSlides(slides) {
    const container = document.getElementById('mye-carousel-slides');
    const dotsContainer = document.getElementById('mye-carousel-dots');
    
    if (!slides || slides.length === 0) return;
    
    container.innerHTML = '';
    dotsContainer.innerHTML = '';
    
    slides.forEach((slide, index) => {
        let picId = slide.picture || slide.illustrationId || slide.imageId || slide.image || slide.token;
        let imgUrl = '';
        
        if (picId) {
            imgUrl = `/api/rest/common/slides/images/${picId}-original.jpg`; // Attempt original first
        } else if (slide._id) {
            imgUrl = `/api/rest/common/slides/images/${slide._id}-original.jpg`;
        } else if (slide.imageUrl || slide.image_url || slide.pictureUrl) {
            imgUrl = slide.imageUrl || slide.image_url || slide.pictureUrl;
        } else {
            imgUrl = `/api/rest/common/slides/images/unknown.jpg`;
        }

        const slideCode = slide.token || slide._id || '';

        const slideHtml = `
            <div class="mye-carousel-slide ${index === 0 ? 'active' : ''}" data-index="${index}" data-slide-code="${slideCode}">
                <img class="mye-carousel-img" src="${imgUrl}" alt="${slide.title || 'Slide'}" 
                     onerror="
                        var currentSrc = this.getAttribute('src');
                        var attempts = this.dataset.attempts ? this.dataset.attempts.split(',') : [];
                        var picId = '${slideCode}';
                        if (picId) {
                            var candidates = [
                                '/api/rest/common/slides/images/' + picId + '-xl.jpg',
                                '/api/rest/common/slides/images/' + picId,
                                '/api/rest/common/slides/images/' + picId + '.jpg',
                                '/api/rest/common/slides/images/' + picId + '-lg.jpg',
                                '/api/rest/common/slides/images/' + picId + '-md.jpg'
                            ];
                            var nextUrl = '';
                            for (var i = 0; i < candidates.length; i++) {
                                if (candidates[i] !== currentSrc && attempts.indexOf(candidates[i]) === -1) {
                                    nextUrl = candidates[i];
                                    break;
                                }
                            }
                            if (nextUrl) {
                                attempts.push(currentSrc);
                                this.dataset.attempts = attempts.join(',');
                                this.src = nextUrl;
                                return;
                            }
                        }
                        this.style.display = 'none';
                     ">
                <div class="mye-carousel-overlay">
                    <h3 class="mye-carousel-title">${slide.title || ''}</h3>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', slideHtml);
        
        const dotHtml = `<div class="mye-carousel-dot ${index === 0 ? 'active' : ''}" data-index="${index}"></div>`;
        dotsContainer.insertAdjacentHTML('beforeend', dotHtml);
    });

    // Bind click events to open slide modal
    container.querySelectorAll('.mye-carousel-slide').forEach(slideEl => {
        slideEl.addEventListener('click', () => {
            const slideCode = slideEl.getAttribute('data-slide-code');
            if (slideCode) {
                openSlideModal(slideCode);
            }
        });
    });
    
    initCarousel();
}

function initCarousel() {
    let currentSlide = 0;
    const slides = document.querySelectorAll('.mye-carousel-slide');
    const dots = document.querySelectorAll('.mye-carousel-dot');
    const totalSlides = slides.length;
    
    if (totalSlides <= 1) {
        document.getElementById('mye-carousel-prev').style.display = 'none';
        document.getElementById('mye-carousel-next').style.display = 'none';
        return;
    }

    const showSlide = (index) => {
        slides.forEach(s => s.classList.remove('active'));
        dots.forEach(d => d.classList.remove('active'));
        
        slides[index].classList.add('active');
        dots[index].classList.add('active');
        currentSlide = index;
    };

    document.getElementById('mye-carousel-next').addEventListener('click', () => {
        showSlide((currentSlide + 1) % totalSlides);
    });

    document.getElementById('mye-carousel-prev').addEventListener('click', () => {
        showSlide((currentSlide - 1 + totalSlides) % totalSlides);
    });

    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => showSlide(index));
    });
    
    // Auto-advance
    setInterval(() => {
        const carousel = document.getElementById('mye-custom-dashboard');
        if (carousel) showSlide((currentSlide + 1) % totalSlides);
    }, 5000);
}

async function openSlideModal(slideCode) {
    if (!slideCode) return;
    
    // Prevent multiple modals from opening simultaneously
    if (document.getElementById('mye-slide-modal')) return;
    
    // Create the modal element
    const modal = document.createElement('div');
    modal.id = 'mye-slide-modal';
    
    modal.innerHTML = `
        <div class="mye-modal-card">
            <div class="mye-modal-top-header" style="background-color: var(--mye-primary-color); padding: 24px; display: flex; justify-content: space-between; align-items: flex-start; flex-shrink: 0; width: 100%; box-sizing: border-box;">
                <div style="flex: 1; padding-right: 16px;">
                    <h1 id="mye-slide-title-el" style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #ffffff; line-height: 1.2;">Chargement...</h1>
                    <div id="mye-slide-meta-el" style="font-size: 15px; font-weight: 500; color: rgba(255, 255, 255, 0.8);">Patientez s'il vous plaît</div>
                </div>
                <button class="mye-modal-close-btn mye-header-close-btn" id="mye-modal-close-btn" aria-label="Fermer" style="position: static;">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            <div class="mye-modal-scrollable" id="mye-modal-scrollable">
                <div class="mye-modal-inner-loading" style="display:flex; justify-content:center; align-items:center; height:300px; flex-direction:column; gap:16px;">
                    <div class="mye-spinner"></div>
                    <div style="color:var(--mye-primary-color); font-weight:600;">Chargement des détails...</div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Trigger CSS transition by adding class on next frame
    requestAnimationFrame(() => {
        modal.classList.add('show');
    });
    
    // Disable body scroll, keeping current scroll position intact
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    
    // Close modal helper
    const closeModal = () => {
        modal.classList.remove('show');
        document.body.style.overflow = originalOverflow;
        
        // Remove from DOM after transition
        setTimeout(() => {
            modal.remove();
        }, 300);
        
        // Cleanup global listeners
        document.removeEventListener('keydown', handleEsc);
    };
    
    // Event listeners for closing
    modal.addEventListener('click', (e) => {
        // If clicked on backdrop (mye-slide-modal itself)
        if (e.target === modal) {
            closeModal();
        }
    });
    
    const closeBtn = modal.querySelector('#mye-modal-close-btn');
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeModal();
    });
    
    const handleEsc = (e) => {
        if (e.key === 'Escape') {
            closeModal();
        }
    };
    document.addEventListener('keydown', handleEsc);
    
    // Fetch slide details
    try {
        const res = await fetch(`/api/rest/common/slides/${slideCode}`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch slide details');
        const slide = await res.json();
        
        const scrollable = modal.querySelector('#mye-modal-scrollable');
        
        const title = slide.title || 'Détails de l\'évènement';
        const author = slide.author || 'Efrei Paris';
        const dateStr = slide.updateDate || slide.date;
        let dateHtml = '';
        if (dateStr) {
            const d = new Date(dateStr);
            if (!isNaN(d)) {
                dateHtml = `Mis à jour le ${d.toLocaleDateString('fr-FR')} à ${d.toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}`;
            }
        }
        
        const picId = slide.token || slide.picture || slide._id;
        const imgUrl = picId ? `/api/rest/common/slides/images/${picId}` : '';
        
        let coverHtml = '';
        if (imgUrl) {
            coverHtml = `
                <div class="mye-modal-cover-wrapper">
                    <img class="mye-modal-cover-img" src="${imgUrl}" alt="${title}" 
                         onerror="
                            var currentSrc = this.getAttribute('src');
                            var attempts = this.dataset.attempts ? this.dataset.attempts.split(',') : [];
                            var picId = '${picId}';
                            if (picId) {
                                var candidates = [
                                    '/api/rest/common/slides/images/' + picId,
                                    '/api/rest/common/slides/images/' + picId + '.jpg',
                                    '/api/rest/common/slides/images/' + picId + '-lg.jpg'
                                ];
                                var nextUrl = '';
                                for (var i = 0; i < candidates.length; i++) {
                                    if (candidates[i] !== currentSrc && attempts.indexOf(candidates[i]) === -1) {
                                        nextUrl = candidates[i];
                                        break;
                                    }
                                }
                                if (nextUrl) {
                                    attempts.push(currentSrc);
                                    this.dataset.attempts = attempts.join(',');
                                    this.src = nextUrl;
                                    return;
                                }
                            }
                            this.parentNode.style.display = 'none';
                         ">
                </div>
            `;
        }
        
        const titleEl = modal.querySelector('#mye-slide-title-el');
        const metaEl = modal.querySelector('#mye-slide-meta-el');
        
        if (titleEl) titleEl.textContent = title;
        if (metaEl) metaEl.innerHTML = `${author}${dateHtml ? ' &bull; ' + dateHtml : ''}`;
        
        scrollable.innerHTML = `
            ${coverHtml}
            
            <div class="mye-article-body" style="margin-top: 24px;">
                ${slide.text || '<p>Aucun contenu supplémentaire disponible.</p>'}
            </div>
        `;
    } catch (err) {
        console.error(err);
        const scrollable = modal.querySelector('#mye-modal-scrollable');
        scrollable.innerHTML = `
            <div style="padding:40px; text-align:center;">
                <h2 style="color:red; margin-bottom:10px;">Erreur de chargement</h2>
                <p style="color:#666;">Impossible de charger les détails de cet évènement.</p>
            </div>
        `;
    }
}

function buildDashboardHTML() {
    // Attempt to get name from header if possible
    const firstName = document.getElementById('mye-first-name')?.textContent || 'Prénom';
    const lastName = document.getElementById('mye-last-name')?.textContent || 'Nom';
    
    return `
        <div id="mye-custom-dashboard" data-mye-theme="${localStorage.getItem('mye-dash-theme') || 'navy'}">
            <div id="mye-dash-loader">
                <div class="mye-spinner"></div>
                <div class="mye-dash-loader-text">Chargement de votre espace...</div>
            </div>
            <div class="mye-dash-top-row">
                <!-- Left Card -->
                <div class="mye-dash-card mye-dash-left-card">
                    <div class="mye-dash-header">
                        <h1 class="mye-dash-title">${lastName} ${firstName}</h1>
                        <div class="mye-dash-header-right-col">
                            <span class="mye-dash-period-badge" id="mye-dash-period-badge-el">...</span>
                            <div class="mye-dash-header-settings">
                                <button id="mye-dash-settings-btn" class="mye-dash-settings-btn" title="Personnaliser le thème">
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <circle cx="12" cy="12" r="3"></circle>
                                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                                    </svg>
                                    <span>Thème</span>
                                </button>
                                <div id="mye-dash-theme-menu" class="mye-dash-theme-menu">
                                    <div class="mye-theme-menu-title">Couleur du dashboard</div>
                                    <div class="mye-theme-colors-grid">
                                        <div class="mye-color-option option-navy" data-color="navy" title="Bleu Classique"></div>
                                        <div class="mye-color-option option-emerald" data-color="emerald" title="Vert Émeraude"></div>
                                        <div class="mye-color-option option-purple" data-color="purple" title="Violet Royal"></div>
                                        <div class="mye-color-option option-ruby" data-color="ruby" title="Rouge Rubis"></div>
                                        <div class="mye-color-option option-slate" data-color="slate" title="Gris Ardoise"></div>
                                        <div class="mye-color-option option-oled" data-color="oled" title="Noir OLED"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="mye-dash-stats-grid">
                        <div class="mye-stat-box mye-stat-blue mye-clickable-card" id="mye-dash-card-moyenne">
                            <div class="mye-stat-title">Moyenne générale</div>
                            <div class="mye-stat-value" id="mye-dash-moyenne"><div class="mye-small-spinner"></div></div>
                            <div class="mye-stat-progress">
                                <div class="mye-stat-progress-bar" id="mye-dash-moyenne-bar" style="width: 0%;"></div>
                            </div>
                        </div>
                        <div class="mye-stat-middle-col">
                            <div class="mye-stat-middle-box mye-stat-red mye-clickable-card" id="mye-dash-card-absences">
                                <div class="mye-middle-value" id="mye-dash-absences"><div class="mye-small-spinner"></div></div>
                                <div class="mye-middle-title">Absences</div>
                            </div>
                            <div class="mye-stat-middle-box mye-stat-green mye-clickable-card" id="mye-dash-card-retards">
                                <div class="mye-middle-value" id="mye-dash-retards"><div class="mye-small-spinner"></div></div>
                                <div class="mye-middle-title">Retards</div>
                            </div>
                        </div>
                        <div class="mye-stat-box mye-stat-blue mye-clickable-card" id="mye-dash-card-lxp">
                            <div class="mye-stat-title">Learning XP</div>
                            <div class="mye-stat-value">-</div>
                            <div class="mye-stat-progress">
                                <div class="mye-stat-progress-bar" style="width: 0%;"></div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Right Card -->
                <div class="mye-dash-card mye-dash-right-card">
                    <h2 class="mye-planning-title">Planning</h2>
                    <div class="mye-planning-list" id="mye-planning-list">
                        <!-- Classes injected here -->
                    </div>
                </div>
            </div>
            
            <!-- Bottom Carousel -->
            <div class="mye-dash-carousel-card">
                <div class="mye-carousel-container">
                    <div id="mye-carousel-slides">
                        <!-- Slides injected here -->
                    </div>
                    <div class="mye-carousel-controls">
                        <button class="mye-carousel-btn" id="mye-carousel-prev">
                            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                        </button>
                        <button class="mye-carousel-btn" id="mye-carousel-next">
                            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        </button>
                    </div>
                </div>
                <div class="mye-carousel-dots" id="mye-carousel-dots">
                    <!-- Dots injected here -->
                </div>
            </div>
            
            <!-- Footer Segmented Selector -->
            <div class="mye-segmented-container">
                <div class="mye-segmented-selector">
                    <div class="mye-segmented-item active" data-link="actualite">Actualité</div>
                    <div class="mye-segmented-item" data-link="evenements">Evenements</div>
                    <div class="mye-segmented-item" data-link="contact">Contact</div>
                    <div class="mye-segmented-item" data-link="reseaux">Sociale</div>
                </div>
            </div>
            
            <!-- Dynamic Content Area -->
            <div id="mye-dash-footer-content" style="margin-top: 20px; width: 100%;"></div>
        </div>
    `;
}

function handleFooterClicks() {
    document.querySelectorAll('.mye-segmented-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const category = btn.getAttribute('data-link');
            const label = btn.textContent;
            
            // Prevent reloading if already active
            if (btn.classList.contains('active')) return;
            
            // Update active state in selector
            document.querySelectorAll('.mye-segmented-item').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            if (category === 'actualite') {
                loadFooterNews();
            } else if (category === 'evenements') {
                loadFooterEvents();
            } else if (category === 'reseaux') {
                loadFooterSocials();
            } else if (category === 'contact') {
                loadFooterContacts();
            } else {
                loadFooterConstruction(label);
            }
        });
    });
}

async function loadFooterNews() {
    const container = document.getElementById('mye-dash-footer-content');
    if (!container) return;
    
    // Show spinner
    container.innerHTML = `
        <div class="mye-news-spinner">
            <div class="mye-spinner"></div>
        </div>
    `;
    
    try {
        const res = await fetch('/api/rest/common/news?page=0', { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch news');
        const data = await res.json();
        
        let items = [];
        if (Array.isArray(data)) {
            items = data;
        } else if (data && data.content && Array.isArray(data.content)) {
            items = data.content;
        } else if (data && data.data && Array.isArray(data.data)) {
            items = data.data;
        } else if (data && data.items && Array.isArray(data.items)) {
            items = data.items;
        } else if (data && data.news && Array.isArray(data.news)) {
            items = data.news;
        }
        
        if (items.length === 0) {
            container.innerHTML = `<div class="mye-dash-card" style="text-align:center; padding: 40px; border-radius:24px; color: #888;">Aucune actualité disponible</div>`;
            return;
        }
        
        container.innerHTML = `
            <div id="mye-news-grid" class="mye-news-grid"></div>
            <div class="mye-dash-more-news-container">
                <button id="mye-dash-more-news-btn" class="mye-dash-more-news-btn">
                    Voir toutes les actualités
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                        <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                </button>
            </div>
        `;
        const grid = document.getElementById('mye-news-grid');
        const moreBtn = document.getElementById('mye-dash-more-news-btn');
        if (moreBtn) {
            moreBtn.addEventListener('click', () => {
                window.location.href = '/portal/common/news';
            });
        }
        
        items.slice(0, 20).forEach(item => {
            const card = document.createElement('div');
            card.className = 'mye-news-card mye-news-card-visible';
            
            const title = item.title || 'Actualité';
            const description = item.head || item.description || item.summary || item.text || '';
            const idSuffix = item._id || Math.random().toString(36).substr(2, 9);
            let imgUrl = item.picture ? `/api/rest/common/news/images/thumbnail/${item.picture}` : '';
            
            let imgHtml = '';
            if (imgUrl) {
                imgHtml = `<div class="mye-news-image-wrapper" id="mye-dash-news-img-wrapper-${idSuffix}">
                             <div class="mye-news-placeholder-image">Chargement...</div>
                           </div>`;
            } else {
                imgHtml = `<div class="mye-news-image-wrapper"><div class="mye-news-placeholder-image">Pas d'image</div></div>`;
            }

            const dateStr = item.publicationDate || item.date || item.createdAt;
            let dateHtml = '';
            if (dateStr) {
                const d = new Date(dateStr);
                if (!isNaN(d)) {
                    dateHtml = `<div class="mye-news-date">${d.toLocaleDateString('fr-FR')}</div>`;
                }
            }

            let tagsHtml = '';
            if (item.tags && Array.isArray(item.tags) && item.tags.length > 0) {
                const tagsStr = item.tags.map(t => `<span class="mye-news-tag">${t.replace(/</g, '&lt;')}</span>`).join('');
                tagsHtml = `<div class="mye-news-tags">${tagsStr}</div>`;
            }

            card.innerHTML = `
                ${imgHtml}
                <div class="mye-news-content">
                  <h3 class="mye-news-title" title="${title.replace(/"/g, '&quot;')}">${title}</h3>
                  ${dateHtml}
                  <div class="mye-news-desc">${description}</div>
                  ${tagsHtml}
                </div>
            `;
            
            card.addEventListener('click', (e) => {
                if (e.target.closest('.mye-news-tags')) return;
                const url = item.url || `/portal/common/news/${item._id}`;
                window.location.href = url;
            });
            
            grid.appendChild(card);
            
            // Async load image
            if (imgUrl) {
                fetch(imgUrl)
                  .then(res => {
                    if (!res.ok) throw new Error('Image fetch failed');
                    const ct = res.headers.get('content-type') || '';
                    if (ct.includes('image/')) {
                      return res.blob().then(blob => URL.createObjectURL(blob));
                    } else {
                      return res.text().then(txt => txt.startsWith('data:') ? txt : `data:image/jpeg;base64,${txt}`);
                    }
                  })
                  .then(src => {
                    const wrapper = document.getElementById(`mye-dash-news-img-wrapper-${idSuffix}`);
                    if (wrapper) {
                      wrapper.innerHTML = `<img src="${src}" alt="${title.replace(/"/g, '&quot;')}" class="mye-news-image" style="opacity:0; transition:opacity 0.3s ease;" onload="this.style.opacity=1">`;
                    }
                  })
                  .catch(err => {
                    const wrapper = document.getElementById(`mye-dash-news-img-wrapper-${idSuffix}`);
                    if (wrapper) wrapper.innerHTML = `<div class="mye-news-placeholder-image">Pas d'image</div>`;
                  });
            }
        });
        
    } catch (e) {
        console.error('Erreur chargement news dashboard:', e);
        container.innerHTML = `<div class="mye-dash-card" style="text-align:center; padding: 40px; border-radius:24px; color: red;">Erreur de chargement des actualités</div>`;
    }
}

async function loadFooterEvents() {
    const container = document.getElementById('mye-dash-footer-content');
    if (!container) return;
    
    // Show spinner
    container.innerHTML = `
        <div class="mye-news-spinner">
            <div class="mye-spinner"></div>
        </div>
    `;
    
    try {
        const now = new Date();
        
        // Fetch from 15 days ago to 60 days in the future to capture all relevant events
        const s = new Date(now);
        s.setDate(s.getDate() - 15);
        s.setHours(0,0,0,0);
        
        const e = new Date(now);
        e.setDate(e.getDate() + 60);
        e.setHours(23,59,59,999);
        
        const fetchCampusEvents = async (campus) => {
            const url = new URL(`/api/rest/student/calendar/ilab/${campus}`, window.location.origin);
            url.searchParams.set('startDate', s.toISOString());
            url.searchParams.set('endDate', e.toISOString());
            
            const res = await fetch(url.toString(), { credentials: 'include' });
            if (!res.ok) return [];
            const data = await res.json();
            
            let items = [];
            if (Array.isArray(data)) {
                items = data;
            } else if (data && typeof data === 'object') {
                for (const key of ['events', 'planning', 'agenda', 'data', 'lessons', 'courses', 'content']) {
                    if (Array.isArray(data[key])) {
                        items = data[key];
                        break;
                    }
                }
            }
            return items;
        };
        
        // Fetch both Paris and Bordeaux concurrently
        const [parisEvents, bdxEvents] = await Promise.all([
            fetchCampusEvents('paris'),
            fetchCampusEvents('bdx')
        ]);
        
        const processEvents = (eventsList) => {
            const seenKeys = new Set();
            const uniqueItems = [];
            
            eventsList.forEach(item => {
                const title = item.subject || item.title || item.name || item.label || item.summary || '';
                const startVal = item.start || item.startDate || item.startTime || item.begin || item.debut || item.dateDebut || '';
                const key = `${title}_${startVal}`;
                if (title && startVal && !seenKeys.has(key)) {
                    seenKeys.add(key);
                    uniqueItems.push(item);
                }
            });
            
            const upcomingItems = uniqueItems.filter(item => {
                const endVal = item.end || item.endDate || item.endTime || item.fin || item.dateFin;
                if (!endVal) return true;
                return new Date(endVal) >= now;
            });
            
            upcomingItems.sort((a, b) => {
                const da = new Date(a.start || a.startDate || a.startTime || a.begin || a.debut || a.dateDebut);
                const db = new Date(b.start || b.startDate || b.startTime || b.begin || b.debut || b.dateDebut);
                return da - db;
            });
            
            return upcomingItems;
        };

        const upcomingParis = processEvents(parisEvents);
        const upcomingBdx = processEvents(bdxEvents);
        
        container.innerHTML = `
            <div class="mye-dash-events-title" style="margin-bottom: 24px; font-size: 1.2rem;">Événements Associatifs à venir</div>
            <div style="display: flex; gap: 24px; flex-wrap: wrap; width: 100%;">
                
                <!-- Paris Popup Card -->
                <div class="mye-dash-card" style="flex: 1; min-width: 320px; padding: 24px; border-radius: 24px; display: flex; flex-direction: column; background: var(--mye-primary-color, #163767);">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
                        <div style="width: 40px; height: 40px; border-radius: 12px; background: rgba(255, 255, 255, 0.2); color: #ffffff; display: flex; align-items: center; justify-content: center;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                <circle cx="12" cy="10" r="3"></circle>
                            </svg>
                        </div>
                        <h2 style="margin: 0; font-size: 1.1rem; font-weight: 700; color: #ffffff;">Campus Paris</h2>
                    </div>
                    <div id="mye-events-list-paris" style="display: flex; flex-direction: column; gap: 12px;">
                        ${upcomingParis.length === 0 ? '<div style="color: rgba(255,255,255,0.7); text-align: center; padding: 30px 0;">Aucun événement prévu</div>' : ''}
                    </div>
                </div>

                <!-- Bordeaux Popup Card -->
                <div class="mye-dash-card" style="flex: 1; min-width: 320px; padding: 24px; border-radius: 24px; display: flex; flex-direction: column; background: var(--mye-primary-color, #163767);">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
                        <div style="width: 40px; height: 40px; border-radius: 12px; background: rgba(255, 255, 255, 0.2); color: #ffffff; display: flex; align-items: center; justify-content: center;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                <circle cx="12" cy="10" r="3"></circle>
                            </svg>
                        </div>
                        <h2 style="margin: 0; font-size: 1.1rem; font-weight: 700; color: #ffffff;">Campus Bordeaux</h2>
                    </div>
                    <div id="mye-events-list-bdx" style="display: flex; flex-direction: column; gap: 12px;">
                        ${upcomingBdx.length === 0 ? '<div style="color: rgba(255,255,255,0.7); text-align: center; padding: 30px 0;">Aucun événement prévu</div>' : ''}
                    </div>
                </div>

            </div>
            
            <div class="mye-dash-more-news-container">
                <button id="mye-dash-more-events-btn" class="mye-dash-more-news-btn">
                    Voir tous les événements
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                        <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                </button>
            </div>
        `;
        
        const moreEvtBtn = document.getElementById('mye-dash-more-events-btn');
        if (moreEvtBtn) {
            moreEvtBtn.addEventListener('click', () => {
                sessionStorage.setItem('mye_default_calendar_category', 'ilab');
                window.location.href = '/portal/common/calendars';
            });
        }

        const renderEventCard = (item, parentGrid) => {
            const card = document.createElement('div');
            card.className = 'mye-event-card';
            
            const title = item.subject || item.title || item.name || item.label || item.summary || 'Événement';
            
            const startVal = item.start || item.startDate || item.startTime || item.begin || item.debut || item.dateDebut;
            const endVal = item.end || item.endDate || item.endTime || item.fin || item.dateFin;
            const start = startVal ? new Date(startVal) : null;
            const end = endVal ? new Date(endVal) : null;
            
            let dateHtml = '';
            let timeHtml = '';
            if (start) {
                const day = start.getDate();
                const month = start.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');
                dateHtml = `
                    <div class="mye-event-date-badge">
                        <span class="mye-event-date-day">${day}</span>
                        <span class="mye-event-date-month">${month}</span>
                    </div>
                `;
                
                const timeStart = start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                const timeEnd = end ? end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
                timeHtml = timeEnd ? `${timeStart} - ${timeEnd}` : timeStart;
            } else {
                dateHtml = `
                    <div class="mye-event-date-badge">
                        <span class="mye-event-date-day">?</span>
                        <span class="mye-event-date-month">Even.</span>
                    </div>
                `;
            }
            
            let possibleRooms = [item.rooms, item.room, item.classrooms, item.classroom, item.locations, item.location, item.salles, item.salle, item.building, item.bat, item.site, item.campus];
            let allRooms = [];
            possibleRooms.forEach(r => {
                if (Array.isArray(r)) {
                    r.forEach(x => {
                        if (typeof x === 'object' && x) allRooms.push(x.room || x.name || x.label || x.code || '');
                        else if (x) allRooms.push(String(x));
                    });
                } else if (typeof r === 'object' && r) {
                    allRooms.push(r.room || r.name || r.label || r.code || '');
                } else if (r) {
                    allRooms.push(String(r));
                }
            });
            const location = [...new Set(allRooms)].filter(Boolean).join(', ') || 'Non spécifié';
            
            let org = item.teacher || item.teachers || item.professor || item.intervenant || item.enseignant || item.organizer || item.organisateurs || '';
            if (Array.isArray(org)) {
                org = org.map(o => typeof o === 'object' ? (o.name || `${o.firstName || ''} ${o.lastName || ''}`.trim()) : String(o)).filter(Boolean).join(', ');
            } else if (typeof org === 'object' && org) {
                org = org.name || `${org.firstName || ''} ${org.lastName || ''}`.trim() || JSON.stringify(org);
            }
            
            card.innerHTML = `
                ${dateHtml}
                <div class="mye-event-card-content">
                    <h3 class="mye-event-card-title" title="${title.replace(/"/g, '&quot;')}">${title}</h3>
                    <div class="mye-event-card-meta">
                        <div class="mye-event-meta-item">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                            <span>${timeHtml}</span>
                        </div>
                        <div class="mye-event-meta-item">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                <circle cx="12" cy="10" r="3"></circle>
                            </svg>
                            <span>${location}</span>
                        </div>
                        ${org ? `
                        <div class="mye-event-meta-item">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                            <span>${org}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
            
            card.addEventListener('click', () => {
                if (start) {
                    sessionStorage.setItem('mye_open_event_time', start.toISOString());
                }
                sessionStorage.setItem('mye_default_calendar_category', 'ilab');
                window.location.href = '/portal/common/calendars';
            });
            
            parentGrid.appendChild(card);
        };

        const gridParis = document.getElementById('mye-events-list-paris');
        const gridBdx = document.getElementById('mye-events-list-bdx');
        
        upcomingParis.slice(0, 6).forEach(item => renderEventCard(item, gridParis));
        upcomingBdx.slice(0, 6).forEach(item => renderEventCard(item, gridBdx));
    } catch (e) {
        console.error('Erreur chargement événements dashboard:', e);
        container.innerHTML = `<div class="mye-dash-card" style="text-align:center; padding: 40px; border-radius:24px; color: red;">Erreur de chargement des événements</div>`;
    }
}

async function loadFooterSocials() {
    const container = document.getElementById('mye-dash-footer-content');
    if (!container) return;
    
    // Show spinner
    container.innerHTML = `
        <div class="mye-news-spinner">
            <div class="mye-spinner"></div>
        </div>
    `;
    
    try {
        const [ytRes, instaRes] = await Promise.all([
            fetch('/api/rest/common/socials/last-youtube', { credentials: 'include' }).catch(() => null),
            fetch('/api/rest/common/socials/last-instagram', { credentials: 'include' }).catch(() => null)
        ]);
        
        let ytItems = [];
        let instaItems = [];
        
        if (ytRes && ytRes.ok) ytItems = await ytRes.json();
        if (instaRes && instaRes.ok) instaItems = await instaRes.json();
        
        container.innerHTML = `
            <div class="mye-dash-events-title" style="margin-bottom: 24px; font-size: 1.2rem;">Derniers posts sur nos réseaux</div>
            <div style="display: flex; gap: 24px; flex-wrap: wrap; width: 100%;">
                
                <!-- YouTube Column -->
                <div class="mye-dash-card" style="flex: 1; min-width: 320px; padding: 24px; border-radius: 24px; display: flex; flex-direction: column; background: var(--mye-card-bg, #ffffff);">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
                        <div style="width: 40px; height: 40px; border-radius: 12px; background: rgba(255, 0, 0, 0.1); color: #ff0000; display: flex; align-items: center; justify-content: center;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path>
                                <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon>
                            </svg>
                        </div>
                        <h2 style="margin: 0; font-size: 1.1rem; font-weight: 700; color: var(--mye-text-primary, #1d1d1f);">Dernières Vidéos YouTube</h2>
                    </div>
                    <div id="mye-social-list-yt" style="display: flex; flex-direction: column; gap: 16px;">
                        ${ytItems.length === 0 ? '<div style="color: #888; text-align: center; padding: 30px 0;">Aucune vidéo trouvée</div>' : ''}
                    </div>
                </div>

                <!-- Instagram Column -->
                <div class="mye-dash-card" style="flex: 1; min-width: 320px; padding: 24px; border-radius: 24px; display: flex; flex-direction: column; background: var(--mye-card-bg, #ffffff);">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
                        <div style="width: 40px; height: 40px; border-radius: 12px; background: rgba(225, 48, 108, 0.1); color: #e1306c; display: flex; align-items: center; justify-content: center;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                            </svg>
                        </div>
                        <h2 style="margin: 0; font-size: 1.1rem; font-weight: 700; color: var(--mye-text-primary, #1d1d1f);">Derniers Posts Instagram</h2>
                    </div>
                    <div id="mye-social-list-insta" style="display: flex; flex-direction: column; gap: 16px;">
                        ${instaItems.length === 0 ? '<div style="color: #888; text-align: center; padding: 30px 0;">Aucun post trouvé</div>' : ''}
                    </div>
                </div>

            </div>
            <div class="mye-dash-more-news-container">
                <button id="mye-dash-more-social-btn" class="mye-dash-more-news-btn">
                    Visiter myEfrei
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                        <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                </button>
            </div>
        `;
        
        const moreBtn = document.getElementById('mye-dash-more-social-btn');
        if (moreBtn) {
            moreBtn.addEventListener('click', () => {
                window.open('https://www.efrei.fr', '_blank');
            });
        }
        
        const ytGrid = document.getElementById('mye-social-list-yt');
        const instaGrid = document.getElementById('mye-social-list-insta');
        
        ytItems.slice(0, 4).forEach(item => {
            const card = document.createElement('a');
            card.href = `https://www.youtube.com/watch?v=${item.id}`;
            card.target = '_blank';
            card.className = 'mye-social-card yt-card';
            
            card.innerHTML = `
                <div class="mye-social-thumb" style="background-image: url('https://img.youtube.com/vi/${item.id}/mqdefault.jpg');"></div>
                <div class="mye-social-content">
                    <div class="mye-social-title">${item.text || 'Vidéo YouTube'}</div>
                </div>
            `;
            ytGrid.appendChild(card);
        });

        instaItems.slice(0, 4).forEach(item => {
            const card = document.createElement('a');
            card.href = item.link || '#';
            card.target = '_blank';
            card.className = 'mye-social-card insta-card';
            
            const thumbUrl = item.media || '';
            const caption = item.text || 'Post Instagram';
            
            card.innerHTML = `
                <div class="mye-social-thumb" style="background-image: url('${thumbUrl}');"></div>
                <div class="mye-social-content">
                    <div class="mye-social-title">${caption}</div>
                    <div class="mye-social-date">${item.publishedAt ? new Date(item.publishedAt).toLocaleDateString('fr-FR') : ''}</div>
                </div>
            `;
            instaGrid.appendChild(card);
        });
        
    } catch (e) {
        console.error('Erreur chargement reseaux sociaux:', e);
        container.innerHTML = `<div class="mye-dash-card" style="text-align:center; padding: 40px; border-radius:24px; color: red;">Erreur de chargement des réseaux sociaux</div>`;
    }
}

async function loadFooterContacts() {
    const container = document.getElementById('mye-dash-footer-content');
    if (!container) return;
    
    // Show spinner
    container.innerHTML = `
        <div class="mye-news-spinner">
            <div class="mye-spinner"></div>
        </div>
    `;
    
    try {
        const res = await fetch('/api/rest/student/contacts', { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch contacts');
        const data = await res.json();
        
        let html = `
            <div class="mye-moodle-container" style="padding: 0; min-height: auto; margin-top: 20px;">
        `;
        
        data.forEach(category => {
            if (!category.contacts || category.contacts.length === 0) return;
            
            let contactsHtml = category.contacts.map(contact => {
                let buttonsHtml = '';
                let linkStyle = "color: var(--mye-primary-color); text-decoration: none; font-weight: 600; display: inline-flex; align-items: center; gap: 8px; font-size: 15px; padding: 4px 0; word-break: break-all;";
                if (contact.email) {
                    buttonsHtml += `<a href="mailto:${contact.email}" style="${linkStyle}" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg> ${contact.email}</a>`;
                }
                if (contact.phone) {
                    buttonsHtml += `<a href="tel:${contact.phone}" style="${linkStyle}" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg> ${contact.phone}</a>`;
                }
                if (contact.link) {
                    let displayLink = contact.link.replace(/^https?:\/\//, '').replace(/\/$/, '');
                    buttonsHtml += `<a href="${contact.link}" target="_blank" style="${linkStyle}" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg> ${displayLink}</a>`;
                }
                
                return `
                    <div class="mye-moodle-card" style="display: flex; flex-direction: column; justify-content: space-between;">
                        <div>
                            <h3 class="mye-moodle-card-title" style="font-size: 22px; margin-bottom: 4px;">${contact.title || 'Contact'}</h3>
                            ${contact.jobTitle ? `<div style="color: #888; font-size: 14px; font-weight: 500;">${contact.jobTitle}</div>` : ''}
                        </div>
                        <div style="width: 100%; height: 1px; background-color: rgba(0,0,0,0.05); margin: 15px 0;"></div>
                        <div class="mye-moodle-card-footer" style="display: flex; flex-direction: column; gap: 8px; justify-content: flex-start; align-items: flex-start;">
                            ${buttonsHtml}
                        </div>
                    </div>
                `;
            }).join('');
            
            html += `
                <div class="mye-moodle-ue-section" style="margin-bottom: 60px;">
                    <h2 class="mye-moodle-ue-title">${category.title}</h2>
                    <div class="mye-moodle-grid" style="grid-template-columns: repeat(auto-fill, minmax(max(320px, calc(33.333% - 20px)), 1fr));">
                        ${contactsHtml}
                    </div>
                </div>
            `;
        });
        
        html += `</div>`;
        container.innerHTML = html;
        
    } catch (e) {
        console.error('Erreur chargement contacts:', e);
        container.innerHTML = `<div class="mye-dash-card" style="text-align:center; padding: 40px; border-radius:24px; color: red;">Erreur de chargement des contacts</div>`;
    }
}

function loadFooterConstruction(categoryName) {
    const container = document.getElementById('mye-dash-footer-content');
    if (!container) return;
    
    container.innerHTML = `
        <div class="mye-dash-card" style="padding: 40px; text-align: center; border-radius: 24px; color: #888;">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 16px; opacity: 0.5; color: var(--mye-primary-color); display: inline-block;">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
            </svg>
            <h3 style="margin: 0 0 8px 0; font-size: 1.2rem; font-weight: 600; color: var(--mye-primary-color);">Section en construction</h3>
            <p style="margin: 0; font-size: 0.9rem;">La section "${categoryName}" sera bientôt disponible sur votre accueil.</p>
        </div>
    `;
}

function isSlideDetailPage() {
    return window.location.pathname.includes('/portal/student/slides/');
}

function getSlideCode() {
    const match = window.location.pathname.match(/\/portal\/student\/slides\/([a-zA-Z0-9_-]+)/i);
    return match ? match[1] : null;
}

function buildSlideDetailHTML(slide) {
    const title = slide.title || 'Détails de l\'évènement';
    const author = slide.author || 'Efrei Paris';
    const dateStr = slide.updateDate || slide.date;
    let dateHtml = '';
    if (dateStr) {
        const d = new Date(dateStr);
        if (!isNaN(d)) {
            dateHtml = `Mis à jour le ${d.toLocaleDateString('fr-FR')} à ${d.toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}`;
        }
    }
    
    const picId = slide.token || slide.picture || slide._id;
    const imgUrl = picId ? `/api/rest/common/slides/images/${picId}` : '';
    
    let coverHtml = '';
    if (imgUrl) {
        coverHtml = `
            <div class="mye-slide-cover-wrapper">
                <img class="mye-slide-cover-img" src="${imgUrl}" alt="${title}" 
                     onerror="
                        var currentSrc = this.getAttribute('src');
                        var attempts = this.dataset.attempts ? this.dataset.attempts.split(',') : [];
                        var picId = '${picId}';
                        if (picId) {
                            var candidates = [
                                '/api/rest/common/slides/images/' + picId,
                                '/api/rest/common/slides/images/' + picId + '.jpg',
                                '/api/rest/common/slides/images/' + picId + '-lg.jpg'
                            ];
                            var nextUrl = '';
                            for (var i = 0; i < candidates.length; i++) {
                                if (candidates[i] !== currentSrc && attempts.indexOf(candidates[i]) === -1) {
                                    nextUrl = candidates[i];
                                    break;
                                }
                            }
                            if (nextUrl) {
                                attempts.push(currentSrc);
                                this.dataset.attempts = attempts.join(',');
                                this.src = nextUrl;
                                return;
                            }
                        }
                        this.parentNode.style.display = 'none';
                     ">
            </div>
        `;
    }

    return `
        <div class="mye-slide-inner">
            <button class="mye-slide-back-btn" onclick="window.location.href='/portal/student/home';">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12"></line>
                    <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
                Retour à l'accueil
            </button>
            <div class="mye-article-header-card" style="background-color: var(--mye-primary-color); margin-bottom: 16px;">
                <h1 class="mye-article-title" style="margin-bottom: 0; color: white !important; font-size: 36px;">${title}</h1>
            </div>
            
            <div class="mye-article-info-bar" style="background-color: var(--mye-primary-color); border: none; margin-bottom: 24px;">
                <div class="mye-article-date" style="color: white !important;">${dateHtml ? dateHtml : 'Actualité'}</div>
                <div class="mye-article-author" style="background-color: white !important; color: var(--mye-primary-color) !important; font-weight: bold;">${author}</div>
            </div>
            
            ${coverHtml}
            
            <div class="mye-article-body" style="margin-top: 24px; padding: 0 10px;">
                ${slide.text || '<p>Aucun contenu supplémentaire disponible.</p>'}
            </div>
        </div>
    `;
}

async function injectSlideDetail() {
    const slideCode = getSlideCode();
    if (!slideCode) return;
    
    if (document.getElementById('mye-custom-slide-detail')) {
        document.body.classList.add('mye-dashboard-active');
        return;
    }
    
    const existingDash = document.getElementById('mye-custom-dashboard');
    if (existingDash) existingDash.remove();
    
    document.body.classList.add('mye-dashboard-active');
    
    const wrapper = document.createElement('div');
    wrapper.id = 'mye-custom-slide-detail';
    wrapper.className = 'mye-page-container';
    wrapper.style.marginTop = '80px';
    
    wrapper.innerHTML = `
        <div class="mye-slide-inner" style="display:flex; justify-content:center; align-items:center; height:300px; flex-direction:column; gap:16px;">
            <div class="mye-spinner"></div>
            <div style="color:var(--mye-primary-color); font-weight:600;">Chargement des détails...</div>
        </div>
    `;
    
    document.body.appendChild(wrapper);
    
    try {
        const res = await fetch(`/api/rest/common/slides/${slideCode}`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch slide details');
        const slide = await res.json();
        
        wrapper.innerHTML = buildSlideDetailHTML(slide);
    } catch (err) {
        console.error(err);
        wrapper.innerHTML = `
            <div class="mye-slide-inner">
                <button class="mye-slide-back-btn" onclick="window.location.href='/portal/student/home';">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                    Retour à l'accueil
                </button>
                <div class="mye-slide-card mye-dash-card" style="padding:40px; text-align:center;">
                    <h2 style="color:red; margin-bottom:10px;">Erreur de chargement</h2>
                    <p style="color:#666;">Impossible de charger les détails de cet évènement.</p>
                </div>
            </div>
        `;
    }
}

function injectDashboard() {
    if (isSlideDetailPage()) {
        const existingDash = document.getElementById('mye-custom-dashboard');
        if (existingDash) existingDash.remove();
        injectSlideDetail();
        return;
    }

    // Only inject if on student home
    if (!window.location.pathname.includes('/portal/student/home')) {
        const existingDash = document.getElementById('mye-custom-dashboard');
        if (existingDash) existingDash.remove();
        
        const existingDetail = document.getElementById('mye-custom-slide-detail');
        if (existingDetail) existingDetail.remove();
        
        document.body.classList.remove('mye-dashboard-active');
        return;
    }
    
    const existingDetail = document.getElementById('mye-custom-slide-detail');
    if (existingDetail) {
        existingDetail.remove();
    }
    
    // Prevent multiple injections
    if (document.getElementById('mye-custom-dashboard')) {
        document.body.classList.add('mye-dashboard-active');
        return;
    }

    document.body.classList.add('mye-dashboard-active');

    // Create a wrapper
    const wrapper = document.createElement('div');
    wrapper.innerHTML = buildDashboardHTML();
    
    // Append to body so it sits below the custom header and alongside app-root
    document.body.appendChild(wrapper.firstElementChild);
    
    // Need to give some margin top to account for custom header in portal.js
    const dash = document.getElementById('mye-custom-dashboard');
    if (dash) {
        dash.style.marginTop = '80px'; // Header height
    }

    fetchDashboardData();
    handleFooterClicks();
    loadFooterNews();

    // Click events for dashboard cards
    document.getElementById('mye-dash-card-moyenne')?.addEventListener('click', () => {
        window.location.href = '/portal/student/grades';
    });
    document.getElementById('mye-dash-card-absences')?.addEventListener('click', () => {
        window.location.href = '/portal/student/absences';
    });
    document.getElementById('mye-dash-card-retards')?.addEventListener('click', () => {
        window.location.href = '/portal/student/absences';
    });
    document.getElementById('mye-dash-card-lxp')?.addEventListener('click', () => {
        window.location.href = '/portal/student/lxp';
    });

    // Theme personalized settings menu
    const themeBtn = document.getElementById('mye-dash-settings-btn');
    const themeMenu = document.getElementById('mye-dash-theme-menu');
    const dashboardEl = document.getElementById('mye-custom-dashboard');
    
    if (themeBtn && themeMenu && dashboardEl) {
        themeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            themeMenu.classList.toggle('show');
        });
        
        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (!themeMenu.contains(e.target) && e.target !== themeBtn && !themeBtn.contains(e.target)) {
                themeMenu.classList.remove('show');
            }
        });
        
        // Active color indicator
        const currentTheme = localStorage.getItem('mye-dash-theme') || 'navy';
        const activeOption = themeMenu.querySelector(`.mye-color-option[data-color="${currentTheme}"]`);
        if (activeOption) activeOption.classList.add('active');
        
        // Change color event
        themeMenu.querySelectorAll('.mye-color-option').forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // Remove active from others
                themeMenu.querySelectorAll('.mye-color-option').forEach(o => o.classList.remove('active'));
                
                // Add active to current
                option.classList.add('active');
                
                const selectedColor = option.getAttribute('data-color');
                localStorage.setItem('mye-dash-theme', selectedColor);
                
                // Apply theme
                dashboardEl.setAttribute('data-mye-theme', selectedColor);
                window.dispatchEvent(new CustomEvent('mye-theme-changed', { detail: selectedColor }));
                
                // Close menu
                themeMenu.classList.remove('show');
            });
        });
    }
}

// Watch for route changes (Angular SPA)
let myeDashLastUrl = window.location.href;
setInterval(() => {
    if (myeDashLastUrl !== window.location.href) {
        myeDashLastUrl = window.location.href;
        injectDashboard();
    }
}, 500);

// Also try to inject on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(injectDashboard, 500));
} else {
    setTimeout(injectDashboard, 500);
}
