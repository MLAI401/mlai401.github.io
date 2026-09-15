/**
 * UI Visualizer and Controller for the Graph Search Algorithms Demo.
 */
class SearchDemoUI {
  constructor() {
    this.canvas = document.getElementById('search-canvas');
    this.ctx = this.canvas.getContext('2d');

    // DOM controls
    this.btnPrev = document.getElementById('btn-search-prev');
    this.btnNext = document.getElementById('btn-search-next');
    this.btnPlay = document.getElementById('btn-search-play');
    this.btnPause = document.getElementById('btn-search-pause');
    this.btnReset = document.getElementById('btn-search-reset');
    
    this.speedSlider = document.getElementById('search-speed-slider');
    this.startSelect = document.getElementById('select-search-start');
    this.goalSelect = document.getElementById('select-search-goal');
    this.smaMaxNodesSelect = document.getElementById('select-sma-maxnodes');
    this.smaMaxNodesRow = document.getElementById('sma-maxnodes-row');
    
    this.algTabButtons = document.querySelectorAll('.search-tab');
    this.stepTableBody = document.getElementById('search-step-table-body');
    
    // Algorithm configuration
    this.currentAlg = 'BFS';
    this.startNode = 'A';
    this.goalNode = 'G';
    
    // Trace state
    this.steps = [];
    this.currentStepIdx = 0;
    this.isPlaying = false;
    this.playInterval = null;
    this.playSpeed = 1000; // ms per step

    // Execution history for side-by-side comparison
    this.runHistory = {
      BFS: null,
      DFS: null,
      UCS: null,
      IDS: null,
      ASTAR: null,
      GREEDY: null,
      BIBF: null,
      SMA: null
    };

    this.init();
  }

