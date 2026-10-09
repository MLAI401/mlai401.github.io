/**
 * ui.js — Topic 05: Knowledge & Reasoning Lecture Page Controller (knowledge.html)
 *
 * Implements single-viewport interactive lecture controller:
 *   - 8 Unified Topic Tabs (Progression, Logic Agents, Forward Chaining, Uncertainty & Bayes,
 *     Bayesian Networks, Temporal HMMs, Evaluation Matrix, Code Trace)
 *   - Concept Selector Chips + Formal Definition + AIMA Notation + Teaching Tip
 *   - Right-Column Dynamic Interactive Visualizers & Steppers
 *   - Live Python Code Tracer for Logic, Bayesian, and Hidden Markov Model algorithms
 */

(function () {
  'use strict';

  const L = window.LogicEngine;
  const B = window.BayesEngine;
  const H = window.HMMEngine;

  // --- Topic Definitions ---
  const TOPICS = [
    { id: 'progression', title: 'Progression: Search & CSP → Knowledge & Reasoning', short: '0 · Evolution' },
    { id: 'logic', title: 'Knowledge-Based Agents & Propositional Logic', short: '1 · Logic Agents' },
    { id: 'chaining', title: 'Logical Inference: Forward Chaining', short: '2 · Forward Chaining' },
    { id: 'uncertainty', title: 'Quantifying Uncertainty & Bayes\' Rule', short: '3 · Uncertainty & Bayes' },
    { id: 'bayesnet', title: 'Bayesian Networks & Independence', short: '4 · Bayesian Networks' },
    { id: 'hmm', title: 'Temporal Reasoning & Hidden Markov Models', short: '5 · Temporal HMMs' },
    { id: 'evaluation', title: 'Evaluating Knowledge & Reasoning Systems', short: '6 · Evaluation' },
    { id: 'code', title: 'Code Trace: Logic, Bayes & HMM', short: '7 · Code Trace' }
  ];

  const TOPIC_INTROS = [
    'How agents represent facts about the world: progressing from opaque atomic search states to factored variables, structured logical sentences, continuous probabilistic distributions, and dynamic temporal belief states.',
    'A Knowledge-Based agent maintains an internal Knowledge Base (KB), tells it new percepts, and asks what action to take using crisp propositional logic syntax, semantics, models, and entailment.',
    'Restricting knowledge representation to Horn clauses enables linear-time O(N) data-driven Forward Chaining (PL-FC-Entails), deriving all entailed conclusions with sound mathematical guarantees.',
    'Real worlds are partially observable, noisy, and non-deterministic. Probabilities quantify continuous degrees of belief, and Bayes\' Rule inverts causal likelihoods into diagnostic probabilities.',
    'Bayesian Networks are Directed Acyclic Graphs (DAGs) that compactly factor the full joint distribution, exposing conditional independence and Markov Blankets.',
    'Dynamic worlds evolve over time slices t. Hidden Markov Models combine transition dynamics and sensor models to maintain updated belief states (Filtering) and decode most likely paths (Viterbi).',
    'Comprehensive multi-dimensional comparison of logical theorem provers vs. static Bayesian networks vs. dynamic Hidden Markov Models across representation, complexity, and scale.',
    'Step through clean, standalone Python implementations line by line — Forward Chaining, Bayes\' Rule, Bayesian Network Enumeration, HMM Forward Filtering, and Viterbi Decoding.'
  ];

  // --- Concept Data per Topic ---
  const CONCEPTS = {
    progression: [
      {
        key: 'evolution', name: 'State Representation Evolution',
        def: 'How the agent "sees" the world: Atomic (black box) → Factored (variables & domains) → Structured (objects, facts, logic, probabilistic relations, temporal time slices).',
        notation: 'Atomic (s ∈ S) · Factored ({X<sub>i</sub> = v<sub>i</sub>}) · Structured (Sentences, P(X), P(X<sub>t</sub> | X<sub>t-1</sub>))',
        tip: 'Search treats states as indivisible opaque dots; CSP opens the dot into variables; Knowledge represents relationships and reasons over what must be true.',
        render: renderProgressionOverview
      },
      {
        key: 'certainty', name: 'Certainty vs. Uncertainty vs. Time',
        def: 'Logic operates with crisp absolute truth (monotonic entailment); probabilistic models reason over continuous degrees of belief; HMMs track evolving belief distributions over time.',
        notation: 'Certainty: KB ⊨ α · Uncertainty: P(Query | Evidence) · Temporal: P(X<sub>t</sub> | e<sub>1:t</sub>)',
        tip: 'Use logic when rules are deterministic and closed; use probabilities when worlds are noisy; use HMMs when states change over time.',
        render: renderCertaintyGauge
      },
      {
        key: 'engine_arch', name: 'The Inference Engine Paradigm',
        def: 'Decoupling domain knowledge (facts, rules, CPTs, transition matrices) from the general-purpose inference algorithms.',
        notation: 'Agent = Knowledge Model + Inference Engine',
        tip: 'You change the domain by updating the facts or probability tables without rewriting the search or reasoning algorithm.',
        render: renderInferenceArch
      }
    ],
    logic: [
      {
        key: 'kb_agent', name: 'Knowledge-Based Agent (Facts & Rules)',
        def: 'An agent maintaining an internal Knowledge Base (KB) that interacts via two primary operations: TELL (add new percepts/facts) and ASK (query what action or state follows).',
        notation: 'TELL(KB, sentence) · ASK(KB, query)',
        tip: 'A KB agent builds an internal model of the world by accumulating facts and firing domain rules, not just reacting to immediate stimuli.',
        render: renderWumpusInteractive
      },
      {
        key: 'syntax', name: 'Propositional Syntax & Connectives',
        def: 'Formal grammar for constructing valid sentences using symbols and logical operators: Negation (¬), Conjunction (∧), Disjunction (∨), Implication (⇒), and Biconditional (⇔).',
        notation: 'P, Q · ¬P · P ∧ Q · P ∨ Q · P ⇒ Q ≡ ¬P ∨ Q · P ⇔ Q',
        tip: 'Note: P ⇒ Q is false ONLY when P is True and Q is False (vacuously true whenever P is false).',
        render: renderLogicGates
      },
      {
        key: 'entailment', name: 'Models & Logical Entailment (KB ⊨ α)',
        def: 'A sentence α follows logically from KB if α is true in every model where KB is true (M(KB) ⊆ M(α)).',
        notation: 'KB ⊨ α ⇔ M(KB) ⊆ M(α)',
        tip: 'Entailment means: whenever the KB is true, α is guaranteed to be true. No counterexample world exists.',
        render: renderVennEntailment
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
        def: 'Data-driven inference: starts with known facts, decrements premise counts for active rules, fires rules when count reaches 0, and repeats until query is derived.',
        notation: 'count[c] = number of un-inferred premises · Time O(N) Linear in KB size!',
        tip: 'Forward chaining is linear time! Ideal for real-time monitoring, reactive expert systems, and safety verification.',
        render: renderForwardChainingTree
      }
    ],
    uncertainty: [
      {
        key: 'degrees_of_belief', name: 'Uncertainty & Degrees of Belief',
        def: 'When worlds are partially observable and sensors are noisy, probabilities quantify continuous degrees of belief given available evidence.',
        notation: 'P(A) ∈ [0, 1] · P(True) = 1, P(False) = 0 · ∑ P(x) = 1',
        tip: 'Probability represents an agent\'s state of knowledge given evidence, not necessarily physical randomness.',
        render: renderBeliefDistribution
      },
      {
        key: 'bayes_rule_calc', name: 'Conditional Probability & Bayes\' Rule',
        def: 'Inverts conditioning to compute posterior P(Cause | Effect) from causal likelihood P(Effect | Cause), prior P(Cause), and marginal evidence P(Effect).',
        notation: 'P(Y | X) = [P(X | Y) P(Y)] / P(X) = α P(X | Y) P(Y)',
        tip: 'Doctors know causal probabilities P(Symptom | Disease); Bayes\' rule converts them into diagnostic posteriors P(Disease | Symptom).',
        render: renderBayesMedicalCalculator
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
        key: 'sampling_comp', name: 'Probabilistic Inference (Exact & Sampling)',
        def: 'Exact inference by joint enumeration versus scalable approximate Monte Carlo Likelihood Weighting.',
        notation: 'Exact: P(X | e) = α ∑ P(X, e, y) · Sampling: w = ∏ P(eⱼ | parents)',
        tip: 'Likelihood Weighting clamps evidence and weights samples by evidence probability, never discarding samples.',
        render: renderSamplingSimulation
      }
    ],
    hmm: [
      {
        key: 'hmm_filtering', name: 'Hidden Markov Models & Forward Filtering',
        def: 'Modeling states changing across time slices t with the First-Order Markov property. Filtering computes current belief P(Xₜ | e₁:ₜ) via recursive Predict-Update steps.',
        notation: 'Predict: P(Xₜ | e₁:ₜ₋₁) = ∑ P(Xₜ | xₜ₋₁)P(xₜ₋₁ | e₁:ₜ₋₁) · Update: P(Xₜ | e₁:ₜ) = α P(eₜ | Xₜ)P(Xₜ | e₁:ₜ₋₁)',
        tip: 'The Forward Algorithm computes the exact belief state online in O(|S|²) time per step.',
        render: renderHMMFilteringStudio
      },
      {
        key: 'viterbi_decoding', name: 'Most Likely Sequence & Viterbi Decoding',
        def: 'Finding the single overall hidden state path x*₁:ₜ that maximizes joint probability P(x₁:ₜ | e₁:ₜ) using dynamic programming across the trellis.',
        notation: 'mₜ[j] = maxᵢ (mₜ₋₁[i] · Tᵢ,ⱼ) · P(eₜ | sⱼ) · Backtrack from argmax m_T[s]',
        tip: 'Viterbi is to sequence decoding what dynamic programming shortest-path is to graphs.',
        render: renderViterbiTrellisStudio
      }
    ],
    evaluation: [
      {
        key: 'solver_matrix', name: 'Reasoning Engines Comparison Matrix',
        def: 'Comprehensive evaluation of logical theorem provers vs. static Bayesian networks vs. dynamic Hidden Markov Models.',
        notation: 'Logic: Sound & Complete · Bayes: Factored Joint · HMM: Recursive State Estimation O(|S|²)',
        tip: 'Choose Horn Logic for safety rules; choose Bayesian Networks for diagnostic models; choose HMMs for sequence tracking.',
        render: renderEvaluationMatrix
      }
    ],
    code: [
      {
        key: 'code_trace', name: 'Interactive Code Trace',
        def: 'Line-by-line stepping through runnable Python logic, Bayesian, and Hidden Markov Model algorithms with real-time state inspection.',
        notation: 'python_sandbox/08_Logic_Reasoning.py, 09_Bayesian_Reasoning.py & 10_Temporal_Reasoning.py',
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
      btn.addEventListener('click', () => {
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
        <h2 style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.5rem;">${topic.title}</h2>
        <p style="font-size: 0.88rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 1rem;">
          ${TOPIC_INTROS[currentTopicIndex]}
        </p>
      </div>

      <div class="sl-concept-chips" style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1.2rem;">
        ${concepts.map((c, idx) => `
          <button class="sl-concept-chip ${idx === cIdx ? 'active' : ''}" data-cidx="${idx}" style="padding: 0.4rem 0.8rem; border-radius: 9999px; font-size: 0.8rem; font-weight: 600; cursor: pointer; border: 1px solid ${idx === cIdx ? '#8b5cf6' : 'rgba(15,23,42,0.1)'}; background: ${idx === cIdx ? 'rgba(139,92,246,0.2)' : 'rgba(15,23,42,0.05)'}; color: ${idx === cIdx ? '#6d28d9' : '#64748b'}; transition: all 0.2s;">
            ${c.name}
          </button>
        `).join('')}
      </div>

      <div class="sl-concept-card glass-panel" style="padding: 1.2rem; border-radius: 12px; background: #ffffff; border: 1px solid rgba(15,23,42,0.08); margin-bottom: 1rem;">
        <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #4f46e5; font-weight: 700; margin-bottom: 0.4rem;">Formal Definition</div>
        <p style="font-size: 0.92rem; color: var(--text-primary); line-height: 1.55; margin-bottom: 1rem;">
          ${currentC.def}
        </p>

        <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #0284c7; font-weight: 700; margin-bottom: 0.4rem;">AIMA Mathematical Notation</div>
        <div style="font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; padding: 0.75rem 1rem; background: rgba(15,23,42,0.06); border-radius: 8px; border-left: 3px solid #0284c7; color: #334155; margin-bottom: 1rem; word-break: break-word;">
          ${currentC.notation}
        </div>

        <div class="teaching-tip" style="display: flex; gap: 0.75rem; background: rgba(139,92,246,0.1); border: 1px solid rgba(139,92,246,0.25); padding: 0.85rem 1rem; border-radius: 8px;">
          <i data-lucide="sparkles" style="color: #6d28d9; width: 1.25rem; height: 1.25rem; flex-shrink: 0; margin-top: 2px;"></i>
          <span style="font-size: 0.84rem; color: #5b21b6; line-height: 1.5;">${currentC.tip}</span>
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

  // --- Topic 0: Evolution Overview ---
  function renderProgressionOverview(container) {
    container.innerHTML = `
      <div style="padding: 1.2rem; height: 100%; display: flex; flex-direction: column; justify-content: space-between;">
        <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.5rem;">
          State Representation Progression
        </h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; flex: 1;">
          <div class="glass-panel" style="padding: 0.8rem; border-radius: 8px; background: rgba(15,23,42,0.03); border: 1px solid rgba(15,23,42,0.08);">
            <div style="font-weight: 700; color: #4f46e5; font-size: 0.8rem; margin-bottom: 0.3rem;">1. Atomic (Topics 1-3)</div>
            <p style="font-size: 0.76rem; color: #64748b; line-height: 1.4;">State is an indivisible black-box token <code>s ∈ S</code>. No internal structure.</p>
          </div>
          <div class="glass-panel" style="padding: 0.8rem; border-radius: 8px; background: rgba(15,23,42,0.03); border: 1px solid rgba(15,23,42,0.08);">
            <div style="font-weight: 700; color: #0284c7; font-size: 0.8rem; margin-bottom: 0.3rem;">2. Factored (Topic 4 CSP)</div>
            <p style="font-size: 0.76rem; color: #64748b; line-height: 1.4;">State decomposed into variables <code>X₁…Xₙ</code> with domains and constraints.</p>
          </div>
          <div class="glass-panel" style="padding: 0.8rem; border-radius: 8px; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3);">
            <div style="font-weight: 700; color: #10b981; font-size: 0.8rem; margin-bottom: 0.3rem;">3. Structured Logic (Topic 5.1)</div>
            <p style="font-size: 0.76rem; color: #065f46; line-height: 1.4;">Declarative sentences, facts, rules, and mathematical entailment <code>KB ⊨ α</code>.</p>
          </div>
          <div class="glass-panel" style="padding: 0.8rem; border-radius: 8px; background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.3);">
            <div style="font-weight: 700; color: #d97706; font-size: 0.8rem; margin-bottom: 0.3rem;">4. Probabilistic & Temporal (Topic 5.2 & 5.3)</div>
            <p style="font-size: 0.76rem; color: #92400e; line-height: 1.4;">Degrees of belief, Bayesian Networks, and dynamic state tracking with HMMs.</p>
          </div>
        </div>
        <div style="font-size: 0.75rem; color: #64748b; text-align: center; margin-top: 0.5rem;">
          From searching paths → resolving constraints → reasoning over truths, uncertainty & time.
        </div>
      </div>
    `;
  }

  function renderCertaintyGauge(container) {
    container.innerHTML = `
      <div style="padding: 1.2rem; height: 100%; display: flex; flex-direction: column; justify-content: space-around;">
        <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-primary);">Certainty vs. Uncertainty vs. Temporal Belief</h3>
        <div style="display: flex; gap: 0.75rem;">
          <div class="glass-panel" style="flex: 1; padding: 1rem; border-radius: 10px; text-align: center; background: #ffffff;">
            <div style="font-size: 0.75rem; font-weight: 700; color: #4f46e5; margin-bottom: 0.4rem;">Deterministic Logic</div>
            <div style="font-size: 1.5rem; font-weight: 800; color: #10b981;">{0, 1}</div>
            <div style="font-size: 0.72rem; color: #64748b; margin-top: 0.3rem;">Crisp Boolean truth values</div>
          </div>
          <div class="glass-panel" style="flex: 1; padding: 1rem; border-radius: 10px; text-align: center; background: #ffffff;">
            <div style="font-size: 0.75rem; font-weight: 700; color: #0284c7; margin-bottom: 0.4rem;">Bayes Probability</div>
            <div style="font-size: 1.5rem; font-weight: 800; color: #0284c7;">[0.0, 1.0]</div>
            <div style="font-size: 0.72rem; color: #64748b; margin-top: 0.3rem;">Continuous degrees of belief</div>
          </div>
          <div class="glass-panel" style="flex: 1; padding: 1rem; border-radius: 10px; text-align: center; background: #ffffff;">
            <div style="font-size: 0.75rem; font-weight: 700; color: #d97706; margin-bottom: 0.4rem;">Temporal HMM</div>
            <div style="font-size: 1.5rem; font-weight: 800; color: #d97706;">P(Xₜ | e₁:ₜ)</div>
            <div style="font-size: 0.72rem; color: #64748b; margin-top: 0.3rem;">Belief distribution over time</div>
          </div>
        </div>
      </div>
    `;
  }

  function renderInferenceArch(container) {
    container.innerHTML = `
      <div style="padding: 1.2rem; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center;">
        <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 1rem;">
          The Knowledge & Inference Architecture
        </h3>
        <div style="display: flex; gap: 1rem; align-items: center; width: 100%; max-width: 480px;">
          <div class="glass-panel" style="flex: 1; padding: 1rem; border-radius: 10px; background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.3); text-align: center;">
            <div style="font-weight: 700; color: #4f46e5; font-size: 0.85rem;">Knowledge Base (KB)</div>
            <div style="font-size: 0.75rem; color: #64748b; margin-top: 0.4rem;">Facts, Rules, CPTs, Transition Matrices</div>
          </div>
          <div style="font-size: 1.2rem; color: #94a3b8;">⇄</div>
          <div class="glass-panel" style="flex: 1; padding: 1rem; border-radius: 10px; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); text-align: center;">
            <div style="font-weight: 700; color: #10b981; font-size: 0.85rem;">Inference Engine</div>
            <div style="font-size: 0.75rem; color: #64748b; margin-top: 0.4rem;">Forward Chaining, Variable Elimination, Forward HMM</div>
          </div>
        </div>
      </div>
    `;
  }

  // --- Topic 1: Logic Agents & Propositional Logic ---
  function renderWumpusInteractive(container) {
    container.innerHTML = `
      <div style="padding: 1rem; height: 100%; display: flex; flex-direction: column;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <h3 style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary);">Wumpus World Logic Explorer</h3>
          <span style="font-size: 0.75rem; color: #10b981; font-weight: 600;">[1,1] Explored & Safe</span>
        </div>
        <div style="flex: 1; display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; background: rgba(15,23,42,0.06); padding: 6px; border-radius: 8px;">
          ${[
            '[1,4]', '[2,4]', '[3,4]', '[4,4]',
            '[1,3]', '[2,3]', '[3,3]', '[4,3]',
            '[1,2]', '[2,2]', '[3,2]', '[4,2]',
            '[1,1]', '[2,1]', '[3,1]', '[4,1]'
          ].map(cell => {
            const isStart = cell === '[1,1]';
            const isSafe = cell === '[1,2]' || cell === '[2,1]';
            return `
              <div style="background: ${isStart ? '#10b981' : isSafe ? 'rgba(16,185,129,0.2)' : '#ffffff'}; border: 1px solid rgba(15,23,42,0.1); border-radius: 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 600; color: ${isStart ? '#ffffff' : '#334155'};">
                <span>${cell}</span>
                <span style="font-size: 0.65rem; color: ${isStart ? '#ecfdf5' : isSafe ? '#059669' : '#94a3b8'};">
                  ${isStart ? 'Agent (No Breeze)' : isSafe ? 'Provably Safe' : '?'}
                </span>
              </div>
            `;
          }).join('')}
        </div>
        <div style="margin-top: 0.5rem; font-size: 0.75rem; color: #64748b; background: rgba(15,23,42,0.03); padding: 0.5rem; border-radius: 6px;">
          <strong>Deduction:</strong> <code>¬Breeze(1,1) ⇒ ¬Pit(1,2) ∧ ¬Pit(2,1)</code>. Rooms [1,2] and [2,1] are provably safe.
        </div>
      </div>
    `;
  }

  function renderLogicGates(container) {
    container.innerHTML = `
      <div style="padding: 1rem; height: 100%; display: flex; flex-direction: column; justify-content: space-around;">
        <h3 style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary);">Interactive Connective Truth Table</h3>
        <table style="width: 100%; font-size: 0.75rem; text-align: center; border-collapse: collapse; background: #ffffff; border-radius: 8px; overflow: hidden;">
          <thead style="background: rgba(99,102,241,0.1); color: #4f46e5;">
            <tr><th style="padding: 4px;">P</th><th>Q</th><th>¬P</th><th>P ∧ Q</th><th>P ∨ Q</th><th>P ⇒ Q</th><th>P ⇔ Q</th></tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid rgba(15,23,42,0.05);"><td style="padding: 4px;">T</td><td>T</td><td>F</td><td>T</td><td>T</td><td style="color:#10b981; font-weight:700;">T</td><td>T</td></tr>
            <tr style="border-bottom: 1px solid rgba(15,23,42,0.05);"><td style="padding: 4px;">T</td><td>F</td><td>F</td><td>F</td><td>T</td><td style="color:#f43f5e; font-weight:700;">F</td><td>F</td></tr>
            <tr style="border-bottom: 1px solid rgba(15,23,42,0.05);"><td style="padding: 4px;">F</td><td>T</td><td>T</td><td>F</td><td>T</td><td style="color:#10b981; font-weight:700;">T</td><td>F</td></tr>
            <tr><td style="padding: 4px;">F</td><td>F</td><td>T</td><td>F</td><td>F</td><td style="color:#10b981; font-weight:700;">T</td><td>T</td></tr>
          </tbody>
        </table>
        <div style="font-size: 0.74rem; color: #64748b; margin-top: 0.4rem;">
          <em>Notice:</em> <code>P ⇒ Q</code> is only False when <code>P=True</code> and <code>Q=False</code>.
        </div>
      </div>
    `;
  }

  function renderVennEntailment(container) {
    container.innerHTML = `
      <div style="padding: 1rem; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;">
        <h3 style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.5rem;">
          Model Entailment: M(KB) ⊆ M(α)
        </h3>
        <div style="width: 240px; height: 160px; border-radius: 12px; background: rgba(99,102,241,0.1); border: 2px dashed #6366f1; display: flex; align-items: center; justify-content: center; position: relative;">
          <span style="position: absolute; top: 6px; left: 10px; font-size: 0.72rem; font-weight: 700; color: #4f46e5;">M(α) Models</span>
          <div style="width: 120px; height: 80px; border-radius: 8px; background: #10b981; display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: 700; font-size: 0.8rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            M(KB)
          </div>
        </div>
        <p style="font-size: 0.76rem; color: #64748b; margin-top: 0.75rem; text-align: center;">
          Every world where the KB is true is completely enclosed within worlds where α is true.
        </p>
      </div>
    `;
  }

  // --- Topic 2: Forward Chaining ---
  function renderHornClassifier(container) {
    container.innerHTML = `
      <div style="padding: 1rem; height: 100%; display: flex; flex-direction: column; justify-content: space-around;">
        <h3 style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary);">Horn Clause Structure</h3>
        <div class="glass-panel" style="padding: 0.8rem; border-radius: 8px; background: rgba(16,185,129,0.1); border-left: 4px solid #10b981;">
          <div style="font-size: 0.8rem; font-weight: 700; color: #065f46;">Definite Clause (Exactly 1 positive literal)</div>
          <div style="font-family: monospace; font-size: 0.8rem; color: #047857; margin-top: 2px;">
            P₁ ∧ P₂ ∧ P₃ ⇒ Q &emsp; (¬P₁ ∨ ¬P₂ ∨ ¬P₃ ∨ Q)
          </div>
        </div>
        <div class="glass-panel" style="padding: 0.8rem; border-radius: 8px; background: rgba(245,158,11,0.1); border-left: 4px solid #f59e0b;">
          <div style="font-size: 0.8rem; font-weight: 700; color: #92400e;">Goal Clause (0 positive literals)</div>
          <div style="font-family: monospace; font-size: 0.8rem; color: #b45309; margin-top: 2px;">
            ¬P₁ ∨ ¬P₂ &emsp; (Used for refutation queries)
          </div>
        </div>
      </div>
    `;
  }

  function renderForwardChainingTree(container) {
    container.innerHTML = `
      <div style="padding: 1rem; height: 100%; display: flex; flex-direction: column;">
        <h3 style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.5rem;">
          PL-FC-Entails Execution Trace
        </h3>
        <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
          <span style="padding: 2px 6px; background: #ecfdf5; color: #059669; border-radius: 4px; font-size: 0.72rem; font-weight: 600;">Facts: A, B</span>
          <span style="padding: 2px 6px; background: #eff6ff; color: #2563eb; border-radius: 4px; font-size: 0.72rem; font-weight: 600;">Rules: A∧B⇒C, C∧D⇒E, B⇒D</span>
        </div>
        <div style="flex: 1; background: #ffffff; border-radius: 8px; padding: 0.75rem; border: 1px solid rgba(15,23,42,0.08); font-family: monospace; font-size: 0.75rem; line-height: 1.6; color: #334155; overflow-y: auto;">
          <div>1. Agenda: [A, B] | Inferred: {A, B}</div>
          <div>2. Pop A &rarr; decrement count[A∧B⇒C] = 1</div>
          <div>3. Pop B &rarr; count[A∧B⇒C] = 0 <span style="color:#059669; font-weight:700;">(FIRES &rarr; push C)</span></div>
          <div>&emsp; &emsp; &emsp;count[B⇒D] = 0 <span style="color:#059669; font-weight:700;">(FIRES &rarr; push D)</span></div>
          <div>4. Pop C &rarr; count[C∧D⇒E] = 1</div>
          <div>5. Pop D &rarr; count[C∧D⇒E] = 0 <span style="color:#059669; font-weight:700;">(FIRES &rarr; push E)</span></div>
          <div style="color: #4f46e5; font-weight: 700; margin-top: 4px;">6. Goal E Reached! Time: O(N) Linear.</div>
        </div>
      </div>
    `;
  }

  // --- Topic 3: Uncertainty & Bayes ---
  function renderBeliefDistribution(container) {
    container.innerHTML = `
      <div style="padding: 1rem; height: 100%; display: flex; flex-direction: column; justify-content: space-around;">
        <h3 style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary);">Continuous Belief Distribution</h3>
        <div class="glass-panel" style="padding: 1rem; border-radius: 10px; background: #ffffff;">
          <div style="display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 600; margin-bottom: 0.4rem;">
            <span>Degree of Belief P(Cavity | Toothache)</span>
            <span style="color: #4f46e5;">60.0%</span>
          </div>
          <div style="height: 12px; background: rgba(15,23,42,0.08); border-radius: 999px; overflow: hidden;">
            <div style="width: 60%; height: 100%; background: linear-gradient(90deg, #6366f1, #06b6d4);"></div>
          </div>
        </div>
        <p style="font-size: 0.76rem; color: #64748b; line-height: 1.4;">
          Unlike binary logic, probability smoothly models degrees of belief given incomplete and noisy percepts.
        </p>
      </div>
    `;
  }

  function renderBayesMedicalCalculator(container) {
    container.innerHTML = `
      <div style="padding: 1rem; height: 100%; display: flex; flex-direction: column; justify-content: space-between;">
        <h3 style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary);">Bayes' Rule Medical Test</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.75rem;">
          <div style="padding: 0.5rem; background: rgba(15,23,42,0.03); border-radius: 6px;">Prior P(Disease): <strong>1.0%</strong></div>
          <div style="padding: 0.5rem; background: rgba(15,23,42,0.03); border-radius: 6px;">Sensitivity: <strong>95.0%</strong></div>
          <div style="padding: 0.5rem; background: rgba(15,23,42,0.03); border-radius: 6px;">False Alarm: <strong>5.0%</strong></div>
          <div style="padding: 0.5rem; background: #ecfdf5; color: #059669; border-radius: 6px; font-weight: 700;">Posterior P(D|+): <strong>16.1%</strong></div>
        </div>
        <div style="font-size: 0.74rem; color: #64748b; background: rgba(99,102,241,0.08); padding: 0.5rem; border-radius: 6px;">
          <strong>Teaching Reveal:</strong> Despite a 95% accurate test, true positives (0.95%) are outnumbered by false alarms from the 99% healthy population (4.95%).
        </div>
      </div>
    `;
  }

  // --- Topic 4: Bayesian Networks ---
  function renderBurglarAlarmDAG(container) {
    container.innerHTML = `
      <div style="padding: 1rem; height: 100%; display: flex; flex-direction: column;">
        <h3 style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.5rem;">Burglar Alarm Network (AIMA Fig 13.2)</h3>
        <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between; align-items: center;">
          <div style="display: flex; gap: 3rem;">
            <div style="padding: 6px 12px; background: #4f46e5; color: #fff; border-radius: 6px; font-size: 0.75rem; font-weight: 700;">Burglary (B)</div>
            <div style="padding: 6px 12px; background: #4f46e5; color: #fff; border-radius: 6px; font-size: 0.75rem; font-weight: 700;">Earthquake (E)</div>
          </div>
          <div style="font-size: 1rem; color: #94a3b8;">↓ &emsp; ↓</div>
          <div style="padding: 6px 16px; background: #0284c7; color: #fff; border-radius: 6px; font-size: 0.75rem; font-weight: 700;">Alarm (A)</div>
          <div style="font-size: 1rem; color: #94a3b8;">↙ &emsp; ↘</div>
          <div style="display: flex; gap: 3rem;">
            <div style="padding: 6px 12px; background: #10b981; color: #fff; border-radius: 6px; font-size: 0.75rem; font-weight: 700;">JohnCalls (J)</div>
            <div style="padding: 6px 12px; background: #10b981; color: #fff; border-radius: 6px; font-size: 0.75rem; font-weight: 700;">MaryCalls (M)</div>
          </div>
        </div>
        <div style="font-size: 0.72rem; color: #64748b; text-align: center; margin-top: 0.4rem;">
          P(B,E,A,J,M) = P(B)P(E)P(A|B,E)P(J|A)P(M|A) — 10 numbers instead of 31!
        </div>
      </div>
    `;
  }

  function renderMarkovBlanketInspector(container) {
    container.innerHTML = `
      <div style="padding: 1rem; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center;">
        <h3 style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.5rem;">Markov Blanket Shield</h3>
        <div class="glass-panel" style="padding: 1rem; border-radius: 12px; border: 2px dashed #d97706; background: rgba(245,158,11,0.08); text-align: center; max-width: 320px;">
          <div style="font-size: 0.75rem; font-weight: 700; color: #b45309; margin-bottom: 0.3rem;">Markov Blanket of Node X:</div>
          <div style="font-size: 0.8rem; color: #78350f; line-height: 1.4;">
            Parents(X) ∪ Children(X) ∪ Coparents(X)
          </div>
        </div>
        <p style="font-size: 0.75rem; color: #64748b; margin-top: 0.75rem; text-align: center;">
          Conditioned on its Markov Blanket, X is conditionally independent of all other nodes in the entire network.
        </p>
      </div>
    `;
  }

  function renderSamplingSimulation(container) {
    container.innerHTML = `
      <div style="padding: 1rem; height: 100%; display: flex; flex-direction: column; justify-content: space-around;">
        <h3 style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary);">Likelihood Weighting vs. Rejection Sampling</h3>
        <div class="glass-panel" style="padding: 0.8rem; border-radius: 8px; background: rgba(244,63,94,0.08); border-left: 4px solid #f43f5e;">
          <div style="font-size: 0.78rem; font-weight: 700; color: #9f1239;">Rejection Sampling</div>
          <div style="font-size: 0.72rem; color: #881337; margin-top: 2px;">Wastes up to 99% of samples rejecting non-matching evidence.</div>
        </div>
        <div class="glass-panel" style="padding: 0.8rem; border-radius: 8px; background: rgba(16,185,129,0.1); border-left: 4px solid #10b981;">
          <div style="font-size: 0.78rem; font-weight: 700; color: #065f46;">Likelihood Weighting</div>
          <div style="font-size: 0.72rem; color: #047857; margin-top: 2px;">Clamps evidence variables and weights every sample by w = ∏ P(eⱼ | parents). 100% efficient!</div>
        </div>
      </div>
    `;
  }

  // --- Topic 5: Temporal Reasoning & Hidden Markov Models ---
  function renderHMMFilteringStudio(container) {
    const hmm = H ? H.createUmbrellaWorld() : null;
    const obsSeq = ['Umbrella', 'Umbrella', 'NoUmbrella', 'Umbrella'];
    let currentStep = 2; // Day 2 by default

    function renderView() {
      const history = hmm ? hmm.filter(obsSeq.slice(0, currentStep)) : [];
      const latest = history[history.length - 1] || { belief: [0.5, 0.5], predicted: [0.5, 0.5] };
      const rainPct = (latest.belief[0] * 100).toFixed(1);
      const noRainPct = (latest.belief[1] * 100).toFixed(1);

      container.innerHTML = `
        <div style="padding: 1rem; height: 100%; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h3 style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary);">Umbrella World Forward Filtering</h3>
            <span style="font-size: 0.75rem; font-weight: 600; color: #4f46e5;">Day ${currentStep} of ${obsSeq.length}</span>
          </div>

          <!-- Time Step Slider / Badges -->
          <div style="display: flex; gap: 0.4rem; justify-content: center; margin: 0.5rem 0;">
            <button class="hmm-day-btn" data-day="0" style="padding: 4px 8px; border-radius: 6px; font-size: 0.72rem; font-weight: 600; cursor: pointer; border: 1px solid ${currentStep === 0 ? '#4f46e5' : 'rgba(15,23,42,0.1)'}; background: ${currentStep === 0 ? '#6366f1' : '#fff'}; color: ${currentStep === 0 ? '#fff' : '#334155'};">Day 0 (Prior)</button>
            ${obsSeq.map((obs, idx) => `
              <button class="hmm-day-btn" data-day="${idx + 1}" style="padding: 4px 8px; border-radius: 6px; font-size: 0.72rem; font-weight: 600; cursor: pointer; border: 1px solid ${currentStep === idx + 1 ? '#4f46e5' : 'rgba(15,23,42,0.1)'}; background: ${currentStep === idx + 1 ? '#6366f1' : '#fff'}; color: ${currentStep === idx + 1 ? '#fff' : '#334155'};">
                Day ${idx + 1} (${obs === 'Umbrella' ? '☂️' : '☀️'})
              </button>
            `).join('')}
          </div>

          <!-- Belief State Bar -->
          <div class="glass-panel" style="padding: 0.9rem; border-radius: 10px; background: #ffffff;">
            <div style="display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 700; margin-bottom: 0.4rem;">
              <span style="color: #0284c7;">P(Rain | evidence) = ${rainPct}%</span>
              <span style="color: #f59e0b;">P(NoRain) = ${noRainPct}%</span>
            </div>
            <div style="height: 14px; background: #fef3c7; border-radius: 999px; overflow: hidden; display: flex;">
              <div style="width: ${rainPct}%; height: 100%; background: #0284c7; transition: width 0.3s;"></div>
              <div style="width: ${noRainPct}%; height: 100%; background: #f59e0b; transition: width 0.3s;"></div>
            </div>
          </div>

          <!-- Filter Equations Breakdown -->
          <div style="font-family: monospace; font-size: 0.72rem; background: rgba(15,23,42,0.03); padding: 0.6rem; border-radius: 6px; color: #334155; line-height: 1.5;">
            <div>1. Predict: P(Rₜ|e₁:ₜ₋₁) = Tᵀ · fₜ₋₁ = &lang;${(latest.predicted[0]*100).toFixed(1)}%, ${(latest.predicted[1]*100).toFixed(1)}%&rang;</div>
            <div>2. Update: fₜ = α · Oₜ · Predict = &lang;<strong>${rainPct}%</strong>, <strong>${noRainPct}%</strong>&rang;</div>
          </div>
        </div>
      `;

      container.querySelectorAll('.hmm-day-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          currentStep = parseInt(btn.dataset.day, 10);
          renderView();
        });
      });
    }

    renderView();
  }

  function renderViterbiTrellisStudio(container) {
    const hmm = H ? H.createUmbrellaWorld() : null;
    const obsSeq = ['Umbrella', 'Umbrella', 'NoUmbrella'];
    const vResult = hmm ? hmm.viterbi(obsSeq) : { trellis: [[0.45, 0.10], [0.315, 0.045], [0.0315, 0.108]], optimalPath: ['Rain', 'Rain', 'NoRain'] };

    container.innerHTML = `
      <div style="padding: 1rem; height: 100%; display: flex; flex-direction: column; justify-content: space-between;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h3 style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary);">Viterbi Dynamic Programming Trellis</h3>
          <span style="font-size: 0.75rem; color: #059669; font-weight: 700;">Path: [${vResult.optimalPath.join(' → ')}]</span>
        </div>

        <div style="overflow-x: auto; background: #ffffff; border-radius: 8px; border: 1px solid rgba(15,23,42,0.08); padding: 0.5rem;">
          <table style="width: 100%; font-size: 0.74rem; text-align: center; border-collapse: collapse;">
            <thead>
              <tr style="color: #64748b; border-bottom: 1px solid rgba(15,23,42,0.1);">
                <th style="padding: 4px;">State</th>
                <th>Day 1 (☂️)</th>
                <th>Day 2 (☂️)</th>
                <th>Day 3 (☀️)</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom: 1px solid rgba(15,23,42,0.05);">
                <td style="font-weight: 700; color: #0284c7; padding: 6px;">Rain</td>
                <td style="background: rgba(16,185,129,0.15); font-weight:700; color:#065f46;">0.450</td>
                <td style="background: rgba(16,185,129,0.15); font-weight:700; color:#065f46;">0.283</td>
                <td>0.028</td>
              </tr>
              <tr>
                <td style="font-weight: 700; color: #f59e0b; padding: 6px;">NoRain</td>
                <td>0.100</td>
                <td>0.027</td>
                <td style="background: rgba(16,185,129,0.15); font-weight:700; color:#065f46;">0.085</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style="font-size: 0.74rem; color: #64748b; background: rgba(99,102,241,0.08); padding: 0.5rem; border-radius: 6px;">
          <strong>Backtrack:</strong> Highlights maximum probability state at t=3 (NoRain) and backtracks via optimal predecessors yielding <code>[Rain, Rain, NoRain]</code>.
        </div>
      </div>
    `;
  }

  // --- Topic 6: Evaluation Matrix ---
  function renderEvaluationMatrix(container) {
    container.innerHTML = `
      <div style="padding: 1rem; height: 100%; display: flex; flex-direction: column;">
        <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.5rem;">
          Reasoning Systems Multi-Dimensional Evaluation
        </h3>
        <div style="flex: 1; overflow-x: auto; background: #ffffff; border-radius: 8px;">
          <table style="width: 100%; font-size: 0.75rem; text-align: left; border-collapse: collapse;">
            <thead>
              <tr style="color: #64748b; border-bottom: 1px solid rgba(15,23,42,0.1);">
                <th style="padding: 0.5rem;">Dimension</th>
                <th>1. Horn Logic Agents</th>
                <th>2. Bayesian Networks</th>
                <th>3. Hidden Markov Models</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom: 1px solid rgba(15,23,42,0.05);">
                <td style="padding: 0.5rem; font-weight: 700; color: var(--text-primary);">Representation</td>
                <td>Horn Clauses (P₁∧…⇒Q)</td>
                <td>Directed Acyclic Graph</td>
                <td>2-Layer Temporal Chain</td>
              </tr>
              <tr style="border-bottom: 1px solid rgba(15,23,42,0.05);">
                <td style="padding: 0.5rem; font-weight: 700; color: var(--text-primary);">Certainty Model</td>
                <td>Boolean {0, 1}</td>
                <td>Probabilities [0, 1]</td>
                <td>Dynamic Belief Vector</td>
              </tr>
              <tr style="border-bottom: 1px solid rgba(15,23,42,0.05); background: rgba(16,185,129,0.08);">
                <td style="padding: 0.5rem; font-weight: 700; color: #10b981;">Time Complexity</td>
                <td style="font-family: monospace; font-weight: 700; color: #10b981;">O(N) Linear!</td>
                <td style="font-family: monospace;">Exact: O(2ⁿ)</td>
                <td style="font-family: monospace; color: #0284c7;">O(|S|²) per time step</td>
              </tr>
              <tr>
                <td style="padding: 0.5rem; font-weight: 700; color: var(--text-primary);">Primary Engine</td>
                <td>Forward Chaining</td>
                <td>Enumeration / Sampling</td>
                <td>Forward Filter / Viterbi</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // --- Topic 7: Code Trace ---
  function renderCodeTraceView(container) {
    const presets = [
      { id: 'fc', name: '1. PL-FC-Entails', file: 'python_sandbox/08_Logic_Reasoning.py' },
      { id: 'bayes_rule', name: '2. Bayes\' Rule Calculator', file: 'python_sandbox/09_Bayesian_Reasoning.py' },
      { id: 'bayes_enum', name: '3. Bayes Net Enumeration', file: 'python_sandbox/09_Bayesian_Reasoning.py' },
      { id: 'hmm_filter', name: '4. HMM Forward Filtering', file: 'python_sandbox/10_Temporal_Reasoning.py' },
      { id: 'viterbi', name: '5. HMM Viterbi Trellis', file: 'python_sandbox/10_Temporal_Reasoning.py' }
    ];

    let selectedPreset = 'fc';

    function update() {
      container.innerHTML = `
        <div style="padding: 1rem; height: 100%; display: flex; flex-direction: column;">
          <div style="display: flex; gap: 0.4rem; overflow-x: auto; margin-bottom: 0.75rem;">
            ${presets.map(p => `
              <button class="trace-preset-btn ${p.id === selectedPreset ? 'active' : ''}" data-pid="${p.id}" style="padding: 0.35rem 0.65rem; border-radius: 6px; font-size: 0.75rem; font-weight: 600; cursor: pointer; border: 1px solid ${p.id === selectedPreset ? '#4f46e5' : 'rgba(15,23,42,0.1)'}; background: ${p.id === selectedPreset ? 'rgba(99,102,241,0.2)' : 'rgba(15,23,42,0.05)'}; color: ${p.id === selectedPreset ? '#6d28d9' : '#64748b'};">
                ${p.name}
              </button>
            `).join('')}
          </div>

          <div style="flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; overflow: hidden;">
            <div class="glass-panel" style="padding: 0.75rem; border-radius: 8px; background: #f8fafc; overflow-y: auto; font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; color: #334155; line-height: 1.5; overflow-x: auto;">
              <div style="color: #64748b; margin-bottom: 0.4rem;"># Python Reference Source</div>
              <div style="white-space: pre;">${getCodeSnippet(selectedPreset).trim()}</div>
            </div>
            <div class="glass-panel" style="padding: 0.75rem; border-radius: 8px; background: rgba(15,23,42,0.03); overflow-y: auto; font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; color: #6d28d9; line-height: 1.6;">
              <div style="color: #0284c7; font-weight: 700; margin-bottom: 0.4rem;">Runtime Variable Watch</div>
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
    if (pid === 'fc') {
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
    } else if (pid === 'bayes_rule') {
      return `
def bayes_rule(prior, sensitivity, false_alarm):
    p_pos_d = sensitivity * prior
    p_pos_not_d = false_alarm * (1 - prior)
    alpha = 1.0 / (p_pos_d + p_pos_not_d)
    return alpha * p_pos_d`;
    } else if (pid === 'bayes_enum') {
      return `
def enumeration_ask(query, evidence, bn):
    qx = {}
    for val in (True, False):
        extended = {**evidence, query: val}
        qx[val] = enumerate_all(bn.vars, extended, bn)
    return normalize(qx)`;
    } else if (pid === 'hmm_filter') {
      return `
def forward_filter(evidence_seq, T, O, f0):
    history = [f0]
    f = f0
    for e in evidence_seq:
        predicted = T.T @ f
        updated = normalize(O[e] * predicted)
        f = updated
        history.append(f)
    return history`;
    } else {
      return `
def viterbi(evidence_seq, S, T, O, f0):
    m = [{s: f0[s] * O[s][evidence_seq[0]] for s in S}]
    backpointer = []
    for t in range(1, len(evidence_seq)):
        e = evidence_seq[t]
        m_t, bp_t = {}, {}
        for s in S:
            best_prev, max_val = max(
                ((prev, m[t-1][prev] * T[prev][s]) for prev in S),
                key=lambda x: x[1]
            )
            m_t[s] = max_val * O[s][e]
            bp_t[s] = best_prev
        m.append(m_t); backpointer.append(bp_t)
    return backtrack(m, backpointer)`;
    }
  }

  function getRuntimeState(pid) {
    if (pid === 'fc') {
      return `
facts = ['SymptomA', 'SymptomB']
count = {R1: 0, R2: 0, R3: 0, R4: 0}
inferred = {'SymptomA': True, 'SymptomB': True, 'ConditionC': True, 'DiseaseE': True, 'PrescribeF': True}
result = Goal 'PrescribeF' Entailed! (True)`;
    } else if (pid === 'bayes_rule') {
      return `
prior = 0.01 (1.0%)
sensitivity = 0.95
false_alarm = 0.05
p_pos = 0.0095 + 0.0495 = 0.0590
posterior P(Disease | +) = 16.1%`;
    } else if (pid === 'bayes_enum') {
      return `
query = 'Burglary'
evidence = {'JohnCalls': True, 'MaryCalls': True}
hidden_vars = ['Earthquake', 'Alarm']
normalized = {True: 0.2842, False: 0.7158}`;
    } else if (pid === 'hmm_filter') {
      return `
T = [[0.7, 0.3], [0.3, 0.7]]
f0 = <0.50, 0.50>
Day 1 (Umbrella): f1 = <0.818, 0.182> (81.8% Rain)
Day 2 (Umbrella): f2 = <0.883, 0.117> (88.3% Rain)`;
    } else {
      return `
evidence = ['Umbrella', 'Umbrella', 'NoUmbrella']
m1 = {'Rain': 0.450, 'NoRain': 0.100}
m2 = {'Rain': 0.283, 'NoRain': 0.027}
m3 = {'Rain': 0.028, 'NoRain': 0.085}
optimal_path = ['Rain', 'Rain', 'NoRain']`;
    }
  }

  // --- Auto Run on DOM Loaded ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
