# MLAI401 — Knowledge & Reasoning (Topic 05) Specification

## 1. Goal & Architecture Overview

Create the specification for **Topic 05: Knowledge & Reasoning**, covering how AI agents represent facts and rules about the world, derive new truths through **formal logical inference**, and make rational decisions under uncertainty using **probabilistic reasoning and Bayesian networks**.

Content reference: *Artificial Intelligence: A Modern Approach* (AIMA, 4th ed.), **Part III — Knowledge, Reasoning, and Planning** (Chapters 7, 8, 9) and **Part IV — Uncertain Knowledge and Reasoning** (Chapters 12, 13).

### Target Deliverables

| File | Role |
|---|---|
| `knowledge.html` | Single-viewport interactive lecture page (concept column + visual illustration column) |
| `demos/knowledge_demo/logic_engine.js` | Pure zero-dependency Propositional & Horn Logic inference engine (`window.LogicEngine`) |
| `demos/knowledge_demo/bayes_engine.js` | Pure zero-dependency Bayesian Network exact & approximate sampling engine (`window.BayesEngine`) |
| `demos/knowledge_demo/ui.js` | Lecture page controller — topic tabs, concept chips, interactive visualizers, steppers |
| `demos/knowledge_demo/knowledge_lab.js` | Playground controller for `playground.html#view-knowledge` |
| `python_sandbox/08_Logic_Reasoning.py` | Standalone Python implementation of KB, TT-Entails, PL-Resolution, PL-FC-Entails (Wumpus World & Horn KB) |
| `python_sandbox/09_Bayesian_Reasoning.py` | Standalone Python implementation of BayesNet, Exact Enumeration, Variable Elimination, Prior Sample, Rejection Sampling & Likelihood Weighting |
| `python_sandbox/knowledge.py` | Clean reference classes (`KB`, `PropositionalKB`, `BayesNet`, `BayesNode`) used across demos |
| `topic05_reading.html` | Comprehensive textbook-style reading notes + step-by-step practice problems with solutions |
| `curriculum.html` | Updated Topic 05 curriculum card linking to lecture, reading notes, and playground |

---

## 2. Design & Layout Specification

Follows the unified MLAI401 design system established in Topics 01–04:

* **Viewport Strategy:** Single-viewport, concept-first layout without page scroll on standard 1080p desktop displays.
* **Top Navigation Bar:** Breadcrumb (`Curriculum > Topic 05`), topic badge (`Topic 05`), title, and action buttons (`Reading Notes`, `Interactive Demo`).
* **Topic Selector Tabs:**
  1. `0 · Progression: Search → Games → CSP → Knowledge`
  2. `1 · Knowledge-Based Agents & Propositional Logic`
  3. `2 · Logical Inference: Truth Tables & Resolution`
  4. `3 · Horn Clauses, Forward & Backward Chaining`
  5. `4 · First-Order Logic & Knowledge Engineering`
  6. `5 · Quantifying Uncertainty & Bayes' Rule`
  7. `6 · Bayesian Networks & Independence`
  8. `7 · Probabilistic Inference: Exact & Sampling`
  9. `8 · Evaluating Knowledge & Reasoning Systems`
  10. `9 · Code Trace`
* **Two-Column Split (50% / 50%):**
  * **Left Column (Concept):** Topic introduction, responsive concept chips, formal Definition, AIMA notation box, Teaching Tip.
  * **Right Column (Illustration / Visualizer):** Dynamic visualizer, state-space/truth-table/network graph, interactive parameter controls, step-by-step controls (`Prev`, `Next`, `Run/Pause`, `Reset`), and live execution log.
* **Visual Theme & Palette:** Accent color: **Vibrant Indigo / Violet** (`#6366f1` / `#8b5cf6`), highlighting logical certainty (emerald `#10b981`), falsehood/conflicts (rose `#f43f5e`), and probabilistic density gradients (indigo-to-cyan).
* **Formula Formatting Rule:** Pure HTML/Unicode (`∧`, `∨`, `¬`, `⇒`, `⇔`, `⊨`, `⊢`, `∀`, `∃`, `P(A|B)`, `α`, `θ`) — never raw unprocessed LaTeX syntax.

```
┌─────────────────────────────────────────────────────────────┐
│ NAVBAR: Breadcrumb | Topic 05 Badge | Title | Notes | Demo  │
├─────────────────────────────────────────────────────────────┤
│ TOPIC TABS: Progression | Logic | Resolution | Chaining ... │
├──────────────────────────────┬──────────────────────────────┤
│ CONCEPT COLUMN (50%)         │ ILLUSTRATION COLUMN (50%)    │
│                              │                              │
│ • Concept Chip Selector      │ • Interactive Wumpus Grid /  │
│ • Clear Definition           │   BayesNet Graph Visualizer  │
│ • Formal AIMA Notation       │ • Step Controls & Execution  │
│ • Teaching Tip & Code Intuition│ • Live Value Readout & Logs │
└──────────────────────────────┴──────────────────────────────┘
```

---

## 3. Running Problem Formulations

