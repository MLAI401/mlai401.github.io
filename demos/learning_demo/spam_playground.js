/**
 * spam_playground.js — AI Playground · Topic 06 · Spam Detection
 *
 * One editable Spam/Ham training set, one separate labelled evaluation set
 * and one editable test message, shared by two models:
 *   • Multinomial Naive Bayes  (Laplace smoothing α, decision threshold)
 *   • Shallow Neural Network   (|V| → H → 1, ReLU/sigmoid/tanh hidden layer,
 *                               sigmoid output, binary cross-entropy,
 *                               explicit backpropagation, full-batch GD)
 *
 * Shared features: a fixed vocabulary built from the TRAINING messages only
 * (lowercase, [a-z0-9]+ tokens, 1-character tokens dropped, alphabetical
 * order) and word-count vectors. Each trained model stores the vocabulary it
 * was trained with; test words outside it are flagged and ignored.
 *
 * Each model keeps its own trained state. Editing the training data marks
 * models as "needs retraining" — they keep predicting with their old state
 * until retrained. Test / evaluation messages are never added to training
 * automatically (only through the explicit "Add to training" buttons).
 *
 * Mounts into #view-spam (playground.html). Exposes window.SpamPlayground.
 */
(function () {
  'use strict';

  // ===========================================================================
  // Data
  // ===========================================================================
  const TRAIN_DEFAULT = [
    ['Win a free prize now, click the link', 'spam'],
    ['Claim your free cash reward today', 'spam'],
    ['URGENT: you have won a lottery, claim now', 'spam'],
    ['Free entry to win a new phone, reply WIN', 'spam'],
    ['Exclusive offer: cheap loans, click here now', 'spam'],
    ['Congratulations! You won a free cruise, call now', 'spam'],
    ['Get cash fast, limited offer, click here', 'spam'],
    ['Your account won a bonus prize, claim today', 'spam'],
    ['Earn money from home, free trial, sign up now', 'spam'],
    ['Last chance: free gift card, click the link', 'spam'],
    ['Are we still meeting for lunch today?', 'ham'],
    ['Please review the report before the meeting', 'ham'],
    ['Can you send me the slides from class?', 'ham'],
    ['Lunch is free at the team event on Friday', 'ham'],
    ['The project meeting moved to 3pm', 'ham'],
    ['Thanks for your help with the homework', 'ham'],
    ['Call me when you get home', 'ham'],
    ['Do you want to grab coffee tomorrow?', 'ham'],
    ['I will send the report tonight', 'ham'],
    ['See you at the library after class', 'ham']
  ];
  const DATASETS = {
    default: { label: 'Default (10 spam / 10 ham)', rows: TRAIN_DEFAULT },
    tiny: { label: 'Tiny (3 spam / 3 ham)', rows: [TRAIN_DEFAULT[0], TRAIN_DEFAULT[1], TRAIN_DEFAULT[5], TRAIN_DEFAULT[10], TRAIN_DEFAULT[11], TRAIN_DEFAULT[13]] },
    imbalanced: { label: 'Imbalanced (3 spam / 10 ham)', rows: TRAIN_DEFAULT.slice(0, 3).concat(TRAIN_DEFAULT.slice(10)) }
  };
  // Held-out evaluation set: includes hard cases on purpose (spam with few
  // known words, ham that uses spammy words such as "free", "win", "call now").
  const EVAL_DEFAULT = [
    ['Claim your free prize, click now', 'spam'],
    ['You won cash! Call now to claim', 'spam'],
    ['Limited offer: win a free phone today', 'spam'],
    ['Free bonus money, sign up here', 'spam'],
    ['Your package is waiting, confirm your details', 'spam'],
    ['Selected customers get a reward, act fast', 'spam'],
    ['Can we move the meeting to Friday?', 'ham'],
    ['Please send the slides before class', 'ham'],
    ['Thanks, see you at lunch', 'ham'],
    ['Are you free for lunch tomorrow?', 'ham'],
    ['Free pizza at the club meeting tonight', 'ham'],
    ['Can you call me now? I am home', 'ham'],
    ['Our team will win the quiz tonight', 'ham'],
    ['Did you get my report?', 'ham']
  ];

  const EXAMPLES = [
    { label: 'Ambiguous: free lunch?', text: 'Are you free for lunch?' },
    { label: 'Obvious spam', text: 'WIN a FREE prize now!!! Click the link' },
    { label: 'Normal email', text: 'Can you send the report today?' },
    { label: 'Ambiguous: free + click', text: 'Free lunch at the meeting, click to RSVP' },
    { label: 'Ambiguous: congratulations', text: 'Congratulations on your new job!' },
    { label: 'Unknown words only', text: 'Quokka marmalade xylophone' }
  ];
  const ACTS = { relu: 'ReLU', sigmoid: 'Sigmoid', tanh: 'Tanh' };
  const LRS = [0.01, 0.03, 0.05, 0.1, 0.2, 0.3, 0.5, 1, 2, 3, 5];
  const MAX_EPOCHS = 3000, LOSS_STOP = 0.003;

  // ===========================================================================
  // Shared preprocessing & features (training-data vocabulary only)
  // ===========================================================================
  function tokenize(text) {
    const out = [], re = /[A-Za-z0-9]+/g;
    let m;
    while ((m = re.exec(text || ''))) out.push({ raw: m[0], w: m[0].toLowerCase(), start: m.index, end: m.index + m[0].length, kept: m[0].length > 1 });
    return out;
  }
  const words = text => tokenize(text).filter(t => t.kept).map(t => t.w);
  function buildVocab(rows) {
    const set = new Set();
    rows.forEach(r => words(r.t).forEach(w => set.add(w)));
    const vocab = [...set].sort((a, b) => a.localeCompare(b));
    const vIndex = {};
    vocab.forEach((w, i) => { vIndex[w] = i; });
    return { vocab, vIndex };
  }
  // Word-count vector, stored sparsely as active features.
  function featurize(text, F) {
    const toks = tokenize(text), counts = {}, unk = {};
    let nTok = 0;
    toks.forEach(t => {
      if (!t.kept) return;
      nTok++;
      if (F.vIndex[t.w] === undefined) unk[t.w] = (unk[t.w] || 0) + 1;
      else counts[t.w] = (counts[t.w] || 0) + 1;
    });
    const active = Object.keys(counts).map(w => ({ w, i: F.vIndex[w], c: counts[w] })).sort((a, b) => a.i - b.i);
    return { toks, nTok, active, unknown: Object.keys(unk).map(w => ({ w, c: unk[w] })) };
  }

  // ===========================================================================
  // Multinomial Naive Bayes
  // ===========================================================================
  function nbTrain(rows) {
    const F = buildVocab(rows), V = F.vocab.length;
    const cnt = { spam: new Float64Array(V), ham: new Float64Array(V) }, tot = { spam: 0, ham: 0 }, n = { spam: 0, ham: 0 };
    rows.forEach(r => {
      n[r.y]++;
      featurize(r.t, F).active.forEach(a => { cnt[r.y][a.i] += a.c; tot[r.y] += a.c; });
    });
    return Object.assign(F, { kind: 'nb', cnt, tot, n, N: rows.length });
  }
  function nbScore(m, alpha, fz) {
    const V = m.vocab.length;
    const lp = c => Math.log(m.n[c] / m.N);
    const ll = (c, i) => Math.log((m.cnt[c][i] + alpha) / (m.tot[c] + alpha * V));
    const contrib = fz.active.map(a => ({ w: a.w, i: a.i, c: a.c, ls: ll('spam', a.i), lh: ll('ham', a.i), v: a.c * (ll('spam', a.i) - ll('ham', a.i)) }));
    const sS = lp('spam') + contrib.reduce((s, t) => s + t.c * t.ls, 0);
    const sH = lp('ham') + contrib.reduce((s, t) => s + t.c * t.lh, 0);
    const logOdds = sS - sH;
    return { p: sigmoid(logOdds), logOdds, priorLO: lp('spam') - lp('ham'), sS, sH, contrib };
  }

  // ===========================================================================
  // Shallow neural network: |V| → H → 1
  // ===========================================================================
  function sigmoid(z) { if (z >= 0) return 1 / (1 + Math.exp(-z)); const e = Math.exp(z); return e / (1 + e); }
  const bce = (z, y) => Math.max(z, 0) - z * y + Math.log1p(Math.exp(-Math.abs(z)));
  const ACT = {
    relu: { f: z => (z > 0 ? z : 0), d: z => (z > 0 ? 1 : 0) },     // ReLU′(0) = 0
    sigmoid: { f: sigmoid, d: z => { const s = sigmoid(z); return s * (1 - s); } },
    tanh: { f: Math.tanh, d: z => { const t = Math.tanh(z); return 1 - t * t; } }
  };
  function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function gauss(r) { let u = 0; while (u === 0) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); }

  // Reproducible init: same (seed, H, |V|) → same weights. W1 ~ N(0, 1/|V|·2), W2 ~ N(0, 1/H), biases 0.
  function nnInit(rows, H, seed, act) {
    const F = buildVocab(rows), V = F.vocab.length, r = mulberry32((seed * 2654435761) >>> 0);
    const s1 = Math.sqrt(2 / Math.max(1, V)), s2 = Math.sqrt(1 / H);
    const W1 = [], b1 = new Float64Array(H), W2 = new Float64Array(H);
    for (let j = 0; j < H; j++) { const row = new Float64Array(V); for (let i = 0; i < V; i++) row[i] = gauss(r) * s1; W1.push(row); }
    for (let j = 0; j < H; j++) W2[j] = gauss(r) * s2;
    const X = rows.map(row => ({ t: row.t, a: featurize(row.t, F).active, y: row.y === 'spam' ? 1 : 0 }));
    return Object.assign(F, { kind: 'nn', H, act, seed, W1, b1, W2, b2: 0, X, epoch: 0, loss: [], lastGrad: null });
  }
  function nnForward(m, active) {
    const A = ACT[m.act], H = m.H, z = new Float64Array(H), h = new Float64Array(H);
    let zo = m.b2;
    for (let j = 0; j < H; j++) {
      let s = m.b1[j];
      for (const a of active) s += m.W1[j][a.i] * a.c;
      z[j] = s; h[j] = A.f(s); zo += m.W2[j] * h[j];
    }
    return { z, h, zo, p: sigmoid(zo) };
  }
  function nnMeanLoss(m) { return m.X.length ? m.X.reduce((s, e) => s + bce(nnForward(m, e.a).zo, e.y), 0) / m.X.length : 0; }
  // Analytical gradients of the mean BCE over all training examples.
  function nnGrad(m) {
    const H = m.H, V = m.vocab.length, A = ACT[m.act], N = m.X.length;
    const gW1 = Array.from({ length: H }, () => new Float64Array(V)), gb1 = new Float64Array(H), gW2 = new Float64Array(H);
    let gb2 = 0, L = 0;
    m.X.forEach(e => {
      const f = nnForward(m, e.a);
      L += bce(f.zo, e.y) / N;
      const dOut = (f.p - e.y) / N;                     // ∂L/∂z_o = ŷ − y (per example, averaged)
      gb2 += dOut;
      for (let j = 0; j < H; j++) {
        gW2[j] += dOut * f.h[j];
        const dz = dOut * m.W2[j] * A.d(f.z[j]);         // δ_j = δ_o · W2[j] · g′(z_j)
        gb1[j] += dz;
        for (const a of e.a) gW1[j][a.i] += dz * a.c;   // ∂L/∂W1[j,i] = δ_j · x_i
      }
    });
    return { gW1, gb1, gW2, gb2, L };
  }
  function nnStep(m, lr) {
    const g = nnGrad(m);
    for (let j = 0; j < m.H; j++) {
      const row = m.W1[j], gr = g.gW1[j];
      for (let i = 0; i < row.length; i++) row[i] -= lr * gr[i];
      m.b1[j] -= lr * g.gb1[j]; m.W2[j] -= lr * g.gW2[j];
    }
    m.b2 -= lr * g.gb2;
    m.epoch++;
    m.lastGrad = g;
    const L = nnMeanLoss(m);
    m.loss.push(L);
    return L;
  }
  function nnPredict(m, fz) {
    const f = nnForward(m, fz.active);
    const lo = f.zo;
    // influence of each active word: change in log-odds if all its occurrences are removed
    const contrib = fz.active.map(a => ({ w: a.w, i: a.i, c: a.c, v: lo - nnForward(m, fz.active.filter(b => b !== a)).zo }));
    return { p: f.p, logOdds: lo, h: f.h, z: f.z, contrib };
  }

  // ===========================================================================
  // State
  // ===========================================================================
  const S = {
    model: 'nb', view: 'data', explain: false,
    train: TRAIN_DEFAULT.map(([t, y]) => ({ t, y })), dataset: 'default', version: 1,
    evalSet: EVAL_DEFAULT.map(([t, y]) => ({ t, y })),
    test: EXAMPLES[0].text,
    nb: { alpha: 1, thr: 0.5, m: null },
    nn: { H: 8, act: 'relu', lrIdx: LRS.indexOf(0.5), seed: 7, thr: 0.5, m: null, running: false, showGrad: false, note: '' },
    newLabel: 'spam', evalNewLabel: 'spam'
  };
  const lr = () => LRS[S.nn.lrIdx];
  const counts = () => ({ spam: S.train.filter(r => r.y === 'spam').length, ham: S.train.filter(r => r.y === 'ham').length });
  const trainable = () => { const c = counts(); return c.spam > 0 && c.ham > 0 && buildVocab(S.train).vocab.length > 0; };
  function status(kind) {
    const st = S[kind];
    if (!st.m) return 'untrained';
    if (st.m.version !== S.version) return 'stale';
    if (kind === 'nn' && st.m.epoch === 0) return 'init';
    return 'trained';
  }
  const STATUS_TXT = { untrained: 'Not trained', stale: 'Needs retraining', init: 'Initialized (epoch 0)', trained: 'Trained' };

  function predictWith(kind, text) {
    const st = S[kind];
    if (!st.m) return null;
    const fz = featurize(text, st.m);
    const r = kind === 'nb' ? nbScore(st.m, st.alpha, fz) : nnPredict(st.m, fz);
    r.fz = fz; r.label = r.p >= st.thr ? 'spam' : 'ham'; r.thr = st.thr;
    return r;
  }
  function evaluate(kind, rows) {
    if (!S[kind].m) return null;
    const cm = { tp: 0, fp: 0, fn: 0, tn: 0 }, preds = [];
    rows.forEach(r => {
      if (!words(r.t).length) return;
      const p = predictWith(kind, r.t);
      preds.push(p);
      if (p.label === 'spam') { if (r.y === 'spam') cm.tp++; else cm.fp++; } else if (r.y === 'spam') cm.fn++; else cm.tn++;
    });
    const n = cm.tp + cm.fp + cm.fn + cm.tn;
    return { cm, n, acc: n ? (cm.tp + cm.tn) / n : NaN, prec: cm.tp + cm.fp ? cm.tp / (cm.tp + cm.fp) : NaN, rec: cm.tp + cm.fn ? cm.tp / (cm.tp + cm.fn) : NaN, preds };
  }

  // ===========================================================================
  // Training actions
  // ===========================================================================
  function trainNB() {
    if (!trainable()) return note('Training needs at least one Spam and one Ham message with words.');
    S.nb.m = nbTrain(S.train); S.nb.m.version = S.version;
    note(`Naive Bayes trained: counted words in ${S.train.length} messages · |V| = ${S.nb.m.vocab.length}.`);
  }
  // (Re)initialize the network when there is none or the training data changed.
  function ensureNN(force) {
    const st = S.nn;
    if (force || !st.m || st.m.version !== S.version || st.m.H !== st.H || st.m.act !== st.act || st.m.seed !== st.seed) {
      if (!trainable()) { note('Training needs at least one Spam and one Ham message with words.'); return false; }
      const why = !st.m ? '' : st.m.version !== S.version ? 'Training data changed — ' : force ? '' : 'Architecture / seed changed — ';
      st.m = nnInit(S.train, st.H, st.seed, st.act); st.m.version = S.version;
      st.m.loss.push(nnMeanLoss(st.m));
      st.note = `${why}weights initialized from seed ${st.seed} (|V| = ${st.m.vocab.length} inputs, H = ${st.H}).`;
    }
    return true;
  }
  let raf = 0, lastPaint = 0;
  function nnStart() {
    if (!ensureNN()) return;
    const st = S.nn;
    st.running = true; st.target = st.m.epoch + MAX_EPOCHS;
    const loop = ts => {
      if (!st.running) return;
      for (let k = 0; k < 2; k++) {   // 2 updates per frame: fast, but slow enough to watch
        const L = nnStep(st.m, lr());
        if (L < LOSS_STOP || st.m.epoch >= st.target || !isFinite(L)) { st.running = false; st.note = L < LOSS_STOP ? `Stopped: training loss < ${LOSS_STOP}.` : `Stopped after ${MAX_EPOCHS} epochs — press Train to continue.`; break; }
      }
      if (!st.running || ts - lastPaint > 120) { lastPaint = ts; if (st.running) refreshLive(); else refresh(); }
      if (st.running) raf = requestAnimationFrame(loop); else renderControls();
    };
    raf = requestAnimationFrame(loop);
    renderControls();
  }
  function nnPause(msg) { const st = S.nn; if (!st.running) return; st.running = false; cancelAnimationFrame(raf); if (msg) st.note = msg; renderControls(); refresh(); }

  function dataChanged() {
    S.version++;
    if (S.nn.running) nnPause('Paused: training data changed — retrain to use the new data.');
  }

  // ===========================================================================
  // Rendering helpers
  // ===========================================================================
  let root, ws, ctrl;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pct = x => (Number.isFinite(x) ? (x * 100).toFixed(1) + '%' : '—');
  const f3 = x => (Number.isFinite(x) ? (Math.abs(x) < 5e-4 ? 0 : x).toFixed(3).replace('-', '−') : '—');
  const f2 = x => (Number.isFinite(x) ? x.toFixed(2).replace('-', '−') : '—');
  const lbl = y => (y === 'spam' ? 'Spam' : 'Ham');
  const icons = () => { if (window.lucide) window.lucide.createIcons(); };
  let noteTimer = 0;
  function note(html) {
    const el = root && root.querySelector('#spam-note');
    if (!el) return;
    el.innerHTML = html; el.hidden = false;
    clearTimeout(noteTimer); noteTimer = setTimeout(() => { el.hidden = true; }, 6000);
  }
  const X = (html) => `<div class="spam-x">${html}</div>`;   // optional explanation

  // ===========================================================================
  // Skeleton
  // ===========================================================================
  function mount() {
    root = document.getElementById('view-spam');
    if (!root || root.dataset.mounted) return;
    root.dataset.mounted = '1';
    root.innerHTML = `
      <div class="playground-grid spam-grid">
        <div class="spam-ws" id="spam-ws">
          <div class="spam-head" id="spam-head"></div>
          <section class="spam-card spam-predict">
            <div class="spam-card-h"><h4><i data-lucide="message-square-text"></i> Prediction workspace</h4><span class="spam-sub">type or pick a message — it is never added to training automatically</span></div>
            <textarea id="spam-test" rows="2" spellcheck="false" aria-label="Test message">${esc(S.test)}</textarea>
            <div class="spam-chips" id="spam-examples">${EXAMPLES.map((e, i) => `<button class="spam-chip" data-ex="${i}">${esc(e.label)}</button>`).join('')}</div>
            <div id="spam-pred"></div>
          </section>
          <div class="spam-tabs" role="tablist">
            <button data-view="data"><i data-lucide="database"></i> Training data</button>
            <button data-view="inside"><i data-lucide="cpu"></i> Inside the model</button>
            <button data-view="compare"><i data-lucide="scale"></i> Compare &amp; evaluate</button>
          </div>
          <div id="spam-panel"></div>
        </div>
        <div class="playground-controls glass-panel spam-controls" id="spam-controls"></div>
      </div>`;
    ws = root.querySelector('#spam-ws');
    ctrl = root.querySelector('#spam-controls');
    const ta = root.querySelector('#spam-test');
    ta.addEventListener('input', () => { S.test = ta.value; renderPrediction(); if (S.view !== 'data') renderPanel(); });
    root.querySelector('#spam-examples').addEventListener('click', e => {
      const b = e.target.closest('[data-ex]'); if (!b) return;
      S.test = EXAMPLES[+b.dataset.ex].text; ta.value = S.test; renderPrediction(); if (S.view !== 'data') renderPanel();
    });
    root.querySelector('.spam-tabs').addEventListener('click', e => { const b = e.target.closest('[data-view]'); if (b) { S.view = b.dataset.view; renderPanel(); } });
    ws.addEventListener('click', onWsClick);
    ws.addEventListener('input', onWsInput);
    ws.addEventListener('toggle', e => { if (e.target.classList && e.target.classList.contains('spam-edit')) S.evalOpen = e.target.open; }, true);
    ctrl.addEventListener('click', onCtrlClick);
    ctrl.addEventListener('input', onCtrlInput);
    ctrl.addEventListener('change', onCtrlInput);
    renderAll();
  }
  function renderAll() { renderControls(); refresh(); }
  function refresh() { renderHead(); renderPrediction(); renderPanel(); renderStats(); }
  // During live training only redraw views without editable inputs.
  function refreshLive() { renderHead(); renderPrediction(); if (S.view === 'inside') renderPanel(); }

  // ===========================================================================
  // Controls panel (right)
  // ===========================================================================
  function renderControls() {
    if (!ctrl) return;
    const nb = S.model === 'nb', st = S[S.model], ss = status(S.model);
    const modelCtl = nb ? `
      <div class="controls-group">
        <div class="control-label"><span>Smoothing <i class="spam-sym">α</i></span><span class="slider-val" id="spam-alpha-v">${S.nb.alpha.toFixed(2)}</span></div>
        <div class="control-slider-container"><input type="range" id="spam-alpha" min="0.05" max="3" step="0.05" value="${S.nb.alpha}"></div>
        ${X('P̂(w|c) = (count + α) / (total + α·|V|). Applies instantly to the trained counts.')}
      </div>` : `
      <div class="controls-group spam-nnctl">
        <div class="spam-ctl-row">
          <label>Hidden width <b id="spam-H-v">${S.nn.H}</b><input type="range" id="spam-H" min="1" max="16" step="1" value="${S.nn.H}"></label>
          <label>Activation<select id="spam-act">${Object.keys(ACTS).map(k => `<option value="${k}" ${S.nn.act === k ? 'selected' : ''}>${ACTS[k]}</option>`).join('')}</select></label>
        </div>
        <div class="spam-ctl-row">
          <label>Learning rate <b id="spam-lr-v">${lr()}</b><input type="range" id="spam-lr" min="0" max="${LRS.length - 1}" step="1" value="${S.nn.lrIdx}"></label>
          <label>Seed<input type="number" id="spam-seed" min="0" max="99999" value="${S.nn.seed}"></label>
        </div>
        ${X('Width, activation or seed changes re-initialize the weights (same seed → same initial weights). Output is always sigmoid + binary cross-entropy.')}
      </div>`;
    ctrl.innerHTML = `
      <div class="controls-group">
        <div class="control-label"><span>Model</span><span class="spam-status ${ss}">${STATUS_TXT[ss]}</span></div>
        <div class="spam-seg">${['nb', 'nn'].map(k => `<button data-model="${k}" class="${S.model === k ? 'active' : ''}">${k === 'nb' ? 'Naive Bayes' : 'Neural Network'}<small>${STATUS_TXT[status(k)]}</small></button>`).join('')}</div>
      </div>
      ${modelCtl}
      <div class="controls-group">
        <div class="control-label"><span>Spam threshold</span><span class="slider-val" id="spam-thr-v">${st.thr.toFixed(2)}</span></div>
        <div class="control-slider-container"><input type="range" id="spam-thr" min="0.05" max="0.95" step="0.05" value="${st.thr}"></div>
        ${X('Predict Spam when P(spam) ≥ threshold. Raising it trades recall for precision.')}
      </div>
      <div class="controls-group">
        <div class="btn-group">${nb ? `
          <button class="btn-ctrl btn-ctrl-primary" data-act="nb-train" ${trainable() ? '' : 'disabled'}><i data-lucide="play"></i> Train Naive Bayes</button>` : `
          <button class="btn-ctrl btn-ctrl-primary" data-act="nn-run" ${trainable() || S.nn.running ? '' : 'disabled'}><i data-lucide="${S.nn.running ? 'pause' : 'play'}"></i> ${S.nn.running ? 'Pause' : 'Train'}</button>
          <button class="btn-ctrl" data-act="nn-step" ${S.nn.running || !trainable() ? 'disabled' : ''}><i data-lucide="skip-forward"></i> Step Update</button>
          <button class="btn-ctrl" data-act="nn-reset" ${S.nn.running || !trainable() ? 'disabled' : ''}><i data-lucide="rotate-ccw"></i> Reset Weights</button>`}
        </div>
        ${trainable() ? '' : '<div class="spam-warn">Add at least one Spam and one Ham training message.</div>'}
        <div class="spam-note" id="spam-note" hidden></div>
      </div>
      <div class="playground-stats" id="spam-stats"></div>
      <label class="spam-explain-tog"><input type="checkbox" id="spam-explain" ${S.explain ? 'checked' : ''}> Show short explanations</label>`;
    root.classList.toggle('spam-explain-on', S.explain);
    renderStats();
    icons();
  }

  function renderStats() {
    const el = ctrl && ctrl.querySelector('#spam-stats');
    if (!el) return;
    const c = counts(), F = buildVocab(S.train), m = S[S.model].m;
    const tr = evaluate(S.model, S.train);
    const rows = [
      ['Training messages', `${c.spam} spam · ${c.ham} ham`],
      ['Vocabulary |V| (current data)', F.vocab.length],
      ['Model vocabulary', m ? `${m.vocab.length}${m.version !== S.version ? ' (older data)' : ''}` : '—']
    ];
    if (S.model === 'nn') {
      rows.push(['Epoch', m ? m.epoch : '—']);
      rows.push(['Training loss (BCE)', m && m.loss.length ? f3(m.loss[m.loss.length - 1]) : '—']);
    }
    rows.push(['Training accuracy', tr ? `${pct(tr.acc)} <small>(seen data)</small>` : '—']);
    const p = m && words(S.test).length ? predictWith(S.model, S.test) : null;
    rows.push(['Test message', p ? `<span class="spam-lbl ${p.label}">${lbl(p.label)}</span> ${pct(p.p)}` : '—']);
    el.innerHTML = rows.map(([k, v]) => `<div class="pg-stat-row"><span>${k}</span><span class="pg-stat-val">${v}</span></div>`).join('') +
      (S.model === 'nn' && S.nn.note ? `<div class="spam-nnnote">${S.nn.note}</div>` : '');
  }

  function onCtrlClick(e) {
    const mb = e.target.closest('[data-model]');
    if (mb) { S.model = mb.dataset.model; renderAll(); return; }   // dataset, test message and both trained states are kept
    const b = e.target.closest('[data-act]');
    if (!b || b.disabled) return;
    switch (b.dataset.act) {
      case 'nb-train': trainNB(); break;
      case 'nn-run': if (S.nn.running) nnPause('Paused.'); else nnStart(); return;
      case 'nn-step': if (ensureNN()) { const L = nnStep(S.nn.m, lr()); S.nn.note = `One gradient-descent update on all ${S.nn.m.X.length} training messages → loss ${f3(L)}.`; } break;
      case 'nn-reset': ensureNN(true); break;
    }
    renderAll();
  }
  function onCtrlInput(e) {
    const t = e.target, id = t.id;
    if (id === 'spam-alpha') { S.nb.alpha = +t.value; ctrl.querySelector('#spam-alpha-v').textContent = S.nb.alpha.toFixed(2); refresh(); }
    else if (id === 'spam-thr') { S[S.model].thr = +t.value; ctrl.querySelector('#spam-thr-v').textContent = (+t.value).toFixed(2); refresh(); }
    else if (id === 'spam-lr') { S.nn.lrIdx = +t.value; ctrl.querySelector('#spam-lr-v').textContent = lr(); }
    else if (id === 'spam-H') { S.nn.H = +t.value; ctrl.querySelector('#spam-H-v').textContent = S.nn.H; if (e.type === 'change') archChanged(); }
    else if (id === 'spam-act' && e.type === 'change') { S.nn.act = t.value; archChanged(); }
    else if (id === 'spam-seed' && e.type === 'change') { S.nn.seed = Math.max(0, Math.min(99999, parseInt(t.value, 10) || 0)); archChanged(); }
    else if (id === 'spam-explain') { S.explain = t.checked; root.classList.toggle('spam-explain-on', S.explain); }
  }
  // Architecture/seed changes start a fresh, reproducible network (only if one exists for the current data).
  function archChanged() {
    nnPause();
    if (S.nn.m && S.nn.m.version === S.version) ensureNN(true);
    renderAll();
  }

  // ===========================================================================
  // Workspace: header + prediction
  // ===========================================================================
  function renderHead() {
    const el = ws.querySelector('#spam-head'), F = buildVocab(S.train), c = counts();
    const stale = ['nb', 'nn'].filter(k => status(k) === 'stale');
    el.innerHTML = `<span><b>${S.model === 'nb' ? 'Naive Bayes' : 'Neural Network'}</b></span>
      <span class="spam-status ${status(S.model)}">${STATUS_TXT[status(S.model)]}</span>
      <span>Training ${c.spam} spam / ${c.ham} ham</span><span>|V| = ${F.vocab.length}</span><span>Evaluation set ${S.evalSet.length}</span>
      ${stale.length ? `<span class="spam-stale">Training data changed — ${stale.map(k => (k === 'nb' ? 'Naive Bayes' : 'Neural Network')).join(' & ')} still use${stale.length > 1 ? '' : 's'} the old data. Retrain.</span>` : ''}`;
  }

  function renderPrediction() {
    const el = ws.querySelector('#spam-pred'), kind = S.model, st = S[kind];
    if (!S.test.trim()) { el.innerHTML = '<div class="spam-empty">Empty message — type something or pick an example.</div>'; renderStats(); return; }
    if (!st.m) { el.innerHTML = `<div class="spam-empty">${kind === 'nb' ? 'Naive Bayes' : 'The neural network'} is not trained yet — press <b>${kind === 'nb' ? 'Train Naive Bayes' : 'Train'}</b>.</div>`; renderStats(); return; }
    const r = predictWith(kind, S.test), fz = r.fz;
    if (!fz.nTok) { el.innerHTML = '<div class="spam-empty">No usable words (only punctuation or 1-character tokens).</div>'; renderStats(); return; }
    const byW = {}; r.contrib.forEach(c => { byW[c.w] = c; });
    const mx = Math.max(0.5, ...r.contrib.map(c => Math.abs(c.v)));
    let txt = '', pos = 0;
    fz.toks.forEach(t => {
      txt += esc(S.test.slice(pos, t.start));
      if (!t.kept) txt += `<span class="spam-w drop" title="1-character token — removed">${esc(t.raw)}</span>`;
      else if (!byW[t.w]) txt += `<span class="spam-w unk" title="not in the model's training vocabulary — ignored">${esc(t.raw)}</span>`;
      else { const v = byW[t.w].v; txt += `<span class="spam-w ${v >= 0 ? 'sp' : 'hm'}" style="--a:${(0.15 + 0.6 * Math.min(1, Math.abs(v) / mx)).toFixed(2)}" title="${f2(v)} log-odds">${esc(t.raw)}</span>`; }
      pos = t.end;
    });
    txt += esc(S.test.slice(pos));
    const onlyUnk = !fz.active.length;
    const bars = r.contrib.slice().sort((a, b) => Math.abs(b.v) - Math.abs(a.v)).slice(0, 10).map(c => `
      <div class="spam-cb"><span class="spam-cb-w">${esc(c.w)}${c.c > 1 ? ` ×${c.c}` : ''}</span>
        <span class="spam-cb-t"><span class="mid"></span><span class="bar ${c.v >= 0 ? 'sp' : 'hm'}" style="${c.v >= 0 ? 'left:50%' : `left:${50 - Math.min(50, Math.abs(c.v) / mx * 50)}%`};width:${Math.min(50, Math.abs(c.v) / mx * 50)}%"></span></span>
        <span class="spam-cb-v">${c.v >= 0 ? '+' : ''}${f2(c.v)}</span></div>`).join('');
    el.innerHTML = `
      <div class="spam-verdict">
        <span class="spam-lbl big ${r.label}">${lbl(r.label)}</span>
        <div class="spam-pbar"><span class="fill" style="width:${(r.p * 100).toFixed(1)}%"></span><span class="thr" style="left:${r.thr * 100}%" title="threshold ${r.thr}"></span></div>
        <span class="spam-pv"><b>${pct(r.p)}</b> P(spam)</span>
      </div>
      ${status(kind) === 'stale' ? '<div class="spam-warn">This model was trained on older training data — retrain to update.</div>' : ''}
      <div class="spam-msg">${txt}</div>
      <div class="spam-legend"><span><i class="k sp"></i>pushes toward Spam</span><span><i class="k hm"></i>pushes toward Ham</span><span><i class="k unk"></i>unknown word — ignored</span></div>
      ${onlyUnk ? `<div class="spam-warn">None of these words is in the training vocabulary, so there is no word evidence. ${kind === 'nb' ? `The prediction is just the prior P(spam) = ${pct(sigmoid(r.priorLO))}.` : 'The output comes only from the biases (all inputs are 0).'}</div>`
        : `<div class="spam-feats"><div class="spam-mini-h">Active features (${r.contrib.length}) — ${kind === 'nb' ? 'count × log P(w|spam)/P(w|ham)' : 'Δ log-odds if the word is removed'}</div>${bars}</div>`}
      ${fz.unknown.length && !onlyUnk ? `<div class="spam-unk">Ignored (not in training vocabulary): ${fz.unknown.map(u => `<span>${esc(u.w)}</span>`).join(' ')}</div>` : ''}
      ${X(kind === 'nb' ? 'Naive Bayes adds independent per-word evidence: log-odds = prior log-odds + Σ count × log-likelihood ratio.' : 'The network combines words non-linearly through the hidden layer, so a word\'s influence depends on the other words present.')}`;
    renderStats();
  }

  // ===========================================================================
  // Workspace panels
  // ===========================================================================
  function renderPanel() {
    ws.querySelectorAll('.spam-tabs [data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === S.view));
    const el = ws.querySelector('#spam-panel');
    const keep = el.querySelector('.spam-scroll'), st = keep ? keep.scrollTop : 0;
    el.innerHTML = S.view === 'data' ? panelData() : S.view === 'inside' ? (S.model === 'nb' ? panelNB() : panelNN()) : panelCompare();
    const k2 = el.querySelector('.spam-scroll'); if (k2) k2.scrollTop = st;
    icons();
  }

  function rowList(rows, set) {
    return rows.map((r, i) => `<div class="spam-row"><button class="spam-lbl ${r.y}" data-set="${set}" data-flip="${i}" title="click to relabel">${lbl(r.y)}</button>
      <input class="spam-in" data-set="${set}" data-edit="${i}" value="${esc(r.t)}" spellcheck="false">
      <button class="spam-ico" data-set="${set}" data-use="${i}" title="Copy to the test message"><i data-lucide="corner-down-left"></i></button>
      <button class="spam-ico x" data-set="${set}" data-del="${i}" title="Remove">×</button></div>`).join('');
  }
  function panelData() {
    const c = counts();
    return `<section class="spam-card">
      <div class="spam-card-h"><h4>Training data <span class="spam-sub">${c.spam} spam · ${c.ham} ham</span></h4>
        <span class="spam-tools"><select id="spam-dataset">${Object.keys(DATASETS).map(k => `<option value="${k}" ${S.dataset === k ? 'selected' : ''}>${DATASETS[k].label}</option>`).join('')}${S.dataset === 'custom' ? '<option value="custom" selected>Custom (edited)</option>' : ''}</select>
        <button class="spam-btn" data-act="reset-data"><i data-lucide="rotate-ccw"></i> Reset</button></span></div>
      ${X('The vocabulary and both models are built only from these messages. Click a label to relabel; edits mark trained models as needing retraining.')}
      <div class="spam-scroll">${rowList(S.train, 'train')}</div>
      <div class="spam-row add"><button class="spam-lbl ${S.newLabel}" data-act="newlabel">${lbl(S.newLabel)}</button><input class="spam-in" id="spam-new" placeholder="Add a training message…" spellcheck="false"><button class="spam-btn" data-act="add-train"><i data-lucide="plus"></i> Add</button></div>
      <div class="spam-row add"><span class="spam-sub">Add the current test message to training as</span><button class="spam-btn" data-act="test-to-train" data-y="spam">Spam</button><button class="spam-btn" data-act="test-to-train" data-y="ham">Ham</button></div>
    </section>`;
  }

  // --- Naive Bayes internals
  function panelNB() {
    const m = S.nb.m;
    if (!m) return '<section class="spam-card"><div class="spam-empty">Train Naive Bayes to see its priors and word likelihoods.</div></section>';
    const a = S.nb.alpha, V = m.vocab.length;
    const ll = (c, i) => (m.cnt[c][i] + a) / (m.tot[c] + a * V);
    const fz = featurize(S.test, m), act = new Set(fz.active.map(x => x.i));
    const rows = m.vocab.map((w, i) => ({ w, i, ps: ll('spam', i), ph: ll('ham', i), r: Math.log(ll('spam', i) / ll('ham', i)) })).sort((x, y) => y.r - x.r);
    const mxR = Math.max(...rows.map(r => Math.abs(r.r)), 0.1);
    const r = words(S.test).length ? nbScore(m, a, fz) : null;
    let wf = '';
    if (r) {
      const items = [{ k: 'prior log-odds', v: r.priorLO }].concat(r.contrib.map(c => ({ k: `${c.w}${c.c > 1 ? ` ×${c.c}` : ''}`, v: c.v })));
      const total = r.logOdds, mx = Math.max(1, ...items.map(t => Math.abs(t.v)), Math.abs(total));
      wf = `<div class="spam-wf">${items.map(t => `<div class="spam-cb"><span class="spam-cb-w">${esc(t.k)}</span><span class="spam-cb-t"><span class="mid"></span><span class="bar ${t.v >= 0 ? 'sp' : 'hm'}" style="${t.v >= 0 ? 'left:50%' : `left:${50 - Math.abs(t.v) / mx * 50}%`};width:${Math.abs(t.v) / mx * 50}%"></span></span><span class="spam-cb-v">${t.v >= 0 ? '+' : ''}${f2(t.v)}</span></div>`).join('')}
        <div class="spam-cb total"><span class="spam-cb-w">= log-odds</span><span class="spam-cb-t"><span class="mid"></span><span class="bar ${total >= 0 ? 'sp' : 'hm'}" style="${total >= 0 ? 'left:50%' : `left:${50 - Math.abs(total) / mx * 50}%`};width:${Math.abs(total) / mx * 50}%"></span></span><span class="spam-cb-v">${f2(total)}</span></div></div>
        <div class="spam-mono">log P(spam|x) = ${f2(r.sS)} · log P(ham|x) = ${f2(r.sH)} (unnormalised) → P(spam) = σ(${f2(total)}) = <b>${pct(r.p)}</b></div>`;
    }
    return `<div class="spam-two">
      <section class="spam-card"><div class="spam-card-h"><h4>Class priors</h4><span class="spam-sub">from ${m.N} training messages</span></div>
        ${['spam', 'ham'].map(c => `<div class="spam-prior"><span class="spam-lbl ${c}">${lbl(c)}</span><span class="spam-pt"><span class="${c}" style="width:${m.n[c] / m.N * 100}%"></span></span><b>${m.n[c]}/${m.N} = ${(m.n[c] / m.N).toFixed(2)}</b></div>`).join('')}
        <div class="spam-mono">total word counts: spam ${m.tot.spam} · ham ${m.tot.ham} · α = ${a.toFixed(2)} · |V| = ${V}</div>
        <div class="spam-card-h" style="margin-top:.6rem"><h4>Log-score contributions</h4><span class="spam-sub">current test message</span></div>
        ${r ? (r.contrib.length ? wf : '<div class="spam-empty">No known words — only the prior counts.</div>' + wf) : '<div class="spam-empty">Empty test message.</div>'}
      </section>
      <section class="spam-card"><div class="spam-card-h"><h4>Word likelihoods P̂(w | class)</h4><span class="spam-sub">sorted by log ratio · ★ = in test message</span></div>
        <div class="spam-scroll tall"><table class="spam-table"><thead><tr><th>word</th><th>P̂(w|spam)</th><th>P̂(w|ham)</th><th>log ratio</th></tr></thead><tbody>
        ${rows.map(x => `<tr class="${act.has(x.i) ? 'on' : ''}"><td class="t">${act.has(x.i) ? '★ ' : ''}${esc(x.w)}</td><td>${x.ps.toFixed(4)}</td><td>${x.ph.toFixed(4)}</td>
          <td class="lr"><span class="spam-lrb"><span class="${x.r >= 0 ? 'sp' : 'hm'}" style="${x.r >= 0 ? 'left:50%' : `left:${50 - Math.abs(x.r) / mxR * 50}%`};width:${Math.abs(x.r) / mxR * 50}%"></span></span>${x.r >= 0 ? '+' : ''}${f2(x.r)}</td></tr>`).join('')}
        </tbody></table></div></section></div>`;
  }

  // --- Neural network internals
  function lossChart(loss) {
    if (loss.length < 2) return '<div class="spam-empty">Train or Step to record the loss.</div>';
    const W = 420, H = 150, pl = 40, pb = 20, pt = 8;
    const fin = loss.filter(v => v > 0 && isFinite(v));
    let lo = Math.pow(10, Math.floor(Math.log10(Math.min(...fin)))), hi = Math.pow(10, Math.ceil(Math.log10(Math.max(...fin))));
    if (hi / lo < 10) lo = hi / 10;
    const sx = t => pl + t / (loss.length - 1) * (W - pl - 8), sy = v => pt + (1 - (Math.log10(Math.max(v, lo)) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo))) * (H - pt - pb);
    const step = Math.max(1, Math.floor(loss.length / 400));
    let d = ''; for (let t = 0; t < loss.length; t += step) d += (t ? 'L' : 'M') + sx(t).toFixed(1) + ' ' + sy(loss[t]).toFixed(1);
    d += 'L' + sx(loss.length - 1).toFixed(1) + ' ' + sy(loss[loss.length - 1]).toFixed(1);
    let g = '';
    for (let e = Math.log10(lo); e <= Math.log10(hi) + 1e-9; e++) { const v = Math.pow(10, e); g += `<line x1="${pl}" x2="${W - 8}" y1="${sy(v)}" y2="${sy(v)}" class="g"/><text x="${pl - 4}" y="${sy(v) + 3}" text-anchor="end">${v >= 1 ? v : v.toExponential(0).replace('-', '−')}</text>`; }
    g += `<line x1="${pl}" x2="${W - 8}" y1="${sy(Math.LN2)}" y2="${sy(Math.LN2)}" class="ref"/><text x="${W - 10}" y="${sy(Math.LN2) - 3}" text-anchor="end">ln 2</text>`;
    g += `<text x="${pl}" y="${H - 5}">0</text><text x="${W - 8}" y="${H - 5}" text-anchor="end">epoch ${loss.length - 1}</text>`;
    return `<svg viewBox="0 0 ${W} ${H}" class="spam-chart">${g}<path d="${d}" fill="none" stroke="#7c3aed" stroke-width="2"/></svg>`;
  }
  function netSVG(m, fz, f) {
    const ins = fz.active.slice().sort((a, b) => b.c - a.c || a.i - b.i).slice(0, 10), H = m.H;
    const W = 460, Ht = Math.max(170, Math.max(ins.length, H) * 24 + 30);
    const yIn = k => 15 + (k + 0.5) * (Ht - 30) / Math.max(1, ins.length), yH = j => 15 + (j + 0.5) * (Ht - 30) / H;
    const xi = 110, xh = 280, xo = 410;
    const mxW = Math.max(1e-6, ...ins.flatMap(a => Array.from({ length: H }, (_, j) => Math.abs(m.W1[j][a.i]))));
    const mxW2 = Math.max(1e-6, ...Array.from(m.W2, Math.abs));
    const hmax = Math.max(1e-6, ...Array.from(f.h, Math.abs));
    let s = `<svg viewBox="0 0 ${W} ${Ht}" class="spam-net">`;
    ins.forEach((a, k) => { for (let j = 0; j < H; j++) { const w = m.W1[j][a.i]; s += `<line x1="${xi}" y1="${yIn(k)}" x2="${xh - 9}" y2="${yH(j)}" stroke="${w >= 0 ? '#2563eb' : '#e11d48'}" stroke-opacity="${(0.12 + 0.6 * Math.abs(w) / mxW).toFixed(2)}" stroke-width="${(0.5 + 2 * Math.abs(w) / mxW).toFixed(2)}"><title>${esc(a.w)} → h${j + 1}: ${f3(w)}</title></line>`; } });
    for (let j = 0; j < H; j++) { const w = m.W2[j]; s += `<line x1="${xh + 9}" y1="${yH(j)}" x2="${xo - 16}" y2="${Ht / 2}" stroke="${w >= 0 ? '#2563eb' : '#e11d48'}" stroke-opacity="${(0.2 + 0.6 * Math.abs(w) / mxW2).toFixed(2)}" stroke-width="${(0.6 + 2.6 * Math.abs(w) / mxW2).toFixed(2)}"><title>h${j + 1} → output: ${f3(w)}</title></line>`; }
    ins.forEach((a, k) => { s += `<circle cx="${xi}" cy="${yIn(k)}" r="7" class="in"/><text x="${xi - 12}" y="${yIn(k) + 4}" text-anchor="end" class="lb">${esc(a.w.length > 12 ? a.w.slice(0, 11) + '…' : a.w)}${a.c > 1 ? ' ×' + a.c : ''}</text>`; });
    if (!ins.length) s += `<text x="${xi}" y="${Ht / 2}" text-anchor="middle" class="lb">no active inputs</text>`;
    for (let j = 0; j < H; j++) s += `<circle cx="${xh}" cy="${yH(j)}" r="9" class="hd" style="--i:${(Math.abs(f.h[j]) / hmax).toFixed(2)}"><title>h${j + 1} = ${f3(f.h[j])} (z = ${f3(f.z[j])})</title></circle><text x="${xh + 13}" y="${yH(j) + 4}" class="lb">${f2(f.h[j])}</text>`;
    s += `<circle cx="${xo}" cy="${Ht / 2}" r="15" class="out" style="--i:${f.p.toFixed(2)}"/><text x="${xo}" y="${Ht / 2 + 4}" text-anchor="middle" class="ov">${(f.p * 100).toFixed(0)}%</text>`;
    return s + '</svg>';
  }
  function panelNN() {
    const st = S.nn, m = st.m;
    if (!m) return '<section class="spam-card"><div class="spam-empty">Press <b>Train</b>, <b>Step Update</b> or <b>Reset Weights</b> to create the network (|V| inputs → H hidden → 1 sigmoid output).</div></section>';
    const fz = featurize(S.test, m), f = nnForward(m, fz.active);
    const tr = m.X.map(e => ({ t: e.t, y: e.y, p: nnForward(m, e.a).p }));
    const g = m.lastGrad;
    let grad = '';
    if (st.showGrad) {
      if (!g) grad = '<div class="spam-empty">Take a Step Update or Train to record gradients.</div>';
      else {
        const nrm = a => Math.sqrt(Array.from(a).reduce((s, x) => s + x * x, 0));
        const top = [];
        g.gW1.forEach((row, j) => row.forEach((v, i) => { if (v !== 0) top.push({ j, i, v }); }));
        top.sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
        grad = `<div class="spam-mono">Gradients of the mean training loss at epoch ${m.epoch} (used for the last update θ ← θ − ${lr()}·∇L)<br>
          ‖∇W1‖ = ${f3(nrm(g.gW1.flatMap(r => Array.from(r))))} · ‖∇b1‖ = ${f3(nrm(g.gb1))} · ‖∇W2‖ = ${f3(nrm(g.gW2))} · |∇b2| = ${f3(Math.abs(g.gb2))}</div>
          <div class="spam-two"><div><div class="spam-mini-h">Per hidden unit</div><table class="spam-table"><thead><tr><th>unit</th><th>h (test)</th><th>W2</th><th>∂L/∂W2</th><th>∂L/∂b1</th></tr></thead><tbody>
          ${Array.from(m.W2).map((w, j) => `<tr><td class="t">h${j + 1}</td><td>${f3(f.h[j])}</td><td>${f3(w)}</td><td>${f3(g.gW2[j])}</td><td>${f3(g.gb1[j])}</td></tr>`).join('')}</tbody></table></div>
          <div><div class="spam-mini-h">Largest input-weight gradients ∂L/∂W1</div><table class="spam-table"><thead><tr><th>word → unit</th><th>W1</th><th>∂L/∂W1</th></tr></thead><tbody>
          ${top.slice(0, 10).map(t => `<tr><td class="t">${esc(m.vocab[t.i])} → h${t.j + 1}</td><td>${f3(m.W1[t.j][t.i])}</td><td>${f3(t.v)}</td></tr>`).join('')}</tbody></table></div></div>
          ${X('δ_o = ŷ − y; δ_j = δ_o·W2[j]·g′(z_j); ∂L/∂W1[j,i] = δ_j·x_i. Words absent from every training message never receive a gradient.')}`;
      }
    }
    return `<div class="spam-two">
      <section class="spam-card"><div class="spam-card-h"><h4>Training loss</h4><span class="spam-sub">mean BCE · epoch ${m.epoch} · ${st.running ? 'training…' : 'paused'}</span></div>${lossChart(m.loss)}
        <div class="spam-card-h" style="margin-top:.5rem"><h4>Neuron activations</h4><span class="spam-sub">current test message · ${ACTS[m.act]} · H = ${m.H}</span></div>
        ${netSVG(m, fz, f)}
        ${fz.active.length > 10 ? `<div class="spam-sub">Showing 10 of ${fz.active.length} active inputs.</div>` : ''}
      </section>
      <section class="spam-card"><div class="spam-card-h"><h4>Predictions on training messages</h4><span class="spam-sub">seen during training</span></div>
        <div class="spam-scroll tall"><table class="spam-table"><thead><tr><th>message</th><th>label</th><th>P(spam)</th></tr></thead><tbody>
        ${tr.map(x => { const pl = x.p >= st.thr ? 1 : 0; return `<tr><td class="t msg">${esc(x.t)}</td><td><span class="spam-lbl ${x.y ? 'spam' : 'ham'} sm">${x.y ? 'Spam' : 'Ham'}</span></td><td class="${pl === x.y ? 'ok' : 'bad'}">${pct(x.p)}</td></tr>`; }).join('')}
        </tbody></table></div></section></div>
      <section class="spam-card"><div class="spam-card-h"><h4>Gradient inspection</h4><label class="spam-sub"><input type="checkbox" data-act="grad" ${st.showGrad ? 'checked' : ''}> show</label></div>${grad}</section>`;
  }

  // --- Comparison & evaluation
  function cmCard(kind, ev, title) {
    const name = kind === 'nb' ? 'Naive Bayes' : 'Neural Network';
    if (!ev) return `<div class="spam-cm"><div class="spam-mini-h">${name}</div><div class="spam-empty">Not trained.</div></div>`;
    const c = ev.cm;
    return `<div class="spam-cm"><div class="spam-mini-h">${name} <span class="spam-status ${status(kind)}">${STATUS_TXT[status(kind)]}</span></div>
      <table class="spam-cmt"><thead><tr><th></th><th>pred Spam</th><th>pred Ham</th></tr></thead><tbody>
        <tr><th>true Spam</th><td class="good">TP ${c.tp}</td><td class="badc">FN ${c.fn}</td></tr>
        <tr><th>true Ham</th><td class="badc">FP ${c.fp}</td><td class="good">TN ${c.tn}</td></tr></tbody></table>
      <div class="spam-metrics"><span>Precision <b>${pct(ev.prec)}</b></span><span>Recall <b>${pct(ev.rec)}</b></span><span>Accuracy <b>${pct(ev.acc)}</b></span></div>
      ${title ? `<div class="spam-sub">${title}</div>` : ''}</div>`;
  }
  function panelCompare() {
    const evNB = evaluate('nb', S.evalSet), evNN = evaluate('nn', S.evalSet);
    const trNB = evaluate('nb', S.train), trNN = evaluate('nn', S.train);
    const cell = (kind, t) => { const p = S[kind].m && words(t).length ? predictWith(kind, t) : null; return p ? `<span class="spam-lbl sm ${p.label}">${lbl(p.label)}</span> ${pct(p.p)}` : '—'; };
    const rows = [{ t: S.test, y: null, cur: true }].concat(S.evalSet.map((r, i) => Object.assign({ i }, r)));
    const tbl = rows.map(r => {
      const pn = S.nb.m && words(r.t).length ? predictWith('nb', r.t) : null, pm = S.nn.m && words(r.t).length ? predictWith('nn', r.t) : null;
      const dis = pn && pm && pn.label !== pm.label;
      const mark = (p) => (r.y && p ? (p.label === r.y ? 'ok' : 'bad') : '');
      return `<tr class="${r.cur ? 'cur' : ''} ${dis ? 'dis' : ''}"><td class="t msg">${r.cur ? '<b>Test:</b> ' : ''}${esc(r.t) || '<i>(empty)</i>'}</td>
        <td>${r.y ? `<span class="spam-lbl sm ${r.y}">${lbl(r.y)}</span>` : '—'}</td><td class="${mark(pn)}">${cell('nb', r.t)}</td><td class="${mark(pm)}">${cell('nn', r.t)}</td></tr>`;
    }).join('');
    const ec = { spam: S.evalSet.filter(r => r.y === 'spam').length, ham: S.evalSet.filter(r => r.y === 'ham').length };
    return `<section class="spam-card"><div class="spam-card-h"><h4>Both models on the same messages</h4><span class="spam-sub">row highlighted when the models disagree · ✓/✗ vs. true label</span></div>
        <div class="spam-scroll"><table class="spam-table cmp"><thead><tr><th>message</th><th>true</th><th>Naive Bayes</th><th>Neural Network</th></tr></thead><tbody>${tbl}</tbody></table></div></section>
      <section class="spam-card spam-evalcard"><div class="spam-card-h"><h4><i data-lucide="flask-conical"></i> Evaluation set — held out, never used for training</h4><span class="spam-sub">${ec.spam} spam · ${ec.ham} ham · Spam = positive class</span></div>
        <div class="spam-two">${cmCard('nb', evNB)}${cmCard('nn', evNN)}</div>
        ${X('Precision = TP/(TP+FP): of messages flagged Spam, how many were spam. Recall = TP/(TP+FN): of the real spam, how much was caught.')}
        <details class="spam-edit" ${S.evalOpen ? 'open' : ''}><summary>Edit evaluation set</summary>
          <div class="spam-scroll">${rowList(S.evalSet, 'eval')}</div>
          <div class="spam-row add"><button class="spam-lbl ${S.evalNewLabel}" data-act="evalnewlabel">${lbl(S.evalNewLabel)}</button><input class="spam-in" id="spam-evnew" placeholder="Add an evaluation message…" spellcheck="false"><button class="spam-btn" data-act="add-eval"><i data-lucide="plus"></i> Add</button><button class="spam-btn" data-act="reset-eval"><i data-lucide="rotate-ccw"></i> Reset</button></div>
        </details></section>
      <section class="spam-card spam-traincard"><div class="spam-card-h"><h4>Training results — seen data (optimistic, not an evaluation)</h4><span class="spam-sub">${S.train.length} training messages</span></div>
        <div class="spam-two">${cmCard('nb', trNB)}${cmCard('nn', trNN)}</div></section>`;
  }

  // ===========================================================================
  // Workspace events
  // ===========================================================================
  function setOf(name) { return name === 'eval' ? S.evalSet : S.train; }
  function onWsClick(e) {
    const t = e.target;
    const flip = t.closest('[data-flip]'), del = t.closest('[data-del]'), use = t.closest('[data-use]'), b = t.closest('[data-act]');
    if (flip) { const set = setOf(flip.dataset.set), r = set[+flip.dataset.flip]; r.y = r.y === 'spam' ? 'ham' : 'spam'; if (flip.dataset.set === 'train') markData(); renderAll(); return; }
    if (del) { setOf(del.dataset.set).splice(+del.dataset.del, 1); if (del.dataset.set === 'train') markData(); renderAll(); return; }
    if (use) { S.test = setOf(use.dataset.set)[+use.dataset.use].t; root.querySelector('#spam-test').value = S.test; renderPrediction(); note('Copied to the test message (training data unchanged).'); return; }
    if (!b) return;
    switch (b.dataset.act) {
      case 'newlabel': S.newLabel = S.newLabel === 'spam' ? 'ham' : 'spam'; renderPanel(); return;
      case 'evalnewlabel': S.evalNewLabel = S.evalNewLabel === 'spam' ? 'ham' : 'spam'; S.evalOpen = true; renderPanel(); return;
      case 'add-train': { const inp = ws.querySelector('#spam-new'); if (!inp.value.trim()) return; S.train.push({ t: inp.value.trim(), y: S.newLabel }); markData(); renderAll(); return; }
      case 'add-eval': { const inp = ws.querySelector('#spam-evnew'); if (!inp.value.trim()) return; S.evalSet.push({ t: inp.value.trim(), y: S.evalNewLabel }); S.evalOpen = true; renderPanel(); return; }
      case 'reset-eval': S.evalSet = EVAL_DEFAULT.map(([t, y]) => ({ t, y })); renderPanel(); return;
      case 'test-to-train': if (!S.test.trim()) return; S.train.push({ t: S.test.trim(), y: b.dataset.y }); markData(); renderAll(); note(`Added the test message to training as ${lbl(b.dataset.y)} — retrain to use it.`); return;
      case 'reset-data': loadDataset(S.dataset === 'custom' ? 'default' : S.dataset); return;
      case 'grad': S.nn.showGrad = b.checked; renderPanel(); return;
    }
  }
  function onWsInput(e) {
    const t = e.target;
    if (t.dataset && t.dataset.edit !== undefined) {
      const set = setOf(t.dataset.set); set[+t.dataset.edit].t = t.value;
      if (t.dataset.set === 'train') { markData(); renderHead(); renderControls(); renderPrediction(); }
    } else if (t.id === 'spam-dataset' && e.type === 'input') loadDataset(t.value);
  }
  function markData() { dataChanged(); S.dataset = 'custom'; }
  function loadDataset(k) {
    if (!DATASETS[k]) return;
    S.train = DATASETS[k].rows.map(([t, y]) => ({ t, y })); S.dataset = k; dataChanged();
    renderControls(); refresh(); note(`Loaded “${DATASETS[k].label}”. Models keep their old state until you retrain.`);
  }

  // ===========================================================================
  // Lifecycle: mount lazily, pause training when the tab is left
  // ===========================================================================
  function onTab(e) {
    const t = e.target.closest('.playground-tab');
    if (!t) return;
    if (t.dataset.target === 'view-spam') { mount(); }
    else if (S.nn.running) nnPause('Paused: you left the Spam Detection tab.');
  }
  function init() {
    document.addEventListener('click', onTab);
    document.addEventListener('visibilitychange', () => { if (document.hidden && S.nn.running) nnPause('Paused while the page was hidden.'); });
    const v = document.getElementById('view-spam');
    if (v && (v.classList.contains('active') || location.hash === '#view-spam')) mount();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  window.SpamPlayground = {
    mount, _S: S,
    _engine: { tokenize, buildVocab, featurize, nbTrain, nbScore, nnInit, nnForward, nnGrad, nnStep, nnMeanLoss, nnPredict, evaluate, predictWith, sigmoid, bce }
  };
})();
