/**
 * Interactive Grid World MDP Lab (Topic 06 · Sequential Decisions & MDPs)
 *
 * One shared 4×4 Grid World drives both concept tabs:
 *   'tuple'  — MDP Formulation ⟨S, A, P, R, γ⟩: pick a state and an action, see
 *              P(s′|s,a) and R(s,a,s′) for every outcome, then Step / Auto Play
 *              an episode and watch the discounted return G build up.
 *   'values' — State-value V^π(s) and action-value Q^π(s,a) of a chosen policy,
 *              with a best-action overlay and a step-by-step Bellman calculation.
 *
 * Environment (identical in both tabs):
 *   S  : 16 cells − 2 walls = 14 states (12 non-terminal + goal + pit)
 *   A  : {↑, →, ↓, ←}
 *   P  : intended move with prob 1 − slip, veer 90° left / right with slip/2 each;
 *        moving into a wall or the edge leaves the agent where it is.
 *   R  : R(s,a,s′) = +1 if s′ = goal, −1 if s′ = pit, otherwise the living reward.
 *   γ  : adjustable 0 … 0.99. Terminal states are absorbing with value 0.
 *
 * V^π is computed exactly by iterative policy evaluation (to 1e-12) and
 * Q^π(s,a) = Σ_s′ P(s′|s,a)[R(s,a,s′) + γ V^π(s′)]. π* comes from value iteration.
 *
 * Public API: window.MDPLab.render(container, 'tuple' | 'values')
 */