### Running Example 1: The Wumpus World (Logical Reasoning)
* **Environment:** A 4×4 grid of rooms containing pits (breeze in adjacent rooms), a smelly Wumpus (stench in adjacent rooms), gold (glitters in the same room), and safe start at `[1,1]`.
* **Propositions:** $P_{x,y}$ (Pit at $[x,y]$), $W_{x,y}$ (Wumpus at $[x,y]$), $B_{x,y}$ (Breeze at $[x,y]$), $S_{x,y}$ (Stench at $[x,y]$).
* **Physics Rules:** $B_{1,1} \Leftrightarrow (P_{1,2} \lor P_{2,1})$, $S_{1,1} \Leftrightarrow (W_{1,2} \lor W_{2,1})$.
* **Goal:** Given percepts, prove with 100% certainty that room $[1,2]$ or $[2,1]$ is safe ($KB \models \neg P_{1,2} \land \neg W_{1,2}$).

### Running Example 2: Medical Diagnostic Test (Bayes' Rule)
* **Prior Disease Prevalence:** $P(\text{Disease}) = 0.01$ (1% of population).
* **Test Sensitivity (True Positive Rate):** $P(+ \mid \text{Disease}) = 0.95$.
* **Test False Positive Rate:** $P(+ \mid \neg\text{Disease}) = 0.05$ (Specificity = 0.95).
* **Query:** If a patient tests positive ($+$), what is the actual posterior probability $P(\text{Disease} \mid +)$?
* **Counter-intuitive Teaching Reveal:** Despite a 95% accurate test, $P(\text{Disease} \mid +) \approx 16.1\%$, because false positives from the 99% healthy majority outnumber true positives from the 1% infected group.

### Running Example 3: Burglar Alarm Bayesian Network (Probabilistic Reasoning)
* **Structure:** AIMA Fig 13.2 / 14.2 DAG with 5 Boolean variables:
  * `Burglary` ($B$) $\to$ `Alarm` ($A$)
  * `Earthquake` ($E$) $\to$ `Alarm` ($A$)
  * `Alarm` ($A$) $\to$ `JohnCalls` ($J$)
  * `Alarm` ($A$) $\to$ `MaryCalls` ($M$)
* **Conditional Probability Tables (CPTs):**
  * $P(B) = 0.001$, $P(E) = 0.002$
  * $P(A \mid B, E) = 0.95$, $P(A \mid B, \neg E) = 0.94$, $P(A \mid \neg B, E) = 0.29$, $P(A \mid \neg B, \neg E) = 0.001$
  * $P(J \mid A) = 0.90$, $P(J \mid \neg A) = 0.05$
  * $P(M \mid A) = 0.70$, $P(M \mid \neg A) = 0.01$
* **Queries:**
  * Diagnostic reasoning: $P(B \mid J=\text{true}, M=\text{true})$
  * Explaining away: $P(B \mid A=\text{true}, E=\text{true})$ vs $P(B \mid A=\text{true})$

---

## 4. Topic-by-Topic Concepts & Interactive Visualizers

### 0. Evolution: Search → Games → CSP → Knowledge & Reasoning
*The opening bridge connecting previous modules to knowledge representation and reasoning.*

| Concept | Definition | AIMA Notation | Teaching Tip | Illustration |
|---|---|---|---|---|
| **1 · State Representation Evolution** | How the agent "sees" the world: Atomic (black box) $\to$ Factored (variables & domains) $\to$ Structured (objects, facts, logic, probabilistic relations). | Atomic ($s \in S$) · Factored ($\{X_i = v_i\}$) · Structured ($\text{Sentences}, P(X_1...X_n)$) | Search treats states as indivisible opaque dots; CSP opens the dot into variables; Knowledge represents relationships and reasons over what must be true. | 4-panel comparison: Route graph node $\to$ Minimax board $\to$ Australia CSP $\to$ Wumpus Logic sentence + Bayes CPT. |
| **2 · Certainty vs. Uncertainty** | Logic operates with crisp absolute truth (monotonic entailment); probabilistic models reason over continuous degrees of belief under incomplete or noisy percepts. | Certainty: $KB \models \alpha$ · Uncertainty: $P(\text{Query} \mid \text{Evidence})$ | Use logic when rules are deterministic and closed; use probabilities when worlds are partially observable, noisy, or non-deterministic. | Dual gauge: Binary Switch ($\text{True} / \text{False}$) vs. Probability Density Slider ($0.0 \dots 1.0$). |
| **3 · The Inference Engine Paradigm** | Decoupling knowledge (domain facts/rules) from the inference engine (general-purpose reasoning algorithms). | $\text{Agent} = \text{Knowledge Base (KB)} + \text{Inference Engine}$ | You change the domain by updating the facts, without rewriting the search or reasoning algorithm. | Split architecture diagram: Interchangeable KB slot plugging into standard Resolution / BayesNet engine. |

---

### 1. Knowledge-Based Agents & Propositional Logic

