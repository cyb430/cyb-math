(function () {
  'use strict';
  var target;
  var selection;
  var composing = false;
  var general = [['(', '('], [')', ')'], ['^', '^'], ['x', 'x'], ['y', 'y'], ['√', 'sqrt()'], ['π', 'pi'], ['×', '*'], ['÷', '/'], ['−', '-'], ['+', '+'], [',', ',']];
  var latex = [['a/b', '\\frac{}{}'], ['√', '\\sqrt{}'], ['^', '^{}'], ['_', '_{}'], ['π', '\\pi'], ['∫', '\\int'], ['Σ', '\\sum'], ['∞', '\\infty'], ['α', '\\alpha'], ['{', '{'], ['}', '}'], ['\\', '\\']];
  function editable(el) {
    return el && !el.disabled && !el.readOnly && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT' && /^(text|tel)?$/.test(el.type) && el.id !== 'tool-search');
  }
  function remember() {
    if (!editable(target)) return;
    try { selection = { start: target.selectionStart, end: target.selectionEnd }; } catch (_) {}
  }
  function keys() {
    var site = document.documentElement.dataset.cybSite;
    var numeric = target && /matrix|fitInput/i.test(target.id);
    var list = site === 'math-latex' ? latex : numeric ? [['−', '-'], ['.', '.'], ['e', 'e'], ['␣', ' '], ['↵', '\n']] : general;
    if (target && /matrix/i.test(target.id)) list = [['/', '/']].concat(list);
    if (site === 'math-complex' && !numeric) list = [['z', 'z'], ['i', 'i']].concat(general.slice(0, 3), general.slice(5));
    return list.map(function (item) { return { label: item[0], value: item[1] }; }).concat([{ label: '←', value: 'left' }, { label: '→', value: 'right' }, { label: '⌫', value: 'backspace' }]);
  }
  function publish() {
    var info = { active: editable(target) && document.activeElement === target, keys: keys(), language: document.documentElement.lang || 'zh-Hans' };
    window.dispatchEvent(new CustomEvent('cyb-editor-state', { detail: info }));
  }
  function insert(value) {
    if (!editable(target) || composing || typeof value !== 'string' || value.length > 100) return false;
    target.focus({ preventScroll: true });
    var start = Number.isInteger(selection?.start) ? selection.start : target.value.length;
    var end = Number.isInteger(selection?.end) ? selection.end : start;
    start = Math.max(0, Math.min(start, target.value.length)); end = Math.max(start, Math.min(end, target.value.length));
    if (value === 'left' || value === 'right') {
      var caret = value === 'left' ? Math.max(0, start - 1) : Math.min(target.value.length, end + 1);
      try { target.setSelectionRange(caret, caret); } catch (_) {}
    } else {
      if (value === 'backspace') {
        if (start === end && start > 0) start -= /[\uDC00-\uDFFF]/.test(target.value[start - 1]) ? 2 : 1;
        value = '';
      }
      // Text editing commands preserve browser undo when supported; fallback works on numeric fields.
      var inserted = false;
      try { target.setSelectionRange(start, end); inserted = document.execCommand('insertText', false, value); } catch (_) {}
      if (!inserted) {
        target.value = target.value.slice(0, start) + value + target.value.slice(end);
        try { target.setSelectionRange(start + value.length, start + value.length); } catch (_) {}
        target.dispatchEvent(new Event('input', { bubbles: true }));
      }
      var offset = value.includes('{}') ? value.indexOf('{') + 1 : value.endsWith('()') ? value.length - 1 : value.length;
      if (offset !== value.length) try { target.setSelectionRange(start + offset, start + offset); } catch (_) {}
    }
    remember(); publish(); return true;
  }
  window.CYBEditor = { insert: insert, keys: keys, active: function () { return editable(target); } };
  document.addEventListener('focusin', function (event) { if (editable(event.target)) { target = event.target; remember(); publish(); } else { target = undefined; publish(); } });
  document.addEventListener('focusout', function () { setTimeout(publish, 120); });
  document.addEventListener('selectionchange', remember);
  document.addEventListener('input', remember);
  document.addEventListener('compositionstart', function () { composing = true; });
  document.addEventListener('compositionend', function () { composing = false; remember(); });
})();
