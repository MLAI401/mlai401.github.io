/*
  MLAI401 — Topic 04 Reading Notes content (topic04_reading.html).
  Rendered by demos/reading_notes.js (same engine as Topics 06 and 07).
  Figures come from reading_topic04_figs.js. Source: AIMA (4th ed.) Ch. 6.
  Exercises 7–11 are adapted from AIMA Exercises 6.5, 6.6, 6.8, 6.11, 6.15.
*/
(function (root) {
  "use strict";
  const FIG = root.RN_FIGS || [];
  const code = function (s) { return "<pre class='rn-code'>" + s + "</pre>"; };
  const FC_TABLE = "<table class='ag-table ui'><thead><tr><th class='l'>step</th><th>WA</th><th>NT</th><th>Q</th><th>NSW</th><th>V</th><th>SA</th><th>T</th></tr></thead><tbody>" +
    "<tr><td class='l'>initial</td><td>RGB</td><td>RGB</td><td>RGB</td><td>RGB</td><td>RGB</td><td>RGB</td><td>RGB</td></tr>" +
    "<tr><td class='l'>WA = red</td><td class='is-best'>R</td><td>GB</td><td>RGB</td><td>RGB</td><td>RGB</td><td>GB</td><td>RGB</td></tr>" +
    "<tr><td class='l'>Q = green</td><td>R</td><td>B</td><td class='is-best'>G</td><td>RB</td><td>RGB</td><td>B</td><td>RGB</td></tr>" +
    "<tr class='is-hl'><td class='l'>V = blue</td><td>R</td><td>B</td><td>G</td><td>R</td><td class='is-best'>B</td><td style='color:var(--ag-error);font-weight:700'>∅</td><td>RGB</td></tr></tbody></table>";
  const TABS = [
    { id: "define", label: "Defining CSPs", source: "AIMA (4th ed.) §6.1", subs: [
      { id: "xdc", label: "Variables, Domains & Constraints",
        lead: "Topics 01–03 treated states as black boxes. A <strong>constraint satisfaction problem</strong> opens the box: a state is a set of <strong>variables</strong> with values, solved when every <strong>constraint</strong> is satisfied.",
        points: [
          "<strong>X</strong> = {X<sub>1</sub>, …, X<sub>n</sub>}: the variables.",
          "<strong>D</strong>: one domain D<sub>i</sub> of allowed values per variable.",
          "<strong>C</strong>: constraints ⟨scope, relation⟩; the relation is a list of allowed tuples or a test such as X<sub>1</sub> ≠ X<sub>2</sub>.",
          "Running example: colour Australia's 7 regions red, green or blue so that neighbours differ.",
        ],
        formula: "X = {WA, NT, Q, NSW, V, SA, T} · D<sub>i</sub> = {red, green, blue} · C = {SA≠WA, SA≠NT, SA≠Q, SA≠NSW, SA≠V, WA≠NT, NT≠Q, Q≠NSW, NSW≠V}",
        figure: FIG[0],
        checks: [
          { q: "How many binary constraints does the Australia CSP have?", options: ["9", "7", "21"], answer: "9", why: "Five around SA plus WA–NT, NT–Q, Q–NSW, NSW–V." },
          { q: "This representation of states is…", options: ["factored", "atomic", "structured"], answer: "factored", why: "A fixed set of variables, each with a value (Topic 01)." },
        ],
        remember: ["CSP = ⟨X, D, C⟩."] },
      { id: "assignments", label: "Assignments & Solutions",
        lead: "An <strong>assignment</strong> gives values to some or all variables.",
        points: [
          "<strong>Consistent</strong> (legal): violates no constraint. <strong>Complete</strong>: every variable has a value.",
          "A <strong>solution</strong> is a complete, consistent assignment. A <strong>partial solution</strong> is a consistent partial assignment.",
          "A partial assignment can already be inconsistent: WA = NT = red rules out all 3⁵ = 243 completions at once. A black-box state cannot do that.",
        ],
        checks: [
          { q: "{WA = red, NT = green} is…", options: ["consistent and partial", "a solution", "inconsistent"], answer: "consistent and partial", why: "No constraint is broken, but 5 variables are unassigned." },
          { q: "WA = NT = red. How many completions are ruled out (3 colours, 5 other regions)?", options: ["243", "15", "2,187"], answer: "243", why: "3⁵ = 243." },
        ],
        remember: ["Solution = complete + consistent."] },
      { id: "graph", label: "The Constraint Graph",
        lead: "A binary CSP is drawn as a <strong>constraint graph</strong>: a node per variable, an edge per constraint.",
        points: [
          "<strong>Tasmania</strong> has degree 0: an independent subproblem; any colour works.",
          "<strong>SA</strong> has degree 5: the natural variable to decide first (degree heuristic) and to remove to break every cycle (cutset conditioning).",
        ],
        checks: [
          { q: "Which region has the highest degree?", options: ["SA", "NSW", "T"], answer: "SA", why: "It borders WA, NT, Q, NSW and V." },
          { q: "A variable of degree 0 is…", options: ["an independent subproblem", "always the first to assign", "inconsistent"], answer: "an independent subproblem", why: "No constraint links it to anything." },
        ],
        remember: ["The graph shows the problem's structure at a glance."] },
      { id: "kinds", label: "Kinds of Constraints",
        lead: "Constraints are classified by how many variables they involve.",
        points: [
          "<strong>Unary:</strong> one variable, e.g. SA ≠ green.",
          "<strong>Binary:</strong> two variables, e.g. SA ≠ NSW. A binary CSP has only unary and binary constraints.",
          "<strong>Global:</strong> any number of variables. <strong>Alldiff</strong> requires all different values (each Sudoku row, column and box).",
          "Cryptarithmetic TWO + TWO = FOUR: Alldiff(F, T, U, W, R, O) plus column constraints such as O + O = R + 10·C<sub>1</sub> with carry variables; drawn as a <em>hypergraph</em>.",
          "Any finite constraint can be turned into binary ones with auxiliary variables (Practice, Exercise 8).",
        ],
        checks: [
          { q: "“Every cell in a Sudoku row is different” is…", options: ["a global Alldiff constraint", "a unary constraint", "a soft constraint"], answer: "a global Alldiff constraint", why: "It involves 9 variables." },
          { q: "SA ≠ green is…", options: ["unary", "binary", "global"], answer: "unary", why: "Only one variable." },
        ],
        remember: ["Unary, binary, global (Alldiff)."] },
      { id: "soft", label: "Hard vs. Soft Constraints",
        lead: "<strong>Hard</strong> constraints must hold; <strong>soft</strong> (preference) constraints say which solutions are better. A CSP with preferences is a <strong>constraint optimisation problem</strong> (COP).",
        points: [
          "Playground timetabling: 12 sessions; each domain is (timeslot, room) = 3 days × 4 periods × 4 rooms = <strong>48</strong> values.",
          "<strong>Hard:</strong> no room or instructor double-booking (binary), capacity and room type (unary), instructor availability (unary), no cohort clash (binary), every course scheduled.",
          "<strong>Soft (penalties):</strong> instructor preferences (2), room too big (1), student dead hours (2 per gap), fatigue (3 per extra class), campus transit (1).",
          "Two phases: backtracking for a feasible timetable, then local search that never breaks a hard constraint. Reference run: 12 assignments, no backtracks; soft penalty 21 → 3.",
        ],
        checks: [
          { q: "Minimising the total penalty of violated soft constraints makes the problem a…", options: ["constraint optimisation problem", "binary CSP", "game"], answer: "constraint optimisation problem", why: "We want the best feasible solution, not just any." },
          { q: "How many (slot, room) values per course?", options: ["48", "12", "16"], answer: "48", why: "3 × 4 × 4." },
        ],
        remember: ["Hard = feasible. Soft = good."] },
      { id: "as-search", label: "CSP as a Search Problem",
        lead: "A CSP can be solved with Topic 02's search using an <strong>incremental</strong> formulation.",
        points: [
          "<strong>Initial state:</strong> the empty assignment { }. <strong>Action:</strong> assign a non-conflicting value to an unassigned variable. <strong>Goal:</strong> complete assignment. <strong>Path cost:</strong> irrelevant; all solutions are at depth n, so use DFS.",
          "Naive: any variable, any value at each level → n! · d<sup>n</sup> leaves.",
          "<strong>Commutativity:</strong> assignment order does not matter, so fix one variable per level → only d<sup>n</sup> leaves.",
        ],
        formula: "naive: n! · d<sup>n</sup> = 7! · 3<sup>7</sup> = 11,022,480 &nbsp;·&nbsp; one variable per level: 3<sup>7</sup> = 2,187",
        checks: [
          { q: "n = 3, d = 2. Leaves with one variable per level?", options: ["8", "48", "6"], answer: "8", why: "d<sup>n</sup> = 2³." },
          { q: "Why does path cost not matter?", options: ["Every solution is at depth n", "All costs are 0 by definition", "CSPs have no goal"], answer: "Every solution is at depth n", why: "Only finding a consistent complete assignment matters." },
        ],
        remember: ["One variable per level: n! times fewer leaves."] },
    ] },
    { id: "propagation", label: "Constraint Propagation", source: "AIMA (4th ed.) §6.2", subs: [
      { id: "node", label: "Node Consistency",
        lead: "A variable is <strong>node-consistent</strong> when every value in its domain satisfies its unary constraints.",
        points: [
          "Enforced once by deleting bad values; then unary constraints can be dropped.",
          "Timetabling example: the ML lab AI302L (24 students, needs a lab; Dr. Okafor unavailable Monday). 36 values fail room type (lecture rooms), 4 fail availability (lab on Monday): <strong>8</strong> of 48 values remain before search.",
        ],
        checks: [
          { q: "48 values, 36 fail one unary constraint, 4 others fail another. Remaining?", options: ["8", "12", "40"], answer: "8", why: "48 − 36 − 4 = 8." },
        ],
        remember: ["Node consistency = apply unary constraints once."] },
      { id: "arc", label: "Arc Consistency",
        lead: "X<sub>i</sub> is <strong>arc-consistent</strong> with X<sub>j</sub> if every value of X<sub>i</sub> has some supporting value in D<sub>j</sub>.",
        points: [
          "<strong>REVISE(X<sub>i</sub>, X<sub>j</sub>)</strong> deletes values of X<sub>i</sub> with no support in D<sub>j</sub>.",
          "Arcs are <strong>directed</strong>: (X, Y) and (Y, X) are revised separately.",
          "Y = X², X, Y ∈ {0…9}: X → {0, 1, 2, 3}; Y → {0, 1, 4, 9}.",
          "It does not always help: uncoloured Australia is already arc-consistent.",
        ],
        checks: [
          { q: "X ∈ {1, 2, 3}, Y ∈ {1, 2}, constraint X &lt; Y. After REVISE(X, Y), D(X) = ?", options: ["{1}", "{1, 2}", "{1, 2, 3}"], answer: "{1}", why: "Only X = 1 has a larger Y (2)." },
          { q: "Revising (X, Y) can remove values from…", options: ["X only", "Y only", "both"], answer: "X only", why: "The arc's tail is the variable revised." },
        ],
        remember: ["Every value needs support across every arc."] },
      { id: "ac3", label: "The AC-3 Algorithm",
        lead: "<strong>AC-3</strong> keeps a queue of arcs and revises until nothing changes or a domain becomes empty.",
        example: code("function AC-3(csp) returns false if an inconsistency is found, true otherwise\n  queue ← all arcs in csp\n  while queue is not empty do\n    (Xi, Xj) ← POP(queue)\n    if REVISE(csp, Xi, Xj) then\n      if size of Di = 0 then return false\n      for each Xk in Xi.NEIGHBORS − {Xj} do\n        add (Xk, Xi) to queue\n  return true\n\nfunction REVISE(csp, Xi, Xj) returns true iff Di was revised\n  revised ← false\n  for each x in Di do\n    if no y in Dj satisfies the constraint with x then\n      delete x from Di; revised ← true\n  return revised"),
        points: [
          "If D<sub>i</sub> shrinks, re-queue every arc (X<sub>k</sub>, X<sub>i</sub>) pointing into X<sub>i</sub>.",
          "Each arc re-enters at most d times; each revision costs O(d²): <strong>O(c · d³)</strong> for c constraints.",
          "WA = red, Q = green: NT and SA both become {blue}; then (SA, NT) empties SA → false, with no search.",
          "WA = red, NT = green: AC-3 alone forces SA = blue, Q = red, NSW = green, V = red.",
        ],
        figure: FIG[1],
        formula: "AC-3 time: O(c · d³)",
        checks: [
          { q: "REVISE(X, Y) removed a value from X. Which arcs go back on the queue?", options: ["(Z, X) for neighbours Z ≠ Y", "(X, Z) for all Z", "None"], answer: "(Z, X) for neighbours Z ≠ Y", why: "Values in Z may have lost their support in X." },
          { q: "c = 9, d = 3. AC-3 bound c · d³ = ?", options: ["243", "81", "27"], answer: "243", why: "9 × 27." },
        ],
        remember: ["AC-3: revise, re-queue arcs into the changed variable, fail on empty."] },
      { id: "path", label: "Path & k-Consistency",
        lead: "Arc consistency can miss contradictions. <strong>Path consistency</strong> looks at triples.",
        points: [
          "Colour the triangle WA–NT–SA with 2 colours: it is arc-consistent but has no solution.",
          "{X<sub>i</sub>, X<sub>j</sub>} is path-consistent w.r.t. X<sub>m</sub> if every consistent pair can be extended to X<sub>m</sub>. PC-2 removes both {WA, NT} pairs and exposes the failure.",
          "<strong>k-consistency:</strong> any consistent assignment to k − 1 variables extends to any k-th. 1 = node, 2 = arc, 3 = path.",
          "Strong n-consistency means no backtracking, but costs exponential time and space, so solvers usually stop at arc or path consistency.",
        ],
        checks: [
          { q: "2-consistency is…", options: ["arc consistency", "node consistency", "path consistency"], answer: "arc consistency", why: "1 node, 2 arc, 3 path." },
          { q: "A 2-colour triangle is arc-consistent. Is it solvable?", options: ["No", "Yes"], answer: "No", why: "Three mutually adjacent nodes need three colours; arc consistency only checks pairs." },
        ],
        remember: ["Stronger consistency, more inference, more cost."] },
      { id: "global", label: "Global Constraints",
        lead: "Global constraints have their own propagation, faster and stronger than splitting them into binary constraints.",
        points: [
          "<strong>Alldiff test:</strong> m variables, n distinct values left in the union of their domains, and m &gt; n → fail (pigeonhole).",
          "NT, SA, Q mutually adjacent, all reduced to {green, blue}: 3 variables, 2 values → fail at once.",
          "<strong>Atmost(10, P<sub>1</sub>, P<sub>2</sub>, P<sub>3</sub>):</strong> fail if the sum of the domains' minimums exceeds 10. Large integer domains use <strong>bounds propagation</strong>.",
        ],
        checks: [
          { q: "Alldiff on 4 variables whose domains together contain {1, 2, 3}. Result?", options: ["Fails", "Satisfiable", "Unknown"], answer: "Fails", why: "4 > 3: pigeonhole." },
        ],
        remember: ["More variables than values ⇒ Alldiff fails."] },
      { id: "sudoku", label: "Sudoku as a CSP",
        lead: "Sudoku is a CSP with 81 variables, domain {1…9}, and 27 Alldiff constraints.",
        points: [
          "One Alldiff per row, column and 3×3 box; every cell has <strong>20 peers</strong>.",
          "Arc consistency alone solves easy newspaper puzzles.",
          "Hard puzzles need search: MAC + MRV solves them in milliseconds. Playground “Hard”: MAC + MRV needs 291 assignments; plain backtracking gives up after 1.5 million constraint checks.",
        ],
        checks: [
          { q: "How many peers does a Sudoku cell have?", options: ["20", "27", "24"], answer: "20", why: "8 in its row + 8 in its column + 4 more in its box." },
          { q: "How many Alldiff constraints?", options: ["27", "9", "81"], answer: "27", why: "9 rows + 9 columns + 9 boxes." },
        ],
        remember: ["Sudoku: 81 variables, 27 Alldiffs, 20 peers each."] },
    ] },
    { id: "backtracking", label: "Backtracking Search", source: "AIMA (4th ed.) §6.3", subs: [
      { id: "algorithm", label: "The Algorithm",
        lead: "<strong>Backtracking search</strong>: depth-first, one variable per level, backtrack when a variable has no legal value.",
        example: code("function BACKTRACK(csp, assignment) returns a solution or failure\n  if assignment is complete then return assignment\n  var ← SELECT-UNASSIGNED-VARIABLE(csp, assignment)\n  for each value in ORDER-DOMAIN-VALUES(csp, var, assignment) do\n    if value is consistent with assignment then\n      add {var = value} to assignment\n      inferences ← INFERENCE(csp, var, assignment)\n      if inferences ≠ failure then\n        add inferences to csp\n        result ← BACKTRACK(csp, assignment)\n        if result ≠ failure then return result\n        remove inferences from csp\n      remove {var = value} from assignment\n  return failure"),
        points: [
          "Three problem-independent hooks: <strong>SELECT-UNASSIGNED-VARIABLE</strong>, <strong>ORDER-DOMAIN-VALUES</strong>, <strong>INFERENCE</strong>.",
          "Fixed order WA, NSW, NT, Q, SA, V, T with no inference: 12 assignments and 5 backtracks for Australia.",
        ],
        checks: [
          { q: "Which hook decides which variable to assign next?", options: ["SELECT-UNASSIGNED-VARIABLE", "ORDER-DOMAIN-VALUES", "INFERENCE"], answer: "SELECT-UNASSIGNED-VARIABLE", why: "MRV and the degree heuristic plug in here." },
        ],
        remember: ["Good hooks turn a slow solver into a fast one."] },
      { id: "mrv", label: "MRV & Degree Heuristic",
        lead: "<strong>Minimum remaining values</strong> (MRV, fail-first): choose the variable with the fewest legal values.",
        points: [
          "After WA = red, NT = green, SA has only blue left, so MRV picks SA.",
          "A variable with 0 legal values is picked at once, so failure is found immediately.",
          "At the start every region has 3 values: MRV ties. The <strong>degree heuristic</strong> breaks ties by most constraints on unassigned variables: SA (5).",
          "Starting with SA, Australia is coloured with no backtracking.",
        ],
        checks: [
          { q: "After WA = red, NT = green, how many legal values does Q have?", options: ["2", "1", "3"], answer: "2", why: "Only green is ruled out (by NT)." },
          { q: "MRV is also called…", options: ["fail-first", "fail-last", "least-constraining"], answer: "fail-first", why: "It tackles the variable most likely to fail." },
        ],
        remember: ["MRV picks the variable; degree breaks ties."] },
      { id: "lcv", label: "Least-Constraining Value",
        lead: "<strong>LCV</strong>: try first the value that rules out the fewest options for neighbours.",
        points: [
          "After WA = red, NT = green, assigning Q: green is illegal; blue would wipe out SA; red leaves SA = blue. LCV tries <strong>red</strong> first.",
          "Variables: fail-first (every variable must be assigned anyway). Values: fail-last (we need only one solution).",
        ],
        checks: [
          { q: "Why prefer the least-constraining value?", options: ["It is most likely to lead to a solution", "It fails fastest", "It is alphabetically first"], answer: "It is most likely to lead to a solution", why: "We only need one solution, so keep options open." },
        ],
        remember: ["Variable: most constrained. Value: least constraining."] },
      { id: "fc", label: "Forward Checking",
        lead: "<strong>Forward checking:</strong> after assigning X, remove inconsistent values from each unassigned neighbour of X; fail if a domain empties.",
        example: FC_TABLE,
        points: [
          "AIMA Fig. 6.7: WA = red, Q = green, V = blue → SA becomes ∅ and the branch fails.",
          "Missed earlier: after Q = green, NT and SA are adjacent and both {blue}, already a contradiction. FC only looks at neighbours of the variable just assigned.",
        ],
        checks: [
          { q: "After WA = red, which domains lose red?", options: ["NT and SA", "Q and NSW", "All others"], answer: "NT and SA", why: "They are WA's neighbours." },
          { q: "Does forward checking check the arc (SA, NT) after Q = green?", options: ["No", "Yes"], answer: "No", why: "Neither SA nor NT was just assigned." },
        ],
        remember: ["FC looks one step ahead, from the new assignment only."] },
      { id: "mac", label: "Maintaining Arc Consistency",
        lead: "<strong>MAC</strong>: after assigning X<sub>i</sub>, run AC-3 starting from the arcs (X<sub>j</sub>, X<sub>i</sub>) of its unassigned neighbours, and keep propagating.",
        points: [
          "When NT shrinks to {blue}, arc (SA, NT) is revised and SA's last value goes: failure one level earlier than FC.",
          "MAC is strictly stronger than forward checking: same first step, but it keeps propagating.",
        ],
        checks: [
          { q: "MAC vs forward checking: which detects failure no later?", options: ["MAC", "Forward checking", "They are always identical"], answer: "MAC", why: "It does FC's work and then propagates further." },
        ],
        remember: ["MAC = backtracking + AC-3 after every assignment."] },
      { id: "backjump", label: "Intelligent Backtracking",
        lead: "<strong>Chronological backtracking</strong> returns to the most recent variable, often the wrong one.",
        points: [
          "Order Q, NSW, V, T, SA with Q = red, NSW = green, V = blue, T = red: SA has no value. Trying other T values is pointless; T is not next to SA.",
          "<strong>Conflict set</strong> conf(SA) = {Q, NSW, V}. <strong>Backjumping</strong> returns to its most recent member: V.",
          "With forward checking, conflict sets come for free.",
          "<strong>Conflict-directed backjumping</strong> merges sets when the target also fails: conf(X<sub>j</sub>) ← conf(X<sub>j</sub>) ∪ conf(X<sub>i</sub>) − {X<sub>j</sub>}.",
          "<strong>Constraint learning</strong> stores the minimal failing set as a <em>no-good</em> so it is never rediscovered.",
        ],
        checks: [
          { q: "conf(SA) = {Q, NSW, V}, order Q, NSW, V, T, SA. Backjump to…", options: ["V", "T", "Q"], answer: "V", why: "The most recent variable in the conflict set." },
        ],
        remember: ["Jump to the cause, not to the previous variable."] },
    ] },
    { id: "structure", label: "Local Search & Structure", source: "AIMA (4th ed.) §6.4–6.5", subs: [
      { id: "min-conflicts", label: "Min-Conflicts",
        lead: "<strong>Local search</strong> starts from a complete assignment and changes one variable at a time.",
        example: code("function MIN-CONFLICTS(csp, max_steps) returns a solution or failure\n  current ← an initial complete assignment\n  for i = 1 to max_steps do\n    if current is a solution then return current\n    var ← a random conflicted variable\n    value ← the v minimizing CONFLICTS(csp, var, v, current)\n    set var = value in current\n  return failure"),
        points: [
          "Pick a random conflicted variable; give it the value with the fewest conflicts (ties random).",
          "On n-queens the run time is almost independent of n: even a million queens take about 50 steps on average after a greedy start.",
          "Incomplete: it cannot prove that no solution exists.",
        ],
        checks: [
          { q: "Min-conflicts uses which formulation?", options: ["Complete-state", "Incremental"], answer: "Complete-state", why: "Every variable always has a value." },
          { q: "Can min-conflicts prove a CSP has no solution?", options: ["No", "Yes"], answer: "No", why: "It is incomplete; running out of steps proves nothing." },
        ],
        remember: ["Random conflicted variable → least-conflict value."] },
      { id: "plateaus", label: "Plateaus, Tabu & Weighting",
        lead: "Min-conflicts landscapes have large <strong>plateaus</strong> of states one conflict away from a solution.",
        points: [
          "<strong>Sideways moves</strong> (same number of conflicts) let the search cross plateaus.",
          "<strong>Tabu search</strong> forbids returning to recently visited states.",
          "<strong>Constraint weighting:</strong> minimise the total weight of violated constraints, then increase the weight of those still violated, focusing on the hard ones.",
          "Local search works <strong>online</strong>: repair a schedule after a change with a few moves.",
        ],
        checks: [
          { q: "In constraint weighting, a constraint that keeps being violated…", options: ["gets heavier", "is deleted", "gets lighter"], answer: "gets heavier", why: "That pushes the search to satisfy it." },
        ],
        remember: ["Sideways moves, tabu lists and weights escape plateaus."] },
      { id: "independent", label: "Independent Subproblems",
        lead: "If the constraint graph has several connected components, solve each separately.",
        formula: "O(d<sup>c</sup> · n / c) instead of O(d<sup>n</sup>)",
        points: [
          "Components of c variables each: work is linear in n.",
          "n = 80 Boolean variables in 4 components of 20: 4 · 2<sup>20</sup> (a fraction of a second) instead of 2<sup>80</sup> (longer than the universe's lifetime at 10⁷ nodes/s).",
        ],
        checks: [
          { q: "d = 2, n = 30, components of 10. Work ≈ ?", options: ["3 · 2¹⁰", "2³⁰", "10 · 2³"], answer: "3 · 2¹⁰", why: "n/c = 3 components, each d<sup>c</sup> = 2¹⁰." },
        ],
        remember: ["Disconnected ⇒ divide and conquer."] },
      { id: "tree", label: "Tree-Structured CSPs",
        lead: "If the constraint graph is a <strong>tree</strong>, the CSP is solvable in time linear in n.",
        example: code("function TREE-CSP-SOLVER(csp) returns a solution or failure\n  X ← TOPOLOGICALSORT(X, root)\n  for j = n down to 2 do\n    MAKE-ARC-CONSISTENT(PARENT(Xj), Xj)\n    if it cannot be made consistent then return failure\n  for i = 1 to n do\n    assignment[Xi] ← any consistent value from Di\n  return assignment"),
        figure: FIG[2],
        points: [
          "<strong>Directional arc consistency:</strong> each X<sub>i</sub> is arc-consistent with every later X<sub>j</sub>.",
          "Backward pass (leaves → root) makes every parent value supported; forward pass (root → leaves) then assigns with <strong>no backtracking</strong>.",
          "n − 1 arcs × O(d²) each: <strong>O(n · d²)</strong>.",
        ],
        formula: "O(n · d²)",
        checks: [
          { q: "n = 10, d = 3. Tree-CSP bound n · d² = ?", options: ["90", "30", "59,049"], answer: "90", why: "10 × 9." },
          { q: "In which direction is the backward pass done?", options: ["Leaves to root", "Root to leaves"], answer: "Leaves to root", why: "So no finished arc is broken later (Exercise 11)." },
        ],
        remember: ["Trees: backward arc consistency, forward assignment, no backtracking."] },
      { id: "cutset", label: "Cutset Conditioning",
        lead: "Many graphs are <strong>nearly</strong> trees. Remove a <strong>cycle cutset</strong> S, try each assignment to S, and solve the remaining tree.",
        figure: FIG[3],
        formula: "O(d<sup>c</sup> · (n − c) · d²), c = |S|",
        points: [
          "Australia: S = {SA}. After SA is assigned, the rest is the chain WA–NT–Q–NSW–V plus isolated T.",
          "Fast when the cutset is small.",
        ],
        checks: [
          { q: "Which single variable is a cycle cutset for Australia?", options: ["SA", "NSW", "T"], answer: "SA", why: "Every cycle passes through SA." },
        ],
        remember: ["Small cutset ⇒ few tree problems."] },
      { id: "decomposition", label: "Tree Decomposition",
        lead: "A <strong>tree decomposition</strong> turns the graph into a tree of overlapping subproblems.",
        points: [
          "Rules: every variable is in some subproblem; every constraint's variables appear together somewhere; a variable in two subproblems is in every subproblem on the path between them.",
          "Australia: {WA, NT, SA}, {NT, SA, Q}, {SA, Q, NSW}, {SA, NSW, V}, {T}.",
          "Each subproblem's solutions become a mega-variable's domain; neighbouring mega-variables must agree on shared variables.",
          "<strong>Tree width</strong> w = largest subproblem − 1 (here 2); solving costs O(n · d<sup>w+1</sup>). Finding the minimum w is NP-hard.",
          "<strong>Symmetry breaking:</strong> colours can be permuted, so a constraint like NT &lt; SA &lt; WA cuts the search by d!.",
        ],
        formula: "O(n · d<sup>w+1</sup>)",
        checks: [
          { q: "Largest subproblem has 3 variables. Tree width = ?", options: ["2", "3", "4"], answer: "2", why: "w = size − 1." },
          { q: "With d = 3 colours, symmetry breaking reduces the search by a factor of…", options: ["6", "3", "9"], answer: "6", why: "3! = 6." },
        ],
        remember: ["Small tree width ⇒ tractable."] },
    ] },
    { id: "evaluation", label: "Evaluating Solvers", source: "AIMA (4th ed.) Ch. 6", subs: [
      { id: "work", label: "Measuring Work",
        lead: "Solvers are compared by counting <strong>assignments</strong>, <strong>backtracks</strong> and <strong>constraint checks</strong>, not wall-clock time.",
        points: [
          "Inference trades checks for assignments: MAC does more checks per node than FC, FC more than plain backtracking.",
          "On tight problems far fewer nodes wins. 20-region random map: plain backtracking 1,113 assignments and 1,093 backtracks; MRV + MAC 20 assignments, 0 backtracks.",
        ],
        checks: [
          { q: "MRV + MAC on 20 regions: how many assignments?", options: ["20", "1,113", "0"], answer: "20", why: "One per variable: no backtracking at all." },
        ],
        remember: ["Count assignments, backtracks and checks."] },
      { id: "complexity", label: "Complexity",
        lead: "General finite-domain CSPs are <strong>NP-complete</strong> (they include 3-SAT). Heuristics change the typical case; structure gives real polynomial cases.",
        example: "<table class='ag-table ui'><thead><tr><th class='l'>algorithm</th><th>time</th><th>space</th></tr></thead><tbody>" +
          "<tr><td class='l'>Backtracking</td><td>O(d<sup>n</sup>)</td><td>O(n)</td></tr><tr><td class='l'>FC / MAC</td><td>O(d<sup>n</sup>)</td><td>O(n · d)</td></tr><tr><td class='l'>AC-3 (once)</td><td>O(c · d³)</td><td>O(c)</td></tr>" +
          "<tr class='is-hl'><td class='l'>Tree CSP</td><td>O(n · d²)</td><td>O(n · d)</td></tr><tr><td class='l'>Cutset conditioning</td><td>O(d<sup>c</sup> (n − c) d²)</td><td>O(n · d)</td></tr><tr><td class='l'>Tree decomposition</td><td>O(n · d<sup>w+1</sup>)</td><td>O(n · d<sup>w</sup>)</td></tr><tr><td class='l'>Min-conflicts</td><td>no bound (incomplete)</td><td>O(n)</td></tr></tbody></table>",
        checks: [
          { q: "Do MRV and LCV improve backtracking's worst case?", options: ["No, only the typical case", "Yes, to polynomial"], answer: "No, only the typical case", why: "The worst case stays O(d<sup>n</sup>)." },
        ],
        remember: ["NP-complete in general; trees are linear."] },
      { id: "matrix", label: "Comparison Matrix",
        lead: "Which method when.",
        example: "<table class='ag-table ui'><thead><tr><th class='l'>property</th><th>BT</th><th>+ heuristics</th><th>+ FC</th><th>MAC</th><th>min-conflicts</th><th>tree solver</th></tr></thead><tbody>" +
          "<tr><td class='l'>complete</td><td>yes</td><td>yes</td><td>yes</td><td>yes</td><td>no</td><td>yes (trees)</td></tr>" +
          "<tr><td class='l'>proves “no solution”</td><td>yes</td><td>yes</td><td>yes</td><td>yes</td><td>no</td><td>yes</td></tr>" +
          "<tr><td class='l'>early failure</td><td>no</td><td>partly</td><td>empty neighbour</td><td>any arc</td><td>—</td><td>yes</td></tr>" +
          "<tr><td class='l'>best for</td><td>tiny</td><td>general</td><td>general</td><td>tight puzzles</td><td>huge / online repair</td><td>tree-like graphs</td></tr></tbody></table>",
        checks: [
          { q: "A huge scheduling problem that must be repaired online after small changes. Best fit?", options: ["Min-conflicts", "Plain backtracking", "Tree solver"], answer: "Min-conflicts", why: "Local search repairs an existing assignment quickly." },
          { q: "A hard Sudoku. Best fit?", options: ["MAC", "Min-conflicts", "Plain backtracking"], answer: "MAC", why: "Tight constraints reward strong propagation." },
        ],
        remember: ["Tight: MAC. Huge/online: min-conflicts. Tree-shaped: tree solver."] },
    ] },
    { id: "practice", label: "Practice", source: "Worked exercises · AIMA Ch. 6 (Exercises 6.5, 6.6, 6.8, 6.11, 6.15)", subs: [
      { id: "ex1", label: "1 · Formulating Australia", exercise: true,
        problem: "For 3-colouring Australia (Figure 1 in tab 1): count variables and binary constraints, complete assignments, leaves of the naive tree, and solutions.",
        tasks: [
          { type: "num", label: "Binary constraints", answer: 9, tol: 0 },
          { type: "num", label: "Complete assignments d<sup>n</sup>", answer: 2187, tol: 0 },
          { type: "num", label: "Naive tree leaves n! · d<sup>n</sup>", answer: 11022480, tol: 0 },
          { type: "num", label: "Number of solutions", answer: 18, tol: 0, hint: "Colour SA, then the path WA–NT–Q–NSW–V, then T." },
        ],
        steps: [
          "<strong>Size:</strong> 7 variables; 9 constraints (five around SA plus WA–NT, NT–Q, Q–NSW, NSW–V).",
          "<strong>Search space:</strong> d<sup>n</sup> = 3⁷ = <strong>2,187</strong>; naive leaves 7! · 3⁷ = 5,040 × 2,187 = <strong>11,022,480</strong>.",
          "<strong>Solutions:</strong> SA: 3 choices. The path WA–NT–Q–NSW–V must avoid SA's colour, so it alternates the other 2: 2 choices. T: 3 choices. 3 × 2 × 3 = <strong>18</strong>.",
        ] },
      { id: "ex2", label: "2 · AC-3 Trace", exercise: true,
        problem: "X, Y, Z ∈ {1, 2, 3, 4}; constraints X &lt; Y and Y &lt; Z. Run AC-3 with queue [(X, Y), (Y, X), (Y, Z), (Z, Y)], FIFO.",
        tasks: [
          { type: "mcq", q: "Final D(X)?", options: ["{1, 2}", "{1, 2, 3}", "{1}"], answer: "{1, 2}", why: "X = 3 loses its support when Y loses 4." },
          { type: "mcq", q: "Final D(Z)?", options: ["{3, 4}", "{2, 3, 4}", "{4}"], answer: "{3, 4}", why: "Z needs some smaller Y ∈ {2, 3}." },
          { type: "num", label: "Total values removed", answer: 6, tol: 0 },
          { type: "num", label: "How many times is (X, Y) revised?", answer: 2, tol: 0 },
        ],
        steps: [
          "<strong>1.</strong> REVISE(X, Y): remove 4 from X → X {1,2,3}.",
          "<strong>2.</strong> REVISE(Y, X): remove 1 from Y → Y {2,3,4}.",
          "<strong>3.</strong> REVISE(Y, Z): remove 4 from Y → Y {2,3}; re-queue (X, Y).",
          "<strong>4.</strong> REVISE(Z, Y): remove 1, 2 from Z → Z {3,4}.",
          "<strong>5.</strong> REVISE(X, Y) again: X = 3 needed Y = 4; remove 3 → X {1,2}.",
          "Queue empty. <strong>X {1,2}, Y {2,3}, Z {3,4}</strong>; 6 values removed.",
        ] },
      { id: "ex3", label: "3 · Forward Checking Trace", exercise: true,
        problem: "From full domains {R, G, B}, assign WA = red, Q = green, V = blue with forward checking after each. Give the domains and say when failure is detected.",
        tasks: [
          { type: "mcq", q: "D(NSW) after Q = green?", options: ["{R, B}", "{R, G, B}", "{B}"], answer: "{R, B}", why: "Green removed by Q." },
          { type: "mcq", q: "At which step does forward checking detect failure?", options: ["After V = blue", "After Q = green", "After WA = red"], answer: "After V = blue", why: "D(SA) becomes empty." },
          { type: "mcq", q: "Which method would detect it one step earlier?", options: ["MAC", "MRV", "LCV"], answer: "MAC", why: "After Q = green, NT and SA are adjacent and both {B}; MAC revises (SA, NT)." },
        ],
        steps: [
          FC_TABLE,
          "<strong>Failure</strong> after V = blue: D(SA) = ∅.",
          "<strong>Earlier contradiction:</strong> after Q = green, NT = {B} and SA = {B} are adjacent. FC does not check (NT, SA); MAC would re-queue (SA, NT) when D(NT) shrinks and fail one level earlier.",
        ] },
      { id: "ex4", label: "4 · Ordering Heuristics", exercise: true,
        problem: "(1) With the empty assignment, what do MRV and MRV + degree choose? (2) With {WA = red, NT = green}, count legal values and give the MRV choice. (3) Order Q's values with LCV.",
        tasks: [
          { type: "mcq", q: "MRV + degree picks first…", options: ["SA", "WA", "T"], answer: "SA", why: "All tie on 3 values; SA has degree 5." },
          { type: "num", label: "Legal values for SA after WA = red, NT = green", answer: 1, tol: 0 },
          { type: "num", label: "Legal values for Q", answer: 2, tol: 0 },
          { type: "mcq", q: "LCV order for Q?", options: ["red, then blue", "blue, then red", "green, red, blue"], answer: "red, then blue", why: "Q = blue would wipe out SA; red leaves 3 values for SA and NSW together." },
        ],
        steps: [
          "<strong>(1)</strong> All variables have 3 values: MRV is a 7-way tie. Degrees: SA 5, NT 3, Q 3, NSW 3, WA 2, V 2, T 0 → degree picks <strong>SA</strong>.",
          "<strong>(2)</strong> SA {blue}: 1 · Q {red, blue}: 2 · NSW, V, T: 3 each. MRV picks <strong>SA</strong>.",
          "<strong>(3)</strong> Q = green is illegal. Q = red: SA {blue}, NSW {green, blue}: 3 values remain. Q = blue: SA {} — wiped out. LCV: <strong>red, then blue</strong>.",
        ] },
      { id: "ex5", label: "5 · Min-Conflicts on 4-Queens", exercise: true,
        problem: "Columns c₁…c₄, rows 1 (top) to 4. State (c₁, c₂, c₃, c₄) = (2, 3, 1, 3). Min-conflicts selects c₂.",
        figure: FIG[4],
        tasks: [
          { type: "num", label: "Number of attacking pairs", answer: 2, tol: 0 },
          { type: "num", label: "CONFLICTS(c₂, row 1)", answer: 3, tol: 0 },
          { type: "num", label: "Best row for c₂", answer: 4, tol: 0 },
          { type: "mcq", q: "Is the new state a solution?", options: ["Yes", "No"], answer: "Yes", why: "(2, 4, 1, 3) has no attacking pairs." },
        ],
        steps: [
          "<strong>Pairs:</strong> (c₁, c₂) on a diagonal; (c₂, c₄) on row 3. Per queen: c₁ 1, c₂ 2, c₃ 0, c₄ 1.",
          "<strong>c₂ candidates:</strong> row 1: 3 conflicts (row with c₃, diagonals with c₁ and c₄) · row 2: 2 · row 3: 2 · row 4: <strong>0</strong>.",
          "Move c₂ to row 4: <strong>(2, 4, 1, 3)</strong>, a solution in one step.",
        ] },
      { id: "ex6", label: "6 · Exploiting Structure", exercise: true,
        problem: "(1) Run TREE-CSP-SOLVER on the tree of Figure 3 (A–B, B–C, B–D, D–E, D–F, all ≠) with A {R, G}, B {R, G}, C {R}, D {G, B}, E {G}, F {B, G}, order A…F. (2) Cutset conditioning on Australia with S = {SA}, d = 3: count operations vs brute force.",
        figure: FIG[2],
        tasks: [
          { type: "mcq", q: "D(B) after the backward pass?", options: ["{G}", "{R}", "{R, G}"], answer: "{G}", why: "B = R has no support in C = {R}." },
          { type: "mcq", q: "Value of D in the solution?", options: ["B", "G"], answer: "B", why: "G was removed by E = {G}." },
          { type: "num", label: "Cutset conditioning operations d<sup>c</sup> · (n − c) · d²", answer: 162, tol: 0 },
          { type: "num", label: "Brute force d<sup>n</sup>", answer: 2187, tol: 0 },
        ],
        steps: [
          "<strong>Backward pass:</strong> (D, F) no change · (D, E) remove G → D {B} · (B, D) no change · (B, C) remove R → B {G} · (A, B) remove G → A {R}.",
          "<strong>Forward pass:</strong> A = R, B = G, C = R, D = B, E = G, F = G. No backtracking.",
          "<strong>Cutset:</strong> c = 1, n = 7, d = 3: 3 · 6 · 9 = <strong>162</strong> vs 3⁷ = <strong>2,187</strong>.",
        ] },
      { id: "ex7", label: "7 · TWO + TWO = FOUR", exercise: true,
        problem: "Every letter is a different digit; T, F ≠ 0; carries C₁, C₂, C₃ ∈ {0, 1}. Constraints: O + O = R + 10C₁ · C₁ + 2W = U + 10C₂ · C₂ + 2T = O + 10C₃ · C₃ = F · Alldiff(F, T, U, W, R, O). Solve with backtracking + forward checking, MRV (ties: degree, then alphabetical) and LCV (ties: smaller digit).",
        figure: FIG[5],
        tasks: [
          { type: "mcq", q: "First variable chosen?", options: ["C₂", "C₁", "T"], answer: "C₂", why: "The carries tie on 2 values; C₂ has the highest degree (6)." },
          { type: "num", label: "F", answer: 1, tol: 0 },
          { type: "num", label: "T", answer: 7, tol: 0 },
          { type: "num", label: "W", answer: 3, tol: 0 },
          { type: "num", label: "FOUR as a number", answer: 1468, tol: 0 },
        ],
        steps: [
          "<strong>Carries first:</strong> C₁ degree 5, C₂ degree 6, C₃ degree 4 → C₂ = 0 (LCV tie → 0), then C₁ = 0.",
          "<strong>C₃ and F:</strong> C₃ = 0 would force F = 0, which is illegal, so LCV tries C₃ = 1; FC leaves D(F) = {1}; MRV picks F = <strong>1</strong>.",
          "<strong>Hundreds column:</strong> 2T = O + 10, so T ≥ 5.",
          "T = 5: O = 0, then R = 0 = O ✗. T = 6: O = 2, R = 4; U = 2W with W ∈ {0, 3} gives U = 0 (= W) or 6 (= T) ✗.",
          "T = 7: O = 4, R = 8, W = 3, U = 6 ✓." + FIG[6],
          "<strong>734 + 734 = 1468</strong>. All failures happen at T; forward checking catches each within one or two levels.",
        ] },
      { id: "ex8", label: "8 · Ternary → Binary", exercise: true,
        problem: "Replace A + B = C by binary constraints using one auxiliary variable X. Domains: D(A) = {1, 2}, D(B) = {1, 2, 3}, D(C) = {3, 4}. Make the new CSP arc-consistent.",
        figure: FIG[7],
        tasks: [
          { type: "num", label: "|D(X)| before arc consistency", answer: 6, tol: 0 },
          { type: "num", label: "|D(X)| after arc consistency", answer: 4, tol: 0 },
          { type: "mcq", q: "Which constraint links X and C?", options: ["C = X₁ + X₂", "C = X₁", "C ≠ X₂"], answer: "C = X₁ + X₂", why: "A = X₁ and B = X₂ are the other two." },
        ],
        steps: [
          "<strong>Auxiliary variable:</strong> X ranges over pairs ⟨a, b⟩: D(X) = D(A) × D(B), 6 pairs.",
          "<strong>Binary constraints:</strong> A = X₁ · B = X₂ · C = X₁ + X₂.",
          "<strong>REVISE(X, C):</strong> keep sums in {3, 4}: ⟨1,2⟩, ⟨1,3⟩, ⟨2,1⟩, ⟨2,2⟩ (drop ⟨1,1⟩ sum 2, ⟨2,3⟩ sum 5). A, B, C keep all values.",
          "The 4 pairs are exactly the 4 solutions: (1,2,3), (1,3,4), (2,1,3), (2,2,4). In general, D(X) can grow as d<sup>k</sup>.",
        ] },
      { id: "ex9", label: "9 · Conflict-Directed Backjumping", exercise: true,
        problem: "3-colour the graph below with {R, G, B}. Order A₁, H, A₄, F₁, A₂, F₂, A₃, T; values R, G, B; no forward checking. Use conflict-directed backjumping, then compare with chronological backtracking.",
        figure: FIG[8],
        tasks: [
          { type: "mcq", q: "conf(A₃) at the first dead end?", options: ["{A₄, H, A₂}", "{F₂, A₂}", "{A₁, H}"], answer: "{A₄, H, A₂}", why: "R by A₄, G by H, B by A₂." },
          { type: "mcq", q: "Where does the second backjump land?", options: ["A₄", "F₁", "F₂"], answer: "A₄", why: "conf(A₂) becomes {A₁, H, A₄}; its most recent member is A₄." },
          { type: "num", label: "Assignments with backjumping", answer: 12, tol: 0 },
          { type: "num", label: "Assignments with chronological backtracking", answer: 24, tol: 0 },
        ],
        steps: [
          "<strong>Forward:</strong> A₁ = R, H = G, A₄ = R, F₁ = R, A₂ = B (conf {A₁, H}), F₂ = R; A₃ has no value: conf(A₃) = {A₄, H, A₂}.",
          "<strong>Jump ①</strong> to A₂ (F₂ skipped): conf(A₂) = {A₁, H} ∪ {A₄, H, A₂} − {A₂} = {A₁, H, A₄}. A₂ has no other value.",
          "<strong>Jump ②</strong> to A₄ (F₁ skipped): A₄ = B." + FIG[9],
          "<strong>Forward again:</strong> F₁ = R, A₂ = B, F₂ = R, A₃ = R, T = B." + FIG[10],
          "<strong>Comparison:</strong> chronological backtracking retries F₂ and F₁, which have nothing to do with the failure: <strong>24</strong> assignments vs <strong>12</strong>.",
        ] },
      { id: "ex10", label: "10 · AC-3 Finds a Dead End", exercise: true,
        problem: "Australia with only WA = green and V = red. Run AC-3 with all 18 arcs (constraint order of tab 1; each X ≠ Y gives (X, Y) then (Y, X)) and show that a domain empties.",
        figure: FIG[11],
        tasks: [
          { type: "mcq", q: "SA is forced to…", options: ["blue", "red", "green"], answer: "blue", why: "It must avoid green (WA) and red (V)." },
          { type: "num", label: "Revisions that change a domain", answer: 9, tol: 0 },
          { type: "mcq", q: "Which domain empties?", options: ["Q", "NSW", "NT"], answer: "Q", why: "Its neighbours NT, SA, NSW are forced to R, B, G." },
        ],
        steps: [
          "SA: remove G (WA) → {R, B}; remove R (V) → {B}. NT: remove G (WA) → {R, B}. NSW: remove R (V) → {G, B}.",
          "NT: remove B (SA) → {R}. Q: remove B (SA) → {R, G}. NSW: remove B (SA) → {G}.",
          "Q: remove G (NSW) → {R}; remove R (NT) → <strong>{ }</strong>: AC-3 returns false (27 arcs popped, 9 revisions changed something)." + FIG[12],
          "<strong>Chain:</strong> WA = G, V = R ⇒ SA = B ⇒ NT = R, NSW = G ⇒ D(Q) = ∅. Forward checking would miss this; MAC rejects V = red at once.",
        ] },
      { id: "ex11", label: "11 · Why Leaves First", exercise: true,
        problem: "TREE-CSP-SOLVER makes arcs (PARENT(X<sub>j</sub>), X<sub>j</sub>) consistent for j = n down to 2. Why leaves first? Use the tree below (A root with children B and D; C child of B; order A, B, D, C).",
        figure: FIG[13],
        tasks: [
          { type: "mcq", q: "Revising (P, X) can remove values from…", options: ["P only", "X only", "both"], answer: "P only", why: "The parent is the arc's tail." },
          { type: "mcq", q: "Root-first, what goes wrong?", options: ["D(B) shrinks after (A, B) was checked, so A = G loses support", "Nothing", "C becomes empty"], answer: "D(B) shrinks after (A, B) was checked, so A = G loses support", why: "A finished arc is broken later." },
        ],
        steps: [
          "<strong>Leaves → root:</strong> (B, C) removes R → B {G}; (A, D) no change; (A, B) removes G → A {R}. Forward: A = R, B = G, D = G, C = R. No backtracking.",
          "<strong>Root → leaves:</strong> (A, B) no change; (A, D) no change; (B, C) removes R → B {G}. Now A = G has no support; the forward pass picks A = G and fails." + FIG[14],
          "<strong>Rule:</strong> revising (P, X) shrinks only D(P), so handle children before parents and no finished arc is broken. O(n · d²), no backtracking.",
        ] },
    ] },
  ];
  root.READING_NOTES = { tabs: TABS };
})(typeof window !== "undefined" ? window : globalThis);
