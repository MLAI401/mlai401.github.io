Junior Developer Instructions — Maze Search Demo

Objective

Develop a simple interactive Maze Search Demo for teaching problem formulation, abstraction, state space, and search using AIMA terminology.

The demo should help students understand how a physical maze can be represented as a search problem and how abstraction reduces the state space.

⸻

1. Maze Setup

Create a 2D maze containing:

* Start position S
* Goal position G
* Walls
* Open/traversable cells
* Corridors
* Corners/turning points
* Intersections

Use a maze large enough to clearly demonstrate the effect of abstraction.

The same maze must be used throughout all demonstrations.

⸻

2. Initial Representation — 4T State Space

First show the maze using the lower-level representation.

Let:

T = \text{number of traversable locations/cells}

The robot has four possible orientations:

N,\ E,\ S,\ W

Therefore, define a state as:

State=(Location,Orientation)

For example:

(A,N),\quad(A,E),\quad(A,S),\quad(A,W)

Display:

* Number of traversable locations T
* Number of possible orientations = 4
* State-space size:

\boxed{|S|=4T}

The visualization should allow students to see the robot’s current location and orientation.

Actions

Use low-level actions such as:

* Forward
* Turn Left
* Turn Right

Example transition:

RESULT((A,N),Forward)=(B,N)

RESULT((A,N),TurnRight)=(A,E)

Clearly show:

Current State → Action → New State

⸻

3. Abstraction — Decision Points

Next introduce the key abstraction:

Decisions are needed only at intersections and turning points.

Identify and visually mark all relevant decision points in the maze.

Examples:

A -------- B
           |
           |
           C

Positions inside a straight corridor should no longer be represented as individual search states.

Assign labels such as:

A, B, C, D, E, ...

to the decision points.

Display the number of decision points:

J = \text{number of relevant turning/intersection points}

Then show the reduced state-space size.

⸻

4. Abstract Actions

In the abstract representation, allow the robot to move directly from one decision point to the next.

Actions should be:

Move North
Move East
Move South
Move West

For example:

RESULT(A,MoveNorth)=B

One abstract action may therefore represent many physical movements through a corridor.

Visually demonstrate the difference:

Lower-level representation:
A → x → x → x → B
Abstract representation:
A ─────────────→ B

Students should be able to see that the intermediate corridor positions have been removed from the search representation.

⸻

5. Orientation

Demonstrate why orientation is needed in the initial representation but may be removed in the abstract representation.

Initial

State = (Location, Orientation)

For example:

(A,N)\neq(A,E)

because orientation affects the low-level action required.

Abstract

State = Decision Point

For example:

State=A

The agent can directly select:

Move North

and obtain:

RESULT(A,MoveNorth)=B

Therefore, orientation does not need to be represented separately at this level of abstraction.

⸻

6. Side-by-Side Visualization

Provide a mode that allows students to compare the two representations.

Initial Representation	Abstract Representation
Every traversable location matters	Decision points matter
State = location + orientation	State = decision point
Forward / Turn Left / Turn Right	Move N / E / S / W
4T states	J states
Many small transitions	One transition between decision points

The visualization should make the reduction in state space obvious.

⸻

7. Search Demo

After abstraction, allow students to run search algorithms on the abstract graph.

Implement at least:

* BFS
* DFS
* UCS
* IDS

For each algorithm, visualize:

* Current node being expanded
* Frontier
* Reached set
* Expansion order
* Final solution path
* Number of nodes expanded
* Path cost, where applicable

Use AIMA 4th-edition terminology, especially:

State
Action
Transition Model / RESULT
Initial State
Goal State
Frontier
Reached
Node
Expand
Solution Path
Path Cost

⸻

8. Step Mode

Do not only provide a Run button.

Provide:

Reset
Next Step
Run

Next Step is important for teaching.

At every step, show something similar to:

Current State: B
Expanded Node: B
Frontier: [C, D]
Reached: {A, B, C, D}

Highlight the corresponding locations directly on the maze.

⸻

9. Teaching Flow

The demo should support this sequence during a lecture:

Physical Maze
      ↓
Initial State Representation
      ↓
State = (Location, Orientation)
      ↓
State Space = 4T
      ↓
Introduce Abstraction
      ↓
Keep only relevant decision points
      ↓
Create Abstract Maze Graph
      ↓
State = Decision Point
      ↓
Smaller State Space
      ↓
Apply Search Algorithm
      ↓
Find Solution

The purpose is not simply to create a maze-solving application.

The primary purpose is to visually teach:

How we formulate and abstract a real problem before applying a search algorithm.

⸻

10. Code Organization

Keep the teaching concepts separate from the user interface.

Suggested structure:

maze_demo/
├── app.py
├── maze.py
├── abstraction.py
├── search.py
├── templates/
│   └── index.html
├── static/
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── maze.js
├── tests/
│   ├── test_maze.py
│   ├── test_abstraction.py
│   └── test_search.py
└── README.md

maze.py

Responsible for:

* Maze representation
* Traversable locations
* Robot position
* Robot orientation
* Initial 4T state representation
* Low-level transition model

abstraction.py

Responsible for:

* Detecting turning points
* Detecting intersections
* Detecting dead ends where relevant
* Keeping start and goal
* Connecting neighboring decision points
* Creating the abstract graph

search.py

Implement:

BFS
DFS
UCS
IDS

Keep search implementations independent from the visualization.

⸻

11. Important Requirement

Do not hard-code the abstract graph.

The program should derive the abstract representation from the maze.

For example, given:

#########
#S......#
######..#
#.......#
#.#######
#......G#
#########

the program should identify the relevant decision/turning points and construct the corresponding graph.

This is important because students need to see that:

\text{Maze}
\rightarrow
\text{Abstraction}
\rightarrow
\text{Graph}
\rightarrow
\text{Search}

rather than being given an unrelated pre-built graph.

⸻

12. Final Deliverable

The completed demo should allow an instructor to:

1. Display a maze.
2. Show T, the number of traversable locations.
3. Explain why the initial representation has 4T states.
4. Show a robot with location and orientation.
5. Demonstrate low-level actions and transitions.
6. Apply abstraction.
7. Highlight intersections/turning points.
8. Automatically construct the abstract graph.
9. Compare the initial and abstract state spaces.
10. Run BFS, DFS, UCS, and IDS.
11. Step through the search using frontier and reached.
12. Highlight the final solution path.

Keep the interface simple and instructional. Prioritize conceptual clarity over visual complexity.