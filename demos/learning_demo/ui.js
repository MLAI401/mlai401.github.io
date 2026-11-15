/**
 * ui.js — Topic 06: Learning & Decision Making Lecture Page Controller (learning.html)
 *
 * CPP201-style page (hero → big picture → topic buttons → subtopic tabs →
 * demo panel). The 11 topics below are grouped into 6 topic buttons (GROUPS);
 * their concepts are the subtopic tabs:
 *     0. Evolution: Knowledge & Logic → Learning & Decisions
 *     1. Text Features: Bag-of-Words & TF-IDF
 *     2. Naive Bayes Classification
 *     3. Model Evaluation & Performance Metrics (interactive lab: evaluation_lab.js)
 *     4. Neural Networks & Gradient Optimization (Shallow NN lab: shallow_nn_lab.js)
 *     5. Unsupervised Learning: K-Means Clustering
 *     6. Sequential Decisions & MDPs
 *     7. Model-Based Planning: Value Iteration
 *     8. Model-Free RL: Tabular Q-Learning
 *     9. Evaluating Learning & Decision Systems
 *     10. Code Trace: ML, NN, & RL Algorithms
 */

(function () {
  'use strict';

  const M = window.MLEngine;
  const R = window.RLEngine;

  // --- Topic Definitions ---
  const TOPICS = [
    { id: 'progression', title: 'Progression: Knowledge & Logic → Learning & Decisions', short: '0 · Evolution' },
    { id: 'features', title: 'Machine Learning: Text Features (BoW & TF-IDF)', short: '1 · Text Features' },
    { id: 'naive_bayes', title: 'Machine Learning: Naive Bayes Classification', short: '2 · Naive Bayes' },
    { id: 'evaluation', title: 'Machine Learning: Model Evaluation & Metrics', short: '3 · Evaluation' },
    { id: 'neural_nets', title: 'Neural Networks & Gradient Optimization', short: '4 · Neural Networks' },
    { id: 'kmeans', title: 'Unsupervised Learning: K-Means Clustering', short: '5 · K-Means' },
    { id: 'mdp', title: 'Sequential Decisions & Markov Decision Processes', short: '6 · MDP Formulation' },
    { id: 'value_iteration', title: 'Model-Based Planning: Value Iteration', short: '7 · Value Iteration' },
    { id: 'q_learning', title: 'Model-Free RL: Tabular Q-Learning & SARSA', short: '8 · Q-Learning' },
    { id: 'comparison', title: 'Evaluating Learning & Decision Systems', short: '9 · System Matrix' },
    { id: 'code', title: 'Code Trace: ML, Neural & RL Algorithms', short: '10 · Code Trace' }
  ];

  const TOPIC_INTROS = [
    'Transitioning from hand-crafted knowledge rules and static search to learning patterns from empirical data and learning optimal sequential policies through interaction and reward feedback.',
    'How unstructured text is transformed into a shared numerical feature space for classification: a fixed vocabulary learned from training documents, aligned Bag-of-Words count vectors, and TF-IDF weights reused for new messages.',
    'Generative probabilistic classification using Bayes\' Rule and conditional independence assumptions, complete with Laplace Add-1 smoothing and log-space computation.',
    'Rigorous statistical validation of classification performance: Confusion Matrices (TP, FP, TN, FN), Accuracy Paradox, Precision, Recall, and the F1-Score harmonic mean.',
    'Biological-inspired computation: from the linear Perceptron to a shallow network that solves XOR — forward pass, backpropagation, gradient-descent updates, and how ReLU, sigmoid and tanh hidden units change training.',
    'Discovering latent groupings in unlabeled spatial data: K-Means clustering, Voronoi cell assignments, centroid recalculation, and the Elbow Method for choosing K.',
    'Sequential decision-making under uncertainty: the MDP tuple ⟨S, A, P, R, γ⟩, discounted returns, state-value functions V(s), and action-value functions Q(s,a).',
    'Model-based dynamic programming: solving known MDPs with Value Iteration (Bellman Optimality contraction) and greedy policy extraction.',
    'Model-free reinforcement learning: learning optimal behavior from environment rollouts via Temporal Difference learning TD(0), Tabular Q-Learning, and SARSA under ε-greedy exploration.',
    'Multi-dimensional comparison matrix across Naive Bayes, Neural Networks, K-Means Clustering, Value Iteration, and Model-Free Q-Learning.',
    'The core of each algorithm in clean Python from python_sandbox/, next to the variable values of one worked example: TF-IDF, Naive Bayes, Perceptron, K-Means, Value Iteration, and Q-Learning.'
  ];

  // --- Concept Data per Topic ---
  const CONCEPTS = {
    progression: [
      {
        key: 'rules_vs_learning', labInConcept: true, name: 'Rules vs. Empirical Learning',
        def: 'In Topics 01–05, knowledge and heuristics were hand-coded by human experts. In Machine Learning, the agent extracts rules, distributions, and decision boundaries directly from data.',
        notation: 'Handcrafted: KB ⊨ α · Learning: h ← LEARN(Data)',
        tip: 'When the world is too complex to write explicit rules for (e.g. spam filtering, vision), we let data train parameter weights.',
        render: col => { if (window.EvolutionLab) window.EvolutionLab.renderRules(col); else renderProgressionOverview(col); }
      },
      {
        key: 'three_paradigms', labInConcept: true, name: 'Four Learning Paradigms',
        def: 'Supervised (labeled pairs ⟨x, y⟩), Neural Networks (non-linear representations), Unsupervised (unlabeled structure discovery), and Reinforcement Learning (trial, error, and scalar rewards r).',
        notation: 'Supervised: x → y · NN: Wx+b · Unsupervised: C_k · RL: s —(a)→ r, s\'',
        tip: 'Supervised = Teacher gives answers; Unsupervised = Detective finds patterns; RL = Gamer learns to maximize score.',
        render: col => { if (window.EvolutionLab) window.EvolutionLab.renderParadigms(col); else renderFourParadigms(col); }
      },
      {
        key: 'static_vs_sequential', labInConcept: true, name: 'Static vs. Sequential Decisions',
        def: 'Supervised learning predicts independent static targets (i.i.d.). RL deals with sequential states where current actions influence future states and delayed rewards.',
        notation: 'Static: ŷ = h(x) · Sequential: a_t ~ π(s_t) ⇒ s_{t+1}, r_{t+1}',
        tip: 'A classifier tells you if a photo has a cat; an RL agent decides how to pilot a drone through the living room without hitting the cat.',
        render: col => { if (window.EvolutionLab) window.EvolutionLab.renderSequential(col); else renderStaticVsSequential(col); }
      }
    ],
    features: [
      {
        key: 'bow_concept', name: 'Tokenization & Bag-of-Words', labInConcept: true,
        def: 'Builds a fixed, alphabetically indexed vocabulary from the training documents, then represents every document — training or new — as a count vector over that same vocabulary. Absent words are 0; words outside the vocabulary are ignored.',
        notation: 'V = sorted unique training tokens {w₀, …, w_|V|−1} · x(d) = ⟨count(w₀, d), …, count(w_|V|−1, d)⟩ — the same |V| slots for every d',
        tip: 'Bag-of-Words disregards word order and grammar, but word frequency spikes provide surprisingly strong topical signals.',
        render: col => { if (window.TextFeaturesLab) window.TextFeaturesLab.render(col, 'bow'); else renderBagOfWordsVisualizer(col); }
      },
      {
        key: 'tfidf_concept', name: 'TF-IDF Rarity Weighting', labInConcept: true,
        def: 'Combines local Term Frequency (TF) with Inverse Document Frequency (IDF). IDF is learned once from the training documents and reused for every new message, downweighting ubiquitous words and boosting rare, discriminative ones.',
        notation: 'TF(t, d) = count(t, d) / |d| (|d| = in-vocabulary tokens) · IDF(t) = ln(N / DF(t)) over N training docs · TF-IDF(t, d) = TF(t, d) × IDF(t)',
        tip: 'High TF-IDF indicates a word is frequent in this document but rare in the general corpus (e.g., "lottery", "kinase").',
        render: col => { if (window.TextFeaturesLab) window.TextFeaturesLab.render(col, 'tfidf'); else renderTFIDFStudio(col); }
      }
    ],
    naive_bayes: [
      {
        key: 'nb_map', name: 'Generative MAP Classification', labInConcept: true,
        def: 'Applies Bayes\' Rule to select the class maximizing the posterior probability P(c | x) ∝ P(c) ∏ P(xᵢ | c) under the conditional independence assumption.',
        notation: 'c* = argmax_c [ log P(c) + ∑ log P(xᵢ | c) ]',
        tip: 'The independence assumption is "naive" because words correlate, but in practice Naive Bayes is extremely fast and robust for text.',
        render: col => { if (window.NaiveBayesLab) window.NaiveBayesLab.render(col, 'map'); else renderNaiveBayesClassifierStudio(col); }
      },
      {
        key: 'laplace_smoothing', name: 'Laplace (Add-1) Smoothing', labInConcept: true,
        def: 'Adds pseudo-count α = 1 to all word counts to prevent unseen test words from multiplying the entire class likelihood to zero.',
        notation: 'P̂(w | c) = (count(w, c) + α) / (∑ count(w\', c) + α·|V|) · Add-1: α = 1',
        tip: 'Without Laplace smoothing, a single unseen word in an email gives P(Spam)=0 and P(Ham)=0 (the zero-probability trap).',
        render: col => { if (window.NaiveBayesLab) window.NaiveBayesLab.render(col, 'laplace'); else renderLaplaceSmoothingDemo(col); }
      }
    ],
    evaluation: [
      {
        key: 'confusion_matrix', name: 'Confusion Matrix & Metrics',
        def: 'A 2×2 contingency table of True Positives (TP), False Positives (FP), True Negatives (TN), and False Negatives (FN).',
        notation: 'Accuracy = (TP+TN)/N · Precision = TP/(TP+FP) · Recall = TP/(TP+FN)',
        tip: 'FP = False Alarm (good email marked spam); FN = Missed Detection (spam in your inbox).',
        render: col => { if (window.EvaluationLab) window.EvaluationLab.render(col, 'matrix'); else renderConfusionMatrixStudio(col); }
      },
      {
        key: 'f1_tradeoff', name: 'Precision-Recall Trade-off & F1-Score',
        def: 'F1-Score is the harmonic mean of Precision and Recall. Adjusting the classification threshold trades off false alarms against missed detections.',
        notation: 'F₁ = 2 × (Precision × Recall) / (Precision + Recall) = 2TP / (2TP + FP + FN)',
        tip: 'The harmonic mean heavily penalizes severe imbalances (if Precision is 1.0 but Recall is 0.0, F1 is 0.0).',
        render: col => { if (window.EvaluationLab) window.EvaluationLab.render(col, 'pr'); else renderF1TradeoffStudio(col); }
      }
    ],
    neural_nets: [
      {
        key: 'perceptron_model', name: 'The Perceptron & Linear Boundaries',
        def: 'The foundational computing unit that computes a weighted sum of inputs and applies a threshold activation: h(x) = step(w^T x + b). Fails on XOR.',
        notation: 'z = w^T x + b · h(x) = step(z) · XOR: (0,0)→0, (1,1)→0, (0,1)→1, (1,0)→1',
        tip: 'A single perceptron can only learn linear boundaries. Minsky & Papert (1969) proved it cannot solve XOR — the shallow network lab in the next chips fixes this with one hidden layer.',
        render: col => { if (window.PerceptronLab) window.PerceptronLab.render(col); else renderPerceptronXORDemo(col); }
      },
      {
        key: 'nn_forward', name: 'Forward Pass & Activations', labInConcept: true,
        def: 'A shallow network for XOR: two inputs, one hidden layer of H units with activation g (ReLU, sigmoid or tanh), and one sigmoid output that gives P(y = 1 | x). Biases on every unit; binary cross-entropy loss.',
        notation: 'z = W1 x + b1 · h = g(z) · z_o = W2·h + b2 · ŷ = σ(z_o) · L = −[y log ŷ + (1−y) log(1−ŷ)]',
        tip: 'The output stays sigmoid for every hidden activation, so all comparisons use the same probability model and the same loss.',
        render: col => { if (window.ShallowNNLab) window.ShallowNNLab.render(col, 'forward'); else renderMLPForwardPassStudio(col); }
      },
      {
        key: 'nn_backward', name: 'Backpropagation & Gradient Check', labInConcept: true,
        def: 'Backpropagation applies the chain rule from the loss back to every weight and bias. Each hidden error signal is the output error, sent back through W2 and scaled by the activation derivative g′(z).',
        notation: 'δ_o = ŷ − y · ∂L/∂W2[j] = δ_o h_j · δ_j = δ_o W2[j] g′(z_j) · ∂L/∂W1[j,k] = δ_j x_k · ∂L/∂b1[j] = δ_j',
        tip: 'A finite-difference check, [L(θ+ε) − L(θ−ε)] / 2ε, confirms each analytical gradient. Training uses ReLU′(0) = 0; the check skips ReLU units sitting exactly on the kink.',
        render: col => { if (window.ShallowNNLab) window.ShallowNNLab.render(col, 'backward'); else renderMLPForwardPassStudio(col); }
      },
      {
        key: 'nn_update', name: 'Gradient-Descent Update', labInConcept: true,
        def: 'Gradient descent moves every parameter a small step against its gradient. By default the gradient is the average of the four individual-example gradients (full batch).',
        notation: 'new value = old value − η × gradient · θ⁽ᵗ⁺¹⁾ = θ⁽ᵗ⁾ − η · ḡ · ḡ = ¼ Σᵢ ∂Lᵢ/∂θ',
        tip: 'Think of a hiker in thick fog feeling the slope underfoot: η is the stride length. Too small is slow; too large overshoots the valley.',
        render: col => { if (window.ShallowNNLab) window.ShallowNNLab.render(col, 'update'); else renderGradientDescentBowl(col); }
      },
      {
        key: 'nn_train', name: 'Training on XOR', labInConcept: true,
        def: 'Repeating forward pass → backpropagation → update bends the decision boundary until all four XOR points are on the correct side.',
        notation: 'repeat: ŷ = f(x; θ) → ḡ = ∇θ L̄ → θ ← θ − η ḡ   until L̄ is small',
        tip: 'A loss stuck near ln 2 ≈ 0.693 means the network predicts about 0.5 everywhere — check for inactive or saturated hidden units.',
        render: col => { if (window.ShallowNNLab) window.ShallowNNLab.render(col, 'train'); else renderGradientDescentBowl(col); }
      },
      {
        key: 'nn_compare', name: 'Comparing Activations', labInConcept: true,
        def: 'ReLU, sigmoid and tanh trained from identical initial weights, data, learning rate and number of updates — only the hidden activation g differs.',
        notation: 'σ′(z) ≤ 0.25 · tanh′(z) = 1 − tanh²(z) ≤ 1 · ReLU′(z) ∈ {0, 1}',
        tip: 'Saturation and inactive units shrink or zero the gradient, but which activation trains fastest depends on the seed, width and η. No activation always wins.',
        render: col => { if (window.ShallowNNLab) window.ShallowNNLab.render(col, 'compare'); else renderMLPForwardPassStudio(col); }
      }
    ],
    kmeans: [
      {
        key: 'kmeans_concept', name: 'K-Means Iterative Optimization',
        def: 'Alternating between two steps: (1) Assignment: Assign each point to the nearest centroid; (2) Update: Move centroids to the mean of assigned points.',
        notation: 'Assign: c_i = argmin_k ||x_i - μ_k||² · Update: μ_k = (1/|C_k|) ∑ x_i',
        tip: 'K-Means monotonically decreases Within-Cluster Sum of Squares (WCSS) and is guaranteed to converge in finite steps.',
        render: col => { if (window.KMeansLab) window.KMeansLab.render(col); else renderKMeansInteractive(col); }
      },
      {
        key: 'elbow_method', name: 'Voronoi Tessellation & The Elbow Method',
        def: 'Centroids define convex Voronoi polygon boundaries. The Elbow Method plots WCSS vs K to find the point of diminishing returns.',
        notation: 'WCSS = ∑_{k=1}^K ∑_{x ∈ C_k} ||x - μ_k||² · Optimal K at the "elbow" bend',
        tip: 'Increasing K always lowers WCSS (at K=N, WCSS is 0), so we look for the sharp bend where extra clusters add little value.',
        render: col => { if (window.VoronoiElbowLab) window.VoronoiElbowLab.render(col); else renderElbowMethodCurve(col); }
      }
    ],
    mdp: [
      {
        key: 'mdp_tuple', name: 'MDP Formulation ⟨S, A, P, R, γ⟩',
        def: 'Formal framework for sequential decisions: State space S, Action space A, Transition dynamics P(s\' | s, a), Reward function R(s, a, s\'), and Discount factor γ.',
        notation: 'Return G_t = ∑_{k=0}^∞ γ^k R_{t+k+1} · Discount γ ∈ [0, 1)',
        tip: 'The Markov property asserts that future state transitions depend only on current state s and action a, not past history.',
        render: col => { if (window.MDPLab) window.MDPLab.render(col, 'tuple'); else renderGridWorldEnv(col); }
      },
      {
        key: 'value_functions', name: 'State-Value V(s) & Action-Value Q(s, a)',
        def: 'V^π(s) is expected return starting in state s under policy π. Q^π(s, a) is expected return taking action a in state s then following π.',
        notation: 'V^π(s) = 𝔼_π[G_t | S_t = s] · Q^π(s, a) = 𝔼_π[G_t | S_t = s, A_t = a]',
        tip: 'V(s) measures state goodness; Q(s, a) measures action goodness to guide greedy decision-making.',
        render: col => { if (window.MDPLab) window.MDPLab.render(col, 'values'); else renderValueAndQOverlay(col); }
      }
    ],
    value_iteration: [
      {
        key: 'bellman_optimality', name: 'The Bellman Optimality Equation',
        def: 'The optimal state value V*(s) equals the maximum expected return across all available actions: immediate expected reward plus discounted future value.',
        notation: 'V*(s) = max_{a ∈ A} ∑_{s\'} P(s\' | s, a) [ R(s, a, s\') + γ V*(s\') ]',
        tip: 'Recursive consistency: the optimal value of today equals the best immediate reward plus the discounted optimal value of tomorrow.',
        render: col => { if (window.RLLab) window.RLLab.render(col, 'bellman'); else renderBellmanBackupDiagram(col); }
      },
      {
        key: 'vi_algorithm', name: 'Value Iteration & Policy Extraction',
        def: 'Turns Bellman Optimality into an iterative contraction mapping update V_{k+1}(s) until convergence; extracts optimal policy π*(s) by 1-step lookahead.',
        notation: 'V_{k+1}(s) ← max_a ∑ P(s\' | s, a) [ R + γ V_k(s\') ] · π*(s) = argmax_a [ … ]',
        tip: 'Values diffuse outward from reward states across the grid until reaching steady-state equilibrium.',
        render: col => { if (window.RLLab) window.RLLab.render(col, 'vi'); else renderValueIterationHeatmap(col); }
      }
    ],
    q_learning: [
      {
        key: 'td_error', name: 'Temporal Difference (TD) Learning',
        def: 'Model-free bootstrapping: updates value estimates using the immediate reward and next-state estimate without waiting for episode termination.',
        notation: 'TD Target = r + γ max_{a\'} Q(s\', a\') · TD Error δ = TD Target - Q(s, a)',
        tip: 'TD error measures the "surprise" between expectation and immediate experienced outcome.',
        render: col => { if (window.RLLab) window.RLLab.render(col, 'td'); else renderTDErrorVisualizer(col); }
      },
      {
        key: 'q_learning_rule', name: 'Tabular Q-Learning & ε-Greedy',
        def: 'Off-policy TD control update rule: Q(s,a) ← Q(s,a) + α [ r + γ max_{a\'} Q(s\', a\') - Q(s, a) ]. Balances exploration vs. exploitation via ε.',
        notation: 'Q(s, a) ← Q(s, a) + α [ r + γ max_{a\'} Q(s\', a\') - Q(s, a) ]',
        tip: 'Q-Learning is off-policy because it updates toward the greedy optimal action regardless of which exploratory action was actually taken.',
        render: col => { if (window.RLLab) window.RLLab.render(col, 'qlearn'); else renderQLearningSimulator(col); }
      }
    ],
    comparison: [
      {
        key: 'eval_matrix', name: 'Learning Paradigms Comparison Matrix',
        def: 'Comprehensive evaluation across Supervised Naive Bayes, Neural Networks, K-Means Clustering, Model-Based Value Iteration, and Model-Free Q-Learning.',
        notation: 'NB: Generative MLE · NN: Gradient Descent · K-Means: Lloyd EM · MDP: Dynamic Programming · Q-Learning: TD(0)',
        tip: 'Choose Naive Bayes for fast text baselines; Neural Networks for complex non-linear data; Q-Learning for sequential games and robotics.',
        render: renderEvaluationMatrix
      }
    ],
    code: [
      {
        key: 'code_trace', name: 'Interactive Code Trace',
        def: 'Short Python implementations of text features, Naive Bayes, Perceptron, K-Means, Value Iteration, and Q-Learning, each paired with the values one worked example produces.',
        notation: 'python_sandbox/10_Machine_Learning.py & 11_Reinforcement_Learning.py',
        tip: 'Read the code with the worked values beside it: every formula from the earlier tabs appears here as one or two lines of Python.',
        render: renderCodeTraceView
      }
    ]
  };

  // =========================================================================
  // Page controller — CPP201 concept-page pattern (see CPP201 graphs.js):
  // Topic Buttons (GROUPS) -> Subtopic Tabs (the concepts of the topics in
  // that group) -> one demo panel. ?t=<group>&s=<concept key> deep links;
  // the old #<topic id> hash links still work.
  // =========================================================================
  const GROUPS = [
    { id: 'intro', label: 'From Rules to Learning', topics: ['progression'] },
    { id: 'supervised', label: 'Supervised Learning', topics: ['features', 'naive_bayes', 'evaluation'] },
    { id: 'neural', label: 'Neural Networks', topics: ['neural_nets'] },
    { id: 'unsupervised', label: 'Unsupervised Learning', topics: ['kmeans'] },
    { id: 'rl', label: 'Reinforcement Learning', topics: ['mdp', 'value_iteration', 'q_learning'] },
    { id: 'wrap', label: 'Compare & Trace', topics: ['comparison', 'code'] }
  ];

  function esc(v) {
    return String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function topicIndex(id) { return TOPICS.findIndex(t => t.id === id); }
  function topicShort(id) { return TOPICS[topicIndex(id)].short.replace(/^\d+\s*·\s*/, ''); }
  // Subtopics of a group: every concept of every topic in it, in order.
  function subtopics(g) {
    const out = [];
    g.topics.forEach(tid => (CONCEPTS[tid] || []).forEach(c => out.push({ topic: tid, concept: c })));
    return out;
  }
  function getGroup(id) { return GROUPS.find(g => g.id === id) || GROUPS[0]; }

  let currentGroup = GROUPS[0].id;
  let currentKey = CONCEPTS.progression[0].key;

  function init() {
    if (!document.getElementById('learning-topic-buttons')) return;
    renderBigPicture();
    const params = new URLSearchParams(window.location.search);
    const t = params.get('t'), k = params.get('s');
    if (t && GROUPS.some(g => g.id === t)) {
      currentGroup = t;
      const subs = subtopics(getGroup(t));
      currentKey = (subs.find(x => x.concept.key === k) || subs[0]).concept.key;
    }
    if (!handleHash()) select(currentGroup, currentKey);
    window.addEventListener('hashchange', handleHash);
  }

  // Old links such as learning.html#mdp open that topic's first concept.
  function handleHash() {
    const id = window.location.hash.replace('#', '');
    if (!id || topicIndex(id) < 0) return false;
    const g = GROUPS.find(x => x.topics.indexOf(id) >= 0);
    select(g.id, CONCEPTS[id][0].key);
    return true;
  }

  function select(gid, key, scroll) {
    const g = getGroup(gid), subs = subtopics(g);
    currentGroup = g.id;
    currentKey = (subs.find(x => x.concept.key === key) || subs[0]).concept.key;
    renderTopicButtons();
    renderSubtopicTabs();
    renderDemo();
    const url = new URL(window.location.href);
    url.searchParams.set('t', currentGroup);
    url.searchParams.set('s', currentKey);
    url.hash = '';
    history.replaceState(null, '', url.toString());
    if (scroll) document.getElementById('learning-topic-buttons').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderTopicButtons() {
    const el = document.getElementById('learning-topic-buttons');
    el.innerHTML = GROUPS.map((g, i) =>
      `<button type="button" class="lp-topic-btn${g.id === currentGroup ? ' is-selected' : ''}" data-group="${g.id}"><span class="lp-num">${i}</span>${esc(g.label)}</button>`
    ).join('');
    el.querySelectorAll('[data-group]').forEach(b => b.addEventListener('click', () => select(b.dataset.group)));
  }

  function renderSubtopicTabs() {
    const el = document.getElementById('learning-subtopic-tabs');
    const g = getGroup(currentGroup), multi = g.topics.length > 1;
    el.innerHTML = subtopics(g).map(x =>
      `<button type="button" class="lp-subtopic-tab${x.concept.key === currentKey ? ' is-selected' : ''}" data-key="${x.concept.key}">` +
      (multi ? `<span class="lp-tab-topic">${esc(topicShort(x.topic))}</span>` : '') + `${esc(x.concept.name)}</button>`
    ).join('');
    el.querySelectorAll('[data-key]').forEach(b => b.addEventListener('click', () => select(currentGroup, b.dataset.key)));
  }

  function renderDemo() {
    const demo = document.getElementById('learning-topic-demo');
    const g = getGroup(currentGroup);
    const sub = subtopics(g).find(x => x.concept.key === currentKey);
    const c = sub.concept, tIdx = topicIndex(sub.topic), topic = TOPICS[tIdx];
    demo.querySelector('[data-role="title"]').textContent = c.name;
    demo.querySelector('[data-role="subtitle"]').textContent = g.label + ' · ' + topic.title;

    // Concept strip (lead, definition, formula) above the lab; "Remember" below it (CPP201).
    demo.querySelector('[data-role="concept"]').innerHTML = `
      <div class="lp-concept">
        <p class="lp-intro">${TOPIC_INTROS[tIdx]}</p>
        <div class="lp-explain"><span class="lp-explain-title">Definition</span>${c.def}</div>
        <div class="lp-formula">${c.notation}</div>
      </div>`;
    demo.querySelector('[data-role="remember"]').innerHTML =
      `<div class="lp-remember"><div class="lp-remember-title">Remember</div><ul><li>${c.tip}</li></ul></div>`;

    // Lab: labs that put controls in the concept column get two columns.
    const grid = demo.querySelector('[data-role="lab"]');
    const ccol = document.getElementById('learning-concept-col');
    const gcol = document.getElementById('learning-graph-col');
    grid.classList.toggle('is-single', !c.labInConcept);
    ccol.innerHTML = c.labInConcept ? '<div class="lr-concept-lab" id="lr-concept-lab"></div>' : '';
    gcol.innerHTML = '';
    if (typeof c.render === 'function') c.render(gcol);
    if (window.lucide) window.lucide.createIcons();
  }

  // Big picture: one card per learning paradigm (CPP201 .tre-bp-card).
  function renderBigPicture() {
    const el = document.getElementById('learning-bp-cards');
    if (!el) return;
    const B = '#1b4f9c', G = '#3f8f2f', A = '#b9770e', R = '#c0392b', L = '#c3cdda';
    const svg = (body) => `<svg viewBox="0 0 240 110" aria-hidden="true">${body}</svg>`;
    const dot = (x, y, f) => `<circle cx="${x}" cy="${y}" r="5" fill="${f}"/>`;
    const cards = [
      { g: 'supervised', title: 'Supervised', rule: 'labelled (x, y) → h(x) ≈ y',
        pic: svg([[40,30,R],[60,48,R],[35,62,R],[70,25,R],[150,70,B],[175,52,B],[190,85,B],[165,90,B]].map(p => dot(p[0],p[1],p[2])).join('') +
          `<line x1="60" y1="100" x2="175" y2="10" stroke="${G}" stroke-width="3" stroke-dasharray="6 4"/><text x="18" y="100" font-size="11" font-weight="700" fill="${R}">spam</text><text x="190" y="105" font-size="11" font-weight="700" fill="${B}">ham</text>`),
        foot: 'A teacher gives the answer for every example.' },
      { g: 'neural', title: 'Neural Networks', rule: 'ŷ = σ(W₂ g(W₁x + b₁) + b₂)',
        pic: svg((() => { const I = [[40,35],[40,75]], H = [[120,20],[120,55],[120,90]], O = [[200,55]]; let s = '';
          I.forEach(i => H.forEach(h => { s += `<line x1="${i[0]}" y1="${i[1]}" x2="${h[0]}" y2="${h[1]}" stroke="${L}" stroke-width="2"/>`; }));
          H.forEach(h => O.forEach(o => { s += `<line x1="${h[0]}" y1="${h[1]}" x2="${o[0]}" y2="${o[1]}" stroke="${L}" stroke-width="2"/>`; }));
          I.concat(H, O).forEach((n, k) => { s += `<circle cx="${n[0]}" cy="${n[1]}" r="11" fill="#fff" stroke="${k < 2 ? B : k < 5 ? G : A}" stroke-width="3"/>`; });
          return s; })()),
        foot: 'Gradients flow back through hidden layers to fix the error.' },
      { g: 'unsupervised', title: 'Unsupervised', rule: 'no labels → clusters C₁ … C_K',
        pic: svg([[[45,40],[60,55],[40,65],[58,30]],[[120,75],[135,90],[110,92],[130,70]],[[185,30],[200,45],[178,50],[205,25]]].map((cl, k) => {
          const col = [B, G, A][k], cx = cl.reduce((a, p) => a + p[0], 0) / 4, cy = cl.reduce((a, p) => a + p[1], 0) / 4;
          return cl.map(p => dot(p[0], p[1], col)).join('') + `<path d="M${cx - 7} ${cy - 7}L${cx + 7} ${cy + 7}M${cx + 7} ${cy - 7}L${cx - 7} ${cy + 7}" stroke="#0e2f5c" stroke-width="3"/>`;
        }).join('')),
        foot: 'The algorithm finds the groups on its own.' },
      { g: 'rl', title: 'Reinforcement Learning', rule: 's —a→ r, s′ · maximise Σ γᵗ r',
        pic: svg((() => { let s = ''; for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
            const x = 30 + c * 46, y = 8 + r * 32, goal = r === 0 && c === 3, pit = r === 1 && c === 3, wall = r === 1 && c === 1;
            s += `<rect x="${x}" y="${y}" width="44" height="30" rx="3" fill="${goal ? '#e9f7ee' : pit ? '#fdecea' : wall ? '#c3cdda' : '#fff'}" stroke="${L}" stroke-width="1.5"/>`;
            if (goal) s += `<text x="${x + 22}" y="${y + 20}" text-anchor="middle" font-size="12" font-weight="800" fill="${G}">+1</text>`;
            if (pit) s += `<text x="${x + 22}" y="${y + 20}" text-anchor="middle" font-size="12" font-weight="800" fill="${R}">−1</text>`;
          }
          return s + `<circle cx="52" cy="87" r="9" fill="${B}"/><path d="M64 87 H108 M108 87 V30 M108 24 H156" fill="none" stroke="${B}" stroke-width="2.5" stroke-dasharray="5 3"/>`; })()),
        foot: 'Trial, error and a delayed reward teach a policy π(s).' }
    ];
    el.innerHTML = cards.map((c, i) =>
      `<div class="lp-card" tabindex="0" role="button" data-bp="${i}"><h3 class="lp-card-title">${c.title}</h3><p class="lp-card-rule"><code>${esc(c.rule)}</code></p>${c.pic}<p class="lp-card-foot">${c.foot} <strong>Open &rarr;</strong></p></div>`
    ).join('');
    el.querySelectorAll('[data-bp]').forEach(n => {
      const go = () => select(cards[+n.dataset.bp].g, null, true);
      n.addEventListener('click', go);
      n.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
  }

  // Quick check (CPP201 pattern): [{q, options, answer, why}] into el.
  function quickCheck(el, qs, cols) {
    const picks = {};
    function paint() {
      el.innerHTML = `<div class="lp-quiz" style="grid-template-columns:repeat(${cols || 3},minmax(0,1fr))">` + qs.map((q, i) => {
        const p = picks[i];
        return `<div class="lp-q"><div class="lp-q-text">${i + 1}. ${esc(q.q)}</div><div class="lp-opts">` +
          q.options.map(o => {
            const cls = p === undefined ? '' : o === q.answer ? ' is-answer' : o === p ? ' is-wrong-pick' : '';
            return `<button type="button" class="lp-opt${cls}" data-q="${i}" data-v="${esc(o)}"${p === undefined ? '' : ' disabled'}>${esc(o)}</button>`;
          }).join('') + '</div>' +
          (p === undefined ? '' : `<div class="lp-status ${p === q.answer ? 'is-right' : 'is-wrong'}"><strong>${p === q.answer ? 'Correct.' : 'Not quite.'}</strong> ${p === q.answer ? '' : 'Answer: <strong>' + esc(q.answer) + '</strong>. '}${q.why}</div>`) + '</div>';
      }).join('') + '</div>';
      el.querySelectorAll('[data-q]').forEach(b => b.addEventListener('click', () => { picks[b.dataset.q] = b.dataset.v; paint(); }));
    }
    paint();
  }

  // =========================================================================
  // Illustration Renderers for Each Concept
  // =========================================================================

  // --- Topic 0: Evolution Overview ---
  function renderProgressionOverview(container) {
    container.innerHTML = `
      <div style="padding: 1.2rem; height: 100%; display: flex; flex-direction: column; justify-content: space-between;">
        <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.5rem;">
          Rules vs. Data-Driven Empirical Learning
        </h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; flex: 1;">
          <div class="glass-panel" style="padding: 0.8rem; border-radius: 8px; background: rgba(192, 57, 43,0.08); border-left: 4px solid #c0392b;">
            <div style="font-weight: 700; color: #922b21; font-size: 0.8rem; margin-bottom: 0.3rem;">Handcrafted Rules (Topics 1-5)</div>
            <p style="font-size: 0.76rem; color: #7b241c; line-height: 1.4;">
              Requires human experts to enumerate all possibilities. Brittle, expensive to maintain, and fails in complex perceptual domains.
            </p>
          </div>
          <div class="glass-panel" style="padding: 0.8rem; border-radius: 8px; background: rgba(46, 139, 71,0.1); border-left: 4px solid #2e8b47;">
            <div style="font-weight: 700; color: #1f5e30; font-size: 0.8rem; margin-bottom: 0.3rem;">Machine Learning (Topic 6)</div>
            <p style="font-size: 0.76rem; color: #2a7a3f; line-height: 1.4;">
              Algorithms automatically extract statistical patterns, feature weights, and decision policies directly from empirical datasets.
            </p>
          </div>
        </div>
      </div>
    `;
  }

  function renderFourParadigms(container) {
    container.innerHTML = `
      <div style="padding: 1.2rem; height: 100%; display: flex; flex-direction: column; justify-content: space-around;">
        <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-primary);">The Four Learning Paradigms</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
          <div class="glass-panel" style="padding: 0.6rem; border-radius: 6px; background: #ffffff;">
            <div style="font-size: 0.75rem; font-weight: 700; color: #2e8b47;">1. Supervised Learning</div>
            <div style="font-size: 0.7rem; color: #55606f;">Pairs ⟨x, y⟩ with teacher feedback</div>
          </div>
          <div class="glass-panel" style="padding: 0.6rem; border-radius: 6px; background: #ffffff;">
            <div style="font-size: 0.75rem; font-weight: 700; color: #2461c0;">2. Neural Networks</div>
            <div style="font-size: 0.7rem; color: #55606f;">Non-linear representation learning</div>
          </div>
          <div class="glass-panel" style="padding: 0.6rem; border-radius: 6px; background: #ffffff;">
            <div style="font-size: 0.75rem; font-weight: 700; color: #b9770e;">3. Unsupervised (K-Means)</div>
            <div style="font-size: 0.7rem; color: #55606f;">Clusters unlabeled data points</div>
          </div>
          <div class="glass-panel" style="padding: 0.6rem; border-radius: 6px; background: #ffffff;">
            <div style="font-size: 0.75rem; font-weight: 700; color: #2461c0;">4. Reinforcement Learning</div>
            <div style="font-size: 0.7rem; color: #55606f;">Sequential actions & reward feedback</div>
          </div>
        </div>
      </div>
    `;
  }

  function renderStaticVsSequential(container) {
    container.innerHTML = `
      <div style="padding: 1.2rem; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center;">
        <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.75rem;">
          Static Prediction vs. Closed-Loop Sequential Actions
        </h3>
        <div style="display: flex; gap: 1rem; width: 100%; max-width: 480px;">
          <div class="glass-panel" style="flex: 1; padding: 0.8rem; border-radius: 8px; background: #ffffff; text-align: center;">
            <div style="font-weight: 700; color: #2e8b47; font-size: 0.8rem;">Classifier (Static)</div>
            <div style="font-size: 0.72rem; color: #55606f; margin-top: 0.3rem;">Email Text → [Spam / Ham]</div>
          </div>
          <div style="font-size: 1.2rem; color: #8a94a3; display: flex; align-items: center;">⇄</div>
          <div class="glass-panel" style="flex: 1; padding: 0.8rem; border-radius: 8px; background: #ffffff; text-align: center;">
            <div style="font-weight: 700; color: #2461c0; font-size: 0.8rem;">RL Agent (Sequential)</div>
            <div style="font-size: 0.72rem; color: #55606f; margin-top: 0.3rem;">State → Action → Reward → State'</div>
          </div>
        </div>
      </div>
    `;
  }

  // --- Topic 1: Text Features (BoW & TF-IDF) ---
  function renderBagOfWordsVisualizer(container) {
    const sampleDoc = "Win lottery cash prize click here for free lottery cash prize";
    const tokens = M ? M.tokenize(sampleDoc) : ['win', 'lottery', 'cash', 'prize', 'click', 'free'];
    const counts = {};
    tokens.forEach(t => { counts[t] = (counts[t] || 0) + 1; });

    container.innerHTML = `
      <div style="padding: 1rem; height: 100%; display: flex; flex-direction: column; justify-content: space-between;">
        <h3 style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary);">Bag-of-Words Word Frequency Spikes</h3>
        <div style="font-size: 0.74rem; background: rgba(16, 32, 64,0.04); padding: 0.5rem; border-radius: 6px; color: #2c3644; margin-bottom: 0.5rem;">
          <strong>Sample Email:</strong> "${sampleDoc}"
        </div>
        <div style="flex: 1; display: flex; flex-direction: column; gap: 0.4rem; justify-content: center;">
          ${Object.entries(counts).map(([word, c]) => `
            <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem;">
              <span style="width: 60px; font-weight: 600; color: #2c3644; text-align: right;">${word}</span>
              <div style="flex: 1; height: 12px; background: rgba(16, 32, 64,0.06); border-radius: 4px; overflow: hidden;">
                <div style="width: ${c * 35}%; height: 100%; background: #3a78d4;"></div>
              </div>
              <span style="font-weight: 700; color: #2461c0; width: 20px;">${c}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderTFIDFStudio(container) {
    container.innerHTML = `
      <div style="padding: 1rem; height: 100%; display: flex; flex-direction: column; justify-content: space-around;">
        <h3 style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary);">TF-IDF Importance Weighting</h3>
        <table style="width: 100%; font-size: 0.75rem; text-align: center; border-collapse: collapse; background: #ffffff; border-radius: 8px; overflow: hidden;">
          <thead style="background: rgba(36, 97, 192,0.1); color: #2461c0;">
            <tr><th style="padding: 5px;">Term</th><th>TF (Local)</th><th>IDF (Global)</th><th>TF-IDF Score</th></tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid rgba(16, 32, 64,0.05);"><td style="padding: 4px; font-weight:600;">the</td><td>0.15</td><td style="color:#c0392b;">0.05 (Common)</td><td><strong>0.007</strong></td></tr>
            <tr style="border-bottom: 1px solid rgba(16, 32, 64,0.05);"><td style="padding: 4px; font-weight:600;">meeting</td><td>0.08</td><td>1.45 (Medium)</td><td><strong>0.116</strong></td></tr>
            <tr><td style="padding: 4px; font-weight:600;">lottery</td><td>0.20</td><td style="color:#2e8b47;">3.20 (Rare!)</td><td style="color:#2e8b47; font-weight:800;">0.640</td></tr>
          </tbody>
        </table>
        <div style="font-size: 0.72rem; color: #55606f;">
          TF-IDF suppresses common filler words and magnifies rare topic markers.
        </div>
      </div>
    `;
  }

  // --- Topic 2: Naive Bayes ---
  function renderNaiveBayesClassifierStudio(container) {
    const dataset = M ? M.getSampleSpamDataset() : null;
    const nb = M ? new M.NaiveBayesClassifier(1.0) : null;
    if (nb && dataset) {
      nb.fit(dataset.trainDocs, dataset.trainLabels);
    }

    const testDoc = "win lottery prize money";
    const res = nb ? nb.predictLogPosterior(testDoc) : { predictedClass: 'Spam', probabilities: { Spam: 0.94, Ham: 0.06 } };

    container.innerHTML = `
      <div style="padding: 1rem; height: 100%; display: flex; flex-direction: column; justify-content: space-between;">
        <h3 style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary);">Naive Bayes Posterior Probability</h3>
        <div style="font-size: 0.74rem; background: rgba(16, 32, 64,0.04); padding: 0.5rem; border-radius: 6px; color: #2c3644;">
          <strong>Classifying:</strong> "${testDoc}"
        </div>
        <div class="glass-panel" style="padding: 0.8rem; border-radius: 8px; background: #ffffff;">
          <div style="display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 700; margin-bottom: 0.3rem;">
            <span style="color: #c0392b;">P(Spam | text) = ${(res.probabilities.Spam * 100).toFixed(1)}%</span>
            <span style="color: #2e8b47;">P(Ham | text) = ${(res.probabilities.Ham * 100).toFixed(1)}%</span>
          </div>
          <div style="height: 14px; background: rgba(16, 32, 64,0.08); border-radius: 999px; overflow: hidden; display: flex;">
            <div style="width: ${(res.probabilities.Spam * 100)}%; height: 100%; background: #c0392b;"></div>
            <div style="width: ${(res.probabilities.Ham * 100)}%; height: 100%; background: #2e8b47;"></div>
          </div>
        </div>
        <div style="font-size: 0.72rem; color: #2a7a3f; font-weight: 700; background: #e9f7ee; padding: 0.4rem; border-radius: 4px; text-align: center;">
          Decision: Class = ${res.predictedClass} (MAP Decision Rule)
        </div>
      </div>
    `;
  }

  function renderLaplaceSmoothingDemo(container) {
    container.innerHTML = `
      <div style="padding: 1rem; height: 100%; display: flex; flex-direction: column; justify-content: space-around;">
        <h3 style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary);">Laplace Smoothing (Zero-Probability Defense)</h3>
        <div class="glass-panel" style="padding: 0.8rem; border-radius: 8px; background: rgba(192, 57, 43,0.08); border-left: 4px solid #c0392b;">
          <div style="font-size: 0.78rem; font-weight: 700; color: #922b21;">Without Smoothing (α = 0)</div>
          <div style="font-family: monospace; font-size: 0.74rem; color: #7b241c; margin-top: 2px;">
            P("new_word" | Spam) = 0 / 100 = 0.0 &rarr; ∏ P(w | c) = <strong>0.0!</strong> (Fails)
          </div>
        </div>
        <div class="glass-panel" style="padding: 0.8rem; border-radius: 8px; background: rgba(46, 139, 71,0.1); border-left: 4px solid #2e8b47;">
          <div style="font-size: 0.78rem; font-weight: 700; color: #1f5e30;">With Laplace Add-1 (α = 1)</div>
          <div style="font-family: monospace; font-size: 0.74rem; color: #2a7a3f; margin-top: 2px;">
            P("new_word" | Spam) = (0 + 1) / (100 + |V|) &gt; 0.0 &rarr; Stable!
          </div>
        </div>
      </div>
    `;
  }

  // --- Topic 3: Model Evaluation ---
  function renderConfusionMatrixStudio(container) {
    const tp = 85, fp = 15, fn = 10, tn = 890;
    const total = tp + fp + fn + tn;
    const acc = ((tp + tn) / total * 100).toFixed(1);
    const prec = (tp / (tp + fp) * 100).toFixed(1);
    const rec = (tp / (tp + fn) * 100).toFixed(1);
    const f1 = (2 * (tp / (tp + fp)) * (tp / (tp + fn)) / ((tp / (tp + fp)) + (tp / (tp + fn))) * 100).toFixed(1);

    container.innerHTML = `
      <div style="padding: 1rem; height: 100%; display: flex; flex-direction: column; justify-content: space-between;">
        <h3 style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary);">Confusion Matrix (2×2 Contingency Table)</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; text-align: center; font-size: 0.75rem;">
          <div style="padding: 6px; background: #e9f7ee; border: 1px solid #2e8b47; border-radius: 4px;">
            <div style="color: #2e8b47; font-weight: 700;">TP = ${tp}</div>
            <div style="font-size: 0.68rem; color: #2a7a3f;">True Positive</div>
          </div>
          <div style="padding: 6px; background: #fdecea; border: 1px solid #c0392b; border-radius: 4px;">
            <div style="color: #c0392b; font-weight: 700;">FN = ${fn}</div>
            <div style="font-size: 0.68rem; color: #922b21;">False Negative</div>
          </div>
          <div style="padding: 6px; background: #fdecea; border: 1px solid #c0392b; border-radius: 4px;">
            <div style="color: #c0392b; font-weight: 700;">FP = ${fp}</div>
            <div style="font-size: 0.68rem; color: #922b21;">False Positive</div>
          </div>
          <div style="padding: 6px; background: #e9f7ee; border: 1px solid #2e8b47; border-radius: 4px;">
            <div style="color: #2e8b47; font-weight: 700;">TN = ${tn}</div>
            <div style="font-size: 0.68rem; color: #2a7a3f;">True Negative</div>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; font-size: 0.72rem; text-align: center; margin-top: 0.4rem;">
          <div style="background: rgba(16, 32, 64,0.04); padding: 4px; border-radius: 4px;">Acc: <strong>${acc}%</strong></div>
          <div style="background: rgba(16, 32, 64,0.04); padding: 4px; border-radius: 4px;">Prec: <strong>${prec}%</strong></div>
          <div style="background: rgba(16, 32, 64,0.04); padding: 4px; border-radius: 4px;">Rec: <strong>${rec}%</strong></div>
          <div style="background: rgba(46, 139, 71,0.15); padding: 4px; border-radius: 4px; color: #2a7a3f;">F1: <strong>${f1}%</strong></div>
        </div>
      </div>
    `;
  }

  function renderF1TradeoffStudio(container) {
    container.innerHTML = `
      <div style="padding: 1rem; height: 100%; display: flex; flex-direction: column; justify-content: space-around;">
        <h3 style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary);">Precision vs. Recall Trade-off</h3>
        <div class="glass-panel" style="padding: 0.8rem; border-radius: 8px; background: #ffffff;">
          <div style="font-size: 0.76rem; color: #55606f; line-height: 1.4;">
            Higher classification threshold &rarr; Higher <strong>Precision</strong> (fewer false alarms) but lower <strong>Recall</strong>.
          </div>
        </div>
        <div style="font-size: 0.72rem; color: #2e8b47; font-weight: 700; background: #e9f7ee; padding: 0.5rem; border-radius: 6px; text-align: center;">
          F1-Score balances Precision & Recall via harmonic mean: 2(P·R)/(P+R).
        </div>
      </div>
    `;
  }

  // --- Topic 4: Neural Networks ---
  function renderPerceptronXORDemo(container) {
    container.innerHTML = `
      <div style="padding: 1rem; height: 100%; display: flex; flex-direction: column; justify-content: space-around;">
        <h3 style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary);">Perceptron & The XOR Limit</h3>
        <div style="display: flex; gap: 0.5rem; justify-content: center;">
          <div style="width: 140px; height: 110px; background: #ffffff; border: 1px solid rgba(16, 32, 64,0.1); border-radius: 6px; position: relative;">
            <span style="position: absolute; top: 4px; left: 6px; font-size: 0.65rem; color: #55606f;">AND (Linearly Separable)</span>
            <div style="width: 100%; height: 2px; background: #2e8b47; position: absolute; top: 50%; transform: rotate(-35deg);"></div>
          </div>
          <div style="width: 140px; height: 110px; background: #ffffff; border: 1px solid #c0392b; border-radius: 6px; position: relative;">
            <span style="position: absolute; top: 4px; left: 6px; font-size: 0.65rem; color: #c0392b; font-weight: 700;">XOR (Non-Separable!)</span>
            <div style="font-size: 0.68rem; color: #c0392b; text-align: center; margin-top: 40px;">No single straight line can separate XOR!</div>
          </div>
        </div>
      </div>
    `;
  }

  function renderMLPForwardPassStudio(container) {
    container.innerHTML = `
      <div style="padding: 1rem; height: 100%; display: flex; flex-direction: column; justify-content: space-between;">
        <h3 style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary);">Multi-Layer Perceptron (2-Layer Forward Pass)</h3>
        <div style="display: flex; justify-content: space-around; align-items: center; flex: 1;">
          <div style="text-align: center;">
            <div style="font-size: 0.7rem; color: #55606f;">Inputs</div>
            <div style="width: 24px; height: 24px; border-radius: 50%; background: #3a78d4; margin: 4px auto;"></div>
            <div style="width: 24px; height: 24px; border-radius: 50%; background: #3a78d4; margin: 4px auto;"></div>
          </div>
          <div style="color: #8a94a3;">&rarr; W₁ &rarr;</div>
          <div style="text-align: center;">
            <div style="font-size: 0.7rem; color: #7c3aed;">Hidden (ReLU)</div>
            <div style="width: 28px; height: 28px; border-radius: 50%; background: #7c3aed; margin: 4px auto;"></div>
            <div style="width: 28px; height: 28px; border-radius: 50%; background: #7c3aed; margin: 4px auto;"></div>
          </div>
          <div style="color: #8a94a3;">&rarr; W₂ &rarr;</div>
          <div style="text-align: center;">
            <div style="font-size: 0.7rem; color: #2e8b47;">Output (σ)</div>
            <div style="width: 30px; height: 30px; border-radius: 50%; background: #2e8b47; margin: 4px auto;"></div>
          </div>
        </div>
      </div>
    `;
  }

  function renderGradientDescentBowl(container) {
    container.innerHTML = `
      <div style="padding: 1rem; height: 100%; display: flex; flex-direction: column; justify-content: space-around;">
        <h3 style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary);">Loss Surface & Gradient Descent</h3>
        <div style="width: 100%; height: 100px; border-radius: 8px; background: linear-gradient(135deg, #0e2f5c, #2461c0, #3a78d4); display: flex; align-items: center; justify-content: center; position: relative;">
          <div style="width: 16px; height: 16px; border-radius: 50%; background: #d4911a; border: 2px solid #ffffff; position: absolute; top: 20px; left: 30px;"></div>
          <div style="font-size: 0.75rem; color: #ffffff; font-weight: 700;">w ← w - α ∇L (Step downhill)</div>
        </div>
      </div>
    `;
  }

  // --- Topic 5: K-Means Clustering ---
  function renderKMeansInteractive(container) {
    container.innerHTML = `
      <div style="padding: 1rem; height: 100%; display: flex; flex-direction: column; justify-content: space-between;">
        <h3 style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary);">K-Means 2-Step Iterative Cycle</h3>
        <div style="display: flex; gap: 0.5rem; flex: 1; align-items: center;">
          <div class="glass-panel" style="flex: 1; padding: 0.6rem; border-radius: 6px; background: rgba(36, 97, 192,0.1); text-align: center;">
            <div style="font-weight: 700; color: #2461c0; font-size: 0.75rem;">1. Assignment Step</div>
            <div style="font-size: 0.68rem; color: #2c3644; margin-top: 2px;">Assign points to closest centroid μ_k</div>
          </div>
          <div style="color: #8a94a3;">&rarr;</div>
          <div class="glass-panel" style="flex: 1; padding: 0.6rem; border-radius: 6px; background: rgba(212, 145, 26,0.1); text-align: center;">
            <div style="font-weight: 700; color: #b9770e; font-size: 0.75rem;">2. Update Step</div>
            <div style="font-size: 0.68rem; color: #2c3644; margin-top: 2px;">Move centroids to cluster mean</div>
          </div>
        </div>
      </div>
    `;
  }

  function renderElbowMethodCurve(container) {
    container.innerHTML = `
      <div style="padding: 1rem; height: 100%; display: flex; flex-direction: column; justify-content: space-around;">
        <h3 style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary);">The Elbow Method for Selecting K</h3>
        <div style="background: #ffffff; padding: 0.6rem; border-radius: 8px; border: 1px solid rgba(16, 32, 64,0.08); font-size: 0.72rem;">
          <div style="display: flex; justify-content: space-between; font-weight: 600;">
            <span>K=1: WCSS = 520</span>
            <span>K=2: WCSS = 210</span>
            <span style="color: #2e8b47; font-weight: 800;">K=3: WCSS = 75 (Elbow!)</span>
            <span>K=4: WCSS = 62</span>
          </div>
        </div>
      </div>
    `;
  }

  // --- Topic 6 & 7 & 8: RL, Value Iteration & Q-Learning ---
  function renderGridWorldEnv(container) {
    container.innerHTML = `
      <div style="padding: 1rem; height: 100%; display: flex; flex-direction: column;">
        <h3 style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.4rem;">4×3 Grid World MDP</h3>
        <div style="flex: 1; display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; background: rgba(16, 32, 64,0.05); padding: 4px; border-radius: 6px; font-size: 0.72rem; text-align: center;">
          <div style="background:#fff; border-radius:4px; padding:6px;">(1,3)</div>
          <div style="background:#fff; border-radius:4px; padding:6px;">(2,3)</div>
          <div style="background:#fff; border-radius:4px; padding:6px;">(3,3)</div>
          <div style="background:#e9f7ee; color:#2e8b47; font-weight:700; border-radius:4px; padding:6px;">+1.0 Goal</div>

          <div style="background:#fff; border-radius:4px; padding:6px;">(1,2)</div>
          <div style="background:#2c3644; color:#fff; border-radius:4px; padding:6px;">WALL</div>
          <div style="background:#fff; border-radius:4px; padding:6px;">(3,2)</div>
          <div style="background:#fdecea; color:#c0392b; font-weight:700; border-radius:4px; padding:6px;">-1.0 Pit</div>

          <div style="background:#e8f0fc; color:#2461c0; font-weight:700; border-radius:4px; padding:6px;">Start (1,1)</div>
          <div style="background:#fff; border-radius:4px; padding:6px;">(2,1)</div>
          <div style="background:#fff; border-radius:4px; padding:6px;">(3,1)</div>
          <div style="background:#fff; border-radius:4px; padding:6px;">(4,1)</div>
        </div>
      </div>
    `;
  }

  function renderValueAndQOverlay(container) {
    container.innerHTML = `
      <div style="padding: 1rem; height: 100%; display: flex; flex-direction: column; justify-content: space-around;">
        <h3 style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary);">V(s) vs. Q(s, a)</h3>
        <div style="font-size: 0.75rem; color: #55606f; line-height: 1.4;">
          <strong>V(s):</strong> Evaluates the long-term goodness of state s.<br>
          <strong>Q(s, a):</strong> Evaluates the long-term goodness of taking action a in state s.
        </div>
      </div>
    `;
  }

  function renderBellmanBackupDiagram(container) {
    container.innerHTML = `
      <div style="padding: 1rem; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center;">
        <h3 style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.5rem;">Bellman Optimality Backup</h3>
        <div style="font-family: monospace; font-size: 0.75rem; background: #ffffff; padding: 0.6rem; border-radius: 6px; border: 1px solid rgba(16, 32, 64,0.1); color: #2c3644;">
          V*(s) = max_a ∑ P(s' | s, a) [ R(s, a, s') + γ V*(s') ]
        </div>
      </div>
    `;
  }

  function renderValueIterationHeatmap(container) {
    container.innerHTML = `
      <div style="padding: 1rem; height: 100%; display: flex; flex-direction: column; justify-content: space-between;">
        <h3 style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary);">Value Iteration Equilibrium Values</h3>
        <div style="font-size: 0.72rem; color: #2a7a3f; font-weight: 600; text-align: center;">
          Values diffuse outward from +1.0 goal (γ = 0.99, R = -0.04)
        </div>
      </div>
    `;
  }

  function renderTDErrorVisualizer(container) {
    container.innerHTML = `
      <div style="padding: 1rem; height: 100%; display: flex; flex-direction: column; justify-content: space-around;">
        <h3 style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary);">Temporal Difference (TD) Error</h3>
        <div style="font-family: monospace; font-size: 0.74rem; background: #ffffff; padding: 0.6rem; border-radius: 6px; border-left: 3px solid #2461c0;">
          δ = [ r + γ max_{a'} Q(s', a') ] - Q(s, a)
        </div>
      </div>
    `;
  }

  function renderQLearningSimulator(container) {
    container.innerHTML = `
      <div style="padding: 1rem; height: 100%; display: flex; flex-direction: column; justify-content: space-between;">
        <h3 style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary);">Tabular Q-Learning Updates</h3>
        <div style="font-family: monospace; font-size: 0.74rem; background: #e9f7ee; padding: 0.6rem; border-radius: 6px; color: #2a7a3f;">
          Q(s, a) ← Q(s, a) + α [ r + γ max Q(s', a') - Q(s, a) ]
        </div>
      </div>
    `;
  }

  // --- Topic 9: Evaluation Matrix ---
  function renderEvaluationMatrix(container) {
    const ROWS = [
      ['Naive Bayes', 'Supervised', 'labels', 'MLE counts + Laplace', 'O(N · d)', 'fast text baselines'],
      ['Neural Network', 'Supervised', 'labels', 'Gradient descent', 'O(N · epochs · |W|)', 'non-linear patterns (XOR, images)'],
      ['K-Means', 'Unsupervised', 'none', "Lloyd's algorithm", 'O(N · K · d · iters)', 'finding groups without labels'],
      ['Value Iteration', 'Model-based RL', 'known P, R', 'Bellman dynamic programming', 'O(|A| · |S|²) per sweep', 'planning when the model is known'],
      ['Q-Learning', 'Model-free RL', 'reward only', 'TD bootstrapping', 'O(1) per step', 'learning by trial and error']
    ];
    let hl = 0;
    function paint() {
      container.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:12px">
          <table class="lp-table"><thead><tr><th>System</th><th>Paradigm</th><th>Feedback</th><th>How it learns</th><th>Cost</th><th>Use it for</th></tr></thead><tbody>
          ${ROWS.map((r, i) => `<tr data-row="${i}"${i === hl ? ' class="is-hl"' : ''}>${r.map((c, j) => j === 0 ? `<td><strong>${c}</strong></td>` : `<td${j === 4 ? ' style="font-family:var(--font-mono);font-size:0.8rem"' : ''}>${c}</td>`).join('')}</tr>`).join('')}
          </tbody></table>
          <div data-qc></div>
        </div>`;
      container.querySelectorAll('[data-row]').forEach(tr => tr.addEventListener('click', () => { hl = +tr.dataset.row; paint(); }));
      const opts = ['Naive Bayes', 'Neural Network', 'K-Means', 'Value Iteration', 'Q-Learning'];
      quickCheck(container.querySelector('[data-qc]'), [
        { q: '10,000 emails labelled spam / ham. You need a fast, strong baseline today.', options: opts, answer: 'Naive Bayes', why: 'Counting words per class is one pass over the data and works well on text.' },
        { q: 'Group 50,000 customers by behaviour. Nobody has labelled them.', options: opts, answer: 'K-Means', why: 'No labels means unsupervised learning: let the data form the groups.' },
        { q: 'A robot vacuum learns a route from bumps and rewards; nobody gives it a map.', options: opts, answer: 'Q-Learning', why: 'Model-free: it learns Q(s, a) from experienced transitions, without knowing P.' },
        { q: 'The grid world, its slip probabilities and rewards are fully known. Find π*.', options: opts, answer: 'Value Iteration', why: 'With P and R known you can plan directly with Bellman backups; no trial and error needed.' }
      ], 2);
    }
    paint();
  }

  // --- Topic 10: Code Trace ---
  function renderCodeTraceView(container) {
    const presets = [
      { id: 'tfidf', name: 'TF-IDF', file: 'python_sandbox/10_Machine_Learning.py' },
      { id: 'nb', name: 'Naive Bayes predict', file: 'python_sandbox/10_Machine_Learning.py' },
      { id: 'perceptron', name: 'Perceptron update', file: 'python_sandbox/10_Machine_Learning.py' },
      { id: 'kmeans', name: 'K-Means step', file: 'python_sandbox/10_Machine_Learning.py' },
      { id: 'vi', name: 'Value Iteration step', file: 'python_sandbox/11_Reinforcement_Learning.py' },
      { id: 'ql', name: 'Q-Learning TD update', file: 'python_sandbox/11_Reinforcement_Learning.py' }
    ];
    let selected = 'tfidf', active = 0;
    function py(line) {
      let t = esc(line), tail = '';
      const cm = t.indexOf('#');
      if (cm >= 0) { tail = `<span style="color:#8a94a3;font-style:italic">${t.slice(cm)}</span>`; t = t.slice(0, cm); }
      t = t.replace(/\b(def|return|for|in|if|else|elif|while|import|from|not|and|or|None|True|False|max|min|sum|range|len)\b/g, '<strong style="color:var(--color-blue-700)">$1</strong>');
      return t + tail;
    }
    function paint() {
      const p = presets.find(x => x.id === selected);
      const lines = getCodeSnippet(selected).replace(/^\n+|\s+$/g, '').split('\n');
      container.innerHTML = `
        <div class="lp-pills">${presets.map(x => `<button type="button" class="lp-pill${x.id === selected ? ' is-active' : ''}" data-pid="${x.id}">${x.name}</button>`).join('')}</div>
        <div class="lp-trace">
          <div class="lp-code-panel"><div class="lp-code-file">${p.file}</div><pre class="lp-code">${lines.map((l, i) =>
            `<div class="lp-line${i === active ? ' is-active' : ''}" data-ln="${i}"><span class="lp-line-arrow">${i === active ? '&#9654;' : ''}</span><span class="lp-line-no">${i + 1}</span><span class="lp-line-code">${py(l)}</span></div>`).join('')}</pre></div>
          <div class="lp-vars-panel"><div class="lp-vars-title">Worked example: variable values</div><pre class="lp-vars-body">${esc(getRuntimeState(selected).trim())}</pre></div>
        </div>
        <p style="margin:10px 0 0;font-size:0.82rem;color:var(--color-text-muted)">Click a line to point at it while you explain; the right panel shows the values for one worked example.</p>`;
      container.querySelectorAll('[data-pid]').forEach(b => b.addEventListener('click', () => { selected = b.dataset.pid; active = 0; paint(); }));
      container.querySelectorAll('[data-ln]').forEach(l => l.addEventListener('click', () => { active = +l.dataset.ln; paint(); }));
    }
    paint();
  }

  function getCodeSnippet(pid) {
    if (pid === 'tfidf') {
      return `
def compute_tfidf(doc, corpus_df, n_docs):
    tokens = tokenize(doc)
    tf = Counter(tokens)
    total = len(tokens)
    tfidf = {}
    for word, count in tf.items():
        tf_norm = count / total
        idf = math.log((n_docs + 1) / (corpus_df.get(word, 0) + 1)) + 1
        tfidf[word] = tf_norm * idf
    return tfidf`;
    } else if (pid === 'nb') {
      return `
def predict_nb(doc, priors, word_counts, total_words, vocab_size, alpha=1.0):
    tokens = tokenize(doc)
    scores = {}
    for c in priors:
        log_prob = math.log(priors[c])
        for w in tokens:
            count = word_counts[c].get(w, 0)
            p_w_c = (count + alpha) / (total_words[c] + alpha * vocab_size)
            log_prob += math.log(p_w_c)
        scores[c] = log_prob
    return max(scores, key=scores.get)`;
    } else if (pid === 'perceptron') {
      return `
def perceptron_update(x, y, w, b, alpha=0.1):
    z = sum(w[i] * x[i] for i in range(len(w))) + b
    y_hat = 1 if z >= 0 else 0
    error = y - y_hat
    w = [w[i] + alpha * error * x[i] for i in range(len(w))]
    b = b + alpha * error
    return w, b, error`;
    } else if (pid === 'kmeans') {
      return `
def kmeans_step(points, centroids):
    clusters = defaultdict(list)
    for p in points:
        best_k = min(range(len(centroids)), key=lambda k: dist(p, centroids[k]))
        clusters[best_k].append(p)
    new_centroids = [
        [sum(p[d] for p in clusters[k]) / len(clusters[k]) for d in range(len(points[0]))]
        for k in range(len(centroids))
    ]
    return new_centroids`;
    } else if (pid === 'vi') {
      return `
def value_iteration_step(V, mdp, gamma=0.99):
    V_new = {}
    for s in mdp.states:
        if mdp.is_terminal(s):
            V_new[s] = 0.0
            continue
        V_new[s] = max(
            sum(p * (r + gamma * V[s_next]) for s_next, p, r in mdp.transitions(s, a))
            for a in mdp.actions(s)
        )
    return V_new`;
    } else {
      return `
def q_learning_step(Q, s, a, r, s_next, alpha=0.1, gamma=0.99):
    td_target = r + gamma * max(Q[s_next][a_prime] for a_prime in actions)
    td_error = td_target - Q[s][a]
    Q[s][a] += alpha * td_error
    return Q, td_error`;
    }
  }

  function getRuntimeState(pid) {
    if (pid === 'tfidf') {
      return `
doc = "win lottery cash prize"
tokens = ['win', 'lottery', 'cash', 'prize']
tfidf = {
  'win': 0.25 * 2.1 = 0.525,
  'lottery': 0.25 * 3.4 = 0.850,
  'prize': 0.25 * 3.0 = 0.750
}`;
    } else if (pid === 'nb') {
      return `
test = "cheap lottery prize"
log_posterior(Spam) = -4.12
log_posterior(Ham)  = -9.85
argmax -> Predicted: 'Spam' (99.7% confidence)`;
    } else if (pid === 'perceptron') {
      return `
x = [1, 2], y = 1
z = 0.2(1) - 0.4(2) + 0.1 = -0.5 -> y_hat = 0
error = 1 - 0 = 1
w_new = [0.2 + 0.1(1)(1), -0.4 + 0.1(1)(2)] = [0.3, -0.2]`;
    } else if (pid === 'kmeans') {
      return `
points = 6 samples
assignments = [0, 0, 1, 1, 0, 1]
μ1_new = [1.5, 1.2]
μ2_new = [4.8, 5.1]
WCSS = 12.4`;
    } else if (pid === 'vi') {
      return `
State (3, 3):
  Up:    0.8(0.81) + 0.1(0.72) + 0.1(1.0) = 0.82
  Right: 0.8(1.00) + 0.1(0.81) + 0.1(0.69) = 0.95
max_a -> V_new(3,3) = -0.04 + 0.99(0.95) = 0.9005`;
    } else {
      return `
Transition: (3,3) -[Right]-> +1.0 Goal
TD Target = 1.0 + 0.99(0.0) = 1.0
TD Error δ = 1.0 - 0.50 = +0.50
Q_new((3,3), Right) = 0.50 + 0.1(0.50) = 0.55`;
    }
  }

  // --- Auto Run on DOM Loaded ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
