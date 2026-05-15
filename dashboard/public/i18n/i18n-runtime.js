/**
 * datageoparana i18n runtime — universal text-node translator.
 *
 * Walks whitelisted selectors in the document body, finds direct text
 * nodes, looks up their trimmed content in window.__I18N_TEXT_MAP__[lang]
 * and swaps the text in place. Also rewrites <input placeholder>, <option>
 * inner text, [title] and [aria-label] when matched.
 *
 * A MutationObserver re-runs the walk whenever React re-renders (subtree
 * additions / character data changes), so translations stick even when
 * components remount.
 *
 * Why a runtime walker instead of touching every JSX component?
 *   - Avoids forking 10 panel codebases.
 *   - PT is canonical; the walker reads PT in the DOM and outputs EN/ES.
 *   - When lang === 'pt' the walker is a no-op (early return).
 *   - Unknown strings stay untouched — domain-specific data (cadeia
 *     names, programa names, fonte agencies) keeps its source language.
 *
 * Loads after i18n.js, listens to the i18n:change event, kicks the walker
 * on every lang change.
 */
(function () {
  'use strict';

  // Strings already translated get this marker so we don't loop.
  // We store the ORIGINAL PT key on the node so subsequent lang switches
  // can re-translate from the canonical text instead of from the previously
  // translated string.
  var ATTR_ORIG = 'data-i18n-orig';

  // Containers we walk EVERY text descendant of (deep). Use for sections
  // with arbitrary nested chrome (footer columns, colophon, login card).
  var DEEP_CONTAINERS = [
    'header', '.header', '.masthead', '.masthead-foot', '.masthead-inner',
    'nav', '.tabs', 'footer', '.site-footer', '.footer-col', '.footer-bottom',
    '.colophon', '.colophon-body', '.colophon-aside', '.colophon-rule',
    '.aside-block', '.aside-list',
    '.login-overlay', '.login-card', '.login-header', '.login-form',
    '.bug-modal', '.bug-dialog', '.bug-form',
    '.lgpd-banner', '#lgpd-banner',
    '.meta-strip', '.running-head', '.section', '.section-title', '.section-deck',
    '.plate', '.plate-body', '.plate-stats', '.plate-end',
    '.detail-panel',
    '[data-i18n-translate]',
  ];

  // Specific element selectors translated as-is (direct text children only).
  // Useful for elements where we don't want deep walking (e.g. buttons).
  var SHALLOW = [
    'button', '.btn', '.btn-icon', '.btn-icon-label',
    'label', '.label-text', '.filter-label', '.filter-stats',
    '.tab-label', '.tab-code',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    '.panel-head', '.panel-desc',
    '.kpi-label', '.kpi-sub',
    '.card h3', '.card h4', '.card-footer',
    '.access-label',
    '.tz-legend-item', '.heatmap-legend-label', '.heatmap-day', '.heatmap-header',
    '.toast',
    '.insight',
    '.active-filter-badge', '.badge',
    '.aside-label', '.aside-link', '.aside-list li',
    '.lede', '.eyebrow', '.coords',
    '.plate-cat', '.plate-title', '.plate-desc', '.plate-arrow', '.plate-source',
    '.stat-lbl',
    'option',
  ];

  var WALK_ATTRS = ['placeholder', 'title', 'aria-label'];

  function getLang() {
    return (window.i18n && window.i18n.lang) || 'pt';
  }

  function getMap() {
    var lang = getLang();
    if (lang === 'pt') return null;
    return (window.__I18N_TEXT_MAP__ && window.__I18N_TEXT_MAP__[lang]) || null;
  }

  function translateOne(node) {
    var map = getMap();
    if (!map) return;
    // Walk direct text children only — preserves nested elements.
    for (var i = 0; i < node.childNodes.length; i++) {
      var c = node.childNodes[i];
      if (c.nodeType !== 3) continue;
      var raw = c.nodeValue;
      if (!raw) continue;
      var trimmed = raw.trim();
      if (!trimmed) continue;
      // Remember original PT text so we can re-translate after switching.
      var orig = c.__i18nOrig || trimmed;
      var lookup = map[orig];
      if (lookup && lookup !== orig) {
        // Preserve leading/trailing whitespace.
        var lead = raw.match(/^\s*/)[0];
        var trail = raw.match(/\s*$/)[0];
        c.nodeValue = lead + lookup + trail;
        c.__i18nOrig = orig;
      }
    }
    // Translate selected attrs.
    for (var a = 0; a < WALK_ATTRS.length; a++) {
      var aname = WALK_ATTRS[a];
      if (!node.hasAttribute(aname)) continue;
      var v = node.getAttribute(aname);
      if (!v) continue;
      var key = node.__i18nAttrOrig && node.__i18nAttrOrig[aname];
      key = key || v.trim();
      var t = map[key];
      if (t && t !== key) {
        node.setAttribute(aname, t);
        node.__i18nAttrOrig = node.__i18nAttrOrig || {};
        node.__i18nAttrOrig[aname] = key;
      }
    }
  }

  function restorePt(root) {
    // Restore PT originals when switching back to pt.
    (root || document).querySelectorAll('*').forEach(function (el) {
      for (var i = 0; i < el.childNodes.length; i++) {
        var c = el.childNodes[i];
        if (c.nodeType === 3 && c.__i18nOrig) {
          var lead = c.nodeValue.match(/^\s*/)[0];
          var trail = c.nodeValue.match(/\s*$/)[0];
          c.nodeValue = lead + c.__i18nOrig + trail;
        }
      }
      if (el.__i18nAttrOrig) {
        Object.keys(el.__i18nAttrOrig).forEach(function (a) {
          el.setAttribute(a, el.__i18nAttrOrig[a]);
        });
      }
    });
  }

  function walkDeep(container) {
    // TreeWalker over every text node inside the container.
    var map = getMap();
    if (!map) return;
    var walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
    var node;
    while ((node = walker.nextNode())) {
      var raw = node.nodeValue;
      if (!raw) continue;
      var trimmed = raw.trim();
      if (!trimmed) continue;
      var orig = node.__i18nOrig || trimmed;
      var lookup = map[orig];
      if (lookup && lookup !== orig) {
        var lead = raw.match(/^\s*/)[0];
        var trail = raw.match(/\s*$/)[0];
        node.nodeValue = lead + lookup + trail;
        node.__i18nOrig = orig;
      }
    }
  }

  function walk(root) {
    root = root || document.body;
    if (!root) return;
    var lang = getLang();
    if (lang === 'pt') {
      restorePt(root);
      return;
    }
    var sel = SHALLOW.join(',');
    // Translate the root itself if it matches.
    try {
      if (root.matches && root.matches(sel)) translateOne(root);
    } catch (e) {}
    // All descendants matching the whitelist (shallow translation).
    try {
      root.querySelectorAll(sel).forEach(translateOne);
    } catch (e) {}
    // Deep containers: walk every text node descendant.
    try {
      var deepSel = DEEP_CONTAINERS.join(',');
      root.querySelectorAll(deepSel).forEach(walkDeep);
      if (root.matches && root.matches(deepSel)) walkDeep(root);
    } catch (e) {}
  }

  // Debounced re-walk on DOM mutations (React re-renders).
  var pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    (window.requestIdleCallback || window.requestAnimationFrame || window.setTimeout)(
      function () { pending = false; walk(); },
      { timeout: 200 }
    );
  }

  function start() {
    walk();
    if (typeof MutationObserver === 'function') {
      var obs = new MutationObserver(function (records) {
        // Only schedule if a relevant region changed.
        for (var i = 0; i < records.length; i++) {
          var r = records[i];
          if (r.type === 'characterData' || r.addedNodes.length) {
            schedule();
            return;
          }
        }
      });
      obs.observe(document.body, {
        subtree: true,
        childList: true,
        characterData: true,
      });
    }
    window.addEventListener('i18n:change', function () { walk(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
