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
}

// Export to window scope
window.Reachability = Reachability;
