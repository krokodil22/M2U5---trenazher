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
    message0: 'когда 🚩 нажат %1 %2',
    args0: [
      { type: 'input_dummy' },
      { type: 'input_statement', name: 'DO' },
    ],
    colour: 45,
    deletable: false,
    movable: false,
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
  const firstBlock = startBlock.getInputTargetBlock('DO');
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
