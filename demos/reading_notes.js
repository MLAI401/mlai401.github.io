/*
  MLAI401 — Reading Notes engine (shared by topic06_reading.html and
  topic07_reading.html; content in each topic's reading_topicNN.js).

  CPP201 concept-page pattern, same look as the Topic 07 lecture page
  (agentic_page.css): Topic Buttons -> Subtopic Tabs -> one panel.
  Each note subtab: short note, formula, optional example, "Check
  yourself" questions with feedback, and a "Remember" list. The
  Practice tab turns the six worked exercises into tasks (number inputs
  checked with a tolerance, or multiple choice) followed by a
  step-by-step solution reveal. ?t=<tab>&s=<subtab> deep links.
*/
(function () {
  "use strict";

  function esc(v) {
    return String(v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // ---------------------------------------------------------------
  // Content. Notes: { id, label, lead, points[], formula, example, figure (full width),
  // checks[{q, options, answer, why}], remember[] }.
  // Exercises: { id, label, problem, tasks[], steps[] } where a task is
  // {type:'num', label, answer, tol, unit?, hint} or {type:'mcq', q, options, answer, why}.
  // ---------------------------------------------------------------
  // Content comes from a per-topic data file loaded first
  // (e.g. demos/learning_demo/reading_topic06.js) that sets READING_NOTES.
  const root = typeof window !== "undefined" ? window : globalThis;
  const TABS = (root.READING_NOTES && root.READING_NOTES.tabs) || [];

  // ---------------------------------------------------------------
  // Score across the whole page (kept in memory for this visit).
  // ---------------------------------------------------------------
  const ANS = {}; // "tab/sub/i" -> { ok: bool }
  const TOTAL = TABS.reduce(function (n, t) {
    return n + t.subs.reduce(function (m, s) { return m + (s.exercise ? s.tasks.length : (s.checks || []).length); }, 0);
  }, 0);
  function score() {
    const k = Object.keys(ANS);
    return { done: k.length, right: k.filter(function (x) { return ANS[x].ok; }).length };
  }
  function subScore(t, s) {
    const pre = t.id + "/" + s.id + "/";
    const n = s.exercise ? s.tasks.length : (s.checks || []).length;
    const k = Object.keys(ANS).filter(function (x) { return x.indexOf(pre) === 0; });
    return { n: n, done: k.length, right: k.filter(function (x) { return ANS[x].ok; }).length };
  }

  let curT = TABS[0].id, curS = TABS[0].subs[0].id, timer = null;
  const ST = {}; // per-exercise state: inputs + solution step
  function tab(id) { return TABS.find(function (t) { return t.id === id; }) || TABS[0]; }

  function init() {
    const btns = document.getElementById("rn-topic-buttons");
    if (!btns) return;
    const p = new URLSearchParams(location.search);
    if (p.get("t") && TABS.some(function (t) { return t.id === p.get("t"); })) curT = p.get("t");
    const tt = tab(curT);
    curS = tt.subs.some(function (s) { return s.id === p.get("s"); }) ? p.get("s") : tt.subs[0].id;
    render();
  }
  function select(t, s) {
    curT = t; const tt = tab(t);
    curS = s && tt.subs.some(function (x) { return x.id === s; }) ? s : tt.subs[0].id;
    render();
    const url = new URL(location.href); url.searchParams.set("t", curT); url.searchParams.set("s", curS);
    history.replaceState(null, "", url.toString());
  }

  function render() {
    if (timer) { clearInterval(timer); timer = null; }
    const tt = tab(curT), ss = tt.subs.find(function (x) { return x.id === curS; });
    const sc = score();
    document.getElementById("rn-score").innerHTML =
      'Checks answered <strong>' + sc.done + " / " + TOTAL + "</strong> · correct <strong>" + sc.right + "</strong>" +
      (sc.done ? ' <button type="button" class="ag-tbtn" data-rn-reset style="margin-left:8px">&#8635; Reset answers</button>' : "");
    const rs = document.querySelector("[data-rn-reset]");
    if (rs) rs.addEventListener("click", function () { Object.keys(ANS).forEach(function (k) { delete ANS[k]; }); Object.keys(ST).forEach(function (k) { delete ST[k]; }); render(); });

    document.getElementById("rn-topic-buttons").innerHTML = TABS.map(function (t, i) {
      return '<button type="button" class="ag-topic-btn' + (t.id === curT ? " is-selected" : "") + '" data-rn-t="' + t.id + '"><span class="ag-num">' + (i + 1) + "</span>" + esc(t.label) + "</button>";
    }).join("");
    document.getElementById("rn-subtopic-tabs").innerHTML = tt.subs.map(function (s) {
      const k = subScore(tt, s);
      const mark = k.done === k.n ? (k.right === k.n ? " ✓" : " · " + k.right + "/" + k.n) : "";
      return '<button type="button" class="ag-subtopic-tab' + (s.id === curS ? " is-selected" : "") + '" data-rn-s="' + s.id + '">' + esc(s.label) + '<span class="rn-mark">' + mark + "</span></button>";
    }).join("");
    document.querySelectorAll("[data-rn-t]").forEach(function (b) { b.addEventListener("click", function () { select(b.getAttribute("data-rn-t")); }); });
    document.querySelectorAll("[data-rn-s]").forEach(function (b) { b.addEventListener("click", function () { select(curT, b.getAttribute("data-rn-s")); }); });

    document.getElementById("rn-title").textContent = ss.label;
    document.getElementById("rn-subtitle").textContent = tt.label + " · " + tt.source;
    const body = document.getElementById("rn-body");
    if (ss.exercise) exercise(body, tt, ss); else note(body, tt, ss);
  }

  function checksHtml(tt, ss) {
    return (ss.checks || []).map(function (q, i) {
      const key = tt.id + "/" + ss.id + "/" + i, a = ANS[key], pick = a && a.pick;
      return '<div class="ag-panel"><div class="ag-row-label" style="margin-bottom:6px">' + (i + 1) + ". " + q.q + '</div><div class="ag-ops">' +
        q.options.map(function (o) {
          const cls = pick === undefined ? "" : o === q.answer ? " is-answer" : o === pick ? " is-wrong-pick" : "";
          return '<button type="button" class="ag-op is-ui' + cls + '" data-rn-q="' + i + '" data-v="' + esc(o) + '"' + (pick === undefined ? "" : " disabled") + ">" + esc(o) + "</button>";
        }).join("") + "</div>" +
        (pick === undefined ? "" : '<div class="ag-status ' + (a.ok ? "is-right" : "is-wrong") + '" style="margin-top:8px"><strong>' + (a.ok ? "Correct." : "Not quite.") + "</strong> " + (a.ok ? "" : "Answer: <strong>" + esc(q.answer) + "</strong>. ") + q.why + "</div>") + "</div>";
    }).join("");
  }

  function note(body, tt, ss) {
    body.innerHTML =
      '<div class="ag-split">' +
        '<div class="ag-wrap"><p class="ag-lead2">' + ss.lead + "</p>" +
          (ss.points ? '<ul class="rn-points">' + ss.points.map(function (p) { return "<li>" + p + "</li>"; }).join("") + "</ul>" : "") +
          (ss.formula ? '<div class="ag-formula">' + ss.formula + "</div>" : "") + "</div>" +
        '<div class="ag-wrap">' + (ss.example ? '<div class="ag-panel"><div class="ag-panel-title">Example</div>' + ss.example + "</div>" : "") +
          '<div class="ag-explain"><span class="ag-explain-title">Check yourself</span>Answer the questions below before moving on. Each answer shows why.</div></div>' +
      "</div>" +
      (ss.figure ? '<div class="ag-panel rn-figure"><div class="ag-panel-title">' + (ss.figureTitle || "Figure") + "</div>" + ss.figure + "</div>" : "") +
      '<div class="rn-checks">' + checksHtml(tt, ss) + "</div>" +
      '<div class="ag-remember"><div class="ag-remember-title">Remember</div><ul>' + ss.remember.map(function (r) { return "<li>" + r + "</li>"; }).join("") + "</ul></div>";
    body.querySelectorAll("[data-rn-q]").forEach(function (b) {
      b.addEventListener("click", function () {
        const i = +b.getAttribute("data-rn-q"), q = ss.checks[i];
        ANS[tt.id + "/" + ss.id + "/" + i] = { pick: b.getAttribute("data-v"), ok: b.getAttribute("data-v") === q.answer };
        render();
      });
    });
  }

  function exercise(body, tt, ss) {
    const S = ST[ss.id] || (ST[ss.id] = { inputs: {}, step: 0, shown: false });
    const tasks = ss.tasks.map(function (t, i) {
      const key = tt.id + "/" + ss.id + "/" + i, a = ANS[key];
      if (t.type === "num") {
        return '<div class="ag-panel"><div class="ag-row-label" style="margin-bottom:6px">' + (i + 1) + ". " + t.label + '</div><div class="ag-ops">' +
          '<input class="ag-input" type="number" step="any" data-rn-in="' + i + '" value="' + esc(S.inputs[i] || "") + '"' + (a ? " disabled" : "") + ">" + (t.unit ? "<span>" + t.unit + "</span>" : "") +
          (a ? "" : '<button type="button" class="ag-tbtn ag-tbtn-primary" data-rn-check="' + i + '">Check</button>') + "</div>" +
          (a ? '<div class="ag-status ' + (a.ok ? "is-right" : "is-wrong") + '" style="margin-top:8px"><strong>' + (a.ok ? "Correct." : "Not quite.") + "</strong> " + (a.ok ? "" : "Answer: <strong>" + t.answer + (t.unit || "") + "</strong>.") + (t.hint && !a.ok ? " Hint: " + t.hint : "") + "</div>"
             : S["retry" + i] ? '<div class="ag-status is-wrong" style="margin-top:8px"><strong>Not quite &mdash; try once more.</strong>' + (t.hint ? " Hint: " + t.hint : "") + "</div>"
             : t.hint && S["hint" + i] ? '<div class="ag-status is-ask" style="margin-top:8px">Hint: ' + t.hint + "</div>" : t.hint ? '<button type="button" class="ag-tbtn" data-rn-hint="' + i + '" style="margin-top:8px">Hint</button>' : "") + "</div>";
      }
      const pick = a && a.pick;
      return '<div class="ag-panel"><div class="ag-row-label" style="margin-bottom:6px">' + (i + 1) + ". " + esc(t.q) + '</div><div class="ag-ops">' +
        t.options.map(function (o) {
          const cls = pick === undefined ? "" : o === t.answer ? " is-answer" : o === pick ? " is-wrong-pick" : "";
          return '<button type="button" class="ag-op is-ui' + cls + '" data-rn-mc="' + i + '" data-v="' + esc(o) + '"' + (pick === undefined ? "" : " disabled") + ">" + esc(o) + "</button>";
        }).join("") + "</div>" +
        (pick === undefined ? "" : '<div class="ag-status ' + (a.ok ? "is-right" : "is-wrong") + '" style="margin-top:8px"><strong>' + (a.ok ? "Correct." : "Not quite.") + "</strong> " + t.why + "</div>") + "</div>";
    }).join("");
    const n = ss.steps.length;
    const sol = S.shown
      ? '<div class="ag-toolbar"><div class="ag-step-count">Solution step ' + (S.step + 1) + " of " + n + '</div><div class="ag-controls">' +
          '<button type="button" class="ag-tbtn" data-rn-step="prev"' + (S.step === 0 ? " disabled" : "") + ">&larr; Previous Step</button>" +
          '<button type="button" class="ag-tbtn ag-tbtn-primary" data-rn-step="next"' + (S.step >= n - 1 ? " disabled" : "") + ">Next Step &rarr;</button>" +
          '<button type="button" class="ag-tbtn" data-rn-step="all">Show all</button>' +
          '<button type="button" class="ag-tbtn" data-rn-step="hide">Hide solution</button></div></div>' +
        '<ol class="rn-steps">' + ss.steps.slice(0, S.step + 1).map(function (s, i) { return '<li class="' + (i === S.step ? "is-new" : "") + '">' + s + "</li>"; }).join("") + "</ol>"
      : '<button type="button" class="ag-tbtn ag-tbtn-primary" data-rn-step="show">Show the worked solution step by step</button>';
    body.innerHTML =
      '<div class="ag-explain"><span class="ag-explain-title">Problem</span>' + ss.problem + "</div>" +
      (ss.figure ? '<div class="ag-panel rn-figure">' + ss.figure + "</div>" : "") +
      '<div class="rn-checks">' + tasks + "</div>" +
      '<div class="ag-panel rn-solution"><div class="ag-panel-title">Worked solution</div>' + sol + "</div>";
    body.querySelectorAll("[data-rn-in]").forEach(function (inp) {
      inp.addEventListener("input", function () { S.inputs[inp.getAttribute("data-rn-in")] = inp.value; });
      inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { const b = body.querySelector('[data-rn-check="' + inp.getAttribute("data-rn-in") + '"]'); if (b) b.click(); } });
    });
    body.querySelectorAll("[data-rn-check]").forEach(function (b) {
      b.addEventListener("click", function () {
        const i = +b.getAttribute("data-rn-check"), t = ss.tasks[i], v = parseFloat(S.inputs[i]);
        if (isNaN(v)) return;
        const ok = Math.abs(v - t.answer) <= t.tol + 1e-9;
        S.tries = S.tries || {};
        S.tries[i] = (S.tries[i] || 0) + 1;
        // One retry with the hint before the answer is revealed.
        if (ok || S.tries[i] >= 2) ANS[tt.id + "/" + ss.id + "/" + i] = { ok: ok };
        else S["retry" + i] = true;
        render();
      });
    });
    body.querySelectorAll("[data-rn-hint]").forEach(function (b) { b.addEventListener("click", function () { S["hint" + b.getAttribute("data-rn-hint")] = true; render(); }); });
    body.querySelectorAll("[data-rn-mc]").forEach(function (b) {
      b.addEventListener("click", function () {
        const i = +b.getAttribute("data-rn-mc"), t = ss.tasks[i];
        ANS[tt.id + "/" + ss.id + "/" + i] = { pick: b.getAttribute("data-v"), ok: b.getAttribute("data-v") === t.answer };
        render();
      });
    });
    body.querySelectorAll("[data-rn-step]").forEach(function (b) {
      b.addEventListener("click", function () {
        const a = b.getAttribute("data-rn-step");
        if (a === "show") { S.shown = true; S.step = 0; }
        if (a === "hide") S.shown = false;
        if (a === "next") S.step = Math.min(n - 1, S.step + 1);
        if (a === "prev") S.step = Math.max(0, S.step - 1);
        if (a === "all") S.step = n - 1;
        render();
      });
    });
  }

  const api = { TABS: TABS, TOTAL: TOTAL };
  if (typeof module !== "undefined" && module.exports) { module.exports = api; return; }
  window.ReadingNotes = api;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
