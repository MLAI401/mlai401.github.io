/**
 * Direct weighted graph mapping for AIMA search demonstration.
 */
const GRAPH = {
  A: [ { to: 'B', cost: 3 }, { to: 'C', cost: 2 }, { to: 'E', cost: 9 } ],
  B: [ { to: 'D', cost: 2 }, { to: 'E', cost: 4 } ],
  C: [ { to: 'E', cost: 6 }, { to: 'F', cost: 9 } ],
  D: [ { to: 'G', cost: 3 } ],
  E: [ { to: 'G', cost: 1 }, { to: 'H', cost: 2 } ],
  F: [ { to: 'H', cost: 1 } ],
  G: [ { to: 'H', cost: 5 } ],
  H: []
};

// Node locations (x, y) relative to visualizer container (scaled in UI)
const NODE_LAYOUT = {
  A: { x: 0.10, y: 0.50 },
  B: { x: 0.35, y: 0.25 },
  C: { x: 0.35, y: 0.75 },
  E: { x: 0.50, y: 0.50 },
  D: { x: 0.65, y: 0.25 },
  F: { x: 0.65, y: 0.75 },
  G: { x: 0.88, y: 0.35 },
  H: { x: 0.88, y: 0.65 }
};

/**
 * Helper to reconstruct path from start to node
 */
function reconstructPath(item) {
  const path = [];
  let curr = item;
  while (curr) {
    path.push(curr.node);
    curr = curr.parent;
  }
  return path.reverse();
}

/**
 * Helper to calculate cumulative path cost
 */
function getPathCost(path) {
  let cost = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const from = path[i];
    const to = path[i + 1];
    const edges = GRAPH[from] || [];
    const edge = edges.find(e => e.to === to);
    if (edge) cost += edge.cost;
  }
  return cost;
}

/**
 * Get successors of a node, sorted alphabetically
 */
function getSuccessorsAlphabetical(node) {
  const edges = GRAPH[node] || [];
  return [...edges].sort((a, b) => a.to.localeCompare(b.to));
}

/**
 * Event-driven Breadth-First Search (FIFO Queue)
 */
function runBFS(start, goal) {
  const steps = [];
  let frontier = [{ node: start, parent: null }]; // FIFO queue
  let reached = new Set([start]);
  let selected = [];
  let expanded = [];

  steps.push({
    action: 'START',
    currentNode: null,
    successorNode: null,
    frontier: [...frontier],
    reached: new Set(reached),
    selected: [...selected],
    expanded: [...expanded],
    explanation: `Initialize BFS Search. Add start node ${start} to FIFO frontier and Reached.`
  });

  while (frontier.length > 0) {
    const currentItem = frontier.shift(); // FIFO: pop front
    const currentNode = currentItem.node;
    selected.push(currentNode);

    steps.push({
      action: 'SELECT',
      currentNode: currentNode,
      successorNode: null,
      frontier: [...frontier],
      reached: new Set(reached),
      selected: [...selected],
      expanded: [...expanded],
      explanation: `Select node ${currentNode} from the front of the FIFO queue.`
    });

    const isGoal = currentNode === goal;
    steps.push({
      action: 'GOAL_TEST',
      currentNode: currentNode,
      successorNode: null,
      frontier: [...frontier],
      reached: new Set(reached),
      selected: [...selected],
      expanded: [...expanded],
      explanation: `Goal Test: Is ${currentNode} the goal? ${isGoal ? 'YES!' : 'NO.'}`
    });

    if (isGoal) {
      const path = reconstructPath(currentItem);
      steps.push({
        action: 'GOAL_FOUND',
        currentNode: currentNode,
        successorNode: null,
        frontier: [...frontier],
        reached: new Set(reached),
        selected: [...selected],
        expanded: [...expanded],
        path: path,
        cost: getPathCost(path),
        explanation: `Goal found! Stop search. Solution path: ${path.join(' → ')}.`
      });
      return steps;
    }

    expanded.push(currentNode);
    steps.push({
      action: 'EXPAND',
      currentNode: currentNode,
      successorNode: null,
      frontier: [...frontier],
      reached: new Set(reached),
      selected: [...selected],
      expanded: [...expanded],
      explanation: `Expand ${currentNode}. Generate successors alphabetically.`
    });

    const successors = getSuccessorsAlphabetical(currentNode);
    for (let succ of successors) {
      steps.push({
        action: 'GENERATE_SUCCESSOR',
        currentNode: currentNode,
        successorNode: succ.to,
        frontier: [...frontier],
        reached: new Set(reached),
        selected: [...selected],
        expanded: [...expanded],
        explanation: `Generate successor ${succ.to} (edge cost: ${succ.cost}).`
      });

      // BFS Early Goal Test
      if (succ.to === goal) {
        reached.add(succ.to);
        const childItem = { node: succ.to, parent: currentItem };
        frontier.push(childItem);

        steps.push({
          action: 'UPDATE_FRONTIER',
          currentNode: currentNode,
          successorNode: succ.to,
          frontier: [...frontier],
          reached: new Set(reached),
          selected: [...selected],
          expanded: [...expanded],
          explanation: `Successor ${succ.to} is the goal! (Early Goal Test). Add to frontier and Reached.`
        });

        const path = reconstructPath(childItem);
        steps.push({
          action: 'GOAL_FOUND',
          currentNode: succ.to,
          successorNode: null,
          frontier: [...frontier],
          reached: new Set(reached),
          selected: [...selected],
          expanded: [...expanded],
          path: path,
          cost: getPathCost(path),
          explanation: `Goal found via early test! Solution path: ${path.join(' → ')}.`
        });
        return steps;
      }

      if (reached.has(succ.to)) {
        steps.push({
          action: 'SKIP_DUPLICATE',
          currentNode: currentNode,
          successorNode: succ.to,
          frontier: [...frontier],
          reached: new Set(reached),
          selected: [...selected],
          expanded: [...expanded],
          explanation: `${succ.to} already in Reached. Skip.`
        });
      } else {
        reached.add(succ.to);
        frontier.push({ node: succ.to, parent: currentItem });
        steps.push({
          action: 'UPDATE_FRONTIER',
          currentNode: currentNode,
          successorNode: succ.to,
          frontier: [...frontier],
          reached: new Set(reached),
          selected: [...selected],
          expanded: [...expanded],
          explanation: `${succ.to} is new. Add to the back of FIFO queue and Reached.`
        });
      }
    }
  }

  steps.push({
    action: 'FAIL',
    currentNode: null,
    successorNode: null,
    frontier: [...frontier],
    reached: new Set(reached),
    selected: [...selected],
    expanded: [...expanded],
    explanation: `Frontier is empty. Search failed.`
  });
  return steps;
}

