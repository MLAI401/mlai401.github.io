/*
  MLAI401 — Topic 05 Reading Notes content (topic05_reading.html).
  Rendered by demos/reading_notes.js (same engine as Topics 06 and 07).
  Source: AIMA (4th ed.) Ch. 7, 12–14. Every numeric answer was recomputed.
*/
(function (root) {
  "use strict";
  const TABS = [
    { id: "logic", label: "Knowledge-Based Agents", source: "AIMA (4th ed.) Ch. 7", subs: [
      { id: "kb", label: "Knowledge Base",
        lead: "A <strong>knowledge-based agent</strong> keeps an explicit set of logical sentences about the world, adds new percepts to it, and derives new facts by inference.",
        points: [
          "Key idea: separate <strong>domain knowledge</strong> (the KB) from the <strong>inference engine</strong>.",
          "<strong>TELL(KB, sentence)</strong> adds knowledge or a percept. <strong>ASK(KB, query)</strong> asks what follows from the KB.",
          "Agent loop: perceive → TELL the percept → ASK for the best action → TELL that the action was taken → act.",
        ],
        formula: "TELL(KB, percept) → ASK(KB, action?) → TELL(KB, action) → act",
        checks: [
          { q: "Which operation adds a new percept to the KB?", options: ["TELL", "ASK"], answer: "TELL", why: "ASK only queries what is entailed." },
          { q: "Why separate the KB from the inference engine?", options: ["The same engine works for any domain", "It makes the KB smaller", "Inference needs no rules"], answer: "The same engine works for any domain", why: "Change the knowledge, keep the reasoning code." },
        ],
        remember: ["TELL to add, ASK to query."] },
      { id: "pl", label: "Propositional Logic",
        lead: "<strong>Propositional logic</strong> uses proposition symbols (P, Q, B<sub>1,1</sub>) joined by five connectives.",
        points: [
          "<strong>¬P</strong>: true iff P is false. <strong>P ∧ Q</strong>: both true. <strong>P ∨ Q</strong>: at least one true.",
          "<strong>P ⇒ Q</strong>: false only when P is true and Q is false (true whenever P is false). P ⇒ Q ≡ ¬P ∨ Q.",
          "<strong>P ⇔ Q</strong>: true iff P and Q have the same value.",
        ],
        example: "<table class='ag-table ui'><thead><tr><th>P</th><th>Q</th><th>P ∧ Q</th><th>P ∨ Q</th><th>P ⇒ Q</th><th>P ⇔ Q</th></tr></thead><tbody>" +
          "<tr><td>F</td><td>F</td><td>F</td><td>F</td><td>T</td><td>T</td></tr><tr><td>F</td><td>T</td><td>F</td><td>T</td><td>T</td><td>F</td></tr>" +
          "<tr class='is-hl'><td>T</td><td>F</td><td>F</td><td>T</td><td>F</td><td>F</td></tr><tr><td>T</td><td>T</td><td>T</td><td>T</td><td>T</td><td>T</td></tr></tbody></table>",
        checks: [
          { q: "P = false, Q = false. P ⇒ Q is…", options: ["true", "false"], answer: "true", why: "An implication with a false premise is (vacuously) true." },
          { q: "P ⇒ Q is equivalent to…", options: ["¬P ∨ Q", "P ∨ ¬Q", "¬P ∧ Q"], answer: "¬P ∨ Q", why: "It is false only for P = T, Q = F." },
        ],
        remember: ["⇒ is false only for true ⇒ false."] },
      { id: "entailment", label: "Models & Entailment",
        lead: "A <strong>model</strong> assigns true or false to every symbol. With n symbols there are <strong>2<sup>n</sup></strong> models.",
        points: [
          "m ⊨ α: sentence α is true in model m. M(α) is the set of models where α is true.",
          "<strong>Entailment</strong> KB ⊨ α: α is true in every model where the KB is true. There is no world where KB holds and α fails.",
        ],
        formula: "KB ⊨ α ⇔ M(KB) ⊆ M(α)",
        checks: [
          { q: "How many models with 4 symbols?", options: ["16", "8", "4"], answer: "16", why: "2⁴." },
          { q: "KB = {P, P ⇒ Q}. Does KB ⊨ Q?", options: ["Yes", "No"], answer: "Yes", why: "Every model with P true and P ⇒ Q true has Q true (modus ponens)." },
        ],
        remember: ["Entailment = no counterexample world."] },
      { id: "fc", label: "Forward Chaining",
        lead: "General propositional inference can be exponential; with <strong>Horn clauses</strong> it is linear.",
        points: [
          "<strong>Definite clause:</strong> exactly one positive literal, (P<sub>1</sub> ∧ … ∧ P<sub>k</sub>) ⇒ Q. <strong>Horn clause:</strong> at most one.",
          "<strong>PL-FC-Entails:</strong> put the known facts on an agenda; count[c] = number of unsatisfied premises of rule c.",
          "Pop a fact; decrement the count of every rule using it; when a count reaches 0 the rule fires and its conclusion joins the agenda.",
          "Return true when the query is produced; false when the agenda empties.",
          "Data-driven, sound and complete for Horn KBs, O(N) in the KB size.",
        ],
        formula: "count[c] = 0 ⇒ fire c, push conclusion",
        checks: [
          { q: "A rule A ∧ B ∧ C ⇒ D starts with count = ?", options: ["3", "1", "4"], answer: "3", why: "One per premise." },
          { q: "Forward chaining on a Horn KB runs in…", options: ["linear time", "exponential time", "quadratic time"], answer: "linear time", why: "Each fact is processed once and each premise decremented once." },
        ],
        remember: ["Facts in, counts down, rules fire."] },
    ] },
    { id: "probability", label: "Probabilistic Reasoning", source: "AIMA (4th ed.) Ch. 12–13", subs: [
      { id: "uncertainty", label: "Uncertainty & Belief",
        lead: "Strict logic breaks down because of <strong>laziness</strong> (too many rules), <strong>theoretical ignorance</strong> (no complete causal theory) and <strong>practical ignorance</strong> (noisy, partial sensors). Probability measures degrees of belief.",
        points: [
          "A prior P(A) ∈ [0, 1] expresses belief before evidence.",
          "The <strong>full joint distribution</strong> gives a probability to every combination of values; it sums to 1.",
          "<strong>Marginalisation:</strong> sum out the hidden variables to answer a query.",
        ],
        formula: "Σ<sub>x<sub>1</sub>…x<sub>n</sub></sub> P(x<sub>1</sub>, …, x<sub>n</sub>) = 1 &nbsp;·&nbsp; P(Y) = Σ<sub>z</sub> P(Y, Z = z)",
        checks: [
          { q: "P(Cavity, Toothache) = 0.12 and P(Cavity, ¬Toothache) = 0.08. P(Cavity) = ?", options: ["0.20", "0.04", "0.12"], answer: "0.20", why: "Sum out Toothache." },
        ],
        remember: ["Marginalise = sum out what you don't care about."] },
      { id: "bayes", label: "Bayes' Rule",
        lead: "<strong>Conditional probability</strong> is belief in A once B is known.",
        formula: "P(A | B) = P(A ∧ B) / P(B) &nbsp;·&nbsp; P(Cause | Effect) = P(Effect | Cause) · P(Cause) / P(Effect) = α · P(Effect | Cause) · P(Cause)",
        points: [
          "<strong>Product rule:</strong> P(A ∧ B) = P(A | B) P(B) = P(B | A) P(A). Equating the two gives Bayes' rule.",
          "α = 1 / P(Effect) normalises so that P(Cause | e) + P(¬Cause | e) = 1.",
          "Bayes turns the easy direction (how a cause produces symptoms) into the useful one (diagnosis).",
        ],
        checks: [
          { q: "P(A ∧ B) = 0.1, P(B) = 0.4. P(A | B) = ?", options: ["0.25", "0.04", "0.5"], answer: "0.25", why: "0.1 / 0.4." },
          { q: "Unnormalised scores 0.03 and 0.01. Normalised probability of the first?", options: ["0.75", "0.03", "0.25"], answer: "0.75", why: "0.03 / (0.03 + 0.01)." },
        ],
        remember: ["Posterior ∝ likelihood × prior."] },
      { id: "bn", label: "Bayesian Networks",
        lead: "A full joint over n Boolean variables needs 2<sup>n</sup> − 1 numbers. A <strong>Bayesian network</strong> uses conditional independence to store it compactly.",
        points: [
          "A <strong>DAG</strong>: nodes are random variables; edges are direct influences.",
          "Each node stores a <strong>CPT</strong> P(X<sub>i</sub> | Parents(X<sub>i</sub>)).",
          "With at most k parents per node: O(n · 2<sup>k</sup>) numbers instead of O(2<sup>n</sup>).",
        ],
        formula: "P(x<sub>1</sub>, …, x<sub>n</sub>) = ∏<sub>i</sub> P(x<sub>i</sub> | Parents(X<sub>i</sub>))",
        checks: [
          { q: "Full joint over 5 Boolean variables needs how many independent numbers?", options: ["31", "32", "10"], answer: "31", why: "2⁵ − 1." },
          { q: "Burglary network (B, E → A → J, M). How many CPT numbers? (1 + 1 + 4 + 2 + 2)", options: ["10", "31", "5"], answer: "10", why: "A has 2 parents (4 rows); J and M have one each (2 rows)." },
        ],
        remember: ["Joint = product of each node given its parents."] },
      { id: "independence", label: "Independence & Markov Blanket",
        lead: "X and Y are <strong>conditionally independent</strong> given Z if P(X | Y, Z) = P(X | Z).",
        formula: "MB(X) = Parents(X) ∪ Children(X) ∪ Parents of children (co-parents)",
        points: [
          "Given its <strong>Markov blanket</strong>, a node is independent of every other node in the network.",
          "In the burglary network: MB(B) = {A, E} (child A, co-parent E).",
        ],
        checks: [
          { q: "Burglary network: MB(A) = ?", options: ["{B, E, J, M}", "{B, E}", "{J, M}"], answer: "{B, E, J, M}", why: "Parents B, E; children J, M; no other co-parents." },
          { q: "MB(J) = ?", options: ["{A}", "{A, M}", "{B, E, A}"], answer: "{A}", why: "J's only parent is A; it has no children." },
        ],
        remember: ["Blanket = parents, children, children's other parents."] },
      { id: "inference", label: "Exact & Approximate Inference",
        lead: "Inference computes P(Query | evidence).",
        points: [
          "<strong>Enumeration (exact):</strong> sum the factored joint over all hidden variables y: P(X | e) = α Σ<sub>y</sub> P(X, e, y). Exponential in the worst case.",
          "<strong>Likelihood weighting (approximate):</strong> fix evidence variables to their observed values, sample the rest, and weight each sample by w = ∏ P(e<sub>j</sub> | parents(E<sub>j</sub>)). No sample is ever rejected.",
        ],
        formula: "P(X | e) = α Σ<sub>y</sub> P(X, e, y) &nbsp;·&nbsp; w = ∏<sub>j</sub> P(e<sub>j</sub> | parents(E<sub>j</sub>))",
        checks: [
          { q: "In likelihood weighting, evidence variables are…", options: ["fixed to their observed values", "sampled", "ignored"], answer: "fixed to their observed values", why: "Their probability goes into the sample's weight instead." },
          { q: "Evidence J = true with P(j | a) = 0.9 in a sample where A = true, and M = true with P(m | a) = 0.7. Weight?", options: ["0.63", "1.6", "0.9"], answer: "0.63", why: "0.9 × 0.7." },
        ],
        remember: ["Exact: sum out. Approximate: sample and weight."] },
    ] },
    { id: "temporal", label: "Temporal Reasoning & HMMs", source: "AIMA (4th ed.) Ch. 14", subs: [
      { id: "markov", label: "The Markov Property",
        lead: "In dynamic worlds the state changes over time slices t = 0, 1, 2, … X<sub>t</sub> is hidden; E<sub>t</sub> is the evidence.",
        formula: "transition: P(X<sub>t</sub> | X<sub>0:t−1</sub>) = P(X<sub>t</sub> | X<sub>t−1</sub>) &nbsp;·&nbsp; sensor: P(E<sub>t</sub> | X<sub>0:t</sub>, E<sub>1:t−1</sub>) = P(E<sub>t</sub> | X<sub>t</sub>)",
        points: [
          "<strong>First-order Markov:</strong> the next state depends only on the current one.",
          "<strong>Sensor Markov:</strong> evidence depends only on the current state.",
          "<strong>Stationary:</strong> the transition and sensor models do not change over time.",
        ],
        checks: [
          { q: "Under the first-order Markov assumption, X<sub>5</sub> depends directly on…", options: ["X₄ only", "X₀ … X₄", "E₅ only"], answer: "X₄ only", why: "Only the previous state matters." },
        ],
        remember: ["The present screens off the past."] },
      { id: "hmm", label: "HMM Formulation",
        lead: "A <strong>hidden Markov model</strong> has one discrete hidden state variable and is specified by ⟨S, O, T, M, f<sub>0</sub>⟩.",
        points: [
          "<strong>S:</strong> states {s<sub>1</sub>…s<sub>K</sub>}. <strong>O:</strong> observations {o<sub>1</sub>…o<sub>M</sub>}.",
          "<strong>T:</strong> T<sub>i,j</sub> = P(X<sub>t</sub> = s<sub>j</sub> | X<sub>t−1</sub> = s<sub>i</sub>).",
          "<strong>M:</strong> M<sub>j,k</sub> = P(E<sub>t</sub> = o<sub>k</sub> | X<sub>t</sub> = s<sub>j</sub>).",
          "<strong>f<sub>0</sub>:</strong> prior P(X<sub>0</sub>).",
        ],
        example: "<table class='ag-table ui'><thead><tr><th class='l'>Umbrella world</th><th>Rain<sub>t</sub></th><th>¬Rain<sub>t</sub></th></tr></thead><tbody>" +
          "<tr><td class='l'>from Rain<sub>t−1</sub></td><td>0.70</td><td>0.30</td></tr><tr><td class='l'>from ¬Rain<sub>t−1</sub></td><td>0.30</td><td>0.70</td></tr>" +
          "<tr class='is-hl'><td class='l'>P(umbrella | ·)</td><td>0.90</td><td>0.20</td></tr></tbody></table>",
        checks: [
          { q: "Each row of the transition matrix T sums to…", options: ["1", "0", "K"], answer: "1", why: "It is a distribution over next states." },
          { q: "P(no umbrella | Rain) in the umbrella world?", options: ["0.10", "0.90", "0.20"], answer: "0.10", why: "1 − 0.90." },
        ],
        remember: ["HMM = states, observations, T, M, prior."] },
      { id: "filtering", label: "Filtering (Forward Algorithm)",
        lead: "<strong>Filtering</strong> computes the belief state f<sub>1:t</sub> = P(X<sub>t</sub> | e<sub>1:t</sub>) with a predict–update cycle.",
        points: [
          "<strong>Predict:</strong> P(X<sub>t</sub> | e<sub>1:t−1</sub>) = Σ<sub>x<sub>t−1</sub></sub> P(X<sub>t</sub> | x<sub>t−1</sub>) P(x<sub>t−1</sub> | e<sub>1:t−1</sub>).",
          "<strong>Update:</strong> multiply by P(e<sub>t</sub> | X<sub>t</sub>) and normalise with α.",
          "Matrix form: O<sub>t</sub> is diagonal with P(e<sub>t</sub> | s<sub>j</sub>). Cost O(|S|²) per step.",
        ],
        formula: "f<sub>1:t</sub> = α · O<sub>t</sub> · Tᵀ · f<sub>1:t−1</sub>",
        checks: [
          { q: "Prior ⟨0.5, 0.5⟩, symmetric T. Predicted belief?", options: ["⟨0.5, 0.5⟩", "⟨0.7, 0.3⟩", "⟨0.9, 0.2⟩"], answer: "⟨0.5, 0.5⟩", why: "0.7·0.5 + 0.3·0.5 = 0.5." },
          { q: "Predicted ⟨0.5, 0.5⟩, umbrella seen (0.9 vs 0.2). P(Rain) after update?", options: ["≈ 0.818", "0.9", "0.45"], answer: "≈ 0.818", why: "0.45 / (0.45 + 0.10)." },
        ],
        remember: ["Predict with T, update with the evidence, normalise."] },
      { id: "queries", label: "Prediction, Smoothing, Viterbi",
        lead: "Four inference tasks in an HMM.",
        points: [
          "<strong>Filtering</strong> P(X<sub>t</sub> | e<sub>1:t</sub>): track the present online; O(|S|²) per step.",
          "<strong>Prediction</strong> P(X<sub>t+k</sub> | e<sub>1:t</sub>): apply (Tᵀ)<sup>k</sup>; converges to the stationary distribution.",
          "<strong>Smoothing</strong> P(X<sub>k</sub> | e<sub>1:t</sub>), k &lt; t: combine forward and backward messages (forward–backward).",
          "<strong>Most likely sequence</strong> (Viterbi): dynamic programming over the trellis, keeping the best path into each state; O(t · |S|²).",
        ],
        formula: "Viterbi: m<sub>t</sub>[j] = max<sub>i</sub> ( m<sub>t−1</sub>[i] · T<sub>i,j</sub> ) · P(e<sub>t</sub> | s<sub>j</sub>)",
        checks: [
          { q: "Estimating yesterday's weather using today's evidence too is…", options: ["smoothing", "filtering", "prediction"], answer: "smoothing", why: "It uses evidence after time k." },
          { q: "Viterbi replaces the forward algorithm's sum with…", options: ["a max", "a product", "a normalisation"], answer: "a max", why: "It keeps only the best path into each state." },
        ],
        remember: ["Filter now, predict ahead, smooth back, Viterbi for the best path."] },
    ] },
    { id: "compare", label: "Paradigm Comparison", source: "AIMA (4th ed.) Ch. 7, 13, 14", subs: [
      { id: "matrix", label: "Logic vs. Bayes Nets vs. HMMs",
        lead: "The three reasoning paradigms of this topic side by side.",
        example: "<table class='ag-table ui'><thead><tr><th class='l'></th><th class='l'>Horn logic</th><th class='l'>Bayesian networks</th><th class='l'>HMMs</th></tr></thead><tbody>" +
          "<tr><th class='l'>representation</th><td class='l'>Horn clauses, facts</td><td class='l'>DAG + CPTs</td><td class='l'>state chain + emissions</td></tr>" +
          "<tr><th class='l'>world</th><td class='l'>static, deterministic</td><td class='l'>static, uncertain</td><td class='l'>changes over time</td></tr>" +
          "<tr><th class='l'>certainty</th><td class='l'>true / false</td><td class='l'>probabilities</td><td class='l'>belief state P(X<sub>t</sub> | e<sub>1:t</sub>)</td></tr>" +
          "<tr><th class='l'>inference</th><td class='l'>forward chaining</td><td class='l'>enumeration, likelihood weighting</td><td class='l'>forward algorithm, Viterbi</td></tr>" +
          "<tr><th class='l'>cost</th><td class='l'>O(N)</td><td class='l'>exact O(2<sup>n</sup>); sampling O(N · n)</td><td class='l'>O(|S|²) per step; Viterbi O(T · |S|²)</td></tr>" +
          "<tr class='is-hl'><th class='l'>best for</th><td class='l'>expert systems, verification</td><td class='l'>diagnosis, fault finding</td><td class='l'>localisation, speech, tracking</td></tr></tbody></table>",
        checks: [
          { q: "A robot must track its position from noisy sensor readings over time. Best fit?", options: ["HMM", "Horn logic", "A static Bayesian network"], answer: "HMM", why: "The hidden state changes over time and evidence is noisy." },
          { q: "Certain if-then rules, and you need a fast yes/no answer. Best fit?", options: ["Horn logic with forward chaining", "HMM", "Likelihood weighting"], answer: "Horn logic with forward chaining", why: "Linear-time, exact, no uncertainty needed." },
          { q: "Diagnose a disease from several uncertain symptoms at one moment. Best fit?", options: ["Bayesian network", "HMM", "Horn logic"], answer: "Bayesian network", why: "Static, uncertain, many interacting variables." },
        ],
        remember: ["Certain rules → logic. Uncertain, static → Bayes net. Uncertain over time → HMM."] },
    ] },
    { id: "practice", label: "Practice", source: "Worked exercises · AIMA Ch. 7, 13, 14", subs: [
      { id: "ex1", label: "1 · Forward Chaining", exercise: true,
        problem: "Facts {SymptomA, SymptomB}. Rules: R1 SymptomA ∧ SymptomB ⇒ ConditionC · R2 ConditionC ∧ SymptomD ⇒ DiseaseE · R3 SymptomB ⇒ SymptomD · R4 DiseaseE ⇒ PrescribeMedicationF. Trace PL-FC-Entails for PrescribeMedicationF.",
        tasks: [
          { type: "num", label: "Initial count[R2]", answer: 2, tol: 0 },
          { type: "mcq", q: "Popping SymptomB fires…", options: ["R1 and R3", "R1 only", "R2"], answer: "R1 and R3", why: "count[R1] 1 → 0 and count[R3] 1 → 0." },
          { type: "mcq", q: "Which fact makes R2 fire?", options: ["SymptomD", "ConditionC", "SymptomA"], answer: "SymptomD", why: "ConditionC is popped first (count 2 → 1); SymptomD brings it to 0." },
          { type: "num", label: "Number of pops until the query is reached", answer: 6, tol: 0 },
          { type: "mcq", q: "Is PrescribeMedicationF entailed?", options: ["Yes", "No"], answer: "Yes", why: "It is derived on the agenda." },
        ],
        steps: [
          "<strong>Setup:</strong> agenda [SymptomA, SymptomB]; counts R1 = 2, R2 = 2, R3 = 1, R4 = 1.",
          "<strong>Pop SymptomA:</strong> R1 → 1.",
          "<strong>Pop SymptomB:</strong> R1 → 0, fire: add ConditionC. R3 → 0, fire: add SymptomD.",
          "<strong>Pop ConditionC:</strong> R2 → 1. <strong>Pop SymptomD:</strong> R2 → 0, fire: add DiseaseE.",
          "<strong>Pop DiseaseE:</strong> R4 → 0, fire: add PrescribeMedicationF. <strong>Pop PrescribeMedicationF:</strong> query reached, return <strong>true</strong> (6 pops).",
        ] },
      { id: "ex2", label: "2 · Bayes' Rule Screening", exercise: true,
        problem: "Prevalence P(D) = 0.001. Sensitivity P(+ | D) = 0.99. False-positive rate P(+ | ¬D) = 0.02. A random patient tests positive: find P(D | +).",
        tasks: [
          { type: "num", label: "P(+ ∧ D)", answer: 0.00099, tol: 0.000005 },
          { type: "num", label: "P(+ ∧ ¬D)", answer: 0.01998, tol: 0.00001 },
          { type: "num", label: "P(+)", answer: 0.02097, tol: 0.00001 },
          { type: "num", label: "P(D | +), in %", answer: 4.72, tol: 0.02, unit: "%" },
        ],
        steps: [
          "<strong>Disease:</strong> 0.99 × 0.001 = 0.000990.",
          "<strong>No disease:</strong> 0.02 × 0.999 = 0.019980.",
          "<strong>Evidence:</strong> P(+) = 0.000990 + 0.019980 = 0.020970.",
          "<strong>Posterior:</strong> 0.000990 / 0.020970 ≈ <strong>4.72%</strong>.",
          "<strong>Why so low?</strong> False positives from the 99.9% healthy majority outnumber true positives by more than 20 to 1.",
        ] },
      { id: "ex3", label: "3 · Burglary Network", exercise: true,
        problem: "Burglary (B) and Earthquake (E) cause Alarm (A); A causes JohnCalls (J) and MaryCalls (M). Factor the joint, then compute P(b, ¬e, a, j, ¬m) with P(b) = 0.001, P(e) = 0.002, P(a | b, ¬e) = 0.94, P(j | a) = 0.90, P(m | a) = 0.70.",
        tasks: [
          { type: "mcq", q: "Factorisation?", options: ["P(B) P(E) P(A | B, E) P(J | A) P(M | A)", "P(B) P(E) P(A) P(J) P(M)", "P(J | M) P(M | A) P(A | B) P(B | E) P(E)"], answer: "P(B) P(E) P(A | B, E) P(J | A) P(M | A)", why: "Each node given its parents." },
          { type: "num", label: "P(¬m | a)", answer: 0.3, tol: 0.0001 },
          { type: "num", label: "P(b, ¬e, a, j, ¬m)", answer: 0.0002532924, tol: 0.0000005 },
        ],
        steps: [
          "<strong>Factorisation:</strong> P(B, E, A, J, M) = P(B) · P(E) · P(A | B, E) · P(J | A) · P(M | A).",
          "<strong>Factors:</strong> P(b) = 0.001 · P(¬e) = 0.998 · P(a | b, ¬e) = 0.94 · P(j | a) = 0.90 · P(¬m | a) = 0.30.",
          "<strong>Product:</strong> 0.001 × 0.998 × 0.94 = 0.00093812; × 0.90 × 0.30 = × 0.27 → <strong>0.0002532924</strong> (≈ 0.0253%).",
        ] },
      { id: "ex4", label: "4 · Forward Filtering", exercise: true,
        problem: "Umbrella world: P(Rain₀) = 0.5; T: Rain → Rain 0.7, ¬Rain → Rain 0.3; P(u | Rain) = 0.9, P(u | ¬Rain) = 0.2. Umbrella seen on days 1 and 2. Find P(Rain₁ | u₁) and P(Rain₂ | u₁, u₂).",
        tasks: [
          { type: "num", label: "Predicted P(Rain₁)", answer: 0.5, tol: 0.001 },
          { type: "num", label: "P(Rain₁ | u₁)", answer: 0.8182, tol: 0.001 },
          { type: "num", label: "Predicted P(Rain₂ | u₁)", answer: 0.6273, tol: 0.001 },
          { type: "num", label: "P(Rain₂ | u₁, u₂)", answer: 0.8834, tol: 0.001 },
        ],
        steps: [
          "<strong>Day 1 predict:</strong> 0.7 × 0.5 + 0.3 × 0.5 = 0.50 for each state.",
          "<strong>Day 1 update:</strong> Rain 0.9 × 0.5 = 0.450, ¬Rain 0.2 × 0.5 = 0.100; sum 0.550 → f₁ = ⟨<strong>0.8182</strong>, 0.1818⟩.",
          "<strong>Day 2 predict:</strong> Rain 0.7 × 0.8182 + 0.3 × 0.1818 = 0.6273; ¬Rain 0.3727.",
          "<strong>Day 2 update:</strong> 0.9 × 0.6273 = 0.5645, 0.2 × 0.3727 = 0.0745; sum 0.6391 → f₂ = ⟨<strong>0.8834</strong>, 0.1166⟩.",
          "Two umbrella sightings raise the belief in rain from 50% to about 88.3%.",
        ] },
      { id: "ex5", label: "5 · Viterbi Decoding", exercise: true,
        problem: "Same umbrella model. Observations [u₁ = true, u₂ = false]. Find the most likely weather sequence [R₁, R₂] with the Viterbi algorithm.",
        tasks: [
          { type: "num", label: "m₁[Rain]", answer: 0.45, tol: 0.0005 },
          { type: "num", label: "m₂[Rain]", answer: 0.0315, tol: 0.0002 },
          { type: "num", label: "m₂[¬Rain]", answer: 0.108, tol: 0.0005 },
          { type: "mcq", q: "Most likely sequence?", options: ["[Rain, ¬Rain]", "[Rain, Rain]", "[¬Rain, ¬Rain]"], answer: "[Rain, ¬Rain]", why: "m₂[¬Rain] is larger and its backpointer is Rain." },
          { type: "num", label: "Posterior of that path, in %", answer: 54.4, tol: 0.2, unit: "%", hint: "Divide 0.108 by P(u₁, ¬u₂) = 0.1985." },
        ],
        steps: [
          "<strong>t = 1:</strong> predicted P(R₁) = 0.5 each. m₁[Rain] = 0.5 × 0.9 = <strong>0.450</strong>; m₁[¬Rain] = 0.5 × 0.2 = 0.100.",
          "<strong>t = 2, Rain:</strong> max(0.450 × 0.7, 0.100 × 0.3) = 0.315 (from Rain); × P(¬u | Rain) = 0.1 → <strong>0.0315</strong>.",
          "<strong>t = 2, ¬Rain:</strong> max(0.450 × 0.3, 0.100 × 0.7) = 0.135 (from Rain); × P(¬u | ¬Rain) = 0.8 → <strong>0.1080</strong>.",
          "<strong>Backtrack:</strong> best final state ¬Rain (0.108) ← Rain. Path <strong>[Rain, ¬Rain]</strong>.",
          "<strong>Posterior:</strong> P(u₁, ¬u₂) = 0.55 × (0.6273 × 0.1 + 0.3727 × 0.8) = 0.1985; 0.108 / 0.1985 ≈ <strong>54.4%</strong>.",
        ] },
    ] },
  ];
  root.READING_NOTES = { tabs: TABS };
})(typeof window !== "undefined" ? window : globalThis);
