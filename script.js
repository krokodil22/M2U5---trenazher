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
  { title: 'Уровень 4', file: 'back.svg', size: 8, start: [7, 0], finish: [3, 3], path: [[7,0],[6,0],[6,1],[5,1],[4,1],[4,2],[3,2],[3,3]], hint: 'Поднимись по короткой лесенке к финишу.' },
  { title: 'Уровень 5', file: 'back.svg', size: 11, start: [5, 0], finish: [5, 9], path: [[5,0],[5,1],[5,2],[5,3],[5,4],[5,5],[5,6],[5,7],[5,8],[5,9]], hint: 'Очень длинная прямая дорожка.' },
  { title: 'Уровень 6', file: 'back.svg', size: 10, start: [2, 0], finish: [6, 5], path: [[2,0],[2,1],[2,2],[2,3],[2,4],[2,5],[3,5],[4,5],[5,5],[6,5]], hint: 'Сначала вправо, потом вниз по колонке.' },
  { title: 'Уровень 7', file: 'back.svg', size: 9, start: [6, 2], finish: [6, 5], path: [[6,2],[5,2],[4,2],[3,2],[3,3],[3,4],[3,5],[4,5],[5,5],[6,5]], hint: 'Поднимись к перекладине и спустись к финишу.' },
  { title: 'Уровень 8', file: 'back.svg', size: 9, start: [1, 2], finish: [6, 7], path: [[1,2],[1,3],[2,3],[2,4],[3,4],[3,5],[4,5],[4,6],[5,6],[5,7],[6,7]], hint: 'Иди лесенкой по диагонали вниз.' },
  { title: 'Уровень 9', file: 'back.svg', size: 11, start: [2, 0], finish: [2, 8], path: [[2,0],[3,0],[3,1],[4,1],[4,2],[5,2],[5,3],[6,3],[6,4],[6,5],[5,5],[5,6],[4,6],[4,7],[3,7],[3,8],[2,8]], hint: 'Спустись в центр по ступенькам и поднимись обратно.' },
  { title: 'Уровень 10', file: 'back.svg', size: 11, start: [2, 0], finish: [2, 8], path: [[2,0],[3,0],[4,0],[5,0],[5,1],[5,2],[4,2],[3,2],[2,2],[2,3],[2,4],[3,4],[4,4],[5,4],[5,5],[5,6],[4,6],[3,6],[2,6],[2,7],[2,8]], hint: 'Финальный маршрут через три фигуры подряд.' },
].map((level) => ({ ...level, size: level.size ?? (Math.max(...level.path.flat()) + 1) }));

const commandLabels = {
  'move-forward': 'Шаг вперед',
  'turn-left': 'Повернуть налево',
  'turn-right': 'Повернуть направо',
};

const board = document.getElementById('board');
const levelTitle = document.getElementById('level-title');
const levelProgress = document.getElementById('level-progress');
const runButton = document.getElementById('run-program');
const resetProgramButton = document.getElementById('reset-program');
const levelSelect = document.getElementById('level-select');
const levelCompleteModal = document.getElementById('level-complete-modal');
const levelCompleteMessage = document.getElementById('level-complete-message');
const nextLevelButton = document.getElementById('next-level-button');
const programRoot = document.getElementById('program-root');
const builderToolbar = document.querySelector('.builder-toolbar');
const repeatButton = document.querySelector('[data-action="add-repeat"]');

let currentLevelIndex = 0;
let currentPosition = null;
let currentDirection = 'right';
let highestUnlockedLevel = 0;
let isProgramRunning = false;
let nextNodeId = 1;
const progressStorageKey = 'maze-highest-unlocked-level';
const programState = { root: [] };

function createCommandNode(command) {
  return { id: nextNodeId += 1, type: 'command', command };
}

function createRepeatNode(times = 2) {
  return { id: nextNodeId += 1, type: 'repeat', times, children: [] };
}

function getListById(listId, list = programState.root) {
  if (listId === 'root') return programState.root;

  for (const node of list) {
    if (node.type === 'repeat') {
      if (String(node.id) === String(listId)) return node.children;
      const nestedList = getListById(listId, node.children);
      if (nestedList) return nestedList;
    }
  }

  return null;
}

function removeNodeById(nodeId, list = programState.root) {
  const index = list.findIndex((node) => String(node.id) === String(nodeId));
  if (index >= 0) {
    list.splice(index, 1);
    return true;
  }

  for (const node of list) {
    if (node.type === 'repeat' && removeNodeById(nodeId, node.children)) {
      return true;
    }
  }

  return false;
}