/**
 * Event-driven Depth-First Search (LIFO Stack)
 */
function runDFS(start, goal) {
  const steps = [];
  let frontier = [{ node: start, parent: null }]; // LIFO stack
  let reached = new Set([start]);
  let selected = [];
  let expanded = [];

  steps.push({
    action: 'START',
    currentNode: null,
    successorNode: null,
    frontier: [...frontier],
    reached: new Set(reached),
    selected: [...selected],
    expanded: [...expanded],
    explanation: `Initialize DFS Search. Push start node ${start} onto LIFO Stack.`
  });

  while (frontier.length > 0) {
    const currentItem = frontier.pop(); // LIFO: pop top
    const currentNode = currentItem.node;
    selected.push(currentNode);

    steps.push({
      action: 'SELECT',
      currentNode: currentNode,
      successorNode: null,
      frontier: [...frontier],
      reached: new Set(reached),
      selected: [...selected],
      expanded: [...expanded],
      explanation: `Pop node ${currentNode} from the top of the LIFO stack.`
    });

    const isGoal = currentNode === goal;
    steps.push({
      action: 'GOAL_TEST',
      currentNode: currentNode,
      successorNode: null,
      frontier: [...frontier],
      reached: new Set(reached),
      selected: [...selected],
      expanded: [...expanded],
      explanation: `Goal Test: Is selected node ${currentNode} the goal? ${isGoal ? 'YES!' : 'NO.'}`
    });

    if (isGoal) {
      const path = reconstructPath(currentItem);
      steps.push({
        action: 'GOAL_FOUND',
        currentNode: currentNode,
        successorNode: null,
        frontier: [...frontier],
        reached: new Set(reached),
        selected: [...selected],
        expanded: [...expanded],
        path: path,
        cost: getPathCost(path),
        explanation: `Goal found! Stop search. Solution path: ${path.join(' → ')}.`
      });
      return steps;
    }

    expanded.push(currentNode);
    steps.push({
      action: 'EXPAND',
      currentNode: currentNode,
      successorNode: null,
      frontier: [...frontier],
      reached: new Set(reached),
      selected: [...selected],
      expanded: [...expanded],
      explanation: `Expand ${currentNode}. Push successors in reverse alphabetical order so alphabetical selection is preserved.`
    });

    const successors = getSuccessorsAlphabetical(currentNode);
    const revSuccessors = [...successors].reverse(); // reverse order for stack

    for (let succ of revSuccessors) {
      steps.push({
        action: 'GENERATE_SUCCESSOR',
        currentNode: currentNode,
        successorNode: succ.to,
        frontier: [...frontier],
        reached: new Set(reached),
        selected: [...selected],
        expanded: [...expanded],
        explanation: `Generate successor ${succ.to} (reverse alphabetical stack push order).`
      });

      if (reached.has(succ.to)) {
        steps.push({
          action: 'SKIP_DUPLICATE',
          currentNode: currentNode,
          successorNode: succ.to,
          frontier: [...frontier],
          reached: new Set(reached),
          selected: [...selected],
          expanded: [...expanded],
          explanation: `${succ.to} already in Reached. Skip.`
        });
      } else {
        reached.add(succ.to);
        frontier.push({ node: succ.to, parent: currentItem });
        steps.push({
          action: 'UPDATE_FRONTIER',
          currentNode: currentNode,
          successorNode: succ.to,
          frontier: [...frontier],
          reached: new Set(reached),
          selected: [...selected],
          expanded: [...expanded],
          explanation: `Push ${succ.to} onto the LIFO stack and add to Reached.`
        });
      }
    }
  }

  steps.push({
    action: 'FAIL',
    currentNode: null,
    successorNode: null,
    frontier: [...frontier],
    reached: new Set(reached),
    selected: [...selected],
    expanded: [...expanded],
    explanation: `Frontier is empty. Search failed.`
  });
  return steps;
}

/**
 * Event-driven Uniform-Cost Search (Priority Queue)
 */
