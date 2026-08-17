document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide Icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  // --- Mobile Navigation Menu ---
  const menuToggleBtn = document.getElementById('menu-toggle-btn');
  const navMenu = document.getElementById('nav-menu');
  
  if (menuToggleBtn && navMenu) {
    menuToggleBtn.addEventListener('click', () => {
      navMenu.classList.toggle('active');
      const icon = menuToggleBtn.querySelector('i');
      if (icon) {
        if (navMenu.classList.contains('active')) {
          icon.setAttribute('data-lucide', 'x');
        } else {
          icon.setAttribute('data-lucide', 'menu');
        }
        lucide.createIcons();
      }
    });

    // Close menu when clicking a link
    navMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        const icon = menuToggleBtn.querySelector('i');
        if (icon) {
          icon.setAttribute('data-lucide', 'menu');
          lucide.createIcons();
        }
      });
    });
  }

  // --- Navbar Scroll Effect ---
  const navbarHeader = document.getElementById('navbar-header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbarHeader.classList.add('navbar-scrolled');
    } else {
      navbarHeader.classList.remove('navbar-scrolled');
    }
  });



  // --- K-Means Clustering Visualizer Engine ---
  const canvas = document.getElementById('kmeans-canvas');
  const ctx = canvas.getContext('2d');
  const kSlider = document.getElementById('k-slider');
  const kValueDisplay = document.getElementById('k-value-display');
  const btnRun = document.getElementById('btn-kmeans-run');
  const btnStep = document.getElementById('btn-kmeans-step');
  const btnRandom = document.getElementById('btn-kmeans-random');
  const btnReset = document.getElementById('btn-kmeans-reset');
  const overlayMode = document.getElementById('overlay-mode');
  const overlayIter = document.getElementById('overlay-iter');
  const overlayPointsCount = document.getElementById('overlay-points-count');
  const statusText = document.getElementById('status-text');
  const centroidsPlacedVal = document.getElementById('centroids-placed-val');
  const convergedVal = document.getElementById('converged-val');

  // Palette for clusters
  const clusterColors = [
    { fill: '#8b5cf6', rgb: '139, 92, 246' }, // Neon Purple
    { fill: '#22d3ee', rgb: '34, 211, 238' }, // Cyan
    { fill: '#ec4899', rgb: '236, 72, 153' }, // Neon Pink
    { fill: '#10b981', rgb: '16, 185, 129' }, // Emerald Green
    { fill: '#f59e0b', rgb: '245, 158, 11' }, // Amber Yellow
    { fill: '#ef4444', rgb: '239, 68, 68' }   // Red
  ];

  let state = {
    k: 3,
    points: [],
    centroids: [],
    iteration: 0,
    converged: false,
    isRunning: false,
    runInterval: null,
    stepPhase: 'ASSIGN' // ASSIGN or UPDATE
  };

  // Setup Canvas Dimensions with Retina support
  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    draw();
  }

  // Initialize Canvas
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // K Slider event listener
  kSlider.addEventListener('input', (e) => {
    state.k = parseInt(e.target.value);
    kValueDisplay.textContent = state.k;
    resetState(false); // Reset calculation but keep points
  });

  // Event listener: Add point on click
  canvas.addEventListener('mousedown', (e) => {
    if (state.isRunning) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    // Verify click is within bounds
    if (x >= 0 && x <= 1 && y >= 0 && y <= 1) {
      state.points.push({
        x: x,
        y: y,
        centroidIndex: -1
      });

      // Clear convergence state to allow re-running with new data
      state.converged = false;
      state.iteration = 0;
      state.stepPhase = 'ASSIGN';
      
      updateUI();
      draw();
    }
  });

  // Buttons Event Listeners
  btnRandom.addEventListener('click', () => {
    if (state.isRunning) return;
    generateRandomDataset();
  });

  btnReset.addEventListener('click', () => {
    stopAutoRun();
    resetState(true); // Reset both calculation and points
  });

  btnStep.addEventListener('click', () => {
    if (state.isRunning || state.converged) return;
    stepKMeans();
  });

  btnRun.addEventListener('click', () => {
    if (state.isRunning) {
      stopAutoRun();
    } else {
      startAutoRun();
    }
  });

  // Generate Gaussian-ish random points
  function generateRandomDataset() {
    resetState(true);
    
    const numPoints = 80;
    const numCenters = state.k;
    const centers = [];

    // Make random cluster hubs
    for (let i = 0; i < numCenters; i++) {
      centers.push({
        x: 0.15 + Math.random() * 0.7,
        y: 0.15 + Math.random() * 0.7,
        std: 0.05 + Math.random() * 0.08
      });
    }

    // Populate points around centers
    for (let i = 0; i < numPoints; i++) {
      const center = centers[Math.floor(Math.random() * centers.length)];
      // Box-Muller transform for circular 2D Gaussian distribution
      const u1 = Math.random() || 0.0001;
      const u2 = Math.random() || 0.0001;
      const r = Math.sqrt(-2.0 * Math.log(u1));
      const theta = 2.0 * Math.PI * u2;
      const randX = r * Math.cos(theta);
      const randY = r * Math.sin(theta);

      const x = Math.max(0.02, Math.min(0.98, center.x + randX * center.std));
      const y = Math.max(0.02, Math.min(0.98, center.y + randY * center.std));

      state.points.push({
        x: x,
        y: y,
        centroidIndex: -1
      });
    }

    updateUI();
    draw();
  }

  // Reset visualizer state
  function resetState(clearPoints = false) {
    if (clearPoints) {
      state.points = [];
    } else {
      // Remove centroid assignments
      state.points.forEach(p => p.centroidIndex = -1);
    }
    
    state.centroids = [];
    state.iteration = 0;
    state.converged = false;
    state.stepPhase = 'ASSIGN';
    
    updateUI();
    draw();
  }

  // Auto Run loop
  function startAutoRun() {
    if (state.points.length === 0) {
      generateRandomDataset();
    }
    
    if (state.converged) {
      resetState(false);
    }

    state.isRunning = true;
    btnRun.innerHTML = '<i data-lucide="pause"></i> Pause';
    lucide.createIcons();
    
    btnStep.disabled = true;
    btnRandom.disabled = true;
    btnReset.disabled = true;
    kSlider.disabled = true;

    state.runInterval = setInterval(() => {
      stepKMeans();
      if (state.converged) {
        stopAutoRun();
      }
    }, 600);
  }

  function stopAutoRun() {
    state.isRunning = false;
    btnRun.innerHTML = '<i data-lucide="play"></i> Auto Run';
    lucide.createIcons();
    
    btnStep.disabled = false;
    btnRandom.disabled = false;
    btnReset.disabled = false;
    kSlider.disabled = false;

    if (state.runInterval) {
      clearInterval(state.runInterval);
      state.runInterval = null;
    }
    updateUI();
  }

  // Step Algorithm
  function stepKMeans() {
    if (state.points.length === 0) {
      statusText.textContent = "Please add points first!";
      return;
    }

    // Phase 0: Initialize Centroids if empty
    if (state.centroids.length === 0) {
      initializeCentroidsKMeansPlusPlus();
      state.stepPhase = 'ASSIGN';
      updateUI();
      draw();
      return;
    }

    if (state.converged) return;

    if (state.stepPhase === 'ASSIGN') {
      assignPointsToCentroids();
      state.stepPhase = 'UPDATE';
    } else {
      const moved = updateCentroidPositions();
      state.iteration++;
      
      if (!moved) {
        state.converged = true;
        statusText.textContent = "Converged!";
      } else {
        state.stepPhase = 'ASSIGN';
      }
    }

    updateUI();
    draw();
  }

  // Smart initialization using K-Means++ logic
  function initializeCentroidsKMeansPlusPlus() {
    state.centroids = [];
    
    // Choose the first centroid randomly from data points
    const firstPoint = state.points[Math.floor(Math.random() * state.points.length)];
    state.centroids.push({
      x: firstPoint.x,
      y: firstPoint.y,
      color: clusterColors[0]
    });

    // Select remaining centroids based on distance distribution
    for (let c = 1; c < state.k; c++) {
      let distances = [];
      let sumDistances = 0;

      for (let pIndex = 0; pIndex < state.points.length; pIndex++) {
        const point = state.points[pIndex];
        let minDistSq = Infinity;

        // Find distance to closest already selected centroid
        for (let i = 0; i < state.centroids.length; i++) {
          const centroid = state.centroids[i];
          const distSq = Math.pow(point.x - centroid.x, 2) + Math.pow(point.y - centroid.y, 2);
          if (distSq < minDistSq) {
            minDistSq = distSq;
          }
        }
        
        distances.push(minDistSq);
        sumDistances += minDistSq;
      }

      // Proportional random selection
      let randVal = Math.random() * sumDistances;
      let selectedIndex = 0;
      
      for (let i = 0; i < distances.length; i++) {
        randVal -= distances[i];
        if (randVal <= 0) {
          selectedIndex = i;
          break;
        }
      }

      const nextCentroidPoint = state.points[selectedIndex];
      state.centroids.push({
        x: nextCentroidPoint.x,
        y: nextCentroidPoint.y,
        color: clusterColors[c % clusterColors.length]
      });
    }
  }

  // Assignment step
  function assignPointsToCentroids() {
    state.points.forEach(point => {
      let minDist = Infinity;
      let closestCentroidIndex = -1;

      state.centroids.forEach((centroid, cIndex) => {
        const dist = Math.sqrt(
          Math.pow(point.x - centroid.x, 2) + Math.pow(point.y - centroid.y, 2)
        );
        if (dist < minDist) {
          minDist = dist;
          closestCentroidIndex = cIndex;
        }
      });

      point.centroidIndex = closestCentroidIndex;
    });
  }

  // Update step: move centroids to cluster centers
  function updateCentroidPositions() {
    let centroidsMoved = false;
    const tolerance = 0.0001; // convergence sensitivity threshold

    state.centroids.forEach((centroid, cIndex) => {
      const clusterPoints = state.points.filter(p => p.centroidIndex === cIndex);

      if (clusterPoints.length > 0) {
        let sumX = 0;
        let sumY = 0;

        clusterPoints.forEach(p => {
          sumX += p.x;
          sumY += p.y;
        });

        const newX = sumX / clusterPoints.length;
        const newY = sumY / clusterPoints.length;

        // Check if moved
        const distMoved = Math.sqrt(
          Math.pow(centroid.x - newX, 2) + Math.pow(centroid.y - newY, 2)
        );

        if (distMoved > tolerance) {
          centroidsMoved = true;
        }

        centroid.x = newX;
        centroid.y = newY;
      }
    });

    return centroidsMoved;
  }

  // Update DOM elements
  function updateUI() {
    overlayPointsCount.textContent = state.points.length;
    overlayIter.textContent = state.iteration;
    centroidsPlacedVal.textContent = `${state.centroids.length} / ${state.k}`;
    convergedVal.textContent = state.converged ? "Yes" : "No";

    if (state.points.length === 0) {
      overlayMode.textContent = "Click grid to add points";
      statusText.textContent = "Waiting for points";
    } else if (state.centroids.length === 0) {
      overlayMode.textContent = "Ready to initialize centroids";
      statusText.textContent = "Centroids uninitialized";
    } else if (state.converged) {
      overlayMode.textContent = "Completed";
      statusText.textContent = "Converged!";
    } else {
      overlayMode.textContent = `Running (Phase: ${state.stepPhase})`;
      statusText.textContent = state.stepPhase === 'ASSIGN' ? "Assigning points" : "Updating centers";
    }
  }

  // Canvas Drawing
  function draw() {
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    // Clear background
    ctx.clearRect(0, 0, w, h);

    // Draw Grid lines
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.05)';
    ctx.lineWidth = 1;
    const gridStep = 40;
    
    for (let x = 0; x < w; x += gridStep) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += gridStep) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // 1. Draw assignment connecting lines
    if (state.centroids.length > 0) {
      state.points.forEach(point => {
        if (point.centroidIndex !== -1) {
          const centroid = state.centroids[point.centroidIndex];
          ctx.beginPath();
          ctx.moveTo(point.x * w, point.y * h);
          ctx.lineTo(centroid.x * w, centroid.y * h);
          ctx.strokeStyle = `rgba(${centroid.color.rgb}, 0.25)`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });
    }

    // 2. Draw Points
    state.points.forEach(point => {
      ctx.beginPath();
      ctx.arc(point.x * w, point.y * h, 6, 0, 2 * Math.PI);
      
      if (point.centroidIndex !== -1 && state.centroids[point.centroidIndex]) {
        const color = state.centroids[point.centroidIndex].color.fill;
        ctx.fillStyle = color;
        // Glowing drop shadow for points
        ctx.shadowColor = color;
        ctx.shadowBlur = 6;
      } else {
        ctx.fillStyle = '#64748b'; // Muted gray for unassigned
        ctx.shadowBlur = 0;
      }
      
      ctx.fill();
      ctx.shadowBlur = 0; // Reset shadow
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // 3. Draw Centroids
    state.centroids.forEach((centroid, index) => {
      const cx = centroid.x * w;
      const cy = centroid.y * h;
      
      // Outer glow circle
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, 2 * Math.PI);
      ctx.fillStyle = `rgba(${centroid.color.rgb}, 0.25)`;
      ctx.fill();
      
      // Centroid Marker - Diamond Shape
      ctx.beginPath();
      ctx.moveTo(cx, cy - 9);
      ctx.lineTo(cx + 9, cy);
      ctx.lineTo(cx, cy + 9);
      ctx.lineTo(cx - 9, cy);
      ctx.closePath();
      
      ctx.fillStyle = centroid.color.fill;
      ctx.shadowColor = centroid.color.fill;
      ctx.shadowBlur = 12;
      ctx.fill();
      
      ctx.shadowBlur = 0; // Reset shadow
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label number inside centroid
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(index + 1, cx, cy);
    });
  }
});
