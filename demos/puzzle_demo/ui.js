/**
 * UI and Canvas Visualizer Engine for the 8-Puzzle State-Space Demo.
 *
 * Steps
 *   0  Puzzle setup                 3  Search tree (BFS / DFS / IDS / Greedy / A*)
 *   1  State representation         4  Reachability test (goal presets)
 *   2  Actions & RESULT
 */
const PZ = {
  indigo: '#4f46e5', indigoSoft: '#e0e7ff', green: '#10b981', greenDark: '#047857',
  red: '#ef4444', redDark: '#b91c1c', amber: '#f59e0b', amberDark: '#b45309',
  ink: '#0f172a', slate: '#475569', muted: '#64748b', faint: '#94a3b8', line: '#e2e8f0', bg: '#f8fafc'
};
const fmt = n => n.toLocaleString('en-US');

class PuzzleDemoUI {
  constructor() {
    this.initialTiles = [7, 2, 4, 5, 0, 6, 8, 3, 1];
    this.goalTiles = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    this.initialState = new PuzzleState(this.initialTiles);
    this.goalState = new PuzzleState(this.goalTiles);
    this.currentState = new PuzzleState(this.initialTiles);

    this.customGoalTiles = [...this.goalTiles];
    this.customGoalState = new PuzzleState(this.customGoalTiles);

    this.canvas = document.getElementById('puzzle-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.stepIndicators = document.querySelectorAll('.puzzle-flow-step');
    this.stepPanels = document.querySelectorAll('.puzzle-teaching-panel');
    this.lastStep = this.stepPanels.length - 1;
    this.btnPrev = document.getElementById('btn-puzzle-prev');
    this.btnNext = document.getElementById('btn-puzzle-next');
    this.puzManualLog = document.getElementById('puz-manual-log');
    this.puzGoalStatus = document.getElementById('puz-goal-status');

    this.currentStep = 0;

    // Step 1: build-a-state (null = empty square, filled in reading order)
    this.repTiles = [...this.initialTiles];
    // Step 3: search tree player
    this.st = { alg: 'BFS', preset: 'a', steps: [], idx: 0, timer: null, speed: 3 };
    // Step 4: whole-space BFS table (shortest distances), computed on demand
    this.bfs = null;

    this.init();
  }

  $(id) { return document.getElementById(id); }
  on(id, ev, fn) { const el = this.$(id); if (el) el.addEventListener(ev, fn); }

  init() {
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    this.btnPrev.addEventListener('click', () => this.setStep(this.currentStep - 1));
    this.btnNext.addEventListener('click', () => this.setStep(this.currentStep + 1));
    this.stepIndicators.forEach((ind, index) => ind.addEventListener('click', () => this.setStep(index)));

    // Step 1: build a state
    document.querySelectorAll('.puz-rep-pick').forEach(b => b.addEventListener('click', () => this.repPlace(parseInt(b.dataset.piece, 10))));
    this.on('btn-puz-rep-undo', 'click', () => { const k = this.repFilled(); if (k > 0) { this.repTiles[k - 1] = null; this.repRefresh(); } });
    this.on('btn-puz-rep-clear', 'click', () => { this.repTiles = new Array(9).fill(null); this.repRefresh(); });
    this.on('btn-puz-rep-random', 'click', () => { const t = [0, 1, 2, 3, 4, 5, 6, 7, 8]; for (let i = 8; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [t[i], t[j]] = [t[j], t[i]]; } this.repTiles = t; this.repRefresh(); });
    this.on('btn-puz-rep-next', 'click', () => this.repStep(+1));
    this.on('btn-puz-rep-prev', 'click', () => this.repStep(-1));

    // Step 2: actions & RESULT
    ['Up', 'Down', 'Left', 'Right'].forEach(a => this.on(`btn-puz-${a.toLowerCase()}`, 'click', () => this.applyAction(a)));

    // Step 3: search tree
    document.querySelectorAll('.puz-alg-btn').forEach(b => b.addEventListener('click', () => {
      document.querySelectorAll('.puz-alg-btn').forEach(x => x.classList.toggle('active', x === b));
      this.st.alg = b.dataset.alg; this.stBuild();
    }));
    this.on('puz-st-start', 'change', e => { this.st.preset = e.target.value; this.stBuild(); });
    this.on('btn-puz-st-prev', 'click', () => { this.stStop(); this.stGo(this.st.idx - 1); });
    this.on('btn-puz-st-next', 'click', () => { this.stStop(); this.stGo(this.st.idx + 1); });
    this.on('btn-puz-st-reset', 'click', () => { this.stStop(); this.stGo(0); });
    this.on('btn-puz-st-play', 'click', () => this.stPlay());
    this.on('btn-puz-st-pause', 'click', () => this.stStop());
    this.on('puz-st-speed', 'input', e => { this.st.speed = parseInt(e.target.value, 10); if (this.st.timer) { this.stStop(); this.stPlay(); } });

    // Step 4: goal presets
    const setGoal = tiles => { this.customGoalTiles = tiles; this.customGoalState = new PuzzleState(tiles); this.updateGoalStatus(); this.draw(); };
    this.on('btn-puz-goal-solvable', 'click', () => setGoal([...this.goalTiles]));
    this.on('btn-puz-goal-unsolvable', 'click', () => setGoal([0, 1, 2, 3, 4, 5, 6, 8, 7]));
    this.on('btn-puz-goal-swap', 'click', () => {
      // Swap two random tiles (never the blank): always flips parity.
      const t = [...this.customGoalTiles];
      const idx = t.map((v, i) => (v === 0 ? -1 : i)).filter(i => i >= 0);
      const i = idx.splice(Math.floor(Math.random() * idx.length), 1)[0];
      const j = idx[Math.floor(Math.random() * idx.length)];
      [t[i], t[j]] = [t[j], t[i]];
      this.lastSwap = [t[j], t[i]];
      setGoal(t);
    });
    this.on('btn-puz-goal-random', 'click', () => {
      const t = [0, 1, 2, 3, 4, 5, 6, 7, 8];
      for (let i = 8; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [t[i], t[j]] = [t[j], t[i]]; }
      this.lastSwap = null;
      setGoal(t);
    });

    window.addEventListener('keydown', e => {
      const view = document.getElementById('view-puzzle');
      if (view && !view.classList.contains('active')) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target.tagName || ''))) return;
      let action = null;
      if (['ArrowUp', 'KeyW'].includes(e.code)) action = 'Up';
      else if (['ArrowDown', 'KeyS'].includes(e.code)) action = 'Down';
      else if (['ArrowLeft', 'KeyA'].includes(e.code)) action = 'Left';
      else if (['ArrowRight', 'KeyD'].includes(e.code)) action = 'Right';
      if (!action) return;
      if (this.currentStep === 2) { e.preventDefault(); this.applyAction(action); }
    });

    this.setStep(0);
  }

  resizeCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.draw();
  }

  setStep(step) {
    if (step < 0 || step > this.lastStep) return;
    if (step !== 3) this.stStop();
    this.currentStep = step;
    this.stepIndicators.forEach((ind, i) => { ind.classList.toggle('active', i === step); ind.classList.toggle('completed', i < step); });
    this.stepPanels.forEach((p, i) => p.classList.toggle('active', i === step));
    this.btnPrev.disabled = step === 0;
    this.btnNext.textContent = step === this.lastStep ? 'Finished' : 'Next Step';
    this.btnNext.disabled = step === this.lastStep;

    if (step === 1) {
      this.repRefresh();
    } else if (step === 2) {
      this.currentState = new PuzzleState(this.initialTiles);
      if (this.puzManualLog) this.puzManualLog.innerHTML = `<div class="log-entry">State s0: <strong>${this.currentState.toString()}</strong></div>`;
      this.updateActionButtons(this.currentState, 'puz');
    } else if (step === 3) {
      if (!this.st.steps.length) this.stBuild();
    } else if (step === 4) {
      this.updateGoalStatus();
    }
    this.draw();
  }

  // ---------------------------------------------------------------------------
  // Step 1: build a state / count 9!
  // ---------------------------------------------------------------------------

  repFilled() { const k = this.repTiles.indexOf(null); return k === -1 ? 9 : k; }

  repPlace(piece) {
    const k = this.repFilled();
    if (k >= 9 || this.repTiles.includes(piece)) return;
    this.repTiles[k] = piece;
    this.repRefresh();
  }

  /** Move to the next / previous arrangement in lexicographic order (= rank ± 1). */
  repStep(dir) {
    if (this.repFilled() < 9) return;
    const r = (Reachability.rank(this.repTiles) + dir + 362880) % 362880;
    this.repTiles = Reachability.unrank(r);
    this.repRefresh();
  }

  repRefresh() {
    const k = this.repFilled(), full = k === 9;
    document.querySelectorAll('.puz-rep-pick').forEach(b => { b.disabled = full || this.repTiles.includes(parseInt(b.dataset.piece, 10)); });
    const set = (id, v) => { const el = this.$(id); if (el) el.innerHTML = v; };
    set('puz-rep-tuple', `state = (${this.repTiles.map(v => (v === null ? '?' : v)).join(', ')})`);
    set('puz-rep-prompt', full ? 'Board full: every piece is placed.' : `Square ${k + 1}: choose one of the <strong>${9 - k}</strong> pieces left`);
    ['btn-puz-rep-prev', 'btn-puz-rep-next'].forEach(id => { const b = this.$(id); if (b) b.disabled = !full; });
    const u = this.$('btn-puz-rep-undo'); if (u) u.disabled = k === 0;
    if (this.currentStep === 1) this.draw();
  }

  // ---------------------------------------------------------------------------
  // Step 2: actions
  // ---------------------------------------------------------------------------

  updateActionButtons(state, prefix) {
    const legal = state.getLegalActions();
    ['Up', 'Down', 'Left', 'Right'].forEach(a => { const b = this.$(`btn-${prefix}-${a.toLowerCase()}`); if (b) b.disabled = !legal.includes(a); });
  }

  applyAction(action) {
    const state = this.currentState;
    if (!state.getLegalActions().includes(action)) return;
    const next = state.transition(action);
    if (this.puzManualLog) {
      const row = document.createElement('div');
      row.className = 'log-entry';
      row.innerHTML = `RESULT(${state.toString()}, <span style="color:#38bdf8;">${action}</span>) = <strong>${next.toString()}</strong>`;
      this.puzManualLog.appendChild(row);
      this.puzManualLog.scrollTop = this.puzManualLog.scrollHeight;
    }
    this.currentState = next;
    this.updateActionButtons(next, 'puz');
    this.draw();
  }

  // ---------------------------------------------------------------------------
  // Step 3: search tree player
  // ---------------------------------------------------------------------------

  static get PRESETS() {
    return {
      a: { tiles: [3, 1, 2, 4, 0, 5, 6, 7, 8], depth: 2 },
      b: { tiles: [1, 4, 2, 3, 0, 5, 6, 7, 8], depth: 2 },
      c: { tiles: [1, 2, 0, 3, 4, 5, 6, 7, 8], depth: 2 }
    };
  }

  stBuild() {
    this.stStop();
    const p = PuzzleDemoUI.PRESETS[this.st.preset];
    this.st.steps = PuzzleSearchTrace.run(p.tiles, this.st.alg, 2);
    this.stGo(0);
  }

  stGo(i) {
    const st = this.st;
    st.idx = Math.max(0, Math.min(st.steps.length - 1, i));
    this.stPanel();
    if (this.currentStep === 3) this.draw();
  }

  stPlay() {
    const st = this.st;
    if (st.idx >= st.steps.length - 1) st.idx = 0;
    const delay = [1300, 850, 550, 300, 140][st.speed - 1] || 550;
    this.stStop();
    st.timer = setInterval(() => {
      if (st.idx >= st.steps.length - 1) { this.stStop(); return; }
      this.stGo(st.idx + 1);
    }, delay);
    this.stPanel();
  }

  stStop() {
    if (this.st && this.st.timer) { clearInterval(this.st.timer); this.st.timer = null; }
    if (this.st && this.st.steps.length) this.stPanel();
  }

  stPanel() {
    const st = this.st, step = st.steps[st.idx];
    if (!step) return;
    const set = (id, v) => { const el = this.$(id); if (el) el.innerHTML = v; };
    const names = { BFS: 'BFS', DFS: 'DFS', IDS: 'IDS', GREEDY: 'Greedy', ASTAR: 'A*' };
    set('puz-st-msg', `<strong>Step ${st.idx} / ${st.steps.length - 1}.</strong> ${step.msg}`);
    set('puz-st-frontier', step.frontier.length);
    const limited = st.alg === 'DFS' || st.alg === 'IDS';
    set('puz-st-reached-label', limited ? 'Depth limit' : 'Reached');
    set('puz-st-reached', limited ? step.limit : step.reachedSize);
    set('puz-st-expanded', step.expandedTotal);
    set('puz-st-extra', step.generated);
    set('puz-st-alg-name', names[st.alg]);
    const badge = this.$('puz-st-badge');
    const optimalDepth = PuzzleDemoUI.PRESETS[st.preset].depth;
    if (step.solution) {
      const acts = step.solution.slice(1).map(id => step.nodes[id].action[0]);
      set('puz-st-path', ['<span class="path-node-pill start">s₀</span>']
        .concat(acts.map((a, i) => `<span class="path-arrow">→</span><span class="path-node-pill${i === acts.length - 1 ? ' goal' : ''}">${a}</span>`)).join(' '));
      set('puz-st-len', acts.length);
      set('puz-st-opt', acts.length === optimalDepth ? 'Yes ✓' : `No (best is ${optimalDepth})`);
      set('puz-st-gen', step.generated);
      if (badge) { badge.textContent = 'Goal found'; badge.className = 'search-solution-badge success'; }
    } else {
      set('puz-st-path', '<span class="path-placeholder">Step through or click Auto to find the goal...</span>');
      set('puz-st-len', '-'); set('puz-st-opt', '-'); set('puz-st-gen', '-');
      if (badge) {
        const stopped = step.phase === 'fail';
        badge.textContent = stopped ? 'Stopped' : `Step ${st.idx} / ${st.steps.length - 1}`;
        badge.className = 'search-solution-badge' + (stopped ? ' danger' : ' warning');
      }
    }
    const dis = (id, v) => { const el = this.$(id); if (el) el.disabled = v; };
    dis('btn-puz-st-prev', st.idx === 0);
    dis('btn-puz-st-next', st.idx >= st.steps.length - 1);
    dis('btn-puz-st-play', !!st.timer);
    dis('btn-puz-st-pause', !st.timer);
  }

  ensureBfs() {
    if (!this.bfs) this.bfs = Reachability.exploreAll(this.initialTiles);
    return this.bfs;
  }

  // ---------------------------------------------------------------------------
  // Step 4: goal check
  // ---------------------------------------------------------------------------

  updateGoalStatus() {
    if (!this.puzGoalStatus) return;
    const invI = Reachability.getInversions(this.initialTiles);
    const invG = Reachability.getInversions(this.customGoalTiles);
    const pI = invI % 2 === 0 ? 'even' : 'odd', pG = invG % 2 === 0 ? 'even' : 'odd';
    const d = this.ensureBfs().dist[Reachability.rank(this.customGoalTiles)];
    const ok = d >= 0;
    const swapNote = this.lastSwap ? `<br>Last change: swapped tiles ${this.lastSwap[0]} and ${this.lastSwap[1]}, which flips the parity.` : '';
    this.puzGoalStatus.innerHTML = `
      <div style="color:${ok ? PZ.green : PZ.red}; font-weight:bold; display:flex; align-items:center; gap:0.25rem;">
        <span style="font-size:1.2rem;">${ok ? '✓' : '✗'}</span> ${ok ? `Reachable: ${d} moves at minimum (from BFS)` : 'Not reachable from the initial state'}
      </div>
      <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:0.2rem;">
        Initial: <strong>${invI}</strong> inversions (${pI}) · Goal: <strong>${invG}</strong> inversions (${pG})${ok ? '' : ' — parities differ'}${swapNote}
      </div>`;
  }

  // ---------------------------------------------------------------------------
  // Drawing
  // ---------------------------------------------------------------------------

  draw() {
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);
    if (!w || !h) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, w, h);
    ctx.textBaseline = 'alphabetic';

    switch (this.currentStep) {
      case 0: {
        const s = Math.min(w * 0.35, h * 0.7);
        this.drawPuzzleBoard(this.initialTiles, w * 0.12, (h - s) / 2, s, 'Initial State');
        this.drawPuzzleBoard(this.goalTiles, w * 0.52, (h - s) / 2, s, 'Goal State');
        break;
      }
      case 1: this.drawRepresentation(w, h); break;
      case 2: {
        // Same board size and positions as the Puzzle Setup step, so the puzzle doesn't jump in size.
        const s = Math.min(w * 0.35, h * 0.7);
        this.drawPuzzleBoard(this.currentState.tiles, w * 0.12, (h - s) / 2, s, 'Current State s (press arrows to move the blank)');
        this.drawPuzzleBoard(this.goalTiles, w * 0.52, (h - s) / 2, s, 'Goal State');
        break;
      }
      case 3: this.drawSearchTree(w, h); break;
      case 4: this.drawGoalTest(w, h); break;
    }
  }

  text(str, x, y, { size = 12, weight = 'normal', color = PZ.ink, align = 'left', base = 'alphabetic', family = 'Outfit, sans-serif' } = {}) {
    const ctx = this.ctx;
    ctx.font = `${weight} ${size}px ${family}`;
    ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = base;
    ctx.fillText(str, x, y);
  }

  pill(str, x, y, color, { size = 11, align = 'left' } = {}) {
    const ctx = this.ctx;
    ctx.font = `bold ${size}px Outfit, sans-serif`;
    const tw = ctx.measureText(str).width, pw = tw + 16, ph = size + 9;
    const px = align === 'center' ? x - pw / 2 : align === 'right' ? x - pw : x;
    ctx.fillStyle = color; ctx.beginPath(); this.roundRect(px, y, pw, ph, ph / 2); ctx.fill();
    this.text(str, px + pw / 2, y + ph / 2 + 0.5, { size, weight: 'bold', color: '#fff', align: 'center', base: 'middle' });
    return pw;
  }

  /** Standard board. opts: { indices, highlightTile, ghostIndex, mini } */
  drawPuzzleBoard(tiles, px, py, size, label = null, reachabilityStatus = null, opts = {}) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(15, 23, 42, 0.05)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
    ctx.beginPath(); this.roundRect(px, py, size, size, Math.max(6, size * 0.06)); ctx.fill();
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.06)'; ctx.lineWidth = 1.5; ctx.stroke();
    if (label) this.text(label, px + size / 2, py - 12, { size: 12, weight: 'bold', color: PZ.slate, align: 'center' });

    const pad = size * 0.04, tileSize = (size - pad * 2) / 3;
    for (let i = 0; i < 9; i++) {
      const v = tiles[i];
      const x = px + pad + (i % 3) * tileSize, y = py + pad + Math.floor(i / 3) * tileSize;
      const ts = tileSize - pad * 0.5, r = Math.max(3, ts * 0.1);
      ctx.beginPath(); this.roundRect(x, y, ts, ts, r);
      if (v === 0) {
        ctx.fillStyle = '#f1f5f9'; ctx.fill();
        if (opts.ghostIndex === i) { ctx.setLineDash([4, 3]); ctx.strokeStyle = PZ.amber; ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]); }
      } else {
        const hl = opts.highlightTile === v;
        ctx.fillStyle = hl ? PZ.amber : PZ.indigo; ctx.fill();
        this.text(String(v), x + ts / 2, y + ts / 2 + 1, { size: Math.round(tileSize * 0.38), weight: 'bold', color: '#fff', align: 'center', base: 'middle' });
        if (opts.indices) this.text(`idx:${i}`, x + 5, y + ts - 5, { size: 9, weight: 'bold', color: 'rgba(255,255,255,0.45)', base: 'bottom', family: 'monospace' });
      }
    }
    if (reachabilityStatus !== null) {
      ctx.fillStyle = reachabilityStatus ? 'rgba(16,185,129,0.92)' : 'rgba(239,68,68,0.92)';
      ctx.beginPath(); ctx.arc(px + size - 14, py + 14, 12, 0, 2 * Math.PI); ctx.fill();
      this.text(reachabilityStatus ? '✓' : '✗', px + size - 14, py + 15, { size: 11, weight: 'bold', color: '#fff', align: 'center', base: 'middle', family: 'sans-serif' });
    }
    ctx.restore();
  }

  drawArrayRepresentation(tiles, px, py, size) {
    const ctx = this.ctx, boxW = size / 9, gap = 2;
    this.text('INTERNAL MEMORY ARRAY REPRESENTATION', px + size / 2, py - 12, { size: 9, weight: 'bold', color: PZ.muted, align: 'center', family: 'monospace' });
    for (let i = 0; i < 9; i++) {
      const bx = px + i * boxW;
      ctx.fillStyle = tiles[i] === 0 ? '#cbd5e1' : PZ.indigo;
      ctx.beginPath(); this.roundRect(bx + gap, py, boxW - gap * 2, 28, 4); ctx.fill();
      this.text(tiles[i] === 0 ? '_' : String(tiles[i]), bx + boxW / 2, py + 14, { size: 12, weight: 'bold', color: '#fff', align: 'center', base: 'middle' });
      this.text(String(i), bx + boxW / 2, py + 40, { size: 9, color: PZ.faint, align: 'center', base: 'middle', family: 'monospace' });
    }
  }

  // --- Step 1: build a state, count 9! ----------------------------------------

  drawRepresentation(w, h) {
    const ctx = this.ctx, tiles = this.repTiles, k = this.repFilled(), full = k === 9;
    const size = Math.min(h * 0.5, w * 0.34);
    const bx = Math.max(20, w * 0.05), by = 46;
    this.text('Board', bx + size / 2, by - 14, { size: 12, weight: 'bold', color: PZ.slate, align: 'center' });
    ctx.fillStyle = '#fff'; ctx.beginPath(); this.roundRect(bx, by, size, size, 12); ctx.fill();
    ctx.strokeStyle = PZ.line; ctx.lineWidth = 1.5; ctx.stroke();
    const pad = size * 0.04, ts = (size - pad * 2) / 3;
    for (let i = 0; i < 9; i++) {
      const x = bx + pad + (i % 3) * ts, y = by + pad + Math.floor(i / 3) * ts, s = ts - pad * 0.5, v = tiles[i];
      ctx.beginPath(); this.roundRect(x, y, s, s, 6);
      if (v !== null) {
        ctx.fillStyle = v === 0 ? '#e2e8f0' : PZ.indigo; ctx.fill();
        this.text(v === 0 ? '_' : String(v), x + s / 2, y + s / 2 + 1, { size: Math.round(ts * 0.36), weight: 'bold', color: v === 0 ? PZ.muted : '#fff', align: 'center', base: 'middle' });
      } else if (i === k) {
        ctx.fillStyle = 'rgba(245,158,11,0.12)'; ctx.fill(); ctx.setLineDash([5, 4]); ctx.strokeStyle = PZ.amber; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
        this.text(String(9 - i), x + s / 2, y + s / 2 - 5, { size: Math.round(ts * 0.3), weight: 'bold', color: PZ.amberDark, align: 'center', base: 'middle' });
        this.text('choices', x + s / 2, y + s / 2 + ts * 0.2, { size: Math.max(9, Math.round(ts * 0.11)), color: PZ.amberDark, align: 'center', base: 'middle' });
      } else {
        ctx.fillStyle = PZ.bg; ctx.fill();
        this.text('?', x + s / 2, y + s / 2 + 1, { size: Math.round(ts * 0.28), color: '#cbd5e1', align: 'center', base: 'middle' });
      }
      this.text(`idx ${i}`, x + 5, y + s - 5, { size: 9, weight: 'bold', color: v !== null && v !== 0 ? 'rgba(255,255,255,0.5)' : PZ.faint, base: 'bottom', family: 'monospace' });
    }
    // Memory array under the board
    const ay = by + size + 34, bw = size / 9;
    this.text('TUPLE IN MEMORY', bx + size / 2, ay - 10, { size: 9, weight: 'bold', color: PZ.muted, align: 'center', family: 'monospace' });
    for (let i = 0; i < 9; i++) {
      const v = tiles[i], x = bx + i * bw;
      ctx.fillStyle = v === null ? PZ.bg : v === 0 ? '#cbd5e1' : PZ.indigo;
      ctx.beginPath(); this.roundRect(x + 2, ay, bw - 4, 26, 4); ctx.fill();
      if (v === null) { ctx.strokeStyle = i === k ? PZ.amber : PZ.line; ctx.lineWidth = 1.2; ctx.stroke(); }
      this.text(v === null ? '?' : v === 0 ? '0' : String(v), x + bw / 2, ay + 14, { size: 12, weight: 'bold', color: v === null ? '#cbd5e1' : '#fff', align: 'center', base: 'middle' });
      this.text(String(i), x + bw / 2, ay + 37, { size: 9, color: PZ.faint, align: 'center', base: 'middle', family: 'monospace' });
    }

    // Right: choices per square and running product
    const rx = bx + size + Math.max(28, w * 0.05), rw = w - rx - 20;
    let y = by + 4;
    this.text('Choices for each square', rx, y, { size: 12, weight: 'bold', color: PZ.slate }); y += 32;
    const fs = Math.max(14, Math.min(24, rw / 14));
    ctx.font = `bold ${fs}px Outfit, sans-serif`;
    let x = rx, prod = 1;
    for (let i = 0; i < 9; i++) {
      const str = String(9 - i) + (i < 8 ? ' ×' : '');
      this.text(str, x, y, { size: fs, weight: 'bold', color: i < k ? PZ.indigo : i === k ? PZ.amberDark : '#cbd5e1' });
      ctx.font = `bold ${fs}px Outfit, sans-serif`;
      x += ctx.measureText(str + ' ').width;
      if (i < k) prod *= 9 - i;
    }
    y += fs + 16;
    if (k > 0) this.text(`= ${fmt(prod)}`, rx, y + 10, { size: fs + 12, weight: 'bold', color: full ? PZ.indigo : PZ.slate });
    y += fs + 24;
    this.text(full ? 'ways to fill all 9 squares: 9! = 362,880'
      : k === 0 ? 'Place a piece in square 1 to start counting' : `ways to fill the first ${k} square${k === 1 ? '' : 's'}`, rx, y, { size: 12, color: PZ.slate });
    y += 36;

    // Arrangement number (rank) on a 1..9! number line
    const lw = Math.min(rw, 380);
    const r = full ? Reachability.rank(tiles) : null;
    this.text(full ? `This is arrangement #${fmt(r + 1)} of 362,880` : 'Fill every square to see its number among all 9! arrangements',
      rx, y, { size: full ? 15 : 12, weight: full ? 'bold' : 'normal', color: full ? PZ.ink : PZ.faint });
    y += 16;
    ctx.fillStyle = PZ.line; ctx.beginPath(); this.roundRect(rx, y, lw, 10, 5); ctx.fill();
    if (full) {
      const px = rx + (r / 362879) * lw;
      ctx.fillStyle = PZ.amber; ctx.beginPath(); ctx.arc(px, y + 5, 7, 0, Math.PI * 2); ctx.fill();
    }
    this.text('1', rx, y + 26, { size: 10, color: PZ.faint });
    this.text('362,880', rx + lw, y + 26, { size: 10, color: PZ.faint, align: 'right' });
    if (full) {
      y += 48;
      this.text('Prev / Next walk through the arrangements in order:', rx, y, { size: 11.5, color: PZ.muted });
      this.text('every one is a different state.', rx, y + 16, { size: 11.5, color: PZ.muted });
    }
  }

  // --- Step 3: search tree -----------------------------------------------------

  /** Mini 3x3 board. look: { fill, tileFill, text, border, lw, dash, alpha } */
  drawMiniBoard(tiles, x, y, s, look) {
    const ctx = this.ctx;
    if (s < 14) {
      // Too small for a board: draw a status-coloured dot.
      ctx.save(); ctx.globalAlpha = look.alpha ?? 1;
      if (look.glow) { ctx.shadowColor = look.glow; ctx.shadowBlur = 10; }
      ctx.beginPath(); ctx.arc(x + s / 2, y + s / 2, s / 2, 0, Math.PI * 2);
      ctx.fillStyle = look.tileFill; ctx.fill(); ctx.shadowBlur = 0;
      ctx.setLineDash(look.dash || []); ctx.strokeStyle = look.border; ctx.lineWidth = Math.max(1.2, (look.lw || 1.2)); ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
      return;
    }
    ctx.save();
    ctx.globalAlpha = look.alpha ?? 1;
    if (look.glow) { ctx.shadowColor = look.glow; ctx.shadowBlur = 12; }
    ctx.fillStyle = look.fill; ctx.beginPath(); this.roundRect(x, y, s, s, Math.max(2, s * 0.12)); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.setLineDash(look.dash || []); ctx.strokeStyle = look.border; ctx.lineWidth = look.lw || 1.2; ctx.stroke(); ctx.setLineDash([]);
    if (s >= 15) {
      const pad = Math.max(1.5, s * 0.07), ts = (s - pad * 2) / 3;
      for (let i = 0; i < 9; i++) {
        const v = tiles[i], tx = x + pad + (i % 3) * ts, ty = y + pad + Math.floor(i / 3) * ts;
        if (!v) continue;
        ctx.fillStyle = look.tileFill; ctx.fillRect(tx + 0.4, ty + 0.4, ts - 0.8, ts - 0.8);
        if (s >= 22) this.text(String(v), tx + ts / 2, ty + ts / 2 + 0.5, { size: Math.max(6, ts * 0.62), weight: 'bold', color: look.text, align: 'center', base: 'middle', family: 'sans-serif' });
      }
    }
    ctx.restore();
  }

  nodeLook(status) {
    switch (status) {
      case 'current': return { fill: '#fffbeb', tileFill: '#fde68a', text: PZ.amberDark, border: PZ.amber, lw: 2.5, glow: 'rgba(245,158,11,0.6)' };
      case 'frontier': return { fill: '#ffffff', tileFill: PZ.indigoSoft, text: '#3730a3', border: PZ.indigo, lw: 1.6 };
      case 'expanded': return { fill: '#f0f9ff', tileFill: '#bae6fd', text: '#075985', border: '#0891b2', lw: 1.3 };
      case 'goal': return { fill: '#ecfdf5', tileFill: '#a7f3d0', text: PZ.greenDark, border: PZ.green, lw: 2.5, glow: 'rgba(16,185,129,0.55)' };
      case 'leaf': return { fill: '#f8fafc', tileFill: '#e2e8f0', text: PZ.slate, border: PZ.slate, lw: 1.5 };
      case 'unseen': return { fill: '#ffffff', tileFill: '#f1f5f9', text: '#94a3b8', border: '#cbd5e1', lw: 1, alpha: 0.75 };
      default: return { fill: '#f8fafc', tileFill: '#e2e8f0', text: PZ.faint, border: '#cbd5e1', lw: 1, dash: [3, 2], alpha: 0.6 }; // dup
    }
  }

  drawSearchTree(w, h) {
    const ctx = this.ctx, st = this.st, step = st.steps[st.idx];
    if (!step) return;
    const nodes = step.nodes, status = step.status;
    const FH = 118;                          // top band: frontier | selected node | goal
    const bandY = 34;
    const top = bandY + FH + 26, bottom = h - 16, left = 16, right = w - 16;

    // Legend
    const legend = [['unseen', 'not generated yet'], ['frontier', 'frontier'], ['current', 'selected'], ['expanded', 'expanded'], ['leaf', 'at max depth'], ['dup', 'repeated (not added)'], ['goal', 'goal']];
    let lx = left;
    legend.forEach(([k, label]) => {
      this.drawMiniBoard([0, 0, 0, 0, 0, 0, 0, 0, 0], lx, 10, 14, this.nodeLook(k));
      this.text(label, lx + 18, 21, { size: 11, color: PZ.slate });
      ctx.font = 'normal 11px Outfit, sans-serif'; lx += 30 + ctx.measureText(label).width;
    });
    if (step.limit !== null && step.limit !== undefined) this.text(`Depth limit = ${step.limit}`, right, 21, { size: 12, weight: 'bold', color: PZ.amberDark, align: 'right' });

    // Tidy layout: leaves get consecutive slots, parents sit over their children.
    const kids = nodes.map(() => []);
    nodes.forEach(n => { if (n.parent !== null) kids[n.parent].push(n.id); });
    let leaf = 0; const slotOf = [];
    const place = id => {
      if (!kids[id].length) { slotOf[id] = leaf++; return slotOf[id]; }
      const xs = kids[id].map(place);
      slotOf[id] = (xs[0] + xs[xs.length - 1]) / 2; return slotOf[id];
    };
    if (nodes.length) place(0);
    const maxDepth = Math.max(2, ...nodes.map(n => n.depth));
    const slotW = (right - left) / Math.max(leaf, 1);
    const dy = (bottom - top - 14) / (maxDepth + 0.6);
    const s = Math.max(8, Math.min(52, slotW * 0.78, dy * 0.5));
    const X = id => left + (slotOf[id] + 0.5) * slotW;
    const Y = id => top + nodes[id].depth * dy + s / 2;
    const onSol = new Set(step.solution || []);

    // Edges
    nodes.forEach(n => {
      if (n.parent === null) return;
      const sol = onSol.has(n.id) && onSol.has(n.parent);
      const fresh = step.phase === 'expand' && n.parent === step.current;
      ctx.beginPath(); ctx.moveTo(X(n.parent), Y(n.parent) + s / 2); ctx.lineTo(X(n.id), Y(n.id) - s / 2);
      const unseenE = status[n.id] === 'unseen';
      ctx.setLineDash(unseenE ? [4, 4] : []);
      ctx.strokeStyle = sol ? PZ.green : fresh ? PZ.amber : unseenE ? 'rgba(148,163,184,0.5)' : status[n.id] === 'dup' ? 'rgba(148,163,184,0.45)' : 'rgba(79,70,229,0.35)';
      ctx.lineWidth = sol ? 3.5 : fresh ? 2.5 : 1.3; ctx.stroke(); ctx.setLineDash([]);
      if (s >= 16) {
        const mx = (X(n.parent) + X(n.id)) / 2, my = (Y(n.parent) + s / 2 + Y(n.id) - s / 2) / 2;
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(mx, my, 6.5, 0, Math.PI * 2); ctx.fill();
        this.text(n.action[0], mx, my + 0.5, { size: 8.5, weight: 'bold', color: sol ? PZ.greenDark : fresh ? PZ.amberDark : status[n.id] === 'unseen' ? PZ.faint : PZ.indigo, align: 'center', base: 'middle', family: 'monospace' });
      }
    });

    // Nodes (current one last so its glow is on top)
    const ids = nodes.map(n => n.id).sort((a, b) => (a === step.current) - (b === step.current));
    ids.forEach(id => {
      const n = nodes[id], stt = id === step.current && status[id] !== 'goal' && step.phase !== 'expand' ? 'current' : status[id];
      const look = this.nodeLook(id === step.current && step.phase === 'expand' ? 'current' : stt);
      this.drawMiniBoard(n.tiles, X(id) - s / 2, Y(id) - s / 2, s, look);
      if (s >= 18) {
        let lab = `#${id}`;
        if (status[id] === 'dup') lab += ' repeated';
        if (st.alg === 'ASTAR') lab += ` f=${n.f}`;
        else if (st.alg === 'GREEDY') lab += ` h=${n.h}`;
        this.text(lab, X(id), Y(id) + s / 2 + 11, { size: 9.5, weight: 'bold', color: status[id] === 'dup' || status[id] === 'unseen' ? PZ.faint : PZ.slate, align: 'center', family: 'sans-serif' });
      }
    });
    if (id0Root(nodes)) this.text('s₀', X(0) - s / 2 - 6, Y(0) + 4, { size: 11, weight: 'bold', color: '#0891b2', align: 'right' });

    // Top band: frontier strip, selected node, goal state
    const fy = bandY, fx = 12, fw = w - 24;
    ctx.fillStyle = PZ.bg; ctx.beginPath(); this.roundRect(fx, fy, fw, FH, 8); ctx.fill();
    ctx.strokeStyle = PZ.line; ctx.lineWidth = 1; ctx.stroke();
    const title = { BFS: 'FRONTIER: FIFO QUEUE (first in → first out)', DFS: 'FRONTIER: LIFO STACK (last in → first out)', IDS: 'FRONTIER: LIFO STACK (depth-limited)', GREEDY: 'FRONTIER: PRIORITY QUEUE ordered by h(n)', ASTAR: 'FRONTIER: PRIORITY QUEUE ordered by f(n) = g(n) + h(n)' }[st.alg];
    this.text(title, fx + 10, fy + 16, { size: 10, weight: 'bold', color: PZ.slate, family: 'monospace' });
    const goalW = 96, insetW = 150 + goalW, bs = 38, gap = 12;
    const fr0 = step.frontier.length;
    let room = Math.floor((fw - insetW - 30) / (bs + gap));
    if (fr0 > room) room = Math.max(1, Math.floor((fw - insetW - 30 - 64) / (bs + gap)));
    const fr = step.frontier;
    if (!fr.length) this.text('Empty', fx + 12, fy + 64, { size: 12, color: PZ.faint });
    fr.slice(0, room).forEach((id, i) => {
      const n = step.nodes[id], bx = fx + 12 + i * (bs + gap), by = fy + 36;
      if (i === 0) this.text(st.alg === 'DFS' || st.alg === 'IDS' ? 'TOP (pop)' : 'NEXT (pop)', bx + bs / 2, by - 6, { size: 8.5, weight: 'bold', color: PZ.indigo, align: 'center', family: 'monospace' });
      this.drawMiniBoard(n.tiles, bx, by, bs, this.nodeLook('frontier'));
      const pr = st.alg === 'ASTAR' ? `f=${n.f}` : st.alg === 'GREEDY' ? `h=${n.h}` : `d=${n.depth}`;
      this.text(`#${id}`, bx + bs / 2, by + bs + 12, { size: 9, weight: 'bold', color: PZ.slate, align: 'center', family: 'sans-serif' });
      this.text(pr, bx + bs / 2, by + bs + 23, { size: 9, color: PZ.muted, align: 'center', family: 'sans-serif' });
    });
    if (fr.length > room) this.text(`+${fr.length - room} more`, fx + 12 + room * (bs + gap), fy + 60, { size: 11, weight: 'bold', color: PZ.muted });

    const ix = fx + fw - insetW + 4;
    ctx.strokeStyle = PZ.line; ctx.beginPath(); ctx.moveTo(ix - 8, fy + 10); ctx.lineTo(ix - 8, fy + FH - 10); ctx.stroke();
    this.text('SELECTED NODE', ix, fy + 16, { size: 10, weight: 'bold', color: PZ.slate, family: 'monospace' });
    if (step.current !== null && step.current !== undefined) {
      const n = step.nodes[step.current];
      this.drawMiniBoard(n.tiles, ix, fy + 26, 62, this.nodeLook(status[step.current] === 'goal' ? 'goal' : 'current'));
      const tx = ix + 70;
      this.text(`#${n.id}`, tx, fy + 40, { size: 12, weight: 'bold', color: PZ.ink });
      this.text(`g = ${n.g}`, tx, fy + 56, { size: 10.5, color: PZ.slate });
      this.text(`h = ${n.h}`, tx, fy + 70, { size: 10.5, color: PZ.slate });
      this.text(`f = ${n.f}`, tx, fy + 84, { size: 10.5, color: PZ.slate });
    } else {
      this.text('—', ix + 4, fy + 60, { size: 14, color: PZ.faint });
    }

    // Goal state
    const gx = fx + fw - goalW + 6;
    ctx.strokeStyle = PZ.line; ctx.beginPath(); ctx.moveTo(gx - 10, fy + 10); ctx.lineTo(gx - 10, fy + FH - 10); ctx.stroke();
    this.text('GOAL STATE', gx, fy + 16, { size: 10, weight: 'bold', color: PZ.greenDark, family: 'monospace' });
    const found = step.solution !== null && step.solution !== undefined;
    this.drawMiniBoard(PuzzleSearchTrace.GOAL, gx, fy + 26, 62, { fill: '#ecfdf5', tileFill: '#a7f3d0', text: PZ.greenDark, border: PZ.green, lw: found ? 2.5 : 1.6, glow: found ? 'rgba(16,185,129,0.55)' : null });
    this.text(found ? 'reached ✓' : 'target', gx + 31, fy + 104, { size: 10, weight: 'bold', color: found ? PZ.greenDark : PZ.muted, align: 'center' });

    function id0Root(ns) { return ns.length > 0; }
  }

  // --- Step 4: goal test ------------------------------------------------------

  drawGoalTest(w, h) {
    const s = Math.min(w * 0.3, h * 0.55);
    const lx = w * 0.08, rx = w - w * 0.08 - s, y = (h - s) / 2 - 10;
    const invI = Reachability.getInversions(this.initialTiles), invG = Reachability.getInversions(this.customGoalTiles);
    const d = this.ensureBfs().dist[Reachability.rank(this.customGoalTiles)];
    const ok = d >= 0;
    this.drawPuzzleBoard(this.initialTiles, lx, y, s, 'Initial State s₀');
    this.drawPuzzleBoard(this.customGoalTiles, rx, y, s, 'Goal', ok);
    const lab = (inv, x) => this.pill(`${inv} inversions · ${inv % 2 ? 'odd' : 'even'}`, x + s / 2, y + s + 14, inv % 2 ? PZ.red : PZ.green, { align: 'center' });
    lab(invI, lx); lab(invG, rx);

    // Arrow between
    const ctx = this.ctx, ax0 = lx + s + 18, ax1 = rx - 18, ay = y + s / 2;
    ctx.strokeStyle = ok ? PZ.green : PZ.red; ctx.lineWidth = 2.5; ctx.setLineDash(ok ? [] : [7, 6]);
    ctx.beginPath(); ctx.moveTo(ax0, ay); ctx.lineTo(ax1 - 8, ay); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = ok ? PZ.green : PZ.red; ctx.beginPath(); ctx.moveTo(ax1, ay); ctx.lineTo(ax1 - 12, ay - 7); ctx.lineTo(ax1 - 12, ay + 7); ctx.fill();
    const mx = (ax0 + ax1) / 2;
    if (ok) {
      this.text(`${d} moves`, mx, ay - 14, { size: 18, weight: 'bold', color: PZ.greenDark, align: 'center' });
      this.text('shortest path (BFS)', mx, ay + 22, { size: 11, color: PZ.greenDark, align: 'center' });
    } else {
      this.text('✗ no path', mx, ay - 14, { size: 18, weight: 'bold', color: PZ.redDark, align: 'center' });
      this.text('parity differs', mx, ay + 22, { size: 11, color: PZ.redDark, align: 'center' });
    }
  }

  roundRect(x, y, width, height, radius) {
    const ctx = this.ctx;
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
  }
}

window.PuzzleDemoUI = PuzzleDemoUI;
