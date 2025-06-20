const container = document.getElementById("network");
const nodes = new vis.DataSet();
const edges = new vis.DataSet();
const tagMap = {};
let network;
let projects = [];

// Fetch projects.json and initialize graph
fetch("projects.json")
  .then((res) => res.json())
  .then((data) => {
    projects = data;
    buildGraph();
  });

function buildGraph() {
  // Add nodes
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
      value: 10 // default size
    });

    // Build tag map for edges
    project.tags.forEach((tag) => {
      if (!tagMap[tag]) tagMap[tag] = [];
      tagMap[tag].push(project.id);
    });
  });

  // Add edges between projects with shared tags
  for (let tag in tagMap) {
    const relatedProjects = tagMap[tag];
    for (let i = 0; i < relatedProjects.length; i++) {
      for (let j = i + 1; j < relatedProjects.length; j++) {
        edges.add({
          from: relatedProjects[i],
          to: relatedProjects[j],
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
  setupInteractivity();
}

function setupInteractivity() {
  // Filter function
  document.getElementById("filterInput").addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase();
    nodes.forEach((node) => {
      const project = projects.find((p) => p.id === node.id);
      const match = project.tags.some((tag) =>
        tag.toLowerCase().includes(term)
      );
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
  });

  // Modal on node click
  network.on("click", function (params) {
    if (params.nodes.length > 0) {
      const nodeId = params.nodes[0];
      const project = projects.find((p) => p.id === nodeId);
      if (project) {
        const iframe = document.getElementById("project-frame");
        iframe.src = project.url;
        document.getElementById("modal").style.display = "flex";
      }
    }
  });

  document.getElementById("close-modal").addEventListener("click", () => {
    document.getElementById("modal").style.display = "none";
    document.getElementById("project-frame").src = "";
  });
}
