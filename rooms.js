(function () {
  'use strict';

  if (window.mye_user_enabled_flag === false || localStorage.getItem('mye_user_enabled') === 'false') {
    return;
  }

  console.log('🚪 MyEfrei ULTRA — Module Salles (Chargé)');

  let currentBuilding = "La Maison";

  // ──────────────────────────────────────────────
  // INITIALISATION DU PANNEAU
  // ──────────────────────────────────────────────
  function init() {
    if (document.getElementById('mye-rooms-container')) return;

    // Ajouter la classe pour le nettoyage de l'écran d'origine
    document.body.classList.add('mye-clean-screen');
    document.body.classList.add('mye-rooms-page');

    // Changer le titre du document
    document.title = "Salles libres";

    // Créer le conteneur principal
    const container = document.createElement('div');
    container.id = 'mye-rooms-container';
    container.className = 'mye-page-container';

    container.innerHTML = `
      <div class="mye-rooms-left">
        <!-- Sélecteur de bâtiment -->
        <div class="mye-rooms-selector" id="mye-rooms-selector">
          <button class="mye-rooms-btn" id="mye-rooms-btn">
            <span id="mye-rooms-label">La Maison</span>
            <span class="mye-rooms-arrow">▼</span>
          </button>
          <div class="mye-rooms-dropdown" id="mye-rooms-dropdown">
            <button class="mye-rooms-option active" data-building="La Maison">La Maison</button>
            <button class="mye-rooms-option" data-building="La Factory">La Factory</button>
            <button class="mye-rooms-option" data-building="L'Aquarium">L'Aquarium</button>
            <button class="mye-rooms-option" data-building="New République">New République</button>
          </div>
        </div>

        <!-- Section sous construction -->
        <div class="mye-rooms-construction-card">
          <div class="mye-rooms-construction-title">Salles Libres</div>
          <div class="mye-rooms-construction-status">En construction</div>
          <div class="mye-rooms-construction-subtext">Le service de recherche de salles est en cours de développement.</div>
        </div>
      </div>

      <div class="mye-rooms-right" id="mye-rooms-right">
        <!-- Écran d'accès restreint scary -->
        <div class="mye-restricted-container">
          <h1 class="mye-restricted-title">VOUS N'AVEZ PAS LE DROIT D'ÊTRE LÀ</h1>
          <p class="mye-restricted-subtitle">L'accès à cette page a été restreint.</p>
          <a class="mye-restricted-back" href="/portal/student/dashboard">Retourner à l'accueil</a>
        </div>
      </div>
    `;

    document.body.appendChild(container);
    initSelectorEvents();
    updateRightPanel(currentBuilding);
  }

  // ──────────────────────────────────────────────
  // ÉVÉNEMENTS DU SÉLECTEUR
  // ──────────────────────────────────────────────
  function initSelectorEvents() {
    const btn = document.getElementById('mye-rooms-btn');
    const dropdown = document.getElementById('mye-rooms-dropdown');
    
    if (!btn || !dropdown) return;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      btn.classList.toggle('open');
      dropdown.classList.toggle('show');
    });

    const options = dropdown.querySelectorAll('.mye-rooms-option');
    options.forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Mettre à jour le texte du bouton
        const buildingName = opt.getAttribute('data-building');
        document.getElementById('mye-rooms-label').textContent = buildingName;
        currentBuilding = buildingName;

        // Gérer la classe active
        options.forEach(o => o.classList.remove('active'));
        opt.classList.add('active');

        // Fermer le dropdown
        btn.classList.remove('open');
        dropdown.classList.remove('show');

        // Mettre à jour l'écran de droite
        updateRightPanel(buildingName);
      });
    });

    document.addEventListener('click', () => {
      btn.classList.remove('open');
      dropdown.classList.remove('show');
    });
  }

  // ──────────────────────────────────────────────
  // MISE A JOUR DU PANNEAU DROIT
  // ──────────────────────────────────────────────
  function updateRightPanel(buildingName) {
    const rightPanel = document.getElementById('mye-rooms-right');
    if (!rightPanel) return;

    if (buildingName === "L'Aquarium") {
      renderAquarium3D(rightPanel);
    } else {
      rightPanel.classList.remove('aquarium-mode');
      rightPanel.innerHTML = `
        <div class="mye-restricted-container">
          <h1 class="mye-restricted-title">VOUS N'AVEZ PAS LE DROIT D'ÊTRE LÀ</h1>
          <p class="mye-restricted-subtitle">L'accès à cette page a été restreint.</p>
          <a class="mye-restricted-back" href="/portal/student/dashboard">Retourner à l'accueil</a>
        </div>
      `;
    }
  }

  // ──────────────────────────────────────────────
  // RENDU INTERACTIF 3D DE L'AQUARIUM
  // ──────────────────────────────────────────────
  function renderAquarium3D(panel) {
    panel.classList.add('aquarium-mode');
    panel.innerHTML = `
      <div class="mye-rooms-3d-viewport" id="mye-rooms-3d-viewport">
        <!-- Légende -->
        <div class="mye-rooms-legend">
          <div class="mye-rooms-legend-item"><span class="mye-rooms-legend-dot orange"></span>Inconnu (Sans API)</div>
          <div class="mye-rooms-legend-item"><span class="mye-rooms-legend-dot green"></span>Libre</div>
          <div class="mye-rooms-legend-item"><span class="mye-rooms-legend-dot red"></span>Occupé</div>
        </div>

        <!-- Recherche de salle -->
        <div class="mye-rooms-search-container">
          <input type="text" class="mye-rooms-search-input" id="mye-rooms-search-input" placeholder="Rechercher une salle (ex: K103)..." />
          <svg class="mye-rooms-search-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--mye-primary-color, #163767); margin-left: 4px; pointer-events: none; flex-shrink: 0;">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>

        <!-- Contrôleurs d'étages et angle -->
        <div class="mye-rooms-3d-controls">
          <div class="mye-rooms-3d-row">
            <button class="mye-rooms-reset-btn" id="mye-rooms-reset-btn">Réinitialiser la vue</button>
            <div class="mye-rooms-3d-zoom-group">
              <button class="mye-rooms-zoom-btn" id="mye-btn-3d-zoom-in" title="Zoom +">+</button>
              <button class="mye-rooms-zoom-btn" id="mye-btn-3d-zoom-out" title="Zoom -">−</button>
            </div>
          </div>
          <div class="mye-rooms-3d-btn-group floor-switcher">
            <button class="mye-rooms-3d-ctrl-btn active" id="mye-btn-3d-stack">Vue 3D</button>
            <button class="mye-rooms-3d-ctrl-btn" id="mye-btn-3d-rdc">RDC</button>
            <button class="mye-rooms-3d-ctrl-btn" id="mye-btn-3d-r1">R+1</button>
          </div>
        </div>

        <!-- Info bulle Tooltip -->
        <div class="mye-room-tooltip" id="mye-room-tooltip">
          <div class="mye-room-tooltip-title" id="mye-room-tooltip-title">Salle K103</div>
          <div>Étage : <span id="mye-room-tooltip-floor">R+1</span></div>
          <div>Statut : <span id="mye-room-tooltip-status" class="orange">Inconnu</span></div>
          <div class="mye-room-tooltip-action">Cliquez pour simuler le statut</div>
        </div>

        <!-- Indication de glissement -->
        <div class="mye-rooms-drag-hint">
          <span>🖱️ Glissez pour pivoter en 3D</span>
        </div>

        <!-- Bâtiment 3D -->
        <div class="mye-rooms-3d-building" id="mye-rooms-3d-building">
          
          <!-- ================= ÉTAGE RDC ================= -->
          <div class="mye-rooms-floor-layer layer-rdc">
            <svg viewBox="0 0 400 700" width="100%" height="100%">
              <!-- Plaque de sol (biseauté bottom-right/left) -->
              <polygon class="mye-building-slab" points="20,120 380,120 380,550 300,660 110,660 20,570" />
              
              <!-- Escalier Nord (Haut Droite) -->
              <path d="M 295,138 L 370,138 M 295,144 L 370,144 M 295,150 L 370,150 M 295,156 L 370,156 M 295,162 L 370,162 M 295,168 L 370,168 M 295,174 L 370,174 M 295,180 L 370,180" stroke="rgba(0, 242, 254, 0.4)" stroke-width="1.5" />
              <!-- Escalier Sud-Ouest (Bas Gauche) -->
              <path d="M 27,559 L 68,559 M 27,563 L 68,563 M 27,567 L 68,567 M 27,571 L 68,571 M 27,575 L 68,575 M 27,579 L 68,579 M 27,583 L 68,583 M 27,587 L 68,587" stroke="rgba(0, 242, 254, 0.4)" stroke-width="1.5" />
              
              <!-- Salles Colonne Gauche -->
              <rect class="mye-room-shape status-orange" data-room="K004" data-floor="RDC" x="25" y="130" width="85" height="80" rx="6" />
              <text x="67.5" y="170" class="mye-room-text">K004</text>
              
              <rect class="mye-room-shape status-orange" data-room="K003" data-floor="RDC" x="25" y="215" width="85" height="80" rx="6" />
              <text x="67.5" y="255" class="mye-room-text">K003</text>
              
              <rect class="mye-room-shape status-orange" data-room="K002" data-floor="RDC" x="25" y="300" width="85" height="80" rx="6" />
              <text x="67.5" y="340" class="mye-room-text">K002</text>
              
              <rect class="mye-room-shape status-orange" data-room="K001 (Cafétéria)" data-floor="RDC" x="25" y="385" width="85" height="110" rx="6" />
              <text x="67.5" y="432" class="mye-room-text" style="font-size: 8.5px;">Cafétéria</text>
              <text x="67.5" y="445" class="mye-room-text" style="font-size: 8.5px;">K001</text>
              
              <!-- Salles Colonne Milieu -->
              <rect class="mye-room-shape status-orange" data-room="K005" data-floor="RDC" x="120" y="130" width="100" height="60" rx="6" />
              <text x="170" y="160" class="mye-room-text">K005</text>
              
              <rect class="mye-room-shape status-orange" data-room="KOT4" data-floor="RDC" x="225" y="130" width="45" height="35" rx="4" />
              <text x="247.5" y="147.5" class="mye-room-text" style="font-size: 7px;">KOT4</text>
              
              <rect class="mye-room-shape status-orange" data-room="K013" data-floor="RDC" x="145" y="210" width="110" height="120" rx="6" />
              <text x="200" y="270" class="mye-room-text">K013</text>
              
              <rect class="mye-room-shape status-orange" data-room="K012" data-floor="RDC" x="145" y="335" width="110" height="60" rx="6" />
              <text x="200" y="365" class="mye-room-text">K012</text>
              
              <rect class="mye-room-shape status-orange" data-room="K011" data-floor="RDC" x="145" y="400" width="110" height="120" rx="6" />
              <text x="200" y="460" class="mye-room-text">K011</text>
              
              <!-- Salles Colonne Droite -->
              <rect class="mye-room-shape status-orange" data-room="K006" data-floor="RDC" x="290" y="200" width="85" height="80" rx="6" />
              <text x="332.5" y="240" class="mye-room-text">K006</text>
              
              <rect class="mye-room-shape status-orange" data-room="K007" data-floor="RDC" x="290" y="285" width="85" height="80" rx="6" />
              <text x="332.5" y="325" class="mye-room-text">K007</text>
              
              <rect class="mye-room-shape status-orange" data-room="K008" data-floor="RDC" x="290" y="370" width="85" height="80" rx="6" />
              <text x="332.5" y="410" class="mye-room-text">K008</text>
              
              <!-- Blocs W.C (Bas Droite, à côté de K011) -->
              <rect class="mye-room-shape status-orange" data-room="WC Hommes" data-floor="RDC" x="290" y="460" width="85" height="40" rx="6" />
              <text x="332.5" y="480" class="mye-room-text">WC 🚹</text>
              
              <rect class="mye-room-shape status-orange" data-room="WC Femmes" data-floor="RDC" x="290" y="505" width="85" height="40" rx="6" />
              <text x="332.5" y="525" class="mye-room-text">WC 🚺</text>
              
              <!-- Slanted Bottom Section -->
              <!-- KOTs à gauche de l'accueil -->
              <rect class="mye-room-shape status-orange" data-room="KOT3" data-floor="RDC" x="75" y="550" width="40" height="30" rx="4" />
              <text x="95" y="565" class="mye-room-text" style="font-size: 7px;">KOT3</text>
              
              <rect class="mye-room-shape status-orange" data-room="KOT2" data-floor="RDC" x="90" y="585" width="40" height="30" rx="4" />
              <text x="110" y="600" class="mye-room-text" style="font-size: 7px;">KOT2</text>
              
              <rect class="mye-room-shape status-orange" data-room="KOT1 (Repro)" data-floor="RDC" x="105" y="620" width="45" height="30" rx="4" />
              <text x="127.5" y="631" class="mye-room-text" style="font-size: 6px;">KOT1</text>
              <text x="127.5" y="639" class="mye-room-text" style="font-size: 5.5px;">REPRO</text>
              
              <!-- Accueil (Cercle central) -->
              <circle class="mye-room-shape status-orange" data-room="ACCUEIL" data-floor="RDC" cx="200" cy="580" r="30" />
              <text x="200" y="580" class="mye-room-text" style="font-size: 8px;">ACCUEIL</text>
              
              <!-- Gardien & KOT5 à droite de l'accueil -->
              <rect class="mye-room-shape status-orange" data-room="GARDIEN" data-floor="RDC" x="250" y="585" width="50" height="40" rx="6" />
              <text x="275" y="605" class="mye-room-text" style="font-size: 8px;">GARDIEN</text>
              
              <rect class="mye-room-shape status-orange" data-room="KOT5" data-floor="RDC" x="305" y="570" width="45" height="35" rx="4" />
              <text x="327.5" y="587.5" class="mye-room-text" style="font-size: 7px;">KOT5</text>
              
              <!-- Ascenseur -->
              <rect x="25" y="505" width="45" height="40" rx="4" fill="rgba(10,20,50,0.6)" stroke="rgba(0, 242, 254, 0.4)" stroke-width="1.5" />
              <text x="47.5" y="525" class="mye-room-text" style="font-size: 8px; fill:#00f2fe;">ASC ↕️</text>
              
              <!-- Textes de décors -->
              <text x="200" y="675" class="mye-map-decorations" text-anchor="middle">ENTRÉE PRINCIPALE</text>
              <text x="35" y="115" class="mye-floor-label">RDC</text>
            </svg>
          </div>

          <!-- ================= ÉTAGE R+1 ================= -->
          <div class="mye-rooms-floor-layer layer-r1">
            <svg viewBox="0 0 400 700" width="100%" height="100%">
              <!-- Plaque de sol (biseauté bottom-right/left) -->
              <polygon class="mye-building-slab" points="20,120 380,120 380,550 300,660 110,660 20,570" />
              
              <!-- Escalier Nord (Haut Droite) -->
              <path d="M 295,138 L 370,138 M 295,144 L 370,144 M 295,150 L 370,150 M 295,156 L 370,156 M 295,162 L 370,162 M 295,168 L 370,168 M 295,174 L 370,174 M 295,180 L 370,180" stroke="rgba(0, 242, 254, 0.4)" stroke-width="1.5" />
              <!-- Escalier Sud-Ouest (Bas Gauche) -->
              <path d="M 27,559 L 68,559 M 27,563 L 68,563 M 27,567 L 68,567 M 27,571 L 68,571 M 27,575 L 68,575 M 27,579 L 68,579 M 27,583 L 68,583 M 27,587 L 68,587" stroke="rgba(0, 242, 254, 0.4)" stroke-width="1.5" />
              
              <!-- Salles Colonne Gauche -->
              <rect class="mye-room-shape status-orange" data-room="K103" data-floor="R+1" x="25" y="130" width="85" height="120" rx="6" />
              <text x="67.5" y="190" class="mye-room-text">K103</text>
              
              <rect class="mye-room-shape status-orange" data-room="K102" data-floor="R+1" x="25" y="255" width="85" height="125" rx="6" />
              <text x="67.5" y="317.5" class="mye-room-text">K102</text>
              
              <rect class="mye-room-shape status-orange" data-room="K101" data-floor="R+1" x="25" y="385" width="85" height="120" rx="6" />
              <text x="67.5" y="445" class="mye-room-text">K101</text>
              
              <!-- Salles Colonne Milieu (Rallongée) -->
              <rect class="mye-room-shape status-orange" data-room="K1T2" data-floor="R+1" x="145" y="130" width="55" height="35" rx="4" />
              <text x="172.5" y="147.5" class="mye-room-text" style="font-size: 7px;">K1T2</text>
              
              <rect class="mye-room-shape status-orange" data-room="K121" data-floor="R+1" x="145" y="170" width="110" height="40" rx="4" />
              <text x="200" y="190" class="mye-room-text">K121</text>
              
              <rect class="mye-room-shape status-orange" data-room="K120" data-floor="R+1" x="145" y="215" width="110" height="40" rx="4" />
              <text x="200" y="235" class="mye-room-text">K120</text>
              
              <rect class="mye-room-shape status-orange" data-room="K119" data-floor="R+1" x="145" y="260" width="110" height="40" rx="4" />
              <text x="200" y="280" class="mye-room-text">K119</text>
              
              <rect class="mye-room-shape status-orange" data-room="K118" data-floor="R+1" x="145" y="305" width="110" height="40" rx="4" />
              <text x="200" y="325" class="mye-room-text">K118</text>
              
              <rect class="mye-room-shape status-orange" data-room="K117" data-floor="R+1" x="145" y="350" width="110" height="40" rx="4" />
              <text x="200" y="370" class="mye-room-text">K117</text>
              
              <rect class="mye-room-shape status-orange" data-room="K116" data-floor="R+1" x="145" y="395" width="110" height="30" rx="4" />
              <text x="200" y="410" class="mye-room-text">K116</text>
              
              <rect class="mye-room-shape status-orange" data-room="K114" data-floor="R+1" x="145" y="430" width="52" height="30" rx="4" />
              <text x="171" y="445" class="mye-room-text" style="font-size: 7px;">K114</text>
              
              <rect class="mye-room-shape status-orange" data-room="K115" data-floor="R+1" x="203" y="430" width="52" height="30" rx="4" />
              <text x="229" y="445" class="mye-room-text" style="font-size: 7px;">K115</text>
              
              <rect class="mye-room-shape status-orange" data-room="K112" data-floor="R+1" x="145" y="465" width="110" height="70" rx="6" />
              <text x="200" y="500" class="mye-room-text">K112</text>
              
              <rect class="mye-room-shape status-orange" data-room="K111" data-floor="R+1" x="145" y="540" width="52" height="30" rx="4" />
              <text x="171" y="555" class="mye-room-text" style="font-size: 7px;">K111</text>
              
              <rect class="mye-room-shape status-orange" data-room="K112" data-floor="R+1" x="203" y="540" width="52" height="30" rx="4" />
              <text x="229" y="555" class="mye-room-text" style="font-size: 7px;">K112</text>
              
              <!-- Salles Colonne Droite -->
              <rect class="mye-room-shape status-orange" data-room="K104" data-floor="R+1" x="290" y="200" width="85" height="80" rx="6" />
              <text x="332.5" y="240" class="mye-room-text">K104</text>
              
              <rect class="mye-room-shape status-orange" data-room="K105" data-floor="R+1" x="290" y="285" width="85" height="60" rx="6" />
              <text x="332.5" y="315" class="mye-room-text">K105</text>
              
              <rect class="mye-room-shape status-orange" data-room="K106" data-floor="R+1" x="290" y="350" width="85" height="60" rx="6" />
              <text x="332.5" y="380" class="mye-room-text">K106</text>
              
              <rect class="mye-room-shape status-orange" data-room="K107" data-floor="R+1" x="290" y="415" width="85" height="55" rx="6" />
              <text x="332.5" y="442.5" class="mye-room-text">K107</text>
              
              <!-- Sanitaires R+1 (Même emplacement qu'au RDC) -->
              <rect class="mye-room-shape status-orange" data-room="WC Hommes" data-floor="R+1" x="290" y="475" width="85" height="40" rx="6" />
              <text x="332.5" y="495" class="mye-room-text">WC 🚹</text>
              
              <rect class="mye-room-shape status-orange" data-room="WC Femmes" data-floor="R+1" x="290" y="520" width="85" height="40" rx="6" />
              <text x="332.5" y="540" class="mye-room-text">WC 🚺</text>
              
              <!-- Slanted Bottom Section -->
              <!-- Bureaux & Salles techniques R+1 -->
              <rect class="mye-room-shape status-orange" data-room="K110" data-floor="R+1" x="75" y="560" width="40" height="35" rx="6" />
              <text x="95" y="577.5" class="mye-room-text">K110</text>
              
              <rect class="mye-room-shape status-orange" data-room="K109" data-floor="R+1" x="120" y="590" width="115" height="55" rx="6" />
              <text x="177.5" y="613" class="mye-room-text" style="font-size: 8px;">BUREAU</text>
              <text x="177.5" y="623" class="mye-room-text" style="font-size: 8px;">K109</text>
              
              <rect class="mye-room-shape status-orange" data-room="K108" data-floor="R+1" x="240" y="595" width="70" height="50" rx="6" />
              <text x="275" y="615" class="mye-room-text" style="font-size: 8px;">BUREAU</text>
              <text x="275" y="625" class="mye-room-text" style="font-size: 8px;">K108</text>
              
              <!-- Salles K1Tx en bas à droite -->
              <rect class="mye-room-shape status-orange" data-room="K1T3" data-floor="R+1" x="285" y="565" width="35" height="25" rx="4" />
              <text x="302.5" y="577.5" class="mye-room-text" style="font-size: 6.5px;">K1T3</text>
              
              <rect class="mye-room-shape status-orange" data-room="K1T4" data-floor="R+1" x="325" y="565" width="35" height="25" rx="4" />
              <text x="342.5" y="577.5" class="mye-room-text" style="font-size: 6.5px;">K1T4</text>
              
              <rect class="mye-room-shape status-orange" data-room="K1T5" data-floor="R+1" x="315" y="595" width="50" height="45" rx="4" />
              <text x="340" y="617.5" class="mye-room-text" style="font-size: 7.5px;">K1T5</text>
              
              <!-- Ascenseur -->
              <rect x="25" y="510" width="45" height="40" rx="4" fill="rgba(10,20,50,0.6)" stroke="rgba(0, 242, 254, 0.4)" stroke-width="1.5" />
              <text x="47.5" y="530" class="mye-room-text" style="font-size: 8px; fill:#00f2fe;">ASC ↕️</text>
              
              <text x="35" y="115" class="mye-floor-label">R+1</text>
            </svg>
          </div>

        </div>
      </div>
    `;

    setup3DControlsAndDrag();
  }

  // ──────────────────────────────────────────────
  // EVENEMENTS & LOGIQUE DU PLAN 3D
  // ──────────────────────────────────────────────
  function setup3DControlsAndDrag() {
    const viewport = document.getElementById('mye-rooms-3d-viewport');
    const building = document.getElementById('mye-rooms-3d-building');
    const tooltip = document.getElementById('mye-room-tooltip');
    
    if (!viewport || !building) return;

    // 1. Logique de drag rotation & zoom
    let rotateX = 60;
    let rotateZ = -45;
    let zoom = window.innerWidth <= 900 ? 0.75 : 1.0;
    let isDragging = false;
    let startX, startY;
    let initialTouchDist = null;
    let initialZoom = 1.0;

    // Appliquer le zoom initial
    building.style.setProperty('--zoom', zoom);

    viewport.addEventListener('mousedown', (e) => {
      if (e.target.closest('.mye-rooms-3d-controls') || e.target.closest('.mye-rooms-search-container') || e.target.closest('.mye-room-shape')) {
        return;
      }
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      viewport.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      rotateZ += dx * 0.5;
      rotateX = Math.max(30, Math.min(85, rotateX - dy * 0.5));

      startX = e.clientX;
      startY = e.clientY;

      building.style.setProperty('--rotate-x', `${rotateX}deg`);
      building.style.setProperty('--rotate-z', `${rotateZ}deg`);
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        viewport.style.cursor = 'grab';
      }
    });

    // Zoom via molette de la souris
    viewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 0.05 : -0.05;
      zoom = Math.max(0.4, Math.min(3.0, zoom + zoomFactor));
      building.style.setProperty('--zoom', zoom);
    }, { passive: false });

    // Touch Support (Drag & Pinch-to-zoom)
    viewport.addEventListener('touchstart', (e) => {
      if (e.target.closest('.mye-rooms-3d-controls') || e.target.closest('.mye-rooms-search-container') || e.target.closest('.mye-room-shape')) {
        return;
      }
      if (e.touches.length === 1) {
        isDragging = true;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        isDragging = false;
        initialTouchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        initialZoom = zoom;
      }
    });

    document.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2 && initialTouchDist !== null) {
        e.preventDefault();
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const factor = dist / initialTouchDist;
        zoom = Math.max(0.4, Math.min(3.0, initialZoom * factor));
        building.style.setProperty('--zoom', zoom);
      } else if (isDragging && e.touches.length === 1) {
        const dx = e.touches[0].clientX - startX;
        const dy = e.touches[0].clientY - startY;

        rotateZ += dx * 0.5;
        rotateX = Math.max(30, Math.min(85, rotateX - dy * 0.5));

        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;

        building.style.setProperty('--rotate-x', `${rotateX}deg`);
        building.style.setProperty('--rotate-z', `${rotateZ}deg`);
      }
    }, { passive: false });

    document.addEventListener('touchend', (e) => {
      isDragging = false;
      if (e.touches.length < 2) {
        initialTouchDist = null;
      }
    });

    // 2. Contrôles d'étage et zoom boutons
    const btnStack = document.getElementById('mye-btn-3d-stack');
    const btnRdc = document.getElementById('mye-btn-3d-rdc');
    const btnR1 = document.getElementById('mye-btn-3d-r1');
    const btnReset = document.getElementById('mye-rooms-reset-btn');
    const btnZoomIn = document.getElementById('mye-btn-3d-zoom-in');
    const btnZoomOut = document.getElementById('mye-btn-3d-zoom-out');

    const updateActiveBtn = (activeBtn) => {
      [btnStack, btnRdc, btnR1].forEach(b => b.classList.remove('active'));
      activeBtn.classList.add('active');
    };

    if (btnStack) {
      btnStack.addEventListener('click', () => {
        building.className = 'mye-rooms-3d-building';
        updateActiveBtn(btnStack);
      });
    }

    if (btnRdc) {
      btnRdc.addEventListener('click', () => {
        building.className = 'mye-rooms-3d-building focus-rdc';
        updateActiveBtn(btnRdc);
      });
    }

    if (btnR1) {
      btnR1.addEventListener('click', () => {
        building.className = 'mye-rooms-3d-building focus-r1';
        updateActiveBtn(btnR1);
      });
    }

    if (btnZoomIn) {
      btnZoomIn.addEventListener('click', (e) => {
        e.stopPropagation();
        zoom = Math.min(3.0, zoom + 0.15);
        building.style.setProperty('--zoom', zoom);
      });
    }

    if (btnZoomOut) {
      btnZoomOut.addEventListener('click', (e) => {
        e.stopPropagation();
        zoom = Math.max(0.4, zoom - 0.15);
        building.style.setProperty('--zoom', zoom);
      });
    }

    if (btnReset) {
      btnReset.addEventListener('click', () => {
        rotateX = 60;
        rotateZ = -45;
        zoom = window.innerWidth <= 900 ? 0.75 : 1.0;
        building.style.setProperty('--rotate-x', '60deg');
        building.style.setProperty('--rotate-z', '-45deg');
        building.style.setProperty('--zoom', zoom);
      });
    }

    // 3. Info-bulles et clicks sur les salles
    const shapes = building.querySelectorAll('.mye-room-shape');
    const tooltipTitle = document.getElementById('mye-room-tooltip-title');
    const tooltipFloor = document.getElementById('mye-room-tooltip-floor');
    const tooltipStatus = document.getElementById('mye-room-tooltip-status');

    shapes.forEach(shape => {
      shape.addEventListener('mousemove', (e) => {
        const roomName = shape.getAttribute('data-room');
        const floor = shape.getAttribute('data-floor');
        
        let statusText = "Inconnu";
        let statusClass = "orange";
        if (shape.classList.contains('status-green')) {
          statusText = "Libre";
          statusClass = "green";
        } else if (shape.classList.contains('status-red')) {
          statusText = "Occupé";
          statusClass = "red";
        }

        tooltipTitle.textContent = `Salle ${roomName}`;
        tooltipFloor.textContent = floor;
        tooltipStatus.textContent = statusText;
        tooltipStatus.className = `mye-room-tooltip-status ${statusClass}`;

        const rect = viewport.getBoundingClientRect();
        const x = e.clientX - rect.left + 15;
        const y = e.clientY - rect.top + 15;

        tooltip.style.left = `${x}px`;
        tooltip.style.top = `${y}px`;
        tooltip.style.display = 'flex';
      });

      shape.addEventListener('mouseleave', () => {
        tooltip.style.display = 'none';
      });

      // Simulation de changement d'état au clic
      shape.addEventListener('click', (e) => {
        e.stopPropagation();
        if (shape.classList.contains('status-orange')) {
          shape.classList.remove('status-orange');
          shape.classList.add('status-green');
        } else if (shape.classList.contains('status-green')) {
          shape.classList.remove('status-green');
          shape.classList.add('status-red');
        } else if (shape.classList.contains('status-red')) {
          shape.classList.remove('status-red');
          shape.classList.add('status-orange');
        }

        // Mettre à jour l'info-bulle immédiatement
        const event = new MouseEvent('mousemove', {
          clientX: e.clientX,
          clientY: e.clientY,
          bubbles: true
        });
        shape.dispatchEvent(event);
      });
    });

    // 4. Recherche de salle
    const searchInput = document.getElementById('mye-rooms-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim().toUpperCase();
        if (query) {
          building.classList.add('searching');
        } else {
          building.classList.remove('searching');
        }
        shapes.forEach(shape => {
          const roomName = shape.getAttribute('data-room').toUpperCase();
          if (query && roomName.includes(query)) {
            shape.classList.add('mye-room-highlighted');
          } else {
            shape.classList.remove('mye-room-highlighted');
          }
        });
      });
    }
  }

  // ──────────────────────────────────────────────
  // HOOKS DE NAVIGATION ET SURVEILLANCE DE ROUTE
  // ──────────────────────────────────────────────
  function waitAndInit() {
    // S'assurer que le header personnalisé ou l'interface de base est présent
    const checkHeader = setInterval(() => {
      if (document.getElementById('mye-custom-header-wrapper') || document.getElementById('mye-custom-header')) {
        clearInterval(checkHeader);
        if (!document.getElementById('mye-rooms-container')) {
          setTimeout(init, 100);
        }
      }
    }, 100);

    setTimeout(() => {
      clearInterval(checkHeader);
      if (!document.getElementById('mye-rooms-container')) {
        init();
      }
    }, 3000);
  }

  // Lancement initial
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (window.location.pathname.includes('/available-rooms')) {
        waitAndInit();
      }
    });
  } else {
    if (window.location.pathname.includes('/available-rooms')) {
      waitAndInit();
    }
  }

  // Surveiller les changements d'URL pour le SPA Angular
  let lastUrl = window.location.href;
  setInterval(() => {
    if (lastUrl !== window.location.href) {
      lastUrl = window.location.href;

      if (window.location.pathname.includes('/available-rooms')) {
        if (!document.getElementById('mye-rooms-container')) {
          waitAndInit();
        }
      } else {
        // Nettoyer la page si on quitte le module
        const container = document.getElementById('mye-rooms-container');
        if (container) container.remove();

        document.body.classList.remove('mye-clean-screen');
        document.body.classList.remove('mye-rooms-page');
      }
    }
  }, 300);

})();
