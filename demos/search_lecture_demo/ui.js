/**
 * Search & Planning — Lecture Illustration
 *
 * This is NOT the Route-Finding Visualizer (playground.html#view-search,
 * specified in search.md) — that demo already lets a student pick
 * BFS/DFS/UCS/Greedy/A* and step it, node by node, across this same graph.
 * This page never runs a live frontier/expand stepper. It shows short,
 * already-computed snapshots instead, to explain WHY that cycle works and
 * how the strategies relate before a student opens the running demo.
 *
 * Concepts (SL_STEPS, in order, matching instructions/search_lecture.md):
 * State Space vs. Search Tree, State vs. Node, Frontier & Node Expansion,
 * Search Strategy, Uninformed Search, Heuristics h(n), Informed Search,
 * Heuristic Properties, Evaluating Search. Grounded in
 * aima-python/aima/search.py — Node, best_first_graph_search /
 * best_first_tree_search, and the admissible/consistent heuristic notes in
 * astar_search / EightPuzzle.h / GridProblem / TravelingSalesman.
 *
 * Concepts 1, 2, 3, 4, 6, 8 use Shape A (definition + a fixed graph
 * snapshot, one per subtopic — every subtopic phrase in the spec's table
 * gets its own button). Concepts 5 and 7 use Shape B (strategy comparison:
 * a real, computed expansion order for each strategy). Concept 9 uses
 * Shape C (a single grouped comparison table — Solution / Search Effort /
 * Guarantees — no graph needed, no subtopic buttons).
 *
 * Same weighted map as the Route-Finding Visualizer (search.md), Start = A,
 * Goal = G, kept as an independent copy here so this page never loads the
 * running demo's code. All expansion orders, path costs, and node counts
 * below are real, computed values (see instructions/search_lecture.md and
 * the offline verification notes), not hand-authored guesses.
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

// True shortest remaining cost to G from each node (Dijkstra/Bellman-Ford
// over SL_GRAPH). F and H cannot reach G at all on this graph.
const SL_TRUE_DIST = { A: 8, B: 5, C: 7, D: 3, E: 1, F: null, G: 0, H: null };

// h(n): straight-line distance from n to G in the layout's own coordinate
// space, scaled by the largest factor that keeps it admissible everywhere.
// Verified offline — admissible AND consistent on every edge of this graph.
const SL_H = { A: 1.9, B: 1.3, C: 1.6, D: 0.6, E: 1, F: 1.1, G: 0, H: 0.7 };

// A single deliberately-inflated alternative value, used only by Concept 8
// to show a heuristic that is still admissible (5 <= true cost 8) but is
// NOT consistent on edge A->C.
const SL_H_BAD_A = 5;

// Real, computed expansion orders (graph-search: goal-tested on pop, lowest
// f expanded first, successors visited alphabetically, already-explored or
// already-frontier states never re-added).
const SL_ORDERS = {
  BFS: {
    order: [
      { node: 'A', meta: 'depth 0' }, { node: 'B', meta: 'depth 1' },
      { node: 'C', meta: 'depth 1' }, { node: 'E', meta: 'depth 1' },
      { node: 'D', meta: 'depth 2' }, { node: 'F', meta: 'depth 2' },
      { node: 'G', meta: 'depth 2' }
    ],
    expanded: 6, path: 'A → E → G', cost: 10,
    caption: 'BFS expands shallowest-first: A, B, C, E, D, F, G &mdash; reaching G in 2 edges via A &rarr; E &rarr; G. That path costs 9 + 1 = 10; BFS ignores edge cost entirely.'
  },
  DFS: {
    order: [
      { node: 'A', meta: '' }, { node: 'B', meta: '' },
      { node: 'D', meta: '' }, { node: 'G', meta: '' }
    ],
    expanded: 3, path: 'A → B → D → G', cost: 8,
    caption: 'DFS dives into the alphabetically-first successor at each step and never backtracks once a path continues: A, B, D, G &mdash; the first path DFS finds, cost 3+2+3 = 8. It happens to be optimal here, but DFS never checks.'
  },
  UCS: {
    order: [
      { node: 'A', meta: 'g=0' }, { node: 'C', meta: 'g=2' },
      { node: 'B', meta: 'g=3' }, { node: 'D', meta: 'g=5' },
      { node: 'G', meta: 'g=8' }
    ],
    expanded: 4, path: 'A → B → D → G', cost: 8,
    caption: 'UCS always expands the lowest accumulated cost g(n): A, C (g=2), B (g=3), D (g=5), G (g=8) &mdash; finds the truly cheapest path, cost 8, via A &rarr; B &rarr; D &rarr; G.'
  },
  IDS: {
    order: [
      { node: 'A', meta: '#1' }, { node: 'E', meta: '#2' }, { node: 'G', meta: '#3' }
    ],
    expanded: 5, path: 'A → E → G', cost: 10,
    caption: 'IDS reruns depth-limited DFS with a growing limit: limit 0 fails (0 expansions), limit 1 fails (1), limit 2 succeeds (4 more) &mdash; finding A &rarr; E &rarr; G, the same shallowest path BFS finds. Unlike BFS, IDS can revisit a state more than once within one pass, since it keeps no explored set.'
  },
  GREEDY: {
    order: [
      { node: 'A', meta: 'h=1.9' }, { node: 'E', meta: 'h=1.0' }, { node: 'G', meta: 'h=0' }
    ],
    expanded: 2, path: 'A → E → G', cost: 10,
    caption: 'Greedy always expands the lowest h(n): A, E (h=1.0), G (h=0) &mdash; only 2 expansions, but it walks straight onto the expensive A&rarr;E edge (cost 9) because E merely <em>looks</em> closest. Total cost 10, not optimal.'
  },
  ASTAR: {
    order: [
      { node: 'A', meta: 'f=1.9' }, { node: 'C', meta: 'f=3.6' },
      { node: 'B', meta: 'f=4.3' }, { node: 'D', meta: 'f=5.6' },
      { node: 'G', meta: 'f=8.0' }
    ],
    expanded: 4, path: 'A → B → D → G', cost: 8,
    caption: 'A* expands the lowest g(n)+h(n): A, C (f=3.6), B (f=4.3), D (f=5.6), G (f=8.0) &mdash; the same optimal path as UCS, cost 8, with the heuristic guiding (not replacing) the search.'
  }
};

const SL_STEPS = [
  {
    key: 'statetree', name: 'State Space vs. Search Tree', shape: 'A',
    subtopics: [
      { key: 'statespace', label: 'State Space', icon: 'network' },
      { key: 'searchtree', label: 'Search Tree', icon: 'git-branch' },
      { key: 'repeated', label: 'Repeated States', icon: 'copy' },
      { key: 'treevsgraph', label: 'Tree vs. Graph Search', icon: 'share-2' },
      { key: 'avoiding', label: 'Avoiding Repeated States', icon: 'shield-check' }
    ]
  },
  {
    key: 'statenode', name: 'State vs. Node', shape: 'A',
    subtopics: [
      { key: 'statevsnode', label: 'State vs. Node', icon: 'tag' },
      { key: 'parent', label: 'Parent', icon: 'corner-left-up' },
      { key: 'action', label: 'Action', icon: 'move-right' },
      { key: 'pathcost', label: 'Path Cost g(n)', icon: 'coins' },
      { key: 'depth', label: 'Depth', icon: 'layers' },
      { key: 'reconstruct', label: 'Reconstructing a Path', icon: 'route' }
    ]
  },
  {
    key: 'frontier', name: 'Frontier & Node Expansion', shape: 'A',
    subtopics: [
      { key: 'generated', label: 'Generated vs. Expanded', icon: 'git-fork' },
      { key: 'frontierset', label: 'Frontier', icon: 'list' },
      { key: 'reached', label: 'Reached States', icon: 'check-square' },
      { key: 'select', label: 'Select', icon: 'mouse-pointer-click' },
      { key: 'expand', label: 'Expand', icon: 'unfold-vertical' },
      { key: 'update', label: 'Update Frontier', icon: 'list-plus' }
    ]
  },
  {
    key: 'strategy', name: 'Search Strategy', shape: 'A',
    subtopics: [
      { key: 'shallowest', label: 'Shallowest (BFS)', icon: 'align-start-vertical' },
      { key: 'deepest', label: 'Deepest (DFS)', icon: 'corner-down-right' },
      { key: 'lowestg', label: 'Lowest g(n) (UCS)', icon: 'coins' },
      { key: 'lowesth', label: 'Lowest h(n) (Greedy)', icon: 'zap' },
      { key: 'lowestgh', label: 'Lowest g(n)+h(n) (A*)', icon: 'star' }
    ]
  },
  {
    key: 'uninformed', name: 'Uninformed Search', shape: 'B',
    subtopics: [
      { key: 'BFS', label: 'BFS', icon: 'layers' },
      { key: 'DFS', label: 'DFS', icon: 'corner-down-right' },
      { key: 'UCS', label: 'UCS', icon: 'coins' },
      { key: 'IDS', label: 'IDS', icon: 'repeat' }
    ]
  },
  {
    key: 'heuristics', name: 'Heuristics — h(n)', shape: 'A',
    subtopics: [
      { key: 'estimatedcost', label: 'Estimated Cost to Goal', icon: 'target' },
      { key: 'domainknowledge', label: 'Problem-Specific Knowledge', icon: 'compass' },
      { key: 'estimatevstrue', label: 'Estimate vs. True Cost', icon: 'help-circle' },
      { key: 'examples', label: 'Example Heuristics', icon: 'map' }
    ]
  },
  {
    key: 'informed', name: 'Informed Search', shape: 'B',
    subtopics: [
      { key: 'GREEDY', label: 'Greedy', icon: 'zap' },
      { key: 'ASTAR', label: 'A*', icon: 'star' }
    ]
  },
  {
    key: 'properties', name: 'Heuristic Properties', shape: 'A',
    subtopics: [
      { key: 'admissibility', label: 'Admissibility', icon: 'shield-check' },
      { key: 'truecost', label: 'True Cost h*(n)', icon: 'flag' },
      { key: 'consistency', label: 'Consistency', icon: 'link' },
      { key: 'triangle', label: 'Triangle Inequality', icon: 'triangle' },
      { key: 'impliesadmissible', label: 'Consistency ⇒ Admissible', icon: 'arrow-right' },
      { key: 'connectiontoastar', label: 'Connection to A*', icon: 'star' }
    ]
  },
  {
    key: 'evaluating', name: 'Evaluating Search', shape: 'C',
    subtopics: []
  }
];

function slSuccessors(node) {
  return [...(SL_GRAPH[node] || [])].sort((a, b) => a.to.localeCompare(b.to));
}

class SearchLectureUI {
  constructor() {
    this.stepIdx = 0;
    this.subtopic = {
      statetree: 'statespace',
      statenode: 'statevsnode',
      frontier: 'generated',
      strategy: 'shallowest',
      uninformed: 'BFS',
      heuristics: 'estimatedcost',
      informed: 'GREEDY',
      properties: 'admissibility'
    };

    this.mainGridEl = document.getElementById('sl-main-grid');
    this.flowBarEl = document.getElementById('sl-flow-bar');
    this.panelsEl = document.getElementById('sl-panels');
    this.graphColEl = document.getElementById('sl-graph');
    this.btnPrev = document.getElementById('btn-sl-prev');
    this.btnNext = document.getElementById('btn-sl-next');

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

  setStep(idx) {
    if (idx < 0 || idx >= SL_STEPS.length) return;
    this.stepIdx = idx;
    this.render();
  }

  setSubtopic(stepKey, subKey) {
    if (this.subtopic[stepKey] === subKey) return;
    this.subtopic[stepKey] = subKey;
    this.render();
  }

  // ---------- Shape A: fixed graph snapshots ----------
  // One snapshot per (concept, subtopic) pair — every subtopic phrase in
  // instructions/search_lecture.md's Concepts table gets its own button
  // and its own caption (reused as the concept column's Teaching Tip, so
  // both columns read as one fact).

  slSnapshot(stepKey, subKey) {
    const key = `${stepKey}.${subKey}`;
    switch (key) {

      // ---- 1. State Space vs. Search Tree ----
      case 'statetree.statespace':
        return {
          nodeStates: { A: { cls: ['sl-start'] }, G: { cls: ['sl-goal'] } },
          edgeClasses: {},
          caption: 'The state space is every state (A&ndash;H) and every action connecting them &mdash; the whole graph, whether or not anyone ever searches it.'
        };
      case 'statetree.searchtree':
        return {
          nodeStates: {
            A: { cls: ['sl-explored'] }, B: { cls: ['sl-explored'] }, C: { cls: ['sl-explored'] }, E: { cls: ['sl-explored'] },
            D: { cls: ['sl-frontier'] }, F: { cls: ['sl-frontier'] }, G: { cls: ['sl-frontier'] }
          },
          edgeClasses: {},
          caption: 'A search tree is built by expanding one action at a time from the start &mdash; here, two layers deep from A. Unlike the state space, which just exists, the search tree only contains what the search has actually generated so far.'
        };
      case 'statetree.repeated':
        return {
          nodeStates: {
            A: { cls: ['sl-explored'] }, B: { cls: ['sl-explored'] }, C: { cls: ['sl-explored'] },
            E: { cls: ['sl-dup'], badge: '×2' }
          },
          edgeClasses: { 'B-E': 'sl-gedge-dup', 'C-E': 'sl-gedge-dup' },
          caption: 'State E can be reached by two different action sequences: A&rarr;B&rarr;E and A&rarr;C&rarr;E. Any search that doesn’t track this can end up doing the same work twice &mdash; or, on a graph with a cycle back to an ancestor, infinitely.'
        };
      case 'statetree.treevsgraph':
        return {
          nodeStates: {
            A: { cls: ['sl-explored'] }, B: { cls: ['sl-explored'] }, C: { cls: ['sl-explored'] },
            E: { cls: ['sl-dup'], badge: '×2' }
          },
          edgeClasses: { 'B-E': 'sl-gedge-dup', 'C-E': 'sl-gedge-dup' },
          caption: 'Tree Search: no duplicate check &mdash; both B&rarr;E and C&rarr;E create separate nodes for state E. Graph Search: tracks Explored / Reached, so a repeated state is caught instead (see &ldquo;Avoiding Repeated States&rdquo;).'
        };
      case 'statetree.avoiding':
        return {
          nodeStates: {
            A: { cls: ['sl-explored'] }, B: { cls: ['sl-explored'] },
            C: { cls: ['sl-explored'] }, E: { cls: ['sl-explored'] }
          },
          edgeClasses: { 'B-E': 'sl-gedge-highlight', 'C-E': 'sl-gedge-skip' },
          caption: 'Graph search avoids the repeat: once E is reached via B, it’s added to Explored/Reached, so C &rarr; E is skipped instead of creating a second node for the same state.'
        };

      // ---- 2. State vs. Node ----
      case 'statenode.statevsnode':
        return {
          nodeStates: { C: { cls: ['sl-current'], sublabel: 'state = "C"' } },
          edgeClasses: {},
          caption: 'C by itself is just a label for a state &mdash; it says nothing about how the agent got there. A node bundles that state together with the path that reached it.'
        };
      case 'statenode.parent':
        return {
          nodeStates: { A: { cls: ['sl-explored'] }, C: { cls: ['sl-current'], sublabel: 'parent = A' } },
          edgeClasses: { 'A-C': 'sl-gedge-highlight' },
          caption: 'Node(C).PARENT = A &mdash; the node one step before C on the path that reached it. Following PARENT pointers back to the root reconstructs the whole path (see &ldquo;Reconstructing a Path&rdquo;).'
        };
      case 'statenode.action':
        return {
          nodeStates: { A: { cls: ['sl-explored'] }, C: { cls: ['sl-current'], sublabel: 'action = Go(C)' } },
          edgeClasses: { 'A-C': 'sl-gedge-highlight' },
          caption: 'Node(C).ACTION = Go(C) &mdash; the specific action applied to PARENT to produce this node. A different action from the same parent would create a different child node.'
        };
      case 'statenode.pathcost':
        return {
          nodeStates: { A: { cls: ['sl-explored'] }, C: { cls: ['sl-current'], sublabel: 'path-cost = 2' } },
          edgeClasses: { 'A-C': 'sl-gedge-highlight' },
          caption: 'Node(C).PATH-COST = 2 &mdash; the accumulated cost g(n) of every step from the start to C. This is exactly the g(n) that UCS and A* compare (Concept 4).'
        };
      case 'statenode.depth':
        return {
          nodeStates: { A: { cls: ['sl-explored'] }, C: { cls: ['sl-current'], sublabel: 'depth = 1' } },
          edgeClasses: { 'A-C': 'sl-gedge-highlight' },
          caption: 'Node(C).DEPTH = 1 &mdash; how many actions separate C’s node from the root. BFS compares depth directly (Concept 4); DFS’s memory bound depends on it too.'
        };
      case 'statenode.reconstruct':
        return {
          nodeStates: {
            A: { cls: ['sl-explored'] }, B: { cls: ['sl-explored'] },
            D: { cls: ['sl-explored'] }, G: { cls: ['sl-current', 'sl-goal'] }
          },
          edgeClasses: { 'A-B': 'sl-gedge-highlight', 'B-D': 'sl-gedge-highlight', 'D-G': 'sl-gedge-highlight' },
          caption: 'Chase each node’s PARENT pointer back to the root: G &larr; D &larr; B &larr; A. Reversed, that chain is the solution path A &rarr; B &rarr; D &rarr; G &mdash; this is why a search tree is built from nodes, not bare states.'
        };

      // ---- 3. Frontier & Node Expansion ----
      case 'frontier.generated':
        return {
          nodeStates: {
            A: { cls: ['sl-explored'] }, B: { cls: ['sl-frontier'] },
            C: { cls: ['sl-frontier'] }, E: { cls: ['sl-frontier'] }
          },
          edgeClasses: { 'A-B': 'sl-gedge-highlight', 'A-C': 'sl-gedge-highlight', 'A-E': 'sl-gedge-highlight' },
          caption: 'A is expanded &mdash; its children were generated. B, C, E are generated but not yet expanded &mdash; they’re only waiting in the frontier.'
        };
      case 'frontier.frontierset':
        return {
          nodeStates: {
            A: { cls: ['sl-explored'] }, B: { cls: ['sl-frontier'] },
            C: { cls: ['sl-frontier'] }, E: { cls: ['sl-frontier'] }
          },
          edgeClasses: {},
          caption: 'Frontier = {B, C, E} &mdash; every node generated so far that hasn’t been expanded yet. This is exactly the set a strategy’s f(n) chooses from (Concept 4).'
        };
      case 'frontier.reached':
        return {
          nodeStates: { A: { cls: ['sl-explored'] } },
          edgeClasses: {},
          caption: 'Reached (Explored) = {A} &mdash; every state the search has already expanded. Checking a new child against Reached is exactly what prevents the repeated-state problem from Concept 1.'
        };
      case 'frontier.select':
        return {
          nodeStates: { A: { cls: ['sl-current'] } },
          edgeClasses: {},
          caption: 'Frontier = {A}. Pop A and goal-test it: A ≠ G, so it isn’t a solution &mdash; select it for expansion.'
        };
      case 'frontier.expand':
        return {
          nodeStates: {
            A: { cls: ['sl-explored'] }, B: { cls: ['sl-frontier'] },
            C: { cls: ['sl-frontier'] }, E: { cls: ['sl-frontier'] }
          },
          edgeClasses: { 'A-B': 'sl-gedge-highlight', 'A-C': 'sl-gedge-highlight', 'A-E': 'sl-gedge-highlight' },
          caption: 'Expand A: apply ACTIONS(A) and RESULT(A, a) for each &mdash; this generates children B, C, and E.'
        };
      case 'frontier.update':
        return {
          nodeStates: {
            A: { cls: ['sl-explored'] }, B: { cls: ['sl-frontier'] },
            C: { cls: ['sl-frontier'] }, E: { cls: ['sl-frontier'] }
          },
          edgeClasses: {},
          caption: 'Frontier = {B, C, E}, Explored = {A}. The cycle repeats: select the next node from the (now larger) frontier.'
        };

      // ---- 4. Search Strategy ----
      // Same frontier every time — {B (g=3,h=1.3), C (g=2,h=1.6), E (g=9,h=1.0)}
      // generated from A — with a different selection rule highlighting a
      // different winner, so the five rules can be compared side by side.
      case 'strategy.shallowest':
        return {
          nodeStates: {
            A: { cls: ['sl-explored'] },
            B: { cls: ['sl-current'], sublabel: 'depth=1 (first in)' },
            C: { cls: ['sl-frontier'], sublabel: 'depth=1' },
            E: { cls: ['sl-frontier'], sublabel: 'depth=1' }
          },
          edgeClasses: {},
          caption: 'Shallowest-first (BFS): B, C, E all tie at depth 1 &mdash; BFS picks whichever entered the frontier first (here, B), since it doesn’t look at cost at all.'
        };
      case 'strategy.deepest':
        return {
          nodeStates: {
            A: { cls: ['sl-explored'] },
            B: { cls: ['sl-frontier'] },
            C: { cls: ['sl-frontier'] },
            E: { cls: ['sl-current'], sublabel: 'generated last' }
          },
          edgeClasses: {},
          caption: 'Deepest-first (DFS): E was generated last, so a LIFO frontier pops it next &mdash; DFS dives into whatever it just generated, rather than working through the frontier in the order it was built.'
        };
      case 'strategy.lowestg':
        return {
          nodeStates: {
            A: { cls: ['sl-explored'] },
            B: { cls: ['sl-frontier'], sublabel: 'g=3' },
            C: { cls: ['sl-current'], sublabel: 'g=2' },
            E: { cls: ['sl-frontier'], sublabel: 'g=9' }
          },
          edgeClasses: {},
          caption: 'Lowest g(n) (UCS): C has the lowest accumulated cost (g=2, vs. B’s 3 and E’s 9) &mdash; UCS always expands the cheapest-so-far node, regardless of when it was generated.'
        };
      case 'strategy.lowesth':
        return {
          nodeStates: {
            A: { cls: ['sl-explored'] },
            B: { cls: ['sl-frontier'], sublabel: 'h=1.3' },
            C: { cls: ['sl-frontier'], sublabel: 'h=1.6' },
            E: { cls: ['sl-current'], sublabel: 'h=1.0' }
          },
          edgeClasses: {},
          caption: 'Lowest h(n) (Greedy): E looks closest to the goal (h=1.0, vs. B’s 1.3 and C’s 1.6) &mdash; Greedy picks it even though reaching E costs 9, far more than B or C.'
        };
      case 'strategy.lowestgh':
        return {
          nodeStates: {
            A: { cls: ['sl-explored'] },
            B: { cls: ['sl-frontier'], sublabel: 'f=4.3' },
            C: { cls: ['sl-current'], sublabel: 'f=3.6' },
            E: { cls: ['sl-frontier'], sublabel: 'f=10.0' }
          },
          edgeClasses: {},
          caption: 'Lowest g(n)+h(n) (A*): C has the lowest combined score (f=2+1.6=3.6, vs. B’s 3+1.3=4.3 and E’s 9+1.0=10.0) &mdash; A* balances cost-so-far against the estimate, landing on C here just like UCS.'
        };

      // ---- 6. Heuristics — h(n) ----
      case 'heuristics.estimatedcost':
        return {
          nodeStates: { C: { cls: ['sl-current'], sublabel: 'h=1.6' }, G: { cls: ['sl-goal'] } },
          edgeClasses: {},
          caption: 'h(C) = 1.6 is search’s own estimate of how far C is from the goal G &mdash; a number the algorithm computes without actually searching from C.'
        };
      case 'heuristics.domainknowledge':
        return {
          nodeStates: { C: { cls: ['sl-current'], sublabel: 'h=1.6 (map distance)' }, G: { cls: ['sl-goal'] } },
          edgeClasses: {},
          caption: 'Unlike g(n), which only uses edge costs the search has already paid, h(n) uses outside knowledge &mdash; here, the straight-line distance from n to G on the map, something the graph edges alone don’t tell you.'
        };
      case 'heuristics.estimatevstrue':
        return {
          nodeStates: { C: { cls: ['sl-current'], sublabel: 'h=1.6' }, G: { cls: ['sl-goal'] } },
          edgeClasses: {},
          caption: `h(C) = 1.6 estimates the remaining cost from C to G. The true shortest remaining cost is ${SL_TRUE_DIST.C} &mdash; h(n) is a guess that happens to be a good one here, not a guarantee.`
        };
      case 'heuristics.examples':
        return {
          nodeStates: Object.fromEntries(Object.keys(SL_H).map(n => [
            n, { cls: n === SL_GOAL ? ['sl-goal'] : [], sublabel: `h=${SL_H[n]}` }
          ])),
          edgeClasses: {},
          caption: 'h(n) here is the straight-line distance from n to G on the map, scaled &mdash; the same idea as AIMA’s straight-line-distance-to-Bucharest, or EightPuzzle’s count of misplaced tiles.'
        };

      // ---- 8. Heuristic Properties ----
      case 'properties.admissibility':
        return {
          nodeStates: { A: { cls: ['sl-current'], sublabel: `h=1.9 ≤ ${SL_TRUE_DIST.A}` }, G: { cls: ['sl-goal'] } },
          edgeClasses: {},
          caption: `h(A) = 1.9 ≤ the true remaining cost of ${SL_TRUE_DIST.A} &mdash; admissible means a heuristic never overestimates. An overestimate could make A* skip over the actual optimal path.`
        };
      case 'properties.truecost':
        return {
          nodeStates: { A: { cls: ['sl-current'], sublabel: `h=1.9, h*=${SL_TRUE_DIST.A}` }, G: { cls: ['sl-goal'] } },
          edgeClasses: {},
          caption: `h*(n) is the TRUE optimal remaining cost &mdash; something a search normally doesn’t know in advance. h*(A) = ${SL_TRUE_DIST.A} here (the real cost of the best path A&rarr;B&rarr;D&rarr;G); h(A) = 1.9 is just an estimate of it.`
        };
      case 'properties.consistency':
        return {
          nodeStates: {
            A: { cls: ['sl-current'], sublabel: 'h=1.9' },
            C: { cls: ['sl-frontier'], sublabel: `h=${SL_H.C}` }
          },
          edgeClasses: { 'A-C': 'sl-gedge-highlight' },
          caption: `On edge A &rarr; C (cost 2): h(A)=1.9 &le; cost + h(C) = 2 + ${SL_H.C} = ${(2 + SL_H.C).toFixed(1)} &mdash; consistent. f never drops by more than the edge allows for as you move along it.`
        };
      case 'properties.triangle':
        return {
          nodeStates: {
            A: { cls: ['sl-current'], sublabel: 'h(n)' },
            C: { cls: ['sl-frontier'], sublabel: 'h(n′)' }
          },
          edgeClasses: { 'A-C': 'sl-gedge-highlight' },
          caption: 'h(n) &le; cost(n,a,n′) + h(n′) is a triangle inequality: going straight from n to the goal (estimated h(n)) can never cost more than going n &rarr; n′ (real cost) and then n′ &rarr; goal (estimated h(n′)).'
        };
      case 'properties.impliesadmissible':
        return {
          nodeStates: {
            A: { cls: ['sl-current'], sublabel: `h′=${SL_H_BAD_A}` },
            C: { cls: ['sl-frontier'], sublabel: `h=${SL_H.C}` }
          },
          edgeClasses: { 'A-C': 'sl-gedge-violation' },
          caption: `Suppose instead h′(A) = ${SL_H_BAD_A}. On edge A &rarr; C: h′(A)=${SL_H_BAD_A} &gt; cost + h(C) = 2 + ${SL_H.C} = ${(2 + SL_H.C).toFixed(1)} &mdash; inconsistent, even though h′(A)=${SL_H_BAD_A} is still &le; the true cost of ${SL_TRUE_DIST.A} (still admissible). So consistent &rArr; admissible, but not the other way around.`
        };
      case 'properties.connectiontoastar':
        return {
          nodeStates: {
            A: { cls: ['sl-explored'] }, B: { cls: ['sl-explored'] },
            D: { cls: ['sl-explored'] }, G: { cls: ['sl-current', 'sl-goal'] }
          },
          edgeClasses: { 'A-B': 'sl-gedge-highlight', 'B-D': 'sl-gedge-highlight', 'D-G': 'sl-gedge-highlight' },
          caption: 'With a consistent h(n), A* with graph search is guaranteed to find the optimal path the first time it reaches a state &mdash; no need to ever re-open an already-expanded node.'
        };

      default:
        return { nodeStates: {}, edgeClasses: {}, caption: '' };
    }
  }

  // ---------- Shape B: strategy comparison ----------

  slOrderHtml(subKey) {
    const data = SL_ORDERS[subKey];
    return data.order.map((o, i) => `
      <div class="sl-order-item ${o.node === SL_GOAL ? 'sl-order-goal' : ''}">
        <span class="sl-order-badge">${i + 1}</span> ${o.node}
        ${o.meta ? `<span class="sl-order-meta">${o.meta}</span>` : ''}
      </div>
    `).join('<span class="sl-order-arrow">→</span>');
  }

  slOrderNodeStates(subKey) {
    const data = SL_ORDERS[subKey];
    const states = {};
    data.order.forEach((o, i) => {
      const isLast = i === data.order.length - 1;
      states[o.node] = {
        cls: isLast ? ['sl-current', 'sl-goal'] : ['sl-explored'],
        badge: String(i + 1)
      };
    });
    return states;
  }

  // ---------- SVG graph rendering ----------

  slNodeXY(n) {
    const layout = SL_NODE_LAYOUT[n];
    return { cx: layout.x * 100, cy: layout.y * 100 };
  }

  renderGraphSVG(nodeStates = {}, edgeClasses = {}) {
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
      nodesSvg += `<g class="sl-gnode ${cls}">
        <circle cx="${p.cx}" cy="${p.cy}" r="6.5"></circle>
        <text x="${p.cx}" y="${p.cy}" class="sl-gnode-label">${n}</text>
        ${state.badge ? `<text x="${p.cx + 6.8}" y="${p.cy - 6.5}" class="sl-gnode-badge">${state.badge}</text>` : ''}
        ${state.sublabel ? `<text x="${p.cx}" y="${p.cy + 11}" class="sl-gnode-sublabel">${state.sublabel}</text>` : ''}
      </g>`;
    });

    return `<svg class="sl-graph-svg" viewBox="0 0 100 82" xmlns="http://www.w3.org/2000/svg">${edgesSvg}${nodesSvg}</svg>`;
  }

  // ---------- Render ----------

  render() {
    this.renderFlowBar();
    this.renderPanels();
    this.renderGraphColumn();
    this.updateNavButtons();
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  updateNavButtons() {
    this.btnPrev.disabled = this.stepIdx === 0;
    this.btnNext.disabled = this.stepIdx === SL_STEPS.length - 1;
  }

  renderFlowBar() {
    this.flowBarEl.innerHTML = SL_STEPS.map((step, i) => `
      <div class="flow-step ${i === this.stepIdx ? 'active' : ''} ${i < this.stepIdx ? 'completed' : ''}" data-idx="${i}">
        <div class="flow-step-num">${i + 1}</div>
        <div class="flow-step-name">${step.name}</div>
      </div>
    `).join('');

    this.flowBarEl.querySelectorAll('.flow-step').forEach(el => {
      el.addEventListener('click', () => this.setStep(parseInt(el.dataset.idx, 10)));
    });
  }

  renderPanels() {
    const step = SL_STEPS[this.stepIdx];
    this.panelsEl.innerHTML = `<div class="teaching-panel active">${this['panel_' + step.key]()}</div>`;
  }

  currentCaption() {
    const step = SL_STEPS[this.stepIdx];
    if (step.shape === 'A') return this.slSnapshot(step.key, this.subtopic[step.key]).caption;
    if (step.shape === 'B') return SL_ORDERS[this.subtopic[step.key]].caption;
    return '';
  }

  renderGraphColumn() {
    const step = SL_STEPS[this.stepIdx];

    if (step.shape === 'C') {
      this.mainGridEl.classList.add('sl-single-col');
      this.graphColEl.innerHTML = '';
      return;
    }
    this.mainGridEl.classList.remove('sl-single-col');

    const switchHtml = `
      <div class="sl-subtopic-switch">
        <span class="sl-subtopic-switch-label">Illustration</span>
        <div class="sl-subtopic-tabs">
          ${step.subtopics.map(st => `
            <button class="sl-subtopic-tab ${st.key === this.subtopic[step.key] ? 'active' : ''}" data-sub="${st.key}">
              <i data-lucide="${st.icon}"></i> ${st.label}
            </button>
          `).join('')}
        </div>
      </div>
    `;

    let bodyHtml;
    if (step.shape === 'A') {
      const snap = this.slSnapshot(step.key, this.subtopic[step.key]);
      bodyHtml = `
        <div class="sl-graph-illustration">
          <div class="sl-graph-svg-wrap">${this.renderGraphSVG(snap.nodeStates, snap.edgeClasses)}</div>
        </div>
      `;
    } else {
      const subKey = this.subtopic[step.key];
      bodyHtml = `
        <div class="sl-graph-illustration">
          <div class="sl-order-list">${this.slOrderHtml(subKey)}</div>
          <div class="sl-graph-svg-wrap">${this.renderGraphSVG(this.slOrderNodeStates(subKey), {})}</div>
        </div>
      `;
    }

    this.graphColEl.innerHTML = switchHtml + bodyHtml;

    this.graphColEl.querySelectorAll('.sl-subtopic-tab').forEach(btn => {
      btn.addEventListener('click', () => this.setSubtopic(step.key, btn.dataset.sub));
    });
  }

  // ---------- Concept panels ----------

  panel_statetree() {
    return `
      <h3>1. State Space vs. Search Tree</h3>
      <p>The state space is every state and action there is &mdash; it exists whether or not anyone searches it. A search tree is only the paths a particular search has actually explored, built one action at a time from the start.</p>
      <div class="formula-box">State Space: the whole graph &nbsp;|&nbsp; Search Tree: paths explored so far</div>
      <div class="teaching-tip"><i data-lucide="lightbulb"></i>${this.currentCaption()}</div>
    `;
  }

  panel_statenode() {
    return `
      <h3>2. State vs. Node</h3>
      <p>A state is just a label, like C. A node wraps a state together with how the agent got there &mdash; enough to rebuild the whole path once a goal node is found.</p>
      <div class="formula-box">Node = &#10216;STATE, PARENT, ACTION, PATH-COST, DEPTH&#10217;</div>
      <div class="teaching-tip"><i data-lucide="lightbulb"></i>${this.currentCaption()}</div>
    `;
  }

  panel_frontier() {
    return `
      <h3>3. Frontier & Node Expansion</h3>
      <p>A node is generated the moment it's created as someone's child. It's expanded only once it's selected from the frontier and its own children are generated in turn.</p>
      <div class="formula-box">Generated = Frontier &cup; Reached (Expanded)</div>
      <div class="teaching-tip"><i data-lucide="lightbulb"></i>${this.currentCaption()}</div>
    `;
  }

  panel_strategy() {
    return `
      <h3>4. Search Strategy</h3>
      <p>Every strategy below runs the exact same select &rarr; expand cycle from Concept 3. The only thing that changes is f(n) &mdash; the rule for which frontier node gets selected next.</p>
      <div class="formula-box">expand argmin<sub>n&isin;frontier</sub> f(n)</div>
      <div class="teaching-tip"><i data-lucide="lightbulb"></i>${this.currentCaption()}</div>
    `;
  }

  panel_uninformed() {
    return `
      <h3>5. Uninformed Search</h3>
      <p>No knowledge of the goal's location &mdash; only the graph seen so far. BFS expands shallowest-first, DFS deepest-first, UCS lowest-cost-first, IDS reruns depth-limited search with a growing limit.</p>
      <div class="formula-box">BFS f=depth(n) &nbsp;&middot;&nbsp; DFS: LIFO &nbsp;&middot;&nbsp; UCS f=g(n) &nbsp;&middot;&nbsp; IDS: depth-limited, increasing limit</div>
      <div class="teaching-tip"><i data-lucide="lightbulb"></i>${this.currentCaption()}</div>
    `;
  }

  panel_heuristics() {
    return `
      <h3>6. Heuristics &mdash; h(n)</h3>
      <p>A heuristic h(n) estimates the cost from n to the goal, using problem-specific knowledge the graph alone doesn't carry.</p>
      <div class="formula-box">h(n) &asymp; cost(n &rarr; goal)</div>
      <div class="teaching-tip"><i data-lucide="lightbulb"></i>${this.currentCaption()}</div>
    `;
  }

  panel_informed() {
    return `
      <h3>7. Informed Search</h3>
      <p>Greedy Best-First chases whatever looks closest to the goal; A* balances that estimate against the cost already paid.</p>
      <div class="formula-box">Greedy: f(n) = h(n) &nbsp;&middot;&nbsp; A*: f(n) = g(n) + h(n)</div>
      <div class="teaching-tip"><i data-lucide="lightbulb"></i>${this.currentCaption()}</div>
    `;
  }

  panel_properties() {
    return `
      <h3>8. Heuristic Properties</h3>
      <p>Admissible: h(n) never overestimates the true remaining cost h*(n). Consistent: h(n) never drops by more than an edge's own cost. Consistency is the stronger property, and it implies admissibility &mdash; never the other way around.</p>
      <div class="formula-box">Admissible: h(n) &le; h*(n) &nbsp;|&nbsp; Consistent: h(n) &le; cost(n,a,n&prime;) + h(n&prime;)</div>
      <div class="teaching-tip"><i data-lucide="lightbulb"></i>${this.currentCaption()}</div>
    `;
  }

  panel_evaluating() {
    const rows = [
      { name: 'BFS', complete: 'Yes', optimal: 'Yes*', time: 'O(b<sup>d</sup>)', space: 'O(b<sup>d</sup>)' },
      { name: 'DFS', complete: 'No&dagger;', optimal: 'No', time: 'O(b<sup>m</sup>)', space: 'O(bm)' },
      { name: 'UCS', complete: 'Yes', optimal: 'Yes', time: '&asymp;O(b<sup>1+C*/&epsilon;</sup>)', space: 'same as time' },
      { name: 'IDS', complete: 'Yes', optimal: 'Yes*', time: 'O(b<sup>d</sup>)', space: 'O(bd)' },
      { name: 'Greedy', complete: 'No', optimal: 'No', time: 'O(b<sup>m</sup>)', space: 'O(b<sup>m</sup>)' },
      { name: 'A*', complete: 'Yes', optimal: 'Yes&Dagger;', time: 'exponential (worst case)', space: 'O(b<sup>d</sup>)' }
    ];
    const cell = (v) => {
      const isYes = /^Yes/.test(v);
      const isNo = /^No/.test(v);
      return `<td class="${isYes ? 'sl-cell-yes' : isNo ? 'sl-cell-no' : ''}">${v}</td>`;
    };
    return `
      <h3>9. Evaluating Search</h3>
      <p>Comparing strategies means comparing three different things at once: what solution they find, how much work it took, and what they guarantee in general. Adversarial Search (Topic 02.3) evaluates search differently &mdash; against an opponent, not toward a fixed goal &mdash; and is intentionally out of scope here.</p>
      <div class="sl-complexity-table-wrap">
        <table class="sl-complexity-table">
          <thead>
            <tr>
              <th rowspan="2">Strategy</th>
              <th colspan="2">Solution</th>
              <th colspan="3">Search Effort</th>
              <th colspan="2">Guarantees</th>
            </tr>
            <tr>
              <th>Path</th><th>Cost</th>
              <th>Expanded</th><th>Time</th><th>Space</th>
              <th>Complete?</th><th>Optimal?</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => {
              const o = SL_ORDERS[r.name === 'A*' ? 'ASTAR' : r.name.toUpperCase()];
              return `<tr><td>${r.name}</td><td>${o.path}</td><td>${o.cost}</td><td>${o.expanded}</td><td>${r.time}</td><td>${r.space}</td>${cell(r.complete)}${cell(r.optimal)}</tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <p class="sl-complexity-table-note">b = branching factor &middot; d = depth of the shallowest solution &middot; m = maximum depth of the tree &middot; * optimal only when step costs are equal &middot; &dagger; only when the state space is finite / has no infinite paths &middot; &Dagger; with an admissible heuristic (tree search) or a consistent heuristic (graph search). Path/Cost/Expanded are real values computed for this graph.</p>
      <div class="teaching-tip"><i data-lucide="lightbulb"></i>UCS and A* both find the optimal path (cost 8) here, expanding the same 4 nodes &mdash; A*'s heuristic pays off more on larger graphs, where it prunes nodes UCS would still expand. Greedy expands the fewest nodes (2) but returns a worse solution (cost 10): Search Effort and Guarantees are a genuine trade-off.</div>
    `;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.slUI = new SearchLectureUI();
});
