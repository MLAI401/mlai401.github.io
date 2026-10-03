/**
 * bayes_engine.js — Pure Zero-Dependency Bayesian Network Engine
 * Part of MLAI401 Topic 05: Knowledge & Reasoning
 * Implements:
 *   - Bayesian Network DAG & CPT Data Structures
 *   - Exact Inference: Enumeration & Variable Elimination (with step-by-step factor traces)
 *   - Approximate Sampling: Prior Sampling, Rejection Sampling, Likelihood Weighting, Gibbs Sampling
 *   - Markov Blanket & D-Separation Analyzers
 *   - Pre-configured Standard Networks: Burglar Alarm, Wet Grass, Medical Diagnostic Test
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BayesEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  class BayesNode {
    constructor(varName, parents = [], cpt = {}, meta = {}) {
      this.var = varName;
      this.parents = Array.isArray(parents) ? parents : [parents];
      this.meta = meta; // coordinates {x, y}, title, description

      // Format cpt: dictionary mapping stringified boolean tuple "T,F" -> P(var=True)
      // or single number for root nodes
      if (typeof cpt === 'number') {
        this.cpt = { '': cpt };
      } else {
        this.cpt = {};
        for (const [k, v] of Object.entries(cpt)) {
          this.cpt[String(k)] = Number(v);
        }
      }
    }

    p(val, event) {
      const parentKey = this.parents.map(p => event[p] ? 'T' : 'F').join(',');
      const pTrue = this.cpt[parentKey] !== undefined ? this.cpt[parentKey] : (this.cpt[''] || 0.5);
      return val ? pTrue : (1.0 - pTrue);
    }

    sample(event) {
      const parentKey = this.parents.map(p => event[p] ? 'T' : 'F').join(',');
      const pTrue = this.cpt[parentKey] !== undefined ? this.cpt[parentKey] : (this.cpt[''] || 0.5);
      return Math.random() < pTrue;
    }
  }

  class BayesNet {
    constructor(nodes = []) {
      this.nodes = [];
      this.variables = [];
      this.nodeMap = {};
      nodes.forEach(n => this.add(n));
    }

    add(node) {
      if (!(node instanceof BayesNode)) {
        node = new BayesNode(node.var, node.parents, node.cpt, node.meta);
      }
      this.nodes.push(node);
      this.variables.push(node.var);
      this.nodeMap[node.var] = node;
    }

    getNode(v) {
      return this.nodeMap[v];
    }

    topologicalSort() {
      const visited = new Set();
      const order = [];

      const visit = (v) => {
        if (visited.has(v)) return;
        visited.add(v);
        const node = this.getNode(v);
        if (node) {
          node.parents.forEach(p => visit(p));
        }
        order.push(v);
      };

      this.variables.forEach(v => visit(v));
      return order;
    }

    getChildren(varName) {
      return this.nodes.filter(n => n.parents.includes(varName)).map(n => n.var);
    }

    getParents(varName) {
      const n = this.getNode(varName);
      return n ? [...n.parents] : [];
    }

    getMarkovBlanket(varName) {
      const parents = this.getParents(varName);
      const children = this.getChildren(varName);
      const coparents = new Set();

      children.forEach(c => {
        const cParents = this.getParents(c);
        cParents.forEach(cp => {
          if (cp !== varName && !parents.includes(cp)) {
            coparents.add(cp);
          }
        });
      });

      return {
        parents,
        children,
        coparents: Array.from(coparents),
        all: Array.from(new Set([...parents, ...children, ...coparents]))
      };
    }
  }

  // --- Normalization Helper ---
  function normalize(dist) {
    const sum = (dist[true] || 0) + (dist[false] || 0);
    if (sum === 0) return { true: 0.5, false: 0.5 };
    return {
      true: dist[true] / sum,
      false: dist[false] / sum
    };
  }

  // --- Exact Inference: Enumeration (AIMA Fig 13.11 / 14.9) ---
  function enumerationAsk(query, evidence, bn) {
    const qx = {};
    for (const val of [true, false]) {
      const extended = { ...evidence, [query]: val };
      const varsList = bn.topologicalSort();
      qx[val] = enumerateAll(varsList, extended, bn);
    }
    return normalize(qx);
  }

  function enumerateAll(varsList, event, bn) {
    if (varsList.length === 0) return 1.0;
    const Y = varsList[0];
    const rest = varsList.slice(1);
    const node = bn.getNode(Y);

    if (Y in event) {
      return node.p(event[Y], event) * enumerateAll(rest, event, bn);
    } else {
      return (node.p(true, event) * enumerateAll(rest, { ...event, [Y]: true }, bn)) +
             (node.p(false, event) * enumerateAll(rest, { ...event, [Y]: false }, bn));
    }
  }

  // --- Exact Inference: Variable Elimination with Factor Tracing ---
  class Factor {
    constructor(variables, table) {
      this.variables = [...variables];
      this.table = { ...table }; // mapping "T,F,T" -> value
    }

    pointwiseProduct(other) {
      const mergedVars = [...this.variables];
      other.variables.forEach(v => {
        if (!mergedVars.includes(v)) mergedVars.push(v);
      });

      const newTable = {};
      const combos = generateCombos(mergedVars.length);

      combos.forEach(combo => {
        const assign = {};
        mergedVars.forEach((v, i) => { assign[v] = combo[i]; });

        const keyThis = this.variables.map(v => assign[v] ? 'T' : 'F').join(',');
        const keyOther = other.variables.map(v => assign[v] ? 'T' : 'F').join(',');

        const val1 = this.table[keyThis] !== undefined ? this.table[keyThis] : 0;
        const val2 = other.table[keyOther] !== undefined ? other.table[keyOther] : 0;

        const keyNew = combo.map(b => b ? 'T' : 'F').join(',');
        newTable[keyNew] = val1 * val2;
      });

      return new Factor(mergedVars, newTable);
    }

    sumOut(varName) {
      if (!this.variables.includes(varName)) return this;
      const idx = this.variables.indexOf(varName);
      const newVars = this.variables.filter(v => v !== varName);
      const newTable = {};

      for (const [key, val] of Object.entries(this.table)) {
        const parts = key.split(',');
        parts.splice(idx, 1);
        const newKey = parts.join(',');
        newTable[newKey] = (newTable[newKey] || 0) + val;
      }

      return new Factor(newVars, newTable);
    }

    normalize() {
      let sum = 0;
      for (const v of Object.values(this.table)) sum += v;
      if (sum > 0) {
        for (const k of Object.keys(this.table)) this.table[k] /= sum;
      }
      return this;
    }
  }

  function generateCombos(n) {
    if (n === 0) return [[]];
    const rest = generateCombos(n - 1);
    const res = [];
    rest.forEach(r => {
      res.push([true, ...r]);
      res.push([false, ...r]);
    });
    return res;
  }

  function makeFactor(node, evidence) {
    const allVars = [node.var, ...node.parents];
    const unobserved = allVars.filter(v => !(v in evidence));
    const table = {};
    const combos = generateCombos(unobserved.length);

    combos.forEach(combo => {
      const event = { ...evidence };
      unobserved.forEach((v, i) => { event[v] = combo[i]; });
      const pVal = node.p(event[node.var], event);
      const key = unobserved.map(v => event[v] ? 'T' : 'F').join(',');
      table[key] = pVal;
    });

    return new Factor(unobserved, table);
  }

  function variableElimination(query, evidence, bn) {
    const trace = [];
    let factors = bn.nodes.map(n => makeFactor(n, evidence));

    trace.push({
      step: 0,
      desc: 'Construct Initial Factors from CPTs and Evidence',
      factors: factors.map(f => ({ vars: [...f.variables], entries: { ...f.table } }))
    });

    const hiddenVars = bn.topologicalSort().filter(v => v !== query && !(v in evidence));

    hiddenVars.forEach((varToElim, stepIdx) => {
      const matched = factors.filter(f => f.variables.includes(varToElim));
      if (matched.length > 0) {
        factors = factors.filter(f => !f.variables.includes(varToElim));
        let product = matched[0];
        for (let i = 1; i < matched.length; i++) {
          product = product.pointwiseProduct(matched[i]);
        }
        const summed = product.sumOut(varToElim);
        factors.push(summed);

        trace.push({
          step: stepIdx + 1,
          eliminatedVar: varToElim,
          desc: `Sum out hidden variable "${varToElim}" across ${matched.length} factors`,
          resultFactor: { vars: [...summed.variables], entries: { ...summed.table } }
        });
      }
    });

    // Multiply remaining factors
    let finalFactor = factors[0];
    for (let i = 1; i < factors.length; i++) {
      finalFactor = finalFactor.pointwiseProduct(factors[i]);
    }
    finalFactor.normalize();

    const qIdx = finalFactor.variables.indexOf(query);
    const dist = { true: 0, false: 0 };
    for (const [key, val] of Object.entries(finalFactor.table)) {
      const isTrue = key.split(',')[qIdx] === 'T';
      dist[isTrue] += val;
    }

    return {
      distribution: normalize(dist),
      trace
    };
  }

  // --- Approximate Sampling Algorithms ---
  function priorSample(bn) {
    const event = {};
    bn.topologicalSort().forEach(v => {
      const node = bn.getNode(v);
      event[v] = node.sample(event);
    });
    return event;
  }

  function rejectionSampling(query, evidence, bn, N = 5000) {
    const counts = { true: 0, false: 0 };
    let accepted = 0;
    const samples = [];

    for (let i = 0; i < N; i++) {
      const s = priorSample(bn);
      const isMatch = Object.entries(evidence).every(([k, v]) => s[k] === v);
      if (isMatch) {
        counts[s[query]]++;
        accepted++;
      }
      if (i < 50) {
        samples.push({ sample: s, accepted: isMatch });
      }
    }

    const dist = accepted > 0 ? normalize(counts) : { true: 0.5, false: 0.5 };
    return {
      distribution: dist,
      accepted,
      total: N,
      acceptanceRate: accepted / N,
      samplePreview: samples
    };
  }

  function likelihoodWeighting(query, evidence, bn, N = 5000) {
    const weights = { true: 0.0, false: 0.0 };
    const samples = [];

    for (let i = 0; i < N; i++) {
      const event = {};
      let w = 1.0;

      bn.topologicalSort().forEach(v => {
        const node = bn.getNode(v);
        if (v in evidence) {
          const val = evidence[v];
          event[v] = val;
          w *= node.p(val, event);
        } else {
          event[v] = node.sample(event);
        }
      });

      weights[event[query]] += w;
      if (i < 50) {
        samples.push({ sample: event, weight: w });
      }
    }

    return {
      distribution: normalize(weights),
      totalSamples: N,
      samplePreview: samples
    };
  }

  function gibbsSampling(query, evidence, bn, N = 5000, burnIn = 500) {
    const nonevidence = bn.topologicalSort().filter(v => !(v in evidence));
    const current = { ...evidence };

    // Initialize unobserved variables randomly
    nonevidence.forEach(v => {
      current[v] = Math.random() < 0.5;
    });

    const counts = { true: 0, false: 0 };
    const history = [];

    for (let i = 0; i < N + burnIn; i++) {
      nonevidence.forEach(v => {
        // Calculate P(v=True | mb(v))
        const pTrue = calcConditionalMB(v, current, bn);
        current[v] = Math.random() < pTrue;
      });

      if (i >= burnIn) {
        counts[current[query]]++;
        if (history.length < 50) {
          history.push({ step: i, state: { ...current } });
        }
      }
    }

    return {
      distribution: normalize(counts),
      history,
      totalSamples: N
    };
  }

  function calcConditionalMB(varName, event, bn) {
    const node = bn.getNode(varName);
    const children = bn.getChildren(varName);

    // Compute unnormalized numerator for True
    const evTrue = { ...event, [varName]: true };
    let pTrue = node.p(true, evTrue);
    children.forEach(c => {
      const cNode = bn.getNode(c);
      pTrue *= cNode.p(evTrue[c], evTrue);
    });

    // Compute unnormalized numerator for False
    const evFalse = { ...event, [varName]: false };
    let pFalse = node.p(false, evFalse);
    children.forEach(c => {
      const cNode = bn.getNode(c);
      pFalse *= cNode.p(evFalse[c], evFalse);
    });

    const sum = pTrue + pFalse;
    return sum > 0 ? pTrue / sum : 0.5;
  }

  // --- Preloaded Standard Networks ---
  function createAlarmNet() {
    const net = new BayesNet();
    net.add(new BayesNode('Burglary', [], 0.001, { x: 140, y: 70, label: 'Burglary (B)' }));
    net.add(new BayesNode('Earthquake', [], 0.002, { x: 420, y: 70, label: 'Earthquake (E)' }));
    net.add(new BayesNode('Alarm', ['Burglary', 'Earthquake'], {
      'T,T': 0.95,
      'T,F': 0.94,
      'F,T': 0.29,
      'F,F': 0.001
    }, { x: 280, y: 190, label: 'Alarm (A)' }));
    net.add(new BayesNode('JohnCalls', ['Alarm'], {
      'T': 0.90,
      'F': 0.05
    }, { x: 140, y: 310, label: 'JohnCalls (J)' }));
    net.add(new BayesNode('MaryCalls', ['Alarm'], {
      'T': 0.70,
      'F': 0.01
    }, { x: 420, y: 310, label: 'MaryCalls (M)' }));
    return net;
  }

  function createWetGrassNet() {
    const net = new BayesNet();
    net.add(new BayesNode('Cloudy', [], 0.5, { x: 280, y: 60, label: 'Cloudy (C)' }));
    net.add(new BayesNode('Sprinkler', ['Cloudy'], {
      'T': 0.10,
      'F': 0.50
    }, { x: 140, y: 180, label: 'Sprinkler (S)' }));
    net.add(new BayesNode('Rain', ['Cloudy'], {
      'T': 0.80,
      'F': 0.20
    }, { x: 420, y: 180, label: 'Rain (R)' }));
    net.add(new BayesNode('WetGrass', ['Sprinkler', 'Rain'], {
      'T,T': 0.99,
      'T,F': 0.90,
      'F,T': 0.90,
      'F,F': 0.00
    }, { x: 280, y: 300, label: 'WetGrass (W)' }));
    return net;
  }

  function createMedicalNet() {
    const net = new BayesNet();
    net.add(new BayesNode('Disease', [], 0.01, { x: 280, y: 90, label: 'Disease (D)' }));
    net.add(new BayesNode('TestResult', ['Disease'], {
      'T': 0.95,
      'F': 0.05
    }, { x: 280, y: 240, label: 'Test Positive (+)' }));
    return net;
  }

  return {
    BayesNode,
    BayesNet,
    Factor,
    enumerationAsk,
    variableElimination,
    priorSample,
    rejectionSampling,
    likelihoodWeighting,
    gibbsSampling,
    createAlarmNet,
    createWetGrassNet,
    createMedicalNet
  };
}));
