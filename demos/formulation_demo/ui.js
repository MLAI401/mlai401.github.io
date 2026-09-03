/**
 * Problem Formulation — Lecture Illustration
 *
 * This is NOT a search demo. It does not run BFS/DFS/UCS/A*, and it never
 * mentions a frontier or node expansion. Its only job is to make the six
 * pieces of a formal problem definition (AIMA Ch. 3.1) concrete:
 *
 *   State, State Space, Initial State, Actions, Transition Model,
 *   Goal / Goal Test, Step Cost / Path Cost
 *
 * plus the idea of Abstraction that produces the state representation in
 * the first place. Two worked examples — the Two-Room Vacuum World and the
 * 8-Puzzle — share one illustration panel and one formulation panel, and an
 * instructor switches between them and steps through the concepts live.
 *
 * State logic reuses the exact same classes as the rest of the site
 * (VacuumEnvironment from demos/vaccum_demo/environment.js and PuzzleState
 * from demos/puzzle_demo/puzzle.js) so the numbers here match the Playground
 * demos the instructor will show right after this page.
 */

const PF_STEPS = [
  { key: 'state', name: 'State' },
  { key: 'space', name: 'State Space' },
  { key: 'abstraction', name: 'Abstraction' },
  { key: 'initial', name: 'Initial State' },
  { key: 'actions', name: 'Actions' },
  { key: 'transition', name: 'Transition Model' },
  { key: 'goal', name: 'Goal Test' },
  { key: 'cost', name: 'Step / Path Cost' }
];

const PF_PUZZLE_INITIAL = [7, 2, 4, 5, 0, 6, 8, 3, 1];
const PF_PUZZLE_GOAL = [0, 1, 2, 3, 4, 5, 6, 7, 8];
const PF_VACCUM_INITIAL = { location: 'A', roomA: 'Dirty', roomB: 'Dirty' };

class ProblemFormulationUI {
  constructor() {
    this.example = 'vaccum';
    this.stepIdx = 0;

    // Two independent, persistent worlds so switching examples never loses
    // whatever the instructor has already clicked through.
    this.vaccumEnv = new VacuumEnvironment(PF_VACCUM_INITIAL);
    this.vaccumActions = 0;
    this.vaccumLastMove = null; // { before, action, after }

    this.puzzleInitial = new PuzzleState(PF_PUZZLE_INITIAL);
    this.puzzleGoal = new PuzzleState(PF_PUZZLE_GOAL);
    this.puzzleState = new PuzzleState(PF_PUZZLE_INITIAL);
    this.puzzleActions = 0;
    this.puzzleLastMove = null;

    // DOM handles
    this.stageEl = document.getElementById('pf-stage');
    this.flowBarEl = document.getElementById('pf-flow-bar');
    this.panelsEl = document.getElementById('pf-panels');
    this.finalEl = document.getElementById('pf-final-content');
    this.exampleTabs = document.querySelectorAll('.pf-example-tab');
    this.btnPrev = document.getElementById('btn-pf-prev');
    this.btnNext = document.getElementById('btn-pf-next');

    this.bindEvents();
    this.render();
  }

  bindEvents() {
    this.exampleTabs.forEach(tab => {
      tab.addEventListener('click', () => this.setExample(tab.dataset.example));
    });

    this.btnPrev.addEventListener('click', () => this.setStep(this.stepIdx - 1));
    this.btnNext.addEventListener('click', () => this.setStep(this.stepIdx + 1));
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

  // ---------- Rendering ----------

  render() {
    this.renderExampleTabs();
    this.renderFlowBar();
    this.renderStage();
    this.renderPanels();
    this.renderFinal();
    this.updateNavButtons();
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  renderExampleTabs() {
    this.exampleTabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.example === this.example);
    });
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