| Concept | Definition | AIMA Notation | Teaching Tip | Illustration |
|---|---|---|---|---|
| **Knowledge-Based Agent** | An agent that maintains an internal Knowledge Base (KB), tells it new percepts, and asks it what action to perform. | $\text{TELL}(KB, \text{sentence})$ · $\text{ASK}(KB, \text{query})$ | A KB agent builds a model of the world by accumulating facts, not just reacting to immediate stimuli. | Wumpus interactive grid: Agent steps onto $[1,1]$, senses Breeze, calls $\text{TELL}(B_{1,1})$, and logs KB growth. |
| **Syntax & Connectives** | Formal rules for constructing valid sentences using symbols and logical operators ($\neg, \land, \lor, \Rightarrow, \Leftrightarrow$). | $P, Q$ · $\neg P$ · $P \land Q$ · $P \lor Q$ · $P \Rightarrow Q$ · $P \Leftrightarrow Q$ | Note: $P \Rightarrow Q$ is false ONLY when $P$ is True and $Q$ is False (vacuously true when $P$ is false). | Interactive Logic Gate / Truth Table builder with toggleable $P, Q$ inputs and live output signals. |
| **Semantics & Models** | A model $m$ is a formal assignment of truth values ($\text{True}/\text{False}$) to all propositional symbols. | $m = \{P: \text{True}, Q: \text{False}\}$ · $M(\alpha) = \{m : m \models \alpha\}$ | A sentence $\alpha$ is true in model $m$ if $m$ satisfies $\alpha$ ($m \models \alpha$). $M(\alpha)$ is the set of all worlds where $\alpha$ is true. | Visual Venn diagram showing the universe of $2^n$ possible worlds and the subset $M(\alpha)$ where $\alpha$ holds. |
| **Logical Entailment ($KB \models \alpha$)** | A sentence $\alpha$ follows logically from KB if $\alpha$ is true in every model where KB is true ($M(KB) \subseteq M(\alpha)$). | $KB \models \alpha \iff M(KB) \subseteq M(\alpha)$ | Entailment means: whenever the KB is true, $\alpha$ is guaranteed to be true. No counterexample exists. | Venn diagram showing $M(KB)$ completely enclosed inside $M(\alpha)$. Clicking shows counterexample if outside. |
| **Logical Equivalences** | Standard equivalence identities used to rewrite and simplify logical expressions (De Morgan, Distributivity, Implication Elimination). | $P \Rightarrow Q \equiv \neg P \lor Q$ · $\neg(P \land Q) \equiv \neg P \lor \neg Q$ | Memorizing $P \Rightarrow Q \equiv \neg P \lor Q$ is the master key to converting logic into Conjunctive Normal Form (CNF). | Interactive expression rewrite tool demonstrating step-by-step equivalence transformations. |

---

### 2. Logical Inference: Model Checking & Resolution

| Concept | Definition | AIMA Notation | Teaching Tip | Illustration |
|---|---|---|---|---|
| **Model Checking (TT-Entails)** | Enumerating all $2^n$ truth table models to verify that every model satisfying KB also satisfies the query $\alpha$. | $\text{TT-ENTAILS?}(KB, \alpha)$ · Time $O(2^n)$, Space $O(n)$ | Simple and sound, but exponential in the number of symbols $n$. | Interactive Truth-Table generator: rows where $KB=\text{True}$ highlighted in green; verifies $\alpha=\text{True}$. |
| **Conjunctive Normal Form (CNF)** | A conjunction of disjunctions of literals (a conjunction of clauses, e.g., $(A \lor B) \land (\neg B \lor C)$). | $\bigwedge_{i} \bigvee_{j} L_{i,j}$ | Every propositional logic sentence can be converted to CNF in 4 steps: eliminate $\Leftrightarrow$, eliminate $\Rightarrow$, push $\neg$ inwards, distribute $\lor$ over $\land$. | 4-step CNF pipeline interactive converter with syntax tree breakdown. |
| **The Resolution Rule** | A sound and complete inference rule: resolving $(A \lor B)$ with $(\neg B \lor C)$ yields the resolvent $(A \lor C)$. | $\frac{l_1 \lor \dots \lor l_k, \quad m_1 \lor \dots \lor m_n}{l_1 \lor \dots \lor l_{i-1} \lor l_{i+1} \dots \lor l_k \lor m_1 \dots \lor m_{j-1} \lor m_{j+1} \dots \lor m_n}$ where $l_i = \neg m_j$ | Resolving complementary literals $P$ and $\neg P$ cancels them out; resolving $P$ and $\neg P$ alone yields the empty clause $\square$ (Contradiction). | Resolution ladder visualizer: dragging complementary clauses together to produce and animate the new resolvent. |
| **Proof by Refutation (PL-Resolution)** | To prove $KB \models \alpha$, add $\neg\alpha$ to $KB$ in CNF and repeatedly resolve clauses until deriving the empty clause $\square$ (inconsistency). | $KB \models \alpha \iff (KB \land \neg\alpha) \text{ is unsatisfiable}$ | Direct proofs can branch infinitely; refutation searches for a single contradiction ($\text{False} \equiv \square$). | Step-by-step resolution refutation graph proving $\neg P_{1,2}$ in Wumpus World; ends with flashing contradiction box $\square$. |
| **Soundness & Completeness** | An inference procedure is **sound** if it derives only entailed sentences (no false proofs); **complete** if it can derive any entailed sentence. | Sound: $KB \vdash \alpha \implies KB \models \alpha$ · Complete: $KB \models \alpha \implies KB \vdash \alpha$ | Soundness = "Truth and nothing but the truth". Completeness = "The whole truth". | Visual checklist comparing Truth Table, Resolution, and Random Guessing on Soundness and Completeness. |

