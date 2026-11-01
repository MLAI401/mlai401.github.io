/**
 * shallow_nn_lab.js — Topic 06 · Tab 4 · Shallow Neural Network Lab (XOR)
 * for learning.html (same pattern as naive_bayes_lab.js).
 *
 *   Network : 2 inputs → H hidden units (g = ReLU | sigmoid | tanh, H = 1…8,
 *             default 2) → 1 sigmoid output. Biases everywhere.
 *   Loss    : binary cross-entropy, averaged over the examples in the update.
 *   Training: explicit forward pass, analytical backpropagation and plain
 *             gradient descent. Default batch = all four XOR examples.
 *
 *   Concept chips (each is a "mode" of ONE shared state, so every view shows
 *   the same parameters θ⁽ᵗ⁾ at the same training step t):
 *     • 'forward'  — x → z → h → z_o → ŷ → L for the selected example
 *     • 'backward' — g′(z), error signals δ, per-example vs averaged
 *                    gradients, finite-difference gradient check
 *     • 'update'   — new value = old value − η × gradient for every parameter
 *     • 'train'    — decision boundary, loss history, predictions, weights
 *     • 'compare'  — ReLU / sigmoid / tanh from identical initial weights,
 *                    data, η and training budget; seed + η sweeps
 *
 * Equations (match topic06_reading.html §2.2–2.4):
 *   z_j = W1[j,1]·x₁ + W1[j,2]·x₂ + b1[j]      h_j = g(z_j)
 *   z_o = Σ_j W2[j]·h_j + b2                   ŷ = σ(z_o)
 *   L   = −[y log ŷ + (1−y) log(1−ŷ)]
 *       = max(z_o,0) − z_o·y + log(1 + e^(−|z_o|))     ← stable form used
 *   δ_o = ∂L/∂z_o = ŷ − y
 *   ∂L/∂W2[j] = δ_o·h_j      ∂L/∂b2 = δ_o
 *   δ_j = δ_o·W2[j]·g′(z_j)
 *   ∂L/∂W1[j,k] = δ_j·x_k    ∂L/∂b1[j] = δ_j
 *   θ ← θ − η · ḡ,  ḡ = (1/|B|) Σ_{i∈B} ∂Lᵢ/∂θ
 *
 * Conventions:
 *   • ReLU′(0) = 0 during training (sub-gradient choice).
 *   • σ(z) is evaluated piecewise (no overflow for large |z|).
 *   • Gradient check: central differences, ε = 1e-5, on the same objective
 *     used for the update. Parameters feeding a ReLU unit whose |z| < 1e-3 on
 *     any example in the batch are skipped (the kink is not differentiable).
 *   • Initialisation depends only on (seed, H): W1, W2 ~ N(0, 1),
 *     b1 ~ N(0, 0.5²), b2 = 0. Changing the activation keeps identical
 *     initial weights.
 *
 * Exposes window.ShallowNNLab = { render(col, mode), _engine }.
 */
