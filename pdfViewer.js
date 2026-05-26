/**
 * ════════════════════════════════════════════════════════════════════════
 * LECTEUR PDF CUSTOM - MYEFREI ULTRA
 * ════════════════════════════════════════════════════════════════════════
 */

(function () {
  let pdfDoc = null;
  let downloadObjectUrl = '';
  let currentZoom = 1.0;

  // Configuration globale de PDF.js
  if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('lib/pdf.worker.min.js');
  }

  /**
   * Initialise le conteneur du lecteur PDF dans le DOM s'il n'existe pas.
   */
  function initOverlay() {
    let overlay = document.getElementById('mye-pdf-overlay');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'mye-pdf-overlay';
    overlay.className = 'mye-pdf-overlay';
    overlay.innerHTML = `
      <div class="mye-pdf-modal" id="mye-pdf-modal">
        <!-- Barre d'outils supérieure -->
        <div class="mye-pdf-toolbar">
          <!-- Infos document -->
          <div class="mye-pdf-info">
            <div class="mye-pdf-icon-wrapper">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H10v-2h8v2zm0-4H10V8h8v2zm0-4H10V4h8v2zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6z"/>
              </svg>
            </div>
            <h3 class="mye-pdf-title" id="mye-pdf-viewer-title">Copie d'examen</h3>
          </div>

          <!-- Contrôles de navigation et zoom -->
          <div class="mye-pdf-controls">
            <!-- Navigation -->
            <div class="mye-pdf-control-group">
              <button class="mye-pdf-btn" id="mye-pdf-prev-btn" title="Page précédente">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                </svg>
              </button>
              <span class="mye-pdf-indicator"><span id="mye-pdf-current-page">1</span> / <span id="mye-pdf-total-pages">1</span></span>
              <button class="mye-pdf-btn" id="mye-pdf-next-btn" title="Page suivante">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                </svg>
              </button>
            </div>
            
            <div class="mye-pdf-divider"></div>

            <!-- Zoom -->
            <div class="mye-pdf-control-group">
              <button class="mye-pdf-btn" id="mye-pdf-zoom-out-btn" title="Zoom arrière">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M19 13H5v-2h14v2z"/>
                </svg>
              </button>
              <span class="mye-pdf-zoom-val" id="mye-pdf-zoom-percent">100%</span>
              <button class="mye-pdf-btn" id="mye-pdf-zoom-in-btn" title="Zoom avant">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
              </button>
              <button class="mye-pdf-btn" id="mye-pdf-fit-btn" title="Ajuster à la largeur">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Actions de fermeture et téléchargement -->
          <div class="mye-pdf-actions">
            <a id="mye-pdf-download-link" class="mye-pdf-btn mye-pdf-btn-download" href="#" target="_blank" download title="Télécharger">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
              </svg>
            </a>
            <button class="mye-pdf-btn mye-pdf-btn-close" id="mye-pdf-close-btn" title="Fermer">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="mye-pdf-modal-content">
          <!-- Corps du visualiseur -->
          <div class="mye-pdf-body" id="mye-pdf-body">
            <!-- Spinner de chargement -->
            <div class="mye-pdf-loader-overlay" id="mye-pdf-loader">
              <div class="mye-pdf-spinner"></div>
              <div class="mye-pdf-loading-text">Chargement du document...</div>
            </div>
            
            <!-- Message d'erreur -->
            <div class="mye-pdf-error-overlay" id="mye-pdf-error" style="display: none;">
              <div class="mye-pdf-error-icon">⚠</div>
              <h4 class="mye-pdf-error-title">Impossible de charger la copie</h4>
              <p class="mye-pdf-error-desc" id="mye-pdf-error-desc">Une erreur s'est produite lors de la récupération du fichier.</p>
            </div>

            <!-- Conteneur des pages rendues -->
            <div class="mye-pdf-pages-container" id="mye-pdf-pages-container" style="display: none;"></div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Événements de contrôle
    document.getElementById('mye-pdf-close-btn').addEventListener('click', closeViewer);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeViewer();
    });

    document.getElementById('mye-pdf-modal').addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // Zoom arrière
    document.getElementById('mye-pdf-zoom-out-btn').addEventListener('click', () => {
      currentZoom = Math.max(0.5, currentZoom - 0.15);
      applyZoom();
    });

    // Zoom avant
    document.getElementById('mye-pdf-zoom-in-btn').addEventListener('click', () => {
      currentZoom = Math.min(3.0, currentZoom + 0.15);
      applyZoom();
    });

    // Ajuster largeur
    document.getElementById('mye-pdf-fit-btn').addEventListener('click', () => {
      fitToWidth();
    });

    // Navigation de pages
    document.getElementById('mye-pdf-prev-btn').addEventListener('click', () => {
      const cur = parseInt(document.getElementById('mye-pdf-current-page').textContent) || 1;
      if (cur > 1) scrollToVisualPage(cur - 2);
    });

    document.getElementById('mye-pdf-next-btn').addEventListener('click', () => {
      const cur = parseInt(document.getElementById('mye-pdf-current-page').textContent) || 1;
      const total = parseInt(document.getElementById('mye-pdf-total-pages').textContent) || 1;
      if (cur < total) scrollToVisualPage(cur);
    });

    // Gestion du scroll pour mettre à jour l'indicateur de page
    const body = document.getElementById('mye-pdf-body');
    body.addEventListener('scroll', () => {
      const wrappers = document.querySelectorAll('.mye-pdf-page-wrapper');
      if (wrappers.length === 0) return;
      const scrollTop = body.scrollTop;
      const bodyHeight = body.clientHeight;
      const middle = scrollTop + bodyHeight / 2;

      let activePage = 1;
      for (let i = 0; i < wrappers.length; i++) {
        const wrapper = wrappers[i];
        const top = wrapper.offsetTop;
        const height = wrapper.offsetHeight;
        if (middle >= top && middle <= top + height) {
          activePage = i + 1;
          break;
        }
      }
      document.getElementById('mye-pdf-current-page').textContent = activePage;
    });

    // Ajustement automatique lors du redimensionnement
    window.addEventListener('resize', () => {
      if (!pdfDoc || !overlay.classList.contains('mye-pdf-show')) return;
      fitToWidth();
    });

    return overlay;
  }

  /**
   * Fait défiler le visualiseur jusqu'à la page visuelle spécifiée.
   */
  function scrollToVisualPage(index) {
    const wrappers = document.querySelectorAll('.mye-pdf-page-wrapper');
    const targetWrapper = wrappers[index];
    const container = document.getElementById('mye-pdf-body');
    if (targetWrapper && container) {
      const top = targetWrapper.offsetTop - 16;
      container.scrollTo({ top: top, behavior: 'smooth' });
    }
  }

  /**
   * Applique le facteur de zoom actuel sur tous les wrappers de pages.
   */
  function applyZoom() {
    const wrappers = document.querySelectorAll('.mye-pdf-page-wrapper');
    wrappers.forEach(wrapper => {
      const baseWidth = parseFloat(wrapper.dataset.baseWidth);
      const baseHeight = parseFloat(wrapper.dataset.baseHeight);
      if (baseWidth && baseHeight) {
        wrapper.style.width = (baseWidth * currentZoom) + 'px';
        wrapper.style.height = (baseHeight * currentZoom) + 'px';
      }
    });
    document.getElementById('mye-pdf-zoom-percent').textContent = Math.round(currentZoom * 100) + '%';
  }

  /**
   * Ajuste la largeur des pages à la largeur interne du visualiseur.
   */
  function fitToWidth() {
    if (!pdfDoc) return;
    const firstWrapper = document.querySelector('.mye-pdf-page-wrapper');
    if (!firstWrapper) return;
    const baseWidth = parseFloat(firstWrapper.dataset.baseWidth);
    if (!baseWidth) return;

    const containerWidth = document.getElementById('mye-pdf-body').clientWidth;
    const padding = window.innerWidth <= 640 ? 24 : 64;
    
    currentZoom = (containerWidth - padding) / baseWidth;
    if (currentZoom < 0.5) currentZoom = 0.5;
    if (currentZoom > 3.0) currentZoom = 3.0;

    applyZoom();
  }

  /**
   * Ferme le visualiseur PDF et libère la mémoire.
   */
  function closeViewer() {
    const overlay = document.getElementById('mye-pdf-overlay');
    if (overlay) overlay.classList.remove('mye-pdf-show');

    if (pdfDoc) {
      try {
        pdfDoc.destroy();
      } catch (e) {
        console.warn('Erreur lors de la destruction du document PDF:', e);
      }
      pdfDoc = null;
    }

    if (downloadObjectUrl) {
      URL.revokeObjectURL(downloadObjectUrl);
      downloadObjectUrl = '';
    }

    const pagesContainer = document.getElementById('mye-pdf-pages-container');
    if (pagesContainer) {
      pagesContainer.innerHTML = '';
      pagesContainer.style.display = 'none';
    }
  }

  /**
   * Télécharge et charge le document PDF.
   * Si les pages sont en paysage (A3), les découpe en 2 demi-pages A4.
   */
  async function loadDocument(url) {
    const loader = document.getElementById('mye-pdf-loader');
    const errorEl = document.getElementById('mye-pdf-error');
    const pagesContainer = document.getElementById('mye-pdf-pages-container');

    try {
      loader.style.display = 'flex';
      errorEl.style.display = 'none';
      pagesContainer.style.display = 'none';

      // 1. Récupération des données binaires
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error("Impossible de télécharger le fichier PDF.");

      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();

      const currentOverlay = document.getElementById('mye-pdf-overlay');
      if (!currentOverlay || !currentOverlay.classList.contains('mye-pdf-show')) return;

      // 2. Objet de téléchargement local
      downloadObjectUrl = URL.createObjectURL(blob);
      document.getElementById('mye-pdf-download-link').href = downloadObjectUrl;

      // 3. Initialisation PDF.js
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
      pdfDoc = await loadingTask.promise;

      pagesContainer.innerHTML = '';

      // 4. Construire la liste initiale des pages virtuelles (A3 -> A4 si besoin)
      const initialVirtualPages = [];

      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const vp = page.getViewport({ scale: 1.0 });

        if (vp.width > vp.height * 1.1) {
          // Page paysage (A3) → 2 demi-pages A4
          console.log(`[MyEfrei PDF] Page ${i}: paysage (${Math.round(vp.width)}×${Math.round(vp.height)}) → découpe en 2 A4`);
          initialVirtualPages.push({ page, pdfPageNum: i, half: 'left',  baseW: vp.width / 2, baseH: vp.height });
          initialVirtualPages.push({ page, pdfPageNum: i, half: 'right', baseW: vp.width / 2, baseH: vp.height });
        } else {
          // Page portrait (A4) → affichage normal
          console.log(`[MyEfrei PDF] Page ${i}: portrait (${Math.round(vp.width)}×${Math.round(vp.height)}) → pas de découpe`);
          initialVirtualPages.push({ page, pdfPageNum: i, half: 'full', baseW: vp.width, baseH: vp.height });
        }
      }

      // 5. Réordonner les pages virtuelles (Scan livret Efrei)
      //    Les copies scannées donnent une suite de paires de pages (faces d'un A3).
      //    Ordre du scanner : faces recto (paires 0, 2, 4...) puis faces verso à l'envers (..., paires 5, 3, 1).
      const virtualPages = [];
      const numChunks = Math.floor(initialVirtualPages.length / 2);
      
      const chunkSequence = [];
      for (let c = 0; c < numChunks; c += 2) {
        chunkSequence.push(c);
      }
      const lastOdd = numChunks % 2 === 0 ? numChunks - 1 : numChunks - 2;
      for (let c = lastOdd; c >= 1; c -= 2) {
        chunkSequence.push(c);
      }

      console.log(`[MyEfrei PDF] Ordre logique des paires (chunks) :`, chunkSequence);

      for (const c of chunkSequence) {
        virtualPages.push(initialVirtualPages[c * 2]);
        virtualPages.push(initialVirtualPages[c * 2 + 1]);
      }

      // S'il reste une page impaire à la fin (rare), on l'ajoute
      if (initialVirtualPages.length % 2 !== 0) {
        virtualPages.push(initialVirtualPages[initialVirtualPages.length - 1]);
      }

      const totalVirtual = virtualPages.length;
      document.getElementById('mye-pdf-total-pages').textContent = totalVirtual;
      document.getElementById('mye-pdf-current-page').textContent = '1';

      console.log(`[MyEfrei PDF] ${pdfDoc.numPages} pages PDF → ${totalVirtual} pages virtuelles (A4)`);

      // 5. Créer les wrappers et canvas pour chaque page virtuelle
      for (let i = 0; i < totalVirtual; i++) {
        const vp = virtualPages[i];
        const wrapper = document.createElement('div');
        wrapper.id = `mye-pdf-page-wrapper-${i + 1}`;
        wrapper.className = 'mye-pdf-page-wrapper';
        wrapper.dataset.baseWidth = vp.baseW;
        wrapper.dataset.baseHeight = vp.baseH;

        const canvas = document.createElement('canvas');
        canvas.id = `mye-pdf-canvas-${i + 1}`;
        wrapper.appendChild(canvas);
        pagesContainer.appendChild(wrapper);
      }

      fitToWidth();

      // Masquage du loader, affichage du conteneur
      loader.style.display = 'none';
      pagesContainer.style.display = 'flex';

      // 6. Rendu séquentiel progressif
      //    Pour les pages A3 → on rend une seule fois en HD puis on copie chaque moitié.
      let lastRenderedPage = -1;
      let tempCanvas = null;

      for (let i = 0; i < totalVirtual; i++) {
        if (!pdfDoc) break;
        const vp = virtualPages[i];

        try {
          const displayCanvas = document.getElementById(`mye-pdf-canvas-${i + 1}`);
          if (!displayCanvas) continue;
          const displayCtx = displayCanvas.getContext('2d');

          if (vp.half === 'full') {
            // Page portrait → rendu direct HD
            const renderVP = vp.page.getViewport({ scale: 2.0 });
            displayCanvas.width = renderVP.width;
            displayCanvas.height = renderVP.height;
            await vp.page.render({ canvasContext: displayCtx, viewport: renderVP }).promise;

          } else {
            // Page paysage (A3) → rendre la page entière une seule fois puis copier la moitié
            if (vp.pdfPageNum !== lastRenderedPage) {
              const renderVP = vp.page.getViewport({ scale: 2.0 });
              tempCanvas = document.createElement('canvas');
              tempCanvas.width = renderVP.width;
              tempCanvas.height = renderVP.height;
              const tempCtx = tempCanvas.getContext('2d');
              await vp.page.render({ canvasContext: tempCtx, viewport: renderVP }).promise;
              lastRenderedPage = vp.pdfPageNum;
            }

            const halfW = Math.floor(tempCanvas.width / 2);
            displayCanvas.width = halfW;
            displayCanvas.height = tempCanvas.height;

            if (vp.half === 'left') {
              displayCtx.drawImage(tempCanvas, 0, 0, halfW, tempCanvas.height, 0, 0, halfW, tempCanvas.height);
            } else {
              displayCtx.drawImage(tempCanvas, halfW, 0, halfW, tempCanvas.height, 0, 0, halfW, tempCanvas.height);
            }
          }

          // Mettre à jour les dimensions du wrapper après le rendu réel
          const wrapper = document.getElementById(`mye-pdf-page-wrapper-${i + 1}`);
          if (wrapper) {
            wrapper.style.width = (vp.baseW * currentZoom) + 'px';
            wrapper.style.height = (vp.baseH * currentZoom) + 'px';
          }

        } catch (err) {
          console.error(`Erreur rendu page virtuelle ${i + 1}:`, err);
        }
      }

      // Libérer le canvas temporaire
      tempCanvas = null;

    } catch (err) {
      console.error("Erreur générale lecteur PDF :", err);
      loader.style.display = 'none';
      errorEl.style.display = 'flex';
      document.getElementById('mye-pdf-error-desc').textContent = err.message || "Erreur de chargement.";
    }
  }

  // Expose le lecteur globalement
  window.myePdfViewer = {
    open: function (url, title) {
      initOverlay();
      const overlay = document.getElementById('mye-pdf-overlay');
      document.getElementById('mye-pdf-viewer-title').textContent = title || "Copie d'examen";
      
      const body = document.getElementById('mye-pdf-body');
      if (body) body.scrollTop = 0;

      overlay.classList.add('mye-pdf-show');
      
      currentZoom = 1.0;
      loadDocument(url);
    },
    close: function () {
      closeViewer();
    }
  };
})();
