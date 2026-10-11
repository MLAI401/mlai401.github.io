/**
 * wumpus_engine.js — Wumpus World Knowledge-Based Agent (AIMA 4e, Ch. 7)
 * Part of MLAI401 Topic 05: Knowledge & Reasoning — playground.html#view-knowledge
 *
 * Implements:
 *   - The 4×4 Wumpus World environment (AIMA Fig 7.2) + presets + random worlds
 *   - A propositional KB:  Bxy ⇔ ∨P(adj),  Sxy ⇔ ∨W(adj),  ¬P11, ¬W11,
 *     "exactly one Wumpus" (1 at-least-one + 120 at-most-one clauses),
 *     percept sentences TELL'd at every step, and arrow / scream facts.
 *   - ASK by model checking (TT-Entails restricted to the symbols that matter):
 *       KB ⊨ α  ⇔  α is true in every model of the KB.
 *     Pit and Wumpus symbols share no rules, so they are checked separately;
 *     only the frontier symbols are enumerated (every other symbol is free).
 *   - Model counts + P(pit) with prior 0.2 (preview of AIMA §12.7).
 *   - A human-readable derivation ("why") for every entailed literal.
 *   - The Hybrid-Wumpus-Agent policy of AIMA Fig 7.20 (safe → shoot → risk → climb).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.WumpusEngine = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const N = 4;
  const PIT_PRIOR = 0.2;
  const K = (x, y) => x + ',' + y;
  const XY = k => k.split(',').map(Number);
  const ALL = [];
  for (let y = 1; y <= N; y++) for (let x = 1; x <= N; x++) ALL.push(K(x, y));
  const START = '1,1';

  function adj(k) {
    const [x, y] = XY(k), out = [];
    if (x > 1) out.push(K(x - 1, y));
    if (x < N) out.push(K(x + 1, y));
    if (y > 1) out.push(K(x, y - 1));
    if (y < N) out.push(K(x, y + 1));
    return out;
  }

  const DIRS = { up: [0, 1], right: [1, 0], down: [0, -1], left: [-1, 0] };
  const DIR_ARROW = { up: '↑', right: '→', down: '↓', left: '←' };

  function line(k, dir) {
    let [x, y] = XY(k);
    const [dx, dy] = DIRS[dir], out = [];
    for (;;) {
      x += dx; y += dy;
      if (x < 1 || y < 1 || x > N || y > N) return out;
      out.push(K(x, y));
    }
  }

  // ---- Formatting helpers (HTML) ----
  const lit = (s, k, neg) => { const [x, y] = XY(k); return `${neg ? '¬' : ''}${s}<sub>${x},${y}</sub>`; };
  const room = k => `[${k}]`;
  const orOf = (s, ks) => ks.map(k => lit(s, k)).join(' ∨ ');

  // ---- Seeded RNG ----
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // =========================================================================
  // Environment
  // =========================================================================
  const PRESETS = {
    aima:   { label: 'AIMA Fig 7.2 — classic world', pits: ['3,1', '3,3', '4,4'], wumpus: '1,3', gold: '2,3' },
    stuck:  { label: 'AIMA Fig 12.5 — logic gets stuck', pits: ['2,2', '3,4'], wumpus: '4,1', gold: '2,4' },
    breezy: { label: 'Breeze at the start', pits: ['2,1', '3,3'], wumpus: '1,4', gold: '4,4' },
    random: { label: 'Random world (pit prob. 0.2)' }
  };

  class World {
    constructor(cfg) {
      this.pits = new Set(cfg.pits || []);
      this.wumpus = cfg.wumpus || null;
      this.gold = cfg.gold || null;
    }
    static preset(name, seed) {
      if (name === 'random') return World.random(seed);
      return new World(PRESETS[name] || PRESETS.aima);
    }
    static random(seed) {
      const r = rng(seed || 1);
      const cells = ALL.filter(k => k !== START);
      const pits = cells.filter(() => r() < PIT_PRIOR);
      const wumpus = cells[Math.floor(r() * cells.length)];
      const free = cells.filter(k => !pits.includes(k));
      const gold = (free.length ? free : cells)[Math.floor(r() * (free.length || cells.length))];
      return new World({ pits, wumpus, gold });
    }
    clone() { return new World({ pits: [...this.pits], wumpus: this.wumpus, gold: this.gold }); }
    // Edit-mode cycle: empty → pit → wumpus → gold → empty
    cycle(k) {
      if (k === START) return;
      if (this.gold === k) { this.gold = null; return; }
      if (this.wumpus === k) { this.wumpus = null; this.gold = k; this.pits.delete(k); return; }
      if (this.pits.has(k)) { this.pits.delete(k); this.wumpus = k; return; }
      this.pits.add(k);
    }
    contents(k) {
      return { pit: this.pits.has(k), wumpus: this.wumpus === k, gold: this.gold === k };
    }
  }

  // =========================================================================
  // Knowledge base (background axioms for display / counting)
  // =========================================================================
  function backgroundAxioms(uniqueWumpus) {
    const ax = [
      { group: 'Start', html: `${lit('P', START, true)} ∧ ${lit('W', START, true)}` }
    ];
    ALL.forEach(k => ax.push({ group: 'Breeze rules', html: `${lit('B', k)} ⇔ (${orOf('P', adj(k))})` }));
    ALL.forEach(k => ax.push({ group: 'Stench rules', html: `${lit('S', k)} ⇔ (${orOf('W', adj(k))})` }));
    if (uniqueWumpus) {
      ax.push({ group: 'At least one Wumpus', html: ALL.map(k => lit('W', k)).join(' ∨ ') });
      for (let i = 0; i < ALL.length; i++)
        for (let j = i + 1; j < ALL.length; j++)
          ax.push({ group: 'At most one Wumpus', html: `¬${lit('W', ALL[i])} ∨ ¬${lit('W', ALL[j])}` });
    }
    return ax;
  }

  // =========================================================================
  // Session = environment + KB agent state
  // =========================================================================
  class Session {
    constructor(world, opts = {}) {
      this.world = world;
      this.uniqueWumpus = opts.uniqueWumpus !== false;
      this.reset();
    }

    reset() {
      this.pos = START;
      this.visited = new Set([START]);
      this.visitedAlive = new Set([START]); // visited while the Wumpus was alive ⇒ ¬W there
      this.sensed = new Map();               // room → { s, b, g }
      this.noW = new Set();                  // ¬W learned from an arrow that missed
      this.alive = true;
      this.wumpusAlive = true;
      this.hasArrow = true;
      this.hasGold = false;
      this.done = false;
      this.score = 0;
      this.actions = 0;
      this.t = 0;
      this.scream = false;
      this.bump = false;
      this.tells = [];   // percept sentences TELL'd so far
      this.log = [];
      this.history = [];
      this._inf = null;
      this._log('act', `Agent enters the cave at ${room(START)} facing east, holding 1 arrow.`);
      this._tell(`${lit('P', START, true)} ∧ ${lit('W', START, true)}`, 'start square is safe');
      this._perceive();
    }

    setUniqueWumpus(on) { this.uniqueWumpus = !!on; this._inf = null; }

    // ---- Snapshots (undo) ----
    _snap() {
      return JSON.stringify({
        pos: this.pos, visited: [...this.visited], visitedAlive: [...this.visitedAlive],
        sensed: [...this.sensed], noW: [...this.noW], alive: this.alive, wumpusAlive: this.wumpusAlive,
        hasArrow: this.hasArrow, hasGold: this.hasGold, done: this.done, score: this.score,
        actions: this.actions, t: this.t, scream: this.scream, bump: this.bump, tells: this.tells, log: this.log
      });
    }
    _push() { this.history.push(this._snap()); if (this.history.length > 200) this.history.shift(); }
    canUndo() { return this.history.length > 0; }
    undo() {
      if (!this.history.length) return false;
      const s = JSON.parse(this.history.pop());
      Object.assign(this, s);
      this.visited = new Set(s.visited); this.visitedAlive = new Set(s.visitedAlive);
      this.sensed = new Map(s.sensed); this.noW = new Set(s.noW);
      this._inf = null;
      return true;
    }

    // ---- Logging ----
    _log(type, html) { this.log.push({ t: this.t, type, html }); }
    _tell(html, note) {
      this.tells.push({ t: this.t, html });
      this._log('tell', `TELL(KB, ${html})${note ? ` <em>— ${note}</em>` : ''}`);
    }

    // ---- Percepts ----
    percept(k = this.pos) {
      const a = adj(k);
      return {
        stench: !!this.world.wumpus && a.includes(this.world.wumpus),
        breeze: a.some(n => this.world.pits.has(n)),
        glitter: this.world.gold === k && !this.hasGold,
        bump: this.bump,
        scream: this.scream
      };
    }

    _perceive() {
      const before = this._inf ? this._inf : this.infer();
      const p = this.percept();
      const k = this.pos;
      const vec = `[${p.stench ? 'Stench' : 'None'}, ${p.breeze ? 'Breeze' : 'None'}, ${p.glitter ? 'Glitter' : 'None'}, ${p.bump ? 'Bump' : 'None'}, ${p.scream ? 'Scream' : 'None'}]`;
      this._log('percept', `t=${this.t} at ${room(k)} percept = ${vec}`);
      if (!this.sensed.has(k)) {
        this._tell(`${lit('S', k, !p.stench)} ∧ ${lit('B', k, !p.breeze)}`);
      }
      this.sensed.set(k, { s: p.stench, b: p.breeze, g: p.glitter });
      this._inf = null;
      this._reportNew(before);
    }

    // After new knowledge, ASK the KB about every room and log what became entailed.
    _reportNew(before) {
      const after = this.infer();
      const fresh = [];
      ALL.forEach(k => {
        const a = after.cells[k], b = before.cells[k];
        if (a.safe && !b.safe && !this.visited.has(k)) fresh.push(`${lit('OK', k)} <span class="wq-ok">safe</span>`);
        if (a.pit === 'yes' && b.pit !== 'yes') fresh.push(`${lit('P', k)} <span class="wq-bad">pit</span>`);
        if (a.wumpus === 'yes' && b.wumpus !== 'yes') fresh.push(`${lit('W', k)} <span class="wq-bad">Wumpus</span>`);
      });
      if (fresh.length) this._log('ask', `ASK ⇒ KB ⊨ ${fresh.join(', ')}`);
    }

    // =====================================================================
    // Inference by model checking
    // =====================================================================
    infer() {
      if (this._inf) return this._inf;
      const sensed = [...this.sensed];
      const cells = {};
      ALL.forEach(k => { cells[k] = { pit: 'unknown', wumpus: 'unknown', pPit: PIT_PRIOR, pW: 0 }; });

      // ---------- Pits: independent symbols, enumerate the frontier ----------
      const pitCons = sensed.map(([k, v]) => ({ k, val: v.b, vars: adj(k).filter(n => !this.visited.has(n)) }));
      const pf = [...new Set(pitCons.flatMap(c => c.vars))];
      const pit = this._enumerate(pf, pitCons, PIT_PRIOR);
      ALL.forEach(k => {
        const c = cells[k];
        if (this.visited.has(k)) { c.pit = 'no'; c.pPit = 0; return; }
        const i = pf.indexOf(k);
        if (i < 0) return;
        c.pit = pit.trueCount[i] === 0 ? 'no' : pit.trueCount[i] === pit.models ? 'yes' : 'maybe';
        c.pPit = pit.weight ? pit.trueWeight[i] / pit.weight : 0;
      });

      // ---------- Wumpus ----------
      const excludedW = k => this.visitedAlive.has(k) || this.noW.has(k) || k === START;
      const anyStench = sensed.some(([, v]) => v.s);
      let wInfo;
      if (this.uniqueWumpus) {
        // Exactly one Wumpus ⇒ a model is just "which room holds it".
        const cand = ALL.filter(c => !excludedW(c) && sensed.every(([k, v]) => v.s === adj(k).includes(c)));
        ALL.forEach(k => {
          const c = cells[k];
          if (!cand.includes(k)) { c.wumpus = 'no'; c.pW = 0; return; }
          c.pW = 1 / cand.length;
          c.wumpus = cand.length === 1 ? 'yes' : (anyStench ? 'maybe' : 'unknown');
        });
        wInfo = { models: cand.length, candidates: cand, frontier: cand };
      } else {
        const wCons = sensed.map(([k, v]) => ({ k, val: v.s, vars: adj(k).filter(n => !excludedW(n)) }));
        const wf = [...new Set(wCons.flatMap(c => c.vars))];
        const prior = 1 / (ALL.length - 1);
        const w = this._enumerate(wf, wCons, prior);
        ALL.forEach(k => {
          const c = cells[k];
          if (excludedW(k)) { c.wumpus = 'no'; c.pW = 0; return; }
          const i = wf.indexOf(k);
          if (i < 0) { c.pW = prior; return; }
          c.wumpus = w.trueCount[i] === 0 ? 'no' : w.trueCount[i] === w.models ? 'yes' : 'maybe';
          c.pW = w.weight ? w.trueWeight[i] / w.weight : 0;
        });
        wInfo = { models: w.models, candidates: ALL.filter(k => cells[k].wumpus !== 'no'), frontier: wf };
      }

      // ---------- Derived: OK (safe) and danger ----------
      ALL.forEach(k => {
        const c = cells[k];
        const wSafe = c.wumpus === 'no' || !this.wumpusAlive;
        c.safe = c.pit === 'no' && wSafe;
        c.danger = c.pit === 'yes' || (c.wumpus === 'yes' && this.wumpusAlive);
        c.risk = 1 - (1 - c.pPit) * (1 - (this.wumpusAlive ? c.pW : 0));
      });

      this._inf = { cells, pit: { models: pit.models, frontier: pf }, wumpus: wInfo };
      return this._inf;
    }

    // Enumerate all assignments of `vars`; keep those satisfying every
    // "percept ⇔ (v1 ∨ v2 ∨ …)" constraint. Returns counts and prior weights.
    _enumerate(vars, cons, prior) {
      const n = vars.length;
      const idx = cons.map(c => ({ val: c.val, ix: c.vars.map(v => vars.indexOf(v)) }));
      const trueCount = new Array(n).fill(0), trueWeight = new Array(n).fill(0);
      let models = 0, weight = 0;
      for (let m = 0; m < (1 << n); m++) {
        let ok = true;
        for (const c of idx) {
          const any = c.ix.some(i => (m >> i) & 1);
          if (any !== c.val) { ok = false; break; }
        }
        if (!ok) continue;
        let w = 1, ones = 0;
        for (let i = 0; i < n; i++) { if ((m >> i) & 1) { w *= prior; ones++; } else w *= (1 - prior); }
        models++; weight += w;
        for (let i = 0; i < n; i++) if ((m >> i) & 1) { trueCount[i]++; trueWeight[i] += w; }
      }
      return { models, weight, trueCount, trueWeight };
    }

    // =====================================================================
    // Explanations: a short derivation for each ASK result
    // =====================================================================
    explain(k) {
      const inf = this.infer();
      const c = inf.cells[k];
      const out = { pit: '', wumpus: '' };
      const sensedAdj = adj(k).filter(n => this.sensed.has(n));

      // ---- Pit ----
      if (this.visited.has(k)) {
        out.pit = `The agent stood in ${room(k)} and is alive ⇒ ${lit('P', k, true)}.`;
      } else if (c.pit === 'no') {
        const s = sensedAdj.find(n => !this.sensed.get(n).b);
        out.pit = `${lit('B', s, true)} was perceived and ${lit('B', s)} ⇔ (${orOf('P', adj(s))}). ` +
          `⇔-elimination and De Morgan give ${adj(s).map(m => lit('P', m, true)).join(' ∧ ')} ⇒ <b>${lit('P', k, true)}</b>.`;
      } else if (c.pit === 'yes') {
        const s = sensedAdj.find(n => this.sensed.get(n).b && adj(n).filter(m => m !== k).every(m => inf.cells[m].pit === 'no'));
        if (s) {
          const others = adj(s).filter(m => m !== k);
          out.pit = `${lit('B', s)} ⇒ (${orOf('P', adj(s))}). ` +
            `${others.length ? others.map(m => lit('P', m, true)).join(', ') + ' are already entailed, so u' : 'U'}nit resolution leaves <b>${lit('P', k)}</b>.`;
        } else out.pit = `${lit('P', k)} is true in all ${inf.pit.models} models of the KB.`;
      } else if (c.pit === 'maybe') {
        const b = sensedAdj.filter(n => this.sensed.get(n).b);
        out.pit = `Not entailed either way: breeze at ${b.map(room).join(', ')} can be explained with or without a pit here. ` +
          `P(pit) ≈ <b>${(c.pPit * 100).toFixed(0)}%</b> over the ${inf.pit.models} consistent frontier models (prior 0.2).`;
      } else {
        out.pit = `No percept mentions ${lit('P', k)} yet — it is a free symbol (prior P(pit) = 0.2).`;
      }

      // ---- Wumpus ----
      const stenchRooms = [...this.sensed].filter(([, v]) => v.s).map(([r]) => r);
      if (this.visitedAlive.has(k)) {
        out.wumpus = `The agent stood in ${room(k)} while the Wumpus was alive and survived ⇒ ${lit('W', k, true)}.`;
      } else if (k === START) {
        out.wumpus = `Axiom: ${lit('W', START, true)}.`;
      } else if (c.wumpus === 'no') {
        const s = sensedAdj.find(n => !this.sensed.get(n).s);
        const yes = inf.wumpus.candidates.length === 1 && this.uniqueWumpus ? inf.wumpus.candidates[0] : null;
        const far = this.uniqueWumpus ? stenchRooms.find(r => !adj(r).includes(k)) : null;
        if (this.noW.has(k)) out.wumpus = `The arrow flew through ${room(k)} and there was no scream ⇒ ${lit('W', k, true)}.`;
        else if (s) out.wumpus = `${lit('S', s, true)} was perceived and ${lit('S', s)} ⇔ (${orOf('W', adj(s))}) ⇒ <b>${lit('W', k, true)}</b>.`;
        else if (yes && yes !== k) out.wumpus = `The KB already entails ${lit('W', yes)}; with the at-most-one axiom ¬${lit('W', yes)} ∨ ¬${lit('W', k)} ⇒ <b>${lit('W', k, true)}</b>.`;
        else if (far) out.wumpus = `${lit('S', far)} puts the Wumpus in {${adj(far).map(room).join(', ')}}. ${room(k)} is not in that set, and there is exactly one Wumpus ⇒ <b>${lit('W', k, true)}</b>.`;
        else out.wumpus = `${lit('W', k)} is false in every model of the KB.`;
      } else if (c.wumpus === 'yes') {
        const s = stenchRooms.find(r => adj(r).includes(k));
        const others = s ? adj(s).filter(m => m !== k) : [];
        out.wumpus = s
          ? `${lit('S', s)} ⇒ (${orOf('W', adj(s))}). ${others.map(m => lit('W', m, true)).join(', ')} are entailed, so <b>${lit('W', k)}</b>.`
          : `${lit('W', k)} is true in every model of the KB.`;
        if (!this.wumpusAlive) out.wumpus += ' The scream told us it is dead — the room is now harmless.';
      } else if (c.wumpus === 'maybe') {
        out.wumpus = `Not entailed: ${inf.wumpus.models} consistent placements remain${this.uniqueWumpus ? ` (${inf.wumpus.candidates.map(room).join(', ')})` : ''}. P(Wumpus here) ≈ <b>${(c.pW * 100).toFixed(0)}%</b>.`;
      } else {
        out.wumpus = this.uniqueWumpus
          ? `No stench yet, so the Wumpus may be in any of ${inf.wumpus.models} unexcluded rooms (P ≈ ${(c.pW * 100).toFixed(0)}%).`
          : `No percept mentions ${lit('W', k)} yet — it is a free symbol.`;
      }
      return out;
    }

    // =====================================================================
    // Actions
    // =====================================================================
    get over() { return !this.alive || this.done; }

    canMoveTo(k) {
      if (this.over || k === this.pos) return false;
      return this.visited.has(k) || adj(k).some(n => this.visited.has(n));
    }

    // Shortest route through visited (known-safe) rooms; last step may be new.
    route(target, from = this.pos) {
      const prev = new Map([[from, null]]), q = [from];
      while (q.length) {
        const u = q.shift();
        if (u === target) break;
        for (const v of adj(u)) {
          if (prev.has(v)) continue;
          if (v !== target && !this.visited.has(v)) continue;
          prev.set(v, u); q.push(v);
        }
      }
      if (!prev.has(target)) return null;
      const path = [];
      for (let u = target; u !== from; u = prev.get(u)) path.unshift(u);
      return path;
    }

    moveTo(k, why) {
      if (!this.canMoveTo(k)) return false;
      const path = this.route(k);
      if (!path) return false;
      this._push();
      this.scream = false; this.bump = false;
      const inf = this.infer();
      const status = inf.cells[k];
      this.t += path.length;
      this.actions += path.length;
      this.score -= path.length;
      this.pos = k;
      const isNew = !this.visited.has(k);
      const tag = !isNew ? '' : status.safe ? ' <span class="wq-ok">(KB ⊨ OK — proven safe)</span>'
        : status.danger ? ' <span class="wq-bad">(KB ⊨ danger!)</span>' : ' <span class="wq-warn">(not provably safe — a gamble)</span>';
      this._log('act', `${why ? why + ' ' : ''}Move ${path.length > 1 ? `via ${path.slice(0, -1).map(room).join(' → ')} ` : ''}to ${room(k)}${tag}`);

      const w = this.world;
      if (w.pits.has(k) || (w.wumpus === k && this.wumpusAlive)) {
        this.alive = false;
        this.score -= 1000;
        this.visited.add(k);
        this._log('death', w.pits.has(k) ? `💀 Fell into the pit at ${room(k)}. Score −1000.` : `💀 Eaten by the Wumpus at ${room(k)}. Score −1000.`);
        this._inf = null;
        return true;
      }
      if (isNew) {
        const before = this.infer();
        this.visited.add(k);
        if (this.wumpusAlive) this.visitedAlive.add(k);
        this._inf = null;
        this._tell(`${lit('P', k, true)}${this.wumpusAlive ? ' ∧ ' + lit('W', k, true) : ''}`, 'survived entering the room');
        this._reportNew(before);
        this._perceive();
      }
      return true;
    }

    grab() {
      if (this.over || !this.percept().glitter) return false;
      this._push();
      this.t++; this.actions++; this.score -= 1;
      this.hasGold = true;
      this._log('act', `Glitter ⇒ <b>Grab</b>. The agent now holds the gold 🪙`);
      return true;
    }

    shoot(dir) {
      if (this.over || !this.hasArrow || !DIRS[dir]) return false;
      this._push();
      const before = this.infer();
      this.t++; this.actions++; this.score -= 11; // −1 action, −10 arrow
      this.hasArrow = false;
      const cells = line(this.pos, dir);
      this._log('act', `<b>Shoot</b> ${DIR_ARROW[dir]} from ${room(this.pos)} (−10) along ${cells.map(room).join(', ') || 'the wall'}`);
      if (this.wumpusAlive && cells.includes(this.world.wumpus)) {
        this.wumpusAlive = false; this.scream = true;
        this._tell('Scream ⇒ ¬WumpusAlive', 'the Wumpus is dead');
      } else {
        this.scream = false;
        cells.forEach(c => this.noW.add(c));
        if (cells.length) this._tell(`¬Scream ⇒ ${cells.map(c => lit('W', c, true)).join(' ∧ ')}`, 'the arrow missed');
      }
      this._inf = null;
      this._reportNew(before);
      return true;
    }

    climb() {
      if (this.over || this.pos !== START) return false;
      this._push();
      this.t++; this.actions++; this.score -= 1;
      this.done = true;
      if (this.hasGold) { this.score += 1000; this._log('win', `🏆 Climbed out with the gold. +1000 → final score ${this.score}.`); }
      else this._log('win', `Climbed out without the gold. Final score ${this.score}.`);
      return true;
    }

    // =====================================================================
    // Hybrid-Wumpus-Agent (AIMA Fig 7.20), one action per call
    // riskPolicy: 'gamble' (take the least-risky unproven room) | 'cautious' (go home)
    // =====================================================================
    plan(riskPolicy = 'gamble') {
      if (this.over) return null;
      const inf = this.infer();
      const p = this.percept();
      if (p.glitter) return { type: 'grab', why: 'Glitter perceived ⇒' };
      if (this.hasGold) {
        return this.pos === START ? { type: 'climb', why: 'Holding the gold at [1,1] ⇒' }
          : { type: 'move', target: START, why: 'Holding the gold ⇒ PLAN-ROUTE home:' };
      }
      const dist = k => { const r = this.route(k); return r ? r.length : Infinity; };
      const frontier = ALL.filter(k => !this.visited.has(k) && adj(k).some(n => this.visited.has(n)));
      const safe = frontier.filter(k => inf.cells[k].safe).sort((a, b) => dist(a) - dist(b));
      if (safe.length) return { type: 'move', target: safe[0], why: `KB ⊨ ${lit('OK', safe[0])} ⇒` };

      // PLAN-SHOT: a room that is pit-free but may hold the Wumpus is worth an arrow.
      if (this.hasArrow && this.wumpusAlive) {
        const targets = ALL.filter(k => inf.cells[k].pit === 'no' && inf.cells[k].wumpus !== 'no' && !this.visited.has(k) && adj(k).some(n => this.visited.has(n)));
        let best = null;
        for (const from of this.visited) {
          for (const d of Object.keys(DIRS)) {
            const hits = line(from, d).filter(c => targets.includes(c)).length;
            if (!hits) continue;
            const cost = (from === this.pos ? 0 : dist(from)) - hits * 0.1;
            if (!best || cost < best.cost) best = { from, d, cost };
          }
        }
        if (best) {
          if (best.from === this.pos) return { type: 'shoot', dir: best.d, why: 'No safe room; a pit-free room may hide the Wumpus ⇒ PLAN-SHOT:' };
          return { type: 'move', target: best.from, why: 'Lining up a shot ⇒' };
        }
      }

      if (riskPolicy === 'gamble') {
        const cand = frontier.filter(k => !inf.cells[k].danger).sort((a, b) => inf.cells[a].risk - inf.cells[b].risk || dist(a) - dist(b));
        if (cand.length) return { type: 'move', target: cand[0], risky: true, why: `No room is provably safe ⇒ gamble on the least risky (risk ≈ ${(inf.cells[cand[0]].risk * 100).toFixed(0)}%):` };
      }
      return this.pos === START ? { type: 'climb', why: 'Nothing is provably safe ⇒ give up:' }
        : { type: 'move', target: START, why: 'Nothing is provably safe ⇒ head home:' };
    }

    step(riskPolicy) {
      const a = this.plan(riskPolicy);
      if (!a) return null;
      if (a.type === 'move') this.moveTo(a.target, a.why);
      else if (a.type === 'grab') { this._log('ask', `ASK(KB, action) ⇒ ${a.why} Grab`); this.grab(); }
      else if (a.type === 'shoot') { this._log('ask', `ASK(KB, action) ⇒ ${a.why} Shoot ${DIR_ARROW[a.dir]}`); this.shoot(a.dir); }
      else if (a.type === 'climb') { this._log('ask', `ASK(KB, action) ⇒ ${a.why} Climb`); this.climb(); }
      return a;
    }

    kbSize() {
      return { axioms: backgroundAxioms(this.uniqueWumpus).length, percepts: this.tells.length };
    }
  }

  return { N, ALL, START, PIT_PRIOR, PRESETS, DIR_ARROW, adj, line, lit, World, Session, backgroundAxioms };
}));
