/*
  MLAI401 — Topic 03 Reading Notes content (topic03_reading.html).
  Rendered by demos/reading_notes.js (same engine as Topics 06 and 07).
  Figures come from reading_topic03_figs.js. Source: AIMA (4th ed.) Ch. 5.
*/
(function (root) {
  "use strict";
  const FIG = root.RN_FIGS || [];
  const MINIMAX_CODE = "<pre class='rn-code'>function MINIMAX-DECISION(state) returns an action\n  return argmax<sub>a ∈ ACTIONS(state)</sub> MIN-VALUE(RESULT(state, a))\n\nfunction MAX-VALUE(state) returns a utility value\n  if TERMINAL-TEST(state) then return UTILITY(state, MAX)\n  v ← −∞\n  for each a in ACTIONS(state) do\n    v ← max(v, MIN-VALUE(RESULT(state, a)))\n  return v\n\nfunction MIN-VALUE(state) returns a utility value\n  if TERMINAL-TEST(state) then return UTILITY(state, MAX)\n  v ← +∞\n  for each a in ACTIONS(state) do\n    v ← min(v, MAX-VALUE(RESULT(state, a)))\n  return v</pre>";
  const AB_CODE = "<pre class='rn-code'>function ALPHA-BETA-SEARCH(state) returns an action\n  v ← MAX-VALUE(state, −∞, +∞)\n  return the action in ACTIONS(state) with value v\n\nfunction MAX-VALUE(state, α, β)\n  if TERMINAL-TEST(state) then return UTILITY(state, MAX)\n  v ← −∞\n  for each a in ACTIONS(state) do\n    v ← max(v, MIN-VALUE(RESULT(state, a), α, β))\n    if v ≥ β then return v      // β-cutoff\n    α ← max(α, v)\n  return v\n\nfunction MIN-VALUE(state, α, β)\n  if TERMINAL-TEST(state) then return UTILITY(state, MAX)\n  v ← +∞\n  for each a in ACTIONS(state) do\n    v ← min(v, MAX-VALUE(RESULT(state, a), α, β))\n    if v ≤ α then return v      // α-cutoff\n    β ← min(β, v)\n  return v</pre>";
  const TABS = [
    { id: "games", label: "Games & Formulation", source: "AIMA (4th ed.) §5.1", subs: [
      { id: "adversarial", label: "Adversarial Environments",
        lead: "In an <strong>adversarial</strong> environment two agents with opposed goals take turns. A fixed path is not enough: the agent needs a <strong>contingency strategy</strong> with a reply to every possible opponent move.",
        points: [
          "<strong>MAX</strong> tries to maximise the final outcome; <strong>MIN</strong> tries to minimise MAX's outcome.",
          "Topics 01–02: the environment never fights back. Here, the opponent does.",
          "Key assumption: the opponent is <strong>rational</strong> and picks the move worst for MAX. Planning for that gives a worst-case guarantee.",
        ],
        formula: "zero-sum: Σ<sub>i</sub> U<sub>i</sub>(s) = 0 &nbsp;·&nbsp; (U<sub>MAX</sub>, U<sub>MIN</sub>) = (+1, −1)",
        checks: [
          { q: "Why can't MAX just search for a path to a win, as in Topic 02?", options: ["MIN chooses half the moves", "Games have no goal states", "The state space is continuous"], answer: "MIN chooses half the moves", why: "MAX needs a strategy that answers every reply." },
          { q: "MAX assumes MIN will…", options: ["play the move worst for MAX", "play randomly", "help MAX"], answer: "play the move worst for MAX", why: "That gives a guaranteed lower bound on MAX's result." },
        ],
        remember: ["Single-agent search finds a path; game search finds a strategy."] },
      { id: "definition", label: "Formal Game Definition",
        lead: "A deterministic, two-player, turn-taking game is the 6-tuple ⟨S<sub>0</sub>, PLAYER, ACTIONS, RESULT, TERMINAL-TEST, UTILITY⟩.",
        points: [
          "<strong>S<sub>0</sub>:</strong> starting position and who moves first.",
          "<strong>PLAYER(s):</strong> whose turn it is. <strong>ACTIONS(s):</strong> legal moves. <strong>RESULT(s, a):</strong> the transition model.",
          "<strong>TERMINAL-TEST(s):</strong> is the game over? Those states are <em>terminal</em>.",
          "<strong>UTILITY(s, p):</strong> final payoff for player p (from MAX's view: win +1, draw 0, loss −1).",
          "Compared with Topic 01: GOAL-TEST becomes TERMINAL-TEST, and PATH-COST becomes UTILITY: only the final outcome counts.",
        ],
        checks: [
          { q: "Which component replaces the goal test of Topic 01?", options: ["TERMINAL-TEST", "PLAYER", "UTILITY"], answer: "TERMINAL-TEST", why: "Search ends when the game ends, not when MAX likes a state." },
          { q: "In chess, do the costs of intermediate moves matter?", options: ["No, only the final utility", "Yes, they are summed", "Only for MIN"], answer: "No, only the final utility", why: "UTILITY replaces path cost." },
        ],
        remember: ["S<sub>0</sub>, PLAYER, ACTIONS, RESULT, TERMINAL-TEST, UTILITY."] },
      { id: "plies", label: "Game Trees & Plies",
        lead: "A <strong>game tree</strong>: root = S<sub>0</sub>, edges = moves, internal nodes labelled MAX or MIN, leaves = terminal states with utilities.",
        points: [
          "A <strong>ply</strong> is one turn by one player (one layer of edges). A full <strong>move</strong> is two plies.",
          "<strong>b</strong> = branching factor: chess ≈ 35, Go ≈ 250.",
          "<strong>m</strong> = maximum depth in plies: chess ≈ 80, Go ≈ 150.",
        ],
        formula: "nodes ≈ b<sup>m</sup> &nbsp;·&nbsp; chess: 35<sup>80</sup> ≈ 10<sup>123</sup>",
        checks: [
          { q: "40 full moves of chess are how many plies?", options: ["80", "40", "20"], answer: "80", why: "Each move is a MAX ply plus a MIN ply." },
          { q: "b = 3, m = 4. How many leaves in a uniform game tree?", options: ["81", "12", "64"], answer: "81", why: "3⁴ = 81." },
        ],
        remember: ["Ply = half-move."] },
      { id: "zero-sum", label: "Zero-Sum vs. General-Sum",
        lead: "Games are classified by how the players' payoffs relate.",
        points: [
          "<strong>Zero-sum (constant-sum):</strong> U<sub>MIN</sub>(s) = −U<sub>MAX</sub>(s). Any gain for one is a loss for the other; no cooperation. Chess, checkers, Go, tic-tac-toe.",
          "<strong>General-sum:</strong> payoffs are independent vectors; outcomes can be win-win, lose-lose (prisoner's dilemma) or asymmetric. They need Nash-equilibrium analysis, not minimax.",
        ],
        formula: "U<sub>MAX</sub>(s) + U<sub>MIN</sub>(s) = 0 ⇒ U<sub>MIN</sub>(s) = −U<sub>MAX</sub>(s)",
        checks: [
          { q: "U<sub>MAX</sub> = +5 in a zero-sum game. U<sub>MIN</sub> = ?", options: ["−5", "+5", "0"], answer: "−5", why: "The payoffs sum to 0." },
          { q: "The prisoner's dilemma is…", options: ["general-sum", "zero-sum"], answer: "general-sum", why: "Both players can lose together (mutual defection)." },
        ],
        remember: ["Minimax is for zero-sum games."] },
      { id: "kinds", label: "Information & Chance",
        lead: "Two more distinctions decide which algorithm fits.",
        points: [
          "<strong>Perfect information:</strong> everyone sees the whole state (chess, Go). <strong>Imperfect:</strong> parts are hidden (poker cards, Battleship, fog of war); players reason over <em>information sets</em>.",
          "<strong>Deterministic:</strong> s′ = RESULT(s, a), no luck. <strong>Stochastic:</strong> dice or cards give P(s′ | s, a); the tree gains <strong>chance nodes</strong> (backgammon, Monopoly).",
        ],
        example: "<table class='ag-table ui'><thead><tr><th class='l'></th><th class='l'>deterministic</th><th class='l'>stochastic</th></tr></thead><tbody>" +
          "<tr><th class='l'>perfect info</th><td class='l'>chess, Go, checkers</td><td class='l'>backgammon, Monopoly</td></tr>" +
          "<tr><th class='l'>imperfect info</th><td class='l'>Battleship</td><td class='l'>poker, bridge</td></tr></tbody></table>",
        checks: [
          { q: "Backgammon is…", options: ["perfect information, stochastic", "imperfect information, deterministic", "imperfect, stochastic"], answer: "perfect information, stochastic", why: "Everything is visible, but dice decide the moves available." },
          { q: "Stochastic games add which kind of node?", options: ["Chance nodes", "Goal nodes", "Information sets"], answer: "Chance nodes", why: "They average over random outcomes." },
        ],
        remember: ["Hidden state → information sets. Dice → chance nodes."] },
    ] },
    { id: "minimax", label: "Minimax & Alpha-Beta", source: "AIMA (4th ed.) §5.2", subs: [
      { id: "value", label: "The Minimax Value",
        lead: "MINIMAX(s) is the best utility MAX can guarantee from s if both sides play perfectly to the end.",
        formula: "MINIMAX(s) = UTILITY(s) if terminal · max<sub>a</sub> MINIMAX(RESULT(s, a)) if MAX to move · min<sub>a</sub> MINIMAX(RESULT(s, a)) if MIN to move",
        points: [
          "MAX picks the child with the highest minimax value; MIN picks the lowest.",
          "From von Neumann's minimax theorem (1928), brought to game-tree search by Shannon (1950) and McCarthy (1956).",
        ],
        checks: [
          { q: "A MIN node has children worth 3, 12, 8. Its value?", options: ["3", "12", "23/3"], answer: "3", why: "MIN takes the minimum." },
          { q: "A MAX node has MIN children worth 3, 2, 2. Its value?", options: ["3", "2", "7"], answer: "3", why: "MAX takes the maximum." },
        ],
        remember: ["MAX layers take max, MIN layers take min, leaves give utility."] },
      { id: "algorithm", label: "Minimax Algorithm",
        lead: "Minimax is a full <strong>depth-first</strong> traversal: recurse to the leaves, then back values up.",
        example: MINIMAX_CODE,
        points: [
          "AIMA Fig. 5.2: A (MAX) has MIN children B (3, 12, 8), C (2, 4, 6), D (14, 5, 2).",
          "B = 3, C = 2, D = 2, so A = 3 via move B. The 14 under D is out of reach: MIN would answer with 2.",
          "Time O(b<sup>m</sup>), space O(bm); complete on finite trees; optimal against an optimal opponent (it does not try to exploit blunders).",
        ],
        checks: [
          { q: "Why can't MAX get the 14 under D?", options: ["MIN at D would choose 2", "14 is not a terminal value", "D is pruned"], answer: "MIN at D would choose 2", why: "MIN picks the smallest child." },
          { q: "Minimax's space complexity is…", options: ["O(bm)", "O(b^m)", "O(m)"], answer: "O(bm)", why: "It is depth-first: one path plus siblings." },
        ],
        remember: ["Minimax is exact but O(b<sup>m</sup>) time."] },
      { id: "bounds", label: "α and β Bounds",
        lead: "<strong>Alpha-beta pruning</strong> computes the same minimax value without looking at every node, using two bounds along the current path.",
        points: [
          "<strong>α</strong>: best (highest) value MAX can already guarantee on the path. Starts at −∞.",
          "<strong>β</strong>: best (lowest) value MIN can already guarantee on the path. Starts at +∞.",
          "[α, β] is the <strong>search window</strong>: values outside it cannot change the decision at the root, so those branches can be skipped.",
          "Even at depth 10, chess has 35<sup>10</sup> ≈ 2.8 × 10<sup>15</sup> nodes: exhaustive minimax is hopeless.",
        ],
        checks: [
          { q: "At the root, before any search, the window is…", options: ["[−∞, +∞]", "[0, 1]", "[−1, +1]"], answer: "[−∞, +∞]", why: "Nothing is guaranteed yet." },
          { q: "α is updated at…", options: ["MAX nodes", "MIN nodes", "leaves only"], answer: "MAX nodes", why: "α records MAX's best guaranteed option; β is updated at MIN nodes." },
        ],
        remember: ["α = MAX's floor, β = MIN's ceiling."] },
      { id: "alphabeta", label: "Alpha-Beta Algorithm",
        lead: "Prune as soon as <strong>α ≥ β</strong>.",
        example: AB_CODE,
        points: [
          "<strong>At a MAX node:</strong> if a child gives v ≥ β, return at once (β-cutoff). MIN above already has something worth β and will never let play reach here.",
          "<strong>At a MIN node:</strong> if a child gives v ≤ α, return at once (α-cutoff). MAX above already has α and will never enter this branch.",
          "The value and move returned are exactly the same as minimax.",
        ],
        checks: [
          { q: "At a MIN node with α = 5, a child returns 4. What happens?", options: ["Prune the remaining children", "Keep searching", "Set α = 4"], answer: "Prune the remaining children", why: "4 ≤ α: MAX will never choose this branch." },
          { q: "Can alpha-beta return a different move from minimax?", options: ["No", "Yes, sometimes"], answer: "No", why: "Pruning only skips branches that cannot matter." },
        ],
        remember: ["Cut when α ≥ β. Same answer, less work."] },
      { id: "ordering", label: "Move Ordering",
        lead: "How much alpha-beta prunes depends entirely on the <strong>order</strong> in which moves are tried.",
        example: "<table class='ag-table ui'><thead><tr><th class='l'>ordering</th><th>nodes examined</th></tr></thead><tbody>" +
          "<tr><td class='l'>worst (worst move first)</td><td>O(b<sup>m</sup>): no pruning</td></tr><tr><td class='l'>random</td><td>≈ O(b<sup>3m/4</sup>)</td></tr><tr class='is-hl'><td class='l'>perfect (best move first)</td><td class='is-best'>O(b<sup>m/2</sup>) = O((√b)<sup>m</sup>)</td></tr></tbody></table>",
        points: [
          "With perfect ordering the effective branching factor drops from b to √b: chess 35 → about 6. Alpha-beta searches <strong>twice as deep</strong> in the same time.",
          "Engines approximate perfect ordering with: <strong>iterative deepening</strong> (try last iteration's best move first), <strong>killer moves</strong>, <strong>captures first</strong> (MVV-LVA), the <strong>history heuristic</strong>.",
        ],
        checks: [
          { q: "b = 36, perfect ordering. Effective branching factor?", options: ["6", "18", "36"], answer: "6", why: "√36 = 6." },
          { q: "With perfect ordering, in the time minimax reaches depth 6, alpha-beta reaches about…", options: ["depth 12", "depth 7", "depth 36"], answer: "depth 12", why: "b<sup>m/2</sup> nodes: twice the depth for the same work." },
        ],
        remember: ["Best move first ⇒ √b ⇒ double depth."] },
    ] },
    { id: "limits", label: "Resource Limits", source: "AIMA (4th ed.) §5.3", subs: [
      { id: "cutoff", label: "Depth Cutoffs",
        lead: "Real games are far too deep to search to the end, so the search stops at a <strong>horizon</strong> and estimates (Shannon, 1950).",
        formula: "CUTOFF-TEST(s, depth) = depth ≥ d ∨ TERMINAL-TEST(s) ∨ time is up",
        points: [
          "TERMINAL-TEST is replaced by CUTOFF-TEST.",
          "At a non-terminal cutoff state, return the heuristic <strong>EVAL(s)</strong> instead of UTILITY(s).",
        ],
        checks: [
          { q: "At the cutoff depth on a non-terminal state, the search returns…", options: ["EVAL(s)", "UTILITY(s)", "0"], answer: "EVAL(s)", why: "UTILITY is only defined for terminal states." },
        ],
        remember: ["Cut off at depth d, then estimate with EVAL."] },
      { id: "eval", label: "Evaluation Functions",
        lead: "EVAL(s) estimates MAX's winning chances for a non-terminal position.",
        points: [
          "<strong>Agree with utilities</strong> on terminal states (a checkmate beats any non-terminal advantage).",
          "<strong>Fast</strong>: it is called millions of times per second.",
          "<strong>Correlated</strong> with the real chance of winning.",
          "Usually a weighted sum of features: material (pawn 1, knight 3, bishop 3.25, rook 5, queen 9), piece-square tables, mobility, king safety, pawn structure.",
        ],
        formula: "EVAL(s) = w<sub>1</sub>f<sub>1</sub>(s) + w<sub>2</sub>f<sub>2</sub>(s) + … + w<sub>n</sub>f<sub>n</sub>(s)",
        checks: [
          { q: "MAX is up one rook, MIN is up one knight; only material counts. EVAL = ?", options: ["+2", "+8", "−2"], answer: "+2", why: "5 − 3 = 2." },
          { q: "Why must EVAL be fast?", options: ["It is called at every cutoff leaf, millions of times", "It replaces alpha-beta", "It runs once per game"], answer: "It is called at every cutoff leaf, millions of times", why: "A slow EVAL means a shallow search." },
        ],
        remember: ["EVAL = weighted feature sum."] },
      { id: "quiescence", label: "Quiescence Search",
        lead: "Evaluating in the middle of a capture sequence gives nonsense: “I just took the queen, +9!”, but the queen is recaptured on the next ply.",
        points: [
          "Positions with pending captures, checks or threats are <strong>turbulent</strong> (non-quiescent).",
          "At depth d: if the position is quiet, return EVAL(s); otherwise search deeper along captures and checks only, until it is quiet.",
        ],
        checks: [
          { q: "Quiescence search extends the search along…", options: ["captures and checks only", "all moves", "the best move only"], answer: "captures and checks only", why: "Only tactical moves, so the extension stays small." },
        ],
        remember: ["Only evaluate quiet positions."] },
      { id: "horizon", label: "The Horizon Effect",
        lead: "The <strong>horizon effect</strong>: an unavoidable loss is pushed beyond depth d by stalling moves, so the search thinks it is avoided.",
        points: [
          "Example: MAX's bishop is trapped. MAX plays a string of pointless checks, pushing the capture past the horizon. The bishop “looks” safe, but MAX has thrown away pawns and position for nothing.",
          "The loss is not prevented, only hidden.",
        ],
        checks: [
          { q: "The horizon effect is caused by…", options: ["a fixed search depth", "a bad evaluation weight", "chance nodes"], answer: "a fixed search depth", why: "Anything past depth d is invisible." },
        ],
        remember: ["Delayed is not avoided."] },
      { id: "transposition", label: "Transposition Tables",
        lead: "Different move orders can reach the same position (a <strong>transposition</strong>), so the game tree is really a graph.",
        points: [
          "A <strong>transposition table</strong> is a hash table of evaluated positions: key → ⟨depth, value, bound flag, best move⟩.",
          "<strong>Zobrist hashing:</strong> each (piece, square) pair gets a random 64-bit number; a move updates the hash in O(1) with XOR.",
          "A hit at equal or greater depth returns the stored value and skips the whole subtree.",
        ],
        formula: "hash′ = hash ⊕ Z[piece, from] ⊕ Z[piece, to]",
        checks: [
          { q: "1. e4 e5 2. Nf3 and 1. Nf3 e5 2. e4 reach…", options: ["the same position (a transposition)", "different positions"], answer: "the same position (a transposition)", why: "Same pieces on the same squares." },
          { q: "Why XOR for Zobrist hashing?", options: ["Updating after a move is O(1)", "It avoids collisions completely", "It sorts moves"], answer: "Updating after a move is O(1)", why: "XOR the piece out of its old square and into its new one." },
        ],
        remember: ["Cache positions; reuse across transpositions."] },
    ] },
    { id: "chance", label: "Chance & MCTS", source: "AIMA (4th ed.) §5.4–5.5 · Kocsis & Szepesvári (2006) · Coulom (2006)", subs: [
      { id: "expectiminimax", label: "Expectiminimax",
        lead: "With dice or cards, the tree gets <strong>chance nodes</strong> (circles) between MAX (△) and MIN (▽) nodes.",
        formula: "chance node: EXPECTIMINIMAX(s) = Σ<sub>s′</sub> P(s′ | s) · EXPECTIMINIMAX(s′)",
        points: [
          "MAX and MIN nodes still take max and min; chance nodes take the <strong>probability-weighted average</strong>.",
          "With n outcomes per chance node: time O(b<sup>m</sup> n<sup>m</sup>) = O((bn)<sup>m</sup>).",
          "Alpha-beta cannot prune chance nodes easily unless the utilities are bounded.",
        ],
        checks: [
          { q: "Coin flip: heads +10, tails −4. Value of the chance node?", options: ["3", "6", "7"], answer: "3", why: "0.5(10) + 0.5(−4) = 3." },
          { q: "Chance nodes compute…", options: ["an expectation", "a maximum", "a minimum"], answer: "an expectation", why: "Weighted by the outcome probabilities." },
        ],
        remember: ["max, min, and average."] },
      { id: "utility-scale", label: "Utility Scale",
        lead: "In deterministic minimax, any order-preserving rescaling of utilities gives the same moves. With chance nodes it does not.",
        points: [
          "Allowed: positive linear transforms U′ = aU + b with a &gt; 0.",
          "Not allowed: nonlinear transforms, because E[f(X)] ≠ f(E[X]).",
          "Example: A gives 1 for sure (EV 1.0); B gives 0 or 3 with 0.5 each (EV 1.5) → choose B. With f(u) = √u: A = 1.0, B = 0.5·√3 ≈ 0.866 → choose A. The decision flips.",
          "So utilities in stochastic games must be real (cardinal) values, not just rankings.",
        ],
        formula: "U′(s) = a · U(s) + b, a &gt; 0 &nbsp;·&nbsp; E[f(X)] ≠ f(E[X])",
        checks: [
          { q: "In expectiminimax, which transform keeps all decisions the same?", options: ["U′ = 2U + 7", "U′ = U²", "U′ = √U"], answer: "U′ = 2U + 7", why: "Only positive linear transforms preserve expected-value order." },
        ],
        remember: ["Chance ⇒ utilities must be cardinal."] },
      { id: "mcts-ucb", label: "MCTS: Selection & UCB1",
        lead: "<strong>Monte Carlo Tree Search</strong> needs no evaluation function: it judges a position by playing many fast random games to the end. Each iteration has four phases.",
        figure: FIG[0],
        points: [
          "<strong>Selection:</strong> from the root, repeatedly pick the child with the largest <strong>UCB1</strong> value.",
          "<strong>Exploitation</strong> U(n)/N(n): average result so far. <strong>Exploration</strong> term: a bonus for rarely visited children that grows as the parent is visited more.",
          "C balances the two; C = √2 ≈ 1.414 for rewards in [0, 1].",
        ],
        formula: "UCB1(n) = U(n) / N(n) + C · √( ln N(parent) / N(n) )",
        checks: [
          { q: "U = 6, N = 10, N(parent) = 100, C = 0 (pure exploitation). UCB1 = ?", options: ["0.6", "6", "0.06"], answer: "0.6", why: "With C = 0 only the average 6/10 remains." },
          { q: "As N(n) grows (parent fixed), the exploration bonus…", options: ["shrinks", "grows", "stays the same"], answer: "shrinks", why: "N(n) is in the denominator." },
        ],
        remember: ["UCB1 = average + exploration bonus."] },
      { id: "mcts-phases", label: "MCTS: Expand, Simulate, Backup",
        lead: "After selection, MCTS grows the tree by one node, plays one random game, and records the result.",
        points: [
          "<strong>Expansion:</strong> at a node with untried moves, add one (or more) child nodes.",
          "<strong>Simulation (rollout):</strong> play to the end with a fast policy (often random); nothing is stored; result v ∈ {+1, 0, −1}.",
          "<strong>Backpropagation:</strong> for every node on the path, N(n) ← N(n) + 1 and U(n) ← U(n) + v (from that node's player's view).",
          "<strong>Final choice:</strong> when time runs out, play the root child with the <strong>most visits</strong>, not the highest win rate; visit counts are more stable.",
        ],
        formula: "N(n) ← N(n) + 1 &nbsp;·&nbsp; U(n) ← U(n) + v",
        checks: [
          { q: "Which root move does MCTS finally play?", options: ["The most-visited child", "The child with the highest win rate", "A random child"], answer: "The most-visited child", why: "A child with a few lucky wins can have a high rate but little evidence." },
          { q: "Are nodes stored during the rollout?", options: ["No", "Yes"], answer: "No", why: "Rollouts are throwaway, which makes them fast." },
        ],
        remember: ["Select → Expand → Simulate → Backpropagate."] },
      { id: "asymmetric", label: "Asymmetric Tree Growth",
        lead: "Minimax builds a uniform tree to depth d. MCTS grows an <strong>asymmetric</strong> tree.",
        points: [
          "UCB1 sends most iterations down promising, contested lines (sometimes 50+ plies deep).",
          "Poor moves are dropped after only a few simulations.",
          "This is why MCTS works in Go (b ≈ 250), where good evaluation functions were out of reach for decades.",
        ],
        checks: [
          { q: "Where does MCTS spend most of its rollouts?", options: ["On promising, contested lines", "Equally on every move", "On the worst moves"], answer: "On promising, contested lines", why: "UCB1 favours high averages, with some exploration." },
        ],
        remember: ["Depth where it matters, not everywhere."] },
    ] },
    { id: "evaluation", label: "Evaluating Game Search", source: "AIMA (4th ed.) Ch. 5", subs: [
      { id: "params", label: "Parameters & Complexity",
        lead: "Game-search costs are stated in a few quantities.",
        points: [
          "<strong>b</strong> branching factor · <strong>m</strong> maximum depth · <strong>d</strong> cutoff depth · <strong>N</strong> number of MCTS rollouts · <strong>n</strong> chance outcomes per chance node.",
          "Minimax and alpha-beta are depth-first: space O(bm), or O(bd) with a cutoff.",
          "MCTS stores every expanded node: space O(N).",
        ],
        checks: [
          { q: "Which needs memory proportional to the number of iterations?", options: ["MCTS", "Alpha-beta", "Minimax"], answer: "MCTS", why: "Each iteration adds a node to the stored tree." },
        ],
        remember: ["DFS-based game search: linear memory. MCTS: grows with N."] },
      { id: "guarantees", label: "Completeness & Optimality",
        lead: "What each method promises.",
        points: [
          "<strong>Minimax / alpha-beta:</strong> complete on finite trees; optimal against an optimal opponent. Against a weak opponent they guarantee the game value but do not set traps.",
          "<strong>Expectiminimax:</strong> maximises expected utility in stochastic games.",
          "<strong>MCTS:</strong> as N → ∞ the chance of picking a suboptimal move goes to 0; it converges to the minimax value.",
        ],
        checks: [
          { q: "MCTS converges to the minimax value when…", options: ["the number of rollouts N → ∞", "C = 0", "the tree is symmetric"], answer: "the number of rollouts N → ∞", why: "UCB1 makes every move get explored infinitely often." },
        ],
        remember: ["Minimax: exact. MCTS: exact in the limit."] },
      { id: "matrix", label: "Comparison Matrix",
        lead: "Which method for which game.",
        example: "<table class='ag-table ui'><thead><tr><th class='l'>algorithm</th><th>time</th><th>space</th><th class='l'>needs</th><th class='l'>typical games</th></tr></thead><tbody>" +
          "<tr><td class='l'>Minimax</td><td>O(b<sup>m</sup>)</td><td>O(bm)</td><td class='l'>exact utilities</td><td class='l'>tic-tac-toe, Nim</td></tr>" +
          "<tr><td class='l'>Alpha-beta (perfect order)</td><td>O(b<sup>m/2</sup>)</td><td>O(bm)</td><td class='l'>exact utilities</td><td class='l'>Connect-4, endgames</td></tr>" +
          "<tr><td class='l'>Alpha-beta + cutoff</td><td>O(b<sup>d</sup>)</td><td>O(bd)</td><td class='l'>EVAL(s)</td><td class='l'>chess, checkers, Othello</td></tr>" +
          "<tr><td class='l'>Expectiminimax</td><td>O((bn)<sup>m</sup>)</td><td>O(bm)</td><td class='l'>cardinal utilities</td><td class='l'>backgammon, Pig</td></tr>" +
          "<tr class='is-hl'><td class='l'>MCTS (UCB1)</td><td>O(N · game length)</td><td>O(N)</td><td class='l'>only rollouts</td><td class='l'>Go, Hex, general game playing</td></tr></tbody></table>",
        checks: [
          { q: "No good evaluation function and b ≈ 250. Best choice?", options: ["MCTS", "Alpha-beta + cutoff", "Plain minimax"], answer: "MCTS", why: "It needs no EVAL and copes with huge b." },
          { q: "A dice game. Which algorithm models it?", options: ["Expectiminimax", "Alpha-beta", "Plain minimax"], answer: "Expectiminimax", why: "It has chance nodes." },
        ],
        remember: ["Small: minimax. Big with EVAL: alpha-beta. Dice: expectiminimax. Huge without EVAL: MCTS."] },
    ] },
    { id: "practice", label: "Practice", source: "Worked exercises · AIMA Ch. 5", subs: [
      { id: "ex1", label: "1 · Minimax Values", exercise: true,
        problem: "In the 3-ply tree below, compute the backed-up values of D, E, F, G (MAX), B, C (MIN) and A (MAX), and give MAX's best opening move.",
        figure: FIG[1],
        tasks: [
          { type: "num", label: "Value(D)", answer: 7, tol: 0 },
          { type: "num", label: "Value(E)", answer: 8, tol: 0 },
          { type: "num", label: "Value(B)", answer: 7, tol: 0 },
          { type: "num", label: "Value(C)", answer: 5, tol: 0 },
          { type: "num", label: "Value(A)", answer: 7, tol: 0 },
          { type: "mcq", q: "MAX's best opening move?", options: ["A → B", "A → C"], answer: "A → B", why: "B guarantees 7; C only 5." },
        ],
        steps: [
          "<strong>Level 2 (MAX):</strong> D = max(4, 7) = 7 · E = max(2, 8) = 8 · F = max(1, 5) = 5 · G = max(3, 6) = 6.",
          "<strong>Level 1 (MIN):</strong> B = min(7, 8) = 7 · C = min(5, 6) = 5.",
          "<strong>Root (MAX):</strong> A = max(7, 5) = <strong>7</strong>; MAX plays <strong>A → B</strong>, guaranteeing at least 7.",
        ] },
      { id: "ex2", label: "2 · Alpha-Beta Trace", exercise: true,
        problem: "Trace alpha-beta on the tree below, children left to right. Give the window at each node, the values, and which subtrees are pruned and why.",
        figure: FIG[2],
        tasks: [
          { type: "num", label: "Value returned by B1", answer: 5, tol: 0 },
          { type: "num", label: "β at B after B1", answer: 5, tol: 0 },
          { type: "num", label: "α at the root after B", answer: 5, tol: 0 },
          { type: "num", label: "β at C after C1", answer: 4, tol: 0 },
          { type: "mcq", q: "Which subtree is pruned?", options: ["C2 (leaves 8, 7)", "B2", "C1"], answer: "C2 (leaves 8, 7)", why: "At C, α = 5 ≥ β = 4." },
          { type: "num", label: "Root value", answer: 5, tol: 0 },
        ],
        steps: [
          "<strong>A</strong> (MAX) [−∞, +∞] → <strong>B</strong> (MIN) [−∞, +∞] → <strong>B1</strong> (MAX): leaf 3 → α = 3; leaf 5 → α = 5; return <strong>5</strong>.",
          "<strong>B:</strong> v = 5, β = <strong>5</strong>; window [−∞, 5].",
          "<strong>B2</strong> (MAX) with [−∞, 5]: leaf 2 → α = 2; leaf 9 → v = 9 ≥ β = 5: <strong>β-cutoff</strong>, return 9.",
          "<strong>B:</strong> v = min(5, 9) = 5, returned to A. <strong>A:</strong> α = <strong>5</strong>; window [5, +∞].",
          "<strong>C</strong> (MIN) with [5, +∞] → <strong>C1</strong> (MAX): leaves 1, 4 → return 4. At C: v = 4, β = <strong>4</strong>.",
          "<strong>α = 5 ≥ β = 4: prune C2</strong> (leaves 8 and 7 are never evaluated). MAX will never choose C, which is worth at most 4.",
          "<strong>Root:</strong> max(5, 4) = <strong>5</strong>; MAX plays A → B.",
        ] },
      { id: "ex3", label: "3 · Expectiminimax", exercise: true,
        problem: "MAX chooses between <strong>a₁</strong>, a fair coin (heads +10, tails −4), and <strong>a₂</strong>, a 4-sided die (+20, −10, +4, 0, each 0.25). Compute both expected values and MAX's choice.",
        tasks: [
          { type: "num", label: "EV(C₁)", answer: 3, tol: 0.001 },
          { type: "num", label: "EV(C₂)", answer: 3.5, tol: 0.001 },
          { type: "mcq", q: "MAX chooses…", options: ["a₂", "a₁"], answer: "a₂", why: "3.5 > 3.0." },
        ],
        steps: [
          "<strong>C₁:</strong> 0.5 × 10 + 0.5 × (−4) = 5 − 2 = <strong>3.0</strong>.",
          "<strong>C₂:</strong> 0.25 × (20 − 10 + 4 + 0) = 0.25 × 14 = <strong>3.5</strong>.",
          "<strong>Decision:</strong> argmax(3.0, 3.5) = <strong>a₂</strong>, even though a₂ risks −10.",
        ] },
      { id: "ex4", label: "4 · MCTS UCB1", exercise: true,
        problem: "Root visited N = 100 times. A₁: N = 40, U = 28 · A₂: N = 50, U = 30 · A₃: N = 10, U = 8. With C = √2 ≈ 1.414 and ln 100 ≈ 4.6052, compute UCB1 for each and the node selected.",
        tasks: [
          { type: "num", label: "UCB1(A₁)", answer: 1.1798, tol: 0.003 },
          { type: "num", label: "UCB1(A₂)", answer: 1.0291, tol: 0.003 },
          { type: "num", label: "UCB1(A₃)", answer: 1.7596, tol: 0.003 },
          { type: "mcq", q: "Which child is selected next?", options: ["A₃", "A₁", "A₂"], answer: "A₃", why: "Highest UCB1: a good average (0.8) plus a big exploration bonus from only 10 visits." },
        ],
        steps: [
          "<strong>A₁:</strong> 28/40 = 0.7000; 1.414 × √(4.6052/40) = 1.414 × 0.3393 = 0.4798 → <strong>1.1798</strong>.",
          "<strong>A₂:</strong> 30/50 = 0.6000; 1.414 × √(4.6052/50) = 1.414 × 0.3035 = 0.4291 → <strong>1.0291</strong>.",
          "<strong>A₃:</strong> 8/10 = 0.8000; 1.414 × √(4.6052/10) = 1.414 × 0.6786 = 0.9596 → <strong>1.7596</strong>.",
          "<strong>Select A₃.</strong> Few visits make its exploration bonus large, and its win rate is already the best.",
        ] },
    ] },
  ];
  root.READING_NOTES = { tabs: TABS };
})(typeof window !== "undefined" ? window : globalThis);
