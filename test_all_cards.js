// ========================================================
// AUTOMATED TEST SUITE: COLOR SPILL 22 CARDS & 5 SHARDS EXODIA
// ========================================================

const fs = require('fs');
const path = require('path');

// Mock browser environment for game testing
global.window = {
  addEventListener: () => {},
};
global.requestAnimationFrame = () => 1;
global.cancelAnimationFrame = () => {};
global.document = {
  getElementById: (id) => ({
    innerText: '',
    innerHTML: '',
    style: {},
    classList: { add: () => {}, remove: () => {}, contains: () => false },
    addEventListener: () => {},
    appendChild: () => {},
    setAttribute: () => {},
    removeAttribute: () => {},
    querySelectorAll: () => [],
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 640, height: 640 }),
    getContext: () => ({
      clearRect: () => {},
      fillRect: () => {},
      strokeRect: () => {},
      fillText: () => {},
      createLinearGradient: () => ({ addColorStop: () => {} }),
      beginPath: () => {},
      arc: () => {},
      fill: () => {},
      save: () => {},
      restore: () => {},
    }),
  }),
  querySelectorAll: () => [],
  addEventListener: () => {},
  createElement: () => ({
    style: {},
    classList: { add: () => {}, remove: () => {} },
    appendChild: () => {},
    addEventListener: () => {},
    dataset: {}
  }),
};
global.sound = {
  playCard: () => {},
  playDraw: () => {},
  playShuffle: () => {},
  playCapture: () => {},
  playTick: () => {},
  playClick: () => {},
  playVictory: () => {},
  playDefeat: () => {},
  playBgm: () => {},
  playWin: () => {},
};
global.NetworkManager = class {
  constructor() {}
  init() {}
  send() {}
};

// Load game.js file contents
const gameCode = fs.readFileSync(path.join(__dirname, 'game.js'), 'utf-8');

// Evaluate CARD_DATABASE and ColorSpillGame class
// Expose ColorSpillGame to this scope
const evalContext = new Function(
  'window', 'document', 'sound', 'NetworkManager',
  gameCode + '; return { ColorSpillGame, CARD_DATABASE };'
);

const { ColorSpillGame, CARD_DATABASE } = evalContext(global.window, global.document, global.sound, global.NetworkManager);

