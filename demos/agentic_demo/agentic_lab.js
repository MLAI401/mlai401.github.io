/**
 * agentic_lab.js — Topic 07: Generative & Agentic AI Playground Labs
 * Controls playground.html#view-agentic
 *
 * Implements 3 Interactive Labs:
 *   1. RAG Vector Search & Prompt Augmentation Studio
 *   2. Goal-Driven ReAct Agent Simulator
 *   3. Multi-Agent Collaboration Sandbox
 */

(function () {
  'use strict';

  const G = window.GenAIEngine;
  const R = window.RAGEngine;
  const A = window.AgentEngine;

  let activeSubLab = 'rag'; // 'rag' | 'react' | 'multi'
  let ragPipelineInstance = null;
  let currentReActScenario = null;
  let currentReActStep = 0;

  function init() {
    const viewContainer = document.getElementById('view-agentic');
    if (!viewContainer) return;

    if (!ragPipelineInstance && R && R.RAGPipeline) {
      ragPipelineInstance = new R.RAGPipeline();
    }

    renderLabShell(viewContainer);
  }

  function renderLabShell(container) {
    container.innerHTML = `
      <div class="agentic-lab-wrap">
        <!-- Sub-lab navigation tabs -->
        <div class="agentic-sublab-nav">
          <button class="sublab-btn ${activeSubLab === 'rag' ? 'active' : ''}" data-sublab="rag">
            <i data-lucide="database"></i> 1. RAG Vector Search &amp; Prompt Studio
          </button>
          <button class="sublab-btn ${activeSubLab === 'react' ? 'active' : ''}" data-sublab="react">
            <i data-lucide="bot"></i> 2. Goal-Driven ReAct Agent Simulator
          </button>
          <button class="sublab-btn ${activeSubLab === 'multi' ? 'active' : ''}" data-sublab="multi">
            <i data-lucide="users"></i> 3. Multi-Agent Collaboration Sandbox
          </button>
        </div>

        <!-- Sub-lab Viewport -->
        <div class="agentic-sublab-content" id="agentic-sublab-viewport">
          <!-- Rendered dynamically -->
        </div>
      </div>
    `;

    container.querySelectorAll('.sublab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeSubLab = btn.dataset.sublab;
        container.querySelectorAll('.sublab-btn').forEach(b => b.classList.toggle('active', b === btn));
        renderActiveSubLab();
      });
    });

    renderActiveSubLab();
  }

  function renderActiveSubLab() {
    const viewport = document.getElementById('agentic-sublab-viewport');
    if (!viewport) return;

    if (activeSubLab === 'rag') {
      renderRAGStudio(viewport);
    } else if (activeSubLab === 'react') {
      renderReActSimulator(viewport);
    } else if (activeSubLab === 'multi') {
      renderMultiAgentSandbox(viewport);
    }

    if (window.lucide) window.lucide.createIcons();
  }

  // --- Sub-Lab 1: RAG Studio ---
  function renderRAGStudio(viewport) {
    viewport.innerHTML = `
      <div class="rag-studio-grid">
        <div class="rag-studio-left glass-panel">
          <div class="studio-card-header">
            <h4><i data-lucide="compass"></i> 2D Vector Embedding Space</h4>
            <span class="vis-badge">Cosine Projection</span>
          </div>
          <div class="canvas-wrap">
            <canvas id="rag-lab-canvas" width="480" height="340"></canvas>
          </div>
          <div class="query-control-row">
            <input type="text" id="rag-lab-query-input" value="How does Q-learning update values?" class="agentic-input" placeholder="Enter query...">
            <button class="btn-agentic-primary" id="btn-rag-lab-search"><i data-lucide="search"></i> Search</button>
          </div>
        </div>

        <div class="rag-studio-right glass-panel">
          <div class="studio-card-header">
            <h4><i data-lucide="file-text"></i> Augmented Prompt &amp; Grounded Output</h4>
            <span class="vis-badge" id="rag-match-count">Top 2 Matches</span>
          </div>
          <div class="rag-results-wrap" id="rag-lab-results"></div>
          <div class="prompt-preview-wrap">
            <label class="text-xs text-slate-400 font-bold uppercase tracking-wider">Augmented Context Prompt Sent to LLM:</label>
            <pre class="font-mono text-xs text-slate-300 prompt-pre" id="rag-lab-prompt-pre"></pre>
          </div>
          <div class="grounded-answer-box" id="rag-lab-grounded-box"></div>
        </div>
      </div>
    `;

    const canvas = document.getElementById('rag-lab-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function draw(queryRes = null) {
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const r = 130;

      ctx.clearRect(0, 0, w, h);

      // Circle
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, 2 * Math.PI);
      ctx.strokeStyle = "rgba(139, 92, 246, 0.25)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Axes
      ctx.beginPath();
      ctx.moveTo(cx - r - 15, cy);
      ctx.lineTo(cx + r + 15, cy);
      ctx.moveTo(cx, cy - r - 15);
      ctx.lineTo(cx, cy + r + 15);
      ctx.strokeStyle = "rgba(148, 163, 184, 0.2)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Documents
      ragPipelineInstance.vectorStore.records.forEach(rec => {
        const px = cx + rec.projection2d.x * r;
        const py = cy - rec.projection2d.y * r;
        const isHit = queryRes && queryRes.retrievedChunks.some(c => c.id === rec.id);

        ctx.beginPath();
        ctx.arc(px, py, isHit ? 7.5 : 4.5, 0, 2 * Math.PI);
        ctx.fillStyle = isHit ? "#06b6d4" : "#8b5cf6";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.font = isHit ? "bold 11px Inter, sans-serif" : "10px Inter, sans-serif";
        ctx.fillStyle = isHit ? "#06b6d4" : "#94a3b8";
        ctx.fillText(rec.id, px + 8, py - 4);
      });

      // Query vector
      if (queryRes) {
        const qx = cx + queryRes.encoding.projection2d.x * r;
        const qy = cy - queryRes.encoding.projection2d.y * r;

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(qx, qy);
        ctx.strokeStyle = "#f43f5e";
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(qx, qy, 6, 0, 2 * Math.PI);
        ctx.fillStyle = "#f43f5e";
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 11px Inter, sans-serif";
        ctx.fillText("Query", qx + 8, qy - 4);
      }
    }

    function executeSearch() {
      const qInput = document.getElementById('rag-lab-query-input');
      if (!qInput) return;
      const q = qInput.value.trim();
      const res = ragPipelineInstance.query(q, 2);

      draw(res);

      const resultsDiv = document.getElementById('rag-lab-results');
      const promptPre = document.getElementById('rag-lab-prompt-pre');
      const groundedBox = document.getElementById('rag-lab-grounded-box');

      if (resultsDiv) {
        resultsDiv.innerHTML = res.retrievedChunks.map((c, i) => `
          <div class="chunk-hit-card">
            <div class="chunk-hit-top">
              <span class="chunk-hit-rank">#${i + 1} · ${c.id}</span>
              <span class="chunk-hit-score">Cosine: ${(c.similarity).toFixed(4)}</span>
            </div>
            <div class="chunk-hit-text">${c.text}</div>
          </div>
        `).join('');
      }

      if (promptPre) {
        promptPre.textContent = res.augmentedPrompt;
      }

      if (groundedBox) {
        groundedBox.innerHTML = `
          <strong><i data-lucide="check-circle"></i> Grounded Model Response:</strong>
          <p class="mt-1">${res.groundedAnswer}</p>
        `;
      }
      if (window.lucide) window.lucide.createIcons();
    }

    document.getElementById('btn-rag-lab-search').addEventListener('click', executeSearch);
    document.getElementById('rag-lab-query-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') executeSearch();
    });

    executeSearch();
  }

  // --- Sub-Lab 2: ReAct Simulator ---
  function renderReActSimulator(viewport) {
    currentReActScenario = A.REACT_PRESETS.stock_analysis;
    currentReActStep = 0;

    viewport.innerHTML = `
      <div class="react-sim-grid">
        <div class="react-sim-left glass-panel">
          <div class="studio-card-header">
            <h4><i data-lucide="settings"></i> ReAct Agent Configuration</h4>
            <span class="vis-badge">Tools &amp; Goal</span>
          </div>

          <div class="sim-config-group">
            <label>Task Scenario:</label>
            <select id="sim-scenario-select" class="agentic-select">
              <option value="stock_analysis">Stock Price Average &amp; Report</option>
              <option value="monaco_density">Monaco Population Density</option>
              <option value="error_recovery">Self-Correction Tool Error Recovery</option>
            </select>
          </div>

          <div class="sim-config-group mt-3">
            <label>Active Tools Granted to Agent:</label>
            <div class="active-tools-checkboxes">
              <label class="tool-chk"><input type="checkbox" checked disabled> <code>web_search()</code></label>
              <label class="tool-chk"><input type="checkbox" checked disabled> <code>calculator()</code></label>
              <label class="tool-chk"><input type="checkbox" checked disabled> <code>file_writer()</code></label>
            </div>
          </div>

          <div class="sim-goal-box mt-3">
            <strong>Goal:</strong>
            <p id="sim-goal-text">${currentReActScenario.goal}</p>
          </div>

          <div class="btn-group-agentic mt-4">
            <button class="btn-agentic-secondary" id="btn-sim-prev"><i data-lucide="skip-back"></i> Prev Step</button>
            <button class="btn-agentic-primary" id="btn-sim-next"><i data-lucide="skip-forward"></i> Next Step</button>
            <button class="btn-agentic-secondary" id="btn-sim-reset"><i data-lucide="rotate-ccw"></i> Reset</button>
          </div>
        </div>

        <div class="react-sim-right glass-panel">
          <div class="studio-card-header">
            <h4><i data-lucide="terminal"></i> Live Scratchpad &amp; Execution Stream</h4>
            <span class="vis-badge" id="sim-step-badge">Step 1 of 4</span>
          </div>
          <div class="sim-scratchpad-stream" id="sim-scratchpad-stream"></div>
        </div>
      </div>
    `;

    function update() {
      const steps = currentReActScenario.steps;
      const cur = steps[currentReActStep];

      const badge = document.getElementById('sim-step-badge');
      if (badge) badge.textContent = `Step ${currentReActStep + 1} of ${steps.length}`;

      const stream = document.getElementById('sim-scratchpad-stream');
      if (stream) {
        stream.innerHTML = `
          <div class="scratch-card-step active">
            <div class="scratch-line thought">
              <span class="line-badge thought-badge">Thought</span>
              <p>${cur.thought}</p>
            </div>
            ${cur.action ? `
              <div class="scratch-line action">
                <span class="line-badge action-badge">Action Call</span>
                <p><code>${cur.action.tool}(${JSON.stringify(cur.action.args)})</code></p>
              </div>
            ` : ''}
            ${cur.observation ? `
              <div class="scratch-line obs">
                <span class="line-badge obs-badge">Observation</span>
                <p>${typeof cur.observation === 'object' ? JSON.stringify(cur.observation) : cur.observation}</p>
              </div>
            ` : ''}
            ${cur.isFinal ? `
              <div class="scratch-line final">
                <span class="line-badge final-badge">Goal Finished</span>
                <p><strong>${cur.finalAnswer}</strong></p>
              </div>
            ` : ''}
          </div>
        `;
      }
      if (window.lucide) window.lucide.createIcons();
    }

    document.getElementById('sim-scenario-select').addEventListener('change', (e) => {
      currentReActScenario = A.REACT_PRESETS[e.target.value];
      currentReActStep = 0;
      document.getElementById('sim-goal-text').textContent = currentReActScenario.goal;
      update();
    });

    document.getElementById('btn-sim-prev').addEventListener('click', () => {
      if (currentReActStep > 0) {
        currentReActStep--;
        update();
      }
    });

    document.getElementById('btn-sim-next').addEventListener('click', () => {
      if (currentReActStep < currentReActScenario.steps.length - 1) {
        currentReActStep++;
        update();
      }
    });

    document.getElementById('btn-sim-reset').addEventListener('click', () => {
      currentReActStep = 0;
      update();
    });

    update();
  }

  // --- Sub-Lab 3: Multi-Agent Collaboration Sandbox ---
  function renderMultiAgentSandbox(viewport) {
    let selectedSquad = 'generator_critic';

    viewport.innerHTML = `
      <div class="multi-sandbox-wrap glass-panel">
        <div class="studio-card-header">
          <h4><i data-lucide="users"></i> Multi-Agent Team Collaboration Sandbox</h4>
          <span class="vis-badge">Turn-Based Message Passing</span>
        </div>

        <div class="squad-select-row">
          <label>Select Squad Architecture:</label>
          <div class="squad-btn-group">
            <button class="squad-tab-btn active" data-squad="generator_critic">Generator-Critic (Code Review)</button>
            <button class="squad-tab-btn" data-squad="manager_worker">Manager-Worker (Hierarchical)</button>
            <button class="squad-tab-btn" data-squad="peer_to_peer">Peer-to-Peer (Debate)</button>
          </div>
        </div>

        <div class="timeline-stream-box" id="squad-timeline-box"></div>
      </div>
    `;

    function updateSquad() {
      const scenario = A.MULTI_AGENT_SCENARIOS[selectedSquad];
      const box = document.getElementById('squad-timeline-box');
      if (box) {
        box.innerHTML = `
          <div class="squad-info-banner">
            <strong>${scenario.name}:</strong> ${scenario.description}
          </div>
          <div class="squad-messages-list mt-3">
            ${scenario.timeline.map(m => `
              <div class="squad-msg-card">
                <div class="msg-header">
                  <span class="msg-turn">Turn ${m.turn}</span>
                  <span class="msg-sender">${m.sender}</span>
                  <i data-lucide="arrow-right"></i>
                  <span class="msg-recipient">${m.recipient}</span>
                  <span class="msg-tag">${m.type}</span>
                </div>
                <div class="msg-payload">${m.payload}</div>
              </div>
            `).join('')}
          </div>
        `;
      }
      if (window.lucide) window.lucide.createIcons();
    }

    viewport.querySelectorAll('.squad-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedSquad = btn.dataset.squad;
        viewport.querySelectorAll('.squad-tab-btn').forEach(b => b.classList.toggle('active', b === btn));
        updateSquad();
      });
    });

    updateSquad();
  }

  window.AgenticLab = {
    init,
    renderActiveSubLab
  };

})();
