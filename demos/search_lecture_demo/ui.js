/**
 * Search & Planning — Lecture Page Controller
 *
 * Built from instructions/search_lecture.md. The page has a simple 4-topic
 * selector bar (NOT the 9-step flow-progress-bar used on Problem
 * Formulation): Search Terminology | Search Data Structures |
 * Search Strategies | Evaluating Search. Below it, a two-column area:
 * Concept column (50%, left) and Illustration column (50%, right).
 *
 * Only "Search Terminology" is implemented so far. Per the spec: "Do not
 * create separate pages or subtopics for each term" — so all terms live on
 * one topic screen, picked with an in-place Concept Selector bar (shown
 * inside the concept column, above Definition/Formula/Teaching Tip, per
 * the doc's own ASCII layout diagram) rather than by navigating anywhere.
 * The doc's table was consolidated from an earlier 14-row version down to
 * 7 broader concepts (e.g. State/Initial State/Goal State merged into one
 * "State: Initial -> Goal" row) so each selector tab covers more ground;
 * with 7 concepts, the selector wraps into two balanced rows (4 + 3) per
 * the doc's "two or three balanced rows" rule, instead of shrinking the
 * chip font or overcrowding one row.
 *
 * Selecting a term updates the Illustration column to a fixed-graph
 * snapshot matching that term's "Illustration Note". Per the doc, every
 * term shows the state-space graph AND a small search-tree diagram side
 * by side — the tree is derived straight from that term's own
 * edgeClasses, so its highlights always match the graph by construction.
 * One term (Tree-Like vs. Graph Search) needs to show the *same* graph
 * next to TWO trees (tree-like keeps a repeated state, graph search
 * prunes it) — that term sets `secondTree`, which renders a third
 * diagram block reusing the same edgeClasses/nodeStates but with its own
 * treePruned list, so the two trees can never disagree with the graph or
 * with each other's shared data.
 *
 * Search Data Structures (4 concepts: Node Structure, Frontier Operations,
 * Frontier Types, Putting It Together) is also implemented. Its selector
 * has only 4 chips, so it stays a single row (the shared
 * renderConceptSelectorHTML helper switches to two rows only above 6
 * chips). Its four concepts don't share one illustration shape the way
 * Search Terminology's do, so each term carries a `kind` that picks its
 * renderer: 'nodecard' (graph + tree + a 4-field node card), 'frontierops'
 * (graph + a frontier container + a static operation log), 'frontiertypes'
 * (three side-by-side queue panels, no graph), and 'stepper' (BFS/UCS
 * pseudocode with a step cursor, synced to the graph and a
 * frontier/reached/order readout). The BFS and UCS traces are precomputed,
 * cumulative step arrays (SDS_BFS_STEPS / SDS_UCS_STEPS) independently
 * verified with a standalone Python simulation (deque for BFS, heapq for
 * UCS) rather than computed live, so the stepper can't silently drift from
 * a textbook-correct trace.
 *
 * Search Strategies and Evaluating Search remain placeholders until their
 * content is implemented.
 *
 * Fixed graph: same A-H weighted network as the Route-Finding Visualizer
 * (search.md), Start = A, Goal = G, kept as an independent copy so this
 * page never loads the running demo's code.
 */

const SL_GRAPH = {
  A: [{ to: 'B', cost: 3 }, { to: 'C', cost: 2 }, { to: 'E', cost: 9 }],
  B: [{ to: 'D', cost: 2 }, { to: 'E', cost: 4 }],
  C: [{ to: 'E', cost: 6 }, { to: 'F', cost: 9 }],
  D: [{ to: 'G', cost: 3 }],
  E: [{ to: 'G', cost: 1 }, { to: 'H', cost: 2 }],
  F: [{ to: 'H', cost: 1 }],
  G: [{ to: 'H', cost: 5 }],
  H: []
};

const SL_NODE_LAYOUT = {
  A: { x: 0.10, y: 0.50 },
  B: { x: 0.35, y: 0.25 },
  C: { x: 0.35, y: 0.75 },
  E: { x: 0.50, y: 0.50 },
  D: { x: 0.65, y: 0.25 },
  F: { x: 0.65, y: 0.75 },
  G: { x: 0.88, y: 0.35 },
  H: { x: 0.88, y: 0.65 }
};

const SL_START = 'A';
const SL_GOAL = 'G';

