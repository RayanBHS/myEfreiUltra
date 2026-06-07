// =============================================
//  MYEFREI ULTRA — Module Contacts (contacts.js)
// =============================================

(function () {
  'use strict';

  console.log('📞 MyEfrei ULTRA — Module Contacts (Chargé)');

  const API_CONTACTS = '/api/rest/student/contacts';

  let state = {
    allCategories: [], // raw contacts categories list
    search: '',
    selectedCategory: 'Tous', // 'Tous' or specific category name
    currentPath: window.location.pathname
  };

  let photoCache = {};

  function isContactsPage() {
    return window.location.pathname.startsWith('/portal/student/contacts');
  }

  function waitAndInit() {
    document.body.classList.add('mye-clean-screen');

    const checkHeader = setInterval(() => {
      if (document.getElementById('mye-custom-header-wrapper') || document.getElementById('mye-custom-header')) {
        clearInterval(checkHeader);
        if (!document.getElementById('mye-contacts-container')) {
          setTimeout(init, 200);
        }
      }
    }, 200);

    setTimeout(() => {
      clearInterval(checkHeader);
      if (!document.getElementById('mye-contacts-container')) {
        init();
      }
    }, 5000);
  }

  // Initial load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (isContactsPage()) waitAndInit();
    });
  } else {
    if (isContactsPage()) waitAndInit();
  }

  // SPA Route Monitoring
  let lastUrl = window.location.href;
  setInterval(() => {
    if (lastUrl !== window.location.href) {
      lastUrl = window.location.href;

      if (isContactsPage()) {
        if (!document.getElementById('mye-contacts-container')) {
          waitAndInit();
        } else {
          // Reset state
          state.currentPath = window.location.pathname;
          state.search = '';
          state.selectedCategory = 'Tous';
          const searchInput = document.querySelector('.mye-contacts-search-input');
          if (searchInput) searchInput.value = '';
          
          document.body.classList.add('mye-clean-screen');
          renderContent();
        }
      } else {
        // Cleanup when navigating away
        const container = document.getElementById('mye-contacts-container');
        if (container) container.remove();
        const overlay = document.getElementById('mye-contact-modal-overlay');
        if (overlay) overlay.remove();
      }
    }
  }, 300);

  // ──────────────────────────────────────────────
  // INITIALISATION
  // ──────────────────────────────────────────────
  function init() {
    if (document.getElementById('mye-contacts-container')) return;

    console.log('📞 Initialisation de la page Contacts…');
    document.body.classList.add('mye-clean-screen');

    // Build main wrapper layout
    const container = document.createElement('div');
    container.id = 'mye-contacts-container';
    container.className = 'mye-page-container';

    container.innerHTML = `
      <div class="mye-contacts-left">
        <div class="mye-contacts-search-box">
          <div class="mye-contacts-search-title">Recherche</div>
          <div class="mye-contacts-search-input-wrapper">
            <span class="mye-contacts-search-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </span>
            <input type="text" class="mye-contacts-search-input" placeholder="Nom, service, mot-clé...">
          </div>
        </div>
        <div class="mye-contacts-nav-menu" id="mye-contacts-sidebar-nav">
          <div class="mye-contacts-nav-title">Services</div>
          <!-- Populated dynamically -->
        </div>
      </div>
      <div class="mye-contacts-right" id="mye-contacts-content-area">
        <div class="mye-contacts-loading-container">
          <div class="mye-grades-spinner"></div>
          <div style="color:var(--mye-primary-color); font-weight:600; margin-top: 15px;">Chargement des contacts Efrei...</div>
        </div>
      </div>
    `;

    document.body.appendChild(container);
    state.currentPath = window.location.pathname;

    // Attach search input listener
    const searchInput = container.querySelector('.mye-contacts-search-input');
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
      const response = await fetch(API_CONTACTS, { credentials: 'include' });
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      
      const data = await response.json();
      state.allCategories = Array.isArray(data) ? data : [];

      // Sort categories: "Contacts principaux" always first, then alphabetical
      state.allCategories.sort((a, b) => {
        if (a.isMainContact && !b.isMainContact) return -1;
        if (!a.isMainContact && b.isMainContact) return 1;
        return (a.title || '').localeCompare(b.title || '', 'fr');
      });

      renderSidebar();
      renderContent();
    } catch (e) {
      console.error('📞 Erreur chargement contacts:', e);
      const contentArea = document.getElementById('mye-contacts-content-area');
      if (contentArea) {
        contentArea.innerHTML = `
          <div class="mye-contacts-empty">
            <div class="mye-contacts-empty-icon">⚠️</div>
            <div class="mye-contacts-empty-title">Erreur de connexion</div>
            <div class="mye-contacts-empty-desc">Impossible de récupérer les contacts. Vérifiez votre connexion.</div>
          </div>
        `;
      }
    }
  }

  // Compute initials for staff avatars
  function getInitials(name) {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  // Render left sidebar category list
  function renderSidebar() {
    const sidebar = document.getElementById('mye-contacts-sidebar-nav');
    if (!sidebar) return;

    sidebar.innerHTML = '<div class="mye-contacts-nav-title">Thématiques</div>';

    // "Tous les contacts" item
    const allItem = document.createElement('button');
    allItem.className = `mye-contacts-nav-item ${state.selectedCategory === 'Tous' ? 'active' : ''}`;
    allItem.innerHTML = `
      <span class="mye-contacts-nav-item-icon material-icons">groups</span>
      <span>Tous</span>
    `;
    allItem.addEventListener('click', () => {
      state.selectedCategory = 'Tous';
      updateActiveNavItem();
      renderContent();
    });
    sidebar.appendChild(allItem);

    // List of category navigation links
    state.allCategories.forEach(cat => {
      if (!cat.title) return;
      const item = document.createElement('button');
      item.className = `mye-contacts-nav-item ${state.selectedCategory === cat.title ? 'active' : ''}`;
      item.setAttribute('data-category', cat.title);

      const icon = cat.isMainContact ? 'star' : 'contact_mail';

      item.innerHTML = `
        <span class="mye-contacts-nav-item-icon material-icons" style="${cat.isMainContact ? 'color: #facc15;' : ''}">${icon}</span>
        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${cat.title}</span>
      `;

      item.addEventListener('click', () => {
        state.selectedCategory = cat.title;
        updateActiveNavItem();
        renderContent();
      });
      sidebar.appendChild(item);
    });
  }

  function updateActiveNavItem() {
    document.querySelectorAll('.mye-contacts-nav-item').forEach(item => {
      const catName = item.getAttribute('data-category');
      if ((state.selectedCategory === 'Tous' && !catName) || (catName && catName === state.selectedCategory)) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  // Render main content area
  function renderContent() {
    const contentArea = document.getElementById('mye-contacts-content-area');
    if (!contentArea) return;

    const headerHTML = `
      <div class="mye-contacts-header-card">
        <div class="mye-contacts-header-badge">
          <span class="material-icons" style="font-size: 16px;">contact_phone</span>
          <span>Portail Efrei</span>
        </div>
        <h1 class="mye-contacts-header-title">Annuaire des contacts</h1>
        <p class="mye-contacts-header-desc">Retrouvez les adresses e-mails, les numéros de téléphone, les liens utiles et les raccourcis de contact Teams de vos différents interlocuteurs pédagogiques et administratifs.</p>
      </div>
    `;

    // Filter categories and contacts based on category selection and search query
    const filteredCategories = state.allCategories.map(cat => {
      // 1. Check if category matches selected category filter
      if (state.selectedCategory !== 'Tous' && cat.title !== state.selectedCategory) {
        return null;
      }

      // 2. Filter contacts within this category based on search query
      const query = state.search;
      const contacts = (cat.contacts || []).filter(contact => {
        if (!query) return true;

        const nameMatch = (contact.title || '').toLowerCase().includes(query);
        const jobMatch = (contact.jobTitle || '').toLowerCase().includes(query);
        const emailMatch = (contact.email || '').toLowerCase().includes(query);
        const keywordsMatch = (cat.keywords || []).some(k => k.toLowerCase().includes(query));
        const categoryMatch = (cat.title || '').toLowerCase().includes(query);

        return nameMatch || jobMatch || emailMatch || keywordsMatch || categoryMatch;
      });

      // 3. Return category if it has matches
      if (contacts.length > 0) {
        return { ...cat, contacts };
      }
      return null;
    }).filter(Boolean);

    if (filteredCategories.length === 0) {
      contentArea.innerHTML = `
        ${headerHTML}
        <div class="mye-contacts-empty">
          <div class="mye-contacts-empty-icon">🔍</div>
          <div class="mye-contacts-empty-title">Aucun contact trouvé</div>
          <div class="mye-contacts-empty-desc">Aucun service ou membre du personnel ne correspond à votre recherche "${state.search}".</div>
        </div>
      `;
      return;
    }

    // Render category blocks
    const groupsHTML = filteredCategories.map(cat => {
      const contactsHTML = cat.contacts.map(contact => {
        const isStaff = contact.type === 'staff';
        const initials = getInitials(contact.title);
        
        let avatarHTML = '';
        if (isStaff) {
          if (contact.azureId) {
            avatarHTML = `
              <div class="mye-contact-avatar mye-contact-photo-container" data-azure-id="${contact.azureId}" style="overflow: hidden; padding: 0;">
                <img alt="${contact.title}" class="mye-contact-avatar-img" style="display: none;">
                <div class="mye-contact-avatar-fallback" style="display: flex; width: 100%; height: 100%; align-items: center; justify-content: center; border-radius: inherit;">${initials}</div>
              </div>
            `;
          } else {
            avatarHTML = `<div class="mye-contact-avatar">${initials}</div>`;
          }
        } else {
          // Compute a suitable icon for services/external links
          let icon = 'public'; // default link
          if (contact.email) icon = 'alternate_email';
          if (contact.phone) icon = 'phone';
          if (contact.title.toLowerCase().includes('formulaire') || contact.title.toLowerCase().includes('support')) {
            icon = 'contact_support';
          }
          avatarHTML = `<div class="mye-contact-avatar service-avatar"><span class="material-icons">${icon}</span></div>`;
        }

        const actionsHTML = `
          <div class="mye-contact-right">
            <button class="mye-contact-link-btn mye-contact-open-modal-trigger" data-category-title="${cat.title.replace(/"/g, '&quot;')}" data-contact-title="${contact.title.replace(/"/g, '&quot;')}">
              <span>Accéder</span>
              <span class="material-icons" style="font-size: 16px;">open_in_new</span>
            </button>
          </div>
        `;

        const subTitle = contact.jobTitle || (isStaff ? 'Membre Efrei' : 'Service de l\'école');

        return `
          <div class="mye-contact-card">
            <div class="mye-contact-left">
              ${avatarHTML}
              <div class="mye-contact-info">
                <h4 class="mye-contact-name">${contact.title}</h4>
                <span class="mye-contact-job">${subTitle}</span>
              </div>
            </div>
            ${actionsHTML}
          </div>
        `;
      }).join('');

      return `
        <div class="mye-contacts-group">
          <div class="mye-contacts-group-header mye-group-toggle-trigger">
            <h3 class="mye-contacts-group-title">${cat.title}</h3>
            <button class="mye-contacts-group-toggle-btn" aria-label="Fermer la catégorie">
              <span class="material-icons">keyboard_arrow_up</span>
            </button>
          </div>
          <div class="mye-contacts-grid">
            ${contactsHTML}
          </div>
        </div>
      `;
    }).join('');

    contentArea.innerHTML = `
      ${headerHTML}
      ${groupsHTML}
    `;

    // Attach click listeners to collapse/expand categories
    contentArea.querySelectorAll('.mye-group-toggle-trigger').forEach(header => {
      header.addEventListener('click', (e) => {
        const groupEl = header.closest('.mye-contacts-group');
        if (groupEl) {
          groupEl.classList.toggle('collapsed');
        }
      });
    });

    // Attach click listeners to contact modal triggers
    contentArea.querySelectorAll('.mye-contact-open-modal-trigger').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const catTitle = btn.getAttribute('data-category-title');
        const contactTitle = btn.getAttribute('data-contact-title');
        openContactModal(catTitle, contactTitle);
      });
    });

    // Trigger lazy loading of contact photos
    contentArea.querySelectorAll('.mye-contact-photo-container').forEach(container => {
      const azureId = container.getAttribute('data-azure-id');
      const img = container.querySelector('.mye-contact-avatar-img');
      const fallback = container.querySelector('.mye-contact-avatar-fallback');
      loadContactPhoto(azureId, img, fallback);
    });
  }

  // ──────────────────────────────────────────────
  // GESTION DU MODAL DE CONTACT
  // ──────────────────────────────────────────────
  function getOrCreateModal() {
    let modalOverlay = document.getElementById('mye-contact-modal-overlay');
    if (!modalOverlay) {
      modalOverlay = document.createElement('div');
      modalOverlay.id = 'mye-contact-modal-overlay';
      modalOverlay.className = 'mye-contact-modal-overlay';
      const container = document.getElementById('mye-contacts-container');
      if (container) {
        container.appendChild(modalOverlay);
      } else {
        document.body.appendChild(modalOverlay);
      }
    }
    return modalOverlay;
  }

  function openContactModal(catTitle, contactTitle) {
    const category = state.allCategories.find(c => c.title === catTitle);
    if (!category) return;
    const contact = category.contacts.find(c => c.title === contactTitle);
    if (!contact) return;

    const isStaff = contact.type === 'staff';
    const initials = getInitials(contact.title);

    let avatarHTML = '';
    if (isStaff) {
      if (contact.azureId) {
        avatarHTML = `
          <div class="mye-contact-modal-avatar mye-contact-photo-container" data-azure-id="${contact.azureId}" style="overflow: hidden; padding: 0;">
            <img alt="${contact.title}" class="mye-contact-avatar-img" style="display: none;">
            <div class="mye-contact-avatar-fallback" style="display: flex; width: 100%; height: 100%; align-items: center; justify-content: center; border-radius: inherit;">${initials}</div>
          </div>
        `;
      } else {
        avatarHTML = `<div class="mye-contact-modal-avatar">${initials}</div>`;
      }
    } else {
      let icon = 'public';
      if (contact.email) icon = 'alternate_email';
      if (contact.phone) icon = 'phone';
      if (contact.title.toLowerCase().includes('formulaire') || contact.title.toLowerCase().includes('support')) {
        icon = 'contact_support';
      }
      avatarHTML = `<div class="mye-contact-modal-avatar service-avatar"><span class="material-icons">${icon}</span></div>`;
    }

    const subTitle = contact.jobTitle || (isStaff ? 'Membre Efrei' : 'Service de l\'école');

    // Build the option rows
    let optionsHTML = '';

    if (contact.link) {
      optionsHTML += `
        <a href="${contact.link}" target="_blank" class="mye-contact-option-row mye-modal-action-trigger">
          <div class="mye-contact-option-icon-wrapper">
            <span class="material-icons">open_in_new</span>
          </div>
          <div class="mye-contact-option-info">
            <span class="mye-contact-option-label">Lien externe</span>
            <span class="mye-contact-option-value">${contact.link}</span>
          </div>
          <span class="mye-contact-option-arrow material-icons">chevron_right</span>
        </a>
      `;
    }

    if (contact.email) {
      optionsHTML += `
        <a href="mailto:${contact.email}" class="mye-contact-option-row mye-modal-action-trigger">
          <div class="mye-contact-option-icon-wrapper">
            <span class="material-icons">alternate_email</span>
          </div>
          <div class="mye-contact-option-info">
            <span class="mye-contact-option-label">E-mail</span>
            <span class="mye-contact-option-value">${contact.email}</span>
          </div>
          <span class="mye-contact-option-arrow material-icons">chevron_right</span>
        </a>
      `;

      if (isStaff) {
        // Teams chat deep link
        optionsHTML += `
          <a href="https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(contact.email)}" target="_blank" class="mye-contact-option-row mye-modal-action-trigger">
            <div class="mye-contact-option-icon-wrapper teams-icon">
              <span class="material-icons">chat</span>
            </div>
            <div class="mye-contact-option-info">
              <span class="mye-contact-option-label">Microsoft Teams</span>
              <span class="mye-contact-option-value">Lancer une conversation</span>
            </div>
            <span class="mye-contact-option-arrow material-icons">chevron_right</span>
          </a>
        `;
      }
    }

    if (contact.phone) {
      optionsHTML += `
        <a href="tel:${contact.phone}" class="mye-contact-option-row mye-modal-action-trigger">
          <div class="mye-contact-option-icon-wrapper">
            <span class="material-icons">phone</span>
          </div>
          <div class="mye-contact-option-info">
            <span class="mye-contact-option-label">Téléphone</span>
            <span class="mye-contact-option-value">${contact.phone}</span>
          </div>
          <span class="mye-contact-option-arrow material-icons">chevron_right</span>
        </a>
      `;
    }

    if (!optionsHTML) {
      optionsHTML = `
        <div style="text-align: center; padding: 20px; color: #64748b;">
          Aucune option de contact ou de redirection disponible pour ce contact.
        </div>
      `;
    }

    const overlay = getOrCreateModal();
    overlay.innerHTML = `
      <div class="mye-contact-modal">
        <div class="mye-contact-modal-header">
          ${avatarHTML}
          <div class="mye-contact-meta">
            <h3 class="mye-contact-modal-name">${contact.title}</h3>
            <span class="mye-contact-modal-job">${subTitle}</span>
          </div>
          <button class="mye-contact-modal-close-btn" id="mye-contact-modal-close">
            <span class="material-icons">close</span>
          </button>
        </div>
        <div class="mye-contact-modal-body">
          ${optionsHTML}
        </div>
      </div>
    `;

    // Show modal
    setTimeout(() => {
      overlay.classList.add('show');
    }, 10);

    // Close handlers
    const closeBtn = overlay.querySelector('#mye-contact-modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeModal);
    }

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal();
      }
    });

    // Action rows triggers (close modal after clicking)
    overlay.querySelectorAll('.mye-modal-action-trigger').forEach(row => {
      row.addEventListener('click', () => {
        setTimeout(closeModal, 100);
      });
    });

    // Trigger modal avatar photo loading
    const modalAvatarContainer = overlay.querySelector('.mye-contact-photo-container');
    if (modalAvatarContainer) {
      const img = modalAvatarContainer.querySelector('.mye-contact-avatar-img');
      const fallback = modalAvatarContainer.querySelector('.mye-contact-avatar-fallback');
      loadContactPhoto(contact.azureId, img, fallback);
    }
  }

  function closeModal() {
    const overlay = document.getElementById('mye-contact-modal-overlay');
    if (overlay) {
      overlay.classList.remove('show');
      setTimeout(() => {
        if (!overlay.classList.contains('show')) {
          overlay.innerHTML = '';
        }
      }, 300);
    }
  }

  async function loadContactPhoto(azureId, imgElement, fallbackElement) {
    if (!azureId) return;

    // Check cache
    if (photoCache[azureId]) {
      if (photoCache[azureId] === 'FAILED') {
        imgElement.style.display = 'none';
        fallbackElement.style.display = 'flex';
      } else {
        imgElement.src = photoCache[azureId];
        imgElement.style.display = 'block';
        fallbackElement.style.display = 'none';
      }
      return;
    }

    // List of candidate endpoints to probe
    const candidateUrls = [
      `/api/rest/student/contacts/picture/${azureId}`,
      `/api/rest/student/contacts/${azureId}/picture`,
      `/api/rest/student/profile/picture/${azureId}`,
      `/api/rest/student/contacts/profile/picture/${azureId}`,
      `/api/rest/student/contacts/photo/${azureId}`,
      `/api/rest/student/contacts/images/${azureId}`,
      `/api/rest/student/contacts/avatar/${azureId}`,
      `/api/rest/common/contacts/picture/${azureId}`,
      `/api/rest/common/profile/picture/${azureId}`,
      `/api/rest/common/contacts/avatar/${azureId}`
    ];

    console.log(`[MyEfrei ULTRA] Probing photo endpoints for azureId: ${azureId}`);

    for (const url of candidateUrls) {
      try {
        console.log(`[MyEfrei ULTRA] Fetching candidate: ${url}`);
        const response = await fetch(url, { credentials: 'include' });
        console.log(`[MyEfrei ULTRA] Candidate response status: ${response.status} for URL: ${url}`);
        
        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          
          if (contentType.startsWith('image/')) {
            // Binary response: convert blob to Data URL
            const blob = await response.blob();
            const dataUrl = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
            
            photoCache[azureId] = dataUrl;
            imgElement.src = dataUrl;
            imgElement.style.display = 'block';
            fallbackElement.style.display = 'none';
            console.log(`[MyEfrei ULTRA] Photo successfully loaded as binary blob from ${url}`);
            return;
          } else {
            // Text response: check if it's base64 or dataURI
            const text = await response.text();
            if (text && text.length > 50 && !text.trim().startsWith('<')) {
              const src = text.startsWith('data:') ? text : `data:image/jpeg;base64,${text}`;
              photoCache[azureId] = src;
              imgElement.src = src;
              imgElement.style.display = 'block';
              fallbackElement.style.display = 'none';
              console.log(`[MyEfrei ULTRA] Photo successfully loaded as base64 text from ${url}`);
              return;
            }
          }
        }
      } catch (e) {
        console.warn(`[MyEfrei ULTRA] Failed to fetch photo from candidate URL: ${url}`, e);
      }
    }

    // If all candidates fail
    photoCache[azureId] = 'FAILED';
    imgElement.style.display = 'none';
    fallbackElement.style.display = 'flex';
    console.warn(`[MyEfrei ULTRA] All photo candidate endpoints failed for azureId: ${azureId}`);
  }

})();
