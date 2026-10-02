/**
 * Constraint Satisfaction Problems — Lecture Page Controller (csp.html)
 *
 * Built from instructions/csp.md and AIMA Chapter 6. Same single-screen
 * lecture shell as adversarial.html: topic selector bar, concept column
 * (definition · AIMA notation · teaching tip) and illustration column.
 *
 * Topics:
 *   0. Search → Adversarial Search → CSP (bridge from Topics 02–03)
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

  // Topic 02 route graph — same edges/costs/layout as demos/search_planning_demo/city_engine.js
  const CITY_GRAPH = {
    NYC: [{ to: 'CHI', cost: 3 }, { to: 'DAL', cost: 2 }, { to: 'ATL', cost: 9 }],
    CHI: [{ to: 'DEN', cost: 2 }, { to: 'ATL', cost: 4 }],
    DAL: [{ to: 'ATL', cost: 6 }, { to: 'MIA', cost: 9 }],
    DEN: [{ to: 'LAX', cost: 3 }],
    ATL: [{ to: 'LAX', cost: 1 }, { to: 'SEA', cost: 2 }],
    MIA: [{ to: 'SEA', cost: 1 }],
    LAX: [{ to: 'SEA', cost: 5 }],
    SEA: []
  };
  const CITY_LAYOUT = { NYC: [0.10, 0.50], CHI: [0.35, 0.25], DAL: [0.35, 0.75], ATL: [0.50, 0.50], DEN: [0.65, 0.25], MIA: [0.65, 0.75], LAX: [0.88, 0.35], SEA: [0.88, 0.65] };

  // ---------------------------------------------------------------------------
  // Topics & concepts
  // ---------------------------------------------------------------------------

  const CSP_TOPICS = [
    { id: 'connections', title: 'Search → Adversarial Search → CSP', short: 'Search → Games → CSP' },
    { id: 'formulation', title: 'Defining Constraint Satisfaction Problems', short: 'CSP Formulation' },
    { id: 'propagation', title: 'Constraint Propagation: Inference in CSPs', short: 'Constraint Propagation' },
    { id: 'backtracking', title: 'Backtracking Search for CSPs', short: 'Backtracking Search' },
    { id: 'local', title: 'Local Search & the Structure of Problems', short: 'Local Search & Structure' },
    { id: 'evaluation', title: 'Evaluating CSP Solvers', short: 'Evaluating CSP Solvers' },
    { id: 'code', title: 'Code Trace: CSP Algorithms in Python', short: 'Code Trace' }
  ];

  const TOPIC_INTROS = [
    'Search, games and CSPs all explore a space of possibilities — but they solve different problems, represent states differently, and expect different kinds of solutions.',
    'A CSP describes a problem with a factored state — variables, their domains, and constraints — so general-purpose algorithms can exploit its structure instead of treating each state as a black box.',
    'Inference uses the constraints to shrink domains before or during search. Enforcing local consistency (node, arc, path, global) can solve a problem outright or expose a dead end early.',
    'Backtracking search assigns one variable at a time and backs up on failure. Good variable/value ordering and interleaved inference (forward checking, MAC) make it dramatically faster.',
    'Local search repairs a complete assignment instead of building one; min-conflicts is remarkably effective. The shape of the constraint graph — components, trees, cutsets — can make a CSP easy.',
    'Compare solvers by assignments tried, backtracks, constraint checks and guarantees — measured live on the same engine the Playground uses.',
    'Step through the Python implementations in <code>python_sandbox/csp.py</code> and <code>python_sandbox/07_CSP_Heuristics.py</code> line by line — backtracking, MRV/Degree, LCV, forward checking, AC-3 and min-conflicts — then compare their efficiency.'
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
      notation: '∀ x ∈ D<sub>i</sub> : C<sub>unary</sub>(X<sub>i</sub> = x) holds · D<sub>i</sub> ← {x ∈ D<sub>i</sub> | C(x)} · AIMA: ⟨(SA), SA ≠ green⟩ ⇒ D<sub>SA</sub> = {red, blue}',
      tip: 'Enforce node consistency once, up front. On the map, &ldquo;South Australians dislike green&rdquo; deletes green from D<sub>SA</sub> before search starts. In timetabling, room capacity (H2) and instructor availability (H4) are unary — deleting impossible (slot, room) values before search shrinks every domain.'
    },
    {
      key: 'arc', name: 'Arc Consistency', kind: 'arc_revise',
      definition: 'X<sub>i</sub> is arc-consistent with respect to X<sub>j</sub> if for every value in D<sub>i</sub> there is some value in D<sub>j</sub> that satisfies the binary constraint on (X<sub>i</sub>, X<sub>j</sub>).',
      notation: 'REVISE(X<sub>i</sub>, X<sub>j</sub>): delete x ∈ D<sub>i</sub> if ∄ y ∈ D<sub>j</sub> with (x, y) ∈ C<sub>ij</sub> · map: C = SA ≠ WA, D<sub>WA</sub> = {red} ⇒ REVISE(SA, WA) deletes red · AIMA: Y = X², X, Y ∈ {0 … 9}',
      tip: 'Arcs are <strong>directed</strong>. On the map, REVISE(SA, WA) can delete red from SA while REVISE(WA, SA) deletes nothing. Making X consistent with Y (keep X ∈ {0, 1, 2, 3}) is a different operation from making Y consistent with X (keep Y ∈ {0, 1, 4, 9}).'
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
      tip: 'Plain backtracking is uninformed DFS plus a consistency check. The default fixed order WA, NT, Q, NSW, V, SA, T (AIMA) happens to need no backtracking. Switch to the fixed order WA, NSW, NT, Q, SA, V, T and count the backtracks — then switch to MRV or MAC and watch them disappear.'
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


  const CONNECTION_CONCEPTS = [
    {
      key: 'goals', name: '1 · What Is Each Problem Trying to Achieve?', kind: 'goal_compare',
      definition: 'All three explore a space of possibilities, but they answer different questions. <strong>Search</strong> finds a path from an initial state to a goal. A <strong>game</strong> chooses the best action while an opponent works against you. A <strong>CSP</strong> finds values for every variable so that all constraints are satisfied.',
      notation: 'Search: S<sub>0</sub> ⟶ … ⟶ goal · Game: a* = argmax<sub>a</sub> MINIMAX(RESULT(s, a)) · CSP: find {X<sub>1</sub> = v<sub>1</sub>, …, X<sub>n</sub> = v<sub>n</sub>} with every C<sub>j</sub> satisfied',
      tip: 'Ask students to state each goal as a question: <em>"How do I get there?"</em> · <em>"What should I play, given that my opponent plays well?"</em> · <em>"Which values satisfy every rule?"</em> Then press <b>Show the answer</b> to see what each one returns.'
    },
    {
      key: 'states', name: '2 · How Is the State Space Represented?', kind: 'state_repr',
      definition: 'Search treats a state as a <strong>whole</strong> and reaches successors through actions. Games add <strong>whose turn it is</strong> and <strong>utility</strong> values, giving an alternating MAX / MIN tree. A CSP changes the representation fundamentally: the state is <strong>factored</strong> into variables and values, and constraints say which combinations are allowed.',
      notation: 'Search: s, ACTIONS(s), RESULT(s, a) · Game: s + TO-MOVE(s) ∈ {MAX, MIN}, UTILITY(s, p) at terminals · CSP: s = {X<sub>i</sub> = v<sub>i</sub>}, D<sub>i</sub>, C<sub>j</sub> = ⟨scope, rel⟩',
      tip: 'Compare what the algorithm can <em>see</em> inside one state. An atomic state can only be goal-tested. A factored state shows which variables are set, what values remain and which constraint fails — the basis for MRV, forward checking and AC-3.'
    },
    {
      key: 'solutions', name: '3 · What Counts as a Solution?', kind: 'solution_type',
      definition: 'The expected answer changes too: a <strong>path</strong> of actions (search), a <strong>strategy</strong> — in practice the best move now — against an opponent (games), and a <strong>complete, consistent assignment</strong> (CSP).',
      notation: 'Search: [a<sub>1</sub>, …, a<sub>k</sub>] minimising Σ c · Game: π(s) = best move for MAX (minimax value) · CSP: complete ∧ consistent (the path is irrelevant)',
      tip: 'A useful test: <em>does the order of steps matter in the answer?</em> For a route, yes — the path is the answer. For a game, the next move matters and depends on the opponent. For a CSP, no — WA = red then NT = green gives the same solution as the reverse order.'
    },
    {
      key: 'transition', name: '4 · Same Exploration, Different Problem', kind: 'transition_grid',
      definition: 'We are still searching through possibilities — but the <strong>type of problem</strong>, the <strong>representation of the state space</strong> and the <strong>definition of a solution</strong> have changed.',
      notation: 'Topic 02: path in a state space → Topic 03: best move in a MAX / MIN game tree → Topic 04: consistent assignment of a factored state',
      tip: 'Step through the grid row by row: first what stays the same (exploring a space of possibilities), then what changes — the goal, the state and the solution. End on the transition message before starting CSP algorithms.'
    }
  ];

  const CODE_CONCEPTS = [
    {
      key: 'btcode', name: 'Backtracking Code Trace', kind: 'bt_code', codeInConcept: true,
      definition: 'The recursive <code>backtracking_search</code> from <code>python_sandbox/csp.py</code>, traced line by line on the Australia map. Each call to <code>backtrack()</code> extends the assignment by one variable; a call that returns <code>None</code> makes its caller undo that choice and try the next value.',
      notation: 'backtrack(assignment): if complete → return it · var ← select_unassigned_variable · for val in order_domain_values: if is_consistent → assign, result ← backtrack(assignment), if result ≠ None → return it · unassign, backtracks += 1 · return None',
      tip: 'Watch the <strong>call stack</strong>: every frame is one level of the search tree. A backtrack is just a recursive call returning <code>None</code> — the caller then removes its value (line 17) and tries the next one. The default order WA, NT, Q, NSW, V, SA, T finishes without a single backtrack — switch to WA, NSW, NT, Q, SA, V, T to watch 5 backtracks happen.'
    },
    {
      key: 'mrv', name: 'MRV + Degree', kind: 'ct_mrv', codeInConcept: true,
      definition: 'Variable ordering: <code>mrv()</code> picks the unassigned variable with the fewest legal values; ties are broken by the degree heuristic (most constraints on unassigned variables).',
      notation: 'argmin<sub>v</sub> |legal(v)| · tie → argmax<sub>v</sub> |{u unassigned : (u, v) ∈ E}|',
      tip: 'Start from the empty assignment: every region ties on 3 legal values, and the degree heuristic picks SA (degree 5).'
    },
    {
      key: 'lcv', name: 'LCV', kind: 'ct_lcv', codeInConcept: true,
      definition: 'Value ordering: <code>lcv()</code> sorts the domain of the chosen variable by how many values each choice rules out in the unassigned neighbours — least constraining first.',
      notation: 'sorted(D(var), key = ruled_out) · ruled_out(x) = Σ<sub>n unassigned</sub> |{y ∈ D(n) : ¬C(var = x, n = y)}|',
      tip: 'With WA = red, NT = green, Q = red rules out 1 value but Q = blue rules out 2 (it would leave SA empty), so LCV tries red first.'
    },
    {
      key: 'fc', name: 'Forward Checking', kind: 'ct_fc', codeInConcept: true,
      definition: 'Inference after each assignment: <code>forward_checking()</code> deletes every value of an unassigned neighbour that conflicts with the new assignment, and fails as soon as a domain becomes empty.',
      notation: 'X = x ⇒ ∀ n ∈ N(X) unassigned: D(n) ← {y ∈ D(n) | C(X = x, n = y)} · D(n) = ∅ ⇒ return False',
      tip: 'Replays AIMA Fig 6.7: after WA = red, Q = green, V = blue the domain of SA is wiped out.'
    },
    {
      key: 'ac3', name: 'AC-3', kind: 'ct_ac3', codeInConcept: true,
      definition: '<code>ac3()</code> keeps a queue of arcs and calls <code>revise()</code> on each; when a domain shrinks, all arcs pointing into it are queued again. <code>mac()</code> runs it after every assignment.',
      notation: 'revise(Xi, Xj): delete x ∈ Di if ∄ y ∈ Dj with C(x, y) · O(c · d³)',
      tip: 'With WA = red, Q = green, AC-3 empties a domain and returns False without any search.'
    },
    {
      key: 'minconf', name: 'Min-Conflicts', kind: 'ct_minconf', codeInConcept: true,
      definition: 'Local search: <code>min_conflicts()</code> builds a complete (greedy) assignment, then repeatedly picks a random conflicted variable and gives it the value with the fewest conflicts.',
      notation: 'MIN-CONFLICTS(csp, max_steps) · var ← random conflicted · value ← argmin<sub>v</sub> CONFLICTS(var, v)',
      tip: 'Incomplete but fast: on Australia it usually repairs the greedy start in a few moves.'
    },
    {
      key: 'compare', name: 'Compare Efficiency', kind: 'ct_compare', codeInConcept: true,
      definition: 'Measure nodes visited, backtracks and elapsed time for basic backtracking, heuristic backtracking (MRV/Degree + LCV + FC or MAC) and min-conflicts on the same problems.',
      notation: 'measure(solver, csp) → (result, nodes_expanded, backtracks, elapsed ms)',
      tip: 'On Australia every solver is instant; on 20-Queens basic backtracking needs about 200,000 nodes while the heuristic versions need a few dozen.'
    }
  ];

  const ALL_CONCEPTS = [CONNECTION_CONCEPTS, FORMULATION_CONCEPTS, PROPAGATION_CONCEPTS, BACKTRACKING_CONCEPTS, LOCAL_CONCEPTS, EVALUATION_CONCEPTS, CODE_CONCEPTS];

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

  const NC_EXAMPLES = [['map', 'Map colouring'], ['tt', 'Timetabling']];
  const BT_EXAMPLES = [['map', 'Map colouring'], ['tte', 'Timetable (easy)'], ['tt', 'Timetabling']];
  const ARC_EXAMPLES = [['map', 'Map colouring'], ['num', 'Y = X²']];
  const MAP_COLORS = ['red', 'green', 'blue'];

  // Unary constraints on the Australia map (node consistency example)
  const MAP_UNARY = [
    { id: 'sa', v: 'SA', op: '≠', c: 'green', why: 'AIMA: South Australians dislike green' },
    { id: 'wa', v: 'WA', op: '=', c: 'red', why: 'a given / pre-assigned value' },
    { id: 't', v: 'T', op: '≠', c: 'blue', why: 'Tasmania\'s flag is already blue' },
    { id: 'q', v: 'Q', op: '≠', c: 'red', why: 'Queensland dislikes red' }
  ];
  const unaryOkMap = (u, val) => (u.op === '=' ? val === u.c : val !== u.c);

  // Starting domains for the map arc-consistency example
  const MAP_ARC_PRESETS = {
    wa: { label: 'WA = red', dom: { WA: ['red'] } },
    wa_sa: { label: 'WA = red, SA ≠ green', dom: { WA: ['red'], SA: ['red', 'blue'] } },
    wa_q: { label: 'WA = red, Q = green', dom: { WA: ['red'], Q: ['green'] } }
  };
  const mapArcDomains = key => {
    const d = {};
    for (const v of AUS.variables) d[v] = (MAP_ARC_PRESETS[key].dom[v] || MAP_COLORS).slice();
    return d;
  };

  // ---------------------------------------------------------------------------
  // Backtracking code trace — python_sandbox/csp.py · backtracking_search
  // ---------------------------------------------------------------------------
  const BT_PY = [
    'def backtracking_search(csp):',
    '    csp.nodes_expanded = 0',
    '    csp.backtracks = 0',
    '',
    '    def backtrack(assignment):',
    '        csp.nodes_expanded += 1',
    '        if len(assignment) == len(csp.variables):',
    '            return assignment',
    '',
    '        var = select_unassigned_variable(assignment, csp)',
    '        for val in order_domain_values(var, assignment, csp):',
    '            if csp.is_consistent(var, val, assignment):',
    '                csp.assign(var, val, assignment)',
    '                result = backtrack(assignment)',
    '                if result is not None:',
    '                    return result',
    '                csp.unassign(var, assignment)',
    '                csp.backtracks += 1',
    '',
    '        return None',
    '',
    '    return backtrack({})'
  ];
  const BT_CODE_ORDERS = {
    aima: { label: 'Order: WA, NT, Q, NSW, V, SA, T', order: ['WA', 'NT', 'Q', 'NSW', 'V', 'SA', 'T'] },
    bad: { label: 'Order: WA, NSW, NT, Q, SA, V, T', order: ['WA', 'NSW', 'NT', 'Q', 'SA', 'V', 'T'] },
    sa: { label: 'Order: SA first (degree)', order: ['SA', 'WA', 'NT', 'Q', 'NSW', 'V', 'T'] }
  };
  const BT_TT_ORDERS = {
    list: { label: 'Order: CS101, CS101L, MA101, CS201, CS201L, MA201', order: ['CS101', 'CS101L', 'MA101', 'CS201', 'CS201L', 'MA201'] },
    patel: { label: 'Order: MA101, MA201 first (Patel only on Monday)', order: ['MA101', 'MA201', 'CS101', 'CS101L', 'CS201', 'CS201L'] }
  };
  const pyHTML = line => esc(line)
    .replace(/\b(def|return|if|for|in|is|not|None)\b/g, '<span class="kw">$1</span>')
    .replace(/\b(backtracking_search|backtrack|select_unassigned_variable|order_domain_values|is_consistent|assign|unassign|len)\b(?=\()/g, '<span class="fn">$1</span>');
  const asgTxt = a => '{' + Object.entries(a).map(([k, v]) => `${k}: ${v}`).join(', ') + '}';

  // ---------------------------------------------------------------------------
  // Mini timetabling CSP (Backtracking + Code Trace "Timetabling" example).
  // 6 courses · 4 slots (Mon/Tue × 09:00/10:30) · 3 rooms. Domains are the
  // node-consistent (slot, room) pairs: H2 room capacity/type and H4 instructor
  // availability are already applied; H1/H3/H5 are the binary constraints.
  // ---------------------------------------------------------------------------
  const TT = {
    slots: ['Mon 09:00', 'Mon 10:30', 'Tue 09:00', 'Tue 10:30'],
    rooms: [{ id: 'HALL', cap: 120, type: 'lecture' }, { id: 'R101', cap: 60, type: 'lecture' }, { id: 'LAB1', cap: 30, type: 'lab' }],
    unavailable: { Chen: [3], Patel: [2, 3] },
    courses: [
      { id: 'CS101', name: 'Intro to Programming', enroll: 110, type: 'lecture', instr: 'Chen', cohort: 'Y1' },
      { id: 'CS101L', name: 'Programming Lab', enroll: 28, type: 'lab', instr: 'Chen', cohort: 'Y1' },
      { id: 'MA101', name: 'Discrete Mathematics', enroll: 55, type: 'lecture', instr: 'Patel', cohort: 'Y1' },
      { id: 'CS201', name: 'Data Structures', enroll: 58, type: 'lecture', instr: 'Chen', cohort: 'Y2' },
      { id: 'CS201L', name: 'Data Structures Lab', enroll: 30, type: 'lab', instr: 'Garcia', cohort: 'Y2' },
      { id: 'MA201', name: 'Probability', enroll: 45, type: 'lecture', instr: 'Patel', cohort: 'Y2' }
    ]
  };
  TT.vars = TT.courses.map(c => c.id);
  TT.byId = {}; TT.courses.forEach(c => { TT.byId[c.id] = c; });
  const ttVal = (s, r) => `${TT.slots[s]} ${r}`;
  const ttParse = {};
  TT.slots.forEach((sl, s) => TT.rooms.forEach(r => { ttParse[ttVal(s, r.id)] = { slot: s, room: r.id }; }));
  TT.domains = {};
  TT.courses.forEach(c => {
    TT.domains[c.id] = [];
    TT.slots.forEach((sl, s) => TT.rooms.forEach(r => {
      if (r.cap >= c.enroll && r.type === c.type && !(TT.unavailable[c.instr] || []).includes(s)) TT.domains[c.id].push(ttVal(s, r.id));
    }));
  });
  /** Which hard constraint does A = a, B = b violate? null when compatible. */
  function ttReason(A, a, B, b) {
    const pa = ttParse[a], pb = ttParse[b];
    if (pa.slot !== pb.slot) return null;
    if (pa.room === pb.room) return 'H1';
    if (TT.byId[A].instr === TT.byId[B].instr) return 'H3';
    if (TT.byId[A].cohort === TT.byId[B].cohort) return 'H5';
    return null;
  }
  const TT_WHY = { H1: 'same room at the same time (H1)', H3: 'same instructor at the same time (H3)', H5: 'same student cohort at the same time (H5)' };
  function makeTTCSP() {
    const nb = {}; TT.vars.forEach(v => { nb[v] = TT.vars.filter(u => u !== v); });
    return new E.CSP(TT.vars.slice(), copyDomainsTT(TT.domains), nb, (A, a, B, b) => !ttReason(A, a, B, b), { kind: 'timetable' });
  }
  function copyDomainsTT(d) { const o = {}; for (const k in d) o[k] = d[k].slice(); return o; }
  const TT_COHORT = { Y1: '#4f46e5', Y2: '#0d9488' };

  /** Timetable grid: rooms × slots, courses as chips; optional tried value / clash. */
  function ttGridHTML(asg, o) {
    o = o || {};
    const at = {};
    for (const c in asg) { const p = ttParse[asg[c]]; at[p.slot + '|' + p.room] = c; }
    const tryP = o.tryCourse && o.tryVal ? ttParse[o.tryVal] : null;
    const clashP = o.clashWith && asg[o.clashWith] ? ttParse[asg[o.clashWith]] : null;
    const head = TT.slots.map(s => `<th>${s.replace(' ', '<br>')}</th>`).join('');
    const rows = TT.rooms.map(r => {
      const cells = TT.slots.map((sl, s) => {
        const k = s + '|' + r.id, c = at[k];
        const isTry = tryP && tryP.slot === s && tryP.room === r.id;
        const isClash = clashP && clashP.slot === s && clashP.room === r.id;
        let inner = '';
        if (c) inner += `<span class="csp-tt-chip ${c === o.hl ? 'hl' : ''}" style="--c:${TT_COHORT[TT.byId[c].cohort]}">${c}</span>`;
        if (isTry && !c) inner += `<span class="csp-tt-chip try ${o.bad ? 'bad' : ''}" style="--c:${TT_COHORT[TT.byId[o.tryCourse].cohort]}">${o.tryCourse}?</span>`;
        if (isTry && c) inner += `<span class="csp-tt-chip try bad" style="--c:${TT_COHORT[TT.byId[o.tryCourse].cohort]}">${o.tryCourse}?</span>`;
        return `<td class="${isClash ? 'clash' : ''} ${tryP && tryP.slot === s ? 'col' : ''}">${inner}</td>`;
      }).join('');
      return `<tr><th class="csp-tt-room">${r.id}<span>${r.cap} · ${r.type}</span></th>${cells}</tr>`;
    }).join('');
    return `<div class="csp-table-wrap"><table class="csp-tt-grid"><thead><tr><th></th>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  function ttCoursesHTML(asg, cur, doms) {
    return `<table class="csp-table csp-trace-table csp-tt-courses"><thead><tr><th>Course</th><th>Instr.</th><th>Cohort</th><th>|D|</th><th>Assigned</th></tr></thead><tbody>${TT.courses.map(c => `<tr class="${c.id === cur ? 'best' : ''}"><td><b style="color:${TT_COHORT[c.cohort]}">${c.id}</b></td><td>${c.instr}</td><td>${c.cohort}</td><td class="mono">${(doms || TT.domains)[c.id].length}</td><td class="mono">${asg[c.id] || '—'}</td></tr>`).join('')}</tbody></table>`;
  }
  const TT_NOTE = 'Unary constraints are already applied to the domains (node consistency): lectures need a lecture room big enough, labs need LAB1 (H2); Chen cannot teach Tue 10:30 and Patel cannot teach on Tuesday (H4). Binary constraints: H1 room, H3 instructor, H5 cohort clashes.';

  // ---------------------------------------------------------------------------
  // Timetable (easy): 4 courses, 3 time slots, instructor / shared-student
  // constraints — a chain-shaped constraint graph (graph colouring in disguise).
  // ---------------------------------------------------------------------------
  const TTE = {
    slots: ['9:00 AM', '10:30 AM', '1:00 PM'],
    vars: ['CS101', 'CS102', 'CS201', 'CS202'],
    edges: [['CS101', 'CS102', 'same instructor'], ['CS102', 'CS201', 'shared students'], ['CS201', 'CS202', 'same instructor']],
    unavailable: { CS202: ['1:00 PM'] },
    pos: { CS101: [8, 50], CS102: [36, 18], CS201: [64, 82], CS202: [92, 50] }
  };
  TTE.neighbors = {}; TTE.vars.forEach(v => { TTE.neighbors[v] = []; });
  TTE.why = {};
  TTE.edges.forEach(([a, b, w]) => { TTE.neighbors[a].push(b); TTE.neighbors[b].push(a); TTE.why[a + '|' + b] = w; TTE.why[b + '|' + a] = w; });
  TTE.domains = {}; TTE.vars.forEach(v => { TTE.domains[v] = TTE.slots.filter(s => !(TTE.unavailable[v] || []).includes(s)); });
  const TTE_COLOR = { '9:00 AM': 'red', '10:30 AM': 'green', '1:00 PM': 'blue' };
  const TTE_ORDERS = {
    list: { label: 'Order: CS101, CS102, CS201, CS202', order: ['CS101', 'CS102', 'CS201', 'CS202'] },
    rev: { label: 'Order: CS202, CS201, CS102, CS101', order: ['CS202', 'CS201', 'CS102', 'CS101'] }
  };
  function makeTTECSP() {
    const nb = {}; TTE.vars.forEach(v => { nb[v] = TTE.neighbors[v].slice(); });
    return new E.CSP(TTE.vars.slice(), copyDomainsTT(TTE.domains), nb, (A, a, B, b) => a !== b, { kind: 'timetable-easy' });
  }
  const BT_TTE_P = {
    noun: 'course', values: v => TTE.domains[v],
    clash: (v, val, a) => { const u = TTE.neighbors[v].find(x => a[x] === val); return u ? { with: u, why: `${u} is already at ${val} and ${v}–${u} have the ${TTE.why[v + '|' + u]}` } : null; },
    okWhy: (v, val) => `no course linked to ${v} (${TTE.neighbors[v].join(', ')}) is at ${val}`,
    doneWhy: 'Every course has a time slot and no instructor or student clash remains',
    failTitle: v => `No time slot works for ${v}`
  };
  /** Constraint graph + slot board for the easy timetable. */
  function tteStateHTML(asg, o) {
    o = o || {};
    const col = {}, sub = {};
    TTE.vars.forEach(v => {
      if (asg[v]) { col[v] = TTE_COLOR[asg[v]]; sub[v] = asg[v]; }
      else sub[v] = '{' + TTE.domains[v].map(s => s.replace(' AM', 'a').replace(' PM', 'p')).join(', ') + '}';
    });
    const graph = graphSVG({ vars: TTE.vars, neighbors: TTE.neighbors, pos: TTE.pos, assignment: col, sub, W: 320, H: 170, r: 19, highlight: o.hl ? [o.hl] : [], hlEdges: o.clashWith ? [[o.hl, o.clashWith]] : [] });
    const board = TTE.slots.map(s => {
      const here = TTE.vars.filter(v => asg[v] === s);
      const tried = o.tryVal === s && o.hl;
      return `<div class="csp-tte-slot ${tried ? (o.bad ? 'bad' : 'try') : ''}"><div class="csp-tte-slot-h"><span class="csp-dot" style="background:${HEX[TTE_COLOR[s]]}"></span>${s}</div>${here.map(v => `<span class="csp-tte-chip">${v}</span>`).join('')}${tried ? `<span class="csp-tte-chip try ${o.bad ? 'bad' : ''}">${o.hl}?</span>` : ''}</div>`;
    }).join('');
    const legend = TTE.edges.map(([a, b, w]) => `<span class="${o.clashWith && ((a === o.hl && b === o.clashWith) || (b === o.hl && a === o.clashWith)) ? 'on' : ''}">${a} — ${b}: ${w}</span>`).join('');
    return `<div class="csp-tte">${graph}<div class="csp-tte-legend">${legend}<span>CS202 unavailable at 1:00 PM</span></div><div class="csp-tte-board">${board}</div></div>`;
  }
  const TTE_NOTE = 'Courses linked by an edge (same instructor or shared students) must get different time slots. CS202\'s unavailability at 1:00 PM is a unary constraint, already removed from its domain (node consistency). The constraint graph is a chain and every course has fewer linked courses than available slots, so backtracking never has to undo a choice here — compare with the Timetabling example.';

  /** Map-colouring hooks for traceBacktrackingCode. */
  const BT_MAP_P = {
    noun: 'region', values: () => ['red', 'green', 'blue'],
    clash: (v, c, a) => { const u = AUS.neighbors[v].find(x => a[x] === c); return u ? { with: u, why: `neighbour ${u} is already ${c}` } : null; },
    okWhy: (v, c) => `no neighbour of ${v} (${AUS.neighbors[v].join(', ') || 'none'}) is ${c}`,
    doneWhy: 'Every region has a colour and no constraint is violated',
    failTitle: v => `No colour works for ${v}`
  };
  /** Timetabling hooks for traceBacktrackingCode. */
  const BT_TT_P = {
    noun: 'course', values: v => TT.domains[v],
    clash: (v, val, a) => { for (const u of TT.vars) if (u in a) { const r = ttReason(v, val, u, a[u]); if (r) return { with: u, reason: r, why: `${u} is already at ${a[u]} — ${TT_WHY[r]}` }; } return null; },
    okWhy: (v, val) => `no course already placed clashes with ${val} (room H1, instructor H3, cohort H5)`,
    doneWhy: 'Every course has a (slot, room) and no hard constraint is violated',
    failTitle: v => `No (slot, room) works for ${v}`
  };

  /** Runs backtracking_search and records one step per code event (P = problem hooks). */
  function traceBacktrackingCode(order, P) {
    P = P || BT_MAP_P;
    const n = order.length;
    const steps = [], a = {}, stack = [];
    let nodes = 0, bts = 0;
    const top = () => stack[stack.length - 1];
    const snap = o => steps.push(Object.assign({ assignment: Object.assign({}, a), stack: stack.map(f => Object.assign({}, f)), nodes, bts }, o));
    snap({ lines: [1, 2, 3], kind: 'start', title: 'Start the search', explain: '<code>backtracking_search(csp)</code> resets both counters: <code>nodes_expanded = 0</code> and <code>backtracks = 0</code>.' });
    snap({ lines: [22], kind: 'start', title: 'First call: backtrack({})', explain: 'The search starts the recursion with an <strong>empty</strong> assignment. Every later call adds exactly one variable.' });
    function bt(depth) {
      nodes++;
      stack.push({ depth, asg: asgTxt(a), v: null, val: null });
      const k = Object.keys(a).length;
      if (k === n) {
        snap({ lines: [5, 6, 7, 8], kind: 'solution', title: 'Complete assignment → solution', explain: `Call #${nodes} (depth ${depth}): <code>len(assignment) = ${k} = len(csp.variables)</code>. ${P.doneWhy}, so this call <strong>returns the assignment</strong>.` });
        stack.pop();
        return Object.assign({}, a);
      }
      snap({ lines: [5, 6, 7], kind: 'call', title: `Call backtrack() — depth ${depth}`, explain: `<code>nodes_expanded</code> becomes ${nodes}. <code>len(assignment) = ${k}</code> &lt; ${n}, so the assignment is not complete yet — keep going.` });
      const v = order.find(x => !(x in a));
      top().v = v;
      const vals = P.values(v);
      snap({ lines: [10], kind: 'select', v, title: `Select variable ${v}`, explain: `<code>select_unassigned_variable</code> returns <strong>${v}</strong>, the first unassigned ${P.noun} in the fixed order ${order.join(', ')}. Its domain has ${plural(vals.length, 'value')}: ${setOf(vals)}.` });
      for (const c of vals) {
        top().val = c;
        const clash = P.clash(v, c, a);
        if (clash) {
          snap({ lines: [11, 12], kind: 'reject', v, val: c, conflict: [v, clash.with], clash, title: `Try ${v} = ${c} ✗`, explain: `<code>is_consistent(${v}, ${c})</code> is <strong>False</strong>: ${clash.why}. Skip lines 13–18 and try the next value.` });
          continue;
        }
        snap({ lines: [11, 12], kind: 'ok', v, val: c, title: `Try ${v} = ${c} ✓`, explain: `<code>is_consistent(${v}, ${c})</code> is <strong>True</strong>: ${P.okWhy(v, c)}.` });
        a[v] = c;
        snap({ lines: [13, 14], kind: 'assign', v, val: c, title: `Assign ${v} = ${c}, then recurse`, explain: `<code>csp.assign</code> adds ${v} = ${c} to the assignment, and <code>backtrack(assignment)</code> goes one level deeper (depth ${depth + 1}).` });
        const r = bt(depth + 1);
        if (r) {
          snap({ lines: [15, 16], kind: 'solution', v, val: c, title: `Pass the solution up (depth ${depth})`, explain: `<code>result</code> is not <code>None</code>, so this call returns it unchanged to its caller.` });
          stack.pop();
          return r;
        }
        delete a[v];
        bts++;
        snap({ lines: [15, 17, 18], kind: 'undo', v, val: c, title: `Backtrack: undo ${v} = ${c}`, explain: `The deeper call returned <code>None</code> — the search cannot be finished with ${v} = ${c}. <code>csp.unassign</code> removes it and <code>backtracks</code> becomes ${bts}. Try the next value of ${v}.` });
      }
      top().val = null;
      snap({ lines: [20], kind: 'fail', v, title: P.failTitle(v), explain: `Every value of ${v} failed, so this call (depth ${depth}) <strong>returns None</strong> — its caller will undo its own choice.` });
      stack.pop();
      return null;
    }
    const res = bt(0);
    snap({ lines: [22], kind: res ? 'done' : 'fail', title: res ? 'Search finished: solution returned' : 'Search finished: no solution', explain: res ? `<code>backtracking_search</code> returns ${asgTxt(res)} after ${nodes} calls to <code>backtrack()</code> and ${bts} backtrack${bts === 1 ? '' : 's'}.` : 'No complete, consistent assignment exists.' });
    return steps;
  }

  // ---------------------------------------------------------------------------
  // Code Trace topic — heuristics, inference, local search, comparison
  // (python_sandbox/07_CSP_Heuristics.py)
  // ---------------------------------------------------------------------------
  const CT_FILE = 'python_sandbox/07_CSP_Heuristics.py';
  const COLORS3 = ['red', 'green', 'blue'];
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const setOf = vals => '{' + vals.join(', ') + '}';
  const copyDom = d => { const o = {}; for (const k in d) o[k] = d[k].slice(); return o; };
  const fullDom = () => { const d = {}; AUS.variables.forEach(v => { d[v] = COLORS3.slice(); }); return d; };

  const MRV_PY = [
    'def mrv(assignment, csp):',
    '    unassigned = [v for v in csp.variables if v not in assignment]',
    '    if not unassigned:',
    '        return None',
    '',
    '    def legal(var):',
    '        return sum(1 for val in csp.domains[var]',
    '                   if csp.is_consistent(var, val, assignment))',
    '',
    '    min_size = min(legal(v) for v in unassigned)',
    '    candidates = [v for v in unassigned if legal(v) == min_size]',
    '    if len(candidates) == 1:',
    '        return candidates[0]',
    '',
    '    # Degree heuristic tie-breaker',
    '    def degree(var):',
    '        return sum(1 for n in csp.neighbors[var] if n not in assignment)',
    '',
    '    return max(candidates, key=degree)'
  ];
  const LCV_PY = [
    'def lcv(var, assignment, csp):',
    '    def ruled_out(val):',
    '        count = 0',
    '        for n in csp.neighbors[var]:',
    '            if n not in assignment:',
    '                for y in csp.domains[n]:',
    '                    if not csp.constraints(var, val, n, y):',
    '                        count += 1',
    '        return count',
    '',
    '    return sorted(csp.domains[var], key=ruled_out)'
  ];
  const FC_PY = [
    'def forward_checking(csp, var, value, assignment, removals):',
    '    for n in csp.neighbors[var]:',
    '        if n not in assignment:',
    '            for y in list(csp.domains[n]):',
    '                if not csp.constraints(var, value, n, y):',
    '                    csp.prune(n, y, removals)',
    '            if not csp.domains[n]:',
    '                return False',
    '    return True'
  ];
  const AC3_PY = [
    'def ac3(csp, queue=None, removals=None):',
    '    if queue is None:',
    '        queue = [(Xi, Xk) for Xi in csp.variables for Xk in csp.neighbors[Xi]]',
    '',
    '    while queue:',
    '        Xi, Xj = queue.pop(0)',
    '        if revise(csp, Xi, Xj, removals):',
    '            if not csp.domains[Xi]:',
    '                return False',
    '            for Xk in csp.neighbors[Xi]:',
    '                if Xk != Xj:',
    '                    queue.append((Xk, Xi))',
    '    return True',
    '',
    'def revise(csp, Xi, Xj, removals=None):',
    '    revised = False',
    '    for x in list(csp.domains[Xi]):',
    '        if not any(csp.constraints(Xi, x, Xj, y) for y in csp.domains[Xj]):',
    '            csp.prune(Xi, x, removals)',
    '            revised = True',
    '    return revised'
  ];
  const MC_PY = [
    'def min_conflicts(csp, max_steps=1000):',
    '    csp.nodes_expanded = 0',
    '    current = {}',
    '    for var in csp.variables:  # greedy complete assignment',
    '        counts = {val: csp.nconflicts(var, val, current) for val in csp.domains[var]}',
    '        fewest = min(counts.values())',
    '        current[var] = random.choice([val for val in counts if counts[val] == fewest])',
    '',
    '    for step in range(max_steps):',
    '        csp.nodes_expanded += 1',
    '        conflicted = [var for var in csp.variables',
    '                      if csp.nconflicts(var, current[var], current) > 0]',
    '        if not conflicted:',
    '            return current',
    '',
    '        var = random.choice(conflicted)',
    '        min_conf = float("inf")',
    '        best_vals = []',
    '        for val in csp.domains[var]:',
    '            conf = csp.nconflicts(var, val, current)',
    '            if conf < min_conf:',
    '                min_conf = conf',
    '                best_vals = [val]',
    '            elif conf == min_conf:',
    '                best_vals.append(val)',
    '',
    '        current[var] = random.choice(best_vals)',
    '',
    '    return None'
  ];
  const CMP_PY = [
    'def measure(solver, csp):',
    '    csp.nodes_expanded = 0',
    '    csp.backtracks = 0',
    '    start = time.perf_counter()',
    '    result = solver(csp)',
    '    elapsed = (time.perf_counter() - start) * 1000',
    '    return result, csp.nodes_expanded, csp.backtracks, elapsed',
    '',
    'SOLVERS = {',
    '    "Backtracking": backtracking_search,',
    '    "BT + MRV/Degree + LCV + FC": lambda c: backtracking_search_heuristics(',
    '        c, mrv, lcv, forward_checking),',
    '    "BT + MRV/Degree + LCV + MAC": lambda c: backtracking_search_heuristics(',
    '        c, mrv, lcv, mac),',
    '    "Min-Conflicts": lambda c: min_conflicts(c, max_steps=10000),',
    '}',
    '',
    'def compare(name, make_problem):',
    '    for label, solver in SOLVERS.items():',
    '        result, nodes, bts, ms = measure(solver, make_problem())',
    '        print(label, result is not None, nodes, bts, round(ms, 2))'
  ];

  const MRV_PRESETS = {
    start: { label: 'Empty assignment {}', asg: {} },
    wa: { label: 'After WA = red', asg: { WA: 'red' } },
    wa_nt: { label: 'After WA = red, NT = green', asg: { WA: 'red', NT: 'green' } }
  };
  const LCV_PRESETS = {
    q: { label: 'Order D(Q) · WA = red, NT = green (after FC)', v: 'Q', asg: { WA: 'red', NT: 'green' }, dom: { WA: ['red'], NT: ['green'], SA: ['blue'], Q: ['red', 'blue'], NSW: COLORS3, V: COLORS3, T: COLORS3 } },
    nsw: { label: 'Order D(NSW) · WA = red, NT = green, Q = red', v: 'NSW', asg: { WA: 'red', NT: 'green', Q: 'red' }, dom: { WA: ['red'], NT: ['green'], Q: ['red'], SA: ['blue'], NSW: ['green', 'blue'], V: COLORS3, T: COLORS3 } },
    sa: { label: 'Order D(SA) · empty assignment', v: 'SA', asg: {}, dom: null }
  };
  const FC_PRESETS = {
    fig67: { label: 'AIMA Fig 6.7: WA = red, Q = green, V = blue', seq: [['WA', 'red'], ['Q', 'green'], ['V', 'blue']] },
    ok: { label: 'WA = red, NT = green, Q = red', seq: [['WA', 'red'], ['NT', 'green'], ['Q', 'red']] }
  };
  const AC3_PRESETS = {
    wa_q: { label: 'WA = red, Q = green', init: { WA: ['red'], Q: ['green'] } },
    wa: { label: 'WA = red', init: { WA: ['red'] } },
    wa_sa: { label: 'WA = red, SA ≠ green', init: { WA: ['red'], SA: ['red', 'blue'] } }
  };
  const MC_PRESETS = { s1: { label: 'Random seed 1', seed: 1 }, s2: { label: 'Random seed 2', seed: 2 }, s3: { label: 'Random seed 3', seed: 3 } };
  const CMP_PROBLEMS = {
    aus: { label: 'Australia (7 regions)', make: () => E.makeMapCSP(AUS, 3) },
    ausbad: { label: 'Australia, order WA, NSW, NT, Q, SA, V, T', make: () => E.makeMapCSP(AUS, 3), order: ['WA', 'NSW', 'NT', 'Q', 'SA', 'V', 'T'] },
    q8: { label: '8-Queens', make: () => E.makeQueensCSP(8) },
    q20: { label: '20-Queens (basic backtracking takes a few seconds)', make: () => E.makeQueensCSP(20) },
    rand: { label: 'Random map (30 regions, 3 colours)', make: () => E.makeMapCSP(E.randomMap(30, 11), 3) }
  };

  function traceMRV(asg) {
    const N = AUS.neighbors, steps = [], legal = {}, deg = {};
    const un = AUS.variables.filter(v => !(v in asg));
    const snap = o => steps.push(Object.assign({ asg, un, legal: Object.assign({}, legal), deg: Object.assign({}, deg) }, o));
    snap({ lines: [1], kind: 'start', title: `Call mrv(assignment = ${asgTxt(asg)})`, explain: '<code>mrv()</code> returns the next variable to assign: the one with the <strong>fewest legal values</strong> left (fail-first).' });
    snap({ lines: [2], kind: 'run', title: 'Collect the unassigned variables', explain: `<code>unassigned = [${un.join(', ')}]</code> — ${plural(un.length, 'region')} still need a colour.` });
    snap({ lines: [3], kind: 'run', title: 'Anything left to assign?', explain: 'The list is not empty, so skip <code>return None</code> and rank the candidates.' });
    un.forEach(v => {
      const ok = COLORS3.filter(c => N[v].every(n => asg[n] !== c));
      legal[v] = ok;
      const blocked = COLORS3.filter(c => !ok.includes(c)).map(c => `${c} (used by ${N[v].filter(n => asg[n] === c).join(', ')})`);
      snap({ lines: [10, 6, 7, 8], kind: 'legal', v, title: `legal(${v}) = ${ok.length}`, explain: `Colours of ${v} consistent with the assignment: ${setOf(ok)}.${blocked.length ? ' Blocked: ' + blocked.join(', ') + '.' : ' No neighbour of ' + v + ' is coloured yet, so every colour is legal.'}` });
    });
    const m = Math.min(...un.map(v => legal[v].length));
    snap({ lines: [10], kind: 'run', title: `min_size = ${m}`, explain: `The smallest number of legal values among the unassigned regions is <strong>${m}</strong>.` });
    const cand = un.filter(v => legal[v].length === m);
    snap({ lines: [11], kind: 'run', cand, title: `candidates = [${cand.join(', ')}]`, explain: cand.length === 1 ? `Only ${cand[0]} has ${plural(m, 'legal value')}.` : `${cand.length} regions tie with ${plural(m, 'legal value')} — MRV alone cannot decide.` });
    if (cand.length === 1) {
      snap({ lines: [12, 13], kind: 'done', cand, chosen: cand[0], title: `MRV picks ${cand[0]}`, explain: `<code>len(candidates) == 1</code>, so return <strong>${cand[0]}</strong> immediately — the degree heuristic is not needed.` });
      return steps;
    }
    snap({ lines: [12], kind: 'run', cand, title: 'Tie → use the degree heuristic', explain: '<code>len(candidates) &gt; 1</code>, so skip <code>return candidates[0]</code> and break the tie with the degree heuristic.' });
    cand.forEach(v => {
      const u = N[v].filter(n => !(n in asg));
      deg[v] = u.length;
      snap({ lines: [19, 16, 17], kind: 'degree', v, cand, title: `degree(${v}) = ${u.length}`, explain: `${v} shares a constraint with ${plural(u.length, 'unassigned region')}${u.length ? ': ' + u.join(', ') : ''}.` });
    });
    let best = cand[0];
    cand.forEach(v => { if (deg[v] > deg[best]) best = v; });
    snap({ lines: [19], kind: 'done', cand, chosen: best, title: `MRV + Degree picks ${best}`, explain: `<code>max(candidates, key=degree)</code> returns <strong>${best}</strong> (degree ${deg[best]}): it constrains the most remaining regions, so colouring it first prunes the most.` });
    return steps;
  }

  function traceLCV(p) {
    const N = AUS.neighbors, v = p.v, asg = p.asg, dom = p.dom || fullDom();
    const steps = [], counts = {}, detail = {};
    const snap = o => steps.push(Object.assign({ v, asg, dom, counts: Object.assign({}, counts), detail: JSON.parse(JSON.stringify(detail)) }, o));
    snap({ lines: [1], kind: 'start', title: `Call lcv(${v})`, explain: `D(${v}) = ${setOf(dom[v])}. LCV orders these values by how many choices each one would <strong>remove</strong> from the unassigned neighbours — least constraining first.` });
    for (const val of dom[v]) {
      let count = 0;
      detail[val] = [];
      snap({ lines: [11, 2, 3], kind: 'val', val, title: `ruled_out(${val}): count = 0`, explain: `How many neighbour values clash with ${v} = ${val}?` });
      for (const n of N[v]) {
        if (n in asg) {
          snap({ lines: [4, 5], kind: 'skip', val, n, title: `${n} is assigned → skip`, explain: `${n} already has a colour (${asg[n]}); only unassigned neighbours count.` });
          continue;
        }
        const hit = dom[n].includes(val) ? 1 : 0;
        count += hit;
        detail[val].push([n, hit]);
        snap({ lines: hit ? [4, 5, 6, 7, 8] : [4, 5, 6, 7], kind: 'nb', val, n, title: `${v} = ${val} vs D(${n}) = ${setOf(dom[n])}`, explain: hit ? `${n} = ${val} would violate ${v} ≠ ${n} → <code>count += 1</code> (now ${count}).` : `No value in D(${n}) clashes with ${val} → count stays ${count}.` });
      }
      counts[val] = count;
      snap({ lines: [9], kind: 'ret', val, title: `ruled_out(${val}) = ${count}`, explain: `Choosing ${v} = ${val} would remove ${plural(count, 'value')} from its neighbours' domains.` });
    }
    const order = dom[v].slice().sort((a, b) => counts[a] - counts[b]);
    const tie = new Set(dom[v].map(x => counts[x])).size < dom[v].length;
    snap({ lines: [11], kind: 'done', order, title: `lcv(${v}) → [${order.join(', ')}]`, explain: `<code>sorted(..., key=ruled_out)</code> tries <strong>${order[0]}</strong> first because it leaves the most options open.${tie ? ' Equal counts keep their original order (Python\'s sort is stable).' : ''}` });
    return steps;
  }

  function traceFC(seq) {
    const N = AUS.neighbors, steps = [], asg = {}, history = [{ label: 'Initial domains', dom: fullDom() }];
    const dom = fullDom();
    const snap = o => steps.push(Object.assign({ asg: Object.assign({}, asg), dom: copyDom(dom), history: history.map(h => ({ label: h.label, dom: copyDom(h.dom) })) }, o));
    for (const [v, val] of seq) {
      asg[v] = val; dom[v] = [val];
      const removed = [];
      snap({ lines: [1], kind: 'start', v, val, title: `forward_checking(${v}, ${val})`, explain: `${v} = ${val} has just been assigned. Forward checking removes ${val} from every <strong>unassigned</strong> neighbour of ${v} (${N[v].join(', ') || 'none'}).` });
      let failed = false;
      for (const n of N[v]) {
        if (n in asg) { snap({ lines: [2, 3], kind: 'skip', v, val, n, title: `${n} is assigned → skip`, explain: `${n} already has a colour, so its domain is not touched.` }); continue; }
        const had = dom[n].includes(val);
        if (had) { dom[n] = dom[n].filter(y => y !== val); removed.push(`${n}:${val}`); }
        snap({ lines: had ? [2, 3, 4, 5, 6] : [2, 3, 4, 5], kind: had ? 'prune' : 'keep', v, val, n, pruned: had ? val : null, title: had ? `Prune ${val} from D(${n})` : `Nothing to prune in D(${n})`, explain: had ? `${n} = ${val} would violate ${v} ≠ ${n}, so <code>csp.prune(${n}, ${val})</code> → D(${n}) = ${setOf(dom[n])}.` : `D(${n}) = ${setOf(dom[n])} contains no ${val}.` });
        if (!dom[n].length) {
          history.push({ label: `After ${v} = ${val}`, dom: copyDom(dom) });
          snap({ lines: [7, 8], kind: 'wipe', v, val, n, title: `D(${n}) is empty → return False`, explain: `${n} has no colour left, so ${v} = ${val} cannot lead to a solution. <code>backtracking_search_heuristics</code> restores the removals and undoes ${v} = ${val} — <strong>without</strong> ever trying to colour ${n}.` });
          failed = true;
          break;
        }
      }
      if (failed) return steps;
      history.push({ label: `After ${v} = ${val}`, dom: copyDom(dom) });
      snap({ lines: [9], kind: 'done', v, val, title: 'No domain wiped out → return True', explain: `Removed ${removed.length ? removed.join(', ') : 'nothing'}. Every unassigned neighbour still has a value, so the search continues.` });
    }
    return steps;
  }

  function traceAC3(init) {
    const N = AUS.neighbors, steps = [], dom = fullDom();
    for (const k in init) dom[k] = init[k].slice();
    const q = [];
    AUS.variables.forEach(Xi => N[Xi].forEach(Xk => q.push([Xi, Xk])));
    const snap = o => steps.push(Object.assign({ dom: copyDom(dom), queue: q.map(a => a.slice()) }, o));
    snap({ lines: [1, 2, 3], kind: 'start', title: `queue = ${q.length} arcs`, explain: `No queue was passed in, so start with every arc (Xi, Xk): one per direction of each constraint — ${q.length} in total.` });
    let guard = 0;
    while (q.length && guard++ < 300) {
      const [Xi, Xj] = q.shift();
      snap({ lines: [5, 6], kind: 'pop', arc: [Xi, Xj], title: `Pop (${Xi}, ${Xj})`, explain: `Take the first arc. ${plural(q.length, 'arc')} remain in the queue.` });
      const detail = dom[Xi].map(x => [x, dom[Xj].filter(y => y !== x)]);
      const removed = detail.filter(d => !d[1].length).map(d => d[0]);
      dom[Xi] = dom[Xi].filter(x => !removed.includes(x));
      snap({ lines: removed.length ? [7, 15, 16, 17, 18, 19, 20, 21] : [7, 15, 16, 17, 18, 21], kind: removed.length ? 'revise' : 'keep', arc: [Xi, Xj], detail, removed, title: removed.length ? `revise(${Xi}, ${Xj}) removed ${removed.join(', ')}` : `revise(${Xi}, ${Xj}) → False`, explain: removed.length ? `${removed.join(', ')} ${removed.length > 1 ? 'have' : 'has'} no supporting value in D(${Xj}) = ${setOf(dom[Xj])} → prune; now D(${Xi}) = ${setOf(dom[Xi])}.` : `Every value in D(${Xi}) has a different colour available in D(${Xj}) → nothing removed.` });
      if (removed.length) {
        if (!dom[Xi].length) {
          snap({ lines: [8, 9], kind: 'wipe', arc: [Xi, Xj], title: `D(${Xi}) is empty → return False`, explain: `AC-3 proves there is <strong>no solution</strong> with these domains — before any search.` });
          return steps;
        }
        const added = N[Xi].filter(k => k !== Xj).map(k => [k, Xi]);
        added.forEach(a => q.push(a));
        snap({ lines: [8, 10, 11, 12], kind: 'requeue', arc: [Xi, Xj], added, title: added.length ? `Re-queue ${added.map(a => a[0] + '→' + a[1]).join(', ')}` : 'No arcs to re-queue', explain: `D(${Xi}) shrank, so every arc (Xk, ${Xi}) with Xk ≠ ${Xj} must be checked again. (This version appends even if the arc is already queued.)` });
      }
    }
    snap({ lines: [13], kind: 'done', title: 'Queue empty → return True', explain: 'Every arc is consistent. The domains shown are the arc-consistent domains.' });
    return steps;
  }

  function traceMinConflicts(seed) {
    const N = AUS.neighbors, vars = AUS.variables, rng = E.makeRng(seed);
    const choice = arr => arr[Math.floor(rng() * arr.length)];
    const steps = [], cur = {};
    let nodes = 0;
    const ncf = (v, val) => N[v].filter(n => n in cur && cur[n] === val).length;
    const conflictedEdges = () => { const out = []; vars.forEach(a => N[a].forEach(b => { if (a < b && a in cur && b in cur && cur[a] === cur[b]) out.push([a, b]); })); return out; };
    const snap = o => steps.push(Object.assign({ cur: Object.assign({}, cur), nodes, edges: conflictedEdges() }, o));
    snap({ lines: [1, 2, 3], kind: 'start', title: 'Start min_conflicts', explain: 'Local search works on a <strong>complete</strong> assignment. First build one greedily, region by region.' });
    for (const v of vars) {
      const counts = COLORS3.map(c => ncf(v, c));
      const fewest = Math.min(...counts);
      const pick = choice(COLORS3.filter((c, k) => counts[k] === fewest));
      cur[v] = pick;
      snap({ lines: [4, 5, 6, 7], kind: 'init', v, counts, title: `Greedy start: ${v} = ${pick}`, explain: `Conflicts with the regions coloured so far: ${COLORS3.map((c, k) => `${c} ${counts[k]}`).join(' · ')}. Pick randomly among the values with ${fewest} conflict${fewest === 1 ? '' : 's'}.` });
    }
    for (let step = 0; step < 60; step++) {
      nodes++;
      snap({ lines: [9, 10], kind: 'iter', title: `Iteration ${step + 1}`, explain: `<code>nodes_expanded</code> = ${nodes}.` });
      const conflicted = vars.filter(v => ncf(v, cur[v]) > 0);
      if (!conflicted.length) {
        snap({ lines: [11, 12, 13, 14], kind: 'done', conflicted, title: 'No conflicts → return current', explain: `Every constraint is satisfied — solution found after ${plural(step, 'repair')}.` });
        return steps;
      }
      snap({ lines: [11, 12, 13], kind: 'conf', conflicted, title: `conflicted = [${conflicted.join(', ')}]`, explain: `${plural(conflicted.length, 'region')} share a colour with a neighbour, so keep repairing.` });
      const v = choice(conflicted);
      snap({ lines: [16], kind: 'pick', v, conflicted, title: `Pick ${v} at random`, explain: `Choose one conflicted variable at random: <strong>${v}</strong> (currently ${cur[v]}).` });
      const counts = COLORS3.map(c => ncf(v, c));
      const m = Math.min(...counts);
      const best = COLORS3.filter((c, k) => counts[k] === m);
      snap({ lines: [17, 18, 19, 20, 21, 22, 23, 24, 25], kind: 'vals', v, counts, best, conflicted, title: `Conflicts for ${v}: ${COLORS3.map((c, k) => c + ' ' + counts[k]).join(', ')}`, explain: `min_conf = ${m}; best_vals = [${best.join(', ')}].` });
      const old = cur[v], val = choice(best);
      cur[v] = val;
      snap({ lines: [27], kind: 'set', v, counts, best, title: `Set ${v} = ${val}`, explain: val === old ? `${v} keeps ${val} (a sideways move — it was already among the best values).` : `${v}: ${old} → ${val}. Total conflicting borders now ${conflictedEdges().length}.` });
    }
    snap({ lines: [29], kind: 'fail', title: 'max_steps reached → return None', explain: 'Min-conflicts is incomplete: it can stop without a solution.' });
    return steps;
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
        ncEx: 'map', ncMapOn: { sa: true, wa: true, t: false, q: false }, ncMapApplied: false,
        ncCourse: 'AI302L', ncApplied: false,
        arcEx: 'map', maPreset: 'wa_sa', maDom: null, maXi: 'SA', maXj: 'WA', maLog: [],
        arcX: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], arcY: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], arcLog: [],
        ac3Preset: 'wa_q', ac3Step: 0,
        pathColors: 2,
        allM: 3, allN: 2,
        sudStep: 0,
        btVar: 'aima', btVal: 'static', btInf: 'none', btStep: 0,
        btcOrder: 'bad', btcStep: 0,
        mrvAssign: { WA: 'red', NT: 'green' },
        degAssign: {},
        lcvVar: 'Q',
        fcStep: 0,
        mcSeed: 2, mcStep: 0,
        chartSeed: 5, chartN: 24,
        compN: 80, compC: 20, compD: 2,
        treeStep: 0,
        cutsetOn: false, cutsetVal: 'red',
        benchProblem: 'rand', benchRows: null,
        goalShow: false,
        reprSel: 'search',
        tgStep: 0
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
        if (ci < 0 && c) {
          // Concept moved to another topic (e.g. #backtracking/btcode → #code/btcode)
          const tj = ALL_CONCEPTS.findIndex(list => list.some(x => x.key === c));
          if (tj >= 0) { this.topicIdx = tj; this.conceptIdx = ALL_CONCEPTS[tj].findIndex(x => x.key === c); }
        }
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
          ${concept.codeInConcept ? '<div class="csp-concept-code" id="csp-concept-code"></div>' : `<div class="csp-def-box">
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
          </div>`}
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
      if (this.st.ncEx === 'map') return this.ill_node_map();
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
        `${seg('csp-nc-ex', NC_EXAMPLES, 'tt')}<select class="csp-select" id="csp-nc-course">${opts}</select><button class="csp-btn ${applied ? '' : 'csp-btn-primary'}" id="csp-nc-apply">${applied ? 'Undo' : 'Apply node consistency'}</button>`,
        `<div class="csp-course-facts"><span><b>${course.id}</b> · ${course.enroll} students · needs a <b>${course.type}</b> room</span><span>Dr. ${course.instr} unavailable: <b>${inst.unavailLabel}</b></span></div>
         <div class="csp-mini-tt-wrap"><table class="csp-mini-tt csp-nc-table"><thead><tr><th></th>${cols}</tr><tr><th></th>${per}</tr></thead><tbody>${rows}</tbody></table></div>
         <div class="csp-legend"><span><i class="csp-lg ok"></i> consistent value</span><span><i class="csp-lg h2"></i> H2 capacity / type</span><span><i class="csp-lg h4"></i> H4 unavailable</span></div>`,
        `<div class="csp-metric-row">
           <div class="csp-metric"><span>|D| before</span><b>${S.nSlots * S.rooms.length}</b></div>
           <div class="csp-metric bad"><span>removed (H2 / H4)</span><b>${h2} / ${h4}</b></div>
           <div class="csp-metric ok"><span>|D| after</span><b>${kept}</b></div>
         </div>`
      );
      this.bindSeg('csp-nc-ex', v => { this.st.ncEx = v; this.refresh(); });
      this.on('csp-nc-course', 'change', e => { this.st.ncCourse = e.target.value; this.refresh(); });
      this.on('csp-nc-apply', 'click', () => { this.st.ncApplied = !applied; this.refresh(); });
    }

    ill_arc_revise() {
      if (this.st.arcEx === 'map') return this.ill_arc_map();
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
        `${seg('csp-arc-ex', ARC_EXAMPLES, 'num')}<button class="csp-btn csp-btn-primary" id="csp-arc-xy">REVISE(X, Y)</button><button class="csp-btn csp-btn-primary" id="csp-arc-yx">REVISE(Y, X)</button><button class="csp-btn" id="csp-arc-reset"><i data-lucide="rotate-ccw"></i></button>`,
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
      this.bindSeg('csp-arc-ex', v => { this.st.arcEx = v; this.refresh(); });
      this.on('csp-arc-xy', 'click', () => rev('xy'));
      this.on('csp-arc-yx', 'click', () => rev('yx'));
      this.on('csp-arc-reset', 'click', () => { this.st.arcX = all.slice(); this.st.arcY = all.slice(); this.st.arcLog = []; this.refresh(); });
    }

    /** Node consistency on the Australia map: unary colour constraints. */
    ill_node_map() {
      const on = this.st.ncMapOn, applied = this.st.ncMapApplied;
      const active = MAP_UNARY.filter(u => on[u.id]);
      const breaks = (v, c) => active.find(u => u.v === v && !unaryOkMap(u, c));
      const dom = {};
      let removed = 0;
      for (const v of AUS.variables) {
        dom[v] = MAP_COLORS.filter(c => !breaks(v, c));
        removed += MAP_COLORS.length - dom[v].length;
      }
      const shown = applied ? dom : Object.fromEntries(AUS.variables.map(v => [v, MAP_COLORS.slice()]));
      const constrained = [...new Set(active.map(u => u.v))];
      const chips = MAP_UNARY.map(u => `<button class="csp-btn ${on[u.id] ? 'csp-btn-primary' : ''}" data-u="${u.id}" title="${u.why}">${on[u.id] ? '✓' : '+'} ${u.v} ${u.op} ${colorDot(u.c)} ${u.c}</button>`).join('');
      const head = MAP_COLORS.map(c => `<th>${colorDot(c)} ${c}</th>`).join('');
      const rows = AUS.variables.map(v => {
        const cells = MAP_COLORS.map(c => {
          const b = breaks(v, c);
          if (!b) return `<td class="csp-nc-ok" style="text-align:center">✓</td>`;
          return `<td class="csp-nc-h4 ${applied ? 'struck' : ''}" style="text-align:center" title="violates ${b.v} ${b.op} ${b.c}">${applied ? '' : '✕'}</td>`;
        }).join('');
        return `<tr><th>${v}</th>${cells}</tr>`;
      }).join('');
      this.graphColEl.innerHTML = shell(
        'Node consistency on the map of Australia',
        `${seg('csp-nc-ex', NC_EXAMPLES, 'map')}<button class="csp-btn ${applied ? '' : 'csp-btn-primary'}" id="csp-ncm-apply">${applied ? 'Undo' : 'Apply node consistency'}</button>`,
        `<div class="csp-ill-tools" id="csp-ncm-chips"><span class="csp-queue-label">Unary constraints</span>${chips}</div>
         <div class="csp-duo">
           <div class="csp-duo-cell"><div class="csp-map-wrap">${mapSVG({ domains: shown, highlight: constrained })}</div></div>
           <div class="csp-duo-cell">
             <table class="csp-table csp-nc-table"><thead><tr><th>Var</th>${head}</tr></thead><tbody>${rows}</tbody></table>
             <div class="csp-legend"><span><i class="csp-lg ok"></i> satisfies every unary constraint</span><span><i class="csp-lg h4"></i> violates one</span></div>
           </div>
         </div>
         <div class="csp-metric-row">
           <div class="csp-metric"><span>Σ|D| before</span><b>${AUS.variables.length * MAP_COLORS.length}</b></div>
           <div class="csp-metric bad"><span>values removed</span><b>${removed}</b></div>
           <div class="csp-metric ok"><span>Σ|D| after</span><b>${AUS.variables.length * MAP_COLORS.length - removed}</b></div>
         </div>`,
        `<p class="csp-note">Node consistency only checks each variable against its <strong>own</strong> unary constraints. Even with WA = red, it leaves red in D<sub>NT</sub> and D<sub>SA</sub> — removing it there needs the binary constraints SA ≠ WA and NT ≠ WA, which is the job of <strong>arc consistency</strong>.</p>`
      );
      this.bindSeg('csp-nc-ex', v => { this.st.ncEx = v; this.refresh(); });
      this.on('csp-ncm-apply', 'click', () => { this.st.ncMapApplied = !applied; this.refresh(); });
      const box = this.$('csp-ncm-chips');
      if (box) box.querySelectorAll('button[data-u]').forEach(b => b.addEventListener('click', () => {
        const id = b.getAttribute('data-u');
        this.st.ncMapOn = Object.assign({}, on, { [id]: !on[id] });
        this.refresh();
      }));
    }

    /** Arc consistency on the Australia map: REVISE on a chosen directed arc. */
    ill_arc_map() {
      if (!this.st.maDom) this.st.maDom = mapArcDomains(this.st.maPreset);
      const D = this.st.maDom;
      const vars = AUS.variables.filter(v => AUS.neighbors[v].length);
      let Xi = this.st.maXi, Xj = this.st.maXj;
      if (!AUS.neighbors[Xi].includes(Xj)) { Xj = this.st.maXj = AUS.neighbors[Xi][0]; }
      const supported = (a, b, x) => D[b].some(y => y !== x);
      // Support diagram between D(Xi) (top) and D(Xj) (bottom)
      const cx = i => 70 + i * 70, W = 290;
      let lines = '', chips = '';
      MAP_COLORS.forEach((x, i) => {
        if (!D[Xi].includes(x)) return;
        MAP_COLORS.forEach((y, k) => { if (D[Xj].includes(y) && y !== x) lines += `<line x1="${cx(i)}" y1="52" x2="${cx(k)}" y2="118" class="csp-support"></line>`; });
      });
      const chip = (v, x, y, alive, lonely) => `<g><circle cx="${x}" cy="${y}" r="15" fill="${alive ? HEX[v] : '#ffffff'}" stroke="${lonely ? '#dc2626' : alive ? 'rgba(15,23,42,0.35)' : '#cbd5e1'}" stroke-width="${lonely ? 3 : 1.4}" ${alive ? '' : 'stroke-dasharray="3 3"'}></circle>${alive ? '' : `<line x1="${x - 9}" y1="${y + 9}" x2="${x + 9}" y2="${y - 9}" stroke="#94a3b8" stroke-width="1.4"></line>`}</g>`;
      MAP_COLORS.forEach((c, i) => {
        const alive = D[Xi].includes(c);
        chips += chip(c, cx(i), 36, alive, alive && !supported(Xi, Xj, c));
        chips += chip(c, cx(i), 134, D[Xj].includes(c), false);
      });
      const svg = `<svg viewBox="0 0 ${W} 170" class="csp-graph-svg">
        <text x="8" y="40" class="csp-row-label">${Xi}</text><text x="8" y="138" class="csp-row-label">${Xj}</text>
        <text x="${W / 2}" y="89" text-anchor="middle" style="font:600 10px 'Outfit',sans-serif;fill:#64748b">${Xi} ≠ ${Xj}</text>
        ${lines}${chips}
      </svg>`;
      // How many directed arcs are still not arc-consistent?
      const bad = [];
      for (const a of vars) for (const b of AUS.neighbors[a]) if (D[a].some(x => !supported(a, b, x))) bad.push(`${a}→${b}`);
      const wiped = AUS.variables.filter(v => !D[v].length);
      const presetOpts = Object.entries(MAP_ARC_PRESETS).map(([k, p]) => `<option value="${k}" ${k === this.st.maPreset ? 'selected' : ''}>${p.label}</option>`).join('');
      const xiOpts = vars.map(v => `<option ${v === Xi ? 'selected' : ''}>${v}</option>`).join('');
      const xjOpts = AUS.neighbors[Xi].map(v => `<option ${v === Xj ? 'selected' : ''}>${v}</option>`).join('');
      const fmtD = v => '{' + D[v].join(', ') + '}';
      const log = this.st.maLog.slice(-3).map(l => `<div>${l}</div>`).join('') || `<div>Pick an arc and press REVISE. A value of ${Xi} ringed in red has no support in D<sub>${Xj}</sub>. Try REVISE(SA, WA), then REVISE(NT, SA) and REVISE(NT, WA).</div>`;
      this.graphColEl.innerHTML = shell(
        'Arc consistency on the map: REVISE(X<sub>i</sub>, X<sub>j</sub>) with X<sub>i</sub> ≠ X<sub>j</sub>',
        `${seg('csp-arc-ex', ARC_EXAMPLES, 'map')}<select class="csp-select" id="csp-ma-preset">${presetOpts}</select>`,
        `<div class="csp-ill-tools">
           <span class="csp-queue-label">Arc</span>
           <select class="csp-select" id="csp-ma-xi">${xiOpts}</select><span>→</span><select class="csp-select" id="csp-ma-xj">${xjOpts}</select>
           <button class="csp-btn csp-btn-primary" id="csp-ma-rev">REVISE(${Xi}, ${Xj})</button>
           <button class="csp-btn csp-btn-primary" id="csp-ma-revb">REVISE(${Xj}, ${Xi})</button>
           <button class="csp-btn" id="csp-ma-reset" title="Reset domains"><i data-lucide="rotate-ccw"></i></button>
         </div>
         <div class="csp-duo">
           <div class="csp-duo-cell"><div class="csp-map-wrap">${mapSVG({ domains: D, arc: [Xi, Xj], highlight: [Xi] })}</div></div>
           <div class="csp-duo-cell"><div class="csp-card">${svg}</div></div>
         </div>
         <div class="csp-metric-row">
           <div class="csp-metric"><span>D(${Xi})</span><b>${fmtD(Xi)}</b></div>
           <div class="csp-metric"><span>D(${Xj})</span><b>${fmtD(Xj)}</b></div>
           <div class="csp-metric ${wiped.length ? 'bad' : bad.length ? '' : 'ok'}"><span>Whole map</span><b>${wiped.length ? 'D(' + wiped.join(', ') + ') = ∅ — no solution' : bad.length ? bad.length + ' arcs not yet consistent' : 'arc-consistent ✓'}</b></div>
         </div>`,
        `<div class="csp-log">${log}</div>`
      );
      const revise = (a, b) => {
        const gone = D[a].filter(x => !supported(a, b, x));
        this.st.maDom = Object.assign({}, D, { [a]: D[a].filter(x => supported(a, b, x)) });
        let msg = `REVISE(${a}, ${b}): `;
        if (!gone.length) msg += `nothing removed — every colour of ${a} has a different colour left in D(${b}).`;
        else msg += `removed ${gone.join(', ')} from D(${a}) — ${b} can only be ${D[b].join('/') || 'nothing'}, so ${a} = ${gone.join('/')} would clash.`;
        if (gone.length && !this.st.maDom[a].length) msg += ` D(${a}) is now empty — the problem is inconsistent.`;
        else if (gone.length) msg += ` Arcs into ${a} (${AUS.neighbors[a].filter(k => k !== b).map(k => k + '→' + a).join(', ') || 'none'}) must now be re-checked.`;
        this.st.maLog.push(msg);
        this.refresh();
      };
      this.bindSeg('csp-arc-ex', v => { this.st.arcEx = v; this.refresh(); });
      this.on('csp-ma-preset', 'change', e => { this.st.maPreset = e.target.value; this.st.maDom = mapArcDomains(e.target.value); this.st.maLog = []; this.refresh(); });
      this.on('csp-ma-xi', 'change', e => { this.st.maXi = e.target.value; this.refresh(); });
      this.on('csp-ma-xj', 'change', e => { this.st.maXj = e.target.value; this.refresh(); });
      this.on('csp-ma-rev', 'click', () => revise(Xi, Xj));
      this.on('csp-ma-revb', 'click', () => revise(Xj, Xi));
      this.on('csp-ma-reset', 'click', () => { this.st.maDom = mapArcDomains(this.st.maPreset); this.st.maLog = []; this.refresh(); });
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
      // The queue snapshot is taken AFTER the current arc was popped, so the
      // arc on the map (s.arc) is shown separately as "revised now" and the
      // head of the remaining queue is marked as "up next".
      const added = (s.added || []).map(([a, b]) => a + '|' + b);
      const qHTML = q.slice(0, 14).map(([a, b], k) => `<span class="csp-arc-chip ${k === 0 ? 'upnext' : ''} ${added.includes(a + '|' + b) ? 'added' : ''}" title="${k === 0 ? 'next arc to be popped' : added.includes(a + '|' + b) ? 're-queued by this step' : ''}">${a}→${b}</span>`).join('') + (q.length > 14 ? `<span class="csp-muted">+${q.length - 14} more</span>` : '') || '<span class="csp-muted">empty</span>';
      const nowHTML = s.arc ? `<span class="csp-queue-label">Revised now</span><span class="csp-arc-chip next">${s.arc[0]}→${s.arc[1]}</span><span class="csp-queue-sep"></span>` : '';
      const opts = Object.entries(this.ac3Presets()).map(([k, v]) => `<option value="${k}" ${k === this.st.ac3Preset ? 'selected' : ''}>${v.label}</option>`).join('');
      const kindPill = { start: ['neutral', 'START'], keep: ['neutral', 'NO CHANGE'], revise: ['info', 'REVISED'], wipeout: ['bad', 'DOMAIN WIPE-OUT'], done: ['ok', 'ARC-CONSISTENT'] }[s.kind];
      this.graphColEl.innerHTML = shell(
        'AC-3 on Australia',
        `<select class="csp-select" id="csp-ac3-preset">${opts}</select>`,
        `<div class="csp-map-wrap">${mapSVG({ assignment: P.init, domains: s.domains, tint, arc: s.arc || null, highlight: s.arc ? [s.arc[0]] : [] })}</div>
         <div class="csp-queue">${nowHTML}<span class="csp-queue-label">Queue (${q.length})</span>${qHTML}</div>`,
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
        aima: { label: 'Fixed: WA, NT, Q, NSW, V, SA, T', varOrder: 'static', order: ['WA', 'NT', 'Q', 'NSW', 'V', 'SA', 'T'] },
        bad: { label: 'Fixed: WA, NSW, NT, Q, SA, V, T', varOrder: 'static', order: ['WA', 'NSW', 'NT', 'Q', 'SA', 'V', 'T'] },
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
      if (this.st.btEx === 'tt' || this.st.btEx === 'tte') return this.ill_bt_tt();
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
        seg('csp-bt-ex', BT_EXAMPLES, 'map') +
        sel('csp-bt-var', Object.entries(this.btOrders()).map(([k, v]) => [k, v.label]), this.st.btVar) +
        sel('csp-bt-val', [['static', 'Values: R, G, B'], ['lcv', 'Values: LCV']], this.st.btVal) +
        sel('csp-bt-inf', [['none', 'No inference'], ['fc', 'Forward checking'], ['mac', 'MAC']], this.st.btInf) +
        `<button class="csp-btn" id="csp-bt-code" title="Step through the Python code of this algorithm"><i data-lucide="code-2"></i> Code trace</button>`,
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
      this.bindSeg('csp-bt-ex', v => { this.clearTimer(); this.st.btEx = v; this.st.btStep = 0; this.refresh(); });
      this.on('csp-bt-var', 'change', e => { this.st.btVar = e.target.value; reset(); });
      this.on('csp-bt-val', 'change', e => { this.st.btVal = e.target.value; reset(); });
      this.on('csp-bt-inf', 'change', e => { this.st.btInf = e.target.value; reset(); });
      this.on('csp-bt-code', 'click', () => { this.clearTimer(); this.st.ctBtEx = 'map'; this.topicIdx = CSP_TOPICS.findIndex(t => t.id === 'code'); this.conceptIdx = 0; this.render(); });
      this.bindStepper('csp-bt', 'btStep', steps.length, 800);
    }

    /**
     * Shared renderer for every Code Trace concept: the Python source goes in
     * the concept column (#csp-concept-code); toolbar, step name, state panel
     * and "What's happening?" go in the illustration column.
     * o = { id, file, code, presets, steps(presetKey) , title, stateBody(s), tags, foot(steps) }
     */
    renderCodeTrace(o) {
      const pk = 'ct_' + o.id + '_preset', sk = 'ct_' + o.id + '_step';
      if (!this.st[pk] || !o.presets[this.st[pk]]) this.st[pk] = Object.keys(o.presets)[0];
      if (this.st[sk] == null) this.st[sk] = 0;
      const cacheKey = o.id + ':' + this.st[pk];
      this._ct = this._ct || {};
      if (!this._ct[cacheKey]) this._ct[cacheKey] = o.steps(this.st[pk]);
      const steps = this._ct[cacheKey], total = steps.length;
      const i = Math.min(this.st[sk], total - 1), s = steps[i];
      const active = new Set(s.lines || []);
      const code = o.code.map((line, k) => {
        const on = active.has(k + 1);
        return `<div class="csp-trace-line ${on ? 'is-active' : ''} ${line ? '' : 'is-blank'}"><span class="csp-trace-arrow">${on ? '→' : ''}</span><span class="csp-trace-no">${k + 1}</span><span class="csp-trace-src">${pyHTML(line)}</span></div>`;
      }).join('');
      const host = document.getElementById('csp-concept-code');
      if (host) host.innerHTML = `
        <div class="csp-trace-panel csp-trace-panel-code">
          <p class="csp-trace-panel-title">${o.file}<span class="csp-trace-tag">Python</span><span class="csp-trace-tag csp-trace-tag-step">Step ${i + 1} / ${total}</span></p>
          <pre class="csp-trace-code">${code}</pre>
        </div>`;
      const [tag, tagCls] = (o.tags && o.tags[s.kind]) || ['Running', ''];
      const opts = Object.entries(o.presets).map(([k, v]) => `<option value="${k}" ${k === this.st[pk] ? 'selected' : ''}>${v.label}</option>`).join('');
      const p = `csp-ct-${o.id}`;
      this.graphColEl.innerHTML = shell(
        o.title,
        `${o.extraTools || ''}<select class="csp-select" id="${p}-preset">${opts}</select>`,
        `<div class="csp-trace csp-trace-side">
           <div class="csp-trace-toolbar">
             <div class="csp-trace-count">Step ${i + 1} of ${total}</div>
             <div class="csp-trace-controls">
               <button type="button" class="csp-btn" id="${p}-prev" ${i <= 0 ? 'disabled' : ''}>← Prev</button>
               <button type="button" class="csp-btn csp-btn-primary" id="${p}-next" ${i >= total - 1 ? 'disabled' : ''}>Next →</button>
               <button type="button" class="csp-btn" id="${p}-play">${this.timer ? '❚❚ Pause' : '▶ Run'}</button>
               <button type="button" class="csp-btn" id="${p}-reset">↻ Reset</button>
             </div>
           </div>
           <div class="csp-trace-note"><p class="csp-trace-note-title">${esc(s.title)}</p></div>
           <div class="csp-trace-panel">
             <p class="csp-trace-panel-title">${o.stateTitle || 'Search state'}<span class="csp-trace-tag ${tagCls}">${tag}</span></p>
             ${o.stateBody(s, steps)}
             <div class="csp-trace-explain"><div class="csp-trace-explain-title">What's happening?</div><div class="csp-trace-explain-body">${s.explain}</div></div>
           </div>
           ${o.foot ? `<p class="csp-note">${o.foot(steps)}</p>` : ''}
         </div>`
      );
      this.on(`${p}-preset`, 'change', e => { this.clearTimer(); this.st[pk] = e.target.value; this.st[sk] = 0; this.refresh(); });
      this.bindStepper(p, sk, total, o.interval || 900);
      if (o.bindExtra) o.bindExtra();
      const pre = document.querySelector('#csp-concept-code .csp-trace-code');
      const hot = pre && pre.querySelector('.csp-trace-line.is-active');
      if (pre && hot && pre.scrollHeight > pre.clientHeight + 2) pre.scrollTop = Math.max(0, hot.offsetTop - pre.clientHeight / 2 + hot.offsetHeight);
    }

    /** Variables table used by several traces. */
    ctVars(rows) {
      return `<div class="csp-trace-region"><div class="csp-trace-region-label">Variables</div>${rows.map(([k, v, cls]) => `<div class="csp-trace-var"><span>${k}</span><b class="${cls || ''}">${v}</b></div>`).join('')}</div>`;
    }

    ill_bt_code() {
      const exSeg = seg('csp-ct-bt-ex', BT_EXAMPLES, this.st.ctBtEx || 'map');
      const bindEx = () => this.bindSeg('csp-ct-bt-ex', v => { this.clearTimer(); this.st.ctBtEx = v; this.refresh(); });
      if (this.st.ctBtEx === 'tte') return this.renderCodeTrace({
        id: 'bttte', file: 'python_sandbox/csp.py', code: BT_PY, presets: TTE_ORDERS, extraTools: exSeg, bindExtra: bindEx,
        steps: k => traceBacktrackingCode(TTE_ORDERS[k].order, BT_TTE_P),
        title: 'Trace the code: backtracking_search', stateTitle: 'Timetable (easy)',
        tags: { start: ['Ready', ''], reject: ['Clash', 'bad'], undo: ['Backtrack', 'warn'], fail: ['Return None', 'warn'], solution: ['Solution', 'ok'], done: ['Done', 'ok'] },
        stateBody: s => {
          const frames = s.stack.length
            ? s.stack.map((f, k) => `<div class="csp-trace-frame ${k === s.stack.length - 1 ? 'is-top' : ''}" style="margin-left:${Math.min(k, 7) * 6}px"><b>#${f.depth}</b> backtrack(${f.asg})${f.v ? ` · var=${f.v}` : ''}${f.val ? ` · val=${f.val}` : ''}</div>`).join('')
            : '<p class="csp-trace-empty">No active calls.</p>';
          const tryOn = s.v && s.val && (s.kind === 'reject' || s.kind === 'ok');
          return `<div class="csp-trace-state csp-trace-state-tt">
              <div>${tteStateHTML(s.assignment, { hl: s.v, tryVal: tryOn ? s.val : null, bad: s.kind === 'reject', clashWith: s.kind === 'reject' ? s.clash.with : null })}</div>
              <div class="csp-trace-regions">
                <div class="csp-trace-region"><div class="csp-trace-region-label">Call stack (recursion)</div>${frames}</div>
                ${this.ctVars([['assignment', Object.keys(s.assignment).length ? asgTxt(s.assignment) : '{}'], ['nodes_expanded', s.nodes], ['backtracks', s.bts, s.bts ? 'bad' : '']])}
              </div>
            </div>`;
        },
        foot: steps => { const l = steps[steps.length - 1]; return `${TTE_NOTE} Whole run: <b>${l.nodes}</b> calls to <code>backtrack()</code>, <b>${l.bts}</b> backtrack${l.bts === 1 ? '' : 's'}.`; }
      });
      if (this.st.ctBtEx === 'tt') return this.renderCodeTrace({
        id: 'bttt', file: 'python_sandbox/csp.py', code: BT_PY, presets: BT_TT_ORDERS, extraTools: exSeg, bindExtra: bindEx,
        steps: k => traceBacktrackingCode(BT_TT_ORDERS[k].order, BT_TT_P),
        title: 'Trace the code: backtracking_search', stateTitle: 'Timetable',
        tags: { start: ['Ready', ''], reject: ['Clash', 'bad'], undo: ['Backtrack', 'warn'], fail: ['Return None', 'warn'], solution: ['Solution', 'ok'], done: ['Done', 'ok'] },
        stateBody: s => {
          const frames = s.stack.length
            ? s.stack.map((f, k) => `<div class="csp-trace-frame ${k === s.stack.length - 1 ? 'is-top' : ''}" style="margin-left:${Math.min(k, 7) * 6}px"><b>#${f.depth}</b>${f.v ? ` var=${f.v}` : ''}${f.val ? ` · val=${f.val}` : ''}</div>`).join('')
            : '<p class="csp-trace-empty">No active calls.</p>';
          const tryOn = s.v && s.val && (s.kind === 'reject' || s.kind === 'ok');
          return `<div class="csp-trace-state csp-trace-state-tt">
              <div>${ttGridHTML(s.assignment, { hl: s.v, tryCourse: tryOn ? s.v : null, tryVal: tryOn ? s.val : null, bad: s.kind === 'reject', clashWith: s.kind === 'reject' ? s.clash.with : null })}</div>
              <div class="csp-trace-regions">
                <div class="csp-trace-region"><div class="csp-trace-region-label">Call stack (recursion)</div>${frames}</div>
                ${this.ctVars([['assigned', `${Object.keys(s.assignment).length} / ${TT.vars.length}`], ['nodes_expanded', s.nodes], ['backtracks', s.bts, s.bts ? 'bad' : '']])}
              </div>
            </div>`;
        },
        foot: steps => { const l = steps[steps.length - 1]; return `${TT_NOTE} Whole run: <b>${l.nodes}</b> calls to <code>backtrack()</code>, <b>${l.bts}</b> backtrack${l.bts === 1 ? '' : 's'}.`; }
      });
      this.renderCodeTrace({
        extraTools: exSeg, bindExtra: bindEx,
        id: 'bt', file: 'python_sandbox/csp.py', code: BT_PY, presets: BT_CODE_ORDERS,
        steps: k => traceBacktrackingCode(BT_CODE_ORDERS[k].order),
        title: 'Trace the code: backtracking_search',
        tags: { start: ['Ready', ''], reject: ['Conflict', 'bad'], undo: ['Backtrack', 'warn'], fail: ['Return None', 'warn'], solution: ['Solution', 'ok'], done: ['Done', 'ok'] },
        stateBody: s => {
          const tint = {};
          if (s.v && s.val && !s.assignment[s.v]) tint[s.v] = s.val;
          const frames = s.stack.length
            ? s.stack.map((f, k) => `<div class="csp-trace-frame ${k === s.stack.length - 1 ? 'is-top' : ''}" style="margin-left:${Math.min(k, 7) * 6}px"><b>#${f.depth}</b> backtrack(${f.asg})${f.v ? ` · var=${f.v}` : ''}${f.val ? ` · val=${f.val}` : ''}</div>`).join('')
            : '<p class="csp-trace-empty">No active calls.</p>';
          return `<div class="csp-trace-state">
              <div class="csp-trace-map">${mapSVG({ assignment: s.assignment, tint, highlight: s.v ? [s.v] : [], conflicts: s.conflict ? [s.conflict] : [] })}</div>
              <div class="csp-trace-regions">
                <div class="csp-trace-region"><div class="csp-trace-region-label">Call stack (recursion)</div>${frames}</div>
                ${this.ctVars([['assignment', Object.keys(s.assignment).length ? asgTxt(s.assignment) : '{}'], ['nodes_expanded', s.nodes], ['backtracks', s.bts, s.bts ? 'bad' : '']])}
              </div>
            </div>`;
        },
        foot: steps => { const l = steps[steps.length - 1]; return `Colouring Australia with {red, green, blue}; variables in the fixed order above, values tried red → green → blue. Whole run: <b>${l.nodes}</b> calls to <code>backtrack()</code>, <b>${l.bts}</b> backtrack${l.bts === 1 ? '' : 's'}.`; }
      });
    }

    ill_ct_mrv() {
      this.renderCodeTrace({
        id: 'mrv', file: CT_FILE + ' · mrv()', code: MRV_PY, presets: MRV_PRESETS,
        steps: k => traceMRV(MRV_PRESETS[k].asg),
        title: 'Trace the code: mrv() with degree tie-breaker', stateTitle: 'Variable ordering',
        tags: { start: ['Ready', ''], legal: ['Count legal', ''], degree: ['Degree', 'warn'], done: ['Chosen', 'ok'] },
        stateBody: s => {
          const badges = {};
          Object.keys(s.legal).forEach(v => { badges[v] = s.legal[v].length; });
          const rows = s.un.map(v => {
            const known = s.legal[v];
            const role = s.chosen === v ? '<span class="csp-pill ok">★ chosen</span>' : (s.cand || []).includes(v) ? '<span class="csp-pill info">candidate</span>' : '';
            return `<tr class="${s.v === v ? 'best' : ''}"><td><b>${v}</b></td><td>${known ? domainDots(known) : '<span class="csp-muted">?</span>'}</td><td class="mono">${known ? known.length : '—'}</td><td class="mono">${s.deg[v] != null ? s.deg[v] : '—'}</td><td>${role}</td></tr>`;
          }).join('');
          return `<div class="csp-trace-state">
              <div class="csp-trace-map">${mapSVG({ assignment: s.asg, badges, badgeHot: s.v || s.chosen, highlight: s.chosen ? [s.chosen] : s.v ? [s.v] : [] })}</div>
              <div class="csp-trace-regions">
                <div class="csp-trace-region"><div class="csp-trace-region-label">Unassigned variables</div>
                  <table class="csp-table csp-trace-table"><thead><tr><th>Var</th><th>Legal</th><th>#</th><th>Degree</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
              </div>
            </div>`;
        },
        foot: () => 'Badges on the map = number of legal colours. MRV keeps the variables with the smallest badge; the degree heuristic breaks ties by counting unassigned neighbours.'
      });
    }

    ill_ct_lcv() {
      this.renderCodeTrace({
        id: 'lcv', file: CT_FILE + ' · lcv()', code: LCV_PY, presets: LCV_PRESETS,
        steps: k => traceLCV(LCV_PRESETS[k]),
        title: 'Trace the code: lcv()', stateTitle: 'Value ordering',
        tags: { start: ['Ready', ''], val: ['ruled_out', ''], nb: ['Neighbour', ''], skip: ['Skip', ''], ret: ['Count', 'warn'], done: ['Ordered', 'ok'] },
        stateBody: s => {
          const vals = s.dom[s.v];
          const rows = vals.map(x => {
            const d = s.detail[x] || [];
            const cells = d.map(([n, h]) => `<span class="csp-lcv-hit ${h ? 'on' : ''}">${n}${h ? ' −1' : ' 0'}</span>`).join(' ');
            return `<tr class="${s.val === x ? 'best' : ''}"><td>${colorDot(x)} <b>${x}</b></td><td>${cells || '<span class="csp-muted">—</span>'}</td><td class="mono">${s.counts[x] != null ? s.counts[x] : '—'}</td></tr>`;
          }).join('');
          const order = s.order ? `<div class="csp-trace-order">${s.order.map((x, k) => `<span class="csp-arc-chip ${k === 0 ? 'next' : ''}">${k + 1}. ${x}</span>`).join('')}</div>` : '';
          const dshow = {}; AUS.variables.forEach(k => { if (!(k in s.asg)) dshow[k] = s.dom[k]; });
          return `<div class="csp-trace-state">
              <div class="csp-trace-map">${mapSVG({ assignment: s.asg, domains: dshow, highlight: [s.v].concat(s.n ? [s.n] : []) })}</div>
              <div class="csp-trace-regions">
                <div class="csp-trace-region"><div class="csp-trace-region-label">ruled_out(val) for ${s.v}</div>
                  <table class="csp-table csp-trace-table"><thead><tr><th>Value</th><th>Neighbours hit</th><th>Count</th></tr></thead><tbody>${rows}</tbody></table>
                  ${order}</div>
              </div>
            </div>`;
        },
        foot: () => 'Dots on the map show the current domains (after forward checking). Variable ordering is fail-first; value ordering is fail-last: keep as many options open as possible.'
      });
    }

    ill_ct_fc() {
      this.renderCodeTrace({
        id: 'fc', file: CT_FILE + ' · forward_checking()', code: FC_PY, presets: FC_PRESETS,
        steps: k => traceFC(FC_PRESETS[k].seq),
        title: 'Trace the code: forward_checking()', stateTitle: 'Domains',
        tags: { start: ['Call', ''], skip: ['Skip', ''], prune: ['Prune', 'warn'], keep: ['No change', ''], wipe: ['Wipe-out', 'bad'], done: ['Return True', 'ok'] },
        stateBody: s => {
          const dshow = {}; AUS.variables.forEach(k => { if (!(k in s.asg)) dshow[k] = s.dom[k]; });
          const head = AUS.variables.map(v => `<th class="${v === s.n ? 'hl' : ''}">${v}</th>`).join('');
          const row = (label, d, cur) => `<tr class="${cur ? 'best' : ''}"><td>${label}</td>${AUS.variables.map(v => `<td class="${v === s.n && cur ? 'hl' : ''}">${d[v].length ? domainDots(d[v]) : '<span class="csp-bad-txt">∅</span>'}</td>`).join('')}</tr>`;
          const done = s.history.length - 1;
          const live = s.kind !== 'done' && s.kind !== 'wipe';
          const rows = s.history.map((h, k) => row(h.label, h.dom, !live && k === done)).join('') + (live ? row(`During ${s.v} = ${s.val}`, s.dom, true) : '');
          return `<div class="csp-trace-state csp-trace-state-wide">
              <div class="csp-trace-map">${mapSVG({ assignment: s.asg, domains: dshow, highlight: [s.v].concat(s.n ? [s.n] : []), arc: s.n ? [s.v, s.n] : null })}</div>
              <div class="csp-trace-regions"><div class="csp-trace-region"><div class="csp-trace-region-label">Domain table (AIMA Fig 6.7 style)</div>
                <div class="csp-table-wrap"><table class="csp-table csp-trace-table csp-fc-table"><thead><tr><th></th>${head}</tr></thead><tbody>${rows}</tbody></table></div></div></div>
            </div>`;
        },
        foot: () => 'Forward checking only looks one step ahead: it prunes the neighbours of the variable just assigned. It does not notice that two unassigned neighbours (e.g. NT and SA) are both left with only blue — that needs AC-3.'
      });
    }

    ill_ct_ac3() {
      this.renderCodeTrace({
        id: 'ac3', file: CT_FILE + ' · ac3() / revise()', code: AC3_PY, presets: AC3_PRESETS,
        steps: k => traceAC3(AC3_PRESETS[k].init),
        title: 'Trace the code: ac3() and revise()', stateTitle: 'Arc consistency', interval: 600,
        tags: { start: ['Ready', ''], pop: ['Pop arc', ''], keep: ['No change', ''], revise: ['Revised', 'warn'], requeue: ['Re-queue', 'warn'], wipe: ['Wipe-out', 'bad'], done: ['Consistent', 'ok'] },
        stateBody: s => {
          const q = s.queue;
          const qHTML = q.slice(0, 16).map(([a, b], k) => `<span class="csp-arc-chip ${k === 0 ? 'upnext' : ''} ${(s.added || []).some(x => x[0] === a && x[1] === b) && k >= q.length - (s.added || []).length ? 'added' : ''}">${a}→${b}</span>`).join('') + (q.length > 16 ? `<span class="csp-muted">+${q.length - 16}</span>` : '') || '<span class="csp-muted">empty</span>';
          const det = s.detail ? `<table class="csp-table csp-trace-table"><thead><tr><th>x ∈ D(${s.arc[0]})</th><th>support y ∈ D(${s.arc[1]}), y ≠ x</th></tr></thead><tbody>${s.detail.map(([x, ys]) => `<tr><td>${colorDot(x)} ${x}</td><td>${ys.length ? ys.map(y => colorDot(y) + ' ' + y).join(' ') : '<span class="csp-bad-txt">none → prune</span>'}</td></tr>`).join('')}</tbody></table>` : '<p class="csp-trace-empty">revise() details appear here.</p>';
          return `<div class="csp-trace-state">
              <div class="csp-trace-map">${mapSVG({ domains: s.dom, arc: s.arc || null, highlight: s.arc ? [s.arc[0]] : [] })}</div>
              <div class="csp-trace-regions">
                <div class="csp-trace-region"><div class="csp-trace-region-label">queue (${q.length})</div><div class="csp-queue">${qHTML}</div></div>
                <div class="csp-trace-region"><div class="csp-trace-region-label">revise</div>${det}</div>
              </div>
            </div>`;
        },
        foot: steps => `This run: <b>${steps.filter(x => x.kind === 'pop').length}</b> arcs popped, result <b>${steps[steps.length - 1].kind === 'wipe' ? 'False (inconsistent)' : 'True'}</b>. Inside backtracking, <code>mac()</code> calls <code>ac3</code> with only the arcs pointing into the variable just assigned.`
      });
    }

    ill_ct_minconf() {
      this.renderCodeTrace({
        id: 'mc', file: CT_FILE + ' · min_conflicts()', code: MC_PY, presets: MC_PRESETS,
        steps: k => traceMinConflicts(MC_PRESETS[k].seed),
        title: 'Trace the code: min_conflicts()', stateTitle: 'Local search state', interval: 800,
        tags: { start: ['Ready', ''], init: ['Greedy start', ''], iter: ['Iteration', ''], conf: ['Conflicts', 'bad'], pick: ['Pick', 'warn'], vals: ['Evaluate', ''], set: ['Repair', 'warn'], done: ['Solution', 'ok'], fail: ['Gave up', 'bad'] },
        stateBody: s => {
          const vt = s.counts ? `<table class="csp-table csp-trace-table"><thead><tr><th>${s.kind === 'init' ? 'value' : 'val for ' + s.v}</th><th>conflicts</th></tr></thead><tbody>${COLORS3.map((c, k) => `<tr class="${(s.best || []).includes(c) ? 'best' : ''}"><td>${colorDot(c)} ${c}</td><td class="mono">${s.counts[k]}</td></tr>`).join('')}</tbody></table>` : '<p class="csp-trace-empty">Value conflicts appear here.</p>';
          return `<div class="csp-trace-state">
              <div class="csp-trace-map">${mapSVG({ assignment: s.cur, conflicts: s.edges, highlight: s.v ? [s.v] : [] })}</div>
              <div class="csp-trace-regions">
                ${this.ctVars([['current', Object.keys(s.cur).length ? asgTxt(s.cur) : '{}'], ['conflicted', s.conflicted ? '[' + s.conflicted.join(', ') + ']' : '—', s.conflicted && s.conflicted.length ? 'bad' : ''], ['conflicting borders', s.edges.length, s.edges.length ? 'bad' : ''], ['nodes_expanded', s.nodes]])}
                <div class="csp-trace-region"><div class="csp-trace-region-label">nconflicts(var, val)</div>${vt}</div>
              </div>
            </div>`;
        },
        foot: steps => `This run: <b>${plural(steps.filter(x => x.kind === 'set').length, 'repair move')}</b>. The page uses its own seeded random generator, so the exact choices differ from Python's <code>random</code> — the algorithm is the same.`
      });
    }

    ctRunCompare(key) {
      const P = CMP_PROBLEMS[key];
      const cfgs = [
        ['Backtracking', { varOrder: 'static', valOrder: 'static', inference: 'none' }],
        ['BT + MRV/Degree + LCV + FC', { varOrder: 'mrv-degree', valOrder: 'lcv', inference: 'fc' }],
        ['BT + MRV/Degree + LCV + MAC', { varOrder: 'mrv-degree', valOrder: 'lcv', inference: 'mac' }]
      ];
      const time = fn => { let r = fn(), t = r.t, reps = 1; if (t < 5) { const t0 = performance.now(); for (let k = 0; k < 20; k++) fn(); t = (performance.now() - t0) / 20; reps = 20; } return Object.assign(r, { t, reps }); };
      const rows = cfgs.map(([name, cfg]) => time(() => {
        const t0 = performance.now();
        const r = E.backtrackingSearch(P.make(), Object.assign({ trace: false, maxChecks: 5e7, staticOrder: P.order }, cfg));
        const t = performance.now() - t0;
        return { name, solved: !!r.solution, limit: r.aborted, nodes: r.stats.nodes + (r.solution ? 1 : 0), bts: r.stats.backtracks, t };
      }));
      rows.push(time(() => {
        const t0 = performance.now();
        const mc = E.minConflicts(P.make(), { maxSteps: 10000, seed: 4, trace: false });
        return { name: 'Min-Conflicts', solved: !!mc.solution, nodes: mc.solution ? mc.iterations + 1 : mc.iterations, bts: null, t: performance.now() - t0, local: true };
      }));
      this.st.ctCmp = { key, rows };
    }

    ill_ct_compare() {
      if (!this.st.ctCmpKey) this.st.ctCmpKey = 'ausbad';
      if (!this.st.ctCmp || this.st.ctCmp.key !== this.st.ctCmpKey) this.ctRunCompare(this.st.ctCmpKey);
      const rows = this.st.ctCmp.rows;
      const host = document.getElementById('csp-concept-code');
      const code = CMP_PY.map((line, k) => `<div class="csp-trace-line ${[4, 5, 6].includes(k + 1) ? 'is-active' : ''} ${line ? '' : 'is-blank'}"><span class="csp-trace-arrow">${[4, 5, 6].includes(k + 1) ? '→' : ''}</span><span class="csp-trace-no">${k + 1}</span><span class="csp-trace-src">${pyHTML(line)}</span></div>`).join('');
      if (host) host.innerHTML = `<div class="csp-trace-panel csp-trace-panel-code"><p class="csp-trace-panel-title">${CT_FILE} · measure()<span class="csp-trace-tag">Python</span></p><pre class="csp-trace-code">${code}</pre></div>`;
      const maxN = Math.max(...rows.map(r => r.nodes), 1);
      const bar = (v, max, log) => `<div class="csp-bar-cell"><span class="csp-bar" style="width:${Math.max(2, (log ? Math.log10(v + 1) / Math.log10(max + 1) : v / max) * 100)}%"></span><b>${typeof v === 'number' && !Number.isInteger(v) ? v.toFixed(v < 1 ? 3 : 2) : v.toLocaleString()}</b></div>`;
      const best = Math.min(...rows.filter(r => r.solved).map(r => r.nodes));
      const body = rows.map(r => `<tr class="${r.solved && r.nodes === best ? 'best' : ''}"><td><b>${r.name}</b></td><td>${r.solved ? '<span class="csp-pill ok">✓</span>' : r.limit ? '<span class="csp-pill warn">limit</span>' : '<span class="csp-pill bad">✗</span>'}</td><td>${bar(r.nodes, maxN, true)}</td><td class="mono">${r.bts == null ? '—' : r.bts.toLocaleString()}</td><td class="mono">${r.t < 1 ? r.t.toFixed(3) : r.t.toFixed(1)}</td></tr>`).join('');
      const opts = Object.entries(CMP_PROBLEMS).map(([k, v]) => `<option value="${k}" ${k === this.st.ctCmpKey ? 'selected' : ''}>${v.label}</option>`).join('');
      this.graphColEl.innerHTML = shell(
        'Compare search efficiency',
        `<select class="csp-select" id="csp-ct-cmp-p">${opts}</select><button class="csp-btn csp-btn-primary" id="csp-ct-cmp-run">▶ Re-run</button>`,
        `<div class="csp-trace csp-trace-side">
           <div class="csp-trace-note"><p class="csp-trace-note-title">${esc(CMP_PROBLEMS[this.st.ctCmpKey].label)}: basic vs. heuristic backtracking vs. min-conflicts</p></div>
           <div class="csp-table-wrap"><table class="csp-table csp-bench-table"><thead><tr><th>Solver</th><th>Solved</th><th>Nodes visited (log bar)</th><th>Backtracks</th><th>Time (ms)</th></tr></thead><tbody>${body}</tbody></table></div>
           <div class="csp-trace-explain"><div class="csp-trace-explain-title">How to read it</div><div class="csp-trace-explain-body"><b>Nodes visited</b> = calls to <code>backtrack()</code> (for min-conflicts: iterations of the repair loop). <b>Backtracks</b> = values undone after a failed recursive call. <b>Elapsed</b> is measured in this browser with <code>performance.now()</code> (averaged over 20 runs when a run takes under 5 ms). Heuristics cost a little more per node but visit far fewer nodes as problems get harder — compare Australia with 20-Queens.</div></div>
           <p class="csp-note">Run <code>python ${CT_FILE}</code> to print the same table from Python. Absolute times differ between Python and JavaScript; the node and backtrack counts follow the same algorithms.</p>
         </div>`
      );
      const rerun = () => { this.st.ctCmp = null; this.graphColEl.querySelector('.csp-ill-body').innerHTML = '<div class="csp-empty">Running solvers…</div>'; setTimeout(() => this.refresh(), 30); };
      this.on('csp-ct-cmp-p', 'change', e => { this.st.ctCmpKey = e.target.value; rerun(); });
      this.on('csp-ct-cmp-run', 'click', rerun);
    }


    /** Backtracking Search on the mini timetabling CSP (same engine, timetable view). */
    ill_bt_tt() {
      const easy = this.st.btEx === 'tte';
      const orders = easy
        ? { list: { label: 'Fixed: CS101, CS102, CS201, CS202', varOrder: 'static', order: TTE_ORDERS.list.order }, rev: { label: 'Fixed: CS202, CS201, CS102, CS101', varOrder: 'static', order: TTE_ORDERS.rev.order }, mrv: { label: 'MRV', varOrder: 'mrv', order: TTE.vars }, mrvdeg: { label: 'MRV + Degree', varOrder: 'mrv-degree', order: TTE.vars } }
        : { list: { label: 'Fixed: course list order', varOrder: 'static', order: TT.vars }, mrv: { label: 'MRV', varOrder: 'mrv', order: TT.vars }, mrvdeg: { label: 'MRV + Degree', varOrder: 'mrv-degree', order: TT.vars } };
      if (!orders[this.st.bttVar]) this.st.bttVar = 'list';
      const key = [this.st.btEx, this.st.bttVar, this.st.btVal, this.st.btInf].join('/');
      if (this._btKey !== key) {
        this._bt = E.backtrackingSearch(easy ? makeTTECSP() : makeTTCSP(), { varOrder: orders[this.st.bttVar].varOrder, staticOrder: orders[this.st.bttVar].order, valOrder: this.st.btVal, inference: this.st.btInf });
        this._btKey = key;
      }
      const steps = this._bt.steps;
      const i = Math.min(this.st.btStep, steps.length - 1), s = steps[i];
      const reject = s.kind === 'reject';
      const grid = easy
        ? tteStateHTML(s.assignment, { hl: s.var, tryVal: reject ? s.val : null, bad: reject, clashWith: reject ? s.conflictWith : null })
        : ttGridHTML(s.assignment, { hl: s.var, tryCourse: reject ? s.var : null, tryVal: reject ? s.val : null, bad: reject, clashWith: reject ? s.conflictWith : null });
      const whyTxt = !reject ? '' : easy ? `${s.var}–${s.conflictWith}: ${TTE.why[s.var + '|' + s.conflictWith]}` : TT_WHY[ttReason(s.var, s.val, s.conflictWith, s.assignment[s.conflictWith])];
      const log = steps.slice(Math.max(0, i - 5), i + 1).map((x, k, arr) => `<div class="csp-log-row ${k === arr.length - 1 ? 'cur' : ''} k-${x.kind}" style="padding-left:${0.4 + (x.depth || 0) * 0.55}rem">${x.msg}${x === s && whyTxt ? ` <b>(${whyTxt})</b>` : ''}</div>`).join('');
      const kindPill = { start: ['neutral', 'START'], select: ['info', 'SELECT'], reject: ['bad', 'REJECT'], assign: ['ok', 'ASSIGN'], infer: ['info', 'INFERENCE'], wipeout: ['bad', 'WIPE-OUT'], undo: ['warn', 'BACKTRACK'], deadend: ['warn', 'DEAD END'], solution: ['ok', 'SOLUTION'], failure: ['bad', 'FAILURE'] }[s.kind] || ['neutral', s.kind.toUpperCase()];
      const sel = (id, opts, val) => `<select class="csp-select" id="${id}">${opts.map(([k, l]) => `<option value="${k}" ${k === val ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
      const doms = this.st.btInf === 'none' ? (easy ? TTE.domains : TT.domains) : s.domains;
      const table = easy
        ? `<table class="csp-table csp-trace-table"><thead><tr><th>Course</th><th>Linked to</th><th>Domain</th><th>Assigned</th></tr></thead><tbody>${TTE.vars.map(v => `<tr class="${v === s.var ? 'best' : ''}"><td><b>${v}</b></td><td>${TTE.neighbors[v].join(', ')}</td><td class="mono">${doms[v].join(', ') || '∅'}</td><td class="mono">${s.assignment[v] || '—'}</td></tr>`).join('')}</tbody></table>`
        : ttCoursesHTML(s.assignment, s.var, doms);
      this.graphColEl.innerHTML = shell(
        easy ? 'BACKTRACKING-SEARCH on an easy timetable (4 courses, 3 slots)' : 'BACKTRACKING-SEARCH on a mini timetable',
        seg('csp-bt-ex', BT_EXAMPLES, this.st.btEx) +
        sel('csp-btt-var', Object.entries(orders).map(([k, v]) => [k, v.label]), this.st.bttVar) +
        sel('csp-bt-val', [['static', 'Values: slot order'], ['lcv', 'Values: LCV']], this.st.btVal) +
        sel('csp-bt-inf', [['none', 'No inference'], ['fc', 'Forward checking'], ['mac', 'MAC']], this.st.btInf) +
        `<button class="csp-btn" id="csp-bt-code" title="Step through the Python code of this algorithm"><i data-lucide="code-2"></i> Code trace</button>`,
        `<div class="csp-bt-tt">
           ${grid}
           <div class="csp-bt-tt-row">${table}<div class="csp-log">${log}</div></div>
         </div>
         <div class="csp-metric-row">
           <div class="csp-metric"><span>Assignments</span><b>${s.stats.assignments}</b></div>
           <div class="csp-metric ${s.stats.backtracks ? 'bad' : 'ok'}"><span>Backtracks</span><b>${s.stats.backtracks}</b></div>
           <div class="csp-metric"><span>Constraint checks</span><b>${s.stats.checks}</b></div>
           <div class="csp-metric"><span>Values pruned</span><b>${s.stats.pruned}</b></div>
         </div>`,
        `${stepperHTML('csp-bt', i, steps.length, !!this.timer)}
         <div class="csp-status-row"><span class="csp-pill ${kindPill[0]}">${kindPill[1]}</span><span class="csp-muted">Whole run: ${this._bt.stats.assignments} assignments · ${this._bt.stats.backtracks} backtracks</span></div>
         <p class="csp-note">${easy ? TTE_NOTE : TT_NOTE}</p>`
      );
      const reset = () => { this.clearTimer(); this.st.btStep = 0; this.refresh(); };
      this.bindSeg('csp-bt-ex', v => { this.clearTimer(); this.st.btEx = v; this.st.btStep = 0; this.refresh(); });
      this.on('csp-btt-var', 'change', e => { this.st.bttVar = e.target.value; reset(); });
      this.on('csp-bt-val', 'change', e => { this.st.btVal = e.target.value; reset(); });
      this.on('csp-bt-inf', 'change', e => { this.st.btInf = e.target.value; reset(); });
      this.on('csp-bt-code', 'click', () => { this.clearTimer(); this.st.ctBtEx = this.st.btEx; this.topicIdx = CSP_TOPICS.findIndex(t => t.id === 'code'); this.conceptIdx = 0; this.render(); });
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

    // =========================================================================
    // TOPIC 6 — SEARCH (T02) → ADVERSARIAL SEARCH (T03) → CSP (T04)
    // Same exploration of possibilities, different problem / state / solution.
    // =========================================================================

    /** Topic 02 route graph (same graph as demos/search_planning_demo/city_engine.js). */
    cityGraphSVG(opts) {
      const o = Object.assign({ W: 200, H: 150, path: [], focus: null }, opts || {});
      const G = CITY_GRAPH, P = CITY_LAYOUT;
      const X = v => 18 + P[v][0] * (o.W - 36), Y = v => 16 + P[v][1] * (o.H - 32);
      const onPath = (a, b) => { const i = o.path.indexOf(a); return i >= 0 && o.path[i + 1] === b; };
      let s = `<svg viewBox="0 0 ${o.W} ${o.H}" class="csp-sg-svg" role="img" aria-label="Route-finding graph">`;
      for (const a of Object.keys(G)) for (const { to, cost } of G[a]) {
        const hot = onPath(a, to);
        s += `<line x1="${X(a)}" y1="${Y(a)}" x2="${X(to)}" y2="${Y(to)}" class="csp-sg-edge ${hot ? 'hot' : ''}"></line>`;
        s += `<text x="${(X(a) + X(to)) / 2}" y="${(Y(a) + Y(to)) / 2 - 3}" class="csp-sg-cost ${hot ? 'hot' : ''}">${cost}</text>`;
      }
      for (const v of Object.keys(P)) {
        const cls = ['csp-sg-node', v === 'NYC' ? 'start' : '', v === 'LAX' ? 'goal' : '', o.path.includes(v) ? 'hot' : '', o.focus === v ? 'focus' : ''].join(' ');
        s += `<circle cx="${X(v)}" cy="${Y(v)}" r="13" class="${cls}"></circle><text x="${X(v)}" y="${Y(v) + 3}" class="csp-sg-label">${v}</text>`;
      }
      return s + '</svg>';
    }

    /** Two-ply MAX/MIN tree (AIMA Fig 5.2). values: back up minimax values; best: highlight a1; layers: side labels. */
    gameMiniSVG(opts) {
      const o = Object.assign({ W: 210, H: 150, values: false, best: false, layers: false }, opts || {});
      const off = o.layers ? 118 : 0, tw = o.W - off;
      const ys = [24, o.H * 0.5, o.H - 22];
      const root = [off + tw / 2, ys[0]];
      const mins = [1, 3, 5].map(k => [off + tw * k / 6, ys[1]]);
      const leaves = [[3, 12, 8], [2, 4, 6], [14, 5, 2]];
      const mv = [3, 2, 2];
      const gap = tw / 9.4;
      const tri = (x, y, up, cls) => { const r = 12, sg = up ? -1 : 1; return `<polygon points="${x},${y + sg * r * 1.1} ${x - r * 1.1},${y - sg * r * 0.9} ${x + r * 1.1},${y - sg * r * 0.9}" class="${cls}"></polygon>`; };
      let s = `<svg viewBox="0 0 ${o.W} ${o.H}" class="csp-sg-svg" role="img" aria-label="Two-ply MAX/MIN game tree">`;
      if (o.layers) {
        const lab = [['MAX to move', 'TO-MOVE(s) = MAX'], ['MIN to move', 'TO-MOVE(s) = MIN'], ['Terminal', 'UTILITY(s, MAX)']];
        lab.forEach(([a, b], i) => { s += `<rect x="4" y="${ys[i] - 15}" width="${off - 16}" height="30" rx="7" class="csp-gm-layer l${i}"></rect><text x="12" y="${ys[i] - 2}" class="csp-gm-layer-a">${a}</text><text x="12" y="${ys[i] + 10}" class="csp-gm-layer-b">${b}</text>`; });
      }
      mins.forEach(([x, y], i) => {
        const bestEdge = o.best && i === 0;
        s += `<line x1="${root[0]}" y1="${root[1] + 10}" x2="${x}" y2="${y - 12}" class="csp-gm-edge ${bestEdge ? 'best' : ''}"></line>`;
        s += `<text x="${(root[0] + x) / 2 + (i === 1 ? 8 : 0)}" y="${(root[1] + y) / 2 - 2}" class="csp-gm-act ${bestEdge ? 'best' : ''}">a<tspan baseline-shift="sub" font-size="7">${i + 1}</tspan></text>`;
        leaves[i].forEach((u, j) => {
          const lx = x + (j - 1) * gap;
          s += `<line x1="${x}" y1="${y + 10}" x2="${lx}" y2="${ys[2] - 9}" class="csp-gm-edge"></line><rect x="${lx - 10}" y="${ys[2] - 9}" width="20" height="17" rx="4" class="csp-gm-leaf"></rect><text x="${lx}" y="${ys[2] + 3}" class="csp-gm-leaf-t">${u}</text>`;
        });
      });
      s += tri(root[0], root[1], true, 'csp-gm-max') + `<text x="${root[0]}" y="${root[1] + 5}" class="csp-gm-t">${o.values ? '3' : 'A'}</text>`;
      mins.forEach(([x, y], i) => { s += tri(x, y, false, 'csp-gm-min') + `<text x="${x}" y="${y + 1}" class="csp-gm-t">${o.values ? mv[i] : 'BCD'[i]}</text>`; });
      return s + '</svg>';
    }

    ill_goal_compare() {
      const show = this.st.goalShow;
      const sol = { WA: 'red', NT: 'green', SA: 'blue', Q: 'red', NSW: 'green', V: 'red', T: 'red' };
      const cols = [
        { tag: 'Topic 02 · Search', q: 'How do I get from NYC to LAX?', goal: 'Find a <b>path</b> from the initial state to a goal state.',
          vis: this.cityGraphSVG({ path: show ? ['NYC', 'CHI', 'DEN', 'LAX'] : [] }),
          ans: 'NYC → CHI → DEN → LAX · cost 8' },
        { tag: 'Topic 03 · Games', q: 'Which move should MAX play if MIN plays well?', goal: 'Choose the <b>best action</b> while accounting for an opponent.',
          vis: this.gameMiniSVG({ values: show, best: show }),
          ans: 'Play a<sub>1</sub> · minimax value 3' },
        { tag: 'Topic 04 · CSP', q: 'Can every region get a colour so neighbours differ?', goal: 'Find an <b>assignment</b> that satisfies every constraint.',
          vis: `<div class="csp-map-wrap csp-g3-map">${mapSVG({ assignment: show ? sol : {} })}</div>`,
          ans: '7 regions coloured · 9 / 9 constraints ✓' }
      ];
      this.graphColEl.innerHTML = shell(
        'Three problems, three different goals',
        `<button class="csp-btn csp-btn-primary" id="csp-goal-toggle"><i data-lucide="${show ? 'eye-off' : 'eye'}"></i> ${show ? 'Hide the answer' : 'Show the answer'}</button>`,
        `<div class="csp-g3">${cols.map((c, i) => `
           <div class="csp-g3-col c${i}">
             <div class="csp-g3-tag">${c.tag}</div>
             <div class="csp-g3-q">“${c.q}”</div>
             <div class="csp-g3-vis">${c.vis}</div>
             <div class="csp-g3-goal">${c.goal}</div>
             <div class="csp-g3-ans ${show ? 'on' : ''}">${show ? c.ans : '?'}</div>
           </div>`).join('<div class="csp-g3-arrow" aria-hidden="true">→</div>')}
         </div>`,
        `<p class="csp-note">All three <b>explore a space of possibilities</b> — routes, move sequences, colourings — but each is looking for a different kind of answer.</p>`
      );
      this.on('csp-goal-toggle', 'click', () => { this.st.goalShow = !this.st.goalShow; this.refresh(); });
    }

    ill_state_repr() {
      const sel = this.st.reprSel;
      const partial = { WA: 'red', NT: 'green' };
      const legal = this.legalValues(partial);
      let main = '', caption = '';
      if (sel === 'search') {
        const box = (x, y, w, label, cls) => `<rect x="${x}" y="${y}" width="${w}" height="40" rx="9" class="csp-sr-box ${cls || ''}"></rect><text x="${x + w / 2}" y="${y + 25}" class="csp-sr-box-t ${cls || ''}">${label}</text>`;
        const arrow = (x1, y1, x2, y2, t, dy) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="csp-sr-arrow" marker-end="url(#csp-sr-head)"></line><text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 + (dy || -6)}" class="csp-sr-act">${t}</text>`;
        main = `<svg viewBox="0 0 520 190" class="csp-sg-svg csp-sr-svg" role="img" aria-label="Atomic state with successors">
          <defs><marker id="csp-sr-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" class="csp-sr-headp"></path></marker></defs>
          ${box(14, 75, 76, 'CHI')}
          ${arrow(92, 95, 186, 95, 'go(ATL) · cost 4')}
          <rect x="190" y="58" width="130" height="74" rx="12" class="csp-sr-box atomic"></rect>
          <text x="255" y="88" class="csp-sr-box-t big">ATL</text>
          <text x="255" y="112" class="csp-sr-note">one indivisible state</text>
          ${arrow(322, 82, 414, 40, 'go(LAX) · 1', -8)}
          ${arrow(322, 108, 414, 150, 'go(SEA) · 2', 16)}
          ${box(418, 18, 88, 'LAX', 'goal')}
          ${box(418, 132, 88, 'SEA')}
          <text x="462" y="72" class="csp-sr-note">GOAL-TEST ✓</text>
        </svg>`;
        caption = 'The algorithm can only ask two things about ATL: <b>GOAL-TEST(ATL)?</b> and <b>ACTIONS(ATL)</b>. Successors come from actions, and path cost adds up along the way.';
      } else if (sel === 'game') {
        main = this.gameMiniSVG({ W: 520, H: 200, layers: true, values: false });
        caption = 'Each node is a position <b>plus whose turn it is</b>. Levels alternate MAX, MIN, MAX … and only terminal positions have a <b>UTILITY</b>. Values are backed up from the leaves.';
      } else {
        const rows = AUS.variables.map(v => `<tr class="${partial[v] ? 'set' : ''} ${!partial[v] && legal[v].length === 1 ? 'tight' : ''}"><th>${v}</th><td>${partial[v] ? colorDot(partial[v]) + ' ' + partial[v] : '—'}</td><td>${domainDots(partial[v] ? [partial[v]] : legal[v])}</td></tr>`).join('');
        main = `<div class="csp-duo csp-sr-duo">
          <div class="csp-duo-cell"><div class="csp-duo-label">Constraint graph (adjacent ≠)</div>${ausGraph({ assignment: partial, highlight: ['SA'] })}</div>
          <div class="csp-duo-cell"><div class="csp-duo-label">Inside the state</div><div class="csp-table-wrap"><table class="csp-table csp-sr-vars"><thead><tr><th>X<sub>i</sub></th><th>value</th><th>D<sub>i</sub> left</th></tr></thead><tbody>${rows}</tbody></table></div></div>
        </div>`;
        caption = 'The state is <b>factored</b>: {WA = red, NT = green}. Constraints show SA has only blue left. A successor assigns <b>one more variable</b>, e.g. SA = blue.';
      }
      const strips = [
        ['search', 'Search', `<span class="csp-an-cell whole">ATL</span>`, 'the whole state, no parts'],
        ['game', 'Game', `<span class="csp-an-cell">position</span><span class="csp-an-cell turn">TO-MOVE = MIN</span><span class="csp-an-cell util">UTILITY at terminals</span>`, 'state + turn + utility'],
        ['csp', 'CSP', AUS.variables.map(v => `<span class="csp-an-cell var ${partial[v] ? 'set' : ''}">${v}${partial[v] ? ' = ' + colorDot(partial[v]) : ' = ?'}</span>`).join('') + `<span class="csp-an-cell con">C: adjacent ≠</span>`, 'variables + values + constraints']
      ];
      this.graphColEl.innerHTML = shell(
        'What one state looks like',
        seg('csp-sr-seg', [['search', 'Search'], ['game', 'Game'], ['csp', 'CSP']], sel),
        `<div class="csp-sr-main">${main}</div>
         <div class="csp-status-row"><span class="csp-pill info">${{ search: 'ATOMIC', game: 'STATE + TURN', csp: 'FACTORED' }[sel]}</span><span class="csp-msg">${caption}</span></div>
         <div class="csp-an">${strips.map(([k, l, cells, sub]) => `<button class="csp-an-row ${k === sel ? 'sel' : ''}" data-view="${k}"><span class="csp-an-l"><b>${l}</b><em>${sub}</em></span><span class="csp-an-cells">${cells}</span></button>`).join('')}</div>`,
        ''
      );
      this.bindSeg('csp-sr-seg', v => { this.st.reprSel = v; this.refresh(); });
      this.graphColEl.querySelectorAll('.csp-an-row').forEach(b => b.addEventListener('click', () => { this.st.reprSel = b.getAttribute('data-view'); this.refresh(); }));
    }

    ill_solution_type() {
      const sol = { WA: 'red', NT: 'green', SA: 'blue', Q: 'red', NSW: 'green', V: 'red', T: 'red' };
      const nOk = E.makeMapCSP(AUS, 3).edges().length - E.makeMapCSP(AUS, 3).conflictedEdges(sol).length;
      const pathChips = [['NYC', ''], ['CHI', 3], ['DEN', 2], ['LAX', 3]].map(([c, k], i) => `${i ? `<span class="csp-st-arrow">→<em>${k}</em></span>` : ''}<span class="csp-st-chip">${c}</span>`).join('');
      const cards = [
        { tag: 'Topic 02 · Search', kind: 'A path', vis: this.cityGraphSVG({ path: ['NYC', 'CHI', 'DEN', 'LAX'] }), ans: `<div class="csp-st-path">${pathChips}</div><div class="csp-muted">cost 3 + 2 + 3 = 8</div>` },
        { tag: 'Topic 03 · Games', kind: 'A strategy / best move', vis: this.gameMiniSVG({ values: true, best: true }), ans: `<div class="csp-st-path"><span class="csp-st-chip best">play a<sub>1</sub></span></div><div class="csp-muted">guarantees ≥ 3 whatever MIN replies</div>` },
        { tag: 'Topic 04 · CSP', kind: 'A consistent assignment', vis: `<div class="csp-map-wrap csp-g3-map">${mapSVG({ assignment: sol })}</div>`, ans: `<div class="csp-st-path csp-st-wrap">${AUS.variables.map(v => `<span class="csp-st-chip sm">${v} ${colorDot(sol[v])}</span>`).join('')}</div><div class="csp-muted">${nOk} / 9 constraints satisfied ✓</div>` }
      ];
      const rows = [
        ['Does step order matter?', '<span class="csp-t-ok">Yes</span> — the path is the answer', '<span class="csp-t-ok">Yes</span> — turns alternate', '<span class="csp-t-bad">No</span> — only the final assignment counts'],
        ['Opponent?', 'No', '<span class="csp-t-ok">Yes</span> — MIN', 'No'],
        ['Quality measure', 'path cost Σ c (lower is better)', 'utility / minimax value', 'none — every solution is equally good (a COP adds costs)']
      ];
      this.graphColEl.innerHTML = shell(
        'From a path, to a strategy, to an assignment',
        '',
        `<div class="csp-g3 csp-st">${cards.map((c, i) => `
           <div class="csp-g3-col c${i}">
             <div class="csp-g3-tag">${c.tag}</div>
             <div class="csp-st-kind">${c.kind}</div>
             <div class="csp-g3-vis">${c.vis}</div>
             <div class="csp-st-ans">${c.ans}</div>
           </div>`).join('<div class="csp-g3-arrow" aria-hidden="true">→</div>')}
         </div>
         <div class="csp-table-wrap"><table class="csp-table csp-st-table">
           <thead><tr><th></th><th>Search</th><th>Games</th><th>CSP</th></tr></thead>
           <tbody>${rows.map(r => `<tr><th>${r[0]}</th>${r.slice(1).map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
         </table></div>`,
        ''
      );
    }

    ill_transition_grid() {
      const step = this.st.tgStep;
      const icon = {
        search: '<svg viewBox="0 0 40 24" class="csp-tg-ico"><circle cx="5" cy="12" r="4"></circle><circle cx="20" cy="6" r="4"></circle><circle cx="35" cy="14" r="4" class="g"></circle><path d="M9 11 L16 7 M24 7 L31 12"></path></svg>',
        game: '<svg viewBox="0 0 40 24" class="csp-tg-ico"><polygon points="20,2 25,10 15,10" class="mx"></polygon><polygon points="9,21 14,13 4,13" class="mn"></polygon><polygon points="31,21 36,13 26,13" class="mn"></polygon><path d="M18 10 L11 13 M22 10 L29 13"></path></svg>',
        csp: '<svg viewBox="0 0 40 24" class="csp-tg-ico"><rect x="2" y="4" width="10" height="16" rx="2" class="r"></rect><rect x="15" y="4" width="10" height="16" rx="2" class="gr"></rect><rect x="28" y="4" width="10" height="16" rx="2" class="b"></rect></svg>'
      };
      const rows = [
        ['Type of problem', ['Reach a goal', 'Beat an opponent', 'Satisfy all constraints'], ['find a path from the initial state to a goal', 'choose the best action, assuming MIN plays well', 'give every variable a value that breaks no rule']],
        ['State representation', ['Atomic state', 'State + turn + utility', 'Factored state'], ['a state is a whole; successors come from ACTIONS(s)', 'alternating MAX / MIN game tree; UTILITY at terminals', 'variables = values; constraints say what may combine']],
        ['Solution', ['A path', 'A strategy / best move', 'A consistent assignment'], ['S<sub>0</sub> → … → goal, measured by path cost', 'the move to make now (minimax value)', 'complete ∧ consistent — the order is irrelevant']]
      ];
      const head = ['Topic 02 · Search', 'Topic 03 · Adversarial search', 'Topic 04 · CSP'];
      const keys = ['search', 'game', 'csp'];
      const say = [
        'What stays the same: every topic explores a space of possibilities.',
        'What changes first: the kind of problem being solved.',
        'Then: how a state is represented — from a whole state, to a state with a turn, to a factored state.',
        'And so the answer changes: a path → a strategy / best move → a consistent assignment.',
        'Transition to CSP algorithms: same exploration, new problem, new state representation, new definition of a solution.'
      ][step];
      this.graphColEl.innerHTML = shell(
        'Same exploration, different problem',
        '',
        `<div class="csp-tg">
           <div class="csp-tg-row csp-tg-head"><div></div>${head.map((h, i) => `<div class="csp-tg-h">${icon[keys[i]]}<span>${h}</span></div>`).join('')}</div>
           <div class="csp-tg-row csp-tg-common ${step === 0 ? 'cur' : ''}"><div class="csp-tg-l">Stays the same</div><div class="csp-tg-span"><i data-lucide="git-branch"></i> Explore a space of possibilities: start somewhere, generate successors, order or prune them, stop when the answer is found.</div></div>
           ${rows.map(([label, big, small], r) => `<div class="csp-tg-row ${step >= r + 1 ? 'on' : 'off'} ${step === r + 1 ? 'cur' : ''}"><div class="csp-tg-l">${label}</div>${big.map((b, i) => `<div class="csp-tg-cell c${i}">${step >= r + 1 ? `<b>${b}</b><span>${small[i]}</span>` : '<span class="csp-tg-q">?</span>'}</div>`).join('')}</div>`).join('')}
           <div class="csp-tg-key ${step >= 4 ? 'on' : ''}"><i data-lucide="flag"></i><div>We are still <b>searching through possibilities</b> — but the <b>type of problem</b>, the <b>representation of the state space</b> and the <b>definition of a solution</b> have changed.</div></div>
         </div>`,
        `${stepperHTML('csp-tg', step, 5, !!this.timer)}
         <div class="csp-status-row"><span class="csp-pill ${step === 4 ? 'ok' : 'info'}">${step === 0 ? 'SAME' : step === 4 ? 'KEY IDEA' : 'CHANGES'}</span><span class="csp-msg">${say}</span></div>`
      );
      this.bindStepper('csp-tg', 'tgStep', 5, 1800);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    window.cspUI = new CSPLectureUI();
  });
})();