function runUCS(start, goal) {
  const steps = [];
  let frontier = [{ node: start, parent: null, cost: 0 }]; // Priority Queue
  let reached = new Map();
  reached.set(start, 0);
  let selected = [];
  let expanded = [];

  const getReachedCopy = (map) => {
    const copy = {};
    for (let [k, v] of map) {
      copy[k] = v;
    }
    return copy;
  };

  const getFrontierCopy = (f) => f.map(item => ({ ...item }));

  steps.push({
    action: 'START',
    currentNode: null,
    successorNode: null,
    frontier: getFrontierCopy(frontier),
    reached: getReachedCopy(reached),
    selected: [...selected],
    expanded: [...expanded],
    explanation: `Initialize UCS. Add start node ${start} with g(n)=0 to priority queue.`
  });

  while (frontier.length > 0) {
    // Sort priority queue by cumulative path cost g(n)
    frontier.sort((a, b) => {
      if (a.cost !== b.cost) return a.cost - b.cost;
      return a.node.localeCompare(b.node); // alphabetical tie-breaker
    });

    const currentItem = frontier.shift(); // Remove minimum cost item
    const currentNode = currentItem.node;
    selected.push(currentNode);

    steps.push({
      action: 'SELECT',
      currentNode: currentNode,
      successorNode: null,
      frontier: getFrontierCopy(frontier),
      reached: getReachedCopy(reached),
      selected: [...selected],
      expanded: [...expanded],
      explanation: `Select node ${currentNode} with lowest cost g(n)=${currentItem.cost} from frontier.`
    });

    const isGoal = currentNode === goal;
    steps.push({
      action: 'GOAL_TEST',
      currentNode: currentNode,
      successorNode: null,
      frontier: getFrontierCopy(frontier),
      reached: getReachedCopy(reached),
      selected: [...selected],
      expanded: [...expanded],
      explanation: `Goal Test: Is selected node ${currentNode} the goal? ${isGoal ? 'YES!' : 'NO.'}`
    });

    if (isGoal) {
      const path = reconstructPath(currentItem);
      steps.push({
        action: 'GOAL_FOUND',
        currentNode: currentNode,
        successorNode: null,
        frontier: getFrontierCopy(frontier),
        reached: getReachedCopy(reached),
        selected: [...selected],
        expanded: [...expanded],
        path: path,
        cost: currentItem.cost,
        explanation: `Goal found on selection! Solution path: ${path.join(' → ')} with cost ${currentItem.cost}.`
      });
      return steps;
    }

    expanded.push(currentNode);
    steps.push({
      action: 'EXPAND',
      currentNode: currentNode,
      successorNode: null,
      frontier: getFrontierCopy(frontier),
      reached: getReachedCopy(reached),
      selected: [...selected],
      expanded: [...expanded],
      explanation: `Expand ${currentNode}. Generate successors alphabetically and calculate path costs.`
    });

    const successors = getSuccessorsAlphabetical(currentNode);
    for (let succ of successors) {
      const newCost = currentItem.cost + succ.cost;
      steps.push({
        action: 'GENERATE_SUCCESSOR',
        currentNode: currentNode,
        successorNode: succ.to,
        frontier: getFrontierCopy(frontier),
        reached: getReachedCopy(reached),
        selected: [...selected],
        expanded: [...expanded],
        explanation: `Generate successor ${succ.to}. New path cost g(${succ.to}) = g(${currentNode}) + c(${currentNode}, ${succ.to}) = ${currentItem.cost} + ${succ.cost} = ${newCost}.`
      });

      if (!reached.has(succ.to)) {
        reached.set(succ.to, newCost);
        frontier.push({ node: succ.to, parent: currentItem, cost: newCost });
        steps.push({
          action: 'UPDATE_FRONTIER',
          currentNode: currentNode,
          successorNode: succ.to,
          frontier: getFrontierCopy(frontier),
          reached: getReachedCopy(reached),
          selected: [...selected],
          expanded: [...expanded],
          explanation: `${succ.to} is new. Add to priority queue with cost ${newCost}.`
        });
      } else {
        const oldCost = reached.get(succ.to);
        if (newCost < oldCost) {
          reached.set(succ.to, newCost);
          
          // Update in priority queue
          const frontItem = frontier.find(item => item.node === succ.to);
          if (frontItem) {
            frontItem.cost = newCost;
            frontItem.parent = currentItem;
          } else {
            frontier.push({ node: succ.to, parent: currentItem, cost: newCost });
          }

          steps.push({
            action: 'UPDATE_FRONTIER',
            currentNode: currentNode,
            successorNode: succ.to,
            frontier: getFrontierCopy(frontier),
            reached: getReachedCopy(reached),
            selected: [...selected],
            expanded: [...expanded],
            explanation: `Cheaper path to ${succ.to} found: ${newCost} < ${oldCost}. Update cost in Reached and Priority Queue.`
          });
        } else {
          steps.push({
            action: 'SKIP_DUPLICATE',
            currentNode: currentNode,
            successorNode: succ.to,
            frontier: getFrontierCopy(frontier),
            reached: getReachedCopy(reached),
            selected: [...selected],
            expanded: [...expanded],
            explanation: `Path to ${succ.to} via ${currentNode} is not cheaper: ${newCost} ≥ ${oldCost}. Ignore.`
          });
        }
      }
    }
  }

  steps.push({
    action: 'FAIL',
    currentNode: null,
    successorNode: null,
    frontier: getFrontierCopy(frontier),
    reached: getReachedCopy(reached),
    selected: [...selected],
    expanded: [...expanded],
    explanation: `Frontier is empty. Search failed.`
  });
  return steps;
}

/**
 * Event-driven Iterative Deepening Search (Repeated Depth-Limited DFS)
 */
function runIDS(start, goal) {
  const steps = [];
  let limit = 0;
  const maxLimit = 6; // safety ceiling
  let goalFound = false;

  while (limit <= maxLimit && !goalFound) {
    steps.push({
      action: 'ITERATION_START',
      currentNode: null,
      successorNode: null,
      frontier: [],
      reached: new Set(),
      selected: [],
      expanded: [],
      limit: limit,
      depth: 0,
      explanation: `--- START ITERATION: Depth Limit = ${limit} ---`
    });

    let frontier = [{ node: start, parent: null, depth: 0 }]; // stack
    let reached = new Set([start]);
    let selected = [];
    let expanded = [];

    steps.push({
      action: 'START',
      currentNode: null,
      successorNode: null,
      frontier: [...frontier],
      reached: new Set(reached),
      selected: [...selected],
      expanded: [...expanded],
      limit: limit,
      depth: 0,
      explanation: `Initialize DFS for limit ${limit}. Push start node ${start} onto LIFO stack.`
    });

    while (frontier.length > 0) {
      const currentItem = frontier.pop();
      const currentNode = currentItem.node;
      const currentDepth = currentItem.depth;
      selected.push(currentNode);

      steps.push({
        action: 'SELECT',
        currentNode: currentNode,
        successorNode: null,
        frontier: [...frontier],
        reached: new Set(reached),
        selected: [...selected],
        expanded: [...expanded],
        limit: limit,
        depth: currentDepth,
        explanation: `Pop node ${currentNode} (depth ${currentDepth}) from LIFO stack.`
      });

      const isGoal = currentNode === goal;
      steps.push({
        action: 'GOAL_TEST',
        currentNode: currentNode,
        successorNode: null,
        frontier: [...frontier],
        reached: new Set(reached),
        selected: [...selected],
        expanded: [...expanded],
        limit: limit,
        depth: currentDepth,
        explanation: `Goal Test: Is selected node ${currentNode} the goal? ${isGoal ? 'YES!' : 'NO.'}`
      });

      if (isGoal) {
        const path = reconstructPath(currentItem);
        steps.push({
          action: 'GOAL_FOUND',
          currentNode: currentNode,
          successorNode: null,
          frontier: [...frontier],
          reached: new Set(reached),
          selected: [...selected],
          expanded: [...expanded],
          limit: limit,
          depth: currentDepth,
          path: path,
          cost: getPathCost(path),
          explanation: `Goal found at limit ${limit}! Solution path: ${path.join(' → ')}.`
        });
        goalFound = true;
        break;
      }

      if (currentDepth >= limit) {
        steps.push({
          action: 'DEPTH_LIMIT_REACHED',
          currentNode: currentNode,
          successorNode: null,
          frontier: [...frontier],
          reached: new Set(reached),
          selected: [...selected],
          expanded: [...expanded],
          limit: limit,
          depth: currentDepth,
          explanation: `Depth limit ${limit} reached at node ${currentNode}. Do not expand.`
        });
        continue;
      }

      expanded.push(currentNode);
      steps.push({
        action: 'EXPAND',
        currentNode: currentNode,
        successorNode: null,
        frontier: [...frontier],
        reached: new Set(reached),
        selected: [...selected],
        expanded: [...expanded],
        limit: limit,
        depth: currentDepth,
        explanation: `Expand ${currentNode} (depth ${currentDepth} < limit ${limit}). Generate successors.`
      });

      const successors = getSuccessorsAlphabetical(currentNode);
      const revSuccessors = [...successors].reverse(); // reverse for stack

      for (let succ of revSuccessors) {
        steps.push({
          action: 'GENERATE_SUCCESSOR',
          currentNode: currentNode,
          successorNode: succ.to,
          frontier: [...frontier],
          reached: new Set(reached),
          selected: [...selected],
          expanded: [...expanded],
          limit: limit,
          depth: currentDepth + 1,
          explanation: `Generate successor ${succ.to} at depth ${currentDepth + 1}.`
        });

        if (reached.has(succ.to)) {
          steps.push({
            action: 'SKIP_DUPLICATE',
            currentNode: currentNode,
            successorNode: succ.to,
            frontier: [...frontier],
            reached: new Set(reached),
            selected: [...selected],
            expanded: [...expanded],
            limit: limit,
            depth: currentDepth + 1,
            explanation: `${succ.to} already in Reached. Skip.`
          });
        } else {
          reached.add(succ.to);
          frontier.push({ node: succ.to, parent: currentItem, depth: currentDepth + 1 });
          steps.push({
            action: 'UPDATE_FRONTIER',
            currentNode: currentNode,
            successorNode: succ.to,
            frontier: [...frontier],
            reached: new Set(reached),
            selected: [...selected],
            expanded: [...expanded],
            limit: limit,
            depth: currentDepth + 1,
            explanation: `Push ${succ.to} onto stack.`
          });
        }
      }
    }

    if (!goalFound) {
      steps.push({
        action: 'ITERATION_END',
        currentNode: null,
        successorNode: null,
        frontier: [],
        reached: new Set(),
        selected: [],
        expanded: [],
        limit: limit,
        depth: 0,
        explanation: `Iteration finished for limit ${limit} without finding goal. Increment limit and restart.`
      });
      limit++;
    }
  }

  if (!goalFound) {
    steps.push({
      action: 'FAIL',
      currentNode: null,
      successorNode: null,
      frontier: [],
      reached: new Set(),
      selected: [],
      expanded: [],
      explanation: `Limit reached safety limit ${maxLimit} without finding goal.`
    });
  }

  return steps;
}

