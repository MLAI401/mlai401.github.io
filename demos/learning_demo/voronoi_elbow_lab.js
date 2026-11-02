/**
 * Voronoi Tessellation & Elbow Method Playground (Topic 5 · Unsupervised Learning)
 *
 * 1. Voronoi: choose K (2–4), drag centroids; exact Voronoi cells are recomputed
 *    live, points take the colour of their nearest centroid, and a selected
 *    point shows its distance to every centroid.
 * 2. Elbow: on the same dataset, best-of-many K-Means runs give WCSS for K = 1…8.
 *    Students pick K on the curve to see that clustering; the elbow is found as
 *    the point farthest from the straight line joining K = 1 and K = 8.
 *
 * Public API: window.VoronoiElbowLab.render(container)
 */
(function () {
  'use strict';

  const DEFAULT_PTS = [
    [1.4, 8.3], [2.6, 8.6], [1.8, 7.1], [3.0, 7.5], [2.2, 6.6], [1.2, 7.6],
    [7.0, 8.2], [8.3, 8.0], [7.4, 6.6], [8.6, 7.0], [6.8, 7.3], [7.9, 8.9],
    [4.0, 2.8], [5.2, 1.4], [5.8, 2.6], [4.6, 1.6], [5.0, 3.3], [6.3, 1.9]
  ];
  const START = [[2, 3], [8, 3], [5, 8.5], [5, 5.5]];
  const COLORS = ['#2563eb', '#f59e0b', '#10b981', '#db2777', '#7c3aed', '#0891b2', '#ea580c', '#65a30d'];
  const SOFT = COLORS.map(c => c + '1f');
  const MU = k => `μ${'₁₂₃₄₅₆₇₈'[k]}`;
  const LO = 0, HI = 10, KMAX = 8;

  const st = {
    pts: DEFAULT_PTS.map(p => p.slice()),
    K: 3, cents: START.slice(0, 3).map(c => c.slice()), sel: 0, drag: -1,
    elbow: null, eK: null
  };
  let root = null;

  // ---------------------------------------------------------------- math
  const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
  const nearest = (p, C) => { let k = 0; for (let j = 1; j < C.length; j++) if (d2(p, C[j]) < d2(p, C[k])) k = j; return k; };
  const wcss = (P, C, A) => P.reduce((s, p, i) => s + d2(p, C[A[i]]), 0);
  const f1 = v => v.toFixed(1), f2 = v => v.toFixed(2);

  function clip(poly, f) {                 // keep the part of a convex polygon where f(p) ≥ 0
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length], fa = f(a), fb = f(b);
      if (fa >= 0) out.push(a);
      if ((fa >= 0) !== (fb >= 0)) { const t = fa / (fa - fb); out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]); }
    }
    return out;
  }
  function voronoiCells(C) {               // exact cells inside the plot box
    return C.map((ci, i) => {
      let poly = [[LO, LO], [HI, LO], [HI, HI], [LO, HI]];
      C.forEach((cj, j) => {
        if (j === i || poly.length < 3) return;
        const k = (cj[0] ** 2 + cj[1] ** 2) - (ci[0] ** 2 + ci[1] ** 2), ax = 2 * (cj[0] - ci[0]), ay = 2 * (cj[1] - ci[1]);
        poly = clip(poly, p => k - ax * p[0] - ay * p[1]);
      });
      return poly;
    });
  }

  function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  function kmeansBest(P, K, restarts = 25) {
    const R = rng(1234 + K);
    let best = null;
    for (let r = 0; r < restarts; r++) {
      // k-means++ initialisation
      const C = [P[Math.floor(R() * P.length)].slice()];
      while (C.length < K) {
        const D = P.map(p => Math.min(...C.map(c => d2(p, c)))), tot = D.reduce((a, b) => a + b, 0);
        let u = R() * tot, i = 0;
        while (i < P.length - 1 && u > D[i]) { u -= D[i]; i++; }
        C.push(P[i].slice());
      }
      let A = P.map(p => nearest(p, C));
      for (let it = 0; it < 100; it++) {
        for (let k = 0; k < K; k++) {
          const m = P.filter((_, i) => A[i] === k);
          if (m.length) C[k] = [m.reduce((s, p) => s + p[0], 0) / m.length, m.reduce((s, p) => s + p[1], 0) / m.length];
        }
        const A2 = P.map(p => nearest(p, C));
        if (A2.every((a, i) => a === A[i])) break;
        A = A2;
      }
      const w = wcss(P, C, A);
      if (!best || w < best.w - 1e-9) best = { C: C.map(c => c.slice()), A: A.slice(), w };
    }
    // order clusters left-to-right, top-to-bottom so colours are stable
    const order = best.C.map((c, k) => k).sort((a, b) => (best.C[a][0] - best.C[b][0]) || (best.C[b][1] - best.C[a][1]));
    const inv = []; order.forEach((k, i) => { inv[k] = i; });
    return { C: order.map(k => best.C[k]), A: best.A.map(a => inv[a]), w: best.w };
  }

  function computeElbow() {
    const Kn = Math.min(KMAX, st.pts.length);
    const res = [];
    for (let K = 1; K <= Kn; K++) res.push({ K, ...kmeansBest(st.pts, K) });
    const W1 = res[0].w, Wn = res[Kn - 1].w;
    let elbow = 2, bestGap = -Infinity;
    res.forEach(r => {
      if (r.K === 1 || r.K === Kn) return;
      const x = (r.K - 1) / (Kn - 1), y = (W1 - r.w) / (W1 - Wn || 1);
      r.gap = y - x;                                   // distance above the chord (scaled)
      if (r.gap > bestGap) { bestGap = r.gap; elbow = r.K; }
    });
    st.elbow = { res, elbow };
    if (st.eK === null || st.eK > Kn) st.eK = elbow;
  }

  function newData() {
    const R = Math.random;
    const nb = 2 + Math.floor(R() * 4), n = 16 + Math.floor(R() * 9), centers = [];
    let guard = 0;
    while (centers.length < nb && guard++ < 500) {
      const c = [1.6 + R() * 6.8, 1.6 + R() * 6.8];
      if (centers.every(o => Math.sqrt(d2(o, c)) > 3)) centers.push(c);
    }
    const g = () => { let u = 0, v = 0; while (!u) u = R(); while (!v) v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    st.pts = Array.from({ length: n }, (_, i) => {
      const c = centers[i % centers.length];
      return [c[0] + g() * 0.75, c[1] + g() * 0.75].map(v => Math.round(Math.min(9.7, Math.max(0.3, v)) * 10) / 10);
    });
    st.sel = 0; st.eK = null;
    computeElbow();
  }

  // ---------------------------------------------------------------- shared plot helpers
  function frame(S, pad) {
    const inner = S - pad - 12;
    const X = v => pad + (v - LO) / (HI - LO) * inner, Y = v => 12 + (1 - (v - LO) / (HI - LO)) * inner;
    let s = `<rect x="${X(LO)}" y="${Y(HI)}" width="${inner}" height="${inner}" class="vel-bg"/>`;
    return { X, Y, inner, s };
  }
  function axes(F, S, small) {
    let s = '';
    for (let v = 0; v <= 10; v += small ? 5 : 2) {
      s += `<line x1="${F.X(v)}" y1="${F.Y(HI)}" x2="${F.X(v)}" y2="${F.Y(LO)}" class="vel-grid"/><line x1="${F.X(LO)}" y1="${F.Y(v)}" x2="${F.X(HI)}" y2="${F.Y(v)}" class="vel-grid"/>`;
      s += `<text x="${F.X(v)}" y="${F.Y(LO) + 14}" class="vel-tick" text-anchor="middle">${v}</text><text x="${F.X(LO) - 6}" y="${F.Y(v) + 4}" class="vel-tick" text-anchor="end">${v}</text>`;
    }
    return s;
  }
  const polyPath = (poly, F) => 'M' + poly.map(p => F.X(p[0]).toFixed(1) + ' ' + F.Y(p[1]).toFixed(1)).join(' L') + ' Z';
  const diamond = (cx, cy, r, col, lbl, cls = '') => `<g class="${cls}"><path d="M${cx} ${cy - r} L${cx + r} ${cy} L${cx} ${cy + r} L${cx - r} ${cy} Z" fill="${col}" stroke="#0f172a" stroke-width="1.6"/>${lbl ? `<text x="${cx}" y="${cy + 4}" class="vel-ctxt">${lbl}</text>` : ''}</g>`;

  // ---------------------------------------------------------------- 1 · Voronoi
  const VS = 420, VPAD = 34;
  function voronoiInner() {
    const F = frame(VS, VPAD), C = st.cents, cells = voronoiCells(C), A = st.pts.map(p => nearest(p, C));
    let s = F.s;
    cells.forEach((poly, k) => { if (poly.length >= 3) s += `<path d="${polyPath(poly, F)}" fill="${SOFT[k]}" class="vel-cell"/>`; });
    s += axes(F, VS);
    cells.forEach((poly, k) => { if (poly.length >= 3) s += `<path d="${polyPath(poly, F)}" fill="none" class="vel-edge"/>`; });
    s += `<text x="${F.X(HI)}" y="${VS - 1}" class="vel-ax" text-anchor="end">x →</text><text x="6" y="${F.Y(9) + 4}" class="vel-ax">y ↑</text>`;
    // distance lines from the selected point
    const p = st.pts[st.sel], kn = A[st.sel];
    C.forEach((c, k) => { s += `<line x1="${F.X(p[0])}" y1="${F.Y(p[1])}" x2="${F.X(c[0])}" y2="${F.Y(c[1])}" stroke="${COLORS[k]}" class="vel-dist ${k === kn ? 'min' : ''}"/>`; });
    st.pts.forEach((q, i) => {
      if (i === st.sel) s += `<circle cx="${F.X(q[0])}" cy="${F.Y(q[1])}" r="11.5" class="vel-selring"/>`;
      s += `<circle cx="${F.X(q[0])}" cy="${F.Y(q[1])}" r="6.2" fill="${COLORS[A[i]]}" stroke="#fff" stroke-width="1.6" class="vel-pt" data-i="${i}"/>`;
    });
    C.forEach((c, k) => {
      s += `<g class="vel-handle ${st.drag === k ? 'drag' : ''}" data-c="${k}"><circle cx="${F.X(c[0])}" cy="${F.Y(c[1])}" r="20" fill="transparent"/>` +
        diamond(F.X(c[0]), F.Y(c[1]), 13, COLORS[k], k + 1) + '</g>';
    });
    return s;
  }
  function voronoiSide() {
    const C = st.cents, p = st.pts[st.sel], A = st.pts.map(q => nearest(q, C)), kn = A[st.sel];
    const sizes = C.map((_, k) => A.filter(a => a === k).length), w = wcss(st.pts, C, A);
    const dists = C.map(c => Math.sqrt(d2(p, c)));
    const tie = dists.filter(d => Math.abs(d - dists[kn]) < 0.05).length > 1;
    return `<div class="tfp-card"><div class="tfp-card-head"><h4>Selected point x<sub>${st.sel + 1}</sub> = (${f1(p[0])}, ${f1(p[1])})</h4></div>
        <div class="vel-dlist">${C.map((c, k) => `<div class="vel-drow ${k === kn ? 'min' : ''}"><i class="vel-sw" style="background:${COLORS[k]}"></i>
          <span>d(x, ${MU(k)})</span><div class="vel-dbar"><i style="width:${Math.min(100, dists[k] / 11 * 100).toFixed(1)}%;background:${COLORS[k]}"></i></div><b>${f2(dists[k])}</b></div>`).join('')}</div>
        <div class="tfp-hint" style="margin-top:0.35rem">d = √((x₁−μ₁)² + (x₂−μ₂)²). The point belongs to <b style="color:${COLORS[kn]}">${MU(kn)}</b>, its nearest centroid${tie ? ' — almost a tie, so it sits right next to a boundary' : ''}. Click another point to compare.</div></div>
      <div class="tfp-card"><div class="tfp-card-head"><h4>Cells</h4><span class="tfp-card-sub">WCSS = <b>${f2(w)}</b></span></div>
        <table class="vel-table"><thead><tr><th>centroid</th><th>position</th><th>points</th></tr></thead><tbody>
        ${C.map((c, k) => `<tr><td><i class="vel-sw" style="background:${COLORS[k]}"></i>${MU(k)}</td><td>(${f1(c[0])}, ${f1(c[1])})</td><td>${sizes[k]}</td></tr>`).join('')}</tbody></table></div>`;
  }

  // ---------------------------------------------------------------- 2 · Elbow
  function elbowChart() {
    const { res, elbow } = st.elbow, W = 330, H = 230, pl = 46, pr = 14, pt = 14, pb = 36;
    const mx = res[0].w * 1.05, n = res.length;
    const sx = K => pl + (K - 1) / (n - 1) * (W - pl - pr), sy = v => pt + (1 - v / mx) * (H - pt - pb);
    let s = `<svg viewBox="0 0 ${W} ${H}" class="vel-echart" role="img" aria-label="WCSS versus K">`;
    [0, 0.25, 0.5, 0.75, 1].forEach(f => { const v = mx / 1.05 * f; s += `<line x1="${pl}" x2="${W - pr}" y1="${sy(v)}" y2="${sy(v)}" class="vel-grid"/><text x="${pl - 5}" y="${sy(v) + 3}" class="vel-tick" text-anchor="end">${v >= 100 ? Math.round(v) : f1(v)}</text>`; });
    // chord K=1 → K=n
    s += `<line x1="${sx(1)}" y1="${sy(res[0].w)}" x2="${sx(n)}" y2="${sy(res[n - 1].w)}" class="vel-chord"/>`;
    const e = res[elbow - 1], ex = sx(elbow), ey = sy(e.w);
    const cy = sy(res[0].w + (res[n - 1].w - res[0].w) * (elbow - 1) / (n - 1));
    s += `<line x1="${ex}" y1="${ey}" x2="${ex}" y2="${cy}" class="vel-gapline"/>`;
    s += `<polyline points="${res.map(r => sx(r.K).toFixed(1) + ',' + sy(r.w).toFixed(1)).join(' ')}" fill="none" stroke="#4f46e5" stroke-width="2.4"/>`;
    s += `<circle cx="${ex}" cy="${ey}" r="13" class="vel-elbowring"/><text x="${ex + 16}" y="${ey - 10}" class="vel-elbowlbl">elbow · K = ${elbow}</text>`;
    res.forEach(r => {
      const on = r.K === st.eK;
      s += `<circle cx="${sx(r.K)}" cy="${sy(r.w)}" r="${on ? 7.5 : 5.5}" class="vel-kdot ${on ? 'on' : ''}" data-ek="${r.K}"><title>K = ${r.K}: WCSS = ${f2(r.w)}</title></circle>`;
      s += `<text x="${sx(r.K)}" y="${H - pb + 15}" class="vel-tick ${on ? 'on' : ''}" text-anchor="middle">${r.K}</text>`;
    });
    s += `<text x="${(pl + W - pr) / 2}" y="${H - 4}" class="vel-ax" text-anchor="middle">number of clusters K</text>`;
    s += `<text x="12" y="${(pt + H - pb) / 2}" class="vel-ax" text-anchor="middle" transform="rotate(-90 12 ${(pt + H - pb) / 2})">WCSS</text>`;
    return s + '</svg>';
  }
  function elbowClusterSVG() {
    const r = st.elbow.res[st.eK - 1], S = 260, F = frame(S, 28), cells = voronoiCells(r.C);
    let s = `<svg viewBox="0 0 ${S} ${S}" class="vel-mini" role="img" aria-label="Clustering for selected K">` + F.s;
    cells.forEach((poly, k) => { if (poly.length >= 3) s += `<path d="${polyPath(poly, F)}" fill="${SOFT[k]}"/>`; });
    s += axes(F, S, true);
    cells.forEach(poly => { if (poly.length >= 3) s += `<path d="${polyPath(poly, F)}" fill="none" class="vel-edge thin"/>`; });
    st.pts.forEach((p, i) => { const c = r.C[r.A[i]]; s += `<line x1="${F.X(p[0])}" y1="${F.Y(p[1])}" x2="${F.X(c[0])}" y2="${F.Y(c[1])}" stroke="${COLORS[r.A[i]]}" class="vel-mem"/>`; });
    st.pts.forEach((p, i) => { s += `<circle cx="${F.X(p[0])}" cy="${F.Y(p[1])}" r="4.8" fill="${COLORS[r.A[i]]}" stroke="#fff" stroke-width="1.3"/>`; });
    r.C.forEach((c, k) => { s += diamond(F.X(c[0]), F.Y(c[1]), 8, COLORS[k], ''); });
    return s + '</svg>';
  }
  function elbowExplain() {
    const { res, elbow } = st.elbow, n = res.length, W1 = res[0].w;
    const drop = K => (K <= 1 ? null : (res[K - 2].w - res[K - 1].w) / W1 * 100);
    const r = res[st.eK - 1];
    const dIn = drop(elbow), dOut = elbow < n ? drop(elbow + 1) : null;
    const sel = st.eK === elbow
      ? `<b>K = ${elbow}</b> is the elbow.`
      : st.eK < elbow
        ? `<b>K = ${st.eK}</b> is before the elbow: WCSS is still high, so some clusters are merging groups that are clearly separate. Look at the plot on the right.`
        : `<b>K = ${st.eK}</b> is past the elbow: WCSS is a bit lower, but the extra clusters split groups that already belong together. Each new cluster now buys only a small improvement.`;
    const bars = res.slice(1).map(o => {
      const d = drop(o.K);
      return `<div class="vel-brow ${o.K === elbow ? 'elb' : ''} ${o.K === st.eK ? 'on' : ''}" data-ek="${o.K}"><span>${o.K - 1}→${o.K}</span><div class="vel-bbar"><i style="width:${Math.max(1, d).toFixed(1)}%"></i></div><b>−${d.toFixed(1)}%</b></div>`;
    }).join('');
    return `<div class="vel-explain">
        <div class="vel-kstat"><span>K = ${st.eK}</span><span>WCSS = <b>${f2(r.w)}</b></span><span>${(r.w / W1 * 100).toFixed(1)}% of WCSS at K = 1</span></div>
        <p>${sel}</p>
        <p><b>Why K = ${elbow} is a reasonable choice:</b> going from ${elbow - 1} to ${elbow} clusters cuts WCSS by <b>${dIn.toFixed(1)}%</b> of its starting value${dOut !== null ? `, but adding cluster ${elbow + 1} only removes another <b>${dOut.toFixed(1)}%</b>` : ''}. The curve bends here: before it, each extra centroid captures a real group; after it, extra centroids give diminishing returns. On the chart, K = ${elbow} is the point farthest below the dashed line joining K = 1 and K = ${n}.</p>
        <p class="vel-caveat">WCSS always falls as K grows (with one cluster per point it would be 0), so “lowest WCSS” cannot pick K. The elbow is a rule of thumb: when the bend is soft, also consider what the clusters mean.</p>
      </div>
      <div class="vel-bars"><div class="vel-bhead">WCSS removed by each extra cluster <span>(% of WCSS at K = 1)</span></div>${bars}</div>`;
  }

  // ---------------------------------------------------------------- render
  function skeleton() {
    root.innerHTML = `<div class="tfp-viz vel-viz">
      <div class="tfp-viz-head"><h3>Voronoi Tessellation &amp; The Elbow Method</h3>
        <button class="tfp-btn ghost" data-act="data"><i data-lucide="shuffle"></i>New dataset</button></div>
      <div class="tfp-hint">Both demonstrations use the same <b id="vel-n"></b> unlabeled points.</div>

      <div class="vel-sec"><div class="vel-sec-head"><span class="vel-num">1</span><h4>Voronoi Tessellation</h4>
          <div class="vel-k"><span>K =</span>${[2, 3, 4].map(k => `<button class="tfp-btn ${k === st.K ? 'on' : ''}" data-k="${k}">${k}</button>`).join('')}
          <button class="tfp-btn" data-act="vreset" title="Reset centroid positions"><i data-lucide="rotate-ccw"></i>Reset</button></div></div>
        <div class="tfp-msg vel-msg"><span class="tfp-msg-tag">Try</span><span><b>Drag the diamonds.</b> Each shaded cell holds every location closer to that centroid than to any other, so a point takes the colour of the cell it sits in. Each boundary is the perpendicular bisector between two centroids.</span></div>
        <div class="vel-two">
          <div class="tfp-card vel-plotcard"><svg viewBox="0 0 ${VS} ${VS}" class="vel-plot" id="vel-vsvg" role="img" aria-label="Voronoi diagram"></svg></div>
          <div class="vel-side" id="vel-vside"></div>
        </div></div>

      <div class="vel-sec"><div class="vel-sec-head"><span class="vel-num">2</span><h4>The Elbow Method</h4><span class="tfp-card-sub">WCSS = Σ<sub>k</sub> Σ<sub>x∈C<sub>k</sub></sub> ‖x − μ<sub>k</sub>‖² · best of 25 K-Means runs per K</span></div>
        <div class="tfp-msg vel-msg e"><span class="tfp-msg-tag">Try</span><span><b>Click a K on the curve</b> (or a bar below) to see that clustering. Watch where the curve stops dropping steeply.</span></div>
        <div class="vel-two e">
          <div class="tfp-card"><div class="tfp-card-head"><h4>WCSS vs K</h4></div><div id="vel-echart"></div></div>
          <div class="tfp-card"><div class="tfp-card-head"><h4 id="vel-mini-t"></h4></div><div id="vel-mini"></div></div>
        </div>
        <div class="tfp-card" id="vel-explain"></div></div>
    </div>`;
    wireVoronoi();
    update();
    if (window.lucide) window.lucide.createIcons();
  }

  function drawVoronoi() {
    root.querySelector('#vel-vsvg').innerHTML = voronoiInner();
    root.querySelector('#vel-vside').innerHTML = voronoiSide();
  }
  function drawElbow() {
    root.querySelector('#vel-echart').innerHTML = elbowChart();
    root.querySelector('#vel-mini').innerHTML = elbowClusterSVG();
    root.querySelector('#vel-mini-t').textContent = `Clustering for K = ${st.eK}${st.eK === st.elbow.elbow ? ' (elbow)' : ''}`;
    root.querySelector('#vel-explain').innerHTML = elbowExplain();
  }
  function update() {
    root.querySelector('#vel-n').textContent = st.pts.length;
    drawVoronoi(); drawElbow();
  }

  function svgXY(svg, e) {
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const q = pt.matrixTransform(svg.getScreenCTM().inverse()), inner = VS - VPAD - 12;
    const c = v => Math.round(Math.min(HI, Math.max(LO, v)) * 10) / 10;
    return [c(LO + (q.x - VPAD) / inner * (HI - LO)), c(LO + (1 - (q.y - 12) / inner) * (HI - LO))];
  }
  function wireVoronoi() {
    const svg = root.querySelector('#vel-vsvg');
    svg.addEventListener('pointerdown', e => {
      const h = e.target.closest('.vel-handle');
      if (h) { st.drag = +h.dataset.c; svg.setPointerCapture(e.pointerId); e.preventDefault(); drawVoronoi(); return; }
      const p = e.target.closest('.vel-pt');
      if (p) { st.sel = +p.dataset.i; drawVoronoi(); }
    });
    svg.addEventListener('pointermove', e => {
      if (st.drag < 0) return;
      st.cents[st.drag] = svgXY(svg, e);
      drawVoronoi();
    });
    const end = () => { if (st.drag >= 0) { st.drag = -1; drawVoronoi(); } };
    svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
  }

  function onClick(e) {
    const b = e.target.closest('[data-k],[data-act],[data-ek]');
    if (!b || !root.contains(b)) return;
    if (b.dataset.ek) { st.eK = +b.dataset.ek; drawElbow(); return; }
    if (b.dataset.k) {
      st.K = +b.dataset.k; st.cents = START.slice(0, st.K).map(c => c.slice());
      root.querySelectorAll('[data-k]').forEach(x => x.classList.toggle('on', +x.dataset.k === st.K));
      drawVoronoi(); return;
    }
    if (b.dataset.act === 'vreset') { st.cents = START.slice(0, st.K).map(c => c.slice()); drawVoronoi(); }
    else if (b.dataset.act === 'data') { newData(); st.cents = START.slice(0, st.K).map(c => c.slice()); update(); }
  }

  function render(container) {
    if (!st.elbow) computeElbow();
    root = document.createElement('div');
    root.className = 'vel-root';
    container.innerHTML = '';
    container.appendChild(root);
    root.addEventListener('click', onClick);
    skeleton();
  }

  window.VoronoiElbowLab = { render, _engine: { st, kmeansBest, computeElbow, voronoiCells } };
})();
