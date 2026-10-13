/**
 * UI and Canvas Visualizer Engine for the 8-Puzzle State-Space Demo.
 *
 * Steps
 *   0  Puzzle setup                 4  How many: full BFS count
 *   1  State representation         5  Reachability test (goal presets)
 *   2  Actions & RESULT
 *   3  Why: parity invariant
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

    // Step 3: parity explorer
    this.parState = new PuzzleState(this.initialTiles);
    this.parHistory = [Reachability.getInversions(this.initialTiles)];
    this.parLast = null;
    // Step 4: full BFS
    this.bfs = null;          // cached result of Reachability.exploreAll
    this.bfsShown = -1;       // deepest layer revealed (-1 = not started)
    this.bfsTimer = null;

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

    // Step 2: actions & RESULT
    ['Up', 'Down', 'Left', 'Right'].forEach(a => this.on(`btn-puz-${a.toLowerCase()}`, 'click', () => this.applyAction(a)));

    // Step 3: parity explorer
    ['Up', 'Down', 'Left', 'Right'].forEach(a => this.on(`btn-par-${a.toLowerCase()}`, 'click', () => this.parMove(a)));
    this.on('btn-par-reset', 'click', () => this.parReset());
    this.on('btn-par-random', 'click', () => this.parRandom(50));

    // Step 4: BFS
    this.on('btn-puz-bfs-run', 'click', () => this.runBfs());
    this.on('btn-puz-bfs-reset', 'click', () => this.resetBfs());

    // Step 5: goal presets
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
      else if (this.currentStep === 3) { e.preventDefault(); this.parMove(action); }
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
    this.currentStep = step;
    this.stepIndicators.forEach((ind, i) => { ind.classList.toggle('active', i === step); ind.classList.toggle('completed', i < step); });
    this.stepPanels.forEach((p, i) => p.classList.toggle('active', i === step));
    this.btnPrev.disabled = step === 0;
    this.btnNext.textContent = step === this.lastStep ? 'Finished' : 'Next Step';
    this.btnNext.disabled = step === this.lastStep;

    if (step === 2) {
      this.currentState = new PuzzleState(this.initialTiles);
      if (this.puzManualLog) this.puzManualLog.innerHTML = `<div class="log-entry">State s0: <strong>${this.currentState.toString()}</strong></div>`;
      this.updateActionButtons(this.currentState, 'puz');
    } else if (step === 3) {
      this.updateActionButtons(this.parState, 'par');
    } else if (step === 4) {
      this.updateBfsStats();
    } else if (step === 5) {
      this.updateGoalStatus();
    }
    this.draw();
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
  // Step 3: parity invariant explorer
  // ---------------------------------------------------------------------------

  parMove(action, silent) {
    if (!this.parState.getLegalActions().includes(action)) return false;
    const info = Reachability.explainMove(this.parState, action);
    this.parState = info.after;
    this.parHistory.push(info.invAfter);
    this.parLast = { action, ...info };
    if (!silent) { this.updateActionButtons(this.parState, 'par'); this.draw(); }
    return true;
  }

  parReset() {
    this.parState = new PuzzleState(this.initialTiles);
    this.parHistory = [Reachability.getInversions(this.initialTiles)];
    this.parLast = null;
    this.updateActionButtons(this.parState, 'par');
    this.draw();
  }

  parRandom(n) {
    let prevBlank = -1;
    for (let k = 0; k < n; k++) {
      // Random legal move, avoiding an immediate undo so the walk wanders further.
      const acts = this.parState.getLegalActions().filter(a => this.parState.transition(a).blankIndex !== prevBlank);
      const a = acts[Math.floor(Math.random() * acts.length)];
      prevBlank = this.parState.blankIndex;
      this.parMove(a, true);
    }
    this.updateActionButtons(this.parState, 'par');
    this.draw();
  }

  // ---------------------------------------------------------------------------
  // Step 4: full BFS
  // ---------------------------------------------------------------------------

  ensureBfs() {
    if (!this.bfs) this.bfs = Reachability.exploreAll(this.initialTiles);
    return this.bfs;
  }

  runBfs() {
    this.ensureBfs();
    clearInterval(this.bfsTimer);
    this.bfsShown = 0;
    const maxD = this.bfs.layers.length - 1;
    this.updateBfsStats(); this.draw();
    this.bfsTimer = setInterval(() => {
      if (this.bfsShown >= maxD) { clearInterval(this.bfsTimer); this.bfsTimer = null; return; }
      this.bfsShown++;
      this.updateBfsStats();
      if (this.currentStep === 4) this.draw();
    }, 140);
  }

  resetBfs() {
    clearInterval(this.bfsTimer); this.bfsTimer = null;
    this.bfsShown = -1;
    this.updateBfsStats(); this.draw();
  }

  bfsReached() {
    if (!this.bfs || this.bfsShown < 0) return 0;
    let s = 0; for (let d = 0; d <= this.bfsShown; d++) s += this.bfs.layers[d];
    return s;
  }

  updateBfsStats() {
    const reached = this.bfsReached();
    const set = (id, v) => { const el = this.$(id); if (el) el.textContent = v; };
    set('puz-bfs-depth', this.bfsShown < 0 ? '–' : this.bfsShown);
    set('puz-bfs-count', fmt(reached));
    set('puz-bfs-even', fmt(reached));   // s0 is even, so everything reached is even
    set('puz-bfs-odd', '0');
    const tip = this.$('puz-bfs-tip');
    const done = this.bfs && this.bfsShown === this.bfs.layers.length - 1;
    if (tip) {
      const span = tip.querySelector('span');
      if (span) span.innerHTML = done
        ? `BFS stopped: the frontier is empty after depth ${this.bfsShown}. It reached <strong>${fmt(this.bfs.total)} = 9!/2</strong> states, all even. Not one odd state was reached, which matches the invariant.`
        : 'Each state\'s number (its position among all 9! orderings) indexes a 362,880-entry table, so BFS never stores the same state twice.';
    }
  }

  // ---------------------------------------------------------------------------
  // Step 5: goal check
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
      case 1: {
        const s = Math.min(w * 0.35, h * 0.6);
        const x = (w - s) / 2, y = (h - s) / 2 - 20;
        this.drawPuzzleBoard(this.initialTiles, x, y, s, 'State Representation Mapping', null, { indices: true });
        this.drawArrayRepresentation(this.initialTiles, x, y + s + 25, s);
        break;
      }
      case 2: {
        const s = Math.min(w * 0.45, h * 0.75);
        this.drawPuzzleBoard(this.currentState.tiles, (w - s) / 2, (h - s) / 2, s, 'Interactive State Transitions');
        break;
      }
      case 3: this.drawParity(w, h); break;
      case 4: this.drawBfs(w, h); break;
      case 5: this.drawGoalTest(w, h); break;
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

  // --- Step 3: parity invariant ----------------------------------------------

  drawParity(w, h) {
    const ctx = this.ctx;
    const tiles = this.parState.tiles;
    const last = this.parLast;
    const inv = Reachability.getInversions(tiles);
    const even = inv % 2 === 0;

    // Board (left)
    const bs = Math.min(h * 0.42, w * 0.28);
    const bx = 20, by = 34;
    this.drawPuzzleBoard(tiles, bx, by, bs, 'Board', null, { highlightTile: last ? last.movedTile : null, ghostIndex: last ? this.parState.blankIndex : null });

    // Reading-order strip (right)
    const sx = bx + bs + 34, sw = w - sx - 18;
    const seq = Reachability.readingOrder(tiles);
    const cw = Math.min(46, (sw - 7 * 6) / 8), gap = Math.min(10, (sw - 8 * cw) / 7);
    const stripW = 8 * cw + 7 * gap;
    const sy = by + Math.min(110, bs * 0.55);
    this.text('Reading order (row by row, blank skipped)', sx, by - 12, { size: 12, weight: 'bold', color: PZ.slate });

    const cx = k => sx + k * (cw + gap) + cw / 2;
    const pos = {}; seq.forEach((t, k) => (pos[t] = k));

    // Inversion arcs above the strip
    const pairs = Reachability.inversionPairs(tiles);
    const changed = new Map();
    if (last) last.flips.forEach(f => changed.set([last.movedTile, f.tile].sort().join('-'), f.delta));
    const maxArc = sy - by - 6;
    const arc = (a, b, color, lw, dash) => {
      const x1 = cx(pos[a]), x2 = cx(pos[b]);
      const span = Math.abs(pos[a] - pos[b]);
      const ah = Math.min(maxArc, 10 + span * (maxArc / 7.5));
      ctx.beginPath(); ctx.moveTo(x1, sy - 2);
      ctx.bezierCurveTo(x1, sy - 2 - ah * 1.3, x2, sy - 2 - ah * 1.3, x2, sy - 2);
      ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.setLineDash(dash || []); ctx.stroke(); ctx.setLineDash([]);
    };
    pairs.forEach(([a, b]) => { if (!changed.has([a, b].sort().join('-'))) arc(a, b, 'rgba(79,70,229,0.18)', 1); });
    // Pairs flipped by the last move: green = new inversion (+1), red dashed = removed (−1)
    if (last) last.flips.forEach(f => arc(last.movedTile, f.tile, f.delta > 0 ? PZ.green : PZ.red, 2.4, f.delta > 0 ? null : [5, 4]));

    seq.forEach((t, k) => {
      const x = sx + k * (cw + gap);
      const hl = last && t === last.movedTile, jumped = last && last.jumped.includes(t);
      ctx.beginPath(); this.roundRect(x, sy, cw, cw, 6);
      ctx.fillStyle = hl ? PZ.amber : jumped ? PZ.indigoSoft : PZ.indigo; ctx.fill();
      if (jumped) { ctx.strokeStyle = PZ.indigo; ctx.lineWidth = 1.5; ctx.stroke(); }
      this.text(String(t), x + cw / 2, sy + cw / 2 + 1, { size: Math.round(cw * 0.45), weight: 'bold', color: jumped ? PZ.indigo : '#fff', align: 'center', base: 'middle' });
    });

    // Legend + count
    let ly = sy + cw + 22;
    this.text('Inversions', sx, ly + 4, { size: 12, weight: 'bold', color: PZ.slate });
    this.text(String(inv), sx + 72, ly + 8, { size: 26, weight: 'bold', color: PZ.ink });
    ctx.font = 'bold 26px Outfit, sans-serif';
    this.pill(even ? 'EVEN' : 'ODD', sx + 82 + ctx.measureText(String(inv)).width, ly - 12, even ? PZ.green : PZ.red);
    ly += 26;
    this.text('Faint arcs = inversion pairs (larger tile before smaller).', sx, ly, { size: 10.5, color: PZ.muted });

    // Last-move explanation
    ly += 26;
    const lineW = Math.min(sw, stripW + 40);
    if (!last) {
      this.text('Make a move with the buttons or arrow keys.', sx, ly, { size: 12.5, color: PZ.slate });
    } else {
      const dStr = last.delta > 0 ? `+${last.delta}` : String(last.delta);
      this.text(`Last move: blank ${last.action} — tile ${last.movedTile} slid ${last.vertical ? 'vertically' : 'sideways'}`, sx, ly, { size: 12.5, weight: 'bold', color: PZ.ink });
      ly += 19;
      if (!last.vertical) {
        this.text('Reading order unchanged → no pair flips → Δ = 0', sx, ly, { size: 12, color: PZ.slate });
      } else {
        const after = Reachability.readingOrder(tiles);
        const ordered = t => (after.indexOf(last.movedTile) < after.indexOf(t) ? `(${last.movedTile},${t})` : `(${t},${last.movedTile})`);
        const parts = last.flips.map(f => `${ordered(f.tile)} ${f.delta > 0 ? 'became' : 'stopped being'} an inversion`);
        this.text(`It jumped over ${last.jumped.join(' and ')} in reading order:`, sx, ly, { size: 12, color: PZ.slate });
        ly += 17;
        parts.forEach((p, i) => { this.text(`• ${p} (${last.flips[i].delta > 0 ? '+1' : '−1'})`, sx + 6, ly, { size: 12, color: last.flips[i].delta > 0 ? PZ.greenDark : PZ.redDark }); ly += 17; });
        ly -= 17;
      }
      ly += 21;
      this.text(`Inversions ${last.invBefore} → ${last.invAfter}   (Δ = ${dStr}, an even number)`, sx, ly, { size: 12.5, weight: 'bold', color: PZ.indigo });
    }

    // History chart (bottom)
    const top = Math.max(by + bs + 36, ly + 22), cx0 = 52, cx1 = w - 20, cy0 = top + 18, cy1 = h - 26;
    if (cy1 - cy0 < 50) return;
    this.text('Inversion count after every move — the colour (parity) never changes', 20, top + 4, { size: 12, weight: 'bold', color: PZ.slate });
    const hist = this.parHistory.slice(-60);
    const offset = this.parHistory.length - hist.length;
    const ymax = Math.max(28, ...hist), ymin = 0;
    const X = i => cx0 + (hist.length <= 1 ? 0 : i / Math.max(hist.length - 1, 20) * (cx1 - cx0));
    const Y = v => cy1 - (v - ymin) / (ymax - ymin) * (cy1 - cy0);
    ctx.strokeStyle = PZ.line; ctx.lineWidth = 1;
    for (let v = 0; v <= ymax; v += 4) {
      ctx.beginPath(); ctx.moveTo(cx0, Y(v)); ctx.lineTo(cx1, Y(v)); ctx.stroke();
      this.text(String(v), cx0 - 8, Y(v) + 4, { size: 9.5, color: PZ.faint, align: 'right' });
    }
    this.text('move', cx1, cy1 + 16, { size: 9.5, color: PZ.faint, align: 'right' });
    if (offset) this.text(`(last 60 of ${this.parHistory.length - 1} moves)`, cx0, cy1 + 16, { size: 9.5, color: PZ.faint });
    ctx.beginPath(); hist.forEach((v, i) => (i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v))));
    ctx.strokeStyle = 'rgba(79,70,229,0.35)'; ctx.lineWidth = 1.5; ctx.stroke();
    hist.forEach((v, i) => {
      ctx.beginPath(); ctx.arc(X(i), Y(v), 3.6, 0, Math.PI * 2);
      ctx.fillStyle = v % 2 === 0 ? PZ.green : PZ.red; ctx.fill();
    });
    this.pill('● even', cx1 - 64, top - 8, PZ.green, { size: 10 });
  }

  // --- Step 4: full BFS -------------------------------------------------------

  drawBfs(w, h) {
    const ctx = this.ctx;
    const half = 181440;
    const reached = this.bfsReached();
    const done = this.bfs && this.bfsShown === this.bfs.layers.length - 1;

    // 9! bar split by parity
    const x0 = 30, x1 = w - 30, bw = x1 - x0, mid = x0 + bw / 2, by = 46, bh = 44;
    this.text('All 9! = 362,880 arrangements, split by inversion parity', x0, by - 14, { size: 12, weight: 'bold', color: PZ.slate });
    ctx.fillStyle = 'rgba(16,185,129,0.07)'; ctx.fillRect(x0, by, bw / 2, bh);
    ctx.fillStyle = 'rgba(239,68,68,0.06)'; ctx.fillRect(mid, by, bw / 2, bh);
    ctx.fillStyle = PZ.green; ctx.fillRect(x0, by, (bw / 2) * (reached / half), bh);
    ctx.strokeStyle = PZ.line; ctx.lineWidth = 1; ctx.strokeRect(x0, by, bw, bh);
    ctx.strokeStyle = PZ.slate; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mid, by - 6); ctx.lineTo(mid, by + bh + 6); ctx.stroke();
    this.text(`Even parity (like s₀): ${fmt(half)}`, x0 + bw / 4, by + bh + 18, { size: 11.5, weight: 'bold', color: PZ.greenDark, align: 'center' });
    this.text(`Odd parity: ${fmt(half)}`, mid + bw / 4, by + bh + 18, { size: 11.5, weight: 'bold', color: PZ.redDark, align: 'center' });
    this.text(reached ? `${fmt(reached)} reached` : 'not started', x0 + 10, by + bh / 2 + 1, { size: 13, weight: 'bold', color: reached > half * 0.25 ? '#fff' : PZ.greenDark, base: 'middle' });
    this.text('0 reached — never', mid + bw / 4, by + bh / 2 + 1, { size: 12.5, weight: 'bold', color: PZ.redDark, align: 'center', base: 'middle' });

    // Histogram of new states per depth
    const hx0 = 58, hx1 = w - 24, hy0 = by + bh + 58, hy1 = h - 34;
    this.text('New states discovered at each BFS depth d (distance from s₀)', 20, hy0 - 12, { size: 12, weight: 'bold', color: PZ.slate });
    const layers = this.bfs ? this.bfs.layers : new Array(31).fill(0);
    const n = layers.length, maxV = 25000;
    const colW = (hx1 - hx0) / n;
    const Y = v => hy1 - v / maxV * (hy1 - hy0 - 10);
    ctx.strokeStyle = PZ.line; ctx.lineWidth = 1;
    for (let v = 0; v <= maxV; v += 5000) {
      ctx.beginPath(); ctx.moveTo(hx0, Y(v)); ctx.lineTo(hx1, Y(v)); ctx.stroke();
      this.text(v ? `${v / 1000}k` : '0', hx0 - 8, Y(v) + 4, { size: 9.5, color: PZ.faint, align: 'right' });
    }
    for (let d = 0; d < n; d++) {
      const x = hx0 + d * colW + colW * 0.12, cwid = colW * 0.76;
      if (this.bfs && d <= this.bfsShown) {
        const v = layers[d];
        ctx.fillStyle = d === this.bfsShown && !done ? PZ.amber : PZ.green;
        const top = Y(v);
        ctx.fillRect(x, Math.min(top, hy1 - 1.5), cwid, Math.max(1.5, hy1 - top));
      }
      if (d % 5 === 0 || d === n - 1) this.text(String(d), x + cwid / 2, hy1 + 14, { size: 9.5, color: PZ.faint, align: 'center' });
    }
    this.text('d', hx1, hy1 + 26, { size: 9.5, color: PZ.faint, align: 'right' });

    if (this.bfsShown >= 0 && !done) {
      this.text(`depth ${this.bfsShown}: +${fmt(layers[this.bfsShown])} new states`, hx1, hy0 + 8, { size: 12, weight: 'bold', color: PZ.amberDark, align: 'right' });
    }
    if (done) {
      const bw2 = Math.min(360, (hx1 - hx0) * 0.5), bx2 = hx0 + 10, by2 = hy0 + 4;
      ctx.fillStyle = 'rgba(255,255,255,0.94)'; ctx.beginPath(); this.roundRect(bx2, by2, bw2, 70, 10); ctx.fill();
      ctx.strokeStyle = 'rgba(16,185,129,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();
      this.text(`Frontier empty after depth ${n - 1}`, bx2 + 14, by2 + 22, { size: 12, color: PZ.slate });
      this.text(`Reached ${fmt(this.bfs.total)} = 9!/2 states ✓`, bx2 + 14, by2 + 46, { size: 16, weight: 'bold', color: PZ.greenDark });
      this.text('odd-parity states reached: 0', bx2 + 14, by2 + 63, { size: 11, color: PZ.redDark });
    }
    if (this.bfsShown < 0) {
      this.text('Press “Run full BFS” to explore every state reachable from s₀', (hx0 + hx1) / 2, (hy0 + hy1) / 2, { size: 14, weight: 'bold', color: PZ.faint, align: 'center' });
    }
  }

  // --- Step 5: goal test ------------------------------------------------------

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
