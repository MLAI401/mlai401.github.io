/**
 * Represents a single state (board configuration) of the 8-puzzle.
 */
class PuzzleState {
  constructor(tiles) {
    // tiles is a 9-element array, e.g., [7, 2, 4, 5, 0, 6, 8, 3, 1]
    // where 0 represents the blank position ('_').
    this.tiles = [...tiles];
    this.blankIndex = this.tiles.indexOf(0);
    if (this.blankIndex === -1) {
      // Fallback if blank is represented differently
      this.blankIndex = this.tiles.indexOf(null);
      if (this.blankIndex !== -1) {
        this.tiles[this.blankIndex] = 0;
      } else {
        this.blankIndex = 0; // Default fallback
      }
    }
  }

  /**
   * Returns list of legal actions ('Up', 'Down', 'Left', 'Right')
   * based on the blank's position in the 3x3 grid.
   */
  getLegalActions() {
    const actions = [];
    const x = this.blankIndex % 3;
    const y = Math.floor(this.blankIndex / 3);

    // Moves refer to moving the blank space
    if (y > 0) actions.push('Up');
    if (y < 2) actions.push('Down');
    if (x > 0) actions.push('Left');
    if (x < 2) actions.push('Right');

    return actions;
  }

  /**
   * Transition model: RESULT(s, a) -> s'
   * Returns a new PuzzleState after executing the action.
   * If the action is illegal, returns the current state unchanged.
   */
  transition(action) {
    const legalActions = this.getLegalActions();
    if (!legalActions.includes(action)) {
      return this;
    }

    const nextTiles = [...this.tiles];
    const x = this.blankIndex % 3;
    const y = Math.floor(this.blankIndex / 3);
    let targetIndex = this.blankIndex;

    if (action === 'Up') targetIndex = this.blankIndex - 3;
    else if (action === 'Down') targetIndex = this.blankIndex + 3;
    else if (action === 'Left') targetIndex = this.blankIndex - 1;
    else if (action === 'Right') targetIndex = this.blankIndex + 1;

    // Swap blank with target tile
    nextTiles[this.blankIndex] = nextTiles[targetIndex];
    nextTiles[targetIndex] = 0;

    return new PuzzleState(nextTiles);
  }

  equals(other) {
    if (!other || !other.tiles) return false;
    for (let i = 0; i < 9; i++) {
      if (this.tiles[i] !== other.tiles[i]) return false;
    }
    return true;
  }

  toString() {
    return `[${this.tiles.map(t => t === 0 ? '_' : t).join(', ')}]`;
  }
}

// Export to window scope for client-side loading
window.PuzzleState = PuzzleState;