---

### 3. Horn Clauses, Forward & Backward Chaining

| Concept | Definition | AIMA Notation | Teaching Tip | Illustration |
|---|---|---|---|---|
| **Definite & Horn Clauses** | A Definite Clause is a disjunction of literals with **exactly one** positive literal ($A \land B \Rightarrow C \equiv \neg A \lor \neg B \lor C$). A Horn Clause has at most one positive literal. | Premise $\Rightarrow$ Conclusion · $(P_1 \land \dots \land P_k) \Rightarrow Q$ | Real-world rules ("If symptom A and symptom B, then condition C") naturally form Horn clauses. | Clause classifier widget: shows clauses and badges them as Definite, Goal/Negative, or Non-Horn. |
| **Forward Chaining (PL-FC-Entails)** | Data-driven inference: starts with known atomic facts, fires rules whose premises are satisfied, adds conclusions to facts, and repeats until the query is generated. | $\text{count}[c] = \text{number of un-inferred premises}$ · Time $O(N)$ linear! | Forward chaining is linear time in the size of the KB! Ideal for monitoring, reactive control, and event processing. | Interactive AND-OR graph visualizer: firing premise nodes light up green; activates rule edges until reaching goal node $Q$. |
| **Backward Chaining** | Goal-driven inference: starts with the query $Q$, finds rules that conclude $Q$, and recursively tries to prove their premises. | $\text{Prove}(Q) \to \text{Prove}(P_1) \land \dots \land \text{Prove}(P_k)$ | Backward chaining only touches facts and rules relevant to the query, avoiding unnecessary deductions. | Goal-tree decomposition stepper: expands $Q$ into subgoals, traces backward into base facts with call stack. |
| **Forward vs. Backward Trade-off** | Forward chaining computes all consequences up front (eager); Backward chaining works on demand for a specific target query (lazy). | Forward: Data $\to$ Conclusions · Backward: Goal $\to$ Subgoals $\to$ Facts | Use Forward Chaining when new data arrives continuously; use Backward Chaining when there are many rules but a specific single question. | Side-by-side comparison animation on a 15-rule medical diagnostic KB. |

---

### 4. First-Order Logic & Knowledge Representation

| Concept | Definition | AIMA Notation | Teaching Tip | Illustration |
|---|---|---|---|---|
| **Propositional Limitations vs. FOL Expressiveness** | Propositional logic cannot generalize over objects without massive duplicate rules (e.g. need 64 rules for Wumpus stenches). FOL adds Objects, Relations/Predicates, Functions, and Quantifiers. | $\text{Wumpus World in FOL}: \forall x,y \, \text{Breeze}(x,y) \Leftrightarrow \exists a,b \, \text{Adjacent}(x,y,a,b) \land \text{Pit}(a,b)$ | Propositional logic sees the world in atomic facts; FOL sees objects and their relationships. | Side-by-side: 64 Propositional rules vs. 1 concise First-Order Logic universal rule. |
| **Universal ($\forall$) & Existential ($\exists$) Quantifiers** | $\forall x \, P(x)$ asserts $P$ is true for ALL objects; $\exists x \, P(x)$ asserts $P$ is true for AT LEAST ONE object. | $\forall x \, \text{King}(x) \Rightarrow \text{Person}(x)$ · $\exists x \, \text{Crown}(x) \land \text{OnHead}(x, \text{John})$ | Golden rule: $\forall$ usually pairs with $\Rightarrow$ (implication); $\exists$ usually pairs with $\land$ (conjunction). | Interactive domain of objects (King, Crown, Person, Dog) with quantifier statement evaluator. |
| **Unification & Generalized Modus Ponens** | Finding a substitution $\theta = \{v_1/t_1, v_2/t_2\}$ that makes two different logical expressions syntactically identical. | $\text{UNIFY}(P(x, \text{John}), P(\text{Mary}, y)) = \{x/\text{Mary}, y/\text{John}\}$ | Unification allows generic rules to instantiate on specific ground facts in one step. | Step-by-step term matcher with variable substitution slots. |

---

### 5. Quantifying Uncertainty & Bayes' Rule

