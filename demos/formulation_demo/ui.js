/**
 * Problem Formulation — Lecture Illustration
 *
 * This is NOT a search demo. It does not run BFS/DFS/UCS/A*, and it never
 * mentions a frontier or node expansion. Its only job is to make the parts
 * of a formal problem definition (AIMA Ch. 3.1) concrete:
 *
 *   State, State Space, Abstraction, Initial State, Actions,
 *   Transition Model, Goal / Goal Test, Step Cost / Path Cost
 *
 * The page is concept-first: the 9-step list above (ending on the
 * assembled "Formulated Problem") is the primary navigation and fills
 * the large column. Four worked examples — Two-Room Vacuum World,
 * 8-Puzzle, Maze, and Find Path (route-finding on a small map) — are
 * switched from a small control inside the illustration box itself; the
 * example only changes the supporting illustration, never the structure
 * of the page.
 *
 * Vacuum/Puzzle logic reuses the exact same classes as the rest of the
 * site (VacuumEnvironment from demos/vaccum_demo/environment.js and
 * PuzzleState from demos/puzzle_demo/puzzle.js). The Maze and Find Path
 * worlds are small self-contained data models defined below, in the same
 * spirit — a fixed grid and a fixed weighted map — kept independent of
 * the search-focused maze_demo/search_demo code since this page never
 * runs a search over them.
 */

const PF_STEPS = [
  { key: 'state', name: 'State' },
  { key: 'space', name: 'State Space' },
  { key: 'abstraction', name: 'Abstraction' },
  { key: 'initial', name: 'Initial State' },
  { key: 'actions', name: 'Actions' },
  { key: 'transition', name: 'Transition Model' },
  { key: 'goal', name: 'Goal Test' },
  { key: 'cost', name: 'Step / Path Cost' },
  { key: 'final', name: 'Formulated Problem' }
];

const PF_EXAMPLE_LIST = [
  { key: 'vaccum', label: 'Vacuum', icon: 'wind' },
  { key: 'puzzle', label: 'Puzzle', icon: 'grid-3x3' },
  { key: 'maze', label: 'Maze', icon: 'footprints' },
  { key: 'path', label: 'Find Path', icon: 'route' }
];

const PF_PUZZLE_INITIAL = [7, 2, 4, 5, 0, 6, 8, 3, 1];
const PF_PUZZLE_GOAL = [0, 1, 2, 3, 4, 5, 6, 7, 8];
const PF_VACCUM_INITIAL = { location: 'A', roomA: 'Dirty', roomB: 'Dirty' };

// 0 = open cell, 1 = wall. Row 0 is the top row.
const PF_MAZE_GRID = [
  [0, 0, 0, 1, 0],
  [1, 1, 0, 1, 0],
  [0, 0, 0, 0, 0],
  [0, 1, 1, 1, 0],
  [0, 0, 0, 0, 0]
];
const PF_MAZE_ROWS = PF_MAZE_GRID.length;
const PF_MAZE_COLS = PF_MAZE_GRID[0].length;
const PF_MAZE_START = { r: 0, c: 0 };
const PF_MAZE_GOAL = { r: 4, c: 4 };
const PF_MAZE_OPEN_COUNT = PF_MAZE_GRID.flat().filter(v => v === 0).length;
const PF_MAZE_WALL_COUNT = PF_MAZE_ROWS * PF_MAZE_COLS - PF_MAZE_OPEN_COUNT;

function pfMazeInBounds(r, c) {
  return r >= 0 && r < PF_MAZE_ROWS && c >= 0 && c < PF_MAZE_COLS;
}

function pfMazeIsOpen(r, c) {
  return pfMazeInBounds(r, c) && PF_MAZE_GRID[r][c] === 0;
}

const PF_MAZE_DELTAS = { Up: [-1, 0], Down: [1, 0], Left: [0, -1], Right: [0, 1] };

function pfMazeLegalActions(pos) {
  return Object.keys(PF_MAZE_DELTAS).filter(a => {
    const [dr, dc] = PF_MAZE_DELTAS[a];
    return pfMazeIsOpen(pos.r + dr, pos.c + dc);
  });
}

function pfMazeApply(pos, action) {
  const [dr, dc] = PF_MAZE_DELTAS[action] || [0, 0];
  const nr = pos.r + dr, nc = pos.c + dc;
  return pfMazeIsOpen(nr, nc) ? { r: nr, c: nc } : { ...pos };
}

// Same weighted map as the Search & Planning route-finding demo (kept as
// an independent copy here so this page never loads any search code).
const PF_CITY_GRAPH = {
  A: [{ to: 'B', cost: 3 }, { to: 'C', cost: 2 }, { to: 'E', cost: 9 }],
  B: [{ to: 'D', cost: 2 }, { to: 'E', cost: 4 }],
  C: [{ to: 'E', cost: 6 }, { to: 'F', cost: 9 }],
  D: [{ to: 'G', cost: 3 }],
  E: [{ to: 'G', cost: 1 }, { to: 'H', cost: 2 }],
  F: [{ to: 'H', cost: 1 }],
  G: [{ to: 'H', cost: 5 }],
  H: []
};
const PF_PATH_START = 'A';
const PF_PATH_GOAL = 'H';

function pfCityNeighbors(city) {
  return [...(PF_CITY_GRAPH[city] || [])].sort((a, b) => a.to.localeCompare(b.to));
}

