/**
 * UI and Canvas Visualizer Engine for the 8-Puzzle State-Space Demo.
 */
class PuzzleDemoUI {
  constructor() {
    // Initial and goal states
    this.initialTiles = [7, 2, 4, 5, 0, 6, 8, 3, 1];
    this.goalTiles = [0, 1, 2, 3, 4, 5, 6, 7, 8];

    this.initialState = new PuzzleState(this.initialTiles);
    this.goalState = new PuzzleState(this.goalTiles);
    this.currentState = new PuzzleState(this.initialTiles); // for playing/exploring
    
    // Custom goal state tracking (can be modified in step 5)
    this.customGoalTiles = [...this.goalTiles];
    this.customGoalState = new PuzzleState(this.customGoalTiles);

    // DOM Elements
    this.canvas = document.getElementById('puzzle-canvas');
    this.ctx = this.canvas.getContext('2d');
    
    this.stepIndicators = document.querySelectorAll('.puzzle-flow-step');
    this.stepPanels = document.querySelectorAll('.puzzle-teaching-panel');
    
    this.btnPrev = document.getElementById('btn-puzzle-prev');
    this.btnNext = document.getElementById('btn-puzzle-next');

    // Step 3 (Actions & Transitions)
    this.btnPuzUp = document.getElementById('btn-puz-up');
    this.btnPuzDown = document.getElementById('btn-puz-down');
    this.btnPuzLeft = document.getElementById('btn-puz-left');
    this.btnPuzRight = document.getElementById('btn-puz-right');
    this.puzManualLog = document.getElementById('puz-manual-log');

    // Step 5 (Solvability Preset Goals)
    this.btnPuzGoalSolvable = document.getElementById('btn-puz-goal-solvable');
    this.btnPuzGoalUnsolvable = document.getElementById('btn-puz-goal-unsolvable');
    this.btnPuzGoalSwap = document.getElementById('btn-puz-goal-swap');
    this.puzGoalStatus = document.getElementById('puz-goal-status');

    // Step 6 (Interactive Exploration & Duplicates)
    this.btnPlayUp = document.getElementById('btn-play-up');
    this.btnPlayDown = document.getElementById('btn-play-down');
    this.btnPlayLeft = document.getElementById('btn-play-left');
    this.btnPlayRight = document.getElementById('btn-play-right');
    this.btnPuzExploreReset = document.getElementById('btn-puz-explore-reset');
    this.btnPuzExploreDup = document.getElementById('btn-puz-explore-dup');
    this.puzExploreLog = document.getElementById('puz-explore-log');

    // Step 7 (Depth-limited tree)
    this.puzDepthSlider = document.getElementById('puz-depth-slider');
    this.puzDepthVal = document.getElementById('puz-depth-val');

    // UI state
    this.currentStep = 0; // 0 to 7
    this.explorationMoves = 0;
    this.explorationHistory = []; // list of states visited
    this.depthSelected = 1; // 0 to 3

    this.init();
  }

