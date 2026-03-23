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
  { title: 'Уровень 1', file: 'back.svg', size: 9, start: [4, 1], finish: [4, 7], path: [[4,1],[4,2],[4,3],[4,4],[4,5],[4,6],[4,7]], hint: 'Прямая дорожка до финиша.' },
  { title: 'Уровень 2', file: 'back.svg', size: 8, start: [1, 3], finish: [5, 6], path: [[1,3],[2,3],[3,3],[4,3],[5,3],[5,4],[5,5],[5,6]], hint: 'Спустись вниз и затем поверни направо.' },
  { title: 'Уровень 3', file: 'back.svg', size: 9, start: [2, 1], finish: [5, 7], path: [[2,1],[2,2],[2,3],[2,4],[3,4],[4,4],[5,4],[5,5],[5,6],[5,7]], hint: 'Сделай поворот вниз, а потом двигайся вправо.' },
  { title: 'Уровень 4', file: 'back.svg', size: 10, start: [7, 1], finish: [5, 7], path: [[7,1],[6,1],[6,2],[5,2],[4,2],[4,3],[3,3],[3,4],[3,5],[4,5],[5,5],[5,6],[5,7]], hint: 'Поднимайся змейкой по арке к финишу.' },
  { title: 'Уровень 5', file: 'back.svg', size: 11, start: [5, 0], finish: [5, 9], path: [[5,0],[5,1],[5,2],[5,3],[5,4],[5,5],[5,6],[5,7],[5,8],[5,9]], hint: 'Очень длинная прямая дорожка.' },
  { title: 'Уровень 6', file: 'back.svg', size: 10, start: [2, 0], finish: [6, 5], path: [[2,0],[2,1],[2,2],[2,3],[2,4],[2,5],[3,5],[4,5],[5,5],[6,5]], hint: 'Сначала вправо, потом вниз по колонке.' },
  { title: 'Уровень 7', file: 'back.svg', size: 9, start: [6, 2], finish: [6, 6], path: [[6,2],[5,2],[4,2],[3,2],[3,3],[3,4],[3,5],[3,6],[4,6],[5,6],[6,6]], hint: 'Поднимись к перекладине и спустись к финишу.' },
  { title: 'Уровень 8', file: 'back.svg', size: 9, start: [1, 2], finish: [6, 7], path: [[1,2],[1,3],[2,3],[2,4],[3,4],[3,5],[4,5],[4,6],[5,6],[5,7],[6,7]], hint: 'Иди лесенкой по диагонали вниз.' },
  { title: 'Уровень 9', file: 'back.svg', size: 11, start: [2, 0], finish: [2, 10], path: [[2,0],[3,0],[3,1],[4,1],[4,2],[5,2],[5,3],[6,3],[6,4],[6,5],[6,6],[5,6],[5,7],[4,7],[4,8],[3,8],[3,9],[2,9],[2,10]], hint: 'Спустись в центр по ступенькам и поднимись обратно.' },
  { title: 'Уровень 10', file: 'back.svg', size: 11, start: [2, 0], finish: [2, 10], path: [[2,0],[3,0],[4,0],[5,0],[5,1],[5,2],[4,2],[3,2],[2,2],[2,3],[2,4],[3,4],[4,4],[5,4],[5,5],[5,6],[5,7],[4,7],[3,7],[2,7],[2,8],[2,9],[2,10]], hint: 'Финальный маршрут через три фигуры подряд.' },
].map((level) => ({ ...level, size: level.size ?? (Math.max(...level.path.flat()) + 1) }));

const board = document.getElementById('board');
const levelTitle = document.getElementById('level-title');
const levelProgress = document.getElementById('level-progress');
const workspaceContainer = document.getElementById('blockly-workspace');
const runButton = document.getElementById('run-program');
const levelSelect = document.getElementById('level-select');
const levelCompleteModal = document.getElementById('level-complete-modal');
const levelCompleteMessage = document.getElementById('level-complete-message');
const nextLevelButton = document.getElementById('next-level-button');

const toolbox = {
  kind: 'flyoutToolbox',
  contents: [
    {
      kind: 'block',
      type: 'maze_move_forward',
    },
    {
      kind: 'block',
      type: 'maze_turn_left',
    },
    {
      kind: 'block',
      type: 'maze_turn_right',
    },
    {
      kind: 'block',
      type: 'maze_repeat',
      fields: {
        TIMES: 2,
      },
    },
  ],
};

