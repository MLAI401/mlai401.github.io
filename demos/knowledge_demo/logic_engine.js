/**
 * logic_engine.js — Zero-dependency Propositional & Horn Logic Inference Engine
 * Part of MLAI401 Topic 05: Knowledge & Reasoning
 * Implements:
 *   - Logical Expression Parser (AST representation)
 *   - Truth Table Model Checking (TT-Entails)
 *   - 4-Step Conjunctive Normal Form (CNF) Transformation
 *   - Propositional Resolution Refutation Theorem Prover (PL-Resolution)
 *   - Linear-Time Horn Clause Forward Chaining (PL-FC-Entails)
 *   - Wumpus World Environment & Percept-to-KB Integrator
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LogicEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // --- Expression AST Definition ---
  class Expr {
    constructor(op, ...args) {
      this.op = String(op);
      this.args = args;
    }

    toString() {
      if (!this.args || this.args.length === 0) return this.op;
      if (this.args.length === 1 && (this.op === '~' || this.op === '¬')) {
        return `¬${this.args[0].toString()}`;
      }
      if (this.args.length === 2) {
        const symMap = { '&': '∧', '|': '∨', '>>': '⇒', '<=>': '⇔' };
        const sym = symMap[this.op] || this.op;
        return `(${this.args[0].toString()} ${sym} ${this.args[1].toString()})`;
      }
      return `${this.op}(${this.args.map(a => a.toString()).join(', ')})`;
    }

    equals(other) {
      if (!other || this.op !== other.op) return false;
      if (this.args.length !== other.args.length) return false;
      for (let i = 0; i < this.args.length; i++) {
        if (!this.args[i].equals(other.args[i])) return false;
      }
      return true;
    }
  }

  // --- Top-Level Expression Parser ---
  function parseExpr(s) {
    if (s instanceof Expr) return s;
    if (typeof s !== 'string') return new Expr(String(s));
    s = s.trim();
    if (!s) return null;

    // 1. Biconditional (<=>, ⇔)
    for (const bi of ['<=>', '⇔', '<==>']) {
      const parts = splitTopLevel(s, bi);
      if (parts.length === 2) {
        return new Expr('<=>', parseExpr(parts[0]), parseExpr(parts[1]));
      }
    }

    // 2. Implication (>>, =>, ==>, ⇒)
    for (const imp of ['>>', '==>', '=>', '⇒']) {
      const parts = splitTopLevel(s, imp);
      if (parts.length === 2) {
        return new Expr('>>', parseExpr(parts[0]), parseExpr(parts[1]));
      }
    }

    // 3. Disjunction (|, ∨, ||)
    for (const orOp of ['|', '∨', '||']) {
      const parts = splitTopLevel(s, orOp);
      if (parts.length > 1) {
        let res = parseExpr(parts[0]);
        for (let i = 1; i < parts.length; i++) {
          res = new Expr('|', res, parseExpr(parts[i]));
        }
        return res;
      }
    }

    // 4. Conjunction (&, ∧, &&)
    for (const andOp of ['&', '∧', '&&']) {
      const parts = splitTopLevel(s, andOp);
      if (parts.length > 1) {
        let res = parseExpr(parts[0]);
        for (let i = 1; i < parts.length; i++) {
          res = new Expr('&', res, parseExpr(parts[i]));
        }
        return res;
      }
    }

    // 5. Negation (~, ¬, !)
    if (s.startsWith('~') || s.startsWith('¬') || s.startsWith('!')) {
      return new Expr('~', parseExpr(s.slice(1)));
    }

    // 6. Parentheses stripping
    if (s.startsWith('(') && s.endsWith(')')) {
      if (isEnclosed(s)) {
        return parseExpr(s.slice(1, -1));
      }
    }

    return new Expr(s);
  }

  function isEnclosed(s) {
    if (!s.startsWith('(') || !s.endsWith(')')) return false;
    let depth = 0;
    for (let i = 0; i < s.length; i++) {
      if (s[i] === '(') depth++;
      else if (s[i] === ')') {
        depth--;
        if (depth === 0 && i < s.length - 1) return false;
      }
    }
    return depth === 0;
  }

  function splitTopLevel(s, op) {
    let depth = 0;
    const opLen = op.length;
    let i = 0;
    while (i <= s.length - opLen) {
      const c = s[i];
      if (c === '(') depth++;
      else if (c === ')') depth--;
      else if (depth === 0 && s.substring(i, i + opLen) === op) {
        return [s.substring(0, i), s.substring(i + opLen)];
      }
      i++;
    }
    return [s];
  }

  function getPropSymbols(expr) {
    const symbols = new Set();
    function traverse(e) {
      if (!e) return;
      if (!e.args || e.args.length === 0) {
        if (e.op !== 'True' && e.op !== 'False') symbols.add(e.op);
      } else {
        e.args.forEach(traverse);
      }
    }
    traverse(expr);
    return Array.from(symbols).sort();
  }

  function plTrue(exp, model) {
    if (exp === true || exp === 'True') return true;
    if (exp === false || exp === 'False') return false;
    if (!(exp instanceof Expr)) exp = parseExpr(exp);

    const { op, args } = exp;
    if (!args || args.length === 0) {
      if (op in model) return Boolean(model[op]);
      return false;
    }
    if (op === '~' || op === '¬' || op === '!') return !plTrue(args[0], model);
    if (op === '&' || op === '∧') return plTrue(args[0], model) && plTrue(args[1], model);
    if (op === '|' || op === '∨') return plTrue(args[0], model) || plTrue(args[1], model);
    if (op === '>>' || op === '⇒' || op === '==>') {
      return !plTrue(args[0], model) || plTrue(args[1], model);
    }
    if (op === '<=>' || op === '⇔') {
      return plTrue(args[0], model) === plTrue(args[1], model);
    }
    return false;
  }

  // --- TT-Entails (Model Checking) ---
  function ttEntails(kb, alpha) {
    const kbExpr = combineConjunctions(kb);
    const alphaExpr = parseExpr(alpha);
    const symbols = Array.from(new Set([...getPropSymbols(kbExpr), ...getPropSymbols(alphaExpr)])).sort();
    
    const rows = [];
    let isEntailed = true;
    let kbTrueCount = 0;

    function checkAll(syms, model) {
      if (syms.length === 0) {
        const kbVal = plTrue(kbExpr, model);
        const alphaVal = plTrue(alphaExpr, model);
        rows.push({ model: { ...model }, kbVal, alphaVal });
        if (kbVal) {
          kbTrueCount++;
          if (!alphaVal) isEntailed = false;
        }
        return;
      }
      const p = syms[0];
      const rest = syms.slice(1);
      checkAll(rest, { ...model, [p]: true });
      checkAll(rest, { ...model, [p]: false });
    }

    checkAll(symbols, {});
    return {
      entailed: isEntailed,
      symbols,
      rows,
      totalModels: rows.length,
      kbTrueCount
    };
  }

  function combineConjunctions(kb) {
    if (Array.isArray(kb)) {
      if (kb.length === 0) return new Expr('True');
      let res = parseExpr(kb[0]);
      for (let i = 1; i < kb.length; i++) {
        res = new Expr('&', res, parseExpr(kb[i]));
      }
      return res;
    }
    return parseExpr(kb);
  }

  // --- CNF Conversion Pipeline ---
  function toCNF(s, logSteps = false) {
    let current = parseExpr(s);
    const steps = [
      { step: 0, title: 'Original Expression', expr: current.toString() }
    ];

    // Step 1: Eliminate <=>
    current = elimBiconditionals(current);
    steps.push({ step: 1, title: 'Eliminate Biconditionals (A ⇔ B ≡ (A ⇒ B) ∧ (B ⇒ A))', expr: current.toString() });

    // Step 2: Eliminate =>
    current = elimImplications(current);
    steps.push({ step: 2, title: 'Eliminate Implications (A ⇒ B ≡ ¬A ∨ B)', expr: current.toString() });

    // Step 3: Move ~ inwards (De Morgan)
    current = moveNotInwards(current);
    steps.push({ step: 3, title: 'Move Negations Inward (De Morgan & Double Negation)', expr: current.toString() });

    // Step 4: Distribute | over &
    current = distributeOrOverAnd(current);
    steps.push({ step: 4, title: 'Distribute Disjunction (A ∨ (B ∧ C) ≡ (A ∨ B) ∧ (A ∨ C))', expr: current.toString() });

    return { cnf: current, steps };
  }

  function elimBiconditionals(s) {
    if (!s || !s.args || s.args.length === 0) return s;
    const args = s.args.map(elimBiconditionals);
    if (s.op === '<=>') {
      return new Expr('&', new Expr('>>', args[0], args[1]), new Expr('>>', args[1], args[0]));
    }
    return new Expr(s.op, ...args);
  }

  function elimImplications(s) {
    if (!s || !s.args || s.args.length === 0) return s;
    const args = s.args.map(elimImplications);
    if (s.op === '>>') {
      return new Expr('|', new Expr('~', args[0]), args[1]);
    }
    return new Expr(s.op, ...args);
  }

  function moveNotInwards(s) {
    if (!s || !s.args || s.args.length === 0) return s;
    if (s.op === '~' || s.op === '¬') {
      const a = s.args[0];
      if (a.op === '~' || a.op === '¬') {
        return moveNotInwards(a.args[0]);
      }
      if (a.op === '&') {
        return new Expr('|', moveNotInwards(new Expr('~', a.args[0])), moveNotInwards(new Expr('~', a.args[1])));
      }
      if (a.op === '|') {
        return new Expr('&', moveNotInwards(new Expr('~', a.args[0])), moveNotInwards(new Expr('~', a.args[1])));
      }
      return s;
    }
    return new Expr(s.op, ...s.args.map(moveNotInwards));
  }

  function distributeOrOverAnd(s) {
    if (!s || !s.args || s.args.length === 0) return s;
    if (s.op === '|') {
      const a = distributeOrOverAnd(s.args[0]);
      const b = distributeOrOverAnd(s.args[1]);
      if (a.op === '&') {
        return new Expr('&', distributeOrOverAnd(new Expr('|', a.args[0], b)), distributeOrOverAnd(new Expr('|', a.args[1], b)));
      }
      if (b.op === '&') {
        return new Expr('&', distributeOrOverAnd(new Expr('|', a, b.args[0])), distributeOrOverAnd(new Expr('|', a, b.args[1])));
      }
      return new Expr('|', a, b);
    }
    return new Expr(s.op, ...s.args.map(distributeOrOverAnd));
  }

  function extractClauses(cnfExpr) {
    const clauses = [];
    function collectConjunctions(e) {
      if (e.op === '&') {
        collectConjunctions(e.args[0]);
        collectConjunctions(e.args[1]);
      } else {
        clauses.push(extractLiterals(e));
      }
    }
    function extractLiterals(e) {
      if (e.op === '|') {
        return [...extractLiterals(e.args[0]), ...extractLiterals(e.args[1])];
      }
      return [e.toString()];
    }
    collectConjunctions(cnfExpr);
    // Deduplicate literals per clause and clauses
    return clauses.map(c => Array.from(new Set(c)).sort());
  }

  // --- PL-Resolution Refutation Algorithm ---
  function plResolution(kb, alpha) {
    const kbExpr = combineConjunctions(kb);
    const alphaExpr = parseExpr(alpha);
    const combined = new Expr('&', kbExpr, new Expr('~', alphaExpr));
    const cnfRes = toCNF(combined);
    let clauseList = extractClauses(cnfRes.cnf);

    const initialClauses = clauseList.map(c => [...c]);
    const trace = [];
    let derivedContradiction = false;

    // Normalizing clause representation as sorted string
    function clauseKey(c) {
      return Array.from(new Set(c)).sort().join(' ∨ ') || '□';
    }

    const seenClauses = new Set(clauseList.map(clauseKey));
    let stepCount = 0;
    const maxSteps = 100;

    while (stepCount < maxSteps) {
      stepCount++;
      let newClauseFound = false;
      const currentPairs = [];

      for (let i = 0; i < clauseList.length; i++) {
        for (let j = i + 1; j < clauseList.length; j++) {
          const c1 = clauseList[i];
          const c2 = clauseList[j];
          const resolvents = resolvePair(c1, c2);

          for (const res of resolvents) {
            const key = clauseKey(res);
            if (res.length === 0 || key === '□') {
              trace.push({
                step: stepCount,
                c1: clauseKey(c1),
                c2: clauseKey(c2),
                resolvent: '□ (Contradiction)',
                isEmpty: true
              });
              derivedContradiction = true;
              return { entailed: true, initialClauses, trace, totalSteps: stepCount };
            }
            if (!seenClauses.has(key)) {
              seenClauses.add(key);
              clauseList.push(res);
              trace.push({
                step: stepCount,
                c1: clauseKey(c1),
                c2: clauseKey(c2),
                resolvent: key,
                isEmpty: false
              });
              newClauseFound = true;
            }
          }
        }
      }

      if (!newClauseFound) break;
    }

    return { entailed: derivedContradiction, initialClauses, trace, totalSteps: stepCount };
  }

  function resolvePair(c1, c2) {
    const resolvents = [];
    for (const lit1 of c1) {
      for (const lit2 of c2) {
        const isComplement = (lit1.startsWith('¬') && lit1.slice(1) === lit2) ||
                             (lit2.startsWith('¬') && lit2.slice(1) === lit1) ||
                             (lit1.startsWith('~') && lit1.slice(1) === lit2) ||
                             (lit2.startsWith('~') && lit2.slice(1) === lit1);
        if (isComplement) {
          const rem1 = c1.filter(l => l !== lit1);
          const rem2 = c2.filter(l => l !== lit2);
          const combined = Array.from(new Set([...rem1, ...rem2])).sort();
          // Check for tautology
          const hasTautology = combined.some(l => combined.includes('¬' + l) || combined.includes('~' + l));
          if (!hasTautology) {
            resolvents.push(combined);
          }
        }
      }
    }
    return resolvents;
  }

  // --- Horn Clause Forward Chaining (PL-FC-Entails) ---
  function plFCEntails(rules, initialFacts, query) {
    // rules format: [{ premises: ['A', 'B'], conclusion: 'C' }]
    const count = {};
    rules.forEach((r, idx) => {
      count[idx] = r.premises.length;
    });

    const inferred = {};
    const agenda = [...initialFacts];
    initialFacts.forEach(f => { inferred[f] = true; });

    const trace = [];
    let goalReached = false;

    while (agenda.length > 0) {
      const p = agenda.shift();
      trace.push({ type: 'pop', symbol: p });

      if (p === query) {
        goalReached = true;
        break;
      }

      rules.forEach((rule, idx) => {
        if (rule.premises.includes(p)) {
          count[idx]--;
          trace.push({
            type: 'decrement',
            ruleIdx: idx,
            ruleStr: `${rule.premises.join(' ∧ ')} ⇒ ${rule.conclusion}`,
            remCount: count[idx],
            symbol: p
          });
          if (count[idx] === 0) {
            if (!inferred[rule.conclusion]) {
              inferred[rule.conclusion] = true;
              agenda.push(rule.conclusion);
              trace.push({
                type: 'fire',
                ruleIdx: idx,
                conclusion: rule.conclusion,
                ruleStr: `${rule.premises.join(' ∧ ')} ⇒ ${rule.conclusion}`
              });
            }
          }
        }
      });
    }

    return {
      entailed: goalReached,
      trace,
      inferredSymbols: Object.keys(inferred)
    };
  }

  // --- Wumpus World Environment & Logic State ---
  class WumpusLogicWorld {
    constructor(gridSize = 4) {
      this.gridSize = gridSize;
      this.agentPos = { x: 1, y: 1 };
      this.visited = new Set(['1,1']);
      this.kb = [
        parseExpr('¬P11'),
        parseExpr('¬W11')
      ];
      this.percepts = {
        breeze: new Set(),
        stench: new Set(),
        glitter: new Set()
      };
      this.pits = new Set(['1,3', '3,1', '3,3', '4,4']);
      this.wumpus = '1,4';
      this.gold = '2,3';
      this.initPhysicsRules();
    }

    initPhysicsRules() {
      for (let x = 1; x <= this.gridSize; x++) {
        for (let y = 1; y <= this.gridSize; y++) {
          const adj = this.getAdjacent(x, y);
          if (adj.length > 0) {
            const pitOr = adj.map(p => `P${p.x}${p.y}`).join(' | ');
            const wumpusOr = adj.map(p => `W${p.x}${p.y}`).join(' | ');
            this.kb.push(parseExpr(`B${x}${y} <=> (${pitOr})`));
            this.kb.push(parseExpr(`S${x}${y} <=> (${wumpusOr})`));
          }
        }
      }
    }

    getAdjacent(x, y) {
      const list = [];
      if (x > 1) list.push({ x: x - 1, y });
      if (x < this.gridSize) list.push({ x: x + 1, y });
      if (y > 1) list.push({ x, y: y - 1 });
      if (y < this.gridSize) list.push({ x, y: y + 1 });
      return list;
    }

    senseAt(x, y) {
      const adj = this.getAdjacent(x, y);
      const isBreeze = adj.some(p => this.pits.has(`${p.x},${p.y}`));
      const isStench = adj.some(p => `${p.x},${p.y}` === this.wumpus);
      const isGlitter = `${x},${y}` === this.gold;

      if (isBreeze) this.percepts.breeze.add(`${x},${y}`);
      if (isStench) this.percepts.stench.add(`${x},${y}`);
      if (isGlitter) this.percepts.glitter.add(`${x},${y}`);

      // Add percept assertions to KB
      this.kb.push(parseExpr(isBreeze ? `B${x}${y}` : `¬B${x}${y}`));
      this.kb.push(parseExpr(isStench ? `S${x}${y}` : `¬S${x}${y}`));
      this.sensed = this.sensed || new Map();
      this.sensed.set(`${x},${y}`, { breeze: isBreeze, stench: isStench });
      this._inference = null; // invalidate cached entailments

      return { isBreeze, isStench, isGlitter };
    }

    // ---------------------------------------------------------------------
    // Entailment queries.
    // NOTE: Running ttEntails over the full KB enumerates 2^64 models
    // (16 B + 16 S + 16 P + 16 W symbols) and freezes the browser.
    // Equivalent, tractable model checking:
    //   * A rule Bxy <=> (P..) for a room that was never sensed has Bxy free,
    //     so it can always be satisfied -> it never prunes a model -> skip it.
    //   * Pit rules and Wumpus rules share no symbols -> check them separately.
    // So we enumerate only the P (or W) symbols next to sensed rooms, with
    // backtracking, and record which values appear in some model of the KB.
    //   KB |= Pxy   <=> no model has Pxy = false
    //   KB |= ¬Pxy  <=> no model has Pxy = true
    // ---------------------------------------------------------------------
    _inferKind(perceptKey) {
      const sensed = this.sensed || new Map();
      const constraints = [];
      const varSet = new Set(['1,1']); // ¬P11 and ¬W11 are in the KB
      sensed.forEach((pc, key) => {
        const [cx, cy] = key.split(',').map(Number);
        const vars = this.getAdjacent(cx, cy).map(p => `${p.x},${p.y}`);
        vars.forEach(v => varSet.add(v));
        constraints.push({ vars, value: pc[perceptKey] });
      });
      const vars = Array.from(varSet);
      const fixed = { '1,1': false };
      const canTrue = new Set(), canFalse = new Set();
      const model = {};

      const consistent = () => {
        for (const c of constraints) {
          let anyTrue = false, anyUnknown = false;
          for (const v of c.vars) {
            if (!(v in model)) anyUnknown = true;
            else if (model[v]) anyTrue = true;
          }
          if (c.value && !anyTrue && !anyUnknown) return false; // needs a true neighbour
          if (!c.value && anyTrue) return false;                // must have none
        }
        return true;
      };

      const search = (i) => {
        if (i === vars.length) {
          vars.forEach(v => (model[v] ? canTrue : canFalse).add(v));
          return;
        }
        const v = vars[i];
        const options = v in fixed ? [fixed[v]] : [true, false];
        for (const val of options) {
          // backtrack as soon as a sensed-room constraint is violated
          model[v] = val;
          if (consistent()) search(i + 1);
          delete model[v];
        }
      };
      search(0);
      return { vars: varSet, canTrue, canFalse };
    }

    _getInference() {
      if (!this._inference) {
        this._inference = { P: this._inferKind('breeze'), W: this._inferKind('stench') };
      }
      return this._inference;
    }

    _entailsFalse(kind, x, y) {
      const r = this._getInference()[kind], k = `${x},${y}`;
      return r.vars.has(k) && !r.canTrue.has(k);
    }

    _entailsTrue(kind, x, y) {
      const r = this._getInference()[kind], k = `${x},${y}`;
      return r.vars.has(k) && !r.canFalse.has(k);
    }

    isSafe(x, y) {
      // Room is proven safe if KB |= (¬Pxy ∧ ¬Wxy)
      return this._entailsFalse('P', x, y) && this._entailsFalse('W', x, y);
    }

    isPit(x, y) {
      return this._entailsTrue('P', x, y);
    }

    isWumpus(x, y) {
      return this._entailsTrue('W', x, y);
    }
  }

  // --- Public API ---
  return {
    Expr,
    parseExpr,
    plTrue,
    getPropSymbols,
    ttEntails,
    toCNF,
    extractClauses,
    plResolution,
    plFCEntails,
    WumpusLogicWorld
  };
}));
