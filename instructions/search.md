Objective

Develop an interactive Search Algorithm Demo for teaching how search algorithms explore a graph.

The primary teaching goal is:

Show students exactly how nodes are selected from the frontier and expanded.

The demo should cover:

1. Breadth-First Search (BFS)
2. Depth-First Search (DFS)
3. Uniform-Cost Search (UCS)
4. Iterative Deepening Search (IDS)

Do not focus only on the final solution path.

Students should be able to observe:

\boxed{
\text{Frontier}
\rightarrow
\text{Select Node}
\rightarrow
\text{Goal Test}
\rightarrow
\text{Expand}
\rightarrow
\text{Update Frontier}
}

Use AIMA terminology consistently.

⸻

1. Use the Same Graph for All Algorithms

Use one directed, weighted graph so students can directly compare how the algorithms behave.

Use:

A → B   cost 3
A → C   cost 2
A → E   cost 9
B → D   cost 2
B → E   cost 4
C → E   cost 6
C → F   cost 9
D → G   cost 3
E → G   cost 1
E → H   cost 2
F → H   cost 1
G → H   cost 5

Default:

Start = A
Goal  = G

When multiple successors are available, process them in:

\boxed{\text{Alphabetical Order}}

The same graph must be used for BFS, DFS, UCS, and IDS.

⸻

2. Main Interface

The screen should have three main areas.

Graph

Display the graph visually.

Clearly distinguish:

* Start node
* Goal node
* Current selected node
* Expanded nodes
* Frontier nodes
* Unvisited nodes
* Final solution path

Search Status

Display:

Algorithm:
Current Step:
Selected Node:
Frontier:
Reached:
Expanded Nodes:

For UCS also display:

Path Cost g(n):

For IDS also display:

Current Depth Limit:
Current Node Depth:

Step Table

Build the table dynamically while the algorithm runs.

Basic format:

Step	Selected	Expanded?	Frontier	Reached

For UCS:

Step	Selected	Expanded?	Frontier ordered by g(n)	Reached / Best Cost

For IDS, also show the current depth limit.

⸻

3. Step-by-Step Control

Provide:

* Next Step
* Previous Step
* Run Automatically
* Pause
* Reset

Do not make the visualization run too quickly.

The instructor must be able to pause after every expansion and explain what happened.

Each press of Next Step should represent one meaningful search step.

⸻

4. Common Search Cycle

The visualization should explicitly teach the common search process:

1. Look at Frontier
        ↓
2. Select a node
        ↓
3. Goal Test
        ↓
4. If Goal → Stop
        ↓
5. Otherwise Expand
        ↓
6. Generate Successors
        ↓
7. Update Frontier / Reached
        ↓
8. Repeat

Animate or highlight the current stage.

For example:

Frontier = [B, C, E]
        ↓ SELECT
Selected = B
        ↓ GOAL TEST
B ≠ G
        ↓ EXPAND
Successors = D, E
        ↓ UPDATE
Frontier = [...]

This process should be visible rather than happening invisibly in the backend.

⸻

5. Selected vs. Expanded

This distinction is important.

A node is selected when it is removed from the frontier.

A node is expanded when its successors are generated.

Display:

\boxed{
\text{Select}
\rightarrow
\text{Goal Test}
\rightarrow
\text{Expand}
}

If the selected node is the goal:

Selected = G
Goal Test: TRUE
STOP

Do not expand G.

Therefore, the final goal node may appear in the Selected Order but not in the Expanded Node Order.

The demo must clearly distinguish these concepts because students will be asked to report:

\boxed{\text{Expanded Node Order}}

⸻

6. BFS — Teach the FIFO Queue

The main concept for BFS is:

\boxed{\text{Frontier = FIFO Queue}}

Display the frontier visually as a queue.

For example:

FRONT                         BACK
 ↓                              ↓
[B] [C] [E]
 ↑
Next node selected

Explain visually:

First In → First Out

When successors are generated, they should be added to the back of the queue.

