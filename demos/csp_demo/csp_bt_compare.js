/**
 * CSP Backtracking Comparison — Playground sub-tab (playground.html#view-csp → "Backtracking Comparison")
 *
 * Three solvers run side by side on the SAME tiny CSP with the SAME ordering:
 *   Variables  X1, X2, X3        Domains {0, 1}
 *   Constraints X1 ≠ X2, X2 ≠ X3  (constraint graph X1 — X2 — X3)
 *   Variable order X1 → X3 → X2   Value order 0 → 1
 *
 *   1. Basic Backtracking (BT)            — checks a value only against assigned neighbours
 *   2. Backtracking + Forward Checking    — prunes unassigned neighbours after each assignment
 *   3. Backtracking + AC-3 (MAC)          — runs AC-3 after each assignment and propagates
 *
 * Each solver's full trace is pre-computed as a list of snapshots; every panel
 * has its own Next Step / Reset, so students can advance them independently.
 * An optional "tighter domains" scenario (D(X3) = {1}) is
 * applied to all three panels at once to show backtracking and domain restoration.
 *
 * Exposes window.CSPBTCompare.render(paneEl); called by csp_lab.js.
 */
(function () {
  'use strict';

  const VARS = ['X1', 'X2', 'X3'];
  const NB = { X1: ['X2'], X2: ['X1', 'X3'], X3: ['X2'] };
  const EDGES = [['X1', 'X2'], ['X2', 'X3']];
  const ORDER = ['X1', 'X3', 'X2'];

  const SCENARIOS = {
    spec: {
      label: 'Specified CSP',
      domains: { X1: [0, 1], X2: [0, 1], X3: [0, 1] },
      tip: 'With domains {0, 1} no algorithm backtracks; the difference is <strong>how early each one sees the conflict</strong>. BT assigns X1 = 0 and X3 = 0, then tries X2 = 0 and fails a check. FC removes 0 from D(X2) the moment X1 = 0 is assigned, so X2 = 0 is never tried. AC-3 goes further: once D(X2) = {1}, it propagates to X3 and removes 1 from D(X3) <strong>before X3 is chosen</strong>. Switch to <em>Tighter domains</em> to see backtracking and domain restoration.'
    },
    tight: {
      label: 'Tighter domains',
      domains: { X1: [0, 1], X2: [0, 1], X3: [1] },
      tip: 'With D(X3) = {1}, the choice X1 = 0 is a trap: X2 would need to differ from both 0 and 1. BT only finds out after trying every value of X2, then has to back up through X3 to X1. FC finds it one level earlier, as a <strong>domain wipe-out</strong> of D(X2) right after X3 = 1, and restores D(X2) on each backtrack. AC-3 propagates X1 = 0 → D(X2) = {1} → D(X3) = ∅ immediately, so it rejects X1 = 0 <strong>before X3 is ever chosen</strong>.'
    }
  };

  const ALGS = [
    { id: 'bt', tag: 'BT', name: 'Basic Backtracking', desc: 'Checks a value only against already-assigned neighbours. No domain pruning.' },
    { id: 'fc', tag: 'BT + FC', name: 'Backtracking + Forward Checking', desc: 'After each assignment, deletes conflicting values from the domains of unassigned neighbours.' },
    { id: 'ac', tag: 'BT + AC-3', name: 'Backtracking + Arc Consistency', desc: 'After each assignment, runs AC-3 (MAC) and propagates reductions across all unassigned variables.' }
  ];

  const PILL = {
    start: ['neutral', 'START'], select: ['info', 'SELECT'], try: ['info', 'TRY'], check: ['ok', 'CHECK ✓'],
    reject: ['bad', 'CONFLICT'], assign: ['ok', 'ASSIGN'], prune: ['warn', 'PRUNE'], keep: ['neutral', 'NO CHANGE'],
    wipeout: ['bad', 'WIPE-OUT'], undo: ['warn', 'BACKTRACK'], deadend: ['warn', 'DEAD END'], solution: ['ok', 'SOLUTION']
  };

  const set = a => '{' + a.join(', ') + '}';
  const setD = a => (a.length ? set(a) : '∅');
  const cn = (a, b) => (a < b ? `${a} ≠ ${b}` : `${b} ≠ ${a}`);
  const clone = o => JSON.parse(JSON.stringify(o));

  // =========================================================================
  // Trace generator
  // =========================================================================
  function buildTrace(alg, domains) {
    const st = {
      assign: {},
      pruned: { X1: {}, X2: {}, X3: {} },   // value → { by: variable that removed support, cause: assignment that triggered it }
      rejected: { X1: [], X2: [], X3: [] }, // values of a variable tried and failed in the current branch
      stats: { attempts: 0, checks: 0, pruned: 0, backtracks: 0 }
    };
    const steps = [];
    const live = v => domains[v].filter(x => !(x in st.pruned[v]));
    const push = (kind, msg, extra) => steps.push(Object.assign({
      kind, msg,
      assign: Object.assign({}, st.assign),
      pruned: clone(st.pruned),
      rejected: clone(st.rejected),
      live: Object.fromEntries(VARS.map(v => [v, live(v)])),
      stats: Object.assign({}, st.stats)
    }, extra || {}));

    // ---- Forward checking: one step per unassigned neighbour ----
    function forwardCheck(v, val) {
      for (const u of NB[v]) {
        if (u in st.assign) continue;
        const before = live(u);
        st.stats.checks += before.length;
        const removed = before.filter(x => x === val);
        removed.forEach(x => { st.pruned[u][x] = { by: v, cause: v }; });
        st.stats.pruned += removed.length;
        const after = live(u);
        if (removed.length) {
          push('prune', `Forward check ${u}: ${cn(v, u)} with ${v} = ${val} rules out ${u} = ${val}. D(${u}) ${set(before)} → ${setD(after)}.`,
            { focus: u, arc: [u, v], removed: removed.map(x => [u, x]), note: `${u} = ${val} pruned right after ${v} = ${val}` });
        } else {
          push('keep', `Forward check ${u}: ${val} ∉ D(${u}) = ${set(before)}, so nothing to remove.`, { focus: u, arc: [u, v] });
        }
        if (!after.length) {
          push('wipeout', `Domain wipe-out: D(${u}) = ∅. ${v} = ${val} cannot be part of any solution, detected before ${u} is even tried.`,
            { focus: u, wipe: u, note: `D(${u}) wiped out after ${v} = ${val}` });
          return false;
        }
      }
      return true;
    }

    // ---- MAC: AC-3 seeded with arcs (Xk, v) for unassigned neighbours Xk ----
    function mac(v, queue) {
      while (queue.length) {
        const [xi, xj] = queue.shift();
        const Di = live(xi);
        const Dj = (xj in st.assign) ? [st.assign[xj]] : live(xj);
        const removed = [];
        for (const a of Di) {
          let sup = false;
          for (const b of Dj) { st.stats.checks++; if (a !== b) { sup = true; break; } }
          if (!sup) removed.push(a);
        }
        removed.forEach(x => { st.pruned[xi][x] = { by: xj, cause: v }; });
        st.stats.pruned += removed.length;
        const after = live(xi);
        const added = [];
        if (removed.length && after.length) {
          for (const xk of NB[xi]) {
            if (xk === xj || (xk in st.assign)) continue;
            if (!queue.some(([a, b]) => a === xk && b === xi)) { queue.push([xk, xi]); added.push([xk, xi]); }
          }
        }
        const lead = `Revise arc (${xi} → ${xj}): every value in D(${xi}) = ${set(Di)} needs a support in ${xj in st.assign ? `${xj} = ${st.assign[xj]}` : `D(${xj}) = ${set(Dj)}`}.`;
        const tail = !after.length ? ' AC-3 stops here.' : queue.length ? ` Queue: ${queue.map(([a, b]) => `(${a},${b})`).join(' ')}.` : ' Queue empty, so the network is arc consistent.';
        if (removed.length) {
          const prop = added.length ? ` D(${xi}) shrank, so add ${added.map(([a, b]) => `(${a},${b})`).join(', ')} to the queue.` : '';
          push('prune', `${lead} ${removed.join(', ')} has no support → remove. D(${xi}) = ${setD(after)}.${prop}${tail}`,
            { focus: xi, arc: [xi, xj], removed: removed.map(x => [xi, x]), queue: queue.map(q => q.slice()), added,
              note: `${xi} = ${removed.join(',')} pruned after ${v} = ${st.assign[v]}${xj !== v ? ' (propagated via ' + xj + ')' : ''}` });
        } else {
          push('keep', `${lead} All values supported, no change.${tail}`, { focus: xi, arc: [xi, xj], queue: queue.map(q => q.slice()) });
        }
        if (!after.length) {
          push('wipeout', `Domain wipe-out: D(${xi}) = ∅, so ${v} = ${st.assign[v]} is inconsistent.`, { focus: xi, wipe: xi, note: `D(${xi}) wiped out after ${v} = ${st.assign[v]}` });
          return false;
        }
      }
      return true;
    }

    function solve(depth) {
      const v = ORDER.find(x => !(x in st.assign));
      if (!v) {
        push('solution', `All variables assigned: X1 = ${st.assign.X1}, X2 = ${st.assign.X2}, X3 = ${st.assign.X3}. Both X1 ≠ X2 and X2 ≠ X3 hold, so this is the first solution.`, { done: true });
        return true;
      }
      const D = live(v);
      const domNote = alg === 'bt' ? ' (BT never prunes, so this is always the full domain)' : '';
      push('select', `Select ${v}, next in the fixed order X1 → X3 → X2. D(${v}) = ${setD(D)}${domNote}.`, { focus: v });

      for (const val of D) {
        st.stats.attempts++;
        if (alg === 'bt') {
          const nb = NB[v].filter(u => u in st.assign);
          let ok = true;
          if (nb.length) {
            push('try', `Try ${v} = ${val}. Check it against assigned neighbour${nb.length > 1 ? 's' : ''} ${nb.join(' and ')}.`, { focus: v, trying: [v, val] });
            for (const u of nb) {
              st.stats.checks++;
              if (st.assign[u] !== val) {
                push('check', `Check ${cn(v, u)}: ${v} = ${val}, ${u} = ${st.assign[u]} → ${val} ≠ ${st.assign[u]} ✓ satisfied.`, { focus: v, trying: [v, val], edge: [v, u, true] });
              } else {
                st.rejected[v].push(val);
                push('reject', `Check ${cn(v, u)}: ${v} = ${val}, ${u} = ${st.assign[u]} → ${val} = ${val} ✗ violated. Reject ${v} = ${val}.`,
                  { focus: v, edge: [v, u, false], note: `${v} = ${val} fails check against ${u} = ${st.assign[u]}` });
                ok = false;
                break;
              }
            }
          }
          if (!ok) continue;
          st.assign[v] = val;
          push('assign', nb.length ? `All checks passed. Assign ${v} = ${val}.` : `Try ${v} = ${val}: no neighbour of ${v} is assigned yet, so nothing to check. Assign ${v} = ${val}.`, { focus: v });
        } else {
          st.assign[v] = val;
          let q = null;
          if (alg === 'ac') q = NB[v].filter(u => !(u in st.assign)).map(u => [u, v]);
          const why = `${val} is still in D(${v}), so pruning already guarantees it is consistent with every assigned neighbour.`;
          const next = alg === 'fc'
            ? (NB[v].some(u => !(u in st.assign)) ? ' Next: forward-check its unassigned neighbours.' : ' No unassigned neighbours to forward-check.')
            : (q.length ? ` Start AC-3 with queue ${q.map(([a, b]) => `(${a},${b})`).join(' ')}.` : ' No unassigned neighbours, so the AC-3 queue is empty.');
          push('assign', `Try ${v} = ${val}: ${why} Assign ${v} = ${val}.${next}`, { focus: v, queue: q ? q.map(x => x.slice()) : null });
          const ok = alg === 'fc' ? forwardCheck(v, val) : mac(v, q);
          if (ok && solve(depth + 1)) return true;
          // fall through to undo
          undo(v, val);
          continue;
        }
        if (solve(depth + 1)) return true;
        undo(v, val);
      }
      const prev = ORDER[ORDER.indexOf(v) - 1];
      push('deadend', prev
        ? `No value of ${v} is left to try. Return failure to ${prev}, the most recently assigned variable.`
        : `No value of ${v} works, so the CSP has no solution.`, { focus: v, failed: v });
      st.rejected[v] = [];
      return false;
    }

    function undo(v, val) {
      delete st.assign[v];
      st.stats.backtracks++;
      const restored = [];
      VARS.forEach(u => Object.keys(st.pruned[u]).forEach(k => {
        if (st.pruned[u][k].cause === v) { restored.push([u, +k]); delete st.pruned[u][k]; }
      }));
      st.rejected[v].push(val);
      const r = restored.length
        ? ` Restore the values its inference pruned: ${restored.map(([u, x]) => `${u} ← ${x}`).join(', ')}.`
        : alg === 'bt' ? ' BT pruned nothing, so there is nothing to restore.' : ' Nothing was pruned by it, so there is nothing to restore.';
      push('undo', `Backtrack: unassign ${v} = ${val}.${r} Try the next value of ${v}.`, { focus: v, restored });
    }

    const d0 = VARS.map(v => `D(${v}) = ${set(domains[v])}`).join(', ');
    push('start', `Nothing assigned yet. ${d0}. Press Next Step to begin.`, {});
    solve(0);
    return steps;
  }

  // =========================================================================
  // Rendering
  // =========================================================================
  const S = { scen: 'spec', idx: { bt: 0, fc: 0, ac: 0 }, traces: null, key: null };

  function ensure() {
    if (S.key === S.scen) return;
    const dom = SCENARIOS[S.scen].domains;
    S.traces = Object.fromEntries(ALGS.map(a => [a.id, buildTrace(a.id, dom)]));
    S.idx = { bt: 0, fc: 0, ac: 0 };
    S.key = S.scen;
  }

  const P = { X1: [56, 80], X2: [160, 80], X3: [264, 80] };
  const R = 24;

  function graphSVG(alg, s) {
    const id = 'cspbt-' + alg;
    let g = `<svg viewBox="0 0 320 140" class="cspbt-graph" role="img" aria-label="Constraint graph X1 — X2 — X3">
      <defs>
        <marker id="${id}-ok" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" class="cspbt-ah ok"/></marker>
        <marker id="${id}-bad" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" class="cspbt-ah bad"/></marker>
      </defs>`;
    EDGES.forEach(([a, b]) => {
      let cls = '';
      if (s.edge && ((s.edge[0] === a && s.edge[1] === b) || (s.edge[0] === b && s.edge[1] === a))) cls = s.edge[2] ? 'ok' : 'bad';
      const [x1, y] = P[a], [x2] = P[b];
      g += `<line x1="${x1 + R}" y1="${y}" x2="${x2 - R}" y2="${y}" class="cspbt-edge ${cls}"/>`;
      g += `<text x="${(x1 + x2) / 2}" y="${y - 7}" class="cspbt-neq ${cls}">≠</text>`;
      if (cls === 'bad') g += `<text x="${(x1 + x2) / 2}" y="${y + 18}" class="cspbt-x">✗</text>`;
      if (cls === 'ok') g += `<text x="${(x1 + x2) / 2}" y="${y + 18}" class="cspbt-tick">✓</text>`;
    });
    if (s.arc) {
      const [xi, xj] = s.arc;
      const [tx] = P[xi], [sx] = P[xj], y = P[xi][1];
      const dir = tx > sx ? 1 : -1;
      const bad = s.removed && s.removed.length;
      const x0 = sx + dir * 10, x1 = tx - dir * 10;
      g += `<path d="M${x0},${y - R + 2} Q${(sx + tx) / 2},${y - R - 38} ${x1},${y - R + 2}" class="cspbt-arc ${bad ? 'bad' : 'ok'}" marker-end="url(#${id}-${bad ? 'bad' : 'ok'})"/>`;
    }
    VARS.forEach(v => {
      const [x, y] = P[v];
      const asg = v in s.assign;
      const trying = s.trying && s.trying[0] === v;
      const wipe = s.wipe === v || (s.live[v].length === 0);
      const cls = ['cspbt-node', asg ? 'asg' : '', s.focus === v ? 'focus' : '', trying ? 'try' : '', wipe ? 'wipe' : '', s.failed === v ? 'wipe' : ''].join(' ');
      g += `<g class="${cls}"><circle cx="${x}" cy="${y}" r="${R}"/><text x="${x}" y="${y + 5}" class="cspbt-nlabel">${v}</text></g>`;
      let sub, subCls = '';
      if (asg) { sub = `= ${s.assign[v]}`; subCls = 'asg'; }
      else if (trying) { sub = `${s.trying[1]} ?`; subCls = 'try'; }
      else { sub = setD(s.live[v]); subCls = s.live[v].length ? '' : 'bad'; }
      g += `<text x="${x}" y="${y + R + 18}" class="cspbt-sub ${subCls}">${sub}</text>`;
    });
    return g + '</svg>';
  }

  function domainRows(alg, s, init) {
    return VARS.map(v => {
      const asg = v in s.assign;
      const chips = init[v].map(x => {
        const cls = ['cspbt-chip'];
        let title = '';
        const pr = s.pruned[v][x];
        if (asg && s.assign[v] === x) { cls.push('asg'); title = 'assigned'; }
        else if (s.trying && s.trying[0] === v && s.trying[1] === x) { cls.push('try'); title = 'being tried'; }
        if (pr) { cls.push('gone'); title = `pruned (no support from ${pr.by})`; }
        if (s.removed && s.removed.some(([u, y]) => u === v && y === x)) cls.push('just');
        if (s.restored && s.restored.some(([u, y]) => u === v && y === x)) { cls.push('rest'); title = 'restored on backtrack'; }
        if (!pr && !asg && s.rejected[v].includes(x)) { cls.push('rej'); title = 'tried and failed in this branch'; }
        const by = pr ? `<sub>${pr.by}</sub>` : '';
        return `<span class="${cls.join(' ')}" title="${title}">${x}${by}</span>`;
      }).join('');
      const val = asg ? `<b class="cspbt-val">${s.assign[v]}</b>` : '<span class="cspbt-val none">–</span>';
      const left = s.live[v].length;
      return `<tr class="${s.focus === v ? 'focus' : ''}"><th>${v}</th><td>${val}</td><td><div class="cspbt-chips">${chips}</div></td><td class="cspbt-left ${left ? '' : 'bad'}">${asg ? '' : left}</td></tr>`;
    }).join('');
  }

  function panelHTML(a) {
    const steps = S.traces[a.id];
    const i = S.idx[a.id];
    const s = steps[i];
    const init = SCENARIOS[S.scen].domains;
    const pill = PILL[s.kind] || ['neutral', s.kind];
    const log = steps.slice(Math.max(0, i - 4), i + 1).map((x, k, arr) =>
      `<div class="csp-log-row k-${x.kind} ${k === arr.length - 1 ? 'cur' : ''}"><span class="cspbt-logn">${i - arr.length + k + 2}</span>${(PILL[x.kind] || ['', x.kind])[1]}</div>`).join('');
    const queue = a.id === 'ac'
      ? `<div class="cspbt-queue"><span class="cspbt-qlabel">AC-3 queue</span>${s.queue && s.queue.length
          ? s.queue.map(([p, q]) => `<span class="cspbt-qchip ${s.added && s.added.some(([m, n]) => m === p && n === q) ? 'new' : ''}">(${p},${q})</span>`).join('')
          : '<span class="csp-muted">empty</span>'}</div>`
      : '';
    const done = !!s.done;
    const st = s.stats;
    return `
      <div class="cspbt-panel ${done ? 'solved' : ''}" data-alg="${a.id}">
        <div class="cspbt-head">
          <span class="cspbt-tag">${a.tag}</span>
          <span class="csp-pill ${pill[0]}">${pill[1]}</span>
        </div>
        <div class="cspbt-title">${a.name}</div>
        <p class="cspbt-desc">${a.desc}</p>
        <div class="cspbt-graph-wrap">${graphSVG(a.id, s)}</div>
        <table class="cspbt-dom">
          <thead><tr><th>Var</th><th>Value</th><th>Domain</th><th>|D|</th></tr></thead>
          <tbody>${domainRows(a.id, s, init)}</tbody>
        </table>
        ${queue}
        <div class="cspbt-msg k-${s.kind}"><span class="cspbt-stepno">Step ${i + 1}</span>${s.msg}</div>
        <div class="csp-log cspbt-log">${log}</div>
        <div class="cspbt-stats">
          <div><span>Attempted</span><b>${st.attempts}</b></div>
          <div><span>Checks</span><b>${st.checks}</b></div>
          <div><span>Pruned</span><b>${st.pruned}</b></div>
          <div><span>Backtracks</span><b class="${st.backtracks ? 'warn' : ''}">${st.backtracks}</b></div>
        </div>
        <div class="cspbt-btns">
          <button class="csp-btn" data-act="reset" data-alg="${a.id}" ${i === 0 ? 'disabled' : ''}><i data-lucide="rotate-ccw"></i> Reset</button>
          <span class="cspbt-count">${i + 1} / ${steps.length}</span>
          <button class="csp-btn csp-btn-primary" data-act="next" data-alg="${a.id}" ${done ? 'disabled' : ''}>${done ? 'Solved' : 'Next Step'} <i data-lucide="${done ? 'check' : 'chevron-right'}"></i></button>
        </div>
      </div>`;
  }

  function summaryHTML() {
    const cols = ALGS.map(a => {
      const steps = S.traces[a.id], i = S.idx[a.id], s = steps[i], end = steps[steps.length - 1];
      const firstIdx = steps.findIndex(x => x.note);
      const seen = firstIdx >= 0 && firstIdx <= i;
      const first = firstIdx < 0 ? '–' : seen ? `Step ${firstIdx + 1}: ${steps[firstIdx].note}` : '<span class="csp-muted">not reached yet</span>';
      const prunes = steps.slice(0, i + 1).filter(x => x.removed && x.removed.length).length;
      return { a, i, s, end, total: steps.length, first, prunes };
    });
    const row = (label, f) => `<tr><th>${label}</th>${cols.map(c => `<td>${f(c)}</td>`).join('')}</tr>`;
    const tot = (cur, all) => `<b>${cur}</b> <span class="csp-muted">/ ${all}</span>`;
    return `
      <div class="cspbt-summary">
        <div class="cspbt-sum-head"><i data-lucide="bar-chart-3"></i><span>Side-by-side comparison</span><span class="csp-muted">current value / value when the solution is found</span></div>
        <div class="csp-table-wrap"><table class="csp-table cspbt-sum-table">
          <thead><tr><th></th>${cols.map(c => `<th>${c.a.tag}</th>`).join('')}</tr></thead>
          <tbody>
            ${row('Steps', c => tot(c.i + 1, c.total))}
            ${row('Attempted assignments', c => tot(c.s.stats.attempts, c.end.stats.attempts))}
            ${row('Constraint checks', c => tot(c.s.stats.checks, c.end.stats.checks))}
            ${row('Domain values pruned', c => tot(c.s.stats.pruned, c.end.stats.pruned))}
            ${row('Backtracks', c => tot(c.s.stats.backtracks, c.end.stats.backtracks))}
            ${row('First conflict detected', c => c.first)}
            ${row('Status', c => c.s.done ? `<span class="csp-pill ok">Solved: X1=${c.s.assign.X1}, X2=${c.s.assign.X2}, X3=${c.s.assign.X3}</span>` : '<span class="csp-pill neutral">Running</span>')}
          </tbody>
        </table></div>
        <div class="teaching-tip"><i data-lucide="lightbulb"></i><span>${SCENARIOS[S.scen].tip}</span></div>
      </div>`;
  }

  function render(pane) {
    if (!pane) return;
    ensure();
    const dom = SCENARIOS[S.scen].domains;
    const allDone = ALGS.every(a => S.traces[a.id][S.idx[a.id]].done);
    pane.innerHTML = `
      <div class="cspbt-wrap">
        <div class="cspbt-setup">
          <div class="cspbt-setup-main">
            <div class="cspbt-setup-title"><i data-lucide="git-compare"></i> CSP Backtracking Comparison</div>
            <div class="cspbt-facts">
              <div><span>Variables</span><b>X1, X2, X3</b></div>
              <div><span>Domains</span><b>${VARS.map(v => `D(${v}) = ${set(dom[v])}`).join(' · ')}</b></div>
              <div><span>Constraints</span><b>X1 ≠ X2, X2 ≠ X3</b></div>
              <div><span>Variable order</span><b>X1 → X3 → X2</b></div>
              <div><span>Value order</span><b>0 → 1</b></div>
            </div>
          </div>
          <div class="cspbt-setup-ctrl">
            <div class="csp-seg" id="cspbt-scen">
              ${Object.entries(SCENARIOS).map(([k, sc]) => `<button data-act="scen" data-val="${k}" class="${S.scen === k ? 'active' : ''}">${sc.label}</button>`).join('')}
            </div>
            <div class="cspbt-global">
              <button class="csp-btn" data-act="reset-all"><i data-lucide="rotate-ccw"></i> Reset all</button>
              <button class="csp-btn csp-btn-primary" data-act="next-all" ${allDone ? 'disabled' : ''}>Step all three <i data-lucide="chevrons-right"></i></button>
            </div>
          </div>
        </div>
        <div class="cspbt-legend">
          <span><i class="cspbt-chip asg">1</i> assigned</span>
          <span><i class="cspbt-chip try">1</i> being tried</span>
          <span><i class="cspbt-chip rej">1</i> tried &amp; failed</span>
          <span><i class="cspbt-chip gone just">1</i> pruned this step</span>
          <span><i class="cspbt-chip gone">1<sub>X1</sub></i> pruned (by)</span>
          <span><i class="cspbt-chip rest">1</i> restored on backtrack</span>
        </div>
        <div class="cspbt-panels">${ALGS.map(panelHTML).join('')}</div>
        ${summaryHTML()}
      </div>`;
    pane.querySelectorAll('.cspbt-log').forEach(el => { el.scrollTop = el.scrollHeight; });
    if (window.lucide) window.lucide.createIcons();
    if (!pane._cspbtBound) {
      pane._cspbtBound = true;
      pane.addEventListener('click', e => {
        const b = e.target.closest('[data-act]');
        if (!b || b.disabled) return;
        const act = b.getAttribute('data-act'), alg = b.getAttribute('data-alg');
        const last = id => S.traces[id].length - 1;
        if (act === 'next') S.idx[alg] = Math.min(last(alg), S.idx[alg] + 1);
        else if (act === 'reset') S.idx[alg] = 0;
        else if (act === 'next-all') ALGS.forEach(a => { S.idx[a.id] = Math.min(last(a.id), S.idx[a.id] + 1); });
        else if (act === 'reset-all') ALGS.forEach(a => { S.idx[a.id] = 0; });
        else if (act === 'scen') S.scen = b.getAttribute('data-val');
        render(pane);
      });
    }
  }

  window.CSPBTCompare = { render, buildTrace, SCENARIOS };
})();