| Concept | Definition | AIMA Notation | Teaching Tip | Illustration |
|---|---|---|---|---|
| **Uncertainty & Degrees of Belief** | In real worlds, partial observability, non-determinism, and noisy sensors make absolute logic impossible. Probabilities quantify degrees of belief. | $P(A) \in [0, 1]$ · $P(\text{True}) = 1, P(\text{False}) = 0$ | Probability represents an agent's state of knowledge given evidence, not necessarily physical randomness. | Slider comparing logical truth (0 or 1) with continuous belief distributions. |
| **Full Joint Probability Distribution** | Complete specification of probability for every possible combination of values across all random variables. | $P(X_1 = x_1, \dots, X_n = x_n)$ · $\sum_{\mathbf{x}} P(\mathbf{x}) = 1$ | The full joint answers any probabilistic query by marginalization ($\sum$), but requires $2^n - 1$ parameters (intractable for large $n$). | Interactive 3D/2D joint distribution table (Toothache, Catch, Cavity); highlight sum over marginal cells. |
| **Conditional Probability & Product Rule** | The probability of event $A$ given that event $B$ is known to have occurred: $P(A \mid B) = \frac{P(A \land B)}{P(B)}$. | $P(A \land B) = P(A \mid B) P(B) = P(B \mid A) P(A)$ | Conditioning restricts the sample space to only the worlds where $B$ is true, re-normalizing by $P(B)$. | Fraction bar & Venn diagram: shrinking total sample space to $B$ area and measuring $A \cap B$ portion. |
| **Bayes' Rule & Diagnostic Reasoning** | Derives posterior probability $P(\text{Cause} \mid \text{Effect})$ from causal likelihood $P(\text{Effect} \mid \text{Cause})$, prior $P(\text{Cause})$, and evidence $P(\text{Effect})$. | $P(Y \mid X) = \frac{P(X \mid Y) P(Y)}{P(X)} = \alpha P(X \mid Y) P(Y)$ | Doctors know causal probabilities $P(\text{Symptom} \mid \text{Disease})$ from lab studies; Bayes' rule converts them to diagnostic probabilities $P(\text{Disease} \mid \text{Symptom})$. | Interactive Medical Test Calculator: adjust Prior $P(D)$, Sensitivity $P(+|D)$, False Positive rate $P(+|\neg D) \to$ instant posterior $P(D|+)$. |
| **Normalization Constant ($\alpha$)** | Computing relative weights for all query values and dividing by their sum so the resulting distribution sums to 1. | $\mathbf{P}(Y \mid X) = \alpha \langle P(X \mid Y=y_1)P(y_1), \dots \rangle$ where $\alpha = \frac{1}{\sum_i P(X \mid y_i) P(y_i)}$ | Normalization avoids calculating hard denominator $P(X)$ directly. | Interactive probability balance beam showing raw unnormalized products normalizing to 1.0. |

---

### 6. Bayesian Networks & Conditional Independence

| Concept | Definition | AIMA Notation | Teaching Tip | Illustration |
|---|---|---|---|---|
| **Bayesian Network Syntax & Semantics** | A Directed Acyclic Graph (DAG) where nodes represent random variables and directed edges represent direct probabilistic influence. | $\text{DAG } G = (V, E)$ · $\text{CPT for each } X_i: P(X_i \mid \text{Parents}(X_i))$ | A Bayesian Network is a compact factored representation of the full joint distribution! | Interactive Burglar Alarm DAG: clicking any node opens its Conditional Probability Table (CPT). |
| **Compact Joint Factorization** | The joint distribution is the product of the conditional distributions of each node given its parents. | $P(x_1, \dots, x_n) = \prod_{i=1}^n P(x_i \mid \text{Parents}(X_i))$ | While the full joint needs $2^n - 1$ numbers, a sparse BN needs only $O(n \cdot 2^k)$ where $k$ is the maximum parent count! | Parameter counter: For $n=30, k=5$, full joint needs $10^9$ numbers; BN needs only $960$. |
| **Conditional Independence** | Two variables $X$ and $Y$ are conditionally independent given $Z$ if $P(X \mid Y, Z) = P(X \mid Z)$. | $(X \perp\!\!\!\perp Y \mid Z) \iff P(X, Y \mid Z) = P(X \mid Z) P(Y \mid Z)$ | Once you know the state of the parent (e.g. Alarm status), John's call gives no new information about Mary's call. | Network flow highlight: showing independent paths blocked by observed evidence node $Z$. |
| **Markov Blanket & D-Separation** | A node is conditionally independent of all other nodes in the network given its **Markov Blanket**: its parents, its children, and its children's other parents. | $\text{MB}(X) = \text{Parents}(X) \cup \text{Children}(X) \cup \text{Coparents}(X)$ | The Markov Blanket forms a complete protective shield of evidence around a variable. | Interactive toggle: select any node on the DAG; instantly highlights its exact Markov Blanket in gold. |
| **Causal, Diagnostic & Explaining-Away Reasoning** | Top-down (cause to effect), Bottom-up (effect to cause), and Inter-causal interaction (two causes competing to explain one symptom). | $\text{Diagnostic}: P(B \mid A)$ · $\text{Causal}: P(J \mid B)$ · $\text{Explaining-Away}: P(B \mid A, E) < P(B \mid A)$ | Explaining away: If the alarm rang and you learn there was an earthquake, the probability of a burglary drops! | 3-way toggle showing belief adjustments across the network when different evidence nodes are set. |

---

### 7. Probabilistic Inference: Exact & Sampling

