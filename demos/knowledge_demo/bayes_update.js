/**
 * bayes_update.js — Topic 05 · Uncertainty & Bayes · "Conditional Probability & Bayes' Rule"
 * concept (knowledge.html)
 *
 * Interactive belief-update lab: how an agent turns a prior belief P(H) into a
 * posterior belief P(H | E) after observing evidence E, using Bayes' rule
 * (AIMA §12.5):
 *
 *     P(H | E) = P(E | H) P(H) / P(E),   P(E) = P(E | H) P(H) + P(E | ¬H) P(¬H)
 *
 * Three scenarios — Exam Success, Spam Detection, Medical Diagnosis — each with
 * sliders for the prior P(H), true-positive rate P(E | H) and false-positive
 * rate P(E | ¬H). Every change immediately recomputes the worked solution,
 * probability tree, population diagram and prior-vs-posterior chart.
 *
 * Layout: problem, sliders, Reset / Show-Solution buttons and the step-by-step
 * calculation go in the concept column (#kl-concept-lab, below the definition
 * card); the live visualizations fill the illustration column.
 *
 * Public API: window.BayesUpdateLab = { render(graphCol), compute(p, tpr, fpr) }
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Scenarios
  // ---------------------------------------------------------------------------
  const EXAMPLES = [
    {
      id: 'exam', name: 'Exam Success', icon: 'graduation-cap',
      title: 'Will the student pass the exam?',
      story: 'A tutoring agent predicts whether a student will <b>pass</b> the final exam. From past cohorts it knows how often students pass, how often students who passed had studied, and how often students who failed had still studied. The agent then observes that this student <b>studied</b>.',
      question: 'Given that the student studied, what is the probability that they pass? <code>P(Pass | Studied)</code>',
      H: 'Pass', nH: 'Fail', E: 'Studied', nE: 'Did not study', noun: 'students',
      defaults: { prior: 0.60, tpr: 0.90, fpr: 0.30 },
      hint: { prior: 'Share of students who pass', tpr: 'Passing students who studied', fpr: 'Failing students who still studied' }
    },
    {
      id: 'spam', name: 'Spam Detection', icon: 'mail',
      title: 'Is this email spam?',
      story: 'A spam-filter agent must classify an incoming email. It knows what fraction of all email is <b>spam</b>, how often spam contains the keyword <b>“FREE”</b>, and how often legitimate email (ham) contains it too. The new email contains <b>“FREE”</b>.',
      question: 'Given that the email contains “FREE”, what is the probability that it is spam? <code>P(Spam | “FREE”)</code>',
      H: 'Spam', nH: 'Not spam', E: '“FREE”', nE: 'No “FREE”', noun: 'emails',
      defaults: { prior: 0.20, tpr: 0.70, fpr: 0.05 },
      hint: { prior: 'Share of all email that is spam', tpr: 'Spam emails containing “FREE”', fpr: 'Legitimate emails containing “FREE”' }
    },
    {
      id: 'medical', name: 'Medical Diagnosis', icon: 'stethoscope',
      title: 'Does the patient have the disease?',
      story: 'A diagnostic agent screens patients for a rare <b>disease</b>. It knows the disease prevalence, the test’s sensitivity (sick patients who test positive) and its false-alarm rate (healthy patients who test positive). A patient’s test comes back <b>positive</b>.',
      question: 'Given a positive test, what is the probability that the patient has the disease? <code>P(Disease | Test +)</code>',
      H: 'Disease', nH: 'Healthy', E: 'Test +', nE: 'Test −', noun: 'patients',
      defaults: { prior: 0.01, tpr: 0.95, fpr: 0.05 },
      hint: { prior: 'Prevalence of the disease', tpr: 'Sensitivity: sick patients testing +', fpr: 'False alarms: healthy patients testing +' }
    }
  ];

  const POP = 1000;          // population-diagram size
  const POP_COLS = 40;       // 40 × 25 grid

  // Per-example slider state, so switching examples keeps each one's settings.
  const values = EXAMPLES.map(ex => Object.assign({}, ex.defaults));
  let exIdx = 0;
  let showSolution = false;
  let ctrlHost = null;
  let vizHost = null;

  // ---------------------------------------------------------------------------
  // Maths
  // ---------------------------------------------------------------------------
  function compute(prior, tpr, fpr) {
    const pH = prior, pN = 1 - prior;
    const jHE = tpr * pH;            // P(E ∧ H)
    const jNE = fpr * pN;            // P(E ∧ ¬H)
    const jHnE = (1 - tpr) * pH;     // P(¬E ∧ H)
    const jNnE = (1 - fpr) * pN;     // P(¬E ∧ ¬H)
    const pE = jHE + jNE;
    const pnE = jHnE + jNnE;
    const post = pE > 0 ? jHE / pE : 0;
    const postNeg = pnE > 0 ? jHnE / pnE : 0;
    const lr = fpr > 0 ? tpr / fpr : Infinity;
    const priorOdds = pH / pN;
    const postOdds = post / (1 - post);
    return { pH, pN, tpr, fpr, jHE, jNE, jHnE, jNnE, pE, pnE, post, postNeg, lr, priorOdds, postOdds, alpha: pE > 0 ? 1 / pE : Infinity };
  }

  function population(prior, tpr, fpr) {
    const nH = Math.round(POP * prior);
    const tp = Math.round(nH * tpr);
    const nN = POP - nH;
    const fp = Math.round(nN * fpr);
    return { nH, nN, tp, fn: nH - tp, fp, tn: nN - fp };
  }

  // ---------------------------------------------------------------------------
  // Formatting helpers
  // ---------------------------------------------------------------------------
  const pct = x => {
    const v = x * 100;
    if (v !== 0 && Math.abs(v) < 1) return v.toFixed(2) + '%';
    return v.toFixed(1) + '%';
  };
  const f4 = x => (Number.isFinite(x) ? x.toFixed(4) : '∞');
  const f2 = x => (Number.isFinite(x) ? (x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x.toFixed(2)) : '∞');
  const n1 = x => (Math.abs(x - Math.round(x)) < 1e-9 ? String(Math.round(x)) : x.toFixed(1));

  // ---------------------------------------------------------------------------
  // Skeletons (rebuilt only when the example changes, so sliders keep focus)
  // ---------------------------------------------------------------------------
  function buildControls() {
    const ex = EXAMPLES[exIdx];
    const v = values[exIdx];
    const slider = (key, label, genericName) => `
      <label class="kbu-slider" for="kbu-sl-${key}">
        <span class="kbu-sl-top">
          <span class="kbu-sl-name">${genericName} <code>${label}</code></span>
          <b id="kbu-val-${key}">${pct(v[key])}</b>
        </span>
        <input type="range" id="kbu-sl-${key}" data-key="${key}" min="0.001" max="0.999" step="0.001" value="${v[key]}" aria-label="${genericName} ${label.replace(/<[^>]+>/g, '')}">
        <span class="kbu-sl-hint">${ex.hint[key]}</span>
      </label>`;

    ctrlHost.innerHTML = `
      <div class="kbu kbu-controls">
        <div class="kbu-label"><i data-lucide="flask-conical"></i> Interactive Example · How an Agent Updates Its Belief</div>

        <div class="kbu-ex-tabs" role="tablist" aria-label="Choose an example">
          ${EXAMPLES.map((e, i) => `
            <button class="kbu-ex-tab ${i === exIdx ? 'active' : ''}" role="tab" aria-selected="${i === exIdx}" data-ex="${i}">
              <i data-lucide="${e.icon}"></i> ${i + 1}. ${e.name}
            </button>`).join('')}
        </div>

        <div class="kbu-problem">
          <div class="kbu-problem-title">${ex.title}</div>
          <p>${ex.story}</p>
          <div class="kbu-vars">
            <span><b>H</b> = ${ex.H}</span>
            <span><b>¬H</b> = ${ex.nH}</span>
            <span><b>E</b> = ${ex.E}</span>
          </div>
          <p class="kbu-question"><b>Question:</b> ${ex.question}</p>
          <div class="kbu-defaults">Default values: P(${ex.H}) = ${pct(ex.defaults.prior)} · P(${ex.E} | ${ex.H}) = ${pct(ex.defaults.tpr)} · P(${ex.E} | ${ex.nH}) = ${pct(ex.defaults.fpr)}</div>
        </div>

        <div class="kbu-sliders">
          ${slider('prior', `P(${ex.H})`, 'Prior')}
          ${slider('tpr', `P(${ex.E} | ${ex.H})`, 'True positive rate')}
          ${slider('fpr', `P(${ex.E} | ${ex.nH})`, 'False positive rate')}
        </div>

        <div class="kbu-actions">
          <button class="klt-btn" id="kbu-reset"><i data-lucide="rotate-ccw"></i> Reset</button>
          <button class="klt-btn klt-btn-primary" id="kbu-solution-btn" aria-expanded="${showSolution}"></button>
        </div>

        <div class="kbu-solution" id="kbu-solution"></div>
      </div>`;

    ctrlHost.querySelectorAll('.kbu-ex-tab').forEach(b => {
      b.addEventListener('click', () => {
        exIdx = parseInt(b.dataset.ex, 10);
        draw();
      });
    });
    ctrlHost.querySelectorAll('input[type="range"]').forEach(inp => {
      inp.addEventListener('input', () => {
        values[exIdx][inp.dataset.key] = parseFloat(inp.value);
        update();
      });
    });
    ctrlHost.querySelector('#kbu-reset').addEventListener('click', () => {
      values[exIdx] = Object.assign({}, EXAMPLES[exIdx].defaults);
      ctrlHost.querySelectorAll('input[type="range"]').forEach(inp => { inp.value = values[exIdx][inp.dataset.key]; });
      update();
    });
    ctrlHost.querySelector('#kbu-solution-btn').addEventListener('click', () => {
      showSolution = !showSolution;
      update();
    });
  }

  function buildViz() {
    const ex = EXAMPLES[exIdx];
    vizHost.innerHTML = `
      <div class="kbu kbu-viz">
        <div class="klt-head">
          <div class="klt-head-title"><i data-lucide="${ex.icon}"></i> ${ex.name}: P(${ex.H} | ${ex.E})</div>
          <span class="klt-tag info">updates live</span>
        </div>

        <div class="kbu-result" id="kbu-result"></div>

        <section class="klt-panel kbu-panel">
          <h4 class="klt-panel-title"><i data-lucide="bar-chart-3"></i> Prior vs. Posterior Belief</h4>
          <div class="kbu-chart" id="kbu-chart">
            ${['prior', 'post', 'neg'].map(k => `
              <div class="kbu-bar-row" data-row="${k}">
                <span class="kbu-bar-label"></span>
                <span class="kbu-bar-track"><span class="kbu-bar-fill ${k}"></span></span>
                <b class="kbu-bar-val"></b>
              </div>`).join('')}
          </div>
          <div class="kbu-panel-foot" id="kbu-chart-foot"></div>
        </section>

        <section class="klt-panel kbu-panel">
          <h4 class="klt-panel-title"><i data-lucide="git-fork"></i> Probability Tree</h4>
          <div class="kbu-tree" id="kbu-tree"></div>
          <div class="kbu-panel-foot" id="kbu-tree-foot"></div>
        </section>

        <section class="klt-panel kbu-panel">
          <h4 class="klt-panel-title"><i data-lucide="users"></i> Population Diagram · ${POP.toLocaleString()} ${ex.noun}</h4>
          <div class="kbu-pop" id="kbu-pop"></div>
          <div class="kbu-legend" id="kbu-pop-legend"></div>
          <div class="kbu-panel-foot" id="kbu-pop-foot"></div>
        </section>
      </div>`;
  }

  // ---------------------------------------------------------------------------
  // Live updates
  // ---------------------------------------------------------------------------
  function update() {
    const ex = EXAMPLES[exIdx];
    const v = values[exIdx];
    const r = compute(v.prior, v.tpr, v.fpr);

    ['prior', 'tpr', 'fpr'].forEach(k => {
      const el = document.getElementById('kbu-val-' + k);
      if (el) el.textContent = pct(v[k]);
    });

    updateResult(ex, r);
    updateChart(ex, r);
    updateTree(ex, r);
    updatePopulation(ex, v);
    updateSolution(ex, r);
  }

  function insight(ex, r) {
    if (Math.abs(r.lr - 1) < 0.02) {
      return `The evidence is uninformative: ${ex.E} is about equally likely whether or not H is true (likelihood ratio ≈ 1), so the belief barely moves.`;
    }
    const dir = r.lr > 1 ? 'raises' : 'lowers';
    let s = `Observing <b>${ex.E}</b> ${dir} the belief in <b>${ex.H}</b> from ${pct(r.pH)} to ${pct(r.post)}. The evidence multiplies the odds by the likelihood ratio P(E|H) / P(E|¬H) = ${f2(r.lr)}.`;
    if (r.lr > 1 && r.post < 0.5) {
      s += ` Even so, the posterior stays below 50%: the low prior means false positives from the large ¬H group outnumber the true positives — the <b>base-rate effect</b>.`;
    }
    return s;
  }

  function updateResult(ex, r) {
    const el = document.getElementById('kbu-result');
    if (!el) return;
    const shift = (r.post - r.pH) * 100;
    const sign = shift >= 0 ? '+' : '−';
    el.innerHTML = `
      <div class="kbu-belief">
        <div class="kbu-belief-box prior">
          <span>Prior belief</span>
          <b>${pct(r.pH)}</b>
          <small>P(${ex.H})</small>
        </div>
        <div class="kbu-belief-arrow">
          <span>observe ${ex.E}</span>
          <i data-lucide="arrow-right"></i>
          <small class="${shift >= 0 ? 'up' : 'down'}">${sign}${Math.abs(shift).toFixed(1)} pts</small>
        </div>
        <div class="kbu-belief-box post">
          <span>Posterior belief</span>
          <b>${pct(r.post)}</b>
          <small>P(${ex.H} | ${ex.E})</small>
        </div>
      </div>
      <p class="kbu-insight">${insight(ex, r)}</p>`;
    // (icons in this block are created by updateSolution's createIcons call)
  }

  function updateChart(ex, r) {
    const rows = {
      prior: [`Prior P(${ex.H})`, r.pH],
      post: [`Posterior P(${ex.H} | ${ex.E})`, r.post],
      neg: [`If not observed: P(${ex.H} | ¬${ex.E})`, r.postNeg]
    };
    Object.keys(rows).forEach(k => {
      const row = document.querySelector(`#kbu-chart [data-row="${k}"]`);
      if (!row) return;
      row.querySelector('.kbu-bar-label').textContent = rows[k][0];
      row.querySelector('.kbu-bar-fill').style.width = Math.max(0.4, rows[k][1] * 100) + '%';
      row.querySelector('.kbu-bar-val').textContent = pct(rows[k][1]);
    });
    const foot = document.getElementById('kbu-chart-foot');
    if (foot) {
      foot.innerHTML = `Odds form: posterior odds = likelihood ratio × prior odds → <code>${f2(r.postOdds)} = ${f2(r.lr)} × ${f2(r.priorOdds)}</code>. The grey bar shows where belief would move if the agent observed ¬${ex.E} instead.`;
    }
  }

  function updateTree(ex, r) {
    const el = document.getElementById('kbu-tree');
    if (!el) return;
    // Layout in a 540 × 236 viewBox
    const root = [40, 118];
    const mid = { H: [200, 62], N: [200, 174] };
    const leaf = { HE: [368, 30], HnE: [368, 94], NE: [368, 142], NnE: [368, 206] };
    const edge = (a, b, cls, label, lblPos) => {
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      return `<line class="kbu-t-edge ${cls}" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>
        <text class="kbu-t-elbl ${cls}" x="${mx - 6}" y="${my + (lblPos === 'up' ? -7 : 16)}">${label}</text>`;
    };
    const node = (p, text, cls, w) => `
      <g class="kbu-t-node ${cls}">
        <rect x="${p[0] - w / 2}" y="${p[1] - 13}" width="${w}" height="26" rx="7"/>
        <text x="${p[0]}" y="${p[1] + 4}">${text}</text>
      </g>`;
    const joint = (p, text, val, cls) => `
      <text class="kbu-t-joint ${cls}" x="${p[0] + 62}" y="${p[1] - 1}">${text}</text>
      <text class="kbu-t-jval ${cls}" x="${p[0] + 62}" y="${p[1] + 13}">= ${f4(val)}</text>`;
    const short = s => (s.length > 14 ? s.slice(0, 13) + '…' : s);

    el.innerHTML = `
      <svg viewBox="0 0 540 236" class="kbu-tree-svg" role="img" aria-label="Probability tree for ${ex.H} and ${ex.E}">
        ${edge(root, mid.H, 'h', `P(H) = ${f4(r.pH)}`, 'up')}
        ${edge(root, mid.N, 'n', `P(¬H) = ${f4(r.pN)}`, 'down')}
        ${edge(mid.H, leaf.HE, 'e hl-h', f4(r.tpr), 'up')}
        ${edge(mid.H, leaf.HnE, 'ne', f4(1 - r.tpr), 'down')}
        ${edge(mid.N, leaf.NE, 'e hl-n', f4(r.fpr), 'up')}
        ${edge(mid.N, leaf.NnE, 'ne', f4(1 - r.fpr), 'down')}
        ${node(root, 'Start', 'root', 62)}
        ${node(mid.H, short(ex.H), 'h', 90)}
        ${node(mid.N, short(ex.nH), 'n', 90)}
        ${node(leaf.HE, short(ex.E), 'leaf hl-h', 106)}
        ${node(leaf.HnE, short(ex.nE), 'leaf dim', 106)}
        ${node(leaf.NE, short(ex.E), 'leaf hl-n', 106)}
        ${node(leaf.NnE, short(ex.nE), 'leaf dim', 106)}
        ${joint(leaf.HE, 'P(E ∧ H)', r.jHE, 'hl-h')}
        ${joint(leaf.HnE, 'P(¬E ∧ H)', r.jHnE, 'dim')}
        ${joint(leaf.NE, 'P(E ∧ ¬H)', r.jNE, 'hl-n')}
        ${joint(leaf.NnE, 'P(¬E ∧ ¬H)', r.jNnE, 'dim')}
      </svg>`;

    const foot = document.getElementById('kbu-tree-foot');
    if (foot) {
      foot.innerHTML = `Observing <b>${ex.E}</b> keeps only the highlighted branches. P(E) = <span class="kbu-c-h">${f4(r.jHE)}</span> + <span class="kbu-c-n">${f4(r.jNE)}</span> = <b>${f4(r.pE)}</b>, so P(${ex.H} | ${ex.E}) = <span class="kbu-c-h">${f4(r.jHE)}</span> / ${f4(r.pE)} = <b>${f4(r.post)}</b>.`;
    }
  }

  function updatePopulation(ex, v) {
    const el = document.getElementById('kbu-pop');
    if (!el) return;
    const c = population(v.prior, v.tpr, v.fpr);
    const order = [['tp', c.tp], ['fn', c.fn], ['fp', c.fp], ['tn', c.tn]];
    const cell = 12, r = 4.3;
    const rows = Math.ceil(POP / POP_COLS);
    let i = 0, dots = '';
    order.forEach(([cls, n]) => {
      for (let k = 0; k < n; k++, i++) {
        const x = (i % POP_COLS) * cell + cell / 2;
        const y = Math.floor(i / POP_COLS) * cell + cell / 2;
        dots += `<circle class="kbu-dot ${cls}" cx="${x}" cy="${y}" r="${r}"/>`;
      }
    });
    el.innerHTML = `<svg viewBox="0 0 ${POP_COLS * cell} ${rows * cell}" class="kbu-pop-svg" role="img" aria-label="${POP} ${ex.noun}: ${c.tp} ${ex.H} with ${ex.E}, ${c.fn} ${ex.H} without, ${c.fp} ${ex.nH} with ${ex.E}, ${c.tn} ${ex.nH} without">${dots}</svg>`;

    const legend = document.getElementById('kbu-pop-legend');
    if (legend) {
      legend.innerHTML = `
        <span><i class="lg tp"></i>${ex.H} &amp; ${ex.E} <b>${c.tp}</b></span>
        <span><i class="lg fn"></i>${ex.H} &amp; ${ex.nE} <b>${c.fn}</b></span>
        <span><i class="lg fp"></i>${ex.nH} &amp; ${ex.E} <b>${c.fp}</b></span>
        <span><i class="lg tn"></i>${ex.nH} &amp; ${ex.nE} <b>${c.tn}</b></span>`;
    }
    const foot = document.getElementById('kbu-pop-foot');
    if (foot) {
      const totE = c.tp + c.fp;
      const share = totE > 0 ? c.tp / totE : 0;
      foot.innerHTML = `The solid dots are the <b>${totE}</b> ${ex.noun} showing ${ex.E}. Of those, <span class="kbu-c-h"><b>${c.tp}</b></span> are ${ex.H} and <span class="kbu-c-n"><b>${c.fp}</b></span> are ${ex.nH}, so P(${ex.H} | ${ex.E}) ≈ ${c.tp} / ${totE} = <b>${pct(share)}</b>. <span class="klt-muted">(Expected counts: ${n1(POP * v.prior * v.tpr)} and ${n1(POP * (1 - v.prior) * v.fpr)}; dots are rounded to whole ${ex.noun}.)</span>`;
    }
  }

  function updateSolution(ex, r) {
    const btn = document.getElementById('kbu-solution-btn');
    const el = document.getElementById('kbu-solution');
    if (!btn || !el) return;
    btn.innerHTML = showSolution
      ? '<i data-lucide="eye-off"></i> Hide Solution'
      : '<i data-lucide="eye"></i> Show Solution';
    btn.setAttribute('aria-expanded', String(showSolution));

    if (!showSolution) {
      el.innerHTML = `<div class="kbu-sol-hidden"><i data-lucide="pencil"></i><span>Try it first: compute P(${ex.H} | ${ex.E}) from the three values above, then press <b>Show Solution</b> to check the step-by-step working.</span></div>`;
    } else {
      el.innerHTML = `
        <div class="kbu-sol-title">Step-by-step solution with Bayes' rule</div>
        <ol class="kbu-steps">
          <li>
            <div class="kbu-step-name">Write down what the agent knows</div>
            <div class="kbu-math">
              P(H) = P(${ex.H}) = ${f4(r.pH)}<br>
              P(¬H) = 1 − P(H) = 1 − ${f4(r.pH)} = ${f4(r.pN)}<br>
              P(E | H) = P(${ex.E} | ${ex.H}) = ${f4(r.tpr)}<br>
              P(E | ¬H) = P(${ex.E} | ${ex.nH}) = ${f4(r.fpr)}
            </div>
          </li>
          <li>
            <div class="kbu-step-name">Joint probabilities (product rule)</div>
            <div class="kbu-math">
              P(E ∧ H) = P(E | H) · P(H) = ${f4(r.tpr)} × ${f4(r.pH)} = <span class="kbu-c-h">${f4(r.jHE)}</span><br>
              P(E ∧ ¬H) = P(E | ¬H) · P(¬H) = ${f4(r.fpr)} × ${f4(r.pN)} = <span class="kbu-c-n">${f4(r.jNE)}</span>
            </div>
          </li>
          <li>
            <div class="kbu-step-name">Probability of the evidence (total probability)</div>
            <div class="kbu-math">
              P(E) = P(E ∧ H) + P(E ∧ ¬H) = ${f4(r.jHE)} + ${f4(r.jNE)} = <b>${f4(r.pE)}</b>
            </div>
          </li>
          <li>
            <div class="kbu-step-name">Apply Bayes' rule</div>
            <div class="kbu-math">
              P(H | E) = P(E | H) · P(H) / P(E) = ${f4(r.jHE)} / ${f4(r.pE)} = <b class="kbu-answer">${f4(r.post)} (${pct(r.post)})</b>
            </div>
          </li>
          <li>
            <div class="kbu-step-name">Check with normalization (α form)</div>
            <div class="kbu-math">
              α = 1 / P(E) = ${f2(r.alpha)}<br>
              P(H | E), P(¬H | E) = α ⟨${f4(r.jHE)}, ${f4(r.jNE)}⟩ = ⟨${f4(r.post)}, ${f4(1 - r.post)}⟩ ✓ sums to 1
            </div>
          </li>
        </ol>
        <div class="kbu-sol-answer"><b>Answer:</b> after observing ${ex.E}, the agent's belief in ${ex.H} moves from ${pct(r.pH)} to <b>${pct(r.post)}</b>.</div>`;
    }
    if (window.lucide) window.lucide.createIcons();
  }

  // ---------------------------------------------------------------------------
  // Entry point
  // ---------------------------------------------------------------------------
  function draw() {
    if (!vizHost) return;
    ctrlHost = document.getElementById('kl-concept-lab');
    if (!ctrlHost) {
      // Fallback: no concept-column host — stack everything in the graph column.
      const wrap = document.createElement('div');
      vizHost.innerHTML = '';
      ctrlHost = document.createElement('div');
      const viz = document.createElement('div');
      wrap.appendChild(ctrlHost);
      wrap.appendChild(viz);
      vizHost.appendChild(wrap);
      const graph = vizHost;
      vizHost = viz;
      buildControls(); buildViz(); update();
      vizHost = graph;
      if (window.lucide) window.lucide.createIcons();
      return;
    }
    buildControls();
    buildViz();
    update();
    if (window.lucide) window.lucide.createIcons();
  }

  function render(graphCol) { vizHost = graphCol; draw(); }

  window.BayesUpdateLab = { render, compute, population, _examples: EXAMPLES };
})();
