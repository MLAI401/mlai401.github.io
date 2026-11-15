/*
  MLAI401 — Topic 01 Reading Notes content (topic01_reading.html).
  Rendered by demos/reading_notes.js (same engine as Topics 06 and 07).
  Source: AIMA (3rd & 4th ed.) Ch. 2 and Ch. 3 (pp. 64–74).
*/
(function (root) {
  "use strict";
  const FIG = root.RN_FIGS || []; // diagrams, from reading_topic01_figs.js
  const TABS = [
    { id: "agents", label: "Agents & Environments", source: "AIMA (4th ed.) Ch. 2", subs: [
      { id: "agent", label: "Agents, Percepts & Actions",
        lead: "An <strong>agent</strong> is anything that perceives its environment through <strong>sensors</strong> and acts on it through <strong>actuators</strong>, in a closed perceive → decide → act loop.",
        points: [
          "<strong>Human:</strong> eyes and ears in, hands and voice out. <strong>Robot:</strong> cameras, lidar in; motors out. <strong>Software agent (softbot):</strong> keystrokes, packets and files in; packets, files and graphics out.",
          "A <strong>percept</strong> is the input at one instant; the <strong>percept sequence</strong> is everything the agent has ever perceived.",
          "The <strong>agent function</strong> f maps a percept sequence to an action. It is an abstract description.",
          "The <strong>agent program</strong> is the concrete code that implements f on a physical <strong>architecture</strong>.",
        ],
        figure: FIG[0],
        formula: "P* = (p<sub>1</sub>, p<sub>2</sub>, …, p<sub>t</sub>) &nbsp;·&nbsp; f : P* → A &nbsp;·&nbsp; Agent = Architecture + Program",
        example: "<table class='ag-table ui'><thead><tr><th class='l'>agent</th><th class='l'>sensors</th><th class='l'>actuators</th></tr></thead><tbody>" +
          "<tr><td class='l'>Human</td><td class='l'>eyes, ears</td><td class='l'>hands, legs, voice</td></tr>" +
          "<tr><td class='l'>Robot</td><td class='l'>cameras, infrared, lidar</td><td class='l'>motors, hydraulic joints</td></tr>" +
          "<tr class='is-hl'><td class='l'>Softbot</td><td class='l'>keystrokes, packets, files</td><td class='l'>packets, files, display</td></tr></tbody></table>",
        checks: [
          { q: "The agent function maps…", options: ["a percept sequence to an action", "an action to a percept", "a state to a cost"], answer: "a percept sequence to an action", why: "f : P* → A. It may depend on the whole history, not just the latest percept." },
          { q: "The agent function and the agent program are…", options: ["the abstract mapping vs. the code that implements it", "two names for the same thing", "the sensors vs. the actuators"], answer: "the abstract mapping vs. the code that implements it", why: "The program runs on an architecture; Agent = Architecture + Program." },
          { q: "A web crawler reading HTML pages is a…", options: ["software agent", "robotic agent", "not an agent"], answer: "software agent", why: "Its percepts are network data and its actions are requests and files: a softbot." },
        ],
        remember: ["Agent = sensors in, actuators out, program in the middle.", "Percept sequence = complete history of percepts."] },
      { id: "rationality", label: "Rationality",
        lead: "A <strong>rational agent</strong> picks, for every percept sequence, the action <strong>expected</strong> to maximise its performance measure, given the evidence and its prior knowledge.",
        points: [
          "Rationality depends on four things: the <strong>performance measure</strong>, the agent's <strong>prior knowledge</strong>, the <strong>actions</strong> it can take, and its <strong>percept sequence</strong> to date.",
          "<strong>Design rule:</strong> score what you actually want in the environment (a clean floor, little power used), not how you think the agent should behave (number of sucks), or the agent can game the score.",
          "<strong>Rational ≠ omniscient:</strong> rationality maximises expected performance, not the actual outcome. Looking both ways and still being hit by a meteorite was rational.",
          "<strong>Information gathering</strong> (looking before crossing, exploring) is part of rationality.",
          "<strong>Autonomy:</strong> behaviour comes from the agent's own experience and learning, not only from its designer's built-in knowledge.",
        ],
        formula: "a* = argmax<sub>a</sub> E[ performance | percept sequence, prior knowledge, a ]",
        checks: [
          { q: "A vacuum agent is scored on “number of times it sucked up dirt”. What can go wrong?", options: ["It can dump dirt and suck it up again forever", "Nothing, that is the ideal measure", "It will never move"], answer: "It can dump dirt and suck it up again forever", why: "Measure the result you want (clean floor, power used), not the behaviour." },
          { q: "An agent acts sensibly on all available evidence but the outcome is bad because of an unforeseeable event. The agent was…", options: ["rational", "irrational", "omniscient"], answer: "rational", why: "Rationality maximises expected performance; only an omniscient agent knows actual outcomes." },
          { q: "Which is NOT one of the four factors rationality depends on?", options: ["The agent's hardware speed", "The performance measure", "The percept sequence to date"], answer: "The agent's hardware speed", why: "The four are performance measure, prior knowledge, available actions and percept sequence." },
        ],
        remember: ["Rational = best expected outcome, not perfect outcome.", "Score the world state you want, not the agent's behaviour."] },
      { id: "peas", label: "PEAS",
        lead: "The first step in designing an agent is to specify its <strong>task environment</strong> with <strong>PEAS</strong>.",
        points: [
          "<strong>P</strong>erformance measure: the objective criteria of success.",
          "<strong>E</strong>nvironment: the world, systems or software the agent operates in.",
          "<strong>A</strong>ctuators: how the agent acts.",
          "<strong>S</strong>ensors: how the agent receives percepts.",
        ],
        example: "<table class='ag-table ui'><thead><tr><th class='l'>agent</th><th class='l'>P</th><th class='l'>E</th><th class='l'>A</th><th class='l'>S</th></tr></thead><tbody>" +
          "<tr><td class='l'>Automated taxi</td><td class='l'>safe, fast, legal, comfortable, profit</td><td class='l'>roads, traffic, pedestrians, weather</td><td class='l'>steering, accelerator, brake, horn</td><td class='l'>cameras, radar, lidar, GPS, speedometer</td></tr>" +
          "<tr><td class='l'>Vacuum cleaner</td><td class='l'>cleanliness, time, electricity, noise</td><td class='l'>rooms, dirt, furniture</td><td class='l'>wheels, brushes, vacuum motor</td><td class='l'>dirt, bump and cliff sensors</td></tr>" +
          "<tr><td class='l'>Medical diagnosis</td><td class='l'>healthy patient, low cost</td><td class='l'>patient, staff, equipment</td><td class='l'>display of questions, tests, diagnoses</td><td class='l'>keyboard entry of symptoms, results</td></tr>" +
          "<tr><td class='l'>Part-picking robot</td><td class='l'>% parts in correct bins</td><td class='l'>conveyor belt, bins</td><td class='l'>jointed arm, gripper</td><td class='l'>camera, tactile, joint encoders</td></tr>" +
          "<tr><td class='l'>English tutor</td><td class='l'>test score improvement</td><td class='l'>students, test platform</td><td class='l'>screen exercises and corrections</td><td class='l'>keyboard, mouse, microphone</td></tr></tbody></table>",
        checks: [
          { q: "For an automated taxi, “GPS” belongs under…", options: ["Sensors", "Actuators", "Performance measure"], answer: "Sensors", why: "GPS delivers percepts (the car's position)." },
          { q: "For a medical diagnosis system, the display of recommended tests is…", options: ["an actuator", "a sensor", "the environment"], answer: "an actuator", why: "A software agent acts by showing output; the display is how it changes its world." },
          { q: "“Percentage of parts placed in the correct bin” is the part-picking robot's…", options: ["Performance measure", "Environment", "Sensor"], answer: "Performance measure", why: "It is the criterion of success." },
        ],
        remember: ["Always write PEAS before designing the agent program.", "Software agents' actuators are often screens, messages or API calls."] },
      { id: "environments", label: "Environment Types",
        lead: "The nature of the environment largely dictates which agent design and which methods are feasible. AIMA classifies environments along seven dimensions.",
        points: [
          "<strong>Fully vs. partially observable:</strong> do sensors see the complete state? (chess vs. poker, driving in fog). No sensors at all: unobservable.",
          "<strong>Single vs. multi-agent:</strong> crossword vs. chess (competitive) vs. driving (partly cooperative, partly competitive).",
          "<strong>Deterministic vs. stochastic:</strong> is the next state fully set by state + action? (8-puzzle vs. backgammon dice). Unpredictable without probabilities: nondeterministic.",
          "<strong>Episodic vs. sequential:</strong> do decisions affect the future? (defect inspection vs. chess).",
          "<strong>Static vs. dynamic:</strong> does the world change while the agent thinks? (crossword vs. taxi). Score drops with time only: semidynamic (timed chess).",
          "<strong>Discrete vs. continuous:</strong> states, time, percepts and actions (chess vs. driving).",
          "<strong>Known vs. unknown:</strong> does the agent know the rules/physics of the world?",
        ],
        example: "<table class='ag-table ui'><thead><tr><th class='l'>env.</th><th>obs.</th><th>agents</th><th>determ.</th><th>episodes</th><th>static</th><th>discrete</th></tr></thead><tbody>" +
          "<tr><td class='l'>Crossword</td><td>fully</td><td>single</td><td>yes</td><td>seq.</td><td>static</td><td>discrete</td></tr>" +
          "<tr><td class='l'>Chess + clock</td><td>fully</td><td>multi</td><td>yes</td><td>seq.</td><td>semi</td><td>discrete</td></tr>" +
          "<tr><td class='l'>Poker</td><td>partial</td><td>multi</td><td>no</td><td>seq.</td><td>static</td><td>discrete</td></tr>" +
          "<tr class='is-hl'><td class='l'>Taxi</td><td>partial</td><td>multi</td><td>no</td><td>seq.</td><td>dynamic</td><td>cont.</td></tr></tbody></table>",
        checks: [
          { q: "Classifying each part on an assembly line as defective or not is…", options: ["episodic", "sequential"], answer: "episodic", why: "Each decision depends only on the current part and does not affect later ones." },
          { q: "Chess played with a clock is…", options: ["semidynamic", "static", "fully dynamic"], answer: "semidynamic", why: "The board does not change while you think, but your score (time) does." },
          { q: "Poker is partially observable because…", options: ["opponents' cards are hidden", "the dice are random", "there are many players"], answer: "opponents' cards are hidden", why: "The sensors cannot see the complete state." },
        ],
        remember: ["Hardest case: partially observable, multi-agent, stochastic, sequential, dynamic, continuous, unknown (real driving)."] },
      { id: "architectures", label: "Agent Architectures",
        lead: "AIMA's five agent program structures, from least to most general.",
        points: [
          "<strong>Simple reflex:</strong> acts on the current percept only with condition–action rules (if car-in-front-is-braking then brake). Works only if the world is fully observable; can loop forever otherwise.",
          "<strong>Model-based reflex:</strong> keeps an internal state using a <strong>transition model</strong> (how the world evolves and how actions change it) and a <strong>sensor model</strong> (how the state shows up in percepts).",
          "<strong>Goal-based:</strong> combines state with a goal and looks ahead: this is where <strong>search and planning</strong> come in.",
          "<strong>Utility-based:</strong> a utility U(s) ∈ ℝ scores how desirable a state is, so it can trade off conflicting goals (speed vs. safety) and handle uncertainty.",
          "<strong>Learning agent:</strong> <strong>performance element</strong> (chooses actions), <strong>critic</strong> (judges against a fixed standard), <strong>learning element</strong> (improves), <strong>problem generator</strong> (suggests exploratory actions).",
        ],
        checks: [
          { q: "Which agent keeps track of parts of the world it cannot currently see?", options: ["Model-based reflex", "Simple reflex", "None of them"], answer: "Model-based reflex", why: "Its internal state, updated with a transition and sensor model, remembers what is out of view." },
          { q: "An agent must trade off speed against safety. The best fit is…", options: ["utility-based", "goal-based", "simple reflex"], answer: "utility-based", why: "A goal is just yes/no; a utility function measures how good each outcome is." },
          { q: "In a learning agent, which part proposes new, exploratory actions?", options: ["Problem generator", "Critic", "Performance element"], answer: "Problem generator", why: "The critic gives feedback; the problem generator suggests experiences to learn from." },
        ],
        remember: ["Reflex → model-based → goal-based → utility-based → learning.", "Goal-based agents are the ones that search."] },
    ] },
    { id: "formulation", label: "Problem Formulation", source: "AIMA (4th ed.) §3.1–3.2", subs: [
      { id: "cycle", label: "Problem-Solving Agents",
        lead: "When one reflex rule is not enough, a <strong>problem-solving agent</strong> (a goal-based agent) looks ahead for a sequence of actions that reaches a goal.",
        points: [
          "<strong>1. Goal formulation:</strong> turn objectives into a concrete target.",
          "<strong>2. Problem formulation:</strong> decide which states and actions to consider.",
          "<strong>3. Search:</strong> simulate action sequences in the model until a path to the goal is found.",
          "<strong>4. Execution:</strong> carry out the plan one action at a time.",
          "Search happens <strong>offline</strong>, in the agent's model of the world, before any physical action is taken.",
        ],
        example: "<pre class='rn-code'>1. Goal formulation    → target state\n2. Problem formulation → states + actions\n3. Search              → plan (action sequence)\n4. Execution           → act, one step at a time</pre>",
        checks: [
          { q: "Which phase decides which states and actions to consider?", options: ["Problem formulation", "Goal formulation", "Execution"], answer: "Problem formulation", why: "Goal formulation fixes the target; problem formulation fixes the model to search in." },
          { q: "During search, the agent…", options: ["simulates actions in its model", "moves in the real world", "updates its sensors"], answer: "simulates actions in its model", why: "Search is offline; only the execution phase acts physically." },
        ],
        remember: ["Goal → Problem → Search → Execute."] },
      { id: "five", label: "The 5 Components",
        lead: "A <strong>search problem</strong> is defined by five components.",
        points: [
          "<strong>Initial state</strong> s<sub>0</sub>: where the agent starts.",
          "<strong>ACTIONS(s)</strong>: the legal actions in state s (a is <em>applicable</em> in s).",
          "<strong>Transition model</strong> RESULT(s, a) = s′: the state an action leads to; s′ is a <em>successor</em> of s.",
          "<strong>Goal test</strong> IS-GOAL(s): an explicit set of goal states, or a property (no two queens attack each other).",
          "<strong>Step cost</strong> c(s, a, s′); the <strong>path cost</strong> g(n) is the sum of step costs along the path.",
        ],
        formula: "Problem = ⟨ s<sub>0</sub>, ACTIONS(s), RESULT(s, a), IS-GOAL(s), c(s, a, s′) ⟩",
        checks: [
          { q: "RESULT(In(Arad), Go(Zerind)) = In(Zerind) is part of…", options: ["the transition model", "the goal test", "the step cost"], answer: "the transition model", why: "It says which state an action leads to." },
          { q: "“No two queens attack each other” is an example of…", options: ["a goal test given as a property", "an action", "an initial state"], answer: "a goal test given as a property", why: "Goals can be listed explicitly or described by a test." },
          { q: "Path cost of steps costing 3, 2 and 5?", options: ["10", "5", "30"], answer: "10", why: "g(n) is the sum of step costs: 3 + 2 + 5." },
        ],
        remember: ["Initial state, actions, transition model, goal test, cost."] },
      { id: "abstraction", label: "Abstraction",
        lead: "<strong>Abstraction</strong> removes irrelevant detail from the state while keeping everything needed to find a solution.",
        points: [
          "A route planner does not need tyre pressure, the radio song or the road temperature: keeping them would make the state space infinite.",
          "An abstraction is <strong>valid</strong> if every abstract solution can be turned into real actions that actually work.",
          "An abstraction is <strong>useful</strong> if acting in the abstract model is easier than in the raw world.",
          "<strong>Under-abstraction</strong> keeps too much detail (state space explodes); <strong>over-abstraction</strong> drops essential detail (plans fail in the real world).",
        ],
        figure: FIG[1],
        checks: [
          { q: "An EV route planner ignores battery charge. Its plans may strand the car. This is…", options: ["over-abstraction", "under-abstraction", "a valid abstraction"], answer: "over-abstraction", why: "An essential detail was removed, so abstract solutions do not work in reality." },
          { q: "An abstraction is valid when…", options: ["every abstract solution maps to real actions that succeed", "it has the fewest states", "it keeps every detail"], answer: "every abstract solution maps to real actions that succeed", why: "Validity is about solutions translating back; usefulness is about being easier." },
        ],
        remember: ["Keep what affects the solution; drop everything else."] },
      { id: "state-space", label: "State Space & Optimality",
        lead: "The initial state, actions and transition model together define the <strong>state space</strong>: all states reachable from s<sub>0</sub>.",
        points: [
          "The state space is a <strong>directed graph</strong>: nodes are states, edges are actions.",
          "A <strong>path</strong> is a sequence of states connected by actions.",
          "A <strong>solution</strong> is an action sequence from s<sub>0</sub> to a state where IS-GOAL is true.",
          "An <strong>optimal solution</strong> has the lowest path cost of all solutions; that cost is <strong>C*</strong>.",
        ],
        formula: "C* = min { cost(p) : p is a solution }",
        checks: [
          { q: "Solutions cost 12, 9 and 15. C* = ?", options: ["9", "12", "36"], answer: "9", why: "C* is the minimum path cost over all solutions." },
          { q: "In the state-space graph, edges are…", options: ["actions", "states", "goals"], answer: "actions", why: "Nodes are states; directed edges are actions between them." },
        ],
        remember: ["Solution = reaches a goal. Optimal solution = cheapest one, with cost C*."] },
    ] },
    { id: "benchmarks", label: "Benchmark Problems", source: "AIMA (4th ed.) §3.2", subs: [
      { id: "vacuum", label: "Two-Room Vacuum World",
        lead: "The classic <strong>toy problem</strong>: two rooms A and B, each Clean or Dirty, and a vacuum in one of them.",
        points: [
          "<strong>States:</strong> (Location, A-status, B-status): 2 × 2 × 2 = <strong>8</strong> states.",
          "<strong>Initial state:</strong> any of the 8, e.g. (A, Dirty, Dirty).",
          "<strong>Actions:</strong> {Left, Right, Suck}.",
          "<strong>Transition:</strong> Left → A, Right → B, Suck cleans the current room; moving into a wall does nothing.",
          "<strong>Goal:</strong> both rooms clean (2 goal states). <strong>Cost:</strong> 1 per action.",
        ],
        formula: "|S| = 2 locations × 2 × 2 = 8",
        figure: FIG[2],
        checks: [
          { q: "How many goal states does the two-room vacuum world have?", options: ["1", "2", "4"], answer: "2", why: "Both rooms clean, with the agent in A or in B." },
          { q: "From (A, Clean, Dirty), the action Left gives…", options: ["(A, Clean, Dirty)", "(B, Clean, Dirty)", "(A, Clean, Clean)"], answer: "(A, Clean, Dirty)", why: "Moving into the left wall has no effect." },
        ],
        remember: ["Toy problems have short, exact descriptions; they are for testing methods."] },
      { id: "puzzle", label: "8-Puzzle",
        lead: "A 3 × 3 board with tiles 1–8 and one blank (0). A tile next to the blank can slide into it.",
        points: [
          "<strong>States:</strong> position of every tile and the blank: 9! = 362,880 arrangements, of which <strong>9!/2 = 181,440</strong> are reachable from any start (parity invariant).",
          "<strong>Actions:</strong> move the <em>blank</em> Left, Right, Up or Down (at most 4 actions, instead of moving tiles).",
          "<strong>Transition:</strong> swap the blank with the tile in that direction.",
          "<strong>Goal:</strong> e.g. [1,2,3, 4,5,6, 7,8,0]. <strong>Cost:</strong> 1 per move.",
        ],
        formula: "9! = 362,880 &nbsp;·&nbsp; reachable = 9! / 2 = 181,440",
        figure: FIG[3],
        checks: [
          { q: "Why model the actions as moving the blank?", options: ["The action set stays fixed at ≤ 4 moves", "Tiles cannot move", "It halves the state space"], answer: "The action set stays fixed at ≤ 4 moves", why: "Otherwise each tile would need its own set of moves." },
          { q: "With the blank in a corner, how many actions are legal?", options: ["2", "3", "4"], answer: "2", why: "Corner: 2, edge: 3, centre: 4." },
        ],
        remember: ["Only half of all 8-puzzle boards can reach a given goal."] },
      { id: "maze", label: "Grid & Maze Navigation",
        lead: "An agent moves on a 2D grid from a start cell to a goal cell, avoiding walls.",
        points: [
          "<strong>States:</strong> the agent's cell (row, col).",
          "<strong>Actions:</strong> North, South, East, West into an in-bounds, non-wall cell.",
          "<strong>Transition:</strong> RESULT((r, c), North) = (r − 1, c), and so on.",
          "<strong>Goal:</strong> (r, c) = (r<sub>goal</sub>, c<sub>goal</sub>). <strong>Cost:</strong> 1 per step, or a terrain weight.",
        ],
        checks: [
          { q: "RESULT((3, 2), East) on an open grid = ?", options: ["(3, 3)", "(2, 2)", "(4, 2)"], answer: "(3, 3)", why: "East increases the column by 1." },
          { q: "A 5 × 5 maze has at most how many states?", options: ["25", "125", "2⁵"], answer: "25", why: "One state per cell; walls only reduce it." },
        ],
        remember: ["State = position only; walls live in ACTIONS(s)."] },
      { id: "route", label: "Route Finding (Romania)",
        lead: "AIMA's route-finding problem: drive from <strong>Arad</strong> to <strong>Bucharest</strong> on a road map with distances.",
        points: [
          "<strong>States:</strong> the current city, In(City). <strong>Initial:</strong> In(Arad).",
          "<strong>Actions:</strong> Go(c) for each city c connected by a road.",
          "<strong>Transition:</strong> RESULT(In(Arad), Go(Zerind)) = In(Zerind).",
          "<strong>Goal:</strong> In(Bucharest). <strong>Cost:</strong> road distance in km, e.g. Arad → Zerind = 75.",
          "Step costs are <strong>not</strong> all 1, so the fewest actions and the cheapest path can differ.",
        ],
        checks: [
          { q: "Why can the shortest route in km use more roads than another route?", options: ["Step costs differ, so number of actions ≠ total cost", "Romania is a toy problem", "The goal test is a property"], answer: "Step costs differ, so number of actions ≠ total cost", why: "With non-unit costs, a 3-road path can be shorter in km than a 2-road path." },
        ],
        remember: ["Non-unit step costs separate “fewest moves” from “cheapest”."] },
      { id: "queens", label: "8-Queens",
        lead: "Place 8 queens so that no two share a row, column or diagonal. The formulation choice changes the search space enormously.",
        example: "<table class='ag-table ui'><thead><tr><th class='l'>formulation</th><th class='l'>state</th><th class='l'>action</th><th>size</th></tr></thead><tbody>" +
          "<tr><td class='l'>Naive incremental</td><td class='l'>0–8 queens anywhere</td><td class='l'>add a queen to any empty square</td><td>64×63×…×57 ≈ 1.8 × 10¹⁴</td></tr>" +
          "<tr class='is-hl'><td class='l'>Refined incremental</td><td class='l'>k queens in the leftmost k columns</td><td class='l'>add a queen to an unattacked square in column k+1</td><td class='is-best'>2,057</td></tr>" +
          "<tr><td class='l'>Complete-state</td><td class='l'>8 queens, one per column</td><td class='l'>move a queen within its column</td><td>8⁸ = 16,777,216</td></tr></tbody></table>",
        points: [
          "<strong>Incremental:</strong> start empty, add one queen at a time.",
          "<strong>Complete-state:</strong> start with all 8 placed, then repair conflicts (local search, CSPs).",
          "Building the constraints into ACTIONS(s) prunes illegal partial states the moment they would be generated.",
        ],
        checks: [
          { q: "Which formulation suits hill-climbing or min-conflicts?", options: ["Complete-state", "Naive incremental", "Refined incremental"], answer: "Complete-state", why: "Local search modifies a full assignment." },
          { q: "Why is the refined formulation so much smaller?", options: ["Attacked squares are never offered as actions", "It uses a smaller board", "It ignores diagonals"], answer: "Attacked squares are never offered as actions", why: "Only non-attacking placements in the next column are generated." },
        ],
        remember: ["A better formulation can shrink the search by many orders of magnitude."] },
      { id: "real-world", label: "Real-World Problems",
        lead: "Toy problems illustrate methods; <strong>real-world problems</strong> are the ones people care about, and need careful engineering.",
        points: [
          "<strong>Travelling salesperson (TSP):</strong> visit every city once with minimal distance; (n − 1)!/2 tours; NP-hard.",
          "<strong>VLSI layout:</strong> place millions of transistors and route wires without overlap.",
          "<strong>Robot navigation:</strong> continuous motion in 3D, discretised into configuration spaces.",
          "<strong>Assembly sequencing:</strong> an order to assemble parts without collisions.",
          "<strong>Protein design:</strong> an amino-acid sequence that folds into a target 3D shape.",
        ],
        formula: "TSP tours for n cities = (n − 1)! / 2",
        checks: [
          { q: "How many distinct tours does TSP have for n = 5 cities?", options: ["12", "24", "120"], answer: "12", why: "(5 − 1)! / 2 = 24 / 2 = 12." },
          { q: "Robot navigation is usually made searchable by…", options: ["discretising the continuous space", "removing obstacles", "using a single action"], answer: "discretising the continuous space", why: "Configuration spaces turn continuous motion into a graph." },
        ],
        remember: ["Toy problems: exact and small. Real-world problems: messy and large."] },
    ] },
    { id: "analysis", label: "Comparing Formulations", source: "AIMA (4th ed.) Ch. 2–3", subs: [
      { id: "size", label: "State-Space Size & Branching",
        lead: "Two numbers drive how hard a search problem is.",
        points: [
          "<strong>State-space size |S|:</strong> number of distinct reachable states. 8 (vacuum) is trivial; ~10<sup>13</sup> (15-puzzle) or ~10<sup>120</sup> (chess game tree) needs heuristics and pruning.",
          "<strong>Branching factor b:</strong> number of legal actions in a typical state. 8-puzzle: 2–4, average ≈ 3. Chess ≈ 35. Go ≈ 250.",
          "A search to depth d can touch on the order of b<sup>d</sup> nodes.",
        ],
        formula: "nodes to depth d ≈ b<sup>d</sup>",
        checks: [
          { q: "b = 3, d = 4. Roughly how many nodes at depth 4?", options: ["81", "12", "64"], answer: "81", why: "3⁴ = 81." },
          { q: "Which game has the largest branching factor?", options: ["Go", "Chess", "8-puzzle"], answer: "Go", why: "Go ≈ 250, chess ≈ 35, 8-puzzle ≈ 3." },
        ],
        remember: ["Exponential growth in b<sup>d</sup> is why formulation matters."] },
      { id: "graph-tree", label: "State-Space Graph vs. Search Tree",
        lead: "The <strong>graph</strong> has one node per state; the <strong>search tree</strong> has one node per path.",
        points: [
          "The state-space graph is finite whenever the set of states is finite, even with cycles (Left → Right → Left).",
          "The search tree unrolls paths from s<sub>0</sub>: the same state can appear many times, and a cyclic graph gives an <strong>infinite</strong> tree.",
          "<strong>Graph search</strong> keeps a <em>reached</em> table so repeated states are not expanded again.",
        ],
        checks: [
          { q: "The two-room vacuum world has 8 states. Its search tree is…", options: ["infinite, because of cycles", "exactly 8 nodes", "at most 16 nodes"], answer: "infinite, because of cycles", why: "Left, Right, Left, … can be repeated forever along a path." },
          { q: "What stops graph search from expanding the same state twice?", options: ["The reached table", "The goal test", "The branching factor"], answer: "The reached table", why: "States already reached are skipped (or kept only if reached more cheaply)." },
        ],
        remember: ["Graph: one node per state. Tree: one node per path."] },
      { id: "representations", label: "Atomic, Factored & Structured",
        lead: "Three ways to represent a state, from least to most internal structure.",
        example: "<table class='ag-table ui'><thead><tr><th class='l'>representation</th><th class='l'>structure</th><th class='l'>example</th><th class='l'>used in</th></tr></thead><tbody>" +
          "<tr><td class='l'>Atomic</td><td class='l'>a black box, no parts</td><td class='l'>Arad, State_4</td><td class='l'>BFS, DFS, A*</td></tr>" +
          "<tr><td class='l'>Factored</td><td class='l'>fixed variables with values</td><td class='l'>{Loc: A, RoomA: Clean, RoomB: Dirty}</td><td class='l'>CSPs, planning, propositional logic</td></tr>" +
          "<tr><td class='l'>Structured</td><td class='l'>objects and relations</td><td class='l'>On(A, B) ∧ Clear(A)</td><td class='l'>first-order logic, knowledge graphs</td></tr></tbody></table>",
        checks: [
          { q: "{Loc: A, RoomA: Clean, RoomB: Dirty} is…", options: ["factored", "atomic", "structured"], answer: "factored", why: "A fixed set of variables, each with a value." },
          { q: "Classical search (BFS, A*) treats states as…", options: ["atomic", "factored", "structured"], answer: "atomic", why: "The algorithm only needs to compare and expand states, not look inside them." },
        ],
        remember: ["Atomic → factored (CSPs, Topic 04) → structured (logic, Topic 05)."] },
      { id: "matrix", label: "Comparison Matrix",
        lead: "The five components side by side for the benchmark problems.",
        example: "<table class='ag-table ui'><thead><tr><th class='l'>problem</th><th class='l'>state</th><th class='l'>actions</th><th class='l'>goal</th><th class='l'>cost</th><th>|S|</th></tr></thead><tbody>" +
          "<tr><td class='l'>Two-room vacuum</td><td class='l'>(Loc, A, B)</td><td class='l'>Left, Right, Suck</td><td class='l'>A, B clean</td><td class='l'>1</td><td>8</td></tr>" +
          "<tr><td class='l'>8-puzzle</td><td class='l'>3×3 array of 0..8</td><td class='l'>blank L, R, U, D</td><td class='l'>solved board</td><td class='l'>1</td><td>181,440</td></tr>" +
          "<tr><td class='l'>5×5 maze</td><td class='l'>(row, col)</td><td class='l'>N, S, E, W</td><td class='l'>goal cell</td><td class='l'>1</td><td>≤ 25</td></tr>" +
          "<tr><td class='l'>Route finding</td><td class='l'>In(City)</td><td class='l'>Go(City)</td><td class='l'>In(Bucharest)</td><td class='l'>km</td><td>#cities (20)</td></tr>" +
          "<tr><td class='l'>8-queens (refined)</td><td class='l'>rows [r₁ … r<sub>k</sub>]</td><td class='l'>place in next column</td><td class='l'>8 placed, no attacks</td><td class='l'>0 or 1</td><td>2,057</td></tr></tbody></table>",
        checks: [
          { q: "Which benchmark has non-unit step costs?", options: ["Route finding", "8-puzzle", "Two-room vacuum"], answer: "Route finding", why: "Its step cost is the road distance in km." },
          { q: "Which problem's state is a single city name?", options: ["Route finding", "Maze", "8-queens"], answer: "Route finding", why: "In(City): an atomic state." },
        ],
        remember: ["Same five components, very different sizes and costs."] },
    ] },
    { id: "practice", label: "Practice", source: "Worked exercises · AIMA Ch. 2–3", subs: [
      { id: "ex1", label: "1 · PEAS", exercise: true,
        problem: "Give PEAS for (a) an <strong>autonomous warehouse forklift</strong>, (b) a <strong>high-frequency stock-trading agent</strong>, (c) a <strong>smart building climate controller</strong>. Then answer the questions.",
        tasks: [
          { type: "mcq", q: "Forklift: the fork weight/load pressure sensor is a…", options: ["Sensor", "Actuator", "Performance measure"], answer: "Sensor", why: "It reports how heavy the load is: a percept." },
          { type: "mcq", q: "Trading agent: sending limit orders via the FIX API is an…", options: ["Actuator", "Sensor", "Environment"], answer: "Actuator", why: "It is how the agent acts on the market." },
          { type: "mcq", q: "Climate controller: which is a performance measure?", options: ["kWh consumed and occupant comfort", "CO₂ sensors", "Fan controllers"], answer: "kWh consumed and occupant comfort", why: "CO₂ sensors are sensors; fan controllers are actuators." },
          { type: "mcq", q: "Which belongs to the trading agent's Environment?", options: ["Exchanges, order books, competing algorithms", "Sharpe ratio", "Market data feeds"], answer: "Exchanges, order books, competing algorithms", why: "Sharpe ratio is a performance measure; data feeds are sensors." },
        ],
        steps: [
          "<strong>(a) Forklift.</strong> P: pallets moved per hour, energy, zero collisions, zero damage. E: warehouse floor, docks, trucks, racks, people, other forklifts. A: drive motors, steering, braking, hydraulic fork lift, horn, strobe lights. S: lidar, depth cameras, wheel odometry, barcode/RFID readers, fork load sensors, bumper switches.",
          "<strong>(b) Trading agent.</strong> P: return on investment, Sharpe ratio, low drawdown, low transaction cost, compliance. E: exchanges, order books, news feeds, economic releases, competitor algorithms. A: order submission and cancellation via FIX API, fund allocation. S: real-time market data (order-book depth, ticks), news parsers, historical price feeds.",
          "<strong>(c) Climate controller.</strong> P: comfort satisfaction, kWh used, peak-demand charges, equipment lifespan. E: multi-zone building, outdoor weather, sunlight, occupancy schedule, electricity tariffs. A: HVAC relays, fan speed controllers, zone dampers, window shades. S: temperature, humidity, occupancy and CO₂ sensors, weather API, grid price signal.",
        ] },
      { id: "ex2", label: "2 · Classify Environments", exercise: true,
        problem: "Classify six environments by observability, agents, determinism, episodic/sequential, static/dynamic and discreteness: <strong>chess with clock, Texas Hold'em, autonomous driving, image defect classifier, crossword, medical diagnosis</strong>.",
        tasks: [
          { type: "mcq", q: "Texas Hold'em is…", options: ["Partially observable, stochastic", "Fully observable, deterministic", "Partially observable, deterministic"], answer: "Partially observable, stochastic", why: "Hidden cards and a random deal." },
          { type: "mcq", q: "The image defect classifier is…", options: ["Episodic", "Sequential"], answer: "Episodic", why: "Each image is judged independently." },
          { type: "mcq", q: "Chess with a clock is…", options: ["Semi-dynamic", "Static", "Dynamic"], answer: "Semi-dynamic", why: "The board waits; the clock does not." },
          { type: "mcq", q: "Which of the six is continuous, dynamic and multi-agent?", options: ["Autonomous driving", "Crossword", "Poker"], answer: "Autonomous driving", why: "Continuous positions and speeds, other road users, a world that changes while you think." },
        ],
        steps: [
          "<table class='ag-table ui'><thead><tr><th class='l'>env</th><th>obs.</th><th>agents</th><th>determ.</th><th>episodic</th><th>static</th><th>discrete</th></tr></thead><tbody>" +
          "<tr><td class='l'>Chess (clock)</td><td>fully</td><td>multi (comp.)</td><td>determ.</td><td>seq.</td><td>semi</td><td>discrete</td></tr>" +
          "<tr><td class='l'>Hold'em</td><td>partially</td><td>multi (comp.)</td><td>stochastic</td><td>seq.</td><td>static</td><td>discrete</td></tr>" +
          "<tr><td class='l'>Driving</td><td>partially</td><td>multi (mixed)</td><td>stochastic</td><td>seq.</td><td>dynamic</td><td>continuous</td></tr></tbody></table>",
          "<table class='ag-table ui'><thead><tr><th class='l'>env</th><th>obs.</th><th>agents</th><th>determ.</th><th>episodic</th><th>static</th><th>discrete</th></tr></thead><tbody>" +
          "<tr><td class='l'>Defect classifier</td><td>fully</td><td>single</td><td>determ.</td><td>episodic</td><td>static</td><td>both</td></tr>" +
          "<tr><td class='l'>Crossword</td><td>fully</td><td>single</td><td>determ.</td><td>seq.</td><td>static</td><td>discrete</td></tr>" +
          "<tr><td class='l'>Medical diagnosis</td><td>partially</td><td>single (or multi)</td><td>stochastic</td><td>seq.</td><td>dynamic</td><td>both</td></tr></tbody></table>",
          "<strong>Takeaway:</strong> the hardest environments are partially observable, multi-agent, stochastic, sequential, dynamic, continuous and unknown, like real driving.",
        ] },
      { id: "ex3", label: "3 · Vacuum Combinatorics", exercise: true,
        problem: "A vacuum world has <strong>N rooms</strong> in a row; the agent is in one of them. (a) Each room is Clean or Dirty: give |S|. (b) Evaluate for N = 2, 5, 10. (c) Each room has K dirt levels: give |S|.",
        tasks: [
          { type: "mcq", q: "Formula for binary dirt?", options: ["N × 2ᴺ", "2N", "N²"], answer: "N × 2ᴺ", why: "N agent positions times 2ᴺ dirt configurations." },
          { type: "num", label: "|S| for N = 5", answer: 160, tol: 0 },
          { type: "num", label: "|S| for N = 10", answer: 10240, tol: 0 },
          { type: "num", label: "|S| for N = 5, K = 4", answer: 5120, tol: 0, hint: "N × Kᴺ" },
        ],
        steps: [
          "<strong>Independent parts:</strong> agent location (N choices) and the status of each room (2 choices each, so 2ᴺ).",
          "<strong>(a)</strong> |S| = <strong>N × 2ᴺ</strong>.",
          "<strong>(b)</strong> N = 2: 2 × 4 = 8 · N = 5: 5 × 32 = <strong>160</strong> · N = 10: 10 × 1024 = <strong>10,240</strong>.",
          "<strong>(c)</strong> |S| = N × Kᴺ; for N = 5, K = 4: 5 × 1024 = <strong>5,120</strong>.",
        ] },
      { id: "ex4", label: "4 · 8-Puzzle Parity", exercise: true,
        problem: "Prove that exactly half of the 9! = 362,880 8-puzzle boards can reach the standard goal. Use the board <code>1 2 3 / 8 _ 4 / 7 6 5</code>.",
        tasks: [
          { type: "num", label: "Inversions in (1, 2, 3, 8, 4, 7, 6, 5)", answer: 7, tol: 0, hint: "Count pairs (a, b) with a before b and a > b." },
          { type: "mcq", q: "How does a horizontal blank move change the inversion count?", options: ["By 0", "By ±1", "By ±2 or 0"], answer: "By 0", why: "The order of numbered tiles in the flattened sequence does not change." },
          { type: "mcq", q: "A vertical blank move changes the inversion count by…", options: ["−2, 0 or +2", "±1", "any amount"], answer: "−2, 0 or +2", why: "The moved tile jumps over exactly two tiles." },
          { type: "mcq", q: "Can this board reach the goal 1 2 3 / 4 5 6 / 7 8 _?", options: ["No", "Yes"], answer: "No", why: "7 inversions is odd; the goal has 0 (even); parity never changes." },
        ],
        steps: [
          "<strong>Flatten</strong> the board without the blank: (1, 2, 3, 8, 4, 7, 6, 5).",
          "<strong>Count inversions:</strong> 8 before 4, 7, 6, 5 (4); 7 before 6, 5 (2); 6 before 5 (1). Total = <strong>7</strong>, odd.",
          "<strong>Horizontal move:</strong> the tile order is unchanged, Δ = 0.",
          "<strong>Vertical move:</strong> the tile jumps over 2 tiles. Both smaller or both larger: Δ = ±2; one of each: Δ = 0. Always <strong>even</strong>.",
          "<strong>So parity is invariant.</strong> The goal (1…8) has 0 inversions (even): only even-parity boards can reach it.",
          "Exactly 9!/2 = <strong>181,440</strong> boards are even and 181,440 odd: the state space splits into two unconnected halves.",
        ] },
      { id: "ex5", label: "5 · 8-Queens Formulations", exercise: true,
        problem: "Compare (A) naive incremental: add a queen to any empty square; (B) column by column, only on unattacked squares; (C) complete-state: one queen per column, move a queen within its column.",
        tasks: [
          { type: "mcq", q: "A: number of placement sequences of 8 queens?", options: ["64!/56! ≈ 1.8 × 10¹⁴", "8⁸", "C(64, 8)"], answer: "64!/56! ≈ 1.8 × 10¹⁴", why: "64 × 63 × … × 57 ordered placements." },
          { type: "num", label: "C(64, 8): unordered final placements in A", answer: 4426165368, tol: 0 },
          { type: "num", label: "B: total states in the pruned tree", answer: 2057, tol: 0 },
          { type: "num", label: "C: state-space size 8⁸", answer: 16777216, tol: 0 },
        ],
        steps: [
          "<strong>(A)</strong> 64 × 63 × 62 × 61 × 60 × 59 × 58 × 57 = 64!/56! ≈ <strong>1.78 × 10¹⁴</strong> sequences; even ignoring order, C(64, 8) = <strong>4,426,165,368</strong> boards.",
          "<strong>(B)</strong> Queen k must go in column k (no column clashes; 8⁸ at most) <em>and</em> only on an unattacked square. Illegal partial states are never generated: <strong>2,057</strong> states in total, 92 at depth 8 (the 92 solutions).",
          "<strong>(C)</strong> 8 rows for each of 8 queens: 8⁸ = <strong>16,777,216</strong> states. Ideal for local search (hill-climbing, simulated annealing, min-conflicts).",
        ] },
      { id: "ex6", label: "6 · Missionaries & Cannibals", exercise: true,
        problem: "3 missionaries and 3 cannibals are on the left bank with a boat for at most 2. Cannibals must never outnumber missionaries on a bank that has missionaries. Formulate the problem with state (M, C, B) for the left bank.",
        tasks: [
          { type: "mcq", q: "Initial state?", options: ["(3, 3, 1)", "(0, 0, 0)", "(3, 3, 0)"], answer: "(3, 3, 1)", why: "Everyone and the boat (B = 1) start on the left bank." },
          { type: "num", label: "How many different boat loads (m, c) are possible?", answer: 5, tol: 0, hint: "1 ≤ m + c ≤ 2" },
          { type: "mcq", q: "RESULT((3, 3, 1), Cross(1, 1)) = ?", options: ["(2, 2, 0)", "(4, 4, 0)", "(2, 2, 1)"], answer: "(2, 2, 0)", why: "Subtract the passengers from the left bank; the boat moves right." },
          { type: "mcq", q: "Is (1, 2, 0) a legal state?", options: ["No", "Yes"], answer: "No", why: "Left bank: 1 missionary, 2 cannibals: missionaries are outnumbered." },
          { type: "num", label: "Crossings in the optimal solution", answer: 11, tol: 0 },
        ],
        steps: [
          "<strong>State:</strong> (M, C, B): missionaries and cannibals on the left bank, B = 1 if the boat is on the left. Right bank = (3 − M, 3 − C).",
          "<strong>Safety:</strong> (M = 0 ∨ M ≥ C) ∧ (3 − M = 0 ∨ 3 − M ≥ 3 − C).",
          "<strong>Initial:</strong> (3, 3, 1). <strong>Loads:</strong> (1,0), (2,0), (0,1), (0,2), (1,1): five options.",
          "<strong>Transition:</strong> B = 1: (M, C, 1) → (M − m, C − c, 0); B = 0: (M, C, 0) → (M + m, C + c, 1). Only actions whose result is safe are in ACTIONS(s).",
          "<strong>Goal:</strong> (0, 0, 0). <strong>Cost:</strong> 1 per crossing; the optimum needs <strong>11</strong> crossings.",
        ] },
      { id: "ex7", label: "7 · Abstraction Gap", exercise: true,
        problem: "(a) Contrast over- and under-abstraction. (b) An EV route planner uses state In(City) and actions Go(City). Why does it fail, and how should the state be fixed?",
        tasks: [
          { type: "mcq", q: "Keeping tyre pressure and wind gusts in the state is…", options: ["under-abstraction", "over-abstraction"], answer: "under-abstraction", why: "Too much detail: the state space explodes." },
          { type: "mcq", q: "What is missing from the EV state?", options: ["Battery level", "Road names", "Number of passengers"], answer: "Battery level", why: "Without it a plan may need more energy than the battery holds." },
          { type: "mcq", q: "When is Drive(c′) applicable in the corrected model?", options: ["EnergyNeeded(c, c′) ≤ battery level", "Always", "Only at charging stations"], answer: "EnergyNeeded(c, c′) ≤ battery level", why: "The constraint moves into ACTIONS(s)." },
        ],
        steps: [
          "<strong>Under-abstraction:</strong> too much physical detail (tyre pressure, seat temperature): the state space becomes intractable.",
          "<strong>Over-abstraction:</strong> essential detail dropped (battery, fuel): the abstract plan fails halfway in reality.",
          "<strong>EV failure:</strong> limited battery, terrain-dependent consumption, scarce chargers. Ignoring charge can strand the car between cities.",
          "<strong>Fix:</strong> state = (City, Battery<sub>kWh</sub>). Actions: Drive(c′) if EnergyNeeded ≤ Battery; Charge(target) at a charging station. RESULT((c, b), Drive(c′)) = (c′, b − EnergyNeeded + Regen). Goal: City = Destination ∧ Battery ≥ safety buffer. Cost: time + charging time + electricity cost.",
        ] },
      { id: "ex8", label: "8 · When Reflex Fails", exercise: true,
        problem: "(a) Can a simple reflex agent clean both rooms if it only senses Clean/Dirty in its current room, not which room it is in? (b) How do model-based and problem-solving agents fix this?",
        tasks: [
          { type: "num", label: "Number of possible deterministic rule sets (2 percepts, 3 actions)", answer: 9, tol: 0, hint: "3 choices for each of 2 percepts" },
          { type: "mcq", q: "With the rule “if Clean then Left”, starting in A…", options: ["it loops in A forever; B is never cleaned", "it cleans both rooms", "it stops in B"], answer: "it loops in A forever; B is never cleaned", why: "Left into the wall keeps it in A, which is Clean, so it moves Left again." },
          { type: "mcq", q: "Which plan cleans both rooms from any start?", options: ["[Right, Suck, Left, Suck]", "[Suck, Right, Suck]", "[Suck, Left]"], answer: "[Right, Suck, Left, Suck]", why: "Right puts the agent in B wherever it started; then it cleans B, moves to A and cleans A." },
        ],
        steps: [
          "<strong>Percepts:</strong> only [Clean] or [Dirty]. With 3 actions there are 3² = <strong>9</strong> deterministic rule sets.",
          "[Dirty] → Suck is clearly right. For [Clean]: <strong>Left</strong> loops in A once A is clean; <strong>Right</strong> loops in B; <strong>Suck</strong> never moves.",
          "<strong>Conclusion:</strong> no simple reflex agent is rational here: it needs internal state.",
          "<strong>Model-based agent:</strong> remembers its past actions (“I moved Right, so I am in B, and A is already clean”) and can stop or act correctly.",
          "<strong>Problem-solving agent:</strong> searches over <em>belief states</em> for a plan that works from every possible state, e.g. [Right, Suck, Left, Suck] (or [Suck, Right, Suck, Left, Suck]). [Suck, Right, Suck] fails if it starts in B.",
        ] },
    ] },
  ];
  root.READING_NOTES = { tabs: TABS };
})(typeof window !== "undefined" ? window : globalThis);
