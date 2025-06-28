// ==============================
// Graph Setup
// ==============================

const container = document.getElementById("network");
const nodes = new vis.DataSet();
const edges = new vis.DataSet();
const tagMap = {};
let network;
let projects = [];
let filterEdges = new vis.DataSet();

// ==============================
// Import Background Control
// ==============================

import { updateBackgroundTarget, setBackgroundLightMode } from './background.js';

// ==============================
// Data Fetch and Graph Build
// ==============================

fetch("projects.json")
  .then((res) => res.json())
  .then((data) => {
    projects = data;
    buildGraph();
    setupFilters();
    setupBackgroundSync(); // NEW: start tracking view changes
  })
  .catch((error) => {
    console.error("Error loading projects:", error);
  });

function buildGraph() {
  // Clear existing data
  nodes.clear();
  edges.clear();

  // Build nodes
  projects.forEach((project) => {
    nodes.add({
      id: project.id,
      label: project.title,
      color: {
        background: "#1f1f1f",
        border: "#89ffb8",
        highlight: {
          background: "#89ffb8",
          border: "#ffffff"
        }
      },
      font: { 
        color: document.body.classList.contains('light-mode') ? "#000000" : "#ffffff", 
        size: 16,
        face: "'Arial Black', sans-serif",
        bold: true
      },
      value: 18
    });

    // Build tag map for edges
    project.tags.forEach((tag) => {
      if (!tagMap[tag]) tagMap[tag] = [];
      tagMap[tag].push(project.id);
    });
  });

  // Build edges with shared tag weighting
  for (let tag in tagMap) {
    const related = tagMap[tag];
    for (let i = 0; i < related.length; i++) {
      for (let j = i + 1; j < related.length; j++) {
        const projectA = projects.find(p => p.id === related[i]);
        const projectB = projects.find(p => p.id === related[j]);

        const sharedTags = projectA.tags.filter(tag => projectB.tags.includes(tag)).length;

        // Calculate edge length: more shared tags = shorter edge
        const length = Math.max(50, 300 - sharedTags * 50); // 300= max loose dist, 50 = min tight dist, 
        // 50 = how strong shared tags pull nodes together (higher = tighter edges)

        const edgeWidth = .5 + sharedTags * 0.3; // Optional: make edges thicker if they are stronger

        edges.add({
          from: related[i],
          to: related[j],
          color: { color: "#555555" },
          width: edgeWidth,
          length: length,
          label: '', // start with no label
          hiddenTag: tag, // store the tag for later use
          font: {
            size: 12,
            color: "#ffffff",
            strokeWidth: 2,
            strokeColor: "#000000",
            background: "rgba(0, 0, 0, 0.5)",
            align: "top"
          },
          smooth: {
            type: "cubicBezier",
            roundness: Math.random() * 0.05 + 0.01 
          }
        });
      }
    }
  }

  const data = { nodes, edges };

  const options = {
    physics: {
      enabled: true,
      stabilization: {
        enabled: true,
        iterations: 100,
        updateInterval: 50,
        fit: true
      },
      barnesHut: {
        gravitationalConstant: -1000,
        centralGravity: .1,
        springLength: 250,
        springConstant: 0.03,
        damping: 0.65,
        avoidOverlap: 0.2
      },
      maxVelocity: 30,
      minVelocity: 0.01,
      solver: 'barnesHut',
      timestep: 0.1
    },
    interaction: {
      hover: true,
      dragNodes: true,
      dragView: true,
      zoomView: true,
      zoomSpeed: 1,
      multiselect: true,
      navigationButtons: false,
      tooltipDelay: 200
    },
    nodes: {
      shape: "square",
      size: 10,
      borderWidth: .5,
      shadow: false
    },
    edges: {
      smooth: {
        enabled: true,
        type: "cubicBezier",
        roundness: 0.2
      },
      shadow: false
    }
  };

  network = new vis.Network(container, data, options);
  setupModalEvents();

  

  setupNodeHoverImage(projects); // <-- Add this here, after network is created





  //setupEdgeHoverEvents();



  let currentlyHoveredEdge = null;

  function setupEdgeHoverEvents() {
    network.on("hoverEdge", function (params) {
      const edgeId = params.edge;
      const edge = edges.get(edgeId);

      if (edge && edge.hiddenTag) {
        currentlyHoveredEdge = edgeId;
        edges.update({ id: edgeId, label: edge.hiddenTag });
      }
    });

    network.on("blurEdge", function (params) {
      clearHoveredEdge();
    });

    network.on("hoverNode", function () {
      clearHoveredEdge();
    });

    network.on("blurNode", function () {
      clearHoveredEdge();
    });

    network.on("click", function () {
      clearHoveredEdge();
    });
  }

  function clearHoveredEdge() {
    if (currentlyHoveredEdge !== null) {
      edges.update({ id: currentlyHoveredEdge, label: '' });
      currentlyHoveredEdge = null;
    }
  }

  network.once("stabilizationIterationsDone", function () {
    console.log("Network stabilized");
  });

  // Re-setup light mode toggle after network rebuild
  document.getElementById('toggle-lightmode').removeEventListener('change', lightModeHandler);
  document.getElementById('toggle-lightmode').addEventListener('change', lightModeHandler);

}



