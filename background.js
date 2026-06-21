// MyEfrei ULTRA - Background Script (Service Worker)
// Handles session validation and data synchronization without CORS limitations

let loginWindowId = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'check_sync_status') {
        checkEfreiSession().then(sendResponse);
        return true; // Keep channel open for async sendResponse
    }
    if (message.action === 'open_login_popup') {
        openLoginPopup().then(sendResponse);
        return true;
    }
});

async function checkEfreiSession() {
    let authFailed = false;
    try {
        console.log('[MyEfrei ULTRA Background] Verifying active session...');
        
        // 1. Fetch profile to check authentication
        let profileRes;
        try {
            profileRes = await fetch('https://my.efrei.fr/api/rest/student/profile');
        } catch (netErr) {
            // Offline or network error: do not clear the user's logged-in status
            console.warn('[MyEfrei ULTRA Background] Network error during session validation:', netErr.message);
            return { status: 'network_error', error: netErr.message };
        }

        const contentType = profileRes.headers.get('content-type') || '';
        if (!profileRes.ok || contentType.includes('text/html') || profileRes.status === 401 || profileRes.status === 403) {
            authFailed = true;
            throw new Error(`Authentication validation failed (Status: ${profileRes.status})`);
        }
        
        const profile = await profileRes.json();
        const mainContact = profile.mainContact || {};
        const firstName = mainContact.firstName || '';
        const lastName = mainContact.lastName || '';
        const fullName = `${firstName} ${lastName}`.trim();
        const email = mainContact.email || `${firstName.toLowerCase()}.${lastName.toLowerCase()}@efrei.net`;
        
        const savedData = {
            mye_user_name: fullName,
            mye_user_first_name: firstName,
            mye_user_last_name: lastName,
            mye_user_email: email
        };

        // 2. Fetch academic data (non-blocking if any individual sub-call fails)
        try {
            const periodRes = await fetch('https://my.efrei.fr/api/rest/student/periods?withHistory=true');
            if (periodRes.ok) {
                const periodsData = await periodRes.json();
                
                let highestPeriod = periodsData[0];
                let highestNum = -1;
                periodsData.forEach(p => {
                    const num = parseInt((p.period || '').replace(/\D/g, ''), 10);
                    if (!isNaN(num) && num > highestNum) {
                        highestNum = num;
                        highestPeriod = p;
                    }
                });
                
                if (highestPeriod) {
                    const sy = highestPeriod.schoolYear;
                    const periodId = highestPeriod.period;
                    savedData.mye_user_class = `${periodId} - ${sy}`;

                    // Fetch Grades
                    try {
                        const gradesRes = await fetch(`https://my.efrei.fr/api/rest/student/grades?schoolYear=${sy}&period=${periodId}`);
                        if (gradesRes.ok) {
                            const gradesData = await gradesRes.json();
                            const average = parseGradesToAverage(gradesData);
                            savedData.mye_user_average = average !== null ? average : '';
                        }
                    } catch (gradesErr) {
                        console.warn('[MyEfrei ULTRA Background] Failed to fetch grades:', gradesErr.message);
                    }

                    // Fetch Absences
                    try {
                        const absencesRes = await fetch(`https://my.efrei.fr/api/rest/student/absences?schoolYear=${sy}&period=${periodId}`);
                        if (absencesRes.ok) {
                            const absencesData = await absencesRes.json();
                            
                            let rawAbs = [];
                            if (Array.isArray(absencesData)) rawAbs = absencesData;
                            else if (absencesData && Array.isArray(absencesData.data)) rawAbs = absencesData.data;
                            else if (absencesData && Array.isArray(absencesData.absences)) rawAbs = absencesData.absences;

                            let absCountUnjustified = 0;
                            let totalRetards = 0;
                            rawAbs.forEach(item => {
                                const itemType = (item.type || '').toLowerCase();
                                const itemStatus = (item.status || '').toLowerCase();
                                const isRetard = itemType === 'lateness' || itemType === 'late' || (item.label && item.label.toLowerCase().includes('retard'));
                                const isAbsence = !isRetard;
                                const justified = item.justified === true || itemStatus === 'excused' || itemStatus === 'justified';
                                
                                if (isAbsence && !justified) absCountUnjustified++;
                                if (isRetard) totalRetards++;
                            });
                            
                            savedData.mye_user_absences = absCountUnjustified;
                            savedData.mye_user_retards = totalRetards;
                        }
                    } catch (absencesErr) {
                        console.warn('[MyEfrei ULTRA Background] Failed to fetch absences:', absencesErr.message);
                    }
                }
            }
        } catch (academicErr) {
            console.warn('[MyEfrei ULTRA Background] Failed to fetch academic periods:', academicErr.message);
        }

        // Save active details to chrome storage
        await chrome.storage.local.set(savedData);
        console.log('[MyEfrei ULTRA Background] Session is active. Storage synchronized.');
        return { status: 'connected', data: savedData };

    } catch (err) {
        console.warn('[MyEfrei ULTRA Background] Validation failed:', err.message);
        
        if (authFailed) {
            // Clear Efrei data from storage as we are logged out/disconnected
            const keysToClear = [
                'mye_user_name',
                'mye_user_first_name',
                'mye_user_last_name',
                'mye_user_avatar',
                'mye_user_class',
                'mye_user_email',
                'mye_user_average',
                'mye_user_absences',
                'mye_user_retards'
            ];
            await chrome.storage.local.remove(keysToClear);
        }
        return { status: 'disconnected', error: err.message };
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

    const parseGradeValue = (val) => {
        if (val == null) return null;
        if (typeof val === 'string' && val.trim().toUpperCase() === 'ABS') return 'ABS';
        const num = parseFloat(val);
        return isNaN(num) ? null : num;
    };

    let totalWeightedSum = 0;
    let totalCoef = 0;

    uesArray.forEach(ue => {
        const ueCoef = ue.coef != null ? parseFloat(ue.coef) : (ue.ectsAttempted != null ? parseFloat(ue.ectsAttempted) : 1);
        const subjectsRaw = ue.modules || ue.courses || ue.subjects || [];
        
        let ueRealAverage = parseGradeValue(ue.grade) || parseGradeValue(ue.average);
        
        if (ueRealAverage === null) {
            let ueWeightedSum = 0;
            let ueCoefSum = 0;
            
            subjectsRaw.forEach(sub => {
                const subCoef = sub.coef != null ? parseFloat(sub.coef) : (sub.coefficient != null ? parseFloat(sub.coefficient) : 1.0);
                let subRealAverage = parseGradeValue(sub.grade) || parseGradeValue(sub.average);
                
                if (subRealAverage === null) {
                    const evalsRaw = sub.grades || sub.evaluations || sub.marks || [];
                    let evals = evalsRaw.map(ev => {
                        let rawVal = ev.grade != null ? ev.grade : (ev.value != null ? ev.value : null);
                        let parsedVal = null;
                        if ((typeof rawVal === 'string' && rawVal.trim().toUpperCase() === 'ABS') || ev.absent) {
                            parsedVal = 'ABS';
                        } else if (rawVal != null) {
                            parsedVal = parseFloat(rawVal);
                            if (isNaN(parsedVal)) parsedVal = null;
                        }
                        return {
                            coefficient: ev.coef != null ? parseFloat(ev.coef) : (ev.coefficient != null ? parseFloat(ev.coefficient) : null),
                            value: parsedVal
                        };
                    });
                    
                    let sumCoef = evals.reduce((sum, ev) => sum + (ev.coefficient || 0), 0);
                    const isWeighted = sumCoef > 0;
                    
                    let realWeightedSum = 0;
                    let realCoefSum = 0;
                    evals.forEach(ev => {
                        const coef = isWeighted ? (ev.coefficient || 0) : 1.0;
                        if (ev.value != null && ev.value !== 'ABS') {
                            realWeightedSum += ev.value * coef;
                            realCoefSum += coef;
                        }
                    });
                    
                    subRealAverage = realCoefSum > 0 ? realWeightedSum / realCoefSum : null;
                }
                
                if (subRealAverage !== null) {
                    ueWeightedSum += subRealAverage * subCoef;
                    ueCoefSum += subCoef;
                }
            });
            
            ueRealAverage = ueCoefSum > 0 ? ueWeightedSum / ueCoefSum : null;
        }

        if (subjectsRaw.length >= 2 && ueRealAverage !== null && !isNaN(ueRealAverage) && !isNaN(ueCoef)) {
            totalWeightedSum += ueRealAverage * ueCoef;
            totalCoef += ueCoef;
        }
    });

    return totalCoef > 0 ? totalWeightedSum / totalCoef : null;
}

async function openLoginPopup() {
    if (loginWindowId !== null) {
        try {
            const win = await chrome.windows.get(loginWindowId);
            if (win) {
                await chrome.windows.update(loginWindowId, { focused: true });
                return { status: 'already_open', windowId: loginWindowId };
            }
        } catch (e) {
            loginWindowId = null;
        }
    }

    const width = 600;
    const height = 650;
    let left = 100;
    let top = 100;
    try {
        const currentWin = await chrome.windows.getCurrent();
        if (currentWin && currentWin.width && currentWin.height) {
            left = Math.round(currentWin.left + (currentWin.width - width) / 2);
            top = Math.round(currentWin.top + (currentWin.height - height) / 2);
        }
    } catch (e) {}

    const win = await chrome.windows.create({
        url: 'https://auth.myefrei.fr/uaa/interaction/dcYDgSKBVvpcvzDMq9liF',
        type: 'popup',
        width: width,
        height: height,
        left: left,
        top: top,
        focused: true
    });
    
    loginWindowId = win.id;
    return { status: 'opened', windowId: win.id };
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (loginWindowId !== null && tab.windowId === loginWindowId && changeInfo.url) {
        const url = changeInfo.url;
        if (url.includes('my.efrei.fr/portal/')) {
            console.log('[MyEfrei ULTRA Background] Login successful in popup. Closing popup window.');
            chrome.windows.remove(loginWindowId);
            loginWindowId = null;
            // Run checkEfreiSession to sync immediately
            checkEfreiSession();
        }
    }
});

chrome.windows.onRemoved.addListener((windowId) => {
    if (windowId === loginWindowId) {
        loginWindowId = null;
        console.log('[MyEfrei ULTRA Background] Login popup window closed manually.');
        // Run checkEfreiSession in case they logged in but closed it
        checkEfreiSession();
    }
});