// ---- Search Terminology (instructions/search_lecture.md table) ----
// 7 consolidated concepts. Each term's snapshot is a fixed illustration on
// SL_GRAPH matching that row's "Illustration Note" — a static picture,
// never a running search.
const SL_TERMS = [
  {
    key: 'searchtree', name: 'Search Tree',
    definition: 'The tree built as search explores the state-space graph.',
    formula: 'search tree &ne; state-space graph',
    tip: 'The same state can appear in more than one search-tree node.',
    note: 'Left: the state-space graph with both explored paths to E highlighted. Right: the corresponding search tree — E appears as two separate nodes, one per path, even though it is one state.',
    showTree: true,
    nodeStates: {
      A: { cls: ['sl-explored'] }, B: { cls: ['sl-explored'] }, C: { cls: ['sl-explored'] },
      E: { cls: ['sl-dup'], badge: '×2' }
    },
    edgeClasses: { 'A-B': 'sl-gedge-highlight', 'A-C': 'sl-gedge-highlight', 'B-E': 'sl-gedge-dup', 'C-E': 'sl-gedge-dup' }
  },
  {
    key: 'stateinitialgoal', name: 'State: Initial → Goal',
    definition: 'A state represents a possible situation; search starts at the initial state and seeks a goal state.',
    formula: 's &isin; S &middot; problem.INITIAL &middot; IS-GOAL(problem, s)',
    tip: 'Think: where can I be? Where do I start? Where do I want to reach?',
    note: 'Left: the initial state, an intermediate state, and the goal state, each identified. Right: the same path in the search tree — the initial state is the root, and the goal is the tree node that first passes the goal test.',
    showTree: true,
    nodeStates: {
      A: { cls: ['sl-current', 'sl-start'], sublabel: 'initial' },
      E: { cls: ['sl-frontier'], sublabel: 'intermediate' },
      G: { cls: ['sl-current', 'sl-goal'], sublabel: 'goal' }
    },
    edgeClasses: { 'A-E': 'sl-gedge-highlight', 'E-G': 'sl-gedge-highlight' }
  },
  {
    key: 'expansionchild', name: 'Expansion: Successor & Child Node',
    definition: 'Expanding a node applies available actions to produce successor states and corresponding child nodes.',
    formula: 'EXPAND(node) &middot; RESULT(s,a)=s&prime; &middot; CHILD-NODE(...)',
    tip: 'Successor is a state; child is the search-tree node for that state. After expanding A: frontier = {B, C, E}.',
    note: 'Left: expanding A highlights all its successor states. Right: the matching search tree — each successor becomes one child node of A.',
    showTree: true,
    nodeStates: {
      A: { cls: ['sl-current'], sublabel: 'expanded' }, B: { cls: ['sl-frontier'] },
      C: { cls: ['sl-frontier'] }, E: { cls: ['sl-frontier'] }
    },
    edgeClasses: { 'A-B': 'sl-gedge-highlight', 'A-C': 'sl-gedge-highlight', 'A-E': 'sl-gedge-highlight' }
  },
  {
    key: 'reachedexpandedfrontier', name: 'Reached, Expanded & Frontier',
    definition: 'Reached states have been discovered; expanded nodes have generated their children; frontier nodes are reached but still waiting to be expanded.',
    formula: 'reached = {A, B, C, E} &middot; expanded = {A} &middot; frontier = {B, C, E}',
    tip: 'Reached does not mean expanded. Frontier nodes have been reached but are still waiting.',
    note: 'Left: one search snapshot — A expanded (dark), B/C/E reached and waiting in the frontier (light), D/F/G/H not yet reached (gray). Right: the same snapshot in the search tree.',
    showTree: true,
    nodeStates: {
      A: { cls: ['sl-explored'], sublabel: 'expanded' },
      B: { cls: ['sl-frontier'], sublabel: 'frontier' },
      C: { cls: ['sl-frontier'], sublabel: 'frontier' },
      E: { cls: ['sl-frontier'], sublabel: 'frontier' }
    },
    edgeClasses: { 'A-B': 'sl-gedge-highlight', 'A-C': 'sl-gedge-highlight', 'A-E': 'sl-gedge-highlight' }
  },
  {
    key: 'expansionorder', name: 'Expansion Order',
    definition: 'The order in which nodes are selected and expanded.',
    formula: 'n&#8321; &rarr; n&#8322; &rarr; n&#8323; &rarr; ...',
    tip: 'A &rarr; B &rarr; C means A was expanded first, then B, then C.',
    note: 'Numbered badges 1, 2, 3, ... placed on the same nodes in both the graph and the search tree to show their expansion order.',
    showTree: true,
    nodeStates: {
      A: { cls: ['sl-explored'], badge: '1' }, B: { cls: ['sl-explored'], badge: '2' },
      C: { cls: ['sl-explored'], badge: '3' }, E: { cls: ['sl-current'], badge: '4' }
    },
    edgeClasses: { 'A-B': 'sl-gedge-highlight', 'A-C': 'sl-gedge-highlight', 'B-E': 'sl-gedge-highlight' }
  },
  {
    key: 'redundantpath', name: 'Redundant Path',
    definition: 'A different path that reaches a state already reached.',
    formula: 'node.STATE &isin; reached',
    tip: 'Different paths can lead to the same state.',
    note: 'Two different paths — A&rarr;B&rarr;E and A&rarr;C&rarr;E — both reach state E; the second (amber, dashed) is the redundant path. The search tree shows why it matters: E becomes two separate tree nodes for one state.',
    showTree: true,
    nodeStates: {
      A: { cls: ['sl-explored'] },
      B: { cls: ['sl-explored'], sublabel: 'path 1' },
      C: { cls: ['sl-frontier'], sublabel: 'path 2' },
      E: { cls: ['sl-dup'], sublabel: 'reached twice' }
    },
    edgeClasses: { 'A-B': 'sl-gedge-highlight', 'B-E': 'sl-gedge-highlight', 'A-C': 'sl-gedge-dup', 'C-E': 'sl-gedge-dup' }
  },
  {
    key: 'treelikegraphsearch', name: 'Tree-Like vs. Graph Search',
    definition: 'Tree-like search can revisit states; graph search uses reached to detect repeated states.',
    formula: 'Tree-like: frontier only &middot; Graph: reached[state] = node',
    tip: 'The key difference is whether previously reached states are remembered.',
    note: 'Left: the same redundant path as before — both A→B→E and A→C→E are explored. Middle: tree-like search keeps E as two separate, equally real tree nodes. Right: graph search checks reached, detects the second path, and prunes it before it becomes a node.',
    showTree: true,
    treeCaption: 'Tree-Like Search',
    secondTree: { caption: 'Graph Search', treePruned: ['C-E'] },
    nodeStates: {
      A: { cls: ['sl-explored'] },
      B: { cls: ['sl-explored'], sublabel: 'path 1' },
      C: { cls: ['sl-explored'], sublabel: 'path 2' },
      E: { cls: ['sl-dup'], badge: '×2', sublabel: 'reached twice' }
    },
    edgeClasses: { 'A-B': 'sl-gedge-highlight', 'A-C': 'sl-gedge-highlight', 'B-E': 'sl-gedge-highlight', 'C-E': 'sl-gedge-highlight' }
  }
];

// ---- Search Data Structures (instructions/search_lecture.md table) ----
// 4 concepts. Unlike Search Terminology, these don't share one
// illustration shape, so each term carries a `kind` that its graph-column
// renderer switches on.
const SDS_TERMS = [
  {
    key: 'nodestructure', name: 'Node Structure', kind: 'nodecard',
    definition: 'A search-tree node bundles four fields: the state it represents, its parent node, the action that produced it, and its path cost.',
    formula: 'node.STATE &middot; node.PARENT &middot; node.ACTION &middot; node.PATH-COST = g(node)',
    tip: 'Show actual values, e.g., STATE = C, PARENT = A, ACTION = Go(C), PATH-COST = 2.',
    note: 'Left: the graph with parent A connected to child C by action Go(C). Middle: the search tree with node C highlighted. Right: C’s four fields.',
    nodeStates: {
      A: { cls: ['sl-explored'], sublabel: 'parent' },
      C: { cls: ['sl-current'], sublabel: 'child' }
    },
    edgeClasses: { 'A-C': 'sl-gedge-highlight' },
    nodeCard: [
      { key: 'STATE', val: 'C' },
      { key: 'PARENT', val: 'A' },
      { key: 'ACTION', val: 'Go(C)' },
      { key: 'PATH-COST', val: 'g(C) = 2' }
    ]
  },
  {
    key: 'frontierops', name: 'Frontier Operations', kind: 'frontierops',
    definition: 'The frontier supports four operations: IS-EMPTY, TOP and POP to select and remove the next node, and ADD to insert a newly generated node.',
    formula: 'IS-EMPTY(frontier) &middot; TOP(frontier) &middot; POP(frontier) &middot; ADD(node, frontier)',
    tip: 'Click Run/Prev/Next, click a logged operation, or click node B or D on the graph to jump straight to that point in the run.',
    note: 'A expanded, with B, C, E waiting in the frontier. Run each operation in sequence — POP dequeues B, then ADD(D, frontier) inserts D (B’s child) — and watch the frontier container and the graph update together.'
  },
  {
    key: 'frontiertypes', name: 'Frontier Types', kind: 'frontiertypes',
    definition: 'The frontier can be implemented as a FIFO queue (breadth-first), a LIFO stack (depth-first), or a priority queue (best-first / uniform-cost) — the choice determines which node is selected next.',
    formula: 'FIFO Queue &middot; LIFO Queue &middot; Priority Queue (ordered by g(node))',
    tip: 'Same three nodes, three different "next" choices: oldest in, newest in, or cheapest.',
    note: 'The same frontier {B, C, E} shown as three different structures — the highlighted node is whichever one that structure selects next.',
    frontierTypes: [
      { label: 'FIFO Queue', sub: 'breadth-first', order: ['B', 'C', 'E'], popIdx: 0, popNote: 'oldest in, first out' },
      { label: 'LIFO Queue', sub: 'depth-first', order: ['B', 'C', 'E'], popIdx: 2, popNote: 'newest in, first out' },
      { label: 'Priority Queue', sub: 'uniform-cost', order: ['B', 'C', 'E'], popIdx: 1, popNote: 'lowest cost first', showCost: true, costs: { B: 3, C: 2, E: 9 } }
    ]
  },
  {
    key: 'puttingtogether', name: 'Putting It Together', kind: 'stepper',
    definition: 'A search algorithm repeats one loop: pop the next node from the frontier, test whether it is the goal, otherwise expand it and add its children to the frontier.',
    formula: 'loop: POP &rarr; GOAL-TEST &rarr; EXPAND &rarr; ADD / UPDATE',
    tip: 'BFS and UCS run the exact same loop — only the frontier’s ordering (FIFO vs. priority-by-cost) differs.',
    note: 'Step through breadth-first search or uniform-cost search on the same graph — the pseudocode cursor, the graph, and the frontier/reached readout all move together. Click Prev/Next, click a line of pseudocode to advance, or click any highlighted node to jump straight to the step where it was expanded.'
  }
];

