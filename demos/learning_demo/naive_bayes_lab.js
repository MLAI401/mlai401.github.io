/**
 * naive_bayes_lab.js — Topic 06 · Tab 2 · Interactive Naive Bayes Playground
 * for learning.html (same pattern as text_features_lab.js).
 *
 *   Concept chips (kept from the lecture):
 *     • Generative MAP Classification  → mode 'map'
 *     • Laplace (Add-1) Smoothing      → mode 'laplace'
 *   Both share one state: language (English / Burmese), task (spam filter /
 *   review sentiment), editable labelled training set, test message, α.
 *
 *   Concept column (#lr-concept-lab): language + task switch, test presets,
 *     editable test text, Reset, Step-by-Step, α slider with the live
 *     likelihood formula, and the editable training data.
 *   Illustration column: verdict + posterior, evidence-highlighted message,
 *     log-score race, word evidence table, training summary (MAP) or the
 *     α = 0 vs α comparison and zero-trap detector (Laplace), or the
 *     6-step pipeline in Step-by-Step mode.
 *
 * Formulas (match topic06_reading.html §1.2 / Exercise 6.2):
 *   P(c)      = N_c / N
 *   P̂(w | c)  = (count(w, c) + α) / (Σ_w' count(w', c) + α·|V|)
 *   score(c)  = log P(c) + Σ_i log P̂(x_i | c)   (multinomial: repeats count)
 *   c*        = argmax_c score(c);  P(c | x) = exp(score_c) / Σ exp(score_c')
 *   Test words that never occur in training (not in V) are skipped.
 *
 * Exposes window.NaiveBayesLab = { render(col, mode) }.
 */
