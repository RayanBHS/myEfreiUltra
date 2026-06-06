// =============================================
//  MYEFREI ULTRA — Module Ressources (resources.js)
// =============================================

(function () {
  'use strict';

  console.log('📚 MyEfrei ULTRA — Module Ressources (Chargé)');

  // ──────────────────────────────────────────────
  // CONSTANTES & CONFIGURATION
  // ──────────────────────────────────────────────
  const API_CATEGORIES = '/api/rest/common/resources/categories?with-resources=true';

  let state = {
    categories: [],
    categoryResources: {}, // Cache of categoryId -> parsed groups array
    search: '',
    currentPath: window.location.pathname
  };

  // Map icon names from the database to clean Material icons
  const ICON_MAP = {
    'school': 'school',
    'science': 'science',
    'quiz': 'quiz',
    'license': 'badge',
    'myefrei': 'grid_view',
    'contact_support_outlined': 'contact_support',
    'health_and_safety_outlined': 'health_and_safety',
    'forum': 'forum',
    'help': 'help',
    'description': 'description',
    'folder': 'folder',
    'link': 'link',
    'home': 'home',
    'where_to_vote_outlined': 'where_to_vote',
    'devices': 'devices',
    'interests': 'interests',
    'account_balance_outlined': 'account_balance',
    'business': 'business',
    'egg': 'egg',
    'science_outlined': 'science',
    'language': 'language',
    'lxp': 'emoji_events',
    'efrei-for-good': 'volunteer_activism'
  };

  function getMaterialIcon(name) {
    if (!name) return 'folder';
    const norm = name.trim().toLowerCase();
    if (ICON_MAP[norm]) return ICON_MAP[norm];
    
    // Fallback for invalid Material Icon ligatures (cannot contain hyphens, symbols, etc.)
    if (/[^a-z0-9_]/.test(norm)) {
      return 'folder';
    }
    return norm;
  }

  // ──────────────────────────────────────────────
  // DÉTECTION & ROUTAGE (SPA)
  // ──────────────────────────────────────────────
  function isResourcesPage() {
    return window.location.pathname.startsWith('/portal/common/resources');
  }

  function getActiveCategoryId() {
    const match = window.location.pathname.match(/\/portal\/common\/resources\/categories\/([a-fA-F0-9]+)/);
    return match ? match[1] : null;
  }

  function waitAndInit() {
    document.body.classList.add('mye-clean-screen');

    const checkHeader = setInterval(() => {
      if (document.getElementById('mye-custom-header-wrapper') || document.getElementById('mye-custom-header')) {
        clearInterval(checkHeader);
        if (!document.getElementById('mye-resources-container')) {
          setTimeout(init, 200);
        }
      }
    }, 200);

    setTimeout(() => {
      clearInterval(checkHeader);
      if (!document.getElementById('mye-resources-container')) {
        init();
      }
    }, 5000);
  }

  // Initial load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (isResourcesPage()) waitAndInit();
    });
  } else {
    if (isResourcesPage()) waitAndInit();
  }

  // SPA Route Monitoring
  let lastUrl = window.location.href;
  setInterval(() => {
    if (lastUrl !== window.location.href) {
      lastUrl = window.location.href;

      if (isResourcesPage()) {
        if (!document.getElementById('mye-resources-container')) {
          waitAndInit();
        } else {
          // Re-route dynamically without full refresh
          state.currentPath = window.location.pathname;
          state.search = ''; // Reset search on route change
          const searchInput = document.querySelector('.mye-resources-search-input');
          if (searchInput) searchInput.value = '';
          
          document.body.classList.add('mye-clean-screen');
          renderContent();
        }
      } else {
        // Cleanup when navigating away
        const container = document.getElementById('mye-resources-container');
        if (container) container.remove();
      }
    }
  }, 300);

  // ──────────────────────────────────────────────
  // INITIALISATION
  // ──────────────────────────────────────────────
  function init() {
    if (document.getElementById('mye-resources-container')) return;

    console.log('📚 Initialisation de la page Ressources…');
    document.body.classList.add('mye-clean-screen');

    // Build main wrapper layout
    const container = document.createElement('div');
    container.id = 'mye-resources-container';
    container.className = 'mye-page-container';

    container.innerHTML = `
      <div class="mye-resources-left">
        <div class="mye-resources-search-box">
          <div class="mye-resources-search-title">Recherche</div>
          <div class="mye-resources-search-input-wrapper">
            <span class="mye-resources-search-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </span>
            <input type="text" class="mye-resources-search-input" placeholder="Rechercher...">
          </div>
        </div>
        <div class="mye-resources-nav-menu" id="mye-resources-sidebar-nav">
          <div class="mye-resources-nav-title">Catégories</div>
          <!-- Populated dynamically -->
        </div>
      </div>
      <div class="mye-resources-right" id="mye-resources-content-area">
        <div class="mye-resources-loading-container">
          <div class="mye-grades-spinner"></div>
          <div class="mye-grades-loading-text">Chargement des ressources Efrei...</div>
        </div>
      </div>
    `;

    document.body.appendChild(container);
    state.currentPath = window.location.pathname;

    // Attach search input listener
    const searchInput = container.querySelector('.mye-resources-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        state.search = e.target.value.toLowerCase().trim();
        renderContent();
      });
    }

    // Load data from Efrei
    loadData();
  }

  // ──────────────────────────────────────────────
  // CHARGEMENT DES DONNÉES
  // ──────────────────────────────────────────────
  async function loadData() {
    try {
      const response = await fetch(API_CATEGORIES, { credentials: 'include' });
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      
      const data = await response.json();
      const rawCategories = Array.isArray(data) ? data : [];
      
      // Filter out invalid, placeholder, or test categories (e.g. title empty, test, or single dash)
      state.categories = rawCategories.filter(cat => {
        if (!cat || !cat.title) return false;
        const title = cat.title.trim();
        if (title === '' || title === '-' || title === '--' || title.toLowerCase() === 'test') {
          return false;
        }
        return true;
      });

      renderSidebar();
      renderContent();
    } catch (e) {
      console.error('📚 Erreur chargement catégories:', e);
      const contentArea = document.getElementById('mye-resources-content-area');
      if (contentArea) {
        contentArea.innerHTML = `
          <div class="mye-resources-empty">
            <div class="mye-resources-empty-icon">⚠️</div>
            <div class="mye-resources-empty-title">Erreur de connexion</div>
            <div class="mye-resources-empty-desc">Impossible de récupérer vos ressources. Vérifiez votre connexion internet.</div>
          </div>
        `;
      }
    }
  }

  // Parses the Efrei category resources API response into a clean grouped structure
  function parseCategoryResources(data) {
    if (!data) return [];

    // If data is a JSON Object (e.g. {"Documents officiels": [items], ...})
    if (typeof data === 'object' && !Array.isArray(data)) {
      return Object.keys(data).map(key => ({
        name: key,
        items: Array.isArray(data[key]) ? data[key] : []
      }));
    }

    // Fallback if data is an array
    if (Array.isArray(data)) {
      if (data.length > 0 && Array.isArray(data[0].resources)) {
        // Grouped Mode: data is [{ name: 'Group 1', resources: [...] }]
        return data.map(group => ({
          name: group.name || group.title || 'Autres documents',
          items: Array.isArray(group.resources) ? group.resources : []
        }));
      } else {
        // Flat Mode: data is direct array of resources
        return [{
          name: 'Documents',
          items: data
        }];
      }
    }

    return [];
  }

  // ──────────────────────────────────────────────
  // RENDU DES COMPOSANTS
  // ──────────────────────────────────────────────

  // Render the left sidebar category list
  function renderSidebar() {
    const sidebar = document.getElementById('mye-resources-sidebar-nav');
    if (!sidebar) return;

    // Keep the title
    sidebar.innerHTML = '<div class="mye-resources-nav-title">Catégories</div>';

    // "Toutes les catégories" item
    const allItem = document.createElement('button');
    allItem.className = `mye-resources-nav-item ${!getActiveCategoryId() ? 'active' : ''}`;
    allItem.innerHTML = `
      <span class="mye-resources-nav-item-icon material-icons">widgets</span>
      <span>Toutes</span>
    `;
    allItem.addEventListener('click', () => {
      window.history.pushState({}, '', '/portal/common/resources');
      state.currentPath = '/portal/common/resources';
      updateActiveNavItem();
      renderContent();
    });
    sidebar.appendChild(allItem);

    // List of active categories
    state.categories.forEach(cat => {
      const item = document.createElement('button');
      const isActive = getActiveCategoryId() === cat._id;
      item.className = `mye-resources-nav-item ${isActive ? 'active' : ''}`;
      item.setAttribute('data-id', cat._id);

      item.innerHTML = `
        <span class="mye-resources-nav-item-icon material-icons">${getMaterialIcon(cat.icon)}</span>
        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${cat.title}</span>
      `;

      item.addEventListener('click', () => {
        const targetUrl = `/portal/common/resources/categories/${cat._id}`;
        window.history.pushState({}, '', targetUrl);
        state.currentPath = targetUrl;
        updateActiveNavItem();
        renderContent();
      });
      sidebar.appendChild(item);
    });
  }

  function updateActiveNavItem() {
    const activeId = getActiveCategoryId();
    document.querySelectorAll('.mye-resources-nav-item').forEach(item => {
      const id = item.getAttribute('data-id');
      if ((!activeId && !id) || (activeId && id === activeId)) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  // Main content area routing and rendering
  function renderContent() {
    const contentArea = document.getElementById('mye-resources-content-area');
    if (!contentArea) return;

    updateActiveNavItem();

    const activeCatId = getActiveCategoryId();
    if (activeCatId) {
      const category = state.categories.find(c => c._id === activeCatId);
      if (category) {
        renderCategoryDetail(category, contentArea);
      } else {
        contentArea.innerHTML = `
          <div class="mye-resources-empty">
            <div class="mye-resources-empty-icon">🔍</div>
            <div class="mye-resources-empty-title">Catégorie introuvable</div>
            <div class="mye-resources-empty-desc">La catégorie demandée n'existe pas ou a été supprimée.</div>
          </div>
        `;
      }
    } else {
      renderCategoriesOverview(contentArea);
    }
  }

  // 1. Overview Mode: Grid of Categories
  function renderCategoriesOverview(container) {
    // Filter categories based on search input
    const filtered = state.categories.filter(cat => {
      const titleMatch = cat.title && cat.title.toLowerCase().includes(state.search);
      const descMatch = cat.description && cat.description.toLowerCase().includes(state.search);
      return titleMatch || descMatch;
    });

    const headerHTML = `
      <div class="mye-resources-header-card">
        <div class="mye-resources-header-badge">
          <span class="material-icons" style="font-size: 16px;">bookmark</span>
          <span>Portail Efrei</span>
        </div>
        <h1 class="mye-resources-header-title">Centre de ressources</h1>
        <p class="mye-resources-header-desc">Retrouvez l'ensemble des documents pédagogiques, guides, règlements et bons plans mis à disposition par l'Efrei.</p>
      </div>
    `;

    if (filtered.length === 0) {
      container.innerHTML = `
        ${headerHTML}
        <div class="mye-resources-empty">
          <div class="mye-resources-empty-icon">📭</div>
          <div class="mye-resources-empty-title">Aucune catégorie trouvée</div>
          <div class="mye-resources-empty-desc">Aucune catégorie ne correspond à votre recherche "${state.search}".</div>
        </div>
      `;
      return;
    }

    const cardsHTML = filtered.map(cat => {
      const desc = cat.description || "Aucune description fournie.";
      return `
        <div class="mye-resources-category-card" data-id="${cat._id}">
          <div class="mye-resources-category-card-top">
            <div class="mye-resources-category-icon-bg">
              <span class="material-icons">${getMaterialIcon(cat.icon)}</span>
            </div>
            <h3 class="mye-resources-category-title">${cat.title}</h3>
          </div>
          <p class="mye-resources-category-desc">${desc}</p>
          <div class="mye-resources-category-card-bottom">
            <span>Consulter les documents</span>
            <span class="mye-resources-category-arrow material-icons">arrow_forward</span>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      ${headerHTML}
      <div class="mye-resources-grid">${cardsHTML}</div>
    `;

    // Attach click listeners to cards
    container.querySelectorAll('.mye-resources-category-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-id');
        const targetUrl = `/portal/common/resources/categories/${id}`;
        window.history.pushState({}, '', targetUrl);
        state.currentPath = targetUrl;
        renderContent();
      });
    });
  }

  // 2. Detail Mode: List of specific resources with dynamic loading
  async function renderCategoryDetail(category, container) {
    const catId = category._id;

    const backButtonHTML = `
      <button class="mye-resources-back-btn" id="mye-resources-back-btn">
        <span class="material-icons">arrow_back</span>
        <span>Toutes les catégories</span>
      </button>
    `;

    const headerHTML = `
      <div class="mye-resources-header-card">
        <div class="mye-resources-header-badge">
          <span class="material-icons" style="font-size: 16px;">${getMaterialIcon(category.icon)}</span>
          <span>Catégorie</span>
        </div>
        <h1 class="mye-resources-header-title">${category.title}</h1>
        <p class="mye-resources-header-desc">${category.description || "Ressources liées au programme ou service."}</p>
        ${backButtonHTML}
      </div>
    `;

    // Fetch resources if not already cached
    if (!state.categoryResources[catId]) {
      container.innerHTML = `
        ${headerHTML}
        <div class="mye-resources-loading-container" id="mye-category-loader">
          <div class="mye-grades-spinner"></div>
          <div class="mye-grades-loading-text">Chargement des documents de la catégorie...</div>
        </div>
      `;

      // Bind back button immediately during loading
      document.getElementById('mye-resources-back-btn').addEventListener('click', goBack);

      try {
        const response = await fetch(`/api/rest/common/resources?category=${catId}&group=true`, { credentials: 'include' });
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        const data = await response.json();
        
        state.categoryResources[catId] = parseCategoryResources(data);
      } catch (err) {
        console.error(`Erreur chargement ressources catégorie ${catId}:`, err);
        const loader = document.getElementById('mye-category-loader');
        if (loader) {
          loader.className = 'mye-resources-empty';
          loader.innerHTML = `
            <div class="mye-resources-empty-icon">⚠️</div>
            <div class="mye-resources-empty-title">Erreur de chargement</div>
            <div class="mye-resources-empty-desc">Impossible de charger les documents pour cette catégorie.</div>
          `;
        }
        return;
      }
    }

    const groups = state.categoryResources[catId];

    // Filter items based on search input
    const filteredGroups = groups.map(group => {
      const items = group.items.filter(res => {
        const title = (res.title || res.name || '').toLowerCase();
        const desc = (res.description || res.desc || '').toLowerCase();
        return title.includes(state.search) || desc.includes(state.search);
      });
      return { ...group, items };
    }).filter(group => group.items.length > 0);

    if (filteredGroups.length === 0) {
      container.innerHTML = `
        ${headerHTML}
        <div class="mye-resources-empty">
          <div class="mye-resources-empty-icon">📭</div>
          <div class="mye-resources-empty-title">Aucun document</div>
          <div class="mye-resources-empty-desc">${state.search ? `Aucun document ne correspond à "${state.search}".` : "Aucun document n'est disponible dans cette catégorie."}</div>
        </div>
      `;
      document.getElementById('mye-resources-back-btn').addEventListener('click', goBack);
      return;
    }

    const groupsHTML = filteredGroups.map(group => {
      const itemsHTML = group.items.map(res => {
        const title = res.title || res.name || 'Document';
        const desc = res.description || res.desc || '';
        
        let url = '#';
        let typeClass = 'mye-res-file';
        let typeIcon = 'insert_drive_file';
        let buttonClass = 'btn-file';
        let buttonText = 'Télécharger';
        let isPdf = false;

        // Use file metadata if present
        if (res.file) {
          url = `/api/rest/common/resources/files/download?path=${encodeURIComponent(res.file.path)}`;
          const fileType = String(res.file.type || '').toLowerCase();
          const fileName = String(res.file.name || '').toLowerCase();
          
          if (fileType === 'pdf' || fileName.endsWith('.pdf')) {
            typeClass = 'mye-res-pdf';
            typeIcon = 'picture_as_pdf';
            buttonClass = 'btn-pdf';
            buttonText = 'Consulter le PDF';
            isPdf = true;
          }
        } else if (res.url || res.link) {
          url = res.url || res.link;
          typeClass = 'mye-res-link';
          typeIcon = 'open_in_new';
          buttonClass = 'btn-link';
          buttonText = 'Accéder au lien';
        }

        const cleanUrl = url.startsWith('http') || url.startsWith('/') ? url : '/' + url;
        const hasAction = url !== '#';

        const actionBtnHTML = hasAction ? `
          <a href="${cleanUrl}" target="_blank" class="mye-resource-row-action-btn">
            <span>${buttonText}</span>
            <span class="material-icons" style="font-size: 16px;">arrow_outward</span>
          </a>
        ` : `
          <span class="mye-resource-row-info-badge">Info</span>
        `;

        return `
          <div class="mye-resource-row">
            <div class="mye-resource-row-left">
              <div class="mye-resource-row-icon-wrapper ${typeClass}">
                <span class="material-icons">${typeIcon}</span>
              </div>
              <div class="mye-resource-row-info">
                <h3 class="mye-resource-row-title" title="${title}">${title}</h3>
                ${desc ? `<p class="mye-resource-row-desc">${desc}</p>` : ''}
              </div>
            </div>
            <div class="mye-resource-row-right">
              <span class="mye-resource-row-badge">${isPdf ? 'PDF' : (url.startsWith('http') ? 'Lien' : 'Fichier')}</span>
              ${actionBtnHTML}
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="mye-resource-group">
          <h2 class="mye-resource-group-title">${group.name}</h2>
          <div class="mye-resource-items-grid">${itemsHTML}</div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      ${headerHTML}
      <div class="mye-resources-detail-container" style="margin-top: 15px;">
        ${groupsHTML}
      </div>
    `;

    document.getElementById('mye-resources-back-btn').addEventListener('click', goBack);
  }

  function goBack() {
    window.history.pushState({}, '', '/portal/common/resources');
    state.currentPath = '/portal/common/resources';
    renderContent();
  }

  // Handle browser popstate events (when clicking back/forward button in browser)
  window.addEventListener('popstate', () => {
    if (isResourcesPage()) {
      state.currentPath = window.location.pathname;
      renderContent();
    }
  });

})();
