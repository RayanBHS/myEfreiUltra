// =============================================
//  MYEFREI ULTRA - Nos Campus (campus.js) - V2 (Clean Rewrite)
// =============================================

(function () {
  'use strict';

  if (window.mye_user_enabled_flag === false || localStorage.getItem('mye_user_enabled') === 'false') {
    return;
  }

  console.log('🌍 MyEfrei ULTRA — Module Campus V2 (Chargé)');

  const campuses = {
    paris: [
      {
        id: 'maison',
        site: 'Site La maison',
        bat: 'Bat. A à F',
        address: '30-32 Av. de la République, 94800 Villejuif',
        coords: [48.7887147, 2.3637183],
        hours: "Lundi au vendredi : 7h30 à 20h (18h pour l'accueil)",
        contact: [
          'Accueil : <a href="tel:+33188289000">+33 188 289 000</a>',
          '<a href="mailto:accueil@efrei.fr">accueil@efrei.fr</a>',
          'Gardien : <a href="tel:+33626096241">+33 626 096 241</a>'
        ],
        plan: true
      },
      {
        id: 'factory',
        site: 'Site La Factory',
        bat: 'Bat. H',
        address: '147 Bd Maxime Gorki, 94800 Villejuif',
        coords: [48.7892711, 2.3685598],
        hours: "Lundi au vendredi : 7h30 à 20h (18h pour l'accueil)",
        contact: [
          'Accueil : <a href="tel:+33188289000">+33 188 289 000</a>',
          '<a href="mailto:accueil@efrei.fr">accueil@efrei.fr</a>',
          'Gardien : <a href="tel:+33626096241">+33 626 096 241</a>'
        ],
        plan: false
      },
      {
        id: 'aquarium',
        site: "Site L'aquarium",
        bat: 'Bat. K',
        address: '136 bis Bd Maxime Gorki, 94800 Villejuif',
        coords: [48.7899274, 2.3685979],
        hours: "Lundi au vendredi : 7h30 à 20h (16h30 pour l'accueil)",
        contact: [
          'Accueil : <a href="tel:+33188289000">+33 188 289 000</a>',
          '<a href="mailto:accueil@efrei.fr">accueil@efrei.fr</a>',
          'Gardien : <a href="tel:+33188289311">+33 188 289 311</a>'
        ],
        plan: true
      },
      {
        id: 'newrepublic',
        site: 'Site New Republic',
        bat: 'Bat. N',
        address: '33 Av. de la République, 94800 Villejuif',
        coords: [48.7884430, 2.3629770],
        hours: 'Lundi au vendredi : 6h30 à 21h30',
        contact: [
          '<a href="mailto:accueil@efrei.fr">accueil@efrei.fr</a>'
        ],
        plan: false
      }
    ],
    bordeaux: [
      {
        id: 'bdx',
        site: 'Site Bordeaux',
        bat: 'Bat. BDX',
        address: '83 rue Lucien Faure, 33000 Bordeaux',
        coords: [44.8657363, -0.5595686],
        hours: 'Lundi au vendredi : 7h30 à 21h',
        contact: [
          '<a href="mailto:accueil-bordeaux@efrei.fr">accueil-bordeaux@efrei.fr</a>'
        ],
        plan: false
      }
    ]
  };

  let activeCity = 'paris';
  let activeMap = null;

  // Configuration for Leaflet marker images in Chrome extension
  function setupLeafletIconPath() {
    if (typeof L !== 'undefined' && chrome && chrome.runtime) {
      L.Icon.Default.imagePath = chrome.runtime.getURL('lib/leaflet/images/');
    }
  }

  function injectLeafletMap(containerId, coords) {
    if (activeMap) {
      activeMap.remove();
      activeMap = null;
    }

    const mapWrapper = document.getElementById(containerId);
    if (!mapWrapper) return;

    mapWrapper.innerHTML = '<div id="leaflet-map-instance" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 40px; z-index: 1;"></div>';

    setTimeout(() => {
      activeMap = L.map('leaflet-map-instance').setView(coords, 17);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(activeMap);
      
      L.marker(coords).addTo(activeMap);
    }, 50);
  }

  function isCampusPage() {
    return window.location.pathname.startsWith('/portal/student/campus');
  }

  function initCampusPage() {
    if (document.getElementById('mye-campus-container')) {
      document.getElementById('mye-campus-container').style.display = 'block';
      return;
    }

    const container = document.createElement('div');
    container.id = 'mye-campus-container';
    container.className = 'mye-page-container';

    const inner = document.createElement('div');
    inner.className = 'mye-campus-inner';

    // Tabs
    const tabsWrapper = document.createElement('div');
    tabsWrapper.className = 'mye-campus-tabs-wrapper';

    const tabsContainer = document.createElement('div');
    tabsContainer.className = 'mye-campus-tabs';
    
    ['paris', 'bordeaux'].forEach(city => {
      const tab = document.createElement('button');
      tab.className = `mye-campus-tab ${activeCity === city ? 'active' : 'inactive'}`;
      tab.textContent = city === 'paris' ? 'Paris, la ville des Lumières' : 'Bordeaux, la ville des cannelés';
      tab.setAttribute('data-city', city);
      tab.addEventListener('click', () => {
        const tabs = container.querySelectorAll('.mye-campus-tab');
        tabs.forEach(t => {
          t.classList.remove('active');
          t.classList.add('inactive');
        });
        tab.classList.remove('inactive');
        tab.classList.add('active');
        activeCity = city;
        renderCityContent();
      });
      tabsContainer.appendChild(tab);
    });

    tabsWrapper.appendChild(tabsContainer);
    inner.appendChild(tabsWrapper);

    // Content Wrapper
    const content = document.createElement('div');
    content.className = 'mye-campus-content';
    content.innerHTML = `
      <div class="mye-campus-map-wrapper" id="mye-campus-map-wrapper">
        <!-- Leaflet injected here -->
      </div>
      <div class="mye-campus-list" id="mye-campus-list">
        <!-- Accordions injected here -->
      </div>
    `;
    inner.appendChild(content);
    container.appendChild(inner);
    document.body.appendChild(container);

    // Event listeners for tabs
    const tabs = container.querySelectorAll('.mye-campus-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        tabs.forEach(t => {
          t.classList.remove('active');
          t.classList.add('inactive');
        });
        e.target.classList.remove('inactive');
        e.target.classList.add('active');
        
        activeCity = e.target.getAttribute('data-city');
        renderCityContent();
      });
    });

    renderCityContent();
  }

  function renderCityContent() {
    const list = document.getElementById('mye-campus-list');
    const mapWrapper = document.getElementById('mye-campus-map-wrapper');
    if (!list || !mapWrapper) return;

    list.innerHTML = '';
    const cityData = campuses[activeCity];

    cityData.forEach((campus, index) => {
      const isFirst = index === 0;
      
      const acc = document.createElement('div');
      acc.className = 'mye-campus-accordion' + (isFirst ? ' open' : '');
      
      const contactHtml = campus.contact.map(c => `<p>${c}</p>`).join('');
      const planHtml = campus.plan ? `<button type="button" class="mye-campus-plan-btn mye-campus-trigger-download" data-campus="${campus.id}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 15v3H6v-3H4v3c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-3h-2zm-1-4-1.41-1.41L13 12.17V4h-2v8.17L8.41 9.59 7 11l5 5 5-5z"></path></svg> PLAN DU SITE</button>` : '';

      acc.innerHTML = `
        <div class="mye-campus-accordion-header">
          <h3 class="mye-campus-accordion-title">${campus.site} <span>${campus.bat}</span></h3>
          <div class="mye-campus-accordion-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"></path></svg>
          </div>
        </div>
        <div class="mye-campus-accordion-body" style="${isFirst ? 'max-height: 500px;' : 'max-height: 0;'}">
          <div class="mye-campus-accordion-content">
            <div class="mye-campus-col">
              <h4>Adresse</h4>
              <p>${campus.address}</p>
              <br/>
              <h4>Horaires</h4>
              <p>${campus.hours}</p>
            </div>
            <div class="mye-campus-col" style="text-align: right;">
              <h4>Contact de l'accueil</h4>
              ${contactHtml}
              ${planHtml}
            </div>
          </div>
        </div>
      `;

      // Click to open logic
      const header = acc.querySelector('.mye-campus-accordion-header');
      header.addEventListener('click', () => {
        const body = acc.querySelector('.mye-campus-accordion-body');
        
        // Close if already open
        if (acc.classList.contains('open')) {
          acc.classList.remove('open');
          body.style.maxHeight = '0';
        } else {
          // Close all others
          const allAccs = document.querySelectorAll('.mye-campus-accordion');
          allAccs.forEach(a => {
            a.classList.remove('open');
            a.querySelector('.mye-campus-accordion-body').style.maxHeight = '0';
          });
          
          acc.classList.add('open');
          body.style.maxHeight = body.scrollHeight + 'px';
          
          // Inject Map
          injectLeafletMap('mye-campus-map-wrapper', campus.coords);
        }
      });

      // Bind download button to open in PDF Viewer
      // Bind download button to original DOM
      const dlBtn = acc.querySelector('.mye-campus-trigger-download');
      if (dlBtn) {
        dlBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const origBtns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent && b.textContent.includes('PLAN DU SITE'));
          if (origBtns.length > 0) {
            const campusId = dlBtn.getAttribute('data-campus');
            let targetBtn = origBtns[0]; // Par défaut, le premier (La maison)
            
            if (campusId === 'aquarium' && origBtns.length > 1) {
              targetBtn = origBtns[1]; // Le deuxième (L'aquarium)
            }
            
            targetBtn.click();
          } else {
            console.error('MyEfrei Ultra: Impossible de trouver le bouton de téléchargement original.');
          }
        });
      }

      list.appendChild(acc);

      if (isFirst) {
        injectLeafletMap('mye-campus-map-wrapper', campus.coords);
      }
    });
  }

  // Monitor SPA routing
  let lastUrl = window.location.href;
  setInterval(() => {
    if (lastUrl !== window.location.href) {
      lastUrl = window.location.href;
      if (isCampusPage()) {
        document.body.classList.add('mye-clean-screen');
        initCampusPage();
      } else {
        const container = document.getElementById('mye-campus-container');
        if (container) container.remove();
      }
    }
  }, 300);

  // Initial load
  if (isCampusPage()) {
    document.addEventListener('DOMContentLoaded', () => {
      setupLeafletIconPath();
      document.body.classList.add('mye-clean-screen');
      setTimeout(initCampusPage, 200);
    });
    // Fallback if already loaded
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setupLeafletIconPath();
      document.body.classList.add('mye-clean-screen');
      initCampusPage();
    }
  }

})();
