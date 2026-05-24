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
        let picId = slide.picture || slide.illustrationId || slide.imageId || slide.image;
        let imgUrl = '';
        
        if (picId) {
            imgUrl = `/api/rest/common/slides/images/${picId}`;
        } else if (slide._id) {
            imgUrl = `/api/rest/common/slides/images/${slide._id}`;
        } else if (slide.imageUrl || slide.image_url || slide.pictureUrl) {
            imgUrl = slide.imageUrl || slide.image_url || slide.pictureUrl;
        } else {
            imgUrl = `/api/rest/common/slides/images/unknown.jpg`;
        }

        const rawFallback = picId || slide._id || '';

        const slideHtml = `
            <div class="mye-carousel-slide ${index === 0 ? 'active' : ''}" data-index="${index}" data-raw='${JSON.stringify(slide).replace(/'/g, "&apos;")}'>
                <img class="mye-carousel-img" src="${imgUrl}" alt="${slide.title}" 
                     onerror="this.style.display='none'; this.nextElementSibling.innerHTML += '<div style=\\'margin-top:10px;font-size:10px;font-family:monospace;background:rgba(0,0,0,0.8);padding:10px;border-radius:8px;max-height:100px;overflow-y:auto;\\'>DEBUG: ' + this.parentNode.dataset.raw + '</div>';">
                <div class="mye-carousel-overlay">
                    <h3 class="mye-carousel-title">${slide.title}</h3>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', slideHtml);
        
        const dotHtml = `<div class="mye-carousel-dot ${index === 0 ? 'active' : ''}" data-index="${index}"></div>`;
        dotsContainer.insertAdjacentHTML('beforeend', dotHtml);
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

function buildDashboardHTML() {
    // Attempt to get name from header if possible
    const firstName = document.getElementById('mye-first-name')?.textContent || 'Prénom';
    const lastName = document.getElementById('mye-last-name')?.textContent || 'Nom';
    
    return `
        <div id="mye-custom-dashboard">
            <div id="mye-dash-loader">
                <div class="mye-spinner"></div>
                <div class="mye-dash-loader-text">Chargement de votre espace...</div>
            </div>
            <div class="mye-dash-top-row">
                <!-- Left Card -->
                <div class="mye-dash-card mye-dash-left-card">
                    <div class="mye-dash-header">
                        <h1 class="mye-dash-title">${lastName} ${firstName}</h1>
                        <span class="mye-dash-period-badge" id="mye-dash-period-badge-el">...</span>
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
            
            <!-- Footer -->
            <div class="mye-dash-footer">
                <div class="mye-footer-btn" data-link="actualite">Actualité</div>
                <div class="mye-footer-btn" data-link="evenements">Evenements</div>
                <div class="mye-footer-btn" data-link="contact">Contact</div>
                <div class="mye-footer-btn" data-link="reseaux">Réseaux Sociaux</div>
            </div>
        </div>
    `;
}

function handleFooterClicks() {
    document.querySelectorAll('.mye-footer-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // User requested: "pour l'instant, ca ouvre un page vide avec un texte écrit "en constuction""
            const win = window.open('', '_blank');
            win.document.write('<h1 style="font-family: sans-serif; text-align: center; margin-top: 50px;">En construction</h1>');
            win.document.close();
        });
    });
}

function injectDashboard() {
    // Only inject if on student home
    if (!window.location.pathname.includes('/portal/student/home')) {
        const existing = document.getElementById('mye-custom-dashboard');
        if (existing) {
            existing.remove();
            document.body.classList.remove('mye-dashboard-active');
        }
        return;
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
