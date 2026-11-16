/*
  MLAI401 — Topic 06 Reading Notes content (topic06_reading.html).
  Rendered by demos/reading_notes.js (same engine as Topic 07).
  Every numeric answer was recomputed; Exercise 7's problem statement
  now matches its solution (the goal transition gives r = +1.0).
*/
(function (root) {
  "use strict";
  const TABS = [
    { id: "supervised", label: "Supervised Learning", source: "AIMA (4th ed.) Ch. 19–20 · Manning, Raghavan & Schütze, Introduction to Information Retrieval", subs: [
      { id: "text-features", label: "Bag-of-Words & TF-IDF",
        lead: "Classifiers need numbers. Each document becomes a <strong>vector</strong> over a fixed vocabulary learned from the training documents.",
        points: [
          "<strong>Tokenise and lowercase</strong> the text; the vocabulary V is the sorted set of training tokens.",
          "<strong>Bag-of-Words:</strong> x(d) = ⟨count(w<sub>1</sub>, d), …, count(w<sub>|V|</sub>, d)⟩. Word order is thrown away; counts still carry the topic.",
          "<strong>TF</strong> = how often t appears in d, relative to the length of d. <strong>IDF</strong> = how rare t is across the N training documents.",
          "<strong>TF-IDF</strong> is high for words that are frequent in this document but rare in the corpus (e.g. “lottery”).",
        ],
        formula: "TF(t, d) = count(t, d) / |d| &nbsp;·&nbsp; IDF(t) = ln( N / DF(t) ) &nbsp;·&nbsp; TF-IDF(t, d) = TF(t, d) × IDF(t)",
        example: '<table class="ag-table"><thead><tr><th class="l">doc</th><th>bonus</th><th>cash</th><th>lottery</th><th>meeting</th><th>prize</th><th>project</th><th>team</th><th>win</th></tr></thead><tbody>' +
          '<tr class="is-hl"><td class="l">“win cash prize”</td><td>0</td><td>1</td><td>0</td><td>0</td><td>1</td><td>0</td><td>0</td><td>1</td></tr>' +
          '<tr><td class="l">“win lottery bonus cash”</td><td>1</td><td>1</td><td>1</td><td>0</td><td>0</td><td>0</td><td>0</td><td>1</td></tr>' +
          '<tr><td class="l">“team project meeting”</td><td>0</td><td>0</td><td>0</td><td>1</td><td>0</td><td>1</td><td>1</td><td>0</td></tr></tbody></table>',
        checks: [
          { q: "A word appears in every training document. Its IDF is…", options: ["0", "1", "ln N"], answer: "0", why: "ln(N / N) = ln 1 = 0: a word everyone uses tells you nothing." },
          { q: "“dog bites man” vs “man bites dog”: their Bag-of-Words vectors are…", options: ["identical", "different"], answer: "identical", why: "Bag-of-Words keeps counts and drops order." },
          { q: "count(t, d) = 2, |d| = 8, N = 4, DF(t) = 1. TF-IDF ≈ ?", options: ["0.35", "0.25", "1.39"], answer: "0.35", why: "TF = 2/8 = 0.25, IDF = ln 4 ≈ 1.386; 0.25 × 1.386 ≈ 0.35." },
        ],
        remember: ["The vocabulary and IDF come from the training documents only and are reused for new messages.", "Words outside the vocabulary get no slot and are ignored."] },
      { id: "naive-bayes", label: "Naive Bayes (MAP)",
        lead: "<strong>Naive Bayes</strong> is a generative classifier: it picks the class that makes the observed features most probable, weighted by how common the class is.",
        points: [
          "<strong>MAP rule:</strong> choose the class with the largest posterior P(c | x) ∝ P(c) · P(x | c).",
          "<strong>Naive assumption:</strong> features are independent given the class, so P(x | c) becomes a product of per-word likelihoods.",
          "Words are correlated in reality, yet Naive Bayes is fast, needs little data, and is a strong text baseline.",
        ],
        formula: "c* = argmax<sub>c</sub> P(c) · ∏<sub>i</sub> P(x<sub>i</sub> | c)",
        checks: [
          { q: "Why is it called “naive”?", options: ["It assumes features are independent given the class", "It ignores the prior", "It needs few training examples"], answer: "It assumes features are independent given the class", why: "That assumption is what turns P(x | c) into a simple product." },
          { q: "P(spam) = 0.4, P(ham) = 0.6, P(x | spam) = 0.05, P(x | ham) = 0.01. Decision?", options: ["Spam", "Ham"], answer: "Spam", why: "0.4 × 0.05 = 0.020 beats 0.6 × 0.01 = 0.006, even though ham is more common." },
          { q: "P(c | x) is proportional to…", options: ["P(c) · P(x | c)", "P(x) · P(c | x)", "P(x | c) / P(c)"], answer: "P(c) · P(x | c)", why: "Bayes' rule; P(x) is the same for every class, so it can be dropped." },
        ],
        remember: ["Prior × likelihood, then take the largest.", "The class with the bigger prior does not always win."] },
      { id: "laplace", label: "Laplace Smoothing & Log-Space",
        lead: "Two practical fixes make Naive Bayes work on real text.",
        points: [
          "<strong>Zero-probability trap:</strong> one test word never seen with a class makes the whole product 0 for that class.",
          "<strong>Laplace (add-1) smoothing</strong> adds 1 to every count, and |V| to the denominator so the probabilities still sum to 1.",
          "<strong>Log-space:</strong> multiplying many small probabilities underflows to 0, so add log-probabilities instead. Log is increasing, so the argmax is unchanged.",
        ],
        formula: "P̂(w | c) = (count(w, c) + 1) / (Σ<sub>w′</sub> count(w′, c) + |V|) &nbsp;·&nbsp; c* = argmax<sub>c</sub> [ log P(c) + Σ<sub>i</sub> log P(x<sub>i</sub> | c) ]",
        checks: [
          { q: "Without smoothing, a test word never seen in spam makes the spam score…", options: ["0", "1", "unchanged"], answer: "0", why: "One factor of 0 zeroes the whole product." },
          { q: "count(w, c) = 0, total words in c = 12, |V| = 6. Smoothed P(w | c) = ?", options: ["0", "1/18", "1/12"], answer: "1/18", why: "(0 + 1) / (12 + 6) = 1/18." },
          { q: "Why sum logs instead of multiplying probabilities?", options: ["Products of many small numbers underflow to 0", "Logs change which class wins", "Logs are needed for smoothing"], answer: "Products of many small numbers underflow to 0", why: "Logs keep the numbers in a safe range and give the same argmax." },
        ],
        remember: ["Add 1 to the numerator, |V| to the denominator."] },
      { id: "evaluation", label: "Confusion Matrix & F1",
        lead: "Accuracy alone can hide a useless classifier. Count the four outcomes on held-out test data.",
        points: [
          "<strong>TP</strong> spam caught · <strong>FP</strong> good mail flagged (false alarm) · <strong>FN</strong> spam missed · <strong>TN</strong> good mail passed.",
          "<strong>Precision:</strong> of everything flagged, how much was really spam? <strong>Recall:</strong> of all spam, how much was caught?",
          "<strong>Accuracy paradox:</strong> with 1% spam, “never spam” scores 99% accuracy and 0% recall. F1, the harmonic mean, exposes it.",
        ],
        formula: "Accuracy = (TP + TN) / N · Precision = TP / (TP + FP) · Recall = TP / (TP + FN) · F1 = 2TP / (2TP + FP + FN)",
        example: '<table class="ag-table ui"><thead><tr><th></th><th>predicted spam</th><th>predicted ham</th></tr></thead><tbody>' +
          '<tr><th class="l">actual spam</th><td class="is-best">TP</td><td style="color:var(--ag-error);font-weight:700">FN (missed)</td></tr>' +
          '<tr><th class="l">actual ham</th><td style="color:var(--ag-error);font-weight:700">FP (false alarm)</td><td class="is-best">TN</td></tr></tbody></table>',
        checks: [
          { q: "A spam e-mail lands in your inbox. That is a…", options: ["False positive", "False negative", "True negative"], answer: "False negative", why: "Spam is the positive class, and the filter said “not spam”." },
          { q: "1% of e-mails are spam. A model that always says “ham” has accuracy…", options: ["1%", "50%", "99%"], answer: "99%", why: "It gets every ham right, but its recall on spam is 0%." },
          { q: "TP = 40, FP = 10, FN = 40. Precision and recall?", options: ["0.8 and 0.5", "0.5 and 0.8", "0.8 and 0.8"], answer: "0.8 and 0.5", why: "Precision 40/50 = 0.8; recall 40/80 = 0.5." },
        ],
        remember: ["FP = false alarm, FN = missed detection.", "On imbalanced data, report precision, recall and F1, not just accuracy."] },
    ] },
    { id: "neural", label: "Neural Networks", source: "AIMA (4th ed.) Ch. 21 · Minsky & Papert (1969)", subs: [
      { id: "perceptron", label: "The Perceptron",
        lead: "The <strong>perceptron</strong> computes a weighted sum of its inputs plus a bias and fires if the sum is at least 0.",
        points: [
          "Its decision boundary is a <strong>line</strong> (a hyperplane in ℝ<sup>d</sup>).",
          "<strong>Learning rule:</strong> when it is wrong, move the weights toward the input (y = 1) or away from it (y = 0).",
          "Minsky & Papert (1969): one perceptron cannot learn <strong>XOR</strong>, because no single line separates XOR's classes.",
        ],
        formula: "z = wᵀx + b, &nbsp; ŷ = step(z) &nbsp;·&nbsp; w ← w + α (y − ŷ) x, &nbsp; b ← b + α (y − ŷ)",
        checks: [
          { q: "Which function can a single perceptron NOT learn?", options: ["AND", "OR", "XOR"], answer: "XOR", why: "XOR's two classes sit on opposite diagonals; no straight line splits them." },
          { q: "w = [1, 1], b = −1.5, x = [1, 1]. ŷ = ?", options: ["1", "0"], answer: "1", why: "z = 1 + 1 − 1.5 = 0.5 ≥ 0. (These weights implement AND.)" },
          { q: "The prediction is already correct (y = ŷ). The update…", options: ["changes nothing", "doubles w", "resets b to 0"], answer: "changes nothing", why: "The error y − ŷ is 0, so every step is 0." },
        ],
        remember: ["Perceptron = linear boundary; XOR needs a hidden layer."] },
      { id: "mlp", label: "Hidden Layers & Activations",
        lead: "A <strong>multi-layer network</strong> adds hidden units with a non-linear activation g, so it can bend the boundary.",
        points: [
          "<strong>Sigmoid</strong> σ(z) = 1 / (1 + e<sup>−z</sup>) maps any number into (0, 1): good for an output probability.",
          "<strong>ReLU</strong>(z) = max(0, z): the modern default for hidden units; no vanishing gradient for z &gt; 0.",
          "Without a non-linear g, stacked linear layers collapse into one linear map.",
        ],
        formula: "h = g(W<sub>1</sub>x + b<sub>1</sub>), &nbsp; ŷ = σ(W<sub>2</sub>h + b<sub>2</sub>)",
        checks: [
          { q: "σ(0) = ?", options: ["0", "0.5", "1"], answer: "0.5", why: "1 / (1 + e⁰) = 1 / 2." },
          { q: "ReLU(−3) = ?", options: ["−3", "0", "3"], answer: "0", why: "max(0, −3) = 0." },
          { q: "Two linear layers with no activation in between give…", options: ["still a linear model", "a non-linear model", "a decision tree"], answer: "still a linear model", why: "W₂(W₁x) = (W₂W₁)x is one matrix." },
        ],
        remember: ["The non-linearity is what lets one hidden layer solve XOR."] },
      { id: "gradient-descent", label: "Loss & Gradient Descent",
        lead: "Training means making a <strong>loss</strong> small by repeatedly stepping the weights downhill.",
        points: [
          "<strong>Binary cross-entropy</strong> punishes confident wrong answers heavily.",
          "<strong>Gradient descent:</strong> move every weight a small step against its gradient.",
          "<strong>Learning rate α:</strong> too small is slow; too large overshoots and can diverge.",
        ],
        formula: "L(w) = −[ y log ŷ + (1 − y) log(1 − ŷ) ] &nbsp;·&nbsp; w ← w − α ∇<sub>w</sub>L(w)",
        checks: [
          { q: "y = 1, ŷ = 0.9. Cross-entropy loss (natural log) ≈ ?", options: ["0.105", "2.303", "0.9"], answer: "0.105", why: "−ln 0.9 ≈ 0.105. With ŷ = 0.1 it would be −ln 0.1 ≈ 2.303." },
          { q: "w = 2, ∂L/∂w = 4, α = 0.1. New w?", options: ["1.6", "2.4", "−2"], answer: "1.6", why: "2 − 0.1 × 4 = 1.6." },
          { q: "A learning rate that is too large…", options: ["overshoots and may diverge", "always converges faster", "has no effect"], answer: "overshoots and may diverge", why: "Each step jumps across the valley instead of into it." },
        ],
        remember: ["new value = old value − α × gradient."] },
      { id: "backprop", label: "Backpropagation",
        lead: "<strong>Backpropagation</strong> computes the gradient of the loss for every weight with the chain rule, from the output back to the input.",
        points: [
          "Each layer passes an error signal back; each weight's gradient is its error signal times its input.",
          "With a sigmoid output and cross-entropy loss the output error is simply ŷ − y.",
          "Deep networks learn a hierarchy of features: pixels → edges → textures → parts → objects.",
        ],
        formula: "∂L/∂w = ∂L/∂ŷ · ∂ŷ/∂z · ∂z/∂w &nbsp;·&nbsp; sigmoid + cross-entropy: δ<sub>o</sub> = ŷ − y",
        checks: [
          { q: "Backpropagation computes…", options: ["the gradient of the loss for every weight", "the forward prediction", "the learning rate"], answer: "the gradient of the loss for every weight", why: "Gradient descent then uses those gradients to update." },
          { q: "Sigmoid output with cross-entropy: ŷ = 0.7, y = 1. δ<sub>o</sub> = ŷ − y = ?", options: ["−0.3", "0.3", "0.7"], answer: "−0.3", why: "Negative: the output should go up, so weights move to increase it." },
        ],
        remember: ["Forward pass computes ŷ; backward pass computes the gradients; the update uses them."] },
    ] },
    { id: "unsupervised", label: "Unsupervised: K-Means", source: "AIMA (4th ed.) Ch. 19–20", subs: [
      { id: "kmeans", label: "K-Means (Lloyd's Algorithm)",
        lead: "No labels: <strong>K-Means</strong> splits N points into K groups so that points sit close to their group's centre.",
        points: [
          "<strong>Assign:</strong> each point joins its nearest centroid.",
          "<strong>Update:</strong> each centroid moves to the mean of its points.",
          "Repeat until nothing changes. WCSS never increases, so it converges (possibly to a local minimum, depending on the start).",
        ],
        formula: "c<sub>i</sub> = argmin<sub>k</sub> ‖x<sub>i</sub> − μ<sub>k</sub>‖² &nbsp;·&nbsp; μ<sub>k</sub> = (1 / |C<sub>k</sub>|) Σ<sub>x∈C<sub>k</sub></sub> x &nbsp;·&nbsp; WCSS = Σ<sub>k</sub> Σ<sub>x∈C<sub>k</sub></sub> ‖x − μ<sub>k</sub>‖²",
        checks: [
          { q: "Point (2, 2); centroids μ₁ = (0, 0), μ₂ = (3, 3). It is assigned to…", options: ["μ₁", "μ₂"], answer: "μ₂", why: "Squared distances: 8 to μ₁, 2 to μ₂." },
          { q: "A cluster holds (1, 1), (3, 1), (2, 4). Its new centroid?", options: ["(2, 2)", "(2, 3)", "(3, 2)"], answer: "(2, 2)", why: "Mean x = 6/3 = 2, mean y = 6/3 = 2." },
          { q: "Each K-Means iteration makes WCSS…", options: ["go down or stay the same", "go up", "change randomly"], answer: "go down or stay the same", why: "Both steps can only reduce the sum of squared distances." },
        ],
        remember: ["Assign to nearest, move to mean, repeat.", "Different starting centroids can give different results."] },
      { id: "elbow", label: "Voronoi Cells & the Elbow",
        lead: "Centroids split the plane into <strong>Voronoi cells</strong>; the <strong>elbow method</strong> helps choose K.",
        points: [
          "A centroid's Voronoi cell is every location closer to it than to any other centroid.",
          "WCSS always falls as K grows (it is 0 when K = N), so the smallest WCSS is not the goal.",
          "Pick K at the <strong>elbow</strong>, where adding another cluster stops helping much.",
        ],
        formula: "plot WCSS(K) for K = 1, 2, 3, … and choose the bend",
        checks: [
          { q: "WCSS when K = N (one cluster per point)?", options: ["0", "N", "undefined"], answer: "0", why: "Every point is its own centroid." },
          { q: "WCSS for K = 1…5: 100, 40, 30, 27, 25. The elbow is at K = ?", options: ["2", "3", "5"], answer: "2", why: "The big drop is 100 → 40; after that each extra cluster saves little." },
          { q: "A centroid's Voronoi cell is…", options: ["every location closer to it than to any other centroid", "only its training points", "a circle of fixed radius"], answer: "every location closer to it than to any other centroid", why: "Cells are convex polygons whose borders are equidistant lines." },
        ],
        remember: ["Choose K at the bend, not at the minimum WCSS."] },
    ] },
    { id: "rl", label: "Reinforcement Learning", source: "AIMA (4th ed.) Ch. 17, 22 · Sutton & Barto, Reinforcement Learning (2nd ed.)", subs: [
      { id: "mdp", label: "MDPs & Returns",
        lead: "A <strong>Markov Decision Process</strong> describes sequential decisions under uncertainty with the 5-tuple ⟨S, A, P, R, γ⟩.",
        points: [
          "<strong>S</strong> states, <strong>A</strong> actions, <strong>P(s′ | s, a)</strong> transitions, <strong>R(s, a, s′)</strong> rewards, <strong>γ ∈ [0, 1)</strong> discount.",
          "<strong>Markov property:</strong> the next state depends only on the current state and action.",
          "The agent maximises the discounted <strong>return</strong>; small γ is short-sighted, γ near 1 is far-sighted.",
        ],
        formula: "G<sub>t</sub> = Σ<sub>k=0..∞</sub> γ<sup>k</sup> R<sub>t+k+1</sub>",
        checks: [
          { q: "γ = 0.5, rewards 1, 1, 1, then 0 forever. G₀ = ?", options: ["3", "1.75", "1.5"], answer: "1.75", why: "1 + 0.5 + 0.25 = 1.75." },
          { q: "Markov property: the next state depends on…", options: ["only the current state and action", "the whole history", "only the last reward"], answer: "only the current state and action", why: "The state must summarise everything relevant." },
          { q: "γ close to 0 makes the agent…", options: ["short-sighted", "far-sighted"], answer: "short-sighted", why: "Future rewards are discounted almost to nothing." },
        ],
        remember: ["The living reward (e.g. −0.04) makes long wandering costly."] },
      { id: "values", label: "Value Functions V & Q",
        lead: "Value functions say how good a state, or a state–action pair, is under a policy π.",
        points: [
          "<strong>V<sup>π</sup>(s):</strong> expected return starting in s and following π.",
          "<strong>Q<sup>π</sup>(s, a):</strong> expected return taking a in s, then following π.",
          "Optimal: V*(s) = max<sub>a</sub> Q*(s, a), and the greedy policy picks that a.",
        ],
        formula: "V<sup>π</sup>(s) = 𝔼<sub>π</sub>[G<sub>t</sub> | S<sub>t</sub> = s] &nbsp;·&nbsp; Q<sup>π</sup>(s, a) = 𝔼<sub>π</sub>[G<sub>t</sub> | S<sub>t</sub> = s, A<sub>t</sub> = a]",
        checks: [
          { q: "Q*(s, ·) = {Up: 0.4, Right: 0.9, Down: 0.1}. V*(s) and π*(s)?", options: ["0.9 and Right", "0.4 and Up", "1.4 and Right"], answer: "0.9 and Right", why: "V* is the best Q value; π* picks the action that achieves it." },
          { q: "Which one tells you how good an action is?", options: ["Q(s, a)", "V(s)"], answer: "Q(s, a)", why: "V rates states; Q rates actions in states." },
        ],
        remember: ["V* = max over Q*; π* = argmax over Q*."] },
      { id: "value-iteration", label: "Bellman & Value Iteration",
        lead: "The <strong>Bellman optimality equation</strong>: a state's best value is the best expected immediate reward plus the discounted best value of where you land.",
        points: [
          "<strong>Value Iteration</strong> applies that equation as an update to every state, sweep after sweep, until the values stop changing.",
          "It is <strong>model-based</strong>: it needs P and R.",
          "The policy is read off with a one-step lookahead (argmax).",
        ],
        formula: "V<sub>k+1</sub>(s) = max<sub>a</sub> Σ<sub>s′</sub> P(s′ | s, a) [ R(s, a, s′) + γ V<sub>k</sub>(s′) ] &nbsp;·&nbsp; π*(s) = argmax<sub>a</sub> Σ<sub>s′</sub> P [ R + γ V*(s′) ]",
        checks: [
          { q: "Deterministic move, R = −0.04, γ = 0.9, V(s′) = 1.0. Backed-up value?", options: ["0.86", "0.96", "0.90"], answer: "0.86", why: "−0.04 + 0.9 × 1.0 = 0.86." },
          { q: "Value Iteration needs…", options: ["the transition model P and rewards R", "only samples of experience"], answer: "the transition model P and rewards R", why: "That is what makes it planning, not learning by trial." },
          { q: "After convergence, π*(s) is found by…", options: ["a one-step lookahead argmax over actions", "a random choice", "the largest V in the grid"], answer: "a one-step lookahead argmax over actions", why: "Pick the action whose expected backup is largest." },
        ],
        remember: ["Values spread outward from the reward states sweep by sweep."] },
      { id: "q-learning", label: "Q-Learning & ε-Greedy",
        lead: "When P and R are unknown, the agent learns Q directly from experienced transitions (s, a, r, s′): <strong>model-free</strong> RL.",
        points: [
          "<strong>TD target</strong> = r + γ max<sub>a′</sub> Q(s′, a′); <strong>TD error</strong> δ = target − Q(s, a); move Q a fraction α toward the target.",
          "Q-learning is <strong>off-policy</strong>: its target uses the best next action, whatever action is actually taken. SARSA uses the action actually taken (on-policy).",
          "<strong>ε-greedy:</strong> explore with probability ε, otherwise take the best known action.",
        ],
        formula: "Q(s, a) ← Q(s, a) + α [ r + γ max<sub>a′</sub> Q(s′, a′) − Q(s, a) ]",
        checks: [
          { q: "Q(s, a) = 0.2, r = 0, γ = 0.9, max Q(s′, ·) = 0.6, α = 0.5. New Q(s, a)?", options: ["0.37", "0.54", "0.29"], answer: "0.37", why: "Target 0.54, δ = 0.34, 0.2 + 0.5 × 0.34 = 0.37." },
          { q: "ε = 0.1 means…", options: ["10% random actions, 90% greedy", "10% greedy actions", "learning rate 0.1"], answer: "10% random actions, 90% greedy", why: "ε is the exploration probability, not the step size α." },
          { q: "Q-learning is off-policy because its target uses…", options: ["the max over next actions, whatever is actually taken", "the action actually taken next"], answer: "the max over next actions, whatever is actually taken", why: "That second option describes SARSA." },
        ],
        remember: ["TD error = the “surprise” between expectation and experience."] },
    ] },
    { id: "compare", label: "Compare Paradigms", source: "Topic 06 lecture · Compare & Trace", subs: [
      { id: "matrix", label: "Paradigm Comparison",
        lead: "All five learn from experience; they differ in the <strong>feedback</strong> they get and how they optimise.",
        figureTitle: "Comparison table",
        figure: '<table class="ag-table ui"><thead><tr><th></th><th>Naive Bayes</th><th>Neural network</th><th>K-Means</th><th>Value Iteration</th><th>Q-Learning</th></tr></thead><tbody>' +
          "<tr><th class=\"l\">Task</th><td>classify text x → y</td><td>non-linear x → y</td><td>cluster unlabelled x</td><td>optimal policy, known MDP</td><td>policy by interaction</td></tr>" +
          "<tr><th class=\"l\">Feedback</th><td>labels y</td><td>labels y</td><td>none</td><td>known P and R</td><td>delayed reward r</td></tr>" +
          "<tr><th class=\"l\">Optimisation</th><td>counts + Laplace</td><td>gradient descent</td><td>Lloyd's algorithm</td><td>Bellman dynamic programming</td><td>TD(0) updates</td></tr>" +
          "<tr><th class=\"l\">Cost</th><td>O(N · d)</td><td>O(N · epochs · |W|)</td><td>O(N · K · d · iters)</td><td>O(|A| · |S|²) per sweep</td><td>O(1) per step</td></tr></tbody></table>",
        checks: [
          { q: "Which one needs no labels at all?", options: ["K-Means", "Naive Bayes", "Neural network"], answer: "K-Means", why: "It finds the groups itself." },
          { q: "Which learns from a delayed reward by trial and error?", options: ["Q-Learning", "Value Iteration", "Naive Bayes"], answer: "Q-Learning", why: "Value Iteration plans with a known model instead." },
          { q: "Which needs a known transition model?", options: ["Value Iteration", "Q-Learning", "K-Means"], answer: "Value Iteration", why: "Its backup sums over P(s′ | s, a)." },
          { q: "Fastest to train on text (one counting pass)?", options: ["Naive Bayes", "Neural network", "Q-Learning"], answer: "Naive Bayes", why: "Training is just counting words per class." },
          { q: "What is the main goal of reinforcement learning?", options: ["Learn a policy that maximises the expected cumulative (discounted) reward", "Predict a label for each input from labelled examples", "Group similar unlabelled points together"], answer: "Learn a policy that maximises the expected cumulative (discounted) reward", why: "The agent learns which action to take in each state so that total long-run reward is as large as possible, not just the next reward." },
          { q: "Match the method: predict house prices from size, rooms and location.", options: ["Naive Bayes", "K-Means", "Reinforcement learning", "Neural network (regression)"], answer: "Neural network (regression)", why: "Labelled examples with a numeric target → supervised regression. Naive Bayes outputs classes, K-Means has no target, RL has no reward loop here." },
          { q: "Match the method: a robot learns to navigate a maze by trial and error.", options: ["Naive Bayes", "K-Means", "Reinforcement learning", "Neural network (regression)"], answer: "Reinforcement learning", why: "No labels, only a (delayed) reward for reaching the goal → reinforcement learning (e.g. Q-learning)." },
          { q: "Match the method: group customers by purchasing behaviour (no labels).", options: ["Naive Bayes", "K-Means", "Reinforcement learning", "Neural network (regression)"], answer: "K-Means", why: "Unlabelled data to be split into groups → unsupervised clustering." },
          { q: "Match the method: classify emails as spam or ham.", options: ["Naive Bayes", "K-Means", "Reinforcement learning", "Neural network (regression)"], answer: "Naive Bayes", why: "Labelled text and a discrete class → supervised classification; Naive Bayes is the classic text baseline." },
          { q: "In RL, what is the role of the reward?", options: ["A scalar signal from the environment saying how good the last step was; the agent maximises its long-run sum", "The correct action the agent should have taken", "The agent's estimate of a state's value"], answer: "A scalar signal from the environment saying how good the last step was; the agent maximises its long-run sum", why: "The reward only scores outcomes; it never tells the agent the right action. Value estimates (V, Q) are learned from rewards." },
          { q: "In RL, which component chooses the actions?", options: ["Agent", "Environment", "State", "Reward"], answer: "Agent", why: "The agent observes the state and picks an action using its policy." },
          { q: "In RL, which component receives the action and returns the next state and reward?", options: ["Environment", "Agent", "Policy", "Action"], answer: "Environment", why: "Everything outside the agent is the environment: it reacts to the action with s′ and r." },
          { q: "Match the RL component: “the robot's current cell (row, col) in the grid”.", options: ["State", "Action", "Reward", "Environment"], answer: "State", why: "The state describes the situation the agent is in right now." },
          { q: "Match the RL component: “move North, South, East or West”.", options: ["Action", "State", "Reward", "Agent"], answer: "Action", why: "Actions are the choices available to the agent in a state." },
          { q: "Match the RL component: “+1 for reaching the goal, −0.04 per step”.", options: ["Reward", "Action", "State", "Policy"], answer: "Reward", why: "The reward is the numeric feedback for each transition." },
        ],
        remember: ["Labels → supervised. No labels → unsupervised. Reward → reinforcement."] },
    ] },
    { id: "practice", label: "Practice", source: "Worked exercises from the original reading notes", subs: [
      { id: "ex1", label: "1 · TF-IDF", exercise: true,
        problem: "Corpus of N = 3 documents: <strong>d1</strong> “win cash prize”, <strong>d2</strong> “win lottery bonus cash”, <strong>d3</strong> “team project meeting”. Compute TF(“cash”, d1), IDF(“cash”) and TF-IDF(“cash”, d1) with IDF = ln(N / DF).",
        tasks: [
          { type: "num", label: "TF(“cash”, d1)", answer: 0.3333, tol: 0.002, hint: "count in d1 ÷ number of words in d1" },
          { type: "num", label: "IDF(“cash”)", answer: 0.4055, tol: 0.002, hint: "“cash” appears in 2 of the 3 documents." },
          { type: "num", label: "TF-IDF(“cash”, d1)", answer: 0.1352, tol: 0.002 },
        ],
        steps: [
          "<strong>TF:</strong> “cash” appears once in d1, which has 3 words: TF = 1/3 ≈ <strong>0.3333</strong>.",
          "<strong>DF:</strong> “cash” appears in d1 and d2, so DF = 2; N = 3.",
          "<strong>IDF:</strong> ln(3 / 2) = ln 1.5 ≈ <strong>0.4055</strong>.",
          "<strong>TF-IDF:</strong> 0.3333 × 0.4055 ≈ <strong>0.1352</strong>.",
        ] },
      { id: "ex2", label: "2 · Naive Bayes", exercise: true,
        problem: "|V| = 6 (lottery, prize, cash, meeting, report, project). <strong>Spam</strong> (4 docs, 12 words): lottery 4, prize 4, cash 3, meeting 0, report 0, project 1; P(spam) = 0.4. <strong>Ham</strong> (6 docs, 18 words): lottery 0, prize 0, cash 1, meeting 6, report 6, project 5; P(ham) = 0.6. Classify “lottery prize” with add-1 smoothing.",
        tasks: [
          { type: "num", label: "Smoothed spam denominator", answer: 18, tol: 0, hint: "12 words + |V|" },
          { type: "num", label: "P(lottery | spam)", answer: 0.2778, tol: 0.002 },
          { type: "num", label: "P(lottery | ham)", answer: 0.0417, tol: 0.001, hint: "(0 + 1) / (18 + 6)" },
          { type: "num", label: "P(spam | “lottery prize”), in %", answer: 96.7, tol: 0.2, unit: "%", hint: "Normalise the two unnormalised scores." },
          { type: "mcq", q: "Decision?", options: ["SPAM", "HAM"], answer: "SPAM", why: "0.0309 vs 0.0010: spam wins by a wide margin despite its smaller prior." },
        ],
        steps: [
          "<strong>Denominators:</strong> spam 12 + 6 = 18; ham 18 + 6 = 24.",
          "<strong>Likelihoods:</strong> P(lottery | spam) = P(prize | spam) = 5/18 ≈ 0.2778; P(lottery | ham) = P(prize | ham) = 1/24 ≈ 0.0417.",
          "<strong>Scores:</strong> spam 0.4 × (5/18)² ≈ 0.4 × 0.07716 ≈ 0.03086; ham 0.6 × (1/24)² ≈ 0.6 × 0.001736 ≈ 0.00104.",
          "<strong>Normalise:</strong> 0.03086 / (0.03086 + 0.00104) ≈ <strong>96.7%</strong> spam → decision <strong>SPAM</strong>.",
        ] },
      { id: "ex3", label: "3 · Metrics", exercise: true,
        problem: "A spam filter is tested on 1,000 e-mails: <strong>TP = 80, FP = 20, FN = 10, TN = 890</strong>. Compute accuracy, precision, recall and F1 (as %).",
        tasks: [
          { type: "num", label: "Accuracy", answer: 97, tol: 0.1, unit: "%" },
          { type: "num", label: "Precision", answer: 80, tol: 0.1, unit: "%" },
          { type: "num", label: "Recall", answer: 88.89, tol: 0.05, unit: "%" },
          { type: "num", label: "F1-score", answer: 84.21, tol: 0.05, unit: "%", hint: "2TP / (2TP + FP + FN)" },
          { type: "mcq", q: "Why is accuracy so much higher than F1?", options: ["The 890 true negatives dominate accuracy", "There are no false positives"], answer: "The 890 true negatives dominate accuracy", why: "Most e-mails are ham, so accuracy looks great even with 20 false alarms." },
        ],
        steps: [
          "<strong>Accuracy</strong> = (80 + 890) / 1000 = <strong>97.0%</strong>",
          "<strong>Precision</strong> = 80 / (80 + 20) = <strong>80.0%</strong>",
          "<strong>Recall</strong> = 80 / (80 + 10) = 80 / 90 ≈ <strong>88.89%</strong>",
          "<strong>F1</strong> = 2 × 0.80 × 0.8889 / (0.80 + 0.8889) = 1.4222 / 1.6889 ≈ <strong>84.21%</strong> (same as 2·80 / (160 + 20 + 10) = 160 / 190).",
        ] },
      { id: "ex4", label: "4 · Perceptron Update", exercise: true,
        problem: "w = [0.2, −0.4], b = 0.1, α = 0.5, input x = [1, 2] with target y = 1. Do one step of the perceptron learning rule.",
        tasks: [
          { type: "num", label: "z = w·x + b", answer: -0.5, tol: 0.001 },
          { type: "num", label: "ŷ = step(z)", answer: 0, tol: 0 },
          { type: "num", label: "new w₁", answer: 0.7, tol: 0.001 },
          { type: "num", label: "new w₂", answer: 0.6, tol: 0.001, hint: "w₂ + α · (y − ŷ) · x₂" },
          { type: "num", label: "new b", answer: 0.6, tol: 0.001 },
        ],
        steps: [
          "<strong>Forward:</strong> z = 0.2(1) + (−0.4)(2) + 0.1 = 0.2 − 0.8 + 0.1 = <strong>−0.5</strong>, so ŷ = step(−0.5) = <strong>0</strong>.",
          "<strong>Error:</strong> y − ŷ = 1 − 0 = 1: the perceptron was wrong, so it updates.",
          "<strong>Update:</strong> w₁ = 0.2 + 0.5·1·1 = <strong>0.7</strong>; w₂ = −0.4 + 0.5·1·2 = <strong>0.6</strong>; b = 0.1 + 0.5·1 = <strong>0.6</strong>.",
          "<strong>Check:</strong> new z = 0.7 + 1.2 + 0.6 = 2.5 ≥ 0, so x is now classified correctly.",
        ] },
      { id: "ex5", label: "5 · K-Means Step", exercise: true,
        problem: "Points <strong>A(1, 1), B(2, 1), C(4, 5), D(5, 5)</strong>; initial centroids <strong>μ₁ = (1, 2)</strong>, <strong>μ₂ = (5, 4)</strong>. Assign each point and compute the new centroids.",
        tasks: [
          { type: "num", label: "Squared distance from B to μ₁", answer: 2, tol: 0 },
          { type: "num", label: "Squared distance from B to μ₂", answer: 18, tol: 0 },
          { type: "mcq", q: "Clusters after the assignment step?", options: ["{A, B} and {C, D}", "{A} and {B, C, D}", "{A, B, C} and {D}"], answer: "{A, B} and {C, D}", why: "A and B are much closer to μ₁; C and D to μ₂." },
          { type: "mcq", q: "New centroids?", options: ["μ₁ = (1.5, 1.0), μ₂ = (4.5, 5.0)", "μ₁ = (1, 2), μ₂ = (5, 4)", "μ₁ = (3, 3), μ₂ = (3, 3)"], answer: "μ₁ = (1.5, 1.0), μ₂ = (4.5, 5.0)", why: "Each centroid moves to the mean of its points." },
        ],
        steps: [
          "<strong>A(1, 1):</strong> to μ₁ = 0 + 1 = 1; to μ₂ = 16 + 9 = 25 → cluster 1.",
          "<strong>B(2, 1):</strong> to μ₁ = 1 + 1 = 2; to μ₂ = 9 + 9 = 18 → cluster 1.",
          "<strong>C(4, 5):</strong> to μ₁ = 9 + 9 = 18; to μ₂ = 1 + 1 = 2 → cluster 2.",
          "<strong>D(5, 5):</strong> to μ₁ = 16 + 9 = 25; to μ₂ = 0 + 1 = 1 → cluster 2.",
          "<strong>Update:</strong> μ₁ = mean(A, B) = <strong>(1.5, 1.0)</strong>; μ₂ = mean(C, D) = <strong>(4.5, 5.0)</strong>.",
        ] },
      { id: "ex6", label: "6 · Bellman Backup", exercise: true,
        problem: "AIMA 4×3 grid. State (3, 3) is next to the +1 goal (4, 3). Living reward R = −0.04, γ = 0.99. Current values: V(3, 3) = 0.70, V(3, 2) = 0.65. Moves succeed with 0.8 and slip sideways with 0.1 each. Compute the value of action <strong>Right</strong> from (3, 3).",
        tasks: [
          { type: "num", label: "Expected next-state value E[V(s′)]", answer: 0.935, tol: 0.001, hint: "0.8 → goal (1.0), 0.1 → bump the north wall and stay (0.70), 0.1 → south to (3, 2) (0.65)" },
          { type: "num", label: "Q((3, 3), Right) = R + γ · E[V(s′)]", answer: 0.88565, tol: 0.0005 },
        ],
        steps: [
          "<strong>Outcomes of Right:</strong> 0.8 reach the goal (value 1.0); 0.1 slip north into the wall and stay at (3, 3) (0.70); 0.1 slip south to (3, 2) (0.65).",
          "<strong>Expected value:</strong> 0.8(1.0) + 0.1(0.70) + 0.1(0.65) = 0.800 + 0.070 + 0.065 = <strong>0.935</strong>.",
          "<strong>Backup:</strong> −0.04 + 0.99 × 0.935 = −0.04 + 0.92565 = <strong>0.88565</strong>.",
        ] },
      { id: "ex7", label: "7 · Q-Learning Update", exercise: true,
        problem: "In state (3, 3) the agent has Q((3, 3), Right) = 0.50. It takes <strong>Right</strong>, reaches the terminal +1 goal and receives <strong>r = +1.0</strong>. Terminal states have Q = 0. With α = 0.2 and γ = 0.99, compute the TD target, the TD error δ and the new Q((3, 3), Right).",
        tasks: [
          { type: "num", label: "TD target", answer: 1.0, tol: 0.001, hint: "r + γ · max Q(terminal, ·), and Q(terminal, ·) = 0" },
          { type: "num", label: "TD error δ", answer: 0.5, tol: 0.001 },
          { type: "num", label: "new Q((3, 3), Right)", answer: 0.6, tol: 0.001 },
        ],
        steps: [
          "<strong>TD target:</strong> r + γ · max<sub>a′</sub> Q(goal, a′) = 1.0 + 0.99 × 0 = <strong>1.00</strong>.",
          "<strong>TD error:</strong> δ = 1.00 − 0.50 = <strong>+0.50</strong>: the outcome was better than expected.",
          "<strong>Update:</strong> Q ← 0.50 + 0.2 × 0.50 = <strong>0.60</strong>. Q moves only a fraction α of the way toward the target.",
        ] },
    ] },
  ];
  root.READING_NOTES = { tabs: TABS };
})(typeof window !== "undefined" ? window : globalThis);
