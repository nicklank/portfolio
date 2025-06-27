// ==============================
// Graph Setup
// ==============================

const container = document.getElementById("network");
const nodes = new vis.DataSet();
const edges = new vis.DataSet();
const tagMap = {};
let network;
let projects = [];

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

  // Build edges
  for (let tag in tagMap) {
    const related = tagMap[tag];
    for (let i = 0; i < related.length; i++) {
      for (let j = i + 1; j < related.length; j++) {
        edges.add({
          from: related[i],
          to: related[j],
          color: { color: "#777777" },
          width: 1
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
      dragNodes: true,
      dragView: true,
      zoomView: true
    },
    nodes: {
      shape: "dot",
      size: 15,
      borderWidth: 2,
      shadow: false
    },
    edges: {
      smooth: {
        enabled: true,
        type: "continuous",
        roundness: 0.2
      },
      shadow: false
    }
  };

  network = new vis.Network(container, data, options);
  setupModalEvents();

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
  network.on("zoom", sendBackgroundUpdate);

  // Send initial state to background
  sendBackgroundUpdate();
}

function sendBackgroundUpdate() {
  const position = network.getViewPosition(); // {x, y}
  const scale = network.getScale(); // zoom level

  updateBackgroundTarget({ x: -position.x, y: -position.y }, scale);
}

// ==============================
// Filtering Logic (unchanged)
// ==============================

function setupFilters() { /* ... unchanged ... */ }
function filterGraph() { /* ... unchanged ... */ }

// ==============================
// Modal Setup (unchanged)
// ==============================

function setupModalEvents() { /* ... unchanged ... */ }
function closeModalHandler() { /* ... unchanged ... */ }
