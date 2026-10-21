/**
 * bn_lab.js — Topic 05 · Bayesian Networks · interactive "Network Construction"
 * and "Inference & Graph Exploration" concepts (knowledge.html)
 *
 * Two AIMA networks (Ch. 13 / 14):
 *   - Burglary Alarm:  Burglary, Earthquake → Alarm → JohnCalls, MaryCalls
 *   - Sprinkler:       Cloudy → Sprinkler, Rain → WetGrass
 *
 * Construction: build the DAG one node at a time (parents, CPT size,
 * conditional-independence notes), see the chain-rule factorization grow, and
 * click any node to view / edit its CPT.
 *
 * Inference: choose a query variable and evidence, compare prior P(X) with
 * posterior P(X | e), and step through ENUMERATION-ASK:
 *     P(X | e) = α Σ_y P(X, e, y),   P(x₁…xₙ) = ∏ P(xᵢ | parents(Xᵢ))
 *
 * Both concepts share one set of CPTs, so an edit in either view immediately
 * updates every probability, chart and enumeration table.
 *
 * Single-screen layout: controls in the concept column (#kl-concept-lab),
 * graph + panels in the illustration column.
 *
 * Public API: window.BNLab = { renderConstruction(col), renderInference(col), prob, enumerate }
 */
(function () {
  'use strict';

  const T = true, F = false;

  // ---------------------------------------------------------------------------
  // Network definitions (CPT values from AIMA; key = parents' values, e.g. 'TF')
  // ---------------------------------------------------------------------------
  const NETS = [
    {
      id: 'burglary', name: 'Burglary Alarm', icon: 'bell-ring',
      title: 'Did a burglar break in?',
      story: 'You have a burglar alarm at home. It reliably detects burglaries but is also set off by small earthquakes. Your neighbours <b>John</b> and <b>Mary</b> promised to call you at work when they hear it — John sometimes mistakes the phone for the alarm, and Mary often misses it because of loud music.',
      short: 'Burglaries and small earthquakes both set off the alarm; neighbours <b>John</b> and <b>Mary</b> call when they hear it. Both have called — how likely is a burglary?',
      tryIt: 'Try: observe only JohnCalls, or add Earthquake = T and watch Burglary drop (explaining away).',
      query: 'Burglary', evidence: { JohnCalls: T, MaryCalls: T },
      vars: [
        { v: 'Burglary', a: 'B', desc: 'a burglar breaks in', parents: [], cpt: { '': 0.001 }, pos: [105, 34],
          why: 'Root node — nothing in the model causes a burglary, so its CPT is a single prior P(B).',
          ci: 'Burglary has no parents, so it needs no conditioning: the agent’s belief before any evidence is just P(b) = 0.001.' },
        { v: 'Earthquake', a: 'E', desc: 'a small earthquake occurs', parents: [], cpt: { '': 0.002 }, pos: [315, 34],
          why: 'Root node — a second, independent cause. There is no edge between Burglary and Earthquake.',
          ci: 'Burglary ⫫ Earthquake: P(B | E) = P(B). With no path of influence between them, knowing one tells us nothing about the other — until Alarm is observed.' },
        { v: 'Alarm', a: 'A', desc: 'the alarm sounds', parents: ['Burglary', 'Earthquake'], cpt: { TT: 0.95, TF: 0.94, FT: 0.29, FF: 0.001 }, pos: [210, 110],
          why: 'Parents: Burglary and Earthquake — both directly cause the alarm. The CPT needs one row per parent combination: 2² = 4 rows.',
          ci: 'B → A ← E is a common effect (v-structure). Observing Alarm makes Burglary and Earthquake dependent: if an earthquake explains the alarm, a burglary becomes less likely (explaining away).' },
        { v: 'JohnCalls', a: 'J', desc: 'John calls you', parents: ['Alarm'], cpt: { T: 0.90, F: 0.05 }, pos: [105, 186],
          why: 'Parent: Alarm. John reacts to the alarm; he cannot perceive a burglary or earthquake directly.',
          ci: 'JohnCalls ⫫ {Burglary, Earthquake} | Alarm: P(J | A, B, E) = P(J | A). Once the alarm state is known, the causes add nothing.' },
        { v: 'MaryCalls', a: 'M', desc: 'Mary calls you', parents: ['Alarm'], cpt: { T: 0.70, F: 0.01 }, pos: [315, 186],
          why: 'Parent: Alarm. Mary also only reacts to the alarm.',
          ci: 'MaryCalls ⫫ JohnCalls | Alarm: the two calls are correlated only through their common cause Alarm.' }
      ]
    },
    {
      id: 'sprinkler', name: 'Sprinkler', icon: 'cloud-rain',
      title: 'Was it the rain or the sprinkler?',
      story: 'When it is <b>cloudy</b>, rain is likely and the <b>sprinkler</b> is usually left off. Either <b>rain</b> or the sprinkler can make the grass wet. You look outside and the <b>grass is wet</b> — what caused it?',
      short: 'Clouds make rain likely and the sprinkler unlikely; either one wets the grass. The grass is wet — was it rain or the sprinkler?',
      tryIt: 'Try: query Sprinkler instead, or also observe Sprinkler = T and watch Rain drop (explaining away).',
      query: 'Rain', evidence: { WetGrass: T },
      vars: [
        { v: 'Cloudy', a: 'C', desc: 'the sky is cloudy', parents: [], cpt: { '': 0.5 }, pos: [210, 32],
          why: 'Root node — the weather is the starting point of the story. Its CPT is a single prior P(C).',
          ci: 'Cloudy will become the common cause of Sprinkler and Rain.' },
        { v: 'Sprinkler', a: 'S', desc: 'the sprinkler is on', parents: ['Cloudy'], cpt: { T: 0.10, F: 0.50 }, pos: [100, 110],
          why: 'Parent: Cloudy. People rarely switch the sprinkler on when it is cloudy. 2 rows: one for C = T, one for C = F.',
          ci: 'Sprinkler depends directly on Cloudy only.' },
        { v: 'Rain', a: 'R', desc: 'it rains', parents: ['Cloudy'], cpt: { T: 0.80, F: 0.20 }, pos: [320, 110],
          why: 'Parent: Cloudy. Rain is much more likely under clouds. 2 rows.',
          ci: 'Sprinkler ⫫ Rain | Cloudy: once we know whether it is cloudy, learning about the sprinkler tells us nothing more about rain (common cause).' },
        { v: 'WetGrass', a: 'W', desc: 'the grass is wet', parents: ['Sprinkler', 'Rain'], cpt: { TT: 0.99, TF: 0.90, FT: 0.90, FF: 0.00 }, pos: [210, 188],
          why: 'Parents: Sprinkler and Rain — either one wets the grass. 2² = 4 rows.',
          ci: 'WetGrass ⫫ Cloudy | {Sprinkler, Rain}. S → W ← R is a v-structure: observing wet grass makes Sprinkler and Rain compete to explain it (explaining away).' }
      ]
    }
  ];
  NETS.forEach(n => { n.byName = {}; n.vars.forEach(x => { n.byName[x.v] = x; }); });

  // ---------------------------------------------------------------------------
  // Shared state
  // ---------------------------------------------------------------------------
  const cpts = {};
  function restoreCpts(net) {
    cpts[net.id] = {};
    net.vars.forEach(x => { cpts[net.id][x.v] = Object.assign({}, x.cpt); });
  }
  NETS.forEach(restoreCpts);

  let netIdx = 0;
  let mode = 'build';            // 'build' | 'infer'
  const build = NETS.map(() => ({ step: 0, selected: null }));
  const infer = NETS.map(n => ({ query: n.query, evidence: Object.assign({}, n.evidence), steps: 0, view: 'chart', selected: null }));
  let ctrlHost = null, vizHost = null;
  const NSTEPS = 7;

  const net = () => NETS[netIdx];

  // ---------------------------------------------------------------------------
  // Probability engine (full joint by enumeration — at most 2⁵ = 32 worlds)
  // ---------------------------------------------------------------------------
  const keyOf = (x, as) => x.parents.map(p => (as[p] ? 'T' : 'F')).join('');
  const pr = (n, x, val, as) => { const p = cpts[n.id][x.v][keyOf(x, as)]; return val ? p : 1 - p; };

  function worlds(n) {
    const k = n.vars.length, out = [];
    for (let m = 0; m < (1 << k); m++) {
      const as = {};
      n.vars.forEach((x, i) => { as[x.v] = !((m >> (k - 1 - i)) & 1); });
      let p = 1;
      n.vars.forEach(x => { p *= pr(n, x, as[x.v], as); });
      out.push({ as, p });
    }
    return out;
  }
  const consistent = (as, ev) => Object.keys(ev).every(v => as[v] === ev[v]);

  function prob(n, X, ev) {
    let num = 0, den = 0;
    worlds(n).forEach(w => {
      if (!consistent(w.as, ev)) return;
      den += w.p;
      if (w.as[X]) num += w.p;
    });
    return den > 0 ? num / den : NaN;
  }

  function enumerate(n, Q, ev) {
    const hidden = n.vars.filter(x => x.v !== Q && !(x.v in ev)).map(x => x.v);
    const tables = {}, sums = {};
    [T, F].forEach(qv => {
      const list = [];
      let s = 0;
      for (let m = 0; m < (1 << hidden.length); m++) {
        const as = Object.assign({}, ev, { [Q]: qv });
        hidden.forEach((h, i) => { as[h] = !((m >> (hidden.length - 1 - i)) & 1); });
        const factors = n.vars.map(x => ({ x, val: as[x.v], p: pr(n, x, as[x.v], as) }));
        const prod = factors.reduce((a, f) => a * f.p, 1);
        list.push({ as, factors, prod });
        s += prod;
      }
      tables[qv ? 'T' : 'F'] = list;
      sums[qv ? 'T' : 'F'] = s;
    });
    const Z = sums.T + sums.F;
    return { hidden, tables, sums, Z, post: Z > 0 ? sums.T / Z : NaN };
  }

  function ancestors(n, names) {
    const out = new Set();
    const stack = names.slice();
    while (stack.length) {
      const v = stack.pop();
      if (out.has(v)) continue;
      out.add(v);
      n.byName[v].parents.forEach(p => stack.push(p));
    }
    return out;
  }

  // ---------------------------------------------------------------------------
  // Formatting
  // ---------------------------------------------------------------------------
  const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  function fp(x) {
    if (!Number.isFinite(x)) return '—';
    if (x === 0) return '0';
    if (x >= 0.001) return x.toFixed(4).replace(/0+$/, '').replace(/\.$/, '.0');
    const [m, e] = x.toExponential(3).split('e');
    return `${m}×10${String(parseInt(e, 10)).split('').map(c => SUP[c]).join('')}`;
  }
  const f4 = x => (Number.isFinite(x) ? x.toFixed(4) : '—');
  const pct = x => {
    if (!Number.isFinite(x)) return '—';
    const v = x * 100;
    if (v !== 0 && Math.abs(v) < 1) return v.toFixed(2) + '%';
    return v.toFixed(1) + '%';
  };
  const icons = () => { if (window.lucide) window.lucide.createIcons(); };
  const lit = (x, val) => (val ? '' : '¬') + x.a.toLowerCase();
  const tf = b => (b ? 'T' : 'F');

  function combos(k) {
    const out = [];
    for (let m = 0; m < (1 << k); m++) {
      const row = [];
      for (let i = 0; i < k; i++) row.push(!((m >> (k - 1 - i)) & 1));
      out.push(row);
    }
    return out;
  }
  const cptLabel = x => `P(${x.a}${x.parents.length ? ' | ' + x.parents.map(p => net().byName[p].a).join(', ') : ''})`;

  // ---------------------------------------------------------------------------
  // DAG drawing
  // ---------------------------------------------------------------------------
  const HW = 60, HH = 22;
  function clip(cx, cy, dx, dy) {
    const t = Math.min(HW / Math.abs(dx || 1e-9), HH / Math.abs(dy || 1e-9));
    return [cx + dx * t, cy + dy * t];
  }

  /**
   * o.cls(v)      → extra classes for node v ('' hides nothing)
   * o.visible(v)  → boolean
   * o.sub(v)      → small caption under the node name
   * o.bar(v)      → number 0..1 for the mini bar (or null)
   * o.badge(v)    → 'T' | 'F' | null
   * o.edge(p, c)  → '' | 'hi' | 'new' | 'dim'
   */
  function dagSvg(n, o) {
    const sel = o.selected;
    let edges = '', nodes = '';
    n.vars.forEach(x => {
      x.parents.forEach(pn => {
        if (!o.visible(x.v) || !o.visible(pn)) return;
        const p = n.byName[pn];
        const dx = x.pos[0] - p.pos[0], dy = x.pos[1] - p.pos[1];
        const a = clip(p.pos[0], p.pos[1], dx, dy);
        const b = clip(x.pos[0], x.pos[1], -dx, -dy);
        const cls = o.edge(pn, x.v);
        const marker = cls === 'hi' ? 'kbn-arr-hi' : cls === 'new' ? 'kbn-arr-new' : 'kbn-arr';
        edges += `<line class="kbn-edge ${cls}" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" marker-end="url(#${marker})"/>`;
      });
    });
    n.vars.forEach(x => {
      const vis = o.visible(x.v);
      const [cx, cy] = x.pos;
      const bar = vis && o.bar ? o.bar(x.v) : null;
      const badge = vis && o.badge ? o.badge(x.v) : null;
      nodes += `
        <g class="kbn-node ${vis ? '' : 'ghost'} ${o.cls(x.v)} ${sel === x.v && vis ? 'selected' : ''}" data-node="${x.v}" ${vis ? 'tabindex="0" role="button"' : ''} aria-label="${x.v}">
          ${sel === x.v && vis ? `<rect class="kbn-ring" x="${cx - HW - 4}" y="${cy - HH - 4}" width="${2 * HW + 8}" height="${2 * HH + 8}" rx="12"/>` : ''}
          <rect class="kbn-box" x="${cx - HW}" y="${cy - HH}" width="${2 * HW}" height="${2 * HH}" rx="9"/>
          <text class="kbn-name" x="${cx}" y="${cy - 3}">${x.v} (${x.a})</text>
          <text class="kbn-sub" x="${cx}" y="${cy + 12}">${vis ? o.sub(x.v) : ''}</text>
          ${bar != null && Number.isFinite(bar) ? `<rect class="kbn-bar-bg" x="${cx - HW + 8}" y="${cy + HH - 6}" width="${2 * HW - 16}" height="3" rx="1.5"/><rect class="kbn-bar" x="${cx - HW + 8}" y="${cy + HH - 6}" width="${Math.max(0.5, (2 * HW - 16) * bar)}" height="3" rx="1.5"/>` : ''}
          ${badge ? `<g class="kbn-badge ${badge === 'T' ? 't' : 'f'}"><circle cx="${cx + HW - 4}" cy="${cy - HH + 2}" r="9"/><text x="${cx + HW - 4}" y="${cy - HH + 5.5}">${badge}</text></g>` : ''}
        </g>`;
    });
    return `
      <svg viewBox="0 0 420 222" class="kbn-dag" role="img" aria-label="${n.name} Bayesian network">
        <defs>
          <marker id="kbn-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#94a3b8"/></marker>
          <marker id="kbn-arr-hi" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#8b5cf6"/></marker>
          <marker id="kbn-arr-new" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#f59e0b"/></marker>
        </defs>
        ${edges}${nodes}
      </svg>`;
  }

  function bindDag(host, onPick) {
    const svg = host.querySelector('svg');
    if (!svg) return;
    const pick = e => {
      const g = e.target.closest('[data-node]');
      if (!g || g.classList.contains('ghost')) return;
      onPick(g.dataset.node);
    };
    svg.addEventListener('click', pick);
    svg.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(e); } });
  }

  // ---------------------------------------------------------------------------
  // CPT editor (shared by both concepts)
  // ---------------------------------------------------------------------------
  function cptEditor(n, v) {
    const x = n.byName[v];
    const par = x.parents.map(p => n.byName[p]);
    const rows = combos(par.length).map(vals => {
      const k = vals.map(tf).join('');
      const p = cpts[n.id][v][k];
      const changed = Math.abs(p - x.cpt[k]) > 1e-9;
      return `
        <tr>
          ${vals.map(b => `<td class="kbn-tf ${b ? 't' : 'f'}">${tf(b)}</td>`).join('')}
          <td class="kbn-edit">
            <input type="range" min="0" max="1" step="0.001" value="${p}" data-k="${k}" aria-label="P(${x.a} = T${par.length ? ' | ' + par.map((q, i) => q.a + ' = ' + tf(vals[i])).join(', ') : ''})">
            <input type="number" min="0" max="1" step="0.001" value="${+p.toFixed(4)}" data-k="${k}" aria-label="value">
            <span class="kbn-mod ${changed ? 'on' : ''}" data-mod="${k}" title="Changed from the AIMA value ${x.cpt[k]}">●</span>
          </td>
          <td class="kbn-pf" data-pf="${k}">${f4(1 - p)}</td>
        </tr>`;
    }).join('');
    return `
      <div class="kbn-cpt-head">
        <div><b>CPT · ${cptLabel(x)}</b> <span class="klt-muted">— ${x.v}: ${x.desc}</span></div>
        <button class="klt-btn kbn-restore" type="button"><i data-lucide="rotate-ccw"></i> Restore AIMA CPTs</button>
      </div>
      <div class="kbn-cpt-wrap">
        <table class="kbn-cpt">
          <thead><tr>
            ${par.map(q => `<th>${q.a}</th>`).join('')}
            <th>P(${x.a} = T${par.length ? ' | …' : ''}) <span class="klt-muted">edit</span></th>
            <th>P(${x.a} = F)</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="kbn-cpt-note">${par.length ? `${2 ** par.length} rows = one per combination of its ${par.length} parent${par.length > 1 ? 's' : ''}.` : 'Root node: a single prior.'} Each row sums to 1, so only P(${x.a} = T) is stored. Changes update every probability on this page.</div>`;
  }

  function bindCpt(host, n, v, onChange) {
    host.querySelectorAll('.kbn-edit input').forEach(inp => {
      inp.addEventListener('input', () => {
        let p = parseFloat(inp.value);
        if (!Number.isFinite(p)) return;
        p = Math.min(1, Math.max(0, p));
        const k = inp.dataset.k;
        cpts[n.id][v][k] = p;
        host.querySelectorAll(`.kbn-edit input[data-k="${k}"]`).forEach(o => { if (o !== inp) o.value = o.type === 'number' ? +p.toFixed(4) : p; });
        const pf = host.querySelector(`[data-pf="${k}"]`); if (pf) pf.textContent = f4(1 - p);
        const mod = host.querySelector(`[data-mod="${k}"]`); if (mod) mod.classList.toggle('on', Math.abs(p - n.byName[v].cpt[k]) > 1e-9);
        onChange();
      });
    });
    const rb = host.querySelector('.kbn-restore');
    if (rb) rb.addEventListener('click', () => { restoreCpts(n); draw(); });
  }

  // ---------------------------------------------------------------------------
  // Shared left-column pieces
  // ---------------------------------------------------------------------------
  function exTabs() {
    return `
      <div class="kbu-ex-tabs kbn-ex-tabs" role="tablist" aria-label="Choose a network">
        ${NETS.map((nn, i) => `
          <button class="kbu-ex-tab ${i === netIdx ? 'active' : ''}" role="tab" aria-selected="${i === netIdx}" data-net="${i}">
            <i data-lucide="${nn.icon}"></i> ${i + 1}. ${nn.name} Network
          </button>`).join('')}
      </div>`;
  }
  function bindExTabs() {
    ctrlHost.querySelectorAll('[data-net]').forEach(b => b.addEventListener('click', () => {
      netIdx = parseInt(b.dataset.net, 10);
      draw();
    }));
  }

  // ===========================================================================
  // 1. NETWORK CONSTRUCTION
  // ===========================================================================
  function buildLeft() {
    const n = net(), st = build[netIdx], k = st.step, N = n.vars.length;
    const x = k > 0 ? n.vars[k - 1] : null;
    let body;
    if (k === 0) {
      body = `<p>The network starts empty. Each <b>Next Step</b> adds one variable (in causal order, parents before children) together with the directed edges from its parents, then explains the dependency it encodes.</p>`;
    } else {
      body = `
        <div class="kbn-step-title">Add <b>${x.v}</b> (${x.a}) ${x.parents.length ? `with edge${x.parents.length > 1 ? 's' : ''} ${x.parents.map(p => n.byName[p].a + ' → ' + x.a).join(', ')}` : '— no incoming edges'}</div>
        <p>${x.why}</p>
        <div class="kbn-ci"><i data-lucide="git-branch"></i><span><b>Conditional independence:</b> ${x.ci}</span></div>
        ${k === N ? `<div class="kbn-done"><i data-lucide="check-circle-2"></i><span>Network complete: ${N} nodes, ${n.vars.reduce((s, y) => s + y.parents.length, 0)} edges. Each node is independent of its non-descendants given its parents — that is what lets the joint factor into small CPTs.</span></div>` : ''}`;
    }
    ctrlHost.innerHTML = `
      <div class="kbu kbn-controls">
        ${exTabs()}
        <div class="kbu-problem">
          <div class="kbu-problem-head"><span class="kbu-problem-title">${n.title}</span></div>
          <p>${n.story}</p>
          <div class="kbu-vars">${n.vars.map(y => `<span title="${y.desc}"><b>${y.a}</b> = ${y.v}</span>`).join('')}</div>
        </div>
        <div class="kbn-steppanel">
          <div class="kbn-step-head">
            <span>Construction · step ${k} of ${N}</span>
            <span class="kbn-dots">${n.vars.map((y, i) => `<i class="${i < k ? 'on' : ''}"></i>`).join('')}</span>
          </div>
          ${body}
        </div>
        <div class="kbu-actions">
          <button class="klt-btn" id="kbn-reset"><i data-lucide="rotate-ccw"></i> Reset</button>
          <button class="klt-btn" id="kbn-back" ${k === 0 ? 'disabled' : ''}><i data-lucide="chevron-left"></i> Back</button>
          <button class="klt-btn klt-btn-primary" id="kbn-next" ${k === N ? 'disabled' : ''}>Next Step <i data-lucide="chevron-right"></i></button>
          <button class="klt-btn" id="kbn-sol">${k === N ? '<i data-lucide="eye-off"></i> Hide Solution' : '<i data-lucide="eye"></i> Show Solution'}</button>
        </div>
      </div>`;
    bindExTabs();
    const go = s => { st.step = s; st.selected = s > 0 ? n.vars[s - 1].v : null; draw(); };
    ctrlHost.querySelector('#kbn-reset').addEventListener('click', () => go(0));
    ctrlHost.querySelector('#kbn-back').addEventListener('click', () => go(Math.max(0, k - 1)));
    ctrlHost.querySelector('#kbn-next').addEventListener('click', () => go(Math.min(N, k + 1)));
    ctrlHost.querySelector('#kbn-sol').addEventListener('click', () => go(k === N ? 0 : N));
  }

  function buildRight() {
    const n = net();
    vizHost.innerHTML = `
      <div class="kbu kbn">
        <div class="klt-head">
          <div class="klt-head-title"><i data-lucide="${n.icon}"></i> ${n.name} Network · construction</div>
          <span class="klt-tag info" id="kbn-count"></span>
        </div>
        <div class="kbn-graph" id="kbn-dag"></div>
        <div class="kbn-legend">
          <span><i class="lg new"></i>just added</span>
          <span><i class="lg added"></i>in network</span>
          <span><i class="lg ghost"></i>not yet added</span>
          <span><i class="lg sel"></i>CPT shown</span>
          <span class="klt-muted">click a node to view its CPT</span>
        </div>
        <div class="kbn-factor" id="kbn-factor"></div>
        <section class="klt-panel kbu-panel kbn-cpt-panel" id="kbn-cpt"></section>
      </div>`;
  }

  function refreshBuild(keepEditor) {
    const n = net(), st = build[netIdx], k = st.step, N = n.vars.length;
    const added = new Set(n.vars.slice(0, k).map(x => x.v));
    const newest = k > 0 ? n.vars[k - 1].v : null;
    if (st.selected && !added.has(st.selected)) st.selected = newest;

    document.getElementById('kbn-count').textContent = `${k} / ${N} nodes`;
    const dagHost = document.getElementById('kbn-dag');
    dagHost.innerHTML = dagSvg(n, {
      selected: st.selected,
      visible: v => added.has(v),
      cls: v => (v === newest ? 'new' : added.has(v) ? 'added' : ''),
      sub: v => `P(${n.byName[v].a.toLowerCase()}) = ${f4(prob(n, v, {}))}`,
      bar: v => prob(n, v, {}),
      edge: (p, c) => (c === newest ? 'new' : '')
    }) + (k === 0 ? '<div class="kbn-empty">Press <b>Next Step</b> to add the first node.</div>' : '');
    bindDag(dagHost, v => { st.selected = v; refreshBuild(false); icons(); });

    const params = n.vars.slice(0, k).reduce((s, x) => s + 2 ** x.parents.length, 0);
    const full = 2 ** N - 1;
    const factors = n.vars.map((x, i) => `<span class="${i < k ? (x.v === newest ? 'f-new' : 'f-on') : 'f-off'}">${cptLabel(x)}</span>`).join(' ');
    document.getElementById('kbn-factor').innerHTML = `
      <div><b>Chain rule for Bayesian networks:</b> P(${n.vars.map(x => x.a).join(', ')}) = ${factors}</div>
      <div class="kbn-factor-sub">${k === N
        ? `Complete: <b>${params}</b> CPT numbers instead of <b>${full}</b> for the full joint table (2<sup>${N}</sup> − 1).`
        : `Numbers stored so far: <b>${params}</b> · full joint table would need ${full}.`} Marginal P(X = T) under each node is computed from the CPTs and updates as you edit them.</div>`;

    const cptHost = document.getElementById('kbn-cpt');
    if (!keepEditor) {
      if (!st.selected) {
        cptHost.innerHTML = '<div class="kbn-cpt-empty">The CPT of the selected node appears here.</div>';
      } else {
        cptHost.innerHTML = cptEditor(n, st.selected);
        bindCpt(cptHost, n, st.selected, () => refreshBuild(true));
      }
    }
  }

  // ===========================================================================
  // 2. INFERENCE & GRAPH EXPLORATION
  // ===========================================================================
  function roles(n, s) {
    const rel = ancestors(n, [s.query].concat(Object.keys(s.evidence)));
    const r = {};
    n.vars.forEach(x => {
      if (x.v === s.query) r[x.v] = 'query';
      else if (x.v in s.evidence) r[x.v] = 'evidence';
      else r[x.v] = rel.has(x.v) ? 'hidden' : 'irrelevant';
    });
    return { r, rel };
  }

  function evStr(n, ev) {
    const ks = n.vars.filter(x => x.v in ev);
    return ks.length ? ks.map(x => lit(x, ev[x.v])).join(', ') : '';
  }
  const condQ = (n, s) => `P(${n.byName[s.query].a}${Object.keys(s.evidence).length ? ' | ' + evStr(n, s.evidence) : ''})`;

  // Symbolic factor: query in capitals, evidence as literal, hidden in lower case
  function sym(n, s, v) {
    const x = n.byName[v];
    if (v === s.query) return x.a;
    if (v in s.evidence) return lit(x, s.evidence[v]);
    return x.a.toLowerCase();
  }
  const factorSym = (n, s, x) => `P(${sym(n, s, x.v)}${x.parents.length ? ' | ' + x.parents.map(p => sym(n, s, p)).join(', ') : ''})`;

  function stepsFor(n, s) {
    const Q = n.byName[s.query];
    const en = enumerate(n, s.query, s.evidence);
    const prior = prob(n, s.query, {});
    const evNames = n.vars.filter(x => x.v in s.evidence);
    const hid = en.hidden.map(v => n.byName[v]);
    const { r } = roles(n, s);
    const irr = hid.filter(x => r[x.v] === 'irrelevant');
    const sumSym = hid.map(x => `Σ<sub>${x.a.toLowerCase()}</sub>`).join(' ');
    const allArgs = [Q.a].concat(evNames.map(x => lit(x, s.evidence[x.v]))).concat(hid.map(x => x.a.toLowerCase())).join(', ');
    const product = n.vars.map(x => factorSym(n, s, x)).join(' ');

    const table = qv => {
      const rows = en.tables[qv ? 'T' : 'F'];
      const head = hid.length ? hid.map(x => `<th>${x.a.toLowerCase()}</th>`).join('') : '<th>—</th>';
      const body = rows.map(row => `
        <tr>
          ${hid.length ? hid.map(x => `<td class="kbn-tf ${row.as[x.v] ? 't' : 'f'}">${tf(row.as[x.v])}</td>`).join('') : '<td>—</td>'}
          <td class="kbn-mono">${row.factors.map(f => fp(f.p)).join(' × ')}</td>
          <td class="kbn-mono"><b>${fp(row.prod)}</b></td>
        </tr>`).join('');
      return `
        <div class="kbn-math">${n.vars.map(x => factorSym(n, s, x)).join(' · ').replace(new RegExp(`\\b${Q.a}\\b`, 'g'), lit(Q, qv))}</div>
        <div class="kbn-enum-wrap"><table class="kbn-enum">
          <thead><tr>${head}<th>${n.vars.map(x => x.a).join(' × ')} factors</th><th>product</th></tr></thead>
          <tbody>${body}</tbody>
          <tfoot><tr><td colspan="${Math.max(1, hid.length) + 1}">Σ = P(${lit(Q, qv)}${evNames.length ? ', ' + evStr(n, s.evidence) : ''})</td><td class="kbn-mono"><b class="${qv ? 'kbn-c-q' : ''}">${fp(en.sums[qv ? 'T' : 'F'])}</b></td></tr></tfoot>
        </table></div>`;
    };

    const ratio = prior > 0 ? en.post / prior : NaN;
    return {
      en, prior,
      steps: [
        {
          title: 'Identify query, evidence and hidden variables',
          html: `<div class="kbn-math">Query X = ${Q.v} &nbsp;·&nbsp; Evidence = {${evStr(n, s.evidence) || '∅'}} &nbsp;·&nbsp; Hidden Y = {${hid.map(x => x.v).join(', ') || '∅'}}</div>`,
          explain: `Every variable is the <b>query</b>, observed <b>evidence</b>, or <b>hidden</b>. Enumeration has to sum over all values of the hidden variables.${irr.length ? ` ${irr.map(x => x.v).join(', ')} ${irr.length > 1 ? 'are' : 'is'} not an ancestor of the query or evidence, so ${irr.length > 1 ? 'they sum' : 'it sums'} to 1 and could be pruned — we keep ${irr.length > 1 ? 'them' : 'it'} to show the full method.` : ''}`
        },
        {
          title: 'Write the query as a sum over hidden variables',
          html: `<div class="kbn-math">${condQ(n, s).replace('P(' + Q.a, 'P(' + Q.a)} = α P(${[Q.a].concat(evNames.map(x => lit(x, s.evidence[x.v]))).join(', ')})${hid.length ? ` = α ${sumSym} P(${allArgs})` : ''}</div>`,
          explain: `By the definition of conditional probability, P(X | e) = P(X, e) / P(e) = α P(X, e). The joint P(X, e) is obtained by <b>summing out</b> the hidden variables: P(X, e) = Σ<sub>y</sub> P(X, e, y).`
        },
        {
          title: 'Factor the joint with the network (chain rule)',
          html: `<div class="kbn-math">P(${allArgs}) = ${product}</div>`,
          explain: `Each term is one CPT entry: P(x₁…xₙ) = ∏ P(xᵢ | parents(Xᵢ)). The highlighted edges in the graph are exactly the parent → child links used by these factors.`
        },
        {
          title: `Sum out hidden variables for ${Q.v} = true`,
          html: table(true),
          explain: `For each of the 2<sup>${hid.length}</sup> = ${2 ** hid.length} combinations of hidden values, look up the CPT entries, multiply them, then add the products: P(${lit(Q, true)}${evNames.length ? ', ' + evStr(n, s.evidence) : ''}) = <b>${fp(en.sums.T)}</b>.`
        },
        {
          title: `Sum out hidden variables for ${Q.v} = false`,
          html: table(false),
          explain: `Repeat with ${Q.v} = false: P(${lit(Q, false)}${evNames.length ? ', ' + evStr(n, s.evidence) : ''}) = <b>${fp(en.sums.F)}</b>.`
        },
        {
          title: 'Normalize',
          html: en.Z > 0
            ? `<div class="kbn-math">α = 1 / (${fp(en.sums.T)} + ${fp(en.sums.F)}) = 1 / ${fp(en.Z)}<br>${condQ(n, s)} = α ⟨${fp(en.sums.T)}, ${fp(en.sums.F)}⟩ = <b class="kbn-c-q">⟨${f4(en.post)}, ${f4(1 - en.post)}⟩</b></div>`
            : `<div class="kbn-math">P(evidence) = 0 — this evidence is impossible under the current CPTs, so the posterior is undefined.</div>`,
          explain: `The two sums add up to P(evidence) = ${fp(en.Z)}. Dividing by it (α = 1 / P(evidence)) makes the answer a distribution that sums to 1: ${condQ(n, s).replace('P(' + Q.a, 'P(' + lit(Q, true))} = <b>${pct(en.post)}</b>.`
        },
        {
          title: 'Compare prior and posterior',
          html: `<div class="kbn-math">Prior P(${lit(Q, true)}) = ${f4(prior)} &nbsp;→&nbsp; Posterior ${condQ(n, s).replace('P(' + Q.a, 'P(' + lit(Q, true))} = <b class="kbn-c-q">${f4(en.post)}</b></div>`,
          explain: !evNames.length
            ? 'With no evidence the posterior equals the prior — the agent has learned nothing new.'
            : !Number.isFinite(en.post) ? 'The evidence is impossible under the current CPTs.'
            : `The evidence ${en.post > prior ? 'raised' : en.post < prior ? 'lowered' : 'did not change'} the belief in ${Q.v}${Number.isFinite(ratio) && Math.abs(ratio - 1) > 0.005 ? ` by a factor of <b>${ratio >= 10 ? ratio.toFixed(0) : ratio.toFixed(2)}</b>` : ''}: ${pct(prior)} → <b>${pct(en.post)}</b>. Influence flows along the highlighted edges from the evidence nodes to the query.`
        }
      ]
    };
  }

  function inferLeft() {
    const n = net(), s = infer[netIdx];
    const res = stepsFor(n, s);
    const cur = s.steps > 0 ? res.steps[s.steps - 1] : null;
    ctrlHost.innerHTML = `
      <div class="kbu kbn-controls">
        ${exTabs()}
        <div class="kbu-problem">
          <div class="kbu-problem-head"><span class="kbu-problem-title">${n.title}</span></div>
          <p>${n.short}</p>
          <p class="kbn-try"><i data-lucide="lightbulb"></i> ${n.tryIt}</p>
        </div>
        <div class="kbn-evi">
          <label class="kbn-query"><span>Query variable</span>
            <select class="klt-select" id="kbn-query">
              ${n.vars.map(x => `<option value="${x.v}" ${x.v === s.query ? 'selected' : ''}>${x.v} (${x.a})</option>`).join('')}
            </select>
          </label>
          <div class="kbn-evi-label">Observed evidence</div>
          <div class="kbn-evi-grid">
            ${n.vars.map(x => {
              const isQ = x.v === s.query;
              const val = x.v in s.evidence ? tf(s.evidence[x.v]) : '?';
              return `
                <div class="kbn-evi-row ${isQ ? 'is-q' : ''}">
                  <span>${x.v}</span>
                  ${isQ ? '<em>query</em>' : `<span class="kbn-seg" role="group" aria-label="${x.v} evidence">
                    ${['?', 'T', 'F'].map(o => `<button class="${val === o ? 'on ' + o.toLowerCase().replace('?', 'u') : ''}" data-ev="${x.v}" data-val="${o}" aria-pressed="${val === o}" title="${o === '?' ? 'not observed' : o === 'T' ? 'observed true' : 'observed false'}">${o === '?' ? '–' : o}</button>`).join('')}
                  </span>`}
                </div>`;
            }).join('')}
          </div>
        </div>
        <div class="kbu-actions">
          <button class="klt-btn" id="kbn-reset"><i data-lucide="rotate-ccw"></i> Reset</button>
          <button class="klt-btn klt-btn-primary" id="kbn-next" ${s.steps >= NSTEPS ? 'disabled' : ''}>Next Step <i data-lucide="chevron-right"></i></button>
          <button class="klt-btn" id="kbn-sol">${s.steps >= NSTEPS ? '<i data-lucide="eye-off"></i> Hide Solution' : '<i data-lucide="eye"></i> Show Solution'}</button>
          <span class="klt-tag info kbn-stepcount">step ${s.steps} / ${NSTEPS}</span>
        </div>
        <div class="klt-note kbn-whats">
          <div class="klt-note-title">${cur ? `Step ${s.steps}: ${cur.title}` : 'What’s happening?'}</div>
          <div class="kbn-whats-body">${cur ? cur.explain : `Set the evidence, then press <b>Next Step</b> to run <b>ENUMERATION-ASK</b> one step at a time, or <b>Show Solution</b> to see every step. Click any node to view and edit its CPT.`}</div>
        </div>
      </div>`;
    bindExTabs();
    ctrlHost.querySelector('#kbn-query').addEventListener('change', e => {
      s.query = e.target.value;
      delete s.evidence[s.query];
      draw();
    });
    ctrlHost.querySelectorAll('[data-ev]').forEach(b => b.addEventListener('click', () => {
      const v = b.dataset.ev, o = b.dataset.val;
      if (o === '?') delete s.evidence[v]; else s.evidence[v] = o === 'T';
      draw();
    }));
    ctrlHost.querySelector('#kbn-reset').addEventListener('click', () => {
      s.query = n.query; s.evidence = Object.assign({}, n.evidence); s.steps = 0; s.view = 'chart'; s.selected = null;
      draw();
    });
    ctrlHost.querySelector('#kbn-next').addEventListener('click', () => {
      s.steps = Math.min(NSTEPS, s.steps + 1); s.view = 'enum'; draw();
    });
    ctrlHost.querySelector('#kbn-sol').addEventListener('click', () => {
      if (s.steps >= NSTEPS) { s.steps = 0; if (s.view === 'enum') s.view = 'chart'; } else { s.steps = NSTEPS; s.view = 'enum'; }
      draw();
    });
  }

  function inferRight() {
    const n = net();
    vizHost.innerHTML = `
      <div class="kbu kbn">
        <div class="klt-head">
          <div class="klt-head-title"><i data-lucide="${n.icon}"></i> <span id="kbn-title"></span></div>
          <span class="klt-tag info">updates live</span>
        </div>
        <div id="kbn-summary"></div>
        <div class="kbn-graph" id="kbn-dag"></div>
        <div class="kbn-legend">
          <span><i class="lg query"></i>query</span>
          <span><i class="lg evidence"></i>evidence</span>
          <span><i class="lg hidden"></i>hidden</span>
          <span><i class="lg irrelevant"></i>hidden, irrelevant</span>
          <span><i class="lg edge"></i>relevant dependency</span>
        </div>
        <div class="kbu-view-tabs" id="kbn-tabs" role="tablist"></div>
        <section class="klt-panel kbu-panel" id="kbn-panel"></section>
      </div>`;
  }

  function refreshInfer(keepEditor) {
    const n = net(), s = infer[netIdx];
    const res = stepsFor(n, s);
    const { r, rel } = roles(n, s);
    const prior = res.prior, post = res.en.post;
    const Q = n.byName[s.query];
    const latest = s.steps;           // 1-based index of the newest revealed step

    document.getElementById('kbn-title').textContent = `${n.name} · ${condQ(n, s)}`;

    const shift = (post - prior) * 100;
    document.getElementById('kbn-summary').innerHTML = `
      <div class="kbu-belief kbn-belief">
        <div class="kbu-belief-box prior"><span>Prior · no evidence</span><b>${pct(prior)}</b><small>P(${lit(Q, true)})</small></div>
        <div class="kbu-belief-arrow"><span>observe ${evStr(n, s.evidence) || 'nothing'}</span><i data-lucide="arrow-right"></i>
          <small class="${shift >= 0 ? 'up' : 'down'}">${Number.isFinite(shift) ? (shift >= 0 ? '+' : '−') + Math.abs(shift).toFixed(1) + ' pts' : '—'}</small></div>
        <div class="kbu-belief-box post"><span>Posterior</span><b>${pct(post)}</b><small>${condQ(n, s).replace('P(' + Q.a, 'P(' + lit(Q, true))}</small></div>
      </div>`;

    const dagHost = document.getElementById('kbn-dag');
    const allEdges = latest === 3;
    const qBadge = latest === 4 ? 'T' : latest === 5 ? 'F' : null;
    dagHost.innerHTML = dagSvg(n, {
      selected: s.view === 'cpt' ? s.selected : null,
      visible: () => true,
      cls: v => r[v],
      sub: v => (r[v] === 'evidence' ? `observed = ${tf(s.evidence[v])}` : `P(${n.byName[v].a.toLowerCase()} | obs) = ${f4(prob(n, v, s.evidence))}`),
      bar: v => (r[v] === 'evidence' ? null : prob(n, v, s.evidence)),
      badge: v => (r[v] === 'evidence' ? tf(s.evidence[v]) : v === s.query ? qBadge : null),
      edge: (p, c) => (allEdges || (rel.has(p) && rel.has(c)) ? 'hi' : 'dim')
    });
    bindDag(dagHost, v => { s.selected = v; s.view = 'cpt'; refreshInfer(false); icons(); });

    // View tabs
    const tabs = [{ id: 'chart', name: 'Prior vs Posterior', icon: 'bar-chart-3' },
      { id: 'cpt', name: s.selected ? `CPT · ${s.selected}` : 'CPT (click a node)', icon: 'table' }];
    if (s.steps > 0) tabs.push({ id: 'enum', name: `Enumeration · ${s.steps}/${NSTEPS}`, icon: 'list-ordered' });
    if (s.view === 'enum' && s.steps === 0) s.view = 'chart';
    if (s.view === 'cpt' && !s.selected) s.selected = s.query;
    const th = document.getElementById('kbn-tabs');
    th.innerHTML = tabs.map(t => `<button class="kbu-view-tab ${t.id === s.view ? 'active' : ''} ${t.id === 'enum' ? 'sol' : ''}" data-view="${t.id}" role="tab" aria-selected="${t.id === s.view}"><i data-lucide="${t.icon}"></i> ${t.name}</button>`).join('');
    th.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => {
      s.view = b.dataset.view;
      if (s.view === 'cpt' && !s.selected) s.selected = s.query;
      refreshInfer(false); icons();
    }));

    const panel = document.getElementById('kbn-panel');
    if (s.view === 'chart') {
      const rows = n.vars.filter(x => !(x.v in s.evidence)).map(x => {
        const p0 = prob(n, x.v, {}), p1 = prob(n, x.v, s.evidence);
        return `
          <div class="kbn-pp ${x.v === s.query ? 'is-q' : ''}">
            <span class="kbn-pp-name">${x.v}${x.v === s.query ? ' <em>query</em>' : ''}</span>
            <div class="kbn-pp-bars">
              <div class="kbn-pp-row"><span class="kbu-bar-track"><span class="kbu-bar-fill prior" style="width:${Math.max(0.4, p0 * 100)}%"></span></span><b>${pct(p0)}</b></div>
              <div class="kbn-pp-row"><span class="kbu-bar-track"><span class="kbu-bar-fill post" style="width:${Math.max(0.4, (p1 || 0) * 100)}%"></span></span><b class="post">${pct(p1)}</b></div>
            </div>
          </div>`;
      }).join('');
      panel.innerHTML = `
        <div class="kbn-pp-legend"><span><i class="lg prior"></i>prior P(X = T)</span><span><i class="lg post"></i>posterior P(X = T | ${evStr(n, s.evidence) || '∅'})</span></div>
        <div class="kbn-pp-list kbn-scroll">${rows}</div>
        <div class="kbu-panel-foot">Every unobserved variable is updated, not just the query — evidence propagates through the network in both directions (causal and diagnostic).</div>`;
    } else if (s.view === 'cpt') {
      if (!keepEditor) {
        panel.innerHTML = `<div class="kbn-cpt-in">${cptEditor(n, s.selected)}</div>`;
        bindCpt(panel, n, s.selected, () => { refreshInfer(true); refreshLeftNumbers(); });
      }
    } else {
      panel.innerHTML = `<div class="kbn-scroll">
        <ol class="kbn-steps">
          ${res.steps.slice(0, s.steps).map((st, i) => `
            <li class="${i === s.steps - 1 ? 'latest' : ''}">
              <div class="kbu-step-name">${st.title}</div>
              ${st.html}
            </li>`).join('')}
        </ol>
        ${s.steps < NSTEPS ? `<div class="kbn-more">Press <b>Next Step</b> for step ${s.steps + 1} of ${NSTEPS}.</div>` : `<div class="kbu-sol-answer"><b>Answer:</b> ${condQ(n, s).replace('P(' + Q.a, 'P(' + lit(Q, true))} = <b>${f4(post)}</b> (${pct(post)}), up from the prior ${pct(prior)}.</div>`.replace('up from', post >= prior ? 'up from' : 'down from')}</div>`;
      const sc = panel.querySelector('.kbn-scroll');
      const latestEl = panel.querySelector('li.latest');
      if (sc && latestEl && s.steps > 1) sc.scrollTop = Math.max(0, latestEl.offsetTop - 8);
    }
  }

  // After a CPT edit the explanation text on the left contains numbers — refresh just that block.
  function refreshLeftNumbers() {
    const n = net(), s = infer[netIdx];
    if (!s.steps) return;
    const cur = stepsFor(n, s).steps[s.steps - 1];
    const body = ctrlHost && ctrlHost.querySelector('.kbn-whats-body');
    if (body) body.innerHTML = cur.explain;
  }

  // ---------------------------------------------------------------------------
  // Entry points
  // ---------------------------------------------------------------------------
  function draw() {
    if (!vizHost) return;
    ctrlHost = document.getElementById('kl-concept-lab');
    if (!ctrlHost) {
      ctrlHost = document.createElement('div');
      vizHost.innerHTML = '';
      vizHost.appendChild(ctrlHost);
      const v = document.createElement('div');
      vizHost.appendChild(v);
      const keep = vizHost; vizHost = v;
      draw2();
      vizHost = keep;
      return;
    }
    draw2();
  }
  function draw2() {
    if (mode === 'build') { buildLeft(); buildRight(); refreshBuild(false); }
    else { inferLeft(); inferRight(); refreshInfer(false); }
    icons();
  }

  function renderConstruction(col) { mode = 'build'; vizHost = col; draw(); }
  function renderInference(col) { mode = 'infer'; vizHost = col; draw(); }

  window.BNLab = {
    renderConstruction, renderInference,
    prob: (id, X, ev) => prob(NETS.find(n => n.id === id), X, ev || {}),
    enumerate: (id, Q, ev) => enumerate(NETS.find(n => n.id === id), Q, ev || {}),
    _cpts: cpts
  };
})();
