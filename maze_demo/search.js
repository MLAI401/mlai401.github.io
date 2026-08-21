/**
 * Class representing a node in the search tree.
 */
class SearchNode {
  constructor(state, parent = null, action = null, pathCost = 0, depth = 0) {
    this.state = state; // Decision point label (e.g. 'A')
    this.parent = parent;
    this.action = action; // Action taken (e.g. 'Move North')
    this.pathCost = pathCost; // Cumulative g(n)
    this.depth = depth;
  }

  getPath() {
    const path = [];
    let current = this;
    while (current !== null) {
      path.unshift(current);
      current = current.parent;
    }
    return path;
  }
}

/**
 * Breadth-First Search (FIFO Frontier)
 */
function runBFS(graph, start, goal) {
  const steps = [];
  const startNode = new SearchNode(start, null, null, 0, 0);
  
  const frontier = [startNode];
  const reached = new Set([start]);
  const expanded = [];

  while (frontier.length > 0) {
    const currentNode = frontier.shift();
    const state = currentNode.state;
    expanded.push(state);

    // Goal test on expansion (standard BFS optimization)
    if (state === goal) {
      steps.push({
        currentNode: currentNode,
        frontier: frontier.map(n => ({ state: n.state, cost: n.pathCost, depth: n.depth })),
        reached: Array.from(reached),
        expanded: [...expanded],
        solutionPath: currentNode.getPath().map(n => n.state),
        isFinished: true
      });
      return steps;
    }

    // Expand
    const edges = graph[state] || [];
    edges.forEach(edge => {
      if (!reached.has(edge.to)) {
        reached.add(edge.to);
        frontier.push(new SearchNode(
          edge.to,
          currentNode,
          edge.action,
          currentNode.pathCost + edge.cost,
          currentNode.depth + 1
        ));
      }
    });

    steps.push({
      currentNode: currentNode,
      frontier: frontier.map(n => ({ state: n.state, cost: n.pathCost, depth: n.depth })),
      reached: Array.from(reached),
      expanded: [...expanded],
      solutionPath: null,
      isFinished: false
    });
  }

  steps.push({
    currentNode: null,
    frontier: [],
    reached: Array.from(reached),
    expanded: expanded,
    solutionPath: null,
    isFinished: true,
    failed: true
  });
  return steps;
}

/**
 * Depth-First Search (LIFO Frontier)
 */
function runDFS(graph, start, goal) {
  const steps = [];
  const frontier = [new SearchNode(start, null, null, 0, 0)];
  const reached = new Set(); // Set of expanded states
  const expanded = [];

  while (frontier.length > 0) {
    const currentNode = frontier.pop();
    const state = currentNode.state;

    if (state === goal) {
      expanded.push(state);
      reached.add(state);
      steps.push({
        currentNode: currentNode,
        frontier: frontier.map(n => ({ state: n.state, cost: n.pathCost, depth: n.depth })),
        reached: Array.from(reached),
        expanded: [...expanded],
        solutionPath: currentNode.getPath().map(n => n.state),
        isFinished: true
      });
      return steps;
    }

    if (reached.has(state)) {
      continue; // Skip if already expanded
    }

    reached.add(state);
    expanded.push(state);

    // Expand neighbors (push in reverse order to pop in correct clockwise direction)
    const edges = graph[state] || [];
    const reverseEdges = [...edges].reverse();
    reverseEdges.forEach(edge => {
      if (!reached.has(edge.to)) {
        frontier.push(new SearchNode(
          edge.to,
          currentNode,
          edge.action,
          currentNode.pathCost + edge.cost,
          currentNode.depth + 1
        ));
      }
    });

    steps.push({
      currentNode: currentNode,
      frontier: frontier.map(n => ({ state: n.state, cost: n.pathCost, depth: n.depth })),
      reached: Array.from(reached),
      expanded: [...expanded],
      solutionPath: null,
      isFinished: false
    });
  }

  steps.push({
    currentNode: null,
    frontier: [],
    reached: Array.from(reached),
    expanded: expanded,
    solutionPath: null,
    isFinished: true,
    failed: true
  });
  return steps;
}

/**
 * Uniform Cost Search (Cheapest First)
 */
