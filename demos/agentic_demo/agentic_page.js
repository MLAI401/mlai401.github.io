/*
  MLAI401 — Topic 07: Generative & Agentic AI (agentic.html)

  Page pattern follows the CPP201 concept pages (e.g. graphs.js):
  Topic Buttons -> Subtopic Tabs -> one demo panel; GROUPS /
  selectGroup / selectSubtopic; ?t= / ?s= deep links; renderDemo()
  dispatches on the subtopic `kind`. Each demo is built from the same
  small kit: pill tabs, a stepper (Previous / Next / Play / Reset),
  "What's happening?", a status line, quick checks with feedback and a
  "Remember" list.

  This file holds the kit, the groups and the page controller. The
  demos register themselves from agentic_topics_a.js (Topics 1–3) and
  agentic_topics_b.js (Topics 4–6) through window.AgenticPage.register.
  All numbers shown (softmax, cosine, budgets) are computed here and
  match python_sandbox/12_Generative_RAG.py and 13_Agentic_AI.py.
*/
(function (root) {
  "use strict";

  // -----------------------------------------------------------------
  // Pure helpers (also exported for Node checks)
  // -----------------------------------------------------------------
  function esc(v) {
    return String(v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  // softmax_temperature(logits, T) in 12_Generative_RAG.py
  function softmaxT(logits, T) {
    if (T <= 0.001) {
      let mi = 0; logits.forEach(function (z, i) { if (z > logits[mi]) mi = i; });
      return logits.map(function (_, i) { return i === mi ? 1 : 0; });
    }
    const mx = Math.max.apply(null, logits);
    const ex = logits.map(function (z) { return Math.exp((z - mx) / T); });
    const s = ex.reduce(function (a, b) { return a + b; }, 0);
    return ex.map(function (e) { return e / s; });
  }
  function entropy(ps) { return ps.reduce(function (h, p) { return p > 1e-12 ? h - p * Math.log2(p) : h; }, 0); }
  // filter_top_k_top_p(tokens, probs, top_k, top_p)
  function topKP(tokens, probs, k, p) {
    let pairs = tokens.map(function (t, i) { return [t, probs[i]]; }).sort(function (a, b) { return b[1] - a[1]; });
    if (k && k > 0) pairs = pairs.slice(0, k);
    if (p !== null && p !== undefined && p < 1) {
      const nuc = []; let c = 0;
      for (let i = 0; i < pairs.length; i++) { nuc.push(pairs[i]); c += pairs[i][1]; if (c >= p - 1e-12) break; }
      pairs = nuc;
    }
    const tot = pairs.reduce(function (a, x) { return a + x[1]; }, 0);
    return pairs.map(function (x) { return [x[0], x[1] / tot]; });
  }
  function dot(u, v) { return u.reduce(function (a, x, i) { return a + x * v[i]; }, 0); }
  function norm(u) { return Math.sqrt(dot(u, u)); }
  function cosine(u, v) { const a = norm(u), b = norm(v); return a === 0 || b === 0 ? 0 : dot(u, v) / (a * b); }
  function fx(x, d) { return (Math.round(x * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d); }
  // Seeded RNG so "Sample" is repeatable in class.
  function rng(seed) { let s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  // -----------------------------------------------------------------
  // Groups and subtopics
  // -----------------------------------------------------------------
  const GROUPS = {
    intro: { label: "From RL to Agents", subtopics: [
      { id: "evolution", label: "Evolution of AI", kind: "evolution" },
      { id: "chat-vs-agent", label: "Chatbot vs. Agent", kind: "chat-vs-agent" },
      { id: "which-system", label: "Which System Is It?", kind: "which-system" },
    ] },
    llm: { label: "LLMs & Decoding", subtopics: [
      { id: "next-token", label: "Next-Token Prediction", kind: "next-token" },
      { id: "temperature", label: "Temperature", kind: "temperature" },
      { id: "top-k-p", label: "Top-k & Top-p", kind: "top-k-p" },
      { id: "prompting", label: "Prompting: Few-shot, CoT, JSON", kind: "prompting" },
    ] },
    rag: { label: "Retrieval (RAG)", subtopics: [
      { id: "llm-vs-rag", label: "LLM vs. RAG", kind: "llm-vs-rag" },
      { id: "embeddings", label: "Embeddings & Cosine", kind: "embeddings" },
      { id: "chunking", label: "Chunking", kind: "chunking" },
      { id: "rag-pipeline", label: "RAG Pipeline", kind: "rag-pipeline" },
      { id: "token-budget", label: "Token Budget", kind: "token-budget" },
    ] },
    agents: { label: "Tools, ReAct & Memory", subtopics: [
      { id: "tools", label: "Tool Calling", kind: "tools" },
      { id: "react", label: "The ReAct Loop", kind: "react" },
      { id: "memory", label: "Memory & Context", kind: "memory" },
      { id: "planning", label: "Planning & Tree-of-Thoughts", kind: "planning" },
      { id: "multi-agent", label: "Multi-Agent Team", kind: "multi-agent" },
    ] },
    safety: { label: "Safety & Evaluation", subtopics: [
      { id: "grounding", label: "Hallucination & Grounding", kind: "grounding" },
      { id: "injection", label: "Prompt Injection", kind: "injection" },
      { id: "hitl", label: "Human-in-the-Loop", kind: "hitl" },
      { id: "bias", label: "Bias Audit", kind: "bias" },
      { id: "evaluate", label: "Compare Systems", kind: "evaluate" },
    ] },
    code: { label: "Trace the Code", subtopics: [
      { id: "code-softmax", label: "softmax_temperature", kind: "code-softmax" },
      { id: "code-topp", label: "filter_top_k_top_p", kind: "code-topp" },
      { id: "code-cosine", label: "cosine_similarity", kind: "code-cosine" },
      { id: "code-react", label: "ReAct agent.run", kind: "code-react" },
    ] },
  };
  const DEFAULT_GROUP = "intro";
  const RENDER = {};

  // -----------------------------------------------------------------
  // Kit shared by every demo. `K.visual` is the demo panel body.
  // -----------------------------------------------------------------
  const K = { esc: esc, softmaxT: softmaxT, entropy: entropy, topKP: topKP, dot: dot, norm: norm, cosine: cosine, fx: fx, rng: rng, stopPlay: null };

  K.remember = function (list) {
    return '<div class="ag-remember"><div class="ag-remember-title">Remember</div><ul>' +
      list.map(function (r) { return "<li>" + r + "</li>"; }).join("") + "</ul></div>";
  };
  K.explain = function (msg, title) {
    return '<div class="ag-explain"><span class="ag-explain-title">' + (title || "What's happening?") + "</span>" + msg + "</div>";
  };
  K.status = function (cls, msg) { return '<div class="ag-status ' + cls + '">' + msg + "</div>"; };
  K.verdict = function (ok, msg) { return K.status(ok ? "is-right" : "is-wrong", "<strong>" + (ok ? "Correct." : "Not quite.") + "</strong> " + msg); };
  K.formula = function (html) { return '<div class="ag-formula">' + html + "</div>"; };
  K.pillRow = function (items, active, attr, label) {
    return '<div class="ag-pills">' + (label ? '<span class="ag-pill-label">' + label + "</span>" : "") + items.map(function (it) {
      return '<button type="button" class="ag-pill' + (it[0] === active ? " is-active" : "") + '" ' + attr + '="' + esc(it[0]) + '">' + it[1] + "</button>";
    }).join("") + "</div>";
  };
  // Answer buttons for a quick check. pick undefined -> unanswered.
  K.optBtns = function (opts, pick, answer, attrs, ui) {
    return '<div class="ag-ops">' + opts.map(function (o) {
      const cls = pick === undefined ? "" : o === answer ? " is-answer" : o === pick ? " is-wrong-pick" : "";
      return '<button type="button" class="ag-op' + (ui ? " is-ui" : "") + cls + '" ' + attrs + '="' + esc(o) + '"' + (pick === undefined ? "" : " disabled") + ">" + esc(o) + "</button>";
    }).join("") + "</div>";
  };
  // A list of quick-check questions: [{q, options, answer, why}]. Returns
  // { html(), bind(el, repaint) } keeping picks in its own state.
  K.quiz = function (qs, key) {
    const picks = {};
    return {
      picks: picks,
      done: function () { return Object.keys(picks).length === qs.length; },
      score: function () { return qs.filter(function (q, i) { return picks[i] === q.answer; }).length; },
      html: function () {
        return qs.map(function (q, i) {
          const p = picks[i];
          return '<div class="ag-panel"><div class="ag-row-label" style="margin-bottom:6px">' + (i + 1) + ". " + q.q + "</div>" +
            K.optBtns(q.options, p, q.answer, 'data-q-' + key + '="' + i + '" data-val', true) +
            (p === undefined ? "" : '<div style="margin-top:8px">' + K.verdict(p === q.answer, (p === q.answer ? "" : "Answer: <strong>" + esc(q.answer) + "</strong>. ") + (q.why || "")) + "</div>") + "</div>";
        }).join("");
      },
      bind: function (el, repaint) {
        el.querySelectorAll("[data-q-" + key + "]").forEach(function (b) {
          b.addEventListener("click", function () { picks[b.getAttribute("data-q-" + key)] = b.getAttribute("data-val"); repaint(); });
        });
      },
    };
  };
  // Pill sub-tabs. tabs: [[id, label]]; returns { pane(id) }.
  K.pills = function (tabs, lead, onShow) {
    const v = K.visual;
    v.innerHTML = '<div class="ag-wrap">' + K.pillRow(tabs, tabs[0][0], "data-ag-tab") +
      tabs.map(function (t, k) {
        return '<div data-ag-pane="' + t[0] + '"' + (k ? " hidden" : "") + ">" + (lead && lead[t[0]] ? '<p class="ag-lead2" style="margin-bottom:10px!important">' + lead[t[0]] + "</p>" : "") + '<div data-ag-body="' + t[0] + '"></div></div>';
      }).join("") + "</div>";
    function show(id) {
      if (K.stopPlay) K.stopPlay();
      v.querySelectorAll("[data-ag-tab]").forEach(function (b) { b.classList.toggle("is-active", b.getAttribute("data-ag-tab") === id); });
      v.querySelectorAll("[data-ag-pane]").forEach(function (p) { p.hidden = p.getAttribute("data-ag-pane") !== id; });
      if (onShow) onShow(id);
    }
    v.querySelectorAll("[data-ag-tab]").forEach(function (b) { b.addEventListener("click", function () { show(b.getAttribute("data-ag-tab")); }); });
    return { pane: function (id) { return v.querySelector('[data-ag-body="' + id + '"]'); }, show: show };
  };
  K.single = function (lead) {
    K.visual.innerHTML = '<div class="ag-wrap">' + (lead ? '<p class="ag-lead2">' + lead + "</p>" : "") + "<div data-ag-single></div></div>";
    return K.visual.querySelector("[data-ag-single]");
  };
  // Stepper: Previous / Next / Play / Reset. paint() reads st.idx.
  K.stepper = function (paint, ms) {
    const st = { idx: 0, n: 1, timer: null, canNext: function () { return true; } };
    st.stop = function () { if (st.timer) { clearInterval(st.timer); st.timer = null; } };
    st.go = function (d) { st.idx = Math.max(0, Math.min(st.n - 1, st.idx + d)); paint(); };
    st.toolbar = function (extra, label) {
      const last = st.idx >= st.n - 1;
      return '<div class="ag-toolbar"><div class="ag-step-count">' + (label || "Step " + (st.idx + 1) + " of " + st.n) + "</div>" +
        '<div class="ag-controls">' +
        '<button type="button" class="ag-tbtn" data-ag-step="prev"' + (st.idx === 0 ? " disabled" : "") + ">&larr; Previous Step</button>" +
        '<button type="button" class="ag-tbtn ag-tbtn-primary" data-ag-step="next"' + (last || !st.canNext() ? " disabled" : "") + ">Next Step &rarr;</button>" +
        '<button type="button" class="ag-tbtn" data-ag-step="play"' + (!st.canNext() && !st.timer ? " disabled" : "") + ">" + (st.timer ? "&#10073;&#10073; Pause" : "&#9654; Play") + "</button>" +
        '<button type="button" class="ag-tbtn" data-ag-step="reset">&#8635; Reset</button>' + (extra || "") +
        "</div></div>";
    };
    st.bind = function (el, onReset) {
      el.querySelectorAll("[data-ag-step]").forEach(function (b) {
        b.addEventListener("click", function () {
          const a = b.getAttribute("data-ag-step");
          if (a !== "play") st.stop();
          if (a === "prev") st.go(-1);
          if (a === "next") st.go(1);
          if (a === "reset") { st.idx = 0; if (onReset) onReset(); paint(); }
          if (a === "play") {
            if (st.timer) { st.stop(); paint(); return; }
            if (st.idx >= st.n - 1) st.idx = 0;
            st.timer = setInterval(function () {
              if (st.idx >= st.n - 1 || !st.canNext()) { st.stop(); paint(); return; }
              st.go(1);
            }, ms || 1300);
            paint();
          }
        });
      });
    };
    K.stopPlay = st.stop;
    return st;
  };
  // Probability bars. rows: [{label, p, cls, attr}]
  K.bars = function (rows, opts) {
    opts = opts || {};
    const mx = opts.max || Math.max.apply(null, rows.map(function (r) { return r.p; }).concat([1e-9]));
    return '<div class="ag-bars">' + rows.map(function (r) {
      return '<div class="ag-bar' + (r.cls ? " " + r.cls : "") + '"' + (r.attr || "") + '><span>' + esc(r.label) + '</span><span class="ag-bar-track"><span class="ag-bar-fill" style="width:' + Math.max(0.5, 100 * r.p / mx) + '%"></span></span><span class="ag-bar-v">' + (r.v !== undefined ? r.v : fx(r.p * 100, 1) + "%") + "</span></div>";
    }).join("") + "</div>";
  };
  // Python syntax colouring for the code traces (keywords, strings, comments).
  K.py = function (line) {
    // Pull out comments and strings first so keywords inside them stay plain.
    let src = line, tail = "";
    const cm = src.search(/#(?=(?:[^"']|"[^"]*"|'[^']*')*$)/);
    if (cm >= 0) { tail = '<span class="cm">' + esc(src.slice(cm)) + "</span>"; src = src.slice(0, cm); }
    const strs = [];
    src = src.replace(/(f?"[^"]*"|'[^']*')/g, function (m) { strs.push(m); return "\u0000" + (strs.length - 1) + "\u0000"; });
    let s = esc(src);
    s = s.replace(/\b(def|return|for|in|if|else|elif|while|break|import|from|not|and|or|None|True|False|is|lambda)\b/g, '<span class="kw">$1</span>');
    s = s.replace(/\b(math\.exp|math\.sqrt|max|sum|sorted|zip|range|len|round|print)\b(?=\()/g, '<span class="fn">$1</span>');
    s = s.replace(/\u0000(\d+)\u0000/g, function (_, i) { return '<span class="st">' + esc(strs[+i]) + "</span>"; });
    return s + tail;
  };
  // Code trace panel: lines, active line (1-based), explanation.
  K.codePanel = function (file, lines, active, title, body) {
    return '<div class="ag-code-panel"><div class="ag-code-file">' + esc(file) + '</div><pre class="ag-code">' + lines.map(function (l, i) {
      const on = i + 1 === active;
      return '<div class="ag-line' + (on ? " is-active" : "") + '"><span class="ag-line-arrow">' + (on ? "&#9654;" : "") + '</span><span class="ag-line-no">' + (i + 1) + '</span><span class="ag-line-code">' + K.py(l) + "</span></div>";
    }).join("") + '</pre><div class="ag-code-explain"><div class="ag-code-explain-title">' + (title || "What this line does") + '</div><div class="ag-code-explain-body">' + body + "</div></div></div>";
  };
  // Variables panel: [[name, value|undefined, changed?]]
  K.varsPanel = function (vars, title) {
    return '<div class="ag-panel"><div class="ag-panel-title">' + (title || "Variables") + '</div><div class="ag-vars">' + vars.map(function (v) {
      const empty = v[1] === undefined || v[1] === null;
      return '<div class="ag-var"><span class="ag-var-name">' + esc(v[0]) + '</span><span class="ag-var-box ' + (empty ? "is-empty" : v[2] ? "is-changed" : "is-set") + '">' + (empty ? "—" : esc(v[1])) + "</span></div>";
    }).join("") + "</div></div>";
  };
  K.on = function (el, sel, ev, fn) { el.querySelectorAll(sel).forEach(function (n) { n.addEventListener(ev, function (e) { fn(n, e); }); }); };

  function register(kind, fn) { RENDER[kind] = fn; }
  function registerBigPicture(fn) { K.bigPicture = fn; }

  // -----------------------------------------------------------------
  // Page controller (same shape as CPP201 graphs.js init()).
  // -----------------------------------------------------------------
  let initialized = false;
  function init() {
    if (initialized) return;
    initialized = true;
    const topicButtonsEl = document.getElementById("agentic-topic-buttons");
    const subtopicTabsEl = document.getElementById("agentic-subtopic-tabs");
    const demo = document.getElementById("agentic-topic-demo");
    if (!topicButtonsEl || !subtopicTabsEl || !demo) return;
    const demoTitle = demo.querySelector('[data-role="title"]');
    const demoSubtitle = demo.querySelector('[data-role="subtitle"]');
    K.visual = demo.querySelector('[data-role="visual"]');
    // Keep chat-style logs scrolled to their newest entry after any repaint.
    new MutationObserver(function () {
      K.visual.querySelectorAll(".ag-log").forEach(function (l) { if (l.querySelector(".is-new")) l.scrollTop = l.scrollHeight; });
    }).observe(K.visual, { childList: true, subtree: true });

    let currentGroupId = DEFAULT_GROUP;
    let currentSubtopicId = GROUPS[DEFAULT_GROUP].subtopics[0].id;

    if (K.bigPicture) K.bigPicture(document.getElementById("agentic-bp-cards"), function (t, s) { selectSubtopic(t, s, true); });

    function getGroup(id) { return GROUPS[id] || GROUPS[DEFAULT_GROUP]; }
    function getSubtopic(gid, sid) {
      const g = getGroup(gid);
      return g.subtopics.find(function (s) { return s.id === sid; }) || g.subtopics[0];
    }
    function updateUrl() {
      const url = new URL(window.location.href);
      url.searchParams.set("t", currentGroupId);
      url.searchParams.set("s", currentSubtopicId);
      history.replaceState(null, "", url.toString());
    }
    function renderTopicButtons() {
      topicButtonsEl.innerHTML = Object.keys(GROUPS).map(function (k, i) {
        return '<button type="button" class="ag-topic-btn' + (k === currentGroupId ? " is-selected" : "") + '" data-topic-group="' + k + '"><span class="ag-num">' + i + "</span>" + esc(GROUPS[k].label) + "</button>";
      }).join("");
      topicButtonsEl.querySelectorAll("[data-topic-group]").forEach(function (b) {
        b.addEventListener("click", function () { selectGroup(b.getAttribute("data-topic-group")); });
      });
    }
    function renderSubtopicTabs() {
      subtopicTabsEl.innerHTML = getGroup(currentGroupId).subtopics.map(function (s) {
        return '<button type="button" class="ag-subtopic-tab' + (s.id === currentSubtopicId ? " is-selected" : "") + '" data-subtopic="' + s.id + '">' + esc(s.label) + "</button>";
      }).join("");
      subtopicTabsEl.querySelectorAll("[data-subtopic]").forEach(function (b) {
        b.addEventListener("click", function () { selectSubtopic(currentGroupId, b.getAttribute("data-subtopic")); });
      });
    }
    function selectGroup(gid) {
      if (!GROUPS[gid]) return;
      currentGroupId = gid;
      currentSubtopicId = GROUPS[gid].subtopics[0].id;
      renderTopicButtons(); renderSubtopicTabs(); renderDemo(); updateUrl();
    }
    function selectSubtopic(gid, sid, scroll) {
      if (!GROUPS[gid] || !GROUPS[gid].subtopics.some(function (s) { return s.id === sid; })) return;
      currentGroupId = gid; currentSubtopicId = sid;
      renderTopicButtons(); renderSubtopicTabs(); renderDemo(); updateUrl();
      if (scroll) topicButtonsEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    function renderDemo() {
      const group = getGroup(currentGroupId), sub = getSubtopic(currentGroupId, currentSubtopicId);
      if (K.stopPlay) { K.stopPlay(); K.stopPlay = null; }
      demoTitle.textContent = sub.label;
      demoSubtitle.textContent = group.label;
      const fn = RENDER[sub.kind];
      if (fn) {
        try { fn(sub); } catch (err) {
          K.visual.innerHTML = '<div class="ag-status is-wrong">This demo failed to load: ' + esc(err.message) + "</div>";
          if (root.console) console.error(err);
        }
      } else K.visual.innerHTML = '<div class="ag-status">Interactive demo for <strong>' + esc(sub.label) + "</strong> isn't built yet.</div>";
    }

    const params = new URLSearchParams(window.location.search);
    const t = params.get("t"), s = params.get("s");
    if (t && GROUPS[t]) currentGroupId = t;
    currentSubtopicId = s && getGroup(currentGroupId).subtopics.some(function (x) { return x.id === s; }) ? s : getGroup(currentGroupId).subtopics[0].id;
    renderTopicButtons();
    renderSubtopicTabs();
    renderDemo();
  }

  const api = { GROUPS: GROUPS, RENDER: RENDER, K: K, register: register, registerBigPicture: registerBigPicture,
    softmaxT: softmaxT, entropy: entropy, topKP: topKP, cosine: cosine, dot: dot, norm: norm };
  if (typeof module !== "undefined" && module.exports) { module.exports = api; return; }
  root.AgenticPage = api;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else setTimeout(init, 0);
})(typeof window !== "undefined" ? window : globalThis);