// Frontier Operations: a small precomputed, cumulative run of the four
// frontier operations against the SL_GRAPH state used elsewhere on this
// page. Step 0 is the setup (A already expanded, frontier = {B, C, E});
// each later step is one operation's outcome. IS-EMPTY and TOP only peek
// (frontier unchanged); POP dequeues B (its "expanded" class stands in
// for "no longer in the frontier"); ADD(D, frontier) then inserts D — the
// child B would have produced by being expanded — so the sequence reads
// as one coherent mini-run, not four disconnected examples.
const SDS_FRONTIER_OPS_STEPS = [
  { op: null, label: 'Initial frontier', result: 'frontier = {B, C, E}', frontier: ['B', 'C', 'E'], changedNode: null,
    nodeStates: {
      A: { cls: ['sl-explored'], sublabel: 'expanded' },
      B: { cls: ['sl-frontier'] }, C: { cls: ['sl-frontier'] }, E: { cls: ['sl-frontier'] }
    },
    edges: { 'A-B': 'sl-gedge-highlight', 'A-C': 'sl-gedge-highlight', 'A-E': 'sl-gedge-highlight' } },
  { op: 'IS-EMPTY(frontier)', label: 'IS-EMPTY(frontier)', result: 'false', frontier: ['B', 'C', 'E'], changedNode: null,
    nodeStates: {
      A: { cls: ['sl-explored'], sublabel: 'expanded' },
      B: { cls: ['sl-frontier'] }, C: { cls: ['sl-frontier'] }, E: { cls: ['sl-frontier'] }
    },
    edges: { 'A-B': 'sl-gedge-highlight', 'A-C': 'sl-gedge-highlight', 'A-E': 'sl-gedge-highlight' } },
  { op: 'TOP(frontier)', label: 'TOP(frontier)', result: 'B', frontier: ['B', 'C', 'E'], changedNode: 'B',
    nodeStates: {
      A: { cls: ['sl-explored'], sublabel: 'expanded' },
      B: { cls: ['sl-frontier'], sublabel: 'next' }, C: { cls: ['sl-frontier'] }, E: { cls: ['sl-frontier'] }
    },
    edges: { 'A-B': 'sl-gedge-highlight', 'A-C': 'sl-gedge-highlight', 'A-E': 'sl-gedge-highlight' } },
  { op: 'POP(frontier)', label: 'POP(frontier)', result: 'B &nbsp;&rarr;&nbsp; frontier = {C, E}', frontier: ['C', 'E'], changedNode: 'B',
    nodeStates: {
      A: { cls: ['sl-explored'], sublabel: 'expanded' },
      B: { cls: ['sl-explored'], sublabel: 'popped' }, C: { cls: ['sl-frontier'] }, E: { cls: ['sl-frontier'] }
    },
    edges: { 'A-B': 'sl-gedge-highlight', 'A-C': 'sl-gedge-highlight', 'A-E': 'sl-gedge-highlight' } },
  { op: 'ADD(D, frontier)', label: 'ADD(D, frontier)', result: 'frontier = {C, E, D}', frontier: ['C', 'E', 'D'], changedNode: 'D',
    nodeStates: {
      A: { cls: ['sl-explored'], sublabel: 'expanded' },
      B: { cls: ['sl-explored'], sublabel: 'popped' }, C: { cls: ['sl-frontier'] }, E: { cls: ['sl-frontier'] },
      D: { cls: ['sl-frontier'], sublabel: 'added' }
    },
    edges: { 'A-B': 'sl-gedge-highlight', 'A-C': 'sl-gedge-highlight', 'A-E': 'sl-gedge-highlight', 'B-D': 'sl-gedge-highlight' } }
];

// Generic best-first-search pseudocode (BFS = FIFO frontier, UCS =
// priority-by-cost frontier; both are the same loop). `active` on a step
// lists which line indices light up for that step.
const SDS_PSEUDOCODE = [
  'function BEST-FIRST-SEARCH(problem) returns a solution node or failure',
  '&nbsp;&nbsp;node &larr; NODE(problem.INITIAL)',
  '&nbsp;&nbsp;frontier &larr; a queue containing node',
  '&nbsp;&nbsp;reached &larr; {problem.INITIAL: node}',
  '&nbsp;&nbsp;while not IS-EMPTY(frontier) do',
  '&nbsp;&nbsp;&nbsp;&nbsp;node &larr; POP(frontier)',
  '&nbsp;&nbsp;&nbsp;&nbsp;if IS-GOAL(problem, node.STATE) then return node',
  '&nbsp;&nbsp;&nbsp;&nbsp;for each child in EXPAND(node) do',
  '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;if child.STATE not in reached or',
  '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;child.PATH-COST &lt; reached[child.STATE].PATH-COST then',
  '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;reached[child.STATE] &larr; child; ADD(child, frontier)'
];

// Precomputed BFS trace over SL_GRAPH (FIFO frontier, "reached" set blocks
// duplicates), independently verified with Python's collections.deque:
// expansion order A, B, C, E, D, F, G. Each step is a full CUMULATIVE
// snapshot (nodeStates/edges/frontier/reached/order only ever grow) so the
// graph always shows everything explored so far, not just this step's delta.
const SDS_BFS_STEPS = [
  { current: 'A', order: ['A'], frontier: ['B', 'C', 'E'], reached: ['A', 'B', 'C', 'E'],
    edges: { 'A-B': 'sl-gedge-highlight', 'A-C': 'sl-gedge-highlight', 'A-E': 'sl-gedge-highlight' },
    isGoal: false, active: [5, 7, 8, 9, 10] },
  { current: 'B', order: ['A', 'B'], frontier: ['C', 'E', 'D'], reached: ['A', 'B', 'C', 'E', 'D'],
    edges: { 'A-B': 'sl-gedge-highlight', 'A-C': 'sl-gedge-highlight', 'A-E': 'sl-gedge-highlight', 'B-D': 'sl-gedge-highlight' },
    isGoal: false, active: [5, 7, 8, 9, 10] },
  { current: 'C', order: ['A', 'B', 'C'], frontier: ['E', 'D', 'F'], reached: ['A', 'B', 'C', 'E', 'D', 'F'],
    edges: { 'A-B': 'sl-gedge-highlight', 'A-C': 'sl-gedge-highlight', 'A-E': 'sl-gedge-highlight', 'B-D': 'sl-gedge-highlight', 'C-F': 'sl-gedge-highlight' },
    isGoal: false, active: [5, 7, 8, 9, 10] },
  { current: 'E', order: ['A', 'B', 'C', 'E'], frontier: ['D', 'F', 'G', 'H'], reached: ['A', 'B', 'C', 'E', 'D', 'F', 'G', 'H'],
    edges: { 'A-B': 'sl-gedge-highlight', 'A-C': 'sl-gedge-highlight', 'A-E': 'sl-gedge-highlight', 'B-D': 'sl-gedge-highlight', 'C-F': 'sl-gedge-highlight', 'E-G': 'sl-gedge-highlight', 'E-H': 'sl-gedge-highlight' },
    isGoal: false, active: [5, 7, 8, 9, 10] },
  { current: 'D', order: ['A', 'B', 'C', 'E', 'D'], frontier: ['F', 'G', 'H'], reached: ['A', 'B', 'C', 'E', 'D', 'F', 'G', 'H'],
    edges: { 'A-B': 'sl-gedge-highlight', 'A-C': 'sl-gedge-highlight', 'A-E': 'sl-gedge-highlight', 'B-D': 'sl-gedge-highlight', 'C-F': 'sl-gedge-highlight', 'E-G': 'sl-gedge-highlight', 'E-H': 'sl-gedge-highlight' },
    isGoal: false, active: [5, 7, 8, 9, 10] },
  { current: 'F', order: ['A', 'B', 'C', 'E', 'D', 'F'], frontier: ['G', 'H'], reached: ['A', 'B', 'C', 'E', 'D', 'F', 'G', 'H'],
    edges: { 'A-B': 'sl-gedge-highlight', 'A-C': 'sl-gedge-highlight', 'A-E': 'sl-gedge-highlight', 'B-D': 'sl-gedge-highlight', 'C-F': 'sl-gedge-highlight', 'E-G': 'sl-gedge-highlight', 'E-H': 'sl-gedge-highlight' },
    isGoal: false, active: [5, 7, 8, 9, 10] },
  { current: 'G', order: ['A', 'B', 'C', 'E', 'D', 'F', 'G'], frontier: ['H'], reached: ['A', 'B', 'C', 'E', 'D', 'F', 'G', 'H'],
    edges: { 'A-B': 'sl-gedge-highlight', 'A-C': 'sl-gedge-highlight', 'A-E': 'sl-gedge-highlight', 'B-D': 'sl-gedge-highlight', 'C-F': 'sl-gedge-highlight', 'E-G': 'sl-gedge-highlight', 'E-H': 'sl-gedge-highlight' },
    isGoal: true, active: [5, 6] }
];