// Heuristic definitions
const DEFAULT_HEURISTICS_TO_G = {
  A: 6,
  B: 4,
  C: 6,
  D: 3,
  E: 1,
  F: 6,
  G: 0,
  H: 5
};

/**
 * Straight-line Euclidean distance heuristic function.
 * For default goal G, uses consistent, admissible integer values from standard AIMA model.
 * For any arbitrary goal state, computes Euclidean distance scaled appropriately.
 */
function getHeuristic(node, goal) {
  if (node === goal) return 0;
  if (goal === 'G' && DEFAULT_HEURISTICS_TO_G[node] !== undefined) {
    return DEFAULT_HEURISTICS_TO_G[node];
  }
  const n1 = NODE_LAYOUT[node];
  const n2 = NODE_LAYOUT[goal];
  if (!n1 || !n2) return 0;
  return Math.round(Math.hypot(n1.x - n2.x, n1.y - n2.y) * 7);
}

/**
 * Event-driven A* Search (Priority Queue ordered by f(n) = g(n) + h(n))
 */
function runAStar(start, goal) {
  const steps = [];
  const startH = getHeuristic(start, goal);
  let frontier = [{ node: start, parent: null, cost: 0, h: startH, f: startH }]; // Priority Queue by f(n)
  let reached = new Map();
  reached.set(start, 0);
  let selected = [];
  let expanded = [];

  const getReachedCopy = (map) => {
    const copy = {};
    for (let [k, v] of map) {
      copy[k] = v;
    }
    return copy;
  };

  const getFrontierCopy = (f) => f.map(item => ({ ...item }));

  steps.push({
    action: 'START',
    currentNode: null,
    successorNode: null,
    frontier: getFrontierCopy(frontier),
    reached: getReachedCopy(reached),
    selected: [...selected],
    expanded: [...expanded],
    explanation: `Initialize A* Search. Add start node ${start} with g(n)=0, h(n)=${startH} ⇒ f(n)=${startH} to priority queue.`
  });

  while (frontier.length > 0) {
    // Sort priority queue by evaluation function f(n) = g(n) + h(n)
    frontier.sort((a, b) => {
      if (a.f !== b.f) return a.f - b.f;
      if (a.cost !== b.cost) return a.cost - b.cost;
      return a.node.localeCompare(b.node); // alphabetical tie-breaker
    });

    const currentItem = frontier.shift(); // Remove minimum f(n) item
    const currentNode = currentItem.node;
    selected.push(currentNode);

    steps.push({
      action: 'SELECT',
      currentNode: currentNode,
      successorNode: null,
      frontier: getFrontierCopy(frontier),
      reached: getReachedCopy(reached),
      selected: [...selected],
      expanded: [...expanded],
      explanation: `Select node ${currentNode} with lowest f(n) = g(n) + h(n) = ${currentItem.cost} + ${currentItem.h} = ${currentItem.f} from frontier.`
    });

    const isGoal = currentNode === goal;
    steps.push({
      action: 'GOAL_TEST',
      currentNode: currentNode,
      successorNode: null,
      frontier: getFrontierCopy(frontier),
      reached: getReachedCopy(reached),
      selected: [...selected],
      expanded: [...expanded],
      explanation: `Goal Test: Is selected node ${currentNode} the goal? ${isGoal ? 'YES!' : 'NO.'}`
    });

    if (isGoal) {
      const path = reconstructPath(currentItem);
      steps.push({
        action: 'GOAL_FOUND',
        currentNode: currentNode,
        successorNode: null,
        frontier: getFrontierCopy(frontier),
        reached: getReachedCopy(reached),
        selected: [...selected],
        expanded: [...expanded],
        path: path,
        cost: currentItem.cost,
        explanation: `Goal found on selection! Solution path: ${path.join(' → ')} with cost ${currentItem.cost}.`
      });
      return steps;
    }

    expanded.push(currentNode);
    steps.push({
      action: 'EXPAND',
      currentNode: currentNode,
      successorNode: null,
      frontier: getFrontierCopy(frontier),
      reached: getReachedCopy(reached),
      selected: [...selected],
      expanded: [...expanded],
      explanation: `Expand ${currentNode}. Generate successors alphabetically and evaluate f(n) = g(n) + h(n).`
    });

    const successors = getSuccessorsAlphabetical(currentNode);
    for (let succ of successors) {
      const newCost = currentItem.cost + succ.cost;
      const succH = getHeuristic(succ.to, goal);
      const newF = newCost + succH;

      steps.push({
        action: 'GENERATE_SUCCESSOR',
        currentNode: currentNode,
        successorNode: succ.to,
        frontier: getFrontierCopy(frontier),
        reached: getReachedCopy(reached),
        selected: [...selected],
        expanded: [...expanded],
        explanation: `Generate successor ${succ.to}. g(${succ.to}) = ${currentItem.cost} + ${succ.cost} = ${newCost}, h(${succ.to}) = ${succH} ⇒ f(${succ.to}) = ${newF}.`
      });

      if (!reached.has(succ.to)) {
        reached.set(succ.to, newCost);
        frontier.push({ node: succ.to, parent: currentItem, cost: newCost, h: succH, f: newF });
        steps.push({
          action: 'UPDATE_FRONTIER',
          currentNode: currentNode,
          successorNode: succ.to,
          frontier: getFrontierCopy(frontier),
          reached: getReachedCopy(reached),
          selected: [...selected],
          expanded: [...expanded],
          explanation: `${succ.to} is new. Add to priority queue with f(${succ.to}) = ${newF} (g=${newCost}, h=${succH}).`
        });
      } else {
        const oldCost = reached.get(succ.to);
        if (newCost < oldCost) {
          reached.set(succ.to, newCost);

          const frontItem = frontier.find(item => item.node === succ.to);
          if (frontItem) {
            frontItem.cost = newCost;
            frontItem.h = succH;
            frontItem.f = newF;
            frontItem.parent = currentItem;
          } else {
            frontier.push({ node: succ.to, parent: currentItem, cost: newCost, h: succH, f: newF });
          }

          steps.push({
            action: 'UPDATE_FRONTIER',
            currentNode: currentNode,
            successorNode: succ.to,
            frontier: getFrontierCopy(frontier),
            reached: getReachedCopy(reached),
            selected: [...selected],
            expanded: [...expanded],
            explanation: `Cheaper path to ${succ.to} found (g: ${newCost} < ${oldCost}). Update f(${succ.to}) = ${newF} in Reached and Priority Queue.`
          });
        } else {
          steps.push({
            action: 'SKIP_DUPLICATE',
            currentNode: currentNode,
            successorNode: succ.to,
            frontier: getFrontierCopy(frontier),
            reached: getReachedCopy(reached),
            selected: [...selected],
            expanded: [...expanded],
            explanation: `Path to ${succ.to} via ${currentNode} is not cheaper (g: ${newCost} ≥ ${oldCost}). Ignore.`
          });
        }
      }
    }
  }

  steps.push({
    action: 'FAIL',
    currentNode: null,
    successorNode: null,
    frontier: getFrontierCopy(frontier),
    reached: getReachedCopy(reached),
    selected: [...selected],
    expanded: [...expanded],
    explanation: `Frontier is empty. Search failed.`
  });
  return steps;
}

