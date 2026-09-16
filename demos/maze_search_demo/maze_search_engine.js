/**
 * Maze Search Engine for Performance & Complexity Evaluation.
 * Supports: BFS, DFS, IDS, UCS, Greedy Best-First, and A* Search.
 * Handles both Grid-Level (cell-by-cell) and Abstract Graph-Level state spaces.
 */

class MazeSearchEngine {
  constructor() {
    this.presets = {
      dualRoute: {
        name: "Dual Route & Trap (Default)",
        description: "Features a shallow high-cost branch, a deeper low-cost branch, and a dead-end heuristic trap.",
        grid: [
          "###################",
          "#S......#........G#",
          "#.#####.#.#######.#",
          "#.#...#.#.......#.#",
          "#.#.#.#.#######.#.#",
          "#.#.#.#.......#.#.#",
          "#...#.#######.#.#.#",
          "###.#.......#.#.#.#",
          "#...#######.#.###.#",
          "#...........#.....#",
          "###################"
        ]
      },
      looping: {
        name: "Cyclic Corridor Maze",
        description: "Contains interconnected loops to demonstrate graph search duplicate-state pruning via reached set.",
        grid: [
          "###################",
          "#S....#.....#....G#",
          "#.###.#.###.#.###.#",
          "#...#...#...#...#.#",
          "###.###.#.###.###.#",
          "#...#...#...#...#.#",
          "#.###.#####.#.###.#",
          "#...#.......#...#.#",
          "###.###########.#.#",
          "#...............#.#",
          "###################"
        ]
      },
      openField: {
        name: "Open Room / Obstacle Grid",
        description: "Open grid illustrating exponential BFS wavefront expansion vs focused A* heuristic guidance.",
        grid: [
          "###################",
          "#S................#",
          "#.................#",
          "#.....#######.....#",
          "#.....#.....#.....#",
          "#.....#..G..#.....#",
          "#.....#.....#.....#",
          "#.....#######.....#",
          "#.................#",
          "#.................#",
          "###################"
        ]
      }
    };

    this.currentPresetKey = 'dualRoute';
    this.initMaze(this.presets[this.currentPresetKey].grid);
  }

  setPreset(key) {
    if (this.presets[key]) {
      this.currentPresetKey = key;
      this.initMaze(this.presets[key].grid);
    }
  }

