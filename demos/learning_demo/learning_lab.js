/**
 * learning_lab.js — Topic 06: Learning & Decision Making Playground Controller
 * Part of MLAI401 playground.html#view-kmeans
 *
 * Provides Interactive K-Means Clustering Studio:
 *   - Custom 2D data points addition via click
 *   - Random cluster generation (Gaussian blobs)
 *   - Adjustable K (2 to 6 clusters)
 *   - Auto Run / Single Step execution
 *   - Dynamic Voronoi cell background rendering & centroid tracking
 */

(function () {
  'use strict';

  const M = window.MLEngine;

  function initLearningLab() {
    const root = document.getElementById('view-kmeans');
    if (!root) return;

    const canvas = document.getElementById('kmeans-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Controls
    const kSlider = document.getElementById('k-slider');
    const kDisplay = document.getElementById('k-value-display');
    const btnRun = document.getElementById('btn-kmeans-run');
    const btnStep = document.getElementById('btn-kmeans-step');
    const btnRandom = document.getElementById('btn-kmeans-random');
    const btnReset = document.getElementById('btn-kmeans-reset');

    // Overlay & Stats
    const overlayIter = document.getElementById('overlay-iter');
    const overlayCount = document.getElementById('overlay-points-count');
    const statusText = document.getElementById('status-text');
    const centroidsPlaced = document.getElementById('centroids-placed-val');
    const convergedVal = document.getElementById('converged-val');

    const CLUSTER_COLORS = [
      { bg: 'rgba(59, 130, 246, 0.25)', pt: '#3b82f6', border: '#60a5fa' },
      { bg: 'rgba(16, 185, 129, 0.25)', pt: '#10b981', border: '#34d399' },
      { bg: 'rgba(245, 158, 11, 0.25)', pt: '#f59e0b', border: '#fbbf24' },
      { bg: 'rgba(239, 68, 68, 0.25)', pt: '#ef4444', border: '#f87171' },
      { bg: 'rgba(139, 92, 246, 0.25)', pt: '#8b5cf6', border: '#a78bfa' },
      { bg: 'rgba(236, 72, 153, 0.25)', pt: '#ec4899', border: '#f472b6' }
    ];

    let points = [];
    let k = parseInt(kSlider ? kSlider.value : 3, 10);
    let kmeans = new M.KMeans(k, 30, 'kmeans++');
    let iteration = 0;
    let isRunning = false;
    let runInterval = null;

    function resizeCanvas() {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth || 600;
        canvas.height = container.clientHeight || 450;
        draw();
      }
    }

    function generateRandomPoints() {
      points = [];
      const numBlobs = k;
      const ptsPerBlob = Math.floor(60 / numBlobs);
      const w = canvas.width || 600;
      const h = canvas.height || 450;

      for (let b = 0; b < numBlobs; b++) {
        const cx = 100 + Math.random() * (w - 200);
        const cy = 80 + Math.random() * (h - 160);
        for (let i = 0; i < ptsPerBlob; i++) {
          const px = cx + (Math.random() - 0.5) * 120;
          const py = cy + (Math.random() - 0.5) * 100;
          points.push([px, py]);
        }
      }
      resetModel();
    }

    function resetModel() {
      stopAutoRun();
      k = parseInt(kSlider.value, 10);
      kmeans = new M.KMeans(k, 30, 'kmeans++');
      iteration = 0;
      if (overlayIter) overlayIter.textContent = '0';
      if (overlayCount) overlayCount.textContent = points.length;
      if (statusText) statusText.textContent = points.length >= k ? 'Ready to cluster' : 'Click canvas to add points';
      if (centroidsPlaced) centroidsPlaced.textContent = `0 / ${k}`;
      if (convergedVal) convergedVal.textContent = 'No';
      draw();
    }

    function stepAlgorithm() {
      if (points.length < k) {
        if (statusText) statusText.textContent = `Need at least ${k} points!`;
        return false;
      }

      const shifted = kmeans.step(points);
      iteration++;

      if (overlayIter) overlayIter.textContent = iteration;
      if (centroidsPlaced) centroidsPlaced.textContent = `${kmeans.centroids.length} / ${k}`;
      if (!shifted) {
        if (statusText) statusText.textContent = 'Converged! Centroids stable.';
        if (convergedVal) convergedVal.textContent = 'Yes';
        stopAutoRun();
      } else {
        if (statusText) statusText.textContent = `Iteration ${iteration}: Centroids updating...`;
        if (convergedVal) convergedVal.textContent = 'No';
      }

      draw();
      return shifted;
    }

    function startAutoRun() {
      if (isRunning) {
        stopAutoRun();
        return;
      }
      if (points.length < k) {
        generateRandomPoints();
      }
      isRunning = true;
      if (btnRun) btnRun.innerHTML = '<i data-lucide="pause"></i> Pause';
      if (window.lucide) window.lucide.createIcons();

      runInterval = setInterval(() => {
        const keepGoing = stepAlgorithm();
        if (!keepGoing) {
          stopAutoRun();
        }
      }, 500);
    }

    function stopAutoRun() {
      isRunning = false;
      if (runInterval) {
        clearInterval(runInterval);
        runInterval = null;
      }
      if (btnRun) btnRun.innerHTML = '<i data-lucide="play"></i> Auto Run';
      if (window.lucide) window.lucide.createIcons();
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Draw Voronoi Background if centroids exist
      if (kmeans.centroids && kmeans.centroids.length === k && iteration > 0) {
        const step = 8;
        for (let x = 0; x < canvas.width; x += step) {
          for (let y = 0; y < canvas.height; y += step) {
            let nearestK = 0;
            let minD = Infinity;
            for (let c = 0; c < kmeans.centroids.length; c++) {
              const d = M.euclideanDistance([x, y], kmeans.centroids[c]);
              if (d < minD) {
                minD = d;
                nearestK = c;
              }
            }
            ctx.fillStyle = CLUSTER_COLORS[nearestK % CLUSTER_COLORS.length].bg;
            ctx.fillRect(x, y, step, step);
          }
        }
      }

      // 2. Draw Data Points
      points.forEach((pt, i) => {
        const cluster = kmeans.labels && kmeans.labels[i] !== undefined ? kmeans.labels[i] : -1;
        const colorObj = cluster >= 0 ? CLUSTER_COLORS[cluster % CLUSTER_COLORS.length] : { pt: '#94a3b8', border: '#cbd5e1' };

        ctx.fillStyle = colorObj.pt;
        ctx.strokeStyle = colorObj.border;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(pt[0], pt[1], 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });

      // 3. Draw Centroids
      if (kmeans.centroids) {
        kmeans.centroids.forEach((c, idx) => {
          const colorObj = CLUSTER_COLORS[idx % CLUSTER_COLORS.length];
          // Outer pulse
          ctx.strokeStyle = colorObj.pt;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(c[0], c[1], 12, 0, Math.PI * 2);
          ctx.stroke();

          // Centroid marker (cross)
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(c[0], c[1], 7, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(c[0] - 4, c[1]);
          ctx.lineTo(c[0] + 4, c[1]);
          ctx.moveTo(c[0], c[1] - 4);
          ctx.lineTo(c[0], c[1] + 4);
          ctx.stroke();
        });
      }
    }

    // --- Event Listeners ---
    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      points.push([x, y]);
      if (overlayCount) overlayCount.textContent = points.length;
      if (statusText && points.length >= k && iteration === 0) {
        statusText.textContent = 'Ready to cluster';
      }
      draw();
    });

    if (kSlider) {
      kSlider.addEventListener('input', () => {
        if (kDisplay) kDisplay.textContent = kSlider.value;
        resetModel();
      });
    }

    if (btnStep) btnStep.addEventListener('click', stepAlgorithm);
    if (btnRun) btnRun.addEventListener('click', startAutoRun);
    if (btnRandom) btnRandom.addEventListener('click', generateRandomPoints);
    if (btnReset) btnReset.addEventListener('click', () => { points = []; resetModel(); });

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    generateRandomPoints();
  }

  // Auto-init on page load or tab click
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLearningLab);
  } else {
    initLearningLab();
  }
})();
