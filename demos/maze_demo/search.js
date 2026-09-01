/**
 * Search Algorithms for comparing complexity in the Maze Demo.
 * Includes: BFS, DFS, IDS, UCS, A*, and Greedy Best-First Search.
 */

function getPathCost(graph, path) {
  let cost = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const from = path[i];
    const to = path[i + 1];
    const edges = graph[from] || [];
    const edge = edges.find(e => e.to === to);
    if (edge) cost += edge.cost;
  }
  return cost;
}

function getHeuristic(nodeLabel, goalLabel, decisionPoints) {
  let node = decisionPoints.find(dp => dp.label === nodeLabel);
  let goal = decisionPoints.find(dp => dp.label === goalLabel);
  if (!node || !goal) return 0;
  // Manhattan distance
  return Math.abs(node.x - goal.x) + Math.abs(node.y - goal.y);
}

/**
 * BFS: Breadth-First Search (FIFO Queue)
 */
function mazeBFS(graph, start, goal) {
  let frontier = [[start]];
  let reached = new Set([start]);
  let expanded = [];

  while (frontier.length > 0) {
    let path = frontier.shift();
    let node = path[path.length - 1];

    if (node === goal) {
      return { path, cost: getPathCost(graph, path), expandedCount: expanded.length, expandedOrder: expanded };
    }

    expanded.push(node);

    let neighbors = graph[node] || [];
    let sortedNeighbors = [...neighbors].sort((a, b) => a.to.localeCompare(b.to));
    for (let neighbor of sortedNeighbors) {
      if (!reached.has(neighbor.to)) {
        reached.add(neighbor.to);
        frontier.push([...path, neighbor.to]);
      }
    }
  }
  return { path: [], cost: Infinity, expandedCount: expanded.length, expandedOrder: expanded };
}

/**
 * DFS: Depth-First Search (LIFO Stack)
 */
function mazeDFS(graph, start, goal) {
  let frontier = [[start]];
  let reached = new Set();
  let expanded = [];

  while (frontier.length > 0) {
    let path = frontier.pop();
    let node = path[path.length - 1];

    if (node === goal) {
      return { path, cost: getPathCost(graph, path), expandedCount: expanded.length, expandedOrder: expanded };
    }

    if (!reached.has(node)) {
      reached.add(node);
      expanded.push(node);

      let neighbors = graph[node] || [];
      // Push in reverse alphabetical order so alphabetical selection is popped first
      let sortedNeighbors = [...neighbors].sort((a, b) => b.to.localeCompare(a.to));
      for (let neighbor of sortedNeighbors) {
        if (!reached.has(neighbor.to)) {
          frontier.push([...path, neighbor.to]);
        }
      }
    }
  }
  return { path: [], cost: Infinity, expandedCount: expanded.length, expandedOrder: expanded };
}

/**
 * IDS: Iterative Deepening Search (Depth-First iterations)
 */
function mazeIDS(graph, start, goal) {
  let depth = 0;
  let totalExpanded = [];

  function runDLS(node, limit, currentDepth, path) {
    if (node === goal) {
      return { found: true, path };
    }
    if (currentDepth >= limit) {
      return { found: false };
    }

    totalExpanded.push(node);

    let neighbors = graph[node] || [];
    let sortedNeighbors = [...neighbors].sort((a, b) => a.to.localeCompare(b.to));
    for (let neighbor of sortedNeighbors) {
      if (!path.includes(neighbor.to)) {
        let result = runDLS(neighbor.to, limit, currentDepth + 1, [...path, neighbor.to]);
        if (result.found) return result;
      }
    }
    return { found: false };
  }

  while (depth < 100) {
    let result = runDLS(start, depth, 0, [start]);
    if (result.found) {
      return {
        path: result.path,
        cost: getPathCost(graph, result.path),
        expandedCount: totalExpanded.length,
        expandedOrder: [...totalExpanded]
      };
    }
    depth++;
  }
  return { path: [], cost: Infinity, expandedCount: totalExpanded.length, expandedOrder: totalExpanded };
}