/**
 * Event-driven Greedy Best-First Search (Priority Queue ordered by h(n))
 */
function runGreedy(start, goal) {
  const steps = [];
  const startH = getHeuristic(start, goal);
  let frontier = [{ node: start, parent: null, cost: 0, h: startH }]; // Priority Queue by h(n)
  let reached = new Set([start]);
  let selected = [];
  let expanded = [];

  const getFrontierCopy = (f) => f.map(item => ({ ...item }));

  steps.push({
    action: 'START',
    currentNode: null,
    successorNode: null,
    frontier: getFrontierCopy(frontier),
    reached: new Set(reached),
    selected: [...selected],
    expanded: [...expanded],
    explanation: `Initialize Greedy Best-First Search. Add start node ${start} with h(n)=${startH} to priority queue.`
  });

  while (frontier.length > 0) {
    // Sort priority queue by heuristic evaluation h(n)
    frontier.sort((a, b) => {
      if (a.h !== b.h) return a.h - b.h;
      return a.node.localeCompare(b.node); // alphabetical tie-breaker
    });

    const currentItem = frontier.shift(); // Remove minimum h(n) item
    const currentNode = currentItem.node;
    selected.push(currentNode);

    steps.push({
      action: 'SELECT',
      currentNode: currentNode,
      successorNode: null,
      frontier: getFrontierCopy(frontier),
      reached: new Set(reached),
      selected: [...selected],
      expanded: [...expanded],
      explanation: `Select node ${currentNode} with lowest heuristic h(n)=${currentItem.h} from frontier.`
    });

    const isGoal = currentNode === goal;
    steps.push({
      action: 'GOAL_TEST',
      currentNode: currentNode,
      successorNode: null,
      frontier: getFrontierCopy(frontier),
      reached: new Set(reached),
      selected: [...selected],
      expanded: [...expanded],
      explanation: `Goal Test: Is selected node ${currentNode} the goal? ${isGoal ? 'YES!' : 'NO.'}`
    });

    if (isGoal) {
      const path = reconstructPath(currentItem);
      const cost = getPathCost(path);
      steps.push({
        action: 'GOAL_FOUND',
        currentNode: currentNode,
        successorNode: null,
        frontier: getFrontierCopy(frontier),
        reached: new Set(reached),
        selected: [...selected],
        expanded: [...expanded],
        path: path,
        cost: cost,
        explanation: `Goal found on selection! Solution path: ${path.join(' → ')} with cost ${cost}.`
      });
      return steps;
    }

    expanded.push(currentNode);
    steps.push({
      action: 'EXPAND',
      currentNode: currentNode,
      successorNode: null,
      frontier: getFrontierCopy(frontier),
      reached: new Set(reached),
      selected: [...selected],
      expanded: [...expanded],
      explanation: `Expand ${currentNode}. Generate successors alphabetically and evaluate heuristic h(n).`
    });

    const successors = getSuccessorsAlphabetical(currentNode);
    for (let succ of successors) {
      const succH = getHeuristic(succ.to, goal);
      const newCost = currentItem.cost + succ.cost;

      steps.push({
        action: 'GENERATE_SUCCESSOR',
        currentNode: currentNode,
        successorNode: succ.to,
        frontier: getFrontierCopy(frontier),
        reached: new Set(reached),
        selected: [...selected],
        expanded: [...expanded],
        explanation: `Generate successor ${succ.to}. Heuristic h(${succ.to}) = ${succH}.`
      });

      if (reached.has(succ.to)) {
        steps.push({
          action: 'SKIP_DUPLICATE',
          currentNode: currentNode,
          successorNode: succ.to,
          frontier: getFrontierCopy(frontier),
          reached: new Set(reached),
          selected: [...selected],
          expanded: [...expanded],
          explanation: `${succ.to} already in Reached. Skip.`
        });
      } else {
        reached.add(succ.to);
        frontier.push({ node: succ.to, parent: currentItem, cost: newCost, h: succH });
        steps.push({
          action: 'UPDATE_FRONTIER',
          currentNode: currentNode,
          successorNode: succ.to,
          frontier: getFrontierCopy(frontier),
          reached: new Set(reached),
          selected: [...selected],
          expanded: [...expanded],
          explanation: `${succ.to} is new. Add to priority queue with h(${succ.to}) = ${succH}.`
        });
      }
    }
  }

  steps.push({
    action: 'FAIL',
    currentNode: null,
    successorNode: null,
    frontier: getFrontierCopy(frontier),
    reached: new Set(reached),
    selected: [...selected],
    expanded: [...expanded],
    explanation: `Frontier is empty. Search failed.`
  });
  return steps;
}


