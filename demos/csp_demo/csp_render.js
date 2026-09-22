/**
 * Constraint Satisfaction Problems — shared SVG renderers (window.CSPRender)
 *
 * Map-of-Australia and constraint-graph drawing used by both the lecture
 * page (demos/csp_demo/ui.js) and the Playground (demos/csp_demo/csp_lab.js).
 * Requires window.CSPEngine (csp_engine.js) to be loaded first.
 */

(function () {
  'use strict';

  const E = window.CSPEngine;
  const AUS = E.AUSTRALIA;
  const HEX = E.COLOR_HEX;
  const ACCENT = '#0d9488';

  /** Polygon path for an Australian region. */
  function regionPath(v, W, H) {
    return AUS.regions[v].map(([lon, lat], i) => {
      const [x, y] = E.projectAus(lon, lat, W, H);
      return (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
    }).join(' ') + ' Z';
  }

  /**
   * Australia map SVG.
   * opts: assignment, domains (show dots), highlight [vars], dim [vars],
   *       conflicts [[a,b]], badges {v: text}, badgeHot v, clickable, idPrefix,
   *       arc [a,b] (drawn as arrow), W, H
   */
  function mapSVG(opts) {
    const o = Object.assign({ assignment: {}, tint: null, domains: null, highlight: [], dim: [], conflicts: [], badges: null, badgeHot: null, clickable: false, W: 400, H: 340, arc: null, colors: ['red', 'green', 'blue'] }, opts || {});
    const a = o.assignment;
    let s = `<svg class="csp-map-svg" viewBox="0 0 ${o.W} ${o.H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Map of Australia's states and territories">`;
    s += `<rect x="0" y="0" width="${o.W}" height="${o.H}" rx="12" class="csp-sea"></rect>`;
    for (const v of AUS.variables) {
      const tinted = !a[v] && o.tint && o.tint[v];
      const fill = a[v] ? HEX[a[v]] : tinted ? HEX[o.tint[v]] : '#f1f5f9';
      const cls = ['csp-region'];
      if (o.clickable) cls.push('clickable');
      if (o.highlight.includes(v)) cls.push('hl');
      if (o.dim.includes(v)) cls.push('dim');
      s += `<path d="${regionPath(v, o.W, o.H)}" fill="${fill}" ${tinted ? 'fill-opacity="0.35"' : ''} class="${cls.join(' ')}" data-var="${v}"><title>${AUS.names[v]} (${v})</title></path>`;
    }
    // Conflict markers between label centres
    for (const [p, q] of o.conflicts) {
      const [x1, y1] = E.projectAus(...AUS.labels[p], o.W, o.H);
      const [x2, y2] = E.projectAus(...AUS.labels[q], o.W, o.H);
      s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="csp-conflict-line"></line>`;
      s += `<circle cx="${(x1 + x2) / 2}" cy="${(y1 + y2) / 2}" r="8" class="csp-conflict-mark"></circle><text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 + 3.5}" class="csp-conflict-x">✕</text>`;
    }
    if (o.arc) {
      const [x1, y1] = E.projectAus(...AUS.labels[o.arc[0]], o.W, o.H);
      const [x2, y2] = E.projectAus(...AUS.labels[o.arc[1]], o.W, o.H);
      s += `<defs><marker id="csp-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#0f172a"></path></marker></defs>`;
      const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1;
      s += `<line x1="${x1 + dx / L * 14}" y1="${y1 + dy / L * 14}" x2="${x2 - dx / L * 16}" y2="${y2 - dy / L * 16}" class="csp-arc-line" marker-end="url(#csp-arrow)"></line>`;
    }
    for (const v of AUS.variables) {
      const [x, y] = E.projectAus(...AUS.labels[v], o.W, o.H);
      const dark = a[v] ? 'csp-region-label on' : 'csp-region-label';
      s += `<text x="${x}" y="${y - (o.domains ? 5 : 0)}" class="${dark}">${v}</text>`;
      if (o.domains && !a[v]) {
        const vals = o.domains[v] || [];
        const n = o.colors.length;
        o.colors.forEach((c, i) => {
          const cx = x + (i - (n - 1) / 2) * 10;
          const on = vals.includes(c);
          s += `<circle cx="${cx}" cy="${y + 7}" r="3.8" fill="${on ? HEX[c] : '#ffffff'}" stroke="${on ? 'rgba(15,23,42,0.35)' : '#cbd5e1'}" stroke-width="1"></circle>`;
          if (!on) s += `<line x1="${cx - 3.5}" y1="${y + 10.5}" x2="${cx + 3.5}" y2="${y + 3.5}" stroke="#94a3b8" stroke-width="1"></line>`;
        });
        if (!vals.length) s += `<text x="${x}" y="${y + 22}" class="csp-wipe-label">∅ empty</text>`;
      }
      if (o.badges && o.badges[v] != null) {
        const hot = o.badgeHot === v || (Array.isArray(o.badgeHot) && o.badgeHot.includes(v));
        const bx = x + 20, by = y - 20;
        s += `<g class="csp-badge-svg ${hot ? 'hot' : ''}"><rect x="${bx - 11}" y="${by - 8}" width="22" height="16" rx="8"></rect><text x="${bx}" y="${by + 4}">${o.badges[v]}</text></g>`;
      }
    }
    s += '</svg>';
    return s;
  }

  /**
   * Generic constraint-graph SVG (positions in a 0..100 box).
   * opts: vars, neighbors, pos, assignment, highlight, dim, removed, hlEdges [[a,b]],
   *       labels {v:text}, sub {v:text}, W, H, r
   */
  function graphSVG(opts) {
    const o = Object.assign({ assignment: {}, highlight: [], dim: [], removed: [], hlEdges: [], sub: {}, W: 300, H: 240, r: 15, arcs: [] }, opts);
    const X = v => 16 + o.pos[v][0] / 100 * (o.W - 32);
    const Y = v => 16 + o.pos[v][1] / 100 * (o.H - 32);
    const isHl = (a, b) => o.hlEdges.some(([p, q]) => (p === a && q === b) || (p === b && q === a));
    let s = `<svg class="csp-graph-svg" viewBox="0 0 ${o.W} ${o.H}" xmlns="http://www.w3.org/2000/svg">`;
    const seen = new Set();
    for (const v of o.vars) for (const u of o.neighbors[v] || []) {
      const k = v < u ? v + '|' + u : u + '|' + v;
      if (seen.has(k)) continue; seen.add(k);
      const gone = o.removed.includes(v) || o.removed.includes(u);
      s += `<line x1="${X(v)}" y1="${Y(v)}" x2="${X(u)}" y2="${Y(u)}" class="csp-gedge ${isHl(v, u) ? 'hl' : ''} ${gone ? 'gone' : ''}"></line>`;
    }
    for (const [p, q] of o.arcs) {
      const dx = X(q) - X(p), dy = Y(q) - Y(p), L = Math.hypot(dx, dy) || 1;
      s += `<defs><marker id="csp-garrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="${ACCENT}"></path></marker></defs>`;
      s += `<line x1="${X(p) + dx / L * (o.r + 1)}" y1="${Y(p) + dy / L * (o.r + 1)}" x2="${X(q) - dx / L * (o.r + 3)}" y2="${Y(q) - dy / L * (o.r + 3)}" class="csp-garc" marker-end="url(#csp-garrow)"></line>`;
    }
    for (const v of o.vars) {
      const val = o.assignment[v];
      const cls = ['csp-gnode'];
      if (o.highlight.includes(v)) cls.push('hl');
      if (o.dim.includes(v)) cls.push('dim');
      if (o.removed.includes(v)) cls.push('removed');
      const fill = val ? HEX[val] || ACCENT : '#ffffff';
      s += `<g class="${cls.join(' ')}" data-var="${v}"><circle cx="${X(v)}" cy="${Y(v)}" r="${o.r}" fill="${fill}"></circle>`;
      s += `<text x="${X(v)}" y="${Y(v) + 4}" class="csp-gnode-label ${val ? 'on' : ''}">${(o.labels && o.labels[v]) || v}</text>`;
      if (o.sub[v]) s += `<text x="${X(v)}" y="${Y(v) + o.r + 12}" class="csp-gnode-sub">${o.sub[v]}</text>`;
      s += '</g>';
    }
    s += '</svg>';
    return s;
  }

  window.CSPRender = { regionPath, mapSVG, graphSVG };
})();