class ProblemFormulationUI {
  constructor() {
    this.example = 'vaccum';
    this.stepIdx = 0;

    // Independent, persistent worlds so switching examples never loses
    // whatever the instructor has already clicked through.
    this.vaccumEnv = new VacuumEnvironment(PF_VACCUM_INITIAL);
    this.vaccumActions = 0;
    this.vaccumLastMove = null; // { before, action, after }

    this.puzzleGoal = new PuzzleState(PF_PUZZLE_GOAL);
    this.puzzleState = new PuzzleState(PF_PUZZLE_INITIAL);
    this.puzzleActions = 0;
    this.puzzleLastMove = null;

    this.mazePos = { ...PF_MAZE_START };
    this.mazeActions = 0;
    this.mazeLastMove = null;

    this.pathCity = PF_PATH_START;
    this.pathTrail = [PF_PATH_START];
    this.pathCost = 0;
    this.pathActions = 0;
    this.pathLastMove = null;

    // DOM handles
    this.stageEl = document.getElementById('pf-stage');
    this.flowBarEl = document.getElementById('pf-flow-bar');
    this.panelsEl = document.getElementById('pf-panels');
    this.btnPrev = document.getElementById('btn-pf-prev');
    this.btnNext = document.getElementById('btn-pf-next');

    this.bindEvents();
    this.render();
  }

