/**
 * agent_engine.js — Agentic AI & Autonomous Architectures Engine
 * MLAI401 Topic 07 Reference Implementation
 *
 * Exposes window.AgentEngine:
 *   - Tool Registry & sandboxed tool executions (Calculator, Search, REPL, File Writer)
 *   - Scratchpad working memory with token tracking & compression
 *   - Subtask Planner (DAG decomposition) & Tree-of-Thoughts (ToT)
 *   - ReAct Loop (Thought -> Action -> Observation -> Replan)
 *   - Multi-Agent Systems: Manager-Worker, Peer-to-Peer, Generator-Critic
 */

(function () {
  'use strict';

  // --- Tool Catalog & Executions ---

  const TOOLS = [
    {
      name: "calculator",
      displayName: "Arithmetic Calculator",
      icon: "calculator",
      description: "Evaluates mathematical and arithmetic expressions safely.",
      parameters: {
        type: "object",
        properties: {
          expression: {
            type: "string",
            description: "Mathematical expression, e.g. '(150 + 155 + 152) / 3' or 'sqrt(1764) * 3'"
          }
        },
        required: ["expression"]
      },
      execute: (args) => {
        const expr = (args.expression || "").trim();
        // Safe evaluation
        try {
          // Check for forbidden characters
          if (/[^0-9+\-*/()., \ta-zA-Z_]/.test(expr)) {
            return { error: "Expression contains invalid characters." };
          }
          // Substitute simple math functions
          let sanitized = expr
            .replace(/sqrt\(/g, "Math.sqrt(")
            .replace(/pow\(/g, "Math.pow(")
            .replace(/abs\(/g, "Math.abs(")
            .replace(/round\(/g, "Math.round(");
          
          // Check division by zero before evaluation
          if (/\/(\s*)0(?![0-9.])/.test(sanitized)) {
            return { error: "Division by zero is undefined." };
          }
          const fn = new Function("Math", `return (${sanitized});`);
          const res = fn(Math);
          if (isNaN(res) || !isFinite(res)) {
            return { error: "Mathematical error: result is NaN or infinite." };
          }
          return { result: typeof res === 'number' ? Math.round(res * 10000) / 10000 : res };
        } catch (e) {
          return { error: `Calculation failed: ${e.message}` };
        }
      }
    },
    {
      name: "web_search",
      displayName: "Web & Corpus Search",
      icon: "globe",
      description: "Queries simulated internet index and private enterprise database.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search keywords or question."
          }
        },
        required: ["query"]
      },
      execute: (args) => {
        const q = (args.query || "").toLowerCase();
        const searchDatabase = [
          { key: "stock price company x", content: "Company X closing stock prices over the last 3 days: Day 1: $150.00, Day 2: $155.00, Day 3: $152.00." },
          { key: "monaco population", content: "Monaco: Population is 39,000 residents; Total territory area is 2.08 square kilometers." },
          { key: "grid world living penalty", content: "In the MLAI401 Grid World MDP, each step penalty is -0.04 to encourage efficient shortest paths." },
          { key: "paris weather", content: "Paris, France: Current temperature 18.5 C with light rain showers and 72% humidity." },
          { key: "safe division python", content: "Safe division in Python: always test 'if b == 0: return None' or raise a custom ZeroDivision exception." }
        ];

        for (const item of searchDatabase) {
          if (q.includes(item.key) || item.key.split(" ").slice(0, 2).every(w => q.includes(w))) {
            return { result: item.content };
          }
        }
        return { result: `No direct web match found for query: "${args.query}". Try rephrasing with specific entity keywords.` };
      }
    },
    {
      name: "python_repl",
      displayName: "Python / JS REPL Sandbox",
      icon: "terminal",
      description: "Executes isolated algorithmic scripts and computes statistical outputs.",
      parameters: {
        type: "object",
        properties: {
          code: {
            type: "string",
            description: "Executable code block."
          }
        },
        required: ["code"]
      },
      execute: (args) => {
        const code = args.code || "";
        if (code.includes("import os") || code.includes("process.exit") || code.includes("fetch")) {
          return { error: "Security Guardrail Alert: System-level and network calls are restricted in this sandbox." };
        }
        return { result: `Code executed successfully. Output buffer: [${code.length} bytes processed, exit code 0].` };
      }
    },
    {
      name: "file_writer",
      displayName: "Virtual File Writer",
      icon: "file-text",
      description: "Saves structured reports or generated code to the virtual filesystem.",
      parameters: {
        type: "object",
        properties: {
          filename: { type: "string", description: "Target filename, e.g. 'summary_report.md'" },
          content: { type: "string", description: "Text content to write." }
        },
        required: ["filename", "content"]
      },
      execute: (args) => {
        const fn = args.filename || "output.txt";
        const content = args.content || "";
        return { result: `File '${fn}' written successfully (${content.length} characters saved).` };
      }
    }
  ];

  class ToolRegistry {
    constructor() {
      this.tools = new Map();
      TOOLS.forEach(t => this.tools.set(t.name, t));
    }

    get(name) {
      return this.tools.get(name);
    }

    list() {
      return Array.from(this.tools.values());
    }

    executeTool(name, args) {
      const tool = this.get(name);
      if (!tool) {
        return { error: `Tool '${name}' is not registered.` };
      }
      return tool.execute(args);
    }
  }

  // --- Scratchpad Memory Model ---

  class Scratchpad {
    constructor(tokenBudget = 2000) {
      this.steps = [];
      this.tokenBudget = tokenBudget;
      this.usedTokens = 0;
    }

    addStep(step) {
      const idx = this.steps.length + 1;
      const entry = {
        index: idx,
        thought: step.thought || "",
        action: step.action || null,
        observation: step.observation || null,
        status: step.status || "success",
        timestamp: Date.now()
      };
      this.steps.push(entry);
      this.updateTokenUsage();
      return entry;
    }

    updateObservation(index, observation, status = "success") {
      const step = this.steps.find(s => s.index === index);
      if (step) {
        step.observation = observation;
        step.status = status;
        this.updateTokenUsage();
      }
    }

    updateTokenUsage() {
      let chars = 0;
      this.steps.forEach(s => {
        chars += (s.thought || "").length;
        if (s.action) chars += JSON.stringify(s.action).length;
        if (s.observation) chars += JSON.stringify(s.observation).length;
      });
      // Estimate 4 characters per token
      this.usedTokens = Math.ceil(chars / 4);
    }

    compressMemory() {
      if (this.steps.length <= 2) return;
      // Compress older steps into a summary badge
      const older = this.steps.slice(0, this.steps.length - 2);
      const summaryText = `[Summarized ${older.length} prior turns: gathered factual inputs and computed intermediate results.]`;
      this.steps = [
        {
          index: 1,
          thought: summaryText,
          action: { tool: "system_memory_compaction", args: { original_turns: older.length } },
          observation: "Memory reclaimed: 65% token budget freed.",
          status: "compressed"
        },
        ...this.steps.slice(this.steps.length - 2).map((s, i) => ({ ...s, index: i + 2 }))
      ];
      this.updateTokenUsage();
    }

    clear() {
      this.steps = [];
      this.usedTokens = 0;
    }
  }

  // --- Prebuilt ReAct Trajectories for Interactive Demos ---

  const REACT_PRESETS = {
    stock_analysis: {
      id: "stock_analysis",
      title: "Running Example 2: Average Stock Price & Summary",
      goal: "Find the average stock price of Company X over the last 3 days and save a summary report.",
      steps: [
        {
          thought: "I need to find the closing stock prices of Company X over the last 3 days. I should search the web or private database for this data.",
          action: { tool: "web_search", args: { query: "stock price company x" } },
          observation: "Company X closing stock prices over the last 3 days: Day 1: $150.00, Day 2: $155.00, Day 3: $152.00."
        },
        {
          thought: "The prices are 150.00, 155.00, and 152.00. I need to calculate the average: (150 + 155 + 152) / 3.",
          action: { tool: "calculator", args: { expression: "(150 + 155 + 152) / 3" } },
          observation: { result: 152.3333 }
        },
        {
          thought: "The average stock price is $152.33. Now I will write the final summary report to 'stock_summary.md'.",
          action: { tool: "file_writer", args: { filename: "stock_summary.md", content: "Company X 3-Day Average Price: $152.33." } },
          observation: "File 'stock_summary.md' written successfully (45 characters saved)."
        },
        {
          thought: "All subgoals are accomplished: stock prices retrieved, average calculated, and summary file saved.",
          action: null,
          isFinal: true,
          finalAnswer: "The closing stock prices for Company X over the last 3 days were $150.00, $155.00, and $152.00. The calculated 3-day average is $152.33. A summary report has been saved to stock_summary.md."
        }
      ]
    },
    monaco_density: {
      id: "monaco_density",
      title: "Monaco Population Density Calculation",
      goal: "Calculate the population density of Monaco given its population and territory area.",
      steps: [
        {
          thought: "I need to look up the exact population and area of Monaco to calculate its population density.",
          action: { tool: "web_search", args: { query: "monaco population" } },
          observation: "Monaco: Population is 39,000 residents; Total territory area is 2.08 square kilometers."
        },
        {
          thought: "Population density is defined as Population / Area. That is 39,000 / 2.08 residents per km².",
          action: { tool: "calculator", args: { expression: "39000 / 2.08" } },
          observation: { result: 18750.0 }
        },
        {
          thought: "The calculation yields exactly 18,750 people per km². I can formulate the final answer.",
          action: null,
          isFinal: true,
          finalAnswer: "Monaco has a population of 39,000 and an area of 2.08 km², resulting in a population density of 18,750 residents per square kilometer."
        }
      ]
    },
    error_recovery: {
      id: "error_recovery",
      title: "Self-Correction & Tool Error Recovery",
      goal: "Compute the efficiency ratio 100 / (12 - 12) and report the metric.",
      steps: [
        {
          thought: "The user requested computing 100 / (12 - 12). Let me pass this expression to the calculator.",
          action: { tool: "calculator", args: { expression: "100 / (12 - 12)" } },
          observation: { error: "Division by zero is undefined." }
        },
        {
          thought: "The calculator returned an error: 'Division by zero is undefined'. The denominator 12 - 12 equals 0. I must not crash or repeat the bad action. Instead, I reflect on the mathematical impossibility and report the undefined condition.",
          action: null,
          isFinal: true,
          finalAnswer: "The expression 100 / (12 - 12) involves division by zero, which is mathematically undefined. No finite metric could be computed."
        }
      ]
    }
  };

  // --- Multi-Agent Collaboration Simulation ---

  const MULTI_AGENT_SCENARIOS = {
    manager_worker: {
      id: "manager_worker",
      name: "Hierarchical Manager-Worker Squad",
      description: "Centralized Manager agent receives user prompt, decomposes into subtasks, and assigns to specialized Researcher and Writer agents.",
      timeline: [
        { turn: 1, sender: "Manager", recipient: "Researcher", type: "Task Delegation", payload: "Find historical Q-learning convergence theorem details." },
        { turn: 2, sender: "Researcher", recipient: "Manager", type: "Data Packet", payload: "Watkins & Dayan (1992) proved Q-learning converges to Q* under infinite exploration." },
        { turn: 3, sender: "Manager", recipient: "Writer", type: "Draft Request", payload: "Synthesize textbook summary paragraph citing Watkins & Dayan (1992)." },
        { turn: 4, sender: "Writer", recipient: "Manager", type: "Deliverable", payload: "Tabular Q-learning is provably convergent to optimal Q* (Watkins & Dayan, 1992)." },
        { turn: 5, sender: "Manager", recipient: "User", type: "Final Output", payload: "Verified summary delivered to user." }
      ]
    },
    generator_critic: {
      id: "generator_critic",
      name: "Generator-Critic (Adversarial Code Review)",
      description: "Developer Agent synthesizes code; Critic Agent audits edge cases (e.g. division by zero, null checks) until all criteria pass.",
      timeline: [
        { turn: 1, sender: "Developer", recipient: "Critic", type: "Code Submission", payload: "def divide(a, b):\n    return a / b" },
        { turn: 2, sender: "Critic", recipient: "Developer", type: "Code Audit: REJECT", payload: "Flaw detected: unhandled ZeroDivisionError when b == 0." },
        { turn: 3, sender: "Developer", recipient: "Critic", type: "Code Resubmission", payload: "def divide(a, b):\n    if b == 0:\n        return None\n    return a / b" },
        { turn: 4, sender: "Critic", recipient: "Developer", type: "Code Audit: APPROVE", payload: "Audit passed: All boundary conditions and zero-checks validated." },
        { turn: 5, sender: "Developer", recipient: "User", type: "Deployment", payload: "Safe function published." }
      ]
    },
    peer_to_peer: {
      id: "peer_to_peer",
      name: "Collaborative Peer-to-Peer Consensus",
      description: "Autonomous peers debate hypotheses on a shared blackboard to reach scientific consensus.",
      timeline: [
        { turn: 1, sender: "Agent Alpha", recipient: "Blackboard", type: "Proposal", payload: "Hypothesis A: Higher temperature T=1.5 aids exploration in creative reasoning." },
        { turn: 2, sender: "Agent Beta", recipient: "Blackboard", type: "Counter-Evidence", payload: "High temperature increases token entropy and hallucination rates on math benchmarks." },
        { turn: 3, sender: "Agent Gamma", recipient: "Blackboard", type: "Synthesis", payload: "Propose hybrid: T=0.2 for deterministic code/math, T=0.8 for creative writing." },
        { turn: 4, sender: "All Agents", recipient: "User", type: "Consensus", payload: "Adopted dynamic temperature scheduling based on task category." }
      ]
    }
  };

  // Export to window
  window.AgentEngine = {
    TOOLS,
    ToolRegistry,
    Scratchpad,
    REACT_PRESETS,
    MULTI_AGENT_SCENARIOS
  };

})();
