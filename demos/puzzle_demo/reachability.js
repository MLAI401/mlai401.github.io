/**
 * Math and graph search logic for the 8-puzzle reachability analysis.
 */
class Reachability {
  /**
   * Calculates the number of inversions in the tile array.
   * An inversion is any pair (i, j) such that i < j and tiles[i] > tiles[j].
   * The blank space (0) is ignored in this calculation.
   */
  static getInversions(tiles) {
    let inversions = 0;
    const nonZero = tiles.filter(tile => tile !== 0);
    
    for (let i = 0; i < nonZero.length; i++) {
      for (let j = i + 1; j < nonZero.length; j++) {
        if (nonZero[i] > nonZero[j]) {
          inversions++;
        }
      }
    }
    return inversions;
  }

  /**
   * Determines if a given state is solvable (can reach the goal state).
   * For the 3x3 8-puzzle:
   * A state is reachable from the goal state if and only if both configurations
   * have the same inversion parity (even or odd).
   */
  static isReachable(state, goalState) {
    const startInvs = this.getInversions(state.tiles);
    const goalInvs = this.getInversions(goalState.tiles);
    
    return (startInvs % 2) === (goalInvs % 2);
  }

  /**
   * Builds a depth-limited search tree starting from the initial state.
   * Helps visualize state space growth, path cost, and duplicate states.
   * Returns a tree node structure:
   * {
   *   state: PuzzleState,
   *   action: string, // Action taken to reach this state
   *   depth: number,
   *   isDuplicate: boolean, // Has this configuration been seen already in the tree?
   *   children: []
   * }
   */
  static buildExpansionTree(startState, maxDepth) {
    const root = {
      state: startState,
      action: null,
      depth: 0,
      isDuplicate: false,
      children: []
    };

    const queue = [root];
    const seenStates = new Set();
    seenStates.add(startState.tiles.join(','));

    while (queue.length > 0) {
      const node = queue.shift();

      if (node.depth >= maxDepth) {
        continue;
      }

      // If this node was flagged as duplicate, do not expand it
      if (node.isDuplicate) {
        continue;
      }

      const actions = node.state.getLegalActions();
      actions.forEach(action => {
        const nextState = node.state.transition(action);
        const stateKey = nextState.tiles.join(',');
        
        const isDup = seenStates.has(stateKey);
        
        const childNode = {
          state: nextState,
          action: action,
          depth: node.depth + 1,
          isDuplicate: isDup,
          children: []
        };

        node.children.push(childNode);

        // If it's not a duplicate, add to seen set and enqueue for further expansion
        if (!isDup) {
          seenStates.add(stateKey);
          if (childNode.depth < maxDepth) {
            queue.push(childNode);
          }
        }
      });
    }

    // Also count total nodes vs unique states in the generated tree
    let totalNodes = 0;
    const uniqueStates = new Set();

    function traverse(n) {
      totalNodes++;
      uniqueStates.add(n.state.tiles.join(','));
      n.children.forEach(traverse);
    }
    traverse(root);

    return {
      root,
      totalNodes,
      uniqueStatesCount: uniqueStates.size
    };
  }

  /** Parity of the tile permutation: 0 = even, 1 = odd. */
  static parity(tiles) {
    return this.getInversions(tiles) % 2;
  }

  /** Tiles in reading order (row by row), with the blank skipped. */
  static readingOrder(tiles) {
    return tiles.filter(t => t !== 0);
  }

  /** All inversion pairs [a, b] (a appears before b and a > b) in reading order. */
  static inversionPairs(tiles) {
    const seq = this.readingOrder(tiles);
    const pairs = [];
    for (let i = 0; i < seq.length; i++) {
      for (let j = i + 1; j < seq.length; j++) {
        if (seq[i] > seq[j]) pairs.push([seq[i], seq[j]]);
      }
    }
    return pairs;
  }

