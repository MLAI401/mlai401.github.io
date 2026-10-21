/**
 * hmm_lab.js — Topic 05 · Temporal HMMs · interactive "HMM Construction",
 * "Filtering & Prediction" and "Viterbi: Most Likely Sequence" concepts
 * (knowledge.html). Same teaching format as bn_lab.js (Bayesian Networks).
 *
 * Two binary-state HMMs (AIMA Ch. 14, "Probabilistic Reasoning over Time"):
 *   - Umbrella World:   Rain_t (hidden) → Umbrella_t (observed)
 *   - Sleepy Student:   EnoughSleep_t (hidden) → RedEyes_t (observed)
 *
 * Model (stationary, first-order Markov):
 *   prior       P(X₀)
 *   transition  P(X_t | X_{t-1})      2 rows
 *   sensor      P(E_t | X_t)          2 rows
 *
 * Construction: unroll the DBN slice by slice, explaining the Markov,
 * sensor-Markov and stationarity assumptions; click a node to edit its CPT.
 *
 * Filtering: FORWARD algorithm one step at a time (predict, then update):
 *   P(X_t | e_{1:t-1}) = Σ_x P(X_t | x) f_{t-1}(x)
 *   f_t = α P(e_t | X_t) P(X_t | e_{1:t-1})
 * plus k-step prediction with no evidence.
 *
 * Viterbi: m_t(x_t) = P(e_t | x_t) max_{x_{t-1}} P(x_t | x_{t-1}) m_{t-1}(x_{t-1}),
 * with m_1 = f_1 as in AIMA Fig. 14.5, then backtrack.
 *
 * Values on the graph stay hidden ("?") until the step that computes them;
 * bars animate from the previous value and changed nodes pulse.
 *
 * Public API: window.HMMLab = { renderConstruction(col), renderFiltering(col),
 *                               renderViterbi(col), forward, viterbi }
 */
