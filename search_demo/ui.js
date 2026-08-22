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
      IDS: null
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
    }

    this.currentStepIdx = 0;
    this.buildStepTable();
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
    if (this.currentAlg === 'UCS') {
      reachedStr = Object.entries(step.reached)
        .map(([node, cost]) => `${node}(g:${cost})`)
        .join(', ');
    } else {
      reachedStr = Array.from(step.reached).join(', ');
    }
    setSafeText('search-status-reached', reachedStr || 'None');

    // Frontier formatting
    const frontierStr = step.frontier.map(item => {
      if (this.currentAlg === 'UCS') return `${item.node}(g:${item.cost})`;
      if (this.currentAlg === 'IDS') return `${item.node}(d:${item.depth})`;
      return item.node;
    }).join(', ');
    setSafeText('search-status-frontier', frontierStr || 'Empty');

    // Show/Hide algorithm specific status pane parameters
    const ucsCostPanel = document.getElementById('search-ucs-cost-panel');
    const idsDepthPanel = document.getElementById('search-ids-depth-panel');
    
    if (ucsCostPanel) {
      if (this.currentAlg === 'UCS') {
        ucsCostPanel.style.display = 'block';
        const currentItem = step.frontier.find(item => item.node === step.currentNode) || { cost: 0 };
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

    // Explanation banner
    setSafeText('search-explanation-text', step.explanation);

    // 3. Populate dynamic step table up to the current index
    this.renderStepTableUpToCurrent();

    // 4. Highlight current stage in search cycle diagram
    this.updateCycleDiagram(step.action);

    // 5. Update history table if run finishes
    if (step.action === 'GOAL_FOUND') {
      this.runHistory[this.currentAlg] = {
        expanded: step.expanded.join(' → '),
        path: step.path.join(' → '),
        cost: step.cost,
        expandedCount: step.expanded.length
      };
      this.updateComparisonTable();
    }

    // 6. Draw graph visualizer
    this.draw();
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
        if (step.action === 'SELECT' && i < this.currentStepIdx) {
          // If we have advanced past this selection, check if it was expanded in the next steps
          const nextStep = this.steps[i + 1];
          if (nextStep && nextStep.action === 'EXPAND') expandedText = 'Yes';
        }
        if (step.action === 'GOAL_FOUND') expandedText = 'Goal Match';

        // Frontier ordered display
        const frontierText = step.frontier.map(item => {
          if (this.currentAlg === 'UCS') return `${item.node}(${item.cost})`;
          if (this.currentAlg === 'IDS') return `${item.node}(d:${item.depth})`;
          return item.node;
        }).join(', ') || 'Empty';

        // Reached best-cost display
        let reachedText = '';
        if (this.currentAlg === 'UCS') {
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
    } else if (action === 'GOAL_TEST') {
      selectClass('.cs-goal-test');
    } else if (action === 'EXPAND') {
      selectClass('.cs-expand');
    } else if (['GENERATE_SUCCESSOR', 'UPDATE_FRONTIER', 'SKIP_DUPLICATE', 'DEPTH_LIMIT_REACHED'].includes(action)) {
      selectClass('.cs-update');
    } else if (action === 'GOAL_FOUND') {
      selectClass('.cs-goal-test');
    }
  }

  updateComparisonTable() {
    const algs = ['BFS', 'DFS', 'UCS', 'IDS'];
    algs.forEach(alg => {
      const data = this.runHistory[alg];
      const row = document.getElementById(`comp-row-${alg.toLowerCase()}`);
      if (row && data) {
        row.innerHTML = `
          <td><strong>${alg}</strong></td>
          <td><small>${data.expanded || '-'}</small></td>
          <td><small>${data.path || '-'}</small></td>
          <td><strong>${data.cost ?? '-'}</strong></td>
          <td>${data.expandedCount}</td>
        `;
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

        // Draw direction arrow head
        const angle = Math.atan2(ty - fy, tx - fx);
        const radiusNode = 17; // offset arrow from node circle edge
        const ax = tx - radiusNode * Math.cos(angle);
        const ay = ty - radiusNode * Math.sin(angle);

        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax - 7 * Math.cos(angle - Math.PI / 6), ay - 7 * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(ax - 7 * Math.cos(angle + Math.PI / 6), ay - 7 * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fillStyle = isSolEdge ? '#10b981' : (isActiveGen ? '#f59e0b' : '#64748b');
        ctx.fill();

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
    const expandedSet = new Set(step.expanded);
    const selectedSet = new Set(step.selected);
    const reachedSet = this.currentAlg === 'UCS' 
      ? new Set(Object.keys(step.reached)) 
      : new Set(step.reached);

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
        fillColor = '#e0e7ff'; // waiting in frontier
        borderStroke = '#4f46e5';
        textFill = '#3730a3';
      } else if (reachedSet.has(nodeId)) {
        fillColor = '#e0f2fe'; // reached but not in frontier (processed or subset)
        borderStroke = '#0284c7';
        textFill = '#0369a1';
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
      if (this.currentAlg === 'UCS' && reachedSet.has(nodeId)) {
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 9px monospace';
        const cost = step.reached[nodeId] ?? '∞';
        ctx.fillText(`g:${cost}`, nx, ny + radius + 11);
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
      // Draw Queue horizontally (BFS / UCS)
      const totalW = len * cellW + (len - 1) * 4;
      let startX = (w - totalW) / 2;
      if (startX < 95) startX = 95; // bound check so pointer doesn't clip
      
      const cy = startY + 24;

      for (let i = 0; i < len; i++) {
        const item = step.frontier[i];
        const cx = startX + i * (cellW + 4);

        // Highlight first item (index 0) which is selected next
        ctx.fillStyle = i === 0 ? '#4f46e5' : '#e0e7ff';
        ctx.beginPath();
        this.roundRect(cx, cy, cellW, cellH, 4);
        ctx.fill();
        ctx.strokeStyle = i === 0 ? '#4f46e5' : '#818cf8';
        ctx.stroke();

        // Node ID and cost
        ctx.fillStyle = i === 0 ? '#ffffff' : '#3730a3';
        ctx.font = 'bold 11px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        let label = item.node;
        if (this.currentAlg === 'UCS') label = `${item.node}(g:${item.cost})`;
        ctx.fillText(label, cx + cellW / 2, cy + cellH / 2);

        // FRONT / lowest cost indicators
        if (i === 0) {
          ctx.fillStyle = '#4f46e5';
          ctx.font = 'bold 8px monospace';
          ctx.textAlign = 'center';
          const indicatorText = this.currentAlg === 'UCS' ? "LOWEST COST (Pop)" : "FRONT (Pop)";
          ctx.fillText(indicatorText, cx + cellW / 2, cy - 6);
          ctx.fillText("▼", cx + cellW / 2, cy - 1);
        }

        // BACK indicator
        if (i === len - 1 && len > 1) {
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
