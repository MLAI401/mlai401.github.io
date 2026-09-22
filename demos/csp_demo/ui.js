/**
 * Constraint Satisfaction Problems — Lecture Page Controller (csp.html)
 *
 * Built from instructions/csp.md and AIMA Chapter 6. Same single-screen
 * lecture shell as adversarial.html: topic selector bar, concept column
 * (definition · AIMA notation · teaching tip) and illustration column.
 *
 * Topics:
 *   1. CSP Formulation            4. Local Search & Problem Structure
 *   2. Constraint Propagation     5. Evaluating CSP Solvers
 *   3. Backtracking Search
 *
 * Every live illustration calls into window.CSPEngine
 * (demos/csp_demo/csp_engine.js) — the same engine the Playground uses.
 * Notation is plain HTML/Unicode (the site loads no math renderer).
 */

(function () {
  'use strict';

  const E = window.CSPEngine;
  const AUS = E.AUSTRALIA;
  const HEX = E.COLOR_HEX;
  const ACCENT = '#0d9488';

  // ---------------------------------------------------------------------------
  // Topics & concepts
  // ---------------------------------------------------------------------------

  const CSP_TOPICS = [
    { id: 'formulation', title: 'Defining Constraint Satisfaction Problems', short: 'CSP Formulation' },
    { id: 'propagation', title: 'Constraint Propagation: Inference in CSPs', short: 'Constraint Propagation' },
    { id: 'backtracking', title: 'Backtracking Search for CSPs', short: 'Backtracking Search' },
    { id: 'local', title: 'Local Search & the Structure of Problems', short: 'Local Search & Structure' },
    { id: 'evaluation', title: 'Evaluating CSP Solvers', short: 'Evaluating CSP Solvers' }
  ];

  const TOPIC_INTROS = [
    'A CSP describes a problem with a factored state — variables, their domains, and constraints — so general-purpose algorithms can exploit its structure instead of treating each state as a black box.',
    'Inference uses the constraints to shrink domains before or during search. Enforcing local consistency (node, arc, path, global) can solve a problem outright or expose a dead end early.',
    'Backtracking search assigns one variable at a time and backs up on failure. Good variable/value ordering and interleaved inference (forward checking, MAC) make it dramatically faster.',
    'Local search repairs a complete assignment instead of building one; min-conflicts is remarkably effective. The shape of the constraint graph — components, trees, cutsets — can make a CSP easy.',
    'Compare solvers by assignments tried, backtracks, constraint checks and guarantees — measured live on the same engine the Playground uses.'
  ];

  const FORMULATION_CONCEPTS = [
    {
      key: 'xdc', name: 'Variables, Domains & Constraints', kind: 'xdc_examples',
      definition: 'A constraint satisfaction problem consists of a set of variables X, a set of domains D (one per variable), and a set of constraints C that specify allowable combinations of values.',
      notation: 'CSP = ⟨X, D, C⟩ · X = {X<sub>1</sub>, …, X<sub>n</sub>} · D<sub>i</sub> = {v<sub>1</sub>, …, v<sub>k</sub>} · C<sub>j</sub> = ⟨scope, rel⟩, e.g. ⟨(SA, WA), SA ≠ WA⟩',
      tip: 'A CSP uses a <strong>factored</strong> representation: a state is a set of variable = value pairs. Search algorithms in Topic 02 treated states as atomic black boxes; here the solver can look inside and see <em>which</em> variables cause a failure.'
    },
    {
      key: 'assignments', name: 'Assignments & Solutions', kind: 'map_play',
      definition: 'An assignment gives values to some (partial) or all (complete) variables. It is consistent if it violates no constraint. A solution is an assignment that is both complete and consistent.',
      notation: 'partial: {WA = red, NT = green} · complete: every X<sub>i</sub> assigned · solution ⇔ complete ∧ consistent',
      tip: 'Click the regions on the map to colour them. A partial assignment can already be inconsistent — that is exactly what lets backtracking prune a whole subtree the moment two neighbours share a colour.'
    },
    {
      key: 'graph', name: 'Constraint Graph', kind: 'map_graph',
      definition: 'A constraint graph has a node for each variable and an edge between any two variables that participate in a common (binary) constraint.',
      notation: 'G = (X, E) · (X<sub>i</sub>, X<sub>j</sub>) ∈ E ⇔ some C has scope {X<sub>i</sub>, X<sub>j</sub>} · deg(SA) = 5',
      tip: 'Read structure straight off the graph: Tasmania has no edges (an independent subproblem) and SA touches five regions (the most constrained). Later heuristics — degree, cutset conditioning — use exactly these facts.'
    },
    {
      key: 'types', name: 'Constraint Types', kind: 'constraint_types',
      definition: 'A unary constraint restricts one variable, a binary constraint relates two, and a global (higher-order) constraint involves an arbitrary number of variables, such as Alldiff.',
      notation: 'unary ⟨(SA), SA ≠ green⟩ · binary ⟨(SA, WA), SA ≠ WA⟩ · global Alldiff(F, T, U, W, R, O)',
      tip: 'Any finite-domain constraint can be rewritten as binary constraints (via auxiliary variables or the dual graph), which is why most algorithms in this topic are stated for binary CSPs.'
    },
    {
      key: 'hardsoft', name: 'Hard vs. Soft Constraints', kind: 'hard_soft',
      definition: 'Hard (absolute) constraints must be satisfied for an assignment to be legal. Soft (preference) constraints carry a cost; a CSP with preferences is a constraint optimisation problem (COP).',
      notation: 'feasible ⇔ ∀ hard C<sub>j</sub> satisfied · minimise Σ<sub>k</sub> w<sub>k</sub> · penalty<sub>k</sub>(assignment)',
      tip: 'In course timetabling, "no instructor teaches two classes at once" is hard; "Dr. Patel prefers mornings" is soft. Solvers usually find a feasible timetable first, then improve its soft score.'
    },
    {
      key: 'search', name: 'CSP as a Search Problem', kind: 'search_size',
      definition: 'Incremental formulation: the initial state is the empty assignment, an action assigns a value to one unassigned variable, and the goal test checks for a complete, consistent assignment.',
      notation: 'naïve tree leaves = n! · d<sup>n</sup> · commutativity ⇒ branch on one variable per level ⇒ d<sup>n</sup> leaves',
      tip: 'A CSP is <strong>commutative</strong>: WA = red then NT = green reaches the same state as the reverse order. So each tree level only needs to branch on a single variable — this removes the n! factor.'
    }
  ];

  const PROPAGATION_CONCEPTS = [
    {
      key: 'node', name: 'Node Consistency', kind: 'node_consistency',
      definition: 'A variable is node-consistent if every value in its domain satisfies the variable\'s unary constraints. A network is node-consistent if every variable is.',
      notation: '∀ x ∈ D<sub>i</sub> : C<sub>unary</sub>(X<sub>i</sub> = x) holds · D<sub>i</sub> ← {x ∈ D<sub>i</sub> | C(x)}',
      tip: 'Enforce node consistency once, up front. In timetabling, room capacity (H2) and instructor availability (H4) are unary — deleting impossible (slot, room) values before search shrinks every domain.'
    },
    {
      key: 'arc', name: 'Arc Consistency', kind: 'arc_revise',
      definition: 'X<sub>i</sub> is arc-consistent with respect to X<sub>j</sub> if for every value in D<sub>i</sub> there is some value in D<sub>j</sub> that satisfies the binary constraint on (X<sub>i</sub>, X<sub>j</sub>).',
      notation: 'REVISE(X<sub>i</sub>, X<sub>j</sub>): delete x ∈ D<sub>i</sub> if ∄ y ∈ D<sub>j</sub> with (x, y) ∈ C<sub>ij</sub> · AIMA: Y = X², X, Y ∈ {0 … 9}',
      tip: 'Arcs are <strong>directed</strong>. Making X consistent with Y (keep X ∈ {0, 1, 2, 3}) is a different operation from making Y consistent with X (keep Y ∈ {0, 1, 4, 9}).'
    },
    {
      key: 'ac3', name: 'AC-3 Algorithm', kind: 'ac3_stepper',
      definition: 'AC-3 keeps a queue of arcs. It pops an arc (X<sub>i</sub>, X<sub>j</sub>) and revises D<sub>i</sub>; if D<sub>i</sub> shrank, every arc (X<sub>k</sub>, X<sub>i</sub>) pointing into X<sub>i</sub> is re-queued. An empty domain means failure.',
      notation: 'AC-3(csp) · queue ← all arcs · if REVISE(X<sub>i</sub>, X<sub>j</sub>): if D<sub>i</sub> = ∅ return false; add (X<sub>k</sub>, X<sub>i</sub>) · time O(c · d³)',
      tip: 'With WA = red and Q = green, AC-3 alone forces NT = blue and SA = blue — and then notices NT and SA are neighbours. It proves the partial assignment is hopeless <em>without any search</em>.'
    },
    {
      key: 'path', name: 'Path & k-Consistency', kind: 'path_consistency',
      definition: 'A two-variable set {X<sub>i</sub>, X<sub>j</sub>} is path-consistent w.r.t. X<sub>m</sub> if every consistent assignment to X<sub>i</sub>, X<sub>j</sub> can be extended to X<sub>m</sub>. k-consistency generalises this to any k − 1 variables.',
      notation: '∀ {X<sub>i</sub> = a, X<sub>j</sub> = b} consistent ∃ c ∈ D<sub>m</sub> : (a, c) ∈ C<sub>im</sub> ∧ (b, c) ∈ C<sub>jm</sub> · strongly k-consistent ⇒ backtrack-free',
      tip: 'Two-colouring the WA–NT–SA triangle is arc-consistent (each single value has a supporting neighbour value) but has no solution. Path consistency looks at pairs and exposes the contradiction.'
    },
    {
      key: 'global', name: 'Global Constraints', kind: 'alldiff',
      definition: 'Global constraints involve an arbitrary number of variables and come with specialised propagation. Alldiff requires all its variables to take distinct values; Atmost limits a resource total.',
      notation: 'Alldiff(X<sub>1</sub> … X<sub>m</sub>) with |⋃ D<sub>i</sub>| = n : m &gt; n ⇒ inconsistent · Atmost(10, P<sub>1</sub>, P<sub>2</sub>, P<sub>3</sub>)',
      tip: 'Pigeonhole reasoning: three mutually adjacent regions that only have {red, green} left can never be all different. A dedicated Alldiff check spots this instantly; pairwise arc consistency does not.'
    },
    {
      key: 'sudoku', name: 'Sudoku as a CSP', kind: 'sudoku_ac3',
      definition: 'Each cell is a variable with domain {1 … 9} (or {1 … 4} on a 4×4 board); givens are single-value domains. Every row, column and box is an Alldiff constraint (27 of them on 9×9).',
      notation: 'X = 81 cells · D<sub>i</sub> = {1, …, 9} · Alldiff(row<sub>r</sub>), Alldiff(col<sub>c</sub>), Alldiff(box<sub>b</sub>) · each cell has 20 peers',
      tip: 'Easy newspaper Sudokus are solved by AC-3 alone — no guessing. Harder ones need search, but interleaving AC-3 with backtracking (MAC) still solves them in milliseconds.'
    }
  ];

  const BACKTRACKING_CONCEPTS = [
    {
      key: 'bt', name: 'Backtracking Search', kind: 'bt_stepper',
      definition: 'A depth-first search that chooses values for one variable at a time and backtracks when a variable has no legal values left to assign.',
      notation: 'BACKTRACK(assignment, csp): if complete return it · var ← SELECT-UNASSIGNED-VARIABLE · for value in ORDER-DOMAIN-VALUES · if consistent: add, INFERENCE, recurse · remove',
      tip: 'Plain backtracking is uninformed DFS plus a consistency check. Try the default "bad" fixed order in the illustration and count the backtracks — then switch to MRV or MAC and watch them disappear.'
    },
    {
      key: 'mrv', name: 'MRV Heuristic', kind: 'mrv_view',
      definition: 'Minimum-remaining-values chooses the variable with the fewest legal values — the variable most likely to cause a failure soon ("fail-first").',
      notation: 'SELECT-UNASSIGNED-VARIABLE = argmin<sub>X ∈ unassigned</sub> |legal(X)|',
      tip: 'After WA = red and NT = green, SA has only blue left. MRV assigns SA next; a static order might wander off to Q, NSW and V first and discover the problem much later.'
    },
    {
      key: 'degree', name: 'Degree Heuristic', kind: 'degree_view',
      definition: 'The degree heuristic chooses the variable involved in the largest number of constraints on other unassigned variables. It is mainly used as a tie-breaker for MRV.',
      notation: 'argmax<sub>X</sub> |{Y unassigned : (X, Y) ∈ E}| · initially deg(SA) = 5, deg(T) = 0',
      tip: 'At the start every region has three legal colours, so MRV is a tie. The degree heuristic breaks it by picking SA — with SA first, the map can be coloured with no backtracking at all.'
    },
    {
      key: 'lcv', name: 'LCV Heuristic', kind: 'lcv_view',
      definition: 'Least-constraining-value orders a variable\'s values so that the value ruling out the fewest choices for neighbouring variables is tried first.',
      notation: 'ORDER-DOMAIN-VALUES = sort x ∈ D<sub>X</sub> by Σ<sub>Y ∈ N(X)</sub> |{y ∈ D<sub>Y</sub> : (x, y) ∉ C<sub>XY</sub>}|',
      tip: 'Variable ordering is <strong>fail-first</strong> (prune early); value ordering is <strong>fail-last</strong> (we only need one solution, so try the most promising value first).'
    },
    {
      key: 'fc', name: 'Forward Checking', kind: 'fc_table',
      definition: 'Whenever X is assigned, forward checking establishes arc consistency for X: it deletes from every unassigned neighbour Y any value inconsistent with the value chosen for X.',
      notation: 'after X = x : ∀ Y ∈ N(X) unassigned, D<sub>Y</sub> ← {y ∈ D<sub>Y</sub> | (x, y) ∈ C<sub>XY</sub>} · D<sub>Y</sub> = ∅ ⇒ backtrack',
      tip: 'AIMA Fig 6.7: after WA = red and Q = green, NT and SA are both reduced to {blue}. Forward checking does not notice they are adjacent — it only looks one step ahead from the variable just assigned.'
    },
    {
      key: 'mac', name: 'MAC (Maintaining Arc Consistency)', kind: 'mac_compare',
      definition: 'After assigning X<sub>i</sub>, MAC calls AC-3 starting with the arcs (X<sub>j</sub>, X<sub>i</sub>) for unassigned neighbours X<sub>j</sub>, and propagates recursively whenever a domain shrinks.',
      notation: 'INFERENCE = AC-3(csp, queue = {(X<sub>j</sub>, X<sub>i</sub>) | X<sub>j</sub> ∈ N(X<sub>i</sub>) unassigned}) · MAC ⊇ forward checking',
      tip: 'MAC is strictly more powerful than forward checking: when NT and SA are both {blue}, the re-queued arc (NT, SA) empties a domain immediately and the branch is abandoned.'
    },
    {
      key: 'cbj', name: 'Conflict-Directed Backjumping', kind: 'backjump_view',
      definition: 'Instead of backing up to the most recent variable (chronological backtracking), backjumping jumps to the most recent variable in the conflict set — the assignments that actually caused the failure.',
      notation: 'conf(X<sub>j</sub>) ← conf(X<sub>j</sub>) ∪ conf(X<sub>i</sub>) − {X<sub>j</sub>} · jump to the latest variable in conf(X<sub>i</sub>)',
      tip: 'Order Q, NSW, V, T, SA with {Q = red, NSW = green, V = blue, T = red}: SA has no colour left. Changing T (Tasmania!) cannot help — the conflict set of SA is {Q, NSW, V}, so jump straight back to V.'
    }
  ];

  const LOCAL_CONCEPTS = [
    {
      key: 'minconf', name: 'Min-Conflicts', kind: 'minconf_stepper',
      definition: 'Local search for CSPs: start from a complete assignment, then repeatedly pick a conflicted variable at random and give it the value that minimises the number of violated constraints.',
      notation: 'MIN-CONFLICTS(csp, max_steps): var ← random conflicted variable · value ← argmin<sub>v</sub> CONFLICTS(var, v, current)',
      tip: 'The run-time of min-conflicts on n-queens is roughly independent of n — it solves the million-queens problem in about 50 steps on average after a greedy start.'
    },
    {
      key: 'plateau', name: 'Plateaus & Weighting', kind: 'minconf_chart',
      definition: 'The landscape often has plateaus where no move lowers the conflict count. Sideways moves, tabu lists and constraint weighting (increase the weight of constraints that stay violated) help escape them.',
      notation: 'tabu list of recent states · w<sub>j</sub> ← w<sub>j</sub> + 1 for each violated C<sub>j</sub> · minimise Σ w<sub>j</sub> · violated<sub>j</sub>',
      tip: 'Local search shines for online re-scheduling: when one flight is cancelled, repair the existing timetable with a few moves instead of solving from scratch.'
    },
    {
      key: 'components', name: 'Independent Subproblems', kind: 'components_calc',
      definition: 'If the constraint graph splits into connected components, each component is an independent subproblem; a solution is the union of the component solutions.',
      notation: 'n variables, components of size c : O(d<sup>c</sup> · n / c) instead of O(d<sup>n</sup>) — linear in n',
      tip: 'Tasmania is its own component. With n = 80 Boolean variables split into four pieces of 20, the work falls from 2<sup>80</sup> (age of the universe) to 4 · 2<sup>20</sup> (a fraction of a second).'
    },
    {
      key: 'tree', name: 'Tree-Structured CSPs', kind: 'tree_stepper',
      definition: 'If the constraint graph is a tree, the CSP can be solved in linear time: order the variables topologically, make each parent arc-consistent with its child from the leaves up, then assign from the root down.',
      notation: 'TREE-CSP-SOLVER · for j = n down to 2: MAKE-ARC-CONSISTENT(PARENT(X<sub>j</sub>), X<sub>j</sub>) · for j = 1 to n: assign X<sub>j</sub> · O(n · d²)',
      tip: 'After the backward pass the tree is <em>directionally</em> arc-consistent, so the forward pass never needs to backtrack: every parent value is guaranteed a compatible child value.'
    },
    {
      key: 'cutset', name: 'Cutset Conditioning', kind: 'cutset_view',
      definition: 'Choose a cycle cutset S — variables whose removal leaves a tree. For each consistent assignment to S, prune the neighbours\' domains and solve the remaining tree with the tree algorithm.',
      notation: '|S| = c : O(d<sup>c</sup> · (n − c) · d²) · Australia: S = {SA}, c = 1',
      tip: 'Assign SA first and the rest of Australia becomes a chain WA – NT – Q – NSW – V plus the isolated T — a tree. That is why the degree heuristic (SA first) worked so well.'
    },
    {
      key: 'decomp', name: 'Tree Decomposition', kind: 'tree_decomp',
      definition: 'A tree decomposition covers the constraint graph with overlapping subproblems arranged in a tree: every variable and constraint appears in some subproblem, and shared variables stay connected.',
      notation: 'tree width w = (largest subproblem) − 1 · solvable in O(n · d<sup>w+1</sup>)',
      tip: 'Solve each subproblem independently (its solutions become the "values" of a mega-variable), then solve the resulting tree of subproblems with the tree algorithm.'
    }
  ];

  const EVALUATION_CONCEPTS = [
    {
      key: 'bench', name: 'Live Solver Benchmark', kind: 'bench_live',
      definition: 'Run every solver configuration on the same problem and compare the work each one does: assignments tried, backtracks, constraint checks, and wall-clock time.',
      notation: 'cost ≈ #assignments · (constraint checks per assignment) · inference trades checks for fewer assignments',
      tip: 'Inference is not free — MAC does more constraint checks per node than forward checking — but on tight problems (Sudoku, dense maps) it wins because it explores far fewer nodes.'
    },
    {
      key: 'complexity', name: 'Complexity', kind: 'complexity_table',
      definition: 'General CSPs are NP-complete (they include 3-SAT), so every complete algorithm is exponential in the worst case; structure (trees, small cutsets, low tree width) gives polynomial special cases.',
      notation: 'backtracking O(d<sup>n</sup>) · AC-3 O(c · d³) · tree CSP O(n · d²) · cutset O(d<sup>c</sup> (n − c) d²) · tree decomposition O(n · d<sup>w+1</sup>)',
      tip: 'Heuristics and inference do not change the worst case — they change the typical case, often by many orders of magnitude.'
    },
    {
      key: 'properties', name: 'Completeness & Use Cases', kind: 'properties_table',
      definition: 'Systematic solvers (backtracking + heuristics + inference) are complete and can prove that no solution exists; local search is incomplete but scales to huge, loosely constrained problems.',
      notation: 'complete: BT, FC, MAC, tree solver · incomplete: min-conflicts (may stall on a plateau)',
      tip: 'Choose by problem shape: tight puzzles → MAC; huge scheduling / n-queens / repair problems → min-conflicts; tree-like graphs → the linear-time tree solver.'
    }
  ];

  const ALL_CONCEPTS = [FORMULATION_CONCEPTS, PROPAGATION_CONCEPTS, BACKTRACKING_CONCEPTS, LOCAL_CONCEPTS, EVALUATION_CONCEPTS];

  // ---------------------------------------------------------------------------
  // SVG / HTML helpers
  // ---------------------------------------------------------------------------

  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const colorDot = (c, extra) => `<span class="csp-dot ${extra || ''}" style="background:${HEX[c] || '#cbd5e1'}" title="${c}"></span>`;
  const domainDots = (vals, full) => (full || ['red', 'green', 'blue']).map(c => colorDot(c, vals.includes(c) ? '' : 'csp-dot-off')).join('');

  const { mapSVG, graphSVG } = window.CSPRender;

  const ausGraph = extra => graphSVG(Object.assign({ vars: AUS.variables, neighbors: AUS.neighbors, pos: AUS.graph }, extra || {}));

  function stepperHTML(prefix, idx, total, playing) {
    return `
      <div class="csp-stepper">
        <button class="csp-btn" id="${prefix}-reset" title="Reset"><i data-lucide="rotate-ccw"></i></button>
        <button class="csp-btn" id="${prefix}-prev" ${idx <= 0 ? 'disabled' : ''}><i data-lucide="chevron-left"></i> Prev</button>
        <button class="csp-btn csp-btn-primary" id="${prefix}-play"><i data-lucide="${playing ? 'pause' : 'play'}"></i> ${playing ? 'Pause' : 'Run'}</button>
        <button class="csp-btn" id="${prefix}-next" ${idx >= total - 1 ? 'disabled' : ''}>Next <i data-lucide="chevron-right"></i></button>
        <span class="csp-step-ind">Step ${Math.min(idx + 1, total)} / ${total}</span>
      </div>`;
  }

  function shell(title, tools, body, foot) {
    return `
      <div class="csp-ill">
        <div class="csp-ill-head">
          <div class="csp-ill-title">${title}</div>
          ${tools ? `<div class="csp-ill-tools">${tools}</div>` : ''}
        </div>
        <div class="csp-ill-body">${body}</div>
        ${foot ? `<div class="csp-ill-foot">${foot}</div>` : ''}
      </div>`;
  }

  function seg(id, options, active) {
    return `<div class="csp-seg" id="${id}">${options.map(([val, label]) => `<button data-val="${val}" class="${String(val) === String(active) ? 'active' : ''}">${label}</button>`).join('')}</div>`;
  }

  const fmt = n => (n >= 1e15 ? n.toExponential(2).replace('e+', ' × 10^') : Math.round(n).toLocaleString('en-US'));

  // ---------------------------------------------------------------------------
  // Controller
  // ---------------------------------------------------------------------------

  class CSPLectureUI {
    constructor() {
      this.topicIdx = 0;
      this.conceptIdx = 0;
      this.timer = null;
      this.st = {
        xdcExample: 'map',
        play: {},                 // manual map colouring
        graphSel: 'SA',
        typeSel: 'binary',
        searchN: 7, searchD: 3,
        ncCourse: 'AI302L', ncApplied: false,
        arcX: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], arcY: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], arcLog: [],
        ac3Preset: 'wa_q', ac3Step: 0,
        pathColors: 2,
        allM: 3, allN: 2,
        sudStep: 0,
        btVar: 'bad', btVal: 'static', btInf: 'none', btStep: 0,
        mrvAssign: { WA: 'red', NT: 'green' },
        degAssign: {},
        lcvVar: 'Q',
        fcStep: 0,
        mcSeed: 2, mcStep: 0,
        chartSeed: 5, chartN: 24,
        compN: 80, compC: 20, compD: 2,
        treeStep: 0,
        cutsetOn: false, cutsetVal: 'red',
        benchProblem: 'rand', benchRows: null
      };
      this.topicTabsEl = document.getElementById('csp-topic-tabs');
      this.conceptColEl = document.getElementById('csp-concept-col');
      this.graphColEl = document.getElementById('csp-graph-col');
      if (!this.topicTabsEl || !this.conceptColEl || !this.graphColEl) return;
      this.readHash();
      this.render();
    }

    /** Deep link support: csp.html#backtracking or #backtracking/mrv */
    readHash() {
      const h = (window.location.hash || '').replace('#', '');
      if (!h) return;
      const [t, c] = h.split('/');
      const ti = CSP_TOPICS.findIndex(x => x.id === t);
      if (ti >= 0) {
        this.topicIdx = ti;
        const ci = ALL_CONCEPTS[ti].findIndex(x => x.key === c);
        this.conceptIdx = ci >= 0 ? ci : 0;
      }
    }

    icons() { if (window.lucide) window.lucide.createIcons(); }

    clearTimer() { if (this.timer) { clearInterval(this.timer); this.timer = null; } }

    render() {
      this.renderTopicTabs();
      this.renderMainContent();
    }

    renderTopicTabs() {
      this.topicTabsEl.innerHTML = CSP_TOPICS.map((t, i) => `<button class="sl-topic-tab ${i === this.topicIdx ? 'active' : ''}" data-topic-idx="${i}">${t.short}</button>`).join('');
      this.topicTabsEl.querySelectorAll('.sl-topic-tab').forEach(btn => btn.addEventListener('click', e => {
        const idx = +e.currentTarget.getAttribute('data-topic-idx');
        if (idx === this.topicIdx) return;
        this.clearTimer();
        this.topicIdx = idx; this.conceptIdx = 0;
        this.render();
      }));
    }

    renderMainContent() {
      const concepts = ALL_CONCEPTS[this.topicIdx];
      const concept = concepts[this.conceptIdx] || concepts[0];
      const topic = CSP_TOPICS[this.topicIdx];
      const half = Math.ceil(concepts.length / 2);
      const rows = concepts.length > 3 ? [concepts.slice(0, half), concepts.slice(half)] : [concepts];
      let offset = 0;
      const rowHTML = rows.map(row => {
        const html = `<div class="sl-concept-row" style="grid-template-columns: repeat(${row.length}, minmax(0, 1fr));">${row.map((c, i) => `<button class="sl-concept-chip ${offset + i === this.conceptIdx ? 'active' : ''}" data-concept-idx="${offset + i}">${c.name}</button>`).join('')}</div>`;
        offset += row.length;
        return html;
      }).join('');

      this.conceptColEl.innerHTML = `
        <div class="csp-concept">
          <div class="csp-concept-head">
            <span class="sl-topic-badge csp-badge-accent"><i data-lucide="grid-3x3"></i> Topic 04 · ${topic.short}</span>
            <h2>${topic.title}</h2>
            <p class="sl-topic-intro">${TOPIC_INTROS[this.topicIdx]}</p>
          </div>
          <div class="sl-concept-selector">${rowHTML}</div>
          <div class="csp-def-box">
            <div class="csp-box-label">Definition</div>
            <div class="csp-def-text">${concept.definition}</div>
          </div>
          <div class="csp-notation-box">
            <div class="csp-box-label">AIMA Formal Notation</div>
            <div class="csp-notation-text">${concept.notation}</div>
          </div>
          <div class="csp-tip-box">
            <div class="csp-box-label"><i data-lucide="lightbulb"></i> Teaching Tip</div>
            <div class="csp-tip-text">${concept.tip}</div>
          </div>
        </div>`;

      this.conceptColEl.querySelectorAll('.sl-concept-chip').forEach(btn => btn.addEventListener('click', e => {
        this.clearTimer();
        this.conceptIdx = +e.currentTarget.getAttribute('data-concept-idx');
        this.renderMainContent();
      }));

      try { history.replaceState(null, '', '#' + topic.id + '/' + concept.key); } catch (e) { /* file:// */ }
      this.renderIllustration();
    }

    currentConcept() {
      const c = ALL_CONCEPTS[this.topicIdx];
      return c[this.conceptIdx] || c[0];
    }

    renderIllustration() {
      const kind = this.currentConcept().kind;
      const fn = this['ill_' + kind];
      if (typeof fn === 'function') fn.call(this);
      else this.graphColEl.innerHTML = '<div class="csp-empty">Illustration coming soon.</div>';
      this.icons();
    }

    /** Re-render only the illustration (keeps the concept column). */
    refresh() { this.renderIllustration(); }

    $(id) { return document.getElementById(id); }

    on(id, ev, fn) { const el = this.$(id); if (el) el.addEventListener(ev, fn); }

    bindSeg(id, fn) {
      const el = this.$(id);
      if (!el) return;
      el.querySelectorAll('button').forEach(b => b.addEventListener('click', () => fn(b.getAttribute('data-val'))));
    }

    /** Wire a stepper rendered with stepperHTML. key = state field holding the index. */
    bindStepper(prefix, key, total, interval) {
      const go = i => { this.st[key] = Math.max(0, Math.min(total - 1, i)); this.refresh(); };
      this.on(prefix + '-prev', 'click', () => { this.clearTimer(); go(this.st[key] - 1); });
      this.on(prefix + '-next', 'click', () => { this.clearTimer(); go(this.st[key] + 1); });
      this.on(prefix + '-reset', 'click', () => { this.clearTimer(); go(0); });
      this.on(prefix + '-play', 'click', () => {
        if (this.timer) { this.clearTimer(); this.refresh(); return; }
        if (this.st[key] >= total - 1) this.st[key] = 0;
        this.timer = setInterval(() => {
          if (this.st[key] >= total - 1) { this.clearTimer(); this.refresh(); return; }
          this.st[key]++;
          this.refresh();
        }, interval || 900);
        this.refresh();
      });
    }

    // =========================================================================
    // TOPIC 1 — CSP FORMULATION
    // =========================================================================

    ill_xdc_examples() {
      const ex = this.st.xdcExample;
      const S = E.SCHEDULE;
      let visual = '', X = '', D = '', C = '';
      if (ex === 'map') {
        visual = mapSVG({ assignment: { WA: 'red', NT: 'green', SA: 'blue' } });
        X = '{WA, NT, Q, NSW, V, SA, T} — 7 regions';
        D = 'D<sub>i</sub> = {red, green, blue} for every region';
        C = '9 binary constraints: SA ≠ WA, SA ≠ NT, SA ≠ Q, SA ≠ NSW, SA ≠ V, WA ≠ NT, NT ≠ Q, Q ≠ NSW, NSW ≠ V';
      } else if (ex === 'schedule') {
        const cols = S.days.map(d => `<th colspan="${S.periods.length}">${d}</th>`).join('');
        const per = S.days.map(() => S.periods.map(p => `<th class="csp-mini-p">${p}</th>`).join('')).join('');
        const rows = S.rooms.map(r => `<tr><th class="csp-mini-room">${r.id}<span>${r.cap} · ${r.type}</span></th>${new Array(S.nSlots).fill(0).map((_, s) => {
          const hit = s === 2 && r.id === 'HALL' ? 'CS101' : s === 8 && r.id === 'R202' ? 'AI301' : s === 5 && r.id === 'LAB1' ? 'CS201L' : '';
          return `<td class="${hit ? 'on' : ''}">${hit}</td>`;
        }).join('')}</tr>`).join('');
        visual = `<div class="csp-mini-tt-wrap"><table class="csp-mini-tt"><thead><tr><th></th>${cols}</tr><tr><th></th>${per}</tr></thead><tbody>${rows}</tbody></table></div>`;
        X = `${S.courses.length} course sessions: ${S.courses.map(c => c.id).join(', ')}`;
        D = `(timeslot, room) pairs: ${S.days.length} days × ${S.periods.length} periods × ${S.rooms.length} rooms = ${S.nSlots * S.rooms.length} values`;
        C = 'H1 room clash · H2 capacity/type · H3 instructor clash · H4 availability · H5 cohort clash · H6 all scheduled (+ soft S1–S5)';
      } else {
        const puzzle = E.SUDOKU_PRESETS.mini.puzzle;
        visual = `<div class="csp-sudoku csp-sudoku-4 csp-sudoku-static">${puzzle.split('').map((ch, i) => `<div class="csp-sud-cell ${ch !== '.' ? 'given' : ''} ${this.sudBorder(i, 4)}">${ch !== '.' ? ch : ''}</div>`).join('')}</div>`;
        X = '16 cells r<sub>0</sub>c<sub>0</sub> … r<sub>3</sub>c<sub>3</sub> (81 on a 9×9 board)';
        D = '{1, 2, 3, 4} for blanks · a single value for each given';
        C = '12 Alldiff constraints: 4 rows, 4 columns, 4 boxes (27 on 9×9)';
      }
      this.graphColEl.innerHTML = shell(
        'One formalism, many problems: ⟨X, D, C⟩',
        seg('csp-xdc-seg', [['map', 'Map colouring'], ['schedule', 'Course scheduling'], ['sudoku', 'Sudoku']], ex),
        `<div class="csp-xdc-visual">${visual}</div>
         <div class="csp-xdc-cards">
           <div class="csp-xdc-card"><span class="csp-xdc-key">X</span><div><div class="csp-xdc-name">Variables</div><div class="csp-xdc-val">${X}</div></div></div>
           <div class="csp-xdc-card"><span class="csp-xdc-key">D</span><div><div class="csp-xdc-name">Domains</div><div class="csp-xdc-val">${D}</div></div></div>
           <div class="csp-xdc-card"><span class="csp-xdc-key">C</span><div><div class="csp-xdc-name">Constraints</div><div class="csp-xdc-val">${C}</div></div></div>
         </div>`
      );
      this.bindSeg('csp-xdc-seg', v => { this.st.xdcExample = v; this.refresh(); });
    }

    sudBorder(i, n) {
      const b = Math.round(Math.sqrt(n));
      const r = Math.floor(i / n), c = i % n;
      const cls = [];
      if (c % b === b - 1 && c !== n - 1) cls.push('br');
      if (r % b === b - 1 && r !== n - 1) cls.push('bb');
      return cls.join(' ');
    }

    ill_map_play() {
      const a = this.st.play;
      const csp = E.makeMapCSP(AUS, 3);
      const conflicts = csp.conflictedEdges(a);
      const nAssigned = Object.keys(a).length;
      const complete = nAssigned === AUS.variables.length;
      const consistent = conflicts.length === 0;
      const status = complete && consistent ? '<span class="csp-pill ok">SOLUTION</span>'
        : `<span class="csp-pill ${complete ? 'info' : 'neutral'}">${complete ? 'Complete' : nAssigned ? 'Partial' : 'Empty'}</span><span class="csp-pill ${consistent ? 'ok' : 'bad'}">${consistent ? 'Consistent' : 'Inconsistent'}</span>`;
      const asg = nAssigned ? '{ ' + AUS.variables.filter(v => a[v]).map(v => `${v} = ${a[v]}`).join(', ') + ' }' : '{ }';
      this.graphColEl.innerHTML = shell(
        'Colour the map — click a region to cycle red → green → blue → blank',
        `<button class="csp-btn" id="csp-play-clear"><i data-lucide="eraser"></i> Clear</button><button class="csp-btn" id="csp-play-solve"><i data-lucide="sparkles"></i> Show a solution</button>`,
        `<div class="csp-map-wrap">${mapSVG({ assignment: a, conflicts, clickable: true })}</div>`,
        `<div class="csp-status-row">${status}<span class="csp-muted">${nAssigned} / 7 assigned · ${conflicts.length} violated constraint${conflicts.length === 1 ? '' : 's'}</span></div>
         <div class="csp-code">assignment = ${asg}</div>`
      );
      this.graphColEl.querySelectorAll('.csp-region.clickable').forEach(p => p.addEventListener('click', () => {
        const v = p.getAttribute('data-var');
        const cycle = [undefined, 'red', 'green', 'blue'];
        const next = cycle[(cycle.indexOf(a[v]) + 1) % cycle.length];
        if (next) a[v] = next; else delete a[v];
        this.refresh();
      }));
      this.on('csp-play-clear', 'click', () => { this.st.play = {}; this.refresh(); });
      this.on('csp-play-solve', 'click', () => {
        const r = E.backtrackingSearch(csp, { varOrder: 'mrv-degree', valOrder: 'lcv', inference: 'mac', trace: false });
        this.st.play = Object.assign({}, r.solution);
        this.refresh();
      });
    }

    ill_map_graph() {
      const sel = this.st.graphSel;
      const nb = sel ? AUS.neighbors[sel] : [];
      const hlEdges = nb.map(u => [sel, u]);
      const deg = AUS.variables.map(v => `<span class="csp-deg-chip ${v === sel ? 'active' : ''}" data-var="${v}">${v} <b>${AUS.neighbors[v].length}</b></span>`).join('');
      this.graphColEl.innerHTML = shell(
        'Map ↔ constraint graph (click a region or a node)',
        '',
        `<div class="csp-duo">
           <div class="csp-duo-cell"><div class="csp-duo-label">Map</div>${mapSVG({ highlight: sel ? [sel, ...nb] : [], clickable: true, assignment: sel ? { [sel]: 'blue' } : {}, tint: Object.fromEntries(nb.map(u => [u, 'green'])) })}</div>
           <div class="csp-duo-cell"><div class="csp-duo-label">Constraint graph</div>${ausGraph({ highlight: sel ? [sel] : [], hlEdges, assignment: sel ? { [sel]: 'blue' } : {}, dim: sel ? AUS.variables.filter(v => v !== sel && !nb.includes(v)) : [] })}</div>
         </div>`,
        `<div class="csp-status-row"><span class="csp-muted">Degree of each variable:</span> ${deg}</div>
         <div class="csp-code">${sel}: neighbours N(${sel}) = {${nb.join(', ') || '∅'}} · degree ${nb.length}${sel === 'T' ? ' — an independent subproblem' : sel === 'SA' ? ' — the most constrained region' : ''}</div>`
      );
      const pick = v => { this.st.graphSel = v; this.refresh(); };
      this.graphColEl.querySelectorAll('[data-var]').forEach(el => el.addEventListener('click', () => pick(el.getAttribute('data-var'))));
    }

    ill_constraint_types() {
      const types = {
        unary: { label: 'Unary', arity: '1 variable', ex: '⟨(SA), SA ≠ green⟩', note: 'Restricts a single variable — e.g. "South Australians dislike green". Removed once by node consistency.' },
        binary: { label: 'Binary', arity: '2 variables', ex: '⟨(SA, NSW), SA ≠ NSW⟩', note: 'Relates two variables; appears as an edge in the constraint graph. All map-colouring constraints are binary.' },
        global: { label: 'Global', arity: 'n variables', ex: 'Alldiff(r<sub>1</sub>c<sub>1</sub>, …, r<sub>1</sub>c<sub>9</sub>)', note: 'Involves an arbitrary number of variables — Sudoku rows, columns and boxes. Drawn as a constraint hyper-node.' },
        higher: { label: 'Higher-order', arity: '3+ variables', ex: 'O + O = R + 10 · C<sub>1</sub>', note: 'Cryptarithm TWO + TWO = FOUR (AIMA Fig 6.2): column constraints link letters and carry digits C<sub>1</sub>, C<sub>2</sub>, C<sub>3</sub>.' }
      };
      const sel = this.st.typeSel;
      const t = types[sel];
      let svg = '';
      const node = (x, y, l, cls) => `<g class="csp-gnode ${cls || ''}"><circle cx="${x}" cy="${y}" r="17" fill="#fff"></circle><text x="${x}" y="${y + 4}" class="csp-gnode-label">${l}</text></g>`;
      const box = (x, y, l) => `<g><rect x="${x - 26}" y="${y - 13}" width="52" height="26" rx="5" class="csp-hyper-box"></rect><text x="${x}" y="${y + 4}" class="csp-hyper-label">${l}</text></g>`;
      if (sel === 'unary') {
        svg = `<path d="M 186 78 C 150 20, 250 20, 214 78" class="csp-gedge hl" fill="none"></path>${node(200, 95, 'SA')}<text x="200" y="36" class="csp-hyper-label">≠ green</text>`;
      } else if (sel === 'binary') {
        svg = `<line x1="130" y1="95" x2="270" y2="95" class="csp-gedge hl"></line>${node(130, 95, 'SA')}${node(270, 95, 'NSW')}<text x="200" y="85" class="csp-hyper-label">≠</text>`;
      } else if (sel === 'global') {
        const xs = [60, 100, 140, 180, 220, 260, 300, 340];
        svg = xs.map(x => `<line x1="${x}" y1="140" x2="200" y2="60" class="csp-gedge"></line>`).join('') + box(200, 55, 'Alldiff') + xs.map((x, i) => node(x, 140, 'c' + (i + 1))).join('');
      } else {
        const letters = ['T', 'W', 'O', 'F', 'U', 'R'];
        const lx = [70, 130, 190, 250, 310, 370].map(x => x - 20);
        svg = box(200, 30, 'Alldiff');
        letters.forEach((l, i) => { svg += `<line x1="${lx[i]}" y1="80" x2="200" y2="40" class="csp-gedge"></line>`; });
        const cols = [[90, 'O+O'], [200, 'W+W'], [310, 'T+T']];
        cols.forEach(([x]) => { letters.slice(0, 3).forEach((_, i) => { svg += `<line x1="${x}" y1="150" x2="${lx[i + (x > 200 ? 2 : x > 100 ? 1 : 0)]}" y2="80" class="csp-gedge"></line>`; }); });
        letters.forEach((l, i) => { svg += node(lx[i], 80, l); });
        cols.forEach(([x, l]) => { svg += box(x, 155, l); });
        svg += node(145, 200, 'C1', 'dim') + node(255, 200, 'C2', 'dim');
        svg += `<line x1="90" y1="168" x2="145" y2="183" class="csp-gedge"></line><line x1="200" y1="168" x2="145" y2="183" class="csp-gedge"></line><line x1="200" y1="168" x2="255" y2="183" class="csp-gedge"></line><line x1="310" y1="168" x2="255" y2="183" class="csp-gedge"></line>`;
      }
      this.graphColEl.innerHTML = shell(
        'Constraint arity',
        '',
        `<div class="csp-type-grid">${Object.entries(types).map(([k, v]) => `<button class="csp-type-card ${k === sel ? 'active' : ''}" data-type="${k}"><span class="csp-type-label">${v.label}</span><span class="csp-type-arity">${v.arity}</span></button>`).join('')}</div>
         <div class="csp-card csp-type-visual"><svg viewBox="0 0 400 ${sel === 'higher' ? 225 : 175}" class="csp-graph-svg">${svg}</svg></div>`,
        `<div class="csp-code">${t.ex}</div><p class="csp-note">${t.note}</p>`
      );
      this.graphColEl.querySelectorAll('[data-type]').forEach(b => b.addEventListener('click', () => { this.st.typeSel = b.getAttribute('data-type'); this.refresh(); }));
    }

    getSchedule() {
      if (!this._sched) this._sched = E.solveSchedule();
      return this._sched;
    }

    ill_hard_soft() {
      const S = E.SCHEDULE;
      const sol = this.getSchedule();
      const ev = sol.eval;
      const init = E.evaluateSchedule(sol.initial);
      const hardRows = Object.keys(S.hardInfo).map(k => `<li><span class="csp-hs-key hard">${k}</span><span class="csp-hs-name">${S.hardInfo[k]}</span><span class="csp-pill ${ev.hard[k].length ? 'bad' : 'ok'}">${ev.hard[k].length ? ev.hard[k].length + ' clash' : '✓ 0'}</span></li>`).join('');
      const softRows = Object.keys(S.softInfo).map(k => `<li><span class="csp-hs-key soft">${k}</span><span class="csp-hs-name">${S.softInfo[k]} <em>w=${S.weights[k]}</em></span><span class="csp-hs-cost">${init.softBy[k]} → <b>${ev.softBy[k]}</b></span></li>`).join('');
      this.graphColEl.innerHTML = shell(
        'University timetabling: feasibility first, then quality',
        `<a class="csp-btn" href="playground.html#view-csp"><i data-lucide="play-circle"></i> Open scheduler</a>`,
        `<div class="csp-hs-grid">
           <div class="csp-card"><div class="csp-hs-title">Hard constraints <span>must hold</span></div><ul class="csp-hs-list">${hardRows}</ul></div>
           <div class="csp-card"><div class="csp-hs-title">Soft constraints <span>penalty: feasible → optimised</span></div><ul class="csp-hs-list">${softRows}</ul></div>
         </div>
         <div class="csp-hs-bar">
           <div><span class="csp-muted">Phase 1 · backtracking + MRV + FC</span><b>${sol.bt.stats.assignments} assignments, ${sol.bt.stats.backtracks} backtracks → feasible, soft cost ${init.softCost}</b></div>
           <div><span class="csp-muted">Phase 2 · local search on soft cost</span><b>${sol.history.length - 1} improving moves → soft cost ${ev.softCost}</b></div>
         </div>`,
        `<p class="csp-note">H2 and H4 are <strong>unary</strong> (node consistency removes them from the domains), H1/H3/H5 are <strong>binary</strong>, and H6 is the goal test. The soft constraints turn the CSP into an optimisation problem.</p>`
      );
    }

    ill_search_size() {
      const n = this.st.searchN, d = this.st.searchD;
      let fact = 1; for (let i = 2; i <= n; i++) fact *= i;
      const naive = fact * Math.pow(d, n);
      const comm = Math.pow(d, n);
      const branchN = n * d;
      const drawBranches = (k, cx, max) => {
        const shown = Math.min(k, max);
        let s = `<circle cx="${cx}" cy="26" r="9" class="csp-tree-root"></circle><text x="${cx}" y="30" class="csp-tree-t">{}</text>`;
        for (let i = 0; i < shown; i++) {
          const x = cx - 80 + (160 / Math.max(1, shown - 1)) * i;
          s += `<line x1="${cx}" y1="35" x2="${shown === 1 ? cx : x}" y2="92" class="csp-gedge"></line><circle cx="${shown === 1 ? cx : x}" cy="96" r="4.5" class="csp-tree-leaf"></circle>`;
        }
        if (k > max) s += `<text x="${cx}" y="122" class="csp-tree-t">… ${k} branches</text>`;
        else s += `<text x="${cx}" y="122" class="csp-tree-t">${k} branches</text>`;
        return s;
      };
      this.graphColEl.innerHTML = shell(
        'How big is the search tree?',
        '',
        `<div class="csp-sliders">
           <label>n (variables) <b>${n}</b><input type="range" min="2" max="12" value="${n}" id="csp-ss-n"></label>
           <label>d (domain size) <b>${d}</b><input type="range" min="2" max="5" value="${d}" id="csp-ss-d"></label>
         </div>
         <div class="csp-duo">
           <div class="csp-duo-cell"><div class="csp-duo-label">Naïve: any variable, any value</div><svg viewBox="0 0 200 130" class="csp-graph-svg">${drawBranches(branchN, 100, 14)}</svg></div>
           <div class="csp-duo-cell"><div class="csp-duo-label">Commutative: one variable per level</div><svg viewBox="0 0 200 130" class="csp-graph-svg">${drawBranches(d, 100, 14)}</svg></div>
         </div>
         <div class="csp-metric-row">
           <div class="csp-metric bad"><span>Naïve leaves n! · d<sup>n</sup></span><b>${fmt(naive)}</b></div>
           <div class="csp-metric ok"><span>Commutative leaves d<sup>n</sup></span><b>${fmt(comm)}</b></div>
           <div class="csp-metric"><span>Saving factor n!</span><b>${fmt(fact)}×</b></div>
         </div>`,
        `<p class="csp-note">Level ℓ of the naïve tree has branching factor (n − ℓ)·d. Australia (n = 7, d = 3): 7! · 3⁷ = 11,022,480 leaves naïvely, but only 3⁷ = 2,187 complete assignments.</p>`
      );
      this.on('csp-ss-n', 'input', e => { this.st.searchN = +e.target.value; this.refresh(); });
      this.on('csp-ss-d', 'input', e => { this.st.searchD = +e.target.value; this.refresh(); });
    }

    // =========================================================================
    // TOPIC 2 — CONSTRAINT PROPAGATION
    // =========================================================================

    ill_node_consistency() {
      const S = E.SCHEDULE;
      const course = E.courseById(this.st.ncCourse);
      const applied = this.st.ncApplied;
      let kept = 0, h2 = 0, h4 = 0;
      const rows = S.rooms.map(r => {
        const cells = [];
        for (let s = 0; s < S.nSlots; s++) {
          const u = E.unaryOk(course, s, r.id);
          let cls = 'ok', txt = '';
          if (!u.h2) { cls = 'h2'; txt = 'H2'; h2++; }
          else if (!u.h4) { cls = 'h4'; txt = 'H4'; h4++; }
          else kept++;
          cells.push(`<td class="csp-nc-${cls} ${applied && cls !== 'ok' ? 'struck' : ''}" title="${E.slotLabel(s)} · ${r.id}">${applied && cls !== 'ok' ? '' : txt || '✓'}</td>`);
        }
        return `<tr><th class="csp-mini-room">${r.id}<span>${r.cap} · ${r.type}</span></th>${cells.join('')}</tr>`;
      }).join('');
      const cols = S.days.map(d => `<th colspan="${S.periods.length}">${d}</th>`).join('');
      const per = S.days.map(() => S.periods.map(p => `<th class="csp-mini-p">${p.slice(0, 2)}</th>`).join('')).join('');
      const opts = S.courses.map(c => `<option value="${c.id}" ${c.id === course.id ? 'selected' : ''}>${c.id} — ${c.name}</option>`).join('');
      const inst = S.instructors[course.instr];
      this.graphColEl.innerHTML = shell(
        'Node consistency on a course\'s (slot, room) domain',
        `<select class="csp-select" id="csp-nc-course">${opts}</select><button class="csp-btn ${applied ? '' : 'csp-btn-primary'}" id="csp-nc-apply">${applied ? 'Undo' : 'Apply node consistency'}</button>`,
        `<div class="csp-course-facts"><span><b>${course.id}</b> · ${course.enroll} students · needs a <b>${course.type}</b> room</span><span>Dr. ${course.instr} unavailable: <b>${inst.unavailLabel}</b></span></div>
         <div class="csp-mini-tt-wrap"><table class="csp-mini-tt csp-nc-table"><thead><tr><th></th>${cols}</tr><tr><th></th>${per}</tr></thead><tbody>${rows}</tbody></table></div>
         <div class="csp-legend"><span><i class="csp-lg ok"></i> consistent value</span><span><i class="csp-lg h2"></i> H2 capacity / type</span><span><i class="csp-lg h4"></i> H4 unavailable</span></div>`,
        `<div class="csp-metric-row">
           <div class="csp-metric"><span>|D| before</span><b>${S.nSlots * S.rooms.length}</b></div>
           <div class="csp-metric bad"><span>removed (H2 / H4)</span><b>${h2} / ${h4}</b></div>
           <div class="csp-metric ok"><span>|D| after</span><b>${kept}</b></div>
         </div>`
      );
      this.on('csp-nc-course', 'change', e => { this.st.ncCourse = e.target.value; this.refresh(); });
      this.on('csp-nc-apply', 'click', () => { this.st.ncApplied = !applied; this.refresh(); });
    }

    ill_arc_revise() {
      const X = this.st.arcX, Y = this.st.arcY;
      const all = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
      const xPos = v => 30 + v * 38, W = 400;
      let lines = '';
      for (const x of X) if (Y.includes(x * x)) lines += `<line x1="${xPos(x)}" y1="44" x2="${xPos(x * x)}" y2="126" class="csp-support"></line>`;
      const chip = (v, y, alive, label) => `<g class="csp-vchip ${alive ? '' : 'gone'}"><rect x="${xPos(v) - 15}" y="${y - 14}" width="30" height="28" rx="7"></rect><text x="${xPos(v)}" y="${y + 5}">${label != null ? label : v}</text></g>`;
      const svg = `<svg viewBox="0 0 ${W} 170" class="csp-graph-svg">
        <text x="6" y="34" class="csp-row-label">X</text><text x="6" y="146" class="csp-row-label">Y</text>
        ${lines}
        ${all.map(v => chip(v, 30, X.includes(v))).join('')}
        ${all.map(v => chip(v, 140, Y.includes(v))).join('')}
      </svg>`;
      const log = this.st.arcLog.slice(-3).map(l => `<div>${l}</div>`).join('') || '<div>Constraint Y = X². Press REVISE to make one arc consistent.</div>';
      this.graphColEl.innerHTML = shell(
        'REVISE on the constraint Y = X² (X, Y ∈ {0 … 9})',
        `<button class="csp-btn csp-btn-primary" id="csp-arc-xy">REVISE(X, Y)</button><button class="csp-btn csp-btn-primary" id="csp-arc-yx">REVISE(Y, X)</button><button class="csp-btn" id="csp-arc-reset"><i data-lucide="rotate-ccw"></i></button>`,
        `<div class="csp-card">${svg}</div>
         <div class="csp-metric-row">
           <div class="csp-metric"><span>D(X)</span><b>{${X.join(', ')}}</b></div>
           <div class="csp-metric"><span>D(Y)</span><b>{${Y.join(', ')}}</b></div>
         </div>`,
        `<div class="csp-log">${log}</div>`
      );
      const rev = dir => {
        if (dir === 'xy') {
          const removed = X.filter(x => !Y.includes(x * x));
          this.st.arcX = X.filter(x => Y.includes(x * x));
          this.st.arcLog.push(`REVISE(X, Y): ${removed.length ? 'removed ' + removed.join(', ') + ' — x² is not in D(Y)' : 'nothing removed — X is already consistent with Y'}.`);
        } else {
          const removed = Y.filter(y => !X.some(x => x * x === y));
          this.st.arcY = Y.filter(y => X.some(x => x * x === y));
          this.st.arcLog.push(`REVISE(Y, X): ${removed.length ? 'removed ' + removed.join(', ') + ' — not a perfect square of any x ∈ D(X)' : 'nothing removed — Y is already consistent with X'}.`);
        }
        this.refresh();
      };
      this.on('csp-arc-xy', 'click', () => rev('xy'));
      this.on('csp-arc-yx', 'click', () => rev('yx'));
      this.on('csp-arc-reset', 'click', () => { this.st.arcX = all.slice(); this.st.arcY = all.slice(); this.st.arcLog = []; this.refresh(); });
    }

    ac3Presets() {
      return {
        wa: { label: 'WA = red', init: { WA: 'red' } },
        wa_nt: { label: 'WA = red, NT = green', init: { WA: 'red', NT: 'green' } },
        wa_q: { label: 'WA = red, Q = green', init: { WA: 'red', Q: 'green' } }
      };
    }

    ill_ac3_stepper() {
      const P = this.ac3Presets()[this.st.ac3Preset];
      const key = 'ac3:' + this.st.ac3Preset;
      if (this._ac3Key !== key) {
        const csp = E.makeMapCSP(AUS, 3);
        const d = E.copyDomains(csp.domains);
        for (const k in P.init) d[k] = [P.init[k]];
        this._ac3 = E.ac3(csp, d, null, { trace: true });
        this._ac3Key = key;
      }
      const steps = this._ac3.steps;
      const i = Math.min(this.st.ac3Step, steps.length - 1);
      const s = steps[i];
      const tint = {};
      for (const v of AUS.variables) if (!P.init[v] && s.domains[v].length === 1) tint[v] = s.domains[v][0];
      const q = s.queue || [];
      const qHTML = q.slice(0, 14).map(([a, b], k) => `<span class="csp-arc-chip ${k === 0 ? 'next' : ''}">${a}→${b}</span>`).join('') + (q.length > 14 ? `<span class="csp-muted">+${q.length - 14} more</span>` : '') || '<span class="csp-muted">empty</span>';
      const opts = Object.entries(this.ac3Presets()).map(([k, v]) => `<option value="${k}" ${k === this.st.ac3Preset ? 'selected' : ''}>${v.label}</option>`).join('');
      const kindPill = { start: ['neutral', 'START'], keep: ['neutral', 'NO CHANGE'], revise: ['info', 'REVISED'], wipeout: ['bad', 'DOMAIN WIPE-OUT'], done: ['ok', 'ARC-CONSISTENT'] }[s.kind];
      this.graphColEl.innerHTML = shell(
        'AC-3 on Australia',
        `<select class="csp-select" id="csp-ac3-preset">${opts}</select>`,
        `<div class="csp-map-wrap">${mapSVG({ assignment: P.init, domains: s.domains, tint, arc: s.arc || null, highlight: s.arc ? [s.arc[0]] : [] })}</div>
         <div class="csp-queue"><span class="csp-queue-label">Queue (${q.length})</span>${qHTML}</div>`,
        `${stepperHTML('csp-ac3', i, steps.length, !!this.timer)}
         <div class="csp-status-row"><span class="csp-pill ${kindPill[0]}">${kindPill[1]}</span><span class="csp-msg">${s.msg}</span></div>`
      );
      this.on('csp-ac3-preset', 'change', e => { this.clearTimer(); this.st.ac3Preset = e.target.value; this.st.ac3Step = 0; this.refresh(); });
      this.bindStepper('csp-ac3', 'ac3Step', steps.length, 700);
    }

    ill_path_consistency() {
      const k = this.st.pathColors;
      const colors = ['red', 'green', 'blue'].slice(0, k);
      const pairs = [];
      for (const a of colors) for (const b of colors) if (a !== b) pairs.push([a, b, colors.filter(c => c !== a && c !== b)]);
      const arcOK = colors.length >= 2;
      const pathOK = pairs.every(p => p[2].length > 0);
      const tri = { WA: [20, 70], NT: [50, 12], SA: [80, 70] };
      const rows = pairs.map(([a, b, ext]) => `<tr><td>${colorDot(a)} ${a}</td><td>${colorDot(b)} ${b}</td><td>${ext.length ? ext.map(c => colorDot(c) + ' ' + c).join(' ') : '<span class="csp-bad-txt">none — cannot extend</span>'}</td></tr>`).join('');
      this.graphColEl.innerHTML = shell(
        'Arc consistency is not enough: the WA–NT–SA triangle',
        seg('csp-path-seg', [[2, '2 colours'], [3, '3 colours']], k),
        `<div class="csp-duo">
           <div class="csp-duo-cell">${graphSVG({ vars: ['WA', 'NT', 'SA'], neighbors: { WA: ['NT', 'SA'], NT: ['WA', 'SA'], SA: ['WA', 'NT'] }, pos: tri, W: 220, H: 170, r: 18, sub: { WA: '{' + colors.join(',') + '}', NT: '{' + colors.join(',') + '}', SA: '{' + colors.join(',') + '}' } })}</div>
           <div class="csp-duo-cell">
             <table class="csp-table"><thead><tr><th>WA</th><th>NT</th><th>values left for SA</th></tr></thead><tbody>${rows}</tbody></table>
           </div>
         </div>
         <div class="csp-metric-row">
           <div class="csp-metric ${arcOK ? 'ok' : 'bad'}"><span>Arc-consistent?</span><b>${arcOK ? 'Yes' : 'No'}</b></div>
           <div class="csp-metric ${pathOK ? 'ok' : 'bad'}"><span>Path-consistent ({WA, NT} w.r.t. SA)?</span><b>${pathOK ? 'Yes' : 'No'}</b></div>
           <div class="csp-metric ${pathOK ? 'ok' : 'bad'}"><span>Solution exists?</span><b>${pathOK ? 'Yes' : 'No'}</b></div>
         </div>`,
        `<p class="csp-note">${k === 2 ? 'Every single value has a different-coloured partner on each arc, so AC-3 removes nothing — yet every consistent pair for {WA, NT} leaves SA with no colour. PC-2 deletes all those pairs and exposes the inconsistency.' : 'With three colours every consistent pair for {WA, NT} leaves exactly one colour for SA — the triangle is path-consistent and solvable.'}</p>`
      );
      this.bindSeg('csp-path-seg', v => { this.st.pathColors = +v; this.refresh(); });
    }

    ill_alldiff() {
      const m = this.st.allM, n = this.st.allN;
      const fail = m > n;
      const vals = ['red', 'green', 'blue', 'yellow', 'purple'].slice(0, n);
      const vHex = c => HEX[c] || '#8b5cf6';
      const pig = [];
      for (let i = 0; i < m; i++) pig.push(`<div class="csp-pig ${i >= n ? 'over' : ''}"><span>X<sub>${i + 1}</sub></span>${i < n ? `<i style="background:${vHex(vals[i])}"></i>` : '<i class="none">?</i>'}</div>`);
      this.graphColEl.innerHTML = shell(
        'Alldiff and the pigeonhole principle',
        '',
        `<div class="csp-sliders">
           <label>m (variables in Alldiff) <b>${m}</b><input type="range" min="2" max="6" value="${m}" id="csp-all-m"></label>
           <label>n (distinct values available) <b>${n}</b><input type="range" min="1" max="5" value="${n}" id="csp-all-n"></label>
         </div>
         <div class="csp-card"><div class="csp-pig-row">${pig.join('')}</div>
           <div class="csp-pig-vals">Values: ${vals.map(c => `<span class="csp-dot" style="background:${vHex(c)}"></span> ${c}`).join(' ')}</div></div>
         <div class="csp-metric-row"><div class="csp-metric ${fail ? 'bad' : 'ok'}"><span>Check m &gt; n</span><b>${m} ${fail ? '&gt;' : '≤'} ${n} ⇒ ${fail ? 'INCONSISTENT' : 'may be satisfiable'}</b></div></div>`,
        `<p class="csp-note">Example: after WA = red, the three mutually adjacent regions NT, SA and Q may all be left with {green, blue}. An Alldiff check over {NT, SA, Q} sees 3 variables but only 2 values and fails immediately; pairwise arc consistency would not.</p>`
      );
      this.on('csp-all-m', 'input', e => { this.st.allM = +e.target.value; this.refresh(); });
      this.on('csp-all-n', 'input', e => { this.st.allN = +e.target.value; this.refresh(); });
    }

    ill_sudoku_ac3() {
      if (!this._sud) {
        const p = E.SUDOKU_PRESETS.mini;
        const csp = E.makeSudokuCSP(p.puzzle, 4);
        const d = E.copyDomains(csp.domains);
        const r = E.ac3(csp, d, null, { trace: true });
        const steps = r.steps.filter(s => s.kind !== 'keep');
        this._sud = { csp, steps, puzzle: p.puzzle, checks: r.checks };
      }
      const { csp, steps, puzzle } = this._sud;
      const i = Math.min(this.st.sudStep, steps.length - 1);
      const s = steps[i];
      const cells = csp.variables.map((v, idx) => {
        const dom = s.domains[v];
        const given = puzzle[idx] !== '.';
        const cur = s.arc && s.arc[0] === v, src = s.arc && s.arc[1] === v;
        const inner = dom.length === 1 ? `<span class="csp-sud-val">${dom[0]}</span>` : `<div class="csp-sud-cands">${[1, 2, 3, 4].map(dg => `<span class="${dom.includes(dg) ? '' : 'off'}">${dg}</span>`).join('')}</div>`;
        return `<div class="csp-sud-cell ${given ? 'given' : ''} ${dom.length === 1 && !given ? 'solved' : ''} ${cur ? 'cur' : ''} ${src ? 'src' : ''} ${this.sudBorder(idx, 4)}">${inner}</div>`;
      }).join('');
      const solved = csp.variables.filter(v => s.domains[v].length === 1).length;
      this.graphColEl.innerHTML = shell(
        '4×4 Sudoku solved by AC-3 alone',
        `<span class="csp-pill info">${solved} / 16 cells fixed</span>`,
        `<div class="csp-sud-wrap"><div class="csp-sudoku csp-sudoku-4">${cells}</div>
           <div class="csp-sud-legend"><span><i class="cur"></i> Xᵢ being revised</span><span><i class="src"></i> Xⱼ (support)</span><span><i class="given"></i> given</span></div></div>`,
        `${stepperHTML('csp-sud', i, steps.length, !!this.timer)}
         <div class="csp-status-row"><span class="csp-msg">${s.msg.replace(/r(\d)c(\d)/g, (m, a, b) => `(${+a + 1},${+b + 1})`)}</span></div>`
      );
      this.bindStepper('csp-sud', 'sudStep', steps.length, 450);
    }

    // =========================================================================
    // TOPIC 3 — BACKTRACKING SEARCH
    // =========================================================================

    btOrders() {
      return {
        bad: { label: 'Fixed: WA, NSW, NT, Q, SA, V, T', varOrder: 'static', order: ['WA', 'NSW', 'NT', 'Q', 'SA', 'V', 'T'] },
        aima: { label: 'Fixed: WA, NT, Q, NSW, V, SA, T', varOrder: 'static', order: ['WA', 'NT', 'Q', 'NSW', 'V', 'SA', 'T'] },
        mrv: { label: 'MRV', varOrder: 'mrv', order: ['WA', 'NSW', 'NT', 'Q', 'SA', 'V', 'T'] },
        mrvdeg: { label: 'MRV + Degree', varOrder: 'mrv-degree', order: ['WA', 'NSW', 'NT', 'Q', 'SA', 'V', 'T'] }
      };
    }

    legalValues(assignment) {
      const out = {};
      for (const v of AUS.variables) {
        out[v] = ['red', 'green', 'blue'].filter(c => AUS.neighbors[v].every(u => assignment[u] !== c));
      }
      return out;
    }

    ill_bt_stepper() {
      const O = this.btOrders()[this.st.btVar];
      const key = [this.st.btVar, this.st.btVal, this.st.btInf].join('/');
      if (this._btKey !== key) {
        this._bt = E.backtrackingSearch(E.makeMapCSP(AUS, 3), { varOrder: O.varOrder, staticOrder: O.order, valOrder: this.st.btVal, inference: this.st.btInf });
        this._btKey = key;
      }
      const steps = this._bt.steps;
      const i = Math.min(this.st.btStep, steps.length - 1);
      const s = steps[i];
      const a = Object.assign({}, s.assignment);
      const domains = this.st.btInf === 'none' ? this.legalValues(a) : s.domains;
      const conflicts = [];
      const tint = {};
      if (s.kind === 'reject') { tint[s.var] = s.val; conflicts.push([s.var, s.conflictWith]); }
      const hl = s.var ? [s.var] : [];
      const log = steps.slice(Math.max(0, i - 5), i + 1).map((x, k, arr) => `<div class="csp-log-row ${k === arr.length - 1 ? 'cur' : ''} k-${x.kind}" style="padding-left:${0.4 + (x.depth || 0) * 0.55}rem">${x.msg}</div>`).join('');
      const kindPill = { start: ['neutral', 'START'], select: ['info', 'SELECT'], reject: ['bad', 'REJECT'], assign: ['ok', 'ASSIGN'], infer: ['info', 'INFERENCE'], wipeout: ['bad', 'WIPE-OUT'], undo: ['warn', 'BACKTRACK'], deadend: ['warn', 'DEAD END'], solution: ['ok', 'SOLUTION'], failure: ['bad', 'FAILURE'] }[s.kind];
      const sel = (id, opts, val) => `<select class="csp-select" id="${id}">${opts.map(([k, l]) => `<option value="${k}" ${k === val ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
      this.graphColEl.innerHTML = shell(
        'BACKTRACKING-SEARCH on Australia',
        sel('csp-bt-var', Object.entries(this.btOrders()).map(([k, v]) => [k, v.label]), this.st.btVar) +
        sel('csp-bt-val', [['static', 'Values: R, G, B'], ['lcv', 'Values: LCV']], this.st.btVal) +
        sel('csp-bt-inf', [['none', 'No inference'], ['fc', 'Forward checking'], ['mac', 'MAC']], this.st.btInf),
        `<div class="csp-bt-grid">
           <div class="csp-map-wrap">${mapSVG({ assignment: a, domains, highlight: hl, conflicts, tint })}</div>
           <div class="csp-log">${log}</div>
         </div>
         <div class="csp-metric-row">
           <div class="csp-metric"><span>Assignments</span><b>${s.stats.assignments}</b></div>
           <div class="csp-metric ${s.stats.backtracks ? 'bad' : 'ok'}"><span>Backtracks</span><b>${s.stats.backtracks}</b></div>
           <div class="csp-metric"><span>Constraint checks</span><b>${s.stats.checks}</b></div>
           <div class="csp-metric"><span>Values pruned</span><b>${s.stats.pruned}</b></div>
         </div>`,
        `${stepperHTML('csp-bt', i, steps.length, !!this.timer)}
         <div class="csp-status-row"><span class="csp-pill ${kindPill[0]}">${kindPill[1]}</span><span class="csp-muted">Whole run: ${this._bt.stats.assignments} assignments · ${this._bt.stats.backtracks} backtracks</span></div>`
      );
      const reset = () => { this.clearTimer(); this.st.btStep = 0; this.refresh(); };
      this.on('csp-bt-var', 'change', e => { this.st.btVar = e.target.value; reset(); });
      this.on('csp-bt-val', 'change', e => { this.st.btVal = e.target.value; reset(); });
      this.on('csp-bt-inf', 'change', e => { this.st.btInf = e.target.value; reset(); });
      this.bindStepper('csp-bt', 'btStep', steps.length, 800);
    }

    heuristicMap(mode) {
      const key = mode === 'mrv' ? 'mrvAssign' : 'degAssign';
      const a = this.st[key];
      const legal = this.legalValues(a);
      const un = AUS.variables.filter(v => !a[v]);
      const deg = v => AUS.neighbors[v].filter(u => !a[u]).length;
      const badges = {};
      let hot = [];
      if (mode === 'mrv') {
        un.forEach(v => { badges[v] = legal[v].length; });
        const m = Math.min(...un.map(v => legal[v].length));
        hot = un.filter(v => legal[v].length === m);
      } else {
        un.forEach(v => { badges[v] = deg(v); });
        const m = Math.max(...un.map(deg));
        hot = un.filter(v => deg(v) === m);
      }
      let pick = hot[0];
      if (mode === 'mrv' && hot.length > 1) { const md = Math.max(...hot.map(deg)); pick = hot.find(v => deg(v) === md); }
      const conflicts = E.makeMapCSP(AUS, 3).conflictedEdges(a);
      const title = mode === 'mrv' ? 'MRV: badge = number of legal values left' : 'Degree: badge = constraints on unassigned variables';
      const explain = !un.length ? 'All variables assigned.'
        : mode === 'mrv'
          ? `Minimum remaining values = ${badges[hot[0]]} → candidates {${hot.join(', ')}}${hot.length > 1 ? ` — tie broken by degree → <b>${pick}</b>` : ` → choose <b>${pick}</b>`}.${badges[hot[0]] === 0 ? ' A variable with 0 legal values means this branch has already failed!' : ''}`
          : `Largest degree = ${badges[hot[0]]} → choose <b>${pick}</b>${hot.length > 1 ? ` (tie among ${hot.join(', ')})` : ''}.`;
      this.graphColEl.innerHTML = shell(
        title,
        `<button class="csp-btn" id="csp-h-clear"><i data-lucide="eraser"></i> Clear</button>${mode === 'mrv' ? '<button class="csp-btn" id="csp-h-aima">WA = red, NT = green</button>' : ''}<button class="csp-btn csp-btn-primary" id="csp-h-assign" ${un.length ? '' : 'disabled'}>Assign ${pick || '—'}</button>`,
        `<div class="csp-map-wrap">${mapSVG({ assignment: a, badges, badgeHot: pick, highlight: pick ? [pick] : [], conflicts, clickable: true, domains: mode === 'mrv' ? legal : null })}</div>`,
        `<div class="csp-status-row"><span class="csp-pill info">${mode === 'mrv' ? 'MRV' : 'DEGREE'}</span><span class="csp-msg">${explain}</span></div>
         <p class="csp-note">Click regions to change the assignment; "Assign" gives the chosen variable its first legal colour.</p>`
      );
      this.graphColEl.querySelectorAll('.csp-region.clickable').forEach(p => p.addEventListener('click', () => {
        const v = p.getAttribute('data-var');
        const cycle = [undefined, 'red', 'green', 'blue'];
        const next = cycle[(cycle.indexOf(a[v]) + 1) % cycle.length];
        if (next) a[v] = next; else delete a[v];
        this.refresh();
      }));
      this.on('csp-h-clear', 'click', () => { this.st[key] = {}; this.refresh(); });
      this.on('csp-h-aima', 'click', () => { this.st[key] = { WA: 'red', NT: 'green' }; this.refresh(); });
      this.on('csp-h-assign', 'click', () => { if (pick && legal[pick].length) { a[pick] = legal[pick][0]; this.refresh(); } });
    }

    ill_mrv_view() { this.heuristicMap('mrv'); }
    ill_degree_view() { this.heuristicMap('degree'); }

    ill_lcv_view() {
      const base = { WA: 'red', NT: 'green' };
      const v = 'Q';
      const cards = ['red', 'green', 'blue'].map(c => {
        const legal = AUS.neighbors[v].every(u => base[u] !== c);
        if (!legal) return `<div class="csp-lcv-card rejected"><div class="csp-lcv-head">${colorDot(c)} Q = ${c}</div><div class="csp-lcv-x">Illegal — NT is already green</div></div>`;
        const a = Object.assign({}, base, { [v]: c });
        const legalAfter = this.legalValues(a);
        const nbs = AUS.neighbors[v].filter(u => !base[u]);
        const left = nbs.map(u => `<div class="csp-lcv-nb"><span>${u}</span>${domainDots(legalAfter[u])}<b>${legalAfter[u].length}</b></div>`).join('');
        const total = nbs.reduce((s, u) => s + legalAfter[u].length, 0);
        const dead = nbs.some(u => legalAfter[u].length === 0);
        return `<div class="csp-lcv-card ${dead ? 'dead' : 'best'}"><div class="csp-lcv-head">${colorDot(c)} Q = ${c}</div>${mapSVG({ assignment: a, domains: legalAfter, highlight: nbs, W: 400, H: 340 })}${left}<div class="csp-lcv-total">${dead ? 'SA has 0 values → dead end' : `${total} values left for neighbours → try first`}</div></div>`;
      }).join('');
      this.graphColEl.innerHTML = shell(
        'LCV: ordering the values of Q after WA = red, NT = green',
        '',
        `<div class="csp-lcv-grid">${cards}</div>`,
        `<p class="csp-note">Q = blue removes SA's last colour; Q = red leaves blue for SA. LCV therefore tries <strong>red</strong> first — the least-constraining value keeps the most options open for the rest of the search.</p>`
      );
    }

    fcRows() {
      const seq = [['WA', 'red'], ['Q', 'green'], ['V', 'blue']];
      const rows = [];
      let d = {}; AUS.variables.forEach(v => { d[v] = ['red', 'green', 'blue']; });
      const a = {};
      rows.push({ label: 'Initial domains', a: {}, d: E.copyDomains(d), changed: [] });
      for (const [v, c] of seq) {
        a[v] = c;
        d[v] = [c];
        const changed = [];
        for (const u of AUS.neighbors[v]) {
          if (a[u]) continue;
          const before = d[u].length;
          d[u] = d[u].filter(x => x !== c);
          if (d[u].length !== before) changed.push(u);
        }
        rows.push({ label: `After ${v} = ${c}`, a: Object.assign({}, a), d: E.copyDomains(d), changed });
      }
      return rows;
    }

    ill_fc_table() {
      const rows = this.fcRows();
      const i = Math.min(this.st.fcStep, rows.length - 1);
      const r = rows[i];
      const head = AUS.variables.map(v => `<th>${v}</th>`).join('');
      const body = rows.slice(0, i + 1).map((row, k) => `<tr class="${k === i ? 'cur' : ''}"><th>${row.label}</th>${AUS.variables.map(v => {
        const dom = row.d[v];
        const cls = [row.a[v] && row.label.includes(v + ' =') ? 'assigned' : '', row.changed.includes(v) ? 'changed' : '', dom.length === 0 ? 'wiped' : ''].join(' ');
        return `<td class="${cls}">${dom.length ? dom.map(c => colorDot(c)).join('') : '∅'}</td>`;
      }).join('')}</tr>`).join('');
      const wiped = AUS.variables.find(v => r.d[v].length === 0);
      this.graphColEl.innerHTML = shell(
        'Forward checking trace (AIMA Fig 6.7)',
        '',
        `<div class="csp-map-wrap csp-map-sm">${mapSVG({ assignment: r.a, domains: r.d, highlight: r.changed })}</div>
         <div class="csp-table-wrap"><table class="csp-table csp-fc-table"><thead><tr><th></th>${head}</tr></thead><tbody>${body}</tbody></table></div>`,
        `${stepperHTML('csp-fc', i, rows.length, !!this.timer)}
         <div class="csp-status-row"><span class="csp-msg">${i === 0 ? 'Every region starts with {red, green, blue}.' : wiped ? `After V = blue, SA loses its last value — D(SA) = ∅, so forward checking backtracks immediately. (Note: after Q = green, NT and SA were both {blue} — FC did not see that clash.)` : `Pruned from the unassigned neighbours of ${r.label.split(' ')[1]}: ${r.changed.join(', ') || 'none'}.`}</span></div>`
      );
      this.bindStepper('csp-fc', 'fcStep', rows.length, 1300);
    }

    ill_mac_compare() {
      const fc = this.fcRows()[2];
      const csp = E.makeMapCSP(AUS, 3);
      const d = E.copyDomains(csp.domains);
      d.WA = ['red']; d.Q = ['green'];
      // MAC after Q = green: FC effect of WA first, then AC-3 from arcs into Q
      const d1 = E.copyDomains(d);
      const r = E.ac3(csp, d1, [['NT', 'WA'], ['SA', 'WA'], ['NT', 'Q'], ['SA', 'Q'], ['NSW', 'Q']], { trace: true });
      const last = r.steps[r.steps.length - 1];
      const macSteps = r.steps.filter(s => s.kind === 'revise' || s.kind === 'wipeout').map(s => `<li class="${s.kind}">${s.msg}</li>`).join('');
      this.graphColEl.innerHTML = shell(
        'Same state, two inference methods: WA = red, Q = green',
        '',
        `<div class="csp-duo">
           <div class="csp-duo-cell"><div class="csp-duo-label">Forward checking</div>${mapSVG({ assignment: fc.a, domains: fc.d, highlight: ['NT', 'SA'] })}<div class="csp-pill warn">NT = {blue}, SA = {blue} — not detected</div></div>
           <div class="csp-duo-cell"><div class="csp-duo-label">MAC (AC-3 after each assignment)</div>${mapSVG({ assignment: { WA: 'red', Q: 'green' }, domains: last.domains, highlight: ['NT', 'SA'] })}<div class="csp-pill bad">${r.consistent ? 'consistent' : 'Inconsistency detected — backtrack now'}</div></div>
         </div>
         <ol class="csp-mac-list">${macSteps}</ol>`,
        `<p class="csp-note">Forward checking only prunes neighbours of the variable just assigned. MAC keeps propagating: once NT = {blue}, the arc (SA, NT) is re-examined and SA's last value disappears — one search level earlier than forward checking.</p>`
      );
    }

    ill_backjump_view() {
      const order = [['Q', 'red'], ['NSW', 'green'], ['V', 'blue'], ['T', 'red'], ['SA', null]];
      const x = i => 45 + i * 78;
      let svg = '';
      order.forEach(([v, c], i) => {
        const inConf = ['Q', 'NSW', 'V'].includes(v);
        svg += `<g><rect x="${x(i) - 30}" y="40" width="60" height="44" rx="10" fill="${c ? HEX[c] : '#fff'}" class="csp-bj-box ${v === 'SA' ? 'fail' : ''} ${inConf ? 'conf' : ''}"></rect>
          <text x="${x(i)}" y="60" class="csp-bj-var ${c ? 'on' : ''}">${v}</text><text x="${x(i)}" y="76" class="csp-bj-val ${c ? 'on' : ''}">${c || 'no value'}</text>
</g>`;
      });
      svg += `<defs><marker id="csp-bj-a1" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10z" fill="#94a3b8"></path></marker><marker id="csp-bj-a2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10z" fill="${ACCENT}"></path></marker></defs>`;
      svg += `<path d="M ${x(4)} 88 C ${x(4)} 120, ${x(3)} 120, ${x(3)} 90" class="csp-bj-chrono" marker-end="url(#csp-bj-a1)"></path><text x="${(x(4) + x(3)) / 2}" y="132" class="csp-bj-lbl chrono">chronological → T</text>`;
      svg += `<path d="M ${x(4)} 36 C ${x(4)} -4, ${x(2)} -4, ${x(2)} 34" class="csp-bj-jump" marker-end="url(#csp-bj-a2)"></path><text x="${(x(4) + x(2)) / 2}" y="-4" class="csp-bj-lbl jump">backjump → V</text>`;
      const rows = [['red', 'Q'], ['green', 'NSW'], ['blue', 'V']].map(([c, u]) => `<tr><td>${colorDot(c)} SA = ${c}</td><td>conflicts with <b>${u}</b> = ${c}</td></tr>`).join('');
      this.graphColEl.innerHTML = shell(
        'Conflict-directed backjumping',
        '',
        `<div class="csp-card"><div class="csp-duo-label">Variable order: Q → NSW → V → T → SA</div><svg viewBox="0 -18 420 158" class="csp-graph-svg">${svg}</svg></div>
         <div class="csp-duo">
           <div class="csp-duo-cell"><table class="csp-table"><tbody>${rows}</tbody></table></div>
           <div class="csp-duo-cell csp-code-cell"><div class="csp-code">conf(SA) = {Q, NSW, V}<br>most recent in conf(SA) → V<br>T ∉ conf(SA) → skip it</div></div>
         </div>`,
        `<p class="csp-note">Chronological backtracking would try T = green, T = blue — pointless, because Tasmania is not adjacent to SA. Backjumping goes directly to V. If V then fails too, its conflict set absorbs SA's: conf(V) ← {Q, NSW} and the jump continues to NSW.</p>`
      );
    }

    // =========================================================================
    // TOPIC 4 — LOCAL SEARCH & STRUCTURE
    // =========================================================================

    queensBoard(n, rows, opts) {
      const o = Object.assign({ col: null, counts: null, from: null, size: 300 }, opts || {});
      const cs = o.size / n;
      let s = `<svg viewBox="0 0 ${o.size} ${o.size}" class="csp-board-svg">`;
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        s += `<rect x="${c * cs}" y="${r * cs}" width="${cs}" height="${cs}" class="${(r + c) % 2 ? 'csp-sq-d' : 'csp-sq-l'} ${c === o.col ? 'csp-sq-col' : ''}"></rect>`;
      }
      if (o.counts && o.col != null) {
        o.counts.forEach((k, r) => {
          const min = Math.min(...o.counts);
          s += `<text x="${o.col * cs + cs / 2}" y="${r * cs + cs / 2 + 4}" class="csp-q-count ${k === min ? 'min' : ''}">${k}</text>`;
        });
      }
      if (o.from != null && o.col != null && o.from !== rows[o.col]) {
        s += `<circle cx="${o.col * cs + cs / 2}" cy="${o.from * cs + cs / 2}" r="${cs * 0.28}" class="csp-q-ghost"></circle>`;
      }
      rows.forEach((r, c) => {
        const att = E.queenConflicts(rows, c, r) > 0;
        const cx = c * cs + cs / 2, cy = r * cs + cs / 2;
        s += `<g class="csp-queen ${att ? 'att' : ''}"><circle cx="${cx}" cy="${cy}" r="${cs * 0.33}"></circle><text x="${cx}" y="${cy + cs * 0.12}" style="font-size:${cs * 0.42}px">♛</text></g>`;
      });
      return s + '</svg>';
    }

    ill_minconf_stepper() {
      const key = 'mc:' + this.st.mcSeed;
      if (this._mcKey !== key) { this._mc = E.queensMinConflicts(8, { randomInit: true, seed: this.st.mcSeed, maxSteps: 400 }); this._mcKey = key; }
      const steps = this._mc.steps;
      const i = Math.min(this.st.mcStep, steps.length - 1);
      const s = steps[i];
      this.graphColEl.innerHTML = shell(
        'MIN-CONFLICTS on 8-queens',
        `<button class="csp-btn" id="csp-mc-new"><i data-lucide="shuffle"></i> New random start</button>`,
        `<div class="csp-mc-grid">
           <div class="csp-board-wrap">${this.queensBoard(8, s.rows, { col: s.kind === 'move' ? s.col : null, counts: s.kind === 'move' ? s.counts : null, from: s.kind === 'move' ? s.from : null })}</div>
           <div class="csp-mc-side">
             <div class="csp-metric ${s.total ? 'bad' : 'ok'}"><span>Attacking pairs</span><b>${s.total}</b></div>
             <div class="csp-metric"><span>Steps taken</span><b>${i}</b></div>
             <div class="csp-legend csp-legend-col"><span><i class="csp-lg att"></i> attacked queen</span><span><i class="csp-lg col"></i> chosen column · numbers = conflicts per row</span><span><i class="csp-lg ghost"></i> previous position</span></div>
           </div>
         </div>`,
        `${stepperHTML('csp-mc', i, steps.length, !!this.timer)}
         <div class="csp-status-row"><span class="csp-pill ${s.kind === 'solution' ? 'ok' : s.kind === 'start' ? 'neutral' : 'info'}">${s.kind.toUpperCase()}</span><span class="csp-msg">${s.msg}</span></div>`
      );
      this.on('csp-mc-new', 'click', () => { this.clearTimer(); this.st.mcSeed++; this.st.mcStep = 0; this.refresh(); });
      this.bindStepper('csp-mc', 'mcStep', steps.length, 700);
    }

    ill_minconf_chart() {
      const n = this.st.chartN;
      const key = n + ':' + this.st.chartSeed;
      if (this._chKey !== key) { this._ch = E.queensMinConflicts(n, { randomInit: true, seed: this.st.chartSeed, maxSteps: 3000, maxTrace: 3001 }); this._chKey = key; }
      const steps = this._ch.steps;
      const vals = steps.map(s => s.total);
      const W = 420, H = 180, pad = 30;
      const maxV = Math.max(1, ...vals);
      const X = k => pad + (k / Math.max(1, vals.length - 1)) * (W - pad - 10);
      const Y = v => H - 22 - (v / maxV) * (H - 40);
      let sideways = 0, plateauRects = '';
      for (let k = 1; k < vals.length; k++) {
        if (vals[k] === vals[k - 1]) { sideways++; plateauRects += `<rect x="${X(k - 1)}" y="14" width="${Math.max(1, X(k) - X(k - 1))}" height="${H - 36}" class="csp-plateau"></rect>`; }
      }
      const pts = vals.map((v, k) => `${X(k).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
      const ticks = [0, Math.round(maxV / 2), maxV].map(v => `<text x="${pad - 6}" y="${Y(v) + 3}" class="csp-axis-t" text-anchor="end">${v}</text><line x1="${pad}" x2="${W - 10}" y1="${Y(v)}" y2="${Y(v)}" class="csp-grid-l"></line>`).join('');
      this.graphColEl.innerHTML = shell(
        `Conflicts over time — ${n}-queens from a random start`,
        seg('csp-ch-n', [[8, 'n = 8'], [24, 'n = 24'], [60, 'n = 60']], n) + `<button class="csp-btn" id="csp-ch-new"><i data-lucide="shuffle"></i> New run</button>`,
        `<div class="csp-card"><svg viewBox="0 0 ${W} ${H}" class="csp-chart-svg">${ticks}${plateauRects}<polyline points="${pts}" class="csp-chart-line"></polyline>
           <text x="${(W + pad) / 2}" y="${H - 4}" class="csp-axis-t" text-anchor="middle">min-conflicts step</text></svg></div>
         <div class="csp-metric-row">
           <div class="csp-metric"><span>Start conflicts</span><b>${vals[0]}</b></div>
           <div class="csp-metric ${this._ch.solved ? 'ok' : 'bad'}"><span>${this._ch.solved ? 'Solved in' : 'Unsolved after'}</span><b>${this._ch.iterations} steps</b></div>
           <div class="csp-metric warn"><span>Plateau (sideways) steps</span><b>${sideways}</b></div>
         </div>`,
        `<p class="csp-note">Shaded bands mark plateau steps where the total number of attacking pairs did not change. Min-conflicts allows these sideways moves, which is what lets it wander across flat regions of the landscape instead of getting stuck.</p>`
      );
      this.bindSeg('csp-ch-n', v => { this.st.chartN = +v; this.refresh(); });
      this.on('csp-ch-new', 'click', () => { this.st.chartSeed++; this.refresh(); });
    }

    ill_components_calc() {
      const n = this.st.compN, c = Math.min(this.st.compC, n), d = this.st.compD;
      const whole = n * Math.log10(d);
      const split = Math.log10(n / c) + c * Math.log10(d);
      const pow = e => e < 6 ? fmt(Math.pow(10, e)) : `10<sup>${e.toFixed(1)}</sup>`;
      const secs = e => { const s = Math.pow(10, e - 7); return s < 1 ? '&lt; 1 second' : s < 3600 ? `${fmt(s)} seconds` : s < 3.15e7 * 100 ? `${fmt(s / 3.15e7)} years` : `10<sup>${(e - 7 - 7.5).toFixed(0)}</sup> years`; };
      const t = Object.fromEntries(AUS.variables.map(v => [v, v === 'T' ? 'blue' : undefined]).filter(x => x[1]));
      this.graphColEl.innerHTML = shell(
        'Independent subproblems',
        '',
        `<div class="csp-duo">
           <div class="csp-duo-cell"><div class="csp-duo-label">Australia has 2 components</div>${ausGraph({ assignment: t, highlight: ['T'], sub: { T: 'own component' } })}</div>
           <div class="csp-duo-cell">
             <div class="csp-sliders csp-sliders-col">
               <label>n (variables) <b>${n}</b><input type="range" min="10" max="200" step="10" value="${n}" id="csp-cp-n"></label>
               <label>c (component size) <b>${c}</b><input type="range" min="1" max="${n}" value="${c}" id="csp-cp-c"></label>
               <label>d (domain size) <b>${d}</b><input type="range" min="2" max="5" value="${d}" id="csp-cp-d"></label>
             </div>
           </div>
         </div>
         <div class="csp-metric-row">
           <div class="csp-metric bad"><span>Whole problem d<sup>n</sup></span><b>${pow(whole)}</b><em>${secs(whole)} at 10⁷ nodes/s</em></div>
           <div class="csp-metric ok"><span>Split (n/c) · d<sup>c</sup></span><b>${pow(split)}</b><em>${secs(split)} at 10⁷ nodes/s</em></div>
         </div>`,
        `<p class="csp-note">Finding connected components is O(n + e). If the graph splits into pieces of size c, the total work grows only linearly with n.</p>`
      );
      this.on('csp-cp-n', 'input', e => { this.st.compN = +e.target.value; if (this.st.compC > this.st.compN) this.st.compC = this.st.compN; this.refresh(); });
      this.on('csp-cp-c', 'input', e => { this.st.compC = +e.target.value; this.refresh(); });
      this.on('csp-cp-d', 'input', e => { this.st.compD = +e.target.value; this.refresh(); });
    }

    ill_tree_stepper() {
      if (!this._tree) this._tree = E.treeCspSolve();
      const T = E.TREE_EXAMPLE;
      const steps = this._tree.steps;
      const i = Math.min(this.st.treeStep, steps.length - 1);
      const s = steps[i];
      const nb = {}; T.variables.forEach(v => { nb[v] = []; });
      T.variables.forEach(v => { if (T.parent[v]) { nb[v].push(T.parent[v]); nb[T.parent[v]].push(v); } });
      const sub = {}; T.variables.forEach(v => { sub[v] = '{' + s.domains[v].map(c => c[0].toUpperCase()).join(',') + '}'; });
      const svg = graphSVG({ vars: T.variables, neighbors: nb, pos: T.pos, W: 420, H: 230, r: 17, assignment: s.assignment, highlight: s.active ? [s.active] : [], sub, arcs: s.arc ? [[s.arc[0], s.arc[1]]] : [] });
      const phase = { order: ['neutral', 'TOPOLOGICAL ORDER'], backward: ['info', 'BACKWARD: arc consistency'], forward: ['ok', 'FORWARD: assign'], done: ['ok', 'SOLVED'], fail: ['bad', 'FAIL'] }[s.phase];
      const orderRow = T.variables.map((v, k) => `<span class="csp-order-chip ${s.active === v ? 'active' : ''}">${k + 1}. ${v}</span>`).join('<span class="csp-muted">→</span>');
      this.graphColEl.innerHTML = shell(
        'TREE-CSP-SOLVER (AIMA Fig 6.10–6.11)',
        '',
        `<div class="csp-order-row">${orderRow}</div>
         <div class="csp-card">${svg}</div>
         <div class="csp-legend"><span>Constraint on every edge: parent ≠ child</span><span>{R,G,B} = remaining domain</span></div>`,
        `${stepperHTML('csp-tree', i, steps.length, !!this.timer)}
         <div class="csp-status-row"><span class="csp-pill ${phase[0]}">${phase[1]}</span><span class="csp-msg">${s.msg}</span></div>`
      );
      this.bindStepper('csp-tree', 'treeStep', steps.length, 1100);
    }

    ill_cutset_view() {
      const on = this.st.cutsetOn, val = this.st.cutsetVal;
      const sub = {};
      const assignment = on ? { SA: val } : {};
      AUS.variables.forEach(v => {
        if (v === 'SA') return;
        const dom = ['red', 'green', 'blue'].filter(c => !(on && AUS.neighbors.SA.includes(v) && c === val));
        sub[v] = '{' + dom.map(c => c[0].toUpperCase()).join(',') + '}';
      });
      const n = 7, c = 1, d = 3;
      this.graphColEl.innerHTML = shell(
        'Cycle cutset S = {SA}',
        `<button class="csp-btn ${on ? '' : 'csp-btn-primary'}" id="csp-cut-toggle">${on ? 'Restore SA' : 'Condition on SA'}</button>${on ? seg('csp-cut-val', [['red', 'SA = red'], ['green', 'SA = green'], ['blue', 'SA = blue']], val) : ''}`,
        `<div class="csp-duo">
           <div class="csp-duo-cell"><div class="csp-duo-label">${on ? 'Remaining graph: a tree (chain + T)' : 'Original graph: has cycles through SA'}</div>${ausGraph({ assignment, removed: on ? ['SA'] : [], highlight: on ? [] : ['SA'], sub })}</div>
           <div class="csp-duo-cell">${mapSVG({ assignment, tint: {}, dim: [], highlight: on ? ['WA', 'NT', 'Q', 'NSW', 'V'] : ['SA'] })}</div>
         </div>
         <div class="csp-metric-row">
           <div class="csp-metric"><span>Cutset size c</span><b>${c}</b></div>
           <div class="csp-metric ok"><span>d<sup>c</sup> · (n − c) · d²</span><b>${Math.pow(d, c)} · ${n - c} · ${d * d} = ${Math.pow(d, c) * (n - c) * d * d}</b></div>
           <div class="csp-metric bad"><span>Brute force d<sup>n</sup></span><b>${Math.pow(d, n).toLocaleString()}</b></div>
         </div>`,
        `<p class="csp-note">${on ? `With SA = ${val} removed, its neighbours lose ${val}, and WA – NT – Q – NSW – V is a chain: the tree solver colours it without backtracking. Try each of the d<sup>c</sup> = 3 values of SA.` : 'Every cycle in Australia passes through SA. Remove it (by assigning it) and what is left is a tree.'}</p>`
      );
      this.on('csp-cut-toggle', 'click', () => { this.st.cutsetOn = !on; this.refresh(); });
      this.bindSeg('csp-cut-val', v => { this.st.cutsetVal = v; this.refresh(); });
    }

    ill_tree_decomp() {
      const groups = [
        { vars: ['WA', 'NT', 'SA'], x: 80, y: 55 },
        { vars: ['NT', 'SA', 'Q'], x: 250, y: 55 },
        { vars: ['SA', 'Q', 'NSW'], x: 420, y: 55 },
        { vars: ['SA', 'NSW', 'V'], x: 420, y: 195 },
        { vars: ['T'], x: 80, y: 195 }
      ];
      let s = '';
      const links = [[0, 1, 'NT, SA'], [1, 2, 'SA, Q'], [2, 3, 'SA, NSW']];
      links.forEach(([a, b, l]) => {
        const A = groups[a], B = groups[b];
        const vertical = A.x === B.x;
        const lx = (A.x + B.x) / 2, ly = vertical ? (A.y + B.y) / 2 : A.y + 52;
        s += `<line x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}" class="csp-td-link"></line><rect x="${lx - 30}" y="${ly - 10}" width="60" height="20" rx="10" class="csp-td-shared"></rect><text x="${lx}" y="${ly + 4}" class="csp-td-shared-t">${l}</text>`;
      });
      groups.forEach(g => {
        s += `<ellipse cx="${g.x}" cy="${g.y}" rx="${g.vars.length === 1 ? 32 : 64}" ry="32" class="csp-td-blob"></ellipse>`;
        g.vars.forEach((v, k) => {
          const vx = g.x + (k - (g.vars.length - 1) / 2) * 38;
          s += `<circle cx="${vx}" cy="${g.y}" r="17" class="csp-td-node ${v === 'SA' ? 'sa' : ''}"></circle><text x="${vx}" y="${g.y + 4}" class="csp-td-t">${v}</text>`;
        });
      });
      s += `<text x="80" y="245" class="csp-td-shared-t" style="fill:var(--text-muted)">no shared variables</text>`;
      this.graphColEl.innerHTML = shell(
        'Tree decomposition of Australia (AIMA Fig 6.13)',
        '',
        `<div class="csp-card"><svg viewBox="0 0 500 255" class="csp-graph-svg">${s}</svg></div>
         <div class="csp-metric-row">
           <div class="csp-metric"><span>Subproblems</span><b>5</b></div>
           <div class="csp-metric"><span>Largest subproblem</span><b>3 variables</b></div>
           <div class="csp-metric ok"><span>Tree width w</span><b>2</b></div>
         </div>`,
        `<p class="csp-note">Requirements: (1) every variable appears in some subproblem; (2) every constraint's variables appear together in some subproblem; (3) a variable shared by two subproblems appears in every subproblem on the path between them. Shared variables (the labels on the links) must agree.</p>`
      );
    }

    // =========================================================================
    // TOPIC 5 — EVALUATION
    // =========================================================================

    benchProblems() {
      return {
        aus: { label: 'Australia (7 vars, 3 colours)', make: () => E.makeMapCSP(AUS, 3) },
        rand: { label: 'Random map (20 regions, 3 colours)', make: () => E.makeMapCSP(E.randomMap(20, 7), 3) },
        queens: { label: '8-Queens', make: () => E.makeQueensCSP(8) },
        sudoku: { label: 'Sudoku (hard)', make: () => { const p = E.SUDOKU_PRESETS.hard; return E.makeSudokuCSP(p.puzzle, p.size); } }
      };
    }

    runBench() {
      const P = this.benchProblems()[this.st.benchProblem];
      const configs = [
        ['Backtracking', { varOrder: 'static', valOrder: 'static', inference: 'none' }],
        ['BT + MRV', { varOrder: 'mrv', valOrder: 'static', inference: 'none' }],
        ['BT + MRV/Degree + LCV', { varOrder: 'mrv-degree', valOrder: 'lcv', inference: 'none' }],
        ['Forward checking', { varOrder: 'static', valOrder: 'static', inference: 'fc' }],
        ['MRV + FC', { varOrder: 'mrv', valOrder: 'static', inference: 'fc' }],
        ['MAC', { varOrder: 'static', valOrder: 'static', inference: 'mac' }],
        ['MRV + MAC', { varOrder: 'mrv', valOrder: 'static', inference: 'mac' }]
      ];
      const rows = configs.map(([name, cfg]) => {
        const r = E.backtrackingSearch(P.make(), Object.assign({ trace: false, maxChecks: 4e5 }, cfg));
        return { name, solved: !!r.solution, limit: r.aborted, a: r.stats.assignments, b: r.stats.backtracks, c: r.stats.checks, t: r.timeMs };
      });
      const t0 = performance.now();
      const mc = E.minConflicts(P.make(), { maxSteps: 2000, seed: 4, trace: false });
      rows.push({ name: 'Min-conflicts (local)', solved: !!mc.solution, limit: !mc.solution, a: mc.iterations, b: null, c: null, t: performance.now() - t0, local: true });
      this.st.benchRows = { key: this.st.benchProblem, rows };
    }

    ill_bench_live() {
      if (!this.st.benchRows || this.st.benchRows.key !== this.st.benchProblem) this.runBench();
      const rows = this.st.benchRows.rows;
      const solvedChecks = rows.filter(r => r.solved && r.c != null).map(r => r.c);
      const best = Math.min(...solvedChecks);
      const maxA = Math.max(...rows.map(r => r.a), 1);
      const body = rows.map(r => `<tr class="${r.c === best && r.solved ? 'best' : ''}">
          <td>${r.name}</td>
          <td>${r.solved ? '<span class="csp-pill ok">✓</span>' : r.local ? '<span class="csp-pill warn">stalled</span>' : r.limit ? '<span class="csp-pill warn">limit</span>' : '<span class="csp-pill bad">✗</span>'}</td>
          <td><div class="csp-bar-cell"><span class="csp-bar" style="width:${Math.max(2, Math.log10(r.a + 1) / Math.log10(maxA + 1) * 100)}%"></span><b>${r.a.toLocaleString()}</b></div></td>
          <td>${r.b == null ? '—' : r.b.toLocaleString()}</td>
          <td>${r.c == null ? '—' : r.c.toLocaleString()}</td>
          <td>${r.t.toFixed(1)} ms</td></tr>`).join('');
      const opts = Object.entries(this.benchProblems()).map(([k, v]) => `<option value="${k}" ${k === this.st.benchProblem ? 'selected' : ''}>${v.label}</option>`).join('');
      this.graphColEl.innerHTML = shell(
        'Live benchmark — same engine as the Playground',
        `<select class="csp-select" id="csp-bench-p">${opts}</select><button class="csp-btn csp-btn-primary" id="csp-bench-run"><i data-lucide="play"></i> Re-run</button>`,
        `<div class="csp-table-wrap"><table class="csp-table csp-bench-table"><thead><tr><th>Solver</th><th>Solved</th><th>Assignments / steps (log bar)</th><th>Backtracks</th><th>Checks</th><th>Time</th></tr></thead><tbody>${body}</tbody></table></div>`,
        `<p class="csp-note">Highlighted row: fewest constraint checks among solvers that finished. "limit" = stopped after 400,000 checks. For min-conflicts the "assignments" column counts repair steps (max 2,000).</p>`
      );
      this.on('csp-bench-p', 'change', e => { this.st.benchProblem = e.target.value; this.st.benchRows = null; this.graphColEl.querySelector('.csp-ill-body').innerHTML = '<div class="csp-empty">Running solvers…</div>'; setTimeout(() => this.refresh(), 30); });
      this.on('csp-bench-run', 'click', () => { this.st.benchRows = null; this.graphColEl.querySelector('.csp-ill-body').innerHTML = '<div class="csp-empty">Running solvers…</div>'; setTimeout(() => this.refresh(), 30); });
    }

    ill_complexity_table() {
      const rows = [
        ['Backtracking (any ordering)', 'O(d<sup>n</sup>)', 'O(n)', 'Exponential worst case; heuristics change the typical case'],
        ['Forward checking', 'O(d<sup>n</sup>)', 'O(n · d)', 'Each assignment costs O(n · d) checks'],
        ['AC-3 (once)', 'O(c · d³)', 'O(c)', 'c binary constraints; each arc re-queued ≤ d times'],
        ['MAC', 'O(d<sup>n</sup>)', 'O(n · d)', 'AC-3 at every node; far fewer nodes on tight problems'],
        ['Tree-structured CSP', 'O(n · d²)', 'O(n · d)', 'Linear in n — no backtracking needed'],
        ['Cutset conditioning', 'O(d<sup>c</sup> · (n − c) · d²)', 'O(n · d)', 'c = cycle cutset size'],
        ['Tree decomposition', 'O(n · d<sup>w+1</sup>)', 'O(n · d<sup>w</sup>)', 'w = tree width'],
        ['Min-conflicts', 'no bound (incomplete)', 'O(n)', '≈ constant steps for n-queens']
      ];
      this.graphColEl.innerHTML = shell(
        'Time & space complexity',
        '',
        `<div class="csp-table-wrap"><table class="csp-table"><thead><tr><th>Algorithm</th><th>Time</th><th>Space</th><th>Notes</th></tr></thead><tbody>${rows.map(r => `<tr><td><b>${r[0]}</b></td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td>${r[3]}</td></tr>`).join('')}</tbody></table></div>`,
        `<p class="csp-note">n = variables, d = largest domain size, c = constraints (or cutset size), w = tree width. General finite-domain CSPs are NP-complete.</p>`
      );
    }

    ill_properties_table() {
      const cols = ['Backtracking', '+ MRV / Deg / LCV', '+ Forward checking', 'MAC', 'Min-conflicts', 'Tree-CSP solver'];
      const rows = [
        ['Complete', ['Yes', 'Yes', 'Yes', 'Yes', 'No', 'Yes (trees)'], ['ok', 'ok', 'ok', 'ok', 'bad', 'ok']],
        ['Proves "no solution"', ['Yes', 'Yes', 'Yes', 'Yes', 'No', 'Yes'], ['ok', 'ok', 'ok', 'ok', 'bad', 'ok']],
        ['Detects failure early', ['No', 'Partly', 'Empty neighbour domain', 'Any arc inconsistency', '—', 'Yes'], ['bad', 'warn', 'warn', 'ok', '', 'ok']],
        ['Handles soft constraints', ['Branch & bound', 'Branch & bound', 'Branch & bound', 'Branch & bound', 'Naturally (cost)', 'Via DP'], ['', '', '', '', 'ok', '']],
        ['Best for', ['Tiny problems', 'General CSPs', 'General CSPs', 'Tight puzzles (Sudoku)', 'Huge / online repair', 'Tree-like graphs'], ['', '', '', '', '', '']]
      ];
      this.graphColEl.innerHTML = shell(
        'Guarantees and use cases',
        '',
        `<div class="csp-table-wrap"><table class="csp-table csp-prop-table"><thead><tr><th>Property</th>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map(([p, vals, cls]) => `<tr><td><b>${p}</b></td>${vals.map((v, k) => `<td class="${cls[k] ? 'csp-t-' + cls[k] : ''}">${v}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`,
        `<p class="csp-note">Real solvers combine these: MAC + MRV + restarts for hard combinatorial problems, and min-conflicts / weighted local search for large scheduling problems with many soft constraints.</p>`
      );
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    window.cspUI = new CSPLectureUI();
  });
})();
