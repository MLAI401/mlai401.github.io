/**
 * knowledge_lab.js — Topic 05: Knowledge & Reasoning Playground Controller
 * Part of MLAI401 playground.html#view-knowledge
 *
 * Provides 4 Interactive Sub-Labs:
 *   1. Wumpus World Logic Explorer
 *   2. Propositional Logic & Truth-Table Studio
 *   3. Bayesian Network Interactive Workbench
 *   4. Monte Carlo Sampling Visualizer
 */

(function () {
  'use strict';

  const L = window.LogicEngine;
  const B = window.BayesEngine;

  function initKnowledgeLab() {
    const root = document.getElementById('view-knowledge');
    if (!root) return;

    // Sub-tab switching
    const subTabs = root.querySelectorAll('.kl-subtab');
    const subViews = root.querySelectorAll('.kl-subview');

    subTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetId = tab.dataset.target;
        subTabs.forEach(t => t.classList.toggle('active', t === tab));
        subViews.forEach(v => v.classList.toggle('active', v.id === targetId));
      });
    });

    initWumpusLab();
    initLogicStudioLab();
    initBayesWorkbenchLab();
    initSamplingLab();
  }

  // =========================================================================
  // Lab 1: Wumpus World Logic Explorer  (engine: wumpus_engine.js)
  // =========================================================================
  function initWumpusLab() {
    const pane = document.getElementById('kl-wumpus-pane');
    const W = window.WumpusEngine;
    if (!pane || !W) return;

    const st = {
      preset: 'aima', seed: 7, world: null, s: null,
      unique: true, reveal: false, showProb: true,
      mode: 'move', policy: 'gamble', sel: null, hover: null, timer: null
    };

    function newSession(keepWorld) {
      stop();
      if (!keepWorld) st.world = W.World.preset(st.preset, st.seed);
      st.s = new W.Session(st.world, { uniqueWumpus: st.unique });
      st.sel = null;
    }

    function stop() { if (st.timer) { clearInterval(st.timer); st.timer = null; } }
    function play() {
      stop();
      st.timer = setInterval(() => {
        if (!st.s.step(st.policy)) { stop(); }
        if (st.s.over) stop();
        render();
      }, 750);
    }

    const pct = p => `${Math.round(p * 100)}%`;
    const pill = (cls, txt) => `<span class="wq-pill ${cls}">${txt}</span>`;

    function cellStatus(k) {
      const s = st.s, c = s.infer().cells[k];
      if (s.visited.has(k)) return { cls: 'visited', label: 'V', name: 'Visited', pill: pill('neutral', 'Visited') };
      if (c.danger) {
        const lab = [c.pit === 'yes' ? 'P!' : '', c.wumpus === 'yes' && s.wumpusAlive ? 'W!' : ''].filter(Boolean).join(' ');
        return { cls: 'danger', label: lab, name: 'Proven deadly', pill: pill('bad', 'Proven deadly') };
      }
      if (c.safe) return { cls: 'safe', label: 'OK', name: 'Proven safe', pill: pill('ok', 'Proven safe') };
      const maybe = [c.pit === 'maybe' ? 'P?' : '', c.wumpus === 'maybe' && s.wumpusAlive ? 'W?' : ''].filter(Boolean).join(' ');
      if (maybe) return { cls: 'maybe', label: maybe, name: 'Possibly deadly', pill: pill('warn', 'Not entailed — risky') };
      return { cls: 'unknown', label: '?', name: 'Unknown', pill: pill('neutral', 'No information') };
    }

    function cellHTML(k) {
      const s = st.s, inf = s.infer(), c = inf.cells[k];
      const [x, y] = k.split(',');
      const stt = cellStatus(k);
      const here = s.pos === k;
      const sensed = s.sensed.get(k);
      const truth = st.world.contents(k);
      const showTruth = st.reveal || st.mode === 'edit' || s.over;
      const reach = st.mode === 'move' && s.canMoveTo(k) && !s.visited.has(k);
      const cls = ['wq-cell', 'st-' + stt.cls, here ? 'here' : '', reach ? 'reach' : '', st.sel === k ? 'sel' : '',
        (!s.alive && here) ? 'dead' : ''].join(' ');
      const chips = sensed ? [sensed.b ? '<i class="b" title="Breeze">B</i>' : '', sensed.s ? '<i class="s" title="Stench">S</i>' : '',
        (sensed.g && !s.hasGold) || (truth.gold && here && !s.hasGold) ? '<i class="g" title="Glitter">G</i>' : ''].join('') : '';
      const truthIcons = showTruth ? [truth.pit ? '<span title="Pit">🕳️</span>' : '', truth.wumpus ? `<span title="Wumpus">${s.wumpusAlive ? '👹' : '☠️'}</span>` : '',
        truth.gold && !(s.hasGold) ? '<span title="Gold">🪙</span>' : ''].join('') : '';
      let prob = '';
      if (st.showProb && !s.visited.has(k) && !c.safe && !c.danger) {
        const parts = [];
        if (c.pit === 'maybe') parts.push(`P ${pct(c.pPit)}`);
        if (c.wumpus === 'maybe' && s.wumpusAlive) parts.push(`W ${pct(c.pW)}`);
        prob = parts.length ? `<span class="wq-prob">${parts.join(' · ')}</span>` : '';
      }
      const center = here
        ? `<span class="wq-agent">${s.alive ? '🤖' : '💀'}${s.hasGold ? '<small>🪙</small>' : ''}</span>`
        : `<span class="wq-mark">${stt.label}</span>`;
      const title = `[${x},${y}] — ${stt.name}${reach ? ' · click to move here' : ''}`;
      return `<button class="${cls}" data-k="${k}" title="${title}">
        <span class="wq-xy">${x},${y}</span>
        ${truthIcons ? `<span class="wq-truth">${truthIcons}</span>` : ''}
        ${center}
        <span class="wq-foot">${chips ? `<span class="wq-chips">${chips}</span>` : ''}${prob}</span>
      </button>`;
    }

    function inspectorHTML() {
      const s = st.s;
      const k = st.hover || st.sel || s.pos;
      const [x, y] = k.split(',');
      const c = s.infer().cells[k];
      const ex = s.explain(k);
      const stt = cellStatus(k);
      const ans = (v, sym) => v === 'no' ? `<b class="wq-ok">KB ⊨ ¬${sym}</b>`
        : v === 'yes' ? `<b class="wq-bad">KB ⊨ ${sym}</b>` : `<b class="wq-warn">KB ⊭ ${sym}, KB ⊭ ¬${sym}</b>`;
      const sp = `<sub>${x},${y}</sub>`;
      const bar = (p, cls) => `<span class="wq-bar"><span class="${cls}" style="width:${Math.round(p * 100)}%"></span></span>`;
      return `
        <div class="wq-insp-head"><span class="wq-insp-title">ASK(KB, ·) about room [${x},${y}]</span>${stt.pill}</div>
        <div class="wq-insp-row"><div class="wq-insp-q">Pit P${sp}: ${ans(c.pit, 'P' + sp)}</div><div class="wq-insp-why">${ex.pit}</div></div>
        <div class="wq-insp-row"><div class="wq-insp-q">Wumpus W${sp}: ${ans(c.wumpus, 'W' + sp)}</div><div class="wq-insp-why">${ex.wumpus}</div></div>
        <div class="wq-insp-probs">
          <span>P(pit) ${bar(c.pPit, 'p')} <b>${pct(c.pPit)}</b></span>
          <span>P(Wumpus) ${bar(s.wumpusAlive ? c.pW : 0, 'w')} <b>${pct(s.wumpusAlive ? c.pW : 0)}</b></span>
        </div>`;
    }

    function logHTML() {
      return st.s.log.map(e => `<div class="wq-log-row t-${e.type}"><span class="wq-log-t">${e.t}</span><span>${e.html}</span></div>`).join('');
    }

    function axiomsHTML() {
      const ax = W.backgroundAxioms(st.unique);
      const groups = {};
      ax.forEach(a => (groups[a.group] = groups[a.group] || []).push(a.html));
      const g = Object.entries(groups).map(([name, list]) => `
        <div class="wq-ax-group"><div class="wq-ax-name">${name} <span>(${list.length})</span></div>
        ${list.slice(0, name === 'At most one Wumpus' ? 4 : 16).map(h => `<div class="wq-ax">${h}</div>`).join('')}
        ${name === 'At most one Wumpus' ? `<div class="wq-ax wq-muted">… ${list.length - 4} more pairs</div>` : ''}</div>`).join('');
      const tells = st.s.tells.map(t => `<div class="wq-ax"><span class="wq-log-t">${t.t}</span> ${t.html}</div>`).join('');
      return `${g}<div class="wq-ax-group"><div class="wq-ax-name">Percept sentences TELL'd <span>(${st.s.tells.length})</span></div>${tells}</div>`;
    }

    function statusPill() {
      const s = st.s;
      if (!s.alive) return pill('bad', 'Agent died');
      if (s.done) return pill(s.hasGold ? 'ok' : 'neutral', s.hasGold ? 'Escaped with gold' : 'Climbed out');
      if (st.mode === 'edit') return pill('info', 'Editing world');
      if (st.timer) return pill('info', 'Auto-running');
      return pill('neutral', `t = ${s.t}`);
    }

    function nextMoveHTML() {
      const s = st.s;
      if (s.over) {
        const last = [...s.log].reverse().find(e => e.type === 'death' || e.type === 'win');
        return `${last ? last.html : ''} Press <b>Undo</b> to step back or <b>Reset</b> to replay.`;
      }
      if (st.mode === 'edit') return 'Click a room to cycle its contents: empty → pit → Wumpus → gold. [1,1] is always safe. Each edit restarts the agent.';
      const a = s.plan(st.policy);
      if (!a) return '';
      const what = a.type === 'move' ? `move to [${a.target}]` : a.type === 'shoot' ? `shoot ${W.DIR_ARROW[a.dir]}` : a.type;
      return `<b>Logic agent's next action:</b> ${a.why} <b>${what}</b>. Or click a dashed room to move there yourself.`;
    }

    function render() {
      const s = st.s, inf = s.infer();
      const p = s.percept();
      const size = s.kbSize();
      const proven = W.ALL.filter(k => !s.visited.has(k) && inf.cells[k].safe).length;
      const deadly = W.ALL.filter(k => inf.cells[k].danger).length;
      const rows = [];
      for (let y = W.N; y >= 1; y--) for (let x = 1; x <= W.N; x++) rows.push(cellHTML(`${x},${y}`));
      const opt = (arr, val) => arr.map(([k, l]) => `<option value="${k}" ${k === val ? 'selected' : ''}>${l}</option>`).join('');
      const vec = `[${p.stench ? 'Stench' : 'None'}, ${p.breeze ? 'Breeze' : 'None'}, ${p.glitter ? 'Glitter' : 'None'}, ${p.bump ? 'Bump' : 'None'}, ${p.scream ? 'Scream' : 'None'}]`;
      const canShoot = !s.over && s.hasArrow;
      const keepAx = pane.querySelector('.wq-axioms') && pane.querySelector('.wq-axioms').open;

      pane.innerHTML = `
        <div class="playground-grid wq-grid">
          <div class="wq-stage">
            <div class="wq-stage-head">
              <span class="wq-title">${W.PRESETS[st.preset].label}${st.preset === 'random' ? ` · seed ${st.seed}` : ''}</span>
              ${statusPill()}
            </div>
            <div class="wq-board-wrap">
              <div class="wq-board ${st.mode === 'edit' ? 'editing' : ''}">${rows.join('')}</div>
            </div>
            <div class="wq-legend">
              <span><i class="wq-lg visited"></i>V visited</span>
              <span><i class="wq-lg safe"></i>OK proven safe</span>
              <span><i class="wq-lg danger"></i>P! / W! proven</span>
              <span><i class="wq-lg maybe"></i>P? / W? possible</span>
              <span><i class="wq-lg unknown"></i>? no info</span>
              <span><i class="wq-lg reach"></i>can move</span>
              <span class="wq-chips"><i class="b">B</i>breeze <i class="s">S</i>stench <i class="g">G</i>glitter</span>
            </div>
            <div class="wq-msg">${nextMoveHTML()}</div>
            <div class="wq-two">
              <div class="wq-insp">${inspectorHTML()}</div>
              <div class="wq-logbox">
                <div class="wq-insp-head"><span class="wq-insp-title">Agent trace: TELL / ASK / act</span><span class="wq-muted">${s.log.length} entries</span></div>
                <div class="wq-log">${logHTML()}</div>
              </div>
            </div>
          </div>

          <div class="playground-controls glass-panel wq-controls">
            <div class="controls-group">
              <div class="control-label"><span>World</span></div>
              <div class="wq-row">
                <select class="wq-select" id="wq-preset">${opt(Object.entries(W.PRESETS).map(([k, v]) => [k, v.label]), st.preset)}</select>
                <button class="wq-btn" id="wq-new" ${st.preset === 'random' ? '' : 'disabled'} title="New random world"><i data-lucide="shuffle"></i></button>
              </div>
              <div class="wq-seg" id="wq-mode">
                ${[['move', 'Click = move'], ['inspect', 'Click = inspect'], ['edit', 'Edit world']].map(([k, l]) => `<button data-val="${k}" class="${st.mode === k ? 'active' : ''}">${l}</button>`).join('')}
              </div>
              <label class="wq-check"><input type="checkbox" id="wq-reveal" ${st.reveal ? 'checked' : ''}> Reveal the true world (cheat view)</label>
              <label class="wq-check"><input type="checkbox" id="wq-prob" ${st.showProb ? 'checked' : ''}> Show P(pit) / P(Wumpus) on risky rooms <span class="wq-muted">(Ch. 12 preview)</span></label>
            </div>

            <div class="controls-group">
              <div class="control-label"><span>Logic agent</span><span class="wq-muted">AIMA Fig 7.20</span></div>
              <div class="wq-row">
                <button class="wq-btn wq-btn-primary" id="wq-step" ${s.over || st.mode === 'edit' ? 'disabled' : ''}><i data-lucide="step-forward"></i> Step</button>
                <button class="wq-btn" id="wq-play" ${s.over || st.mode === 'edit' ? 'disabled' : ''}><i data-lucide="${st.timer ? 'pause' : 'play'}"></i> ${st.timer ? 'Pause' : 'Auto-run'}</button>
                <button class="wq-btn" id="wq-undo" ${s.canUndo() ? '' : 'disabled'}><i data-lucide="undo-2"></i> Undo</button>
                <button class="wq-btn" id="wq-reset"><i data-lucide="rotate-ccw"></i> Reset</button>
              </div>
              <select class="wq-select" id="wq-policy">${opt([['gamble', 'If nothing is provably safe: gamble on least risk'], ['cautious', 'If nothing is provably safe: go home & climb']], st.policy)}</select>
              <div class="wq-row wq-actions">
                <button class="wq-btn" id="wq-grab" ${!s.over && p.glitter ? '' : 'disabled'}>Grab</button>
                <button class="wq-btn" id="wq-climb" ${!s.over && s.pos === W.START ? '' : 'disabled'}>Climb</button>
                <span class="wq-muted">Shoot</span>
                ${['up', 'right', 'down', 'left'].map(d => `<button class="wq-btn wq-shoot" data-dir="${d}" ${canShoot ? '' : 'disabled'} title="Shoot ${d}">${W.DIR_ARROW[d]}</button>`).join('')}
              </div>
            </div>

            <div class="controls-group">
              <div class="control-label"><span>Knowledge base</span></div>
              <label class="wq-check"><input type="checkbox" id="wq-unique" ${st.unique ? 'checked' : ''}> "Exactly one Wumpus" axiom <span class="wq-muted">(+121 sentences)</span></label>
              <details class="wq-axioms" ${keepAx ? 'open' : ''}><summary>View KB sentences (${size.axioms + size.percepts})</summary><div class="wq-ax-list">${axiomsHTML()}</div></details>
            </div>

            <div class="playground-stats">
              <div class="pg-stat-row"><span>Percept at [${s.pos}]</span><span class="pg-stat-val wq-mono">${vec}</span></div>
              <div class="pg-stat-row"><span>KB size (axioms + percepts)</span><span class="pg-stat-val">${size.axioms} + ${size.percepts}</span></div>
              <div class="pg-stat-row"><span>Frontier models (pit × Wumpus)</span><span class="pg-stat-val">${inf.pit.models} × ${inf.wumpus.models}</span></div>
              <div class="pg-stat-row"><span>Rooms proven safe / deadly (unvisited)</span><span class="pg-stat-val"><span class="wq-ok">${proven}</span> / <span class="wq-bad">${deadly}</span></span></div>
              <div class="pg-stat-row"><span>Arrow · Gold · Wumpus</span><span class="pg-stat-val">${s.hasArrow ? '🏹' : '—'} · ${s.hasGold ? '🪙' : '—'} · ${s.wumpusAlive ? 'alive' : 'dead'}</span></div>
              <div class="pg-stat-row"><span>Actions · Score</span><span class="pg-stat-val">${s.actions} · <span class="${s.score < 0 ? 'wq-bad' : 'wq-ok'}">${s.score}</span></span></div>
            </div>
            <div class="teaching-tip"><i data-lucide="lightbulb"></i><span>${tipText()}</span></div>
          </div>
        </div>`;

      bind();
      const logEl = pane.querySelector('.wq-log');
      if (logEl) logEl.scrollTop = logEl.scrollHeight;
      if (window.lucide) window.lucide.createIcons();
    }

    function tipText() {
      switch (st.preset) {
        case 'aima': return 'This is the world of AIMA §7.2. Step to <b>[2,1]</b> then <b>[1,2]</b>: from <i>S<sub>1,2</sub></i> and <i>¬S<sub>2,1</sub></i> the KB proves the Wumpus is in <b>[1,3]</b>, and from <i>B<sub>2,1</sub></i> and <i>¬B<sub>1,2</sub></i> it proves the pit is in <b>[3,1]</b>. Untick the "exactly one Wumpus" axiom and see which conclusions disappear.';
        case 'stuck': return 'After [1,2] and [2,1] both have a breeze, no frontier room is entailed safe: pure logic is stuck. Turn on P(pit): model counting gives 31% / 86% / 31% — exactly AIMA §12.7. A probabilistic agent picks [1,3] or [3,1], never [2,2].';
        case 'breezy': return 'A breeze in [1,1] means P<sub>1,2</sub> ∨ P<sub>2,1</sub> — each is possible, neither is provable. Compare the two risk policies: "go home" scores −1 safely, "gamble" risks −1000 for a chance at +1000.';
        default: return 'Random worlds follow AIMA: each room holds a pit with probability 0.2. Over 500 of them the cautious agent never dies and returns with gold 40% of the time; the gambling agent gets the gold 62% of the time but dies in 37%. Use <b>Undo</b> to explore what the KB knew right before a fatal guess.';
      }
    }

    function bind() {
      const $ = id => pane.querySelector('#' + id);
      $('wq-preset').addEventListener('change', e => { st.preset = e.target.value; newSession(false); render(); });
      $('wq-new').addEventListener('click', () => { st.seed = Math.floor(Math.random() * 1e6); newSession(false); render(); });
      $('wq-mode').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { stop(); st.mode = b.dataset.val; render(); }));
      $('wq-reveal').addEventListener('change', e => { st.reveal = e.target.checked; render(); });
      $('wq-prob').addEventListener('change', e => { st.showProb = e.target.checked; render(); });
      $('wq-unique').addEventListener('change', e => { st.unique = e.target.checked; st.s.setUniqueWumpus(st.unique); render(); });
      $('wq-policy').addEventListener('change', e => { st.policy = e.target.value; render(); });
      $('wq-step').addEventListener('click', () => { stop(); st.s.step(st.policy); render(); });
      $('wq-play').addEventListener('click', () => { if (st.timer) stop(); else play(); render(); });
      $('wq-undo').addEventListener('click', () => { stop(); st.s.undo(); render(); });
      $('wq-reset').addEventListener('click', () => { newSession(true); render(); });
      $('wq-grab').addEventListener('click', () => { stop(); st.s.grab(); render(); });
      $('wq-climb').addEventListener('click', () => { stop(); st.s.climb(); render(); });
      pane.querySelectorAll('.wq-shoot').forEach(b => b.addEventListener('click', () => { stop(); st.s.shoot(b.dataset.dir); render(); }));

      const insp = pane.querySelector('.wq-insp');
      pane.querySelectorAll('.wq-cell').forEach(el => {
        const k = el.dataset.k;
        el.addEventListener('mouseenter', () => { st.hover = k; insp.innerHTML = inspectorHTML(); });
        el.addEventListener('mouseleave', () => { st.hover = null; insp.innerHTML = inspectorHTML(); });
        el.addEventListener('click', () => {
          st.hover = null;
          if (st.mode === 'edit') {
            st.world.cycle(k);
            newSession(true);
          } else if (st.mode === 'move' && st.s.canMoveTo(k)) {
            stop();
            st.s.moveTo(k);
            st.sel = null;
          } else {
            st.sel = st.sel === k ? null : k;
          }
          render();
        });
      });
    }

    newSession(false);
    render();
  }

  // =========================================================================
  // Lab 2: Propositional Logic Studio
  // =========================================================================
  function initLogicStudioLab() {
    const input = document.getElementById('kl-logic-input');
    const evalBtn = document.getElementById('kl-logic-eval-btn');
    const tableContainer = document.getElementById('kl-logic-tt-output');
    const cnfContainer = document.getElementById('kl-logic-cnf-output');

    if (!evalBtn || !input) return;

    evalBtn.addEventListener('click', () => {
      const formula = input.value.trim();
      if (!formula) return;

      try {
        // Evaluate Truth Table (guard: 2^n rows would freeze the page)
        const nSyms = L.getPropSymbols(L.parseExpr(formula)).length;
        if (nSyms > 10) throw new Error(`Formula has ${nSyms} symbols; truth table limited to 10 (2^10 = 1024 rows).`);
        const ttRes = L.ttEntails([], formula);
        if (tableContainer) {
          tableContainer.innerHTML = `
            <table style="width: 100%; font-size: 0.75rem; text-align: center; border-collapse: collapse; font-family: monospace;">
              <thead>
                <tr style="color: #64748b; border-bottom: 1px solid rgba(15,23,42,0.1);">
                  ${ttRes.symbols.map(s => `<th style="padding: 4px;">${s}</th>`).join('')}
                  <th style="color: #0284c7;">Output</th>
                </tr>
              </thead>
              <tbody>
                ${ttRes.rows.map(r => `
                  <tr style="border-bottom: 1px solid rgba(15,23,42,0.05);">
                    ${ttRes.symbols.map(s => `<td>${r.model[s] ? 'T' : 'F'}</td>`).join('')}
                    <td style="font-weight: 700; color: ${r.alphaVal ? '#10b981' : '#f43f5e'};">${r.alphaVal ? 'T' : 'F'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `;
        }

        // CNF Pipeline
        const cnfRes = L.toCNF(formula);
        if (cnfContainer) {
          cnfContainer.innerHTML = cnfRes.steps.map(s => `
            <div style="margin-bottom: 6px; padding: 6px 8px; background: rgba(15,23,42,0.04); border-radius: 6px; font-size: 0.75rem;">
              <span style="color: #64748b;">${s.title}:</span>
              <div style="font-family: monospace; color: var(--text-primary); margin-top: 2px;">${s.expr}</div>
            </div>
          `).join('');
        }
      } catch (err) {
        if (tableContainer) tableContainer.innerHTML = `<div style="color: #f43f5e; font-size: 0.8rem;">Syntax Error: ${err.message}</div>`;
      }
    });

    // Initial trigger
    evalBtn.click();
  }

  // =========================================================================
  // Lab 3: Bayesian Network Interactive Workbench
  // =========================================================================
  function initBayesWorkbenchLab() {
    const netSelect = document.getElementById('kl-bayes-net-select');
    const netContainer = document.getElementById('kl-bayes-dag-container');
    const postContainer = document.getElementById('kl-bayes-posteriors');

    let currentNet = B.createAlarmNet();
    let currentEvidence = {};

    function updateWorkbench() {
      const netType = netSelect ? netSelect.value : 'alarm';
      if (netType === 'alarm') currentNet = B.createAlarmNet();
      else if (netType === 'wetgrass') currentNet = B.createWetGrassNet();
      else currentNet = B.createMedicalNet();

      renderDAG();
      renderPosteriors();
    }

    function renderDAG() {
      if (!netContainer) return;
      netContainer.innerHTML = `
        <svg viewBox="0 0 560 380" style="width: 100%; height: 100%;">
          <defs>
            <marker id="kl-arrow" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="12" markerHeight="12" markerUnits="userSpaceOnUse" orient="auto">
              <path d="M 1 1.5 L 11 6 L 1 10.5 L 3.5 6 z" fill="#475569"/>
            </marker>
            <marker id="kl-arrow-active" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="12" markerHeight="12" markerUnits="userSpaceOnUse" orient="auto">
              <path d="M 1 1.5 L 11 6 L 1 10.5 L 3.5 6 z" fill="#4f46e5"/>
            </marker>
          </defs>
          ${currentNet.nodes.map(n => {
            return n.parents.map(p => {
              const pNode = currentNet.getNode(p);
              // Trim the edge so it starts/ends at the circle boundaries (r = 26)
              // and the arrowhead tip touches the child node instead of hiding under it.
              const R = 26, GAP = 3;
              const dx = n.meta.x - pNode.meta.x, dy = n.meta.y - pNode.meta.y;
              const len = Math.hypot(dx, dy) || 1;
              const ux = dx / len, uy = dy / len;
              const x1 = pNode.meta.x + ux * (R + 1), y1 = pNode.meta.y + uy * (R + 1);
              const x2 = n.meta.x - ux * (R + GAP), y2 = n.meta.y - uy * (R + GAP);
              const active = (p in currentEvidence) || (n.var in currentEvidence);
              return `<line class="kl-bn-edge" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"
                        stroke="${active ? '#4f46e5' : '#475569'}" stroke-width="2.2" stroke-linecap="round"
                        marker-end="url(#${active ? 'kl-arrow-active' : 'kl-arrow'})"><title>${p} → ${n.var}</title></line>`;
            }).join('');
          }).join('')}

          ${currentNet.nodes.map(n => {
            const isObserved = n.var in currentEvidence;
            const obsVal = currentEvidence[n.var];
            let fill = '#eef2ff';
            if (isObserved) fill = obsVal ? '#10b981' : '#f43f5e';

            return `
              <g class="kl-bn-node" data-var="${n.var}" style="cursor: pointer;">
                <circle cx="${n.meta.x}" cy="${n.meta.y}" r="26" fill="${fill}" stroke="#4f46e5" stroke-width="2"/>
                <text x="${n.meta.x}" y="${n.meta.y + 4}" fill="${isObserved ? '#fff' : '#312e81'}" font-size="11" font-weight="700" text-anchor="middle">${n.var.slice(0, 2)}</text>
                <text x="${n.meta.x}" y="${n.meta.y + 38}" fill="#334155" font-size="10" text-anchor="middle" stroke="#ffffff" stroke-width="3" paint-order="stroke">${n.meta.label || n.var}</text>
              </g>
            `;
          }).join('')}
        </svg>
      `;

      netContainer.querySelectorAll('.kl-bn-node').forEach(g => {
        g.addEventListener('click', () => {
          const v = g.dataset.var;
          if (!(v in currentEvidence)) {
            currentEvidence[v] = true;
          } else if (currentEvidence[v] === true) {
            currentEvidence[v] = false;
          } else {
            delete currentEvidence[v];
          }
          renderDAG();
          renderPosteriors();
        });
      });
    }

    function renderPosteriors() {
      if (!postContainer) return;
      postContainer.innerHTML = currentNet.variables.map(v => {
        const isObs = v in currentEvidence;
        let pTrue = 0.5;
        if (isObs) {
          pTrue = currentEvidence[v] ? 1.0 : 0.0;
        } else {
          const res = B.enumerationAsk(v, currentEvidence, currentNet);
          pTrue = res.true;
        }

        return `
          <div style="margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.78rem; margin-bottom: 2px;">
              <span style="color: var(--text-primary); font-weight: 600;">${v} ${isObs ? `(Observed: ${currentEvidence[v] ? 'T' : 'F'})` : ''}</span>
              <strong style="color: #4f46e5;">${(pTrue * 100).toFixed(1)}%</strong>
            </div>
            <div style="height: 8px; border-radius: 4px; background: rgba(15,23,42,0.06); overflow: hidden;">
              <div style="height: 100%; width: ${pTrue * 100}%; background: ${isObs ? (currentEvidence[v] ? '#10b981' : '#f43f5e') : 'linear-gradient(90deg, #6366f1, #0284c7)'}; transition: width 0.2s;"></div>
            </div>
          </div>
        `;
      }).join('');
    }

    if (netSelect) {
      netSelect.addEventListener('change', () => {
        currentEvidence = {};
        updateWorkbench();
      });
    }

    updateWorkbench();
  }

  // =========================================================================
  // Lab 4: Monte Carlo Sampling Visualizer
  // =========================================================================
  function initSamplingLab() {
    const net = B.createAlarmNet();
    const runBtn = document.getElementById('kl-sampling-run-btn');
    const sampleCountSelect = document.getElementById('kl-sampling-n-select');
    const outputRej = document.getElementById('kl-sampling-rej-out');
    const outputLW = document.getElementById('kl-sampling-lw-out');

    if (!runBtn) return;

    runBtn.addEventListener('click', () => {
      const N = sampleCountSelect ? parseInt(sampleCountSelect.value, 10) : 5000;
      const evidence = { JohnCalls: true, MaryCalls: true };

      const rejRes = B.rejectionSampling('Burglary', evidence, net, N);
      const lwRes = B.likelihoodWeighting('Burglary', evidence, net, N);

      if (outputRej) {
        outputRej.innerHTML = `
          <div style="font-size: 1.25rem; font-weight: 800; color: var(--text-primary);">${(rejRes.distribution.true * 100).toFixed(1)}%</div>
          <div style="font-size: 0.75rem; color: #64748b; margin-top: 4px;">
            Accepted ${rejRes.accepted} / ${N} samples (${(rejRes.acceptanceRate * 100).toFixed(2)}% efficiency)
          </div>
        `;
      }

      if (outputLW) {
        outputLW.innerHTML = `
          <div style="font-size: 1.25rem; font-weight: 800; color: #10b981;">${(lwRes.distribution.true * 100).toFixed(1)}%</div>
          <div style="font-size: 0.75rem; color: #047857; margin-top: 4px;">
            Utilized all ${N} samples (100% sample efficiency)
          </div>
        `;
      }
    });

    runBtn.click();
  }

  // --- Auto-init ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initKnowledgeLab);
  } else {
    initKnowledgeLab();
  }
})();
