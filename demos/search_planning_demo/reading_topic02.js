/*
  MLAI401 — Topic 02 Reading Notes content (topic02_reading.html).
  Rendered by demos/reading_notes.js (same engine as Topics 06 and 07).
  Figures come from reading_topic02_figs.js. Source: AIMA (4th ed.) Ch. 3.
*/
(function (root) {
  "use strict";
  const FIG = root.RN_FIGS || [];
  const BFS_CODE = "<pre class='rn-code'>function BEST-FIRST-SEARCH(problem) returns a solution node or failure\n  node ← NODE(problem.INITIAL)\n  frontier ← a queue containing node\n  reached ← {problem.INITIAL: node}\n  while not IS-EMPTY(frontier) do\n    node ← POP(frontier)\n    if IS-GOAL(problem, node.STATE) then return node\n    for each child in EXPAND(node) do\n      if child.STATE not in reached or\n         child.PATH-COST &lt; reached[child.STATE].PATH-COST then\n        reached[child.STATE] ← child; ADD(child, frontier)\n  return failure</pre>";
  const TABS = [
    { id: "terms", label: "Search Terminology", source: "AIMA (4th ed.) §3.3", subs: [
      { id: "tree", label: "Search Tree & States",
        lead: "A search algorithm does not walk the state-space graph directly; it builds a <strong>search tree</strong> of paths growing out from the initial state.",
        points: [
          "Each tree edge is one action. <strong>Search tree ≠ state-space graph:</strong> a state reached by two paths appears as two tree nodes.",
          "A <strong>state</strong> s ∈ S is one configuration of the world the agent cares about.",
          "<strong>problem.INITIAL</strong> is where the agent starts; <strong>IS-GOAL(problem, s)</strong> recognises a goal.",
          "Keep three questions apart: where <em>can</em> the agent be (any state), where does it <em>start</em> (initial state), where does it want to <em>end</em> (a goal state).",
        ],
        checks: [
          { q: "A state can be reached by 3 different paths. In the search tree it may appear…", options: ["up to 3 times", "exactly once", "never"], answer: "up to 3 times", why: "One tree node per path; the graph has one node per state." },
          { q: "Which tells the algorithm it has succeeded?", options: ["IS-GOAL(problem, s)", "problem.INITIAL", "RESULT(s, a)"], answer: "IS-GOAL(problem, s)", why: "The goal test recognises a solution state." },
        ],
        remember: ["Graph: one node per state. Tree: one node per path."] },
      { id: "expansion", label: "Expansion",
        lead: "<strong>Expanding</strong> a node applies every legal action in its state and builds a child node for each result.",
        points: [
          "EXPAND(node) calls RESULT(s, a) = s′ for every action a in ACTIONS(s), then wraps each s′ in CHILD-NODE(…).",
          "A <strong>successor</strong> is a <em>state</em> (from RESULT); a <strong>child</strong> is the <em>tree node</em> built around it.",
          "Three legal actions → three successor states → three child nodes.",
        ],
        formula: "EXPAND(node) = { CHILD-NODE(node, a) : a ∈ ACTIONS(node.STATE) }, &nbsp; child.STATE = RESULT(node.STATE, a)",
        checks: [
          { q: "A successor is…", options: ["a state", "a tree node", "an action"], answer: "a state", why: "RESULT returns states; CHILD-NODE wraps them in nodes." },
          { q: "A node's state has 4 legal actions. Expanding it creates how many children?", options: ["4", "1", "It depends on the goal"], answer: "4", why: "One child per applicable action." },
        ],
        remember: ["Successor = state. Child = node."] },
      { id: "frontier", label: "Reached, Expanded & Frontier",
        lead: "At any moment every known state is in one of three overlapping groups.",
        points: [
          "<strong>Reached:</strong> some path to it has been found (it has a node).",
          "<strong>Expanded:</strong> its children have been generated.",
          "<strong>Frontier:</strong> reached but not yet expanded, waiting its turn.",
          "<strong>Reached does not mean expanded.</strong> A node can be in reached and in the frontier at the same time.",
        ],
        example: "<table class='ag-table ui'><thead><tr><th class='l'>set</th><th class='l'>mid-search snapshot</th></tr></thead><tbody>" +
          "<tr><td class='l'>reached</td><td class='l'>{A, B, C, E}</td></tr><tr><td class='l'>expanded</td><td class='l'>{A}</td></tr><tr class='is-hl'><td class='l'>frontier</td><td class='l'>{B, C, E}</td></tr></tbody></table>",
        checks: [
          { q: "reached = {A, B, C, E}, expanded = {A}. The frontier is…", options: ["{B, C, E}", "{A}", "{A, B, C, E}"], answer: "{B, C, E}", why: "Frontier = reached but not yet expanded." },
          { q: "A node sitting in the frontier has been…", options: ["reached but not expanded", "expanded", "neither"], answer: "reached but not expanded", why: "It moves to expanded only once it is popped and its children are generated." },
        ],
        remember: ["frontier = reached − expanded."] },
      { id: "order", label: "Expansion Order & Solution",
        lead: "The <strong>expansion order</strong> is the sequence of nodes the algorithm selects and expands; the <strong>solution path</strong> is only the final route from start to goal.",
        points: [
          "Expansion order is what distinguishes strategies: BFS goes level by level, DFS drains one branch, priority-queue strategies follow their score.",
          "When a goal node is found, the path is rebuilt by following <strong>node.PARENT</strong> pointers back to the root, then reversing.",
          "The <strong>path cost</strong> g is the sum of step costs; the cheapest solution cost is <strong>C*</strong>.",
          "Example: UCS from A to G expands A → C → B → D → E → G (6 nodes) but returns the path A → B → D → G with cost 8 (4 nodes).",
        ],
        formula: "g(path) = Σ c(s<sub>i−1</sub>, a<sub>i</sub>, s<sub>i</sub>) &nbsp;·&nbsp; C* = min { g(p) : p is a solution }",
        checks: [
          { q: "Does the expansion order include dead ends?", options: ["Yes", "No"], answer: "Yes", why: "It lists every node expanded; the solution path is only the final route." },
          { q: "How is the solution path recovered?", options: ["Follow PARENT pointers from the goal and reverse", "Read the frontier", "Sort the reached table"], answer: "Follow PARENT pointers from the goal and reverse", why: "Each node remembers the node it came from." },
        ],
        remember: ["Expansion order: how the search worked. Solution path: what it returns."] },
      { id: "redundant", label: "Redundant Paths & Graph Search",
        lead: "A <strong>redundant path</strong> is a second path to a state already in <em>reached</em>.",
        points: [
          "Redundant paths waste work and, with cycles, can make a search run forever.",
          "<strong>Tree-like search</strong> keeps every path as its own node (frontier only, no memory).",
          "<strong>Graph search</strong> checks reached[state] before adding a child and drops it unless the new path is cheaper; each state is expanded at most once.",
          "Every strategy can run either way; the lecture runs graph search.",
        ],
        checks: [
          { q: "Which version can re-explore the same state many times?", options: ["Tree-like search", "Graph search"], answer: "Tree-like search", why: "It keeps no reached table." },
          { q: "Graph search adds a child for an already-reached state only if…", options: ["the new path is cheaper", "it is the goal", "never"], answer: "the new path is cheaper", why: "child.PATH-COST < reached[child.STATE].PATH-COST." },
        ],
        remember: ["Graph search = tree search + a reached table."] },
    ] },
    { id: "structures", label: "Data Structures", source: "AIMA (4th ed.) §3.3", subs: [
      { id: "node", label: "The Search Node",
        lead: "A search-tree node bundles four fields, not just a state.",
        points: [
          "<strong>node.STATE</strong>: which state it represents.",
          "<strong>node.PARENT</strong>: the node it was expanded from.",
          "<strong>node.ACTION</strong>: the action that produced it.",
          "<strong>node.PATH-COST</strong> = g(node): cost of the path from the initial state.",
        ],
        example: "<table class='ag-table ui'><thead><tr><th class='l'>field</th><th class='l'>node for C, reached from A via Go(C)</th></tr></thead><tbody>" +
          "<tr><td class='l'>STATE</td><td class='l'>C</td></tr><tr><td class='l'>PARENT</td><td class='l'>A</td></tr><tr><td class='l'>ACTION</td><td class='l'>Go(C)</td></tr><tr class='is-hl'><td class='l'>PATH-COST</td><td class='l'>g(C) = 2</td></tr></tbody></table>",
        checks: [
          { q: "Which field lets the algorithm rebuild the solution?", options: ["PARENT", "STATE", "PATH-COST"], answer: "PARENT", why: "Walking PARENT back to the root gives the path." },
          { q: "Parent has g = 4; the action costs 3. The child's PATH-COST is…", options: ["7", "3", "4"], answer: "7", why: "g(child) = g(parent) + step cost." },
        ],
        remember: ["Node = STATE + PARENT + ACTION + PATH-COST."] },
      { id: "frontier-types", label: "Frontier Operations & Types",
        lead: "Every frontier supports four operations; its <strong>ordering rule</strong> is what turns one generic loop into a specific strategy.",
        points: [
          "<strong>IS-EMPTY</strong> and <strong>TOP</strong> only peek; <strong>POP</strong> and <strong>ADD</strong> change the contents.",
          "<strong>FIFO queue:</strong> oldest first → breadth-first.",
          "<strong>LIFO stack:</strong> newest first → depth-first.",
          "<strong>Priority queue:</strong> lowest score first → g for UCS, h for greedy, g + h for A*.",
        ],
        example: "<table class='ag-table ui'><thead><tr><th class='l'>frontier</th><th class='l'>pops</th><th class='l'>strategy</th></tr></thead><tbody>" +
          "<tr><td class='l'>FIFO queue</td><td class='l'>oldest</td><td class='l'>BFS</td></tr><tr><td class='l'>LIFO stack</td><td class='l'>newest</td><td class='l'>DFS, IDS</td></tr><tr class='is-hl'><td class='l'>priority queue</td><td class='l'>lowest f</td><td class='l'>UCS (g), greedy (h), A* (g + h)</td></tr></tbody></table>",
        checks: [
          { q: "Nodes added in the order X, Y, Z. A LIFO stack pops first…", options: ["Z", "X", "Y"], answer: "Z", why: "Last in, first out." },
          { q: "Which operations change the frontier?", options: ["POP and ADD", "TOP and IS-EMPTY", "All four"], answer: "POP and ADD", why: "TOP and IS-EMPTY only look." },
        ],
        remember: ["Change the frontier's ordering rule, change the strategy."] },
      { id: "best-first", label: "Best-First Search",
        lead: "With a node structure and a swappable frontier, the whole search loop is eleven lines.",
        example: BFS_CODE,
        points: [
          "Pop a node, test it; if it is not the goal, expand it and add every child that is new or reached more cheaply than before.",
          "Stop with failure when the frontier is empty, or with success when a popped node passes the goal test.",
          "BFS, DFS, UCS, greedy and A* are this loop with a different line 3 (the kind of queue).",
        ],
        checks: [
          { q: "Where is the goal test in this generic loop?", options: ["Right after POP", "When a child is generated", "Before the loop"], answer: "Right after POP", why: "That is the standard goal test." },
          { q: "BEST-FIRST-SEARCH returns failure when…", options: ["the frontier is empty", "a node is reached twice", "the first child is not a goal"], answer: "the frontier is empty", why: "Nothing is left to explore." },
        ],
        remember: ["One loop, many strategies: only the frontier changes."] },
    ] },
    { id: "uninformed", label: "Uninformed Search", source: "AIMA (4th ed.) §3.4", subs: [
      { id: "informed-vs", label: "Uninformed vs. Informed",
        lead: "<strong>Uninformed</strong> strategies know only the problem definition. <strong>Informed</strong> strategies also use a <strong>heuristic</strong> h(n): an estimate of the cost from n to the nearest goal.",
        points: [
          "<strong>g(n)</strong>: cost already paid to reach n. <strong>h(n)</strong>: estimated cost still to go.",
          "Uninformed: BFS, DFS, UCS, IDS, bidirectional. Informed: greedy, A*, SMA*.",
          "<strong>f(n) = g(n) + h(n)</strong> estimates the cost of the cheapest solution through n.",
          "A node unremarkable by g alone can rank first once h shows it is close to the goal.",
        ],
        formula: "f(n) = g(n) + h(n)",
        checks: [
          { q: "g(n) = 4, h(n) = 6. f(n) = ?", options: ["10", "2", "24"], answer: "10", why: "f = g + h." },
          { q: "Which strategy is informed?", options: ["A*", "UCS", "IDS"], answer: "A*", why: "It uses h(n)." },
        ],
        remember: ["g = spent so far, h = estimate to go."] },
      { id: "bfs", label: "Breadth-First Search",
        lead: "<strong>BFS</strong> expands the shallowest node first, using a <strong>FIFO queue</strong>, and tests each child for the goal as soon as it is generated (<strong>early goal test</strong>).",
        points: [
          "It finishes each depth level before starting the next.",
          "The first goal generated is the <strong>shallowest</strong>, not necessarily the cheapest.",
          "Complete if b is finite; optimal only when every step costs the same.",
        ],
        example: "<table class='ag-table ui'><tbody><tr><th class='l'>f(n)</th><td class='l'>depth(n)</td></tr><tr><th class='l'>frontier</th><td class='l'>FIFO queue</td></tr><tr><th class='l'>goal test</th><td class='l'>early (on generation)</td></tr><tr><th class='l'>complete?</th><td class='l'>yes, if b finite</td></tr><tr><th class='l'>optimal?</th><td class='l'>only if step costs are equal</td></tr><tr><th class='l'>time / space</th><td class='l'>O(b<sup>d</sup>) / O(b<sup>d</sup>)</td></tr></tbody></table>",
        checks: [
          { q: "A depth-1 path costs 10; a depth-2 path costs 8. BFS returns…", options: ["the cost-10 path", "the cost-8 path"], answer: "the cost-10 path", why: "BFS stops at the shallowest goal it generates." },
          { q: "BFS's frontier is a…", options: ["FIFO queue", "LIFO stack", "priority queue on g"], answer: "FIFO queue", why: "Oldest first gives level-by-level order." },
        ],
        remember: ["BFS = shallowest first; optimal only for equal step costs."] },
      { id: "dfs", label: "Depth-First Search",
        lead: "<strong>DFS</strong> expands the deepest node first, using a <strong>LIFO stack</strong>, and follows one branch to the end before backtracking.",
        points: [
          "Standard goal test (on pop). Successors are pushed in reverse order so they pop in left-to-right order.",
          "Not complete in general: it can run forever down an infinite or cyclic branch (fine in a finite space with graph search).",
          "Not optimal. Its strength is memory: only the current path plus siblings, <strong>O(bm)</strong>.",
        ],
        example: "<table class='ag-table ui'><tbody><tr><th class='l'>frontier</th><td class='l'>LIFO stack</td></tr><tr><th class='l'>goal test</th><td class='l'>standard (on pop)</td></tr><tr><th class='l'>complete?</th><td class='l'>no, in general</td></tr><tr><th class='l'>optimal?</th><td class='l'>no</td></tr><tr><th class='l'>time / space</th><td class='l'>O(b<sup>m</sup>) / O(bm)</td></tr></tbody></table>",
        checks: [
          { q: "Why push successors in reverse order?", options: ["So they pop in the usual left-to-right order", "To make DFS optimal", "To save memory"], answer: "So they pop in the usual left-to-right order", why: "A stack reverses the push order." },
          { q: "b = 3, m = 10. DFS stores about how many nodes?", options: ["30", "3¹⁰", "13"], answer: "30", why: "O(bm): roughly b nodes per level along one path." },
        ],
        remember: ["DFS: tiny memory, no guarantees."] },
      { id: "ucs", label: "Uniform-Cost Search",
        lead: "<strong>UCS</strong> uses a priority queue ordered by <strong>g(n)</strong> and always expands the cheapest node.",
        points: [
          "Standard goal test: a goal is returned only when nothing cheaper is left on the frontier.",
          "If a cheaper path to a state turns up later, reached is updated.",
          "Complete if every step costs at least ε &gt; 0; always <strong>optimal</strong>.",
        ],
        formula: "f(n) = g(n) &nbsp;·&nbsp; time = space = O(b<sup>1 + ⌊C*/ε⌋</sup>)",
        checks: [
          { q: "Why must UCS use the standard (late) goal test?", options: ["A cheaper path to the goal may still be on the frontier", "It is faster", "BFS does the same"], answer: "A cheaper path to the goal may still be on the frontier", why: "Testing on generation could return a more expensive path." },
          { q: "b = 2, C* = 6, ε = 2. UCS bound O(b<sup>1+⌊C*/ε⌋</sup>) = ?", options: ["2⁴ = 16", "2³ = 8", "2⁶ = 64"], answer: "2⁴ = 16", why: "1 + ⌊6/2⌋ = 4." },
        ],
        remember: ["UCS = BFS with cost instead of depth: optimal for any positive costs."] },
      { id: "ids", label: "Iterative Deepening",
        lead: "<strong>IDS</strong> runs depth-limited DFS with limit 0, 1, 2, … until a goal is found.",
        points: [
          "Each iteration starts from scratch and repeats the shallow levels.",
          "The repetition is cheap: most nodes are in the deepest level, so time is still <strong>O(b<sup>d</sup>)</strong>.",
          "It combines BFS's completeness (finite b) with DFS's memory, <strong>O(bd)</strong>.",
          "Optimal only if all step costs are equal: it finds the same shallowest goal BFS would.",
        ],
        checks: [
          { q: "The goal is at depth 3. IDS finds it with limit…", options: ["3", "2", "4"], answer: "3", why: "Limits 0–2 fail; limit 3 reaches it." },
          { q: "IDS's memory use is…", options: ["O(bd)", "O(b^d)", "O(1)"], answer: "O(bd)", why: "One depth-limited DFS path at a time." },
        ],
        remember: ["IDS = BFS's guarantees with DFS's memory."] },
      { id: "bidirectional", label: "Bidirectional Search",
        lead: "<strong>Bidirectional search</strong> searches forward from the start and backward from the goal at the same time and stops when they meet.",
        points: [
          "If both sides grow at similar rates they meet near the middle, needing roughly the <strong>square root</strong> of the one-directional node count.",
          "<strong>BiBF</strong>: two priority queues ordered by g; expand the side with the cheaper node; keep going after the first meeting until no cheaper meeting is possible.",
          "Run this way it is complete (costs ≥ ε &gt; 0) and optimal.",
        ],
        formula: "b<sup>d/2</sup> + b<sup>d/2</sup> ≪ b<sup>d</sup>",
        checks: [
          { q: "b = 10, d = 6. One-directional ≈ 10⁶ nodes; bidirectional ≈ ?", options: ["2 × 10³", "10⁵", "5 × 10⁵"], answer: "2 × 10³", why: "Each side goes to depth 3: 10³ + 10³." },
          { q: "Why not stop at the first meeting point?", options: ["A cheaper meeting may still be possible", "The searches must cover everything", "To check the goal test"], answer: "A cheaper meeting may still be possible", why: "Stopping early could miss the optimal path." },
        ],
        remember: ["Meet in the middle: square-root savings."] },
    ] },
    { id: "informed", label: "Informed Search", source: "AIMA (4th ed.) §3.5", subs: [
      { id: "greedy", label: "Greedy Best-First",
        lead: "<strong>Greedy search</strong> orders the frontier by <strong>h(n)</strong> alone: always expand the node that looks closest to the goal.",
        points: [
          "It ignores g(n), the cost already paid, so it can commit to an expensive path that merely <em>looks</em> close.",
          "Fast with a good heuristic; not optimal; not complete in general (complete in finite spaces with graph search).",
        ],
        formula: "f(n) = h(n) &nbsp;·&nbsp; worst case O(b<sup>m</sup>) time and space",
        checks: [
          { q: "Greedy search ignores…", options: ["g(n)", "h(n)", "the goal test"], answer: "g(n)", why: "It ranks only by the estimated distance to go." },
          { q: "Is greedy best-first search optimal?", options: ["No", "Yes", "Only with admissible h"], answer: "No", why: "Even a perfect-looking h can lure it down a costly path." },
        ],
        remember: ["Greedy: fast, short-sighted, not optimal."] },
      { id: "astar", label: "A* Search",
        lead: "<strong>A*</strong> orders the frontier by <strong>f(n) = g(n) + h(n)</strong>: honest about the cost paid and aimed at the goal.",
        points: [
          "<strong>Admissible</strong> h never overestimates the true cost to go (h ≤ h*): A* tree search is optimal.",
          "<strong>Consistent</strong> h satisfies h(n) ≤ c(n, a, n′) + h(n′) on every edge: A* graph search is optimal without re-expanding nodes.",
          "With a good heuristic A* expands far fewer nodes than UCS and still finds the optimal path. h = 0 turns A* into UCS.",
          "Worst case still exponential; it keeps every generated node in memory.",
        ],
        formula: "f(n) = g(n) + h(n) &nbsp;·&nbsp; admissible: h(n) ≤ h*(n) &nbsp;·&nbsp; consistent: h(n) ≤ c(n, a, n′) + h(n′)",
        checks: [
          { q: "True cost to goal from n is 7. Which h(n) is admissible?", options: ["5", "8", "10"], answer: "5", why: "Admissible means h ≤ the true remaining cost." },
          { q: "h(A) = 4, c(A, C) = 1, h(C) = 1. Is h consistent on this edge?", options: ["No", "Yes"], answer: "No", why: "4 > 1 + 1. A* may then have to re-expand C (Practice, Exercise 2)." },
          { q: "A* with h(n) = 0 for every n behaves like…", options: ["UCS", "BFS", "greedy"], answer: "UCS", why: "f = g." },
        ],
        remember: ["A* = UCS + heuristic. Admissible for trees, consistent for graphs."] },
      { id: "sma", label: "SMA*",
        lead: "<strong>SMA*</strong> (simplified memory-bounded A*) is A* with a hard cap on the number of nodes held.",
        points: [
          "When memory is full it forgets the <strong>worst leaf</strong> (highest f) and backs its f-value up to the parent.",
          "The backed-up value lets it regenerate that branch later if everything else turns out worse.",
          "Complete and optimal if a solution fits in memory; may take longer than A* because of regeneration.",
        ],
        checks: [
          { q: "Which node does SMA* drop when memory is full?", options: ["The leaf with the highest f", "The oldest node", "The root"], answer: "The leaf with the highest f", why: "It is the least promising." },
          { q: "Why back up the forgotten leaf's f to its parent?", options: ["So the parent is not mistaken for cheaper than it is", "To free more memory", "To speed up the goal test"], answer: "So the parent is not mistaken for cheaper than it is", why: "The branch can still be regenerated if needed." },
        ],
        remember: ["SMA*: A* that forgets wisely."] },
      { id: "goal-test", label: "Standard vs. Early Goal Test",
        lead: "The <strong>standard</strong> test checks a node when it is popped; the <strong>early</strong> test checks each child as it is generated.",
        points: [
          "Early testing can stop one generation sooner.",
          "Safe for <strong>BFS</strong>: with equal step costs the first goal generated is the shallowest.",
          "Unsafe for <strong>UCS and A*</strong>: a goal generated early may not be the cheapest; a cheaper path may still be waiting.",
        ],
        formula: "standard: IS-GOAL(node.STATE) on POP &nbsp;·&nbsp; early: IS-GOAL(child.STATE) on EXPAND",
        checks: [
          { q: "Which algorithm can safely use the early goal test?", options: ["BFS", "UCS", "A*"], answer: "BFS", why: "Depth never decreases after generation; g(n) of a state can." },
        ],
        remember: ["Early test: BFS only."] },
    ] },
    { id: "evaluation", label: "Evaluating Search", source: "AIMA (4th ed.) §3.4–3.5", subs: [
      { id: "params", label: "b, d, m, C*, ε",
        lead: "Four criteria (completeness, optimality, time, space) are stated in terms of five quantities.",
        points: [
          "<strong>b</strong>: branching factor. <strong>d</strong>: depth of the shallowest solution. <strong>m</strong>: maximum depth.",
          "<strong>C*</strong>: cost of the optimal solution. <strong>ε</strong>: smallest step cost (ε &gt; 0).",
          "Depth and cost are different things: the shallowest goal need not be the cheapest.",
        ],
        figure: FIG[0],
        checks: [
          { q: "In the figure, the shallowest goal n6 costs 5 and the cheapest goal n8 costs 3. C* = ?", options: ["3", "5", "2"], answer: "3", why: "C* is the optimal cost, regardless of depth." },
          { q: "d in the figure is…", options: ["2", "3", "1"], answer: "2", why: "d is the depth of the shallowest goal (n6)." },
        ],
        remember: ["d and m are depths; C* and ε are costs."] },
      { id: "time-space", label: "Time & Space",
        lead: "Time = number of nodes generated; space = number of nodes stored at once.",
        example: "<table class='ag-table ui'><thead><tr><th class='l'>strategy</th><th>time</th><th>space</th></tr></thead><tbody>" +
          "<tr><td class='l'>BFS</td><td>O(b<sup>d</sup>)</td><td>O(b<sup>d</sup>)</td></tr><tr><td class='l'>DFS</td><td>O(b<sup>m</sup>)</td><td class='is-best'>O(bm)</td></tr><tr><td class='l'>IDS</td><td>O(b<sup>d</sup>)</td><td class='is-best'>O(bd)</td></tr>" +
          "<tr><td class='l'>UCS</td><td>O(b<sup>1+⌊C*/ε⌋</sup>)</td><td>O(b<sup>1+⌊C*/ε⌋</sup>)</td></tr><tr><td class='l'>Greedy</td><td>O(b<sup>m</sup>)</td><td>O(b<sup>m</sup>)</td></tr><tr><td class='l'>A*</td><td>exp. (≈ O(b<sup>d</sup>))</td><td>O(b<sup>d</sup>)</td></tr><tr><td class='l'>SMA*</td><td>≥ A*</td><td>memory limit</td></tr></tbody></table>",
        points: [
          "BFS, UCS and A* keep every generated node, so space matches time.",
          "DFS and IDS keep only the current path and siblings: linear space.",
          "That trade-off is why IDS exists.",
        ],
        checks: [
          { q: "Which two strategies use linear memory?", options: ["DFS and IDS", "BFS and UCS", "A* and greedy"], answer: "DFS and IDS", why: "O(bm) and O(bd)." },
          { q: "b = 2, d = 10. BFS time ≈ ?", options: ["2¹⁰ ≈ 1,000", "20", "10²"], answer: "2¹⁰ ≈ 1,000", why: "O(b<sup>d</sup>)." },
        ],
        remember: ["Memory, not time, is usually what runs out first for BFS."] },
      { id: "complete-optimal", label: "Completeness & Optimality",
        lead: "<strong>Complete:</strong> finds a solution whenever one exists (and reports failure otherwise). <strong>Optimal:</strong> the returned solution costs C*.",
        points: [
          "Finite b prevents getting stuck on one node's infinite children.",
          "Step costs ≥ ε &gt; 0 prevent chasing an infinite chain of ever-cheaper paths.",
          "BFS, IDS, UCS and A* are complete under their conditions; DFS and greedy are not in general.",
          "BFS can return a shallow, expensive path (cost 10) while a cheaper one (cost 8) is still unexplored; UCS and A* cannot.",
        ],
        checks: [
          { q: "Which is complete AND optimal for arbitrary positive step costs?", options: ["UCS", "BFS", "DFS"], answer: "UCS", why: "BFS is optimal only for equal costs; DFS is neither." },
          { q: "Why does UCS need ε &gt; 0?", options: ["To avoid infinitely many ever-cheaper paths", "To keep b finite", "To use a priority queue"], answer: "To avoid infinitely many ever-cheaper paths", why: "Zero-cost cycles could keep it busy forever." },
        ],
        remember: ["Complete = finds one. Optimal = finds the cheapest."] },
      { id: "compare", label: "Comparing the Strategies",
        lead: "No strategy wins every column; that is why the choice matters.",
        example: "<table class='ag-table ui'><thead><tr><th class='l'>strategy</th><th class='l'>complete?</th><th class='l'>optimal?</th><th>time</th><th>space</th></tr></thead><tbody>" +
          "<tr><td class='l'>BFS</td><td class='l'>yes, b finite</td><td class='l'>equal costs</td><td>O(b<sup>d</sup>)</td><td>O(b<sup>d</sup>)</td></tr>" +
          "<tr><td class='l'>DFS</td><td class='l'>no</td><td class='l'>no</td><td>O(b<sup>m</sup>)</td><td>O(bm)</td></tr>" +
          "<tr><td class='l'>UCS</td><td class='l'>yes, costs ≥ ε</td><td class='l'>yes</td><td>O(b<sup>1+⌊C*/ε⌋</sup>)</td><td>O(b<sup>1+⌊C*/ε⌋</sup>)</td></tr>" +
          "<tr><td class='l'>IDS</td><td class='l'>yes, b finite</td><td class='l'>equal costs</td><td>O(b<sup>d</sup>)</td><td>O(bd)</td></tr>" +
          "<tr><td class='l'>BiBF</td><td class='l'>yes, costs ≥ ε</td><td class='l'>yes</td><td>≈ √ one-way</td><td>≈ √ one-way</td></tr>" +
          "<tr><td class='l'>Greedy</td><td class='l'>no</td><td class='l'>no</td><td>O(b<sup>m</sup>)</td><td>O(b<sup>m</sup>)</td></tr>" +
          "<tr class='is-hl'><td class='l'>A*</td><td class='l'>yes</td><td class='l'>h admissible / consistent</td><td>exponential</td><td>O(b<sup>d</sup>)</td></tr>" +
          "<tr><td class='l'>SMA*</td><td class='l'>if it fits</td><td class='l'>if it fits</td><td>≥ A*</td><td>bounded</td></tr></tbody></table>",
        checks: [
          { q: "Memory is tiny and all steps cost 1. Best choice?", options: ["IDS", "BFS", "Greedy"], answer: "IDS", why: "Complete, optimal for equal costs, linear memory." },
          { q: "You have an admissible heuristic and need the cheapest path. Best choice?", options: ["A*", "Greedy", "DFS"], answer: "A*", why: "Optimal, and the heuristic saves work over UCS." },
        ],
        remember: ["Pick by: costs equal? memory? heuristic available?"] },
    ] },
    { id: "practice", label: "Practice", source: "Worked exercises · instructions/exercises.md · AIMA Ch. 3", subs: [
      { id: "ex1", label: "1 · Four Traces on a Tree", exercise: true,
        problem: "Successors are considered alphabetically (DFS and IDS push them in reverse so they pop alphabetically). Goal: <strong>O</strong>. Find the expansion order, path and cost for BFS, DFS, IDS and UCS on the tree below.",
        figure: FIG[1],
        tasks: [
          { type: "num", label: "BFS: number of nodes expanded", answer: 10, tol: 0, hint: "START, A, B, C, D, E, F, G, H, I (early goal test fires when I generates O)" },
          { type: "num", label: "DFS: number of nodes expanded", answer: 17, tol: 0, hint: "All 13 nodes under A are expanded before B." },
          { type: "num", label: "IDS: depth limit at which O is found", answer: 4, tol: 0 },
          { type: "num", label: "UCS: number of nodes expanded", answer: 4, tol: 0 },
          { type: "num", label: "Path cost of the solution (all four)", answer: 4, tol: 0 },
        ],
        steps: [
          "<strong>BFS</strong> (early test): START, A, B, C, D, E, F, G, H, I. Expanding I generates O, which passes the test at once. Path START → B → E → I → O, cost 1 + 1 + 1 + 1 = <strong>4</strong>.",
          "<strong>DFS</strong>: A pops before B, so the whole A-subtree comes first: START, A, C, G, M, Q, S, U, V, T, R, N, H, D, B, E, I (<strong>17</strong> nodes). Then O is I's first child. Same path, cost 4. It matches BFS only because O is alphabetically first on the B branch.",
          "<table class='ag-table ui'><thead><tr><th>limit</th><th class='l'>nodes selected</th><th>goal?</th></tr></thead><tbody><tr><td>0</td><td class='l'>START</td><td>no</td></tr><tr><td>1</td><td class='l'>START, A, B</td><td>no</td></tr><tr><td>2</td><td class='l'>START, A, C, D, B, E, F</td><td>no</td></tr><tr><td>3</td><td class='l'>START, A, C, G, H, D, B, E, I, J, F</td><td>no</td></tr><tr class='is-hl'><td>4</td><td class='l'>START, A, C, G, M, N, H, D, B, E, I, O</td><td>yes</td></tr></tbody></table><strong>IDS</strong> finds O with limit <strong>4</strong> (at limit 3, I is at the limit and is not expanded).",
          "<strong>UCS</strong>: B (g = 1) beats A (g = 5): START, B, E (g = 2), I (g = 3). O is generated with g = 4 &lt; 5, so it is popped next and passes the test. Only <strong>4</strong> expansions; A is never expanded.",
          "<strong>Lesson:</strong> on a tree every node has one path, so all four agree on the cost-4 answer. What differs is the work: UCS 4 expansions, DFS 17.",
        ] },
      { id: "ex2", label: "2 · UCS, Greedy, A*", exercise: true,
        problem: "Successors are generated alphabetically. Start <strong>S</strong>, goal <strong>G</strong>. Edge costs and h(n) are in the graph. Find expansion order, path and cost for UCS, greedy and A*.",
        figure: FIG[2],
        tasks: [
          { type: "num", label: "UCS path cost", answer: 5, tol: 0 },
          { type: "num", label: "Greedy path cost", answer: 6, tol: 0 },
          { type: "num", label: "A* path cost", answer: 5, tol: 0 },
          { type: "num", label: "A*: number of expansions (counting C twice)", answer: 5, tol: 0 },
          { type: "mcq", q: "Why does A* expand C twice?", options: ["h is admissible but not consistent", "h overestimates", "There is a cycle"], answer: "h is admissible but not consistent", why: "h(A) = 4 > c(A, C) + h(C) = 2, so the first path to C was not the cheapest." },
        ],
        steps: [
          "<strong>UCS</strong> (by g): g(A) = g(B) = 1, A first (alphabetical). g(C) = min(1 + 1, 1 + 2) = 2 via A; g(G) = 2 + 3 = 5. Order S, A, B, C; path S → A → C → G, cost <strong>5</strong>.",
          "<strong>Greedy</strong> (by h): from S, h(A) = 4, h(B) = 1 → B; then C (h = 1); then G (h = 0). Order S, B, C; path S → B → C → G, cost 1 + 2 + 3 = <strong>6</strong>. Not optimal.",
          "<strong>A*</strong> (by f): f(A) = 1 + 4 = 5, f(B) = 1 + 1 = 2 → B. f(C) = 3 + 1 = 4 → C, which generates G with f = 6.",
          "Pop A (f = 5): C via A has g = 2 &lt; 3, so f(C) = 3 and C is reopened. Expanding C again gives G with f = 5 &lt; 6. G is popped.",
          "A* order S, B, C, A, C (<strong>5</strong> expansions); path S → A → C → G, cost <strong>5</strong>.",
          "<table class='ag-table ui'><thead><tr><th class='l'>algorithm</th><th class='l'>order</th><th class='l'>path</th><th>cost</th></tr></thead><tbody><tr><td class='l'>UCS</td><td class='l'>S, A, B, C</td><td class='l'>S→A→C→G</td><td>5</td></tr><tr><td class='l'>Greedy</td><td class='l'>S, B, C</td><td class='l'>S→B→C→G</td><td>6</td></tr><tr><td class='l'>A*</td><td class='l'>S, B, C, A, C</td><td class='l'>S→A→C→G</td><td>5</td></tr></tbody></table>",
        ] },
      { id: "ex3", label: "3 · Early Goal Test", exercise: true,
        problem: "Build a small weighted graph showing why the early goal test is safe for BFS but not for UCS.",
        figure: FIG[3],
        tasks: [
          { type: "num", label: "Cost UCS would report with an early goal test", answer: 10, tol: 0 },
          { type: "num", label: "True optimal cost S → A → G", answer: 2, tol: 0 },
          { type: "mcq", q: "Why is the early test safe for BFS?", options: ["Depth never decreases after a node is generated", "BFS ignores costs", "BFS uses a stack"], answer: "Depth never decreases after a node is generated", why: "The first goal generated is the shallowest; g(n), in contrast, can still drop." },
        ],
        steps: [
          "<strong>Graph:</strong> S → G costs 10 (depth 1); S → A costs 1 and A → G costs 1 (depth 2).",
          "<strong>BFS:</strong> it orders by depth; G at depth 1 is the shallowest possible goal, so testing it on generation is safe.",
          "<strong>UCS with early test:</strong> expanding S generates A (g = 1) and G (g = 10); testing G now reports cost <strong>10</strong>.",
          "<strong>UCS with late test:</strong> pop A (g = 1) first, which lowers g(G) from 10 to 2; then G is popped with cost <strong>2</strong>.",
          "<strong>Rule:</strong> depth cannot decrease after generation, but g(n) can. Early test: safe for BFS, unsafe for UCS.",
        ] },
      { id: "ex4", label: "4 · Complexity by Induction", exercise: true,
        problem: "Prove the time and space complexity of BFS, DFS, IDS, UCS, A* and greedy search by induction.",
        figure: FIG[4],
        tasks: [
          { type: "num", label: "b = 2, d = 3: Σ<sub>k=0..d</sub> b<sup>k</sup>", answer: 15, tol: 0 },
          { type: "num", label: "DFS stack bound S(k) = 1 + (b − 1)k for b = 3, k = 4", answer: 9, tol: 0 },
          { type: "num", label: "UCS exponent 1 + ⌊C*/ε⌋ for C* = 10, ε = 2", answer: 6, tol: 0 },
        ],
        steps: [
          "<strong>Lemma:</strong> N(k) ≤ b<sup>k</sup> nodes at level k. Base N(0) = 1 = b⁰. Step N(k + 1) ≤ b · N(k) ≤ b<sup>k+1</sup>. So Σ<sub>k=0..d</sub> b<sup>k</sup> = O(b<sup>d</sup>).",
          "<strong>BFS</strong> stops at level d: time = space = O(b<sup>d</sup>).",
          "<strong>DFS:</strong> stack S(0) = 1, S(k + 1) = S(k) − 1 + b ≤ 1 + (b − 1)(k + 1). Space O(bm); time Σ<sub>k≤m</sub> b<sup>k</sup> = O(b<sup>m</sup>).",
          "<strong>IDS:</strong> Σ<sub>l=0..d</sub> O(b<sup>l</sup>) = O(b<sup>d</sup>) (geometric sum, last term dominates); space O(bd).",
          "<strong>UCS:</strong> group nodes into cost bands j = ⌊g/ε⌋; the lemma re-indexed by band gives O(b<sup>1+⌊C*/ε⌋</sup>) time and space.",
          "<strong>A*:</strong> admissible h gives f(n) ≤ C* on the optimal path; banding by ⌊f/ε⌋ gives the same bound (h = 0 is UCS). <strong>Greedy:</strong> no cost pruning, worst case O(b<sup>m</sup>).",
        ] },
      { id: "ex5", label: "5 · A* Is Optimal", exercise: true,
        problem: "Prove by contradiction that A* (admissible h) is cost-optimal. In the figure, the optimal path S → n → G1 costs C* = 5 with g(n) = 2, h(n) = 2 (true remaining cost 3); a suboptimal goal G2 has g = 8.",
        figure: FIG[5],
        tasks: [
          { type: "num", label: "Upper bound on f(n)", answer: 5, tol: 0, hint: "f(n) = g(n) + h(n) ≤ g(n) + h*(n)" },
          { type: "num", label: "f(G2)", answer: 8, tol: 0 },
          { type: "mcq", q: "So A* pops…", options: ["n before G2", "G2 before n"], answer: "n before G2", why: "f(n) ≤ 5 < 8 = f(G2)." },
        ],
        steps: [
          "<strong>Assume</strong> A* selects the suboptimal goal G2 first, with g(G2) = 8 &gt; C* = 5.",
          "Some node n on the optimal path is on the frontier: g(n) + h*(n) = C* = 2 + 3 = 5.",
          "<strong>Admissibility:</strong> f(n) = g(n) + h(n) ≤ g(n) + h*(n) = <strong>5</strong>.",
          "At a goal h = 0, so f(G2) = g(G2) = <strong>8</strong>.",
          "A* always pops the lowest f, and f(n) ≤ 5 &lt; 8, so n is popped before G2: <strong>contradiction</strong>. A* is cost-optimal.",
        ] },
      { id: "ex6", label: "6 · When IDS Is Optimal", exercise: true,
        problem: "Prove that IDS is optimal only if all step costs are equal.",
        figure: FIG[6],
        tasks: [
          { type: "num", label: "Cost of the goal IDS returns in the counterexample", answer: 10, tol: 0 },
          { type: "num", label: "True optimal cost", answer: 2, tol: 0 },
          { type: "mcq", q: "With equal step cost c, cost(path) = …", options: ["c × depth", "c + depth", "depth / c"], answer: "c × depth", why: "So shallowest ⇔ cheapest." },
        ],
        steps: [
          "<strong>Equal costs:</strong> cost(path) = c · depth, so d₁ &lt; d₂ ⇒ c·d₁ &lt; c·d₂. Shallowest = cheapest, and IDS always returns the shallowest goal: optimal.",
          "<strong>Unequal costs counterexample:</strong> goal G1 at depth 1 with cost 10; goal G2 at depth 2 with cost 1 + 1 = 2.",
          "With limit 1, IDS finds G1 and stops, returning cost <strong>10</strong> &gt; 2. Not optimal.",
          "<strong>Conclusion:</strong> IDS is optimal ⇔ cost is proportional to depth (equal step costs).",
        ] },
      { id: "ex7", label: "7 · UCS Complete & Optimal", exercise: true,
        problem: "Prove that UCS is complete and optimal, assuming finite b and every step cost ≥ ε &gt; 0.",
        figure: FIG[7],
        tasks: [
          { type: "num", label: "Bound b<sup>1+⌊K/ε⌋</sup> on nodes with g ≤ K, for b = 2, K = 5, ε = 1", answer: 64, tol: 0 },
          { type: "mcq", q: "In the figure, g(n) = 2, C* = 5, g(G2) = 8. UCS pops…", options: ["n before G2", "G2 before n"], answer: "n before G2", why: "g(n) ≤ C* < g(G2)." },
        ],
        steps: [
          "<strong>Completeness:</strong> every path with g ≤ K has at most ⌊K/ε⌋ steps, so there are at most b<sup>1+⌊K/ε⌋</sup> such nodes: finite. A goal at finite cost C* lies in a finite region UCS explores fully in finite time.",
          "<strong>Optimality (contradiction):</strong> suppose UCS pops G2 with g(G2) = 8 &gt; C* = 5.",
          "A node n on the optimal path is on the frontier with g(n) = 2 ≤ C* = 5 &lt; 8 = g(G2).",
          "UCS always pops the lowest g, so n pops before G2: <strong>contradiction</strong>. UCS is cost-optimal.",
        ] },
      { id: "ex8", label: "8 · DFS Is Not Optimal", exercise: true,
        problem: "Show that depth-first search is not cost-optimal.",
        figure: FIG[8],
        tasks: [
          { type: "num", label: "Cost of the path DFS returns", answer: 10, tol: 0 },
          { type: "num", label: "Optimal cost", answer: 2, tol: 0 },
          { type: "mcq", q: "Does DFS ever visit B in this example?", options: ["No", "Yes"], answer: "No", why: "It stops as soon as it pops G1 under A." },
        ],
        steps: [
          "<strong>Alphabetical order:</strong> pop S, push B then A (A on top).",
          "Pop A, expand it, generating G1. Pop G1: the goal test succeeds and DFS <strong>stops</strong>.",
          "DFS returns S → A → G1 with cost <strong>10</strong>; the optimum is S → B → G2 with cost 1 + 1 = <strong>2</strong>.",
          "10 &gt; 2, and B and G2 are never visited: DFS is not cost-optimal.",
        ] },
    ] },
  ];
  root.READING_NOTES = { tabs: TABS };
})(typeof window !== "undefined" ? window : globalThis);
