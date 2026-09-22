/**
 * Constraint Satisfaction Problems — Shared Engine (window.CSPEngine)
 *
 * Zero-dependency CSP toolkit used by BOTH the Topic 04 lecture page
 * (demos/csp_demo/ui.js) and the Playground lab (demos/csp_demo/csp_lab.js),
 * so every illustration and every live demo runs the same verified logic.
 *
 * Built from AIMA 4th ed., Chapter 6:
 *   - CSP model ⟨X, D, C⟩ with binary constraints (Fig 6.1 map colouring)
 *   - AC-3 (Fig 6.3) with a step trace
 *   - BACKTRACKING-SEARCH (Fig 6.5) with MRV / Degree / LCV ordering and
 *     Forward Checking / MAC inference, recording a step trace
 *   - MIN-CONFLICTS (Fig 6.8) with a step trace (n-queens and generic CSPs)
 *   - TREE-CSP-SOLVER (Fig 6.11) with a step trace
 *   - Sudoku and university course-scheduling (hard H1–H6, soft S1–S5)
 */

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------

  /** Deterministic PRNG (mulberry32) so demos are reproducible. */
  function makeRng(seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function copyDomains(domains) {
    const out = {};
    for (const k in domains) out[k] = domains[k].slice();
    return out;
  }

  // ---------------------------------------------------------------------------
  // CSP model
  // ---------------------------------------------------------------------------

  /**
   * A binary CSP.
   * @param {string[]} variables
   * @param {Object<string, any[]>} domains
   * @param {Object<string, string[]>} neighbors
   * @param {(A:string, a:any, B:string, b:any) => boolean} constraint
   */
  class CSP {
    constructor(variables, domains, neighbors, constraint, meta) {
      this.variables = variables;
      this.domains = domains;
      this.neighbors = neighbors;
      this.constraint = constraint;
      this.meta = meta || {};
    }

    /** Number of assigned neighbours of `v` that conflict with v = val. */
    nConflicts(v, val, assignment) {
      let n = 0;
      for (const u of this.neighbors[v]) {
        if (u in assignment && !this.constraint(v, val, u, assignment[u])) n++;
      }
      return n;
    }

    /** All violated binary constraints (each edge reported once). */
    conflictedEdges(assignment) {
      const out = [];
      for (const v of this.variables) {
        if (!(v in assignment)) continue;
        for (const u of this.neighbors[v]) {
          if (u in assignment && v < u && !this.constraint(v, assignment[v], u, assignment[u])) out.push([v, u]);
        }
      }
      return out;
    }

    isComplete(assignment) {
      return this.variables.every(v => v in assignment);
    }

    edges() {
      const out = [];
      for (const v of this.variables) for (const u of this.neighbors[v]) if (v < u) out.push([v, u]);
      return out;
    }
  }

  const neq = (A, a, B, b) => a !== b;

  // ---------------------------------------------------------------------------
  // Australia (AIMA Fig 6.1)
  // ---------------------------------------------------------------------------

  const AUSTRALIA = {
    variables: ['WA', 'NT', 'Q', 'NSW', 'V', 'SA', 'T'],
    names: {
      WA: 'Western Australia', NT: 'Northern Territory', Q: 'Queensland', NSW: 'New South Wales',
      V: 'Victoria', SA: 'South Australia', T: 'Tasmania'
    },
    neighbors: {
      WA: ['NT', 'SA'],
      NT: ['WA', 'SA', 'Q'],
      SA: ['WA', 'NT', 'Q', 'NSW', 'V'],
      Q: ['NT', 'SA', 'NSW'],
      NSW: ['Q', 'SA', 'V'],
      V: ['SA', 'NSW'],
      T: []
    },
    // Region outlines in (longitude, latitude) — simplified coastlines with the
    // real straight-line state borders (129°E, 138°E, 141°E, 26°S, 29°S).
    regions: {
      WA: [[129, -15], [126, -14], [123, -16.5], [121, -19], [114, -21.8], [113.4, -24], [114, -27], [115, -31], [115, -34], [116, -35], [118, -35], [120, -34], [124, -33.5], [126, -32.3], [129, -31.7], [129, -26]],
      NT: [[129, -15], [130.5, -12.3], [132, -11.3], [136.5, -12], [135.8, -15], [138, -16.5], [138, -26], [129, -26]],
      Q: [[138, -16.5], [140.8, -17.5], [141.6, -12.5], [142.5, -10.7], [143.5, -14], [145.4, -15], [146, -18.8], [149, -21], [151, -23.8], [153.2, -25.5], [153.6, -28.2], [151, -28.8], [149, -29], [141, -29], [141, -26], [138, -26]],
      SA: [[129, -26], [138, -26], [141, -26], [141, -29], [141, -34], [141, -38], [139.7, -37.2], [139, -35.6], [138, -35.7], [138.5, -34.6], [137.8, -33], [137, -34.9], [136, -35], [135.6, -34.6], [134.2, -32.8], [132, -32], [129, -31.7]],
      NSW: [[141, -29], [149, -29], [151, -28.8], [153.6, -28.2], [153, -31], [152, -32.8], [151, -34], [150, -36], [149.9, -37.5], [148.2, -36.8], [144, -35.7], [141, -34]],
      V: [[141, -34], [144, -35.7], [148.2, -36.8], [149.9, -37.5], [147.5, -38], [146.3, -39.1], [144.5, -38.3], [143.5, -38.8], [141, -38]],
      T: [[144.6, -40.7], [148.3, -40.9], [148, -43], [146.8, -43.6], [145.2, -42.2]]
    },
    labels: { WA: [121, -25], NT: [133.5, -20], Q: [144.5, -22], SA: [134.8, -29.5], NSW: [146.5, -32], V: [144.4, -37.1], T: [146.6, -42] },
    // Constraint-graph layout (AIMA Fig 6.1b), in a 0..100 box.
    graph: { WA: [14, 44], NT: [38, 18], SA: [44, 58], Q: [66, 24], NSW: [80, 56], V: [60, 84], T: [86, 90] }
  };

  /** Projects (lon, lat) into the SVG box used by the map illustrations. */
  function projectAus(lon, lat, w, h) {
    const W = w || 400, H = h || 340;
    const x = ((lon - 112.5) / (154.5 - 112.5)) * W;
    const y = ((-lat - 10) / (44 - 10)) * H;
    return [x, y];
  }

  const COLOR_HEX = { red: '#ef4444', green: '#22c55e', blue: '#3b82f6', yellow: '#eab308' };
  const COLOR_LIST = ['red', 'green', 'blue', 'yellow'];

  function makeMapCSP(mapDef, nColors) {
    const colors = COLOR_LIST.slice(0, nColors || 3);
    const domains = {};
    mapDef.variables.forEach(v => { domains[v] = colors.slice(); });
    return new CSP(mapDef.variables.slice(), domains, mapDef.neighbors, neq, { kind: 'map', map: mapDef });
  }

  /**
   * Random planar map: n points in the unit square; shortest non-crossing
   * edges are added greedily (a planar graph, so always 4-colourable).
   */
  function randomMap(n, seed, maxDeg) {
    const rng = makeRng(seed || 7);
    const pts = [];
    let guard = 0;
    while (pts.length < n && guard++ < 5000) {
      const p = [0.06 + rng() * 0.88, 0.08 + rng() * 0.84];
      if (pts.every(q => Math.hypot(p[0] - q[0], p[1] - q[1]) > 0.55 / Math.sqrt(n))) pts.push(p);
    }
    const vars = pts.map((_, i) => 'R' + (i + 1));
    const neighbors = {}; vars.forEach(v => { neighbors[v] = []; });
    const pairs = [];
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      pairs.push([i, j, Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1])]);
    }
    pairs.sort((a, b) => a[2] - b[2]);
    const edges = [];
    const cross = (a, b, c, d) => {
      if (a === c || a === d || b === c || b === d) return false;
      const o = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
      const A = pts[a], B = pts[b], C = pts[c], D = pts[d];
      return (o(A, B, C) * o(A, B, D) < 0) && (o(C, D, A) * o(C, D, B) < 0);
    };
    const limit = maxDeg || 4;
    const maxLen = 1.9 / Math.sqrt(n);
    for (const [i, j, d] of pairs) {
      if (d > maxLen) break;
      if (neighbors[vars[i]].length >= limit || neighbors[vars[j]].length >= limit) continue;
      if (edges.some(([a, b]) => cross(i, j, a, b))) continue;
      edges.push([i, j]);
      neighbors[vars[i]].push(vars[j]);
      neighbors[vars[j]].push(vars[i]);
    }
    const graph = {};
    vars.forEach((v, i) => { graph[v] = [pts[i][0] * 100, pts[i][1] * 100]; });
    return { variables: vars, neighbors, graph, names: {} };
  }

  // ---------------------------------------------------------------------------
  // N-Queens as a CSP (variables = columns, values = rows)
  // ---------------------------------------------------------------------------

  function makeQueensCSP(n) {
    const vars = [], domains = {}, neighbors = {}, idx = {};
    for (let c = 0; c < n; c++) { const v = 'Q' + c; vars.push(v); idx[v] = c; }
    const rows = []; for (let r = 0; r < n; r++) rows.push(r);
    vars.forEach(v => { domains[v] = rows.slice(); neighbors[v] = vars.filter(u => u !== v); });
    const constraint = (A, a, B, b) => a !== b && Math.abs(a - b) !== Math.abs(idx[A] - idx[B]);
    return new CSP(vars, domains, neighbors, constraint, { kind: 'queens', n, idx });
  }

  /** Conflicts of a queen at (col, row) against the other queens in `rows`. */
  function queenConflicts(rows, col, row) {
    let n = 0;
    for (let c = 0; c < rows.length; c++) {
      if (c === col || rows[c] == null) continue;
      if (rows[c] === row || Math.abs(rows[c] - row) === Math.abs(c - col)) n++;
    }
    return n;
  }

  function queensAttackingPairs(rows) {
    let n = 0;
    for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) {
      if (rows[i] === rows[j] || Math.abs(rows[i] - rows[j]) === j - i) n++;
    }
    return n;
  }

  // ---------------------------------------------------------------------------
  // AC-3 (AIMA Fig 6.3)
  // ---------------------------------------------------------------------------

  /**
   * REVISE(Xi, Xj): remove values of Xi with no support in Xj.
   * Returns { revised, removed[], checks }.
   */
  function revise(csp, domains, Xi, Xj) {
    const removed = [];
    let checks = 0;
    const keep = [];
    for (const x of domains[Xi]) {
      let supported = false;
      for (const y of domains[Xj]) {
        checks++;
        if (csp.constraint(Xi, x, Xj, y)) { supported = true; break; }
      }
      if (supported) keep.push(x); else removed.push(x);
    }
    domains[Xi] = keep;
    return { revised: removed.length > 0, removed, checks };
  }

  /**
   * AC-3 with an optional step trace.
   * @param {CSP} csp
   * @param {Object} domains  mutated in place
   * @param {Array} queue     initial arcs (default: every arc)
   * @param {Object} opts     { trace: bool, assigned: {var:true} }
   */
  function ac3(csp, domains, queue, opts) {
    opts = opts || {};
    const steps = [];
    const q = queue ? queue.slice() : [];
    if (!queue) for (const Xi of csp.variables) for (const Xj of csp.neighbors[Xi]) q.push([Xi, Xj]);
    let checks = 0, prunedCount = 0;
    const pruned = [];
    if (opts.trace) steps.push({ kind: 'start', queue: q.map(a => a.slice()), domains: copyDomains(domains), msg: `Initialise the queue with ${q.length} arcs.` });
    while (q.length) {
      const [Xi, Xj] = q.shift();
      const r = revise(csp, domains, Xi, Xj);
      checks += r.checks;
      if (r.revised) {
        prunedCount += r.removed.length;
        r.removed.forEach(x => pruned.push([Xi, x]));
        if (domains[Xi].length === 0) {
          if (opts.trace) steps.push({ kind: 'wipeout', arc: [Xi, Xj], removed: r.removed, queue: q.map(a => a.slice()), domains: copyDomains(domains), msg: `REVISE(${Xi}, ${Xj}) removed ${r.removed.join(', ')} — D(${Xi}) is now EMPTY. AC-3 returns false: no solution extends this state.` });
          return { consistent: false, steps, checks, prunedCount, pruned, domains };
        }
        const added = [];
        for (const Xk of csp.neighbors[Xi]) {
          if (Xk === Xj) continue;
          if (!q.some(([a, b]) => a === Xk && b === Xi)) { q.push([Xk, Xi]); added.push([Xk, Xi]); }
        }
        if (opts.trace) steps.push({ kind: 'revise', arc: [Xi, Xj], removed: r.removed, added, queue: q.map(a => a.slice()), domains: copyDomains(domains), msg: `REVISE(${Xi}, ${Xj}) removed ${r.removed.join(', ')} from D(${Xi}) (no support in D(${Xj})). Re-queue ${added.length ? added.map(a => `(${a[0]},${a[1]})`).join(' ') : 'nothing new'}.` });
      } else if (opts.trace) {
        steps.push({ kind: 'keep', arc: [Xi, Xj], removed: [], added: [], queue: q.map(a => a.slice()), domains: copyDomains(domains), msg: `REVISE(${Xi}, ${Xj}): every value in D(${Xi}) has support in D(${Xj}) — nothing removed.` });
      }
    }
    if (opts.trace) steps.push({ kind: 'done', queue: [], domains: copyDomains(domains), msg: 'Queue empty — the CSP is arc-consistent. AC-3 returns true.' });
    return { consistent: true, steps, checks, prunedCount, pruned, domains };
  }

  // ---------------------------------------------------------------------------
  // Backtracking search (AIMA Fig 6.5) with heuristics + inference
  // ---------------------------------------------------------------------------

  /**
   * @param {CSP} csp
   * @param {Object} opts {
   *   varOrder: 'static' | 'mrv' | 'mrv-degree' | 'degree',
   *   valOrder: 'static' | 'lcv',
   *   inference: 'none' | 'fc' | 'mac',
   *   trace: bool, maxSteps: number, maxChecks: number,
   *   staticOrder: string[]   (optional explicit variable order)
   *   initial: {var: val}     (optional pre-assignment)
   * }
   */
  function backtrackingSearch(csp, opts) {
    opts = Object.assign({ varOrder: 'static', valOrder: 'static', inference: 'none', trace: true, maxSteps: 4000, maxChecks: 2e6 }, opts || {});
    const stats = { assignments: 0, backtracks: 0, checks: 0, pruned: 0, nodes: 0 };
    const steps = [];
    const order = opts.staticOrder || csp.variables;
    let aborted = false;
    const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());

    const push = (s, assignment, domains) => {
      if (!opts.trace) return;
      if (steps.length >= opts.maxSteps) { aborted = true; return; }
      s.assignment = Object.assign({}, assignment);
      s.domains = copyDomains(domains);
      s.stats = Object.assign({}, stats);
      steps.push(s);
    };

    const legalCount = (v, assignment, domains) => {
      if (opts.inference !== 'none') return domains[v].length;
      let n = 0;
      for (const x of domains[v]) if (csp.nConflicts(v, x, assignment) === 0) n++;
      return n;
    };
    const unassignedDegree = (v, assignment) => csp.neighbors[v].filter(u => !(u in assignment)).length;

    const selectVar = (assignment, domains) => {
      const un = order.filter(v => !(v in assignment));
      if (opts.varOrder === 'static') return un[0];
      if (opts.varOrder === 'degree') {
        let best = un[0], bd = -1;
        for (const v of un) { const d = unassignedDegree(v, assignment); if (d > bd) { bd = d; best = v; } }
        return best;
      }
      let best = null, bc = Infinity, bd = -1;
      for (const v of un) {
        const c = legalCount(v, assignment, domains);
        const d = opts.varOrder === 'mrv-degree' ? unassignedDegree(v, assignment) : 0;
        if (c < bc || (c === bc && d > bd)) { best = v; bc = c; bd = d; }
      }
      return best;
    };

    const orderValues = (v, assignment, domains) => {
      const vals = domains[v].slice();
      if (opts.valOrder !== 'lcv') return vals;
      const cost = x => {
        let n = 0;
        for (const u of csp.neighbors[v]) {
          if (u in assignment) continue;
          for (const y of domains[u]) if (!csp.constraint(v, x, u, y)) n++;
        }
        return n;
      };
      const costs = new Map(vals.map(x => [x, cost(x)]));
      return vals.sort((a, b) => costs.get(a) - costs.get(b));
    };

    const inferFC = (v, x, assignment, domains) => {
      const removed = [];
      for (const u of csp.neighbors[v]) {
        if (u in assignment) continue;
        const keep = [];
        for (const y of domains[u]) {
          stats.checks++;
          if (csp.constraint(v, x, u, y)) keep.push(y); else removed.push([u, y]);
        }
        domains[u] = keep;
        if (keep.length === 0) return { ok: false, removed, wiped: u };
      }
      return { ok: true, removed };
    };

    const inferMAC = (v, x, assignment, domains) => {
      const queue = csp.neighbors[v].filter(u => !(u in assignment)).map(u => [u, v]);
      const r = ac3(csp, domains, queue, {});
      stats.checks += r.checks;
      const wiped = r.consistent ? null : csp.variables.find(u => domains[u].length === 0);
      return { ok: r.consistent, removed: r.pruned, wiped };
    };

    const initial = opts.initial || {};
    const rootDomains = copyDomains(csp.domains);
    const assignment0 = {};
    for (const k in initial) { assignment0[k] = initial[k]; rootDomains[k] = [initial[k]]; }
    push({ kind: 'start', msg: 'Start with the empty assignment { }. Every variable has its full domain.' + (Object.keys(initial).length ? ' (Pre-assigned: ' + Object.entries(initial).map(([k, v]) => `${k}=${v}`).join(', ') + '.)' : ''), depth: 0 }, assignment0, rootDomains);

    let checksBudgetHit = false;
    function bt(assignment, domains, depth) {
      if (aborted) return null;
      if (stats.checks > opts.maxChecks) { checksBudgetHit = true; aborted = true; return null; }
      if (csp.isComplete(assignment)) {
        push({ kind: 'solution', msg: 'Every variable is assigned and no constraint is violated — SOLUTION found.', depth }, assignment, domains);
        return assignment;
      }
      const v = selectVar(assignment, domains);
      stats.nodes++;
      const why = opts.varOrder === 'static' ? 'next in the fixed order'
        : opts.varOrder === 'degree' ? `most constraints on unassigned variables (degree ${unassignedDegree(v, assignment)})`
        : `fewest legal values (${legalCount(v, assignment, domains)})` + (opts.varOrder === 'mrv-degree' ? `, degree ${unassignedDegree(v, assignment)} tie-break` : '');
      push({ kind: 'select', var: v, msg: `SELECT-UNASSIGNED-VARIABLE → ${v} (${why}).`, depth }, assignment, domains);
      const values = orderValues(v, assignment, domains);
      for (const x of values) {
        if (aborted) return null;
        let consistent = true;
        if (opts.inference === 'none') {
          for (const u of csp.neighbors[v]) {
            if (u in assignment) { stats.checks++; if (!csp.constraint(v, x, u, assignment[u])) { consistent = false; break; } }
          }
        }
        if (!consistent) {
          const bad = csp.neighbors[v].find(u => u in assignment && !csp.constraint(v, x, u, assignment[u]));
          push({ kind: 'reject', var: v, val: x, conflictWith: bad, msg: `Try ${v} = ${x}: conflicts with ${bad} = ${assignment[bad]} — reject.`, depth }, assignment, domains);
          continue;
        }
        assignment[v] = x;
        stats.assignments++;
        const nd = copyDomains(domains);
        nd[v] = [x];
        push({ kind: 'assign', var: v, val: x, msg: `Assign ${v} = ${x} (consistent with every assigned neighbour).`, depth }, assignment, nd);
        let ok = true;
        if (opts.inference !== 'none') {
          const r = opts.inference === 'fc' ? inferFC(v, x, assignment, nd) : inferMAC(v, x, assignment, nd);
          stats.pruned += r.removed.length;
          const label = opts.inference === 'fc' ? 'Forward checking' : 'MAC (AC-3)';
          if (!r.ok) {
            ok = false;
            push({ kind: 'wipeout', var: v, val: x, wiped: r.wiped, removed: r.removed, msg: `${label} after ${v} = ${x}: D(${r.wiped}) becomes empty — this branch cannot succeed.`, depth }, assignment, nd);
          } else {
            const txt = r.removed.length ? r.removed.map(([u, y]) => `${y}∉${u}`).join(', ') : 'nothing';
            push({ kind: 'infer', var: v, val: x, removed: r.removed, msg: `${label} after ${v} = ${x}: pruned ${txt}.`, depth }, assignment, nd);
          }
        }
        if (ok) {
          const res = bt(assignment, nd, depth + 1);
          if (res) return res;
          if (aborted) return null;
        }
        delete assignment[v];
        stats.backtracks++;
        push({ kind: 'undo', var: v, val: x, msg: `Undo ${v} = ${x} and try the next value.`, depth }, assignment, domains);
      }
      push({ kind: 'deadend', var: v, msg: `No value left for ${v} — return failure to the previous level (backtrack).`, depth }, assignment, domains);
      return null;
    }

    const result = bt(Object.assign({}, assignment0), rootDomains, 0);
    if (!result && !aborted) push({ kind: 'failure', msg: 'Every branch failed — the CSP has no solution.', depth: 0 }, assignment0, rootDomains);
    const t1 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    return {
      solution: result ? Object.assign({}, result) : null,
      steps, stats, aborted, checksBudgetHit,
      timeMs: t1 - t0
    };
  }

  /** Counts all solutions (small problems only). */
  function countSolutions(csp, limit) {
    let count = 0;
    const vars = csp.variables;
    const lim = limit || 1e6;
    (function rec(i, a) {
      if (count >= lim) return;
      if (i === vars.length) { count++; return; }
      const v = vars[i];
      for (const x of csp.domains[v]) if (csp.nConflicts(v, x, a) === 0) { a[v] = x; rec(i + 1, a); delete a[v]; }
    })(0, {});
    return count;
  }

  // ---------------------------------------------------------------------------
  // Min-conflicts (AIMA Fig 6.8)
  // ---------------------------------------------------------------------------

  /**
   * Generic min-conflicts with a trace.
   * @returns {{solution, steps, iterations}}
   */
  function minConflicts(csp, opts) {
    opts = Object.assign({ maxSteps: 1000, seed: 1, trace: true, initial: null, maxTrace: 1500 }, opts || {});
    const rng = makeRng(opts.seed);
    const current = {};
    if (opts.initial) Object.assign(current, opts.initial);
    else {
      // Greedy initial assignment (AIMA: "a complete assignment, chosen greedily")
      for (const v of csp.variables) {
        const counts = csp.domains[v].map(x => csp.nConflicts(v, x, current));
        const m = Math.min(...counts);
        const ties = csp.domains[v].filter((x, i) => counts[i] === m);
        current[v] = ties[Math.floor(rng() * ties.length)];
      }
    }
    const steps = [];
    const totalConf = () => csp.conflictedEdges(current).length;
    if (opts.trace) steps.push({ kind: 'start', assignment: Object.assign({}, current), total: totalConf(), msg: 'Start from a complete (greedy) assignment.' });
    for (let i = 1; i <= opts.maxSteps; i++) {
      const conflicted = csp.variables.filter(v => csp.nConflicts(v, current[v], current) > 0);
      if (!conflicted.length) {
        if (opts.trace) steps.push({ kind: 'solution', assignment: Object.assign({}, current), total: 0, msg: `No conflicted variables — solution found after ${i - 1} steps.` });
        return { solution: Object.assign({}, current), steps, iterations: i - 1 };
      }
      const v = conflicted[Math.floor(rng() * conflicted.length)];
      const counts = csp.domains[v].map(x => csp.nConflicts(v, x, current));
      const m = Math.min(...counts);
      const ties = csp.domains[v].filter((x, k) => counts[k] === m);
      const old = current[v];
      const val = ties[Math.floor(rng() * ties.length)];
      current[v] = val;
      if (opts.trace && steps.length < opts.maxTrace) {
        steps.push({ kind: 'move', var: v, from: old, to: val, counts, domain: csp.domains[v].slice(), assignment: Object.assign({}, current), total: totalConf(), conflictedVars: conflicted, msg: `Pick conflicted ${v} (${conflicted.length} conflicted). Value conflicts: ${csp.domains[v].map((x, k) => `${x}:${counts[k]}`).join(' ')} → set ${v} = ${val}${val === old ? ' (sideways / stay)' : ''}.` });
      }
    }
    return { solution: null, steps, iterations: opts.maxSteps };
  }

  /** Fast n-queens min-conflicts (for large n) returning a trace of rows. */
  function queensMinConflicts(n, opts) {
    opts = Object.assign({ maxSteps: 2000, seed: 3, trace: true, maxTrace: 3000, randomInit: false }, opts || {});
    const rng = makeRng(opts.seed);
    const rows = new Array(n).fill(null);
    for (let c = 0; c < n; c++) {
      if (opts.randomInit) { rows[c] = Math.floor(rng() * n); continue; }
      let best = [], bc = Infinity;
      for (let r = 0; r < n; r++) {
        const k = queenConflicts(rows, c, r);
        if (k < bc) { bc = k; best = [r]; } else if (k === bc) best.push(r);
      }
      rows[c] = best[Math.floor(rng() * best.length)];
    }
    const steps = [];
    if (opts.trace) steps.push({ kind: 'start', rows: rows.slice(), total: queensAttackingPairs(rows), msg: opts.randomInit ? 'Random complete assignment: one queen per column.' : 'Greedy complete assignment: each queen placed on a least-conflicted row, column by column.' });
    for (let i = 1; i <= opts.maxSteps; i++) {
      const conflicted = [];
      for (let c = 0; c < n; c++) if (queenConflicts(rows, c, rows[c]) > 0) conflicted.push(c);
      if (!conflicted.length) {
        if (opts.trace) steps.push({ kind: 'solution', rows: rows.slice(), total: 0, msg: `No queen is attacked — solution found after ${i - 1} steps.` });
        return { solved: true, rows, steps, iterations: i - 1 };
      }
      const c = conflicted[Math.floor(rng() * conflicted.length)];
      const counts = [];
      for (let r = 0; r < n; r++) counts.push(queenConflicts(rows, c, r));
      const m = Math.min(...counts);
      const ties = []; counts.forEach((k, r) => { if (k === m) ties.push(r); });
      const from = rows[c];
      const to = ties[Math.floor(rng() * ties.length)];
      rows[c] = to;
      if (opts.trace && steps.length < opts.maxTrace) steps.push({ kind: 'move', col: c, from, to, counts, conflicted, rows: rows.slice(), total: queensAttackingPairs(rows), msg: `Column ${c + 1} is conflicted (${conflicted.length} conflicted queens). Min-conflicts row → ${to + 1} (${m} conflict${m === 1 ? '' : 's'})${to === from ? ' — sideways move' : ''}.` });
    }
    return { solved: false, rows, steps, iterations: opts.maxSteps };
  }

  // ---------------------------------------------------------------------------
  // Tree-structured CSP solver (AIMA Fig 6.11) on the Fig 6.10 tree
  // ---------------------------------------------------------------------------

  const TREE_EXAMPLE = {
    variables: ['A', 'B', 'C', 'D', 'E', 'F'],
    parent: { A: null, B: 'A', C: 'B', D: 'B', E: 'D', F: 'D' },
    domains: { A: ['red', 'green'], B: ['red', 'green'], C: ['red'], D: ['green', 'blue'], E: ['green'], F: ['blue', 'green'] },
    pos: { A: [12, 50], B: [32, 50], C: [52, 22], D: [52, 72], E: [76, 56], F: [76, 88] }
  };

  function treeCspSolve(tree) {
    const t = tree || TREE_EXAMPLE;
    const doms = copyDomains(t.domains);
    const steps = [];
    const order = t.variables; // already a topological order (parents first)
    steps.push({ phase: 'order', domains: copyDomains(doms), assignment: {}, active: null, msg: `Pick root A and order the variables topologically: ${order.join(' → ')}. Every variable (except the root) has exactly one parent.` });
    for (let j = order.length - 1; j >= 1; j--) {
      const Xj = order[j], P = t.parent[Xj];
      const before = doms[P].slice();
      doms[P] = doms[P].filter(x => doms[Xj].some(y => x !== y));
      const removed = before.filter(x => !doms[P].includes(x));
      steps.push({ phase: 'backward', arc: [P, Xj], removed, domains: copyDomains(doms), assignment: {}, active: P, msg: `MAKE-ARC-CONSISTENT(${P}, ${Xj}): ` + (removed.length ? `remove ${removed.join(', ')} from D(${P}) — no value of ${Xj} ∈ {${doms[Xj].join(', ')}} supports it.` : `every value of ${P} already has support in D(${Xj}).`) });
      if (!doms[P].length) {
        steps.push({ phase: 'fail', domains: copyDomains(doms), assignment: {}, msg: `D(${P}) is empty — no solution.` });
        return { solution: null, steps };
      }
    }
    const assignment = {};
    for (const X of order) {
      const P = t.parent[X];
      const val = doms[X].find(x => !P || x !== assignment[P]);
      assignment[X] = val;
      steps.push({ phase: 'forward', var: X, domains: copyDomains(doms), assignment: Object.assign({}, assignment), active: X, msg: P ? `Assign ${X} = ${val}: any value in D(${X}) consistent with parent ${P} = ${assignment[P]} — guaranteed to exist after the backward pass.` : `Assign the root ${X} = ${val} (any remaining value).` });
    }
    steps.push({ phase: 'done', domains: copyDomains(doms), assignment: Object.assign({}, assignment), msg: 'Solution found with no backtracking — O(n·d²) total work.' });
    return { solution: assignment, steps };
  }

  // ---------------------------------------------------------------------------
  // Sudoku
  // ---------------------------------------------------------------------------

  /**
   * Builds a Sudoku CSP from a puzzle string ('.' or '0' = blank).
   * size 4 (2×2 boxes) or 9 (3×3 boxes).
   */
  function makeSudokuCSP(puzzle, size) {
    const n = size || 9;
    const b = Math.round(Math.sqrt(n));
    const vars = [], domains = {}, neighbors = {};
    const cell = (r, c) => `r${r}c${c}`;
    const digits = []; for (let d = 1; d <= n; d++) digits.push(d);
    const chars = puzzle.replace(/\s/g, '');
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const v = cell(r, c); vars.push(v);
      const ch = chars[r * n + c];
      const d = parseInt(ch, 10);
      domains[v] = (d >= 1 && d <= n) ? [d] : digits.slice();
    }
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const set = new Set();
      for (let k = 0; k < n; k++) { set.add(cell(r, k)); set.add(cell(k, c)); }
      const br = Math.floor(r / b) * b, bc = Math.floor(c / b) * b;
      for (let i = 0; i < b; i++) for (let j = 0; j < b; j++) set.add(cell(br + i, bc + j));
      set.delete(cell(r, c));
      neighbors[cell(r, c)] = Array.from(set);
    }
    return new CSP(vars, domains, neighbors, neq, { kind: 'sudoku', n, b, cell });
  }

  const SUDOKU_PRESETS = {
    mini: { size: 4, label: '4×4 Mini', puzzle: '1..4.41..1.34..1' },
    easy: { size: 9, label: 'Easy (AC-3 solves it)', puzzle: '..3.2.6..9..3.5..1..18.64....81.29..7.......8..67.82....26.95..8..2.3..9..5.1.3..' },
    hard: { size: 9, label: 'Hard (needs search)', puzzle: '4.....8.5.3..........7......2.....6.....8.4......1.......6.3.7.5..2.....1.4......' },
    extreme: { size: 9, label: 'Extreme (Inkala)', puzzle: '8..........36......7..9.2...5...7.......457.....1...3...1....68..85...1..9....4..' }
  };

  // ---------------------------------------------------------------------------
  // University course scheduling (instructions/csp.md — H1–H6, S1–S5)
  // ---------------------------------------------------------------------------

  const SCHEDULE = {
    days: ['Mon', 'Tue', 'Wed'],
    periods: ['09:00', '10:30', '13:00', '14:30'],
    rooms: [
      { id: 'HALL', name: 'Main Hall', cap: 120, type: 'lecture', bldg: 'A' },
      { id: 'R101', name: 'Room 101', cap: 60, type: 'lecture', bldg: 'A' },
      { id: 'R202', name: 'Seminar 202', cap: 40, type: 'lecture', bldg: 'B' },
      { id: 'LAB1', name: 'Computer Lab', cap: 30, type: 'lab', bldg: 'B' }
    ],
    instructors: {
      Chen: { unavailable: [0, 1], prefers: [2, 3, 6, 7, 10, 11], prefLabel: 'afternoons', unavailLabel: 'Mon morning' },
      Patel: { unavailable: [4, 5, 6, 7], prefers: [0, 1, 4, 5, 8, 9], prefLabel: 'mornings', unavailLabel: 'all Tuesday' },
      Garcia: { unavailable: [11], prefers: [0, 1, 2, 3, 4, 5, 6, 7], prefLabel: 'Mon / Tue', unavailLabel: 'Wed 14:30' },
      Okafor: { unavailable: [0, 1, 2, 3], prefers: [0, 1, 4, 5, 8, 9], prefLabel: 'mornings', unavailLabel: 'all Monday' },
      Nyein: { unavailable: [10, 11], prefers: [0, 1, 4, 5, 8, 9], prefLabel: 'mornings', unavailLabel: 'Wed afternoon' }
    },
    cohorts: {
      Y1: { label: 'Year 1 CS', color: '#4f46e5' },
      Y2: { label: 'Year 2 CS', color: '#0d9488' },
      Y3: { label: 'Year 3 AI', color: '#db2777' }
    },
    courses: [
      { id: 'CS101', name: 'Intro to Programming', enroll: 110, type: 'lecture', instr: 'Chen', cohort: 'Y1' },
      { id: 'CS101L', name: 'Programming Lab', enroll: 28, type: 'lab', instr: 'Chen', cohort: 'Y1' },
      { id: 'MA101', name: 'Discrete Mathematics', enroll: 55, type: 'lecture', instr: 'Patel', cohort: 'Y1' },
      { id: 'CS102', name: 'Computer Systems', enroll: 50, type: 'lecture', instr: 'Garcia', cohort: 'Y1' },
      { id: 'CS201', name: 'Data Structures', enroll: 58, type: 'lecture', instr: 'Chen', cohort: 'Y2' },
      { id: 'CS201L', name: 'Data Structures Lab', enroll: 30, type: 'lab', instr: 'Garcia', cohort: 'Y2' },
      { id: 'MA201', name: 'Probability', enroll: 45, type: 'lecture', instr: 'Patel', cohort: 'Y2' },
      { id: 'CS202', name: 'Databases', enroll: 40, type: 'lecture', instr: 'Okafor', cohort: 'Y2' },
      { id: 'AI301', name: 'Artificial Intelligence', enroll: 38, type: 'lecture', instr: 'Nyein', cohort: 'Y3' },
      { id: 'AI302', name: 'Machine Learning', enroll: 36, type: 'lecture', instr: 'Nyein', cohort: 'Y3' },
      { id: 'AI302L', name: 'ML Lab', enroll: 24, type: 'lab', instr: 'Okafor', cohort: 'Y3' },
      { id: 'AI303', name: 'Natural Language Processing', enroll: 30, type: 'lecture', instr: 'Garcia', cohort: 'Y3' }
    ],
    weights: { S1: 2, S2: 1, S3: 2, S4: 3, S5: 1 },
    hardInfo: {
      H1: 'No room double-booking',
      H2: 'Room capacity & type',
      H3: 'No instructor double-booking',
      H4: 'Instructor availability',
      H5: 'No cohort clash',
      H6: 'Every course scheduled'
    },
    softInfo: {
      S1: 'Instructor preferences',
      S2: 'Room utilisation fit',
      S3: 'Student dead hours',
      S4: 'Back-to-back fatigue (>2)',
      S5: 'Campus transit'
    }
  };
  SCHEDULE.nSlots = SCHEDULE.days.length * SCHEDULE.periods.length;

  const schedVal = (slot, room) => slot + '|' + room;
  const parseVal = val => { const [s, r] = val.split('|'); return { slot: +s, room: r }; };
  const slotLabel = s => `${SCHEDULE.days[Math.floor(s / SCHEDULE.periods.length)]} ${SCHEDULE.periods[s % SCHEDULE.periods.length]}`;

  function roomById(id) { return SCHEDULE.rooms.find(r => r.id === id); }
  function courseById(id) { return SCHEDULE.courses.find(c => c.id === id); }

  /** Unary constraints H2 (capacity/type) and H4 (availability). */
  function unaryOk(course, slot, roomId) {
    const room = roomById(roomId);
    const h2 = room.cap >= course.enroll && room.type === course.type;
    const h4 = !SCHEDULE.instructors[course.instr].unavailable.includes(slot);
    return { h2, h4, ok: h2 && h4 };
  }

  /**
   * Builds the scheduling CSP. With nodeConsistent=true the domains are
   * pre-filtered by the unary constraints H2 and H4 (node consistency).
   */
  function makeScheduleCSP(nodeConsistent) {
    const vars = SCHEDULE.courses.map(c => c.id);
    const domains = {}, neighbors = {};
    for (const c of SCHEDULE.courses) {
      const d = [];
      for (let s = 0; s < SCHEDULE.nSlots; s++) for (const r of SCHEDULE.rooms) {
        if (!nodeConsistent || unaryOk(c, s, r.id).ok) d.push(schedVal(s, r.id));
      }
      domains[c.id] = d;
    }
    // Every pair of sessions is linked by H1 (rooms); H3/H5 add time clashes.
    for (const v of vars) neighbors[v] = vars.filter(u => u !== v);
    const constraint = (A, a, B, b) => {
      const pa = parseVal(a), pb = parseVal(b);
      if (pa.slot !== pb.slot) return true;
      if (pa.room === pb.room) return false;                       // H1
      const ca = courseById(A), cb = courseById(B);
      if (ca.instr === cb.instr) return false;                     // H3
      if (ca.cohort === cb.cohort) return false;                   // H5
      return true;
    };
    const csp = new CSP(vars, domains, neighbors, constraint, { kind: 'schedule' });
    return csp;
  }

  /**
   * Evaluates a (possibly partial) timetable.
   * @param {Object<string,{slot:number, room:string}>} tt
   * @param {Object} enabledSoft  e.g. {S1:true,...}
   */
  function evaluateSchedule(tt, enabledSoft) {
    const en = Object.assign({ S1: true, S2: true, S3: true, S4: true, S5: true }, enabledSoft || {});
    const W = SCHEDULE.weights;
    const hard = { H1: [], H2: [], H3: [], H4: [], H5: [], H6: [] };
    const soft = { S1: [], S2: [], S3: [], S4: [], S5: [] };
    const ids = SCHEDULE.courses.map(c => c.id);
    for (const c of SCHEDULE.courses) {
      const a = tt[c.id];
      if (!a) { hard.H6.push({ courses: [c.id], msg: `${c.id} is not scheduled` }); continue; }
      const u = unaryOk(c, a.slot, a.room);
      const room = roomById(a.room);
      if (!u.h2) hard.H2.push({ courses: [c.id], msg: room.type !== c.type ? `${c.id} (${c.type}) placed in ${a.room} (${room.type})` : `${c.id} needs ${c.enroll} seats; ${a.room} has ${room.cap}` });
      if (!u.h4) hard.H4.push({ courses: [c.id], msg: `Dr. ${c.instr} is unavailable ${slotLabel(a.slot)}` });
      if (!SCHEDULE.instructors[c.instr].prefers.includes(a.slot)) soft.S1.push({ courses: [c.id], cost: W.S1, msg: `Dr. ${c.instr} prefers ${SCHEDULE.instructors[c.instr].prefLabel} (${c.id} at ${slotLabel(a.slot)})` });
      if (room.cap > 2 * c.enroll) soft.S2.push({ courses: [c.id], cost: W.S2, msg: `${c.id} (${c.enroll}) in ${a.room} (${room.cap} seats)` });
    }
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      const A = tt[ids[i]], B = tt[ids[j]];
      if (!A || !B || A.slot !== B.slot) continue;
      const ca = SCHEDULE.courses[i], cb = SCHEDULE.courses[j];
      if (A.room === B.room) hard.H1.push({ courses: [ca.id, cb.id], msg: `${ca.id} & ${cb.id} both in ${A.room} at ${slotLabel(A.slot)}` });
      if (ca.instr === cb.instr) hard.H3.push({ courses: [ca.id, cb.id], msg: `Dr. ${ca.instr} teaches ${ca.id} & ${cb.id} at ${slotLabel(A.slot)}` });
      if (ca.cohort === cb.cohort) hard.H5.push({ courses: [ca.id, cb.id], msg: `${ca.cohort} has ${ca.id} & ${cb.id} at ${slotLabel(A.slot)}` });
    }
    // Cohort day patterns: S3 dead hours, S4 fatigue, S5 transit
    const P = SCHEDULE.periods.length;
    for (const co in SCHEDULE.cohorts) {
      for (let d = 0; d < SCHEDULE.days.length; d++) {
        const byPeriod = new Array(P).fill(null);
        for (const c of SCHEDULE.courses) {
          const a = tt[c.id];
          if (a && c.cohort === co && Math.floor(a.slot / P) === d) byPeriod[a.slot % P] = byPeriod[a.slot % P] || { c, a };
        }
        const used = byPeriod.map((x, k) => x ? k : -1).filter(k => k >= 0);
        if (used.length >= 2) {
          const gaps = (used[used.length - 1] - used[0] + 1) - used.length;
          if (gaps > 0) soft.S3.push({ courses: used.map(k => byPeriod[k].c.id), cost: gaps * W.S3, msg: `${co} has ${gaps} dead hour${gaps > 1 ? 's' : ''} on ${SCHEDULE.days[d]}` });
        }
        let run = 0;
        for (let k = 0; k < P; k++) {
          run = byPeriod[k] ? run + 1 : 0;
          if (run > 2) soft.S4.push({ courses: [byPeriod[k].c.id], cost: W.S4, msg: `${co} has ${run} back-to-back classes on ${SCHEDULE.days[d]}` });
          if (k > 0 && byPeriod[k] && byPeriod[k - 1]) {
            const b1 = roomById(byPeriod[k - 1].a.room).bldg, b2 = roomById(byPeriod[k].a.room).bldg;
            if (b1 !== b2) soft.S5.push({ courses: [byPeriod[k - 1].c.id, byPeriod[k].c.id], cost: W.S5, msg: `${co}: ${byPeriod[k - 1].c.id} (bldg ${b1}) → ${byPeriod[k].c.id} (bldg ${b2}) on ${SCHEDULE.days[d]}` });
          }
        }
      }
    }
    let hardCount = 0; for (const k in hard) hardCount += hard[k].length;
    let softCost = 0; const softBy = {};
    for (const k in soft) {
      softBy[k] = en[k] ? soft[k].reduce((s, x) => s + x.cost, 0) : 0;
      softCost += softBy[k];
    }
    return { hard, soft, hardCount, softCost, softBy, enabled: en };
  }

  function valsToTimetable(assign) {
    const tt = {};
    for (const k in assign) tt[k] = parseVal(assign[k]);
    return tt;
  }

  /**
   * Two-phase solver:
   *  1) backtracking + MRV + FC over node-consistent domains (hard only),
   *     values ordered by incremental soft cost (a greedy LCV-like order);
   *  2) local search: repeatedly move one course to the hard-feasible value
   *     that most reduces total soft penalty (min-conflicts on soft cost).
   */
  function solveSchedule(opts) {
    opts = Object.assign({ enabledSoft: null, seed: 11, maxIters: 400, optimize: true }, opts || {});
    const csp = makeScheduleCSP(true);
    const rng = makeRng(opts.seed);
    // Shuffle value order for variety, then stable-sort by greedy soft cost at runtime.
    for (const v of csp.variables) {
      const d = csp.domains[v];
      for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
    }
    const bt = backtrackingSearch(csp, { varOrder: 'mrv-degree', valOrder: 'static', inference: 'fc', trace: false });
    if (!bt.solution) return { feasible: false, bt };
    let tt = valsToTimetable(bt.solution);
    const history = [{ phase: 'hard', cost: evaluateSchedule(tt, opts.enabledSoft).softCost }];
    const initial = JSON.parse(JSON.stringify(tt));
    if (opts.optimize) {
      let cur = evaluateSchedule(tt, opts.enabledSoft).softCost;
      for (let it = 0; it < opts.maxIters; it++) {
        const v = csp.variables[Math.floor(rng() * csp.variables.length)];
        let best = null, bestCost = cur;
        const old = tt[v];
        for (const val of csp.domains[v]) {
          const p = parseVal(val);
          // hard feasibility against the others (binary H1/H3/H5)
          let ok = true;
          for (const u of csp.variables) {
            if (u === v) continue;
            if (!csp.constraint(v, val, u, schedVal(tt[u].slot, tt[u].room))) { ok = false; break; }
          }
          if (!ok) continue;
          tt[v] = p;
          const c = evaluateSchedule(tt, opts.enabledSoft).softCost;
          if (c < bestCost || (c === bestCost && best && rng() < 0.3)) { bestCost = c; best = p; }
        }
        tt[v] = best || old;
        if (best && bestCost < cur) { cur = bestCost; history.push({ phase: 'local', cost: cur, moved: v }); }
        if (cur === 0) break;
      }
    }
    return { feasible: true, bt, initial, timetable: tt, history, eval: evaluateSchedule(tt, opts.enabledSoft) };
  }

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------

  window.CSPEngine = {
    CSP, makeRng, copyDomains,
    AUSTRALIA, projectAus, COLOR_HEX, COLOR_LIST, makeMapCSP, randomMap,
    makeQueensCSP, queenConflicts, queensAttackingPairs, queensMinConflicts,
    revise, ac3, backtrackingSearch, countSolutions, minConflicts,
    TREE_EXAMPLE, treeCspSolve,
    makeSudokuCSP, SUDOKU_PRESETS,
    SCHEDULE, schedVal, parseVal, slotLabel, roomById, courseById, unaryOk,
    makeScheduleCSP, evaluateSchedule, valsToTimetable, solveSchedule
  };
})();
