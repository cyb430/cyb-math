(function () {
  'use strict';
  var site = document.currentScript.dataset.site;
  document.documentElement.dataset.cybSite = site;
  Object.assign(window.__CYB_I18N__?.dictionary || {}, {
    '搜索题型或知识点，直接开始计算、绘图与求解。': { en: 'Find a topic and start calculating, plotting, or solving.', hant: '搜尋題型或知識點，直接開始計算、繪圖與求解。' },
    '数值超出可计算范围': { en: 'Value exceeds the supported numeric range', hant: '數值超出可計算範圍' }
    , '最小二乘': { en: 'Least squares', hant: '最小二乘' }
    , '最小二乘拟合': { en: 'Least-squares fit', hant: '最小二乘擬合' }
    , '模型': { en: 'Model', hant: '模型' }
    , '直线 y = ax + b': { en: 'Line y = ax + b', hant: '直線 y = ax + b' }
    , '方程组 Ax ≈ b': { en: 'System Ax ≈ b', hant: '方程組 Ax ≈ b' }
    , '数据（每行一组）': { en: 'Data (one row per observation)', hant: '資料（每行一組）' }
    , '拟合': { en: 'Fit', hant: '擬合' }
    , '拟合结果与残差': { en: 'Fit and residuals', hant: '擬合結果與殘差' }
    , '等待计算。': { en: 'Awaiting calculation.', hant: '等待計算。' }
    , '观测值与拟合直线': { en: 'Observations and fitted line', hant: '觀測值與擬合直線' }
    , '矩阵秩不足；显示最小范数解，解不唯一。': { en: 'Rank-deficient matrix: showing the minimum-norm solution; the solution is not unique.', hant: '矩陣秩不足；顯示最小範數解，解不唯一。' }
    , '数据接近线性相关，结果对输入误差敏感。': { en: 'Nearly dependent data: results are sensitive to input errors.', hant: '資料接近線性相關，結果對輸入誤差敏感。' }
    , '最小二乘 拟合 数据 残差 散点 直线 least squares regression fit residual': { en: 'least squares regression fit residual data scatter line', hant: '最小二乘 擬合 資料 殘差 散點 直線 least squares regression fit residual' }
    , '拟合散点直线或求 Ax≈b 的近似解，查看残差与秩不足提示。': { en: 'Fit a line or solve Ax≈b, with residuals and rank-deficiency warnings.', hant: '擬合散點直線或求 Ax≈b 的近似解，查看殘差與秩不足提示。' }
  });
  var incomingState = /[=#]/.test(location.hash.slice(1));
  var helpPreferences = {
    'math-tools-pro': ['me-no-auto-help', 'noAutoHelp'],
    'math-plotter': ['plotter-nohelp', 'helpNoMore'],
    'math-complex': ['cvz-nohint', 'noHint'],
    'math-equation': ['es-nohelp', 'help-nomore'],
    'math-geometry': ['gsp_help_off', 'noShowWelcome'],
    'math-algebra': ['algcalc_nohelp', 'noAutoHelpChk'],
    'math-3d': ['plot3d-nohelp', 'helpNoMore'],
    'math-theory': ['nt-nohelp', 'helpNoMore'],
    'math-sequence': ['seqNoHelp', 'noAutoHelp'],
    'math-latex': ['math-latex:no-auto-help', 'no-auto-help'],
    'math-fourier': ['mf-no-auto-help', 'noAutoHelp']
  };
  var preference = helpPreferences[site];
  try {
    if (preference && localStorage.getItem(preference[0]) === null) localStorage.setItem(preference[0], '1');
  } catch (_) {}

  var nativeActions = {
    'math-tools-pro': { theme: '#cyb-tools-theme', help: '#cyb-tools-help', share: '#cyb-tools-graph-share' },
    'math-plotter': { theme: '#tbTheme', help: '#tbHelp', share: '#fabShare' },
    'math-equation': { theme: '#btn-theme', help: '#btn-help', share: '#btn-share' },
    'math-geometry': { theme: '#themeToggle', help: null, share: null },
    'math-algebra': { theme: '#themeBtn', help: '#helpBtn', share: '#shareBtn' },
    'math-3d': { theme: '#tbTheme', help: '#tbHelp', share: '#fabShare' },
    'math-theory': { theme: '#themeBtn', help: '#helpBtn', share: '#shareBtn' },
    'math-sequence': { theme: '#themeBtn', help: '#helpBtn', share: '#shareBtn' },
    'math-latex': { theme: '#btn-theme', help: '#btn-help', share: '#btn-share' },
    'math-fourier': { theme: '#btnTheme', help: '#btnHelp', share: '#btnShare' }
  };
  var actions = nativeActions[site];
  window.CYBToolAction = function (action) {
    var target = actions && actions[action];
    if (site === 'cyb-math') target = action === 'theme' ? '#theme' : action === 'help' ? '#help' : '#share';
    if (site === 'math-complex') target = action === 'theme' ? '#themeBtn' : action === 'help' ? '#hintBtn' : '#shareBtn';
    var button = target && document.querySelector(target);
    if (button) { button.click(); return true; }
    var suite = document.getElementById('cyb-suite-' + action);
    if (suite) { suite.click(); return true; }
    return false;
  };
  var draftScopes = {
    'math-equation': '#p-root input, #p-root select, #p-ode input, #p-ode select, #p-int input, #p-int select, #p-ana input, #p-plot input',
    'math-theory': '#contentInner input, #contentInner select',
    'math-latex': '#editor, #font-size, #color, #png-scale, #png-bg'
  };
  var draftKey = 'cyb-ux-draft:' + site;
  var scope = draftScopes[site];
  var restoring = false;
  var draftTimer;
  function readDraft() {
    try { return JSON.parse(localStorage.getItem(draftKey)) || {}; } catch (_) { return {}; }
  }
  function fields() { return scope ? Array.from(document.querySelectorAll(scope)).filter(function (el) { return el.id && el.type !== 'file'; }) : []; }
  function saveDraft() {
    if (restoring) return;
    var values = {};
    fields().forEach(function (el) { values[el.id] = el.type === 'checkbox' ? el.checked : el.value; });
    var active = document.querySelector('nav [data-p].active, #tabs [data-tool].on');
    var tab = active && (active.dataset.p || active.dataset.tool);
    var crt = site === 'math-theory' ? Array.from(document.querySelectorAll('#crtRows > *')).map(function (row) { return [row.querySelector('.crt-a').value, row.querySelector('.crt-m').value]; }) : undefined;
    try { localStorage.setItem(draftKey, JSON.stringify({ values: values, tab: tab, crt: crt })); } catch (_) {}
  }
  function rememberDraft(event) {
    if (!scope || !event.target.matches(scope)) return;
    clearTimeout(draftTimer);
    draftTimer = setTimeout(saveDraft, 150);
  }

  document.addEventListener('click', function (event) {
    if (!actions) return;
    var button = event.target.closest('#cyb-suite-theme, #cyb-suite-help-button, #cyb-suite-share');
    if (!button) return;
    var action = button.id === 'cyb-suite-theme' ? 'theme' : button.id === 'cyb-suite-share' ? 'share' : 'help';
    var target = actions[action] && document.querySelector(actions[action]);
    if (site === 'math-geometry' && (action === 'help' || action === 'share')) {
      if (action === 'help' && typeof showWelcome === 'function') { event.preventDefault(); event.stopImmediatePropagation(); showWelcome(); }
      if (action === 'share' && typeof shareLink === 'function') { event.preventDefault(); event.stopImmediatePropagation(); shareLink(); }
      return;
    }
    if (!target || target === button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    target.click();
  }, true);

  document.addEventListener('change', function (event) {
    if (preference && event.target.id === preference[1]) {
      try { localStorage.setItem(preference[0], event.target.checked ? '1' : '0'); } catch (_) {}
    }
    rememberDraft(event);
  });
  document.addEventListener('input', rememberDraft);
  window.addEventListener('cyb-save-draft', function () { clearTimeout(draftTimer); if (scope) saveDraft(); });
  document.addEventListener('click', function (event) {
    if (scope && event.target.closest('nav [data-p], #tabs [data-tool]')) setTimeout(saveDraft, 0);
  });
  window.addEventListener('pagehide', function () {
    clearTimeout(draftTimer); if (scope) saveDraft();
    if (preference) {
      var checkbox = document.getElementById(preference[1]);
      try { if (checkbox) localStorage.setItem(preference[0], checkbox.checked ? '1' : '0'); } catch (_) {}
    }
  });
  document.addEventListener('DOMContentLoaded', function () {
    if (preference) {
      var checkbox = document.getElementById(preference[1]);
      try { if (checkbox) checkbox.checked = localStorage.getItem(preference[0]) !== '0'; } catch (_) {}
    }
    var nav = document.querySelector('.cyb-suite-nav, #cyb-suite-bar, .top-actions');
    var language = document.getElementById('cyb-language-switcher');
    if (nav && language) { language.classList.remove('cyb-language-floating'); nav.appendChild(language); }
    document.querySelectorAll('button[aria-label]').forEach(function (button) { if (!button.title) button.title = button.getAttribute('aria-label'); });
    document.querySelectorAll('input,textarea,select').forEach(function (el) {
      if (el.getAttribute('aria-label') || el.labels?.length) return;
      var nearby = el.closest('label') || el.previousElementSibling;
      if (nearby?.matches('label,.field-label,.label')) el.setAttribute('aria-label', nearby.textContent.trim());
    });
    if (!scope || incomingState) return;
    var draft = readDraft();
    if (!draft.values || typeof draft.values !== 'object') return;
    restoring = true;
    fields().forEach(function (el) {
      var value = draft.values[el.id];
      if (el.type === 'checkbox' && typeof value === 'boolean') el.checked = value;
      else if (typeof value === 'string' && value.length <= 100000) {
        if (el.tagName === 'SELECT' && !Array.from(el.options).some(function (option) { return option.value === value; })) return;
        el.value = value;
      } else return;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    if (site === 'math-equation') {
      var tab = Array.from(document.querySelectorAll('nav [data-p]')).find(function (el) { return el.dataset.p === draft.tab; });
      if (tab) tab.click();
      else if (typeof runActive === 'function') runActive();
    }
    if (site === 'math-theory') {
      if (Array.isArray(draft.crt) && draft.crt.length <= 30 && typeof crtAddRow === 'function') {
        document.getElementById('crtRows').textContent = '';
        draft.crt.forEach(function (row) { if (Array.isArray(row) && row.every(function (value) { return typeof value === 'string' && value.length <= 10000; })) crtAddRow(row[0], row[1]); });
      }
      var tool = Array.from(document.querySelectorAll('#tabs [data-tool]')).find(function (el) { return el.dataset.tool === draft.tab; });
      if (tool) tool.click();
    }
    restoring = false;
  });
})();