| Concept | Definition | AIMA Notation | Teaching Tip | Illustration |
|---|---|---|---|---|
| **Exact Inference by Enumeration** | Summing terms from the factored joint distribution over all hidden unobserved variables. | $\mathbf{P}(X \mid \mathbf{e}) = \alpha \sum_{\mathbf{y}} P(X, \mathbf{e}, \mathbf{y}) = \alpha \sum_{\mathbf{y}} \prod_i P(v_i \mid \text{parents})$ | Systematic and exact, but worst-case $O(2^n)$ time on general networks. | Interactive calculation tree showing recursive expansion and caching of common subterms. |
| **Variable Elimination (VE)** | Dynamic programming algorithm that sums out hidden variables one by one, storing intermediate sums as factors to avoid redundant calculations. | $\mathbf{f}_1 \times \mathbf{f}_2$ (Pointwise product) · $\sum_Y \mathbf{f}$ (Summing out) | Variable elimination is to Bayesian inference what dynamic programming is to shortest-path search. | Step-by-step factor creation and elimination visualizer for $P(B \mid j, m)$. |
| **Prior Sampling & Rejection Sampling** | Generating random samples from the joint distribution in topological order; rejection sampling rejects samples that don't match the evidence $\mathbf{e}$. | $\hat{P}(X=x \mid \mathbf{e}) = \frac{N(X=x, \mathbf{e})}{N(\mathbf{e})}$ | Easy to implement without computing complex formulas, but wastes time rejecting samples if evidence $\mathbf{e}$ is rare. | Live particle simulation: dots drop through the DAG; matching samples accumulate in histogram, mismatches discarded into waste bin. |
| **Likelihood Weighting** | Fixes evidence variables to their observed values and weights each generated sample by the likelihood of the evidence given parents. | $w = \prod_{j \in \text{Evidence}} P(e_j \mid \text{parents}(E_j))$ · $\hat{P}(X=x \mid \mathbf{e}) = \frac{\sum w_i}{\sum w}$ | Never rejects a sample! Every simulated rollout contributes to the posterior estimate. | Multi-threaded sample generator with live weight meter and converging posterior line chart. |
| **Markov Chain Monte Carlo (MCMC / Gibbs Sampling)** | Generates a sequence of samples by repeatedly updating one variable at a time conditioned on the current values of its Markov Blanket. | $P(X_i = x_i \mid \text{mb}(X_i)) = \alpha P(x_i \mid \text{parents}(X_i)) \prod_{Y_j \in \text{Children}} P(y_j \mid \text{parents}(Y_j))$ | Samples wander through the state space; state transitions depend only on the immediate Markov Blanket. | Random walk visualization on state lattice with convergence diagnostic display. |

---

### 8. Evaluating Knowledge & Reasoning Systems

Comprehensive comparison of logical theorem provers vs. exact and approximate probabilistic inference engines:

| Dimension | Truth-Table Checking | PL-Resolution Refutation | Horn Forward Chaining | Exact Bayes (VE) | Likelihood Weighting | Gibbs Sampling (MCMC) |
|---|---|---|---|---|---|---|
| **Representation** | Propositional logic | Propositional / FOL CNF | Horn / Definite clauses | Bayesian Network DAG | Bayesian Network DAG | Bayesian Network DAG |
| **Certainty Model** | Strict Boolean ($0/1$) | Strict Boolean ($0/1$) | Strict Boolean ($0/1$) | Exact probabilities | Estimated probabilities | Estimated probabilities |
| **Time Complexity** | $O(2^n)$ worst-case | Exponential in worst case | $O(N)$ **Linear in KB size!** | $O(n \cdot d^{w+1})$ ($w$: tree width) | $O(N_{\text{samples}} \cdot n)$ | $O(N_{\text{samples}} \cdot n)$ |
| **Space Complexity** | $O(n)$ | Exponential (retained clauses) | $O(N)$ linear | $O(d^{w+1})$ factor table | $O(n)$ sample storage | $O(n)$ current state |
| **Sound & Complete** | Sound & Complete | Sound & Refutation Complete | Sound & Complete (for Horn) | Exact & Sound | Consistent (converges as $N \to \infty$) | Consistent (converges as $N \to \infty$) |
| **Handling Incomplete Data** | Fails or yields multiple models | Fails or yields multiple models | Incomplete if non-Horn | Exact conditional marginals | Robust to partial observations | Robust to partial observations |
| **Best Application** | Small propositional proofs ($n \le 15$) | Theorem proving, automated verification | Real-time monitoring, expert systems | Polytrees, sparse diagnostic graphs | Dense networks with common evidence | Complex networks, continuous distributions |

---

### 9. Code Trace Specification (`knowledge.html#code`)

Interactive line-by-line stepping through clean, runnable Python code with real-time state visualization:

```
┌──────────────────────────────────────┬──────────────────────────────────────┐
│ PYTHON SOURCE TRACE (Left 50%)       │ RUNTIME STATE & VISUALIZER (Right 50%)│
│                                      │                                      │
│ • Line numbers with execution arrow  │ • Active call stack / queue / factor │
│ • Highlighted active expressions     │ • State inspect tables & Venn / DAG  │
│ • Step commentary & variable watch   │ • Step k of N | Prev | Next | Run/Pause│
└──────────────────────────────────────┴──────────────────────────────────────┘
```