  // Stage = the one shared illustration. It shows the live interactive
  // world on every step except "Abstraction", where it shows the
  // Real World -> State diagram instead.
  renderStage() {
    if (PF_STEPS[this.stepIdx].key === 'abstraction') {
      this.stageEl.innerHTML = this.example === 'vaccum' ? this.abstractionHtmlVaccum() : this.abstractionHtmlPuzzle();
      return;
    }
    this.stageEl.innerHTML = this.example === 'vaccum' ? this.stageHtmlVaccum() : this.stageHtmlPuzzle();
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
        ${here ? `<div class="pf-robot-icon"><i data-lucide="bot"></i></div>` : `<div style="height:42px;"></div>`}
        <span class="vaccum-model-pill ${status === 'Clean' ? 'clean' : 'dirty'}">${status}</span>
      </div>
    `;

    return `
      <div class="pf-stage-label">Two-Room Vacuum World &mdash; click an action below</div>
      <div class="pf-vaccum-rooms">
        ${roomCard('A', s.roomA, s.location === 'A')}
        ${roomCard('B', s.roomB, s.location === 'B')}
      </div>
      <div class="pf-action-row">
        ${['Suck', 'Left', 'Right'].map(a => `
          <button class="pf-action-btn ${highlightActions ? 'pf-highlight' : ''}" data-action="${a}" ${legal.includes(a) ? '' : 'disabled'}>${a}</button>
        `).join('')}
      </div>
      ${showGoal ? `<div class="pf-state-readout"><span class="vaccum-pill ${goalReached ? 'success' : 'danger'}">${goalReached ? 'Goal reached — both rooms Clean' : 'Not a goal state yet'}</span></div>` : ''}
      <div class="pf-state-readout"><span class="formula-box" style="display:inline-block;">s = (Location: ${s.location}, RoomA: ${s.roomA}, RoomB: ${s.roomB})</span></div>
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
      <div class="pf-stage-label">8-Puzzle &mdash; click a tile next to the blank</div>
      <div class="pf-puzzle-board">
        ${tiles.map((t, i) => `<div class="pf-puzzle-tile ${t === 0 ? 'pf-blank' : ''}" data-idx="${i}">${t === 0 ? '' : t}</div>`).join('')}
      </div>
      <div class="pf-action-row">
        ${['Up', 'Down', 'Left', 'Right'].map(a => `
          <button class="pf-action-btn ${highlightActions ? 'pf-highlight' : ''}" data-action="${a}" ${legal.includes(a) ? '' : 'disabled'}>${a}</button>
        `).join('')}
      </div>
      ${showGoal ? `<div class="pf-state-readout"><span class="vaccum-pill ${goalReached ? 'success' : 'danger'}">${goalReached ? 'Goal reached — matches goal arrangement' : 'Not a goal state yet'}</span></div>` : ''}
      <div class="pf-state-readout"><span class="formula-box" style="display:inline-block;">s = [${tiles.map(t => t === 0 ? '_' : t).join(', ')}]</span></div>
      <span class="pf-reset-link" id="pf-reset">Reset to Initial State</span>
    `;
  }

  wireStageEvents() {
    this.stageEl.querySelectorAll('.pf-action-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (this.example === 'vaccum') this.vaccumDoAction(action);
        else this.puzzleDoAction(action);
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

    const resetEl = document.getElementById('pf-reset');
    if (resetEl) {
      resetEl.addEventListener('click', () => {
        if (this.example === 'vaccum') this.vaccumReset();
        else this.puzzleReset();
      });
    }
  }

  abstractionHtmlVaccum() {
    return `
      <div class="pf-stage-label">Abstraction &mdash; from the real robot to a state</div>
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

  abstractionHtmlPuzzle() {
    return `
      <div class="pf-stage-label">Abstraction &mdash; from the physical board to a state</div>
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

  // ---------- Concept panels (right column) ----------

  renderPanels() {
    const step = PF_STEPS[this.stepIdx];
    this.panelsEl.innerHTML = `<div class="teaching-panel active">${this['panel_' + step.key]()}</div>`;
  }

  panel_state() {
    const isV = this.example === 'vaccum';
    return `
      <h3>1. State</h3>
      <p>A state is a snapshot of just the information the agent needs to decide what to do next &mdash; not a full description of reality.</p>
      <div class="formula-box">s</div>
      <div class="teaching-tip"><i data-lucide="lightbulb"></i>${isV
        ? 'Vacuum World state: robot location + the cleanliness of both rooms.'
        : '8-Puzzle state: the arrangement of the 9 tiles (8 numbered + 1 blank) on the 3×3 board.'}</div>
    `;
  }

  panel_space() {
    const isV = this.example === 'vaccum';
    return `
      <h3>2. State Space</h3>
      <p>The state space is the set of <em>all</em> states reachable from the initial state by any sequence of actions.</p>
      <div class="stat-summary-box">
        ${isV ? `
          <div class="summary-item"><span class="summary-label">Locations</span><span class="summary-val">2</span></div>
          <div class="summary-item"><span class="summary-label">Room A</span><span class="summary-val">2</span></div>
          <div class="summary-item"><span class="summary-label">Room B</span><span class="summary-val">2</span></div>
          <div class="summary-item"><span class="summary-label">Total states</span><span class="summary-val">2×2×2 = 8</span></div>
        ` : `
          <div class="summary-item"><span class="summary-label">Arrangements</span><span class="summary-val">9!</span></div>
          <div class="summary-item"><span class="summary-label">= </span><span class="summary-val">362,880</span></div>
          <div class="summary-item"><span class="summary-label">Reachable (solvable half)</span><span class="summary-val">181,440</span></div>
        `}
      </div>
      <div class="teaching-tip"><i data-lucide="lightbulb"></i>${isV
        ? 'Small state spaces like this one can be drawn and reasoned about completely by hand.'
        : 'Only half of all tile arrangements are reachable by sliding moves — the other half differ by one "illegal" swap.'}</div>
    `;
  }

  panel_abstraction() {
    return `
      <h3>3. Abstraction</h3>
      <p>Abstraction is the act of throwing away everything about the real world except what is needed to solve the problem.</p>
      <div class="formula-box">Real World &rarr; Remove detail &rarr; State</div>
      <div class="teaching-tip"><i data-lucide="lightbulb"></i>The illustration on the left now shows exactly which details are kept and which are dropped for this example.</div>
    `;
  }

  panel_initial() {
    const isV = this.example === 'vaccum';
    return `
      <h3>4. Initial State</h3>
      <p>The initial state s&#8320; is where the agent starts, before taking any action.</p>
      <div class="formula-box">${isV ? 's₀ = (A, Dirty, Dirty)' : `s₀ = [${PF_PUZZLE_INITIAL.map(t => t === 0 ? '_' : t).join(', ')}]`}</div>
      <div class="teaching-tip"><i data-lucide="lightbulb"></i>Use "Reset to Initial State" under the illustration at any time to return here.</div>
    `;
  }

  panel_actions() {
    const isV = this.example === 'vaccum';
    const legal = isV ? this.vaccumLegalActions() : this.puzzleState.getLegalActions();
    return `
      <h3>5. Actions</h3>
      <p>ACTIONS(s) is the finite set of actions the agent may execute from state s. It can change as the state changes.</p>
      <div class="formula-box">ACTIONS(s) = { ${legal.join(', ')} }</div>
      <div class="teaching-tip"><i data-lucide="lightbulb"></i>${isV
        ? 'Suck only appears when the current room is Dirty — the legal action set depends on the state.'
        : 'Only the moves that keep the blank on the 3×3 board are legal — buttons for the rest are disabled.'}</div>
    `;
  }

  panel_transition() {
    const isV = this.example === 'vaccum';
    const move = isV ? this.vaccumLastMove : this.puzzleLastMove;
    return `
      <h3>6. Transition Model</h3>
      <p>RESULT(s, a) returns the state that results from executing action a in state s.</p>
      <div class="formula-box">RESULT(s, a) = s&prime;</div>
      ${move ? `
        <div class="teaching-tip"><i data-lucide="arrow-right-left"></i><strong>${move.before}</strong> &mdash;[${move.action}]&rarr; <strong>${move.after}</strong></div>
      ` : `<div class="teaching-tip"><i data-lucide="mouse-pointer-click"></i>Click an action in the illustration to see RESULT(s, a) computed live.</div>`}
    `;
  }

  panel_goal() {
    const isV = this.example === 'vaccum';
    const reached = isV ? this.vaccumIsGoal() : this.puzzleIsGoal();
    return `
      <h3>7. Goal / Goal Test</h3>
      <p>GOAL-TEST(s) checks whether a state counts as a solution.</p>
      <div class="formula-box">${isV ? 'GOAL-TEST(s) = (RoomA = Clean) ∧ (RoomB = Clean)' : `IS-GOAL(s) = (s = [${PF_PUZZLE_GOAL.map(t => t === 0 ? '_' : t).join(', ')}])`}</div>
      <div class="teaching-tip"><i data-lucide="${reached ? 'check-circle-2' : 'circle-dashed'}"></i>Current state ${reached ? 'passes' : 'does not yet pass'} the goal test.</div>
    `;
  }

  panel_cost() {
    const isV = this.example === 'vaccum';
    const count = isV ? this.vaccumActions : this.puzzleActions;
    return `
      <h3>8. Step Cost / Path Cost</h3>
      <p>Every action has a step cost. The path cost is the sum of step costs along the sequence of actions taken so far.</p>
      <div class="formula-box">Step-Cost(s, a, s&prime;) = 1</div>
      <div class="stat-summary-box">
        <div class="summary-item"><span class="summary-label">Actions taken</span><span class="summary-val">${count}</span></div>
        <div class="summary-item"><span class="summary-label">Path cost so far</span><span class="summary-val">${count}</span></div>
      </div>
      <div class="teaching-tip"><i data-lucide="lightbulb"></i>For simplicity every action here costs 1 — path cost = number of actions taken.</div>
    `;
  }

  // ---------- Closing summary ----------

  renderFinal() {
    const isV = this.example === 'vaccum';
    this.finalEl.innerHTML = `
      <div class="pf-final-grid">
        <div class="pf-final-item"><strong>States</strong><span>${isV ? 'Location × RoomA × RoomB — 8 total states' : 'All 3×3 arrangements of 8 tiles + blank'}</span></div>
        <div class="pf-final-item"><strong>Initial State</strong><span>${isV ? 's₀ = (A, Dirty, Dirty)' : `s₀ = [${PF_PUZZLE_INITIAL.map(t => t === 0 ? '_' : t).join(', ')}]`}</span></div>
        <div class="pf-final-item"><strong>Actions</strong><span>${isV ? 'Suck, Left, Right' : 'Move blank Up, Down, Left, Right'}</span></div>
        <div class="pf-final-item"><strong>Transition Model</strong><span>RESULT(s, a) = s&prime;</span></div>
        <div class="pf-final-item"><strong>Goal Test</strong><span>${isV ? 'Both rooms Clean' : 'Tiles match the goal arrangement'}</span></div>
        <div class="pf-final-item"><strong>Step / Path Cost</strong><span>1 per action; path cost = number of actions</span></div>
      </div>
    `;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.pfUI = new ProblemFormulationUI();
});
