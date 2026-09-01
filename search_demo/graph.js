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