// ==============================
// Background Sync Handler (NEW)
// ==============================

function setupBackgroundSync() {
  // Runs on zoom and drag events
  network.on("dragging", sendBackgroundUpdate);
  
  network.on("zoom", function (params) {
  // params.pointer.DOM contains the mouse position relative to the container
  if (params && params.pointer && params.pointer.DOM) {
    const pointer = network.DOMtoCanvas(params.pointer.DOM);
    sendBackgroundUpdate(pointer);
  } else {
    sendBackgroundUpdate();
  }
  });

  // Send initial state to background
  sendBackgroundUpdate();
}

function sendBackgroundUpdate(center) {
  const position = network.getViewPosition(); // {x, y}
  const scale = network.getScale(); // zoom level

  updateBackgroundTarget({ x: -position.x, y: -position.y }, scale, center);
}

// ==============================
// UPDATED Filtering Logic for New Dropdowns
// ==============================

function setupFilters() {
  // Set up dropdown functionality
  document.querySelectorAll('.dropdown').forEach(dropdown => {
    const button = dropdown.querySelector('.dropdown-button');
    const menu = dropdown.querySelector('.dropdown-menu');
    const options = dropdown.querySelectorAll('.dropdown-option');
    const dropdownType = dropdown.getAttribute('data-dropdown');
    
    // Toggle dropdown menu
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      
      // Close other dropdowns
      document.querySelectorAll('.dropdown').forEach(otherDropdown => {
        if (otherDropdown !== dropdown) {
          otherDropdown.querySelector('.dropdown-menu').classList.remove('show');
        }
      });
      
      menu.classList.toggle('show');
    });
    
    // Handle option selection
    options.forEach(option => {
      option.addEventListener('click', (e) => {
        e.stopPropagation();
        
        const value = option.getAttribute('data-value');
        const text = option.textContent;
        
        // Update button text
        button.textContent = text;
        
        // Store selected value on the dropdown element
        dropdown.setAttribute('data-selected', value);
        
        // Close menu
        menu.classList.remove('show');
        
        // Trigger filter update
        filterGraph();
      });
    });
  });
  
  // Close dropdowns when clicking outside
  document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-menu').forEach(menu => {
      menu.classList.remove('show');
    });
  });
}

function getFilterValues() {
  const materialDropdown = document.querySelector('[data-dropdown="material"]');
  const yearDropdown = document.querySelector('[data-dropdown="year"]');
  const categoryDropdown = document.querySelector('[data-dropdown="category"]');
  
  return {
    material: materialDropdown ? materialDropdown.getAttribute('data-selected') || '' : '',
    year: yearDropdown ? yearDropdown.getAttribute('data-selected') || '' : '',
    category: categoryDropdown ? categoryDropdown.getAttribute('data-selected') || '' : ''
  };
}