// Precomputed UCS trace over SL_GRAPH (priority queue by path cost g,
// "reached" stores the best cost seen and is UPDATED when a cheaper path
// is found), independently verified with Python's heapq: expansion order
// A(0), C(2), B(3), D(5), E(7), G(8) — optimal cost 8. An edge that was
// once the best-known path to a state but got superseded by a cheaper one
// is kept in `edges` as 'sl-gedge-dup' (amber dashed) rather than dropped,
// so the graph visibly shows the UPDATE step, not just the final answer.
const SDS_UCS_STEPS = [
  { current: 'A', order: [['A', 0]], frontier: [['B', 3], ['C', 2], ['E', 9]], reached: ['A', 'B', 'C', 'E'],
    edges: { 'A-B': 'sl-gedge-highlight', 'A-C': 'sl-gedge-highlight', 'A-E': 'sl-gedge-highlight' },
    isGoal: false, active: [5, 7, 8, 9, 10] },
  { current: 'C', order: [['A', 0], ['C', 2]], frontier: [['B', 3], ['E', 8], ['F', 11]], reached: ['A', 'B', 'C', 'E', 'F'],
    edges: { 'A-B': 'sl-gedge-highlight', 'A-C': 'sl-gedge-highlight', 'A-E': 'sl-gedge-dup', 'C-E': 'sl-gedge-highlight', 'C-F': 'sl-gedge-highlight' },
    isGoal: false, active: [5, 7, 8, 9, 10] },
  { current: 'B', order: [['A', 0], ['C', 2], ['B', 3]], frontier: [['D', 5], ['E', 7], ['F', 11]], reached: ['A', 'B', 'C', 'E', 'F', 'D'],
    edges: { 'A-B': 'sl-gedge-highlight', 'A-C': 'sl-gedge-highlight', 'A-E': 'sl-gedge-dup', 'C-E': 'sl-gedge-dup', 'B-E': 'sl-gedge-highlight', 'C-F': 'sl-gedge-highlight', 'B-D': 'sl-gedge-highlight' },
    isGoal: false, active: [5, 7, 8, 9, 10] },
  { current: 'D', order: [['A', 0], ['C', 2], ['B', 3], ['D', 5]], frontier: [['E', 7], ['G', 8], ['F', 11]], reached: ['A', 'B', 'C', 'E', 'F', 'D', 'G'],
    edges: { 'A-B': 'sl-gedge-highlight', 'A-C': 'sl-gedge-highlight', 'A-E': 'sl-gedge-dup', 'C-E': 'sl-gedge-dup', 'B-E': 'sl-gedge-highlight', 'C-F': 'sl-gedge-highlight', 'B-D': 'sl-gedge-highlight', 'D-G': 'sl-gedge-highlight' },
    isGoal: false, active: [5, 7, 8, 9, 10] },
  { current: 'E', order: [['A', 0], ['C', 2], ['B', 3], ['D', 5], ['E', 7]], frontier: [['G', 8], ['H', 9], ['F', 11]], reached: ['A', 'B', 'C', 'E', 'F', 'D', 'G', 'H'],
    edges: { 'A-B': 'sl-gedge-highlight', 'A-C': 'sl-gedge-highlight', 'A-E': 'sl-gedge-dup', 'C-E': 'sl-gedge-dup', 'B-E': 'sl-gedge-highlight', 'C-F': 'sl-gedge-highlight', 'B-D': 'sl-gedge-highlight', 'D-G': 'sl-gedge-highlight', 'E-H': 'sl-gedge-highlight' },
    isGoal: false, active: [5, 7, 8, 9, 10] },
  { current: 'G', order: [['A', 0], ['C', 2], ['B', 3], ['D', 5], ['E', 7], ['G', 8]], frontier: [['H', 9], ['F', 11]], reached: ['A', 'B', 'C', 'E', 'F', 'D', 'G', 'H'],
    edges: { 'A-B': 'sl-gedge-highlight', 'A-C': 'sl-gedge-highlight', 'A-E': 'sl-gedge-dup', 'C-E': 'sl-gedge-dup', 'B-E': 'sl-gedge-highlight', 'C-F': 'sl-gedge-highlight', 'B-D': 'sl-gedge-highlight', 'D-G': 'sl-gedge-highlight', 'E-H': 'sl-gedge-highlight' },
    isGoal: true, active: [5, 6] }
];

const SL_TOPICS = [
  { key: 'terminology', name: 'Search Terminology' },
  { key: 'datastructures', name: 'Search Data Structures' },
  { key: 'strategies', name: 'Search Strategies' },
  { key: 'evaluating', name: 'Evaluating Search' }
];

class SearchLectureUI {
  constructor() {
    this.topicIdx = 0;
    this.termIdx = 0;
    this.dsIdx = 0;
    this.dsAlgo = 'bfs';
    this.dsStep = 0;
    this.frOpsStep = 0;

    this.tabsEl = document.getElementById('sl-topic-tabs');
    this.conceptColEl = document.getElementById('sl-concept-col');
    this.graphColEl = document.getElementById('sl-graph-col');

    this.bindEvents();
    this.render();
  }

