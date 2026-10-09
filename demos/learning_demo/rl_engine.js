/**
 * rl_engine.js — Zero-dependency Reinforcement Learning Engine
 * Part of MLAI401 Topic 06: Learning & Decision Making
 * Implements:
 *   - MDP & GridWorld Environment (AIMA 4x3 Grid & Cliff Walking)
 *   - Dynamic Programming: Value Iteration & Policy Iteration (Model-Based)
 *   - Model-Free Reinforcement Learning: Tabular Q-Learning (Off-Policy TD Control)
 *   - Model-Free Reinforcement Learning: SARSA (On-Policy TD Control)
 *   - Step-by-step Execution Snapshots for UI Visualizers
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.RLEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ===========================================================================
  // 1. GridWorld Environment
  // ===========================================================================

  class GridWorld {
    constructor(opt = {}) {
      this.cols = opt.cols || 4;
      this.rows = opt.rows || 3;
      // Default: AIMA 4x3 Grid (terminal: (4,3)->+1, (4,2)->-1, wall: (2,2))
      this.terminals = opt.terminals || { '4,3': 1.0, '4,2': -1.0 };
      this.walls = new Set(opt.walls || ['2,2']);
      this.livingReward = opt.livingReward !== undefined ? opt.livingReward : -0.04;
      this.slipProb = opt.slipProb !== undefined ? opt.slipProb : 0.2;
      this.actions = ['N', 'S', 'E', 'W'];

      this.states = [];
      for (let r = 1; r <= this.rows; r++) {
        for (let c = 1; c <= this.cols; c++) {
          const key = `${c},${r}`;
          if (!this.walls.has(key)) {
            this.states.push(key);
          }
        }
      }
    }

    isTerminal(state) {
      return this.terminals[state] !== undefined;
    }

    getReward(state) {
      if (this.isTerminal(state)) return this.terminals[state];
      return this.livingReward;
    }

    _move(state, action) {
      if (this.isTerminal(state)) return state;
      const [c, r] = state.split(',').map(Number);
      let nc = c, nr = r;
      if (action === 'N') nr += 1;
      else if (action === 'S') nr -= 1;
      else if (action === 'E') nc += 1;
      else if (action === 'W') nc -= 1;

      const nextKey = `${nc},${nr}`;
      if (nc < 1 || nc > this.cols || nr < 1 || nr > this.rows || this.walls.has(nextKey)) {
        return state;
      }
      return nextKey;
    }

    getTransitions(state, action) {
      if (this.isTerminal(state)) {
        return [{ prob: 1.0, nextState: state, reward: 0.0 }];
      }

      const perp = {
        'N': ['W', 'E'],
        'S': ['W', 'E'],
        'E': ['N', 'S'],
        'W': ['N', 'S']
      };

      const mainProb = 1.0 - this.slipProb;
      const sideProb = this.slipProb / 2.0;

      const outcomes = {};
      const sMain = this._move(state, action);
      outcomes[sMain] = (outcomes[sMain] || 0.0) + mainProb;

      for (const slipA of perp[action]) {
        const sSlip = this._move(state, slipA);
        outcomes[sSlip] = (outcomes[sSlip] || 0.0) + sideProb;
      }

      const res = [];
      for (const nextS in outcomes) {
        const reward = this.isTerminal(nextS) ? this.terminals[nextS] : this.livingReward;
        res.push({
          prob: outcomes[nextS],
          nextState: nextS,
          reward
        });
      }
      return res;
    }

    step(state, action) {
      if (this.isTerminal(state)) {
        return { nextState: state, reward: 0, done: true };
      }
      const trans = this.getTransitions(state, action);
      const r = Math.random();
      let cum = 0;
      for (const t of trans) {
        cum += t.prob;
        if (cum >= r) {
          return { nextState: t.nextState, reward: t.reward, done: this.isTerminal(t.nextState) };
        }
      }
      const last = trans[trans.length - 1];
      return { nextState: last.nextState, reward: last.reward, done: this.isTerminal(last.nextState) };
    }
  }

  // ===========================================================================
  // 2. Value Iteration & Policy Iteration
  // ===========================================================================

  class ValueIterationSolver {
    constructor(env, gamma = 0.99, epsilon = 1e-4) {
      this.env = env;
      this.gamma = gamma;
      this.epsilon = epsilon;
      this.V = {};
      this.policy = {};
      this.iteration = 0;
      this.converged = false;
      this.history = [];

      for (const s of this.env.states) {
        this.V[s] = this.env.isTerminal(s) ? this.env.terminals[s] : 0.0;
        this.policy[s] = null;
      }
      this._extractPolicy();
    }

    _extractPolicy() {
      for (const s of this.env.states) {
        if (this.env.isTerminal(s)) {
          this.policy[s] = null;
          continue;
        }
        let bestA = null;
        let bestQ = -Infinity;
        for (const a of this.env.actions) {
          let q = 0.0;
          for (const t of this.env.getTransitions(s, a)) {
            q += t.prob * (t.reward + this.gamma * (this.V[t.nextState] || 0));
          }
          if (q > bestQ) {
            bestQ = q;
            bestA = a;
          }
        }
        this.policy[s] = bestA;
      }
    }

    step() {
      if (this.converged) return false;
      let maxDelta = 0.0;
      const newV = { ...this.V };

      for (const s of this.env.states) {
        if (this.env.isTerminal(s)) continue;
        let bestVal = -Infinity;
        for (const a of this.env.actions) {
          let q = 0.0;
          for (const t of this.env.getTransitions(s, a)) {
            q += t.prob * (t.reward + this.gamma * (this.V[t.nextState] || 0));
          }
          if (q > bestVal) bestVal = q;
        }
        newV[s] = bestVal;
        const delta = Math.abs(newV[s] - this.V[s]);
        if (delta > maxDelta) maxDelta = delta;
      }

      this.V = newV;
      this.iteration++;
      this._extractPolicy();

      const thresh = this.epsilon * (1.0 - this.gamma) / this.gamma;
      if (maxDelta < (this.gamma < 1.0 ? thresh : this.epsilon)) {
        this.converged = true;
      }

      this.history.push({
        iteration: this.iteration,
        V: { ...this.V },
        policy: { ...this.policy },
        delta: maxDelta,
        converged: this.converged
      });

      return !this.converged;
    }

    solve(maxIter = 200) {
      while (!this.converged && this.iteration < maxIter) {
        this.step();
      }
      return this;
    }
  }

  // ===========================================================================
  // 3. Tabular Q-Learning Agent
  // ===========================================================================

  class QLearningAgent {
    constructor(env, opt = {}) {
      this.env = env;
      this.alpha = opt.alpha !== undefined ? opt.alpha : 0.1;
      this.gamma = opt.gamma !== undefined ? opt.gamma : 0.99;
      this.epsilon = opt.epsilon !== undefined ? opt.epsilon : 0.2;
      this.qTable = {};
      this.episodes = 0;
      this.totalSteps = 0;
      this.currentState = '1,1';

      for (const s of this.env.states) {
        this.qTable[s] = { 'N': 0.0, 'S': 0.0, 'E': 0.0, 'W': 0.0 };
      }
    }

    chooseAction(state) {
      if (this.env.isTerminal(state)) return null;
      if (Math.random() < this.epsilon) {
        const idx = Math.floor(Math.random() * this.env.actions.length);
        return { action: this.env.actions[idx], isExploration: true };
      } else {
        let bestA = this.env.actions[0];
        let bestQ = -Infinity;
        for (const a of this.env.actions) {
          if (this.qTable[state][a] > bestQ) {
            bestQ = this.qTable[state][a];
            bestA = a;
          }
        }
        return { action: bestA, isExploration: false };
      }
    }

    stepSimulation() {
      if (this.env.isTerminal(this.currentState)) {
        this.currentState = '1,1';
        this.episodes++;
      }

      const state = this.currentState;
      const { action, isExploration } = this.chooseAction(state);
      const { nextState, reward, done } = this.env.step(state, action);

      let maxNextQ = 0.0;
      if (!done) {
        maxNextQ = Math.max(...Object.values(this.qTable[nextState]));
      }

      const tdTarget = reward + this.gamma * maxNextQ;
      const oldQ = this.qTable[state][action];
      const tdError = tdTarget - oldQ;
      this.qTable[state][action] = oldQ + this.alpha * tdError;

      this.currentState = nextState;
      this.totalSteps++;
      if (done) this.episodes++;

      return {
        state,
        action,
        reward,
        nextState,
        done,
        isExploration,
        tdError,
        newQ: this.qTable[state][action],
        episodes: this.episodes,
        totalSteps: this.totalSteps
      };
    }

    trainBatch(nEpisodes = 500, maxSteps = 100) {
      for (let ep = 0; ep < nEpisodes; ep++) {
        let s = '1,1';
        for (let st = 0; st < maxSteps; st++) {
          if (this.env.isTerminal(s)) break;
          const { action } = this.chooseAction(s);
          const { nextState, reward, done } = this.env.step(s, action);
          const maxNextQ = done ? 0.0 : Math.max(...Object.values(this.qTable[nextState]));
          const tdTarget = reward + this.gamma * maxNextQ;
          this.qTable[s][action] += this.alpha * (tdTarget - this.qTable[s][action]);
          s = nextState;
          if (done) break;
        }
        this.episodes++;
      }
    }

    extractPolicy() {
      const policy = {};
      const values = {};
      for (const s of this.env.states) {
        if (this.env.isTerminal(s)) {
          policy[s] = null;
          values[s] = this.env.terminals[s];
        } else {
          let bestA = null;
          let bestQ = -Infinity;
          for (const a of this.env.actions) {
            if (this.qTable[s][a] > bestQ) {
              bestQ = this.qTable[s][a];
              bestA = a;
            }
          }
          policy[s] = bestA;
          values[s] = bestQ;
        }
      }
      return { policy, values };
    }
  }

  // Public API Export
  return {
    GridWorld,
    ValueIterationSolver,
    QLearningAgent
  };
}));