function runUCS(graph, start, goal) {
  const steps = [];
  const frontier = [new SearchNode(start, null, null, 0, 0)];
  const reached = { [start]: 0 }; // state -> best pathCost
  const expanded = [];

  while (frontier.length > 0) {
    // Sort frontier by pathCost (priority queue behavior)
    frontier.sort((a, b) => a.pathCost - b.pathCost);
    const currentNode = frontier.shift();
    const state = currentNode.state;

    expanded.push(state);

    if (state === goal) {
      steps.push({
        currentNode: currentNode,
        frontier: frontier.map(n => ({ state: n.state, cost: n.pathCost, depth: n.depth })),
        reached: Object.keys(reached),
        expanded: [...expanded],
        solutionPath: currentNode.getPath().map(n => n.state),
        isFinished: true
      });
      return steps;
    }

    // Expand
    const edges = graph[state] || [];
    edges.forEach(edge => {
      const childCost = currentNode.pathCost + edge.cost;
      const childState = edge.to;

      if (reached[childState] === undefined || childCost < reached[childState]) {
        reached[childState] = childCost;
        frontier.push(new SearchNode(
          childState,
          currentNode,
          edge.action,
          childCost,
          currentNode.depth + 1
        ));
      }
    });

    steps.push({
      currentNode: currentNode,
      frontier: frontier.map(n => ({ state: n.state, cost: n.pathCost, depth: n.depth })).sort((a,b) => a.cost - b.cost),
      reached: Object.keys(reached),
      expanded: [...expanded],
      solutionPath: null,
      isFinished: false
    });
  }

  steps.push({
    currentNode: null,
    frontier: [],
    reached: Object.keys(reached),
    expanded: expanded,
    solutionPath: null,
    isFinished: true,
    failed: true
  });
  return steps;
}

/**
 * Depth-Limited Search helper for IDS
 */
function runDLS(graph, start, goal, limit, accumulatedSteps, expandedAccumulator) {
  const frontier = [new SearchNode(start, null, null, 0, 0)];
  const reached = new Set([start]);
  let cutoffOccurred = false;

  while (frontier.length > 0) {
    const currentNode = frontier.pop();
    const state = currentNode.state;

    if (state === goal) {
      expandedAccumulator.push(state);
      reached.add(state);
      accumulatedSteps.push({
        currentNode: currentNode,
        frontier: frontier.map(n => ({ state: n.state, cost: n.pathCost, depth: n.depth })),
        reached: Array.from(reached),
        expanded: [...expandedAccumulator],
        solutionPath: currentNode.getPath().map(n => n.state),
        isFinished: true,
        limit: limit
      });
      return { result: 'solution' };
    }

    reached.add(state);
    expandedAccumulator.push(state);

    if (currentNode.depth >= limit) {
      cutoffOccurred = true;
      accumulatedSteps.push({
        currentNode: currentNode,
        frontier: frontier.map(n => ({ state: n.state, cost: n.pathCost, depth: n.depth })),
        reached: Array.from(reached),
        expanded: [...expandedAccumulator],
        solutionPath: null,
        isFinished: false,
        limit: limit,
        status: `Cutoff hit at state ${state}`
      });
      continue;
    }

    // Expand
    const edges = graph[state] || [];
    const reverseEdges = [...edges].reverse();
    reverseEdges.forEach(edge => {
      // Cycle check along path
      let isCycle = false;
      let p = currentNode;
      while (p !== null) {
        if (p.state === edge.to) {
          isCycle = true;
          break;
        }
        p = p.parent;
      }

      if (!isCycle) {
        frontier.push(new SearchNode(
          edge.to,
          currentNode,
          edge.action,
          currentNode.pathCost + edge.cost,
          currentNode.depth + 1
        ));
      }
    });

    accumulatedSteps.push({
      currentNode: currentNode,
      frontier: frontier.map(n => ({ state: n.state, cost: n.pathCost, depth: n.depth })),
      reached: Array.from(reached),
      expanded: [...expandedAccumulator],
      solutionPath: null,
      isFinished: false,
      limit: limit
    });
  }

  return { result: cutoffOccurred ? 'cutoff' : 'failure' };
}

/**
 * Iterative Deepening Search
 */
function runIDS(graph, start, goal) {
  const steps = [];
  const expandedAccumulator = [];
  const maxDepth = 25; // Prevent runaway loops

  for (let limit = 0; limit <= maxDepth; limit++) {
    steps.push({
      currentNode: null,
      frontier: [],
      reached: [],
      expanded: [...expandedAccumulator],
      solutionPath: null,
      isFinished: false,
      limit: limit,
      status: `Initializing DFS with Depth Limit = ${limit}`
    });

    const dlsResult = runDLS(graph, start, goal, limit, steps, expandedAccumulator);
    if (dlsResult.result === 'solution') {
      return steps;
    }
    if (dlsResult.result === 'failure') {
      // Solved or determined unreachable
      break;
    }
  }

  steps.push({
    currentNode: null,
    frontier: [],
    reached: [],
    expanded: expandedAccumulator,
    solutionPath: null,
    isFinished: true,
    failed: true,
    limit: maxDepth
  });
  return steps;
}

// Export search functions to global window scope
window.Search = {
  runBFS,
  runDFS,
  runUCS,
  runIDS
};
