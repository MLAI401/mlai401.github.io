/**
 * UI Visualizer and Controller for the Maze Search & Performance Evaluation Demo.
 */
class MazeSearchDemoUI {
  constructor() {
    this.engine = new MazeSearchEngine();
    
    // UI State
    this.currentAlgorithm = 'A*';
    this.compareAlgorithm = 'BFS';
    this.isCompareMode = false;
    this.searchMode = 'grid'; // 'grid' or 'abstract'
    this.earlyGoalTest = false;
    this.playbackSpeed = 200; // ms
    this.isPlaying = false;
    this.playTimer = null;
    this.currentStepIdx = 0;
    this.compareStepIdx = 0;

    // Search Results Cache
    this.primaryResult = null;
    this.compareResult = null;

    // DOM Elements
    this.canvas = document.getElementById('ms-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    // Controls
    this.algSelect = document.getElementById('ms-alg-select');
    this.algCompareSelect = document.getElementById('ms-alg-compare-select');
    this.presetSelect = document.getElementById('ms-preset-select');
    this.modeSelect = document.getElementById('ms-mode-select');
    this.btnPlay = document.getElementById('ms-btn-play');
    this.btnPrev = document.getElementById('ms-btn-prev');
    this.btnNext = document.getElementById('ms-btn-next');
    this.btnReset = document.getElementById('ms-btn-reset');
    this.speedSlider = document.getElementById('ms-speed-slider');
    this.speedDisplay = document.getElementById('ms-speed-display');
    this.earlyGoalCheckbox = document.getElementById('ms-early-goal');
    this.compareToggle = document.getElementById('ms-compare-toggle');
    this.compareGroup = document.getElementById('ms-compare-select-group');

    // Dashboards / Readouts
    this.metricExpanded = document.getElementById('ms-stat-expanded');
    this.metricMemory = document.getElementById('ms-stat-memory');
    this.metricCost = document.getElementById('ms-stat-cost');
    this.metricOptimality = document.getElementById('ms-stat-optimality');
    this.logContent = document.getElementById('ms-log-content');
    this.frontierContainer = document.getElementById('ms-frontier-container');
    this.summaryTableBody = document.getElementById('ms-summary-table-body');

    this.init();
  }

  init() {
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // Event Listeners
    if (this.algSelect) {
      this.algSelect.addEventListener('change', (e) => {
        this.currentAlgorithm = e.target.value;
        this.runNewSearch();
      });
    }

    if (this.algCompareSelect) {
      this.algCompareSelect.addEventListener('change', (e) => {
        this.compareAlgorithm = e.target.value;
        this.runNewSearch();
      });
    }

    if (this.presetSelect) {
      this.presetSelect.addEventListener('change', (e) => {
        this.engine.setPreset(e.target.value);
        this.runNewSearch();
      });
    }

    if (this.modeSelect) {
      this.modeSelect.addEventListener('change', (e) => {
        this.searchMode = e.target.value;
        this.runNewSearch();
      });
    }

    if (this.compareToggle) {
      this.compareToggle.addEventListener('change', (e) => {
        this.isCompareMode = e.target.checked;
        if (this.compareGroup) {
          this.compareGroup.style.display = this.isCompareMode ? 'flex' : 'none';
        }
        this.runNewSearch();
      });
    }

    if (this.earlyGoalCheckbox) {
      this.earlyGoalCheckbox.addEventListener('change', (e) => {
        this.earlyGoalTest = e.target.checked;
        this.runNewSearch();
      });
    }

    if (this.speedSlider) {
      this.speedSlider.addEventListener('input', (e) => {
        this.playbackSpeed = parseInt(e.target.value);
        if (this.speedDisplay) {
          this.speedDisplay.textContent = `${this.playbackSpeed}ms`;
        }
        if (this.isPlaying) {
          this.pause();
          this.play();
        }
      });
    }

    if (this.btnPlay) {
      this.btnPlay.addEventListener('click', () => {
        if (this.isPlaying) this.pause();
        else this.play();
      });
    }

    if (this.btnNext) {
      this.btnNext.addEventListener('click', () => {
        this.pause();
        this.stepForward();
      });
    }

    if (this.btnPrev) {
      this.btnPrev.addEventListener('click', () => {
        this.pause();
        this.stepBackward();
      });
    }

    if (this.btnReset) {
      this.btnReset.addEventListener('click', () => {
        this.pause();
        this.currentStepIdx = 0;
        this.compareStepIdx = 0;
        this.updateUI();
        this.draw();
      });
    }

    // Initial search
    this.runNewSearch();
  }

  resizeCanvas() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.draw();
  }

