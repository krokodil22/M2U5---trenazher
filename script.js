const commands = [
  { type: 'turn-left', label: 'Поворот налево', color: 'command' },
  { type: 'turn-right', label: 'Поворот направо', color: 'command' },
  { type: 'move-forward', label: 'Шаг вперед', color: 'command' },
];

const START_BLOCK = {
  id: 'start-block',
  type: 'start',
  label: 'когда 🚩 нажат',
  color: 'start',
  fixed: true,
  x: 56,
  y: 32,
};

const BLOCK_WIDTH = 200;
const BLOCK_HEIGHT = 60;
const SNAP_DISTANCE = 34;
const STACK_SPACING = -4;
const COLUMN_TOLERANCE = 36;

const directionOrder = ['up', 'right', 'down', 'left'];
const directionVectors = {
  up: [-1, 0],
  right: [0, 1],
  down: [1, 0],
  left: [0, -1],
};
const directionRotation = {
  up: 0,
  right: 90,
  down: 180,
  left: 270,
};

const levels = [
  { title: 'Уровень 1', file: 'lvl1.svg', start: [0, 0], finish: [0, 4], path: [[0,0],[0,1],[0,2],[0,3],[0,4]], hint: 'Дойди до красной клетки по прямой.' },
  { title: 'Уровень 2', file: 'lvl2.svg', start: [0, 0], finish: [2, 2], path: [[0,0],[0,1],[0,2],[1,2],[2,2]], hint: 'Сначала двигайся вправо, затем вниз.' },
  { title: 'Уровень 3', file: 'Lvl3.svg', start: [2, 0], finish: [0, 2], path: [[2,0],[1,0],[0,0],[0,1],[0,2]], hint: 'Поднимись наверх и заверни к финишу.' },
  { title: 'Уровень 4', file: 'lvl4.svg', start: [4, 0], finish: [0, 4], path: [[4,0],[3,0],[2,0],[2,1],[2,2],[1,2],[0,2],[0,3],[0,4]], hint: 'Ищи длинный коридор с поворотом.' },
  { title: 'Уровень 5', file: 'lvl5.svg', start: [4, 4], finish: [0, 1], path: [[4,4],[3,4],[2,4],[2,3],[2,2],[1,2],[0,2],[0,1]], hint: 'Поднимайся снизу и поверни налево.' },
  { title: 'Уровень 6', file: 'lvl6.svg', start: [1, 0], finish: [4, 4], path: [[1,0],[1,1],[1,2],[2,2],[3,2],[4,2],[4,3],[4,4]], hint: 'Средний ряд выведет тебя к финишу.' },
  { title: 'Уровень 7', file: 'lvl7.svg', start: [0, 5], finish: [5, 0], path: [[0,5],[1,5],[2,5],[2,4],[2,3],[3,3],[4,3],[5,3],[5,2],[5,1],[5,0]], hint: 'Длинный путь вниз, потом налево.' },
  { title: 'Уровень 8', file: 'lvl8.svg', start: [3, 0], finish: [0, 3], path: [[3,0],[2,0],[1,0],[1,1],[1,2],[0,2],[0,3]], hint: 'Небольшой подъём и один поворот.' },
  { title: 'Уровень 9', file: 'lvl9.svg', start: [0, 0], finish: [5, 5], path: [[0,0],[0,1],[1,1],[2,1],[2,2],[3,2],[4,2],[4,3],[4,4],[5,4],[5,5]], hint: 'Следуй по ступенькам до правого нижнего угла.' },
  { title: 'Уровень 10', file: 'lvl10.svg', start: [6, 0], finish: [0, 6], path: [[6,0],[5,0],[4,0],[4,1],[4,2],[3,2],[2,2],[2,3],[2,4],[1,4],[0,4],[0,5],[0,6]], hint: 'Финал: длинный маршрут с несколькими поворотами.' },
].map((level) => ({ ...level, size: Math.max(...level.path.flat()) + 1 }));

const commandList = document.getElementById('command-list');
const dropzone = document.getElementById('program-dropzone');
const board = document.getElementById('board');
const runBtn = document.getElementById('run-btn');
const resetBtn = document.getElementById('reset-btn');
const nextLevelBtn = document.getElementById('next-level-btn');
const stepCounter = document.getElementById('step-counter');
const statusText = document.getElementById('status-text');
const levelTitle = document.getElementById('level-title');
const levelDescription = document.getElementById('level-description');
const levelProgress = document.getElementById('level-progress');
const commandTemplate = document.getElementById('command-template');
const programTemplate = document.getElementById('program-template');

let program = [];
let draggedCommand = null;
let pointerDrag = null;
let currentLevelIndex = 0;
let currentPosition = null;
let currentDirection = 'right';
let blockIdCounter = 0;

