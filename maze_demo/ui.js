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
    
    // Low-level State Space Controls (Step 2)
    this.btnMvForward = document.getElementById('btn-mv-forward');
    this.btnMvLeft = document.getElementById('btn-mv-left');
    this.btnMvRight = document.getElementById('btn-mv-right');
    this.manualLog = document.getElementById('manual-log');
    
    // Abstract State Space Controls (Step 4)
    this.btnAbsNorth = document.getElementById('btn-abs-north');
    this.btnAbsEast = document.getElementById('btn-abs-east');
    this.btnAbsSouth = document.getElementById('btn-abs-south');
    this.btnAbsWest = document.getElementById('btn-abs-west');
    this.absCurrentNode = document.getElementById('abs-current-node');
    this.absLog = document.getElementById('abs-log');

    // UI State
    this.currentTeachingStep = 0; // 0 to 6
    this.robotState = new RobotState(this.maze.start.x, this.maze.start.y, 'E');
    this.abstractRobotState = 'S'; // Start label
    this.activeAbstractPath = null; // Last traversed abstract corridor coordinates
    this.clearPathTimeout = null;

    this.init();
    this.initStats();
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

    // Manual low-level robot controls
    if (this.btnMvForward && this.btnMvLeft && this.btnMvRight) {
      this.btnMvForward.addEventListener('click', () => this.handleManualMove('Forward'));
      this.btnMvLeft.addEventListener('click', () => this.handleManualMove('Turn Left'));
      this.btnMvRight.addEventListener('click', () => this.handleManualMove('Turn Right'));
    }

    // Keyboard controls for both low-level and abstract modes
    window.addEventListener('keydown', (e) => {
      // Step 2: Low-level Manual Space
      if (this.currentTeachingStep === 1) {
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
      }
      // Step 4: Abstract T Space
      else if (this.currentTeachingStep === 3) {
        if (['ArrowUp', 'KeyW'].includes(e.code)) {
          e.preventDefault();
          this.handleAbstractMove('Move North');
        } else if (['ArrowRight', 'KeyD'].includes(e.code)) {
          e.preventDefault();
          this.handleAbstractMove('Move East');
        } else if (['ArrowDown', 'KeyS'].includes(e.code)) {
          e.preventDefault();
          this.handleAbstractMove('Move South');
        } else if (['ArrowLeft', 'KeyA'].includes(e.code)) {
          e.preventDefault();
          this.handleAbstractMove('Move West');
        }
      }
    });

    // Abstract action button event listeners
    if (this.btnAbsNorth && this.btnAbsEast && this.btnAbsSouth && this.btnAbsWest) {
      this.btnAbsNorth.addEventListener('click', () => this.handleAbstractMove('Move North'));
      this.btnAbsEast.addEventListener('click', () => this.handleAbstractMove('Move East'));
      this.btnAbsSouth.addEventListener('click', () => this.handleAbstractMove('Move South'));
      this.btnAbsWest.addEventListener('click', () => this.handleAbstractMove('Move West'));
    }

    // Initial draw
    this.setTeachingStep(0);
  }

  initStats() {
    const traversableCount = this.maze.getTraversableCells().length;
    const turningPointsCount = this.decisionPoints.length;

    // Update dynamically derived stats in Panel elements
    const setSafeText = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };

    setSafeText('stat-k-cells', traversableCount);
    setSafeText('stat-k-cells-p2', traversableCount);
    setSafeText('stat-4k-size', traversableCount * 4);
    setSafeText('stat-t-points-p3', turningPointsCount);
    setSafeText('stat-4t-size', turningPointsCount * 4);
    setSafeText('stat-k-4k', traversableCount * 4);
    setSafeText('stat-t-4t', turningPointsCount * 4);
    setSafeText('stat-t-points-p4', turningPointsCount);
    setSafeText('stat-t-size', turningPointsCount);
    setSafeText('stat-orig-space', `${traversableCount * 4} states`);
    setSafeText('stat-final-space', `${turningPointsCount} states`);
    
    const pct = Math.round((1 - (turningPointsCount / (traversableCount * 4))) * 100);
    setSafeText('stat-pct-reduction', `${pct}%`);

    // Comparison step dynamic stats
    setSafeText('compare-initial-size', traversableCount * 4);
    setSafeText('compare-abstract-size', turningPointsCount);
    const compareBarFill = document.getElementById('compare-bar-fill');
    if (compareBarFill) {
      compareBarFill.style.width = `${pct}%`;
      compareBarFill.textContent = `${pct}% Reduction`;
    }
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
    if (step < 0 || step > 6) return;
    
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
    this.btnNext.textContent = step === 6 ? "Finished" : "Next Step";
    this.btnNext.disabled = step === 6;

    // Reset components depending on step
    if (step === 1) {
      this.robotState = new RobotState(this.maze.start.x, this.maze.start.y, 'E');
      if (this.manualLog) {
        this.manualLog.innerHTML = `<div class="log-entry">Robot placed at Initial State: <strong>${this.robotState.toString()}</strong></div>`;
      }
    } else if (step === 3) {
      this.abstractRobotState = 'S';
      this.activeAbstractPath = null;
      if (this.absCurrentNode) {
        this.absCurrentNode.textContent = this.abstractRobotState;
      }
      if (this.absLog) {
        this.absLog.innerHTML = `<div class="log-entry">Robot placed at node: <strong>${this.abstractRobotState}</strong></div>`;
      }
    }

    this.draw();
  }

  handleManualMove(action) {
    const prevState = this.robotState;
    const nextState = this.robotState.transition(action, this.maze);
    
    this.robotState = nextState;
    this.draw();

    // Log the low level transition
    if (this.manualLog) {
      const logDiv = document.createElement('div');
      logDiv.className = 'log-entry';
      logDiv.innerHTML = `RESULT(${prevState.toString()}, <span>${action}</span>) = <strong>${nextState.toString()}</strong>`;
      this.manualLog.appendChild(logDiv);
      this.manualLog.scrollTop = this.manualLog.scrollHeight;
    }
  }

  handleAbstractMove(action) {
    const fromNode = this.abstractRobotState;
    const edges = this.graph[fromNode] || [];
    const matchedEdge = edges.find(edge => edge.action === action);

    if (matchedEdge) {
      const toNode = matchedEdge.to;
      this.abstractRobotState = toNode;
      this.activeAbstractPath = matchedEdge.path;

      // Update Center Label
      if (this.absCurrentNode) {
        this.absCurrentNode.textContent = toNode;
      }

      // Log the abstract transition
      if (this.absLog) {
        const logDiv = document.createElement('div');
        logDiv.className = 'log-entry';
        logDiv.innerHTML = `RESULT(${fromNode}, <span>${action}</span>) = <strong>${toNode}</strong> <small>(cost: ${matchedEdge.cost})</small>`;
        this.absLog.appendChild(logDiv);
        this.absLog.scrollTop = this.absLog.scrollHeight;
      }

      // Clear highlighted corridor path after a short time
      if (this.clearPathTimeout) {
        clearTimeout(this.clearPathTimeout);
      }
      this.clearPathTimeout = setTimeout(() => {
        this.activeAbstractPath = null;
        this.draw();
      }, 1200);

      this.draw();
    } else {
      // Invalid abstract move (blocked by wall)
      if (this.absLog) {
        const logDiv = document.createElement('div');
        logDiv.className = 'log-entry error';
        logDiv.innerHTML = `<span style="color: #ef4444;">Blocked: Cannot go North/East/South/West from node ${fromNode}</span>`;
        this.absLog.appendChild(logDiv);
        this.absLog.scrollTop = this.absLog.scrollHeight;
      }
    }
  }

  drawSubMaze(cellSize) {
    const cols = this.maze.width;
    const rows = this.maze.height;
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
        }
      }
    }
  }

  draw() {
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);
    
    this.ctx.clearRect(0, 0, w, h);

    const cols = this.maze.width;
    const rows = this.maze.height;

    if (this.currentTeachingStep === 5) {
      // Step 6: Comparison (Side-by-Side Split View)
      const halfW = w / 2;
      
      // Calculate cell size for a single half
      const cellWidth = (halfW - 20) / cols;
      const cellHeight = (h - 40) / rows;
      const cellSize = Math.min(cellWidth, cellHeight);
      
      // Left offset and Right offset
      const leftOffsetX = (halfW - cellSize * cols) / 2;
      const rightOffsetX = halfW + (halfW - cellSize * cols) / 2;
      const offsetY = (h - cellSize * rows) / 2;

      // Draw Left Viewport: Initial Space (4K / 4T)
      this.ctx.save();
      this.ctx.translate(leftOffsetX, offsetY);
      this.drawSubMaze(cellSize);
      
      // Highlight all traversable grid cells
      this.ctx.fillStyle = 'rgba(79, 70, 229, 0.08)'; // Indigo glow
      const traversable = this.maze.getTraversableCells();
      traversable.forEach(cell => {
        this.ctx.fillRect(cell.x * cellSize, cell.y * cellSize, cellSize, cellSize);
      });
      
      // Draw low-level robot with orientation
      this.drawRobot(this.robotState, cellSize, true);
      this.drawStartGoalText(cellSize);
      this.ctx.restore();

      // Label Left Side
      this.ctx.fillStyle = '#64748b'; // Slate 500
      this.ctx.font = 'bold 11px Outfit, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText("Initial Space (4K / 4T states)", halfW / 2, h - 10);

      // Draw Right Viewport: Abstract Space (T / J)
      this.ctx.save();
      this.ctx.translate(rightOffsetX, offsetY);
      this.drawSubMaze(cellSize);
      this.drawGraphEdges(cellSize, false);
      this.drawDecisionPoints(cellSize);
      
      // Draw Abstract robot without orientation at current node
      const currentDP = this.decisionPoints.find(d => d.label === this.abstractRobotState);
      if (currentDP) {
        this.drawRobot({ x: currentDP.x, y: currentDP.y }, cellSize, false);
      }
      this.drawStartGoalText(cellSize);
      this.ctx.restore();

      // Label Right Side
      this.ctx.fillStyle = '#64748b'; // Slate 500
      this.ctx.font = 'bold 11px Outfit, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText("Abstract Space (T / J states)", halfW + halfW / 2, h - 10);

      // Draw Divider Line
      this.ctx.strokeStyle = 'rgba(15, 23, 42, 0.1)';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(halfW, 0);
      this.ctx.lineTo(halfW, h);
      this.ctx.stroke();

      return;
    }
    
    // Cell Dimensions
    const cellWidth = w / cols;
    const cellHeight = h / rows;
    const cellSize = Math.min(cellWidth, cellHeight);
    
    // Offset to center the maze in the canvas
    const offsetX = (w - cellSize * cols) / 2;
    const offsetY = (h - cellSize * rows) / 2;

    this.ctx.save();
    this.ctx.translate(offsetX, offsetY);

    // Draw Grid Cells
    this.drawSubMaze(cellSize);

    // Special highlights for start/goal (when in Step 1 or 2)
    if (this.currentTeachingStep === 0 || this.currentTeachingStep === 1) {
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const char = this.grid[y][x];
          const cx = x * cellSize;
          const cy = y * cellSize;
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

    // 2. Step Specific Drawings
    if (this.currentTeachingStep === 0) {
      // Step 1: Highlight all traversable grid cells
      this.ctx.fillStyle = 'rgba(79, 70, 229, 0.04)';
      const traversable = this.maze.getTraversableCells();
      traversable.forEach(cell => {
        this.ctx.fillRect(cell.x * cellSize, cell.y * cellSize, cellSize, cellSize);
      });
    }
    else if (this.currentTeachingStep === 1) {
      // Step 2: Highlight T state space (all traversable cells glow slightly)
      this.ctx.fillStyle = 'rgba(79, 70, 229, 0.08)'; // Indigo glow
      const traversable = this.maze.getTraversableCells();
      traversable.forEach(cell => {
        this.ctx.fillRect(cell.x * cellSize, cell.y * cellSize, cellSize, cellSize);
      });
      
      // Draw Robot (location + orientation)
      this.drawRobot(this.robotState, cellSize, true);
    } 
    else if (this.currentTeachingStep === 2) {
      // Step 3 (Decision Points) - Highlight nodes only
      this.drawDecisionPoints(cellSize);
    }
    else if (this.currentTeachingStep === 3) {
      // Step 4 (T State Space - Abstract movement)
      // Draw Graph Edges connection corridors faintly
      this.drawGraphEdges(cellSize, true); // true for faint representation
      this.drawDecisionPoints(cellSize);

      // Highlight active corridor traversal in neon emerald green
      if (this.activeAbstractPath) {
        this.ctx.save();
        this.ctx.lineWidth = 4;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.strokeStyle = '#10b981'; // Emerald Green
        this.ctx.shadowColor = '#10b981';
        this.ctx.shadowBlur = 6;

        this.ctx.beginPath();
        this.activeAbstractPath.forEach((p, idx) => {
          const px = (p.x + 0.5) * cellSize;
          const py = (p.y + 0.5) * cellSize;
          if (idx === 0) this.ctx.moveTo(px, py);
          else this.ctx.lineTo(px, py);
        });
        this.ctx.stroke();
        this.ctx.restore();
      }

      // Draw Abstract Robot at current node (no orientation)
      const currentDP = this.decisionPoints.find(d => d.label === this.abstractRobotState);
      if (currentDP) {
        this.drawRobot({ x: currentDP.x, y: currentDP.y }, cellSize, false);
      }
    }
    else if (this.currentTeachingStep === 4) {
      // Step 5 (Abstract Graph) - Draw nodes and full graph edges
      this.drawGraphEdges(cellSize, false);
      this.drawDecisionPoints(cellSize);
    }
    else if (this.currentTeachingStep === 6) {
      // Step 7 (Complexity) - Draw abstract graph with optimal path highlighted
      const path = this.findOptimalPath();
      this.drawGraphEdges(cellSize, false, path);
      this.drawDecisionPoints(cellSize, path);
    }

    // Render Start (S) and Goal (G) text overlays
    this.drawStartGoalText(cellSize);

    this.ctx.restore();
  }

  drawRobot(state, cellSize, showOrientation) {
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
    if (showOrientation) {
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
  }

  findOptimalPath() {
    // Dijkstra algorithm on this.graph from 'S' to 'G'
    const dist = {};
    const prev = {};
    const queue = [];

    this.decisionPoints.forEach(dp => {
      dist[dp.label] = Infinity;
      prev[dp.label] = null;
      queue.push(dp.label);
    });

    dist['S'] = 0;

    while (queue.length > 0) {
      queue.sort((a, b) => dist[a] - dist[b]);
      const u = queue.shift();

      if (u === 'G' || dist[u] === Infinity) break;

      const edges = this.graph[u] || [];
      edges.forEach(edge => {
        const alt = dist[u] + edge.cost;
        if (alt < dist[edge.to]) {
          dist[edge.to] = alt;
          prev[edge.to] = u;
        }
      });
    }

    const path = [];
    let curr = 'G';
    if (prev[curr] || curr === 'S') {
      while (curr) {
        path.push(curr);
        curr = prev[curr];
      }
    }
    return path.reverse();
  }

  drawDecisionPoints(cellSize, highlightedPath = null) {
    this.decisionPoints.forEach(dp => {
      const cx = (dp.x + 0.5) * cellSize;
      const cy = (dp.y + 0.5) * cellSize;
      const radius = cellSize * 0.35;
      
      const isOnPath = highlightedPath && highlightedPath.includes(dp.label);

      // Glow circle
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, radius + 4, 0, 2 * Math.PI);
      if (isOnPath) {
        this.ctx.fillStyle = 'rgba(16, 185, 129, 0.3)';
      } else {
        this.ctx.fillStyle = dp.type === 'start' 
          ? 'rgba(16, 185, 129, 0.2)' 
          : (dp.type === 'goal' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(8, 145, 178, 0.2)');
      }
      this.ctx.fill();

      // Node circle
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
      if (isOnPath) {
        this.ctx.fillStyle = '#10b981';
      } else {
        this.ctx.fillStyle = dp.type === 'start' 
          ? '#10b981' // Green
          : (dp.type === 'goal' ? '#ef4444' : '#0891b2'); // Cyan
      }
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

  drawGraphEdges(cellSize, faint = false, highlightedPath = null) {
    this.ctx.save();
    
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    const drawnEdges = new Set();

    this.decisionPoints.forEach(dp => {
      const connections = this.graph[dp.label] || [];
      connections.forEach(edge => {
        // Create unique key to avoid drawing bi-directional edges twice
        const key = [dp.label, edge.to].sort().join('-');
        if (drawnEdges.has(key)) return;
        drawnEdges.add(key);

        let isHighlighted = false;
        if (highlightedPath) {
          const idx1 = highlightedPath.indexOf(dp.label);
          const idx2 = highlightedPath.indexOf(edge.to);
          if (idx1 !== -1 && idx2 !== -1 && Math.abs(idx1 - idx2) === 1) {
            isHighlighted = true;
          }
        }

        if (isHighlighted) {
          this.ctx.strokeStyle = '#10b981';
          this.ctx.lineWidth = 4.5;
          this.ctx.shadowColor = '#10b981';
          this.ctx.shadowBlur = 4;
        } else {
          this.ctx.strokeStyle = faint ? 'rgba(79, 70, 229, 0.15)' : 'rgba(79, 70, 229, 0.5)';
          this.ctx.lineWidth = faint ? 1.5 : 3;
          this.ctx.shadowBlur = 0;
        }

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
        this.ctx.shadowBlur = 0;

        // Draw path cost weight label at the center cell of the path (unless faint)
        if (!faint && edge.path.length > 2) {
          const midIdx = Math.floor(edge.path.length / 2);
          const midPt = edge.path[midIdx];
          const mx = (midPt.x + 0.5) * cellSize;
          const my = (midPt.y + 0.5) * cellSize;

          // Cost circle badge
          this.ctx.beginPath();
          this.ctx.arc(mx, my, cellSize * 0.22, 0, 2 * Math.PI);
          this.ctx.fillStyle = isHighlighted ? '#10b981' : '#4338ca'; // Green if path
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
}

// Export UI to global window scope
window.MazeDemoUI = MazeDemoUI;