  initMaze(gridArray) {
    this.grid = gridArray;
    this.height = gridArray.length;
    this.width = gridArray[0].length;
    this.start = { x: 1, y: 1 };
    this.goal = { x: this.width - 2, y: 1 };

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.grid[y][x] === 'S') this.start = { x, y };
        if (this.grid[y][x] === 'G') this.goal = { x, y };
      }
    }

    // Build decision points and abstract graph
    this.decisionPoints = this.findDecisionPoints();
    this.abstractGraph = this.buildAbstractGraph(this.decisionPoints);
  }

  isTraversable(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
    return this.grid[y][x] !== '#';
  }

  getNeighbors(x, y) {
    const dirs = [
      { dx: 0, dy: -1, name: 'North' },
      { dx: 1, dy: 0, name: 'East' },
      { dx: 0, dy: 1, name: 'South' },
      { dx: -1, dy: 0, name: 'West' }
    ];
    const neighbors = [];
    dirs.forEach(d => {
      const nx = x + d.dx;
      const ny = y + d.dy;
      if (this.isTraversable(nx, ny)) {
        neighbors.push({ x: nx, y: ny, dir: d.name });
      }
    });
    return neighbors;
  }

  getHeuristic(x, y, goalX = this.goal.x, goalY = this.goal.y) {
    // Manhattan distance
    return Math.abs(x - goalX) + Math.abs(y - goalY);
  }

  findDecisionPoints() {
    const dps = [];
    let dpIdx = 0;

    const getLabel = (idx) => {
      let count = 0, cur = 0;
      while (true) {
        let label;
        if (cur < 26) label = String.fromCharCode(65 + cur);
        else label = String.fromCharCode(65 + Math.floor(cur / 26) - 1) + String.fromCharCode(65 + (cur % 26));
        if (label !== 'S' && label !== 'G') {
          if (count === idx) return label;
          count++;
        }
        cur++;
      }
    };

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.grid[y][x] === '#') continue;

        const isStart = (x === this.start.x && y === this.start.y);
        const isGoal = (x === this.goal.x && y === this.goal.y);
        const nb = this.getNeighbors(x, y);

        let isDP = false;
        let type = '';

        if (isStart) { isDP = true; type = 'start'; }
        else if (isGoal) { isDP = true; type = 'goal'; }
        else if (nb.length === 1) { isDP = true; type = 'dead-end'; }
        else if (nb.length >= 3) { isDP = true; type = 'intersection'; }
        else if (nb.length === 2) {
          const n1 = nb[0], n2 = nb[1];
          if (n1.x !== n2.x && n1.y !== n2.y) {
            isDP = true;
            type = 'corner';
          }
        }

        if (isDP) {
          dps.push({
            x, y,
            label: isStart ? 'S' : (isGoal ? 'G' : getLabel(dpIdx++)),
            type
          });
        }
      }
    }
    return dps;
  }

  buildAbstractGraph(decisionPoints) {
    const graph = {};
    const dpMap = {};
    decisionPoints.forEach(dp => {
      dpMap[`${dp.x},${dp.y}`] = dp;
      graph[dp.label] = [];
    });

    const directions = [
      { dx: 0, dy: -1, name: 'Move North' },
      { dx: 1, dy: 0, name: 'Move East' },
      { dx: 0, dy: 1, name: 'Move South' },
      { dx: -1, dy: 0, name: 'Move West' }
    ];

    decisionPoints.forEach(dp => {
      directions.forEach(dir => {
        let currentX = dp.x + dir.dx;
        let currentY = dp.y + dir.dy;
        if (!this.isTraversable(currentX, currentY)) return;

        let prevX = dp.x, prevY = dp.y;
        let steps = 1;
        const path = [{ x: dp.x, y: dp.y }, { x: currentX, y: currentY }];

        while (true) {
          const key = `${currentX},${currentY}`;
          if (dpMap[key]) {
            graph[dp.label].push({
              to: dpMap[key].label,
              toX: currentX,
              toY: currentY,
              action: dir.name,
              cost: steps,
              path: path
            });
            break;
          }

          const nb = this.getNeighbors(currentX, currentY).filter(n => n.x !== prevX || n.y !== prevY);
          if (nb.length === 1) {
            prevX = currentX;
            prevY = currentY;
            currentX = nb[0].x;
            currentY = nb[0].y;
            path.push({ x: currentX, y: currentY });
            steps++;
          } else {
            break;
          }
        }
      });
    });

    return graph;
  }

  /**
   * Run Search Algorithm and record step-by-step trace events for visual replay.
   * Mode: 'grid' (cell by cell) or 'abstract' (decision points).
   */
  runSearch(algorithm, mode = 'grid', earlyGoalTest = false) {
    if (mode === 'abstract') {
      return this.runAbstractSearch(algorithm, earlyGoalTest);
    } else {
      return this.runGridSearch(algorithm, earlyGoalTest);
    }
  }

  // ================= GRID-LEVEL SEARCH TRACER =================

  runGridSearch(algorithm, earlyGoalTest) {
    const events = [];
    const key = (c) => `${c.x},${c.y}`;
    const startNode = {
      x: this.start.x,
      y: this.start.y,
      g: 0,
      h: this.getHeuristic(this.start.x, this.start.y),
      f: this.getHeuristic(this.start.x, this.start.y),
      path: [{ x: this.start.x, y: this.start.y }],
      depth: 0
    };

    let frontier = [startNode];
    let reached = new Map([[key(this.start), 0]]);
    let expandedCount = 0;
    let peakMemory = 1;
    let foundSolution = null;

    events.push({
      type: 'INIT',
      algorithm,
      mode: 'grid',
      selectedNode: null,
      frontier: [...frontier],
      reachedKeys: Array.from(reached.keys()),
      expandedCount: 0,
      peakMemory: 1,
      message: `Initialized ${algorithm} search on grid state space at Start (${this.start.x}, ${this.start.y}).`
    });

    if (algorithm === 'IDS') {
      return this.runGridIDS();
    }

    while (frontier.length > 0) {
      peakMemory = Math.max(peakMemory, frontier.length);

      // Frontier Ordering / Selection
      let current;
      if (algorithm === 'BFS') {
        current = frontier.shift();
      } else if (algorithm === 'DFS') {
        current = frontier.pop();
      } else if (algorithm === 'UCS') {
        frontier.sort((a, b) => a.g - b.g || a.h - b.h);
        current = frontier.shift();
      } else if (algorithm === 'Greedy') {
        frontier.sort((a, b) => a.h - b.h || a.g - b.g);
        current = frontier.shift();
      } else if (algorithm === 'A*') {
        frontier.sort((a, b) => a.f - b.f || a.h - b.h);
        current = frontier.shift();
      }

      const isGoal = (current.x === this.goal.x && current.y === this.goal.y);

      events.push({
        type: 'SELECT',
        algorithm,
        mode: 'grid',
        selectedNode: current,
        frontier: [...frontier],
        reachedKeys: Array.from(reached.keys()),
        expandedCount,
        peakMemory,
        message: `Selected cell (${current.x}, ${current.y}) with g=${current.g}, h=${current.h}, f=${current.f}.`
      });

      // Goal test on selection (Standard)
      if (isGoal) {
        foundSolution = current;
        events.push({
          type: 'GOAL_FOUND',
          algorithm,
          mode: 'grid',
          selectedNode: current,
          solutionPath: current.path,
          solutionCost: current.g,
          frontier: [...frontier],
          reachedKeys: Array.from(reached.keys()),
          expandedCount,
          peakMemory,
          message: `Goal reached at (${current.x}, ${current.y})! Solution path cost = ${current.g}.`
        });
        break;
      }

      // Expand node
      expandedCount++;
      const neighbors = this.getNeighbors(current.x, current.y);
      const addedChildren = [];

      for (const nb of neighbors) {
        const k = key(nb);
        const newG = current.g + 1;
        const newH = this.getHeuristic(nb.x, nb.y);
        const newF = newG + newH;
        const childNode = {
          x: nb.x,
          y: nb.y,
          g: newG,
          h: newH,
          f: newF,
          path: [...current.path, { x: nb.x, y: nb.y }],
          depth: current.depth + 1
        };

        const isChildGoal = (nb.x === this.goal.x && nb.y === this.goal.y);

        // Early goal test (applicable for BFS)
        if (earlyGoalTest && algorithm === 'BFS' && isChildGoal) {
          foundSolution = childNode;
          events.push({
            type: 'GOAL_FOUND',
            algorithm,
            mode: 'grid',
            selectedNode: childNode,
            solutionPath: childNode.path,
            solutionCost: childNode.g,
            frontier: [...frontier, childNode],
            reachedKeys: Array.from(reached.keys()),
            expandedCount,
            peakMemory,
            message: `Early Goal Test succeeded upon generating (${nb.x}, ${nb.y})! Cost = ${childNode.g}.`
          });
          return {
            algorithm,
            mode: 'grid',
            events,
            solution: foundSolution,
            expandedCount,
            peakMemory,
            cost: foundSolution ? foundSolution.g : Infinity
          };
        }

        if (algorithm === 'UCS' || algorithm === 'A*') {
          if (!reached.has(k) || newG < reached.get(k)) {
            reached.set(k, newG);
            frontier.push(childNode);
            addedChildren.push(childNode);
          }
        } else {
          if (!reached.has(k)) {
            reached.set(k, newG);
            frontier.push(childNode);
            addedChildren.push(childNode);
          }
        }
      }

      events.push({
        type: 'EXPAND',
        algorithm,
        mode: 'grid',
        selectedNode: current,
        addedChildren,
        frontier: [...frontier],
        reachedKeys: Array.from(reached.keys()),
        expandedCount,
        peakMemory,
        message: `Expanded (${current.x}, ${current.y}): generated ${addedChildren.length} new frontier cells.`
      });
    }

    return {
      algorithm,
      mode: 'grid',
      events,
      solution: foundSolution,
      expandedCount,
      peakMemory,
      cost: foundSolution ? foundSolution.g : Infinity
    };
  }

  runGridIDS() {
    const events = [];
    const key = (c) => `${c.x},${c.y}`;
    let totalExpanded = 0;
    let peakMemory = 1;
    let foundSolution = null;
    const maxLimit = Math.min(80, this.width * this.height);

    for (let limit = 0; limit <= maxLimit; limit++) {
      let frontier = [{
        x: this.start.x,
        y: this.start.y,
        g: 0,
        h: this.getHeuristic(this.start.x, this.start.y),
        f: this.getHeuristic(this.start.x, this.start.y),
        path: [{ x: this.start.x, y: this.start.y }],
        depth: 0
      }];
      // Track shallowest depth reached at each cell within current iteration
      let reachedDepth = new Map([[key(this.start), 0]]);

      events.push({
        type: 'IDS_ITERATION',
        algorithm: 'IDS',
        mode: 'grid',
        depthLimit: limit,
        frontier: [...frontier],
        reachedKeys: Array.from(reachedDepth.keys()),
        expandedCount: totalExpanded,
        peakMemory,
        message: `--- IDS Iteration: Starting Depth Limit = ${limit} ---`
      });

      while (frontier.length > 0) {
        peakMemory = Math.max(peakMemory, frontier.length);
        const current = frontier.pop();

        events.push({
          type: 'SELECT',
          algorithm: 'IDS',
          mode: 'grid',
          selectedNode: current,
          depthLimit: limit,
          frontier: [...frontier],
          reachedKeys: Array.from(reachedDepth.keys()),
          expandedCount: totalExpanded,
          peakMemory,
          message: `IDS (Limit ${limit}): Selected (${current.x}, ${current.y}) at depth ${current.depth}.`
        });

        if (current.x === this.goal.x && current.y === this.goal.y) {
          foundSolution = current;
          events.push({
            type: 'GOAL_FOUND',
            algorithm: 'IDS',
            mode: 'grid',
            selectedNode: current,
            solutionPath: current.path,
            solutionCost: current.g,
            frontier: [...frontier],
            reachedKeys: Array.from(reachedDepth.keys()),
            expandedCount: totalExpanded,
            peakMemory,
            message: `Goal reached at (${current.x}, ${current.y}) at depth limit ${limit}! Cost = ${current.g}.`
          });
          break;
        }

        if (current.depth < limit) {
          totalExpanded++;
          const neighbors = this.getNeighbors(current.x, current.y);
          const addedChildren = [];
          for (const nb of neighbors) {
            const k = key(nb);
            const nextDepth = current.depth + 1;
            if (!reachedDepth.has(k) || nextDepth < reachedDepth.get(k)) {
              reachedDepth.set(k, nextDepth);
              const child = {
                x: nb.x,
                y: nb.y,
                g: current.g + 1,
                h: this.getHeuristic(nb.x, nb.y),
                f: current.g + 1 + this.getHeuristic(nb.x, nb.y),
                path: [...current.path, { x: nb.x, y: nb.y }],
                depth: nextDepth
              };
              frontier.push(child);
              addedChildren.push(child);
            }
          }
          events.push({
            type: 'EXPAND',
            algorithm: 'IDS',
            mode: 'grid',
            selectedNode: current,
            depthLimit: limit,
            addedChildren,
            frontier: [...frontier],
            reachedKeys: Array.from(reachedDepth.keys()),
            expandedCount: totalExpanded,
            peakMemory,
            message: `Expanded (${current.x}, ${current.y}) at depth ${current.depth}.`
          });
        }
      }

      if (foundSolution) break;
    }

    return {
      algorithm: 'IDS',
      mode: 'grid',
      events,
      solution: foundSolution,
      expandedCount: totalExpanded,
      peakMemory,
      cost: foundSolution ? foundSolution.g : Infinity
    };
  }

  // ================= ABSTRACT GRAPH-LEVEL SEARCH TRACER =================

  runAbstractSearch(algorithm, earlyGoalTest) {
    const events = [];
    const startDP = this.decisionPoints.find(d => d.type === 'start') || { label: 'S', x: this.start.x, y: this.start.y };
    const goalDP = this.decisionPoints.find(d => d.type === 'goal') || { label: 'G', x: this.goal.x, y: this.goal.y };

    const startNode = {
      label: startDP.label,
      x: startDP.x,
      y: startDP.y,
      g: 0,
      h: this.getHeuristic(startDP.x, startDP.y, goalDP.x, goalDP.y),
      f: this.getHeuristic(startDP.x, startDP.y, goalDP.x, goalDP.y),
      path: [startDP.label],
      coordsPath: [{ x: startDP.x, y: startDP.y }],
      depth: 0
    };

    let frontier = [startNode];
    let reached = new Map([[startDP.label, 0]]);
    let expandedCount = 0;
    let peakMemory = 1;
    let foundSolution = null;

    events.push({
      type: 'INIT',
      algorithm,
      mode: 'abstract',
      selectedNode: null,
      frontier: [...frontier],
      reachedKeys: Array.from(reached.keys()),
      expandedCount: 0,
      peakMemory: 1,
      message: `Initialized ${algorithm} search on abstract decision graph from node ${startDP.label}.`
    });

    while (frontier.length > 0) {
      peakMemory = Math.max(peakMemory, frontier.length);

      let current;
      if (algorithm === 'BFS') {
        current = frontier.shift();
      } else if (algorithm === 'DFS') {
        current = frontier.pop();
      } else if (algorithm === 'UCS') {
        frontier.sort((a, b) => a.g - b.g || a.label.localeCompare(b.label));
        current = frontier.shift();
      } else if (algorithm === 'Greedy') {
        frontier.sort((a, b) => a.h - b.h || a.label.localeCompare(b.label));
        current = frontier.shift();
      } else if (algorithm === 'A*') {
        frontier.sort((a, b) => a.f - b.f || a.h - b.h || a.label.localeCompare(b.label));
        current = frontier.shift();
      } else if (algorithm === 'IDS') {
        current = frontier.shift(); // simplified queue in abstract
      }

      const isGoal = (current.label === goalDP.label);

      events.push({
        type: 'SELECT',
        algorithm,
        mode: 'abstract',
        selectedNode: current,
        frontier: [...frontier],
        reachedKeys: Array.from(reached.keys()),
        expandedCount,
        peakMemory,
        message: `Selected decision node ${current.label} with g=${current.g}, h=${current.h}, f=${current.f}.`
      });

      if (isGoal) {
        foundSolution = current;
        events.push({
          type: 'GOAL_FOUND',
          algorithm,
          mode: 'abstract',
          selectedNode: current,
          solutionPath: current.path,
          solutionCost: current.g,
          frontier: [...frontier],
          reachedKeys: Array.from(reached.keys()),
          expandedCount,
          peakMemory,
          message: `Goal ${current.label} reached! Total solution path cost = ${current.g}.`
        });
        break;
      }

      expandedCount++;
      const edges = this.abstractGraph[current.label] || [];
      const addedChildren = [];

      for (const edge of edges) {
        const toDP = this.decisionPoints.find(d => d.label === edge.to);
        if (!toDP) continue;

        const newG = current.g + edge.cost;
        const newH = this.getHeuristic(toDP.x, toDP.y, goalDP.x, goalDP.y);
        const newF = newG + newH;
        const childNode = {
          label: toDP.label,
          x: toDP.x,
          y: toDP.y,
          g: newG,
          h: newH,
          f: newF,
          path: [...current.path, toDP.label],
          coordsPath: [...current.coordsPath, ...edge.path.slice(1)],
          depth: current.depth + 1
        };

        if (algorithm === 'UCS' || algorithm === 'A*') {
          if (!reached.has(toDP.label) || newG < reached.get(toDP.label)) {
            reached.set(toDP.label, newG);
            frontier.push(childNode);
            addedChildren.push(childNode);
          }
        } else {
          if (!reached.has(toDP.label)) {
            reached.set(toDP.label, newG);
            frontier.push(childNode);
            addedChildren.push(childNode);
          }
        }
      }

      events.push({
        type: 'EXPAND',
        algorithm,
        mode: 'abstract',
        selectedNode: current,
        addedChildren,
        frontier: [...frontier],
        reachedKeys: Array.from(reached.keys()),
        expandedCount,
        peakMemory,
        message: `Expanded node ${current.label}: generated ${addedChildren.map(c => c.label).join(', ') || 'none'}.`
      });
    }

    return {
      algorithm,
      mode: 'abstract',
      events,
      solution: foundSolution,
      expandedCount,
      peakMemory,
      cost: foundSolution ? foundSolution.g : Infinity
    };
  }

  computeAllAlgorithmsSummary(mode = 'grid') {
    const algs = ['BFS', 'DFS', 'IDS', 'UCS', 'Greedy', 'A*'];
    const summary = {};
    algs.forEach(alg => {
      const res = this.runSearch(alg, mode);
      summary[alg] = {
        name: alg,
        expandedCount: res.expandedCount,
        peakMemory: res.peakMemory,
        cost: res.cost,
        optimal: res.cost === (summary['A*'] ? summary['A*'].cost : res.cost)
      };
    });

    const optimalCost = summary['A*'] ? summary['A*'].cost : (summary['UCS'] ? summary['UCS'].cost : 0);
    algs.forEach(alg => {
      summary[alg].isOptimal = (summary[alg].cost === optimalCost && summary[alg].cost !== Infinity);
    });

    return summary;
  }
}

// Export to global scope
window.MazeSearchEngine = MazeSearchEngine;