/**
 * UCS: Uniform-Cost Search (Dijkstra)
 */
function mazeUCS(graph, start, goal) {
  let frontier = [{ path: [start], cost: 0 }];
  let reached = new Map();
  reached.set(start, 0);
  let expanded = [];

  while (frontier.length > 0) {
    frontier.sort((a, b) => a.cost - b.cost || a.path[a.path.length-1].localeCompare(b.path[b.path.length-1]));
    let current = frontier.shift();
    let path = current.path;
    let node = path[path.length - 1];

    if (node === goal) {
      return { path, cost: current.cost, expandedCount: expanded.length, expandedOrder: expanded };
    }

    expanded.push(node);

    let neighbors = graph[node] || [];
    for (let neighbor of neighbors) {
      let newCost = current.cost + neighbor.cost;
      if (!reached.has(neighbor.to) || newCost < reached.get(neighbor.to)) {
        reached.set(neighbor.to, newCost);
        frontier.push({ path: [...path, neighbor.to], cost: newCost });
      }
    }
  }
  return { path: [], cost: Infinity, expandedCount: expanded.length, expandedOrder: expanded };
}

/**
 * A*: A-Star Search (f = g + h)
 */
function mazeAStar(graph, start, goal, decisionPoints) {
  let frontier = [{ path: [start], cost: 0, f: getHeuristic(start, goal, decisionPoints) }];
  let reached = new Map();
  reached.set(start, 0);
  let expanded = [];

  while (frontier.length > 0) {
    frontier.sort((a, b) => a.f - b.f || a.path[a.path.length-1].localeCompare(b.path[b.path.length-1]));
    let current = frontier.shift();
    let path = current.path;
    let node = path[path.length - 1];

    if (node === goal) {
      return { path, cost: current.cost, expandedCount: expanded.length, expandedOrder: expanded };
    }

    expanded.push(node);

    let neighbors = graph[node] || [];
    for (let neighbor of neighbors) {
      let newCost = current.cost + neighbor.cost;
      if (!reached.has(neighbor.to) || newCost < reached.get(neighbor.to)) {
        reached.set(neighbor.to, newCost);
        let h = getHeuristic(neighbor.to, goal, decisionPoints);
        frontier.push({ path: [...path, neighbor.to], cost: newCost, f: newCost + h });
      }
    }
  }
  return { path: [], cost: Infinity, expandedCount: expanded.length, expandedOrder: expanded };
}

/**
 * Greedy: Greedy Best-First Search (f = h)
 */
function mazeGreedy(graph, start, goal, decisionPoints) {
  let frontier = [{ path: [start], h: getHeuristic(start, goal, decisionPoints) }];
  let reached = new Set([start]);
  let expanded = [];

  while (frontier.length > 0) {
    frontier.sort((a, b) => a.h - b.h || a.path[a.path.length-1].localeCompare(b.path[b.path.length-1]));
    let current = frontier.shift();
    let path = current.path;
    let node = path[path.length - 1];

    if (node === goal) {
      return { path, cost: getPathCost(graph, path), expandedCount: expanded.length, expandedOrder: expanded };
    }

    expanded.push(node);

    let neighbors = graph[node] || [];
    for (let neighbor of neighbors) {
      if (!reached.has(neighbor.to)) {
        reached.add(neighbor.to);
        let h = getHeuristic(neighbor.to, goal, decisionPoints);
        frontier.push({ path: [...path, neighbor.to], h });
      }
    }
  }
  return { path: [], cost: Infinity, expandedCount: expanded.length, expandedOrder: expanded };
}

// Export algorithms to global scope
window.mazeBFS = mazeBFS;
window.mazeDFS = mazeDFS;
window.mazeIDS = mazeIDS;
window.mazeUCS = mazeUCS;
window.mazeAStar = mazeAStar;
window.mazeGreedy = mazeGreedy;