  bindEvents() {
    this.btnPrev.addEventListener('click', () => this.setStep(this.stepIdx - 1));
    this.btnNext.addEventListener('click', () => this.setStep(this.stepIdx + 1));

    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') this.setStep(this.stepIdx + 1);
      if (e.key === 'ArrowLeft') this.setStep(this.stepIdx - 1);
    });
  }

  setExample(key) {
    if (key === this.example) return;
    this.example = key;
    this.render();
  }

  setStep(idx) {
    if (idx < 0 || idx >= PF_STEPS.length) return;
    this.stepIdx = idx;
    this.render();
  }

  // ---------- Vacuum helpers ----------

  vaccumLegalActions() {
    // ACTIONS(s) = {Suck, Left, Right} in every state, matching both the
    // classic AIMA formulation and the Playground's own Vacuum demo — Suck
    // is always a legal action, it just has no effect on an already-clean
    // room.
    return ['Suck', 'Left', 'Right'];
  }

  vaccumDoAction(action) {
    const before = this.vaccumEnv.getState().toString();
    this.vaccumEnv.transition(action);
    const after = this.vaccumEnv.getState().toString();
    this.vaccumActions++;
    this.vaccumLastMove = { before, action, after };
    this.render();
  }

  vaccumReset() {
    this.vaccumEnv.reset();
    this.vaccumActions = 0;
    this.vaccumLastMove = null;
    this.render();
  }

  vaccumIsGoal() {
    return this.vaccumEnv.isTaskComplete();
  }

  // ---------- Puzzle helpers ----------

  puzzleDoAction(action) {
    const before = this.puzzleState.toString();
    this.puzzleState = this.puzzleState.transition(action);
    const after = this.puzzleState.toString();
    this.puzzleActions++;
    this.puzzleLastMove = { before, action, after };
    this.render();
  }

  puzzleReset() {
    this.puzzleState = new PuzzleState(PF_PUZZLE_INITIAL);
    this.puzzleActions = 0;
    this.puzzleLastMove = null;
    this.render();
  }

  puzzleIsGoal() {
    return this.puzzleState.equals(this.puzzleGoal);
  }

  // ---------- Maze helpers ----------

  mazeDoAction(action) {
    const before = `(${this.mazePos.r}, ${this.mazePos.c})`;
    this.mazePos = pfMazeApply(this.mazePos, action);
    const after = `(${this.mazePos.r}, ${this.mazePos.c})`;
    this.mazeActions++;
    this.mazeLastMove = { before, action, after };
    this.render();
  }

  mazeReset() {
    this.mazePos = { ...PF_MAZE_START };
    this.mazeActions = 0;
    this.mazeLastMove = null;
    this.render();
  }

  mazeIsGoal() {
    return this.mazePos.r === PF_MAZE_GOAL.r && this.mazePos.c === PF_MAZE_GOAL.c;
  }

  // ---------- Find Path helpers ----------

  pathDoAction(city, cost) {
    const before = this.pathCity;
    this.pathCity = city;
    this.pathTrail.push(city);
    this.pathCost += cost;
    this.pathActions++;
    this.pathLastMove = { before, action: `Go(${city})`, after: city };
    this.render();
  }

  pathReset() {
    this.pathCity = PF_PATH_START;
    this.pathTrail = [PF_PATH_START];
    this.pathCost = 0;
    this.pathActions = 0;
    this.pathLastMove = null;
    this.render();
  }

  pathIsGoal() {
    return this.pathCity === PF_PATH_GOAL;
  }

  // ---------- Per-example content descriptor ----------
  // Single source of truth the concept panels read from, so every panel_*
  // method stays example-agnostic.

  pfData() {
    switch (this.example) {
      case 'vaccum': {
        const s = this.vaccumEnv.getState();
        return {
          label: 'Two-Room Vacuum World',
          stateNote: 'Vacuum World state: robot location + the cleanliness of both rooms.',
          stateSpaceHtml: `
            <div class="summary-item"><span class="summary-label">Locations</span><span class="summary-val">2</span></div>
            <div class="summary-item"><span class="summary-label">Room A</span><span class="summary-val">2</span></div>
            <div class="summary-item"><span class="summary-label">Room B</span><span class="summary-val">2</span></div>
            <div class="summary-item"><span class="summary-label">Total states</span><span class="summary-val">2×2×2 = 8</span></div>
          `,
          stateSpaceNote: 'Small state spaces like this one can be drawn and reasoned about completely by hand.',
          abstractionFlow: this.abstractionFlowVaccum(),
          initialFormula: 's₀ = (A, Dirty, Dirty)',
          actionsFormula: `ACTIONS(s) = { ${this.vaccumLegalActions().join(', ')} }`,
          actionsNote: 'Here ACTIONS(s) is the same three moves in every state — Suck just has no effect on an already-clean room.',
          lastMove: this.vaccumLastMove,
          goalFormula: 'GOAL-TEST(s) = (RoomA = Clean) ∧ (RoomB = Clean)',
          goalReached: this.vaccumIsGoal(),
          costFormula: 'Step-Cost(s, a, s′) = 1',
          costNote: 'For simplicity every action here costs 1 — path cost = number of actions taken.',
          actionsCount: this.vaccumActions,
          pathCost: this.vaccumActions,
          finalStates: 'Location × RoomA × RoomB — 8 total states',
          finalInitial: 's₀ = (A, Dirty, Dirty)',
          finalActions: 'Suck, Left, Right',
          finalTransition: 'RESULT(s, a) = s′',
          finalGoal: 'Both rooms Clean',
          finalCost: '1 per action; path cost = number of actions'
        };
      }
      case 'puzzle': {
        return {
          label: '8-Puzzle',
          stateNote: '8-Puzzle state: the arrangement of the 9 tiles (8 numbered + 1 blank) on the 3×3 board.',
          stateSpaceHtml: `
            <div class="summary-item"><span class="summary-label">Arrangements</span><span class="summary-val">9!</span></div>
            <div class="summary-item"><span class="summary-label">= </span><span class="summary-val">362,880</span></div>
            <div class="summary-item"><span class="summary-label">Reachable (solvable half)</span><span class="summary-val">181,440</span></div>
          `,
          stateSpaceNote: 'Only half of all tile arrangements are reachable by sliding moves — the other half differ by one "illegal" swap.',
          abstractionFlow: this.abstractionFlowPuzzle(),
          initialFormula: `s₀ = [${PF_PUZZLE_INITIAL.map(t => t === 0 ? '_' : t).join(', ')}]`,
          actionsFormula: `ACTIONS(s) = { ${this.puzzleState.getLegalActions().join(', ')} }`,
          actionsNote: 'Only the moves that keep the blank on the 3×3 board are legal — buttons for the rest are disabled. Here ACTIONS(s) genuinely depends on s.',
          lastMove: this.puzzleLastMove,
          goalFormula: `IS-GOAL(s) = (s = [${PF_PUZZLE_GOAL.map(t => t === 0 ? '_' : t).join(', ')}])`,
          goalReached: this.puzzleIsGoal(),
          costFormula: 'Step-Cost(s, a, s′) = 1',
          costNote: 'For simplicity every action here costs 1 — path cost = number of actions taken.',
          actionsCount: this.puzzleActions,
          pathCost: this.puzzleActions,
          finalStates: 'All 3×3 arrangements of 8 tiles + blank',
          finalInitial: `s₀ = [${PF_PUZZLE_INITIAL.map(t => t === 0 ? '_' : t).join(', ')}]`,
          finalActions: 'Move blank Up, Down, Left, Right',
          finalTransition: 'RESULT(s, a) = s′',
          finalGoal: 'Tiles match the goal arrangement',
          finalCost: '1 per action; path cost = number of actions'
        };
      }
      case 'maze': {
        return {
          label: 'Maze',
          stateNote: 'Maze state: which grid cell the agent currently occupies.',
          stateSpaceHtml: `
            <div class="summary-item"><span class="summary-label">Grid</span><span class="summary-val">${PF_MAZE_ROWS}×${PF_MAZE_COLS}</span></div>
            <div class="summary-item"><span class="summary-label">Walls</span><span class="summary-val">${PF_MAZE_WALL_COUNT}</span></div>
            <div class="summary-item"><span class="summary-label">Reachable states</span><span class="summary-val">${PF_MAZE_OPEN_COUNT}</span></div>
          `,
          stateSpaceNote: 'The state space is just the open cells — walls are never valid states.',
          abstractionFlow: this.abstractionFlowMaze(),
          initialFormula: `s₀ = (${PF_MAZE_START.r}, ${PF_MAZE_START.c})`,
          actionsFormula: `ACTIONS(s) = { ${pfMazeLegalActions(this.mazePos).join(', ')} }`,
          actionsNote: 'Only moves that stay in bounds and land on an open cell (not a wall) are legal — ACTIONS(s) depends on s.',
          lastMove: this.mazeLastMove,
          goalFormula: `GOAL-TEST(s) = (s = (${PF_MAZE_GOAL.r}, ${PF_MAZE_GOAL.c}))`,
          goalReached: this.mazeIsGoal(),
          costFormula: 'Step-Cost(s, a, s′) = 1',
          costNote: 'For simplicity every move here costs 1 — path cost = number of moves taken.',
          actionsCount: this.mazeActions,
          pathCost: this.mazeActions,
          finalStates: `${PF_MAZE_ROWS}×${PF_MAZE_COLS} grid minus walls — ${PF_MAZE_OPEN_COUNT} reachable cells`,
          finalInitial: `s₀ = (${PF_MAZE_START.r}, ${PF_MAZE_START.c})`,
          finalActions: 'Move Up, Down, Left, Right into an open cell',
          finalTransition: 'RESULT(s, a) = s′',
          finalGoal: `Reach cell (${PF_MAZE_GOAL.r}, ${PF_MAZE_GOAL.c})`,
          finalCost: '1 per move; path cost = number of moves'
        };
      }
      case 'path': {
        const neighbors = pfCityNeighbors(this.pathCity);
        return {
          label: 'Find Path',
          stateNote: 'Find Path state: the city the traveler is currently in.',
          stateSpaceHtml: `
            <div class="summary-item"><span class="summary-label">Cities</span><span class="summary-val">${Object.keys(PF_CITY_GRAPH).length}</span></div>
            <div class="summary-item"><span class="summary-label">Roads</span><span class="summary-val">${Object.values(PF_CITY_GRAPH).reduce((n, r) => n + r.length, 0)}</span></div>
          `,
          stateSpaceNote: 'Unlike the other three examples, the state here is just a label (a city name) — no internal structure to enumerate.',
          abstractionFlow: this.abstractionFlowPath(),
          initialFormula: `s₀ = ${PF_PATH_START}`,
          actionsFormula: neighbors.length
            ? `ACTIONS(${this.pathCity}) = { ${neighbors.map(n => `Go(${n.to})`).join(', ')} }`
            : `ACTIONS(${this.pathCity}) = { } — no roads onward`,
          actionsNote: 'ACTIONS(s) is whichever roads leave the current city — a dead end (or the goal) can have none.',
          lastMove: this.pathLastMove,
          goalFormula: `GOAL-TEST(s) = (s = ${PF_PATH_GOAL})`,
          goalReached: this.pathIsGoal(),
          costFormula: "Step-Cost(s, Go(x), x) = road distance from s to x",
          costNote: 'Unlike the other examples, step cost is NOT a flat 1 here — it is the length of the road just traveled, so path cost is a sum of distances, not a count of moves.',
          actionsCount: this.pathActions,
          pathCost: this.pathCost,
          finalStates: `${Object.keys(PF_CITY_GRAPH).length} cities: ${Object.keys(PF_CITY_GRAPH).join(', ')}`,
          finalInitial: `s₀ = ${PF_PATH_START}`,
          finalActions: 'Go(x) for each road out of the current city',
          finalTransition: 'RESULT(s, Go(x)) = x',
          finalGoal: `Reach city ${PF_PATH_GOAL}`,
          finalCost: 'Cost = road distance; path cost = sum of distances traveled'
        };
      }
      default:
        return {};
    }
  }

  // ---------- Rendering ----------

  render() {
    this.renderFlowBar();
    this.renderStage();
    this.renderPanels();
    this.updateNavButtons();
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  updateNavButtons() {
    this.btnPrev.disabled = this.stepIdx === 0;
    this.btnNext.disabled = this.stepIdx === PF_STEPS.length - 1;
  }

  renderFlowBar() {
    this.flowBarEl.innerHTML = PF_STEPS.map((step, i) => `
      <div class="flow-step ${i === this.stepIdx ? 'active' : ''} ${i < this.stepIdx ? 'completed' : ''}" data-idx="${i}">
        <div class="flow-step-num">${i + 1}</div>
        <div class="flow-step-name">${step.name}</div>
      </div>
    `).join('');

    this.flowBarEl.querySelectorAll('.flow-step').forEach(el => {
      el.addEventListener('click', () => this.setStep(parseInt(el.dataset.idx, 10)));
    });
  }

  // Stage = the illustration box. Its own small example switch sits at the
  // top, above the illustration for whichever example is selected; picking
  // an example never touches the concept column or the step being taught.
  renderStage() {
    const switchHtml = `
      <div class="pf-example-switch">
        <span class="pf-example-switch-label">Example</span>
        <div class="pf-example-tabs">
          ${PF_EXAMPLE_LIST.map(ex => `
            <button class="pf-example-tab ${ex.key === this.example ? 'active' : ''}" data-example="${ex.key}">
              <i data-lucide="${ex.icon}"></i> ${ex.label}
            </button>
          `).join('')}
        </div>
      </div>
    `;

    const illustrationHtml = {
      vaccum: this.stageHtmlVaccum(),
      puzzle: this.stageHtmlPuzzle(),
      maze: this.stageHtmlMaze(),
      path: this.stageHtmlPath()
    }[this.example];

    this.stageEl.innerHTML = `${switchHtml}<div class="pf-stage-illustration">${illustrationHtml}</div>`;

    this.stageEl.querySelectorAll('.pf-example-tab').forEach(btn => {
      btn.addEventListener('click', () => this.setExample(btn.dataset.example));
    });

    this.wireStageEvents();
  }

  stageHtmlVaccum() {
    const s = this.vaccumEnv.getState();
    const legal = this.vaccumLegalActions();
    const highlightActions = PF_STEPS[this.stepIdx].key === 'actions';
    const showGoal = PF_STEPS[this.stepIdx].key === 'goal';
    const goalReached = this.vaccumIsGoal();

    const roomCard = (label, status, here) => `
      <div class="pf-room ${here ? 'pf-room-here' : ''}">
        <div class="pf-room-title">Room ${label}</div>
        ${here ? `<div class="pf-robot-icon"><i data-lucide="bot"></i></div>` : `<div style="height:34px;"></div>`}
        <span class="vaccum-model-pill ${status === 'Clean' ? 'clean' : 'dirty'}">${status}</span>
      </div>
    `;

    return `
      <div class="pf-stage-label">Two-Room Vacuum World</div>
      <div class="pf-vaccum-rooms">
        ${roomCard('A', s.roomA, s.location === 'A')}
        ${roomCard('B', s.roomB, s.location === 'B')}
      </div>
      <div class="pf-action-row">
        ${['Suck', 'Left', 'Right'].map(a => `
          <button class="pf-action-btn ${highlightActions ? 'pf-highlight' : ''}" data-action="${a}" ${legal.includes(a) ? '' : 'disabled'}>${a}</button>
        `).join('')}
      </div>
      ${showGoal ? `<div class="pf-state-readout"><span class="vaccum-pill ${goalReached ? 'success' : 'danger'}">${goalReached ? 'Goal reached' : 'Not a goal state yet'}</span></div>` : ''}
      <div class="pf-state-readout"><span class="formula-box">s = (${s.location}, ${s.roomA}, ${s.roomB})</span></div>
      <span class="pf-reset-link" id="pf-reset">Reset to Initial State</span>
    `;
  }

  stageHtmlPuzzle() {
    const tiles = this.puzzleState.tiles;
    const highlightActions = PF_STEPS[this.stepIdx].key === 'actions';
    const showGoal = PF_STEPS[this.stepIdx].key === 'goal';
    const goalReached = this.puzzleIsGoal();
    const legal = this.puzzleState.getLegalActions();

    return `
      <div class="pf-stage-label">8-Puzzle</div>
      <div class="pf-puzzle-board">
        ${tiles.map((t, i) => `<div class="pf-puzzle-tile ${t === 0 ? 'pf-blank' : ''}" data-idx="${i}">${t === 0 ? '' : t}</div>`).join('')}
      </div>
      <div class="pf-action-row">
        ${['Up', 'Down', 'Left', 'Right'].map(a => `
          <button class="pf-action-btn ${highlightActions ? 'pf-highlight' : ''}" data-action="${a}" ${legal.includes(a) ? '' : 'disabled'}>${a}</button>
        `).join('')}
      </div>
      ${showGoal ? `<div class="pf-state-readout"><span class="vaccum-pill ${goalReached ? 'success' : 'danger'}">${goalReached ? 'Goal reached' : 'Not a goal state yet'}</span></div>` : ''}
      <div class="pf-state-readout"><span class="formula-box">s = [${tiles.map(t => t === 0 ? '_' : t).join(', ')}]</span></div>
      <span class="pf-reset-link" id="pf-reset">Reset to Initial State</span>
    `;
  }

  stageHtmlMaze() {
    const legal = pfMazeLegalActions(this.mazePos);
    const highlightActions = PF_STEPS[this.stepIdx].key === 'actions';
    const showGoal = PF_STEPS[this.stepIdx].key === 'goal';
    const goalReached = this.mazeIsGoal();

    const cells = [];
    for (let r = 0; r < PF_MAZE_ROWS; r++) {
      for (let c = 0; c < PF_MAZE_COLS; c++) {
        const isWall = PF_MAZE_GRID[r][c] === 1;
        const isHere = r === this.mazePos.r && c === this.mazePos.c;
        const isGoalCell = r === PF_MAZE_GOAL.r && c === PF_MAZE_GOAL.c;
        const adjacent = !isWall && Math.abs(r - this.mazePos.r) + Math.abs(c - this.mazePos.c) === 1;
        const cls = ['pf-maze-cell'];
        if (isWall) cls.push('pf-maze-wall');
        if (isHere) cls.push('pf-maze-here');
        if (isGoalCell) cls.push('pf-maze-goal');
        if (adjacent) cls.push('pf-maze-adjacent');
        let inner = '';
        if (isHere) inner = '<i data-lucide="user"></i>';
        else if (isGoalCell) inner = '<i data-lucide="flag"></i>';
        cells.push(`<div class="${cls.join(' ')}" data-r="${r}" data-c="${c}">${inner}</div>`);
      }
    }

    return `
      <div class="pf-stage-label">Maze</div>
      <div class="pf-maze-board">${cells.join('')}</div>
      <div class="pf-action-row">
        ${['Up', 'Down', 'Left', 'Right'].map(a => `
          <button class="pf-action-btn ${highlightActions ? 'pf-highlight' : ''}" data-action="${a}" ${legal.includes(a) ? '' : 'disabled'}>${a}</button>
        `).join('')}
      </div>
      ${showGoal ? `<div class="pf-state-readout"><span class="vaccum-pill ${goalReached ? 'success' : 'danger'}">${goalReached ? 'Goal reached' : 'Not a goal state yet'}</span></div>` : ''}
      <div class="pf-state-readout"><span class="formula-box">s = (${this.mazePos.r}, ${this.mazePos.c})</span></div>
      <span class="pf-reset-link" id="pf-reset">Reset to Initial State</span>
    `;
  }

  stageHtmlPath() {
    const neighbors = pfCityNeighbors(this.pathCity);
    const highlightActions = PF_STEPS[this.stepIdx].key === 'actions';
    const showGoal = PF_STEPS[this.stepIdx].key === 'goal';
    const goalReached = this.pathIsGoal();

    return `
      <div class="pf-stage-label">Find Path</div>
      <div class="pf-path-city"><i data-lucide="map-pin"></i> ${this.pathCity}</div>
      <div class="pf-path-trail">${this.pathTrail.join(' &rarr; ')}</div>
      <div class="pf-action-row">
        ${neighbors.length
          ? neighbors.map(n => `<button class="pf-action-btn ${highlightActions ? 'pf-highlight' : ''}" data-city="${n.to}" data-cost="${n.cost}">${n.to} (${n.cost})</button>`).join('')
          : `<span style="font-size:0.75rem;color:var(--text-muted);">No roads onward from here</span>`}
      </div>
      ${showGoal ? `<div class="pf-state-readout"><span class="vaccum-pill ${goalReached ? 'success' : 'danger'}">${goalReached ? 'Goal reached' : 'Not a goal state yet'}</span></div>` : ''}
      <div class="pf-state-readout"><span class="formula-box">s = ${this.pathCity} &nbsp;|&nbsp; cost so far = ${this.pathCost}</span></div>
      <span class="pf-reset-link" id="pf-reset">Reset to Initial State</span>
    `;
  }

  wireStageEvents() {
    this.stageEl.querySelectorAll('.pf-action-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.example === 'vaccum') this.vaccumDoAction(btn.dataset.action);
        else if (this.example === 'puzzle') this.puzzleDoAction(btn.dataset.action);
        else if (this.example === 'maze') this.mazeDoAction(btn.dataset.action);
        else if (this.example === 'path') this.pathDoAction(btn.dataset.city, parseInt(btn.dataset.cost, 10));
      });
    });

    if (this.example === 'puzzle') {
      this.stageEl.querySelectorAll('.pf-puzzle-tile').forEach(tile => {
        tile.addEventListener('click', () => {
          const idx = parseInt(tile.dataset.idx, 10);
          const blank = this.puzzleState.blankIndex;
          const x1 = idx % 3, y1 = Math.floor(idx / 3);
          const x2 = blank % 3, y2 = Math.floor(blank / 3);
          if (Math.abs(x1 - x2) + Math.abs(y1 - y2) !== 1) return; // not adjacent
          // Clicking a tile should slide THAT tile into the blank. PuzzleState's
          // action names describe which way the BLANK moves (e.g. 'Up' moves the
          // blank up, pulling the tile above it down) — so a tile above the blank
          // is reached by moving the blank 'Up', a tile left of the blank by 'Left'.
          let action = null;
          if (x1 === x2) action = y1 < y2 ? 'Up' : 'Down';
          else action = x1 < x2 ? 'Left' : 'Right';
          this.puzzleDoAction(action);
        });
      });
    }

    if (this.example === 'maze') {
      this.stageEl.querySelectorAll('.pf-maze-cell.pf-maze-adjacent').forEach(cell => {
        cell.addEventListener('click', () => {
          const r = parseInt(cell.dataset.r, 10), c = parseInt(cell.dataset.c, 10);
          // Clicking an adjacent open cell moves the agent directly onto it —
          // unlike the puzzle's blank, the agent IS the thing that moves.
          let action = null;
          if (c === this.mazePos.c) action = r < this.mazePos.r ? 'Up' : 'Down';
          else action = c < this.mazePos.c ? 'Left' : 'Right';
          this.mazeDoAction(action);
        });
      });
    }

    const resetEl = document.getElementById('pf-reset');
    if (resetEl) {
      resetEl.addEventListener('click', () => {
        if (this.example === 'vaccum') this.vaccumReset();
        else if (this.example === 'puzzle') this.puzzleReset();
        else if (this.example === 'maze') this.mazeReset();
        else if (this.example === 'path') this.pathReset();
      });
    }
  }

  // Abstraction diagram markup. Returned bare (no heading) because it is
  // embedded directly inside the Abstraction concept panel — for that one
  // step, the diagram IS the concept, not a side illustration.
  abstractionFlowVaccum() {
    return `
      <div class="pf-abstraction-flow">
        <div class="pf-abstraction-panel">
          <h4>Real World</h4>
          <div class="pf-detail-tag pf-dropped"><i data-lucide="x"></i>Robot's color / brand</div>
          <div class="pf-detail-tag pf-dropped"><i data-lucide="x"></i>Battery level %</div>
          <div class="pf-detail-tag pf-dropped"><i data-lucide="x"></i>Room temperature</div>
          <div class="pf-detail-tag pf-dropped"><i data-lucide="x"></i>Furniture layout</div>
          <div class="pf-detail-tag pf-kept"><i data-lucide="check"></i>Which room the robot is in</div>
          <div class="pf-detail-tag pf-kept"><i data-lucide="check"></i>Is Room A dirty?</div>
          <div class="pf-detail-tag pf-kept"><i data-lucide="check"></i>Is Room B dirty?</div>
        </div>
        <div class="pf-abstraction-arrow"><i data-lucide="arrow-right"></i><span>Remove irrelevant detail</span></div>
        <div class="pf-abstraction-panel">
          <h4>Keep only what solves the problem</h4>
          <div class="pf-detail-tag pf-kept"><i data-lucide="check"></i>Robot location &isin; {A, B}</div>
          <div class="pf-detail-tag pf-kept"><i data-lucide="check"></i>Room A status &isin; {Clean, Dirty}</div>
          <div class="pf-detail-tag pf-kept"><i data-lucide="check"></i>Room B status &isin; {Clean, Dirty}</div>
        </div>
        <div class="pf-abstraction-arrow"><i data-lucide="arrow-right"></i><span>State representation</span></div>
        <div class="pf-abstraction-panel pf-state-final-panel">
          <h4>State</h4>
          <span class="formula-box">s = (Location, RoomA, RoomB)</span>
        </div>
      </div>
    `;
  }

  abstractionFlowPuzzle() {
    return `
      <div class="pf-abstraction-flow">
        <div class="pf-abstraction-panel">
          <h4>Real World</h4>
          <div class="pf-detail-tag pf-dropped"><i data-lucide="x"></i>Tile material / font</div>
          <div class="pf-detail-tag pf-dropped"><i data-lucide="x"></i>Board tilt on the table</div>
          <div class="pf-detail-tag pf-dropped"><i data-lucide="x"></i>Lighting / shadows</div>
          <div class="pf-detail-tag pf-dropped"><i data-lucide="x"></i>Exact pixel position of tiles</div>
          <div class="pf-detail-tag pf-kept"><i data-lucide="check"></i>Which number is in each cell</div>
          <div class="pf-detail-tag pf-kept"><i data-lucide="check"></i>Where the blank cell is</div>
        </div>
        <div class="pf-abstraction-arrow"><i data-lucide="arrow-right"></i><span>Remove irrelevant detail</span></div>
        <div class="pf-abstraction-panel">
          <h4>Keep only what solves the problem</h4>
          <div class="pf-detail-tag pf-kept"><i data-lucide="check"></i>3&times;3 grid of tile numbers</div>
          <div class="pf-detail-tag pf-kept"><i data-lucide="check"></i>Position of the blank (0)</div>
        </div>
        <div class="pf-abstraction-arrow"><i data-lucide="arrow-right"></i><span>State representation</span></div>
        <div class="pf-abstraction-panel pf-state-final-panel">
          <h4>State</h4>
          <span class="formula-box">s = [9 tiles, blank = 0]</span>
        </div>
      </div>
    `;
  }

  abstractionFlowMaze() {
    return `
      <div class="pf-abstraction-flow">
        <div class="pf-abstraction-panel">
          <h4>Real World</h4>
          <div class="pf-detail-tag pf-dropped"><i data-lucide="x"></i>Wall material / color</div>
          <div class="pf-detail-tag pf-dropped"><i data-lucide="x"></i>Floor texture</div>
          <div class="pf-detail-tag pf-dropped"><i data-lucide="x"></i>Lighting</div>
          <div class="pf-detail-tag pf-dropped"><i data-lucide="x"></i>Exact distance in meters</div>
          <div class="pf-detail-tag pf-kept"><i data-lucide="check"></i>Which grid cell the agent occupies</div>
          <div class="pf-detail-tag pf-kept"><i data-lucide="check"></i>Which cells are walls vs. open</div>
        </div>
        <div class="pf-abstraction-arrow"><i data-lucide="arrow-right"></i><span>Remove irrelevant detail</span></div>
        <div class="pf-abstraction-panel">
          <h4>Keep only what solves the problem</h4>
          <div class="pf-detail-tag pf-kept"><i data-lucide="check"></i>Current cell (row, col)</div>
          <div class="pf-detail-tag pf-kept"><i data-lucide="check"></i>Open / wall grid layout</div>
        </div>
        <div class="pf-abstraction-arrow"><i data-lucide="arrow-right"></i><span>State representation</span></div>
        <div class="pf-abstraction-panel pf-state-final-panel">
          <h4>State</h4>
          <span class="formula-box">s = (row, col)</span>
        </div>
      </div>
    `;
  }

  abstractionFlowPath() {
    return `
      <div class="pf-abstraction-flow">
        <div class="pf-abstraction-panel">
          <h4>Real World</h4>
          <div class="pf-detail-tag pf-dropped"><i data-lucide="x"></i>Road surface / lanes</div>
          <div class="pf-detail-tag pf-dropped"><i data-lucide="x"></i>Traffic and weather</div>
          <div class="pf-detail-tag pf-dropped"><i data-lucide="x"></i>Scenery along the way</div>
          <div class="pf-detail-tag pf-dropped"><i data-lucide="x"></i>Exact GPS coordinates</div>
          <div class="pf-detail-tag pf-kept"><i data-lucide="check"></i>Which city you're currently in</div>
          <div class="pf-detail-tag pf-kept"><i data-lucide="check"></i>Which roads connect which cities, and their length</div>
        </div>
        <div class="pf-abstraction-arrow"><i data-lucide="arrow-right"></i><span>Remove irrelevant detail</span></div>
        <div class="pf-abstraction-panel">
          <h4>Keep only what solves the problem</h4>
          <div class="pf-detail-tag pf-kept"><i data-lucide="check"></i>Current city (one label)</div>
          <div class="pf-detail-tag pf-kept"><i data-lucide="check"></i>Road network as city &rarr; city + distance</div>
        </div>
        <div class="pf-abstraction-arrow"><i data-lucide="arrow-right"></i><span>State representation</span></div>
        <div class="pf-abstraction-panel pf-state-final-panel">
          <h4>State</h4>
          <span class="formula-box">s = current city</span>
        </div>
      </div>
    `;
  }

  // ---------- Concept panels (the primary column) ----------

  renderPanels() {
    const step = PF_STEPS[this.stepIdx];
    this.panelsEl.innerHTML = `<div class="teaching-panel active">${this['panel_' + step.key]()}</div>`;
  }

  panel_state() {
    const d = this.pfData();
    return `
      <h3>1. State</h3>
      <p>A state is a snapshot of just the information the agent needs to decide what to do next &mdash; not a full description of reality.</p>
      <div class="formula-box">s</div>
      <div class="teaching-tip"><i data-lucide="lightbulb"></i>${d.stateNote}</div>
    `;
  }

  panel_space() {
    const d = this.pfData();
    return `
      <h3>2. State Space</h3>
      <p>The state space is the set of <em>all</em> states reachable from the initial state by any sequence of actions.</p>
      <div class="stat-summary-box">${d.stateSpaceHtml}</div>
      <div class="teaching-tip"><i data-lucide="lightbulb"></i>${d.stateSpaceNote}</div>
    `;
  }

  panel_abstraction() {
    const d = this.pfData();
    return `
      <h3>3. Abstraction</h3>
      <p>Abstraction is the act of throwing away everything about the real world except what is needed to solve the problem: keep the information needed, ignore the rest.</p>
      ${d.abstractionFlow}
    `;
  }

  panel_initial() {
    const d = this.pfData();
    return `
      <h3>4. Initial State</h3>
      <p>The initial state s&#8320; is where the agent starts, before taking any action.</p>
      <div class="formula-box">${d.initialFormula}</div>
      <div class="teaching-tip"><i data-lucide="lightbulb"></i>Use "Reset to Initial State" under the illustration at any time to return here.</div>
    `;
  }

  panel_actions() {
    const d = this.pfData();
    return `
      <h3>5. Actions</h3>
      <p>ACTIONS(s) is the finite set of actions the agent may execute from state s. It can change as the state changes.</p>
      <div class="formula-box">${d.actionsFormula}</div>
      <div class="teaching-tip"><i data-lucide="lightbulb"></i>${d.actionsNote}</div>
    `;
  }

  panel_transition() {
    const d = this.pfData();
    return `
      <h3>6. Transition Model</h3>
      <p>RESULT(s, a) returns the state that results from executing action a in state s.</p>
      <div class="formula-box">RESULT(s, a) = s&prime;</div>
      ${d.lastMove ? `
        <div class="teaching-tip"><i data-lucide="arrow-right-left"></i><strong>${d.lastMove.before}</strong> &mdash;[${d.lastMove.action}]&rarr; <strong>${d.lastMove.after}</strong></div>
      ` : `<div class="teaching-tip"><i data-lucide="mouse-pointer-click"></i>Click an action in the illustration to see RESULT(s, a) computed live.</div>`}
    `;
  }

  panel_goal() {
    const d = this.pfData();
    return `
      <h3>7. Goal / Goal Test</h3>
      <p>GOAL-TEST(s) checks whether a state counts as a solution.</p>
      <div class="formula-box">${d.goalFormula}</div>
      <div class="teaching-tip"><i data-lucide="${d.goalReached ? 'check-circle-2' : 'circle-dashed'}"></i>Current state ${d.goalReached ? 'passes' : 'does not yet pass'} the goal test.</div>
    `;
  }

  panel_cost() {
    const d = this.pfData();
    return `
      <h3>8. Step Cost / Path Cost</h3>
      <p>Every action has a step cost. The path cost is the sum of step costs along the sequence of actions taken so far.</p>
      <div class="formula-box">${d.costFormula}</div>
      <div class="stat-summary-box">
        <div class="summary-item"><span class="summary-label">Actions taken</span><span class="summary-val">${d.actionsCount}</span></div>
        <div class="summary-item"><span class="summary-label">Path cost so far</span><span class="summary-val">${d.pathCost}</span></div>
      </div>
      <div class="teaching-tip"><i data-lucide="lightbulb"></i>${d.costNote}</div>
    `;
  }

  panel_final() {
    const d = this.pfData();
    return `
      <h3>9. The Formulated Problem</h3>
      <p>No search yet &mdash; just the formal pieces this example is built from, assembled together.</p>
      <div class="pf-final-grid">
        <div class="pf-final-item"><strong>States</strong><span>${d.finalStates}</span></div>
        <div class="pf-final-item"><strong>Initial State</strong><span>${d.finalInitial}</span></div>
        <div class="pf-final-item"><strong>Actions</strong><span>${d.finalActions}</span></div>
        <div class="pf-final-item"><strong>Transition Model</strong><span>${d.finalTransition}</span></div>
        <div class="pf-final-item"><strong>Goal Test</strong><span>${d.finalGoal}</span></div>
        <div class="pf-final-item"><strong>Step / Path Cost</strong><span>${d.finalCost}</span></div>
      </div>
    `;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.pfUI = new ProblemFormulationUI();
});
