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

      const dateStr = metadata.publicationDate || metadata.date || metadata.createdAt;
      let dateHtml = `Date d'écriture de l'article`;
      if (dateStr) {
        const d = new Date(dateStr);
        if (!isNaN(d)) {
          dateHtml = `Date d'écriture : ${d.toLocaleDateString('fr-FR')}`;
        }
      }
      
      let authorHtml = metadata.author || 'Efrei Paris';

      let coverHtml = '';
      if (metadata.picture || metadata.illustrationId) {
        const picId = metadata.picture || metadata.illustrationId;
        const imgUrl = `/api/rest/common/news/images/thumbnail/${picId}`;
        coverHtml = `<div class="mye-article-cover-wrapper" id="mye-article-cover-wrapper">
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
              wrapper.innerHTML = `<img src="${src}" alt="Cover" class="mye-article-cover" onload="this.style.opacity=1">`;
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
          <div class="mye-article-header-card">
            <h1 class="mye-article-title">${title}</h1>
            ${coverHtml}
          </div>
          <div class="mye-article-info-bar">
            <div class="mye-article-date">${dateHtml}</div>
            <div class="mye-article-author">${authorHtml}</div>
          </div>
          <div class="mye-article-tags-row">
            ${tagsHtml}
          </div>
          <div class="mye-article-body">
            ${htmlContent}
          </div>
        `;
        content.style.display = 'block';
        
        const bodyEl = content.querySelector('.mye-article-body');
        let currentGallery = null;
        
        Array.from(bodyEl.children).forEach(child => {
          const imgs = child.querySelectorAll('img');
          if (imgs.length === 0) {
            currentGallery = null;
            return;
          }
          
          const clone = child.cloneNode(true);
          Array.from(clone.querySelectorAll('img')).forEach(i => i.remove());
          // Consider a child "pure" if it only has images and maybe empty text/br
          const hasText = clone.textContent.trim().length > 0;
          
          if (!hasText) {
            if (!currentGallery) {
              currentGallery = document.createElement('div');
              currentGallery.className = 'mye-article-gallery';
              bodyEl.insertBefore(currentGallery, child);
            }
            Array.from(imgs).forEach(img => currentGallery.appendChild(img));
            child.remove();
          } else {
            currentGallery = null;
          }
        });
        
        // --- CLEANUP EMPTY SPACES ---
        const textElements = bodyEl.querySelectorAll('p, div, span, h1, h2, h3, h4, h5, h6');
        textElements.forEach(el => {
          if (el.classList && el.classList.contains('mye-article-gallery')) return;
          if (el.querySelector('img, iframe, video, audio')) return;
          
          const text = el.textContent.replace(/[\s\u00A0]/g, '');
          if (text.length === 0) {
            el.remove();
          }
        });
        
        const brs = bodyEl.querySelectorAll('br');
        brs.forEach(br => {
          let prev = br.previousSibling;
          while (prev && prev.nodeType === 3 && prev.textContent.trim() === '') {
            prev = prev.previousSibling;
          }
          if (prev && prev.nodeName === 'BR') {
            br.remove();
          }
        });
        // ----------------------------

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
    if (document.body) document.body.classList.add('mye-clean-screen');
    else document.addEventListener('DOMContentLoaded', () => document.body.classList.add('mye-clean-screen'));

    const checkHeader = setInterval(() => {
      if (document.getElementById('mye-custom-header-wrapper') || document.getElementById('mye-custom-header')) {
        clearInterval(checkHeader);
        if (!document.getElementById('mye-article-container')) {
          if (document.body) document.body.classList.add('mye-clean-screen');
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