  bindEvents() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') this.setTopic(this.topicIdx + 1);
      if (e.key === 'ArrowLeft') this.setTopic(this.topicIdx - 1);
    });
  }

  setTopic(idx) {
    if (idx < 0 || idx >= SL_TOPICS.length) return;
    this.topicIdx = idx;
    this.termIdx = 0;
    this.dsIdx = 0;
    this.dsAlgo = 'bfs';
    this.dsStep = 0;
    this.frOpsStep = 0;
    this.render();
  }

  setTerm(idx) {
    if (idx < 0 || idx >= SL_TERMS.length || idx === this.termIdx) return;
    this.termIdx = idx;
    this.render();
  }

  setDsTerm(idx) {
    if (idx < 0 || idx >= SDS_TERMS.length || idx === this.dsIdx) return;
    this.dsIdx = idx;
    this.dsStep = 0;
    this.frOpsStep = 0;
    this.render();
  }

  setDsAlgo(algo) {
    if (algo !== 'bfs' && algo !== 'ucs') return;
    this.dsAlgo = algo;
    this.dsStep = 0;
    this.render();
  }

  setDsStep(idx) {
    const steps = this.dsAlgo === 'bfs' ? SDS_BFS_STEPS : SDS_UCS_STEPS;
    if (idx < 0 || idx >= steps.length) return;
    this.dsStep = idx;
    this.render();
  }

  setFrOpsStep(idx) {
    if (idx < 0 || idx >= SDS_FRONTIER_OPS_STEPS.length) return;
    this.frOpsStep = idx;
    this.render();
  }

  render() {
    this.renderTopicTabs();
    this.renderConceptColumn();
    this.renderGraphColumn();
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  renderTopicTabs() {
    this.tabsEl.innerHTML = SL_TOPICS.map((topic, i) => `
      <button class="sl-topic-tab ${i === this.topicIdx ? 'active' : ''}" data-idx="${i}">
        ${topic.name}
      </button>
    `).join('');

    this.tabsEl.querySelectorAll('.sl-topic-tab').forEach(el => {
      el.addEventListener('click', () => this.setTopic(parseInt(el.dataset.idx, 10)));
    });
  }

  // ---------- Search Terminology (implemented) ----------

  renderConceptColumn() {
    const topic = SL_TOPICS[this.topicIdx];
    if (topic.key === 'terminology') {
      this.renderTerminologyConcept();
    } else if (topic.key === 'datastructures') {
      this.renderDataStructuresConcept();
    } else {
      this.renderPlaceholderConcept(topic);
    }
  }

  renderGraphColumn() {
    const topic = SL_TOPICS[this.topicIdx];
    if (topic.key === 'terminology') {
      this.renderTerminologyGraph();
    } else if (topic.key === 'datastructures') {
      this.renderDataStructuresGraph();
    } else {
      this.renderPlaceholderGraph();
    }
  }

  renderTerminologyConcept() {
    const term = SL_TERMS[this.termIdx];

    this.conceptColEl.innerHTML = `
      <p class="sl-topic-intro">These terms describe how a search algorithm explores a state space and keeps track of what has already been explored and what remains to be explored.</p>

      ${this.renderConceptSelectorHTML(SL_TERMS, this.termIdx)}

      <div class="teaching-panel active">
        <h3>${term.name}</h3>
        <p>${term.definition}</p>
        <div class="formula-box">${term.formula}</div>
        <div class="teaching-tip"><i data-lucide="lightbulb"></i>${term.tip}</div>
      </div>
    `;

    this.conceptColEl.querySelectorAll('.sl-concept-chip').forEach(el => {
      el.addEventListener('click', () => this.setTerm(parseInt(el.dataset.idx, 10)));
    });
  }

  // Shared concept-selector markup for any topic. Per the doc: once the
  // selector has more than 6 concepts, wrap it into two balanced rows
  // rather than shrinking the font or letting one long row overflow/
  // scroll (Search Terminology: 7 -> 4+3); 6 or fewer stays one row
  // (Search Data Structures: 4). Each row is a CSS grid with exactly as
  // many columns as it has chips, so it's guaranteed to stay a single
  // line (long names wrap to a second text line inside their own cell
  // instead of pushing the row itself onto a 3rd/4th visual line).
  renderConceptSelectorHTML(terms, activeIdx) {
    const renderChip = (t, i) => `
      <button class="sl-concept-chip ${i === activeIdx ? 'active' : ''}" data-idx="${i}">${t.name}</button>
    `;
    if (terms.length <= 6) {
      const row = terms.map((t, i) => renderChip(t, i)).join('');
      return `
        <div class="sl-concept-selector" id="sl-concept-selector">
          <div class="sl-concept-row" style="grid-template-columns: repeat(${terms.length}, minmax(0, 1fr));">${row}</div>
        </div>
      `;
    }
    const mid = Math.ceil(terms.length / 2);
    const row1Terms = terms.slice(0, mid);
    const row2Terms = terms.slice(mid);
    const row1 = row1Terms.map((t, i) => renderChip(t, i)).join('');
    const row2 = row2Terms.map((t, i) => renderChip(t, i + mid)).join('');
    return `
      <div class="sl-concept-selector" id="sl-concept-selector">
        <div class="sl-concept-row" style="grid-template-columns: repeat(${row1Terms.length}, minmax(0, 1fr));">${row1}</div>
        <div class="sl-concept-row" style="grid-template-columns: repeat(${row2Terms.length}, minmax(0, 1fr));">${row2}</div>
      </div>
    `;
  }

  renderTerminologyGraph() {
    const term = SL_TERMS[this.termIdx];

    const graphBlock = `
      <div class="sl-diagram-block sl-diagram-block-graph">
        <div class="sl-tree-caption">State-Space Graph</div>
        <div class="sl-graph-svg-wrap">${this.renderGraphSVG(term.nodeStates, term.edgeClasses)}</div>
      </div>
    `;

    let treeBlocks;
    let illustrationExtraCls = '';
    if (term.secondTree) {
      // One term (Tree-Like vs. Graph Search) needs the same graph next
      // to TWO trees. Both trees are derived from the SAME edgeClasses/
      // nodeStates as the graph — only the treePruned list differs — so
      // all three diagrams can never disagree with each other.
      illustrationExtraCls = 'sl-graph-illustration-triple';
      treeBlocks = `
        <div class="sl-diagram-block sl-diagram-block-tree sl-diagram-block-tree-narrow">
          <div class="sl-tree-caption">${term.treeCaption || 'Search Tree'}</div>
          <div class="sl-tree-svg-wrap">${this.renderMiniTreeSVG(term, [])}</div>
        </div>
        <div class="sl-diagram-block sl-diagram-block-tree sl-diagram-block-tree-narrow">
          <div class="sl-tree-caption">${term.secondTree.caption}</div>
          <div class="sl-tree-svg-wrap">${this.renderMiniTreeSVG(term, term.secondTree.treePruned || [])}</div>
        </div>
      `;
    } else {
      treeBlocks = `
        <div class="sl-diagram-block sl-diagram-block-tree">
          <div class="sl-tree-caption">Search Tree</div>
          <div class="sl-tree-svg-wrap">${this.renderMiniTreeSVG(term)}</div>
        </div>
      `;
    }

    this.graphColEl.innerHTML = `
      <div class="sl-graph-illustration sl-graph-illustration-compact ${illustrationExtraCls}">
        <div class="sl-dual-diagrams">
          ${graphBlock}
          ${treeBlocks}
        </div>
        <div class="sl-illustration-note">${term.note}</div>
      </div>
    `;
  }

  // ---------- Search Data Structures (implemented) ----------

  renderDataStructuresConcept() {
    const term = SDS_TERMS[this.dsIdx];
    const selectorHTML = this.renderConceptSelectorHTML(SDS_TERMS, this.dsIdx);

    let bodyHTML;
    if (term.kind === 'stepper') {
      const steps = this.dsAlgo === 'bfs' ? SDS_BFS_STEPS : SDS_UCS_STEPS;
      const step = steps[this.dsStep];
      const activeSet = new Set(step.active);
      const pseudoHTML = SDS_PSEUDOCODE.map((line, i) => `
        <div class="sl-pseudo-line ${activeSet.has(i) ? 'active' : ''}" data-idx="${i}">${line}</div>
      `).join('');

      bodyHTML = `
        <div class="teaching-panel active">
          <h3>${term.name}</h3>
          <p>${term.definition}</p>

          <div class="sl-algo-toggle">
            <button class="sl-algo-btn ${this.dsAlgo === 'bfs' ? 'active' : ''}" data-algo="bfs">Breadth-First Search</button>
            <button class="sl-algo-btn ${this.dsAlgo === 'ucs' ? 'active' : ''}" data-algo="ucs">Uniform-Cost Search</button>
          </div>

          <div class="sl-pseudocode">${pseudoHTML}</div>

          <div class="sl-step-controls">
            <button class="sl-step-btn" id="sl-step-prev" ${this.dsStep === 0 ? 'disabled' : ''}>&larr; Prev</button>
            <span class="sl-step-indicator">Step ${this.dsStep + 1} / ${steps.length}${step.isGoal ? ' &mdash; Goal!' : ''}</span>
            <button class="sl-step-btn" id="sl-step-next" ${this.dsStep === steps.length - 1 ? 'disabled' : ''}>Next &rarr;</button>
          </div>
        </div>
      `;
    } else {
      bodyHTML = `
        <div class="teaching-panel active">
          <h3>${term.name}</h3>
          <p>${term.definition}</p>
          <div class="formula-box">${term.formula}</div>
          <div class="teaching-tip"><i data-lucide="lightbulb"></i>${term.tip}</div>
        </div>
      `;
    }

    this.conceptColEl.innerHTML = `
      <p class="sl-topic-intro">These building blocks are what every search algorithm is made of: a node's fields, the frontier's four operations, the containers a frontier can be built from, and the loop that ties them together.</p>
      ${selectorHTML}
      ${bodyHTML}
    `;

    this.conceptColEl.querySelectorAll('.sl-concept-chip').forEach(el => {
      el.addEventListener('click', () => this.setDsTerm(parseInt(el.dataset.idx, 10)));
    });
    this.conceptColEl.querySelectorAll('.sl-algo-btn').forEach(el => {
      el.addEventListener('click', () => this.setDsAlgo(el.dataset.algo));
    });
    const prevBtn = this.conceptColEl.querySelector('#sl-step-prev');
    const nextBtn = this.conceptColEl.querySelector('#sl-step-next');
    if (prevBtn) prevBtn.addEventListener('click', () => this.setDsStep(this.dsStep - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => this.setDsStep(this.dsStep + 1));
    // Per the doc's stepper design, clicking any pseudocode line just
    // advances one step (same as Next) — every step already highlights a
    // block of lines together, so a line doesn't map to its own unique
    // step the way a graph node does.
    this.conceptColEl.querySelectorAll('.sl-pseudo-line').forEach(el => {
      el.addEventListener('click', () => this.setDsStep(this.dsStep + 1));
    });
  }

  renderDataStructuresGraph() {
    const term = SDS_TERMS[this.dsIdx];

    if (term.kind === 'nodecard') {
      const cardRows = term.nodeCard.map(f => `
        <div class="sl-nodecard-row"><span class="sl-nodecard-key">${f.key}</span><span class="sl-nodecard-val">${f.val}</span></div>
      `).join('');
      this.graphColEl.innerHTML = `
        <div class="sl-graph-illustration sl-graph-illustration-compact">
          <div class="sl-dual-diagrams">
            <div class="sl-diagram-block sl-diagram-block-graph">
              <div class="sl-tree-caption">State-Space Graph</div>
              <div class="sl-graph-svg-wrap">${this.renderGraphSVG(term.nodeStates, term.edgeClasses)}</div>
            </div>
            <div class="sl-diagram-block sl-diagram-block-tree">
              <div class="sl-tree-caption">Search Tree</div>
              <div class="sl-tree-svg-wrap">${this.renderMiniTreeSVG(term)}</div>
            </div>
            <div class="sl-diagram-block sl-diagram-block-tree">
              <div class="sl-tree-caption">node.* Fields</div>
              <div class="sl-nodecard">${cardRows}</div>
            </div>
          </div>
          <div class="sl-illustration-note">${term.note}</div>
        </div>
      `;
      return;
    }

    if (term.kind === 'frontierops') {
      const step = SDS_FRONTIER_OPS_STEPS[this.frOpsStep];

      // Every node whose state changes at some step (B is popped, D is
      // added) is a valid jump target, same convention as the "Putting
      // It Together" stepper's graph. A/C/E never change across this
      // short run, so they stay inert.
      const clickableNodes = SDS_FRONTIER_OPS_STEPS
        .map(s => s.changedNode)
        .filter((n, i, arr) => n && arr.indexOf(n) === i);

      const boxes = step.frontier.map(s => `<div class="sl-frontier-box">${s}</div>`).join('');
      const ops = SDS_FRONTIER_OPS_STEPS.slice(1).map((s, i) => {
        const idx = i + 1; // step index this log entry represents
        const stateCls = idx < this.frOpsStep ? 'sl-frontier-op-done' : idx === this.frOpsStep ? 'sl-frontier-op-active' : 'sl-frontier-op-pending';
        return `
        <div class="sl-frontier-op ${stateCls}" data-idx="${idx}">
          <span class="sl-frontier-op-label">${s.op}</span><span class="sl-frontier-op-result">${idx <= this.frOpsStep ? s.result : '&hellip;'}</span>
        </div>`;
      }).join('');

      this.graphColEl.innerHTML = `
        <div class="sl-graph-illustration sl-graph-illustration-compact">
          <div class="sl-dual-diagrams">
            <div class="sl-diagram-block sl-diagram-block-graph">
              <div class="sl-tree-caption">State-Space Graph</div>
              <div class="sl-graph-svg-wrap">${this.renderGraphSVG(step.nodeStates, step.edges, clickableNodes)}</div>
            </div>
            <div class="sl-diagram-block sl-diagram-block-tree">
              <div class="sl-tree-caption">Frontier &amp; Operation Log</div>
              <div class="sl-frontier-boxes">${boxes}</div>
              <div class="sl-frontier-ops">${ops}</div>
              <div class="sl-step-controls">
                <button class="sl-step-btn" id="sl-frops-prev" ${this.frOpsStep === 0 ? 'disabled' : ''}>&larr; Prev</button>
                <span class="sl-step-indicator">${this.frOpsStep === 0 ? 'Ready' : `Step ${this.frOpsStep} / ${SDS_FRONTIER_OPS_STEPS.length - 1}`}</span>
                <button class="sl-step-btn" id="sl-frops-next" ${this.frOpsStep === SDS_FRONTIER_OPS_STEPS.length - 1 ? 'disabled' : ''}>Run Next &rarr;</button>
              </div>
            </div>
          </div>
          <div class="sl-illustration-note">${term.note}</div>
        </div>
      `;

      const frOpsPrev = this.graphColEl.querySelector('#sl-frops-prev');
      const frOpsNext = this.graphColEl.querySelector('#sl-frops-next');
      if (frOpsPrev) frOpsPrev.addEventListener('click', () => this.setFrOpsStep(this.frOpsStep - 1));
      if (frOpsNext) frOpsNext.addEventListener('click', () => this.setFrOpsStep(this.frOpsStep + 1));
      this.graphColEl.querySelectorAll('.sl-frontier-op').forEach(el => {
        el.addEventListener('click', () => this.setFrOpsStep(parseInt(el.dataset.idx, 10)));
      });
      this.graphColEl.querySelectorAll('.sl-gnode-clickable').forEach(el => {
        // A node can be `changedNode` at more than one step (B is
        // peeked by TOP, then actually dequeued by POP) — jump to the
        // LAST such step, where its state finally settles, not the
        // first mention of it.
        let targetIdx = -1;
        for (let i = SDS_FRONTIER_OPS_STEPS.length - 1; i >= 0; i--) {
          if (SDS_FRONTIER_OPS_STEPS[i].changedNode === el.dataset.state) { targetIdx = i; break; }
        }
        el.addEventListener('click', () => this.setFrOpsStep(targetIdx));
      });
      return;
    }

    if (term.kind === 'frontiertypes') {
      const panels = term.frontierTypes.map(ft => {
        const boxes = ft.order.map((s, i) => `
          <div class="sl-frontier-box ${i === ft.popIdx ? 'sl-frontier-box-pop' : ''}">
            ${s}${ft.showCost ? `<span class="sl-frontier-box-cost">g=${ft.costs[s]}</span>` : ''}
          </div>
        `).join('');
        return `
          <div class="sl-frontier-type-panel">
            <div class="sl-tree-caption">${ft.label}</div>
            <div class="sl-frontier-type-sub">${ft.sub}</div>
            <div class="sl-frontier-boxes-vert">${boxes}</div>
            <div class="sl-frontier-type-pop">next: <strong>${ft.order[ft.popIdx]}</strong> (${ft.popNote})</div>
          </div>
        `;
      }).join('');
      this.graphColEl.innerHTML = `
        <div class="sl-graph-illustration sl-graph-illustration-compact">
          <div class="sl-frontier-types-row">${panels}</div>
          <div class="sl-illustration-note">${term.note}</div>
        </div>
      `;
      return;
    }

    // kind === 'stepper'
    const steps = this.dsAlgo === 'bfs' ? SDS_BFS_STEPS : SDS_UCS_STEPS;
    const step = steps[this.dsStep];
    const isUcs = this.dsAlgo === 'ucs';

    const nodeStates = {};
    const orderStates = isUcs ? step.order.map(([s]) => s) : step.order;
    orderStates.forEach((s, i) => {
      const isCurrent = s === step.current && i === orderStates.length - 1;
      nodeStates[s] = {
        cls: isCurrent ? ['sl-current'].concat(step.isGoal ? ['sl-goal'] : []) : ['sl-explored'],
        badge: String(i + 1)
      };
    });
    const frontierStates = isUcs ? step.frontier.map(([s]) => s) : step.frontier;
    frontierStates.forEach(s => {
      if (!nodeStates[s]) nodeStates[s] = { cls: ['sl-frontier'] };
    });
    if (isUcs) {
      step.order.forEach(([s, g]) => { if (nodeStates[s]) nodeStates[s].sublabel = `g=${g}`; });
      step.frontier.forEach(([s, g]) => { if (nodeStates[s]) nodeStates[s].sublabel = `g=${g}`; });
    }

    const frontierLabel = isUcs
      ? step.frontier.map(([s, g]) => `${s} (g=${g})`).join(', ')
      : step.frontier.join(', ');
    const reachedLabel = step.reached.join(', ');
    const orderLabel = isUcs
      ? step.order.map(([s, g]) => `${s}(${g})`).join(' &rarr; ')
      : step.order.join(' &rarr; ');

    // Every node that is ever `current` at some point in THIS algorithm's
    // full precomputed trace is a valid jump target — clicking it sets
    // dsStep straight to that step, regardless of which step is showing
    // now. Nodes never popped (e.g. H in BFS; F, H in UCS, since the goal
    // is found first) have no step to jump to, so they stay unclickable.
    const clickableNodes = steps.map(s => s.current);
    const nodeStepMap = {};
    steps.forEach((s, i) => { nodeStepMap[s.current] = i; });

    this.graphColEl.innerHTML = `
      <div class="sl-graph-illustration sl-graph-illustration-compact">
        <div class="sl-dual-diagrams">
          <div class="sl-diagram-block sl-diagram-block-graph">
            <div class="sl-tree-caption">State-Space Graph</div>
            <div class="sl-graph-svg-wrap">${this.renderGraphSVG(nodeStates, step.edges, clickableNodes)}</div>
          </div>
          <div class="sl-diagram-block sl-diagram-block-tree sl-stepper-panel">
            <div class="sl-tree-caption">${this.dsAlgo === 'bfs' ? 'BFS' : 'UCS'} Readout</div>
            <div class="sl-stepper-readout">
              <div class="sl-stepper-readout-row"><span class="sl-nodecard-key">current</span><span class="sl-nodecard-val">${step.current}${step.isGoal ? ' (goal!)' : ''}</span></div>
              <div class="sl-stepper-readout-row"><span class="sl-nodecard-key">frontier</span><span class="sl-nodecard-val">{${frontierLabel}}</span></div>
              <div class="sl-stepper-readout-row"><span class="sl-nodecard-key">reached</span><span class="sl-nodecard-val">{${reachedLabel}}</span></div>
              <div class="sl-stepper-readout-row"><span class="sl-nodecard-key">order</span><span class="sl-nodecard-val">${orderLabel}</span></div>
            </div>
          </div>
        </div>
        <div class="sl-illustration-note">${term.note}</div>
      </div>
    `;

    this.graphColEl.querySelectorAll('.sl-gnode-clickable').forEach(el => {
      el.addEventListener('click', () => this.setDsStep(nodeStepMap[el.dataset.state]));
    });
  }

  // ---------- Other topics (not yet implemented) ----------

  renderPlaceholderConcept(topic) {
    this.conceptColEl.innerHTML = `
      <div class="teaching-panel active">
        <h3>${topic.name}</h3>
        <div class="sl-placeholder-block">
          <span class="sl-placeholder-label">Definition</span>
          <span class="sl-placeholder-text">Not yet implemented</span>
        </div>
        <div class="sl-placeholder-block">
          <span class="sl-placeholder-label">AIMA Formula / Notation</span>
          <span class="sl-placeholder-text">Not yet implemented</span>
        </div>
        <div class="sl-placeholder-block">
          <span class="sl-placeholder-label">Teaching Tip</span>
          <span class="sl-placeholder-text">Not yet implemented</span>
        </div>
      </div>
    `;
  }

  renderPlaceholderGraph() {
    this.graphColEl.innerHTML = `
      <div class="sl-placeholder-illustration">
        <i data-lucide="image"></i>
        <span>Illustration &mdash; not yet implemented</span>
      </div>
    `;
  }

  // ---------- SVG graph rendering ----------

  slNodeXY(n) {
    const layout = SL_NODE_LAYOUT[n];
    return { cx: layout.x * 100, cy: layout.y * 100 };
  }

  renderGraphSVG(nodeStates = {}, edgeClasses = {}, clickableNodes = null) {
    let edgesSvg = '';
    Object.entries(SL_GRAPH).forEach(([from, succs]) => {
      const p1 = this.slNodeXY(from);
      succs.forEach(s => {
        const p2 = this.slNodeXY(s.to);
        const key = `${from}-${s.to}`;
        const cls = edgeClasses[key] || '';
        const mx = (p1.cx + p2.cx) / 2;
        const my = (p1.cy + p2.cy) / 2;
        edgesSvg += `<line x1="${p1.cx}" y1="${p1.cy}" x2="${p2.cx}" y2="${p2.cy}" class="sl-gedge ${cls}"></line>`;
        edgesSvg += `<circle cx="${mx}" cy="${my}" r="3.6" class="sl-gedge-cost-bg ${cls}"></circle>`;
        edgesSvg += `<text x="${mx}" y="${my}" class="sl-gedge-cost-text">${s.cost}</text>`;
      });
    });

    let nodesSvg = '';
    Object.keys(SL_NODE_LAYOUT).forEach(n => {
      const p = this.slNodeXY(n);
      const state = nodeStates[n] || {};
      const cls = (state.cls || []).join(' ');

      // Sublabel placement, tuned for THIS fixed graph layout so a label
      // never runs past the viewBox edge or straight through a nearby
      // edge-cost badge:
      //  - Nodes in the top band (B, D) get their label ABOVE (no edge
      //    geometry up there); every other node defaults to BELOW,
      //    clamped so it can never fall outside the viewBox.
      //  - A sits right at the left edge with three edges fanning out to
      //    its right (B, C, E), each with a cost badge roughly 15-20
      //    units away in every direction except straight up — the empty
      //    strip above the whole B/D row (y < ~25, clear across the full
      //    width) is the only spot immune to A's own text length.
      //  - E is the busiest node (five edges meet there); every zone
      //    close to it hits a badge, but a small band running due right,
      //    threaded between the E-G and E-H badges, stays clear no
      //    matter how long the label text is.
      const labelAbove = SL_NODE_LAYOUT[n].y <= 0.4;
      let sublabelX = p.cx;
      let sublabelY = labelAbove ? p.cy - 9 : Math.min(p.cy + 11, 80);
      let sublabelStyle = '';
      if (n === 'A') {
        sublabelStyle = 'text-anchor:start;';
        sublabelX = p.cx + 4;
        sublabelY = 9;
      } else if (n === 'E') {
        sublabelStyle = 'text-anchor:start;';
        sublabelX = p.cx + 9;
        sublabelY = p.cy + 1;
      }

      // clickableNodes === null means "not an interactive diagram" (every
      // other term's fixed illustration) — only the stepper passes an
      // actual array, marking the nodes that appear as `current` at some
      // point in that algorithm's precomputed trace as jump targets.
      const isClickable = clickableNodes && clickableNodes.includes(n);

      nodesSvg += `<g class="sl-gnode ${cls} ${isClickable ? 'sl-gnode-clickable' : ''}" data-state="${n}">
        <circle cx="${p.cx}" cy="${p.cy}" r="6.5"></circle>
        <text x="${p.cx}" y="${p.cy}" class="sl-gnode-label">${n}</text>
        ${state.badge ? `<text x="${p.cx + 6.8}" y="${p.cy - 6.5}" class="sl-gnode-badge">${state.badge}</text>` : ''}
        ${state.sublabel ? `<text x="${sublabelX}" y="${sublabelY}" class="sl-gnode-sublabel" style="${sublabelStyle}">${state.sublabel}</text>` : ''}
      </g>`;
    });

    return `<svg class="sl-graph-svg" viewBox="0 0 100 82" xmlns="http://www.w3.org/2000/svg">${edgesSvg}${nodesSvg}</svg>`;
  }

  // Generic mini search-tree diagram, derived from a term's OWN
  // edgeClasses (the same data that highlights the state-space graph) so
  // the two diagrams can never disagree. Handles at most 2 levels below
  // the root (root -> children -> grandchildren), which covers every
  // Search Terminology term: parent-child edges become tree edges; a
  // state reached via more than one edge becomes a separate leaf node
  // per path (e.g. E under both B and C), linked by a dashed "same
  // state" connector — UNLESS that edge is in the pruned list, in which
  // case it's drawn as a faded, dashed "pruned" node instead (Graph
  // Search: the redundant path never becomes a real tree node).
  //
  // `pruneOverride`, when given (including an empty array), replaces
  // term.treePruned for this call — used by the Tree-Like vs. Graph
  // Search term to render two different trees from the same term data.
  renderMiniTreeSVG(term, pruneOverride) {
    const edgeClasses = term.edgeClasses || {};
    const treePruned = pruneOverride !== undefined ? pruneOverride : (term.treePruned || []);
    const edgeList = Object.entries(edgeClasses).map(([key, cls]) => {
      const [from, to] = key.split('-');
      return { key, from, to, cls };
    });
    if (!edgeList.length) {
      // Terms that highlight a single state with no expansion path yet
      // still get a tree: that one state, drawn as a single, standalone
      // tree node.
      const states = Object.keys(term.nodeStates || {});
      if (!states.length) return '';
      const rootState = states.find(s => (term.nodeStates[s].cls || []).includes('sl-current')) || states[0];
      const state = term.nodeStates[rootState] || {};
      const gcls = (state.cls || []).join(' ');
      const nodeSvg = `<g class="sl-gnode ${gcls}">
        <circle cx="50" cy="29" r="6.5"></circle>
        <text x="50" y="29" class="sl-gnode-label">${rootState}</text>
        ${state.badge ? `<text x="56.8" y="22.5" class="sl-gnode-badge">${state.badge}</text>` : ''}
      </g>`;
      return `<svg class="sl-graph-svg sl-tree-svg" viewBox="0 0 100 58" xmlns="http://www.w3.org/2000/svg">${nodeSvg}</svg>`;
    }

    const targets = new Set(edgeList.map(e => e.to));
    const root = edgeList.map(e => e.from).find(s => !targets.has(s)) || SL_START;

    const level1 = edgeList.filter(e => e.from === root);
    const level1Ids = level1.map(e => e.to);
    const level2 = edgeList.filter(e => level1Ids.includes(e.from));

    // How many tree instances each state ends up with, so a repeated
    // state can be shown as separate leaves instead of merged into one.
    const instanceCount = {};
    [...level1, ...level2].forEach(e => {
      instanceCount[e.to] = (instanceCount[e.to] || 0) + 1;
    });

    const stateOf = (s) => term.nodeStates[s] || {};
    const nodeProps = (state, isDup, pruned) => pruned
      ? { gcls: 'sl-tree-pruned', badge: '&times;' }
      : { gcls: (state.cls || []).join(' '), badge: isDup ? undefined : state.badge };

    const nodes = [];
    const edgesOut = [];

    nodes.push({ state: root, x: 50, y: 12, pruned: false, ...nodeProps(stateOf(root), false, false) });

    const n1 = level1.length;
    level1.forEach((e, i) => {
      const x = n1 === 1 ? 50 : 12 + (76 * i) / (n1 - 1);
      const pruned = treePruned.includes(e.key);
      const isDup = !pruned && instanceCount[e.to] > 1;
      e._x = x;
      nodes.push({ state: e.to, x, y: 45, pruned, ...nodeProps(stateOf(e.to), isDup, pruned) });
      edgesOut.push({ x1: 50, y1: 12, x2: x, y2: 45, cls: pruned ? 'sl-gedge-dup' : e.cls });
    });

    level2.forEach(e => {
      const parentEdge = level1.find(p => p.to === e.from);
      if (!parentEdge) return;
      const px = parentEdge._x;
      const pruned = treePruned.includes(e.key);
      const isDup = !pruned && instanceCount[e.to] > 1;
      nodes.push({ state: e.to, x: px, y: 78, pruned, ...nodeProps(stateOf(e.to), isDup, pruned) });
      edgesOut.push({ x1: px, y1: 45, x2: px, y2: 78, cls: pruned ? 'sl-gedge-dup' : e.cls });
    });

    // A repeated, non-pruned leaf state gets a dashed "same state" link.
    let connectorSvg = '';
    const leafGroups = {};
    nodes.filter(n => n.y === 78 && !n.pruned).forEach(n => {
      (leafGroups[n.state] = leafGroups[n.state] || []).push(n);
    });
    Object.values(leafGroups).forEach(group => {
      if (group.length >= 2) {
        const [a, b] = group;
        connectorSvg += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" class="sl-gedge sl-gedge-dup"></line>`;
        connectorSvg += `<text x="${(a.x + b.x) / 2}" y="${a.y + 8}" class="sl-gnode-sublabel">same state</text>`;
      }
    });

    const edgesSvg = edgesOut.map(e =>
      `<line x1="${e.x1}" y1="${e.y1}" x2="${e.x2}" y2="${e.y2}" class="sl-gedge ${e.cls}"></line>`
    ).join('');
    const nodesSvg = nodes.map(n => `<g class="sl-gnode ${n.gcls}">
        <circle cx="${n.x}" cy="${n.y}" r="6.5"></circle>
        <text x="${n.x}" y="${n.y}" class="sl-gnode-label">${n.state}</text>
        ${n.badge ? `<text x="${n.x + 6.8}" y="${n.y - 6.5}" class="sl-gnode-badge">${n.badge}</text>` : ''}
      </g>`).join('');

    const height = nodes.some(n => n.y === 78) ? 90 : 58;
    return `<svg class="sl-graph-svg sl-tree-svg" viewBox="0 0 100 ${height}" xmlns="http://www.w3.org/2000/svg">${edgesSvg}${connectorSvg}${nodesSvg}</svg>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.slUI = new SearchLectureUI();
});