let workspace;
let currentLevelIndex = 0;
let currentPosition = null;
let currentDirection = 'right';
let highestUnlockedLevel = 0;
let isProgramRunning = false;

const defineBlocksWithJsonArray = Blockly.common?.defineBlocksWithJsonArray
  ?? Blockly.defineBlocksWithJsonArray;

defineBlocksWithJsonArray([
  {
    type: 'maze_start',
    message0: 'Запуск',
    nextStatement: null,
    colour: 45,
    deletable: false,
    movable: false,
    hat: 'cap',
    tooltip: 'Точка входа в программу',
  },
  {
    type: 'maze_move_forward',
    message0: 'шаг вперед',
    previousStatement: null,
    nextStatement: null,
    colour: 340,
  },
  {
    type: 'maze_turn_left',
    message0: 'повернуть налево',
    previousStatement: null,
    nextStatement: null,
    colour: 340,
  },
  {
    type: 'maze_turn_right',
    message0: 'повернуть направо',
    previousStatement: null,
    nextStatement: null,
    colour: 340,
  },
  {
    type: 'maze_repeat',
    message0: 'повторить %1 раз %2 %3',
    args0: [
      {
        type: 'field_number',
        name: 'TIMES',
        value: 2,
        min: 1,
        precision: 1,
      },
      { type: 'input_dummy' },
      { type: 'input_statement', name: 'DO' },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: 200,
  },
]);

function initializeBlockly() {
  if (!Blockly || !workspaceContainer) {
    console.error('Blockly не инициализирован: проверь загрузку библиотеки и контейнер workspace.');
    return;
  }

  workspace = Blockly.inject(workspaceContainer, {
    toolbox,
    toolboxPosition: 'start',
    horizontalLayout: false,
    trashcan: true,
    renderer: 'zelos',
    grid: {
      spacing: 24,
      length: 3,
      colour: 'rgba(124, 140, 255, 0.18)',
      snap: true,
    },
    zoom: {
      controls: true,
      wheel: true,
      startScale: 0.95,
      maxScale: 1.4,
      minScale: 0.7,
      scaleSpeed: 1.1,
    },
    move: {
      scrollbars: true,
      drag: true,
      wheel: true,
    },
  });

  resetWorkspace();
  requestAnimationFrame(() => {
    Blockly.svgResize(workspace);
    workspace.scrollCenter();
  });
  window.addEventListener('resize', () => Blockly.svgResize(workspace));
}

function resetWorkspace() {
  workspace.clear();
  const startBlock = workspace.newBlock('maze_start');
  startBlock.initSvg();
  startBlock.render();
  startBlock.moveBy(36, 36);
  startBlock.select();
  workspace.centerOnBlock(startBlock.id);
  Blockly.svgResize(workspace);
}

function toKey([row, col]) {
  return `${row},${col}`;
}

function getCurrentLevel() {
  return levels[currentLevelIndex];
}

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

function renderLevelOptions() {
  if (!levelSelect) return;

  levelSelect.innerHTML = levels.map((level, index) => {
    const isLocked = index > highestUnlockedLevel;
    const selected = index === currentLevelIndex ? 'selected' : '';
    const disabled = isLocked ? 'disabled' : '';
    const suffix = isLocked ? ' 🔒' : '';
    return `<option value="${index}" ${selected} ${disabled}>${level.title}${suffix}</option>`;
  }).join('');
}

function renderBoard() {
  const level = getCurrentLevel();
  const pathSet = new Set(level.path.map(toKey));
  board.style.gridTemplateColumns = `repeat(${level.size}, minmax(0, 1fr))`;
  board.style.gridTemplateRows = `repeat(${level.size}, minmax(0, 1fr))`;
  board.innerHTML = '';

  const boardBackground = document.createElement('div');
  boardBackground.className = 'board-background';
  boardBackground.style.backgroundImage = `linear-gradient(rgba(5,8,23,.52), rgba(5,8,23,.82)), url('./${level.file}')`;
  board.appendChild(boardBackground);

  for (let row = 0; row < level.size; row += 1) {
    for (let col = 0; col < level.size; col += 1) {
      const cell = document.createElement('div');
      const key = `${row},${col}`;
      cell.className = 'cell';

      if (pathSet.has(key)) {
        cell.classList.add('path');
      } else {
        cell.classList.add('empty');
        cell.setAttribute('aria-hidden', 'true');
      }

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
  levelProgress.textContent = `Открыто уровней: ${highestUnlockedLevel + 1} из ${levels.length}`;
  renderLevelOptions();
}

function resetLevelState() {
  currentPosition = [...getCurrentLevel().start];
  currentDirection = getDirectionFromPath(getCurrentLevel().path);
  renderBoard();
}

function setLevel(index) {
  if (index < 0 || index > highestUnlockedLevel || index >= levels.length) return;
  currentLevelIndex = index;
  hideLevelCompleteModal();
  resetWorkspace();
  resetLevelState();
}

function applyMove(position, direction) {
  const [row, col] = position;
  const [rowShift, colShift] = directionVectors[direction] ?? [0, 0];
  return [row + rowShift, col + colShift];
}

function flattenProgram(block, commands = []) {
  let currentBlock = block;

  while (currentBlock) {
    switch (currentBlock.type) {
      case 'maze_move_forward':
        commands.push('move-forward');
        break;
      case 'maze_turn_left':
        commands.push('turn-left');
        break;
      case 'maze_turn_right':
        commands.push('turn-right');
        break;
      case 'maze_repeat': {
        const times = Number(currentBlock.getFieldValue('TIMES')) || 0;
        const nested = flattenProgram(currentBlock.getInputTargetBlock('DO'), []);
        for (let index = 0; index < times; index += 1) {
          commands.push(...nested);
        }
        break;
      }
      default:
        break;
    }

    currentBlock = currentBlock.getNextBlock();
  }

  return commands;
}

function getExecutionSequence() {
  const startBlock = workspace.getBlocksByType('maze_start', false)[0];
  if (!startBlock) return [];
  const firstBlock = startBlock.getNextBlock();
  return flattenProgram(firstBlock, []);
}

function showLevelCompleteModal(levelNumber) {
  if (!levelCompleteModal || !levelCompleteMessage) return;
  levelCompleteMessage.textContent = `Ты прошел ${levelNumber} уровень!`;
  const hasNextLevel = currentLevelIndex < levels.length - 1;
  if (nextLevelButton) {
    nextLevelButton.hidden = !hasNextLevel;
    nextLevelButton.disabled = !hasNextLevel;
  }
  levelCompleteModal.classList.remove('hidden');
}

function hideLevelCompleteModal() {
  levelCompleteModal?.classList.add('hidden');
}

function handleLevelCompleted() {
  highestUnlockedLevel = Math.max(highestUnlockedLevel, Math.min(currentLevelIndex + 1, levels.length - 1));
  renderLevelOptions();
  showLevelCompleteModal(currentLevelIndex + 1);
}

async function runProgram() {
  if (isProgramRunning) return;

  const sequence = getExecutionSequence();
  if (sequence.length === 0) {
    resetLevelState();
    return;
  }

  const level = getCurrentLevel();
  const pathSet = new Set(level.path.map(toKey));
  resetLevelState();
  isProgramRunning = true;
  runButton.disabled = true;

  try {
    for (let index = 0; index < sequence.length; index += 1) {
      await new Promise((resolve) => setTimeout(resolve, 360));
      const commandType = sequence[index];

      if (commandType === 'move-forward') {
        currentPosition = applyMove(currentPosition, currentDirection);
        if (!pathSet.has(toKey(currentPosition))) {
          renderBoard();
          return;
        }
      } else {
        currentDirection = rotateDirection(currentDirection, commandType);
      }

      renderBoard();
    }

    if (toKey(currentPosition) === toKey(level.finish)) {
      handleLevelCompleted();
    }
  } finally {
    isProgramRunning = false;
    runButton.disabled = false;
  }
}

if (runButton) {
  runButton.addEventListener('click', () => {
    runProgram();
  });
}

if (levelSelect) {
  levelSelect.addEventListener('change', (event) => {
    setLevel(Number(event.target.value));
  });
}

if (nextLevelButton) {
  nextLevelButton.addEventListener('click', () => {
    const nextLevelIndex = Math.min(currentLevelIndex + 1, highestUnlockedLevel);
    if (nextLevelIndex !== currentLevelIndex) {
      setLevel(nextLevelIndex);
      return;
    }
    hideLevelCompleteModal();
  });
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') hideLevelCompleteModal();
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) runProgram();
});

initializeBlockly();
renderLevelOptions();
setLevel(0);
