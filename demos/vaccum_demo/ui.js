/**
 * UI Visualizer and Controller for the Two-Room Vacuum Robot Agent Demo.
 * Follows AIMA formulation:
 * - Environment State: (Location, Status A, Status B)
 * - Agent Percept: (Location, Current Room Status)
 * - Actions: Suck, Left, Right, NoOp
 * - Performance Scoring: +10 per room cleaned, -1.5 per Left/Right action
 */
class VacuumDemoUI {
  constructor() {
    // Canvas & Context
    this.canvas = document.getElementById('vaccum-canvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

    // Flow Steps & Teaching Panels
    this.stepIndicators = document.querySelectorAll('.vaccum-flow-step');
    this.stepPanels = document.querySelectorAll('.vaccum-teaching-panel');
    this.btnPrev = document.getElementById('btn-vaccum-prev');
    this.btnNext = document.getElementById('btn-vaccum-next');

    // Controls
    this.initialStateSelect = document.getElementById('vaccum-initial-select');
    this.agentSelect = document.getElementById('vaccum-agent-select');
    this.btnPlay = document.getElementById('btn-vaccum-play');
    this.btnStep = document.getElementById('btn-vaccum-step');
    this.btnReset = document.getElementById('btn-vaccum-reset');
    this.speedSlider = document.getElementById('vaccum-speed-slider');

    // Manual Environment Control Buttons (Step 1)
    this.btnManSuck = document.getElementById('btn-vaccum-man-suck');
    this.btnManLeft = document.getElementById('btn-vaccum-man-left');
    this.btnManRight = document.getElementById('btn-vaccum-man-right');
    this.btnManNoOp = document.getElementById('btn-vaccum-man-noop');
    this.btnToggleDirtA = document.getElementById('btn-vaccum-toggle-a');
    this.btnToggleDirtB = document.getElementById('btn-vaccum-toggle-b');
    this.btnMoveRobotA = document.getElementById('btn-vaccum-place-a');
    this.btnMoveRobotB = document.getElementById('btn-vaccum-place-b');

    // Stats Displays
    this.statScore = document.getElementById('vaccum-stat-score');
    this.statCleaned = document.getElementById('vaccum-stat-cleaned');
    this.statMoves = document.getElementById('vaccum-stat-moves');
    this.statTotalActions = document.getElementById('vaccum-stat-total');
    this.statTaskComplete = document.getElementById('vaccum-stat-complete');
    this.statAgentStopped = document.getElementById('vaccum-stat-stopped');

    // Inspector Elements
    this.inspectorState = document.getElementById('vaccum-inspect-state');
    this.inspectorPercept = document.getElementById('vaccum-inspect-percept');
    this.inspectorAction = document.getElementById('vaccum-inspect-action');
    this.inspectorExplanation = document.getElementById('vaccum-inspect-explanation');

    // Table-driven Agent Inspector (Step 2)
    this.tableHistoryList = document.getElementById('vaccum-table-history-list');
    this.tableLookupMatch = document.getElementById('vaccum-table-match');

    // Simple Reflex Inspector (Step 3)
    this.reflexRuleMatch = document.getElementById('vaccum-reflex-rule');
    this.reflexLoopWarning = document.getElementById('vaccum-reflex-loop-warning');

    // Model-Based Inspector (Step 4)
    this.modelStateA = document.getElementById('vaccum-model-a');
    this.modelStateB = document.getElementById('vaccum-model-b');
    this.modelRuleMatch = document.getElementById('vaccum-model-rule');

    // Side-by-side comparison (Step 5)
    this.btnCompRunAll = document.getElementById('btn-vaccum-comp-run');
    this.btnCompStepAll = document.getElementById('btn-vaccum-comp-step');
    this.btnCompResetAll = document.getElementById('btn-vaccum-comp-reset');
    this.compTableBody = document.getElementById('vaccum-comp-table-body');
    this.compActionLog = document.getElementById('vaccum-comp-actions-log');

    // State Variables
    this.currentStep = 0; // 0: Env, 1: Table, 2: Simple Reflex, 3: Model-Based, 4: Comparison
    this.initialConfig = { location: 'A', roomA: 'Dirty', roomB: 'Dirty' };
    
    // Environment & Agents
    this.env = new VacuumEnvironment(this.initialConfig);
    this.tableAgent = new TableDrivenAgent();
    this.simpleAgent = new SimpleReflexAgent();
    this.modelAgent = new ModelBasedReflexAgent();
    this.currentAgent = this.tableAgent;

    // Multi-agent comparison runner state (Step 5)
    this.compState = {
      table: {
        env: new VacuumEnvironment(this.initialConfig),
        agent: new TableDrivenAgent(),
        stopped: false,
        actionsToClean: null,
        lastDecision: null,
        history: []
      },
      reflex: {
        env: new VacuumEnvironment(this.initialConfig),
        agent: new SimpleReflexAgent(),
        stopped: false,
        actionsToClean: null,
        lastDecision: null,
        history: []
      },
      model: {
        env: new VacuumEnvironment(this.initialConfig),
        agent: new ModelBasedReflexAgent(),
        stopped: false,
        actionsToClean: null,
        lastDecision: null,
        history: []
      }
    };

    // Animation & Execution loop
    this.isPlaying = false;
    this.playInterval = null;
    this.playSpeed = 800; // ms per step
    this.lastAction = null;
    this.lastDecision = null;
    this.isAgentStopped = false;

    // Visual animation particles (dust, sparkles, suction vortex)
    this.particles = [];
    this.suctionAnimationActive = false;
    this.suctionFrame = 0;
    this.robotAnimX = null;
    this.targetRobotAnimX = null;

    this.init();
  }

  init() {
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // Progress Step Navigation
    if (this.btnPrev) this.btnPrev.addEventListener('click', () => this.setStep(this.currentStep - 1));
    if (this.btnNext) this.btnNext.addEventListener('click', () => this.setStep(this.currentStep + 1));

    this.stepIndicators.forEach((indicator, index) => {
      indicator.addEventListener('click', () => this.setStep(index));
    });

    // Initial Configuration Preset Change
    if (this.initialStateSelect) {
      this.initialStateSelect.addEventListener('change', (e) => {
        this.applyInitialConfigPreset(e.target.value);
      });
    }

    // Agent Selector Change
    if (this.agentSelect) {
      this.agentSelect.addEventListener('change', (e) => {
        this.selectAgent(e.target.value);
      });
    }

    // Control Buttons
    if (this.btnPlay) this.btnPlay.addEventListener('click', () => this.togglePlay());
    if (this.btnStep) this.btnStep.addEventListener('click', () => this.step());
    if (this.btnReset) this.btnReset.addEventListener('click', () => this.reset());

    // Speed Slider
    if (this.speedSlider) {
      this.speedSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        this.playSpeed = 1600 - (val * 280); // 1: 1320ms, 3: 760ms, 5: 200ms
        if (this.isPlaying) {
          this.pause();
          this.play();
        }
      });
    }