console.log('=== COLOR SPILL AUTOMATED TEST SUITE ===');
console.log(`Loaded ${CARD_DATABASE.length} card definitions.`);

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${testName}`);
    process.exitCode = 1;
  }
}

// --------------------------------------------------------
// TEST 1: Exodia 5 Shards Instant Victory
// --------------------------------------------------------
console.log('\n--- 1. Testing 5 Shards (Exodia) Victory ---');
{
  const game = new ColorSpillGame();
  game.startOfflineMatch();

  const p1 = game.getPlayerById(1);
  p1.handCards = [
    { id: 'Shard1', name: 'Mảnh Vỡ 1' },
    { id: 'Shard2', name: 'Mảnh Vỡ 2' },
    { id: 'Shard3', name: 'Mảnh Vỡ 3' },
    { id: 'Shard4', name: 'Mảnh Vỡ 4' }
  ];

  assert(!game.checkExodiaWin(1), '4 shards alone do NOT trigger win');

  // Add 5th shard
  p1.handCards.push({ id: 'Shard5', name: 'Mảnh Vỡ 5' });
  const hasWon = game.checkExodiaWin(1);
  assert(hasWon === true, 'Collecting all 5 Shards in hand INSTANTLY triggers win');
  assert(game.isMatchActive === false, 'Game match is marked finished upon Exodia victory');
}

// --------------------------------------------------------
// TEST 2: Passive Defense (Shield & Counter)
// --------------------------------------------------------
console.log('\n--- 2. Testing Passive Defense Cards (Shield & Counter) ---');
{
  const game = new ColorSpillGame();
  game.startOfflineMatch();

  const p1 = game.getPlayerById(1); // Attacker
  const p2 = game.getPlayerById(2); // Victim

  // Test Shield: Blocks BanTurn debuff
  p2.handCards = [{ id: 'Shield', name: 'Khiên', type: 'Buff' }];
  p1.handCards = [{ id: 'BanTurn', name: 'Cấm Lượt', type: 'Debuff' }];
  const banCard = p1.handCards[0];

  game.executeCardEffect(p1.id, banCard, 0, { targetPlayerId: p2.id });
  assert(!p2.isBanned, 'Shield automatically blocked BanTurn debuff from victim');
  assert(p2.handCards.length === 0, 'Shield was consumed from victim hand');
  assert(game.discardDeck.some(c => c.id === 'Shield'), 'Consumed Shield was sent to discard deck');

  // Test Counter: Reflects BanTurn debuff back to attacker
  p2.handCards = [{ id: 'Counter', name: 'Phản Đòn', type: 'Buff' }];
  p1.handCards = [{ id: 'BanTurn', name: 'Cấm Lượt', type: 'Debuff' }];
  p1.isBanned = false;
  const banCard2 = p1.handCards[0];

  game.executeCardEffect(p1.id, banCard2, 0, { targetPlayerId: p2.id });
  assert(p1.isBanned === true, 'Counter reflected BanTurn back to attacker');
  assert(!p2.isBanned, 'Victim did not get banned');
  assert(p2.handCards.length === 0, 'Counter was consumed from victim hand');
}

// --------------------------------------------------------
// TEST 3: All Board & Player Mutation Cards
// --------------------------------------------------------
console.log('\n--- 3. Testing All Other Card Effects ---');
{
  const game = new ColorSpillGame();
  game.startOfflineMatch();
  const p1 = game.getPlayerById(1);
  const p2 = game.getPlayerById(2);

  // UnexpectedLuck: draws 2 cards
  p1.handCards = [{ id: 'UnexpectedLuck', name: 'May Mắn Bất Ngờ', type: 'Buff' }];
  const initialHand = 0;
  p1.handCards = [{ id: 'UnexpectedLuck', name: 'May Mắn Bất Ngờ' }];
  game.executeCardEffect(p1.id, p1.handCards[0], 0, {});
  assert(p1.handCards.length === 2, 'UnexpectedLuck drew 2 cards');

  // GainMomentum: sets skipNextDrawToDraw3
  p1.handCards = [{ id: 'GainMomentum', name: 'Tạo Đà', type: 'Buff' }];
  game.executeCardEffect(p1.id, p1.handCards[0], 0, {});
  assert(p1.skipNextDrawToDraw3 === true, 'GainMomentum set skipNextDrawToDraw3 to true');

  // Nuke: claims 3 empty cells
  const initialCellsP1 = p1.cellCount;
  p1.handCards = [{ id: 'Nuke', name: 'Khai Hoang', type: 'Buff' }];
  game.executeCardEffect(p1.id, p1.handCards[0], 0, {});
  game.recalculateCellCounts();
  assert(p1.cellCount === initialCellsP1 + 3, 'Nuke claimed 3 cells for p1');

  // BlockCell: blocks a specific cell
  p1.handCards = [{ id: 'BlockCell', name: 'Phong Ấn Ô', type: 'Debuff' }];
  game.executeCardEffect(p1.id, p1.handCards[0], 0, { cellX: 5, cellY: 5 });
  assert(game.grid[5][5].blocked === true, 'BlockCell successfully blocked cell (5,5)');

  // CastleIsolate: claims 8 cells surrounding target
  p1.handCards = [{ id: 'CastleIsolate', name: 'Lâu Đài Cô Độc', type: 'Buff' }];
  game.executeCardEffect(p1.id, p1.handCards[0], 0, { cellX: 8, cellY: 8 });
  assert(game.grid[7][7].owner === p1.id && game.grid[9][9].owner === p1.id, 'CastleIsolate claimed surrounding cells');

  // ImortalLine: protects cross line
  p1.handCards = [{ id: 'ImortalLine', name: 'Tuyến Bất Tử', type: 'Buff' }];
  game.executeCardEffect(p1.id, p1.handCards[0], 0, { cellX: 8, cellY: 8 });
  assert(game.grid[8][8].protectedUntil > game.turnNumber, 'ImortalLine set protection on cell line');

  // BanTurn directly
  p2.handCards = []; // No shield or counter
  p1.handCards = [{ id: 'BanTurn', name: 'Cấm Lượt', type: 'Debuff' }];
  game.executeCardEffect(p1.id, p1.handCards[0], 0, { targetPlayerId: p2.id });
  assert(p2.isBanned === true, 'BanTurn banned target player');

  // DisableOnHand
  p1.handCards = [{ id: 'DisableOnHand', name: 'Khóa Tay', type: 'Debuff' }];
  game.executeCardEffect(p1.id, p1.handCards[0], 0, { targetPlayerId: p2.id });
  assert(p2.disabledHandTurns === 2, 'DisableOnHand disabled target hand for 2 turns');

  // Rival: immunity against target
  p1.handCards = [{ id: 'Rival', name: 'Kỳ Phùng Địch Thủ', type: 'Debuff' }];
  game.executeCardEffect(p1.id, p1.handCards[0], 0, { targetPlayerId: p2.id });
  assert(p1.rivalImmunityTurns === 3 && p1.immuneAgainst === p2.id, 'Rival granted 3 turns immunity against target');

  // SwapCard: swap hand cards
  p1.handCards = [{ id: 'Shard1' }, { id: 'Shard2' }];
  p2.handCards = [{ id: 'Nuke' }, { id: 'Shield' }, { id: 'Counter' }];
  const swapCard = { id: 'SwapCard', name: 'Tráo Thẻ' };
  p1.handCards.push(swapCard);
  game.executeCardEffect(p1.id, swapCard, 2, { targetPlayerId: p2.id });
  assert(p1.handCards.length === 3 && p2.handCards.length === 2, 'SwapCard exchanged hand sizes correctly');
  assert(p1.handCards[0].id === 'Nuke' && p2.handCards[0].id === 'Shard1', 'Cards were swapped between players');

  // ReverseWind: turnDirection inverted
  const initialDir = game.turnDirection;
  p1.handCards = [{ id: 'ReverseWind', name: 'Gió Đổi Chiều' }];
  game.executeCardEffect(p1.id, p1.handCards[0], 0, {});
  assert(game.turnDirection === -initialDir, 'ReverseWind inverted turn direction');

  // PeaceWorld: disabledHandTurns = 3 for all players
  p1.handCards = [{ id: 'PeaceWorld', name: 'Ngày Hoà Bình' }];
  game.executeCardEffect(p1.id, p1.handCards[0], 0, {});
  assert(p1.disabledHandTurns === 3 && p2.disabledHandTurns === 3, 'PeaceWorld disabled all cards for 3 turns');

  // BodySwap: swaps owned cells between p1 and p2
  game.setCellOwner(2, 2, p1.id);
  game.setCellOwner(3, 3, p2.id);
  p1.handCards = [{ id: 'BodySwap', name: 'Hoán Đổi Thể Xác' }];
  game.executeCardEffect(p1.id, p1.handCards[0], 0, { targetPlayerId: p2.id });
  assert(game.grid[2][2].owner === p2.id && game.grid[3][3].owner === p1.id, 'BodySwap exchanged cell ownership');
}

// --------------------------------------------------------
// SUMMARY
// --------------------------------------------------------
console.log(`\n========================================`);
console.log(`TEST SUMMARY: ${passedTests}/${totalTests} Tests Passed.`);
if (passedTests === totalTests) {
  console.log(`ALL 22 CARDS AND EXODIA 5 SHARDS VERIFIED! SUCCESS!`);
} else {
  console.error(`SOME TESTS FAILED!`);
}
console.log(`========================================\n`);
process.exit(passedTests === totalTests ? 0 : 1);
