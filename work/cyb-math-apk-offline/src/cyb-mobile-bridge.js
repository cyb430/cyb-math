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
    if (blob.size > 50 * 1024 * 1024) throw new Error('Export exceeds 50 MB limit');
    var base64 = await blobToBase64(blob);
    var plugin = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.FileSaver;
    if (!plugin) throw new Error('Android file saver is unavailable');
    var result = await plugin.save({
      fileName: anchor.download || 'CYB-Math-export',
      mimeType: blob.type || 'application/octet-stream',
      base64: base64
    });
    exportMessage(result && result.canceled ? 'canceled' : 'saved');
    return result;
  }

  function exportMessage(kind) {
    var language = document.documentElement.lang;
    var messages = /^en/i.test(language)
      ? { saved: 'File saved', canceled: 'Save canceled', failed: 'Export failed. Please try again.' }
      : /Hant|TW|HK/i.test(language)
        ? { saved: '檔案已儲存', canceled: '已取消儲存', failed: '匯出失敗，請重試。' }
        : { saved: '文件已保存', canceled: '已取消保存', failed: '导出失败，请重试。' };
    var status = document.getElementById('cyb-mobile-export-status');
    if (!status) {
      status = document.createElement('div');
      status.id = 'cyb-mobile-export-status';
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      status.setAttribute('data-cyb-i18n-ignore', '');
      status.style.cssText = 'position:fixed;left:16px;right:16px;bottom:24px;z-index:2147483647;padding:12px 16px;border-radius:8px;background:#202228;color:#fff;font:14px/1.5 system-ui,sans-serif;pointer-events:none';
      document.body.appendChild(status);
    }
    clearTimeout(exportMessage.timer);
    status.textContent = messages[kind];
    status.hidden = false;
    exportMessage.timer = setTimeout(function () { status.hidden = true; }, 3500);
  }

  function exportFailed(error) {
    console.error('CYB Math export failed', error);
    exportMessage('failed');
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
      saveNativeDownload(anchor).catch(exportFailed);
    }, true);
    activateNativeHost();
  }

  function activateNativeHost() {
    var host = window.Capacitor && window.Capacitor.isNativePlatform?.() && window.Capacitor.Plugins?.AppHost;
    if (!host) return;
    document.documentElement.dataset.cybNativeHost = 'android';
    var style = document.createElement('style');
    style.textContent = '#cyb-suite-bar,html[data-cyb-site="cyb-math"] .topbar{display:none!important} body:has(#cyb-suite-bar){padding-top:0!important} input[type=text],textarea{scroll-margin-bottom:60px}';
    document.head.appendChild(style);
    function pageState() {
      var file = location.pathname.split('/').pop() || 'index.html';
      host.pageState({ file: file, language: document.documentElement.lang, dark: document.documentElement.dataset.theme === 'dark' || document.body.classList.contains('dark') }).then(function (response) {
        if (response?.project) window.CYBSession.stage(response.project);
      }).catch(exportFailed);
    }
    window.addEventListener('cyb-editor-state', function (event) { host.editorState(event.detail).catch(function () {}); });
    document.addEventListener('change', function (event) { if (event.target.closest('#cyb-language-switcher')) setTimeout(pageState, 50); });
    new MutationObserver(pageState).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'lang'] });
    var share = function (data) { return host.share({ text: [data.title, data.text, data.url].filter(Boolean).join('\n') }); };
    try { Object.defineProperty(navigator, 'share', { configurable: true, value: share }); } catch (_) {}
    var siteToFile = Object.fromEntries(Object.keys(fileToWeb).map(function (file) { return [file === 'index.html' ? 'cyb-math' : file === 'math-geometry-theorems.html' ? 'math-geometry' : file.replace(/\.html$/, ''), file]; }));
    window.CYBApp = {
      saveProject: async function () {
        try {
          var raw = window.CYBSession.snapshot();
          var blob = new Blob([raw], { type: 'application/json' });
          var result = await window.Capacitor.Plugins.FileSaver.save({ fileName: 'CYB-Math.cybmath.json', mimeType: blob.type, base64: await blobToBase64(blob) });
          exportMessage(result.canceled ? 'canceled' : 'saved');
        } catch (error) { exportFailed(error); }
      },
      openProject: async function () {
        try {
          var result = await host.openProject();
          if (result.canceled) return;
          var data = window.CYBSession.validate(result.raw);
          if (data.site === document.documentElement.dataset.cybSite) window.CYBSession.stage(result.raw);
          else await host.handoff({ file: siteToFile[data.site], raw: result.raw });
        } catch (error) { exportFailed(error); }
      },
      share: function () {
        var button = document.querySelector('#cyb-suite-share, #shareBtn, #btn-share, #fabShare');
        if (button) button.click();
        else share({ title: document.title, url: officialPageUrl() }).catch(exportFailed);
      },
      closeOverlay: function () {
        var overlay = Array.from(document.querySelectorAll('[role=dialog],.modal,.dialog-overlay,.overlay,#helpPanel,#helpModal,#help-modal,#welcomeOverlay')).find(function (el) { return !el.hidden && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 50; });
        if (!overlay) return false;
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        if (!overlay.hidden && getComputedStyle(overlay).display !== 'none') {
          var close = overlay.querySelector('button[id*="lose"],button[class*="close"],[data-close]');
          if (close) close.click(); else return false;
        }
        return true;
      }
    };
    setTimeout(pageState, 200);
  }

  var nativeAnchorClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (!isNativeDownload(this)) return nativeAnchorClick.call(this);
    saveNativeDownload(this).catch(exportFailed);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', activate, { once: true });
  else activate();
})();