function groupMatchingNodes(nodeIds) {
  const basePosition = { x: 0, y: 0 }; // Center point for the group
  const spacing = 150; // Space between nodes in the group

  let angleStep = (2 * Math.PI) / nodeIds.length;
  const newPositions = [];

  nodeIds.forEach((nodeId, index) => {
    const angle = index * angleStep;
    newPositions.push({
      id: nodeId,
      x: basePosition.x + Math.cos(angle) * spacing,
      y: basePosition.y + Math.sin(angle) * spacing,
      physics: false // This tells vis.js to animate to this position
    });
  });

  // Update positions without disabling global physics
  nodes.update(newPositions);
  
  // After a delay, allow physics to take over again for these nodes
  setTimeout(() => {
    const resetPhysics = nodeIds.map(id => ({ id, physics: true }));
    nodes.update(resetPhysics);
  }, 1000); // Give time for smooth movement
}

function filterGraph() {
  const { material, year, category } = getFilterValues();

  // Clear any existing filter edges
  filterEdges.clear();

  let firstMatchedNode = null;
  const nodesToUpdate = [];
  const matchedNodeIds = [];

  nodes.forEach((node) => {
    const project = projects.find((p) => p.id === node.id);
    if (!project) return;

    const tags = project.tags.map((t) => t.toLowerCase());

    const matchesMaterial = !material || tags.includes(material.toLowerCase());
    const matchesYear = !year || tags.includes(year.toLowerCase());
    const matchesCategory = !category || tags.includes(category.toLowerCase());

    const match = matchesMaterial && matchesYear && matchesCategory;

    if (match && !firstMatchedNode) {
      firstMatchedNode = node.id;
    }

    if (match) matchedNodeIds.push(node.id);

    nodesToUpdate.push({
      id: node.id,
      value: match ? 25 : 15,
      color: match
        ? {
            background: "#89ffb8",
            border: "#ffffff",
            highlight: { background: "#ffffff", border: "#89ffb8" }
          }
        : {
            background: "#1f1f1f",
            border: "#666666",
            highlight: { background: "#333333", border: "#aaaaaa" }
          }
    });
  });

  nodes.update(nodesToUpdate);

  // Create invisible clustering edges between matched nodes
  if (matchedNodeIds.length > 1) {
    const clusterEdges = [];
    for (let i = 0; i < matchedNodeIds.length; i++) {
      for (let j = i + 1; j < matchedNodeIds.length; j++) {
        clusterEdges.push({
          id: `filter-${matchedNodeIds[i]}-${matchedNodeIds[j]}`,
          from: matchedNodeIds[i],
          to: matchedNodeIds[j],
          color: { color: 'transparent' }, // Invisible
          width: 0,
          length: 60, // Shorter = tighter clustering
          physics: true,
          smooth: false
        });
      }
    }
    filterEdges.add(clusterEdges);
    
    // Add filter edges to the network
    edges.add(clusterEdges);
  }

  if (firstMatchedNode) {
    setTimeout(() => {
      network.focus(firstMatchedNode, {
        scale: 1.2,
        animation: { duration: 800, easingFunction: "easeInOutQuad" }
      });
    }, 100);
  }
}

// ==============================
// Modal Setup (unchanged)
// ==============================