// ---------------------------------------------------------------------------
// Bidirectional Best-First Search (bidirectional uniform-cost, meet in the middle)
// Ref: https://github.com/aimacode/aima-python (bidirectional_search family)
// ---------------------------------------------------------------------------
function getPredecessorsAlphabetical(node) {
  const preds = [];
  Object.entries(GRAPH).forEach(([from, edges]) => {
    edges.forEach(e => { if (e.to === node) preds.push({ to: from, cost: e.cost }); });
  });
  return preds.sort((a, b) => a.to.localeCompare(b.to));
}

function runBIBF(start, goal) {
  const steps = [];

  if (start === goal) {
    steps.push({
      action: 'GOAL_FOUND', currentNode: start, successorNode: null,
      frontier: [], reached: { [start]: 0 }, reachedDetail: { f: { [start]: 0 }, b: { [start]: 0 } },
      selected: [], expanded: [], path: [start], cost: 0,
      explanation: `Start equals goal (${start}). Trivial solution.`
    });
    return steps;
  }

  let frontierF = [{ node: start, parent: null, cost: 0 }];
  let frontierB = [{ node: goal, parent: null, cost: 0 }];
  let reachedF = new Map([[start, { cost: 0, item: frontierF[0] }]]);
  let reachedB = new Map([[goal, { cost: 0, item: frontierB[0] }]]);
  let selected = [];
  let expanded = [];
  let best = null; // { cost, meetNode, fItem, bItem }

  const frontierSnapshot = () => [
    ...frontierF.map(i => ({ ...i, dir: 'F' })),
    ...frontierB.map(i => ({ ...i, dir: 'B' })),
  ];
  const reachedSnapshot = () => {
    const o = {};
    reachedF.forEach((v, k) => { o[k] = v.cost; });
    reachedB.forEach((v, k) => { o[k] = (o[k] !== undefined) ? Math.min(o[k], v.cost) : v.cost; });
    return o;
  };
  const reachedDetail = () => {
    const f = {}, b = {};
    reachedF.forEach((v, k) => { f[k] = v.cost; });
    reachedB.forEach((v, k) => { b[k] = v.cost; });
    return { f, b };
  };

  const checkMeeting = (node) => {
    if (reachedF.has(node) && reachedB.has(node)) {
      const cost = reachedF.get(node).cost + reachedB.get(node).cost;
      if (!best || cost < best.cost) {
        best = { cost, meetNode: node, fItem: reachedF.get(node).item, bItem: reachedB.get(node).item };
      }
      return true;
    }
    return false;
  };

  steps.push({
    action: 'START', currentNode: null, successorNode: null,
    frontier: frontierSnapshot(), reached: reachedSnapshot(), reachedDetail: reachedDetail(),
    selected: [...selected], expanded: [...expanded],
    explanation: `Initialize BIBF. Forward frontier = {${start}} (g=0). Backward frontier = {${goal}} (g=0).`
  });

  const buildSolution = () => {
    const pathF = reconstructPathBibf(best.fItem);          // start -> ... -> meet
    const pathB = reconstructPathBibf(best.bItem).reverse(); // meet -> ... -> goal
    return [...pathF, ...pathB.slice(1)];
  };
  // Local path builder: BIBF's frontier items use {node, parent, cost}, distinct
  // shape from the {node, parent} items reconstructPath() expects elsewhere.
  function reconstructPathBibf(item) {
    const path = [];
    let curr = item;
    while (curr) { path.push(curr.node); curr = curr.parent; }
    return path.reverse();
  }

  let iterations = 0;
  const MAX_ITER = 200; // safety
  while (frontierF.length > 0 && frontierB.length > 0 && iterations < MAX_ITER) {
    iterations++;

    frontierF.sort((a, b) => (a.cost - b.cost) || a.node.localeCompare(b.node));
    frontierB.sort((a, b) => (a.cost - b.cost) || a.node.localeCompare(b.node));
    const topF = frontierF[0].cost;
    const topB = frontierB[0].cost;

    // Standard bidirectional termination bound: stop once no unexplored
    // combination could possibly beat the best meeting cost found so far.
    if (best && topF + topB >= best.cost) {
      break;
    }

    // Expand whichever frontier currently has the cheaper top priority
    // (tie -> forward), alternating direction as costs demand.
    const expandForward = topF <= topB;
    const dir = expandForward ? 'F' : 'B';
    const frontier = expandForward ? frontierF : frontierB;
    const reachedThis = expandForward ? reachedF : reachedB;

    const currentItem = frontier.shift();
    const currentNode = currentItem.node;
    selected.push(`${currentNode}(${dir})`);

    steps.push({
      action: 'SELECT', currentNode, successorNode: null, dir,
      frontier: frontierSnapshot(), reached: reachedSnapshot(), reachedDetail: reachedDetail(),
      selected: [...selected], expanded: [...expanded],
      explanation: `Select ${currentNode} from the ${expandForward ? 'FORWARD' : 'BACKWARD'} frontier (lowest g=${currentItem.cost}).`
    });

    const metOnSelect = checkMeeting(currentNode);
    if (metOnSelect) {
      steps.push({
        action: 'MEET', currentNode, successorNode: null, dir,
        frontier: frontierSnapshot(), reached: reachedSnapshot(), reachedDetail: reachedDetail(),
        selected: [...selected], expanded: [...expanded],
        explanation: `${currentNode} has now been reached from BOTH directions. Candidate meeting cost = ${best.cost}.`
      });
    }

    expanded.push(`${currentNode}(${dir})`);
    steps.push({
      action: 'EXPAND', currentNode, successorNode: null, dir,
      frontier: frontierSnapshot(), reached: reachedSnapshot(), reachedDetail: reachedDetail(),
      selected: [...selected], expanded: [...expanded],
      explanation: `Expand ${currentNode} in the ${expandForward ? 'FORWARD' : 'BACKWARD'} direction (${expandForward ? 'successors' : 'predecessors'}, alphabetically).`
    });

    const neighbors = expandForward ? getSuccessorsAlphabetical(currentNode) : getPredecessorsAlphabetical(currentNode);
    for (const nb of neighbors) {
      const newCost = currentItem.cost + nb.cost;
      steps.push({
        action: 'GENERATE_SUCCESSOR', currentNode, successorNode: nb.to, dir,
        frontier: frontierSnapshot(), reached: reachedSnapshot(), reachedDetail: reachedDetail(),
        selected: [...selected], expanded: [...expanded],
        explanation: `Generate ${nb.to} from ${currentNode} (${dir}). g(${nb.to}) = ${currentItem.cost} + ${nb.cost} = ${newCost}.`
      });

      const existing = reachedThis.get(nb.to);
      if (!existing || newCost < existing.cost) {
        const childItem = { node: nb.to, parent: currentItem, cost: newCost };
        reachedThis.set(nb.to, { cost: newCost, item: childItem });
        const idx = frontier.findIndex(f => f.node === nb.to);
        if (idx >= 0) frontier[idx] = childItem; else frontier.push(childItem);

        steps.push({
          action: 'UPDATE_FRONTIER', currentNode, successorNode: nb.to, dir,
          frontier: frontierSnapshot(), reached: reachedSnapshot(), reachedDetail: reachedDetail(),
          selected: [...selected], expanded: [...expanded],
          explanation: `${existing ? 'Cheaper path' : 'New node'}: add/update ${nb.to} in the ${expandForward ? 'FORWARD' : 'BACKWARD'} frontier with g=${newCost}.`
        });

        if (checkMeeting(nb.to)) {
          steps.push({
            action: 'MEET', currentNode, successorNode: nb.to, dir,
            frontier: frontierSnapshot(), reached: reachedSnapshot(), reachedDetail: reachedDetail(),
            selected: [...selected], expanded: [...expanded],
            explanation: `${nb.to} has now been reached from BOTH directions. Candidate meeting cost = ${best.cost}.`
          });
        }
      } else {
        steps.push({
          action: 'SKIP_DUPLICATE', currentNode, successorNode: nb.to, dir,
          frontier: frontierSnapshot(), reached: reachedSnapshot(), reachedDetail: reachedDetail(),
          selected: [...selected], expanded: [...expanded],
          explanation: `Path to ${nb.to} via ${currentNode} (${dir}) is not cheaper (${newCost} >= ${existing.cost}). Ignore.`
        });
      }
    }
  }

  if (best) {
    const path = buildSolution();
    steps.push({
      action: 'GOAL_FOUND', currentNode: best.meetNode, successorNode: null,
      frontier: frontierSnapshot(), reached: reachedSnapshot(), reachedDetail: reachedDetail(),
      selected: [...selected], expanded: [...expanded],
      path, cost: best.cost, meetNode: best.meetNode,
      explanation: `Both frontiers can no longer improve on meeting cost ${best.cost}. Best meeting node: ${best.meetNode}. Solution path: ${path.join(' -> ')}.`
    });
  } else {
    steps.push({
      action: 'FAIL', currentNode: null, successorNode: null,
      frontier: frontierSnapshot(), reached: reachedSnapshot(), reachedDetail: reachedDetail(),
      selected: [...selected], expanded: [...expanded],
      explanation: `Frontiers exhausted without the two searches meeting. Search failed.`
    });
  }

  return steps;
}