The node at the front is selected next.

⸻

7. BFS Example

Start:

Frontier = [A]
Reached  = {A}

Expand A:

Successors = B, C, E

Then:

Frontier = [B, C, E]
Reached  = {A, B, C, E}

Visually show:

        A
      / | \
     B  C  E

and:

FRONT                    BACK
  ↓                        ↓
[B] → [C] → [E]

Next:

Selected = B

After expansion:

Frontier = [C, E, D]

Continue step-by-step.

⸻

8. BFS Early Goal Test

For BFS, demonstrate the early goal test.

When expanding E, successors are generated alphabetically:

G
H

As soon as G is generated:

Generated = G
Is G the goal?
YES

Stop the search.

Therefore, with the default graph:

Expanded Node Order:
A, B, C, E

Solution:

A → E → G

Clearly show that D and F may still be in the frontier but are never expanded because the goal has already been found.

Display something similar to:

Frontier before expanding E:
[E, D, F]
Expand E
Generate G
GOAL FOUND
STOP

This is an important teaching moment.

⸻

9. Reached in BFS

Show the reached set separately from the frontier.

Explain visually:

Frontier
= discovered but waiting to be processed
Reached
= all states discovered so far

For example:

Frontier = [E, D, F]
Reached = {A, B, C, D, E, F}

When a generated state already exists in reached, do not add another copy.

Show this explicitly.

For example:

Generate E
E ∈ Reached
Skip

Do not silently discard duplicates.

⸻

10. UCS — Teach the Priority Queue

The main concept for UCS is:

\boxed{
\text{Frontier = Priority Queue ordered by }g(n)
}

where:

g(n)=\text{path cost from the start node to }n

Unlike BFS, UCS does not care which node entered the frontier first.

It selects the node with the lowest path cost.

⸻

11. UCS Priority Queue Visualization

Display:

Priority Queue
Node       g(n)
C           2    ← selected next
B           3
E           9

or visually:

LOWEST COST
    ↓
[C(2)] [B(3)] [E(9)]

Students should see the frontier automatically reorder when costs change.

⸻

12. UCS Example

Initial:

Frontier = [A(0)]
Reached  = {A:0}

Expand A:

B = 3
C = 2
E = 9

The priority queue becomes:

[C(2), B(3), E(9)]

Therefore:

Selected next = C

This should visually demonstrate why UCS selects C before B.

⸻

13. UCS Cost Updates

The demo must clearly show when a cheaper path to an existing state is discovered.

Initially:

E = 9

After expanding C:

g(E)=2+6=8

Display:

Existing E cost = 9
New E cost      = 8
8 < 9
UPDATE

Then:

E: 9 → 8

Later, expanding B:

g(E)=3+4=7

Display:

Existing E cost = 8
New E cost      = 7
7 < 8
UPDATE

Therefore:

E: 9 → 8 → 7

The priority queue should visibly reorder after each update.

⸻

14. Reached in UCS

For UCS, reached should store the best path discovered so far.

For example:

Reached
A : 0
B : 3
C : 2
D : 5
E : 7
F : 11
G : 8

Do not present reached as only a yes/no visited list.

The demo should teach:

\boxed{
reached[state]=\text{best path found so far}
}

When a cheaper path is discovered, update both:

* Reached
* Frontier

⸻

15. UCS Goal Test

This is a critical difference from BFS.

Do not stop UCS when the goal is first generated.

For example, expanding D generates:

G(8)

At this point:

Frontier:
[E(7), G(8), F(11)]

Highlight:

G has been generated.
BUT DO NOT STOP.

Explain visually:

E(7) is still cheaper than G(8).
Therefore UCS must continue.

Next select:

E(7)

Only stop when G is selected as the minimum-cost node from the frontier.

Show:

Frontier:
[G(8), H(9), F(11)]
Select G(8)
Goal Test = TRUE
STOP

Therefore:

Expanded Node Order:
A, C, B, D, E