    // Manual Action Buttons (Step 0)
    if (this.btnManSuck) this.btnManSuck.addEventListener('click', () => this.executeManualAction('Suck'));
    if (this.btnManLeft) this.btnManLeft.addEventListener('click', () => this.executeManualAction('Left'));
    if (this.btnManRight) this.btnManRight.addEventListener('click', () => this.executeManualAction('Right'));
    if (this.btnManNoOp) this.btnManNoOp.addEventListener('click', () => this.executeManualAction('NoOp'));

    if (this.btnToggleDirtA) this.btnToggleDirtA.addEventListener('click', () => this.toggleRoomDirt('A'));
    if (this.btnToggleDirtB) this.btnToggleDirtB.addEventListener('click', () => this.toggleRoomDirt('B'));
    if (this.btnMoveRobotA) this.btnMoveRobotA.addEventListener('click', () => this.placeRobot('A'));
    if (this.btnMoveRobotB) this.btnMoveRobotB.addEventListener('click', () => this.placeRobot('B'));

    // Comparison Step Buttons (Step 4)
    if (this.btnCompRunAll) this.btnCompRunAll.addEventListener('click', () => this.togglePlayComp());
    if (this.btnCompStepAll) this.btnCompStepAll.addEventListener('click', () => this.stepComparison());
    if (this.btnCompResetAll) this.btnCompResetAll.addEventListener('click', () => this.resetComparison());

    // Canvas click interactions (click room to toggle dirt or move robot)
    if (this.canvas) {
      this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
    }

    // Start render loop
    this.startAnimationLoop();

