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
Yes. The terminology should make it explicit that orientation is still retained in Step 3, so the reduction is from 4K to 4T.

2. Initial Representation — 4K State Space

First, represent the maze at the grid-cell level.

Let:

K = \text{number of traversable grid points/cells in the maze}

At each grid point, the robot can have four possible orientations:

N,\ E,\ S,\ W

Therefore, define a state as:

\boxed{State=(Grid\ Point,\ Orientation)}

For example:

(A,N),\quad(A,E),\quad(A,S),\quad(A,W)

Display:

* Number of traversable grid points: K
* Number of possible orientations: 4
* State-space size:

\boxed{|S|=4K}

The visualization should show both the robot’s current grid position and orientation.

Actions

Use low-level actions such as:

* Forward
* Turn Left
* Turn Right

For example:

RESULT((A,N),Forward)=(B,N)

RESULT((A,N),TurnRight)=(A,E)

Clearly visualize:

\boxed{Current\ State \rightarrow Action \rightarrow New\ State}

⸻

3. First Abstraction — Turning Points: 4T State Space

Now introduce the first abstraction:

A navigation decision is needed only at a turning point or intersection.

Instead of representing every traversable grid point, identify only the locations where the robot may need to make a navigation decision.

Let:

T = \text{number of relevant turning points/intersections}

For example:

A -------- B
           |
           |
           C

Here, the intermediate grid points along the straight corridor do not need to be represented as separate locations in the search problem.

Assign labels to the relevant turning points:

A, B, C, D, E, ...

However, orientation still matters at this level of abstraction.

Therefore, a state is:

\boxed{State=(Turning\ Point,\ Orientation)}

For example, at turning point B:

(B,N),\quad(B,E),\quad(B,S),\quad(B,W)

Since there are T turning points and four possible orientations at each point:

\boxed{|S|=4T}

The visualization should explicitly show the reduction:

\boxed{4K \rightarrow 4T}

where typically:

T \ll K

The important idea for students is that we have not yet removed orientation. We have only removed unnecessary locations along straight corridors.

So the conceptual change is:

\underbrace{(Grid\ Point,\ Orientation)}_{4K}
\quad\longrightarrow\quad
\underbrace{(Turning\ Point,\ Orientation)}_{4T}

This makes Step 3 a clear example of state-space abstraction: retain information relevant to making decisions while eliminating unnecessary intermediate positions.
⸻

4. Second Abstraction — Abstract Actions: T State Space

In this representation, allow the robot to move directly from one turning point to the next.

Actions should be:

* Move North
* Move East
* Move South
* Move West

For example:

RESULT(A,MoveNorth)=B

At this level, the robot’s orientation no longer needs to be represented separately. The action itself specifies the direction of movement.

Therefore:

\boxed{State = Turning\ Point}

rather than:

State=(Turning\ Point,Orientation)

If there are T turning points/intersections, then:

\boxed{|S|=T}

One abstract action may represent many lower-level movements through a corridor.

Lower-level representation:
A → x → x → x → B
Abstract representation:
A ─────────────→ B

The visualization should show the progression:

\boxed{4K \rightarrow 4T \rightarrow T}

where:

K=\text{number of traversable grid points}

and

T=\text{number of relevant turning points/intersections}

The key idea is:

Step 3 removes unnecessary positions along corridors. Step 4 removes unnecessary orientation information by using directional abstract actions.

So the state representation changes as follows:

(Grid\ Point,Orientation)
\rightarrow
(Turning\ Point,Orientation)
\rightarrow
Turning\ Point

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

7. Teaching Flow

The demo should support the following sequence during a lecture:

Physical Maze
      ↓
Identify Traversable Grid Points (K)
      ↓
Initial State Representation
State = (Grid Point, Orientation)
      ↓
State Space = 4K
      ↓
First Abstraction
Keep Only Turning Points / Intersections
      ↓
State = (Turning Point, Orientation)
      ↓
State Space = 4T
      ↓
Second Abstraction
Use Abstract Actions: Move N / E / S / W
      ↓
Remove Orientation from State
      ↓
State = Turning Point
      ↓
State Space = T
      ↓
Create Abstract Maze Graph

The visualization should emphasize the progressive reduction:

\boxed{4K \rightarrow 4T \rightarrow T}

where:

K=\text{number of traversable grid points}

T=\text{number of relevant turning points/intersections}

The purpose of the demo is to show students how abstraction changes the state representation and reduces the state space, rather than to demonstrate search algorithms.

⸻
8. Important Requirement

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

rather than being given an unrelated pre-built graph.

⸻

9. Final Deliverable

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

Keep the interface simple and instructional. Prioritize conceptual clarity over visual complexity.