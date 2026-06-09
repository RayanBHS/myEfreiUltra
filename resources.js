// =============================================
//  MYEFREI ULTRA — Module Ressources (resources.js)
// =============================================

(function () {
  'use strict';

  if (window.mye_user_enabled_flag === false || localStorage.getItem('mye_user_enabled') === 'false') {
    return;
  }

  console.log('📚 MyEfrei ULTRA — Module Ressources (Chargé)');

  // ──────────────────────────────────────────────
  // CONSTANTES & CONFIGURATION
  // ──────────────────────────────────────────────
  const API_CATEGORIES = '/api/rest/common/resources/categories?with-resources=true';

  let state = {
    categories: [],
    categoryResources: {}, // Cache of categoryId -> parsed groups array
    search: '',
    currentPath: window.location.pathname,
    favorites: []
  };

  function loadFavorites() {
    try {
      const favs = localStorage.getItem('mye-favorite-categories');
      state.favorites = favs ? JSON.parse(favs) : [];
    } catch (e) {
      state.favorites = [];
    }
  }

  function toggleFavorite(catId) {
    const idx = state.favorites.indexOf(catId);
    if (idx === -1) {
      state.favorites.push(catId);
    } else {
      state.favorites.splice(idx, 1);
    }
    try {
      localStorage.setItem('mye-favorite-categories', JSON.stringify(state.favorites));
    } catch (e) {
      console.error(e);
    }
    renderSidebar();
    renderContent();
  }

  function setupFavoriteHeaderBtn(container, categoryId) {
    const btn = container.querySelector('.mye-category-header-favorite-btn');
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(categoryId);
      });
    }
  }

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
    const urlParams = new URLSearchParams(window.location.search);
    const catId = urlParams.get('category') || urlParams.get('id');
    if (catId) return catId;

    const match = window.location.pathname.match(/\/portal\/common\/resources\/(?:categories\/)?([a-fA-F0-9]+)/);
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
        closeModal();
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

    loadFavorites();
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
      
      // Trigger background preloading of all category resources
      preloadAllCategoryResources();
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

  async function preloadAllCategoryResources() {
    console.log('📚 MyEfrei ULTRA — Préchargement des ressources en arrière-plan…');
    const promises = state.categories.map(async (cat) => {
      const catId = cat._id;
      if (state.categoryResources[catId]) return;
      
      try {
        const response = await fetch(`/api/rest/common/resources?category=${catId}&group=true`, { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          state.categoryResources[catId] = parseCategoryResources(data);
        }
      } catch (err) {
        console.warn(`📚 Impossible de précharger la catégorie ${cat.title}:`, err);
      }
    });
    
    await Promise.all(promises);
    console.log('📚 MyEfrei ULTRA — Toutes les ressources ont été préchargées et mises en cache.');
    
    // If the user is currently searching globally, re-render to include new results
    if (state.search && !getActiveCategoryId()) {
      renderContent();
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

    // List of active categories, sorted with favorites first
    const sortedCategories = [...state.categories].sort((a, b) => {
      const aFav = state.favorites.includes(a._id);
      const bFav = state.favorites.includes(b._id);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      return 0;
    });

    sortedCategories.forEach(cat => {
      const item = document.createElement('button');
      const isActive = getActiveCategoryId() === cat._id;
      const isFav = state.favorites.includes(cat._id);
      item.className = `mye-resources-nav-item ${isActive ? 'active' : ''}`;
      item.setAttribute('data-id', cat._id);

      item.innerHTML = `
        <span class="mye-resources-nav-item-icon material-icons">${getMaterialIcon(cat.icon)}</span>
        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; text-align: left;">${cat.title}</span>
        ${isFav ? `<span class="material-icons mye-sidebar-fav-star" style="font-size: 14px; color: #facc15; margin-left: 4px;">star</span>` : ''}
      `;

      item.addEventListener('click', () => {
        const targetUrl = `/portal/common/resources?category=${cat._id}`;
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
  async function renderContent() {
    const contentArea = document.getElementById('mye-resources-content-area');
    if (!contentArea) return;

    updateActiveNavItem();

    const activeId = getActiveCategoryId();
    if (activeId) {
      // Show loading spinner
      contentArea.innerHTML = `
        <div class="mye-resources-loading-container">
          <div class="mye-grades-spinner"></div>
          <div class="mye-grades-loading-text">Chargement de la ressource...</div>
        </div>
      `;

      try {
        // Fetch details of this ID (could be a category or a resource)
        const isCategory = state.categories.some(c => c._id === activeId);
        let response;
        if (isCategory) {
          response = await fetch(`/api/rest/common/resources/categories/${activeId}`, { credentials: 'include' });
          if (!response.ok) {
            response = await fetch(`/api/rest/common/resources/${activeId}`, { credentials: 'include' });
          }
        } else {
          response = await fetch(`/api/rest/common/resources/${activeId}`, { credentials: 'include' });
          if (!response.ok) {
            response = await fetch(`/api/rest/common/resources/categories/${activeId}`, { credentials: 'include' });
          }
        }

        if (!response.ok) throw new Error('Not found');
        const data = await response.json();

        // If the ID is a Category (has subCategories list or is in state.categories or fetched from categories API)
        const fetchedCategoryUrl = response.url && response.url.includes('/resources/categories/');
        const isCategoryResponse = fetchedCategoryUrl || (data && !data.category) || data.subCategories || state.categories.some(c => c._id === activeId);

        if (isCategoryResponse) {
          let category = state.categories.find(c => c._id === activeId);
          if (!category) {
            category = {
              _id: data._id,
              title: data.title,
              description: data.description,
              icon: data.icon || 'folder'
            };
            state.categories.push(category);
            renderSidebar();
          }
          await renderCategoryDetail(category, contentArea);
        } else {
          // It's an individual content/video resource!
          // Try to load the parent category in the background for context
          const parentCatId = data.category && data.category._id;
          if (parentCatId) {
            let parentCategory = state.categories.find(c => c._id === parentCatId);
            if (!parentCategory) {
              try {
                const catRes = await fetch(`/api/rest/common/resources/categories/${parentCatId}`, { credentials: 'include' });
                if (catRes.ok) {
                  const catData = await catRes.json();
                  parentCategory = {
                    _id: catData._id,
                    title: catData.title,
                    description: catData.description,
                    icon: catData.icon || 'folder'
                  };
                  state.categories.push(parentCategory);
                  renderSidebar();
                }
              } catch (e) {
                console.error(e);
              }
            }

            if (parentCategory) {
              await renderCategoryDetail(parentCategory, contentArea);
            } else {
              renderCategoriesOverview(contentArea);
            }
          } else {
            renderCategoriesOverview(contentArea);
          }

          // Open the resource details inside the modal overlay (pre-fetched data object)
          openContentModal(data, data.title);
        }
      } catch (err) {
        console.error(err);
        contentArea.innerHTML = `
          <div class="mye-resources-empty">
            <div class="mye-resources-empty-icon">🔍</div>
            <div class="mye-resources-empty-title">Ressource introuvable</div>
            <div class="mye-resources-empty-desc">La catégorie ou le document demandé n'existe pas ou a été supprimé.</div>
          </div>
        `;
      }
    } else {
      if (state.search) {
        renderSearchResults(contentArea);
      } else {
        renderCategoriesOverview(contentArea);
      }
    }
  }

  function clearSearch() {
    state.search = '';
    const searchInput = document.querySelector('.mye-resources-search-input');
    if (searchInput) searchInput.value = '';
    renderContent();
  }

  function renderSearchResults(container) {
    const query = state.search;
    const groupedResults = {}; // key: "CategoryTitle § GroupName" -> { categoryName, categoryIcon, groupName, items: [] }

    // Gather all matching resources across all cached categories
    state.categories.forEach(cat => {
      const groups = state.categoryResources[cat._id] || [];
      groups.forEach(group => {
        group.items.forEach(item => {
          const title = (item.title || item.name || '').toLowerCase();
          const desc = (item.description || item.desc || '').toLowerCase();
          if (title.includes(query) || desc.includes(query)) {
            const key = `${cat.title} § ${group.name}`;
            if (!groupedResults[key]) {
              groupedResults[key] = {
                categoryName: cat.title,
                categoryIcon: cat.icon,
                groupName: group.name,
                items: []
              };
            }
            groupedResults[key].items.push(item);
          }
        });
      });
    });

    const sortedGroupKeys = Object.keys(groupedResults).sort();

    let totalResultsCount = 0;
    sortedGroupKeys.forEach(key => {
      totalResultsCount += groupedResults[key].items.length;
    });

    const headerHTML = `
      <div class="mye-resources-header-card">
        <div class="mye-resources-header-badge">
          <span class="material-icons" style="font-size: 16px;">search</span>
          <span>Recherche globale</span>
        </div>
        <h1 class="mye-resources-header-title">Résultats de recherche</h1>
        <p class="mye-resources-header-desc">${totalResultsCount} document${totalResultsCount !== 1 ? 's' : ''} trouvé${totalResultsCount !== 1 ? 's' : ''} pour "${query}".</p>
        <button class="mye-resources-back-btn" id="mye-resources-clear-search-btn">
          <span class="material-icons">clear</span>
          <span>Effacer la recherche</span>
        </button>
      </div>
    `;

    // Check if we are still loading in the background
    const totalCategoriesCount = state.categories.length;
    const loadedCategoriesCount = Object.keys(state.categoryResources).length;
    const isStillPreloading = loadedCategoriesCount < totalCategoriesCount;

    if (totalResultsCount === 0) {
      container.innerHTML = `
        ${headerHTML}
        <div class="mye-resources-empty">
          <div class="mye-resources-empty-icon">${isStillPreloading ? '⏳' : '🔍'}</div>
          <div class="mye-resources-empty-title">${isStillPreloading ? 'Recherche en cours...' : 'Aucun résultat'}</div>
          <div class="mye-resources-empty-desc">
            ${isStillPreloading 
              ? 'Certaines catégories sont encore en cours de chargement en arrière-plan...' 
              : `Aucun document ne correspond à votre recherche "${query}".`}
          </div>
        </div>
      `;
      document.getElementById('mye-resources-clear-search-btn').addEventListener('click', clearSearch);
      return;
    }

    const groupsHTML = sortedGroupKeys.map(key => {
      const group = groupedResults[key];
      const itemsHTML = group.items.map(res => {
        const title = res.title || res.name || 'Document';
        const desc = res.description || res.desc || '';
        
        let url = '#';
        let typeClass = 'mye-res-file';
        let typeIcon = 'insert_drive_file';
        let buttonText = 'Télécharger';
        let isPdf = false;
        let isContent = false;
        let badgeText = 'Fichier';

        if (res.url || res.link) {
          url = res.url || res.link;
          typeClass = 'mye-res-link';
          typeIcon = 'open_in_new';
          buttonText = 'Accéder au lien';
          badgeText = 'Lien';
        } else if (res.file) {
          url = `/api/rest/common/resources/${res._id}/file`;
          
          const isPdfType = res.file && (String(res.file.type || '').toLowerCase() === 'pdf' || String(res.file.name || '').toLowerCase().endsWith('.pdf'));
          const isPdfTitle = String(title).toLowerCase().includes('.pdf');
          
          if (isPdfType || isPdfTitle) {
            typeClass = 'mye-res-pdf';
            typeIcon = 'picture_as_pdf';
            buttonText = 'Consulter le PDF';
            isPdf = true;
            badgeText = 'PDF';
          } else {
            typeClass = 'mye-res-file';
            typeIcon = 'insert_drive_file';
            buttonText = 'Télécharger';
            badgeText = 'Fichier';
          }
        } else if (res._id) {
          isContent = true;
          const isVideoSub = group.groupName && (group.groupName.toLowerCase().includes('vidéo') || group.groupName.toLowerCase().includes('video') || group.groupName.toLowerCase().includes('capsule'));
          const isVideoTitle = title.toLowerCase().includes('bref') || title.toLowerCase().includes('vidéo') || title.toLowerCase().includes('video');
          
          if (isVideoSub || isVideoTitle) {
            typeClass = 'mye-res-video';
            typeIcon = 'play_circle';
            buttonText = 'Voir la vidéo';
            badgeText = 'Vidéo';
          } else {
            typeClass = 'mye-res-content';
            typeIcon = 'article';
            buttonText = 'Consulter';
            badgeText = 'Contenu';
          }
        }

        const cleanUrl = url.startsWith('http') || url.startsWith('/') ? url : '/' + url;
        const hasAction = isContent || url !== '#';

        const actionBtnHTML = hasAction ? `
          <button class="mye-resource-row-action-btn mye-action-trigger" 
                  data-url="${cleanUrl}" 
                  data-title="${title}" 
                  data-pdf="${isPdf}"
                  data-content="${isContent}"
                  data-id="${res._id}">
            <span>${buttonText}</span>
            <span class="material-icons" style="font-size: 16px;">arrow_outward</span>
          </button>
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
              <span class="mye-resource-row-badge">${badgeText}</span>
              ${actionBtnHTML}
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="mye-resource-group">
          <div class="mye-resource-group-header mye-group-toggle-trigger">
            <h2 class="mye-resource-group-title" style="display: flex; align-items: center; gap: 8px;">
              <span class="material-icons" style="font-size: 18px; margin-right: 4px;">${getMaterialIcon(group.categoryIcon)}</span>
              <span>${group.categoryName} &rsaquo; ${group.groupName}</span>
            </h2>
            <button class="mye-resource-group-toggle-btn" aria-label="Fermer la sous-catégorie">
              <span class="material-icons">keyboard_arrow_up</span>
            </button>
          </div>
          <div class="mye-resource-items-grid">${itemsHTML}</div>
        </div>
      `;
    }).join('');

    let loadingIndicatorHTML = '';
    if (isStillPreloading) {
      loadingIndicatorHTML = `
        <div style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 10px; margin-top: 15px; color: var(--mye-primary-color); font-weight: 500; font-size: 13px;">
          <div class="mye-grades-spinner" style="width: 16px; height: 16px; border-width: 2px;"></div>
          <span>Recherche en cours dans les autres catégories...</span>
        </div>
      `;
    }

    container.innerHTML = `
      ${headerHTML}
      ${loadingIndicatorHTML}
      <div class="mye-resources-detail-container" style="margin-top: 15px;">
        ${groupsHTML}
      </div>
    `;

    // Attach click listeners to collapse/expand sub-categories (groups)
    container.querySelectorAll('.mye-group-toggle-trigger').forEach(header => {
      header.addEventListener('click', (e) => {
        const groupEl = header.closest('.mye-resource-group');
        if (groupEl) {
          groupEl.classList.toggle('collapsed');
        }
      });
    });

    // Attach click listeners to download/open buttons
    container.querySelectorAll('.mye-action-trigger').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const isContent = btn.getAttribute('data-content') === 'true';
        const url = btn.getAttribute('data-url');
        const title = btn.getAttribute('data-title') || 'Document';

        if (isContent) {
          const resId = btn.getAttribute('data-id');
          openContentModal(resId, title);
        } else {
          const isPdf = btn.getAttribute('data-pdf') === 'true';
          if (isPdf && window.myePdfViewer) {
            window.myePdfViewer.open(url, title);
          } else {
            window.open(url, '_blank');
          }
        }
      });
    });

    document.getElementById('mye-resources-clear-search-btn').addEventListener('click', clearSearch);
  }

  // 1. Overview Mode: Grid of Categories
  function renderCategoriesOverview(container) {
    // Filter categories based on search input
    const filtered = state.categories.filter(cat => {
      const titleMatch = cat.title && cat.title.toLowerCase().includes(state.search);
      const descMatch = cat.description && cat.description.toLowerCase().includes(state.search);
      return titleMatch || descMatch;
    });

    // Sort categories with favorites first
    filtered.sort((a, b) => {
      const aFav = state.favorites.includes(a._id);
      const bFav = state.favorites.includes(b._id);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      return 0;
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
      const isFav = state.favorites.includes(cat._id);
      return `
        <div class="mye-resources-category-card" data-id="${cat._id}">
          <button class="mye-category-favorite-btn ${isFav ? 'is-fav' : ''}" data-id="${cat._id}" aria-label="Ajouter aux favoris">
            <span class="material-icons">${isFav ? 'star' : 'star_border'}</span>
          </button>
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

    // Attach click listeners to cards (ignoring clicks on the favorite buttons)
    container.querySelectorAll('.mye-resources-category-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.mye-category-favorite-btn')) return;

        const id = card.getAttribute('data-id');
        const targetUrl = `/portal/common/resources?category=${id}`;
        window.history.pushState({}, '', targetUrl);
        state.currentPath = targetUrl;
        renderContent();
      });
    });

    // Attach click listeners to favorite buttons
    container.querySelectorAll('.mye-category-favorite-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        toggleFavorite(id);
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

    const isFav = state.favorites.includes(category._id);
    const headerHTML = `
      <div class="mye-resources-header-card">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px; width: 100%;">
          <div class="mye-resources-header-badge">
            <span class="material-icons" style="font-size: 16px;">${getMaterialIcon(category.icon)}</span>
            <span>Catégorie</span>
          </div>
          <button class="mye-category-header-favorite-btn ${isFav ? 'is-fav' : ''}" data-id="${category._id}" aria-label="Ajouter aux favoris">
            <span class="material-icons">${isFav ? 'star' : 'star_border'}</span>
            <span>${isFav ? 'Favori' : 'Ajouter aux favoris'}</span>
          </button>
        </div>
        <h1 class="mye-resources-header-title" style="margin-top: 10px;">${category.title}</h1>
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
      setupFavoriteHeaderBtn(container, catId);

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
      setupFavoriteHeaderBtn(container, catId);
      return;
    }

    const groupsHTML = filteredGroups.map(group => {
      const itemsHTML = group.items.map(res => {
        const title = res.title || res.name || 'Document';
        const desc = res.description || res.desc || '';
        
        let url = '#';
        let typeClass = 'mye-res-file';
        let typeIcon = 'insert_drive_file';
        let buttonText = 'Télécharger';
        let isPdf = false;
        let isContent = false;
        let badgeText = 'Fichier';

        if (res.url || res.link) {
          url = res.url || res.link;
          typeClass = 'mye-res-link';
          typeIcon = 'open_in_new';
          buttonText = 'Accéder au lien';
          badgeText = 'Lien';
        } else if (res.file) {
          // File download path using resource ID
          url = `/api/rest/common/resources/${res._id}/file`;
          
          const isPdfType = res.file && (String(res.file.type || '').toLowerCase() === 'pdf' || String(res.file.name || '').toLowerCase().endsWith('.pdf'));
          const isPdfTitle = String(title).toLowerCase().includes('.pdf');
          
          if (isPdfType || isPdfTitle) {
            typeClass = 'mye-res-pdf';
            typeIcon = 'picture_as_pdf';
            buttonText = 'Consulter le PDF';
            isPdf = true;
            badgeText = 'PDF';
          } else {
            typeClass = 'mye-res-file';
            typeIcon = 'insert_drive_file';
            buttonText = 'Télécharger';
            badgeText = 'Fichier';
          }
        } else if (res._id) {
          // No file, no url/link -> Content / Video resource
          isContent = true;
          const isVideoSub = group.name && (group.name.toLowerCase().includes('vidéo') || group.name.toLowerCase().includes('video') || group.name.toLowerCase().includes('capsule'));
          const isVideoTitle = title.toLowerCase().includes('bref') || title.toLowerCase().includes('vidéo') || title.toLowerCase().includes('video');
          
          if (isVideoSub || isVideoTitle) {
            typeClass = 'mye-res-video';
            typeIcon = 'play_circle';
            buttonText = 'Voir la vidéo';
            badgeText = 'Vidéo';
          } else {
            typeClass = 'mye-res-content';
            typeIcon = 'article';
            buttonText = 'Consulter';
            badgeText = 'Contenu';
          }
        }

        const cleanUrl = url.startsWith('http') || url.startsWith('/') ? url : '/' + url;
        const hasAction = isContent || url !== '#';

        const actionBtnHTML = hasAction ? `
          <button class="mye-resource-row-action-btn mye-action-trigger" 
                  data-url="${cleanUrl}" 
                  data-title="${title}" 
                  data-pdf="${isPdf}"
                  data-content="${isContent}"
                  data-id="${res._id}">
            <span>${buttonText}</span>
            <span class="material-icons" style="font-size: 16px;">arrow_outward</span>
          </button>
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
              <span class="mye-resource-row-badge">${badgeText}</span>
              ${actionBtnHTML}
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="mye-resource-group">
          <div class="mye-resource-group-header mye-group-toggle-trigger">
            <h2 class="mye-resource-group-title">${group.name}</h2>
            <button class="mye-resource-group-toggle-btn" aria-label="Fermer la sous-catégorie">
              <span class="material-icons">keyboard_arrow_up</span>
            </button>
          </div>
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

    // Attach click listeners to collapse/expand sub-categories (groups)
    container.querySelectorAll('.mye-group-toggle-trigger').forEach(header => {
      header.addEventListener('click', (e) => {
        const groupEl = header.closest('.mye-resource-group');
        if (groupEl) {
          groupEl.classList.toggle('collapsed');
        }
      });
    });

    // Attach click listeners to download/open buttons to bypass Angular router interception
    container.querySelectorAll('.mye-action-trigger').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const isContent = btn.getAttribute('data-content') === 'true';
        const url = btn.getAttribute('data-url');
        const title = btn.getAttribute('data-title') || 'Document';

        if (isContent) {
          const resId = btn.getAttribute('data-id');
          openContentModal(resId, title);
        } else {
          const isPdf = btn.getAttribute('data-pdf') === 'true';
          if (isPdf && window.myePdfViewer) {
            window.myePdfViewer.open(url, title);
          } else {
            window.open(url, '_blank');
          }
        }
      });
    });

    document.getElementById('mye-resources-back-btn').addEventListener('click', goBack);
    setupFavoriteHeaderBtn(container, catId);
  }

  function getOrCreateModal() {
    let overlay = document.getElementById('mye-resource-modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'mye-resource-modal-overlay';
      overlay.className = 'mye-resource-modal-overlay';
      overlay.innerHTML = `
        <div class="mye-resource-modal">
          <div class="mye-resource-modal-header">
            <h3 class="mye-resource-modal-title" id="mye-resource-modal-title">Détails</h3>
            <button class="mye-resource-modal-close-btn" id="mye-resource-modal-close">
              <span class="material-icons">close</span>
            </button>
          </div>
          <div class="mye-resource-modal-body" id="mye-resource-modal-body">
            <!-- Content injected here -->
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      // Attach close listeners
      const closeBtn = overlay.querySelector('#mye-resource-modal-close');
      closeBtn.addEventListener('click', closeModal);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
      });
    }
    return overlay;
  }

  function closeModal() {
    const overlay = document.getElementById('mye-resource-modal-overlay');
    if (overlay) {
      overlay.classList.remove('show');
      // Clear iframe / videos to stop playback when closing
      setTimeout(() => {
        const body = document.getElementById('mye-resource-modal-body');
        if (body) body.innerHTML = '';
      }, 300);
    }
  }

  async function openContentModal(resOrId, title) {
    const overlay = getOrCreateModal();
    const titleEl = document.getElementById('mye-resource-modal-title');
    const bodyEl = document.getElementById('mye-resource-modal-body');

    overlay.classList.add('show');

    if (typeof resOrId === 'object' && resOrId !== null) {
      const data = resOrId;
      titleEl.textContent = title || data.title || 'Détails';
      let contentHtml = data.content || '<p style="color:#64748b; text-align:center;">Aucun contenu supplémentaire disponible.</p>';
      bodyEl.innerHTML = `
        <div class="mye-resource-content-wrapper">
          ${contentHtml}
        </div>
      `;
      setupModalLinks(bodyEl);
      return;
    }

    const resId = resOrId;
    titleEl.textContent = title || 'Chargement...';
    bodyEl.innerHTML = `
      <div style="display:flex; justify-content:center; align-items:center; min-height:200px; flex-direction:column; gap:16px;">
        <div class="mye-grades-spinner"></div>
        <div style="color:var(--mye-primary-color); font-weight:600;">Chargement du contenu...</div>
      </div>
    `;

    try {
      const response = await fetch(`/api/rest/common/resources/${resId}`, { credentials: 'include' });
      if (!response.ok) throw new Error('API Error');
      const data = await response.json();
      titleEl.textContent = title || data.title || 'Détails';

      let contentHtml = data.content || '<p style="color:#64748b; text-align:center;">Aucun contenu supplémentaire disponible.</p>';
      
      bodyEl.innerHTML = `
        <div class="mye-resource-content-wrapper">
          ${contentHtml}
        </div>
      `;

      setupModalLinks(bodyEl);
    } catch (err) {
      console.error(err);
      bodyEl.innerHTML = `
        <div style="text-align:center; padding:40px 20px;">
          <span class="material-icons" style="font-size: 48px; color: #ef4444; margin-bottom: 16px;">error_outline</span>
          <h4 style="margin: 0 0 8px 0; color: #ef4444; font-size: 16px;">Erreur de chargement</h4>
          <p style="color: #64748b; margin: 0; font-size: 14px;">Impossible de récupérer les détails de cette ressource.</p>
        </div>
      `;
    }
  }

  function setupModalLinks(bodyEl) {
    // Intercept local links inside modal content to route dynamically within the extension
    bodyEl.querySelectorAll('a').forEach(link => {
      const href = link.getAttribute('href');
      if (href && (href.includes('/portal/common/resources') || href.startsWith('/portal/common/resources') || href.startsWith('/portal/student/home') || href.includes('/portal/student/home'))) {
        link.removeAttribute('target'); // Force opening in the same window/frame
        link.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          closeModal();
          
          let newCatId = null;
          try {
            const urlObj = new URL(href, window.location.origin);
            newCatId = urlObj.searchParams.get('category') || urlObj.searchParams.get('id');
            if (!newCatId) {
              const match = urlObj.pathname.match(/\/portal\/common\/resources\/(?:categories\/)?([a-fA-F0-9]{24})/);
              if (match) newCatId = match[1];
            }
          } catch (err) {
            const match = href.match(/\/portal\/common\/resources\/(?:categories\/)?([a-fA-F0-9]{24})/);
            if (match) newCatId = match[1];
          }

          if (newCatId) {
            const targetUrl = `/portal/common/resources?category=${newCatId}`;
            window.history.pushState({}, '', targetUrl);
            state.currentPath = targetUrl;
            renderContent();
          } else {
            // Extract relative link if it's the resources home
            if (href.includes('/portal/common/resources')) {
              window.history.pushState({}, '', '/portal/common/resources');
              state.currentPath = '/portal/common/resources';
              renderContent();
            } else {
              // Fallback direct navigation
              window.location.href = href;
            }
          }
        });
      }
    });
  }

  function goBack() {
    window.history.pushState({}, '', '/portal/common/resources');
    state.currentPath = '/portal/common/resources';
    renderContent();
  }

  // Handle browser popstate events (when clicking back/forward button in browser)
  window.addEventListener('popstate', () => {
    closeModal();
    if (isResourcesPage()) {
      state.currentPath = window.location.pathname;
      renderContent();
    }
  });

})();
