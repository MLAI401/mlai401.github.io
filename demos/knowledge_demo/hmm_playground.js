/**
 * hmm_playground.js — Topic 05 · Probabilistic Reasoning over Time (AIMA Ch. 14)
 * Part of MLAI401 playground.html#view-knowledge → sub-tab "HMM Temporal Reasoning".
 *
 * A free-form sandbox (the step-by-step teaching version lives in hmm_lab.js on
 * knowledge.html). Uses window.HMMEngine (hmm_engine.js) for the forward step and
 * adds smoothing (forward–backward) and AIMA-style Viterbi on top.
 *
 *   Filtering   f_t = α P(e_t | X_t) Σ_x P(X_t | x) f_{t-1}(x)
 *   Prediction  P(X_{t+k} | e_{1:t}) = Σ_x P(X_{t+k} | x) P(x | e_{1:t})
 *   Smoothing   P(X_k | e_{1:t}) = α f_{1:k} × b_{k+1:t}
 *               b_{k+1:t}(x) = Σ_x' P(e_{k+1} | x') b_{k+2:t}(x') P(x' | x)
 *   Viterbi     m_1 = f_1 ;  m_t(x_t) = P(e_t | x_t) max_x P(x_t | x) m_{t-1}(x)
 *
 * Renders into #kl-hmm-pane. No other dependencies (lucide icons optional).
 */
