/**
 * UI and Visualizer Engine for the Maze Search & Abstraction Demo.
 */
class MazeDemoUI {
  constructor() {
    this.grid = [
      "###############",
      "#S......#....G#",
      "#.#####.#.###.#",
      "#.#...#.#.#...#",
      "#.#.#.###.#.###",
      "#...#...#.#...#",
      "#.#####.#.###.#",
      "#...#...#...#.#",
      "###.#.#######.#",
      "#...#.........#",
      "###############"
    ];

    this.maze = new Maze(this.grid);
    this.decisionPoints = Abstraction.findDecisionPoints(this.maze);
    this.graph = Abstraction.buildAbstractGraph(this.maze, this.decisionPoints);

    // DOM Elements
    this.canvas = document.getElementById('maze-canvas');
    this.ctx = this.canvas.getContext('2d');
    
    // Step Elements
    this.stepIndicators = document.querySelectorAll('.flow-step');
    this.stepPanels = document.querySelectorAll('.teaching-panel');
    
    // Control Buttons
    this.btnPrev = document.getElementById('btn-maze-prev');
    this.btnNext = document.getElementById('btn-maze-next');
    
    // State Space Manual Controls
    this.btnMvForward = document.getElementById('btn-mv-forward');
    this.btnMvLeft = document.getElementById('btn-mv-left');
    this.btnMvRight = document.getElementById('btn-mv-right');
    this.manualLog = document.getElementById('manual-log');
    
    // Search Controls
    this.algoSelect = document.getElementById('maze-algo-select');
    this.btnSearchRun = document.getElementById('btn-maze-run');
    this.btnSearchStep = document.getElementById('btn-maze-step');
    this.btnSearchReset = document.getElementById('btn-maze-reset');
    this.speedSlider = document.getElementById('maze-speed-slider');
    
    // Search Stats Panel
    this.statNodesExpanded = document.getElementById('stat-nodes-expanded');
    this.statPathCost = document.getElementById('stat-path-cost');
    this.statSearchStatus = document.getElementById('stat-search-status');
    this.frontierList = document.getElementById('frontier-list');
    this.reachedList = document.getElementById('reached-list');

    // UI State
    this.currentTeachingStep = 0; // 0 to 4
    this.robotState = new RobotState(this.maze.start.x, this.maze.start.y, 'E');
    
    // Search Execution State
    this.searchSteps = [];
    this.searchStepIndex = -1;
    this.searchRunning = false;
    this.searchInterval = null;

    this.init();
  }

  init() {
    // Setup Canvas Retina support
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // Navigation Flow Event Listeners
    this.btnPrev.addEventListener('click', () => this.setTeachingStep(this.currentTeachingStep - 1));
    this.btnNext.addEventListener('click', () => this.setTeachingStep(this.currentTeachingStep + 1));

    this.stepIndicators.forEach((ind, index) => {
      ind.addEventListener('click', () => this.setTeachingStep(index));
    });

    // Manual robot controls
    this.btnMvForward.addEventListener('click', () => this.handleManualMove('Forward'));
    this.btnMvLeft.addEventListener('click', () => this.handleManualMove('Turn Left'));
    this.btnMvRight.addEventListener('click', () => this.handleManualMove('Turn Right'));

    window.addEventListener('keydown', (e) => {
      if (this.currentTeachingStep !== 1) return; // Only capture keys on Step 2 (4T manual state)
      if (['ArrowUp', 'KeyW'].includes(e.code)) {
        e.preventDefault();
        this.handleManualMove('Forward');
      } else if (['ArrowLeft', 'KeyA'].includes(e.code)) {
        e.preventDefault();
        this.handleManualMove('Turn Left');
      } else if (['ArrowRight', 'KeyD'].includes(e.code)) {
        e.preventDefault();
        this.handleManualMove('Turn Right');
      }
    });

    // Search event listeners
    this.algoSelect.addEventListener('change', () => this.resetSearch());
    this.btnSearchReset.addEventListener('click', () => this.resetSearch());
    this.btnSearchStep.addEventListener('click', () => this.stepSearch());
    this.btnSearchRun.addEventListener('click', () => {
      if (this.searchRunning) {
        this.pauseSearch();
      } else {
        this.startSearch();
      }
    });

    // Initial draw
    this.setTeachingStep(0);
  }

  resizeCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.draw();
  }

  setTeachingStep(step) {
    if (step < 0 || step > 4) return;
    
    this.currentTeachingStep = step;
    
    // Update step Indicators
    this.stepIndicators.forEach((ind, index) => {
      ind.classList.toggle('active', index === step);
      ind.classList.toggle('completed', index < step);
    });

    // Update panels
    this.stepPanels.forEach((panel, index) => {
      panel.classList.toggle('active', index === step);
    });

    // Nav buttons status
    this.btnPrev.disabled = step === 0;
    this.btnNext.textContent = step === 4 ? "Finished" : "Next Step";
    if (step === 4) {
      this.btnNext.disabled = true;
    } else {
      this.btnNext.disabled = false;
    }

    // Reset components depending on step
    if (step === 1) {
      this.robotState = new RobotState(this.maze.start.x, this.maze.start.y, 'E');
      this.manualLog.innerHTML = `<div class="log-entry">Robot placed at Initial State: <strong>${this.robotState.toString()}</strong></div>`;
    } else if (step === 4) {
      this.resetSearch();
    }

    this.draw();
  }

  handleManualMove(action) {
    const prevState = this.robotState;
    const nextState = this.robotState.transition(action, this.maze);
    
    this.robotState = nextState;
    this.draw();

    // Log the low level transition
    const logDiv = document.createElement('div');
    logDiv.className = 'log-entry';
    logDiv.innerHTML = `RESULT(${prevState.toString()}, <span>${action}</span>) = <strong>${nextState.toString()}</strong>`;
    
    this.manualLog.appendChild(logDiv);
    this.manualLog.scrollTop = this.manualLog.scrollHeight;
  }

  resetSearch() {
    this.pauseSearch();
    
    const algo = this.algoSelect.value;
    const start = 'S';
    const goal = 'G';
    
    if (algo === 'BFS') {
      this.searchSteps = Search.runBFS(this.graph, start, goal);
    } else if (algo === 'DFS') {
      this.searchSteps = Search.runDFS(this.graph, start, goal);
    } else if (algo === 'UCS') {
      this.searchSteps = Search.runUCS(this.graph, start, goal);
    } else if (algo === 'IDS') {
      this.searchSteps = Search.runIDS(this.graph, start, goal);
    }

    this.searchStepIndex = 0;
    this.updateSearchUI();
    this.draw();
  }

  startSearch() {
    if (this.searchSteps.length === 0 || this.searchStepIndex >= this.searchSteps.length - 1) {
      this.resetSearch();
    }

    this.searchRunning = true;
    this.btnSearchRun.innerHTML = '<i data-lucide="pause"></i> Pause';
    lucide.createIcons();
    
    this.btnSearchStep.disabled = true;
    this.algoSelect.disabled = true;

    const runLoop = () => {
      this.stepSearch();
      if (this.searchStepIndex >= this.searchSteps.length - 1 || !this.searchRunning) {
        this.pauseSearch();
      } else {
        const speed = parseInt(this.speedSlider.value);
        // speed values: 1 to 5 (maps to 1200ms down to 150ms)
        const delay = 1350 - (speed * 250); 
        this.searchInterval = setTimeout(runLoop, delay);
      }
    };

    runLoop();
  }

  pauseSearch() {
    this.searchRunning = false;
    this.btnSearchRun.innerHTML = '<i data-lucide="play"></i> Run';
    lucide.createIcons();
    this.btnSearchStep.disabled = false;
    this.algoSelect.disabled = false;

    if (this.searchInterval) {
      clearTimeout(this.searchInterval);
      this.searchInterval = null;
    }
  }

  stepSearch() {
    if (this.searchStepIndex < this.searchSteps.length - 1) {
      this.searchStepIndex++;
      this.updateSearchUI();
      this.draw();
    } else {
      this.pauseSearch();
    }
  }

  updateSearchUI() {
    if (this.searchStepIndex < 0 || this.searchStepIndex >= this.searchSteps.length) return;
    
    const step = this.searchSteps[this.searchStepIndex];
    
    // Update labels
    this.statNodesExpanded.textContent = step.expanded.length;
    
    // Status text
    if (step.status) {
      this.statSearchStatus.innerHTML = `<span style="color: var(--primary); font-weight: 600;">${step.status}</span>`;
    } else if (step.solutionPath) {
      this.statSearchStatus.innerHTML = '<span style="color: #10b981; font-weight: 600;">Goal Reached! Solution found.</span>';
    } else if (step.failed) {
      this.statSearchStatus.innerHTML = '<span style="color: #ef4444; font-weight: 600;">Search failed. Goal unreachable.</span>';
    } else if (step.currentNode) {
      this.statSearchStatus.innerHTML = `Expanding Node: <strong style="color: var(--accent);">${step.currentNode.state}</strong> (Depth: ${step.currentNode.depth})`;
    } else {
      this.statSearchStatus.textContent = 'Searching...';
    }

    // Path cost
    if (step.solutionPath) {
      // Find final path cost
      const finalNode = step.currentNode;
      this.statPathCost.textContent = finalNode ? finalNode.pathCost : 'N/A';
    } else {
      this.statPathCost.textContent = '-';
    }

    // Render Frontier Queue/Stack List
    this.frontierList.innerHTML = '';
    if (step.frontier.length === 0) {
      this.frontierList.innerHTML = '<span class="empty-list">Empty</span>';
    } else {
      step.frontier.forEach(item => {
        const span = document.createElement('span');
        span.className = 'frontier-node-badge';
        span.innerHTML = `${item.state} <small>c=${item.cost},d=${item.depth}</small>`;
        this.frontierList.appendChild(span);
      });
    }

    // Render Reached Set List
    this.reachedList.innerHTML = '';
    if (step.reached.length === 0) {
      this.reachedList.innerHTML = '<span class="empty-list">Empty</span>';
    } else {
      step.reached.forEach(state => {
        const span = document.createElement('span');
        span.className = 'reached-node-badge';
        span.textContent = state;
        this.reachedList.appendChild(span);
      });
    }
  }

  draw() {
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);
    
    this.ctx.clearRect(0, 0, w, h);

    const cols = this.maze.width;
    const rows = this.maze.height;
    
    // Cell Dimensions
    const cellWidth = w / cols;
    const cellHeight = h / rows;
    const cellSize = Math.min(cellWidth, cellHeight);
    
    // Offset to center the maze in the canvas
    const offsetX = (w - cellSize * cols) / 2;
    const offsetY = (h - cellSize * rows) / 2;

    this.ctx.save();
    this.ctx.translate(offsetX, offsetY);

    // 1. Draw Grid Cells (Physical Maze)
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const char = this.grid[y][x];
        const cx = x * cellSize;
        const cy = y * cellSize;

        if (char === '#') {
          // Wall cells - Dark Glass style
          this.ctx.fillStyle = '#1e293b'; // Slate 800
          this.ctx.fillRect(cx, cy, cellSize, cellSize);
          
          // Outer border on wall block
          this.ctx.strokeStyle = 'rgba(255,255,255,0.05)';
          this.ctx.lineWidth = 0.5;
          this.ctx.strokeRect(cx, cy, cellSize, cellSize);
        } else {
          // Traversable cells - Off white
          this.ctx.fillStyle = '#f8fafc'; // Slate 50
          this.ctx.fillRect(cx, cy, cellSize, cellSize);

          // Grid lines
          this.ctx.strokeStyle = 'rgba(15, 23, 42, 0.04)';
          this.ctx.lineWidth = 0.5;
          this.ctx.strokeRect(cx, cy, cellSize, cellSize);
          
          // Special highlights for start/goal (when in Step 1 or 2)
          if (this.currentTeachingStep <= 1) {
            if (char === 'S') {
              this.ctx.fillStyle = 'rgba(16, 185, 129, 0.15)'; // Green glow
              this.ctx.fillRect(cx, cy, cellSize, cellSize);
            } else if (char === 'G') {
              this.ctx.fillStyle = 'rgba(239, 68, 68, 0.15)'; // Red glow
              this.ctx.fillRect(cx, cy, cellSize, cellSize);
            }
          }
        }
      }
    }

    // 2. Step Specific Drawings
    if (this.currentTeachingStep === 1) {
      // Step 2: Highlight T state space (all traversable cells glow slightly)
      this.ctx.fillStyle = 'rgba(79, 70, 229, 0.08)'; // Indigo glow
      const traversable = this.maze.getTraversableCells();
      traversable.forEach(cell => {
        this.ctx.fillRect(cell.x * cellSize, cell.y * cellSize, cellSize, cellSize);
      });
      
      // Draw Robot (location + orientation)
      this.drawRobot(this.robotState, cellSize);
    } 
    else if (this.currentTeachingStep === 2 || this.currentTeachingStep === 3) {
      // Step 3 (Decision Points) and Step 4 (Graph Construction)
      this.drawDecisionPoints(cellSize);
      
      if (this.currentTeachingStep === 3) {
        // Step 4: Draw Graph Edges connecting decision points
        this.drawGraphEdges(cellSize);
      }
    }
    else if (this.currentTeachingStep === 4) {
      // Step 5: Search Algorithm Visualizer
      this.drawSearchState(cellSize);
    }

    // Render Start (S) and Goal (G) text overlays
    this.drawStartGoalText(cellSize);

    this.ctx.restore();
  }

  drawRobot(state, cellSize) {
    const rx = (state.x + 0.5) * cellSize;
    const ry = (state.y + 0.5) * cellSize;
    const radius = cellSize * 0.35;

    // Body glow
    this.ctx.beginPath();
    this.ctx.arc(rx, ry, radius + 2, 0, 2 * Math.PI);
    this.ctx.fillStyle = 'rgba(79, 70, 229, 0.25)';
    this.ctx.fill();

    // Body
    this.ctx.beginPath();
    this.ctx.arc(rx, ry, radius, 0, 2 * Math.PI);
    this.ctx.fillStyle = '#4f46e5'; // Indigo
    this.ctx.fill();
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    // Arrow pointer
    let angle = 0;
    if (state.orientation === 'N') angle = -Math.PI / 2;
    else if (state.orientation === 'E') angle = 0;
    else if (state.orientation === 'S') angle = Math.PI / 2;
    else if (state.orientation === 'W') angle = Math.PI;

    this.ctx.save();
    this.ctx.translate(rx, ry);
    this.ctx.rotate(angle);

    this.ctx.beginPath();
    this.ctx.moveTo(radius * 0.4, 0);
    this.ctx.lineTo(-radius * 0.3, -radius * 0.35);
    this.ctx.lineTo(-radius * 0.1, 0);
    this.ctx.lineTo(-radius * 0.3, radius * 0.35);
    this.ctx.closePath();
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fill();

    this.ctx.restore();
  }

  drawDecisionPoints(cellSize) {
    this.decisionPoints.forEach(dp => {
      const cx = (dp.x + 0.5) * cellSize;
      const cy = (dp.y + 0.5) * cellSize;
      const radius = cellSize * 0.35;

      // Glow circle
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, radius + 4, 0, 2 * Math.PI);
      this.ctx.fillStyle = dp.type === 'start' 
        ? 'rgba(16, 185, 129, 0.2)' 
        : (dp.type === 'goal' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(8, 145, 178, 0.2)');
      this.ctx.fill();

      // Node circle
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
      this.ctx.fillStyle = dp.type === 'start' 
        ? '#10b981' // Green
        : (dp.type === 'goal' ? '#ef4444' : '#0891b2'); // Cyan
      this.ctx.fill();
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      // Label text
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = `bold ${Math.round(cellSize * 0.4)}px Outfit, sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(dp.label, cx, cy);
    });
  }

  drawStartGoalText(cellSize) {
    // Label S & G on the grid for quick identification
    const labelPos = [
      { cell: this.maze.start, text: 'Start' },
      { cell: this.maze.goal, text: 'Goal' }
    ];

    labelPos.forEach(l => {
      const cx = (l.cell.x + 0.5) * cellSize;
      const cy = (l.cell.y + 0.5) * cellSize;
      
      this.ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
      this.ctx.font = `${Math.round(cellSize * 0.2)}px sans-serif`;
      this.ctx.textAlign = 'center';
      
      // Draw text above or below node based on space
      const textY = l.cell.y === 0 ? cy + cellSize * 0.45 : cy - cellSize * 0.45;
      this.ctx.fillText(l.text, cx, textY);
    });
  }

  drawGraphEdges(cellSize) {
    this.ctx.save();
    
    // Draw all lines first
    this.ctx.lineWidth = 3;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    
    // Color for graph lines - Semi transparent indigo
    this.ctx.strokeStyle = 'rgba(79, 70, 229, 0.5)';

    const drawnEdges = new Set();

    this.decisionPoints.forEach(dp => {
      const connections = this.graph[dp.label] || [];
      connections.forEach(edge => {
        // Create unique key to avoid drawing bi-directional edges twice
        const key = [dp.label, edge.to].sort().join('-');
        if (drawnEdges.has(key)) return;
        drawnEdges.add(key);

        // Draw path following corridor coordinates
        this.ctx.beginPath();
        edge.path.forEach((p, idx) => {
          const px = (p.x + 0.5) * cellSize;
          const py = (p.y + 0.5) * cellSize;
          if (idx === 0) {
            this.ctx.moveTo(px, py);
          } else {
            this.ctx.lineTo(px, py);
          }
        });
        this.ctx.stroke();

        // Draw path cost weight label at the center cell of the path
        if (edge.path.length > 2) {
          const midIdx = Math.floor(edge.path.length / 2);
          const midPt = edge.path[midIdx];
          const mx = (midPt.x + 0.5) * cellSize;
          const my = (midPt.y + 0.5) * cellSize;

          // Cost circle badge
          this.ctx.beginPath();
          this.ctx.arc(mx, my, cellSize * 0.22, 0, 2 * Math.PI);
          this.ctx.fillStyle = '#4338ca'; // Deep Indigo
          this.ctx.fill();
          this.ctx.strokeStyle = '#ffffff';
          this.ctx.lineWidth = 1;
          this.ctx.stroke();

          // Cost number text
          this.ctx.fillStyle = '#ffffff';
          this.ctx.font = `bold ${Math.round(cellSize * 0.25)}px Outfit`;
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.fillText(edge.cost, mx, my);
        }
      });
    });

    this.ctx.restore();
  }

  drawSearchState(cellSize) {
    if (this.searchStepIndex < 0 || this.searchStepIndex >= this.searchSteps.length) {
      // Draw graph idle
      this.drawGraphEdges(cellSize);
      this.drawDecisionPoints(cellSize);
      return;
    }

    const step = this.searchSteps[this.searchStepIndex];
    
    // Draw all abstract graph lines with lower opacity
    this.ctx.save();
    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = 'rgba(79, 70, 229, 0.15)';
    this.decisionPoints.forEach(dp => {
      const connections = this.graph[dp.label] || [];
      connections.forEach(edge => {
        this.ctx.beginPath();
        edge.path.forEach((p, idx) => {
          const px = (p.x + 0.5) * cellSize;
          const py = (p.y + 0.5) * cellSize;
          if (idx === 0) this.ctx.moveTo(px, py);
          else this.ctx.lineTo(px, py);
        });
        this.ctx.stroke();
      });
    });
    this.ctx.restore();

    // Reached set cells - Draw light blue background
    this.ctx.save();
    step.reached.forEach(label => {
      const dp = this.decisionPoints.find(d => d.label === label);
      if (dp) {
        this.ctx.fillStyle = 'rgba(34, 211, 238, 0.1)'; // Cyan glow
        this.ctx.fillRect(dp.x * cellSize, dp.y * cellSize, cellSize, cellSize);
      }
    });
    this.ctx.restore();

    // Draw active decision point nodes with colors matching search states
    this.decisionPoints.forEach(dp => {
      const cx = (dp.x + 0.5) * cellSize;
      const cy = (dp.y + 0.5) * cellSize;
      const radius = cellSize * 0.35;

      let isCurrent = step.currentNode && step.currentNode.state === dp.label;
      let isFrontier = step.frontier.some(n => n.state === dp.label);
      let isReached = step.reached.includes(dp.label);
      let isExpanded = step.expanded.includes(dp.label);

      // Determine node fill color
      let fillColor = '#64748b'; // Slate (Unvisited)
      let glowColor = null;

      if (isCurrent) {
        fillColor = '#db2777'; // Pink 600 (Current Node being expanded)
        glowColor = 'rgba(219, 39, 119, 0.4)';
      } else if (isFrontier) {
        fillColor = '#eab308'; // Yellow 550 (Frontier)
        glowColor = 'rgba(234, 179, 8, 0.35)';
      } else if (isExpanded) {
        fillColor = '#3b82f6'; // Blue 500 (Expanded/Closed)
        glowColor = 'rgba(59, 130, 246, 0.2)';
      } else if (isReached) {
        fillColor = '#0891b2'; // Cyan (Reached/Open)
        glowColor = 'rgba(8, 145, 178, 0.2)';
      }

      // Draw glows
      if (glowColor) {
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, radius + (isCurrent ? 6 : 3), 0, 2 * Math.PI);
        this.ctx.fillStyle = glowColor;
        this.ctx.fill();
      }

      // Draw circle
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
      this.ctx.fillStyle = fillColor;
      this.ctx.fill();
      
      this.ctx.strokeStyle = isCurrent ? '#ffffff' : 'rgba(255,255,255,0.8)';
      this.ctx.lineWidth = isCurrent ? 3 : 1.5;
      this.ctx.stroke();

      // Label text
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = `bold ${Math.round(cellSize * 0.4)}px Outfit, sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(dp.label, cx, cy);
    });

    // Draw active connections inside expanded/solution paths
    // If a solution path is found, highlight the corridor coordinates in neon green!
    if (step.solutionPath) {
      this.ctx.save();
      this.ctx.lineWidth = 5;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.strokeStyle = '#10b981'; // Emerald Green
      this.ctx.shadowColor = '#10b981';
      this.ctx.shadowBlur = 10;

      this.ctx.beginPath();
      for (let i = 0; i < step.solutionPath.length - 1; i++) {
        const fromLabel = step.solutionPath[i];
        const toLabel = step.solutionPath[i+1];
        
        // Find edge pathway
        const edge = this.graph[fromLabel].find(e => e.to === toLabel);
        if (edge) {
          edge.path.forEach((p, idx) => {
            const px = (p.x + 0.5) * cellSize;
            const py = (p.y + 0.5) * cellSize;
            if (i === 0 && idx === 0) {
              this.ctx.moveTo(px, py);
            } else {
              this.ctx.lineTo(px, py);
            }
          });
        }
      }
      this.ctx.stroke();
      this.ctx.restore();
    }
  }
}

// Export UI to global window scope
window.MazeDemoUI = MazeDemoUI;
