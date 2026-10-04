const ROWS = 12;
const COLS = 20;
const VISIT_DELAY = 18;
const PATH_DELAY = 38;

const gridElement = document.querySelector("#grid");
const algorithmSelect = document.querySelector("#algorithm-select");
const visualizeButton = document.querySelector("#visualize-button");
const clearPathButton = document.querySelector("#clear-path-button");
const clearBoardButton = document.querySelector("#clear-board-button");
const statusText = document.querySelector("#status-text");

let start = {
  row: 5,
  col: 3,
};

let end = {
  row: 5,
  col: 16,
};

let mouseDown = false;
let mode = null;
let drag = null;
let animating = false;

const grid = [];

function makeGrid() {
  gridElement.innerHTML = "";
  grid.length = 0;

  for (let rowIndex = 0; rowIndex < ROWS; rowIndex++) {
    const row = [];

    for (let colIndex = 0; colIndex < COLS; colIndex++) {
      const node = {
        row: rowIndex,
        col: colIndex,
        isStart: rowIndex === start.row && colIndex === start.col,
        isEnd: rowIndex === end.row && colIndex === end.col,
        isWall: false,
        distance: Infinity,
        heuristic: 0,
        previous: null,
        visited: false,
        element: document.createElement("div"),
      };

      node.element.className = "node";
      node.element.dataset.row = rowIndex;
      node.element.dataset.col = colIndex;

      bindNodeEvents(node);

      row.push(node);
      gridElement.appendChild(node.element);
    }

    grid.push(row);
  }

  renderAll();
}

function bindNodeEvents(node) {
  node.element.addEventListener("mousedown", (event) => {
    if (animating) {
      return;
    }

    event.preventDefault();
    mouseDown = true;

    if (node.isStart) {
      drag = "start";
      return;
    }

    if (node.isEnd) {
      drag = "end";
      return;
    }

    mode = node.isWall ? "erase" : "draw";
    node.isWall = mode === "draw";

    renderNode(node);
  });

  node.element.addEventListener("mouseenter", () => {
    if (!mouseDown || animating) {
      return;
    }

    if (drag) {
      moveSpecialNode(node, drag);
      return;
    }

    if (node.isStart || node.isEnd) {
      return;
    }

    node.isWall = mode === "draw";
    renderNode(node);
  });

  node.element.addEventListener("mouseup", stopInteraction);
}

function stopInteraction() {
  mouseDown = false;
  mode = null;
  drag = null;
}

document.addEventListener("mouseup", stopInteraction);

function moveSpecialNode(targetNode, type) {
  const conflictsWithEnd = type === "start" && targetNode.isEnd;
  const conflictsWithStart = type === "end" && targetNode.isStart;

  if (targetNode.isWall || conflictsWithEnd || conflictsWithStart) {
    return;
  }

  clearPath(false);

  if (type === "start") {
    const previousStart = grid[start.row][start.col];

    previousStart.isStart = false;

    start = {
      row: targetNode.row,
      col: targetNode.col,
    };

    targetNode.isStart = true;
    renderNode(previousStart);
  } else {
    const previousEnd = grid[end.row][end.col];

    previousEnd.isEnd = false;

    end = {
      row: targetNode.row,
      col: targetNode.col,
    };

    targetNode.isEnd = true;
    renderNode(previousEnd);
  }

  renderNode(targetNode);
}

function renderAll() {
  grid.flat().forEach(renderNode);
}

function renderNode(node) {
  node.element.className = "node";

  if (node.isWall) {
    node.element.classList.add("wall");
  }

  if (node.visited) {
    node.element.classList.add("visited");
  }

  if (node.isStart) {
    node.element.classList.add("start");
  }

  if (node.isEnd) {
    node.element.classList.add("end");
  }
}

function resetGridState() {
  grid.flat().forEach((node) => {
    node.distance = Infinity;
    node.heuristic = 0;
    node.previous = null;
    node.visited = false;

    node.element.classList.remove("visited", "path");
  });
}

function clearPath(updateStatus = true) {
  if (animating) {
    return;
  }

  resetGridState();

  if (updateStatus) {
    statusText.textContent =
      "Caminho limpo. As paredes foram preservadas.";
  }
}

function clearBoard() {
  if (animating) {
    return;
  }

  grid.flat().forEach((node) => {
    node.isWall = false;
  });

  resetGridState();
  renderAll();

  statusText.textContent = "Grade limpa.";
}

function getNeighbors(node) {
  const positions = [
    [node.row - 1, node.col],
    [node.row + 1, node.col],
    [node.row, node.col - 1],
    [node.row, node.col + 1],
  ];

  return positions
    .filter(([row, col]) => {
      return row >= 0 && row < ROWS && col >= 0 && col < COLS;
    })
    .map(([row, col]) => grid[row][col])
    .filter((neighbor) => !neighbor.isWall);
}

function buildPath(endNode) {
  const path = [];
  let currentNode = endNode;

  while (currentNode) {
    path.unshift(currentNode);
    currentNode = currentNode.previous;
  }

  const startNode = grid[start.row][start.col];

  return path[0] === startNode ? path : [];
}