function setupModalEvents() {
  network.on("click", function (params) {
    if (params.nodes.length > 0) {
      const nodeId = params.nodes[0];
      const project = projects.find((p) => p.id === nodeId);
      if (!project) return;

      const nodesToUpdate = [];

      nodes.forEach((node) => {
        nodesToUpdate.push({
          id: node.id,
          value: node.id === nodeId ? 30 : 15,
          color: node.id === nodeId
            ? {
                background: "#ffffff",
                border: "#89ffb8",
                highlight: { background: "#ffffff", border: "#89ffb8" }
              }
            : {
                background: "#1f1f1f",
                border: "#666666",
                highlight: { background: "#333333", border: "#aaaaaa" }
              },
          font: node.id === nodeId
            ? { color: "#ffffff", size: 16, bold: true }
            : { color: "#ffffff", size: 14, bold: false }
        });
      });

      nodes.update(nodesToUpdate);

      const bubble = document.getElementById("modal-bubble");
      const modal = document.getElementById("modal");
      const modalContent = document.getElementById("modal-content");
      const iframe = document.getElementById("project-frame");

      if (iframe) {
        iframe.src = "";
        iframe.style.display = "none";
      }

      if (modalContent) {
        modalContent.innerHTML = "";

        const titleElement = document.createElement("h2");
        titleElement.textContent = project.title;
        titleElement.style.color = "#ffffff";
        titleElement.style.marginBottom = "10px";

        const descElement = document.createElement("p");
        descElement.textContent = project.description || "No description provided.";
        descElement.style.color = "#cccccc";
        descElement.style.lineHeight = "1.5";

        modalContent.appendChild(titleElement);
        modalContent.appendChild(descElement);

        if (project.images && project.images.length > 0) {
          const imagesContainer = document.createElement("div");
          imagesContainer.style.display = "flex";
          imagesContainer.style.flexDirection = "column";
          imagesContainer.style.gap = "10px";
          imagesContainer.style.marginTop = "15px";

          project.images.forEach((imgUrl) => {
            const imgElement = document.createElement("img");
            imgElement.src = imgUrl;
            imgElement.style.maxWidth = "100%";
            imgElement.style.borderRadius = "5px";
            imagesContainer.appendChild(imgElement);
          });

          modalContent.appendChild(imagesContainer);
        }
      }

      if (bubble && modal) {
        modal.style.display = "flex";

        setTimeout(() => {
          bubble.classList.add("expanded");
        }, 50);
      }
    }
  });

  const closeModal = document.getElementById("close-modal");
  if (closeModal) {
    closeModal.addEventListener("click", closeModalHandler);
  }
}

function closeModalHandler() {
  const bubble = document.getElementById("modal-bubble");
  const iframe = document.getElementById("project-frame");
  const modalContent = document.getElementById("modal-content");
  const modal = document.getElementById("modal");

  if (bubble) {
    bubble.classList.remove("expanded");
  }

  setTimeout(() => {
    if (modal) modal.style.display = "none";
    if (iframe) iframe.src = "";
    if (modalContent) modalContent.innerHTML = "";
  }, 300);
}

// ==============================
// Node Hover Image Setup (NEW)
// ==============================

let currentHalftoneEffect = null;

function setupNodeHoverImage(projects) {
  network.on("hoverNode", function(params) {
    const nodeId = params.node;
    const project = projects.find(p => p.id === nodeId);
    if (project && project.images && project.images.length > 0) {
      const img = document.getElementById('background-image');
      img.src = project.images[0];
      img.style.opacity = 0.5; // Increased opacity for better halftone effect
      img.style.display = "block";
      
      // Apply halftone effect after image loads
      img.onload = function() {
        if (currentHalftoneEffect) {
          currentHalftoneEffect.destroy();
        }
        
        currentHalftoneEffect = new HalftoneEffect(img, {
          spacing: 20,
          maxSize: 7,
          mouseInfluence: 0.0,
          interactive: true,
          contrast: .5,
          threshold: 120,
          dotColor: document.body.classList.contains('light-mode') ? '#000000' : '#ffffff'
        });
      };
    }
  });

  network.on("blurNode", function() {
    const img = document.getElementById('background-image');
    
    // Clean up halftone effect
    if (currentHalftoneEffect) {
      currentHalftoneEffect.destroy();
      currentHalftoneEffect = null;
    }
    
    img.src = "";
    img.style.opacity = 0;
    img.style.display = "none";
  });
}

// ==============================
// Light Mode Toggle (FIXED)
// ==============================

function lightModeHandler(e) {
  const isLightMode = e.target.checked;
  
  if (isLightMode) {
    document.body.classList.add('light-mode');
    setBackgroundLightMode(true);
  } else {
    document.body.classList.remove('light-mode');
    setBackgroundLightMode(false);
  }
  
  // Update all node text colors
  const nodesToUpdate = [];
  nodes.forEach((node) => {
    nodesToUpdate.push({
      id: node.id,
      font: { 
        color: isLightMode ? "#000000" : "#ffffff",
        size: 16,
        face: "'Arial Black', sans-serif",
        bold: true
      }
    });
  });
  nodes.update(nodesToUpdate);
  
  // Update halftone dot color if effect is currently active
  if (currentHalftoneEffect) {
    currentHalftoneEffect.updateConfig({
      dotColor: isLightMode ? '#000000' : '#ffffff'
    });
  }
}

document.getElementById('toggle-lightmode').addEventListener('change', lightModeHandler);