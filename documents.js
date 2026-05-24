(function() {
  // Configuration
  const API_DOCS = '/api/rest/student/schooling/documents';
  const API_INVOICES = '/api/rest/student/schooling/invoices';
  const API_LEGACY = '/api/rest/student/schooling/legacy-documents';

  let allDocs = [];
  let currentFilter = 'Tous'; // 'Tous', 'Administratif', 'Factures', 'Résultats'

  function initDocumentsPage() {
    if (document.getElementById('mye-documents-container')) {
      document.getElementById('mye-documents-container').style.display = 'block';
      return;
    }

    const container = document.createElement('div');
    container.id = 'mye-documents-container';
    container.className = 'mye-page-container';
    container.style.display = 'block';

    // Skeleton loading
    container.innerHTML = `
      <div class="mye-doc-filters-skeleton">
        <div class="skeleton-pill"></div>
        <div class="skeleton-pill"></div>
        <div class="skeleton-pill"></div>
      </div>
      <div class="mye-doc-group-skeleton">
        <div class="skeleton-title"></div>
        <div class="skeleton-card"></div>
      </div>
    `;

    document.body.appendChild(container);

    // Lancer le chargement des données
    loadData();
  }

  async function loadData() {
    try {
      const [docsRes, invoicesRes, legacyRes] = await Promise.all([
        fetch(API_DOCS, { credentials: 'include' }).then(r => r.json()).catch(() => []),
        fetch(API_INVOICES, { credentials: 'include' }).then(r => r.json()).catch(() => []),
        fetch(API_LEGACY, { credentials: 'include' }).then(r => r.json()).catch(() => [])
      ]);

      // Regrouper les données
      const safeArray = (arr) => Array.isArray(arr) ? arr : [];
      
      allDocs = [
        ...safeArray(docsRes).map(d => ({ ...d, source: 'document' })),
        ...safeArray(invoicesRes).map(d => ({ ...d, source: 'invoice' })),
        ...safeArray(legacyRes).map(d => ({ ...d, source: 'legacy' }))
      ];

      renderPage();
    } catch (e) {
      console.error('Erreur chargement documents MyEfrei Ultra:', e);
      document.getElementById('mye-documents-container').innerHTML = `
        <div style="text-align:center; padding: 50px;">
          Erreur lors du chargement des documents.
        </div>
      `;
    }
  }

  function formatDate(isoString) {
    if (!isoString) return 'Date inconnue';
    const date = new Date(isoString);
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return 'Mis à jour : ' + date.toLocaleDateString('fr-FR', options);
  }

  function getDownloadUrl(doc) {
    // Tentative de déduire l'URL de téléchargement.
    // Si c'est une facture :
    if (doc.source === 'invoice') {
      return `/api/rest/student/schooling/invoices/${doc.id}/download`;
    }
    // Si c'est un document ou legacy
    return `/api/rest/student/schooling/documents/${doc.id}/download`;
  }

  function renderPage() {
    const container = document.getElementById('mye-documents-container');
    if (!container) return;

    // Regrouper par catégorie
    const groups = {};
    allDocs.forEach(doc => {
      const cat = doc.category || 'Autres';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(doc);
    });

    // Trier les groupes par nom (optionnel, on garde l'ordre logique)
    const categoryOrder = ['Documents Administratifs', 'Factures', 'Résultats Académiques', 'Autres'];
    const sortedCategories = Object.keys(groups).sort((a, b) => {
      let ia = categoryOrder.indexOf(a);
      let ib = categoryOrder.indexOf(b);
      if (ia === -1) ia = 99;
      if (ib === -1) ib = 99;
      return ia - ib;
    });

    let html = `
      <div class="mye-doc-header">
        <div class="mye-doc-filters">
          <button class="mye-doc-filter-btn ${currentFilter === 'Tous' ? 'active' : ''}" data-filter="Tous">Tous</button>
          <button class="mye-doc-filter-btn ${currentFilter === 'Administratif' ? 'active' : ''}" data-filter="Administratif">Administratif</button>
          <button class="mye-doc-filter-btn ${currentFilter === 'Factures' ? 'active' : ''}" data-filter="Factures">Factures</button>
          <button class="mye-doc-filter-btn ${currentFilter === 'Résultats' ? 'active' : ''}" data-filter="Résultats">Résultats</button>
        </div>
        <div class="mye-doc-sort">
          <button class="mye-doc-sort-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
            Trier : Récents
          </button>
        </div>
      </div>
      <div class="mye-doc-list">
    `;

    let totalDocs = 0;

    sortedCategories.forEach(cat => {
      // Appliquer le filtre
      if (currentFilter === 'Administratif' && !cat.toLowerCase().includes('administratif')) return;
      if (currentFilter === 'Factures' && !cat.toLowerCase().includes('facture')) return;
      if (currentFilter === 'Résultats' && !cat.toLowerCase().includes('résultat')) return;

      const docs = groups[cat];
      totalDocs += docs.length;

      // Trier les documents du plus récent au plus ancien
      docs.sort((a, b) => new Date(b.lastUpload || 0) - new Date(a.lastUpload || 0));

      html += `
        <div class="mye-doc-group">
          <div class="mye-doc-group-title">${cat.toUpperCase()}</div>
          <div class="mye-doc-card">
      `;

      docs.forEach((doc, index) => {
        const isLast = index === docs.length - 1;
        const dlUrl = getDownloadUrl(doc);
        
        html += `
            <div class="mye-doc-item ${isLast ? 'last' : ''}">
              <div class="mye-doc-info">
                <div class="mye-doc-name">${doc.name || 'Document sans nom'}</div>
                <div class="mye-doc-date">${formatDate(doc.lastUpload)}</div>
              </div>
              <div class="mye-doc-actions">
                <button class="mye-doc-action-btn view-btn" data-url="${dlUrl}" data-title="${doc.name || 'Document'}">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                </button>
                <a href="${dlUrl}" class="mye-doc-action-btn dl-btn" download target="_blank">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                </a>
              </div>
            </div>
        `;
      });

      html += `
          </div>
        </div>
      `;
    });

    html += `
      </div>
      <div class="mye-doc-footer">
        <div class="mye-doc-count">${totalDocs} document${totalDocs > 1 ? 's' : ''} trouvé${totalDocs > 1 ? 's' : ''}</div>
      </div>
    `;

    container.innerHTML = html;

    // Événements Filtres
    container.querySelectorAll('.mye-doc-filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        currentFilter = e.target.getAttribute('data-filter');
        renderPage();
      });
    });

    // Événements PDF Viewer
    container.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const btnEl = e.currentTarget;
        const url = btnEl.getAttribute('data-url');
        const title = btnEl.getAttribute('data-title');
        if (window.myePdfViewer) {
          window.myePdfViewer.open(url, title);
        } else {
          window.open(url, '_blank');
        }
      });
    });
  }

  // Routing pour SPA MyEfrei
  function waitAndInit() {
    if (!document.body) {
      setTimeout(waitAndInit, 100);
      return;
    }
    if (!document.getElementById('mye-documents-container')) {
      document.body.classList.add('mye-documents-active');
      document.body.classList.add('mye-clean-screen');
      initDocumentsPage();
    } else {
      document.body.classList.add('mye-documents-active');
      document.body.classList.add('mye-clean-screen');
      document.getElementById('mye-documents-container').style.display = 'block';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (window.location.pathname.includes('/portal/student/documents')) waitAndInit();
    });
  } else {
    if (window.location.pathname.includes('/portal/student/documents')) waitAndInit();
  }

  let lastUrl = window.location.href;
  setInterval(() => {
    if (lastUrl !== window.location.href) {
      lastUrl = window.location.href;
      
      if (window.location.pathname.includes('/portal/student/documents')) {
        waitAndInit();
      } else {
        if (document.body) {
          document.body.classList.remove('mye-documents-active');
          document.body.classList.remove('mye-clean-screen');
        }
        const container = document.getElementById('mye-documents-container');
        if (container) container.style.display = 'none';
      }
    }
  }, 500);

})();
