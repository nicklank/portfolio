const container = document.getElementById("network");
const nodes = new vis.DataSet();
const edges = new vis.DataSet();
const tagMap = {};
let network;
let projects = [];

// Fetch project data
fetch("projects.json")
  .then((res) => res.json())
  .then((data) => {
    projects = data;
    buildGraph();
    setupFilters(); // only run after graph is built
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
      font: {
        color: "#ffffff"
      },
      value: 10
    });

    // Tag map for edge connections
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
      stabilization: false,
      barnesHut: {
        gravitationalConstant: -30000,
        springLength: 200
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
      smooth: true
    }
  };

  network = new vis.Network(container, data, options);
  setupModalEvents();
}

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

  if (firstMatchedNode) {
    network.focus(firstMatchedNode, {
      scale: 1.5,
      animation: {
        duration: 500,
        easingFunction: "easeInOutQuad"
      }
    });
  }
}


    if (match) {
      network.focus(node.id, {
        scale: 1.5,
        animation: {
          duration: 500,
          easingFunction: "easeInOutQuad"
        }
      });
    }
  });
}

function setupModalEvents() {
  network.on("click", function (params) {
    if (params.nodes.length > 0) {
      const nodeId = params.nodes[0];
      const project = projects.find((p) => p.id === nodeId);
      if (!project) return;

      const bubble = document.getElementById("modal-bubble");
      const modal = document.getElementById("modal");
      const iframe = document.getElementById("project-frame");

      // Get canvas coordinates of clicked node
      const pos = network.getPositions([nodeId])[nodeId];
      const canvasPos = network.canvasToDOM(pos);

      // Set initial bubble position/size
      bubble.style.top = canvasPos.y + "px";
      bubble.style.left = canvasPos.x + "px";
      bubble.classList.remove("expanded");

      // Show the modal
      modal.style.display = "flex";

      // Force layout refresh then expand
      requestAnimationFrame(() => {
        bubble.classList.add("expanded");
        bubble.style.top = "10vh";
        bubble.style.left = "10vw";
        iframe.src = project.url;
      });
    }
  });

  document.getElementById("close-modal").addEventListener("click", () => {
    const bubble = document.getElementById("modal-bubble");
    const iframe = document.getElementById("project-frame");

    bubble.classList.remove("expanded");

    // Give time for animation before hiding
    setTimeout(() => {
      document.getElementById("modal").style.display = "none";
      iframe.src = "";
    }, 500);
  });
}
