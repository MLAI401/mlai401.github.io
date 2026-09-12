/**
 * Adversarial Search & Games — Lecture Page Controller
 *
 * Built from instructions/adversarial.md and AIMA Chapter 5.
 * Features a single-screen lecture shell with a 5-topic selector bar:
 * 1. Game Terminology & Problem Formulation
 * 2. Minimax & Alpha-Beta Pruning
 * 3. Heuristics & Resource Limits
 * 4. Chance & Monte Carlo Tree Search (MCTS)
 * 5. Evaluating Game Search
 */

(function () {
  'use strict';

  // ---- TOPICS DEFINITION ----
  const ADV_TOPICS = [
    { id: 'terminology', title: 'Game Terminology & Problem Formulation', short: 'Game Terminology' },
    { id: 'minimax', title: 'Minimax & Alpha-Beta Pruning', short: 'Minimax & Alpha-Beta' },
    { id: 'heuristics', title: 'Heuristics & Resource Limits', short: 'Heuristics & Limits' },
    { id: 'mcts', title: 'Chance & Monte Carlo Tree Search (MCTS)', short: 'Chance & MCTS' },
    { id: 'evaluation', title: 'Evaluating Game Search Algorithms', short: 'Evaluating Search' }
  ];

  // ---- TOPIC 1: GAME TERMINOLOGY CONCEPTS ----
  const TERMINOLOGY_CONCEPTS = [
    {
      key: 'adversarial_env',
      name: 'Adversarial Environment',
      definition: 'A multi-agent environment where agents have diametrically opposing utility functions — one agent\'s gain is the other\'s direct loss.',
      notation: 'Multi-agent · Zero-sum: \\sum_{i} U_i(s) = 0 · Payoff vector: (U_{\\text{MAX}}, U_{\\text{MIN}}) = (+1, -1)',
      tip: 'Classical search plans against a static environment or physics; adversarial search plans against an active, rational mind whose sole objective is to minimize your outcome.',
      kind: 'env_conflict'
    },
    {
      key: 'formal_def',
      name: 'Formal Game Definition',
      definition: 'A game is formally defined as a tuple ⟨S₀, Player, Actions, Result, Terminal-Test, Utility⟩ describing the initial state, legal moves, transition rules, game termination, and objective score.',
      notation: 's_0 \\in S \\;\\cdot\\; \\text{PLAYER}(s) \\;\\cdot\\; \\text{ACTIONS}(s) \\;\\cdot\\; \\text{RESULT}(s, a) \\;\\cdot\\; \\text{TERMINAL-TEST}(s) \\;\\cdot\\; \\text{UTILITY}(s, p)',
      tip: 'Contrast with classical single-agent search: GOAL-TEST is replaced by TERMINAL-TEST (any game-over state, win or lose), and PATH-COST is replaced by UTILITY (payoff at terminal states).',
      kind: 'formal_components'
    },
    {
      key: 'game_tree_plies',
      name: 'Game Tree & Plies',
      definition: 'A tree where nodes represent game states and edges represent legal moves. A ply represents one player\'s single turn (a half-move), whereas a full move consists of one turn for each player.',
      notation: '\\text{depth} = \\text{plies} \\;\\cdot\\; 1 \\text{ full move} = 2 \\text{ plies (MAX + MIN)} \\;\\cdot\\; b = \\text{branching factor}',
      tip: 'In Chess, a "move" is White\'s move + Black\'s reply. In AI search trees, each individual decision layer is exactly 1 ply.',
      kind: 'tree_plies'
    },
    {
      key: 'zero_sum',
      name: 'Zero-Sum vs. General-Sum',
      definition: 'In zero-sum games, the sum of all players\' payoffs is constant across all terminal outcomes. In general-sum games, outcomes can be mutually beneficial (win-win) or destructive (lose-lose).',
      notation: '\\text{Zero-Sum: } U_{\\text{MAX}}(s) = -U_{\\text{MIN}}(s) \\iff U_{\\text{MAX}}(s) + U_{\\text{MIN}}(s) = 0',
      tip: 'In a zero-sum game, maximizing your own utility is mathematically equivalent to minimizing your opponent\'s utility. There is no room for cooperation.',
      kind: 'zero_sum_balance'
    },
    {
      key: 'perfect_info',
      name: 'Perfect vs. Imperfect Info',
      definition: 'Perfect information games give all players full visibility of the entire game state at all times. Imperfect information games contain hidden state variables (such as facedown cards or fog-of-war).',
      notation: '\\text{Perfect: Chess, Go, Tic-Tac-Toe} \\;\\cdot\\; \\text{Imperfect: Poker, Battleship (Information Sets)}',
      tip: 'Perfect information means no hidden cards and no uncertainty about what state the game is currently in — every player sees the exact same board.',
      kind: 'info_visibility'
    },
    {
      key: 'deterministic_stochastic',
      name: 'Deterministic vs. Stochastic',
      definition: 'Deterministic games have completely predictable outcomes for each action. Stochastic games incorporate elements of chance (dice rolls, card shuffles) between player turns.',
      notation: '\\text{Deterministic: } \\text{RESULT}(s, a) = s\' \\;\\cdot\\; \\text{Stochastic: } P(s\' \\mid s, a)',
      tip: 'Deterministic games branch solely on player actions. Stochastic games introduce chance nodes that calculate mathematical expectations over random outcomes.',
      kind: 'stochastic_branching'
    }
  ];

  // ---- TOPIC 2: MINIMAX & ALPHA-BETA PRUNING CONCEPTS ----
  const MINIMAX_CONCEPTS = [
    {
      key: 'minimax_val',
      name: 'Minimax Value',
      definition: 'The utility for MAX of being in a state, assuming both players play perfectly rationally to the end of the game.',
      notation: '\\text{MINIMAX}(s) = \\begin{cases} \\text{UTILITY}(s) & \\text{if } \\text{TERMINAL}(s) \\\\ \\max_a \\text{MINIMAX}(\\text{RESULT}(s,a)) & \\text{if } \\text{PLAYER}(s)=\\text{MAX} \\\\ \\min_a \\text{MINIMAX}(\\text{RESULT}(s,a)) & \\text{if } \\text{PLAYER}(s)=\\text{MIN} \\end{cases}',
      tip: 'MAX picks the action leading to the highest outcome; MIN picks the action leading to the lowest outcome. Minimax provides a worst-case theoretical guarantee.',
      kind: 'minimax_static'
    },
    {
      key: 'minimax_trace',
      name: 'Minimax Decision Trace',
      definition: 'A complete depth-first search traversal of the game tree that computes and backs up minimax values bottom-up from leaf states to the root.',
      notation: '\\text{MAX-VALUE}(s) \\longleftrightarrow \\text{MIN-VALUE}(s) \\;\\cdot\\; \\text{Time: } O(b^m) \\;\\cdot\\; \\text{Space: } O(bm)',
      tip: 'Notice how values flow upward: leaves are evaluated first, then MIN parent nodes take the minimum child value, and finally MAX root takes the maximum.',
      kind: 'minimax_stepper'
    },
    {
      key: 'alphabeta_bounds',
      name: 'Alpha (α) & Beta (β) Bounds',
      definition: 'α is the best (highest) value MAX can guarantee so far along the path; β is the best (lowest) value MIN can guarantee so far along the path.',
      notation: '\\alpha = \\max(\\alpha, v) \\; [-\\infty \\text{ init}] \\;\\cdot\\; \\beta = \\min(\\beta, v) \\; [+\\infty \\text{ init}] \\;\\cdot\\; \\text{Search Window: } [\\alpha, \\beta]',
      tip: 'The active interval [α, β] represents the viable window of game values. Any child whose value falls outside cannot influence the final root decision.',
      kind: 'alphabeta_bounds_view'
    },
    {
      key: 'alphabeta_pruning',
      name: 'Alpha-Beta Pruning',
      definition: 'Halting exploration of a subtree as soon as a branch is proven to be worse than an already known alternative, satisfying α ≥ β.',
      notation: '\\text{Prune when } \\alpha \\ge \\beta \\;\\cdot\\; \\text{At MAX: } v \\ge \\beta \\implies \\text{return } v \\;\\cdot\\; \\text{At MIN: } v \\le \\alpha \\implies \\text{return } v',
      tip: 'Pruning skips entire subtrees without altering the final minimax decision or root value. It is 100% mathematically exact.',
      kind: 'alphabeta_stepper'
    },
    {
      key: 'move_ordering',
      name: 'Move Ordering Impact',
      definition: 'The efficiency of Alpha-Beta pruning depends critically on the order in which child moves are evaluated.',
      notation: '\\text{Best Ordering: } O(b^{m/2}) \\;\\cdot\\; \\text{Random: } O(b^{3m/4}) \\;\\cdot\\; \\text{Worst Ordering: } O(b^m)',
      tip: 'With perfect move ordering, Alpha-Beta searches twice as deep in the same amount of time because the effective branching factor drops from b to √b.',
      kind: 'move_ordering_comp'
    }
  ];

  // ---- TOPIC 3: HEURISTICS & RESOURCE LIMITS CONCEPTS ----
  const HEURISTICS_CONCEPTS = [
    {
      key: 'cutoff_limits',
      name: 'Depth Cutoffs & Horizon',
      definition: 'In real-world games with enormous search trees (like Chess: 35⁸⁰ states), search must cut off at a finite depth d or time limit and return a heuristic evaluation.',
      notation: '\\text{CUTOFF-TEST}(s, \\text{depth}) \\implies \\text{depth} \\ge d \\;\\lor\\; \\text{TERMINAL}(s)',
      tip: 'Search stops at depth d (the search horizon). Positions at the horizon are evaluated with an evaluation function EVAL(s) instead of searching to game-over.',
      kind: 'cutoff_diagram'
    },
    {
      key: 'eval_fn',
      name: 'Evaluation Function (EVAL)',
      definition: 'An estimate of expected utility from a non-terminal state, typically formulated as a weighted linear combination of board features.',
      notation: '\\text{EVAL}(s) = w_1 f_1(s) + w_2 f_2(s) + \\dots + w_n f_n(s) = \\sum_{i=1}^n w_i f_i(s)',
      tip: 'A good evaluation function must agree with true utilities on terminal states and order intermediate states accurately according to winning chances.',
      kind: 'eval_calculator'
    },
    {
      key: 'quiescence',
      name: 'Quiescence Search',
      definition: 'Extending search beyond the cutoff depth for turbulent (non-quiescent) positions until tactical trades settle.',
      notation: '\\text{QUIESCENT}(s) = \\text{True if no active captures or tactical threats}',
      tip: 'Evaluating right after a Queen capture without checking if the opponent recaptures on the next half-ply causes disastrous blunders.',
      kind: 'quiescence_trace'
    },
    {
      key: 'horizon_effect',
      name: 'The Horizon Effect',
      definition: 'When an unavoidable damaging move by the opponent is delayed beyond the search horizon by playing useless stalling moves.',
      notation: '\\text{Horizon} = d \\;\\cdot\\; \\text{Serious damage delayed to } d+1 \\text{ by sacrifices}',
      tip: 'The search algorithm erroneously thinks it saved a piece, but it only delayed the loss while wasting secondary material.',
      kind: 'horizon_effect_view'
    },
    {
      key: 'transposition_tables',
      name: 'Transposition Tables',
      definition: 'A hash table of previously visited board positions and their evaluation bounds, avoiding re-searching identical states in game DAGs.',
      notation: '\\text{Key}(s) = \\text{ZobristHash}(s) \\;\\to\\; \\langle \\text{depth}, \\text{value}, \\text{flag}, \\text{best\\_move} \\rangle',
      tip: 'Different move sequences (e.g. 1. e4 e5 2. Nf3 vs 1. Nf3 e5 2. e4) reach the exact same board configuration.',
      kind: 'transposition_view'
    }
  ];

  // ---- TOPIC 4: CHANCE & MONTE CARLO TREE SEARCH CONCEPTS ----
  const MCTS_CONCEPTS = [
    {
      key: 'expectiminimax',
      name: 'Expectiminimax & Chance',
      definition: 'An extension of minimax for games with uncertainty (Backgammon, Monopoly, Pig) that introduces chance nodes calculating expected values.',
      notation: '\\text{EXPECTIMINIMAX}(s) = \\sum_{s\'} P(s\' \\mid s, a) \\cdot \\text{EXPECTIMINIMAX}(s\')',
      tip: 'Chance nodes calculate weighted averages over all possible dice rolls or card draws, whereas MAX/MIN nodes take extreme values.',
      kind: 'expectiminimax_view'
    },
    {
      key: 'utility_scale',
      name: 'Utility Scale Invariance',
      definition: 'While deterministic minimax is invariant under any monotonic transformation, expectiminimax requires positive linear transformations.',
      notation: 'U\'(s) = a U(s) + b \\quad (a > 0) \\;\\cdot\\; \\text{Nonlinear transformations alter expected values}',
      tip: 'E[2X] = 2E[X], but E[X²] ≠ (E[X])². Nonlinear scaling can flip which chance branch has the highest expected value.',
      kind: 'utility_scale_view'
    },
    {
      key: 'mcts_selection',
      name: 'MCTS: Selection & UCB1',
      definition: 'Traversing the search tree from the root to a leaf node by selecting child nodes that maximize the Upper Confidence Bound for Trees (UCB1).',
      notation: '\\text{UCB1}(n) = \\frac{U(n)}{N(n)} + C \\sqrt{\\frac{\\ln N(\\text{parent})}{N(n)}} = \\text{Exploitation} + \\text{Exploration}',
      tip: 'Exploitation favors moves with high win rates; Exploration gives a bonus to rarely visited moves to guarantee all viable options are explored.',
      kind: 'mcts_ucb1_calc'
    },
    {
      key: 'mcts_rollout',
      name: 'MCTS: Expansion & Rollout',
      definition: 'Adding a child node to the tree and running a fast random simulation (default policy) until reaching a terminal game state.',
      notation: '\\text{Rollout Policy: } a \\sim \\text{Uniform}(\\text{ACTIONS}(s)) \\;\\cdot\\; \\text{Returns terminal payoff } v \\in \\{+1, 0, -1\\}',
      tip: 'MCTS does not require a hand-crafted evaluation function — it estimates position quality purely through rapid self-play simulations.',
      kind: 'mcts_rollout_view'
    },
    {
      key: 'mcts_backprop',
      name: 'MCTS: Backprop & Decision',
      definition: 'Propagating the simulation outcome up the tree path to update visit counts N and cumulative utility U, selecting the most visited root child.',
      notation: 'N(n) \\leftarrow N(n) + 1 \\;\\cdot\\; U(n) \\leftarrow U(n) + v \\;\\cdot\\; \\text{Move} = \\arg\\max_a N(\\text{child}_a)',
      tip: 'The final chosen move is the most visited node (highest N), which is much more robust against statistical outliers than the node with the highest single win rate.',
      kind: 'mcts_backprop_view'
    },
    {
      key: 'asymmetric_tree',
      name: 'Asymmetric Tree Growth',
      definition: 'MCTS dynamically directs search depth into promising variations while leaving weak moves shallowly explored.',
      notation: '\\text{Depth varies dynamically: } d_{\\text{promising}} \\gg d_{\\text{poor}} \\;\\cdot\\; \\text{Adaptive branching}',
      tip: 'Unlike uniform minimax depth bounds, MCTS naturally builds deep, narrow search branches where the game is closely contested.',
      kind: 'asymmetric_tree_view'
    }
  ];

  // ---- TOPIC 5: EVALUATING GAME SEARCH ALGORITHMS ----
  const EVALUATION_CONCEPTS = [
    {
      key: 'comp_terminology',
      name: 'Game Search Parameters',
      definition: 'Key quantities describing game complexity: branching factor b, maximum depth m, cutoff depth d, and rollout count N.',
      notation: 'b = \\text{legal actions per state} \\;\\cdot\\; m = \\text{max plies to terminal} \\;\\cdot\\; d = \\text{search cutoff ply}',
      tip: 'In Chess, b ≈ 35 and m ≈ 80, giving 35⁸⁰ total states. In Go, b ≈ 250 and m ≈ 150, giving 10³⁶⁰ states.',
      kind: 'eval_parameters'
    },
    {
      key: 'time_space_comp',
      name: 'Time & Space Complexity',
      definition: 'Comparison of theoretical computational bounds across Minimax, Alpha-Beta, Expectiminimax, and Monte Carlo Tree Search.',
      notation: '\\text{Minimax: } O(b^m) \\;\\cdot\\; \\text{Alpha-Beta: } O(b^{m/2}) \\;\\cdot\\; \\text{Expectiminimax: } O(b^m n^m)',
      tip: 'Alpha-Beta with optimal move ordering effectively halves the exponent, allowing twice the search depth in the same execution time.',
      kind: 'eval_complexity'
    },
    {
      key: 'comp_properties',
      name: 'Completeness & Optimality',
      definition: 'Whether algorithms are guaranteed to find the optimal strategy against rational opponents vs. exploiting suboptimal blunders.',
      notation: '\\text{Minimax / Alpha-Beta: Optimal against optimal opponent} \\;\\cdot\\; \\text{MCTS: Converges as } N \\to \\infty',
      tip: 'Minimax assumes worst-case opponent play. If the opponent makes a mistake, Minimax will win, but it does not take risks to actively exploit blunders.',
      kind: 'eval_properties'
    }
  ];

  // ---- STEPPER DATA FOR TOPIC 2: MINIMAX TRACE (AIMA Fig 5.2) ----
  const FIG52_STEPS = [
    { step: 0, node: 'A', desc: 'Start at Root A (MAX). Depth-first traversal begins by exploring child B.', active: ['A', 'B'], values: { A: '?', B: '?', C: '?', D: '?' } },
    { step: 1, node: 'B1', desc: 'Evaluate leaf B1: utility = +3.', active: ['A', 'B', 'B1'], values: { A: '?', B: '3', C: '?', D: '?' } },
    { step: 2, node: 'B2', desc: 'Evaluate leaf B2: utility = +12. MIN at B keeps min(3, 12) = 3.', active: ['A', 'B', 'B2'], values: { A: '?', B: '3', C: '?', D: '?' } },
    { step: 3, node: 'B3', desc: 'Evaluate leaf B3: utility = +8. MIN at B keeps min(3, 8) = 3.', active: ['A', 'B', 'B3'], values: { A: '?', B: '3', C: '?', D: '?' } },
    { step: 4, node: 'B', desc: 'Backup to B: value(B) = min(3, 12, 8) = 3. Root A updates max(-∞, 3) = 3.', active: ['A', 'B'], values: { A: '3', B: '3', C: '?', D: '?' } },
    { step: 5, node: 'C', desc: 'Root A explores second child C (MIN).', active: ['A', 'C'], values: { A: '3', B: '3', C: '?', D: '?' } },
    { step: 6, node: 'C1', desc: 'Evaluate leaf C1: utility = +2.', active: ['A', 'C', 'C1'], values: { A: '3', B: '3', C: '2', D: '?' } },
    { step: 7, node: 'C2', desc: 'Evaluate leaf C2: utility = +4. MIN at C keeps min(2, 4) = 2.', active: ['A', 'C', 'C2'], values: { A: '3', B: '3', C: '2', D: '?' } },
    { step: 8, node: 'C3', desc: 'Evaluate leaf C3: utility = +6. MIN at C keeps min(2, 6) = 2.', active: ['A', 'C', 'C3'], values: { A: '3', B: '3', C: '2', D: '?' } },
    { step: 9, node: 'C', desc: 'Backup to C: value(C) = min(2, 4, 6) = 2. Root A keeps max(3, 2) = 3.', active: ['A', 'C'], values: { A: '3', B: '3', C: '2', D: '?' } },
    { step: 10, node: 'D', desc: 'Root A explores third child D (MIN).', active: ['A', 'D'], values: { A: '3', B: '3', C: '2', D: '?' } },
    { step: 11, node: 'D1', desc: 'Evaluate leaf D1: utility = +14.', active: ['A', 'D', 'D1'], values: { A: '3', B: '3', C: '2', D: '14' } },
    { step: 12, node: 'D2', desc: 'Evaluate leaf D2: utility = +5. MIN at D keeps min(14, 5) = 5.', active: ['A', 'D', 'D2'], values: { A: '3', B: '3', C: '2', D: '5' } },
    { step: 13, node: 'D3', desc: 'Evaluate leaf D3: utility = +2. MIN at D keeps min(5, 2) = 2.', active: ['A', 'D', 'D3'], values: { A: '3', B: '3', C: '2', D: '2' } },
    { step: 14, node: 'D', desc: 'Backup to D: value(D) = min(14, 5, 2) = 2. Root A keeps max(3, 2) = 3.', active: ['A', 'D'], values: { A: '3', B: '3', C: '2', D: '2' } },
    { step: 15, node: 'A', desc: 'Decision at Root A: max(B:3, C:2, D:2) = 3. Optimal action for MAX is A → B.', active: ['A', 'B'], values: { A: '3', B: '3', C: '2', D: '2' }, optimal: 'A_B' }
  ];

  // ---- STEPPER DATA FOR TOPIC 2: ALPHA-BETA PRUNING (AIMA Fig 5.7) ----
  const ALPHABETA_STEPS = [
    { step: 0, node: 'A', desc: 'Initialize Root A with [α = -∞, β = +∞]. Explore child B.', ab: { A: '[-∞, +∞]', B: '[-∞, +∞]' }, pruned: [], active: ['A', 'B'] },
    { step: 1, node: 'B1', desc: 'Leaf B1 evaluated (val = 3). MIN at B updates β = min(+∞, 3) = 3. Active window at B: [-∞, 3].', ab: { A: '[-∞, +∞]', B: '[-∞, 3]' }, pruned: [], active: ['A', 'B', 'B1'] },
    { step: 2, node: 'B2', desc: 'Leaf B2 evaluated (val = 12). MIN at B keeps β = min(3, 12) = 3.', ab: { A: '[-∞, +∞]', B: '[-∞, 3]' }, pruned: [], active: ['A', 'B', 'B2'] },
    { step: 3, node: 'B3', desc: 'Leaf B3 evaluated (val = 8). MIN at B keeps β = min(3, 8) = 3.', ab: { A: '[-∞, +∞]', B: '[-∞, 3]' }, pruned: [], active: ['A', 'B', 'B3'] },
    { step: 4, node: 'B', desc: 'Backup to B: value = 3. Root A updates α = max(-∞, 3) = 3. Active window at A: [3, +∞].', ab: { A: '[3, +∞]', B: '[-∞, 3]' }, pruned: [], active: ['A'] },
    { step: 5, node: 'C', desc: 'Explore child C with window [α = 3, β = +∞].', ab: { A: '[3, +∞]', C: '[3, +∞]' }, pruned: [], active: ['A', 'C'] },
    { step: 6, node: 'C1', desc: 'Leaf C1 evaluated (val = 2). MIN at C updates β = min(+∞, 2) = 2. Window at C: [3, 2].', ab: { A: '[3, +∞]', C: '[3, 2]' }, pruned: [], active: ['A', 'C', 'C1'] },
    { step: 7, node: 'C_PRUNE', desc: 'PRUNING TRIGGERED! α = 3 ≥ β = 2 (α ≥ β). Leaves C2 (4) and C3 (6) are pruned!', ab: { A: '[3, +∞]', C: '≤ 2' }, pruned: ['C2', 'C3'], active: ['C'] },
    { step: 8, node: 'D', desc: 'Explore child D with window [α = 3, β = +∞].', ab: { A: '[3, +∞]', D: '[3, +∞]' }, pruned: ['C2', 'C3'], active: ['A', 'D'] },
    { step: 9, node: 'D1', desc: 'Leaf D1 evaluated (val = 14). MIN at D updates β = min(+∞, 14) = 14. Window: [3, 14].', ab: { A: '[3, +∞]', D: '[3, 14]' }, pruned: ['C2', 'C3'], active: ['A', 'D', 'D1'] },
    { step: 10, node: 'D2', desc: 'Leaf D2 evaluated (val = 5). MIN at D updates β = min(14, 5) = 5. Window: [3, 5].', ab: { A: '[3, +∞]', D: '[3, 5]' }, pruned: ['C2', 'C3'], active: ['A', 'D', 'D2'] },
    { step: 11, node: 'D3', desc: 'Leaf D3 evaluated (val = 2). MIN at D updates β = min(5, 2) = 2. Window: [3, 2] ⇒ D returns 2.', ab: { A: '[3, +∞]', D: '2' }, pruned: ['C2', 'C3'], active: ['A', 'D', 'D3'] },
    { step: 12, node: 'A_FINAL', desc: 'Alpha-Beta completes! Root A returns 3 (move A → B). Saved 2 leaf evaluations with 100% exact outcome.', ab: { A: '3' }, pruned: ['C2', 'C3'], active: ['A', 'B'], finished: true }
  ];

  class AdversarialUI {
    constructor() {
      this.topicIdx = 0;
      this.conceptIdx = 0;
      
      // Interactive Steppers State
      this.minimaxStep = 0;
      this.minimaxTimer = null;
      this.alphaBetaStep = 0;
      this.alphaBetaTimer = null;

      // Interactive Calculator States
      this.stateData = {
        activePerspective: 'MAX',
        selectedComponent: 'initial',
        selectedOutcome: 'win',
        infoMode: 'perfect',
        
        // Topic 3: Heuristics
        weights: { queen: 9, rook: 5, bishop: 3, knight: 3, pawn: 1, center: 2 },
        pieces: { queen: 1, rook: 2, bishop: 2, knight: 2, pawn: 8, center: 3 },
        
        // Topic 4: MCTS UCB1
        ucb: { N_parent: 100, N_child: 40, U_child: 28, C: 1.414 },
        
        // Topic 4: Expectiminimax
        diceProb: 0.5
      };

      this.initDOMElements();
      this.render();
    }

    initDOMElements() {
      this.topicTabsEl = document.getElementById('adv-topic-tabs');
      this.conceptColEl = document.getElementById('adv-concept-col');
      this.graphColEl = document.getElementById('adv-graph-col');
    }

    getCurrentConcepts() {
      switch (this.topicIdx) {
        case 0: return TERMINOLOGY_CONCEPTS;
        case 1: return MINIMAX_CONCEPTS;
        case 2: return HEURISTICS_CONCEPTS;
        case 3: return MCTS_CONCEPTS;
        case 4: return EVALUATION_CONCEPTS;
        default: return TERMINOLOGY_CONCEPTS;
      }
    }

    render() {
      this.renderTopicTabs();
      this.renderMainContent();
      if (window.lucide) {
        window.lucide.createIcons();
      }
    }

    renderTopicTabs() {
      if (!this.topicTabsEl) return;
      this.topicTabsEl.innerHTML = ADV_TOPICS.map((topic, i) => `
        <button class="sl-topic-tab ${i === this.topicIdx ? 'active' : ''}" data-topic-idx="${i}">
          ${topic.short}
        </button>
      `).join('');

      this.topicTabsEl.querySelectorAll('.sl-topic-tab').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const idx = parseInt(e.currentTarget.getAttribute('data-topic-idx'), 10);
          if (idx !== this.topicIdx) {
            this.clearTimers();
            this.topicIdx = idx;
            this.conceptIdx = 0;
            this.minimaxStep = 0;
            this.alphaBetaStep = 0;
            this.render();
          }
        });
      });
    }

    clearTimers() {
      if (this.minimaxTimer) { clearInterval(this.minimaxTimer); this.minimaxTimer = null; }
      if (this.alphaBetaTimer) { clearInterval(this.alphaBetaTimer); this.alphaBetaTimer = null; }
    }

    renderMainContent() {
      const concepts = this.getCurrentConcepts();
      const concept = concepts[this.conceptIdx] || concepts[0];
      const topic = ADV_TOPICS[this.topicIdx];

      // 1. Concept Column (Left)
      this.conceptColEl.innerHTML = `
        <div class="teaching-panel" style="display: flex; flex-direction: column; gap: 1.1rem;">
          <div style="border-bottom: 1px solid var(--border-light); padding-bottom: 0.75rem;">
            <span class="sl-topic-badge" style="background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.25); color: #ef4444; margin-bottom: 0.5rem;">
              <i data-lucide="swords"></i> Topic 03 · ${topic.short}
            </span>
            <h2 style="font-size: 1.35rem; font-weight: 700; color: var(--text-primary); margin: 0.25rem 0 0.4rem;">
              ${topic.title}
            </h2>
            <p class="sl-topic-intro" style="color: var(--text-secondary); font-size: 0.88rem; line-height: 1.45; margin: 0;">
              ${this.getTopicIntro(this.topicIdx)}
            </p>
          </div>

          <!-- Concept Selector Chips -->
          <div class="sl-concept-selector" style="display: flex; flex-direction: column; gap: 0.45rem;">
            <div class="sl-concept-row" style="display: flex; flex-wrap: wrap; gap: 0.4rem;">
              ${concepts.slice(0, Math.ceil(concepts.length / 2)).map((c, idx) => `
                <button class="sl-concept-chip ${idx === this.conceptIdx ? 'active' : ''}" data-concept-idx="${idx}" style="font-size: 0.8rem; padding: 0.4rem 0.75rem;">
                  ${c.name}
                </button>
              `).join('')}
            </div>
            ${concepts.length > 3 ? `
              <div class="sl-concept-row" style="display: flex; flex-wrap: wrap; gap: 0.4rem;">
                ${concepts.slice(Math.ceil(concepts.length / 2)).map((c, idx) => {
                  const actualIdx = idx + Math.ceil(concepts.length / 2);
                  return `
                    <button class="sl-concept-chip ${actualIdx === this.conceptIdx ? 'active' : ''}" data-concept-idx="${actualIdx}" style="font-size: 0.8rem; padding: 0.4rem 0.75rem;">
                      ${c.name}
                    </button>
                  `;
                }).join('')}
              </div>
            ` : ''}
          </div>

          <!-- Definition Box -->
          <div style="background: rgba(15, 23, 42, 0.03); border: 1px solid var(--border-light); border-radius: 10px; padding: 0.9rem 1.1rem;">
            <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em; margin-bottom: 0.25rem;">
              Definition
            </div>
            <div style="color: var(--text-primary); font-size: 0.92rem; line-height: 1.5; font-weight: 500;">
              ${concept.definition}
            </div>
          </div>

          <!-- AIMA Formula / Notation Box -->
          <div style="background: #1e293b; color: #f8fafc; border-radius: 10px; padding: 0.85rem 1.1rem; font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; line-height: 1.45; border: 1px solid rgba(255,255,255,0.1);">
            <div style="font-size: 0.7rem; font-weight: 700; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.05em; margin-bottom: 0.35rem; font-family: 'Outfit', sans-serif;">
              AIMA Formal Notation
            </div>
            <div style="color: #38bdf8; overflow-x: auto; white-space: pre-wrap;">${concept.notation}</div>
          </div>

          <!-- Live Teaching Tip -->
          <div style="background: rgba(245, 158, 11, 0.08); border-left: 4px solid #f59e0b; border-radius: 4px 10px 10px 4px; padding: 0.85rem 1.1rem;">
            <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: #b45309; letter-spacing: 0.05em; margin-bottom: 0.2rem; display: flex; align-items: center; gap: 0.3rem;">
              <i data-lucide="lightbulb" style="width: 14px; height: 14px;"></i> Teaching Tip
            </div>
            <div style="color: #78350f; font-size: 0.88rem; line-height: 1.45;">
              ${concept.tip}
            </div>
          </div>
        </div>
      `;

      // Wire up concept selector buttons
      this.conceptColEl.querySelectorAll('.sl-concept-chip').forEach(btn => {
        btn.addEventListener('click', (e) => {
          this.clearTimers();
          this.conceptIdx = parseInt(e.currentTarget.getAttribute('data-concept-idx'), 10);
          this.renderMainContent();
          if (window.lucide) window.lucide.createIcons();
        });
      });

      // 2. Illustration Column (Right)
      this.renderIllustration(concept);
    }

    getTopicIntro(idx) {
      switch (idx) {
        case 0: return 'Unlike single-agent search where an agent plans against nature, game playing requires finding a contingency strategy against an active opponent.';
        case 1: return 'Minimax computes perfect play via post-order tree evaluation. Alpha-Beta pruning achieves identical results while cutting the effective search branch in half.';
        case 2: return 'Real-time games must truncate search at depth limits and approximate board quality using heuristic evaluation functions and tactical quiescence checks.';
        case 3: return 'Stochastic games handle randomness via chance nodes. Monte Carlo Tree Search (MCTS) navigates massive state spaces (like Go) via selective simulation.';
        case 4: return 'Compare adversarial search algorithms across time complexity, memory bounds, completeness, and game-theoretic optimality.';
        default: return '';
      }
    }

    renderIllustration(concept) {
      if (!this.graphColEl) return;

      switch (concept.kind) {
        // Topic 1
        case 'env_conflict': this.renderEnvConflictIllustration(); break;
        case 'formal_components': this.renderFormalComponentsIllustration(); break;
        case 'tree_plies': this.renderTreePliesIllustration(); break;
        case 'zero_sum_balance': this.renderZeroSumBalanceIllustration(); break;
        case 'info_visibility': this.renderInfoVisibilityIllustration(); break;
        case 'stochastic_branching': this.renderStochasticBranchingIllustration(); break;

        // Topic 2
        case 'minimax_static': this.renderMinimaxStaticIllustration(); break;
        case 'minimax_stepper': this.renderMinimaxStepperIllustration(); break;
        case 'alphabeta_bounds_view': this.renderAlphaBetaBoundsIllustration(); break;
        case 'alphabeta_stepper': this.renderAlphaBetaStepperIllustration(); break;
        case 'move_ordering_comp': this.renderMoveOrderingIllustration(); break;

        // Topic 3
        case 'cutoff_diagram': this.renderCutoffDiagramIllustration(); break;
        case 'eval_calculator': this.renderEvalCalculatorIllustration(); break;
        case 'quiescence_trace': this.renderQuiescenceIllustration(); break;
        case 'horizon_effect_view': this.renderHorizonEffectIllustration(); break;
        case 'transposition_view': this.renderTranspositionIllustration(); break;

        // Topic 4
        case 'expectiminimax_view': this.renderExpectiminimaxIllustration(); break;
        case 'utility_scale_view': this.renderUtilityScaleIllustration(); break;
        case 'mcts_ucb1_calc': this.renderMctsUcb1Illustration(); break;
        case 'mcts_rollout_view': this.renderMctsRolloutIllustration(); break;
        case 'mcts_backprop_view': this.renderMctsBackpropIllustration(); break;
        case 'asymmetric_tree_view': this.renderAsymmetricTreeIllustration(); break;

        // Topic 5
        case 'eval_parameters': this.renderEvalParametersIllustration(); break;
        case 'eval_complexity': this.renderEvalComplexityIllustration(); break;
        case 'eval_properties': this.renderEvalPropertiesIllustration(); break;

        default:
          this.graphColEl.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--text-muted);">Illustration rendering...</div>`;
      }
    }

    // =========================================================================
    // TOPIC 1 ILLUSTRATIONS (Game Terminology)
    // =========================================================================

    renderEnvConflictIllustration() {
      const isMax = this.stateData.activePerspective === 'MAX';
      this.graphColEl.innerHTML = `
        <div style="display: flex; flex-direction: column; height: 100%; gap: 1rem; padding: 0.5rem 0.75rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-light); padding-bottom: 0.6rem;">
            <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary);">
              2-Player Competitive Environment
            </div>
            <div style="display: flex; gap: 0.4rem; background: rgba(15,23,42,0.05); padding: 0.2rem; border-radius: 8px;">
              <button class="btn-ctrl ${isMax ? 'active' : ''}" id="btn-persp-max" style="padding: 0.25rem 0.65rem; font-size: 0.75rem; border-radius: 6px;">
                MAX Perspective
              </button>
              <button class="btn-ctrl ${!isMax ? 'active' : ''}" id="btn-persp-min" style="padding: 0.25rem 0.65rem; font-size: 0.75rem; border-radius: 6px;">
                MIN Perspective
              </button>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 80px 1fr; gap: 0.75rem; align-items: center; background: rgba(248, 250, 252, 0.8); border: 1px solid var(--border-light); border-radius: 12px; padding: 1.25rem;">
            
            <div style="background: ${isMax ? 'linear-gradient(135deg, rgba(37,99,235,0.12), rgba(37,99,235,0.04))' : '#ffffff'}; border: 2px solid ${isMax ? '#2563eb' : 'var(--border-light)'}; border-radius: 10px; padding: 1rem; text-align: center; transition: all 0.2s ease;">
              <div style="display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; background: #2563eb; color: #ffffff; border-radius: 50%; font-weight: 800; font-size: 1.1rem; margin-bottom: 0.5rem; box-shadow: 0 4px 10px rgba(37,99,235,0.3);">
                ▲
              </div>
              <div style="font-weight: 700; font-size: 1rem; color: #1e3a8a;">Player MAX (X)</div>
              <div style="font-size: 0.78rem; color: #475569; margin: 0.25rem 0 0.6rem;">Goal: <strong>Maximize</strong> Utility</div>
              <div style="background: #ffffff; border: 1px solid rgba(37,99,235,0.25); border-radius: 6px; padding: 0.35rem 0.5rem; font-family: monospace; font-size: 0.85rem; font-weight: 700; color: #2563eb;">
                Utility = +1.0
              </div>
            </div>

            <div style="text-align: center; display: flex; flex-direction: column; align-items: center; gap: 0.3rem;">
              <div style="font-weight: 800; font-size: 1.2rem; color: #ef4444; background: rgba(239,68,68,0.1); width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(239,68,68,0.25);">
                VS
              </div>
              <span style="font-size: 0.68rem; font-weight: 700; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.05em;">Zero-Sum</span>
              <div style="font-family: monospace; font-size: 0.72rem; color: #64748b; background: #ffffff; padding: 0.15rem 0.35rem; border-radius: 4px; border: 1px solid var(--border-light);">
                ∑ U_i = 0
              </div>
            </div>

            <div style="background: ${!isMax ? 'linear-gradient(135deg, rgba(220,38,38,0.12), rgba(220,38,38,0.04))' : '#ffffff'}; border: 2px solid ${!isMax ? '#dc2626' : 'var(--border-light)'}; border-radius: 10px; padding: 1rem; text-align: center; transition: all 0.2s ease;">
              <div style="display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; background: #dc2626; color: #ffffff; border-radius: 50%; font-weight: 800; font-size: 1.1rem; margin-bottom: 0.5rem; box-shadow: 0 4px 10px rgba(220,38,38,0.3);">
                ▼
              </div>
              <div style="font-weight: 700; font-size: 1rem; color: #991b1b;">Player MIN (O)</div>
              <div style="font-size: 0.78rem; color: #475569; margin: 0.25rem 0 0.6rem;">Goal: <strong>Minimize</strong> Utility</div>
              <div style="background: #ffffff; border: 1px solid rgba(220,38,38,0.25); border-radius: 6px; padding: 0.35rem 0.5rem; font-family: monospace; font-size: 0.85rem; font-weight: 700; color: #dc2626;">
                Utility = -1.0
              </div>
            </div>
          </div>

          <div style="background: #ffffff; border: 1px solid var(--border-light); border-radius: 10px; padding: 0.9rem 1.1rem; flex: 1; display: flex; flex-direction: column; justify-content: center;">
            <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.4rem;">
              <i data-lucide="target" style="width: 15px; height: 15px; color: ${isMax ? '#2563eb' : '#dc2626'};"></i>
              Current Active View: ${isMax ? 'MAX\'s Strategic Goal' : 'MIN\'s Counter-Strategy'}
            </div>
            <p style="font-size: 0.84rem; color: var(--text-secondary); line-height: 1.45; margin: 0 0 0.5rem;">
              ${isMax 
                ? 'MAX assumes MIN will always make the worst possible move for MAX. MAX selects actions that yield the highest possible guaranteed score against MIN\'s best defense.'
                : 'MIN evaluates every board configuration from MAX\'s score perspective and chooses the move that pushes MAX\'s score to the lowest attainable value.'}
            </p>
            <div style="display: flex; gap: 0.75rem; font-family: monospace; font-size: 0.78rem; color: #475569; background: rgba(15,23,42,0.03); padding: 0.5rem 0.75rem; border-radius: 6px;">
              <div><span>to_move:</span> <strong style="color: ${isMax ? '#2563eb' : '#dc2626'};">${isMax ? 'MAX' : 'MIN'}</strong></div>
              <div><span>best_val:</span> <strong style="color: #059669;">${isMax ? 'max_{a} Minimax(s\')' : 'min_{a} Minimax(s\')'}</strong></div>
            </div>
          </div>
        </div>
      `;

      document.getElementById('btn-persp-max')?.addEventListener('click', () => {
        this.stateData.activePerspective = 'MAX';
        this.renderIllustration(TERMINOLOGY_CONCEPTS[this.conceptIdx]);
        if (window.lucide) window.lucide.createIcons();
      });
      document.getElementById('btn-persp-min')?.addEventListener('click', () => {
        this.stateData.activePerspective = 'MIN';
        this.renderIllustration(TERMINOLOGY_CONCEPTS[this.conceptIdx]);
        if (window.lucide) window.lucide.createIcons();
      });
    }

    renderFormalComponentsIllustration() {
      const components = [
        { id: 'initial', name: 'S₀ (Initial State)', desc: 'Specifies how the game starts (e.g. empty board, initial player X to move).', val: 'board={}, to_move=\'X\'' },
        { id: 'player', name: 'PLAYER(s)', desc: 'Defines which player has the turn in state s.', val: 'to_move(s) ∈ {\'MAX\', \'MIN\'}' },
        { id: 'actions', name: 'ACTIONS(s)', desc: 'Returns the set of legal moves available in state s.', val: '{(1,1), (1,2), ..., (3,3)}' },
        { id: 'result', name: 'RESULT(s, a)', desc: 'Transition model returning the resulting state after move a.', val: 's\' = board ∪ {(r,c): player}' },
        { id: 'terminal', name: 'TERMINAL-TEST(s)', desc: 'True when the game has ended (win, loss, or draw).', val: 'is_win(s) ∨ moves_left == 0' },
        { id: 'utility', name: 'UTILITY(s, p)', desc: 'Objective numerical payoff of terminal state s for player p.', val: 'MAX: +1 (win), 0 (draw), -1 (loss)' }
      ];

      const selected = components.find(c => c.id === this.stateData.selectedComponent) || components[0];

      this.graphColEl.innerHTML = `
        <div style="display: flex; flex-direction: column; height: 100%; gap: 0.75rem; padding: 0.5rem 0.75rem;">
          <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); border-bottom: 1px solid var(--border-light); padding-bottom: 0.5rem;">
            The 6 Formal Game Components (AIMA ⟨S₀, Player, Actions, Result, Terminal, Utility⟩)
          </div>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem;">
            ${components.map(c => `
              <button class="btn-ctrl ${c.id === selected.id ? 'active' : ''}" data-comp-id="${c.id}" style="text-align: left; padding: 0.5rem 0.65rem; border-radius: 8px; font-size: 0.78rem; display: flex; flex-direction: column; gap: 0.2rem;">
                <span style="font-weight: 700; font-family: monospace;">${c.name.split(' ')[0]}</span>
                <span style="font-size: 0.7rem; color: ${c.id === selected.id ? 'rgba(255,255,255,0.9)' : 'var(--text-muted)'};">${c.name.split(' ').slice(1).join(' ')}</span>
              </button>
            `).join('')}
          </div>

          <div style="background: rgba(248, 250, 252, 0.9); border: 1px solid var(--border-light); border-radius: 10px; padding: 1rem; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
                <span style="font-weight: 700; font-size: 0.95rem; color: #1e3a8a;">${selected.name}</span>
                <span style="font-size: 0.72rem; font-weight: 700; text-transform: uppercase; background: rgba(37,99,235,0.1); color: #2563eb; padding: 0.2rem 0.5rem; border-radius: 4px;">AIMA Form</span>
              </div>
              <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.45; margin: 0 0 0.75rem;">
                ${selected.desc}
              </p>
            </div>

            <div style="background: #1e293b; border-radius: 8px; padding: 0.75rem 0.9rem; font-family: 'JetBrains Mono', monospace; font-size: 0.82rem; color: #f8fafc;">
              <div style="font-size: 0.68rem; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.05em; margin-bottom: 0.25rem;">
                Concrete Example (Tic-Tac-Toe / AIMA GameState):
              </div>
              <div style="color: #4ade80;">${selected.val}</div>
            </div>
          </div>
        </div>
      `;

      this.graphColEl.querySelectorAll('button[data-comp-id]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          this.stateData.selectedComponent = e.currentTarget.getAttribute('data-comp-id');
          this.renderIllustration(TERMINOLOGY_CONCEPTS[this.conceptIdx]);
          if (window.lucide) window.lucide.createIcons();
        });
      });
    }

    renderTreePliesIllustration() {
      this.graphColEl.innerHTML = `
        <div style="display: flex; flex-direction: column; height: 100%; gap: 0.5rem; padding: 0.5rem 0.75rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-light); padding-bottom: 0.4rem;">
            <div style="font-weight: 700; font-size: 0.92rem; color: var(--text-primary);">
              Game Tree Architecture: Plies vs. Full Moves
            </div>
            <div style="font-size: 0.75rem; background: rgba(15,23,42,0.06); padding: 0.2rem 0.5rem; border-radius: 6px; font-weight: 600; color: #475569;">
              1 Move = 2 Plies (MAX + MIN)
            </div>
          </div>

          <div style="flex: 1; min-height: 230px; display: flex; justify-content: center; align-items: center; background: #ffffff; border: 1px solid var(--border-light); border-radius: 10px; overflow: hidden; position: relative;">
            <svg viewBox="0 0 540 230" style="width: 100%; height: 100%; max-height: 250px;">
              <rect x="0" y="8" width="540" height="52" fill="rgba(37,99,235,0.04)" />
              <text x="12" y="24" fill="#2563eb" font-size="11" font-weight="700" font-family="Outfit, sans-serif">Ply 0 (MAX Root)</text>
              <text x="12" y="38" fill="#64748b" font-size="9" font-family="Outfit, sans-serif">Depth 0 · Move 1 (White)</text>

              <rect x="0" y="66" width="540" height="62" fill="rgba(220,38,38,0.04)" />
              <text x="12" y="84" fill="#dc2626" font-size="11" font-weight="700" font-family="Outfit, sans-serif">Ply 1 (MIN Replies)</text>
              <text x="12" y="98" fill="#64748b" font-size="9" font-family="Outfit, sans-serif">Depth 1 · Move 1 (Black)</text>

              <rect x="0" y="134" width="540" height="88" fill="rgba(15,23,42,0.02)" />
              <text x="12" y="152" fill="#475569" font-size="11" font-weight="700" font-family="Outfit, sans-serif">Ply 2 (MAX Terminal)</text>
              <text x="12" y="166" fill="#64748b" font-size="9" font-family="Outfit, sans-serif">Depth 2 · Utility Leaves</text>

              <line x1="270" y1="36" x2="160" y2="92" stroke="#94a3b8" stroke-width="2" />
              <line x1="270" y1="36" x2="270" y2="92" stroke="#94a3b8" stroke-width="2" />
              <line x1="270" y1="36" x2="380" y2="92" stroke="#94a3b8" stroke-width="2" />

              <line x1="160" y1="102" x2="110" y2="165" stroke="#94a3b8" stroke-width="1.5" />
              <line x1="160" y1="102" x2="160" y2="165" stroke="#94a3b8" stroke-width="1.5" />
              <line x1="160" y1="102" x2="210" y2="165" stroke="#94a3b8" stroke-width="1.5" />

              <line x1="270" y1="102" x2="245" y2="165" stroke="#94a3b8" stroke-width="1.5" />
              <line x1="270" y1="102" x2="295" y2="165" stroke="#94a3b8" stroke-width="1.5" />

              <line x1="380" y1="102" x2="350" y2="165" stroke="#94a3b8" stroke-width="1.5" />
              <line x1="380" y1="102" x2="410" y2="165" stroke="#94a3b8" stroke-width="1.5" />

              <polygon points="270,16 288,44 252,44" fill="#2563eb" stroke="#1d4ed8" stroke-width="2" />
              <text x="270" y="38" fill="#ffffff" font-size="11" font-weight="800" text-anchor="middle" font-family="Outfit, sans-serif">A</text>

              <polygon points="142,88 178,88 160,116" fill="#dc2626" stroke="#b91c1c" stroke-width="2" />
              <text x="160" y="99" fill="#ffffff" font-size="11" font-weight="800" text-anchor="middle" font-family="Outfit, sans-serif">B</text>

              <polygon points="252,88 288,88 270,116" fill="#dc2626" stroke="#b91c1c" stroke-width="2" />
              <text x="270" y="99" fill="#ffffff" font-size="11" font-weight="800" text-anchor="middle" font-family="Outfit, sans-serif">C</text>

              <polygon points="362,88 398,88 380,116" fill="#dc2626" stroke="#b91c1c" stroke-width="2" />
              <text x="380" y="99" fill="#ffffff" font-size="11" font-weight="800" text-anchor="middle" font-family="Outfit, sans-serif">D</text>

              <rect x="96" y="165" width="28" height="22" rx="4" fill="#ffffff" stroke="#2563eb" stroke-width="1.5" />
              <text x="110" y="180" fill="#1e3a8a" font-size="11" font-weight="700" text-anchor="middle" font-family="monospace">+3</text>

              <rect x="146" y="165" width="28" height="22" rx="4" fill="#ffffff" stroke="#2563eb" stroke-width="1.5" />
              <text x="160" y="180" fill="#1e3a8a" font-size="11" font-weight="700" text-anchor="middle" font-family="monospace">+12</text>

              <rect x="196" y="165" width="28" height="22" rx="4" fill="#ffffff" stroke="#2563eb" stroke-width="1.5" />
              <text x="210" y="180" fill="#1e3a8a" font-size="11" font-weight="700" text-anchor="middle" font-family="monospace">+8</text>

              <rect x="231" y="165" width="28" height="22" rx="4" fill="#ffffff" stroke="#2563eb" stroke-width="1.5" />
              <text x="245" y="180" fill="#1e3a8a" font-size="11" font-weight="700" text-anchor="middle" font-family="monospace">+2</text>

              <rect x="281" y="165" width="28" height="22" rx="4" fill="#ffffff" stroke="#2563eb" stroke-width="1.5" />
              <text x="295" y="180" fill="#1e3a8a" font-size="11" font-weight="700" text-anchor="middle" font-family="monospace">+4</text>

              <rect x="336" y="165" width="28" height="22" rx="4" fill="#ffffff" stroke="#2563eb" stroke-width="1.5" />
              <text x="350" y="180" fill="#1e3a8a" font-size="11" font-weight="700" text-anchor="middle" font-family="monospace">+14</text>

              <rect x="396" y="165" width="28" height="22" rx="4" fill="#ffffff" stroke="#2563eb" stroke-width="1.5" />
              <text x="410" y="180" fill="#1e3a8a" font-size="11" font-weight="700" text-anchor="middle" font-family="monospace">+2</text>
            </svg>
          </div>

          <div style="display: flex; justify-content: space-around; background: rgba(15,23,42,0.03); border-radius: 8px; padding: 0.4rem; font-size: 0.78rem; color: #475569;">
            <div style="display: flex; align-items: center; gap: 0.35rem;">
              <span style="color: #2563eb; font-weight: 800;">▲</span> MAX Node (Takes Max)
            </div>
            <div style="display: flex; align-items: center; gap: 0.35rem;">
              <span style="color: #dc2626; font-weight: 800;">▼</span> MIN Node (Takes Min)
            </div>
            <div style="display: flex; align-items: center; gap: 0.35rem;">
              <span style="border: 1px solid #2563eb; padding: 0 0.3rem; border-radius: 3px; font-family: monospace; font-size: 0.72rem;">+k</span> Leaf Utility
            </div>
          </div>
        </div>
      `;
    }

    renderZeroSumBalanceIllustration() {
      const outcomes = {
        win: { max: '+1', min: '-1', sum: '0', label: 'MAX Wins (X)', desc: 'MAX receives +1 payoff; MIN receives -1 penalty.' },
        draw: { max: '0', min: '0', sum: '0', label: 'Draw Game', desc: 'Both players receive 0 payoff; sum remains 0.' },
        loss: { max: '-1', min: '+1', sum: '0', label: 'MIN Wins (O)', desc: 'MAX receives -1 penalty; MIN receives +1 payoff.' }
      };

      const sel = outcomes[this.stateData.selectedOutcome] || outcomes.win;

      this.graphColEl.innerHTML = `
        <div style="display: flex; flex-direction: column; height: 100%; gap: 0.75rem; padding: 0.5rem 0.75rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-light); padding-bottom: 0.5rem;">
            <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary);">
              Zero-Sum Balance: U_{MAX} + U_{MIN} = 0
            </div>
            <div style="display: flex; gap: 0.3rem;">
              ${Object.keys(outcomes).map(k => `
                <button class="btn-ctrl ${k === this.stateData.selectedOutcome ? 'active' : ''}" data-outcome="${k}" style="padding: 0.25rem 0.55rem; font-size: 0.75rem; border-radius: 6px;">
                  ${outcomes[k].label}
                </button>
              `).join('')}
            </div>
          </div>

          <div style="background: rgba(248,250,252,0.9); border: 1px solid var(--border-light); border-radius: 10px; padding: 1.25rem; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.75rem; flex: 1;">
            
            <div style="display: flex; align-items: center; justify-content: center; gap: 1.5rem; width: 100%;">
              <div style="background: #ffffff; border: 2px solid #2563eb; border-radius: 10px; padding: 0.9rem 1.2rem; text-align: center; flex: 1; box-shadow: 0 4px 12px rgba(37,99,235,0.08);">
                <div style="font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase;">U(MAX)</div>
                <div style="font-size: 1.8rem; font-weight: 800; color: #2563eb; font-family: 'JetBrains Mono', monospace;">${sel.max}</div>
              </div>

              <div style="font-size: 1.5rem; font-weight: 800; color: #94a3b8;">+</div>

              <div style="background: #ffffff; border: 2px solid #dc2626; border-radius: 10px; padding: 0.9rem 1.2rem; text-align: center; flex: 1; box-shadow: 0 4px 12px rgba(220,38,38,0.08);">
                <div style="font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase;">U(MIN)</div>
                <div style="font-size: 1.8rem; font-weight: 800; color: #dc2626; font-family: 'JetBrains Mono', monospace;">${sel.min}</div>
              </div>

              <div style="font-size: 1.5rem; font-weight: 800; color: #94a3b8;">=</div>

              <div style="background: #059669; border-radius: 10px; padding: 0.9rem 1.2rem; text-align: center; flex: 1; color: #ffffff; box-shadow: 0 4px 12px rgba(5,150,105,0.25);">
                <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; opacity: 0.9;">Total Sum</div>
                <div style="font-size: 1.8rem; font-weight: 800; font-family: 'JetBrains Mono', monospace;">0</div>
              </div>
            </div>

            <div style="background: #ffffff; border: 1px solid var(--border-light); border-radius: 8px; padding: 0.75rem 1rem; width: 100%; text-align: center; font-size: 0.85rem; color: #334155;">
              <strong>Outcome: ${sel.label}</strong> &mdash; ${sel.desc}
            </div>
          </div>
        </div>
      `;

      this.graphColEl.querySelectorAll('button[data-outcome]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          this.stateData.selectedOutcome = e.currentTarget.getAttribute('data-outcome');
          this.renderIllustration(TERMINOLOGY_CONCEPTS[this.conceptIdx]);
          if (window.lucide) window.lucide.createIcons();
        });
      });
    }

    renderInfoVisibilityIllustration() {
      const isPerfect = this.stateData.infoMode === 'perfect';
      this.graphColEl.innerHTML = `
        <div style="display: flex; flex-direction: column; height: 100%; gap: 0.75rem; padding: 0.5rem 0.75rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-light); padding-bottom: 0.5rem;">
            <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary);">
              Information Visibility in Game States
            </div>
            <div style="display: flex; gap: 0.3rem;">
              <button class="btn-ctrl ${isPerfect ? 'active' : ''}" id="btn-info-perfect" style="padding: 0.25rem 0.65rem; font-size: 0.75rem; border-radius: 6px;">
                Perfect Info (Chess / Tic-Tac-Toe)
              </button>
              <button class="btn-ctrl ${!isPerfect ? 'active' : ''}" id="btn-info-imperfect" style="padding: 0.25rem 0.65rem; font-size: 0.75rem; border-radius: 6px;">
                Imperfect Info (Card Games)
              </button>
            </div>
          </div>

          <div style="background: rgba(248, 250, 252, 0.9); border: 1px solid var(--border-light); border-radius: 10px; padding: 1.25rem; flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 1rem;">
            
            ${isPerfect ? `
              <div style="display: grid; grid-template-columns: repeat(3, 50px); grid-template-rows: repeat(3, 50px); gap: 6px; background: #334155; padding: 6px; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                <div style="background: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 800; color: #2563eb; border-radius: 4px;">X</div>
                <div style="background: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 800; color: #dc2626; border-radius: 4px;">O</div>
                <div style="background: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 800; color: #2563eb; border-radius: 4px;">X</div>
                <div style="background: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 800; color: #dc2626; border-radius: 4px;">O</div>
                <div style="background: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 800; color: #2563eb; border-radius: 4px;">X</div>
                <div style="background: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; color: #94a3b8; border-radius: 4px;">·</div>
                <div style="background: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; color: #94a3b8; border-radius: 4px;">·</div>
                <div style="background: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; color: #94a3b8; border-radius: 4px;">·</div>
                <div style="background: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; color: #94a3b8; border-radius: 4px;">·</div>
              </div>
              <div style="text-align: center; max-width: 360px;">
                <div style="font-weight: 700; color: #059669; font-size: 0.95rem; margin-bottom: 0.25rem;">100% Observable Game State</div>
                <p style="font-size: 0.82rem; color: var(--text-secondary); line-height: 1.4; margin: 0;">
                  Both players observe the entire configuration. No hidden variables, dice uncertainty, or private cards exist.
                </p>
              </div>
            ` : `
              <div style="display: flex; gap: 1rem; align-items: center;">
                <div style="width: 70px; height: 95px; background: #1e293b; border: 2px solid #475569; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #94a3b8; font-size: 1.5rem; box-shadow: 0 4px 10px rgba(0,0,0,0.2);">
                  <i data-lucide="help-circle"></i>
                  <span style="font-size: 0.65rem; text-transform: uppercase; font-weight: 700; margin-top: 0.3rem;">Hidden</span>
                </div>
                <div style="width: 70px; height: 95px; background: #1e293b; border: 2px solid #475569; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #94a3b8; font-size: 1.5rem; box-shadow: 0 4px 10px rgba(0,0,0,0.2);">
                  <i data-lucide="help-circle"></i>
                  <span style="font-size: 0.65rem; text-transform: uppercase; font-weight: 700; margin-top: 0.3rem;">Hidden</span>
                </div>
                <div style="width: 70px; height: 95px; background: #ffffff; border: 2px solid #2563eb; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #2563eb; font-weight: 800; font-size: 1.3rem; box-shadow: 0 4px 10px rgba(37,99,235,0.15);">
                  ♠ A
                  <span style="font-size: 0.65rem; text-transform: uppercase; font-weight: 700; color: #64748b; margin-top: 0.3rem;">Visible</span>
                </div>
              </div>
              <div style="text-align: center; max-width: 360px;">
                <div style="font-weight: 700; color: #d97706; font-size: 0.95rem; margin-bottom: 0.25rem;">Information Sets / Belief States</div>
                <p style="font-size: 0.82rem; color: var(--text-secondary); line-height: 1.4; margin: 0;">
                  Opponent cards are private. Search algorithms must reason over <em>probability distributions</em> over possible true states.
                </p>
              </div>
            `}
          </div>
        </div>
      `;

      document.getElementById('btn-info-perfect')?.addEventListener('click', () => {
        this.stateData.infoMode = 'perfect';
        this.renderIllustration(TERMINOLOGY_CONCEPTS[this.conceptIdx]);
        if (window.lucide) window.lucide.createIcons();
      });
      document.getElementById('btn-info-imperfect')?.addEventListener('click', () => {
        this.stateData.infoMode = 'imperfect';
        this.renderIllustration(TERMINOLOGY_CONCEPTS[this.conceptIdx]);
        if (window.lucide) window.lucide.createIcons();
      });
    }

    renderStochasticBranchingIllustration() {
      this.graphColEl.innerHTML = `
        <div style="display: flex; flex-direction: column; height: 100%; gap: 0.75rem; padding: 0.5rem 0.75rem;">
          <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); border-bottom: 1px solid var(--border-light); padding-bottom: 0.5rem;">
            Branching Comparison: Deterministic Action vs. Chance Node
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; flex: 1;">
            
            <div style="background: #ffffff; border: 1px solid var(--border-light); border-radius: 10px; padding: 0.9rem; display: flex; flex-direction: column; align-items: center;">
              <span style="font-weight: 700; font-size: 0.85rem; color: #1e3a8a; margin-bottom: 0.5rem;">Deterministic Move</span>
              
              <svg viewBox="0 0 200 140" style="width: 100%; height: 120px;">
                <line x1="100" y1="25" x2="100" y2="95" stroke="#2563eb" stroke-width="2" />
                <polygon points="100,10 115,35 85,35" fill="#2563eb" stroke="#1d4ed8" stroke-width="1.5" />
                <text x="100" y="29" fill="#ffffff" font-size="10" font-weight="700" text-anchor="middle">s</text>

                <text x="110" y="65" fill="#2563eb" font-size="10" font-family="monospace">Go(a)</text>

                <polygon points="85,95 115,95 100,120" fill="#dc2626" stroke="#b91c1c" stroke-width="1.5" />
                <text x="100" y="106" fill="#ffffff" font-size="10" font-weight="700" text-anchor="middle">s'</text>
              </svg>
              <div style="font-size: 0.75rem; color: var(--text-secondary); text-align: center; line-height: 1.35;">
                P(s' | s, a) = 1.0<br>Direct transition model
              </div>
            </div>

            <div style="background: #ffffff; border: 1px solid var(--border-light); border-radius: 10px; padding: 0.9rem; display: flex; flex-direction: column; align-items: center;">
              <span style="font-weight: 700; font-size: 0.85rem; color: #065f46; margin-bottom: 0.5rem;">Stochastic (Chance Node)</span>
              
              <svg viewBox="0 0 220 140" style="width: 100%; height: 120px;">
                <line x1="110" y1="25" x2="110" y2="55" stroke="#2563eb" stroke-width="1.5" />
                <polygon points="110,10 125,35 95,35" fill="#2563eb" stroke="#1d4ed8" stroke-width="1.5" />
                
                <circle cx="110" cy="65" r="12" fill="#10b981" stroke="#059669" stroke-width="1.5" />
                <text x="110" y="69" fill="#ffffff" font-size="9" font-weight="800" text-anchor="middle">🎲</text>

                <line x1="110" y1="77" x2="55" y2="105" stroke="#059669" stroke-width="1.5" />
                <line x1="110" y1="77" x2="110" y2="105" stroke="#059669" stroke-width="1.5" />
                <line x1="110" y1="77" x2="165" y2="105" stroke="#059669" stroke-width="1.5" />

                <text x="65" y="90" fill="#047857" font-size="8" font-family="monospace">1/6</text>
                <text x="115" y="90" fill="#047857" font-size="8" font-family="monospace">4/6</text>
                <text x="155" y="90" fill="#047857" font-size="8" font-family="monospace">1/6</text>

                <rect x="42" y="105" width="26" height="18" rx="3" fill="#ffffff" stroke="#dc2626" stroke-width="1" />
                <text x="55" y="118" fill="#dc2626" font-size="8" font-weight="700" text-anchor="middle">s₁</text>

                <rect x="97" y="105" width="26" height="18" rx="3" fill="#ffffff" stroke="#dc2626" stroke-width="1" />
                <text x="110" y="118" fill="#dc2626" font-size="8" font-weight="700" text-anchor="middle">s₂</text>

                <rect x="152" y="105" width="26" height="18" rx="3" fill="#ffffff" stroke="#dc2626" stroke-width="1" />
                <text x="165" y="118" fill="#dc2626" font-size="8" font-weight="700" text-anchor="middle">s₃</text>
              </svg>
              <div style="font-size: 0.75rem; color: var(--text-secondary); text-align: center; line-height: 1.35;">
                Expectiminimax Node<br>∑ P(s') · Utility(s')
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // =========================================================================
    // TOPIC 2 ILLUSTRATIONS (Minimax & Alpha-Beta)
    // =========================================================================

    renderMinimaxStaticIllustration() {
      this.graphColEl.innerHTML = `
        <div style="display: flex; flex-direction: column; height: 100%; gap: 0.5rem; padding: 0.5rem 0.75rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-light); padding-bottom: 0.4rem;">
            <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary);">
              AIMA Figure 5.2 — Optimal Minimax Tree Decision
            </div>
            <div style="background: rgba(5,150,105,0.1); color: #059669; font-weight: 700; font-size: 0.78rem; padding: 0.2rem 0.55rem; border-radius: 6px;">
              Optimal Root Move: A → B (Value = 3)
            </div>
          </div>

          <div style="flex: 1; background: #ffffff; border: 1px solid var(--border-light); border-radius: 10px; display: flex; justify-content: center; align-items: center; position: relative;">
            <svg viewBox="0 0 540 220" style="width: 100%; height: 100%; max-height: 240px;">
              <!-- Edges -->
              <line x1="270" y1="36" x2="160" y2="85" stroke="#2563eb" stroke-width="3" />
              <line x1="270" y1="36" x2="270" y2="85" stroke="#cbd5e1" stroke-width="1.5" />
              <line x1="270" y1="36" x2="380" y2="85" stroke="#cbd5e1" stroke-width="1.5" />

              <line x1="160" y1="95" x2="110" y2="155" stroke="#2563eb" stroke-width="2" />
              <line x1="160" y1="95" x2="160" y2="155" stroke="#cbd5e1" stroke-width="1.5" />
              <line x1="160" y1="95" x2="210" y2="155" stroke="#cbd5e1" stroke-width="1.5" />

              <line x1="270" y1="95" x2="245" y2="155" stroke="#cbd5e1" stroke-width="1.5" />
              <line x1="270" y1="95" x2="270" y2="155" stroke="#cbd5e1" stroke-width="1.5" />
              <line x1="270" y1="95" x2="295" y2="155" stroke="#cbd5e1" stroke-width="1.5" />

              <line x1="380" y1="95" x2="350" y2="155" stroke="#cbd5e1" stroke-width="1.5" />
              <line x1="380" y1="95" x2="380" y2="155" stroke="#cbd5e1" stroke-width="1.5" />
              <line x1="380" y1="95" x2="410" y2="155" stroke="#cbd5e1" stroke-width="1.5" />

              <!-- Root Node A -->
              <polygon points="270,16 288,44 252,44" fill="#2563eb" stroke="#1d4ed8" stroke-width="2" />
              <text x="270" y="38" fill="#ffffff" font-size="11" font-weight="800" text-anchor="middle">3</text>
              <text x="270" y="10" fill="#1e3a8a" font-size="10" font-weight="700" text-anchor="middle">A (MAX = 3)</text>

              <!-- Level 1 MIN Nodes -->
              <polygon points="142,80 178,80 160,108" fill="#dc2626" stroke="#b91c1c" stroke-width="2" />
              <text x="160" y="92" fill="#ffffff" font-size="11" font-weight="800" text-anchor="middle">3</text>
              <text x="160" y="122" fill="#991b1b" font-size="10" font-weight="700" text-anchor="middle">B (MIN = 3)</text>

              <polygon points="252,80 288,80 270,108" fill="#cbd5e1" stroke="#94a3b8" stroke-width="1.5" />
              <text x="270" y="92" fill="#475569" font-size="11" font-weight="800" text-anchor="middle">2</text>
              <text x="270" y="122" fill="#64748b" font-size="10" font-weight="700" text-anchor="middle">C (MIN = 2)</text>

              <polygon points="362,80 398,80 380,108" fill="#cbd5e1" stroke="#94a3b8" stroke-width="1.5" />
              <text x="380" y="92" fill="#475569" font-size="11" font-weight="800" text-anchor="middle">2</text>
              <text x="380" y="122" fill="#64748b" font-size="10" font-weight="700" text-anchor="middle">D (MIN = 2)</text>

              <!-- Leaves -->
              <rect x="96" y="155" width="28" height="22" rx="4" fill="#2563eb" stroke="#1d4ed8" stroke-width="1.5" />
              <text x="110" y="170" fill="#ffffff" font-size="11" font-weight="700" text-anchor="middle" font-family="monospace">3</text>

              <rect x="146" y="155" width="28" height="22" rx="4" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5" />
              <text x="160" y="170" fill="#64748b" font-size="11" font-weight="700" text-anchor="middle" font-family="monospace">12</text>

              <rect x="196" y="155" width="28" height="22" rx="4" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5" />
              <text x="210" y="170" fill="#64748b" font-size="11" font-weight="700" text-anchor="middle" font-family="monospace">8</text>

              <rect x="231" y="155" width="28" height="22" rx="4" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5" />
              <text x="245" y="170" fill="#64748b" font-size="11" font-weight="700" text-anchor="middle" font-family="monospace">2</text>

              <rect x="256" y="155" width="28" height="22" rx="4" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5" />
              <text x="270" y="170" fill="#64748b" font-size="11" font-weight="700" text-anchor="middle" font-family="monospace">4</text>

              <rect x="281" y="155" width="28" height="22" rx="4" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5" />
              <text x="295" y="170" fill="#64748b" font-size="11" font-weight="700" text-anchor="middle" font-family="monospace">6</text>

              <rect x="336" y="155" width="28" height="22" rx="4" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5" />
              <text x="350" y="170" fill="#64748b" font-size="11" font-weight="700" text-anchor="middle" font-family="monospace">14</text>

              <rect x="366" y="155" width="28" height="22" rx="4" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5" />
              <text x="380" y="170" fill="#64748b" font-size="11" font-weight="700" text-anchor="middle" font-family="monospace">5</text>

              <rect x="396" y="155" width="28" height="22" rx="4" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5" />
              <text x="410" y="170" fill="#64748b" font-size="11" font-weight="700" text-anchor="middle" font-family="monospace">2</text>
            </svg>
          </div>

          <div style="background: rgba(15,23,42,0.03); border-radius: 8px; padding: 0.6rem 0.8rem; font-size: 0.82rem; color: #334155; line-height: 1.4;">
            <strong>Minimax Derivation:</strong> B = min(3, 12, 8) = 3; C = min(2, 4, 6) = 2; D = min(14, 5, 2) = 2. Root A selects max(3, 2, 2) = <strong>3</strong> via move $a_1$ (A → B).
          </div>
        </div>
      `;
    }

    renderMinimaxStepperIllustration() {
      const cur = FIG52_STEPS[this.minimaxStep] || FIG52_STEPS[0];
      const isAuto = !!this.minimaxTimer;

      this.graphColEl.innerHTML = `
        <div style="display: flex; flex-direction: column; height: 100%; gap: 0.5rem; padding: 0.5rem 0.75rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-light); padding-bottom: 0.4rem;">
            <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary);">
              Interactive Minimax DFS Traversal Stepper
            </div>
            <div style="display: flex; gap: 0.3rem;">
              <button class="btn-ctrl" id="btn-mm-prev" ${this.minimaxStep === 0 ? 'disabled' : ''} style="padding: 0.2rem 0.5rem; font-size: 0.75rem;">
                <i data-lucide="chevron-left"></i> Prev
              </button>
              <button class="btn-ctrl ${isAuto ? 'active' : ''}" id="btn-mm-play" style="padding: 0.2rem 0.6rem; font-size: 0.75rem;">
                <i data-lucide="${isAuto ? 'pause' : 'play'}"></i> ${isAuto ? 'Pause' : 'Auto-Run'}
              </button>
              <button class="btn-ctrl" id="btn-mm-next" ${this.minimaxStep === FIG52_STEPS.length - 1 ? 'disabled' : ''} style="padding: 0.2rem 0.5rem; font-size: 0.75rem;">
                Next <i data-lucide="chevron-right"></i>
              </button>
              <button class="btn-ctrl" id="btn-mm-reset" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;">
                Reset
              </button>
            </div>
          </div>

          <div style="flex: 1; background: #ffffff; border: 1px solid var(--border-light); border-radius: 10px; display: flex; justify-content: center; align-items: center;">
            <svg viewBox="0 0 540 200" style="width: 100%; height: 100%; max-height: 220px;">
              <!-- Edges -->
              <line x1="270" y1="36" x2="160" y2="85" stroke="${cur.values.B !== '?' ? '#2563eb' : '#cbd5e1'}" stroke-width="2" />
              <line x1="270" y1="36" x2="270" y2="85" stroke="${cur.values.C !== '?' ? '#2563eb' : '#cbd5e1'}" stroke-width="2" />
              <line x1="270" y1="36" x2="380" y2="85" stroke="${cur.values.D !== '?' ? '#2563eb' : '#cbd5e1'}" stroke-width="2" />

              <line x1="160" y1="95" x2="110" y2="155" stroke="${this.minimaxStep >= 1 ? '#2563eb' : '#cbd5e1'}" stroke-width="1.5" />
              <line x1="160" y1="95" x2="160" y2="155" stroke="${this.minimaxStep >= 2 ? '#2563eb' : '#cbd5e1'}" stroke-width="1.5" />
              <line x1="160" y1="95" x2="210" y2="155" stroke="${this.minimaxStep >= 3 ? '#2563eb' : '#cbd5e1'}" stroke-width="1.5" />

              <line x1="270" y1="95" x2="245" y2="155" stroke="${this.minimaxStep >= 6 ? '#2563eb' : '#cbd5e1'}" stroke-width="1.5" />
              <line x1="270" y1="95" x2="270" y2="155" stroke="${this.minimaxStep >= 7 ? '#2563eb' : '#cbd5e1'}" stroke-width="1.5" />
              <line x1="270" y1="95" x2="295" y2="155" stroke="${this.minimaxStep >= 8 ? '#2563eb' : '#cbd5e1'}" stroke-width="1.5" />

              <line x1="380" y1="95" x2="350" y2="155" stroke="${this.minimaxStep >= 11 ? '#2563eb' : '#cbd5e1'}" stroke-width="1.5" />
              <line x1="380" y1="95" x2="380" y2="155" stroke="${this.minimaxStep >= 12 ? '#2563eb' : '#cbd5e1'}" stroke-width="1.5" />
              <line x1="380" y1="95" x2="410" y2="155" stroke="${this.minimaxStep >= 13 ? '#2563eb' : '#cbd5e1'}" stroke-width="1.5" />

              <!-- Nodes -->
              <polygon points="270,16 288,44 252,44" fill="${cur.node === 'A' ? '#f59e0b' : '#2563eb'}" stroke="#1d4ed8" stroke-width="2" />
              <text x="270" y="38" fill="#ffffff" font-size="11" font-weight="800" text-anchor="middle">${cur.values.A}</text>

              <polygon points="142,80 178,80 160,108" fill="${cur.node === 'B' ? '#f59e0b' : (cur.values.B !== '?' ? '#dc2626' : '#94a3b8')}" stroke="#b91c1c" stroke-width="2" />
              <text x="160" y="92" fill="#ffffff" font-size="11" font-weight="800" text-anchor="middle">${cur.values.B}</text>

              <polygon points="252,80 288,80 270,108" fill="${cur.node === 'C' ? '#f59e0b' : (cur.values.C !== '?' ? '#dc2626' : '#94a3b8')}" stroke="#b91c1c" stroke-width="2" />
              <text x="270" y="92" fill="#ffffff" font-size="11" font-weight="800" text-anchor="middle">${cur.values.C}</text>

              <polygon points="362,80 398,80 380,108" fill="${cur.node === 'D' ? '#f59e0b' : (cur.values.D !== '?' ? '#dc2626' : '#94a3b8')}" stroke="#b91c1c" stroke-width="2" />
              <text x="380" y="92" fill="#ffffff" font-size="11" font-weight="800" text-anchor="middle">${cur.values.D}</text>

              <!-- Leaves -->
              <rect x="96" y="155" width="28" height="22" rx="4" fill="${cur.node === 'B1' ? '#f59e0b' : (this.minimaxStep >= 1 ? '#ffffff' : '#f1f5f9')}" stroke="${this.minimaxStep >= 1 ? '#2563eb' : '#cbd5e1'}" stroke-width="1.5" />
              <text x="110" y="170" fill="#1e3a8a" font-size="11" font-weight="700" text-anchor="middle">3</text>

              <rect x="146" y="155" width="28" height="22" rx="4" fill="${cur.node === 'B2' ? '#f59e0b' : (this.minimaxStep >= 2 ? '#ffffff' : '#f1f5f9')}" stroke="${this.minimaxStep >= 2 ? '#2563eb' : '#cbd5e1'}" stroke-width="1.5" />
              <text x="160" y="170" fill="#1e3a8a" font-size="11" font-weight="700" text-anchor="middle">12</text>

              <rect x="196" y="155" width="28" height="22" rx="4" fill="${cur.node === 'B3' ? '#f59e0b' : (this.minimaxStep >= 3 ? '#ffffff' : '#f1f5f9')}" stroke="${this.minimaxStep >= 3 ? '#2563eb' : '#cbd5e1'}" stroke-width="1.5" />
              <text x="210" y="170" fill="#1e3a8a" font-size="11" font-weight="700" text-anchor="middle">8</text>

              <rect x="231" y="155" width="28" height="22" rx="4" fill="${cur.node === 'C1' ? '#f59e0b' : (this.minimaxStep >= 6 ? '#ffffff' : '#f1f5f9')}" stroke="${this.minimaxStep >= 6 ? '#2563eb' : '#cbd5e1'}" stroke-width="1.5" />
              <text x="245" y="170" fill="#1e3a8a" font-size="11" font-weight="700" text-anchor="middle">2</text>

              <rect x="256" y="155" width="28" height="22" rx="4" fill="${cur.node === 'C2' ? '#f59e0b' : (this.minimaxStep >= 7 ? '#ffffff' : '#f1f5f9')}" stroke="${this.minimaxStep >= 7 ? '#2563eb' : '#cbd5e1'}" stroke-width="1.5" />
              <text x="270" y="170" fill="#1e3a8a" font-size="11" font-weight="700" text-anchor="middle">4</text>

              <rect x="281" y="155" width="28" height="22" rx="4" fill="${cur.node === 'C3' ? '#f59e0b' : (this.minimaxStep >= 8 ? '#ffffff' : '#f1f5f9')}" stroke="${this.minimaxStep >= 8 ? '#2563eb' : '#cbd5e1'}" stroke-width="1.5" />
              <text x="295" y="170" fill="#1e3a8a" font-size="11" font-weight="700" text-anchor="middle">6</text>

              <rect x="336" y="155" width="28" height="22" rx="4" fill="${cur.node === 'D1' ? '#f59e0b' : (this.minimaxStep >= 11 ? '#ffffff' : '#f1f5f9')}" stroke="${this.minimaxStep >= 11 ? '#2563eb' : '#cbd5e1'}" stroke-width="1.5" />
              <text x="350" y="170" fill="#1e3a8a" font-size="11" font-weight="700" text-anchor="middle">14</text>

              <rect x="366" y="155" width="28" height="22" rx="4" fill="${cur.node === 'D2' ? '#f59e0b' : (this.minimaxStep >= 12 ? '#ffffff' : '#f1f5f9')}" stroke="${this.minimaxStep >= 12 ? '#2563eb' : '#cbd5e1'}" stroke-width="1.5" />
              <text x="380" y="170" fill="#1e3a8a" font-size="11" font-weight="700" text-anchor="middle">5</text>

              <rect x="396" y="155" width="28" height="22" rx="4" fill="${cur.node === 'D3' ? '#f59e0b' : (this.minimaxStep >= 13 ? '#ffffff' : '#f1f5f9')}" stroke="${this.minimaxStep >= 13 ? '#2563eb' : '#cbd5e1'}" stroke-width="1.5" />
              <text x="410" y="170" fill="#1e3a8a" font-size="11" font-weight="700" text-anchor="middle">2</text>
            </svg>
          </div>

          <div style="background: rgba(37,99,235,0.06); border: 1px solid rgba(37,99,235,0.2); border-radius: 8px; padding: 0.6rem 0.8rem; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.8rem; font-weight: 700; color: #1e3a8a;">Step ${cur.step + 1} / ${FIG52_STEPS.length}:</span>
            <span style="font-size: 0.84rem; color: #334155; flex: 1; margin-left: 0.6rem;">${cur.desc}</span>
          </div>
        </div>
      `;

      // Handlers
      document.getElementById('btn-mm-prev')?.addEventListener('click', () => {
        if (this.minimaxStep > 0) {
          this.minimaxStep--;
          this.renderIllustration(MINIMAX_CONCEPTS[this.conceptIdx]);
          if (window.lucide) window.lucide.createIcons();
        }
      });
      document.getElementById('btn-mm-next')?.addEventListener('click', () => {
        if (this.minimaxStep < FIG52_STEPS.length - 1) {
          this.minimaxStep++;
          this.renderIllustration(MINIMAX_CONCEPTS[this.conceptIdx]);
          if (window.lucide) window.lucide.createIcons();
        }
      });
      document.getElementById('btn-mm-reset')?.addEventListener('click', () => {
        this.clearTimers();
        this.minimaxStep = 0;
        this.renderIllustration(MINIMAX_CONCEPTS[this.conceptIdx]);
        if (window.lucide) window.lucide.createIcons();
      });
      document.getElementById('btn-mm-play')?.addEventListener('click', () => {
        if (this.minimaxTimer) {
          this.clearTimers();
          this.renderIllustration(MINIMAX_CONCEPTS[this.conceptIdx]);
          if (window.lucide) window.lucide.createIcons();
        } else {
          this.minimaxTimer = setInterval(() => {
            if (this.minimaxStep < FIG52_STEPS.length - 1) {
              this.minimaxStep++;
              this.renderIllustration(MINIMAX_CONCEPTS[this.conceptIdx]);
              if (window.lucide) window.lucide.createIcons();
            } else {
              this.clearTimers();
              this.renderIllustration(MINIMAX_CONCEPTS[this.conceptIdx]);
              if (window.lucide) window.lucide.createIcons();
            }
          }, 1200);
          this.renderIllustration(MINIMAX_CONCEPTS[this.conceptIdx]);
          if (window.lucide) window.lucide.createIcons();
        }
      });
    }

    renderAlphaBetaBoundsIllustration() {
      this.graphColEl.innerHTML = `
        <div style="display: flex; flex-direction: column; height: 100%; gap: 0.75rem; padding: 0.5rem 0.75rem;">
          <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); border-bottom: 1px solid var(--border-light); padding-bottom: 0.5rem;">
            The Alpha (α) and Beta (β) Search Window
          </div>

          <div style="background: rgba(248, 250, 252, 0.9); border: 1px solid var(--border-light); border-radius: 10px; padding: 1.25rem; flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 1rem;">
            
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="background: #ffffff; border: 2px solid #2563eb; border-radius: 10px; padding: 0.9rem; width: 45%; text-align: center; box-shadow: 0 4px 10px rgba(37,99,235,0.08);">
                <div style="font-size: 0.75rem; font-weight: 700; color: #2563eb; text-transform: uppercase;">Alpha (α) — MAX\'s Bound</div>
                <div style="font-size: 1.4rem; font-weight: 800; color: #1e3a8a; margin: 0.2rem 0;">Highest Value Found</div>
                <div style="font-size: 0.75rem; color: #64748b;">Starts at -∞ · Only increases at MAX nodes</div>
              </div>

              <div style="font-size: 1.2rem; font-weight: 800; color: #94a3b8;">≤ [ v ] ≤</div>

              <div style="background: #ffffff; border: 2px solid #dc2626; border-radius: 10px; padding: 0.9rem; width: 45%; text-align: center; box-shadow: 0 4px 10px rgba(220,38,38,0.08);">
                <div style="font-size: 0.75rem; font-weight: 700; color: #dc2626; text-transform: uppercase;">Beta (β) — MIN\'s Bound</div>
                <div style="font-size: 1.4rem; font-weight: 800; color: #991b1b; margin: 0.2rem 0;">Lowest Value Found</div>
                <div style="font-size: 0.75rem; color: #64748b;">Starts at +∞ · Only decreases at MIN nodes</div>
              </div>
            </div>

            <div style="background: #ffffff; border: 1px solid var(--border-light); border-radius: 8px; padding: 0.9rem; line-height: 1.45; font-size: 0.85rem; color: #334155;">
              <div style="font-weight: 700; color: #b45309; margin-bottom: 0.25rem;">The Pruning Invariant:</div>
              If at any point along the search path <strong>α ≥ β</strong>, the current branch is guaranteed to be irrelevant to the root decision. MAX can already force a better score elsewhere, or MIN would never let play reach this subtree.
            </div>
          </div>
        </div>
      `;
    }

    renderAlphaBetaStepperIllustration() {
      const cur = ALPHABETA_STEPS[this.alphaBetaStep] || ALPHABETA_STEPS[0];
      const isAuto = !!this.alphaBetaTimer;

      this.graphColEl.innerHTML = `
        <div style="display: flex; flex-direction: column; height: 100%; gap: 0.5rem; padding: 0.5rem 0.75rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-light); padding-bottom: 0.4rem;">
            <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary);">
              AIMA Figure 5.7 — Alpha-Beta Pruning Live Stepper
            </div>
            <div style="display: flex; gap: 0.3rem;">
              <button class="btn-ctrl" id="btn-ab-prev" ${this.alphaBetaStep === 0 ? 'disabled' : ''} style="padding: 0.2rem 0.5rem; font-size: 0.75rem;">
                <i data-lucide="chevron-left"></i> Prev
              </button>
              <button class="btn-ctrl ${isAuto ? 'active' : ''}" id="btn-ab-play" style="padding: 0.2rem 0.6rem; font-size: 0.75rem;">
                <i data-lucide="${isAuto ? 'pause' : 'play'}"></i> ${isAuto ? 'Pause' : 'Auto-Run'}
              </button>
              <button class="btn-ctrl" id="btn-ab-next" ${this.alphaBetaStep === ALPHABETA_STEPS.length - 1 ? 'disabled' : ''} style="padding: 0.2rem 0.5rem; font-size: 0.75rem;">
                Next <i data-lucide="chevron-right"></i>
              </button>
              <button class="btn-ctrl" id="btn-ab-reset" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;">
                Reset
              </button>
            </div>
          </div>

          <div style="flex: 1; background: #ffffff; border: 1px solid var(--border-light); border-radius: 10px; display: flex; justify-content: center; align-items: center; position: relative;">
            <svg viewBox="0 0 540 200" style="width: 100%; height: 100%; max-height: 220px;">
              <!-- Edges -->
              <line x1="270" y1="36" x2="160" y2="85" stroke="${this.alphaBetaStep >= 1 ? '#2563eb' : '#cbd5e1'}" stroke-width="2" />
              <line x1="270" y1="36" x2="270" y2="85" stroke="${this.alphaBetaStep >= 5 ? '#2563eb' : '#cbd5e1'}" stroke-width="2" />
              <line x1="270" y1="36" x2="380" y2="85" stroke="${this.alphaBetaStep >= 8 ? '#2563eb' : '#cbd5e1'}" stroke-width="2" />

              <line x1="160" y1="95" x2="110" y2="155" stroke="${this.alphaBetaStep >= 1 ? '#2563eb' : '#cbd5e1'}" stroke-width="1.5" />
              <line x1="160" y1="95" x2="160" y2="155" stroke="${this.alphaBetaStep >= 2 ? '#2563eb' : '#cbd5e1'}" stroke-width="1.5" />
              <line x1="160" y1="95" x2="210" y2="155" stroke="${this.alphaBetaStep >= 3 ? '#2563eb' : '#cbd5e1'}" stroke-width="1.5" />

              <line x1="270" y1="95" x2="245" y2="155" stroke="${this.alphaBetaStep >= 6 ? '#2563eb' : '#cbd5e1'}" stroke-width="1.5" />
              <line x1="270" y1="95" x2="270" y2="155" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="3,3" />
              <line x1="270" y1="95" x2="295" y2="155" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="3,3" />

              <line x1="380" y1="95" x2="350" y2="155" stroke="${this.alphaBetaStep >= 9 ? '#2563eb' : '#cbd5e1'}" stroke-width="1.5" />
              <line x1="380" y1="95" x2="380" y2="155" stroke="${this.alphaBetaStep >= 10 ? '#2563eb' : '#cbd5e1'}" stroke-width="1.5" />
              <line x1="380" y1="95" x2="410" y2="155" stroke="${this.alphaBetaStep >= 11 ? '#2563eb' : '#cbd5e1'}" stroke-width="1.5" />

              <!-- Nodes -->
              <polygon points="270,16 288,44 252,44" fill="#2563eb" stroke="#1d4ed8" stroke-width="2" />
              <text x="270" y="38" fill="#ffffff" font-size="10" font-weight="800" text-anchor="middle">A</text>
              <text x="270" y="10" fill="#1e3a8a" font-size="9" font-family="monospace" font-weight="700" text-anchor="middle">${cur.ab.A || ''}</text>

              <polygon points="142,80 178,80 160,108" fill="${this.alphaBetaStep >= 1 ? '#dc2626' : '#94a3b8'}" stroke="#b91c1c" stroke-width="2" />
              <text x="160" y="92" fill="#ffffff" font-size="10" font-weight="800" text-anchor="middle">B</text>
              <text x="160" y="122" fill="#991b1b" font-size="9" font-family="monospace" font-weight="700" text-anchor="middle">${cur.ab.B || ''}</text>

              <polygon points="252,80 288,80 270,108" fill="${this.alphaBetaStep >= 5 ? '#dc2626' : '#94a3b8'}" stroke="#b91c1c" stroke-width="2" />
              <text x="270" y="92" fill="#ffffff" font-size="10" font-weight="800" text-anchor="middle">C</text>
              <text x="270" y="122" fill="#991b1b" font-size="9" font-family="monospace" font-weight="700" text-anchor="middle">${cur.ab.C || ''}</text>

              <polygon points="362,80 398,80 380,108" fill="${this.alphaBetaStep >= 8 ? '#dc2626' : '#94a3b8'}" stroke="#b91c1c" stroke-width="2" />
              <text x="380" y="92" fill="#ffffff" font-size="10" font-weight="800" text-anchor="middle">D</text>
              <text x="380" y="122" fill="#991b1b" font-size="9" font-family="monospace" font-weight="700" text-anchor="middle">${cur.ab.D || ''}</text>

              <!-- Leaves -->
              <rect x="96" y="155" width="28" height="22" rx="4" fill="${this.alphaBetaStep >= 1 ? '#ffffff' : '#f1f5f9'}" stroke="${this.alphaBetaStep >= 1 ? '#2563eb' : '#cbd5e1'}" stroke-width="1.5" />
              <text x="110" y="170" fill="#1e3a8a" font-size="11" font-weight="700" text-anchor="middle">3</text>

              <rect x="146" y="155" width="28" height="22" rx="4" fill="${this.alphaBetaStep >= 2 ? '#ffffff' : '#f1f5f9'}" stroke="${this.alphaBetaStep >= 2 ? '#2563eb' : '#cbd5e1'}" stroke-width="1.5" />
              <text x="160" y="170" fill="#1e3a8a" font-size="11" font-weight="700" text-anchor="middle">12</text>

              <rect x="196" y="155" width="28" height="22" rx="4" fill="${this.alphaBetaStep >= 3 ? '#ffffff' : '#f1f5f9'}" stroke="${this.alphaBetaStep >= 3 ? '#2563eb' : '#cbd5e1'}" stroke-width="1.5" />
              <text x="210" y="170" fill="#1e3a8a" font-size="11" font-weight="700" text-anchor="middle">8</text>

              <rect x="231" y="155" width="28" height="22" rx="4" fill="${this.alphaBetaStep >= 6 ? '#ffffff' : '#f1f5f9'}" stroke="${this.alphaBetaStep >= 6 ? '#2563eb' : '#cbd5e1'}" stroke-width="1.5" />
              <text x="245" y="170" fill="#1e3a8a" font-size="11" font-weight="700" text-anchor="middle">2</text>

              <!-- Pruned Leaves -->
              <g opacity="${cur.pruned.includes('C2') ? '0.35' : (this.alphaBetaStep >= 7 ? '0.35' : '1.0')}">
                <rect x="256" y="155" width="28" height="22" rx="4" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5" />
                <text x="270" y="170" fill="#94a3b8" font-size="11" font-weight="700" text-anchor="middle">4</text>
              </g>
              <g opacity="${cur.pruned.includes('C3') ? '0.35' : (this.alphaBetaStep >= 7 ? '0.35' : '1.0')}">
                <rect x="281" y="155" width="28" height="22" rx="4" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5" />
                <text x="295" y="170" fill="#94a3b8" font-size="11" font-weight="700" text-anchor="middle">6</text>
              </g>

              ${this.alphaBetaStep >= 7 ? `
                <!-- Prune Badge -->
                <rect x="258" y="115" width="50" height="20" rx="4" fill="#ef4444" />
                <text x="283" y="129" fill="#ffffff" font-size="9" font-weight="800" text-anchor="middle">✂ PRUNED</text>
              ` : ''}

              <rect x="336" y="155" width="28" height="22" rx="4" fill="${this.alphaBetaStep >= 9 ? '#ffffff' : '#f1f5f9'}" stroke="${this.alphaBetaStep >= 9 ? '#2563eb' : '#cbd5e1'}" stroke-width="1.5" />
              <text x="350" y="170" fill="#1e3a8a" font-size="11" font-weight="700" text-anchor="middle">14</text>

              <rect x="366" y="155" width="28" height="22" rx="4" fill="${this.alphaBetaStep >= 10 ? '#ffffff' : '#f1f5f9'}" stroke="${this.alphaBetaStep >= 10 ? '#2563eb' : '#cbd5e1'}" stroke-width="1.5" />
              <text x="380" y="170" fill="#1e3a8a" font-size="11" font-weight="700" text-anchor="middle">5</text>

              <rect x="396" y="155" width="28" height="22" rx="4" fill="${this.alphaBetaStep >= 11 ? '#ffffff' : '#f1f5f9'}" stroke="${this.alphaBetaStep >= 11 ? '#2563eb' : '#cbd5e1'}" stroke-width="1.5" />
              <text x="410" y="170" fill="#1e3a8a" font-size="11" font-weight="700" text-anchor="middle">2</text>
            </svg>
          </div>

          <div style="background: rgba(239,68,68,0.06); border: 1px solid rgba(239,68,68,0.2); border-radius: 8px; padding: 0.6rem 0.8rem; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.8rem; font-weight: 700; color: #dc2626;">Step ${cur.step + 1} / ${ALPHABETA_STEPS.length}:</span>
            <span style="font-size: 0.84rem; color: #334155; flex: 1; margin-left: 0.6rem;">${cur.desc}</span>
          </div>
        </div>
      `;

      // Handlers
      document.getElementById('btn-ab-prev')?.addEventListener('click', () => {
        if (this.alphaBetaStep > 0) {
          this.alphaBetaStep--;
          this.renderIllustration(MINIMAX_CONCEPTS[this.conceptIdx]);
          if (window.lucide) window.lucide.createIcons();
        }
      });
      document.getElementById('btn-ab-next')?.addEventListener('click', () => {
        if (this.alphaBetaStep < ALPHABETA_STEPS.length - 1) {
          this.alphaBetaStep++;
          this.renderIllustration(MINIMAX_CONCEPTS[this.conceptIdx]);
          if (window.lucide) window.lucide.createIcons();
        }
      });
      document.getElementById('btn-ab-reset')?.addEventListener('click', () => {
        this.clearTimers();
        this.alphaBetaStep = 0;
        this.renderIllustration(MINIMAX_CONCEPTS[this.conceptIdx]);
        if (window.lucide) window.lucide.createIcons();
      });
      document.getElementById('btn-ab-play')?.addEventListener('click', () => {
        if (this.alphaBetaTimer) {
          this.clearTimers();
          this.renderIllustration(MINIMAX_CONCEPTS[this.conceptIdx]);
          if (window.lucide) window.lucide.createIcons();
        } else {
          this.alphaBetaTimer = setInterval(() => {
            if (this.alphaBetaStep < ALPHABETA_STEPS.length - 1) {
              this.alphaBetaStep++;
              this.renderIllustration(MINIMAX_CONCEPTS[this.conceptIdx]);
              if (window.lucide) window.lucide.createIcons();
            } else {
              this.clearTimers();
              this.renderIllustration(MINIMAX_CONCEPTS[this.conceptIdx]);
              if (window.lucide) window.lucide.createIcons();
            }
          }, 1200);
          this.renderIllustration(MINIMAX_CONCEPTS[this.conceptIdx]);
          if (window.lucide) window.lucide.createIcons();
        }
      });
    }

    renderMoveOrderingIllustration() {
      this.graphColEl.innerHTML = `
        <div style="display: flex; flex-direction: column; height: 100%; gap: 0.75rem; padding: 0.5rem 0.75rem;">
          <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); border-bottom: 1px solid var(--border-light); padding-bottom: 0.5rem;">
            Move Ordering Efficiency: O(b^{m/2}) vs. O(b^m)
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; flex: 1;">
            
            <div style="background: rgba(5,150,105,0.04); border: 2px solid #059669; border-radius: 10px; padding: 1rem; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                  <span style="font-weight: 700; color: #065f46; font-size: 0.9rem;">Best Move Ordering</span>
                  <span style="background: #059669; color: #fff; font-size: 0.7rem; font-weight: 700; padding: 0.15rem 0.45rem; border-radius: 4px;">O(b^{m/2})</span>
                </div>
                <p style="font-size: 0.82rem; color: #334155; line-height: 1.4; margin: 0 0 0.5rem;">
                  Best child moves evaluated first. Alpha and Beta boundaries tighten immediately, maximizing pruned branches.
                </p>
              </div>
              <div style="background: #ffffff; border: 1px solid rgba(5,150,105,0.3); border-radius: 6px; padding: 0.5rem; font-family: monospace; font-size: 0.78rem; color: #065f46; text-align: center;">
                Depth 10: 35⁵ ≈ 52.5 Million nodes
              </div>
            </div>

            <div style="background: rgba(220,38,38,0.04); border: 2px solid #dc2626; border-radius: 10px; padding: 1rem; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                  <span style="font-weight: 700; color: #991b1b; font-size: 0.9rem;">Worst Move Ordering</span>
                  <span style="background: #dc2626; color: #fff; font-size: 0.7rem; font-weight: 700; padding: 0.15rem 0.45rem; border-radius: 4px;">O(b^m)</span>
                </div>
                <p style="font-size: 0.82rem; color: #334155; line-height: 1.4; margin: 0 0 0.5rem;">
                  Worst child moves evaluated first. No pruning occurs (α ≥ β is never satisfied), degenerating into full Minimax.
                </p>
              </div>
              <div style="background: #ffffff; border: 1px solid rgba(220,38,38,0.3); border-radius: 6px; padding: 0.5rem; font-family: monospace; font-size: 0.78rem; color: #991b1b; text-align: center;">
                Depth 10: 35¹⁰ ≈ 2.76 Quintillion nodes
              </div>
            </div>
          </div>

          <div style="background: rgba(15,23,42,0.03); border-radius: 8px; padding: 0.6rem 0.8rem; font-size: 0.82rem; color: #475569;">
            💡 <strong>Move Ordering Heuristics in Practice:</strong> Transposition table moves, Killer move heuristic (killer moves that produced cutoffs at same depth), and History heuristic.
          </div>
        </div>
      `;
    }

    // =========================================================================
    // TOPIC 3 ILLUSTRATIONS (Heuristics & Resource Limits)
    // =========================================================================

    renderCutoffDiagramIllustration() {
      this.graphColEl.innerHTML = `
        <div style="display: flex; flex-direction: column; height: 100%; gap: 0.75rem; padding: 0.5rem 0.75rem;">
          <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); border-bottom: 1px solid var(--border-light); padding-bottom: 0.5rem;">
            Search Horizon & Depth Cutoff Boundary (d = 3)
          </div>

          <div style="flex: 1; background: #ffffff; border: 1px solid var(--border-light); border-radius: 10px; display: flex; justify-content: center; align-items: center; position: relative; overflow: hidden;">
            <svg viewBox="0 0 500 200" style="width: 100%; height: 100%;">
              <!-- Horizon Line -->
              <line x1="20" y1="130" x2="480" y2="130" stroke="#ef4444" stroke-width="2" stroke-dasharray="6,4" />
              <text x="475" y="124" fill="#ef4444" font-size="10" font-weight="700" text-anchor="end">Search Horizon Limit (d = 3)</text>

              <!-- Upper Tree (Searched) -->
              <line x1="250" y1="20" x2="160" y2="60" stroke="#2563eb" stroke-width="2" />
              <line x1="250" y1="20" x2="340" y2="60" stroke="#2563eb" stroke-width="2" />

              <line x1="160" y1="60" x2="110" y2="105" stroke="#2563eb" stroke-width="1.5" />
              <line x1="160" y1="60" x2="210" y2="105" stroke="#2563eb" stroke-width="1.5" />
              <line x1="340" y1="60" x2="290" y2="105" stroke="#2563eb" stroke-width="1.5" />
              <line x1="340" y1="60" x2="390" y2="105" stroke="#2563eb" stroke-width="1.5" />

              <!-- Lower Tree (Unexplored / Beyond Horizon) -->
              <line x1="110" y1="105" x2="85" y2="165" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="3,3" />
              <line x1="110" y1="105" x2="135" y2="165" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="3,3" />
              <line x1="210" y1="105" x2="185" y2="165" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="3,3" />
              <line x1="390" y1="105" x2="415" y2="165" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="3,3" />

              <!-- Nodes -->
              <circle cx="250" cy="20" r="12" fill="#2563eb" />
              <circle cx="160" cy="60" r="10" fill="#dc2626" />
              <circle cx="340" cy="60" r="10" fill="#dc2626" />

              <!-- Cutoff Nodes (Evaluated with EVAL) -->
              <rect x="98" y="95" width="24" height="20" rx="3" fill="#059669" />
              <text x="110" y="108" fill="#ffffff" font-size="8" font-weight="700" text-anchor="middle">EVAL</text>

              <rect x="198" y="95" width="24" height="20" rx="3" fill="#059669" />
              <text x="210" y="108" fill="#ffffff" font-size="8" font-weight="700" text-anchor="middle">EVAL</text>

              <rect x="278" y="95" width="24" height="20" rx="3" fill="#059669" />
              <text x="290" y="108" fill="#ffffff" font-size="8" font-weight="700" text-anchor="middle">EVAL</text>

              <rect x="378" y="95" width="24" height="20" rx="3" fill="#059669" />
              <text x="390" y="108" fill="#ffffff" font-size="8" font-weight="700" text-anchor="middle">EVAL</text>

              <text x="250" y="180" fill="#94a3b8" font-size="10" text-anchor="middle">True terminal states lie hundreds of plies below (Unreachable)</text>
            </svg>
          </div>

          <div style="background: rgba(15,23,42,0.03); border-radius: 8px; padding: 0.6rem 0.8rem; font-size: 0.82rem; color: #334155;">
            <strong>CUTOFF-TEST:</strong> Replaces TERMINAL-TEST. Depth d is bounded by tournament clock limits (e.g. 3 minutes/move). Leaves at depth d invoke $\text{EVAL}(s)$ to score positional promise.
          </div>
        </div>
      `;
    }

    renderEvalCalculatorIllustration() {
      const p = this.stateData.pieces;
      const w = this.stateData.weights;
      const score = (p.queen * w.queen) + (p.rook * w.rook) + (p.bishop * w.bishop) + (p.knight * w.knight) + (p.pawn * w.pawn) + (p.center * w.center);

      this.graphColEl.innerHTML = `
        <div style="display: flex; flex-direction: column; height: 100%; gap: 0.5rem; padding: 0.5rem 0.75rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-light); padding-bottom: 0.4rem;">
            <div style="font-weight: 700; font-size: 0.92rem; color: var(--text-primary);">
              Interactive Weighted Evaluation Function: EVAL(s) = ∑ w_i f_i(s)
            </div>
            <div style="font-weight: 800; font-size: 1.05rem; color: #059669; font-family: monospace; background: rgba(5,150,105,0.1); padding: 0.2rem 0.6rem; border-radius: 6px;">
              EVAL = +${score.toFixed(1)}
            </div>
          </div>

          <!-- Feature Sliders Grid -->
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.6rem; background: rgba(248,250,252,0.9); border: 1px solid var(--border-light); border-radius: 10px; padding: 0.8rem;">
            
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.78rem; font-weight: 700; color: #1e3a8a;">
                <span>♕ Queens (w = 9.0)</span>
                <span>${p.queen}</span>
              </div>
              <input type="range" min="0" max="2" value="${p.queen}" id="slider-queen" style="width: 100%;">
            </div>

            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.78rem; font-weight: 700; color: #1e3a8a;">
                <span>♖ Rooks (w = 5.0)</span>
                <span>${p.rook}</span>
              </div>
              <input type="range" min="0" max="2" value="${p.rook}" id="slider-rook" style="width: 100%;">
            </div>

            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.78rem; font-weight: 700; color: #1e3a8a;">
                <span>♗ Bishops (w = 3.0)</span>
                <span>${p.bishop}</span>
              </div>
              <input type="range" min="0" max="2" value="${p.bishop}" id="slider-bishop" style="width: 100%;">
            </div>

            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.78rem; font-weight: 700; color: #1e3a8a;">
                <span>♘ Knights (w = 3.0)</span>
                <span>${p.knight}</span>
              </div>
              <input type="range" min="0" max="2" value="${p.knight}" id="slider-knight" style="width: 100%;">
            </div>

            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.78rem; font-weight: 700; color: #1e3a8a;">
                <span>♙ Pawns (w = 1.0)</span>
                <span>${p.pawn}</span>
              </div>
              <input type="range" min="0" max="8" value="${p.pawn}" id="slider-pawn" style="width: 100%;">
            </div>

            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.78rem; font-weight: 700; color: #065f46;">
                <span>🎯 Center Control (w = 2.0)</span>
                <span>${p.center}</span>
              </div>
              <input type="range" min="0" max="4" value="${p.center}" id="slider-center" style="width: 100%;">
            </div>
          </div>

          <div style="background: #1e293b; color: #f8fafc; border-radius: 8px; padding: 0.6rem 0.8rem; font-family: monospace; font-size: 0.78rem;">
            EVAL(s) = (9×${p.queen}) + (5×${p.rook}) + (3×${p.bishop}) + (3×${p.knight}) + (1×${p.pawn}) + (2×${p.center}) = <strong>+${score}</strong>
          </div>
        </div>
      `;

      // Slider listeners
      const bindSlider = (id, key) => {
        document.getElementById(id)?.addEventListener('input', (e) => {
          this.stateData.pieces[key] = parseInt(e.target.value, 10);
          this.renderIllustration(HEURISTICS_CONCEPTS[this.conceptIdx]);
        });
      };

      bindSlider('slider-queen', 'queen');
      bindSlider('slider-rook', 'rook');
      bindSlider('slider-bishop', 'bishop');
      bindSlider('slider-knight', 'knight');
      bindSlider('slider-pawn', 'pawn');
      bindSlider('slider-center', 'center');
    }

    renderQuiescenceIllustration() {
      this.graphColEl.innerHTML = `
        <div style="display: flex; flex-direction: column; height: 100%; gap: 0.75rem; padding: 0.5rem 0.75rem;">
          <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); border-bottom: 1px solid var(--border-light); padding-bottom: 0.5rem;">
            Quiescence Search: Avoiding Tactical Blunders at Horizon
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; flex: 1;">
            
            <div style="background: rgba(220,38,38,0.05); border: 2px solid #dc2626; border-radius: 10px; padding: 0.9rem;">
              <span style="font-weight: 700; color: #991b1b; font-size: 0.85rem;">Naive Cutoff (Blunder)</span>
              <p style="font-size: 0.8rem; color: #334155; line-height: 1.4; margin: 0.4rem 0;">
                White captures Black's Queen at depth d. Search cuts off immediately and evaluates position as <strong>+9.0 (Winning)</strong>.
              </p>
              <div style="background: #ffffff; border: 1px solid rgba(220,38,38,0.3); border-radius: 6px; padding: 0.5rem; font-size: 0.75rem; color: #991b1b; font-weight: 700;">
                Misses that Black recaptures on depth d+1!
              </div>
            </div>

            <div style="background: rgba(5,150,105,0.05); border: 2px solid #059669; border-radius: 10px; padding: 0.9rem;">
              <span style="font-weight: 700; color: #065f46; font-size: 0.85rem;">Quiescence Search (Accurate)</span>
              <p style="font-size: 0.8rem; color: #334155; line-height: 1.4; margin: 0.4rem 0;">
                Detects that state is non-quiescent (active capture in progress). Extends search to resolve the recapture trade.
              </p>
              <div style="background: #ffffff; border: 1px solid rgba(5,150,105,0.3); border-radius: 6px; padding: 0.5rem; font-size: 0.75rem; color: #065f46; font-weight: 700;">
                True Evaluation: +9.0 - 9.0 = 0.0 (Equal)
              </div>
            </div>
          </div>

          <div style="background: rgba(15,23,42,0.03); border-radius: 8px; padding: 0.6rem 0.8rem; font-size: 0.82rem; color: #475569;">
            💡 <strong>Rule:</strong> Only apply EVAL(s) to <em>quiescent</em> (quiet) board states with no pending captures or checks.
          </div>
        </div>
      `;
    }

    renderHorizonEffectIllustration() {
      this.graphColEl.innerHTML = `
        <div style="display: flex; flex-direction: column; height: 100%; gap: 0.75rem; padding: 0.5rem 0.75rem;">
          <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); border-bottom: 1px solid var(--border-light); padding-bottom: 0.5rem;">
            The Horizon Effect: Futile Delaying Sacrifices
          </div>

          <div style="background: rgba(248, 250, 252, 0.9); border: 1px solid var(--border-light); border-radius: 10px; padding: 1rem; flex: 1; display: flex; flex-direction: column; justify-content: space-around;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div style="background: #ef4444; color: #fff; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.8rem;">1</div>
              <div style="font-size: 0.85rem; color: #334155;">Opponent's Bishop is inevitably about to trap and capture White's Queen.</div>
            </div>

            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div style="background: #ef4444; color: #fff; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.8rem;">2</div>
              <div style="font-size: 0.85rem; color: #334155;">Search depth limit is $d = 4$. White plays a useless spite check by sacrificing a Rook.</div>
            </div>

            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div style="background: #ef4444; color: #fff; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.8rem;">3</div>
              <div style="font-size: 0.85rem; color: #334155;">The inevitable Queen loss is pushed to ply $d = 5$ (beyond the horizon).</div>
            </div>

            <div style="background: #ffffff; border: 1px solid #dc2626; border-radius: 8px; padding: 0.6rem 0.8rem; font-size: 0.8rem; color: #991b1b; font-weight: 700;">
              Result: The AI lost BOTH its Rook and its Queen, believing it had saved the Queen!
            </div>
          </div>
        </div>
      `;
    }

    renderTranspositionIllustration() {
      this.graphColEl.innerHTML = `
        <div style="display: flex; flex-direction: column; height: 100%; gap: 0.75rem; padding: 0.5rem 0.75rem;">
          <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); border-bottom: 1px solid var(--border-light); padding-bottom: 0.5rem;">
            Transposition Tables: Directed Acyclic Graph (DAG) Search
          </div>

          <div style="flex: 1; background: #ffffff; border: 1px solid var(--border-light); border-radius: 10px; display: flex; justify-content: center; align-items: center;">
            <svg viewBox="0 0 500 180" style="width: 100%; height: 100%;">
              <line x1="250" y1="20" x2="160" y2="70" stroke="#2563eb" stroke-width="2" />
              <line x1="250" y1="20" x2="340" y2="70" stroke="#2563eb" stroke-width="2" />

              <line x1="160" y1="70" x2="250" y2="120" stroke="#059669" stroke-width="2" />
              <line x1="340" y1="70" x2="250" y2="120" stroke="#059669" stroke-width="2" />

              <!-- Nodes -->
              <circle cx="250" cy="20" r="12" fill="#2563eb" />
              <text x="250" y="24" fill="#fff" font-size="9" font-weight="700" text-anchor="middle">Start</text>

              <rect x="110" y="60" width="100" height="22" rx="4" fill="#f1f5f9" stroke="#94a3b8" />
              <text x="160" y="75" fill="#334155" font-size="9" font-weight="700" text-anchor="middle">1. e4 e5 2. Nf3</text>

              <rect x="290" y="60" width="100" height="22" rx="4" fill="#f1f5f9" stroke="#94a3b8" />
              <text x="340" y="75" fill="#334155" font-size="9" font-weight="700" text-anchor="middle">1. Nf3 e5 2. e4</text>

              <!-- Converged State -->
              <rect x="180" y="115" width="140" height="30" rx="6" fill="#059669" stroke="#047857" stroke-width="2" />
              <text x="250" y="134" fill="#ffffff" font-size="10" font-weight="800" text-anchor="middle">Identical Board State</text>

              <rect x="340" y="120" width="95" height="20" rx="4" fill="#f59e0b" />
              <text x="387" y="134" fill="#ffffff" font-size="8" font-weight="800" text-anchor="middle">✓ CACHE HIT</text>
            </svg>
          </div>

          <div style="background: rgba(15,23,42,0.03); border-radius: 8px; padding: 0.6rem 0.8rem; font-size: 0.82rem; color: #475569;">
            Stores state hash (Zobrist Key) $\to$ exact score / bound. Cuts duplicate subtrees across identical transposed move paths.
          </div>
        </div>
      `;
    }

    // =========================================================================
    // TOPIC 4 ILLUSTRATIONS (Chance & MCTS)
    // =========================================================================

    renderExpectiminimaxIllustration() {
      const p = this.stateData.diceProb;
      const ev = (p * 10) + ((1 - p) * -4);

      this.graphColEl.innerHTML = `
        <div style="display: flex; flex-direction: column; height: 100%; gap: 0.6rem; padding: 0.5rem 0.75rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-light); padding-bottom: 0.4rem;">
            <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary);">
              Expectiminimax Tree with Chance Nodes (🎲)
            </div>
            <div style="font-weight: 800; font-size: 0.95rem; color: #059669; font-family: monospace; background: rgba(5,150,105,0.1); padding: 0.2rem 0.55rem; border-radius: 6px;">
              Expected Value = ${ev.toFixed(1)}
            </div>
          </div>

          <div style="flex: 1; background: #ffffff; border: 1px solid var(--border-light); border-radius: 10px; display: flex; justify-content: center; align-items: center;">
            <svg viewBox="0 0 500 170" style="width: 100%; height: 100%;">
              <line x1="250" y1="20" x2="250" y2="65" stroke="#2563eb" stroke-width="2" />
              <line x1="250" y1="75" x2="160" y2="125" stroke="#059669" stroke-width="1.5" />
              <line x1="250" y1="75" x2="340" y2="125" stroke="#059669" stroke-width="1.5" />

              <!-- MAX Root -->
              <polygon points="250,8 266,32 234,32" fill="#2563eb" />
              <text x="250" y="27" fill="#fff" font-size="9" font-weight="700" text-anchor="middle">MAX</text>

              <!-- Chance Node -->
              <circle cx="250" cy="75" r="14" fill="#10b981" stroke="#059669" stroke-width="2" />
              <text x="250" y="80" fill="#fff" font-size="11" font-weight="800" text-anchor="middle">🎲</text>

              <text x="185" y="90" fill="#047857" font-size="9" font-family="monospace">P = ${p.toFixed(2)}</text>
              <text x="315" y="90" fill="#047857" font-size="9" font-family="monospace">P = ${(1 - p).toFixed(2)}</text>

              <!-- Leaves -->
              <rect x="135" y="125" width="50" height="24" rx="4" fill="#ffffff" stroke="#2563eb" stroke-width="1.5" />
              <text x="160" y="141" fill="#2563eb" font-size="11" font-weight="800" text-anchor="middle">+10.0</text>

              <rect x="315" y="125" width="50" height="24" rx="4" fill="#ffffff" stroke="#dc2626" stroke-width="1.5" />
              <text x="340" y="141" fill="#dc2626" font-size="11" font-weight="800" text-anchor="middle">-4.0</text>
            </svg>
          </div>

          <div style="background: rgba(15,23,42,0.03); border-radius: 8px; padding: 0.6rem 0.8rem; display: flex; align-items: center; gap: 0.75rem;">
            <span style="font-size: 0.8rem; font-weight: 700; color: #047857;">Adjust Coin Probability:</span>
            <input type="range" min="0" max="1" step="0.05" value="${p}" id="slider-dice-prob" style="flex: 1;">
            <span style="font-family: monospace; font-size: 0.85rem; font-weight: 700;">${(p * 100).toFixed(0)}% Heads</span>
          </div>
        </div>
      `;

      document.getElementById('slider-dice-prob')?.addEventListener('input', (e) => {
        this.stateData.diceProb = parseFloat(e.target.value);
        this.renderIllustration(MCTS_CONCEPTS[this.conceptIdx]);
      });
    }

    renderUtilityScaleIllustration() {
      this.graphColEl.innerHTML = `
        <div style="display: flex; flex-direction: column; height: 100%; gap: 0.75rem; padding: 0.5rem 0.75rem;">
          <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); border-bottom: 1px solid var(--border-light); padding-bottom: 0.5rem;">
            Utility Scale Requirements: Minimax vs. Expectiminimax
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; flex: 1;">
            
            <div style="background: rgba(37,99,235,0.04); border: 2px solid #2563eb; border-radius: 10px; padding: 0.9rem;">
              <span style="font-weight: 700; color: #1e3a8a; font-size: 0.85rem;">Minimax: Ordinal Scale</span>
              <p style="font-size: 0.8rem; color: #334155; line-height: 1.4; margin: 0.4rem 0;">
                Invariant under <strong>any monotonic transformation</strong> (e.g. $U \to U^3$ or $U \to \log(U)$). Only the relative order matters.
              </p>
              <div style="font-family: monospace; font-size: 0.75rem; color: #2563eb; background: #fff; padding: 0.4rem; border-radius: 4px;">
                max(2, 4) = 4 ⇒ max(2³, 4³) = 64
              </div>
            </div>

            <div style="background: rgba(220,38,38,0.04); border: 2px solid #dc2626; border-radius: 10px; padding: 0.9rem;">
              <span style="font-weight: 700; color: #991b1b; font-size: 0.85rem;">Expectiminimax: Interval Scale</span>
              <p style="font-size: 0.8rem; color: #334155; line-height: 1.4; margin: 0.4rem 0;">
                Only invariant under <strong>positive linear transformations</strong> ($a U + b, a > 0$). Nonlinear transforms break expectations!
              </p>
              <div style="font-family: monospace; font-size: 0.75rem; color: #dc2626; background: #fff; padding: 0.4rem; border-radius: 4px;">
                E[X²] ≠ (E[X])² (flips optimal action)
              </div>
            </div>
          </div>
        </div>
      `;
    }

    renderMctsUcb1Illustration() {
      const u = this.stateData.ucb;
      const exploit = u.U_child / u.N_child;
      const explore = u.C * Math.sqrt(Math.log(u.N_parent) / u.N_child);
      const totalUcb = exploit + explore;

      this.graphColEl.innerHTML = `
        <div style="display: flex; flex-direction: column; height: 100%; gap: 0.5rem; padding: 0.5rem 0.75rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-light); padding-bottom: 0.4rem;">
            <div style="font-weight: 700; font-size: 0.92rem; color: var(--text-primary);">
              Interactive UCB1 Formula: UCB(n) = (U / N) + C √(ln N_p / N)
            </div>
            <div style="font-weight: 800; font-size: 1.05rem; color: #2563eb; font-family: monospace; background: rgba(37,99,235,0.1); padding: 0.2rem 0.6rem; border-radius: 6px;">
              UCB1 = ${totalUcb.toFixed(4)}
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; background: rgba(248,250,252,0.9); border: 1px solid var(--border-light); border-radius: 10px; padding: 0.8rem;">
            
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.78rem; font-weight: 700; color: #1e3a8a;">
                <span>Parent Visits (N_parent)</span>
                <span>${u.N_parent}</span>
              </div>
              <input type="range" min="10" max="1000" value="${u.N_parent}" id="slider-ucb-np" style="width: 100%;">
            </div>

            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.78rem; font-weight: 700; color: #1e3a8a;">
                <span>Child Visits (N_child)</span>
                <span>${u.N_child}</span>
              </div>
              <input type="range" min="1" max="200" value="${u.N_child}" id="slider-ucb-nc" style="width: 100%;">
            </div>

            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.78rem; font-weight: 700; color: #065f46;">
                <span>Child Wins (U_child)</span>
                <span>${u.U_child}</span>
              </div>
              <input type="range" min="0" max="${u.N_child}" value="${u.U_child}" id="slider-ucb-u" style="width: 100%;">
            </div>

            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.78rem; font-weight: 700; color: #b45309;">
                <span>Exploration Constant (C)</span>
                <span>${u.C.toFixed(3)}</span>
              </div>
              <input type="range" min="0" max="3" step="0.1" value="${u.C}" id="slider-ucb-c" style="width: 100%;">
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; flex: 1;">
            <div style="background: rgba(5,150,105,0.06); border: 1px solid #059669; border-radius: 8px; padding: 0.6rem; text-align: center;">
              <div style="font-size: 0.72rem; font-weight: 700; color: #065f46; text-transform: uppercase;">Exploitation Term (Win Rate)</div>
              <div style="font-size: 1.3rem; font-weight: 800; color: #059669; font-family: monospace;">${exploit.toFixed(4)}</div>
            </div>

            <div style="background: rgba(245,158,11,0.06); border: 1px solid #f59e0b; border-radius: 8px; padding: 0.6rem; text-align: center;">
              <div style="font-size: 0.72rem; font-weight: 700; color: #b45309; text-transform: uppercase;">Exploration Bonus</div>
              <div style="font-size: 1.3rem; font-weight: 800; color: #d97706; font-family: monospace;">${explore.toFixed(4)}</div>
            </div>
          </div>
        </div>
      `;

      document.getElementById('slider-ucb-np')?.addEventListener('input', (e) => {
        this.stateData.ucb.N_parent = parseInt(e.target.value, 10);
        this.renderIllustration(MCTS_CONCEPTS[this.conceptIdx]);
      });
      document.getElementById('slider-ucb-nc')?.addEventListener('input', (e) => {
        this.stateData.ucb.N_child = parseInt(e.target.value, 10);
        if (this.stateData.ucb.U_child > this.stateData.ucb.N_child) {
          this.stateData.ucb.U_child = this.stateData.ucb.N_child;
        }
        this.renderIllustration(MCTS_CONCEPTS[this.conceptIdx]);
      });
      document.getElementById('slider-ucb-u')?.addEventListener('input', (e) => {
        this.stateData.ucb.U_child = parseInt(e.target.value, 10);
        this.renderIllustration(MCTS_CONCEPTS[this.conceptIdx]);
      });
      document.getElementById('slider-ucb-c')?.addEventListener('input', (e) => {
        this.stateData.ucb.C = parseFloat(e.target.value);
        this.renderIllustration(MCTS_CONCEPTS[this.conceptIdx]);
      });
    }

    renderMctsRolloutIllustration() {
      this.graphColEl.innerHTML = `
        <div style="display: flex; flex-direction: column; height: 100%; gap: 0.75rem; padding: 0.5rem 0.75rem;">
          <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); border-bottom: 1px solid var(--border-light); padding-bottom: 0.5rem;">
            MCTS Expansion & Simulation (Random Rollout)
          </div>

          <div style="flex: 1; background: #ffffff; border: 1px solid var(--border-light); border-radius: 10px; display: flex; justify-content: center; align-items: center;">
            <svg viewBox="0 0 500 180" style="width: 100%; height: 100%;">
              <!-- In-Tree Path -->
              <line x1="250" y1="20" x2="200" y2="60" stroke="#2563eb" stroke-width="2.5" />
              <line x1="200" y1="60" x2="160" y2="100" stroke="#2563eb" stroke-width="2.5" />

              <!-- Expanded Node -->
              <circle cx="250" cy="20" r="10" fill="#2563eb" />
              <circle cx="200" cy="60" r="10" fill="#2563eb" />
              <circle cx="160" cy="100" r="12" fill="#059669" stroke="#047857" stroke-width="2" />
              <text x="160" y="104" fill="#fff" font-size="8" font-weight="800" text-anchor="middle">NEW</text>

              <!-- Simulation Rollout (Dashed) -->
              <path d="M 160 112 Q 130 135 150 155 T 190 170" fill="none" stroke="#f59e0b" stroke-width="2" stroke-dasharray="4,4" />
              
              <rect x="175" y="158" width="60" height="20" rx="4" fill="#059669" />
              <text x="205" y="172" fill="#ffffff" font-size="9" font-weight="800" text-anchor="middle">WIN (+1)</text>

              <text x="260" y="145" fill="#d97706" font-size="9" font-weight="700">Random Playout to Game-Over</text>
            </svg>
          </div>

          <div style="background: rgba(15,23,42,0.03); border-radius: 8px; padding: 0.6rem 0.8rem; font-size: 0.82rem; color: #475569;">
            MCTS does not use an evaluation function. It simply plays out fast random moves until reaching a terminal state.
          </div>
        </div>
      `;
    }

    renderMctsBackpropIllustration() {
      this.graphColEl.innerHTML = `
        <div style="display: flex; flex-direction: column; height: 100%; gap: 0.75rem; padding: 0.5rem 0.75rem;">
          <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); border-bottom: 1px solid var(--border-light); padding-bottom: 0.5rem;">
            MCTS Backpropagation: Updating Visit Counts & Utility
          </div>

          <div style="flex: 1; background: #ffffff; border: 1px solid var(--border-light); border-radius: 10px; display: flex; justify-content: center; align-items: center;">
            <svg viewBox="0 0 500 180" style="width: 100%; height: 100%;">
              <line x1="250" y1="20" x2="200" y2="70" stroke="#059669" stroke-width="3" />
              <line x1="200" y1="70" x2="160" y2="120" stroke="#059669" stroke-width="3" />

              <!-- Nodes with Upward Flow -->
              <circle cx="250" cy="20" r="16" fill="#2563eb" />
              <text x="250" y="24" fill="#fff" font-size="9" font-weight="800" text-anchor="middle">101 / 61</text>

              <circle cx="200" cy="70" r="15" fill="#2563eb" />
              <text x="200" y="74" fill="#fff" font-size="9" font-weight="800" text-anchor="middle">41 / 29</text>

              <circle cx="160" cy="120" r="14" fill="#059669" />
              <text x="160" y="124" fill="#fff" font-size="9" font-weight="800" text-anchor="middle">1 / 1</text>

              <text x="300" y="55" fill="#059669" font-size="10" font-weight="700">▲ Backup Result: N ← N+1, U ← U+1</text>
              <text x="300" y="75" fill="#475569" font-size="9">Decision Rule at Root: argmax_a N(child_a)</text>
            </svg>
          </div>
        </div>
      `;
    }

    renderAsymmetricTreeIllustration() {
      this.graphColEl.innerHTML = `
        <div style="display: flex; flex-direction: column; height: 100%; gap: 0.75rem; padding: 0.5rem 0.75rem;">
          <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); border-bottom: 1px solid var(--border-light); padding-bottom: 0.5rem;">
            Asymmetric Tree Growth in MCTS vs. Symmetric Minimax
          </div>

          <div style="flex: 1; background: #ffffff; border: 1px solid var(--border-light); border-radius: 10px; display: flex; justify-content: center; align-items: center;">
            <svg viewBox="0 0 500 180" style="width: 100%; height: 100%;">
              <line x1="250" y1="20" x2="160" y2="60" stroke="#059669" stroke-width="3" />
              <line x1="250" y1="20" x2="350" y2="60" stroke="#cbd5e1" stroke-width="1" />

              <line x1="160" y1="60" x2="120" y2="100" stroke="#059669" stroke-width="2.5" />
              <line x1="120" y1="100" x2="100" y2="140" stroke="#059669" stroke-width="2" />

              <!-- Deep Branch -->
              <circle cx="250" cy="20" r="10" fill="#2563eb" />
              <circle cx="160" cy="60" r="10" fill="#059669" />
              <text x="185" y="65" fill="#065f46" font-size="9" font-weight="700">N = 1,450</text>

              <circle cx="120" cy="100" r="8" fill="#059669" />
              <circle cx="100" cy="140" r="7" fill="#059669" />

              <!-- Shallow Branch -->
              <circle cx="350" cy="60" r="6" fill="#94a3b8" />
              <text x="370" y="65" fill="#64748b" font-size="9">N = 3 (Abandoned)</text>
            </svg>
          </div>

          <div style="background: rgba(15,23,42,0.03); border-radius: 8px; padding: 0.6rem 0.8rem; font-size: 0.82rem; color: #475569;">
            MCTS automatically deepens promising tentacles into contested variations without wasting time on obviously losing moves.
          </div>
        </div>
      `;
    }

    // =========================================================================
    // TOPIC 5 ILLUSTRATIONS (Evaluating Game Search)
    // =========================================================================

    renderEvalParametersIllustration() {
      this.graphColEl.innerHTML = `
        <div style="display: flex; flex-direction: column; height: 100%; gap: 0.75rem; padding: 0.5rem 0.75rem;">
          <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); border-bottom: 1px solid var(--border-light); padding-bottom: 0.5rem;">
            Game Complexity Parameters (b, m, d)
          </div>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; flex: 1;">
            <div style="background: #ffffff; border: 1px solid var(--border-light); border-radius: 8px; padding: 0.9rem; text-align: center;">
              <div style="font-size: 1.5rem; font-weight: 800; color: #2563eb; font-family: monospace;">b</div>
              <div style="font-weight: 700; font-size: 0.85rem; color: #1e3a8a;">Branching Factor</div>
              <div style="font-size: 0.75rem; color: #64748b; margin-top: 0.3rem;">Legal actions per state (Chess ≈ 35, Go ≈ 250)</div>
            </div>

            <div style="background: #ffffff; border: 1px solid var(--border-light); border-radius: 8px; padding: 0.9rem; text-align: center;">
              <div style="font-size: 1.5rem; font-weight: 800; color: #dc2626; font-family: monospace;">m</div>
              <div style="font-weight: 700; font-size: 0.85rem; color: #991b1b;">Maximum Depth</div>
              <div style="font-size: 0.75rem; color: #64748b; margin-top: 0.3rem;">Max plies to game termination (Chess ≈ 80, Go ≈ 150)</div>
            </div>

            <div style="background: #ffffff; border: 1px solid var(--border-light); border-radius: 8px; padding: 0.9rem; text-align: center;">
              <div style="font-size: 1.5rem; font-weight: 800; color: #059669; font-family: monospace;">d</div>
              <div style="font-weight: 700; font-size: 0.85rem; color: #065f46;">Search Cutoff</div>
              <div style="font-size: 0.75rem; color: #64748b; margin-top: 0.3rem;">Depth horizon evaluated under real-time clock limits</div>
            </div>
          </div>
        </div>
      `;
    }

    renderEvalComplexityIllustration() {
      this.graphColEl.innerHTML = `
        <div style="display: flex; flex-direction: column; height: 100%; gap: 0.6rem; padding: 0.5rem 0.75rem; overflow-y: auto;">
          <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); border-bottom: 1px solid var(--border-light); padding-bottom: 0.4rem;">
            Comparative Complexity Matrix
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 0.78rem; text-align: left;">
            <thead>
              <tr style="background: rgba(15,23,42,0.05); border-bottom: 2px solid var(--border-light);">
                <th style="padding: 0.45rem;">Algorithm</th>
                <th style="padding: 0.45rem;">Time Complexity</th>
                <th style="padding: 0.45rem;">Space Complexity</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom: 1px solid var(--border-light);">
                <td style="padding: 0.45rem; font-weight: 700;">Minimax</td>
                <td style="padding: 0.45rem; font-family: monospace; color: #dc2626;">O(b^m)</td>
                <td style="padding: 0.45rem; font-family: monospace; color: #2563eb;">O(bm)</td>
              </tr>
              <tr style="border-bottom: 1px solid var(--border-light); background: rgba(5,150,105,0.03);">
                <td style="padding: 0.45rem; font-weight: 700;">Alpha-Beta (Best Order)</td>
                <td style="padding: 0.45rem; font-family: monospace; color: #059669; font-weight: 700;">O(b^{m/2})</td>
                <td style="padding: 0.45rem; font-family: monospace; color: #2563eb;">O(bm)</td>
              </tr>
              <tr style="border-bottom: 1px solid var(--border-light);">
                <td style="padding: 0.45rem; font-weight: 700;">Alpha-Beta (Cutoff)</td>
                <td style="padding: 0.45rem; font-family: monospace; color: #2563eb;">O(b^d)</td>
                <td style="padding: 0.45rem; font-family: monospace; color: #2563eb;">O(bd)</td>
              </tr>
              <tr style="border-bottom: 1px solid var(--border-light);">
                <td style="padding: 0.45rem; font-weight: 700;">Expectiminimax</td>
                <td style="padding: 0.45rem; font-family: monospace; color: #dc2626;">O(b^m · n^m)</td>
                <td style="padding: 0.45rem; font-family: monospace; color: #2563eb;">O(bm)</td>
              </tr>
              <tr>
                <td style="padding: 0.45rem; font-weight: 700;">MCTS</td>
                <td style="padding: 0.45rem; font-family: monospace; color: #059669;">O(N · length)</td>
                <td style="padding: 0.45rem; font-family: monospace; color: #059669;">O(Nodes) ≤ O(N)</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    }

    renderEvalPropertiesIllustration() {
      this.graphColEl.innerHTML = `
        <div style="display: flex; flex-direction: column; height: 100%; gap: 0.6rem; padding: 0.5rem 0.75rem; overflow-y: auto;">
          <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); border-bottom: 1px solid var(--border-light); padding-bottom: 0.4rem;">
            Completeness & Optimality Properties
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 0.76rem; text-align: left;">
            <thead>
              <tr style="background: rgba(15,23,42,0.05); border-bottom: 2px solid var(--border-light);">
                <th style="padding: 0.4rem;">Algorithm</th>
                <th style="padding: 0.4rem;">Completeness</th>
                <th style="padding: 0.4rem;">vs. Optimal Opponent</th>
                <th style="padding: 0.4rem;">vs. Suboptimal Opponent</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom: 1px solid var(--border-light);">
                <td style="padding: 0.4rem; font-weight: 700;">Minimax</td>
                <td style="padding: 0.4rem; color: #059669;">Complete</td>
                <td style="padding: 0.4rem; color: #059669; font-weight: 700;">Optimal</td>
                <td style="padding: 0.4rem; color: #64748b;">Suboptimal (Doesn't exploit)</td>
              </tr>
              <tr style="border-bottom: 1px solid var(--border-light); background: rgba(5,150,105,0.03);">
                <td style="padding: 0.4rem; font-weight: 700;">Alpha-Beta</td>
                <td style="padding: 0.4rem; color: #059669;">Complete</td>
                <td style="padding: 0.4rem; color: #059669; font-weight: 700;">Optimal (Exact match)</td>
                <td style="padding: 0.4rem; color: #64748b;">Suboptimal (Doesn't exploit)</td>
              </tr>
              <tr style="border-bottom: 1px solid var(--border-light);">
                <td style="padding: 0.4rem; font-weight: 700;">Expectiminimax</td>
                <td style="padding: 0.4rem; color: #059669;">Complete</td>
                <td style="padding: 0.4rem; color: #059669;">Optimal Expected Utility</td>
                <td style="padding: 0.4rem; color: #64748b;">Expected Utility</td>
              </tr>
              <tr>
                <td style="padding: 0.4rem; font-weight: 700;">MCTS</td>
                <td style="padding: 0.4rem; color: #059669;">As N → ∞</td>
                <td style="padding: 0.4rem; color: #059669;">Converges to Minimax</td>
                <td style="padding: 0.4rem; color: #059669; font-weight: 700;">Adapts dynamically</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    }
  }

  // Initialize on DOM load
  document.addEventListener('DOMContentLoaded', () => {
    window.adversarialUI = new AdversarialUI();
  });
})();
