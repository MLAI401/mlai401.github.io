/**
 * Adversarial Search & Games Playground Interactive Controller
 *
 * Provides:
 * 1. Interactive Canvas Tree Visualizer for Minimax, Alpha-Beta Pruning, Expectiminimax, and MCTS.
 * 2. Playable Game Arena (Tic-Tac-Toe, Micro Connect-4, Nim) vs AI with live AI Mind Inspector.
 * 3. MCTS Live Rollout Simulator & UCB1 Explorer.
 * 4. Alpha-Beta Move Ordering & Pruning Benchmark Lab.
 */

(function () {
  'use strict';

  class AdversarialLabUI {
    constructor() {
      this.activeSubtab = 'tree'; // 'tree', 'arena', 'mcts', 'benchmark'

      // Tree Visualizer State
      this.currentAlg = 'ALPHABETA'; // 'MINIMAX', 'ALPHABETA', 'EXPECTIMINIMAX', 'MCTS'
      this.currentPreset = 'AIMA_57'; // 'AIMA_52', 'AIMA_57', 'DEEP_3PLY', 'CHANCE', 'CUSTOM'
      this.treeRoot = null;
      this.steps = [];
      this.currentStepIdx = 0;
      this.isPlaying = false;
      this.playTimer = null;
      this.playSpeed = 1000; // ms

      // Arena State
      this.arenaGameType = 'tictactoe'; // 'tictactoe', 'connect', 'nim'
      this.tttGame = new window.AdversarialEngine.TicTacToeGame();
      this.nimGame = new window.AdversarialEngine.NimGame();
      this.connectGame = new window.AdversarialEngine.MicroConnectGame();
      this.aiPlayer = 'ALPHABETA'; // 'MINIMAX', 'ALPHABETA', 'MCTS', 'RANDOM'
      this.humanRole = 'MAX'; // 'MAX' (plays first), 'MIN' (AI plays first)
      this.aiThinking = false;

      // MCTS Live Lab State
      this.mctsSimCount = 0;
      this.mctsTotalWins = 0;
      this.mctsCParam = 1.414;
      this.mctsTreeRoot = null;

      // DOM Elements
      this.canvas = document.getElementById('adv-tree-canvas');
      this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

      this.init();
    }

    init() {
      this.bindSubtabs();
      this.bindTreeControls();
      this.bindArenaControls();
      this.bindMctsControls();
      this.bindBenchmarkControls();

      // Load initial tree
      this.loadTreePreset(this.currentPreset);
      this.generateTreeTrace();

      // Setup Canvas Resize
      if (this.canvas) {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
      }

      // Initial Arena Render
      this.renderArenaBoard();
    }

    resizeCanvas() {
      if (!this.canvas) return;
      const container = this.canvas.parentElement;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = Math.max(rect.width || 600, 300);
      const height = Math.max(rect.height || 420, 380);

      this.canvas.width = width * dpr;
      this.canvas.height = height * dpr;
      this.canvas.style.width = width + 'px';
      this.canvas.style.height = height + 'px';
      if (this.ctx) {
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      this.drawTree();
    }

    // ==========================================
    // 1. SUBTAB SWITCHING
    // ==========================================

    bindSubtabs() {
      const tabs = document.querySelectorAll('.adv-subtab-btn');
      tabs.forEach(btn => {
        btn.addEventListener('click', () => {
          tabs.forEach(t => t.classList.remove('active'));
          btn.classList.add('active');
          this.activeSubtab = btn.getAttribute('data-subtab');

          document.querySelectorAll('.adv-subtab-pane').forEach(pane => {
            pane.classList.remove('active');
          });
          const targetPane = document.getElementById(`adv-pane-${this.activeSubtab}`);
          if (targetPane) targetPane.classList.add('active');

          if (this.activeSubtab === 'tree') {
            setTimeout(() => this.resizeCanvas(), 50);
          } else if (this.activeSubtab === 'arena') {
            this.renderArenaBoard();
          } else if (this.activeSubtab === 'benchmark') {
            this.runBenchmark();
          }

          if (typeof lucide !== 'undefined') lucide.createIcons();
        });
      });
    }

    // ==========================================
    // 2. TREE VISUALIZER CONTROLS & RENDERING
    // ==========================================

    loadTreePreset(presetKey) {
      this.currentPreset = presetKey;
      switch (presetKey) {
        case 'AIMA_52':
          this.treeRoot = window.AdversarialEngine.createAimaFig52Tree();
          break;
        case 'AIMA_57':
          this.treeRoot = window.AdversarialEngine.createAimaFig57Tree();
          break;
        case 'DEEP_3PLY':
          this.treeRoot = window.AdversarialEngine.createDeep3PlyTree();
          break;
        case 'CHANCE':
          this.treeRoot = window.AdversarialEngine.createChanceTree();
          break;
        case 'CUSTOM':
          this.treeRoot = window.AdversarialEngine.createCustomTree();
          break;
        default:
          this.treeRoot = window.AdversarialEngine.createAimaFig57Tree();
      }
    }

    bindTreeControls() {
      // Alg selector
      const algButtons = document.querySelectorAll('.adv-alg-btn');
      algButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          algButtons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.currentAlg = btn.getAttribute('data-alg');
          this.pause();
          this.generateTreeTrace();
        });
      });

      // Preset selector
      const presetSelect = document.getElementById('adv-preset-select');
      if (presetSelect) {
        presetSelect.addEventListener('change', (e) => {
          this.pause();
          this.loadTreePreset(e.target.value);
          this.generateTreeTrace();
        });
      }

      // Step Controls
      const btnPlay = document.getElementById('btn-adv-play');
      const btnPause = document.getElementById('btn-adv-pause');
      const btnPrev = document.getElementById('btn-adv-prev');
      const btnNext = document.getElementById('btn-adv-next');
      const btnReset = document.getElementById('btn-adv-reset');
      const speedSlider = document.getElementById('adv-speed-slider');

      if (btnPlay) btnPlay.addEventListener('click', () => this.play());
      if (btnPause) btnPause.addEventListener('click', () => this.pause());
      if (btnPrev) btnPrev.addEventListener('click', () => this.stepPrev());
      if (btnNext) btnNext.addEventListener('click', () => this.stepNext());
      if (btnReset) btnReset.addEventListener('click', () => this.resetTree());

      if (speedSlider) {
        speedSlider.addEventListener('input', (e) => {
          const val = parseInt(e.target.value);
          this.playSpeed = Math.round(2000 / val);
          if (this.isPlaying) {
            this.pause();
            this.play();
          }
        });
      }

      // Leaf Value Editor
      const btnApplyLeaf = document.getElementById('btn-adv-apply-leaf');
      if (btnApplyLeaf) {
        btnApplyLeaf.addEventListener('click', () => {
          const nodeId = document.getElementById('adv-leaf-node-id').value;
          const newVal = parseFloat(document.getElementById('adv-leaf-val-input').value);
          if (this.treeRoot && !isNaN(newVal)) {
            this.updateNodeLeafValue(this.treeRoot, nodeId, newVal);
            this.pause();
            this.generateTreeTrace();
          }
        });
      }
    }

    updateNodeLeafValue(node, id, val) {
      if (node.id === id) {
        node.value = val;
        node.initialValue = val;
        return true;
      }
      for (const child of node.children) {
        if (this.updateNodeLeafValue(child, id, val)) return true;
      }
      return false;
    }

    generateTreeTrace() {
      if (!this.treeRoot) return;

      if (this.currentAlg === 'MINIMAX') {
        this.steps = window.AdversarialEngine.generateMinimaxSteps(this.treeRoot);
      } else if (this.currentAlg === 'ALPHABETA') {
        this.steps = window.AdversarialEngine.generateAlphaBetaSteps(this.treeRoot);
      } else if (this.currentAlg === 'EXPECTIMINIMAX') {
        this.steps = window.AdversarialEngine.generateExpectiminimaxSteps(this.treeRoot);
      } else if (this.currentAlg === 'MCTS') {
        this.steps = window.AdversarialEngine.generateMCTSSteps(this.treeRoot, 6, 1.414);
      }

      this.currentStepIdx = 0;
      this.updateTreeUI();
      this.drawTree();
    }

    play() {
      if (this.isPlaying) return;
      this.isPlaying = true;
      const btnPlay = document.getElementById('btn-adv-play');
      const btnPause = document.getElementById('btn-adv-pause');
      if (btnPlay) btnPlay.style.display = 'none';
      if (btnPause) btnPause.style.display = 'inline-flex';

      this.playTimer = setInterval(() => {
        if (this.currentStepIdx < this.steps.length - 1) {
          this.currentStepIdx++;
          this.updateTreeUI();
          this.drawTree();
        } else {
          this.pause();
        }
      }, this.playSpeed);
    }

    pause() {
      this.isPlaying = false;
      if (this.playTimer) clearInterval(this.playTimer);
      const btnPlay = document.getElementById('btn-adv-play');
      const btnPause = document.getElementById('btn-adv-pause');
      if (btnPlay) btnPlay.style.display = 'inline-flex';
      if (btnPause) btnPause.style.display = 'none';
    }

    stepPrev() {
      this.pause();
      if (this.currentStepIdx > 0) {
        this.currentStepIdx--;
        this.updateTreeUI();
        this.drawTree();
      }
    }

    stepNext() {
      this.pause();
      if (this.currentStepIdx < this.steps.length - 1) {
        this.currentStepIdx++;
        this.updateTreeUI();
        this.drawTree();
      }
    }

    resetTree() {
      this.pause();
      this.currentStepIdx = 0;
      this.updateTreeUI();
      this.drawTree();
    }

    updateTreeUI() {
      const step = this.steps[this.currentStepIdx] || {};
      const descEl = document.getElementById('adv-step-desc');
      const mathEl = document.getElementById('adv-step-math');
      const stepCounter = document.getElementById('adv-step-counter');
      const statNodes = document.getElementById('adv-stat-nodes-evaluated');
      const statPruned = document.getElementById('adv-stat-nodes-pruned');
      const statAlpha = document.getElementById('adv-stat-active-alpha');
      const statBeta = document.getElementById('adv-stat-active-beta');

      if (descEl) descEl.textContent = step.description || 'Ready to start search.';
      if (mathEl) mathEl.textContent = step.mathNote || '';
      if (stepCounter) stepCounter.textContent = `Step ${this.currentStepIdx + 1} of ${this.steps.length}`;

      if (step.stats) {
        if (statNodes) statNodes.textContent = step.stats.evaluated;
        if (statPruned) statPruned.textContent = step.stats.pruned;
      } else {
        if (statNodes) statNodes.textContent = this.currentStepIdx + 1;
        if (statPruned) statPruned.textContent = '0';
      }

      const aDisplay = step.activeAlpha === -Infinity ? '-∞' : (step.activeAlpha !== null && step.activeAlpha !== undefined ? step.activeAlpha : '-');
      const bDisplay = step.activeBeta === Infinity ? '+∞' : (step.activeBeta !== null && step.activeBeta !== undefined ? step.activeBeta : '-');

      if (statAlpha) statAlpha.textContent = aDisplay;
      if (statBeta) statBeta.textContent = bDisplay;
    }

    // --- CANVAS TREE RENDERING ---
    drawTree() {
      if (!this.ctx || !this.canvas) return;
      const ctx = this.ctx;
      const w = this.canvas.width / (window.devicePixelRatio || 1);
      const h = this.canvas.height / (window.devicePixelRatio || 1);

      ctx.clearRect(0, 0, w, h);

      const currentStep = this.steps[this.currentStepIdx];
      const tree = currentStep ? currentStep.treeState : serializeTreeSimple(this.treeRoot);
      if (!tree) return;

      // Compute tree node coordinates
      const layout = this.computeTreeLayout(tree, w, h);

      // 1. Draw Edges
      this.drawEdges(ctx, layout, currentStep);

      // 2. Draw Nodes
      this.drawNodes(ctx, layout, currentStep);
    }

    computeTreeLayout(root, width, height) {
      const positions = new Map();
      const levels = [];

      function getDepths(node, depth) {
        if (!levels[depth]) levels[depth] = [];
        levels[depth].push(node);
        for (const c of node.children) getDepths(c, depth + 1);
      }
      getDepths(root, 0);

      const maxDepth = levels.length - 1;
      const rowHeight = Math.min((height - 70) / Math.max(maxDepth, 1), 95);
      const startY = 45;

      // Assign X coordinates based on leaf spacing
      let leafCount = 0;
      function countLeaves(node) {
        if (!node.children || node.children.length === 0) {
          node._leafIndex = leafCount++;
          return;
        }
        for (const c of node.children) countLeaves(c);
      }
      countLeaves(root);

      const leafSpacing = width / (leafCount + 1);

      function positionNode(node, depth) {
        const y = startY + depth * rowHeight;
        let x;
        if (!node.children || node.children.length === 0) {
          x = (node._leafIndex + 1) * leafSpacing;
        } else {
          for (const c of node.children) positionNode(c, depth + 1);
          const firstChild = positions.get(node.children[0].id);
          const lastChild = positions.get(node.children[node.children.length - 1].id);
          x = (firstChild.x + lastChild.x) / 2;
        }
        positions.set(node.id, { x, y, node, depth });
      }

      positionNode(root, 0);
      return positions;
    }

    drawEdges(ctx, layout, currentStep) {
      layout.forEach((pos, id) => {
        const { node, x, y } = pos;
        if (!node.children) return;

        for (const child of node.children) {
          const childPos = layout.get(child.id);
          if (!childPos) continue;

          const isPruned = child.pruned;
          const isBest = child.isBestPath;
          const isVisited = child.visited;

          ctx.save();
          ctx.beginPath();
          ctx.moveTo(x, y + 16);
          ctx.lineTo(childPos.x, childPos.y - 16);

          if (isPruned) {
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)';
            ctx.setLineDash([4, 4]);
            ctx.lineWidth = 1.5;
          } else if (isBest) {
            ctx.strokeStyle = '#10b981'; // Emerald Green
            ctx.lineWidth = 3.5;
            ctx.shadowColor = 'rgba(16, 185, 129, 0.4)';
            ctx.shadowBlur = 8;
          } else if (isVisited) {
            ctx.strokeStyle = '#4f46e5'; // Indigo
            ctx.lineWidth = 2;
          } else {
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 1.5;
          }
          ctx.stroke();
          ctx.restore();

          // Action / Prob label along edge
          if (child.action || child.prob !== 1.0) {
            const mx = (x + childPos.x) / 2;
            const my = (y + childPos.y) / 2;
            const edgeText = child.prob !== 1.0 ? `p=${child.prob}` : child.action;

            ctx.save();
            ctx.fillStyle = isPruned ? '#94a3b8' : '#475569';
            ctx.font = '600 11px Outfit, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(edgeText, mx + 12, my);
            ctx.restore();
          }

          // Draw Scissor Cut icon on pruned edge
          if (isPruned && !node.pruned) {
            const mx = (x + childPos.x) / 2;
            const my = (y + childPos.y) / 2;
            this.drawScissorBadge(ctx, mx, my);
          }
        }
      });
    }

    drawScissorBadge(ctx, x, y) {
      ctx.save();
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✂', x, y);
      ctx.restore();
    }

    drawNodes(ctx, layout, currentStep) {
      const activeNodeId = currentStep ? currentStep.currentNodeId : null;

      layout.forEach((pos, id) => {
        const { node, x, y } = pos;
        const isActive = (id === activeNodeId);
        const isPruned = node.pruned;
        const radius = 18;

        ctx.save();

        // Glowing halo for active node
        if (isActive) {
          ctx.beginPath();
          ctx.arc(x, y, radius + 7, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(79, 70, 229, 0.25)';
          ctx.fill();
        }

        // Draw shape based on node type
        if (node.type === 'MAX') {
          // Green upward triangle
          this.drawTriangle(ctx, x, y, radius, true, isActive, isPruned);
        } else if (node.type === 'MIN') {
          // Red downward triangle
          this.drawTriangle(ctx, x, y, radius, false, isActive, isPruned);
        } else if (node.type === 'CHANCE') {
          // Blue circle
          this.drawCircle(ctx, x, y, radius, isActive, isPruned);
        } else {
          // Leaf square
          this.drawSquare(ctx, x, y, radius, isActive, isPruned);
        }

        // Label inside or above node
        ctx.fillStyle = isPruned ? '#94a3b8' : '#ffffff';
        ctx.font = 'bold 11px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Value text inside node
        const valText = node.value !== null && node.value !== undefined ? `${node.value}` : node.label;
        ctx.fillText(valText, x, y);

        // Node ID / Type label tag above node
        ctx.font = '600 10px Outfit, sans-serif';
        ctx.fillStyle = isPruned ? '#94a3b8' : '#334155';
        ctx.fillText(node.label, x, y - radius - 5);

        // Alpha-Beta bounds badge below node (if applicable)
        if (this.currentAlg === 'ALPHABETA' && node.visited && !isPruned) {
          const aStr = node.alpha === -Infinity ? '-∞' : node.alpha;
          const bStr = node.beta === Infinity ? '+∞' : node.beta;
          ctx.fillStyle = '#4f46e5';
          ctx.font = 'bold 9px monospace';
          ctx.fillText(`[${aStr}, ${bStr}]`, x, y + radius + 11);
        }

        // MCTS visit count below node
        if (this.currentAlg === 'MCTS' && node.visits > 0) {
          ctx.fillStyle = '#059669';
          ctx.font = 'bold 9px Outfit, sans-serif';
          ctx.fillText(`N=${node.visits} (${node.wins}w)`, x, y + radius + 11);
        }

        ctx.restore();
      });
    }

    drawTriangle(ctx, x, y, r, isUp, isActive, isPruned) {
      ctx.beginPath();
      const sign = isUp ? -1 : 1;
      ctx.moveTo(x, y + sign * r * 1.1);
      ctx.lineTo(x - r * 1.1, y - sign * r * 0.9);
      ctx.lineTo(x + r * 1.1, y - sign * r * 0.9);
      ctx.closePath();

      if (isPruned) {
        ctx.fillStyle = '#e2e8f0';
        ctx.strokeStyle = '#cbd5e1';
      } else if (isUp) {
        // MAX: Green
        ctx.fillStyle = isActive ? '#059669' : '#10b981';
        ctx.strokeStyle = '#047857';
      } else {
        // MIN: Red/Amber
        ctx.fillStyle = isActive ? '#dc2626' : '#ef4444';
        ctx.strokeStyle = '#b91c1c';
      }
      ctx.lineWidth = isActive ? 2.5 : 1.5;
      ctx.fill();
      ctx.stroke();
    }

    drawCircle(ctx, x, y, r, isActive, isPruned) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      if (isPruned) {
        ctx.fillStyle = '#e2e8f0';
        ctx.strokeStyle = '#cbd5e1';
      } else {
        ctx.fillStyle = isActive ? '#2563eb' : '#3b82f6';
        ctx.strokeStyle = '#1d4ed8';
      }
      ctx.lineWidth = isActive ? 2.5 : 1.5;
      ctx.fill();
      ctx.stroke();
    }

    drawSquare(ctx, x, y, r, isActive, isPruned) {
      ctx.beginPath();
      ctx.roundRect(x - r, y - r, r * 2, r * 2, 4);
      if (isPruned) {
        ctx.fillStyle = '#e2e8f0';
        ctx.strokeStyle = '#cbd5e1';
      } else {
        ctx.fillStyle = isActive ? '#d97706' : '#f59e0b';
        ctx.strokeStyle = '#b45309';
      }
      ctx.lineWidth = isActive ? 2.5 : 1.5;
      ctx.fill();
      ctx.stroke();
    }

    // ==========================================
    // 3. PLAYABLE GAME ARENA CONTROLS & LOGIC
    // ==========================================

    bindArenaControls() {
      // Game Selector tabs
      const gameButtons = document.querySelectorAll('.adv-arena-game-btn');
      gameButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          gameButtons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.arenaGameType = btn.getAttribute('data-game');
          this.resetArenaGame();
        });
      });

      // AI Alg select
      const aiSelect = document.getElementById('adv-arena-ai-select');
      if (aiSelect) {
        aiSelect.addEventListener('change', (e) => {
          this.aiPlayer = e.target.value;
        });
      }

      // Role Select (Human X / Human O)
      const roleSelect = document.getElementById('adv-arena-role-select');
      if (roleSelect) {
        roleSelect.addEventListener('change', (e) => {
          this.humanRole = e.target.value;
          this.resetArenaGame();
        });
      }

      // Reset Match
      const btnResetArena = document.getElementById('btn-adv-arena-reset');
      if (btnResetArena) {
        btnResetArena.addEventListener('click', () => this.resetArenaGame());
      }
    }

    resetArenaGame() {
      this.tttGame.reset();
      this.nimGame.reset();
      this.connectGame.reset();
      this.aiThinking = false;

      this.renderArenaBoard();
      this.updateArenaStats(null);

      // If AI goes first
      if (this.humanRole === 'MIN') {
        this.triggerAIMove();
      }
    }

    renderArenaBoard() {
      const boardContainer = document.getElementById('adv-arena-board-container');
      if (!boardContainer) return;

      if (this.arenaGameType === 'tictactoe') {
        this.renderTicTacToeBoard(boardContainer);
      } else if (this.arenaGameType === 'connect') {
        this.renderConnectBoard(boardContainer);
      } else if (this.arenaGameType === 'nim') {
        this.renderNimBoard(boardContainer);
      }
    }

    // --- TIC-TAC-TOE BOARD ---
    renderTicTacToeBoard(container) {
      const g = this.tttGame;
      let html = `<div class="ttt-grid-wrapper">`;
      html += `<div class="ttt-grid">`;

      for (let i = 0; i < 9; i++) {
        const cellVal = g.board[i];
        const isWinCell = g.winningLine && g.winningLine.includes(i);
        const cellClass = `ttt-cell ${cellVal ? cellVal.toLowerCase() : 'empty'} ${isWinCell ? 'win-cell' : ''}`;
        const symbol = cellVal ? (cellVal === 'X' ? '✕' : '◯') : '';
        html += `<button class="${cellClass}" data-cell="${i}" ${g.isGameOver || cellVal || this.aiThinking ? 'disabled' : ''}>${symbol}</button>`;
      }

      html += `</div>`;

      // Status header
      let statusText = '';
      if (g.isGameOver) {
        if (g.winner === 'DRAW') statusText = '🤝 Game Over — Stalemate Draw!';
        else statusText = `🎉 Player ${g.winner} Wins!`;
      } else {
        const isHumanTurn = (this.humanRole === 'MAX' && g.turn === 'X') || (this.humanRole === 'MIN' && g.turn === 'O');
        statusText = isHumanTurn ? `👉 Your Turn (${g.turn}) — Click a grid cell` : `🤖 AI Thinking (${g.turn})...`;
      }

      html += `<div class="arena-status-banner">${statusText}</div></div>`;
      container.innerHTML = html;

      // Bind cell clicks
      container.querySelectorAll('.ttt-cell.empty').forEach(btn => {
        btn.addEventListener('click', () => {
          const cell = parseInt(btn.getAttribute('data-cell'));
          if (this.tttGame.makeMove(cell)) {
            this.renderArenaBoard();
            if (!this.tttGame.isGameOver) {
              this.triggerAIMove();
            }
          }
        });
      });
    }

    // --- NIM BOARD ---
    renderNimBoard(container) {
      const g = this.nimGame;
      let html = `<div class="nim-game-wrapper">`;
      html += `<div class="nim-pebbles-display">`;

      for (let i = 0; i < g.pebbles; i++) {
        html += `<div class="nim-pebble"><i data-lucide="circle-dot"></i></div>`;
      }
      html += `</div>`;
      html += `<div class="nim-count-badge">${g.pebbles} Pebbles Remaining</div>`;

      // Take buttons (1, 2, 3)
      html += `<div class="nim-actions-row">`;
      for (let take = 1; take <= 3; take++) {
        const canTake = g.pebbles >= take && !g.isGameOver && !this.aiThinking;
        html += `<button class="btn-ctrl btn-ctrl-primary nim-take-btn" data-take="${take}" ${canTake ? '' : 'disabled'}>Take ${take} Pebble${take > 1 ? 's' : ''}</button>`;
      }
      html += `</div>`;

      let statusText = g.isGameOver ? `🏆 ${g.winner} Took the Last Pebble & Won!` : `Turn: ${g.turn}`;
      html += `<div class="arena-status-banner">${statusText}</div></div>`;

      container.innerHTML = html;
      if (typeof lucide !== 'undefined') lucide.createIcons();

      container.querySelectorAll('.nim-take-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const count = parseInt(btn.getAttribute('data-take'));
          if (this.nimGame.take(count)) {
            this.renderArenaBoard();
            if (!this.nimGame.isGameOver) {
              this.triggerAIMove();
            }
          }
        });
      });
    }

    // --- MICRO CONNECT-4 BOARD ---
    renderConnectBoard(container) {
      const g = this.connectGame;
      let html = `<div class="connect-grid-wrapper">`;

      // Column drop buttons
      html += `<div class="connect-drop-row">`;
      for (let c = 0; c < g.cols; c++) {
        const canDrop = g.board[c] === null && !g.isGameOver && !this.aiThinking;
        html += `<button class="connect-drop-btn" data-col="${c}" ${canDrop ? '' : 'disabled'}><i data-lucide="arrow-down"></i></button>`;
      }
      html += `</div>`;

      // Board grid
      html += `<div class="connect-grid" style="grid-template-columns: repeat(${g.cols}, 1fr);">`;
      for (let r = 0; r < g.rows; r++) {
        for (let c = 0; c < g.cols; c++) {
          const idx = r * g.cols + c;
          const piece = g.board[idx];
          const isWin = g.winningCells.includes(idx);
          html += `<div class="connect-cell ${piece ? piece.toLowerCase() : 'empty'} ${isWin ? 'win-cell' : ''}"></div>`;
        }
      }
      html += `</div>`;

      let statusText = g.isGameOver ? (g.winner === 'DRAW' ? '🤝 Draw Game!' : `🎉 ${g.winner} Wins!`) : `Turn: ${g.turn}`;
      html += `<div class="arena-status-banner">${statusText}</div></div>`;

      container.innerHTML = html;
      if (typeof lucide !== 'undefined') lucide.createIcons();

      container.querySelectorAll('.connect-drop-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const col = parseInt(btn.getAttribute('data-col'));
          if (this.connectGame.dropChip(col) !== -1) {
            this.renderArenaBoard();
            if (!this.connectGame.isGameOver) {
              this.triggerAIMove();
            }
          }
        });
      });
    }

    triggerAIMove() {
      this.aiThinking = true;
      this.renderArenaBoard();

      setTimeout(() => {
        let solveResult = null;

        if (this.arenaGameType === 'tictactoe') {
          if (this.aiPlayer === 'MCTS') {
            solveResult = this.tttGame.solveMCTS(200, 1.414);
          } else if (this.aiPlayer === 'RANDOM') {
            const legals = this.tttGame.getLegalMoves();
            solveResult = { bestMove: legals[Math.floor(Math.random() * legals.length)], evaluatedCount: 1, durationMs: 0.1 };
          } else {
            // Minimax or AlphaBeta
            solveResult = this.tttGame.solveBestMove(this.aiPlayer === 'MINIMAX' ? 'MINIMAX' : 'ALPHABETA');
          }

          if (solveResult && solveResult.bestMove !== null) {
            this.tttGame.makeMove(solveResult.bestMove);
          }
        } else if (this.arenaGameType === 'nim') {
          const bestTake = this.nimGame.getBestAIMove();
          solveResult = { bestMove: bestTake, evaluatedCount: 3, durationMs: 0.2 };
          this.nimGame.take(bestTake);
        } else if (this.arenaGameType === 'connect') {
          solveResult = this.connectGame.solveAlphaBeta(4);
          if (solveResult && solveResult.bestCol !== -1) {
            this.connectGame.dropChip(solveResult.bestCol);
          }
        }

        this.aiThinking = false;
        this.renderArenaBoard();
        this.updateArenaStats(solveResult);
      }, 400);
    }

    updateArenaStats(res) {
      const evalCountEl = document.getElementById('adv-arena-stat-evaluated');
      const timeEl = document.getElementById('adv-arena-stat-time');
      const scoreEl = document.getElementById('adv-arena-stat-score');
      const descEl = document.getElementById('adv-arena-mind-desc');

      if (!res) {
        if (evalCountEl) evalCountEl.textContent = '0';
        if (timeEl) timeEl.textContent = '0.0 ms';
        if (scoreEl) scoreEl.textContent = '0';
        if (descEl) descEl.textContent = 'Make your opening move to inspect AI decisions in real time.';
        return;
      }

      if (evalCountEl) evalCountEl.textContent = res.evaluatedCount || '1';
      if (timeEl) timeEl.textContent = `${res.durationMs || 0.5} ms`;
      if (scoreEl) scoreEl.textContent = res.bestScore !== undefined ? res.bestScore : (res.stats ? `${res.stats[0].wins}/${res.stats[0].visits}` : '0');

      if (descEl) {
        if (this.arenaGameType === 'tictactoe') {
          descEl.innerHTML = `AI picked <strong>Cell ${res.bestMove}</strong> after searching <strong>${res.evaluatedCount} game states</strong> with ${this.aiPlayer}. Expected utility outcome = <code>${res.bestScore}</code>.`;
        } else if (this.arenaGameType === 'nim') {
          descEl.innerHTML = `AI applied the Nim Subtraction invariant (leaving a multiple of 4 pebbles), choosing to take <strong>${res.bestMove} pebble(s)</strong>.`;
        } else if (this.arenaGameType === 'connect') {
          descEl.innerHTML = `AI dropped disc into <strong>Column ${res.bestCol + 1}</strong> with heuristic Alpha-Beta valuation <code>${res.bestScore}</code>.`;
        }
      }
    }

    // ==========================================
    // 4. MCTS LIVE SIMULATOR CONTROLS
    // ==========================================

    bindMctsControls() {
      const btnSim1 = document.getElementById('btn-adv-mcts-sim-1');
      const btnSim10 = document.getElementById('btn-adv-mcts-sim-10');
      const btnSim50 = document.getElementById('btn-adv-mcts-sim-50');
      const btnResetMcts = document.getElementById('btn-adv-mcts-reset');
      const cSlider = document.getElementById('adv-mcts-c-slider');
      const cValDisplay = document.getElementById('adv-mcts-c-val');

      if (btnSim1) btnSim1.addEventListener('click', () => this.runMctsSimulations(1));
      if (btnSim10) btnSim10.addEventListener('click', () => this.runMctsSimulations(10));
      if (btnSim50) btnSim50.addEventListener('click', () => this.runMctsSimulations(50));
      if (btnResetMcts) btnResetMcts.addEventListener('click', () => this.resetMctsLab());

      if (cSlider) {
        cSlider.addEventListener('input', (e) => {
          this.mctsCParam = parseFloat(e.target.value);
          if (cValDisplay) cValDisplay.textContent = this.mctsCParam.toFixed(2);
          this.renderMctsLab();
        });
      }

      this.resetMctsLab();
    }

    resetMctsLab() {
      this.mctsSimCount = 0;
      this.mctsTotalWins = 0;
      this.mctsTreeRoot = {
        label: 'Root',
        visits: 0,
        wins: 0,
        children: [
          { action: 'Move A (Left)', visits: 0, wins: 0, rolloutWinProb: 0.70 },
          { action: 'Move B (Center)', visits: 0, wins: 0, rolloutWinProb: 0.50 },
          { action: 'Move C (Right)', visits: 0, wins: 0, rolloutWinProb: 0.30 }
        ]
      };
      this.renderMctsLab();
    }

    runMctsSimulations(count) {
      for (let k = 0; k < count; k++) {
        this.mctsSimCount++;
        const root = this.mctsTreeRoot;
        root.visits++;

        // Select child via UCB1 or unvisited
        let selectedChild = null;
        const unvisited = root.children.filter(c => c.visits === 0);
        if (unvisited.length > 0) {
          selectedChild = unvisited[0];
        } else {
          let bestUcb = -Infinity;
          const lnN = Math.log(root.visits);
          for (const c of root.children) {
            const exploit = c.wins / c.visits;
            const explore = this.mctsCParam * Math.sqrt(lnN / c.visits);
            const ucb = exploit + explore;
            if (ucb > bestUcb) {
              bestUcb = ucb;
              selectedChild = c;
            }
          }
        }

        // Simulate
        const isWin = Math.random() < selectedChild.rolloutWinProb ? 1 : 0;
        selectedChild.visits++;
        selectedChild.wins += isWin;
        root.wins += isWin;
      }
      this.renderMctsLab();
    }

    renderMctsLab() {
      const container = document.getElementById('adv-mcts-cards-container');
      const rootVisitsEl = document.getElementById('adv-mcts-root-visits');
      const rootWinsEl = document.getElementById('adv-mcts-root-wins');

      if (rootVisitsEl) rootVisitsEl.textContent = this.mctsTreeRoot.visits;
      if (rootWinsEl) rootWinsEl.textContent = this.mctsTreeRoot.wins;

      if (!container) return;

      const root = this.mctsTreeRoot;
      const lnN = root.visits > 0 ? Math.log(root.visits) : 0;

      let html = '';
      root.children.forEach((child, idx) => {
        const winRate = child.visits > 0 ? (child.wins / child.visits).toFixed(3) : '0.000';
        const exploreBonus = (child.visits > 0 && root.visits > 0) 
          ? (this.mctsCParam * Math.sqrt(lnN / child.visits)).toFixed(3) 
          : '∞ (Unvisited)';
        const ucb1Score = child.visits > 0 
          ? (parseFloat(winRate) + parseFloat(exploreBonus)).toFixed(3) 
          : '∞';

        html += `
          <div class="mcts-branch-card glass-panel">
            <div class="mcts-branch-header">
              <span class="mcts-branch-title">${child.action}</span>
              <span class="vaccum-pill ${child.visits > 0 ? 'success' : 'neutral'}">N = ${child.visits}</span>
            </div>
            <div class="mcts-formula-breakdown">
              <div class="mcts-term">
                <span class="term-label">Exploitation (Win Rate):</span>
                <span class="term-val">${child.wins} / ${child.visits} = <strong>${winRate}</strong></span>
              </div>
              <div class="mcts-term">
                <span class="term-label">Exploration Bonus (C·√(ln N / n)):</span>
                <span class="term-val">${this.mctsCParam.toFixed(2)} · √(${lnN.toFixed(2)}/${child.visits || 1}) = <strong>${exploreBonus}</strong></span>
              </div>
              <div class="mcts-term ucb-total">
                <span class="term-label">Total UCB1 Score:</span>
                <span class="term-val" style="color: var(--accent); font-weight: 700;">${ucb1Score}</span>
              </div>
            </div>
            <div class="mcts-progress-bar-bg">
              <div class="mcts-progress-bar-fill" style="width: ${Math.min(parseFloat(winRate) * 100, 100)}%;"></div>
            </div>
          </div>
        `;
      });

      container.innerHTML = html;
    }

    // ==========================================
    // 5. MOVE ORDERING BENCHMARK
    // ==========================================

    bindBenchmarkControls() {
      const btnRunBench = document.getElementById('btn-adv-run-benchmark');
      const depthSlider = document.getElementById('adv-bench-depth-slider');
      const depthValDisplay = document.getElementById('adv-bench-depth-val');

      if (btnRunBench) btnRunBench.addEventListener('click', () => this.runBenchmark());
      if (depthSlider) {
        depthSlider.addEventListener('input', (e) => {
          if (depthValDisplay) depthValDisplay.textContent = e.target.value;
          this.runBenchmark();
        });
      }
    }

    runBenchmark() {
      const depthSlider = document.getElementById('adv-bench-depth-slider');
      const depth = depthSlider ? parseInt(depthSlider.value) : 6;
      const b = 4; // Branching factor 4

      // Theoretical node evaluations:
      // Minimax: b^d
      const minimaxNodes = Math.pow(b, depth);
      // AlphaBeta Best: b^(d/2)
      const bestNodes = Math.round(Math.pow(b, depth / 2));
      // AlphaBeta Random: b^(0.75 * d)
      const randomNodes = Math.round(Math.pow(b, 0.75 * depth));
      // AlphaBeta Worst: b^d
      const worstNodes = minimaxNodes;

      const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val.toLocaleString();
      };

      setVal('adv-bench-minimax-nodes', minimaxNodes);
      setVal('adv-bench-best-nodes', bestNodes);
      setVal('adv-bench-random-nodes', randomNodes);
      setVal('adv-bench-worst-nodes', worstNodes);

      const speedup = (minimaxNodes / bestNodes).toFixed(1);
      const speedupEl = document.getElementById('adv-bench-speedup-factor');
      if (speedupEl) speedupEl.textContent = `${speedup}× Faster`;
    }
  }

  function serializeTreeSimple(node) {
    if (!node) return null;
    return {
      id: node.id,
      label: node.label,
      type: node.type,
      value: node.value,
      prob: node.prob,
      alpha: node.alpha,
      beta: node.beta,
      pruned: node.pruned,
      visited: node.visited,
      isBestPath: node.isBestPath,
      depth: node.depth,
      action: node.action,
      visits: node.visits,
      wins: node.wins,
      ucb1: node.ucb1,
      children: (node.children || []).map(c => serializeTreeSimple(c))
    };
  }

  // Initialize on DOM load
  document.addEventListener('DOMContentLoaded', () => {
    window.adversarialLab = new AdversarialLabUI();
  });

})();
