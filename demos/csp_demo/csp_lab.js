/**
 * Constraint Satisfaction Problems — Playground Lab (playground.html#view-csp)
 *
 * Four sub-tabs, all running on window.CSPEngine (csp_engine.js) and drawn
 * with window.CSPRender (csp_render.js):
 *   1. Map Colouring Solver   — backtracking with MRV / Degree / LCV and
 *                               FC / MAC inference, full step-by-step replay
 *   2. Course Scheduling      — the H1–H6 / S1–S5 timetabling CSP from
 *                               instructions/csp.md; solve, optimise, edit
 *   3. N-Queens Min-Conflicts — local search with conflict history
 *   4. Sudoku (AC-3 + MAC)    — propagation vs. search on real puzzles
 */

(function () {
  'use strict';

  const E = window.CSPEngine;
  const R = window.CSPRender;
  if (!E || !R) return;
  const HEX = E.COLOR_HEX;

  const speedMs = v => [1400, 900, 550, 280, 120, 40][Math.max(0, Math.min(5, v - 1))];
  const kindPill = {
    start: ['neutral', 'START'], select: ['info', 'SELECT'], reject: ['bad', 'REJECT'], assign: ['ok', 'ASSIGN'],
    infer: ['info', 'INFERENCE'], wipeout: ['bad', 'WIPE-OUT'], undo: ['warn', 'BACKTRACK'], deadend: ['warn', 'DEAD END'],
    solution: ['ok', 'SOLUTION'], failure: ['bad', 'NO SOLUTION'], move: ['info', 'MOVE']
  };

  class CSPLab {
    constructor(root) {
      this.root = root;
      this.active = 'map';
      this.timer = null;
      this.map = { problem: 'aus', colors: 3, seed: 7, varOrder: 'static', valOrder: 'static', inference: 'none', speed: 3, step: 0, run: null, key: null };
      this.sched = { tt: null, sel: null, history: [], soft: { S1: true, S2: true, S3: true, S4: true, S5: true }, log: 'Press “Solve hard constraints” to build a feasible timetable.', btStats: null };
      this.q = { n: 8, seed: 1, init: 'random', speed: 3, step: 0, run: null, key: null };
      this.sud = { preset: 'easy', domains: null, msg: '', stats: null, trace: null, step: 0 };
      this.bindSubtabs();
      this.render();
    }

    icons() { if (window.lucide) window.lucide.createIcons(); }
    $(id) { return document.getElementById(id); }
    on(id, ev, fn) { const el = this.$(id); if (el) el.addEventListener(ev, fn); }
    stop() { if (this.timer) { clearInterval(this.timer); this.timer = null; } }

    bindSubtabs() {
      document.querySelectorAll('.csp-subtab-btn').forEach(btn => btn.addEventListener('click', () => {
        this.stop();
        document.querySelectorAll('.csp-subtab-btn').forEach(b => b.classList.toggle('active', b === btn));
        this.active = btn.getAttribute('data-subtab');
        this.render();
      }));
    }

    render() {
      document.querySelectorAll('.csp-subtab-pane').forEach(p => p.classList.toggle('active', p.id === 'csp-pane-' + this.active));
      const fn = { map: this.renderMap, schedule: this.renderSchedule, queens: this.renderQueens, sudoku: this.renderSudoku }[this.active];
      fn.call(this);
      this.icons();
    }

    resizeCanvas() { /* SVG-based: nothing to resize; kept for main.js parity */ }

    /** Generic Run/Pause toggle over a trace. */
    togglePlay(state, total, rerender) {
      if (this.timer) { this.stop(); rerender(); return; }
      if (state.step >= total - 1) state.step = 0;
      this.timer = setInterval(() => {
        if (state.step >= total - 1) { this.stop(); rerender(); return; }
        state.step++;
        rerender();
      }, speedMs(state.speed));
      rerender();
    }

    stepperHTML(prefix, idx, total) {
      return `<div class="csp-stepper">
        <button class="csp-btn" id="${prefix}-reset" title="Reset"><i data-lucide="rotate-ccw"></i></button>
        <button class="csp-btn" id="${prefix}-prev" ${idx <= 0 ? 'disabled' : ''}><i data-lucide="chevron-left"></i> Prev</button>
        <button class="csp-btn csp-btn-primary" id="${prefix}-play"><i data-lucide="${this.timer ? 'pause' : 'play'}"></i> ${this.timer ? 'Pause' : 'Run'}</button>
        <button class="csp-btn" id="${prefix}-next" ${idx >= total - 1 ? 'disabled' : ''}>Next <i data-lucide="chevron-right"></i></button>
        <button class="csp-btn" id="${prefix}-end" ${idx >= total - 1 ? 'disabled' : ''} title="Jump to end">End <i data-lucide="skip-forward"></i></button>
      </div>`;
    }

    bindStepper(prefix, state, total, rerender) {
      const go = i => { this.stop(); state.step = Math.max(0, Math.min(total - 1, i)); rerender(); };
      this.on(prefix + '-prev', 'click', () => go(state.step - 1));
      this.on(prefix + '-next', 'click', () => go(state.step + 1));
      this.on(prefix + '-reset', 'click', () => go(0));
      this.on(prefix + '-end', 'click', () => go(total - 1));
      this.on(prefix + '-play', 'click', () => this.togglePlay(state, total, rerender));
    }

    // =======================================================================
    // 1. MAP COLOURING
    // =======================================================================

    mapDef() {
      const m = this.map;
      if (m.problem === 'aus') return E.AUSTRALIA;
      if (!this._mapDef || this._mapDefKey !== m.problem + ':' + m.seed) {
        this._mapDef = E.randomMap(+m.problem.slice(4), m.seed);
        this._mapDefKey = m.problem + ':' + m.seed;
      }
      return this._mapDef;
    }

    ensureMapRun() {
      const m = this.map;
      const key = [m.problem, m.seed, m.colors, m.varOrder, m.valOrder, m.inference].join('|');
      if (m.key === key) return;
      const def = this.mapDef();
      const csp = E.makeMapCSP(def, m.colors);
      m.run = E.backtrackingSearch(csp, { varOrder: m.varOrder, valOrder: m.valOrder, inference: m.inference, maxSteps: 6000, maxChecks: 3e6 });
      m.full = m.run.aborted ? E.backtrackingSearch(csp, { varOrder: m.varOrder, valOrder: m.valOrder, inference: m.inference, trace: false, maxChecks: 3e6 }) : m.run;
      m.csp = csp;
      m.key = key;
      m.step = 0;
    }

    renderMap() {
      this.ensureMapRun();
      const m = this.map;
      const pane = this.$('csp-pane-map');
      const steps = m.run.steps;
      const i = Math.min(m.step, steps.length - 1);
      const s = steps[i];
      const def = this.mapDef();
      const colors = E.COLOR_LIST.slice(0, m.colors);
      const a = s.assignment;
      const doms = m.inference === 'none'
        ? Object.fromEntries(def.variables.map(v => [v, colors.filter(c => def.neighbors[v].every(u => a[u] !== c))]))
        : s.domains;
      const tint = {}, conflicts = [];
      if (s.kind === 'reject') { tint[s.var] = s.val; conflicts.push([s.var, s.conflictWith]); }
      let visual;
      if (m.problem === 'aus') {
        visual = R.mapSVG({ assignment: a, domains: doms, colors, highlight: s.var ? [s.var] : [], conflicts, tint, W: 400, H: 340 });
      } else {
        const sub = {};
        def.variables.forEach(v => { if (!a[v]) sub[v] = doms[v].length ? doms[v].map(c => c[0].toUpperCase()).join('') : '∅'; });
        visual = R.graphSVG({ vars: def.variables, neighbors: def.neighbors, pos: def.graph, assignment: Object.assign({}, a, tint), W: 560, H: 420, r: 14, highlight: s.var ? [s.var] : [], hlEdges: conflicts, sub });
      }
      const log = steps.slice(Math.max(0, i - 7), i + 1).map((x, k, arr) => `<div class="csp-log-row ${k === arr.length - 1 ? 'cur' : ''} k-${x.kind}" style="padding-left:${0.4 + Math.min(x.depth || 0, 12) * 0.45}rem">${x.msg}</div>`).join('');
      const pill = kindPill[s.kind] || ['neutral', s.kind];
      const opt = (arr, val) => arr.map(([k, l]) => `<option value="${k}" ${k === val ? 'selected' : ''}>${l}</option>`).join('');
      const full = m.full.stats;
      const verdict = m.full.solution ? '<span class="csp-pill ok">Solution found</span>' : m.full.aborted ? '<span class="csp-pill warn">Check limit reached</span>' : '<span class="csp-pill bad">No solution exists</span>';
      pane.innerHTML = `
        <div class="playground-grid csp-lab-grid">
          <div class="csp-lab-stage">
            <div class="csp-lab-stage-head">
              <span class="csp-ill-title">${m.problem === 'aus' ? 'Australia (AIMA Fig 6.1)' : `Random planar map — ${def.variables.length} regions, ${E.makeMapCSP(def, 3).edges().length} borders`}</span>
              <span class="csp-pill ${pill[0]}">${pill[1]}</span>
            </div>
            <div class="csp-lab-visual">${visual}</div>
            <div class="csp-lab-msg">${s.msg}</div>
            <div class="csp-log csp-lab-log">${log}</div>
          </div>
          <div class="playground-controls glass-panel csp-lab-controls">
            <div class="controls-group">
              <div class="control-label"><span>Problem</span></div>
              <div class="csp-lab-row">
                <select class="csp-select" id="csp-map-problem">${opt([['aus', 'Australia (7 regions)'], ['rand12', 'Random map — 12 regions'], ['rand20', 'Random map — 20 regions'], ['rand30', 'Random map — 30 regions']], m.problem)}</select>
                <button class="csp-btn" id="csp-map-newmap" ${m.problem === 'aus' ? 'disabled' : ''}><i data-lucide="shuffle"></i> New map</button>
              </div>
              <div class="csp-lab-row"><span class="csp-muted">Colours</span>
                <div class="csp-seg" id="csp-map-colors">${[2, 3, 4].map(k => `<button data-val="${k}" class="${k === m.colors ? 'active' : ''}">${k}</button>`).join('')}</div>
              </div>
            </div>
            <div class="controls-group">
              <div class="control-label"><span>Solver configuration</span></div>
              <select class="csp-select" id="csp-map-var">${opt([['static', 'Variable order: fixed (as listed)'], ['mrv', 'Variable order: MRV'], ['degree', 'Variable order: Degree'], ['mrv-degree', 'Variable order: MRV + Degree']], m.varOrder)}</select>
              <select class="csp-select" id="csp-map-val">${opt([['static', 'Value order: red, green, blue, …'], ['lcv', 'Value order: LCV']], m.valOrder)}</select>
              <select class="csp-select" id="csp-map-inf">${opt([['none', 'Inference: none'], ['fc', 'Inference: forward checking'], ['mac', 'Inference: MAC (AC-3)']], m.inference)}</select>
            </div>
            <div class="controls-group">
              <div class="control-label"><span>Step ${i + 1} of ${steps.length}${m.run.aborted ? '+' : ''}</span></div>
              ${this.stepperHTML('csp-map', i, steps.length)}
              <div class="control-label"><span>Speed</span></div>
              <input type="range" id="csp-map-speed" min="1" max="6" value="${m.speed}">
            </div>
            <div class="playground-stats">
              <div class="pg-stat-row"><span>Assignments (so far / total)</span><span class="pg-stat-val">${s.stats.assignments} / ${full.assignments}</span></div>
              <div class="pg-stat-row"><span>Backtracks</span><span class="pg-stat-val" style="color: var(--danger)">${s.stats.backtracks} / ${full.backtracks}</span></div>
              <div class="pg-stat-row"><span>Constraint checks</span><span class="pg-stat-val">${s.stats.checks.toLocaleString()} / ${full.checks.toLocaleString()}</span></div>
              <div class="pg-stat-row"><span>Values pruned by inference</span><span class="pg-stat-val">${s.stats.pruned} / ${full.pruned}</span></div>
              <div class="pg-stat-row"><span>Outcome</span>${verdict}</div>
            </div>
            <div class="teaching-tip"><i data-lucide="lightbulb"></i><span>Try the 20-region map with <strong>no heuristics</strong>, then switch on <strong>MRV + MAC</strong>: the same solution is found with a tiny fraction of the assignments. With 2 colours most maps have no solution — watch how quickly MAC proves it.</span></div>
          </div>
        </div>`;
      const rerender = () => { this.renderMap(); this.icons(); };
      const change = (k, v) => { this.stop(); m[k] = v; m.key = null; rerender(); };
      this.on('csp-map-problem', 'change', e => change('problem', e.target.value));
      this.on('csp-map-newmap', 'click', () => change('seed', m.seed + 1));
      this.$('csp-map-colors').querySelectorAll('button').forEach(b => b.addEventListener('click', () => change('colors', +b.getAttribute('data-val'))));
      this.on('csp-map-var', 'change', e => change('varOrder', e.target.value));
      this.on('csp-map-val', 'change', e => change('valOrder', e.target.value));
      this.on('csp-map-inf', 'change', e => change('inference', e.target.value));
      this.on('csp-map-speed', 'input', e => { m.speed = +e.target.value; if (this.timer) { this.stop(); this.togglePlay(m, steps.length, rerender); } });
      this.bindStepper('csp-map', m, steps.length, rerender);
      const logEl = pane.querySelector('.csp-lab-log');
      if (logEl) logEl.scrollTop = logEl.scrollHeight;
    }

    // =======================================================================
    // 2. COURSE SCHEDULING
    // =======================================================================

    renderSchedule() {
      const S = E.SCHEDULE;
      const st = this.sched;
      const pane = this.$('csp-pane-schedule');
      const tt = st.tt || {};
      const ev = E.evaluateSchedule(tt, st.soft);
      const hardCourses = new Set(); Object.values(ev.hard).forEach(list => list.forEach(x => x.courses.forEach(c => hardCourses.add(c))));
      const softCourses = new Set(); Object.entries(ev.soft).forEach(([k, list]) => { if (st.soft[k]) list.forEach(x => x.courses.forEach(c => softCourses.add(c))); });
      const cell = {};
      for (const c of S.courses) { const a = tt[c.id]; if (a) (cell[a.slot + '|' + a.room] = cell[a.slot + '|' + a.room] || []).push(c); }
      const selC = st.sel ? E.courseById(st.sel) : null;
      const head1 = S.days.map(d => `<th colspan="${S.periods.length}" class="csp-tt-day">${d}</th>`).join('');
      const head2 = S.days.map(() => S.periods.map(p => `<th class="csp-tt-p">${p}</th>`).join('')).join('');
      const rows = S.rooms.map(r => `<tr><th class="csp-tt-room">${r.name}<span>${r.cap} seats · ${r.type} · bldg ${r.bldg}</span></th>${Array.from({ length: S.nSlots }, (_, s) => {
        const here = cell[s + '|' + r.id] || [];
        let hint = '';
        if (selC) {
          const u = E.unaryOk(selC, s, r.id);
          hint = u.ok ? 'ok' : 'no';
        }
        const chips = here.map(c => `<button class="csp-tt-chip ${hardCourses.has(c.id) ? 'hard' : softCourses.has(c.id) ? 'soft' : ''} ${st.sel === c.id ? 'sel' : ''}" data-course="${c.id}" style="--co:${S.cohorts[c.cohort].color}" title="${c.name} · ${c.enroll} students · Dr. ${c.instr} · ${c.cohort}"><b>${c.id}</b><span>Dr. ${c.instr}</span></button>`).join('');
        return `<td class="csp-tt-cell ${hint ? 'hint-' + hint : ''} ${s % S.periods.length === S.periods.length - 1 ? 'day-end' : ''}" data-slot="${s}" data-room="${r.id}">${chips}</td>`;
      }).join('')}</tr>`).join('');
      const unscheduled = S.courses.filter(c => !tt[c.id]);
      const hardList = Object.entries(ev.hard).flatMap(([k, list]) => list.map(x => `<li class="hard"><b>${k}</b> ${x.msg}</li>`)).join('');
      const softList = Object.entries(ev.soft).filter(([k]) => st.soft[k]).flatMap(([k, list]) => list.map(x => `<li class="soft"><b>${k}</b> ${x.msg} <em>+${x.cost}</em></li>`)).join('');
      const hist = st.history;
      let chart = '';
      if (hist.length > 1) {
        const W = 360, H = 70, mx = Math.max(...hist, 1);
        const pts = hist.map((v, k) => `${(8 + k / (hist.length - 1) * (W - 16)).toFixed(1)},${(H - 8 - v / mx * (H - 20)).toFixed(1)}`).join(' ');
        chart = `<svg viewBox="0 0 ${W} ${H}" class="csp-chart-svg"><polyline points="${pts}" class="csp-chart-line"></polyline><text x="8" y="12" class="csp-axis-t">soft cost ${hist[0]} → ${hist[hist.length - 1]}</text></svg>`;
      }
      pane.innerHTML = `
        <div class="csp-sched-grid">
          <div class="csp-lab-stage">
            <div class="csp-lab-stage-head">
              <span class="csp-ill-title">Weekly timetable — ${S.courses.length} courses · ${S.rooms.length} rooms · ${S.nSlots} slots</span>
              <span class="csp-legend">${Object.entries(S.cohorts).map(([k, c]) => `<span><i class="csp-lg" style="background:${c.color}"></i> ${c.label}</span>`).join('')}</span>
            </div>
            <div class="csp-tt-wrap"><table class="csp-tt"><thead><tr><th></th>${head1}</tr><tr><th></th>${head2}</tr></thead><tbody>${rows}</tbody></table></div>
            <div class="csp-lab-msg">${selC ? `<b>${selC.id}</b> selected (${selC.enroll} students, ${selC.type}, Dr. ${selC.instr}, unavailable ${S.instructors[selC.instr].unavailLabel}). Green cells pass the unary constraints H2 + H4 — click one to move it there.` : st.log}</div>
            ${unscheduled.length ? `<div class="csp-status-row"><span class="csp-pill warn">Unscheduled</span>${unscheduled.map(c => `<button class="csp-tt-chip" data-course="${c.id}" style="--co:${S.cohorts[c.cohort].color}"><b>${c.id}</b><span>Dr. ${c.instr}</span></button>`).join('')}</div>` : ''}
          </div>
          <div class="playground-controls glass-panel csp-lab-controls">
            <div class="controls-group">
              <div class="control-label"><span>Solver</span></div>
              <button class="csp-btn csp-btn-primary csp-btn-wide" id="csp-sch-solve"><i data-lucide="cpu"></i> Solve hard constraints (BT + MRV + FC)</button>
              <button class="csp-btn csp-btn-wide" id="csp-sch-opt" ${st.tt && !ev.hardCount ? '' : 'disabled'}><i data-lucide="trending-down"></i> Optimise soft constraints (local search)</button>
              <div class="csp-lab-row">
                <button class="csp-btn" id="csp-sch-random"><i data-lucide="shuffle"></i> Random timetable</button>
                <button class="csp-btn" id="csp-sch-clear"><i data-lucide="eraser"></i> Clear</button>
              </div>
            </div>
            <div class="csp-metric-row">
              <div class="csp-metric ${ev.hardCount ? 'bad' : 'ok'}"><span>Hard violations</span><b>${ev.hardCount}</b></div>
              <div class="csp-metric warn"><span>Soft penalty</span><b>${ev.softCost}</b></div>
            </div>
            <div class="controls-group">
              <div class="control-label"><span>Soft constraints (weight)</span></div>
              <div class="csp-soft-toggles">${Object.entries(S.softInfo).map(([k, l]) => `<label><input type="checkbox" data-soft="${k}" ${st.soft[k] ? 'checked' : ''}> <b>${k}</b> ${l} <em>w=${S.weights[k]} · ${ev.softBy[k]}</em></label>`).join('')}</div>
            </div>
            ${chart ? `<div class="csp-card">${chart}</div>` : ''}
            <div class="csp-viol-wrap">
              <ul class="csp-viol-list">${hardList || (st.tt && !unscheduled.length ? '<li class="ok">All hard constraints H1–H6 satisfied — the timetable is feasible.</li>' : '')}${softList}</ul>
            </div>
            ${st.btStats ? `<div class="csp-muted">Last solve: ${st.btStats.assignments} assignments, ${st.btStats.backtracks} backtracks, ${st.btStats.checks.toLocaleString()} constraint checks, ${st.btStats.pruned} values pruned by forward checking.</div>` : ''}
          </div>
        </div>`;
      const rerender = () => { this.renderSchedule(); this.icons(); };
      pane.querySelectorAll('.csp-tt-chip').forEach(ch => ch.addEventListener('click', e => {
        e.stopPropagation();
        const id = ch.getAttribute('data-course');
        st.sel = st.sel === id ? null : id;
        rerender();
      }));
      pane.querySelectorAll('.csp-tt-cell').forEach(td => td.addEventListener('click', () => {
        if (!st.sel) return;
        st.tt = st.tt || {};
        const slot = +td.getAttribute('data-slot'), room = td.getAttribute('data-room');
        const old = st.tt[st.sel];
        st.tt[st.sel] = { slot, room };
        const ev2 = E.evaluateSchedule(st.tt, st.soft);
        st.log = `Moved ${st.sel}${old ? ` from ${E.slotLabel(old.slot)} ${old.room}` : ''} to ${E.slotLabel(slot)} ${room}: ${ev2.hardCount} hard violation${ev2.hardCount === 1 ? '' : 's'}, soft penalty ${ev2.softCost}.`;
        st.history.push(ev2.softCost);
        st.sel = null;
        rerender();
      }));
      this.on('csp-sch-solve', 'click', () => {
        const r = E.solveSchedule({ enabledSoft: st.soft, optimize: false, seed: 11 + Math.floor(Math.random() * 1000) });
        if (!r.feasible) { st.log = 'Backtracking proved there is no feasible timetable.'; rerender(); return; }
        st.tt = r.timetable; st.sel = null;
        st.btStats = r.bt.stats;
        const c = E.evaluateSchedule(st.tt, st.soft).softCost;
        st.history = [c];
        st.log = `Feasible timetable found: ${r.bt.stats.assignments} assignments, ${r.bt.stats.backtracks} backtracks. Node consistency first removed every (slot, room) value that violates H2 or H4. Soft penalty ${c} — now optimise it.`;
        rerender();
      });
      this.on('csp-sch-opt', 'click', () => {
        const before = E.evaluateSchedule(st.tt, st.soft).softCost;
        const improved = this.localSearchSchedule(st);
        st.log = `Local search made ${improved} improving move${improved === 1 ? '' : 's'} while keeping H1–H6 satisfied: soft penalty ${before} → ${E.evaluateSchedule(st.tt, st.soft).softCost}.`;
        rerender();
      });
      this.on('csp-sch-random', 'click', () => {
        const tt2 = {};
        for (const c of S.courses) tt2[c.id] = { slot: Math.floor(Math.random() * S.nSlots), room: S.rooms[Math.floor(Math.random() * S.rooms.length)].id };
        st.tt = tt2; st.sel = null; st.btStats = null;
        st.history = [E.evaluateSchedule(tt2, st.soft).softCost];
        st.log = 'A random complete assignment — typically riddled with hard violations (red). Fix them by hand or press Solve.';
        rerender();
      });
      this.on('csp-sch-clear', 'click', () => { st.tt = null; st.sel = null; st.history = []; st.btStats = null; st.log = 'Cleared. Every course is unscheduled (H6 violated).'; rerender(); });
      pane.querySelectorAll('[data-soft]').forEach(cb => cb.addEventListener('change', () => { st.soft[cb.getAttribute('data-soft')] = cb.checked; rerender(); }));
    }

    /** Best-improvement local search on the soft cost, preserving hard feasibility. */
    localSearchSchedule(st) {
      const S = E.SCHEDULE;
      const csp = E.makeScheduleCSP(true);
      let improved = 0;
      let cur = E.evaluateSchedule(st.tt, st.soft).softCost;
      for (let sweep = 0; sweep < 30; sweep++) {
        let any = false;
        for (const v of csp.variables) {
          let best = null, bestCost = cur;
          const old = st.tt[v];
          for (const val of csp.domains[v]) {
            const p = E.parseVal(val);
            let ok = true;
            for (const u of csp.variables) {
              if (u === v) continue;
              if (!csp.constraint(v, val, u, E.schedVal(st.tt[u].slot, st.tt[u].room))) { ok = false; break; }
            }
            if (!ok) continue;
            st.tt[v] = p;
            const c = E.evaluateSchedule(st.tt, st.soft).softCost;
            if (c < bestCost) { bestCost = c; best = p; }
          }
          st.tt[v] = best || old;
          if (best) { cur = bestCost; improved++; any = true; st.history.push(cur); }
        }
        if (!any || cur === 0) break;
      }
      return improved;
    }

    // =======================================================================
    // 3. N-QUEENS MIN-CONFLICTS
    // =======================================================================

    ensureQueens() {
      const q = this.q;
      const key = [q.n, q.seed, q.init].join('|');
      if (q.key === key) return;
      q.run = E.queensMinConflicts(q.n, { seed: q.seed, randomInit: q.init === 'random', maxSteps: 5000, maxTrace: 5001 });
      q.key = key; q.step = 0;
      const t0 = performance.now();
      const bt = E.backtrackingSearch(E.makeQueensCSP(q.n), { varOrder: 'static', inference: 'none', trace: false, maxChecks: 4e6 });
      const t1 = performance.now();
      const bt2 = E.backtrackingSearch(E.makeQueensCSP(q.n), { varOrder: 'mrv', inference: 'fc', trace: false, maxChecks: 4e6 });
      q.bt = { plain: bt.stats.assignments, plainAborted: bt.aborted, plainMs: t1 - t0, fc: bt2.stats.assignments, fcAborted: bt2.aborted };
    }

    renderQueens() {
      this.ensureQueens();
      const q = this.q;
      const pane = this.$('csp-pane-queens');
      const steps = q.run.steps;
      const i = Math.min(q.step, steps.length - 1);
      const s = steps[i];
      const n = q.n;
      const size = 460, cs = size / n;
      let svg = `<svg viewBox="0 0 ${size} ${size}" class="csp-board-svg">`;
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) svg += `<rect x="${c * cs}" y="${r * cs}" width="${cs}" height="${cs}" class="${(r + c) % 2 ? 'csp-sq-d' : 'csp-sq-l'} ${s.kind === 'move' && c === s.col ? 'csp-sq-col' : ''}"></rect>`;
      if (s.kind === 'move' && n <= 16) {
        const mn = Math.min(...s.counts);
        s.counts.forEach((k, r) => { if (r !== s.to) svg += `<text x="${s.col * cs + cs / 2}" y="${r * cs + cs / 2 + 4}" class="csp-q-count ${k === mn ? 'min' : ''}" style="font-size:${Math.max(8, cs * 0.34)}px">${k}</text>`; });
        if (s.from !== s.to) svg += `<circle cx="${s.col * cs + cs / 2}" cy="${s.from * cs + cs / 2}" r="${cs * 0.28}" class="csp-q-ghost"></circle>`;
      }
      s.rows.forEach((r, c) => {
        const att = E.queenConflicts(s.rows, c, r) > 0;
        svg += `<g class="csp-queen ${att ? 'att' : ''}"><circle cx="${c * cs + cs / 2}" cy="${r * cs + cs / 2}" r="${cs * 0.34}"></circle>${n <= 24 ? `<text x="${c * cs + cs / 2}" y="${r * cs + cs / 2 + cs * 0.13}" style="font-size:${cs * 0.42}px">♛</text>` : ''}</g>`;
      });
      svg += '</svg>';
      const vals = steps.map(x => x.total);
      const W = 360, H = 90, mx = Math.max(...vals, 1);
      const X = k => 6 + k / Math.max(1, vals.length - 1) * (W - 12);
      const Y = v => H - 10 - v / mx * (H - 22);
      const pts = vals.map((v, k) => `${X(k).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
      const chart = `<svg viewBox="0 0 ${W} ${H}" class="csp-chart-svg"><polyline points="${pts}" class="csp-chart-line"></polyline><line x1="${X(i)}" x2="${X(i)}" y1="6" y2="${H - 6}" stroke="#f59e0b" stroke-width="1.5"></line><text x="8" y="12" class="csp-axis-t">attacking pairs vs. step</text></svg>`;
      const pill = kindPill[s.kind] || ['neutral', s.kind];
      pane.innerHTML = `
        <div class="playground-grid csp-lab-grid">
          <div class="csp-lab-stage">
            <div class="csp-lab-stage-head"><span class="csp-ill-title">${n}-Queens — one queen per column (variables = columns, values = rows)</span><span class="csp-pill ${pill[0]}">${pill[1]}</span></div>
            <div class="csp-board-wrap csp-board-lg">${svg}</div>
            <div class="csp-lab-msg">${s.msg}</div>
          </div>
          <div class="playground-controls glass-panel csp-lab-controls">
            <div class="controls-group">
              <div class="control-label"><span>Board size n</span><span class="slider-val">${n}</span></div>
              <input type="range" id="csp-q-n" min="4" max="48" value="${n}">
              <div class="csp-lab-row"><span class="csp-muted">Start</span>
                <div class="csp-seg" id="csp-q-init"><button data-val="random" class="${q.init === 'random' ? 'active' : ''}">Random</button><button data-val="greedy" class="${q.init === 'greedy' ? 'active' : ''}">Greedy</button></div>
                <button class="csp-btn" id="csp-q-new"><i data-lucide="shuffle"></i> New run</button>
              </div>
            </div>
            <div class="controls-group">
              <div class="control-label"><span>Step ${i} of ${steps.length - 1}</span></div>
              ${this.stepperHTML('csp-q', i, steps.length)}
              <div class="control-label"><span>Speed</span></div>
              <input type="range" id="csp-q-speed" min="1" max="6" value="${q.speed}">
            </div>
            <div class="csp-card">${chart}</div>
            <div class="playground-stats">
              <div class="pg-stat-row"><span>Attacking pairs now</span><span class="pg-stat-val" style="color:${s.total ? 'var(--danger)' : 'var(--success)'}">${s.total}</span></div>
              <div class="pg-stat-row"><span>Min-conflicts steps to solve</span><span class="pg-stat-val">${q.run.solved ? q.run.iterations : 'not solved (5000)'}</span></div>
              <div class="pg-stat-row"><span>Plain backtracking assignments</span><span class="pg-stat-val">${q.bt.plain.toLocaleString()}${q.bt.plainAborted ? '+ (limit)' : ''}</span></div>
              <div class="pg-stat-row"><span>Backtracking + MRV + FC assignments</span><span class="pg-stat-val">${q.bt.fc.toLocaleString()}${q.bt.fcAborted ? '+ (limit)' : ''}</span></div>
            </div>
            <div class="teaching-tip"><i data-lucide="lightbulb"></i><span>Increase n: plain backtracking's cost explodes, while min-conflicts still needs only a few dozen repair steps — its run-time is roughly independent of n.</span></div>
          </div>
        </div>`;
      const rerender = () => { this.renderQueens(); this.icons(); };
      this.on('csp-q-n', 'change', e => { this.stop(); q.n = +e.target.value; q.key = null; rerender(); });
      this.on('csp-q-new', 'click', () => { this.stop(); q.seed++; q.key = null; rerender(); });
      this.$('csp-q-init').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { this.stop(); q.init = b.getAttribute('data-val'); q.key = null; rerender(); }));
      this.on('csp-q-speed', 'input', e => { q.speed = +e.target.value; if (this.timer) { this.stop(); this.togglePlay(q, steps.length, rerender); } });
      this.bindStepper('csp-q', q, steps.length, rerender);
    }

    // =======================================================================
    // 4. SUDOKU
    // =======================================================================

    sudokuCSP() {
      const p = E.SUDOKU_PRESETS[this.sud.preset];
      return { p, csp: E.makeSudokuCSP(p.puzzle, p.size) };
    }

    renderSudoku() {
      const st = this.sud;
      const { p, csp } = this.sudokuCSP();
      if (!st.domains) { st.domains = E.copyDomains(csp.domains); st.msg = `${p.label}: ${p.puzzle.replace(/[.0]/g, '').length} givens. Each blank cell starts with the full domain {1 … ${p.size}}.`; st.stats = null; st.trace = null; }
      let doms = st.domains, assign = {};
      if (st.trace) {
        const s = st.trace.steps[Math.min(st.step, st.trace.steps.length - 1)];
        doms = s.domains; assign = s.assignment;
      }
      const n = p.size;
      const cells = csp.variables.map((v, idx) => {
        const d = doms[v];
        const given = p.puzzle[idx] !== '.' && p.puzzle[idx] !== '0';
        const guessed = assign[v] != null && !given;
        const inner = d.length === 1 ? `<span class="csp-sud-val">${d[0]}</span>` : d.length === 0 ? '<span class="csp-bad-txt">∅</span>' : `<div class="csp-sud-cands">${Array.from({ length: n }, (_, k) => `<span class="${d.includes(k + 1) ? '' : 'off'}">${k + 1}</span>`).join('')}</div>`;
        return `<div class="csp-sud-cell ${given ? 'given' : ''} ${d.length === 1 && !given ? (guessed ? 'guess' : 'solved') : ''} ${this.sudBorder(idx, n)}">${inner}</div>`;
      }).join('');
      const fixed = csp.variables.filter(v => doms[v].length === 1).length;
      const cands = csp.variables.reduce((s, v) => s + doms[v].length, 0);
      const opt = Object.entries(E.SUDOKU_PRESETS).map(([k, v]) => `<option value="${k}" ${k === st.preset ? 'selected' : ''}>${v.label}</option>`).join('');
      const tr = st.trace;
      const pane = this.$('csp-pane-sudoku');
      pane.innerHTML = `
        <div class="playground-grid csp-lab-grid">
          <div class="csp-lab-stage">
            <div class="csp-lab-stage-head"><span class="csp-ill-title">Sudoku as a CSP — ${n * n} variables, ${n === 9 ? 27 : 12} Alldiff constraints</span><span class="csp-pill info">${fixed} / ${n * n} cells fixed</span></div>
            <div class="csp-sud-wrap"><div class="csp-sudoku csp-sudoku-${n}">${cells}</div>
              <div class="csp-sud-legend"><span><i class="given"></i> given</span><span><i class="cur"></i> fixed by propagation</span><span><i style="background:rgba(139,92,246,0.25)"></i> assigned by search</span></div></div>
            <div class="csp-lab-msg">${tr ? tr.steps[Math.min(st.step, tr.steps.length - 1)].msg.replace(/r(\d)c(\d)/g, (m, a, b) => `(${+a + 1},${+b + 1})`) : st.msg}</div>
          </div>
          <div class="playground-controls glass-panel csp-lab-controls">
            <div class="controls-group">
              <div class="control-label"><span>Puzzle</span></div>
              <select class="csp-select" id="csp-sud-preset">${opt}</select>
            </div>
            <div class="controls-group">
              <div class="control-label"><span>Inference &amp; search</span></div>
              <button class="csp-btn csp-btn-wide" id="csp-sud-ac3"><i data-lucide="filter"></i> Propagate with AC-3</button>
              <button class="csp-btn csp-btn-primary csp-btn-wide" id="csp-sud-mac"><i data-lucide="cpu"></i> Solve: MAC + MRV (animated)</button>
              <button class="csp-btn csp-btn-wide" id="csp-sud-bt"><i data-lucide="zap"></i> Solve instantly: plain backtracking vs MAC</button>
              <button class="csp-btn" id="csp-sud-reset"><i data-lucide="rotate-ccw"></i> Reset puzzle</button>
            </div>
            ${tr ? `<div class="controls-group"><div class="control-label"><span>Search step ${Math.min(st.step, tr.steps.length - 1) + 1} of ${tr.steps.length}${tr.aborted ? '+' : ''}</span></div>${this.stepperHTML('csp-sud', Math.min(st.step, tr.steps.length - 1), tr.steps.length)}</div>` : ''}
            <div class="playground-stats">
              <div class="pg-stat-row"><span>Remaining candidate values</span><span class="pg-stat-val">${cands}</span></div>
              ${st.stats ? Object.entries(st.stats).map(([k, v]) => `<div class="pg-stat-row"><span>${k}</span><span class="pg-stat-val">${v}</span></div>`).join('') : ''}
            </div>
            <div class="teaching-tip"><i data-lucide="lightbulb"></i><span>The <strong>Easy</strong> puzzle is solved by AC-3 alone. <strong>Hard</strong> and <strong>Extreme</strong> leave many candidates after AC-3, so MAC must search — yet it still needs only hundreds of assignments where plain backtracking needs vastly more.</span></div>
          </div>
        </div>`;
      const rerender = () => { this.renderSudoku(); this.icons(); };
      this.on('csp-sud-preset', 'change', e => { this.stop(); st.preset = e.target.value; st.domains = null; rerender(); });
      this.on('csp-sud-reset', 'click', () => { this.stop(); st.domains = null; rerender(); });
      this.on('csp-sud-ac3', 'click', () => {
        this.stop();
        const d = E.copyDomains(st.trace ? doms : st.domains);
        const before = csp.variables.reduce((s, v) => s + d[v].length, 0);
        const r = E.ac3(csp, d);
        st.domains = d; st.trace = null;
        const fixed2 = csp.variables.filter(v => d[v].length === 1).length;
        st.msg = r.consistent ? `AC-3 removed ${before - csp.variables.reduce((s, v) => s + d[v].length, 0)} candidate values using ${r.checks.toLocaleString()} constraint checks. ${fixed2 === n * n ? 'Every cell is now fixed — solved without any search!' : `${fixed2} cells fixed; ${n * n - fixed2} still need search.`}` : 'AC-3 found an empty domain — the puzzle is inconsistent.';
        st.stats = { 'AC-3 constraint checks': r.checks.toLocaleString(), 'Values pruned': r.prunedCount };
        rerender();
      });
      this.on('csp-sud-mac', 'click', () => {
        this.stop();
        const c2 = E.makeSudokuCSP(p.puzzle, p.size);
        c2.domains = E.copyDomains(st.domains);
        const r = E.backtrackingSearch(c2, { varOrder: 'mrv', inference: 'mac', trace: true, maxSteps: 2500 });
        const full = r.aborted ? E.backtrackingSearch(c2, { varOrder: 'mrv', inference: 'mac', trace: false }) : r;
        st.trace = r; st.step = 0; st.speed = 5;
        st.stats = { 'MAC assignments': full.stats.assignments, 'Backtracks': full.stats.backtracks, 'Constraint checks': full.stats.checks.toLocaleString(), 'Time': full.timeMs.toFixed(1) + ' ms' };
        if (r.aborted) st.stats['Note'] = 'replay shows the first 2,500 steps';
        rerender();
        this.togglePlay(st, r.steps.length, rerender);
      });
      this.on('csp-sud-bt', 'click', () => {
        this.stop();
        const run = cfg => { const c2 = E.makeSudokuCSP(p.puzzle, p.size); return E.backtrackingSearch(c2, Object.assign({ trace: false, maxChecks: 1.5e6 }, cfg)); };
        const plain = run({ varOrder: 'static', inference: 'none' });
        const mac = run({ varOrder: 'mrv', inference: 'mac' });
        const sol = mac.solution || plain.solution;
        if (sol) { st.domains = Object.fromEntries(csp.variables.map(v => [v, [sol[v]]])); }
        st.trace = null;
        st.msg = `Plain backtracking: ${plain.solution ? 'solved' : 'gave up'} after ${plain.stats.assignments.toLocaleString()} assignments${plain.aborted ? ' (1,500,000-check limit)' : ''}. MAC + MRV: ${mac.stats.assignments.toLocaleString()} assignments.`;
        st.stats = { 'Plain BT assignments': plain.stats.assignments.toLocaleString() + (plain.aborted ? '+' : ''), 'Plain BT time': plain.timeMs.toFixed(0) + ' ms', 'MAC + MRV assignments': mac.stats.assignments.toLocaleString(), 'MAC + MRV time': mac.timeMs.toFixed(0) + ' ms' };
        rerender();
      });
      if (tr) this.bindStepper('csp-sud', st, tr.steps.length, rerender);
    }

    sudBorder(i, n) {
      const b = Math.round(Math.sqrt(n));
      const r = Math.floor(i / n), c = i % n;
      const cls = [];
      if (c % b === b - 1 && c !== n - 1) cls.push('br');
      if (r % b === b - 1 && r !== n - 1) cls.push('bb');
      return cls.join(' ');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('view-csp');
    if (root) window.cspLab = new CSPLab(root);
  });
})();
