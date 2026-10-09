# MLAI401 — Learning & Decision Making (Topic 06) Specification

## 1. Goal & Architecture Overview

Create the comprehensive specification for **Topic 06: Learning & Decision Making**, covering how artificial intelligence agents transition from hand-engineered rules and static heuristics to **learning patterns from data** (Supervised and Unsupervised Machine Learning) and **learning optimal sequential decision policies through environmental interaction and reward feedback** (Markov Decision Processes and Reinforcement Learning).

Content reference:
* *Artificial Intelligence: A Modern Approach* (AIMA, 4th ed.), **Part V — Machine Learning** (Chapters 19, 20) and **Part VI — Communicating, Perceiving, and Acting** (Chapter 21: Reinforcement Learning) & **Part IV** (Chapter 17: Making Complex Decisions).
* Sutton & Barto, *Reinforcement Learning: An Introduction* (2nd ed., MIT Press, 2018), **Part I — Tabular Solution Methods** (Chapters 3, 4, 6).

### Target Deliverables

| File | Role |
|---|---|
| `learning.html` | Single-viewport interactive lecture page (concept column + visual illustration column) |
| `demos/learning_demo/ml_engine.js` | Pure zero-dependency Machine Learning engine: Decision Trees, Logistic Regression, Gradient Descent, K-Means (`window.MLEngine`) |
| `demos/learning_demo/rl_engine.js` | Pure zero-dependency Reinforcement Learning engine: MDP, Value Iteration, Policy Iteration, Q-Learning, SARSA (`window.RLEngine`) |
| `demos/learning_demo/ui.js` | Lecture page controller — topic tabs, concept chips, interactive visualizers, step controllers |
| `demos/learning_demo/learning_lab.js` | Playground controller for `playground.html#view-learning` (Classification & K-Means) and `playground.html#view-rl` (Grid World RL) |
| `python_sandbox/10_Machine_Learning.py` | Standalone Python implementation of Decision Tree (Entropy/InfoGain), Logistic Regression with Gradient Descent, K-Means Clustering, and Evaluation Metrics |
| `python_sandbox/11_Reinforcement_Learning.py` | Standalone Python implementation of GridWorld MDP, Bellman Equations, Value Iteration, Policy Iteration, Tabular Q-Learning, and SARSA |
| `python_sandbox/learning.py` | Clean reference classes (`Dataset`, `DecisionTree`, `LogisticRegression`, `KMeans`, `MDP`, `GridWorld`, `QLearner`) used across demos |
| `topic06_reading.html` | Comprehensive textbook-style reading notes + step-by-step analytical practice problems with full solutions |
| `curriculum.html` | Updated Topic 06 curriculum card linking to lecture, reading notes, and interactive playground labs |

---

## 2. Design & Layout Specification

Follows the unified MLAI401 design system established in Topics 01–05:

* **Viewport Strategy:** Single-viewport, concept-first layout without page scroll on standard 1080p desktop displays.
* **Top Navigation Bar:** Breadcrumb (`Curriculum > Topic 06`), topic badge (`Topic 06`), title, and action buttons (`Reading Notes`, `Interactive Demo`).
* **Topic Selector Tabs:**
  1. `0 · Progression: Knowledge & Logic → Learning & Decisions`
  2. `1 · Supervised Learning & Decision Trees`
  3. `2 · Linear Models & Gradient Optimization`
  4. `3 · Neural Representation & Non-Linearity`
  5. `4 · Generalization, Regularization & Evaluation`
  6. `5 · Unsupervised Learning & Clustering`
  7. `6 · Sequential Decisions & Markov Decision Processes`
  8. `7 · Dynamic Programming: Value & Policy Iteration`
  9. `8 · Model-Free Reinforcement Learning: Q-Learning & SARSA`
  10. `9 · Evaluating Learning & Decision Systems`
  11. `10 · Code Trace`
* **Two-Column Split (50% / 50%):**
  * **Left Column (Concept):** Topic introduction, responsive concept chips, formal Definition, AIMA / Sutton-Barto notation box, Teaching Tip.
  * **Right Column (Illustration / Visualizer):** Dynamic visualizer, 2D decision boundary scatter plot, Voronoi clustering canvas, MDP grid value heatmap, Q-table directional policy display, interactive parameter controls, step-by-step controls (`Prev`, `Next`, `Run/Pause`, `Reset`), and live execution log.
* **Visual Theme & Palette:** Accent colors: **Vibrant Emerald & Amber** (`#10b981` / `#f59e0b`), highlighting decision boundaries (`#3b82f6` cobalt), positive rewards / goal states (`#10b981` emerald), negative penalties / traps (`#f43f5e` rose), cluster centroids (`#8b5cf6` violet), and value iteration heatmaps (gradient from `#312e81` indigo to `#f59e0b` amber).
* **Formula Formatting Rule:** Pure HTML/Unicode (`θ`, `α`, `γ`, `w · x + b`, `σ(z)`, `L(w)`, `H(S)`, `IG(S, A)`, `V(s)`, `Q(s, a)`, `π(s)`, `max_a`, `𝔼[...]`, `δ = r + γ max Q - Q`) — never raw unprocessed LaTeX syntax.

```
┌─────────────────────────────────────────────────────────────┐
│ NAVBAR: Breadcrumb | Topic 06 Badge | Title | Notes | Demo  │
├─────────────────────────────────────────────────────────────┤
│ TOPIC TABS: Progression | Trees | Linear | Neural | MDP ... │
├──────────────────────────────┬──────────────────────────────┤
│ CONCEPT COLUMN (50%)         │ ILLUSTRATION COLUMN (50%)    │
│                              │                              │
│ • Concept Chip Selector      │ • Interactive 2D Boundary /  │
│ • Clear Definition           │   K-Means / MDP Grid Visualizer│
│ • Formal AIMA Notation       │ • Step Controls & Execution  │
│ • Teaching Tip & Code Intuition│ • Live Value Readout & Logs │
└──────────────────────────────┴──────────────────────────────┘
```

---

## 3. Running Problem Formulations

### Running Example 1: Loan Risk & Medical Diagnosis (Supervised Classification)
* **Dataset:** $N$ patient/applicant examples with feature vector $\mathbf{x} = \langle x_1, x_2 \rangle$ (e.g., Age, Blood Glucose / Credit Score, Debt-to-Income Ratio) and discrete binary label $y \in \{0, 1\}$ (Healthy vs. At-Risk / Default vs. Repay).
* **Goal:** Learn a hypothesis function $h_\mathbf{w}(\mathbf{x}) \approx y$ that generalizes accurately to unseen test instances.
* **Demonstrations:**
  * Decision Tree recursive axis-aligned splits maximizing Information Gain ($IG = H(S) - \sum \frac{|S_v|}{|S|} H(S_v)$).
  * Logistic Regression linear separator $P(y=1 \mid \mathbf{x}) = \sigma(\mathbf{w}^T \mathbf{x} + b)$ optimized via Cross-Entropy Loss and Gradient Descent.
  * Overfitting with high-degree polynomials and stabilization via L2 Regularization ($w^2$).

