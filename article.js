// =============================================
//  MYEFREI ULTRA - Article Page (article.js)
// =============================================

(function () {
  'use strict';

  let currentArticleId = null;

  function getArticleId() {
    const match = window.location.pathname.match(/\/portal\/common\/news\/([a-f0-9]+)/i);
    return match ? match[1] : null;
  }

  function isArticlePage() {
    return !!getArticleId();
  }

  function buildArticleStructure() {
    if (document.getElementById('mye-article-container')) return;
    
    const articleContainer = document.createElement('div');
    articleContainer.id = 'mye-article-container';
    articleContainer.className = 'mye-article-container mye-page-container';
    
    articleContainer.innerHTML = `
      <div class="mye-article-inner">
        <button class="mye-article-back-btn" id="mye-article-back-btn">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          Retour aux actualités
        </button>
        <div id="mye-article-spinner" class="mye-news-spinner" style="display:none;"><div class="mye-spinner-icon"></div></div>
        <div id="mye-article-content" class="mye-article-content" style="display:none;"></div>
      </div>
    `;
    
    document.body.appendChild(articleContainer);
    
    document.getElementById('mye-article-back-btn').addEventListener('click', () => {
      window.location.href = '/portal/common/news';
    });
  }

  function loadArticle(id) {
    const spinner = document.getElementById('mye-article-spinner');
    const content = document.getElementById('mye-article-content');
    
    if (spinner) spinner.style.display = 'flex';
    if (content) content.style.display = 'none';

    Promise.all([
      fetch(`/api/rest/common/news/${id}/metadata`).then(res => res.json()).catch(() => null),
      fetch(`/api/rest/common/news/${id}/content`).then(res => res.json()).then(data => data.content || '').catch(() => '')
    ]).then(([metadata, htmlContent]) => {
      if (spinner) spinner.style.display = 'none';
      if (!metadata) {
        if (content) {
          content.innerHTML = `<p style="text-align:center;color:red;">Erreur lors du chargement de l'article.</p>`;
          content.style.display = 'block';
        }
        return;
      }

      const title = metadata.title || 'Actualité';
      let tagsHtml = '';
      if (metadata.tags && metadata.tags.length > 0) {
        tagsHtml = metadata.tags.map(t => `<span class="mye-article-tag">${t}</span>`).join('');
      }

      let dateHtml = '';
      if (metadata.date) {
        const d = new Date(metadata.date);
        dateHtml = `<span>${d.toLocaleDateString('fr-FR')}</span>`;
      }

      let coverHtml = '';
      if (metadata.picture) {
        const imgUrl = `/api/rest/common/news/images/${metadata.picture}`;
        coverHtml = `<div class="mye-news-image-wrapper" id="mye-article-cover-wrapper" style="width:100%; max-height:400px; margin-bottom:30px; border-radius:12px; overflow:hidden; display:flex; justify-content:center; align-items:center; background:#eee;">
                       <div class="mye-news-placeholder-image">Chargement de l'image...</div>
                     </div>`;
        
        fetch(imgUrl)
          .then(res => {
            if (!res.ok) throw new Error('Image fetch failed');
            const ct = res.headers.get('content-type') || '';
            if (ct.includes('image/')) {
              return res.blob().then(blob => URL.createObjectURL(blob));
            } else {
              return res.text().then(txt => {
                if (txt.startsWith('{')) {
                  try {
                    const json = JSON.parse(txt);
                    if (json.content) txt = json.content;
                    else if (json.data) txt = json.data;
                  } catch(e) {}
                }
                return txt.startsWith('data:') ? txt : `data:image/jpeg;base64,${txt}`;
              });
            }
          })
          .then(src => {
            const wrapper = document.getElementById('mye-article-cover-wrapper');
            if (wrapper) {
              wrapper.style.background = 'transparent';
              wrapper.innerHTML = `<img src="${src}" alt="Cover" class="mye-article-cover" style="opacity:0; transition:opacity 0.3s ease; width:100%; max-height:400px; object-fit:cover; border-radius:12px;" onload="this.style.opacity=1">`;
            }
          })
          .catch(err => {
            console.error('Erreur image couverture', err);
            const wrapper = document.getElementById('mye-article-cover-wrapper');
            if (wrapper) wrapper.style.display = 'none';
          });
      }

      if (content) {
        content.innerHTML = `
          ${coverHtml}
          <div class="mye-article-meta">
            ${dateHtml}
            ${tagsHtml}
          </div>
          <h1 class="mye-article-title">${title}</h1>
          <div class="mye-article-body">
            ${htmlContent}
          </div>
        `;
        content.style.display = 'block';
        
        const contentImages = content.querySelectorAll('.mye-article-body img');
        contentImages.forEach(img => {
          const originalSrc = img.getAttribute('src');
          if (originalSrc && originalSrc.startsWith('/api/rest/')) {
            fetch(originalSrc)
              .then(res => {
                if (!res.ok) throw new Error('Image fetch failed');
                const ct = res.headers.get('content-type') || '';
                if (ct.includes('image/')) {
                  return res.blob().then(blob => URL.createObjectURL(blob));
                } else {
                  return res.text().then(txt => {
                    if (txt.startsWith('{')) {
                      try {
                        const json = JSON.parse(txt);
                        if (json.content) txt = json.content;
                        else if (json.data) txt = json.data;
                      } catch(e) {}
                    }
                    return txt.startsWith('data:') ? txt : `data:image/jpeg;base64,${txt}`;
                  });
                }
              })
              .then(src => {
                img.src = src;
              })
              .catch(err => console.error('Erreur image interne', err));
          }
        });
      }
    });
  }

  function initArticle() {
    console.log(`📰 Initialisation de l'interface Article...`);
    buildArticleStructure();
    
    const articleId = getArticleId();
    currentArticleId = articleId;
    loadArticle(articleId);
  }

  let lastUrl = window.location.href;

  setInterval(() => {
    if (lastUrl !== window.location.href) {
      lastUrl = window.location.href;
      
      if (isArticlePage()) {
        document.body.classList.add('mye-clean-screen');
        if (!document.getElementById('mye-article-container')) {
          initArticle();
        } else {
          document.getElementById('mye-article-container').style.display = 'flex';
          const articleId = getArticleId();
          if (articleId !== currentArticleId) {
            currentArticleId = articleId;
            loadArticle(articleId);
          }
        }
      } else {
        const container = document.getElementById('mye-article-container');
        if (container) container.style.display = 'none';
        
        if (window.location.pathname !== '/portal/common/news' && window.location.pathname !== '/portal/common/news/') {
          document.body.classList.remove('mye-clean-screen');
        }
      }
    }
  }, 500);

  // Initial check
  if (isArticlePage()) {
    const checkHeader = setInterval(() => {
      if (document.getElementById('mye-custom-header-wrapper') || document.getElementById('mye-custom-header')) {
        clearInterval(checkHeader);
        if (!document.getElementById('mye-article-container')) {
          document.body.classList.add('mye-clean-screen');
          setTimeout(initArticle, 200);
        }
      }
    }, 200);

    setTimeout(() => {
      clearInterval(checkHeader);
      if (!document.getElementById('mye-article-container')) {
        document.body.classList.add('mye-clean-screen');
        initArticle();
      }
    }, 5000);
  }

})();
