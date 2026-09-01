/**
 * Handles the abstraction logic: identifying decision points and building the abstract search graph.
 */
class Abstraction {
  /**
   * Identifies all decision points in the maze.
   * A decision point is a traversable cell that is either:
   * 1. The Start (S) or Goal (G)
   * 2. An intersection (3 or 4 traversable neighbors)
   * 3. A turning point / corner (2 neighbors that are not in a straight line)
   * 4. A dead-end (1 neighbor, except if it is already Start/Goal)
   */
  static findDecisionPoints(maze) {
    const traversable = maze.getTraversableCells();
    const decisionPoints = [];
    let dpIndex = 0;

    // Helper to get label (A, B, C... Z, AA, BB...) skipping 'S' and 'G' to prevent collisions
    function getLabel(index) {
      let count = 0;
      let cur = 0;
      while (true) {
        let label;
        if (cur < 26) {
          label = String.fromCharCode(65 + cur);
        } else {
          const first = String.fromCharCode(65 + Math.floor(cur / 26) - 1);
          const second = String.fromCharCode(65 + (cur % 26));
          label = first + second;
        }
        
        if (label !== 'S' && label !== 'G') {
          if (count === index) {
            return label;
          }
          count++;
        }
        cur++;
      }
    }

    traversable.forEach(cell => {
      const neighbors = maze.getNeighbors(cell.x, cell.y);
      const isStart = cell.x === maze.start.x && cell.y === maze.start.y;
      const isGoal = cell.x === maze.goal.x && cell.y === maze.goal.y;
      
      let isDP = false;
      let type = '';

      if (isStart) {
        isDP = true;
        type = 'start';
      } else if (isGoal) {
        isDP = true;
        type = 'goal';
      } else if (neighbors.length === 1) {
        isDP = true;
        type = 'dead-end';
      } else if (neighbors.length >= 3) {
        isDP = true;
        type = 'intersection';
      } else if (neighbors.length === 2) {
        // Turning point check: are the two neighbors not in a straight line?
        const n1 = neighbors[0];
        const n2 = neighbors[1];
        // Straight line means either same x (vertical) or same y (horizontal)
        const isStraight = n1.x === n2.x || n1.y === n2.y;
        if (!isStraight) {
          isDP = true;
          type = 'corner';
        }
      }

      if (isDP) {
        decisionPoints.push({
          x: cell.x,
          y: cell.y,
          label: isStart ? 'S' : (isGoal ? 'G' : getLabel(dpIndex++)),
          type: type
        });
      }
    });

    // Make sure S and G are at their positions and start/goal labels are preserved
    // Sorting decision points so they are ordered top-to-bottom, left-to-right (optional, but clean)
    // However, keeping S and G labeled 'S' and 'G' is crucial.
    return decisionPoints;
  }

  /**
   * Traverses corridors from each decision point to construct the abstract graph.
   * Returns an adjacency list representation: { [nodeLabel]: [ { to, action, cost, path }, ... ] }
   */
  static buildAbstractGraph(maze, decisionPoints) {
    const graph = {};
    const dpMap = {}; // mapping "x,y" -> decisionPoint
    
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
        let nextX = dp.x + dir.dx;
        let nextY = dp.y + dir.dy;
        
        if (!maze.isTraversable(nextX, nextY)) return;

        // Trace along corridor
        let currentX = nextX;
        let currentY = nextY;
        let prevX = dp.x;
        let prevY = dp.y;
        let steps = 1;
        const pathCoords = [{ x: dp.x, y: dp.y }];

        while (true) {
          pathCoords.push({ x: currentX, y: currentY });
          const key = `${currentX},${currentY}`;
          
          if (dpMap[key]) {
            // Found another decision point
            graph[dp.label].push({
              to: dpMap[key].label,
              action: dir.name,
              cost: steps,
              path: pathCoords
            });
            break;
          }

          // We are in a straight corridor cell, which must have exactly 2 neighbors
          const neighbors = maze.getNeighbors(currentX, currentY);
          const nextNeighbors = neighbors.filter(n => n.x !== prevX || n.y !== prevY);

          if (nextNeighbors.length === 1) {
            prevX = currentX;
            prevY = currentY;
            currentX = nextNeighbors[0].x;
            currentY = nextNeighbors[0].y;
            steps++;
          } else {
            // Corridor hit a dead end or block (should not happen if DPs are detected correctly)
            break;
          }
        }
      });
    });

    return graph;
  }
}

// Export to global window scope
window.Abstraction = Abstraction;
