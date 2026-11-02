/**
 * Interactive K-Means Playground (Topic 5 · Unsupervised Learning)
 *
 *   Assign:  c_i = argmin_k ‖x_i − μ_k‖²
 *   Update:  μ_k = (1/|C_k|) Σ_{i ∈ C_k} x_i
 *
 * Students pick K, click the graph to place K initial centroids, then alternate
 * Assign and Update until no point changes cluster. Centroid trails, movement
 * arrows, cluster colours, WCSS and a step log show what each step does.
 *
 * Public API: window.KMeansLab.render(container)
 */
(function () {
  'use strict';

  const DEFAULT_PTS = [
    [1.5, 8.0], [2.4, 7.2], [1.2, 6.8], [2.8, 8.4], [2.0, 6.2],
    [7.0, 8.5], [8.2, 7.6], [7.6, 6.9], [8.6, 8.6],
    [4.2, 2.6], [5.6, 1.6], [5.2, 3.1], [4.6, 1.4], [6.2, 2.6]
  ];
  const COLORS = ['#2563eb', '#f59e0b', '#10b981', '#db2777'];
  const SOFT = ['rgba(37,99,235,0.10)', 'rgba(245,158,11,0.12)', 'rgba(16,185,129,0.12)', 'rgba(219,39,119,0.10)'];
  const NAMES = ['μ₁', 'μ₂', 'μ₃', 'μ₄'];
  const LO = 0, HI = 10;

  const state = {
    pts: DEFAULT_PTS.map(p => p.slice()), K: 3,
    cents: [], trail: [], assign: null, phase: 'place', iter: 0,
    log: [], wcss: [], sel: null, regions: true, anim: null, running: false, lastMoves: null
  };
  let root = null, timer = 0;

  // ------------------------------------------------------------- math
  const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
  const nearest = (p, C) => { let k = 0; C.forEach((c, j) => { if (d2(p, c) < d2(p, C[k])) k = j; }); return k; };
  const wcssOf = (A, C) => (A ? state.pts.reduce((s, p, i) => s + d2(p, C[A[i]]), 0) : null);
  const f1 = v => v.toFixed(1), f2 = v => v.toFixed(2);
  const sub = n => '₀₁₂₃₄₅₆₇₈₉'[n];

  function resetCentroids(msg) {
    clearInterval(timer); state.running = false;
    Object.assign(state, { cents: [], trail: [], assign: null, phase: 'place', iter: 0, log: [], wcss: [], anim: null, lastMoves: null });
    if (msg) state.log.push({ k: 'info', t: msg });
  }

  function newPoints() {
    const n = 10 + Math.floor(Math.random() * 6);                 // 10–15 points
    const nb = 2 + Math.floor(Math.random() * 3);                  // 2–4 loose blobs
    const centers = [];
    while (centers.length < nb) {
      const c = [1.8 + Math.random() * 6.4, 1.8 + Math.random() * 6.4];
      if (centers.every(o => Math.sqrt(d2(o, c)) > 3.2)) centers.push(c);
    }
    const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    state.pts = Array.from({ length: n }, (_, i) => {
      const c = centers[i % nb];
      return [Math.min(9.7, Math.max(0.3, c[0] + gauss() * 0.9)), Math.min(9.7, Math.max(0.3, c[1] + gauss() * 0.9))].map(v => Math.round(v * 10) / 10);
    });
    state.sel = null;
    resetCentroids(`New data: ${n} unlabeled points. Place ${state.K} centroids to begin.`);
  }

  function randomInit() {
    resetCentroids();
    const idx = state.pts.map((_, i) => i).sort(() => Math.random() - 0.5).slice(0, state.K);
    idx.forEach(i => addCentroid(state.pts[i].map(v => Math.round((v + (Math.random() - 0.5) * 0.6) * 10) / 10)));
  }

  function addCentroid(p) {
    if (state.phase !== 'place' || state.cents.length >= state.K) return;
    state.cents.push(p); state.trail.push([p.slice()]);
    if (state.cents.length === state.K) {
      state.phase = 'assign';
      state.log.push({ k: 'info', t: `Initial centroids: ${state.cents.map((c, j) => `${NAMES[j]}=(${f1(c[0])}, ${f1(c[1])})`).join(', ')}.` });
    }
  }

  function doAssign() {
    if (state.phase !== 'assign') return;
    const A = state.pts.map(p => nearest(p, state.cents));
    const changed = state.assign ? A.filter((a, i) => a !== state.assign[i]).length : A.length;
    const first = !state.assign;
    state.assign = A;
    const w = wcssOf(A, state.cents);
    state.wcss.push({ lbl: `A${state.iter + 1}`, v: w });
    if (!first && changed === 0) {
      state.phase = 'done';
      state.log.push({ k: 'done', t: `Iteration ${state.iter + 1} · Assign: no point changed cluster → <b>converged</b> after ${state.iter} update${state.iter === 1 ? '' : 's'}. WCSS = ${f2(w)}.` });
      clearInterval(timer); state.running = false;
    } else {
      state.phase = 'update';
      state.log.push({ k: 'a', t: `Iteration ${state.iter + 1} · Assign: ${first ? `all ${A.length} points assigned` : `${changed} point${changed === 1 ? '' : 's'} changed cluster`}. Sizes ${countSizes().join(' / ')}. WCSS = ${f2(w)}.` });
    }
  }

  function doUpdate() {
    if (state.phase !== 'update') return;
    const old = state.cents.map(c => c.slice()), empty = [];
    const next = old.map((c, k) => {
      const m = state.pts.filter((_, i) => state.assign[i] === k);
      if (!m.length) { empty.push(k); return c.slice(); }
      return [m.reduce((s, p) => s + p[0], 0) / m.length, m.reduce((s, p) => s + p[1], 0) / m.length];
    });
    const moves = next.map((c, k) => Math.sqrt(d2(c, old[k])));
    state.cents = next; state.lastMoves = { from: old, d: moves };
    next.forEach((c, k) => state.trail[k].push(c.slice()));
    state.iter++;
    state.phase = 'assign';
    const w = wcssOf(state.assign, next);
    state.wcss.push({ lbl: `U${state.iter}`, v: w });
    state.log.push({ k: 'u', t: `Iteration ${state.iter} · Update: ${moves.map((d, k) => `${NAMES[k]} moved ${f2(d)}`).join(', ')}. WCSS = ${f2(w)}.` +
      (empty.length ? ` <span class="kml-warn-i">${empty.map(k => NAMES[k]).join(', ')} had no points and stayed put.</span>` : '') });
    animate(old, next);
  }

  function animate(from, to) {
    const t0 = performance.now(), dur = 650;
    state.anim = { from, to, t: 0 };
    const tick = (now) => {
      if (!state.anim) return;
      const t = Math.min(1, (now - t0) / dur);
      state.anim.t = 1 - Math.pow(1 - t, 3);
      drawPlot();
      if (t < 1) requestAnimationFrame(tick); else { state.anim = null; drawPlot(); }
    };
    requestAnimationFrame(tick);
  }

  function runToEnd() {
    if (state.phase === 'place' || state.phase === 'done') return;
    state.running = true; update();
    const go = () => {
      if (state.phase === 'assign') doAssign(); else if (state.phase === 'update') doUpdate();
      if (state.phase === 'done' || state.iter > 50) { clearInterval(timer); state.running = false; }
      update();
    };
    go(); timer = setInterval(go, 800);
  }

  const countSizes = () => Array.from({ length: state.K }, (_, k) => state.assign ? state.assign.filter(a => a === k).length : 0);

  // ------------------------------------------------------------- plot
  const S = 420, PAD = 36, INNER = S - PAD - 14;
  const X = v => PAD + (v - LO) / (HI - LO) * INNER;
  const Y = v => 14 + (1 - (v - LO) / (HI - LO)) * INNER;

  function curCents() {
    const a = state.anim;
    return a ? a.from.map((c, k) => [c[0] + (a.to[k][0] - c[0]) * a.t, c[1] + (a.to[k][1] - c[1]) * a.t]) : state.cents;
  }

  function plotSVG() {
    const C = curCents(), placed = C.length === state.K;
    let s = `<svg viewBox="0 0 ${S} ${S}" class="kml-plot ${state.phase === 'place' ? 'placing' : ''}" id="kml-svg" role="img" aria-label="K-Means scatter plot">`;
    s += `<defs><marker id="kml-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="#334155"/></marker></defs>`;
    s += `<rect x="${X(LO)}" y="${Y(HI)}" width="${INNER}" height="${INNER}" class="kml-bg"/>`;
    // nearest-centroid regions (Voronoi cells), coarse grid
    if (state.regions && placed && !state.anim) {
      const n = 40, step = (HI - LO) / n, cw = INNER / n;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const k = nearest([LO + (i + 0.5) * step, LO + (j + 0.5) * step], C);
        s += `<rect x="${(X(LO) + i * cw).toFixed(1)}" y="${(Y(LO + (j + 1) * step)).toFixed(1)}" width="${(cw + 0.4).toFixed(1)}" height="${(cw + 0.4).toFixed(1)}" fill="${SOFT[k]}"/>`;
      }
    }
    for (let v = 0; v <= 10; v += 2) {
      s += `<line x1="${X(v)}" y1="${Y(HI)}" x2="${X(v)}" y2="${Y(LO)}" class="kml-grid"/><line x1="${X(LO)}" y1="${Y(v)}" x2="${X(HI)}" y2="${Y(v)}" class="kml-grid"/>`;
      s += `<text x="${X(v)}" y="${Y(LO) + 15}" class="kml-tick" text-anchor="middle">${v}</text><text x="${X(LO) - 7}" y="${Y(v) + 4}" class="kml-tick" text-anchor="end">${v}</text>`;
    }
    s += `<text x="${X(HI)}" y="${S - 2}" class="kml-ax" text-anchor="end">x →</text><text x="8" y="${Y(9) + 4}" class="kml-ax">y ↑</text>`;
    // membership lines
    if (state.assign) state.pts.forEach((p, i) => {
      const c = C[state.assign[i]];
      s += `<line x1="${X(p[0])}" y1="${Y(p[1])}" x2="${X(c[0])}" y2="${Y(c[1])}" stroke="${COLORS[state.assign[i]]}" class="kml-mem"/>`;
    });
    // centroid trails
    state.trail.forEach((tr, k) => {
      if (tr.length < 2) return;
      const pts = state.anim ? tr.slice(0, -1).concat([C[k]]) : tr;
      s += `<polyline points="${pts.map(p => X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1)).join(' ')}" fill="none" stroke="${COLORS[k]}" class="kml-trail"/>`;
      pts.slice(0, -1).forEach(p => { s += `<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="3.2" fill="#fff" stroke="${COLORS[k]}" stroke-width="1.5"/>`; });
    });
    // points
    state.pts.forEach((p, i) => {
      const k = state.assign ? state.assign[i] : -1, sel = state.sel === i;
      if (sel) s += `<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="12" class="kml-selring"/>`;
      s += `<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="6.5" fill="${k < 0 ? '#94a3b8' : COLORS[k]}" stroke="#fff" stroke-width="1.6" class="kml-pt" data-i="${i}"/>`;
    });
    // distance lines from the selected point
    if (state.sel !== null && placed) {
      const p = state.pts[state.sel], kn = nearest(p, C);
      C.forEach((c, k) => { s += `<line x1="${X(p[0])}" y1="${Y(p[1])}" x2="${X(c[0])}" y2="${Y(c[1])}" stroke="${COLORS[k]}" class="kml-dist ${k === kn ? 'min' : ''}"/>`; });
    }
    // centroids
    C.forEach((c, k) => {
      const cx = X(c[0]), cy = Y(c[1]);
      s += `<g class="kml-cent"><path d="M${cx} ${cy - 13} L${cx + 13} ${cy} L${cx} ${cy + 13} L${cx - 13} ${cy} Z" fill="${COLORS[k]}" stroke="#0f172a" stroke-width="1.6"/>` +
        `<text x="${cx}" y="${cy + 4}" class="kml-ctxt">${k + 1}</text></g>`;
    });
    // movement arrows just after an Update
    if (state.lastMoves && !state.anim && state.phase !== 'place') state.lastMoves.from.forEach((f, k) => {
      if (state.lastMoves.d[k] < 0.15) return;
      const t = state.cents[k], dx = t[0] - f[0], dy = t[1] - f[1], L = Math.hypot(dx, dy), sh = 0.55;
      if (L <= sh * 1.6) return;
      s += `<line x1="${X(f[0] + dx / L * 0.2)}" y1="${Y(f[1] + dy / L * 0.2)}" x2="${X(t[0] - dx / L * sh)}" y2="${Y(t[1] - dy / L * sh)}" class="kml-move" marker-end="url(#kml-ah)"/>`;
    });
    if (state.phase === 'place') {
      s += `<text x="${X(5)}" y="${Y(HI) + 20}" class="kml-placehint" text-anchor="middle">Click to place ${NAMES[state.cents.length] || ''} (${state.cents.length + 1} of ${state.K})</text>`;
    }
    s += '</svg>';
    return s;
  }

  function wcssChart() {
    const W = state.wcss;
    if (!W.length) return '<div class="tfp-hint">WCSS appears after the first Assign.</div>';
    const w = 260, h = 90, pl = 34, pr = 8, pt = 8, pb = 18;
    const mx = Math.max(...W.map(o => o.v)) * 1.08 || 1, n = Math.max(1, W.length - 1);
    const sx = i => pl + i / n * (w - pl - pr), sy = v => pt + (1 - v / mx) * (h - pt - pb);
    let s = `<svg viewBox="0 0 ${w} ${h}" class="kml-wc">`;
    s += `<line x1="${pl}" y1="${sy(0)}" x2="${w - pr}" y2="${sy(0)}" class="kml-grid"/><text x="${pl - 4}" y="${sy(mx / 1.08) + 3}" class="kml-tick" text-anchor="end">${f1(mx / 1.08)}</text><text x="${pl - 4}" y="${sy(0) + 3}" class="kml-tick" text-anchor="end">0</text>`;
    s += `<polyline points="${W.map((o, i) => sx(i).toFixed(1) + ',' + sy(o.v).toFixed(1)).join(' ')}" fill="none" stroke="#4f46e5" stroke-width="2"/>`;
    W.forEach((o, i) => { s += `<circle cx="${sx(i)}" cy="${sy(o.v)}" r="3" fill="${o.lbl[0] === 'A' ? '#0ea5e9' : '#f59e0b'}"><title>${o.lbl}: ${f2(o.v)}</title></circle>`; });
    if (W.length <= 14) W.forEach((o, i) => { s += `<text x="${sx(i)}" y="${h - 4}" class="kml-tick" text-anchor="middle">${o.lbl}</text>`; });
    return s + '</svg>';
  }

  // ------------------------------------------------------------- panels
  function statusHTML() {
    const P = state.phase;
    const stepIdx = P === 'assign' ? 1 : P === 'update' ? 2 : 0;
    const it = P === 'done' ? state.iter : state.iter + (P === 'place' ? 0 : 1);
    return `<div class="kml-iter"><span>Iteration</span><b>${it}</b></div>
      <div class="kml-cycle">
        <span class="${P === 'place' ? 'cur' : 'done'}">0 · Place K</span>
        <span class="${stepIdx === 1 ? 'cur' : ''}">1 · Assign</span>
        <span class="${stepIdx === 2 ? 'cur' : ''}">2 · Update</span>
        <span class="${P === 'done' ? 'cur ok' : ''}">Converged</span>
      </div>`;
  }

  function message() {
    const P = state.phase;
    if (P === 'place') return ['try', 'Step 0', `Click the graph to place <b>${state.K}</b> initial centroids (${state.cents.length}/${state.K} placed). Where you put them can change the final clusters.`];
    if (P === 'assign') return state.assign
      ? ['a', 'Step 1', 'Centroids moved, so some points may now be closer to a different centroid. Press <b>Assign</b>: c<sub>i</sub> = argmin<sub>k</sub> ‖x<sub>i</sub> − μ<sub>k</sub>‖².']
      : ['a', 'Step 1', 'Press <b>Assign</b>: each point joins the centroid it is closest to (the shaded region it sits in).'];
    if (P === 'update') return ['u', 'Step 2', 'Press <b>Update</b>: each centroid moves to the mean (average x, average y) of the points of its colour.'];
    return ['ok', 'Converged', `No point changed cluster, so another Update would not move any centroid. K-Means stopped after ${state.iter} update${state.iter === 1 ? '' : 's'}. Try <b>Reset centroids</b> with a different start — do you always get the same clusters?`];
  }

  function clusterTable() {
    const sizes = countSizes();
    return `<table class="kml-table"><thead><tr><th>cluster</th><th>μ<sub>k</sub> = (x, y)</th><th>|C<sub>k</sub>|</th><th>last move</th></tr></thead><tbody>
      ${Array.from({ length: state.K }, (_, k) => {
        const c = state.cents[k];
        return `<tr><td><i class="kml-sw" style="background:${COLORS[k]}"></i>${NAMES[k]}</td><td>${c ? `(${f2(c[0])}, ${f2(c[1])})` : '—'}</td><td>${state.assign ? sizes[k] : '—'}</td><td>${state.lastMoves ? f2(state.lastMoves.d[k]) : '—'}</td></tr>`;
      }).join('')}</tbody></table>`;
  }

  function selHTML() {
    if (state.sel === null) return '<div class="tfp-hint">After placing the centroids, click any data point to see its squared distance to each centroid.</div>';
    const p = state.pts[state.sel];
    if (state.cents.length < state.K) return `<div class="tfp-hint">Point x<sub>${state.sel + 1}</sub> = (${f1(p[0])}, ${f1(p[1])}). Distances appear once all ${state.K} centroids are placed.</div>`;
    const kn = nearest(p, state.cents);
    return `<div class="kml-dlist"><div class="kml-dhead">x<sub>${state.sel + 1}</sub> = (${f1(p[0])}, ${f1(p[1])})</div>
      ${state.cents.map((c, k) => `<div class="kml-drow ${k === kn ? 'min' : ''}"><i class="kml-sw" style="background:${COLORS[k]}"></i><b>‖x − ${NAMES[k]}‖² = ${f2(d2(p, c))}</b>${k === kn ? ' ← nearest' : ''}<span class="kml-exp">= (${f1(p[0])}−${f2(c[0])})² + (${f1(p[1])}−${f2(c[1])})²</span></div>`).join('')}
      ${state.assign && state.assign[state.sel] !== kn ? `<div class="kml-note">Currently coloured ${NAMES[state.assign[state.sel]]}, but ${NAMES[kn]} is now closer — the next Assign will move it.</div>` : ''}</div>`;
  }

  // ------------------------------------------------------------- render
  function skeleton() {
    root.innerHTML = `<div class="tfp-viz kml-viz">
      <div class="tfp-viz-head"><h3>K-Means Playground</h3>
        <div class="kml-k" role="group" aria-label="Number of clusters K"><span>K =</span>
          ${[2, 3, 4].map(k => `<button class="tfp-btn ${k === state.K ? 'on' : ''}" data-k="${k}">${k}</button>`).join('')}</div></div>
      <div class="tfp-msg kml-msg" id="kml-msg"></div>
      <div class="kml-two">
        <div class="tfp-card kml-plotcard"><div id="kml-plot"></div>
          <div class="kml-legend"><span><i class="pt"></i>unassigned point</span><span><i class="ce"></i>centroid μ<sub>k</sub></span><span><i class="tr"></i>centroid path</span>
            <label><input type="checkbox" id="kml-reg" ${state.regions ? 'checked' : ''}> nearest-centroid regions</label></div></div>
        <div class="kml-side">
          <div class="tfp-card" id="kml-status"></div>
          <div class="tfp-card">
            <div class="kml-btns">
              <button class="tfp-btn kml-big" data-act="assign" id="kml-assign"><span class="n">1</span>Assign</button>
              <button class="tfp-btn kml-big" data-act="update" id="kml-update"><span class="n">2</span>Update</button>
            </div>
            <div class="tfp-row" style="margin-top:0.5rem">
              <button class="tfp-btn" data-act="run" id="kml-run"><i data-lucide="fast-forward"></i>Run to convergence</button>
            </div>
            <div class="tfp-row" style="margin-top:0.4rem">
              <button class="tfp-btn" data-act="reset"><i data-lucide="rotate-ccw"></i>Reset centroids</button>
              <button class="tfp-btn" data-act="rand"><i data-lucide="dice-5"></i>Random centroids</button>
              <button class="tfp-btn ghost" data-act="data"><i data-lucide="shuffle"></i>New points</button>
            </div></div>
          <div class="tfp-card"><div class="tfp-card-head"><h4>WCSS</h4><span class="tfp-card-sub">Σ ‖x − μ<sub>c(x)</sub>‖² · <span style="color:#0ea5e9">●</span> after Assign <span style="color:#f59e0b">●</span> after Update</span></div><div id="kml-wcss"></div></div>
        </div>
      </div>
      <div class="kml-two b">
        <div class="tfp-card"><div class="tfp-card-head"><h4>Clusters</h4><span class="tfp-card-sub">μ<sub>k</sub> = (1/|C<sub>k</sub>|) Σ x<sub>i</sub></span></div><div id="kml-table"></div></div>
        <div class="tfp-card"><div class="tfp-card-head"><h4>Selected point</h4><span class="tfp-card-sub">c<sub>i</sub> = argmin<sub>k</sub> ‖x<sub>i</sub> − μ<sub>k</sub>‖²</span></div><div id="kml-sel"></div></div>
      </div>
      <div class="tfp-card"><div class="tfp-card-head"><h4>Step log</h4></div><ol class="kml-log" id="kml-log"></ol></div>
    </div>`;
    root.querySelector('#kml-reg').addEventListener('change', e => { state.regions = e.target.checked; drawPlot(); });
    update();
    if (window.lucide) window.lucide.createIcons();
  }

  function drawPlot() { const el = root && root.querySelector('#kml-plot'); if (el) el.innerHTML = plotSVG(); }

  function update() {
    drawPlot();
    const [kind, tag, txt] = message();
    const m = root.querySelector('#kml-msg');
    m.className = `tfp-msg kml-msg ${kind}`;
    m.innerHTML = `<span class="tfp-msg-tag">${tag}</span><span>${txt}</span>`;
    root.querySelector('#kml-status').innerHTML = statusHTML();
    const P = state.phase, busy = state.running;
    const bA = root.querySelector('#kml-assign'), bU = root.querySelector('#kml-update'), bR = root.querySelector('#kml-run');
    bA.disabled = P !== 'assign' || busy; bU.disabled = P !== 'update' || busy; bR.disabled = P === 'place' || P === 'done' || busy;
    bA.classList.toggle('next', P === 'assign'); bU.classList.toggle('next', P === 'update');
    root.querySelector('#kml-wcss').innerHTML = wcssChart();
    root.querySelector('#kml-table').innerHTML = clusterTable();
    root.querySelector('#kml-sel').innerHTML = selHTML();
    const log = root.querySelector('#kml-log');
    log.innerHTML = state.log.length ? state.log.map(l => `<li class="${l.k}">${l.t}</li>`).join('') : '<li class="info">No steps yet.</li>';
    log.scrollTop = log.scrollHeight;
  }

  function svgPoint(svg, e) {
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const q = pt.matrixTransform(svg.getScreenCTM().inverse());
    return [LO + (q.x - PAD) / INNER * (HI - LO), LO + (1 - (q.y - 14) / INNER) * (HI - LO)];
  }

  function onClick(e) {
    const ptEl = e.target.closest('.kml-pt');
    const svg = e.target.closest('#kml-svg');
    if (svg && state.phase === 'place') {          // while placing, every click on the graph places a centroid
      const p = svgPoint(svg, e);
      if (p[0] < LO || p[0] > HI || p[1] < LO || p[1] > HI) return;
      addCentroid(p.map(v => Math.round(v * 10) / 10)); update(); return;
    }
    if (ptEl) {
      const i = +ptEl.dataset.i;
      state.sel = state.sel === i ? null : i; update(); return;
    }
    const b = e.target.closest('[data-k],[data-act]');
    if (!b || !root.contains(b)) return;
    if (b.dataset.k) { state.K = +b.dataset.k; resetCentroids(`K set to ${state.K}. Place ${state.K} centroids.`); skeleton(); return; }
    const act = b.dataset.act;
    if (act === 'assign') doAssign();
    else if (act === 'update') doUpdate();
    else if (act === 'run') { runToEnd(); return; }
    else if (act === 'reset') resetCentroids('Centroids cleared. Place new ones to start again.');
    else if (act === 'rand') randomInit();
    else if (act === 'data') newPoints();
    update();
  }

  function render(container) {
    clearInterval(timer); state.running = false; state.anim = null;
    root = document.createElement('div');
    root.className = 'kml-root';
    container.innerHTML = '';
    container.appendChild(root);
    root.addEventListener('click', onClick);
    skeleton();
  }

  window.KMeansLab = { render, _engine: { state, doAssign, doUpdate, nearest, wcssOf } };
})();