(function () {
  'use strict';

  // ===========================================================================
  // Engine (pure functions — no DOM)
  // ===========================================================================
  const X = [[0, 0], [0, 1], [1, 0], [1, 1]];
  const Y = [0, 1, 1, 0];
  const XLBL = ['(0,0)', '(0,1)', '(1,0)', '(1,1)'];
  const ACT_KEYS = ['relu', 'sigmoid', 'tanh'];
  const LRS = [0.01, 0.02, 0.05, 0.1, 0.2, 0.3, 0.5, 0.75, 1, 1.5, 2, 3, 5, 8, 10];
  const GC_EPS = 1e-5, KINK_TOL = 1e-3;

  function sigmoid(z) {
    if (z >= 0) return 1 / (1 + Math.exp(-z));
    const e = Math.exp(z);
    return e / (1 + e);
  }
  // BCE written in terms of the logit z: no log(0), no overflow.
  function bceLogit(z, y) { return Math.max(z, 0) - z * y + Math.log1p(Math.exp(-Math.abs(z))); }

  const ACT = {
    relu: {
      name: 'ReLU', color: '#8b5cf6', dmax: 1,
      f: z => (z > 0 ? z : 0),
      d: z => (z > 0 ? 1 : 0),           // ReLU′(0) = 0 convention
      fTex: 'max(0, z)', dTex: '1 if z > 0, else 0  (ReLU′(0) = 0)',
      dFrom: (z, h) => `z ${z > 0 ? '>' : '≤'} 0 ⇒ ${z > 0 ? 1 : 0}`
    },
    sigmoid: {
      name: 'Sigmoid', color: '#f59e0b', dmax: 0.25,
      f: sigmoid,
      d: z => { const s = sigmoid(z); return s * (1 - s); },
      fTex: '1 / (1 + e^(−z))', dTex: 'σ(z)·(1 − σ(z)) = h(1 − h), max 0.25',
      dFrom: (z, h) => `h(1−h) = ${fmt(h)}·${fmt(1 - h)}`
    },
    tanh: {
      name: 'Tanh', color: '#0891b2', dmax: 1,
      f: Math.tanh,
      d: z => { const t = Math.tanh(z); return 1 - t * t; },
      fTex: '(e^z − e^(−z)) / (e^z + e^(−z))', dTex: '1 − tanh²(z) = 1 − h², max 1',
      dFrom: (z, h) => `1 − h² = 1 − ${par(h)}²`
    }
  };

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(r) { let u = 0; while (u === 0) u = r(); const v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

  function initParams(seed, H) {
    const r = mulberry32((seed * 2654435761) >>> 0);
    const W = [], b = [], v = [];
    for (let j = 0; j < H; j++) W.push([gauss(r), gauss(r)]);
    for (let j = 0; j < H; j++) b.push(gauss(r) * 0.5);
    for (let j = 0; j < H; j++) v.push(gauss(r));
    return { W, b, v, c: 0 };
  }
  function cloneP(p) { return { W: p.W.map(w => w.slice()), b: p.b.slice(), v: p.v.slice(), c: p.c }; }

  // Flat parameter list, in display order: per hidden unit W1[j,1], W1[j,2], b1[j]; then W2[j]; then b2.
  function paramList(H) {
    const L = [];
    for (let j = 0; j < H; j++) {
      L.push({ id: `W1_${j}_0`, lbl: `W1[${j + 1},1]`, layer: 'h', j, get: p => p.W[j][0], set: (p, x) => { p.W[j][0] = x; } });
      L.push({ id: `W1_${j}_1`, lbl: `W1[${j + 1},2]`, layer: 'h', j, get: p => p.W[j][1], set: (p, x) => { p.W[j][1] = x; } });
      L.push({ id: `b1_${j}`, lbl: `b1[${j + 1}]`, layer: 'h', j, get: p => p.b[j], set: (p, x) => { p.b[j] = x; } });
    }
    for (let j = 0; j < H; j++) L.push({ id: `W2_${j}`, lbl: `W2[${j + 1}]`, layer: 'o', j, get: p => p.v[j], set: (p, x) => { p.v[j] = x; } });
    L.push({ id: 'b2', lbl: 'b2', layer: 'o', j: -1, get: p => p.c, set: (p, x) => { p.c = x; } });
    return L;
  }

  function forward(p, act, i) {
    const x = X[i], y = Y[i], A = ACT[act], H = p.b.length;
    const z = [], h = [];
    for (let j = 0; j < H; j++) { z.push(p.W[j][0] * x[0] + p.W[j][1] * x[1] + p.b[j]); h.push(A.f(z[j])); }
    let zo = p.c;
    for (let j = 0; j < H; j++) zo += p.v[j] * h[j];
    const yhat = sigmoid(zo);
    return { i, x, y, z, h, zo, yhat, loss: bceLogit(zo, y) };
  }

  // Analytical backprop for one example → gradient object with the same shape as params.
  function backward(p, act, fw) {
    const A = ACT[act], H = p.b.length;
    const dOut = fw.yhat - fw.y;
    const gp = fw.z.map(A.d), dh = [], dz = [];
    const g = { W: [], b: [], v: [], c: dOut };
    for (let j = 0; j < H; j++) {
      g.v.push(dOut * fw.h[j]);
      dh.push(dOut * p.v[j]);
      dz.push(dh[j] * gp[j]);
      g.W.push([dz[j] * fw.x[0], dz[j] * fw.x[1]]);
      g.b.push(dz[j]);
    }
    return { dOut, gp, dh, dz, g };
  }

  function zeroG(H) { return { W: Array.from({ length: H }, () => [0, 0]), b: Array(H).fill(0), v: Array(H).fill(0), c: 0 }; }
  function addScaled(acc, g, s) {
    for (let j = 0; j < acc.b.length; j++) {
      acc.W[j][0] += s * g.W[j][0]; acc.W[j][1] += s * g.W[j][1];
      acc.b[j] += s * g.b[j]; acc.v[j] += s * g.v[j];
    }
    acc.c += s * g.c;
  }

  // Everything the views need for one parameter vector.
  function analyze(p, act, batch) {
    const H = p.b.length;
    const fws = [0, 1, 2, 3].map(i => forward(p, act, i));
    const bws = fws.map(fw => backward(p, act, fw));
    const avg = zeroG(H);
    batch.forEach(i => addScaled(avg, bws[i].g, 1 / batch.length));
    const meanLoss = fws.reduce((s, f) => s + f.loss, 0) / 4;
    const batchLoss = batch.reduce((s, i) => s + fws[i].loss, 0) / batch.length;
    const acc = fws.filter(f => (f.yhat >= 0.5 ? 1 : 0) === f.y).length;
    return { fws, bws, avg, meanLoss, batchLoss, acc };
  }

  function gradNorms(g) {
    let h = 0, o = g.c * g.c;
    for (let j = 0; j < g.b.length; j++) { h += g.W[j][0] ** 2 + g.W[j][1] ** 2 + g.b[j] ** 2; o += g.v[j] ** 2; }
    return { h: Math.sqrt(h), o: Math.sqrt(o) };
  }

  function applyUpdate(p, g, lr) {
    const q = cloneP(p);
    for (let j = 0; j < q.b.length; j++) {
      q.W[j][0] -= lr * g.W[j][0]; q.W[j][1] -= lr * g.W[j][1];
      q.b[j] -= lr * g.b[j]; q.v[j] -= lr * g.v[j];
    }
    q.c -= lr * g.c;
    return q;
  }

  function batchLossOf(p, act, batch) { return batch.reduce((s, i) => s + forward(p, act, i).loss, 0) / batch.length; }

  // Finite-difference check of ḡ (the gradient actually used for the update).
  function gradCheck(p, act, batch, avg) {
    const H = p.b.length, list = paramList(H);
    const kinkUnits = new Set();
    if (act === 'relu') batch.forEach(i => forward(p, act, i).z.forEach((z, j) => { if (Math.abs(z) < KINK_TOL) kinkUnits.add(j); }));
    let worst = 0, skipped = 0;
    const rows = list.map(par => {
      const a = gget(avg, par);
      if (par.layer === 'h' && kinkUnits.has(par.j)) { skipped++; return { par, a, n: NaN, rel: NaN, status: 'skip' }; }
      const q = cloneP(p), v0 = par.get(p);
      par.set(q, v0 + GC_EPS); const Lp = batchLossOf(q, act, batch);
      par.set(q, v0 - GC_EPS); const Lm = batchLossOf(q, act, batch);
      const n = (Lp - Lm) / (2 * GC_EPS);
      const diff = Math.abs(a - n);
      const both0 = Math.abs(a) + Math.abs(n) < 1e-12;
      const rel = both0 ? 0 : diff / (Math.abs(a) + Math.abs(n));
      const ok = diff < 1e-9 || rel < 1e-5;
      worst = Math.max(worst, rel);
      return { par, a, n, rel, both0, status: ok ? 'pass' : 'fail' };
    });
    return { rows, worst, skipped, kinkUnits: [...kinkUnits], fails: rows.filter(r => r.status === 'fail').length };
  }
  function gget(g, par) {
    if (par.id === 'b2') return g.c;
    const [k, j, c] = par.id.split('_');
    if (k === 'W1') return g.W[+j][+c];
    if (k === 'b1') return g.b[+j];
    return g.v[+j];
  }

  // Hidden-unit diagnostics over all four inputs.
  function unitDiag(p, act, fws) {
    const A = ACT[act], H = p.b.length, out = [];
    for (let j = 0; j < H; j++) {
      const zs = fws.map(f => f.z[j]);
      const ds = zs.map(A.d);
      const rel = ds.map(d => d / A.dmax);
      out.push({
        j, zs, ds,
        meanD: ds.reduce((s, d) => s + d, 0) / 4,
        inactive: act === 'relu' ? zs.filter(z => z <= 0).length : 0,
        dead: act === 'relu' && zs.every(z => z <= 0),
        satPairs: act !== 'relu' ? rel.filter(r => r < 0.1).length : 0,
        saturated: act !== 'relu' && rel.every(r => r < 0.1)
      });
    }
    return out;
  }

  // Headless training run (used by the comparison view).
  function simulate(cfg) {
    const { seed, H, act, lr, steps, batchMode } = cfg;
    let p = initParams(seed, H);
    const p0 = cloneP(p);
    const loss = [], gh = [], go = [];
    let tHit = -1, cyc = 0;
    const a0 = analyze(p, act, [0, 1, 2, 3]);
    for (let t = 0; t < steps; t++) {
      const batch = batchMode === 'full' ? [0, 1, 2, 3] : [cyc];
      const a = analyze(p, act, batch);
      loss.push(a.meanLoss);
      if (tHit < 0 && a.meanLoss < 0.1) tHit = t;
      const n = gradNorms(a.avg); gh.push(n.h); go.push(n.o);
      p = applyUpdate(p, a.avg, lr);
      cyc = (cyc + 1) % 4;
    }
    const aEnd = analyze(p, act, [0, 1, 2, 3]);
    loss.push(aEnd.meanLoss);
    if (tHit < 0 && aEnd.meanLoss < 0.1) tHit = steps;
    return {
      act, p0, p, loss, gh, go, tHit,
      L0: a0.meanLoss, Lend: aEnd.meanLoss, acc: aEnd.acc,
      diag0: unitDiag(p0, act, a0.fws), diagEnd: unitDiag(p, act, aEnd.fws),
      gh0: gh[0], ghEarly: mean(gh.slice(0, 50))
    };
  }
  function mean(a) { return a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0; }
  function median(a) { if (!a.length) return NaN; const s = a.slice().sort((x, y) => x - y); return s[s.length >> 1]; }

  // ===========================================================================
  // Formatting helpers
  // ===========================================================================
  function fmt(x, d = 4) {
    if (x === undefined || x === null || Number.isNaN(x)) return '—';
    if (!Number.isFinite(x)) return x > 0 ? '∞' : '−∞';
    if (x === 0 || Object.is(x, -0)) return '0';
    const ax = Math.abs(x);
    let s = (ax < 1e-4 || ax >= 1e5) ? x.toExponential(2) : x.toFixed(d);
    return s.replace('-', '−');
  }
  function par(x, d) { return x < 0 ? `(${fmt(x, d)})` : fmt(x, d); }
  function fmtLr(x) { return String(x); }
  function sgnCls(x) { return x > 0 ? 'pos' : x < 0 ? 'neg' : 'zero'; }

  // ===========================================================================
  // State (shared by every mode)
  // ===========================================================================
  const DEFAULTS = { act: 'relu', H: 2, seed: 7, lrIdx: LRS.indexOf(1), batchMode: 'full', sel: 1, speed: 5 };
  const state = Object.assign({}, DEFAULTS, {
    p: null, t: 0, hist: [], gnHist: [], last: null, running: false, cmp: null, cmpBudget: 1000, sweep: null, lrSweep: null
  });
  let mode = 'forward', ctrlHost = null, vizHost = null, raf = 0, lastPaint = 0;

  const lr = () => LRS[state.lrIdx];
  const batch = () => (state.batchMode === 'full' ? [0, 1, 2, 3] : [state.sel]);
  const cfgKey = () => `${state.seed}|${state.H}|${state.lrIdx}|${state.batchMode}|${state.cmpBudget}`;

  function reset() {
    stop();
    state.p = initParams(state.seed, state.H);
    state.t = 0; state.last = null;
    const a = analyze(state.p, state.act, [0, 1, 2, 3]);
    state.hist = [a.meanLoss]; state.gnHist = [];
  }

  function doStep(n = 1) {
    for (let k = 0; k < n; k++) {
      const b = batch();
      const a = analyze(state.p, state.act, b);
      const list = paramList(state.H);
      const before = cloneP(state.p);
      state.p = applyUpdate(state.p, a.avg, lr());
      state.gnHist.push(gradNorms(a.avg));
      if (k === n - 1) {
        state.last = {
          t: state.t, lr: lr(), batch: b, mode: state.batchMode,
          rows: list.map(pr => ({ lbl: pr.lbl, old: pr.get(before), g: gget(a.avg, pr), nw: pr.get(state.p) }))
        };
      }
      state.t++;
      if (state.batchMode === 'single') state.sel = (state.sel + 1) % 4;
      state.hist.push(analyze(state.p, state.act, [0, 1, 2, 3]).meanLoss);
    }
    if (state.hist.length > 60000) { state.hist = state.hist.slice(-60000); }
  }

  function start() {
    if (state.running) return;
    state.running = true; lastPaint = 0;
    const loop = ts => {
      if (!state.running) return;
      if (!vizHost || !ctrlHost || !document.body.contains(vizHost) || !document.body.contains(ctrlHost)) { state.running = false; buildControlsSafe(); return; }
      doStep(state.speed);
      if (ts - lastPaint > 60) { lastPaint = ts; update(); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }
  function buildControlsSafe() { if (ctrlHost && document.body.contains(ctrlHost)) buildControls(); }
  function stop() { state.running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }

  // ===========================================================================
  // SVG / canvas drawing
  // ===========================================================================
  function netSVG(a, opt) {
    // opt.edge: 'w' (weights) | 'g' (averaged gradients); nodes show the selected example.
    const p = state.p, H = state.H, fw = a.fws[state.sel], bw = a.bws[state.sel];
    const Wd = 460, rowH = H <= 3 ? 74 : H <= 5 ? 52 : 40;
    const Ht = Math.max(170, rowH * H + 50);
    const xi = 60, xh = 235, xo = 405;
    const yIn = [Ht / 2 - 45, Ht / 2 + 45];
    const yH = Array.from({ length: H }, (_, j) => Ht / 2 + (j - (H - 1) / 2) * rowH);
    const yO = Ht / 2;
    const r = H <= 5 ? 19 : 15;
    const vals = opt.edge === 'g' ? a.avg : p;
    const mx = Math.max(1e-9, ...vals.W.flat().map(Math.abs), ...vals.v.map(Math.abs));
    const showLbl = H <= 4;
    const edge = (x1, y1, x2, y2, w, t) => {
      const wd = 0.8 + 4.2 * Math.min(1, Math.abs(w) / mx);
      const col = w > 0 ? '#2563eb' : w < 0 ? '#e11d48' : '#94a3b8';
      const lx = x1 + (x2 - x1) * t, ly = y1 + (y2 - y1) * t;
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-opacity="0.55" stroke-width="${wd.toFixed(2)}"><title>${fmt(w)}</title></line>` +
        (showLbl ? `<text x="${lx}" y="${ly - 3}" class="snn-elbl" fill="${col}">${fmt(w, opt.edge === 'g' ? 4 : 2)}</text>` : '');
    };
    let s = `<svg viewBox="0 0 ${Wd} ${Ht}" class="snn-net" role="img" aria-label="Network diagram">`;
    for (let j = 0; j < H; j++) for (let k = 0; k < 2; k++) s += edge(xi + r, yIn[k], xh - r, yH[j], vals.W[j][k], k === 0 ? 0.3 : 0.3);
    for (let j = 0; j < H; j++) s += edge(xh + r, yH[j], xo - r, yO, vals.v[j], 0.55);
    const diag = unitDiag(p, state.act, a.fws);
    // input nodes
    for (let k = 0; k < 2; k++) {
      s += `<circle cx="${xi}" cy="${yIn[k]}" r="${r}" class="snn-node in"/>` +
        `<text x="${xi}" y="${yIn[k] + 4}" class="snn-nv">${fw.x[k]}</text>` +
        `<text x="${xi - r - 6}" y="${yIn[k] + 4}" class="snn-nl" text-anchor="end">x${k + 1}</text>`;
    }
    // hidden nodes
    for (let j = 0; j < H; j++) {
      const hv = fw.h[j];
      const inten = state.act === 'relu' ? Math.min(1, hv / 2) : state.act === 'sigmoid' ? hv : Math.abs(hv);
      const flag = diag[j].dead ? 'dead' : diag[j].saturated ? 'sat' : '';
      const top = opt.edge === 'g' ? `δ${sub(j + 1)}=${fmt(bw.dz[j], 3)}` : `b=${fmt(p.b[j], 2)}`;
      s += `<circle cx="${xh}" cy="${yH[j]}" r="${r}" class="snn-node hid ${flag}" style="--i:${inten.toFixed(3)}"/>` +
        `<text x="${xh}" y="${yH[j] + 4}" class="snn-nv">${fmt(hv, 2)}</text>` +
        `<text x="${xh}" y="${yH[j] - r - 4}" class="snn-nb">${top}</text>` +
        `<text x="${xh + r + 4}" y="${yH[j] + r + 2}" class="snn-nl">h${sub(j + 1)}${flag === 'dead' ? ' · inactive' : flag === 'sat' ? ' · saturated' : ''}</text>`;
    }
    // output node
    const ot = opt.edge === 'g' ? `δo=${fmt(bw.dOut, 3)}` : `b2=${fmt(p.c, 2)}`;
    s += `<circle cx="${xo}" cy="${yO}" r="${r + 3}" class="snn-node out" style="--i:${fw.yhat.toFixed(3)}"/>` +
      `<text x="${xo}" y="${yO + 4}" class="snn-nv">${fmt(fw.yhat, 2)}</text>` +
      `<text x="${xo}" y="${yO - r - 8}" class="snn-nb">${ot}</text>` +
      `<text x="${xo}" y="${yO + r + 17}" class="snn-nl" text-anchor="middle">ŷ = σ(z_o)</text>`;
    s += '</svg>';
    return s;
  }
  function sub(n) { return String(n).split('').map(c => '₀₁₂₃₄₅₆₇₈₉'[+c]).join(''); }

  // Activation (or derivative) curve with each hidden unit's z for the selected example.
  function actPlot(act, which, fw, allFws) {
    const A = ACT[act], f = which === 'd' ? A.d : A.f;
    const W = 300, Hh = 150, pad = 26, zMin = -6, zMax = 6;
    const yMin = which === 'd' ? 0 : act === 'tanh' ? -1.1 : act === 'sigmoid' ? -0.05 : -0.3;
    const yMax = which === 'd' ? (act === 'sigmoid' ? 0.3 : 1.15) : act === 'relu' ? 6 : 1.1;
    const sx = z => pad + (z - zMin) / (zMax - zMin) * (W - pad - 8);
    const sy = y => 8 + (1 - (y - yMin) / (yMax - yMin)) * (Hh - 8 - 20);
    let d = '';
    for (let k = 0; k <= 240; k++) {
      const z = zMin + (zMax - zMin) * k / 240;
      let y = f(z); y = Math.max(yMin, Math.min(yMax, y));
      d += (k ? 'L' : 'M') + sx(z).toFixed(1) + ' ' + sy(y).toFixed(1);
    }
    let s = `<svg viewBox="0 0 ${W} ${Hh}" class="snn-plot">`;
    s += `<line x1="${sx(0)}" y1="6" x2="${sx(0)}" y2="${Hh - 20}" class="snn-axis"/><line x1="${pad}" y1="${sy(0)}" x2="${W - 8}" y2="${sy(0)}" class="snn-axis"/>`;
    [-6, -3, 0, 3, 6].forEach(z => { s += `<text x="${sx(z)}" y="${Hh - 6}" class="snn-tick" text-anchor="middle">${z}</text>`; });
    s += `<text x="${pad - 4}" y="${sy(yMax) + 8}" class="snn-tick" text-anchor="end">${which === 'd' ? fmt(yMax, 2) : fmt(yMax, 1)}</text>`;
    s += `<path d="${d}" fill="none" stroke="${A.color}" stroke-width="2.4"/>`;
    // ghost markers for the other examples
    (allFws || []).forEach(f2 => {
      if (f2.i === fw.i) return;
      f2.z.forEach(z => {
        const zc = Math.max(zMin, Math.min(zMax, z));
        s += `<circle cx="${sx(zc)}" cy="${sy(Math.max(yMin, Math.min(yMax, f(z))))}" r="2.6" class="snn-ghost"/>`;
      });
    });
    fw.z.forEach((z, j) => {
      const zc = Math.max(zMin, Math.min(zMax, z));
      const y = Math.max(yMin, Math.min(yMax, f(z)));
      s += `<circle cx="${sx(zc)}" cy="${sy(y)}" r="5" class="snn-mark"/><text x="${sx(zc) + 7}" y="${sy(y) - 6}" class="snn-mlbl">h${sub(j + 1)}${z !== zc ? (z > 0 ? '→' : '←') : ''}</text>`;
    });
    s += '</svg>';
    return s;
  }

  // Multi-series line chart (log y by default).
  function lineChart(series, opt = {}) {
    const W = opt.w || 420, Hh = opt.h || 180, pl = 44, pr = 10, pt = 10, pb = 24;
    const all = series.flatMap(s => s.data).filter(v => Number.isFinite(v) && v > 0);
    if (!all.length) return '<div class="tfp-empty">No data yet.</div>';
    const n = Math.max(...series.map(s => s.data.length)) - 1 || 1;
    let lo = Math.min(...all), hi = Math.max(...all);
    if (opt.refLine) { lo = Math.min(lo, opt.refLine.v); hi = Math.max(hi, opt.refLine.v); }
    lo = Math.pow(10, Math.floor(Math.log10(lo))); hi = Math.pow(10, Math.ceil(Math.log10(hi)));
    if (hi / lo < 100) lo = hi / 100;
    const sx = t => pl + t / n * (W - pl - pr);
    const sy = v => pt + (1 - (Math.log10(Math.max(v, lo)) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo))) * (Hh - pt - pb);
    let s = `<svg viewBox="0 0 ${W} ${Hh}" class="snn-plot">`;
    for (let e = Math.log10(lo); e <= Math.log10(hi) + 1e-9; e++) {
      const v = Math.pow(10, e);
      s += `<line x1="${pl}" x2="${W - pr}" y1="${sy(v)}" y2="${sy(v)}" class="snn-grid"/><text x="${pl - 4}" y="${sy(v) + 3}" class="snn-tick" text-anchor="end">${v >= 1 ? v : v.toExponential(0).replace('-', '−')}</text>`;
    }
    [0, 0.5, 1].forEach(fr => { const t = Math.round(n * fr); s += `<text x="${sx(t)}" y="${Hh - 6}" class="snn-tick" text-anchor="middle">${(opt.t0 || 0) + t}</text>`; });
    if (opt.refLine) s += `<line x1="${pl}" x2="${W - pr}" y1="${sy(opt.refLine.v)}" y2="${sy(opt.refLine.v)}" class="snn-ref"/><text x="${W - pr - 2}" y="${sy(opt.refLine.v) - 3}" class="snn-tick" text-anchor="end">${opt.refLine.lbl}</text>`;
    series.forEach(se => {
      const dat = se.data, step = Math.max(1, Math.floor(dat.length / 500));
      let d = '';
      for (let t = 0; t < dat.length; t += step) d += (t ? 'L' : 'M') + sx(t).toFixed(1) + ' ' + sy(dat[t]).toFixed(1);
      const tl = dat.length - 1; d += 'L' + sx(tl).toFixed(1) + ' ' + sy(dat[tl]).toFixed(1);
      s += `<path d="${d}" fill="none" stroke="${se.color}" stroke-width="2" ${se.dash ? 'stroke-dasharray="4 3"' : ''}/>`;
      if (se.marker !== undefined) s += `<circle cx="${sx(se.marker)}" cy="${sy(dat[se.marker])}" r="4" fill="${se.color}" stroke="#fff" stroke-width="1.5"/>`;
    });
    s += '</svg>';
    return s;
  }

  // Decision boundary: P(y=1 | x) heat map, 0.5 contour, hidden-unit lines z_j = 0.
  function drawBoundary(canvas, p, act, opt = {}) {
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const css = canvas.clientWidth || 260;
    canvas.width = Math.round(css * dpr); canvas.height = Math.round(css * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const S = css, lo = -0.5, hi = 1.5, N = opt.small ? 44 : 70;
    const toPx = v => (v - lo) / (hi - lo) * S;
    const toPy = v => S - (v - lo) / (hi - lo) * S;
    const grid = [];
    for (let gy = 0; gy <= N; gy++) {
      const row = [];
      for (let gx = 0; gx <= N; gx++) {
        const x1 = lo + (hi - lo) * gx / N, x2 = lo + (hi - lo) * gy / N;
        let zo = p.c;
        for (let j = 0; j < p.b.length; j++) zo += p.v[j] * ACT[act].f(p.W[j][0] * x1 + p.W[j][1] * x2 + p.b[j]);
        row.push(sigmoid(zo));
      }
      grid.push(row);
    }
    const cw = S / N;
    // one pixel per grid cell, then scaled up smoothly (no seams between cells)
    const off = document.createElement('canvas'); off.width = N; off.height = N;
    const octx = off.getContext('2d'), img = octx.createImageData(N, N);
    for (let gy = 0; gy < N; gy++) for (let gx = 0; gx < N; gx++) {
      const pr = (grid[gy][gx] + grid[gy][gx + 1] + grid[gy + 1][gx] + grid[gy + 1][gx + 1]) / 4;
      const a = Math.min(1, Math.abs(pr - 0.5) * 2) * 0.55 + 0.05;
      const c = pr >= 0.5 ? [16, 185, 129] : [99, 102, 241];
      const o = ((N - 1 - gy) * N + gx) * 4;
      for (let k = 0; k < 3; k++) img.data[o + k] = Math.round(255 * (1 - a) + c[k] * a);
      img.data[o + 3] = 255;
    }
    octx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true; ctx.clearRect(0, 0, S, S); ctx.drawImage(off, 0, 0, S, S);
    // marching squares for p = 0.5
    ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2; ctx.beginPath();
    const interp = (a, b) => (0.5 - a) / ((b - a) || 1e-12);
    for (let gy = 0; gy < N; gy++) for (let gx = 0; gx < N; gx++) {
      const v0 = grid[gy][gx], v1 = grid[gy][gx + 1], v2 = grid[gy + 1][gx + 1], v3 = grid[gy + 1][gx];
      const pts = [];
      const X0 = gx * cw, Y0 = S - gy * cw;
      if ((v0 >= 0.5) !== (v1 >= 0.5)) pts.push([X0 + interp(v0, v1) * cw, Y0]);
      if ((v1 >= 0.5) !== (v2 >= 0.5)) pts.push([X0 + cw, Y0 - interp(v1, v2) * cw]);
      if ((v3 >= 0.5) !== (v2 >= 0.5)) pts.push([X0 + interp(v3, v2) * cw, Y0 - cw]);
      if ((v0 >= 0.5) !== (v3 >= 0.5)) pts.push([X0, Y0 - interp(v0, v3) * cw]);
      if (pts.length >= 2) { ctx.moveTo(pts[0][0], pts[0][1]); ctx.lineTo(pts[1][0], pts[1][1]); }
      if (pts.length === 4) { ctx.moveTo(pts[2][0], pts[2][1]); ctx.lineTo(pts[3][0], pts[3][1]); }
    }
    ctx.stroke();
    // hidden-unit hyperplanes z_j = 0
    if (!opt.small) {
      ctx.setLineDash([5, 4]); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(71,85,105,0.85)';
      ctx.font = '600 11px "JetBrains Mono", monospace'; ctx.fillStyle = '#334155';
      for (let j = 0; j < p.b.length; j++) {
        const [w1, w2] = p.W[j], b = p.b[j];
        const seg = clipLine(w1, w2, b, lo, hi);
        if (!seg) continue;
        ctx.beginPath(); ctx.moveTo(toPx(seg[0][0]), toPy(seg[0][1])); ctx.lineTo(toPx(seg[1][0]), toPy(seg[1][1])); ctx.stroke();
        const m = [(seg[0][0] * 0.8 + seg[1][0] * 0.2), (seg[0][1] * 0.8 + seg[1][1] * 0.2)];
        ctx.fillText('z' + sub(j + 1) + '=0', toPx(m[0]) + 4, toPy(m[1]) - 4);
      }
      ctx.setLineDash([]);
    }
    // grid ticks
    ctx.strokeStyle = 'rgba(15,23,42,0.15)'; ctx.lineWidth = 1;
    [0, 1].forEach(v => {
      ctx.beginPath(); ctx.moveTo(toPx(v), 0); ctx.lineTo(toPx(v), S); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, toPy(v)); ctx.lineTo(S, toPy(v)); ctx.stroke();
    });
    // XOR points
    X.forEach((x, i) => {
      let zo = p.c;
      for (let j = 0; j < p.b.length; j++) zo += p.v[j] * ACT[act].f(p.W[j][0] * x[0] + p.W[j][1] * x[1] + p.b[j]);
      const ok = (sigmoid(zo) >= 0.5 ? 1 : 0) === Y[i];
      const cx = toPx(x[0]), cy = toPy(x[1]), rr = opt.small ? 5 : 8;
      ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2);
      ctx.fillStyle = Y[i] ? '#10b981' : '#6366f1'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = ok ? '#ffffff' : '#e11d48'; ctx.stroke();
      if (!ok) { ctx.beginPath(); ctx.arc(cx, cy, rr + 3.5, 0, Math.PI * 2); ctx.strokeStyle = '#e11d48'; ctx.lineWidth = 1.6; ctx.stroke(); }
      if (!opt.small && i === state.sel && opt.sel) { ctx.beginPath(); ctx.arc(cx, cy, rr + 7, 0, Math.PI * 2); ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2; ctx.stroke(); }
    });
  }
  function clipLine(w1, w2, b, lo, hi) {
    const pts = [];
    if (Math.abs(w2) > 1e-12) { [lo, hi].forEach(x => { const y = -(w1 * x + b) / w2; if (y >= lo - 1e-9 && y <= hi + 1e-9) pts.push([x, y]); }); }
    if (Math.abs(w1) > 1e-12) { [lo, hi].forEach(y => { const x = -(w2 * y + b) / w1; if (x >= lo - 1e-9 && x <= hi + 1e-9) pts.push([x, y]); }); }
    return pts.length >= 2 ? [pts[0], pts[pts.length - 1]] : null;
  }

  // ===========================================================================
  // Controls (concept column)
  // ===========================================================================
  const HINTS = {
    forward: 'Pick an example under <b>Selected example</b> and follow x → z → h → z<sub>o</sub> → ŷ → L. Then switch the hidden activation: the weights stay identical (same seed), only g changes — so every difference you see comes from g.',
    backward: 'The label y enters only through δ<sub>o</sub> = ŷ − y. Every hidden signal δ<sub>j</sub> is multiplied by g′(z<sub>j</sub>): where g′ is small (saturated sigmoid/tanh) or 0 (inactive ReLU), the gradients into that unit shrink or vanish. The check at the bottom confirms each gradient numerically.',
    update: 'Each row is one parameter: new = old − η × gradient. Press <b>Step</b> — the “new” column becomes the current parameters and t advances. Compare η = 0.1 with η = 5 on the predicted loss change.',
    train: 'Press <b>Train</b> and watch the black 0.5-contour bend around the XOR corners. The dashed lines are where each hidden unit switches (z<sub>j</sub> = 0). Try seed 3 and seed 5 with each activation, and several η values.',
    compare: 'All three runs share the same seed, width, initial weights, data, η and number of updates — only g differs. Use the sweeps: rankings change with the seed and the learning rate, so look for <i>why</i> a run stalls rather than for a single winner.'
  };

  function buildControls() {
    const a = analyze(state.p, state.act, batch());
    ctrlHost.innerHTML = `
      <div class="tfp snn-ctrl">
        <div class="tfp-sec">
          <div class="tfp-sec-head"><span class="tfp-sec-title"><i data-lucide="network"></i> Network <span class="tfp-sub">2 → H → 1 · output σ + BCE fixed</span></span></div>
          <div class="snn-field"><span class="tfp-lbl">Hidden activation <i class="snn-sym">g</i></span>
            <div class="tfp-seg snn-act">${ACT_KEYS.map(k => `<button class="${state.act === k ? 'active' : ''}" data-act="act" data-k="${k}"><span class="snn-sw" style="background:${ACT[k].color}"></span>${ACT[k].name}</button>`).join('')}</div></div>
          <div class="snn-grid2">
            <div class="snn-field"><span class="tfp-lbl">Hidden width <i class="snn-sym">H</i></span>
              <div class="snn-stepper"><button class="tfp-btn" data-act="H" data-k="-1" ${state.H <= 1 ? 'disabled' : ''}>−</button><b>${state.H}</b><button class="tfp-btn" data-act="H" data-k="1" ${state.H >= 8 ? 'disabled' : ''}>+</button></div></div>
            <div class="snn-field"><span class="tfp-lbl">Random seed</span>
              <div class="snn-stepper"><button class="tfp-btn" data-act="seed" data-k="-1">−</button><input type="number" class="snn-seed" id="snn-seed" value="${state.seed}" min="0" max="99999"><button class="tfp-btn" data-act="seed" data-k="1">+</button></div></div>
          </div>
          <div class="tfp-hint">Initial weights depend only on the seed and H, so every activation starts from <b>identical</b> W1, b1, W2, b2.</div>
        </div>

        <div class="tfp-sec">
          <div class="tfp-sec-head"><span class="tfp-sec-title"><i data-lucide="activity"></i> Training</span><span class="tfp-stats" id="snn-stats"></span></div>
          <div class="snn-field"><span class="tfp-lbl">Learning rate <i class="snn-sym">η</i></span>
            <div class="tfp-row"><input type="range" min="0" max="${LRS.length - 1}" step="1" value="${state.lrIdx}" id="snn-lr" class="evo-range"><b class="evo-rv" id="snn-lr-v">${fmtLr(lr())}</b></div></div>
          <div class="snn-field"><span class="tfp-lbl">Examples per update</span>
            <div class="tfp-seg"><button class="${state.batchMode === 'full' ? 'active' : ''}" data-act="batch" data-k="full">All 4 (averaged)</button><button class="${state.batchMode === 'single' ? 'active' : ''}" data-act="batch" data-k="single">One example (cycles)</button></div></div>
          <div class="tfp-row">
            <button class="tfp-btn" data-act="reset" title="Re-initialise from the seed"><i data-lucide="rotate-ccw"></i>Reset</button>
            <button class="tfp-btn" data-act="step" ${state.running ? 'disabled' : ''}><i data-lucide="step-forward"></i>Step</button>
            <button class="tfp-btn" data-act="step100" ${state.running ? 'disabled' : ''}>+100</button>
            <button class="tfp-btn ${state.running ? 'on' : 'primary'}" data-act="run"><i data-lucide="${state.running ? 'pause' : 'play'}"></i>${state.running ? 'Pause' : 'Train'}</button>
            <label class="tfp-sel-wrap">speed <select class="tfp-select" id="snn-speed">${[1, 5, 25, 100].map(v => `<option value="${v}" ${state.speed === v ? 'selected' : ''}>${v}/frame</option>`).join('')}</select></label>
          </div>
        </div>

        <div class="tfp-sec">
          <div class="tfp-sec-head"><span class="tfp-sec-title"><i data-lucide="mouse-pointer-click"></i> Selected example <span class="tfp-sub">traced in Forward / Backward</span></span></div>
          <div class="snn-xs" id="snn-xs">${xButtons(a)}</div>
          ${state.batchMode === 'single' ? '<div class="tfp-hint">In one-example mode the next update uses the selected example; the selection advances after each step.</div>' : ''}
        </div>

        <div class="tfp-msg tfp-msg-step"><span class="tfp-msg-tag">Try</span><span>${HINTS[mode]}</span></div>

        <details class="snn-conv"><summary>Conventions used in this lab</summary>
          <ul>
            <li><b>ReLU′(0) = 0</b> during training (a valid sub-gradient).</li>
            <li>σ(z) is computed piecewise: z ≥ 0 → 1/(1+e<sup>−z</sup>), z &lt; 0 → e<sup>z</sup>/(1+e<sup>z</sup>).</li>
            <li>BCE is computed from the logit: L = max(z<sub>o</sub>,0) − z<sub>o</sub>y + log(1+e<sup>−|z<sub>o</sub>|</sup>), equal to −[y log ŷ + (1−y) log(1−ŷ)] but never log(0).</li>
            <li>Gradient check: central differences, ε = 10<sup>−5</sup>; parameters of a ReLU unit with |z| &lt; 10<sup>−3</sup> on a batch example are skipped (kink).</li>
            <li>Init: W1, W2 ~ N(0,1), b1 ~ N(0, 0.5²), b2 = 0.</li>
          </ul></details>
      </div>`;
    const sl = ctrlHost.querySelector('#snn-lr');
    sl.addEventListener('input', () => { state.lrIdx = +sl.value; ctrlHost.querySelector('#snn-lr-v').textContent = fmtLr(lr()); update(); });
    const sd = ctrlHost.querySelector('#snn-seed');
    sd.addEventListener('change', () => { const v = Math.max(0, Math.min(99999, parseInt(sd.value, 10) || 0)); state.seed = v; reset(); buildControls(); update(); });
    ctrlHost.querySelector('#snn-speed').addEventListener('change', e => { state.speed = +e.target.value; });
    ctrlHost.onclick = onCtrl;
    updateStats(a);
    icons();
  }

  function xButtons(a) {
    return [0, 1, 2, 3].map(i => `<button class="snn-xb ${state.sel === i ? 'active' : ''}" data-act="sel" data-k="${i}">
      <span class="snn-xb-x">x = ${XLBL[i]}</span><span class="snn-xb-y">y = ${Y[i]}</span>
      <span class="snn-xb-p ${((a.fws[i].yhat >= 0.5 ? 1 : 0) === Y[i]) ? 'ok' : 'bad'}">ŷ ${fmt(a.fws[i].yhat, 3)}</span></button>`).join('');
  }

  function updateStats(a) {
    const st = ctrlHost && ctrlHost.querySelector('#snn-stats');
    if (st) st.textContent = `t = ${state.t} · L̄ = ${fmt(a.meanLoss)} · ${a.acc}/4`;
    const xs = ctrlHost && ctrlHost.querySelector('#snn-xs');
    if (xs) xs.innerHTML = xButtons(a);
  }

  function onCtrl(e) {
    const b = e.target.closest('[data-act]');
    if (!b || b.disabled) return;
    const k = b.dataset.k;
    switch (b.dataset.act) {
      case 'act': if (state.act !== k) { state.act = k; reset(); } break;
      case 'H': state.H = Math.max(1, Math.min(8, state.H + +k)); reset(); break;
      case 'seed': state.seed = Math.max(0, state.seed + +k); reset(); break;
      case 'batch': state.batchMode = k; break;
      case 'reset': reset(); break;
      case 'step': doStep(1); break;
      case 'step100': doStep(100); break;
      case 'run': if (state.running) stop(); else start(); break;
      case 'sel': state.sel = +k; break;
      default: return;
    }
    buildControls(); update();
  }

  // ===========================================================================
  // Views (illustration column)
  // ===========================================================================
  function head(title, sub) {
    return `<div class="tfp-viz-head"><h3>${title}</h3><div class="tfp-stat-chips">
      <span class="snn-chip-t">step t = ${state.t}</span><span>g = ${ACT[state.act].name}</span><span>H = ${state.H}</span><span>η = ${fmtLr(lr())}</span></div></div>
      ${sub ? `<div class="tfp-hint">${sub}</div>` : ''}`;
  }

  function predTable(a) {
    return `<div class="tfp-table-wrap"><table class="tfp-table snn-pred"><thead><tr><th>x₁</th><th>x₂</th><th>y</th><th>ŷ = P(y=1|x)</th><th>class</th><th>loss Lᵢ</th></tr></thead><tbody>
      ${a.fws.map(f => { const c = f.yhat >= 0.5 ? 1 : 0; return `<tr class="${f.i === state.sel ? 'sel' : ''}"><td>${f.x[0]}</td><td>${f.x[1]}</td><td>${f.y}</td>
        <td><span class="snn-pbar"><span style="width:${(f.yhat * 100).toFixed(1)}%"></span></span>${fmt(f.yhat)}</td><td class="${c === f.y ? 'snn-ok' : 'snn-bad'}">${c} ${c === f.y ? '✓' : '✗'}</td><td>${fmt(f.loss)}</td></tr>`; }).join('')}
      <tr class="snn-tot"><td colspan="5" class="t">mean loss L̄ (all four)</td><td>${fmt(a.meanLoss)}</td></tr></tbody></table></div>`;
  }

  function viewForward(a) {
    const fw = a.fws[state.sel], A = ACT[state.act], p = state.p;
    const lines = [];
    fw.z.forEach((z, j) => {
      lines.push(['z' + sub(j + 1), `W1[${j + 1},1]·x₁ + W1[${j + 1},2]·x₂ + b1[${j + 1}] = ${par(p.W[j][0])}·${fw.x[0]} + ${par(p.W[j][1])}·${fw.x[1]} + ${par(p.b[j])} = <b>${fmt(z)}</b>`]);
    });
    fw.h.forEach((h, j) => {
      lines.push(['h' + sub(j + 1), `g(z${sub(j + 1)}) = ${state.act === 'relu' ? 'max(0, ' + fmt(fw.z[j]) + ')' : A.name.toLowerCase() + '(' + fmt(fw.z[j]) + ')'} = <b>${fmt(h)}</b>`]);
    });
    lines.push(['z_o', `${fw.h.map((h, j) => `W2[${j + 1}]·h${sub(j + 1)}`).join(' + ')} + b2 = ${fw.h.map((h, j) => `${par(p.v[j])}·${par(h)}`).join(' + ')} + ${par(p.c)} = <b>${fmt(fw.zo)}</b>`]);
    lines.push(['ŷ', `σ(z_o) = 1/(1+e<sup>−z_o</sup>) = <b>${fmt(fw.yhat)}</b>`]);
    lines.push(['L', `−[y log ŷ + (1−y) log(1−ŷ)] = −${fw.y ? 'log ' + fmt(fw.yhat) : 'log(1 − ' + fmt(fw.yhat) + ')'} = <b>${fmt(fw.loss)}</b>`]);
    return `<div class="tfp-viz snn-viz">
      ${head('Forward pass', `Selected example x = ${XLBL[state.sel]}, target y = ${fw.y}. Edge colour = weight sign (blue +, red −), width = |w|; node values are activations for this example.`)}
      <div class="tfp-card">${netSVG(a, { edge: 'w' })}</div>
      <div class="tfp-card"><div class="tfp-card-head"><h4>Calculations for x = ${XLBL[state.sel]}</h4><span class="tfp-card-sub">parameters θ⁽${supNum(state.t)}⁾</span></div>
        <div class="tfp-calc snn-calc">${lines.map(l => `<div class="tfp-calc-line ${l[0] === 'L' ? 'total' : ''}"><span class="tfp-calc-k">${l[0]}</span><span>${l[1]}</span></div>`).join('')}</div>
        <div class="tfp-hint snn-note">Computed stably from the logit: L = max(z_o,0) − z_o·y + log(1+e<sup>−|z_o|</sup>).</div></div>
      <div class="snn-two">
        <div class="tfp-card"><div class="tfp-card-head"><h4>g(z) = ${A.fTex}</h4></div>${actPlot(state.act, 'f', fw, a.fws)}
          <div class="tfp-hint">Large dots: this example; small dots: the other three inputs.</div></div>
        <div class="tfp-card"><div class="tfp-card-head"><h4>Hidden units on all four inputs</h4></div>${unitTable(a)}</div>
      </div>
      <div class="tfp-card"><div class="tfp-card-head"><h4>Predictions for all four XOR inputs</h4><span class="tfp-card-sub">${a.acc}/4 correct</span></div>${predTable(a)}</div>
    </div>`;
  }
  function supNum(n) { return String(n).split('').map(c => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+c]).join(''); }

  function unitTable(a) {
    const d = unitDiag(state.p, state.act, a.fws), A = ACT[state.act];
    return `<div class="tfp-table-wrap"><table class="tfp-table"><thead><tr><th>unit</th>${XLBL.map(l => `<th>z at ${l}</th>`).join('')}<th>mean g′</th><th>status</th></tr></thead><tbody>
      ${d.map(u => `<tr><td class="t">h${sub(u.j + 1)}</td>${u.zs.map((z, i) => `<td class="${(state.act === 'relu' && z <= 0) || (state.act !== 'relu' && u.ds[i] / A.dmax < 0.1) ? 'snn-dim' : ''} ${i === state.sel ? 'snn-selc' : ''}">${fmt(z, 2)}</td>`).join('')}
        <td>${fmt(u.meanD, 3)}</td><td>${u.dead ? '<span class="snn-tag bad">inactive on all 4</span>' : u.saturated ? '<span class="snn-tag warn">saturated on all 4</span>' : state.act === 'relu' && u.inactive ? `<span class="snn-tag">off on ${u.inactive}/4</span>` : state.act !== 'relu' && u.satPairs ? `<span class="snn-tag">saturated on ${u.satPairs}/4</span>` : '<span class="snn-tag ok">responsive</span>'}</td></tr>`).join('')}
      </tbody></table></div>
      <div class="tfp-hint">Grey z: ${state.act === 'relu' ? 'ReLU is off (z ≤ 0 → h = 0, g′ = 0)' : 'saturated (g′ below 10% of its maximum)'}.</div>`;
  }

  function viewBackward(a) {
    const fw = a.fws[state.sel], bw = a.bws[state.sel], A = ACT[state.act], p = state.p, H = state.H;
    const sig = [];
    sig.push(['δ_o', `∂L/∂z_o = ŷ − y = ${fmt(fw.yhat)} − ${fw.y} = <b>${fmt(bw.dOut)}</b>`]);
    for (let j = 0; j < H; j++) {
      sig.push([`g′(z${sub(j + 1)})`, `${state.act === 'relu' ? A.dFrom(fw.z[j]) : A.dFrom(fw.z[j], fw.h[j])} = <b>${fmt(bw.gp[j])}</b>`]);
      sig.push([`δ${sub(j + 1)}`, `δ_o · W2[${j + 1}] · g′(z${sub(j + 1)}) = ${par(bw.dOut)}·${par(p.v[j])}·${fmt(bw.gp[j])} = <b>${fmt(bw.dz[j])}</b>`]);
    }
    const list = paramList(H);
    const gl = list.map(pr => {
      let f;
      if (pr.id === 'b2') f = `δ_o = ${fmt(bw.dOut)}`;
      else if (pr.id.startsWith('W2')) f = `δ_o · h${sub(pr.j + 1)} = ${par(bw.dOut)}·${par(fw.h[pr.j])}`;
      else if (pr.id.startsWith('b1')) f = `δ${sub(pr.j + 1)} = ${fmt(bw.dz[pr.j])}`;
      else { const k = +pr.id.split('_')[2]; f = `δ${sub(pr.j + 1)} · x${sub(k + 1)} = ${par(bw.dz[pr.j])}·${fw.x[k]}`; }
      return [`∂L/∂${pr.lbl}`, `${f} = <b>${fmt(gget(bw.g, pr))}</b>`];
    });
    const full = state.batchMode === 'full';
    const tbl = `<div class="tfp-table-wrap snn-gtab"><table class="tfp-table"><thead>
        <tr><th rowspan="2">parameter</th><th colspan="4" class="snn-th-ind">individual-example gradients ∂Lᵢ/∂θ</th><th rowspan="2" class="snn-th-avg ${full ? '' : 'off'}">average ḡ = ¼ Σᵢ<br><small>${full ? 'used for the update' : 'not used in this mode'}</small></th></tr>
        <tr>${XLBL.map((l, i) => `<th class="${i === state.sel ? 'snn-selc' : ''} ${!full && i === state.sel ? 'snn-used' : ''}">${l}${!full && i === state.sel ? '<br><small>used</small>' : ''}</th>`).join('')}</tr></thead><tbody>
        ${list.map(pr => `<tr class="${pr.layer === 'o' ? 'snn-orow' : ''}"><td class="t">${pr.lbl}</td>${a.bws.map((b, i) => `<td class="${i === state.sel ? 'snn-selc' : ''} ${!full && i === state.sel ? 'snn-used' : ''}">${fmt(gget(b.g, pr))}</td>`).join('')}<td class="snn-avg ${full ? '' : 'off'}">${fmt(gget(a.avg, pr))}</td></tr>`).join('')}
      </tbody></table></div>`;
    const gc = gradCheck(p, state.act, batch(), a.avg);
    const gcHtml = `<div class="tfp-card"><div class="tfp-card-head"><h4>Finite-difference gradient check</h4>
        <span class="snn-tag ${gc.fails ? 'bad' : 'ok'}">${gc.fails ? gc.fails + ' mismatch' + (gc.fails > 1 ? 'es' : '') : `all checked gradients match · max rel. error ${gc.worst ? gc.worst.toExponential(1).replace('-', '−') : '0'}`}${gc.skipped ? ` · ${gc.skipped} skipped` : ''}</span></div>
        <div class="tfp-mono">numerical ≈ [J(θ + ε eₖ) − J(θ − ε eₖ)] / 2ε,  ε = 10⁻⁵,  J = ${full ? 'mean loss over all 4 examples' : `loss on x = ${XLBL[state.sel]}`} (the objective of the next update)<br>relative error = |analytic − numerical| / (|analytic| + |numerical|)</div>
        ${gc.kinkUnits.length ? `<div class="tfp-warn">ReLU unit${gc.kinkUnits.length > 1 ? 's' : ''} ${gc.kinkUnits.map(j => 'h' + sub(j + 1)).join(', ')} ${gc.kinkUnits.length > 1 ? 'have' : 'has'} |z| &lt; 10⁻³ on a batch example — the non-differentiable point. Their incoming parameters are skipped; take a step or change the seed to move off the kink.</div>` : ''}
        <div class="tfp-table-wrap"><table class="tfp-table"><thead><tr><th>parameter</th><th>analytic ḡ</th><th>numerical</th><th>rel. error</th><th></th></tr></thead><tbody>
        ${gc.rows.map(r => `<tr><td class="t">${r.par.lbl}</td><td>${fmt(r.a, 6)}</td><td>${r.status === 'skip' ? '—' : fmt(r.n, 6)}</td><td>${r.status === 'skip' ? 'kink' : r.both0 ? 'both 0' : r.rel.toExponential(1).replace('-', '−')}</td><td class="${r.status === 'pass' ? 'snn-ok' : r.status === 'fail' ? 'snn-bad' : 'snn-dim'}">${r.status === 'pass' ? '✓' : r.status === 'fail' ? '✗' : 'skip'}</td></tr>`).join('')}
        </tbody></table></div></div>`;
    return `<div class="tfp-viz snn-viz">
      ${head('Backward pass', `Tracing x = ${XLBL[state.sel]} (y = ${fw.y}). Edges now show the averaged gradient ḡ; nodes show this example's error signals δ.`)}
      <div class="tfp-card">${netSVG(a, { edge: 'g' })}</div>
      <div class="tfp-card"><div class="tfp-card-head"><h4>1 · Error signals for x = ${XLBL[state.sel]}</h4><span class="tfp-card-sub">g′(z) = ${A.dTex}</span></div>
        <div class="tfp-calc snn-calc">${sig.map(l => `<div class="tfp-calc-line ${l[0] === 'δ_o' ? 'total' : ''}"><span class="tfp-calc-k">${l[0]}</span><span>${l[1]}</span></div>`).join('')}</div>
        <div class="tfp-hint snn-note">δ_o = ŷ − y because σ′(z_o) cancels the 1/(ŷ(1−ŷ)) from the cross-entropy derivative.</div></div>
      <div class="snn-two">
        <div class="tfp-card"><div class="tfp-card-head"><h4>2 · Gradients for x = ${XLBL[state.sel]} only</h4><span class="tfp-card-sub">individual example</span></div>
          <div class="tfp-calc snn-calc snn-calc-sm">${gl.map(l => `<div class="tfp-calc-line"><span class="tfp-calc-k">${l[0]}</span><span>${l[1]}</span></div>`).join('')}</div></div>
        <div class="tfp-card"><div class="tfp-card-head"><h4>g′(z) at each hidden unit</h4></div>${actPlot(state.act, 'd', fw, a.fws)}
          <div class="tfp-hint">${state.act === 'sigmoid' ? 'Sigmoid′ never exceeds 0.25, so each hidden δ is at most ¼ of δ_o·W2.' : state.act === 'tanh' ? 'Tanh′ reaches 1 at z = 0 but falls fast for |z| > 2.' : 'ReLU′ is exactly 1 or 0: an off unit passes no gradient at all for that example.'}</div></div>
      </div>
      <div class="tfp-card"><div class="tfp-card-head"><h4>3 · Individual vs averaged gradients</h4><span class="tfp-card-sub">${full ? 'update uses the average of all four columns' : `update uses only the x = ${XLBL[state.sel]} column`}</span></div>${tbl}</div>
      ${gcHtml}
    </div>`;
  }

  function viewUpdate(a) {
    const list = paramList(state.H), eta = lr(), full = state.batchMode === 'full';
    const pNext = applyUpdate(state.p, a.avg, eta);
    const aNext = analyze(pNext, state.act, batch());
    const rows = list.map(pr => {
      const old = pr.get(state.p), g = gget(a.avg, pr), nw = old - eta * g;
      return `<tr class="${pr.layer === 'o' ? 'snn-orow' : ''}"><td class="t">${pr.lbl}</td><td>${fmt(old)}</td><td>${fmt(g)}</td><td class="snn-eq">${fmt(old)} − ${fmtLr(eta)} × ${par(g)} = <b>${fmt(nw)}</b></td><td class="${sgnCls(nw - old)}">${(nw - old) >= 0 ? '+' : ''}${fmt(nw - old)}</td></tr>`;
    }).join('');
    const dL = aNext.batchLoss - a.batchLoss;
    const L = state.last;
    const lastHtml = L ? `<details class="tfp-card snn-last"><summary><b>Previous update</b> (t = ${L.t} → ${L.t + 1}, η = ${fmtLr(L.lr)}, ${L.mode === 'full' ? 'averaged over all 4' : 'example ' + XLBL[L.batch[0]]}) — its “new” values are the current parameters</summary>
        <div class="tfp-table-wrap"><table class="tfp-table"><thead><tr><th>parameter</th><th>old</th><th>gradient</th><th>new = old − η × gradient</th></tr></thead><tbody>
        ${L.rows.map(r => `<tr><td class="t">${r.lbl}</td><td>${fmt(r.old)}</td><td>${fmt(r.g)}</td><td>${fmt(r.old)} − ${fmtLr(L.lr)} × ${par(r.g)} = <b>${fmt(r.nw)}</b></td></tr>`).join('')}</tbody></table></div></details>` : '';
    return `<div class="tfp-viz snn-viz">
      ${head('Gradient-descent update', `θ⁽${supNum(state.t + 1)}⁾ = θ⁽${supNum(state.t)}⁾ − η · ${full ? 'ḡ (average of the four individual gradients)' : `∂L/∂θ on x = ${XLBL[state.sel]} (one example)`}. Press <b>Step</b> to apply exactly this table.`)}
      <div class="snn-kpis">
        <div class="snn-kpi"><span>${full ? 'mean loss' : 'loss on ' + XLBL[state.sel]} now</span><b>${fmt(a.batchLoss)}</b></div>
        <div class="snn-kpi"><span>after this update</span><b>${fmt(aNext.batchLoss)}</b></div>
        <div class="snn-kpi ${dL <= 0 ? 'good' : 'bad'}"><span>change</span><b>${dL > 0 ? '+' : ''}${fmt(dL)}</b></div>
        <div class="snn-kpi"><span>‖ḡ‖ hidden · output</span><b>${fmt(gradNorms(a.avg).h, 3)} · ${fmt(gradNorms(a.avg).o, 3)}</b></div>
      </div>
      ${dL > 0 ? '<div class="tfp-warn">This step would <b>increase</b> the loss: η is too large for the local curvature here (overshoot). Try a smaller η.</div>' : ''}
      <div class="tfp-card"><div class="tfp-card-head"><h4>Update t = ${state.t} → ${state.t + 1}</h4><span class="tfp-card-sub">new value = old value − learning rate × gradient</span></div>
        <div class="tfp-table-wrap"><table class="tfp-table snn-utab"><thead><tr><th>parameter</th><th>old θ⁽${supNum(state.t)}⁾</th><th>gradient${full ? ' ḡ' : ''}</th><th>new = old − η × gradient</th><th>Δ</th></tr></thead><tbody>${rows}</tbody></table></div>
        <div class="tfp-row end"><button class="tfp-btn primary" data-act="vstep" ${state.running ? 'disabled' : ''}><i data-lucide="step-forward"></i>Apply this update (Step)</button></div></div>
      ${lastHtml}
    </div>`;
  }

  function viewTrain(a) {
    const diag = unitDiag(state.p, state.act, a.fws);
    const gnh = state.gnHist.map(g => g.h), gno = state.gnHist.map(g => g.o);
    const tHit = state.hist.findIndex(v => v < 0.1);
    return `<div class="tfp-viz snn-viz">
      ${head('Training on XOR')}
      <div class="snn-kpis">
        <div class="snn-kpi"><span>step t</span><b>${state.t}</b></div>
        <div class="snn-kpi"><span>mean loss L̄</span><b>${fmt(a.meanLoss)}</b></div>
        <div class="snn-kpi ${a.acc === 4 ? 'good' : ''}"><span>accuracy</span><b>${a.acc}/4</b></div>
        <div class="snn-kpi"><span>first t with L̄ &lt; 0.1</span><b>${tHit >= 0 ? tHit : '—'}</b></div>
      </div>
      <div class="snn-two">
        <div class="tfp-card"><div class="tfp-card-head"><h4>Decision boundary</h4><span class="tfp-card-sub">P(y=1|x): <span class="nb-dot" style="background:#10b981"></span> ≥ 0.5 · <span class="nb-dot" style="background:#6366f1"></span> &lt; 0.5</span></div>
          <canvas class="snn-canvas" id="snn-bd"></canvas>
          <div class="tfp-hint">Black: ŷ = 0.5 contour. Dashed: z<sub>j</sub> = 0 for each hidden unit. Red ring: misclassified.</div></div>
        <div class="tfp-card"><div class="tfp-card-head"><h4>Loss history (log scale)</h4><span class="tfp-card-sub">mean BCE over all four</span></div>
          ${lineChart([{ data: state.hist, color: ACT[state.act].color }], { refLine: { v: Math.LN2, lbl: 'ln 2 (ŷ = 0.5 everywhere)' }, yLabel: 'L̄' })}
          <div class="tfp-card-head" style="margin-top:.4rem"><h4>Gradient magnitude per update</h4><span class="tfp-card-sub">‖ḡ‖ hidden (solid) · output (dashed)</span></div>
          ${state.gnHist.length ? lineChart([{ data: gnh, color: ACT[state.act].color }, { data: gno, color: '#64748b', dash: true }], { h: 140, t0: 0 }) : '<div class="tfp-empty">Take a step to record gradient norms.</div>'}</div>
      </div>
      <div class="snn-two">
        <div class="tfp-card"><div class="tfp-card-head"><h4>Predictions</h4><span class="tfp-card-sub">${a.acc}/4 correct</span></div>${predTable(a)}</div>
        <div class="tfp-card"><div class="tfp-card-head"><h4>Weights</h4></div>${netSVG(a, { edge: 'w' })}</div>
      </div>
      <div class="tfp-card"><div class="tfp-card-head"><h4>Hidden-unit health</h4></div>${unitTable(a)}${trainNote(a, diag)}</div>
    </div>`;
  }

  function trainNote(a, diag) {
    const notes = [];
    const dead = diag.filter(u => u.dead), sat = diag.filter(u => u.saturated);
    if (dead.length) notes.push(`${dead.map(u => 'h' + sub(u.j + 1)).join(', ')} ${dead.length > 1 ? 'are' : 'is'} inactive on every input: g′ = 0 there, so ${dead.length > 1 ? 'their' : 'its'} incoming weights receive zero gradient and cannot recover by gradient descent alone.`);
    if (sat.length) notes.push(`${sat.map(u => 'h' + sub(u.j + 1)).join(', ')} ${sat.length > 1 ? 'are' : 'is'} saturated on every input: updates to ${sat.length > 1 ? 'their' : 'its'} incoming weights are tiny, so learning there slows down.`);
    if (state.t > 200 && a.meanLoss > 0.6) notes.push('The loss is still near ln 2 ≈ 0.693 — the network is close to predicting 0.5 everywhere. Look at the unit statuses and gradient magnitudes above before changing η.');
    if (a.meanLoss < 0.05) notes.push('Converged on this seed. Now Reset and repeat with another activation, seed or η — the outcome can change.');
    return notes.length ? `<div class="tfp-msg tfp-msg-select"><span class="tfp-msg-tag">Observe</span><span>${notes.join(' ')}</span></div>` : '';
  }

  function runCompare() {
    const base = { seed: state.seed, H: state.H, lr: lr(), steps: state.cmpBudget, batchMode: state.batchMode };
    state.cmp = { key: cfgKey(), base, runs: ACT_KEYS.map(act => simulate(Object.assign({ act }, base))) };
  }
  function runSeedSweep() {
    const seeds = Array.from({ length: 10 }, (_, k) => state.seed + k);
    const res = ACT_KEYS.map(act => {
      const runs = seeds.map(seed => simulate({ seed, H: state.H, act, lr: lr(), steps: state.cmpBudget, batchMode: state.batchMode }));
      const hits = runs.filter(r => r.tHit >= 0);
      return { act, per: runs.map(r => r.tHit), ok: hits.length, med: median(hits.map(r => r.tHit)), stuck: runs.filter(r => r.Lend > 0.5).length, dead: runs.reduce((s, r) => s + r.diagEnd.filter(u => u.dead).length, 0) };
    });
    state.sweep = { key: cfgKey(), seeds, res };
  }
  function runLrSweep() {
    const lrs = [0.05, 0.1, 0.3, 1, 3, 10];
    state.lrSweep = { key: cfgKey(), lrs, res: ACT_KEYS.map(act => ({ act, cells: lrs.map(l => { const r = simulate({ seed: state.seed, H: state.H, act, lr: l, steps: state.cmpBudget, batchMode: state.batchMode }); return { L: r.Lend, t: r.tHit }; }) })) };
  }

  function viewCompare() {
    if (!state.cmp || state.cmp.key !== cfgKey()) runCompare();
    const C = state.cmp, R = C.runs;
    const ctl = `<div class="tfp-card snn-cmpctl"><div class="tfp-row">
        <span class="tfp-sub">Shared: seed ${C.base.seed} · H = ${C.base.H} · η = ${fmtLr(C.base.lr)} · ${C.base.batchMode === 'full' ? 'all 4 per update' : 'one example per update'} · identical initial weights</span>
        <label class="tfp-sel-wrap" style="margin-left:auto">budget <select class="tfp-select" id="snn-budget">${[200, 500, 1000, 2000, 5000].map(v => `<option value="${v}" ${state.cmpBudget === v ? 'selected' : ''}>${v} updates</option>`).join('')}</select></label></div></div>`;
    const curves = lineChart(R.map(r => ({ data: r.loss, color: ACT[r.act].color, marker: r.tHit >= 0 ? r.tHit : undefined })), { refLine: { v: Math.LN2, lbl: 'ln 2' }, yLabel: 'L̄', h: 200 });
    const grads = lineChart(R.map(r => ({ data: r.gh, color: ACT[r.act].color })), { yLabel: '‖ḡ_hidden‖', h: 170 });
    const legend = `<div class="snn-legend">${R.map(r => `<span><i style="background:${ACT[r.act].color}"></i>${ACT[r.act].name}</span>`).join('')}<span class="tfp-sub">dot = first update with L̄ &lt; 0.1</span></div>`;
    const relD = (r, which) => mean(r[which].map(u => u.meanD / ACT[r.act].dmax));
    const tbl = `<div class="tfp-table-wrap"><table class="tfp-table snn-ctab"><thead><tr><th>measure</th>${R.map(r => `<th style="color:${ACT[r.act].color}">${ACT[r.act].name}</th>`).join('')}</tr></thead><tbody>
      <tr><td class="t">initial mean loss</td>${R.map(r => `<td>${fmt(r.L0)}</td>`).join('')}</tr>
      <tr><td class="t">loss after ${C.base.steps} updates</td>${R.map(r => `<td><b>${fmt(r.Lend)}</b></td>`).join('')}</tr>
      <tr><td class="t">accuracy at end</td>${R.map(r => `<td class="${r.acc === 4 ? 'snn-ok' : 'snn-bad'}">${r.acc}/4</td>`).join('')}</tr>
      <tr><td class="t">first update with L̄ &lt; 0.1</td>${R.map(r => `<td>${r.tHit >= 0 ? r.tHit : 'not reached'}</td>`).join('')}</tr>
      <tr><td class="t">mean g′(z) at start</td>${R.map(r => `<td>${fmt(mean(r.diag0.map(u => u.meanD)), 3)} <small>${Math.round(relD(r, 'diag0') * 100)}% of max</small></td>`).join('')}</tr>
      <tr><td class="t">‖ḡ_hidden‖ at step 0</td>${R.map(r => `<td>${fmt(r.gh0, 3)}</td>`).join('')}</tr>
      <tr><td class="t">mean ‖ḡ_hidden‖, first 50</td>${R.map(r => `<td>${fmt(r.ghEarly, 3)}</td>`).join('')}</tr>
      <tr><td class="t">unit/input pairs off or saturated (end)</td>${R.map(r => { const n = r.diagEnd.reduce((s, u) => s + (r.act === 'relu' ? u.inactive : u.satPairs), 0); return `<td>${n}/${4 * C.base.H} <small>${r.act === 'relu' ? 'off' : 'sat.'}</small></td>`; }).join('')}</tr>
      <tr><td class="t">units off / saturated on all 4 (end)</td>${R.map(r => { const n = r.diagEnd.filter(u => u.dead || u.saturated).length; return `<td class="${n ? 'snn-bad' : ''}">${n}</td>`; }).join('')}</tr>
      <tr><td class="t"></td>${R.map(r => `<td><button class="tfp-btn" data-act="load" data-k="${r.act}">Open in lab</button></td>`).join('')}</tr>
      </tbody></table></div>`;
    const mini = `<div class="snn-minis">${R.map(r => `<div class="snn-mini"><canvas class="snn-canvas small" data-cmp="${r.act}"></canvas><span style="color:${ACT[r.act].color}">${ACT[r.act].name}</span></div>`).join('')}</div>`;
    const obs = compareObservations(C);
    const S = state.sweep && state.sweep.key === cfgKey() ? state.sweep : null;
    const sweepHtml = `<div class="tfp-card"><div class="tfp-card-head"><h4>Seed sweep</h4><span class="tfp-card-sub">10 seeds (${state.seed}…${state.seed + 9}), same H, η, budget</span></div>
      ${S ? `<div class="tfp-table-wrap"><table class="tfp-table"><thead><tr><th>activation</th>${S.seeds.map(s => `<th>${s}</th>`).join('')}<th>reached</th><th>median t</th><th>stuck (L̄&gt;0.5)</th></tr></thead><tbody>
        ${S.res.map(r => `<tr><td class="t" style="color:${ACT[r.act].color};font-weight:700">${ACT[r.act].name}</td>${r.per.map(t => `<td class="${t >= 0 ? '' : 'snn-dim'}">${t >= 0 ? t : '✗'}</td>`).join('')}<td><b>${r.ok}/10</b></td><td>${Number.isNaN(r.med) ? '—' : r.med}</td><td>${r.stuck}</td></tr>`).join('')}
        </tbody></table></div><div class="tfp-hint">Numbers = first update with L̄ &lt; 0.1; ✗ = not reached within ${state.cmpBudget} updates. Compare the per-seed columns: the fastest activation differs from seed to seed.</div>`
        : '<div class="tfp-row"><button class="tfp-btn" data-act="sweep"><i data-lucide="shuffle"></i>Run seed sweep</button></div>'}</div>`;
    const LS = state.lrSweep && state.lrSweep.key === cfgKey() ? state.lrSweep : null;
    const lrHtml = `<div class="tfp-card"><div class="tfp-card-head"><h4>Learning-rate sweep</h4><span class="tfp-card-sub">seed ${state.seed}, final mean loss after ${state.cmpBudget} updates</span></div>
      ${LS ? `<div class="tfp-table-wrap"><table class="tfp-table"><thead><tr><th>activation</th>${LS.lrs.map(l => `<th>η = ${l}</th>`).join('')}</tr></thead><tbody>
        ${LS.res.map(r => `<tr><td class="t" style="color:${ACT[r.act].color};font-weight:700">${ACT[r.act].name}</td>${r.cells.map(c => `<td class="snn-heat" style="--h:${Math.min(1, c.L / 0.7).toFixed(2)}">${fmt(c.L, 3)}<small>${c.t >= 0 ? ' t=' + c.t : ''}</small></td>`).join('')}</tr>`).join('')}
        </tbody></table></div><div class="tfp-hint">Red = loss still high. Each activation has its own useful η range — sigmoid's smaller derivatives often tolerate (or need) larger η.</div>`
        : '<div class="tfp-row"><button class="tfp-btn" data-act="lrsweep"><i data-lucide="sliders-horizontal"></i>Run η sweep</button></div>'}</div>`;
    return `<div class="tfp-viz snn-viz">
      ${head('Comparing hidden activations')}
      ${ctl}
      <div class="tfp-card"><div class="tfp-card-head"><h4>Mean loss per update</h4></div>${legend}${curves}</div>
      <div class="snn-two">
        <div class="tfp-card"><div class="tfp-card-head"><h4>Hidden-layer gradient magnitude</h4></div>${grads}</div>
        <div class="tfp-card"><div class="tfp-card-head"><h4>Final decision boundaries</h4></div>${mini}</div>
      </div>
      ${obs}
      <div class="tfp-card"><div class="tfp-card-head"><h4>Side by side</h4></div>${tbl}</div>
      ${sweepHtml}
      ${lrHtml}
    </div>`;
  }

  function compareObservations(C) {
    const R = C.runs, by = k => R.find(r => r.act === k), out = [];
    const s = by('sigmoid'), t = by('tanh'), r = by('relu');
    out.push(`At step 0 the same weights give mean g′ = ${fmt(mean(s.diag0.map(u => u.meanD)), 3)} for sigmoid (max 0.25), ${fmt(mean(t.diag0.map(u => u.meanD)), 3)} for tanh and ${fmt(mean(r.diag0.map(u => u.meanD)), 3)} for ReLU; hidden-layer gradient norms start at ${fmt(s.gh0, 3)}, ${fmt(t.gh0, 3)} and ${fmt(r.gh0, 3)}.`);
    const deadR = r.diagEnd.filter(u => u.dead);
    if (deadR.length) out.push(`ReLU: ${deadR.map(u => 'h' + sub(u.j + 1)).join(', ')} ended inactive on all four inputs — no gradient can flow into ${deadR.length > 1 ? 'those units' : 'that unit'}, which ${r.Lend > 0.3 ? 'explains much of the stalled loss' : 'the remaining units compensated for'}.`);
    else if (r.diagEnd.some(u => u.inactive)) out.push('ReLU units are off for some inputs (h = 0, g′ = 0) — that is how ReLU carves XOR into pieces; a unit only becomes a problem when it is off for every input.');
    [s, t].forEach(x => { const n = x.diagEnd.filter(u => u.saturated).length; if (n) out.push(`${ACT[x.act].name}: ${n} unit${n > 1 ? 's' : ''} saturated on all four inputs at the end, shrinking the gradients into ${n > 1 ? 'them' : 'it'}.`); });
    const hit = R.filter(x => x.tHit >= 0).sort((a, b) => a.tHit - b.tHit);
    if (hit.length) out.push(`With this seed and η, ${hit.map(x => `${ACT[x.act].name} reached L̄ < 0.1 at update ${x.tHit}`).join(', ')}${hit.length < 3 ? `; ${R.filter(x => x.tHit < 0).map(x => ACT[x.act].name).join(' and ')} did not within ${C.base.steps}` : ''}. Run the seed sweep before generalising.`);
    else out.push(`None reached L̄ < 0.1 within ${C.base.steps} updates for this seed and η — try a larger budget, another η or more hidden units.`);
    return `<div class="tfp-msg tfp-msg-select"><span class="tfp-msg-tag">Observe</span><span>${out.join(' ')}</span></div>`;
  }

  function onViz(e) {
    const b = e.target.closest('[data-act]');
    if (!b || b.disabled) return;
    const k = b.dataset.k;
    switch (b.dataset.act) {
      case 'vstep': doStep(1); buildControls(); break;
      case 'sweep': b.disabled = true; b.textContent = 'Running…'; setTimeout(() => { runSeedSweep(); update(); }, 20); return;
      case 'lrsweep': b.disabled = true; b.textContent = 'Running…'; setTimeout(() => { runLrSweep(); update(); }, 20); return;
      case 'load': state.act = k; reset(); buildControls(); setMode('train'); return;
      default: return;
    }
    update();
  }

  function setMode(m) {
    // Navigate via the lecture's concept chips so the chip highlight stays correct.
    const chip = document.querySelector(`.sl-concept-chip[data-snn-mode="${m}"]`);
    if (chip) chip.click(); else { mode = m; update(); }
  }

  function update() {
    if (!vizHost) return;
    const a = analyze(state.p, state.act, batch());
    const st = vizHost.scrollTop;
    vizHost.innerHTML = mode === 'forward' ? viewForward(a) : mode === 'backward' ? viewBackward(a) : mode === 'update' ? viewUpdate(a) : mode === 'compare' ? viewCompare() : viewTrain(a);
    vizHost.scrollTop = st;
    if (mode === 'train') drawBoundary(vizHost.querySelector('#snn-bd'), state.p, state.act, { sel: false });
    if (mode === 'compare' && state.cmp) vizHost.querySelectorAll('canvas[data-cmp]').forEach(cv => { const r = state.cmp.runs.find(x => x.act === cv.dataset.cmp); drawBoundary(cv, r.p, r.act, { small: true }); });
    const bs = vizHost.querySelector('#snn-budget');
    if (bs) bs.addEventListener('change', () => { state.cmpBudget = +bs.value; update(); });
    updateStats(a);
    const runBtn = ctrlHost && ctrlHost.querySelector('[data-act="run"]');
    if (runBtn && !state.running && runBtn.classList.contains('on')) buildControls();
    if (!state.running) icons();
  }

  function icons() { if (window.lucide) window.lucide.createIcons(); }

  // ===========================================================================
  // Entry point
  // ===========================================================================
  function render(col, m) {
    mode = ['forward', 'backward', 'update', 'train', 'compare'].includes(m) ? m : 'forward';
    if (!state.p) reset();
    vizHost = col;
    ctrlHost = document.getElementById('lr-concept-lab');
    if (!ctrlHost) {
      col.innerHTML = '';
      ctrlHost = document.createElement('div'); col.appendChild(ctrlHost);
      vizHost = document.createElement('div'); col.appendChild(vizHost);
    }
    vizHost.onclick = onViz;
    // tag concept chips with their lab mode so in-lab navigation can use them
    document.querySelectorAll('.sl-concept-chip').forEach(ch => {
      const t = ch.textContent.trim();
      const mm = { 'Forward Pass & Activations': 'forward', 'Backpropagation & Gradient Check': 'backward', 'Gradient-Descent Update': 'update', 'Training on XOR': 'train', 'Comparing Activations': 'compare' }[t];
      if (mm) ch.dataset.snnMode = mm;
    });
    buildControls(); update();
  }

  window.ShallowNNLab = {
    render,
    _state: state,
    _engine: { X, Y, ACT, sigmoid, bceLogit, initParams, forward, backward, analyze, applyUpdate, gradCheck, simulate, paramList, gget, unitDiag }
  };
})();