(function () {
  'use strict';

  const T = true, F = false;
  const SUBD = '₀₁₂₃₄₅₆₇₈₉';
  const sb = n => String(n).split('').map(d => SUBD[+d] || d).join('');
  const f3 = x => (Number.isFinite(x) ? x.toFixed(3) : '—');
  const f4 = x => (Number.isFinite(x) ? x.toFixed(4) : '—');
  const pct = x => {
    if (!Number.isFinite(x)) return '—';
    const v = x * 100;
    if (v !== 0 && Math.abs(v) < 1) return v.toFixed(2) + '%';
    return v.toFixed(1) + '%';
  };
  const tf = b => (b ? 'T' : 'F');
  const icons = () => { if (window.lucide) window.lucide.createIcons(); };
  const MAXD = 5;

  // ---------------------------------------------------------------------------
  // Examples
  // ---------------------------------------------------------------------------
  const EXAMPLES = [
    {
      id: 'umbrella', name: 'Umbrella World', icon: 'umbrella',
      X: { name: 'Rain', a: 'R', yes: 'rain', no: '¬rain' },
      E: { name: 'Umbrella', a: 'U', yes: 'umbrella', no: 'no umbrella' },
      title: 'Is it raining outside today?',
      story: 'A security guard works underground and never sees the sky. Each morning the director arrives <b>with or without an umbrella</b>. Rain tends to persist from one day to the next, and the director usually — but not always — carries an umbrella when it rains.',
      short: 'An underground guard only sees whether the director brings an <b>umbrella</b>, and must infer whether it is <b>raining</b>.',
      params: { p0: 0.5, t1: 0.7, t0: 0.3, s1: 0.9, s0: 0.2 },
      filterEv: [T, T], viterbiEv: [T, T, F, T, T],
      tryFilter: 'Try: add a day with no umbrella, or predict 3 days ahead and watch the belief drift to 50%.',
      tryViterbi: 'AIMA Fig. 14.5 uses u₁:₅ = T, T, F, T, T. Try flipping day 3 to T.'
    },
    {
      id: 'student', name: 'Sleepy Student', icon: 'moon',
      X: { name: 'EnoughSleep', a: 'S', yes: 'slept', no: '¬slept' },
      E: { name: 'RedEyes', a: 'E', yes: 'red eyes', no: 'no red eyes' },
      title: 'Is the student getting enough sleep?',
      story: 'A professor wants to know whether a student gets <b>enough sleep</b> each night. She cannot ask, but she sees each day whether the student has <b>red eyes</b>. Sleep habits persist from night to night, and red eyes are much more common after a short night.',
      short: 'A professor only sees whether a student has <b>red eyes</b>, and must infer whether they got <b>enough sleep</b>.',
      params: { p0: 0.7, t1: 0.8, t0: 0.3, s1: 0.2, s0: 0.7 },
      filterEv: [T, T, F], viterbiEv: [T, T, F, F],
      tryFilter: 'Try: three red-eye days in a row, or raise P(RedEyes | ¬EnoughSleep) in the sensor CPT.',
      tryViterbi: 'Try: alternate T and F and see whether the most likely sequence follows every observation.'
    }
  ];

  // Shared, editable model per example
  const params = EXAMPLES.map(ex => Object.assign({}, ex.params));
  let exIdx = 0;
  let mode = 'build';   // 'build' | 'filter' | 'viterbi'
  const build = EXAMPLES.map(() => ({ step: 0, part: null }));
  const filt = EXAMPLES.map(ex => ({ ev: ex.filterEv.slice(), k: 0, steps: 0, view: 'chart', part: 'transition', lastBar: null, lastSub: null, lastStep: -1 }));
  const vit = EXAMPLES.map(ex => ({ ev: ex.viterbiEv.slice(), steps: 0, view: 'table', part: 'transition', lastSub: null, lastStep: -1 }));
  let ctrlHost = null, vizHost = null;

  const ex = () => EXAMPLES[exIdx];
  const P = () => params[exIdx];

  // ---------------------------------------------------------------------------
  // Maths (index 0 = state true, 1 = state false)
  // ---------------------------------------------------------------------------
  const trans = (p, i, j) => (i === 0 ? (j === 0 ? p.t1 : 1 - p.t1) : (j === 0 ? p.t0 : 1 - p.t0));
  const lik = (p, e) => (e ? [p.s1, p.s0] : [1 - p.s1, 1 - p.s0]);
  const predict = (p, f) => [trans(p, 0, 0) * f[0] + trans(p, 1, 0) * f[1], trans(p, 0, 1) * f[0] + trans(p, 1, 1) * f[1]];

  function forward(p, ev, k) {
    const Tn = ev.length;
    const f = [[p.p0, 1 - p.p0]], pred = [null], ops = [{ type: 'init', t: 0 }];
    const un = [null], Z = [null];
    for (let t = 1; t <= Tn; t++) {
      const pr = predict(p, f[t - 1]);
      pred[t] = pr;
      ops.push({ type: 'predict', t });
      const l = lik(p, ev[t - 1]);
      const u = [l[0] * pr[0], l[1] * pr[1]];
      const z = u[0] + u[1];
      un[t] = u; Z[t] = z;
      f[t] = z > 0 ? [u[0] / z, u[1] / z] : [NaN, NaN];
      ops.push({ type: 'update', t });
    }
    for (let j = 1; j <= k; j++) {
      const t = Tn + j;
      pred[t] = predict(p, t - 1 === Tn ? f[Tn] : pred[t - 1]);
      f[t] = null;
      ops.push({ type: 'future', t });
    }
    ops.push({ type: 'summary' });
    const pi = p.t0 / (1 - p.t1 + p.t0);
    return { f, pred, un, Z, ops, Tn, k, pi };
  }

  function viterbi(p, ev) {
    const Tn = ev.length;
    const fw = forward(p, ev, 0);
    const m = [], bp = [], cand = [];
    m[1] = fw.f[1].slice();
    bp[1] = [null, null];
    for (let t = 2; t <= Tn; t++) {
      const l = lik(p, ev[t - 1]);
      m[t] = [0, 0]; bp[t] = [0, 0]; cand[t] = [];
      for (let j = 0; j < 2; j++) {
        const c = [trans(p, 0, j) * m[t - 1][0], trans(p, 1, j) * m[t - 1][1]];
        const b = c[0] >= c[1] ? 0 : 1;
        cand[t][j] = c;
        bp[t][j] = b;
        m[t][j] = l[j] * c[b];
      }
    }
    const path = [];
    path[Tn] = m[Tn][0] >= m[Tn][1] ? 0 : 1;
    for (let t = Tn; t >= 2; t--) path[t - 1] = bp[t][path[t]];
    return { m, bp, cand, path, Tn, fw };
  }

  // ---------------------------------------------------------------------------
  // Labels
  // ---------------------------------------------------------------------------
  const Xs = (t) => `${ex().X.a}${sb(t)}`;                 // R₁
  const Es = (t) => `${ex().E.a}${sb(t)}`;                 // U₁
  const xl = (t, v) => `${v ? '' : '¬'}${ex().X.a.toLowerCase()}${t == null ? '' : sb(t)}`;   // r₁ / ¬r₁
  const el = (t, v) => `${v ? '' : '¬'}${ex().E.a.toLowerCase()}${sb(t)}`;                   // u₁ / ¬u₁
  const e1t = t => (t >= 1 ? `${ex().E.a.toLowerCase()}${sb(1)}:${sb(t)}` : '');            // u₁:₂
  const stateName = v => (v === 0 ? ex().X.name : '¬' + ex().X.name);

  // ---------------------------------------------------------------------------
  // SVG helpers (reuse the .kbn-* node / edge styles of the BN lab)
  // ---------------------------------------------------------------------------
  function clipBox(cx, cy, hw, hh, dx, dy) {
    const t = Math.min(hw / Math.abs(dx || 1e-9), hh / Math.abs(dy || 1e-9));
    return [cx + dx * t, cy + dy * t];
  }
  const scale = v => Math.max(0.004, Math.min(1, v));

  function nodeSvg(n) {
    const { x, y, w, h } = n;
    const bw = w - 14, bx = x - w / 2 + 7, by = y + h / 2 - 6;
    const hasBar = n.bar != null && Number.isFinite(n.bar);
    return `
      <g class="kbn-node ${n.cls || ''} ${n.ghost ? 'ghost' : ''} ${n.changed ? 'changed' : ''}" ${n.data ? `data-node="${n.data}" tabindex="0" role="button"` : ''} aria-label="${n.aria || n.name}">
        ${n.selected ? `<rect class="kbn-ring" x="${x - w / 2 - 4}" y="${y - h / 2 - 4}" width="${w + 8}" height="${h + 8}" rx="11"/>` : ''}
        <rect class="kbn-box" x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="8"/>
        <text class="kbn-name" x="${x}" y="${n.sub ? y - 3 : y + 4}">${n.name}</text>
        ${n.sub ? `<text class="kbn-sub" x="${x}" y="${y + 11}">${n.sub}</text>` : ''}
        ${hasBar ? `<rect class="kbn-bar-bg" x="${bx}" y="${by}" width="${bw}" height="3" rx="1.5"/><rect class="kbn-bar" x="${bx}" y="${by}" width="${bw}" height="3" rx="1.5" style="transform: scaleX(${scale(n.prev != null && Number.isFinite(n.prev) ? n.prev : n.bar)})" data-to="${scale(n.bar)}"/>` : ''}
        ${n.badge ? `<g class="kbn-badge ${n.badge === 'T' ? 't' : 'f'}"><circle cx="${x + w / 2 - 3}" cy="${y - h / 2 + 2}" r="8.5"/><text x="${x + w / 2 - 3}" y="${y - h / 2 + 5.5}">${n.badge}</text></g>` : ''}
      </g>`;
  }

  function edgeSvg(a, b, cls) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const p = clipBox(a.x, a.y, a.w / 2, a.h / 2, dx, dy);
    const q = clipBox(b.x, b.y, b.w / 2, b.h / 2, -dx, -dy);
    const mk = cls === 'hi' ? 'khm-arr-hi' : cls === 'new' ? 'khm-arr-new' : cls === 'path' ? 'khm-arr-path' : 'khm-arr';
    return `<line class="kbn-edge ${cls || ''}" x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" marker-end="url(#${mk})"/>`;
  }

  function svgWrap(w, h, body, label, extra) {
    return `
      <svg viewBox="0 0 ${w} ${h}" class="khm-dag" role="img" aria-label="${label}">
        <defs>
          <marker id="khm-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#94a3b8"/></marker>
          <marker id="khm-arr-hi" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#8b5cf6"/></marker>
          <marker id="khm-arr-new" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#f59e0b"/></marker>
          <marker id="khm-arr-path" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#10b981"/></marker>
        </defs>
        ${extra || ''}${body}
      </svg>`;
  }

  function animateBars(host) {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      host.querySelectorAll('.kbn-bar[data-to]').forEach(b => { b.style.transform = `scaleX(${b.dataset.to})`; });
    }));
  }

  function bindNodes(host, onPick) {
    const svg = host.querySelector('svg');
    if (!svg) return;
    const pick = e => {
      const g = e.target.closest('[data-node]');
      if (!g || g.classList.contains('ghost')) return;
      onPick(g.dataset.node);
    };
    svg.addEventListener('click', pick);
    svg.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(e); } });
  }

  // Column x-positions for n columns in a 480-wide viewBox
  function colsX(n, W) {
    const span = Math.min(112 * (n - 1), W - 90);
    const step = n > 1 ? span / (n - 1) : 0;
    const start = (W - span) / 2;
    return Array.from({ length: n }, (_, i) => start + i * step);
  }

  // ---------------------------------------------------------------------------
  // CPT editor (prior / transition / sensor), shared by all three concepts
  // ---------------------------------------------------------------------------
  const PARTS = {
    prior: { label: 'Prior', keys: [['p0', null]] },
    transition: { label: 'Transition', keys: [['t1', true], ['t0', false]] },
    sensor: { label: 'Sensor', keys: [['s1', true], ['s0', false]] }
  };
  function partHead(part) {
    const X = ex().X.a, E = ex().E.a;
    if (part === 'prior') return { title: `Prior · P(${X}${sb(0)})`, col: `P(${X}${sb(0)} = T)`, cond: null, note: `Belief about day 0, before any observation.` };
    if (part === 'transition') return { title: `Transition model · P(${X}ₜ | ${X}ₜ₋₁)`, col: `P(${X}ₜ = T | ${X}ₜ₋₁)`, cond: `${X}ₜ₋₁`, note: `How the hidden state evolves from one day to the next. Used in <b>every</b> slice (stationarity).` };
    return { title: `Sensor model · P(${E}ₜ | ${X}ₜ)`, col: `P(${E}ₜ = T | ${X}ₜ)`, cond: `${X}ₜ`, note: `How likely each observation is in each hidden state. Also shared by every slice.` };
  }
  function cptEditor(part) {
    const p = P(), d = ex().params, h = partHead(part);
    const rows = PARTS[part].keys.map(([k, cv]) => {
      const changed = Math.abs(p[k] - d[k]) > 1e-9;
      return `
        <tr>
          ${h.cond ? `<td class="kbn-tf ${cv ? 't' : 'f'}">${tf(cv)}</td>` : ''}
          <td class="kbn-edit">
            <input type="range" min="0" max="1" step="0.001" value="${p[k]}" data-k="${k}" aria-label="${k}">
            <input type="number" min="0" max="1" step="0.001" value="${+p[k].toFixed(4)}" data-k="${k}" aria-label="${k} value">
            <span class="kbn-mod ${changed ? 'on' : ''}" data-mod="${k}" title="Changed from the default ${d[k]}">●</span>
          </td>
          <td class="kbn-pf" data-pf="${k}">${f4(1 - p[k])}</td>
        </tr>`;
    }).join('');
    const Tm = `[[${f3(p.t1)}, ${f3(1 - p.t1)}], [${f3(p.t0)}, ${f3(1 - p.t0)}]]`;
    return `
      <div class="khm-parts" role="tablist">
        ${Object.keys(PARTS).map(k => `<button class="kbu-view-tab ${k === part ? 'active' : ''}" data-part="${k}">${PARTS[k].label}</button>`).join('')}
        <button class="klt-btn kbn-restore" type="button"><i data-lucide="rotate-ccw"></i> Restore defaults</button>
      </div>
      <div class="kbn-cpt-head"><div><b>${h.title}</b></div></div>
      <div class="kbn-cpt-wrap">
        <table class="kbn-cpt">
          <thead><tr>${h.cond ? `<th>${h.cond}</th>` : ''}<th>${h.col} <span class="klt-muted">edit</span></th><th>= F</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="kbn-cpt-note">${h.note} ${part === 'transition' ? `As a matrix, <code>T = ${Tm}</code> (rows: ${ex().X.a}ₜ₋₁ = T, F). Stationary belief π = ${f3(p.t0 / (1 - p.t1 + p.t0))}.` : ''}${part === 'sensor' ? ` Each row sums to 1.` : ''}</div>`;
  }
  function bindCpt(host, part, setPart, onChange) {
    host.querySelectorAll('[data-part]').forEach(b => b.addEventListener('click', () => setPart(b.dataset.part)));
    host.querySelectorAll('.kbn-edit input').forEach(inp => {
      inp.addEventListener('input', () => {
        let v = parseFloat(inp.value);
        if (!Number.isFinite(v)) return;
        v = Math.min(1, Math.max(0, v));
        const k = inp.dataset.k;
        P()[k] = v;
        host.querySelectorAll(`.kbn-edit input[data-k="${k}"]`).forEach(o => { if (o !== inp) o.value = o.type === 'number' ? +v.toFixed(4) : v; });
        const pf = host.querySelector(`[data-pf="${k}"]`); if (pf) pf.textContent = f4(1 - v);
        const mod = host.querySelector(`[data-mod="${k}"]`); if (mod) mod.classList.toggle('on', Math.abs(v - ex().params[k]) > 1e-9);
        onChange();
      });
    });
    const rb = host.querySelector('.kbn-restore');
    if (rb) rb.addEventListener('click', () => { params[exIdx] = Object.assign({}, ex().params); draw(); });
  }

  // ---------------------------------------------------------------------------
  // Shared left-column pieces
  // ---------------------------------------------------------------------------
  function exTabs() {
    return `
      <div class="kbu-ex-tabs kbn-ex-tabs" role="tablist" aria-label="Choose an example">
        ${EXAMPLES.map((e, i) => `
          <button class="kbu-ex-tab ${i === exIdx ? 'active' : ''}" role="tab" aria-selected="${i === exIdx}" data-ex="${i}">
            <i data-lucide="${e.icon}"></i> ${i + 1}. ${e.name}
          </button>`).join('')}
      </div>`;
  }
  function bindExTabs() {
    ctrlHost.querySelectorAll('[data-ex]').forEach(b => b.addEventListener('click', () => { exIdx = parseInt(b.dataset.ex, 10); draw(); }));
  }

  function evidenceControls(s, allowK) {
    const e = ex();
    const Tn = s.ev.length;
    return `
      <div class="kbn-evi">
        <div class="khm-evi-top">
          <span class="kbn-evi-label">Observations ${e.E.name}ₜ</span>
          <span class="khm-days">
            <button class="klt-btn" data-days="-1" ${Tn <= 1 ? 'disabled' : ''} aria-label="Remove a day">−</button>
            <b>${Tn} day${Tn > 1 ? 's' : ''}</b>
            <button class="klt-btn" data-days="1" ${Tn + (allowK ? s.k : 0) >= MAXD ? 'disabled' : ''} aria-label="Add a day">+</button>
          </span>
        </div>
        <div class="khm-evi-grid">
          ${s.ev.map((v, i) => `
            <div class="khm-evi-day">
              <span>Day ${i + 1}</span>
              <span class="kbn-seg" role="group" aria-label="Day ${i + 1} observation">
                ${[T, F].map(o => `<button class="${v === o ? 'on ' + (o ? 't' : 'f') : ''}" data-day="${i}" data-val="${o ? 'T' : 'F'}" aria-pressed="${v === o}" title="${o ? e.E.yes : e.E.no}">${o ? 'T' : 'F'}</button>`).join('')}
              </span>
            </div>`).join('')}
        </div>
        ${allowK ? `
        <label class="kbn-query"><span>Predict ahead (no evidence)</span>
          <select class="klt-select" id="khm-k">
            ${[0, 1, 2, 3].map(k => `<option value="${k}" ${k === s.k ? 'selected' : ''} ${Tn + k > MAXD ? 'disabled' : ''}>${k === 0 ? 'none — filtering only' : k + ' day' + (k > 1 ? 's' : '')}</option>`).join('')}
          </select>
        </label>` : ''}
      </div>`;
  }
  function bindEvidence(s, restart) {
    ctrlHost.querySelectorAll('[data-day]').forEach(b => b.addEventListener('click', () => {
      s.ev[+b.dataset.day] = b.dataset.val === 'T'; restart(); draw();
    }));
    ctrlHost.querySelectorAll('[data-days]').forEach(b => b.addEventListener('click', () => {
      if (+b.dataset.days > 0) s.ev.push(T); else s.ev.pop();
      restart(); draw();
    }));
    const k = ctrlHost.querySelector('#khm-k');
    if (k) k.addEventListener('change', () => { s.k = +k.value; restart(); draw(); });
  }

  function actions(s, N) {
    return `
      <div class="kbu-actions">
        <button class="klt-btn" id="khm-reset"><i data-lucide="rotate-ccw"></i> Reset</button>
        <button class="klt-btn klt-btn-primary" id="khm-next" ${s.steps >= N ? 'disabled' : ''}>Next Step <i data-lucide="chevron-right"></i></button>
        <button class="klt-btn" id="khm-sol">${s.steps >= N ? '<i data-lucide="eye-off"></i> Hide Solution' : '<i data-lucide="eye"></i> Show Solution'}</button>
        <span class="klt-tag info kbn-stepcount">step ${s.steps} / ${N}</span>
      </div>`;
  }
  function bindActions(s, N, defaults, stepView) {
    ctrlHost.querySelector('#khm-reset').addEventListener('click', () => { defaults(); draw(); });
    ctrlHost.querySelector('#khm-next').addEventListener('click', () => { s.steps = Math.min(N, s.steps + 1); s.view = stepView; draw(); });
    ctrlHost.querySelector('#khm-sol').addEventListener('click', () => {
      if (s.steps >= N) { s.steps = 0; if (s.view === stepView) s.view = s.defaultView; } else { s.steps = N; s.view = stepView; }
      draw();
    });
  }

  function whatsBox(title, body) {
    return `
      <div class="klt-note kbn-whats">
        <div class="klt-note-title">${title}</div>
        <div class="kbn-whats-body">${body}</div>
      </div>`;
  }

  function viewTabs(host, tabs, s, rerender) {
    host.innerHTML = tabs.map(t => `<button class="kbu-view-tab ${t.id === s.view ? 'active' : ''} ${t.sol ? 'sol' : ''}" data-view="${t.id}" role="tab" aria-selected="${t.id === s.view}"><i data-lucide="${t.icon}"></i> ${t.name}</button>`).join('');
    host.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => { s.view = b.dataset.view; rerender(); icons(); }));
  }

  // ===========================================================================
  // 1. HMM CONSTRUCTION — unroll the dynamic Bayesian network
  // ===========================================================================
  const BUILD = [
    { add: ['X0'], part: 'prior' },
    { add: ['X1'], part: 'transition' },
    { add: ['E1'], part: 'sensor' },
    { add: ['X2', 'E2'], part: 'transition' },
    { add: ['X3', 'E3'], part: 'sensor' }
  ];
  function buildText(k) {
    const e = ex(), p = P(), X = e.X.a, E = e.E.a;
    return [
      { title: `Add ${X}${sb(0)} — the initial state`, why: `Day 0 has no observation. The agent starts from a prior belief P(${X}${sb(0)} = T) = ${f3(p.p0)} about ${e.X.name}.`,
        ci: `${e.X.name}ₜ is a <b>hidden</b> state variable: the agent never observes it directly and must infer it from evidence.` },
      { title: `Add ${X}${sb(1)} with edge ${X}${sb(0)} → ${X}${sb(1)}`, why: `Today's ${e.X.name} depends on yesterday's. This is the <b>transition model</b> P(${X}ₜ | ${X}ₜ₋₁): 2 rows, e.g. P(${X}ₜ = T | ${X}ₜ₋₁ = T) = ${f3(p.t1)}.`,
        ci: `<b>First-order Markov assumption:</b> P(${X}ₜ | ${X}${sb(0)}:ₜ₋₁) = P(${X}ₜ | ${X}ₜ₋₁). The current state screens off the whole past.` },
      { title: `Add ${E}${sb(1)} with edge ${X}${sb(1)} → ${E}${sb(1)}`, why: `The observation ${e.E.name} depends only on the current state. This is the <b>sensor model</b> P(${E}ₜ | ${X}ₜ): 2 rows, e.g. P(${E}ₜ = T | ${X}ₜ = T) = ${f3(p.s1)}.`,
        ci: `<b>Sensor Markov assumption:</b> P(${E}ₜ | ${X}${sb(0)}:ₜ, ${E}${sb(1)}:ₜ₋₁) = P(${E}ₜ | ${X}ₜ).` },
      { title: `Unroll slice 2: ${X}${sb(1)} → ${X}${sb(2)} → ${E}${sb(2)}`, why: `The same pattern repeats for every day: one state node with an edge from the previous state, and one evidence node below it.`,
        ci: `<b>Stationarity:</b> the same transition and sensor CPTs are reused in every slice, so the model has the same few numbers however many days we track.` },
      { title: `Unroll slice 3: ${X}${sb(2)} → ${X}${sb(3)} → ${E}${sb(3)}`, why: `The network can be unrolled for any number of days. With a single discrete state variable this dynamic Bayesian network is a <b>Hidden Markov Model</b>.`,
        ci: `${X}ₜ₊₁ ⫫ ${X}ₜ₋₁ | ${X}ₜ, and each ${E}ₜ ⫫ everything else | ${X}ₜ. These independencies are what make the recursive forward algorithm possible.` }
    ][k - 1];
  }

  function buildLeft() {
    const e = ex(), st = build[exIdx], k = st.step, N = BUILD.length;
    const txt = k > 0 ? buildText(k) : null;
    const body = k === 0
      ? `<p>An HMM is a Bayesian network repeated over time. Each <b>Next Step</b> adds the next node(s) and edges of the unrolled network and explains the assumption it encodes.</p>`
      : `<div class="kbn-step-title">${txt.title}</div>
         <p>${txt.why}</p>
         <div class="kbn-ci"><i data-lucide="git-branch"></i><span>${txt.ci}</span></div>
         ${k === N ? `<div class="kbn-done"><i data-lucide="check-circle-2"></i><span>Model complete: prior (1 number) + transition (2) + sensor (2) = <b>5 numbers</b> describe every day.</span></div>` : ''}`;
    ctrlHost.innerHTML = `
      <div class="kbu kbn-controls">
        ${exTabs()}
        <div class="kbu-problem">
          <div class="kbu-problem-head"><span class="kbu-problem-title">${e.title}</span></div>
          <p>${e.story}</p>
          <div class="kbu-vars">
            <span><b>${e.X.a}ₜ</b> = ${e.X.name} on day t (hidden)</span>
            <span><b>${e.E.a}ₜ</b> = ${e.E.name} on day t (observed)</span>
          </div>
        </div>
        <div class="kbn-steppanel">
          <div class="kbn-step-head"><span>Construction · step ${k} of ${N}</span><span class="kbn-dots">${BUILD.map((b, i) => `<i class="${i < k ? 'on' : ''}"></i>`).join('')}</span></div>
          ${body}
        </div>
        <div class="kbu-actions">
          <button class="klt-btn" id="khm-reset"><i data-lucide="rotate-ccw"></i> Reset</button>
          <button class="klt-btn" id="khm-back" ${k === 0 ? 'disabled' : ''}><i data-lucide="chevron-left"></i> Back</button>
          <button class="klt-btn klt-btn-primary" id="khm-next" ${k === N ? 'disabled' : ''}>Next Step <i data-lucide="chevron-right"></i></button>
          <button class="klt-btn" id="khm-sol">${k === N ? '<i data-lucide="eye-off"></i> Hide Solution' : '<i data-lucide="eye"></i> Show Solution'}</button>
        </div>
      </div>`;
    bindExTabs();
    const go = s => { st.step = s; st.part = s > 0 ? BUILD[s - 1].part : null; draw(); };
    ctrlHost.querySelector('#khm-reset').addEventListener('click', () => go(0));
    ctrlHost.querySelector('#khm-back').addEventListener('click', () => go(Math.max(0, k - 1)));
    ctrlHost.querySelector('#khm-next').addEventListener('click', () => go(Math.min(N, k + 1)));
    ctrlHost.querySelector('#khm-sol').addEventListener('click', () => go(k === N ? 0 : N));
  }

  function buildRight() {
    const e = ex();
    vizHost.innerHTML = `
      <div class="kbu kbn">
        <div class="klt-head">
          <div class="klt-head-title"><i data-lucide="${e.icon}"></i> ${e.name} · unrolled network</div>
          <span class="klt-tag info" id="khm-count"></span>
        </div>
        <div class="kbn-graph" id="khm-dag"></div>
        <div class="kbn-legend">
          <span><i class="lg new"></i>just added</span>
          <span><i class="lg added"></i>hidden state</span>
          <span><i class="lg evidence"></i>observation</span>
          <span><i class="lg ghost"></i>not yet added</span>
          <span class="klt-muted">click a node to view its CPT</span>
        </div>
        <div class="kbn-factor" id="khm-factor"></div>
        <section class="klt-panel kbu-panel kbn-cpt-panel" id="khm-cpt"></section>
      </div>`;
  }

  function refreshBuild(keepEditor) {
    const e = ex(), st = build[exIdx], k = st.step;
    const added = new Set(), newest = new Set();
    BUILD.slice(0, k).forEach((b, i) => b.add.forEach(id => { added.add(id); if (i === k - 1) newest.add(id); }));
    document.getElementById('khm-count').textContent = `step ${k} / ${BUILD.length}`;

    const W = 480, H = 196, xs = colsX(4, W - 56).map(c => c + 56), ys = 58, ye = 150;
    const nodes = {};
    for (let t = 0; t <= 3; t++) {
      nodes['X' + t] = { x: xs[t], y: ys, w: 96, h: 42, name: Xs(t), sub: t === 0 ? `P(${Xs(0)})` : `P(${Xs(t)} | ${Xs(t - 1)})`, data: 'X' + t, part: t === 0 ? 'prior' : 'transition' };
      if (t > 0) nodes['E' + t] = { x: xs[t], y: ye, w: 96, h: 38, name: Es(t), sub: `P(${Es(t)} | ${Xs(t)})`, data: 'E' + t, part: 'sensor' };
    }
    let edges = '', body = '';
    for (let t = 1; t <= 3; t++) {
      if (added.has('X' + t)) edges += edgeSvg(nodes['X' + (t - 1)], nodes['X' + t], newest.has('X' + t) ? 'new' : '');
      if (added.has('E' + t)) edges += edgeSvg(nodes['X' + t], nodes['E' + t], newest.has('E' + t) ? 'new' : '');
    }
    Object.keys(nodes).forEach(id => {
      const n = nodes[id], vis = added.has(id);
      body += nodeSvg(Object.assign({}, n, {
        ghost: !vis, data: vis ? n.data : null,
        cls: newest.has(id) ? 'new' : vis ? (id[0] === 'E' ? 'evidence' : 'added') : '',
        selected: vis && st.part === n.part && (newest.has(id) || !Array.from(newest).some(x => nodes[x].part === st.part)),
        sub: vis ? n.sub : ''
      }));
    });
    const labels = `<text class="khm-row" x="8" y="${ys + 4}">hidden</text><text class="khm-row" x="8" y="${ye + 4}">observed</text>` +
      [0, 1, 2, 3].map(t => `<text class="khm-col" x="${xs[t]}" y="${H - 4}">day ${t}</text>`).join('');
    const host = document.getElementById('khm-dag');
    host.innerHTML = svgWrap(W, H, edges + body, `${e.name} unrolled network`, labels) +
      (k === 0 ? '<div class="kbn-empty">Press <b>Next Step</b> to add the first node.</div>' : '');
    bindNodes(host, id => { st.part = nodes[id].part; refreshBuild(false); icons(); });

    const X = e.X.a, Ea = e.E.a;
    const fac = [[`P(${X}${sb(0)})`, 'X0']];
    for (let t = 1; t <= 3; t++) { fac.push([`P(${X}${sb(t)} | ${X}${sb(t - 1)})`, 'X' + t]); fac.push([`P(${Ea}${sb(t)} | ${X}${sb(t)})`, 'E' + t]); }
    document.getElementById('khm-factor').innerHTML = `
      <div><b>Joint over time:</b> P(${X}${sb(0)}:${sb(3)}, ${Ea}${sb(1)}:${sb(3)}) = ${fac.map(([s, id]) => `<span class="${added.has(id) ? (newest.has(id) ? 'f-new' : 'f-on') : 'f-off'}">${s}</span>`).join(' ')}</div>
      <div class="kbn-factor-sub">In general P(X₀:ₜ, E₁:ₜ) = P(X₀) ∏ᵢ P(Xᵢ | Xᵢ₋₁) P(Eᵢ | Xᵢ). ${k >= 4 ? 'The repeated factors share one CPT each (stationarity).' : 'Watch the factors repeat as the network is unrolled.'}</div>`;

    const cptHost = document.getElementById('khm-cpt');
    if (!keepEditor) {
      if (!st.part) {
        cptHost.innerHTML = '<div class="kbn-cpt-empty">The CPT of the selected node appears here.</div>';
      } else {
        cptHost.innerHTML = cptEditor(st.part);
        bindCpt(cptHost, st.part, part => { st.part = part; refreshBuild(false); icons(); }, () => refreshBuild(true));
      }
    }
  }

  // ===========================================================================
  // 2. FILTERING & PREDICTION — the forward algorithm, step by step
  // ===========================================================================
  function filterSteps(s) {
    const e = ex(), p = P();
    const fw = forward(p, s.ev, s.k);
    const X = e.X.a;
    const vec = v => `⟨${f3(v[0])}, ${f3(v[1])}⟩`;
    const steps = fw.ops.map(op => {
      const t = op.t;
      if (op.type === 'init') {
        return { op, title: `Initialize with the prior f${sb(0)}`, html: `<div class="kbn-math">f${sb(0)} = P(${X}${sb(0)}) = ${vec(fw.f[0])}</div>`,
          explain: `Filtering starts from the agent’s belief about day 0, before any observation: P(${xl(0, true)}) = <b>${f3(fw.f[0][0])}</b>.` };
      }
      if (op.type === 'predict') {
        const prev = fw.f[t - 1], pr = fw.pred[t];
        return { op, title: `Day ${t} · Predict`, html: `<div class="kbn-math">P(${X}${sb(t)}${t > 1 ? ' | ' + e1t(t - 1) : ''}) = Σ<sub>${X.toLowerCase()}${sb(t - 1)}</sub> P(${X}${sb(t)} | ${X.toLowerCase()}${sb(t - 1)}) f${sb(t - 1)}(${X.toLowerCase()}${sb(t - 1)})<br>= ⟨${f3(p.t1)}×${f3(prev[0])} + ${f3(p.t0)}×${f3(prev[1])}, ${f3(1 - p.t1)}×${f3(prev[0])} + ${f3(1 - p.t0)}×${f3(prev[1])}⟩ = <b>${vec(pr)}</b></div>`,
          explain: `<b>Predict:</b> push yesterday’s belief through the transition model. By the Markov assumption only ${X}${sb(t - 1)} matters. Before looking at day ${t}’s evidence, P(${xl(t, true)}) = <b>${f3(pr[0])}</b>.` };
      }
      if (op.type === 'update') {
        const l = lik(p, s.ev[t - 1]), pr = fw.pred[t], u = fw.un[t];
        const obs = s.ev[t - 1];
        return { op, title: `Day ${t} · Update with ${el(t, obs)}`, html: `<div class="kbn-math">f${sb(t)} = α P(${el(t, obs)} | ${X}${sb(t)}) P(${X}${sb(t)}${t > 1 ? ' | ' + e1t(t - 1) : ''})<br>= α ⟨${f3(l[0])}×${f3(pr[0])}, ${f3(l[1])}×${f3(pr[1])}⟩ = α ⟨${f4(u[0])}, ${f4(u[1])}⟩ = <b class="kbn-c-q">${vec(fw.f[t])}</b></div>`,
          explain: `<b>Update:</b> the agent observes ${obs ? e.E.yes : e.E.no} (${el(t, obs)}). Each state is weighted by how well it explains it — ${f3(l[0])} if ${e.X.yes}, ${f3(l[1])} otherwise — then normalized (α = 1/${f4(fw.Z[t])}). P(${xl(t, true)} | ${e1t(t)}) = <b>${f3(fw.f[t][0])}</b>.` };
      }
      if (op.type === 'future') {
        const base = t - 1 === fw.Tn ? fw.f[fw.Tn] : fw.pred[t - 1];
        return { op, title: `Predict day ${t} (no evidence)`, html: `<div class="kbn-math">P(${X}${sb(t)} | ${e1t(fw.Tn)}) = Σ<sub>${X.toLowerCase()}${sb(t - 1)}</sub> P(${X}${sb(t)} | ${X.toLowerCase()}${sb(t - 1)}) P(${X.toLowerCase()}${sb(t - 1)} | ${e1t(fw.Tn)}) = <b class="kbn-c-q">${vec(fw.pred[t])}</b></div>`,
          explain: `<b>Prediction</b> uses only the transition model — there is no evidence for day ${t}. Repeating it drifts the belief toward the stationary distribution π = ${f3(fw.pi)} (from ${f3(base[0])} to <b>${f3(fw.pred[t][0])}</b>).` };
      }
      // summary
      const last = fw.Tn + fw.k;
      const ans = fw.k > 0 ? fw.pred[last][0] : fw.f[fw.Tn][0];
      const rows = [];
      for (let t2 = 0; t2 <= last; t2++) {
        rows.push(`<tr><td>${t2}</td><td>${t2 >= 1 && t2 <= fw.Tn ? el(t2, s.ev[t2 - 1]) : '—'}</td><td class="kbn-mono">${fw.pred[t2] ? f3(fw.pred[t2][0]) : '—'}</td><td class="kbn-mono"><b>${fw.f[t2] ? f3(fw.f[t2][0]) : '—'}</b></td></tr>`);
      }
      return { op, title: 'Summary: belief over time', html: `<div class="kbn-enum-wrap"><table class="kbn-enum"><thead><tr><th>day</th><th>evidence</th><th>predicted P(${xl(null, true)})</th><th>filtered P(${xl(null, true)})</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>`,
        explain: `The forward algorithm needs only the previous message f<sub>t−1</sub>, so each day costs O(|S|²) time and constant memory. Final answer: ${fw.k > 0 ? `P(${xl(last, true)} | ${e1t(fw.Tn)})` : `P(${xl(fw.Tn, true)} | ${e1t(fw.Tn)})`} = <b>${pct(ans)}</b>.` };
    });
    return { fw, steps };
  }

  function filterLeft() {
    const e = ex(), s = filt[exIdx];
    const { steps } = filterSteps(s);
    const N = steps.length;
    s.steps = Math.min(s.steps, N);
    const cur = s.steps > 0 ? steps[s.steps - 1] : null;
    ctrlHost.innerHTML = `
      <div class="kbu kbn-controls">
        ${exTabs()}
        <div class="kbu-problem">
          <div class="kbu-problem-head"><span class="kbu-problem-title">${e.title}</span></div>
          <p>${e.short}</p>
          <p class="kbn-try"><i data-lucide="lightbulb"></i> ${e.tryFilter}</p>
        </div>
        ${evidenceControls(s, true)}
        ${actions(s, N)}
        ${whatsBox(cur ? `Step ${s.steps}: ${cur.title}` : 'What’s happening?', cur ? cur.explain : `Set the observations, then press <b>Next Step</b> to run the <b>FORWARD</b> algorithm — predict, then update, for each day — or <b>Show Solution</b> to see every step. Click a node to view and edit the model.`)}
      </div>`;
    bindExTabs();
    const restart = () => { s.steps = 0; s.lastBar = null; s.lastSub = null; if (s.view === 'steps') s.view = 'chart'; };
    bindEvidence(s, restart);
    s.defaultView = 'chart';
    bindActions(s, N, () => { s.ev = e.filterEv.slice(); s.k = 0; restart(); s.view = 'chart'; }, 'steps');
  }

  function filterRight() {
    const e = ex();
    vizHost.innerHTML = `
      <div class="kbu kbn">
        <div class="klt-head">
          <div class="klt-head-title"><i data-lucide="${e.icon}"></i> <span id="khm-title"></span></div>
          <span class="klt-tag info">updates live</span>
        </div>
        <div id="khm-summary"></div>
        <div class="kbn-graph" id="khm-dag"></div>
        <div class="kbn-legend">
          <span><i class="lg hidden"></i>not computed yet</span>
          <span><i class="lg new"></i>computed this step</span>
          <span><i class="lg added"></i>belief known</span>
          <span><i class="lg query"></i>query day</span>
          <span><i class="lg evidence"></i>observation</span>
        </div>
        <div class="kbu-view-tabs" id="khm-tabs" role="tablist"></div>
        <section class="klt-panel kbu-panel" id="khm-panel"></section>
      </div>`;
  }

  function refreshFilter(keepEditor) {
    const e = ex(), s = filt[exIdx];
    const { fw, steps } = filterSteps(s);
    const N = steps.length, latest = s.steps;
    const last = fw.Tn + fw.k;
    const X = e.X.a;

    // What is known after `latest` steps
    const known = {}; // t -> { pred, f }
    let cur = null;
    steps.slice(0, latest).forEach(st => {
      const op = st.op;
      if (op.type === 'init') known[0] = { f: true };
      if (op.type === 'predict' || op.type === 'future') known[op.t] = Object.assign(known[op.t] || {}, { pred: true });
      if (op.type === 'update') known[op.t] = Object.assign(known[op.t] || {}, { f: true });
      cur = op;
    });
    const valueOf = t => {
      const k = known[t] || {};
      if (k.f && fw.f[t]) return fw.f[t][0];
      if (k.pred && fw.pred[t]) return fw.pred[t][0];
      return null;
    };
    const ansKnown = known[last] && (fw.k > 0 ? known[last].pred : known[last].f);
    const ans = fw.k > 0 ? fw.pred[last][0] : fw.f[fw.Tn][0];
    const qLabel = fw.k > 0 ? `P(${xl(last, true)} | ${e1t(fw.Tn)})` : `P(${xl(fw.Tn, true)} | ${e1t(fw.Tn)})`;
    document.getElementById('khm-title').textContent = `${e.name} · ${fw.k > 0 ? 'prediction' : 'filtering'} ${qLabel}`;

    const shift = (ans - fw.f[0][0]) * 100;
    document.getElementById('khm-summary').innerHTML = `
      <div class="kbu-belief kbn-belief">
        <div class="kbu-belief-box prior"><span>Prior · day 0</span><b>${pct(fw.f[0][0])}</b><small>P(${xl(0, true)})</small></div>
        <div class="kbu-belief-arrow"><span>observe ${e1t(fw.Tn)}${fw.k ? ` + ${fw.k} day${fw.k > 1 ? 's' : ''}` : ''}</span><i data-lucide="arrow-right"></i>
          <small class="${ansKnown ? (shift >= 0 ? 'up' : 'down') : ''}">${ansKnown ? (shift >= 0 ? '+' : '−') + Math.abs(shift).toFixed(1) + ' pts' : '? pts'}</small></div>
        <div class="kbu-belief-box post ${ansKnown ? '' : 'pending'}"><span>${fw.k > 0 ? 'Predicted' : 'Filtered'} belief</span><b>${ansKnown ? pct(ans) : '?'}</b><small>${ansKnown ? qLabel : 'revealed by the steps'}</small></div>
      </div>`;

    // Graph
    const W = 480, H = 196, n = last + 1, xs = colsX(n, W), ys = 58, ye = 150;
    const nw = n > 5 ? 70 : 84;
    const prevBar = s.lastBar || {}, prevSub = s.lastSub || {};
    const stepChanged = s.lastStep !== latest;
    const nodes = {}, subs = {}, bars = {};
    for (let t = 0; t <= last; t++) {
      const k = known[t] || {};
      const v = valueOf(t);
      const isCur = cur && (cur.type === 'init' ? t === 0 : cur.t === t) && cur.type !== 'summary';
      let sub = '?';
      if (k.f && fw.f[t]) sub = t === 0 ? `P = ${f3(v)}` : `f = ${f3(v)}`;
      else if (k.pred) sub = t > fw.Tn ? `pred = ${f3(v)}` : `pred = ${f3(v)}`;
      subs['X' + t] = sub;
      bars['X' + t] = v;
      nodes['X' + t] = {
        x: xs[t], y: ys, w: nw, h: 42, name: Xs(t), sub, data: 'X' + t,
        cls: isCur ? 'new' : (t === last ? 'query' : (v != null ? 'added' : 'hidden')),
        bar: v, prev: 'X' + t in prevBar ? prevBar['X' + t] : (t > 0 ? valueOf(t - 1) : null),
        changed: stepChanged && latest > 0 && prevSub['X' + t] !== sub
      };
      if (t >= 1 && t <= fw.Tn) {
        const obs = s.ev[t - 1];
        const used = cur && cur.type === 'update' && cur.t === t;
        nodes['E' + t] = { x: xs[t], y: ye, w: nw - 10, h: 34, name: `${Es(t)} = ${tf(obs)}`, sub: '', badge: tf(obs), data: 'E' + t, cls: 'evidence', changed: stepChanged && used };
      } else if (t > fw.Tn) {
        nodes['E' + t] = { x: xs[t], y: ye, w: nw - 10, h: 34, name: `${Es(t)} = ?`, sub: '', ghost: true, cls: '' };
      }
    }
    let edges = '';
    for (let t = 1; t <= last; t++) {
      const hiPred = cur && (cur.type === 'predict' || cur.type === 'future') && cur.t === t;
      edges += edgeSvg(nodes['X' + (t - 1)], nodes['X' + t], hiPred ? 'new' : (valueOf(t) != null ? 'hi' : ''));
      if (t <= fw.Tn) {
        const hiUpd = cur && cur.type === 'update' && cur.t === t;
        edges += edgeSvg(nodes['X' + t], nodes['E' + t], hiUpd ? 'new' : (known[t] && known[t].f ? 'hi' : ''));
      }
    }
    const labels = xs.map((x, t) => `<text class="khm-col" x="${x}" y="${H - 4}">day ${t}${t > fw.Tn ? ' (pred)' : ''}</text>`).join('');
    const host = document.getElementById('khm-dag');
    host.innerHTML = svgWrap(W, H, edges + Object.values(nodes).map(nodeSvg).join(''), `${e.name} forward filtering`, labels);
    animateBars(host);
    s.lastBar = {}; Object.keys(bars).forEach(id => { if (bars[id] != null) s.lastBar[id] = bars[id]; });
    s.lastSub = subs; s.lastStep = latest;
    bindNodes(host, id => { s.part = id === 'X0' ? 'prior' : id[0] === 'E' ? 'sensor' : 'transition'; s.view = 'cpt'; refreshFilter(false); icons(); });

    // Tabs + panel
    const tabs = [{ id: 'chart', name: 'Belief over Time', icon: 'bar-chart-3' }, { id: 'cpt', name: 'Model CPTs', icon: 'table' }];
    if (latest > 0) tabs.push({ id: 'steps', name: `Forward Steps · ${latest}/${N}`, icon: 'list-ordered', sol: true });
    if (s.view === 'steps' && latest === 0) s.view = 'chart';
    viewTabs(document.getElementById('khm-tabs'), tabs, s, () => refreshFilter(false));

    const panel = document.getElementById('khm-panel');
    if (s.view === 'chart') {
      const rows = [];
      for (let t = 0; t <= last; t++) {
        const k = known[t] || {};
        const pr = fw.pred[t], fv = fw.f[t];
        rows.push(`
          <div class="kbn-pp ${t === last ? 'is-q' : ''}">
            <span class="kbn-pp-name">Day ${t}${t >= 1 && t <= fw.Tn ? ` <em>${el(t, s.ev[t - 1])}</em>` : t > fw.Tn ? ' <em>predict</em>' : ''}</span>
            <div class="kbn-pp-bars">
              <div class="kbn-pp-row">${t === 0 ? '<span class="khm-na">no prediction on day 0</span><b></b>' : k.pred ? `<span class="kbu-bar-track"><span class="kbu-bar-fill prior" style="width:${Math.max(0.4, pr[0] * 100)}%"></span></span><b>${pct(pr[0])}</b>` : '<span class="kbu-bar-track kbn-pending-track"></span><b>?</b>'}</div>
              <div class="kbn-pp-row">${t > fw.Tn ? '<span class="khm-na">no evidence to update with</span><b></b>' : k.f ? `<span class="kbu-bar-track"><span class="kbu-bar-fill post" style="width:${Math.max(0.4, fv[0] * 100)}%"></span></span><b class="post">${pct(fv[0])}</b>` : '<span class="kbu-bar-track kbn-pending-track"></span><b class="post">?</b>'}</div>
            </div>
          </div>`);
      }
      panel.innerHTML = `
        <div class="kbn-pp-legend"><span><i class="lg prior"></i>predicted P(${xl(null, true)}ₜ | ${e.E.a.toLowerCase()}₁:ₜ₋₁)</span><span><i class="lg post"></i>filtered P(${xl(null, true)}ₜ | ${e.E.a.toLowerCase()}₁:ₜ)</span></div>
        <div class="kbn-pp-list kbn-scroll">${rows.join('')}</div>
        <div class="kbu-panel-foot">Each day the belief is first <b>predicted</b> (grey) from yesterday, then <b>updated</b> (violet) with today’s observation. Values appear as you step.</div>`;
    } else if (s.view === 'cpt') {
      if (!keepEditor) {
        panel.innerHTML = `<div class="kbn-cpt-in">${cptEditor(s.part)}</div>`;
        bindCpt(panel, s.part, part => { s.part = part; refreshFilter(false); icons(); }, () => { refreshFilter(true); refreshWhats(); });
      }
    } else {
      panel.innerHTML = `<div class="kbn-scroll">
        <ol class="kbn-steps">${steps.slice(0, latest).map((st, i) => `<li class="${i === latest - 1 ? 'latest' : ''}"><div class="kbu-step-name">${st.title}</div>${st.html}</li>`).join('')}</ol>
        ${latest < N ? `<div class="kbn-more">Press <b>Next Step</b> for step ${latest + 1} of ${N}.</div>` : `<div class="kbu-sol-answer"><b>Answer:</b> ${qLabel} = <b>${f4(ans)}</b> (${pct(ans)}).</div>`}
      </div>`;
      const sc = panel.querySelector('.kbn-scroll'), le = panel.querySelector('li.latest');
      if (sc && le && latest > 1) sc.scrollTop = Math.max(0, le.offsetTop - 8);
    }
  }

  // ===========================================================================
  // 3. VITERBI — most likely sequence
  // ===========================================================================
  function viterbiSteps(s) {
    const e = ex(), p = P();
    const v = viterbi(p, s.ev);
    const X = e.X.a, x = X.toLowerCase();
    const steps = [];
    {
      const pr = v.fw.pred[1], l = lik(p, s.ev[0]);
      steps.push({ t: 1, title: `Day 1 · m${sb(1)} = f${sb(1)}`, html: `<div class="kbn-math">m${sb(1)} = P(${X}${sb(1)} | ${el(1, s.ev[0])}) = α P(${el(1, s.ev[0])} | ${X}${sb(1)}) Σ<sub>${x}${sb(0)}</sub> P(${X}${sb(1)} | ${x}${sb(0)}) P(${x}${sb(0)})<br>= α ⟨${f3(l[0])}×${f3(pr[0])}, ${f3(l[1])}×${f3(pr[1])}⟩ = <b class="kbn-c-q">⟨${f4(v.m[1][0])}, ${f4(v.m[1][1])}⟩</b></div>`,
        explain: `The Viterbi message for day 1 is just the filtered belief (AIMA Fig. 14.5): m${sb(1)}(${x}) = <b>${f4(v.m[1][0])}</b>, m${sb(1)}(¬${x}) = <b>${f4(v.m[1][1])}</b>. There is no path yet to choose between.` });
    }
    for (let t = 2; t <= v.Tn; t++) {
      const l = lik(p, s.ev[t - 1]);
      const line = j => {
        const c = v.cand[t][j], b = v.bp[t][j];
        const lab = j === 0 ? x : '¬' + x;
        return `m${sb(t)}(${lab}${sb(t)}) = P(${el(t, s.ev[t - 1])} | ${lab}${sb(t)}) · max( P(${lab}${sb(t)} | ${x}${sb(t - 1)}) m${sb(t - 1)}(${x}), P(${lab}${sb(t)} | ¬${x}${sb(t - 1)}) m${sb(t - 1)}(¬${x}) )<br>&nbsp;&nbsp;= ${f3(l[j])} · max(${f3(trans(p, 0, j))}×${f4(v.m[t - 1][0])}, ${f3(trans(p, 1, j))}×${f4(v.m[t - 1][1])}) = ${f3(l[j])} · ${f4(c[b])} = <b>${f4(v.m[t][j])}</b> &nbsp;← from ${b === 0 ? x : '¬' + x}${sb(t - 1)}`;
      };
      steps.push({ t, title: `Day ${t} · extend the best paths with ${el(t, s.ev[t - 1])}`, html: `<div class="kbn-math">${line(0)}<br>${line(1)}</div>`,
        explain: `For each state today, keep only the <b>best</b> way to arrive: max over yesterday’s states of (transition × yesterday’s message), then multiply by the sensor probability of ${el(t, s.ev[t - 1])}. The winning predecessor is a <b>back-pointer</b> (solid edge); the losing edge is discarded.` });
    }
    const pathStr = v.path.slice(1).map((j, i) => `${j === 0 ? '' : '¬'}${x}${sb(i + 1)}`).join(', ');
    const fwPick = v.fw.f.slice(1).map(f => (f[0] >= f[1] ? 0 : 1));
    const differ = fwPick.some((j, i) => j !== v.path[i + 1]);
    steps.push({ t: v.Tn + 1, title: 'Backtrack the most likely sequence', html: `<div class="kbn-math">x*${sb(v.Tn)} = argmax m${sb(v.Tn)} = ${v.path[v.Tn] === 0 ? x : '¬' + x}${sb(v.Tn)} (${f4(v.m[v.Tn][0])} vs ${f4(v.m[v.Tn][1])})<br>Follow back-pointers: <b class="kbn-c-q">⟨${pathStr}⟩</b></div>`,
      explain: `Start from the best final state and follow the back-pointers to day 1. The most likely sequence is <b>${pathStr}</b>.${differ ? ' Notice that it differs from picking the most likely state on each day separately (filtering) — Viterbi optimizes the whole sequence jointly.' : ' Here it agrees with picking the most likely filtered state each day, but that is not guaranteed in general.'}` });
    return { v, steps, pathStr, fwPick };
  }

  function viterbiLeft() {
    const e = ex(), s = vit[exIdx];
    const { steps } = viterbiSteps(s);
    const N = steps.length;
    s.steps = Math.min(s.steps, N);
    const cur = s.steps > 0 ? steps[s.steps - 1] : null;
    ctrlHost.innerHTML = `
      <div class="kbu kbn-controls">
        ${exTabs()}
        <div class="kbu-problem">
          <div class="kbu-problem-head"><span class="kbu-problem-title">Which sequence of ${e.X.name} best explains the observations?</span></div>
          <p>${e.short} Instead of one day’s belief, we want the single most likely <b>sequence</b> of hidden states.</p>
          <p class="kbn-try"><i data-lucide="lightbulb"></i> ${e.tryViterbi}</p>
        </div>
        ${evidenceControls(s, false)}
        ${actions(s, N)}
        ${whatsBox(cur ? `Step ${s.steps}: ${cur.title}` : 'What’s happening?', cur ? cur.explain : `Press <b>Next Step</b> to fill the trellis one day at a time with Viterbi messages m<sub>t</sub>, then backtrack the most likely path. Click a node to view and edit the model.`)}
      </div>`;
    bindExTabs();
    const restart = () => { s.steps = 0; s.lastSub = null; if (s.view === 'steps') s.view = 'table'; };
    bindEvidence(s, restart);
    s.defaultView = 'table';
    bindActions(s, N, () => { s.ev = e.viterbiEv.slice(); restart(); s.view = 'table'; }, 'steps');
  }

  function viterbiRight() {
    const e = ex();
    vizHost.innerHTML = `
      <div class="kbu kbn">
        <div class="klt-head">
          <div class="klt-head-title"><i data-lucide="${e.icon}"></i> <span id="khm-title"></span></div>
          <span class="klt-tag info">updates live</span>
        </div>
        <div id="khm-summary"></div>
        <div class="kbn-graph" id="khm-dag"></div>
        <div class="kbn-legend">
          <span><i class="lg hidden"></i>not computed</span>
          <span><i class="lg new"></i>computed this step</span>
          <span><i class="lg edge"></i>best predecessor</span>
          <span><i class="lg path"></i>most likely path</span>
          <span><i class="lg evidence"></i>observation</span>
        </div>
        <div class="kbu-view-tabs" id="khm-tabs" role="tablist"></div>
        <section class="klt-panel kbu-panel" id="khm-panel"></section>
      </div>`;
  }

  function refreshViterbi(keepEditor) {
    const e = ex(), s = vit[exIdx];
    const { v, steps, pathStr, fwPick } = viterbiSteps(s);
    const N = steps.length, latest = s.steps, Tn = v.Tn;
    const done = latest >= N;
    const x = e.X.a.toLowerCase();
    document.getElementById('khm-title').textContent = `${e.name} · argmax P(${e.X.a}${sb(1)}:${sb(Tn)} | ${e1t(Tn)})`;

    document.getElementById('khm-summary').innerHTML = `
      <div class="khm-seq">
        <span class="khm-seq-label">Observations</span>
        <span class="khm-seq-items">${s.ev.map((o, i) => `<i class="ev ${o ? 't' : 'f'}">${el(i + 1, o)}</i>`).join('')}</span>
        <span class="khm-seq-label">Most likely sequence</span>
        <span class="khm-seq-items">${done ? v.path.slice(1).map((j, i) => `<i class="st ${j === 0 ? 'yes' : 'no'}">${j === 0 ? '' : '¬'}${x}${sb(i + 1)}</i>`).join('') : '<i class="pending">? — revealed after backtracking</i>'}</span>
      </div>`;

    // Trellis: rows = states (true / false), columns = days 1..Tn
    const W = 480, H = 206, xs = colsX(Tn, W - 40).map(c => c + 40), yT = 44, yF = 122, yE = 178;
    const nw = Tn > 4 ? 72 : 84;
    const prevSub = s.lastSub || {};
    const stepChanged = s.lastStep !== latest;
    const nodes = {}, subs = {};
    const onPath = (t, j) => done && v.path[t] === j;
    for (let t = 1; t <= Tn; t++) {
      [0, 1].forEach(j => {
        const id = `S${t}_${j}`, rev = latest >= t;
        const sub = rev ? `m = ${f4(v.m[t][j])}` : 'm = ?';
        subs[id] = sub;
        nodes[id] = {
          x: xs[t - 1], y: j === 0 ? yT : yF, w: nw, h: 40, name: `${j === 0 ? '' : '¬'}${x}${sb(t)}`, sub, data: id,
          cls: onPath(t, j) ? 'onpath' : (latest === t ? 'new' : rev ? 'added' : 'hidden'),
          bar: rev ? v.m[t][j] / Math.max(v.m[t][0], v.m[t][1]) : null, prev: rev && latest !== t ? v.m[t][j] / Math.max(v.m[t][0], v.m[t][1]) : 0,
          changed: stepChanged && latest > 0 && (prevSub[id] !== sub || (done && onPath(t, j) && latest === N))
        };
      });
      nodes['E' + t] = { x: xs[t - 1], y: yE, w: nw - 14, h: 28, name: `${Es(t)} = ${tf(s.ev[t - 1])}`, badge: tf(s.ev[t - 1]), cls: 'evidence', data: 'E' + t, changed: stepChanged && latest === t };
    }
    let edges = '';
    for (let t = 2; t <= Tn; t++) {
      [0, 1].forEach(i => [0, 1].forEach(j => {
        let cls = 'khm-faint';
        if (latest >= t) cls = v.bp[t][j] === i ? (latest === t ? 'new' : 'hi') : 'dim';
        if (done && v.path[t - 1] === i && v.path[t] === j) cls = 'path';
        edges += edgeSvg(nodes[`S${t - 1}_${i}`], nodes[`S${t}_${j}`], cls);
      }));
    }
    const labels = `<text class="khm-row" x="6" y="${yT + 4}">${e.X.name}</text><text class="khm-row" x="6" y="${yF + 4}">¬${e.X.name}</text>` +
      xs.map((cx, i) => `<text class="khm-col" x="${cx}" y="${H - 2}">day ${i + 1}</text>`).join('');
    const host = document.getElementById('khm-dag');
    host.innerHTML = svgWrap(W, H, edges + Object.values(nodes).map(nodeSvg).join(''), `${e.name} Viterbi trellis`, labels);
    animateBars(host);
    s.lastSub = subs; s.lastStep = latest;
    bindNodes(host, id => { s.part = id[0] === 'E' ? 'sensor' : 'transition'; s.view = 'cpt'; refreshViterbi(false); icons(); });

    const tabs = [{ id: 'table', name: 'Messages Table', icon: 'table-2' }, { id: 'cpt', name: 'Model CPTs', icon: 'table' }];
    if (latest > 0) tabs.push({ id: 'steps', name: `Viterbi Steps · ${latest}/${N}`, icon: 'list-ordered', sol: true });
    if (s.view === 'steps' && latest === 0) s.view = 'table';
    viewTabs(document.getElementById('khm-tabs'), tabs, s, () => refreshViterbi(false));

    const panel = document.getElementById('khm-panel');
    if (s.view === 'table') {
      const cell = (t, j) => {
        if (latest < t) return '<td class="kbn-mono khm-q">?</td>';
        const bp = t > 1 ? ` <span class="klt-muted">← ${v.bp[t][j] === 0 ? x : '¬' + x}</span>` : '';
        return `<td class="kbn-mono ${onPath(t, j) ? 'khm-onpath' : ''}">${f4(v.m[t][j])}${bp}</td>`;
      };
      panel.innerHTML = `
        <div class="kbn-enum-wrap khm-table">
          <table class="kbn-enum">
            <thead><tr><th></th>${s.ev.map((o, i) => `<th>day ${i + 1} (${el(i + 1, o)})</th>`).join('')}</tr></thead>
            <tbody>
              <tr><th>m(${x})</th>${s.ev.map((o, i) => cell(i + 1, 0)).join('')}</tr>
              <tr><th>m(¬${x})</th>${s.ev.map((o, i) => cell(i + 1, 1)).join('')}</tr>
              <tr class="khm-cmp"><th>Viterbi path</th>${s.ev.map((o, i) => `<td class="kbn-mono">${done ? `<b>${v.path[i + 1] === 0 ? x : '¬' + x}</b>` : '?'}</td>`).join('')}</tr>
              <tr class="khm-cmp"><th>Filtering argmax</th>${s.ev.map((o, i) => `<td class="kbn-mono">${done ? `${fwPick[i] === 0 ? x : '¬' + x} <span class="klt-muted">${f3(v.fw.f[i + 1][0])}</span>` : '?'}</td>`).join('')}</tr>
            </tbody>
          </table>
        </div>
        <div class="kbu-panel-foot">← shows each cell’s back-pointer (best predecessor). After backtracking, the last two rows compare the jointly most likely sequence with the day-by-day most likely states from filtering.</div>`;
    } else if (s.view === 'cpt') {
      if (!keepEditor) {
        panel.innerHTML = `<div class="kbn-cpt-in">${cptEditor(s.part)}</div>`;
        bindCpt(panel, s.part, part => { s.part = part; refreshViterbi(false); icons(); }, () => { refreshViterbi(true); refreshWhats(); });
      }
    } else {
      panel.innerHTML = `<div class="kbn-scroll">
        <ol class="kbn-steps">${steps.slice(0, latest).map((st, i) => `<li class="${i === latest - 1 ? 'latest' : ''}"><div class="kbu-step-name">${st.title}</div>${st.html}</li>`).join('')}</ol>
        ${latest < N ? `<div class="kbn-more">Press <b>Next Step</b> for step ${latest + 1} of ${N}.</div>` : `<div class="kbu-sol-answer"><b>Answer:</b> most likely sequence ⟨${pathStr}⟩.</div>`}
      </div>`;
      const sc = panel.querySelector('.kbn-scroll'), le = panel.querySelector('li.latest');
      if (sc && le && latest > 1) sc.scrollTop = Math.max(0, le.offsetTop - 8);
    }
  }

  // After a CPT edit, the explanation on the left contains numbers — refresh it.
  function refreshWhats() {
    const body = ctrlHost && ctrlHost.querySelector('.kbn-whats-body');
    if (!body) return;
    if (mode === 'filter') {
      const s = filt[exIdx]; if (!s.steps) return;
      body.innerHTML = filterSteps(s).steps[s.steps - 1].explain;
    } else if (mode === 'viterbi') {
      const s = vit[exIdx]; if (!s.steps) return;
      body.innerHTML = viterbiSteps(s).steps[s.steps - 1].explain;
    }
  }

  // ---------------------------------------------------------------------------
  // Entry points
  // ---------------------------------------------------------------------------
  function draw() {
    if (!vizHost) return;
    ctrlHost = document.getElementById('kl-concept-lab');
    if (!ctrlHost) {
      ctrlHost = document.createElement('div');
      vizHost.innerHTML = '';
      vizHost.appendChild(ctrlHost);
      const v = document.createElement('div');
      vizHost.appendChild(v);
      const keep = vizHost; vizHost = v;
      draw2();
      vizHost = keep;
      return;
    }
    draw2();
  }
  function draw2() {
    if (mode === 'build') { buildLeft(); buildRight(); refreshBuild(false); }
    else if (mode === 'filter') { filterLeft(); filterRight(); refreshFilter(false); }
    else { viterbiLeft(); viterbiRight(); refreshViterbi(false); }
    icons();
  }

  window.HMMLab = {
    renderConstruction: col => { mode = 'build'; vizHost = col; draw(); },
    renderFiltering: col => { mode = 'filter'; vizHost = col; draw(); },
    renderViterbi: col => { mode = 'viterbi'; vizHost = col; draw(); },
    forward: (id, ev, k) => forward(params[EXAMPLES.findIndex(e => e.id === id)], ev, k || 0),
    viterbi: (id, ev) => viterbi(params[EXAMPLES.findIndex(e => e.id === id)], ev)
  };
})();