  /**
   * Explains how one move changes the inversion count.
   * Horizontal move: the reading order is unchanged, so the change is 0.
   * Vertical move: the moved tile jumps over exactly the 2 tiles that lie between
   * its old and new squares in reading order; each of those 2 pairs flips, so the
   * count changes by -2, 0 or +2. Either way the parity never changes.
   */
  static explainMove(before, action) {
    const after = before.transition(action);
    const movedTile = before.tiles[after.blankIndex];
    const vertical = action === 'Up' || action === 'Down';
    let jumped = [];
    if (vertical) {
      const lo = Math.min(before.blankIndex, after.blankIndex);
      const hi = Math.max(before.blankIndex, after.blankIndex);
      for (let k = lo + 1; k < hi; k++) jumped.push(before.tiles[k]);
    }
    const flips = jumped.map(t => {
      // Was (movedTile, t) an inversion before / after?
      const beforeSeq = this.readingOrder(before.tiles);
      const iM = beforeSeq.indexOf(movedTile), iT = beforeSeq.indexOf(t);
      const wasInv = iM < iT ? movedTile > t : t > movedTile;
      return { tile: t, wasInversion: wasInv, delta: wasInv ? -1 : +1 };
    });
    const invBefore = this.getInversions(before.tiles);
    const invAfter = this.getInversions(after.tiles);
    return { after, movedTile, vertical, jumped, flips, invBefore, invAfter, delta: invAfter - invBefore };
  }

  // ---------------------------------------------------------------------------
  // Whole-state-space enumeration (perfect hashing of the 9! permutations)
  // ---------------------------------------------------------------------------

  static get FACT() { return [1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880]; }

  /** Lehmer-code rank of a 9-permutation: a unique integer in [0, 9!). */
  static rank(tiles) {
    const F = this.FACT; let r = 0;
    for (let i = 0; i < 9; i++) {
      let smaller = 0;
      for (let j = i + 1; j < 9; j++) if (tiles[j] < tiles[i]) smaller++;
      r += smaller * F[8 - i];
    }
    return r;
  }

  static unrank(r) {
    const F = this.FACT; const pool = [0, 1, 2, 3, 4, 5, 6, 7, 8]; const out = [];
    for (let i = 0; i < 9; i++) {
      const f = F[8 - i]; const k = Math.floor(r / f); r %= f;
      out.push(pool.splice(k, 1)[0]);
    }
    return out;
  }

  /**
   * Breadth-first search over the ENTIRE state space reachable from `startTiles`.
   * Returns per-depth layer sizes, the distance of every reached state
   * (Int8Array indexed by rank, -1 = never reached) and parity tallies.
   */
  static exploreAll(startTiles) {
    const N = 362880;
    const dist = new Int8Array(N).fill(-1);
    const queue = new Int32Array(N);
    let head = 0, tail = 0;
    const r0 = this.rank(startTiles);
    dist[r0] = 0; queue[tail++] = r0;
    const layers = [];
    const parityFound = [0, 0];
    const moves = [-3, 3, -1, 1];
    while (head < tail) {
      const r = queue[head++];
      const d = dist[r];
      layers[d] = (layers[d] || 0) + 1;
      const t = this.unrank(r);
      parityFound[this.parity(t)]++;
      const b = t.indexOf(0), bx = b % 3;
      for (const m of moves) {
        const nb = b + m;
        if (nb < 0 || nb > 8) continue;
        if ((m === -1 && bx === 0) || (m === 1 && bx === 2)) continue;
        t[b] = t[nb]; t[nb] = 0;
        const nr = this.rank(t);
        if (dist[nr] === -1) { dist[nr] = d + 1; queue[tail++] = nr; }
        t[nb] = t[b]; t[b] = 0;
      }
    }
    return { total: tail, layers, dist, parityFound, startParity: this.parity(startTiles) };
  }
}

// Export to window scope
window.Reachability = Reachability;