### Running Example 2: Spatial Customer Clustering (Unsupervised Learning)
* **Dataset:** Unlabeled 2D spatial coordinate points $\mathbf{x}_i \in \mathbb{R}^2$ exhibiting natural latent grouping.
* **Goal:** Partition $N$ points into $K$ disjoint clusters $C_1, \dots, C_K$ minimizing total intra-cluster variance (Within-Cluster Sum of Squares, WCSS).
* **Demonstrations:**
  * K-Means alternating optimization: (1) Assignment Step (assign points to nearest centroid $\boldsymbol{\mu}_k$) $\to$ (2) Update Step (recalculate $\boldsymbol{\mu}_k = \frac{1}{|C_k|} \sum_{\mathbf{x} \in C_k} \mathbf{x}$).
  * Interactive Voronoi tessellation diagram and the Elbow Method for selecting $K$.

### Running Example 3: The Classic 4×3 Grid World & Cliff Walking (Reinforcement Learning)
* **Environment (AIMA Fig 17.1 & Sutton-Barto):**
  * Grid of 12 cells $(x, y)$ with start at $(1, 1)$, an impassable wall at $(2, 2)$, a terminal goal state $+1.0$ at $(4, 3)$, and a terminal hazard trap $-1.0$ at $(4, 2)$.
  * **Living Step Reward:** $R(s) = -0.04$ for every non-terminal transition (encourages shortest paths).
  * **Transition Model (Stochastic Dynamics):** Actions $\{ \text{Up}, \text{Down}, \text{Left}, \text{Right} \}$. Action succeeds with probability $0.8$; veers $90^\circ$ left with probability $0.1$; veers $90^\circ$ right with probability $0.1$. Bumping into grid boundaries or wall leaves the agent in the same cell.
  * **Discount Factor:** $\gamma = 0.99$ (or adjustable $0.0 \dots 1.0$).