(function () {
  'use strict';

  // ===========================================================================
  // Data
  // ===========================================================================
  const TASKS = {
    spam: { name: 'Spam filter', icon: 'mail-warning',
      classes: [{ k: 'spam', label: 'Spam' }, { k: 'ham', label: 'Ham' }] },
    sentiment: { name: 'Review sentiment', icon: 'smile',
      classes: [{ k: 'pos', label: 'Positive' }, { k: 'neg', label: 'Negative' }] }
  };

  const DATA = {
    en: {
      spam: {
        train: [
          ['win a free lottery prize now', 'spam'],
          ['claim your free cash prize today', 'spam'],
          ['urgent you won the lottery claim now', 'spam'],
          ['free bonus cash click the link', 'spam'],
          ['exclusive offer win money now', 'spam'],
          ['team meeting moved to friday', 'ham'],
          ['please review the project report', 'ham'],
          ['lunch meeting with the client today', 'ham'],
          ['send the report before the meeting', 'ham'],
          ['thanks for the project update', 'ham']
        ],
        presets: [
          { key: 'a', label: 'Spam message', icon: 'alert-triangle', text: 'Claim your free lottery prize now!' },
          { key: 'b', label: 'Normal email', icon: 'mail', text: 'Please send the project report before Friday.' },
          { key: 'c', label: 'Tricky: free lunch', icon: 'flask-conical', text: 'Free lunch at the team meeting today' }
        ]
      },
      sentiment: {
        train: [
          ['great phone amazing battery', 'pos'],
          ['love this camera so much', 'pos'],
          ['excellent value highly recommend', 'pos'],
          ['the screen is bright and great', 'pos'],
          ['fast delivery and great service', 'pos'],
          ['terrible battery died fast', 'neg'],
          ['hate this laptop so much', 'neg'],
          ['waste of money do not buy', 'neg'],
          ['the screen broke after a week', 'neg'],
          ['slow delivery and bad service', 'neg']
        ],
        presets: [
          { key: 'a', label: 'Positive review', icon: 'thumbs-up', text: 'Amazing camera, I love it. Highly recommend!' },
          { key: 'b', label: 'Negative review', icon: 'thumbs-down', text: 'Terrible screen, a waste of money.' },
          { key: 'c', label: 'Tricky: mixed', icon: 'flask-conical', text: 'Great price but the battery died' }
        ]
      }
    },
    // Burmese (မြန်မာ) — pre-segmented: each space marks a word boundary.
    my: {
      spam: {
        train: [
          ['ထီ ဆု ကို အခမဲ့ ရယူ ပါ', 'spam'],
          ['ယနေ့ ငွေ ဆု အခမဲ့ ရယူ ပါ', 'spam'],
          ['အရေးကြီး ထီ ပေါက် ပြီ ယခု ရယူ ပါ', 'spam'],
          ['အခမဲ့ ဘောနပ်စ် ငွေ လင့်ခ် နှိပ် ပါ', 'spam'],
          ['အထူး ကမ်းလှမ်းချက် ငွေ ယခု ရယူ ပါ', 'spam'],
          ['အဖွဲ့ အစည်းအဝေး သောကြာ နေ့ သို့ ရွှေ့ ပြီ', 'ham'],
          ['ပရောဂျက် အစီရင်ခံစာ ကို စစ်ဆေး ပေး ပါ', 'ham'],
          ['ဖောက်သည် နှင့် နေ့လည်စာ အစည်းအဝေး ယနေ့', 'ham'],
          ['အစည်းအဝေး မတိုင်မီ အစီရင်ခံစာ ပို့ ပေး ပါ', 'ham'],
          ['ပရောဂျက် အခြေအနေ အတွက် ကျေးဇူး တင် ပါ တယ်', 'ham']
        ],
        presets: [
          { key: 'a', label: 'Spam message', icon: 'alert-triangle', text: 'အခမဲ့ ထီ ဆု ကို ယခု ရယူ ပါ ။' },
          { key: 'b', label: 'Normal email', icon: 'mail', text: 'သောကြာ နေ့ မတိုင်မီ ပရောဂျက် အစီရင်ခံစာ ပို့ ပေး ပါ ။' },
          { key: 'c', label: 'Tricky: free lunch', icon: 'flask-conical', text: 'ယနေ့ အဖွဲ့ အစည်းအဝေး မှာ အခမဲ့ နေ့လည်စာ ရှိ တယ် ။' }
        ]
      },
      sentiment: {
        train: [
          ['ဖုန်း ကောင်း တယ် ဘက်ထရီ အရမ်း ကောင်း တယ်', 'pos'],
          ['ဒီ ကင်မရာ ကို အရမ်း ကြိုက် တယ်', 'pos'],
          ['တန်ဖိုး ရှိ တယ် အကြံပြု ပါ တယ်', 'pos'],
          ['မျက်နှာပြင် တောက်ပ ပြီး ကောင်း တယ်', 'pos'],
          ['ပို့ဆောင်မှု မြန် ပြီး ဝန်ဆောင်မှု ကောင်း တယ်', 'pos'],
          ['ဘက်ထရီ မြန်မြန် ပျက် သွား တယ်', 'neg'],
          ['ဒီ လက်ပ်တော့ ကို မုန်း တယ်', 'neg'],
          ['ပိုက်ဆံ အလဟဿ ပဲ မ ဝယ် ပါ နဲ့', 'neg'],
          ['တစ်ပတ် အတွင်း မျက်နှာပြင် ကွဲ သွား တယ်', 'neg'],
          ['ပို့ဆောင်မှု နှေး ပြီး ဝန်ဆောင်မှု ဆိုး တယ်', 'neg']
        ],
        presets: [
          { key: 'a', label: 'Positive review', icon: 'thumbs-up', text: 'ကင်မရာ အရမ်း ကောင်း တယ် ၊ ကြိုက် တယ် ။' },
          { key: 'b', label: 'Negative review', icon: 'thumbs-down', text: 'မျက်နှာပြင် ကွဲ သွား တယ် ၊ ပိုက်ဆံ အလဟဿ ပဲ ။' },
          { key: 'c', label: 'Tricky: mixed', icon: 'flask-conical', text: 'ဈေး ကောင်း ပေမဲ့ ဘက်ထရီ ပျက် သွား တယ် ။' }
        ]
      }
    }
  };

  const LANG_LABEL = { en: 'English', my: 'မြန်မာ' };

  const STEPS = [
    { name: 'Training Data' }, { name: 'Priors P(c)' }, { name: 'Word Counts' },
    { name: 'Likelihoods P(w|c)' }, { name: 'Log Scores' }, { name: 'MAP Decision' }
  ];
  const STEP_CAPTIONS = [
    'Naive Bayes is supervised: it learns from emails that already carry a label.',
    'The prior is how common each class is before reading a single word: P(c) = N_c / N.',
    'Count every word in each class (the Bag-of-Words from the previous concept, summed per class).',
    'Turn counts into smoothed probabilities: P̂(w|c) = (count + α) / (total + α|V|).',
    'Multiply prior × likelihoods — done as a SUM of logs to avoid tiny numbers underflowing to 0.',
    'Pick the class with the higher score (MAP). Normalising the scores gives P(c | message).'
  ];

  // ===========================================================================
  // State
  // ===========================================================================
  const state = {
    lang: 'en', task: 'spam', alpha: 1, text: '', preset: 'a',
    train: {}, texts: {}, selected: null,
    stepMode: false, step: 0, msg: null
  };
  let mode = 'map';
  let ctrlHost = null, vizHost = null;
  let snap = null, msgTimer = null;

  const key = () => `${state.lang}:${state.task}`;
  const D = () => DATA[state.lang][state.task];
  const CL = () => TASKS[state.task].classes;
  function trainSet() {
    if (!state.train[key()]) state.train[key()] = D().train.map(([t, y]) => ({ t, y }));
    return state.train[key()];
  }
  function presetText(k) { return (D().presets.find(p => p.key === k) || D().presets[0]).text; }
  state.text = presetText('a');

  // ===========================================================================
  // Helpers
  // ===========================================================================
  function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  const q = w => `<b class="tfp-q">“${esc(w)}”</b>`;
  const f4 = x => (isFinite(x) ? x.toFixed(4) : '0');
  const fl = x => (x === -Infinity ? '−∞' : x === Infinity ? '+∞' : (Math.abs(x) < 5e-3 ? 0 : x).toFixed(2));
  const pc = x => (x === null || x === undefined ? '—' : (x * 100).toFixed(1) + '%');
  const sci = x => (x === 0 ? '0' : x < 1e-3 ? x.toExponential(2) : x.toFixed(4));
  function icons() { if (window.lucide) window.lucide.createIcons(); }

  function scan(text) {
    const out = [];
    const my = state.lang === 'my';
    const re = my ? /[^\s​၊။.,!?;:"'()\[\]{}\-—…“”‘’]+/gu : /[A-Za-z0-9_]+/g;
    let m;
    while ((m = re.exec(text || ''))) out.push({ raw: m[0], word: m[0].toLowerCase(), start: m.index, end: m.index + m[0].length, kept: my ? true : m[0].length > 1 });
    return out;
  }
  const tok = t => scan(t).filter(p => p.kept).map(p => p.word);

  // ===========================================================================
  // Model
  // ===========================================================================
  function fit(examples, alpha) {
    const cls = CL().map(c => c.k);
    const m = { cls, alpha, N: examples.length, n: {}, prior: {}, counts: {}, total: {}, vocab: new Set() };
    cls.forEach(c => { m.n[c] = 0; m.counts[c] = {}; m.total[c] = 0; });
    examples.forEach(e => {
      if (!m.counts[e.y]) return;
      m.n[e.y]++;
      tok(e.t).forEach(w => { m.counts[e.y][w] = (m.counts[e.y][w] || 0) + 1; m.total[e.y]++; m.vocab.add(w); });
    });
    cls.forEach(c => { m.prior[c] = m.N ? m.n[c] / m.N : 0; });
    m.V = m.vocab.size;
    m.cnt = (w, c) => m.counts[c][w] || 0;
    m.lik = (w, c, a) => {
      const al = a === undefined ? m.alpha : a;
      const den = m.total[c] + al * m.V;
      return den > 0 ? (m.cnt(w, c) + al) / den : 0;
    };
    return m;
  }

  function classify(m, tokens, a) {
    const al = a === undefined ? m.alpha : a;
    const known = tokens.filter(w => m.vocab.has(w));
    const unknown = tokens.filter(w => !m.vocab.has(w));
    const res = { known, unknown, score: {}, run: {}, killer: {}, terms: {} };
    m.cls.forEach(c => {
      let s = m.prior[c] > 0 ? Math.log(m.prior[c]) : -Infinity;
      const run = [s];
      res.terms[c] = known.map(w => {
        const p = m.lik(w, c, al);
        const lp = p > 0 ? Math.log(p) : -Infinity;
        if (p === 0 && !res.killer[c]) res.killer[c] = w;
        s += lp; run.push(s);
        return { w, p, lp };
      });
      if (m.prior[c] === 0 && !res.killer[c]) res.killer[c] = '(prior = 0)';
      res.score[c] = s; res.run[c] = run;
    });
    const sc = m.cls.map(c => res.score[c]);
    const mx = Math.max(...sc);
    if (mx === -Infinity) { res.post = null; res.win = null; }
    else {
      const ex = sc.map(s => Math.exp(s - mx));
      const Z = ex.reduce((x, y) => x + y, 0);
      res.post = {}; m.cls.forEach((c, i) => { res.post[c] = ex[i] / Z; });
      res.win = m.cls[sc.indexOf(mx)];
    }
    return res;
  }

  function analyze(alphaOverride) {
    const m = fit(trainSet(), alphaOverride === undefined ? state.alpha : alphaOverride);
    const pieces = scan(state.text);
    const tokens = pieces.filter(p => p.kept).map(p => p.word);
    const R = classify(m, tokens);
    const R0 = classify(m, tokens, 0);
    const refA = state.alpha > 0 ? state.alpha : 1;          // smoothing shown on the Laplace tab
    const RS = classify(m, tokens, refA);
    // per unique word evidence
    const uniq = [];
    tokens.forEach(w => { if (!uniq.includes(w)) uniq.push(w); });
    const [c1, c2] = m.cls;
    const ev = uniq.map(w => {
      const known = m.vocab.has(w);
      const p1 = known ? m.lik(w, c1) : null, p2 = known ? m.lik(w, c2) : null;
      const l1 = p1 > 0 ? Math.log(p1) : -Infinity, l2 = p2 > 0 ? Math.log(p2) : -Infinity;
      let lr = null;
      if (known) lr = (l1 === -Infinity && l2 === -Infinity) ? 0 : l1 - l2;
      return { w, k: tokens.filter(x => x === w).length, known, n1: m.cnt(w, c1), n2: m.cnt(w, c2), p1, p2, lr };
    });
    return { m, pieces, tokens, R, R0, RS, refA, ev };
  }

  // ===========================================================================
  // Messages
  // ===========================================================================
  const MSG_TAGS = { text: 'Message changed', alpha: 'Smoothing changed', train: 'Training changed', select: 'Word selected', preset: 'Preset loaded', step: 'Step', info: 'Note', warn: 'Zero trap' };
  function msgHTML() {
    const m = state.msg;
    if (!m) return '<div class="tfp-msg" id="nb-msg"><span class="tfp-msg-tag">Try it</span><span>Edit the message, drag α, or change the training data — this box explains how the decision moved.</span></div>';
    const cls = { alpha: 'tfp-msg-corpus', train: 'tfp-msg-corpus', step: 'tfp-msg-step', select: 'tfp-msg-select', warn: 'nb-msg-warn' }[m.kind] || '';
    return `<div class="tfp-msg ${cls}" id="nb-msg"><span class="tfp-msg-tag">${MSG_TAGS[m.kind] || 'Note'}</span><span>${m.html}</span></div>`;
  }
  function setMsg(kind, html) { state.msg = { kind, html }; }

  const lbl = c => (CL().find(x => x.k === c) || {}).label || c;
  function verdictText(R) {
    if (!R.win) return '<b>undecidable</b> (every class scored 0)';
    return `<b>${lbl(R.win)}</b> (${pc(R.post[R.win])})`;
  }

  function explainChange(prev, cur, lead) {
    let html = lead ? lead + ' ' : '';
    const c1 = cur.m.cls[0];
    const a = prev.R.post ? prev.R.post[c1] : null, b = cur.R.post ? cur.R.post[c1] : null;
    html += `P(${lbl(c1)} | message) ${pc(a)} → <b>${pc(b)}</b>; decision ${verdictText(cur.R)}`;
    html += prev.R.win !== cur.R.win ? ' — <b>the decision flipped!</b>' : '.';
    const kills = cur.m.cls.filter(c => cur.R.killer[c] && cur.R.killer[c] !== '(prior = 0)');
    if (kills.length) html += ` ⚠ ${kills.map(c => `P(${q(cur.R.killer[c])} | ${lbl(c)}) = 0 wipes out ${lbl(c)}`).join('; ')} — the zero-probability trap.`;
    return html;
  }

  function explainText(prev, cur) {
    const pw = new Set(prev.tokens), cw = new Set(cur.tokens);
    const added = [...cw].filter(w => !pw.has(w)), removed = [...pw].filter(w => !cw.has(w));
    let lead = '';
    const describe = w => {
      const e = cur.ev.find(x => x.w === w) || prev.ev.find(x => x.w === w);
      if (!e || !e.known) return `${q(w)} (not in training vocabulary — skipped)`;
      const c = e.lr > 0 ? cur.m.cls[0] : cur.m.cls[1];
      return `${q(w)} (log-ratio ${e.lr > 0 ? '+' : ''}${fl(e.lr)} → leans ${lbl(c)})`;
    };
    if (added.length) lead += `Added ${added.slice(0, 3).map(describe).join(', ')}.`;
    if (removed.length) lead += ` Removed ${removed.slice(0, 3).map(w => q(w)).join(', ')}.`;
    if (!added.length && !removed.length) {
      if (prev.tokens.length === cur.tokens.length) { setMsg('text', 'Only punctuation or spacing changed — the tokens, and therefore the prediction, are identical.'); return; }
      lead = 'A word was repeated or removed: multinomial Naive Bayes counts each occurrence, so repeats strengthen the evidence.';
    }
    setMsg(cur.m.cls.some(c => cur.R.killer[c] && cur.R.killer[c] !== '(prior = 0)') ? 'warn' : 'text', explainChange(prev, cur, lead));
  }

  function scheduleExplain() {
    clearTimeout(msgTimer);
    msgTimer = setTimeout(() => {
      const cur = analyze();
      if (snap) explainText(snap, cur);
      snap = cur;
      const box = vizHost && vizHost.querySelector('#nb-msg');
      if (box) box.outerHTML = msgHTML();
    }, 450);
  }
  function resnap() { clearTimeout(msgTimer); snap = analyze(); }

  // ===========================================================================
  // Controls
  // ===========================================================================
  function buildControls() {
    const my = state.lang === 'my';
    ctrlHost.innerHTML = `
      <div class="tfp nb-ctrl ${my ? 'tfp-my' : ''}">
        <div class="tfp-sec">
          <div class="tfp-sec-head"><span class="tfp-sec-title"><i data-lucide="type"></i> Test message <span class="tfp-sub">x — what to classify</span></span>
            <div class="tfp-lang" role="group" aria-label="Language">${Object.keys(LANG_LABEL).map(k => `<button class="${state.lang === k ? 'active' : ''}" data-act="lang" data-k="${k}" lang="${k}">${LANG_LABEL[k]}</button>`).join('')}</div></div>
          <div class="nb-task">${Object.keys(TASKS).map(k => `<button class="tfp-btn ${state.task === k ? 'on' : ''}" data-act="task" data-k="${k}"><i data-lucide="${TASKS[k].icon}"></i>${TASKS[k].name}</button>`).join('')}</div>
          ${my ? '<div class="tfp-langnote"><i data-lucide="info"></i><span>Burmese is written without spaces between words; these texts are <b>pre-segmented</b> (each space marks a word boundary).</span></div>' : ''}
          <div class="tfp-presets nb-presets">${D().presets.map(p => `<button class="tfp-preset ${state.preset === p.key ? 'active' : ''}" data-act="preset" data-k="${p.key}"><i data-lucide="${p.icon}"></i>${p.label}</button>`).join('')}</div>
          <textarea class="tfp-text" id="nb-text" rows="3" spellcheck="false" lang="${state.lang}" aria-label="Test message">${esc(state.text)}</textarea>
          <div class="tfp-row">
            <button class="tfp-btn" data-act="reset"><i data-lucide="rotate-ccw"></i>Reset</button>
            <button class="tfp-btn ${state.stepMode ? 'on' : ''}" data-act="stepmode"><i data-lucide="list-ordered"></i>${state.stepMode ? 'Exit Step-by-Step' : 'Step-by-Step Mode'}</button>
            <span class="tfp-stats" id="nb-stats"></span>
          </div>
          <div class="tfp-stepnav" id="nb-stepnav" hidden></div>
        </div>

        <div class="tfp-sec">
          <div class="tfp-sec-head"><span class="tfp-sec-title"><i data-lucide="sliders-horizontal"></i> Laplace smoothing α</span>
            <span class="nb-alpha-quick"><button class="tfp-btn" data-act="alpha" data-k="0">α = 0</button><button class="tfp-btn" data-act="alpha" data-k="1">α = 1</button></span></div>
          <div class="tfp-row"><input type="range" min="0" max="2" step="0.1" value="${state.alpha}" id="nb-alpha" class="evo-range"><b class="evo-rv" id="nb-alpha-v">${state.alpha.toFixed(1)}</b></div>
          <div class="tfp-calc" id="nb-calc"></div>
        </div>

        <div class="tfp-sec">
          <div class="tfp-sec-head"><span class="tfp-sec-title"><i data-lucide="database"></i> Training data <span class="tfp-sub">labelled examples</span></span><span class="tfp-sub" id="nb-ntrain"></span></div>
          <div class="nb-train" id="nb-train"></div>
          <div class="tfp-row"><input class="tfp-doc-in" id="nb-train-in" placeholder="${my ? 'စာကြောင်း တစ်ခု ရိုက် ပါ…' : 'type a new training example…'}" spellcheck="false" lang="${state.lang}">
            <button class="nb-lbl" data-act="newlabel" id="nb-newlabel"></button>
            <button class="tfp-btn" data-act="add-train"><i data-lucide="plus"></i>Add</button></div>
          <div class="tfp-row"><button class="tfp-btn" data-act="add-test-as-train"><i data-lucide="copy-plus"></i>Add the test message as <span id="nb-astrain-lbl"></span></button>
            <button class="tfp-btn ghost" data-act="default-train"><i data-lucide="rotate-ccw"></i>Default data</button></div>
        </div>
      </div>`;

    const ta = ctrlHost.querySelector('#nb-text');
    ta.addEventListener('input', () => {
      state.text = ta.value;
      if (state.preset && ta.value !== presetText(state.preset)) {
        state.preset = null;
        ctrlHost.querySelectorAll('[data-act="preset"]').forEach(b => b.classList.remove('active'));
      }
      update(); scheduleExplain();
    });
    const sl = ctrlHost.querySelector('#nb-alpha');
    sl.addEventListener('input', () => setAlpha(+sl.value));
    const ti = ctrlHost.querySelector('#nb-train-in');
    ti.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); onCtrl({ target: ctrlHost.querySelector('[data-act="add-train"]') }); } });
    ctrlHost.onclick = onCtrl;
    if (!state.newLabel || !CL().some(c => c.k === state.newLabel)) state.newLabel = CL()[0].k;
    icons();
  }

  function setAlpha(a) {
    const prev = analyze();
    state.alpha = Math.round(a * 10) / 10;
    const cur = analyze();
    const killers = cur.m.cls.filter(c => cur.R.killer[c] && cur.R.killer[c] !== '(prior = 0)');
    let lead = `α ${prev.m.alpha.toFixed(1)} → <b>${state.alpha.toFixed(1)}</b>.`;
    if (state.alpha === 0) lead += ' No smoothing: probabilities are raw counts (maximum likelihood), so any word missing from a class gets probability 0.';
    else if (prev.m.alpha === 0) lead += ` Every count gets +${state.alpha.toFixed(1)}: no word has probability 0 any more.`;
    else lead += ` Larger α pulls every P̂(w|c) toward the uniform 1/|V| = ${f4(1 / Math.max(1, cur.m.V))}, weakening the evidence.`;
    setMsg(killers.length ? 'warn' : 'alpha', explainChange(prev, cur, lead));
    snap = cur;
    update();
  }

  function onCtrl(e) {
    const b = e.target.closest ? e.target.closest('[data-act]') : e.target;
    if (!b || !b.dataset) return;
    const act = b.dataset.act;
    const prev = analyze();
    const set = trainSet();
    switch (act) {
      case 'lang': case 'task': {
        if (state[act] === b.dataset.k) return;
        state.texts[key()] = { text: state.text, preset: state.preset };
        state[act] = b.dataset.k;
        const sv = state.texts[key()];
        state.text = sv ? sv.text : presetText('a'); state.preset = sv ? sv.preset : 'a';
        state.selected = null;
        const cur = analyze();
        setMsg('info', `${act === 'lang' ? `Language: <b>${LANG_LABEL[state.lang]}</b>` : `Task: <b>${TASKS[state.task].name}</b> (${CL().map(c => c.label).join(' vs ')})`}. Training on ${cur.m.N} labelled examples, |V| = ${cur.m.V}. The message is classified ${verdictText(cur.R)}. ${state.lang === 'my' ? 'The algorithm is identical — only the words changed.' : ''}`);
        buildControls(); resnap(); update(); return;
      }
      case 'preset': {
        state.preset = b.dataset.k; state.text = presetText(state.preset); state.selected = null;
        ctrlHost.querySelector('#nb-text').value = state.text;
        ctrlHost.querySelectorAll('[data-act="preset"]').forEach(x => x.classList.toggle('active', x === b));
        const cur = analyze();
        const p = D().presets.find(x => x.key === state.preset);
        let html = `“${esc(p.label)}”: ${cur.tokens.length} tokens (${cur.R.known.length} in the vocabulary). Decision ${verdictText(cur.R)}.`;
        if (state.preset === 'c') html += state.alpha > 0 ? ' Now drag α to 0 and watch what one missing word does.' : '';
        setMsg('preset', html);
        resnap(); update(); return;
      }
      case 'reset':
        state.train[key()] = null; state.alpha = 1; state.text = presetText(state.preset || 'a'); state.preset = state.preset || 'a';
        state.selected = null; state.stepMode = false; state.step = 0;
        setMsg('info', 'Reset: default training data, α = 1, preset message.');
        buildControls(); resnap(); update(); return;
      case 'stepmode':
        state.stepMode = !state.stepMode; state.step = 0;
        if (state.stepMode) stepMsg(); else setMsg('info', 'Back to free play.');
        b.classList.toggle('on', state.stepMode);
        b.innerHTML = `<i data-lucide="list-ordered"></i>${state.stepMode ? 'Exit Step-by-Step' : 'Step-by-Step Mode'}`;
        update(); return;
      case 'nav':
        if (b.dataset.k === 'done') { state.stepMode = false; setMsg('info', 'Back to free play.'); buildControls(); update(); return; }
        state.step = Math.max(0, Math.min(STEPS.length - 1, state.step + +b.dataset.k)); stepMsg(); update(); return;
      case 'alpha': setAlpha(+b.dataset.k); ctrlHost.querySelector('#nb-alpha').value = state.alpha; return;
      case 'newlabel': {
        const ks = CL().map(c => c.k);
        state.newLabel = ks[(ks.indexOf(state.newLabel) + 1) % ks.length];
        updateControls(analyze()); return;
      }
      case 'add-train': {
        const inp = ctrlHost.querySelector('#nb-train-in');
        if (!tok(inp.value).length) { setMsg('info', 'Type an example first.'); update(); return; }
        set.push({ t: inp.value.trim(), y: state.newLabel }); inp.value = '';
        const cur = analyze();
        setMsg('train', explainChange(prev, cur, `Learned one more <b>${lbl(state.newLabel)}</b> example (N_${lbl(state.newLabel)} ${prev.m.n[state.newLabel]} → ${cur.m.n[state.newLabel]}, |V| ${prev.m.V} → ${cur.m.V}).`));
        break;
      }
      case 'add-test-as-train': {
        if (!tok(state.text).length) return;
        set.push({ t: state.text.trim(), y: state.newLabel });
        const cur = analyze();
        setMsg('train', explainChange(prev, cur, `Added the test message itself as a <b>${lbl(state.newLabel)}</b> training example — now the model has “seen” these words in that class.`));
        break;
      }
      case 'flip': {
        const i = +b.dataset.i, ks = CL().map(c => c.k);
        set[i].y = ks[(ks.indexOf(set[i].y) + 1) % ks.length];
        const cur = analyze();
        setMsg('train', explainChange(prev, cur, `Relabelled example ${i + 1} as <b>${lbl(set[i].y)}</b>: its words now count toward ${lbl(set[i].y)} and the priors shift (${cur.m.cls.map(c => `P(${lbl(c)}) = ${cur.m.n[c]}/${cur.m.N}`).join(', ')}).`));
        break;
      }
      case 'del-train': {
        const i = +b.dataset.i; set.splice(i, 1);
        const cur = analyze();
        setMsg('train', explainChange(prev, cur, `Removed training example ${i + 1}.`));
        break;
      }
      case 'default-train': {
        state.train[key()] = null;
        const cur = analyze();
        setMsg('train', explainChange(prev, cur, 'Restored the default 10 training examples.'));
        break;
      }
      default: return;
    }
    snap = analyze();
    update();
  }

  function stepMsg() {
    setMsg('step', `Step ${state.step + 1} of ${STEPS.length} — <b>${STEPS[state.step].name}</b>. ${STEP_CAPTIONS[state.step]}`);
  }

  function updateControls(A) {
    const st = ctrlHost.querySelector('#nb-stats');
    if (st) st.textContent = `${A.tokens.length} tokens · |V| = ${A.m.V}`;
    const nav = ctrlHost.querySelector('#nb-stepnav');
    if (nav) {
      nav.hidden = !state.stepMode;
      nav.innerHTML = state.stepMode ? `
        <button class="tfp-btn" data-act="nav" data-k="-1" ${state.step === 0 ? 'disabled' : ''}><i data-lucide="chevron-left"></i>Prev</button>
        <span class="tfp-stepnav-lbl">Step ${state.step + 1}/${STEPS.length} · <b>${STEPS[state.step].name}</b></span>
        ${state.step < STEPS.length - 1 ? '<button class="tfp-btn primary" data-act="nav" data-k="1">Next Step<i data-lucide="chevron-right"></i></button>'
          : '<button class="tfp-btn primary" data-act="nav" data-k="done"><i data-lucide="check"></i>Finish</button>'}` : '';
    }
    const av = ctrlHost.querySelector('#nb-alpha-v');
    if (av) av.textContent = state.alpha.toFixed(1);
    ctrlHost.querySelectorAll('[data-act="alpha"]').forEach(x => x.classList.toggle('on', +x.dataset.k === state.alpha));

    // live likelihood formula for the selected (or most decisive) word
    const calc = ctrlHost.querySelector('#nb-calc');
    if (calc) {
      const known = A.ev.filter(e => e.known);
      const sel = known.find(e => e.w === state.selected) || known.slice().sort((x, y) => Math.abs(y.lr) - Math.abs(x.lr))[0];
      const m = A.m, [c1, c2] = m.cls;
      calc.innerHTML = sel ? `
        <div class="tfp-hint">For ${q(sel.w)} ${state.selected === sel.w ? '(selected)' : '(most decisive word — click any word to change)'}:</div>
        ${[c1, c2].map(c => `<div class="tfp-calc-line ${m.lik(sel.w, c) === 0 ? 'zero' : ''}"><span class="tfp-calc-k">P̂(w|${lbl(c)})</span><span>= (${m.cnt(sel.w, c)} + ${m.alpha.toFixed(1)}) / (${m.total[c]} + ${m.alpha.toFixed(1)}×${m.V}) = <b>${f4(m.lik(sel.w, c))}</b></span></div>`).join('')}
        <div class="tfp-calc-line total"><span class="tfp-calc-k">log ratio</span><span>log P̂(w|${lbl(c1)}) − log P̂(w|${lbl(c2)}) = <b>${fl(sel.lr)}</b> → ${sel.lr > 0 ? `favours ${lbl(c1)}` : sel.lr < 0 ? `favours ${lbl(c2)}` : 'neutral'}</span></div>`
        : '<div class="tfp-hint">No word of the message appears in the training vocabulary.</div>';
    }

    const tr = ctrlHost.querySelector('#nb-train');
    if (tr) {
      const set = trainSet();
      tr.innerHTML = set.length ? set.map((e, i) => `<div class="nb-train-row"><button class="nb-lbl ${e.y}" data-act="flip" data-i="${i}" title="click to relabel">${lbl(e.y)}</button><span class="nb-train-t" lang="${state.lang}">${esc(e.t)}</span><button class="tfp-doc-x" data-act="del-train" data-i="${i}" aria-label="remove">×</button></div>`).join('')
        : '<div class="tfp-hint">No training data — every class has prior 0 and nothing can be classified.</div>';
    }
    const nt = ctrlHost.querySelector('#nb-ntrain');
    if (nt) nt.textContent = A.m.cls.map(c => `${lbl(c)} ${A.m.n[c]}`).join(' · ');
    const nl = ctrlHost.querySelector('#nb-newlabel');
    if (nl) { nl.className = `nb-lbl ${state.newLabel}`; nl.textContent = lbl(state.newLabel); }
    const al = ctrlHost.querySelector('#nb-astrain-lbl');
    if (al) al.textContent = lbl(state.newLabel);
    icons();
  }

  // ===========================================================================
  // Visual pieces
  // ===========================================================================
  function card(title, sub, body, cls) {
    return `<section class="tfp-card ${cls || ''}"><header class="tfp-card-head"><h4>${title}</h4>${sub ? `<span class="tfp-card-sub">${sub}</span>` : ''}</header>${body}</section>`;
  }

  function verdictCard(A, R, title) {
    const m = A.m, [c1, c2] = m.cls;
    if (!m.N) return card(title || 'Decision', '', '<span class="tfp-empty">No training data.</span>');
    const p1 = R.post ? R.post[c1] : null;
    const body = R.win ? `
      <div class="nb-verdict"><span class="nb-lbl big ${R.win}">${lbl(R.win)}</span><span class="nb-verdict-p">${pc(R.post[R.win])}</span><span class="tfp-sub">P(${lbl(R.win)} | message)</span></div>
      <div class="nb-split"><span class="${c1}" style="width:${(p1 * 100).toFixed(1)}%">${p1 > 0.12 ? `${lbl(c1)} ${pc(p1)}` : ''}</span><span class="${c2}" style="width:${((1 - p1) * 100).toFixed(1)}%">${1 - p1 > 0.12 ? `${lbl(c2)} ${pc(1 - p1)}` : ''}</span></div>
      <div class="tfp-mono">score(${lbl(c1)}) = ${fl(R.score[c1])} · score(${lbl(c2)}) = ${fl(R.score[c2])} → argmax = ${lbl(R.win)}</div>`
      : `<div class="nb-verdict"><span class="nb-lbl big none">Undecidable</span></div>
      <div class="tfp-warn">Both classes have probability 0: ${m.cls.map(c => `${q(R.killer[c] || '?')} never appears in ${lbl(c)}`).join(' and ')}. With α = 0 there is no way to compare them — this is why Laplace smoothing exists.</div>`;
    return card(title || 'Decision (MAP)', R.unknown.length ? `${R.unknown.length} unseen word${R.unknown.length > 1 ? 's' : ''} skipped` : '', body);
  }

  function evidenceText(A) {
    if (!state.text.trim()) return '<span class="tfp-empty">Type a message…</span>';
    const evBy = {}; A.ev.forEach(e => { evBy[e.w] = e; });
    const maxLr = Math.max(0.5, ...A.ev.filter(e => e.known && isFinite(e.lr)).map(e => Math.abs(e.lr)));
    const [c1, c2] = A.m.cls;
    let html = '', pos = 0;
    A.pieces.forEach(p => {
      html += esc(state.text.slice(pos, p.start));
      const e = evBy[p.word];
      if (!p.kept) html += `<span class="tfp-w drop">${esc(p.raw)}</span>`;
      else if (!e || !e.known) html += `<span class="nb-w unk" data-w="${esc(p.word)}" title="not in training vocabulary — skipped">${esc(p.raw)}</span>`;
      else {
        const a = isFinite(e.lr) ? Math.min(1, Math.abs(e.lr) / maxLr) : 1;
        const c = e.lr > 0 ? c1 : e.lr < 0 ? c2 : 'neu';
        html += `<span class="nb-w ${c} ${p.word === state.selected ? 'sel' : ''}" style="--a:${(0.15 + a * 0.6).toFixed(2)}" data-w="${esc(p.word)}">${esc(p.raw)}</span>`;
      }
      pos = p.end;
    });
    return `<div class="tfp-src nb-src">${html}${esc(state.text.slice(pos))}</div>
      <div class="evo-legend"><span><i class="nb-dot ${c1}"></i>evidence for ${lbl(c1)}</span><span><i class="nb-dot ${c2}"></i>evidence for ${lbl(c2)}</span><span><i class="nb-dot unk"></i>unseen → skipped</span></div>`;
  }

  function evidenceTable(A) {
    const m = A.m, [c1, c2] = m.cls;
    if (!A.ev.length) return '<span class="tfp-empty">No tokens.</span>';
    const fin = A.ev.filter(e => e.known && isFinite(e.lr)).map(e => Math.abs(e.lr));
    const maxLr = Math.max(0.5, ...fin);
    const rows = A.ev.map(e => {
      if (!e.known) return `<tr class="unk" data-w="${esc(e.w)}"><td class="t">${esc(e.w)}${e.k > 1 ? ` <small>×${e.k}</small>` : ''}</td><td colspan="5" class="nb-skip">not in training vocabulary → skipped</td></tr>`;
      const w = isFinite(e.lr) ? Math.abs(e.lr) / maxLr * 50 : 50;
      const bar = e.lr >= 0 ? `<span class="nb-div-bar ${c1}" style="left:50%;width:${w}%"></span>` : `<span class="nb-div-bar ${c2}" style="left:${50 - w}%;width:${w}%"></span>`;
      return `<tr class="${e.w === state.selected ? 'sel' : ''}" data-w="${esc(e.w)}">
        <td class="t">${esc(e.w)}${e.k > 1 ? ` <small>×${e.k}</small>` : ''}</td>
        <td>${e.n1}</td><td>${e.n2}</td>
        <td class="${e.p1 === 0 ? 'zero' : ''}">${f4(e.p1)}</td><td class="${e.p2 === 0 ? 'zero' : ''}">${f4(e.p2)}</td>
        <td class="nb-div"><span class="nb-div-track">${bar}<span class="nb-div-mid"></span></span><b>${e.lr > 0 ? '+' : ''}${fl(e.lr)}</b></td></tr>`;
    }).join('');
    return `<div class="tfp-table-wrap"><table class="tfp-table nb-table">
      <thead><tr><th>word</th><th>count|${lbl(c1)}</th><th>count|${lbl(c2)}</th><th>P̂(w|${lbl(c1)})</th><th>P̂(w|${lbl(c2)})</th><th class="nb-div-h">← ${lbl(c2)} · log ratio · ${lbl(c1)} →</th></tr></thead>
      <tbody>${rows}</tbody></table></div>`;
  }

  function raceChart(A, R) {
    const m = A.m, [c1, c2] = m.cls;
    const steps = R.known.length + 1;
    const all = [...R.run[c1], ...R.run[c2]].filter(isFinite);
    if (!all.length) return '<span class="tfp-empty">Both scores are −∞ from the start.</span>';
    const W = 420, H = 170, L = 38, Rt = 10, T = 12, B = 34;
    const lo = Math.min(...all) - 0.5, hi = Math.max(...all) + 0.3;
    const X = i => L + (steps === 1 ? 0 : i * (W - L - Rt) / (steps - 1));
    const Y = v => (isFinite(v) ? T + (hi - v) / (hi - lo) * (H - T - B) : H - B + 8);
    const line = c => {
      const pts = R.run[c].map((v, i) => ({ i, v }));
      const fin = pts.filter(p => isFinite(p.v));
      let out = `<polyline points="${fin.map(p => `${X(p.i).toFixed(1)},${Y(p.v).toFixed(1)}`).join(' ')}" class="nb-race ${c}"/>`;
      const dead = pts.find(p => !isFinite(p.v));
      if (dead) {
        const last = fin[fin.length - 1];
        if (last) out += `<line x1="${X(last.i)}" y1="${Y(last.v)}" x2="${X(dead.i)}" y2="${H - B + 4}" class="nb-race ${c} dead"/>`;
        out += `<text x="${X(dead.i)}" y="${H - B + 4}" class="nb-race-x ${c}" text-anchor="middle">✗ −∞</text>`;
      }
      fin.forEach(p => { out += `<circle cx="${X(p.i)}" cy="${Y(p.v)}" r="3.2" class="nb-race-pt ${c}"/>`; });
      return out;
    };
    const ticks = [];
    const step = (hi - lo) > 12 ? 4 : (hi - lo) > 5 ? 2 : 1;
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) ticks.push(v);
    const labels = ['prior', ...R.known].map((w, i) => `<text x="${X(i)}" y="${H - 14}" text-anchor="middle" class="nb-race-lbl ${w === state.selected ? 'sel' : ''}" ${i ? `data-w="${esc(w)}"` : ''}>${esc(w.length > 9 ? w.slice(0, 8) + '…' : w)}</text>`).join('');
    return `<svg class="nb-race-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="running log scores">
      ${ticks.map(v => `<line x1="${L}" x2="${W - Rt}" y1="${Y(v)}" y2="${Y(v)}" class="nb-grid"/><text x="${L - 5}" y="${Y(v) + 3}" text-anchor="end" class="evo-svg-ax">${v}</text>`).join('')}
      ${line(c2)}${line(c1)}${labels}</svg>
      <div class="evo-legend"><span><i class="nb-dot ${c1}"></i>${lbl(c1)}: ${fl(R.score[c1])}</span><span><i class="nb-dot ${c2}"></i>${lbl(c2)}: ${fl(R.score[c2])}</span><span>each step adds log P̂(word | class) — always ≤ 0</span></div>`;
  }

  function trainingSummary(A) {
    const m = A.m;
    const top = c => Object.entries(m.counts[c]).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 6);
    const maxC = Math.max(1, ...m.cls.flatMap(c => top(c).map(x => x[1])));
    return `<div class="nb-priors">${m.cls.map(c => `
        <div class="nb-prior"><div class="nb-prior-h"><span class="nb-lbl ${c}">${lbl(c)}</span><span>P(${lbl(c)}) = ${m.n[c]}/${m.N} = <b>${m.N ? (m.n[c] / m.N).toFixed(2) : '—'}</b></span></div>
          <div class="tfp-sub">${m.total[c]} word tokens</div>
          ${top(c).map(([w, n]) => `<div class="evo-wbar"><span class="evo-wbar-l" lang="${state.lang}">${esc(w)}</span><span class="evo-wbar-t"><span class="nb-bg-${c}" style="width:${n / maxC * 100}%"></span></span><span class="evo-wbar-v">${n}</span></div>`).join('')}
        </div>`).join('')}</div>
      <div class="tfp-mono">|V| = ${m.V} distinct training words · N = ${m.N} examples</div>`;
  }

  // ---- Laplace view ----
  function laplaceView(A) {
    const m = A.m, [c1, c2] = m.cls;
    const R0 = A.R0, RS = A.RS, ra = A.refA, raS = ra.toFixed(1);
    const side = `<div class="nb-side">
      <div class="nb-side-c ${R0.win ? '' : 'bad'}"><div class="tfp-lbl">Without smoothing · α = 0</div>${miniVerdict(A, R0)}</div>
      <div class="nb-side-c good"><div class="tfp-lbl">With smoothing · α = ${raS}${state.alpha === 0 ? ' (Add-1 reference)' : ''}</div>${miniVerdict(A, RS)}</div></div>`;
    const known = A.ev.filter(e => e.known);
    const rows = known.map(e => {
      const z1 = e.n1 === 0, z2 = e.n2 === 0;
      const mle1 = m.total[c1] ? e.n1 / m.total[c1] : 0, mle2 = m.total[c2] ? e.n2 / m.total[c2] : 0;
      return `<tr class="${e.w === state.selected ? 'sel' : ''}" data-w="${esc(e.w)}"><td class="t">${esc(e.w)}</td>
        <td>${e.n1}</td><td class="${z1 ? 'zero' : ''}">${f4(mle1)}</td><td class="${z1 ? 'fixed' : ''}">${f4(m.lik(e.w, c1, ra))}</td>
        <td>${e.n2}</td><td class="${z2 ? 'zero' : ''}">${f4(mle2)}</td><td class="${z2 ? 'fixed' : ''}">${f4(m.lik(e.w, c2, ra))}</td></tr>`;
    }).join('');
    const nz = known.filter(e => e.n1 === 0 || e.n2 === 0).length;
    const table = known.length ? `<div class="tfp-table-wrap"><table class="tfp-table nb-table nb-zt">
      <thead><tr><th rowspan="2">word</th><th colspan="3">${lbl(c1)}</th><th colspan="3">${lbl(c2)}</th></tr>
      <tr><th>count</th><th>α = 0</th><th>α = ${raS}</th><th>count</th><th>α = 0</th><th>α = ${raS}</th></tr></thead>
      <tbody>${rows}</tbody></table></div>
      <div class="tfp-hint">${nz ? `<b>${nz}</b> word${nz > 1 ? 's have' : ' has'} a zero count in one class (red). Unsmoothed, a single red cell multiplies that whole class to 0; smoothing (green) replaces it with a small positive probability.` : 'No zero counts in this message — try the “Tricky” preset or type a word that only appears in one class.'}</div>`
      : '<span class="tfp-empty">No known words in the message.</span>';
    const mass = m.cls.map(c => {
      const seen = Object.keys(m.counts[c]).length, unseen = m.V - seen;
      const share = (m.total[c] + ra * m.V) > 0 ? (ra * unseen) / (m.total[c] + ra * m.V) : 0;
      return `<div class="nb-mass"><span class="nb-lbl ${c}">${lbl(c)}</span>
        <span class="nb-mass-bar"><span class="seen nb-bg-${c}" style="width:${((1 - share) * 100).toFixed(1)}%"></span><span class="unseen" style="width:${(share * 100).toFixed(1)}%"></span></span>
        <span class="nb-mass-v">${(share * 100).toFixed(1)}%</span></div>
        <div class="tfp-sub nb-mass-s">${unseen} of |V| = ${m.V} words never appear in ${lbl(c)}; at α = ${raS} together they receive ${raS}·${unseen} / (${m.total[c]} + ${raS}·${m.V}) of the probability.</div>`;
    }).join('');
    return side + card('Zero-trap detector', 'P̂(w | c) without vs. with smoothing', table) +
      card('Where smoothing moves probability', 'share given to words never seen in that class', mass + `<div class="tfp-mono">α = 0 → 0% · α = 1 (Add-1) · α → ∞ → every word equally likely (1/|V|)</div>`);
  }
  function miniVerdict(A, R) {
    const [c1, c2] = A.m.cls;
    if (!R.win) return `<div class="nb-verdict"><span class="nb-lbl big none">Undecidable</span></div><div class="tfp-sub">${A.m.cls.map(c => `${lbl(c)}: ${R.killer[c] ? `0 (because of “${esc(R.killer[c])}”)` : fl(R.score[c])}`).join('<br>')}</div>`;
    const p1 = R.post[c1];
    return `<div class="nb-verdict"><span class="nb-lbl big ${R.win}">${lbl(R.win)}</span><span class="nb-verdict-p">${pc(R.post[R.win])}</span></div>
      <div class="nb-split thin"><span class="${c1}" style="width:${(p1 * 100).toFixed(1)}%"></span><span class="${c2}" style="width:${((1 - p1) * 100).toFixed(1)}%"></span></div>
      <div class="tfp-sub">${A.m.cls.map(c => `${lbl(c)}: ${R.killer[c] ? `<b class="nb-zero">0</b> (because of “${esc(R.killer[c])}”)` : `score ${fl(R.score[c])}`}`).join(' · ')}</div>`;
  }

  // ---- Step-by-step ----
  function stepsView(A) {
    const k = state.step, m = A.m, [c1, c2] = m.cls, R = A.R;
    const sums = [`N = ${m.N}`, m.cls.map(c => (m.N ? (m.n[c] / m.N).toFixed(2) : '—')).join(' / '), `|V| = ${m.V}`, `α = ${m.alpha.toFixed(1)}`, m.cls.map(c => fl(R.score[c])).join(' / '), R.win ? lbl(R.win) : '?'];
    const pipe = `<div class="tfp-pipe">${STEPS.map((s, i) => `<button class="tfp-pipe-step ${i < k ? 'done' : ''} ${i === k ? 'cur' : ''}" data-step="${i}"><span class="tfp-pipe-n">${i + 1}</span><span class="tfp-pipe-name">${s.name}</span><span class="tfp-pipe-sum">${i <= k ? sums[i] : ''}</span></button>${i < STEPS.length - 1 ? '<span class="tfp-pipe-arrow">→</span>' : ''}`).join('')}</div>`;
    let body = '';
    const set = trainSet();
    switch (k) {
      case 0:
        body = `<div class="nb-steptrain">${m.cls.map(c => `<div><div class="tfp-lbl"><span class="nb-lbl ${c}">${lbl(c)}</span> ${m.n[c]} examples</div>${set.filter(e => e.y === c).map(e => `<div class="nb-ex" lang="${state.lang}">${esc(e.t)}</div>`).join('')}</div>`).join('')}</div>
          <p class="tfp-p">Every example is a pair ⟨text, label⟩. The model will only ever know what these ${m.N} examples contain.</p>`;
        break;
      case 1:
        body = `<div class="nb-priors">${m.cls.map(c => `<div class="nb-prior"><div class="nb-prior-h"><span class="nb-lbl ${c}">${lbl(c)}</span><span>P(${lbl(c)}) = ${m.n[c]}/${m.N} = <b>${m.N ? (m.n[c] / m.N).toFixed(2) : '—'}</b></span></div>
          <div class="evo-meter"><span class="nb-bg-${c}" style="width:${m.N ? m.n[c] / m.N * 100 : 0}%"></span></div><div class="tfp-sub">log P(${lbl(c)}) = ${m.n[c] ? fl(Math.log(m.n[c] / m.N)) : '−∞'}</div></div>`).join('')}</div>
          <p class="tfp-p">Before reading the message, the model's belief is just the class frequency. Add or relabel training examples to move it.</p>`;
        break;
      case 2:
        body = `<div class="tfp-table-wrap"><table class="tfp-table nb-table"><thead><tr><th>message word</th><th>count|${lbl(c1)}</th><th>count|${lbl(c2)}</th></tr></thead><tbody>
          ${A.ev.map(e => `<tr class="${e.known ? '' : 'unk'}" data-w="${esc(e.w)}"><td class="t">${esc(e.w)}</td><td class="${e.known && !e.n1 ? 'zero' : ''}">${e.known ? e.n1 : '—'}</td><td class="${e.known && !e.n2 ? 'zero' : ''}">${e.known ? e.n2 : '—'}</td></tr>`).join('')}
          <tr class="sel"><td class="t">total words Σ count(w′, c)</td><td>${m.total[c1]}</td><td>${m.total[c2]}</td></tr></tbody></table></div>
          <p class="tfp-p">|V| = <b>${m.V}</b> distinct words appear in training. ${A.R.unknown.length ? `${A.R.unknown.length} message word${A.R.unknown.length > 1 ? 's' : ''} (—) never appeared, so ${A.R.unknown.length > 1 ? 'they are' : 'it is'} skipped. ` : ''}Red zeros are where the zero-probability trap can strike.</p>`;
        break;
      case 3:
        body = evidenceTable(A) + `<div class="tfp-mono">P̂(w|c) = (count(w,c) + ${m.alpha.toFixed(1)}) / (Σcount(·,c) + ${m.alpha.toFixed(1)}×${m.V})</div>
          <p class="tfp-p">The log ratio shows each word's vote: positive favours ${lbl(c1)}, negative favours ${lbl(c2)}. ${m.alpha === 0 ? '<b>α = 0</b>: zero counts become zero probabilities.' : 'Smoothing keeps every probability above 0.'}</p>`;
        break;
      case 4:
        body = raceChart(A, R) + `<div class="tfp-mono">score(c) = log P(c) + Σ log P̂(xᵢ|c)<br>${m.cls.map(c => `${lbl(c)}: ${fl(R.run[c][0])} ${R.terms[c].map(t => `${t.lp === -Infinity ? '− ∞' : '− ' + Math.abs(t.lp).toFixed(2)}`).join(' ')} = <b>${fl(R.score[c])}</b>`).join('<br>')}</div>
          <p class="tfp-p">Multiplying ${R.known.length + 1} probabilities gives tiny numbers (here ${m.cls.map(c => `${lbl(c)} ≈ ${sci(Math.exp(R.score[c]))}`).join(', ')}); long emails would underflow to 0, so we add logs instead.</p>`;
        break;
      case 5:
        body = verdictCard(A, R, 'MAP decision') + `<p class="tfp-p">${R.win ? `c* = argmax = <b>${lbl(R.win)}</b>. Normalising: P(${lbl(c1)}|x) = e^${fl(R.score[c1])} / (e^${fl(R.score[c1])} + e^${fl(R.score[c2])}) = <b>${pc(R.post[c1])}</b>.` : 'No class has a positive probability — smoothing (α > 0) is needed.'} The model is “naive” because it treats every word as independent given the class.</p>`;
        break;
    }
    const nav = `<div class="tfp-row end"><button class="tfp-btn" data-go="-1" ${k === 0 ? 'disabled' : ''}>← Prev</button>${k < STEPS.length - 1 ? '<button class="tfp-btn primary" data-go="1">Next Step →</button>' : '<button class="tfp-btn primary" data-go="done">✓ Finish — free play</button>'}</div>`;
    return pipe + card(`Step ${k + 1} · ${STEPS[k].name}`, '', body + nav, 'tfp-stepcard');
  }

  // ===========================================================================
  // Render
  // ===========================================================================
  function update() {
    if (!vizHost || !document.body.contains(vizHost)) return;
    const A = analyze();
    const my = state.lang === 'my';
    const title = state.stepMode ? 'Step-by-Step: How Naive Bayes Decides' : mode === 'map' ? 'Naive Bayes · MAP classification' : 'Laplace Smoothing · zero-probability trap';
    const top = vizHost.scrollTop;
    let main;
    if (state.stepMode) main = stepsView(A);
    else if (mode === 'map') {
      main = verdictCard(A, A.R) +
        card('Message evidence', 'click a word', evidenceText(A)) +
        card('Score race: log P(c) + Σ log P̂(w|c)', 'one step per known word', raceChart(A, A.R)) +
        card('Word evidence', 'α = ' + state.alpha.toFixed(1), evidenceTable(A)) +
        card('What the model learned', `${TASKS[state.task].name} · ${LANG_LABEL[state.lang]}`, trainingSummary(A));
    } else {
      main = card('Message evidence', 'click a word', evidenceText(A)) + laplaceView(A);
    }
    vizHost.innerHTML = `<div class="nb-viz ${my ? 'tfp-my' : ''}" lang="${state.lang}">
      <div class="tfp-viz-head"><h3>${title}</h3>
        <span class="tfp-stat-chips"><span>${TASKS[state.task].name}</span><span>${LANG_LABEL[state.lang]}</span><span>α ${state.alpha.toFixed(1)}</span></span></div>
      ${msgHTML()}
      ${main}
      <div class="tfp-foot"><i data-lucide="arrow-right-circle"></i> Next concept: <b>Evaluation</b> — measuring how often decisions like these are right (confusion matrix, precision, recall).</div>
    </div>`;
    vizHost.scrollTop = top;
    updateControls(A);
  }

  function onVizClick(e) {
    if (!vizHost.querySelector('.nb-viz')) return;
    const go = e.target.closest('[data-go]');
    if (go) {
      if (go.dataset.go === 'done') { state.stepMode = false; setMsg('info', 'Back to free play.'); buildControls(); update(); return; }
      state.step = Math.max(0, Math.min(STEPS.length - 1, state.step + +go.dataset.go)); stepMsg(); update(); return;
    }
    const st = e.target.closest('[data-step]');
    if (st) { state.step = +st.dataset.step; stepMsg(); update(); return; }
    const w = e.target.closest('[data-w]');
    if (w) {
      const A = analyze();
      const ev = A.ev.find(x => x.w === w.dataset.w);
      state.selected = state.selected === w.dataset.w ? null : w.dataset.w;
      if (state.selected && ev) {
        const [c1, c2] = A.m.cls;
        if (!ev.known) setMsg('select', `${q(ev.w)} never appears in the training data, so it is not in the vocabulary V and is skipped — it adds no evidence for either class.`);
        else setMsg(ev.p1 === 0 || ev.p2 === 0 ? 'warn' : 'select', `${q(ev.w)}: count ${ev.n1} in ${lbl(c1)}, ${ev.n2} in ${lbl(c2)} → P̂ = ${f4(ev.p1)} vs ${f4(ev.p2)}; log ratio ${fl(ev.lr)} ${ev.lr > 0 ? `→ evidence for ${lbl(c1)}` : ev.lr < 0 ? `→ evidence for ${lbl(c2)}` : '(neutral)'}${ev.k > 1 ? `, counted ${ev.k}× because it repeats` : ''}.${ev.p1 === 0 || ev.p2 === 0 ? ' A probability of 0 here vetoes the whole class!' : ''}`);
      } else setMsg('info', 'Selection cleared.');
      update();
    }
  }

  function render(col, m) {
    mode = m === 'laplace' ? 'laplace' : 'map';
    vizHost = col;
    ctrlHost = document.getElementById('lr-concept-lab');
    if (!ctrlHost) {
      col.innerHTML = '';
      ctrlHost = document.createElement('div'); col.appendChild(ctrlHost);
      vizHost = document.createElement('div'); col.appendChild(vizHost);
    }
    vizHost.onclick = onVizClick;
    if (state.msg && state.msg.kind === 'select') state.msg = null;
    if (mode === 'laplace' && !state.msg) setMsg('info', 'Drag α to 0 (or press “α = 0”) and load the “Tricky” preset: one word that never appeared in a class wipes that class out.');
    buildControls(); resnap(); update();
  }

  window.NaiveBayesLab = { render, _state: state, _analyze: analyze };
})();