  init() {
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // Alg selection tab buttons
    this.algTabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.algTabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentAlg = btn.getAttribute('data-alg');
        if (this.smaMaxNodesRow) {
          this.smaMaxNodesRow.style.display = (this.currentAlg === 'SMA') ? 'flex' : 'none';
        }
        this.pause();
        this.generateTrace();
      });
    });

    // Start/Goal selects
    if (this.startSelect && this.goalSelect) {
      this.startSelect.addEventListener('change', (e) => {
        this.startNode = e.target.value;
        this.pause();
        this.generateTrace();
      });
      this.goalSelect.addEventListener('change', (e) => {
        this.goalNode = e.target.value;
        this.pause();
        this.generateTrace();
      });
    }

    // SMA* memory bound select
    if (this.smaMaxNodesSelect) {
      this.smaMaxNodesSelect.addEventListener('change', () => {
        this.pause();
        this.generateTrace();
      });
    }

    // Step navigation
    this.btnPrev.addEventListener('click', () => this.prevStep());
    this.btnNext.addEventListener('click', () => this.nextStep());
    
    this.btnPlay.addEventListener('click', () => this.play());
    this.btnPause.addEventListener('click', () => this.pause());
    this.btnReset.addEventListener('click', () => this.reset());

    if (this.speedSlider) {
      this.speedSlider.addEventListener('input', (e) => {
        // Speed slider maps e.g. 1 to 5. We translate this to 2000ms (slowest) to 200ms (fastest)
        const val = parseInt(e.target.value);
        this.playSpeed = 2200 - (val * 400); // 1->1800ms, 2->1400ms, 3->1000ms, 4->600ms, 5->200ms
        if (this.isPlaying) {
          // Restart timer with new speed
          this.pause();
          this.play();
        }
      });
    }

    this.generateTrace();
  }

  resizeCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.draw();
  }

  generateTrace() {
    if (this.currentAlg === 'BFS') {
      this.steps = runBFS(this.startNode, this.goalNode);
    } else if (this.currentAlg === 'DFS') {
      this.steps = runDFS(this.startNode, this.goalNode);
    } else if (this.currentAlg === 'UCS') {
      this.steps = runUCS(this.startNode, this.goalNode);
    } else if (this.currentAlg === 'IDS') {
      this.steps = runIDS(this.startNode, this.goalNode);
    } else if (this.currentAlg === 'ASTAR') {
      this.steps = runAStar(this.startNode, this.goalNode);
    } else if (this.currentAlg === 'GREEDY' || this.currentAlg === 'GBFS') {
      this.steps = runGreedy(this.startNode, this.goalNode);
    } else if (this.currentAlg === 'BIBF') {
      this.steps = runBIBF(this.startNode, this.goalNode);
    } else if (this.currentAlg === 'SMA') {
      const maxNodes = this.smaMaxNodesSelect ? parseInt(this.smaMaxNodesSelect.value, 10) : 4;
      this.steps = runSMA(this.startNode, this.goalNode, maxNodes);
    }

    this.currentStepIdx = 0;
    this.buildStepTable();
    this.renderAllAlgorithmsComparisonTable();
    this.updateUI();
  }

  nextStep() {
    if (this.currentStepIdx < this.steps.length - 1) {
      this.currentStepIdx++;
      this.updateUI();
    } else {
      this.pause();
    }
  }

  prevStep() {
    if (this.currentStepIdx > 0) {
      this.currentStepIdx--;
      this.updateUI();
    }
  }

  play() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.btnPlay.disabled = true;
    this.btnPause.disabled = false;
    
    this.playInterval = setInterval(() => {
      this.nextStep();
    }, this.playSpeed);
  }

  pause() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    this.btnPlay.disabled = false;
    this.btnPause.disabled = true;

    if (this.playInterval) {
      clearInterval(this.playInterval);
      this.playInterval = null;
    }
  }

  reset() {
    this.pause();
    this.currentStepIdx = 0;
    this.updateUI();
  }

  buildStepTable() {
    this.stepTableBody.innerHTML = '';
    // We only populate rows dynamically as the slider index steps through
  }

  updateUI() {
    const step = this.steps[this.currentStepIdx];
    if (!step) return;

    // 1. Update navigation buttons
    this.btnPrev.disabled = this.currentStepIdx === 0;
    this.btnNext.disabled = this.currentStepIdx === this.steps.length - 1;

    // 2. Update status texts
    const setSafeText = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setSafeText('search-status-alg', this.currentAlg);
    setSafeText('search-status-step', `${this.currentStepIdx} / ${this.steps.length - 1}`);
    setSafeText('search-status-selected', step.currentNode || 'None');
    setSafeText('search-status-expanded', step.expanded.join(', ') || 'None');
    
    // Reached set formatting
    let reachedStr = '';
    if (this.currentAlg === 'UCS' || this.currentAlg === 'ASTAR' || this.currentAlg === 'BIBF' || this.currentAlg === 'SMA') {
      reachedStr = Object.entries(step.reached)
        .map(([node, cost]) => `${node}(g:${cost})`)
        .join(', ');
    } else {
      reachedStr = Array.from(step.reached).join(', ');
    }
    setSafeText('search-status-reached', reachedStr || 'None');

    // Frontier formatting
    const frontierStr = step.frontier.map(item => {
      if (this.currentAlg === 'ASTAR') return `${item.node}(f:${item.f})`;
      if (this.currentAlg === 'GREEDY') return `${item.node}(h:${item.h})`;
      if (this.currentAlg === 'UCS') return `${item.node}(g:${item.cost})`;
      if (this.currentAlg === 'IDS') return `${item.node}(d:${item.depth})`;
      if (this.currentAlg === 'BIBF') return `${item.node}[${item.dir}](g:${item.cost})`;
      if (this.currentAlg === 'SMA') return `${item.node}(f:${item.f})`;
      return item.node;
    }).join(', ');
    setSafeText('search-status-frontier', frontierStr || 'Empty');

    // Show/Hide algorithm specific status pane parameters
    const ucsCostPanel = document.getElementById('search-ucs-cost-panel');
    const idsDepthPanel = document.getElementById('search-ids-depth-panel');
    const astarCostPanel = document.getElementById('search-astar-cost-panel');
    const greedyCostPanel = document.getElementById('search-greedy-cost-panel');
    
    if (ucsCostPanel) {
      if (this.currentAlg === 'UCS') {
        ucsCostPanel.style.display = 'block';
        setSafeText('search-status-cost', step.currentNode ? (step.reached[step.currentNode] ?? 0) : 0);
      } else {
        ucsCostPanel.style.display = 'none';
      }
    }
    
    if (idsDepthPanel) {
      if (this.currentAlg === 'IDS') {
        idsDepthPanel.style.display = 'block';
        setSafeText('search-status-ids-limit', step.limit ?? 0);
        setSafeText('search-status-ids-depth', step.depth ?? 0);
      } else {
        idsDepthPanel.style.display = 'none';
      }
    }

    if (astarCostPanel) {
      if (this.currentAlg === 'ASTAR') {
        astarCostPanel.style.display = 'block';
        const gCost = step.currentNode ? (step.reached[step.currentNode] ?? 0) : 0;
        const hCost = step.currentNode ? getHeuristic(step.currentNode, this.goalNode) : 0;
        const fCost = gCost + hCost;
        setSafeText('search-status-astar-g', gCost);
        setSafeText('search-status-astar-h', hCost);
        setSafeText('search-status-astar-f', fCost);
      } else {
        astarCostPanel.style.display = 'none';
      }
    }

    if (greedyCostPanel) {
      if (this.currentAlg === 'GREEDY') {
        greedyCostPanel.style.display = 'block';
        const hCost = step.currentNode ? getHeuristic(step.currentNode, this.goalNode) : 0;
        setSafeText('search-status-greedy-h', hCost);
      } else {
        greedyCostPanel.style.display = 'none';
      }
    }

    const bibfPanel = document.getElementById('search-bibf-panel');
    if (bibfPanel) {
      if (this.currentAlg === 'BIBF') {
        bibfPanel.style.display = 'block';
        setSafeText('search-status-bibf-dir', step.dir === 'F' ? 'Forward' : (step.dir === 'B' ? 'Backward' : '-'));
        let meetNode = '-';
        if (step.action === 'MEET') meetNode = step.successorNode || step.currentNode;
        else if (step.action === 'GOAL_FOUND') meetNode = step.meetNode || '-';
        setSafeText('search-status-bibf-meet', meetNode);
        setSafeText('search-status-bibf-cost', step.action === 'GOAL_FOUND' ? step.cost : '-');
      } else {
        bibfPanel.style.display = 'none';
      }
    }

    const smaPanel = document.getElementById('search-sma-panel');
    if (smaPanel) {
      if (this.currentAlg === 'SMA') {
        smaPanel.style.display = 'block';
        setSafeText('search-status-sma-mem', step.memoryUsed ?? 0);
        setSafeText('search-status-sma-bound', step.maxNodes ?? 0);
        const curFrontierItem = step.frontier.find(it => it.node === step.currentNode);
        const fVal = curFrontierItem ? curFrontierItem.f : (step.action === 'GOAL_FOUND' ? step.cost : '-');
        setSafeText('search-status-sma-f', fVal);
      } else {
        smaPanel.style.display = 'none';
      }
    }

    // Explanation banner
    setSafeText('search-explanation-text', step.explanation);

    // 3. Populate dynamic step table up to the current index
    this.renderStepTableUpToCurrent();

    // 4. Update Active Solution Path Card
    this.updateActiveSolutionCard(step);

    // 5. Highlight current stage in search cycle diagram
    this.updateCycleDiagram(step.action);

    // 6. Update comparison table active highlight
    this.highlightActiveAlgorithmInTable();

    // 7. Draw graph visualizer
    this.draw();
  }

  updateActiveSolutionCard(step) {
    const algNameEl = document.getElementById('search-solution-alg-name');
    const badgeEl = document.getElementById('search-solution-status-badge');
    const containerEl = document.getElementById('search-solution-path-nodes');
    const costEl = document.getElementById('search-solution-cost');
    const lenEl = document.getElementById('search-solution-length');
    const expEl = document.getElementById('search-solution-expanded-count');

    if (!containerEl) return;

    if (algNameEl) {
      let disp = this.currentAlg;
      if (this.currentAlg === 'ASTAR') disp = 'A*';
      else if (this.currentAlg === 'GREEDY') disp = 'Greedy';
      else if (this.currentAlg === 'SMA') disp = 'SMA*';
      algNameEl.textContent = disp;
    }

    // Find goal step in this.steps if it exists
    const goalStep = this.steps.find(s => s.action === 'GOAL_FOUND');
    const isGoalReached = step && step.action === 'GOAL_FOUND';
    const isFailed = step && step.action === 'FAIL';

    if (isGoalReached && step.path) {
      if (badgeEl) {
        badgeEl.className = 'search-solution-badge success';
        badgeEl.textContent = 'Goal Found!';
      }
      this.renderNodePills(containerEl, step.path);
      if (costEl) costEl.textContent = step.cost ?? '-';
      if (lenEl) lenEl.textContent = `${step.path.length - 1} hops (${step.path.length} nodes)`;
      if (expEl) expEl.textContent = `${step.expanded.length} nodes`;
    } else if (isFailed) {
      if (badgeEl) {
        badgeEl.className = 'search-solution-badge danger';
        badgeEl.textContent = 'No Path';
      }
      containerEl.innerHTML = `<span class="path-placeholder" style="color:#ef4444;">No solution path exists from ${this.startNode} to ${this.goalNode}.</span>`;
      if (costEl) costEl.textContent = '∞';
      if (lenEl) lenEl.textContent = '0 hops';
      if (expEl) expEl.textContent = `${step.expanded.length} nodes`;
    } else {
      // In progress
      if (badgeEl) {
        badgeEl.className = 'search-solution-badge warning';
        badgeEl.textContent = `Step ${this.currentStepIdx} / ${this.steps.length - 1}`;
      }
      
      if (goalStep && goalStep.path) {
        // Show discovered path for this algorithm
        this.renderNodePills(containerEl, goalStep.path);
        if (costEl) costEl.textContent = goalStep.cost ?? '-';
        if (lenEl) lenEl.textContent = `${goalStep.path.length - 1} hops (${goalStep.path.length} nodes)`;
      } else {
        containerEl.innerHTML = `<span class="path-placeholder">Exploring state space...</span>`;
        if (costEl) costEl.textContent = '-';
        if (lenEl) lenEl.textContent = '-';
      }
      if (expEl) expEl.textContent = `${step.expanded.length} nodes`;
    }
  }

  renderNodePills(container, path) {
    if (!path || path.length === 0) {
      container.innerHTML = '<span class="path-placeholder">None</span>';
      return;
    }
    const html = path.map((node, i) => {
      let cls = 'path-node-pill';
      if (i === 0) cls += ' start';
      else if (i === path.length - 1) cls += ' goal';
      
      const arrow = i < path.length - 1 ? '<span class="path-arrow">→</span>' : '';
      return `<span class="${cls}">${node}</span>${arrow}`;
    }).join(' ');
    container.innerHTML = html;
  }

  renderStepTableUpToCurrent() {
    this.stepTableBody.innerHTML = '';
    
    // We only display the rows for step actions that represent a significant node selection step
    // to keep the table readable (similar to index table). E.g. SELECT, START, GOAL_FOUND.
    // Or we can just list SELECT actions. Let's do that - it maps exactly to the instruction's format:
    // "Step, Selected, Expanded?, Frontier, Reached"
    let displayStepNum = 0;
    
    for (let i = 0; i <= this.currentStepIdx; i++) {
      const step = this.steps[i];
      if (['START', 'SELECT', 'GOAL_FOUND', 'ITERATION_START'].includes(step.action)) {
        const row = document.createElement('tr');
        if (i === this.currentStepIdx) {
          row.style.background = 'rgba(79, 70, 229, 0.05)';
          row.style.fontWeight = 'bold';
        }

        // Selected Column text
        let selectedText = step.currentNode || '-';
        if (step.action === 'START') selectedText = 'Start';
        if (step.action === 'ITERATION_START') selectedText = `Start Limit ${step.limit}`;

        // Expanded? Column
        let expandedText = 'No';
        if (step.action === 'SELECT') {
          // Scan forward from this SELECT, through steps already revealed
          // (up to the current index), until the next row-boundary action.
          // GOAL_TEST (and, for BIBF, MEET) steps sit between SELECT and
          // EXPAND, so checking only steps[i + 1] missed real expansions.
          for (let j = i + 1; j <= this.currentStepIdx; j++) {
            const s = this.steps[j];
            if (['START', 'SELECT', 'GOAL_FOUND', 'ITERATION_START'].includes(s.action)) break;
            if (s.action === 'EXPAND' || s.action === 'REGENERATE') { expandedText = 'Yes'; break; }
          }
        }
        if (step.action === 'GOAL_FOUND') expandedText = 'Goal Match';

        // Frontier ordered display
        const frontierText = step.frontier.map(item => {
          if (this.currentAlg === 'ASTAR') return `${item.node}(f:${item.f})`;
          if (this.currentAlg === 'GREEDY') return `${item.node}(h:${item.h})`;
          if (this.currentAlg === 'UCS') return `${item.node}(${item.cost})`;
          if (this.currentAlg === 'IDS') return `${item.node}(d:${item.depth})`;
          if (this.currentAlg === 'BIBF') return `${item.node}[${item.dir}]:${item.cost}`;
          if (this.currentAlg === 'SMA') return `${item.node}(f:${item.f})`;
          return item.node;
        }).join(', ') || 'Empty';

        // Reached best-cost display
        let reachedText = '';
        if (this.currentAlg === 'UCS' || this.currentAlg === 'ASTAR' || this.currentAlg === 'BIBF' || this.currentAlg === 'SMA') {
          reachedText = Object.entries(step.reached)
            .map(([node, cost]) => `${node}:${cost}`)
            .join(', ');
        } else {
          reachedText = Array.from(step.reached).join(', ');
        }

        let cellsHtml = `
          <td>${displayStepNum++}</td>
          <td>${selectedText}</td>
          <td>${expandedText}</td>
          <td><small>${frontierText}</small></td>
          <td><small>${reachedText}</small></td>
        `;

        if (this.currentAlg === 'IDS') {
          cellsHtml = `
            <td>${displayStepNum - 1} (lim:${step.limit ?? 0})</td>
            <td>${selectedText}</td>
            <td>${expandedText}</td>
            <td><small>${frontierText}</small></td>
            <td><small>${reachedText}</small></td>
          `;
        }

        row.innerHTML = cellsHtml;
        this.stepTableBody.appendChild(row);
      }
    }
    
    // Scroll table to bottom
    const wrapper = this.stepTableBody.parentElement.parentElement;
    wrapper.scrollTop = wrapper.scrollHeight;
  }

  updateCycleDiagram(action) {
    const cycleSteps = document.querySelectorAll('.cycle-step');
    cycleSteps.forEach(cs => cs.classList.remove('active'));

    const selectClass = (selector) => {
      const el = document.querySelector(selector);
      if (el) el.classList.add('active');
    };

    if (action === 'START' || action === 'ITERATION_START') {
      selectClass('.cs-frontier');
    } else if (action === 'SELECT') {
      selectClass('.cs-select');
    } else if (action === 'GOAL_TEST' || action === 'MEET') {
      selectClass('.cs-goal-test');
    } else if (action === 'EXPAND' || action === 'REGENERATE' || action === 'DEAD_END') {
      selectClass('.cs-expand');
    } else if (['GENERATE_SUCCESSOR', 'UPDATE_FRONTIER', 'SKIP_DUPLICATE', 'DEPTH_LIMIT_REACHED', 'FORGET', 'BACKUP'].includes(action)) {
      selectClass('.cs-update');
    } else if (action === 'GOAL_FOUND') {
      selectClass('.cs-goal-test');
    }
  }

  renderAllAlgorithmsComparisonTable() {
    const tbody = document.getElementById('search-all-algs-comparison-body');
    const startLabel = document.getElementById('comp-start-node-label');
    const goalLabel = document.getElementById('comp-goal-node-label');
    
    if (startLabel) startLabel.textContent = this.startNode;
    if (goalLabel) goalLabel.textContent = this.goalNode;
    if (!tbody) return;

    tbody.innerHTML = '';

    const maxNodes = this.smaMaxNodesSelect ? parseInt(this.smaMaxNodesSelect.value, 10) : 4;

    const algsList = [
      { key: 'BFS', name: 'Breadth-First (BFS)', run: () => runBFS(this.startNode, this.goalNode), optText: 'Yes (for unit edge costs; minimum hops)' },
      { key: 'DFS', name: 'Depth-First (DFS)', run: () => runDFS(this.startNode, this.goalNode), optText: 'No (may return arbitrary non-optimal path)' },
      { key: 'UCS', name: 'Uniform-Cost (UCS)', run: () => runUCS(this.startNode, this.goalNode), optText: 'Yes (guaranteed minimum cumulative cost)' },
      { key: 'IDS', name: 'Iterative Deepening (IDS)', run: () => runIDS(this.startNode, this.goalNode), optText: 'Yes (for unit edge costs; optimal hop count)' },
      { key: 'ASTAR', name: 'A* Search (A*)', run: () => runAStar(this.startNode, this.goalNode), optText: 'Yes (optimal with consistent/admissible heuristic)' },
      { key: 'GREEDY', name: 'Greedy Best-First', run: () => runGreedy(this.startNode, this.goalNode), optText: 'No (guided purely by heuristic estimation)' },
      { key: 'BIBF', name: 'Bidirectional (BIBF)', run: () => runBIBF(this.startNode, this.goalNode), optText: 'Yes (optimal bidirectional uniform-cost search)' },
      { key: 'SMA', name: 'Memory-Bounded A* (SMA*)', run: () => runSMA(this.startNode, this.goalNode, maxNodes), optText: 'Yes (if memory bound accommodates optimal path)' }
    ];

    // Compute results for each algorithm
    const results = algsList.map(item => {
      let steps = [];
      try {
        steps = item.run();
      } catch (err) {
        console.error(`Error running ${item.key}:`, err);
      }
      const goalStep = steps.find(s => s.action === 'GOAL_FOUND');
      const lastStep = steps[steps.length - 1];
      const hasGoal = !!goalStep;
      const path = hasGoal ? goalStep.path : null;
      const cost = hasGoal ? goalStep.cost : Infinity;
      const expandedCount = lastStep ? (lastStep.expanded ? lastStep.expanded.length : 0) : 0;
      return {
        ...item,
        hasGoal,
        path,
        cost,
        expandedCount,
        steps
      };
    });

    // Find min cost among successful searches
    const validCosts = results.filter(r => r.hasGoal && typeof r.cost === 'number').map(r => r.cost);
    const minCost = validCosts.length > 0 ? Math.min(...validCosts) : null;

    results.forEach(res => {
      const isCurrent = this.currentAlg === res.key;
      const row = document.createElement('tr');
      row.id = `search-comp-row-${res.key.toLowerCase()}`;
      if (isCurrent) {
        row.style.background = 'rgba(79, 70, 229, 0.06)';
        row.style.fontWeight = '600';
      }

      // Path HTML with mini pills
      let pathHtml = '<span style="color:var(--text-muted); font-style:italic;">No Path Found</span>';
      if (res.hasGoal && res.path && res.path.length > 0) {
        pathHtml = res.path.map((node, i) => {
          let cls = 'path-node-pill-sm';
          if (i === 0) cls += ' start';
          else if (i === res.path.length - 1) cls += ' goal';
          const arrow = i < res.path.length - 1 ? '<span class="path-arrow" style="font-size:0.68rem; margin: 0 2px;">→</span>' : '';
          return `<span class="${cls}">${node}</span>${arrow}`;
        }).join('');
      }

      // Cost with optimal badge
      let costHtml = '<span style="color:var(--text-muted);">∞</span>';
      if (res.hasGoal) {
        const isOptimal = (minCost !== null && res.cost === minCost);
        costHtml = `<strong>${res.cost}</strong>`;
        if (isOptimal) {
          costHtml += ` <span class="optimal-tag"><i data-lucide="check" style="width:10px; height:10px; display:inline-block;"></i> Optimal</span>`;
        }
      }

      row.innerHTML = `
        <td><strong>${res.name}</strong></td>
        <td><div style="display:flex; align-items:center; flex-wrap:wrap; gap:3px;">${pathHtml}</div></td>
        <td>${costHtml}</td>
        <td>${res.expandedCount} nodes</td>
        <td><small style="color:var(--text-secondary);">${res.optText}</small></td>
        <td style="text-align:center;">
          <button class="btn-action-sm ${isCurrent ? 'active' : ''}" data-alg="${res.key}" style="font-size:0.72rem; padding:0.25rem 0.6rem;">
            ${isCurrent ? 'Active' : 'Visualize'}
          </button>
        </td>
      `;

      tbody.appendChild(row);
    });

    // Add event listeners to "Visualize" buttons
    tbody.querySelectorAll('.btn-action-sm').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const algKey = e.currentTarget.getAttribute('data-alg');
        if (!algKey) return;
        
        // Switch tab
        this.algTabButtons.forEach(b => {
          if (b.getAttribute('data-alg') === algKey) {
            b.classList.add('active');
          } else {
            b.classList.remove('active');
          }
        });
        
        this.currentAlg = algKey;
        if (this.smaMaxNodesRow) {
          this.smaMaxNodesRow.style.display = (this.currentAlg === 'SMA') ? 'flex' : 'none';
        }
        this.pause();
        this.generateTrace();

        // Scroll back up to visualizer if needed
        const visualizer = document.getElementById('search-canvas-container');
        if (visualizer) {
          visualizer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    });

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  highlightActiveAlgorithmInTable() {
    const tbody = document.getElementById('search-all-algs-comparison-body');
    if (!tbody) return;

    tbody.querySelectorAll('tr').forEach(row => {
      const btn = row.querySelector('.btn-action-sm');
      if (!btn) return;
      const algKey = btn.getAttribute('data-alg');
      const isCurrent = this.currentAlg === algKey;
      if (isCurrent) {
        row.style.background = 'rgba(79, 70, 229, 0.06)';
        row.style.fontWeight = '600';
        btn.classList.add('active');
        btn.textContent = 'Active';
      } else {
        row.style.background = '';
        row.style.fontWeight = 'normal';
        btn.classList.remove('active');
        btn.textContent = 'Visualize';
      }
    });
  }

  /**
   * Visual Drawing on the Canvas
   */
  draw() {
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);
    
    this.ctx.clearRect(0, 0, w, h);

    const step = this.steps[this.currentStepIdx];
    if (!step) return;

    const graphYHeight = h * 0.70; // 70% height for graph rendering
    const frontierYOffset = h * 0.72; // bottom 28% for frontier queues/stacks

    this.ctx.save();
    
    // Draw edges
    this.drawEdges(graphYHeight, step);

    // Draw nodes
    this.drawNodes(graphYHeight, step);

    // Draw frontier stack/queue/priority-queue visuals at the bottom
    this.drawFrontierVisualizer(w, h, frontierYOffset, step);

    this.ctx.restore();
  }

  drawEdges(hMax, step) {
    const ctx = this.ctx;
    const w = this.canvas.width / (window.devicePixelRatio || 1);

    // Get solution path list if goal is found
    const hasFinished = step.action === 'GOAL_FOUND';
    let pathEdges = new Set();
    if (hasFinished && step.path) {
      for (let i = 0; i < step.path.length - 1; i++) {
        pathEdges.add(`${step.path[i]}-${step.path[i+1]}`);
      }
    }

    ctx.save();
    
    Object.entries(GRAPH).forEach(([from, successors]) => {
      const fromLayout = NODE_LAYOUT[from];
      const fx = fromLayout.x * w;
      const fy = fromLayout.y * hMax;

      successors.forEach(succ => {
        const toLayout = NODE_LAYOUT[succ.to];
        const tx = toLayout.x * w;
        const ty = toLayout.y * hMax;

        const isSolEdge = pathEdges.has(`${from}-${succ.to}`);
        const isActiveGen = (step.action === 'GENERATE_SUCCESSOR' || step.action === 'UPDATE_FRONTIER' || step.action === 'SKIP_DUPLICATE') 
                            && step.currentNode === from 
                            && step.successorNode === succ.to;

        // Draw line
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.lineTo(tx, ty);
        
        if (isSolEdge) {
          ctx.strokeStyle = '#10b981'; // Neon Emerald Green for final path
          ctx.lineWidth = 3.5;
          ctx.shadowColor = '#10b981';
          ctx.shadowBlur = 6;
        } else if (isActiveGen) {
          ctx.strokeStyle = '#f59e0b'; // Amber for successor generation
          ctx.lineWidth = 2.5;
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 4;
        } else {
          ctx.strokeStyle = 'rgba(15, 23, 42, 0.15)';
          ctx.lineWidth = 1.2;
          ctx.shadowBlur = 0;
        }
        ctx.stroke();
        ctx.shadowBlur = 0; // reset

        // Draw edge cost text at the middle of edge
        const mx = (fx + tx) / 2;
        const my = (fy + ty) / 2;
        
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(mx, my - 2, 7, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = isSolEdge ? '#10b981' : (isActiveGen ? '#f59e0b' : 'rgba(15, 23, 42, 0.15)');
        ctx.lineWidth = 0.8;
        ctx.stroke();

        ctx.fillStyle = isSolEdge ? '#047857' : '#475569';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(succ.cost, mx, my - 2);
      });
    });

    ctx.restore();
  }

  drawNodes(hMax, step) {
    const ctx = this.ctx;
    const w = this.canvas.width / (window.devicePixelRatio || 1);

    // Sets of node classifications
    const expandedSet = new Set(
      this.currentAlg === 'BIBF' ? step.expanded.map(e => e.replace(/\([FB]\)$/, '')) : step.expanded
    );
    const selectedSet = new Set(step.selected);
    const reachedSet = (this.currentAlg === 'UCS' || this.currentAlg === 'ASTAR' || this.currentAlg === 'BIBF' || this.currentAlg === 'SMA')
      ? new Set(Object.keys(step.reached))
      : new Set(step.reached);

    // BIBF only: which of those reached nodes came from the backward search,
    // so we can tint them violet and visually distinguish the two frontiers.
    const backwardReachedSet = (this.currentAlg === 'BIBF' && step.reachedDetail)
      ? new Set(Object.keys(step.reachedDetail.b || {}))
      : new Set();

    // Frontier nodes map
    const frontierNodes = new Set(step.frontier.map(item => item.node));

    // Solution path nodes if finished
    const hasFinished = step.action === 'GOAL_FOUND';
    const pathNodes = hasFinished ? new Set(step.path) : new Set();

    Object.entries(NODE_LAYOUT).forEach(([nodeId, layout]) => {
      const nx = layout.x * w;
      const ny = layout.y * hMax;
      const radius = 16;

      ctx.save();
      
      // Determine coloring based on search status
      let fillColor = '#ffffff';
      let borderStroke = 'rgba(15, 23, 42, 0.15)';
      let textFill = '#0f172a';
      let lineWidth = 1.5;
      
      const isStart = nodeId === this.startNode;
      const isGoal = nodeId === this.goalNode;
      const isCurrent = nodeId === step.currentNode;
      const isSuccessor = nodeId === step.successorNode;

      if (pathNodes.has(nodeId)) {
        fillColor = '#10b981'; // solution node
        borderStroke = '#10b981';
        textFill = '#ffffff';
      } else if (isCurrent) {
        fillColor = '#4f46e5'; // currently selected node (active)
        borderStroke = '#4f46e5';
        textFill = '#ffffff';
        ctx.shadowColor = '#4f46e5';
        ctx.shadowBlur = 8;
      } else if (isSuccessor) {
        fillColor = '#fef3c7'; // child node being evaluated
        borderStroke = '#f59e0b';
        textFill = '#d97706';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 6;
      } else if (expandedSet.has(nodeId)) {
        fillColor = '#1e293b'; // already expanded
        borderStroke = '#1e293b';
        textFill = '#ffffff';
      } else if (frontierNodes.has(nodeId)) {
        if (this.currentAlg === 'BIBF' && backwardReachedSet.has(nodeId) && !step.frontier.some(it => it.node === nodeId && it.dir === 'F')) {
          fillColor = '#f3e8ff'; // waiting in the BACKWARD frontier
          borderStroke = '#7c3aed';
          textFill = '#6d28d9';
        } else {
          fillColor = '#e0e7ff'; // waiting in frontier
          borderStroke = '#4f46e5';
          textFill = '#3730a3';
        }
      } else if (reachedSet.has(nodeId)) {
        if (this.currentAlg === 'BIBF' && backwardReachedSet.has(nodeId)) {
          fillColor = '#f5f3ff'; // reached only from the BACKWARD search
          borderStroke = '#7c3aed';
          textFill = '#6d28d9';
        } else {
          fillColor = '#e0f2fe'; // reached but not in frontier (processed or subset)
          borderStroke = '#0284c7';
          textFill = '#0369a1';
        }
      }

      // Draw node circle
      ctx.beginPath();
      ctx.arc(nx, ny, radius, 0, 2 * Math.PI);
      ctx.fillStyle = fillColor;
      ctx.fill();

      // Start/Goal custom outlines
      if (isStart) {
        ctx.strokeStyle = '#06b6d4'; // Cyan outline for start
        ctx.lineWidth = 3;
        ctx.stroke();
      } else if (isGoal) {
        ctx.strokeStyle = '#e11d48'; // Red outline for goal
        ctx.lineWidth = 3;
        ctx.stroke();
      } else {
        ctx.strokeStyle = borderStroke;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      }
      ctx.shadowBlur = 0; // reset

      // Draw node letter ID
      ctx.fillStyle = textFill;
      ctx.font = 'bold 12px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(nodeId, nx, ny);

      // Label details (cost or depth under nodes)
      if (this.currentAlg === 'ASTAR') {
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 9px monospace';
        if (reachedSet.has(nodeId)) {
          const gCost = step.reached[nodeId] ?? 0;
          const hCost = getHeuristic(nodeId, this.goalNode);
          ctx.fillText(`f:${gCost + hCost}`, nx, ny + radius + 11);
        } else {
          const hCost = getHeuristic(nodeId, this.goalNode);
          ctx.fillText(`h:${hCost}`, nx, ny + radius + 11);
        }
      } else if (this.currentAlg === 'GREEDY') {
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 9px monospace';
        const hCost = getHeuristic(nodeId, this.goalNode);
        ctx.fillText(`h:${hCost}`, nx, ny + radius + 11);
      } else if ((this.currentAlg === 'UCS' || this.currentAlg === 'BIBF') && reachedSet.has(nodeId)) {
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 9px monospace';
        const cost = step.reached[nodeId] ?? '∞';
        ctx.fillText(`g:${cost}`, nx, ny + radius + 11);
      } else if (this.currentAlg === 'SMA' && reachedSet.has(nodeId)) {
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 9px monospace';
        const frontierItem = step.frontier.find(it => it.node === nodeId);
        const label = frontierItem ? `f:${frontierItem.f}` : `g:${step.reached[nodeId] ?? '∞'}`;
        ctx.fillText(label, nx, ny + radius + 11);
      } else if (this.currentAlg === 'IDS' && nodeId === step.currentNode) {
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(`d:${step.depth}`, nx, ny + radius + 11);
      } else if (isStart) {
        ctx.fillStyle = '#0891b2';
        ctx.font = 'bold 8px monospace';
        ctx.fillText("START", nx, ny - radius - 6);
      } else if (isGoal) {
        ctx.fillStyle = '#e11d48';
        ctx.font = 'bold 8px monospace';
        ctx.fillText("GOAL", nx, ny - radius - 6);
      }

      ctx.restore();
    });
  }

  /**
   * Bottom queue/stack visualizer
   */
  drawFrontierVisualizer(w, h, startY, step) {
    const ctx = this.ctx;
    ctx.save();

    // Draw container bounding box
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.rect(10, startY, w - 20, h - startY - 10);
    ctx.fill();
    ctx.stroke();

    // Label
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'left';
    
    let desc = '';
    if (this.currentAlg === 'BFS') desc = 'FIFO QUEUE (FIRST IN -> FIRST OUT)';
    else if (this.currentAlg === 'DFS') desc = 'LIFO STACK (LAST IN -> FIRST OUT)';
    else if (this.currentAlg === 'UCS') desc = 'PRIORITY QUEUE (ORDERED BY LOWEST g(n))';
    else if (this.currentAlg === 'IDS') desc = 'LIFO STACK (RESETS EACH DEPTH LIMIT)';
    else if (this.currentAlg === 'ASTAR') desc = 'PRIORITY QUEUE (ORDERED BY LOWEST f(n) = g(n) + h(n))';
    else if (this.currentAlg === 'GREEDY') desc = 'PRIORITY QUEUE (ORDERED BY LOWEST h(n))';
    else if (this.currentAlg === 'BIBF') desc = 'TWO PRIORITY QUEUES: FORWARD (from START) + BACKWARD (from GOAL)';
    else if (this.currentAlg === 'SMA') desc = 'MEMORY-BOUNDED PRIORITY QUEUE (LOWEST f(n), WORST LEAF FORGOTTEN WHEN FULL)';
    
    ctx.fillText(`FRONTIER: ${desc}`, 20, startY + 14);

    const len = step.frontier.length;
    if (len === 0) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'italic 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText("Frontier is currently empty.", w / 2, startY + (h - startY) / 2);
      ctx.restore();
      return;
    }

    const cellW = 42;
    const cellH = 26;

    if (this.currentAlg === 'DFS' || this.currentAlg === 'IDS') {
      // Draw LIFO stack vertically (draw up to 4 elements, show dots if more)
      const stackStartX = w / 2 - cellW / 2;
      const stackStartY = h - 22;
      const maxDraw = 3;

      for (let i = 0; i < Math.min(len, maxDraw); i++) {
        const item = step.frontier[len - 1 - i]; // items from top down
        const cy = stackStartY - i * (cellH + 2);

        // Draw block
        ctx.fillStyle = i === 0 ? '#4f46e5' : '#e0e7ff';
        ctx.beginPath();
        this.roundRect(stackStartX, cy, cellW, cellH, 4);
        ctx.fill();
        ctx.strokeStyle = i === 0 ? '#4f46e5' : '#818cf8';
        ctx.stroke();

        // Node ID
        ctx.fillStyle = i === 0 ? '#ffffff' : '#3730a3';
        ctx.font = 'bold 11px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        let label = item.node;
        if (this.currentAlg === 'IDS') label = `${item.node}(d:${item.depth})`;
        ctx.fillText(label, stackStartX + cellW / 2, cy + cellH / 2);

        // Top pointer indicator
        if (i === 0) {
          ctx.fillStyle = '#4f46e5';
          ctx.font = 'bold 8px monospace';
          ctx.textAlign = 'right';
          ctx.fillText("TOP (Pop Next) ➔", stackStartX - 8, cy + cellH / 2);
        }
      }

      if (len > maxDraw) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText("...", stackStartX + cellW / 2, stackStartY - maxDraw * (cellH + 2) + 8);
      }
    } else {
      // Draw Queue horizontally (BFS / UCS / ASTAR / GREEDY / BIBF / SMA)
      const totalW = len * cellW + (len - 1) * 4;
      let startX = (w - totalW) / 2;
      if (startX < 95) startX = 95; // bound check so pointer doesn't clip

      const cy = startY + 24;

      // For BIBF the array is [...forward items (cost-sorted), ...backward items (cost-sorted)],
      // so "next to pop" is whichever of frontierF[0]/frontierB[0] has the lower cost -- not
      // necessarily index 0. Compute that node once, tie -> forward (matches runBIBF's own rule).
      let bibfNextKey = null;
      if (this.currentAlg === 'BIBF' && len > 0) {
        const fFirst = step.frontier.find(it => it.dir === 'F');
        const bFirst = step.frontier.find(it => it.dir === 'B');
        const pick = (fFirst && (!bFirst || fFirst.cost <= bFirst.cost)) ? fFirst : bFirst;
        if (pick) bibfNextKey = `${pick.node}${pick.dir}`;
      }

      for (let i = 0; i < len; i++) {
        const item = step.frontier[i];
        const cx = startX + i * (cellW + 4);
        const isBackward = this.currentAlg === 'BIBF' && item.dir === 'B';
        const isNext = this.currentAlg === 'BIBF' ? (`${item.node}${item.dir}` === bibfNextKey) : (i === 0);

        // Highlight the item selected next
        ctx.fillStyle = isNext ? (isBackward ? '#7c3aed' : '#4f46e5') : (isBackward ? '#f3e8ff' : '#e0e7ff');
        ctx.beginPath();
        this.roundRect(cx, cy, cellW, cellH, 4);
        ctx.fill();
        ctx.strokeStyle = isNext ? (isBackward ? '#7c3aed' : '#4f46e5') : (isBackward ? '#c4b5fd' : '#818cf8');
        ctx.stroke();

        // Node ID and cost / f / h
        ctx.fillStyle = isNext ? '#ffffff' : (isBackward ? '#6d28d9' : '#3730a3');
        ctx.font = 'bold 11px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        let label = item.node;
        if (this.currentAlg === 'UCS') label = `${item.node}(g:${item.cost})`;
        if (this.currentAlg === 'ASTAR') label = `${item.node}(f:${item.f})`;
        if (this.currentAlg === 'GREEDY') label = `${item.node}(h:${item.h})`;
        if (this.currentAlg === 'BIBF') label = `${item.node}${item.dir}:${item.cost}`;
        if (this.currentAlg === 'SMA') label = `${item.node}(f:${item.f})`;
        ctx.fillText(label, cx + cellW / 2, cy + cellH / 2);

        // FRONT / lowest cost indicators
        if (isNext) {
          ctx.fillStyle = isBackward ? '#7c3aed' : '#4f46e5';
          ctx.font = 'bold 8px monospace';
          ctx.textAlign = 'center';
          let indicatorText = "FRONT (Pop)";
          if (this.currentAlg === 'UCS') indicatorText = "LOWEST COST (Pop)";
          if (this.currentAlg === 'ASTAR') indicatorText = "LOWEST f(n) (Pop)";
          if (this.currentAlg === 'GREEDY') indicatorText = "LOWEST h(n) (Pop)";
          if (this.currentAlg === 'BIBF') indicatorText = isBackward ? "NEXT: BACKWARD (Pop)" : "NEXT: FORWARD (Pop)";
          if (this.currentAlg === 'SMA') indicatorText = "LOWEST f(n) (Pop)";
          ctx.fillText(indicatorText, cx + cellW / 2, cy - 6);
          ctx.fillText("▼", cx + cellW / 2, cy - 1);
        }

        // BACK indicator (skip for BIBF -- two interleaved queues make "back" ambiguous)
        if (i === len - 1 && len > 1 && this.currentAlg !== 'BIBF') {
          ctx.fillStyle = '#64748b';
          ctx.font = 'bold 8px monospace';
          ctx.textAlign = 'center';
          ctx.fillText("BACK (Push)", cx + cellW / 2, cy + cellH + 9);
          ctx.fillText("▲", cx + cellW / 2, cy + cellH + 4);
        }
      }
    }

    ctx.restore();
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

// Export to window scope
window.SearchDemoUI = SearchDemoUI;
