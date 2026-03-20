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
const runBtn = document.getElementById('run-btn');
const resetBtn = document.getElementById('reset-btn');
const nextLevelBtn = document.getElementById('next-level-btn');
const stepCounter = document.getElementById('step-counter');
const statusText = document.getElementById('status-text');
const levelTitle = document.getElementById('level-title');
const levelDescription = document.getElementById('level-description');
const levelProgress = document.getElementById('level-progress');
const workspaceContainer = document.getElementById('blockly-workspace');
const toolbox = document.getElementById('blockly-toolbox');

let workspace;
let currentLevelIndex = 0;
let currentPosition = null;
let currentDirection = 'right';

Blockly.common.defineBlocksWithJsonArray([
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
  workspace = Blockly.inject(workspaceContainer, {
    toolbox,
    trashcan: true,
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
    theme: Blockly.Themes.Zelos,
  });

  resetWorkspace();
  window.addEventListener('resize', () => Blockly.svgResize(workspace));
}

function resetWorkspace() {
  workspace.clear();
  const startBlock = workspace.newBlock('maze_start');
  startBlock.initSvg();
  startBlock.render();
  startBlock.moveBy(36, 36);
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
  resetWorkspace();
  resetLevelState();
  nextLevelBtn.disabled = true;
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

async function runProgram() {
  const sequence = getExecutionSequence();
  if (sequence.length === 0) {
    resetLevelState('Добавь команды внутрь стартового блока Blockly.');
    return;
  }

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

runBtn.addEventListener('click', runProgram);
resetBtn.addEventListener('click', () => {
  resetWorkspace();
  resetLevelState();
});
nextLevelBtn.addEventListener('click', () => {
  if (currentLevelIndex < levels.length - 1) setLevel(currentLevelIndex + 1);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) runProgram();
});

initializeBlockly();
setLevel(0);
