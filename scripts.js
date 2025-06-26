// ==============================
// Graph Setup
// ==============================

const container = document.getElementById("network");
const nodes = new vis.DataSet();
const edges = new vis.DataSet();
const tagMap = {};
let network;
let projects = [];
let lastPosition = { x: 0, y: 0 };
let physicsTimeout = null; // Track physics timeout to prevent multiple calls

// ==============================
// Data Fetch and Graph Build
// ==============================

fetch("projects.json")
  .then((res) => res.json())
  .then((data) => {
    projects = data;
    buildGraph();
    setupFilters();
    setupDragParallax();
    initBackground(); // Initialize dot matrix
    startNodeFloating(); // Add subtle floating effect
  });

function buildGraph() {
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
      font: { color: "#ffffff" },
      value: 10
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
          color: { color: "#777" }
        });
      }
    }
  }

  const data = { nodes, edges };

  const options = {
    physics: {
      enabled: true,
      stabilization: {
        iterations: 200,
        updateInterval: 25
      },
      barnesHut: {
        gravitationalConstant: -2000,
        springLength: 150,
        springConstant: 0.04,
        avoidOverlap: 0.5
      }
    },
    interaction: {
      hover: true,
      dragNodes: true
    },
    nodes: {
      shape: "dot",
      size: 15
    },
    edges: {
      smooth: {
        type: "curvedCCW",
        roundness: 0.05
      }
    }
  };

  network = new vis.Network(container, data, options);
  setupModalEvents();
}

// ==============================
// Physics Control Helper
// ==============================

function safeSetPhysics(enabled) {
  if (physicsTimeout) {
    clearTimeout(physicsTimeout);
    physicsTimeout = null;
  }
  
  if (enabled) {
    physicsTimeout = setTimeout(() => {
      network.setOptions({ physics: { enabled: true } });
      physicsTimeout = null;
    }, 300);
  } else {
    network.setOptions({ physics: { enabled: false } });
  }
}

// ==============================
// Filtering Logic
// ==============================

function setupFilters() {
  ["materialSelect", "yearSelect", "categorySelect"].forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener("change", filterGraph);
    }
  });
}

function filterGraph() {
  const materialEl = document.getElementById("materialSelect");
  const yearEl = document.getElementById("yearSelect");
  const categoryEl = document.getElementById("categorySelect");
  
  const material = materialEl ? materialEl.value : "";
  const year = yearEl ? yearEl.value : "";
  const category = categoryEl ? categoryEl.value : "";

  let firstMatchedNode = null;

  // Safely disable physics
  safeSetPhysics(false);

  // Update nodes in batch to prevent multiple updates
  const nodesToUpdate = [];
  
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

    nodesToUpdate.push({
      id: node.id,
      value: match ? 30 : 10,
      color: match
        ? {
            background: "#89ffb8",
            border: "#ffffff",
            highlight: { background: "#ffffff", border: "#89ffb8" }
          }
        : {
            background: "#1f1f1f",
            border: "#666666",
            highlight: { background: "#333", border: "#aaa" }
          }
    });
  });

  // Update all nodes at once
  nodes.update(nodesToUpdate);

  if (firstMatchedNode) {
    network.focus(firstMatchedNode, {
      scale: 1.5,
      animation: { duration: 500, easingFunction: "easeInOutQuad" }
    });
  }

  // Re-enable physics after updates
  safeSetPhysics(true);
}

// ==============================
// Modal Setup
// ==============================

function setupModalEvents() {
  network.on("click", function (params) {
    if (params.nodes.length > 0) {
      const nodeId = params.nodes[0];
      const project = projects.find((p) => p.id === nodeId);
      if (!project) return;

      // Safely disable physics
      safeSetPhysics(false);

      // Batch update all nodes
      const nodesToUpdate = [];
      
      nodes.forEach((node) => {
        nodesToUpdate.push({
          id: node.id,
          value: node.id === nodeId ? 30 : 10,
          color: node.id === nodeId 
            ? {
                background: "#ffffff",
                border: "#89ffb8",
                highlight: { background: "#ffffff", border: "#89ffb8" }
              }
            : {
                background: "#1f1f1f",
                border: "#666666",
                highlight: { background: "#333", border: "#aaa" }
              },
          font: node.id === nodeId 
            ? { color: "#ffffff", size: 24, bold: true }
            : { color: "#ffffff", size: 14, bold: false }
        });
      });

      // Update all nodes at once
      nodes.update(nodesToUpdate);

      // Re-enable physics
      safeSetPhysics(true);

      // Modal setup
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
      }

      if (modalContent) {
        const titleElement = document.createElement("h2");
        titleElement.textContent = project.title;

        const descElement = document.createElement("p");
        descElement.textContent = project.description || "No description provided.";

        const imagesContainer = document.createElement("div");
        imagesContainer.style.display = "flex";
        imagesContainer.style.flexDirection = "column";
        imagesContainer.style.gap = "10px";

        if (project.images && project.images.length > 0) {
          project.images.forEach((imgUrl) => {
            const imgElement = document.createElement("img");
            imgElement.src = imgUrl;
            imgElement.style.maxWidth = "100%";
            imagesContainer.appendChild(imgElement);
          });
        }

        modalContent.appendChild(titleElement);
        modalContent.appendChild(descElement);
        modalContent.appendChild(imagesContainer);
      }

      if (bubble && modal) {
        const pos = network.getPositions([nodeId])[nodeId];
        const canvasPos = network.canvasToDOM(pos);

        bubble.style.top = canvasPos.y + "px";
        bubble.style.left = canvasPos.x + "px";
        bubble.classList.remove("expanded");

        modal.style.display = "flex";

        requestAnimationFrame(() => {
          bubble.classList.add("expanded");
          bubble.style.top = "10vh";
          bubble.style.left = "10vw";
        });
      }
    }
  });

  const closeModal = document.getElementById("close-modal");
  if (closeModal) {
    closeModal.addEventListener("click", () => {
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
      }, 500);
    });
  }
}