function createProgramBlock(type, x = 56, y = 120) {
  const command = commands.find((item) => item.type === type);
  return {
    id: `block-${blockIdCounter += 1}`,
    type,
    label: command.label,
    color: command.color,
    x,
    y,
    fixed: false,
  };
}

function getBlocksForRender() {
  return [START_BLOCK, ...program];
}

function getExecutionSequence() {
  return [...program]
    .sort((a, b) => (a.y - b.y) || (a.x - b.x))
    .map((block) => block.type);
}

function clampPosition(x, y) {
  const maxX = Math.max(16, dropzone.clientWidth - BLOCK_WIDTH - 16);
  const maxY = Math.max(16, dropzone.clientHeight - BLOCK_HEIGHT - 16);
  return {
    x: Math.min(Math.max(16, x), maxX),
    y: Math.min(Math.max(16, y), maxY),
  };
}

function getSnapPosition(block) {
  const candidates = getBlocksForRender().filter((item) => item.id !== block.id);
  let snapped = clampPosition(block.x, block.y);
  let bestDistance = SNAP_DISTANCE;

  candidates.forEach((candidate) => {
    const targetX = candidate.x;
    const targetY = candidate.y + BLOCK_HEIGHT + STACK_SPACING;
    const deltaX = Math.abs(block.x - targetX);
    const deltaY = Math.abs(block.y - targetY);
    const isBelowCandidate = block.y >= candidate.y - 12;
    if (!isBelowCandidate || deltaX > COLUMN_TOLERANCE || deltaY > SNAP_DISTANCE) return;

    const distance = Math.hypot(deltaX, deltaY);
    if (distance < bestDistance) {
      bestDistance = distance;
      snapped = { x: targetX, y: targetY };
    }
  });

  return clampPosition(snapped.x, snapped.y);
}

function renderCommands() {
  commandList.innerHTML = '';
  commands.forEach((command) => {
    const node = commandTemplate.content.firstElementChild.cloneNode(true);
    node.dataset.command = command.type;
    node.dataset.color = command.color;
    node.draggable = true;
    node.querySelector('.command-text').textContent = command.label;
    node.addEventListener('dragstart', () => {
      draggedCommand = command.type;
    });
    node.addEventListener('dragend', () => {
      draggedCommand = null;
    });
    commandList.appendChild(node);
  });
}

function createBlockNode(block) {
  const node = programTemplate.content.firstElementChild.cloneNode(true);
  node.dataset.id = block.id;
  node.dataset.color = block.color;
  node.style.transform = `translate(${block.x}px, ${block.y}px)`;
  node.classList.toggle('is-fixed', block.fixed);
  node.querySelector('.program-text').textContent = block.label;

  const handle = node.querySelector('.program-handle');
  if (block.fixed) {
    handle.textContent = '⚑';
  } else {
    handle.textContent = '⋮⋮';
  }

  const deleteButton = node.querySelector('.delete-block');
  if (block.fixed) {
    deleteButton.remove();
  } else {
    deleteButton.addEventListener('click', () => {
      program = program.filter((item) => item.id !== block.id);
      renderProgram();
    });
  }

  if (!block.fixed) {
    const handlePointerDown = (event) => {
      if (event.target.closest('.delete-block')) return;
      event.preventDefault();
      node.setPointerCapture(event.pointerId);
      const rect = dropzone.getBoundingClientRect();
      pointerDrag = {
        id: block.id,
        pointerId: event.pointerId,
        offsetX: event.clientX - rect.left - block.x,
        offsetY: event.clientY - rect.top - block.y,
      };
      node.classList.add('dragging');
    };

    node.addEventListener('pointerdown', handlePointerDown);
    node.addEventListener('pointermove', (event) => {
      if (!pointerDrag || pointerDrag.id !== block.id) return;
      const rect = dropzone.getBoundingClientRect();
      const next = clampPosition(event.clientX - rect.left - pointerDrag.offsetX, event.clientY - rect.top - pointerDrag.offsetY);
      const target = program.find((item) => item.id === block.id);
      target.x = next.x;
      target.y = next.y;
      node.style.transform = `translate(${next.x}px, ${next.y}px)`;
    });
    node.addEventListener('pointerup', () => finishPointerDrag(block.id, node));
    node.addEventListener('pointercancel', () => finishPointerDrag(block.id, node));
  }

  return node;
}

function finishPointerDrag(blockId, node) {
  if (!pointerDrag || pointerDrag.id !== blockId) return;
  const target = program.find((item) => item.id === blockId);
  const snapped = getSnapPosition(target);
  target.x = snapped.x;
  target.y = snapped.y;
  pointerDrag = null;
  node.classList.remove('dragging');
  renderProgram();
}

function renderProgram() {
  dropzone.innerHTML = '';
  getBlocksForRender().forEach((block) => {
    dropzone.appendChild(createBlockNode(block));
  });
}

