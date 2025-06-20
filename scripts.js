// Project data (inlined for now; you can externalize to projects.json later)
const projects = [
  {
    id: "activest",
    title: "Activest",
    tags: ["softgood", "2025", "fashion", "activism"],
    url: "https://nicklankau.com/activest"
  },
  {
    id: "archive-bag",
    title: "Archive Bag",
    tags: ["softgood", "2023", "fashion"],
    url: "#"
  },
  {
    id: "carbon-clock",
    title: "Carbon Clock",
    tags: ["physical", "2025", "installation"],
    url: "#"
  }
];

// Build nodes and tag-based edges
const nodes = new vis.DataSet();
const edges = new vis.DataSet();

// Track tag relationships
const tagMap = {};

// Add nodes
projects.forEach((project, i) => {
  nodes.add({
    id: project.id,
    label: project.title,
    group: project.tags.includes("2025") ? "highlight" : undefined,
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
    value: 1 // default size
  });

  // Register tags for edge-building
  project.tags.forEach(tag => {
    if (!tagMap[tag]) tagMap[tag] = [];
    tagMap[tag].push(project.id);
  });
});

// Add edges based on shared tags
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

const container = document.getElementById("network");
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

const network = new vis.Network(container, data, options);

// 🧪 FILTER FUNCTIONALITY
document.getElementById("filterInput").addEventListener("input", (e) => {
  const term = e.target.value.toLowerCase();
  nodes.forEach((node) => {
    const project = projects.find(p => p.id === node.id);
    const match = project.tags.some(tag => tag.toLowerCase().includes(term));
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
});

// 🌐 MODAL VIEWER
network.on("click", function (params) {
  if (params.nodes.length > 0) {
    const nodeId = params.nodes[0];
    const project = projects.find(p => p.id === nodeId);
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
