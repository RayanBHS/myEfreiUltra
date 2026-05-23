(function() {
  'use strict';
  
  const style = document.createElement('style');
  style.textContent = `
    @font-face {
      font-family: 'Alliance No.2';
      src: url('${chrome.runtime.getURL("Police/Alliance No.2 Bold.otf")}') format('opentype');
      font-weight: 700;
      font-style: normal;
    }
    @font-face {
      font-family: 'Alliance No.2';
      src: url('${chrome.runtime.getURL("Police/Alliance No.2 Regular.otf")}') format('opentype');
      font-weight: 400;
      font-style: normal;
    }
    @font-face {
      font-family: 'Alliance No.2 Bold';
      src: url('${chrome.runtime.getURL("Police/Alliance No.2 Bold.otf")}') format('opentype');
      font-weight: 700;
      font-style: normal;
    }
    @font-face {
      font-family: 'Alliance No.2 Regular';
      src: url('${chrome.runtime.getURL("Police/Alliance No.2 Regular.otf")}') format('opentype');
      font-weight: 400;
      font-style: normal;
    }
  `;
  document.documentElement.appendChild(style);
})();
