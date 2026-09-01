/**
 * Represents the low-level 2D grid maze representation (T traversable cells).
 */
class Maze {
  constructor(gridArray) {
    this.grid = gridArray;
    this.height = gridArray.length;
    this.width = gridArray[0].length;
    this.start = null;
    this.goal = null;
    
    // Find start and goal positions
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const char = this.grid[y][x];
        if (char === 'S') {
          this.start = { x, y };
        } else if (char === 'G') {
          this.goal = { x, y };
        }
      }
    }
  }

  isTraversable(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return false;
    }
    return this.grid[y][x] !== '#';
  }

  getTraversableCells() {
    const cells = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.grid[y][x] !== '#') {
          cells.push({ x, y });
        }
      }
    }
    return cells;
  }

  getNeighbors(x, y) {
    const neighbors = [];
    const dirs = [
      { dx: 0, dy: -1 }, // N
      { dx: 1, dy: 0 },  // E
      { dx: 0, dy: 1 },  // S
      { dx: -1, dy: 0 }  // W
    ];

    dirs.forEach(d => {
      const nx = x + d.dx;
      const ny = y + d.dy;
      if (this.isTraversable(nx, ny)) {
        neighbors.push({ x: nx, y: ny });
      }
    });

    return neighbors;
  }
}

/**
 * Represents the robot's state in the 4T state space: (Location, Orientation)
 */
class RobotState {
  constructor(x, y, orientation) {
    this.x = x;
    this.y = y;
    this.orientation = orientation; // 'N', 'E', 'S', 'W'
  }

  // Directions in clockwise order
  static get DIRECTIONS() {
    return ['N', 'E', 'S', 'W'];
  }

  // Delta coordinates for each direction
  static get DIR_DELTAS() {
    return {
      'N': { dx: 0, dy: -1 },
      'E': { dx: 1, dy: 0 },
      'S': { dx: 0, dy: 1 },
      'W': { dx: -1, dy: 0 }
    };
  }

  turnLeft() {
    const idx = RobotState.DIRECTIONS.indexOf(this.orientation);
    const newIdx = (idx - 1 + 4) % 4;
    return new RobotState(this.x, this.y, RobotState.DIRECTIONS[newIdx]);
  }

  turnRight() {
    const idx = RobotState.DIRECTIONS.indexOf(this.orientation);
    const newIdx = (idx + 1) % 4;
    return new RobotState(this.x, this.y, RobotState.DIRECTIONS[newIdx]);
  }

  forward(maze) {
    const delta = RobotState.DIR_DELTAS[this.orientation];
    const nx = this.x + delta.dx;
    const ny = this.y + delta.dy;
    if (maze.isTraversable(nx, ny)) {
      return new RobotState(nx, ny, this.orientation);
    }
    return this; // Collide with wall, state remains unchanged
  }

  transition(action, maze) {
    switch (action) {
      case 'Forward':
        return this.forward(maze);
      case 'Turn Left':
        return this.turnLeft();
      case 'Turn Right':
        return this.turnRight();
      default:
        return this;
    }
  }

  equals(other) {
    return this.x === other.x && this.y === other.y && this.orientation === other.orientation;
  }

  toString() {
    return `((${this.x}, ${this.y}), ${this.orientation})`;
  }
}

// Export classes to global window scope for ease of loading in static browser context
window.Maze = Maze;
window.RobotState = RobotState;