Solution:

A → B → D → G

Cost:

8

⸻

16. DFS — Teach the LIFO Stack

The main concept for DFS is:

\boxed{\text{Frontier = LIFO Stack}}

Display the frontier as a stack rather than a queue.

For example:

TOP
 ↓
[B]
[C]
[E]

The most recently added node should be selected next.

Visually emphasize:

Last In → First Out

⸻

17. DFS and Alphabetical Successor Order

The required logical successor order is:

B, C, E

However, because DFS uses a stack, implementation details matter.

If successors must be processed alphabetically, ensure that the next selected successor is B.

For a stack implementation this may require pushing successors in reverse order:

Push E
Push C
Push B

giving:

TOP
 ↓
B
C
E

Then B is selected first.

The visualization should distinguish:

Successor order:
B, C, E

from:

Stack push order:
E, C, B

This is important because students frequently become confused about DFS ordering.

⸻

18. DFS Step Demonstration

Show the same sequence:

Frontier
    ↓
Select
    ↓
Goal Test
    ↓
Expand
    ↓
Push successors
    ↓
Updated Frontier

The visualization should make it obvious that DFS goes deeply down one branch before returning to alternatives.

For example:

A
↓
B
↓
D
↓
G

Other nodes may remain waiting in the stack.

⸻

19. IDS — Teach Repeated Depth-Limited DFS

IDS should use the same visual format but introduce:

Depth Limit

The key idea is:

\boxed{
IDS = repeated depth-limited DFS
}

Show separate iterations.

⸻

20. IDS Iterations

Display:

Iteration 1
Depth Limit = 0

Run depth-limited DFS.

Then:

Iteration 2
Depth Limit = 1

Restart from A.

Then:

Iteration 3
Depth Limit = 2

Restart again.

Continue until the goal is found.

The restart must be visually obvious.

For example:

Depth Limit 0
A

then:

RESET FRONTIER
Depth Limit 1
A
├── B
├── C
└── E

then:

RESET FRONTIER
Depth Limit 2
A
...

⸻

21. IDS Frontier

Within each IDS iteration:

\boxed{\text{Frontier behaves like DFS}}

Therefore use the same LIFO stack visualization.

Also display:

Current Depth:
Depth Limit:

For example:

Selected: D
Current Depth: 2
Depth Limit: 2
Depth limit reached.
DO NOT EXPAND D.

This distinction must be visible.

⸻

22. IDS Reached / Repeated Nodes

The visualization should make clear that IDS intentionally revisits nodes across iterations.

For example:

Limit 0:
A
Limit 1:
A, B, C, E
Limit 2:
A, B, D, E, ...

Highlight that seeing A repeatedly is expected.

Do not make the UI look like repeated states are an implementation error.

The purpose is to demonstrate:

\boxed{
\text{IDS trades repeated work for low memory usage and completeness.}
}

⸻

23. Algorithm Comparison Panel

Provide a small comparison panel.

Algorithm	Frontier Behavior	Selection Rule
BFS	FIFO Queue	Oldest node
DFS	LIFO Stack	Most recently added node
UCS	Priority Queue	Lowest g(n)
IDS	Repeated LIFO Stack	DFS within increasing depth limits

The main conceptual message should be:

\boxed{
\text{Same Graph + Different Frontier Strategy}
\rightarrow
\text{Different Expansion Order}
}

⸻

24. Final Result Panel

When an algorithm finishes, show:

Algorithm: BFS
Expanded Node Order:
A → B → C → E
Solution Path:
A → E → G
Path Cost:
10

For UCS:

Algorithm: UCS
Expanded Node Order:
A → C → B → D → E
Solution Path:
A → B → D → G
Path Cost:
8

Also show:

Number of Nodes Expanded:

Do not count the goal node as expanded if the goal test succeeds before its successors are generated.

⸻

25. Side-by-Side Comparison

After running multiple algorithms, allow the instructor to compare the results.

For example:

