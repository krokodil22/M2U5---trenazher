const commands = [
  { type: 'turn-left', label: 'Поворот налево', icon: '↺' },
  { type: 'turn-right', label: 'Поворот направо', icon: '↻' },
  { type: 'move-forward', label: 'Шаг вперед', icon: '↑' },
];

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
let draggedProgramIndex = null;
let currentLevelIndex = 0;
let currentPosition = null;
let currentDirection = 'right';
let solvedLevels = new Set();

function renderCommands() {
  commandList.innerHTML = '';
  commands.forEach((command) => {
    const node = commandTemplate.content.firstElementChild.cloneNode(true);
    node.dataset.command = command.type;
    node.querySelector('.command-icon').textContent = command.icon;
    node.querySelector('.command-text').textContent = command.label;
    node.addEventListener('dragstart', () => {
      draggedCommand = command.type;
      draggedProgramIndex = null;
    });
    commandList.appendChild(node);
  });
}

function renderProgram() {
  dropzone.innerHTML = '';
  program.forEach((type, index) => {
    const command = commands.find((item) => item.type === type);
    const node = programTemplate.content.firstElementChild.cloneNode(true);
    node.dataset.index = index;
    node.querySelector('.program-text').textContent = `${command.icon} ${command.label}`;
    node.querySelector('.delete-block').addEventListener('click', () => {
      program.splice(index, 1);
      renderProgram();
    });
    node.addEventListener('dragstart', () => {
      draggedProgramIndex = index;
      draggedCommand = null;
      node.classList.add('dragging');
    });
    node.addEventListener('dragend', () => node.classList.remove('dragging'));
    node.addEventListener('dragover', (event) => event.preventDefault());
    node.addEventListener('drop', (event) => {
      event.preventDefault();
      if (draggedProgramIndex === null || draggedProgramIndex === index) return;
      const [moved] = program.splice(draggedProgramIndex, 1);
      program.splice(index, 0, moved);
      renderProgram();
    });
    dropzone.appendChild(node);
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
  const level = getCurrentLevel();
  const pathSet = new Set(level.path.map(toKey));
  resetLevelState('Выполняем программу...');

  for (let index = 0; index < program.length; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, 360));
    const commandType = program[index];

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
    solvedLevels.add(currentLevelIndex);
    nextLevelBtn.disabled = currentLevelIndex === levels.length - 1;
  } else {
    statusText.textContent = 'Программа завершилась, но герой не дошёл до финиша.';
  }
}

dropzone.addEventListener('dragover', (event) => {
  event.preventDefault();
  dropzone.classList.add('drag-over');
});
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
dropzone.addEventListener('drop', (event) => {
  event.preventDefault();
  dropzone.classList.remove('drag-over');
  if (draggedCommand) {
    program.push(draggedCommand);
  } else if (draggedProgramIndex !== null) {
    const [moved] = program.splice(draggedProgramIndex, 1);
    program.push(moved);
  }
  draggedCommand = null;
  draggedProgramIndex = null;
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
setLevel(0);
