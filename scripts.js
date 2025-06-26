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
// Data Fetch and Graph Build
// ==============================

fetch("projects.json")
  .then((res) => res.json())
  .then((data) => {
    projects = data;
    buildGraph();
    setupFilters();
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

  // Simplified, stable physics options
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
  
  // Wait for stabilization before allowing interactions
  network.once("stabilizationIterationsDone", function() {
    console.log("Network stabilized");
  });
}

// ==============================
// Filtering Logic (Simplified)
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

  // Update all nodes at once
  nodes.update(nodesToUpdate);

  // Focus on first matched node if found
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
// Modal Setup (Simplified)
// ==============================

function setupModalEvents() {
  network.on("click", function (params) {
    if (params.nodes.length > 0) {
      const nodeId = params.nodes[0];
      const project = projects.find((p) => p.id === nodeId);
      if (!project) return;

      // Simple node highlighting without physics manipulation
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
            ? { color: "#000000", size: 16, bold: true }
            : { color: "#ffffff", size: 14, bold: false }
        });
      });

      nodes.update(nodesToUpdate);

      // Modal setup
      const bubble = document.getElementById("modal-bubble");
      const modal = document.getElementById("modal");
      const modalContent = document.getElementById("modal-content");
      const iframe = document.getElementById("project-frame");

      // Clear previous content
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

        // Add images if they exist
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

      // Show modal
      if (bubble && modal) {
        modal.style.display = "flex";
        
        setTimeout(() => {
          bubble.classList.add("expanded");
        }, 50);
      }
    }
  });

  // Close modal handler
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
