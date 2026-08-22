I’d mirror the structure and teaching intent of maze.md: focus on problem formulation, state representation, state-space size, legal transitions, reachability, and abstraction, rather than on running search algorithms. That matches the maze demo’s stated objective and its emphasis on conceptual clarity over visual complexity. maze.md

Junior Developer Instructions — 8-Puzzle State-Space Demo

Objective

Develop a simple interactive 8-Puzzle State-Space Demo for teaching:

* State
* State representation
* Actions
* Transition model
* State space
* Reachable state space
* Goal state
* Why not every possible tile arrangement is reachable

The purpose of this demo is not primarily to demonstrate BFS, DFS, UCS, or other search algorithms.

The main goal is to help students understand:

\boxed{\text{State} \rightarrow \text{Actions} \rightarrow \text{Reachable States} \rightarrow \text{State Space}}

Use maze.md as the reference for the teaching style and progression.

⸻

1. Puzzle Setup

Use the standard 8-puzzle.

The board contains:

* 8 numbered tiles: 1,2,\ldots,8
* 1 blank position
* A 3\times3 grid

Use the following example as the default initial state:

7  2  4
5  _  6
8  3  1

Use the following goal state:

_  1  2
3  4  5
6  7  8

where _ represents the blank position.

The interface should clearly label:

* Initial State
* Current State
* Goal State

⸻

2. Define a State

First explain what a state means in the 8-puzzle.

A state is:

\boxed{\text{One particular arrangement of the 8 tiles and the blank}}

For example:

7  2  4
5  _  6
8  3  1

is one state.

After one legal move:

7  2  4
5  3  6
8  _  1

is another state.

The visualization should emphasize that:

Moving one tile changes the puzzle from one state to another state.

Show this as:

\boxed{\text{Current State} \rightarrow \text{Action} \rightarrow \text{New State}}

⸻

3. State Representation

Represent the state internally using a simple data structure.

For example:

state = (
    7, 2, 4,
    5, 0, 6,
    8, 3, 1
)

where:

0 = blank

or an equivalent immutable representation.

The important teaching point is that the complete arrangement of the board defines the state.

Two boards with tiles in different positions represent different states.

For example:

(7,2,4,5,0,6,8,3,1)
\neq
(7,2,4,5,3,6,8,0,1)

⸻

4. Actions

The available actions depend on the location of the blank.

Use the following actions:

* Move Blank Up
* Move Blank Down
* Move Blank Left
* Move Blank Right

Only legal actions should be enabled.

For example, if the blank is in the center:

7  2  4
5  _  6
8  3  1

then all four actions are possible:

Up
Down
Left
Right

If the blank is in the upper-left corner:

_  2  4
5  7  6
8  3  1

only:

Down
Right

are legal.

The UI should visually disable or hide illegal actions.

⸻

5. Transition Model

Demonstrate the AIMA concept of a transition model.

Use:

\boxed{RESULT(s,a)=s'}

where:

* s = current state
* a = action
* s' = resulting state

For example:

Current State
7  2  4
5  _  6
8  3  1

Action:

Move Blank Down

Result:

7  2  4
5  3  6
8  _  1

Display:

RESULT(s,\text{Down})=s'

The interface should allow the instructor to manually apply actions and observe the resulting state.

⸻

6. Possible Configurations

Now introduce the question:

How many different arrangements of the tiles and blank are theoretically possible?

There are 9 positions containing:

* 8 distinct numbered tiles
* 1 blank

Therefore:

9!

possible permutations exist.

Display the calculation:

9!
=
9\times8\times7\times6\times5\times4\times3\times2\times1

\boxed{9!=362,880}

Label this clearly as:

\boxed{\text{All Possible Configurations}}

Do not immediately call this the reachable state space.

Students need to understand that:

\text{Possible configurations}
\neq
\text{Reachable configurations}

⸻

7. Reachability

Next introduce the idea of reachable states.

From a particular initial state, legal puzzle moves cannot produce every possible permutation.

The 362,880 configurations are divided into two disconnected groups.

From any valid initial state, only one of these groups can be reached.

Therefore:

\frac{9!}{2}
=
\frac{362,880}{2}
=
181,440

So:

\boxed{\text{Reachable State-Space Size}=181,440}

The visualization should clearly show:

All Possible Configurations
        9!
     362,880
         |
         v
   divided into
   two parity groups
      /       \
181,440     181,440
   ^
   |
reachable from
this initial state

⸻

8. Reachable State Space

Explicitly connect the result to the term state space.

For this demo, define:

The reachable state space is the set of all states that can be reached from the initial state through a sequence of legal actions.

Display:

\boxed{
S_{\text{reachable}}
=
\{s' \mid s' \text{ can be reached from } s_0\}
}

For the 8-puzzle:

\boxed{|S_{\text{reachable}}|=181,440}

The teaching sequence should distinguish:

Concept	Meaning	8-Puzzle
State	One board arrangement	One configuration
Possible configurations	Every permutation	9!=362,880
Reachable states	States obtainable by legal moves	181,440
Reachable state space	Set of all reachable states	181,440 states

⸻

9. Explain Why Only Half Are Reachable

Introduce the reason at a conceptual level.

Legal moves preserve a property related to the parity of the tile permutation.

Therefore, the puzzle configurations form two separate classes.

A state in one class cannot be reached from a state in the other class using legal moves.

For the teaching interface, keep the explanation simple:

362,880 total arrangements
        ↓
Two parity classes
Class A              Class B
181,440              181,440
You can move within one class,
but legal moves cannot cross
from one class to the other.

Do not make the main interface overly mathematical.

An optional “Why?” or “Show Parity Explanation” section can provide additional detail.

⸻

10. Solvable vs. Unsolvable Goal State

Allow the instructor to select or generate another board configuration and compare it with the initial state.

The program should determine whether the selected goal is reachable.

Display either:

Reachable from Initial State

or:

Not Reachable from Initial State

For example:

Initial State
1  2  3
4  5  6
7  8  _

and:

Goal State
1  2  3
4  5  6
8  7  _

should demonstrate that swapping only two numbered tiles creates a configuration in the opposite parity class.

Therefore the second state is not reachable from the first through legal moves.

⸻

11. Interactive State Exploration

Provide a mode where students can manually move the blank.

After every move, display:

* Current state
* Selected action
* New state
* Move number
* Available actions

For example:

State 0
7  2  4
5  _  6
8  3  1
        ↓ Down
State 1
7  2  4
5  3  6
8  _  1
        ↓ Left
State 2
7  2  4
5  3  6
_  8  1

This should visually reinforce:

s_0
\rightarrow
s_1
\rightarrow
s_2
\rightarrow
\cdots

⸻

12. Small Reachability Demonstration

Do not try to visually display all 181,440 states at once.

Instead, provide a small demonstration starting from the initial state.

For example:

Depth 0
                 S0
Depth 1
          /       |       \
        S1       S2       S3
Depth 2
       / \       / \       ...

Allow the instructor to choose a small depth such as:

0
1
2
3

and show the states reachable within that number of moves.

The purpose is to demonstrate how the state space grows from the initial state.

Label this:

States reachable within depth d

Do not confuse this number with the complete state-space size.

⸻

13. Duplicate States

Demonstrate that different action sequences may return to a state that has already been encountered.

For example:

State A
   |
 Right
   v
State B
   |
 Left
   v
State A

The visualization should explain:

A state space contains unique states, not every action sequence used to reach them.

This is useful preparation for later teaching of:

* Search trees
* Search graphs
* Reached sets

But do not implement the full search-algorithm lesson here.

⸻

14. Side-by-Side Concept View

Provide a teaching panel like:

Question	Answer
What is a state?	One arrangement of tiles and blank
What are the actions?	Move blank Up/Down/Left/Right
What is the transition model?	Apply a legal move to obtain another board
How many permutations exist?	9!=362,880
Are all permutations reachable?	No
How many are reachable?	9!/2=181,440
What is the goal state?	A specified target arrangement

Keep this visible as an optional teaching summary.

⸻

15. Teaching Flow

The demo should support the following lecture sequence:

Physical 8-Puzzle
        ↓
What is a State?
        ↓
State = Complete Tile Arrangement
        ↓
What Actions Are Possible?
        ↓
Move Blank Up / Down / Left / Right
        ↓
Transition Model
RESULT(State, Action) = New State
        ↓
How Many Arrangements Are Possible?
        ↓
9! = 362,880
        ↓
Are All of Them Reachable?
        ↓
No
        ↓
Parity Divides Configurations
Into Two Groups
        ↓
Reachable State Space
        ↓
9! / 2 = 181,440
        ↓
Goal State Must Belong
to the Same Reachable Component

The interface should make this progression easy for the instructor to demonstrate step by step.

⸻

16. Important Requirement

Do not hard-code individual puzzle transitions.

Given any valid state, the program should automatically:

1. Find the blank location.
2. Determine the legal actions.
3. Generate the resulting state for each action.
4. Prevent illegal moves.
5. Detect duplicate states when exploring a small state-space region.
6. Determine whether two states belong to the same reachable parity class.

The state-transition logic should therefore work for any valid 8-puzzle configuration.

⸻

17. Do Not Enumerate All States on Page Load

Do not generate all 181,440 reachable states simply to display the demo.

The number:

181,440

can be derived mathematically.

Only generate states when required for a small interactive exploration.

This will keep the demo:

* Fast
* Simple
* Easy to understand
* Appropriate for classroom use

⸻

18. Terminology

Use the following terminology consistently:

State
Initial State
Goal State
Action
Legal Action
Transition Model
RESULT(s, a)
State Space
Reachable State
Reachable State Space
State-Space Size

Avoid introducing unnecessary alternative terminology.

Where appropriate, follow AIMA terminology.

⸻

19. Final Deliverable

The completed demo should allow an instructor to:

1. Display the initial and goal 8-puzzle configurations.
2. Explain what constitutes a state.
3. Show the internal state representation.
4. Identify available actions based on the blank position.
5. Apply an action and demonstrate the transition model.
6. Show that there are 9!=362,880 possible arrangements.
7. Distinguish possible configurations from reachable states.
8. Explain why only half are reachable.
9. Show that the reachable state-space size is:

\boxed{181,440}

10. Demonstrate a small portion of the state space interactively.
11. Show duplicate-state behavior.
12. Check whether a selected goal state is reachable from the initial state.
13. Prepare students conceptually for later lessons on search.

Keep the interface simple and instructional.

Prioritize:

\boxed{\text{conceptual clarity over visual complexity}}

The central lesson students should leave with is:

\boxed{
\text{A state space is not simply every arrangement we can imagine.}
}

Rather:

\boxed{
\text{The reachable state space contains the states obtainable from the initial state through valid actions.}
}