Algorithm	Expanded Order	Solution	Cost
BFS	A, B, C, E	A → E → G	10
DFS	…	…	…
UCS	A, C, B, D, E	A → B → D → G	8
IDS	…	…	…

Generate these results from the actual algorithm execution.

Do not hard-code the answers.

⸻

26. Visual State of Graph Nodes

At each step, visually distinguish at least:

Unvisited
Frontier
Selected
Expanded
Goal
Solution Path

When a node is selected, highlight it before expansion.

The animation should therefore show:

Node in Frontier
      ↓
Node Selected
      ↓
Goal Test
      ↓
Node Expanded

Do not immediately change a node from frontier to expanded without showing the selection step.

⸻

27. Show Generated Successors

When expanding a node, highlight its outgoing edges one at a time.

For example:

Expanding A
Generate B
Generate C
Generate E

Then show how each generated node affects:

Frontier
Reached

For UCS, also show:

g(child) = g(parent) + edge cost

Example:

g(C)=g(A)+c(A,C)

=0+2=2

Then insert:

C(2)

into the priority queue.

⸻

28. Do Not Hide Duplicate Handling

When a generated state already exists in reached, show what happens.

For BFS:

Generate E
E already in Reached
SKIP

For UCS:

Generate E
Existing cost = 9
New cost = 8
UPDATE

or:

Existing cost = 7
New cost = 8
IGNORE

This should be visible because duplicate handling is part of understanding graph search.

⸻

29. Teaching Mode

Include a Teaching Mode that does not automatically move to the next step.

The instructor should click:

Next

to move through:

Select
Goal Test
Expand
Generate Successor
Update Frontier
Update Reached

This mode should be slower and more detailed than the automatic animation.

⸻

30. Terminology

Use these terms consistently:

State
Node
Start State
Goal State
Frontier
Reached
Selected Node
Expanded Node
Successor
Path
Path Cost
Depth
Goal Test

Algorithm-specific terms:

BFS → FIFO Queue
DFS → LIFO Stack
UCS → Priority Queue ordered by g(n)
IDS → Depth-Limited DFS with increasing depth limit

Avoid using visited when the intended AIMA term is reached.

⸻

31. Important Implementation Requirement

Do not hard-code:

* Expansion order
* Frontier contents
* Reached contents
* Solution path
* Path cost

Implement the actual algorithms.

The visualization should be driven by algorithm events such as:

SELECT
GOAL_TEST
EXPAND
GENERATE
ADD_TO_FRONTIER
UPDATE_FRONTIER
ADD_TO_REACHED
UPDATE_REACHED
SKIP_DUPLICATE
DEPTH_LIMIT
GOAL_FOUND

This will make it easier to animate the algorithm correctly.

⸻

32. Final Deliverable

The completed search.demo should allow the instructor to:

1. Select BFS, DFS, UCS, or IDS.
2. Use the same graph for all algorithms.
3. Step through the search manually.
4. See the current frontier.
5. See the reached set.
6. See which node is selected.
7. See whether the selected node is expanded.
8. Watch successors being generated.
9. Understand FIFO behavior in BFS.
10. Understand LIFO behavior in DFS.
11. Understand priority-queue behavior in UCS.
12. See UCS path-cost calculations and priority updates.
13. Understand increasing depth limits in IDS.
14. Observe duplicate-state handling.
15. See exactly when the goal test occurs.
16. See the expanded-node order.
17. See the final solution path.
18. See the final path cost.
19. Compare the four algorithms.

The most important teaching message is:

\boxed{
\text{The algorithms explore the same state space differently because they manage the frontier differently.}
}

The visualization should make students able to answer:

Why was this node expanded next?

For BFS, the answer should be visible from the FIFO queue.

For DFS, it should be visible from the LIFO stack.

For UCS, it should be visible from the priority queue and g(n).

For IDS, it should be visible from the LIFO stack plus the current depth limit.

Keep the interface simple. Prioritize understanding the search process over visual complexity.