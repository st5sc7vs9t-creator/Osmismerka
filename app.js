'use strict';

/* ==================== BANKA SLOV ==================== */
const WORD_BANK = {
  'Zvířata': ['PES','KOČKA','KŮŇ','KRÁVA','OVCE','KOZA','PRASE','SLEPICE','KACHNA','HUSA',
    'MYŠ','KRÁLÍK','LIŠKA','VLK','MEDVĚD','JELEN','SRNA','ZAJÍC','VEVERKA','JEŽEK',
    'KRTEK','ŽIRAFA','SLON','TYGR','LEV','OPICE','ZEBRA','VELBLOUD','DELFÍN','ŽELVA'],
  'Jídlo': ['CHLÉB','MÁSLO','MLÉKO','SÝR','VEJCE','POLÉVKA','KNEDLÍK','BRAMBORY','RÝŽE','TĚSTOVINY',
    'MASO','RYBA','SALÁT','OVOCE','ZELENINA','JABLKO','HRUŠKA','BANÁN','JAHODA','MALINA',
    'ČOKOLÁDA','KOLÁČ','DORT','ZMRZLINA','MED','CUKR','SŮL','ČAJ','KÁVA','HOUSKA'],
  'Příroda': ['LES','STROM','KVĚTINA','TRÁVA','ŘEKA','RYBNÍK','HORA','ÚDOLÍ','LOUKA','POLE',
    'KÁMEN','PÍSEK','SLUNCE','MĚSÍC','HVĚZDA','OBLAK','DÉŠŤ','SNÍH','VÍTR','DUHA',
    'LISTÍ','KOŘEN','HOUBA','JEZERO','MOŘE'],
  'Domácnost': ['STŮL','ŽIDLE','POSTEL','SKŘÍŇ','OKNO','DVEŘE','PODLAHA','STROP','LAMPA','KOBEREC',
    'ZÁVĚS','HRNEC','PÁNEV','TALÍŘ','HRNEK','LŽÍCE','VIDLIČKA','NŮŽ','RUČNÍK','POLŠTÁŘ',
    'PŘIKRÝVKA','VÁZA','HODINY','KLÍČ','ZRCADLO'],
  'Rodina': ['MATKA','OTEC','DCERA','SYN','BABIČKA','DĚDEČEK','SESTRA','BRATR','TETA','STRÝC',
    'VNUK','VNUČKA','MANŽEL','MANŽELKA','RODINA'],
  'Roční období': ['JARO','LÉTO','PODZIM','ZIMA','LEDEN','ÚNOR','BŘEZEN','DUBEN','KVĚTEN','ČERVEN',
    'ČERVENEC','SRPEN','ZÁŘÍ','ŘÍJEN','LISTOPAD','PROSINEC','MRÁZ','CHLADNO','TEPLOTA','SLUNEČNO'],
  'Barvy': ['ČERVENÁ','MODRÁ','ŽLUTÁ','ZELENÁ','ORANŽOVÁ','FIALOVÁ','RŮŽOVÁ','HNĚDÁ','ČERNÁ','BÍLÁ','ŠEDÁ','ZLATÁ'],
  'Oblečení': ['KALHOTY','SUKNĚ','TRIČKO','SVETR','BUNDA','KABÁT','ČEPICE','ŠÁLA','RUKAVICE','PONOŽKY',
    'BOTY','SANDÁLY','PYŽAMO','ŠATY','KOŠILE'],
  'Doprava': ['AUTO','AUTOBUS','VLAK','KOLO','LOĎ','LETADLO','TRAMVAJ','METRO','TAXI','MOTORKA',
    'TRAKTOR','VÝTAH','SILNICE','CHODNÍK','NÁDRAŽÍ'],
  'Povolání': ['UČITEL','LÉKAŘ','ZDRAVOTNÍK','PRODAVAČ','KUCHAŘ','ŘIDIČ','HASIČ','POLICISTA','ZEDNÍK','TESAŘ',
    'ZAHRADNÍK','ÚČETNÍ','PEKAŘ','ŠVADLENA','HOLIČ']
};

const ALL_WORDS = Object.values(WORD_BANK).flat();