function renderProgramList(container, list, nestingLevel = 0) {
  container.innerHTML = '';

  if (list.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'program-empty';
    empty.textContent = nestingLevel === 0 ? 'Добавьте команды сверху, чтобы собрать программу.' : 'Вложите сюда команды цикла.';
    container.appendChild(empty);
    return;
  }

  list.forEach((node, index) => {
    const item = document.createElement('div');
    item.className = 'program-node';
    item.dataset.nodeId = node.id;

    const badge = document.createElement('span');
    badge.className = 'program-node-index';
    badge.textContent = `${index + 1}`;
    item.appendChild(badge);

    const content = document.createElement('div');
    content.className = 'program-node-body';

    if (node.type === 'command') {
      const label = document.createElement('div');
      label.className = 'program-command';
      label.textContent = commandLabels[node.command] ?? node.command;
      content.appendChild(label);
    } else {
      const repeatHeader = document.createElement('div');
      repeatHeader.className = 'program-repeat-header';
      repeatHeader.innerHTML = `Повторить <input class="repeat-times" type="number" min="1" step="1" value="${node.times}" aria-label="Количество повторений"> раз`;
      content.appendChild(repeatHeader);

      const nested = document.createElement('div');
      nested.className = 'program-list nested';
      nested.dataset.listId = node.id;
      renderProgramList(nested, node.children, nestingLevel + 1);
      content.appendChild(nested);

      const nestedActions = document.createElement('div');
      nestedActions.className = 'nested-actions';
      nestedActions.innerHTML = `
        <button class="mini-tool-button" type="button" data-action="add-command" data-list-id="${node.id}" data-command="move-forward">+ шаг</button>
        <button class="mini-tool-button" type="button" data-action="add-command" data-list-id="${node.id}" data-command="turn-left">+ налево</button>
        <button class="mini-tool-button" type="button" data-action="add-command" data-list-id="${node.id}" data-command="turn-right">+ направо</button>
      `;
      content.appendChild(nestedActions);
    }

    const controls = document.createElement('div');
    controls.className = 'program-node-controls';
    controls.innerHTML = `<button class="icon-button danger" type="button" data-action="remove-node" data-node-id="${node.id}" aria-label="Удалить">✕</button>`;

    item.appendChild(content);
    item.appendChild(controls);
    container.appendChild(item);
  });
}

function renderProgram() {
  renderProgramList(programRoot, programState.root);
}

function resetProgram() {
  programState.root.length = 0;
  renderProgram();
}

function addNode(action, command, listId = 'root') {
  const list = getListById(listId);
  if (!list) return;

  if (action === 'add-command' && command) {
    list.push(createCommandNode(command));
  }

  if (action === 'add-repeat') {
    list.push(createRepeatNode());
  }

  renderProgram();
}

function toKey([row, col]) {
  return `${row},${col}`;
}

function getCurrentLevel() {
  return levels[currentLevelIndex];
}

function saveProgress() {
  try {
    window.localStorage.setItem(progressStorageKey, String(highestUnlockedLevel));
  } catch (error) {
    console.warn('Не удалось сохранить прогресс уровней.', error);
  }
}

function loadProgress() {
  try {
    const storedValue = window.localStorage.getItem(progressStorageKey);
    const parsedValue = Number.parseInt(storedValue ?? '', 10);

    if (Number.isNaN(parsedValue)) {
      highestUnlockedLevel = 0;
      return;
    }

    highestUnlockedLevel = Math.min(Math.max(parsedValue, 0), levels.length - 1);
  } catch (error) {
    highestUnlockedLevel = 0;
    console.warn('Не удалось загрузить сохраненный прогресс уровней.', error);
  }
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

function updateBuilderAvailability() {
  if (!repeatButton) return;
  const isRepeatAvailable = currentLevelIndex >= 4;
  repeatButton.disabled = !isRepeatAvailable;
  repeatButton.title = isRepeatAvailable ? '' : 'Циклы открываются с 5 уровня';
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
  updateBuilderAvailability();
  resetProgram();
  resetLevelState();
}

function applyMove(position, direction) {
  const [row, col] = position;
  const [rowShift, colShift] = directionVectors[direction] ?? [0, 0];
  return [row + rowShift, col + colShift];
}

function flattenProgram(list = programState.root, commands = []) {
  list.forEach((node) => {
    if (node.type === 'command') {
      commands.push(node.command);
      return;
    }

    if (node.type === 'repeat') {
      for (let index = 0; index < node.times; index += 1) {
        flattenProgram(node.children, commands);
      }
    }
  });

  return commands;
}

function getExecutionSequence() {
  return flattenProgram(programState.root, []);
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
  saveProgress();
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

builderToolbar?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  addNode(button.dataset.action, button.dataset.command, button.dataset.listId);
});

programRoot?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;

  if (button.dataset.action === 'remove-node') {
    removeNodeById(button.dataset.nodeId);
    renderProgram();
    return;
  }

  addNode(button.dataset.action, button.dataset.command, button.dataset.listId);
});

programRoot?.addEventListener('change', (event) => {
  const input = event.target.closest('.repeat-times');
  if (!input) return;

  const parentNode = input.closest('.program-node');
  if (!parentNode) return;

  const listQueue = [programState.root];
  while (listQueue.length) {
    const list = listQueue.shift();
    for (const node of list) {
      if (String(node.id) === parentNode.dataset.nodeId && node.type === 'repeat') {
        node.times = Math.max(1, Number.parseInt(input.value, 10) || 1);
        input.value = String(node.times);
        return;
      }
      if (node.type === 'repeat') listQueue.push(node.children);
    }
  }
});

runButton?.addEventListener('click', () => {
  runProgram();
});

resetProgramButton?.addEventListener('click', () => {
  resetProgram();
  resetLevelState();
});

levelSelect?.addEventListener('change', (event) => {
  setLevel(Number(event.target.value));
});

nextLevelButton?.addEventListener('click', () => {
  const nextLevelIndex = Math.min(currentLevelIndex + 1, highestUnlockedLevel);
  if (nextLevelIndex !== currentLevelIndex) {
    setLevel(nextLevelIndex);
    return;
  }
  hideLevelCompleteModal();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') hideLevelCompleteModal();
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) runProgram();
});

loadProgress();
renderProgram();
renderLevelOptions();
updateBuilderAvailability();
setLevel(0);
