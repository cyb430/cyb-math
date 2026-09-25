(function () {
  'use strict';

  window.__CYB_MOBILE_BRIDGE__ = true;

  // Android starts in light mode. Once the user chooses a theme, each tool's
  // existing preference key takes precedence and is left untouched.
  var themeKeys = [
    'cyb-theme', 'mf-theme', 'cvz-theme', 'es-theme', 'nt-theme',
    'cyb-math:theme', 'gsp_theme', 'seqTheme', 'plotter-theme',
    'math-latex:theme', 'plot3d-theme', 'algcalc_theme', 'me-theme'
  ];
  try {
    var hasSavedTheme = themeKeys.some(function (key) { return localStorage.getItem(key) !== null; });
    if (!hasSavedTheme) {
      themeKeys.forEach(function (key) { localStorage.setItem(key, 'light'); });
      document.documentElement.setAttribute('data-theme', 'light');
    }
  } catch (_) {
    document.documentElement.setAttribute('data-theme', 'light');
  }

  var hostToFile = Object.freeze({
    'cyb-math.cn': 'index.html',
    'cyb-math.pages.dev': 'index.html',
    'tools.cyb-math.cn': 'math-tools-pro.html',
    'math-tools-pro.pages.dev': 'math-tools-pro.html',
    'plotter.cyb-math.cn': 'math-plotter.html',
    'math-plotter.pages.dev': 'math-plotter.html',
    'complex.cyb-math.cn': 'math-complex.html',
    'math-complex.pages.dev': 'math-complex.html',
    'equation.cyb-math.cn': 'math-equation.html',
    'math-equation.pages.dev': 'math-equation.html',
    'geometry.cyb-math.cn': 'math-geometry-theorems.html',
    'math-geometry.pages.dev': 'math-geometry-theorems.html',
    'algebra.cyb-math.cn': 'math-algebra.html',
    'math-algebra.pages.dev': 'math-algebra.html',
    'linear.cyb-math.cn': 'math-linear.html',
    'math-linear.pages.dev': 'math-linear.html',
    '3d.cyb-math.cn': 'math-3d.html',
    'math-3d.pages.dev': 'math-3d.html',
    'theory.cyb-math.cn': 'math-theory.html',
    'math-theory.pages.dev': 'math-theory.html',
    'sequence.cyb-math.cn': 'math-sequence.html',
    'math-sequence.pages.dev': 'math-sequence.html',
    'latex.cyb-math.cn': 'math-latex.html',
    'math-latex.pages.dev': 'math-latex.html',
    'fourier.cyb-math.cn': 'math-fourier.html',
    'math-fourier.pages.dev': 'math-fourier.html'
  });

  var fileToWeb = Object.freeze({
    'index.html': 'https://cyb-math.cn/',
    'math-tools-pro.html': 'https://tools.cyb-math.cn/',
    'math-plotter.html': 'https://plotter.cyb-math.cn/',
    'math-complex.html': 'https://complex.cyb-math.cn/',
    'math-equation.html': 'https://equation.cyb-math.cn/',
    'math-geometry-theorems.html': 'https://geometry.cyb-math.cn/',
    'math-algebra.html': 'https://algebra.cyb-math.cn/',
    'math-linear.html': 'https://linear.cyb-math.cn/',
    'math-3d.html': 'https://3d.cyb-math.cn/',
    'math-theory.html': 'https://theory.cyb-math.cn/',
    'math-sequence.html': 'https://sequence.cyb-math.cn/',
    'math-latex.html': 'https://latex.cyb-math.cn/',
    'math-fourier.html': 'https://fourier.cyb-math.cn/'
  });

  function toLocal(raw) {
    try {
      var parsed = new URL(raw, location.href);
      var file = hostToFile[parsed.hostname.toLowerCase()];
      if (!file) return null;
      return file + parsed.search + parsed.hash;
    } catch (_) {
      return null;
    }
  }

  function rewriteOne(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return;
    if (element.matches('a[href]')) {
      var anchorTarget = toLocal(element.getAttribute('href'));
      if (anchorTarget) element.setAttribute('href', anchorTarget);
    }
    if (element.matches('option[value]')) {
      var optionTarget = toLocal(element.getAttribute('value'));
      if (optionTarget) element.setAttribute('value', optionTarget);
    }
  }

  function rewriteElement(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return;
    rewriteOne(element);
    element.querySelectorAll('a[href], option[value]').forEach(rewriteOne);
  }

  function officialPageUrl() {
    var file = location.pathname.split('/').pop() || 'index.html';
    var base = fileToWeb[file] || 'https://cyb-math.cn/';
    return base + location.search + location.hash;
  }

  function isNativeDownload(anchor) {
    if (!anchor || !anchor.hasAttribute('download')) return false;
    var href = anchor.getAttribute('href') || '';
    return /^(?:blob:|data:)/i.test(href) && window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();
  }

  function blobToBase64(blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result).split(',')[1] || ''); };
      reader.onerror = function () { reject(reader.error || new Error('Unable to read export data')); };
      reader.readAsDataURL(blob);
    });
  }

  async function saveNativeDownload(anchor) {
    var href = anchor.href;
    var blob = await fetch(href).then(function (response) { return response.blob(); });
    var base64 = await blobToBase64(blob);
    var plugin = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.FileSaver;
    if (!plugin) throw new Error('Android file saver is unavailable');
    return plugin.save({
      fileName: anchor.download || 'CYB-Math-export',
      mimeType: blob.type || 'application/octet-stream',
      base64: base64
    });
  }

  var previousPreferredUrl = window.cybPreferredURL;
  window.cybPreferredURL = function (value) {
    if (value === undefined) return officialPageUrl();
    try {
      var parsed = new URL(value, location.href);
      if (parsed.hostname === 'localhost') return officialPageUrl();
    } catch (_) {}
    return typeof previousPreferredUrl === 'function' ? previousPreferredUrl(value) : value;
  };

  function activate() {
    rewriteElement(document.documentElement);
    new MutationObserver(function (records) {
      records.forEach(function (record) {
        record.addedNodes.forEach(rewriteElement);
      });
    }).observe(document.documentElement, { childList: true, subtree: true });

    document.addEventListener('click', function (event) {
      var anchor = event.target && event.target.closest ? event.target.closest('a[download]') : null;
      if (!isNativeDownload(anchor)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      saveNativeDownload(anchor).catch(function (error) { console.error('CYB Math export failed', error); });
    }, true);
  }

  var nativeAnchorClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (!isNativeDownload(this)) return nativeAnchorClick.call(this);
    saveNativeDownload(this).catch(function (error) { console.error('CYB Math export failed', error); });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', activate, { once: true });
  else activate();
})();
