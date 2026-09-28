(function () {
  'use strict';
  var validSites = ['cyb-math', 'math-tools-pro', 'math-plotter', 'math-complex', 'math-equation', 'math-geometry', 'math-algebra', 'math-linear', 'math-3d', 'math-theory', 'math-sequence', 'math-latex', 'math-fourier'];
  var prefix = /^(cyb[-:]|es-|mf-|seq|nt-|gsp_|algcalc|plot|cvz-|me-|math-)/;
  var key = 'cyb-app-pending-session';
  var scopePrefixes = { 'math-tools-pro': /^me-/, 'math-plotter': /^plotter-/, 'math-complex': /^cvz-/, 'math-equation': /^es-/, 'math-geometry': /^gsp_/, 'math-algebra': /^algcalc/, 'math-linear': /^cyb-linear/, 'math-3d': /^plot3d-/, 'math-theory': /^nt-/, 'math-sequence': /^seq/, 'math-latex': /^math-latex:/, 'math-fourier': /^mf-/ };
  function belongs(name, site) {
    if (name === 'cyb-ux-draft:' + site) return true;
    if (site === 'cyb-math') return /^cyb[-:]/.test(name) && !/^cyb-(ux-draft:|app-|language)/.test(name);
    return Boolean(scopePrefixes[site] && scopePrefixes[site].test(name));
  }
  function validate(raw) {
    if (typeof raw !== 'string' || raw.length > 12 * 1024 * 1024 || new Blob([raw]).size > 12 * 1024 * 1024) throw new Error('Invalid project size');
    var data = JSON.parse(raw);
    if (!data || data.format !== 'CYB-Math-Project' || data.version !== 1 || !validSites.includes(data.site) || !Array.isArray(data.fields) || !Array.isArray(data.storage) || data.fields.length > 1000 || data.storage.length > 500) throw new Error('Invalid CYB Math project');
    if (typeof data.hash !== 'string' || data.hash.length > 2 * 1024 * 1024) throw new Error('Invalid project state');
    data.fields.forEach(function (field) {
      if (!field || typeof field.id !== 'string' || field.id.length > 200 || typeof field.value !== 'string' || field.value.length > 100000 || typeof field.checked !== 'boolean') throw new Error('Invalid project field');
    });
    data.storage.forEach(function (pair) {
      if (!Array.isArray(pair) || pair.length !== 2 || typeof pair[0] !== 'string' || !prefix.test(pair[0]) || pair[0] === key || typeof pair[1] !== 'string' || pair[1].length > 2 * 1024 * 1024) throw new Error('Invalid project storage');
    });
    return data;
  }
  function snapshot() {
    window.dispatchEvent(new Event('cyb-save-draft'));
    if (document.documentElement.dataset.cybSite === 'math-geometry' && typeof savePageState === 'function') {
      savePageState();
      localStorage.setItem('gsp_autosave', JSON.stringify({ time: Date.now(), objects: serializeObjects(objects), nextLabel: nextLabel, nextId: nextId, pages: pages, currentPage: currentPage }));
    }
    var fields = Array.from(document.querySelectorAll('input[id],textarea[id],select[id]')).filter(function (el) { return el.type !== 'file' && el.type !== 'password' && !el.closest('#cyb-suite-bar,#cyb-language-switcher'); }).slice(0, 1000).map(function (el) { return { id: el.id, value: el.value, checked: Boolean(el.checked) }; });
    var storage = [];
    for (var i = 0; i < localStorage.length; i++) { var name = localStorage.key(i); if (belongs(name, document.documentElement.dataset.cybSite)) storage.push([name, localStorage.getItem(name)]); }
    var raw = JSON.stringify({ format: 'CYB-Math-Project', version: 1, site: document.documentElement.dataset.cybSite, hash: location.hash, language: document.documentElement.lang, fields: fields, storage: storage });
    validate(raw); return raw;
  }
  function stage(raw) {
    var data = validate(raw);
    if (data.site !== document.documentElement.dataset.cybSite) throw new Error('Open the matching tool first');
    data.storage.forEach(function (pair) { if (belongs(pair[0], data.site)) localStorage.setItem(pair[0], pair[1]); });
    localStorage.setItem(key, raw);
    location.hash = data.hash;
    location.reload();
  }
  function apply() {
    var raw = localStorage.getItem(key);
    if (!raw) return;
    localStorage.removeItem(key);
    var data;
    try { data = validate(raw); } catch (_) { return; }
    if (data.site !== document.documentElement.dataset.cybSite) return;
    data.fields.forEach(function (field) {
      var el = document.getElementById(field.id);
      if (!el || !el.matches('input,textarea,select') || el.type === 'file' || el.type === 'password') return;
      if (el.tagName === 'SELECT' && !Array.from(el.options).some(function (option) { return option.value === field.value; })) return;
      el.value = field.value; el.checked = field.checked;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }
  window.CYBSession = { snapshot: snapshot, stage: stage, validate: validate };
  document.addEventListener('DOMContentLoaded', function () { setTimeout(apply, 180); });
})();