(function () {
  'use strict';

  // ------------------------------------------------------------------ world
  const NX = 4, NY = 4, CELL = 100, PAD = 26, SZ = NX * CELL + 2 * PAD;
  const WALLS = new Set(['2,3', '3,2']);
  const GOAL = '4,4', PIT = '4,3', START = '1,1';
  const ACTS = [
    { g: '↑', n: 'Up', dx: 0, dy: 1 },
    { g: '→', n: 'Right', dx: 1, dy: 0 },
    { g: '↓', n: 'Down', dx: 0, dy: -1 },
    { g: '←', n: 'Left', dx: -1, dy: 0 }
  ];
  const POLICIES = {
    opt: 'π* — optimal (greedy w.r.t. V*)',
    rand: 'Uniform random (¼ each)',
    up: 'Always ↑',
    right: 'Always →'
  };
  const POLICY_SHORT = { opt: 'π*', rand: 'random π', up: 'always-↑ π', right: 'always-→ π' };

  const key = (x, y) => x + ',' + y;
  const xy = s => s.split(',').map(Number);
  const isWall = s => WALLS.has(s);
  const isTerm = s => s === GOAL || s === PIT;
  const CELLS = [];
  for (let y = NY; y >= 1; y--) for (let x = 1; x <= NX; x++) CELLS.push(key(x, y));
  const STATES = CELLS.filter(s => !isWall(s));
  const NONTERM = STATES.filter(s => !isTerm(s));
  const L = s => `(${s})`;

  // ------------------------------------------------------------------ shared state
  const S = {
    gamma: 0.9, slip: 0.2, step: -0.04, policy: 'opt',
    // tab 1
    agent: START, a: null, rows: [], done: false, endKind: null, last: null, hl: new Set(), auto: false, msg1: null,
    // tab 2
    mode: 'V', sel: START, selA: 0, best: false, stepMode: false, calcK: 1
  };
  let root = null, view = 'tuple', timer = 0, cache = null;

  // ------------------------------------------------------------------ formatting
  function f(v, d = 2) {
    if (Math.abs(v) < 0.5 * Math.pow(10, -d)) v = 0;
    return (v < 0 ? '−' : '') + Math.abs(v).toFixed(d);
  }
  const fs = (v, d = 2) => (v > 0 && Math.abs(v) >= 0.5 * Math.pow(10, -d) ? '+' : '') + f(v, d);
  const sup = n => String(n).split('').map(c => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+c]).join('');
  const sub = n => String(n).split('').map(c => '₀₁₂₃₄₅₆₇₈₉'[+c]).join('');

  // ------------------------------------------------------------------ MDP model
  function move(s, ai) {
    if (isTerm(s)) return s;
    const [x, y] = xy(s), A = ACTS[ai], nx = x + A.dx, ny = y + A.dy;
    if (nx < 1 || nx > NX || ny < 1 || ny > NY) return s;
    const n = key(nx, ny);
    return isWall(n) ? s : n;
  }
  const reward = s2 => (s2 === GOAL ? 1 : s2 === PIT ? -1 : S.step);

  /** Individual outcomes of taking action ai in s (intended / veer left / veer right). */
  function outcomes(s, ai) {
    const p = S.slip;
    return [
      { kind: 'intended', ai, p: 1 - p },
      { kind: 'veer left', ai: (ai + 3) % 4, p: p / 2 },
      { kind: 'veer right', ai: (ai + 1) % 4, p: p / 2 }
    ].filter(c => c.p > 1e-12).map(c => {
      const s2 = move(s, c.ai);
      return Object.assign(c, { s2, bump: s2 === s, r: reward(s2) });
    });
  }

  /** Outcomes merged by next state s′ (probabilities summed). */
  function merged(s, ai) {
    const m = new Map();
    outcomes(s, ai).forEach(c => {
      if (!m.has(c.s2)) m.set(c.s2, { s2: c.s2, p: 0, r: c.r, comps: [] });
      const o = m.get(c.s2); o.p += c.p; o.comps.push(c);
    });
    return [...m.values()];
  }

  const vOf = (V, s) => (isTerm(s) ? 0 : V[s]);
  const qFrom = (V, s, ai) => merged(s, ai).reduce((t, o) => t + o.p * (o.r + S.gamma * vOf(V, o.s2)), 0);
  const zeroV = () => { const V = {}; STATES.forEach(s => { V[s] = 0; }); return V; };

  function valueIteration() {
    const V = zeroV();
    for (let it = 0; it < 50000; it++) {
      let delta = 0;
      NONTERM.forEach(s => {
        const v = Math.max(...ACTS.map((_, a) => qFrom(V, s, a)));
        delta = Math.max(delta, Math.abs(v - V[s])); V[s] = v;
      });
      if (delta < 1e-13) break;
    }
    const pi = {};
    NONTERM.forEach(s => {
      const q = ACTS.map((_, a) => qFrom(V, s, a)), mx = Math.max(...q);
      pi[s] = q.findIndex(v => v >= mx - 1e-9);
    });
    return { V, pi };
  }

  function piDist(s, piOpt) {
    if (S.policy === 'rand') return [0.25, 0.25, 0.25, 0.25];
    if (S.policy === 'up') return [1, 0, 0, 0];
    if (S.policy === 'right') return [0, 1, 0, 0];
    return ACTS.map((_, a) => (a === piOpt[s] ? 1 : 0));
  }

  function evaluatePolicy(piOpt) {
    const V = zeroV();
    for (let it = 0; it < 200000; it++) {
      let delta = 0;
      NONTERM.forEach(s => {
        const d = piDist(s, piOpt);
        const v = d.reduce((t, p, a) => (p ? t + p * qFrom(V, s, a) : t), 0);
        delta = Math.max(delta, Math.abs(v - V[s])); V[s] = v;
      });
      if (delta < 1e-13) break;
    }
    return V;
  }

  function solve() {
    const k = [S.gamma, S.slip, S.step, S.policy].join('|');
    if (cache && cache.k === k) return cache;
    const opt = valueIteration();
    const V = evaluatePolicy(opt.pi);
    const Q = {}, pi = {};
    NONTERM.forEach(s => { Q[s] = ACTS.map((_, a) => qFrom(V, s, a)); pi[s] = piDist(s, opt.pi); });
    cache = { k, V, Q, pi, piOpt: opt.pi, Vstar: opt.V };
    return cache;
  }
  const bestA = (Q, s) => { const mx = Math.max(...Q[s]); return Q[s].findIndex(v => v >= mx - 1e-9); };

  // ------------------------------------------------------------------ geometry
  const cx = s => PAD + (xy(s)[0] - 1) * CELL + CELL / 2;
  const cy = s => PAD + (NY - xy(s)[1]) * CELL + CELL / 2;
  const x0 = s => cx(s) - CELL / 2, y0 = s => cy(s) - CELL / 2;

  function defs() {
    const mk = (id, c) => `<marker id="${id}" viewBox="0 0 10 10" refX="7.5" refY="5" markerUnits="userSpaceOnUse" markerWidth="14" markerHeight="14" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z" fill="${c}"/></marker>`;
    return `<defs>
      <pattern id="mdl-hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="10" height="10" fill="#334155"/><line x1="0" y1="0" x2="0" y2="10" stroke="#475569" stroke-width="4"/></pattern>
      ${mk('mdl-ah-p', '#d97706')}${mk('mdl-ah-pd', '#b45309')}${mk('mdl-ah-best', '#f59e0b')}${mk('mdl-ah-pi', '#334155')}
    </defs>`;
  }

  /** Static furniture of a cell: walls, goal, pit, labels (shared look). */
  function furniture(s, opts = {}) {
    const X = x0(s), Y = y0(s), c1 = cx(s), c2 = cy(s);
    let h = '';
    if (isWall(s)) {
      h += `<rect x="${X + 2}" y="${Y + 2}" width="${CELL - 4}" height="${CELL - 4}" rx="8" fill="url(#mdl-hatch)" class="mdl-cell" data-cell="${s}"/>`;
      h += `<text x="${c1}" y="${c2 + 5}" class="mdl-wall-t">WALL</text>`;
      return h;
    }
    if (s === GOAL) {
      h += `<g class="mdl-noptr"><line x1="${c1 - 12}" y1="${c2 - 30}" x2="${c1 - 12}" y2="${c2 + 2}" stroke="#047857" stroke-width="3" stroke-linecap="round"/>
        <path d="M${c1 - 11} ${c2 - 30} L${c1 + 14} ${c2 - 22} L${c1 - 11} ${c2 - 14} Z" fill="#10b981"/>
        <text x="${c1}" y="${c2 + 24}" class="mdl-term-t pos">+1</text>
        ${opts.termNote ? `<text x="${c1}" y="${c2 + 40}" class="mdl-term-n">terminal · V = 0</text>` : `<text x="${c1}" y="${c2 + 40}" class="mdl-term-n">GOAL</text>`}</g>`;
    } else if (s === PIT) {
      h += `<g class="mdl-noptr"><ellipse cx="${c1}" cy="${c2 - 16}" rx="22" ry="9" fill="#9f1239" opacity="0.85"/>
        <ellipse cx="${c1}" cy="${c2 - 18}" rx="15" ry="5" fill="#4c0519"/>
        <text x="${c1}" y="${c2 + 24}" class="mdl-term-t neg">−1</text>
        ${opts.termNote ? `<text x="${c1}" y="${c2 + 40}" class="mdl-term-n">terminal · V = 0</text>` : `<text x="${c1}" y="${c2 + 40}" class="mdl-term-n">PIT</text>`}</g>`;
    }
    if (opts.coords !== false) h += `<text x="${X + 6}" y="${Y + 14}" class="mdl-coord">(${s})</text>`;
    if (s === START && opts.start) h += `<text x="${X + CELL - 6}" y="${Y + CELL - 7}" class="mdl-start-t">start</text>`;
    return h;
  }

  function cellBase(s, fill) {
    if (isWall(s)) return '';
    return `<rect x="${x0(s) + 2}" y="${y0(s) + 2}" width="${CELL - 4}" height="${CELL - 4}" rx="8" fill="${fill}" class="mdl-cell" data-cell="${s}"/>`;
  }
  const termFill = s => (s === GOAL ? '#dcfce7' : s === PIT ? '#ffe4e6' : '#ffffff');

  function agentSVG() {
    return `<circle r="21" fill="currentColor" stroke="#fff" stroke-width="3"/>
      <circle cx="-7" cy="-4" r="3.6" fill="#fff"/><circle cx="7" cy="-4" r="3.6" fill="#fff"/>
      <path d="M-7 7 Q0 13 7 7" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
  }

  // ================================================================== TAB 1 — ⟨S, A, P, R, γ⟩
  function fanSVG(s, ai, chosen) {
    const outs = merged(s, ai);
    let h = '';
    outs.forEach(o => {
      const faded = chosen !== undefined && o.s2 !== chosen;
      const isChosen = chosen !== undefined && o.s2 === chosen;
      const op = faded ? 0.22 : 1;
      const intended = o.comps.some(c => c.kind === 'intended');
      const w = (2 + 9 * o.p).toFixed(1);
      const rCls = o.r > 0 ? 'pos' : o.r < 0 ? 'neg' : 'zero';
      if (o.s2 !== s) {
        const ux = Math.sign(cx(o.s2) - cx(s)), uy = Math.sign(cy(o.s2) - cy(s));
        const sx = cx(s) + ux * 27, sy = cy(s) + uy * 27, ex = cx(o.s2) - ux * 30, ey = cy(o.s2) - uy * 30;
        h += `<rect x="${x0(o.s2) + 4}" y="${y0(o.s2) + 4}" width="${CELL - 8}" height="${CELL - 8}" rx="7" class="mdl-dest ${isChosen ? 'chosen' : ''}" style="opacity:${faded ? 0.25 : 0.25 + 0.6 * o.p}"/>`;
        h += `<line x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}" class="mdl-arrow ${intended ? '' : 'veer'}" stroke-width="${w}" marker-end="url(#mdl-ah-p${intended ? '' : 'd'})" style="opacity:${op}"/>`;
        const lx = cx(s) + ux * 50, ly = cy(s) + uy * 50;
        h += `<g style="opacity:${op}"><rect x="${lx - 21}" y="${ly - 10}" width="42" height="20" rx="10" class="mdl-plbl"/><text x="${lx}" y="${ly + 4.5}" class="mdl-plbl-t">${o.p.toFixed(2)}</text></g>`;
        if (isTerm(o.s2)) {
          const bx = x0(o.s2) + CELL - 26, by = y0(o.s2) + 15;
          h += `<g style="opacity:${op}"><rect x="${bx - 22}" y="${by - 8}" width="44" height="16" rx="5" class="mdl-rbadge ${rCls}"/><text x="${bx}" y="${by + 3.5}" class="mdl-rbadge-t sm ${rCls}">R ${fs(o.r)}</text></g>`;
        } else {
          const bx = cx(o.s2) + ux * 22, by = cy(o.s2) + uy * 24 + (uy === 0 ? 24 : 0);
          h += `<g style="opacity:${op}"><rect x="${bx - 30}" y="${by - 9}" width="60" height="18" rx="5" class="mdl-rbadge ${rCls}"/><text x="${bx}" y="${by + 4}" class="mdl-rbadge-t ${rCls}">R ${fs(o.r)}</text></g>`;
        }
      } else {
        // bump: self-loop drawn on the side of the blocked direction
        const b = o.comps[0], A = ACTS[b.ai], dx = A.dx, dy = -A.dy, px = -dy, py = dx;
        const c1 = cx(s), c2 = cy(s);
        const P = (k, m) => `${(c1 + dx * k + px * m).toFixed(1)} ${(c2 + dy * k + py * m).toFixed(1)}`;
        h += `<path d="M${P(22, 13)} C${P(60, 34)} ${P(60, -34)} ${P(23, -12)}" fill="none" class="mdl-arrow ${intended ? '' : 'veer'}" stroke-width="${(2 + 4.5 * o.p).toFixed(1)}" marker-end="url(#mdl-ah-p${intended ? '' : 'd'})" style="opacity:${op}"/>`;
        const lx = c1 + dx * 57, ly = c2 + dy * 57;
        h += `<g style="opacity:${op}"><rect x="${lx - 21}" y="${ly - 10}" width="42" height="20" rx="10" class="mdl-plbl"/><text x="${lx}" y="${ly + 4.5}" class="mdl-plbl-t">${o.p.toFixed(2)}</text></g>`;
        const bx = dx > 0 ? x0(s) + 26 : x0(s) + CELL - 26, by = (dy < 0 || dx > 0) ? y0(s) + CELL - 15 : y0(s) + 15;
        h += `<g style="opacity:${op}"><rect x="${bx - 22}" y="${by - 8}" width="44" height="16" rx="5" class="mdl-rbadge ${rCls}"/><text x="${bx}" y="${by + 3.5}" class="mdl-rbadge-t sm ${rCls}">R ${fs(o.r)}</text></g>`;
        if (isChosen) h += `<rect x="${x0(s) + 4}" y="${y0(s) + 4}" width="${CELL - 8}" height="${CELL - 8}" rx="7" class="mdl-dest chosen" style="opacity:0.6"/>`;
      }
    });
    return h;
  }

  function t1Cells() {
    return CELLS.map(s => cellBase(s, termFill(s)) + furniture(s, { start: true })).join('') +
      (isTerm(S.agent) ? '' : `<rect x="${x0(S.agent) + 2}" y="${y0(S.agent) + 2}" width="${CELL - 4}" height="${CELL - 4}" rx="8" class="mdl-sel-s"/>`);
  }

  function t1Overlay() {
    if (S.last) return fanSVG(S.last.s, S.last.ai, S.last.s2);
    if (S.a !== null && !isTerm(S.agent)) return fanSVG(S.agent, S.a);
    return '';
  }

  const G0 = () => S.rows.reduce((t, r, i) => t + Math.pow(S.gamma, i) * r.r, 0);

  function chipsHTML() {
    const s = S.agent, a = S.a, on = k => (S.hl.has(k) ? 'hot' : '');
    let pTxt = '—', rTxt = '—';
    if (a !== null && !isTerm(s)) {
      const outs = merged(s, a);
      pTxt = outs.map(o => String(+o.p.toFixed(2))).join(' · ');
      rTxt = 'E[r] = ' + f(outs.reduce((t, o) => t + o.p * o.r, 0), 3);
    }
    const horizon = S.gamma < 1 ? (1 / (1 - S.gamma)) : Infinity;
    return `
      <div class="mdl-chip c-s ${on('S')}"><span class="sym">S</span><span class="val">s = ${L(s)}</span><span class="sub">|S| = ${STATES.length} (${NONTERM.length} + 2 terminal)</span></div>
      <div class="mdl-chip c-a ${on('A')}"><span class="sym">A</span><span class="val">a = ${a === null ? '?' : ACTS[a].g + ' ' + ACTS[a].n}</span><span class="sub">{↑, →, ↓, ←}</span></div>
      <div class="mdl-chip c-p ${on('P')}"><span class="sym">P</span><span class="val">${pTxt}</span><span class="sub">P(s′ | s, a) · slip ${S.slip.toFixed(1)}</span></div>
      <div class="mdl-chip c-r ${on('R')}"><span class="sym">R</span><span class="val">${rTxt}</span><span class="sub">+1 goal · −1 pit · ${f(S.step)} step</span></div>
      <div class="mdl-chip c-g ${on('g')}"><span class="sym">γ</span><span class="val">${S.gamma.toFixed(2)}</span><span class="sub">horizon ≈ ${isFinite(horizon) ? horizon.toFixed(horizon < 10 ? 1 : 0) : '∞'} steps</span></div>`;
  }

  function padHTML(sel, labels) {
    const b = (ai, cls) => `<button class="mdl-pad-btn ${cls} ${sel === ai ? 'on' : ''}" data-a="${ai}" title="${ACTS[ai].n}">${ACTS[ai].g}${labels ? `<small>${labels[ai]}</small>` : ''}</button>`;
    return `<div class="mdl-pad">${b(0, 'u')}${b(3, 'l')}<div class="mdl-pad-mid">${labels ? '' : L(S.agent)}</div>${b(1, 'r')}${b(2, 'd')}</div>`;
  }

  function gammaBars() {
    return [...Array(11).keys()].map(k => {
      const v = Math.pow(S.gamma, k);
      return `<div class="mdl-gbar"><i style="height:${(v * 100).toFixed(1)}%"></i><span>${k === 0 ? '1' : v.toFixed(2).replace(/^0/, '')}</span><em>γ${sup(k)}</em></div>`;
    }).join('');
  }
  function gammaCard() {
    return `<div class="tfp-card-head"><h4><span class="mdl-tag c-g">γ</span> Discount factor</h4><span class="tfp-card-sub">G<sub>t</sub> = Σ γ<sup>k</sup> r<sub>t+k+1</sub></span></div>
      <div class="mdl-slider"><input type="range" min="0" max="0.99" step="0.01" value="${S.gamma}" data-set="gamma" aria-label="Discount factor gamma"><b data-gval>${S.gamma.toFixed(2)}</b></div>
      <div class="mdl-gbars" id="mdl-gbars"></div>
      <div class="tfp-hint">A +1 reached 6 steps from now is worth γ⁵ = <b data-g5></b> today.</div>`;
  }
  function syncGamma() {
    root.querySelectorAll('[data-gval]').forEach(el => { el.textContent = S.gamma.toFixed(2); });
    root.querySelectorAll('[data-g5]').forEach(el => { el.textContent = Math.pow(S.gamma, 5).toFixed(3); });
    const gb = root.querySelector('#mdl-gbars'); if (gb) gb.innerHTML = gammaBars();
  }

  function settingsHTML(withGamma) {
    return `<div class="mdl-settings">
      ${withGamma ? `<label class="mdl-set"><span>γ</span><input type="range" min="0" max="0.99" step="0.01" value="${S.gamma}" data-set="gamma" aria-label="Discount factor gamma"><b data-gval>${S.gamma.toFixed(2)}</b></label>` : ''}
      <label class="mdl-set"><span>Movement noise</span><select data-set="slip">
        <option value="0" ${S.slip === 0 ? 'selected' : ''}>Deterministic (1.0)</option>
        <option value="0.2" ${S.slip === 0.2 ? 'selected' : ''}>Slippery (0.8 / 0.1 / 0.1)</option>
        <option value="0.4" ${S.slip === 0.4 ? 'selected' : ''}>Very slippery (0.6 / 0.2 / 0.2)</option></select></label>
      <label class="mdl-set"><span>Living reward</span><select data-set="step">
        ${[0, -0.04, -0.1, -0.4].map(v => `<option value="${v}" ${S.step === v ? 'selected' : ''}>${fs(v)}</option>`).join('')}</select></label>
    </div>`;
  }

  function policySelect(id) {
    return `<select data-set="policy" id="${id}">${Object.entries(POLICIES).map(([k, v]) => `<option value="${k}" ${S.policy === k ? 'selected' : ''}>${v}</option>`).join('')}</select>`;
  }

  function pTable() {
    const s = S.last ? S.last.s : S.agent, a = S.last ? S.last.ai : S.a;
    if (isTerm(S.agent) && !S.last) return `<div class="tfp-hint">${L(S.agent)} is terminal — the episode is over, so no action is available. Press <b>Reset</b> or click another cell.</div>`;
    if (a === null) return '<div class="tfp-hint">Choose an action to list every possible next state s′ with its probability P(s′|s,a) and reward R(s,a,s′).</div>';
    const comps = outcomes(s, a);
    const er = comps.reduce((t, c) => t + c.p * c.r, 0);
    return `<div class="mdl-sa">s = ${L(s)}, a = ${ACTS[a].g}${S.last ? ' <span class="mdl-mute">(last step)</span>' : ''}</div>
      <table class="mdl-table"><thead><tr><th>outcome</th><th>moves</th><th>s′</th><th class="c-p">P</th><th class="c-r">R</th><th>P·R</th></tr></thead><tbody>
      ${comps.map(c => `<tr class="${S.last && S.last.kind === c.kind ? 'hit' : ''}"><td>${c.kind}</td><td>${ACTS[c.ai].g}${c.bump ? ' <span class="mdl-bump">bump → stay</span>' : ''}</td><td>${L(c.s2)}</td><td class="c-p">${c.p.toFixed(2)}</td><td class="c-r">${fs(c.r)}</td><td>${f(c.p * c.r, 3)}</td></tr>`).join('')}
      </tbody><tfoot><tr><td colspan="3">Σ</td><td class="c-p">${comps.reduce((t, c) => t + c.p, 0).toFixed(2)}</td><td></td><td><b>E[r] = ${f(er, 3)}</b></td></tr></tfoot></table>`;
  }

  function traceHTML() {
    if (!S.rows.length) return '<div class="tfp-hint">No steps yet. Each Step samples s′ ~ P(·|s,a), collects r = R(s,a,s′) and adds γ<sup>t</sup>·r to the return G₀.</div>';
    const g = S.gamma;
    return `<div class="mdl-trace-wrap"><table class="mdl-table mdl-trace"><thead><tr><th>t</th><th>s<sub>t</sub></th><th>a<sub>t</sub></th><th>outcome</th><th>s<sub>t+1</sub></th><th class="c-r">r<sub>t+1</sub></th><th class="c-g">γ<sup>t</sup></th><th>γ<sup>t</sup>·r</th></tr></thead><tbody>
      ${S.rows.map((r, i) => `<tr><td>${i}</td><td>${L(r.s)}</td><td>${ACTS[r.ai].g}</td><td>${r.kind}${r.bump ? ' · bump' : ''}</td><td>${L(r.s2)}</td><td class="c-r">${fs(r.r)}</td><td class="c-g">${Math.pow(g, i).toFixed(3)}</td><td>${f(Math.pow(g, i) * r.r, 3)}</td></tr>`).join('')}
      </tbody></table></div>
      <div class="mdl-G">G₀ = ${S.rows.slice(0, 4).map((r, i) => (i ? 'γ' + (i > 1 ? sup(i) : '') + '·' : '') + `(${fs(r.r)})`).join(' + ')}${S.rows.length > 4 ? ' + …' : ''} = <b>${f(G0(), 3)}</b>${S.done ? (S.endKind === 'goal' ? ' <span class="mdl-end pos">reached goal</span>' : S.endKind === 'pit' ? ' <span class="mdl-end neg">fell in pit</span>' : ' <span class="mdl-end">truncated at 60 steps</span>') : ''}</div>`;
  }

  function t1Message() {
    if (S.msg1) return S.msg1;
    return ['try', 'Start', `The agent is at <b>s = ${L(S.agent)}</b>. Pick an action <b>A</b> with the arrow pad (or keyboard ← ↑ → ↓). Because the floor is slippery, one action can lead to several next states — the arrows show <b>P(s′|s,a)</b> and each landing cell shows its reward <b>R</b>.`];
  }

  function describeFan(s, a) {
    const comps = outcomes(s, a), er = comps.reduce((t, c) => t + c.p * c.r, 0);
    const parts = comps.map(c => `${c.kind} (${ACTS[c.ai].g}) ${c.bump ? 'bumps into the edge/wall and stays at ' + L(s) : 'moves to ' + L(c.s2)} with P = ${c.p.toFixed(2)}, R = ${fs(c.r)}`);
    return `From <b>${L(s)}</b>, action <b>${ACTS[a].g}</b>: ${parts.join('; ')}. Probabilities sum to 1; expected immediate reward <b>E[r] = ${f(er, 3)}</b>.`;
  }

  function skeleton1() {
    root.innerHTML = `<div class="tfp-viz mdl-viz">
      <div class="tfp-viz-head"><h3>Grid World MDP · ⟨S, A, P, R, γ⟩</h3>${settingsHTML(false)}</div>
      <div class="mdl-tuple" id="mdl-chips"></div>
      <div class="tfp-msg mdl-msg" id="mdl-msg"></div>
      <div class="mdl-two">
        <div class="tfp-card mdl-gridcard">
          <svg viewBox="0 0 ${SZ} ${SZ}" class="mdl-svg" id="mdl-svg" role="img" aria-label="4 by 4 grid world">${defs()}
            <g id="mdl-cells"></g><g id="mdl-over"></g>
            <g id="mdl-agent" class="mdl-agent" style="transform:translate(${cx(S.agent)}px, ${cy(S.agent)}px)">${agentSVG()}</g>
          </svg>
          <div class="mdl-legend"><span><i class="lg-s"></i>current state s</span><span><i class="lg-p"></i>intended move</span><span><i class="lg-pd"></i>slip (veer 90°)</span><span><i class="lg-r"></i>reward R(s,a,s′)</span><span>click a cell to place the agent</span></div>
        </div>
        <div class="mdl-side">
          <div class="tfp-card"><div class="tfp-card-head"><h4><span class="mdl-tag c-a">A</span> Choose action</h4><span class="tfp-card-sub">keyboard arrows work too</span></div><div id="mdl-pad"></div></div>
          <div class="tfp-card"><div class="mdl-btns">
              <button class="tfp-btn primary" data-act="step"><i data-lucide="step-forward"></i>Step</button>
              <button class="tfp-btn" data-act="auto" id="mdl-auto"><i data-lucide="play"></i>Auto Play</button>
              <button class="tfp-btn" data-act="reset"><i data-lucide="rotate-ccw"></i>Reset</button></div>
            <label class="mdl-set wide"><span>Auto Play follows π</span>${policySelect('mdl-pol1')}</label>
            <div class="tfp-hint" style="margin-top:.35rem">The policy π is the agent's choice — it is <b>not</b> part of the MDP ⟨S, A, P, R, γ⟩.</div></div>
          <div class="tfp-card" id="mdl-gcard">${gammaCard()}</div>
        </div>
      </div>
      <div class="mdl-two even">
        <div class="tfp-card"><div class="tfp-card-head"><h4><span class="mdl-tag c-p">P</span><span class="mdl-tag c-r">R</span> Transition &amp; reward model</h4><span class="tfp-card-sub">Σ<sub>s′</sub> P(s′|s,a) = 1</span></div><div id="mdl-ptable"></div></div>
        <div class="tfp-card"><div class="tfp-card-head"><h4>Episode trace &amp; return</h4><span class="tfp-card-sub">Markov: s<sub>t+1</sub> depends only on (s<sub>t</sub>, a<sub>t</sub>)</span></div><div id="mdl-trace"></div></div>
      </div>
    </div>`;
    update1();
    if (window.lucide) window.lucide.createIcons();
  }

  function update1() {
    const $ = id => root.querySelector('#' + id);
    $('mdl-cells').innerHTML = t1Cells();
    $('mdl-over').innerHTML = t1Overlay();
    const ag = $('mdl-agent');
    ag.style.transform = `translate(${cx(S.agent)}px, ${cy(S.agent)}px)`;
    ag.style.color = S.agent === GOAL ? '#059669' : S.agent === PIT ? '#e11d48' : '#2563eb';
    $('mdl-chips').innerHTML = chipsHTML();
    const [k, tag, txt] = t1Message();
    const m = $('mdl-msg'); m.className = `tfp-msg mdl-msg ${k}`; m.innerHTML = `<span class="tfp-msg-tag">${tag}</span><span>${txt}</span>`;
    $('mdl-pad').innerHTML = padHTML(S.a);
    syncGamma();
    $('mdl-ptable').innerHTML = pTable();
    $('mdl-trace').innerHTML = traceHTML();
    const tw = root.querySelector('.mdl-trace-wrap'); if (tw) tw.scrollTop = tw.scrollHeight;
    const au = $('mdl-auto'); au.innerHTML = S.auto ? '<i data-lucide="pause"></i>Pause' : '<i data-lucide="play"></i>Auto Play'; au.classList.toggle('on', S.auto);
    if (window.lucide) window.lucide.createIcons();
  }

  function sampleStep(ai) {
    const s = S.agent, comps = outcomes(s, ai), u = Math.random();
    let acc = 0, c = comps[comps.length - 1];
    for (const o of comps) { acc += o.p; if (u < acc) { c = o; break; } }
    const t = S.rows.length;
    S.rows.push({ s, ai, s2: c.s2, r: c.r, kind: c.kind, bump: c.bump });
    S.last = { s, ai, s2: c.s2, kind: c.kind };
    S.agent = c.s2;
    S.hl = new Set(['S', 'A', 'P', 'R', 'g']);
    const contrib = Math.pow(S.gamma, t) * c.r;
    let txt = `Rolled u = ${u.toFixed(2)} → <b>${c.kind}</b> ${ACTS[c.ai].g} (P = ${c.p.toFixed(2)}). ${c.bump ? `Bumped into ${L(s)}'s wall/edge and stayed put.` : `Moved ${L(s)} → <b>${L(c.s2)}</b>.`} Reward r = <b>${fs(c.r)}</b>, discounted γ${sup(t)}·r = ${f(contrib, 3)}. Return so far G₀ = <b>${f(G0(), 3)}</b>.`;
    if (c.s2 === GOAL || c.s2 === PIT) {
      S.done = true; S.endKind = c.s2 === GOAL ? 'goal' : 'pit'; stopAuto();
      txt += c.s2 === GOAL
        ? ` <b>Goal reached in ${S.rows.length} steps!</b> Drag γ lower and watch G₀ shrink: the same +1 is worth less when it arrives late.`
        : ` <b>Fell into the pit.</b> Slips make risky paths next to the pit costly — that is what P captures.`;
      S.msg1 = [c.s2 === GOAL ? 'ok' : 'bad', 'Episode over', txt];
    } else if (S.rows.length >= 60) {
      S.done = true; S.endKind = 'trunc'; stopAuto();
      S.msg1 = ['info', 'Truncated', txt + ' Stopped after 60 steps — this policy may never reach a terminal state.'];
    } else {
      S.msg1 = ['step', `Step ${t + 1}`, txt + ` <span class="mdl-mute">Markov property: what happens next depends only on ${L(c.s2)} and the next action, not on the path so far.</span>`];
    }
  }

  function policyAction(s) {
    const d = solve().pi[s], u = Math.random();
    let acc = 0;
    for (let a = 0; a < 4; a++) { acc += d[a]; if (u < acc) return a; }
    return 3;
  }

  function stepBtn(fromAuto) {
    if (S.done || isTerm(S.agent)) {
      S.msg1 = ['info', 'Done', 'The episode has ended at a terminal state. Press <b>Reset</b> (or click a cell) to start a new one.'];
      return;
    }
    if (fromAuto) S.a = policyAction(S.agent);
    if (S.a === null) {
      S.hl = new Set(['A']);
      S.msg1 = ['try', 'Pick A', 'Choose an action first (↑ → ↓ ←), or press <b>Auto Play</b> to let the policy π choose actions for you.'];
      return;
    }
    sampleStep(S.a);
  }

  function resetEpisode(at, msg) {
    stopAuto();
    S.agent = at || START; S.rows = []; S.done = false; S.endKind = null; S.last = null;
    S.hl = new Set(['S']);
    S.msg1 = msg || null;
  }

  function startAuto() {
    if (S.done || isTerm(S.agent)) resetEpisode(START);
    S.auto = true; S.last = null;
    const tick = () => {
      if (!root || !document.body.contains(root) || view !== 'tuple') { stopAuto(); return; }
      if (!S.auto) return;
      stepBtn(true);
      if (S.msg1 && S.msg1[0] === 'step') S.msg1[1] = `Auto · ${POLICY_SHORT[S.policy]}`;
      update1();
    };
    timer = setInterval(tick, 900);
    tick();
  }
  function stopAuto() { clearInterval(timer); timer = 0; S.auto = false; }

  function click1(e) {
    const cell = e.target.closest('[data-cell]');
    if (cell && root.querySelector('#mdl-svg').contains(cell)) {
      const s = cell.dataset.cell;
      if (isWall(s)) { S.hl = new Set(['S']); S.msg1 = ['info', 'Obstacle', `${L(s)} is a wall — it is <b>not</b> in S. Any move into it bounces the agent back to where it was (a “bump”).`]; update1(); return; }
      if (isTerm(s)) { S.hl = new Set(['S', 'R']); S.msg1 = ['info', 'Terminal', `${L(s)} is a terminal state: entering it gives R = ${s === GOAL ? '+1' : '−1'} and ends the episode. No actions are taken from it.`]; update1(); return; }
      resetEpisode(s);
      S.msg1 = ['s', 'State S', `Agent placed at <b>s = ${L(s)}</b> — a new episode starts here. ${S.a !== null ? describeFan(s, S.a) : 'Now pick an action.'}`];
      S.hl = new Set(S.a !== null ? ['S', 'P', 'R'] : ['S']);
      update1(); return;
    }
    const b = e.target.closest('[data-a],[data-act]');
    if (!b || !root.contains(b)) return;
    if (b.dataset.a !== undefined) { chooseAction1(+b.dataset.a); return; }
    const act = b.dataset.act;
    if (act === 'step') { stopAuto(); stepBtn(false); }
    else if (act === 'auto') { if (S.auto) { stopAuto(); S.msg1 = ['info', 'Paused', 'Auto Play paused. Press <b>Step</b> to continue by hand or <b>Auto Play</b> to resume.']; } else { startAuto(); return; } }
    else if (act === 'reset') resetEpisode(START, ['try', 'Reset', `Agent back at the start <b>${L(START)}</b>, return G₀ = 0. ${S.a !== null ? describeFan(START, S.a) : 'Pick an action.'}`]);
    update1();
  }

  function chooseAction1(ai) {
    stopAuto();
    if (isTerm(S.agent) || S.done) { S.msg1 = ['info', 'Done', 'The episode has ended. Press <b>Reset</b> or click a cell first.']; S.a = ai; update1(); return; }
    S.a = ai; S.last = null;
    S.hl = new Set(['A', 'P', 'R']);
    S.msg1 = ['p', 'P & R', describeFan(S.agent, ai) + ' Press <b>Step</b> to roll the dice.'];
    update1();
  }

  // ================================================================== TAB 2 — V(s) & Q(s,a)
  function vColor(v, m) {
    if (Math.abs(v) < 1e-9) return '#f8fafc';
    const a = Math.min(1, Math.abs(v) / m);
    return v > 0 ? `rgba(16,185,129,${(0.07 + 0.6 * a).toFixed(3)})` : `rgba(244,63,94,${(0.07 + 0.55 * a).toFixed(3)})`;
  }

  function wedgePts(s, ai) {
    const X = x0(s) + 2, Y = y0(s) + 2, W = CELL - 4, C = [cx(s), cy(s)];
    const tl = [X, Y], tr = [X + W, Y], br = [X + W, Y + W], bl = [X, Y + W];
    const tri = [[tl, tr], [tr, br], [br, bl], [bl, tl]][ai];
    return [tri[0], tri[1], C].map(p => p.join(',')).join(' ');
  }
  const wedgeText = (s, ai) => [[cx(s), y0(s) + 23], [x0(s) + CELL - 22, cy(s) + 4], [cx(s), y0(s) + CELL - 13], [x0(s) + 22, cy(s) + 4]][ai];

  function tri(s, ai, r, cls) {
    const d = 36, A = ACTS[ai], c1 = cx(s) + A.dx * d, c2 = cy(s) - A.dy * d, px = -A.dy, py = -A.dx;
    // pointing triangle in the direction of the action
    const tip = [c1 + A.dx * r, c2 - A.dy * r], b1 = [c1 + px * r * 0.8, c2 + py * r * 0.8], b2 = [c1 - px * r * 0.8, c2 - py * r * 0.8];
    return `<polygon points="${[tip, b1, b2].map(p => p.map(v => v.toFixed(1)).join(',')).join(' ')}" class="${cls}"/>`;
  }

  function t2SVG(calcCells) {
    const sol = solve(), { V, Q, pi } = sol;
    const vals = S.mode === 'V' ? NONTERM.map(s => V[s]) : NONTERM.flatMap(s => Q[s]);
    const m = Math.max(0.05, ...vals.map(Math.abs));
    let h = `<svg viewBox="0 0 ${SZ} ${SZ}" class="mdl-svg" id="mdl-svg2" role="img" aria-label="Grid world value map">${defs()}`;
    CELLS.forEach(s => {
      if (isWall(s)) { h += furniture(s); return; }
      if (isTerm(s)) { h += cellBase(s, termFill(s)) + furniture(s, { termNote: true }); return; }
      const ba = bestA(Q, s);
      if (S.mode === 'V') {
        h += cellBase(s, vColor(V[s], m));
        h += `<text x="${cx(s)}" y="${cy(s) + 7}" class="mdl-vtxt">${f(V[s], 2)}</text>`;
        pi[s].forEach((p, a) => { if (p > 0) h += tri(s, a, p === 1 ? 8 : 5.5, 'mdl-pi' + (p < 1 ? ' soft' : '')); });
        if (S.best) h += tri(s, ba, 10, 'mdl-best-tri');
        h += `<text x="${x0(s) + 6}" y="${y0(s) + 14}" class="mdl-coord">(${s})</text>`;
        if (s === START) h += `<text x="${x0(s) + CELL - 6}" y="${y0(s) + CELL - 7}" class="mdl-start-t">start</text>`;
      } else {
        ACTS.forEach((_, a) => {
          const isSel = s === S.sel && a === S.selA;
          h += `<polygon points="${wedgePts(s, a)}" fill="${vColor(Q[s][a], m)}" class="mdl-wedge" data-cell="${s}" data-qa="${a}"/>`;
        });
        ACTS.forEach((_, a) => {
          const [tx, ty] = wedgeText(s, a);
          h += `<text x="${tx}" y="${ty}" class="mdl-qtxt ${S.best && a === ba ? 'best' : ''}">${f(Q[s][a], 2)}</text>`;
        });
        pi[s].forEach((p, a) => { if (p === 1) { const A = ACTS[a]; h += `<circle cx="${cx(s) + A.dx * 11}" cy="${cy(s) - A.dy * 11}" r="4" class="mdl-pidot"/>`; } });
      }
    });
    if (S.mode === 'Q') {
      if (S.best) NONTERM.forEach(s => { h += `<polygon points="${wedgePts(s, bestA(Q, s))}" class="mdl-wedge-ol best"/>`; });
      if (S.sel && !isWall(S.sel) && !isTerm(S.sel)) h += `<polygon points="${wedgePts(S.sel, S.selA)}" class="mdl-wedge-ol sel"/>`;
    }
    (calcCells || []).forEach(s => { h += `<rect x="${x0(s) + 5}" y="${y0(s) + 5}" width="${CELL - 10}" height="${CELL - 10}" rx="6" class="mdl-calc-hl"/>`; });
    if (S.sel && !isWall(S.sel)) h += `<rect x="${x0(S.sel) + 2}" y="${y0(S.sel) + 2}" width="${CELL - 4}" height="${CELL - 4}" rx="8" class="mdl-sel-s"/>`;
    return h + '</svg>';
  }

  function outcomeLine(s, a, V) {
    return merged(s, a).map(o => {
      const v = vOf(V, o.s2), inner = o.r + S.gamma * v;
      const what = o.comps.map(c => `${c.kind} ${ACTS[c.ai].g}${c.bump ? ' (bump)' : ''}`).join(' + ');
      return {
        k: `s′ = ${L(o.s2)}`, cells: [o.s2],
        html: `<span class="mdl-mute">${what}:</span> <span class="c-p">${o.p.toFixed(2)}</span> × [ <span class="c-r">${fs(o.r)}</span> + <span class="c-g">${S.gamma.toFixed(2)}</span> × ${isTerm(o.s2) ? '0 <span class="mdl-mute">(terminal)</span>' : f(v, 3)} ] = <span class="c-p">${o.p.toFixed(2)}</span> × ${f(inner, 3)} = <b>${f(o.p * inner, 3)}</b>`,
        o
      };
    });
  }

  function splitQ(s, a, V) {
    const outs = merged(s, a);
    const imm = outs.reduce((t, o) => t + o.p * o.r, 0);
    const ev = outs.reduce((t, o) => t + o.p * vOf(V, o.s2), 0);
    return { imm, ev, fut: S.gamma * ev };
  }

  function calcLines() {
    const { V, Q, pi } = solve(), s = S.sel;
    if (!s || isWall(s) || isTerm(s)) return null;
    const lines = [];
    if (S.mode === 'Q') {
      const a = S.selA, sp = splitQ(s, a, V);
      lines.push({ k: 'Bellman', cells: [s], html: `Q<sup>π</sup>(s,a) = Σ<sub>s′</sub> <span class="c-p">P(s′|s,a)</span> · [ <span class="c-r">R(s,a,s′)</span> + <span class="c-g">γ</span> · V<sup>π</sup>(s′) ] &nbsp; with s = ${L(s)}, a = ${ACTS[a].g}` });
      outcomeLine(s, a, V).forEach(l => lines.push(l));
      lines.push({ k: 'immediate', cls: 'imm', cells: [], html: `expected immediate reward Σ P·R = <b>${f(sp.imm, 3)}</b>` });
      lines.push({ k: 'future', cls: 'fut', cells: [], html: `discounted future γ · Σ P·V<sup>π</sup>(s′) = ${S.gamma.toFixed(2)} × ${f(sp.ev, 3)} = <b>${f(sp.fut, 3)}</b>` });
      lines.push({ k: 'Q', cls: 'total', cells: [], html: `Q<sup>π</sup>(${L(s)}, ${ACTS[a].g}) = ${f(sp.imm, 3)} + ${f(sp.fut, 3)} = <b>${f(Q[s][a], 3)}</b>` });
      return { lines, imm: sp.imm, fut: sp.fut, total: Q[s][a] };
    }
    const d = pi[s], acts = d.map((p, a) => [p, a]).filter(x => x[0] > 0);
    lines.push({ k: 'Bellman', cells: [s], html: `V<sup>π</sup>(s) = Σ<sub>a</sub> π(a|s) · Q<sup>π</sup>(s,a), &nbsp; Q<sup>π</sup>(s,a) = Σ<sub>s′</sub> P(s′|s,a)[R + γ V<sup>π</sup>(s′)]` });
    let imm = 0, fut = 0;
    if (acts.length === 1) {
      const a = acts[0][1];
      lines.push({ k: 'policy', cells: [s], html: `${POLICY_SHORT[S.policy]} takes <b>${ACTS[a].g}</b> in ${L(s)} with probability 1, so V<sup>π</sup>(s) = Q<sup>π</sup>(s, ${ACTS[a].g})` });
      outcomeLine(s, a, V).forEach(l => lines.push(l));
      const sp = splitQ(s, a, V); imm = sp.imm; fut = sp.fut;
    } else {
      lines.push({ k: 'policy', cells: [s], html: `${POLICY_SHORT[S.policy]} spreads its choice: ${acts.map(([p, a]) => `π(${ACTS[a].g}|s) = ${p.toFixed(2)}`).join(', ')}` });
      acts.forEach(([p, a]) => {
        const ol = outcomeLine(s, a, V);
        const terms = merged(s, a).map(o => `${o.p.toFixed(2)}×[${fs(o.r)} + ${S.gamma.toFixed(2)}×${f(vOf(V, o.s2), 2)}]`).join(' + ');
        lines.push({ k: `a = ${ACTS[a].g}`, cells: ol.map(l => l.o.s2), html: `Q(s,${ACTS[a].g}) = ${terms} = ${f(Q[s][a], 3)} &nbsp;→ π·Q = ${p.toFixed(2)} × ${f(Q[s][a], 3)} = <b>${f(p * Q[s][a], 3)}</b>` });
        const sp = splitQ(s, a, V); imm += p * sp.imm; fut += p * sp.fut;
      });
    }
    lines.push({ k: 'immediate', cls: 'imm', cells: [], html: `expected immediate reward = <b>${f(imm, 3)}</b>` });
    lines.push({ k: 'future', cls: 'fut', cells: [], html: `discounted future value (γ × expected V<sup>π</sup>(s′)) = <b>${f(fut, 3)}</b>` });
    lines.push({ k: 'V', cls: 'total', cells: [], html: `V<sup>π</sup>(${L(s)}) = ${f(imm, 3)} + ${f(fut, 3)} = <b>${f(V[s], 3)}</b>` });
    return { lines, imm, fut, total: V[s] };
  }

  function contribBars(c) {
    const m = Math.max(Math.abs(c.imm), Math.abs(c.fut), Math.abs(c.total), 1e-6);
    const bar = (lbl, v, cls) => `<div class="mdl-cb"><span>${lbl}</span><div class="mdl-cb-track"><i class="${cls} ${v < 0 ? 'neg' : ''}" style="width:${(Math.abs(v) / m * 50).toFixed(1)}%;${v < 0 ? 'right:50%' : 'left:50%'}"></i><em></em></div><b>${f(v, 3)}</b></div>`;
    return `<div class="mdl-cbs">${bar('immediate reward', c.imm, 'imm')}${bar('γ × future value', c.fut, 'fut')}${bar(S.mode === 'V' ? 'V<sup>π</sup>(s)' : 'Q<sup>π</sup>(s,a)', c.total, 'tot')}</div>`;
  }

  function detailHTML() {
    const { V, Q, pi, Vstar } = solve(), s = S.sel;
    if (!s) return '<div class="tfp-hint">Click a state on the grid.</div>';
    if (isWall(s)) return `<div class="tfp-hint">${L(s)} is a wall — not a state, so it has no value.</div>`;
    if (isTerm(s)) return `<div class="tfp-hint">${L(s)} is terminal: V(${s}) = 0 because no rewards follow. Its ${s === GOAL ? '+1' : '−1'} was collected on the transition <b>into</b> it, so it appears in Q of neighbouring states.</div>`;
    const ba = bestA(Q, s);
    if (S.mode === 'V') {
      return `<div class="mdl-big"><span>V<sup>π</sup>${L(s)}</span><b class="${V[s] >= 0 ? 'pos' : 'neg'}">${f(V[s], 3)}</b></div>
        <table class="mdl-table mdl-qtab"><thead><tr><th>a</th><th>π(a|s)</th><th>Q<sup>π</sup>(s,a)</th><th>π·Q</th></tr></thead><tbody>
        ${ACTS.map((A, a) => `<tr class="mdl-qrow ${pi[s][a] > 0 ? 'pi' : ''} ${S.best && a === ba ? 'best' : ''}" data-qa="${a}"><td>${A.g}${S.best && a === ba ? ' ★' : ''}</td><td>${pi[s][a].toFixed(2)}</td><td>${f(Q[s][a], 3)}</td><td>${f(pi[s][a] * Q[s][a], 3)}</td></tr>`).join('')}
        </tbody><tfoot><tr><td colspan="3">Σ = V<sup>π</sup>(s)</td><td><b>${f(V[s], 3)}</b></td></tr></tfoot></table>
        <div class="tfp-hint">Click a row to inspect that Q(s,a). For comparison, V*(s) = ${f(Vstar[s], 3)}.</div>`;
    }
    const labels = ACTS.map((_, a) => f(Q[s][a], 2));
    return `<div class="mdl-big"><span>Q<sup>π</sup>(${s}, ${ACTS[S.selA].g})</span><b class="${Q[s][S.selA] >= 0 ? 'pos' : 'neg'}">${f(Q[s][S.selA], 3)}</b></div>
      ${padHTML(S.selA, labels)}
      <div class="tfp-hint">V<sup>π</sup>(s) = ${f(V[s], 3)} · best action <b>${ACTS[ba].g}</b> (Q = ${f(Q[s][ba], 3)})</div>`;
  }

  function t2Message() {
    const { V, Q, pi } = solve(), s = S.sel, P = POLICY_SHORT[S.policy], g = S.gamma.toFixed(2);
    if (!s || isWall(s)) return ['try', S.mode === 'V' ? 'V(s)' : 'Q(s,a)', `Every number is computed for policy <b>${P}</b> with γ = ${g}. Click a state to see where its value comes from.`];
    if (isTerm(s)) return ['info', 'Terminal', `Terminal states have value 0: the episode is over. Their reward is earned on the step <b>into</b> them.`];
    const ba = bestA(Q, s), piA = pi[s].findIndex(p => p === 1);
    let bestTxt = '';
    if (S.best) {
      bestTxt = piA === ba
        ? ` <b>★ Best action here is ${ACTS[ba].g}</b> — exactly what π already does.`
        : ` <b>★ Best action here is ${ACTS[ba].g}</b> (Q = ${f(Q[s][ba], 3)} &gt; V<sup>π</sup> = ${f(V[s], 3)}). Switching π to ${ACTS[ba].g} in this state would improve it — the idea behind <i>policy improvement</i>.`;
    }
    if (S.mode === 'V') return ['v', 'V(s)', `<b>V<sup>π</sup>${L(s)} = ${f(V[s], 3)}</b>: starting in ${L(s)} and following <b>${P}</b> forever, the agent expects a discounted return of ${f(V[s], 3)}. Greener = better state under this policy; redder = worse.` + bestTxt];
    const a = S.selA, pa = pi[s][a];
    const rel = pa === 1 ? `π also chooses ${ACTS[a].g} here, so Q<sup>π</sup>(s,${ACTS[a].g}) = V<sup>π</sup>(s).`
      : `Compare with V<sup>π</sup>(s) = ${f(V[s], 3)}: Q is ${Q[s][a] > V[s] + 1e-9 ? 'higher — taking ' + ACTS[a].g + ' first beats simply following π from here' : Q[s][a] < V[s] - 1e-9 ? 'lower — taking ' + ACTS[a].g + ' first is worse than simply following π from here' : 'the same'}.`;
    return ['q', 'Q(s,a)', `<b>Q<sup>π</sup>(${L(s)}, ${ACTS[a].g}) = ${f(Q[s][a], 3)}</b>: take ${ACTS[a].g} once (even if π would not), then follow <b>${P}</b>. ${rel}` + bestTxt];
  }

  function skeleton2() {
    root.innerHTML = `<div class="tfp-viz mdl-viz">
      <div class="tfp-viz-head"><h3><span>V<sup>π</sup>(s) &amp; Q<sup>π</sup>(s, a) on the same Grid World</span></h3>
        <div class="mdl-mode" role="group" aria-label="View"><button class="tfp-btn" data-mode="V">V(s) view</button><button class="tfp-btn" data-mode="Q">Q(s, a) view</button></div></div>
      <div class="mdl-settings-wrap"><label class="mdl-set"><span>Policy π</span>${policySelect('mdl-pol2')}</label>${settingsHTML(true)}</div>
      <div class="tfp-msg mdl-msg" id="mdl-msg"></div>
      <div class="mdl-two">
        <div class="tfp-card mdl-gridcard"><div id="mdl-grid2"></div>
          <div class="mdl-legend" id="mdl-legend2"></div></div>
        <div class="mdl-side">
          <div class="tfp-card"><div class="tfp-card-head"><h4 id="mdl-dhead"></h4></div><div id="mdl-detail"></div></div>
          <div class="tfp-card"><div class="mdl-btns two">
            <button class="tfp-btn" data-act="best" id="mdl-bestbtn"><i data-lucide="star"></i>Show Best Action</button>
            <button class="tfp-btn" data-act="stepmode" id="mdl-stepbtn"><i data-lucide="list-ordered"></i>Step-by-Step</button></div>
            <div class="mdl-scale"><span>low</span><i></i><span>high</span></div></div>
        </div>
      </div>
      <div class="tfp-card"><div class="tfp-card-head"><h4 id="mdl-chead">Calculation</h4><div class="tfp-row" id="mdl-cnav"></div></div><div id="mdl-calc"></div></div>
    </div>`;
    update2();
  }

  function update2() {
    const $ = id => root.querySelector('#' + id);
    syncGamma();
    const c = calcLines();
    let shown = c ? c.lines : [];
    if (c && S.stepMode) { S.calcK = Math.max(1, Math.min(S.calcK, c.lines.length)); shown = c.lines.slice(0, S.calcK); }
    const hlCells = c && S.stepMode ? (shown[shown.length - 1].cells || []).filter(x => x !== S.sel) : [];
    $('mdl-grid2').innerHTML = t2SVG(hlCells);
    root.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('on', b.dataset.mode === S.mode));
    $('mdl-legend2').innerHTML = S.mode === 'V'
      ? `<span><i class="lg-v"></i><span class="t">V<sup>π</sup>(s) in each cell</span></span><span><i class="lg-pi"></i>π's action${S.policy === 'rand' ? 's (all ¼)' : ''}</span>${S.best ? '<span><i class="lg-best"></i><span class="t">best action: argmax<sub>a</sub> Q<sup>π</sup>(s,a)</span></span>' : ''}<span>click a cell</span>`
      : `<span><i class="lg-v"></i><span class="t">4 wedges = Q<sup>π</sup>(s, ↑ → ↓ ←)</span></span>${S.policy === 'rand' ? '<span>π picks each wedge with ¼</span>' : '<span><i class="lg-dot"></i>π\'s action</span>'}${S.best ? '<span><i class="lg-bestw"></i>best Q (gold)</span>' : ''}<span>click a wedge</span>`;
    const [k, tag, txt] = t2Message();
    const m = $('mdl-msg'); m.className = `tfp-msg mdl-msg ${k}`; m.innerHTML = `<span class="tfp-msg-tag">${tag}</span><span>${txt}</span>`;
    $('mdl-dhead').innerHTML = S.mode === 'V' ? '<span>State value V<sup>π</sup>(s)</span>' : '<span>Action value Q<sup>π</sup>(s, a)</span>';
    $('mdl-detail').innerHTML = detailHTML();
    $('mdl-bestbtn').classList.toggle('on', S.best);
    $('mdl-stepbtn').classList.toggle('on', S.stepMode);
    $('mdl-chead').innerHTML = S.mode === 'V' ? '<span>Calculation · how V<sup>π</sup>(s) is built</span>' : '<span>Calculation · how Q<sup>π</sup>(s, a) is built</span>';
    if (!c) {
      $('mdl-cnav').innerHTML = '';
      $('mdl-calc').innerHTML = '<div class="tfp-hint">Select a non-terminal state to see its Bellman calculation.</div>';
    } else {
      $('mdl-cnav').innerHTML = S.stepMode
        ? `<span class="tfp-card-sub">line ${S.calcK} / ${c.lines.length}</span><button class="tfp-btn" data-act="cprev" ${S.calcK <= 1 ? 'disabled' : ''}>◂ Prev</button><button class="tfp-btn primary" data-act="cnext" ${S.calcK >= c.lines.length ? 'disabled' : ''}>Next ▸</button><button class="tfp-btn ghost" data-act="call">Show all</button>`
        : '<span class="tfp-card-sub">turn on Step-by-Step to reveal one line at a time</span>';
      const done = !S.stepMode || S.calcK >= c.lines.length;
      $('mdl-calc').innerHTML = `<div class="mdl-calc">${shown.map((l, i) => `<div class="mdl-cl ${l.cls || ''} ${S.stepMode && i === shown.length - 1 ? 'new' : ''}"><span class="mdl-ck">${l.k}</span><span>${l.html}</span></div>`).join('')}</div>
        ${done ? contribBars(c) : ''}
        <div class="tfp-hint" style="margin-top:.35rem">Values shown to 3 d.p.; V<sup>π</sup> solved exactly by iterative policy evaluation, so the Bellman equation balances on every state.</div>`;
    }
    if (window.lucide) window.lucide.createIcons();
  }

  function click2(e) {
    const w = e.target.closest('[data-cell]');
    if (w && root.querySelector('#mdl-grid2').contains(w)) {
      S.sel = w.dataset.cell;
      if (w.dataset.qa !== undefined) S.selA = +w.dataset.qa;
      S.calcK = 1; update2(); return;
    }
    const row = e.target.closest('.mdl-qrow');
    if (row) { S.mode = 'Q'; S.selA = +row.dataset.qa; S.calcK = 1; update2(); return; }
    const b = e.target.closest('[data-a],[data-act],[data-mode]');
    if (!b || !root.contains(b)) return;
    if (b.dataset.mode) { S.mode = b.dataset.mode; S.calcK = 1; }
    else if (b.dataset.a !== undefined) { S.selA = +b.dataset.a; S.calcK = 1; }
    else {
      const act = b.dataset.act;
      if (act === 'best') S.best = !S.best;
      else if (act === 'stepmode') { S.stepMode = !S.stepMode; S.calcK = 1; }
      else if (act === 'cnext') S.calcK++;
      else if (act === 'cprev') S.calcK--;
      else if (act === 'call') S.stepMode = false;
    }
    update2();
  }

  // ================================================================== shared events
  function onChange(e) {
    const t = e.target, k = t.dataset && t.dataset.set;
    if (!k) return;
    const v = k === 'policy' ? t.value : parseFloat(t.value);
    if (k === 'gamma' && e.type === 'input') {
      S.gamma = v;
    } else if (e.type === 'change' || k === 'gamma') {
      S[k] = v;
    } else return;
    if (view === 'tuple') {
      if (k === 'gamma') { S.hl = new Set(['g']); S.msg1 = ['g', 'γ', `γ = ${S.gamma.toFixed(2)}: a reward k steps ahead is weighted γ<sup>k</sup>. ${S.rows.length ? `This episode's return is re-weighted to G₀ = <b>${f(G0(), 3)}</b>.` : 'γ near 0 → short-sighted; γ near 1 → far-sighted.'}`]; }
      if (k === 'slip') { S.hl = new Set(['P']); S.last = null; S.msg1 = ['p', 'P', `Movement noise changed: the intended move now succeeds with P = ${(1 - S.slip).toFixed(1)}${S.slip ? `, and the agent veers 90° left or right with P = ${(S.slip / 2).toFixed(1)} each` : ' — the world is deterministic'}. ${S.a !== null && !isTerm(S.agent) ? describeFan(S.agent, S.a) : ''}`]; }
      if (k === 'step') { S.hl = new Set(['R']); S.last = null; S.msg1 = ['r', 'R', `Living reward is now ${fs(S.step)} for every non-terminal move (goal +1, pit −1). ${S.step < 0 ? 'A cost per step pushes the agent to finish quickly.' : 'With no step cost, wandering is free — only reaching the goal matters.'}`]; }
      if (k === 'policy') { S.msg1 = ['info', 'π', `Auto Play will follow <b>${POLICIES[S.policy]}</b>. The MDP itself is unchanged — only how actions are chosen.`]; }
      update1();
    } else update2();
  }

  function onKey(e) {
    if (!root || !document.body.contains(root)) return;
    const t = e.target;
    if (t && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
    const a = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3 }[e.key];
    if (a === undefined) return;
    e.preventDefault();
    if (view === 'tuple') chooseAction1(a);
    else { S.mode = 'Q'; S.selA = a; S.calcK = 1; update2(); }
  }
  let keyBound = false;

  function render(container, which) {
    stopAuto();
    view = which === 'values' ? 'values' : 'tuple';
    root = document.createElement('div');
    root.className = 'mdl-root';
    container.innerHTML = '';
    container.appendChild(root);
    root.addEventListener('click', e => (view === 'tuple' ? click1(e) : click2(e)));
    root.addEventListener('input', onChange);
    root.addEventListener('change', onChange);
    if (!keyBound) { document.addEventListener('keydown', onKey); keyBound = true; }
    if (view === 'tuple') { S.msg1 = null; S.hl = new Set(); skeleton1(); } else skeleton2();
  }

  // Shared Grid World kit — reused by rl_lab.js (Value Iteration, TD, Q-learning) so every
  // Topic 06–08 demo uses the identical environment, drawing and settings.
  const kit = {
    S, f, fs, sup, sub, move, reward, outcomes, merged, vOf, qFrom, valueIteration, zeroV,
    CELLS, STATES, NONTERM, ACTS, GOAL, PIT, START, WALLS, isWall, isTerm, L, xy,
    cx, cy, x0, y0, CELL, PAD, SZ, defs, furniture, cellBase, termFill, agentSVG, vColor, wedgePts, wedgeText, tri, settingsHTML
  };
  window.MDPLab = { render, kit, _engine: { S, solve, merged, outcomes, qFrom, NONTERM, ACTS, GOAL, PIT } };
})();
