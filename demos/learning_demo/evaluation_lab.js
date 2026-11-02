/**
 * Interactive Model Evaluation Lab (Topic 6 · 3 · Evaluation)
 *
 *   Accuracy  = (TP + TN) / N
 *   Precision = TP / (TP + FP)
 *   Recall    = TP / (TP + FN)
 *   F1        = 2TP / (2TP + FP + FN)
 *
 * Two views, one shared colour code (TP green · FN rose · FP amber · TN blue):
 *   'matrix' — editable 2×2 confusion matrix with hover explanations and live
 *              Accuracy / Precision / Recall / F1 cards (explicit undefined states).
 *   'pr'     — score dot-plot with a draggable threshold, the precision–recall
 *              curve with the current operating point, and live P / R / F1.
 *
 * Public API: window.EvaluationLab.render(container, 'matrix' | 'pr')
 */
(function () {
  'use strict';

  // ------------------------------------------------------------ shared
  const COL = { tp: '#059669', fn: '#e11d48', fp: '#d97706', tn: '#2563eb' };
  const OP = '#4f46e5';
  const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
  const pct = v => (v * 100).toFixed(1) + '%';
  const f2 = v => v.toFixed(2);
  const tok = (k, v) => `<span class="evl-tok ${k}">${v}</span>`;
  const signed = d => (d > 0 ? '+' + d : d < 0 ? '−' + Math.abs(d) : '±0');

  function metricsOf(c) {
    const { tp, fp, fn, tn } = c;
    const N = tp + fp + fn + tn;
    return {
      N,
      acc: N ? (tp + tn) / N : null,
      prec: tp + fp ? tp / (tp + fp) : null,
      rec: tp + fn ? tp / (tp + fn) : null,
      f1: 2 * tp + fp + fn ? (2 * tp) / (2 * tp + fp + fn) : null
    };
  }

  // ======================================================= 1 · MATRIX
  const CELLS = {
    tp: { abbr: 'TP', name: 'True Positive', cap: 'spam caught', err: false,
      text: 'Spam that the filter correctly flagged as spam: a correct detection.',
      effect: 'More TP raises Precision, Recall and F1.', uses: ['Accuracy', 'Precision', 'Recall', 'F1'] },
    fn: { abbr: 'FN', name: 'False Negative', cap: 'missed spam', err: true,
      text: 'Spam that the filter let through to the inbox: a missed detection (Type II error).',
      effect: 'More FN lowers Recall and F1. Precision ignores FN.', uses: ['Accuracy', 'Recall', 'F1'] },
    fp: { abbr: 'FP', name: 'False Positive', cap: 'false alarm', err: true,
      text: 'A legitimate email wrongly sent to the spam folder: a false alarm (Type I error).',
      effect: 'More FP lowers Precision and F1. Recall ignores FP.', uses: ['Accuracy', 'Precision', 'F1'] },
    tn: { abbr: 'TN', name: 'True Negative', cap: 'ham delivered', err: false,
      text: 'A legitimate email correctly delivered to the inbox.',
      effect: 'Only Accuracy counts TN. Precision, Recall and F1 ignore it, so a huge pile of easy negatives cannot inflate them.', uses: ['Accuracy'] }
  };

  const MET = [
    { k: 'acc', name: 'Accuracy', uses: ['tp', 'fn', 'fp', 'tn'], q: 'Share of all emails that were classified correctly.',
      sym: `(${tok('tp', 'TP')} + ${tok('tn', 'TN')}) / N`,
      form: c => `(${tok('tp', c.tp)} + ${tok('tn', c.tn)}) / ${c.tp + c.fp + c.fn + c.tn}`,
      undef: 'No emails (N = 0).' },
    { k: 'prec', name: 'Precision', uses: ['tp', 'fp'], q: 'Of the emails flagged as spam, the share that really is spam.',
      sym: `${tok('tp', 'TP')} / (${tok('tp', 'TP')} + ${tok('fp', 'FP')})`,
      form: c => `${tok('tp', c.tp)} / (${tok('tp', c.tp)} + ${tok('fp', c.fp)})`,
      undef: 'Nothing flagged as spam: TP + FP = 0.' },
    { k: 'rec', name: 'Recall', uses: ['tp', 'fn'], q: 'Of all actual spam, the share the filter caught.',
      sym: `${tok('tp', 'TP')} / (${tok('tp', 'TP')} + ${tok('fn', 'FN')})`,
      form: c => `${tok('tp', c.tp)} / (${tok('tp', c.tp)} + ${tok('fn', c.fn)})`,
      undef: 'No actual spam: TP + FN = 0.' },
    { k: 'f1', name: 'F1-Score', uses: ['tp', 'fp', 'fn'], q: 'Harmonic mean of Precision and Recall. Ignores TN.',
      sym: `2${tok('tp', 'TP')} / (2${tok('tp', 'TP')} + ${tok('fp', 'FP')} + ${tok('fn', 'FN')})`,
      form: c => `2·${tok('tp', c.tp)} / (2·${tok('tp', c.tp)} + ${tok('fp', c.fp)} + ${tok('fn', c.fn)})`,
      undef: 'No spam predicted or present: TP + FP + FN = 0.' }
  ];

  const PRESETS = [
    { id: 'spam', label: 'Spam filter', c: { tp: 85, fn: 10, fp: 15, tn: 890 } },
    { id: 'paradox', label: 'Accuracy paradox', c: { tp: 0, fn: 15, fp: 0, tn: 985 } },
    { id: 'eager', label: 'Trigger-happy', c: { tp: 94, fn: 1, fp: 160, tn: 745 } },
    { id: 'cautious', label: 'Over-cautious', c: { tp: 30, fn: 65, fp: 1, tn: 904 } },
    { id: 'empty', label: 'Empty', c: { tp: 0, fn: 0, fp: 0, tn: 0 } }
  ];

  const cm = { c: Object.assign({}, PRESETS[0].c), preset: 'spam', focus: null };
  let mroot = null;

  function cellHTML(k) {
    const d = CELLS[k];
    return `<div class="evl-cell ${k}${d.err ? ' err' : ''}" data-cell="${k}" title="${d.name}: ${d.text}">
      <div class="evl-cell-top"><b>${d.abbr}</b><span>${d.name}</span></div>
      <div class="evl-cell-in">
        <button type="button" class="evl-step" data-step="-1" data-k="${k}" aria-label="Decrease ${d.abbr}">−</button>
        <input type="number" inputmode="numeric" min="0" max="99999" step="1" value="${cm.c[k]}" data-k="${k}" aria-label="${d.name} count (${d.abbr})">
        <button type="button" class="evl-step" data-step="1" data-k="${k}" aria-label="Increase ${d.abbr}">+</button>
      </div>
      <div class="evl-cell-cap" data-cap="${k}"></div>
    </div>`;
  }

  function matrixSkeleton() {
    mroot.innerHTML = `<div class="tfp-viz evl-viz">
      <div class="tfp-viz-head"><h3>Confusion Matrix &amp; Metrics</h3>
        <div class="tfp-row evl-presets" role="group" aria-label="Example scenarios">
          ${PRESETS.map(p => `<button type="button" class="tfp-btn" data-preset="${p.id}">${p.label}</button>`).join('')}
        </div>
      </div>
      <div class="tfp-card evl-cm-card">
        <div class="evl-cm-wrap">
          <div class="evl-cm" id="evl-cm" role="group" aria-label="Confusion matrix. Rows are the actual class, columns are the predicted class. Positive class is spam.">
            <div class="evl-ax-top">Predicted class</div>
            <div class="evl-ax-left"><span>Actual class</span></div>
            <div class="evl-hd col" style="grid-area:pp">Spam (+)<small id="evl-n-pp"></small></div>
            <div class="evl-hd col" style="grid-area:pn">Ham (−)<small id="evl-n-pn"></small></div>
            <div class="evl-hd row" style="grid-area:ap">Spam (+)<small id="evl-n-ap"></small></div>
            <div class="evl-hd row" style="grid-area:an">Ham (−)<small id="evl-n-an"></small></div>
            ${cellHTML('tp')}${cellHTML('fn')}${cellHTML('fp')}${cellHTML('tn')}
          </div>
          <div class="evl-explain-box"><div class="evl-explain" id="evl-explain" aria-live="polite"></div></div>
        </div>
      </div>
      <div class="evl-metrics" id="evl-metrics">
        ${MET.map(m => `<div class="evl-metric" data-m="${m.k}" tabindex="0" aria-describedby="evl-explain">
          <div class="evl-mtop"><span class="evl-mname">${m.name}</span><b class="evl-mval" data-v></b></div>
          <div class="evl-bar" aria-hidden="true"><i data-b></i></div>
          <div class="evl-msym">${m.sym}</div>
          <div class="evl-mform" data-f></div>
        </div>`).join('')}
      </div>
      <div class="tfp-msg evl-note" id="evl-note"></div>
    </div>`;
    updateMatrix();
  }

  function explainHTML(m) {
    const f = cm.focus;
    if (f && CELLS[f]) {
      const d = CELLS[f];
      const share = m.N ? ` (${pct(cm.c[f] / m.N)} of N)` : '';
      return `<h5><span class="evl-chip" style="--c:${COL[f]}">${d.abbr}</span>${d.name} = ${cm.c[f]}${share}</h5>
        <p>${d.text}</p><p class="evl-effect">${d.effect}</p>
        <div class="evl-uses">Used by: ${d.uses.join(' · ')}</div>`;
    }
    const mt = MET.find(x => x.k === f);
    if (mt) {
      const v = m[mt.k];
      return `<h5>${mt.name} = ${v === null ? 'undefined' : pct(v)}</h5>
        <p>${mt.q}</p>
        <div class="evl-uses">Uses ${mt.uses.map(u => tok(u, CELLS[u].abbr)).join(', ')}${mt.uses.length < 4 ? `, ignores ${['tp', 'fn', 'fp', 'tn'].filter(u => !mt.uses.includes(u)).map(u => tok(u, CELLS[u].abbr)).join(', ')}` : ''}.</div>`;
    }
    const c = cm.c;
    const prev = m.N ? pct((c.tp + c.fn) / m.N) : '—';
    return `<h5>How to read it</h5>
      <p>Rows are what the email <b>really</b> is; columns are what the filter <b>predicted</b>. The diagonal (${tok('tp', 'TP')}, ${tok('tn', 'TN')}) holds correct decisions; the dashed cells (${tok('fp', 'FP')}, ${tok('fn', 'FN')}) are errors.</p>
      <div class="evl-kv"><span>N</span><b>${m.N}</b><span>Spam share</span><b>${prev}</b></div>
      <div class="evl-uses">Hover or tab into a cell or metric for details. Type a count or use −/+.</div>`;
  }

  function noteFor(m) {
    const c = m.N ? cm.c : null;
    if (!m.N) return { cls: 'warn', tag: 'Empty', t: 'The matrix has no emails. Every metric is undefined until N > 0. Enter counts or pick a scenario.' };
    const negShare = (c.fp + c.tn) / m.N;
    if (m.acc >= 0.9 && (m.rec === null || m.rec < 0.5) && c.tp + c.fn > 0)
      return { cls: 'warn', tag: 'Paradox', t: `Accuracy is ${pct(m.acc)}, but Recall is only ${pct(m.rec)}. Spam is ${pct(1 - negShare)} of emails, so always predicting “ham” already scores ${pct(negShare)} accuracy. Accuracy hides the missed spam.` };
    if (m.prec === null)
      return { cls: 'warn', tag: 'Undefined', t: 'Nothing was flagged as spam, so Precision is 0/0, which is undefined. Some libraries report 0 instead (scikit-learn’s <code>zero_division</code>). F1 uses 2TP/(2TP+FP+FN), so it is still defined here.' };
    if (m.rec === null)
      return { cls: 'warn', tag: 'Undefined', t: 'There is no actual spam, so Recall is 0/0, which is undefined. You can’t judge detection with no positives to detect.' };
    const gap = m.prec - m.rec;
    if (gap > 0.15) return { cls: 'info', tag: 'Cautious', t: `Precision (${pct(m.prec)}) is well above Recall (${pct(m.rec)}). The filter rarely raises false alarms (${tok('fp', 'FP = ' + c.fp)}), but more spam slips through (${tok('fn', 'FN = ' + c.fn)}).` };
    if (gap < -0.15) return { cls: 'info', tag: 'Eager', t: `Recall (${pct(m.rec)}) is well above Precision (${pct(m.prec)}). The filter catches most spam (${tok('fn', 'FN = ' + c.fn)}), at the cost of many false alarms (${tok('fp', 'FP = ' + c.fp)}).` };
    return { cls: 'ok', tag: 'Balanced', t: `Precision and Recall are close (${pct(m.prec)} vs ${pct(m.rec)}), so F1 (${pct(m.f1)}) sits near both. When P and R diverge, the harmonic mean drags F1 toward the smaller one.` };
  }

  function updateMatrix() {
    if (!mroot) return;
    const c = cm.c, m = metricsOf(c);

    mroot.querySelectorAll('[data-preset]').forEach(b => b.classList.toggle('on', b.dataset.preset === cm.preset));

    ['tp', 'fn', 'fp', 'tn'].forEach(k => {
      const cell = mroot.querySelector(`.evl-cell.${k}`);
      const share = m.N ? c[k] / m.N : 0;
      cell.style.background = hexA(COL[k], 0.05 + 0.2 * Math.sqrt(share));
      const inp = cell.querySelector('input');
      if (document.activeElement !== inp) inp.value = c[k];
      cell.querySelector('[data-cap]').textContent = `${CELLS[k].cap} · ${m.N ? pct(share) : '—'}`;
    });
    mroot.querySelector('#evl-n-pp').textContent = `n = ${c.tp + c.fp}`;
    mroot.querySelector('#evl-n-pn').textContent = `n = ${c.fn + c.tn}`;
    mroot.querySelector('#evl-n-ap').textContent = `n = ${c.tp + c.fn}`;
    mroot.querySelector('#evl-n-an').textContent = `n = ${c.fp + c.tn}`;

    MET.forEach(mt => {
      const el = mroot.querySelector(`.evl-metric[data-m="${mt.k}"]`);
      const v = m[mt.k];
      el.classList.toggle('undef', v === null);
      el.querySelector('[data-v]').textContent = v === null ? '—' : pct(v);
      el.querySelector('[data-b]').style.width = v === null ? '0%' : (v * 100) + '%';
      el.querySelector('[data-f]').innerHTML = v === null
        ? `<span class="evl-undef">undefined</span><span class="why">${mt.undef}</span>`
        : `= ${mt.form(c)}`;
      el.setAttribute('aria-label', `${mt.name}: ${v === null ? 'undefined. ' + mt.undef : pct(v)}`);
    });

    highlight();
    mroot.querySelector('#evl-explain').innerHTML = explainHTML(m);
    const n = noteFor(m), note = mroot.querySelector('#evl-note');
    note.className = `tfp-msg evl-note ${n.cls}`;
    note.innerHTML = `<span class="tfp-msg-tag">${n.tag}</span><span>${n.t}</span>`;
  }

  function highlight() {
    const f = cm.focus;
    const mt = MET.find(x => x.k === f);
    const on = mt ? mt.uses : (CELLS[f] ? [f] : []);
    const grid = mroot.querySelector('#evl-cm');
    grid.classList.toggle('dimming', on.length > 0 && on.length < 4);
    grid.querySelectorAll('.evl-cell').forEach(el => el.classList.toggle('hl', on.includes(el.dataset.cell)));
    mroot.querySelectorAll('.evl-metric').forEach(el => {
      const uses = MET.find(x => x.k === el.dataset.m).uses;
      el.classList.toggle('hl', mt ? el.dataset.m === f : (CELLS[f] ? uses.includes(f) : false));
    });
  }

  function setFocus(f) {
    if (cm.focus === f) return;
    cm.focus = f;
    updateMatrix();
  }

  function bindMatrix() {
    mroot.addEventListener('click', e => {
      const p = e.target.closest('[data-preset]');
      if (p) { const pr0 = PRESETS.find(x => x.id === p.dataset.preset); cm.c = Object.assign({}, pr0.c); cm.preset = pr0.id; updateMatrix(); return; }
      const s = e.target.closest('[data-step]');
      if (s) { const k = s.dataset.k; cm.c[k] = Math.max(0, Math.min(99999, cm.c[k] + parseInt(s.dataset.step, 10))); cm.preset = null; cm.focus = k; updateMatrix(); }
    });
    mroot.addEventListener('input', e => {
      const inp = e.target.closest('input[data-k]');
      if (!inp) return;
      const v = parseInt(inp.value, 10);
      cm.c[inp.dataset.k] = Number.isFinite(v) ? Math.max(0, Math.min(99999, v)) : 0;
      cm.preset = null;
      updateMatrix();
    });
    mroot.addEventListener('change', e => {
      const inp = e.target.closest('input[data-k]');
      if (inp) inp.value = cm.c[inp.dataset.k];               // normalise blanks / negatives
    });
    const target = el => {
      const cell = el.closest && el.closest('.evl-cell');
      if (cell) return cell.dataset.cell;
      const met = el.closest && el.closest('.evl-metric');
      return met ? met.dataset.m : null;
    };
    mroot.addEventListener('pointerover', e => { const t = target(e.target); if (t) setFocus(t); });
    mroot.addEventListener('pointerout', e => {
      const from = target(e.target), to = e.relatedTarget ? target(e.relatedTarget) : null;
      if (from && from !== to) {
        const a = document.activeElement;
        setFocus(to || (a && mroot.contains(a) ? target(a) : null));   // fall back to the keyboard-focused item
      }
    });
    mroot.addEventListener('focusin', e => { const t = target(e.target); if (t) setFocus(t); });
    mroot.addEventListener('focusout', e => {
      const to = e.relatedTarget && mroot.contains(e.relatedTarget) ? target(e.relatedTarget) : null;
      setFocus(to);
    });
  }

  // =================================================== 2 · PR TRADE-OFF
  // Scores are integers 1–99 (= 0.01–0.99); thresholds move in steps of 0.02,
  // matching the dot-plot bins, so every dot is unambiguously left or right of t.
  const SCEN = [
    { id: 'easy', label: 'Well separated', mp: 76, mn: 28, sd: 11 },
    { id: 'moderate', label: 'Some overlap', mp: 66, mn: 38, sd: 13 },
    { id: 'hard', label: 'Heavy overlap', mp: 57, mn: 45, sd: 14 }
  ];
  const NP = 30, NN = 120;
  const MINI = { tp: 'caught', fn: 'missed', fp: 'false alarm', tn: 'delivered' };
  const pr = { scen: 'moderate', T: 50, seed: 1, pos: [], neg: [], curve: [], hover: null, last: null, msg: null };
  let proot = null, resizeObs = null;

  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function countsAt(T) {
    let tp = 0, fp = 0;
    pr.pos.forEach(s => { if (s >= T) tp++; });
    pr.neg.forEach(s => { if (s >= T) fp++; });
    return { tp, fn: NP - tp, fp, tn: NN - fp };
  }
  function genData() {
    const s = SCEN.find(x => x.id === pr.scen);
    const r = rng(pr.seed * 7919 + s.mp * 31 + s.mn);
    const g = () => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    const draw = (mu, n) => Array.from({ length: n }, () => Math.min(99, Math.max(1, Math.round(mu + g() * s.sd))));
    pr.pos = draw(s.mp, NP); pr.neg = draw(s.mn, NN);
    pr.curve = [];
    for (let T = 0; T <= 100; T += 2) { const c = countsAt(T); pr.curve.push(Object.assign({ T }, c, metricsOf(c))); }
    pr.best = pr.curve.reduce((b, p) => (p.f1 !== null && (b === null || p.f1 > b.f1) ? p : b), null);
    // Average precision: Σ (R_k − R_{k−1}) · P_k, thresholds from strict to lenient.
    let ap = 0, rPrev = 0;
    pr.curve.slice().reverse().forEach(p => { if (p.prec !== null) { ap += (p.rec - rPrev) * p.prec; rPrev = p.rec; } });
    pr.ap = ap;
  }
  const at = T => pr.curve.find(p => p.T === T);

  // -------- dot plot (score distribution with threshold)
  let DW = 640;                          // set from the container width so labels stay legible
  const DH = 204, DL = 44, DR = 12, DTOP = 26, DBOT = 168;
  const dx = s => DL + (s / 100) * (DW - DL - DR);

  function dotsSVG() {
    const T = pr.T;
    const pb = Array.from({ length: 50 }, () => []), nb = Array.from({ length: 50 }, () => []);
    pr.pos.forEach(s => pb[Math.min(49, s >> 1)].push(s));
    pr.neg.forEach(s => nb[Math.min(49, s >> 1)].push(s));
    const maxP = Math.max(1, ...pb.map(b => b.length)), maxN = Math.max(1, ...nb.map(b => b.length));
    // One stack step for both rows (so heights compare), and the baseline sits wherever
    // the two stacks meet, so no vertical space is wasted on the shorter row.
    const step = Math.min(11, (DBOT - DTOP - 12) / (maxP + maxN));
    const r = Math.max(1.6, Math.min(5, step / 2 - 0.4));
    const DMID = Math.round(DTOP + 4 + step * maxP + 3);
    const xT = dx(T);
    let dots = '';
    const dot = (cx, cy, k) => {
      const err = k === 'fn' || k === 'fp';
      return err
        ? `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(r - 0.7).toFixed(2)}" fill="#fff" stroke="${COL[k]}" stroke-width="1.7"/>`
        : `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(2)}" fill="${COL[k]}"/>`;
    };
    pb.forEach((b, i) => b.forEach((s, j) => { dots += dot(dx(2 * i + 1), DMID - 3 - step * (j + 0.5), s >= T ? 'tp' : 'fn'); }));
    nb.forEach((b, i) => b.forEach((s, j) => { dots += dot(dx(2 * i + 1), DMID + 3 + step * (j + 0.5), s >= T ? 'fp' : 'tn'); }));

    const ticks = [0, 0.2, 0.4, 0.6, 0.8, 1].map(v => `<line x1="${dx(v * 100)}" x2="${dx(v * 100)}" y1="${DBOT}" y2="${DBOT + 4}" stroke="#94a3b8"/>
      <text class="evl-tick" x="${dx(v * 100)}" y="${DBOT + 15}" text-anchor="middle">${v.toFixed(1)}</text>`).join('');
    const lblX = Math.max(DL + 26, Math.min(DW - DR - 26, xT));
    const rightW = DW - DR - xT, leftW = xT - DL;
    return `<svg class="evl-plot evl-dots" viewBox="0 0 ${DW} ${DH}" role="img" aria-label="Score distribution: ${NP} spam emails above the line, ${NN} ham emails below. Threshold t = ${f2(T / 100)}.">
      <rect x="${DL}" y="${DTOP - 6}" width="${DW - DL - DR}" height="${DBOT - DTOP + 6}" fill="#fff" stroke="#e2e8f0"/>
      <rect x="${xT}" y="${DTOP - 6}" width="${Math.max(0, rightW)}" height="${DBOT - DTOP + 6}" fill="${hexA(OP, 0.06)}"/>
      ${leftW > 92 ? `<text class="evl-reg muted" x="${DL + 6}" y="${DTOP + 6}">◂ predict ham</text>` : ''}
      ${rightW > 96 ? `<text class="evl-reg" x="${DW - DR - 6}" y="${DTOP + 6}" text-anchor="end">predict spam ▸</text>` : ''}
      <line x1="${DL}" x2="${DW - DR}" y1="${DMID}" y2="${DMID}" stroke="#cbd5e1"/>
      <text class="evl-tick" x="${DL - 5}" y="${DTOP + 2}" text-anchor="end">actual</text>
      <text class="evl-axt" x="${DL - 5}" y="${DMID - 5}" text-anchor="end">spam</text>
      <text class="evl-axt" x="${DL - 5}" y="${DMID + 14}" text-anchor="end">ham</text>
      ${dots}
      <line x1="${xT}" x2="${xT}" y1="${DTOP - 8}" y2="${DBOT}" stroke="${OP}" stroke-width="2"/>
      <rect x="${lblX - 25}" y="2" width="50" height="16" rx="8" fill="${OP}"/>
      <text class="evl-thl" x="${lblX}" y="13.5" text-anchor="middle">t = ${f2(T / 100)}</text>
      ${ticks}
      <text class="evl-axt" x="${DL + (DW - DL - DR) / 2}" y="${DH - 2}" text-anchor="middle">Classifier score P(spam | email) — flag as spam when score ≥ t</text>
      <rect class="evl-grab" x="${DL}" y="0" width="${DW - DL - DR}" height="${DBOT}" fill="transparent"/>
    </svg>`;
  }

  // -------- PR curve
  const PW = 320, PH = 262, PL = 46, PRR = 12, PT = 10, PB = 40;
  const px = v => PL + v * (PW - PL - PRR);
  const py = v => PT + (1 - v) * (PH - PT - PB);

  function prSVG() {
    const pts = pr.curve.filter(p => p.prec !== null).sort((a, b) => b.T - a.T);   // recall ascending
    const prev = NP / (NP + NN);
    const grid = [0, 0.25, 0.5, 0.75, 1].map(v => `
      <line class="evl-grid" x1="${px(v)}" x2="${px(v)}" y1="${py(0)}" y2="${py(1)}"/>
      <line class="evl-grid" x1="${px(0)}" x2="${px(1)}" y1="${py(v)}" y2="${py(v)}"/>
      <text class="evl-tick" x="${px(v)}" y="${py(0) + 14}" text-anchor="middle">${v}</text>
      <text class="evl-tick" x="${px(0) - 6}" y="${py(v) + 3.5}" text-anchor="end">${v}</text>`).join('');
    const iso = [0.2, 0.4, 0.6, 0.8].map(f => {
      const r0 = f / (2 - f); let d = '';
      for (let i = 0; i <= 32; i++) { const R = r0 + (1 - r0) * i / 32, P = (f * R) / (2 * R - f); d += `${i ? 'L' : 'M'}${px(R).toFixed(1)},${py(Math.min(1, P)).toFixed(1)}`; }
      return `<path class="evl-iso" d="${d}"/><text class="evl-iso-t" x="${px(1) - 3}" y="${py(f / (2 - f)) - 3}" text-anchor="end">F1=${f}</text>`;
    }).join('');
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${px(p.rec).toFixed(1)},${py(p.prec).toFixed(1)}`).join('');
    const marks = pts.map(p => `<circle cx="${px(p.rec).toFixed(1)}" cy="${py(p.prec).toFixed(1)}" r="2" fill="${OP}" fill-opacity="0.45"/>`).join('');

    const cur = at(pr.T);
    let op = '';
    if (cur.prec === null) {
      op = `<rect x="${px(0.1)}" y="${py(0.62)}" width="${px(0.9) - px(0.1)}" height="40" rx="8" fill="#fffbeb" stroke="#f59e0b"/>
        <text class="evl-undef-t" x="${px(0.5)}" y="${py(0.62) + 17}" text-anchor="middle">Operating point undefined</text>
        <text class="evl-undef-s" x="${px(0.5)}" y="${py(0.62) + 31}" text-anchor="middle">no email scores ≥ t, so TP + FP = 0</text>`;
    } else {
      const cx = px(cur.rec), cy = py(cur.prec);
      op = `<line x1="${cx}" x2="${cx}" y1="${cy}" y2="${py(0)}" stroke="${OP}" stroke-dasharray="3 3" stroke-opacity="0.6"/>
        <line x1="${px(0)}" x2="${cx}" y1="${cy}" y2="${cy}" stroke="${OP}" stroke-dasharray="3 3" stroke-opacity="0.6"/>
        <circle cx="${cx}" cy="${cy}" r="10" fill="${hexA(OP, 0.15)}"/>
        <circle cx="${cx}" cy="${cy}" r="6" fill="${OP}" stroke="#fff" stroke-width="2"/>`;
    }
    let hov = '';
    const h = pr.hover !== null ? at(pr.hover) : null;
    if (h && h.prec !== null && h.T !== pr.T) {
      const cx = px(h.rec), cy = py(h.prec);
      const bx = Math.min(px(1) - 150, Math.max(px(0) + 2, cx - 75)), by = cy > py(0.5) ? cy - 40 : cy + 12;
      hov = `<circle cx="${cx}" cy="${cy}" r="5" fill="none" stroke="#0f172a" stroke-width="1.5"/>
        <rect x="${bx}" y="${by}" width="150" height="28" rx="6" fill="#0f172a" fill-opacity="0.9"/>
        <text class="evl-tip" x="${bx + 75}" y="${by + 12}" text-anchor="middle">t ${f2(h.T / 100)} · P ${f2(h.prec)} · R ${f2(h.rec)}</text>
        <text class="evl-tip s" x="${bx + 75}" y="${by + 23}" text-anchor="middle">click to use this threshold</text>`;
    }
    return `<svg class="evl-plot evl-pr" viewBox="0 0 ${PW} ${PH}" role="img" aria-label="Precision-recall curve. Average precision ${f2(pr.ap)}. ${cur.prec === null ? 'Current operating point undefined.' : `Current point: precision ${f2(cur.prec)}, recall ${f2(cur.rec)}.`}">
      <rect x="${px(0)}" y="${py(1)}" width="${px(1) - px(0)}" height="${py(0) - py(1)}" fill="#fff" stroke="#e2e8f0"/>
      ${grid}${iso}
      <line x1="${px(0)}" x2="${px(1)}" y1="${py(prev)}" y2="${py(prev)}" stroke="#94a3b8" stroke-dasharray="6 4"/>
      <text class="evl-iso-t" x="${px(0) + 4}" y="${py(prev) - 4}">no-skill = prevalence ${f2(prev)}</text>
      <path d="${line}" fill="none" stroke="${OP}" stroke-width="2.2" stroke-linejoin="round"/>
      ${marks}${op}${hov}
      <text class="evl-axt" x="${(px(0) + px(1)) / 2}" y="${PH - 6}" text-anchor="middle">Recall = TP / (TP + FN)</text>
      <text class="evl-axt" transform="translate(12 ${(py(0) + py(1)) / 2}) rotate(-90)" text-anchor="middle">Precision = TP / (TP + FP)</text>
    </svg>`;
  }

  function prSkeleton() {
    proot.innerHTML = `<div class="tfp-viz evl-viz">
      <div class="tfp-viz-head"><h3>Precision–Recall Trade-off</h3>
        <div class="tfp-row evl-scen" role="group" aria-label="Class overlap">
          ${SCEN.map(s => `<button type="button" class="tfp-btn" data-scen="${s.id}">${s.label}</button>`).join('')}
          <button type="button" class="tfp-btn ghost" data-act="resample" title="Draw a new random sample"><i data-lucide="shuffle"></i>Resample</button>
        </div>
      </div>
      <div class="tfp-msg evl-note" id="evl-pr-msg" aria-live="polite"></div>
      <div class="tfp-card">
        <div class="tfp-card-head"><h4>Scores &amp; threshold</h4><span class="tfp-card-sub">${NP} spam · ${NN} ham · one dot per email · drag the plot or the slider</span></div>
        <div id="evl-dots"></div>
        <div class="evl-legend" id="evl-legend"></div>
        <div class="evl-ctrl">
          <label for="evl-t">Threshold t</label>
          <input type="range" id="evl-t" min="0" max="100" step="2" value="${pr.T}">
          <output class="evl-tval" id="evl-tv" for="evl-t"></output>
          <button type="button" class="tfp-btn" data-act="best" id="evl-best"></button>
          <button type="button" class="tfp-btn" data-act="reset">t = 0.50</button>
        </div>
      </div>
      <div class="evl-two">
        <div class="tfp-card">
          <div class="tfp-card-head"><h4>Precision–Recall curve</h4><span class="tfp-card-sub" id="evl-ap"></span></div>
          <div id="evl-pr-plot"></div>
        </div>
        <div class="tfp-card evl-livecard">
          <div class="tfp-card-head"><h4>At this threshold</h4><span class="tfp-card-sub" id="evl-live-t"></span></div>
          <div class="evl-tiles" id="evl-tiles"></div>
          <div class="evl-mini" id="evl-mini"></div>
          <ul class="evl-why">
            <li><b>Raise t ↑</b> stricter: fewer ${tok('fp', 'FP')} false alarms, so Precision usually rises; more ${tok('fn', 'FN')} misses, so Recall falls.</li>
            <li><b>Lower t ↓</b> more lenient: fewer ${tok('fn', 'FN')}, so Recall rises; more ${tok('fp', 'FP')}, so Precision falls.</li>
          </ul>
        </div>
      </div>
    </div>`;
    if (window.lucide) window.lucide.createIcons();
    updatePR(true);
  }

  function prMessage(cur) {
    const last = pr.last;
    if (cur.prec === null)
      return { cls: 'warn', tag: 'Undefined', t: `No email scores ≥ ${f2(pr.T / 100)}, so nothing is flagged. Precision = 0/0 is <b>undefined</b>, Recall = 0 and F1 = 0. Every spam email is a ${tok('fn', 'FN')}.` };
    if (!last || last.T === cur.T)
      return { cls: 'info', tag: 'Try it', t: `Each dot is one email. Filled dots are correct (${tok('tp', 'TP')}, ${tok('tn', 'TN')}); hollow dots are errors (${tok('fp', 'FP')}, ${tok('fn', 'FN')}). Drag the threshold and watch errors trade places.` };
    const dir = cur.T > last.T ? 'Raising' : 'Lowering';
    const pTxt = last.prec === null ? 'undefined' : pct(last.prec);
    return { cls: 'step', tag: dir === 'Raising' ? 't ↑' : 't ↓', t: `${dir} t from ${f2(last.T / 100)} to ${f2(cur.T / 100)}: false alarms ${tok('fp', 'FP')} ${last.fp} → ${cur.fp} (${signed(cur.fp - last.fp)}), misses ${tok('fn', 'FN')} ${last.fn} → ${cur.fn} (${signed(cur.fn - last.fn)}). Precision ${pTxt} → ${pct(cur.prec)}, Recall ${pct(last.rec)} → ${pct(cur.rec)}.` };
  }

  function updatePR(fresh) {
    if (!proot) return;
    const cur = at(pr.T);
    proot.querySelectorAll('[data-scen]').forEach(b => b.classList.toggle('on', b.dataset.scen === pr.scen));
    const dotsEl = proot.querySelector('#evl-dots');
    DW = dotsWidth(dotsEl);
    dotsEl.innerHTML = dotsSVG();
    proot.querySelector('#evl-pr-plot').innerHTML = prSVG();
    proot.querySelector('#evl-ap').textContent = `average precision ${f2(pr.ap)} · dashed = F1 contours`;
    const sl = proot.querySelector('#evl-t');
    sl.value = pr.T;
    sl.setAttribute('aria-valuetext', `threshold ${f2(pr.T / 100)}`);
    proot.querySelector('#evl-tv').textContent = f2(pr.T / 100);
    proot.querySelector('#evl-live-t').textContent = `t = ${f2(pr.T / 100)}`;
    proot.querySelector('#evl-best').textContent = pr.best ? `Best F1 (t = ${f2(pr.best.T / 100)})` : 'Best F1';

    proot.querySelector('#evl-legend').innerHTML = [
      ['tp', 'TP', 'caught', false], ['fn', 'FN', 'missed', true], ['fp', 'FP', 'false alarm', true], ['tn', 'TN', 'delivered', false]
    ].map(([k, a, w, h]) => `<span><i class="${h ? 'h' : ''}" style="--c:${COL[k]}"></i><b style="color:${COL[k]}">${a} ${cur[k]}</b> ${w}</span>`).join('');

    const tile = (k, name, v, sub, why) => `<div class="evl-tile${v === null ? ' undef' : ''}">
      <span>${name}</span><b>${v === null ? '—' : pct(v)}</b>
      <div class="evl-bar" aria-hidden="true"><i style="width:${v === null ? 0 : v * 100}%"></i></div>
      <small>${v === null ? `<span class="evl-undef">undefined</span>${why}` : sub}</small></div>`;
    proot.querySelector('#evl-tiles').innerHTML =
      tile('prec', 'Precision', cur.prec, `${cur.tp} / ${cur.tp + cur.fp}`, 'TP+FP = 0') +
      tile('rec', 'Recall', cur.rec, `${cur.tp} / ${cur.tp + cur.fn}`, 'TP+FN = 0') +
      tile('f1', 'F1', cur.f1, `2·${cur.tp} / ${2 * cur.tp + cur.fp + cur.fn}`, 'TP+FP+FN = 0');

    proot.querySelector('#evl-mini').innerHTML = [['tp', 'TP'], ['fn', 'FN'], ['fp', 'FP'], ['tn', 'TN']]
      .map(([k, a]) => `<div class="${k === 'fp' || k === 'fn' ? 'err' : ''}" style="--c:${COL[k]}" title="${CELLS[k].name}: ${CELLS[k].text}"><span>${a} · ${MINI[k]}</span><b>${cur[k]}</b></div>`).join('');

    if (fresh || pr.msg === null || (pr.last && pr.last.T !== cur.T) || cur.prec === null) {
      const m = prMessage(cur), el = proot.querySelector('#evl-pr-msg');
      el.className = `tfp-msg evl-note ${m.cls}`;
      el.innerHTML = `<span class="tfp-msg-tag">${m.tag}</span><span>${m.t}</span>`;
      pr.msg = m;
    }
  }

  function dotsWidth(el) {
    const w = el ? el.clientWidth : 0;
    return w ? Math.round(Math.max(320, Math.min(720, w))) : 640;
  }

  function setT(T) {
    T = Math.max(0, Math.min(100, Math.round(T / 2) * 2));
    if (T === pr.T) return;
    pr.last = at(pr.T);
    pr.T = T;
    updatePR();
  }

  function svgPoint(svg, e, w, h) {
    const r = svg.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (w / r.width), y: (e.clientY - r.top) * (h / r.height) };
  }

  function bindPR() {
    proot.addEventListener('click', e => {
      const sc = e.target.closest('[data-scen]');
      if (sc) { pr.scen = sc.dataset.scen; pr.last = null; genData(); updatePR(true); return; }
      const a = e.target.closest('[data-act]');
      if (!a) return;
      if (a.dataset.act === 'resample') { pr.seed++; pr.last = null; genData(); updatePR(true); }
      if (a.dataset.act === 'best' && pr.best) setT(pr.best.T);
      if (a.dataset.act === 'reset') setT(50);
    });
    proot.addEventListener('input', e => { if (e.target.id === 'evl-t') setT(parseInt(e.target.value, 10)); });

    // drag on the dot plot
    const dots = proot.querySelector('#evl-dots');
    let dragging = false;
    const fromDots = e => {
      const svg = dots.querySelector('svg'); if (!svg) return;
      const p = svgPoint(svg, e, DW, DH);
      setT(((p.x - DL) / (DW - DL - DR)) * 100);
    };
    dots.addEventListener('pointerdown', e => { dragging = true; dots.setPointerCapture(e.pointerId); fromDots(e); });
    dots.addEventListener('pointermove', e => { if (dragging) fromDots(e); });
    const stop = e => { dragging = false; if (dots.hasPointerCapture(e.pointerId)) dots.releasePointerCapture(e.pointerId); };
    dots.addEventListener('pointerup', stop);
    dots.addEventListener('pointercancel', stop);

    // keep the dot plot drawn at ~1:1 scale when the panel is resized
    if (window.ResizeObserver) {
      resizeObs = new ResizeObserver(() => {
        const w = dotsWidth(dots);
        if (Math.abs(w - DW) > 8) { DW = w; dots.innerHTML = dotsSVG(); }
      });
      resizeObs.observe(dots);
    }

    // hover / click on the PR curve
    const plot = proot.querySelector('#evl-pr-plot');
    const nearest = e => {
      const svg = plot.querySelector('svg'); if (!svg) return null;
      const p = svgPoint(svg, e, PW, PH);
      let best = null, bd = 18 * 18;
      pr.curve.forEach(c => { if (c.prec === null) return; const d = (px(c.rec) - p.x) ** 2 + (py(c.prec) - p.y) ** 2; if (d < bd) { bd = d; best = c; } });
      return best;
    };
    plot.addEventListener('pointermove', e => {
      const n = nearest(e), T = n ? n.T : null;
      if (T !== pr.hover) { pr.hover = T; plot.innerHTML = prSVG(); plot.style.cursor = T === null ? '' : 'pointer'; }
    });
    plot.addEventListener('pointerleave', () => { if (pr.hover !== null) { pr.hover = null; plot.innerHTML = prSVG(); } });
    plot.addEventListener('click', e => { const n = nearest(e); if (n) { pr.hover = null; setT(n.T); } });
  }

  // ------------------------------------------------------------ public
  function render(container, view) {
    if (resizeObs) { resizeObs.disconnect(); resizeObs = null; }
    const root = document.createElement('div');
    root.className = 'evl-root';
    container.innerHTML = '';
    container.appendChild(root);
    if (view === 'pr') {
      mroot = null; proot = root;
      if (!pr.curve.length) genData();
      pr.hover = null; pr.last = null; pr.msg = null;
      prSkeleton(); bindPR();
    } else {
      proot = null; mroot = root; cm.focus = null;
      matrixSkeleton(); bindMatrix();
    }
  }

  window.EvaluationLab = { render, _metrics: metricsOf };
})();