  runNewSearch() {
    this.pause();
    this.primaryResult = this.engine.runSearch(this.currentAlgorithm, this.searchMode, this.earlyGoalTest);
    if (this.isCompareMode) {
      this.compareResult = this.engine.runSearch(this.compareAlgorithm, this.searchMode, this.earlyGoalTest);
    } else {
      this.compareResult = null;
    }

    this.currentStepIdx = 0;
    this.compareStepIdx = 0;
    this.renderSummaryTable();
    this.updateUI();
    this.draw();
  }

  play() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    if (this.btnPlay) {
      this.btnPlay.innerHTML = '<i data-lucide="pause"></i> Pause';
      if (window.lucide) lucide.createIcons();
    }

    this.playTimer = setInterval(() => {
      const maxSteps = this.primaryResult ? this.primaryResult.events.length - 1 : 0;
      const compareMax = this.compareResult ? this.compareResult.events.length - 1 : 0;

      let advanced = false;
      if (this.currentStepIdx < maxSteps) {
        this.currentStepIdx++;
        advanced = true;
      }
      if (this.isCompareMode && this.compareStepIdx < compareMax) {
        this.compareStepIdx++;
        advanced = true;
      }

      this.updateUI();
      this.draw();

      if (!advanced) {
        this.pause();
      }
    }, this.playbackSpeed);
  }

  pause() {
    this.isPlaying = false;
    if (this.playTimer) {
      clearInterval(this.playTimer);
      this.playTimer = null;
    }
    if (this.btnPlay) {
      this.btnPlay.innerHTML = '<i data-lucide="play"></i> Auto Run';
      if (window.lucide) lucide.createIcons();
    }
  }

  stepForward() {
    const maxSteps = this.primaryResult ? this.primaryResult.events.length - 1 : 0;
    if (this.currentStepIdx < maxSteps) {
      this.currentStepIdx++;
    }
    if (this.isCompareMode && this.compareResult) {
      const compareMax = this.compareResult.events.length - 1;
      if (this.compareStepIdx < compareMax) {
        this.compareStepIdx++;
      }
    }
    this.updateUI();
    this.draw();
  }

  stepBackward() {
    if (this.currentStepIdx > 0) {
      this.currentStepIdx--;
    }
    if (this.isCompareMode && this.compareStepIdx > 0) {
      this.compareStepIdx--;
    }
    this.updateUI();
    this.draw();
  }

  updateUI() {
    if (!this.primaryResult) return;
    const ev = this.primaryResult.events[this.currentStepIdx];
    if (!ev) return;

    // Metrics
    if (this.metricExpanded) {
      this.metricExpanded.textContent = ev.expandedCount;
    }
    if (this.metricMemory) {
      this.metricMemory.textContent = `${ev.peakMemory} nodes`;
    }
    if (this.metricCost) {
      if (ev.solutionCost !== undefined) {
        this.metricCost.textContent = `${ev.solutionCost} (Goal)`;
      } else if (ev.selectedNode) {
        this.metricCost.textContent = `${ev.selectedNode.g} (active)`;
      } else {
        this.metricCost.textContent = '0';
      }
    }

    if (this.metricOptimality) {
      const optimalSummary = this.engine.computeAllAlgorithmsSummary(this.searchMode);
      const isOpt = optimalSummary[this.currentAlgorithm] && optimalSummary[this.currentAlgorithm].isOptimal;
      this.metricOptimality.textContent = isOpt ? 'Optimal (C*)' : 'Suboptimal';
      this.metricOptimality.className = isOpt ? 'badge-optimal' : 'badge-suboptimal';
    }

    // Step Log
    if (this.logContent) {
      const entry = document.createElement('div');
      entry.className = `ms-log-entry ${ev.type.toLowerCase()}`;
      entry.innerHTML = `<span class="ms-log-step">Step ${this.currentStepIdx}:</span> ${ev.message}`;
      this.logContent.innerHTML = '';
      this.logContent.appendChild(entry);
    }

    // Visual Frontier
    this.renderFrontierCards(ev.frontier);
  }

  renderFrontierCards(frontier) {
    if (!this.frontierContainer) return;
    this.frontierContainer.innerHTML = '';

    if (!frontier || frontier.length === 0) {
      this.frontierContainer.innerHTML = '<div class="frontier-empty-tip">Frontier is empty</div>';
      return;
    }

    const displayLimit = 12;
    frontier.slice(0, displayLimit).forEach((node, idx) => {
      const card = document.createElement('div');
      card.className = `ms-frontier-card ${idx === 0 ? 'next-pop' : ''}`;
      
      const label = node.label || `(${node.x},${node.y})`;
      card.innerHTML = `
        <div class="card-node-id">${label}</div>
        <div class="card-values">
          <span>g:${node.g}</span>
          <span>h:${node.h}</span>
          ${node.f !== undefined ? `<strong>f:${node.f}</strong>` : ''}
        </div>
      `;
      this.frontierContainer.appendChild(card);
    });

    if (frontier.length > displayLimit) {
      const more = document.createElement('div');
      more.className = 'ms-frontier-card more';
      more.textContent = `+${frontier.length - displayLimit} more`;
      this.frontierContainer.appendChild(more);
    }
  }

  renderSummaryTable() {
    if (!this.summaryTableBody) return;
    const summary = this.engine.computeAllAlgorithmsSummary(this.searchMode);
    this.summaryTableBody.innerHTML = '';

    const complexityBounds = {
      'BFS': { time: 'O(bᵈ)', space: 'O(bᵈ)', complete: 'Yes', opt: 'Yes*' },
      'DFS': { time: 'O(bᵐ)', space: 'O(bm)', complete: 'Yes/No', opt: 'No' },
      'IDS': { time: 'O(bᵈ)', space: 'O(bd)', complete: 'Yes', opt: 'Yes*' },
      'UCS': { time: 'O(b¹⁺⌊C*/ε⌋)', space: 'O(b¹⁺⌊C*/ε⌋)', complete: 'Yes', opt: 'Yes' },
      'Greedy': { time: 'O(bᵐ)', space: 'O(bᵐ)', complete: 'Yes', opt: 'No' },
      'A*': { time: 'O(bᵈ)', space: 'O(bᵈ)', complete: 'Yes', opt: 'Yes' }
    };

    Object.keys(summary).forEach(alg => {
      const s = summary[alg];
      const bounds = complexityBounds[alg];
      const isCurrent = (alg === this.currentAlgorithm);
      const isCompare = (this.isCompareMode && alg === this.compareAlgorithm);

      const row = document.createElement('tr');
      if (isCurrent) row.className = 'active-row';
      if (isCompare) row.className = 'compare-row';

      row.innerHTML = `
        <td><strong>${alg}</strong></td>
        <td><code>${bounds.time}</code></td>
        <td><code>${bounds.space}</code></td>
        <td>${s.expandedCount}</td>
        <td>${s.peakMemory}</td>
        <td>${s.cost === Infinity ? 'Unreachable' : s.cost}</td>
        <td><span class="${s.isOptimal ? 'badge-optimal-sm' : 'badge-suboptimal-sm'}">${s.isOptimal ? 'Optimal' : 'Suboptimal'}</span></td>
        <td>
          <button class="btn-action-sm ${isCurrent ? 'active' : ''}" data-alg="${alg}">
            ${isCurrent ? 'Active' : 'Select'}
          </button>
        </td>
      `;

      row.querySelector('button').addEventListener('click', () => {
        this.currentAlgorithm = alg;
        if (this.algSelect) this.algSelect.value = alg;
        this.runNewSearch();
      });

      this.summaryTableBody.appendChild(row);
    });
  }

  // ================= CANVAS RENDERING =================

  draw() {
    if (!this.canvas || !this.ctx) return;
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);
    this.ctx.clearRect(0, 0, w, h);

    if (this.isCompareMode && this.compareResult) {
      // Split Screen side-by-side
      const halfW = w / 2;
      
      // Left View: Primary
      this.ctx.save();
      this.drawViewport(0, 0, halfW, h, this.primaryResult, this.currentStepIdx, `${this.currentAlgorithm} (Primary)`);
      this.ctx.restore();

      // Right View: Compare
      this.ctx.save();
      this.drawViewport(halfW, 0, halfW, h, this.compareResult, this.compareStepIdx, `${this.compareAlgorithm} (Comparison)`);
      this.ctx.restore();

      // Divider line
      this.ctx.strokeStyle = 'rgba(15, 23, 42, 0.15)';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(halfW, 0);
      this.ctx.lineTo(halfW, h);
      this.ctx.stroke();
    } else {
      // Single Viewport
      this.drawViewport(0, 0, w, h, this.primaryResult, this.currentStepIdx, `${this.currentAlgorithm} Search`);
    }
  }

  drawViewport(vx, vy, vw, vh, result, stepIdx, title) {
    const cols = this.engine.width;
    const rows = this.engine.height;

    const pad = 25;
    const cellW = (vw - pad * 2) / cols;
    const cellH = (vh - pad * 2 - 20) / rows;
    const cellSize = Math.min(cellW, cellH);

    const offsetX = vx + (vw - cellSize * cols) / 2;
    const offsetY = vy + (vh - cellSize * rows) / 2 + 10;

    // Viewport Title
    this.ctx.fillStyle = '#64748b';
    this.ctx.font = 'bold 12px Outfit, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(title, vx + vw / 2, vy + 16);

    this.ctx.save();
    this.ctx.translate(offsetX, offsetY);

    const ev = result ? result.events[Math.min(stepIdx, result.events.length - 1)] : null;
    const reachedSet = ev ? new Set(ev.reachedKeys) : new Set();
    const frontierSet = ev ? new Set(ev.frontier.map(f => f.label || `${f.x},${f.y}`)) : new Set();
    const selected = ev ? ev.selectedNode : null;
    const solution = (ev && ev.solutionPath) ? ev.solutionPath : null;

    // 1. Draw Grid Cells
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const char = this.engine.grid[y][x];
        const cx = x * cellSize;
        const cy = y * cellSize;
        const key = `${x},${y}`;

        if (char === '#') {
          // Wall cell
          this.ctx.fillStyle = '#1e293b';
          this.ctx.fillRect(cx, cy, cellSize, cellSize);
          this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
          this.ctx.lineWidth = 0.5;
          this.ctx.strokeRect(cx, cy, cellSize, cellSize);
        } else {
          // Traversable cell base
          this.ctx.fillStyle = '#f8fafc';
          this.ctx.fillRect(cx, cy, cellSize, cellSize);

          // Explored / Reached glow
          if (reachedSet.has(key)) {
            this.ctx.fillStyle = 'rgba(79, 70, 229, 0.12)';
            this.ctx.fillRect(cx, cy, cellSize, cellSize);
          }

          // Frontier cell halo
          if (frontierSet.has(key)) {
            this.ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
            this.ctx.fillRect(cx, cy, cellSize, cellSize);
          }

          // Grid line
          this.ctx.strokeStyle = 'rgba(15, 23, 42, 0.05)';
          this.ctx.lineWidth = 0.5;
          this.ctx.strokeRect(cx, cy, cellSize, cellSize);
        }
      }
    }

    // 2. Draw Abstract Graph Edges (if in abstract mode)
    if (this.searchMode === 'abstract') {
      this.ctx.save();
      this.ctx.lineCap = 'round';
      this.engine.decisionPoints.forEach(dp => {
        const edges = this.engine.abstractGraph[dp.label] || [];
        edges.forEach(edge => {
          this.ctx.strokeStyle = 'rgba(79, 70, 229, 0.35)';
          this.ctx.lineWidth = 2.5;
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
    }

    // 3. Draw Solution Path
    if (solution) {
      this.ctx.save();
      this.ctx.strokeStyle = '#10b981'; // Emerald Green
      this.ctx.lineWidth = Math.max(3, cellSize * 0.2);
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.shadowColor = '#10b981';
      this.ctx.shadowBlur = 6;

      this.ctx.beginPath();
      if (typeof solution[0] === 'string') {
        // Abstract path labels
        const dps = this.engine.decisionPoints;
        solution.forEach((label, idx) => {
          const dp = dps.find(d => d.label === label);
          if (dp) {
            const px = (dp.x + 0.5) * cellSize;
            const py = (dp.y + 0.5) * cellSize;
            if (idx === 0) this.ctx.moveTo(px, py);
            else this.ctx.lineTo(px, py);
          }
        });
      } else {
        // Grid coordinates path
        solution.forEach((pt, idx) => {
          const px = (pt.x + 0.5) * cellSize;
          const py = (pt.y + 0.5) * cellSize;
          if (idx === 0) this.ctx.moveTo(px, py);
          else this.ctx.lineTo(px, py);
        });
      }
      this.ctx.stroke();
      this.ctx.restore();
    }

    // 4. Draw Decision Points (if abstract mode)
    if (this.searchMode === 'abstract') {
      this.engine.decisionPoints.forEach(dp => {
        const cx = (dp.x + 0.5) * cellSize;
        const cy = (dp.y + 0.5) * cellSize;
        const radius = cellSize * 0.35;

        this.ctx.beginPath();
        this.ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
        if (dp.type === 'start') this.ctx.fillStyle = '#10b981';
        else if (dp.type === 'goal') this.ctx.fillStyle = '#ef4444';
        else if (reachedSet.has(dp.label)) this.ctx.fillStyle = '#6366f1';
        else this.ctx.fillStyle = '#0891b2';
        this.ctx.fill();
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = `bold ${Math.round(cellSize * 0.35)}px Outfit`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(dp.label, cx, cy);
      });
    }

    // 5. Highlight Selected Active Node
    if (selected) {
      const sx = (selected.x + 0.5) * cellSize;
      const sy = (selected.y + 0.5) * cellSize;
      const radius = cellSize * 0.4;

      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(sx, sy, radius + 3, 0, 2 * Math.PI);
      this.ctx.fillStyle = 'rgba(168, 85, 247, 0.3)';
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.arc(sx, sy, radius, 0, 2 * Math.PI);
      this.ctx.fillStyle = '#a855f7'; // Purple pulse
      this.ctx.fill();
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
      this.ctx.restore();
    }

    // 6. Draw Start & Goal Markers
    this.drawStartGoal(cellSize);

    this.ctx.restore();
  }

  drawStartGoal(cellSize) {
    const markers = [
      { pt: this.engine.start, text: 'S', color: '#10b981' },
      { pt: this.engine.goal, text: 'G', color: '#ef4444' }
    ];

    markers.forEach(m => {
      const cx = (m.pt.x + 0.5) * cellSize;
      const cy = (m.pt.y + 0.5) * cellSize;
      const radius = cellSize * 0.32;

      this.ctx.beginPath();
      this.ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
      this.ctx.fillStyle = m.color;
      this.ctx.fill();
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = `bold ${Math.round(cellSize * 0.38)}px Outfit`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(m.text, cx, cy);
    });
  }
}

// Export to window
window.MazeSearchDemoUI = MazeSearchDemoUI;
