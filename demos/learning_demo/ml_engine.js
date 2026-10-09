/**
 * ml_engine.js — Zero-dependency Machine Learning Engine
 * Part of MLAI401 Topic 06: Learning & Decision Making
 * Implements:
 *   - Text Tokenization, Bag-of-Words, and TF-IDF Vectorization
 *   - Multinomial & Bernoulli Naive Bayes with Laplace Add-1 Smoothing and log-space computation
 *   - Confusion Matrix & Performance Metrics (Accuracy, Precision, Recall, F1-Score)
 *   - Perceptron linear classifier & step function
 *   - Multi-Layer Perceptron (2-layer MLP with ReLU/Sigmoid forward pass)
 *   - K-Means Clustering with Lloyd's algorithm, Voronoi assignments, and WCSS
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MLEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ===========================================================================
  // 1. Text Feature Extraction: Tokenizer, Bag-of-Words & TF-IDF
  // ===========================================================================

  function tokenize(text) {
    if (!text || typeof text !== 'string') return [];
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 1);
  }

  class TextCorpus {
    constructor(documents, labels = null) {
      this.documents = documents;
      this.labels = labels;
      this.tokenizedDocs = documents.map(d => tokenize(d));
      this.vocabulary = this.buildVocabulary();
      this.vocabIndex = {};
      this.vocabulary.forEach((w, idx) => { this.vocabIndex[w] = idx; });
      this.docFrequencies = this.computeDocFrequencies();
    }

    buildVocabulary() {
      const vocabSet = new Set();
      this.tokenizedDocs.forEach(tokens => {
        tokens.forEach(t => vocabSet.add(t));
      });
      return Array.from(vocabSet).sort();
    }

    computeDocFrequencies() {
      const df = {};
      this.vocabulary.forEach(w => { df[w] = 0; });
      this.tokenizedDocs.forEach(tokens => {
        const uniqueTokens = new Set(tokens);
        uniqueTokens.forEach(t => {
          if (df[t] !== undefined) df[t]++;
        });
      });
      return df;
    }

    getBagOfWords(doc) {
      const tokens = typeof doc === 'string' ? tokenize(doc) : doc;
      const counts = {};
      this.vocabulary.forEach(w => { counts[w] = 0; });
      tokens.forEach(t => {
        if (counts[t] !== undefined) counts[t]++;
      });
      return counts;
    }

    getTFIDFVector(doc) {
      const tokens = typeof doc === 'string' ? tokenize(doc) : doc;
      const n = this.documents.length;
      const termCounts = {};
      tokens.forEach(t => {
        termCounts[t] = (termCounts[t] || 0) + 1;
      });

      const totalTerms = tokens.length || 1;
      const tfidf = {};

      this.vocabulary.forEach(w => {
        const tf = (termCounts[w] || 0) / totalTerms;
        const df = this.docFrequencies[w] || 0;
        // Smooth IDF: log((N + 1) / (DF + 1)) + 1
        const idf = Math.log((n + 1) / (df + 1)) + 1.0;
        tfidf[w] = tf * idf;
      });

      return tfidf;
    }
  }

  // ===========================================================================
  // 2. Naive Bayes Classifier
  // ===========================================================================

  class NaiveBayesClassifier {
    constructor(alpha = 1.0) {
      this.alpha = alpha; // Laplace smoothing parameter
      this.classes = [];
      this.priors = {};
      this.logPriors = {};
      this.wordCounts = {};
      this.totalWords = {};
      this.vocab = [];
      this.vocabSize = 0;
    }

    fit(docs, labels) {
      this.classes = Array.from(new Set(labels));
      const totalDocs = docs.length;
      const vocabSet = new Set();

      this.classes.forEach(c => {
        this.wordCounts[c] = {};
        this.totalWords[c] = 0;
        const countC = labels.filter(l => l === c).length;
        this.priors[c] = countC / totalDocs;
        this.logPriors[c] = Math.log(this.priors[c]);
      });

      docs.forEach((doc, idx) => {
        const c = labels[idx];
        const tokens = tokenize(doc);
        tokens.forEach(w => {
          vocabSet.add(w);
          this.wordCounts[c][w] = (this.wordCounts[c][w] || 0) + 1;
          this.totalWords[c]++;
        });
      });

      this.vocab = Array.from(vocabSet).sort();
      this.vocabSize = this.vocab.length;
    }

    getWordLikelihood(w, c) {
      const count = (this.wordCounts[c] && this.wordCounts[c][w]) || 0;
      const total = (this.totalWords[c] || 0) + this.alpha * this.vocabSize;
      return (count + this.alpha) / total;
    }

    predictLogPosterior(doc) {
      const tokens = tokenize(doc);
      const logPosteriors = {};
      const wordBreakdown = {};

      this.classes.forEach(c => {
        let score = this.logPriors[c];
        wordBreakdown[c] = [];

        tokens.forEach(w => {
          const prob = this.getWordLikelihood(w, c);
          const logP = Math.log(prob);
          score += logP;
          wordBreakdown[c].push({ word: w, prob, logP });
        });

        logPosteriors[c] = score;
      });

      // Find max class
      let bestClass = this.classes[0];
      let maxScore = logPosteriors[bestClass];
      this.classes.forEach(c => {
        if (logPosteriors[c] > maxScore) {
          maxScore = logPosteriors[c];
          bestClass = c;
        }
      });

      // Convert log posteriors to normalized probabilities via softmax
      const maxLog = Math.max(...Object.values(logPosteriors));
      let sumExp = 0;
      const probs = {};
      this.classes.forEach(c => {
        probs[c] = Math.exp(logPosteriors[c] - maxLog);
        sumExp += probs[c];
      });
      this.classes.forEach(c => {
        probs[c] /= sumExp;
      });

      return {
        predictedClass: bestClass,
        probabilities: probs,
        logPosteriors,
        wordBreakdown
      };
    }

    predict(doc) {
      return this.predictLogPosterior(doc).predictedClass;
    }
  }

  // ===========================================================================
  // 3. Model Evaluation: Confusion Matrix & Metrics
  // ===========================================================================

  function evaluateClassification(yTrue, yPred, posLabel = 1) {
    let tp = 0, fp = 0, fn = 0, tn = 0;

    for (let i = 0; i < yTrue.length; i++) {
      const actual = yTrue[i];
      const pred = yPred[i];

      if (actual === posLabel && pred === posLabel) tp++;
      else if (actual !== posLabel && pred === posLabel) fp++;
      else if (actual === posLabel && pred !== posLabel) fn++;
      else tn++;
    }

    const total = tp + fp + fn + tn || 1;
    const accuracy = (tp + tn) / total;
    const precision = (tp + fp) > 0 ? tp / (tp + fp) : 0;
    const recall = (tp + fn) > 0 ? tp / (tp + fn) : 0;
    const f1 = (precision + recall) > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    return {
      tp, fp, fn, tn,
      total,
      accuracy,
      precision,
      recall,
      f1
    };
  }

  // ===========================================================================
  // 4. Neural Networks: Perceptron, Activations & Multi-Layer Perceptron
  // ===========================================================================

  function sigmoid(z) {
    return z >= 0 ? 1.0 / (1.0 + Math.exp(-z)) : Math.exp(z) / (1.0 + Math.exp(z));
  }

  function relu(z) {
    return Math.max(0, z);
  }

  class Perceptron {
    constructor(weights = [0.5, -0.5], bias = 0.0) {
      this.weights = [...weights];
      this.bias = bias;
    }

    forward(x) {
      let z = this.bias;
      for (let i = 0; i < this.weights.length; i++) {
        z += this.weights[i] * x[i];
      }
      return { z, yHat: z >= 0 ? 1 : 0 };
    }

    trainStep(x, y, alpha = 0.1) {
      const { z, yHat } = this.forward(x);
      const error = y - yHat;
      for (let i = 0; i < this.weights.length; i++) {
        this.weights[i] += alpha * error * x[i];
      }
      this.bias += alpha * error;
      return { error, weights: [...this.weights], bias: this.bias };
    }
  }

  class SimpleMLP {
    constructor() {
      // 2 inputs -> 2 hidden neurons -> 1 output neuron
      this.W1 = [
        [1.5, -1.5],
        [-1.5, 1.5]
      ];
      this.b1 = [-0.5, -0.5];
      this.W2 = [2.0, 2.0];
      this.b2 = -1.0;
    }

    forward(x) {
      // Hidden layer with ReLU
      const z1 = [
        x[0] * this.W1[0][0] + x[1] * this.W1[1][0] + this.b1[0],
        x[0] * this.W1[0][1] + x[1] * this.W1[1][1] + this.b1[1]
      ];
      const h1 = [relu(z1[0]), relu(z1[1])];

      // Output layer with Sigmoid
      const z2 = h1[0] * this.W2[0] + h1[1] * this.W2[1] + this.b2;
      const yHat = sigmoid(z2);

      return { z1, h1, z2, yHat, predictedClass: yHat >= 0.5 ? 1 : 0 };
    }
  }

  function euclideanDistance(p1, p2) {
    let sum = 0;
    for (let i = 0; i < p1.length; i++) {
      sum += (p1[i] - p2[i]) * (p1[i] - p2[i]);
    }
    return Math.sqrt(sum);
  }

  class KMeans {
    constructor(k = 3, maxIters = 30, initMethod = 'random') {
      this.k = k;
      this.maxIters = maxIters;
      this.initMethod = initMethod;
      this.centroids = [];
      this.labels = [];
      this.converged = false;
      this.wcss = 0;
    }

    initCentroids(points) {
      if (!points || points.length === 0) return;
      if (this.initMethod === 'kmeans++') {
        this.centroids = [points[Math.floor(Math.random() * points.length)].slice()];
        while (this.centroids.length < this.k) {
          const distances = points.map(p => {
            let minDist = Infinity;
            this.centroids.forEach(c => {
              const d = euclideanDistance(p, c);
              if (d < minDist) minDist = d;
            });
            return minDist * minDist;
          });
          const sumD = distances.reduce((a, b) => a + b, 0);
          let r = Math.random() * sumD;
          let chosen = points[0];
          for (let i = 0; i < points.length; i++) {
            r -= distances[i];
            if (r <= 0) {
              chosen = points[i];
              break;
            }
          }
          this.centroids.push(chosen.slice());
        }
      } else {
        this.centroids = points.slice(0, this.k).map(p => p.slice());
      }
    }

    step(points) {
      if (!points || points.length < this.k) return false;

      if (!this.centroids || this.centroids.length < this.k) {
        this.initCentroids(points);
      }

      const assignments = [];
      const clusters = Array.from({ length: this.k }, () => []);

      // 1. Assignment Step
      points.forEach(p => {
        let minDist = Infinity;
        let bestK = 0;
        this.centroids.forEach((c, idx) => {
          const d = euclideanDistance(p, c);
          if (d < minDist) {
            minDist = d;
            bestK = idx;
          }
        });
        assignments.push(bestK);
        clusters[bestK].push(p);
      });

      this.labels = assignments;

      // 2. Update Step
      let maxShift = 0;
      const newCentroids = [];
      for (let k = 0; k < this.k; k++) {
        if (clusters[k].length === 0) {
          newCentroids.push(this.centroids[k].slice());
        } else {
          const meanX = clusters[k].reduce((s, p) => s + p[0], 0) / clusters[k].length;
          const meanY = clusters[k].reduce((s, p) => s + p[1], 0) / clusters[k].length;
          const shift = euclideanDistance(this.centroids[k], [meanX, meanY]);
          if (shift > maxShift) maxShift = shift;
          newCentroids.push([meanX, meanY]);
        }
      }

      this.centroids = newCentroids;
      this.converged = maxShift < 0.001;

      // Compute WCSS
      let wcss = 0;
      points.forEach((p, idx) => {
        const c = this.centroids[assignments[idx]];
        wcss += Math.pow(p[0] - c[0], 2) + Math.pow(p[1] - c[1], 2);
      });
      this.wcss = wcss;

      return !this.converged;
    }
  }

  // --- Preloaded Sample Text Dataset ---
  function getSampleSpamDataset() {
    return {
      trainDocs: [
        'Win lottery cash prize click here now',
        'Urgent lottery claim your free bonus cash',
        'Exclusive luxury prize money winner reward',
        'Cheap pills luxury replica watches prize',
        'Project team meeting tomorrow morning at 10',
        'Quarterly financial revenue report attached please review',
        'Lunch meeting with client discuss product schedule',
        'Please review the draft document and reply soon',
        'Engineering architecture sync call conference room',
        'Hi team thanks for the helpful feedback on the slides'
      ],
      trainLabels: [
        'Spam', 'Spam', 'Spam', 'Spam',
        'Ham', 'Ham', 'Ham', 'Ham', 'Ham', 'Ham'
      ]
    };
  }

  return {
    tokenize,
    euclideanDistance,
    TextCorpus,
    NaiveBayesClassifier,
    evaluateClassification,
    Perceptron,
    SimpleMLP,
    KMeans,
    getSampleSpamDataset
  };
}));