// ---------------------------------------------------------------------------
// Simplified Memory-Bounded A* (SMA*)
// Ref: https://github.com/aimacode/aima-python (search.py notes on SMA*)
// ---------------------------------------------------------------------------
let __smaIdCounter = 0;
function makeSmaNode(state, parent, g, h) {
  return {
    id: __smaIdCounter++,
    state,
    parent,
    children: [],             // currently in-memory children (generated & not forgotten)
    g,
    h,
    f: parent ? Math.max(parent.f, g + h) : g + h, // monotonic backed-up f-value
    fullyExpanded: false,     // all successors ever generated (may since be forgotten)
    forgottenBestF: Infinity, // best f among children we've forgotten
    depth: parent ? parent.depth + 1 : 0,
  };
}

function smaAncestorStates(node) {
  const states = new Set();
  let n = node;
  while (n) { states.add(n.state); n = n.parent; }
  return states;
}

function smaPath(node) {
  const path = [];
  let n = node;
  while (n) { path.push(n.state); n = n.parent; }
  return path.reverse();
}

function runSMA(start, goal, maxNodes = 6) {
  const steps = [];
  const root = makeSmaNode(start, null, 0, getHeuristic(start, goal));
  let allNodes = [root]; // every node currently held in memory
  let selected = [];
  let expanded = [];

  const isLeaf = (n) => n.children.length === 0;
  // A node is "selectable" if it's a leaf with f < infinity (not a proven
  // dead end) -- either not yet expanded, or fully expanded with forgotten
  // children worth regenerating.
  const isSelectable = (n) => n.f < Infinity && isLeaf(n);

  const frontierSnapshot = () =>
    allNodes.filter(isSelectable).map(n => ({ node: n.state, cost: n.g, h: n.h, f: n.f, id: n.id }));
  const reachedSnapshot = () => {
    const o = {};
    allNodes.forEach(n => { if (o[n.state] === undefined || n.g < o[n.state]) o[n.state] = n.g; });
    return o;
  };

  steps.push({
    action: 'START', currentNode: null, successorNode: null,
    frontier: frontierSnapshot(), reached: reachedSnapshot(),
    selected: [...selected], expanded: [...expanded],
    maxNodes, memoryUsed: allNodes.length,
    explanation: `Initialize SMA*. Root ${start}: g=0, h=${root.h}, f=${root.f}. Memory bound = ${maxNodes} nodes.`
  });

  let iterations = 0;
  const MAX_ITER = 300;

  while (iterations < MAX_ITER) {
    iterations++;

    const leaves = allNodes.filter(isSelectable);
    if (leaves.length === 0) {
      steps.push({
        action: 'FAIL', currentNode: null, successorNode: null,
        frontier: [], reached: reachedSnapshot(), selected: [...selected], expanded: [...expanded],
        maxNodes, memoryUsed: allNodes.length,
        explanation: `No selectable node remains in memory (everything forgotten). Search failed under the ${maxNodes}-node memory bound.`
      });
      return steps;
    }

    // Pick lowest-f leaf; tie-break toward greater depth (standard SMA*
    // depth-first preference under ties), then insertion order.
    leaves.sort((a, b) => (a.f - b.f) || (b.depth - a.depth) || (a.id - b.id));
    const node = leaves[0];
    selected.push(node.state);

    steps.push({
      action: 'SELECT', currentNode: node.state, successorNode: null,
      frontier: frontierSnapshot(), reached: reachedSnapshot(),
      selected: [...selected], expanded: [...expanded],
      maxNodes, memoryUsed: allNodes.length,
      explanation: `Select ${node.state} with the lowest f(n)=${node.f} among nodes in memory (g=${node.g}, h=${node.h}).`
    });

    const isGoal = node.state === goal;
    steps.push({
      action: 'GOAL_TEST', currentNode: node.state, successorNode: null,
      frontier: frontierSnapshot(), reached: reachedSnapshot(),
      selected: [...selected], expanded: [...expanded],
      maxNodes, memoryUsed: allNodes.length,
      explanation: `Goal Test: Is ${node.state} the goal? ${isGoal ? 'YES!' : 'NO.'}`
    });

    if (isGoal) {
      const path = smaPath(node);
      steps.push({
        action: 'GOAL_FOUND', currentNode: node.state, successorNode: null,
        frontier: frontierSnapshot(), reached: reachedSnapshot(),
        selected: [...selected], expanded: [...expanded],
        path, cost: node.g, maxNodes, memoryUsed: allNodes.length,
        explanation: `Goal found! f(n) = g(n) = ${node.g} (h=0 at the goal). Solution path: ${path.join(' -> ')}.`
      });
      return steps;
    }

    const wasRegeneration = node.fullyExpanded && node.forgottenBestF < Infinity;
    expanded.push(node.state);
    steps.push({
      action: wasRegeneration ? 'REGENERATE' : 'EXPAND', currentNode: node.state, successorNode: null,
      frontier: frontierSnapshot(), reached: reachedSnapshot(),
      selected: [...selected], expanded: [...expanded],
      maxNodes, memoryUsed: allNodes.length,
      explanation: wasRegeneration
        ? `${node.state} was expanded before but its children were forgotten to save memory. Regenerate its successors now.`
        : `Expand ${node.state}. Generate successors alphabetically.`
    });

    const ancestors = smaAncestorStates(node);
    const successors = getSuccessorsAlphabetical(node.state).filter(s => !ancestors.has(s.to));
    node.fullyExpanded = true;

    if (successors.length === 0) {
      node.f = Infinity; // dead end: never worth selecting again
      steps.push({
        action: 'DEAD_END', currentNode: node.state, successorNode: null,
        frontier: frontierSnapshot(), reached: reachedSnapshot(),
        selected: [...selected], expanded: [...expanded],
        maxNodes, memoryUsed: allNodes.length,
        explanation: `${node.state} has no unvisited successors on this path. Set f(${node.state}) = infinity so it is never reselected.`
      });
    }

    for (const s of successors) {
      const childG = node.g + s.cost;
      const childH = getHeuristic(s.to, goal);
      const child = makeSmaNode(s.to, node, childG, childH);
      node.children.push(child);
      allNodes.push(child);

      steps.push({
        action: 'GENERATE_SUCCESSOR', currentNode: node.state, successorNode: s.to,
        frontier: frontierSnapshot(), reached: reachedSnapshot(),
        selected: [...selected], expanded: [...expanded],
        maxNodes, memoryUsed: allNodes.length,
        explanation: `Generate ${s.to}: g=${childG}, h=${childH}, f=max(parent f=${node.f}, ${childG}+${childH})=${child.f}.`
      });

      // Enforce the memory bound: drop the worst (highest-f) leaf, backing its
      // f-value up to its parent, until we're back within maxNodes. Never
      // drop the node we just created, and never drop the root (it has no parent).
      while (allNodes.length > maxNodes) {
        const droppable = allNodes.filter(n => isLeaf(n) && n.parent !== null && n.id !== child.id);
        if (droppable.length === 0) break; // nothing safe to drop
        droppable.sort((a, b) => (b.f - a.f) || (a.depth - b.depth) || (a.id - b.id));
        const worst = droppable[0];

        // Remove from memory & from its parent's child list.
        allNodes = allNodes.filter(n => n.id !== worst.id);
        const p = worst.parent;
        p.children = p.children.filter(c => c.id !== worst.id);
        p.forgottenBestF = Math.min(p.forgottenBestF, worst.f);

        steps.push({
          action: 'FORGET', currentNode: p.state, successorNode: worst.state,
          frontier: frontierSnapshot(), reached: reachedSnapshot(),
          selected: [...selected], expanded: [...expanded],
          maxNodes, memoryUsed: allNodes.length,
          explanation: `Memory full (>${maxNodes} nodes). Forget worst leaf ${worst.state} (f=${worst.f}). Back up f=${worst.f} to parent ${p.state}.`
        });

        // Cascade: if the parent has now forgotten every child it ever made,
        // it becomes a leaf again and inherits the best forgotten f-value.
        if (p.children.length === 0 && p.fullyExpanded) {
          p.f = Math.max(p.f, p.forgottenBestF);
          steps.push({
            action: 'BACKUP', currentNode: p.state, successorNode: null,
            frontier: frontierSnapshot(), reached: reachedSnapshot(),
            selected: [...selected], expanded: [...expanded],
            maxNodes, memoryUsed: allNodes.length,
            explanation: `${p.state} has no remaining children in memory. It becomes a leaf again with backed-up f(${p.state})=${p.f}.`
          });
        }
      }
    }
  }

  steps.push({
    action: 'FAIL', currentNode: null, successorNode: null,
    frontier: frontierSnapshot(), reached: reachedSnapshot(), selected: [...selected], expanded: [...expanded],
    maxNodes, memoryUsed: allNodes.length,
    explanation: `Safety iteration limit reached without finding the goal.`
  });
  return steps;
}

// Export to window scope
window.GRAPH = GRAPH;
window.NODE_LAYOUT = NODE_LAYOUT;
window.DEFAULT_HEURISTICS_TO_G = DEFAULT_HEURISTICS_TO_G;
window.getHeuristic = getHeuristic;
window.runBFS = runBFS;
window.runDFS = runDFS;
window.runUCS = runUCS;
window.runIDS = runIDS;
window.runAStar = runAStar;
window.runGreedy = runGreedy;
window.runGBFS = runGreedy;
window.runBIBF = runBIBF;
window.runSMA = runSMA;
window.getPredecessorsAlphabetical = getPredecessorsAlphabetical;

