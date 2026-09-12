/**
 * Adversarial Search & Games Engine
 * 
 * Provides:
 * 1. Tree-based game search algorithms (Minimax, Alpha-Beta Pruning, Expectiminimax, MCTS)
 *    with complete step-by-step event tracing for interactive visualization.
 * 2. Playable Game logic for Tic-Tac-Toe, Micro Connect-4, and Nim with pluggable AI agents.
 * 3. Move ordering generators and pruning benchmark metrics.
 */

(function () {
  'use strict';

  // ==========================================
  // 1. GAME TREE DATA STRUCTURES & PRESETS
  // ==========================================

  class TreeNode {
    constructor(config) {
      this.id = config.id || ('node_' + Math.random().toString(36).substr(2, 9));
      this.label = config.label || '';
      this.type = config.type || 'MAX'; // 'MAX', 'MIN', 'CHANCE', 'LEAF'
      this.value = config.value !== undefined ? config.value : null;
      this.initialValue = this.value;
      this.prob = config.prob !== undefined ? config.prob : 1.0; // For chance branches
      this.alpha = config.alpha !== undefined ? config.alpha : -Infinity;
      this.beta = config.beta !== undefined ? config.beta : Infinity;
      this.children = [];
      this.parent = null;
      this.depth = config.depth || 0;
      this.action = config.action || '';
      this.pruned = false;
      this.visited = false;
      this.isBestPath = false;
      this.customData = config.customData || {};
      
      // MCTS stats
      this.visits = config.visits || 0;
      this.wins = config.wins || 0;
      this.ucb1 = 0;
    }

    addChild(childNode) {
      childNode.parent = this;
      childNode.depth = this.depth + 1;
      this.children.push(childNode);
      return childNode;
    }

    clone() {
      const cloned = new TreeNode({
        id: this.id,
        label: this.label,
        type: this.type,
        value: this.initialValue,
        prob: this.prob,
        alpha: -Infinity,
        beta: Infinity,
        depth: this.depth,
        action: this.action,
        customData: { ...this.customData }
      });
      for (const child of this.children) {
        cloned.addChild(child.clone());
      }
      return cloned;
    }
  }

  // --- TREE PRESETS ---

  function createAimaFig52Tree() {
    // AIMA 4th ed. Figure 5.2: 2-ply Minimax game tree
    const root = new TreeNode({ id: 'A', label: 'A', type: 'MAX', depth: 0 });
    const b = root.addChild(new TreeNode({ id: 'B', label: 'B', type: 'MIN', action: 'a₁' }));
    const c = root.addChild(new TreeNode({ id: 'C', label: 'C', type: 'MIN', action: 'a₂' }));
    const d = root.addChild(new TreeNode({ id: 'D', label: 'D', type: 'MIN', action: 'a₃' }));

    b.addChild(new TreeNode({ id: 'B1', label: 'B1', type: 'LEAF', value: 3, action: 'b₁' }));
    b.addChild(new TreeNode({ id: 'B2', label: 'B2', type: 'LEAF', value: 12, action: 'b₂' }));
    b.addChild(new TreeNode({ id: 'B3', label: 'B3', type: 'LEAF', value: 8, action: 'b₃' }));

    c.addChild(new TreeNode({ id: 'C1', label: 'C1', type: 'LEAF', value: 2, action: 'c₁' }));
    c.addChild(new TreeNode({ id: 'C2', label: 'C2', type: 'LEAF', value: 4, action: 'c₂' }));
    c.addChild(new TreeNode({ id: 'C3', label: 'C3', type: 'LEAF', value: 6, action: 'c₃' }));

    d.addChild(new TreeNode({ id: 'D1', label: 'D1', type: 'LEAF', value: 14, action: 'd₁' }));
    d.addChild(new TreeNode({ id: 'D2', label: 'D2', type: 'LEAF', value: 5, action: 'd₂' }));
    d.addChild(new TreeNode({ id: 'D3', label: 'D3', type: 'LEAF', value: 2, action: 'd₃' }));

    return root;
  }

  function createAimaFig57Tree() {
    // AIMA 4th ed. Figure 5.7: Alpha-Beta Pruning example
    return createAimaFig52Tree(); // Same tree, demonstrates C3 and D2, D3 pruning!
  }

  function createDeep3PlyTree() {
    // 3-ply binary tree for deeper search
    const root = new TreeNode({ id: 'R', label: 'Root', type: 'MAX', depth: 0 });
    
    const b1 = root.addChild(new TreeNode({ id: 'B1', label: 'B1', type: 'MIN', action: 'Left' }));
    const b2 = root.addChild(new TreeNode({ id: 'B2', label: 'B2', type: 'MIN', action: 'Right' }));

    const c1 = b1.addChild(new TreeNode({ id: 'C1', label: 'C1', type: 'MAX', action: 'L' }));
    const c2 = b1.addChild(new TreeNode({ id: 'C2', label: 'C2', type: 'MAX', action: 'R' }));
    const c3 = b2.addChild(new TreeNode({ id: 'C3', label: 'C3', type: 'MAX', action: 'L' }));
    const c4 = b2.addChild(new TreeNode({ id: 'C4', label: 'C4', type: 'MAX', action: 'R' }));

    c1.addChild(new TreeNode({ id: 'L1', label: 'L1', type: 'LEAF', value: 4 }));
    c1.addChild(new TreeNode({ id: 'L2', label: 'L2', type: 'LEAF', value: 7 }));
    c2.addChild(new TreeNode({ id: 'L3', label: 'L3', type: 'LEAF', value: 2 }));
    c2.addChild(new TreeNode({ id: 'L4', label: 'L4', type: 'LEAF', value: 8 }));

    c3.addChild(new TreeNode({ id: 'L5', label: 'L5', type: 'LEAF', value: 1 }));
    c3.addChild(new TreeNode({ id: 'L6', label: 'L6', type: 'LEAF', value: 5 }));
    c4.addChild(new TreeNode({ id: 'L7', label: 'L7', type: 'LEAF', value: 3 }));
    c4.addChild(new TreeNode({ id: 'L8', label: 'L8', type: 'LEAF', value: 6 }));

    return root;
  }

  function createChanceTree() {
    // 3-tier Expectiminimax tree with chance nodes and dice/coin probabilities
    const root = new TreeNode({ id: 'A', label: 'MAX Root', type: 'MAX', depth: 0 });
    
    const c1 = root.addChild(new TreeNode({ id: 'CH1', label: 'Coin Flip', type: 'CHANCE', action: 'Action A' }));
    const c2 = root.addChild(new TreeNode({ id: 'CH2', label: '4-Sided Die', type: 'CHANCE', action: 'Action B' }));

    c1.addChild(new TreeNode({ id: 'L1', label: 'Heads (0.5)', type: 'LEAF', value: 10, prob: 0.5 }));
    c1.addChild(new TreeNode({ id: 'L2', label: 'Tails (0.5)', type: 'LEAF', value: -4, prob: 0.5 }));

    c2.addChild(new TreeNode({ id: 'L3', label: 'Roll 1 (0.25)', type: 'LEAF', value: 20, prob: 0.25 }));
    c2.addChild(new TreeNode({ id: 'L4', label: 'Roll 2 (0.25)', type: 'LEAF', value: -10, prob: 0.25 }));
    c2.addChild(new TreeNode({ id: 'L5', label: 'Roll 3 (0.25)', type: 'LEAF', value: 4, prob: 0.25 }));
    c2.addChild(new TreeNode({ id: 'L6', label: 'Roll 4 (0.25)', type: 'LEAF', value: 0, prob: 0.25 }));

    return root;
  }

  function createCustomTree() {
    const root = new TreeNode({ id: 'Root', label: 'Root (MAX)', type: 'MAX', depth: 0 });
    const n1 = root.addChild(new TreeNode({ id: 'N1', label: 'N1 (MIN)', type: 'MIN', action: 'Left' }));
    const n2 = root.addChild(new TreeNode({ id: 'N2', label: 'N2 (MIN)', type: 'MIN', action: 'Right' }));

    n1.addChild(new TreeNode({ id: 'L1', label: 'L1', type: 'LEAF', value: 5, action: 'a' }));
    n1.addChild(new TreeNode({ id: 'L2', label: 'L2', type: 'LEAF', value: 9, action: 'b' }));
    n2.addChild(new TreeNode({ id: 'L3', label: 'L3', type: 'LEAF', value: 3, action: 'c' }));
    n2.addChild(new TreeNode({ id: 'L4', label: 'L4', type: 'LEAF', value: 8, action: 'd' }));

    return root;
  }

  // ==========================================
  // 2. STEP TRACE ALGORITHMS FOR VISUALIZER
  // ==========================================

  function generateMinimaxSteps(rootNode) {
    const root = rootNode.clone();
    const steps = [];
    let stepCount = 0;

    function snapshot(nodeId, actionType, desc, mathNote, highlights = {}) {
      steps.push({
        stepIndex: stepCount++,
        currentNodeId: nodeId,
        actionType: actionType, // 'ENTER', 'EVAL_LEAF', 'UPDATE', 'RETURN', 'DONE'
        description: desc,
        mathNote: mathNote || '',
        activeAlpha: null,
        activeBeta: null,
        treeState: JSON.parse(JSON.stringify(serializeTree(root))),
        highlights: highlights
      });
    }

    function minimax(node) {
      node.visited = true;
      snapshot(node.id, 'ENTER', `Exploring node ${node.label} (${node.type})`, `Player: ${node.type}`);

      if (node.type === 'LEAF' || node.children.length === 0) {
        snapshot(node.id, 'EVAL_LEAF', `Leaf node ${node.label} evaluated: Utility = ${node.value}`, `UTILITY(${node.label}) = ${node.value}`);
        return node.value;
      }

      if (node.type === 'MAX') {
        let maxVal = -Infinity;
        let bestChild = null;

        for (let i = 0; i < node.children.length; i++) {
          const child = node.children[i];
          const val = minimax(child);
          if (val > maxVal) {
            maxVal = val;
            bestChild = child;
          }
          node.value = maxVal;
          snapshot(node.id, 'UPDATE', `MAX node ${node.label} updates value to max(${maxVal}) after child ${child.label} (${val})`, `v = max(v, ${val}) = ${maxVal}`);
        }

        if (bestChild) {
          bestChild.isBestPath = true;
        }
        snapshot(node.id, 'RETURN', `MAX node ${node.label} finalized value = ${maxVal}`, `MINIMAX(${node.label}) = ${maxVal}`);
        return maxVal;
      } else if (node.type === 'MIN') {
        let minVal = Infinity;
        let bestChild = null;

        for (let i = 0; i < node.children.length; i++) {
          const child = node.children[i];
          const val = minimax(child);
          if (val < minVal) {
            minVal = val;
            bestChild = child;
          }
          node.value = minVal;
          snapshot(node.id, 'UPDATE', `MIN node ${node.label} updates value to min(${minVal}) after child ${child.label} (${val})`, `v = min(v, ${val}) = ${minVal}`);
        }

        if (bestChild) {
          bestChild.isBestPath = true;
        }
        snapshot(node.id, 'RETURN', `MIN node ${node.label} finalized value = ${minVal}`, `MINIMAX(${node.label}) = ${minVal}`);
        return minVal;
      }
    }

    const finalVal = minimax(root);
    root.value = finalVal;
    snapshot(root.id, 'DONE', `Minimax Search complete! Optimal value at root ${root.label} = ${finalVal}`, `Optimal Value = ${finalVal}`);

    return steps;
  }

  function generateAlphaBetaSteps(rootNode) {
    const root = rootNode.clone();
    const steps = [];
    let stepCount = 0;
    let totalEvaluated = 0;
    let totalPruned = 0;

    function snapshot(nodeId, actionType, desc, mathNote, highlights = {}) {
      steps.push({
        stepIndex: stepCount++,
        currentNodeId: nodeId,
        actionType: actionType, // 'ENTER', 'EVAL_LEAF', 'UPDATE_BOUND', 'PRUNE', 'RETURN', 'DONE'
        description: desc,
        mathNote: mathNote || '',
        activeAlpha: highlights.alpha !== undefined ? highlights.alpha : null,
        activeBeta: highlights.beta !== undefined ? highlights.beta : null,
        treeState: JSON.parse(JSON.stringify(serializeTree(root))),
        highlights: highlights,
        stats: { evaluated: totalEvaluated, pruned: totalPruned }
      });
    }

    function markPrunedSubtree(node) {
      node.pruned = true;
      totalPruned++;
      for (const child of node.children) {
        markPrunedSubtree(child);
      }
    }

    function alphaBeta(node, alpha, beta) {
      node.visited = true;
      node.alpha = alpha;
      node.beta = beta;
      totalEvaluated++;

      const aStr = alpha === -Infinity ? '-∞' : alpha;
      const bStr = beta === Infinity ? '+∞' : beta;

      snapshot(node.id, 'ENTER', `Exploring node ${node.label} (${node.type}) with window [α=${aStr}, β=${bStr}]`, `Window: [${aStr}, ${bStr}]`, { alpha, beta });

      if (node.type === 'LEAF' || node.children.length === 0) {
        snapshot(node.id, 'EVAL_LEAF', `Leaf ${node.label} evaluated: Utility = ${node.value}`, `UTILITY(${node.label}) = ${node.value}`, { alpha, beta });
        return node.value;
      }

      if (node.type === 'MAX') {
        let v = -Infinity;
        let bestChild = null;

        for (let i = 0; i < node.children.length; i++) {
          const child = node.children[i];
          const childVal = alphaBeta(child, alpha, beta);
          
          if (childVal > v) {
            v = childVal;
            bestChild = child;
          }
          node.value = v;

          const oldAlpha = alpha;
          alpha = Math.max(alpha, v);
          node.alpha = alpha;

          const aDisplay = alpha === -Infinity ? '-∞' : alpha;
          const bDisplay = beta === Infinity ? '+∞' : beta;

          if (alpha > oldAlpha) {
            snapshot(node.id, 'UPDATE_BOUND', `MAX node ${node.label} raises α to ${aDisplay} (v=${v})`, `α = max(α, ${v}) = ${aDisplay}`, { alpha, beta });
          }

          // Prune check: alpha >= beta
          if (alpha >= beta) {
            const prunedNodes = [];
            for (let j = i + 1; j < node.children.length; j++) {
              markPrunedSubtree(node.children[j]);
              prunedNodes.push(node.children[j].label);
            }
            const pruneDesc = prunedNodes.length > 0 
              ? `PRUNE TRIGGERED at ${node.label}! α (${aDisplay}) ≥ β (${bDisplay}). Subtrees [${prunedNodes.join(', ')}] pruned!`
              : `PRUNE CUTOFF at ${node.label}! α (${aDisplay}) ≥ β (${bDisplay}).`;
            snapshot(node.id, 'PRUNE', pruneDesc, `α (${aDisplay}) ≥ β (${bDisplay}) ⟹ PRUNE remaining branches`, { alpha, beta, pruned: true });
            break;
          }
        }

        if (bestChild) bestChild.isBestPath = true;
        snapshot(node.id, 'RETURN', `MAX node ${node.label} returns v = ${v} with α = ${alpha === -Infinity ? '-∞' : alpha}`, `Return v = ${v}`, { alpha, beta });
        return v;
      } else if (node.type === 'MIN') {
        let v = Infinity;
        let bestChild = null;

        for (let i = 0; i < node.children.length; i++) {
          const child = node.children[i];
          const childVal = alphaBeta(child, alpha, beta);
          
          if (childVal < v) {
            v = childVal;
            bestChild = child;
          }
          node.value = v;

          const oldBeta = beta;
          beta = Math.min(beta, v);
          node.beta = beta;

          const aDisplay = alpha === -Infinity ? '-∞' : alpha;
          const bDisplay = beta === Infinity ? '+∞' : beta;

          if (beta < oldBeta) {
            snapshot(node.id, 'UPDATE_BOUND', `MIN node ${node.label} lowers β to ${bDisplay} (v=${v})`, `β = min(β, ${v}) = ${bDisplay}`, { alpha, beta });
          }

          // Prune check: beta <= alpha (or alpha >= beta)
          if (beta <= alpha) {
            const prunedNodes = [];
            for (let j = i + 1; j < node.children.length; j++) {
              markPrunedSubtree(node.children[j]);
              prunedNodes.push(node.children[j].label);
            }
            const pruneDesc = prunedNodes.length > 0
              ? `PRUNE TRIGGERED at ${node.label}! β (${bDisplay}) ≤ α (${aDisplay}). Subtrees [${prunedNodes.join(', ')}] pruned!`
              : `PRUNE CUTOFF at ${node.label}! β (${bDisplay}) ≤ α (${aDisplay}).`;
            snapshot(node.id, 'PRUNE', pruneDesc, `β (${bDisplay}) ≤ α (${aDisplay}) ⟹ PRUNE remaining branches`, { alpha, beta, pruned: true });
            break;
          }
        }

        if (bestChild) bestChild.isBestPath = true;
        snapshot(node.id, 'RETURN', `MIN node ${node.label} returns v = ${v} with β = ${beta === Infinity ? '+∞' : beta}`, `Return v = ${v}`, { alpha, beta });
        return v;
      }
    }

    const finalVal = alphaBeta(root, -Infinity, Infinity);
    root.value = finalVal;
    snapshot(root.id, 'DONE', `Alpha-Beta Pruning complete! Optimal value at root = ${finalVal}. Saved ${totalPruned} node evaluations!`, `Optimal Value = ${finalVal} · Pruned: ${totalPruned} nodes`);

    return steps;
  }

  function generateExpectiminimaxSteps(rootNode) {
    const root = rootNode.clone();
    const steps = [];
    let stepCount = 0;

    function snapshot(nodeId, actionType, desc, mathNote) {
      steps.push({
        stepIndex: stepCount++,
        currentNodeId: nodeId,
        actionType: actionType,
        description: desc,
        mathNote: mathNote || '',
        treeState: JSON.parse(JSON.stringify(serializeTree(root)))
      });
    }

    function expectiminimax(node) {
      node.visited = true;
      snapshot(node.id, 'ENTER', `Visiting ${node.label} (${node.type})`, `Node Type: ${node.type}`);

      if (node.type === 'LEAF' || node.children.length === 0) {
        snapshot(node.id, 'EVAL_LEAF', `Outcome leaf ${node.label} = ${node.value}`, `Payoff: ${node.value}`);
        return node.value;
      }

      if (node.type === 'CHANCE') {
        let expectedVal = 0;
        const terms = [];

        for (const child of node.children) {
          const val = expectiminimax(child);
          const p = child.prob || (1 / node.children.length);
          expectedVal += p * val;
          terms.push(`${p} × ${val}`);
        }
        
        expectedVal = Math.round(expectedVal * 100) / 100;
        node.value = expectedVal;
        snapshot(node.id, 'UPDATE', `Chance node ${node.label} calculated Expected Value = ${expectedVal}`, `E[V] = ∑ P(s')·V(s') = ${terms.join(' + ')} = ${expectedVal}`);
        return expectedVal;
      } else if (node.type === 'MAX') {
        let maxVal = -Infinity;
        let bestChild = null;

        for (const child of node.children) {
          const val = expectiminimax(child);
          if (val > maxVal) {
            maxVal = val;
            bestChild = child;
          }
        }
        node.value = maxVal;
        if (bestChild) bestChild.isBestPath = true;
        snapshot(node.id, 'RETURN', `MAX node ${node.label} chooses highest expectation branch = ${maxVal}`, `max(EV) = ${maxVal}`);
        return maxVal;
      } else if (node.type === 'MIN') {
        let minVal = Infinity;
        for (const child of node.children) {
          const val = expectiminimax(child);
          if (val < minVal) minVal = val;
        }
        node.value = minVal;
        snapshot(node.id, 'RETURN', `MIN node ${node.label} chooses lowest expectation branch = ${minVal}`, `min(EV) = ${minVal}`);
        return minVal;
      }
    }

    const finalVal = expectiminimax(root);
    root.value = finalVal;
    snapshot(root.id, 'DONE', `Expectiminimax calculation complete! Optimal expected utility = ${finalVal}`, `Decision EV = ${finalVal}`);
    return steps;
  }

  function generateMCTSSteps(rootNode, numRollouts = 5, cExploration = 1.414) {
    const root = rootNode.clone();
    const steps = [];
    let stepCount = 0;

    // Reset visit counts for visualizer
    function resetMcts(node) {
      node.visits = 0;
      node.wins = 0;
      node.ucb1 = 0;
      node.visited = false;
      for (const child of node.children) resetMcts(child);
    }
    resetMcts(root);

    function snapshot(nodeId, actionType, desc, mathNote, highlights = {}) {
      steps.push({
        stepIndex: stepCount++,
        currentNodeId: nodeId,
        actionType: actionType, // 'SELECT', 'EXPAND', 'SIMULATE', 'BACKPROP'
        description: desc,
        mathNote: mathNote || '',
        treeState: JSON.parse(JSON.stringify(serializeTree(root))),
        highlights: highlights
      });
    }

    for (let sim = 1; sim <= numRollouts; sim++) {
      // 1. SELECTION
      let curr = root;
      curr.visited = true;
      const path = [curr];

      snapshot(curr.id, 'SELECT', `[Playout #${sim}] Phase 1: Selection starting at root ${curr.label}`, `Root Visits N = ${curr.visits}`);

      while (curr.children.length > 0) {
        // Check if any child is unvisited
        const unvisited = curr.children.filter(c => c.visits === 0);
        if (unvisited.length > 0) {
          // Select first unvisited child
          curr = unvisited[0];
          curr.visited = true;
          path.push(curr);
          snapshot(curr.id, 'EXPAND', `[Playout #${sim}] Phase 2: Expansion — selected unvisited child ${curr.label}`, `First visit to node ${curr.label}`);
          break;
        } else {
          // Calculate UCB1 for all children
          let bestScore = -Infinity;
          let bestChild = null;
          const lnN = Math.log(curr.visits);

          for (const child of curr.children) {
            const exploit = child.wins / child.visits;
            const explore = cExploration * Math.sqrt(lnN / child.visits);
            child.ucb1 = Math.round((exploit + explore) * 1000) / 1000;

            if (child.ucb1 > bestScore) {
              bestScore = child.ucb1;
              bestChild = child;
            }
          }

          curr = bestChild;
          curr.visited = true;
          path.push(curr);
          snapshot(curr.id, 'SELECT', `[Playout #${sim}] Selection: chose ${curr.label} with max UCB1 = ${curr.ucb1}`, `UCB1 = (${(curr.wins/curr.visits).toFixed(2)}) + ${cExploration.toFixed(2)}·√(${lnN.toFixed(2)}/${curr.visits}) = ${curr.ucb1}`);
        }
      }

      // 2. SIMULATION (Rollout)
      // Pick a random leaf under curr or evaluate curr
      let rolloutOutcome = 0;
      if (curr.type === 'LEAF') {
        rolloutOutcome = curr.value > 0 ? 1 : (curr.value === 0 ? 0.5 : 0);
      } else {
        // Simulate random playout outcome (0 or 1 win)
        rolloutOutcome = Math.random() > 0.4 ? 1 : 0;
      }

      snapshot(curr.id, 'SIMULATE', `[Playout #${sim}] Phase 3: Playout Simulation from ${curr.label} ⟹ Result: ${rolloutOutcome === 1 ? 'WIN (+1)' : 'LOSS (0)'}`, `Rollout result = ${rolloutOutcome}`);

      // 3. BACKPROPAGATION
      for (let i = path.length - 1; i >= 0; i--) {
        const node = path[i];
        node.visits += 1;
        node.wins += rolloutOutcome;
        node.value = Math.round((node.wins / node.visits) * 100) / 100;

        snapshot(node.id, 'BACKPROP', `[Playout #${sim}] Phase 4: Backpropagated to ${node.label} (Visits: ${node.visits}, Wins: ${node.wins}, Win Rate: ${(node.wins/node.visits).toFixed(2)})`, `N ← ${node.visits}, U ← ${node.wins}`);
      }
    }

    // Final decision: select child with highest visit count
    let mostVisited = null;
    let maxVisits = -1;
    for (const child of root.children) {
      if (child.visits > maxVisits) {
        maxVisits = child.visits;
        mostVisited = child;
      }
    }
    if (mostVisited) mostVisited.isBestPath = true;

    snapshot(root.id, 'DONE', `MCTS Simulations complete! Action '${mostVisited ? mostVisited.action || mostVisited.label : 'None'}' chosen with highest visit count (N=${maxVisits}).`, `arg max N(child) = ${mostVisited ? mostVisited.label : 'None'}`);

    return steps;
  }

  function serializeTree(node) {
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
      children: node.children.map(c => serializeTree(c))
    };
  }

  // ==========================================
  // 3. PLAYABLE GAMES ENGINES
  // ==========================================

  // --- TIC-TAC-TOE (3x3) ---
  class TicTacToeGame {
    constructor() {
      this.board = Array(9).fill(null); // 0..8
      this.turn = 'X'; // 'X' is MAX (+1), 'O' is MIN (-1)
      this.winner = null;
      this.winningLine = null;
      this.isGameOver = false;
      this.moveHistory = [];
    }

    reset() {
      this.board = Array(9).fill(null);
      this.turn = 'X';
      this.winner = null;
      this.winningLine = null;
      this.isGameOver = false;
      this.moveHistory = [];
    }

    getLegalMoves(board = this.board) {
      const moves = [];
      for (let i = 0; i < 9; i++) {
        if (board[i] === null) moves.push(i);
      }
      return moves;
    }

    makeMove(idx) {
      if (this.isGameOver || this.board[idx] !== null) return false;
      this.board[idx] = this.turn;
      this.moveHistory.push({ player: this.turn, cell: idx });
      
      const check = this.checkWin(this.board);
      if (check.winner) {
        this.winner = check.winner;
        this.winningLine = check.line;
        this.isGameOver = true;
      } else if (this.getLegalMoves().length === 0) {
        this.winner = 'DRAW';
        this.isGameOver = true;
      } else {
        this.turn = this.turn === 'X' ? 'O' : 'X';
      }
      return true;
    }

    checkWin(board) {
      const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
        [0, 4, 8], [2, 4, 6]             // Diagonals
      ];
      for (const line of lines) {
        const [a, b, c] = line;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
          return { winner: board[a], line: line };
        }
      }
      return { winner: null, line: null };
    }

    // Minimax / Alpha-Beta Solver with statistics
    solveBestMove(algorithm = 'ALPHABETA', maxDepth = 9) {
      const startTime = performance.now();
      let evaluatedCount = 0;
      let prunedCount = 0;
      const isMax = this.turn === 'X';

      const memo = new Map();

      function minimax(board, depth, isMaximizing, alpha, beta) {
        evaluatedCount++;
        const key = board.join('') + '_' + isMaximizing;
        if (algorithm === 'MEMO' && memo.has(key)) {
          return memo.get(key);
        }

        const winCheck = TicTacToeGame.prototype.checkWin(board);
        if (winCheck.winner === 'X') return 10 - depth;
        if (winCheck.winner === 'O') return depth - 10;
        
        const legal = [];
        for (let i = 0; i < 9; i++) {
          if (board[i] === null) legal.push(i);
        }
        if (legal.length === 0 || depth >= maxDepth) {
          return 0; // Draw or heuristic cutoff
        }

        if (isMaximizing) {
          let maxEval = -Infinity;
          for (const move of legal) {
            board[move] = 'X';
            const evalVal = minimax(board, depth + 1, false, alpha, beta);
            board[move] = null;
            maxEval = Math.max(maxEval, evalVal);
            if (algorithm === 'ALPHABETA') {
              alpha = Math.max(alpha, evalVal);
              if (beta <= alpha) {
                prunedCount += (legal.length - 1 - legal.indexOf(move));
                break;
              }
            }
          }
          if (algorithm === 'MEMO') memo.set(key, maxEval);
          return maxEval;
        } else {
          let minEval = Infinity;
          for (const move of legal) {
            board[move] = 'O';
            const evalVal = minimax(board, depth + 1, true, alpha, beta);
            board[move] = null;
            minEval = Math.min(minEval, evalVal);
            if (algorithm === 'ALPHABETA') {
              beta = Math.min(beta, evalVal);
              if (beta <= alpha) {
                prunedCount += (legal.length - 1 - legal.indexOf(move));
                break;
              }
            }
          }
          if (algorithm === 'MEMO') memo.set(key, minEval);
          return minEval;
        }
      }

      const legalMoves = this.getLegalMoves();
      let bestMove = legalMoves[0];
      let bestScore = isMax ? -Infinity : Infinity;
      const moveScores = [];

      for (const move of legalMoves) {
        this.board[move] = this.turn;
        const score = minimax(this.board, 1, !isMax, -Infinity, Infinity);
        this.board[move] = null;

        moveScores.push({ move, score });

        if (isMax) {
          if (score > bestScore) {
            bestScore = score;
            bestMove = move;
          }
        } else {
          if (score < bestScore) {
            bestScore = score;
            bestMove = move;
          }
        }
      }

      const durationMs = performance.now() - startTime;

      return {
        bestMove,
        bestScore,
        evaluatedCount,
        prunedCount,
        durationMs: Math.round(durationMs * 100) / 100,
        moveScores
      };
    }

    // MCTS Solver for Tic-Tac-Toe
    solveMCTS(rollouts = 200, cExploration = 1.414) {
      const startTime = performance.now();
      const legalMoves = this.getLegalMoves();
      if (legalMoves.length === 0) return { bestMove: null };

      const myTurn = this.turn;
      const stats = legalMoves.map(m => ({ move: m, visits: 0, wins: 0 }));

      for (let i = 0; i < rollouts; i++) {
        // Pick move with UCB1
        let totalSims = stats.reduce((sum, s) => sum + s.visits, 0);
        let selected = stats[0];

        const unvisited = stats.filter(s => s.visits === 0);
        if (unvisited.length > 0) {
          selected = unvisited[Math.floor(Math.random() * unvisited.length)];
        } else {
          let bestUcb = -Infinity;
          const lnTotal = Math.log(totalSims);
          for (const s of stats) {
            const ucb = (s.wins / s.visits) + cExploration * Math.sqrt(lnTotal / s.visits);
            if (ucb > bestUcb) {
              bestUcb = ucb;
              selected = s;
            }
          }
        }

        // Run rollout from board with selected move
        const boardCopy = [...this.board];
        boardCopy[selected.move] = myTurn;
        let turn = myTurn === 'X' ? 'O' : 'X';
        
        while (true) {
          const check = TicTacToeGame.prototype.checkWin(boardCopy);
          if (check.winner) {
            const won = check.winner === myTurn ? 1 : 0;
            selected.visits++;
            selected.wins += won;
            break;
          }
          const open = [];
          for (let k = 0; k < 9; k++) if (boardCopy[k] === null) open.push(k);
          if (open.length === 0) {
            // Draw
            selected.visits++;
            selected.wins += 0.5;
            break;
          }
          // Random action
          const rMove = open[Math.floor(Math.random() * open.length)];
          boardCopy[rMove] = turn;
          turn = turn === 'X' ? 'O' : 'X';
        }
      }

      stats.sort((a, b) => b.visits - a.visits);
      const durationMs = performance.now() - startTime;

      return {
        bestMove: stats[0].move,
        stats,
        evaluatedCount: rollouts,
        durationMs: Math.round(durationMs * 100) / 100
      };
    }
  }

  // --- NIM (SUBTRACTION GAME) ---
  class NimGame {
    constructor(initialCount = 15) {
      this.initialCount = initialCount;
      this.pebbles = initialCount;
      this.turn = 'Player 1'; // MAX
      this.winner = null;
      this.isGameOver = false;
      this.history = [];
    }

    reset() {
      this.pebbles = this.initialCount;
      this.turn = 'Player 1';
      this.winner = null;
      this.isGameOver = false;
      this.history = [];
    }

    getLegalMoves() {
      const moves = [];
      for (let take = 1; take <= 3; take++) {
        if (this.pebbles >= take) moves.push(take);
      }
      return moves;
    }

    take(count) {
      if (this.isGameOver || count < 1 || count > 3 || count > this.pebbles) return false;
      this.pebbles -= count;
      this.history.push({ player: this.turn, taken: count, remaining: this.pebbles });

      // Normal play: taking the last pebble wins!
      if (this.pebbles === 0) {
        this.winner = this.turn;
        this.isGameOver = true;
      } else {
        this.turn = this.turn === 'Player 1' ? 'AI (MIN)' : 'Player 1';
      }
      return true;
    }

    getBestAIMove() {
      // Nim with 1, 2, 3 subtraction has a direct mathematical winning strategy:
      // Winning positions are those where pebbles % 4 != 0.
      const rem = this.pebbles % 4;
      if (rem !== 0) {
        return rem; // Take rem to leave a multiple of 4
      } else {
        return 1; // Forced suboptimal, take 1
      }
    }
  }

  // --- MICRO CONNECT-4 (4x4, 3-in-a-row to win) ---
  class MicroConnectGame {
    constructor(rows = 4, cols = 4, connectToWin = 3) {
      this.rows = rows;
      this.cols = cols;
      this.connectToWin = connectToWin;
      this.board = Array(rows * cols).fill(null);
      this.turn = 'Red'; // MAX
      this.winner = null;
      this.winningCells = [];
      this.isGameOver = false;
    }

    reset() {
      this.board = Array(this.rows * this.cols).fill(null);
      this.turn = 'Red';
      this.winner = null;
      this.winningCells = [];
      this.isGameOver = false;
    }

    getLegalCols() {
      const cols = [];
      for (let c = 0; c < this.cols; c++) {
        if (this.board[c] === null) cols.push(c); // Top row of col c is empty
      }
      return cols;
    }

    dropChip(col) {
      if (this.isGameOver || col < 0 || col >= this.cols) return -1;
      
      // Find lowest empty row in col
      let targetRow = -1;
      for (let r = this.rows - 1; r >= 0; r--) {
        const idx = r * this.cols + col;
        if (this.board[idx] === null) {
          targetRow = r;
          break;
        }
      }
      if (targetRow === -1) return -1;

      const idx = targetRow * this.cols + col;
      this.board[idx] = this.turn;

      const check = this.checkWin();
      if (check.winner) {
        this.winner = check.winner;
        this.winningCells = check.cells;
        this.isGameOver = true;
      } else if (this.getLegalCols().length === 0) {
        this.winner = 'DRAW';
        this.isGameOver = true;
      } else {
        this.turn = this.turn === 'Red' ? 'Yellow' : 'Red';
      }

      return idx;
    }

    checkWin() {
      const get = (r, c) => {
        if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return null;
        return this.board[r * this.cols + c];
      };

      const dirs = [
        [0, 1],  // Horizontal
        [1, 0],  // Vertical
        [1, 1],  // Diagonal down-right
        [1, -1]  // Diagonal down-left
      ];

      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          const piece = get(r, c);
          if (!piece) continue;

          for (const [dr, dc] of dirs) {
            let count = 1;
            const cells = [r * this.cols + c];

            for (let step = 1; step < this.connectToWin; step++) {
              const nr = r + dr * step;
              const nc = c + dc * step;
              if (get(nr, nc) === piece) {
                count++;
                cells.push(nr * this.cols + nc);
              } else {
                break;
              }
            }

            if (count >= this.connectToWin) {
              return { winner: piece, cells: cells };
            }
          }
        }
      }
      return { winner: null, cells: [] };
    }

    solveAlphaBeta(depthLimit = 4) {
      const startTime = performance.now();
      let evaluatedCount = 0;
      let prunedCount = 0;
      const isRed = this.turn === 'Red';

      const evaluateHeuristic = (board) => {
        // Material & positional evaluation
        let score = 0;
        // Center column control bonus
        const centerCol = Math.floor(this.cols / 2);
        for (let r = 0; r < this.rows; r++) {
          if (board[r * this.cols + centerCol] === 'Red') score += 2;
          else if (board[r * this.cols + centerCol] === 'Yellow') score -= 2;
        }
        return score;
      };

      const alphabeta = (board, depth, isMaximizing, alpha, beta) => {
        evaluatedCount++;
        const check = this.checkWin();
        if (check.winner === 'Red') return 100 - depth;
        if (check.winner === 'Yellow') return depth - 100;

        const legal = [];
        for (let c = 0; c < this.cols; c++) {
          if (board[c] === null) legal.push(c);
        }

        if (legal.length === 0 || depth >= depthLimit) {
          return evaluateHeuristic(board);
        }

        if (isMaximizing) {
          let maxVal = -Infinity;
          for (const col of legal) {
            // Drop
            let row = -1;
            for (let r = this.rows - 1; r >= 0; r--) {
              if (board[r * this.cols + col] === null) { row = r; break; }
            }
            board[row * this.cols + col] = 'Red';
            const val = alphabeta(board, depth + 1, false, alpha, beta);
            board[row * this.cols + col] = null;

            maxVal = Math.max(maxVal, val);
            alpha = Math.max(alpha, val);
            if (beta <= alpha) {
              prunedCount++;
              break;
            }
          }
          return maxVal;
        } else {
          let minVal = Infinity;
          for (const col of legal) {
            let row = -1;
            for (let r = this.rows - 1; r >= 0; r--) {
              if (board[r * this.cols + col] === null) { row = r; break; }
            }
            board[row * this.cols + col] = 'Yellow';
            const val = alphabeta(board, depth + 1, true, alpha, beta);
            board[row * this.cols + col] = null;

            minVal = Math.min(minVal, val);
            beta = Math.min(beta, val);
            if (beta <= alpha) {
              prunedCount++;
              break;
            }
          }
          return minVal;
        }
      };

      const legalCols = this.getLegalCols();
      let bestCol = legalCols[0];
      let bestScore = isRed ? -Infinity : Infinity;

      for (const col of legalCols) {
        let row = -1;
        for (let r = this.rows - 1; r >= 0; r--) {
          if (this.board[r * this.cols + col] === null) { row = r; break; }
        }
        this.board[row * this.cols + col] = this.turn;
        const score = alphabeta(this.board, 1, !isRed, -Infinity, Infinity);
        this.board[row * this.cols + col] = null;

        if (isRed ? (score > bestScore) : (score < bestScore)) {
          bestScore = score;
          bestCol = col;
        }
      }

      const durationMs = performance.now() - startTime;
      return {
        bestCol,
        bestScore,
        evaluatedCount,
        prunedCount,
        durationMs: Math.round(durationMs * 100) / 100
      };
    }
  }

  // ==========================================
  // EXPOSE ENGINE GLOBALLY
  // ==========================================

  window.AdversarialEngine = {
    TreeNode,
    createAimaFig52Tree,
    createAimaFig57Tree,
    createDeep3PlyTree,
    createChanceTree,
    createCustomTree,
    generateMinimaxSteps,
    generateAlphaBetaSteps,
    generateExpectiminimaxSteps,
    generateMCTSSteps,
    TicTacToeGame,
    NimGame,
    MicroConnectGame
  };

})();
