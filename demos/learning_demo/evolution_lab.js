/**
 * evolution_lab.js — Topic 06 · Tab 0 "Evolution" · Interactive labs for
 * learning.html (same layout pattern as text_features_lab.js):
 *   controls + live formulas in the concept column (#lr-concept-lab),
 *   live visualisation in the illustration column, a "what changed" box,
 *   and a guided Next-Step walkthrough per concept.
 *
 *   1. Rules vs. Empirical Learning — Spam Filter Showdown: hand-written
 *      keyword rules vs. word weights counted from labelled examples.
 *   2. Four Learning Paradigms — one clickable 2-D dataset seen through
 *      Supervised (linear classifier), Unsupervised (K-Means, labels hidden),
 *      Neural Network (small MLP, non-linear boundary), plus a Reinforcement
 *      Learning gridworld (Q-learning from reward only) and a quiz.
 *   3. Static vs. Sequential Decisions — an i.i.d. inbox you can shuffle vs.
 *      a corridor MDP where actions change the state and γ changes the plan.
 *
 * All models are tiny, deterministic (seeded) and self-contained.
 * Exposes window.EvolutionLab = { renderRules, renderParadigms, renderSequential }.
 */
(function () {
  'use strict';

  // ===========================================================================
  // Shared helpers
  // ===========================================================================
  function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  const f2 = x => (Math.abs(x) < 5e-3 ? 0 : x).toFixed(2);
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0) + '%';
  const q = w => `<b class="tfp-q">“${esc(w)}”</b>`;
  function icons() { if (window.lucide) window.lucide.createIcons(); }
  function tok(text) { return (String(text || '').toLowerCase().match(/[a-z0-9_]+/g) || []).filter(w => w.length > 1); }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(rng) { let u = 0, v = 0; while (u === 0) u = rng(); v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

  const MSG_TAGS = { info: 'Note', step: 'Step', change: 'What changed', good: 'Result', warn: 'Watch out', select: 'Inspect', quiz: 'Quiz' };
  function msgHTML(m, fallback) {
    if (!m) return `<div class="tfp-msg" id="evo-msg"><span class="tfp-msg-tag">Try it</span><span>${fallback}</span></div>`;
    const cls = { step: 'tfp-msg-step', select: 'tfp-msg-select', warn: 'tfp-msg-select', change: 'tfp-msg-corpus', quiz: 'tfp-msg-corpus' }[m.kind] || '';
    return `<div class="tfp-msg ${cls}" id="evo-msg"><span class="tfp-msg-tag">${MSG_TAGS[m.kind] || 'Note'}</span><span>${m.html}</span></div>`;
  }

  function card(title, sub, body, cls) {
    return `<section class="tfp-card ${cls || ''}"><header class="tfp-card-head"><h4>${title}</h4>${sub ? `<span class="tfp-card-sub">${sub}</span>` : ''}</header>${body}</section>`;
  }

  // Story (guided walkthrough) UI — shared
  function storySection(lab) {
    const s = lab.state.story;
    const steps = lab.STEPS;
    if (!s.on) {
      return `<div class="tfp-sec evo-story">
        <div class="tfp-sec-head"><span class="tfp-sec-title"><i data-lucide="list-ordered"></i> Guided walkthrough <span class="tfp-sub">${steps.length} steps</span></span>
        <button class="tfp-btn primary" data-act="story-start"><i data-lucide="play"></i>Start</button></div>
        <div class="tfp-hint">${lab.storyBlurb}</div></div>`;
    }
    return `<div class="tfp-sec evo-story on">
      <div class="tfp-sec-head"><span class="tfp-sec-title"><i data-lucide="list-ordered"></i> Guided walkthrough</span>
        <button class="tfp-link" data-act="story-exit">exit</button></div>
      <div class="evo-dots">${steps.map((st, i) => `<button class="evo-dot ${i < s.k ? 'done' : ''} ${i === s.k ? 'cur' : ''}" data-act="story-go" data-k="${i}" title="${esc(st.name)}">${i + 1}</button>`).join('')}</div>
      <div class="tfp-stepnav">
        <button class="tfp-btn" data-act="story-go" data-k="${s.k - 1}" ${s.k === 0 ? 'disabled' : ''}><i data-lucide="chevron-left"></i>Prev</button>
        <span class="tfp-stepnav-lbl">Step ${s.k + 1}/${steps.length} · <b>${steps[s.k].name}</b></span>
        ${s.k < steps.length - 1
          ? `<button class="tfp-btn primary" data-act="story-go" data-k="${s.k + 1}">Next Step<i data-lucide="chevron-right"></i></button>`
          : '<button class="tfp-btn primary" data-act="story-exit"><i data-lucide="check"></i>Finish</button>'}
      </div></div>`;
  }
  function storyGo(lab, k) {
    const s = lab.state.story;
    s.on = true; s.k = Math.max(0, Math.min(lab.STEPS.length - 1, k));
    const st = lab.STEPS[s.k];
    st.apply();
    lab.state.msg = { kind: 'step', html: `Step ${s.k + 1} of ${lab.STEPS.length} — <b>${st.name}</b>. ${typeof st.caption === 'function' ? st.caption() : st.caption}` };
  }
  function storyExit(lab) {
    lab.state.story.on = false;
    lab.state.msg = { kind: 'info', html: 'Free play — change anything and watch both panels react.' };
  }

  // Generic mount: controls into #lr-concept-lab, viz into the graph column
  function mount(lab, col) {
    lab.viz = col;
    let host = document.getElementById('lr-concept-lab');
    if (!host) {
      col.innerHTML = '';
      host = document.createElement('div');
      const v = document.createElement('div');
      col.appendChild(host); col.appendChild(v);
      lab.viz = v;
    }
    lab.ctrl = host;
    const handler = e => {
      if (!lab.viz.querySelector(`.evo-viz[data-lab="${lab.id}"]`) && !lab.ctrl.querySelector(`.evo-ctrl[data-lab="${lab.id}"]`)) return;
      lab.onClick(e);
    };
    // Assigning (not adding) avoids stacking handlers across re-renders.
    lab.viz.onclick = handler;
    lab.ctrl.onclick = handler;
    lab.ctrl.oninput = e => { if (lab.onInput) lab.onInput(e); };
    lab.ctrl.onchange = e => { if (lab.onChange) lab.onChange(e); };
    lab.ctrl.onkeydown = e => {
      if (e.key === 'Enter' && e.target.matches('input[data-enter]')) {
        e.preventDefault();
        const b = lab.ctrl.querySelector(`[data-act="${e.target.dataset.enter}"]`);
        if (b) b.click();
      }
    };
    lab.refresh(true);
  }

  // ===========================================================================
  // LAB 1 — Rules vs. Empirical Learning: Spam Filter Showdown
  // ===========================================================================
  const R_RULES0 = ['free', 'win', 'prize'];
  const R_PATCH = ['cash', 'claim', 'bonus', 'offer'];
  const R_TEST0 = [
    { t: 'WIN a free prize now!', y: 'spam' },
    { t: 'Claim your cash reward today', y: 'spam' },
    { t: 'Are you free for lunch tomorrow?', y: 'ham' },
    { t: 'Project meeting moved to Friday', y: 'ham' },
    { t: 'You are a winner, click to collect your prize', y: 'spam' },
    { t: 'Please review the attached report', y: 'ham' },
    { t: 'Claim your conference badge at the front desk', y: 'ham' }
  ];
  const R_ADAPT = [
    { t: 'Cl4im fr33 c4sh b0nus n0w', y: 'spam' },
    { t: 'Exclusive offer: collect your bonus money today', y: 'spam' }
  ];
  const R_TRAIN0 = [
    { t: 'Win a free cash prize', y: 'spam' },
    { t: 'Claim your free bonus now', y: 'spam' },
    { t: 'Exclusive prize offer for winners', y: 'spam' },
    { t: 'Collect your cash reward today', y: 'spam' },
    { t: 'Click now to win money', y: 'spam' },
    { t: 'Are you free for a meeting tomorrow', y: 'ham' },
    { t: 'Project report attached for review', y: 'ham' },
    { t: 'Lunch on Friday with the team', y: 'ham' },
    { t: 'Please collect your badge at the desk', y: 'ham' },
    { t: 'Thanks for the helpful feedback', y: 'ham' }
  ];
  const R_TRAIN_ADAPT = [
    { t: 'Cl4im fr33 c4sh n0w', y: 'spam' },
    { t: 'Get your fr33 b0nus c4sh', y: 'spam' }
  ];
  const clone = a => a.map(o => Object.assign({}, o));

  const RL = {
    id: 'rules',
    state: {
      rules: R_RULES0.slice(), train: [], test: clone(R_TEST0), inspect: null,
      edits: 0, story: { on: false, k: 0 }, msg: null, newLabel: 'spam', testLabel: 'spam'
    },
    storyBlurb: 'Follow a spam filter through six steps: an expert writes rules, spammers adapt, the rules need endless patching — then a learner picks the rules up from labelled data instead.'
  };

  function rLearn(train) {
    const S = train.filter(e => e.y === 'spam'), H = train.filter(e => e.y === 'ham');
    const sd = {}, hd = {};
    S.forEach(e => new Set(tok(e.t)).forEach(w => { sd[w] = (sd[w] || 0) + 1; }));
    H.forEach(e => new Set(tok(e.t)).forEach(w => { hd[w] = (hd[w] || 0) + 1; }));
    const wts = {};
    new Set([...Object.keys(sd), ...Object.keys(hd)]).forEach(w => { wts[w] = Math.log(((sd[w] || 0) + 1) / ((hd[w] || 0) + 1)); });
    return { wts, sd, hd, nS: S.length, nH: H.length, n: train.length, prior: Math.log((S.length + 1) / (H.length + 1)) };
  }
  function rPredictLearned(m, text) {
    if (!m.n) return { y: null, score: 0, contrib: [] };
    const ws = [...new Set(tok(text))];
    const contrib = ws.map(w => ({ w, v: m.wts[w] || 0 }));
    const score = m.prior + contrib.reduce((s, c) => s + c.v, 0);
    return { y: score > 0 ? 'spam' : 'ham', score, contrib };
  }
  function rPredictRules(rules, text) {
    const ws = new Set(tok(text));
    const fired = rules.filter(r => ws.has(r));
    return { y: fired.length ? 'spam' : 'ham', fired };
  }
  function rEval() {
    const s = RL.state;
    const m = rLearn(s.train);
    const res = s.test.map(e => ({ e, r: rPredictRules(s.rules, e.t), l: rPredictLearned(m, e.t) }));
    const rc = res.filter(x => x.r.y === x.e.y).length;
    const lc = m.n ? res.filter(x => x.l.y === x.e.y).length : null;
    const err = key => ({
      fp: res.filter(x => x[key].y === 'spam' && x.e.y === 'ham').length,
      fn: res.filter(x => x[key].y === 'ham' && x.e.y === 'spam').length
    });
    return { m, res, rc, lc, n: res.length, rErr: err('r'), lErr: m.n ? err('l') : null };
  }

  RL.STEPS = [
    { name: 'The expert writes rules', apply: () => { Object.assign(RL.state, { rules: R_RULES0.slice(), train: [], test: clone(R_TEST0), inspect: null, edits: 3 }); },
      caption: 'A human expert hand-codes three rules: <i>spam if the message contains “free”, “win” or “prize”</i>. No data is used — all knowledge comes from the expert.' },
    { name: 'Rules meet real mail', apply: () => { Object.assign(RL.state, { rules: R_RULES0.slice(), train: [], test: clone(R_TEST0), inspect: 2, edits: 3 }); },
      caption: () => `Rule “free” fires on a lunch invitation (a <b>false alarm</b>), while “Claim your cash reward today” slips through. Rules score ${rEval().rc}/${RL.state.test.length}.` },
    { name: 'Spammers adapt', apply: () => { Object.assign(RL.state, { rules: R_RULES0.slice(), train: [], test: clone(R_TEST0).concat(clone(R_ADAPT)), inspect: 7, edits: 3 }); },
      caption: () => `Spammers dodge the keywords (“fr33”, “c4sh”, new vocabulary). Rules fall to ${rEval().rc}/${RL.state.test.length}.` },
    { name: 'Patch the rules', apply: () => { Object.assign(RL.state, { rules: R_RULES0.concat(R_PATCH), train: [], test: clone(R_TEST0).concat(clone(R_ADAPT)), inspect: 6, edits: 7 }); },
      caption: () => `The expert adds 4 more rules (cash, claim, bonus, offer): ${rEval().rc}/${RL.state.test.length}. But “claim” now flags a conference badge email — every patch can break something else, and “c4sh” is still missed.` },
    { name: 'Learn from labelled data', apply: () => { Object.assign(RL.state, { rules: R_RULES0.concat(R_PATCH), train: clone(R_TRAIN0), test: clone(R_TEST0).concat(clone(R_ADAPT)), inspect: 7, edits: 7 }); },
      caption: () => `Instead of writing rules, we give the learner 10 labelled emails. It <b>counts</b> which words appear in spam vs. ham and builds its own weights: ${rEval().lc}/${RL.state.test.length} correct. It still misses the obfuscated “c4sh” message — it has never seen those words.` },
    { name: 'Adapt by adding data', apply: () => { Object.assign(RL.state, { rules: R_RULES0.concat(R_PATCH), train: clone(R_TRAIN0).concat(clone(R_TRAIN_ADAPT)), test: clone(R_TEST0).concat(clone(R_ADAPT)), inspect: 7, edits: 7 }); },
      caption: () => `Label just 2 new spam examples — no rule editing — and the learner adapts: ${rEval().lc}/${RL.state.test.length}. This is the shift of Topic 06: <b>h ← LEARN(Data)</b> instead of hand-coded KB rules.` }
  ];

  RL.refresh = function (rebuild) {
    if (rebuild || !RL.ctrl.querySelector('.evo-ctrl[data-lab="rules"]')) rBuildControls();
    else rUpdateControls();
    rRenderViz();
    icons();
  };

  function rBuildControls() {
    const s = RL.state;
    RL.ctrl.innerHTML = `<div class="tfp evo-ctrl" data-lab="rules">
      ${storySection(RL)}
      <div class="tfp-sec">
        <div class="tfp-sec-head"><span class="tfp-sec-title"><i data-lucide="user-cog"></i> Hand-coded rules <span class="tfp-sub">the expert</span></span><span class="tfp-sub" id="evo-r-edits"></span></div>
        <div class="tfp-hint">Predict <b>spam</b> if the message contains <b>any</b> of these words:</div>
        <div class="evo-rule-chips" id="evo-r-rules"></div>
        <div class="tfp-row"><input class="tfp-doc-in" id="evo-r-rule-in" data-enter="r-add-rule" placeholder="add a keyword, e.g. cash" spellcheck="false">
          <button class="tfp-btn" data-act="r-add-rule"><i data-lucide="plus"></i>Add rule</button></div>
      </div>
      <div class="tfp-sec">
        <div class="tfp-sec-head"><span class="tfp-sec-title"><i data-lucide="database"></i> Labelled examples <span class="tfp-sub">the data</span></span><span class="tfp-sub" id="evo-r-ntrain"></span></div>
        <div class="evo-train" id="evo-r-train"></div>
        <div class="tfp-row"><input class="tfp-doc-in" id="evo-r-train-in" data-enter="r-add-train" placeholder="type an email to label…" spellcheck="false">
          <button class="evo-lbl-toggle ${s.newLabel}" data-act="r-newlabel" id="evo-r-newlabel">${s.newLabel}</button>
          <button class="tfp-btn" data-act="r-add-train"><i data-lucide="plus"></i>Add</button></div>
        <div class="tfp-row"><button class="tfp-btn" data-act="r-load-train"><i data-lucide="download"></i>Load 10 examples</button>
          <button class="tfp-btn ghost" data-act="r-clear-train"><i data-lucide="eraser"></i>Clear data</button></div>
      </div>
      <div class="tfp-sec">
        <div class="tfp-sec-head"><span class="tfp-sec-title"><i data-lucide="inbox"></i> Test inbox <span class="tfp-sub">true labels hidden from both systems</span></span></div>
        <div class="tfp-row"><input class="tfp-doc-in" id="evo-r-test-in" data-enter="r-add-test" placeholder="write a new test email…" spellcheck="false">
          <button class="evo-lbl-toggle ${s.testLabel}" data-act="r-testlabel" id="evo-r-testlabel">${s.testLabel}</button>
          <button class="tfp-btn" data-act="r-add-test"><i data-lucide="plus"></i>Add</button></div>
        <div class="tfp-row"><button class="tfp-btn" data-act="r-adapt"><i data-lucide="shuffle"></i>Spammers adapt</button>
          <button class="tfp-btn ghost" data-act="r-reset"><i data-lucide="rotate-ccw"></i>Reset all</button></div>
      </div>
    </div>`;
    rUpdateControls();
  }

  function rUpdateControls() {
    const s = RL.state;
    const story = RL.ctrl.querySelector('.evo-story');
    if (story) story.outerHTML = storySection(RL);
    const rules = RL.ctrl.querySelector('#evo-r-rules');
    if (rules) rules.innerHTML = s.rules.length
      ? s.rules.map(r => `<span class="evo-rule">${esc(r)}<button data-act="r-del-rule" data-w="${esc(r)}" aria-label="remove rule ${esc(r)}">×</button></span>`).join('')
      : '<span class="tfp-empty">No rules — everything is predicted ham.</span>';
    const ed = RL.ctrl.querySelector('#evo-r-edits');
    if (ed) ed.textContent = `${s.rules.length} rule${s.rules.length === 1 ? '' : 's'} · ${s.edits} manual edit${s.edits === 1 ? '' : 's'}`;
    const tr = RL.ctrl.querySelector('#evo-r-train');
    if (tr) tr.innerHTML = s.train.length
      ? s.train.map((e, i) => `<div class="evo-train-row"><button class="evo-lbl-toggle ${e.y}" data-act="r-flip" data-i="${i}" title="click to flip the label">${e.y}</button><span class="evo-train-t">${esc(e.t)}</span><button class="tfp-doc-x" data-act="r-del-train" data-i="${i}" aria-label="remove example">×</button></div>`).join('')
      : '<div class="tfp-hint">No labelled data yet — the learner knows nothing and stays <i>untrained</i>.</div>';
    const nt = RL.ctrl.querySelector('#evo-r-ntrain');
    if (nt) nt.textContent = `${s.train.length} example${s.train.length === 1 ? '' : 's'}`;
    const nl = RL.ctrl.querySelector('#evo-r-newlabel');
    if (nl) { nl.className = `evo-lbl-toggle ${s.newLabel}`; nl.textContent = s.newLabel; }
    const tl = RL.ctrl.querySelector('#evo-r-testlabel');
    if (tl) { tl.className = `evo-lbl-toggle ${s.testLabel}`; tl.textContent = s.testLabel; }
  }

  function rBadge(y) { return y ? `<span class="evo-badge ${y}">${y}</span>` : '<span class="evo-badge none">untrained</span>'; }
  function rMark(ok) { return ok === null ? '' : ok ? '<span class="evo-ok">✓</span>' : '<span class="evo-bad">✗</span>'; }

  function rRenderViz() {
    const s = RL.state;
    const E = rEval();
    const top = E.m.n ? Object.entries(E.m.wts).sort((a, b) => b[1] - a[1]) : [];
    const spamW = top.filter(x => x[1] > 0).slice(0, 7);
    const hamW = top.filter(x => x[1] < 0).reverse().slice(0, 7);
    const maxW = Math.max(0.01, ...top.map(x => Math.abs(x[1])));

    const score = `<div class="evo-score">
      <div class="evo-score-card rules">
        <div class="evo-score-k"><i data-lucide="user-cog"></i> Hand-coded rules</div>
        <div class="evo-score-v">${E.rc}/${E.n} <small>${pct(E.rc, E.n)}</small></div>
        <div class="evo-meter"><span style="width:${E.n ? (E.rc / E.n) * 100 : 0}%"></span></div>
        <div class="evo-score-s">false alarms ${E.rErr.fp} · missed spam ${E.rErr.fn}</div>
        <div class="evo-score-s">effort: <b>${s.rules.length}</b> rules written by hand</div>
      </div>
      <div class="evo-score-card learned">
        <div class="evo-score-k"><i data-lucide="brain"></i> Learned from data</div>
        <div class="evo-score-v">${E.lc === null ? '—' : `${E.lc}/${E.n} <small>${pct(E.lc, E.n)}</small>`}</div>
        <div class="evo-meter"><span style="width:${E.lc === null || !E.n ? 0 : (E.lc / E.n) * 100}%"></span></div>
        <div class="evo-score-s">${E.lErr ? `false alarms ${E.lErr.fp} · missed spam ${E.lErr.fn}` : 'no data → no knowledge yet'}</div>
        <div class="evo-score-s">effort: <b>${s.train.length}</b> emails labelled, 0 rules written</div>
      </div></div>`;

    const rows = E.res.map((x, i) => `
      <tr class="${s.inspect === i ? 'sel' : ''}" data-act="r-inspect" data-i="${i}">
        <td class="evo-num">${i + 1}</td>
        <td class="evo-msgtxt">${esc(x.e.t)}</td>
        <td>${rBadge(x.e.y)}</td>
        <td>${rBadge(x.r.y)} ${rMark(x.r.y === x.e.y)}${x.r.fired.length ? `<div class="evo-why">rule: ${x.r.fired.map(esc).join(', ')}</div>` : ''}</td>
        <td>${rBadge(x.l.y)} ${rMark(x.l.y === null ? null : x.l.y === x.e.y)}${x.l.y ? `<div class="evo-why">score ${x.l.score > 0 ? '+' : ''}${f2(x.l.score)}</div>` : ''}</td>
        <td><button class="tfp-doc-x" data-act="r-del-test" data-i="${i}" aria-label="remove test email">×</button></td>
      </tr>`).join('');
    const table = `<div class="tfp-table-wrap"><table class="tfp-table evo-table">
      <thead><tr><th>#</th><th>message</th><th>truth</th><th>rules</th><th>learned</th><th></th></tr></thead>
      <tbody>${rows || '<tr><td colspan="6" class="tfp-empty">Inbox is empty.</td></tr>'}</tbody></table></div>`;

    let inspect = '';
    const xi = s.inspect !== null ? E.res[s.inspect] : null;
    if (xi) {
      const ruleSet = new Set(s.rules);
      const chips = tok(xi.e.t).map(w => {
        const v = E.m.n ? (E.m.wts[w] || 0) : 0;
        const a = Math.min(1, Math.abs(v) / maxW);
        return `<span class="evo-wchip ${ruleSet.has(w) ? 'rule' : ''}" style="--a:${(0.12 + a * 0.6).toFixed(2)}" data-sign="${v > 0 ? 'spam' : v < 0 ? 'ham' : 'zero'}">${esc(w)}<small>${E.m.n ? (v > 0 ? '+' : '') + f2(v) : ''}</small></span>`;
      }).join('');
      inspect = card(`Inside message #${s.inspect + 1}`, 'underlined = a hand rule fires · colour = learned weight',
        `<div class="evo-wchips">${chips}</div>
         <div class="tfp-mono">Rules: ${xi.r.fired.length ? `contains ${xi.r.fired.map(w => `“${esc(w)}”`).join(', ')} → spam` : 'no keyword matched → ham'}
         <br>Learned: ${E.m.n ? `prior ${f2(E.m.prior)} + Σ word weights ${f2(xi.l.score - E.m.prior)} = <b>${f2(xi.l.score)}</b> → ${xi.l.y}` : 'untrained — needs labelled examples'}</div>`);
    }

    const wbars = (list, cls) => list.length ? list.map(([w, v]) => `<div class="evo-wbar ${cls}"><span class="evo-wbar-l">${esc(w)}</span><span class="evo-wbar-t"><span style="width:${(Math.abs(v) / maxW) * 100}%"></span></span><span class="evo-wbar-v">${v > 0 ? '+' : ''}${f2(v)}</span></div>`).join('') : '<span class="tfp-empty">—</span>';
    const knows = card('What each system “knows”', 'rules are written · weights are counted',
      `<div class="evo-knows">
        <div><div class="tfp-lbl">Expert's rules (${s.rules.length})</div><div class="evo-rule-chips">${s.rules.map(r => `<span class="evo-rule ro">${esc(r)}</span>`).join('') || '<span class="tfp-empty">none</span>'}</div></div>
        <div><div class="tfp-lbl">Learned spam words</div>${wbars(spamW, 'spam')}<div class="tfp-lbl">Learned ham words</div>${wbars(hamW, 'ham')}</div>
      </div>
      <div class="tfp-mono">weight(w) = ln[(#spam emails with w + 1) / (#ham emails with w + 1)] · predict spam if prior + Σ weights &gt; 0</div>`);

    RL.viz.innerHTML = `<div class="evo-viz" data-lab="rules">
      <div class="tfp-viz-head"><h3>Spam Filter Showdown: Rules vs. Learning</h3>
        <span class="tfp-stat-chips"><span>${E.n} test emails</span><span>${s.train.length} labelled</span></span></div>
      ${msgHTML(s.msg, 'Add or delete a rule, label a new example, or press <b>Spammers adapt</b>. Click any inbox row to look inside it.')}
      ${score}
      ${card('Test inbox', 'click a row to inspect', table)}
      ${inspect}
      ${knows}
    </div>`;
  }

  function rChangeMsg(prev, cur, lead) {
    let html = lead;
    const dr = cur.rc - prev.rc;
    html += ` Rules ${prev.rc}/${prev.n} → <b>${cur.rc}/${cur.n}</b>`;
    if (prev.lc !== null || cur.lc !== null) html += ` · Learned ${prev.lc === null ? '—' : `${prev.lc}/${prev.n}`} → <b>${cur.lc === null ? '—' : `${cur.lc}/${cur.n}`}</b>`;
    html += '.';
    if (prev.n === cur.n && prev.res.length === cur.res.length) {
      let fixed = 0, broke = 0;
      cur.res.forEach((x, i) => {
        const a = prev.res[i].r.y === x.e.y, b = x.r.y === x.e.y;
        if (!a && b) fixed++; if (a && !b) broke++;
      });
      if (fixed || broke) html += ` The rule change fixed ${fixed} and broke ${broke} message${broke === 1 ? '' : 's'}.`;
      else if (dr === 0 && lead.includes('rule')) html += ' No test message changed.';
    }
    RL.state.msg = { kind: 'change', html };
  }

  RL.onClick = function (e) {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const s = RL.state;
    const act = b.dataset.act;
    const prev = rEval();
    const i = +b.dataset.i;
    switch (act) {
      case 'story-start': storyGo(RL, 0); break;
      case 'story-go': storyGo(RL, +b.dataset.k); break;
      case 'story-exit': storyExit(RL); break;
      case 'r-add-rule': {
        const inp = RL.ctrl.querySelector('#evo-r-rule-in');
        const w = tok(inp.value)[0];
        if (!w) { s.msg = { kind: 'warn', html: 'Type a keyword of at least 2 letters.' }; break; }
        inp.value = '';
        if (s.rules.includes(w)) { s.msg = { kind: 'info', html: `${q(w)} is already a rule.` }; break; }
        s.rules.push(w); s.edits++;
        rChangeMsg(prev, rEval(), `Added rule ${q(w)} (manual edit #${s.edits}).`);
        break;
      }
      case 'r-del-rule':
        s.rules = s.rules.filter(r => r !== b.dataset.w); s.edits++;
        rChangeMsg(prev, rEval(), `Removed rule ${q(b.dataset.w)}.`);
        break;
      case 'r-newlabel': s.newLabel = s.newLabel === 'spam' ? 'ham' : 'spam'; break;
      case 'r-testlabel': s.testLabel = s.testLabel === 'spam' ? 'ham' : 'spam'; break;
      case 'r-add-train': {
        const inp = RL.ctrl.querySelector('#evo-r-train-in');
        if (!tok(inp.value).length) { s.msg = { kind: 'warn', html: 'Type an email to label first.' }; break; }
        s.train.push({ t: inp.value.trim(), y: s.newLabel }); inp.value = '';
        const cur = rEval();
        const ws = [...new Set(tok(s.train[s.train.length - 1].t))].slice(0, 4).map(w => `${q(w)} ${f2(prev.m.wts[w] || 0)}→${f2(cur.m.wts[w])}`);
        rChangeMsg(prev, cur, `Learned from one more <b>${s.newLabel}</b> example — weights updated automatically: ${ws.join(', ')}.`);
        break;
      }
      case 'r-flip':
        s.train[i].y = s.train[i].y === 'spam' ? 'ham' : 'spam';
        rChangeMsg(prev, rEval(), `Flipped example ${i + 1} to <b>${s.train[i].y}</b> — wrong labels teach the learner wrong weights (garbage in, garbage out).`);
        break;
      case 'r-del-train':
        s.train.splice(i, 1);
        rChangeMsg(prev, rEval(), 'Removed a labelled example.');
        break;
      case 'r-load-train':
        s.train = clone(R_TRAIN0);
        rChangeMsg(prev, rEval(), 'Loaded 10 labelled emails (5 spam, 5 ham). The learner counted its own keyword weights from them.');
        break;
      case 'r-clear-train':
        s.train = [];
        rChangeMsg(prev, rEval(), 'Cleared all data: with nothing to learn from, the learner is untrained.');
        break;
      case 'r-add-test': {
        const inp = RL.ctrl.querySelector('#evo-r-test-in');
        if (!tok(inp.value).length) { s.msg = { kind: 'warn', html: 'Type a test email first.' }; break; }
        s.test.push({ t: inp.value.trim(), y: s.testLabel }); inp.value = '';
        const cur = rEval(); const x = cur.res[cur.res.length - 1];
        s.inspect = cur.res.length - 1;
        s.msg = { kind: 'change', html: `New ${s.testLabel} email: rules say <b>${x.r.y}</b> ${x.r.y === x.e.y ? '✓' : '✗'}${x.l.y ? `, learner says <b>${x.l.y}</b> ${x.l.y === x.e.y ? '✓' : '✗'}` : ', learner is untrained'}.` };
        break;
      }
      case 'r-del-test':
        e.stopPropagation();
        s.test.splice(i, 1); s.inspect = null;
        s.msg = { kind: 'change', html: 'Removed a test email.' };
        break;
      case 'r-adapt': {
        const have = new Set(s.test.map(x => x.t));
        const add = R_ADAPT.filter(x => !have.has(x.t));
        if (!add.length) { s.msg = { kind: 'info', html: 'The adapted spam is already in the inbox — try writing your own disguised spam (e.g. “Fr3e m0ney”).' }; break; }
        s.test = s.test.concat(clone(add));
        s.inspect = s.test.length - add.length;
        rChangeMsg(prev, rEval(), 'Spammers changed their wording (“fr33”, “c4sh”, new vocabulary).');
        break;
      }
      case 'r-reset':
        Object.assign(s, { rules: R_RULES0.slice(), train: [], test: clone(R_TEST0), inspect: null, edits: 0, story: { on: false, k: 0 } });
        s.msg = { kind: 'info', html: 'Reset: 3 expert rules, no labelled data, original 7-email inbox.' };
        break;
      case 'r-inspect': {
        s.inspect = s.inspect === i ? null : i;
        if (s.inspect !== null) {
          const x = rEval().res[i];
          s.msg = { kind: 'select', html: `Message #${i + 1} is <b>${x.e.y}</b>. Rules → ${x.r.y} ${x.r.y === x.e.y ? '✓' : '✗'}${x.l.y ? `; learner → ${x.l.y} ${x.l.y === x.e.y ? '✓' : '✗'} (score ${f2(x.l.score)})` : ''}.` };
        }
        break;
      }
      default: return;
    }
    RL.refresh(false);
  };

  // ===========================================================================
  // LAB 2 — Four Learning Paradigms
  // ===========================================================================
  const PARADIGMS = [
    { key: 'sup', name: 'Supervised', icon: 'graduation-cap', color: '#059669', gets: 'labelled pairs ⟨x, y⟩', goal: 'learn h(x) ≈ y — a decision boundary',
      how: 'Click the plot to add a labelled point. A linear classifier (logistic regression) re-fits instantly.' },
    { key: 'nn', name: 'Neural Network', icon: 'network', color: '#6366f1', gets: 'labelled pairs ⟨x, y⟩', goal: 'learn non-linear features h(x) = σ(W₂·tanh(W₁x + b₁) + b₂)',
      how: 'Same labelled data, but a hidden layer lets the boundary bend. Try the Ring or XOR dataset.' },
    { key: 'unsup', name: 'Unsupervised', icon: 'scan-search', color: '#d97706', gets: 'inputs only ⟨x⟩ — no labels', goal: 'discover structure: K groups C₁…C_K',
      how: 'The same points with labels hidden. K-Means groups them by distance alone.' },
    { key: 'rl', name: 'Reinforcement', icon: 'gamepad-2', color: '#0284c7', gets: 'transitions ⟨s, a, r, s′⟩ — no dataset at all', goal: 'learn a policy π(s) that maximises reward',
      how: 'The agent explores a grid by trial and error. Reward is +20 at the goal, −10 in a pit, −1 per step.' }
  ];
  const DATASETS = [{ key: 'blobs', name: 'Two blobs' }, { key: 'ring', name: 'Ring' }, { key: 'xor', name: 'XOR' }];
  const QUIZ = [
    { s: 'Predict house prices from 10,000 past sales whose prices are known.', a: 'sup', why: 'Every example comes with the correct answer (the price) — learning from ⟨x, y⟩ pairs.' },
    { s: 'Group shoppers into segments when nobody has defined the segments.', a: 'unsup', why: 'No labels — the algorithm must discover the groups itself (clustering).' },
    { s: 'A robot learns to walk by trying moves and being rewarded for distance travelled.', a: 'rl', why: 'No correct answers, only a reward signal after acting — trial and error.' },
    { s: 'Recognise objects from raw pixels using many stacked layers that learn their own features.', a: 'nn', why: 'Stacked non-linear layers learn the representation (edges → shapes → objects).' },
    { s: 'Filter spam using emails that users have marked “spam” or “not spam”.', a: 'sup', why: 'Users supply the labels — a classic supervised classification task.' },
    { s: 'A game agent masters Go by playing millions of games against itself and seeing who wins.', a: 'rl', why: 'The only feedback is the delayed reward (win / loss) at the end of each game.' },
    { s: 'Find recurring topics in a pile of unlabelled news articles.', a: 'unsup', why: 'There is no target label; topics emerge from word co-occurrence structure.' },
    { s: 'Separate two classes that form a circle-inside-a-ring, where no straight line works.', a: 'nn', why: 'A hidden layer gives the model non-linear features so the boundary can curve.' }
  ];

  const PD = {
    id: 'paradigms',
    state: {
      p: 'sup', ds: 'blobs', points: [], addClass: 'A', showTruth: false,
      k: 2, km: null, nnH: 6, nn: null, nnEpochs: 0, lr: null, rl: null,
      quiz: { i: 0, score: 0, answered: null, tried: 0 },
      story: { on: false, k: 0 }, msg: null
    },
    storyBlurb: 'Six steps: the same dataset learned with labels, without labels, with a curved boundary — then an agent that has no dataset at all and learns only from reward.'
  };

  function makeDataset(key) {
    const rng = mulberry32(key === 'blobs' ? 11 : key === 'ring' ? 22 : 33);
    const pts = [];
    const clamp = v => Math.max(0.03, Math.min(0.97, v));
    if (key === 'blobs') {
      for (let i = 0; i < 20; i++) pts.push({ x: clamp(0.3 + gauss(rng) * 0.09), y: clamp(0.33 + gauss(rng) * 0.09), c: 'A' });
      for (let i = 0; i < 20; i++) pts.push({ x: clamp(0.7 + gauss(rng) * 0.09), y: clamp(0.67 + gauss(rng) * 0.09), c: 'B' });
    } else if (key === 'ring') {
      for (let i = 0; i < 18; i++) { const a = rng() * 6.283, r = Math.sqrt(rng()) * 0.15; pts.push({ x: 0.5 + r * Math.cos(a), y: 0.5 + r * Math.sin(a), c: 'A' }); }
      for (let i = 0; i < 26; i++) { const a = rng() * 6.283, r = 0.33 + gauss(rng) * 0.035; pts.push({ x: clamp(0.5 + r * Math.cos(a)), y: clamp(0.5 + r * Math.sin(a)), c: 'B' }); }
    } else {
      const quad = [[0.27, 0.73, 'A'], [0.73, 0.27, 'A'], [0.73, 0.73, 'B'], [0.27, 0.27, 'B']];
      quad.forEach(([cx, cy, c]) => { for (let i = 0; i < 11; i++) pts.push({ x: clamp(cx + gauss(rng) * 0.08), y: clamp(cy + gauss(rng) * 0.08), c }); });
    }
    return pts;
  }

  // --- Logistic regression (linear) ---
  function trainLR(pts) {
    let w1 = 0, w2 = 0, b = 0;
    if (!pts.length) return { w1, w2, b, acc: 0, prob: () => 0.5 };
    const X = pts.map(p => [(p.x - 0.5) * 4, (p.y - 0.5) * 4, p.c === 'B' ? 1 : 0]);
    for (let it = 0; it < 600; it++) {
      let g1 = 0, g2 = 0, gb = 0;
      X.forEach(([a, c, y]) => { const p = 1 / (1 + Math.exp(-(w1 * a + w2 * c + b))); g1 += (p - y) * a; g2 += (p - y) * c; gb += p - y; });
      const n = X.length; w1 -= 0.5 * g1 / n; w2 -= 0.5 * g2 / n; b -= 0.5 * gb / n;
    }
    const m = { w1, w2, b };
    m.prob = (x, y) => 1 / (1 + Math.exp(-(w1 * (x - 0.5) * 4 + w2 * (y - 0.5) * 4 + b)));
    m.acc = pts.filter(p => (m.prob(p.x, p.y) > 0.5) === (p.c === 'B')).length / pts.length;
    return m;
  }

  // --- MLP 2-H-1 (tanh, sigmoid) ---
  function initNN(H) {
    const rng = mulberry32(7 + H);
    const W1 = [], b1 = [], W2 = [];
    for (let h = 0; h < H; h++) { W1.push([gauss(rng) * 1.2, gauss(rng) * 1.2]); b1.push(gauss(rng) * 0.5); W2.push(gauss(rng) * 0.8); }
    return { H, W1, b1, W2, b2: 0, loss: null, vel: null, acc: 0 };
  }
  function nnForward(nn, x, y) {
    const a = (x - 0.5) * 2, c = (y - 0.5) * 2;
    const h = nn.W1.map((w, j) => Math.tanh(w[0] * a + w[1] * c + nn.b1[j]));
    const z = h.reduce((s, v, j) => s + v * nn.W2[j], nn.b2);
    return { a, c, h, p: 1 / (1 + Math.exp(-z)) };
  }
  function trainNN(nn, pts, epochs) {
    if (!pts.length) return nn;
    const lr = 0.8, mu = 0.9;
    if (!nn.vel) nn.vel = { W1: nn.W1.map(() => [0, 0]), b1: nn.b1.map(() => 0), W2: nn.W2.map(() => 0), b2: 0 };
    const V = nn.vel, n = pts.length;
    for (let ep = 0; ep < epochs; ep++) {
      const gW1 = nn.W1.map(() => [0, 0]), gb1 = nn.b1.map(() => 0), gW2 = nn.W2.map(() => 0);
      let gb2 = 0, loss = 0;
      pts.forEach(p => {
        const f = nnForward(nn, p.x, p.y), y = p.c === 'B' ? 1 : 0;
        const d = f.p - y;
        loss += -(y * Math.log(f.p + 1e-9) + (1 - y) * Math.log(1 - f.p + 1e-9));
        gb2 += d;
        f.h.forEach((hv, j) => {
          gW2[j] += d * hv;
          const dh = d * nn.W2[j] * (1 - hv * hv);
          gW1[j][0] += dh * f.a; gW1[j][1] += dh * f.c; gb1[j] += dh;
        });
      });
      for (let j = 0; j < nn.H; j++) {
        V.W2[j] = mu * V.W2[j] - lr * gW2[j] / n; nn.W2[j] += V.W2[j];
        V.b1[j] = mu * V.b1[j] - lr * gb1[j] / n; nn.b1[j] += V.b1[j];
        for (let k = 0; k < 2; k++) { V.W1[j][k] = mu * V.W1[j][k] - lr * gW1[j][k] / n; nn.W1[j][k] += V.W1[j][k]; }
      }
      V.b2 = mu * V.b2 - lr * gb2 / n; nn.b2 += V.b2;
      nn.loss = loss / n;
    }
    nn.acc = pts.filter(p => (nnForward(nn, p.x, p.y).p > 0.5) === (p.c === 'B')).length / n;
    return nn;
  }

  // --- K-Means ---
  function kmInit(pts, K) {
    const rng = mulberry32(5 + K);
    if (!pts.length) return { cent: [], assign: [], iter: 0, phase: 'assign', converged: false };
    const cent = [Object.assign({}, pts[Math.floor(rng() * pts.length)])];
    while (cent.length < Math.min(K, pts.length)) {
      const d = pts.map(p => Math.min(...cent.map(c => (p.x - c.x) ** 2 + (p.y - c.y) ** 2)));
      const tot = d.reduce((a, b) => a + b, 0);
      let r = rng() * tot, idx = 0;
      while (idx < d.length - 1 && r > d[idx]) { r -= d[idx]; idx++; }
      cent.push({ x: pts[idx].x, y: pts[idx].y });
    }
    return { cent: cent.map(c => ({ x: c.x, y: c.y })), assign: pts.map(() => -1), iter: 0, phase: 'assign', converged: false };
  }
  function kmStep(km, pts) {
    if (!km.cent.length || km.converged) return km;
    if (km.phase === 'assign') {
      const na = pts.map(p => { let best = 0, bd = Infinity; km.cent.forEach((c, i) => { const d = (p.x - c.x) ** 2 + (p.y - c.y) ** 2; if (d < bd) { bd = d; best = i; } }); return best; });
      const changed = na.some((a, i) => a !== km.assign[i]);
      km.assign = na; km.phase = 'update'; km.iter++;
      if (!changed && km.iter > 1) km.converged = true;
    } else {
      km.cent = km.cent.map((c, i) => {
        const m = pts.filter((p, j) => km.assign[j] === i);
        return m.length ? { x: m.reduce((s, p) => s + p.x, 0) / m.length, y: m.reduce((s, p) => s + p.y, 0) / m.length } : c;
      });
      km.phase = 'assign';
    }
    return km;
  }
  function kmRun(km, pts) { let g = 0; while (!km.converged && g++ < 200) kmStep(km, pts); return km; }
  function kmStats(km, pts) {
    if (!km.cent.length || km.assign[0] === -1) return { sse: null, purity: null };
    const sse = pts.reduce((s, p, i) => s + (p.x - km.cent[km.assign[i]].x) ** 2 + (p.y - km.cent[km.assign[i]].y) ** 2, 0);
    let pure = 0;
    km.cent.forEach((c, i) => {
      const m = pts.filter((p, j) => km.assign[j] === i);
      const a = m.filter(p => p.c === 'A').length;
      pure += Math.max(a, m.length - a);
    });
    return { sse, purity: pure / pts.length };
  }

  // --- Gridworld Q-learning ---
  const GW = { W: 5, H: 4, start: [0, 0], goal: [4, 0], pits: ['2,0', '2,1', '2,2'], step: -1, rGoal: 20, rPit: -10 };
  const ACTS = [['↑', 0, -1], ['→', 1, 0], ['↓', 0, 1], ['←', -1, 0]];
  function rlInit() { return { Q: {}, episodes: 0, returns: [], lastPath: [], lastTrans: [], rng: mulberry32(99), eps: 0.2, alpha: 0.5, gamma: 0.95 }; }
  function qOf(ag, s) { if (!ag.Q[s]) ag.Q[s] = [0, 0, 0, 0]; return ag.Q[s]; }
  function rlEpisode(ag) {
    let [x, y] = GW.start, G = 0;
    const path = [[x, y]], trans = [];
    for (let t = 0; t < 60; t++) {
      const s = `${x},${y}`, Qs = qOf(ag, s);
      let a;
      if (ag.rng() < ag.eps) a = Math.floor(ag.rng() * 4);
      else { const m = Math.max(...Qs); const best = [0, 1, 2, 3].filter(i => Qs[i] === m); a = best[Math.floor(ag.rng() * best.length)]; }
      const nx = Math.max(0, Math.min(GW.W - 1, x + ACTS[a][1])), ny = Math.max(0, Math.min(GW.H - 1, y + ACTS[a][2]));
      const s2 = `${nx},${ny}`;
      let r = GW.step, done = false;
      if (nx === GW.goal[0] && ny === GW.goal[1]) { r = GW.rGoal; done = true; }
      else if (GW.pits.includes(s2)) { r = GW.rPit; done = true; }
      const target = r + (done ? 0 : ag.gamma * Math.max(...qOf(ag, s2)));
      Qs[a] += ag.alpha * (target - Qs[a]);
      G += r; trans.push({ s, a: ACTS[a][0], r, s2 });
      x = nx; y = ny; path.push([x, y]);
      if (done) break;
    }
    ag.episodes++; ag.returns.push(G); ag.lastPath = path; ag.lastTrans = trans;
    return G;
  }

  function pdEnsureModels() {
    const s = PD.state;
    if (!s.points.length && !s._init) { s.points = makeDataset(s.ds); s._init = true; }
    if (!s.lr) s.lr = trainLR(s.points);
    if (!s.nn) { s.nn = trainNN(initNN(s.nnH), s.points, 1500); s.nnEpochs = 1500; }
    if (!s.km) { s.km = kmInit(s.points, s.k); }
    if (!s.rl) s.rl = rlInit();
  }
  function pdDataChanged() { const s = PD.state; s.lr = null; s.nn = null; s.km = null; }

  PD.STEPS = [
    { name: 'Supervised: labels given', apply: () => { const s = PD.state; Object.assign(s, { p: 'sup', ds: 'blobs', points: makeDataset('blobs') }); pdDataChanged(); },
      caption: () => { pdEnsureModels(); return `Every point carries its label (cyan A / amber B). The learner fits a straight boundary that separates them: training accuracy <b>${pct(PD.state.lr.acc * 100, 100)}</b>.`; } },
    { name: 'Unsupervised: hide the labels', apply: () => { const s = PD.state; Object.assign(s, { p: 'unsup', ds: 'blobs', points: makeDataset('blobs'), k: 2 }); pdDataChanged(); pdEnsureModels(); kmRun(s.km, s.points); },
      caption: () => { const st = kmStats(PD.state.km, PD.state.points); return `Same points, no labels. K-Means still finds 2 groups by distance alone — and they match the hidden classes ${pct(st.purity * 100, 100)} of the time.`; } },
    { name: 'A harder shape', apply: () => { const s = PD.state; Object.assign(s, { p: 'sup', ds: 'ring', points: makeDataset('ring') }); pdDataChanged(); },
      caption: () => { pdEnsureModels(); return `Class A sits inside a ring of class B. A straight line can only reach <b>${pct(PD.state.lr.acc * 100, 100)}</b> — the linear model is too simple.`; } },
    { name: 'Neural network bends the boundary', apply: () => { const s = PD.state; Object.assign(s, { p: 'nn', ds: 'ring', points: makeDataset('ring') }); pdDataChanged(); },
      caption: () => { pdEnsureModels(); return `With ${PD.state.nnH} hidden tanh units the network learns its own non-linear features and wraps a closed boundary around A: <b>${pct(PD.state.nn.acc * 100, 100)}</b>.`; } },
    { name: 'Reinforcement: no dataset', apply: () => { const s = PD.state; s.p = 'rl'; s.rl = rlInit(); rlEpisode(s.rl); },
      caption: () => `No examples, no labels. The agent starts knowing nothing, wanders, and receives only rewards. Episode 1 return: <b>${PD.state.rl.returns[0]}</b>.` },
    { name: 'Learning from reward', apply: () => { const s = PD.state; s.p = 'rl'; s.rl = rlInit(); for (let i = 0; i < 60; i++) rlEpisode(s.rl); },
      caption: () => { const r = PD.state.rl.returns; return `After 60 episodes the Q-values steer around the pits to the goal (last return <b>${r[r.length - 1]}</b>, best possible 11). Learning came from trial, error and reward — the fourth paradigm.`; } }
  ];

  PD.refresh = function (rebuild) {
    pdEnsureModels();
    if (rebuild || !PD.ctrl.querySelector('.evo-ctrl[data-lab="paradigms"]')) pdBuildControls();
    else pdUpdateControls();
    pdRenderViz();
    icons();
  };

  function pdBuildControls() {
    PD.ctrl.innerHTML = `<div class="tfp evo-ctrl" data-lab="paradigms">
      ${storySection(PD)}
      <div class="tfp-sec">
        <div class="tfp-sec-head"><span class="tfp-sec-title"><i data-lucide="layers"></i> Choose a paradigm</span></div>
        <div class="evo-para-tabs" id="evo-p-tabs"></div>
        <div class="evo-para-info" id="evo-p-info"></div>
      </div>
      <div class="tfp-sec" id="evo-p-controls"></div>
      <div class="tfp-sec">
        <div class="tfp-sec-head"><span class="tfp-sec-title"><i data-lucide="help-circle"></i> Which paradigm is it?</span><span class="tfp-sub" id="evo-quiz-score"></span></div>
        <div id="evo-quiz"></div>
      </div>
    </div>`;
    pdUpdateControls();
  }

  function pdUpdateControls() {
    const s = PD.state;
    const story = PD.ctrl.querySelector('.evo-story');
    if (story) story.outerHTML = storySection(PD);
    const P = PARADIGMS.find(p => p.key === s.p);
    PD.ctrl.querySelector('#evo-p-tabs').innerHTML = PARADIGMS.map(p => `<button class="tfp-preset ${s.p === p.key ? 'active' : ''}" data-act="p-set" data-k="${p.key}" style="--pc:${p.color}"><i data-lucide="${p.icon}"></i>${p.name}</button>`).join('');
    PD.ctrl.querySelector('#evo-p-info').innerHTML = `
      <div class="evo-kv"><span>Learner receives</span><b>${P.gets}</b></div>
      <div class="evo-kv"><span>Goal</span><b>${P.goal}</b></div>
      <div class="tfp-hint">${P.how}</div>`;

    let c = '';
    if (s.p !== 'rl') {
      c += `<div class="tfp-sec-head"><span class="tfp-sec-title"><i data-lucide="scatter-chart"></i> Data</span><span class="tfp-sub">${s.points.length} points</span></div>
        <div class="evo-seg-row">${DATASETS.map(d => `<button class="tfp-btn ${s.ds === d.key ? 'on' : ''}" data-act="p-ds" data-k="${d.key}">${d.name}</button>`).join('')}
          <button class="tfp-btn ghost" data-act="p-clear"><i data-lucide="eraser"></i>Clear</button></div>`;
      if (s.p !== 'unsup') {
        c += `<div class="tfp-row"><span class="tfp-sub">Click the plot to add class</span>
          <button class="evo-cls A ${s.addClass === 'A' ? 'on' : ''}" data-act="p-cls" data-k="A">A</button>
          <button class="evo-cls B ${s.addClass === 'B' ? 'on' : ''}" data-act="p-cls" data-k="B">B</button></div>`;
      } else {
        c += `<div class="tfp-row"><span class="tfp-sub">Click the plot to add an <b>unlabelled</b> point.</span>
          <label class="evo-check"><input type="checkbox" data-act="p-truth" ${s.showTruth ? 'checked' : ''}> peek at hidden labels</label></div>`;
      }
    }
    if (s.p === 'sup') {
      c += `<div class="tfp-calc"><div class="tfp-calc-line"><span class="tfp-calc-k">model</span><span>P(B | x) = σ(w₁x₁ + w₂x₂ + b)</span></div>
        <div class="tfp-calc-line"><span class="tfp-calc-k">fit</span><span>w₁ = ${f2(s.lr.w1)}, w₂ = ${f2(s.lr.w2)}, b = ${f2(s.lr.b)}</span></div>
        <div class="tfp-calc-line total"><span class="tfp-calc-k">accuracy</span><span>${pct(s.lr.acc * 100, 100)} on ${s.points.length} labelled points</span></div></div>`;
    } else if (s.p === 'nn') {
      c += `<div class="tfp-row"><span class="tfp-sub">hidden units</span><input type="range" min="1" max="10" value="${s.nnH}" data-act="p-h" class="evo-range"><b class="evo-rv">${s.nnH}</b>
          <button class="tfp-btn" data-act="p-train"><i data-lucide="play"></i>Train +500 epochs</button></div>
        <div class="tfp-calc"><div class="tfp-calc-line"><span class="tfp-calc-k">model</span><span>h = tanh(W₁x + b₁) · P(B|x) = σ(W₂h + b₂)</span></div>
        <div class="tfp-calc-line"><span class="tfp-calc-k">training</span><span>${s.nnEpochs} epochs · loss ${s.nn.loss === null ? '—' : s.nn.loss.toFixed(3)}</span></div>
        <div class="tfp-calc-line total"><span class="tfp-calc-k">accuracy</span><span>${pct((s.nn.acc || 0) * 100, 100)} (linear model: ${pct(s.lr.acc * 100, 100)})</span></div></div>`;
    } else if (s.p === 'unsup') {
      const st = kmStats(s.km, s.points);
      c += `<div class="tfp-row"><span class="tfp-sub">K clusters</span><input type="range" min="1" max="4" value="${s.k}" data-act="p-k" class="evo-range"><b class="evo-rv">${s.k}</b></div>
        <div class="tfp-row"><button class="tfp-btn" data-act="p-kstep"><i data-lucide="step-forward"></i>${s.km.phase === 'assign' ? 'Assign step' : 'Update step'}</button>
          <button class="tfp-btn primary" data-act="p-krun"><i data-lucide="fast-forward"></i>Run to convergence</button>
          <button class="tfp-btn ghost" data-act="p-kinit"><i data-lucide="rotate-ccw"></i>Re-init</button></div>
        <div class="tfp-calc"><div class="tfp-calc-line"><span class="tfp-calc-k">iteration</span><span>${s.km.iter}${s.km.converged ? ' · converged ✓' : ''}</span></div>
        <div class="tfp-calc-line"><span class="tfp-calc-k">SSE</span><span>Σ ‖x − μ_c(x)‖² = ${st.sse === null ? '—' : st.sse.toFixed(3)}</span></div>
        <div class="tfp-calc-line total"><span class="tfp-calc-k">purity</span><span>${st.purity === null ? '—' : pct(st.purity * 100, 100)} agreement with the hidden labels</span></div></div>`;
    } else {
      const r = s.rl.returns;
      c += `<div class="tfp-sec-head"><span class="tfp-sec-title"><i data-lucide="gamepad-2"></i> Agent</span><span class="tfp-sub">ε = ${s.rl.eps} · α = ${s.rl.alpha} · γ = ${s.rl.gamma}</span></div>
        <div class="tfp-row"><button class="tfp-btn" data-act="p-ep1"><i data-lucide="step-forward"></i>Run 1 episode</button>
          <button class="tfp-btn primary" data-act="p-ep20"><i data-lucide="fast-forward"></i>Run 20 episodes</button>
          <button class="tfp-btn ghost" data-act="p-rlreset"><i data-lucide="rotate-ccw"></i>Forget everything</button></div>
        <div class="tfp-calc"><div class="tfp-calc-line"><span class="tfp-calc-k">update</span><span>Q(s,a) ← Q + α[r + γ max Q(s′,·) − Q]</span></div>
        <div class="tfp-calc-line"><span class="tfp-calc-k">episodes</span><span>${s.rl.episodes}</span></div>
        <div class="tfp-calc-line total"><span class="tfp-calc-k">last G</span><span>${r.length ? r[r.length - 1] : '—'} (optimal path: 11)</span></div></div>`;
    }
    PD.ctrl.querySelector('#evo-p-controls').innerHTML = c;

    const Q = s.quiz, item = QUIZ[Q.i % QUIZ.length];
    PD.ctrl.querySelector('#evo-quiz-score').textContent = `${Q.score}/${Q.tried} correct`;
    PD.ctrl.querySelector('#evo-quiz').innerHTML = `
      <div class="evo-quiz-s"><span class="evo-num">${(Q.i % QUIZ.length) + 1}/${QUIZ.length}</span> ${esc(item.s)}</div>
      <div class="evo-quiz-opts">${PARADIGMS.map(p => {
        let cls = '';
        if (Q.answered) { if (p.key === item.a) cls = 'right'; else if (p.key === Q.answered) cls = 'wrong'; }
        return `<button class="tfp-btn ${cls}" data-act="q-ans" data-k="${p.key}" ${Q.answered ? 'disabled' : ''}>${p.name}</button>`;
      }).join('')}</div>
      ${Q.answered ? `<div class="evo-quiz-fb ${Q.answered === item.a ? 'ok' : 'no'}">${Q.answered === item.a ? '✓ Correct.' : `✗ It's <b>${PARADIGMS.find(p => p.key === item.a).name}</b>.`} ${esc(item.why)}</div>
        <div class="tfp-row end"><button class="tfp-btn primary" data-act="q-next">Next scenario →</button></div>` : ''}`;
  }

  // Plot geometry
  const PX = v => 10 + v * 300, PY = v => 10 + (1 - v) * 300;
  const CA = '#06b6d4', CB = '#f59e0b';
  const KC = ['#8b5cf6', '#10b981', '#f43f5e', '#3b82f6'];

  function heatmap(prob) {
    const n = 26, sz = 300 / n;
    let out = '';
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const x = (i + 0.5) / n, y = 1 - (j + 0.5) / n;
      const p = prob(x, y);
      const col = p > 0.5 ? CB : CA;
      const a = Math.min(0.42, Math.abs(p - 0.5) * 0.9 + 0.04);
      out += `<rect x="${(10 + i * sz).toFixed(1)}" y="${(10 + j * sz).toFixed(1)}" width="${(sz + 0.4).toFixed(1)}" height="${(sz + 0.4).toFixed(1)}" fill="${col}" fill-opacity="${a.toFixed(2)}"/>`;
    }
    return out;
  }
  function lrLine(m) {
    // w1*(x-.5)*4 + w2*(y-.5)*4 + b = 0  →  clip segment to [0,1]²
    const pts = [];
    const f = (x, y) => m.w1 * (x - 0.5) * 4 + m.w2 * (y - 0.5) * 4 + m.b;
    const edges = [[0, 0, 1, 0], [1, 0, 1, 1], [1, 1, 0, 1], [0, 1, 0, 0]];
    edges.forEach(([x1, y1, x2, y2]) => {
      const a = f(x1, y1), b = f(x2, y2);
      if ((a <= 0 && b > 0) || (a > 0 && b <= 0)) { const t = a / (a - b); pts.push([x1 + t * (x2 - x1), y1 + t * (y2 - y1)]); }
    });
    if (pts.length < 2) return '';
    return `<line x1="${PX(pts[0][0])}" y1="${PY(pts[0][1])}" x2="${PX(pts[1][0])}" y2="${PY(pts[1][1])}" stroke="#0f172a" stroke-width="2" stroke-dasharray="6 4"/>`;
  }

  function pdPlot() {
    const s = PD.state;
    let bg = '', pts = '', extra = '';
    if (s.p === 'sup' && s.points.length) { bg = heatmap(s.lr.prob); extra = lrLine(s.lr); }
    if (s.p === 'nn' && s.points.length) bg = heatmap((x, y) => nnForward(s.nn, x, y).p);
    s.points.forEach((p, i) => {
      let fill, stroke = '#fff';
      if (s.p === 'unsup') {
        const a = s.km.assign[i];
        fill = a >= 0 ? KC[a] : '#94a3b8';
        if (s.showTruth) stroke = p.c === 'A' ? CA : CB;
        pts += `<circle cx="${PX(p.x)}" cy="${PY(p.y)}" r="5.5" fill="${fill}" stroke="${stroke}" stroke-width="${s.showTruth ? 2.5 : 1.5}"/>`;
      } else {
        fill = p.c === 'A' ? CA : CB;
        pts += p.c === 'A'
          ? `<circle cx="${PX(p.x)}" cy="${PY(p.y)}" r="5.5" fill="${fill}" stroke="#fff" stroke-width="1.5"/>`
          : `<rect x="${PX(p.x) - 5}" y="${PY(p.y) - 5}" width="10" height="10" rx="2" fill="${fill}" stroke="#fff" stroke-width="1.5"/>`;
      }
    });
    if (s.p === 'unsup') s.km.cent.forEach((c, i) => {
      extra += `<g transform="translate(${PX(c.x)},${PY(c.y)})"><circle r="11" fill="#fff" stroke="${KC[i]}" stroke-width="2.5"/><path d="M-5,-5L5,5M5,-5L-5,5" stroke="${KC[i]}" stroke-width="2.5"/></g>`;
    });
    return `<svg class="evo-plot" viewBox="0 0 320 320" role="img" aria-label="2D data plot">
      <rect x="10" y="10" width="300" height="300" fill="#f8fafc" stroke="#e2e8f0"/>${bg}${extra}${pts}
      ${!s.points.length ? '<text x="160" y="165" text-anchor="middle" class="evo-svg-hint">click to add points</text>' : ''}
      <text x="312" y="318" text-anchor="end" class="evo-svg-ax">x₁ →</text><text x="4" y="8" class="evo-svg-ax">x₂</text></svg>`;
  }

  function pdGrid() {
    const ag = PD.state.rl;
    const cs = 56, W = GW.W * cs, H = GW.H * cs;
    const maxQ = Math.max(1, ...Object.values(ag.Q).map(v => Math.max(...v)));
    let cells = '';
    for (let y = 0; y < GW.H; y++) for (let x = 0; x < GW.W; x++) {
      const k = `${x},${y}`;
      const isGoal = x === GW.goal[0] && y === GW.goal[1], isPit = GW.pits.includes(k), isStart = x === GW.start[0] && y === GW.start[1];
      const Qs = ag.Q[k];
      const v = Qs ? Math.max(...Qs) : 0;
      let fill = '#f8fafc';
      if (isGoal) fill = '#bbf7d0'; else if (isPit) fill = '#fecdd3';
      else if (Qs && v > 0) fill = `rgba(16,185,129,${(0.08 + 0.45 * v / maxQ).toFixed(2)})`;
      else if (Qs && v < 0) fill = `rgba(244,63,94,${Math.min(0.35, 0.05 + -v / 30).toFixed(2)})`;
      cells += `<rect x="${x * cs + 1}" y="${y * cs + 1}" width="${cs - 2}" height="${cs - 2}" rx="6" fill="${fill}" stroke="#e2e8f0"/>`;
      if (isGoal) cells += `<text x="${x * cs + cs / 2}" y="${y * cs + cs / 2 + 5}" class="evo-g-lbl">+20</text>`;
      else if (isPit) cells += `<text x="${x * cs + cs / 2}" y="${y * cs + cs / 2 + 5}" class="evo-g-lbl pit">−10</text>`;
      else if (Qs && Qs.some(q => q !== 0)) {
        const m = Math.max(...Qs), a = Qs.indexOf(m);
        cells += `<text x="${x * cs + cs / 2}" y="${y * cs + cs / 2 + 2}" class="evo-g-arrow">${ACTS[a][0]}</text><text x="${x * cs + cs / 2}" y="${y * cs + cs - 7}" class="evo-g-v">${m.toFixed(1)}</text>`;
      }
      if (isStart) cells += `<text x="${x * cs + 6}" y="${y * cs + 14}" class="evo-g-s">S</text>`;
    }
    const path = ag.lastPath.length ? `<polyline points="${ag.lastPath.map(([x, y]) => `${x * cs + cs / 2},${y * cs + cs / 2}`).join(' ')}" fill="none" stroke="#0284c7" stroke-width="3" stroke-opacity="0.6" stroke-linejoin="round"/>` : '';
    const last = ag.lastPath.length ? ag.lastPath[ag.lastPath.length - 1] : GW.start;
    const agent = `<circle cx="${last[0] * cs + cs / 2}" cy="${last[1] * cs + cs / 2}" r="9" fill="#0284c7" stroke="#fff" stroke-width="2"/>`;
    return `<svg class="evo-grid" viewBox="-2 -2 ${W + 4} ${H + 4}">${cells}${path}${agent}</svg>`;
  }

  function sparkline(vals) {
    if (!vals.length) return '<span class="tfp-empty">Run an episode to see returns.</span>';
    const w = 300, h = 70, lo = Math.min(-15, ...vals), hi = Math.max(12, ...vals);
    const X = i => 4 + (vals.length === 1 ? 0 : i * (w - 8) / (vals.length - 1)), Y = v => h - 6 - (v - lo) / (hi - lo) * (h - 12);
    return `<svg class="evo-spark" viewBox="0 0 ${w} ${h}">
      <line x1="0" x2="${w}" y1="${Y(0)}" y2="${Y(0)}" stroke="#e2e8f0"/><line x1="0" x2="${w}" y1="${Y(11)}" y2="${Y(11)}" stroke="#10b981" stroke-dasharray="4 3"/>
      <text x="${w - 2}" y="${Y(11) - 3}" text-anchor="end" class="evo-svg-ax">optimal 11</text>
      <polyline points="${vals.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ')}" fill="none" stroke="#0284c7" stroke-width="2"/></svg>`;
  }

  function pdRenderViz() {
    const s = PD.state;
    const P = PARADIGMS.find(p => p.key === s.p);
    let main = '', data = '';
    if (s.p === 'rl') {
      main = card('Grid world · learned policy', 'arrow = best action so far · number = max Q(s,·)', `<div class="evo-plot-wrap">${pdGrid()}</div>`) +
        card('Return per episode', `${s.rl.episodes} episodes`, sparkline(s.rl.returns));
      const tr = s.rl.lastTrans.slice(-6);
      data = tr.length ? `<table class="tfp-table evo-data"><thead><tr><th>s</th><th>a</th><th>r</th><th>s′</th></tr></thead><tbody>${tr.map(t => `<tr><td>(${t.s})</td><td>${t.a}</td><td>${t.r}</td><td>(${t.s2})</td></tr>`).join('')}</tbody></table><div class="tfp-more">last ${tr.length} of ${s.rl.lastTrans.length} transitions in the latest episode</div>`
        : '<span class="tfp-empty">Nothing yet — the agent must act to get any data.</span>';
    } else {
      const legend = s.p === 'unsup'
        ? `<div class="evo-legend">${s.km.cent.map((c, i) => `<span><i style="background:${KC[i]}"></i>cluster ${i + 1}</span>`).join('')}<span><i class="x"></i>centroid μ</span>${s.showTruth ? '<span>ring colour = hidden label</span>' : ''}</div>`
        : `<div class="evo-legend"><span><i style="background:${CA}"></i>class A</span><span><i class="sq" style="background:${CB}"></i>class B</span><span>shading = model's prediction</span>${s.p === 'sup' ? '<span><i class="dash"></i>boundary</span>' : ''}</div>`;
      main = card(`${P.name} view`, s.p === 'unsup' ? 'labels hidden' : s.p === 'nn' ? 'non-linear boundary' : 'linear boundary', `<div class="evo-plot-wrap">${pdPlot()}</div>${legend}`);
      const rows = s.points.slice(0, 5).map(p => `<tr><td>${p.x.toFixed(2)}</td><td>${p.y.toFixed(2)}</td><td>${s.p === 'unsup' ? '<span class="evo-hidden">?</span>' : `<b style="color:${p.c === 'A' ? '#0e7490' : '#b45309'}">${p.c}</b>`}</td></tr>`).join('');
      data = `<table class="tfp-table evo-data"><thead><tr><th>x₁</th><th>x₂</th><th>y</th></tr></thead><tbody>${rows}</tbody></table><div class="tfp-more">… ${Math.max(0, s.points.length - 5)} more rows</div>`;
    }
    PD.viz.innerHTML = `<div class="evo-viz" data-lab="paradigms">
      <div class="tfp-viz-head"><h3><span class="evo-pdot" style="background:${P.color}"></span>${P.name} Learning</h3>
        <span class="tfp-stat-chips"><span>${P.gets}</span></span></div>
      ${msgHTML(s.msg, 'Switch paradigms on the left: the first three use the <b>same points</b>, so you can see what changes when labels are given, hidden, or modelled non-linearly.')}
      ${main}
      ${card('What the learner receives', P.gets, data)}
      ${card('The four paradigms at a glance', '', `<div class="evo-glance">${PARADIGMS.map(p => `<button class="evo-glance-c ${p.key === s.p ? 'on' : ''}" data-act="p-set" data-k="${p.key}" style="--pc:${p.color}"><b>${p.name}</b><span>${p.gets}</span></button>`).join('')}</div>`)}
    </div>`;
  }

  PD.onClick = function (e) {
    const s = PD.state;
    const svg = e.target.closest('svg.evo-plot');
    if (svg && s.p !== 'rl') {
      const r = svg.getBoundingClientRect();
      const vx = (e.clientX - r.left) / r.width * 320, vy = (e.clientY - r.top) / r.height * 320;
      const x = (vx - 10) / 300, y = 1 - (vy - 10) / 300;
      if (x < 0 || x > 1 || y < 0 || y > 1) return;
      const prevAcc = s.p === 'sup' ? s.lr.acc : s.p === 'nn' ? s.nn.acc : null;
      const c = s.p === 'unsup' ? (y > x ? 'B' : 'A') : s.addClass;
      s.points.push({ x, y, c });
      pdDataChanged(); pdEnsureModels();
      if (s.p === 'unsup') { kmRun(s.km, s.points); s.msg = { kind: 'change', html: `Added an unlabelled point at (${x.toFixed(2)}, ${y.toFixed(2)}). K-Means re-ran and put it in cluster ${s.km.assign[s.points.length - 1] + 1} — chosen by distance to the nearest centroid, not by any label.` }; }
      else {
        const m = s.p === 'sup' ? s.lr : s.nn;
        s.msg = { kind: 'change', html: `Added a class <b>${c}</b> point. The ${s.p === 'sup' ? 'linear model' : 'network'} re-trained: accuracy ${pct(prevAcc * 100, 100)} → <b>${pct(m.acc * 100, 100)}</b>.${s.p === 'sup' && m.acc < 0.9 ? ' A straight line cannot satisfy every point — try the Neural Network.' : ''}` };
      }
      PD.refresh(false); return;
    }
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    switch (act) {
      case 'story-start': storyGo(PD, 0); break;
      case 'story-go': storyGo(PD, +b.dataset.k); break;
      case 'story-exit': storyExit(PD); break;
      case 'p-set': {
        s.p = b.dataset.k;
        const P = PARADIGMS.find(p => p.key === s.p);
        if (s.p === 'unsup' && s.km.assign[0] === -1) kmRun(s.km, s.points);
        s.msg = { kind: 'info', html: `<b>${P.name}</b>: the learner receives ${P.gets}. ${P.how}` };
        break;
      }
      case 'p-ds': {
        s.ds = b.dataset.k; s.points = makeDataset(s.ds); pdDataChanged(); pdEnsureModels();
        if (s.p === 'unsup') kmRun(s.km, s.points);
        const name = DATASETS.find(d => d.key === s.ds).name;
        s.msg = { kind: 'change', html: `Loaded “${name}”. Linear model: <b>${pct(s.lr.acc * 100, 100)}</b> · neural network: <b>${pct(s.nn.acc * 100, 100)}</b>${s.p === 'unsup' ? ` · K-Means purity ${pct(kmStats(s.km, s.points).purity * 100, 100)}` : ''}.` };
        break;
      }
      case 'p-clear': s.points = []; pdDataChanged(); s.msg = { kind: 'info', html: 'Cleared. Click the plot to build your own dataset.' }; break;
      case 'p-cls': s.addClass = b.dataset.k; break;
      case 'p-train': {
        const before = s.nn.acc;
        trainNN(s.nn, s.points, 500); s.nnEpochs += 500;
        s.msg = { kind: 'change', html: `+500 epochs of gradient descent: loss ${s.nn.loss.toFixed(3)}, accuracy ${pct(before * 100, 100)} → <b>${pct(s.nn.acc * 100, 100)}</b>.` };
        break;
      }
      case 'p-kstep': {
        const ph = s.km.phase; kmStep(s.km, s.points);
        s.msg = { kind: 'change', html: s.km.converged ? 'Converged — no point changed cluster, so the centroids are stable.'
          : ph === 'assign' ? 'Assign step: every point joins its nearest centroid.' : 'Update step: each centroid moves to the mean of its points.' };
        break;
      }
      case 'p-krun': { kmRun(s.km, s.points); const st = kmStats(s.km, s.points); s.msg = { kind: 'change', html: `Converged after ${s.km.iter} iterations. SSE ${st.sse === null ? '—' : st.sse.toFixed(3)}; clusters agree with the hidden labels ${st.purity === null ? '—' : pct(st.purity * 100, 100)}.` }; break; }
      case 'p-kinit': s.km = kmInit(s.points, s.k); s.msg = { kind: 'info', html: `New random centroids (K = ${s.k}). Step through Assign / Update to watch them move.` }; break;
      case 'p-ep1': { const G = rlEpisode(s.rl); s.msg = { kind: 'change', html: `Episode ${s.rl.episodes}: ${s.rl.lastTrans.length} steps, return G = <b>${G}</b> (${G >= 10 ? 'reached the goal' : G < -5 && s.rl.lastTrans.length < 60 ? 'fell into a pit' : 'still exploring'}). Each step updated one Q-value.` }; break; }
      case 'p-ep20': { for (let i = 0; i < 20; i++) rlEpisode(s.rl); const r = s.rl.returns.slice(-20); s.msg = { kind: 'change', html: `20 more episodes (total ${s.rl.episodes}). Average return over them: <b>${f2(r.reduce((a, b) => a + b, 0) / r.length)}</b>. Arrows show the policy forming around the pits.` }; break; }
      case 'p-rlreset': s.rl = rlInit(); s.msg = { kind: 'info', html: 'All Q-values reset to 0 — the agent knows nothing again.' }; break;
      case 'q-ans': {
        const item = QUIZ[s.quiz.i % QUIZ.length];
        s.quiz.answered = b.dataset.k; s.quiz.tried++;
        if (b.dataset.k === item.a) s.quiz.score++;
        s.msg = { kind: 'quiz', html: `${b.dataset.k === item.a ? '✓' : '✗'} ${esc(item.why)}` };
        break;
      }
      case 'q-next': s.quiz.i++; s.quiz.answered = null; break;
      default: return;
    }
    PD.refresh(false);
  };
  PD.onInput = function (e) {
    const s = PD.state, act = e.target.dataset.act;
    if (act === 'p-h') { e.target.nextElementSibling.textContent = e.target.value; }
    if (act === 'p-k') { e.target.nextElementSibling.textContent = e.target.value; }
  };
  PD.onChange = function (e) {
    const s = PD.state, act = e.target.dataset.act;
    if (act === 'p-h') {
      const prev = s.nn.acc;
      s.nnH = +e.target.value; s.nn = trainNN(initNN(s.nnH), s.points, 1500); s.nnEpochs = 1500;
      s.msg = { kind: 'change', html: `Hidden units → ${s.nnH}. Retrained 1500 epochs: accuracy ${pct(prev * 100, 100)} → <b>${pct(s.nn.acc * 100, 100)}</b>. ${s.nnH <= 2 ? 'Too few units can only make a simple boundary.' : 'More units = more flexible boundary.'}` };
    } else if (act === 'p-k') {
      s.k = +e.target.value; s.km = kmInit(s.points, s.k); kmRun(s.km, s.points);
      const st = kmStats(s.km, s.points);
      s.msg = { kind: 'change', html: `K = ${s.k}: SSE ${st.sse === null ? '—' : st.sse.toFixed(3)}. Larger K always lowers SSE, but the algorithm never learns what the groups <i>mean</i> — no labels were given.` };
    } else if (act === 'p-truth') {
      s.showTruth = e.target.checked;
      s.msg = { kind: 'info', html: s.showTruth ? 'Ring colour now shows the hidden true label — K-Means never saw these.' : 'Hidden labels hidden again.' };
    } else return;
    PD.refresh(false);
  };

  // ===========================================================================
  // LAB 3 — Static vs. Sequential Decisions
  // ===========================================================================
  const CORR = { n: 7, start: 2, coin: 0, rCoin: 2, treasure: 6, rTreasure: 10, step: -1 };
  const INBOX = [
    { t: 'Win a free cruise — click now', y: 'spam' },
    { t: 'Team stand-up moved to 9:30', y: 'ham' },
    { t: 'Your invoice for October', y: 'ham' },
    { t: 'Claim your lottery prize', y: 'spam' },
    { t: 'Lunch on Friday?', y: 'ham' }
  ];

  const SQ = {
    id: 'sequential',
    state: { gamma: 0.9, pos: CORR.start, traj: [], done: false, order: [0, 1, 2, 3, 4], shuffles: 0, story: { on: false, k: 0 }, msg: null, timer: null },
    storyBlurb: 'Six steps contrasting a classifier (one input → one answer, order irrelevant) with an agent whose actions change the state, earn delayed rewards, and depend on the discount factor γ.'
  };

  function cStep(pos, dir) {
    const np = pos + dir;
    if (np === CORR.coin) return { np, r: CORR.rCoin, done: true };
    if (np === CORR.treasure) return { np, r: CORR.rTreasure, done: true };
    return { np, r: CORR.step, done: false };
  }
  function pathReturn(dir, g) {
    let pos = CORR.start, G = 0, t = 0;
    for (;;) { const o = cStep(pos, dir); G += Math.pow(g, t) * o.r; t++; pos = o.np; if (o.done) break; }
    return G;
  }
  function cValues(g) {
    const V = new Array(CORR.n).fill(0);
    for (let it = 0; it < 200; it++) {
      for (let s = 1; s < CORR.n - 1; s++) {
        const opt = [-1, 1].map(d => { const o = cStep(s, d); return o.r + (o.done ? 0 : g * V[o.np]); });
        V[s] = Math.max(...opt);
      }
    }
    const pol = V.map((v, s) => {
      if (s === CORR.coin || s === CORR.treasure) return 0;
      const L = cStep(s, -1), R = cStep(s, 1);
      const ql = L.r + (L.done ? 0 : g * V[L.np]), qr = R.r + (R.done ? 0 : g * V[R.np]);
      return qr > ql + 1e-9 ? 1 : -1;
    });
    return { V, pol };
  }
  function crossover() {
    let lo = 0.01, hi = 0.99;
    const d = g => pathReturn(1, g) - pathReturn(-1, g);
    if (d(lo) * d(hi) > 0) return null;
    for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (d(lo) * d(m) <= 0) hi = m; else lo = m; }
    return (lo + hi) / 2;
  }
  function cG() { return SQ.state.traj.reduce((s, x) => s + Math.pow(SQ.state.gamma, x.t) * x.r, 0); }

  function cMove(dir, quiet) {
    const s = SQ.state;
    if (s.done) return;
    const o = cStep(s.pos, dir);
    s.traj.push({ t: s.traj.length, s: s.pos, a: dir < 0 ? '←' : '→', r: o.r, s2: o.np });
    s.pos = o.np; s.done = o.done;
    if (quiet) return;
    const G = cG();
    if (s.done) {
      const other = o.np === CORR.coin ? pathReturn(1, s.gamma) : pathReturn(-1, s.gamma);
      s.msg = { kind: 'good', html: `Episode over at t = ${s.traj.length}: ${o.np === CORR.coin ? 'grabbed the coin (+2)' : 'reached the treasure (+10)'}. Return G = <b>${f2(G)}</b>. The other path would give ${f2(other)} at γ = ${s.gamma.toFixed(2)} — ${G >= other - 1e-9 ? 'this was the better plan ✓' : 'a better plan existed ✗'}.` };
    } else {
      s.msg = { kind: 'change', html: `Action ${dir < 0 ? '←' : '→'} moved the agent s${s.traj[s.traj.length - 1].s} → s${s.pos} (r = ${o.r}). The <b>next</b> decision starts from this new state — earlier actions shape later options. G so far = ${f2(G)}.` };
    }
  }
  function cReset() { Object.assign(SQ.state, { pos: CORR.start, traj: [], done: false }); }
  function cAuto(policy, animate) {
    const s = SQ.state;
    clearTimeout(s.timer);
    cReset();
    const { pol } = cValues(s.gamma);
    const choose = () => policy === 'near' ? -1 : pol[s.pos];
    const label = policy === 'near' ? 'Grab-nearest-reward' : `Optimal (γ = ${s.gamma.toFixed(2)})`;
    if (!animate) { let g = 0; while (!s.done && g++ < 20) cMove(choose(), true); cAfterAuto(label); return; }
    const tick = () => {
      if (!SQ.viz.querySelector('.evo-viz[data-lab="sequential"]')) return;
      cMove(choose(), true);
      if (s.done) cAfterAuto(label); else s.msg = { kind: 'change', html: `${label} policy acting… t = ${s.traj.length}, G so far ${f2(cG())}` };
      SQ.refresh(false);
      if (!s.done) s.timer = setTimeout(tick, 450);
    };
    s.msg = { kind: 'change', html: `${label} policy starting from s${CORR.start}…` };
    SQ.refresh(false);
    s.timer = setTimeout(tick, 350);
  }
  function cAfterAuto(label) {
    const s = SQ.state, G = cG();
    const gl = pathReturn(-1, s.gamma), gr = pathReturn(1, s.gamma);
    s.msg = { kind: 'good', html: `${label} policy finished in ${s.traj.length} steps with G = <b>${f2(G)}</b>. At γ = ${s.gamma.toFixed(2)}: coin path ${f2(gl)}, treasure path ${f2(gr)} → best is the <b>${gr > gl ? 'treasure (delayed reward)' : 'coin (immediate reward)'}</b>.` };
  }

  SQ.STEPS = [
    { name: 'Static: one input → one output', apply: () => { const s = SQ.state; clearTimeout(s.timer); s.order = [0, 1, 2, 3, 4]; s.shuffles = 0; cReset(); s.gamma = 0.9; },
      caption: 'A classifier labels each email on its own: ŷ = h(x). Nothing it predicts changes the next email it sees.' },
    { name: 'Order does not matter', apply: () => { const s = SQ.state; s.order = [3, 0, 4, 2, 1]; s.shuffles = 1; },
      caption: 'Shuffled the inbox — every email keeps exactly the same prediction. Examples are independent and identically distributed (i.i.d.).' },
    { name: 'Actions change the state', apply: () => { cReset(); cMove(1, true); },
      caption: 'In the corridor, pressing → moved the agent from s2 to s3. The same action from s5 would reach the treasure — the outcome depends on the <b>state</b>, and each action creates the next state.' },
    { name: 'Delayed reward (γ = 0.90)', apply: () => { SQ.state.gamma = 0.9; cAuto('opt', false); },
      caption: () => `Walking right costs −1 three times before +10 arrives. With γ = 0.90 the planner accepts short-term pain: G = −1 − 0.9 − 0.81 + 0.729·10 = <b>${f2(pathReturn(1, 0.9))}</b>.` },
    { name: 'Greedy grabs the coin', apply: () => { SQ.state.gamma = 0.9; cAuto('near', false); },
      caption: () => `A myopic agent grabs the nearby +2 coin: G = −1 + 0.9·2 = <b>${f2(pathReturn(-1, 0.9))}</b> — much worse than ${f2(pathReturn(1, 0.9))}. Good sequential decisions look ahead.` },
    { name: 'γ changes the best plan', apply: () => { SQ.state.gamma = 0.4; cAuto('opt', false); },
      caption: () => `With γ = 0.40 the future is heavily discounted: the treasure path is worth only ${f2(pathReturn(1, 0.4))}, so the optimal policy now takes the coin (${f2(pathReturn(-1, 0.4))}). The plans swap at γ ≈ ${f2(crossover())}.` }
  ];

  SQ.refresh = function (rebuild) {
    if (rebuild || !SQ.ctrl.querySelector('.evo-ctrl[data-lab="sequential"]')) sqBuildControls();
    else sqUpdateControls();
    sqRenderViz();
    icons();
  };

  function sqBuildControls() {
    SQ.ctrl.innerHTML = `<div class="tfp evo-ctrl" data-lab="sequential">
      ${storySection(SQ)}
      <div class="tfp-sec">
        <div class="tfp-sec-head"><span class="tfp-sec-title"><i data-lucide="inbox"></i> Static classifier</span><span class="tfp-sub">ŷ = h(x)</span></div>
        <div class="tfp-row"><button class="tfp-btn" data-act="c-shuffle"><i data-lucide="shuffle"></i>Shuffle inbox</button><span class="tfp-sub" id="evo-c-shuf"></span></div>
      </div>
      <div class="tfp-sec">
        <div class="tfp-sec-head"><span class="tfp-sec-title"><i data-lucide="footprints"></i> Sequential agent</span><span class="tfp-sub">a_t ~ π(s_t) ⇒ s_{t+1}, r_{t+1}</span></div>
        <div class="tfp-row"><span class="tfp-sub">discount γ</span><input type="range" min="0" max="0.99" step="0.01" value="${SQ.state.gamma}" data-act="c-gamma" class="evo-range"><b class="evo-rv" id="evo-c-g">${SQ.state.gamma.toFixed(2)}</b></div>
        <div class="tfp-row"><button class="tfp-btn" data-act="c-left"><i data-lucide="arrow-left"></i>Move ←</button>
          <button class="tfp-btn" data-act="c-right">Move →<i data-lucide="arrow-right"></i></button>
          <button class="tfp-btn ghost" data-act="c-reset"><i data-lucide="rotate-ccw"></i>New episode</button></div>
        <div class="tfp-row"><button class="tfp-btn" data-act="c-near"><i data-lucide="magnet"></i>Auto: grab nearest reward</button>
          <button class="tfp-btn primary" data-act="c-opt"><i data-lucide="route"></i>Auto: optimal for γ</button></div>
        <div class="tfp-calc" id="evo-c-calc"></div>
      </div>
    </div>`;
    sqUpdateControls();
  }

  function sqUpdateControls() {
    const s = SQ.state;
    const story = SQ.ctrl.querySelector('.evo-story');
    if (story) story.outerHTML = storySection(SQ);
    const sh = SQ.ctrl.querySelector('#evo-c-shuf');
    if (sh) sh.textContent = s.shuffles ? `shuffled ${s.shuffles}× — predictions unchanged` : '';
    const gi = SQ.ctrl.querySelector('[data-act="c-gamma"]');
    if (gi && +gi.value !== s.gamma) gi.value = s.gamma;
    const gv = SQ.ctrl.querySelector('#evo-c-g');
    if (gv) gv.textContent = s.gamma.toFixed(2);
    SQ.ctrl.querySelectorAll('[data-act="c-left"],[data-act="c-right"]').forEach(b => { b.disabled = s.done; });
    const calc = SQ.ctrl.querySelector('#evo-c-calc');
    if (calc) {
      const terms = s.traj.map(x => `${x.t === 0 ? '' : x.t === 1 ? 'γ·' : `γ${'⁰¹²³⁴⁵⁶⁷⁸⁹'[x.t] || '^' + x.t}·`}(${x.r})`);
      calc.innerHTML = `
        <div class="tfp-calc-line"><span class="tfp-calc-k">return</span><span>G = r₁ + γr₂ + γ²r₃ + …</span></div>
        <div class="tfp-calc-line"><span class="tfp-calc-k">so far</span><span>${terms.length ? terms.join(' + ') : '—'}</span></div>
        <div class="tfp-calc-line total"><span class="tfp-calc-k">G</span><span>= <b>${f2(cG())}</b>${s.done ? ' (episode over)' : ''}</span></div>`;
    }
  }

  function sqRenderViz() {
    const s = SQ.state;
    const { V, pol } = cValues(s.gamma);
    const gl = pathReturn(-1, s.gamma), gr = pathReturn(1, s.gamma), cx = crossover();

    const inbox = `<div class="evo-inbox">${s.order.map(i => `<div class="evo-mail"><span class="evo-mail-t">${esc(INBOX[i].t)}</span>${rBadge(INBOX[i].y)}</div>`).join('')}</div>
      <div class="tfp-hint">Each prediction depends only on its own email. Shuffling the order changes nothing — there is no state carried between decisions.</div>`;

    const cw = 64, W = CORR.n * cw;
    let cells = '';
    for (let i = 0; i < CORR.n; i++) {
      const term = i === CORR.coin || i === CORR.treasure;
      const fill = i === CORR.coin ? '#fef3c7' : i === CORR.treasure ? '#bbf7d0' : '#f8fafc';
      cells += `<rect x="${i * cw + 2}" y="22" width="${cw - 4}" height="56" rx="8" fill="${fill}" stroke="${s.traj.some(t => t.s2 === i) || i === CORR.start ? '#94a3b8' : '#e2e8f0'}"/>`;
      cells += `<text x="${i * cw + cw / 2}" y="16" class="evo-svg-ax" text-anchor="middle">s${i}</text>`;
      if (i === CORR.coin) cells += `<text x="${i * cw + cw / 2}" y="56" class="evo-c-r coin">+2</text><text x="${i * cw + cw / 2}" y="72" class="evo-c-sub">coin</text>`;
      else if (i === CORR.treasure) cells += `<text x="${i * cw + cw / 2}" y="56" class="evo-c-r gold">+10</text><text x="${i * cw + cw / 2}" y="72" class="evo-c-sub">treasure</text>`;
      else cells += `<text x="${i * cw + cw / 2}" y="72" class="evo-c-sub">−1 step</text>`;
      if (!term) cells += `<text x="${i * cw + cw / 2}" y="98" class="evo-c-pol">${pol[i] > 0 ? '→' : '←'}</text><text x="${i * cw + cw / 2}" y="112" class="evo-c-v">V=${f2(V[i])}</text>`;
    }
    const trail = s.traj.length ? `<polyline points="${[s.traj[0].s].concat(s.traj.map(t => t.s2)).map((p, k) => `${p * cw + cw / 2},${44 - Math.min(k, 6)}`).join(' ')}" fill="none" stroke="#0284c7" stroke-width="2.5" stroke-opacity="0.45"/>` : '';
    const agent = `<g transform="translate(${s.pos * cw + cw / 2},44)"><circle r="12" fill="#0284c7" stroke="#fff" stroke-width="2.5"/><circle cx="-4" cy="-2" r="2" fill="#fff"/><circle cx="4" cy="-2" r="2" fill="#fff"/></g>`;
    const corridor = `<div class="evo-plot-wrap"><svg class="evo-corr" viewBox="0 0 ${W} 118">${cells}${trail}${agent}</svg></div>
      <div class="evo-legend"><span>arrow = optimal action at γ = ${s.gamma.toFixed(2)}</span><span>V = value of the state</span></div>`;

    const rows = s.traj.map(x => `<tr><td>${x.t}</td><td>s${x.s}</td><td>${x.a}</td><td>${x.r}</td><td>${Math.pow(s.gamma, x.t).toFixed(3)}</td><td>${f2(Math.pow(s.gamma, x.t) * x.r)}</td></tr>`).join('');
    const traj = s.traj.length ? `<div class="tfp-table-wrap"><table class="tfp-table"><thead><tr><th>t</th><th>s</th><th>a</th><th>r</th><th>γᵗ</th><th>γᵗ·r</th></tr></thead><tbody>${rows}
      <tr class="sel"><td colspan="5" class="t">return G</td><td><b>${f2(cG())}</b></td></tr></tbody></table></div>`
      : '<span class="tfp-empty">Move the agent (or use an Auto button) to record a trajectory.</span>';

    // G vs γ chart
    const cwid = 300, ch = 130, gmin = -3, gmax = 6;
    const X = g => 30 + g * (cwid - 40), Y = v => 10 + (gmax - Math.max(gmin, Math.min(gmax, v))) / (gmax - gmin) * (ch - 30);
    const line = dir => Array.from({ length: 51 }, (_, i) => i / 50).map(g => `${X(g).toFixed(1)},${Y(pathReturn(dir, g)).toFixed(1)}`).join(' ');
    const chart = `<svg class="evo-gchart" viewBox="0 0 ${cwid} ${ch}">
      <line x1="30" x2="${cwid - 10}" y1="${Y(0)}" y2="${Y(0)}" stroke="#e2e8f0"/>
      ${[-2, 0, 2, 4, 6].map(v => `<text x="26" y="${Y(v) + 3}" text-anchor="end" class="evo-svg-ax">${v}</text>`).join('')}
      ${[0, 0.5, 1].map(g => `<text x="${X(g)}" y="${ch - 4}" text-anchor="middle" class="evo-svg-ax">${g}</text>`).join('')}
      <text x="${cwid - 10}" y="${ch - 4}" text-anchor="end" class="evo-svg-ax">γ</text>
      <polyline points="${line(-1)}" fill="none" stroke="#f59e0b" stroke-width="2.5"/>
      <polyline points="${line(1)}" fill="none" stroke="#10b981" stroke-width="2.5"/>
      ${cx ? `<line x1="${X(cx)}" x2="${X(cx)}" y1="10" y2="${ch - 20}" stroke="#94a3b8" stroke-dasharray="3 3"/>` : ''}
      <line x1="${X(s.gamma)}" x2="${X(s.gamma)}" y1="10" y2="${ch - 20}" stroke="#0284c7" stroke-width="2"/>
      <circle cx="${X(s.gamma)}" cy="${Y(gl)}" r="4" fill="#f59e0b"/><circle cx="${X(s.gamma)}" cy="${Y(gr)}" r="4" fill="#10b981"/>
    </svg>
    <div class="evo-legend"><span><i style="background:#f59e0b"></i>coin path (left): ${f2(gl)}</span><span><i style="background:#10b981"></i>treasure path (right): ${f2(gr)}</span>${cx ? `<span>paths swap at γ ≈ ${f2(cx)}</span>` : ''}</div>`;

    SQ.viz.innerHTML = `<div class="evo-viz" data-lab="sequential">
      <div class="tfp-viz-head"><h3>Static Prediction vs. Sequential Decisions</h3>
        <span class="tfp-stat-chips"><span>γ ${s.gamma.toFixed(2)}</span><span>t ${s.traj.length}</span></span></div>
      ${msgHTML(s.msg, 'Shuffle the inbox, then move the agent. Drag γ and watch the optimal arrows flip.')}
      <div class="evo-two">
        ${card('<i data-lucide="inbox"></i> Classifier (static, i.i.d.)', `order: ${s.order.map(i => i + 1).join(' ')}`, inbox, 'evo-static')}
        ${card('<i data-lucide="footprints"></i> Agent in a corridor (sequential MDP)', `state s${s.pos}${s.done ? ' · terminal' : ''}`, corridor, 'evo-seq')}
      </div>
      ${card('Trajectory and discounted return', 'G = Σ γᵗ · r_{t+1}', traj)}
      ${card('Which plan is better depends on γ', 'return of each path vs. discount factor', chart)}
    </div>`;
  }

  SQ.onClick = function (e) {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const s = SQ.state;
    switch (b.dataset.act) {
      case 'story-start': clearTimeout(s.timer); storyGo(SQ, 0); break;
      case 'story-go': clearTimeout(s.timer); storyGo(SQ, +b.dataset.k); break;
      case 'story-exit': storyExit(SQ); break;
      case 'c-shuffle': {
        const rng = mulberry32(100 + s.shuffles);
        const o = s.order.slice();
        for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; }
        s.order = o; s.shuffles++;
        s.msg = { kind: 'change', html: `Inbox shuffled (order ${o.map(i => i + 1).join(', ')}). Every email kept the same prediction — static decisions are independent of order. Try reversing the agent's moves instead: you can't.` };
        break;
      }
      case 'c-left': clearTimeout(s.timer); cMove(-1); break;
      case 'c-right': clearTimeout(s.timer); cMove(1); break;
      case 'c-reset': clearTimeout(s.timer); cReset(); s.msg = { kind: 'info', html: `New episode: agent back at s${CORR.start}.` }; break;
      case 'c-near': cAuto('near', true); return;
      case 'c-opt': cAuto('opt', true); return;
      default: return;
    }
    SQ.refresh(false);
  };
  SQ.onInput = function (e) {
    if (e.target.dataset.act !== 'c-gamma') return;
    const s = SQ.state;
    const prevBest = pathReturn(1, s.gamma) > pathReturn(-1, s.gamma) ? 'treasure' : 'coin';
    s.gamma = +e.target.value;
    const gl = pathReturn(-1, s.gamma), gr = pathReturn(1, s.gamma);
    const best = gr > gl ? 'treasure' : 'coin';
    s.msg = { kind: 'change', html: `γ = ${s.gamma.toFixed(2)}: coin path G = ${f2(gl)}, treasure path G = ${f2(gr)} → best plan: <b>${best}</b>${best !== prevBest ? ' (the optimal policy just flipped!)' : ''}. ${s.gamma < 0.3 ? 'Low γ = impatient agent: only near-term reward counts.' : s.gamma > 0.8 ? 'High γ = far-sighted agent: future reward counts almost fully.' : ''}` };
    SQ.refresh(false);
  };

  // ===========================================================================
  // Public API
  // ===========================================================================
  window.EvolutionLab = {
    renderRules: col => mount(RL, col),
    renderParadigms: col => mount(PD, col),
    renderSequential: col => mount(SQ, col)
  };
})();
