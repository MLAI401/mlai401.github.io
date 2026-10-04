/**
 * knowledge_lab.js — Topic 05: Knowledge & Reasoning Playground Controller
 * Part of MLAI401 playground.html#view-knowledge
 *
 * Provides 4 Interactive Sub-Labs:
 *   1. Wumpus World Logic Explorer
 *   2. Propositional Logic & Truth-Table Studio
 *   3. Bayesian Network Interactive Workbench
 *   4. Monte Carlo Sampling Visualizer
 */

(function () {
  'use strict';

  const L = window.LogicEngine;
  const B = window.BayesEngine;

  function initKnowledgeLab() {
    const root = document.getElementById('view-knowledge');
    if (!root) return;

    // Sub-tab switching
    const subTabs = root.querySelectorAll('.kl-subtab');
    const subViews = root.querySelectorAll('.kl-subview');

    subTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetId = tab.dataset.target;
        subTabs.forEach(t => t.classList.toggle('active', t === tab));
        subViews.forEach(v => v.classList.toggle('active', v.id === targetId));
      });
    });

    initWumpusLab();
    initLogicStudioLab();
    initBayesWorkbenchLab();
    initSamplingLab();
  }

  // =========================================================================
  // Lab 1: Wumpus World Logic Explorer
  // =========================================================================
  function initWumpusLab() {
    let world = new L.WumpusLogicWorld(4);
    let agentPos = { x: 1, y: 1 };
    world.senseAt(1, 1);

    const gridContainer = document.getElementById('kl-wumpus-grid');
    const kbLog = document.getElementById('kl-wumpus-kb-log');
    const resetBtn = document.getElementById('kl-wumpus-reset');

    function renderGrid() {
      if (!gridContainer) return;
      gridContainer.innerHTML = '';
      for (let y = 4; y >= 1; y--) {
        for (let x = 1; x <= 4; x++) {
          const isAgent = agentPos.x === x && agentPos.y === y;
          const isVisited = world.visited.has(`${x},${y}`);
          const hasBreeze = world.percepts.breeze.has(`${x},${y}`);
          const hasStench = world.percepts.stench.has(`${x},${y}`);
          const isSafe = world.isSafe(x, y);
          const isPit = world.isPit(x, y);
          const isWumpus = world.isWumpus(x, y);

          const cell = document.createElement('div');
          cell.className = 'wumpus-lab-cell';
          cell.style.cssText = `
            aspect-ratio: 1; border-radius: 8px; position: relative;
            background: ${isAgent ? 'rgba(99,102,241,0.3)' : isVisited ? 'rgba(30,41,59,0.8)' : 'rgba(15,23,42,0.6)'};
            border: 2px solid ${isSafe ? '#10b981' : isPit || isWumpus ? '#f43f5e' : 'rgba(255,255,255,0.1)'};
            display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer;
          `;

          let statusIcon = '?';
          if (isAgent) statusIcon = '🤖';
          else if (isPit) statusIcon = '💀 Pit';
          else if (isWumpus) statusIcon = '👹 Wumpus';
          else if (isSafe) statusIcon = '✓ Safe';

          cell.innerHTML = `
            <span style="font-size: 0.65rem; color: #64748b; position: absolute; top: 4px; left: 6px;">[${x},${y}]</span>
            <span style="font-size: 0.85rem; font-weight: 700; color: ${isSafe ? '#10b981' : isPit || isWumpus ? '#f43f5e' : '#94a3b8'};">${statusIcon}</span>
            <div style="display: flex; gap: 4px; position: absolute; bottom: 4px;">
              ${hasBreeze ? '<span title="Breeze" style="font-size: 0.75rem;">💨</span>' : ''}
              ${hasStench ? '<span title="Stench" style="font-size: 0.75rem;">👃</span>' : ''}
            </div>
          `;

          cell.addEventListener('click', () => {
            // Check if adjacent to current or visited
            agentPos = { x, y };
            world.visited.add(`${x},${y}`);
            world.senseAt(x, y);
            renderGrid();
            renderKBLog();
          });

          gridContainer.appendChild(cell);
        }
      }
    }

    function renderKBLog() {
      if (!kbLog) return;
      kbLog.innerHTML = world.kb.slice(-10).map(s => `
        <div style="padding: 2px 0; border-bottom: 1px solid rgba(255,255,255,0.03);">
          <span style="color: #38bdf8;">TELL</span>(${s.toString()})
        </div>
      `).join('');
      kbLog.scrollTop = kbLog.scrollHeight;
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        world = new L.WumpusLogicWorld(4);
        agentPos = { x: 1, y: 1 };
        world.senseAt(1, 1);
        renderGrid();
        renderKBLog();
      });
    }

    renderGrid();
    renderKBLog();
  }

  // =========================================================================
  // Lab 2: Propositional Logic Studio
  // =========================================================================
  function initLogicStudioLab() {
    const input = document.getElementById('kl-logic-input');
    const evalBtn = document.getElementById('kl-logic-eval-btn');
    const tableContainer = document.getElementById('kl-logic-tt-output');
    const cnfContainer = document.getElementById('kl-logic-cnf-output');

    if (!evalBtn || !input) return;

    evalBtn.addEventListener('click', () => {
      const formula = input.value.trim();
      if (!formula) return;

      try {
        // Evaluate Truth Table (guard: 2^n rows would freeze the page)
        const nSyms = L.getPropSymbols(L.parseExpr(formula)).length;
        if (nSyms > 10) throw new Error(`Formula has ${nSyms} symbols; truth table limited to 10 (2^10 = 1024 rows).`);
        const ttRes = L.ttEntails([], formula);
        if (tableContainer) {
          tableContainer.innerHTML = `
            <table style="width: 100%; font-size: 0.75rem; text-align: center; border-collapse: collapse; font-family: monospace;">
              <thead>
                <tr style="color: #94a3b8; border-bottom: 1px solid rgba(255,255,255,0.1);">
                  ${ttRes.symbols.map(s => `<th style="padding: 4px;">${s}</th>`).join('')}
                  <th style="color: #38bdf8;">Output</th>
                </tr>
              </thead>
              <tbody>
                ${ttRes.rows.map(r => `
                  <tr style="border-bottom: 1px solid rgba(255,255,255,0.03);">
                    ${ttRes.symbols.map(s => `<td>${r.model[s] ? 'T' : 'F'}</td>`).join('')}
                    <td style="font-weight: 700; color: ${r.alphaVal ? '#10b981' : '#f43f5e'};">${r.alphaVal ? 'T' : 'F'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `;
        }

        // CNF Pipeline
        const cnfRes = L.toCNF(formula);
        if (cnfContainer) {
          cnfContainer.innerHTML = cnfRes.steps.map(s => `
            <div style="margin-bottom: 6px; padding: 6px 8px; background: rgba(0,0,0,0.3); border-radius: 6px; font-size: 0.75rem;">
              <span style="color: #94a3b8;">${s.title}:</span>
              <div style="font-family: monospace; color: #fff; margin-top: 2px;">${s.expr}</div>
            </div>
          `).join('');
        }
      } catch (err) {
        if (tableContainer) tableContainer.innerHTML = `<div style="color: #f43f5e; font-size: 0.8rem;">Syntax Error: ${err.message}</div>`;
      }
    });

    // Initial trigger
    evalBtn.click();
  }

  // =========================================================================
  // Lab 3: Bayesian Network Interactive Workbench
  // =========================================================================
  function initBayesWorkbenchLab() {
    const netSelect = document.getElementById('kl-bayes-net-select');
    const netContainer = document.getElementById('kl-bayes-dag-container');
    const postContainer = document.getElementById('kl-bayes-posteriors');

    let currentNet = B.createAlarmNet();
    let currentEvidence = {};

    function updateWorkbench() {
      const netType = netSelect ? netSelect.value : 'alarm';
      if (netType === 'alarm') currentNet = B.createAlarmNet();
      else if (netType === 'wetgrass') currentNet = B.createWetGrassNet();
      else currentNet = B.createMedicalNet();

      renderDAG();
      renderPosteriors();
    }

    function renderDAG() {
      if (!netContainer) return;
      netContainer.innerHTML = `
        <svg viewBox="0 0 560 380" style="width: 100%; height: 100%;">
          <defs>
            <marker id="kl-arrow" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b"/>
            </marker>
          </defs>
          ${currentNet.nodes.map(n => {
            return n.parents.map(p => {
              const pNode = currentNet.getNode(p);
              return `<line x1="${pNode.meta.x}" y1="${pNode.meta.y}" x2="${n.meta.x}" y2="${n.meta.y}" stroke="#64748b" stroke-width="2" marker-end="url(#kl-arrow)"/>`;
            }).join('');
          }).join('')}

          ${currentNet.nodes.map(n => {
            const isObserved = n.var in currentEvidence;
            const obsVal = currentEvidence[n.var];
            let fill = '#1e293b';
            if (isObserved) fill = obsVal ? '#10b981' : '#f43f5e';

            return `
              <g class="kl-bn-node" data-var="${n.var}" style="cursor: pointer;">
                <circle cx="${n.meta.x}" cy="${n.meta.y}" r="26" fill="${fill}" stroke="#818cf8" stroke-width="2"/>
                <text x="${n.meta.x}" y="${n.meta.y + 4}" fill="#fff" font-size="11" font-weight="700" text-anchor="middle">${n.var.slice(0, 2)}</text>
                <text x="${n.meta.x}" y="${n.meta.y + 38}" fill="#cbd5e1" font-size="10" text-anchor="middle">${n.meta.label || n.var}</text>
              </g>
            `;
          }).join('')}
        </svg>
      `;

      netContainer.querySelectorAll('.kl-bn-node').forEach(g => {
        g.addEventListener('click', () => {
          const v = g.dataset.var;
          if (!(v in currentEvidence)) {
            currentEvidence[v] = true;
          } else if (currentEvidence[v] === true) {
            currentEvidence[v] = false;
          } else {
            delete currentEvidence[v];
          }
          renderDAG();
          renderPosteriors();
        });
      });
    }

    function renderPosteriors() {
      if (!postContainer) return;
      postContainer.innerHTML = currentNet.variables.map(v => {
        const isObs = v in currentEvidence;
        let pTrue = 0.5;
        if (isObs) {
          pTrue = currentEvidence[v] ? 1.0 : 0.0;
        } else {
          const res = B.enumerationAsk(v, currentEvidence, currentNet);
          pTrue = res.true;
        }

        return `
          <div style="margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.78rem; margin-bottom: 2px;">
              <span style="color: #fff; font-weight: 600;">${v} ${isObs ? `(Observed: ${currentEvidence[v] ? 'T' : 'F'})` : ''}</span>
              <strong style="color: #818cf8;">${(pTrue * 100).toFixed(1)}%</strong>
            </div>
            <div style="height: 8px; border-radius: 4px; background: rgba(0,0,0,0.4); overflow: hidden;">
              <div style="height: 100%; width: ${pTrue * 100}%; background: ${isObs ? (currentEvidence[v] ? '#10b981' : '#f43f5e') : 'linear-gradient(90deg, #6366f1, #38bdf8)'}; transition: width 0.2s;"></div>
            </div>
          </div>
        `;
      }).join('');
    }

    if (netSelect) {
      netSelect.addEventListener('change', () => {
        currentEvidence = {};
        updateWorkbench();
      });
    }

    updateWorkbench();
  }

  // =========================================================================
  // Lab 4: Monte Carlo Sampling Visualizer
  // =========================================================================
  function initSamplingLab() {
    const net = B.createAlarmNet();
    const runBtn = document.getElementById('kl-sampling-run-btn');
    const sampleCountSelect = document.getElementById('kl-sampling-n-select');
    const outputRej = document.getElementById('kl-sampling-rej-out');
    const outputLW = document.getElementById('kl-sampling-lw-out');

    if (!runBtn) return;

    runBtn.addEventListener('click', () => {
      const N = sampleCountSelect ? parseInt(sampleCountSelect.value, 10) : 5000;
      const evidence = { JohnCalls: true, MaryCalls: true };

      const rejRes = B.rejectionSampling('Burglary', evidence, net, N);
      const lwRes = B.likelihoodWeighting('Burglary', evidence, net, N);

      if (outputRej) {
        outputRej.innerHTML = `
          <div style="font-size: 1.25rem; font-weight: 800; color: #fff;">${(rejRes.distribution.true * 100).toFixed(1)}%</div>
          <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 4px;">
            Accepted ${rejRes.accepted} / ${N} samples (${(rejRes.acceptanceRate * 100).toFixed(2)}% efficiency)
          </div>
        `;
      }

      if (outputLW) {
        outputLW.innerHTML = `
          <div style="font-size: 1.25rem; font-weight: 800; color: #10b981;">${(lwRes.distribution.true * 100).toFixed(1)}%</div>
          <div style="font-size: 0.75rem; color: #a7f3d0; margin-top: 4px;">
            Utilized all ${N} samples (100% sample efficiency)
          </div>
        `;
      }
    });

    runBtn.click();
  }

  // --- Auto-init ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initKnowledgeLab);
  } else {
    initKnowledgeLab();
  }
})();
