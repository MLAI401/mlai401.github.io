/**
 * bayes_trace.js — Topic 05 · Bayesian Networks · "Lab Code Trace" concept (knowledge.html)
 *
 * Lab: Bayesian Networks & Probabilistic Inference
 *      Network formulation, exact inference (enumeration) & sampling
 *      (rejection sampling & likelihood weighting) — AIMA Chapter 14.
 *
 * The Python shown is the reference solution from aima/probability.py
 * (BayesNode, BayesNet, enumeration_ask, prior_sample, rejection_sampling,
 * likelihood_weighting) plus the small lab helpers that use it. Every step is
 * produced by a JavaScript mirror of that code, so the numbers on screen are
 * the numbers the Python prints.
 *
 * Layout follows the CPP201 "Trace the Code" demo (same as the Topic 04 CSP
 * code traces): Python source in the concept column (#kl-concept-code);
 * part selector, stepper, runtime state and "What's happening?" in the
 * illustration column.
 *
 * Public API: window.BayesLabTrace = { render(graphCol), stop() }
 */
(function () {
  'use strict';

  const T = true, F = false;
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const tf = b => (b ? 'T' : 'F');
  const ABBR = { Burglary: 'B', Earthquake: 'E', Alarm: 'A', JohnCalls: 'J', MaryCalls: 'M', Cloudy: 'C', Sprinkler: 'S', Rain: 'R', WetGrass: 'W' };
  const lit = (v, val) => (val ? '' : '¬') + ABBR[v].toLowerCase();
  const fmt = x => {
    if (x == null || Number.isNaN(x)) return '—';
    if (x === 0) return '0';
    if (x === 1) return '1.0';
    return Math.abs(x) >= 0.01 ? x.toFixed(4) : x.toPrecision(3);
  };
  const pct = x => (x == null ? '—' : (x * 100).toFixed(2) + '%');

  // ---------------------------------------------------------------------------
  // Networks (identical to aima/probability.py: burglary, sprinkler)
  // CPT keys are the parents' values joined: '' (root), 'T', 'F', 'TT', ...
  // ---------------------------------------------------------------------------
  function makeNet(specs) {
    const nodes = specs.map(([v, parents, cpt]) => ({ v, parents, cpt }));
    const map = {};
    nodes.forEach(n => { map[n.v] = n; });
    return { nodes, vars: nodes.map(n => n.v), node: v => map[v] };
  }
  const NETS = {
    burglary: makeNet([
      ['Burglary', [], { '': 0.001 }],
      ['Earthquake', [], { '': 0.002 }],
      ['Alarm', ['Burglary', 'Earthquake'], { TT: 0.95, TF: 0.94, FT: 0.29, FF: 0.001 }],
      ['JohnCalls', ['Alarm'], { T: 0.90, F: 0.05 }],
      ['MaryCalls', ['Alarm'], { T: 0.70, F: 0.01 }]
    ]),
    sprinkler: makeNet([
      ['Cloudy', [], { '': 0.5 }],
      ['Sprinkler', ['Cloudy'], { T: 0.10, F: 0.50 }],
      ['Rain', ['Cloudy'], { T: 0.80, F: 0.20 }],
      ['WetGrass', ['Sprinkler', 'Rain'], { TT: 0.99, TF: 0.90, FT: 0.90, FF: 0.00 }]
    ])
  };
  const POS = {
    burglary: { Burglary: [95, 36], Earthquake: [265, 36], Alarm: [180, 104], JohnCalls: [95, 172], MaryCalls: [265, 172] },
    sprinkler: { Cloudy: [180, 34], Sprinkler: [85, 104], Rain: [275, 104], WetGrass: [180, 172] }
  };

  const cptKey = (n, ev) => n.parents.map(p => tf(ev[p])).join('');
  const pr = (n, val, ev) => { const pt = n.cpt[cptKey(n, ev)]; return val ? pt : 1 - pt; };
  const condTxt = (n, val, ev) => `P(${lit(n.v, val)}${n.parents.length ? ' | ' + n.parents.map(p => lit(p, ev[p])).join(', ') : ''})`;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** enumeration_ask without tracing — used for ground truth. */
  function enumAsk(bn, X, e) {
    const all = (vars, ev) => {
      if (!vars.length) return 1;
      const [Y, ...rest] = vars, n = bn.node(Y);
      if (Y in ev) return pr(n, ev[Y], ev) * all(rest, ev);
      return [T, F].reduce((s, y) => { const ev2 = Object.assign({}, ev, { [Y]: y }); return s + pr(n, y, ev2) * all(rest, ev2); }, 0);
    };
    const qt = all(bn.vars, Object.assign({}, e, { [X]: T }));
    const qf = all(bn.vars, Object.assign({}, e, { [X]: F }));
    return { T: qt / (qt + qf), F: qf / (qt + qf), rawT: qt, rawF: qf };
  }
  const consistent = (s, e) => Object.keys(e).every(k => s[k] === e[k]);
  function rejectionRun(bn, X, e, N, rng) {
    let t = 0, f = 0;
    for (let j = 0; j < N; j++) {
      const s = {};
      bn.nodes.forEach(n => { s[n.v] = rng() < pr(n, T, s); });
      if (consistent(s, e)) { if (s[X]) t++; else f++; }
    }
    const kept = t + f;
    return { est: kept ? t / kept : null, kept, t, f };
  }
  function lwRun(bn, X, e, N, rng) {
    let wt = 0, wf = 0;
    for (let j = 0; j < N; j++) {
      let w = 1;
      const ev = Object.assign({}, e);
      bn.nodes.forEach(n => {
        if (n.v in e) w *= pr(n, e[n.v], ev);
        else ev[n.v] = rng() < pr(n, T, ev);
      });
      if (ev[X]) wt += w; else wf += w;
    }
    return { est: wt + wf > 0 ? wt / (wt + wf) : null, wt, wf };
  }

  const evPy = e => {
    const ks = Object.keys(e);
    return ks.length ? `dict(${ks.map(k => `${k}=${tf(e[k])}`).join(', ')})` : '{}';
  };
  const evMath = e => Object.keys(e).map(k => lit(k, e[k])).join(', ');

  /** 1-based line number of the first line containing needle (throws if missing). */
  function ln(code, needle) {
    const i = code.findIndex(l => l.includes(needle));
    if (i < 0) throw new Error('BayesLabTrace: line not found: ' + needle);
    return i + 1;
  }

  // ---------------------------------------------------------------------------
  // SVG helpers
  // ---------------------------------------------------------------------------
  function clipToBox(x1, y1, x2, y2, hw, hh) {
    const dx = x2 - x1, dy = y2 - y1;
    const s = Math.min(dx ? hw / Math.abs(dx) : Infinity, dy ? hh / Math.abs(dy) : Infinity);
    return [x1 + dx * s, y1 + dy * s];
  }

  /**
   * DAG of a network.
   * o = { values:{v:bool}, evidence:{v:bool}, query, current, ghost:Set, added:Set }
   */
  function dagSVG(netKey, o) {
    o = o || {};
    const bn = NETS[netKey], P = POS[netKey];
    const hw = 54, hh = 17;
    const ghost = o.ghost || new Set();
    const edges = bn.nodes.flatMap(n => n.parents.map(p => {
      const [x1, y1] = P[p], [x2, y2] = P[n.v];
      const a = clipToBox(x1, y1, x2, y2, hw, hh), b = clipToBox(x2, y2, x1, y1, hw + 3, hh + 3);
      const g = ghost.has(n.v) || ghost.has(p);
      return `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" class="klt-edge ${g ? 'ghost' : ''}" marker-end="url(#klt-arrow)"/>`;
    })).join('');
    const nodes = bn.nodes.map(n => {
      const [x, y] = P[n.v];
      const cls = ['klt-node'];
      if (ghost.has(n.v)) cls.push('ghost');
      if (o.evidence && n.v in o.evidence) cls.push('evidence');
      if (o.query === n.v) cls.push('query');
      if (o.current === n.v) cls.push('current');
      let badge = '';
      const val = o.evidence && n.v in o.evidence ? o.evidence[n.v] : (o.values && n.v in o.values ? o.values[n.v] : undefined);
      if (val !== undefined) badge = `<g class="klt-badge ${val ? 't' : 'f'}"><circle cx="${x + hw - 4}" cy="${y - hh + 3}" r="9"/><text x="${x + hw - 4}" y="${y - hh + 6.5}">${tf(val)}</text></g>`;
      else if (o.query === n.v) badge = `<g class="klt-badge q"><circle cx="${x + hw - 4}" cy="${y - hh + 3}" r="9"/><text x="${x + hw - 4}" y="${y - hh + 6.5}">?</text></g>`;
      return `<g class="${cls.join(' ')}"><rect x="${x - hw}" y="${y - hh}" width="${hw * 2}" height="${hh * 2}" rx="12"/><text x="${x}" y="${y + 4}">${n.v}</text>${badge}</g>`;
    }).join('');
    return `<svg class="klt-dag" viewBox="0 0 360 ${netKey === 'burglary' ? 205 : 202}" role="img" aria-label="Bayesian network DAG">
      <defs><marker id="klt-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#94a3b8"/></marker></defs>
      ${edges}${nodes}</svg>`;
  }

  function cptTable(n, hlKey) {
    const keys = Object.keys(n.cpt);
    const head = n.parents.map(p => `<th>${ABBR[p]}</th>`).join('');
    const rows = keys.map(k => `<tr class="${k === hlKey ? 'hl' : ''}">${k.split('').filter(Boolean).map(c => `<td>${c}</td>`).join('')}<td><b>${fmt(n.cpt[k])}</b></td><td>${fmt(1 - n.cpt[k])}</td></tr>`).join('');
    return `<table class="klt-cpt"><thead><tr>${head}<th>P(${ABBR[n.v].toLowerCase()})</th><th>P(¬${ABBR[n.v].toLowerCase()})</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  const region = (label, body) => `<div class="klt-region"><div class="klt-region-label">${label}</div>${body}</div>`;
  const vars = rows => region('Variables', rows.map(([k, v, cls]) => `<div class="klt-var"><span>${k}</span><b class="${cls || ''}">${v}</b></div>`).join(''));
  const stackHTML = st => (st && st.length
    ? st.map((f, k) => `<div class="klt-frame ${k === st.length - 1 ? 'is-top' : ''}" style="margin-left:${Math.min(k, 6) * 7}px">${esc(f)}</div>`).join('')
    : '<p class="klt-empty">No active calls.</p>');
  function bar(label, v, cls, exact) {
    const w = v == null ? 0 : Math.max(0, Math.min(1, v)) * 100;
    const ex = exact == null ? '' : `<i class="klt-bar-exact" style="left:${exact * 100}%" title="exact"></i>`;
    return `<div class="klt-bar-row"><span class="klt-bar-label">${label}</span><span class="klt-bar-track"><span class="klt-bar-fill ${cls || ''}" style="width:${w}%"></span>${ex}</span><b class="klt-bar-val">${v == null ? '—' : fmt(v)}</b></div>`;
  }

  // ===========================================================================
  // PART 1–2 · Build the burglary network (BayesNode / BayesNet)
  // ===========================================================================
  const CODE_BUILD = [
    'class BayesNode:',
    '    def __init__(self, X, parents, cpt):',
    '        if isinstance(parents, str):',
    '            parents = parents.split()',
    '        if isinstance(cpt, (float, int)):          # no parents',
    '            cpt = {(): cpt}',
    '        elif isinstance(list(cpt.keys())[0], bool):  # one parent',
    '            cpt = {(v,): p for v, p in cpt.items()}',
    '        self.variable, self.parents = X, parents',
    '        self.cpt, self.children = cpt, []',
    '',
    'class BayesNet:',
    '    def __init__(self, node_specs=None):',
    '        self.nodes, self.variables = [], []',
    '        for node_spec in node_specs or []:',
    '            self.add(node_spec)',
    '',
    '    def add(self, node_spec):',
    '        node = BayesNode(*node_spec)',
    '        assert all(p in self.variables for p in node.parents)',
    '        self.nodes.append(node)',
    '        self.variables.append(node.variable)',
    '        for parent in node.parents:',
    '            self.variable_node(parent).children.append(node)',
    '',
    'T, F = True, False',
    'burglary = BayesNet([',
    "    ('Burglary',   '', 0.001),",
    "    ('Earthquake', '', 0.002),",
    "    ('Alarm', 'Burglary Earthquake',",
    '        {(T, T): 0.95, (T, F): 0.94, (F, T): 0.29, (F, F): 0.001}),',
    "    ('JohnCalls', 'Alarm', {T: 0.90, F: 0.05}),",
    "    ('MaryCalls', 'Alarm', {T: 0.70, F: 0.01})])",
    '',
    "burglary.variable_node('Alarm').p(T, dict(Burglary=T, Earthquake=F))"
  ];

  function traceBuild() {
    const code = CODE_BUILD, L = s => ln(code, s), bn = NETS.burglary;
    const steps = [];
    const specLines = {
      Burglary: [L("('Burglary',")], Earthquake: [L("('Earthquake',")],
      Alarm: [L("('Alarm', 'Burglary"), L('{(T, T): 0.95')], JohnCalls: [L("('JohnCalls',")], MaryCalls: [L("('MaryCalls',")]
    };
    const added = [];
    const children = {};
    const snap = o => steps.push(Object.assign({ added: added.slice(), children: JSON.parse(JSON.stringify(children)) }, o));
    snap({
      kind: 'start', lines: [L('burglary = BayesNet(['), L('def __init__(self, node_specs'), L('self.nodes, self.variables = []')],
      title: 'BayesNet([...]) — start with an empty network',
      explain: 'The constructor receives the five node specs <code>(X, parents, cpt)</code> of Pearl\'s burglar alarm network (AIMA Fig. 14.2) and starts with empty <code>nodes</code> and <code>variables</code> lists. Specs must be listed <b>parents before children</b> — a topological order of the DAG.'
    });
    bn.nodes.forEach(n => {
      const nP = n.parents.length;
      const normLines = nP === 0 ? [L('if isinstance(cpt, (float, int))'), L('cpt = {(): cpt}')]
        : nP === 1 ? [L('elif isinstance(list(cpt.keys())'), L('cpt = {(v,): p for v')] : [];
      const parentsTxt = nP ? `'${n.parents.join(' ')}'` : "''";
      const normTxt = nP === 0
        ? `the CPT is a single number, so it is stored as <code>{(): ${n.cpt['']}}</code> — one row with no parent values`
        : nP === 1
          ? `the CPT has one parent, so <code>{T: ${n.cpt.T}, F: ${n.cpt.F}}</code> is rewritten with 1-tuple keys <code>{(T,): ${n.cpt.T}, (F,): ${n.cpt.F}}</code>`
          : 'the CPT already uses tuple keys <code>(b, e)</code> — one row per combination of parent values, 2² = 4 rows';
      snap({
        kind: 'node', cur: n.v, lines: [L('for node_spec in node_specs'), L('self.add(node_spec)'), L('node = BayesNode(*node_spec)'), L('if isinstance(parents, str)'), L('parents = parents.split()'), ...normLines, L('self.variable, self.parents = X'), L('self.cpt, self.children = cpt, []'), ...specLines[n.v]],
        title: `BayesNode('${n.v}', ${parentsTxt}, …)`,
        explain: `The parents string ${parentsTxt} is split into <code>[${n.parents.map(p => `'${p}'`).join(', ')}]</code>; ${normTxt}. Only <code>P(X = true | parents)</code> is stored — <code>P(X = false | …)</code> is <code>1 − p</code>.`
      });
      added.push(n.v);
      n.parents.forEach(p => { (children[p] = children[p] || []).push(n.v); });
      snap({
        kind: 'add', cur: n.v, lines: [L('assert all(p in self.variables'), L('self.nodes.append(node)'), L('self.variables.append(node.variable)'), ...(nP ? [L('for parent in node.parents:'), L('.children.append(node)')] : [])],
        title: `add(): '${n.v}' joins the network`,
        explain: nP
          ? `The assert checks that ${n.parents.map(p => `<code>${p}</code>`).join(' and ')} ${nP > 1 ? 'are' : 'is'} already in the net, then <code>${n.v}</code> is appended and registered as a child of ${n.parents.map(p => `<code>${p}</code>`).join(' and ')} — that link is a directed edge of the DAG.`
          : `<code>${n.v}</code> has no parents, so it is a root of the DAG. It is appended to <code>nodes</code> and <code>variables</code>.`
      });
    });
    snap({
      kind: 'done', cur: 'Alarm', cptHl: 'TF', lines: [L("burglary.variable_node('Alarm')")],
      title: 'Query one CPT entry: P(a | b, ¬e) = 0.94',
      explain: 'The network now holds 5 CPTs with 1 + 1 + 4 + 2 + 2 = <b>10</b> independent numbers, instead of the 2⁵ − 1 = <b>31</b> needed for the full joint table. <code>node.p(value, event)</code> looks up the row matching the parents\' values in <code>event</code> — here <code>(T, F)</code> → 0.94.'
    });
    return {
      code, file: 'aima/probability.py · BayesNode, BayesNet', stateTitle: 'Network under construction',
      steps,
      state: s => {
        const n = s.cur ? NETS.burglary.node(s.cur) : null;
        const ghost = new Set(NETS.burglary.vars.filter(v => !s.added.includes(v) && v !== s.cur));
        return `<div class="klt-state">
          <div>${dagSVG('burglary', { ghost, current: s.cur })}</div>
          <div class="klt-regions">
            ${n ? region(`CPT · P(${n.v} | ${n.parents.join(', ') || '—'})`, cptTable(n, s.cptHl)) : region('CPT', '<p class="klt-empty">No node yet.</p>')}
            ${vars([['variables', s.added.length ? '[' + s.added.map(v => ABBR[v]).join(', ') + ']' : '[]'], ['len(nodes)', s.added.length], ['children', Object.keys(s.children).length ? Object.entries(s.children).map(([p, c]) => `${ABBR[p]}→${c.map(x => ABBR[x]).join(',')}`).join('  ') : '—']])}
          </div></div>`;
      },
      tags: { start: ['Ready', ''], node: ['BayesNode', 'info'], add: ['add()', 'ok'], done: ['Built', 'ok'] }
    };
  }

  // ===========================================================================
  // PART 3 · Full joint probability by the chain rule
  // ===========================================================================
  const JOINT_VARIANTS = {
    a: { label: 'P(j, m, a, ¬b, ¬e)', ev: { Burglary: F, Earthquake: F, Alarm: T, JohnCalls: T, MaryCalls: T } },
    b: { label: 'P(j, m, a, b, ¬e)', ev: { Burglary: T, Earthquake: F, Alarm: T, JohnCalls: T, MaryCalls: T } },
    c: { label: 'P(¬j, ¬m, ¬a, ¬b, ¬e)', ev: { Burglary: F, Earthquake: F, Alarm: F, JohnCalls: F, MaryCalls: F } }
  };
  function traceJoint(vk) {
    const V = JOINT_VARIANTS[vk], ev = V.ev, bn = NETS.burglary;
    const code = [
      'def joint_probability(event, bn):',
      '    """Chain rule (AIMA Eq. 14.2): P(x1..xn) = Π P(xi | parents(Xi))"""',
      '    p = 1.0',
      '    for node in bn.nodes:',
      '        factor = node.p(event[node.variable], event)',
      '        p *= factor',
      '    return p',
      '',
      `event = dict(Burglary=${tf(ev.Burglary)}, Earthquake=${tf(ev.Earthquake)}, Alarm=${tf(ev.Alarm)},`,
      `             JohnCalls=${tf(ev.JohnCalls)}, MaryCalls=${tf(ev.MaryCalls)})`,
      'p = joint_probability(event, burglary)',
      "print(f'{p:.6f}')"
    ];
    const L = s => ln(code, s);
    const steps = [];
    const rows = [];
    let p = 1;
    steps.push({ kind: 'start', rows: [], p: null, lines: [L('event = dict('), L('JohnCalls='), L('p = joint_probability(event')], title: `Query the full joint ${V.label}`, explain: 'A full joint entry assigns a value to <b>every</b> variable. Instead of looking it up in a 2⁵-row table, the network computes it as a product of one CPT entry per node.' });
    steps.push({ kind: 'init', rows: [], p: 1, lines: [L('p = 1.0')], title: 'p = 1.0', explain: 'Start the running product at 1.0 — the empty product.' });
    bn.nodes.forEach(n => {
      const f = pr(n, ev[n.v], ev);
      p *= f;
      rows.push({ v: n.v, c: condTxt(n, ev[n.v], ev), f, p });
      const fromTrue = ev[n.v] ? '' : ` = 1 − ${fmt(n.cpt[cptKey(n, ev)])}`;
      steps.push({
        kind: 'factor', cur: n.v, rows: rows.slice(), p, lines: [L('for node in bn.nodes:'), L('factor = node.p('), L('p *= factor')],
        title: `${n.v}: factor = ${condTxt(n, ev[n.v], ev)} = ${fmt(f)}`,
        explain: `${n.parents.length ? `Its parents ${n.parents.map(q => `<code>${q}=${tf(ev[q])}</code>`).join(', ')} select CPT row <code>(${cptKey(n, ev).split('').join(', ')})</code>` : 'A root node — its CPT has one row'}: ${condTxt(n, ev[n.v], ev)}${fromTrue} = <b>${fmt(f)}</b>. Running product p = ${fmt(p)}.`
      });
    });
    steps.push({ kind: 'done', rows: rows.slice(), p, lines: [L('return p'), L("print(f'{p:.6f}')")], title: `${V.label} = ${fmt(p)}`, explain: `${rows.map(r => fmt(r.f)).join(' × ')} = <b>${p.toFixed(6)}</b>. Each factor only needs the node's own value and its parents' values — that is the conditional-independence assumption the DAG encodes.` });
    return {
      code, file: 'Lab solution · uses BayesNode.p from aima/probability.py', stateTitle: 'Chain-rule product',
      steps,
      state: s => `<div class="klt-state">
          <div>${dagSVG('burglary', { values: ev, current: s.cur })}</div>
          <div class="klt-regions">
            ${region('Factors so far', s.rows.length ? `<table class="klt-cpt klt-joint"><thead><tr><th>Node</th><th>CPT entry</th><th>factor</th><th>p</th></tr></thead><tbody>${s.rows.map(r => `<tr class="${r.v === s.cur ? 'hl' : ''}"><td>${ABBR[r.v]}</td><td>${r.c}</td><td>${fmt(r.f)}</td><td><b>${fmt(r.p)}</b></td></tr>`).join('')}</tbody></table>` : '<p class="klt-empty">No factors yet.</p>')}
            ${vars([['event', '{' + Object.keys(ev).map(k => `${ABBR[k]}=${tf(ev[k])}`).join(', ') + '}'], ['p', s.p == null ? '—' : fmt(s.p)]])}
          </div></div>`,
      tags: { start: ['Ready', ''], init: ['Init', ''], factor: ['p *= factor', 'info'], done: ['Return', 'ok'] }
    };
  }

  // ===========================================================================
  // PART 4 · Exact inference by enumeration (enumeration_ask, AIMA Fig. 14.9)
  // ===========================================================================
  const ENUM_VARIANTS = {
    bjm: { label: 'P(Burglary | j, m)', X: 'Burglary', e: { JohnCalls: T, MaryCalls: T } },
    jb: { label: 'P(JohnCalls | b)', X: 'JohnCalls', e: { Burglary: T } }
  };
  function traceEnum(vk) {
    const V = ENUM_VARIANTS[vk], bn = NETS.burglary, X = V.X, e = V.e;
    const code = [
      'def enumeration_ask(X, e, bn):',
      '    """[Figure 14.9] P(X | e) by summing out the hidden variables"""',
      '    Q = ProbDist(X)',
      '    for xi in bn.variable_values(X):',
      '        Q[xi] = enumerate_all(bn.variables, extend(e, X, xi), bn)',
      '    return Q.normalize()',
      '',
      'def enumerate_all(variables, e, bn):',
      '    if not variables:',
      '        return 1.0',
      '    Y, rest = variables[0], variables[1:]',
      '    Ynode = bn.variable_node(Y)',
      '    if Y in e:',
      '        return Ynode.p(e[Y], e) * enumerate_all(rest, e, bn)',
      '    else:',
      '        return sum(Ynode.p(y, e) * enumerate_all(rest, extend(e, Y, y), bn)',
      '                   for y in bn.variable_values(Y))',
      '',
      `result = enumeration_ask('${X}', ${evPy(e)}, burglary)`,
      'print(result.show_approx())'
    ];
    const L = s => ln(code, s);
    const steps = [], Q = {}, trees = { T: [], F: [] };
    const stack = [];
    const push = o => { steps.push(Object.assign({ stack: stack.slice(), Q: Object.assign({}, Q) }, o)); };
    const frameTxt = (vs, ev) => `enumerate_all([${vs.map(a => ABBR[a]).join(', ')}], {${Object.keys(ev).map(k => ABBR[k] + '=' + tf(ev[k])).join(', ')}})`;

    function enumAll(vs, ev, xi, parentKey, prod) {
      if (!vs.length) return 1;
      const [Y, ...rest] = vs, n = bn.node(Y), xk = tf(xi);
      const base = rest.length ? [] : [L('if not variables:'), L('return 1.0')];
      const baseTxt = rest.length ? '' : ' <code>rest</code> is empty, so <code>enumerate_all([])</code> returns 1.0 and this path is complete.';
      stack.push(frameTxt(vs, ev));
      if (Y in ev) {
        const f = pr(n, ev[Y], ev);
        const key = (parentKey ? parentKey + '/' : '') + lit(Y, ev[Y]);
        const node = { key, parent: parentKey, Y, val: ev[Y], f, prod: prod * f, leaf: !rest.length, createdAt: steps.length };
        trees[xk].push(node);
        push({
          kind: 'evidence', xi, cur: key, lines: [L('Y, rest = variables[0]'), L('Ynode = bn.variable_node(Y)'), L('if Y in e:'), L('return Ynode.p(e[Y], e) *'), ...base],
          title: `${Y} is in e → multiply by ${condTxt(n, ev[Y], ev)} = ${fmt(f)}`,
          explain: `<code>${Y}</code> already has a value (${lit(Y, ev[Y])}) — it is ${Y === X ? 'the query variable fixed by <code>extend(e, X, xi)</code>' : 'evidence'} — so there is nothing to sum: take its CPT entry ${condTxt(n, ev[Y], ev)} = <b>${fmt(f)}</b>. Path product = ${fmt(prod * f)}.${baseTxt}`
        });
        const r = f * enumAll(rest, ev, xi, key, prod * f);
        node.value = r; node.valueAt = steps.length;
        stack.pop();
        return r;
      }
      push({
        kind: 'hidden', xi, cur: parentKey, lines: [L('Y, rest = variables[0]'), L('if Y in e:'), L('else:'), L('return sum(Ynode.p(y, e)'), L('for y in bn.variable_values(Y))')],
        title: `${Y} is hidden → sum over ${Y} ∈ {T, F}`,
        explain: `<code>${Y}</code> is neither query nor evidence, so it must be <b>summed out</b>: the recursion branches once for <code>${Y}=T</code> and once for <code>${Y}=F</code> and adds the two results.`
      });
      const terms = [];
      [T, F].forEach(y => {
        const ev2 = Object.assign({}, ev, { [Y]: y });
        const f = pr(n, y, ev2);
        const key = (parentKey ? parentKey + '/' : '') + lit(Y, y);
        const node = { key, parent: parentKey, Y, val: y, f, prod: prod * f, leaf: !rest.length, createdAt: steps.length };
        trees[xk].push(node);
        push({
          kind: 'branch', xi, cur: key, lines: [L('return sum(Ynode.p(y, e)'), L('for y in bn.variable_values(Y))'), ...base],
          title: `Branch ${Y} = ${tf(y)}: ${condTxt(n, y, ev2)} = ${fmt(f)}`,
          explain: `<code>extend(e, ${Y}, ${tf(y)})</code> adds ${lit(Y, y)} to the event and the recursion continues with <code>rest</code>. Factor ${condTxt(n, y, ev2)} = <b>${fmt(f)}</b>; path product = ${fmt(prod * f)}.${baseTxt}`
        });
        const sub = enumAll(rest, ev2, xi, key, prod * f);
        node.value = f * sub; node.valueAt = steps.length;
        terms.push(f * sub);
      });
      const total = terms[0] + terms[1];
      push({
        kind: 'sum', xi, cur: parentKey, lines: [L('return sum(Ynode.p(y, e)'), L('for y in bn.variable_values(Y))')],
        title: `Σ over ${Y}: ${fmt(terms[0])} + ${fmt(terms[1])} = ${fmt(total)}`,
        explain: `Both branches of <code>${Y}</code> have returned, so <code>sum(...)</code> adds them: ${fmt(terms[0])} + ${fmt(terms[1])} = <b>${fmt(total)}</b>. This value is returned to the caller one level up.`
      });
      stack.pop();
      return total;
    }

    push({ kind: 'start', lines: [L(`result = enumeration_ask('${X}'`), L('def enumeration_ask(X, e, bn):'), L('Q = ProbDist(X)')], title: `enumeration_ask('${X}', ${evPy(e)})`, explain: `Goal: <b>${V.label}</b> = α · Σ<sub>hidden</sub> P(${ABBR[X].toLowerCase()}, ${evMath(e)}, hidden). Hidden variables: ${bn.vars.filter(v => v !== X && !(v in e)).map(v => `<code>${v}</code>`).join(', ')}. The table <code>Q</code> will hold one unnormalised number per value of <code>${X}</code>.` });
    [T, F].forEach(xi => {
      const ev = Object.assign({}, e, { [X]: xi });
      push({ kind: 'xi', xi, lines: [L('for xi in bn.variable_values(X):'), L('Q[xi] = enumerate_all(bn.variables')], title: `xi = ${xi ? 'True' : 'False'}: enumerate_all over [${bn.vars.map(v => ABBR[v]).join(', ')}]`, explain: `<code>extend(e, ${X}, ${tf(xi)})</code> fixes the query variable to ${lit(X, xi)}. <code>enumerate_all</code> now walks the variables in topological order — this builds the evaluation tree of AIMA Fig. 14.8 depth-first.` });
      Q[tf(xi)] = enumAll(bn.vars, ev, xi, null, 1);
      push({ kind: 'q', xi, lines: [L('Q[xi] = enumerate_all(bn.variables')], title: `Q[${xi ? 'True' : 'False'}] = ${fmt(Q[tf(xi)])}`, explain: `The whole tree for ${lit(X, xi)} sums to P(${lit(X, xi)}, ${evMath(e)}) = <b>${fmt(Q[tf(xi)])}</b> — the sum of the products along every root-to-leaf path.` });
    });
    const z = Q.T + Q.F;
    push({ kind: 'done', lines: [L('return Q.normalize()'), L('print(result.show_approx())')], norm: { T: Q.T / z, F: Q.F / z }, title: `Normalise: ${V.label} = ${fmt(Q.T / z)}`, explain: `α = 1 / (${fmt(Q.T)} + ${fmt(Q.F)}) = ${fmt(1 / z)}. So <b>${V.label} = ${fmt(Q.T / z)}</b> and P(${lit(X, F)} | ${evMath(e)}) = ${fmt(Q.F / z)}${vk === 'bjm' ? ' — the 28.4 % of AIMA §14.4.1: even when both neighbours call, a burglary is still less likely than not, because the prior P(b) = 0.001 is tiny.' : '.'}` });

    // Tree layout per xi (leaves left → right, parents centred over children)
    const layout = {};
    ['T', 'F'].forEach(xk => {
      const nodes = trees[xk];
      const kids = {};
      nodes.forEach(n => { (kids[n.parent || ''] = kids[n.parent || ''] || []).push(n); });
      let leaf = 0;
      const depthOf = n => (n.parent ? depthOf(nodes.find(m => m.key === n.parent)) + 1 : 0);
      const place = n => {
        const ch = kids[n.key] || [];
        if (!ch.length) n.x = leaf++;
        else { ch.forEach(place); n.x = (ch[0].x + ch[ch.length - 1].x) / 2; }
        n.d = depthOf(n);
      };
      (kids[''] || []).forEach(place);
      layout[xk] = { nodes, leaves: leaf };
    });

    function treeSVG(s, i) {
      const xk = s.xi === undefined ? null : tf(s.xi);
      if (!xk) return '<p class="klt-empty">The evaluation tree appears when enumerate_all starts.</p>';
      const { nodes, leaves } = layout[xk];
      const dx = 64, dy = 44, w = 56, h = 30, pad = 8;
      const W = Math.max(leaves * dx, 240), H = bn.vars.length * dy + 4;
      const off = (W - leaves * dx) / 2;
      const X0 = n => off + n.x * dx + dx / 2, Y0 = n => pad + n.d * dy;
      const vis = nodes.filter(n => n.createdAt <= i);
      const curPath = new Set();
      if (s.cur) { let k = s.cur; while (k) { curPath.add(k); const n = nodes.find(m => m.key === k); k = n ? n.parent : null; } }
      const edges = vis.filter(n => n.parent).map(n => {
        const p = nodes.find(m => m.key === n.parent);
        return `<line x1="${X0(p)}" y1="${Y0(p) + h}" x2="${X0(n)}" y2="${Y0(n)}" class="klt-tree-edge ${curPath.has(n.key) ? 'on' : ''}"/>`;
      }).join('');
      const rects = vis.map(n => {
        const done = n.valueAt != null && n.valueAt <= i;
        const cls = ['klt-tree-node', n.key === s.cur ? 'cur' : curPath.has(n.key) ? 'path' : '', done ? 'done' : '', n.Y === X ? 'query' : n.Y in e ? 'evi' : 'hid'].join(' ');
        return `<g class="${cls}"><title>${condTxt(bn.node(n.Y), n.val, Object.assign({}, e, { [X]: s.xi }, Object.fromEntries(n.key.split('/').map(t => { const neg = t[0] === '¬'; const a = neg ? t.slice(1) : t; const v = Object.keys(ABBR).find(k => ABBR[k].toLowerCase() === a); return [v, !neg]; }))))} = ${fmt(n.f)}${done ? ' · subtree = ' + fmt(n.value) : ''}</title><rect x="${X0(n) - w / 2}" y="${Y0(n)}" width="${w}" height="${h}" rx="7"/><text x="${X0(n)}" y="${Y0(n) + 12}" class="lit">${n.key.split('/').pop()}</text><text x="${X0(n)}" y="${Y0(n) + 24}" class="val">${fmt(n.f)}</text></g>`;
      }).join('');
      const lvl = bn.vars.map((v, d) => `<text x="2" y="${pad + d * dy + 19}" class="klt-tree-lvl">${ABBR[v]}</text>`).join('');
      return `<svg class="klt-tree" viewBox="0 0 ${W + 16} ${H}" style="max-width:${Math.min(W + 16, 560)}px">${lvl}<g transform="translate(14,0)">${edges}${rects}</g></svg>`;
    }

    return {
      code, file: 'aima/probability.py · enumeration_ask, enumerate_all', stateTitle: `Evaluation tree · ${V.label}`,
      steps,
      state: (s, all, i) => {
        const xk = s.xi === undefined ? null : tf(s.xi);
        const leavesDone = xk ? layout[xk].nodes.filter(n => n.leaf && n.createdAt <= i) : [];
        const partial = leavesDone.reduce((a, n) => a + n.prod, 0);
        const paths = leavesDone.length
          ? leavesDone.map(n => `<div class="klt-var"><span>${n.key.split('/').join(' · ')}</span><b>${fmt(n.prod)}</b></div>`).join('')
          : '<p class="klt-empty">No complete path yet.</p>';
        return `<div class="klt-state klt-state-stack">
          <div class="klt-tree-wrap">${treeSVG(s, i)}</div>
          <div class="klt-state-2">
            <div class="klt-regions">${region('Call stack (recursion)', stackHTML(s.stack))}</div>
            <div class="klt-regions">${vars([
              ['xi', xk ? (s.xi ? 'True' : 'False') : '—'],
              ['Q[True]', s.Q.T == null ? '—' : fmt(s.Q.T)],
              ['Q[False]', s.Q.F == null ? '—' : fmt(s.Q.F)],
              ['result', s.norm ? `{T: ${fmt(s.norm.T)}, F: ${fmt(s.norm.F)}}` : '—', s.norm ? 'ok' : '']
            ])}${region(xk ? `Completed paths (xi = ${s.xi ? 'T' : 'F'}) · Σ = ${fmt(partial)}` : 'Completed paths', paths)}</div>
          </div></div>`;
      },
      tags: { start: ['Ready', ''], xi: ['for xi', 'info'], evidence: ['Y in e', 'info'], hidden: ['Hidden', 'warn'], branch: ['Branch', 'warn'], sum: ['sum()', 'ok'], q: ['Q[xi]', 'ok'], done: ['Normalize', 'ok'] },
      interval: 750
    };
  }

  // ===========================================================================
  // PART 5 · Explaining away
  // ===========================================================================
  const EXPLAIN_VARIANTS = {
    sprinkler: { label: 'Sprinkler / Wet Grass network', net: 'sprinkler', cause1: 'Rain', cause2: 'Sprinkler', effect: 'WetGrass' },
    alarm: { label: 'Burglary / Alarm network', net: 'burglary', cause1: 'Burglary', cause2: 'Earthquake', effect: 'Alarm' }
  };
  function traceExplain(vk) {
    const V = EXPLAIN_VARIANTS[vk], bn = NETS[V.net], nm = V.net;
    const c1 = V.cause1, c2 = V.cause2, ef = V.effect;
    const head = vk === 'sprinkler'
      ? ['sprinkler = BayesNet([',
        "    ('Cloudy',    '',               0.5),",
        "    ('Sprinkler', 'Cloudy',         {T: 0.10, F: 0.50}),",
        "    ('Rain',      'Cloudy',         {T: 0.80, F: 0.20}),",
        "    ('WetGrass',  'Sprinkler Rain',",
        '        {(T, T): 0.99, (T, F): 0.90, (F, T): 0.90, (F, F): 0.00})])']
      : ['# burglary network built in Part 1–2 (AIMA Fig. 14.2)'];
    const code = head.concat([
      '',
      `# ${c1}: prior → after seeing ${ef} → after also seeing ${c2}`,
      `p0 = enumeration_ask('${c1}', {}, ${nm})[T]`,
      `p1 = enumeration_ask('${c1}', dict(${ef}=T), ${nm})[T]`,
      `p2 = enumeration_ask('${c1}', dict(${ef}=T, ${c2}=T), ${nm})[T]`,
      '',
      `# the same effect seen from the other cause`,
      `q1 = enumeration_ask('${c2}', dict(${ef}=T), ${nm})[T]`,
      `q2 = enumeration_ask('${c2}', dict(${ef}=T, ${c1}=T), ${nm})[T]`,
      '',
      "print(f'p0={p0:.4f}  p1={p1:.4f}  p2={p2:.4f}')",
      "print(f'q1={q1:.4f}  q2={q2:.4f}')",
      'assert p2 < p1 and q2 < q1        # explaining away'
    ]);
    const L = s => ln(code, s);
    const r = (X, e) => enumAsk(bn, X, e).T;
    const vals = {
      p0: r(c1, {}), p1: r(c1, { [ef]: T }), p2: r(c1, { [ef]: T, [c2]: T }),
      q0: r(c2, {}), q1: r(c2, { [ef]: T }), q2: r(c2, { [ef]: T, [c1]: T })
    };
    const a1 = ABBR[c1].toLowerCase(), a2 = ABBR[c2].toLowerCase(), ae = ABBR[ef].toLowerCase();
    const steps = [];
    const known = [];
    const add = (o, k) => { if (k) known.push(k); steps.push(Object.assign({ known: known.slice() }, o)); };
    add({
      kind: 'start', ev: {}, lines: head.map((_, k) => k + 1),
      title: vk === 'sprinkler' ? 'The sprinkler network (AIMA Fig. 14.12a)' : 'The burglary network again',
      explain: `<code>${c1}</code> and <code>${c2}</code> are two possible causes of the common effect <code>${ef}</code> — a <b>v-structure</b> ${c1} → ${ef} ← ${c2}. ${vk === 'sprinkler' ? 'Here they also share the parent Cloudy.' : 'Burglary and Earthquake are independent roots.'} Watch what happens to one cause when the effect and then the other cause are observed.`
    });
    add({ kind: 'query', q: c1, ev: {}, lines: [L('p0 = enumeration_ask(')], title: `p0 = P(${a1}) = ${fmt(vals.p0)}`, explain: `With no evidence, enumeration just returns the marginal of <code>${c1}</code>: <b>${fmt(vals.p0)}</b>.` }, 'p0');
    add({ kind: 'query', q: c1, ev: { [ef]: T }, lines: [L('p1 = enumeration_ask(')], title: `p1 = P(${a1} | ${ae}) = ${fmt(vals.p1)}  ↑`, explain: `Observing the effect <code>${ef}=T</code> raises belief in the cause: ${fmt(vals.p0)} → <b>${fmt(vals.p1)}</b> (diagnostic reasoning, effect → cause).` }, 'p1');
    add({ kind: 'explain', q: c1, ev: { [ef]: T, [c2]: T }, lines: [L('p2 = enumeration_ask(')], title: `p2 = P(${a1} | ${ae}, ${a2}) = ${fmt(vals.p2)}  ↓`, explain: `Now we also learn <code>${c2}=T</code>. ${c2} already accounts for ${ef}, so ${c1} is no longer needed to explain it: ${fmt(vals.p1)} → <b>${fmt(vals.p2)}</b>. This drop is <b>explaining away</b> (intercausal reasoning).` }, 'p2');
    add({ kind: 'query', q: c2, ev: { [ef]: T }, lines: [L('q1 = enumeration_ask(')], title: `q1 = P(${a2} | ${ae}) = ${fmt(vals.q1)}`, explain: `The other direction: ${vk === 'sprinkler' ? 'wet grass' : 'the alarm'} makes <code>${c2}</code> more likely too — P(${a2}) = ${fmt(vals.q0)} → <b>${fmt(vals.q1)}</b>.` }, 'q1');
    add({ kind: 'explain', q: c2, ev: { [ef]: T, [c1]: T }, lines: [L('q2 = enumeration_ask(')], title: `q2 = P(${a2} | ${ae}, ${a1}) = ${fmt(vals.q2)}  ↓`, explain: `…and confirming <code>${c1}</code> explains ${c2} away: ${fmt(vals.q1)} → <b>${fmt(vals.q2)}</b>.` }, 'q2');
    add({
      kind: 'done', q: null, ev: { [ef]: T }, lines: [L("print(f'p0="), L("print(f'q1="), L('assert p2 < p1')],
      title: 'assert passes: p2 < p1 and q2 < q1',
      explain: `Two causes of a common effect are ${vk === 'sprinkler' ? 'linked only through their common parent Cloudy' : 'independent'} a priori, but become <b>dependent once the effect is observed</b> (the v-structure is "unblocked" by evidence on ${ef}). Learning one cause then lowers the probability of the other. Enumeration gets this for free — no special rule is coded.`
    });
    const rows = [
      ['p0', `P(${a1})`, 'base'], ['p1', `P(${a1} | ${ae})`, 'up'], ['p2', `P(${a1} | ${ae}, ${a2})`, 'down'],
      ['q1', `P(${a2} | ${ae})`, 'up'], ['q2', `P(${a2} | ${ae}, ${a1})`, 'down']
    ];
    return {
      code, file: 'Lab solution · uses enumeration_ask from aima/probability.py', stateTitle: 'Beliefs as evidence arrives',
      steps,
      state: s => `<div class="klt-state">
          <div>${dagSVG(nm, { evidence: s.ev, query: s.q })}</div>
          <div class="klt-regions">
            ${region('Posterior P(cause = true)', rows.map(([k, l, c]) => s.known.includes(k) ? bar(l, vals[k], c) : `<div class="klt-bar-row pending"><span class="klt-bar-label">${l}</span><span class="klt-bar-track"></span><b class="klt-bar-val">…</b></div>`).join(''))}
            ${vars([['evidence', Object.keys(s.ev).length ? evMath(s.ev) : '{}'], ['query', s.q || '—']])}
          </div></div>`,
      tags: { start: ['Ready', ''], query: ['Query', 'info'], explain: ['Explained away', 'warn'], done: ['Assert ✓', 'ok'] },
      interval: 1400
    };
  }

  // ===========================================================================
  // PART 6a · Rejection sampling (AIMA Fig. 14.13 / 14.14)
  // ===========================================================================
  const SAMPLE_VARIANTS = {
    rej: {
      sp: { label: 'P(Rain | s) · sprinkler', net: 'sprinkler', X: 'Rain', e: { Sprinkler: T } },
      bu: { label: 'P(Burglary | j, m) · burglary', net: 'burglary', X: 'Burglary', e: { JohnCalls: T, MaryCalls: T } }
    },
    lw: {
      sp: { label: 'P(Rain | s, w) · sprinkler', net: 'sprinkler', X: 'Rain', e: { Sprinkler: T, WetGrass: T } },
      bu: { label: 'P(Burglary | j, m) · burglary', net: 'burglary', X: 'Burglary', e: { JohnCalls: T, MaryCalls: T } }
    }
  };
  const N_TRACE = 20, N_DETAIL = 3, SEED = 7, N_BIG = 10000;

  function traceRejection(vk) {
    const V = SAMPLE_VARIANTS.rej[vk], bn = NETS[V.net], X = V.X, e = V.e;
    const code = [
      'def prior_sample(bn):',
      '    """[Figure 14.13] sample every node in topological order"""',
      '    event = {}',
      '    for node in bn.nodes:',
      '        event[node.variable] = node.sample(event)',
      '    return event',
      '',
      'def rejection_sampling(X, e, bn, N=10000):',
      '    """[Figure 14.14]"""',
      '    counts = {x: 0 for x in bn.variable_values(X)}',
      '    for j in range(N):',
      '        sample = prior_sample(bn)',
      '        if consistent_with(sample, e):',
      '            counts[sample[X]] += 1',
      '    return ProbDist(X, counts)',
      '',
      'def consistent_with(event, evidence):',
      '    return all(evidence.get(k, v) == v for k, v in event.items())',
      '',
      `random.seed(${SEED})`,
      `rejection_sampling('${X}', ${evPy(e)}, ${V.net}, N=${N_TRACE})`
    ];
    const L = s => ln(code, s);
    const rng = mulberry32(SEED * 1000 + (vk === 'sp' ? 1 : 2));
    const exact = enumAsk(bn, X, e).T;
    const steps = [], samples = [];
    const counts = { T: 0, F: 0 };
    const snap = o => steps.push(Object.assign({ counts: Object.assign({}, counts), samples: samples.slice(-7), n: samples.length }, o));
    snap({ kind: 'start', lines: [L(`rejection_sampling('${X}'`), L('def rejection_sampling('), L('counts = {x: 0 for x')], title: `rejection_sampling('${X}', ${evPy(e)}, N=${N_TRACE})`, explain: `Estimate <b>${V.label.split(' · ')[0]}</b> by drawing samples from the <b>prior</b> and throwing away every sample that disagrees with the evidence ${evMath(e)}. Exact answer (enumeration): ${fmt(exact)}. The first ${N_DETAIL} samples are traced node by node; the rest one sample per step.` });
    for (let j = 0; j < N_TRACE; j++) {
      const ev = {};
      const detail = j < N_DETAIL;
      if (detail) snap({ kind: 'sample', j, ev: {}, lines: [L('for j in range(N):'), L('sample = prior_sample(bn)'), L('event = {}')], title: `Sample #${j + 1}: prior_sample starts with event = {}`, explain: 'Each sample is one complete world, generated top-down: a node is sampled only after its parents, using the CPT row selected by the parents\' sampled values.' });
      bn.nodes.forEach(n => {
        const u = rng(), pt = pr(n, T, ev);
        ev[n.v] = u < pt;
        if (detail) {
          const clash = n.v in e && e[n.v] !== ev[n.v];
          snap({ kind: 'draw', j, ev: Object.assign({}, ev), cur: n.v, lines: [L('for node in bn.nodes:'), L('event[node.variable] = node.sample(event)')], title: `${n.v}: u = ${u.toFixed(3)} ${ev[n.v] ? '<' : '≥'} ${condTxt(n, T, ev)} = ${fmt(pt)} → ${ev[n.v] ? 'True' : 'False'}`, explain: `<code>node.sample(event)</code> draws u ~ U(0, 1) and returns True when u &lt; P(${ABBR[n.v].toLowerCase()} | parents). ${clash ? `<b>This disagrees with the evidence ${lit(n.v, e[n.v])}</b> — the sample is already doomed, but prior_sample does not know about e and keeps going.` : ''}` });
        }
      });
      const ok = consistent(ev, e);
      if (ok) counts[tf(ev[X])]++;
      samples.push({ j, ev, ok });
      const kept = counts.T + counts.F;
      snap({
        kind: ok ? 'keep' : 'reject', j, ev, lines: detail
          ? [L('return event'), L('if consistent_with(sample, e):'), L('return all(evidence.get'), ...(ok ? [L('counts[sample[X]] += 1')] : [])]
          : [L('sample = prior_sample(bn)'), L('if consistent_with(sample, e):'), ...(ok ? [L('counts[sample[X]] += 1')] : [])],
        title: `Sample #${j + 1} ${ok ? `kept → counts[${ev[X] ? 'True' : 'False'}] += 1` : 'rejected'}`,
        explain: ok
          ? `[${bn.vars.map(v => lit(v, ev[v])).join(', ')}] matches ${evMath(e)}, so it counts as a vote for ${lit(X, ev[X])}. Kept so far: ${kept} / ${j + 1}.`
          : `[${bn.vars.map(v => lit(v, ev[v])).join(', ')}] contradicts ${Object.keys(e).filter(k => ev[k] !== e[k]).map(k => lit(k, e[k])).join(', ')} → <code>consistent_with</code> is False and the sample is <b>wasted</b>. Kept so far: ${kept} / ${j + 1}.`
      });
    }
    const kept = counts.T + counts.F;
    const big = rejectionRun(bn, X, e, N_BIG, mulberry32(SEED * 7919 + (vk === 'sp' ? 3 : 4)));
    snap({
      kind: kept ? 'done' : 'fail', ev: samples[samples.length - 1].ev, final: true, big, lines: [L('return ProbDist(X, counts)')],
      title: kept ? `Estimate = ${counts.T} / ${kept} = ${fmt(counts.T / kept)}  (exact ${fmt(exact)})` : `All ${N_TRACE} samples rejected → ZeroDivisionError`,
      explain: (kept
        ? `<code>ProbDist</code> normalises the counts: ${counts.T} / (${counts.T} + ${counts.F}) = <b>${fmt(counts.T / kept)}</b>, using only ${kept} of ${N_TRACE} samples (${pct(kept / N_TRACE)}). `
        : `P(${evMath(e)}) is only about ${pct(evidenceProb(bn, e))}, so 20 prior samples almost never match the evidence and <code>ProbDist</code> divides by zero. `) +
        `With N = ${N_BIG.toLocaleString()} the same code keeps <b>${big.kept}</b> samples (${pct(big.kept / N_BIG)}) and estimates ${big.est == null ? '— (none kept)' : fmt(big.est)}. Rejection sampling wastes the fraction 1 − P(e) of all samples.`
    });
    return {
      code, file: 'aima/probability.py · prior_sample, rejection_sampling', stateTitle: `Rejection sampling · ${V.label.split(' · ')[0]}`,
      steps,
      state: s => samplingState(s, bn, V, exact, 'rej'),
      tags: { start: ['Ready', ''], sample: ['prior_sample', 'info'], draw: ['sample()', 'info'], keep: ['Kept', 'ok'], reject: ['Rejected', 'bad'], done: ['Estimate', 'ok'], fail: ['ZeroDivisionError', 'bad'] },
      interval: 650
    };
  }

  function evidenceProb(bn, e) {
    // P(e) by summing the joint over all non-evidence variables
    const all = (vs, ev) => {
      if (!vs.length) return 1;
      const [Y, ...rest] = vs, n = bn.node(Y);
      if (Y in ev) return pr(n, ev[Y], ev) * all(rest, ev);
      return [T, F].reduce((s, y) => { const ev2 = Object.assign({}, ev, { [Y]: y }); return s + pr(n, y, ev2) * all(rest, ev2); }, 0);
    };
    return all(bn.vars, e);
  }

  // ===========================================================================
  // PART 6b · Likelihood weighting (AIMA Fig. 14.15)
  // ===========================================================================
  function traceLW(vk) {
    const V = SAMPLE_VARIANTS.lw[vk], bn = NETS[V.net], X = V.X, e = V.e;
    const code = [
      'def likelihood_weighting(X, e, bn, N=10000):',
      '    """[Figure 14.15]"""',
      '    W = {x: 0 for x in bn.variable_values(X)}',
      '    for j in range(N):',
      '        sample, weight = weighted_sample(bn, e)',
      '        W[sample[X]] += weight',
      '    return ProbDist(X, W)',
      '',
      'def weighted_sample(bn, e):',
      '    w = 1',
      '    event = dict(e)',
      '    for node in bn.nodes:',
      '        Xi = node.variable',
      '        if Xi in e:',
      '            w *= node.p(e[Xi], event)',
      '        else:',
      '            event[Xi] = node.sample(event)',
      '    return event, w',
      '',
      `random.seed(${SEED})`,
      `likelihood_weighting('${X}', ${evPy(e)}, ${V.net}, N=${N_TRACE})`
    ];
    const L = s => ln(code, s);
    const rng = mulberry32(SEED * 1000 + (vk === 'sp' ? 5 : 6));
    const exact = enumAsk(bn, X, e).T;
    const steps = [], samples = [];
    const W = { T: 0, F: 0 };
    const snap = o => steps.push(Object.assign({ W: Object.assign({}, W), samples: samples.slice(-7), n: samples.length }, o));
    snap({ kind: 'start', lines: [L(`likelihood_weighting('${X}'`), L('def likelihood_weighting('), L('W = {x: 0 for x')], title: `likelihood_weighting('${X}', ${evPy(e)}, N=${N_TRACE})`, explain: `Estimate <b>${V.label.split(' · ')[0]}</b> without rejecting anything: evidence variables are <b>clamped</b> to their observed values, and each sample is <b>weighted</b> by how likely that evidence is given its sampled parents. Exact answer: ${fmt(exact)}.` });
    for (let j = 0; j < N_TRACE; j++) {
      const detail = j < N_DETAIL;
      const ev = Object.assign({}, e);
      let w = 1;
      if (detail) snap({ kind: 'sample', j, ev: Object.assign({}, ev), w, lines: [L('for j in range(N):'), L('sample, weight = weighted_sample(bn, e)'), L('w = 1'), L('event = dict(e)')], title: `Sample #${j + 1}: w = 1, event = ${evPy(e)}`, explain: 'The event starts with the evidence already filled in, so every sample generated is consistent with e by construction.' });
      bn.nodes.forEach(n => {
        if (n.v in e) {
          const f = pr(n, e[n.v], ev);
          w *= f;
          if (detail) snap({ kind: 'weight', j, ev: Object.assign({}, ev), cur: n.v, w, lines: [L('Xi = node.variable'), L('if Xi in e:'), L('w *= node.p(e[Xi], event)')], title: `${n.v} is evidence: w *= ${condTxt(n, e[n.v], ev)} = ${fmt(f)} → w = ${fmt(w)}`, explain: `<code>${n.v}</code> is not sampled — it is fixed to ${lit(n.v, e[n.v])}. Instead the weight is multiplied by the probability of that observation given the parents sampled so far.` });
        } else {
          const u = rng(), pt = pr(n, T, ev);
          ev[n.v] = u < pt;
          if (detail) snap({ kind: 'draw', j, ev: Object.assign({}, ev), cur: n.v, w, lines: [L('Xi = node.variable'), L('if Xi in e:'), L('else:'), L('event[Xi] = node.sample(event)')], title: `${n.v}: u = ${u.toFixed(3)} ${ev[n.v] ? '<' : '≥'} ${condTxt(n, T, ev)} = ${fmt(pt)} → ${ev[n.v] ? 'True' : 'False'}`, explain: `A non-evidence node is sampled from its CPT exactly as in prior_sample. Weight unchanged: w = ${fmt(w)}.` });
        }
      });
      W[tf(ev[X])] += w;
      samples.push({ j, ev, w });
      snap({
        kind: 'add', j, ev, w, lines: detail ? [L('return event, w'), L('W[sample[X]] += weight')] : [L('sample, weight = weighted_sample(bn, e)'), L('W[sample[X]] += weight')],
        title: `Sample #${j + 1}: W[${ev[X] ? 'True' : 'False'}] += ${fmt(w)}`,
        explain: `[${bn.vars.map(v => lit(v, ev[v])).join(', ')}] with weight <b>${fmt(w)}</b> votes for ${lit(X, ev[X])}. Running estimate W[T] / (W[T] + W[F]) = ${fmt(W.T / (W.T + W.F))}.`
      });
    }
    const big = lwRun(bn, X, e, N_BIG, mulberry32(SEED * 7919 + (vk === 'sp' ? 7 : 8)));
    const est = W.T / (W.T + W.F);
    snap({
      kind: 'done', ev: samples[samples.length - 1].ev, final: true, big, lines: [L('return ProbDist(X, W)')],
      title: `Estimate = ${fmt(W.T)} / ${fmt(W.T + W.F)} = ${fmt(est)}  (exact ${fmt(exact)})`,
      explain: `<code>ProbDist</code> normalises the weights: <b>${fmt(est)}</b> from ${N_TRACE} samples — all ${N_TRACE} were used, none rejected. With N = ${N_BIG.toLocaleString()} the same code estimates <b>${fmt(big.est)}</b>. ${vk === 'bu' ? 'Note how tiny most weights are: when the evidence is unlikely, a few samples (those with Alarm = T) carry almost all the weight, so LW still needs many samples to converge.' : 'Weights stay moderate here because the evidence is likely, so LW converges quickly.'}`
    });
    return {
      code, file: 'aima/probability.py · likelihood_weighting, weighted_sample', stateTitle: `Likelihood weighting · ${V.label.split(' · ')[0]}`,
      steps,
      state: s => samplingState(s, bn, V, exact, 'lw'),
      tags: { start: ['Ready', ''], sample: ['weighted_sample', 'info'], weight: ['w *= P(e|…)', 'warn'], draw: ['sample()', 'info'], add: ['W += w', 'ok'], done: ['Estimate', 'ok'] },
      interval: 650
    };
  }

  /** Shared state panel for both sampling traces. */
  function samplingState(s, bn, V, exact, mode) {
    const X = V.X, e = V.e;
    const head = bn.vars.map(v => `<th class="${v in e ? 'evi' : v === X ? 'qry' : ''}">${ABBR[v]}</th>`).join('');
    const rows = s.samples.map(r => `<tr class="${mode === 'rej' ? (r.ok ? 'ok' : 'bad') : ''}"><td>${r.j + 1}</td>${bn.vars.map(v => `<td class="${r.ev[v] ? 't' : 'f'}">${tf(r.ev[v])}</td>`).join('')}<td>${mode === 'rej' ? (r.ok ? '✓' : '✗') : fmt(r.w)}</td></tr>`).join('');
    const table = s.samples.length
      ? `<table class="klt-samples"><thead><tr><th>#</th>${head}<th>${mode === 'rej' ? 'keep' : 'w'}</th></tr></thead><tbody>${rows}</tbody></table>`
      : '<p class="klt-empty">No samples yet.</p>';
    let est = null, varsRows;
    if (mode === 'rej') {
      const kept = s.counts.T + s.counts.F;
      est = kept ? s.counts.T / kept : null;
      varsRows = [['counts', `{T: ${s.counts.T}, F: ${s.counts.F}}`], ['kept / drawn', `${kept} / ${s.n}`, s.n && !kept ? 'bad' : ''], ['acceptance', s.n ? pct(kept / s.n) : '—']];
    } else {
      const tot = s.W.T + s.W.F;
      est = tot ? s.W.T / tot : null;
      varsRows = [['W[True]', fmt(s.W.T)], ['W[False]', fmt(s.W.F)], ['w (this sample)', s.w == null ? '—' : fmt(s.w)]];
    }
    const bigBar = s.final && s.big ? bar(`N = ${N_BIG.toLocaleString()}`, s.big.est, 'big', exact) : '';
    return `<div class="klt-state">
        <div>${dagSVG(V.net, { values: s.ev || {}, evidence: mode === 'lw' ? e : undefined, current: s.cur, query: X })}
          <div class="klt-legend"><span><i class="lg evi"></i>evidence</span><span><i class="lg qry"></i>query</span><span><i class="lg cur"></i>being sampled</span></div></div>
        <div class="klt-regions">
          ${region(`Samples (last ${Math.min(7, s.samples.length) || 7})`, table)}
          ${vars(varsRows)}
          ${region(`Estimate of P(${lit(X, T)} | ${evMath(e)})`, bar(`N = ${s.n}`, est, mode, exact) + bigBar + `<div class="klt-bar-note"><i class="klt-bar-exact-key"></i> exact = ${fmt(exact)}</div>`)}
        </div></div>`;
  }

  // ===========================================================================
  // PART 6c · Convergence & sample efficiency (RS vs LW)
  // ===========================================================================
  const CMP_VARIANTS = {
    bu: { label: 'P(Burglary | j, m) · rare evidence', net: 'burglary', X: 'Burglary', e: { JohnCalls: T, MaryCalls: T } },
    sp: { label: 'P(Rain | s, w) · common evidence', net: 'sprinkler', X: 'Rain', e: { Sprinkler: T, WetGrass: T } }
  };
  const NS = [100, 1000, 10000, 100000];
  function traceCompare(vk) {
    const V = CMP_VARIANTS[vk], bn = NETS[V.net], X = V.X, e = V.e;
    const code = [
      'def rejection_stats(X, e, bn, N):',
      '    """rejection_sampling that also reports how many samples were kept"""',
      '    counts, kept = {T: 0, F: 0}, 0',
      '    for j in range(N):',
      '        sample = prior_sample(bn)',
      '        if consistent_with(sample, e):',
      '            counts[sample[X]] += 1',
      '            kept += 1',
      '    return (counts[T] / kept if kept else None), kept',
      '',
      `e = ${evPy(e)}`,
      `exact = enumeration_ask('${X}', e, ${V.net})[T]`,
      'for N in [100, 1_000, 10_000, 100_000]:',
      `    rs, kept = rejection_stats('${X}', e, ${V.net}, N)`,
      `    lw = likelihood_weighting('${X}', e, ${V.net}, N)[T]`,
      "    print(f'{N:>7}  kept={kept:>6}  RS={rs}  LW={lw:.4f}')"
    ];
    const L = s => ln(code, s);
    const exact = enumAsk(bn, X, e).T;
    const pe = evidenceProb(bn, e);
    const res = NS.map((N, k) => ({
      N,
      rs: rejectionRun(bn, X, e, N, mulberry32(101 + k + (vk === 'sp' ? 50 : 0))),
      lw: lwRun(bn, X, e, N, mulberry32(201 + k + (vk === 'sp' ? 50 : 0)))
    }));
    const steps = [];
    const shown = [];
    steps.push({ kind: 'start', shown: [], lines: [L('e = '), L('exact = enumeration_ask(')], title: `exact = ${fmt(exact)}  ·  P(e) = ${pct(pe)}`, explain: `Ground truth comes from exact enumeration (Part 4). The key number for rejection sampling is <b>P(e) = ${pct(pe)}</b>: on average only that fraction of prior samples survives.` });
    res.forEach((r, k) => {
      shown.push({ N: r.N, rs: r.rs });
      steps.push({
        kind: 'rs', shown: JSON.parse(JSON.stringify(shown)), N: r.N, lines: [L('for N in [100'), L('rs, kept = rejection_stats('), L('def rejection_stats('), L('if consistent_with(sample, e):'), L('kept += 1')],
        title: `N = ${r.N.toLocaleString()} · rejection sampling kept ${r.rs.kept.toLocaleString()} (${pct(r.rs.kept / r.N)})`,
        explain: r.rs.kept
          ? `RS estimate = ${fmt(r.rs.est)} (error ${fmt(Math.abs(r.rs.est - exact))}) from only <b>${r.rs.kept.toLocaleString()}</b> useful samples.`
          : `Every one of the ${r.N.toLocaleString()} samples contradicted the evidence — RS has <b>no estimate at all</b> (aima's rejection_sampling would raise ZeroDivisionError).`
      });
      shown[k].lw = r.lw;
      steps.push({
        kind: 'lw', shown: JSON.parse(JSON.stringify(shown)), N: r.N, lines: [L('lw = likelihood_weighting('), L("print(f'{N:>7}")],
        title: `N = ${r.N.toLocaleString()} · likelihood weighting = ${fmt(r.lw.est)}`,
        explain: `LW used all ${r.N.toLocaleString()} samples: estimate ${fmt(r.lw.est)}, error ${fmt(Math.abs(r.lw.est - exact))}${r.rs.est != null ? ` vs RS error ${fmt(Math.abs(r.rs.est - exact))}` : ' (RS: none)'}.`
      });
    });
    steps.push({
      kind: 'done', shown: JSON.parse(JSON.stringify(shown)), lines: [L('for N in [100')],
      title: 'Both are consistent — they differ in sample efficiency',
      explain: vk === 'bu'
        ? `Both estimates approach ${fmt(exact)} as N grows, but rejection sampling keeps only ≈ P(e) = ${pct(pe)} of its work, so its effective sample size is ~${Math.round(pe * 100000)} at N = 100,000. LW never discards a sample — its accuracy is limited instead by uneven weights.`
        : `With likely evidence (P(e) = ${pct(pe)}), rejection sampling keeps a large share of samples and both methods converge at similar speed. Sample efficiency only becomes decisive when evidence is rare — switch to the burglary query to see it.`
    });
    return {
      code, file: 'Lab solution · prior_sample, likelihood_weighting from aima/probability.py', stateTitle: `Convergence · ${V.label.split(' · ')[0]}`,
      steps,
      state: s => {
        const rows = NS.map(N => {
          const r = s.shown.find(x => x.N === N);
          const cur = s.N === N ? 'hl' : '';
          if (!r) return `<tr class="${cur}"><td>${N.toLocaleString()}</td><td colspan="4" class="klt-muted">…</td></tr>`;
          const rsE = r.rs.est == null ? '—' : fmt(r.rs.est), rsErr = r.rs.est == null ? '—' : fmt(Math.abs(r.rs.est - exact));
          const lwE = r.lw ? fmt(r.lw.est) : '…', lwErr = r.lw ? fmt(Math.abs(r.lw.est - exact)) : '…';
          return `<tr class="${cur}"><td>${N.toLocaleString()}</td><td>${r.rs.kept.toLocaleString()} <span class="klt-muted">(${pct(r.rs.kept / N)})</span></td><td>${rsE}<br><span class="klt-muted">±${rsErr}</span></td><td>${lwE}<br><span class="klt-muted">±${lwErr}</span></td></tr>`;
        }).join('');
        const bars = s.shown.map(r => bar(`RS ${r.N >= 1000 ? r.N / 1000 + 'k' : r.N}`, r.rs.est, 'rej', exact) + (r.lw ? bar(`LW ${r.N >= 1000 ? r.N / 1000 + 'k' : r.N}`, r.lw.est, 'lw', exact) : '')).join('');
        return `<div class="klt-state">
          <div class="klt-regions">
            ${region('Results', `<table class="klt-cpt klt-cmp"><thead><tr><th>N</th><th>RS kept</th><th>RS est.</th><th>LW est.</th></tr></thead><tbody>${rows}</tbody></table>`)}
            ${vars([['exact', fmt(exact), 'ok'], ['P(e)', pct(pe)]])}
          </div>
          <div class="klt-regions">${region('Estimates vs exact', (bars || '<p class="klt-empty">Run the loop to fill this chart.</p>') + `<div class="klt-bar-note"><i class="klt-bar-exact-key"></i> exact = ${fmt(exact)}</div>`)}</div>
          </div>`;
      },
      tags: { start: ['Ready', ''], rs: ['Rejection', 'warn'], lw: ['Likelihood w.', 'info'], done: ['Summary', 'ok'] },
      interval: 1300
    };
  }

  // ===========================================================================
  // Parts registry
  // ===========================================================================
  const opt = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v.label]));
  const PARTS = [
    { id: 'build', label: 'Obj 1–2 · Build the network', trace: traceBuild },
    { id: 'joint', label: 'Obj 3 · Full joint (chain rule)', variants: opt(JOINT_VARIANTS), trace: traceJoint },
    { id: 'enum', label: 'Obj 4 · enumeration_ask', variants: opt(ENUM_VARIANTS), trace: traceEnum },
    { id: 'explain', label: 'Obj 5 · Explaining away', variants: opt(EXPLAIN_VARIANTS), trace: traceExplain },
    { id: 'rej', label: 'Obj 6 · Rejection sampling', variants: opt(SAMPLE_VARIANTS.rej), trace: traceRejection },
    { id: 'lw', label: 'Obj 6 · Likelihood weighting', variants: opt(SAMPLE_VARIANTS.lw), trace: traceLW },
    { id: 'cmp', label: 'Obj 6 · Convergence: RS vs LW', variants: opt(CMP_VARIANTS), trace: traceCompare }
  ];

  // ---------------------------------------------------------------------------
  // Python syntax colouring
  // ---------------------------------------------------------------------------
  const KW = /^(def|class|return|if|elif|else|for|in|not|and|or|is|None|True|False|assert|import|from|lambda|print)$/;
  function pyHTML(line) {
    const re = /(#.*$)|("""[^]*?"""|'[^']*'|"[^"]*")|(\b\d[\d_]*\.?\d*\b)|([A-Za-z_]\w*)(?=\()|([A-Za-z_]\w*)|(\s+|.)/g;
    let out = '', m;
    while ((m = re.exec(line))) {
      if (m[1]) out += `<span class="cm">${esc(m[1])}</span>`;
      else if (m[2]) out += `<span class="st">${esc(m[2])}</span>`;
      else if (m[3]) out += `<span class="nu">${esc(m[3])}</span>`;
      else if (m[4]) out += KW.test(m[4]) ? `<span class="kw">${m[4]}</span>` : `<span class="fn">${m[4]}</span>`;
      else if (m[5]) out += KW.test(m[5]) ? `<span class="kw">${m[5]}</span>` : esc(m[5]);
      else out += esc(m[6]);
    }
    return out;
  }

  // ---------------------------------------------------------------------------
  // Controller
  // ---------------------------------------------------------------------------
  const S = { part: 'build', variant: {}, step: {}, timer: null, cache: {} };
  let host = null;

  function stop() { if (S.timer) { clearInterval(S.timer); S.timer = null; } }

  function current() {
    const part = PARTS.find(p => p.id === S.part) || PARTS[0];
    const vk = part.variants ? (S.variant[part.id] in part.variants ? S.variant[part.id] : Object.keys(part.variants)[0]) : '-';
    const key = part.id + ':' + vk;
    if (!S.cache[key]) S.cache[key] = part.trace(vk);
    return { part, vk, key, tr: S.cache[key] };
  }

  function draw() {
    if (!host || !host.isConnected) { stop(); return; }
    const { part, vk, key, tr } = current();
    const total = tr.steps.length;
    const i = Math.max(0, Math.min(S.step[key] || 0, total - 1));
    S.step[key] = i;
    const s = tr.steps[i];
    const active = new Set(s.lines || []);

    const codeHost = document.getElementById('kl-concept-code');
    if (codeHost) {
      codeHost.innerHTML = `
        <div class="klt-panel klt-panel-code">
          <p class="klt-panel-title"><span class="klt-file">${esc(tr.file)}</span><span class="klt-tag">Python</span><span class="klt-tag klt-tag-step">Step ${i + 1} / ${total}</span></p>
          <pre class="klt-code">${tr.code.map((line, k) => {
            const on = active.has(k + 1);
            return `<div class="klt-line ${on ? 'is-active' : ''}"><span class="klt-arrow">${on ? '→' : ''}</span><span class="klt-no">${k + 1}</span><span class="klt-src">${pyHTML(line)}</span></div>`;
          }).join('')}</pre>
        </div>`;
      const pre = codeHost.querySelector('.klt-code');
      const hot = pre && pre.querySelector('.klt-line.is-active');
      if (pre && hot && pre.scrollHeight > pre.clientHeight + 2) pre.scrollTop = Math.max(0, hot.offsetTop - pre.clientHeight / 2);
    }

    const [tag, tagCls] = (tr.tags && tr.tags[s.kind]) || ['Running', ''];
    const partOpts = PARTS.map(p => `<option value="${p.id}" ${p.id === part.id ? 'selected' : ''}>${p.label}</option>`).join('');
    const varOpts = part.variants ? Object.entries(part.variants).map(([k, l]) => `<option value="${k}" ${k === vk ? 'selected' : ''}>${esc(l)}</option>`).join('') : '';
    host.innerHTML = `
      <div class="klt">
        <div class="klt-head">
          <div class="klt-head-title"><i data-lucide="code-2"></i> Lab trace · Bayesian Networks &amp; Probabilistic Inference</div>
          <div class="klt-head-tools">
            <select class="klt-select" id="klt-part" aria-label="Lab part">${partOpts}</select>
            ${part.variants ? `<select class="klt-select" id="klt-variant" aria-label="Query">${varOpts}</select>` : ''}
          </div>
        </div>
        <div class="klt-toolbar">
          <div class="klt-count">Step ${i + 1} of ${total}</div>
          <div class="klt-controls">
            <button type="button" class="klt-btn" id="klt-prev" ${i <= 0 ? 'disabled' : ''}>← Prev</button>
            <button type="button" class="klt-btn klt-btn-primary" id="klt-next" ${i >= total - 1 ? 'disabled' : ''}>Next →</button>
            <button type="button" class="klt-btn" id="klt-play">${S.timer ? '❚❚ Pause' : '▶ Run'}</button>
            <button type="button" class="klt-btn" id="klt-reset">↻ Reset</button>
          </div>
        </div>
        <div class="klt-note"><p class="klt-note-title">${esc(s.title)}</p></div>
        <div class="klt-panel">
          <p class="klt-panel-title">${tr.stateTitle}<span class="klt-tag ${tagCls}">${tag}</span></p>
          ${tr.state(s, tr.steps, i)}
          <div class="klt-explain"><div class="klt-explain-title">What's happening?</div><div class="klt-explain-body">${s.explain}</div></div>
        </div>
      </div>`;

    const go = n => { S.step[key] = Math.max(0, Math.min(total - 1, n)); draw(); };
    const on = (id, ev, fn) => { const el = document.getElementById(id); if (el) el.addEventListener(ev, fn); };
    on('klt-prev', 'click', () => { stop(); go(i - 1); });
    on('klt-next', 'click', () => { stop(); go(i + 1); });
    on('klt-reset', 'click', () => { stop(); go(0); });
    on('klt-play', 'click', () => {
      if (S.timer) { stop(); draw(); return; }
      if ((S.step[key] || 0) >= total - 1) S.step[key] = 0;
      S.timer = setInterval(() => {
        if (S.step[key] >= total - 1) { stop(); draw(); return; }
        S.step[key]++;
        draw();
      }, tr.interval || 900);
      draw();
    });
    on('klt-part', 'change', e => { stop(); S.part = e.target.value; draw(); });
    on('klt-variant', 'change', e => { stop(); S.variant[part.id] = e.target.value; draw(); });
    if (window.lucide) window.lucide.createIcons();
  }

  function render(graphCol) { stop(); host = graphCol; draw(); }

  window.BayesLabTrace = { render, stop, _parts: PARTS, _nets: NETS, _enumAsk: enumAsk };
})();
