/**
 * ui.js — Topic 06: Learning & Decision Making Lecture Page Controller (learning.html)
 *
 * Implements single-viewport interactive lecture controller:
 *   - 11 Topic Tabs:
 *     0. Evolution: Knowledge & Logic → Learning & Decisions
 *     1. Text Features: Bag-of-Words & TF-IDF
 *     2. Naive Bayes Classification
 *     3. Model Evaluation & Performance Metrics
 *     4. Neural Networks & Gradient Optimization
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
    'How unstructured text is transformed into numerical feature vectors for statistical classification: Tokenization, Bag-of-Words word counts, and TF-IDF rarity weighting.',
    'Generative probabilistic classification using Bayes\' Rule and conditional independence assumptions, complete with Laplace Add-1 smoothing and log-space computation.',
    'Rigorous statistical validation of classification performance: Confusion Matrices (TP, FP, TN, FN), Accuracy Paradox, Precision, Recall, and the F1-Score harmonic mean.',
    'Biological-inspired computation: from the linear Perceptron to Multi-Layer Networks with non-linear activations (ReLU, Sigmoid), Loss functions, and Gradient Descent optimization.',
    'Discovering latent groupings in unlabeled spatial data: K-Means clustering, Voronoi cell assignments, centroid recalculation, and the Elbow Method for choosing K.',
    'Sequential decision-making under uncertainty: the MDP tuple ⟨S, A, P, R, γ⟩, discounted returns, state-value functions V(s), and action-value functions Q(s,a).',
    'Model-based dynamic programming: solving known MDPs with Value Iteration (Bellman Optimality contraction) and greedy policy extraction.',
    'Model-free reinforcement learning: learning optimal behavior from environment rollouts via Temporal Difference learning TD(0), Tabular Q-Learning, and SARSA under ε-greedy exploration.',
    'Multi-dimensional comparison matrix across Naive Bayes, Neural Networks, K-Means Clustering, Value Iteration, and Model-Free Q-Learning.',
    'Interactive line-by-line stepping through clean Python sandbox implementations: TF-IDF, Naive Bayes, Perceptron, K-Means, Value Iteration, and Q-Learning.'
  ];

  // --- Concept Data per Topic ---
  const CONCEPTS = {
    progression: [
      {
        key: 'rules_vs_learning', name: 'Rules vs. Empirical Learning',
        def: 'In Topics 01–05, knowledge and heuristics were hand-coded by human experts. In Machine Learning, the agent extracts rules, distributions, and decision boundaries directly from data.',
        notation: 'Handcrafted: KB ⊨ α · Learning: h ← LEARN(Data)',
        tip: 'When the world is too complex to write explicit rules for (e.g. spam filtering, vision), we let data train parameter weights.',
        render: renderProgressionOverview
      },
      {
        key: 'three_paradigms', name: 'Four Learning Paradigms',
        def: 'Supervised (labeled pairs ⟨x, y⟩), Neural Networks (non-linear representations), Unsupervised (unlabeled structure discovery), and Reinforcement Learning (trial, error, and scalar rewards r).',
        notation: 'Supervised: x → y · NN: Wx+b · Unsupervised: C_k · RL: s —(a)→ r, s\'',
        tip: 'Supervised = Teacher gives answers; Unsupervised = Detective finds patterns; RL = Gamer learns to maximize score.',
        render: renderFourParadigms
      },
      {
        key: 'static_vs_sequential', name: 'Static vs. Sequential Decisions',
        def: 'Supervised learning predicts independent static targets (i.i.d.). RL deals with sequential states where current actions influence future states and delayed rewards.',
        notation: 'Static: ŷ = h(x) · Sequential: a_t ~ π(s_t) ⇒ s_{t+1}, r_{t+1}',
        tip: 'A classifier tells you if a photo has a cat; an RL agent decides how to pilot a drone through the living room without hitting the cat.',
        render: renderStaticVsSequential
      }
    ],
    features: [
      {
        key: 'bow_concept', name: 'Tokenization & Bag-of-Words',
        def: 'Splits raw text into word tokens and represents each document as an unordered frequency count vector over a fixed vocabulary dictionary.',
        notation: 'Vocabulary V = {w₁, …, w_|V|} · x = ⟨count(w₁, d), …, count(w_|V|, d)⟩',
        tip: 'Bag-of-Words disregards word order and grammar, but word frequency spikes provide surprisingly strong topical signals.',
        render: renderBagOfWordsVisualizer
      },
      {
        key: 'tfidf_concept', name: 'TF-IDF Rarity Weighting',
        def: 'Combines local Term Frequency (TF) with global Inverse Document Frequency (IDF) to downweight ubiquitous stop words and boost rare, discriminative keywords.',
        notation: 'TF-IDF(t, d) = TF(t, d) × log(N / DF(t)) · x_tfidf = ⟨TF-IDF(w₁, d), …⟩',
        tip: 'High TF-IDF indicates a word is frequent in this document but rare in the general corpus (e.g., "lottery", "kinase").',
        render: renderTFIDFStudio
      }
    ],
    naive_bayes: [
      {
        key: 'nb_map', name: 'Generative MAP Classification',
        def: 'Applies Bayes\' Rule to select the class maximizing the posterior probability P(c | x) ∝ P(c) ∏ P(xᵢ | c) under the conditional independence assumption.',
        notation: 'c* = argmax_c [ log P(c) + ∑ log P(xᵢ | c) ]',
        tip: 'The independence assumption is "naive" because words correlate, but in practice Naive Bayes is extremely fast and robust for text.',
        render: renderNaiveBayesClassifierStudio
      },
      {
        key: 'laplace_smoothing', name: 'Laplace (Add-1) Smoothing',
        def: 'Adds pseudo-count α = 1 to all word counts to prevent unseen test words from multiplying the entire class likelihood to zero.',
        notation: 'P̂(w | c) = (count(w, c) + 1) / (∑ count(w\', c) + |V|)',
        tip: 'Without Laplace smoothing, a single unseen word in an email gives P(Spam)=0 and P(Ham)=0 (the zero-probability trap).',
        render: renderLaplaceSmoothingDemo
      }
    ],
    evaluation: [
      {
        key: 'confusion_matrix', name: 'Confusion Matrix & Metrics',
        def: 'A 2×2 contingency table of True Positives (TP), False Positives (FP), True Negatives (TN), and False Negatives (FN).',
        notation: 'Accuracy = (TP+TN)/N · Precision = TP/(TP+FP) · Recall = TP/(TP+FN)',
        tip: 'FP = False Alarm (good email marked spam); FN = Missed Detection (spam in your inbox).',
        render: renderConfusionMatrixStudio
      },
      {
        key: 'f1_tradeoff', name: 'Precision-Recall Trade-off & F1-Score',
        def: 'F1-Score is the harmonic mean of Precision and Recall. Adjusting the classification threshold trades off false alarms against missed detections.',
        notation: 'F₁ = 2 × (Precision × Recall) / (Precision + Recall) = 2TP / (2TP + FP + FN)',
        tip: 'The harmonic mean heavily penalizes severe imbalances (if Precision is 1.0 but Recall is 0.0, F1 is 0.0).',
        render: renderF1TradeoffStudio
      }
    ],
    neural_nets: [
      {
        key: 'perceptron_model', name: 'The Perceptron & Linear Boundaries',
        def: 'The foundational computing unit that computes a weighted sum of inputs and applies a threshold activation: h(x) = step(w^T x + b). Fails on XOR.',
        notation: 'z = w^T x + b · h(x) = step(z) · XOR: (0,0)→0, (1,1)→0, (0,1)→1, (1,0)→1',
        tip: 'A single perceptron can only learn linear boundaries. Minsky & Papert (1969) proved it cannot solve XOR.',
        render: renderPerceptronXORDemo
      },
      {
        key: 'mlp_activations', name: 'Multi-Layer Perceptrons & Activations',
        def: 'Networks with hidden layers and non-linear activations (ReLU, Sigmoid) that learn hierarchical representations and solve non-linear problems.',
        notation: 'h = ReLU(W₁ x + b₁) · ŷ = σ(W₂ h + b₂) · ReLU(z) = max(0, z)',
        tip: 'Without non-linear activations, any deep multi-layer network mathematically collapses into a single linear matrix.',
        render: renderMLPForwardPassStudio
      },
      {
        key: 'gradient_descent', name: 'Loss Functions & Gradient Descent',
        def: 'Quantifies prediction error using Cross-Entropy Loss and iteratively updates weights in the opposite direction of the loss gradient: w ← w - α ∇L.',
        notation: 'L(w) = -[y log ŷ + (1-y) log(1-ŷ)] · w^{(t+1)} = w^{(t)} - α ∇L',
        tip: 'Think of a hiker in thick fog feeling the slope underfoot and taking small downhill steps toward the valley bottom.',
        render: renderGradientDescentBowl
      }
    ],
    kmeans: [
      {
        key: 'kmeans_concept', name: 'K-Means Iterative Optimization',
        def: 'Alternating between two steps: (1) Assignment: Assign each point to the nearest centroid; (2) Update: Move centroids to the mean of assigned points.',
        notation: 'Assign: c_i = argmin_k ||x_i - μ_k||² · Update: μ_k = (1/|C_k|) ∑ x_i',
        tip: 'K-Means monotonically decreases Within-Cluster Sum of Squares (WCSS) and is guaranteed to converge in finite steps.',
        render: renderKMeansInteractive
      },
      {
        key: 'elbow_method', name: 'Voronoi Tessellation & The Elbow Method',
        def: 'Centroids define convex Voronoi polygon boundaries. The Elbow Method plots WCSS vs K to find the point of diminishing returns.',
        notation: 'WCSS = ∑_{k=1}^K ∑_{x ∈ C_k} ||x - μ_k||² · Optimal K at the "elbow" bend',
        tip: 'Increasing K always lowers WCSS (at K=N, WCSS is 0), so we look for the sharp bend where extra clusters add little value.',
        render: renderElbowMethodCurve
      }
    ],
    mdp: [
      {
        key: 'mdp_tuple', name: 'MDP Formulation ⟨S, A, P, R, γ⟩',
        def: 'Formal framework for sequential decisions: State space S, Action space A, Transition dynamics P(s\' | s, a), Reward function R(s, a, s\'), and Discount factor γ.',
        notation: 'Return G_t = ∑_{k=0}^∞ γ^k R_{t+k+1} · Discount γ ∈ [0, 1)',
        tip: 'The Markov property asserts that future state transitions depend only on current state s and action a, not past history.',
        render: renderGridWorldEnv
      },
      {
        key: 'value_functions', name: 'State-Value V(s) & Action-Value Q(s, a)',
        def: 'V^π(s) is expected return starting in state s under policy π. Q^π(s, a) is expected return taking action a in state s then following π.',
        notation: 'V^π(s) = 𝔼_π[G_t | S_t = s] · Q^π(s, a) = 𝔼_π[G_t | S_t = s, A_t = a]',
        tip: 'V(s) measures state goodness; Q(s, a) measures action goodness to guide greedy decision-making.',
        render: renderValueAndQOverlay
      }
    ],
    value_iteration: [
      {
        key: 'bellman_optimality', name: 'The Bellman Optimality Equation',
        def: 'The optimal state value V*(s) equals the maximum expected return across all available actions: immediate expected reward plus discounted future value.',
        notation: 'V*(s) = max_{a ∈ A} ∑_{s\'} P(s\' | s, a) [ R(s, a, s\') + γ V*(s\') ]',
        tip: 'Recursive consistency: the optimal value of today equals the best immediate reward plus the discounted optimal value of tomorrow.',
        render: renderBellmanBackupDiagram
      },
      {
        key: 'vi_algorithm', name: 'Value Iteration & Policy Extraction',
        def: 'Turns Bellman Optimality into an iterative contraction mapping update V_{k+1}(s) until convergence; extracts optimal policy π*(s) by 1-step lookahead.',
        notation: 'V_{k+1}(s) ← max_a ∑ P(s\' | s, a) [ R + γ V_k(s\') ] · π*(s) = argmax_a [ … ]',
        tip: 'Values diffuse outward from reward states across the grid until reaching steady-state equilibrium.',
        render: renderValueIterationHeatmap
      }
    ],
    q_learning: [
      {
        key: 'td_error', name: 'Temporal Difference (TD) Learning',
        def: 'Model-free bootstrapping: updates value estimates using the immediate reward and next-state estimate without waiting for episode termination.',
        notation: 'TD Target = r + γ max_{a\'} Q(s\', a\') · TD Error δ = TD Target - Q(s, a)',
        tip: 'TD error measures the "surprise" between expectation and immediate experienced outcome.',
        render: renderTDErrorVisualizer
      },
      {
        key: 'q_learning_rule', name: 'Tabular Q-Learning & ε-Greedy',
        def: 'Off-policy TD control update rule: Q(s,a) ← Q(s,a) + α [ r + γ max_{a\'} Q(s\', a\') - Q(s, a) ]. Balances exploration vs. exploitation via ε.',
        notation: 'Q(s, a) ← Q(s, a) + α [ r + γ max_{a\'} Q(s\', a\') - Q(s, a) ]',
        tip: 'Q-Learning is off-policy because it updates toward the greedy optimal action regardless of which exploratory action was actually taken.',
        render: renderQLearningSimulator
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
        def: 'Line-by-line execution stepping through clean Python implementations of text features, Naive Bayes, Perceptron, K-Means, Value Iteration, and Q-Learning.',
        notation: 'python_sandbox/10_Machine_Learning.py & 11_Reinforcement_Learning.py',
        tip: 'Select any algorithm preset to inspect variables and execution flow step-by-step.',
        render: renderCodeTraceView
      }
    ]
  };

  // --- Current State ---
  let currentTopicIndex = 0;
  let currentConceptIndex = 0;

  // --- Initialization ---
  function init() {
    renderTopicTabs();
    loadTopic(0, 0);

    window.addEventListener('hashchange', handleHash);
    handleHash();
  }

  function handleHash() {
    const hash = window.location.hash.replace('#', '');
    if (!hash) return;
    const tIdx = TOPICS.findIndex(t => t.id === hash);
    if (tIdx !== -1) {
      loadTopic(tIdx, 0);
    }
  }

  function renderTopicTabs() {
    const container = document.getElementById('learning-topic-tabs');
    if (!container) return;
    container.innerHTML = TOPICS.map((t, idx) => `
      <button class="sl-topic-tab ${idx === currentTopicIndex ? 'active' : ''}" data-idx="${idx}">
        ${t.short}
      </button>
    `).join('');

    container.querySelectorAll('.sl-topic-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx, 10);
        loadTopic(idx, 0);
      });
    });
  }

  function loadTopic(topicIdx, conceptIdx) {
    currentTopicIndex = topicIdx;
    currentConceptIndex = conceptIdx;

    document.querySelectorAll('#learning-topic-tabs .sl-topic-tab').forEach((b, i) => {
      b.classList.toggle('active', i === topicIdx);
    });

    const topic = TOPICS[topicIdx];
    const concepts = CONCEPTS[topic.id] || [];

    renderConceptColumn(topic, concepts, currentConceptIndex);
    renderIllustrationColumn(concepts[currentConceptIndex]);

    if (window.lucide) window.lucide.createIcons();
  }

  function renderConceptColumn(topic, concepts, cIdx) {
    const col = document.getElementById('learning-concept-col');
    if (!col) return;

    const currentC = concepts[cIdx] || concepts[0];

    col.innerHTML = `
      <div class="sl-concept-header">
        <h2 style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.5rem;">${topic.title}</h2>
        <p style="font-size: 0.88rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 1rem;">
          ${TOPIC_INTROS[currentTopicIndex]}
        </p>
      </div>

      <div class="sl-concept-chips" style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1.2rem;">
        ${concepts.map((c, idx) => `
          <button class="sl-concept-chip ${idx === cIdx ? 'active' : ''}" data-cidx="${idx}" style="padding: 0.4rem 0.8rem; border-radius: 9999px; font-size: 0.8rem; font-weight: 600; cursor: pointer; border: 1px solid ${idx === cIdx ? '#10b981' : 'rgba(15,23,42,0.1)'}; background: ${idx === cIdx ? 'rgba(16,185,129,0.15)' : 'rgba(15,23,42,0.05)'}; color: ${idx === cIdx ? '#047857' : '#64748b'}; transition: all 0.2s;">
            ${c.name}
          </button>
        `).join('')}
      </div>

      <div class="sl-concept-card glass-panel" style="padding: 1.2rem; border-radius: 12px; background: #ffffff; border: 1px solid rgba(15,23,42,0.08); margin-bottom: 1rem;">
        <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #059669; font-weight: 700; margin-bottom: 0.4rem;">Formal Definition</div>
        <p style="font-size: 0.92rem; color: var(--text-primary); line-height: 1.55; margin-bottom: 1rem;">
          ${currentC.def}
        </p>

        <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #0284c7; font-weight: 700; margin-bottom: 0.4rem;">Mathematical Notation</div>
        <div style="font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; padding: 0.75rem 1rem; background: rgba(15,23,42,0.06); border-radius: 8px; border-left: 3px solid #0284c7; color: #334155; margin-bottom: 1rem; word-break: break-word;">
          ${currentC.notation}
        </div>

        <div class="teaching-tip" style="display: flex; gap: 0.75rem; background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.25); padding: 0.85rem 1rem; border-radius: 8px;">
          <i data-lucide="sparkles" style="color: #059669; width: 1.25rem; height: 1.25rem; flex-shrink: 0; margin-top: 2px;"></i>
          <span style="font-size: 0.84rem; color: #065f46; line-height: 1.5;">${currentC.tip}</span>
        </div>
      </div>
    `;

    col.querySelectorAll('.sl-concept-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const cidx = parseInt(btn.dataset.cidx, 10);
        loadTopic(currentTopicIndex, cidx);
      });
    });
  }

  function renderIllustrationColumn(concept) {
    const col = document.getElementById('learning-graph-col');
    if (!col) return;
    col.innerHTML = '';
    if (concept && typeof concept.render === 'function') {
      concept.render(col);
    }
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
          <div class="glass-panel" style="padding: 0.8rem; border-radius: 8px; background: rgba(244,63,94,0.08); border-left: 4px solid #f43f5e;">
            <div style="font-weight: 700; color: #9f1239; font-size: 0.8rem; margin-bottom: 0.3rem;">Handcrafted Rules (Topics 1-5)</div>
            <p style="font-size: 0.76rem; color: #881337; line-height: 1.4;">
              Requires human experts to enumerate all possibilities. Brittle, expensive to maintain, and fails in complex perceptual domains.
            </p>
          </div>
          <div class="glass-panel" style="padding: 0.8rem; border-radius: 8px; background: rgba(16,185,129,0.1); border-left: 4px solid #10b981;">
            <div style="font-weight: 700; color: #065f46; font-size: 0.8rem; margin-bottom: 0.3rem;">Machine Learning (Topic 6)</div>
            <p style="font-size: 0.76rem; color: #047857; line-height: 1.4;">
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
            <div style="font-size: 0.75rem; font-weight: 700; color: #059669;">1. Supervised Learning</div>
            <div style="font-size: 0.7rem; color: #64748b;">Pairs ⟨x, y⟩ with teacher feedback</div>
          </div>
          <div class="glass-panel" style="padding: 0.6rem; border-radius: 6px; background: #ffffff;">
            <div style="font-size: 0.75rem; font-weight: 700; color: #6366f1;">2. Neural Networks</div>
            <div style="font-size: 0.7rem; color: #64748b;">Non-linear representation learning</div>
          </div>
          <div class="glass-panel" style="padding: 0.6rem; border-radius: 6px; background: #ffffff;">
            <div style="font-size: 0.75rem; font-weight: 700; color: #d97706;">3. Unsupervised (K-Means)</div>
            <div style="font-size: 0.7rem; color: #64748b;">Clusters unlabeled data points</div>
          </div>
          <div class="glass-panel" style="padding: 0.6rem; border-radius: 6px; background: #ffffff;">
            <div style="font-size: 0.75rem; font-weight: 700; color: #0284c7;">4. Reinforcement Learning</div>
            <div style="font-size: 0.7rem; color: #64748b;">Sequential actions & reward feedback</div>
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
            <div style="font-weight: 700; color: #059669; font-size: 0.8rem;">Classifier (Static)</div>
            <div style="font-size: 0.72rem; color: #64748b; margin-top: 0.3rem;">Email Text → [Spam / Ham]</div>
          </div>
          <div style="font-size: 1.2rem; color: #94a3b8; display: flex; align-items: center;">⇄</div>
          <div class="glass-panel" style="flex: 1; padding: 0.8rem; border-radius: 8px; background: #ffffff; text-align: center;">
            <div style="font-weight: 700; color: #0284c7; font-size: 0.8rem;">RL Agent (Sequential)</div>
            <div style="font-size: 0.72rem; color: #64748b; margin-top: 0.3rem;">State → Action → Reward → State'</div>
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
        <div style="font-size: 0.74rem; background: rgba(15,23,42,0.04); padding: 0.5rem; border-radius: 6px; color: #334155; margin-bottom: 0.5rem;">
          <strong>Sample Email:</strong> "${sampleDoc}"
        </div>
        <div style="flex: 1; display: flex; flex-direction: column; gap: 0.4rem; justify-content: center;">
          ${Object.entries(counts).map(([word, c]) => `
            <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem;">
              <span style="width: 60px; font-weight: 600; color: #334155; text-align: right;">${word}</span>
              <div style="flex: 1; height: 12px; background: rgba(15,23,42,0.06); border-radius: 4px; overflow: hidden;">
                <div style="width: ${c * 35}%; height: 100%; background: #06b6d4;"></div>
              </div>
              <span style="font-weight: 700; color: #0891b2; width: 20px;">${c}</span>
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
          <thead style="background: rgba(6,182,212,0.1); color: #0891b2;">
            <tr><th style="padding: 5px;">Term</th><th>TF (Local)</th><th>IDF (Global)</th><th>TF-IDF Score</th></tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid rgba(15,23,42,0.05);"><td style="padding: 4px; font-weight:600;">the</td><td>0.15</td><td style="color:#f43f5e;">0.05 (Common)</td><td><strong>0.007</strong></td></tr>
            <tr style="border-bottom: 1px solid rgba(15,23,42,0.05);"><td style="padding: 4px; font-weight:600;">meeting</td><td>0.08</td><td>1.45 (Medium)</td><td><strong>0.116</strong></td></tr>
            <tr><td style="padding: 4px; font-weight:600;">lottery</td><td>0.20</td><td style="color:#10b981;">3.20 (Rare!)</td><td style="color:#059669; font-weight:800;">0.640</td></tr>
          </tbody>
        </table>
        <div style="font-size: 0.72rem; color: #64748b;">
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
        <div style="font-size: 0.74rem; background: rgba(15,23,42,0.04); padding: 0.5rem; border-radius: 6px; color: #334155;">
          <strong>Classifying:</strong> "${testDoc}"
        </div>
        <div class="glass-panel" style="padding: 0.8rem; border-radius: 8px; background: #ffffff;">
          <div style="display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 700; margin-bottom: 0.3rem;">
            <span style="color: #f43f5e;">P(Spam | text) = ${(res.probabilities.Spam * 100).toFixed(1)}%</span>
            <span style="color: #059669;">P(Ham | text) = ${(res.probabilities.Ham * 100).toFixed(1)}%</span>
          </div>
          <div style="height: 14px; background: rgba(15,23,42,0.08); border-radius: 999px; overflow: hidden; display: flex;">
            <div style="width: ${(res.probabilities.Spam * 100)}%; height: 100%; background: #f43f5e;"></div>
            <div style="width: ${(res.probabilities.Ham * 100)}%; height: 100%; background: #059669;"></div>
          </div>
        </div>
        <div style="font-size: 0.72rem; color: #047857; font-weight: 700; background: #ecfdf5; padding: 0.4rem; border-radius: 4px; text-align: center;">
          Decision: Class = ${res.predictedClass} (MAP Decision Rule)
        </div>
      </div>
    `;
  }

  function renderLaplaceSmoothingDemo(container) {
    container.innerHTML = `
      <div style="padding: 1rem; height: 100%; display: flex; flex-direction: column; justify-content: space-around;">
        <h3 style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary);">Laplace Smoothing (Zero-Probability Defense)</h3>
        <div class="glass-panel" style="padding: 0.8rem; border-radius: 8px; background: rgba(244,63,94,0.08); border-left: 4px solid #f43f5e;">
          <div style="font-size: 0.78rem; font-weight: 700; color: #9f1239;">Without Smoothing (α = 0)</div>
          <div style="font-family: monospace; font-size: 0.74rem; color: #881337; margin-top: 2px;">
            P("new_word" | Spam) = 0 / 100 = 0.0 &rarr; ∏ P(w | c) = <strong>0.0!</strong> (Fails)
          </div>
        </div>
        <div class="glass-panel" style="padding: 0.8rem; border-radius: 8px; background: rgba(16,185,129,0.1); border-left: 4px solid #10b981;">
          <div style="font-size: 0.78rem; font-weight: 700; color: #065f46;">With Laplace Add-1 (α = 1)</div>
          <div style="font-family: monospace; font-size: 0.74rem; color: #047857; margin-top: 2px;">
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
          <div style="padding: 6px; background: #ecfdf5; border: 1px solid #10b981; border-radius: 4px;">
            <div style="color: #059669; font-weight: 700;">TP = ${tp}</div>
            <div style="font-size: 0.68rem; color: #047857;">True Positive</div>
          </div>
          <div style="padding: 6px; background: #fff1f2; border: 1px solid #f43f5e; border-radius: 4px;">
            <div style="color: #e11d48; font-weight: 700;">FN = ${fn}</div>
            <div style="font-size: 0.68rem; color: #9f1239;">False Negative</div>
          </div>
          <div style="padding: 6px; background: #fff1f2; border: 1px solid #f43f5e; border-radius: 4px;">
            <div style="color: #e11d48; font-weight: 700;">FP = ${fp}</div>
            <div style="font-size: 0.68rem; color: #9f1239;">False Positive</div>
          </div>
          <div style="padding: 6px; background: #ecfdf5; border: 1px solid #10b981; border-radius: 4px;">
            <div style="color: #059669; font-weight: 700;">TN = ${tn}</div>
            <div style="font-size: 0.68rem; color: #047857;">True Negative</div>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; font-size: 0.72rem; text-align: center; margin-top: 0.4rem;">
          <div style="background: rgba(15,23,42,0.04); padding: 4px; border-radius: 4px;">Acc: <strong>${acc}%</strong></div>
          <div style="background: rgba(15,23,42,0.04); padding: 4px; border-radius: 4px;">Prec: <strong>${prec}%</strong></div>
          <div style="background: rgba(15,23,42,0.04); padding: 4px; border-radius: 4px;">Rec: <strong>${rec}%</strong></div>
          <div style="background: rgba(16,185,129,0.15); padding: 4px; border-radius: 4px; color: #047857;">F1: <strong>${f1}%</strong></div>
        </div>
      </div>
    `;
  }

  function renderF1TradeoffStudio(container) {
    container.innerHTML = `
      <div style="padding: 1rem; height: 100%; display: flex; flex-direction: column; justify-content: space-around;">
        <h3 style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary);">Precision vs. Recall Trade-off</h3>
        <div class="glass-panel" style="padding: 0.8rem; border-radius: 8px; background: #ffffff;">
          <div style="font-size: 0.76rem; color: #64748b; line-height: 1.4;">
            Higher classification threshold &rarr; Higher <strong>Precision</strong> (fewer false alarms) but lower <strong>Recall</strong>.
          </div>
        </div>
        <div style="font-size: 0.72rem; color: #059669; font-weight: 700; background: #ecfdf5; padding: 0.5rem; border-radius: 6px; text-align: center;">
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
          <div style="width: 140px; height: 110px; background: #ffffff; border: 1px solid rgba(15,23,42,0.1); border-radius: 6px; position: relative;">
            <span style="position: absolute; top: 4px; left: 6px; font-size: 0.65rem; color: #64748b;">AND (Linearly Separable)</span>
            <div style="width: 100%; height: 2px; background: #10b981; position: absolute; top: 50%; transform: rotate(-35deg);"></div>
          </div>
          <div style="width: 140px; height: 110px; background: #ffffff; border: 1px solid #f43f5e; border-radius: 6px; position: relative;">
            <span style="position: absolute; top: 4px; left: 6px; font-size: 0.65rem; color: #e11d48; font-weight: 700;">XOR (Non-Separable!)</span>
            <div style="font-size: 0.68rem; color: #f43f5e; text-align: center; margin-top: 40px;">No single straight line can separate XOR!</div>
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
            <div style="font-size: 0.7rem; color: #64748b;">Inputs</div>
            <div style="width: 24px; height: 24px; border-radius: 50%; background: #06b6d4; margin: 4px auto;"></div>
            <div style="width: 24px; height: 24px; border-radius: 50%; background: #06b6d4; margin: 4px auto;"></div>
          </div>
          <div style="color: #94a3b8;">&rarr; W₁ &rarr;</div>
          <div style="text-align: center;">
            <div style="font-size: 0.7rem; color: #8b5cf6;">Hidden (ReLU)</div>
            <div style="width: 28px; height: 28px; border-radius: 50%; background: #8b5cf6; margin: 4px auto;"></div>
            <div style="width: 28px; height: 28px; border-radius: 50%; background: #8b5cf6; margin: 4px auto;"></div>
          </div>
          <div style="color: #94a3b8;">&rarr; W₂ &rarr;</div>
          <div style="text-align: center;">
            <div style="font-size: 0.7rem; color: #10b981;">Output (σ)</div>
            <div style="width: 30px; height: 30px; border-radius: 50%; background: #10b981; margin: 4px auto;"></div>
          </div>
        </div>
      </div>
    `;
  }

  function renderGradientDescentBowl(container) {
    container.innerHTML = `
      <div style="padding: 1rem; height: 100%; display: flex; flex-direction: column; justify-content: space-around;">
        <h3 style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary);">Loss Surface & Gradient Descent</h3>
        <div style="width: 100%; height: 100px; border-radius: 8px; background: linear-gradient(135deg, #312e81, #6366f1, #06b6d4); display: flex; align-items: center; justify-content: center; position: relative;">
          <div style="width: 16px; height: 16px; border-radius: 50%; background: #f59e0b; border: 2px solid #ffffff; position: absolute; top: 20px; left: 30px;"></div>
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
          <div class="glass-panel" style="flex: 1; padding: 0.6rem; border-radius: 6px; background: rgba(6,182,212,0.1); text-align: center;">
            <div style="font-weight: 700; color: #0891b2; font-size: 0.75rem;">1. Assignment Step</div>
            <div style="font-size: 0.68rem; color: #334155; margin-top: 2px;">Assign points to closest centroid μ_k</div>
          </div>
          <div style="color: #94a3b8;">&rarr;</div>
          <div class="glass-panel" style="flex: 1; padding: 0.6rem; border-radius: 6px; background: rgba(245,158,11,0.1); text-align: center;">
            <div style="font-weight: 700; color: #d97706; font-size: 0.75rem;">2. Update Step</div>
            <div style="font-size: 0.68rem; color: #334155; margin-top: 2px;">Move centroids to cluster mean</div>
          </div>
        </div>
      </div>
    `;
  }

  function renderElbowMethodCurve(container) {
    container.innerHTML = `
      <div style="padding: 1rem; height: 100%; display: flex; flex-direction: column; justify-content: space-around;">
        <h3 style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary);">The Elbow Method for Selecting K</h3>
        <div style="background: #ffffff; padding: 0.6rem; border-radius: 8px; border: 1px solid rgba(15,23,42,0.08); font-size: 0.72rem;">
          <div style="display: flex; justify-content: space-between; font-weight: 600;">
            <span>K=1: WCSS = 520</span>
            <span>K=2: WCSS = 210</span>
            <span style="color: #059669; font-weight: 800;">K=3: WCSS = 75 (Elbow!)</span>
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
        <div style="flex: 1; display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; background: rgba(15,23,42,0.05); padding: 4px; border-radius: 6px; font-size: 0.72rem; text-align: center;">
          <div style="background:#fff; border-radius:4px; padding:6px;">(1,3)</div>
          <div style="background:#fff; border-radius:4px; padding:6px;">(2,3)</div>
          <div style="background:#fff; border-radius:4px; padding:6px;">(3,3)</div>
          <div style="background:#ecfdf5; color:#059669; font-weight:700; border-radius:4px; padding:6px;">+1.0 Goal</div>

          <div style="background:#fff; border-radius:4px; padding:6px;">(1,2)</div>
          <div style="background:#334155; color:#fff; border-radius:4px; padding:6px;">WALL</div>
          <div style="background:#fff; border-radius:4px; padding:6px;">(3,2)</div>
          <div style="background:#fff1f2; color:#e11d48; font-weight:700; border-radius:4px; padding:6px;">-1.0 Pit</div>

          <div style="background:#eff6ff; color:#2563eb; font-weight:700; border-radius:4px; padding:6px;">Start (1,1)</div>
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
        <div style="font-size: 0.75rem; color: #64748b; line-height: 1.4;">
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
        <div style="font-family: monospace; font-size: 0.75rem; background: #ffffff; padding: 0.6rem; border-radius: 6px; border: 1px solid rgba(15,23,42,0.1); color: #334155;">
          V*(s) = max_a ∑ P(s' | s, a) [ R(s, a, s') + γ V*(s') ]
        </div>
      </div>
    `;
  }

  function renderValueIterationHeatmap(container) {
    container.innerHTML = `
      <div style="padding: 1rem; height: 100%; display: flex; flex-direction: column; justify-content: space-between;">
        <h3 style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary);">Value Iteration Equilibrium Values</h3>
        <div style="font-size: 0.72rem; color: #047857; font-weight: 600; text-align: center;">
          Values diffuse outward from +1.0 goal (γ = 0.99, R = -0.04)
        </div>
      </div>
    `;
  }

  function renderTDErrorVisualizer(container) {
    container.innerHTML = `
      <div style="padding: 1rem; height: 100%; display: flex; flex-direction: column; justify-content: space-around;">
        <h3 style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary);">Temporal Difference (TD) Error</h3>
        <div style="font-family: monospace; font-size: 0.74rem; background: #ffffff; padding: 0.6rem; border-radius: 6px; border-left: 3px solid #0284c7;">
          δ = [ r + γ max_{a'} Q(s', a') ] - Q(s, a)
        </div>
      </div>
    `;
  }

  function renderQLearningSimulator(container) {
    container.innerHTML = `
      <div style="padding: 1rem; height: 100%; display: flex; flex-direction: column; justify-content: space-between;">
        <h3 style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary);">Tabular Q-Learning Updates</h3>
        <div style="font-family: monospace; font-size: 0.74rem; background: #ecfdf5; padding: 0.6rem; border-radius: 6px; color: #047857;">
          Q(s, a) ← Q(s, a) + α [ r + γ max Q(s', a') - Q(s, a) ]
        </div>
      </div>
    `;
  }

  // --- Topic 9: Evaluation Matrix ---
  function renderEvaluationMatrix(container) {
    container.innerHTML = `
      <div style="padding: 1rem; height: 100%; display: flex; flex-direction: column;">
        <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.5rem;">
          Learning Systems Multi-Dimensional Evaluation
        </h3>
        <div style="flex: 1; overflow-x: auto; background: #ffffff; border-radius: 8px;">
          <table style="width: 100%; font-size: 0.74rem; text-align: left; border-collapse: collapse;">
            <thead>
              <tr style="color: #64748b; border-bottom: 1px solid rgba(15,23,42,0.1);">
                <th style="padding: 4px;">System</th>
                <th>Paradigm</th>
                <th>Optimization</th>
                <th>Time Complexity</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom: 1px solid rgba(15,23,42,0.05);"><td style="padding: 4px; font-weight: 700;">Naive Bayes</td><td>Supervised</td><td>MLE + Laplace</td><td style="color:#059669; font-weight:700;">O(N · d) Linear</td></tr>
              <tr style="border-bottom: 1px solid rgba(15,23,42,0.05);"><td style="padding: 4px; font-weight: 700;">Neural Net</td><td>Supervised</td><td>Gradient Descent</td><td>O(N · Epochs · |W|)</td></tr>
              <tr style="border-bottom: 1px solid rgba(15,23,42,0.05);"><td style="padding: 4px; font-weight: 700;">K-Means</td><td>Unsupervised</td><td>Lloyd's Algorithm</td><td>O(N · K · d · iters)</td></tr>
              <tr style="border-bottom: 1px solid rgba(15,23,42,0.05);"><td style="padding: 4px; font-weight: 700;">Value Iteration</td><td>Model-Based RL</td><td>Bellman Dynamic Prog</td><td>O(|A| · |S|²)</td></tr>
              <tr><td style="padding: 4px; font-weight: 700;">Q-Learning</td><td>Model-Free RL</td><td>TD Bootstrapping</td><td>O(1) per step</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // --- Topic 10: Code Trace ---
  function renderCodeTraceView(container) {
    const presets = [
      { id: 'tfidf', name: '1. TF-IDF Extraction', file: 'python_sandbox/10_Machine_Learning.py' },
      { id: 'nb', name: '2. Naive Bayes Predict', file: 'python_sandbox/10_Machine_Learning.py' },
      { id: 'perceptron', name: '3. Perceptron Update', file: 'python_sandbox/10_Machine_Learning.py' },
      { id: 'kmeans', name: '4. K-Means Step', file: 'python_sandbox/10_Machine_Learning.py' },
      { id: 'vi', name: '5. Value Iteration Step', file: 'python_sandbox/11_Reinforcement_Learning.py' },
      { id: 'ql', name: '6. Q-Learning TD Update', file: 'python_sandbox/11_Reinforcement_Learning.py' }
    ];

    let selectedPreset = 'tfidf';

    function update() {
      container.innerHTML = `
        <div style="padding: 1rem; height: 100%; display: flex; flex-direction: column;">
          <div style="display: flex; gap: 0.35rem; overflow-x: auto; margin-bottom: 0.6rem;">
            ${presets.map(p => `
              <button class="trace-preset-btn ${p.id === selectedPreset ? 'active' : ''}" data-pid="${p.id}" style="padding: 0.3rem 0.55rem; border-radius: 6px; font-size: 0.72rem; font-weight: 600; cursor: pointer; border: 1px solid ${p.id === selectedPreset ? '#10b981' : 'rgba(15,23,42,0.1)'}; background: ${p.id === selectedPreset ? 'rgba(16,185,129,0.2)' : 'rgba(15,23,42,0.05)'}; color: ${p.id === selectedPreset ? '#047857' : '#64748b'};">
                ${p.name}
              </button>
            `).join('')}
          </div>

          <div style="flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; overflow: hidden;">
            <div class="glass-panel" style="padding: 0.7rem; border-radius: 8px; background: #f8fafc; overflow-y: auto; font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; color: #334155; line-height: 1.5; overflow-x: auto;">
              <div style="color: #64748b; margin-bottom: 0.3rem;"># Python Reference Source</div>
              <div style="white-space: pre;">${getCodeSnippet(selectedPreset).trim()}</div>
            </div>
            <div class="glass-panel" style="padding: 0.7rem; border-radius: 8px; background: rgba(15,23,42,0.03); overflow-y: auto; font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; color: #047857; line-height: 1.5;">
              <div style="color: #0284c7; font-weight: 700; margin-bottom: 0.3rem;">Runtime Variable Watch</div>
              <div style="white-space: pre-wrap;">${getRuntimeState(selectedPreset).trim()}</div>
            </div>
          </div>
        </div>
      `;

      container.querySelectorAll('.trace-preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          selectedPreset = btn.dataset.pid;
          update();
        });
      });
    }

    update();
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
