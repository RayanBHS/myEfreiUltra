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
          <span class="mye-rooms-search-icon">🔍</span>
        </div>

        <!-- Contrôleurs d'étages et angle -->
        <div class="mye-rooms-3d-controls">
          <button class="mye-rooms-reset-btn" id="mye-rooms-reset-btn">Réinitialiser la vue</button>
          <div class="mye-rooms-3d-btn-group">
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
              <!-- Plaque de sol -->
              <polygon class="mye-building-slab" points="15,120 385,120 385,570 290,660 110,660 15,570" />
              
              <!-- Escalier Nord (Haut Droite) -->
              <path d="M 290,140 L 375,140 M 290,150 L 375,150 M 290,160 L 375,160 M 290,170 L 375,170" stroke="rgba(0, 242, 254, 0.4)" stroke-width="2" />
              <!-- Escalier Sud-Ouest (Bas Gauche) -->
              <path d="M 30,500 L 75,500 M 30,510 L 75,510 M 30,520 L 75,520 M 30,530 L 75,530" stroke="rgba(0, 242, 254, 0.4)" stroke-width="2" />
              
              <!-- Salles Colonne Gauche -->
              <rect class="mye-room-shape status-orange" data-room="K004" data-floor="RDC" x="25" y="130" width="80" height="75" rx="6" />
              <text x="65" y="167" class="mye-room-text">K004</text>
              
              <rect class="mye-room-shape status-orange" data-room="K003" data-floor="RDC" x="25" y="215" width="80" height="75" rx="6" />
              <text x="65" y="252" class="mye-room-text">K003</text>
              
              <rect class="mye-room-shape status-orange" data-room="K002" data-floor="RDC" x="25" y="300" width="80" height="75" rx="6" />
              <text x="65" y="337" class="mye-room-text">K002</text>
              
              <rect class="mye-room-shape status-orange" data-room="K001" data-floor="RDC" x="25" y="385" width="80" height="95" rx="6" />
              <text x="65" y="432" class="mye-room-text">K001</text>
              
              <!-- Salles Colonne Milieu -->
              <rect class="mye-room-shape status-orange" data-room="K005" data-floor="RDC" x="115" y="130" width="105" height="55" rx="6" />
              <text x="167" y="157" class="mye-room-text">K005</text>
              
              <rect class="mye-room-shape status-orange" data-room="K013" data-floor="RDC" x="120" y="215" width="150" height="120" rx="6" />
              <text x="195" y="275" class="mye-room-text">K013</text>
              
              <rect class="mye-room-shape status-orange" data-room="K012" data-floor="RDC" x="120" y="345" width="150" height="60" rx="6" />
              <text x="195" y="375" class="mye-room-text">K012</text>
              
              <rect class="mye-room-shape status-orange" data-room="K011" data-floor="RDC" x="120" y="415" width="150" height="135" rx="6" />
              <text x="195" y="482" class="mye-room-text">K011</text>
              
              <!-- Salles Colonne Droite -->
              <rect class="mye-room-shape status-orange" data-room="K006" data-floor="RDC" x="290" y="200" width="85" height="75" rx="6" />
              <text x="332" y="237" class="mye-room-text">K006</text>
              
              <rect class="mye-room-shape status-orange" data-room="K007" data-floor="RDC" x="290" y="285" width="85" height="75" rx="6" />
              <text x="332" y="322" class="mye-room-text">K007</text>
              
              <rect class="mye-room-shape status-orange" data-room="K008" data-floor="RDC" x="290" y="370" width="85" height="75" rx="6" />
              <text x="332" y="407" class="mye-room-text">K008</text>
              
              <!-- Blocs W.C & Accueil & Gardien -->
              <rect class="mye-room-shape status-orange" data-room="Sanitaires H" data-floor="RDC" x="290" y="465" width="85" height="55" rx="6" />
              <text x="332" y="492" class="mye-room-text">WC 🚹</text>
              
              <rect class="mye-room-shape status-orange" data-room="Sanitaires F" data-floor="RDC" x="290" y="530" width="85" height="55" rx="6" />
              <text x="332" y="557" class="mye-room-text">WC 🚺</text>
              
              <circle class="mye-room-shape status-orange" data-room="ACCUEIL" data-floor="RDC" cx="200" cy="590" r="32" />
              <text x="200" y="590" class="mye-room-text" style="font-size: 8px;">ACCUEIL</text>
              
              <rect class="mye-room-shape status-orange" data-room="GARDIEN" data-floor="RDC" x="290" y="595" width="85" height="50" rx="6" />
              <text x="332" y="620" class="mye-room-text" style="font-size: 9px;">GARDIEN</text>
              
              <rect class="mye-room-shape status-orange" data-room="KOT4" data-floor="RDC" x="225" y="130" width="45" height="30" rx="4" />
              <text x="247" y="145" class="mye-room-text" style="font-size: 8px;">KOT4</text>
              
              <!-- Ascenseur -->
              <rect x="25" y="555" width="55" height="35" rx="4" fill="rgba(10,20,50,0.6)" stroke="rgba(0, 242, 254, 0.4)" stroke-width="1.5" />
              <text x="52" y="572" class="mye-room-text" style="font-size: 8px; fill:#00f2fe;">ASC ↕️</text>
              
              <!-- Textes de décors -->
              <text x="200" y="660" class="mye-map-decorations" text-anchor="middle">ENTRÉE PRINCIPALE</text>
              <text x="35" y="115" class="mye-floor-label">RDC</text>
            </svg>
          </div>

          <!-- ================= ÉTAGE R+1 ================= -->
          <div class="mye-rooms-floor-layer layer-r1">
            <svg viewBox="0 0 400 700" width="100%" height="100%">
              <!-- Plaque de sol -->
              <polygon class="mye-building-slab" points="15,120 385,120 385,570 290,660 110,660 15,570" />
              
              <!-- Escalier Nord (Haut Droite) -->
              <path d="M 290,140 L 375,140 M 290,150 L 375,150 M 290,160 L 375,160 M 290,170 L 375,170" stroke="rgba(0, 242, 254, 0.4)" stroke-width="2" />
              <!-- Escalier Sud-Ouest (Bas Gauche) -->
              <path d="M 30,540 L 75,540 M 30,550 L 75,550 M 30,560 L 75,560" stroke="rgba(0, 242, 254, 0.4)" stroke-width="2" />
              
              <!-- Salles Colonne Gauche -->
              <rect class="mye-room-shape status-orange" data-room="K103" data-floor="R+1" x="25" y="130" width="100" height="120" rx="6" />
              <text x="75" y="190" class="mye-room-text">K103</text>
              
              <rect class="mye-room-shape status-orange" data-room="K102" data-floor="R+1" x="25" y="260" width="100" height="125" rx="6" />
              <text x="75" y="322" class="mye-room-text">K102</text>
              
              <rect class="mye-room-shape status-orange" data-room="K101" data-floor="R+1" x="25" y="395" width="100" height="130" rx="6" />
              <text x="75" y="460" class="mye-room-text">K101</text>
              
              <!-- Salles Colonne Milieu (Rallongée) -->
              <rect class="mye-room-shape status-orange" data-room="K121" data-floor="R+1" x="175" y="145" width="70" height="40" rx="4" />
              <text x="210" y="165" class="mye-room-text">K121</text>

              <rect class="mye-room-shape status-orange" data-room="K120" data-floor="R+1" x="175" y="195" width="70" height="40" rx="4" />
              <text x="210" y="215" class="mye-room-text">K120</text>
              
              <rect class="mye-room-shape status-orange" data-room="K119" data-floor="R+1" x="175" y="245" width="70" height="40" rx="4" />
              <text x="210" y="265" class="mye-room-text">K119</text>
              
              <rect class="mye-room-shape status-orange" data-room="K118" data-floor="R+1" x="175" y="295" width="70" height="40" rx="4" />
              <text x="210" y="315" class="mye-room-text">K118</text>
              
              <rect class="mye-room-shape status-orange" data-room="K117" data-floor="R+1" x="175" y="345" width="70" height="30" rx="4" />
              <text x="210" y="360" class="mye-room-text">K117</text>
              
              <rect class="mye-room-shape status-orange" data-room="K116" data-floor="R+1" x="175" y="380" width="70" height="25" rx="4" />
              <text x="210" y="392" class="mye-room-text">K116</text>
              
              <rect class="mye-room-shape status-orange" data-room="K114" data-floor="R+1" x="175" y="415" width="32" height="25" rx="4" />
              <text x="191" y="427" class="mye-room-text" style="font-size:7px;">K114</text>
              
              <rect class="mye-room-shape status-orange" data-room="K115" data-floor="R+1" x="212" y="415" width="32" height="25" rx="4" />
              <text x="228" y="427" class="mye-room-text" style="font-size:7px;">K115</text>
              
              <rect class="mye-room-shape status-orange" data-room="K112" data-floor="R+1" x="175" y="450" width="70" height="70" rx="6" />
              <text x="210" y="485" class="mye-room-text">K112</text>
              
              <rect class="mye-room-shape status-orange" data-room="K111" data-floor="R+1" x="175" y="530" width="32" height="25" rx="4" />
              <text x="191" y="542" class="mye-room-text" style="font-size:7px;">K111</text>
              
              <rect class="mye-room-shape status-orange" data-room="K112" data-floor="R+1" x="212" y="530" width="32" height="25" rx="4" />
              <text x="228" y="542" class="mye-room-text" style="font-size:7px;">K112</text>
              
              <!-- Salles Colonne Droite -->
              <rect class="mye-room-shape status-orange" data-room="K104" data-floor="R+1" x="290" y="125" width="85" height="75" rx="6" />
              <text x="332" y="162" class="mye-room-text">K104</text>
              
              <rect class="mye-room-shape status-orange" data-room="K105" data-floor="R+1" x="290" y="210" width="85" height="60" rx="6" />
              <text x="332" y="240" class="mye-room-text">K105</text>
              
              <rect class="mye-room-shape status-orange" data-room="K106" data-floor="R+1" x="290" y="280" width="85" height="60" rx="6" />
              <text x="332" y="310" class="mye-room-text">K106</text>
              
              <rect class="mye-room-shape status-orange" data-room="K107" data-floor="R+1" x="290" y="350" width="85" height="55" rx="6" />
              <text x="332" y="377" class="mye-room-text">K107</text>
              
              <!-- Sanitaires R+1 -->
              <rect class="mye-room-shape status-orange" data-room="Sanitaires R+1 H" data-floor="R+1" x="290" y="415" width="85" height="50" rx="6" />
              <text x="332" y="440" class="mye-room-text">WC 🚹</text>
              
              <rect class="mye-room-shape status-orange" data-room="Sanitaires R+1 F" data-floor="R+1" x="290" y="475" width="85" height="50" rx="6" />
              <text x="332" y="500" class="mye-room-text">WC 🚺</text>
              
              <!-- Bureaux Slant Bas -->
              <rect class="mye-room-shape status-orange" data-room="K110" data-floor="R+1" x="25" y="560" width="80" height="45" rx="6" />
              <text x="65" y="582" class="mye-room-text">K110</text>
              
              <rect class="mye-room-shape status-orange" data-room="K109" data-floor="R+1" x="115" y="585" width="130" height="65" rx="6" />
              <text x="180" y="617" class="mye-room-text" style="font-size: 9px;">BUREAU K109</text>
              
              <rect class="mye-room-shape status-orange" data-room="K108" data-floor="R+1" x="255" y="595" width="120" height="55" rx="6" />
              <text x="315" y="622" class="mye-room-text" style="font-size: 9px;">BUREAU K108</text>
              
              <!-- Ascenseur -->
              <rect x="25" y="555" width="55" height="35" rx="4" fill="rgba(10,20,50,0.6)" stroke="rgba(0, 242, 254, 0.4)" stroke-width="1.5" />
              <text x="52" y="572" class="mye-room-text" style="font-size: 8px; fill:#00f2fe;">ASC ↕️</text>
              
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

    // 1. Logique de drag rotation
    let rotateX = 60;
    let rotateZ = -45;
    let isDragging = false;
    let startX, startY;

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

    // Touch Support
    viewport.addEventListener('touchstart', (e) => {
      if (e.target.closest('.mye-rooms-3d-controls') || e.target.closest('.mye-rooms-search-container') || e.target.closest('.mye-room-shape')) {
        return;
      }
      if (e.touches.length === 1) {
        isDragging = true;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      }
    });

    document.addEventListener('touchmove', (e) => {
      if (!isDragging || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;

      rotateZ += dx * 0.5;
      rotateX = Math.max(30, Math.min(85, rotateX - dy * 0.5));

      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;

      building.style.setProperty('--rotate-x', `${rotateX}deg`);
      building.style.setProperty('--rotate-z', `${rotateZ}deg`);
    });

    document.addEventListener('touchend', () => {
      isDragging = false;
    });

    // 2. Contrôles d'étage
    const btnStack = document.getElementById('mye-btn-3d-stack');
    const btnRdc = document.getElementById('mye-btn-3d-rdc');
    const btnR1 = document.getElementById('mye-btn-3d-r1');
    const btnReset = document.getElementById('mye-rooms-reset-btn');

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

    if (btnReset) {
      btnReset.addEventListener('click', () => {
        rotateX = 60;
        rotateZ = -45;
        building.style.setProperty('--rotate-x', '60deg');
        building.style.setProperty('--rotate-z', '-45deg');
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
