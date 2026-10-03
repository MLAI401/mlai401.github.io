/**
 * ui.js — Topic 05: Knowledge & Reasoning Lecture Page Controller (knowledge.html)
 *
 * Implements single-viewport interactive lecture controller:
 *   - 10 Topic Tabs (Progression, Logic, Resolution, Chaining, FOL, Bayes' Rule, BayesNet, Sampling, Evaluation, Code Trace)
 *   - Concept Selector Chips + Formal Definition + AIMA Notation + Teaching Tip
 *   - Right-Column Dynamic Interactive Visualizers & Steppers
 *   - Live Python Code Tracer for 5 core algorithms
 */

(function () {
  'use strict';

  const L = window.LogicEngine;
  const B = window.BayesEngine;

  // --- Topic Definitions ---
  const TOPICS = [
    { id: 'progression', title: 'Progression: Search → Games → CSP → Knowledge', short: '0 · Evolution' },
    { id: 'logic', title: 'Knowledge-Based Agents & Propositional Logic', short: '1 · Logic Agents' },
    { id: 'resolution', title: 'Logical Inference: Truth Tables & Resolution', short: '2 · Model & Resolution' },
    { id: 'chaining', title: 'Horn Clauses, Forward & Backward Chaining', short: '3 · Horn Chaining' },
    { id: 'fol', title: 'First-Order Logic & Knowledge Representation', short: '4 · First-Order Logic' },
    { id: 'uncertainty', title: 'Quantifying Uncertainty & Bayes\' Rule', short: '5 · Uncertainty & Bayes' },
    { id: 'bayesnet', title: 'Bayesian Networks & Independence', short: '6 · Bayesian Networks' },
    { id: 'inference', title: 'Probabilistic Inference: Exact & Sampling', short: '7 · Prob Inference' },
    { id: 'evaluation', title: 'Evaluating Knowledge & Reasoning Systems', short: '8 · Evaluation' },
    { id: 'code', title: 'Code Trace: Logic & Bayesian Algorithms', short: '9 · Code Trace' }
  ];

  const TOPIC_INTROS = [
    'How agents represent facts about the world: progressing from opaque atomic search states to factored variables, structured logical sentences, and continuous probabilistic belief distributions.',
    'A Knowledge-Based agent maintains an internal Knowledge Base (KB), tells it new percepts, and asks what action to take using crisp propositional logic syntax, semantics, and entailment.',
    'Deriving new truths with mathematical certainty: model checking via Truth Tables (TT-Entails) and proof by refutation via Conjunctive Normal Form and the Resolution Rule (PL-Resolution).',
    'Restricting knowledge to Horn clauses unlocks linear-time data-driven Forward Chaining (PL-FC-Entails) and targeted goal-driven Backward Chaining.',
    'Overcoming propositional limitations: First-Order Logic (FOL) adds objects, relations, functions, universal (∀) and existential (∃) quantifiers, and generalized unification.',
    'Real worlds are partially observable and noisy. Probabilities quantify degrees of belief, and Bayes\' Rule converts causal likelihoods into diagnostic probabilities.',
    'Bayesian Networks are Directed Acyclic Graphs that compactly factor the full joint distribution, exposing conditional independence and Markov Blankets.',
    'Answering probabilistic queries: exact inference via Enumeration and Variable Elimination versus scalable approximate Monte Carlo sampling (Rejection, Likelihood Weighting, Gibbs).',
    'Comprehensive multi-dimensional comparison of logical theorem provers vs. exact and approximate probabilistic inference engines across speed, guarantees, and scale.',
    'Step through clean, standalone Python implementations line by line — TT-Entails, PL-Resolution, Forward Chaining, Exact Bayes Enumeration, and Likelihood Weighting.'
  ];

  // --- Concept Data per Topic ---
  const CONCEPTS = {
    progression: [
      {
        key: 'evolution', name: 'State Representation Evolution',
        def: 'How the agent "sees" the world: Atomic (black box) → Factored (variables & domains) → Structured (objects, facts, logic, probabilistic relations).',
        notation: 'Atomic (s ∈ S) · Factored ({X<sub>i</sub> = v<sub>i</sub>}) · Structured (Sentences, P(X<sub>1</sub>...X<sub>n</sub>))',
        tip: 'Search treats states as indivisible opaque dots; CSP opens the dot into variables; Knowledge represents relationships and reasons over what must be true.',
        render: renderProgressionOverview
      },
      {
        key: 'certainty', name: 'Certainty vs. Uncertainty',
        def: 'Logic operates with crisp absolute truth (monotonic entailment); probabilistic models reason over continuous degrees of belief under incomplete or noisy percepts.',
        notation: 'Certainty: KB ⊨ α · Uncertainty: P(Query | Evidence)',
        tip: 'Use logic when rules are deterministic and closed; use probabilities when worlds are partially observable, noisy, or non-deterministic.',
        render: renderCertaintyGauge
      },
      {
        key: 'engine_arch', name: 'The Inference Engine Paradigm',
        def: 'Decoupling domain knowledge (facts and rules) from the inference engine (general-purpose reasoning algorithms).',
        notation: 'Agent = Knowledge Base (KB) + Inference Engine',
        tip: 'You change the domain by updating the facts without rewriting the search or reasoning algorithm.',
        render: renderInferenceArch
      }
    ],
    logic: [
      {
        key: 'kb_agent', name: 'Knowledge-Based Agent',
        def: 'An agent that maintains an internal Knowledge Base (KB), tells it new percepts, and asks it what action to perform.',
        notation: 'TELL(KB, sentence) · ASK(KB, query)',
        tip: 'A KB agent builds a model of the world by accumulating facts, not just reacting to immediate stimuli.',
        render: renderWumpusInteractive
      },
      {
        key: 'syntax', name: 'Syntax & Connectives',
        def: 'Formal rules for constructing valid sentences using symbols and logical operators (¬, ∧, ∨, ⇒, ⇔).',
        notation: 'P, Q · ¬P · P ∧ Q · P ∨ Q · P ⇒ Q · P ⇔ Q',
        tip: 'Note: P ⇒ Q is false ONLY when P is True and Q is False (vacuously true when P is false).',
        render: renderLogicGates
      },
      {
        key: 'entailment', name: 'Logical Entailment (KB ⊨ α)',
        def: 'A sentence α follows logically from KB if α is true in every model where KB is true (M(KB) ⊆ M(α)).',
        notation: 'KB ⊨ α ⇔ M(KB) ⊆ M(α)',
        tip: 'Entailment means: whenever the KB is true, α is guaranteed to be true. No counterexample exists.',
        render: renderVennEntailment
      }
    ],
    resolution: [
      {
        key: 'tt_entails', name: 'Truth Table Model Checking',
        def: 'Enumerating all 2ⁿ truth table models to verify that every model satisfying KB also satisfies query α.',
        notation: 'TT-ENTAILS?(KB, α) · Time O(2ⁿ), Space O(n)',
        tip: 'Simple and sound, but exponential in the number of propositional symbols n.',
        render: renderTruthTableChecker
      },
      {
        key: 'cnf_pipeline', name: 'Conjunctive Normal Form (CNF)',
        def: 'A conjunction of disjunctions of literals. Every propositional sentence can be converted to CNF in 4 systematic steps.',
        notation: '⋀<sub>i</sub> ⋁<sub>j</sub> L<sub>i,j</sub> · Eliminate ⇔, ⇒, push ¬ inward, distribute ∨ over ∧',
        tip: 'Converting to CNF is the required preprocessing step for Resolution Theorem Proving.',
        render: renderCNFConverter
      },
      {
        key: 'pl_res', name: 'Proof by Refutation (PL-Resolution)',
        def: 'To prove KB ⊨ α, add ¬α to KB in CNF and repeatedly resolve complementary clauses until deriving the empty clause □.',
        notation: 'KB ⊨ α ⇔ (KB ∧ ¬α) is unsatisfiable · Resolvent: (A ∨ B) ∧ (¬B ∨ C) ⊢ (A ∨ C)',
        tip: 'Deriving the empty clause □ proves there is a contradiction, meaning the premise ¬α was false, so α is true!',
        render: renderResolutionVisualizer
      }
    ],
    chaining: [
      {
        key: 'horn_def', name: 'Definite & Horn Clauses',
        def: 'A Definite Clause has exactly one positive literal ((P₁ ∧ ... ∧ Pₖ) ⇒ Q). A Horn Clause has at most one positive literal.',
        notation: 'Premise ⇒ Conclusion · (P₁ ∧ … ∧ Pₖ) ⇒ Q ≡ ¬P₁ ∨ … ∨ ¬Pₖ ∨ Q',
        tip: 'Real-world rules ("If symptom A and symptom B, then condition C") naturally form Horn clauses.',
        render: renderHornClassifier
      },
      {
        key: 'forward_chain', name: 'Forward Chaining (PL-FC-Entails)',
        def: 'Data-driven inference: starts with known facts, fires rules whose premises are met, adds conclusions, and repeats until goal is derived.',
        notation: 'count[c] = number of un-inferred premises · Time O(N) Linear in KB size!',
        tip: 'Forward chaining is linear time! Ideal for real-time monitoring and reactive expert systems.',
        render: renderForwardChainingTree
      },
      {
        key: 'backward_chain', name: 'Backward Chaining',
        def: 'Goal-driven inference: starts with the query Q, finds rules that conclude Q, and recursively tries to prove their premises.',
        notation: 'Prove(Q) → Prove(P₁) ∧ … ∧ Prove(Pₖ)',
        tip: 'Backward chaining only touches facts and rules relevant to the query, avoiding unnecessary deductions.',
        render: renderBackwardChainingTree
      }
    ],
    fol: [
      {
        key: 'fol_vs_prop', name: 'Propositional vs. FOL Expressiveness',
        def: 'Propositional logic requires duplicate rules for every location. FOL adds Objects, Relations/Predicates, and Quantifiers.',
        notation: 'FOL Wumpus: ∀x,y Breeze(x,y) ⇔ ∃a,b Adjacent(x,y,a,b) ∧ Pit(a,b)',
        tip: 'Propositional logic sees atomic facts; First-Order Logic sees structured objects and relationships.',
        render: renderFOLComparison
      },
      {
        key: 'quantifiers', name: 'Universal (∀) & Existential (∃) Quantifiers',
        def: '∀x P(x) asserts P is true for ALL objects; ∃x P(x) asserts P is true for AT LEAST ONE object.',
        notation: '∀x King(x) ⇒ Person(x) · ∃x Crown(x) ∧ OnHead(x, John)',
        tip: 'Golden rule: ∀ usually pairs with ⇒ (implication); ∃ usually pairs with ∧ (conjunction).',
        render: renderQuantifierStudio
      }
    ],
    uncertainty: [
      {
        key: 'degrees_of_belief', name: 'Uncertainty & Probabilities',
        def: 'In real worlds, partial observability and noisy sensors make absolute logic impossible. Probabilities quantify degrees of belief.',
        notation: 'P(A) ∈ [0, 1] · P(True) = 1, P(False) = 0 · Σ P(x) = 1',
        tip: 'Probability represents an agent\'s state of knowledge given evidence, not necessarily physical randomness.',
        render: renderBeliefDistribution
      },
      {
        key: 'bayes_rule', name: 'Bayes\' Rule & Medical Diagnosis',
        def: 'Derives posterior probability P(Cause | Effect) from causal likelihood P(Effect | Cause), prior P(Cause), and evidence P(Effect).',
        notation: 'P(Y | X) = [P(X | Y) · P(Y)] / P(X) = α · P(X | Y) · P(Y)',
        tip: 'Notice how a 95% accurate test for a 1% rare disease yields only ~16.1% posterior probability due to false positives!',
        render: renderMedicalBayesCalculator
      }
    ],
    bayesnet: [
      {
        key: 'bn_syntax', name: 'Bayesian Network DAG & CPTs',
        def: 'A Directed Acyclic Graph (DAG) where nodes represent random variables and directed edges represent direct probabilistic influence.',
        notation: 'DAG G = (V, E) · Joint: P(x₁…xₙ) = ∏ P(xᵢ | Parents(Xᵢ))',
        tip: 'A Bayesian Network is a compact factored representation of the full joint distribution.',
        render: renderBurglarAlarmDAG
      },
      {
        key: 'markov_blanket', name: 'Markov Blanket & Independence',
        def: 'A node is conditionally independent of all other nodes in the network given its Markov Blanket (Parents, Children, and Coparents).',
        notation: 'MB(X) = Parents(X) ∪ Children(X) ∪ Coparents(X)',
        tip: 'The Markov Blanket forms a complete protective shield of evidence around a variable.',
        render: renderMarkovBlanketInspector
      },
      {
        key: 'explaining_away', name: 'Causal vs. Explaining-Away Reasoning',
        def: 'Top-down (cause to effect), Bottom-up (effect to cause), and Inter-causal interaction (two causes competing to explain one symptom).',
        notation: 'Explaining-Away: P(Burglary | Alarm, Earthquake) < P(Burglary | Alarm)',
        tip: 'If the alarm rings and you learn an earthquake occurred, the probability of burglary plummets!',
        render: renderExplainingAwayStudio
      }
    ],
    inference: [
      {
        key: 'exact_ve', name: 'Exact Inference by Variable Elimination',
        def: 'Sums out hidden variables one by one, storing intermediate sums as factors to avoid redundant calculations.',
        notation: 'f₁ × f₂ (Pointwise product) · Σ<sub>Y</sub> f (Summing out)',
        tip: 'Variable elimination is to Bayesian inference what dynamic programming is to shortest-path search.',
        render: renderVariableEliminationVisualizer
      },
      {
        key: 'sampling_comp', name: 'Approximate Monte Carlo Sampling',
        def: 'Prior Sampling, Rejection Sampling (rejects mismatches), and Likelihood Weighting (weights each sample by evidence likelihood).',
        notation: 'Rejection: N(X,e)/N(e) · Likelihood Weighting: w = ∏ P(eⱼ | parents)',
        tip: 'Likelihood Weighting never discards samples, making it vastly superior when evidence is rare.',
        render: renderSamplingSimulation
      }
    ],
    evaluation: [
      {
        key: 'solver_matrix', name: 'Reasoning Engines Comparison Matrix',
        def: 'Comprehensive evaluation of logical provers vs. exact and approximate probabilistic inference engines.',
        notation: 'Logic: Sound & Complete · Bayes Exact: O(d<sup>w+1</sup>) · Bayes Sampling: Consistent (N → ∞)',
        tip: 'Choose propositional logic for verified safety guarantees; choose Bayesian networks for medical and robotic decisions under uncertainty.',
        render: renderEvaluationMatrix
      }
    ],
    code: [
      {
        key: 'code_trace', name: 'Interactive Code Trace',
        def: 'Line-by-line stepping through runnable Python logic and Bayesian algorithms with real-time runtime state inspection.',
        notation: 'python_sandbox/08_Logic_Reasoning.py & 09_Bayesian_Reasoning.py',
        tip: 'Select any of the 5 algorithm presets to trace execution step-by-step.',
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

    // Hash navigation listener
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
    const container = document.getElementById('knowledge-topic-tabs');
    if (!container) return;
    container.innerHTML = TOPICS.map((t, idx) => `
      <button class="sl-topic-tab ${idx === currentTopicIndex ? 'active' : ''}" data-idx="${idx}">
        ${t.short}
      </button>
    `).join('');

    container.querySelectorAll('.sl-topic-tab').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(btn.dataset.idx, 10);
        loadTopic(idx, 0);
      });
    });
  }

  function loadTopic(topicIdx, conceptIdx) {
    currentTopicIndex = topicIdx;
    currentConceptIndex = conceptIdx;

    // Update Tab Active States
    document.querySelectorAll('#knowledge-topic-tabs .sl-topic-tab').forEach((b, i) => {
      b.classList.toggle('active', i === topicIdx);
    });

    const topic = TOPICS[topicIdx];
    const concepts = CONCEPTS[topic.id] || [];

    // Render Left Column (Concepts)
    renderConceptColumn(topic, concepts, currentConceptIndex);

    // Render Right Column (Visualizer)
    renderIllustrationColumn(concepts[currentConceptIndex]);

    if (window.lucide) window.lucide.createIcons();
  }

  function renderConceptColumn(topic, concepts, cIdx) {
    const col = document.getElementById('knowledge-concept-col');
    if (!col) return;

    const currentC = concepts[cIdx] || concepts[0];

    col.innerHTML = `
      <div class="sl-concept-header">
        <h2 style="font-size: 1.25rem; font-weight: 700; color: #fff; margin-bottom: 0.5rem;">${topic.title}</h2>
        <p style="font-size: 0.88rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 1rem;">
          ${TOPIC_INTROS[currentTopicIndex]}
        </p>
      </div>

      <div class="sl-concept-chips" style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1.2rem;">
        ${concepts.map((c, idx) => `
          <button class="sl-concept-chip ${idx === cIdx ? 'active' : ''}" data-cidx="${idx}" style="padding: 0.4rem 0.8rem; border-radius: 9999px; font-size: 0.8rem; font-weight: 600; cursor: pointer; border: 1px solid ${idx === cIdx ? '#8b5cf6' : 'rgba(255,255,255,0.1)'}; background: ${idx === cIdx ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.03)'}; color: ${idx === cIdx ? '#c4b5fd' : '#94a3b8'}; transition: all 0.2s;">
            ${c.name}
          </button>
        `).join('')}
      </div>

      <div class="sl-concept-card glass-panel" style="padding: 1.2rem; border-radius: 12px; background: rgba(15,23,42,0.6); border: 1px solid rgba(255,255,255,0.08); margin-bottom: 1rem;">
        <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #818cf8; font-weight: 700; margin-bottom: 0.4rem;">Formal Definition</div>
        <p style="font-size: 0.92rem; color: #f8fafc; line-height: 1.55; margin-bottom: 1rem;">
          ${currentC.def}
        </p>

        <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #38bdf8; font-weight: 700; margin-bottom: 0.4rem;">AIMA Mathematical Notation</div>
        <div style="font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; padding: 0.75rem 1rem; background: rgba(0,0,0,0.4); border-radius: 8px; border-left: 3px solid #38bdf8; color: #e2e8f0; margin-bottom: 1rem; word-break: break-word;">
          ${currentC.notation}
        </div>

        <div class="teaching-tip" style="display: flex; gap: 0.75rem; background: rgba(139,92,246,0.1); border: 1px solid rgba(139,92,246,0.25); padding: 0.85rem 1rem; border-radius: 8px;">
          <i data-lucide="sparkles" style="color: #a78bfa; width: 1.25rem; height: 1.25rem; flex-shrink: 0; margin-top: 2px;"></i>
          <span style="font-size: 0.84rem; color: #ddd6fe; line-height: 1.5;">${currentC.tip}</span>
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
    const col = document.getElementById('knowledge-graph-col');
    if (!col) return;
    col.innerHTML = '';
    if (concept && typeof concept.render === 'function') {
      concept.render(col);
    }
  }

  // =========================================================================
  // Illustration Renderers for Each Concept
  // =========================================================================

  // --- Topic 0: Progression ---
  function renderProgressionOverview(container) {
    container.innerHTML = `
      <div style="padding: 1.2rem; height: 100%; display: flex; flex-direction: column;">
        <h3 style="font-size: 1.05rem; font-weight: 700; color: #fff; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
          <i data-lucide="layers" style="color: #818cf8;"></i> State Representation Evolution Across Topics 02–05
        </h3>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; flex: 1;">
          <div class="glass-panel" style="padding: 0.9rem; border-radius: 10px; background: rgba(30,41,59,0.5); border: 1px solid rgba(255,255,255,0.06);">
            <div style="font-size: 0.8rem; font-weight: 700; color: #38bdf8; margin-bottom: 0.3rem;">Topic 02: Atomic States</div>
            <p style="font-size: 0.78rem; color: #94a3b8; margin-bottom: 0.5rem;">State is an opaque, indivisible black box token.</p>
            <div style="font-family: monospace; font-size: 0.75rem; padding: 0.5rem; background: rgba(0,0,0,0.3); border-radius: 6px; color: #cbd5e1;">s = "Arad" | "Bucharest"</div>
          </div>
          <div class="glass-panel" style="padding: 0.9rem; border-radius: 10px; background: rgba(30,41,59,0.5); border: 1px solid rgba(255,255,255,0.06);">
            <div style="font-size: 0.8rem; font-weight: 700; color: #a78bfa; margin-bottom: 0.3rem;">Topic 04: Factored States</div>
            <p style="font-size: 0.78rem; color: #94a3b8; margin-bottom: 0.5rem;">State broken into variables with finite domains.</p>
            <div style="font-family: monospace; font-size: 0.75rem; padding: 0.5rem; background: rgba(0,0,0,0.3); border-radius: 6px; color: #cbd5e1;">{WA: red, NT: green, SA: blue}</div>
          </div>
          <div class="glass-panel" style="padding: 0.9rem; border-radius: 10px; background: rgba(30,41,59,0.5); border: 1px solid rgba(255,255,255,0.06);">
            <div style="font-size: 0.8rem; font-weight: 700; color: #10b981; margin-bottom: 0.3rem;">Topic 05A: Logical Sentences</div>
            <p style="font-size: 0.78rem; color: #94a3b8; margin-bottom: 0.5rem;">Structured facts & rules with strict entailment.</p>
            <div style="font-family: monospace; font-size: 0.75rem; padding: 0.5rem; background: rgba(0,0,0,0.3); border-radius: 6px; color: #cbd5e1;">Breeze₁₁ ⇔ (Pit₁₂ ∨ Pit₂₁)</div>
          </div>
          <div class="glass-panel" style="padding: 0.9rem; border-radius: 10px; background: rgba(30,41,59,0.5); border: 1px solid rgba(255,255,255,0.06);">
            <div style="font-size: 0.8rem; font-weight: 700; color: #f59e0b; margin-bottom: 0.3rem;">Topic 05B: Probabilistic Networks</div>
            <p style="font-size: 0.78rem; color: #94a3b8; margin-bottom: 0.5rem;">Factored conditional probability distributions.</p>
            <div style="font-family: monospace; font-size: 0.75rem; padding: 0.5rem; background: rgba(0,0,0,0.3); border-radius: 6px; color: #cbd5e1;">P(Alarm | Burglary, Earthquake)</div>
          </div>
        </div>
      </div>
    `;
  }

  function renderCertaintyGauge(container) {
    container.innerHTML = `
      <div style="padding: 1.2rem; height: 100%; display: flex; flex-direction: column; justify-content: center; gap: 1.5rem;">
        <h3 style="font-size: 1.05rem; font-weight: 700; color: #fff; display: flex; align-items: center; gap: 0.5rem;">
          <i data-lucide="gauge" style="color: #a78bfa;"></i> Binary Truth vs. Continuous Degrees of Belief
        </h3>
        <div class="glass-panel" style="padding: 1.2rem; border-radius: 12px; background: rgba(15,23,42,0.6);">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
            <span style="font-size: 0.85rem; font-weight: 600; color: #94a3b8;">Propositional Logic (Binary Switch):</span>
            <span id="logic-switch-val" style="font-size: 0.85rem; font-weight: 700; color: #10b981;">TRUE (1.0)</span>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button id="btn-switch-true" style="flex: 1; padding: 0.5rem; background: #10b981; color: #fff; font-weight: 700; border: none; border-radius: 6px; cursor: pointer;">True</button>
            <button id="btn-switch-false" style="flex: 1; padding: 0.5rem; background: rgba(255,255,255,0.1); color: #94a3b8; font-weight: 700; border: none; border-radius: 6px; cursor: pointer;">False</button>
          </div>
        </div>
        <div class="glass-panel" style="padding: 1.2rem; border-radius: 12px; background: rgba(15,23,42,0.6);">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
            <span style="font-size: 0.85rem; font-weight: 600; color: #94a3b8;">Probabilistic Reasoning (Continuous Belief):</span>
            <span id="prob-slider-val" style="font-size: 0.85rem; font-weight: 700; color: #818cf8;">P(Event) = 0.75</span>
          </div>
          <input type="range" id="prob-slider" min="0" max="1" step="0.01" value="0.75" style="width: 100%; accent-color: #818cf8;">
          <div style="height: 12px; border-radius: 6px; background: rgba(0,0,0,0.4); margin-top: 0.75rem; overflow: hidden;">
            <div id="prob-bar" style="height: 100%; width: 75%; background: linear-gradient(90deg, #6366f1, #38bdf8); transition: width 0.1s;"></div>
          </div>
        </div>
      </div>
    `;

    const btnT = container.querySelector('#btn-switch-true');
    const btnF = container.querySelector('#btn-switch-false');
    const switchVal = container.querySelector('#logic-switch-val');
    btnT.addEventListener('click', () => {
      btnT.style.background = '#10b981';
      btnT.style.color = '#fff';
      btnF.style.background = 'rgba(255,255,255,0.1)';
      btnF.style.color = '#94a3b8';
      switchVal.textContent = 'TRUE (1.0)';
      switchVal.style.color = '#10b981';
    });
    btnF.addEventListener('click', () => {
      btnF.style.background = '#f43f5e';
      btnF.style.color = '#fff';
      btnT.style.background = 'rgba(255,255,255,0.1)';
      btnT.style.color = '#94a3b8';
      switchVal.textContent = 'FALSE (0.0)';
      switchVal.style.color = '#f43f5e';
    });

    const slider = container.querySelector('#prob-slider');
    const sliderVal = container.querySelector('#prob-slider-val');
    const probBar = container.querySelector('#prob-bar');
    slider.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      sliderVal.textContent = `P(Event) = ${v.toFixed(2)}`;
      probBar.style.width = `${v * 100}%`;
    });
  }

  function renderInferenceArch(container) {
    container.innerHTML = `
      <div style="padding: 1.2rem; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center;">
        <h3 style="font-size: 1.05rem; font-weight: 700; color: #fff; margin-bottom: 1.5rem;">
          The Decoupled Inference Engine Architecture
        </h3>
        <div style="display: flex; gap: 1rem; align-items: center; width: 100%; max-width: 500px;">
          <div class="glass-panel" style="flex: 1; padding: 1.2rem; border-radius: 12px; text-align: center; border: 2px dashed #818cf8; background: rgba(99,102,241,0.1);">
            <i data-lucide="database" style="color: #818cf8; margin-bottom: 0.5rem;"></i>
            <div style="font-weight: 700; color: #fff; font-size: 0.9rem;">Knowledge Base (KB)</div>
            <div style="font-size: 0.75rem; color: #cbd5e1; margin-top: 0.3rem;">Domain facts & rules (Interchangeable)</div>
          </div>
          <div style="font-size: 1.5rem; color: #94a3b8;">+</div>
          <div class="glass-panel" style="flex: 1; padding: 1.2rem; border-radius: 12px; text-align: center; border: 1px solid rgba(255,255,255,0.1); background: rgba(30,41,59,0.5);">
            <i data-lucide="cpu" style="color: #10b981; margin-bottom: 0.5rem;"></i>
            <div style="font-weight: 700; color: #fff; font-size: 0.9rem;">Inference Engine</div>
            <div style="font-size: 0.75rem; color: #cbd5e1; margin-top: 0.3rem;">General algorithms (Resolution, VE)</div>
          </div>
        </div>
        <div style="font-size: 1.2rem; color: #94a3b8; margin: 0.75rem 0;">↓</div>
        <div class="glass-panel" style="width: 100%; max-width: 500px; padding: 0.9rem; border-radius: 10px; text-align: center; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3);">
          <span style="font-weight: 700; color: #10b981; font-size: 0.9rem;">Rational Decisions & Derived Theorems</span>
        </div>
      </div>
    `;
  }

  // --- Topic 1: Logic Agents & Wumpus ---
  function renderWumpusInteractive(container) {
    const world = new L.WumpusLogicWorld(4);
    let agentX = 1, agentY = 1;
    world.senseAt(1, 1);

    function updateView() {
      container.innerHTML = `
        <div style="padding: 1rem; height: 100%; display: flex; flex-direction: column;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
            <h3 style="font-size: 1rem; font-weight: 700; color: #fff; display: flex; align-items: center; gap: 0.4rem;">
              <i data-lucide="map" style="color: #10b981;"></i> Wumpus World 4×4 Logic Explorer
            </h3>
            <span style="font-size: 0.8rem; color: #38bdf8;">Agent at [${agentX}, ${agentY}]</span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; aspect-ratio: 1; max-height: 260px; margin: 0 auto; width: 100%;">
            ${Array.from({ length: 16 }).map((_, idx) => {
              const row = 4 - Math.floor(idx / 4);
              const col = (idx % 4) + 1;
              const isAgent = agentX === col && agentY === row;
              const isVisited = world.visited.has(`${col},${row}`);
              const hasBreeze = world.percepts.breeze.has(`${col},${row}`);
              const hasStench = world.percepts.stench.has(`${col},${row}`);
              const isSafeRoom = world.isSafe(col, row);

              let badge = '';
              if (isAgent) badge = '🤖';
              else if (isVisited) badge = '👣';
              else if (isSafeRoom) badge = '✓ Safe';
              else badge = '?';

              return `
                <div class="wumpus-cell" data-x="${col}" data-y="${row}" style="background: ${isAgent ? 'rgba(99,102,241,0.3)' : isVisited ? 'rgba(30,41,59,0.7)' : 'rgba(15,23,42,0.6)'}; border: 1px solid ${isSafeRoom ? '#10b981' : 'rgba(255,255,255,0.1)'}; border-radius: 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; position: relative;">
                  <span style="font-size: 0.65rem; color: #64748b; position: absolute; top: 2px; left: 3px;">[${col},${row}]</span>
                  <span style="font-size: 0.85rem; font-weight: 700; color: ${isSafeRoom ? '#10b981' : '#cbd5e1'};">${badge}</span>
                  <div style="display: flex; gap: 2px; position: absolute; bottom: 2px;">
                    ${hasBreeze ? '<span title="Breeze" style="font-size: 0.65rem;">💨</span>' : ''}
                    ${hasStench ? '<span title="Stench" style="font-size: 0.65rem;">👃</span>' : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <div style="margin-top: 0.75rem; flex: 1; display: flex; flex-direction: column;">
            <div style="font-size: 0.75rem; font-weight: 700; color: #94a3b8; margin-bottom: 0.3rem;">Knowledge Base Sentences (KB):</div>
            <div style="font-family: monospace; font-size: 0.72rem; padding: 0.5rem; background: rgba(0,0,0,0.4); border-radius: 6px; color: #a78bfa; overflow-y: auto; flex: 1;">
              ${world.kb.slice(-5).map(s => `• TELL(KB, ${s.toString()})`).join('<br>')}
            </div>
          </div>
        </div>
      `;

      container.querySelectorAll('.wumpus-cell').forEach(cell => {
        cell.addEventListener('click', () => {
          const x = parseInt(cell.dataset.x, 10);
          const y = parseInt(cell.dataset.y, 10);
          agentX = x;
          agentY = y;
          world.visited.add(`${x},${y}`);
          world.senseAt(x, y);
          updateView();
          if (window.lucide) window.lucide.createIcons();
        });
      });
    }

    updateView();
  }

  function renderLogicGates(container) {
    let p = true;
    let q = false;

    function update() {
      container.innerHTML = `
        <div style="padding: 1.2rem; height: 100%; display: flex; flex-direction: column; justify-content: center; gap: 1rem;">
          <h3 style="font-size: 1.05rem; font-weight: 700; color: #fff;">Interactive Connectives & Truth Table</h3>
          <div style="display: flex; gap: 1rem;">
            <div class="glass-panel" style="flex: 1; padding: 0.75rem; border-radius: 8px; text-align: center;">
              <span style="font-size: 0.8rem; color: #94a3b8;">Input P:</span>
              <button id="toggle-p" style="display: block; width: 100%; margin-top: 0.4rem; padding: 0.4rem; font-weight: 700; border-radius: 6px; border: none; background: ${p ? '#10b981' : '#f43f5e'}; color: #fff; cursor: pointer;">
                ${p ? 'TRUE' : 'FALSE'}
              </button>
            </div>
            <div class="glass-panel" style="flex: 1; padding: 0.75rem; border-radius: 8px; text-align: center;">
              <span style="font-size: 0.8rem; color: #94a3b8;">Input Q:</span>
              <button id="toggle-q" style="display: block; width: 100%; margin-top: 0.4rem; padding: 0.4rem; font-weight: 700; border-radius: 6px; border: none; background: ${q ? '#10b981' : '#f43f5e'}; color: #fff; cursor: pointer;">
                ${q ? 'TRUE' : 'FALSE'}
              </button>
            </div>
          </div>

          <div class="glass-panel" style="padding: 0.9rem; border-radius: 10px; background: rgba(15,23,42,0.6);">
            <table style="width: 100%; font-size: 0.82rem; text-align: center; border-collapse: collapse;">
              <thead>
                <tr style="color: #94a3b8; border-bottom: 1px solid rgba(255,255,255,0.1);">
                  <th style="padding: 0.4rem;">Formula</th>
                  <th>Name</th>
                  <th>Evaluated Output</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="padding: 0.4rem; font-family: monospace;">¬P</td>
                  <td>Negation</td>
                  <td style="font-weight: 700; color: ${!p ? '#10b981' : '#f43f5e'};">${!p ? 'TRUE' : 'FALSE'}</td>
                </tr>
                <tr>
                  <td style="padding: 0.4rem; font-family: monospace;">P ∧ Q</td>
                  <td>Conjunction</td>
                  <td style="font-weight: 700; color: ${(p && q) ? '#10b981' : '#f43f5e'};">${(p && q) ? 'TRUE' : 'FALSE'}</td>
                </tr>
                <tr>
                  <td style="padding: 0.4rem; font-family: monospace;">P ∨ Q</td>
                  <td>Disjunction</td>
                  <td style="font-weight: 700; color: ${(p || q) ? '#10b981' : '#f43f5e'};">${(p || q) ? 'TRUE' : 'FALSE'}</td>
                </tr>
                <tr style="background: rgba(99,102,241,0.1);">
                  <td style="padding: 0.4rem; font-family: monospace;">P ⇒ Q</td>
                  <td>Implication</td>
                  <td style="font-weight: 700; color: ${(!p || q) ? '#10b981' : '#f43f5e'};">${(!p || q) ? 'TRUE' : 'FALSE'}</td>
                </tr>
                <tr>
                  <td style="padding: 0.4rem; font-family: monospace;">P ⇔ Q</td>
                  <td>Biconditional</td>
                  <td style="font-weight: 700; color: ${(p === q) ? '#10b981' : '#f43f5e'};">${(p === q) ? 'TRUE' : 'FALSE'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;

      container.querySelector('#toggle-p').addEventListener('click', () => { p = !p; update(); });
      container.querySelector('#toggle-q').addEventListener('click', () => { q = !q; update(); });
    }

    update();
  }

  function renderVennEntailment(container) {
    container.innerHTML = `
      <div style="padding: 1.2rem; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center;">
        <h3 style="font-size: 1.05rem; font-weight: 700; color: #fff; margin-bottom: 1rem;">
          Venn Diagram: Logical Entailment M(KB) ⊆ M(α)
        </h3>
        <svg viewBox="0 0 400 240" style="width: 100%; max-width: 380px;">
          <!-- All Possible Worlds Universe -->
          <rect x="10" y="10" width="380" height="220" rx="12" fill="rgba(15,23,42,0.8)" stroke="#475569" stroke-width="2"/>
          <text x="25" y="35" fill="#64748b" font-size="12" font-family="sans-serif">Universe of all 2ⁿ Possible Worlds</text>

          <!-- Models of Alpha M(α) -->
          <circle cx="200" cy="130" r="85" fill="rgba(56,189,248,0.15)" stroke="#38bdf8" stroke-width="2"/>
          <text x="200" y="70" fill="#38bdf8" font-size="13" font-weight="700" text-anchor="middle">M(α) : Worlds where α is True</text>

          <!-- Models of KB M(KB) -->
          <circle cx="200" cy="140" r="45" fill="rgba(16,185,129,0.3)" stroke="#10b981" stroke-width="2"/>
          <text x="200" y="145" fill="#10b981" font-size="12" font-weight="700" text-anchor="middle">M(KB)</text>
        </svg>
        <div style="font-size: 0.8rem; color: #94a3b8; text-align: center; margin-top: 0.75rem;">
          Since every model where KB is true is strictly enclosed inside M(α), <strong style="color: #10b981;">KB ⊨ α</strong> holds!
        </div>
      </div>
    `;
  }

  // --- Topic 2: Resolution & Truth Tables ---
  function renderTruthTableChecker(container) {
    const kb = ['~P11', 'B11 <=> (P12 | P21)', '~B11'];
    const alpha = '~P12';
    const res = L.ttEntails(kb, alpha);

    container.innerHTML = `
      <div style="padding: 1rem; height: 100%; display: flex; flex-direction: column;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <h3 style="font-size: 0.95rem; font-weight: 700; color: #fff;">Truth Table Model Checking (16 Models)</h3>
          <span style="font-size: 0.78rem; font-weight: 700; color: #10b981;">KB ⊨ ¬P12 : TRUE</span>
        </div>
        <div style="flex: 1; overflow-y: auto; background: rgba(15,23,42,0.6); border-radius: 8px; padding: 0.5rem;">
          <table style="width: 100%; font-size: 0.75rem; text-align: center; border-collapse: collapse; font-family: monospace;">
            <thead>
              <tr style="color: #94a3b8; border-bottom: 1px solid rgba(255,255,255,0.1);">
                ${res.symbols.map(s => `<th>${s}</th>`).join('')}
                <th style="color: #818cf8;">KB</th>
                <th style="color: #38bdf8;">α (¬P12)</th>
              </tr>
            </thead>
            <tbody>
              ${res.rows.map(r => `
                <tr style="background: ${r.kbVal ? 'rgba(16,185,129,0.2)' : 'transparent'}; border-bottom: 1px solid rgba(255,255,255,0.03);">
                  ${res.symbols.map(s => `<td>${r.model[s] ? 'T' : 'F'}</td>`).join('')}
                  <td style="font-weight: 700; color: ${r.kbVal ? '#10b981' : '#64748b'};">${r.kbVal ? 'T ★' : 'F'}</td>
                  <td style="font-weight: 700; color: ${r.alphaVal ? '#38bdf8' : '#f43f5e'};">${r.alphaVal ? 'T' : 'F'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderCNFConverter(container) {
    const rawFormula = '(A | B) >> (C & D)';
    const res = L.toCNF(rawFormula);

    container.innerHTML = `
      <div style="padding: 1.2rem; height: 100%; display: flex; flex-direction: column; justify-content: center; gap: 0.75rem;">
        <h3 style="font-size: 1rem; font-weight: 700; color: #fff;">4-Step CNF Conversion Pipeline</h3>
        ${res.steps.map(s => `
          <div class="glass-panel" style="padding: 0.65rem 0.9rem; border-radius: 8px; background: rgba(30,41,59,0.5); border-left: 3px solid ${s.step === 4 ? '#10b981' : '#818cf8'};">
            <div style="font-size: 0.72rem; color: #94a3b8; font-weight: 600;">Step ${s.step}: ${s.title}</div>
            <div style="font-family: monospace; font-size: 0.82rem; color: #fff; margin-top: 2px;">${s.expr}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderResolutionVisualizer(container) {
    const kb = ['(A | B)', '(~B | C)', '~C', '~A'];
    const res = L.plResolution(kb, 'A');

    container.innerHTML = `
      <div style="padding: 1rem; height: 100%; display: flex; flex-direction: column;">
        <h3 style="font-size: 1rem; font-weight: 700; color: #fff; margin-bottom: 0.5rem;">
          Resolution Refutation Proof Tree (Deriving □)
        </h3>
        <div style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem;">
          <div style="font-size: 0.75rem; color: #94a3b8;">Initial Clauses:</div>
          <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
            ${res.initialClauses.map((c, i) => `
              <span style="font-family: monospace; font-size: 0.75rem; padding: 0.25rem 0.5rem; background: rgba(99,102,241,0.2); border: 1px solid #6366f1; border-radius: 4px; color: #c4b5fd;">
                C${i+1}: ${c.join(' ∨ ')}
              </span>
            `).join('')}
          </div>

          <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 0.5rem;">Resolution Derivations:</div>
          ${res.trace.map(t => `
            <div class="glass-panel" style="padding: 0.5rem 0.75rem; border-radius: 6px; font-size: 0.78rem; font-family: monospace; border-left: 3px solid ${t.isEmpty ? '#f43f5e' : '#38bdf8'}; background: ${t.isEmpty ? 'rgba(244,63,94,0.15)' : 'rgba(30,41,59,0.5)'};">
              <span style="color: #94a3b8;">Resolve (${t.c1}) + (${t.c2}) ➔</span>
              <strong style="color: ${t.isEmpty ? '#f43f5e' : '#38bdf8'};"> ${t.resolvent}</strong>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // --- Topic 3: Horn Chaining ---
  function renderHornClassifier(container) {
    container.innerHTML = `
      <div style="padding: 1.2rem; height: 100%; display: flex; flex-direction: column; justify-content: center; gap: 0.75rem;">
        <h3 style="font-size: 1rem; font-weight: 700; color: #fff;">Horn & Definite Clause Taxonomy</h3>
        <div class="glass-panel" style="padding: 0.85rem; border-radius: 8px; border-left: 3px solid #10b981; background: rgba(16,185,129,0.05);">
          <div style="font-weight: 700; color: #10b981; font-size: 0.85rem;">Definite Clause (Exactly 1 positive literal)</div>
          <div style="font-family: monospace; font-size: 0.8rem; color: #e2e8f0; margin-top: 3px;">A ∧ B ⇒ C ≡ ¬A ∨ ¬B ∨ C</div>
        </div>
        <div class="glass-panel" style="padding: 0.85rem; border-radius: 8px; border-left: 3px solid #f59e0b; background: rgba(245,158,11,0.05);">
          <div style="font-weight: 700; color: #f59e0b; font-size: 0.85rem;">Goal / Integrity Clause (0 positive literals)</div>
          <div style="font-family: monospace; font-size: 0.8rem; color: #e2e8f0; margin-top: 3px;">¬A ∨ ¬B ≡ A ∧ B ⇒ False</div>
        </div>
        <div class="glass-panel" style="padding: 0.85rem; border-radius: 8px; border-left: 3px solid #f43f5e; background: rgba(244,63,94,0.05);">
          <div style="font-weight: 700; color: #f43f5e; font-size: 0.85rem;">Non-Horn Clause (> 1 positive literal)</div>
          <div style="font-family: monospace; font-size: 0.8rem; color: #e2e8f0; margin-top: 3px;">A ∨ B (Cannot be solved with linear forward chaining!)</div>
        </div>
      </div>
    `;
  }

  function renderForwardChainingTree(container) {
    const rules = [
      { premises: ['Fever', 'Cough'], conclusion: 'RespInf' },
      { premises: ['RespInf', 'SoreThroat'], conclusion: 'Flu' },
      { premises: ['Fever'], conclusion: 'HighTemp' },
      { premises: ['RespInf'], conclusion: 'RestPrescribed' }
    ];
    const facts = ['Fever', 'Cough'];
    const res = L.plFCEntails(rules, facts, 'RestPrescribed');

    container.innerHTML = `
      <div style="padding: 1rem; height: 100%; display: flex; flex-direction: column;">
        <h3 style="font-size: 1rem; font-weight: 700; color: #fff; margin-bottom: 0.5rem;">
          Forward Chaining AND-OR Execution Trace
        </h3>
        <div style="display: flex; gap: 0.5rem; margin-bottom: 0.75rem;">
          <span style="font-size: 0.75rem; color: #94a3b8;">Initial Facts:</span>
          ${facts.map(f => `<span style="font-size: 0.75rem; padding: 2px 6px; border-radius: 4px; background: #10b981; color: #fff; font-weight: 700;">${f}</span>`).join('')}
        </div>
        <div style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 0.4rem;">
          ${res.trace.map(t => `
            <div class="glass-panel" style="padding: 0.45rem 0.75rem; border-radius: 6px; font-size: 0.78rem; font-family: monospace; background: rgba(30,41,59,0.5);">
              ${t.type === 'pop' ? `<span style="color: #38bdf8;">• Pop from Agenda: <strong>${t.symbol}</strong></span>` : ''}
              ${t.type === 'decrement' ? `<span style="color: #94a3b8;">Decremented rule count: ${t.ruleStr} (Remaining: ${t.remCount})</span>` : ''}
              ${t.type === 'fire' ? `<span style="color: #10b981; font-weight: 700;">🔥 RULE FIRED: ${t.ruleStr} ➔ Inferred: ${t.conclusion}</span>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderBackwardChainingTree(container) {
    container.innerHTML = `
      <div style="padding: 1.2rem; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center;">
        <h3 style="font-size: 1rem; font-weight: 700; color: #fff; margin-bottom: 1rem;">
          Backward Chaining Goal Decomposition Tree
        </h3>
        <div style="display: flex; flex-direction: column; align-items: center; gap: 0.75rem; width: 100%; max-width: 360px;">
          <div style="padding: 0.6rem 1.2rem; border-radius: 8px; background: rgba(139,92,246,0.2); border: 2px solid #8b5cf6; color: #fff; font-weight: 700; font-size: 0.85rem;">
            Goal: RestPrescribed?
          </div>
          <div style="font-size: 0.9rem; color: #94a3b8;">↑ subgoals</div>
          <div style="padding: 0.5rem 1rem; border-radius: 8px; background: rgba(56,189,248,0.15); border: 1px solid #38bdf8; color: #38bdf8; font-size: 0.8rem;">
            Subgoal: RespInf?
          </div>
          <div style="font-size: 0.9rem; color: #94a3b8;">↑ subgoals</div>
          <div style="display: flex; gap: 0.5rem;">
            <div style="padding: 0.4rem 0.8rem; border-radius: 6px; background: #10b981; color: #fff; font-size: 0.75rem; font-weight: 700;">Fact: Fever ✓</div>
            <div style="padding: 0.4rem 0.8rem; border-radius: 6px; background: #10b981; color: #fff; font-size: 0.75rem; font-weight: 700;">Fact: Cough ✓</div>
          </div>
        </div>
      </div>
    `;
  }

  // --- Topic 4: First-Order Logic ---
  function renderFOLComparison(container) {
    container.innerHTML = `
      <div style="padding: 1.2rem; height: 100%; display: flex; flex-direction: column; justify-content: center; gap: 1rem;">
        <h3 style="font-size: 1.05rem; font-weight: 700; color: #fff;">FOL vs. Propositional Conciseness</h3>
        <div class="glass-panel" style="padding: 1rem; border-radius: 10px; background: rgba(244,63,94,0.08); border-left: 3px solid #f43f5e;">
          <div style="font-weight: 700; color: #f43f5e; font-size: 0.85rem; margin-bottom: 0.3rem;">Propositional Logic (Requires 64 duplicate rules):</div>
          <div style="font-family: monospace; font-size: 0.75rem; color: #cbd5e1; line-height: 1.5;">
            B11 ⇔ (P12 ∨ P21)<br>
            B12 ⇔ (P11 ∨ P22 ∨ P13)<br>
            ... (and so on for all 16 cells)
          </div>
        </div>
        <div class="glass-panel" style="padding: 1rem; border-radius: 10px; background: rgba(16,185,129,0.08); border-left: 3px solid #10b981;">
          <div style="font-weight: 700; color: #10b981; font-size: 0.85rem; margin-bottom: 0.3rem;">First-Order Logic (1 universal rule):</div>
          <div style="font-family: monospace; font-size: 0.82rem; color: #fff; line-height: 1.5;">
            ∀x,y Breeze(x,y) ⇔ [ ∃a,b Adjacent(x,y,a,b) ∧ Pit(a,b) ]
          </div>
        </div>
      </div>
    `;
  }

  function renderQuantifierStudio(container) {
    container.innerHTML = `
      <div style="padding: 1.2rem; height: 100%; display: flex; flex-direction: column; justify-content: center; gap: 0.75rem;">
        <h3 style="font-size: 1rem; font-weight: 700; color: #fff;">Quantifier Semantic Rules</h3>
        <div class="glass-panel" style="padding: 0.85rem; border-radius: 8px; border-left: 3px solid #38bdf8;">
          <div style="font-weight: 700; color: #38bdf8; font-size: 0.85rem;">Universal (∀) — For All</div>
          <div style="font-size: 0.78rem; color: #94a3b8; margin-top: 2px;">∀x King(x) ⇒ Person(x) (Equivalent to a big conjunction: King(John) ⇒ Person(John) ∧ ...)</div>
        </div>
        <div class="glass-panel" style="padding: 0.85rem; border-radius: 8px; border-left: 3px solid #a78bfa;">
          <div style="font-weight: 700; color: #a78bfa; font-size: 0.85rem;">Existential (∃) — There Exists</div>
          <div style="font-size: 0.78rem; color: #94a3b8; margin-top: 2px;">∃x Crown(x) ∧ OnHead(x, John) (Equivalent to a big disjunction across all objects)</div>
        </div>
      </div>
    `;
  }

  // --- Topic 5: Uncertainty & Bayes ---
  function renderBeliefDistribution(container) {
    container.innerHTML = `
      <div style="padding: 1.2rem; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center;">
        <h3 style="font-size: 1rem; font-weight: 700; color: #fff; margin-bottom: 1rem;">
          Full Joint Probability Distribution (Toothache, Cavity, Catch)
        </h3>
        <table style="width: 100%; font-size: 0.8rem; text-align: center; border-collapse: collapse; background: rgba(15,23,42,0.6); border-radius: 8px;">
          <thead>
            <tr style="color: #94a3b8; border-bottom: 1px solid rgba(255,255,255,0.1);">
              <th style="padding: 0.5rem;">Cavity</th>
              <th>Toothache</th>
              <th>Catch</th>
              <th>P(Cavity, Toothache, Catch)</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>True</td><td>True</td><td>True</td><td style="color: #38bdf8;">0.108</td></tr>
            <tr><td>True</td><td>True</td><td>False</td><td style="color: #38bdf8;">0.012</td></tr>
            <tr><td>True</td><td>False</td><td>True</td><td style="color: #38bdf8;">0.072</td></tr>
            <tr><td>True</td><td>False</td><td>False</td><td style="color: #38bdf8;">0.008</td></tr>
            <tr style="border-top: 1px solid rgba(255,255,255,0.05);"><td>False</td><td>True</td><td>True</td><td style="color: #a78bfa;">0.016</td></tr>
            <tr><td>False</td><td>True</td><td>False</td><td style="color: #a78bfa;">0.064</td></tr>
            <tr><td>False</td><td>False</td><td>True</td><td style="color: #a78bfa;">0.144</td></tr>
            <tr><td>False</td><td>False</td><td>False</td><td style="color: #a78bfa;">0.576</td></tr>
          </tbody>
        </table>
        <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 0.5rem;">Sum over all 8 cells = 1.000</div>
      </div>
    `;
  }

  function renderMedicalBayesCalculator(container) {
    let prior = 0.01;
    let sens = 0.95;
    let spec = 0.95;

    function update() {
      const pPosGivenD = sens;
      const pPosGivenNotD = 1 - spec;
      const num = pPosGivenD * prior;
      const denom = (pPosGivenD * prior) + (pPosGivenNotD * (1 - prior));
      const posterior = num / denom;

      container.innerHTML = `
        <div style="padding: 1.2rem; height: 100%; display: flex; flex-direction: column; justify-content: center; gap: 0.75rem;">
          <h3 style="font-size: 1rem; font-weight: 700; color: #fff;">Interactive Medical Bayes' Rule Calculator</h3>
          <div>
            <div style="display: flex; justify-content: space-between; font-size: 0.78rem; color: #94a3b8;">
              <span>Prior Disease Prevalence P(D):</span>
              <strong style="color: #fff;">${(prior * 100).toFixed(1)}%</strong>
            </div>
            <input type="range" id="med-prior" min="0.001" max="0.10" step="0.001" value="${prior}" style="width: 100%;">
          </div>
          <div>
            <div style="display: flex; justify-content: space-between; font-size: 0.78rem; color: #94a3b8;">
              <span>Test Sensitivity P(+ | D):</span>
              <strong style="color: #fff;">${(sens * 100).toFixed(0)}%</strong>
            </div>
            <input type="range" id="med-sens" min="0.80" max="0.99" step="0.01" value="${sens}" style="width: 100%;">
          </div>
          <div>
            <div style="display: flex; justify-content: space-between; font-size: 0.78rem; color: #94a3b8;">
              <span>Test Specificity P(- | ¬D):</span>
              <strong style="color: #fff;">${(spec * 100).toFixed(0)}%</strong>
            </div>
            <input type="range" id="med-spec" min="0.80" max="0.99" step="0.01" value="${spec}" style="width: 100%;">
          </div>

          <div class="glass-panel" style="padding: 0.9rem; border-radius: 10px; background: rgba(99,102,241,0.15); border: 1px solid #818cf8;">
            <div style="font-size: 0.78rem; color: #c4b5fd;">Calculated Posterior P(Disease | +):</div>
            <div style="font-size: 1.5rem; font-weight: 800; color: #fff; margin: 4px 0;">
              ${(posterior * 100).toFixed(1)}%
            </div>
            <div style="font-size: 0.75rem; color: #94a3b8;">
              Even with 95% test accuracy, ~${(100 - posterior * 100).toFixed(1)}% of positive tests are false alarms!
            </div>
          </div>
        </div>
      `;

      container.querySelector('#med-prior').addEventListener('input', (e) => { prior = parseFloat(e.target.value); update(); });
      container.querySelector('#med-sens').addEventListener('input', (e) => { sens = parseFloat(e.target.value); update(); });
      container.querySelector('#med-spec').addEventListener('input', (e) => { spec = parseFloat(e.target.value); update(); });
    }

    update();
  }

  // --- Topic 6: Bayesian Networks ---
  function renderBurglarAlarmDAG(container) {
    const net = B.createAlarmNet();
    container.innerHTML = `
      <div style="padding: 1rem; height: 100%; display: flex; flex-direction: column;">
        <h3 style="font-size: 1rem; font-weight: 700; color: #fff; margin-bottom: 0.5rem;">
          AIMA Burglar Alarm Bayesian Network DAG
        </h3>
        <div style="flex: 1; position: relative; background: rgba(15,23,42,0.6); border-radius: 10px;">
          <svg viewBox="0 0 560 380" style="width: 100%; height: 100%;">
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b"/>
              </marker>
            </defs>
            <!-- Directed Edges -->
            <line x1="140" y1="70" x2="280" y2="190" stroke="#64748b" stroke-width="2" marker-end="url(#arrow)"/>
            <line x1="420" y1="70" x2="280" y2="190" stroke="#64748b" stroke-width="2" marker-end="url(#arrow)"/>
            <line x1="280" y1="190" x2="140" y2="310" stroke="#64748b" stroke-width="2" marker-end="url(#arrow)"/>
            <line x1="280" y1="190" x2="420" y2="310" stroke="#64748b" stroke-width="2" marker-end="url(#arrow)"/>

            <!-- Nodes -->
            ${net.nodes.map(n => `
              <g class="dag-node" data-var="${n.var}" style="cursor: pointer;">
                <circle cx="${n.meta.x}" cy="${n.meta.y}" r="28" fill="#1e293b" stroke="#818cf8" stroke-width="2"/>
                <text x="${n.meta.x}" y="${n.meta.y + 4}" fill="#fff" font-size="12" font-weight="700" text-anchor="middle">${n.var[0]}</text>
                <text x="${n.meta.x}" y="${n.meta.y + 42}" fill="#94a3b8" font-size="11" text-anchor="middle">${n.meta.label}</text>
              </g>
            `).join('')}
          </svg>
        </div>
      </div>
    `;
  }

  function renderMarkovBlanketInspector(container) {
    const net = B.createAlarmNet();
    const mb = net.getMarkovBlanket('Alarm');

    container.innerHTML = `
      <div style="padding: 1.2rem; height: 100%; display: flex; flex-direction: column; justify-content: center; gap: 0.75rem;">
        <h3 style="font-size: 1rem; font-weight: 700; color: #fff;">Markov Blanket of Variable "Alarm" (A)</h3>
        <div class="glass-panel" style="padding: 0.85rem; border-radius: 8px; border-left: 3px solid #38bdf8;">
          <div style="font-weight: 700; color: #38bdf8; font-size: 0.85rem;">Parents:</div>
          <div style="font-size: 0.8rem; color: #fff; margin-top: 2px;">${mb.parents.join(', ')}</div>
        </div>
        <div class="glass-panel" style="padding: 0.85rem; border-radius: 8px; border-left: 3px solid #10b981;">
          <div style="font-weight: 700; color: #10b981; font-size: 0.85rem;">Children:</div>
          <div style="font-size: 0.8rem; color: #fff; margin-top: 2px;">${mb.children.join(', ')}</div>
        </div>
        <div class="glass-panel" style="padding: 0.85rem; border-radius: 8px; border-left: 3px solid #f59e0b;">
          <div style="font-weight: 700; color: #f59e0b; font-size: 0.85rem;">Coparents (Children's other parents):</div>
          <div style="font-size: 0.8rem; color: #fff; margin-top: 2px;">${mb.coparents.length > 0 ? mb.coparents.join(', ') : 'None'}</div>
        </div>
        <div style="font-size: 0.78rem; color: #94a3b8; margin-top: 0.5rem;">
          Conditioned on {Burglary, Earthquake, JohnCalls, MaryCalls}, Alarm is conditionally independent of all other variables in the universe.
        </div>
      </div>
    `;
  }

  function renderExplainingAwayStudio(container) {
    const net = B.createAlarmNet();
    const pBGivenA = B.enumerationAsk('Burglary', { Alarm: true }, net).true;
    const pBGivenAE = B.enumerationAsk('Burglary', { Alarm: true, Earthquake: true }, net).true;

    container.innerHTML = `
      <div style="padding: 1.2rem; height: 100%; display: flex; flex-direction: column; justify-content: center; gap: 1rem;">
        <h3 style="font-size: 1rem; font-weight: 700; color: #fff;">Explaining Away Phenomenon</h3>
        <div class="glass-panel" style="padding: 1rem; border-radius: 10px; background: rgba(30,41,59,0.5);">
          <div style="font-size: 0.8rem; color: #94a3b8;">1. Evidence: Alarm rung alone</div>
          <div style="font-size: 1.1rem; font-weight: 700; color: #f43f5e; margin: 4px 0;">
            P(Burglary | Alarm=True) = ${(pBGivenA * 100).toFixed(1)}%
          </div>
          <p style="font-size: 0.75rem; color: #cbd5e1;">Alarm ringing makes burglary heavily suspected.</p>
        </div>

        <div class="glass-panel" style="padding: 1rem; border-radius: 10px; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3);">
          <div style="font-size: 0.8rem; color: #10b981;">2. Evidence: Alarm rung AND Earthquake confirmed</div>
          <div style="font-size: 1.1rem; font-weight: 700; color: #10b981; margin: 4px 0;">
            P(Burglary | Alarm=True, Earthquake=True) = ${(pBGivenAE * 100).toFixed(2)}%
          </div>
          <p style="font-size: 0.75rem; color: #cbd5e1;">Earthquake explains away the alarm sound, dropping burglary probability back down!</p>
        </div>
      </div>
    `;
  }

  // --- Topic 7: Probabilistic Inference ---
  function renderVariableEliminationVisualizer(container) {
    const net = B.createAlarmNet();
    const res = B.variableElimination('Burglary', { JohnCalls: true, MaryCalls: true }, net);

    container.innerHTML = `
      <div style="padding: 1rem; height: 100%; display: flex; flex-direction: column;">
        <h3 style="font-size: 1rem; font-weight: 700; color: #fff; margin-bottom: 0.5rem;">
          Variable Elimination Factor Steps for P(B | j, m)
        </h3>
        <div style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem;">
          ${res.trace.map(t => `
            <div class="glass-panel" style="padding: 0.6rem 0.85rem; border-radius: 8px; background: rgba(30,41,59,0.5);">
              <div style="font-size: 0.75rem; font-weight: 700; color: #818cf8;">Step ${t.step}: ${t.desc}</div>
            </div>
          `).join('')}
          <div class="glass-panel" style="padding: 0.75rem; border-radius: 8px; background: rgba(16,185,129,0.15); border: 1px solid #10b981;">
            <div style="font-size: 0.75rem; color: #a7f3d0;">Final Normalized Posterior P(Burglary | j, m):</div>
            <div style="font-size: 1.25rem; font-weight: 800; color: #fff; margin-top: 2px;">
              ${(res.distribution.true * 100).toFixed(2)}%
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderSamplingSimulation(container) {
    const net = B.createAlarmNet();
    const rej = B.rejectionSampling('Burglary', { JohnCalls: true, MaryCalls: true }, net, 5000);
    const lw = B.likelihoodWeighting('Burglary', { JohnCalls: true, MaryCalls: true }, net, 5000);

    container.innerHTML = `
      <div style="padding: 1.2rem; height: 100%; display: flex; flex-direction: column; justify-content: center; gap: 1rem;">
        <h3 style="font-size: 1rem; font-weight: 700; color: #fff;">Sampling Accuracy Comparison (N=5,000)</h3>
        <div class="glass-panel" style="padding: 0.9rem; border-radius: 10px; background: rgba(30,41,59,0.5);">
          <div style="display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 700;">
            <span style="color: #f43f5e;">Rejection Sampling</span>
            <span style="color: #fff;">P(B=True) ≈ ${(rej.distribution.true * 100).toFixed(1)}%</span>
          </div>
          <div style="font-size: 0.72rem; color: #94a3b8; margin-top: 3px;">
            Acceptance Rate: ${(rej.acceptanceRate * 100).toFixed(2)}% (Wasted ${(100 - rej.acceptanceRate * 100).toFixed(1)}% of samples!)
          </div>
        </div>
        <div class="glass-panel" style="padding: 0.9rem; border-radius: 10px; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3);">
          <div style="display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 700;">
            <span style="color: #10b981;">Likelihood Weighting</span>
            <span style="color: #fff;">P(B=True) ≈ ${(lw.distribution.true * 100).toFixed(1)}%</span>
          </div>
          <div style="font-size: 0.72rem; color: #a7f3d0; margin-top: 3px;">
            100% of samples utilized (Weight accumulated on evidence nodes).
          </div>
        </div>
      </div>
    `;
  }

  // --- Topic 8: Evaluation Matrix ---
  function renderEvaluationMatrix(container) {
    container.innerHTML = `
      <div style="padding: 1rem; height: 100%; display: flex; flex-direction: column;">
        <h3 style="font-size: 1rem; font-weight: 700; color: #fff; margin-bottom: 0.5rem;">
          Inference Engine Comprehensive Evaluation
        </h3>
        <div style="flex: 1; overflow-x: auto; background: rgba(15,23,42,0.6); border-radius: 8px;">
          <table style="width: 100%; font-size: 0.75rem; text-align: left; border-collapse: collapse;">
            <thead>
              <tr style="color: #94a3b8; border-bottom: 1px solid rgba(255,255,255,0.1);">
                <th style="padding: 0.5rem;">Algorithm</th>
                <th>Certainty Model</th>
                <th>Time Complexity</th>
                <th>Guarantees</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom: 1px solid rgba(255,255,255,0.03);">
                <td style="padding: 0.5rem; font-weight: 700; color: #fff;">Truth Table</td>
                <td>Boolean (0/1)</td>
                <td style="font-family: monospace;">O(2ⁿ)</td>
                <td>Sound & Complete</td>
              </tr>
              <tr style="border-bottom: 1px solid rgba(255,255,255,0.03);">
                <td style="padding: 0.5rem; font-weight: 700; color: #fff;">PL-Resolution</td>
                <td>Boolean (0/1)</td>
                <td style="font-family: monospace;">Exponential</td>
                <td>Refutation Complete</td>
              </tr>
              <tr style="border-bottom: 1px solid rgba(255,255,255,0.03); background: rgba(16,185,129,0.08);">
                <td style="padding: 0.5rem; font-weight: 700; color: #10b981;">Horn Forward Chaining</td>
                <td>Boolean (0/1)</td>
                <td style="font-family: monospace; font-weight: 700; color: #10b981;">O(N) Linear!</td>
                <td>Complete for Horn KB</td>
              </tr>
              <tr style="border-bottom: 1px solid rgba(255,255,255,0.03);">
                <td style="padding: 0.5rem; font-weight: 700; color: #fff;">Variable Elimination</td>
                <td>Exact Probabilities</td>
                <td style="font-family: monospace;">O(n · dʷ⁺¹)</td>
                <td>Exact & Sound</td>
              </tr>
              <tr>
                <td style="padding: 0.5rem; font-weight: 700; color: #fff;">Likelihood Weighting</td>
                <td>Estimated Probabilities</td>
                <td style="font-family: monospace;">O(N · n)</td>
                <td>Consistent (N → ∞)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // --- Topic 9: Code Trace ---
  function renderCodeTraceView(container) {
    const presets = [
      { id: 'tt', name: '1. TT-Entails (Wumpus)', file: 'python_sandbox/08_Logic_Reasoning.py' },
      { id: 'res', name: '2. PL-Resolution', file: 'python_sandbox/08_Logic_Reasoning.py' },
      { id: 'fc', name: '3. PL-FC-Entails', file: 'python_sandbox/08_Logic_Reasoning.py' },
      { id: 'bayes_enum', name: '4. Bayes Exact Enumeration', file: 'python_sandbox/09_Bayesian_Reasoning.py' },
      { id: 'lw', name: '5. Likelihood Weighting', file: 'python_sandbox/09_Bayesian_Reasoning.py' }
    ];

    let selectedPreset = 'tt';

    function update() {
      container.innerHTML = `
        <div style="padding: 1rem; height: 100%; display: flex; flex-direction: column;">
          <div style="display: flex; gap: 0.4rem; overflow-x: auto; margin-bottom: 0.75rem;">
            ${presets.map(p => `
              <button class="trace-preset-btn ${p.id === selectedPreset ? 'active' : ''}" data-pid="${p.id}" style="padding: 0.35rem 0.65rem; border-radius: 6px; font-size: 0.75rem; font-weight: 600; cursor: pointer; border: 1px solid ${p.id === selectedPreset ? '#818cf8' : 'rgba(255,255,255,0.1)'}; background: ${p.id === selectedPreset ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)'}; color: ${p.id === selectedPreset ? '#c4b5fd' : '#94a3b8'};">
                ${p.name}
              </button>
            `).join('')}
          </div>

          <div style="flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; overflow: hidden;">
            <div class="glass-panel" style="padding: 0.75rem; border-radius: 8px; background: rgba(15,23,42,0.8); overflow-y: auto; font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; color: #e2e8f0; line-height: 1.5;">
              <div style="color: #64748b; margin-bottom: 0.4rem;"># Python Reference Source</div>
              ${getCodeSnippet(selectedPreset)}
            </div>
            <div class="glass-panel" style="padding: 0.75rem; border-radius: 8px; background: rgba(30,41,59,0.5); overflow-y: auto; font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; color: #a78bfa;">
              <div style="color: #38bdf8; font-weight: 700; margin-bottom: 0.4rem;">Runtime Variable Watch</div>
              ${getRuntimeState(selectedPreset)}
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
    if (pid === 'tt') {
      return `
def tt_entails(kb, alpha):
    symbols = prop_symbols(kb) | prop_symbols(alpha)
    return tt_check_all(kb, alpha, symbols, {})

def tt_check_all(kb, alpha, symbols, model):
    if not symbols:
        if pl_true(kb, model):
            return pl_true(alpha, model)
        return True
    P, rest = symbols[0], symbols[1:]
    return (tt_check_all(kb, alpha, rest, {**model, P: True}) and
            tt_check_all(kb, alpha, rest, {**model, P: False}))`;
    } else if (pid === 'res') {
      return `
def pl_resolution(kb, alpha):
    clauses = to_cnf(kb & ~alpha)
    new = set()
    while True:
        for ci, cj in combinations(clauses, 2):
            resolvents = pl_resolve(ci, cj)
            if empty_clause in resolvents:
                return True # Contradiction!
            new.update(resolvents)
        if new.issubset(clauses):
            return False`;
    } else if (pid === 'fc') {
      return `
def pl_fc_entails(rules, facts, query):
    count = {r: len(r.premises) for r in rules}
    inferred = defaultdict(bool)
    agenda = deque(facts)
    while agenda:
        p = agenda.popleft()
        if p == query: return True
        for r in rules_with_premise(p):
            count[r] -= 1
            if count[r] == 0:
                agenda.append(r.conclusion)`;
    } else if (pid === 'bayes_enum') {
      return `
def enumeration_ask(query, evidence, bn):
    qx = {}
    for val in (True, False):
        extended = {**evidence, query: val}
        qx[val] = enumerate_all(bn.vars, extended, bn)
    return normalize(qx)

def enumerate_all(vars, event, bn):
    if not vars: return 1.0
    Y, rest = vars[0], vars[1:]
    node = bn.getNode(Y)
    if Y in event:
        return node.p(event[Y], event) * enumerate_all(rest, event, bn)
    return sum(node.p(y, event) * enumerate_all(rest, {**event, Y: y}, bn) for y in (True, False))`;
    } else {
      return `
def likelihood_weighting(query, evidence, bn, N=5000):
    W = {True: 0.0, False: 0.0}
    for _ in range(N):
        event, w = {}, 1.0
        for var in bn.vars:
            node = bn.getNode(var)
            if var in evidence:
                val = evidence[var]
                event[var] = val
                w *= node.p(val, event)
            else:
                event[var] = node.sample(event)
        W[event[query]] += w
    return normalize(W)`;
    }
  }

  function getRuntimeState(pid) {
    if (pid === 'tt') {
      return `
symbols = ['B11', 'P11', 'P12', 'P21']
models_checked = 16
models_where_kb_is_true = 1
result = True (KB ⊨ ¬P12)`;
    } else if (pid === 'res') {
      return `
clauses = {('¬B11', 'P12', 'P21'), ('¬P11'), ('P12'), ('¬B11')}
resolving: ('P12') + ('¬P12')
derived: □ (Empty Clause)
result = Contradiction Found! (KB ⊨ α is True)`;
    } else if (pid === 'fc') {
      return `
facts = ['Fever', 'Cough']
agenda = []
inferred = {'Fever': True, 'Cough': True, 'RespInf': True, 'RestPrescribed': True}
result = Goal 'RestPrescribed' Derived!`;
    } else if (pid === 'bayes_enum') {
      return `
query = 'Burglary'
evidence = {'JohnCalls': True, 'MaryCalls': True}
hidden_vars = ['Earthquake', 'Alarm']
qx = {True: 0.000592, False: 0.001491}
normalized = {True: 0.2842, False: 0.7158}`;
    } else {
      return `
N = 5000 samples
weights = {True: 1.421, False: 3.578}
P(Burglary=True | j, m) ≈ 28.4%
100% of samples accepted`;
    }
  }

  // --- Auto Run on DOM Loaded ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
