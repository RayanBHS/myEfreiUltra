// =============================================
//  MYEFREI ULTRA — News Page (news.js)
// =============================================

(function () {
  'use strict';

  let currentPage = 0;
  let isLoading = false;
  let hasMore = true;
  let allKnownTags = new Set();
  let currentFilter = 'TOUTES';

  // Intersection Observer for scroll animation (fade-in)
  const animationObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('mye-news-card-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  // Intersection Observer for infinite scrolling
  const infiniteScrollObserver = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !isLoading && hasMore) {
      fetchNextPage();
    }
  }, { rootMargin: '200px' });

  async function fetchNextPage() {
    if (isLoading || !hasMore) return;
    isLoading = true;
    showSpinner();

    try {
      const res = await fetch(`/api/rest/common/news?page=${currentPage}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch news');
      const data = await res.json();
      
      let items = [];
      if (Array.isArray(data)) {
        items = data;
        if (items.length === 0) hasMore = false;
      } else if (data && data.content && Array.isArray(data.content)) {
        items = data.content;
        hasMore = !data.last;
      } else if (data && data.data && Array.isArray(data.data)) {
        items = data.data;
      } else if (data && data.items && Array.isArray(data.items)) {
        items = data.items;
      } else if (data && data.news && Array.isArray(data.news)) {
        items = data.news;
      }

      if (items.length > 0) {
        renderNewsItems(items);
        currentPage++;
      } else {
        hasMore = false;
        if (currentPage === 0) {
          const grid = document.getElementById('mye-news-grid');
          if (grid) grid.innerHTML = `<div style="grid-column: 1/-1; background:#333; color:#0f0; padding:20px; font-family:monospace; border-radius:10px; overflow:auto;">DEBUG DATA:<br>${JSON.stringify(data, null, 2)}</div>`;
        }
      }
    } catch (e) {
      console.error('Erreur chargement news:', e);
      if (currentPage === 0) {
        const grid = document.getElementById('mye-news-grid');
        if (grid) grid.innerHTML = `<div style="grid-column: 1/-1; background:#f00; color:#fff; padding:20px; border-radius:10px;">ERREUR FETCH: ${e.message}</div>`;
      }
    }

    isLoading = false;
    hideSpinner();
  }

  function renderFilters() {
    const filtersContainer = document.getElementById('mye-news-filters');
    if (!filtersContainer) return;
    
    const tagsArray = Array.from(allKnownTags).sort();
    
    let html = `<button class="mye-news-filter-btn ${currentFilter === 'TOUTES' ? 'active' : ''}" data-tag="TOUTES">TOUTES</button>`;
    tagsArray.forEach(tag => {
      html += `<button class="mye-news-filter-btn ${currentFilter === tag ? 'active' : ''}" data-tag="${tag.replace(/"/g, '&quot;')}">${tag}</button>`;
    });
    
    filtersContainer.innerHTML = html;
    
    // Allow DOM to update before checking scroll width
    setTimeout(updateArrows, 50);
  }

  function updateArrows() {
    const container = document.getElementById('mye-news-filters');
    const leftArrow = document.getElementById('mye-filter-arrow-left');
    const rightArrow = document.getElementById('mye-filter-arrow-right');
    if (!container || !leftArrow || !rightArrow) return;
    
    if (container.scrollWidth > container.clientWidth) {
      leftArrow.style.display = container.scrollLeft > 0 ? 'flex' : 'none';
      rightArrow.style.display = container.scrollLeft < (container.scrollWidth - container.clientWidth - 1) ? 'flex' : 'none';
    } else {
      leftArrow.style.display = 'none';
      rightArrow.style.display = 'none';
    }
  }

  function setFilter(tag) {
    currentFilter = tag;
    renderFilters();
    
    const cards = document.querySelectorAll('.mye-news-card');
    cards.forEach(card => {
      const tagsAttr = card.getAttribute('data-tags') || '';
      if (currentFilter === 'TOUTES' || tagsAttr.includes(`|${currentFilter}|`)) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
  }

  function renderNewsItems(items) {
    const grid = document.getElementById('mye-news-grid');
    if (!grid) return;
    
    let newTagsAdded = false;

    items.forEach(item => {
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach(t => {
          if (!allKnownTags.has(t)) {
            allKnownTags.add(t);
            newTagsAdded = true;
          }
        });
      }

      const card = document.createElement('div');
      card.className = 'mye-news-card';
      
      const tagsStr = item.tags ? `|${item.tags.join('|')}|` : '';
      card.setAttribute('data-tags', tagsStr);
      
      if (currentFilter !== 'TOUTES' && !tagsStr.includes(`|${currentFilter}|`)) {
        card.style.display = 'none';
      }
      
      const title = item.title || 'Actualité';
      const description = item.head || item.description || item.summary || item.text || '';
      
      const idSuffix = item._id || Math.random().toString(36).substr(2, 9);
      
      let imgUrl = item.picture ? `/api/rest/common/news/images/thumbnail/${item.picture}` : '';
      
      let imgHtml = '';
      if (imgUrl) {
        imgHtml = `<div class="mye-news-image-wrapper" id="mye-news-img-wrapper-${idSuffix}">
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
        // Ne pas déclencher le clic si on fait défiler les tags
        if (e.target.closest('.mye-news-tags')) return;
        
        const url = item.url || `/portal/common/news/${item._id}`;
        window.location.href = url;
      });
      
      grid.appendChild(card);
      animationObserver.observe(card);

      // Si une image est présente, on la charge asynchrone pour gérer le format (base64 brut ou binaire)
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
            const wrapper = document.getElementById(`mye-news-img-wrapper-${idSuffix}`);
            if (wrapper) {
              wrapper.innerHTML = `<img src="${src}" alt="${title.replace(/"/g, '&quot;')}" class="mye-news-image" style="opacity:0; transition:opacity 0.3s ease;" onload="this.style.opacity=1">`;
            }
          })
          .catch(err => {
            const wrapper = document.getElementById(`mye-news-img-wrapper-${idSuffix}`);
            if (wrapper) wrapper.innerHTML = `<div class="mye-news-placeholder-image">Pas d'image</div>`;
          });
      }
    });
    
    if (newTagsAdded) {
      renderFilters();
    }
  }

  function showSpinner() {
    const spinner = document.getElementById('mye-news-spinner');
    if (spinner) spinner.style.display = 'flex';
  }

  function hideSpinner() {
    const spinner = document.getElementById('mye-news-spinner');
    if (spinner) spinner.style.display = 'none';
  }

  function buildPageStructure() {
    if (document.getElementById('mye-news-container')) return;
    
    document.body.classList.add('mye-clean-screen');

    const container = document.createElement('div');
    container.id = 'mye-news-container';
    container.className = 'mye-page-container';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.alignItems = 'center';
    
    container.innerHTML = `
      <div class="mye-news-header">
        <h1 class="mye-news-main-title">Actualités</h1>
      </div>
      <div class="mye-news-filters-wrapper" id="mye-news-filters-wrapper">
        <button class="mye-news-filter-arrow left" id="mye-filter-arrow-left" style="display:none;">&#10094;</button>
        <div id="mye-news-filters" class="mye-news-filters"></div>
        <button class="mye-news-filter-arrow right" id="mye-filter-arrow-right" style="display:none;">&#10095;</button>
      </div>
      <div id="mye-news-grid" class="mye-news-grid"></div>
      <div id="mye-news-spinner" class="mye-news-spinner" style="display:none;">
        <div class="mye-spinner-icon"></div>
      </div>
      <div id="mye-news-sentinel" style="height: 20px; width: 100%;"></div>
    `;

    document.body.appendChild(container);
    
    const filtersContainer = document.getElementById('mye-news-filters');
    if (filtersContainer) {
      filtersContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('mye-news-filter-btn')) {
          setFilter(e.target.getAttribute('data-tag'));
        }
      });
      filtersContainer.addEventListener('scroll', updateArrows);
      window.addEventListener('resize', updateArrows);
    }
    
    const leftArrow = document.getElementById('mye-filter-arrow-left');
    if (leftArrow) {
      leftArrow.addEventListener('click', () => {
        if (filtersContainer) filtersContainer.scrollBy({ left: -300, behavior: 'smooth' });
      });
    }
    
    const rightArrow = document.getElementById('mye-filter-arrow-right');
    if (rightArrow) {
      rightArrow.addEventListener('click', () => {
        if (filtersContainer) filtersContainer.scrollBy({ left: 300, behavior: 'smooth' });
      });
    }
    
    const sentinel = document.getElementById('mye-news-sentinel');
    if (sentinel) {
      infiniteScrollObserver.observe(sentinel);
    }
  }

  function init() {
    console.log('📰 Initialisation de la page Actualités...');
    buildPageStructure();
    currentPage = 0;
    hasMore = true;
    allKnownTags.clear();
    currentFilter = 'TOUTES';
    const grid = document.getElementById('mye-news-grid');
    if (grid) grid.innerHTML = '';
    renderFilters();
    fetchNextPage();
  }

  function waitAndInit() {
    document.body.classList.add('mye-clean-screen');

    const checkHeader = setInterval(() => {
      if (document.getElementById('mye-custom-header-wrapper') || document.getElementById('mye-custom-header')) {
        clearInterval(checkHeader);
        if (!document.getElementById('mye-news-container')) {
          setTimeout(init, 200);
        }
      }
    }, 200);

    setTimeout(() => {
      clearInterval(checkHeader);
      if (!document.getElementById('mye-news-container')) {
        init();
      }
    }, 5000);
  }

  function isNewsListPage() {
    return window.location.pathname === '/portal/common/news' || window.location.pathname === '/portal/common/news/';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (isNewsListPage()) waitAndInit();
    });
  } else {
    if (isNewsListPage()) waitAndInit();
  }

  let lastUrl = window.location.href;
  setInterval(() => {
    if (lastUrl !== window.location.href) {
      lastUrl = window.location.href;
      
      if (isNewsListPage()) {
        if (!document.getElementById('mye-news-container')) {
          waitAndInit();
        } else {
          document.body.classList.add('mye-clean-screen');
          document.getElementById('mye-news-container').style.display = 'flex';
        }
      } else {
        document.body.classList.remove('mye-clean-screen');
        const container = document.getElementById('mye-news-container');
        if (container) container.style.display = 'none';
      }
    }
  }, 500);

})();
