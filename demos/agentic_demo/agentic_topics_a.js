/*
  MLAI401 — Topic 07 demos, part A: Big picture, Topic 0 (From RL to
  Agents), Topic 1 (LLMs & Decoding), Topic 2 (Retrieval / RAG).
  Registered on window.AgenticPage (agentic_page.js).
*/
(function () {
  "use strict";
  const P = window.AgenticPage;
  if (!P) return;
  const K = P.K, esc = K.esc, fx = K.fx;

  // =================================================================
  // Big picture: four cards, one per layer added around the same model.
  // =================================================================
  const BP = [
    { t: "llm", s: "next-token", title: "LLM", rule: "context → P(next token)", flow: ["prompt", "LLM", "text"],
      foot: "Writes one token at a time. Knows only its training data." },
    { t: "rag", s: "rag-pipeline", title: "+ Retrieval (RAG)", rule: "query → top-K chunks → prompt", flow: ["query", "vector DB", "LLM"],
      foot: "Answers from your documents, with citations." },
    { t: "agents", s: "react", title: "+ Tools & loop (Agent)", rule: "Thought → Action → Observation", flow: ["LLM", "tool", "observe"],
      foot: "Acts in the world and replans from what it observes." },
    { t: "agents", s: "multi-agent", title: "+ Other agents (Team)", rule: "Planner → Coder → Critic", flow: ["plan", "build", "review"],
      foot: "Specialised agents check each other's work." },
  ];
  P.registerBigPicture(function (el, go) {
    if (!el) return;
    el.innerHTML = BP.map(function (c, i) {
      return '<div class="ag-card is-click" tabindex="0" role="button" data-bp="' + i + '"><h3 class="ag-card-title">' + esc(c.title) + '</h3><p class="ag-card-rule"><code>' + esc(c.rule) + "</code></p>" +
        flowSvg(c.flow, i) + '<p class="ag-card-foot">' + esc(c.foot) + ' <strong style="color:var(--ag-primary)">Open &rarr;</strong></p></div>';
    }).join("");
    K.on(el, "[data-bp]", "click", function (n) { const c = BP[+n.getAttribute("data-bp")]; go(c.t, c.s); });
    K.on(el, "[data-bp]", "keydown", function (n, e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); const c = BP[+n.getAttribute("data-bp")]; go(c.t, c.s); } });
  });
  function flowSvg(nodes, idx) {
    const w = 250, h = 70, bw = 66;
    const loop = idx >= 2;
    let s = '<svg class="ag-svg" viewBox="0 0 ' + w + " " + h + '" role="img" aria-label="' + esc(nodes.join(" to ")) + '"><defs><marker id="bpa' + idx + '" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="#7c3aed"/></marker></defs>';
    nodes.forEach(function (n, i) {
      const x = 10 + i * 84;
      const hl = (idx === 0 && i === 1) || (idx === 1 && i === 1) || (idx === 2 && i === 1) || idx === 3;
      s += '<rect x="' + x + '" y="' + (loop ? 8 : 20) + '" width="' + bw + '" height="28" rx="6" fill="' + (hl ? "#f1ebfe" : "#fff") + '" stroke="' + (hl ? "#6d28d9" : "#cbd2e0") + '" stroke-width="2"/>' +
        '<text x="' + (x + bw / 2) + '" y="' + ((loop ? 8 : 20) + 18) + '" text-anchor="middle" font-size="11" font-weight="700" fill="#1e1b4b">' + esc(n) + "</text>";
      if (i < nodes.length - 1) s += '<line x1="' + (x + bw) + '" y1="' + ((loop ? 8 : 20) + 14) + '" x2="' + (x + 84 - 2) + '" y2="' + ((loop ? 8 : 20) + 14) + '" stroke="#7c3aed" stroke-width="2" marker-end="url(#bpa' + idx + ')"/>';
    });
    if (loop) s += '<path d="M 211 36 Q 211 62 125 62 Q 43 62 43 38" fill="none" stroke="#7c3aed" stroke-width="2" stroke-dasharray="4 3" marker-end="url(#bpa' + idx + ')"/><text x="125" y="58" text-anchor="middle" font-size="9" fill="#6d28d9" font-weight="700">' + (idx === 2 ? "replan" : "feedback") + "</text>";
    return s + "</svg>";
  }

  // =================================================================
  // Topic 0: From RL to Agents
  // =================================================================
  const STAGES = [
    { id: "search", name: "Search", topic: "Topic 02", decides: "Expand the frontier node with the best f(n)", knows: "Hand-written states, actions, goal test", learn: "Nothing is learned", ex: "A* finds a path in the maze", limit: "Someone must formulate the problem first" },
    { id: "logic", name: "Logic", topic: "Topic 05", decides: "Apply inference rules to the KB", knows: "Facts and rules written by experts", learn: "Nothing is learned", ex: "Wumpus world: deduce the safe squares", limit: "Brittle when rules are missing or wrong" },
    { id: "prob", name: "Probability", topic: "Topic 05", decides: "Pick the most probable belief", knows: "A Bayes net with hand-set CPTs", learn: "Counts can fill the CPTs", ex: "P(burglary | alarm)", limit: "Variables are fixed in advance" },
    { id: "ml", name: "Machine Learning", topic: "Topic 06", decides: "Classify an input: ŷ = f(x; w)", knows: "Weights w fitted to labelled data", learn: "w from data", ex: "Naive Bayes spam filter", limit: "One task per model; no actions" },
    { id: "rl", name: "Reinforcement Learning", topic: "Topic 06", decides: "a = π(s), the action with best Q(s, a)", knows: "Q-table learned from reward", learn: "π from trial and error", ex: "Grid world agent reaches +1", limit: "One closed world; retrain for a new one" },
    { id: "agent", name: "Agentic AI", topic: "Topic 07", decides: "An LLM writes the next Thought and Action", knows: "Pretrained on text + tools + retrieved docs + memory", learn: "Pretraining once; new tasks by prompting", ex: "Research a question, run code, save a report", limit: "Can hallucinate or take unsafe actions (Topic 5)" },
  ];
  P.register("evolution", function () {
    const el = K.single("Pick a stage. Each row asks the same questions: who decides the next step, where does its knowledge come from, and what is learned?");
    const S = { pick: "agent" };
    const qz = K.quiz([
      { q: "Which part of the RL loop does an LLM agent keep?", options: ["The perceive → act → observe loop", "The Q-table", "The reward function"], answer: "The perceive → act → observe loop", why: "The loop stays; the learned Q-table is replaced by a model that decides in words." },
      { q: "A new task arrives. What does an agent need?", options: ["Retrain the weights", "A new prompt and the right tools", "A new state space"], answer: "A new prompt and the right tools", why: "Foundation models are reused: we change the instructions and tools, not the weights." },
    ], "ev");
    function paint() {
      const st = STAGES.find(function (x) { return x.id === S.pick; }), ag = STAGES[5];
      el.innerHTML =
        '<div class="ag-flow">' + STAGES.map(function (x, i) {
          return (i ? '<span class="ag-flow-arrow">&rarr;</span>' : "") + '<button type="button" class="ag-flow-node' + (x.id === S.pick ? " is-active" : "") + '" data-ev="' + x.id + '" style="cursor:pointer"><b>' + x.name + "</b>" + x.topic + "</button>";
        }).join("") + "</div>" +
        '<div class="ag-split even" style="margin-top:12px">' +
          '<table class="ag-table ui"><thead><tr><th></th><th>' + esc(st.name) + "</th>" + (st.id !== "agent" ? "<th>Agentic AI</th>" : "") + "</tr></thead><tbody>" +
          [["Who decides the next step?", "decides"], ["Knowledge comes from", "knows"], ["What is learned", "learn"], ["Example", "ex"], ["Main limit", "limit"]].map(function (r) {
            return "<tr><th class=\"l\">" + r[0] + "</th><td>" + esc(st[r[1]]) + "</td>" + (st.id !== "agent" ? "<td>" + esc(ag[r[1]]) + "</td>" : "") + "</tr>";
          }).join("") + "</tbody></table>" +
          "<div>" + K.explain(st.id === "agent"
            ? "The <strong>foundation model</strong> is a general reasoning engine. We do not train it per task; we give it <strong>instructions, tools, retrieved documents and memory</strong>, and run it in a loop."
            : "<strong>" + esc(st.name) + "</strong> solves one well-defined problem. Agentic AI keeps the agent loop from Topic 01 but lets a language model choose actions for open-ended goals.") +
          '<div style="margin-top:10px">' + K.formula("Classical AI: hand-written rules &rarr; ML: data &rarr; w &rarr; Agentic: foundation model + tools + loop") + "</div></div></div>" +
        '<div class="ag-grid3" style="grid-template-columns:repeat(2,minmax(0,1fr))">' + qz.html() + "</div>" +
        (qz.done() ? K.remember(["Every stage is an agent choosing actions; only the decision-maker changes.", "An LLM agent = pretrained model + prompt + tools + memory + loop.", "No retraining per task: new behaviour comes from new instructions and tools."]) : "");
      K.on(el, "[data-ev]", "click", function (n) { S.pick = n.getAttribute("data-ev"); paint(); });
      qz.bind(el, paint);
    }
    paint();
  });

  // ---- Chatbot vs. Agent ----
  const AGENT_STEPS = [
    { k: "thought", txt: "To plan dinner for 4 I first need to know what is already in the kitchen." },
    { k: "action", txt: "check_fridge()" },
    { k: "obs", txt: '{"pasta_g": 200, "tomatoes": 2, "garlic": true}' },
    { k: "thought", txt: "Pasta for 4 needs about 400 g and 6 tomatoes. I am short 200 g pasta and 4 tomatoes." },
    { k: "action", txt: 'order_groceries(["pasta 500 g", "tomatoes x4"])' },
    { k: "obs", txt: '{"order": 812, "arrives": "17:30"}' },
    { k: "thought", txt: "Dinner is at 19:00, so water should boil at 18:30." },
    { k: "action", txt: 'set_timer("18:30", "Boil water for pasta")' },
    { k: "obs", txt: '{"timer": "set"}' },
    { k: "final", txt: "Ordered the missing pasta and tomatoes (arrive 17:30) and set a timer for 18:30. Recipe below." },
  ];
  P.register("chat-vs-agent", function () {
    const el = K.single("Same request, two systems. The chatbot answers once. The agent perceives, acts, observes and replans.");
    const st = K.stepper(paint, 1100);
    st.n = AGENT_STEPS.length + 1;
    const qz = K.quiz([
      { q: "“Here is a pasta recipe for four people.”", options: ["Chatbot", "Agent"], answer: "Chatbot", why: "Text in, text out: nothing in the world changed." },
      { q: "Calls check_fridge() and reads the result", options: ["Chatbot", "Agent"], answer: "Agent", why: "It perceives the environment through a tool." },
      { q: "Notices the order failed and tries another shop", options: ["Chatbot", "Agent"], answer: "Agent", why: "Recovering from an observation is replanning." },
    ], "cva");
    function paint() {
      const shown = AGENT_STEPS.slice(0, st.idx);
      const nTools = shown.filter(function (s) { return s.k === "action"; }).length;
      el.innerHTML = st.toolbar() +
        '<div class="ag-split even">' +
          '<div class="ag-panel"><div class="ag-panel-title">Chatbot: x &rarr; y</div>' +
            '<div class="ag-log"><div class="ag-log-item user"><span class="ag-tag token">user</span>I want to cook pasta for 4 tonight.</div>' +
            (st.idx > 0 ? '<div class="ag-log-item final">Here is a recipe: 400 g pasta, 6 tomatoes, 2 garlic cloves&hellip; Boil the pasta for 10 minutes.</div>' : "") + "</div>" +
            '<div class="ag-meter" style="margin-top:8px"><span class="ag-prop">LLM calls <strong>' + (st.idx > 0 ? 1 : 0) + '</strong></span><span class="ag-prop is-no">tools <strong>0</strong></span><span class="ag-prop is-no">changes the world <strong>no</strong></span></div></div>' +
          '<div class="ag-panel"><div class="ag-panel-title">Agent: goal &rarr; &lang;plan, act, observe, replan&rang;</div>' +
            '<div class="ag-log"><div class="ag-log-item user"><span class="ag-tag token">user</span>I want to cook pasta for 4 tonight.</div>' +
            shown.map(function (s, i) { return logItem(s, i === shown.length - 1); }).join("") + "</div>" +
            '<div class="ag-meter" style="margin-top:8px"><span class="ag-prop">LLM calls <strong>' + shown.filter(function (s) { return s.k === "thought"; }).length + '</strong></span><span class="ag-prop ' + (nTools ? "is-yes" : "") + '">tools <strong>' + nTools + '</strong></span><span class="ag-prop ' + (nTools >= 2 ? "is-yes" : "") + '">changes the world <strong>' + (nTools >= 2 ? "yes" : "no") + "</strong></span></div></div>" +
        "</div>" +
        K.explain(st.idx === 0 ? "Press <strong>Next Step</strong>. Both start from the same message." :
          st.idx >= st.n - 1 ? "The chatbot wrote a recipe. The agent <strong>checked the fridge, ordered food and set a timer</strong>: it closed the loop with the world." :
          AGENT_STEPS[st.idx - 1].k === "obs" ? "An <strong>observation</strong> comes back from the tool. The next thought uses it as evidence." :
          AGENT_STEPS[st.idx - 1].k === "action" ? "The model only writes the call. The <strong>runtime</strong> executes it." :
          "A <strong>thought</strong>: the model reasons about the goal and the scratchpad before acting.") +
        '<div class="ag-grid3">' + qz.html() + "</div>" +
        (qz.done() ? K.remember(["Chatbot: one prompt, one answer, no side effects.", "Agent: perceives (tools), decides (LLM), acts (tools), observes, repeats until the goal is met.", "Same model inside; the loop and the tools make it an agent."]) : "");
      st.bind(el);
      qz.bind(el, paint);
    }
    paint();
  });
  function logItem(s, isNew) {
    const tag = { thought: ["thought", "Thought"], action: ["action", "Action"], obs: ["obs", "Observation"], final: ["final", "Final answer"], err: ["guard", "Error"], user: ["token", "user"] }[s.k];
    return '<div class="ag-log-item ' + (s.k === "err" ? "err" : s.k) + (isNew ? " is-new" : "") + '"><span class="ag-tag ' + tag[0] + '">' + tag[1] + "</span>" + esc(s.txt) + "</div>";
  }
  P.K.logItem = logItem;

  // ---- Which system is it? ----
  P.register("which-system", function () {
    const el = K.single("For each request choose the simplest system that can do it well. Simpler systems are cheaper, faster and safer.");
    const opts = ["Plain LLM", "RAG", "Single agent", "Multi-agent"];
    const qz = K.quiz([
      { q: "Write a birthday poem for my grandmother.", options: opts, answer: "Plain LLM", why: "Creative text, no private facts, no actions." },
      { q: "Answer staff questions from the 300-page HR handbook, citing the page.", options: opts, answer: "RAG", why: "Private documents + citations: retrieve the right chunks, then answer." },
      { q: "Find the cheapest flight next Friday, check my calendar, and hold a seat.", options: opts, answer: "Single agent", why: "Several tool calls in sequence, each depending on the last observation." },
      { q: "Build a small web app: one model plans, one writes code, one tests and reviews.", options: opts, answer: "Multi-agent", why: "Separate roles that hand work to each other and critique it." },
      { q: "Summarise the paragraph I pasted.", options: opts, answer: "Plain LLM", why: "Everything needed is already in the prompt." },
      { q: "What did our Q3 policy memo say about remote work?", options: opts, answer: "RAG", why: "A fact that lives in a private document the model never saw." },
    ], "ws");
    function paint() {
      el.innerHTML = '<div class="ag-grid3">' + qz.html() + "</div>" +
        (qz.done() ? K.status(qz.score() >= 5 ? "is-right" : "is-ask", "Score: <strong>" + qz.score() + " / 6</strong>") +
          K.remember(["Needs only the prompt → plain LLM.", "Needs facts from documents → RAG.", "Needs actions and observations → agent.", "Needs separate roles that check each other → multi-agent."]) : "");
      qz.bind(el, paint);
    }
    paint();
  });

  // =================================================================
  // Topic 1: LLMs & Decoding
  // =================================================================
  // A tiny "language model": logits for the next token given the last
  // token (a bigram table). Enough to show autoregressive generation.
  const LM = {
    "<s>": { The: 3.0, An: 1.6, Agents: 1.2 },
    The: { agent: 2.6, model: 2.0, robot: 1.6, cat: 1.0 },
    An: { agent: 2.8, answer: 1.6, robot: 1.2 },
    Agents: { plan: 2.4, call: 1.8, observe: 1.2 },
    agent: { calls: 2.4, plans: 2.1, observes: 1.5, sat: 0.2 },
    model: { predicts: 2.9, plans: 1.1, calls: 0.8 },
    robot: { plans: 1.8, calls: 1.4, sat: 1.1, observes: 1.0 },
    cat: { sat: 3.2, plans: 0.3, calls: 0.1 },
    answer: { ".": 2.0, and: 1.0 },
    plan: { ".": 2.0, and: 1.4 },
    call: { a: 2.6, the: 1.5 },
    observe: { the: 2.4, a: 1.2 },
    calls: { a: 2.6, the: 1.7 },
    plans: { a: 2.1, the: 1.8, ".": 1.0 },
    observes: { the: 2.5, a: 1.2 },
    predicts: { the: 2.3, a: 1.4 },
    sat: { on: 3.0, ".": 1.2 },
    on: { the: 3.0, a: 1.5 },
    the: { tool: 1.9, result: 2.2, mat: 1.0, goal: 1.6 },
    a: { tool: 2.6, plan: 1.5, result: 1.7 },
    tool: { ".": 2.4, and: 1.2 },
    result: { ".": 2.4, and: 1.1 },
    goal: { ".": 2.3, and: 1.0 },
    mat: { ".": 2.8 },
    and: { observes: 1.7, plans: 1.5, the: 1.0 },
  };
  P.register("next-token", function () {
    const el = K.single("The model never writes a sentence at once. It predicts a distribution over the next token, one token is chosen and appended, and the longer context is fed back in.");
    const S = { seq: ["<s>"], logp: [], T: 1.0, seed: 7, rand: K.rng(7) };
    function dist() {
      const last = S.seq[S.seq.length - 1], row = LM[last];
      if (!row) return null;
      const toks = Object.keys(row), ps = K.softmaxT(toks.map(function (t) { return row[t]; }), S.T);
      return toks.map(function (t, i) { return [t, ps[i], row[t]]; }).sort(function (a, b) { return b[1] - a[1]; });
    }
    function choose(tok, p) { S.seq.push(tok); S.logp.push(p); paint(); }
    function paint() {
      const d = dist();
      const ended = !d;
      const words = S.seq.slice(1);
      const prod = S.logp.reduce(function (a, p) { return a * p; }, 1);
      el.innerHTML =
        '<div class="ag-ops"><button type="button" class="ag-tbtn ag-tbtn-primary" data-nt="greedy"' + (ended ? " disabled" : "") + '>Greedy (argmax)</button>' +
          '<button type="button" class="ag-tbtn" data-nt="sample"' + (ended ? " disabled" : "") + '>Sample</button>' +
          '<button type="button" class="ag-tbtn" data-nt="auto"' + (ended ? " disabled" : "") + '>Sample to the end</button>' +
          '<button type="button" class="ag-tbtn" data-nt="undo"' + (words.length ? "" : " disabled") + '>Undo</button>' +
          '<button type="button" class="ag-tbtn" data-nt="reset">&#8635; Reset</button>' +
          '<label class="ag-slider" style="margin-left:auto">T <input type="range" min="0.1" max="2" step="0.1" value="' + S.T + '" data-nt-t><output>' + fx(S.T, 1) + "</output></label></div>" +
        '<div class="ag-seq">' + '<span class="ag-chip">&lt;s&gt;</span>' + words.map(function (w, i) { return '<span class="ag-chip ' + (i === words.length - 1 ? "new" : "token") + '">' + esc(w) + "</span>"; }).join(" ") +
          (ended ? ' <span class="ag-tag final">end</span>' : ' <span class="ag-chip" style="border-style:dashed">?</span>') + "</div>" +
        '<div class="ag-split">' +
          "<div>" + (ended ? K.status("is-right", "The model produced <code>.</code> &mdash; generation stops at an end token.")
            : '<div class="ag-row-label" style="margin-bottom:6px">P(next | &hellip; ' + esc(S.seq[S.seq.length - 1]) + ") &mdash; click a bar to choose it yourself</div>" +
              K.bars(d.map(function (r, i) { return { label: r[0], p: r[1], cls: "is-click" + (i === 0 ? " is-pick" : ""), attr: ' data-nt-pick="' + esc(r[0]) + '" data-p="' + r[1] + '"' }; }), { max: 1 })) + "</div>" +
          "<div>" + K.formula("P(w<sub>1</sub>, &hellip;, w<sub>T</sub>) = &prod;<sub>t</sub> P(w<sub>t</sub> | w<sub>&lt;t</sub>)") +
            '<table class="ag-table" style="margin-top:8px"><thead><tr><th class="l">t</th><th class="l">token</th><th>P(w<sub>t</sub> | w<sub>&lt;t</sub>)</th></tr></thead><tbody>' +
            words.map(function (w, i) { return "<tr><td class=\"l\">" + (i + 1) + "</td><td class=\"l\">" + esc(w) + "</td><td>" + fx(S.logp[i], 3) + "</td></tr>"; }).join("") +
            '<tr class="is-hl"><td class="l" colspan="2">product</td><td>' + (words.length ? fx(prod, 4) : "1") + "</td></tr></tbody></table></div></div>" +
        K.explain(words.length === 0 ? "Context is just the start token. The bars are the model's softmax over the vocabulary. <strong>Greedy</strong> always takes the tallest bar; <strong>Sample</strong> rolls a die weighted by the bars."
          : ended ? "Each probability was conditioned on everything before it. Multiplying them gives the probability of the whole sentence &mdash; it shrinks with every token."
          : "<code>" + esc(words[words.length - 1]) + "</code> was appended. The next distribution is conditioned on the new last token. (A real LLM conditions on the whole context window through attention; this toy looks only at the last token.)") +
        K.remember(["Autoregressive: predict one token, append it, repeat.", "Greedy decoding is repeatable but can be dull; sampling adds variety.", "The sentence probability is the product of the per-token probabilities."]);
      K.on(el, "[data-nt-pick]", "click", function (n) { choose(n.getAttribute("data-nt-pick"), +n.getAttribute("data-p")); });
      K.on(el, "[data-nt]", "click", function (n) {
        const a = n.getAttribute("data-nt");
        if (a === "reset") { S.seq = ["<s>"]; S.logp = []; S.rand = K.rng(S.seed); paint(); return; }
        if (a === "undo") { S.seq.pop(); S.logp.pop(); paint(); return; }
        const sampleOnce = function () {
          const dd = dist(); if (!dd) return false;
          if (a === "greedy") { S.seq.push(dd[0][0]); S.logp.push(dd[0][1]); return true; }
          let r = S.rand(), c = 0;
          for (let i = 0; i < dd.length; i++) { c += dd[i][1]; if (r <= c || i === dd.length - 1) { S.seq.push(dd[i][0]); S.logp.push(dd[i][1]); break; } }
          return true;
        };
        if (a === "auto") { let g = 0; while (dist() && g++ < 14) sampleOnce(); }
        else sampleOnce();
        paint();
      });
      K.on(el, "[data-nt-t]", "input", function (n) { S.T = +n.value; paint(); });
    }
    paint();
  });

  // ---- Temperature ----
  const TEMP_TOKS = ["agent", "model", "robot", "cat", "banana"], TEMP_Z = [3.0, 2.0, 1.5, 0.5, -1.0];
  P.register("temperature", function () {
    const el = K.single("Temperature divides the raw scores (logits) before the softmax. Drag T and watch the same scores become a spike or a flat spread.");
    const S = { T: 1.0, counts: null, rand: K.rng(11) };
    const qz = K.quiz([
      { q: "T → 0. Which token is produced?", options: ["agent, every time", "a random one", "banana"], answer: "agent, every time", why: "Dividing by a tiny T makes the gaps huge: the softmax becomes argmax (greedy)." },
      { q: "T = 2. What happens to P(banana)?", options: ["It grows", "It shrinks", "It stays the same"], answer: "It grows", why: "A large T shrinks every logit gap, so unlikely tokens get more mass." },
    ], "tmp");
    function paint() {
      const ps = K.softmaxT(TEMP_Z, S.T), H = K.entropy(ps);
      const ex = TEMP_Z.map(function (z) { return Math.exp(z / S.T); }), sum = ex.reduce(function (a, b) { return a + b; }, 0);
      el.innerHTML =
        '<div class="ag-ops"><label class="ag-slider" style="flex:1">Temperature T <input type="range" min="0.05" max="2" step="0.05" value="' + S.T + '" data-tp><output>' + fx(S.T, 2) + "</output></label>" +
          [0.2, 1.0, 2.0].map(function (t) { return '<button type="button" class="ag-tbtn' + (Math.abs(S.T - t) < 1e-9 ? " is-on" : "") + '" data-tp-set="' + t + '">T = ' + t + "</button>"; }).join("") +
          '<button type="button" class="ag-tbtn" data-tp-sample>Sample &times;20</button></div>' +
        '<div class="ag-split">' +
          "<div>" + K.bars(TEMP_TOKS.map(function (t, i) { return { label: t, p: ps[i], cls: i === 0 ? "is-pick" : "" }; }), { max: 1 }) +
            '<div class="ag-meter" style="margin-top:10px"><span class="ag-prop">entropy H <strong>' + fx(H, 2) + ' bits</strong></span><span class="ag-prop">max possible <strong>' + fx(Math.log2(5), 2) + ' bits</strong></span>' +
            '<span class="ag-prop ' + (S.T < 0.5 ? "is-yes" : S.T > 1.3 ? "is-no" : "") + '"><strong>' + (S.T < 0.5 ? "focused / repeatable" : S.T > 1.3 ? "creative / risky" : "balanced") + "</strong></span></div>" +
            (S.counts ? '<div style="margin-top:10px"><div class="ag-row-label">20 samples at T = ' + fx(S.counts.T, 2) + "</div>" + '<div class="ag-seq" style="line-height:1.8">' + S.counts.seq.map(function (t) { return '<span class="ag-chip token">' + t + "</span>"; }).join("") + "</div></div>" : "") +
          "</div>" +
          "<div>" + K.formula("P(w<sub>i</sub>) = exp(z<sub>i</sub> / T) / &Sigma;<sub>j</sub> exp(z<sub>j</sub> / T)") +
            '<table class="ag-table" style="margin-top:8px"><thead><tr><th class="l">token</th><th>z</th><th>z / T</th><th>exp(z / T)</th><th>P</th></tr></thead><tbody>' +
            TEMP_TOKS.map(function (t, i) { return "<tr" + (i === 0 ? ' class="is-hl"' : "") + '><td class="l">' + t + "</td><td>" + fx(TEMP_Z[i], 1) + "</td><td>" + fx(TEMP_Z[i] / S.T, 2) + "</td><td>" + (ex[i] > 1e5 ? ex[i].toExponential(2) : fx(ex[i], 3)) + "</td><td>" + fx(ps[i], 3) + "</td></tr>"; }).join("") +
            '<tr><td class="l">sum</td><td></td><td></td><td>' + (sum > 1e5 ? sum.toExponential(2) : fx(sum, 3)) + "</td><td>1.000</td></tr></tbody></table></div></div>" +
        '<div class="ag-grid3" style="grid-template-columns:repeat(2,minmax(0,1fr))">' + qz.html() + "</div>" +
        K.remember(["T &lt; 1 sharpens the distribution; T &gt; 1 flattens it; T = 1 is the plain softmax.", "Use low T for facts, code and tool calls; higher T for brainstorming.", "Temperature never changes the order of the tokens, only how far apart their probabilities are."]);
      K.on(el, "[data-tp]", "input", function (n) { S.T = +n.value; paint(); });
      K.on(el, "[data-tp-set]", "click", function (n) { S.T = +n.getAttribute("data-tp-set"); paint(); });
      K.on(el, "[data-tp-sample]", "click", function () {
        const seq = [];
        for (let k = 0; k < 20; k++) { let r = S.rand(), c = 0; for (let i = 0; i < ps.length; i++) { c += ps[i]; if (r <= c || i === ps.length - 1) { seq.push(TEMP_TOKS[i]); break; } } }
        S.counts = { T: S.T, seq: seq }; paint();
      });
      qz.bind(el, paint);
    }
    paint();
  });

  // ---- Top-k & Top-p ----
  const KP_CTX = {
    peaked: { label: "“The capital of France is …”", toks: ["Paris", "Lyon", "a", "the", "located", "beautiful"], z: [6.0, 2.4, 2.0, 1.6, 1.2, 0.8] },
    flat: { label: "“My favourite colour is …”", toks: ["blue", "green", "red", "purple", "black", "yellow"], z: [1.3, 1.15, 1.05, 0.9, 0.75, 0.6] },
  };
  P.register("top-k-p", function () {
    const el = K.single("After the softmax, a truncation filter removes the long tail before sampling. Compare a fixed count (Top-k) with a fixed probability mass (Top-p).");
    const S = { ctx: "peaked", mode: "p", k: 3, p: 0.9 };
    function paint() {
      const c = KP_CTX[S.ctx], ps = K.softmaxT(c.z, 1);
      const sorted = c.toks.map(function (t, i) { return [t, ps[i]]; }).sort(function (a, b) { return b[1] - a[1]; });
      const kept = K.topKP(c.toks, ps, S.mode === "k" ? S.k : null, S.mode === "p" ? S.p : null);
      const keptSet = {}; kept.forEach(function (x) { keptSet[x[0]] = x[1]; });
      let cum = 0;
      el.innerHTML =
        K.pillRow([["peaked", "Obvious next token"], ["flat", "Open-ended"]], S.ctx, "data-kp-ctx", "Context:") +
        K.pillRow([["k", "Top-k"], ["p", "Top-p (nucleus)"]], S.mode, "data-kp-mode", "Filter:") +
        '<div class="ag-ops">' + (S.mode === "k"
          ? '<label class="ag-slider" style="flex:1">k <input type="range" min="1" max="6" step="1" value="' + S.k + '" data-kp-k><output>' + S.k + "</output></label>"
          : '<label class="ag-slider" style="flex:1">p <input type="range" min="0.1" max="1" step="0.05" value="' + S.p + '" data-kp-p><output>' + fx(S.p, 2) + "</output></label>") + "</div>" +
        '<div class="ag-split">' +
          '<div><div class="ag-row-label" style="margin-bottom:6px">' + c.label + "</div>" +
            K.bars(sorted.map(function (r) { return { label: r[0], p: r[1], cls: keptSet[r[0]] === undefined ? "is-out" : "" }; }), { max: 1 }) +
            '<div class="ag-meter" style="margin-top:10px"><span class="ag-prop">kept <strong>' + kept.length + " of " + sorted.length + '</strong></span><span class="ag-prop">mass kept <strong>' +
              fx(sorted.filter(function (r) { return keptSet[r[0]] !== undefined; }).reduce(function (a, r) { return a + r[1]; }, 0), 3) + "</strong></span></div></div>" +
          "<div>" + K.formula(S.mode === "k" ? "V<sup>(k)</sup> = the k tokens with the largest P" : "V<sup>(p)</sup> = smallest set with &Sigma;<sub>i&isin;V</sub> P(w<sub>i</sub>) &ge; p") +
            '<table class="ag-table" style="margin-top:8px"><thead><tr><th class="l">token</th><th>P</th><th>cumulative</th><th>after renormalising</th></tr></thead><tbody>' +
            sorted.map(function (r) { cum += r[1]; const k = keptSet[r[0]]; return "<tr" + (k === undefined ? ' class="is-out"' : "") + '><td class="l">' + r[0] + "</td><td>" + fx(r[1], 3) + "</td><td>" + fx(cum, 3) + "</td><td>" + (k === undefined ? "0" : fx(k, 3)) + "</td></tr>"; }).join("") +
            "</tbody></table></div></div>" +
        K.explain(S.mode === "p"
          ? (S.ctx === "peaked" ? "When one token is obvious, the nucleus is tiny: <strong>Paris</strong> alone may already pass p. Top-p adapts and avoids silly tail tokens."
             : "When many tokens are reasonable, the nucleus grows to keep them all. Switch to <strong>Top-k</strong>: a fixed k would cut good colours here, but keep junk in the peaked case.")
          : "Top-k keeps exactly k tokens whatever the shape. Try k = 3 in both contexts and compare how much probability mass is thrown away.") +
        K.remember(["Top-k: fixed number of candidates.", "Top-p: fixed probability mass; the candidate count adapts to the context.", "Kept probabilities are renormalised to sum to 1 before sampling.", "Order in practice: logits → temperature → softmax → top-k/top-p → sample."]);
      K.on(el, "[data-kp-ctx]", "click", function (n) { S.ctx = n.getAttribute("data-kp-ctx"); paint(); });
      K.on(el, "[data-kp-mode]", "click", function (n) { S.mode = n.getAttribute("data-kp-mode"); paint(); });
      K.on(el, "[data-kp-k]", "input", function (n) { S.k = +n.value; paint(); });
      K.on(el, "[data-kp-p]", "input", function (n) { S.p = +n.value; paint(); });
    }
    paint();
  });

  // ---- Prompting ----
  P.register("prompting", function () {
    const T = K.pills([["few", "Zero- / Few-shot"], ["cot", "Chain-of-Thought"], ["json", "System prompt + JSON"]], {
      few: "Demonstrations in the prompt “program” the model without changing its weights. Add examples and watch the output format change.",
      cot: "Asking for the reasoning first turns one hard jump into several easy steps.",
      json: "Tool-calling agents need output a program can parse. A system prompt with a schema constrains the format.",
    });
    // Few-shot
    (function () {
      const el = T.pane("few"), S = { n: 0 };
      const EX = [["The battery lasts all day.", "POS"], ["It broke after a week.", "NEG"], ["Shipping was fast and the fit is perfect.", "POS"]];
      const OUT = [
        { txt: "This review sounds pretty positive overall, the person seems happy!", ok: false, note: "Right idea, wrong format: code expecting <code>label: POS</code> fails." },
        { txt: "Positive", ok: false, note: "Closer, but the label set and format are guessed from one example." },
        { txt: "label: POS", ok: true, note: "Two demonstrations fix both the label set and the exact format." },
        { txt: "label: POS", ok: true, note: "More examples help with edge cases, but each costs context tokens." },
      ];
      function paint() {
        const o = OUT[S.n];
        const prompt = '<span class="p-sys">Classify the sentiment of each review.</span>\n' +
          EX.slice(0, S.n).map(function (e) { return '<span class="p-ctx">review: ' + esc(e[0]) + "\nlabel: " + e[1] + "</span>"; }).join("\n") + (S.n ? "\n" : "") +
          '<span class="p-q">review: I love how light this laptop is.\nlabel:</span>';
        el.innerHTML = '<div class="ag-ops"><span class="ag-row-label">Examples in the prompt:</span>' + [0, 1, 2, 3].map(function (k) {
          return '<button type="button" class="ag-pill' + (S.n === k ? " is-active" : "") + '" data-fs="' + k + '">' + (k === 0 ? "0 (zero-shot)" : k + "-shot") + "</button>";
        }).join("") + "</div>" +
          '<div class="ag-split even" style="margin-top:10px"><div><div class="ag-panel-title">Prompt</div><pre class="ag-prompt">' + prompt + "</pre></div>" +
          '<div><div class="ag-panel-title">Model output</div><div class="ag-seq">' + esc(o.txt) + "</div>" +
          '<div class="ag-meter" style="margin-top:8px"><span class="ag-prop ' + (o.ok ? "is-yes" : "is-no") + '">matches <code>label: POS|NEG</code> <strong>' + (o.ok ? "yes" : "no") + '</strong></span><span class="ag-prop">prompt tokens &asymp; <strong>' + (22 + S.n * 14) + "</strong></span></div>" +
          '<div style="margin-top:8px">' + K.explain(o.note) + "</div></div></div>" +
          K.formula("Prompt = &lang;(x<sub>1</sub>, y<sub>1</sub>), (x<sub>2</sub>, y<sub>2</sub>), &hellip;, x<sub>test</sub>&rang;") +
          K.remember(["Zero-shot: instructions only. Few-shot: instructions + worked examples.", "In-context learning changes behaviour without retraining.", "Examples teach the format and label set as much as the task."]);
        K.on(el, "[data-fs]", "click", function (n) { S.n = +n.getAttribute("data-fs"); paint(); });
      }
      paint();
    })();
    // Chain of thought
    (function () {
      const el = T.pane("cot"), S = { cot: false, step: 0 };
      const STEPS = ["The café starts with 23 apples.", "It uses 20 for lunch: 23 − 20 = 3 apples left.", "It buys 6 more: 3 + 6 = 9 apples.", "Answer: 9"];
      function paint() {
        el.innerHTML = '<div class="ag-ops"><button type="button" class="ag-tbtn' + (S.cot ? " is-on" : "") + '" data-cot>' + (S.cot ? "&#10003; " : "") + 'Add “Let’s think step by step.”</button>' +
          (S.cot ? '<button type="button" class="ag-tbtn ag-tbtn-primary" data-cot-next' + (S.step >= STEPS.length ? " disabled" : "") + ">Next reasoning step &rarr;</button>" : "") + "</div>" +
          '<div class="ag-split even" style="margin-top:10px"><div><div class="ag-panel-title">Prompt</div><pre class="ag-prompt"><span class="p-q">Q: A café has 23 apples. It uses 20 to make lunch and buys 6 more. How many apples does it have?</span>' + (S.cot ? '\n<span class="p-sys">Let’s think step by step.</span>' : "") + "\nA:</pre></div>" +
          '<div><div class="ag-panel-title">Model output</div>' + (S.cot
            ? '<div class="ag-log">' + STEPS.slice(0, S.step).map(function (s, i) { return '<div class="ag-log-item ' + (i === STEPS.length - 1 ? "final" : "thought") + (i === S.step - 1 ? " is-new" : "") + '">' + esc(s) + "</div>"; }).join("") + "</div>" +
              (S.step >= STEPS.length ? K.status("is-right", "<strong>9</strong> &mdash; correct. Each step is an easy next-token prediction.") : "")
            : '<div class="ag-seq">The answer is 29.</div>' + K.status("is-wrong", "Wrong (23 + 6 = 29 ignores the 20 used). The model jumped straight to a number.")) + "</div></div>" +
          K.formula("Prompt &rarr; intermediate reasoning &rarr; final answer") +
          K.remember(["CoT gives the model “scratch space”: each written step becomes context for the next.", "It helps most on arithmetic, logic and multi-step planning.", "The ReAct loop (Topic 4) is CoT interleaved with tool calls."]);
        K.on(el, "[data-cot]", "click", function () { S.cot = !S.cot; S.step = 0; paint(); });
        K.on(el, "[data-cot-next]", "click", function () { S.step++; paint(); });
      }
      paint();
    })();
    // JSON
    (function () {
      const el = T.pane("json"), S = { sys: false, temp: "low" };
      function paint() {
        const out = S.sys
          ? '{"tool": "book_table", "args": {"party_size": 4, "time": "19:00", "day": "Friday"}}'
          : "Sure! I'd be happy to help you book a table for four people at 7 pm this Friday. Shall I go ahead?";
        let parsed = null; try { parsed = JSON.parse(out); } catch (e) { parsed = null; }
        const keys = ["party_size", "time", "day"];
        el.innerHTML = '<div class="ag-ops"><button type="button" class="ag-tbtn' + (S.sys ? " is-on" : "") + '" data-js-sys>' + (S.sys ? "&#10003; " : "") + "System prompt with JSON schema</button></div>" +
          '<div class="ag-split even" style="margin-top:10px"><div><div class="ag-panel-title">Prompt</div><pre class="ag-prompt">' +
            (S.sys ? '<span class="p-sys">SYSTEM: You are an API. Reply ONLY with JSON:\n{"tool": "book_table",\n "args": {"party_size": int, "time": "HH:MM", "day": str}}</span>\n' : '<span class="p-dim">(no system prompt)</span>\n') +
            '<span class="p-q">USER: Book a table for 4 at 7pm on Friday.</span></pre></div>' +
          '<div><div class="ag-panel-title">Model output &rarr; json.loads()</div><pre class="ag-prompt"><span class="' + (parsed ? "p-tool" : "p-bad") + '">' + esc(out) + "</span></pre>" +
            '<div class="ag-meter" style="margin-top:8px"><span class="ag-prop ' + (parsed ? "is-yes" : "is-no") + '">parses <strong>' + (parsed ? "yes" : "JSONDecodeError") + "</strong></span>" +
            keys.map(function (k) { const ok = parsed && parsed.args && parsed.args[k] !== undefined; return '<span class="ag-prop ' + (ok ? "is-yes" : "is-no") + '"><code>' + k + "</code> <strong>" + (ok ? esc(String(parsed.args[k])) : "missing") + "</strong></span>"; }).join("") + "</div></div></div>" +
          K.explain(S.sys ? "The output is machine-readable: the runtime can call <code>book_table(**args)</code> directly. This is exactly what function calling uses (Topic 4)." : "Friendly for a person, useless for a program. Turn on the system prompt.") +
          K.remember(["The system prompt sets persona, rules and output format for the whole conversation.", "Agents parse model output with code, so the format must be strict.", "Use low temperature and a schema for structured output."]);
        K.on(el, "[data-js-sys]", "click", function () { S.sys = !S.sys; paint(); });
      }
      paint();
    })();
  });

  // =================================================================
  // Topic 2: Retrieval (RAG)
  // =================================================================
  const EMB_DOCS = [
    { id: "d1", label: "Q-learning update rule", ang: 18, words: ["q-learning", "update", "rule"] },
    { id: "d2", label: "Bellman equation for state values", ang: 40, words: ["bellman", "equation", "state", "values"] },
    { id: "d3", label: "A* orders the frontier by f = g + h", ang: 100, words: ["a*", "orders", "frontier"] },
    { id: "d4", label: "BFS uses a FIFO queue", ang: 124, words: ["bfs", "uses", "fifo", "queue"] },
    { id: "d5", label: "Heart attack warning signs", ang: 228, words: ["heart", "attack", "warning", "signs"] },
    { id: "d6", label: "Cardiac arrest: first aid steps", ang: 250, words: ["cardiac", "arrest", "first", "aid", "steps"] },
  ];
  const EMB_Q = [
    { label: "How does Q-learning update values?", ang: 27, words: ["q-learning", "update", "values"] },
    { label: "Which search uses a queue?", ang: 116, words: ["search", "uses", "queue"] },
    { label: "Signs of a heart attack", ang: 236, words: ["signs", "heart", "attack"] },
  ];
  P.register("embeddings", function () {
    const el = K.single("An embedding model maps text to a vector; similar meaning points in a similar direction. Pick a query or drag the query arrow (q) anywhere.");
    const S = { q: 0, ang: EMB_Q[0].ang, len: 1, k: 2, drag: false };
    const C = 170, R = 140;
    function vec(a, l) { const r = a * Math.PI / 180; return [l * Math.cos(r), l * Math.sin(r)]; }
    function paint() {
      const q = vec(S.ang, S.len), qw = S.q >= 0 ? EMB_Q[S.q].words : [];
      const rows = EMB_DOCS.map(function (d) {
        const v = vec(d.ang, 1);
        return { d: d, v: v, cos: K.cosine(q, v), kw: d.words.filter(function (w) { return qw.indexOf(w) >= 0; }).length };
      }).sort(function (a, b) { return b.cos - a.cos; });
      const top = {}; rows.slice(0, S.k).forEach(function (r) { top[r.d.id] = 1; });
      let svg = '<svg class="ag-svg ag-emb" viewBox="0 0 ' + (2 * C) + " " + (2 * C) + '" data-emb-svg style="touch-action:none;cursor:crosshair" role="img" aria-label="2D projection of document embeddings and the query vector">' +
        '<defs><marker id="emq" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="#6d28d9"/></marker><marker id="emd" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="#0891b2"/></marker><marker id="emg" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="#b9c0d0"/></marker></defs>' +
        '<circle cx="' + C + '" cy="' + C + '" r="' + R + '" fill="none" stroke="#eef0f6" stroke-width="2"/>' +
        '<line x1="' + (C - R - 10) + '" y1="' + C + '" x2="' + (C + R + 10) + '" y2="' + C + '" stroke="#e3e6ef"/><line x1="' + C + '" y1="' + (C - R - 10) + '" x2="' + C + '" y2="' + (C + R + 10) + '" stroke="#e3e6ef"/>';
      EMB_DOCS.forEach(function (d) {
        const v = vec(d.ang, 1), x = C + R * v[0], y = C - R * v[1], on = top[d.id];
        svg += '<line x1="' + C + '" y1="' + C + '" x2="' + x + '" y2="' + y + '" stroke="' + (on ? "#0891b2" : "#b9c0d0") + '" stroke-width="' + (on ? 3 : 2) + '" marker-end="url(#' + (on ? "emd" : "emg") + ')"/>' +
          '<text x="' + (C + (R + 6) * v[0]) + '" y="' + (C - (R + 6) * v[1] + 4) + '" font-size="10.5" font-weight="' + (on ? 800 : 600) + '" fill="' + (on ? "#0e7490" : "#6b7280") + '" text-anchor="' + (v[0] > 0.2 ? "start" : v[0] < -0.2 ? "end" : "middle") + '">' + d.id + "</text>";
      });
      const qx = C + R * S.len * Math.cos(S.ang * Math.PI / 180), qy = C - R * S.len * Math.sin(S.ang * Math.PI / 180);
      svg += '<line x1="' + C + '" y1="' + C + '" x2="' + qx + '" y2="' + qy + '" stroke="#6d28d9" stroke-width="4" marker-end="url(#emq)"/><circle cx="' + qx + '" cy="' + qy + '" r="9" fill="#6d28d9" fill-opacity="0.18" stroke="#6d28d9"/><text x="' + (qx + 10) + '" y="' + (qy - 10) + '" font-size="13" font-weight="800" fill="#6d28d9">q</text></svg>';
      const best = rows[0];
      el.innerHTML =
        '<div class="ag-ops">' + EMB_Q.map(function (q, i) { return '<button type="button" class="ag-op is-ui' + (S.q === i ? " is-selected" : "") + '" data-emb-q="' + i + '">' + esc(q.label) + "</button>"; }).join("") +
          '<label class="ag-slider" style="margin-left:auto">top-K <input type="range" min="1" max="4" value="' + S.k + '" data-emb-k><output>' + S.k + "</output></label></div>" +
        '<div class="ag-split">' + "<div>" + svg + '<p class="ag-foot" style="margin-top:6px!important">Real embeddings have hundreds of dimensions; this is a 2-D picture. Drag q longer or shorter: the cosine does not change.</p></div>' +
          "<div>" + K.formula("cos(q, d) = (q &middot; d) / (&Vert;q&Vert; &Vert;d&Vert;) &isin; [&minus;1, 1]") +
            '<table class="ag-table" style="margin-top:8px"><thead><tr><th class="l">doc</th><th class="l">text</th><th>cos</th><th>shared words</th></tr></thead><tbody>' +
            rows.map(function (r) { return "<tr" + (top[r.d.id] ? ' class="is-hl"' : "") + '><td class="l">' + r.d.id + '</td><td class="l" style="font-family:var(--ag-ui)">' + esc(r.d.label) + "</td><td>" + fx(r.cos, 3) + "</td><td>" + (S.q >= 0 ? r.kw : "–") + "</td></tr>"; }).join("") + "</tbody></table>" +
            '<div class="ag-formula" style="margin-top:8px;font-size:0.82rem">best = ' + best.d.id + ": q&middot;d = " + fx(K.dot(q, best.v), 3) + ", &Vert;q&Vert; = " + fx(K.norm(q), 3) + ", &Vert;d&Vert; = 1.000 &rarr; cos = " + fx(best.cos, 3) + "</div></div></div>" +
        K.explain(S.q === 2 ? "“Cardiac arrest: first aid” shares <strong>no words</strong> with the query, yet it is still retrieved: embeddings match <strong>meaning</strong>, keyword search would miss it."
          : S.q < 0 ? "Custom query: the nearest directions win. Opposite directions give cosine near &minus;1, perpendicular near 0."
          : "The top-K documents (cyan) have the smallest angle to q. These become the context for the LLM in the RAG pipeline.") +
        K.remember(["e = f<sub>&theta;</sub>(text) &isin; &#8477;<sup>d</sup>: semantic similarity becomes geometry.", "Cosine compares direction only, so long and short texts compare fairly.", "Same direction 1, unrelated 0, opposite &minus;1."]);
      K.on(el, "[data-emb-q]", "click", function (n) { S.q = +n.getAttribute("data-emb-q"); S.ang = EMB_Q[S.q].ang; S.len = 1; paint(); });
      K.on(el, "[data-emb-k]", "input", function (n) { S.k = +n.value; paint(); });
      const sv = el.querySelector("[data-emb-svg]");
      function setFrom(e) {
        const r = sv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 2 * C - C, y = C - (e.clientY - r.top) / r.height * 2 * C;
        const l = Math.sqrt(x * x + y * y) / R; if (l < 0.08) return;
        S.ang = ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360; S.len = Math.min(1.15, l); S.q = -1; paint();
      }
      sv.addEventListener("pointerdown", function (e) { S.drag = true; setFrom(e); });
      sv.addEventListener("pointermove", function (e) { if (S.drag) setFrom(e); });
      window.addEventListener("pointerup", function () { S.drag = false; }, { once: true });
    }
    paint();
  });

  // ---- Chunking ----
  const CHUNK_TEXT = ("In the MLAI401 Grid World the agent starts in the bottom left corner . Moves are noisy : the intended move happens 80% of the time . " +
    "The living reward is -0.04 for every step . Reaching the goal square gives +1 and falling into the pit gives -1 . " +
    "The discount factor gamma is 0.9 . Value iteration repeats the Bellman backup until the values stop changing .").split(" ");
  const KEY_FACT = [27, 35]; // "The living reward is -0.04 for every step ." (indices)
  P.register("chunking", function () {
    const el = K.single("Documents are split into chunks before embedding. The chunk is what gets retrieved, so a fact cut in half is a fact the model never sees whole.");
    const S = { L: 10, ov: 0 };
    const COLS = ["#e0f2fe", "#ede9fe", "#dcfce7", "#fef3c7", "#ffe4e6", "#e0e7ff", "#ccfbf1", "#fae8ff"];
    function chunks() {
      const N = CHUNK_TEXT.length, step = S.L - S.ov, out = [];
      for (let s = 0; ; s += step) { out.push([s, Math.min(N, s + S.L)]); if (s + S.L >= N) break; }
      return out;
    }
    function paint() {
      if (S.ov > Math.floor(S.L / 2)) S.ov = Math.floor(S.L / 2);
      const cs = chunks(), N = CHUNK_TEXT.length;
      const covers = cs.findIndex(function (c) { return c[0] <= KEY_FACT[0] && c[1] > KEY_FACT[1]; });
      const owner = CHUNK_TEXT.map(function (_, i) { return cs.map(function (c, k) { return i >= c[0] && i < c[1] ? k : -1; }).filter(function (k) { return k >= 0; }); });
      el.innerHTML =
        '<div class="ag-ops"><label class="ag-slider" style="flex:1">chunk length L <input type="range" min="4" max="30" value="' + S.L + '" data-ch-l><output>' + S.L + ' words</output></label>' +
          '<label class="ag-slider" style="flex:1">overlap <input type="range" min="0" max="' + Math.floor(S.L / 2) + '" value="' + S.ov + '" data-ch-o><output>' + S.ov + " words</output></label></div>" +
        '<div class="ag-ribbon">' + CHUNK_TEXT.map(function (w, i) {
          const o = owner[i], k = o[0], both = o.length > 1, key = i >= KEY_FACT[0] && i <= KEY_FACT[1];
          return '<span class="w" title="chunk ' + o.map(function (x) { return x + 1; }).join(" & ") + '" style="background:' + (both ? "repeating-linear-gradient(45deg," + COLS[k % 8] + " 0 4px," + COLS[o[1] % 8] + " 4px 8px)" : COLS[k % 8]) + ";" + (key ? "outline:2px solid #b45309;" : "") + (cs.some(function (c) { return c[0] === i; }) ? "border-left:3px solid #6d28d9;margin-left:2px;" : "") + '">' + esc(w) + "</span>";
        }).join(" ") + "</div>" +
        '<div class="ag-meter"><span class="ag-prop">words <strong>' + N + '</strong></span><span class="ag-prop">chunks <strong>' + cs.length + '</strong></span><span class="ag-prop">step L &minus; overlap <strong>' + (S.L - S.ov) + "</strong></span>" +
          '<span class="ag-prop ' + (covers >= 0 ? "is-yes" : "is-no") + '">key fact (orange) whole in one chunk <strong>' + (covers >= 0 ? "yes: chunk " + (covers + 1) : "no, split") + "</strong></span></div>" +
        K.formula("Chunk<sub>i</sub> = tokens[ i&middot;(L &minus; overlap) : i&middot;(L &minus; overlap) + L ]") +
        K.explain(covers < 0 ? "The living-reward sentence is <strong>split</strong> across chunks. A query about it retrieves half a sentence. Add overlap or change L until it fits in one chunk."
          : S.L >= 26 ? "Everything fits, but a large chunk mixes several topics, so its embedding is a blurry average and retrieval gets less precise."
          : "The key sentence fits inside one chunk. Overlap (striped words) repeats the edges so sentences near a boundary survive.") +
        K.remember(["Too small: chunks lose context. Too large: embeddings blur several topics.", "Overlap of about 10–20% protects sentences that cross a boundary.", "Real systems count tokens (e.g. L = 200–500) and often split on sentences or headings."]);
      K.on(el, "[data-ch-l]", "input", function (n) { S.L = +n.value; paint(); });
      K.on(el, "[data-ch-o]", "input", function (n) { S.ov = +n.value; paint(); });
    }
    paint();
  });

  // ---- RAG pipeline ----
  // Concept dimensions: [grid/reward, q-learning, search/BFS, A*, course logistics]
  const KB = [
    { id: "K1", text: "Grid World: the living reward is −0.04 per step; the goal gives +1 and the pit −1.", v: [0.95, 0.2, 0, 0, 0.1] },
    { id: "K2", text: "Q-learning: Q(s,a) ← Q(s,a) + α [r + γ max Q(s′,a′) − Q(s,a)].", v: [0.3, 0.95, 0, 0, 0] },
    { id: "K3", text: "BFS expands the shallowest node first using a FIFO queue.", v: [0, 0, 0.95, 0.3, 0] },
    { id: "K4", text: "A* orders the frontier by f(n) = g(n) + h(n).", v: [0, 0, 0.4, 0.9, 0] },
    { id: "K5", text: "The Topic 07 lab is due Friday at 5 pm; submit on the course site.", v: [0.05, 0, 0, 0, 0.98] },
  ];
  const RQ = [
    { q: "What is the living reward in the MLAI401 Grid World?", v: [0.96, 0.25, 0, 0, 0.12], noRag: "The living reward in a grid world is usually −1 per step.", noRagOk: false,
      rag: "The living reward is −0.04 per step [K1].", cite: "K1" },
    { q: "How does Q-learning update its values?", v: [0.22, 0.97, 0.02, 0, 0], noRag: "It nudges Q(s,a) toward r + γ·max Q(s′,a′) using a learning rate.", noRagOk: true,
      rag: "Q(s,a) moves toward r + γ max Q(s′,a′) by a step α [K2].", cite: "K2" },
    { q: "When is the Topic 07 lab due?", v: [0.1, 0, 0, 0, 1], noRag: "The Topic 07 lab is due Monday at 9 am.", noRagOk: false,
      rag: "Friday at 5 pm, submitted on the course site [K5].", cite: "K5" },
  ];
  P.register("rag-pipeline", function () {
    const el = K.single("Pick a question and step through the five stages. Then switch RAG off and compare the answer.");
    const S = { q: 0, rag: true, k: 2 };
    const st = K.stepper(paint, 1400);
    st.n = 5;
    const NODES = [["Query", "user question"], ["Embed", "q = f(query)"], ["Retrieve", "top-K by cosine"], ["Augment", "build the prompt"], ["Generate", "grounded answer"]];
    function paint() {
      const Q = RQ[S.q];
      const ranked = KB.map(function (d) { return { d: d, c: K.cosine(Q.v, d.v) }; }).sort(function (a, b) { return b.c - a.c; });
      const top = ranked.slice(0, S.k);
      const i = st.idx;
      let body = "";
      if (i === 0) body = '<div class="ag-seq">' + esc(Q.q) + "</div>";
      if (i === 1) body = S.rag ? '<div class="ag-formula">q = f<sub>&theta;</sub>(query) = [' + Q.v.map(function (x) { return fx(x, 2); }).join(", ") + ']</div><p class="ag-foot" style="margin-top:6px!important">Dimensions (toy): grid/reward, Q-learning, search, A*, course logistics. The same model embedded every chunk in advance.</p>' : K.status("is-ask", "RAG is off: no embedding, no search.");
      if (i === 2) body = S.rag ? '<table class="ag-table"><thead><tr><th class="l">chunk</th><th class="l">text</th><th>cos(q, d)</th></tr></thead><tbody>' + ranked.map(function (r, k) { return "<tr" + (k < S.k ? ' class="is-hl"' : "") + '><td class="l">' + r.d.id + '</td><td class="l" style="font-family:var(--ag-ui)">' + esc(r.d.text) + "</td><td>" + fx(r.c, 3) + "</td></tr>"; }).join("") + "</tbody></table>" : K.status("is-ask", "RAG is off: nothing is retrieved.");
      if (i === 3) body = '<pre class="ag-prompt"><span class="p-sys">SYSTEM: Answer using ONLY the context. Cite chunk ids. If the answer is not in the context, say "I don\'t know".</span>\n' +
        (S.rag ? top.map(function (r) { return '<span class="p-ctx">[' + r.d.id + "] " + esc(r.d.text) + "</span>"; }).join("\n") + "\n" : '<span class="p-dim">(no context)</span>\n') + '<span class="p-q">QUESTION: ' + esc(Q.q) + "</span></pre>";
      if (i === 4) {
        const ok = S.rag ? true : Q.noRagOk;
        body = '<div class="ag-seq">' + esc(S.rag ? Q.rag : Q.noRag) + "</div>" +
          K.status(ok ? (S.rag ? "is-right" : "is-ask") : "is-wrong", S.rag ? "Grounded in <strong>" + Q.cite + "</strong>: you can check the source." : ok ? "Plausible, but there is no source to check it against." : "<strong>Hallucination:</strong> confident, specific and wrong. The model never saw this private fact.");
      }
      el.innerHTML =
        '<div class="ag-ops">' + RQ.map(function (q, k) { return '<button type="button" class="ag-op is-ui' + (S.q === k ? " is-selected" : "") + '" data-rq="' + k + '">' + esc(q.q) + "</button>"; }).join("") + "</div>" +
        '<div class="ag-ops"><button type="button" class="ag-tbtn' + (S.rag ? " is-on" : "") + '" data-rag-on>' + (S.rag ? "&#10003; RAG on" : "RAG off") + '</button><label class="ag-slider">K <input type="range" min="1" max="3" value="' + S.k + '" data-rag-k><output>' + S.k + "</output></label></div>" +
        st.toolbar() +
        '<div class="ag-flow">' + NODES.map(function (n, k) {
          const dim = !S.rag && (k >= 1 && k <= 2);
          return (k ? '<span class="ag-flow-arrow">&rarr;</span>' : "") + '<div class="ag-flow-node' + (k === i ? " is-active" : k < i ? " is-done" : "") + '"' + (dim ? ' style="opacity:.4"' : "") + "><b>" + (k + 1) + ". " + n[0] + "</b>" + n[1] + "</div>";
        }).join("") + "</div>" +
        '<div class="ag-panel">' + body + "</div>" +
        K.formula("Prompt = System + &Sigma;<sub>k=1..K</sub> Context<sub>k</sub> + Query") +
        K.remember(["RAG fixes three LLM gaps: knowledge cutoff, private data, unverifiable claims.", "Retrieval quality limits answer quality: wrong chunks in, wrong answer out.", "The instruction “only from context, cite, else say I don't know” makes grounding checkable."]);
      st.bind(el);
      K.on(el, "[data-rq]", "click", function (n) { S.q = +n.getAttribute("data-rq"); st.idx = 0; paint(); });
      K.on(el, "[data-rag-on]", "click", function () { S.rag = !S.rag; paint(); });
      K.on(el, "[data-rag-k]", "input", function (n) { S.k = +n.value; paint(); });
    }
    paint();
  });

  // ---- Token budget (Reading Notes practice problem 3) ----
  P.register("token-budget", function () {
    const el = K.single("Every retrieved chunk spends context tokens. Context window C = 1000, system prompt 150, question 50, keep 300 for the answer, chunks of 120. How many chunks fit?");
    const S = { C: 1000, sys: 150, q: 50, res: 300, ch: 120, ans: "", checked: false };
    function paint() {
      const free = S.C - S.sys - S.q - S.res, k = Math.max(0, Math.floor(free / S.ch)), used = S.sys + S.q + S.res + k * S.ch;
      const correct = +S.ans === 4;
      const pct = function (x) { return (100 * x / S.C) + "%"; };
      el.innerHTML =
        '<div class="ag-ops"><span class="ag-row-label">Your answer (for the default numbers):</span><input class="ag-input" type="number" min="0" value="' + esc(S.ans) + '" data-tb-ans> <button type="button" class="ag-tbtn ag-tbtn-primary" data-tb-check>Check</button></div>' +
        (S.checked ? K.verdict(correct, correct ? "1000 − 150 − 50 − 300 = 500 free tokens; ⌊500 / 120⌋ = 4 chunks (480 tokens), 20 left over." : "Free tokens = 1000 − 150 − 50 − 300 = 500. How many whole 120-token chunks fit in 500?") : "") +
        '<div class="ag-grid4" style="margin-top:4px">' +
          [["C", "context window", 500, 4000, 50], ["sys", "system prompt", 0, 800, 10], ["q", "question", 0, 400, 10], ["res", "reserved for answer", 0, 1500, 50], ["ch", "chunk size", 40, 600, 10]].map(function (r) {
            return '<label class="ag-panel" style="display:flex;flex-direction:column;gap:4px"><span class="ag-row-label">' + r[1] + '</span><input type="range" min="' + r[2] + '" max="' + r[3] + '" step="' + r[4] + '" value="' + S[r[0]] + '" data-tb="' + r[0] + '" style="accent-color:var(--ag-primary)"><span style="font-family:var(--ag-mono);font-weight:700">' + S[r[0]] + "</span></label>";
          }).join("") + "</div>" +
        '<div class="ag-mem" aria-label="context window usage">' +
          '<span class="m-sys" style="width:' + pct(S.sys) + '">system</span><span class="m-user" style="width:' + pct(S.q) + '">q</span>' +
          Array.from({ length: k }).map(function (_, i) { return '<span class="m-tool" style="width:' + pct(S.ch) + '">chunk ' + (i + 1) + "</span>"; }).join("") +
          '<span style="width:' + pct(Math.max(0, S.C - used)) + ';background:#eef0f6;color:#6b7280">free</span><span class="m-sum" style="width:' + pct(S.res) + '">answer</span></div>' +
        (free < 0 ? K.status("is-wrong", "Over budget before any context: the prompt does not fit.") :
          '<div class="ag-meter"><span class="ag-prop">free for context <strong>' + free + '</strong></span><span class="ag-prop is-yes">chunks K <strong>' + k + '</strong></span><span class="ag-prop">unused <strong>' + (free - k * S.ch) + "</strong></span></div>") +
        K.formula("K = &lfloor;(C &minus; system &minus; question &minus; reserved) / chunk&rfloor;") +
        K.remember(["The context window holds everything: instructions, retrieved chunks, history and the answer.", "Reserve space for the output or the answer gets cut off.", "Smaller chunks fit more pieces; bigger chunks give each piece more context."]);
      K.on(el, "[data-tb]", "input", function (n) { S[n.getAttribute("data-tb")] = +n.value; paint(); });
      K.on(el, "[data-tb-ans]", "input", function (n) { S.ans = n.value; });
      K.on(el, "[data-tb-check]", "click", function () { S.checked = true; S.C = 1000; S.sys = 150; S.q = 50; S.res = 300; S.ch = 120; paint(); });
    }
    paint();
  });
})();