const FILLER_POOL = (
  'A'.repeat(12) + 'E'.repeat(10) + 'I'.repeat(9) + 'O'.repeat(9) + 'N'.repeat(7) +
  'T'.repeat(7) + 'S'.repeat(7) + 'R'.repeat(6) + 'L'.repeat(6) + 'K'.repeat(6) +
  'D'.repeat(5) + 'M'.repeat(5) + 'P'.repeat(5) + 'U'.repeat(5) + 'V'.repeat(5) +
  'Z'.repeat(4) + 'C'.repeat(4) + 'H'.repeat(4) + 'J'.repeat(4) + 'B'.repeat(3) +
  'Y'.repeat(3) + 'G'.repeat(2) + 'F'.repeat(2) +
  'Á'.repeat(2) + 'É' + 'Í'.repeat(2) + 'Ý' + 'Ó' + 'Ú' + 'Ů' + 'Č'.repeat(2) + 'Ď' + 'Ě'.repeat(2) + 'Ň' + 'Ř'.repeat(2) + 'Š'.repeat(2) + 'Ž'.repeat(2) + 'Ť'
).split('');

function randomFiller() {
  return FILLER_POOL[Math.floor(Math.random() * FILLER_POOL.length)];
}

/* ==================== OBTÍŽNOSTI ====================
   Jednoduchý přepínač: pole `directions` určuje, jaké směry jsou
   pro danou obtížnost povolené (dx,dy). Pro nižší obtížnost stačí
   toto pole zúžit, aby se vypnuly diagonály / zpětný směr. */
const DIFFICULTY = {
  lehka:   { label: 'Lehká',   size: 10, wordCount: 8,  directions: [[1,0],[0,1]] },
  stredni: { label: 'Střední', size: 11, wordCount: 10, directions: [[1,0],[-1,0],[0,1],[0,-1]] },
  tezka:   { label: 'Těžká',   size: 12, wordCount: 12, directions: [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]] }
};

const DIR8 = [[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];

const SAVE_KEY = 'osm_save_v1';
const STATS_KEY = 'osm_stats_v1';

/* ==================== STAV APLIKACE ==================== */
const MAX_STARS = 3;

let puzzle = null;      // {difficulty, size, grid, words:[{text,cells,found}]}
let hints = 0;
let accumulatedMs = 0;   // odehraný čas z předchozích sezení (persistovaný)
let sessionStart = 0;    // kdy začalo aktuální zobrazení herní obrazovky
let timerInterval = null;
let cellEls = [];        // cellEls[r][c] -> DOM element
let selection = { active: false, startRow: 0, startCol: 0, cells: [] };

/* ==================== POMOCNÉ FUNKCE ==================== */
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function tryPlaceWord(grid, size, word, directions) {
  const letters = Array.from(word);
  const len = letters.length;
  const dirs = shuffle(directions);
  const attemptsMax = 200;
  for (let a = 0; a < attemptsMax; a++) {
    const [dx, dy] = dirs[a % dirs.length];
    let colMin = 0, colMax = size - 1, rowMin = 0, rowMax = size - 1;
    if (dx === 1) colMax = size - len;
    else if (dx === -1) colMin = len - 1;
    if (dy === 1) rowMax = size - len;
    else if (dy === -1) rowMin = len - 1;
    if (colMax < colMin || rowMax < rowMin) continue;
    const startCol = colMin + Math.floor(Math.random() * (colMax - colMin + 1));
    const startRow = rowMin + Math.floor(Math.random() * (rowMax - rowMin + 1));
    const cells = [];
    let ok = true;
    for (let i = 0; i < len; i++) {
      const r = startRow + dy * i, c = startCol + dx * i;
      const existing = grid[r][c];
      if (existing !== null && existing !== letters[i]) { ok = false; break; }
      cells.push([r, c]);
    }
    if (!ok) continue;
    cells.forEach(([r, c], i) => { grid[r][c] = letters[i]; });
    return cells;
  }
  return null;
}

function generatePuzzle(diffKey) {
  const cfg = DIFFICULTY[diffKey];
  const size = cfg.size;
  const grid = Array.from({ length: size }, () => Array(size).fill(null));
  const candidates = shuffle(ALL_WORDS.filter(w => w.length <= size && w.length >= 3));
  const placed = [];
  let idx = 0;
  while (placed.length < cfg.wordCount && idx < candidates.length) {
    const word = candidates[idx++];
    const cells = tryPlaceWord(grid, size, word, cfg.directions);
    if (cells) placed.push({ text: word, cells, found: false });
  }
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === null) grid[r][c] = randomFiller();
    }
  }
  return { difficulty: diffKey, size, grid, words: placed };
}

