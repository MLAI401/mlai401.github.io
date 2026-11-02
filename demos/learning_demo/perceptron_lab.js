/**
 * Interactive Perceptron Playground (Topic 4 · Neural Networks)
 *
 *   z = w₁x₁ + w₂x₂ + b      ŷ = step(z) = 1 if z ≥ 0, else 0
 *
 * Students drag w₁, w₂, b and watch the decision boundary w₁x₁ + w₂x₂ + b = 0,
 * the four predictions and the accuracy update live. Correct predictions are
 * green, incorrect ones red. A brute-force search over 9,261 lines and a short
 * algebraic proof show why no single perceptron reaches 4/4 on XOR.
 *
 * Public API: window.PerceptronLab.render(container)
 */
(function () {
  'use strict';

  const PTS = [[0, 0], [0, 1], [1, 0], [1, 1]];
  const TARGETS = {
    xor: { name: 'XOR', y: [0, 1, 1, 0] },
    and: { name: 'AND', y: [0, 0, 0, 1] },
    or:  { name: 'OR',  y: [0, 1, 1, 1] }
  };
  const INIT = { w1: 1, w2: 1, b: -0.5 };
  const RANGE = 3, STEP = 0.1;

  const state = { ...INIT, target: 'xor', sel: 1, best: { xor: 0, and: 0, or: 0 }, search: null };
  let root = null;

  // ---------------------------------------------------------------- model
  const zOf = (x) => state.w1 * x[0] + state.w2 * x[1] + state.b;
  const step = (z) => (z >= 0 ? 1 : 0);
  function evaluate() {
    const y = TARGETS[state.target].y;
    const rows = PTS.map((x, i) => { const z = zOf(x), yh = step(z); return { x, z, yh, y: y[i], ok: yh === y[i] }; });
    return { rows, acc: rows.filter(r => r.ok).length };
  }

  // ---------------------------------------------------------------- helpers
  const r1 = (v) => (Math.abs(v) < 0.005 ? 0 : Math.round(v * 100) / 100);
  const fmt = (v, d = 2) => { const s = r1(v).toFixed(d).replace(/\.?0+$/, ''); return (s === '-0' ? '0' : s).replace('-', '−'); };
  const par = (v) => (v < 0 ? `(${fmt(v)})` : fmt(v));
  const sgnCol = (v) => (v > 0 ? '#2563eb' : v < 0 ? '#e11d48' : '#94a3b8');
  const GOOD = '#16a34a', BAD = '#dc2626';

  // ---------------------------------------------------------------- perceptron diagram
  function diagramSVG(ev) {
    const r = ev.rows[state.sel], x = r.x;
    const W = 640, H = 178;
    const xin = 70, yin = [52, 132], sx = 315, sy = 92, stx = 450, ox = 575;
    const wid = (w) => (0.8 + 3.4 * Math.min(1, Math.abs(w) / RANGE)).toFixed(2);
    const edge = (y1, w, lbl) => {
      const c = sgnCol(w), lx = xin + 26 + (sx - 30 - xin - 26) * 0.5, ly = y1 + (sy - y1) * 0.5;
      return `<line x1="${xin + 22}" y1="${y1}" x2="${sx - 30}" y2="${sy}" stroke="${c}" stroke-opacity="0.6" stroke-width="${wid(w)}"/>` +
        `<text x="${lx}" y="${ly - 6}" class="pcp-elbl" fill="${c}">${lbl} = ${fmt(w)}</text>`;
    };
    let s = `<svg viewBox="0 0 ${W} ${H}" class="pcp-diag" role="img" aria-label="Perceptron diagram">`;
    s += `<defs><marker id="pcp-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z" fill="#64748b"/></marker></defs>`;
    s += edge(yin[0], state.w1, 'w₁') + edge(yin[1], state.w2, 'w₂');
    // inputs
    [0, 1].forEach(k => {
      s += `<circle cx="${xin}" cy="${yin[k]}" r="22" class="pcp-node in"/>` +
        `<text x="${xin}" y="${yin[k] + 5}" class="pcp-nv">${x[k]}</text>` +
        `<text x="${xin - 30}" y="${yin[k] + 5}" class="pcp-nl" text-anchor="end">x${k ? '₂' : '₁'}</text>`;
    });
    // bias arrow into Σ
    s += `<line x1="${sx}" y1="${sy - 70}" x2="${sx}" y2="${sy - 32}" stroke="#7c3aed" stroke-width="1.8"/>` +
      `<path d="M${sx - 4.5} ${sy - 37} L${sx + 4.5} ${sy - 37} L${sx} ${sy - 30} Z" fill="#7c3aed"/>` +
      `<text x="${sx + 8}" y="${sy - 58}" class="pcp-bl">b = ${fmt(state.b)}</text>`;
    // Σ node
    s += `<circle cx="${sx}" cy="${sy}" r="30" class="pcp-node sum"/>` +
      `<text x="${sx}" y="${sy - 6}" class="pcp-sig">Σ</text>` +
      `<text x="${sx}" y="${sy + 13}" class="pcp-nv sm">z=${fmt(r.z)}</text>`;
    // step box
    s += `<line x1="${sx + 30}" y1="${sy}" x2="${stx - 34}" y2="${sy}" stroke="#64748b" stroke-width="1.6" marker-end="url(#pcp-ah)"/>` +
      `<rect x="${stx - 32}" y="${sy - 24}" width="64" height="48" rx="8" class="pcp-step"/>` +
      `<path d="M${stx - 22} ${sy + 12} H${stx} V${sy - 12} H${stx + 22}" fill="none" stroke="#0f172a" stroke-width="2"/>` +
      `<text x="${stx}" y="${sy + 40}" class="pcp-nl" text-anchor="middle">step(z)</text>`;
    // output
    const oc = r.ok ? GOOD : BAD;
    s += `<line x1="${stx + 32}" y1="${sy}" x2="${ox - 30}" y2="${sy}" stroke="#64748b" stroke-width="1.6" marker-end="url(#pcp-ah)"/>` +
      `<circle cx="${ox}" cy="${sy}" r="27" class="pcp-node out" style="stroke:${oc};fill:${r.ok ? '#f0fdf4' : '#fef2f2'}"/>` +
      `<text x="${ox}" y="${sy + 6}" class="pcp-nv big" fill="${oc}">${r.yh}</text>` +
      `<text x="${ox}" y="${sy - 36}" class="pcp-nl" text-anchor="middle">ŷ</text>` +
      `<text x="${ox}" y="${sy + 46}" class="pcp-nl" text-anchor="middle" fill="${oc}">target y = ${r.y} ${r.ok ? '✓' : '✗'}</text>`;
    s += '</svg>';
    return s;
  }

  // ---------------------------------------------------------------- decision-boundary plot
  const LO = -0.5, HI = 1.5;
  function clipHalfPlane(poly) {         // keep the part of polygon where z ≥ 0
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length], za = zOf(a), zb = zOf(b);
      if (za >= 0) out.push(a);
      if ((za >= 0) !== (zb >= 0)) { const t = za / (za - zb); out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]); }
    }
    return out;
  }
  function boundarySeg() {
    const { w1, w2, b } = state, pts = [];
    if (Math.abs(w1) < 1e-9 && Math.abs(w2) < 1e-9) return null;
    if (Math.abs(w2) > 1e-9) [LO, HI].forEach(x => { const y = -(w1 * x + b) / w2; if (y >= LO - 1e-9 && y <= HI + 1e-9) pts.push([x, y]); });
    if (Math.abs(w1) > 1e-9) [LO, HI].forEach(y => { const x = -(w2 * y + b) / w1; if (x >= LO - 1e-9 && x <= HI + 1e-9) pts.push([x, y]); });
    const uniq = pts.filter((p, i) => pts.findIndex(q => Math.hypot(q[0] - p[0], q[1] - p[1]) < 1e-6) === i);
    return uniq.length >= 2 ? [uniq[0], uniq[1]] : null;
  }
  function plotSVG(ev) {
    const S = 300, pad = 34, inner = S - pad - 12;
    const X = (v) => pad + (v - LO) / (HI - LO) * inner;
    const Y = (v) => 12 + (1 - (v - LO) / (HI - LO)) * inner;
    let s = `<svg viewBox="0 0 ${S} ${S}" class="pcp-plot" role="img" aria-label="Decision boundary plot">`;
    s += `<rect x="${X(LO)}" y="${Y(HI)}" width="${inner}" height="${inner}" class="pcp-r0"/>`;
    const reg = clipHalfPlane([[LO, LO], [HI, LO], [HI, HI], [LO, HI]]);
    if (reg.length >= 3) s += `<path d="M${reg.map(p => X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join(' L')} Z" class="pcp-r1"/>`;
    // grid + axes
    [0, 1].forEach(v => {
      s += `<line x1="${X(v)}" y1="${Y(HI)}" x2="${X(v)}" y2="${Y(LO)}" class="pcp-grid"/><line x1="${X(LO)}" y1="${Y(v)}" x2="${X(HI)}" y2="${Y(v)}" class="pcp-grid"/>`;
      s += `<text x="${X(v)}" y="${Y(LO) + 14}" class="pcp-tick" text-anchor="middle">${v}</text><text x="${X(LO) - 6}" y="${Y(v) + 4}" class="pcp-tick" text-anchor="end">${v}</text>`;
    });
    s += `<text x="${X(HI) - 2}" y="${Y(LO) + 26}" class="pcp-ax" text-anchor="end">x₁ →</text>`;
    s += `<text x="${X(LO) - 22}" y="${Y(HI) + 10}" class="pcp-ax" text-anchor="middle">x₂</text>`;
    // region labels
    const seg = boundarySeg();
    if (seg) {
      const [p, q] = seg;
      s += `<line x1="${X(p[0])}" y1="${Y(p[1])}" x2="${X(q[0])}" y2="${Y(q[1])}" class="pcp-line"/>`;
      // place the normal arrow where it is farthest from the four data points
      let m = null, bestD = -1;
      for (let t = 0.15; t <= 0.851; t += 0.05) {
        const c = [p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])];
        const d = Math.min(...PTS.map(x => Math.hypot(x[0] - c[0], x[1] - c[1])));
        if (d > bestD) { bestD = d; m = c; }
      }
      const n = Math.hypot(state.w1, state.w2);
      const e = [m[0] + 0.22 * state.w1 / n, m[1] + 0.22 * state.w2 / n];
      s += `<line x1="${X(m[0])}" y1="${Y(m[1])}" x2="${X(e[0])}" y2="${Y(e[1])}" stroke="#0f172a" stroke-width="1.6" marker-end="url(#pcp-ah2)"/>`;
      s += `<text x="${X(e[0]) + (state.w1 >= 0 ? 4 : -4)}" y="${Y(e[1]) - 4}" class="pcp-nlbl" text-anchor="${state.w1 >= 0 ? 'start' : 'end'}">ŷ = 1 side</text>`;
    } else {
      s += `<text x="${X(0.5)}" y="${Y(1.38)}" class="pcp-nlbl" text-anchor="middle">w₁ = w₂ = 0: no boundary — every point gets ŷ = ${step(state.b)}</text>`;
    }
    s += `<defs><marker id="pcp-ah2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="#0f172a"/></marker></defs>`;
    // points
    ev.rows.forEach((r, i) => {
      const cx = X(r.x[0]), cy = Y(r.x[1]), c = r.ok ? GOOD : BAD, sel = i === state.sel;
      if (sel) s += `<circle cx="${cx}" cy="${cy}" r="19" class="pcp-selring"/>`;
      s += r.y === 1
        ? `<circle cx="${cx}" cy="${cy}" r="12" fill="${c}" stroke="#fff" stroke-width="2" class="pcp-pt" data-i="${i}"/>`
        : `<rect x="${cx - 11}" y="${cy - 11}" width="22" height="22" rx="3" fill="${c}" stroke="#fff" stroke-width="2" class="pcp-pt" data-i="${i}"/>`;
      s += `<text x="${cx}" y="${cy + 4}" class="pcp-ptxt" data-i="${i}">${r.y}</text>`;
      s += `<text x="${cx + (r.x[0] ? 16 : -16)}" y="${cy + (r.x[1] ? -14 : 24)}" class="pcp-plbl" text-anchor="${r.x[0] ? 'start' : 'end'}" fill="${c}">ŷ=${r.yh} ${r.ok ? '✓' : '✗'}</text>`;
    });
    s += '</svg>';
    return s;
  }

  // ---------------------------------------------------------------- table + messages
  function tableHTML(ev) {
    return `<table class="pcp-table"><thead><tr><th>x₁</th><th>x₂</th><th>z</th><th>ŷ</th><th>y</th><th></th></tr></thead><tbody>
      ${ev.rows.map((r, i) => `<tr class="${r.ok ? 'ok' : 'bad'} ${i === state.sel ? 'sel' : ''}" data-i="${i}">
        <td>${r.x[0]}</td><td>${r.x[1]}</td><td>${fmt(r.z)}</td><td><b>${r.yh}</b></td><td>${r.y}</td><td>${r.ok ? '✓' : '✗'}</td></tr>`).join('')}
      </tbody></table>`;
  }
  function message(ev) {
    const T = TARGETS[state.target].name, a = ev.acc, bad = ev.rows.filter(r => !r.ok).map(r => `(${r.x})`);
    if (state.target === 'xor') {
      if (a === 4) return ['ok', 'Solved?', 'You found 4/4 on XOR — check the table again!'];
      if (a === 3) return ['warn', 'Stuck at 3/4', `Only ${bad[0]} is wrong. Try to fix it without turning another point red — can any straight line do it?`];
      return ['try', 'Try', `${bad.length} points are red. Move the line so more points turn green. Then aim for 4/4.`];
    }
    if (a === 4) return ['ok', 'Solved', `${T} is linearly separable — one line splits the classes. Now switch to <b>XOR</b> and try the same thing.`];
    return ['try', 'Try', `Adjust w₁, w₂ and b until all four ${T} points are green.`];
  }

  function bruteForce() {
    const y = TARGETS[state.target].y, vals = [];
    for (let k = -10; k <= 10; k++) vals.push(k / 5);
    let n = 0, best = 0, perfect = 0;
    const hist = [0, 0, 0, 0, 0];
    for (const w1 of vals) for (const w2 of vals) for (const b of vals) {
      let acc = 0;
      PTS.forEach((x, i) => { if (step(w1 * x[0] + w2 * x[1] + b) === y[i]) acc++; });
      n++; hist[acc]++; best = Math.max(best, acc); if (acc === 4) perfect++;
    }
    return { target: state.target, n, best, perfect, hist };
  }
  function searchHTML() {
    const r = state.search;
    if (!r || r.target !== state.target) return `<div class="tfp-hint">Tries every combination of w₁, w₂, b ∈ {−2, −1.8, …, 2} on ${TARGETS[state.target].name}.</div>`;
    const T = TARGETS[r.target].name, mx = Math.max(...r.hist);
    return `<div class="pcp-hist">${r.hist.map((c, k) => `<div class="pcp-hrow"><span>${k}/4</span><div class="pcp-hbar"><i style="width:${(c / mx * 100).toFixed(1)}%;background:${k === 4 ? GOOD : k === r.best ? '#f59e0b' : '#94a3b8'}"></i></div><b>${c.toLocaleString()}</b></div>`).join('')}</div>
      <div class="pcp-verdict ${r.perfect ? 'ok' : 'bad'}">${r.n.toLocaleString()} lines tested on ${T}: best accuracy <b>${r.best}/4</b>; lines reaching 4/4: <b>${r.perfect.toLocaleString()}</b>.</div>`;
  }

  // ---------------------------------------------------------------- render
  function skeleton() {
    const slider = (k, lbl, col) => `<div class="pcp-sl">
        <label for="pcp-${k}" style="color:${col}">${lbl}</label>
        <input type="range" id="pcp-${k}" data-k="${k}" min="${-RANGE}" max="${RANGE}" step="${STEP}" value="${state[k]}" class="evo-range">
        <b class="evo-rv" id="pcp-${k}-v"></b></div>`;
    root.innerHTML = `<div class="tfp-viz pcp-viz">
      <div class="tfp-viz-head"><h3>Perceptron Playground</h3>
        <div class="pcp-tgt" role="group" aria-label="Target function">
          ${Object.keys(TARGETS).map(t => `<button class="tfp-btn ${t === state.target ? 'on' : ''}" data-tgt="${t}">${TARGETS[t].name}</button>`).join('')}
        </div></div>
      <div class="tfp-msg pcp-msg" id="pcp-msg"></div>
      <div class="tfp-card"><div class="tfp-card-head"><h4>Perceptron</h4><span class="tfp-card-sub">tracing x = <b id="pcp-selx"></b> · click a point or row to trace it</span></div>
        <div id="pcp-diag"></div>
        <div class="pcp-eq" id="pcp-eq"></div></div>
      <div class="pcp-two">
        <div class="tfp-card"><div class="tfp-card-head"><h4>Decision boundary</h4><span class="tfp-card-sub">w₁x₁ + w₂x₂ + b = 0</span></div>
          <div id="pcp-plot"></div>
          <div class="pcp-legend"><span><i class="c"></i>target y = 1</span><span><i class="s"></i>target y = 0</span><span><i class="g"></i>correct</span><span><i class="r"></i>wrong</span><span><i class="sh"></i>ŷ = 1 region</span></div></div>
        <div class="pcp-side">
          <div class="tfp-card"><div class="tfp-card-head"><h4>Parameters</h4><span class="tfp-card-sub">ŷ = 1 if z ≥ 0</span></div>
            ${slider('w1', 'w₁', '#2563eb')}${slider('w2', 'w₂', '#2563eb')}${slider('b', 'b', '#7c3aed')}
            <div class="tfp-row" style="margin-top:0.45rem">
              <button class="tfp-btn" data-act="reset"><i data-lucide="rotate-ccw"></i>Reset</button>
              <button class="tfp-btn" data-act="rand"><i data-lucide="shuffle"></i>Random</button>
            </div></div>
          <div class="tfp-card"><div class="tfp-card-head"><h4>Predictions</h4><span class="pcp-acc" id="pcp-acc"></span></div>
            <div id="pcp-table"></div>
            <div class="pcp-best" id="pcp-best"></div></div>
        </div>
      </div>
      <div class="tfp-card"><div class="tfp-card-head"><h4><span>Can <em>any</em> line do it?</span></h4>
          <button class="tfp-btn primary" data-act="search"><i data-lucide="search"></i>Test 9,261 lines</button></div>
        <div id="pcp-search"></div>
        <details class="pcp-why"><summary>Why a single perceptron cannot solve XOR</summary>
          <p>For ŷ to match XOR, all four conditions must hold:</p>
          <ul><li>(0,0) → 0: &nbsp;<code>b &lt; 0</code></li><li>(0,1) → 1: &nbsp;<code>w₂ + b ≥ 0</code></li>
            <li>(1,0) → 1: &nbsp;<code>w₁ + b ≥ 0</code></li><li>(1,1) → 0: &nbsp;<code>w₁ + w₂ + b &lt; 0</code></li></ul>
          <p>Add the middle two: <code>w₁ + w₂ + 2b ≥ 0</code>, so <code>w₁ + w₂ + b ≥ −b &gt; 0</code> (because b &lt; 0). That contradicts the last condition. No w₁, w₂, b satisfy all four, so a single line can get at most 3 of 4 right. A hidden layer fixes this: see <b>Forward Pass &amp; Activations</b>.</p>
        </details></div>
    </div>`;
    wire();
    update();
    if (window.lucide) window.lucide.createIcons();
  }

  function update() {
    const ev = evaluate();
    state.best[state.target] = Math.max(state.best[state.target], ev.acc);
    ['w1', 'w2', 'b'].forEach(k => { const el = root.querySelector(`#pcp-${k}-v`); if (el) el.textContent = fmt(state[k], 1); });
    root.querySelector('#pcp-diag').innerHTML = diagramSVG(ev);
    root.querySelector('#pcp-plot').innerHTML = plotSVG(ev);
    root.querySelector('#pcp-table').innerHTML = tableHTML(ev);
    const r = ev.rows[state.sel];
    root.querySelector('#pcp-selx').textContent = `(${r.x[0]}, ${r.x[1]})`;
    root.querySelector('#pcp-eq').innerHTML = `z = w₁x₁ + w₂x₂ + b = ${par(state.w1)}·${r.x[0]} + ${par(state.w2)}·${r.x[1]} + ${par(state.b)} = <b>${fmt(r.z)}</b> &nbsp;→&nbsp; ŷ = step(${fmt(r.z)}) = <b style="color:${r.ok ? GOOD : BAD}">${r.yh}</b>`;
    const acc = root.querySelector('#pcp-acc');
    acc.textContent = `accuracy ${ev.acc}/4 · ${ev.acc * 25}%`;
    acc.className = 'pcp-acc ' + (ev.acc === 4 ? 'ok' : ev.acc === 3 ? 'warn' : 'bad');
    root.querySelector('#pcp-best').innerHTML = `Best you have reached on ${TARGETS[state.target].name}: <b>${state.best[state.target]}/4</b>`;
    const [kind, tag, txt] = message(ev);
    const m = root.querySelector('#pcp-msg');
    m.className = `tfp-msg pcp-msg ${kind}`;
    m.innerHTML = `<span class="tfp-msg-tag">${tag}</span><span>${txt}</span>`;
    root.querySelector('#pcp-search').innerHTML = searchHTML();
  }

  function wire() {
    root.querySelectorAll('input[type=range]').forEach(inp => inp.addEventListener('input', () => {
      state[inp.dataset.k] = Math.round(parseFloat(inp.value) * 10) / 10; update();
    }));
  }
  function onClick(e) {
    {
      const t = e.target.closest('[data-tgt],[data-act],[data-i]');
      if (!t || !root.contains(t)) return;
      if (t.dataset.tgt) { state.target = t.dataset.tgt; skeleton(); return; }
      if (t.dataset.i !== undefined) { state.sel = +t.dataset.i; update(); return; }
      const act = t.dataset.act;
      if (act === 'reset') { Object.assign(state, INIT); syncSliders(); update(); }
      else if (act === 'rand') {
        const r = () => Math.round((Math.random() * 2 - 1) * RANGE * 10) / 10;
        state.w1 = r(); state.w2 = r(); state.b = r(); syncSliders(); update();
      } else if (act === 'search') { state.search = bruteForce(); update(); }
    }
  }
  function syncSliders() { ['w1', 'w2', 'b'].forEach(k => { const el = root.querySelector(`#pcp-${k}`); if (el) el.value = state[k]; }); }

  function render(container) {
    root = document.createElement('div');
    root.className = 'pcp-root';
    container.innerHTML = '';
    container.appendChild(root);
    root.addEventListener('click', onClick);
    skeleton();
  }

  window.PerceptronLab = { render, _engine: { PTS, TARGETS, bruteForce, state } };
})();
