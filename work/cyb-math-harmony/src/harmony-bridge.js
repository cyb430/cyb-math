(function () {
  'use strict';
  var callbacks = new Map();
  var next = 0;
  var hosts = { 'cyb-math.cn': 'index.html', 'tools.cyb-math.cn': 'math-tools-pro.html', 'plotter.cyb-math.cn': 'math-plotter.html', 'complex.cyb-math.cn': 'math-complex.html', 'equation.cyb-math.cn': 'math-equation.html', 'geometry.cyb-math.cn': 'math-geometry-theorems.html', 'algebra.cyb-math.cn': 'math-algebra.html', 'linear.cyb-math.cn': 'math-linear.html', '3d.cyb-math.cn': 'math-3d.html', 'theory.cyb-math.cn': 'math-theory.html', 'sequence.cyb-math.cn': 'math-sequence.html', 'latex.cyb-math.cn': 'math-latex.html', 'fourier.cyb-math.cn': 'math-fourier.html' };
  var files = Object.fromEntries(Object.entries(hosts).map(function (item) { return [item[1], 'https://' + item[0] + '/']; }));
  var siteFiles = Object.fromEntries(Object.keys(files).map(function (file) { return [file === 'index.html' ? 'cyb-math' : file === 'math-geometry-theorems.html' ? 'math-geometry' : file.replace('.html', ''), file]; }));
  function official() { return (files[location.pathname.split('/').pop()] || files['index.html']) + location.search + location.hash; }
  window.cybPreferredURL = function (value) { return value === undefined || /^file:|^resource:/i.test(value) ? official() : value; };
  function request(method, payload) {
    return new Promise(function (resolve, reject) {
      var id = ++next;
      if (callbacks.size >= 10) return reject(new Error('Please finish the current file operation'));
      callbacks.set(id, { resolve: resolve, reject: reject });
      try { window.CYBNative[method](JSON.stringify({ id: id, payload: payload })); }
      catch (error) { callbacks.delete(id); reject(error); }
    });
  }
  function status(kind) {
    var language = document.documentElement.lang;
    var text = /^en/.test(language) ? { saved: 'File saved', canceled: 'Save canceled', failed: 'Operation failed. Please try again.' } : /Hant/.test(language) ? { saved: '檔案已儲存', canceled: '已取消儲存', failed: '操作失敗，請重試。' } : { saved: '文件已保存', canceled: '已取消保存', failed: '操作失败，请重试。' };
    var node = document.getElementById('cyb-harmony-status');
    if (!node) { node = document.createElement('div'); node.id = 'cyb-harmony-status'; node.setAttribute('role', 'status'); node.setAttribute('data-cyb-i18n-ignore', ''); node.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483647;background:#24262a;color:#fff;padding:12px;border-radius:8px;font:14px system-ui'; document.body.appendChild(node); }
    clearTimeout(status.timer); node.textContent = text[kind]; node.hidden = false; status.timer = setTimeout(function () { node.hidden = true; }, 3500);
  }
  function fail(error) { console.error('CYB Harmony operation failed', error); status('failed'); }
  function base64(blob) { return new Promise(function (resolve, reject) { var reader = new FileReader(); reader.onload = function () { resolve(String(reader.result).split(',')[1]); }; reader.onerror = function () { reject(reader.error); }; reader.readAsDataURL(blob); }); }
  async function save(blob, name) {
    if (blob.size > 50 * 1024 * 1024) throw new Error('Export exceeds 50 MB');
    var result = await request('save', { name: name, mime: blob.type, base64: await base64(blob) });
    status(result.canceled ? 'canceled' : 'saved'); return result;
  }
  function nativeDownload(anchor) { return anchor.hasAttribute('download') && /^(blob:|data:)/.test(anchor.href); }
  async function download(anchor) { await save(await fetch(anchor.href).then(function (response) { return response.blob(); }), anchor.download || 'CYB-Math-export'); }
  var click = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () { if (nativeDownload(this)) download(this).catch(fail); else click.call(this); };
  document.addEventListener('click', function (event) { var anchor = event.target.closest?.('a[download]'); if (anchor && nativeDownload(anchor)) { event.preventDefault(); event.stopImmediatePropagation(); download(anchor).catch(fail); } }, true);
  function pageState() { window.CYBNative?.pageState(JSON.stringify({ site: document.documentElement.dataset.cybSite, language: document.documentElement.lang, dark: document.documentElement.dataset.theme === 'dark' || document.body.classList.contains('dark') })); }
  window.CYBHarmony = {
    result: function (id, response) { var task = callbacks.get(id); if (!task) return; callbacks.delete(id); if (response.error) task.reject(new Error(response.error)); else task.resolve(response); },
    saveProject: async function () { try { await save(new Blob([window.CYBSession.snapshot()], { type: 'application/json' }), 'CYB-Math.cybmath.json'); } catch (error) { fail(error); } },
    openProject: async function () { try { var response = await request('open', {}); if (response.canceled) return; window.CYBSession.validate(response.raw); window.CYBNative.handoff(response.raw); } catch (error) { fail(error); } },
    stage: function (raw) { try { window.CYBSession.stage(raw); } catch (error) { fail(error); } },
    share: function () { var button = document.querySelector('#cyb-suite-share,#shareBtn,#btn-share,#fabShare'); if (button) button.click(); else navigator.share({ title: document.title, url: official() }).catch(fail); },
    persist: function () { try { window.CYBNative.persist(window.CYBSession.snapshot()); } catch (_) {} },
    insert: function (value) { return window.CYBEditor.insert(value); },
    navigate: function (file, language) { if (!files[file]) return; window.CYBHarmony.persist(); location.href = file + '?lang=' + encodeURIComponent(language || document.documentElement.lang); }
  };
  try { Object.defineProperty(navigator, 'share', { configurable: true, value: function (data) { return request('share', { text: [data.title, data.text, data.url].filter(Boolean).join('\n') }); } }); } catch (_) {}
  function rewrite(root) {
    var nodes = Array.from(root.querySelectorAll('a[href],option[value]'));
    if (root.matches?.('a[href],option[value]')) nodes.unshift(root);
    nodes.forEach(function (node) {
      var attribute = node.tagName === 'A' ? 'href' : 'value';
      try {
        var url = new URL(node.getAttribute(attribute), location.href);
        var file = hosts[url.hostname] || siteFiles[url.hostname];
        if (/\.pages\.dev$/.test(url.hostname)) file = siteFiles[url.hostname.replace(/\.pages\.dev$/, '')];
        if (file) node.setAttribute(attribute, file + url.search + url.hash);
      } catch (_) {}
    });
  }
  document.addEventListener('DOMContentLoaded', function () {
    document.documentElement.dataset.cybNativeHost = 'harmony';
    var style = document.createElement('style'); style.textContent = '#cyb-suite-bar,html[data-cyb-site="cyb-math"] .topbar{display:none!important} body:has(#cyb-suite-bar){padding-top:0!important}'; document.head.appendChild(style);
    rewrite(document.documentElement);
    new MutationObserver(function (records) { records.forEach(function (record) { record.addedNodes.forEach(function (node) { if (node.nodeType === 1) rewrite(node); }); }); }).observe(document.body, { childList: true, subtree: true });
    window.addEventListener('cyb-editor-state', function (event) { window.CYBNative?.editorState(JSON.stringify(event.detail)); });
    new MutationObserver(pageState).observe(document.documentElement, { attributes: true, attributeFilter: ['lang', 'data-theme'] });
    setTimeout(pageState, 200);
    setInterval(function () { window.CYBHarmony.persist(); }, 30000);
  });
})();