    // Initialize environment and comparison UI
    this.updateUI();
    this.resetComparison();
  }

  resizeCanvas() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    if (this.ctx) {
      this.ctx.scale(dpr, dpr);
    }
    this.draw();
  }

  setStep(stepIndex) {
    if (stepIndex < 0) stepIndex = 0;
    if (stepIndex >= this.stepIndicators.length) stepIndex = this.stepIndicators.length - 1;

    this.currentStep = stepIndex;

    // Update Progress Bar
    this.stepIndicators.forEach((ind, i) => {
      ind.classList.toggle('active', i === stepIndex);
      ind.classList.toggle('completed', i < stepIndex);
    });

    // Update Step Panels
    this.stepPanels.forEach((panel, i) => {
      panel.classList.toggle('active', i === stepIndex);
    });

    // Update Prev / Next button states
    if (this.btnPrev) this.btnPrev.disabled = stepIndex === 0;
    if (this.btnNext) this.btnNext.disabled = stepIndex === this.stepIndicators.length - 1;

    // Auto-select corresponding agent according to teaching flow
    if (stepIndex === 1) {
      // Step 2: Table-Driven Agent
      if (this.agentSelect) this.agentSelect.value = 'table';
      this.selectAgent('table');
    } else if (stepIndex === 2) {
      // Step 3: Simple Reflex Agent
      if (this.agentSelect) this.agentSelect.value = 'reflex';
      this.selectAgent('reflex');
    } else if (stepIndex === 3) {
      // Step 4: Model-Based Reflex Agent
      if (this.agentSelect) this.agentSelect.value = 'model';
      this.selectAgent('model');
    } else if (stepIndex === 4) {
      // Step 5: Comparison
      this.resetComparison();
    }

    this.pause();
    this.updateUI();
    this.draw();
  }

  applyInitialConfigPreset(val) {
    // Parse preset values: e.g. "A_Dirty_Dirty", "A_Dirty_Clean", "B_Dirty_Dirty", etc.
    const parts = val.split('_');
    if (parts.length === 3) {
      this.initialConfig = {
        location: parts[0],
        roomA: parts[1],
        roomB: parts[2]
      };
      this.reset();
      this.resetComparison();
    }
  }

  selectAgent(type) {
    if (type === 'table') {
      this.currentAgent = this.tableAgent;
    } else if (type === 'reflex') {
      this.currentAgent = this.simpleAgent;
    } else if (type === 'model') {
      this.currentAgent = this.modelAgent;
    }
    this.reset();
  }

  toggleRoomDirt(room) {
    if (room === 'A') {
      this.initialConfig.roomA = this.initialConfig.roomA === 'Dirty' ? 'Clean' : 'Dirty';
    } else {
      this.initialConfig.roomB = this.initialConfig.roomB === 'Dirty' ? 'Clean' : 'Dirty';
    }
    this.syncInitialSelect();
    this.reset();
  }

  placeRobot(room) {
    this.initialConfig.location = room;
    this.syncInitialSelect();
    this.reset();
  }

  syncInitialSelect() {
    if (this.initialStateSelect) {
      const val = `${this.initialConfig.location}_${this.initialConfig.roomA}_${this.initialConfig.roomB}`;
      this.initialStateSelect.value = val;
    }
  }

  handleCanvasClick(e) {
    if (this.isPlaying) return;
    const rect = this.canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const midX = rect.width / 2;

    // Top area click toggles Clean/Dirty, bottom area click places robot
    if (clickY < rect.height * 0.45) {
      if (clickX < midX) {
        this.toggleRoomDirt('A');
      } else {
        this.toggleRoomDirt('B');
      }
    } else {
      if (clickX < midX) {
        this.placeRobot('A');
      } else {
        this.placeRobot('B');
      }
    }
  }

  executeManualAction(action) {
    if (this.isPlaying) this.pause();
    const record = this.env.transition(action);
    this.lastAction = action;
    this.lastDecision = {
      action: action,
      explanation: `Manual execution of ${action}.`
    };

    if (action === 'Suck') {
      this.triggerSuctionAnimation();
    }

    this.updateUI();
    this.draw();
  }

  step() {
    if (this.isAgentStopped) {
      return;
    }

    const percept = this.env.getPercept();
    const decision = this.currentAgent.decide(percept);
    this.lastDecision = decision;
    this.lastAction = decision.action;

    // Transition environment
    const record = this.env.transition(decision.action);

    if (decision.action === 'Suck') {
      this.triggerSuctionAnimation();
    }

    // Check if agent explicitly decided to stop (NoOp)
    if (decision.action === 'NoOp') {
      this.isAgentStopped = true;
      if (this.isPlaying) {
        this.pause();
      }
    }

    // Protection against excessive loops in auto-run mode for Simple Reflex
    if (this.env.totalActions >= 20 && this.isPlaying) {
      this.pause();
    }

    this.updateUI();
    this.draw();
  }

  play() {
    if (this.isAgentStopped) {
      this.reset();
    }

    this.isPlaying = true;
    if (this.btnPlay) {
      this.btnPlay.innerHTML = '<i data-lucide="pause"></i> Pause';
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    this.playInterval = setInterval(() => {
      this.step();
      if (this.isAgentStopped) {
        this.pause();
      }
    }, this.playSpeed);
  }

  pause() {
    this.isPlaying = false;
    if (this.btnPlay) {
      this.btnPlay.innerHTML = '<i data-lucide="play"></i> Auto Run';
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }
    if (this.btnCompRunAll) {
      this.btnCompRunAll.innerHTML = '<i data-lucide="play"></i> Run All 3 Agents';
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }
    if (this.playInterval) {
      clearInterval(this.playInterval);
      this.playInterval = null;
    }
  }

  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  reset() {
    this.pause();
    this.env = new VacuumEnvironment(this.initialConfig);
    this.currentAgent.reset();
    this.lastAction = null;
    this.lastDecision = null;
    this.isAgentStopped = false;
    this.particles = [];
    this.updateUI();
    this.draw();
  }

  // --- Multi-Agent Side-by-Side Comparison Engine (Step 4) ---
  resetComparison() {
    this.pause();
    this.compState = {
      table: {
        env: new VacuumEnvironment(this.initialConfig),
        agent: new TableDrivenAgent(),
        stopped: false,
        actionsToClean: null,
        lastDecision: null,
        history: []
      },
      reflex: {
        env: new VacuumEnvironment(this.initialConfig),
        agent: new SimpleReflexAgent(),
        stopped: false,
        actionsToClean: null,
        lastDecision: null,
        history: []
      },
      model: {
        env: new VacuumEnvironment(this.initialConfig),
        agent: new ModelBasedReflexAgent(),
        stopped: false,
        actionsToClean: null,
        lastDecision: null,
        history: []
      }
    };
    this.updateComparisonUI();
  }

  stepComparison() {
    const agents = ['table', 'reflex', 'model'];
    let anyActive = false;

    agents.forEach(key => {
      const item = this.compState[key];
      // Limit reflex agent to 12 steps so it doesn't loop infinitely
      if (!item.stopped && item.env.totalActions < 12) {
        anyActive = true;
        const percept = item.env.getPercept();
        const decision = item.agent.decide(percept);
        item.lastDecision = decision;
        
        // Execute action
        const rec = item.env.transition(decision.action);
        item.history.push({
          action: decision.action,
          percept: percept.toString(),
          stateAfter: item.env.getState().toString(),
          score: item.env.score
        });

        // Record actions required to first reach complete cleaning state
        if (item.env.isTaskComplete() && item.actionsToClean === null) {
          item.actionsToClean = item.env.totalActions;
        }

        if (decision.action === 'NoOp') {
          item.stopped = true;
        }
      }
    });

    this.updateComparisonUI();

    if (!anyActive && this.isPlaying) {
      this.pause();
    }
  }

  togglePlayComp() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.isPlaying = true;
      if (this.btnCompRunAll) {
        this.btnCompRunAll.innerHTML = '<i data-lucide="pause"></i> Pause Comparison';
        if (typeof lucide !== 'undefined') lucide.createIcons();
      }

      this.playInterval = setInterval(() => {
        this.stepComparison();
        const allDone = (
          (this.compState.table.stopped) &&
          (this.compState.model.stopped) &&
          (this.compState.reflex.env.totalActions >= 8)
        );
        if (allDone) {
          this.pause();
        }
      }, this.playSpeed);
    }
  }

  updateComparisonUI() {
    if (!this.compTableBody) return;

    const data = [
      {
        id: 'table',
        name: 'Table-Driven Agent',
        basis: 'Percept History',
        memory: 'Full History / Table Lookup',
        state: this.compState.table,
        stopsBySelf: 'Yes (via table entry NoOp)'
      },
      {
        id: 'reflex',
        name: 'Simple Reflex Agent',
        basis: 'Current Percept Only',
        memory: 'None (0 memory)',
        state: this.compState.reflex,
        stopsBySelf: 'No (loops Left ↔ Right)*'
      },
      {
        id: 'model',
        name: 'Model-Based Reflex',
        basis: 'Percept + Internal Model',
        memory: 'Internal State: (A, B)',
        state: this.compState.model,
        stopsBySelf: 'Yes (knows both are clean)'
      }
    ];

    let rowsHTML = '';
    let actionLogHTML = '';

    data.forEach(item => {
      const s = item.state;
      const isComplete = s.env.isTaskComplete();
      const actionsToClean = s.actionsToClean !== null ? s.actionsToClean : (isComplete ? s.env.totalActions : '-');
      const score = s.env.score.toFixed(1);
      const totalActions = s.env.totalActions;
      const moves = s.env.movementActions;

      const completeBadge = isComplete
        ? `<span class="vaccum-badge success"><i data-lucide="check"></i> Yes</span>`
        : `<span class="vaccum-badge pending">In Progress</span>`;

      const stopsBadge = s.stopped
        ? `<span class="vaccum-badge success"><i data-lucide="check-circle-2"></i> Stopped</span>`
        : (item.id === 'reflex' && isComplete
            ? `<span class="vaccum-badge warning">Oscillating (No Memory)</span>`
            : `<span class="vaccum-badge neutral">Running</span>`);

      rowsHTML += `
        <tr>
          <td><strong>${item.name}</strong></td>
          <td><span class="vaccum-tag">${item.basis}</span></td>
          <td><code>${item.memory}</code></td>
          <td>${completeBadge}</td>
          <td>${stopsBadge}</td>
          <td><strong style="color: var(--primary);">${actionsToClean}</strong></td>
          <td>${moves}</td>
          <td>${totalActions}</td>
          <td><strong style="color: ${score >= 0 ? 'var(--accent)' : 'var(--danger)'}; font-size: 1rem;">${score}</strong></td>
        </tr>
      `;

      // Build Action sequence display
      const actionsSequence = s.history.length > 0
        ? s.history.map(h => `<span class="vaccum-action-pill ${h.action.toLowerCase()}">${h.action}</span>`).join(' <span class="vaccum-arrow">→</span> ')
        : '<span style="color: var(--text-muted);">No actions executed yet</span>';

      actionLogHTML += `
        <div class="vaccum-agent-trace-card">
          <div class="vaccum-agent-trace-header">
            <h4>${item.name}</h4>
            <div class="vaccum-trace-meta">Score: <strong>${score}</strong> | Moves: <strong>${moves}</strong></div>
          </div>
          <div class="vaccum-sequence-box">${actionsSequence}</div>
        </div>
      `;
    });

    this.compTableBody.innerHTML = rowsHTML;
    if (this.compActionLog) {
      this.compActionLog.innerHTML = actionLogHTML;
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  // --- Animation & Suction Trigger ---
  triggerSuctionAnimation() {
    this.suctionAnimationActive = true;
    this.suctionFrame = 0;
    // Generate burst particles
    const isRoomA = this.env.location === 'A';
    for (let i = 0; i < 20; i++) {
      this.particles.push({
        x: (isRoomA ? 0.25 : 0.75) + (Math.random() - 0.5) * 0.25,
        y: 0.55 + (Math.random() - 0.5) * 0.2,
        vx: (isRoomA ? 0.25 : 0.75 - ((isRoomA ? 0.25 : 0.75) + (Math.random() - 0.5) * 0.25)) * 0.1,
        vy: -0.01 - Math.random() * 0.02,
        size: 3 + Math.random() * 4,
        alpha: 1,
        color: '#f59e0b'
      });
    }
  }

  startAnimationLoop() {
    const loop = () => {
      // Update particles
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += (p.vx || 0);
        p.y += (p.vy || 0);
        p.alpha -= 0.03;
        if (p.alpha <= 0) {
          this.particles.splice(i, 1);
        }
      }

      if (this.suctionAnimationActive) {
        this.suctionFrame++;
        if (this.suctionFrame > 25) {
          this.suctionAnimationActive = false;
        }
      }

      // Smooth robot position interpolation
      const targetX = this.env.location === 'A' ? 0.25 : 0.75;
      if (this.robotAnimX === null) {
        this.robotAnimX = targetX;
      } else {
        this.robotAnimX += (targetX - this.robotAnimX) * 0.25;
      }

      this.draw();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  updateUI() {
    // 1. Stats Counter Updates
    if (this.statScore) this.statScore.textContent = this.env.score.toFixed(1);
    if (this.statCleaned) this.statCleaned.textContent = `${this.env.roomsCleaned} / 2`;
    if (this.statMoves) this.statMoves.textContent = this.env.movementActions;
    if (this.statTotalActions) this.statTotalActions.textContent = this.env.totalActions;

    const isComplete = this.env.isTaskComplete();
    if (this.statTaskComplete) {
      this.statTaskComplete.textContent = isComplete ? "Yes (Both Clean)" : "No";
      this.statTaskComplete.style.color = isComplete ? "var(--accent)" : "var(--danger)";
    }

    if (this.statAgentStopped) {
      this.statAgentStopped.textContent = this.isAgentStopped ? "Yes (NoOp)" : "No";
      this.statAgentStopped.style.color = this.isAgentStopped ? "var(--accent)" : "var(--text-secondary)";
    }

    // 2. Inspector Displays
    const stateObj = this.env.getState();
    const perceptObj = this.env.getPercept();

    if (this.inspectorState) this.inspectorState.textContent = stateObj.toString();
    if (this.inspectorPercept) this.inspectorPercept.textContent = perceptObj.toString();
    if (this.inspectorAction) {
      this.inspectorAction.textContent = this.lastAction || 'Waiting for step';
      this.inspectorAction.className = `vaccum-action-pill ${this.lastAction ? this.lastAction.toLowerCase() : ''}`;
    }
    if (this.inspectorExplanation) {
      this.inspectorExplanation.textContent = this.lastDecision ? this.lastDecision.explanation : 'Select an agent and click Step or Auto Run to start simulation.';
    }

    // 3. Step-Specific Inspector Panels
    // Step 2: Table-Driven Inspector
    if (this.tableHistoryList) {
      if (this.tableAgent.perceptHistory.length === 0) {
        this.tableHistoryList.innerHTML = '<span style="color: var(--text-muted);">History empty []</span>';
      } else {
        const historyHTML = this.tableAgent.perceptHistory.map((p, idx) => 
          `<span class="vaccum-history-item"><span class="vaccum-history-step">${idx + 1}</span> (${p.location}, ${p.status})</span>`
        ).join(' <span class="vaccum-arrow">→</span> ');
        this.tableHistoryList.innerHTML = historyHTML;
      }
    }
    if (this.tableLookupMatch) {
      if (this.lastDecision && this.lastDecision.agentType === 'Table-Driven') {
        this.tableLookupMatch.innerHTML = `
          <div><strong>Key:</strong> <code>${this.lastDecision.historyKey}</code></div>
          <div style="margin-top: 0.25rem;"><strong>Table Action:</strong> <span class="vaccum-action-pill ${this.lastDecision.action.toLowerCase()}">${this.lastDecision.action}</span></div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem;">(Table size: ${this.lastDecision.tableSize} entries)</div>
        `;
      } else {
        this.tableLookupMatch.innerHTML = '<span style="color: var(--text-muted);">Step agent to inspect table lookup.</span>';
      }
    }

    // Step 3: Simple Reflex Inspector
    if (this.reflexRuleMatch) {
      if (this.lastDecision && this.lastDecision.agentType === 'Simple Reflex') {
        this.reflexRuleMatch.innerHTML = `
          <div class="vaccum-rule-box">
            <div class="vaccum-rule-tag">Rule Fired</div>
            <code>${this.lastDecision.ruleMatched}</code>
          </div>
        `;
      } else {
        this.reflexRuleMatch.innerHTML = '<span style="color: var(--text-muted);">Step agent to see matching condition-action rule.</span>';
      }
    }

    if (this.reflexLoopWarning) {
      const isOscillating = (this.currentAgent === this.simpleAgent && isComplete && this.env.totalActions > 2);
      this.reflexLoopWarning.style.display = isOscillating ? 'block' : 'none';
    }

    // Step 4: Model-Based Inspector
    if (this.modelStateA && this.modelStateB) {
      const model = this.modelAgent.internalState;
      this.modelStateA.textContent = model.A;
      this.modelStateA.className = `vaccum-model-pill ${model.A.toLowerCase()}`;
      this.modelStateB.textContent = model.B;
      this.modelStateB.className = `vaccum-model-pill ${model.B.toLowerCase()}`;
    }
    if (this.modelRuleMatch) {
      if (this.lastDecision && this.lastDecision.agentType === 'Model-Based Reflex') {
        this.modelRuleMatch.innerHTML = `
          <div class="vaccum-rule-box">
            <div class="vaccum-rule-tag">Model Rule Fired</div>
            <code>${this.lastDecision.ruleMatched}</code>
          </div>
        `;
      } else {
        this.modelRuleMatch.innerHTML = '<span style="color: var(--text-muted);">Step agent to see internal state model updates.</span>';
      }
    }
  }

  // --- Canvas Drawing Function ---
  draw() {
    if (!this.ctx || !this.canvas) return;

    const ctx = this.ctx;
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    // Clear background
    ctx.clearRect(0, 0, w, h);

    const midX = w / 2;
    const roomW = midX - 16;
    const roomH = h - 44;
    const roomY = 34;

    // Draw Room A (Left)
    this.drawRoom(ctx, 10, roomY, roomW, roomH, 'Room A', this.env.roomA, this.env.location === 'A');

    // Draw Room B (Right)
    this.drawRoom(ctx, midX + 6, roomY, roomW, roomH, 'Room B', this.env.roomB, this.env.location === 'B');

    // Draw Dividing Wall & Doorway
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(midX - 4, roomY, 8, roomH);
    // Doorway cut
    ctx.clearRect(midX - 5, roomY + roomH * 0.35, 10, roomH * 0.5);
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.3)';
    ctx.strokeRect(midX - 5, roomY + roomH * 0.35, 10, roomH * 0.5);
    ctx.restore();

    // Draw Dust / Dirt Elements in Rooms
    this.drawDirt(ctx, 10, roomY, roomW, roomH, this.env.roomA);
    this.drawDirt(ctx, midX + 6, roomY, roomW, roomH, this.env.roomB);

    // Draw Particles (Suction / Cleaning Sparkles)
    this.drawParticles(ctx, w, h);

    // Draw Animated Vacuum Robot
    const rx = (this.robotAnimX !== null ? this.robotAnimX : (this.env.location === 'A' ? 0.25 : 0.75)) * w;
    const ry = roomY + roomH * 0.62;
    this.drawRobot(ctx, rx, ry);

    // Draw Top Environment State HUD
    this.drawTopHUD(ctx, w);
  }

  drawRoom(ctx, x, y, width, height, label, status, hasRobot) {
    ctx.save();
    
    // Room Flooring Background
    const isDirty = status === 'Dirty';
    const bgGradient = ctx.createLinearGradient(x, y, x, y + height);
    if (isDirty) {
      bgGradient.addColorStop(0, 'rgba(30, 41, 59, 0.85)');
      bgGradient.addColorStop(1, 'rgba(15, 23, 42, 0.95)');
    } else {
      bgGradient.addColorStop(0, 'rgba(30, 58, 70, 0.75)');
      bgGradient.addColorStop(1, 'rgba(15, 30, 45, 0.9)');
    }

    ctx.fillStyle = bgGradient;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 16);
    ctx.fill();

    // Border
    ctx.strokeStyle = hasRobot ? 'rgba(99, 102, 241, 0.6)' : 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = hasRobot ? 2 : 1;
    ctx.stroke();

    // Floor tile grid pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    const tileSize = 36;
    for (let tx = x; tx < x + width; tx += tileSize) {
      ctx.beginPath();
      ctx.moveTo(tx, y + 40);
      ctx.lineTo(tx, y + height);
      ctx.stroke();
    }
    for (let ty = y + 40; ty < y + height; ty += tileSize) {
      ctx.beginPath();
      ctx.moveTo(x, ty);
      ctx.lineTo(x + width, ty);
      ctx.stroke();
    }

    // Room Header Label
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 15px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, x + 16, y + 26);

    // Status Badge
    const badgeX = x + width - 85;
    const badgeY = y + 10;
    const badgeW = 72;
    const badgeH = 24;

    ctx.fillStyle = isDirty ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)';
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 12);
    ctx.fill();
    ctx.strokeStyle = isDirty ? 'rgba(239, 68, 68, 0.5)' : 'rgba(16, 185, 129, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = isDirty ? '#fca5a5' : '#6ee7b7';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(status.toUpperCase(), badgeX + badgeW / 2, badgeY + 16);

    ctx.restore();
  }

  drawDirt(ctx, x, y, width, height, status) {
    if (status !== 'Dirty') {
      // Draw subtle clean sparkles
      ctx.save();
      ctx.fillStyle = 'rgba(34, 211, 238, 0.3)';
      const cx = x + width * 0.5;
      const cy = y + height * 0.4;
      this.drawStar(ctx, cx - 40, cy, 5, 2, 4);
      this.drawStar(ctx, cx + 40, cy + 20, 6, 2.5, 4);
      ctx.restore();
      return;
    }

    ctx.save();
    // Clustered dust & debris patches
    const dirtPatches = [
      { rx: 0.25, ry: 0.45, size: 14, color: 'rgba(180, 130, 80, 0.45)' },
      { rx: 0.32, ry: 0.52, size: 8, color: 'rgba(150, 100, 60, 0.5)' },
      { rx: 0.65, ry: 0.42, size: 16, color: 'rgba(180, 130, 80, 0.4)' },
      { rx: 0.72, ry: 0.50, size: 10, color: 'rgba(140, 95, 55, 0.55)' },
      { rx: 0.45, ry: 0.75, size: 12, color: 'rgba(160, 110, 70, 0.45)' },
      { rx: 0.52, ry: 0.82, size: 7, color: 'rgba(130, 85, 50, 0.5)' }
    ];

    dirtPatches.forEach(dp => {
      const px = x + width * dp.rx;
      const py = y + height * dp.ry;

      ctx.beginPath();
      ctx.arc(px, py, dp.size, 0, 2 * Math.PI);
      ctx.fillStyle = dp.color;
      ctx.fill();

      // Small scattered dust crumbs
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(px + (i * 6 - 9), py + ((i % 2) * 6 - 3), 2, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(217, 119, 6, 0.7)';
        ctx.fill();
      }
    });

    ctx.restore();
  }

  drawStar(ctx, cx, cy, outerRadius, innerRadius, points) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / points;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < points; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
  }

  drawParticles(ctx) {
    ctx.save();
    this.particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x * this.canvas.getBoundingClientRect().width, p.y * this.canvas.getBoundingClientRect().height, p.size, 0, 2 * Math.PI);
      ctx.fillStyle = `rgba(245, 158, 11, ${p.alpha})`;
      ctx.fill();
    });
    ctx.restore();
  }

  drawRobot(ctx, x, y) {
    ctx.save();

    // Suction Vortex Whirl Effect
    if (this.suctionAnimationActive) {
      const vortexAngle = this.suctionFrame * 0.4;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(vortexAngle);
      ctx.beginPath();
      ctx.arc(0, 0, 48, 0, 1.5 * Math.PI);
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.7)';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, 36, 0, 1.2 * Math.PI);
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.8)';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();
    }

    // Robot Shadow
    ctx.beginPath();
    ctx.ellipse(x, y + 26, 32, 10, 0, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fill();

    // Robot Chassis (Circular Body)
    const bodyRadius = 28;
    const bodyGradient = ctx.createRadialGradient(x - 6, y - 8, 4, x, y, bodyRadius);
    bodyGradient.addColorStop(0, '#6366f1');
    bodyGradient.addColorStop(0.7, '#4338ca');
    bodyGradient.addColorStop(1, '#312e81');

    ctx.beginPath();
    ctx.arc(x, y, bodyRadius, 0, 2 * Math.PI);
    ctx.fillStyle = bodyGradient;
    ctx.shadowColor = '#6366f1';
    ctx.shadowBlur = 16;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Outer Chrome Rim
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Front Bumper Arc
    ctx.beginPath();
    ctx.arc(x, y, bodyRadius - 3, Math.PI * 0.2, Math.PI * 0.8);
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.9)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Robot Center Sensor Dome / Button
    ctx.beginPath();
    ctx.arc(x, y - 2, 10, 0, 2 * Math.PI);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Power / Status LED Eye
    ctx.beginPath();
    ctx.arc(x, y - 2, 4, 0, 2 * Math.PI);
    ctx.fillStyle = this.suctionAnimationActive ? '#22d3ee' : '#10b981';
    ctx.shadowColor = this.suctionAnimationActive ? '#22d3ee' : '#10b981';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Robot Label / Emoji
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🤖 AGENT', x, y + 14);

    // Floating Percept HUD Badge Above Robot
    const percept = this.env.getPercept();
    const hudW = 120;
    const hudH = 24;
    const hudX = x - hudW / 2;
    const hudY = y - 46;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.beginPath();
    ctx.roundRect(hudX, hudY, hudW, hudH, 8);
    ctx.fill();

    ctx.strokeStyle = 'rgba(99, 102, 241, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 11px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Percept: (${percept.location}, ${percept.status})`, x, hudY + 17);

    ctx.restore();
  }

  drawTopHUD(ctx, w) {
    ctx.save();
    // Top banner for Full Environment State
    const state = this.env.getState();
    const bannerH = 26;
    
    ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
    ctx.fillRect(0, 0, w, bannerH);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.strokeRect(0, 0, w, bannerH);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Full Environment State: State = ${state.toString()}`, 16, 17);

    ctx.textAlign = 'right';
    const isComplete = this.env.isTaskComplete();
    ctx.fillStyle = isComplete ? '#34d399' : '#f87171';
    ctx.fillText(`Task Complete: ${isComplete ? 'YES (A=Clean ∧ B=Clean)' : 'NO'}`, w - 16, 17);

    ctx.restore();
  }
}

// Export to window
window.VacuumDemoUI = VacuumDemoUI;
