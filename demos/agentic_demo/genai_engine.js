/**
 * genai_engine.js — Generative AI & Large Language Models Engine
 * MLAI401 Topic 07 Reference Implementation
 *
 * Exposes window.GenAIEngine:
 *   - Softmax probability calibration with Temperature scaling (T)
 *   - Top-K and Top-P (Nucleus) decoding filters
 *   - Shannon Entropy calculation
 *   - Autoregressive next-token prediction simulator
 *   - Prompt builders: Zero-Shot, Few-Shot, Chain-of-Thought (CoT), JSON Schema
 */

(function () {
  'use strict';

  const VOCABULARY = [
    { token: "agent", logit: 3.2, category: "concept" },
    { token: "reasoning", logit: 2.8, category: "concept" },
    { token: "tools", logit: 2.4, category: "action" },
    { token: "plans", logit: 2.1, category: "action" },
    { token: "memory", logit: 1.8, category: "concept" },
    { token: "accurately", logit: 1.5, category: "modifier" },
    { token: "step-by-step", logit: 1.2, category: "modifier" },
    { token: "calculates", logit: 0.9, category: "action" },
    { token: "safely", logit: 0.6, category: "modifier" },
    { token: "unpredictable", logit: -0.4, category: "creative" },
    { token: "hallucination", logit: -1.2, category: "creative" },
    { token: "random", logit: -1.8, category: "creative" }
  ];

  /**
   * Computes softmax probabilities over an array of numeric logits with temperature scaling.
   * P(w_i) = exp(z_i / T) / sum_j exp(z_j / T)
   * @param {number[]} logits
   * @param {number} temperature (T > 0)
   * @returns {number[]} probabilities summing to 1.0
   */
  function softmax(logits, temperature = 1.0) {
    if (!logits || logits.length === 0) return [];
    
    // Near-zero temperature: greedy argmax (1-hot)
    if (temperature <= 0.05) {
      let maxIdx = 0;
      let maxVal = logits[0];
      for (let i = 1; i < logits.length; i++) {
        if (logits[i] > maxVal) {
          maxVal = logits[i];
          maxIdx = i;
        }
      }
      return logits.map((_, i) => (i === maxIdx ? 1.0 : 0.0));
    }

    // Numerical stability subtraction of max
    const maxLogit = Math.max(...logits);
    const scaled = logits.map(z => (z - maxLogit) / temperature);
    const exps = scaled.map(s => Math.exp(s));
    const sumExps = exps.reduce((a, b) => a + b, 0);

    if (sumExps === 0) {
      return logits.map(() => 1.0 / logits.length);
    }
    return exps.map(e => e / sumExps);
  }

  /**
   * Shannon entropy H(P) = - sum p * log2(p)
   */
  function entropy(probs) {
    let h = 0.0;
    for (const p of probs) {
      if (p > 1e-12) {
        h -= p * Math.log2(p);
      }
    }
    return h;
  }

  /**
   * Filters token distribution using Top-K and Top-P (Nucleus) constraints.
   */
  function filterCandidates(candidates, topK = null, topP = null) {
    // Sort descending by probability
    let list = [...candidates].sort((a, b) => b.prob - a.prob);

    // Apply Top-K
    if (topK !== null && topK > 0 && topK < list.length) {
      list = list.slice(0, topK);
    }

    // Apply Top-P (Nucleus)
    if (topP !== null && topP < 1.0) {
      let cumulative = 0.0;
      const nucleus = [];
      for (const item of list) {
        nucleus.push(item);
        cumulative += item.prob;
        if (cumulative >= topP) break;
      }
      list = nucleus;
    }

    // Renormalize probabilities within filtered candidate set
    const totalP = list.reduce((sum, item) => sum + item.prob, 0);
    return list.map(item => ({
      ...item,
      prob: totalP > 0 ? item.prob / totalP : 1.0 / list.length,
      origProb: item.prob
    }));
  }

  /**
   * Samples a token from a normalized probability distribution.
   */
  function sampleToken(filteredList) {
    if (!filteredList || filteredList.length === 0) return null;
    const r = Math.random();
    let acc = 0.0;
    for (const item of filteredList) {
      acc += item.prob;
      if (r <= acc) return item;
    }
    return filteredList[filteredList.length - 1];
  }

  /**
   * Computes calibrated vocabulary probabilities given temperature, top-k, and top-p.
   */
  function getVocabDistribution(customLogits = null, temperature = 1.0, topK = null, topP = null) {
    const baseVocab = customLogits || VOCABULARY;
    const logits = baseVocab.map(v => v.logit);
    const probs = softmax(logits, temperature);

    const candidates = baseVocab.map((v, i) => ({
      token: v.token,
      logit: v.logit,
      prob: probs[i],
      category: v.category || 'general'
    }));

    const filtered = filterCandidates(candidates, topK, topP);
    const ent = entropy(probs);

    return {
      all: candidates,
      filtered,
      temperature,
      entropy: ent,
      topCandidate: filtered[0]
    };
  }

  /**
   * Simulated autoregressive generation step
   */
  const CONTINUATIONS = {
    "The autonomous agent": [
      { token: "perceives", logit: 3.5 },
      { token: "executes", logit: 3.1 },
      { token: "plans", logit: 2.8 },
      { token: "observes", logit: 2.0 },
      { token: "hallucinates", logit: -0.5 }
    ],
    "perceives": [
      { token: "environmental", logit: 3.4 },
      { token: "external", logit: 3.0 },
      { token: "feedback", logit: 2.5 },
      { token: "random", logit: -0.2 }
    ],
    "environmental": [
      { token: "state", logit: 3.8 },
      { token: "observations", logit: 3.2 },
      { token: "signals", logit: 2.1 }
    ],
    "state": [
      { token: "and", logit: 3.9 },
      { token: "before", logit: 2.7 },
      { token: "through", logit: 1.5 }
    ],
    "and": [
      { token: "selects", logit: 3.6 },
      { token: "updates", logit: 3.2 },
      { token: "reasons", logit: 2.8 }
    ],
    "selects": [
      { token: "actions", logit: 3.7 },
      { token: "tools", logit: 3.4 },
      { token: "subgoals", logit: 2.5 }
    ]
  };

  function getNextTokenOptions(context) {
    const tokens = context.trim().split(/\s+/);
    const lastWord = tokens[tokens.length - 1]?.toLowerCase() || "";
    if (CONTINUATIONS[lastWord]) {
      return CONTINUATIONS[lastWord];
    }
    // Default dynamic logits
    return [
      { token: "using", logit: 2.8 },
      { token: "via", logit: 2.3 },
      { token: "with", logit: 2.1 },
      { token: "accurately", logit: 1.6 },
      { token: "dynamically", logit: 1.1 }
    ];
  }

  // --- Prompt Engineering Builders ---

  function buildZeroShotPrompt(taskInstruction, input) {
    return `System: You are an expert AI assistant. Complete the task directly without examples.\n\nTask: ${taskInstruction}\nInput: ${input}\nAnswer:`;
  }

  function buildFewShotPrompt(taskInstruction, examples, testInput) {
    let text = `System: Follow the pattern demonstrated in the examples below.\n\nTask: ${taskInstruction}\n\n`;
    examples.forEach((ex, i) => {
      text += `Example ${i + 1}:\nInput: ${ex.input}\nOutput: ${ex.output}\n\n`;
    });
    text += `Test Input: ${testInput}\nOutput:`;
    return text;
  }

  function buildCoTPrompt(question) {
    return `Question: ${question}\n\nInstructions: Think step-by-step. Break down your reasoning sequentially into explicit thoughts before stating your final answer.\n\nReasoning:`;
  }

  function buildJsonSystemPrompt(schema, instructions) {
    return `System: You are an API backend. You must strictly output valid JSON matching the following schema. Never include conversational text outside the JSON object.\n\nJSON Schema:\n${JSON.stringify(schema, null, 2)}\n\nInstructions: ${instructions}`;
  }

  // Export to window
  window.GenAIEngine = {
    VOCABULARY,
    softmax,
    entropy,
    filterCandidates,
    sampleToken,
    getVocabDistribution,
    getNextTokenOptions,
    buildZeroShotPrompt,
    buildFewShotPrompt,
    buildCoTPrompt,
    buildJsonSystemPrompt
  };

})();
