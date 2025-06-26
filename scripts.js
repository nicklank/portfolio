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
        highlight: { background: "#89ffb8", border: "#ffffff" }
      },
      font: { color: "#ffffff" },
      value: 10
    });

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

const options = {
  physics: {
    stabilization: false,
    barnesHut: {
      gravitationalConstant: -5000,
      springLength: 300,
      springConstant: 0.02
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
      type: "curvedCCW", // slightly consistent curvature
      roundness: 0.05 // subtle curve
    }
  }
}; // <-- You were missing this closing brace and semicolon


  network = new vis.Network(container, data, options);
  setupModalEvents();
}

// ==============================
// Filtering Logic
// ==============================

function setupFilters() {
  ["materialSelect", "yearSelect", "categorySelect"].forEach((id) => {
    document.getElementById(id).addEventListener("change", filterGraph);
  });
}

function filterGraph() {
  const material = document.getElementById("materialSelect").value;
  const year = document.getElementById("yearSelect").value;
  const category = document.getElementById("categorySelect").value;

  let firstMatchedNode = null;

  nodes.forEach((node) => {
    const project = projects.find((p) => p.id === node.id);
    const tags = project.tags.map((t) => t.toLowerCase());

    const matchesMaterial = !material || tags.includes(material);
    const matchesYear = !year || tags.includes(year);
    const matchesCategory = !category || tags.includes(category);

    const match = matchesMaterial && matchesYear && matchesCategory;

    if (match && !firstMatchedNode) {
      firstMatchedNode = node.id;
    }

    nodes.update({
      id: node.id,
      value: match ? 30 : 10,
      color: match
        ? { background: "#89ffb8", border: "#ffffff", highlight: { background: "#ffffff", border: "#89ffb8" } }
        : { background: "#1f1f1f", border: "#666666", highlight: { background: "#333", border: "#aaa" } }
    });
  });

  if (firstMatchedNode) {
    network.focus(firstMatchedNode, { scale: 1.5, animation: { duration: 500, easingFunction: "easeInOutQuad" } });
  }
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

      const bubble = document.getElementById("modal-bubble");
      const modal = document.getElementById("modal");
      const modalContent = document.getElementById("modal-content");
      const iframe = document.getElementById("project-frame");

      iframe.src = "";
      iframe.style.display = "none";
      modalContent.innerHTML = "";

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

      if (project.externalLink) {
        const linkButton = document.createElement("a");
        linkButton.href = project.externalLink;
        linkButton.target = "_blank";
        linkButton.textContent = "View Full Project";
        linkButton.style.display = "inline-block";
        linkButton.style.marginTop = "10px";
        linkButton.style.padding = "8px 12px";
        linkButton.style.backgroundColor = "#89ffb8";
        linkButton.style.color = "#000";
        linkButton.style.textDecoration = "none";
        linkButton.style.borderRadius = "6px";
        modalContent.appendChild(linkButton);
      }

      modalContent.appendChild(titleElement);
      modalContent.appendChild(descElement);
      modalContent.appendChild(imagesContainer);

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
  });

  document.getElementById("close-modal").addEventListener("click", () => {
    const bubble = document.getElementById("modal-bubble");
    const iframe = document.getElementById("project-frame");
    const modalContent = document.getElementById("modal-content");

    bubble.classList.remove("expanded");

    setTimeout(() => {
      document.getElementById("modal").style.display = "none";
      iframe.src = "";
      modalContent.innerHTML = "";
    }, 500);
  });
}

// ==============================
// Parallax Setup
// ==============================

function setupDragParallax() {
  network.on("dragStart", function (params) {
    if (params.pointer) {
      lastPosition = { x: params.pointer.canvas.x, y: params.pointer.canvas.y };
    }
  });

  network.on("dragging", function (params) {
    if (params.pointer) {
      const deltaX = (params.pointer.canvas.x - lastPosition.x) * 0.02;
      const deltaY = (params.pointer.canvas.y - lastPosition.y) * 0.02;

      lastPosition = { x: params.pointer.canvas.x, y: params.pointer.canvas.y };

      shiftBackground(deltaX, deltaY);
    }
  });
}