  init() {
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // Navigation flow
    this.btnPrev.addEventListener('click', () => this.setStep(this.currentStep - 1));
    this.btnNext.addEventListener('click', () => this.setStep(this.currentStep + 1));

    this.stepIndicators.forEach((ind, index) => {
      ind.addEventListener('click', () => this.setStep(index));
    });

    // Step 3 Actions
    const bindAction = (btn, act, logBox, stateProp) => {
      if (btn) {
        btn.addEventListener('click', () => this.applyAction(act, logBox, stateProp));
      }
    };
    bindAction(this.btnPuzUp, 'Up', this.puzManualLog, 'currentState');
    bindAction(this.btnPuzDown, 'Down', this.puzManualLog, 'currentState');
    bindAction(this.btnPuzLeft, 'Left', this.puzManualLog, 'currentState');
    bindAction(this.btnPuzRight, 'Right', this.puzManualLog, 'currentState');

    // Step 5 Presets
    if (this.btnPuzGoalSolvable) {
      this.btnPuzGoalSolvable.addEventListener('click', () => {
        this.customGoalTiles = [...this.goalTiles];
        this.customGoalState = new PuzzleState(this.customGoalTiles);
        this.updateGoalStatus();
        this.draw();
      });
    }
    if (this.btnPuzGoalUnsolvable) {
      this.btnPuzGoalUnsolvable.addEventListener('click', () => {
        // Swap tiles 7 and 8 in the goal state to create an unreachable state (odd parity)
        this.customGoalTiles = [0, 1, 2, 3, 4, 5, 6, 8, 7];
        this.customGoalState = new PuzzleState(this.customGoalTiles);
        this.updateGoalStatus();
        this.draw();
      });
    }
    if (this.btnPuzGoalSwap) {
      this.btnPuzGoalSwap.addEventListener('click', () => {
        // Swap any two non-zero tiles in custom goal to toggle reachability parity
        // Find first two non-zero tiles
        let idx1 = -1;
        let idx2 = -1;
        for (let i = 0; i < 9; i++) {
          if (this.customGoalTiles[i] !== 0) {
            if (idx1 === -1) idx1 = i;
            else if (idx2 === -1) {
              idx2 = i;
              break;
            }
          }
        }
        if (idx1 !== -1 && idx2 !== -1) {
          const temp = this.customGoalTiles[idx1];
          this.customGoalTiles[idx1] = this.customGoalTiles[idx2];
          this.customGoalTiles[idx2] = temp;
          this.customGoalState = new PuzzleState(this.customGoalTiles);
          this.updateGoalStatus();
          this.draw();
        }
      });
    }

    // Step 6 Exploration Play Actions
    bindAction(this.btnPlayUp, 'Up', this.puzExploreLog, 'currentState');
    bindAction(this.btnPlayDown, 'Down', this.puzExploreLog, 'currentState');
    bindAction(this.btnPlayLeft, 'Left', this.puzExploreLog, 'currentState');
    bindAction(this.btnPlayRight, 'Right', this.puzExploreLog, 'currentState');

    if (this.btnPuzExploreReset) {
      this.btnPuzExploreReset.addEventListener('click', () => {
        this.currentState = new PuzzleState(this.initialTiles);
        this.explorationMoves = 0;
        this.explorationHistory = [this.currentState.tiles.join(',')];
        if (this.puzExploreLog) {
          this.puzExploreLog.innerHTML = `<div class="log-entry">Reset puzzle to Initial State.</div>`;
        }
        document.getElementById('puz-explore-moves').textContent = '0';
        this.draw();
      });
    }

    if (this.btnPuzExploreDup) {
      this.btnPuzExploreDup.addEventListener('click', () => {
        this.triggerDuplicateLoopDemo();
      });
    }

    // Step 7 Tree Depth Slider
    if (this.puzDepthSlider) {
      this.puzDepthSlider.addEventListener('input', (e) => {
        this.depthSelected = parseInt(e.target.value);
        if (this.puzDepthVal) this.puzDepthVal.textContent = this.depthSelected;
        this.updateTreeStats();
        this.draw();
      });
    }

    // Keyboard handlers
    window.addEventListener('keydown', (e) => {
      // Step 3 (Actions & Transitions) or Step 6 (Exploration)
      if (this.currentStep === 2) {
        this.handleKeyboardMove(e, this.puzManualLog, 'currentState');
      } else if (this.currentStep === 5) {
        this.handleKeyboardMove(e, this.puzExploreLog, 'currentState');
      }
    });

    this.setStep(0);
  }

  resizeCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.draw();
  }

  setStep(step) {
    if (step < 0 || step > 7) return;

    this.currentStep = step;

    // Update Progress Indicators
    this.stepIndicators.forEach((ind, index) => {
      ind.classList.toggle('active', index === step);
      ind.classList.toggle('completed', index < step);
    });

    // Update Panels
    this.stepPanels.forEach((panel, index) => {
      panel.classList.toggle('active', index === step);
    });

    // Nav button disabled state
    this.btnPrev.disabled = step === 0;
    this.btnNext.textContent = step === 7 ? "Finished" : "Next Step";
    this.btnNext.disabled = step === 7;

    // Specific Step Init
    if (step === 2) {
      this.currentState = new PuzzleState(this.initialTiles);
      if (this.puzManualLog) {
        this.puzManualLog.innerHTML = `<div class="log-entry">State s0: <strong>${this.currentState.toString()}</strong></div>`;
      }
      this.updateActionButtons(this.currentState, 'puz');
    } else if (step === 4) {
      this.updateGoalStatus();
    } else if (step === 5) {
      this.currentState = new PuzzleState(this.initialTiles);
      this.explorationMoves = 0;
      this.explorationHistory = [this.currentState.tiles.join(',')];
      if (this.puzExploreLog) {
        this.puzExploreLog.innerHTML = `<div class="log-entry">State s0: <strong>${this.currentState.toString()}</strong></div>`;
      }
      document.getElementById('puz-explore-moves').textContent = '0';
      this.updateActionButtons(this.currentState, 'play');
    } else if (step === 6) {
      this.updateTreeStats();
    }

    this.draw();
  }

  updateActionButtons(state, prefix) {
    const legal = state.getLegalActions();
    const upBtn = document.getElementById(`btn-${prefix}-up`);
    const downBtn = document.getElementById(`btn-${prefix}-down`);
    const leftBtn = document.getElementById(`btn-${prefix}-left`);
    const rightBtn = document.getElementById(`btn-${prefix}-right`);

    if (upBtn) upBtn.disabled = !legal.includes('Up');
    if (downBtn) downBtn.disabled = !legal.includes('Down');
    if (leftBtn) leftBtn.disabled = !legal.includes('Left');
    if (rightBtn) rightBtn.disabled = !legal.includes('Right');
  }

  applyAction(action, logBox, stateProp) {
    const state = this[stateProp];
    const legal = state.getLegalActions();
    
    if (!legal.includes(action)) return;

    const nextState = state.transition(action);
    const prevStateStr = state.toString();
    this[stateProp] = nextState;

    // If exploration step, update moves and duplicate detection
    if (stateProp === 'currentState' && this.currentStep === 5) {
      this.explorationMoves++;
      document.getElementById('puz-explore-moves').textContent = this.explorationMoves;
      
      const stateKey = nextState.tiles.join(',');
      const isDup = this.explorationHistory.includes(stateKey);
      this.explorationHistory.push(stateKey);
      
      this.updateActionButtons(nextState, 'play');

      if (logBox) {
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        
        if (isDup) {
          logEntry.innerHTML = `RESULT(${prevStateStr}, <span style="color:#f59e0b;">${action}</span>) = <strong style="color:#ef4444;">${nextState.toString()}</strong> <span class="badge-g" style="background:#f59e0b;font-size:0.65rem;">DUPLICATE STATE</span>`;
        } else {
          logEntry.innerHTML = `RESULT(${prevStateStr}, <span style="color:#38bdf8;">${action}</span>) = <strong style="color:#10b981;">${nextState.toString()}</strong>`;
        }
        
        logBox.appendChild(logEntry);
        logBox.scrollTop = logBox.scrollHeight;
      }
    } 
    // If step 3
    else if (stateProp === 'currentState' && this.currentStep === 2) {
      this.updateActionButtons(nextState, 'puz');
      if (logBox) {
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.innerHTML = `RESULT(${prevStateStr}, <span style="color:#38bdf8;">${action}</span>) = <strong>${nextState.toString()}</strong>`;
        logBox.appendChild(logEntry);
        logBox.scrollTop = logBox.scrollHeight;
      }
    }

    this.draw();
  }

  handleKeyboardMove(e, logBox, stateProp) {
    let action = null;
    if (['ArrowUp', 'KeyW'].includes(e.code)) action = 'Up';
    else if (['ArrowDown', 'KeyS'].includes(e.code)) action = 'Down';
    else if (['ArrowLeft', 'KeyA'].includes(e.code)) action = 'Left';
    else if (['ArrowRight', 'KeyD'].includes(e.code)) action = 'Right';

    if (action) {
      e.preventDefault();
      this.applyAction(action, logBox, stateProp);
    }
  }

  updateGoalStatus() {
    const reachable = Reachability.isReachable(this.initialState, this.customGoalState);
    const parityInit = Reachability.getInversions(this.initialTiles) % 2;
    const parityGoal = Reachability.getInversions(this.customGoalTiles) % 2;

    if (this.puzGoalStatus) {
      if (reachable) {
        this.puzGoalStatus.innerHTML = `
          <div style="color: #10b981; font-weight: bold; display: flex; align-items: center; gap: 0.25rem;">
            <span style="font-size: 1.25rem;">✓</span> Reachable from Initial State
          </div>
          <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.2rem;">
            Initial Inversions: <strong>${Reachability.getInversions(this.initialTiles)}</strong> (Parity: ${parityInit === 0 ? 'Even' : 'Odd'}) <br>
            Goal Inversions: <strong>${Reachability.getInversions(this.customGoalTiles)}</strong> (Parity: ${parityGoal === 0 ? 'Even' : 'Odd'})
          </div>
        `;
      } else {
        this.puzGoalStatus.innerHTML = `
          <div style="color: #ef4444; font-weight: bold; display: flex; align-items: center; gap: 0.25rem;">
            <span style="font-size: 1.25rem;">✗</span> Not Reachable from Initial State
          </div>
          <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.2rem;">
            Initial Inversions: <strong>${Reachability.getInversions(this.initialTiles)}</strong> (Parity: ${parityInit === 0 ? 'Even' : 'Odd'}) <br>
            Goal Inversions: <strong>${Reachability.getInversions(this.customGoalTiles)}</strong> (Parity: ${parityGoal === 0 ? 'Even' : 'Odd'})
          </div>
        `;
      }
    }
  }

  updateTreeStats() {
    const { totalNodes, uniqueStatesCount } = Reachability.buildExpansionTree(this.initialState, this.depthSelected);
    
    const setSafeText = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    
    setSafeText('puz-tree-nodes-total', totalNodes);
    setSafeText('puz-tree-nodes-unique', uniqueStatesCount);
  }

  triggerDuplicateLoopDemo() {
    // Force a sequence of Right -> Left -> Right moves to show duplication
    const sequence = ['Right', 'Left', 'Right'];
    let stepCount = 0;
    
    this.currentState = new PuzzleState(this.initialTiles);
    this.explorationMoves = 0;
    this.explorationHistory = [this.currentState.tiles.join(',')];
    if (this.puzExploreLog) {
      this.puzExploreLog.innerHTML = `<div class="log-entry"><strong>Demo Cycle: Loop detection sequence initialized.</strong></div>`;
    }
    
    const interval = setInterval(() => {
      if (stepCount < sequence.length) {
        this.applyAction(sequence[stepCount], this.puzExploreLog, 'currentState');
        stepCount++;
      } else {
        clearInterval(interval);
      }
    }, 600);
  }

  /**
   * Main Drawing dispatcher
   */
  draw() {
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);
    this.ctx.clearRect(0, 0, w, h);

    if (this.currentStep === 0) {
      // Step 1: Show Initial and Goal state side-by-side
      const boardSize = Math.min(w * 0.35, h * 0.7);
      const leftX = w * 0.12;
      const rightX = w * 0.52;
      const centerY = (h - boardSize) / 2;

      this.drawPuzzleBoard(this.initialTiles, leftX, centerY, boardSize, "Initial State");
      this.drawPuzzleBoard(this.goalTiles, rightX, centerY, boardSize, "Goal State");
    } 
    else if (this.currentStep === 1) {
      // Step 2: Explain State Representation
      const boardSize = Math.min(w * 0.35, h * 0.6);
      const boardX = (w - boardSize) / 2;
      const boardY = (h - boardSize) / 2 - 20;

      this.drawPuzzleBoard(this.initialTiles, boardX, boardY, boardSize, "State Representation Mapping");
      
      // Draw mapping boxes under it
      this.drawArrayRepresentation(this.initialTiles, boardX, boardY + boardSize + 25, boardSize);
    } 
    else if (this.currentStep === 2) {
      // Step 3: Actions & Transitions
      const boardSize = Math.min(w * 0.45, h * 0.75);
      const boardX = (w - boardSize) / 2;
      const boardY = (h - boardSize) / 2;

      this.drawPuzzleBoard(this.currentState.tiles, boardX, boardY, boardSize, "Interactive State transitions");
    } 
    else if (this.currentStep === 3) {
      // Step 4: Possible Configurations Map
      this.drawStateSpaceParityDivision(w, h);
    } 
    else if (this.currentStep === 4) {
      // Step 5: Solvability presets check
      const boardSize = Math.min(w * 0.35, h * 0.7);
      const leftX = w * 0.12;
      const rightX = w * 0.52;
      const centerY = (h - boardSize) / 2;

      this.drawPuzzleBoard(this.initialTiles, leftX, centerY, boardSize, "Initial State");
      
      const reachable = Reachability.isReachable(this.initialState, this.customGoalState);
      this.drawPuzzleBoard(this.customGoalTiles, rightX, centerY, boardSize, "Custom Goal State", reachable);
    } 
    else if (this.currentStep === 5) {
      // Step 6: Exploration and Duplicates
      const boardSize = Math.min(w * 0.45, h * 0.75);
      const boardX = (w - boardSize) / 2;
      const boardY = (h - boardSize) / 2;

      this.drawPuzzleBoard(this.currentState.tiles, boardX, boardY, boardSize, "Explore & Detect Duplicates");
    } 
    else if (this.currentStep === 6) {
      // Step 7: Reachability BFS search Tree
      this.drawSearchTreeExpansion(w, h);
    }
    else if (this.currentStep === 7) {
      // Step 8: Summary view
      // Draw Concept overview summary graphic
      this.drawConceptIllustration(w, h);
    }
  }

  /**
   * Draws a standard puzzle board on the canvas
   */
  drawPuzzleBoard(tiles, px, py, size, label = null, reachabilityStatus = null) {
    const ctx = this.ctx;
    
    // Draw card background
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(15, 23, 42, 0.05)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    ctx.beginPath();
    this.roundRect(px, py, size, size, 16);
    ctx.fill();
    ctx.shadowBlur = 0; // Reset
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.06)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Title label
    if (label) {
      ctx.fillStyle = '#475569'; // Slate 600
      ctx.font = 'bold 12px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, px + size / 2, py - 12);
    }

    // Draw tiles
    const padding = size * 0.04;
    const innerSize = size - padding * 2;
    const tileSize = innerSize / 3;

    for (let i = 0; i < 9; i++) {
      const tileVal = tiles[i];
      const tx = i % 3;
      const ty = Math.floor(i / 3);
      
      const x = px + padding + tx * tileSize;
      const y = py + padding + ty * tileSize;
      const ts = tileSize - padding * 0.5;

      if (tileVal === 0) {
        // Blank space
        ctx.fillStyle = '#f1f5f9'; // Slate 100
        ctx.beginPath();
        this.roundRect(x, y, ts, ts, 8);
        ctx.fill();
      } else {
        // Numbered Tile - Gradient & Glow style
        ctx.beginPath();
        this.roundRect(x, y, ts, ts, 8);
        
        ctx.fillStyle = '#4f46e5'; // Indigo
        ctx.fill();

        // White border
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Number Text
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.round(tileSize * 0.35)}px Outfit, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tileVal, x + ts / 2, y + ts / 2);

        // Drawing tiny index numbers for teaching representation mapping
        if (this.currentStep === 1) {
          ctx.fillStyle = 'rgba(255,255,255,0.4)';
          ctx.font = 'bold 9px monospace';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'bottom';
          ctx.fillText(`idx:${i}`, x + 5, y + ts - 5);
        }
      }
    }

    // Reachability label overlay
    if (reachabilityStatus !== null) {
      ctx.fillStyle = reachabilityStatus ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)'; // Green/Red
      ctx.beginPath();
      ctx.arc(px + size - 16, py + 16, 12, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(reachabilityStatus ? '✓' : '✗', px + size - 16, py + 16);
    }

    ctx.restore();
  }

  /**
   * Draws array boxes mapping array indices to board state
   */
  drawArrayRepresentation(tiles, px, py, size) {
    const ctx = this.ctx;
    const boxW = size / 9;
    const gap = 2;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Label
    ctx.fillStyle = '#64748b'; // Slate 500
    ctx.font = 'bold 9px monospace';
    ctx.fillText("INTERNAL MEMORY ARRAY REPRESENTATION", px + size / 2, py - 12);

    for (let i = 0; i < 9; i++) {
      const tile = tiles[i];
      const bx = px + i * boxW;
      
      // Box
      ctx.fillStyle = tile === 0 ? '#cbd5e1' : '#4f46e5';
      ctx.beginPath();
      this.roundRect(bx + gap, py, boxW - gap * 2, 28, 4);
      ctx.fill();

      // Number text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Outfit, sans-serif';
      ctx.fillText(tile === 0 ? '_' : tile, bx + boxW / 2, py + 14);

      // Index label
      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px monospace';
      ctx.fillText(i, bx + boxW / 2, py + 40);
    }
    ctx.restore();
  }

  /**
   * Step 4: Division map
   */
  drawStateSpaceParityDivision(w, h) {
    const ctx = this.ctx;
    ctx.save();

    // Box Title
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 13px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText("Complete Permutations Division Scheme", w / 2, 20);

    // Root block
    const rootW = 210;
    const rootH = 50;
    const rx = (w - rootW) / 2;
    const ry = 45;

    ctx.fillStyle = '#0f172a'; // Slate 900
    ctx.beginPath();
    this.roundRect(rx, ry, rootW, rootH, 8);
    ctx.fill();
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText("All Possible Configurations", w / 2, ry + 20);
    ctx.font = 'bold 10px monospace';
    ctx.fillText("9! = 362,880 arrangements", w / 2, ry + 36);

    // Split branches
    const by = ry + rootH;
    const cy = by + 60;
    const leftCX = w * 0.28;
    const rightCX = w * 0.72;

    ctx.strokeStyle = 'rgba(79, 70, 229, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w / 2, by);
    ctx.lineTo(w / 2, by + 20);
    ctx.lineTo(leftCX, by + 20);
    ctx.lineTo(leftCX, cy);
    ctx.moveTo(w / 2, by + 20);
    ctx.lineTo(rightCX, by + 20);
    ctx.lineTo(rightCX, cy);
    ctx.stroke();

    // Two branches
    const childW = 160;
    const childH = 65;

    // Class A (Reachable)
    ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
    ctx.beginPath();
    this.roundRect(leftCX - childW / 2, cy, childW, childH, 8);
    ctx.fill();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#065f46';
    ctx.font = 'bold 11px Outfit, sans-serif';
    ctx.fillText("Even Parity Group", leftCX, cy + 20);
    ctx.font = 'bold 13px Outfit, sans-serif';
    ctx.fillText("181,440 states", leftCX, cy + 38);
    ctx.font = 'italic 9px sans-serif';
    ctx.fillStyle = '#047857';
    ctx.fillText("(Reachable from Initial State)", leftCX, cy + 52);

    // Arrow to highlight
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText("▲ Selected Initial State belongs here", leftCX, cy + childH + 20);

    // Class B (Unreachable)
    ctx.fillStyle = 'rgba(239, 68, 68, 0.04)';
    ctx.beginPath();
    this.roundRect(rightCX - childW / 2, cy, childW, childH, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#991b1b';
    ctx.font = 'bold 11px Outfit, sans-serif';
    ctx.fillText("Odd Parity Group", rightCX, cy + 20);
    ctx.font = 'bold 13px Outfit, sans-serif';
    ctx.fillText("181,440 states", rightCX, cy + 38);
    ctx.font = 'italic 9px sans-serif';
    ctx.fillStyle = '#b91c1c';
    ctx.fillText("(Unsolvable from Initial State)", rightCX, cy + 52);

    ctx.restore();
  }

  /**
   * Step 7: Render Search Tree
   */
  drawSearchTreeExpansion(w, h) {
    const ctx = this.ctx;
    ctx.save();

    ctx.fillStyle = '#475569';
    ctx.font = 'bold 13px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Search Tree Expansion (Depth: ${this.depthSelected})`, w / 2, 20);

    const { root } = Reachability.buildExpansionTree(this.initialState, this.depthSelected);

    // Assign layout coordinates
    const startX = w / 2;
    const startY = 55;
    const widthSpacing = w * 0.9;
    this.assignTreeCoords(root, startX, startY, widthSpacing);

    // Draw lines first
    this.drawTreeLines(root);

    // Draw nodes
    this.drawTreeNodes(root);

    ctx.restore();
  }

  assignTreeCoords(node, x, y, width) {
    node.x = x;
    node.y = y;
    if (node.children && node.children.length > 0) {
      const numChildren = node.children.length;
      const childWidth = width / numChildren;
      node.children.forEach((child, idx) => {
        // Child X centers around parent
        const cx = x - width / 2 + childWidth * (idx + 0.5);
        const cy = y + 75;
        this.assignTreeCoords(child, cx, cy, childWidth);
      });
    }
  }

  drawTreeLines(node) {
    const ctx = this.ctx;
    node.children.forEach(child => {
      ctx.beginPath();
      ctx.moveTo(node.x, node.y);
      ctx.lineTo(child.x, child.y);
      ctx.strokeStyle = child.isDuplicate ? 'rgba(245, 158, 11, 0.25)' : 'rgba(79, 70, 229, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Action label in the middle of line
      const mx = (node.x + child.x) / 2;
      const my = (node.y + child.y) / 2 - 2;
      ctx.fillStyle = child.isDuplicate ? '#d97706' : '#4f46e5';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(child.action, mx, my);

      this.drawTreeLines(child);
    });
  }

  drawTreeNodes(node) {
    const ctx = this.ctx;
    const size = 26; // width/height of mini board

    ctx.save();
    
    // Draw miniature board
    const px = node.x - size / 2;
    const py = node.y - size / 2;

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    this.roundRect(px, py, size, size, 4);
    ctx.fill();

    // Outline node
    if (node.isDuplicate) {
      ctx.strokeStyle = '#f59e0b'; // Amber for duplicate
      ctx.lineWidth = 1.5;
    } else if (node.depth === 0) {
      ctx.strokeStyle = '#10b981'; // Green for root
      ctx.lineWidth = 2;
    } else {
      ctx.strokeStyle = 'rgba(79, 70, 229, 0.4)';
      ctx.lineWidth = 1;
    }
    ctx.stroke();

    // Draw mini 3x3 tiles
    const padding = 1.5;
    const tileSize = (size - padding * 2) / 3;

    for (let i = 0; i < 9; i++) {
      const val = node.state.tiles[i];
      const tx = i % 3;
      const ty = Math.floor(i / 3);

      const x = px + padding + tx * tileSize;
      const y = py + padding + ty * tileSize;
      const ts = tileSize - 0.5;

      if (val !== 0) {
        ctx.fillStyle = node.isDuplicate ? '#fef3c7' : '#e0e7ff';
        ctx.fillRect(x, y, ts, ts);

        ctx.fillStyle = node.isDuplicate ? '#b45309' : '#3730a3';
        ctx.font = 'bold 6px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(val, x + ts / 2, y + ts / 2);
      } else {
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(x, y, ts, ts);
      }
    }

    // Label if duplicate
    if (node.isDuplicate) {
      ctx.fillStyle = '#d97706';
      ctx.font = 'bold 6px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText("DUP", node.x, py + size + 8);
    } else if (node.depth === 0) {
      ctx.fillStyle = '#059669';
      ctx.font = 'bold 6px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText("ROOT", node.x, py + size + 8);
    }

    ctx.restore();

    node.children.forEach(child => this.drawTreeNodes(child));
  }

  /**
   * Step 8: Conceptual Graphic
   */
  drawConceptIllustration(w, h) {
    const ctx = this.ctx;
    ctx.save();

    ctx.fillStyle = '#475569';
    ctx.font = 'bold 14px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText("Core Conceptual Takeaway", w / 2, 22);

    // Large illustration box
    const boxW = w * 0.7;
    const boxH = h * 0.65;
    const bx = (w - boxW) / 2;
    const by = (h - boxH) / 2 + 10;

    // Draw main glass panel card
    ctx.fillStyle = 'rgba(79, 70, 229, 0.02)';
    ctx.beginPath();
    this.roundRect(bx, by, boxW, boxH, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(79, 70, 229, 0.1)';
    ctx.stroke();

    // Left and right visual representations
    const cellW = boxW * 0.42;
    const leftCX = bx + boxW * 0.05 + cellW / 2;
    const rightCX = bx + boxW * 0.53 + cellW / 2;
    const cellY = by + boxH * 0.15;
    const cellH = boxH * 0.72;

    // Draw imaginary box (all possible configurations)
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    this.roundRect(bx + boxW * 0.05, cellY, cellW, cellH, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(15,23,42,0.06)';
    ctx.stroke();

    // Draw reachable box (actual state space)
    ctx.fillStyle = 'rgba(16, 185, 129, 0.03)';
    ctx.beginPath();
    this.roundRect(bx + boxW * 0.53, cellY, cellW, cellH, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(16,185,129,0.2)';
    ctx.stroke();

    // Add labels
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 10px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText("WHAT STUDENTS OFTEN IMAGINE", leftCX, cellY - 8);
    ctx.fillStyle = '#10b981';
    ctx.fillText("WHAT THE REAL STATE SPACE IS", rightCX, cellY - 8);

    // Content text in left box
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.fillText("Imagined Permutations Space", leftCX, cellY + 30);
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText("Any board arrangement we think of.", leftCX, cellY + 50);
    ctx.fillText("Includes all 362,880 combinations.", leftCX, cellY + 70);
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText("Error: Contains unreachable states", leftCX, cellY + 110);

    // Content text in right box
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.fillText("Reachable State Space (S_reachable)", rightCX, cellY + 30);
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#047857';
    ctx.fillText("Only layouts obtainable from Initial State s0", rightCX, cellY + 50);
    ctx.fillText("via sequential legal actions Up/Down/Left/Right.", rightCX, cellY + 70);
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.fillText("Size: exactly 181,440 states", rightCX, cellY + 110);

    ctx.restore();
  }

  // Rounded rectangle helper
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

// Export UI to global window scope
window.PuzzleDemoUI = PuzzleDemoUI;
