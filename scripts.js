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

import { updateBackgroundTarget } from './background.js'; // NEW

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
      font: { color: "#ffffff", size: 14 },
      value: 15
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
            roundness: Math.random() * 0.5 + 0.1 
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
        centralGravity: 0.1,
        springLength: 200,
        springConstant: 0.02,
        damping: 0.95,
        avoidOverlap: 0.2
      },
      maxVelocity: 20,
      minVelocity: 0.1,
      solver: 'barnesHut',
      timestep: 0.5
    },
    interaction: {
      hover: true,
      hoverEdges: true,
      dragNodes: true,
      dragView: true,
      zoomView: true,
      zoomSpeed: 0.5,
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
// Filtering Logic (unchanged)
// ==============================

function setupFilters() {
  ["materialSelect", "yearSelect", "categorySelect"].forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener("change", filterGraph);
    }
  });
}

function groupMatchingNodes(nodeIds) {
  const basePosition = { x: 0, y: 0 }; // Center point for the group
  const spacing = 150; // Space between nodes in the group

  let angleStep = (2 * Math.PI) / nodeIds.length;
  const newPositions = {};

  nodeIds.forEach((nodeId, index) => {
    const angle = index * angleStep;
    newPositions[nodeId] = {
      x: basePosition.x + Math.cos(angle) * spacing,
      y: basePosition.y + Math.sin(angle) * spacing
    };
  });

  // Temporarily disable physics to lock the positions
  network.setOptions({ physics: { enabled: false } });
  network.moveNodes(newPositions);
}


function filterGraph() {
  const materialEl = document.getElementById("materialSelect");
  const yearEl = document.getElementById("yearSelect");
  const categoryEl = document.getElementById("categorySelect");

  const material = materialEl ? materialEl.value : "";
  const year = yearEl ? yearEl.value : "";
  const category = categoryEl ? categoryEl.value : "";

  let firstMatchedNode = null;
  const nodesToUpdate = [];
  const matchedNodeIds = [];

  nodes.forEach((node) => {
    const project = projects.find((p) => p.id === node.id);
    if (!project) return;

    const tags = project.tags.map((t) => t.toLowerCase());

    const matchesMaterial = !material || tags.includes(material);
    const matchesYear = !year || tags.includes(year);
    const matchesCategory = !category || tags.includes(category);

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

  if (matchedNodeIds.length > 0) {
    groupedMatchingNodes(matchedNodeIds);
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

function setupNodeHoverImage(projects) {
  network.on("hoverNode", function(params) {
    const nodeId = params.node;
    const project = projects.find(p => p.id === nodeId);
    if (project && project.images && project.images.length > 0) {
      const img = document.getElementById('background-image');
      img.src = project.images[0];
      img.style.opacity = 0.3;
      img.style.display = "block"; // <-- Show the image
    }
  });

  network.on("blurNode", function() {
    const img = document.getElementById('background-image');
    img.src = "";
    img.style.opacity = 0;
    img.style.display = "none"; // <-- Hide the image
  });
}

