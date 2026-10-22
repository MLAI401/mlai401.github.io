/**
 * text_features_lab.js — Topic 06 · Concept 1 · Interactive Text Features
 * Playground (Bag-of-Words & TF-IDF) for learning.html.
 *
 * Single-screen layout (same pattern as the Topic 05 labs):
 *   - Concept column (#lr-concept-lab): preset switcher, editable text box,
 *     Reset, Step-by-Step controls, selected-word details, live TF / DF /
 *     IDF / TF-IDF calculation, and the editable document collection.
 *   - Illustration column: live visualizations — highlighted source text,
 *     token chips, word-frequency bars, feature vector, TF-IDF table,
 *     BoW-vs-TF-IDF comparison, and the 6-stage step-by-step pipeline.
 *
 * Both concept tabs ("Tokenization & Bag-of-Words", "TF-IDF Rarity
 * Weighting") share one state object, so the text a student types in one
 * tab is the same text analysed in the other.
 *
 * Formulas (match topic06_reading.html and python_sandbox):
 *   tokenize : lowercase · strip punctuation · drop 1-character tokens
 *   x_BoW[w] = count(w, d)
 *   TF(t, d) = count(t, d) / |d|
 *   IDF(t)   = ln(N / DF(t))
 *   TF-IDF   = TF × IDF
 *
 * Feature extraction only — no classification. The next concept (Naive
 * Bayes) consumes these word features.
 *
 * Exposes window.TextFeaturesLab = { render(col, mode) } with mode 'bow' | 'tfidf'.
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Data
  // ---------------------------------------------------------------------------
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

  // Background documents d2..dN. "the" appears in most of them on purpose,
  // so students can watch a frequent word lose its weight under TF-IDF.
  const CORPUS_EN = [
    'The team meeting is moved to Friday morning',
    'Please review the report and send the slides',
    'Win a free trip, click the link now',
    'The food was great and the service was friendly',
    'This movie was boring and far too long'
  ];

  // Burmese (မြန်မာ). Burmese is normally written WITHOUT spaces between
  // words, so these texts are pre-segmented: each space marks a word
  // boundary, as a word segmenter would produce. Particles such as ကို and
  // ပါ play the role of "the": frequent, but found in most documents.
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
    'ဒီ ရုပ်ရှင် က ပျင်း စရာ ကောင်း ပြီး ရှည် လွန်း တယ်'
  ];

  const LANGS = {
    en: { label: 'English', presets: PRESETS_EN, corpus: CORPUS_EN,
      addDoc: w => `another message that mentions ${w}`,
      rules: ['① lowercase', '② strip punctuation', '③ split on spaces', '④ drop 1-letter tokens'],
      tokCaption: 'Split the string into word tokens: lowercase, remove punctuation, drop 1-letter tokens.',
      sameMsg: 'Only punctuation, capitalisation, spacing or 1-letter words changed. Tokenization lowercases text, strips punctuation and drops 1-letter tokens, so the <b>feature vector is identical</b>.' },
    my: { label: 'မြန်မာ', presets: PRESETS_MY, corpus: CORPUS_MY,
      addDoc: w => `${w} အကြောင်း ပြော ထား သော နောက် စာ တစ် စောင်`,
      rules: ['① split on spaces (word boundaries)', '② strip punctuation ။ ၊', '③ no lowercasing — Burmese has no capital letters'],
      tokCaption: 'Split the string into word tokens at the spaces, and remove Burmese punctuation (။ ၊). Burmese has no upper/lower case.',
      sameMsg: 'Only punctuation (။ ၊) or extra spacing changed. Tokenization removes punctuation, so the <b>feature vector is identical</b>.' }
  };
  let PRESETS = PRESETS_EN;
  let DEFAULT_CORPUS = CORPUS_EN;
  const savedByLang = {};

  const STEPS = [
    { key: 'raw', name: 'Raw Text', icon: 'file-text' },
    { key: 'tok', name: 'Tokenization', icon: 'scissors' },
    { key: 'vocab', name: 'Vocabulary', icon: 'book-a' },
    { key: 'counts', name: 'Word Counts', icon: 'bar-chart-3' },
    { key: 'vector', name: 'Feature Vector', icon: 'brackets' },
    { key: 'tfidf', name: 'TF-IDF', icon: 'scale' }
  ];

  const REP_COLORS = 6; // number of colour classes for repeated words (.tfp-c0..c5)

  // ---------------------------------------------------------------------------
  // State (shared by both tabs, persists while switching concepts)
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
    msg: null
  };

  let mode = 'bow';
  let ctrlHost = null;
  let vizHost = null;
  let snapshot = null;   // analysis at the time of the last explanation
  let msgTimer = null;

  // ---------------------------------------------------------------------------
  // Text processing
  // ---------------------------------------------------------------------------
  // Same rule as MLEngine.tokenize: \w+ runs, lowercased, length > 1.
  // Burmese: tokens are runs between spaces / zero-width spaces / punctuation
  // (။ U+104B, ၊ U+104A); every token is kept (no length rule).
  function scan(text) {
    const out = [];
    const my = state.lang === 'my';
    const re = my ? /[^\s\u200B\u104A\u104B.,!?;:"'()\[\]{}\-—…“”‘’]+/gu : /[A-Za-z0-9_]+/g;
    let m;
    while ((m = re.exec(text || ''))) {
      out.push({ raw: m[0], word: m[0].toLowerCase(), start: m.index, end: m.index + m[0].length, kept: my ? true : m[0].length > 1 });
    }
    return out;
  }
  // Burmese written without spaces collapses into very long "tokens".
  function longTokens(A) { return state.lang === 'my' ? A.vocab.filter(w => w.length > 18) : []; }
  function segWarn(A) {
    const L = longTokens(A);
    return L.length ? `<div class="tfp-warn">${L.length} very long token${L.length > 1 ? 's' : ''} found (e.g. “${esc(L[0].slice(0, 24))}…”). Burmese is written without spaces between words, so unsegmented text becomes one giant token and the features become useless. Put a space between words — that is <b>word segmentation</b>, the first step of Burmese NLP.</div>` : '';
  }
  function tokenize(text) { return scan(text).filter(p => p.kept).map(p => p.word); }

  function analyze() {
    const pieces = scan(state.text);
    const tokens = pieces.filter(p => p.kept).map(p => p.word);
    const counts = {};
    tokens.forEach(w => { counts[w] = (counts[w] || 0) + 1; });
    const vocab = Object.keys(counts).sort();
    const vIndex = {};
    vocab.forEach((w, i) => { vIndex[w] = i; });

    // Collection: d1 = the student's text, then every non-empty background doc.
    const docs = [{ id: 1, text: state.text, own: true }];
    state.corpus.forEach((t, i) => docs.push({ id: i + 2, text: t, own: false, ci: i }));
    docs.forEach(d => { d.set = new Set(tokenize(d.text)); d.empty = d.set.size === 0; });
    const active = docs.filter(d => !d.empty || d.own);
    const N = active.length;

    const rows = vocab.map(w => {
      const c = counts[w];
      const tf = c / tokens.length;
      const df = active.filter(d => d.set.has(w)).length;
      const idf = Math.log(N / df);
      return { w, c, tf, df, idf, tfidf: tf * idf };
    });
    const byWord = {};
    rows.forEach(r => { byWord[r.w] = r; });

    const bowOrder = rows.slice().sort((a, b) => b.c - a.c || a.w.localeCompare(b.w));
    const tfOrder = rows.slice().sort((a, b) => b.tfidf - a.tfidf || b.c - a.c || a.w.localeCompare(b.w));
    // Competition ranking: tied values share a rank (1, 2, 2, 4 …)
    rows.forEach(r => {
      r.bowRank = 1 + rows.filter(o => o.c > r.c).length;
      r.tfRank = 1 + rows.filter(o => o.tfidf > r.tfidf + 1e-9).length;
    });

    // Colour classes for repeated words (most frequent first)
    const colorOf = {};
    bowOrder.filter(r => r.c > 1).forEach((r, i) => { colorOf[r.w] = i % REP_COLORS; });

    const corpusVocab = new Set();
    active.forEach(d => d.set.forEach(w => corpusVocab.add(w)));

    return { pieces, tokens, counts, vocab, vIndex, rows, byWord, bowOrder, tfOrder, colorOf, docs, active, N,
      corpusVocabSize: corpusVocab.size,
      maxCount: bowOrder.length ? bowOrder[0].c : 0,
      maxTfidf: tfOrder.length ? tfOrder[0].tfidf : 0 };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  const f3 = x => (Math.abs(x) < 5e-4 ? 0 : x).toFixed(3);
  const q = w => `<b class="tfp-q">“${esc(w)}”</b>`;
  function icons() { if (window.lucide) window.lucide.createIcons(); }

  function effectiveSelection(A) {
    if (state.selected && A.counts[state.selected]) return state.selected;
    return A.tfOrder.length ? A.tfOrder[0].w : null;
  }

  function setMsg(kind, html) {
    state.msg = { kind, html };
    const box = vizHost && vizHost.querySelector('#tfp-msg');
    if (box) box.outerHTML = msgHTML();
  }

  function msgHTML() {
    const m = state.msg;
    if (!m) return '<div class="tfp-msg" id="tfp-msg"><span class="tfp-msg-tag">Try it</span><span>Edit the text, click a word, or change the documents — this box explains what changed.</span></div>';
    const tag = { text: 'Text changed', select: 'Word selected', corpus: 'Documents changed', preset: 'Preset loaded', step: 'Step', info: 'Note' }[m.kind] || 'What changed';
    return `<div class="tfp-msg tfp-msg-${m.kind}" id="tfp-msg"><span class="tfp-msg-tag">${tag}</span><span>${m.html}</span></div>`;
  }

  // ---------------------------------------------------------------------------
  // "What changed" explanations
  // ---------------------------------------------------------------------------
  function explainText(prev, cur) {
    if (!prev) return;
    const words = new Set([...Object.keys(prev.counts), ...Object.keys(cur.counts)]);
    const diffs = [];
    words.forEach(w => {
      const a = prev.counts[w] || 0, b = cur.counts[w] || 0;
      if (a !== b) diffs.push({ w, a, b });
    });
    if (!diffs.length) {
      if (prev.pieces.length !== cur.pieces.length || state.text !== snapshotText) {
        setMsg('text', LANGS[state.lang].sameMsg);
      }
      return;
    }
    diffs.sort((x, y) => Math.abs(y.b - y.a) - Math.abs(x.b - x.a) || (y.a === 0) - (x.a === 0));
    const parts = diffs.slice(0, 3).map(d => {
      if (d.a === 0) return `${q(d.w)} is new → a new vocabulary slot x[${q(d.w)}] = ${d.b}`;
      if (d.b === 0) return `${q(d.w)} is gone → its slot is removed from the vector`;
      return `count(${q(d.w)}) ${d.a} → <b>${d.b}</b>`;
    });
    let html = parts.join('; ') + (diffs.length > 3 ? `; +${diffs.length - 3} more` : '') + '.';
    if (prev.vocab.length !== cur.vocab.length) html += ` Vocabulary |V| ${prev.vocab.length} → <b>${cur.vocab.length}</b>.`;
    if (mode === 'tfidf') {
      const d = diffs.find(x => x.b > 0);
      if (d) {
        const r0 = prev.byWord[d.w], r1 = cur.byWord[d.w];
        html += ` TF-IDF(${q(d.w)}) ${r0 ? f3(r0.tfidf) : '0.000'} → <b>${f3(r1.tfidf)}</b>.`;
      }
      if (prev.tokens.length !== cur.tokens.length) html += ` |d| changed (${prev.tokens.length} → ${cur.tokens.length}), so every TF shifts a little too.`;
    } else if (diffs.some(x => x.b > 1 && x.b > x.a)) {
      const d = diffs.find(x => x.b > 1 && x.b > x.a);
      html += ` Repeating ${q(d.w)} makes its bar taller — in BoW, repetition = a bigger feature value.`;
    }
    setMsg('text', html);
  }
  let snapshotText = '';

  function explainCorpus(prev, cur, action) {
    if (!prev) return;
    let html = action ? action + ' ' : '';
    if (prev.N !== cur.N) html += `N = ${prev.N} → <b>${cur.N}</b> documents. `;
    const changed = cur.rows.filter(r => prev.byWord[r.w] && prev.byWord[r.w].df !== r.df)
      .sort((a, b) => Math.abs(b.idf - prev.byWord[b.w].idf) - Math.abs(a.idf - prev.byWord[a.w].idf));
    if (changed.length) {
      html += changed.slice(0, 3).map(r => {
        const p = prev.byWord[r.w];
        const dir = r.df > p.df ? 'more common ⇒ weight ↓' : 'rarer ⇒ weight ↑';
        return `${q(r.w)} DF ${p.df} → ${r.df}, IDF ${f3(p.idf)} → <b>${f3(r.idf)}</b> (${dir})`;
      }).join('; ') + '.';
    } else if (prev.N !== cur.N) {
      html += cur.N > prev.N
        ? 'None of your words are in the new document, so they all became relatively <b>rarer</b> (IDF ↑).'
        : 'Your words all became relatively more common in the smaller collection (IDF ↓).';
    } else {
      html += 'No word from your text changed its document frequency, so the TF-IDF weights are unchanged.';
    }
    setMsg('corpus', html);
  }

  function explainSelect(A, w) {
    const r = A.byWord[w];
    if (!r) return;
    if (mode === 'bow') {
      setMsg('select', `${q(w)} occurs <b>${r.c}×</b> in ${A.tokens.length} tokens → x[${A.vIndex[w]}] = <b>${r.c}</b> (slot #${A.vIndex[w]} of the alphabetical vocabulary). All ${r.c} occurrence${r.c > 1 ? 's are' : ' is'} highlighted in the text.`);
    } else {
      setMsg('select', `${q(w)}: TF = ${r.c}/${A.tokens.length} = ${f3(r.tf)}; it appears in ${r.df} of ${A.N} documents → IDF = ln(${A.N}/${r.df}) = ${f3(r.idf)}; TF-IDF = <b>${f3(r.tfidf)}</b>. Rank #${r.bowRank} by count, <b>#${r.tfRank}</b> by TF-IDF.`);
    }
  }

  function explainPreset(A, label) {
    const top = A.bowOrder[0], dist = A.tfOrder[0];
    if (!top) { setMsg('preset', `Loaded “${esc(label)}”.`); return; }
    setMsg('preset', `Loaded “${esc(label)}”: ${A.tokens.length} tokens, ${A.vocab.length} unique words. Most frequent: ${q(top.w)} (${top.c}×). Most distinctive (TF-IDF): ${q(dist.w)}.`);
  }

  // Debounced explanations while typing
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
        <div class="tfp-sec">
          <div class="tfp-sec-head"><span class="tfp-sec-title"><i data-lucide="type"></i> Input text <span class="tfp-sub">d₁ — edit freely</span></span>
            <div class="tfp-lang" role="group" aria-label="Text language">${Object.keys(LANGS).map(k => `<button class="${state.lang === k ? 'active' : ''}" data-lang="${k}" lang="${k}">${LANGS[k].label}</button>`).join('')}</div></div>
          ${state.lang === 'my' ? '<div class="tfp-langnote"><i data-lucide="info"></i><span>Burmese is written without spaces between words. These texts are <b>pre-segmented</b>: each space marks a word boundary, as a word segmenter would produce.</span></div>' : ''}
          <div class="tfp-presets">
            ${PRESETS.map(p => `<button class="tfp-preset ${state.preset === p.key ? 'active' : ''}" data-preset="${p.key}"><i data-lucide="${p.icon}"></i>${p.label}</button>`).join('')}
          </div>
          <textarea class="tfp-text" id="tfp-text" rows="4" spellcheck="false" aria-label="Input text" lang="${state.lang}">${esc(state.text)}</textarea>
          <div class="tfp-row">
            <button class="tfp-btn" id="tfp-reset" title="Restore the preset text and the default documents"><i data-lucide="rotate-ccw"></i>Reset</button>
            <button class="tfp-btn ${state.stepMode ? 'on' : ''}" id="tfp-stepmode"><i data-lucide="list-ordered"></i>${state.stepMode ? 'Exit Step-by-Step' : 'Step-by-Step Mode'}</button>
            <span class="tfp-stats" id="tfp-stats"></span>
          </div>
          <div class="tfp-stepnav" id="tfp-stepnav" ${state.stepMode ? '' : 'hidden'}></div>
        </div>

        ${isT ? `
        <div class="tfp-sec">
          <div class="tfp-sec-head"><span class="tfp-sec-title"><i data-lucide="calculator"></i> Live calculation</span>
            <label class="tfp-sel-wrap">word <select id="tfp-word" class="tfp-select"></select></label></div>
          <div class="tfp-calc" id="tfp-calc"></div>
        </div>
        <div class="tfp-sec">
          <div class="tfp-sec-head"><span class="tfp-sec-title"><i data-lucide="files"></i> Document collection <span class="tfp-sub" id="tfp-n"></span></span></div>
          <div class="tfp-docs" id="tfp-docs"></div>
          <div class="tfp-row">
            <button class="tfp-btn" id="tfp-add"><i data-lucide="plus"></i>Add document</button>
            <button class="tfp-btn" id="tfp-addw"><i data-lucide="copy-plus"></i><span id="tfp-addw-label">Add doc with word</span></button>
            <button class="tfp-btn ghost" id="tfp-docreset"><i data-lucide="rotate-ccw"></i>Default docs</button>
          </div>
        </div>` : `
        <div class="tfp-sec">
          <div class="tfp-sec-head"><span class="tfp-sec-title"><i data-lucide="mouse-pointer-click"></i> Selected word</span></div>
          <div class="tfp-selinfo" id="tfp-selinfo"></div>
        </div>`}
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
      const A = analyze();
      explainPreset(A, p.label);
      resnap(); update();
    }));

    ctrlHost.querySelector('#tfp-reset').addEventListener('click', () => {
      const p = PRESETS.find(x => x.key === state.preset) || PRESETS[0];
      state.preset = p.key; state.text = p.text; state.corpus = DEFAULT_CORPUS.slice();
      state.selected = null; state.stepMode = false; state.step = 0; state.tfView = 'weights';
      state.msg = { kind: 'info', html: `Reset to the “${esc(p.label)}” preset and the ${DEFAULT_CORPUS.length} default background documents.` };
      buildControls(); resnap(); update();
    });

    ctrlHost.querySelector('#tfp-stepmode').addEventListener('click', () => toggleStepMode());
    ctrlHost.querySelectorAll('.tfp-lang [data-lang]').forEach(b => b.addEventListener('click', () => switchLang(b.dataset.lang)));

    if (isT) {
      ctrlHost.querySelector('#tfp-word').addEventListener('change', e => selectWord(e.target.value, true));
      ctrlHost.querySelector('#tfp-add').addEventListener('click', () => {
        state.corpus.push('');
        buildDocs(true);
        update();
      });
      ctrlHost.querySelector('#tfp-addw').addEventListener('click', () => {
        const A = analyze();
        const w = effectiveSelection(A);
        if (!w) return;
        const prev = A;
        state.corpus.push(LANGS[state.lang].addDoc(w));
        buildDocs(false);
        const cur = analyze();
        explainCorpus(prev, cur, `Added d${cur.docs.length} containing ${q(w)}.`);
        resnap(); update();
      });
      ctrlHost.querySelector('#tfp-docreset').addEventListener('click', () => {
        const prev = analyze();
        state.corpus = DEFAULT_CORPUS.slice();
        buildDocs(false);
        explainCorpus(prev, analyze(), 'Restored the default documents.');
        resnap(); update();
      });
      buildDocs(false);
    }
    icons();
  }

  function buildDocs(focusLast) {
    const host = ctrlHost.querySelector('#tfp-docs');
    if (!host) return;
    host.innerHTML = `
      <div class="tfp-doc own"><span class="tfp-doc-id">d₁</span><span class="tfp-doc-own" id="tfp-d1">${esc(state.text) || '<i>(empty)</i>'}</span><span class="tfp-doc-tag">your text</span></div>
      ${state.corpus.map((t, i) => `
        <div class="tfp-doc" data-ci="${i}">
          <span class="tfp-doc-id">d${sub(i + 2)}</span>
          <input class="tfp-doc-in" data-ci="${i}" value="${esc(t)}" placeholder="Type a document…" spellcheck="false">
          <button class="tfp-doc-x" data-ci="${i}" title="Remove this document" aria-label="Remove document d${i + 2}">×</button>
        </div>`).join('')}`;
    host.querySelectorAll('.tfp-doc-in').forEach(inp => inp.addEventListener('input', () => {
      state.corpus[+inp.dataset.ci] = inp.value;
      update();
      scheduleExplain('corpus', `Edited d${+inp.dataset.ci + 2}.`);
    }));
    host.querySelectorAll('.tfp-doc-x').forEach(btn => btn.addEventListener('click', () => {
      const prev = analyze();
      const i = +btn.dataset.ci;
      state.corpus.splice(i, 1);
      buildDocs(false);
      explainCorpus(prev, analyze(), `Removed d${i + 2}.`);
      resnap(); update();
    }));
    if (focusLast) {
      const ins = host.querySelectorAll('.tfp-doc-in');
      if (ins.length) ins[ins.length - 1].focus();
      setMsg('info', 'Blank document added — type into it. Empty documents are ignored (they do not count toward N).');
    }
  }
  function sub(n) { return String(n).split('').map(d => '₀₁₂₃₄₅₆₇₈₉'[+d]).join(''); }

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
    const A = analyze();
    const top = A.bowOrder[0], dist = A.tfOrder[0];
    state.msg = { kind: 'info', html: l === 'my'
      ? `Switched to <b>Burmese (မြန်မာ)</b>${sv ? ' — your earlier Burmese text and documents are restored' : ''}. Burmese has no spaces between words, so the texts are pre-segmented with spaces. Everything else — tokens, counts, vectors, TF-IDF — works exactly the same.${top ? ` Most frequent: ${q(top.w)} (${top.c}×); most distinctive: ${q(dist.w)}.` : ''}`
      : `Switched to <b>English</b>${sv ? ' — your earlier English text and documents are restored' : ''}.${top ? ` Most frequent: ${q(top.w)} (${top.c}×); most distinctive: ${q(dist.w)}.` : ''}` };
    buildControls(); resnap(); update();
  }

  function toggleStepMode(force) {
    state.stepMode = typeof force === 'boolean' ? force : !state.stepMode;
    if (state.stepMode) {
      state.step = 0;
      setMsgStep();
    } else {
      state.msg = { kind: 'info', html: 'Back to free play — every edit now updates all views at once.' };
    }
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
    const cap = state.step === 1 ? LANGS[state.lang].tokCaption : STEP_CAPTIONS[state.step];
    state.msg = { kind: 'step', html: `Step ${state.step + 1} of ${STEPS.length} — <b>${STEPS[state.step].name}</b>. ${cap}` };
  }

  const STEP_CAPTIONS = [
    'A model cannot multiply words — right now this is just a string of characters.',
    'Split the string into word tokens: lowercase, remove punctuation, drop 1-letter tokens.',
    'Collect the unique tokens and fix an order (alphabetical). Each word gets one slot.',
    'Count how often each vocabulary word occurs. Repeated words get bigger counts.',
    'Write the counts in vocabulary order: the text is now a vector of numbers (Bag-of-Words).',
    'Re-weight each count by rarity across the document collection: TF × ln(N / DF).'
  ];

  function selectWord(w, fromSelect) {
    const A = analyze();
    if (!w || !A.counts[w]) return;
    state.selected = (!fromSelect && state.selected === w && mode === 'bow') ? null : w;
    if (state.selected) explainSelect(A, w);
    else setMsg('info', 'Selection cleared.');
    update();
  }

  function updateControls(A) {
    const sel = effectiveSelection(A);
    const stats = ctrlHost.querySelector('#tfp-stats');
    if (stats) stats.innerHTML = `${A.tokens.length} tokens · |V| = ${A.vocab.length}`;

    const nav = ctrlHost.querySelector('#tfp-stepnav');
    if (nav) {
      nav.hidden = !state.stepMode;
      if (state.stepMode) {
        nav.innerHTML = `
          <button class="tfp-btn" data-nav="-1" ${state.step === 0 ? 'disabled' : ''}><i data-lucide="chevron-left"></i>Prev</button>
          <span class="tfp-stepnav-lbl">Step ${state.step + 1}/${STEPS.length} · <b>${STEPS[state.step].name}</b></span>
          ${state.step < STEPS.length - 1
            ? `<button class="tfp-btn primary" data-nav="1">Next Step<i data-lucide="chevron-right"></i></button>`
            : `<button class="tfp-btn primary" data-nav="done"><i data-lucide="check"></i>Finish</button>`}`;
        nav.querySelectorAll('[data-nav]').forEach(b => b.addEventListener('click', () => {
          if (b.dataset.nav === 'done') toggleStepMode(false); else goStep(state.step + (+b.dataset.nav));
        }));
      }
    }

    const selinfo = ctrlHost.querySelector('#tfp-selinfo');
    if (selinfo) {
      const w = state.selected && A.counts[state.selected] ? state.selected : null;
      selinfo.innerHTML = w ? `
        <div class="tfp-selword">${q(w)} <span class="tfp-pill">count = ${A.counts[w]}</span><span class="tfp-pill">slot x[${A.vIndex[w]}]</span><button class="tfp-link" id="tfp-clear">clear</button></div>
        <div class="tfp-formula">x[${A.vIndex[w]}] = count(“${esc(w)}”, d₁) = <b>${A.counts[w]}</b> &nbsp;·&nbsp; share of text = ${A.counts[w]}/${A.tokens.length} = ${f3(A.counts[w] / A.tokens.length)}</div>`
        : `<div class="tfp-hint">Click any word — in the highlighted text, a bar, a token chip or a vector cell — to highlight all its occurrences and see its feature value.</div>`;
      const c = selinfo.querySelector('#tfp-clear');
      if (c) c.addEventListener('click', () => { state.selected = null; setMsg('info', 'Selection cleared.'); update(); });
    }

    const selEl = ctrlHost.querySelector('#tfp-word');
    if (selEl) {
      const opts = A.tfOrder.map(r => `<option value="${esc(r.w)}" ${r.w === sel ? 'selected' : ''}>${esc(r.w)}</option>`).join('');
      if (selEl.dataset.sig !== opts) { selEl.innerHTML = opts || '<option>—</option>'; selEl.dataset.sig = opts; }
      selEl.value = sel || '';
    }

    const calc = ctrlHost.querySelector('#tfp-calc');
    if (calc) {
      const r = sel ? A.byWord[sel] : null;
      calc.innerHTML = r ? `
        <div class="tfp-calc-line"><span class="tfp-calc-k">TF</span><span>= count(“${esc(r.w)}”, d₁) / |d₁| = ${r.c} / ${A.tokens.length} = <b>${f3(r.tf)}</b></span></div>
        <div class="tfp-calc-line"><span class="tfp-calc-k">DF</span><span>= # documents containing “${esc(r.w)}” = <b>${r.df}</b> of N = ${A.N}</span></div>
        <div class="tfp-calc-line"><span class="tfp-calc-k">IDF</span><span>= ln(N / DF) = ln(${A.N} / ${r.df}) = <b>${f3(r.idf)}</b></span></div>
        <div class="tfp-calc-line total"><span class="tfp-calc-k">TF-IDF</span><span>= TF × IDF = ${f3(r.tf)} × ${f3(r.idf)} = <b>${f3(r.tfidf)}</b></span></div>
        ${A.N === 1 ? '<div class="tfp-warn">Only one document: every word has DF = N, so IDF = ln(1) = 0. Add documents to see rarity weighting.</div>'
          : r.df === A.N ? `<div class="tfp-warn">“${esc(r.w)}” appears in <b>every</b> document → IDF = 0, so it carries no distinguishing information.</div>` : ''}`
        : '<div class="tfp-hint">Type some text to compute TF-IDF.</div>';
    }

    const nEl = ctrlHost.querySelector('#tfp-n');
    if (nEl) {
      const ignored = A.docs.length - A.N;
      nEl.textContent = `N = ${A.N}${ignored ? ` (${ignored} empty ignored)` : ''}`;
    }
    const d1 = ctrlHost.querySelector('#tfp-d1');
    if (d1) d1.innerHTML = esc(state.text) || '<i>(empty)</i>';
    if (ctrlHost.querySelector('#tfp-docs')) {
      ctrlHost.querySelectorAll('.tfp-doc[data-ci]').forEach(row => {
        const d = A.docs[+row.dataset.ci + 1];
        row.classList.toggle('has', !!(sel && d && d.set.has(sel)));
        row.classList.toggle('empty', !!(d && d.empty));
      });
      const own = ctrlHost.querySelector('.tfp-doc.own');
      if (own) own.classList.toggle('has', !!sel);
    }
    const addw = ctrlHost.querySelector('#tfp-addw-label');
    if (addw) addw.textContent = sel ? `Add doc with “${sel}”` : 'Add doc with word';
    icons();
  }

  // ---------------------------------------------------------------------------
  // Visual building blocks
  // ---------------------------------------------------------------------------
  function highlightedText(A, sel) {
    if (!state.text.trim()) return '<span class="tfp-empty">Type something in the text box…</span>';
    let html = '', pos = 0;
    A.pieces.forEach(p => {
      html += esc(state.text.slice(pos, p.start));
      if (!p.kept) html += `<span class="tfp-w drop" title="1-letter token — dropped">${esc(p.raw)}</span>`;
      else {
        const c = A.colorOf[p.word];
        const cls = ['tfp-w', c !== undefined ? `rep tfp-c${c}` : '', p.word === sel ? 'sel' : ''].join(' ');
        html += `<span class="${cls}" data-w="${esc(p.word)}">${esc(p.raw)}</span>`;
      }
      pos = p.end;
    });
    return html + esc(state.text.slice(pos));
  }

  function tokenChips(A, sel, showDropped) {
    if (!A.pieces.length) return '<span class="tfp-empty">No tokens yet.</span>';
    return A.pieces.filter(p => p.kept || showDropped).map(p => {
      if (!p.kept) return `<span class="tfp-chip drop" title="dropped (1 letter)">${esc(p.word)}</span>`;
      const c = A.colorOf[p.word];
      return `<span class="tfp-chip ${c !== undefined ? `rep tfp-c${c}` : ''} ${p.word === sel ? 'sel' : ''}" data-w="${esc(p.word)}">${esc(p.word)}</span>`;
    }).join('');
  }

  function bars(A, sel, limit) {
    if (!A.bowOrder.length) return '<span class="tfp-empty">No words to count.</span>';
    const rows = A.bowOrder.slice(0, limit || 999);
    const more = A.bowOrder.length - rows.length;
    return `<div class="tfp-bars">${rows.map(r => {
      const c = A.colorOf[r.w];
      return `<div class="tfp-bar-row ${r.w === sel ? 'sel' : ''}" data-w="${esc(r.w)}">
        <span class="tfp-bar-lbl">${esc(r.w)}</span>
        <span class="tfp-bar-track"><span class="tfp-bar-fill ${c !== undefined ? `tfp-bg${c}` : ''}" style="width:${(r.c / A.maxCount) * 100}%"></span></span>
        <span class="tfp-bar-val">${r.c}</span></div>`;
    }).join('')}</div>${more > 0 ? `<div class="tfp-more">+ ${more} more word${more > 1 ? 's' : ''} with smaller counts</div>` : ''}`;
  }

  function vectorGrid(A, sel, valFn, fmt, heatMax, cls) {
    if (!A.vocab.length) return '<span class="tfp-empty">Empty vector.</span>';
    return `<div class="tfp-vec ${cls || ''}">${A.vocab.map((w, i) => {
      const v = valFn(w);
      const a = heatMax > 0 ? Math.max(0.06, v / heatMax) : 0.06;
      return `<div class="tfp-vcell ${w === sel ? 'sel' : ''}" data-w="${esc(w)}" title="x[${i}] = ${esc(w)}">
        <span class="tfp-vval" style="--a:${a.toFixed(3)}">${fmt(v)}</span><span class="tfp-vidx">${i}</span><span class="tfp-vword">${esc(w)}</span></div>`;
    }).join('')}</div>`;
  }

  function vectorInline(A, valFn, fmt) {
    const vals = A.vocab.map(w => fmt(valFn(w)));
    const shown = vals.slice(0, 24);
    return `x = [ ${shown.join(', ')}${vals.length > shown.length ? `, … (${vals.length - shown.length} more)` : ''} ]`;
  }

  function card(title, sub, body, extraCls) {
    return `<section class="tfp-card ${extraCls || ''}"><header class="tfp-card-head"><h4>${title}</h4>${sub ? `<span class="tfp-card-sub">${sub}</span>` : ''}</header>${body}</section>`;
  }

  function tag(r, N) {
    if (N <= 1) return '';
    if (r.df === N) return '<span class="tfp-tag every">in every doc</span>';
    if (r.df === 1) return '<span class="tfp-tag unique">only in d₁</span>';
    if (r.df / N >= 0.5) return '<span class="tfp-tag common">common</span>';
    return '';
  }

  // ---------------------------------------------------------------------------
  // Views
  // ---------------------------------------------------------------------------
  function viewBoW(A) {
    const sel = state.selected && A.counts[state.selected] ? state.selected : null;
    const repeated = A.bowOrder.filter(r => r.c > 1).length;
    return `
      ${card('Original text', sel ? `${A.counts[sel]} occurrence${A.counts[sel] > 1 ? 's' : ''} of “${esc(sel)}” highlighted` : 'click any word', `<div class="tfp-src">${highlightedText(A, sel)}</div>`)}
      ${card(`Tokens <span class="tfp-count">${A.tokens.length}</span>`, repeated ? `${repeated} repeated word${repeated > 1 ? 's' : ''} colour-coded` : 'no repeated words', `${segWarn(A)}<div class="tfp-chips">${tokenChips(A, sel, false)}</div>`)}
      ${card('Word-frequency chart', 'sorted by count', bars(A, sel, 14))}
      ${card(`Feature vector x <span class="tfp-count">|V| = ${A.vocab.length}</span>`, 'slots in fixed alphabetical vocabulary order',
        vectorGrid(A, sel, w => A.counts[w], v => String(v), A.maxCount) +
        `<div class="tfp-mono">${vectorInline(A, w => A.counts[w], v => String(v))}</div>`)}`;
  }

  function viewTfidf(A) {
    const sel = effectiveSelection(A);
    const tabs = `<div class="tfp-seg">
      <button class="${state.tfView === 'weights' ? 'active' : ''}" data-view="weights">TF-IDF weights</button>
      <button class="${state.tfView === 'compare' ? 'active' : ''}" data-view="compare">BoW vs TF-IDF</button></div>`;
    return tabs + (state.tfView === 'compare' ? viewCompare(A) : viewWeights(A, sel));
  }

  function docStrip(A, sel) {
    return `<div class="tfp-dstrip">${A.docs.map(d => {
      const has = sel && d.set.has(sel);
      const cls = d.empty && !d.own ? 'off' : has ? 'has' : '';
      return `<div class="tfp-dbox ${cls}" title="${esc(d.text || '(empty — ignored)')}"><b>d${sub(d.id)}</b><span>${d.empty && !d.own ? 'empty' : has ? '✓' : '·'}</span></div>`;
    }).join('')}</div>`;
  }

  function viewWeights(A, sel) {
    if (!A.rows.length) return card('TF-IDF weights', '', '<span class="tfp-empty">Type some text to compute weights.</span>');
    const r = A.byWord[sel];
    const top = A.bowOrder[0], dist = A.tfOrder[0];
    const strip = card(`Where does “${esc(sel)}” appear?`, `DF = ${r.df} of N = ${A.N} documents`,
      docStrip(A, sel) + `<div class="tfp-mono">IDF = ln(${A.N}/${r.df}) = ${f3(r.idf)} &nbsp;→&nbsp; TF-IDF = ${f3(r.tf)} × ${f3(r.idf)} = <b>${f3(r.tfidf)}</b></div>`);
    const contrast = `<div class="tfp-contrast">
        <div class="tfp-ct freq"><span>Most <b>frequent</b> (BoW)</span>${q(top.w)}<small>${top.c}× · in ${top.df}/${A.N} docs · TF-IDF ${f3(top.tfidf)}</small></div>
        <div class="tfp-ct dist"><span>Most <b>distinctive</b> (TF-IDF)</span>${q(dist.w)}<small>${dist.c}× · in ${dist.df}/${A.N} docs · TF-IDF ${f3(dist.tfidf)}</small></div>
      </div>`;
    const table = `<div class="tfp-table-wrap"><table class="tfp-table">
      <thead><tr><th>term</th><th>count</th><th>TF</th><th>DF</th><th>IDF</th><th class="w">TF-IDF</th></tr></thead>
      <tbody>${A.tfOrder.map(x => `
        <tr class="${x.w === sel ? 'sel' : ''}" data-w="${esc(x.w)}">
          <td class="t">${esc(x.w)} ${tag(x, A.N)}</td><td>${x.c}</td><td>${f3(x.tf)}</td><td>${x.df}</td><td>${f3(x.idf)}</td>
          <td class="w"><span class="tfp-mini"><span style="width:${A.maxTfidf > 0 ? (x.tfidf / A.maxTfidf) * 100 : 0}%"></span></span><b>${f3(x.tfidf)}</b></td>
        </tr>`).join('')}</tbody></table></div>`;
    return contrast + strip + card('TF-IDF table for d₁', 'sorted by TF-IDF · click a row', table);
  }

  function viewCompare(A) {
    if (!A.rows.length) return card('BoW vs TF-IDF', '', '<span class="tfp-empty">Type some text to compare.</span>');
    const sel = effectiveSelection(A);
    const moves = A.rows.map(r => ({ r, d: r.bowRank - r.tfRank }));
    const up = moves.slice().sort((a, b) => b.d - a.d || b.r.tfidf - a.r.tfidf)[0];
    const down = moves.slice().sort((a, b) => a.d - b.d || b.r.c - a.r.c)[0];
    const summary = `<div class="tfp-contrast">
      <div class="tfp-ct dist"><span>Biggest climber</span>${q(up.r.w)}<small>rank #${up.r.bowRank} → #${up.r.tfRank} · in ${up.r.df}/${A.N} docs</small></div>
      <div class="tfp-ct freq"><span>Biggest faller</span>${q(down.r.w)}<small>rank #${down.r.bowRank} → #${down.r.tfRank} · in ${down.r.df}/${A.N} docs</small></div></div>`;
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
    const vecs = card('Same text, two vectors', 'alphabetical vocabulary order',
      `<div class="tfp-lbl">Bag-of-Words</div>${vectorGrid(A, sel, w => A.counts[w], v => String(v), A.maxCount, 'compact')}
       <div class="tfp-lbl">TF-IDF</div>${vectorGrid(A, sel, w => A.byWord[w].tfidf, v => f3(v).replace(/^0\./, '.'), A.maxTfidf, 'compact tf')}`);
    return summary + card('Ranking: frequency vs. distinctiveness', 'sorted by TF-IDF · bars scaled to each column’s max', `<div class="tfp-cmp">${body}</div>`) + vecs;
  }

  // ---- Step-by-step pipeline ----
  function viewSteps(A) {
    const k = state.step;
    const sel = effectiveSelection(A);
    const summaries = [
      `${state.text.length} chars`, `${A.tokens.length} tokens`, `|V| = ${A.vocab.length}`,
      A.bowOrder[0] ? `max ${A.maxCount}×` : '—', `${A.vocab.length}-dim`, `N = ${A.N}`
    ];
    const pipe = `<div class="tfp-pipe">${STEPS.map((s, i) => `
      <button class="tfp-pipe-step ${i < k ? 'done' : ''} ${i === k ? 'cur' : ''}" data-step="${i}">
        <span class="tfp-pipe-n">${i + 1}</span><span class="tfp-pipe-name">${s.name}</span><span class="tfp-pipe-sum">${i <= k ? summaries[i] : ''}</span>
      </button>${i < STEPS.length - 1 ? '<span class="tfp-pipe-arrow">→</span>' : ''}`).join('')}</div>`;

    let body = '';
    switch (k) {
      case 0:
        body = `<blockquote class="tfp-raw">${esc(state.text) || '<i>(empty)</i>'}</blockquote>
          <p class="tfp-p">To the computer this is <b>${state.text.length} characters</b>${state.lang === 'my' ? ' (Unicode code points — a Burmese syllable is often several of them: consonant + vowel signs + tone marks)' : ''}. ${state.lang === 'my' ? 'Punctuation and spacing' : 'Capital letters, punctuation and spacing'} are all still here — and there is nothing yet that a model can add or multiply.</p>`;
        break;
      case 1: {
        const dropped = A.pieces.filter(p => !p.kept).length;
        body = `<div class="tfp-rules">${LANGS[state.lang].rules.map(r => `<span>${r}</span>`).join('')}</div>${segWarn(A)}
          <div class="tfp-src small">${highlightedText(A, null)}</div>
          <div class="tfp-arrow-down">↓</div>
          <div class="tfp-chips">${tokenChips(A, null, true)}</div>
          <p class="tfp-p"><b>${A.tokens.length} tokens</b>${dropped ? ` (${dropped} one-letter token${dropped > 1 ? 's' : ''} dropped)` : ''}. Same colour = same word repeated.</p>`;
        break;
      }
      case 2:
        body = `<div class="tfp-chips">${A.vocab.map((w, i) => `<span class="tfp-chip vocab" data-w="${esc(w)}"><sub>${i}</sub>${esc(w)}</span>`).join('') || '<span class="tfp-empty">Empty vocabulary.</span>'}</div>
          <p class="tfp-p">${A.tokens.length} tokens → <b>|V| = ${A.vocab.length}</b> unique words (${A.tokens.length - A.vocab.length} repeat${A.tokens.length - A.vocab.length === 1 ? '' : 's'} merged). ${state.lang === 'my' ? 'Burmese alphabetical (Unicode) order' : 'Alphabetical order'} fixes which slot each word owns — word <i>order in the sentence</i> is thrown away (that's the “bag”).</p>`;
        break;
      case 3:
        body = bars(A, state.selected, 14) + `<p class="tfp-p">Each bar is count(w, d). ${A.bowOrder[0] ? `${q(A.bowOrder[0].w)} is the most frequent word (${A.maxCount}×).` : ''} In Bag-of-Words, <b>repeating a word directly raises its feature value</b>.</p>`;
        break;
      case 4:
        body = vectorGrid(A, state.selected, w => A.counts[w], v => String(v), A.maxCount) +
          `<div class="tfp-mono">${vectorInline(A, w => A.counts[w], v => String(v))}</div>
          <p class="tfp-p">The text is now a point in a <b>${A.vocab.length}-dimensional</b> space. In a real corpus the vocabulary spans every document (here ${A.corpusVocabSize} words), so most slots of a single message would be 0 — a <i>sparse</i> vector.</p>`;
        break;
      case 5: {
        const r = sel ? A.byWord[sel] : null;
        body = `<div class="tfp-lbl">BoW counts</div>${vectorGrid(A, sel, w => A.counts[w], v => String(v), A.maxCount, 'compact')}
          <div class="tfp-arrow-down">× IDF (rarity across N = ${A.N} documents) ↓</div>
          <div class="tfp-lbl">TF-IDF weights</div>${vectorGrid(A, sel, w => A.byWord[w].tfidf, v => f3(v).replace(/^0\./, '.'), A.maxTfidf, 'compact tf')}
          ${r ? `<div class="tfp-mono">“${esc(r.w)}”: TF ${r.c}/${A.tokens.length} = ${f3(r.tf)} · IDF ln(${A.N}/${r.df}) = ${f3(r.idf)} · TF-IDF = <b>${f3(r.tfidf)}</b></div>` : ''}
          <p class="tfp-p">${A.bowOrder[0] && A.tfOrder[0] && A.bowOrder[0].w !== A.tfOrder[0].w
            ? `Most frequent word ${q(A.bowOrder[0].w)} is in ${A.bowOrder[0].df}/${A.N} documents, so its weight shrinks; ${q(A.tfOrder[0].w)} is rarer and becomes the <b>strongest feature</b>.`
            : 'Words that appear in many documents are scaled down; words that are rare in the collection keep high weights.'} Edit the collection in the <b>TF-IDF Rarity Weighting</b> tab.</p>`;
        break;
      }
    }
    const nav = `<div class="tfp-row end">
      <button class="tfp-btn" data-go="${k - 1}" ${k === 0 ? 'disabled' : ''}>← Prev</button>
      ${k < STEPS.length - 1 ? `<button class="tfp-btn primary" data-go="${k + 1}">Next Step →</button>` : '<button class="tfp-btn primary" data-go="done">✓ Finish — free play</button>'}</div>`;
    return pipe + card(`Step ${k + 1} · ${STEPS[k].name}`, '', body + nav, 'tfp-stepcard');
  }

  // ---------------------------------------------------------------------------
  // Render / update
  // ---------------------------------------------------------------------------
  function update() {
    if (!vizHost || !document.body.contains(vizHost)) return;
    const A = analyze();
    const title = state.stepMode ? 'Step-by-Step: Text → Numbers'
      : mode === 'bow' ? 'Bag-of-Words · live' : 'TF-IDF Rarity Weighting · live';
    const scrollTop = vizHost.scrollTop;
    vizHost.innerHTML = `
      <div class="tfp-viz ${state.lang === 'my' ? 'tfp-my' : ''}" lang="${state.lang}">
        <div class="tfp-viz-head"><h3>${title}</h3>
          <span class="tfp-stat-chips"><span>${A.tokens.length} tokens</span><span>|V| ${A.vocab.length}</span>${mode === 'tfidf' || state.stepMode ? `<span>N ${A.N}</span>` : ''}</span></div>
        ${msgHTML()}
        ${state.stepMode ? viewSteps(A) : mode === 'bow' ? viewBoW(A) : viewTfidf(A)}
        <div class="tfp-foot"><i data-lucide="arrow-right-circle"></i> These word features are exactly what <b>Naive Bayes</b> (next concept) uses to classify text.</div>
      </div>`;
    vizHost.scrollTop = scrollTop;
    updateControls(A);
  }

  function onVizClick(e) {
    if (!vizHost || !vizHost.querySelector('.tfp-viz')) return; // another concept is showing
    const go = e.target.closest('[data-go]');
    if (go) { if (go.dataset.go === 'done') toggleStepMode(false); else goStep(+go.dataset.go); return; }
    const st = e.target.closest('[data-step]');
    if (st) { goStep(+st.dataset.step); return; }
    const v = e.target.closest('[data-view]');
    if (v) {
      state.tfView = v.dataset.view;
      if (state.tfView === 'compare') {
        const A = analyze();
        const top = A.bowOrder[0], dist = A.tfOrder[0];
        if (top) setMsg('info', `Same input, two encodings. BoW rewards repetition (${q(top.w)} wins with ${top.c}×); TF-IDF rewards repetition <i>and</i> rarity (${q(dist.w)} wins). Green ▲ = word gained importance under TF-IDF.`);
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
      // Fallback: no concept-column host — put controls above the visualization.
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

  window.TextFeaturesLab = { render, _state: state, _analyze: analyze };
})();