(function () {
  'use strict';

  const SUBD = '₀₁₂₃₄₅₆₇₈₉';
  const sb = n => String(n).split('').map(d => SUBD[+d] || d).join('');
  const f3 = x => (Number.isFinite(x) ? x.toFixed(3) : '—');
  const fx = x => {
    if (!Number.isFinite(x)) return '—';
    if (x !== 0 && Math.abs(x) < 0.001) return x.toExponential(1);
    return x.toFixed(3).replace(/^0\./, '.');
  };
  const vec = v => '⟨' + v.map(f3).join(', ') + '⟩';
  const norm = v => { const s = v.reduce((a, b) => a + b, 0); return s > 0 ? v.map(x => x / s) : v.map(() => 1 / v.length); };
  const MAX_T = 12, MAX_K = 8;
  const STATE_COLORS = ['#4f46e5', '#0891b2', '#db2777', '#d97706'];

  // ---------------------------------------------------------------------------
  // Models
  // ---------------------------------------------------------------------------
  const MODELS = [
    {
      id: 'umbrella', name: 'Umbrella World (AIMA Fig. 14.2)',
      xVar: 'R', eVar: 'U',
      states: ['Rain', '¬Rain'], stShort: ['r', '¬r'],
      obs: ['Umbrella', 'No umbrella'], obShort: ['u', '¬u'],
      prior: [0.5, 0.5],
      T: [[0.7, 0.3], [0.3, 0.7]],
      O: [[0.9, 0.1], [0.2, 0.8]],
      ev: [0, 0, 1, 0, 0],
      blurb: 'An underground guard sees only whether the director carries an <b>umbrella</b> and must infer whether it is <b>raining</b>. Default evidence u₁:₅ = T, T, F, T, T is AIMA Fig. 14.5.'
    },
    {
      id: 'student', name: 'Sleepy Student',
      xVar: 'S', eVar: 'E',
      states: ['Enough sleep', '¬Enough sleep'], stShort: ['s', '¬s'],
      obs: ['Red eyes', 'No red eyes'], obShort: ['e', '¬e'],
      prior: [0.7, 0.3],
      T: [[0.8, 0.2], [0.3, 0.7]],
      O: [[0.2, 0.8], [0.7, 0.3]],
      ev: [0, 0, 1],
      blurb: 'A professor sees only whether a student has <b>red eyes</b> and must infer whether they got <b>enough sleep</b>. Sleep habits persist from night to night.'
    },
    {
      id: 'hallway', name: 'Robot Hallway (4-cell localization)',
      xVar: 'L', eVar: 'Z',
      states: ['Cell 1', 'Cell 2', 'Cell 3', 'Cell 4'], stShort: ['c1', 'c2', 'c3', 'c4'],
      obs: ['Wall', 'Open'], obShort: ['wall', 'open'],
      prior: [0.25, 0.25, 0.25, 0.25],
      T: [[0.2, 0.8, 0, 0], [0.1, 0.1, 0.8, 0], [0, 0.1, 0.1, 0.8], [0, 0, 0.2, 0.8]],
      O: [[0.9, 0.1], [0.15, 0.85], [0.15, 0.85], [0.9, 0.1]],
      ev: [0, 1, 1, 0],
      blurb: 'A robot drives right along a corridor. End cells have walls (sensor says <b>Wall</b>), middle cells are <b>Open</b>. Where is it now — and where was it?'
    }
  ];

  const TASKS = [
    { id: 'filter', label: 'Filtering', icon: 'filter', q: t => `P(X${sb(t)} | e${sb(1)}:${sb(t)})` },
    { id: 'predict', label: 'Prediction', icon: 'trending-up', q: t => `P(X${sb(t)}₊ₖ | e${sb(1)}:${sb(t)})` },
    { id: 'smooth', label: 'Smoothing', icon: 'rewind', q: t => `P(Xₖ | e${sb(1)}:${sb(t)})` },
    { id: 'viterbi', label: 'Viterbi', icon: 'route', q: t => `argmax P(x${sb(1)}:${sb(t)} | e${sb(1)}:${sb(t)})` }
  ];

  const clone = m => JSON.parse(JSON.stringify(m));

  // ---------------------------------------------------------------------------
  // Inference
  // ---------------------------------------------------------------------------
  function makeEngineModel(m) {
    const E = window.HMMEngine;
    if (E && E.HiddenMarkovModel) return new E.HiddenMarkovModel(m.states, m.obs, m.T, m.O, m.prior);
    return null;
  }

  function forward(m, ev) {
    const eng = makeEngineModel(m);
    const n = m.states.length;
    const f = [m.prior.slice()], pred = [null], Z = [null];
    for (let t = 1; t <= ev.length; t++) {
      let pr, up;
      if (eng) {
        const st = eng.forwardStep(f[t - 1], ev[t - 1]);
        pr = st.predicted; up = st.updated;
      } else {
        pr = Array.from({ length: n }, (_, j) => f[t - 1].reduce((a, p, i) => a + p * m.T[i][j], 0));
        up = norm(pr.map((p, j) => p * m.O[j][ev[t - 1]]));
      }
      pred.push(pr); f.push(up);
      Z.push(pr.reduce((a, p, j) => a + p * m.O[j][ev[t - 1]], 0));
    }
    const logLik = Z.slice(1).reduce((a, z) => a + Math.log(z), 0);
    return { f, pred, Z, logLik };
  }

  function predictAhead(m, belief, k) {
    const out = [];
    let b = belief.slice();
    for (let s = 1; s <= k; s++) {
      b = b.map((_, j) => b.reduce((a, p, i) => a + p * m.T[i][j], 0));
      out.push(b);
    }
    return out;
  }

  function stationary(m) {
    let b = m.prior.map(() => 1 / m.prior.length);
    for (let i = 0; i < 500; i++) b = b.map((_, j) => b.reduce((a, p, k) => a + p * m.T[k][j], 0));
    return b;
  }

  function smooth(m, ev, f) {
    const n = m.states.length, Tn = ev.length;
    const b = new Array(Tn + 1);
    b[Tn] = Array(n).fill(1);
    for (let k = Tn - 1; k >= 0; k--) {
      const e = ev[k];
      b[k] = norm(Array.from({ length: n }, (_, i) =>
        b[k + 1].reduce((a, bj, j) => a + m.T[i][j] * m.O[j][e] * bj, 0)));
    }
    const s = f.map((fk, k) => norm(fk.map((p, i) => p * b[k][i])));
    return { b, s };
  }

  function viterbi(m, ev, f) {
    const n = m.states.length, Tn = ev.length;
    if (!Tn) return { mm: [], bp: [], path: [] };
    const mm = [null, f[1].slice()], bp = [null, null];
    for (let t = 2; t <= Tn; t++) {
      const row = [], back = [];
      for (let j = 0; j < n; j++) {
        let best = -1, arg = 0;
        for (let i = 0; i < n; i++) { const v = m.T[i][j] * mm[t - 1][i]; if (v > best) { best = v; arg = i; } }
        row.push(m.O[j][ev[t - 1]] * best); back.push(arg);
      }
      mm.push(row); bp.push(back);
    }
    const path = new Array(Tn + 1).fill(null);
    let last = 0;
    mm[Tn].forEach((v, i) => { if (v > mm[Tn][last]) last = i; });
    path[Tn] = last;
    for (let t = Tn; t >= 2; t--) path[t - 1] = bp[t][path[t]];
    return { mm, bp, path };
  }

  function sampleSequence(m, len) {
    const draw = p => { let r = Math.random(), i = 0; for (; i < p.length - 1; i++) { r -= p[i]; if (r < 0) return i; } return i; };
    let x = draw(m.prior);
    const xs = [x], es = [];
    for (let t = 1; t <= len; t++) { x = draw(m.T[x]); xs.push(x); es.push(draw(m.O[x])); }
    return { xs, es };
  }

  // ---------------------------------------------------------------------------
  // Controller
  // ---------------------------------------------------------------------------
  function initHMMPlayground() {
    const pane = document.getElementById('kl-hmm-pane');
    if (!pane || pane.dataset.ready) return;
    pane.dataset.ready = '1';

    const st = {
      mi: 0,
      models: MODELS.map(clone),
      ev: MODELS.map(m => m.ev.slice()),
      truth: MODELS.map(() => null),
      task: 'filter',
      k: 3,
      sel: null,           // selected time slice
      showTruth: true,
      showParams: false
    };
    const M = () => st.models[st.mi];
    const EV = () => st.ev[st.mi];

    function compute() {
      const m = M(), ev = EV();
      const fw = forward(m, ev);
      const Tn = ev.length;
      const res = { m, ev, Tn, fw };
      if (st.task === 'predict') res.ahead = predictAhead(m, fw.f[Tn], st.k);
      if (st.task === 'smooth') res.sm = smooth(m, ev, fw.f);
      if (st.task === 'viterbi') res.vit = viterbi(m, ev, fw.f);
      res.stat = stationary(m);
      return res;
    }

    // ----- value displayed for slice t (null = not defined) -----
    function sliceDist(r, t) {
      if (st.task === 'smooth') return r.sm.s[t];
      if (st.task === 'viterbi') return t >= 1 ? norm(r.vit.mm[t]) : null;
      if (t <= r.Tn) return r.fw.f[t];
      return r.ahead ? r.ahead[t - r.Tn - 1] : null;
    }

    // ---------------------------------------------------------------- DBN SVG
    function renderDBN(r) {
      const { m, Tn } = r;
      const extra = st.task === 'predict' ? st.k : 0;
      const cols = Tn + 1 + extra;
      const DX = 84, X0 = 48, YX = 92, YE = 214, R = 23;
      const W = Math.max(600, X0 * 2 + (cols - 1) * DX);
      const cx = t => X0 + t * DX;
      const two = m.states.length === 2;

      const arrow = (x1, y1, x2, y2, opts = {}) => {
        const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
        const a = { x: x1 + ux * (R + 1), y: y1 + uy * (R + 1) }, b = { x: x2 - ux * (R + 3), y: y2 - uy * (R + 3) };
        return `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}"
          stroke="${opts.color || '#475569'}" stroke-width="${opts.w || 2}" stroke-linecap="round"
          ${opts.dash ? 'stroke-dasharray="5 4"' : ''} marker-end="url(#hp-arr${opts.marker || ''})"><title>${opts.title || ''}</title></line>`;
      };

      let edges = '', nodes = '';
      for (let t = 0; t < cols; t++) {
        const future = t > Tn;
        const x = cx(t);
        if (t > 0) edges += arrow(cx(t - 1), YX, x, YX, { dash: future, title: `${m.xVar}${sb(t - 1)} → ${m.xVar}${sb(t)}  (transition model)`, color: st.sel === t ? '#4f46e5' : undefined, marker: st.sel === t ? '-on' : '' });
        if (t > 0 && !future) edges += arrow(x, YX, x, YE, { title: `${m.xVar}${sb(t)} → ${m.eVar}${sb(t)}  (sensor model)`, color: st.sel === t ? '#4f46e5' : undefined, marker: st.sel === t ? '-on' : '' });

        // hidden-state node
        const d = sliceDist(r, t);
        let label = '?', sub = '', fill = '#eef2ff', txt = '#312e81';
        if (st.task === 'viterbi' && t >= 1) {
          const s = r.vit.path[t];
          label = m.stShort[s]; sub = 'path';
          fill = STATE_COLORS[s]; txt = '#fff';
        } else if (d) {
          if (two) {
            label = fx(d[0]); sub = `P(${m.stShort[0]})`;
            const a = d[0];
            fill = `rgba(79,70,229,${(0.08 + 0.82 * a).toFixed(3)})`; txt = a > 0.55 ? '#fff' : '#312e81';
          } else {
            let am = 0; d.forEach((v, i) => { if (v > d[am]) am = i; });
            label = m.stShort[am]; sub = fx(d[am]);
            fill = STATE_COLORS[am]; txt = '#fff';
          }
        } else if (t === 0) { label = 'prior'; }
        const selRing = st.sel === t ? `<circle cx="${x}" cy="${YX}" r="${R + 6}" fill="none" stroke="#4f46e5" stroke-width="2" stroke-dasharray="3 3"/>` : '';
        const truth = st.showTruth && st.truth[st.mi] && t <= Tn
          ? `<text x="${x}" y="${YX - R - 12}" font-size="10" text-anchor="middle" fill="#b45309" font-weight="700">true: ${m.stShort[st.truth[st.mi].xs[t]]}</text>` : '';
        nodes += `
          <g class="hp-node" data-t="${t}" style="cursor:pointer">
            ${selRing}
            <circle cx="${x}" cy="${YX}" r="${R}" fill="${fill}" stroke="#4f46e5" stroke-width="2" ${future ? 'stroke-dasharray="4 3"' : ''}/>
            <text x="${x}" y="${YX + 1}" font-size="11" font-weight="800" text-anchor="middle" fill="${txt}">${label}</text>
            <text x="${x}" y="${YX + 12}" font-size="7.5" text-anchor="middle" fill="${txt}" opacity="0.85">${sub}</text>
            <text x="${x}" y="${YX + R + 15}" font-size="11" font-weight="700" text-anchor="middle" fill="#334155" stroke="#fff" stroke-width="3" paint-order="stroke">${m.xVar}${sb(t)}</text>
            ${truth}
          </g>`;

        // evidence node
        if (t > 0 && !future) {
          const e = r.ev[t - 1];
          nodes += `
            <g class="hp-ev" data-t="${t}" style="cursor:pointer">
              <title>Click to change e${sb(t)}</title>
              <rect x="${x - R}" y="${YE - R}" width="${2 * R}" height="${2 * R}" rx="10" fill="${e === 0 ? '#334155' : '#cbd5e1'}" stroke="#334155" stroke-width="2"/>
              <text x="${x}" y="${YE + 4}" font-size="${m.obShort[e].length > 2 ? 10 : 12}" font-weight="800" text-anchor="middle" fill="${e === 0 ? '#fff' : '#0f172a'}">${m.obShort[e]}</text>
              <text x="${x}" y="${YE + R + 15}" font-size="11" font-weight="700" text-anchor="middle" fill="#334155">${m.eVar}${sb(t)}</text>
            </g>`;
        }
      }
      // add-evidence ghost slot
      if (Tn < MAX_T && st.task !== 'predict') {
        const x = cx(Tn + 1);
        nodes += `<g class="hp-add" style="cursor:pointer"><title>Add a time step</title>
          <rect x="${x - R}" y="${YE - R}" width="${2 * R}" height="${2 * R}" rx="10" fill="none" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4 3"/>
          <text x="${x}" y="${YE + 6}" font-size="18" text-anchor="middle" fill="#94a3b8">+</text></g>`;
      }
      const W2 = st.task !== 'predict' && Tn < MAX_T ? Math.max(W, X0 * 2 + (Tn + 1) * DX) : W;

      return `
        <svg class="hp-dbn" viewBox="0 0 ${W2} 262" style="width:100%; max-width:${Math.round(W2 * 1.1)}px; min-width:${Math.min(W2, 640)}px; height:auto; display:block">
          <defs>
            <marker id="hp-arr" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="11" markerHeight="11" markerUnits="userSpaceOnUse" orient="auto"><path d="M1 1.5 L11 6 L1 10.5 L3.5 6 z" fill="#475569"/></marker>
            <marker id="hp-arr-on" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="11" markerHeight="11" markerUnits="userSpaceOnUse" orient="auto"><path d="M1 1.5 L11 6 L1 10.5 L3.5 6 z" fill="#4f46e5"/></marker>
          </defs>
          <text x="8" y="${YX + 4}" font-size="9" fill="#64748b" transform="rotate(-90 8 ${YX})" text-anchor="middle">hidden</text>
          <text x="8" y="${YE + 4}" font-size="9" fill="#64748b" transform="rotate(-90 8 ${YE})" text-anchor="middle">evidence</text>
          ${edges}${nodes}
        </svg>`;
    }

    // ---------------------------------------------------------- belief grid
    function renderGrid(r) {
      const { m, Tn } = r;
      const n = m.states.length;
      const extra = st.task === 'predict' ? st.k : 0;
      const t0 = st.task === 'viterbi' ? 1 : 0;
      const ts = []; for (let t = t0; t <= Tn + extra; t++) ts.push(t);
      if (!ts.length) return `<div class="hp-empty">Add evidence to run Viterbi.</div>`;
      const CW = 78, RH = 32, LW = 104, TH = 24, PADX = 12;
      const W = LW + ts.length * CW + 8, H = TH + n * RH + 8;
      const cxs = i => LW + i * CW + CW / 2;
      const cy = s => TH + s * RH + RH / 2;
      let cells = '', links = '';

      ts.forEach((t, i) => {
        const future = t > Tn;
        const vals = st.task === 'viterbi' ? r.vit.mm[t] : sliceDist(r, t);
        const shade = st.task === 'viterbi' ? norm(vals) : vals;
        for (let s = 0; s < n; s++) {
          const onPath = st.task === 'viterbi' && r.vit.path[t] === s;
          const isTrue = st.showTruth && st.truth[st.mi] && t <= Tn && st.truth[st.mi].xs[t] === s;
          const a = shade[s];
          cells += `<g class="hp-cell" data-t="${t}" style="cursor:pointer">
            <rect x="${LW + i * CW + PADX}" y="${TH + s * RH + 3}" width="${CW - 2 * PADX}" height="${RH - 6}" rx="6"
              fill="${onPath ? STATE_COLORS[s] : `rgba(79,70,229,${(0.04 + 0.6 * a).toFixed(3)})`}"
              stroke="${isTrue ? '#d97706' : (st.sel === t ? '#4f46e5' : 'rgba(15,23,42,0.08)')}" stroke-width="${isTrue || st.sel === t ? 2 : 1}"
              ${future ? 'stroke-dasharray="4 3"' : ''} ${isTrue ? 'stroke-dasharray="3 2"' : ''}/>
            <text x="${cxs(i)}" y="${cy(s) + 4}" font-size="10.5" font-weight="700" text-anchor="middle" fill="${onPath || a > 0.6 ? '#fff' : '#1e1b4b'}">${fx(vals[s])}</text>
            ${st.task === 'smooth' && t <= Tn ? `<title>filtered ${fx(r.fw.f[t][s])} → smoothed ${fx(vals[s])}</title>` : ''}
          </g>`;
          // Viterbi back-pointers
          if (st.task === 'viterbi' && t >= 2) {
            const p = r.vit.bp[t][s];
            const bold = onPath && r.vit.path[t - 1] === p;
            const x1 = cxs(i - 1) + CW / 2 - PADX + 1, x2 = cxs(i) - CW / 2 + PADX - 2;
            links += `<line x1="${x1}" y1="${cy(p)}" x2="${x2}" y2="${cy(s)}" stroke="${bold ? '#0f172a' : '#94a3b8'}" stroke-width="${bold ? 2.4 : 1.1}" marker-end="url(#hp-g${bold ? 'b' : ''})" ${bold ? '' : 'opacity="0.8"'}/>`;
          }
        }
        const head = t === 0 ? 't = 0' : (future ? `+${t - Tn}` : `t = ${t}`);
        cells += `<text x="${cxs(i)}" y="15" font-size="10" font-weight="700" text-anchor="middle" fill="${future ? '#94a3b8' : '#475569'}">${head}</text>`;
      });
      let rowLabels = '';
      for (let s = 0; s < n; s++) {
        rowLabels += `<circle cx="10" cy="${cy(s)}" r="4.5" fill="${STATE_COLORS[s]}"/><text x="20" y="${cy(s) + 4}" font-size="11" fill="#334155" font-weight="600">${m.states[s]}</text>`;
      }
      return `
        <svg viewBox="0 0 ${W} ${H}" style="width:100%; max-width:${W}px; min-width:${Math.min(W, 640)}px; height:auto; display:block">
          <defs>
            <marker id="hp-g" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 1 L10 5 L0 9 z" fill="#94a3b8"/></marker>
            <marker id="hp-gb" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 1 L10 5 L0 9 z" fill="#0f172a"/></marker>
          </defs>
          ${rowLabels}${links}${cells}
        </svg>`;
    }

    // ------------------------------------------------------- derivation text
    function renderDerivation(r) {
      const { m, Tn, fw } = r;
      let t = st.sel;
      const maxT = Tn + (st.task === 'predict' ? st.k : 0);
      if (t == null || t > maxT) t = st.task === 'predict' ? maxT : Tn;
      if (st.task === 'viterbi' && t < 1) t = Math.min(1, Tn);
      const X = m.xVar, Ev = m.eVar;
      const eStr = k => `${m.eVar}${sb(k)}=${m.obShort[r.ev[k - 1]]}`;
      const line = (a, b) => `<div class="hp-eq"><span class="hp-eq-l">${a}</span><span class="hp-eq-r">${b}</span></div>`;

      if (t === 0 && st.task !== 'smooth') {
        return `<div class="hp-dv-h">Slice t = 0</div>${line(`P(${X}₀)`, vec(m.prior))}<div class="hp-note">The prior. No evidence has been observed yet.</div>`;
      }
      if (Tn === 0 && st.task !== 'predict') return `<div class="hp-note">Add an observation to start.</div>`;

      if (st.task === 'filter' || (st.task === 'predict' && t <= Tn)) {
        const O = m.O.map(row => row[r.ev[t - 1]]);
        return `<div class="hp-dv-h">Forward step at t = ${t} &nbsp;·&nbsp; ${eStr(t)}</div>
          ${line(`1 · Predict &nbsp;P(${X}${sb(t)} | e${sb(1)}:${sb(t - 1)}) = Σ P(${X}${sb(t)}|x) f${sb(t - 1)}(x)`, vec(fw.pred[t]))}
          ${line(`2 · Weight &nbsp;P(${Ev}${sb(t)}=${m.obShort[r.ev[t - 1]]} | ${X}${sb(t)})`, vec(O))}
          ${line(`&nbsp;&nbsp;&nbsp;&nbsp;product (unnormalized)`, vec(fw.pred[t].map((p, i) => p * O[i])))}
          ${line(`3 · Normalize &nbsp;α = 1 / ${f3(fw.Z[t])}`, `<b>f${sb(t)} = ${vec(fw.f[t])}</b>`)}
          <div class="hp-note">The prediction carries yesterday's belief forward through the transition model; the sensor model then reweights it by how likely today's evidence is under each state.</div>`;
      }
      if (st.task === 'predict') {
        const k = t - Tn, d = r.ahead[k - 1];
        return `<div class="hp-dv-h">Prediction ${k} step${k > 1 ? 's' : ''} ahead (t = ${Tn}+${k})</div>
          ${line(`P(${X}${sb(Tn)}₊${sb(k)} | e${sb(1)}:${sb(Tn)}) = Σ P(${X}${sb(Tn)}₊${sb(k)}|x) P(x | e${sb(1)}:${sb(Tn)})`, `<b>${vec(d)}</b>`)}
          ${line('Stationary distribution of the chain', vec(r.stat))}
          <div class="hp-note">No new evidence arrives, so only the transition model is applied. The prediction drifts toward the stationary distribution — the further ahead, the less the past evidence matters.</div>`;
      }
      if (st.task === 'smooth') {
        const b = r.sm.b[t];
        return `<div class="hp-dv-h">Smoothing at k = ${t} given e${sb(1)}:${sb(Tn)}</div>
          ${line(`forward &nbsp;f${sb(1)}:${sb(t)}`, vec(fw.f[t]))}
          ${line(`backward &nbsp;b${sb(t + 1)}:${sb(Tn)} (scaled)`, t === Tn ? vec(b) + ' (no future evidence)' : vec(b))}
          ${line(`α f × b`, `<b>${vec(r.sm.s[t])}</b>`)}
          <div class="hp-note">Hindsight: evidence after day ${t} is folded in by the backward message. Hover a grid cell to compare the filtered and smoothed values.</div>`;
      }
      // viterbi
      const V = r.vit;
      if (t === 1) {
        return `<div class="hp-dv-h">Viterbi initialization (t = 1)</div>
          ${line(`m${sb(1)} = f${sb(1)} = P(${X}${sb(1)} | ${eStr(1)})`, `<b>${vec(V.mm[1])}</b>`)}
          <div class="hp-note">Most-likely path to each state at t = 1 is just the filtered belief (AIMA Fig. 14.5).</div>`;
      }
      const rows = m.states.map((s, j) => {
        const cands = m.states.map((_, i) => m.T[i][j] * V.mm[t - 1][i]);
        const bi = V.bp[t][j];
        return `<tr><td><span class="hp-dot" style="background:${STATE_COLORS[j]}"></span>${m.stShort[j]}</td>
          <td>${cands.map((c, i) => `<span class="${i === bi ? 'hp-best' : ''}">${fx(c)}</span>`).join(' , ')}</td>
          <td>× ${fx(m.O[j][r.ev[t - 1]])}</td><td><b>${fx(V.mm[t][j])}</b></td><td>← ${m.stShort[bi]}</td></tr>`;
      }).join('');
      return `<div class="hp-dv-h">Viterbi step t = ${t} &nbsp;·&nbsp; ${eStr(t)}</div>
        <div class="hp-note" style="margin-bottom:.4rem">m${sb(t)}(x) = P(e${sb(t)}|x) · max<sub>x'</sub> P(x|x') m${sb(t - 1)}(x')</div>
        <table class="hp-vt"><thead><tr><th>x</th><th>P(x|x')·m${sb(t - 1)}(x') for each x'</th><th>sensor</th><th>m${sb(t)}</th><th>back</th></tr></thead><tbody>${rows}</tbody></table>
        <div class="hp-note">The bold back-pointer chain in the grid is the most likely sequence: ${V.path.slice(1).map(s => m.stShort[s]).join(' → ')}.</div>`;
    }

    // ------------------------------------------------------------- controls
    function paramTable(title, rowsLabel, colLabels, mat, key) {
      return `<div class="hp-ptab">
        <div class="hp-ptab-h">${title}</div>
        <table><thead><tr><th></th>${colLabels.map(c => `<th>${c}</th>`).join('')}</tr></thead>
        <tbody>${mat.map((row, i) => `<tr><th>${rowsLabel[i]}</th>${row.map((v, j) =>
          `<td><input type="number" min="0" max="1" step="0.05" value="${+v.toFixed(3)}" data-key="${key}" data-i="${i}" data-j="${j}"></td>`).join('')}</tr>`).join('')}</tbody></table>
      </div>`;
    }

    function renderControls(r) {
      const m = M(), ev = EV();
      const taskBtns = TASKS.map(t => `<button class="hp-seg ${st.task === t.id ? 'on' : ''}" data-task="${t.id}"><i data-lucide="${t.icon}"></i>${t.label}</button>`).join('');
      const chips = ev.map((e, i) => `<button class="hp-chip ${e === 0 ? 'dark' : ''}" data-chip="${i}" title="Click to change">${sb(i + 1)}&nbsp;${m.obShort[e]}</button>`).join('') || '<span class="hp-muted">none yet</span>';
      const addBtns = m.obs.map((o, i) => `<button class="btn-ctrl hp-sm" data-add="${i}" ${ev.length >= MAX_T ? 'disabled' : ''}>+ ${o}</button>`).join('');
      const Tn = ev.length;
      const last = r.fw.f[Tn];
      let am = 0; last.forEach((v, i) => { if (v > last[am]) am = i; });

      return `
        <div class="controls-group">
          <h3>HMM Temporal Reasoning</h3>
          <div>
            <label class="hp-lbl">Model</label>
            <select id="hp-model" class="hp-select">${MODELS.map((mm, i) => `<option value="${i}" ${i === st.mi ? 'selected' : ''}>${mm.name}</option>`).join('')}</select>
            <p class="hp-blurb">${m.blurb}</p>
          </div>
          <div>
            <label class="hp-lbl">Inference task</label>
            <div class="hp-segs">${taskBtns}</div>
          </div>
          ${st.task === 'predict' ? `
          <div>
            <div class="control-label" style="font-size:.75rem"><span>Look-ahead k</span><span class="slider-val">${st.k}</span></div>
            <input type="range" id="hp-k" min="1" max="${MAX_K}" value="${st.k}" style="width:100%">
          </div>` : ''}
          <div>
            <label class="hp-lbl">Evidence sequence e${sb(1)}:${sb(Tn || 1)} <span class="hp-muted">(${Tn}/${MAX_T})</span></label>
            <div class="hp-chips">${chips}</div>
            <div class="hp-row">${addBtns}</div>
            <div class="hp-row">
              <button class="btn-ctrl hp-sm" id="hp-undo" ${Tn ? '' : 'disabled'}><i data-lucide="undo-2"></i>Undo</button>
              <button class="btn-ctrl hp-sm" id="hp-clear" ${Tn ? '' : 'disabled'}><i data-lucide="trash-2"></i>Clear</button>
              <button class="btn-ctrl hp-sm" id="hp-sample" title="Simulate the HMM: draw hidden states and evidence"><i data-lucide="dices"></i>Sample</button>
            </div>
            ${st.truth[st.mi] ? `<label class="hp-check"><input type="checkbox" id="hp-truth" ${st.showTruth ? 'checked' : ''}> Show sampled hidden truth <span class="hp-truth-key"></span></label>` : ''}
          </div>
          <div>
            <button class="hp-toggle" id="hp-ptoggle"><i data-lucide="${st.showParams ? 'chevron-down' : 'chevron-right'}"></i>Model parameters (editable)</button>
            ${st.showParams ? `
              <div class="hp-params">
                ${paramTable(`Prior P(${m.xVar}₀)`, [''], m.stShort, [m.prior], 'prior')}
                ${paramTable(`Transition P(${m.xVar}ₜ | ${m.xVar}ₜ₋₁) — rows: from`, m.stShort, m.stShort, m.T, 'T')}
                ${paramTable(`Sensor P(${m.eVar}ₜ | ${m.xVar}ₜ)`, m.stShort, m.obShort, m.O, 'O')}
                <div class="hp-muted" style="font-size:.72rem">Rows are renormalized to sum to 1 after each edit.</div>
                <button class="btn-ctrl hp-sm" id="hp-preset"><i data-lucide="rotate-ccw"></i>Restore defaults</button>
              </div>` : ''}
          </div>
        </div>
        <div class="playground-stats">
          <div class="pg-stat-row"><span>Evidence likelihood P(e${sb(1)}:${sb(Tn || 1)})</span><span class="pg-stat-val">${Tn ? fx(Math.exp(r.fw.logLik)) : '—'}</span></div>
          <div class="pg-stat-row"><span>Most likely ${m.xVar}${sb(Tn)} (filtered)</span><span class="pg-stat-val">${m.states[am]} · ${(last[am] * 100).toFixed(1)}%</span></div>
          <div class="pg-stat-row"><span>Stationary distribution</span><span class="pg-stat-val">${vec(r.stat)}</span></div>
          ${st.task === 'viterbi' && Tn ? `<div class="pg-stat-row"><span>Viterbi path</span><span class="pg-stat-val">${r.vit.path.slice(1).map(s => m.stShort[s]).join(' ')}</span></div>` : ''}
        </div>`;
    }

    // ---------------------------------------------------------------- render
    function render() {
      const r = compute();
      const task = TASKS.find(t => t.id === st.task);
      const m = M();
      pane.innerHTML = `
        <div class="playground-grid hp-grid">
          <div class="canvas-container glass-panel hp-canvas">
            <div class="hp-head">
              <div>
                <div class="hp-title">${m.name.split(' (')[0]} · ${task.label}</div>
                <div class="hp-sub">Query: <code>${task.q(r.Tn).replace(/X/g, m.xVar).replace(/e(?=[\u2080-\u2089])/g, m.eVar.toLowerCase())}</code></div>
              </div>
              <div class="hp-legend">
                <span><i class="hp-lg-c"></i>hidden ${m.xVar}ₜ</span>
                <span><i class="hp-lg-r"></i>observed ${m.eVar}ₜ</span>
                ${st.task === 'predict' ? '<span><i class="hp-lg-d"></i>future</span>' : ''}
              </div>
            </div>
            <div class="hp-sec-h">Unrolled dynamic Bayesian network <span class="hp-muted">— click a hidden node for its derivation, an evidence box to change it</span></div>
            <div class="hp-scroll">${renderDBN(r)}</div>
            <div class="hp-sec-h">${st.task === 'viterbi' ? 'Viterbi trellis  m<sub>t</sub>(x) with back-pointers' : st.task === 'smooth' ? 'Smoothed beliefs P(Xₖ | e₁:ₜ)' : st.task === 'predict' ? 'Filtered beliefs, then predictions (dashed)' : 'Filtered beliefs P(Xₜ | e₁:ₜ)'}</div>
            <div class="hp-scroll">${renderGrid(r)}</div>
            <div class="hp-deriv">${renderDerivation(r)}</div>
          </div>
          <div class="playground-controls glass-panel hp-controls">${renderControls(r)}</div>
        </div>`;
      bind();
      if (window.lucide) window.lucide.createIcons();
    }

    function setEv(fn) { fn(EV()); st.truth[st.mi] = null; render(); }

    function bind() {
      const q = s => pane.querySelector(s);
      const qa = s => pane.querySelectorAll(s);
      q('#hp-model').addEventListener('change', e => { st.mi = +e.target.value; st.sel = null; render(); });
      qa('[data-task]').forEach(b => b.addEventListener('click', () => { st.task = b.dataset.task; st.sel = null; render(); }));
      const k = q('#hp-k'); if (k) k.addEventListener('input', e => { st.k = +e.target.value; render(); });
      qa('[data-add]').forEach(b => b.addEventListener('click', () => setEv(ev => { if (ev.length < MAX_T) ev.push(+b.dataset.add); })));
      qa('[data-chip]').forEach(b => b.addEventListener('click', () => setEv(ev => { const i = +b.dataset.chip; ev[i] = (ev[i] + 1) % M().obs.length; })));
      q('#hp-undo').addEventListener('click', () => setEv(ev => { ev.pop(); }));
      q('#hp-clear').addEventListener('click', () => setEv(ev => { ev.length = 0; st.sel = null; }));
      q('#hp-sample').addEventListener('click', () => {
        const s = sampleSequence(M(), 6 + Math.floor(Math.random() * 3));
        st.ev[st.mi] = s.es; st.truth[st.mi] = s; st.showTruth = true; st.sel = null; render();
      });
      const tr = q('#hp-truth'); if (tr) tr.addEventListener('change', e => { st.showTruth = e.target.checked; render(); });
      q('#hp-ptoggle').addEventListener('click', () => { st.showParams = !st.showParams; render(); });
      const ps = q('#hp-preset'); if (ps) ps.addEventListener('click', () => { st.models[st.mi] = clone(MODELS[st.mi]); render(); });
      qa('.hp-params input').forEach(inp => inp.addEventListener('change', () => {
        const m = M(), key = inp.dataset.key, i = +inp.dataset.i, j = +inp.dataset.j;
        let v = Math.min(1, Math.max(0, parseFloat(inp.value) || 0));
        const row = key === 'prior' ? m.prior : m[key][i];
        if (row.length === 2) { row[j] = v; row[1 - j] = 1 - v; }
        else {
          const rest = row.reduce((a, x, c) => a + (c === j ? 0 : x), 0);
          row.forEach((x, c) => { row[c] = c === j ? v : (rest > 0 ? x / rest * (1 - v) : (1 - v) / (row.length - 1)); });
        }
        render();
      }));
      qa('.hp-node, .hp-cell').forEach(g => g.addEventListener('click', () => { const t = +g.dataset.t; st.sel = st.sel === t ? null : t; render(); }));
      qa('.hp-ev').forEach(g => g.addEventListener('click', () => setEv(ev => { const i = +g.dataset.t - 1; ev[i] = (ev[i] + 1) % M().obs.length; })));
      const add = q('.hp-add'); if (add) add.addEventListener('click', () => setEv(ev => { ev.push(0); }));
    }

    render();
  }

  window.HMMPlayground = { init: initHMMPlayground };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initHMMPlayground);
  else initHMMPlayground();
})();
