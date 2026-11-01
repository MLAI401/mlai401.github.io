/**
 * text_features_lab.js — Topic 06 · Concept 1 · Interactive Text Features
 * Playground (Bag-of-Words & TF-IDF) for learning.html.
 *
 * Teaches a SHARED FEATURE SPACE suitable for classification:
 *   training collection → preprocessing → fixed vocabulary → document counts
 *   → aligned feature vectors → (optional) TF-IDF → transform a new message.
 *
 *   - Training documents d₁…d_N (editable) are the ONLY source of the
 *     vocabulary V, the document frequencies DF and the IDF weights.
 *   - The test message is a separate, new text. It is transformed into the
 *     same |V|-dimensional space; words outside V are flagged
 *     “outside training vocabulary — ignored”. Editing the test message
 *     never changes V, DF or IDF.
 *
 * Layout (same pattern as the other Topic 06 labs):
 *   - Concept column (#lr-concept-lab): test message (presets, text box,
 *     Reset, Step-by-Step), selected word / live TF-IDF calculation, and the
 *     editable training collection.
 *   - Illustration column: fixed vocabulary, highlighted test message,
 *     aligned feature vectors (full or non-zero view), document–term matrix,
 *     learned IDF table, TF-IDF of the test message, BoW vs TF-IDF, and the
 *     7-stage step-by-step pipeline.
 *
 * Formulas (match topic06_reading.html and python_sandbox):
 *   tokenize : lowercase · strip punctuation · drop 1-character tokens (EN)
 *   V        : sorted unique tokens of the non-empty training documents
 *   x[i](d)  = count(V[i], d)                       (0 when absent)
 *   |d|      = number of in-vocabulary tokens of d  (unknown words excluded)
 *   TF(t, d) = count(t, d) / |d|
 *   DF(t)    = # training documents containing t;  N = # training documents
 *   IDF(t)   = ln(N / DF(t))                        (learned once, reused)
 *   TF-IDF   = TF × IDF
 *
 * Exposes window.TextFeaturesLab = { render(col, mode), _state, _analyze, _train }
 * with mode 'bow' | 'tfidf'.
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Data
  // ---------------------------------------------------------------------------
  // Test-message presets (new texts — never part of training).
  const PRESETS_EN = [
    { key: 'spam', label: 'Spam', icon: 'alert-triangle',
      text: 'WIN the FREE prize! Click the link now to claim the free cash prize. Free entry for the first 100 winners.' },
    { key: 'email', label: 'Normal Email', icon: 'mail',
      text: 'Hi team, the project meeting is moved to Thursday at 10am. Please review the report before the meeting and send your comments.' },
    { key: 'pos', label: 'Positive Review', icon: 'thumbs-up',
      text: 'Absolutely loved this phone! The battery is amazing, the camera is amazing, and the screen is bright. Great value, highly recommend.' },
    { key: 'neg', label: 'Negative Review', icon: 'thumbs-down',
      text: 'Terrible laptop. The battery died after a week, the keyboard broke, and the support was useless. Waste of money, do not buy.' }
  ];

  // Training collection. "the" appears in most documents on purpose, so
  // students can watch a frequent word lose its weight under TF-IDF.
  const CORPUS_EN = [
    'The team meeting is moved to Friday morning',
    'Please review the report and send the slides',
    'Win a free trip, click the link now',
    'The food was great and the service was friendly',
    'This movie was boring and far too long',
    'Claim your free cash prize today',
    'The phone battery is amazing and the camera is great',
    'The laptop broke after a week, waste of money'
  ];

  // Burmese (မြန်မာ) — pre-segmented: each space marks a word boundary.
  const PRESETS_MY = [
    { key: 'spam', label: 'Spam', icon: 'alert-triangle',
      text: 'ယနေ့ ပဲ အခမဲ့ ဆု ကို ရယူ ပါ ။ လင့်ခ် ကို နှိပ် ပြီး အခမဲ့ ငွေ ဆု ကို ရယူ ပါ ။ အခမဲ့ ဝင်ခွင့် ပထမဆုံး ၁၀၀ ဦး အတွက် သာ ။' },
    { key: 'email', label: 'Normal Email', icon: 'mail',
      text: 'အဖွဲ့ဝင် များ ခင်ဗျာ ၊ ပရောဂျက် အစည်းအဝေး ကို ကြာသပတေး နေ့ မနက် ၁၀ နာရီ သို့ ရွှေ့ ထား ပါ တယ် ။ အစည်းအဝေး မတိုင်မီ အစီရင်ခံစာ ကို ဖတ် ပြီး မှတ်ချက် များ ပို့ ပေး ပါ ။' },
    { key: 'pos', label: 'Positive Review', icon: 'thumbs-up',
      text: 'ဒီ ဖုန်း ကို အရမ်း ကြိုက် တယ် ။ ဘက်ထရီ က အရမ်း ကောင်း တယ် ၊ ကင်မရာ လည်း အရမ်း ကောင်း တယ် ၊ မျက်နှာပြင် က တောက်ပ တယ် ။ တန်ဖိုး ရှိ တယ် ၊ အကြံပြု ပါ တယ် ။' },
    { key: 'neg', label: 'Negative Review', icon: 'thumbs-down',
      text: 'အဆိုးဆုံး လက်ပ်တော့ ပါ ။ ဘက်ထရီ က တစ်ပတ် အတွင်း ပျက် သွား တယ် ၊ ကီးဘုတ် လည်း ကျိုး သွား တယ် ၊ ဝန်ဆောင်မှု က လည်း အသုံး မဝင် ဘူး ။ ပိုက်ဆံ အလဟဿ ပဲ ၊ မ ဝယ် ပါ နဲ့ ။' }
  ];
  const CORPUS_MY = [
    'အဖွဲ့ အစည်းအဝေး ကို သောကြာ နေ့ မနက် သို့ ရွှေ့ ထား ပါ တယ်',
    'အစီရင်ခံစာ ကို ဖတ် ပြီး ဆလိုက် များ ပို့ ပေး ပါ',
    'အခမဲ့ ခရီးစဉ် ရယူ ရန် လင့်ခ် ကို ယခု နှိပ် ပါ',
    'အစားအစာ က ကောင်း ပြီး ဝန်ဆောင်မှု က ဖော်ရွေ ပါ တယ်',
    'ဒီ ရုပ်ရှင် က ပျင်း စရာ ကောင်း ပြီး ရှည် လွန်း တယ်',
    'ယနေ့ အခမဲ့ ငွေ ဆု ကို ရယူ ပါ',
    'ဖုန်း ဘက်ထရီ အရမ်း ကောင်း ပြီး ကင်မရာ လည်း ကောင်း တယ်',
    'လက်ပ်တော့ တစ်ပတ် အတွင်း ပျက် သွား တယ် ၊ ပိုက်ဆံ အလဟဿ ပဲ'
  ];

  const LANGS = {
    en: { label: 'English', presets: PRESETS_EN, corpus: CORPUS_EN,
      addDoc: w => `another message that mentions ${w}`,
      rules: ['① lowercase', '② strip punctuation', '③ split into words', '④ drop 1-character tokens (e.g. “a”, “I”)'],
      sameMsg: 'Only punctuation, capitalisation, spacing or 1-letter words changed. Preprocessing removes all of these, so the <b>feature vector is identical</b>.' },
    my: { label: 'မြန်မာ', presets: PRESETS_MY, corpus: CORPUS_MY,
      addDoc: w => `${w} အကြောင်း ပြော ထား သော နောက် စာ တစ် စောင်`,
      rules: ['① split on spaces (word boundaries)', '② strip punctuation ။ ၊', '③ no lowercasing — Burmese has no capital letters', '④ keep every token, including 1-character words'],
      sameMsg: 'Only punctuation (။ ၊) or extra spacing changed. Preprocessing removes punctuation, so the <b>feature vector is identical</b>.' }
  };
  let PRESETS = PRESETS_EN;
  let DEFAULT_CORPUS = CORPUS_EN;
  const savedByLang = {};

  const STEPS = [
    { key: 'collection', name: 'Training Collection', phase: 'train' },
    { key: 'prep', name: 'Preprocessing', phase: 'train' },
    { key: 'vocab', name: 'Fixed Vocabulary', phase: 'train' },
    { key: 'counts', name: 'Document Counts', phase: 'train' },
    { key: 'aligned', name: 'Aligned Vectors', phase: 'train' },
    { key: 'tfidf', name: 'TF-IDF (optional)', phase: 'train' },
    { key: 'transform', name: 'Transform New Message', phase: 'test' }
  ];
  const STEP_CAPTIONS = [
    'Features are learned from a collection of training documents. The test message is not part of it.',
    'Apply the same preprocessing rules to every training document to turn strings into tokens.',
    'Collect the unique training tokens and sort them alphabetically. Each word owns one fixed slot (index).',
    'Count how often each vocabulary word occurs in each training document. Repeated words get bigger counts.',
    'Write every document’s counts in vocabulary order. Every vector has the same |V| dimensions; absent words are 0.',
    'Optionally re-weight counts: DF and IDF are learned from the training documents once, then frozen.',
    'A new message reuses the same preprocessing, vocabulary and IDF. Unknown words are ignored; V and IDF never change.'
  ];

  const REP_COLORS = 6;

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const state = {
    lang: 'en',
    preset: 'spam',
    text: PRESETS[0].text,
    corpus: DEFAULT_CORPUS.slice(),
    selected: null,
    stepMode: false,
    step: 0,
    tfView: 'weights',
    vecView: 'full',
    msg: null
  };

  let mode = 'bow';
  let ctrlHost = null;
  let vizHost = null;
  let snapshot = null;
  let snapshotText = '';
  let msgTimer = null;

  // ---------------------------------------------------------------------------
  // Text processing — identical for training documents and the test message
  // ---------------------------------------------------------------------------
  function scan(text) {
    const out = [];
    const my = state.lang === 'my';
    const re = my ? /[^\s​၊။.,!?;:"'()\[\]{}\-—…“”‘’]+/gu : /[A-Za-z0-9_]+/g;
    let m;
    while ((m = re.exec(text || ''))) {
      out.push({ raw: m[0], word: m[0].toLowerCase(), start: m.index, end: m.index + m[0].length, kept: my ? true : m[0].length > 1 });
    }
    return out;
  }
  function countsOf(tokens) { const c = {}; tokens.forEach(w => { c[w] = (c[w] || 0) + 1; }); return c; }
  const order = (a, b) => a.localeCompare(b);   // same alphabetical order as the Naive Bayes lab

  // ---------------------------------------------------------------------------
  // Training: vocabulary, DF, IDF — depends ONLY on the training collection
  // ---------------------------------------------------------------------------
  let trainCache = { key: null, T: null };
  function train() {
    const key = state.lang + '\u0002' + state.corpus.join('\u0001');
    if (trainCache.key === key) return trainCache.T;
    const docs = state.corpus.map((text, ci) => {
      const pieces = scan(text);
      const tokens = pieces.filter(p => p.kept).map(p => p.word);
      return { ci, text, pieces, tokens, counts: countsOf(tokens), empty: tokens.length === 0 };
    });
    const active = docs.filter(d => !d.empty);
    active.forEach((d, i) => { d.id = i + 1; });           // d₁…d_N numbering skips empty docs
    const vset = new Set();
    active.forEach(d => d.tokens.forEach(w => vset.add(w)));
    const vocab = [...vset].sort(order);
    const vIndex = {};
    vocab.forEach((w, i) => { vIndex[w] = i; });
    const N = active.length;
    const df = {}, idf = {};
    vocab.forEach(w => { df[w] = active.filter(d => d.counts[w]).length; idf[w] = Math.log(N / df[w]); });
    active.forEach(d => {
      d.len = d.tokens.length;                              // every training token is in V
      d.x = vocab.map(w => d.counts[w] || 0);
      d.tfidf = vocab.map((w, i) => (d.len ? d.x[i] / d.len : 0) * idf[w]);
    });
    const dropped = {};
    docs.forEach(d => d.pieces.forEach(p => { if (!p.kept) dropped[p.word] = (dropped[p.word] || 0) + 1; }));
    const T = { docs, active, N, vocab, vIndex, V: vocab.length, df, idf, dropped,
      sigV: hash(vocab.join('|')), sigIdf: hash(vocab.map(w => idf[w].toFixed(6)).join('|')) };
    trainCache = { key, T };
    return T;
  }
  function hash(s) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h.toString(16).padStart(8, '0').slice(-6); }

  // ---------------------------------------------------------------------------
  // Transform the test message into the fixed feature space
  // ---------------------------------------------------------------------------
  function analyze() {
    const T = train();
    const pieces = scan(state.text);
    const tokens = pieces.filter(p => p.kept).map(p => p.word);
    const all = countsOf(tokens);
    const uniq = Object.keys(all).length;
    const known = tokens.filter(w => T.vIndex[w] !== undefined);
    const len = known.length;                               // |d| = in-vocabulary tokens
    const x = T.vocab.map(w => all[w] || 0);
    const tf = x.map(c => (len ? c / len : 0));
    const tfidf = tf.map((t, i) => t * T.idf[T.vocab[i]]);
    const unknown = Object.keys(all).filter(w => T.vIndex[w] === undefined).map(w => ({ w, n: all[w] }));
    const rows = T.vocab.map((w, i) => ({ w, i, c: x[i], tf: tf[i], df: T.df[w], idf: T.idf[w], tfidf: tfidf[i] })).filter(r => r.c > 0);
    const byWord = {};
    rows.forEach(r => { byWord[r.w] = r; });
    const bowOrder = rows.slice().sort((a, b) => b.c - a.c || order(a.w, b.w));
    const tfOrder = rows.slice().sort((a, b) => b.tfidf - a.tfidf || b.c - a.c || order(a.w, b.w));
    rows.forEach(r => {
      r.bowRank = 1 + rows.filter(o => o.c > r.c).length;
      r.tfRank = 1 + rows.filter(o => o.tfidf > r.tfidf + 1e-9).length;
    });
    const colorOf = {};
    Object.entries(all).filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1] || order(a[0], b[0]))
      .forEach(([w], i) => { colorOf[w] = i % REP_COLORS; });
    return { T, pieces, tokens, all, uniq, len, x, tf, tfidf, unknown, rows, byWord, bowOrder, tfOrder, colorOf,
      vocab: T.vocab, vIndex: T.vIndex, N: T.N,
      maxCount: Math.max(0, ...x), maxTfidf: Math.max(0, ...tfidf) };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  const f3 = x => (Math.abs(x) < 5e-4 ? 0 : x).toFixed(3);
  const f2s = v => (v === 0 ? '0' : f3(v).replace(/^0\./, '.'));
  const q = w => `<b class="tfp-q">“${esc(w)}”</b>`;
  function sub(n) { return String(n).split('').map(d => '₀₁₂₃₄₅₆₇₈₉'[+d]).join(''); }
  function icons() { if (window.lucide) window.lucide.createIcons(); }
  const UNK = 'outside training vocabulary — ignored';

  // Selected word: any vocabulary word or any token of the test message.
  function selectable(A, w) { return !!w && (A.vIndex[w] !== undefined || A.all[w] !== undefined); }
  function effectiveSelection(A) {
    if (selectable(A, state.selected)) return state.selected;
    return A.tfOrder.length ? A.tfOrder[0].w : null;
  }

  function setMsg(kind, html) {
    state.msg = { kind, html };
    const box = vizHost && vizHost.querySelector('#tfp-msg');
    if (box) box.outerHTML = msgHTML();
  }
  function msgHTML() {
    const m = state.msg;
    if (!m) return '<div class="tfp-msg" id="tfp-msg"><span class="tfp-msg-tag">Try it</span><span>Edit the test message and watch the vector: the vocabulary never changes. Edit the training collection to change the vocabulary itself.</span></div>';
    const tag = { text: 'Test message changed', select: 'Word selected', corpus: 'Training changed', preset: 'Preset loaded', step: 'Step', info: 'Note' }[m.kind] || 'What changed';
    return `<div class="tfp-msg tfp-msg-${m.kind}" id="tfp-msg"><span class="tfp-msg-tag">${tag}</span><span>${m.html}</span></div>`;
  }

  // ---------------------------------------------------------------------------
  // "What changed" explanations
  // ---------------------------------------------------------------------------
  function explainText(prev, cur) {
    if (!prev) return;
    const T = cur.T, parts = [];
    T.vocab.forEach((w, i) => {
      const a = prev.x[i], b = cur.x[i];
      if (a !== b) parts.push({ d: Math.abs(b - a), html: `slot x[${i}] ${q(w)}: ${a} → <b>${b}</b>${b > a && b > 1 ? ' (repeated word → bigger count)' : b === 0 ? ' (slot stays, value 0)' : ''}` });
    });
    const prevUnk = new Set(prev.unknown.map(u => u.w));
    cur.unknown.filter(u => !prevUnk.has(u.w)).forEach(u => parts.push({ d: 1e9, html: `${q(u.w)} is <b>${UNK}</b> (no slot)` }));
    if (!parts.length) {
      if (state.text !== snapshotText) setMsg('text', LANGS[state.lang].sameMsg);
      return;
    }
    parts.sort((a, b) => b.d - a.d);
    let html = parts.slice(0, 3).map(p => p.html).join('; ') + (parts.length > 3 ? `; +${parts.length - 3} more` : '') + '.';
    html += ` Vocabulary unchanged: |V| = ${T.V}, same slots${mode === 'tfidf' ? ', same IDF values' : ''}.`;
    if (mode === 'tfidf' && prev.len !== cur.len) html += ` |d| changed (${prev.len} → ${cur.len} in-vocabulary tokens), so every TF shifts a little.`;
    setMsg('text', html);
  }

  function explainCorpus(prev, cur, action) {
    if (!prev) return;
    const a = prev.T, b = cur.T;
    let html = (action ? action + ' ' : '') + '<b>Retraining:</b> ';
    const bits = [];
    if (a.N !== b.N) bits.push(`N = ${a.N} → <b>${b.N}</b> documents`);
    const added = b.vocab.filter(w => a.vIndex[w] === undefined), removed = a.vocab.filter(w => b.vIndex[w] === undefined);
    if (added.length || removed.length) {
      bits.push(`|V| = ${a.V} → <b>${b.V}</b>${added.length ? ` (new: ${added.slice(0, 3).map(q).join(', ')}${added.length > 3 ? '…' : ''})` : ''}${removed.length ? ` (removed: ${removed.slice(0, 3).map(q).join(', ')}${removed.length > 3 ? '…' : ''})` : ''} — slot indices may shift`);
    } else bits.push(`vocabulary unchanged (|V| = ${b.V})`);
    const changed = cur.rows.filter(r => a.idf[r.w] !== undefined && Math.abs(a.idf[r.w] - r.idf) > 1e-12)
      .sort((x, y) => Math.abs(y.idf - a.idf[y.w]) - Math.abs(x.idf - a.idf[x.w]));
    if (changed.length) bits.push(changed.slice(0, 2).map(r => `${q(r.w)} IDF ${f3(a.idf[r.w])} → <b>${f3(r.idf)}</b>`).join(', '));
    html += bits.join(' · ') + '. Only the training collection can change the vocabulary or IDF.';
    setMsg('corpus', html);
  }

  function explainSelect(A, w) {
    const i = A.vIndex[w];
    if (i === undefined) {
      setMsg('select', `${q(w)} occurs ${A.all[w]}× in the test message but is <b>${UNK}</b>: it has no slot in x and adds nothing. Only adding a training document that contains it would create a slot.`);
      return;
    }
    const c = A.x[i];
    if (mode === 'bow') {
      setMsg('select', c
        ? `${q(w)} occurs <b>${c}×</b> in the test message → x[${i}] = <b>${c}</b> (slot #${i} of the fixed vocabulary). ${c > 1 ? `All ${c} occurrences are` : 'The occurrence is'} highlighted. It appears in ${A.T.df[w]} of ${A.N} training documents.`
        : `${q(w)} is vocabulary slot #${i}, but it does not occur in the test message → x[${i}] = <b>0</b>. The slot still exists in every vector.`);
    } else {
      const r = A.byWord[w];
      setMsg('select', r
        ? `${q(w)}: TF = ${r.c}/${A.len} = ${f3(r.tf)}; IDF (learned from training) = ln(${A.N}/${r.df}) = ${f3(r.idf)}; TF-IDF = <b>${f3(r.tfidf)}</b>. Rank #${r.bowRank} by count, <b>#${r.tfRank}</b> by TF-IDF.`
        : `${q(w)} is slot #${i} with IDF ${f3(A.T.idf[w])}, but its count in the test message is 0, so TF-IDF = 0.`);
    }
  }

  function explainPreset(A, label) {
    setMsg('preset', `Loaded test message “${esc(label)}”: ${A.tokens.length} tokens, ${A.uniq} unique words — ${A.rows.length} map to vocabulary slots, ${A.unknown.length} ${A.unknown.length === 1 ? 'is' : 'are'} ${UNK}. The vocabulary (|V| = ${A.T.V}) did not change.`);
  }

  function scheduleExplain(kind, action) {
    clearTimeout(msgTimer);
    msgTimer = setTimeout(() => {
      const cur = analyze();
      if (kind === 'text') explainText(snapshot, cur); else explainCorpus(snapshot, cur, action);
      snapshot = cur; snapshotText = state.text;
    }, 450);
  }
  function resnap() { clearTimeout(msgTimer); snapshot = analyze(); snapshotText = state.text; }

  // ---------------------------------------------------------------------------
  // Controls (concept column)
  // ---------------------------------------------------------------------------
  function buildControls() {
    const isT = mode === 'tfidf';
    ctrlHost.innerHTML = `
      <div class="tfp ${state.lang === 'my' ? 'tfp-my' : ''}">
        <div class="tfp-sec tfp-sec-test">
          <div class="tfp-sec-head"><span class="tfp-sec-title"><i data-lucide="type"></i> Test message <span class="tfp-sub">new text — never changes V or IDF</span></span>
            <div class="tfp-lang" role="group" aria-label="Text language">${Object.keys(LANGS).map(k => `<button class="${state.lang === k ? 'active' : ''}" data-lang="${k}" lang="${k}">${LANGS[k].label}</button>`).join('')}</div></div>
          ${state.lang === 'my' ? '<div class="tfp-langnote"><i data-lucide="info"></i><span>Burmese is written without spaces between words. These texts are <b>pre-segmented</b>: each space marks a word boundary, as a word segmenter would produce.</span></div>' : ''}
          <div class="tfp-presets">
            ${PRESETS.map(p => `<button class="tfp-preset ${state.preset === p.key ? 'active' : ''}" data-preset="${p.key}"><i data-lucide="${p.icon}"></i>${p.label}</button>`).join('')}
          </div>
          <textarea class="tfp-text" id="tfp-text" rows="4" spellcheck="false" aria-label="Test message" lang="${state.lang}">${esc(state.text)}</textarea>
          <div class="tfp-row">
            <button class="tfp-btn" id="tfp-reset" title="Restore the preset test message and the default training documents"><i data-lucide="rotate-ccw"></i>Reset</button>
            <button class="tfp-btn ${state.stepMode ? 'on' : ''}" id="tfp-stepmode"><i data-lucide="list-ordered"></i>${state.stepMode ? 'Exit Step-by-Step' : 'Step-by-Step Mode'}</button>
          </div>
          <div class="tfp-counts3" id="tfp-stats"></div>
          <div class="tfp-stepnav" id="tfp-stepnav" ${state.stepMode ? '' : 'hidden'}></div>
        </div>

        ${isT ? `
        <div class="tfp-sec">
          <div class="tfp-sec-head"><span class="tfp-sec-title"><i data-lucide="calculator"></i> Live calculation <span class="tfp-sub">test message</span></span>
            <label class="tfp-sel-wrap">word <select id="tfp-word" class="tfp-select"></select></label></div>
          <div class="tfp-calc" id="tfp-calc"></div>
        </div>` : `
        <div class="tfp-sec">
          <div class="tfp-sec-head"><span class="tfp-sec-title"><i data-lucide="mouse-pointer-click"></i> Selected word</span></div>
          <div class="tfp-selinfo" id="tfp-selinfo"></div>
        </div>`}

        <div class="tfp-sec tfp-sec-train">
          <div class="tfp-sec-head"><span class="tfp-sec-title"><i data-lucide="files"></i> Training collection <span class="tfp-sub" id="tfp-n"></span></span></div>
          <div class="tfp-hint">These documents alone define the vocabulary V, DF and IDF. Editing them retrains the feature space.</div>
          <div class="tfp-docs" id="tfp-docs"></div>
          <div class="tfp-row">
            <button class="tfp-btn" id="tfp-add"><i data-lucide="plus"></i>Add document</button>
            <button class="tfp-btn" id="tfp-addw"><i data-lucide="copy-plus"></i><span id="tfp-addw-label">Add doc with word</span></button>
            <button class="tfp-btn ghost" id="tfp-docreset"><i data-lucide="rotate-ccw"></i>Default docs</button>
          </div>
        </div>
      </div>`;

    const ta = ctrlHost.querySelector('#tfp-text');
    ta.addEventListener('input', () => {
      state.text = ta.value;
      if (state.preset && ta.value !== (PRESETS.find(p => p.key === state.preset) || {}).text) state.preset = null;
      ctrlHost.querySelectorAll('.tfp-preset').forEach(b => b.classList.toggle('active', b.dataset.preset === state.preset));
      update();
      scheduleExplain('text');
    });

    ctrlHost.querySelectorAll('.tfp-preset').forEach(btn => btn.addEventListener('click', () => {
      const p = PRESETS.find(x => x.key === btn.dataset.preset);
      state.preset = p.key; state.text = p.text; state.selected = null;
      ta.value = p.text;
      ctrlHost.querySelectorAll('.tfp-preset').forEach(b => b.classList.toggle('active', b === btn));
      explainPreset(analyze(), p.label);
      resnap(); update();
    }));

    ctrlHost.querySelector('#tfp-reset').addEventListener('click', () => {
      const p = PRESETS.find(x => x.key === state.preset) || PRESETS[0];
      Object.assign(state, { preset: p.key, text: p.text, corpus: DEFAULT_CORPUS.slice(), selected: null, stepMode: false, step: 0, tfView: 'weights', vecView: 'full' });
      state.msg = { kind: 'info', html: `Reset to the “${esc(p.label)}” test message and the ${DEFAULT_CORPUS.length} default training documents.` };
      buildControls(); resnap(); update();
    });

    ctrlHost.querySelector('#tfp-stepmode').addEventListener('click', () => toggleStepMode());
    ctrlHost.querySelectorAll('.tfp-lang [data-lang]').forEach(b => b.addEventListener('click', () => switchLang(b.dataset.lang)));

    const ws = ctrlHost.querySelector('#tfp-word');
    if (ws) ws.addEventListener('change', e => selectWord(e.target.value, true));
    ctrlHost.querySelector('#tfp-add').addEventListener('click', () => { state.corpus.push(''); buildDocs(true); update(); });
    ctrlHost.querySelector('#tfp-addw').addEventListener('click', () => {
      const prev = analyze();
      const w = effectiveSelection(prev);
      if (!w) return;
      state.corpus.push(LANGS[state.lang].addDoc(w));
      buildDocs(false);
      explainCorpus(prev, analyze(), `Added a training document containing ${q(w)}.`);
      resnap(); update();
    });
    ctrlHost.querySelector('#tfp-docreset').addEventListener('click', () => {
      const prev = analyze();
      state.corpus = DEFAULT_CORPUS.slice();
      buildDocs(false);
      explainCorpus(prev, analyze(), 'Restored the default training documents.');
      resnap(); update();
    });
    buildDocs(false);
    icons();
  }

  function buildDocs(focusLast) {
    const host = ctrlHost.querySelector('#tfp-docs');
    if (!host) return;
    host.innerHTML = state.corpus.map((t, i) => `
        <div class="tfp-doc" data-ci="${i}">
          <span class="tfp-doc-id" data-ci-id="${i}"></span>
          <input class="tfp-doc-in" data-ci="${i}" value="${esc(t)}" placeholder="Type a training document…" spellcheck="false" lang="${state.lang}">
          <button class="tfp-doc-x" data-ci="${i}" title="Remove this training document" aria-label="Remove training document">×</button>
        </div>`).join('');
    host.querySelectorAll('.tfp-doc-in').forEach(inp => inp.addEventListener('input', () => {
      state.corpus[+inp.dataset.ci] = inp.value;
      update();
      scheduleExplain('corpus', 'Edited a training document.');
    }));
    host.querySelectorAll('.tfp-doc-x').forEach(btn => btn.addEventListener('click', () => {
      const prev = analyze();
      state.corpus.splice(+btn.dataset.ci, 1);
      buildDocs(false);
      explainCorpus(prev, analyze(), 'Removed a training document.');
      resnap(); update();
    }));
    if (focusLast) {
      const ins = host.querySelectorAll('.tfp-doc-in');
      if (ins.length) ins[ins.length - 1].focus();
      setMsg('info', 'Blank training document added — type into it. Empty documents are ignored (they do not count toward N).');
    }
  }

  function switchLang(l) {
    if (!LANGS[l] || l === state.lang) return;
    savedByLang[state.lang] = { text: state.text, corpus: state.corpus.slice(), preset: state.preset, selected: state.selected };
    state.lang = l;
    PRESETS = LANGS[l].presets;
    DEFAULT_CORPUS = LANGS[l].corpus;
    const sv = savedByLang[l];
    if (sv) Object.assign(state, { text: sv.text, corpus: sv.corpus.slice(), preset: sv.preset, selected: sv.selected });
    else {
      const p = PRESETS.find(x => x.key === state.preset) || PRESETS[0];
      Object.assign(state, { preset: p.key, text: p.text, corpus: DEFAULT_CORPUS.slice(), selected: null });
    }
    if (state.stepMode) setMsgStep();
    else {
      const A = analyze();
      state.msg = { kind: 'info', html: `Switched to <b>${l === 'my' ? 'Burmese (မြန်မာ)' : 'English'}</b>${sv ? ' — your earlier texts are restored' : ''}. Training vocabulary |V| = ${A.T.V} from N = ${A.N} documents; the test message has ${A.rows.length} known and ${A.unknown.length} unknown words.${l === 'my' ? ' Burmese texts are pre-segmented with spaces; everything else works exactly the same.' : ''}` };
    }
    buildControls(); resnap(); update();
  }

  function toggleStepMode(force) {
    state.stepMode = typeof force === 'boolean' ? force : !state.stepMode;
    if (state.stepMode) { state.step = 0; setMsgStep(); }
    else state.msg = { kind: 'info', html: 'Back to free play — every edit now updates all views at once.' };
    const b = ctrlHost.querySelector('#tfp-stepmode');
    b.classList.toggle('on', state.stepMode);
    b.innerHTML = `<i data-lucide="list-ordered"></i>${state.stepMode ? 'Exit Step-by-Step' : 'Step-by-Step Mode'}`;
    update();
  }
  function goStep(k) {
    state.step = Math.max(0, Math.min(STEPS.length - 1, k));
    setMsgStep();
    update();
    const cur = vizHost.querySelector('.tfp-pipe-step.cur');
    if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  function setMsgStep() {
    state.msg = { kind: 'step', html: `Step ${state.step + 1} of ${STEPS.length} — <b>${STEPS[state.step].name}</b>. ${STEP_CAPTIONS[state.step]}` };
  }

  function selectWord(w, fromSelect) {
    const A = analyze();
    if (!selectable(A, w)) return;
    state.selected = (!fromSelect && state.selected === w && mode === 'bow') ? null : w;
    if (state.selected) explainSelect(A, w); else setMsg('info', 'Selection cleared.');
    update();
  }

  function updateControls(A) {
    const T = A.T, sel = effectiveSelection(A);
    const stats = ctrlHost.querySelector('#tfp-stats');
    if (stats) stats.innerHTML = countTrio(A);

    const nav = ctrlHost.querySelector('#tfp-stepnav');
    if (nav) {
      nav.hidden = !state.stepMode;
      if (state.stepMode) {
        nav.innerHTML = `
          <button class="tfp-btn" data-nav="-1" ${state.step === 0 ? 'disabled' : ''}><i data-lucide="chevron-left"></i>Prev</button>
          <span class="tfp-stepnav-lbl">Step ${state.step + 1}/${STEPS.length} · <b>${STEPS[state.step].name}</b></span>
          ${state.step < STEPS.length - 1
            ? '<button class="tfp-btn primary" data-nav="1">Next Step<i data-lucide="chevron-right"></i></button>'
            : '<button class="tfp-btn primary" data-nav="done"><i data-lucide="check"></i>Finish</button>'}`;
        nav.querySelectorAll('[data-nav]').forEach(b => b.addEventListener('click', () => {
          if (b.dataset.nav === 'done') toggleStepMode(false); else goStep(state.step + (+b.dataset.nav));
        }));
      }
    }

    const selinfo = ctrlHost.querySelector('#tfp-selinfo');
    if (selinfo) {
      const w = selectable(A, state.selected) ? state.selected : null;
      let body;
      if (!w) body = '<div class="tfp-hint">Click any word — in the test message, the vocabulary, or a vector cell — to see its count and its slot in the vector.</div>';
      else if (A.vIndex[w] === undefined) body = `<div class="tfp-selword">${q(w)} <span class="tfp-pill unk">${UNK}</span><button class="tfp-link" id="tfp-clear">clear</button></div>
          <div class="tfp-formula">Occurs ${A.all[w]}× in the test message, but there is no slot for it in V (|V| = ${T.V}), so it contributes nothing to x.</div>`;
      else {
        const i = A.vIndex[w], c = A.x[i];
        body = `<div class="tfp-selword">${q(w)} <span class="tfp-pill">count = ${c}</span><span class="tfp-pill">slot x[${i}]</span><button class="tfp-link" id="tfp-clear">clear</button></div>
          <div class="tfp-formula">x[${i}] = count(“${esc(w)}”, test message) = <b>${c}</b>${c ? ` — ${c} token occurrence${c > 1 ? 's' : ''} highlighted` : ' — absent, but the slot is still there'}<br>training: in ${T.df[w]} of N = ${T.N} documents</div>`;
      }
      selinfo.innerHTML = body;
      const c = selinfo.querySelector('#tfp-clear');
      if (c) c.addEventListener('click', () => { state.selected = null; setMsg('info', 'Selection cleared.'); update(); });
    }

    const selEl = ctrlHost.querySelector('#tfp-word');
    if (selEl) {
      const opts = A.tfOrder.map(r => `<option value="${esc(r.w)}" ${r.w === sel ? 'selected' : ''}>x[${r.i}] ${esc(r.w)}</option>`).join('');
      if (selEl.dataset.sig !== opts) { selEl.innerHTML = opts || '<option value="">—</option>'; selEl.dataset.sig = opts; }
      selEl.value = A.byWord[sel] ? sel : (A.tfOrder[0] ? A.tfOrder[0].w : '');
    }

    const calc = ctrlHost.querySelector('#tfp-calc');
    if (calc) {
      const r = A.byWord[sel] || A.tfOrder[0];
      calc.innerHTML = r ? `
        <div class="tfp-calc-line"><span class="tfp-calc-k">TF</span><span>= count(“${esc(r.w)}”, test) / |d| = ${r.c} / ${A.len} = <b>${f3(r.tf)}</b></span></div>
        <div class="tfp-calc-line"><span class="tfp-calc-k">DF</span><span>= # <b>training</b> documents containing “${esc(r.w)}” = <b>${r.df}</b> of N = ${A.N}</span></div>
        <div class="tfp-calc-line"><span class="tfp-calc-k">IDF</span><span>= ln(N / DF) = ln(${A.N} / ${r.df}) = <b>${f3(r.idf)}</b> <span class="tfp-sub">learned, fixed</span></span></div>
        <div class="tfp-calc-line total"><span class="tfp-calc-k">TF-IDF</span><span>= TF × IDF = ${f3(r.tf)} × ${f3(r.idf)} = <b>${f3(r.tfidf)}</b></span></div>
        <div class="tfp-hint">|d| = ${A.len} in-vocabulary tokens of the test message (${A.tokens.length - A.len} unknown token${A.tokens.length - A.len === 1 ? '' : 's'} ignored).</div>
        ${A.N === 1 ? '<div class="tfp-warn">Only one training document: every word has DF = N, so IDF = ln(1) = 0. Add training documents to see rarity weighting.</div>'
          : r.df === A.N ? `<div class="tfp-warn">“${esc(r.w)}” appears in <b>every</b> training document → IDF = 0, so it carries no distinguishing information.</div>` : ''}`
        : `<div class="tfp-hint">No word of the test message is in the training vocabulary, so its TF-IDF vector is all zeros.</div>`;
    }

    const nEl = ctrlHost.querySelector('#tfp-n');
    if (nEl) {
      const ignored = T.docs.length - T.N;
      nEl.textContent = `N = ${T.N}${ignored ? ` (${ignored} empty ignored)` : ''} · |V| = ${T.V}`;
    }
    ctrlHost.querySelectorAll('.tfp-doc[data-ci]').forEach(row => {
      const d = T.docs[+row.dataset.ci];
      row.classList.toggle('has', !!(sel && d && d.counts[sel]));
      row.classList.toggle('empty', !!(d && d.empty));
      const id = row.querySelector('[data-ci-id]');
      if (id) id.textContent = d && !d.empty ? `d${sub(d.id)}` : '—';
    });
    const addw = ctrlHost.querySelector('#tfp-addw-label');
    if (addw) addw.textContent = sel ? `Add doc with “${sel}”` : 'Add doc with word';
    icons();
  }

  // Token count vs unique words vs vocabulary size — three different numbers.
  function countTrio(A) {
    return `<span class="tfp-c3"><b>${A.tokens.length}</b><small>tokens in test message</small></span>
      <span class="tfp-c3"><b>${A.uniq}</b><small>unique words in test message</small></span>
      <span class="tfp-c3 v"><b>${A.T.V}</b><small>training vocabulary |V|</small></span>`;
  }

  // ---------------------------------------------------------------------------
  // Visual building blocks
  // ---------------------------------------------------------------------------
  function highlightedText(A, sel, text, pieces) {
    text = text === undefined ? state.text : text;
    pieces = pieces || A.pieces;
    if (!text.trim()) return '<span class="tfp-empty">Type a test message…</span>';
    let html = '', pos = 0;
    pieces.forEach(p => {
      html += esc(text.slice(pos, p.start));
      if (!p.kept) html += `<span class="tfp-w drop" title="1-character token — removed by preprocessing">${esc(p.raw)}</span>`;
      else if (A.vIndex[p.word] === undefined) html += `<span class="tfp-w unk ${p.word === sel ? 'sel' : ''}" data-w="${esc(p.word)}" title="${UNK}">${esc(p.raw)}</span>`;
      else {
        const c = A.colorOf[p.word];
        html += `<span class="tfp-w ${c !== undefined ? `rep tfp-c${c}` : ''} ${p.word === sel ? 'sel' : ''}" data-w="${esc(p.word)}" title="slot x[${A.vIndex[p.word]}]">${esc(p.raw)}</span>`;
      }
      pos = p.end;
    });
    return html + esc(text.slice(pos));
  }
  function legend() {
    return `<div class="evo-legend"><span><i class="tfp-key in"></i>in vocabulary → counted</span><span><i class="tfp-key unk"></i>${UNK}</span>${state.lang === 'en' ? '<span><i class="tfp-key drop"></i>removed by preprocessing</span>' : ''}</div>`;
  }

  function vocabChips(A, sel) {
    if (!A.T.V) return '<span class="tfp-empty">Empty vocabulary — add training documents.</span>';
    return `<div class="tfp-chips">${A.vocab.map((w, i) => `<span class="tfp-chip vocab ${A.x[i] ? 'on' : ''} ${w === sel ? 'sel' : ''}" data-w="${esc(w)}" title="slot ${i}${A.x[i] ? ` · ${A.x[i]}× in test message` : ''}"><sub>${i}</sub>${esc(w)}</span>`).join('')}</div>`;
  }

  // One document's vector, either all |V| slots or only the non-zero ones.
  function vectorGrid(A, sel, vals, fmt, heatMax, cls) {
    if (!A.T.V) return '<span class="tfp-empty">Empty vector — the vocabulary is empty.</span>';
    const nz = state.vecView === 'nonzero';
    const cells = A.vocab.map((w, i) => ({ w, i, v: vals[i] })).filter(c => !nz || c.v !== 0);
    if (!cells.length) return '<span class="tfp-empty">All slots are 0 — no word of this text is in the vocabulary.</span>';
    return `<div class="tfp-vec ${cls || ''}">${cells.map(c => {
      const a = heatMax > 0 && c.v ? Math.max(0.12, c.v / heatMax) : 0;
      return `<div class="tfp-vcell ${c.v ? '' : 'zero'} ${c.w === sel ? 'sel' : ''}" data-w="${esc(c.w)}" title="x[${c.i}] = ${esc(c.w)}">
        <span class="tfp-vval" style="--a:${a.toFixed(3)}">${fmt(c.v)}</span><span class="tfp-vidx">${c.i}</span><span class="tfp-vword">${esc(c.w)}</span></div>`;
    }).join('')}</div>`;
  }
  function vectorInline(vals, fmt, vocab) {
    if (state.vecView === 'nonzero') {
      const nz = vals.map((v, i) => ({ v, i })).filter(c => c.v !== 0);
      return `sparse x = { ${nz.map(c => `${c.i}:${esc(vocab[c.i])}=${fmt(c.v)}`).join(', ') || '∅'} } · dimension ${vals.length}, ${nz.length} non-zero`;
    }
    return `x = [ ${vals.map(fmt).join(', ')} ] · dimension ${vals.length}`;
  }
  function vecToggle() {
    return `<div class="tfp-seg tfp-vt"><button class="${state.vecView === 'full' ? 'active' : ''}" data-vec="full">Full vector (all |V| slots)</button><button class="${state.vecView === 'nonzero' ? 'active' : ''}" data-vec="nonzero">Non-zero features only</button></div>`;
  }

  // Document–term matrix: every row has the same |V| columns.
  function dtm(A, sel, kind) {
    const T = A.T;
    if (!T.V) return '<span class="tfp-empty">Empty vocabulary.</span>';
    const isT = kind.indexOf('tfidf') !== -1;            // 'bow' | 'tfidf' | 'train-only' | 'train-only-tfidf'
    const withTest = kind.indexOf('train-only') !== 0;
    const fmt = isT ? f2s : v => String(v);
    const rows = T.active.map(d => ({ id: `d${sub(d.id)}`, title: d.text, vals: isT ? d.tfidf : d.x, test: false }));
    if (withTest) rows.push({ id: 'test', title: state.text, vals: isT ? A.tfidf : A.x, test: true });
    if (state.vecView === 'nonzero') {
      return `<div class="tfp-sparse">${rows.map(r => `<div class="tfp-sp-row ${r.test ? 'test' : ''}"><span class="tfp-sp-id">${r.id}</span><span class="tfp-sp-vals">${r.vals.map((v, i) => v ? `<span class="tfp-sp ${T.vocab[i] === sel ? 'sel' : ''}" data-w="${esc(T.vocab[i])}"><sub>${i}</sub>${esc(T.vocab[i])}=${fmt(v)}</span>` : '').join('') || '<span class="tfp-empty">all zeros</span>'}</span><span class="tfp-sp-dim">dim ${r.vals.length}</span></div>`).join('')}</div>`;
    }
    const si = sel !== null ? T.vIndex[sel] : undefined;
    return `<div class="tfp-table-wrap tfp-dtm-wrap"><table class="tfp-dtm">
      <thead><tr><th class="rh">doc</th>${T.vocab.map((w, i) => `<th class="${i === si ? 'sel' : ''}" data-w="${esc(w)}" title="slot ${i}: ${esc(w)}"><span class="i">${i}</span><span class="w">${esc(w)}</span></th>`).join('')}<th class="dim">dim</th></tr></thead>
      <tbody>${rows.map(r => `<tr class="${r.test ? 'test' : ''}"><th class="rh" title="${esc(r.title)}">${r.id}</th>${r.vals.map((v, i) => `<td class="${v ? 'nz' : ''} ${i === si ? 'sel' : ''}">${fmt(v)}</td>`).join('')}<td class="dim">${r.vals.length}</td></tr>`).join('')}</tbody></table></div>`;
  }

  function checks(A) {
    const T = A.T;
    const dims = T.active.map(d => d.x.length).concat([A.x.length, A.tfidf.length]);
    const same = dims.every(d => d === T.V);
    return `<div class="tfp-checks">
      <span class="${same ? 'ok' : 'bad'}">${same ? '✓' : '✗'} every vector has ${T.V} dimensions (${T.active.length} training + test)</span>
      <span class="ok">✓ vocabulary fingerprint <code>${T.sigV}</code> — built from training only</span>
      <span class="ok">✓ IDF fingerprint <code>${T.sigIdf}</code> — edit the test message: these stay the same</span></div>`;
  }

  function card(title, sub2, body, extraCls) {
    return `<section class="tfp-card ${extraCls || ''}"><header class="tfp-card-head"><h4>${title}</h4>${sub2 ? `<span class="tfp-card-sub">${sub2}</span>` : ''}</header>${body}</section>`;
  }
  function phaseTag(p) { return `<span class="tfp-phase ${p}">${p === 'train' ? 'Training' : 'Test message'}</span>`; }

  function unknownCard(A) {
    if (!A.unknown.length) return '';
    return card(`Unknown words <span class="tfp-count">${A.unknown.length}</span>`, UNK,
      `<div class="tfp-chips">${A.unknown.map(u => `<span class="tfp-chip unk ${u.w === state.selected ? 'sel' : ''}" data-w="${esc(u.w)}" title="${UNK}">${esc(u.w)}${u.n > 1 ? ` ×${u.n}` : ''}</span>`).join('')}</div>
       <p class="tfp-p">These words never appeared in the training collection, so they have no slot. They are <b>ignored</b> — the vector keeps exactly ${A.T.V} dimensions.</p>`);
  }

  function tag(r, N) {
    if (N <= 1) return '';
    if (r.df === N) return '<span class="tfp-tag every">in every doc</span>';
    if (r.df === 1) return '<span class="tfp-tag unique">in 1 doc</span>';
    if (r.df / N >= 0.5) return '<span class="tfp-tag common">common</span>';
    return '';
  }

  // ---------------------------------------------------------------------------
  // Views
  // ---------------------------------------------------------------------------
  function viewBoW(A) {
    const sel = selectable(A, state.selected) ? state.selected : null;
    const selI = sel !== null ? A.vIndex[sel] : undefined;
    const selSub = sel ? (selI === undefined ? `“${esc(sel)}” — ${UNK}` : `“${esc(sel)}”: ${A.x[selI]} occurrence${A.x[selI] === 1 ? '' : 's'} → x[${selI}] = ${A.x[selI]}`) : 'click any word';
    return `
      ${card(`${phaseTag('train')} Fixed vocabulary V <span class="tfp-count">|V| = ${A.T.V}</span>`, `from N = ${A.N} training documents · alphabetical · index = slot`, vocabChips(A, sel) +
        '<div class="tfp-hint">Highlighted words also occur in the test message. The list does not change when you edit the test message.</div>')}
      ${card(`${phaseTag('test')} Test message`, selSub, `<div class="tfp-src">${highlightedText(A, sel)}</div>${legend()}<div class="tfp-counts3">${countTrio(A)}</div>`)}
      ${card(`${phaseTag('test')} Feature vector x(test)`, `${A.rows.length} non-zero of ${A.T.V} slots`,
        vecToggle() + vectorGrid(A, sel, A.x, v => String(v), A.maxCount) + `<div class="tfp-mono">${vectorInline(A.x, v => String(v), A.vocab)}</div>`)}
      ${unknownCard(A)}
      ${card('Aligned feature vectors', 'training documents + test message share the same columns', dtm(A, sel, 'bow') + checks(A))}`;
  }

  function formulaCard(A) {
    return card('TF-IDF definitions used here', '', `<div class="tfp-calc">
      <div class="tfp-calc-line"><span class="tfp-calc-k">TF</span><span>TF(t, d) = count(t, d) / |d|, where |d| = number of <b>in-vocabulary</b> tokens in d (unknown words are excluded)</span></div>
      <div class="tfp-calc-line"><span class="tfp-calc-k">DF</span><span>DF(t) = number of <b>training</b> documents containing t (N = ${A.N})</span></div>
      <div class="tfp-calc-line"><span class="tfp-calc-k">IDF</span><span>IDF(t) = ln(N / DF(t)) — natural log, no smoothing; computed once from training, then reused</span></div>
      <div class="tfp-calc-line total"><span class="tfp-calc-k">TF-IDF</span><span>TF-IDF(t, d) = TF(t, d) × IDF(t)</span></div></div>`);
  }

  function idfTable(A, sel) {
    const T = A.T;
    return `<div class="tfp-table-wrap"><table class="tfp-table">
      <thead><tr><th>slot</th><th>word</th><th>DF</th><th>IDF = ln(${T.N}/DF)</th><th>in test?</th></tr></thead>
      <tbody>${T.vocab.map((w, i) => `<tr class="${w === sel ? 'sel' : ''} ${A.x[i] ? '' : 'dim'}" data-w="${esc(w)}"><td>${i}</td><td class="t">${esc(w)} ${tag({ df: T.df[w] }, T.N)}</td><td>${T.df[w]}</td><td>${f3(T.idf[w])}</td><td>${A.x[i] ? `${A.x[i]}×` : '—'}</td></tr>`).join('')}</tbody></table></div>`;
  }

  function viewTfidf(A) {
    const sel = effectiveSelection(A);
    const tabs = `<div class="tfp-seg">
      <button class="${state.tfView === 'weights' ? 'active' : ''}" data-view="weights">TF-IDF weights</button>
      <button class="${state.tfView === 'compare' ? 'active' : ''}" data-view="compare">BoW vs TF-IDF</button></div>`;
    return tabs + formulaCard(A) + (state.tfView === 'compare' ? viewCompare(A, sel) : viewWeights(A, sel));
  }

  function docStrip(A, sel) {
    return `<div class="tfp-dstrip">${A.T.active.map(d => {
      const has = sel && d.counts[sel];
      return `<div class="tfp-dbox ${has ? 'has' : ''}" title="${esc(d.text)}"><b>d${sub(d.id)}</b><span>${has ? '✓' : '·'}</span></div>`;
    }).join('')}</div>`;
  }

  function viewWeights(A, sel) {
    const parts = [];
    if (A.rows.length) {
      const r = A.byWord[sel] || A.tfOrder[0];
      const top = A.bowOrder[0], dist = A.tfOrder[0];
      parts.push(`<div class="tfp-contrast">
        <div class="tfp-ct freq"><span>Most <b>frequent</b> (BoW)</span>${q(top.w)}<small>${top.c}× · in ${top.df}/${A.N} training docs · TF-IDF ${f3(top.tfidf)}</small></div>
        <div class="tfp-ct dist"><span>Most <b>distinctive</b> (TF-IDF)</span>${q(dist.w)}<small>${dist.c}× · in ${dist.df}/${A.N} training docs · TF-IDF ${f3(dist.tfidf)}</small></div></div>`);
      parts.push(card(`Which training documents contain “${esc(r.w)}”?`, `DF = ${r.df} of N = ${A.N}`,
        docStrip(A, r.w) + `<div class="tfp-mono">IDF = ln(${A.N}/${r.df}) = ${f3(r.idf)} &nbsp;→&nbsp; TF-IDF(test) = ${r.c}/${A.len} × ${f3(r.idf)} = <b>${f3(r.tfidf)}</b></div>`));
      parts.push(card(`${phaseTag('test')} TF-IDF of the test message`, `sorted by TF-IDF · |d| = ${A.len} in-vocabulary tokens`, `<div class="tfp-table-wrap"><table class="tfp-table">
        <thead><tr><th>slot</th><th>term</th><th>count</th><th>TF</th><th>DF</th><th>IDF</th><th class="w">TF-IDF</th></tr></thead>
        <tbody>${A.tfOrder.map(x => `
          <tr class="${x.w === r.w ? 'sel' : ''}" data-w="${esc(x.w)}"><td>${x.i}</td>
            <td class="t">${esc(x.w)} ${tag(x, A.N)}</td><td>${x.c}</td><td>${f3(x.tf)}</td><td>${x.df}</td><td>${f3(x.idf)}</td>
            <td class="w"><span class="tfp-mini"><span style="width:${A.maxTfidf > 0 ? (x.tfidf / A.maxTfidf) * 100 : 0}%"></span></span><b>${f3(x.tfidf)}</b></td></tr>`).join('')}</tbody></table></div>`));
    } else parts.push(card('TF-IDF of the test message', '', '<span class="tfp-empty">No word of the test message is in the training vocabulary — its TF-IDF vector is all zeros.</span>'));
    parts.push(unknownCard(A));
    parts.push(card(`${phaseTag('train')} Learned IDF (frozen)`, `all ${A.T.V} vocabulary words · grey = not in the test message`, idfTable(A, sel)));
    return parts.join('');
  }

  function viewCompare(A, sel) {
    if (!A.rows.length) return card('BoW vs TF-IDF', '', '<span class="tfp-empty">No word of the test message is in the training vocabulary.</span>');
    const moves = A.rows.map(r => ({ r, d: r.bowRank - r.tfRank }));
    const up = moves.slice().sort((a, b) => b.d - a.d || b.r.tfidf - a.r.tfidf)[0];
    const down = moves.slice().sort((a, b) => a.d - b.d || b.r.c - a.r.c)[0];
    const summary = `<div class="tfp-contrast">
      <div class="tfp-ct dist"><span>Biggest climber</span>${q(up.r.w)}<small>rank #${up.r.bowRank} → #${up.r.tfRank} · in ${up.r.df}/${A.N} training docs</small></div>
      <div class="tfp-ct freq"><span>Biggest faller</span>${q(down.r.w)}<small>rank #${down.r.bowRank} → #${down.r.tfRank} · in ${down.r.df}/${A.N} training docs</small></div></div>`;
    const rows = A.tfOrder.map(r => {
      const d = r.bowRank - r.tfRank;
      const arrow = d > 0 ? `<span class="tfp-mv up">▲${d}</span>` : d < 0 ? `<span class="tfp-mv dn">▼${-d}</span>` : '<span class="tfp-mv">=</span>';
      return `<div class="tfp-cmp-row ${r.w === sel ? 'sel' : ''}" data-w="${esc(r.w)}">
        <span class="tfp-bar-lbl">${esc(r.w)}</span>
        <span class="tfp-cmp-bar bow"><span style="width:${(r.c / A.maxCount) * 100}%"></span><em>${r.c}</em></span>
        <span class="tfp-cmp-bar tf"><span style="width:${A.maxTfidf > 0 ? (r.tfidf / A.maxTfidf) * 100 : 0}%"></span><em>${f3(r.tfidf)}</em></span>
        ${arrow}</div>`;
    }).join('');
    const body = `<div class="tfp-cmp-head"><span></span><span>BoW count</span><span>TF-IDF weight</span><span>rank</span></div>${rows}`;
    const vecs = card(`${phaseTag('test')} Same message, two vectors`, `both ${A.T.V}-dimensional, same slots`,
      vecToggle() + `<div class="tfp-lbl">Bag-of-Words counts</div>${vectorGrid(A, sel, A.x, v => String(v), A.maxCount, 'compact')}
       <div class="tfp-lbl">TF-IDF weights</div>${vectorGrid(A, sel, A.tfidf, f2s, A.maxTfidf, 'compact tf')}`);
    return summary + card('Ranking: frequency vs. distinctiveness', 'test-message words · bars scaled to each column’s max', `<div class="tfp-cmp">${body}</div>`) + vecs;
  }

  // ---- Step-by-step pipeline ----
  function viewSteps(A) {
    const k = state.step, T = A.T;
    const sel = selectable(A, state.selected) ? state.selected : null;
    const summaries = [`N = ${T.N}`, `${T.active.reduce((s, d) => s + d.tokens.length, 0)} tokens`, `|V| = ${T.V}`, 'counts / doc',
      `${T.N} × ${T.V}`, 'IDF fixed', `${A.rows.length} known · ${A.unknown.length} unk`];
    const pipe = `<div class="tfp-pipe tfp-pipe7">${STEPS.map((s, i) => `
      <button class="tfp-pipe-step ${i < k ? 'done' : ''} ${i === k ? 'cur' : ''}" data-step="${i}">
        <span class="tfp-phase ${s.phase}">${s.phase === 'train' ? 'Training' : 'Test'}</span>
        <span class="tfp-pipe-n">${i + 1}</span><span class="tfp-pipe-name">${s.name}</span><span class="tfp-pipe-sum">${i <= k ? summaries[i] : ''}</span>
      </button>${i < STEPS.length - 1 ? `<span class="tfp-pipe-arrow">${i === 5 ? '┃' : '→'}</span>` : ''}`).join('')}</div>`;

    let body = '';
    switch (k) {
      case 0:
        body = `<div class="tfp-trainlist">${T.docs.map(d => `<div class="tfp-trainrow ${d.empty ? 'off' : ''}"><b>${d.empty ? '—' : `d${sub(d.id)}`}</b><span lang="${state.lang}">${esc(d.text) || '<i>(empty — ignored)</i>'}</span></div>`).join('')}</div>
          <div class="tfp-testbox"><span class="tfp-phase test">Test message</span><span lang="${state.lang}">${esc(state.text) || '<i>(empty)</i>'}</span><small>kept aside — used only in Step 7</small></div>
          <p class="tfp-p">The feature space is learned from these <b>N = ${T.N}</b> training documents (edit them in the concept column). A classifier is later trained on their vectors and then applied to new messages.</p>`;
        break;
      case 1:
        body = `<div class="tfp-rules">${LANGS[state.lang].rules.map(r => `<span>${r}</span>`).join('')}</div>
          <div class="tfp-trainlist">${T.active.map(d => `<div class="tfp-trainrow"><b>d${sub(d.id)}</b><span class="tfp-chips">${d.pieces.map(p => p.kept ? `<span class="tfp-chip ${p.word === sel ? 'sel' : ''}" data-w="${esc(p.word)}">${esc(p.word)}</span>` : `<span class="tfp-chip drop" title="removed by preprocessing">${esc(p.word)}</span>`).join('')}</span></div>`).join('')}</div>
          <p class="tfp-p">Removed by the rules: ${Object.keys(T.dropped).length ? Object.entries(T.dropped).map(([w, n]) => `${q(w)}${n > 1 ? ` ×${n}` : ''}`).join(', ') : 'nothing'}. The test message will go through <b>exactly the same rules</b> in Step 7.</p>`;
        break;
      case 2:
        body = vocabChips(A, sel) + `<p class="tfp-p">${T.active.reduce((s, d) => s + d.tokens.length, 0)} training tokens → <b>|V| = ${T.V}</b> unique words, sorted ${state.lang === 'my' ? 'in Burmese (Unicode) alphabetical order' : 'alphabetically'}. The small number is each word's <b>index</b> — its fixed position in every feature vector. From now on the vocabulary is frozen.</p>`;
        break;
      case 3:
        body = `<div class="tfp-trainlist">${T.active.map(d => `<div class="tfp-trainrow"><b>d${sub(d.id)}</b><span class="tfp-chips">${Object.keys(d.counts).sort(order).map(w => `<span class="tfp-chip ${d.counts[w] > 1 ? 'rep tfp-c1' : ''} ${w === sel ? 'sel' : ''}" data-w="${esc(w)}">${esc(w)} <b>${d.counts[w]}</b></span>`).join('')}</span></div>`).join('')}</div>
          <p class="tfp-p">count(w, d) for each document — a word repeated inside one document (orange) gets a larger count. Each document lists only the words it contains; Step 5 lines them up.</p>`;
        break;
      case 4:
        body = vecToggle() + dtm(A, sel, 'train-only') + `<p class="tfp-p">Each row is one document's count vector in vocabulary order. Every row has the same <b>${T.V}</b> columns; a word that is absent gets a <b>0</b>, so word <i>w</i> is always in column ${sel !== null && T.vIndex[sel] !== undefined ? `<b>${T.vIndex[sel]}</b> for ${q(sel)}` : 'V-index(w)'}. This aligned matrix (N × |V| = ${T.N} × ${T.V}) is what a classifier is trained on.</p>`;
        break;
      case 5: {
        const w = sel !== null && T.vIndex[sel] !== undefined ? sel : T.vocab.slice().sort((a, b) => T.df[b] - T.df[a] || order(a, b))[0];
        body = formulaCard(A) + card(`${phaseTag('train')} Learned IDF (frozen)`, 'DF and IDF from training documents only', idfTable(A, sel)) +
          `<div class="tfp-lbl">Training TF-IDF vectors</div>${dtm(A, sel, 'train-only-tfidf')}
          ${w ? `<p class="tfp-p">${q(w)} appears in ${T.df[w]} of ${T.N} training documents → IDF = ln(${T.N}/${T.df[w]}) = <b>${f3(T.idf[w])}</b>. Common words get small IDF; rare words keep large weights. These IDF values are stored with the vocabulary.</p>` : ''}`;
        break;
      }
      case 6:
        body = `<div class="tfp-src">${highlightedText(A, sel)}</div>${legend()}<div class="tfp-counts3">${countTrio(A)}</div>
          <div class="tfp-lbl">Count vector (same ${T.V} slots as the training rows)</div>${vecToggle()}${vectorGrid(A, sel, A.x, v => String(v), A.maxCount, 'compact')}
          <div class="tfp-lbl">TF-IDF vector — reuses the stored IDF, |d| = ${A.len} in-vocabulary tokens</div>${vectorGrid(A, sel, A.tfidf, f2s, A.maxTfidf, 'compact tf')}
          ${A.unknown.length ? `<div class="tfp-warn">${A.unknown.map(u => q(u.w)).join(', ')}: ${UNK}.</div>` : ''}
          ${checks(A)}
          <p class="tfp-p">Edit the test message now: the vector values change, but the slots, |V| and the IDF fingerprint do not.</p>`;
        break;
    }
    const nav = `<div class="tfp-row end">
      <button class="tfp-btn" data-go="${k - 1}" ${k === 0 ? 'disabled' : ''}>← Prev</button>
      ${k < STEPS.length - 1 ? `<button class="tfp-btn primary" data-go="${k + 1}">Next Step →</button>` : '<button class="tfp-btn primary" data-go="done">✓ Finish — free play</button>'}</div>`;
    return pipe + card(`Step ${k + 1} · ${STEPS[k].name}`, STEPS[k].phase === 'train' ? 'training documents only' : 'new text, fixed feature space', body + nav, 'tfp-stepcard');
  }

  // ---------------------------------------------------------------------------
  // Render / update
  // ---------------------------------------------------------------------------
  function update() {
    if (!vizHost || !document.body.contains(vizHost)) return;
    const A = analyze();
    const title = state.stepMode ? 'Step-by-Step: Shared Feature Space'
      : mode === 'bow' ? 'Bag-of-Words · fixed vocabulary' : 'TF-IDF · IDF learned from training';
    const scrollTop = vizHost.scrollTop;
    vizHost.innerHTML = `
      <div class="tfp-viz ${state.lang === 'my' ? 'tfp-my' : ''}" lang="${state.lang}">
        <div class="tfp-viz-head"><h3>${title}</h3>
          <span class="tfp-stat-chips"><span>N ${A.N} training docs</span><span>|V| ${A.T.V}</span></span></div>
        ${msgHTML()}
        ${state.stepMode ? viewSteps(A) : mode === 'bow' ? viewBoW(A) : viewTfidf(A)}
        <div class="tfp-foot"><i data-lucide="arrow-right-circle"></i><span>Next concept: <b>Naive Bayes</b> uses this fixed vocabulary — training and new messages must share the same features.</span></div>
      </div>`;
    vizHost.scrollTop = scrollTop;
    updateControls(A);
  }

  function onVizClick(e) {
    if (!vizHost || !vizHost.querySelector('.tfp-viz')) return;
    const go = e.target.closest('[data-go]');
    if (go) { if (go.dataset.go === 'done') toggleStepMode(false); else goStep(+go.dataset.go); return; }
    const st = e.target.closest('[data-step]');
    if (st) { goStep(+st.dataset.step); return; }
    const vv = e.target.closest('[data-vec]');
    if (vv) { state.vecView = vv.dataset.vec; update(); return; }
    const v = e.target.closest('[data-view]');
    if (v) {
      state.tfView = v.dataset.view;
      if (state.tfView === 'compare') {
        const A = analyze();
        const top = A.bowOrder[0], dist = A.tfOrder[0];
        if (top) setMsg('info', `Same test message, two encodings. BoW rewards repetition (${q(top.w)} wins with ${top.c}×); TF-IDF rewards repetition <i>and</i> rarity in the training collection (${q(dist.w)} wins). Green ▲ = word gained importance under TF-IDF.`);
      }
      update(); return;
    }
    const w = e.target.closest('[data-w]');
    if (w) selectWord(w.dataset.w, mode === 'tfidf');
  }

  function render(col, m) {
    mode = m === 'tfidf' ? 'tfidf' : 'bow';
    vizHost = col;
    vizHost.classList.add('tfp-host');
    vizHost.removeEventListener('click', onVizClick);
    vizHost.addEventListener('click', onVizClick);
    ctrlHost = document.getElementById('lr-concept-lab');
    if (!ctrlHost) {
      const wrap = document.createElement('div');
      col.innerHTML = '';
      col.appendChild(wrap);
      ctrlHost = wrap;
      const viz = document.createElement('div');
      col.appendChild(viz);
      vizHost = viz;
      vizHost.addEventListener('click', onVizClick);
    }
    if (state.msg && state.msg.kind === 'select') state.msg = null;
    buildControls();
    resnap();
    update();
  }

  window.TextFeaturesLab = { render, _state: state, _analyze: analyze, _train: train };
})();
