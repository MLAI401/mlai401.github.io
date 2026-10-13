/**
 * 8-puzzle search on a FIXED depth-limited tree.
 *
 * buildTree() expands the start state with every legal move down to maxDepth (default 2).
 * That whole tree is drawn first; run() then replays BFS, DFS, IDS, Greedy or A* over it,
 * recording which existing node is selected, expanded, put on the frontier, skipped as a
 * repeated state, or found as the goal. Nothing new is ever added to the tree.
 *
 * Node statuses: 'unseen' | 'frontier' | 'current' | 'expanded' | 'dup' | 'leaf' | 'goal'
 *   dup  = generated but its state was already reached (or is on its own path), so not added
 *   leaf = selected at the maximum depth, so it cannot be expanded
 */
class PuzzleSearchTrace {
  static GOAL = [0, 1, 2, 3, 4, 5, 6, 7, 8];

  static manhattan(t) {
    let s = 0;
    for (let i = 0; i < 9; i++) {
      const v = t[i];
      if (v) s += Math.abs((i % 3) - (v % 3)) + Math.abs(Math.floor(i / 3) - Math.floor(v / 3));
    }
    return s;
  }

  static key(t) { return t.join(''); }

  /** Full tree to maxDepth, ids in breadth-first order, children in action order Up, Down, Left, Right. */
  static buildTree(start, maxDepth = 2) {
    const nodes = [];
    const add = (tiles, parent, action) => {
      const depth = parent ? parent.depth + 1 : 0;
      const n = { id: nodes.length, tiles, parent: parent ? parent.id : null, action, depth, g: depth, h: this.manhattan(tiles), children: [] };
      n.f = n.g + n.h;
      nodes.push(n);
      if (parent) parent.children.push(n.id);
      return n;
    };
    add(start.slice(), null, null);
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (n.depth >= maxDepth) continue;
      const st = new PuzzleState(n.tiles);
      for (const a of st.getLegalActions()) add(st.transition(a).tiles, n, a);
    }
    return nodes;
  }

  /**
   * @param {number[]} start
   * @param {'BFS'|'DFS'|'IDS'|'GREEDY'|'ASTAR'} alg
   * @param {number} maxDepth
   */
  static run(start, alg, maxDepth = 2) {
    const nodes = this.buildTree(start, maxDepth);
    const goalKey = this.key(this.GOAL);
    const steps = [];
    let status, order, frontier, limit = null, iteration = 0, reachedSize = 0, generated = 0, expandedTotal = 0;
    const tupleStr = t => '(' + t.join(',') + ')';
    const pri = n => (alg === 'GREEDY' ? n.h : n.f);
    const priLabel = n => (alg === 'ASTAR' ? ` (f = ${n.g} + ${n.h} = ${n.f})` : alg === 'GREEDY' ? ` (h = ${n.h})` : '');
    const sortedFrontier = () => {
      if (alg === 'BFS') return frontier.slice();
      if (alg === 'DFS' || alg === 'IDS') return frontier.slice().reverse();
      return frontier.slice().sort((a, b) => pri(nodes[a]) - pri(nodes[b]) || (alg === 'ASTAR' ? nodes[a].h - nodes[b].h : 0) || a - b);
    };
    const snap = extra => steps.push(Object.assign({
      nodes, status: status.slice(), order: order.slice(), frontier: sortedFrontier(),
      reachedSize, generated, expandedTotal, limit, iteration, current: null, solution: null, done: false, phase: ''
    }, extra));
    const pop = () => {
      if (alg === 'BFS') return frontier.shift();
      if (alg === 'DFS' || alg === 'IDS') return frontier.pop();
      const next = sortedFrontier()[0];
      frontier.splice(frontier.indexOf(next), 1);
      return next;
    };
    const pathIds = id => { const p = []; let c = id; while (c !== null) { p.unshift(c); c = nodes[c].parent; } return p; };
    const onPath = (id, k) => { let c = nodes[id].parent; while (c !== null) { if (this.key(nodes[c].tiles) === k) return true; c = nodes[c].parent; } return false; };
    const frontierName = {
      BFS: 'a FIFO queue (oldest node first)', DFS: 'a LIFO stack (newest node first)', IDS: 'a LIFO stack',
      GREEDY: 'a priority queue ordered by h(n)', ASTAR: 'a priority queue ordered by f(n) = g(n) + h(n)'
    }[alg];

    const search = depthLimit => {
      status = nodes.map(() => 'unseen'); order = []; frontier = [0];
      status[0] = 'frontier';
      const useReached = alg === 'BFS' || alg === 'GREEDY' || alg === 'ASTAR';
      const reached = new Map([[this.key(nodes[0].tiles), 0]]);
      reachedSize = useReached ? 1 : 0;
      snap({ phase: 'init', msg: alg === 'IDS'
        ? `Iteration ${iteration + 1}: depth limit = ${depthLimit}. Start again with only the root s₀ in the frontier.`
        : `The whole tree to depth ${maxDepth} is drawn. Search starts with the root s₀ ${tupleStr(start)} in the frontier${priLabel(nodes[0])}. The frontier is ${frontierName}.` });

      while (frontier.length) {
        const id = pop(), n = nodes[id];
        if (this.key(n.tiles) === goalKey) {
          status[id] = 'goal'; order.push(id); expandedTotal++;
          const sol = pathIds(id);
          snap({ phase: 'goal', current: id, solution: sol, done: true,
            msg: `Select #${id}${priLabel(n)}. Goal test: it IS the goal. Solution: ${sol.slice(1).map(i => nodes[i].action).join(' → ')} (${n.depth} moves).` });
          return 'found';
        }
        const lim = depthLimit === null ? maxDepth : depthLimit;
        if (n.depth >= lim) {
          status[id] = 'leaf';
          snap({ phase: 'select', current: id, msg: `Select #${id}${priLabel(n)}. Goal test: not the goal. It is at depth ${n.depth}, the ${depthLimit === null ? 'maximum depth' : 'depth limit'}, so it is not expanded.` });
          continue;
        }
        status[id] = 'current';
        snap({ phase: 'select', current: id, msg: `Select #${id} from the frontier${priLabel(n)}. Goal test: not the goal, so expand it.` });

        status[id] = 'expanded'; order.push(id); expandedTotal++;
        const added = [], dups = [];
        n.children.forEach(cid => {
          const c = nodes[cid], k = this.key(c.tiles);
          generated++;
          let isDup;
          if (alg === 'ASTAR') isDup = reached.has(k) && reached.get(k) <= c.g;
          else if (useReached) isDup = reached.has(k);
          else isDup = onPath(cid, k);
          if (isDup) { status[cid] = 'dup'; dups.push(cid); }
          else { status[cid] = 'frontier'; if (useReached) reached.set(k, c.g); added.push(cid); }
        });
        const pushOrder = alg === 'DFS' || alg === 'IDS' ? added.slice().reverse() : added;
        pushOrder.forEach(cid => frontier.push(cid));
        reachedSize = useReached ? reached.size : 0;
        const lbl = cid => `#${cid} ${nodes[cid].action}${alg === 'ASTAR' ? ` f=${nodes[cid].f}` : alg === 'GREEDY' ? ` h=${nodes[cid].h}` : ''}`;
        let msg = `Expand #${id}: generate its ${n.children.length} children.`;
        if (added.length) msg += ` Add to frontier: ${added.map(lbl).join(', ')}.`;
        if (dups.length) msg += ` ${dups.map(c => '#' + c).join(', ')} ${dups.length === 1 ? 'repeats' : 'repeat'} a state already ${useReached ? 'reached' : 'on its path'} (moving the blank straight back), so ${dups.length === 1 ? 'it is' : 'they are'} not added.`;
        snap({ phase: 'expand', current: id, msg });
      }
      return 'exhausted';
    };

    if (alg === 'IDS') {
      for (let L = 0; L <= maxDepth; L++) {
        limit = L; iteration = L;
        if (search(L) === 'found') break;
        snap({ phase: 'cutoff', msg: L < maxDepth
          ? `Frontier empty: no goal within depth ${L}. Increase the limit to ${L + 1} and search again from the root.`
          : `No goal within depth ${L}.`, done: L >= maxDepth });
      }
    } else {
      limit = alg === 'DFS' ? maxDepth : null;
      if (search(alg === 'DFS' ? maxDepth : null) !== 'found') snap({ phase: 'fail', done: true, msg: `Frontier empty: the goal is not within depth ${maxDepth}.` });
    }
    return steps;
  }
}

window.PuzzleSearchTrace = PuzzleSearchTrace;
