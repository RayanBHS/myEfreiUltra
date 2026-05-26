(function() {
  // Configuration
  const API_DOCS = '/api/rest/student/schooling/documents';
  const API_INVOICES = '/api/rest/student/schooling/invoices';
  const API_LEGACY = '/api/rest/student/schooling/legacy-documents';

  let allDocs = [];
  let currentFilter = 'Tous'; // 'Tous', 'Administratif', 'Factures', 'Résultats'
  let currentSort = 'recent'; // 'recent', 'old', 'cat_asc', 'cat_desc'

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
    if (doc.source === 'invoice') {
      return `/api/rest/student/schooling/invoices/${doc.id}/download`;
    } else if (doc.source === 'legacy') {
      return `/api/rest/student/schooling/legacy-documents/${doc.id}/download`;
    }
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

    const categoryOrder = ['Documents Administratifs', 'Factures', 'Résultats Académiques', 'Autres'];
    let sortedCategories = Object.keys(groups);

    if (currentSort === 'cat_asc') {
      sortedCategories.sort((a, b) => a.localeCompare(b, 'fr'));
    } else if (currentSort === 'cat_desc') {
      sortedCategories.sort((a, b) => b.localeCompare(a, 'fr'));
    } else {
      // Pour recent et old, on garde l'ordre par défaut MyEfrei (Logique)
      sortedCategories.sort((a, b) => {
        let ia = categoryOrder.indexOf(a);
        let ib = categoryOrder.indexOf(b);
        if (ia === -1) ia = 99;
        if (ib === -1) ib = 99;
        return ia - ib;
      });
    }

    // Helper function for sort label
    function getSortLabel(val) {
      switch(val) {
        case 'recent': return 'Récents';
        case 'old': return 'Anciens';
        case 'cat_asc': return 'Catégorie A-Z';
        case 'cat_desc': return 'Catégorie Z-A';
        default: return 'Récents';
      }
    }

    let html = `
      <div class="mye-doc-header">
        <div class="mye-doc-filters">
          <button class="mye-doc-filter-btn ${currentFilter === 'Tous' ? 'active' : ''}" data-filter="Tous">Tous</button>
          <button class="mye-doc-filter-btn ${currentFilter === 'Administratif' ? 'active' : ''}" data-filter="Administratif">Administratif</button>
          <button class="mye-doc-filter-btn ${currentFilter === 'Factures' ? 'active' : ''}" data-filter="Factures">Factures</button>
          <button class="mye-doc-filter-btn ${currentFilter === 'Résultats' ? 'active' : ''}" data-filter="Résultats">Résultats</button>
        </div>
        <div class="mye-doc-sort">
          <div class="mye-custom-select" id="mye-doc-sort-container">
            <button class="mye-custom-select-btn" id="mye-doc-sort-btn">
              <span class="mye-custom-select-label">${getSortLabel(currentSort)}</span>
              <span class="mye-custom-select-arrow">▼</span>
            </button>
            <div class="mye-custom-select-dropdown" id="mye-doc-sort-dropdown">
              <button class="mye-custom-select-option ${currentSort === 'recent' ? 'active' : ''}" data-value="recent">Récents</button>
              <button class="mye-custom-select-option ${currentSort === 'old' ? 'active' : ''}" data-value="old">Anciens</button>
              <button class="mye-custom-select-option ${currentSort === 'cat_asc' ? 'active' : ''}" data-value="cat_asc">Catégorie A-Z</button>
              <button class="mye-custom-select-option ${currentSort === 'cat_desc' ? 'active' : ''}" data-value="cat_desc">Catégorie Z-A</button>
            </div>
          </div>
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

      // Trier les documents à l'intérieur du groupe
      docs.sort((a, b) => {
        const d1 = new Date(a.lastUpload || 0);
        const d2 = new Date(b.lastUpload || 0);
        return currentSort === 'old' ? d1 - d2 : d2 - d1;
      });

      html += `
        <div class="mye-doc-group">
          <div class="mye-doc-group-title">${cat}</div>
          <div class="mye-doc-grid">
      `;

      docs.forEach((doc) => {
        const dlUrl = getDownloadUrl(doc);
        
        html += `
            <div class="mye-doc-card">
              <div class="mye-doc-card-left">
                <div class="mye-doc-info">
                  <div class="mye-doc-name">${doc.name || 'Document sans nom'}</div>
                  <div class="mye-doc-date">${formatDate(doc.lastUpload)}</div>
                </div>
              </div>
              <div class="mye-doc-card-right">
                <div class="mye-doc-actions">
                  <button class="mye-doc-action-btn view-btn" data-url="${dlUrl}" data-title="${doc.name || 'Document'}">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    Voir
                  </button>
                  <button class="mye-doc-action-btn dl-btn" data-url="${dlUrl}" data-title="${doc.name || 'Document'}" title="Télécharger">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                  </button>
                </div>
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

    // Événement Tri (Custom Select)
    const sortBtn = container.querySelector('#mye-doc-sort-btn');
    const sortDropdown = container.querySelector('#mye-doc-sort-dropdown');
    
    if (sortBtn && sortDropdown) {
      sortBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        sortBtn.classList.toggle('open');
        sortDropdown.classList.toggle('show');
      });

      // Fermer si clic ailleurs
      document.addEventListener('click', (e) => {
        if (!e.target.closest('#mye-doc-sort-container')) {
          sortBtn.classList.remove('open');
          sortDropdown.classList.remove('show');
        }
      });

      // Clic sur une option
      container.querySelectorAll('.mye-custom-select-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
          currentSort = e.target.getAttribute('data-value');
          renderPage(); // Va refermer le menu en recréant le HTML
        });
      });
    }

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
    // Événements Téléchargement (Force download via Blob)
    container.querySelectorAll('.dl-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const btnEl = e.currentTarget;
        const url = btnEl.getAttribute('data-url');
        const title = btnEl.getAttribute('data-title') || 'Document';
        
        const originalHtml = btnEl.innerHTML;
        btnEl.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
        btnEl.style.pointerEvents = 'none';
        btnEl.style.opacity = '0.7';

        try {
          const res = await fetch(url, { credentials: 'include' });
          if (!res.ok) throw new Error('Erreur réseau');
          const blob = await res.blob();
          
          if (blob.type && blob.type.includes('application/json')) {
            throw new Error('API returned JSON instead of file');
          }

          const objectUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = objectUrl;
          
          let ext = '.pdf';
          if (blob.type) {
            if (blob.type.includes('image/jpeg')) ext = '.jpg';
            else if (blob.type.includes('image/png')) ext = '.png';
            else if (blob.type.includes('application/zip')) ext = '.zip';
          }
          
          const cleanTitle = title.replace(/[<>:"/\\|?*]+/g, '_');
          a.download = cleanTitle.toLowerCase().endsWith(ext) ? cleanTitle : cleanTitle + ext;
          
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
        } catch (err) {
          console.error('Erreur de téléchargement:', err);
          alert('Impossible de télécharger ce document. Il est peut-être expiré ou non disponible.');
        } finally {
          btnEl.innerHTML = originalHtml;
          btnEl.style.pointerEvents = 'auto';
          btnEl.style.opacity = '1';
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