function getCurrentLevel() { return levels[currentLevelIndex]; }
function toKey([row, col]) { return `${row},${col}`; }

function getDirectionFromPath(path) {
  if (path.length < 2) return 'right';
  const [[fromRow, fromCol], [toRow, toCol]] = path;
  if (toRow < fromRow) return 'up';
  if (toRow > fromRow) return 'down';
  if (toCol < fromCol) return 'left';
  return 'right';
}

function rotateDirection(direction, turn) {
  const index = directionOrder.indexOf(direction);
  const shift = turn === 'turn-left' ? -1 : 1;
  return directionOrder[(index + shift + directionOrder.length) % directionOrder.length];
}

function renderBoard() {
  const level = getCurrentLevel();
  const pathSet = new Set(level.path.map(toKey));
  board.style.backgroundImage = `linear-gradient(rgba(5,8,23,.52), rgba(5,8,23,.82)), url('./${level.file}')`;
  board.style.gridTemplateColumns = `repeat(${level.size}, 1fr)`;
  board.innerHTML = '';

  for (let row = 0; row < level.size; row += 1) {
    for (let col = 0; col < level.size; col += 1) {
      const cell = document.createElement('div');
      const key = `${row},${col}`;
      cell.className = 'cell';
      if (pathSet.has(key)) cell.classList.add('path');
      else cell.classList.add('wall');
      if (key === toKey(level.start)) cell.classList.add('start');
      if (key === toKey(level.finish)) cell.classList.add('finish');
      if (key === toKey(currentPosition)) {
        const hero = document.createElement('div');
        hero.className = 'hero';
        hero.style.transform = `rotate(${directionRotation[currentDirection]}deg)`;
        cell.appendChild(hero);
      }
      board.appendChild(cell);
    }
  }

  levelTitle.textContent = level.title;
  levelDescription.textContent = `${level.hint} Используется фон ${level.file}.`;
  levelProgress.textContent = `Уровень ${currentLevelIndex + 1} из ${levels.length}`;
}

function resetLevelState(message = 'Ожидание запуска') {
  currentPosition = [...getCurrentLevel().start];
  currentDirection = getDirectionFromPath(getCurrentLevel().path);
  statusText.textContent = message;
  stepCounter.textContent = '0';
  renderBoard();
}

function setLevel(index) {
  currentLevelIndex = index;
  program = [];
  renderProgram();
  resetLevelState();
  nextLevelBtn.disabled = true;
}

function applyMove(position, direction) {
  const [row, col] = position;
  const [rowShift, colShift] = directionVectors[direction] ?? [0, 0];
  return [row + rowShift, col + colShift];
}

async function runProgram() {
  const sequence = getExecutionSequence();
  const level = getCurrentLevel();
  const pathSet = new Set(level.path.map(toKey));
  resetLevelState('Выполняем программу...');

  for (let index = 0; index < sequence.length; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, 360));
    const commandType = sequence[index];

    if (commandType === 'move-forward') {
      currentPosition = applyMove(currentPosition, currentDirection);
      if (!pathSet.has(toKey(currentPosition))) {
        statusText.textContent = 'Ошибка: герой вышел за маршрут.';
        renderBoard();
        return;
      }
    } else {
      currentDirection = rotateDirection(currentDirection, commandType);
    }

    stepCounter.textContent = String(index + 1);
    renderBoard();
  }

  if (toKey(currentPosition) === toKey(level.finish)) {
    statusText.textContent = 'Уровень пройден!';
    nextLevelBtn.disabled = currentLevelIndex === levels.length - 1;
  } else {
    statusText.textContent = 'Программа завершилась, но герой не дошёл до финиша.';
  }
}

function getDropCoordinates(event) {
  const rect = dropzone.getBoundingClientRect();
  return clampPosition(event.clientX - rect.left - BLOCK_WIDTH / 2, event.clientY - rect.top - BLOCK_HEIGHT / 2);
}

dropzone.addEventListener('dragover', (event) => {
  event.preventDefault();
  dropzone.classList.add('drag-over');
});
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
dropzone.addEventListener('drop', (event) => {
  event.preventDefault();
  dropzone.classList.remove('drag-over');
  if (!draggedCommand) return;
  const { x, y } = getDropCoordinates(event);
  const block = createProgramBlock(draggedCommand, x, y);
  const snapped = getSnapPosition(block);
  block.x = snapped.x;
  block.y = snapped.y;
  program.push(block);
  draggedCommand = null;
  renderProgram();
});

runBtn.addEventListener('click', runProgram);
resetBtn.addEventListener('click', () => {
  program = [];
  renderProgram();
  resetLevelState();
});
nextLevelBtn.addEventListener('click', () => {
  if (currentLevelIndex < levels.length - 1) setLevel(currentLevelIndex + 1);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) runProgram();
});

renderCommands();
renderProgram();
setLevel(0);