function breadthFirstSearch() {
  const startNode = grid[start.row][start.col];
  const endNode = grid[end.row][end.col];

  const queue = [startNode];
  const visitedNodes = [];

  startNode.visited = true;

  while (queue.length > 0) {
    const currentNode = queue.shift();

    visitedNodes.push(currentNode);

    if (currentNode === endNode) {
      break;
    }

    for (const neighbor of getNeighbors(currentNode)) {
      if (neighbor.visited) {
        continue;
      }

      neighbor.visited = true;
      neighbor.previous = currentNode;

      queue.push(neighbor);
    }
  }

  return {
    visited: visitedNodes,
    path: buildPath(endNode),
  };
}

function dijkstra() {
  const startNode = grid[start.row][start.col];
  const endNode = grid[end.row][end.col];

  const unvisitedNodes = grid.flat();
  const visitedNodes = [];

  startNode.distance = 0;

  while (unvisitedNodes.length > 0) {
    unvisitedNodes.sort(
      (firstNode, secondNode) =>
        firstNode.distance - secondNode.distance,
    );

    const currentNode = unvisitedNodes.shift();

    if (!currentNode || currentNode.distance === Infinity) {
      break;
    }

    if (currentNode.isWall) {
      continue;
    }

    currentNode.visited = true;
    visitedNodes.push(currentNode);

    if (currentNode === endNode) {
      break;
    }

    for (const neighbor of getNeighbors(currentNode)) {
      if (neighbor.visited) {
        continue;
      }

      const newDistance = currentNode.distance + 1;

      if (newDistance < neighbor.distance) {
        neighbor.distance = newDistance;
        neighbor.previous = currentNode;
      }
    }
  }

  return {
    visited: visitedNodes,
    path: buildPath(endNode),
  };
}

function calculateManhattanDistance(firstNode, secondNode) {
  return (
    Math.abs(firstNode.row - secondNode.row) +
    Math.abs(firstNode.col - secondNode.col)
  );
}

function aStar() {
  const startNode = grid[start.row][start.col];
  const endNode = grid[end.row][end.col];

  const openNodes = [startNode];
  const visitedNodes = [];

  startNode.distance = 0;
  startNode.heuristic = calculateManhattanDistance(
    startNode,
    endNode,
  );

  while (openNodes.length > 0) {
    openNodes.sort((firstNode, secondNode) => {
      const firstScore =
        firstNode.distance + firstNode.heuristic;

      const secondScore =
        secondNode.distance + secondNode.heuristic;

      return firstScore - secondScore;
    });

    const currentNode = openNodes.shift();

    if (currentNode.visited) {
      continue;
    }

    currentNode.visited = true;
    visitedNodes.push(currentNode);

    if (currentNode === endNode) {
      break;
    }

    for (const neighbor of getNeighbors(currentNode)) {
      if (neighbor.visited) {
        continue;
      }

      const tentativeDistance = currentNode.distance + 1;

      if (tentativeDistance < neighbor.distance) {
        neighbor.distance = tentativeDistance;
        neighbor.heuristic = calculateManhattanDistance(
          neighbor,
          endNode,
        );
        neighbor.previous = currentNode;

        if (!openNodes.includes(neighbor)) {
          openNodes.push(neighbor);
        }
      }
    }
  }

  return {
    visited: visitedNodes,
    path: buildPath(endNode),
  };
}

function sleep(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function animate({ visited, path }) {
  for (const node of visited) {
    if (!node.isStart && !node.isEnd) {
      node.element.classList.add("visited");
    }

    await sleep(VISIT_DELAY);
  }

  if (path.length === 0) {
    statusText.textContent =
      "Nenhum caminho foi encontrado.";

    return;
  }

  for (const node of path) {
    if (!node.isStart && !node.isEnd) {
      node.element.classList.remove("visited");
      node.element.classList.add("path");
    }

    await sleep(PATH_DELAY);
  }

  const steps = Math.max(path.length - 1, 0);

  statusText.textContent =
    `Caminho encontrado com ${steps} passos.`;
}

function setControlsDisabled(disabled) {
  const controls = [
    visualizeButton,
    clearPathButton,
    clearBoardButton,
    algorithmSelect,
  ];

  controls.forEach((control) => {
    control.disabled = disabled;
  });
}

async function visualize() {
  if (animating) {
    return;
  }

  clearPath(false);

  animating = true;
  setControlsDisabled(true);

  statusText.textContent = "Executando algoritmo...";

  let result;

  switch (algorithmSelect.value) {
    case "bfs":
      result = breadthFirstSearch();
      break;

    case "dijkstra":
      result = dijkstra();
      break;

    default:
      result = aStar();
  }

  await animate(result);

  animating = false;
  setControlsDisabled(false);
}

visualizeButton.addEventListener("click", visualize);

clearPathButton.addEventListener("click", () => {
  clearPath(true);
});

clearBoardButton.addEventListener("click", clearBoard);

makeGrid();