/* ==================== ULOŽENÍ / STATISTIKY ==================== */
function saveGame() {
  if (!puzzle) return;
  localStorage.setItem(SAVE_KEY, JSON.stringify({ puzzle, hints, accumulatedMs }));
}

function loadSavedGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function clearSavedGame() {
  localStorage.removeItem(SAVE_KEY);
}

function recordStats(entry) {
  let stats = [];
  try {
    stats = JSON.parse(localStorage.getItem(STATS_KEY)) || [];
  } catch (e) { stats = []; }
  stats.push(entry);
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

function loadStats() {
  try {
    return JSON.parse(localStorage.getItem(STATS_KEY)) || [];
  } catch (e) {
    return [];
  }
}

/* ==================== VYKRESLENÍ MŘÍŽKY ==================== */
function renderPuzzle() {
  const grid = document.getElementById('grid');
  grid.innerHTML = '';
  grid.style.gridTemplateColumns = `repeat(${puzzle.size}, 1fr)`;
  grid.style.gridTemplateRows = `repeat(${puzzle.size}, 1fr)`;
  cellEls = Array.from({ length: puzzle.size }, () => new Array(puzzle.size));

  for (let r = 0; r < puzzle.size; r++) {
    for (let c = 0; c < puzzle.size; c++) {
      const div = document.createElement('div');
      div.className = 'cell';
      div.textContent = puzzle.grid[r][c];
      div.dataset.row = r;
      div.dataset.col = c;
      grid.appendChild(div);
      cellEls[r][c] = div;
    }
  }

  puzzle.words.forEach(w => {
    if (w.found) w.cells.forEach(([r, c]) => cellEls[r][c].classList.add('found'));
  });

  layoutGrid();
  renderWordList();
  updateScoreDisplay();
}

/* ==================== ČASOMÍRA A SKÓRE ==================== */
function formatTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

function updateTimerDisplay() {
  const elapsed = accumulatedMs + (sessionStart ? Date.now() - sessionStart : 0);
  document.getElementById('game-timer').textContent = formatTime(elapsed);
}

function startTimerTick() {
  stopTimerTick();
  sessionStart = Date.now();
  updateTimerDisplay();
  timerInterval = setInterval(updateTimerDisplay, 1000);
}

function stopTimerTick() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function pauseTimer() {
  if (sessionStart) {
    accumulatedMs += Date.now() - sessionStart;
    sessionStart = 0;
  }
}

function starsEarned(hintsUsed) {
  return Math.max(0, MAX_STARS - hintsUsed);
}

function starString(count) {
  let s = '';
  for (let i = 0; i < MAX_STARS; i++) s += (i < count ? '★' : '☆');
  return s;
}

function updateScoreDisplay() {
  document.getElementById('game-stars').textContent = starString(starsEarned(hints));
}

function layoutGrid() {
  if (!puzzle) return;
  const wrap = document.getElementById('grid-wrap');
  const grid = document.getElementById('grid');
  const availW = wrap.clientWidth;
  const availH = wrap.clientHeight;
  const dim = Math.max(200, Math.min(availW, availH));
  grid.style.width = dim + 'px';
  grid.style.height = dim + 'px';
  const cellPx = dim / puzzle.size;
  grid.style.setProperty('--cell-font', (cellPx * 0.5) + 'px');
}

function renderWordList() {
  const list = document.getElementById('word-list');
  list.innerHTML = '';
  puzzle.words.forEach(w => {
    const li = document.createElement('li');
    li.textContent = w.text;
    if (w.found) li.classList.add('found');
    list.appendChild(li);
  });
}

/* ==================== VÝBĚR TAŽENÍM ==================== */
function clearSelectionHighlight() {
  selection.cells.forEach(([r, c]) => {
    const el = cellEls[r] && cellEls[r][c];
    if (el) el.classList.remove('selecting');
  });
}

function clampLength(startRow, startCol, sdx, sdy, length, size) {
  while (length > 0) {
    const r = startRow + sdy * length;
    const c = startCol + sdx * length;
    if (r < 0 || r >= size || c < 0 || c >= size) length--;
    else break;
  }
  return length;
}

function updateSelectionTo(row, col) {
  const dx = col - selection.startCol;
  const dy = row - selection.startRow;
  let path;
  if (dx === 0 && dy === 0) {
    path = [[selection.startRow, selection.startCol]];
  } else {
    const angle = Math.atan2(dy, dx);
    let dirIndex = Math.round(angle / (Math.PI / 4)) % 8;
    if (dirIndex < 0) dirIndex += 8;
    const [sdx, sdy] = DIR8[dirIndex];
    let length = Math.max(Math.abs(dx), Math.abs(dy));
    length = clampLength(selection.startRow, selection.startCol, sdx, sdy, length, puzzle.size);
    path = [];
    for (let i = 0; i <= length; i++) {
      path.push([selection.startRow + sdy * i, selection.startCol + sdx * i]);
    }
  }
  clearSelectionHighlight();
  selection.cells = path;
  path.forEach(([r, c]) => cellEls[r][c].classList.add('selecting'));
}

function cellAtPoint(clientX, clientY) {
  const el = document.elementFromPoint(clientX, clientY);
  if (!el) return null;
  const cellEl = el.closest ? el.closest('.cell') : null;
  if (!cellEl) return null;
  return { row: +cellEl.dataset.row, col: +cellEl.dataset.col };
}

function onPointerDown(e) {
  if (!puzzle) return;
  const cellEl = e.target.closest && e.target.closest('.cell');
  if (!cellEl) return;
  e.preventDefault();
  selection.active = true;
  selection.startRow = +cellEl.dataset.row;
  selection.startCol = +cellEl.dataset.col;
  updateSelectionTo(selection.startRow, selection.startCol);
}

function onPointerMove(e) {
  if (!selection.active) return;
  e.preventDefault();
  const pos = cellAtPoint(e.clientX, e.clientY);
  if (!pos) return;
  updateSelectionTo(pos.row, pos.col);
}

function onPointerUp(e) {
  if (!selection.active) return;
  selection.active = false;
  const path = selection.cells;
  clearSelectionHighlight();
  selection.cells = [];

  if (path.length >= 2) {
    const letters = path.map(([r, c]) => puzzle.grid[r][c]).join('');
    const reversed = letters.split('').reverse().join('');
    const match = puzzle.words.find(w => !w.found && (w.text === letters || w.text === reversed));
    if (match) {
      match.found = true;
      match.cells.forEach(([r, c]) => cellEls[r][c].classList.add('found'));
      renderWordList();
      updateScoreDisplay();
      saveGame();
      if (puzzle.words.every(w => w.found)) {
        completePuzzle();
      }
    }
  }
}

/* ==================== NÁPOVĚDA ==================== */
function useHint() {
  if (!puzzle) return;
  const unfound = puzzle.words.filter(w => !w.found);
  if (unfound.length === 0) return;
  const word = unfound[Math.floor(Math.random() * unfound.length)];
  const [r, c] = word.cells[0];
  const el = cellEls[r][c];
  el.classList.add('hint-flash');
  setTimeout(() => el.classList.remove('hint-flash'), 2000);
  hints++;
  updateScoreDisplay();
  saveGame();
}

/* ==================== DOKONČENÍ HRY ==================== */
function completePuzzle() {
  pauseTimer();
  stopTimerTick();
  const durationSec = Math.max(1, Math.round(accumulatedMs / 1000));
  recordStats({
    date: new Date().toISOString(),
    difficulty: puzzle.difficulty,
    hints,
    durationSec,
    stars: starsEarned(hints)
  });
  clearSavedGame();
  document.getElementById('win-overlay').hidden = false;
}

/* ==================== NAVIGACE MEZI OBRAZOVKAMI ==================== */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function startNewGame(diffKey) {
  puzzle = generatePuzzle(diffKey);
  hints = 0;
  accumulatedMs = 0;
  document.getElementById('win-overlay').hidden = true;
  saveGame();
  showScreen('screen-game');
  renderPuzzle();
  startTimerTick();
}

function continueGame() {
  const saved = loadSavedGame();
  if (!saved) return;
  puzzle = saved.puzzle;
  hints = saved.hints || 0;
  accumulatedMs = saved.accumulatedMs || 0;
  document.getElementById('win-overlay').hidden = true;
  showScreen('screen-game');
  renderPuzzle();
  startTimerTick();
}

function updateContinueButton() {
  const saved = loadSavedGame();
  const btn = document.getElementById('btn-continue');
  btn.hidden = !saved;
}

function renderStats() {
  const stats = loadStats();
  const counts = { lehka: 0, stredni: 0, tezka: 0 };
  stats.forEach(s => { if (counts[s.difficulty] !== undefined) counts[s.difficulty]++; });

  document.getElementById('stat-total').textContent = stats.length;
  document.getElementById('stat-lehka').textContent = counts.lehka;
  document.getElementById('stat-stredni').textContent = counts.stredni;
  document.getElementById('stat-tezka').textContent = counts.tezka;

  const list = document.getElementById('stats-history');
  list.innerHTML = '';
  const last10 = stats.slice(-10).reverse();
  last10.forEach(s => {
    const li = document.createElement('li');
    const d = new Date(s.date);
    const dateStr = d.toLocaleDateString('cs-CZ') + ' ' + d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
    const label = DIFFICULTY[s.difficulty] ? DIFFICULTY[s.difficulty].label : s.difficulty;
    const stars = typeof s.stars === 'number' ? s.stars : starsEarned(s.hints);
    li.innerHTML = `<span>${dateStr} — ${label}</span><span>${starString(stars)} · Nápovědy: ${s.hints}</span>`;
    list.appendChild(li);
  });
  if (last10.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'Zatím žádné dokončené osmisměrky.';
    list.appendChild(li);
  }
}

/* ==================== INICIALIZACE ==================== */
function init() {
  document.querySelectorAll('.btn-difficulty').forEach(btn => {
    btn.addEventListener('click', () => startNewGame(btn.dataset.difficulty));
  });

  document.getElementById('btn-continue').addEventListener('click', continueGame);
  document.getElementById('btn-stats').addEventListener('click', () => {
    renderStats();
    showScreen('screen-stats');
  });
  document.getElementById('btn-stats-back').addEventListener('click', () => {
    updateContinueButton();
    showScreen('screen-start');
  });

  document.getElementById('btn-menu').addEventListener('click', () => {
    pauseTimer();
    stopTimerTick();
    saveGame();
    updateContinueButton();
    showScreen('screen-start');
  });
  document.getElementById('btn-new-game').addEventListener('click', () => {
    if (puzzle) startNewGame(puzzle.difficulty);
  });
  document.getElementById('btn-hint').addEventListener('click', useHint);

  document.getElementById('btn-next-puzzle').addEventListener('click', () => {
    if (puzzle) startNewGame(puzzle.difficulty);
  });
  document.getElementById('btn-win-menu').addEventListener('click', () => {
    document.getElementById('win-overlay').hidden = true;
    updateContinueButton();
    showScreen('screen-start');
  });

  const grid = document.getElementById('grid');
  grid.addEventListener('pointerdown', onPointerDown);
  document.addEventListener('pointermove', onPointerMove);
  document.addEventListener('pointerup', onPointerUp);
  document.addEventListener('pointercancel', onPointerUp);

  window.addEventListener('resize', () => { if (puzzle) layoutGrid(); });
  window.addEventListener('orientationchange', () => { if (puzzle) setTimeout(layoutGrid, 200); });

  updateContinueButton();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

document.addEventListener('DOMContentLoaded', init);