#### Presets Traced

1. **`trace_tt_entails` (`python_sandbox/08_Logic_Reasoning.py`):**
   * **Problem:** Wumpus 2-room KB: $KB = (\neg P_{1,1}) \land (B_{1,1} \Leftrightarrow (P_{1,2} \lor P_{2,1})) \land (\neg B_{1,1})$; Query $\alpha = \neg P_{1,2}$.
   * **State Display:** Live model table with columns $(P_{1,1}, P_{1,2}, P_{2,1}, B_{1,1}, KB, \alpha)$; checks recursive evaluation on $2^4 = 16$ models; green highlight on models where $KB = \text{True}$.
2. **`trace_pl_resolution` (`python_sandbox/08_Logic_Reasoning.py`):**
   * **Problem:** Proving $KB \land \neg\alpha \vdash \square$ for $(A \lor B) \land (\neg B \lor C) \land (\neg C) \land (\neg A)$.
   * **State Display:** Active clause pool, chosen pair $(C_i, C_j)$, extracted complementary literals, resolvent clause, new clause check; derivation of empty clause $\square$.
3. **`trace_pl_fc_entails` (`python_sandbox/08_Logic_Reasoning.py`):**
   * **Problem:** Horn clause medical diagnostic KB proving $\text{ConditionX}$ from facts $\text{SymptomA}, \text{SymptomB}$.
   * **State Display:** $\text{count}$ table per rule, $\text{inferred}$ boolean dictionary, agenda FIFO queue, active rule premise decrement.
4. **`trace_bayes_enumeration` (`python_sandbox/09_Bayesian_Reasoning.py`):**
   * **Problem:** Burglar Alarm query $\mathbf{P}(B \mid j=\text{true}, m=\text{true})$.
   * **State Display:** Recursive evaluation tree over hidden variables $E$ and $A$, product computation $P(B)P(E)P(A|B,E)P(j|A)P(m|A)$, normalization constant $\alpha$ calculation.
5. **`trace_likelihood_weighting` (`python_sandbox/09_Bayesian_Reasoning.py`):**
   * **Problem:** 20-sample run on Alarm network with evidence $J=\text{true}, M=\text{true}$.
   * **State Display:** Sample vector generation $[B, E, A, J, M]$, cumulative weight $w$, weighted histogram bins for $B=\text{True}$ vs $B=\text{False}$.

---

## 5. Python Sandbox Scripts

### File 1: `python_sandbox/08_Logic_Reasoning.py`
Standalone, zero-dependency Python script runnable directly with `python 08_Logic_Reasoning.py`:
* `Expr` and `expr()` parsing logic expressions (conjunction `&`, disjunction `|`, negation `~`, implication `>>`, biconditional `<=>`).
* `tt_entails(kb, alpha)` — Recursive truth-table model checker.
* `to_cnf(s)` & `pl_resolution(kb, alpha)` — Refutation resolution theorem prover.
* `pl_fc_entails(horn_kb, query)` — Linear-time Forward Chaining algorithm.
* **Built-in Test Cases:**
  * Wumpus World safety deduction ($\neg P_{1,2}$ and $\neg W_{1,2}$).
  * Russell & Norvig Liars & Truth-tellers puzzle.
  * Horn clause rule-chain verification.

### File 2: `python_sandbox/09_Bayesian_Reasoning.py`
Standalone, zero-dependency Python script runnable directly with `python 09_Bayesian_Reasoning.py`:
* `BayesNode` and `BayesNet` classes representing DAG and conditional probability distributions.
* `enumeration_ask(query, evidence, bn)` — Exact inference by recursive enumeration.
* `variable_elimination(query, evidence, bn)` — Factor multiplication and variable marginalization.
* `prior_sample(bn)`, `rejection_sampling(query, evidence, bn, N)`, and `likelihood_weighting(query, evidence, bn, N)`.
* **Built-in Test Cases:**
  * Complete AIMA Burglar Alarm network benchmarks.
  * Medical Diagnostic test sensitivity / specificity comparison.
  * Wet Grass (Sprinkler / Rain) conditional independence test.

---

## 6. Reading Notes & Practice Exercises (`topic05_reading.html`)

Textbook-style reading notes structured into 6 comprehensive sections, followed by fully worked-out analytical practice problems:

### Practice Problems Included

1. **Wumpus Propositional Formulation & Models:**
   * Given agent at $[1,1]$ with no breeze, moving to $[2,1]$ and sensing a breeze: write formal CNF clauses for $B_{2,1} \Leftrightarrow (P_{2,2} \lor P_{3,1} \lor P_{1,1})$; calculate total possible models ($2^4$) and prove $P_{1,2} = \text{False}$ and $(P_{2,2} \lor P_{3,1}) = \text{True}$.
2. **CNF Conversion & Resolution Refutation Step-by-Step:**
   * Convert $(A \lor B) \Rightarrow (C \land D)$ to CNF; prove $C$ using PL-Resolution with full refutation tree.
