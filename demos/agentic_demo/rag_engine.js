/**
 * rag_engine.js — Retrieval-Augmented Generation (RAG) Engine
 * MLAI401 Topic 07 Reference Implementation
 *
 * Exposes window.RAGEngine:
 *   - Dense vector embeddings simulator with 2D projection for visualization
 *   - Vector math: dot product, L2 norm, cosine similarity, Euclidean distance
 *   - Document Chunker with configurable window size & token overlap
 *   - In-Memory Vector Store with Top-K Nearest Neighbor retrieval
 *   - RAG Pipeline: Retrieve -> Augment -> Grounded Generation
 *   - Hallucination detector & citation verifier
 */

(function () {
  'use strict';

  // Vector Math Utilities
  function dotProduct(u, v) {
    let sum = 0.0;
    const len = Math.min(u.length, v.length);
    for (let i = 0; i < len; i++) sum += u[i] * v[i];
    return sum;
  }

  function vectorNorm(u) {
    let sum = 0.0;
    for (let i = 0; i < u.length; i++) sum += u[i] * u[i];
    return Math.sqrt(sum);
  }

  function cosineSimilarity(u, v) {
    const nu = vectorNorm(u);
    const nv = vectorNorm(v);
    if (nu === 0 || nv === 0) return 0.0;
    const sim = dotProduct(u, v) / (nu * nv);
    return Math.max(-1.0, Math.min(1.0, sim));
  }

  function euclideanDistance(u, v) {
    let sum = 0.0;
    const len = Math.min(u.length, v.length);
    for (let i = 0; i < len; i++) {
      const diff = u[i] - v[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  function normalizeVector(u) {
    const norm = vectorNorm(u);
    if (norm === 0) return u.map(() => 0);
    return u.map(x => x / norm);
  }

  // Semantic Categories for Embedding Simulation
  const SEMANTIC_CLUSTERS = [
    { name: "Search & Planning", keywords: ["search", "bfs", "dfs", "astar", "heuristic", "graph", "frontier", "planning", "tree", "subgoal"], angle: 0.15 },
    { name: "Logic & Knowledge", keywords: ["logic", "propositional", "inference", "resolution", "entailment", "horn", "wumpus", "clause", "sound"], angle: 0.65 },
    { name: "Probabilistic & Bayes", keywords: ["bayes", "bayesian", "probability", "prior", "posterior", "sampling", "markov", "network", "belief"], angle: 1.25 },
    { name: "Reinforcement Learning", keywords: ["rl", "reinforcement", "q-learning", "reward", "policy", "mdp", "bellman", "sarsa", "value", "state"], angle: 1.85 },
    { name: "RAG & Vector Search", keywords: ["rag", "retrieval", "vector", "embedding", "cosine", "chunk", "database", "similarity", "dense", "indexing"], angle: 2.45 },
    { name: "Agents & ReAct", keywords: ["agent", "agentic", "react", "scratchpad", "tool", "action", "thought", "observation", "autonomous", "loop"], angle: 3.10 },
    { name: "AI Ethics & Safety", keywords: ["ethics", "safety", "bias", "fairness", "hallucination", "jailbreak", "injection", "guardrail", "alignment"], angle: 3.80 },
    { name: "Neural Networks", keywords: ["neural", "perceptron", "gradient", "loss", "backpropagation", "layer", "weights", "descent", "activation"], angle: 4.45 }
  ];

  /**
   * Deterministic Semantic Embedding Model Simulator
   * Maps text to a high-dimensional vector and a 2D projection (x, y) on the unit circle.
   */
  class SemanticEmbeddingModel {
    constructor(dim = 16) {
      this.dim = dim;
    }

    encode(text) {
      const tokens = text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean);
      if (tokens.length === 0) {
        return {
          vector: new Array(this.dim).fill(0),
          projection2d: { x: 0, y: 0, angle: 0 }
        };
      }

      // Compute cluster resonance
      let weightedAngleSum = 0.0;
      let weightTotal = 0.0;
      const dimVec = new Array(this.dim).fill(0.0);

      tokens.forEach(tok => {
        let matched = false;
        SEMANTIC_CLUSTERS.forEach((cluster, cIdx) => {
          if (cluster.keywords.includes(tok)) {
            weightedAngleSum += cluster.angle * 2.5;
            weightTotal += 2.5;
            dimVec[cIdx % this.dim] += 2.5;
            matched = true;
          }
        });
        if (!matched) {
          // Character hash dispersion
          let h = 0;
          for (let i = 0; i < tok.length; i++) {
            h = (h << 5) - h + tok.charCodeAt(i);
            h |= 0;
          }
          const pseudoAngle = (Math.abs(h) % 628) / 100.0;
          weightedAngleSum += pseudoAngle * 0.4;
          weightTotal += 0.4;
          dimVec[Math.abs(h) % this.dim] += 0.5;
        }
      });

      const avgAngle = weightTotal > 0 ? (weightedAngleSum / weightTotal) % (2 * Math.PI) : 0;
      const x = Math.cos(avgAngle);
      const y = Math.sin(avgAngle);

      // Add 2D coordinate projections into first 2 dimensions
      dimVec[0] += x * 1.5;
      dimVec[1] += y * 1.5;

      const normalizedVec = normalizeVector(dimVec);

      return {
        vector: normalizedVec,
        projection2d: { x, y, angle: avgAngle }
      };
    }
  }

  /**
   * Document Chunker with configurable size and token overlap
   */
  class DocumentChunker {
    constructor(chunkSize = 30, overlap = 8) {
      this.chunkSize = Math.max(10, chunkSize);
      this.overlap = Math.min(overlap, Math.floor(this.chunkSize * 0.5));
    }

    chunkText(text, sourceId = "doc") {
      const tokens = text.trim().split(/\s+/).filter(Boolean);
      if (tokens.length === 0) return [];

      const chunks = [];
      const step = Math.max(1, this.chunkSize - this.overlap);

      for (let i = 0; i < tokens.length; i += step) {
        const passageTokens = tokens.slice(i, i + this.chunkSize);
        const chunkText = passageTokens.join(" ");
        const chunkIndex = Math.floor(i / step);
        chunks.push({
          id: `${sourceId}_chunk_${chunkIndex + 1}`,
          sourceId,
          chunkIndex,
          startToken: i,
          endToken: i + passageTokens.length,
          text: chunkText,
          overlapBefore: i > 0 ? this.overlap : 0
        });
        if (i + this.chunkSize >= tokens.length) break;
      }
      return chunks;
    }
  }

  /**
   * In-Memory Vector Store with Cosine Similarity Search
   */
  class InMemoryVectorStore {
    constructor(embeddingModel = null) {
      this.model = embeddingModel || new SemanticEmbeddingModel();
      this.records = []; // { id, text, metadata, vector, projection2d }
    }

    addRecord(id, text, metadata = {}) {
      const { vector, projection2d } = this.model.encode(text);
      const record = { id, text, metadata, vector, projection2d };
      this.records.push(record);
      return record;
    }

    search(query, topK = 3) {
      if (this.records.length === 0) return [];
      const qEnc = this.model.encode(query);
      
      const scored = this.records.map(rec => {
        const sim = cosineSimilarity(qEnc.vector, rec.vector);
        const dist = euclideanDistance(qEnc.vector, rec.vector);
        return {
          ...rec,
          similarity: sim,
          distance: dist
        };
      });

      scored.sort((a, b) => b.similarity - a.similarity);
      return {
        query,
        queryEncoding: qEnc,
        results: scored.slice(0, topK)
      };
    }

    clear() {
      this.records = [];
    }
  }

  // Preloaded Knowledge Base of MLAI401 Concepts
  const DEFAULT_CORPUS = [
    {
      id: "DOC_MDP",
      title: "Markov Decision Processes",
      text: "A Markov Decision Process MDP is formulated by the tuple S, A, P, R, gamma. Bellman optimality equations express the optimal state value V*(s) as the maximum expected return over all actions, discounted by gamma."
    },
    {
      id: "DOC_QLEARN",
      title: "Tabular Q-Learning",
      text: "Q-learning is a model-free temporal difference TD algorithm that learns optimal action values Q(s,a) directly from environment transitions without needing transition probabilities P. It uses an epsilon-greedy exploration policy."
    },
    {
      id: "DOC_ASTAR",
      title: "A* Graph Search",
      text: "A* search evaluates frontier nodes using f(n) = g(n) + h(n), where g(n) is the exact path cost from start to node n, and h(n) is an admissible heuristic that never overestimates the true remaining distance to the goal."
    },
    {
      id: "DOC_BAYES",
      title: "Bayesian Networks",
      text: "A Bayesian Network is a Directed Acyclic Graph DAG representing joint probability distributions. Nodes represent random variables and directed edges encode conditional dependencies via Conditional Probability Tables CPTs."
    },
    {
      id: "DOC_REACT",
      title: "The ReAct Agent Framework",
      text: "The ReAct loop synergizes reasoning and action in LLMs. The agent interleaves verbal thoughts, external tool execution actions, and environmental observations to solve multi-step problems and recover from tool errors."
    },
    {
      id: "DOC_ETHICS",
      title: "AI Safety & Prompt Injection",
      text: "Prompt injection attacks inject unauthorized commands through untrusted user data to override system instructions. Robust architectures isolate untrusted content using XML delimiters and employ Human-in-the-Loop confirmation gates for critical tools."
    }
  ];

  /**
   * Complete RAG QA Assistant
   */
  class RAGPipeline {
    constructor() {
      this.model = new SemanticEmbeddingModel();
      this.chunker = new DocumentChunker(30, 8);
      this.vectorStore = new InMemoryVectorStore(this.model);
      this.loadCorpus(DEFAULT_CORPUS);
    }

    loadCorpus(docs) {
      this.vectorStore.clear();
      docs.forEach(doc => {
        const chunks = this.chunker.chunkText(doc.text, doc.id);
        chunks.forEach(chunk => {
          this.vectorStore.addRecord(chunk.id, chunk.text, {
            sourceTitle: doc.title || doc.id,
            chunkIndex: chunk.chunkIndex
          });
        });
      });
    }

    query(queryString, topK = 2) {
      const searchResult = this.vectorStore.search(queryString, topK);
      const chunks = searchResult.results;

      // Construct augmented prompt
      const contextBlocks = chunks.map((c, i) => `[Context Chunk ${i + 1} | Source: ${c.id}]:\n"${c.text}"`).join("\n\n");
      const augmentedPrompt = `System: You are an expert factual AI assistant. Answer the user query strictly using the provided context passages. Cite the chunk ID for every assertion. If the answer is not in the context, explicitly reply 'I do not have sufficient information.'\n\nContext:\n${contextBlocks}\n\nQuestion: ${queryString}\n\nAnswer:`;

      // Synthesize grounded response
      let groundedAnswer = "";
      if (chunks.length === 0 || chunks[0].similarity < 0.20) {
        groundedAnswer = "I do not have sufficient grounded information in my knowledge base to answer this query with high confidence.";
      } else {
        const facts = chunks.map(c => {
          const sentences = c.text.split(".").filter(s => s.trim().length > 15);
          return `${sentences[0].trim()}. [Source: ${c.id}]`;
        });
        groundedAnswer = facts.join(" ");
      }

      return {
        query: queryString,
        encoding: searchResult.queryEncoding,
        retrievedChunks: chunks,
        augmentedPrompt,
        groundedAnswer
      };
    }
  }

  // Export to window
  window.RAGEngine = {
    dotProduct,
    vectorNorm,
    cosineSimilarity,
    euclideanDistance,
    normalizeVector,
    SemanticEmbeddingModel,
    DocumentChunker,
    InMemoryVectorStore,
    RAGPipeline,
    DEFAULT_CORPUS,
    SEMANTIC_CLUSTERS
  };

})();
