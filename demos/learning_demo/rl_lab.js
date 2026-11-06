/**
 * Interactive RL Labs on the shared Grid World (Topics 07 & 08)
 *
 *   'bellman' — Bellman Optimality backup: pick a state, see all four Q*(s,a)
 *               candidates, the backup tree and the max that gives V*(s).
 *   'vi'      — Value Iteration: synchronous sweeps V_{k+1}(s) = max_a Σ P[R + γ V_k(s′)],
 *               Δ_k convergence chart, greedy policy extraction at every k.
 *   'td'      — Temporal Difference: drive the agent by hand; each real transition
 *               produces one TD update shown on a number line (old → target → new).
 *   'qlearn'  — Tabular Q-Learning vs SARSA with ε-greedy exploration: run episodes,
 *               watch the Q-table, returns and agreement with π*.
 *
 * Reuses window.MDPLab.kit (mdp_lab.js) so the environment, drawing and the
 * γ / noise / living-reward settings are identical to the Topic 06 demos.
 * The TD and Q-learning tabs share one learner (one Q-table) so learning carries over.
 *
 * Public API: window.RLLab.render(container, 'bellman' | 'vi' | 'td' | 'qlearn')
 */
(function () {
  'use strict';

  const M = window.MDPLab;
  if (!M || !M.kit) { console.warn('rl_lab.js needs mdp_lab.js loaded first'); return; }
  const K = M.kit, S = K.S;
  const { f, fs, sup, ACTS, NONTERM, STATES, CELLS, GOAL, PIT, START, isWall, isTerm, L, cx, cy, x0, y0, CELL, SZ } = K;

  let root = null, view = 'bellman', timer = 0;
  const $ = id => root.querySelector('#' + id);
  const envKey = () => [S.gamma, S.slip, S.step].join('|');
  const argmax = arr => { const mx = Math.max(...arr); return arr.findIndex(v => v >= mx - 1e-9); };

  // ------------------------------------------------------------ exact solution (for reference)
  let starCache = null;
  function star() {
    const k = envKey();
    if (!starCache || starCache.k !== k) {
      const r = K.valueIteration(), Q = {};
      NONTERM.forEach(s => { Q[s] = ACTS.map((_, a) => K.qFrom(r.V, s, a)); });
      starCache = { k, V: r.V, pi: r.pi, Q };
    }
    return starCache;
  }

  function setMsg(kind, tag, html) {
    const m = $('rll-msg'); if (!m) return;
    m.className = `tfp-msg mdl-msg ${kind}`;
    m.innerHTML = `<span class="tfp-msg-tag">${tag}</span><span>${html}</span>`;
  }
  function stopTimer() { clearInterval(timer); timer = 0; VI.auto = false; LQ.auto = false; }
  const alive = () => root && document.body.contains(root);

  // ------------------------------------------------------------ shared drawing helpers
  function plainCell(s, fill, inner) {
    if (isWall(s)) return K.furniture(s);
    if (isTerm(s)) return K.cellBase(s, K.termFill(s)) + K.furniture(s, { termNote: true });
    let h = K.cellBase(s, fill) + (inner || '');
    h += `<text x="${x0(s) + 6}" y="${y0(s) + 14}" class="mdl-coord">(${s})</text>`;
    if (s === START) h += `<text x="${x0(s) + CELL - 6}" y="${y0(s) + CELL - 7}" class="mdl-start-t">start</text>`;
    return h;
  }
  function qCell(s, q, m, o = {}) {
    let h = '';
    ACTS.forEach((_, a) => { h += `<polygon points="${K.wedgePts(s, a)}" fill="${K.vColor(q[a], m)}" class="mdl-wedge" data-cell="${s}" data-qa="${a}"/>`; });
    ACTS.forEach((_, a) => { const [tx, ty] = K.wedgeText(s, a); h += `<text x="${tx}" y="${ty}" class="mdl-qtxt ${o.best === a ? 'best' : ''}">${f(q[a], 2)}</text>`; });
    return h;
  }
  const wedgeOl = (s, a, cls) => `<polygon points="${K.wedgePts(s, a)}" class="mdl-wedge-ol ${cls}"/>`;
  const outlineCell = (s, cls) => `<rect x="${x0(s) + 2}" y="${y0(s) + 2}" width="${CELL - 4}" height="${CELL - 4}" rx="8" class="${cls}"/>`;
  const calcHl = s => `<rect x="${x0(s) + 5}" y="${y0(s) + 5}" width="${CELL - 10}" height="${CELL - 10}" rx="6" class="mdl-calc-hl"/>`;
  const svgOpen = (id, label) => `<svg viewBox="0 0 ${SZ} ${SZ}" class="mdl-svg" id="${id}" role="img" aria-label="${label}">${K.defs()}`;

  function sliderHTML(key, lbl, min, max, step, val) {
    return `<label class="mdl-set"><span>${lbl}</span><input type="range" min="${min}" max="${max}" step="${step}" value="${val}" data-rl="${key}" aria-label="${lbl}"><b data-rlval="${key}">${(+val).toFixed(2)}</b></label>`;
  }

  /** Small line chart: series = [{pts:[[x,y]], cls, dots}], opts {log, hl:[{y,cls,lbl}], w, h, ylbl} */
  function lineChart(series, o = {}) {
    const w = o.w || 300, h = o.h || 110, pl = 40, pr = 8, pt = 8, pb = 18;
    const all = series.flatMap(s => s.pts);
    if (!all.length) return `<div class="tfp-hint">${o.empty || 'No data yet.'}</div>`;
    const tf = v => (o.log ? Math.log10(Math.max(v, 1e-6)) : v);
    const ys = all.map(p => tf(p[1])).concat((o.hl || []).map(l => tf(l.y)));
    let lo = o.ymin !== undefined ? tf(o.ymin) : Math.min(...ys), hi = o.ymax !== undefined ? tf(o.ymax) : Math.max(...ys);
    if (hi - lo < 1e-9) { hi += 0.5; lo -= 0.5; }
    const pad = (hi - lo) * 0.08; lo -= o.ymin !== undefined ? 0 : pad; hi += pad;
    const xs = all.map(p => p[0]), xl = Math.min(...xs), xh = Math.max(xl + 1, ...xs);
    const X = x => pl + (x - xl) / (xh - xl) * (w - pl - pr), Y = v => pt + (1 - (tf(v) - lo) / (hi - lo)) * (h - pt - pb);
    const lbl = v => (o.log ? '10' + (Math.round(v) < 0 ? '⁻' : '') + sup(Math.abs(Math.round(v))) : f(v, Math.abs(v) < 1 ? 2 : 1));
    let s = `<svg viewBox="0 0 ${w} ${h}" class="rll-chart">`;
    const ticks = o.log ? [...Array(Math.floor(hi) - Math.ceil(lo) + 1).keys()].map(i => Math.ceil(lo) + i).filter((_, i, a) => a.length < 6 || i % 2 === 0) : [lo + pad, (lo + hi) / 2, hi - pad];
    ticks.forEach(t => {
      const y = pt + (1 - (t - lo) / (hi - lo)) * (h - pt - pb);
      s += `<line x1="${pl}" x2="${w - pr}" y1="${y}" y2="${y}" class="rll-grid"/><text x="${pl - 4}" y="${y + 3}" class="rll-tick" text-anchor="end">${o.log ? lbl(t) : f(t, Math.abs(t) < 1 ? 2 : 1)}</text>`;
    });
    if (!o.log && lo < 0 && hi > 0) s += `<line x1="${pl}" x2="${w - pr}" y1="${Y(0)}" y2="${Y(0)}" class="rll-zero"/>`;
    (o.hl || []).forEach(l => { s += `<line x1="${pl}" x2="${w - pr}" y1="${Y(l.y)}" y2="${Y(l.y)}" class="rll-hl ${l.cls || ''}"/><text x="${w - pr - 2}" y="${Y(l.y) - 3}" class="rll-tick ${l.cls || ''}" text-anchor="end">${l.lbl}</text>`; });
    series.forEach(se => {
      if (se.pts.length > 1 && !se.noline) s += `<polyline points="${se.pts.map(p => X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1)).join(' ')}" class="rll-line ${se.cls || ''}"/>`;
      if (se.dots) se.pts.forEach(p => { s += `<circle cx="${X(p[0]).toFixed(1)}" cy="${Y(p[1]).toFixed(1)}" r="${se.r || 2.4}" class="rll-dot ${se.cls || ''}"/>`; });
    });
    s += `<text x="${pl}" y="${h - 4}" class="rll-tick">${xl}</text><text x="${w - pr}" y="${h - 4}" class="rll-tick" text-anchor="end">${xh}${o.xlbl ? ' ' + o.xlbl : ''}</text>`;
    return s + '</svg>';
  }

  // ================================================================== 7A · Bellman optimality backup
  const B = { sel: '3,4', selA: null, stepMode: false, calcK: 1, showPi: true };

  function bellmanLines() {
    const { V, Q, pi } = star(), s = B.sel, g = S.gamma.toFixed(2);
    const ba = argmax(Q[s]), lines = [];
    lines.push({ k: 'Bellman', cells: [s], html: `V*(s) = max<sub>a</sub> Σ<sub>s′</sub> <span class="c-p">P(s′|s,a)</span> [ <span class="c-r">R(s,a,s′)</span> + <span class="c-g">γ</span> V*(s′) ] &nbsp; at s = ${L(s)}` });
    ACTS.forEach((A, a) => {
      const outs = K.merged(s, a);
      const terms = outs.map(o => `<span class="c-p">${o.p.toFixed(2)}</span>×[<span class="c-r">${fs(o.r)}</span> + <span class="c-g">${g}</span>×${isTerm(o.s2) ? '0' : f(V[o.s2], 2)}]`).join(' + ');
      lines.push({ k: `a = ${A.g}`, cls: a === ba ? 'bestl' : '', cells: outs.map(o => o.s2), a, html: `Q*(s,${A.g}) = ${terms} = <b>${f(Q[s][a], 3)}</b>${a === ba ? ' ★' : ''}` });
    });
    lines.push({ k: 'max', cls: 'total', cells: [], html: `V*(${L(s)}) = max{ ${Q[s].map(v => f(v, 3)).join(', ')} } = <b>${f(Q[s][ba], 3)}</b>` });
    lines.push({ k: 'argmax', cls: 'imm', cells: [], html: `π*(${L(s)}) = argmax<sub>a</sub> Q*(s,a) = <b>${ACTS[ba].g} ${ACTS[ba].n}</b>${pi[s] !== ba ? ' (tie)' : ''}` });
    lines.push({ k: 'check', cls: 'fut', cells: [], html: `value iteration gave V*(s) = ${f(V[s], 3)} → both sides agree (|diff| = ${Math.abs(V[s] - Q[s][ba]).toExponential(1)}). V* is a <i>fixed point</i> of the backup.` });
    return lines;
  }

  function bellmanTree() {
    const { V, Q } = star(), s = B.sel, ba = argmax(Q[s]);
    const w = 640, h = 230, gw = w / 4;
    let t = `<svg viewBox="0 0 ${w} ${h}" class="rll-tree">`;
    const rx = w / 2, ry = 30;
    ACTS.forEach((A, a) => {
      const ax = gw * a + gw / 2, ay = 108, hot = a === ba, sel = a === B.selA;
      t += `<line x1="${rx}" y1="${ry + 14}" x2="${ax}" y2="${ay - 16}" class="rll-edge ${hot ? 'best' : ''} ${sel ? 'sel' : ''}"/>`;
      const outs = K.merged(s, a), n = outs.length;
      outs.forEach((o, i) => {
        const lx = ax + (i - (n - 1) / 2) * 46, ly = 186;
        t += `<line x1="${ax}" y1="${ay + 16}" x2="${lx}" y2="${ly - 14}" class="rll-edge thin ${hot ? 'best' : ''}"/>`;
        t += `<text x="${(ax + lx) / 2 + (i - (n - 1) / 2) * 4}" y="${(ay + ly) / 2 + 4}" class="rll-ep">${o.p.toFixed(1)}</text>`;
        const cls = o.s2 === GOAL ? 'goal' : o.s2 === PIT ? 'pit' : '';
        t += `<rect x="${lx - 17}" y="${ly - 14}" width="34" height="28" rx="5" class="rll-leaf ${cls}"/>`;
        t += `<text x="${lx}" y="${ly - 3}" class="rll-leaf-t">${o.s2 === s ? 'stay' : o.s2}</text><text x="${lx}" y="${ly + 9}" class="rll-leaf-v">${isTerm(o.s2) ? fs(o.r, 0) : f(V[o.s2], 2)}</text>`;
      });
      t += `<g class="rll-anode" data-ta="${a}"><circle cx="${ax}" cy="${ay}" r="17" class="rll-act ${hot ? 'best' : ''} ${sel ? 'sel' : ''}"/>
        <text x="${ax}" y="${ay + 5}" class="rll-act-t">${A.g}</text></g>
        <text x="${ax}" y="${ay - 22}" class="rll-qv ${hot ? 'best' : ''}">${f(Q[s][a], 2)}</text>`;
    });
    t += `<polygon points="${rx},${ry - 16} ${rx + 18},${ry + 14} ${rx - 18},${ry + 14}" class="rll-max"/><text x="${rx}" y="${ry + 9}" class="rll-max-t">max</text>`;
    t += `<text x="${rx + 26}" y="${ry + 4}" class="rll-root-v">V*${L(s)} = ${f(V[s], 3)}</text>`;
    t += `<text x="6" y="${h - 4}" class="rll-tick">leaves: next state s′ · V*(s′) (terminal: reward)</text>`;
    return t + '</svg>';
  }

  function bellmanSVG(hl) {
    const { V, Q, pi } = star(), m = Math.max(0.05, ...NONTERM.map(s => Math.abs(V[s])));
    let h = svgOpen('rll-svg', 'Bellman optimality grid');
    CELLS.forEach(s => {
      if (s === B.sel) { h += plainCell(s, '#fff', '') + qCell(s, Q[s], m, { best: argmax(Q[s]) }); return; }
      if (isWall(s) || isTerm(s)) { h += plainCell(s); return; }
      let inner = `<text x="${cx(s)}" y="${cy(s) + 7}" class="mdl-vtxt">${f(V[s], 2)}</text>`;
      if (B.showPi) inner += K.tri(s, pi[s], 8, 'mdl-pi');
      h += plainCell(s, K.vColor(V[s], m), inner);
    });
    (hl || []).filter(c => c !== B.sel).forEach(c => { h += calcHl(c); });
    h += wedgeOl(B.sel, argmax(Q[B.sel]), 'best');
    if (B.selA !== null) h += wedgeOl(B.sel, B.selA, 'sel');
    h += outlineCell(B.sel, 'mdl-sel-s');
    return h + '</svg>';
  }

  function skelBellman() {
    root.innerHTML = `<div class="tfp-viz mdl-viz rll-viz">
      <div class="tfp-viz-head"><h3><span>Bellman Optimality Backup</span></h3>${K.settingsHTML(true)}</div>
      <div class="tfp-msg mdl-msg" id="rll-msg"></div>
      <div class="mdl-two">
        <div class="tfp-card mdl-gridcard"><div id="rll-grid"></div>
          <div class="mdl-legend"><span><i class="lg-v"></i>V*(s)</span><span><i class="lg-pi"></i>π*(s)</span><span><i class="lg-bestw"></i>selected state: 4 wedges = Q*(s,a), gold = max</span><span>click any state</span></div></div>
        <div class="mdl-side">
          <div class="tfp-card"><div class="tfp-card-head"><h4><span>Candidates Q*(s, a) at <b id="rll-ss"></b></span></h4><span class="tfp-card-sub">click to trace</span></div><div id="rll-rank"></div></div>
          <div class="tfp-card"><div class="mdl-btns two">
            <button class="tfp-btn" data-act="pi" id="rll-pibtn"><i data-lucide="navigation"></i>Show π* arrows</button>
            <button class="tfp-btn" data-act="stepmode" id="rll-stepbtn"><i data-lucide="list-ordered"></i>Step-by-Step</button></div></div>
        </div>
      </div>
      <div class="tfp-card"><div class="tfp-card-head"><h4><span>Backup diagram</span></h4><span class="tfp-card-sub">max node → action nodes → chance outcomes s′ (edge = P) · click an action node</span></div><div id="rll-tree"></div></div>
      <div class="tfp-card"><div class="tfp-card-head"><h4><span>Calculation · one Bellman optimality backup</span></h4><div class="tfp-row" id="rll-cnav"></div></div><div id="rll-calc"></div></div>
    </div>`;
    updBellman();
  }

  function updBellman() {
    const { V, Q } = star(), s = B.sel;
    const lines = bellmanLines();
    let shown = lines;
    if (B.stepMode) { B.calcK = Math.max(1, Math.min(B.calcK, lines.length)); shown = lines.slice(0, B.calcK); }
    let hl = B.stepMode ? shown[shown.length - 1].cells : [];
    if (!B.stepMode && B.selA !== null) hl = lines.find(l => l.a === B.selA).cells;
    $('rll-grid').innerHTML = bellmanSVG(hl);
    $('rll-tree').innerHTML = bellmanTree();
    $('rll-ss').textContent = L(s);
    {
      const qs = Q[s], ba0 = argmax(qs), lo = Math.min(...qs, 0), hi = Math.max(...qs, 0), span = Math.max(1e-6, hi - lo);
      $('rll-rank').innerHTML = [0, 1, 2, 3].sort((p, q) => qs[q] - qs[p]).map(a => {
        const z = (0 - lo) / span * 100, x = (qs[a] - lo) / span * 100;
        return `<div class="rll-rk ${a === ba0 ? 'best' : ''} ${a === B.selA ? 'sel' : ''}" data-ta="${a}"><span class="g">${ACTS[a].g}</span><div class="rll-rk-t"><i style="left:${Math.min(z, x)}%;width:${Math.abs(x - z)}%" class="${qs[a] < 0 ? 'neg' : ''}"></i><em style="left:${z}%"></em></div><b>${f(qs[a], 3)}</b></div>`;
      }).join('') + `<div class="rll-rk-max">V*(s) = max = <b>${f(V[s], 3)}</b> → π*(s) = ${ACTS[ba0].g}</div>`;
    }
    $('rll-pibtn').classList.toggle('on', B.showPi);
    $('rll-stepbtn').classList.toggle('on', B.stepMode);
    $('rll-cnav').innerHTML = B.stepMode
      ? `<span class="tfp-card-sub">line ${B.calcK} / ${lines.length}</span><button class="tfp-btn" data-act="cprev" ${B.calcK <= 1 ? 'disabled' : ''}>◂ Prev</button><button class="tfp-btn primary" data-act="cnext" ${B.calcK >= lines.length ? 'disabled' : ''}>Next ▸</button><button class="tfp-btn ghost" data-act="call">Show all</button>`
      : '<span class="tfp-card-sub">turn on Step-by-Step to reveal one line at a time</span>';
    let detail = '';
    if (B.selA !== null) {
      const a = B.selA;
      detail = `<div class="rll-sub"><b>Expanded: Q*(${L(s)}, ${ACTS[a].g})</b>${K.merged(s, a).map(o => {
        const v = isTerm(o.s2) ? 0 : V[o.s2], inner = o.r + S.gamma * v;
        return `<div class="mdl-cl"><span class="mdl-ck">s′ = ${L(o.s2)}</span><span><span class="mdl-mute">${o.comps.map(c => c.kind + ' ' + ACTS[c.ai].g + (c.bump ? ' (bump)' : '')).join(' + ')}:</span> ${o.p.toFixed(2)} × [ ${fs(o.r)} + ${S.gamma.toFixed(2)} × ${f(v, 3)} ] = <b>${f(o.p * inner, 3)}</b></span></div>`;
      }).join('')}</div>`;
    }
    $('rll-calc').innerHTML = `<div class="mdl-calc">${shown.map((l, i) => `<div class="mdl-cl ${l.cls || ''} ${B.stepMode && i === shown.length - 1 ? 'new' : ''} ${l.a !== undefined ? 'rll-click' : ''}" ${l.a !== undefined ? `data-ta="${l.a}"` : ''}><span class="mdl-ck">${l.k}</span><span>${l.html}</span></div>`).join('')}</div>${detail}`;
    const ba = argmax(Q[s]), second = [...Q[s]].sort((p, q) => q - p)[1];
    let txt = `At <b>${L(s)}</b> the four actions are worth Q* = ${Q[s].map((v, a) => `${ACTS[a].g} ${f(v, 2)}`).join(', ')}. The Bellman optimality equation keeps only the best: <b>V*(s) = max = ${f(V[s], 3)}</b> via <b>${ACTS[ba].g}</b> (runner-up by ${f(Q[s][ba] - second, 3)}).`;
    if (B.selA !== null && B.selA !== ba) txt += ` Choosing ${ACTS[B.selA].g} instead would lose ${f(Q[s][ba] - Q[s][B.selA], 3)} of expected return.`;
    if (s === '4,2') txt += ' Notice how ↑ is terrible here: 80% of the time it drops into the pit.';
    setMsg('v', 'max', txt);
    if (window.lucide) window.lucide.createIcons();
  }

  function clickBellman(e) {
    const ta = e.target.closest('[data-ta]');
    if (ta) { B.selA = B.selA === +ta.dataset.ta ? null : +ta.dataset.ta; updBellman(); return; }
    const c = e.target.closest('[data-cell]');
    if (c && $('rll-grid').contains(c)) {
      const s = c.dataset.cell;
      if (isWall(s) || isTerm(s)) {
        setMsg('info', isWall(s) ? 'Wall' : 'Terminal', isWall(s) ? `${L(s)} is a wall, not a state.` : `${L(s)} is terminal: V* = 0, no backup needed. Its ${s === GOAL ? '+1' : '−1'} enters the backups of its neighbours through R(s,a,s′).`);
        return;
      }
      if (s === B.sel && c.dataset.qa !== undefined) B.selA = +c.dataset.qa;
      else { B.sel = s; B.selA = null; B.calcK = 1; }
      updBellman(); return;
    }
    const b = e.target.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act;
    if (act === 'pi') B.showPi = !B.showPi;
    else if (act === 'stepmode') { B.stepMode = !B.stepMode; B.calcK = 1; }
    else if (act === 'cnext') B.calcK++;
    else if (act === 'cprev') B.calcK--;
    else if (act === 'call') B.stepMode = false;
    updBellman();
  }

  // ================================================================== 7B · Value Iteration
  const VI = { k: 0, V: null, dV: null, hist: [], pol: null, polChanges: null, polStableAt: null, done: false, theta: 0.001, sel: '1,1', showPi: true, auto: false, key: null };

  function greedyOf(V) {
    const p = {};
    NONTERM.forEach(s => {
      const q = ACTS.map((_, a) => K.qFrom(V, s, a)), mx = Math.max(...q), mn = Math.min(...q);
      p[s] = mx - mn < 1e-12 ? -1 : argmax(q);
    });
    return p;
  }
  function viReset() {
    VI.k = 0; VI.V = K.zeroV(); VI.dV = null; VI.hist = []; VI.pol = greedyOf(VI.V); VI.polChanges = null; VI.polStableAt = null; VI.done = false; VI.key = envKey();
  }
  function viSweep() {
    if (VI.done) return;
    const old = VI.V, nv = Object.assign({}, old), dV = {};
    let delta = 0;
    NONTERM.forEach(s => {
      nv[s] = Math.max(...ACTS.map((_, a) => K.qFrom(old, s, a)));   // uses OLD values only (synchronous)
      dV[s] = nv[s] - old[s]; delta = Math.max(delta, Math.abs(dV[s]));
    });
    VI.V = nv; VI.dV = dV; VI.k++;
    const np = greedyOf(nv);
    VI.polChanges = NONTERM.filter(s => np[s] !== VI.pol[s]).length;
    if (VI.polChanges === 0 && NONTERM.every(s => np[s] >= 0)) { if (VI.polStableAt === null) VI.polStableAt = VI.k - 1; }
    else VI.polStableAt = null;
    VI.pol = np;
    const err = Math.max(...NONTERM.map(s => Math.abs(nv[s] - star().V[s])));
    VI.hist.push({ k: VI.k, delta, vs: nv[START], err });
    if (delta < VI.theta) VI.done = true;
  }

  function viSVG(hlCells) {
    const sv = star().V, m = Math.max(0.05, ...NONTERM.map(s => Math.abs(sv[s])));
    let h = svgOpen('rll-svg', 'Value iteration grid');
    CELLS.forEach(s => {
      if (isWall(s) || isTerm(s)) { h += plainCell(s); return; }
      const v = VI.V[s];
      let inner = `<text x="${cx(s)}" y="${cy(s) + 7}" class="mdl-vtxt">${f(v, 2)}</text>`;
      if (VI.dV && Math.abs(VI.dV[s]) >= 0.0005) inner += `<text x="${x0(s) + CELL - 7}" y="${y0(s) + 15}" class="rll-dv">${fs(VI.dV[s], 3)}</text>`;
      if (VI.showPi && VI.pol[s] >= 0) inner += K.tri(s, VI.pol[s], 8, 'mdl-pi');
      h += plainCell(s, K.vColor(v, m), inner);
      if (VI.dV && Math.abs(VI.dV[s]) >= 0.0005) h += `<rect x="${x0(s) + 3}" y="${y0(s) + 3}" width="${CELL - 6}" height="${CELL - 6}" rx="7" class="rll-changed"/>`;
    });
    (hlCells || []).forEach(c => { if (c !== VI.sel) h += calcHl(c); });
    if (VI.sel) h += outlineCell(VI.sel, 'mdl-sel-s');
    return h + '</svg>';
  }

  function viDetail() {
    const s = VI.sel, V = VI.V, g = S.gamma.toFixed(2);
    if (!s) return { html: '<div class="tfp-hint">Click a state to see its next backup.</div>', cells: [] };
    const q = ACTS.map((_, a) => K.qFrom(V, s, a)), ba = argmax(q), tie = Math.max(...q) - Math.min(...q) < 1e-12;
    const rows = ACTS.map((A, a) => {
      const terms = K.merged(s, a).map(o => `${o.p.toFixed(1)}×[${fs(o.r)}+${g}×${isTerm(o.s2) ? '0' : f(V[o.s2], 2)}]`).join(' + ');
      return `<div class="mdl-cl ${!tie && a === ba ? 'bestl' : ''}"><span class="mdl-ck">${A.g}</span><span>${terms} = <b>${f(q[a], 3)}</b>${!tie && a === ba ? ' ★' : ''}</span></div>`;
    }).join('');
    return {
      cells: tie ? [] : K.merged(s, ba).map(o => o.s2),
      html: `<div class="rll-kv"><span>V<sub>${VI.k}</sub>${L(s)}</span><b>${f(V[s], 3)}</b><span>→ V<sub>${VI.k + 1}</sub></span><b class="pos">${f(Math.max(...q), 3)}</b><span>V*</span><b>${f(star().V[s], 3)}</b></div>
        <div class="tfp-hint" style="margin:.2rem 0 .35rem">Next backup uses only V<sub>${VI.k}</sub>: &nbsp;V<sub>${VI.k + 1}</sub>(s) = max<sub>a</sub> Σ P [R + γ V<sub>${VI.k}</sub>(s′)]</div>
        <div class="mdl-calc">${rows}<div class="mdl-cl total"><span class="mdl-ck">max</span><span>V<sub>${VI.k + 1}</sub>${L(s)} = <b>${f(Math.max(...q), 3)}</b>${tie ? ' — all actions tie, no preferred action yet' : ` · greedy action ${ACTS[ba].g}`}</span></div></div>`
    };
  }

  function skelVI() {
    root.innerHTML = `<div class="tfp-viz mdl-viz rll-viz">
      <div class="tfp-viz-head"><h3><span>Value Iteration · V<sub>k+1</sub> ← max<sub>a</sub> Σ P [R + γ V<sub>k</sub>]</span></h3></div>
      ${K.settingsHTML(true)}
      <div class="tfp-msg mdl-msg" id="rll-msg"></div>
      <div class="mdl-two">
        <div class="tfp-card mdl-gridcard"><div id="rll-grid"></div>
          <div class="mdl-legend"><span><i class="lg-v"></i><span class="t">V<sub>k</sub>(s)</span></span><span><i class="lg-pi"></i><span class="t">greedy π<sub>k</sub>(s)</span></span><span><i class="rll-lg-ch"></i>changed in last sweep (Δ top-right)</span></div></div>
        <div class="mdl-side">
          <div class="tfp-card"><div class="rll-iter"><span>Iteration k</span><b id="rll-k">0</b></div>
            <div class="mdl-btns"><button class="tfp-btn primary" data-act="sweep"><i data-lucide="step-forward"></i>Sweep</button>
              <button class="tfp-btn" data-act="run" id="rll-run"><i data-lucide="play"></i>Run</button>
              <button class="tfp-btn" data-act="reset"><i data-lucide="rotate-ccw"></i>Reset</button></div>
            <div class="tfp-row" style="margin-top:.45rem"><button class="tfp-btn" data-act="conv"><i data-lucide="fast-forward"></i>Run to convergence</button>
              <label class="mdl-set"><span>θ</span><select data-rl="theta">${[0.01, 0.001, 0.0001].map(t => `<option value="${t}" ${VI.theta === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
              <label class="mdl-set"><input type="checkbox" data-rl="vipi" ${VI.showPi ? 'checked' : ''}> greedy arrows</label></div>
            <div class="rll-stats" id="rll-stats"></div></div>
          <div class="tfp-card"><div class="tfp-card-head"><h4><span>Convergence: Δ<sub>k</sub> = max<sub>s</sub> |V<sub>k</sub> − V<sub>k−1</sub>|</span></h4></div><div id="rll-chart"></div></div>
        </div>
      </div>
      <div class="tfp-card"><div class="tfp-card-head"><h4><span>Selected state · the backup the next sweep will apply</span></h4></div><div id="rll-detail"></div></div>
    </div>`;
    updVI();
  }

  function updVI() {
    if (VI.key !== envKey()) viReset();
    const d = viDetail();
    $('rll-grid').innerHTML = viSVG(d.cells);
    $('rll-k').textContent = VI.k;
    $('rll-detail').innerHTML = d.html;
    const last = VI.hist[VI.hist.length - 1];
    const sv = star().V;
    const err = Math.max(...NONTERM.map(s => Math.abs(VI.V[s] - sv[s])));
    $('rll-stats').innerHTML = `
      <div><span>Δ<sub>k</sub></span><b>${last ? last.delta.toExponential(2) : '—'}</b></div>
      <div><span>max |V<sub>k</sub> − V*|</span><b>${err.toExponential(2)}</b></div>
      <div><span>V<sub>k</sub>(start) → V*(start)</span><b>${f(VI.V[START], 3)} → ${f(sv[START], 3)}</b></div>
      <div><span>policy stable since</span><b>${VI.polStableAt !== null ? 'k = ' + VI.polStableAt : '—'}</b></div>
      <div class="wide ${VI.done ? 'ok' : ''}"><span>status</span><b>${VI.done ? `converged (Δ < θ = ${VI.theta}) at k = ${VI.k}` : 'iterating…'}</b></div>`;
    $('rll-chart').innerHTML = lineChart([
      { pts: VI.hist.map(h => [h.k, h.delta]), cls: 'c1', dots: VI.hist.length < 40 },
      { pts: VI.hist.map(h => [h.k, Math.max(h.err, 1e-6)]), cls: 'c2 dash' }
    ], { log: true, hl: [{ y: VI.theta, cls: 'theta', lbl: 'θ' }], w: 300, h: 120, xlbl: 'k', empty: 'Press Sweep — Δ<sub>k</sub> shrinks geometrically (≈ factor γ per sweep).' }) +
      (VI.hist.length ? '<div class="rll-key"><span><i class="c1"></i><span class="t">Δ<sub>k</sub></span></span><span><i class="c2"></i><span class="t">max |V<sub>k</sub> − V*|</span></span><span><i class="th"></i>θ stop</span></div>' : '');
    const rb = $('rll-run'); rb.innerHTML = VI.auto ? '<i data-lucide="pause"></i>Pause' : '<i data-lucide="play"></i>Run'; rb.classList.toggle('on', VI.auto);
    // message
    let m;
    if (VI.k === 0) m = ['try', 'k = 0', `Start with V<sub>0</sub>(s) = 0 everywhere. Each <b>Sweep</b> backs up <b>every</b> state at once with the Bellman optimality update, using only the previous values V<sub>k</sub>. Watch value flow outward from the +1 goal and the −1 pit.`];
    else if (VI.done) m = ['ok', 'Converged', `After <b>${VI.k}</b> sweeps the largest change Δ = ${last.delta.toExponential(2)} < θ, so V<sub>k</sub> ≈ V*. The greedy policy stopped changing at <b>k = ${VI.polStableAt !== null ? VI.polStableAt : VI.k}</b> — policy extraction π*(s) = argmax<sub>a</sub> Σ P[R + γV*(s′)] often settles long before the values do. Try γ = 0.99: many more sweeps.`];
    else m = ['step', `Sweep ${VI.k}`, `Δ<sub>${VI.k}</sub> = ${last.delta.toExponential(2)}. V<sub>k</sub>(s) only looks <b>k steps ahead</b>, so reward information spreads about one cell per sweep: the +1 goal is 6 moves from the start, so V<sub>k</sub>(start) ${VI.k < 6 ? 'cannot feel it yet' : 'now includes it'}. Greedy policy changed in <b>${VI.polChanges}</b> state${VI.polChanges === 1 ? '' : 's'}. The bound max|V<sub>k</sub>−V*| ≤ γΔ/(1−γ) = ${(S.gamma * last.delta / (1 - S.gamma)).toExponential(1)}.`];
    setMsg(...m);
    if (window.lucide) window.lucide.createIcons();
  }

  function clickVI(e) {
    const c = e.target.closest('[data-cell]');
    if (c && $('rll-grid').contains(c)) { const s = c.dataset.cell; if (!isWall(s) && !isTerm(s)) { VI.sel = s; updVI(); } return; }
    const b = e.target.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act;
    if (act === 'sweep') { stopTimer(); viSweep(); }
    else if (act === 'reset') { stopTimer(); viReset(); }
    else if (act === 'conv') { stopTimer(); let n = 0; while (!VI.done && n++ < 5000) viSweep(); }
    else if (act === 'run') {
      if (VI.auto) stopTimer();
      else {
        if (VI.done) viReset();
        VI.auto = true;
        timer = setInterval(() => { if (!alive() || view !== 'vi') { stopTimer(); return; } viSweep(); if (VI.done) stopTimer(); updVI(); }, 650);
      }
    }
    updVI();
  }

  // ================================================================== shared learner (TD + Q-learning)
  const initQ = () => { const Q = {}; NONTERM.forEach(s => { Q[s] = [0, 0, 0, 0]; }); return Q; };
  const LQ = { Q: initQ(), agent: START, t: 0, G: 0, eps: [], totalSteps: 0, updates: 0, last: null, pendingA: null, trail: [START],
    alpha: 0.3, epsilon: 0.2, algo: 'q', deltas: [], auto: false, speed: 450, qView: 'Q', revealStar: false, maxSteps: 100 };

  const qv = (s, a) => (isTerm(s) ? 0 : LQ.Q[s][a]);
  const maxQ = s => (isTerm(s) ? 0 : Math.max(...LQ.Q[s]));
  function greedyA(s) {   // random tie-breaking so an all-zero table does not always pick ↑
    const q = LQ.Q[s], mx = Math.max(...q), ties = [0, 1, 2, 3].filter(a => q[a] >= mx - 1e-12);
    return ties[Math.floor(Math.random() * ties.length)];
  }
  function choose(s) {
    const u = Math.random();
    if (u < LQ.epsilon) return { a: Math.floor(Math.random() * 4), u, explore: true };
    return { a: greedyA(s), u, explore: false };
  }
  function envStep(s, a) {
    const comps = K.outcomes(s, a), u = Math.random();
    let acc = 0, c = comps[comps.length - 1];
    for (const o of comps) { acc += o.p; if (u < acc) { c = o; break; } }
    return c;
  }
  function learnStep(a, info, algo) {
    const s = LQ.agent, tr = envStep(s, a), s2 = tr.s2, r = tr.r, g = S.gamma;
    let a2 = null, target, bootA = null, boot = 0;
    if (isTerm(s2)) { target = r; LQ.pendingA = null; }
    else if (algo === 'sarsa') { const c = choose(s2); a2 = c.a; LQ.pendingA = c; boot = qv(s2, a2); bootA = a2; target = r + g * boot; }
    else { bootA = argmax(LQ.Q[s2]); boot = maxQ(s2); target = r + g * boot; LQ.pendingA = null; }
    const old = LQ.Q[s][a], delta = target - old;
    LQ.Q[s][a] = old + LQ.alpha * delta;
    LQ.G += Math.pow(g, LQ.t) * r; LQ.t++; LQ.totalSteps++; LQ.updates++;
    LQ.deltas.push(delta); if (LQ.deltas.length > 400) LQ.deltas.shift();
    LQ.trail.push(s2);
    LQ.last = { s, a, r, s2, kind: tr.kind, bump: tr.bump, p: tr.p, old, target, delta, nw: LQ.Q[s][a], a2, bootA, boot, choice: info, algo, t: LQ.t - 1, epEnd: null };
    LQ.agent = s2;
    if (isTerm(s2) || LQ.t >= LQ.maxSteps) {
      const end = s2 === GOAL ? 'goal' : s2 === PIT ? 'pit' : 'cap';
      LQ.eps.push({ G: LQ.G, steps: LQ.t, end });
      LQ.last.epEnd = { end, G: LQ.G, steps: LQ.t, n: LQ.eps.length };
      LQ.agent = START; LQ.t = 0; LQ.G = 0; LQ.trail = [START]; LQ.pendingA = null;
    }
  }
  function qlStep() { const c = LQ.algo === 'sarsa' && LQ.pendingA ? LQ.pendingA : choose(LQ.agent); learnStep(c.a, c, LQ.algo); }
  function resetLearner() { stopTimer(); Object.assign(LQ, { Q: initQ(), agent: START, t: 0, G: 0, eps: [], totalSteps: 0, updates: 0, last: null, pendingA: null, trail: [START], deltas: [] }); }
  function policyMatch() {
    const st = star();
    let n = 0;
    NONTERM.forEach(s => { const q = LQ.Q[s]; if (Math.max(...q) - Math.min(...q) < 1e-12) return; const a = argmax(q), mx = Math.max(...st.Q[s]); if (st.Q[s][a] >= mx - 1e-6) n++; });
    return n;
  }

  function learnerSVG(o = {}) {
    const Q = LQ.Q, m = Math.max(0.05, ...NONTERM.flatMap(s => Q[s].map(Math.abs)));
    let h = svgOpen('rll-svg', 'Grid world Q-table');
    CELLS.forEach(s => {
      if (isWall(s) || isTerm(s)) { h += plainCell(s); return; }
      if (LQ.qView === 'pol' && o.allowPol) {
        const v = Math.max(...Q[s]), tie = Math.max(...Q[s]) - Math.min(...Q[s]) < 1e-12;
        let inner = `<text x="${cx(s)}" y="${cy(s) + 7}" class="mdl-vtxt">${f(v, 2)}</text>`;
        if (!tie) inner += K.tri(s, argmax(Q[s]), 9, 'mdl-pi');
        if (o.cmpStar && !tie) { const st = star(); if (st.Q[s][argmax(Q[s])] < Math.max(...st.Q[s]) - 1e-6) inner += `<text x="${x0(s) + CELL - 7}" y="${y0(s) + 15}" class="rll-miss">≠π*</text>`; }
        h += plainCell(s, K.vColor(v, m), inner);
      } else {
        h += plainCell(s, '#fff', '') + qCell(s, Q[s], m);
      }
    });
    // current-episode trail
    if (o.trail && LQ.trail.length > 1) h += `<polyline points="${LQ.trail.map(s => cx(s) + ',' + cy(s)).join(' ')}" class="rll-trail"/>`;
    const L2 = LQ.last;
    if (L2 && o.showUpdate) {
      if (LQ.qView !== 'pol' || !o.allowPol) {
        h += wedgeOl(L2.s, L2.a, 'sel');
        if (!isTerm(L2.s2) && L2.bootA !== null) h += wedgeOl(L2.s2, L2.bootA, 'best');
      }
      if (L2.s2 !== L2.s) h += `<line x1="${cx(L2.s)}" y1="${cy(L2.s)}" x2="${(cx(L2.s2) * 0.72 + cx(L2.s) * 0.28).toFixed(1)}" y2="${(cy(L2.s2) * 0.72 + cy(L2.s) * 0.28).toFixed(1)}" class="rll-tr" marker-end="url(#mdl-ah-pd)"/>`;
    }
    h += `<g id="rll-agent" class="mdl-agent" style="transform:translate(${x0(LQ.agent) + 24}px, ${y0(LQ.agent) + 74}px) scale(0.6);color:#2563eb">${K.agentSVG()}</g>`;
    return h + '</svg>';
  }

  // ================================================================== 8A · TD learning
  function tdNumberLine(L2) {
    const w = 520, h = 100, vals = [L2.old, L2.target, L2.nw, 0];
    let lo = Math.min(...vals), hi = Math.max(...vals); const pad = Math.max(0.08, (hi - lo) * 0.15); lo -= pad; hi += pad;
    const X = v => 60 + (v - lo) / (hi - lo) * (w - 120), ay = 58;
    let s = `<svg viewBox="0 0 ${w} ${h}" class="rll-nl"><line x1="18" x2="${w - 18}" y1="${ay}" y2="${ay}" class="rll-axis"/>
      <line x1="${X(0)}" x2="${X(0)}" y1="${ay - 5}" y2="${ay + 5}" class="rll-axis"/><text x="${X(0)}" y="${ay + 17}" class="rll-tick" text-anchor="middle">0</text>`;
    if (Math.abs(L2.delta) > 1e-9) {
      s += `<line x1="${X(L2.old)}" x2="${X(L2.target)}" y1="${ay - 16}" y2="${ay - 16}" class="rll-dl" marker-end="url(#rll-ahg)"/>`;
      s += `<text x="${(X(L2.old) + X(L2.target)) / 2}" y="${ay - 40}" class="rll-dlt">δ = target − old = ${fs(L2.delta, 3)}</text>`;
      s += `<line x1="${X(L2.old)}" x2="${X(L2.nw)}" y1="${ay}" y2="${ay}" class="rll-step" marker-end="url(#rll-ahv)"/>`;
    }
    s += `<defs><marker id="rll-ahg" viewBox="0 0 10 10" refX="8" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="#d97706"/></marker><marker id="rll-ahv" viewBox="0 0 10 10" refX="8" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="#7c3aed"/></marker></defs>`;
    s += `<circle cx="${X(L2.old)}" cy="${ay}" r="6" class="rll-pt old"/><text x="${X(L2.old)}" y="${ay + 30}" class="rll-ptl" text-anchor="middle">old Q ${f(L2.old, 3)}</text>`;
    s += `<rect x="${X(L2.target) - 6}" y="${ay - 6}" width="12" height="12" transform="rotate(45 ${X(L2.target)} ${ay})" class="rll-pt tgt"/><text x="${X(L2.target) + (L2.target < L2.old ? -12 : 12)}" y="${ay + 4}" class="rll-ptl tgt" text-anchor="${L2.target < L2.old ? 'end' : 'start'}">target ${f(L2.target, 3)}</text>`;
    const close = Math.abs(X(L2.nw) - X(L2.old)) < 70;
    s += `<circle cx="${X(L2.nw)}" cy="${ay}" r="6" class="rll-pt nw"/><text x="${X(L2.nw)}" y="${ay + (close ? 42 : 30)}" class="rll-ptl nw" text-anchor="middle">new Q ${f(L2.nw, 3)}</text>`;
    return s + '</svg>';
  }

  function deltaBars() {
    const D = LQ.deltas.slice(-60);
    if (!D.length) return '<div class="tfp-hint">TD errors appear here as you move.</div>';
    const w = 520, h = 64, mid = 32, m = Math.max(0.05, ...D.map(Math.abs)), bw = (w - 10) / 60;
    let s = `<svg viewBox="0 0 ${w} ${h}" class="rll-nl"><line x1="0" x2="${w}" y1="${mid}" y2="${mid}" class="rll-axis"/>`;
    D.forEach((d, i) => { const hh = Math.abs(d) / m * (mid - 4); s += `<rect x="${5 + i * bw}" y="${d >= 0 ? mid - hh : mid}" width="${Math.max(1, bw - 1.5)}" height="${Math.max(0.6, hh)}" class="rll-db ${d >= 0 ? 'pos' : 'neg'} ${i === D.length - 1 ? 'last' : ''}"/>`; });
    return s + '</svg>';
  }

  function skelTD() {
    root.innerHTML = `<div class="tfp-viz mdl-viz rll-viz">
      <div class="tfp-viz-head"><h3><span>Temporal-Difference Update · learn from one step</span></h3></div>
      <div class="mdl-settings">${sliderHTML('alpha', 'α', 0.05, 1, 0.05, LQ.alpha)}</div>${K.settingsHTML(true)}
      <div class="tfp-msg mdl-msg" id="rll-msg"></div>
      <div class="mdl-two">
        <div class="tfp-card mdl-gridcard"><div id="rll-grid"></div>
          <div class="mdl-legend"><span><i class="lg-v"></i>learned Q(s,a) wedges</span><span><i class="rll-lg-sel"></i>Q(s,a) being updated</span><span><i class="lg-bestw"></i><span class="t">max<sub>a′</sub> Q(s′,a′) used in target</span></span></div></div>
        <div class="mdl-side">
          <div class="tfp-card"><div class="tfp-card-head"><h4><span class="mdl-tag c-a">A</span><span>Take an action</span></h4><span class="tfp-card-sub">arrow keys work</span></div>
            <div class="mdl-pad">${[[0, 'u'], [3, 'l'], [1, 'r'], [2, 'd']].map(([a, c]) => `<button class="mdl-pad-btn ${c}" data-a="${a}">${ACTS[a].g}</button>`).join('')}<div class="mdl-pad-mid" id="rll-at"></div></div>
            <div class="mdl-btns" style="margin-top:.5rem"><button class="tfp-btn" data-act="greedy"><i data-lucide="target"></i>Greedy</button><button class="tfp-btn" data-act="newep"><i data-lucide="home"></i>To start</button><button class="tfp-btn" data-act="resetq"><i data-lucide="rotate-ccw"></i>Reset Q</button></div>
            <div class="tfp-hint" style="margin-top:.4rem">The agent does <b>not</b> know P or R. It only sees the sample (s, a, r, s′) the world returns.</div></div>
          <div class="tfp-card"><div class="rll-stats" id="rll-stats"></div>
            <label class="mdl-set" style="margin-top:.4rem"><input type="checkbox" data-rl="reveal" ${LQ.revealStar ? 'checked' : ''}> reveal true Q* (from the hidden model)</label></div>
        </div>
      </div>
      <div class="tfp-card"><div class="tfp-card-head"><h4><span>The TD update for the last transition</span></h4><span class="tfp-card-sub">Q(s,a) ← Q(s,a) + α [ r + γ max<sub>a′</sub> Q(s′,a′) − Q(s,a) ]</span></div><div id="rll-td"></div></div>
      <div class="tfp-card"><div class="tfp-card-head"><h4><span>TD error δ over the last 60 updates</span></h4><span class="tfp-card-sub"><span style="color:#059669">▮</span> better than expected · <span style="color:#e11d48">▮</span> worse</span></div><div id="rll-db"></div></div>
    </div>`;
    updTD();
  }

  function tdCalc(L2) {
    if (!L2) return '<div class="tfp-hint">Press an arrow to move the agent. Every real step gives one sample and one update — no need to wait for the episode to end (that is the difference from Monte Carlo).</div>';
    const g = S.gamma.toFixed(2), A = ACTS[L2.a];
    const bootTxt = isTerm(L2.s2) ? `0 <span class="mdl-mute">(s′ terminal)</span>` : (L2.algo === 'sarsa' ? `Q(${L2.s2}, ${ACTS[L2.a2].g}) = ${f(L2.boot, 3)}` : `max<sub>a′</sub> Q(${L2.s2}, a′) = ${f(L2.boot, 3)} <span class="mdl-mute">(${ACTS[L2.bootA].g})</span>`);
    let h = tdNumberLine(L2);
    h += `<div class="mdl-calc">
      <div class="mdl-cl"><span class="mdl-ck">sample</span><span>s = ${L(L2.s)}, a = ${A.g}; the world returned <b>r = ${fs(L2.r)}</b>, <b>s′ = ${L(L2.s2)}</b> <span class="mdl-mute">(${L2.kind}${L2.bump ? ', bumped' : ''})</span></span></div>
      <div class="mdl-cl"><span class="mdl-ck">estimate</span><span>current Q(${L2.s}, ${A.g}) = <b>${f(L2.old, 3)}</b></span></div>
      <div class="mdl-cl imm"><span class="mdl-ck">TD target</span><span>r + γ · ${bootTxt} = ${fs(L2.r)} + ${g} × ${f(L2.boot, 3)} = <b>${f(L2.target, 3)}</b></span></div>
      <div class="mdl-cl fut"><span class="mdl-ck">TD error δ</span><span>target − estimate = ${f(L2.target, 3)} − ${f(L2.old, 3)} = <b>${fs(L2.delta, 3)}</b> ${Math.abs(L2.delta) < 1e-9 ? '(no surprise)' : L2.delta > 0 ? '(better than expected)' : '(worse than expected)'}</span></div>
      <div class="mdl-cl total"><span class="mdl-ck">update</span><span>Q ← ${f(L2.old, 3)} + ${LQ.alpha.toFixed(2)} × ${fs(L2.delta, 3)} = <b>${f(L2.nw, 3)}</b> &nbsp;<span class="mdl-mute">(moved ${Math.round(LQ.alpha * 100)}% of the way to the target)</span></span></div>
      ${LQ.revealStar ? `<div class="mdl-cl"><span class="mdl-ck">truth</span><span>Q*(${L2.s}, ${A.g}) = ${f(star().Q[L2.s][L2.a], 3)} · error |Q − Q*|: ${f(Math.abs(L2.old - star().Q[L2.s][L2.a]), 3)} → <b>${f(Math.abs(L2.nw - star().Q[L2.s][L2.a]), 3)}</b></span></div>` : ''}
    </div>`;
    return h;
  }

  function updTD() {
    $('rll-grid').innerHTML = learnerSVG({ showUpdate: true, trail: true });
    $('rll-at').textContent = L(LQ.agent);
    $('rll-td').innerHTML = tdCalc(LQ.last);
    $('rll-db').innerHTML = deltaBars();
    const recent = LQ.deltas.slice(-20), mad = recent.length ? recent.reduce((t, d) => t + Math.abs(d), 0) / recent.length : 0;
    $('rll-stats').innerHTML = `<div><span>updates</span><b>${LQ.updates}</b></div><div><span>episodes done</span><b>${LQ.eps.length}</b></div>
      <div><span>mean |δ| (last 20)</span><b>${recent.length ? f(mad, 3) : '—'}</b></div><div><span>this episode t</span><b>${LQ.t}</b></div>`;
    const L2 = LQ.last;
    if (!L2) setMsg('try', 'TD(0)', `Q starts at 0 everywhere. Drive the agent with the arrows. After each step the agent compares what it <b>expected</b>, Q(s,a), with a better guess built from what it <b>saw</b>: r + γ max Q(s′,·). The gap δ is the “surprise”.`);
    else if (L2.epEnd) setMsg(L2.epEnd.end === 'goal' ? 'ok' : 'bad', 'Episode end', `Reached ${L2.epEnd.end === 'goal' ? 'the goal (+1)' : L2.epEnd.end === 'pit' ? 'the pit (−1)' : 'the step cap'}: the target was just r = ${fs(L2.r)} (nothing follows a terminal state), δ = ${fs(L2.delta, 3)}. That reward is now stored in Q(${L2.s}, ${ACTS[L2.a].g}) and will <b>bootstrap</b> backwards into earlier states on later visits. Agent restarts at ${L(START)}.`);
    else setMsg(Math.abs(L2.delta) < 1e-6 ? 'info' : L2.delta > 0 ? 'r' : 'bad', `δ = ${fs(L2.delta, 3)}`, `Took ${ACTS[L2.a].g} in ${L(L2.s)}, landed in ${L(L2.s2)}${L2.bump ? ' (bumped)' : ''}, r = ${fs(L2.r)}. Target ${f(L2.target, 3)} vs estimate ${f(L2.old, 3)}: ${Math.abs(L2.delta) < 1e-6 ? 'no surprise, nothing to learn.' : L2.delta > 0 ? 'better than expected, so Q(s,a) goes up.' : 'worse than expected, so Q(s,a) goes down.'} With α = ${LQ.alpha.toFixed(2)} it moves ${Math.round(LQ.alpha * 100)}% of the way. <span class="mdl-mute">Walk the same path repeatedly: the +1 creeps backwards one step per visit.</span>`);
    if (window.lucide) window.lucide.createIcons();
  }

  function clickTD(e) {
    const b = e.target.closest('[data-a],[data-act]');
    if (!b || !root.contains(b)) return;
    if (b.dataset.a !== undefined) { tdAct(+b.dataset.a); return; }
    const act = b.dataset.act;
    if (act === 'greedy') { tdAct(greedyA(LQ.agent)); return; }
    if (act === 'newep') { LQ.agent = START; LQ.t = 0; LQ.G = 0; LQ.trail = [START]; LQ.last = null; LQ.pendingA = null; }
    if (act === 'resetq') resetLearner();
    updTD();
  }
  function tdAct(a) { LQ.pendingA = null; learnStep(a, { a, manual: true }, 'q'); updTD(); }

  // ================================================================== 8B · Q-learning / SARSA
  function skelQL() {
    root.innerHTML = `<div class="tfp-viz mdl-viz rll-viz">
      <div class="tfp-viz-head"><h3><span>Tabular Q-Learning with ε-greedy exploration</span></h3>
        <div class="mdl-mode" role="group" aria-label="Algorithm"><button class="tfp-btn" data-algo="q">Q-learning (off-policy)</button><button class="tfp-btn" data-algo="sarsa">SARSA (on-policy)</button></div></div>
      <div class="mdl-settings">${sliderHTML('alpha', 'α', 0.05, 1, 0.05, LQ.alpha)}${sliderHTML('epsilon', 'ε', 0, 1, 0.05, LQ.epsilon)}</div>${K.settingsHTML(true)}
      <div class="tfp-msg mdl-msg" id="rll-msg"></div>
      <div class="mdl-two">
        <div class="tfp-card mdl-gridcard"><div id="rll-grid"></div>
          <div class="mdl-legend" id="rll-leg"></div>
          <div class="tfp-row" style="justify-content:center;margin-top:.3rem"><div class="mdl-mode"><button class="tfp-btn" data-qv="Q">Q-table</button><button class="tfp-btn" data-qv="pol">Greedy policy vs π*</button></div></div></div>
        <div class="mdl-side">
          <div class="tfp-card"><div class="mdl-btns"><button class="tfp-btn primary" data-act="step"><i data-lucide="step-forward"></i>Step</button>
              <button class="tfp-btn" data-act="play" id="rll-play"><i data-lucide="play"></i>Play</button>
              <button class="tfp-btn" data-act="resetq"><i data-lucide="rotate-ccw"></i>Reset Q</button></div>
            <div class="mdl-btns" style="margin-top:.4rem"><button class="tfp-btn" data-act="ep1">+1 episode</button><button class="tfp-btn" data-act="ep10">+10 episodes</button><button class="tfp-btn" data-act="ep100">+100 episodes</button></div>
            <label class="mdl-set wide"><span>Play speed</span><select data-rl="speed">${[[900, 'slow'], [450, 'normal'], [120, 'fast']].map(([v, l]) => `<option value="${v}" ${LQ.speed === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
            <div class="rll-stats" id="rll-stats"></div></div>
        </div>
      </div>
      <div class="tfp-card"><div class="tfp-card-head"><h4><span>Last step · ε-greedy choice and update</span></h4><span class="tfp-card-sub" id="rll-algo-sub"></span></div><div id="rll-last"></div></div>
      <div class="tfp-card"><div class="tfp-card-head"><h4><span>Learning curve · discounted return G₀ per episode</span></h4><span class="tfp-card-sub" id="rll-cs"></span></div><div id="rll-chart"></div></div>
    </div>`;
    updQL();
  }

  function qlLast() {
    const L2 = LQ.last;
    if (!L2) return '<div class="tfp-hint">Press <b>Step</b> to watch a single ε-greedy decision and update, or <b>+100 episodes</b> to train fast.</div>';
    const c = L2.choice || {}, A = ACTS[L2.a], g = S.gamma.toFixed(2);
    const pick = c.explore ? `u = ${c.u.toFixed(2)} &lt; ε = ${LQ.epsilon.toFixed(2)} → <b class="rll-explore">explore</b>: random ${A.g}` : `u = ${(c.u ?? 1).toFixed(2)} ≥ ε = ${LQ.epsilon.toFixed(2)} → <b class="rll-exploit">exploit</b>: greedy ${A.g}`;
    const boot = isTerm(L2.s2) ? '0 (terminal)' : L2.algo === 'sarsa' ? `Q(s′, a′=${ACTS[L2.a2].g}) = ${f(L2.boot, 3)}` : `max<sub>a′</sub> Q(s′,a′) = ${f(L2.boot, 3)}`;
    return `<div class="mdl-calc">
      <div class="mdl-cl"><span class="mdl-ck">choose a</span><span>${pick}</span></div>
      <div class="mdl-cl"><span class="mdl-ck">world</span><span>took ${A.g} in ${L(L2.s)} → landed in ${L(L2.s2)} (${L2.kind}${L2.bump ? ', bump' : ''}), r = ${fs(L2.r)}</span></div>
      ${L2.algo === 'sarsa' && L2.a2 !== null ? `<div class="mdl-cl"><span class="mdl-ck">next a′</span><span>SARSA picks a′ = ${ACTS[L2.a2].g} with ε-greedy <i>now</i> and will really take it</span></div>` : ''}
      <div class="mdl-cl imm"><span class="mdl-ck">target</span><span>${fs(L2.r)} + ${g} × ${boot} = <b>${f(L2.target, 3)}</b></span></div>
      <div class="mdl-cl total"><span class="mdl-ck">update</span><span>Q(${L2.s},${A.g}): ${f(L2.old, 3)} + ${LQ.alpha.toFixed(2)}×${fs(L2.delta, 3)} = <b>${f(L2.nw, 3)}</b></span></div></div>`;
  }

  function updQL() {
    root.querySelectorAll('[data-algo]').forEach(b => b.classList.toggle('on', b.dataset.algo === LQ.algo));
    root.querySelectorAll('[data-qv]').forEach(b => b.classList.toggle('on', b.dataset.qv === LQ.qView));
    $('rll-grid').innerHTML = learnerSVG({ showUpdate: true, trail: true, allowPol: true, cmpStar: true });
    $('rll-leg').innerHTML = LQ.qView === 'pol'
      ? '<span><i class="lg-v"></i><span class="t">max<sub>a</sub> Q(s,a)</span></span><span><i class="lg-pi"></i>greedy action</span><span><b style="color:#e11d48">≠π*</b> differs from optimal</span><span><i class="rll-lg-trail"></i>this episode</span>'
      : '<span><i class="lg-v"></i>Q(s,a) wedges</span><span><i class="rll-lg-sel"></i>just updated</span><span><i class="lg-bestw"></i>bootstrap Q(s′,·)</span><span><i class="rll-lg-trail"></i>this episode</span>';
    $('rll-algo-sub').innerHTML = LQ.algo === 'q' ? 'target uses max<sub>a′</sub> Q(s′,a′)' : 'target uses Q(s′,a′) of the action actually taken next';
    const pm = policyMatch(), E = LQ.eps, last10 = E.slice(-10);
    const avg = last10.length ? last10.reduce((t, e) => t + e.G, 0) / last10.length : null;
    const goals = last10.filter(e => e.end === 'goal').length;
    $('rll-stats').innerHTML = `<div><span>episodes</span><b>${E.length}</b></div><div><span>total steps</span><b>${LQ.totalSteps}</b></div>
      <div><span>avg G₀ (last 10)</span><b>${avg === null ? '—' : f(avg, 3)}</b></div><div><span>goal rate (last 10)</span><b>${last10.length ? goals + '/' + last10.length : '—'}</b></div>
      <div class="wide ${pm === NONTERM.length ? 'ok' : ''}"><span>greedy policy = π*</span><b>${pm} / ${NONTERM.length} states</b></div>`;
    $('rll-last').innerHTML = qlLast();
    const pts = E.map((e, i) => [i + 1, e.G]);
    const ma = pts.map((p, i) => { const w = pts.slice(Math.max(0, i - 9), i + 1); return [p[0], w.reduce((t, q) => t + q[1], 0) / w.length]; });
    const vs = star().V[START];
    $('rll-chart').innerHTML = lineChart([
      { pts: pts.slice(-300), cls: 'c3', dots: true, noline: true, r: 2 },
      { pts: ma.slice(-300), cls: 'c1' }
    ], { hl: [{ y: vs, cls: 'theta', lbl: `V*(start) = ${f(vs, 2)}` }], w: 620, h: 130, xlbl: 'episode', empty: 'Run some episodes — each dot is one episode\'s return; the line is a 10-episode moving average.' }) +
      (E.length ? '<div class="rll-key"><span><i class="c3"></i>G₀ of one episode</span><span><i class="c1"></i>moving average (10)</span><span><i class="th"></i>optimal expected return</span></div>' : '');
    $('rll-cs').textContent = E.length ? `last: G₀ = ${f(E[E.length - 1].G, 3)} in ${E[E.length - 1].steps} steps` : '';
    const pb = $('rll-play'); pb.innerHTML = LQ.auto ? '<i data-lucide="pause"></i>Pause' : '<i data-lucide="play"></i>Play'; pb.classList.toggle('on', LQ.auto);
    // message
    const L2 = LQ.last;
    let m;
    if (!E.length && !L2) m = ['try', LQ.algo === 'q' ? 'Q-learning' : 'SARSA', `The agent learns Q(s,a) purely from experience. With probability ε it <b>explores</b> (random action), otherwise it <b>exploits</b> its current best guess. ${LQ.algo === 'q' ? 'Q-learning is <b>off-policy</b>: its target uses max<sub>a′</sub> Q(s′,a′), the greedy action, even when it will actually explore next.' : 'SARSA is <b>on-policy</b>: its target uses the action a′ it will really take, exploration included.'} Try <b>+100 episodes</b>.`];
    else if (L2 && L2.epEnd && !LQ.auto) m = [L2.epEnd.end === 'goal' ? 'ok' : 'bad', `Episode ${L2.epEnd.n}`, `Ended at ${L2.epEnd.end === 'goal' ? 'the goal' : L2.epEnd.end === 'pit' ? 'the pit' : 'the 100-step cap'} after ${L2.epEnd.steps} steps, G₀ = ${f(L2.epEnd.G, 3)}. Greedy policy now matches π* in ${pm}/${NONTERM.length} states.`];
    else if (pm === NONTERM.length) m = ['ok', 'π* found', `The greedy policy argmax<sub>a</sub> Q(s,a) now equals the optimal policy from value iteration in every state — learned <b>without ever seeing P or R</b>. Returns still vary because the world is slippery and ε = ${LQ.epsilon.toFixed(2)} keeps exploring. ${LQ.algo === 'q' ? 'Switch to SARSA with ε = 0.3 and compare the route past the pit.' : 'With ε > 0, SARSA values the cells next to the pit lower because it accounts for its own random slips.'}`];
    else m = ['step', `${E.length} episodes`, `Greedy policy agrees with π* in <b>${pm}/${NONTERM.length}</b> states. Early on returns are low and noisy; as Q fills in, the moving average climbs toward V*(start) = ${f(vs, 2)} (it stays a bit below while ε > 0). ${LQ.epsilon === 0 ? '<b>ε = 0:</b> no exploration — the agent can get stuck with a poor early policy.' : ''}`];
    setMsg(...m);
    if (window.lucide) window.lucide.createIcons();
  }

  function runEpisodes(n) {
    stopTimer();
    const target = LQ.eps.length + n;
    let guard = 0;
    while (LQ.eps.length < target && guard++ < n * (LQ.maxSteps + 2)) qlStep();
  }

  function clickQL(e) {
    const b = e.target.closest('[data-act],[data-algo],[data-qv]');
    if (!b || !root.contains(b)) return;
    if (b.dataset.algo) { LQ.algo = b.dataset.algo; LQ.pendingA = null; updQL(); return; }
    if (b.dataset.qv) { LQ.qView = b.dataset.qv; updQL(); return; }
    const act = b.dataset.act;
    if (act === 'step') { stopTimer(); qlStep(); }
    else if (act === 'resetq') resetLearner();
    else if (act === 'ep1') runEpisodes(1);
    else if (act === 'ep10') runEpisodes(10);
    else if (act === 'ep100') runEpisodes(100);
    else if (act === 'play') { if (LQ.auto) stopTimer(); else startPlay(); }
    updQL();
  }
  function startPlay() {
    stopTimer(); LQ.auto = true;
    timer = setInterval(() => { if (!alive() || view !== 'qlearn') { stopTimer(); return; } qlStep(); updQL(); }, LQ.speed);
  }

  // ================================================================== events
  function onChange(e) {
    const t = e.target;
    if (t.dataset.set) {                       // shared environment settings (γ, noise, living reward)
      const k = t.dataset.set, v = parseFloat(t.value);
      if (k === 'gamma') { S.gamma = v; root.querySelectorAll('[data-gval]').forEach(el => { el.textContent = v.toFixed(2); }); }
      else if (e.type === 'change') S[k] = v; else return;
      if (view === 'vi') { stopTimer(); viReset(); }
      refresh(); return;
    }
    const k = t.dataset.rl; if (!k) return;
    if (k === 'alpha' || k === 'epsilon') { LQ[k] = parseFloat(t.value); root.querySelectorAll(`[data-rlval="${k}"]`).forEach(el => { el.textContent = LQ[k].toFixed(2); }); }
    else if (e.type !== 'change') return;
    else if (k === 'theta') { VI.theta = parseFloat(t.value); VI.done = VI.hist.length ? VI.hist[VI.hist.length - 1].delta < VI.theta : false; }
    else if (k === 'vipi') VI.showPi = t.checked;
    else if (k === 'reveal') LQ.revealStar = t.checked;
    else if (k === 'speed') { LQ.speed = +t.value; if (LQ.auto) startPlay(); }
    refresh();
  }
  function refresh() { ({ bellman: updBellman, vi: updVI, td: updTD, qlearn: updQL })[view](); }

  function onKey(e) {
    if (!alive() || view !== 'td') return;
    const t = e.target;
    if (t && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
    const a = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3 }[e.key];
    if (a === undefined) return;
    e.preventDefault(); tdAct(a);
  }
  let keyBound = false;

  function render(container, which) {
    stopTimer();
    view = ['bellman', 'vi', 'td', 'qlearn'].includes(which) ? which : 'bellman';
    root = document.createElement('div');
    root.className = 'rll-root';
    container.innerHTML = '';
    container.appendChild(root);
    root.addEventListener('click', e => ({ bellman: clickBellman, vi: clickVI, td: clickTD, qlearn: clickQL })[view](e));
    root.addEventListener('input', onChange);
    root.addEventListener('change', onChange);
    if (!keyBound) { document.addEventListener('keydown', onKey); keyBound = true; }
    if (!VI.V) viReset();
    ({ bellman: skelBellman, vi: skelVI, td: skelTD, qlearn: skelQL })[view]();
  }

  window.RLLab = { render, _engine: { VI, LQ, viReset, viSweep, qlStep, learnStep, runEpisodes, resetLearner, policyMatch, star, B, bellmanLines } };
})();