3. **Horn Clause Forward Chaining Trace:**
   * Given facts $A, B$ and rules $A \land B \Rightarrow C$, $C \land D \Rightarrow E$, $B \Rightarrow D$: trace $\text{count}$, agenda, and derivation order for goal $E$.
4. **Bayes' Rule Rare Disease Calculation:**
   * Prior $P(D)=0.0005$, Sensitivity $P(+|D)=0.99$, False positive $P(+|\neg D)=0.01$. Compute exact posterior $P(D|+)$ showing normalization factor $\alpha$.
5. **Exact Inference by Enumeration on Burglar Alarm:**
   * Calculate exact numerical value of $P(B=\text{true} \mid J=\text{true}, M=\text{true})$ by summing over hidden variables $E \in \{t, f\}$ and $A \in \{t, f\}$.
6. **Likelihood Weighting Simulation Step:**
   * Perform manual likelihood weighting calculation for 2 samples on the Burglar Alarm network with evidence $J=\text{true}, M=\text{true}$; compute individual sample weights $w_1, w_2$ and normalized posterior estimate.

---

## 7. Interactive Playground Specifications (`playground.html#view-knowledge`)

Four dedicated interactive lab sub-views:

1. **Wumpus World Logic Explorer:**
   * 4×4 grid with toggleable pits, wumpus, and gold.
   * Step agent through rooms; watch real-time $\text{TELL}$ assertions and live deduction of Safe ($\checkmark$), Danger ($\times$), and Unknown ($?$) rooms via propositional resolution.
2. **Propositional Logic & Truth-Table Studio:**
   * Custom formula input with syntax validation ($P \land Q \Rightarrow R$).
   * Interactive truth-table generator, model counter, and CNF step-by-step visual transformer.
3. **Bayesian Network Interactive Workbench:**
   * Preloaded networks: *Burglar Alarm*, *Wet Grass / Sprinkler*, *Medical Diagnosis*, *Custom 5-Node DAG*.
   * Click nodes to set evidence ($\text{True}/\text{False}$); watch instant real-time posterior probability bar meters update across all nodes.
4. **Monte Carlo Sampling Visualizer:**
   * Side-by-side comparison of Rejection Sampling vs. Likelihood Weighting vs. Gibbs Sampling.
   * Visual particle drop animation; sample efficiency meter (% of samples accepted); convergence curve tracking estimated posterior vs exact ground truth as $N \to 10,000$.

---

## 8. Academic & Textbook References

### Primary Textbooks & Standard Curricula
* **AIMA (4th Edition):**
  * Chapter 7: *Logical Agents* (§7.1 Knowledge-Based Agents, §7.3–7.5 Propositional Logic, Entailment, Theorem Proving, §7.6–7.7 Forward/Backward Chaining & DPLL).
  * Chapter 8: *First-Order Logic* (§8.1–8.3 Syntax, Semantics, and Knowledge Engineering).
  * Chapter 9: *Inference in First-Order Logic* (§9.1–9.4 Unification, Generalized Modus Ponens, Forward/Backward Chaining, Resolution).
  * Chapter 12: *Quantifying Uncertainty* (§12.1–12.5 Probability Axioms, Joint Distributions, Bayes' Rule).
  * Chapter 13: *Probabilistic Reasoning* (§13.1–13.4 Bayesian Networks, Semantics, Exact Inference, Approximate Inference via Sampling).
* **AIMA Python Reference Code:**
  * Logic algorithms: [`reference/aima-python/aima/logic.py`](file:///Volumes/Data/MLAI_Projects/MLAI401/reference/aima-python/aima/logic.py) (`KB`, `tt_entails`, `pl_resolution`, `pl_fc_entails`, `dpll_satisfiable`, `to_cnf`, `unify`).
  * Probability & BayesNet: [`reference/aima-python/aima/probability.py`](file:///Volumes/Data/MLAI_Projects/MLAI401/reference/aima-python/aima/probability.py) (`BayesNet`, `BayesNode`, `enumeration_ask`, `elimination_ask`, `rejection_sampling`, `likelihood_weighting`, `gibbs_ask`).

### Foundational Papers & Historical Milestones
* **Logic & Automated Reasoning:**
  * Davis, M., & Putnam, H. (1960). *A Computing Procedure for Quantification Theory*. Journal of the ACM, 7(3), 201–215. (DPLL algorithm).
  * Robinson, J. A. (1965). *A Machine-Oriented Logic Based on the Resolution Principle*. Journal of the ACM, 12(1), 23–41. (The foundational Resolution Rule).
* **Probabilistic Reasoning & Bayesian Networks:**
  * Bayes, T. (1763). *An Essay towards solving a Problem in the Doctrine of Chances*. Philosophical Transactions of the Royal Society of London.
  * Pearl, J. (1988). *Probabilistic Reasoning in Intelligent Systems: Networks of Plausible Inference*. Morgan Kaufmann. (Turing Award-winning formulation of Bayesian Networks and Belief Propagation).
  * Fung, R. M., & Chang, K. C. (1989). *Weighing and Integrating Evidence for Stochastic Simulation in Bayesian Belief Networks*. (Likelihood Weighting algorithm).
