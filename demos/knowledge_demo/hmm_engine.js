/**
 * hmm_engine.js — Topic 05: Hidden Markov Models (HMM) Inference Engine
 *
 * Implements pure zero-dependency algorithms for:
 *   1. Forward Filtering (online belief state P(X_t | e_{1:t}))
 *   2. Prediction (future state forecasting P(X_{t+k} | e_{1:t}))
 *   3. Smoothing (retrospective hindsight P(X_k | e_{1:t}))
 *   4. Viterbi Trellis Decoding (most likely state sequence argmax P(x_{1:t} | e_{1:t}))
 *   5. Standard Models (Umbrella World, Robot Hallway Tracking)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.HMMEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /**
   * HiddenMarkovModel definition class
   * @param {Array<string>} states - List of state names e.g. ['Rain', 'NoRain']
   * @param {Array<string>} observations - List of observation names e.g. ['Umbrella', 'NoUmbrella']
   * @param {Array<Array<number>>} transitionMatrix - T[i][j] = P(X_{t+1}=j | X_t=i)
   * @param {Array<Array<number>>} emissionMatrix - O[i][k] = P(E_t=k | X_t=i)
   * @param {Array<number>} prior - P(X_0=i)
   */
  class HiddenMarkovModel {
    constructor(states, observations, transitionMatrix, emissionMatrix, prior) {
      this.states = states;
      this.observations = observations;
      this.transitionMatrix = transitionMatrix;
      this.emissionMatrix = emissionMatrix;
      this.prior = prior || Array(states.length).fill(1 / states.length);
    }

    /**
     * Normalizes an array of numbers so it sums to 1.0
     */
    static normalize(dist) {
      const sum = dist.reduce((acc, val) => acc + val, 0);
      if (sum === 0) return dist.map(() => 1 / dist.length);
      return dist.map(val => val / sum);
    }

    /**
     * Forward algorithm step: predict then update
     * @param {Array<number>} prevBelief - P(X_{t-1} | e_{1:t-1})
     * @param {number|string} obs - Observation index or name at time t
     * @returns {{predicted: Array<number>, updated: Array<number>, alpha: number}}
     */
    forwardStep(prevBelief, obs) {
      const obsIdx = typeof obs === 'string' ? this.observations.indexOf(obs) : obs;
      const numStates = this.states.length;

      // 1. Predict: P(X_t | e_{1:t-1}) = sum_i P(X_t | X_{t-1}=i) * P(X_{t-1}=i | e_{1:t-1})
      const predicted = Array(numStates).fill(0);
      for (let j = 0; j < numStates; j++) {
        for (let i = 0; i < numStates; i++) {
          predicted[j] += prevBelief[i] * this.transitionMatrix[i][j];
        }
      }

      // 2. Update: P(X_t | e_{1:t}) = alpha * P(e_t | X_t) * P(X_t | e_{1:t-1})
      const unnorm = Array(numStates).fill(0);
      for (let j = 0; j < numStates; j++) {
        const emissionProb = (obsIdx >= 0 && obsIdx < this.observations.length)
          ? this.emissionMatrix[j][obsIdx]
          : 1.0;
        unnorm[j] = predicted[j] * emissionProb;
      }

      const sum = unnorm.reduce((a, b) => a + b, 0);
      const alpha = sum > 0 ? 1 / sum : 1.0;
      const updated = unnorm.map(v => v * alpha);

      return { predicted, updated, alpha };
    }

    /**
     * Filter full observation sequence
     * @param {Array<string|number>} obsSequence
     * @returns {Array<{t: number, obs: string, predicted: Array<number>, belief: Array<number>}>}
     */
    filter(obsSequence) {
      const history = [];
      let currentBelief = [...this.prior];

      history.push({
        t: 0,
        obs: null,
        predicted: [...this.prior],
        belief: [...this.prior]
      });

      for (let t = 0; t < obsSequence.length; t++) {
        const obs = obsSequence[t];
        const step = this.forwardStep(currentBelief, obs);
        currentBelief = step.updated;
        history.push({
          t: t + 1,
          obs: typeof obs === 'number' ? this.observations[obs] : obs,
          predicted: step.predicted,
          belief: step.updated
        });
      }

      return history;
    }

    /**
     * Forecast k steps ahead into the future
     * @param {Array<number>} currentBelief
     * @param {number} k
     * @returns {Array<Array<number>>}
     */
    predictHorizon(currentBelief, k = 5) {
      const predictions = [currentBelief];
      let b = [...currentBelief];
      const numStates = this.states.length;

      for (let step = 1; step <= k; step++) {
        const next = Array(numStates).fill(0);
        for (let j = 0; j < numStates; j++) {
          for (let i = 0; i < numStates; i++) {
            next[j] += b[i] * this.transitionMatrix[i][j];
          }
        }
        b = next;
        predictions.push(b);
      }
      return predictions;
    }

    /**
     * Viterbi algorithm for finding the most likely state path
     * @param {Array<string|number>} obsSequence
     * @returns {{trellis: Array<Array<number>>, backpointers: Array<Array<number>>, optimalPath: Array<string>, optimalStateIndices: Array<number>, maxProb: number}}
     */
    viterbi(obsSequence) {
      const T = obsSequence.length;
      if (T === 0) return { trellis: [], backpointers: [], optimalPath: [], maxProb: 0 };

      const numStates = this.states.length;
      const trellis = [];
      const backpointers = [];

      // Step 1: Initialize t=0
      const firstObsIdx = typeof obsSequence[0] === 'string'
        ? this.observations.indexOf(obsSequence[0])
        : obsSequence[0];

      const v0 = [];
      for (let s = 0; s < numStates; s++) {
        const emit = firstObsIdx >= 0 ? this.emissionMatrix[s][firstObsIdx] : 1.0;
        v0.push(this.prior[s] * emit);
      }
      trellis.push(v0);

      // Step 2: Recurse for t=1..T-1
      for (let t = 1; t < T; t++) {
        const obsIdx = typeof obsSequence[t] === 'string'
          ? this.observations.indexOf(obsSequence[t])
          : obsSequence[t];

        const vt = Array(numStates).fill(0);
        const bpt = Array(numStates).fill(0);

        for (let j = 0; j < numStates; j++) {
          let maxVal = -1;
          let bestPrev = 0;

          for (let i = 0; i < numStates; i++) {
            const prob = trellis[t - 1][i] * this.transitionMatrix[i][j];
            if (prob > maxVal) {
              maxVal = prob;
              bestPrev = i;
            }
          }

          const emit = obsIdx >= 0 ? this.emissionMatrix[j][obsIdx] : 1.0;
          vt[j] = maxVal * emit;
          bpt[j] = bestPrev;
        }

        trellis.push(vt);
        backpointers.push(bpt);
      }

      // Step 3: Termination (find max at last time step)
      const lastV = trellis[T - 1];
      let maxProb = -1;
      let bestLastState = 0;
      for (let s = 0; s < numStates; s++) {
        if (lastV[s] > maxProb) {
          maxProb = lastV[s];
          bestLastState = s;
        }
      }

      // Step 4: Backtrack
      const pathIndices = Array(T).fill(0);
      pathIndices[T - 1] = bestLastState;
      for (let t = T - 2; t >= 0; t--) {
        pathIndices[t] = backpointers[t][pathIndices[t + 1]];
      }

      const optimalPath = pathIndices.map(idx => this.states[idx]);

      return {
        trellis,
        backpointers,
        optimalPath,
        optimalStateIndices: pathIndices,
        maxProb
      };
    }
  }

  // --- Prebuilt Standard Models ---

  /**
   * Umbrella World (AIMA Fig 14.4)
   * States: Rain (0), NoRain (1)
   * Observations: Umbrella (0), NoUmbrella (1)
   */
  function createUmbrellaWorld() {
    const states = ['Rain', 'NoRain'];
    const observations = ['Umbrella', 'NoUmbrella'];
    const transitionMatrix = [
      [0.70, 0.30], // Rain -> [Rain, NoRain]
      [0.30, 0.70]  // NoRain -> [Rain, NoRain]
    ];
    const emissionMatrix = [
      [0.90, 0.10], // Rain -> [Umbrella, NoUmbrella]
      [0.20, 0.80]  // NoRain -> [Umbrella, NoUmbrella]
    ];
    const prior = [0.50, 0.50];

    return new HiddenMarkovModel(states, observations, transitionMatrix, emissionMatrix, prior);
  }

  /**
   * Robot Hallway Localization (1D Discrete Tracking)
   * States: 4 consecutive corridor cells [Cell_1, Cell_2, Cell_3, Cell_4]
   * Observations: Wall (0), Open (1)
   */
  function createRobotLocalization() {
    const states = ['Cell_1', 'Cell_2', 'Cell_3', 'Cell_4'];
    const observations = ['Wall', 'Open'];
    // Transitions: 80% chance moves right, 10% stays, 10% bumps/moves left
    const transitionMatrix = [
      [0.20, 0.80, 0.00, 0.00],
      [0.10, 0.10, 0.80, 0.00],
      [0.00, 0.10, 0.10, 0.80],
      [0.00, 0.00, 0.20, 0.80]
    ];
    // Emissions: Cell_1 and Cell_4 have end walls (90% Wall); Cell_2 & Cell_3 are open (85% Open)
    const emissionMatrix = [
      [0.90, 0.10],
      [0.15, 0.85],
      [0.15, 0.85],
      [0.90, 0.10]
    ];
    const prior = [0.25, 0.25, 0.25, 0.25];

    return new HiddenMarkovModel(states, observations, transitionMatrix, emissionMatrix, prior);
  }

  return {
    HiddenMarkovModel,
    createUmbrellaWorld,
    createRobotLocalization
  };
}));
