(function() {
  'use strict';
  if (window.mye_user_enabled_flag === false || localStorage.getItem('mye_user_enabled') === 'false') {
    return;
  }

  document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('/available-rooms')) {
    // Clear everything
    document.body.innerHTML = '';
    document.documentElement.innerHTML = '<head><title>ACCÈS REFUSÉ</title></head><body></body>';
    
    // Add class for styling
    document.body.className = 'mye-restricted-rooms';
    
    // Create new content
    const container = document.createElement('div');
    container.className = 'mye-restricted-container';
    
    const title = document.createElement('h1');
    title.className = 'mye-restricted-title';
    title.textContent = "VOUS N'AVEZ PAS LE DROIT D'ÊTRE LÀ";
    
    const subtitle = document.createElement('p');
    subtitle.className = 'mye-restricted-subtitle';
    subtitle.textContent = "L'accès à cette page a été restreint.";
    
    const backBtn = document.createElement('a');
    backBtn.className = 'mye-restricted-back';
    backBtn.textContent = "Retourner à l'accueil";
    backBtn.href = '/portal/student/dashboard';
    
    container.appendChild(title);
    container.appendChild(subtitle);
    container.appendChild(backBtn);
    
    document.body.appendChild(container);
    }
  });
})();