* **Demonstrations:**
  * **Model-Based Planning (Known MDP):** Value Iteration computing $V^*(s) = \max_a \sum_{s'} P(s' \mid s, a) [R(s, a, s') + \gamma V^*(s')]$ and Policy Iteration.
  * **Model-Free Learning (Unknown MDP):** Q-Learning agent discovering the optimal policy $\pi^*(s) = \arg\max_a Q(s, a)$ from scratch using Temporal Difference error $\delta = r + \gamma \max_{a'} Q(s', a') - Q(s, a)$ under $\epsilon$-greedy exploration.

---

## 4. Topic-by-Topic Concepts & Interactive Visualizers

### 0. Progression: Knowledge & Logic → Learning & Decisions
*The opening bridge connecting previous symbolic reasoning modules to empirical learning and sequential decision-making.*

| Concept | Definition | AIMA / Sutton-Barto Notation | Teaching Tip | Illustration |
|---|---|---|---|---|
| **1 · Hand-Crafted Rules vs. Empirical Learning** | In Topics 01–05, knowledge bases and heuristics were manually engineered by humans. In Machine Learning, the agent extracts rules, distributions, and decision boundaries directly from data. | Handcrafted: $KB \models \alpha$ · Learning: $h \gets \text{LEARN}(\text{Data})$ | When the world is too complex to write rules for (e.g. computer vision, speech, fraud), we let data train the weights. | Dual panel: Hand-coded `if-else` spaghetti code vs. compact parameter vector $\mathbf{w}$ trained on 10,000 examples. |
| **2 · The Three Paradigms of Machine Learning** | Supervised (labeled input-output pairs $\langle \mathbf{x}, y \rangle$), Unsupervised (unlabeled structure discovery on $\mathbf{x}$), and Reinforcement Learning (learning through trial, error, and scalar rewards $r$). | Supervised: $\mathbf{x} \to y$ · Unsupervised: $P(\mathbf{x}) \text{ or } C_k$ · RL: $s \xrightarrow{a} r, s'$ | Supervised = Teacher gives answers; Unsupervised = Detective finds patterns; RL = Gamer learns to maximize score. | 3-way animated card showing labeled flashcards, clustering galaxy of stars, and Grid World agent navigating hazards. |
| **3 · Static Prediction vs. Sequential Decision Making** | Supervised learning assumes independent, identically distributed (i.i.d.) inputs with immediate feedback. RL deals with sequential states where current actions influence future states and delayed rewards. | Static: $\hat{y} = h(\mathbf{x})$ · Sequential: $a_t \sim \pi(s_t) \implies s_{t+1}, r_{t+1}$ | A classifier tells you if a photo has a cat; an RL agent decides how to pilot a drone through the living room without hitting the cat. | Time-series timeline showing isolated static predictions vs. feedback loop: Agent $\leftrightarrow$ Environment. |

---

### 1. Supervised Learning & Decision Trees

| Concept | Definition | AIMA Notation | Teaching Tip | Illustration |
|---|---|---|---|---|
| **Supervised Learning Formulation** | Given a training set $D = \{(\mathbf{x}_1, y_1), \dots, (\mathbf{x}_N, y_N)\}$, find a hypothesis function $h \in \mathcal{H}$ that maps input features to target labels with minimal generalization error. | $D = \{(\mathbf{x}_i, y_i)\}_{i=1}^N$ · $h : \mathcal{X} \to \mathcal{Y}$ · $\min_{h \in \mathcal{H}} \text{Loss}(h)$ | The goal is not just memorizing the training examples, but generalizing accurately to unseen test examples. | 2D scatter plot with red/blue training points and dynamic test query point with instant classification badge. |
| **Decision Tree Structure** | A hierarchical tree model where each internal node tests an attribute, branches represent attribute values, and leaf nodes assign class predictions. | $\text{Tree}(\mathbf{x}) = \text{Leaf}(y)$ if terminal else $\text{Tree}(\text{Child}(\mathbf{x}_{att}))$ | Decision trees divide the feature space into axis-aligned rectangular decision regions. Highly interpretable! | Synchronized dual view: Visual decision tree on the left $\leftrightarrow$ 2D rectangular partitioned bounding boxes on the right. |
| **Entropy & Impurity** | A measure of uncertainty or disorder in a set of examples $S$. Maximum ($1.0$) when classes are equally split ($50/50$), minimum ($0.0$) when purely homogeneous. | $H(S) = -\sum_{i=1}^C p_i \log_2(p_i)$ where $p_i = \frac{|S_i|}{|S|}$ | Entropy answers: "How many bits of surprise are in this data sample?" A pure set has zero surprise. | Interactive entropy curve slider: toggle positive/negative counts $p \in [0, 1] \to$ dynamic readout of $H(S)$ bit value. |
| **Information Gain (ID3 / C4.5)** | The reduction in entropy achieved by partitioning a dataset $S$ according to an attribute/feature $A$. | $IG(S, A) = H(S) - \sum_{v \in \text{Values}(A)} \frac{|S_v|}{|S|} H(S_v)$ | Greedily pick the feature that yields the highest Information Gain at each node split. | Candidate split evaluator: shows 3 candidate attribute cuts with bar charts of resulting weighted daughter entropy and $IG$. |
| **Inductive Bias & Occam's Razor** | The set of assumptions an algorithm uses to predict outputs of unseen inputs. Occam's Razor prefers the simplest consistent hypothesis. | $\mathcal{H}_{\text{simple}} \prec \mathcal{H}_{\text{complex}}$ | Simpler trees with fewer nodes generalize better than enormous trees that fit noise in the training set. | Tree depth slider ($d=1 \dots 10$): shows training accuracy rising to 100% while test accuracy peaks and drops (overfitting). |

---

### 2. Linear Models & Gradient Optimization

| Concept | Definition | AIMA Notation | Teaching Tip | Illustration |
|---|---|---|---|---|
| **Linear Classification & Perceptron** | Computes a linear combination of input features and passes it through an activation threshold: $h_\mathbf{w}(\mathbf{x}) = \text{sign}(\mathbf{w}^T \mathbf{x} + b)$. | $z = \mathbf{w}^T \mathbf{x} + b = \sum_{j=1}^d w_j x_j + b$ · $h(\mathbf{x}) = \text{step}(z)$ | If data is linearly separable, the Perceptron Learning Rule is guaranteed to converge to a separating hyperplane. | Interactive 2D hyperplane: drag weight vector $\mathbf{w}$ and bias $b$ to rotate and shift the decision boundary line. |
| **Logistic Regression & Sigmoid Function** | Probabilistic linear classifier that models the posterior probability of the positive class using the logistic sigmoid function $\sigma(z) = \frac{1}{1 + e^{-z}}$. | $P(y=1 \mid \mathbf{x}) = \sigma(\mathbf{w}^T \mathbf{x} + b) = \frac{1}{1 + e^{-(\mathbf{w}^T \mathbf{x} + b)}}$ | Unlike the step function, the sigmoid is smooth and continuously differentiable, enabling gradient-based optimization! | S-curve Sigmoid graph with interactive input slider $z \in [-6, 6] \to$ probability output $P \in [0, 1]$. |
| **Cross-Entropy Loss (Log-Loss)** | The negative log-likelihood loss for binary classification. Heavily penalizes confident wrong predictions. | $L(\mathbf{w}) = -\frac{1}{N} \sum_{i=1}^N \left[ y_i \log(\hat{y}_i) + (1-y_i) \log(1-\hat{y}_i) \right]$ | If $y=1$ and $\hat{y} \to 0$, the loss approaches $\infty$. This forces the optimizer to correct major mistakes quickly. | Loss penalty graph: compares Mean Squared Error (MSE) vs. Cross-Entropy on classification errors. |
| **Gradient Descent Optimization** | Iterative first-order optimization algorithm that updates weights in the direction of steepest descent of the loss function. | $\mathbf{w} \gets \mathbf{w} - \alpha \nabla_\mathbf{w} L(\mathbf{w})$ where $\nabla_\mathbf{w} L = \frac{1}{N} \sum_{i=1}^N (\hat{y}_i - y_i) \mathbf{x}_i$ | Think of a blindfolded hiker feeling the slope underfoot and taking small steps downhill toward the valley bottom. | 3D/2D contour loss surface: animated particle tracing trajectory down the gradient bowl to minimum $\mathbf{w}^*$. |
| **Learning Rate ($\alpha$) Dynamics** | The step size hyperparameter governing weight updates during gradient descent. | $\mathbf{w}^{(t+1)} = \mathbf{w}^{(t)} - \alpha \mathbf{g}$ | If $\alpha$ is too small: training is painfully slow. If $\alpha$ is too large: optimizer oscillates or diverges to infinity. | 3-panel comparison: $\alpha = 0.001$ (Too Slow) vs. $\alpha = 0.1$ (Optimal) vs. $\alpha = 1.5$ (Divergent Oscillations). |

---

### 3. Neural Representation & Non-Linearity

| Concept | Definition | AIMA Notation | Teaching Tip | Illustration |
|---|---|---|---|---|
| **The Linear Separability Limit (XOR Problem)** | Single linear units cannot solve non-linearly separable problems like XOR ($y = x_1 \oplus x_2$). | $\text{XOR}: (0,0)\to 0, (1,1)\to 0, (0,1)\to 1, (1,0)\to 1$ | Minsky & Papert (1969) proved single perceptrons cannot solve XOR, triggering the first AI winter until multi-layer networks emerged. | Classic 2D XOR scatter plot showing that no single straight line can separate the diagonal positive points. |
| **Multi-Layer Perceptron (MLP)** | Feedforward neural network with an input layer, one or more hidden layers with non-linear activations, and an output layer. | $\mathbf{h} = g(\mathbf{W}_1 \mathbf{x} + \mathbf{b}_1)$ · $\hat{\mathbf{y}} = \sigma(\mathbf{W}_2 \mathbf{h} + \mathbf{b}_2)$ | Hidden layers learn new representations (feature transformations) that project non-linear data into linearly separable spaces! | Interactive 2-layer network diagram: nodes illuminate as signals propagate forward from inputs to hidden layer to output. |
| **Activation Functions** | Non-linear mappings applied element-wise at hidden nodes. Without non-linear activations, deep networks collapse into a single linear matrix. | $\text{ReLU}(z) = \max(0, z)$ · $\tanh(z) = \frac{e^z - e^{-z}}{e^z + e^{-z}}$ · $\sigma(z)$ | ReLU ($\max(0, z)$) is the standard modern default because it avoids the vanishing gradient problem of sigmoid for large $z$. | Interactive switchable graph: ReLU, Sigmoid, Tanh, and Leaky ReLU with derivative overlays. |
| **Universal Approximation Theorem** | A feedforward neural network with a single hidden layer and non-linear activations can approximate any continuous function on compact subsets of $\mathbb{R}^n$ to arbitrary precision. | $\forall f \in C(K), \forall \epsilon > 0 : |F(\mathbf{x}) - f(\mathbf{x})| < \epsilon$ | Depth vs. Width: While 1 wide layer is theoretically universal, deep architectures learn compositional hierarchical features far more efficiently. | Curve-fitting simulator: increasing hidden units ($n=2, 5, 20$) shapes complex non-linear decision boundaries. |
| **Backpropagation & Chain Rule** | Efficient computation of loss gradients with respect to all network weights by reverse-mode automatic differentiation using the chain rule. | $\frac{\partial L}{\partial \mathbf{W}_1} = \frac{\partial L}{\partial \hat{\mathbf{y}}} \frac{\partial \hat{\mathbf{y}}}{\partial \mathbf{h}} \frac{\partial \mathbf{h}}{\partial \mathbf{z}_1} \frac{\partial \mathbf{z}_1}{\partial \mathbf{W}_1}$ | Forward pass computes outputs and loss; backward pass flows error gradients backward to update all layers simultaneously. | Animated signal flow: green forward activations $\to$ red backward gradient pulses highlighting weight updates. |

---

### 4. Generalization, Regularization & Evaluation

| Concept | Definition | AIMA Notation | Teaching Tip | Illustration |
|---|---|---|---|---|
| **Underfitting vs. Overfitting** | Underfitting (High Bias): Model is too simple to capture patterns. Overfitting (High Variance): Model memorizes training noise and fails on test data. | Bias: $\mathbb{E}[\hat{f}] - f$ · Variance: $\mathbb{E}[(\hat{f} - \mathbb{E}[\hat{f}])^2]$ | Underfitting = Student doesn't study; Overfitting = Student memorizes practice exam answers without understanding. | 3-panel curve fit: Degree 1 line (Underfit) vs. Degree 3 curve (Optimal) vs. Degree 15 squiggly polynomial (Overfit). |
| **Train / Validation / Test Split & Cross-Validation** | Partitioning data into training (model fitting), validation (hyperparameter tuning), and test (unbiased final evaluation) sets. $K$-Fold divides data into $K$ equal folds. | $D = D_{\text{train}} \cup D_{\text{val}} \cup D_{\text{test}}$ · $K\text{-Fold Cross Validation}$ | **Never** evaluate your final model on data used during training or hyperparameter selection (data leakage!). | 5-Fold Cross Validation visual matrix highlighting training folds in blue and rotating validation fold in gold. |
| **Regularization (L1 Lasso & L2 Ridge)** | Adding a penalty term on weight magnitude to the loss function to prevent overfitting and encourage simpler models. | $L_{\text{reg}}(\mathbf{w}) = L(\mathbf{w}) + \lambda \|\mathbf{w}\|_2^2$ (L2) · $+\lambda \|\mathbf{w}\|_1$ (L1) | L2 shrinkage pulls all weights toward zero smoothly; L1 sparsity drives unimportant feature weights to exactly zero (feature selection). | Regularization parameter $\lambda$ slider: watch complex wiggly decision boundary smooth out as $\lambda$ increases. |
| **Confusion Matrix & Classification Metrics** | Tabulation of True Positives ($TP$), False Positives ($FP$), False Negatives ($FN$), and True Negatives ($TN$). Precision $= \frac{TP}{TP+FP}$, Recall $= \frac{TP}{TP+FN}$, $F_1 = 2 \frac{P \cdot R}{P+R}$. | Accuracy $= \frac{TP+TN}{N}$ · Precision · Recall · $F_1\text{-score}$ | On imbalanced datasets (e.g. 99% healthy, 1% cancer), 99% accuracy is useless; look at Recall and $F_1$-score instead. | Interactive 2×2 Confusion Matrix widget: adjust decision threshold slider $t \in [0, 1] \to$ live update of Precision, Recall, and $F_1$. |
| **ROC Curve & AUC Score** | Receiver Operating Characteristic curve plotting True Positive Rate (Recall) vs. False Positive Rate across all classification thresholds. AUC measures ranking ability. | $\text{TPR} = \frac{TP}{TP+FN}$ · $\text{FPR} = \frac{FP}{FP+TN}$ · $\text{AUC} \in [0.5, 1.0]$ | $\text{AUC} = 1.0$ is perfect; $\text{AUC} = 0.5$ is equivalent to a random coin flip. | Interactive ROC curve: hover over threshold points to see corresponding confusion matrix and shaded AUC area. |

---

### 5. Unsupervised Learning & Clustering

| Concept | Definition | AIMA Notation | Teaching Tip | Illustration |
|---|---|---|---|---|
| **Unsupervised Learning & Clustering** | Finding inherent patterns, groupings, or low-dimensional structure in data without external target labels $y$. | $D = \{\mathbf{x}_1, \dots, \mathbf{x}_N\}$ · $\text{Partition into } C_1, \dots, C_K$ | Supervised learning maps inputs to known targets; unsupervised clustering discovers unknown categories in raw data. | Unlabeled cloud of 2D points transforming into distinct color-coded cluster groupings. |
| **K-Means Clustering Algorithm** | An iterative centroid-based algorithm that partitions $N$ observations into $K$ clusters, assigning each point to the cluster with the nearest mean. | $\arg\min_{\{C_k\}} \sum_{k=1}^K \sum_{\mathbf{x} \in C_k} \|\mathbf{x} - \boldsymbol{\mu}_k\|^2$ | K-Means is guaranteed to converge to a local minimum of the Within-Cluster Sum of Squares (WCSS). | Interactive K-Means canvas: Step-by-step button cycling between Assignment (Voronoi) and Update (Centroid shift) phases. |
| **Assignment Step (Voronoi Cells)** | Assign each data point $\mathbf{x}_i$ to its nearest cluster centroid based on Euclidean distance: $c_i \gets \arg\min_k \|\mathbf{x}_i - \boldsymbol{\mu}_k\|_2$. | $c_i = \arg\min_{k \in \{1 \dots K\}} \|\mathbf{x}_i - \boldsymbol{\mu}_k\|^2$ | This partitions the 2D plane into Voronoi polygon cells around each centroid. | Real-time Voronoi cell boundaries drawn dynamically as centroids move across the canvas. |
| **Update Step (Centroid Recalculation)** | Recompute each centroid $\boldsymbol{\mu}_k$ as the arithmetic mean of all data points currently assigned to cluster $k$. | $\boldsymbol{\mu}_k = \frac{1}{|C_k|} \sum_{i \in C_k} \mathbf{x}_i$ | If a cluster loses all its points, re-initialize its centroid to a random data point. | Centroid markers animating from previous positions along dotted vectors to their new cluster center of mass. |
| **Elbow Method & K-Means++ Initialization** | The Elbow Method plots WCSS vs. $K$ to identify the point of diminishing returns. K-Means++ spreads initial centroids proportionally to squared distance. | $\text{WCSS}(K) = \sum_{k=1}^K \sum_{\mathbf{x} \in C_k} \|\mathbf{x} - \boldsymbol{\mu}_k\|^2$ · $P(\mathbf{x}) \propto D(\mathbf{x})^2$ | Poor random initialization can trap K-Means in bad local optima; K-Means++ initialization dramatically improves convergence speed and quality. | Interactive WCSS curve chart: highlighting the sharp "elbow" angle indicating the optimal cluster count $K^*$. |

---

### 6. Sequential Decisions & Markov Decision Processes (MDPs)

| Concept | Definition | Sutton-Barto / AIMA Notation | Teaching Tip | Illustration |
|---|---|---|---|---|
| **The Reinforcement Learning Loop** | An agent interacts with an environment at discrete time steps $t$: observes state $s_t \in \mathcal{S}$, selects action $a_t \in \mathcal{A}$, receives reward $r_{t+1} \in \mathbb{R}$, and transitions to $s_{t+1} \in \mathcal{S}$. | $s_0 \xrightarrow{a_0, r_1} s_1 \xrightarrow{a_1, r_2} s_2 \dots$ · $\text{Agent} \leftrightarrow \text{Environment}$ | Unlike supervised learning where the teacher gives the right answer, the RL agent only gets a scalar evaluation (reward) of its chosen action. | Interactive loop diagram: Agent brain emits Action $a \to$ Environment returns Next State $s'$ and Reward $r$. |
| **Markov Decision Process (MDP) Tuple** | A formal framework for sequential decision making: $\mathcal{M} = \langle \mathcal{S}, \mathcal{A}, \mathcal{P}, \mathcal{R}, \gamma \rangle$. | $\mathcal{S}$ (States), $\mathcal{A}$ (Actions), $\mathcal{P}(s' \mid s, a)$, $\mathcal{R}(s, a, s')$, $\gamma \in [0, 1)$ | **Markov Property:** The future depends only on the current state and action, not on the history of how the agent arrived there! | 4×3 Grid World map with overlay showing state coordinates, obstacle cell, reward labels, and action arrows. |
| **Return & Discount Factor ($\gamma$)** | The discounted cumulative future reward from time step $t$: $G_t = \sum_{k=0}^\infty \gamma^k R_{t+k+1}$. Discount $\gamma \in [0, 1)$ balances immediate vs. long-term rewards. | $G_t = R_{t+1} + \gamma R_{t+2} + \gamma^2 R_{t+3} + \dots = R_{t+1} + \gamma G_{t+1}$ | $\gamma = 0$ makes the agent myopic (cares only about next step); $\gamma \to 1$ makes the agent farsighted (patiently plans for distant goals). | Interactive discount timeline: bar graph showing exponential decay of reward weights $\gamma^0, \gamma^1, \gamma^2, \dots$. |
| **Policy ($\pi$) & State-Value Function ($V^\pi(s)$)** | A policy $\pi(a \mid s)$ maps states to actions. The state-value function $V^\pi(s)$ is the expected return starting from state $s$ following policy $\pi$. | $\pi : \mathcal{S} \to \mathcal{A}$ · $V^\pi(s) = \mathbb{E}_\pi \left[ G_t \mid S_t = s \right]$ | $V(s)$ answers: "How good is it to be in this state if I follow policy $\pi$?" | 4×3 Grid World state value heatmap: each cell displays numeric $V(s)$ value with color gradient from cool to hot. |
| **Action-Value Function ($Q^\pi(s, a)$) & Bellman Equations** | $Q^\pi(s, a)$ is the expected return starting from $s$, taking action $a$, and thereafter following $\pi$. Bellman Equations decompose values recursively into immediate reward plus discounted future value. | $V^\pi(s) = \sum_a \pi(a \mid s) \sum_{s', r} P(s', r \mid s, a) [r + \gamma V^\pi(s')]$ · $Q(s, a) = \sum_{s', r} P [r + \gamma \max_{a'} Q(s', a')]$ | Bellman Equation is the master recursion of RL: "Value today = Immediate reward + Discounted value tomorrow". | Backup diagram: Node $s \to$ branches to action nodes $a \to$ branches to chance outcomes $s'$ with probabilities $P(s' \mid s, a)$. |

---

### 7. Dynamic Programming: Value & Policy Iteration

| Concept | Definition | AIMA / Sutton-Barto Notation | Teaching Tip | Illustration |
|---|---|---|---|---|
| **Bellman Optimality Equation** | The optimal state value $V^*(s)$ must equal the expected return for the best action from that state. | $V^*(s) = \max_{a \in \mathcal{A}} \sum_{s'} P(s' \mid s, a) \left[ R(s, a, s') + \gamma V^*(s') \right]$ | Non-linear system of $|\mathcal{S}|$ equations with $\max$ operators. Cannot be solved by linear algebra; solved via iterative dynamic programming! | Interactive calculation node: computes candidate values for 4 directions and selects $\max$ arrow. |
| **Value Iteration Algorithm** | Repeatedly applies the Bellman Optimality update to all states simultaneously until state values converge within a small tolerance $\epsilon$: $\max_s |V_{k+1}(s) - V_k(s)| < \epsilon \frac{1-\gamma}{2\gamma}$. | $V_{k+1}(s) \gets \max_a \sum_{s'} P(s' \mid s, a) [R + \gamma V_k(s')]$ | Value Iteration is guaranteed to converge to the unique optimal $V^*(s)$ because the Bellman operator is a contraction mapping! | Step-by-step Value Iteration on 4×3 Grid: watch value numbers propagate backward from the $+1$ goal to start. |
| **Policy Extraction** | Extracting the greedy policy $\pi^*(s)$ with respect to converged state values $V^*(s)$: $\pi^*(s) = \arg\max_a \sum_{s'} P(s' \mid s, a) [R + \gamma V^*(s')]$. | $\pi^*(s) = \arg\max_{a \in \mathcal{A}} \sum_{s'} P(s' \mid s, a) [R(s, a, s') + \gamma V^*(s')]$ | Once you have the true values $V^*$, finding the best action only requires 1-step lookahead. | 4×3 Grid with directional arrows $(\uparrow, \downarrow, \leftarrow, \rightarrow)$ appearing inside each cell as values converge. |
| **Policy Iteration Algorithm** | Alternates between two steps: (1) **Policy Evaluation** (computes $V^{\pi_k}$ for current policy $\pi_k$) and (2) **Policy Improvement** (updates $\pi_{k+1}(s) \gets \arg\max_a Q^{\pi_k}(s, a)$) until policy stops changing. | $\pi_0 \xrightarrow{\text{Evaluate}} V^{\pi_0} \xrightarrow{\text{Improve}} \pi_1 \xrightarrow{\text{Evaluate}} V^{\pi_1} \dots \pi^*$ | Policy Iteration often converges in fewer iterations than Value Iteration because the policy space is finite ($|\mathcal{A}|^{|\mathcal{S}|}$). | Policy flip visualizer: highlighted cells where directional arrow rotates during improvement step until stability. |
| **Model-Based vs. Model-Free Requirement** | Dynamic Programming methods (Value/Policy Iteration) are **model-based**: they require complete knowledge of transition probabilities $P(s' \mid s, a)$ and reward function $R$. | Requires explicit $\mathcal{P}(s' \mid s, a)$ and $\mathcal{R}(s, a)$ | When the physics/rules of the environment are unknown or too complex to model, we must use **Model-Free Reinforcement Learning**! | Fork in the road graphic: Model-Based (Known Dynamics $\to$ Dynamic Programming) vs. Model-Free (Unknown Dynamics $\to$ Q-Learning / Policy Gradients). |

---

### 8. Model-Free Reinforcement Learning: Q-Learning & SARSA

| Concept | Definition | Sutton-Barto Notation | Teaching Tip | Illustration |
|---|---|---|---|---|
| **Temporal Difference (TD) Learning** | Learning value estimates directly from experienced transitions without requiring an environmental model, updating towards the 1-step bootstrapping target $r + \gamma V(s')$. | $V(S_t) \gets V(S_t) + \alpha \left[ R_{t+1} + \gamma V(S_{t+1}) - V(S_t) \right]$ | TD combines the sampling of Monte Carlo with the bootstrapping of Dynamic Programming! | Difference gauge showing TD Error $\delta = \text{Target} - \text{Current Estimate}$, shifting the value pointer. |
| **Tabular Q-Learning (Off-Policy TD Control)** | An off-policy algorithm that directly learns the optimal action-value function $Q^*(s, a)$ regardless of the agent's behavior policy, using the greedy $\max_{a'}$ update. | $Q(S_t, A_t) \gets Q(S_t, A_t) + \alpha \left[ R_{t+1} + \gamma \max_a Q(S_{t+1}, a) - Q(S_t, A_t) \right]$ | Off-policy means: Q-Learning learns about the optimal greedy path even while exploring randomly via $\epsilon$-greedy! | Interactive Q-Table Grid: Each cell split into 4 directional triangular wedges displaying live learned Q-values. |
| **Exploration vs. Exploitation ($\epsilon$-Greedy)** | The fundamental dilemma: Exploitation acts on current best knowledge to gain reward; Exploration tries sub-optimal actions to discover better long-term policies. $\epsilon$-greedy picks random action with probability $\epsilon$, greedy action with $1-\epsilon$. | $\pi(a \mid s) = \begin{cases} 1 - \epsilon + \frac{\epsilon}{|\mathcal{A}|} & \text{if } a = \arg\max Q(s, a) \\ \frac{\epsilon}{|\mathcal{A}|} & \text{otherwise} \end{cases}$ | Decaying $\epsilon$ (e.g. from $1.0 \to 0.05$) allows high exploration early during learning and stable exploitation later. | Live roulette dial: showing $(1-\epsilon)$ wedge for Greedy choice and split $\epsilon$ wedges for exploratory choices. |
| **SARSA (On-Policy TD Control)** | An on-policy control algorithm that updates $Q(S_t, A_t)$ using the actual next action $A_{t+1}$ chosen by the current behavior policy $\pi$: $\langle S_t, A_t, R_{t+1}, S_{t+1}, A_{t+1} \rangle$. | $Q(S_t, A_t) \gets Q(S_t, A_t) + \alpha \left[ R_{t+1} + \gamma Q(S_{t+1}, A_{t+1}) - Q(S_t, A_t) \right]$ | On Cliff Walking: Q-learning learns the optimal dangerous path along the edge; SARSA learns the safer path away from the cliff because it accounts for its own random exploration stumbles. | Side-by-side agent trajectories on Cliff Walking: Q-Learning (edge walker) vs. SARSA (safe inland walker). |
| **Convergence & Deep Q-Networks (DQN Intuition)** | Tabular Q-learning converges to $Q^*$ if all state-action pairs are visited infinitely often and learning rate satisfies Robbins-Monro conditions ($\sum \alpha = \infty, \sum \alpha^2 < \infty$). For huge state spaces, neural networks approximate $Q(s, a; \boldsymbol{\theta})$. | $\min_{\boldsymbol{\theta}} \mathbb{E} \left[ \left( r + \gamma \max_{a'} Q(s', a'; \boldsymbol{\theta}^-) - Q(s, a; \boldsymbol{\theta}) \right)^2 \right]$ | Tabular RL stores a lookup table; Deep RL uses deep neural nets to generalize across billions of states (e.g. Atari, AlphaGo). | Scaling diagram: Small 12-state Grid Table $\to$ $10^{170}$ Go board state space parameterized by a Deep CNN. |

---

### 9. Evaluating Learning & Decision Systems

Comprehensive comparison of Supervised Learning, Unsupervised Clustering, Dynamic Programming MDPs, and Model-Free Reinforcement Learning:

| Dimension | Decision Trees (ID3/CART) | Logistic Regression | Multi-Layer Perceptrons | K-Means Clustering | Value / Policy Iteration | Tabular Q-Learning | Deep Q-Learning (DQN) |
|---|---|---|---|---|---|---|---|
| **Learning Paradigm** | Supervised Classification / Regression | Supervised Probabilistic Classification | Supervised / Non-linear Function Approx | Unsupervised Clustering | Model-Based Planning (MDP) | Model-Free Reinforcement Learning | Model-Free Deep RL |
| **Model Representation** | Hierarchical decision tree / axis-aligned bounds | Linear hyperplane $\mathbf{w}^T \mathbf{x} + b$ with Sigmoid $\sigma(z)$ | Multi-layer weight matrices $\mathbf{W}_l$ + non-linearities | $K$ spatial centroid vectors $\boldsymbol{\mu}_1 \dots \boldsymbol{\mu}_K$ | State-value table $V(s)$ or Policy $\pi(s)$ | Action-value lookup table $Q(s, a)$ | Deep Neural Network $Q(s, a; \boldsymbol{\theta})$ |
| **Optimization Method** | Greedy recursive splitting (Information Gain / Gini) | Gradient Descent on Cross-Entropy Loss | Backpropagation with Adam / SGD | Alternating expectation-maximization (Assign $\leftrightarrow$ Update) | Dynamic Programming (Bellman operator contraction) | Temporal Difference bootstrapping ($TD(0)$) | Gradient descent on TD loss + Experience Replay |
| **Environmental Dynamics Required?** | No (data-driven) | No (data-driven) | No (data-driven) | No (data-driven) | **Yes (Full transition $P$ & reward $R$)** | **No (Learns from trial-and-error rollout)** | **No (Learns from trial-and-error rollout)** |
| **Data / Sample Efficiency** | High (fast with tabular data) | High (convex optimization) | Moderate to Low (needs thousands of samples) | High (fast convergence to local minimum) | Exact (no simulation needed if model known) | Moderate (needs thousands of environment steps) | Low (needs millions of environment frames) |
| **Interpretability** | **Extremely High** (human-readable tree rules) | **High** (weight signs & odds ratios) | Low ("Black-box" hidden representations) | High (visual 2D/3D cluster centers) | High (transparent expected values) | High (inspectable Q-table values) | Low (opaque deep network weights) |
| **Key Hyperparameters** | Max depth, min samples split, criterion | Learning rate $\alpha$, regularization $\lambda$, epochs | Hidden layers/units, $\alpha$, activation, batch size | Cluster count $K$, init method (K-Means++) | Discount factor $\gamma$, convergence threshold $\epsilon$ | Learning rate $\alpha$, discount $\gamma$, exploration $\epsilon$, decay | Replay buffer size, target update frequency, $\epsilon$-decay |
| **Primary Failure Modes** | Overfitting to training noise (memorization) | Underfitting non-linear data; sensitive to outliers | Overfitting; vanishing/exploding gradients; local minima | Sub-optimal local minima; sensitive to outliers / non-spherical clusters | Curse of dimensionality with large state spaces $|\mathcal{S}|$ | Slow exploration in sparse reward environments | Deadly Triad instability (Bootstrapping + Function Approx + Off-Policy) |
| **Best Application Domain** | Tabular business data, credit scoring, medical triage | Linear binary risk prediction, baseline classification | Image recognition, speech, complex non-linear NLP | Customer segmentation, image compression, anomaly detection | Known environments with small state spaces (robotics planning) | Tabular games, grid navigation, automated thermostat control | Video games (Atari), robotics manipulation, autonomous vehicles |

---

### 10. Code Trace Specification (`learning.html#code`)

Interactive line-by-line stepping through clean, runnable Python code with real-time state visualization:

```
┌──────────────────────────────────────┬──────────────────────────────────────┐
│ PYTHON SOURCE TRACE (Left 50%)       │ RUNTIME STATE & VISUALIZER (Right 50%)│
│                                      │                                      │
│ • Line numbers with execution arrow  │ • Active variables, gradients & loss │
│ • Highlighted active expressions     │ • Dynamic 2D boundary / Q-table grid │
│ • Step commentary & variable watch   │ • Step k of N | Prev | Next | Run/Pause│
└──────────────────────────────────────┴──────────────────────────────────────┘
```

#### Presets Traced

1. **`trace_decision_tree_build` (`python_sandbox/10_Machine_Learning.py`):**
   * **Problem:** Building a 2-level decision tree on a 14-sample weather/loan dataset.
   * **State Display:** Current node, candidate features, entropy calculations $H(S)$, computed Information Gain per feature, selected split threshold, recursive left/right subsets.
2. **`trace_gradient_descent_logistic` (`python_sandbox/10_Machine_Learning.py`):**
   * **Problem:** 5 iterations of Batch Gradient Descent optimizing $\mathbf{w} = [w_1, w_2]$ and bias $b$ on 20 2D points.
   * **State Display:** Sigmoid predictions $\hat{\mathbf{y}}$, error vector $(\hat{\mathbf{y}} - \mathbf{y})$, gradient $\nabla_\mathbf{w} L$, weight update $\mathbf{w} \gets \mathbf{w} - \alpha \nabla L$, live shifting decision boundary on 2D scatter plot.
3. **`trace_kmeans_clustering` (`python_sandbox/10_Machine_Learning.py`):**
   * **Problem:** 3 iterations of K-Means ($K=3$) on 30 2D points.
   * **State Display:** Active centroid coordinates $\boldsymbol{\mu}_1, \boldsymbol{\mu}_2, \boldsymbol{\mu}_3$, point assignment array $c_i$, cluster size counts $|C_k|$, recalculated centers of mass, total WCSS cost reduction.
4. **`trace_value_iteration` (`python_sandbox/11_Reinforcement_Learning.py`):**
   * **Problem:** Value Iteration on 4×3 Grid World with living reward $-0.04$ and $\gamma = 0.99$.
   * **State Display:** Iteration $k$, current value matrix $V_k(s)$, candidate Bellman sums for Up/Down/Left/Right, maximum delta $\Delta = \max |V_{k+1} - V_k|$, greedy policy arrow overlay.
5. **`trace_q_learning` (`python_sandbox/11_Reinforcement_Learning.py`):**
   * **Problem:** 1 episode (20 steps) of Tabular Q-Learning navigating from $(1,1)$ to $(4,3)$ goal under $\epsilon=0.2$.
   * **State Display:** Current state $S_t$, chosen action $A_t$ (Greedy vs. Explored), observed reward $R$, next state $S_{t+1}$, TD Target $R + \gamma \max Q(S', a)$, TD Error $\delta$, updated $Q(S_t, A_t)$ entry.

---

## 5. Python Sandbox Scripts

### File 1: `python_sandbox/10_Machine_Learning.py`
Standalone, zero-dependency Python script runnable directly with `python 10_Machine_Learning.py`:
* `entropy(y)` & `information_gain(X, y, feature_idx)` — Exact Shannon entropy and IG computation.
* `DecisionTreeClassifier(max_depth=3)` — Recursive tree builder with prediction and ASCII tree printing.
* `LogisticRegression(lr=0.1, epochs=100)` — Sigmoid activation, Binary Cross-Entropy Loss, Batch Gradient Descent.
* `KMeans(k=3, max_iter=20)` — K-Means with K-Means++ initialization, Voronoi point assignments, and centroid updates.
* `train_test_split(X, y, test_ratio=0.2)` & `evaluate_metrics(y_true, y_pred)` (Accuracy, Precision, Recall, $F_1$-score, Confusion Matrix).
* **Built-in Test Cases:**
  * Synthetic 2D classification benchmark comparing Decision Tree vs. Logistic Regression.
  * Spatial 3-cluster clustering benchmark with WCSS calculation.

### File 2: `python_sandbox/11_Reinforcement_Learning.py`
Standalone, zero-dependency Python script runnable directly with `python 11_Reinforcement_Learning.py`:
* `GridWorld` environment class with configurable dimensions, walls, terminal states, living rewards, and stochastic slip probabilities.
* `value_iteration(env, gamma=0.99, epsilon=1e-4)` — Dynamic programming computing exact $V^*(s)$ and extracting $\pi^*(s)$.
* `policy_iteration(env, gamma=0.99)` — Alternating Policy Evaluation and Policy Improvement.
* `QLearningAgent(env, alpha=0.1, gamma=0.99, epsilon=0.2)` — Tabular Q-Learning with $\epsilon$-greedy exploration.
* `SARSAAgent(env, alpha=0.1, gamma=0.99, epsilon=0.2)` — On-policy SARSA control.
* **Built-in Test Cases:**
  * Classic AIMA 4×3 Grid World benchmark comparing Value Iteration vs. Q-Learning policy convergence.
  * Cliff Walking comparison: Q-Learning (optimal dangerous path) vs. SARSA (safe path).

### File 3: `python_sandbox/learning.py`
Clean reference module defining shared classes and data structures:
* `Dataset` container for feature matrices and labels with standard normalization helpers.
* `DecisionNode` and `DecisionTree` structures.
* `MDP` abstract base class defining $\mathcal{S}, \mathcal{A}, P(s' \mid s, a), R(s, a, s'), \gamma$.
* `GridWorldMDP` implementation with formatted ASCII grid rendering.

---

## 6. Reading Notes & Practice Exercises (`topic06_reading.html`)

Textbook-style reading notes structured into 6 comprehensive sections, followed by fully worked-out analytical practice problems:

### Practice Problems Included

1. **Entropy & Information Gain Calculation:**
   * Given a training set of 10 loan applicants (6 Approved, 4 Denied), feature `CreditScore` has values `{High: [4 Approved, 0 Denied], Low: [2 Approved, 4 Denied]}`.
   * Calculate parent entropy $H(S)$, conditional daughter entropies $H(S_{\text{High}})$ and $H(S_{\text{Low}})$, and resulting Information Gain $IG(S, \text{CreditScore})$.
2. **Logistic Regression Gradient Descent Step:**
   * Given single training point $\mathbf{x} = [1.0, 2.0]$, label $y = 1$, current weights $\mathbf{w} = [0.5, -0.2]$, bias $b = 0.1$, and learning rate $\alpha = 0.1$.
   * Calculate linear logit $z$, predicted probability $\hat{y} = \sigma(z)$, Cross-Entropy Loss, and updated weights $\mathbf{w}'$ and $b'$ after one gradient step.
3. **Confusion Matrix & Classification Metrics:**
   * Given a medical diagnostic test evaluated on 200 patients: $TP=45, FP=15, FN=5, TN=135$.
   * Compute Accuracy, Precision, Recall (Sensitivity), Specificity, and $F_1$-score. Explain why Accuracy alone is misleading if prevalence is very low.
4. **K-Means 1-Step Centroid Update:**
   * Given 4 2D points $A(1, 2), B(2, 4), C(8, 8), D(9, 6)$ and 2 initial centroids $\boldsymbol{\mu}_1 = (2, 2)$ and $\boldsymbol{\mu}_2 = (7, 7)$.
   * Compute Euclidean distance from each point to each centroid; determine cluster assignments $C_1, C_2$; calculate new updated centroid coordinates $\boldsymbol{\mu}_1', \boldsymbol{\mu}_2'$.
5. **Bellman Optimality State Value Calculation (Value Iteration):**
   * Given a 3-state MDP ($S_0, S_1, S_2$) with $\gamma = 0.9$. From state $S_0$, action $A$ has an $80\%$ chance of transitioning to $S_1$ (reward $+10$) and $20\%$ chance of transitioning to $S_2$ (reward $0$). Action $B$ transitions deterministically to $S_2$ (reward $+4$).
   * Given current estimated values $V(S_1) = 5.0$ and $V(S_2) = 2.0$, calculate $Q(S_0, A)$ and $Q(S_0, B)$ and determine the updated value $V_{k+1}(S_0)$ and greedy action.
6. **Q-Learning Numerical Step Trace:**
   * An agent in state $S_1$ has current Q-values $Q(S_1, \text{East}) = 4.2$ and $Q(S_1, \text{North}) = 3.0$. It chooses action $\text{East}$, receives reward $R = +2.0$, and lands in state $S_2$.
   * In state $S_2$, available Q-values are $\{ \text{East}: 6.0, \text{West}: 1.0, \text{North}: 5.0 \}$. Using learning rate $\alpha = 0.2$ and discount $\gamma = 0.9$, compute the TD target, TD error $\delta$, and updated value $Q(S_1, \text{East})$.

---

## 7. Interactive Playground Specifications (`playground.html#view-learning` & `playground.html#view-rl`)

Three dedicated interactive lab views:

1. **2D Classification & Decision Boundary Studio (`playground.html#view-learning`):**
   * Click-to-add custom 2D data points (Class A: Blue, Class B: Red) or select presets (Linearly Separable, Concentric Circles, Moons, XOR).
   * Switch between models: **Logistic Regression**, **Decision Tree (depth 1–6)**, and **2-Layer Neural Network**.
   * Watch live continuous decision boundary contours update in real-time as training epochs run.
2. **K-Means Interactive Clustering Lab (`playground.html#view-kmeans`):**
   * Generate 2D spatial point distributions (Gaussian blobs, uniform random, elongated clusters).
   * Select cluster count $K \in [2, 8]$ and initialization (Random vs. K-Means++).
   * Step through iterations manually or play continuous animation; observe live Voronoi cell partitioning and WCSS curve convergence.
3. **Grid World Reinforcement Learning Lab (`playground.html#view-rl`):**
   * Interactive grid world with customizable dimensions, obstacle walls, terminal rewards ($+1.0, -1.0$), and living penalty slider ($-0.01 \dots -0.20$).
   * Switch between **Value Iteration** (shows real-time numeric state values and policy arrows) and **Live Q-Learning Agent** (agent navigates grid in real-time, displaying live updating 4-wedge Q-values per cell).
   * Sliders for Learning Rate ($\alpha$), Discount Factor ($\gamma$), and Exploration Rate ($\epsilon$).

---

## 8. Academic & Textbook References

### Primary Textbooks & Standard Curricula
* **AIMA (4th Edition):**
  * Chapter 17: *Making Complex Decisions* (§17.1 Sequential Decision Problems & MDPs, §17.2 Value Iteration & Policy Iteration).
  * Chapter 19: *Learning from Examples* (§19.1 Forms of Learning, §19.2 Supervised Learning, §19.3 Decision Trees, §19.4 Model Evaluation, §19.6 Linear Models & Logistic Regression, §19.7 Neural Networks & Backpropagation).
  * Chapter 20: *Learning Probabilistic Models* (§20.3 Unsupervised Learning & K-Means Clustering).
  * Chapter 21: *Reinforcement Learning* (§21.1 Passive RL & TD Learning, §21.2 Active RL & Q-Learning, §21.3 Generalization in RL).
* **Sutton & Barto (2nd Edition, 2018):**
  * Chapter 3: *Finite Markov Decision Processes* (The Agent-Environment Interface, Goals, Rewards, Returns, Value Functions, Bellman Equations).
  * Chapter 4: *Dynamic Programming* (Policy Evaluation, Policy Improvement, Policy Iteration, Value Iteration).
  * Chapter 6: *Temporal-Difference Learning* (TD Prediction, TD Error, SARSA on-policy control, Q-Learning off-policy control).
* **AIMA Python Reference Code:**
  * Learning algorithms: [`reference/aima-python/aima/learning.py`](file:///Volumes/Data/MLAI_Projects/MLAI401/reference/aima-python/aima/learning.py) (`DecisionTreeLearner`, `LinearRegressionLearner`, `LogisticRegressionLearner`, `NeuralNetLearner`).
  * Reinforcement Learning: [`reference/aima-python/aima/rl.py`](file:///Volumes/Data/MLAI_Projects/MLAI401/reference/aima-python/aima/rl.py) (`MDP`, `GridMDP`, `value_iteration`, `policy_iteration`, `QLearningAgent`, `PassiveTDAgent`).

### Foundational Papers & Historical Milestones
* **Foundational Machine Learning:**
  * Rosenblatt, F. (1958). *The Perceptron: A Probabilistic Model for Information Storage and Organization in the Brain*. Psychological Review, 65(6), 386–408.
  * Minsky, M., & Papert, S. (1969). *Perceptrons: An Introduction to Computational Geometry*. MIT Press. (Limits of single-layer perceptrons on XOR).
  * MacQueen, J. (1967). *Some Methods for Classification and Analysis of Multivariate Observations*. Proc. 5th Berkeley Symp. on Math. Statist. and Prob., 1, 281–297. (Foundational K-Means algorithm).
  * Quinlan, J. R. (1986). *Induction of Decision Trees*. Machine Learning, 1(1), 81–106. (The ID3 algorithm).
  * Rumelhart, D. E., Hinton, G. E., & Williams, R. J. (1986). *Learning Representations by Back-Propagating Errors*. Nature, 323(6088), 533–536.
* **Dynamic Programming & Reinforcement Learning:**
  * Bellman, R. (1957). *Dynamic Programming*. Princeton University Press. (The Bellman Equation and Principle of Optimality).
  * Watkins, C. J., & Dayan, P. (1992). *Q-learning*. Machine Learning, 8(3-4), 279–292. (Proof of Q-learning convergence).
  * Rummery, G. A., & Niranjan, M. (1994). *On-Line Q-Learning Using Connectionist Systems*. Technical Report, Cambridge University. (Introduction of SARSA).
  * Mnih, V., et al. (2015). *Human-level Control Through Deep Reinforcement Learning*. Nature, 518(7540), 529–533. (Deep Q-Networks / DQN).
