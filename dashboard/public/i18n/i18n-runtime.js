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
      var orig = c.__i18nOrig || trimmed;
      var target = map[orig] || orig;
      var lead = raw.match(/^\s*/)[0];
      var trail = raw.match(/\s*$/)[0];
      var nextValue = lead + target + trail;
      if (c.nodeValue !== nextValue) {
        c.nodeValue = nextValue;
        if (!c.__i18nOrig) c.__i18nOrig = orig;
      }
    }
    // Translate selected attrs (placeholder, title, aria-label).
    for (var a = 0; a < WALK_ATTRS.length; a++) {
      var aname = WALK_ATTRS[a];
      if (!node.hasAttribute(aname)) continue;
      var v = node.getAttribute(aname);
      if (!v) continue;
      var key = (node.__i18nAttrOrig && node.__i18nAttrOrig[aname]) || v.trim();
      var t = map[key] || key;
      if (node.getAttribute(aname) !== t) {
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
      // Use cached PT canonical if we've translated this node before.
      var orig = node.__i18nOrig || trimmed;
      // Look up in target lang; fallback to PT canonical if no entry.
      var target = map[orig] || orig;
      var lead = raw.match(/^\s*/)[0];
      var trail = raw.match(/\s*$/)[0];
      var nextValue = lead + target + trail;
      // Always restore the node to the correct lang value (so a stale
      // translation from another lang doesn't linger).
      if (node.nodeValue !== nextValue) {
        node.nodeValue = nextValue;
        if (!node.__i18nOrig) node.__i18nOrig = orig;
      }
    }
  }

  // Skip translation inside these elements — they contain chart geometry,
  // SVG paths and other content that must not be rewritten by accident.
  var SKIP_SUBTREES = ['script', 'style', 'svg', 'canvas', 'code', 'pre'];

  function inSkippedSubtree(node) {
    var p = node.parentNode;
    while (p && p !== document.body) {
      if (p.nodeType === 1) {
        var tag = (p.tagName || '').toLowerCase();
        if (SKIP_SUBTREES.indexOf(tag) !== -1) return true;
        if (p.hasAttribute && p.hasAttribute('data-i18n-skip')) return true;
      }
      p = p.parentNode;
    }
    return false;
  }

  function walk(root) {
    root = root || document.body;
    if (!root) return;
    var map = getMap();
    if (!map) {
      // pt — restore originals.
      restorePt(root);
      return;
    }
    // TreeWalker over EVERY text node in the body. Strings not in the map
    // fall back to their original (PT canonical), so the walker is safe to
    // run over the entire document — only mapped strings change.
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var node;
    while ((node = walker.nextNode())) {
      var raw = node.nodeValue;
      if (!raw) continue;
      var trimmed = raw.trim();
      if (!trimmed) continue;
      if (inSkippedSubtree(node)) continue;
      var orig = node.__i18nOrig || trimmed;
      var target = map[orig] || orig;
      var lead = raw.match(/^\s*/)[0];
      var trail = raw.match(/\s*$/)[0];
      var nextValue = lead + target + trail;
      if (node.nodeValue !== nextValue) {
        node.nodeValue = nextValue;
        if (!node.__i18nOrig) node.__i18nOrig = orig;
      }
    }
    // Translate placeholder / title / aria-label / alt on all elements.
    root.querySelectorAll('[placeholder],[title],[aria-label]').forEach(function (el) {
      ['placeholder', 'title', 'aria-label'].forEach(function (aname) {
        if (!el.hasAttribute(aname)) return;
        var v = el.getAttribute(aname);
        if (!v) return;
        var key = (el.__i18nAttrOrig && el.__i18nAttrOrig[aname]) || v.trim();
        var t = map[key] || key;
        if (el.getAttribute(aname) !== t) {
          el.setAttribute(aname, t);
          el.__i18nAttrOrig = el.__i18nAttrOrig || {};
          el.__i18nAttrOrig[aname] = key;
        }
      });
    });
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
