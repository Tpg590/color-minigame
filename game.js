// ========================================================
// COLOR SPILL - THE BOARD GAME & CARD EVENT ENGINE
// Turn-based territory enclosure (FloodFill Capture) + 22 Cards System
// Drag & Drop Card Execution, Dedicated Trash Bin, 30s Turn Timer
// Compatible with Single Player (Bot AI) & Online Multiplayer (P2P WebRTC)
// ========================================================

// --------------------------------------------------------
// 1. CARDS DATABASE (All 22+ Cards aligned with Color_Spill)
// --------------------------------------------------------
const CARD_DATABASE = [
  {
    id: 'Shield',
    name: 'Khiên',
    type: 'Buff',
    isPassive: true,
    target: 'passive',
    icon: 'assets/cards/Shield.png',
    desc: 'Thẻ bị động: Tự động kích hoạt từ trong túi để chặn đứng 1 đòn debuff/tấn công từ đối thủ.',
    qty: 3
  },
  {
    id: 'Counter',
    name: 'Phản Đòn',
    type: 'Buff',
    isPassive: true,
    target: 'passive',
    icon: 'assets/cards/Counter.png',
    desc: 'Thẻ bị động: Tự động kích hoạt từ trong túi để phản ngược debuff về lại kẻ vừa tấn công bạn.',
    qty: 2
  },
  {
    id: 'Nuke',
    name: 'Khai Hoang',
    type: 'Buff',
    target: 'global',
    icon: 'assets/cards/LandReclaimation.png',
    desc: 'Kéo vào sân để chiếm ngẫu nhiên 3 ô trống chưa có chủ trên khắp bản đồ.',
    qty: 3
  },
  {
    id: 'ImortalLine',
    name: 'Tuyến Bất Tử',
    type: 'Buff',
    target: 'cell',
    icon: 'assets/cards/ImmortalCross.png',
    desc: 'Kéo thả vào 1 ô của bạn: Hàng và cột chữ thập qua ô đó được bảo vệ không thể bị ăn trong 3 vòng.',
    qty: 2
  },
  {
    id: 'UnexpectedLuck',
    name: 'May Mắn Bất Ngờ',
    type: 'Buff',
    target: 'self',
    icon: 'assets/cards/UnexpectedLuck.png',
    desc: 'Kéo vào sân để lập tức rút thêm 2 thẻ bài mới từ bộ bài về tay.',
    qty: 3
  },
  {
    id: 'GainMomentum',
    name: 'Lùi Một Bước',
    type: 'Buff',
    target: 'self',
    icon: 'assets/cards/GainMomentum.png',
    desc: 'Lượt này bị khóa dùng thẻ bài, nhưng lượt kế tiếp bạn được rút thêm tới 3 lá bài.',
    qty: 2
  },
  {
    id: 'CardCollection',
    name: 'Thu Thập',
    type: 'Buff',
    target: 'self',
    icon: 'assets/cards/Interest.png',
    desc: 'Rút số thẻ bài tương ứng với diện tích lãnh thổ (mỗi 12 ô được rút 1 lá, tối thiểu 1 lá).',
    qty: 2
  },
  // 5 EXODIA SHARDS (Unique: exactly 1 copy each)
  {
    id: 'Shard1',
    name: 'Mảnh Vỡ I',
    type: 'Buff',
    target: 'self',
    icon: 'assets/cards/Shard_1.png',
    desc: 'Mảnh vỡ cổ đại 1/5. Thu thập đủ bộ 5 mảnh vỡ để NGAY LẬP TỨC THẮNG TRẬN ĐẤU!',
    qty: 1
  },
  {
    id: 'Shard2',
    name: 'Mảnh Vỡ II',
    type: 'Buff',
    target: 'self',
    icon: 'assets/cards/Shard_2.png',
    desc: 'Mảnh vỡ cổ đại 2/5. Thu thập đủ bộ 5 mảnh vỡ để NGAY LẬP TỨC THẮNG TRẬN ĐẤU!',
    qty: 1
  },
  {
    id: 'Shard3',
    name: 'Mảnh Vỡ III',
    type: 'Buff',
    target: 'self',
    icon: 'assets/cards/Shard_3.png',
    desc: 'Mảnh vỡ cổ đại 3/5. Thu thập đủ bộ 5 mảnh vỡ để NGAY LẬP TỨC THẮNG TRẬN ĐẤU!',
    qty: 1
  },
  {
    id: 'Shard4',
    name: 'Mảnh Vỡ IV',
    type: 'Buff',
    target: 'self',
    icon: 'assets/cards/Shard_4.png',
    desc: 'Mảnh vỡ cổ đại 4/5. Thu thập đủ bộ 5 mảnh vỡ để NGAY LẬP TỨC THẮNG TRẬN ĐẤU!',
    qty: 1
  },
  {
    id: 'Shard5',
    name: 'Mảnh Vỡ V',
    type: 'Buff',
    target: 'self',
    icon: 'assets/cards/Shard_5.png',
    desc: 'Mảnh vỡ cổ đại 5/5. Thu thập đủ bộ 5 mảnh vỡ để NGAY LẬP TỨC THẮNG TRẬN ĐẤU!',
    qty: 1
  },
  // DEBUFF CARDS
  {
    id: 'BanTurn',
    name: 'Cấm Lượt',
    type: 'Debuff',
    target: 'opponent',
    icon: 'assets/cards/BanTurn.png',
    desc: 'Chọn 1 đối thủ: Bắt buộc họ phải bỏ qua lượt đi kế tiếp của mình.',
    qty: 3
  },
  {
    id: 'DisableOnHand',
    name: 'Khóa Bài',
    type: 'Debuff',
    target: 'opponent',
    icon: 'assets/cards/Disable.png',
    desc: 'Chọn 1 đối thủ: Khóa toàn bộ thẻ bài trên tay họ, không thể sử dụng trong 1 lượt.',
    qty: 2
  },
  {
    id: 'Rival',
    name: 'Đối Thủ Truyền Kiếp',
    type: 'Debuff',
    target: 'opponent',
    icon: 'assets/cards/Rival.png',
    desc: 'Chọn 1 đối thủ: Bản thân được miễn nhiễm hoàn toàn mọi hiệu ứng từ đối thủ này trong 3 lượt.',
    qty: 2
  },
  {
    id: 'Psyco',
    name: 'Thao Túng Tâm Lý',
    type: 'Debuff',
    target: 'opponent',
    icon: 'assets/cards/Psycopath.png',
    desc: 'Thao túng 1 đối thủ! Lượt kế tiếp của họ, bạn sẽ là người đi cờ thay thế!',
    qty: 1
  },
  {
    id: 'LoseControl',
    name: 'Mất Kiểm Soát',
    type: 'Debuff',
    target: 'opponent',
    icon: 'assets/cards/LoseControl.png',
    desc: 'Khiến 1 đối thủ bị mất kiểm soát, máy sẽ tự động đi 1 nước ngẫu nhiên ở lượt kế tiếp.',
    qty: 2
  },
  {
    id: 'SwapCard',
    name: 'Tráo Bài',
    type: 'Debuff',
    target: 'opponent',
    icon: 'assets/cards/SwapCard.png',
    desc: 'Hoán đổi toàn bộ các lá bài trên tay mình với 1 đối thủ được chọn!',
    qty: 2
  },
  {
    id: 'StealCard',
    name: 'Trộm Bài',
    type: 'Debuff',
    target: 'opponent_steal',
    icon: 'assets/cards/StealCard.png',
    desc: 'Mở toàn bộ bài của đối thủ được xáo trộn dưới dạng dấu ❓, chọn 1 lá để trộm về tay!',
    qty: 2
  },
  {
    id: 'ShowCard',
    name: 'Xem Bài',
    type: 'Debuff',
    target: 'opponent',
    icon: 'assets/cards/ShowCard.png',
    desc: 'Soi toàn bộ các lá bài bí mật đang có trên tay của đối thủ được chọn.',
    qty: 2
  },
  // NEUTRAL CARDS
  {
    id: 'BodySwap',
    name: 'Hoán Đổi Thể Xác',
    type: 'Neutral',
    target: 'opponent',
    icon: 'assets/cards/BodySwap.png',
    desc: 'Đại chiêu lật kèo! Hoán đổi toàn bộ các ô lãnh thổ đã chiếm của mình với 1 đối thủ!',
    qty: 1
  },
  {
    id: 'BlockCell',
    name: 'Phong Ấn Ô',
    type: 'Neutral',
    target: 'cell_empty',
    icon: 'assets/cards/BlockCell.png',
    desc: 'Kéo thả vào 1 ô trống trên bản đồ để phong ấn vĩnh viễn (ô cấm), không ai có thể chiếm được.',
    qty: 3
  },
  {
    id: 'CastleIsolate',
    name: 'Lâu Đài Cô Độc',
    type: 'Neutral',
    target: 'cell_empty',
    icon: 'assets/cards/CastleIsolate.png',
    desc: 'Kéo thả vào 1 ô trống cách xa vùng đất của bạn, biến 8 ô xung quanh thành lãnh thổ của bạn!',
    qty: 2
  },
  {
    id: 'ReverseWind',
    name: 'Gió Đổi Chiều',
    type: 'Neutral',
    target: 'global',
    icon: 'assets/cards/ReverseWind.png',
    desc: 'Đảo ngược chiều thứ tự đi của trận đấu (thuận chiều <-> ngược chiều kim đồng hồ).',
    qty: 2
  },
  {
    id: 'PeaceWorld',
    name: 'Ngày Hoà Bình',
    type: 'Neutral',
    target: 'global',
    icon: 'assets/cards/WorldPeace.png',
    desc: 'Toàn bộ đấu thủ bị khóa không thể sử dụng thẻ bài trong 3 lượt tiếp theo.',
    qty: 1
  },
  {
    id: 'RockPaperScissor',
    name: 'Oẳn Tù Tì',
    type: 'Neutral',
    target: 'opponent',
    icon: 'assets/cards/Rock.png',
    desc: 'Thách đấu Kéo Búa Bao với đối thủ! Người chiến thắng cướp 3 ô lãnh thổ kề cận của kẻ thua!',
    qty: 2
  }
];

// --------------------------------------------------------
// 2. BOARD CONFIG & PLAYERS SETUP
// --------------------------------------------------------
const BOARD_SIZE = 16; // 16x16 = 256 cells

const PLAYER_PROFILES = [
  { id: 1, name: 'Player 1', color: '#1acc33', glow: 'rgba(26, 204, 51, 0.6)', spawn: { x: 1, y: 1 } },
  { id: 2, name: 'Player 2', color: '#a020f0', glow: 'rgba(160, 32, 240, 0.6)', spawn: { x: 14, y: 14 } },
  { id: 3, name: 'Player 3', color: '#00e5ff', glow: 'rgba(0, 229, 255, 0.6)', spawn: { x: 14, y: 1 } },
  { id: 4, name: 'Player 4', color: '#ffd700', glow: 'rgba(255, 215, 0, 0.6)', spawn: { x: 1, y: 14 } }
];

// ========================================================
// UNIVERSAL APP DIALOG & TOAST SYSTEM (Replaces alert, prompt, confirm)
// ========================================================
(function() {
  if (typeof window === 'undefined') return;

  let activeDialogResolver = null;

  window.showAppDialog = function(options = {}) {
    const modal = document.getElementById('appDialogModal');
    const card = document.getElementById('appDialogCard');
    const iconEl = document.getElementById('dialogIcon');
    const titleEl = document.getElementById('dialogTitle');
    const msgEl = document.getElementById('dialogMessage');
    const inputWrapper = document.getElementById('dialogInputWrapper');
    const inputEl = document.getElementById('dialogInput');
    const btnCancel = document.getElementById('btnDialogCancel');
    const btnConfirm = document.getElementById('btnDialogConfirm');

    if (!modal || !card) {
      if (options.showCancel) return Promise.resolve(false);
      return Promise.resolve(true);
    }

    if (activeDialogResolver) {
      activeDialogResolver(options.showInput ? null : false);
      activeDialogResolver = null;
    }

    const {
      title = 'THÔNG BÁO',
      message = '',
      type = 'info', // 'info', 'warning', 'error', 'success'
      icon = null,
      showInput = false,
      inputType = 'text',
      inputValue = '',
      inputPlaceholder = 'Nhập nội dung...',
      confirmText = 'ĐỒNG Ý',
      cancelText = 'HỦY BỎ',
      showCancel = false
    } = options;

    card.classList.remove('dialog-error', 'dialog-warning', 'dialog-success');
    if (type === 'error') card.classList.add('dialog-error');
    else if (type === 'warning') card.classList.add('dialog-warning');
    else if (type === 'success') card.classList.add('dialog-success');

    let displayIcon = icon;
    if (!displayIcon) {
      if (type === 'error') displayIcon = '❌';
      else if (type === 'warning') displayIcon = '⚠️';
      else if (type === 'success') displayIcon = '✅';
      else displayIcon = showInput ? '✏️' : '🔔';
    }
    if (iconEl) iconEl.innerText = displayIcon;
    if (titleEl) titleEl.innerText = title;
    if (msgEl) msgEl.innerText = message;

    if (inputWrapper && inputEl) {
      if (showInput) {
        inputWrapper.classList.remove('hidden');
        inputEl.type = inputType || 'text';
        inputEl.value = inputValue || '';
        inputEl.placeholder = inputPlaceholder || '';
      } else {
        inputWrapper.classList.add('hidden');
      }
    }

    if (btnConfirm) btnConfirm.innerText = confirmText;
    if (btnCancel) {
      btnCancel.innerText = cancelText;
      if (showCancel) btnCancel.classList.remove('hidden');
      else btnCancel.classList.add('hidden');
    }

    modal.classList.remove('hidden');

    return new Promise((resolve) => {
      activeDialogResolver = resolve;

      const cleanup = () => {
        modal.classList.add('hidden');
        document.removeEventListener('keydown', handleKey);
        modal.onclick = null;
        activeDialogResolver = null;
      };

      const doConfirm = () => {
        if (window.sound && typeof window.sound.playClick === 'function') {
          window.sound.playClick();
        }
        const val = inputEl ? inputEl.value : '';
        cleanup();
        resolve(showInput ? val : true);
      };

      const doCancel = () => {
        if (window.sound && typeof window.sound.playClick === 'function') {
          window.sound.playClick();
        }
        cleanup();
        resolve(showInput ? null : false);
      };

      const handleKey = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          doConfirm();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          doCancel();
        }
      };

      document.addEventListener('keydown', handleKey);

      if (btnConfirm) {
        btnConfirm.onclick = (e) => {
          e.preventDefault();
          doConfirm();
        };
      }

      if (btnCancel) {
        btnCancel.onclick = (e) => {
          e.preventDefault();
          doCancel();
        };
      }

      modal.onclick = (e) => {
        if (e.target === modal) {
          if (showCancel) doCancel();
          else doConfirm();
        }
      };

      setTimeout(() => {
        if (showInput && inputEl) {
          inputEl.focus();
          inputEl.select();
        } else if (btnConfirm) {
          btnConfirm.focus();
        }
      }, 50);
    });
  };

  window.appAlert = function(message, title = 'THÔNG BÁO', type = 'info') {
    return window.showAppDialog({ title, message, type, showCancel: false, confirmText: 'ĐÃ HIỂU' });
  };

  window.appConfirm = function(message, title = 'XÁC NHẬN', type = 'warning') {
    return window.showAppDialog({ title, message, type, showCancel: true, confirmText: 'ĐỒNG Ý', cancelText: 'HỦY BỎ' });
  };

  window.appPrompt = function(message, defaultValue = '', title = 'NHẬP THÔNG TIN', inputType = 'text') {
    return window.showAppDialog({
      title,
      message,
      type: 'info',
      showInput: true,
      inputType,
      inputValue: defaultValue,
      showCancel: true,
      confirmText: 'XÁC NHẬN',
      cancelText: 'HỦY BỎ'
    });
  };

  window.showToast = function(message, type = 'info', duration = 3000) {
    const container = document.getElementById('appToastContainer');
    if (!container) return;

    let icon = '🔔';
    if (type === 'error') icon = '❌';
    else if (type === 'warning') icon = '⚠️';
    else if (type === 'success') icon = '✨';

    const toast = document.createElement('div');
    toast.className = `game-toast ${type === 'error' ? 'toast-error' : (type === 'warning' ? 'toast-warning' : (type === 'success' ? 'toast-success' : ''))}`;
    toast.innerHTML = `<span class="toast-icon">${icon}</span><span class="toast-text">${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-hiding');
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, duration);
  };

  // Safe global override
  window.alert = function(msg) {
    if (window.appAlert) window.appAlert(String(msg));
  };
})();

// ========================================================
// 3. COLOR SPILL BOARD GAME CLASS
// ========================================================
class ColorSpillGame {
  constructor() {
    this.network = new NetworkManager(this);
    this.network.onRoomsUpdated = (rooms) => this.renderPublicRooms(rooms);

    // Game Mode & Settings
    this.isMatchActive = false;
    this.matchMode = 2; // 2 or 4 players
    this.difficulty = 'normal'; // 'easy', 'normal', 'hard'
    this.localPlayerId = 1;

    // Board Matrix: [x][y] = { owner: 0..4, blocked: bool, protectedUntil: 0 }
    this.grid = [];
    this.totalCells = BOARD_SIZE * BOARD_SIZE;

    // Turn System (30 seconds per turn)
    this.currentTurnIndex = 0;
    this.turnDirection = 1;    // 1 or -1
    this.turnTimer = 30;       // Updated to 30s as requested
    this.timerInterval = null;
    this.turnNumber = 1;
    this.remainingMoves = 0;   // 1 move per turn

    // Drag and Drop & Tap-to-Select Card State
    this.draggedCardData = null; // { card, index }
    this.selectedCardIndex = null; // for mobile/desktop tap-to-select
    this.pendingCardEffect = null;

    // Players Array
    this.players = [];

    // Spectator Mode State (Esports Liên Quân Tournament Spectator)
    this.isSpectator = false;
    this.spectatorSpotlightPlayerId = null; // null for all, or player id 1..4
    this.spectatorInspectedPlayerId = 'all'; // 'all', or player id 1..4

    // Card Decks
    this.mainDeck = [];
    this.discardDeck = [];

    // Canvas & Rendering
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.cellSize = 40; // 640 / 16
    this.hoverCell = null;
    this.animFrameId = null;
    this.particles = [];

    // Bind UI & Inputs
    this.initDOM();
    this.initCanvasEvents();
    this.initDragAndDrop();
    this.buildCardsCatalog();
    this.startRenderingLoop();
  }

  // ------------------------------------------------------
  // DOM EVENT BINDINGS
  // ------------------------------------------------------
  initDOM() {
    // Random Name button
    const names = ['ChromaKnight', 'NeonVortex', 'CyberSpill', 'PrismLord', 'QuantumPixel', 'ApexPainter', 'HexaKing', 'AuraPhantom'];
    document.getElementById('btnRandomName').addEventListener('click', () => {
      sound.playClick();
      const rand = names[Math.floor(Math.random() * names.length)];
      document.getElementById('playerNameInput').value = rand;
    });

    // Color Palette selector
    const paletteEl = document.getElementById('colorPalette');
    PLAYER_PROFILES.forEach((p, idx) => {
      const div = document.createElement('div');
      div.className = `color-choice ${idx === 0 ? 'active' : ''}`;
      div.dataset.colorIdx = idx;
      div.innerHTML = `
        <div class="color-circle" style="background: ${p.color}; color: ${p.color}"></div>
        <div class="color-name">${p.name}</div>
      `;
      div.addEventListener('click', () => {
        sound.playClick();
        document.querySelectorAll('.color-choice').forEach(c => c.classList.remove('active'));
        div.classList.add('active');
      });
      paletteEl.appendChild(div);
    });

    // Match mode segmented control (2 or 4)
    document.querySelectorAll('#matchModeControl .seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        sound.playClick();
        document.querySelectorAll('#matchModeControl .seg-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.matchMode = parseInt(btn.dataset.mode, 10);
      });
    });

    // Difficulty control
    document.querySelectorAll('#difficultyControl .seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        sound.playClick();
        document.querySelectorAll('#difficultyControl .seg-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.difficulty = btn.dataset.diff;
      });
    });

      // Room Privacy segmented control (Public vs Private)
      document.querySelectorAll('#roomPrivacyControl .seg-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          sound.playClick();
          document.querySelectorAll('#roomPrivacyControl .seg-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const isPrivate = btn.dataset.privacy === 'private';
          const pwdGroup = document.getElementById('roomPasswordGroup');
          if (pwdGroup) {
            if (isPrivate) {
              pwdGroup.classList.remove('hidden');
              const pwdInput = document.getElementById('createRoomPasswordInput');
              if (pwdInput) pwdInput.focus();
            } else {
              pwdGroup.classList.add('hidden');
            }
          }
        });
      });

      // Role Selection control for Host (Player vs Spectator)
      document.querySelectorAll('#createRoomRoleControl .seg-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          sound.playClick();
          document.querySelectorAll('#createRoomRoleControl .seg-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        });
      });

      // Navigation buttons
      document.getElementById('btnNavOffline').addEventListener('click', () => {
        sound.playClick();
        this.showView('viewOffline');
      });
      document.getElementById('btnNavCreateRoom').addEventListener('click', () => {
        sound.playClick();
        this.showView('viewCreateRoom');
      });
      document.getElementById('btnNavFindRoom').addEventListener('click', () => {
        sound.playClick();
        this.showView('viewFindRoom');
        this.network.queryActiveRooms();
        this.renderPublicRooms(this.network.getCleanRoomList());
      });

      // Refresh Public Rooms button
      const btnRefresh = document.getElementById('btnRefreshRooms');
      if (btnRefresh) {
        btnRefresh.addEventListener('click', () => {
          sound.playClick();
          btnRefresh.classList.add('rotating');
          setTimeout(() => btnRefresh.classList.remove('rotating'), 600);
          this.network.queryActiveRooms();
          this.renderPublicRooms(this.network.getCleanRoomList());
        });
      }

      // Back buttons
      document.querySelectorAll('.btn-back').forEach(btn => {
        btn.addEventListener('click', () => {
          sound.playClick();
          this.showView(btn.dataset.back);
        });
      });

      // Start Offline Match
      document.getElementById('btnStartOffline').addEventListener('click', () => {
        sound.playClick();
        this.startOfflineMatch();
      });

      // Create Room
      document.getElementById('btnConfirmCreateRoom').addEventListener('click', () => {
        sound.playClick();
        const roomName = (document.getElementById('createRoomNameInput').value || '').trim();
        const isPrivate = document.querySelector('#roomPrivacyControl .seg-btn.active').dataset.privacy === 'private';
        const isSpectator = document.querySelector('#createRoomRoleControl .seg-btn.active')?.dataset.role === 'spectator';
        const password = (document.getElementById('createRoomPasswordInput').value || '').trim();
        const myName = (document.getElementById('playerNameInput').value || '').trim() || 'ChromaKnight';

        if (isPrivate && !password) {
          window.appAlert('Vui lòng nhập mật khẩu cho phòng riêng tư!', 'CHÚ Ý', 'warning');
          const pwdInput = document.getElementById('createRoomPasswordInput');
          if (pwdInput) pwdInput.focus();
          return;
        }

        const activeColor = document.querySelector('.color-choice.active');
        const colorIdx = activeColor ? parseInt(activeColor.dataset.colorIdx, 10) : 0;
        const playerColor = PLAYER_PROFILES[colorIdx] ? PLAYER_PROFILES[colorIdx].color : PLAYER_PROFILES[0].color;

        const createBtn = document.getElementById('btnConfirmCreateRoom');
        createBtn.disabled = true;
        createBtn.innerHTML = '<span class="btn-icon-lead">⏳</span> ĐANG TẠO PHÒNG...';

        this.network.createRoom(
          { roomName: roomName || `Phòng của ${myName}`, isPrivate, password, isSpectator },
          { name: myName, color: playerColor },
          (code) => {
            createBtn.disabled = false;
            createBtn.innerHTML = '<span class="btn-icon-lead">🚀</span> TẠO PHÒNG & LẤY MÃ CODE';
            document.getElementById('displayRoomCode').innerText = code;
            const hostBadge = document.getElementById('hostPrivacyBadge');
            if (hostBadge) {
              hostBadge.innerText = isPrivate ? '🔒 Riêng Tư' : '🌐 Công Khai';
              hostBadge.className = isPrivate ? 'badge-privacy badge-private' : 'badge-privacy badge-public';
            }
            this.showView('viewHostWaiting');
            this.updateHostLobbyUI();
          },
          (err) => {
            createBtn.disabled = false;
            createBtn.innerHTML = '<span class="btn-icon-lead">🚀</span> TẠO PHÒNG & LẤY MÃ CODE';
            window.appAlert('Lỗi tạo phòng: ' + err, 'LỖI TẠO PHÒNG', 'error');
          }
        );
      });

      document.getElementById('btnHostStartMatch').addEventListener('click', () => {
        sound.playClick();
        this.startOnlineMatchAsHost();
      });

      document.getElementById('btnCancelHost').addEventListener('click', () => {
        sound.playClick();
        this.network.disconnect();
        this.showView('viewMain');
      });

      // Host Role Toggle
      const btnHostToggle = document.getElementById('btnHostToggleRole');
      if (btnHostToggle) {
        btnHostToggle.addEventListener('click', () => {
          sound.playClick();
          const nextRole = this.network.isSpectator ? 'player' : 'spectator';
          this.network.requestRoleSwitch(nextRole);
        });
      }

      // Guest Role Switch
      const btnGuestSwitch = document.getElementById('btnGuestSwitchRole');
      if (btnGuestSwitch) {
        btnGuestSwitch.addEventListener('click', () => {
          sound.playClick();
          const nextRole = this.network.isSpectator ? 'player' : 'spectator';
          this.network.requestRoleSwitch(nextRole);
        });
      }

      // Direct Join as Player
      document.getElementById('btnJoinDirect').addEventListener('click', () => {
        sound.playClick();
        const codeInput = document.getElementById('joinDirectCodeInput');
        const code = (codeInput ? codeInput.value : '').trim();
        if (!code) {
          window.appAlert('Vui lòng nhập mã phòng (Ví dụ: CSP-XXXX hoặc XXXX)!', 'CHÚ Ý', 'warning');
          if (codeInput) codeInput.focus();
          return;
        }
        this.executeJoinRoom(code, '', false);
      });

      // Direct Join as Spectator (Esports Liên Quân Style)
      const btnSpecDirect = document.getElementById('btnSpectateDirect');
      if (btnSpecDirect) {
        btnSpecDirect.addEventListener('click', () => {
          sound.playClick();
          const codeInput = document.getElementById('joinDirectCodeInput');
          const code = (codeInput ? codeInput.value : '').trim();
          if (!code) {
            window.appAlert('Vui lòng nhập mã phòng muốn vào xem (Ví dụ: CSP-XXXX hoặc XXXX)!', 'CHÚ Ý', 'warning');
            if (codeInput) codeInput.focus();
            return;
          }
          this.executeJoinRoom(code, '', true);
        });
      }

      // Enter key inside Direct Join Input
      const directCodeInput = document.getElementById('joinDirectCodeInput');
      if (directCodeInput) {
        directCodeInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('btnJoinDirect').click();
          }
        });
      }

      document.getElementById('btnLeaveGuest').addEventListener('click', () => {
        sound.playClick();
        this.network.disconnect();
        this.showView('viewMain');
      });

      // Spectator In-Match Tournament Buttons
      const btnOpenStats = document.getElementById('btnOpenSpectatorStats');
      if (btnOpenStats) {
        btnOpenStats.addEventListener('click', () => {
          sound.playClick();
          this.openSpectatorStatsModal();
        });
      }
      const btnCloseStats = document.getElementById('btnCloseSpectatorStats');
      if (btnCloseStats) {
        btnCloseStats.addEventListener('click', () => {
          sound.playClick();
          document.getElementById('spectatorStatsModal').classList.add('hidden');
        });
      }
      const btnGotStats = document.getElementById('btnGotSpectatorStats');
      if (btnGotStats) {
        btnGotStats.addEventListener('click', () => {
          sound.playClick();
          document.getElementById('spectatorStatsModal').classList.add('hidden');
        });
      }
      const btnSpecQuit = document.getElementById('btnSpectatorQuit');
      if (btnSpecQuit) {
        btnSpecQuit.addEventListener('click', async () => {
          const confirmQuit = await window.appConfirm('Bạn có chắc chắn muốn rời xem trận đấu và trở về sảnh?', 'RỜI XEM TRẬN ĐẤU');
          if (confirmQuit) {
            this.exitMatchToLobby();
          }
        });
      }

    // Audio & Header Actions
    document.getElementById('btnSoundToggle').addEventListener('click', () => {
      const on = sound.toggleSound();
      document.getElementById('btnSoundToggle').innerText = on ? '🔊' : '🔇';
    });
    document.getElementById('btnMusicToggle').addEventListener('click', () => {
      const on = sound.toggleMusic();
      document.getElementById('btnMusicToggle').innerText = on ? '🎵' : '🔇';
    });
    document.getElementById('btnInGameTutorial').addEventListener('click', () => {
      sound.playClick();
      document.getElementById('tutorialModal').classList.remove('hidden');
    });
    document.getElementById('btnOpenTutorial').addEventListener('click', () => {
      sound.playClick();
      document.getElementById('tutorialModal').classList.remove('hidden');
    });
    document.getElementById('btnCloseTutorial').addEventListener('click', () => {
      sound.playClick();
      document.getElementById('tutorialModal').classList.add('hidden');
    });
    document.getElementById('btnGotTutorial').addEventListener('click', () => {
      sound.playClick();
      document.getElementById('tutorialModal').classList.add('hidden');
    });
    document.getElementById('btnQuitMatch').addEventListener('click', async () => {
      const confirmQuit = await window.appConfirm('Bạn có chắc chắn muốn rời trận đấu hiện tại và trở về sảnh?', 'RỜI TRẬN ĐẤU');
      if (confirmQuit) {
        this.exitMatchToLobby();
      }
    });

    // Target modal cancel
    document.getElementById('btnCancelTargetSelect').addEventListener('click', () => {
      sound.playClick();
      this.pendingCardEffect = null;
      document.getElementById('targetSelectModal').classList.add('hidden');
    });

    // Peep modal close
    document.getElementById('btnClosePeepModal').addEventListener('click', () => {
      document.getElementById('peepCardsModal').classList.add('hidden');
    });
    document.getElementById('btnGotPeep').addEventListener('click', () => {
      document.getElementById('peepCardsModal').classList.add('hidden');
    });

    // Game Over buttons
    document.getElementById('btnPlayAgain').addEventListener('click', () => {
      sound.playClick();
      document.getElementById('gameOverModal').classList.add('hidden');
      if (this.network.isOnline) {
        if (this.network.isHost) this.startOnlineMatchAsHost();
      } else {
        this.startOfflineMatch();
      }
    });
    document.getElementById('btnBackToLobby').addEventListener('click', () => {
      sound.playClick();
      document.getElementById('gameOverModal').classList.add('hidden');
      this.exitMatchToLobby();
    });

    // Rock Paper Scissors choice buttons
    document.querySelectorAll('.rps-choice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.handleRPSChoice(btn.dataset.choice);
      });
    });
  }

  showView(viewId) {
    document.querySelectorAll('.lobby-view').forEach(v => v.classList.add('hidden'));
    const target = document.getElementById(viewId);
    if (target) target.classList.remove('hidden');
  }

  // ------------------------------------------------------
  // 4. DRAG & DROP IMPLEMENTATION (BOARD & TRASH BIN)
  // ------------------------------------------------------
  initDragAndDrop() {
    const boardContainer = document.getElementById('boardCanvasContainer');
    const trashZone = document.getElementById('trashDropZone');
    const dropHint = document.getElementById('boardDropHint');

    // 1. BOARD CANVAS DROP ZONE
    boardContainer.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (this.draggedCardData) {
        boardContainer.classList.add('drag-over');
        dropHint.classList.remove('hidden');
      }
    });

    boardContainer.addEventListener('dragleave', () => {
      boardContainer.classList.remove('drag-over');
      dropHint.classList.add('hidden');
    });

    boardContainer.addEventListener('drop', (e) => {
      e.preventDefault();
      boardContainer.classList.remove('drag-over');
      dropHint.classList.add('hidden');

      if (!this.draggedCardData) return;

      const { card, index } = this.draggedCardData;
      this.draggedCardData = null;

      // Calculate cell drop coordinates
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const dropCellX = Math.floor(((e.clientX - rect.left) * scaleX) / this.cellSize);
      const dropCellY = Math.floor(((e.clientY - rect.top) * scaleY) / this.cellSize);

      this.handleCardDropOnBoard(card, index, dropCellX, dropCellY);
    });

    // 2. TRASH BIN DROP ZONE
    trashZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (this.draggedCardData) {
        trashZone.classList.add('drag-over');
      }
    });

    trashZone.addEventListener('dragleave', () => {
      trashZone.classList.remove('drag-over');
    });

    trashZone.addEventListener('drop', (e) => {
      e.preventDefault();
      trashZone.classList.remove('drag-over');

      if (!this.draggedCardData) return;

      const { card, index } = this.draggedCardData;
      this.draggedCardData = null;

      this.discardCard(this.localPlayerId, index);
      this.setBanner(`🗑️ ĐÃ VỨT THẺ:`, `Bạn đã ném thẻ ${card.name} vào thùng rác.`);
    });

    // 3. TRASH BIN CLICK / TAP TO DISCARD (Mobile & PC Tap-to-Select)
    trashZone.addEventListener('click', () => {
      if (this.selectedCardIndex !== null) {
        const myPlayer = this.getPlayerById(this.localPlayerId);
        if (!myPlayer) return;
        const card = myPlayer.handCards[this.selectedCardIndex];
        const cardIndex = this.selectedCardIndex;
        this.selectedCardIndex = null;
        this.discardCard(this.localPlayerId, cardIndex);
        this.setBanner(`🗑️ ĐÃ VỨT THẺ:`, `Bạn đã ném thẻ ${card.name} vào thùng rác.`);
      } else {
        sound.playTick();
        this.setBanner(`🗑️ THÙNG RÁC:`, `Chạm chọn 1 lá bài trên tay rồi chạm vào đây (hoặc kéo thả) để vứt bỏ.`);
      }
    });
  }

  handleCardDropOnBoard(card, cardIndex, cellX, cellY) {
    const active = this.getActivePlayer();
    if (active.id !== this.localPlayerId) {
      window.showToast('Chưa đến lượt của bạn!', 'warning');
      return;
    }
    if (active.disabledHandTurns > 0) {
      window.showToast('Bạn đang bị khóa sử dụng thẻ bài ở lượt này!', 'warning');
      return;
    }

    // Passive cards (Shield & Counter) cannot be dragged to the board!
    if (card.isPassive || card.id === 'Shield' || card.id === 'Counter') {
      sound.playTick();
      this.setBanner(`🛡️ THẺ BỊ ĐỘNG:`, `${card.name} chỉ tự động kích hoạt từ trong túi khi bị kẻ địch tấn công! Không thể thi triển lên sân (kéo vào Thùng Rác nếu muốn bỏ).`);
      return;
    }

    // Specific cell targeting cards (Phong Ấn Ô, Lâu Đài Cô Độc, Tuyến Bất Tử)
    if (card.target === 'cell' || card.target === 'cell_empty') {
      this.pendingCardEffect = { playerId: this.localPlayerId, card, cardIndex };
      this.selectedCardIndex = cardIndex;
      sound.playTick();
      this.renderHandCardsUI();

      if (card.target === 'cell_empty') {
        this.setBanner(`🎯 CHỈ ĐỊNH Ô: [${card.name}]`, `Bấm vào 1 ô TRỐNG (chưa có chủ) trên bàn cờ để áp dụng. (Chạm lại thẻ để hủy)`);
      } else {
        this.setBanner(`🎯 CHỈ ĐỊNH Ô: [${card.name}]`, `Bấm vào 1 ô THUỘC LÃNH THỔ CỦA BẠN trên bàn cờ để áp dụng. (Chạm lại thẻ để hủy)`);
      }
      return;
    }

    // Opponent targeting cards: LUÔN mở modal chọn đối thủ để chỉ định
    if (card.target === 'opponent' || card.target === 'opponent_steal') {
      this.openTargetSelectModal(card, cardIndex);
      return;
    }

    // Direct cast (self / global)
    this.executeCardEffect(this.localPlayerId, card, cardIndex, {});
  }

  // ------------------------------------------------------
  // 5. MATCH INITIALIZATION & LOOP
  // ------------------------------------------------------
  initBoardData() {
    this.grid = [];
    for (let x = 0; x < BOARD_SIZE; x++) {
      this.grid[x] = [];
      for (let y = 0; y < BOARD_SIZE; y++) {
        this.grid[x][y] = {
          owner: 0,
          blocked: false,
          protectedUntil: 0
        };
      }
    }
  }

  initDeck() {
    this.mainDeck = [];
    this.discardDeck = [];

    CARD_DATABASE.forEach(template => {
      for (let i = 0; i < template.qty; i++) {
        this.mainDeck.push({ ...template });
      }
    });

    this.shuffle(this.mainDeck);
    sound.playShuffle();
  }

  shuffle(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }

  startOfflineMatch() {
    this.isMatchActive = true;
    this.localPlayerId = 1;
    const myName = document.getElementById('playerNameInput').value || 'ChromaKnight';

    // Set up Players
    this.players = [];
    for (let i = 0; i < this.matchMode; i++) {
      const prof = PLAYER_PROFILES[i];
      const isHuman = (i === 0);
      this.players.push({
        id: prof.id,
        name: isHuman ? myName : (i === 1 ? 'Bot Alpha' : (i === 2 ? 'Bot Beta' : 'Bot Gamma')),
        color: prof.color,
        glow: prof.glow,
        spawn: prof.spawn,
        isHuman: isHuman,
        cellCount: 0,
        eliminated: false,
        handCards: [],
        isBanned: false,
        isLostControl: false,
        disabledHandTurns: 0,
        rivalImmunityTurns: 0,
        immuneAgainst: 0,
        controlledBy: 0,
        skipNextDrawToDraw3: false
      });
    }

    this.setupMatchCommon();
  }

  startOnlineMatchAsHost() {
    this.isMatchActive = true;
    this.isSpectator = !!this.network.isSpectator;
    this.localPlayerId = this.isSpectator ? 0 : 1;

    // Use players in lobby, fill remaining with Bot if needed
    const lobby = this.network.lobbyPlayers;
    const count = Math.max(2, lobby.length);
    this.players = [];

    for (let i = 0; i < count; i++) {
      const prof = PLAYER_PROFILES[i];
      const lobPlayer = lobby[i];
      this.players.push({
        id: prof.id,
        name: lobPlayer ? lobPlayer.name : `Bot ${i + 1}`,
        color: prof.color,
        glow: prof.glow,
        spawn: prof.spawn,
        isHuman: !!lobPlayer,
        cellCount: 0,
        eliminated: false,
        handCards: [],
        isBanned: false,
        isLostControl: false,
        disabledHandTurns: 0,
        rivalImmunityTurns: 0,
        immuneAgainst: 0,
        controlledBy: 0,
        skipNextDrawToDraw3: false
      });
    }

    this.setupMatchCommon();

    // Broadcast Game Start to guests
    this.network.broadcastGameStart({
      matchMode: count,
      players: this.players,
      board: this.grid,
      currentTurnIndex: this.currentTurnIndex
    });
  }

  startOnlineMatchAsGuest(matchData, myNetId, isSpectator = false) {
    this.isMatchActive = true;
    this.isSpectator = isSpectator || (myNetId === 0) || !!this.network.isSpectator;
    this.localPlayerId = this.isSpectator ? 0 : myNetId;
    this.players = matchData.players;
    this.initBoardData();
    this.setupMatchCommon(true);
  }

  setupMatchCommon(isGuest = false) {
    document.getElementById('setupScreen').classList.add('hidden');
    document.getElementById('gameScreen').classList.remove('hidden');
    document.getElementById('gameHud').classList.remove('hidden');

    if (!isGuest) {
      this.initBoardData();
      this.initDeck();

      // Apply initial spawn points
      this.players.forEach(p => {
        this.setCellOwner(p.spawn.x, p.spawn.y, p.id);
      });

      // Deal 1 starting card to each player (bắt đầu với lá bài đầu tiên)
      this.players.forEach(p => {
        p.handCards = [];
        p.usedCardsCount = 0;
        this.drawCardForPlayer(p.id, false);
        p.hasDrawnStartingHand = true;
      });

      this.currentTurnIndex = 0;
      this.turnDirection = 1;
      this.turnNumber = 1;
      this.startTurn(0);
    }

    sound.playBgm('match');
    this.updateHUD();

    if (this.isSpectator) {
      this.setupSpectatorModeUI();
    } else {
      this.setupPlayerModeUI();
      this.renderHandCardsUI();
    }
  }

  setupSpectatorModeUI() {
    document.getElementById('gameScreen').classList.add('spectator-active');
    document.getElementById('spectatorTournamentBar').classList.remove('hidden');
    document.getElementById('playerDockHeader').classList.add('hidden');
    document.getElementById('spectatorInspectorHeader').classList.remove('hidden');

    // Update spectator live count
    const specCount = (this.network.lobbySpectators && this.network.lobbySpectators.length) || 1;
    const liveEl = document.getElementById('specLiveCount');
    if (liveEl) liveEl.innerText = `👁️ ${specCount} Khán Giả`;

    // Populate spotlight buttons in top tournament bar
    const spotContainer = document.getElementById('specSpotlightControls');
    if (spotContainer) {
      spotContainer.innerHTML = `
        <span class="spotlight-label">🎥 TIÊU ĐIỂM:</span>
        <button type="button" class="spec-spot-btn ${this.spectatorSpotlightPlayerId === null ? 'active' : ''}" data-spot="all">Toàn Cảnh</button>
        ${this.players.map(p => `
          <button type="button" class="spec-spot-btn ${this.spectatorSpotlightPlayerId === p.id ? 'active' : ''}" data-spot="${p.id}">
            <span class="spot-dot" style="background: ${p.color};"></span>
            ${p.name.length > 7 ? p.name.substring(0, 6) + '…' : p.name}
          </button>
        `).join('')}
      `;
      spotContainer.querySelectorAll('.spec-spot-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          sound.playClick();
          spotContainer.querySelectorAll('.spec-spot-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const spot = btn.dataset.spot;
          this.spectatorSpotlightPlayerId = (spot === 'all') ? null : parseInt(spot, 10);
          if (this.spectatorSpotlightPlayerId) {
            const spPlayer = this.getPlayerById(this.spectatorSpotlightPlayerId);
            window.showToast(`🎥 Đang chiếu tiêu điểm lãnh thổ: ${spPlayer ? spPlayer.name : 'Tuyển thủ ' + spot}`, 'info');
          } else {
            window.showToast('🎥 Chế độ tiêu điểm: Toàn cảnh đấu trường', 'info');
          }
        });
      });
    }

    // Populate player tabs in hand inspector dock
    const tabContainer = document.getElementById('spectatorPlayerTabs');
    if (tabContainer) {
      tabContainer.innerHTML = `
        <button type="button" class="spec-tab-btn ${this.spectatorInspectedPlayerId === 'all' ? 'active' : ''}" data-player="all">🌐 TẤT CẢ</button>
        ${this.players.map(p => `
          <button type="button" class="spec-tab-btn ${this.spectatorInspectedPlayerId === p.id ? 'active' : ''}" data-player="${p.id}">
            <span class="tab-dot" style="background: ${p.color};"></span>
            ${p.name.length > 7 ? p.name.substring(0, 6) + '…' : p.name}
            <span class="tab-badge-count">(${p.handCards.length})</span>
          </button>
        `).join('')}
      `;
      tabContainer.querySelectorAll('.spec-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          sound.playClick();
          tabContainer.querySelectorAll('.spec-tab-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const pId = btn.dataset.player;
          this.spectatorInspectedPlayerId = (pId === 'all') ? 'all' : parseInt(pId, 10);
          this.renderSpectatorInspectorUI();
        });
      });
    }

    this.renderSpectatorInspectorUI();
    this.setBanner('👁️ CHẾ ĐỘ QUAN SÁT GIẢI ĐẤU (ESPORTS SPECTATOR)', 'Bạn đang xem trực tiếp trận đấu • Bấm [SO KÈO TUYỂN THỦ] để phân tích số liệu!');
  }

  setupPlayerModeUI() {
    document.getElementById('gameScreen').classList.remove('spectator-active');
    document.getElementById('spectatorTournamentBar').classList.add('hidden');
    document.getElementById('playerDockHeader').classList.remove('hidden');
    document.getElementById('spectatorInspectorHeader').classList.add('hidden');
  }

  renderSpectatorInspectorUI() {
    if (!this.isSpectator) return;
    const rowEl = document.getElementById('cardsHandRow');
    if (!rowEl) return;

    const targetBadge = document.getElementById('spectatorInspectTargetBadge');

    if (this.spectatorInspectedPlayerId === 'all') {
      if (targetBadge) targetBadge.innerText = '🌐 Xem Bài Toàn Bộ Tuyển Thủ';

      let html = '<div class="spectator-all-hands-grid">';
      this.players.forEach(p => {
        const isCurrentTurn = (this.getActivePlayer()?.id === p.id);
        html += `
          <div class="spec-player-hand-column ${isCurrentTurn ? 'active-turn-col' : ''}">
            <div class="spec-hand-col-header" style="border-left: 3px solid ${p.color};">
              <span class="col-dot" style="background: ${p.color};"></span>
              <strong class="col-name">${this.escapeHtml(p.name)}</strong>
              <span class="col-card-count">(${p.handCards.length}/5)</span>
              ${isCurrentTurn ? '<span class="col-turn-tag">ĐANG ĐI</span>' : ''}
            </div>
            <div class="spec-col-cards">
              ${p.handCards.length === 0 ? '<div class="spec-empty-hint">Hết bài trên tay</div>' : p.handCards.map(card => {
                const isPassive = card.isPassive || card.id === 'Shield' || card.id === 'Counter';
                const isShard = card.id && card.id.startsWith('Shard');
                return `
                  <div class="spec-mini-card ${isPassive ? 'passive' : ''} ${isShard ? 'shard' : ''}" title="${this.escapeHtml(card.name)}: ${this.escapeHtml(card.desc)}">
                    <img src="${card.icon}" class="mini-card-icon" onerror="this.src='assets/cards/Shield.png'" />
                    <div class="mini-card-info">
                      <span class="mini-card-name">${this.escapeHtml(card.name)}</span>
                      <span class="mini-card-tag">${isPassive ? '🛡️ BỊ ĐỘNG' : (isShard ? '💎 EXODIA' : card.type || 'THẺ')}</span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      });
      html += '</div>';
      rowEl.innerHTML = html;
    } else {
      const p = this.getPlayerById(this.spectatorInspectedPlayerId);
      if (!p) {
        this.spectatorInspectedPlayerId = 'all';
        this.renderSpectatorInspectorUI();
        return;
      }

      if (targetBadge) {
        targetBadge.innerHTML = `<span class="target-dot" style="background: ${p.color};"></span> Đang soi: ${this.escapeHtml(p.name)} (${p.handCards.length} thẻ)`;
      }

      if (p.handCards.length === 0) {
        rowEl.innerHTML = `<div class="empty-hand-hint">Tuyển thủ <strong>${this.escapeHtml(p.name)}</strong> hiện không còn lá bài nào trên tay.</div>`;
        return;
      }

      rowEl.innerHTML = p.handCards.map((card, idx) => {
        const isPassive = card.isPassive || card.id === 'Shield' || card.id === 'Counter';
        const isShard = card.id && card.id.startsWith('Shard');
        const cardType = card.type || (isShard ? 'Buff' : 'Neutral');

        let typeLabel = cardType.toUpperCase();
        let typeClass = `type-${cardType.toLowerCase()}`;
        let borderClass = `card-${cardType.toLowerCase()}`;

        if (isPassive) {
          typeLabel = 'BỊ ĐỘNG';
          typeClass = 'type-passive';
          borderClass = 'card-passive';
        } else if (isShard) {
          typeLabel = 'EXODIA';
          typeClass = 'type-shard';
          borderClass = 'card-shard';
        }

        return `
          <div class="game-card-item spec-inspect-card ${borderClass}" data-card-idx="${idx}">
            <div class="card-type-tag ${typeClass}">${typeLabel}</div>
            <div class="card-img-wrap">
              <img src="${card.icon}" alt="${this.escapeHtml(card.name)}" class="card-icon-img" onerror="this.src='assets/cards/Shield.png'" />
            </div>
            <div class="card-title">${this.escapeHtml(card.name)}</div>
            <div class="card-desc">${this.escapeHtml(card.desc)}</div>
            <div class="card-target-hint">${isPassive ? '🛡️ Tự động kích hoạt khi bị công' : (isShard ? '💎 Ghép 5 mảnh thắng' : '⚡ Thẻ ma thuật')}</div>
          </div>
        `;
      }).join('');
    }
  }

  openSpectatorStatsModal() {
    const modal = document.getElementById('spectatorStatsModal');
    const content = document.getElementById('spectatorStatsContent');
    if (!modal || !content) return;

    this.recalculateCellCounts();
    const active = this.getActivePlayer();

    content.innerHTML = `
      <div class="esports-stats-banner">
        <div class="stats-banner-item">
          <span class="stats-label">VÒNG ĐẤU:</span>
          <span class="stats-value text-teal">Vòng #${this.turnNumber}</span>
        </div>
        <div class="stats-banner-item">
          <span class="stats-label">LƯỢT HIỆN TẠI:</span>
          <span class="stats-value" style="color: ${active ? active.color : '#fff'};">👑 ${active ? active.name : 'N/A'}</span>
        </div>
        <div class="stats-banner-item">
          <span class="stats-label">BỘ BÀI CÒN:</span>
          <span class="stats-value text-yellow">🃏 ${this.mainDeck.length} lá</span>
        </div>
        <div class="stats-banner-item">
          <span class="stats-label">KHÁN GIẢ XEM:</span>
          <span class="stats-value text-cyan">👁️ ${(this.network.lobbySpectators && this.network.lobbySpectators.length) || 1} người</span>
        </div>
      </div>

      <div class="esports-comparison-grid">
        ${this.players.map((p, idx) => {
          const pct = ((p.cellCount / this.totalCells) * 100).toFixed(1);
          const isTurn = (active && active.id === p.id);
          const shards = p.handCards.filter(c => c.id && c.id.startsWith('Shard')).length;
          const hasShield = p.handCards.some(c => c.id === 'Shield');
          const hasCounter = p.handCards.some(c => c.id === 'Counter');

          return `
            <div class="esports-player-column ${isTurn ? 'turn-focus' : ''} ${p.eliminated ? 'eliminated' : ''}">
              <div class="esp-col-header" style="background: linear-gradient(135deg, ${p.color}33, transparent); border-top: 3px solid ${p.color};">
                <div class="esp-avatar" style="background: ${p.color}; box-shadow: 0 0 10px ${p.color};"></div>
                <div class="esp-pinfo">
                  <span class="esp-pname">${this.escapeHtml(p.name)}</span>
                  <span class="esp-prole">${p.isHuman ? '👤 Tuyển Thủ' : '🤖 AI Bot'}</span>
                </div>
                ${isTurn ? '<span class="esp-live-dot" title="Đang trong lượt">👑 LƯỢT</span>' : ''}
              </div>

              <div class="esp-metric-group">
                <div class="esp-metric-row">
                  <span class="metric-lbl">Kiểm soát bản đồ:</span>
                  <strong class="metric-val text-teal">${pct}% (${p.cellCount} ô)</strong>
                </div>
                <div class="esp-progress-bar">
                  <div class="esp-progress-fill" style="width: ${pct}%; background: ${p.color};"></div>
                </div>
              </div>

              <div class="esp-metric-badges">
                <div class="esp-badge-pill" title="Số thẻ đang cầm trên tay">
                  <span class="badge-icon">🃏</span>
                  <span>Bài trên tay: <strong>${p.handCards.length}/5</strong></span>
                </div>
                <div class="esp-badge-pill" title="Mảnh Exodia đã thu thập">
                  <span class="badge-icon">💎</span>
                  <span>Mảnh Exodia: <strong>${shards}/5</strong></span>
                </div>
              </div>

              <div class="esp-buff-list">
                <div class="buff-title">TRẠNG THÁI & BẢO VỆ:</div>
                <div class="buff-items-row">
                  ${hasShield ? '<span class="esp-tag tag-shield">🛡️ Khiên Sẵn Sàng</span>' : ''}
                  ${hasCounter ? '<span class="esp-tag tag-counter">⚔️ Phản Đòn Sẵn Sàng</span>' : ''}
                  ${p.rivalImmunityTurns > 0 ? '<span class="esp-tag tag-immortal">🌟 Bất Hoại</span>' : ''}
                  ${p.isBanned ? '<span class="esp-tag tag-debuff">🚫 Bị Cấm Lượt</span>' : ''}
                  ${p.disabledHandTurns > 0 ? '<span class="esp-tag tag-debuff">🔒 Bị Khóa Bài</span>' : ''}
                  ${(!hasShield && !hasCounter && p.rivalImmunityTurns <= 0 && !p.isBanned && p.disabledHandTurns <= 0) ? '<span class="esp-tag-muted">Bình thường</span>' : ''}
                </div>
              </div>

              <div class="esp-action-focus">
                <button type="button" class="btn-focus-player" data-player="${p.id}" style="border-color: ${p.color}; color: ${p.color};">
                  🎯 Chiếu Tiêu Điểm
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    content.querySelectorAll('.btn-focus-player').forEach(btn => {
      btn.addEventListener('click', () => {
        sound.playClick();
        const pId = parseInt(btn.dataset.player, 10);
        this.spectatorSpotlightPlayerId = pId;
        const spPlayer = this.getPlayerById(pId);
        window.showToast(`🎥 Đang chiếu tiêu điểm lãnh thổ: ${spPlayer ? spPlayer.name : 'Tuyển thủ ' + pId}`, 'info');
        document.querySelectorAll('#specSpotlightControls .spec-spot-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.spot === String(pId));
        });
        modal.classList.add('hidden');
      });
    });

    modal.classList.remove('hidden');
  }

  onEsportsCombatEvent(event) {
    if (!event) return;
    this.setBanner(`⚡ [ESPORTS LIVE]:`, event.message);
    window.showToast(event.message, event.type === 'CAPTURE' ? 'success' : 'info');
  }

  // ------------------------------------------------------
  // 6. TURN & 30S TIMER MANAGEMENT
  // ------------------------------------------------------
  startTurn(turnIdx) {
    clearInterval(this.timerInterval);

    // Active player for this turn
    this.currentTurnIndex = turnIdx;
    const activePlayer = this.getActivePlayer();
    if (!activePlayer || activePlayer.eliminated) {
      this.nextTurn();
      return;
    }

    this.turnTimer = 30; // 30 seconds per turn
    this.remainingMoves = 1;
    this.pendingCardEffect = null;
    this.selectedCardIndex = null;

    if (activePlayer.controlledBy !== 0 && activePlayer.controlledBy !== activePlayer.id) {
      this.setBanner(`LƯỢT CỦA: ${activePlayer.name}`, `${this.getPlayerById(activePlayer.controlledBy)?.name} ĐANG THAO TÚNG TÂM LÝ VÀ ĐI THAY!`);
    } else {
      this.setBanner(`LƯỢT CỦA: ${activePlayer.name}`, `Chọn 1 ô kề cận lãnh thổ để mở rộng (hoặc kéo thả thẻ bài).`);
    }

    // Show floating turn badge at top
    this.showTurnPopup(`LƯỢT CỦA: ${activePlayer.name}`);
    sound.playTick();

    // Check Banned
    if (activePlayer.isBanned) {
      activePlayer.isBanned = false;
      this.setBanner(`🚫 ${activePlayer.name} BỊ CẤM LƯỢT!`, `Lượt này bị bỏ qua.`);
      setTimeout(() => this.nextTurn(), 1800);
      return;
    }

    // Automatic Draw at turn start
    let drawCount = 1;
    if (activePlayer.skipNextDrawToDraw3) {
      activePlayer.skipNextDrawToDraw3 = false;
      activePlayer.disabledHandTurns = 1;
      drawCount = 3;
      this.setBanner(`⚡ ${activePlayer.name} KÍCH HOẠT LÙI MỘT BƯỚC!`, `Rút 3 lá nhưng bị khóa dùng thẻ bài ở lượt này!`);
    } else if (activePlayer.hasDrawnStartingHand) {
      // Đã có lá bài đầu tiên khi bắt đầu game, lượt đầu tiên không rút thêm để người chơi bắt đầu với lá bài đầu tiên đó
      drawCount = 0;
      activePlayer.hasDrawnStartingHand = false;
    }

    for (let i = 0; i < drawCount; i++) {
      this.drawCardForPlayer(activePlayer.id, true);
    }

    // Check Exodia immediately upon drawing
    if (this.checkExodiaWin(activePlayer.id)) return;

    // Start 30s Countdown Timer
    this.updateTimerDisplay();
    this.timerInterval = setInterval(() => {
      this.turnTimer--;
      this.updateTimerDisplay();

      if (this.turnTimer <= 5 && this.turnTimer > 0) {
        sound.playTick();
      }

      if (this.turnTimer <= 0) {
        clearInterval(this.timerInterval);
        this.executeFallbackMove();
      }
    }, 1000);

    this.updateHUD();
    this.renderHandCardsUI();

    // If active player is BOT
    if (!activePlayer.isHuman && (!this.network.isOnline || this.network.isHost)) {
      setTimeout(() => this.executeBotTurn(), 1200);
    }

    if (this.network.isHost) {
      this.broadcastSnapshot();
    }
  }

  nextTurn() {
    clearInterval(this.timerInterval);

    // End-of-turn counters decrease
    const activePlayer = this.getActivePlayer();
    if (activePlayer) {
      if (activePlayer.disabledHandTurns > 0) activePlayer.disabledHandTurns--;
      if (activePlayer.rivalImmunityTurns > 0) {
        activePlayer.rivalImmunityTurns--;
        if (activePlayer.rivalImmunityTurns === 0) activePlayer.immuneAgainst = 0;
      }
      activePlayer.controlledBy = 0;
    }

    // Advance turn index in current direction
    const count = this.players.length;
    let nextIdx = (this.currentTurnIndex + this.turnDirection + count) % count;

    // Skip eliminated players
    let loopGuard = 0;
    while (this.players[nextIdx].eliminated && loopGuard < count) {
      nextIdx = (nextIdx + this.turnDirection + count) % count;
      loopGuard++;
    }

    this.turnNumber++;
    this.startTurn(nextIdx);
  }

  getActivePlayer() {
    return this.players[this.currentTurnIndex];
  }

  getPlayerById(id) {
    return this.players.find(p => p.id === id);
  }

  // Fallback move when 30s timer runs out
  executeFallbackMove() {
    const activePlayer = this.getActivePlayer();
    if (!activePlayer || activePlayer.eliminated) return;

    this.setBanner(`⏱️ HẾT THỜI GIAN 30s!`, `Hệ thống tự động đi một nước cờ thay cho ${activePlayer.name}.`);

    const validMoves = this.getValidMovesForPlayer(activePlayer.id);
    if (validMoves.length > 0) {
      const pick = validMoves[Math.floor(Math.random() * validMoves.length)];
      this.applyCellMove(pick.x, pick.y, activePlayer.id);
    } else {
      this.nextTurn();
    }
  }

  // ------------------------------------------------------
  // 7. BOARD LOGIC & FLOOD FILL ENCLOSURE (COLOR_SPILL)
  // ------------------------------------------------------
  setCellOwner(x, y, playerId) {
    if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) return;
    const oldOwner = this.grid[x][y].owner;
    if (oldOwner === playerId) return;

    // Check if cell is protected by Immortal Line
    if (this.grid[x][y].protectedUntil >= this.turnNumber && oldOwner !== 0 && oldOwner !== playerId) {
      return; // Protected
    }

    this.grid[x][y].owner = playerId;

    this.recalculateCellCounts();
    this.spawnCaptureParticles(x, y, playerId);
  }

  recalculateCellCounts() {
    this.players.forEach(p => p.cellCount = 0);
    if (!this.grid || !this.grid.length) return;
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (!this.grid[x]) continue;
      for (let y = 0; y < BOARD_SIZE; y++) {
        if (!this.grid[x][y]) continue;
        const owner = this.grid[x][y].owner;
        const p = this.getPlayerById(owner);
        if (p) p.cellCount++;
      }
    }
  }

  isAdjacentToPlayer(x, y, playerId) {
    // 8-directional adjacency (Orthogonal + Diagonal)
    const dx = [1, -1, 0, 0, 1, 1, -1, -1];
    const dy = [0, 0, 1, -1, 1, -1, 1, -1];

    for (let i = 0; i < 8; i++) {
      const nx = x + dx[i];
      const ny = y + dy[i];
      if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
        if (this.grid[nx][ny].owner === playerId) return true;
      }
    }
    return false;
  }

  getValidMovesForPlayer(playerId) {
    const valid = [];
    for (let x = 0; x < BOARD_SIZE; x++) {
      for (let y = 0; y < BOARD_SIZE; y++) {
        const cell = this.grid[x][y];
        if (cell.owner !== playerId && !cell.blocked) {
          if (cell.protectedUntil >= this.turnNumber) continue;
          if (this.isAdjacentToPlayer(x, y, playerId)) {
            valid.push({ x, y });
          }
        }
      }
    }
    return valid;
  }

  // Making 1 move immediately finishes turn as requested!
  applyCellMove(x, y, playerId) {
    if (this.remainingMoves <= 0) return false;

    this.setCellOwner(x, y, playerId);
    this.remainingMoves--;
    sound.playClick();

    // Check and apply enclosure captures
    const capturedCount = this.checkAndApplyCaptures(playerId);
    if (capturedCount > 0) {
      sound.playCapture();
      const p = this.getPlayerById(playerId);
      this.setBanner(`🌊 BAO VÂY THÀNH CÔNG!`, `${p.name} đã khép kín và nuốt trọn ${capturedCount} ô đất!`);
    }

    // Win / Lose condition checks
    if (this.checkWinConditions(playerId)) return true;

    // Automatically end turn after 1 move!
    setTimeout(() => {
      this.nextTurn();
    }, 450);

    return true;
  }

  // Exact FloodFill algorithm from Color_Spill Unity GameController.cs
  checkAndApplyCaptures(checkingPlayerId) {
    const visited = [];
    for (let x = 0; x < BOARD_SIZE; x++) {
      visited[x] = new Array(BOARD_SIZE).fill(false);
    }

    let totalCaptured = 0;

    for (let x = 0; x < BOARD_SIZE; x++) {
      for (let y = 0; y < BOARD_SIZE; y++) {
        const cell = this.grid[x][y];

        if (cell.owner !== checkingPlayerId && !visited[x][y]) {
          const group = [];
          let isEnclosed = true;

          this.floodFillCheck(x, y, visited, group, checkingPlayerId, () => {
            isEnclosed = false;
          });

          if (isEnclosed && group.length > 0) {
            group.forEach(pos => {
              if (!this.grid[pos.x][pos.y].blocked) {
                this.setCellOwner(pos.x, pos.y, checkingPlayerId);
                totalCaptured++;
              }
            });
          }
        }
      }
    }

    return totalCaptured;
  }

  floodFillCheck(startX, startY, visited, group, checkingPlayerId, onTouchBoundary) {
    const queue = [{ x: startX, y: startY }];
    visited[startX][startY] = true;

    const dx = [1, -1, 0, 0];
    const dy = [0, 0, 1, -1];

    while (queue.length > 0) {
      const curr = queue.shift();
      group.push(curr);

      if (curr.x === 0 || curr.x === BOARD_SIZE - 1 || curr.y === 0 || curr.y === BOARD_SIZE - 1) {
        onTouchBoundary();
      }

      for (let i = 0; i < 4; i++) {
        const nx = curr.x + dx[i];
        const ny = curr.y + dy[i];

        if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
          const neighbor = this.grid[nx][ny];

          if (neighbor.owner !== checkingPlayerId || neighbor.blocked) {
            if (!visited[nx][ny]) {
              visited[nx][ny] = true;
              queue.push({ x: nx, y: ny });
            }
          }
        }
      }
    }
  }

  // ------------------------------------------------------
  // 8. WIN & LOSE CONDITIONS
  // ------------------------------------------------------
  checkWinConditions(lastMovedPlayerId) {
    this.recalculateCellCounts();

    // 1. Victory by 70% territory
    const p = this.getPlayerById(lastMovedPlayerId);
    if (p && (p.cellCount / this.totalCells) >= 0.70) {
      this.finishMatch(p.id, `${p.name} đã thống trị hơn 70% lãnh thổ bản đồ!`);
      return true;
    }

    // 2. Eliminate players with 0 cells
    this.players.forEach(pl => {
      if (pl.cellCount === 0 && !pl.eliminated) {
        pl.eliminated = true;
        this.setBanner(`💀 ${pl.name} ĐÃ BỊ LOẠI!`, `Toàn bộ ô cờ đã bị kẻ địch nuốt trọn.`);
      }
    });

    const alive = this.players.filter(pl => !pl.eliminated);
    if (alive.length === 1) {
      this.finishMatch(alive[0].id, `${alive[0].name} là đấu thủ duy nhất còn sống sót trên sàn đấu!`);
      return true;
    }

    // 3. Board full of cells
    let emptyCells = 0;
    for (let x = 0; x < BOARD_SIZE; x++) {
      for (let y = 0; y < BOARD_SIZE; y++) {
        if (this.grid[x][y].owner === 0 && !this.grid[x][y].blocked) emptyCells++;
      }
    }

    if (emptyCells === 0) {
      const sorted = [...this.players].sort((a, b) => b.cellCount - a.cellCount);
      this.finishMatch(sorted[0].id, `Bàn cờ đã kín! ${sorted[0].name} dẫn đầu với ${sorted[0].cellCount} ô!`);
      return true;
    }

    return false;
  }

  checkExodiaWin(playerId) {
    const p = this.getPlayerById(playerId);
    if (!p) return false;

    const shards = ['Shard1', 'Shard2', 'Shard3', 'Shard4', 'Shard5'];
    const hasAll = shards.every(sid => p.handCards.some(c => c.id === sid));

    if (hasAll) {
      this.finishMatch(p.id, `👑 THẦN BÀI TỐI THƯỢNG! ${p.name} đã tập hợp đủ cả 5 Mảnh Vỡ Cổ Đại (Exodia)!`);
      return true;
    }
    return false;
  }

  finishMatch(winnerId, subtitle) {
    this.isMatchActive = false;
    clearInterval(this.timerInterval);

    const winner = this.getPlayerById(winnerId);
    const isMe = (winnerId === this.localPlayerId);

    if (isMe) {
      sound.playWin();
    } else {
      sound.playLose();
    }

    // Show Game Over Modal
    // Show Game Over Modal
    if (this.isSpectator) {
      document.getElementById('gameOverTitle').innerText = `🏆 TRẬN ĐẤU KẾT THÚC: ${winner ? winner.name : 'VÔ ĐỊCH'}!`;
      document.getElementById('gameOverIcon').innerText = '🏆';
      sound.playWin();
    } else {
      document.getElementById('gameOverTitle').innerText = isMe ? 'CHIẾN THẮNG HUY HOÀNG!' : `${winner ? winner.name : 'Đối thủ'} THẮNG TRẬN!`;
      document.getElementById('gameOverIcon').innerText = isMe ? '🏆' : '💀';
    }
    document.getElementById('gameOverSub').innerText = subtitle;

    const statsEl = document.getElementById('gameOverStats');
    statsEl.innerHTML = this.players.map(pl => `
      <div class="game-over-stat-row" style="color: ${pl.color}">
        <span>${pl.name} ${pl.id === winnerId ? '👑' : ''}:</span>
        <span>${pl.cellCount} ô (${((pl.cellCount / this.totalCells) * 100).toFixed(1)}%)</span>
      </div>
    `).join('');

    document.getElementById('gameOverModal').classList.remove('hidden');

    if (this.network.isHost) {
      this.network.broadcastGameOver({ winnerId, subtitle });
    }
  }

  exitMatchToLobby() {
    this.isMatchActive = false;
    clearInterval(this.timerInterval);
    sound.stopBgm();

    if (this.network.isOnline) {
      this.network.disconnect();
    }

    document.getElementById('gameScreen').classList.remove('spectator-active');
    const specBar = document.getElementById('spectatorTournamentBar');
    if (specBar) specBar.classList.add('hidden');
    document.getElementById('gameScreen').classList.add('hidden');
    document.getElementById('gameHud').classList.add('hidden');
    document.getElementById('setupScreen').classList.remove('hidden');
    this.showView('viewMain');
  }

  // ------------------------------------------------------
  // 9. CARD DRAW & TRASH DISCARD
  // ------------------------------------------------------
  drawCardForPlayer(playerId, playSound = true) {
    const p = this.getPlayerById(playerId);
    if (!p || p.handCards.length >= 5) return null;

    if (this.mainDeck.length === 0) {
      if (this.discardDeck.length > 0) {
        this.mainDeck = [...this.discardDeck];
        this.discardDeck = [];
        this.shuffle(this.mainDeck);
        sound.playShuffle();
      } else {
        return null;
      }
    }

    const card = this.mainDeck.shift();
    p.handCards.push(card);

    if (playSound && playerId === this.localPlayerId) {
      sound.playDraw();
    }

    if (this.checkExodiaWin(playerId)) return card;

    this.updateHUD();
    this.renderHandCardsUI();
    return card;
  }

  discardCard(playerId, cardIndex) {
    const p = this.getPlayerById(playerId);
    if (!p || cardIndex < 0 || cardIndex >= p.handCards.length) return;

    const removed = p.handCards.splice(cardIndex, 1)[0];
    this.discardDeck.push(removed);

    sound.playCard();
    this.updateHUD();
    this.renderHandCardsUI();
  }

  openTargetSelectModal(card, cardIndex) {
    this.pendingCardEffect = { playerId: this.localPlayerId, card, cardIndex };
    const modalEl = document.getElementById('targetSelectModal');
    const gridEl = document.getElementById('targetOptionsGrid');
    const subTitleEl = document.getElementById('targetSelectSubtitle');
    if (!gridEl || !modalEl) return;

    gridEl.innerHTML = '';
    if (subTitleEl) {
      subTitleEl.innerText = `Chọn 1 đối thủ bạn muốn nhắm đến khi thi triển "${card.name}":`;
    }

    const opponents = this.players.filter(op => op.id !== this.localPlayerId && !op.eliminated);
    if (opponents.length === 0) {
      window.showToast('Không còn đối thủ nào khả dụng trên sàn đấu!', 'warning');
      return;
    }

    opponents.forEach(op => {
      const hasShield = op.handCards.some(c => c.id === 'Shield');
      const hasCounter = op.handCards.some(c => c.id === 'Counter');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'target-card-btn';
      btn.innerHTML = `
        <div class="target-card-avatar" style="background: ${op.color}; box-shadow: 0 0 10px ${op.color};"></div>
        <div class="target-card-details">
          <div class="target-card-name">${op.name}</div>
          <div class="target-card-meta">🏰 ${op.cellCount} ô • 🃏 ${op.handCards.length} thẻ trên tay</div>
          <div class="target-card-tags">
            ${hasShield ? '<span class="buff-tag">🛡️ Khiên</span>' : ''}
            ${hasCounter ? '<span class="buff-tag">⚔️ Phản Đòn</span>' : ''}
          </div>
        </div>
        <div class="target-card-select-icon">🎯</div>
      `;
      btn.addEventListener('click', () => {
        sound.playClick();
        modalEl.classList.add('hidden');
        this.pendingCardEffect = null;
        this.executeCardEffect(this.localPlayerId, card, cardIndex, { targetPlayerId: op.id });
      });
      gridEl.appendChild(btn);
    });

    modalEl.classList.remove('hidden');
  }

  triggerCardCastSpotlight(attacker, card, target = null) {
    const el = document.getElementById('cardCastSpotlight');
    if (!el) return;

    const img = document.getElementById('cardCastImg');
    const badge = document.getElementById('cardCastBadge');
    const title = document.getElementById('cardCastTitle');
    const user = document.getElementById('cardCastUser');
    const desc = document.getElementById('cardCastDesc');
    const glow = document.getElementById('cardCastGlow');

    if (img) img.src = card.icon;
    if (title) title.innerText = card.name;
    if (desc) desc.innerText = card.desc;

    let targetText = '';
    if (target) {
      targetText = ` ➔ nhắm vào ${target.name}`;
    }
    if (user) user.innerText = `⚡ ${attacker.name} đang thi triển${targetText}`;

    if (badge) {
      badge.className = 'card-cast-badge';
      if (card.id.startsWith('Shard')) {
        badge.classList.add('exodia');
        badge.innerText = '👑 THẦN BÀI EXODIA';
      } else if (card.type === 'Buff') {
        badge.classList.add('buff');
        badge.innerText = '✨ BUFF HỖ TRỢ';
      } else if (card.type === 'Debuff') {
        badge.classList.add('debuff');
        badge.innerText = '🔥 DEBUFF TẤN CÔNG';
      } else {
        badge.classList.add('neutral');
        badge.innerText = '🌀 CHIẾN THUẬT';
      }
    }

    if (glow) {
      const tintColor = card.id.startsWith('Shard') ? 'rgba(255, 215, 0, 0.4)' : (card.type === 'Debuff' ? 'rgba(255, 56, 100, 0.4)' : 'rgba(0, 229, 255, 0.4)');
      glow.style.background = `radial-gradient(circle, ${tintColor} 0%, transparent 65%)`;
    }

    el.classList.remove('hidden');
    clearTimeout(this.spotlightTimeout);
    this.spotlightTimeout = setTimeout(() => {
      el.classList.add('hidden');
    }, 1100);
  }

  // ------------------------------------------------------
  // 10. CARD EFFECT EXECUTION ENGINE
  // ------------------------------------------------------
  executeCardEffect(attackerId, card, cardIndex, params = {}) {
    const attacker = this.getPlayerById(attackerId);
    if (!attacker) return;

    // 1. BIẾN MẤT KHỎI TAY NGAY LẬP TỨC: Tiêu thụ thẻ và render lại khay bài
    if (cardIndex >= 0 && cardIndex < attacker.handCards.length) {
      attacker.handCards.splice(cardIndex, 1);
    }
    this.discardDeck.push(card);
    attacker.usedCardsCount = (attacker.usedCardsCount || 0) + 1;

    // Cập nhật giao diện bài trên tay và HUD ngay lập tức
    this.renderHandCardsUI();
    this.updateHUD();
    sound.playCard();

    const target = params.targetPlayerId ? this.getPlayerById(params.targetPlayerId) : null;

    // 2. SHOW SPOTLIGHT HIỆU ỨNG TUNG CHIÊU RỰC RỠ
    this.triggerCardCastSpotlight(attacker, card, target);
    this.setBanner(`🎴 ${attacker.name} DÙNG THẺ: ${card.name}`, card.desc);

    // --- PASSIVE DEFENSE: COUNTER & SHIELD IN HAND TRIGGER ---
    if (target && card.type === 'Debuff') {
      // 1. Check if target holds a 'Counter' card in hand
      const counterIdx = target.handCards.findIndex(c => c.id === 'Counter');
      if (counterIdx >= 0) {
        // Consume 1 Counter card from hand
        const consumedCounter = target.handCards.splice(counterIdx, 1)[0];
        this.discardDeck.push(consumedCounter);

        sound.playCard();
        this.setBanner(`⚔️ PHẢN ĐÒN TỰ ĐỘNG KÍCH HOẠT!`, `${target.name} đã dùng Phản Đòn trong túi để hất ngược hiệu ứng ${card.name} về lại ${attacker.name}!`);

        // Reverse effect back to attacker
        this.applyDirectDebuff(attacker, card);
        this.updateHUD();
        this.renderHandCardsUI();
        return;
      }

      // 2. Check if target holds a 'Shield' card in hand
      const shieldIdx = target.handCards.findIndex(c => c.id === 'Shield');
      if (shieldIdx >= 0) {
        // Consume 1 Shield card from hand
        const consumedShield = target.handCards.splice(shieldIdx, 1)[0];
        this.discardDeck.push(consumedShield);

        sound.playCard();
        this.setBanner(`🛡️ KHIÊN TỰ ĐỘNG KÍCH HOẠT!`, `${target.name} đã dùng Khiên trong túi để chặn đứng hoàn toàn hiệu ứng ${card.name} từ ${attacker.name}!`);

        this.updateHUD();
        this.renderHandCardsUI();
        return;
      }

      // 3. Rival Immunity check
      if (target.immuneAgainst === attacker.id && target.rivalImmunityTurns > 0) {
        this.setBanner(`🌟 MIỄN NHIỄM!`, `${target.name} đang miễn nhiễm mọi chiêu thức từ ${attacker.name}!`);
        this.updateHUD();
        this.renderHandCardsUI();
        return;
      }
    }

    // Process specific card effect
    switch (card.id) {
      case 'UnexpectedLuck':
        this.drawCardForPlayer(attackerId, true);
        this.drawCardForPlayer(attackerId, true);
        break;

      case 'GainMomentum':
        attacker.skipNextDrawToDraw3 = true;
        break;

      case 'CardCollection':
        const bonusDraws = Math.max(1, Math.floor(attacker.cellCount / 12));
        for (let i = 0; i < bonusDraws; i++) this.drawCardForPlayer(attackerId, true);
        break;

      case 'Nuke':
        // Claim 3 random empty cells
        const empties = [];
        for (let x = 0; x < BOARD_SIZE; x++) {
          for (let y = 0; y < BOARD_SIZE; y++) {
            if (this.grid[x][y].owner === 0 && !this.grid[x][y].blocked) empties.push({ x, y });
          }
        }
        for (let i = 0; i < 3 && empties.length > 0; i++) {
          const randIdx = Math.floor(Math.random() * empties.length);
          const chosen = empties.splice(randIdx, 1)[0];
          this.setCellOwner(chosen.x, chosen.y, attackerId);
        }
        this.checkAndApplyCaptures(attackerId);
        break;

      case 'BanTurn':
        if (target) target.isBanned = true;
        break;

      case 'DisableOnHand':
        if (target) target.disabledHandTurns = 2;
        break;

      case 'Rival':
        if (target) {
          attacker.rivalImmunityTurns = 3;
          attacker.immuneAgainst = target.id;
        }
        break;

      case 'LoseControl':
        if (target) target.isLostControl = true;
        break;

      case 'Psyco':
        if (target) target.controlledBy = attacker.id;
        break;

      case 'SwapCard':
        if (target) {
          const temp = [...attacker.handCards];
          attacker.handCards = [...target.handCards];
          target.handCards = temp;
          this.checkExodiaWin(attacker.id);
          this.checkExodiaWin(target.id);
        }
        break;

      case 'StealCard':
        if (target) {
          this.startMysteryStealMinigame(attacker, target);
        }
        break;

      case 'ShowCard':
        if (target) {
          this.openPeepModal(target);
        }
        break;

      case 'BodySwap':
        if (target) {
          for (let x = 0; x < BOARD_SIZE; x++) {
            for (let y = 0; y < BOARD_SIZE; y++) {
              if (this.grid[x][y].owner === attacker.id) {
                this.grid[x][y].owner = target.id;
              } else if (this.grid[x][y].owner === target.id) {
                this.grid[x][y].owner = attacker.id;
              }
            }
          }
          this.recalculateCellCounts();
          this.setBanner(`🔄 HOÁN ĐỔI THỂ XÁC THÀNH CÔNG!`, `${attacker.name} và ${target.name} đã tráo đổi toàn bộ lãnh thổ!`);
        }
        break;

      case 'ReverseWind':
        this.turnDirection *= -1;
        this.setBanner(`🌪️ GIÓ ĐỔI CHIỀU!`, `Thứ tự lượt đi giữa các người chơi đã quay ngược lại!`);
        break;

      case 'PeaceWorld':
        this.players.forEach(pl => pl.disabledHandTurns = 3);
        this.setBanner(`🕊️ NGÀY HOÀ BÌNH!`, `Toàn bộ người chơi bị vô hiệu hoá sử dụng thẻ bài trong 3 lượt!`);
        break;

      case 'RockPaperScissor':
        if (target) {
          this.startRPSMinigame(attacker, target);
        }
        break;

      case 'BlockCell':
        if (params.cellX !== undefined && params.cellY !== undefined) {
          this.grid[params.cellX][params.cellY].blocked = true;
          this.grid[params.cellX][params.cellY].owner = 0;
          this.setBanner(`⛔ ĐÃ PHONG ẤN Ô (${params.cellX}, ${params.cellY})!`, `Ô này đã bị khóa vĩnh viễn không ai có thể chiếm.`);
        }
        break;

      case 'CastleIsolate':
        if (params.cellX !== undefined && params.cellY !== undefined) {
          const cx = params.cellX;
          const cy = params.cellY;
          for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
              if (dx === 0 && dy === 0) continue;
              const nx = cx + dx;
              const ny = cy + dy;
              if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE && !this.grid[nx][ny].blocked) {
                this.setCellOwner(nx, ny, attacker.id);
              }
            }
          }
          this.checkAndApplyCaptures(attacker.id);
          this.setBanner(`🏰 LÂU ĐÀI CÔ ĐỘC!`, `Đã chiếm thành công 8 ô xung quanh ô (${cx}, ${cy})!`);
        }
        break;

      case 'ImortalLine':
        if (params.cellX !== undefined && params.cellY !== undefined) {
          const cx = params.cellX;
          const cy = params.cellY;
          for (let i = 0; i < BOARD_SIZE; i++) {
            if (this.grid[i][cy].owner === attacker.id) this.grid[i][cy].protectedUntil = this.turnNumber + 3;
            if (this.grid[cx][i].owner === attacker.id) this.grid[cx][i].protectedUntil = this.turnNumber + 3;
          }
          this.setBanner(`✝️ TUYẾN BẤT TỬ!`, `Toàn bộ ô cờ chữ thập qua ô (${cx}, ${cy}) được bảo vệ trong 3 vòng!`);
        }
        break;
    }

    this.checkExodiaWin(attacker.id);
    this.updateHUD();
    this.renderHandCardsUI();
  }

  applyDirectDebuff(victim, card) {
    if (card.id === 'BanTurn') victim.isBanned = true;
    if (card.id === 'DisableOnHand') victim.disabledHandTurns = 2;
    if (card.id === 'LoseControl') victim.isLostControl = true;
  }

  // ------------------------------------------------------
  // 11. MYSTERY STEAL CARD MINIGAME (SHUFFLE '?')
  // ------------------------------------------------------
  startMysteryStealMinigame(attacker, victim) {
    if (!victim || victim.handCards.length === 0) {
      this.setBanner(`🕵️ THẤT BẠI:`, `${victim.name} không còn lá bài nào trên tay để trộm!`);
      return;
    }

    if (attacker.isHuman) {
      // Create shuffled shadow deck of victim's cards
      const shuffledDeck = victim.handCards.map((c, i) => ({ card: c, originalIndex: i }));
      this.shuffle(shuffledDeck);

      const modal = document.getElementById('stealCardModal');
      const cardsRow = document.getElementById('mysteryCardsRow');
      const revealBox = document.getElementById('stealRevealResult');
      revealBox.classList.add('hidden');
      cardsRow.innerHTML = '';

      document.getElementById('stealModalSub').innerText = `Bài trên tay của ${victim.name} (${victim.handCards.length} lá) đã được xáo trộn ngẫu nhiên! Hãy chọn 1 lá có dấu ❓ để cướp:`;

      shuffledDeck.forEach((item, slotIdx) => {
        const mysteryCard = document.createElement('div');
        mysteryCard.className = 'mystery-card-item';
        mysteryCard.innerHTML = `
          <div class="mystery-question-mark">?</div>
          <div class="mystery-card-sub">LÁ SỐ ${slotIdx + 1}</div>
        `;

        mysteryCard.addEventListener('click', () => {
          sound.playDraw();
          // Steal this card
          const stolenCard = victim.handCards.splice(item.originalIndex, 1)[0];
          attacker.handCards.push(stolenCard);

          // Reveal card
          document.getElementById('stealRevealImg').src = stolenCard.icon;
          document.getElementById('stealRevealName').innerText = stolenCard.name;
          document.getElementById('stealRevealText').innerText = `🎉 Bạn đã trộm thành công lá [${stolenCard.name}] từ ${victim.name}!`;
          revealBox.classList.remove('hidden');

          this.checkExodiaWin(attacker.id);
          this.updateHUD();
          this.renderHandCardsUI();

          setTimeout(() => {
            modal.classList.add('hidden');
            this.setBanner(`🕵️ TRỘM THÀNH CÔNG!`, `Bạn đã trộm được thẻ [${stolenCard.name}] từ tay ${victim.name}!`);
          }, 1800);
        });

        cardsRow.appendChild(mysteryCard);
      });

      modal.classList.remove('hidden');
    } else {
      // Bot randomly steals 1 card
      const randIdx = Math.floor(Math.random() * victim.handCards.length);
      const stolen = victim.handCards.splice(randIdx, 1)[0];
      attacker.handCards.push(stolen);
      this.setBanner(`🕵️ ${attacker.name} TRỘM BÀI!`, `${attacker.name} đã lấy cắp 1 lá bài bí mật từ tay ${victim.name}!`);
      this.checkExodiaWin(attacker.id);
      this.updateHUD();
      this.renderHandCardsUI();
    }
  }

  openPeepModal(targetPlayer) {
    document.getElementById('peepTargetName').innerText = `Bài trên tay của ${targetPlayer.name} (${targetPlayer.handCards.length} lá):`;
    const gridEl = document.getElementById('peepCardsGrid');
    gridEl.innerHTML = targetPlayer.handCards.map(c => `
      <div class="catalog-card-item">
        <img src="${c.icon}" class="catalog-card-img" />
        <div>
          <div class="catalog-card-name">${c.name}</div>
          <div class="catalog-card-desc">${c.desc}</div>
        </div>
      </div>
    `).join('') || '<div style="color: var(--text-muted);">Đối thủ không còn lá bài nào trên tay.</div>';

    document.getElementById('peepCardsModal').classList.remove('hidden');
  }

  // ------------------------------------------------------
  // 12. ROCK PAPER SCISSORS MINIGAME
  // ------------------------------------------------------
  startRPSMinigame(p1, p2) {
    this.rpsP1 = p1;
    this.rpsP2 = p2;

    if (p1.isHuman) {
      document.getElementById('rpsPromptText').innerText = `Thách đấu Oẳn Tù Tì với ${p2.name}! Hãy ra chiêu:`;
      document.getElementById('rpsResultText').innerText = '';
      document.getElementById('rpsModal').classList.remove('hidden');
    } else {
      const choices = ['rock', 'paper', 'scissors'];
      const c1 = choices[Math.floor(Math.random() * 3)];
      const c2 = choices[Math.floor(Math.random() * 3)];
      this.resolveRPS(c1, c2);
    }
  }

  handleRPSChoice(humanChoice) {
    const choices = ['rock', 'paper', 'scissors'];
    const botChoice = choices[Math.floor(Math.random() * 3)];
    this.resolveRPS(humanChoice, botChoice);
  }

  resolveRPS(c1, c2) {
    const resultEl = document.getElementById('rpsResultText');
    const label = { rock: '✊ BÚA', paper: '✋ BAO', scissors: '✌️ KÉO' };

    let winner = null;
    if (c1 === c2) {
      resultEl.innerText = `Hoà nhau (${label[c1]} vs ${label[c2]})! Thử lại...`;
      return;
    }

    if ((c1 === 'rock' && c2 === 'scissors') || (c1 === 'scissors' && c2 === 'paper') || (c1 === 'paper' && c2 === 'rock')) {
      winner = this.rpsP1;
      resultEl.innerText = `🎉 ${this.rpsP1.name} THẮNG! (${label[c1]} đánh bại ${label[c2]})`;
    } else {
      winner = this.rpsP2;
      resultEl.innerText = `💥 ${this.rpsP2.name} THẮNG! (${label[c2]} đánh bại ${label[c1]})`;
    }

    setTimeout(() => {
      document.getElementById('rpsModal').classList.add('hidden');
      const loser = (winner === this.rpsP1) ? this.rpsP2 : this.rpsP1;
      this.rewardRPSWinner(winner, loser);
    }, 1400);
  }

  rewardRPSWinner(winner, loser) {
    let stolen = 0;
    for (let x = 0; x < BOARD_SIZE && stolen < 3; x++) {
      for (let y = 0; y < BOARD_SIZE && stolen < 3; y++) {
        if (this.grid[x][y].owner === loser.id && this.isAdjacentToPlayer(x, y, winner.id)) {
          this.setCellOwner(x, y, winner.id);
          stolen++;
        }
      }
    }
    this.setBanner(`🏆 KẾT QUẢ OẰN TÙ TÌ:`, `${winner.name} thắng và cướp ${stolen} ô đất từ ${loser.name}!`);
    this.checkAndApplyCaptures(winner.id);
    this.updateHUD();
  }

  // ------------------------------------------------------
  // 13. BOT AI LOGIC (INTELLIGENT DECISION MAKING)
  // ------------------------------------------------------
  executeBotTurn() {
    const bot = this.getActivePlayer();
    if (!bot || bot.isHuman || bot.eliminated || !this.isMatchActive) return;

    // Try playing a non-passive card
    if (bot.disabledHandTurns === 0 && bot.handCards.length > 0) {
      const cardToPlayIdx = this.chooseBotCard(bot);
      if (cardToPlayIdx >= 0) {
        const card = bot.handCards[cardToPlayIdx];
        this.playBotCard(bot.id, cardToPlayIdx, card);
        setTimeout(() => this.executeBotMove(bot), 800);
        return;
      }
    }

    this.executeBotMove(bot);
  }

  chooseBotCard(bot) {
    // Only non-passive cards
    const idxNuke = bot.handCards.findIndex(c => c.id === 'Nuke');
    if (idxNuke >= 0) return idxNuke;

    const idxDraw = bot.handCards.findIndex(c => c.id === 'UnexpectedLuck');
    if (idxDraw >= 0 && bot.handCards.length <= 3) return idxDraw;

    const idxBan = bot.handCards.findIndex(c => c.id === 'BanTurn');
    if (idxBan >= 0) return idxBan;

    const idxSteal = bot.handCards.findIndex(c => c.id === 'StealCard');
    if (idxSteal >= 0) return idxSteal;

    return -1;
  }

  playBotCard(botId, cardIndex, card) {
    if (card.target === 'opponent' || card.target === 'opponent_steal') {
      const targets = this.players.filter(op => op.id !== botId && !op.eliminated);
      targets.sort((a, b) => b.cellCount - a.cellCount);
      if (targets.length > 0) {
        this.executeCardEffect(botId, card, cardIndex, { targetPlayerId: targets[0].id });
      }
    } else {
      this.executeCardEffect(botId, card, cardIndex, {});
    }
  }

  executeBotMove(bot) {
    if (!this.isMatchActive) return;
    const validMoves = this.getValidMovesForPlayer(bot.id);
    if (validMoves.length === 0) {
      this.nextTurn();
      return;
    }

    let bestMove = validMoves[0];
    let bestScore = -999;

    validMoves.forEach(m => {
      let score = 0;
      const distToCenter = Math.hypot(m.x - 7.5, m.y - 7.5);
      score += (10 - distToCenter);

      if (this.grid[m.x][m.y].owner !== 0) score += 15;

      if (score > bestScore) {
        bestScore = score;
        bestMove = m;
      }
    });

    this.applyCellMove(bestMove.x, bestMove.y, bot.id);
  }

  // ------------------------------------------------------
  // 14. CANVAS INTERACTION & RENDERING
  // ------------------------------------------------------
  initCanvasEvents() {
    let lastTouchTime = 0;

    // Mobile Touch / Pointer Tap support
    this.canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') {
        lastTouchTime = Date.now();
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = Math.floor(((e.clientX - rect.left) * scaleX) / this.cellSize);
        const y = Math.floor(((e.clientY - rect.top) * scaleY) / this.cellSize);

        if (x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE) {
          this.hoverCell = { x, y };
          if (this.isMatchActive) {
            this.handleCanvasCellClick(x, y);
          }
        }
      }
    }, { passive: true });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const x = Math.floor(((e.clientX - rect.left) * scaleX) / this.cellSize);
      const y = Math.floor(((e.clientY - rect.top) * scaleY) / this.cellSize);

      if (x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE) {
        this.hoverCell = { x, y };
      } else {
        this.hoverCell = null;
      }
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.hoverCell = null;
    });

    this.canvas.addEventListener('click', (e) => {
      if (Date.now() - lastTouchTime < 450) return; // Prevent duplicate event from touch
      if (!this.hoverCell || !this.isMatchActive) return;
      this.handleCanvasCellClick(this.hoverCell.x, this.hoverCell.y);
    });
  }

  handleCanvasCellClick(x, y) {
    if (this.isSpectator) {
      const cell = this.grid[x] ? this.grid[x][y] : null;
      if (cell && cell.owner !== 0) {
        sound.playClick();
        if (this.spectatorSpotlightPlayerId === cell.owner) {
          this.spectatorSpotlightPlayerId = null;
          window.showToast('🎥 Đã tắt tiêu điểm, xem toàn cảnh đấu trường', 'info');
        } else {
          this.spectatorSpotlightPlayerId = cell.owner;
          const p = this.getPlayerById(cell.owner);
          window.showToast(`🎥 Đang chiếu tiêu điểm lãnh thổ: ${p ? p.name : 'Tuyển thủ ' + cell.owner}`, 'info');
        }
        document.querySelectorAll('#specSpotlightControls .spec-spot-btn').forEach(b => {
          b.classList.toggle('active', this.spectatorSpotlightPlayerId ? b.dataset.spot === String(this.spectatorSpotlightPlayerId) : b.dataset.spot === 'all');
        });
      }
      return;
    }

    const active = this.getActivePlayer();
    if (!active) return;

    const controllerId = active.controlledBy !== 0 ? active.controlledBy : active.id;
    if (controllerId !== this.localPlayerId) return;

    // 1. If waiting for a cell target card click (Phong Ấn Ô, Lâu Đài Cô Độc, Tuyến Bất Tử)
    if (this.pendingCardEffect) {
      const { playerId, card, cardIndex } = this.pendingCardEffect;

      if (card.target === 'cell_empty') {
        if (this.grid[x][y].owner !== 0 || this.grid[x][y].blocked) {
          sound.playTick();
          this.setBanner(`⚠️ Ô (${x}, ${y}) ĐÃ CÓ CHỦ HOẶC BỊ KHÓA!`, `Vui lòng bấm vào 1 ô TRỐNG chưa có ai chiếm để áp dụng ${card.name}.`);
          return;
        }
      } else if (card.target === 'cell') {
        if (this.grid[x][y].owner !== playerId) {
          sound.playTick();
          this.setBanner(`⚠️ Ô (${x}, ${y}) KHÔNG THUỘC LÃNH THỔ BẠN!`, `Vui lòng bấm vào 1 ô của bạn để áp dụng ${card.name}.`);
          return;
        }
      }

      this.pendingCardEffect = null;
      this.selectedCardIndex = null;
      this.executeCardEffect(playerId, card, cardIndex, { cellX: x, cellY: y });
      return;
    }

    // 2. If a card is selected from hand (Tap-to-Select mechanic on Mobile/PC)
    if (this.selectedCardIndex !== null) {
      if (active.id !== this.localPlayerId) {
        window.showToast('Chưa đến lượt của bạn!', 'warning');
        return;
      }
      const myPlayer = this.getPlayerById(this.localPlayerId);
      if (!myPlayer) return;
      const card = myPlayer.handCards[this.selectedCardIndex];
      const cardIndex = this.selectedCardIndex;
      this.selectedCardIndex = null;
      this.renderHandCardsUI();

      this.handleCardDropOnBoard(card, cardIndex, x, y);
      return;
    }

    // Normal Cell Move
    if (this.remainingMoves <= 0) return;

    const cell = this.grid[x][y];
    if (cell.owner === active.id) return;
    if (cell.blocked) {
      window.showToast('Ô này đã bị phong ấn, không ai có thể chiếm!', 'warning');
      return;
    }
    if (cell.protectedUntil >= this.turnNumber) {
      window.showToast('Ô này đang được bảo vệ bởi Tuyến Bất Tử!', 'warning');
      return;
    }

    if (!this.isAdjacentToPlayer(x, y, active.id)) {
      window.showToast('Nước đi không hợp lệ! Bạn chỉ có thể chiếm ô nằm kề cận (8 hướng) với lãnh thổ của mình.', 'warning');
      return;
    }

    if (this.network.isOnline && !this.network.isHost) {
      this.network.sendActionToHost({ type: 'CELL_CLICK', x, y });
    } else {
      this.applyCellMove(x, y, active.id);
    }
  }

  startRenderingLoop() {
    const render = () => {
      this.drawBoard();
      this.animFrameId = requestAnimationFrame(render);
    };
    render();
  }

  drawBoard() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const activePlayer = this.getActivePlayer();
    const activeId = activePlayer ? activePlayer.id : 0;
    const time = Date.now() * 0.003;

    // Draw grid cells
    for (let x = 0; x < BOARD_SIZE; x++) {
      for (let y = 0; y < BOARD_SIZE; y++) {
        const px = x * this.cellSize;
        const py = y * this.cellSize;
        const cell = this.grid[x] ? this.grid[x][y] : null;

        if (!cell) continue;

        if (cell.blocked) {
          ctx.fillStyle = '#2d0a14';
          ctx.fillRect(px, py, this.cellSize, this.cellSize);
          ctx.strokeStyle = '#ff3366';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(px + 1, py + 1, this.cellSize - 2, this.cellSize - 2);

          ctx.font = '16px Montserrat';
          ctx.fillStyle = '#ff3366';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🔒', px + this.cellSize / 2, py + this.cellSize / 2);
          continue;
        }

        if (cell.owner === 0) {
          ctx.fillStyle = '#101322';
          ctx.fillRect(px, py, this.cellSize, this.cellSize);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
          ctx.lineWidth = 1;
          ctx.strokeRect(px, py, this.cellSize, this.cellSize);
        } else {
          const p = this.getPlayerById(cell.owner);
          ctx.fillStyle = p ? p.color : '#444';
          ctx.fillRect(px, py, this.cellSize, this.cellSize);

          const grad = ctx.createLinearGradient(px, py, px + this.cellSize, py + this.cellSize);
          grad.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
          grad.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
          ctx.fillStyle = grad;
          ctx.fillRect(px, py, this.cellSize, this.cellSize);

          ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.lineWidth = 1;
          ctx.strokeRect(px, py, this.cellSize, this.cellSize);

          if (cell.protectedUntil >= this.turnNumber) {
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 2;
            ctx.strokeRect(px + 2, py + 2, this.cellSize - 4, this.cellSize - 4);
            ctx.fillStyle = '#ffd700';
            ctx.font = '12px Montserrat';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('✝️', px + this.cellSize / 2, py + this.cellSize / 2);
          }

          // SPECTATOR SPOTLIGHT TERRITORY GLOW (LIÊN QUÂN ESPORTS CAMERA FOCUS)
          if (this.isSpectator && this.spectatorSpotlightPlayerId !== null && cell.owner === this.spectatorSpotlightPlayerId) {
            const pulse = (Math.sin(Date.now() * 0.008) + 1) * 0.5;
            ctx.save();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2.5 + pulse * 1.5;
            ctx.shadowColor = p ? p.color : '#00e5ff';
            ctx.shadowBlur = 10 + pulse * 8;
            ctx.strokeRect(px + 1.5, py + 1.5, this.cellSize - 3, this.cellSize - 3);
            ctx.restore();
          }
        }
      }
    }

    // Highlight Valid Adjacent Moves for current player with Neon Pulsing Border (chỉ hiện khi không chọn thẻ)
    if (this.isMatchActive && activePlayer && this.remainingMoves > 0 && !this.pendingCardEffect) {
      const valid = this.getValidMovesForPlayer(activeId);
      const pulse = 0.5 + 0.5 * Math.sin(time * 3);

      valid.forEach(v => {
        const px = v.x * this.cellSize;
        const py = v.y * this.cellSize;

        ctx.strokeStyle = activePlayer.color;
        ctx.lineWidth = 2 + pulse * 1.5;
        ctx.strokeRect(px + 2, py + 2, this.cellSize - 4, this.cellSize - 4);

        ctx.fillStyle = activePlayer.color;
        ctx.beginPath();
        ctx.arc(px + this.cellSize / 2, py + this.cellSize / 2, 3 + pulse * 2, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Highlight Targetable Cells in Card Targeting Mode (Phong Ấn Ô, Lâu Đài Cô Độc, Tuyến Bất Tử)
    if (this.isMatchActive && this.pendingCardEffect) {
      const { card } = this.pendingCardEffect;
      const pulse = 0.5 + 0.5 * Math.sin(time * 6);
      const isBlock = card.id === 'BlockCell';
      const highlightColor = isBlock ? `rgba(255, 56, 100, ${0.4 + pulse * 0.45})` : `rgba(0, 229, 255, ${0.4 + pulse * 0.45})`;

      for (let x = 0; x < BOARD_SIZE; x++) {
        for (let y = 0; y < BOARD_SIZE; y++) {
          const isValid = card.target === 'cell_empty'
            ? (this.grid[x][y].owner === 0 && !this.grid[x][y].blocked)
            : (this.grid[x][y].owner === this.localPlayerId);

          if (isValid) {
            const px = x * this.cellSize;
            const py = y * this.cellSize;
            ctx.strokeStyle = highlightColor;
            ctx.lineWidth = 1.8 + pulse;
            ctx.strokeRect(px + 2, py + 2, this.cellSize - 4, this.cellSize - 4);
          }
        }
      }
    }

    // Hover Cell Highlight & Crosshair
    if (this.hoverCell && this.isMatchActive) {
      const hx = this.hoverCell.x * this.cellSize;
      const hy = this.hoverCell.y * this.cellSize;

      if (this.pendingCardEffect) {
        const { card } = this.pendingCardEffect;
        const isValid = card.target === 'cell_empty'
          ? (this.grid[this.hoverCell.x][this.hoverCell.y].owner === 0 && !this.grid[this.hoverCell.x][this.hoverCell.y].blocked)
          : (this.grid[this.hoverCell.x][this.hoverCell.y].owner === this.localPlayerId);

        if (isValid) {
          ctx.strokeStyle = '#00e5ff';
          ctx.lineWidth = 3;
          ctx.strokeRect(hx + 1, hy + 1, this.cellSize - 2, this.cellSize - 2);

          ctx.font = '16px Montserrat';
          ctx.fillStyle = '#00e5ff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🎯', hx + this.cellSize / 2, hy + this.cellSize / 2);
        } else {
          ctx.strokeStyle = '#ff3864';
          ctx.lineWidth = 2;
          ctx.strokeRect(hx + 1, hy + 1, this.cellSize - 2, this.cellSize - 2);

          ctx.font = '14px Montserrat';
          ctx.fillStyle = '#ff3864';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🚫', hx + this.cellSize / 2, hy + this.cellSize / 2);
        }
      } else {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(hx + 1, hy + 1, this.cellSize - 2, this.cellSize - 2);
      }
    }

    // Render Particles
    this.updateAndDrawParticles(ctx);
  }

  spawnCaptureParticles(x, y, playerId) {
    const p = this.getPlayerById(playerId);
    const color = p ? p.color : '#00e5ff';
    const cx = x * this.cellSize + this.cellSize / 2;
    const cy = y * this.cellSize + this.cellSize / 2;

    for (let i = 0; i < 6; i++) {
      this.particles.push({
        x: cx,
        y: cy,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        life: 1.0,
        color: color,
        size: Math.random() * 4 + 2
      });
    }
  }

  updateAndDrawParticles(ctx) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.life -= 0.04;

      if (pt.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = pt.life;
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // ------------------------------------------------------
  // 15. UI & HUD UPDATES
  // ------------------------------------------------------
  updateHUD() {
    this.recalculateCellCounts();

    const p1Count = this.players[0] ? this.players[0].cellCount : 0;
    const p2Count = this.players[1] ? this.players[1].cellCount : 0;
    const p3Count = this.players[2] ? this.players[2].cellCount : 0;
    const p4Count = this.players[3] ? this.players[3].cellCount : 0;

    const p1Pct = ((p1Count / this.totalCells) * 100).toFixed(1);
    const p2Pct = ((p2Count / this.totalCells) * 100).toFixed(1);
    const p3Pct = ((p3Count / this.totalCells) * 100).toFixed(1);
    const p4Pct = ((p4Count / this.totalCells) * 100).toFixed(1);

    document.getElementById('barP1').style.width = p1Pct + '%';
    document.getElementById('barP2').style.width = p2Pct + '%';
    document.getElementById('barP3').style.width = p3Pct + '%';
    document.getElementById('barP4').style.width = p4Pct + '%';

    const badgesEl = document.getElementById('hudPlayerBadges');
    if (badgesEl) {
      badgesEl.innerHTML = this.players.map(p => {
        const shortName = p.name.length > 7 ? p.name.substring(0, 6) + '…' : p.name;
        const pct = ((p.cellCount / this.totalCells) * 100).toFixed(1);
        return `
          <span class="hud-badge" title="${p.name}: ${pct}%">
            <span class="hud-badge-dot" style="background: ${p.color}; box-shadow: 0 0 6px ${p.color};"></span>
            <span class="hud-badge-name">${shortName}</span>
            <strong class="hud-badge-pct">${pct}%</strong>
          </span>
        `;
      }).join('');
    }

    const active = this.getActivePlayer();
    if (active) {
      const pNameEl = document.getElementById('turnPlayerName');
      if (pNameEl) pNameEl.innerText = active.name;
      const pDotEl = document.getElementById('turnIndicatorDot');
      if (pDotEl) {
        pDotEl.style.background = active.color;
        pDotEl.style.boxShadow = `0 0 10px ${active.color}`;
      }
    }

    const pListEl = document.getElementById('playersList');
    if (pListEl) {
      pListEl.innerHTML = this.players.map((p, idx) => {
        const isTurn = (idx === this.currentTurnIndex);
        const isYou = (p.id === this.localPlayerId);
        const pct = ((p.cellCount / this.totalCells) * 100).toFixed(1);

        // Check if has passive Shield or Counter in hand
        const hasShieldInHand = p.handCards.some(c => c.id === 'Shield');
        const hasCounterInHand = p.handCards.some(c => c.id === 'Counter');

        return `
          <div class="player-card ${isTurn ? 'active-turn' : ''} ${p.eliminated ? 'eliminated' : ''}">
            <div class="pcard-top">
              <div class="pcard-avatar" style="background: ${p.color}; color: ${p.color};"></div>
              <span class="pcard-name">${p.name} ${isYou ? '<span class="badge-you">(BẠN)</span>' : ''}</span>
              <span class="pcard-pct">${pct}%</span>
            </div>
            <div class="pcard-meta">
              <span class="pcard-castles">🏰 ${p.cellCount} ô</span>
              <span class="pcard-meta-pill" title="Số thẻ bài đang cầm trên tay">🃏 ${p.handCards.length}/5</span>
            </div>
            <div class="pcard-buffs">
              ${hasShieldInHand ? '<span class="buff-tag">🛡️ Khiên Sẵn Sàng</span>' : ''}
              ${hasCounterInHand ? '<span class="buff-tag">⚔️ Phản Sẵn Sàng</span>' : ''}
              ${p.isBanned ? '<span class="buff-tag" style="color: red;">🚫 Cấm Lượt</span>' : ''}
              ${p.disabledHandTurns > 0 ? '<span class="buff-tag" style="color: red;">🔒 Khóa Bài</span>' : ''}
              ${p.rivalImmunityTurns > 0 ? '<span class="buff-tag">🌟 Bất Hoại</span>' : ''}
            </div>
          </div>
        `;
      }).join('');
    }

    const deckCount = this.mainDeck.length;
    const discardCount = this.discardDeck.length;

    const elDeck = document.getElementById('deckRemainCount');
    if (elDeck) elDeck.innerText = deckCount;
    const elDiscard = document.getElementById('discardRemainCount');
    if (elDiscard) elDiscard.innerText = discardCount;

    const elDeckMob = document.getElementById('deckRemainCountMobile');
    if (elDeckMob) elDeckMob.innerText = deckCount;
    const elDiscardMob = document.getElementById('discardRemainCountMobile');
    if (elDiscardMob) elDiscardMob.innerText = discardCount;

    const elTrashLabel = document.getElementById('trashCountLabel');
    if (elTrashLabel) elTrashLabel.innerText = discardCount;
  }

  updateTimerDisplay() {
    const timerText = document.getElementById('turnTimerText');
    const timerPill = document.getElementById('turnTimerPill');
    timerText.innerText = `${this.turnTimer}s`;

    if (this.turnTimer <= 5) {
      timerPill.classList.add('urgent');
    } else {
      timerPill.classList.remove('urgent');
    }
  }

  setBanner(title, sub) {
    document.getElementById('bannerText').innerText = title;
    document.getElementById('bannerSub').innerText = sub;
  }

  showTurnPopup(title) {
    const banner = document.getElementById('actionBanner');
    if (banner) {
      banner.classList.remove('banner-pulse');
      void banner.offsetWidth; // trigger reflow
      banner.classList.add('banner-pulse');
    }
    const pop = document.getElementById('turnPopup');
    const popTitle = document.getElementById('turnPopupTitle');
    if (pop && popTitle) {
      popTitle.innerText = title;
      pop.classList.remove('hidden');
      setTimeout(() => {
        pop.classList.add('hidden');
      }, 1500);
    }
  }

  // Centered Cards Hand with HTML5 Drag & Drop Support
  renderHandCardsUI() {
    const active = this.getActivePlayer();
    const myPlayer = this.getPlayerById(this.localPlayerId);
    if (!myPlayer) return;

    const myHand = myPlayer.handCards;
    document.getElementById('handCount').innerText = myHand.length;

    const isMyTurn = (active && active.id === this.localPlayerId);
    const badge = document.getElementById('handStatusBadge');

    if (!isMyTurn) {
      badge.innerText = 'Chờ lượt của bạn';
      badge.className = 'hand-status-badge disabled';
    } else if (myPlayer.disabledHandTurns > 0) {
      badge.innerText = 'Bị khóa dùng thẻ (1 lượt)';
      badge.className = 'hand-status-badge disabled';
    } else {
      badge.innerText = '🟢 Kéo ném thẻ vào sân để dùng';
      badge.className = 'hand-status-badge';
    }

    const rowEl = document.getElementById('cardsHandRow');
    const trashZone = document.getElementById('trashDropZone');
    const boardContainer = document.getElementById('boardCanvasContainer');

    if (myHand.length === 0) {
      if (trashZone) trashZone.classList.remove('trash-ready');
      if (boardContainer) boardContainer.classList.remove('drag-over');
      this.selectedCardIndex = null;
      rowEl.innerHTML = '<div class="empty-hand-hint">Không có lá bài nào trên tay. Đầu lượt kế tiếp sẽ tự động rút bài!</div>';
      return;
    }

    // Sync Trash and Board glow with selection state
    if (this.selectedCardIndex !== null && this.selectedCardIndex < myHand.length) {
      if (trashZone) trashZone.classList.add('trash-ready');
      const selCard = myHand[this.selectedCardIndex];
      const isPassive = selCard && (selCard.isPassive || selCard.id === 'Shield' || selCard.id === 'Counter');
      if (boardContainer) {
        if (!isPassive) boardContainer.classList.add('drag-over');
        else boardContainer.classList.remove('drag-over');
      }
    } else {
      if (trashZone) trashZone.classList.remove('trash-ready');
      if (boardContainer) boardContainer.classList.remove('drag-over');
      this.selectedCardIndex = null;
    }

    rowEl.innerHTML = myHand.map((card, idx) => {
      const isPassive = card.isPassive || card.id === 'Shield' || card.id === 'Counter';
      const isShard = card.id.startsWith('Shard');
      const isSelected = (this.selectedCardIndex === idx);

      const cardType = card.type || (isShard ? 'Buff' : 'Neutral');
      let typeLabel = cardType.toUpperCase();
      let typeClass = `type-${cardType.toLowerCase()}`;
      let borderClass = `card-${cardType.toLowerCase()}`;

      if (isPassive) {
        typeLabel = 'BỊ ĐỘNG';
        typeClass = 'type-passive';
        borderClass = 'card-passive';
      } else if (isShard) {
        typeLabel = 'EXODIA';
        typeClass = 'type-shard';
        borderClass = 'card-shard';
      }

      let selectedClass = '';
      if (isSelected) {
        selectedClass = isPassive ? 'selected-passive' : 'selected';
      }

      return `
        <div class="game-card-item ${borderClass} ${selectedClass}" draggable="true" data-idx="${idx}" title="${card.desc}">
          <div class="card-item-header">
            <span class="card-type-tag ${typeClass}">${typeLabel}</span>
          </div>
          <div class="card-icon-frame">
            <img src="${card.icon}" alt="${card.name}" class="card-img-asset" onerror="this.src='assets/cards/Shield.png'" />
          </div>
          <div class="card-item-name">${card.name}</div>
        </div>
      `;
    }).join('');

    // Attach Mobile Touch Drag & Desktop HTML5 Drag & Drop
    let touchGhost = null;
    let touchData = null;
    let startX = 0, startY = 0;
    let isTouchDragging = false;

    rowEl.querySelectorAll('.game-card-item').forEach(el => {
      // 1. Desktop HTML5 Drag
      el.addEventListener('dragstart', (e) => {
        const idx = parseInt(el.dataset.idx, 10);
        this.draggedCardData = { card: myHand[idx], index: idx };
        this.selectedCardIndex = idx;
        el.classList.add('dragging');
        e.dataTransfer.setData('text/plain', JSON.stringify({ index: idx }));
      });

      el.addEventListener('dragend', () => {
        el.classList.remove('dragging');
      });

      // 2. Mobile Pointer / Touch Drag
      el.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'touch') return;
        const idx = parseInt(el.dataset.idx, 10);
        touchData = { card: myHand[idx], index: idx, el };
        startX = e.clientX;
        startY = e.clientY;
        isTouchDragging = false;
      });

      // 3. Tap-to-Select (Both Mobile & PC)
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isTouchDragging) return;
        const idx = parseInt(el.dataset.idx, 10);
        const c = myHand[idx];
        if (!c) return;

        const isPassive = c.isPassive || c.id === 'Shield' || c.id === 'Counter';

        // Toggle deselect
        if (this.selectedCardIndex === idx) {
          this.selectedCardIndex = null;
          this.pendingCardEffect = null;
          sound.playClick();
          this.setBanner(`✋ ĐÃ HỦY CHỌN:`, `Bạn có thể bấm 1 ô kề cận để đi cờ hoặc chạm thẻ bài khác.`);
          this.renderHandCardsUI();
          return;
        }

        sound.playClick();
        this.selectedCardIndex = idx;

        if (isPassive) {
          this.pendingCardEffect = null;
          this.setBanner(`🛡️ [THẺ BỊ ĐỘNG] ${c.name}:`, `Tự động kích hoạt khi bị tấn công! Có thể chạm Thùng Rác để vứt bỏ (chạm lại thẻ để hủy).`);
        } else if (c.target === 'cell_empty' || c.target === 'cell') {
          this.pendingCardEffect = { playerId: this.localPlayerId, card: c, cardIndex: idx };
          if (c.target === 'cell_empty') {
            this.setBanner(`🎯 CHỈ ĐỊNH Ô: [${c.name}]`, `Bấm vào 1 ô TRỐNG (chưa có chủ) trên bàn cờ để áp dụng. (Chạm lại thẻ để hủy)`);
          } else {
            this.setBanner(`🎯 CHỈ ĐỊNH Ô: [${c.name}]`, `Bấm vào 1 ô THUỘC LÃNH THỔ CỦA BẠN trên bàn cờ để áp dụng. (Chạm lại thẻ để hủy)`);
          }
        } else {
          this.pendingCardEffect = null;
          this.setBanner(`🎯 ĐANG CHỌN: [${c.name}]`, `Chạm vào Sân Cờ để thi triển ngay • Chạm Thùng Rác để vứt bỏ (chạm lại để hủy chọn).`);
        }

        this.renderHandCardsUI();
      });
    });

    // Global touch pointer move and up handlers for mobile dragging
    if (!this._touchDragAttached) {
      this._touchDragAttached = true;

      window.addEventListener('pointermove', (e) => {
        if (!touchData || e.pointerType !== 'touch') return;
        const dist = Math.hypot(e.clientX - startX, e.clientY - startY);
        if (dist > 10 && !isTouchDragging) {
          isTouchDragging = true;
          touchGhost = document.createElement('div');
          touchGhost.className = 'touch-drag-ghost';
          touchGhost.innerHTML = `
            <img src="${touchData.card.icon}" />
            <span>${touchData.card.name}</span>
          `;
          document.body.appendChild(touchGhost);
        }

        if (isTouchDragging && touchGhost) {
          touchGhost.style.left = `${e.clientX}px`;
          touchGhost.style.top = `${e.clientY}px`;

          const targetEl = document.elementFromPoint(e.clientX, e.clientY);
          const boardEl = document.getElementById('boardCanvasContainer');
          const trashEl = document.getElementById('trashDropZone');

          if (targetEl && (targetEl.closest('#boardCanvasContainer') || targetEl.closest('#gameCanvas'))) {
            if (boardEl) boardEl.classList.add('drag-over');
          } else {
            if (boardEl && this.selectedCardIndex === null) boardEl.classList.remove('drag-over');
          }

          if (targetEl && targetEl.closest('#trashDropZone')) {
            if (trashEl) trashEl.classList.add('drag-over');
          } else {
            if (trashEl) trashEl.classList.remove('drag-over');
          }
        }
      });

      window.addEventListener('pointerup', (e) => {
        if (!touchData || e.pointerType !== 'touch') return;
        if (isTouchDragging && touchGhost) {
          touchGhost.remove();
          touchGhost = null;

          const boardEl = document.getElementById('boardCanvasContainer');
          const trashEl = document.getElementById('trashDropZone');
          if (boardEl) boardEl.classList.remove('drag-over');
          if (trashEl) trashEl.classList.remove('drag-over');

          const targetEl = document.elementFromPoint(e.clientX, e.clientY);
          const { card, index } = touchData;

          if (targetEl && (targetEl.closest('#boardCanvasContainer') || targetEl.closest('#gameCanvas'))) {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            const dropCellX = Math.floor(((e.clientX - rect.left) * scaleX) / this.cellSize);
            const dropCellY = Math.floor(((e.clientY - rect.top) * scaleY) / this.cellSize);
            this.handleCardDropOnBoard(card, index, dropCellX, dropCellY);
          } else if (targetEl && targetEl.closest('#trashDropZone')) {
            this.discardCard(this.localPlayerId, index);
            this.setBanner(`🗑️ ĐÃ VỨT THẺ:`, `Bạn đã ném thẻ ${card.name} vào thùng rác.`);
          }
        }

        touchData = null;
        setTimeout(() => { isTouchDragging = false; }, 80);
      });
    }
  }

  buildCardsCatalog() {
    const catEl = document.getElementById('cardsCatalogGrid');
    if (!catEl) return;

    catEl.innerHTML = CARD_DATABASE.map(c => `
      <div class="catalog-card-item">
        <img src="${c.icon}" class="catalog-card-img" onerror="this.src='assets/cards/Shield.png'" />
        <div>
          <div class="catalog-card-name">${c.name} (${c.type})</div>
          <div class="catalog-card-desc">${c.desc}</div>
        </div>
      </div>
    `).join('');
  }

  // ------------------------------------------------------
  // 16. ONLINE NETWORKING HANDLERS
  // ------------------------------------------------------
  updateHostLobbyUI() {
    const listEl = document.getElementById('hostPlayerList');
    const pCountEl = document.getElementById('hostPlayerCount');
    if (pCountEl) pCountEl.innerText = this.network.lobbyPlayers.length;

    if (listEl) {
      listEl.innerHTML = this.network.lobbyPlayers.map((p, i) => `
        <li class="waiting-item">
          <div class="waiting-avatar" style="background: ${PLAYER_PROFILES[i] ? PLAYER_PROFILES[i].color : '#1acc33'}"></div>
          <span class="waiting-name">${this.escapeHtml(p.name)}</span>
          ${p.isHost ? '<span class="badge-host">👑 CHỦ PHỔNG</span>' : ''}
        </li>
      `).join('');
    }

    const specListEl = document.getElementById('hostSpectatorList');
    const specCountEl = document.getElementById('hostSpectatorCount');
    const specs = this.network.lobbySpectators || [];
    if (specCountEl) specCountEl.innerText = specs.length;
    if (specListEl) {
      if (specs.length === 0) {
        specListEl.innerHTML = '<li class="waiting-item-empty">Chưa có khán giả nào vào xem.</li>';
      } else {
        specListEl.innerHTML = specs.map(s => `
          <li class="waiting-item spectator-item">
            <span class="spec-eye-icon">👁️</span>
            <span class="waiting-name">${this.escapeHtml(s.name)}</span>
            <span class="badge-spectator">KHÁN GIẢ</span>
            ${s.isHost ? '<span class="badge-host">👑 CHỦ PHÒNG</span>' : ''}
          </li>
        `).join('');
      }
    }

    const hostToggleText = document.getElementById('hostRoleToggleText');
    const hostRoleBadge = document.getElementById('hostRoleBadge');
    if (hostToggleText) {
      hostToggleText.innerText = this.network.isSpectator ? 'Trở thành Đấu Thủ' : 'Trở thành Khán Giả';
    }
    if (hostRoleBadge) {
      hostRoleBadge.innerText = this.network.isSpectator ? '👁️ Khán Giả / Trọng Tài' : '⚔️ Đấu Thủ';
      hostRoleBadge.className = this.network.isSpectator ? 'badge-role badge-role-spec' : 'badge-role';
    }
  }

  onLobbyUpdate(players, spectators = []) {
    if (this.network.isHost) {
      this.updateHostLobbyUI();
    } else {
      const listEl = document.getElementById('guestPlayerList');
      if (listEl) {
        listEl.innerHTML = players.map((p, i) => `
          <li class="waiting-item">
            <div class="waiting-avatar" style="background: ${PLAYER_PROFILES[i] ? PLAYER_PROFILES[i].color : '#1acc33'}"></div>
            <span class="waiting-name">${this.escapeHtml(p.name)}</span>
            ${p.isHost ? '<span class="badge-host">👑 CHỦ PHÒNG</span>' : ''}
          </li>
        `).join('');
      }

      const specListEl = document.getElementById('guestSpectatorList');
      const specCountEl = document.getElementById('guestSpectatorCount');
      if (specCountEl) specCountEl.innerText = spectators.length;
      if (specListEl) {
        if (spectators.length === 0) {
          specListEl.innerHTML = '<li class="waiting-item-empty">Chưa có khán giả nào vào xem.</li>';
        } else {
          specListEl.innerHTML = spectators.map(s => `
            <li class="waiting-item spectator-item">
              <span class="spec-eye-icon">👁️</span>
              <span class="waiting-name">${this.escapeHtml(s.name)}</span>
              <span class="badge-spectator">KHÁN GIẢ</span>
              ${s.isHost ? '<span class="badge-host">👑 CHỦ PHÒNG</span>' : ''}
            </li>
          `).join('');
        }
      }

      this.updateRoleUI();
    }
  }

  updateRoleUI() {
    const roleBadge = document.getElementById('guestRoleBadge');
    const switchBtnText = document.getElementById('guestSwitchRoleText');
    const hintEl = document.getElementById('guestWaitingHint');

    if (roleBadge) {
      roleBadge.innerText = this.network.isSpectator ? '👁️ Khán Giả (Spectator)' : '⚔️ Đấu Thủ';
      roleBadge.className = this.network.isSpectator ? 'badge-role badge-role-spec' : 'badge-role';
    }
    if (switchBtnText) {
      switchBtnText.innerText = this.network.isSpectator ? 'Đấu Thủ Thi Đấu' : 'Khán Giả (Spectator)';
    }
    if (hintEl) {
      hintEl.innerText = this.network.isSpectator
        ? '👁️ Bạn đang là Khán giả. Đang chờ trận đấu bắt đầu để vào xem trực tiếp...'
        : '⏳ Đang chờ Chủ phòng bấm nút bắt đầu trận đấu...';
    }
  }

  onRoleChanged(isSpectator) {
    this.isSpectator = isSpectator;
    if (this.network.isHost) {
      this.updateHostLobbyUI();
    } else {
      this.updateRoleUI();
    }
    window.showToast(isSpectator ? 'Đã chuyển sang vai trò: Khán Giả (Spectator) 👁️' : 'Đã chuyển sang vai trò: Đấu Thủ Thi Đấu ⚔️', 'success');
  }

  onPlayerDisconnectedInMatch(playerId) {
    const p = this.getPlayerById(playerId);
    if (p) {
      p.isHuman = false;
      this.setBanner(`⚠️ ${p.name} MẤT KẾT NỐI!`, `Hệ thống Bot AI đã tiếp quản để trận đấu tiếp tục bình thường.`);
    }
  }

  handleClientTurnAction(playerId, action) {
    if (!this.isMatchActive || !this.network.isHost) return;

    const active = this.getActivePlayer();
    if (active.id !== playerId) return;

    if (action.type === 'CELL_CLICK') {
      this.applyCellMove(action.x, action.y, playerId);
    } else if (action.type === 'PLAY_CARD') {
      const card = active.handCards[action.cardIndex];
      if (card) this.executeCardEffect(playerId, card, action.cardIndex, action.params);
    } else if (action.type === 'DISCARD_CARD') {
      this.discardCard(playerId, action.cardIndex);
    }

    this.broadcastSnapshot();
  }

  broadcastSnapshot() {
    this.network.broadcastHostSnapshot({
      grid: this.grid,
      players: this.players,
      currentTurnIndex: this.currentTurnIndex,
      turnNumber: this.turnNumber,
      turnTimer: this.turnTimer,
      remainingMoves: this.remainingMoves,
      mainDeckCount: this.mainDeck ? this.mainDeck.length : 0,
      discardDeckCount: this.discardDeck ? this.discardDeck.length : 0
    });
  }

  applyHostSnapshot(snapshot) {
    this.grid = snapshot.grid;
    this.players = snapshot.players;
    this.currentTurnIndex = snapshot.currentTurnIndex;
    this.turnNumber = snapshot.turnNumber;
    this.turnTimer = snapshot.turnTimer;
    this.remainingMoves = snapshot.remainingMoves;

    this.updateHUD();
    if (this.isSpectator) {
      this.renderSpectatorInspectorUI();
      const liveEl = document.getElementById('specLiveCount');
      if (liveEl && this.network.lobbySpectators) {
        liveEl.innerText = `👁️ ${this.network.lobbySpectators.length || 1} Khán Giả`;
      }
    } else {
      this.renderHandCardsUI();
    }
  }

  // ------------------------------------------------------
  // ONLINE ROOM DISCOVERY & JOIN HELPERS
  // ------------------------------------------------------
  executeJoinRoom(code, password = '', asSpectator = false) {
    const cleanCode = (code || '').trim().toUpperCase().replace(/^CSP-/, '').replace(/[^A-Z0-9]/g, '');
    if (!cleanCode) return;

    const myName = (document.getElementById('playerNameInput').value || '').trim() || (asSpectator ? 'Khán Giả' : 'Người Chơi');
    const activeColor = document.querySelector('.color-choice.active');
    const colorIdx = activeColor ? parseInt(activeColor.dataset.colorIdx, 10) : 1;
    const playerColor = PLAYER_PROFILES[colorIdx] ? PLAYER_PROFILES[colorIdx].color : PLAYER_PROFILES[1].color;

    const statusEl = document.getElementById('directJoinStatus');
    const joinBtn = document.getElementById('btnJoinDirect');
    const specBtn = document.getElementById('btnSpectateDirect');

    if (joinBtn) joinBtn.disabled = true;
    if (specBtn) specBtn.disabled = true;
    if (statusEl) {
      statusEl.innerHTML = `<span class="spinner-inline">⏳</span> Đang tìm kiếm & kết nối tới phòng <strong class="text-teal">${cleanCode}</strong> ${asSpectator ? 'với tư cách <strong class="text-cyan">Khán Giả (Spectator)</strong>' : ''}...`;
      statusEl.className = 'join-status-text status-connecting';
    }

    this.network.joinRoom(
      cleanCode,
      password,
      { name: myName, color: playerColor },
      (c, isSpectator, isMatchActive) => {
        if (joinBtn) joinBtn.disabled = false;
        if (specBtn) specBtn.disabled = false;
        this.isSpectator = !!isSpectator;

        if (statusEl) {
          statusEl.innerHTML = `<span class="text-green">✅ Kết nối thành công tới phòng ${c}!</span>`;
          statusEl.className = 'join-status-text status-success';
        }
        document.getElementById('guestRoomCodeTitle').innerText = c;
        if (!isMatchActive) {
          this.showView('viewGuestWaiting');
          this.updateRoleUI();
        }
      },
      (err) => {
        if (joinBtn) joinBtn.disabled = false;
        if (specBtn) specBtn.disabled = false;
        if (statusEl) {
          statusEl.innerHTML = `<span class="status-error-badge">❌</span> ${this.escapeHtml(String(err))}`;
          statusEl.className = 'join-status-text status-error';
        }

        const errStr = String(err).toLowerCase();
        if (errStr.includes('mật khẩu') || errStr.includes('password')) {
          setTimeout(async () => {
            const retryPass = await window.appPrompt(
              `🔒 Phòng "${cleanCode}" yêu cầu mật khẩu.\nVui lòng nhập mật khẩu phòng:`,
              '',
              'PHÒNG RIÊNG TƯ',
              'password'
            );
            if (retryPass !== null && retryPass.trim() !== '') {
              this.executeJoinRoom(cleanCode, retryPass.trim(), asSpectator);
            }
          }, 350);
        } else {
          window.appAlert(String(err), 'LỖI KẾT NỐI PHÒNG', 'error');
        }
      },
      asSpectator
    );
  }

  async handleJoinFromRoomList(code, isPrivate, asSpectator = false) {
    let password = '';
    if (isPrivate) {
      const input = await window.appPrompt(
        `🔒 Phòng "${code}" được đặt chế độ Riêng Tư.\nVui lòng nhập mật khẩu phòng:`,
        '',
        'PHÒNG RIÊNG TƯ',
        'password'
      );
      if (input === null) return;
      password = input.trim();
      if (!password) {
        window.appAlert('Mật khẩu không được để trống!', 'CHÚ Ý', 'warning');
        return;
      }
    }
    const codeInput = document.getElementById('joinDirectCodeInput');
    if (codeInput) codeInput.value = code;
    this.executeJoinRoom(code, password, asSpectator);
  }

  renderPublicRooms(rooms) {
    const container = document.getElementById('publicRoomsContainer');
    if (!container) return;

    if (!rooms || rooms.length === 0) {
      container.innerHTML = `
        <div class="rooms-empty">
          <div class="empty-radar">📡</div>
          <div class="empty-title">Chưa có phòng nào đang mở</div>
          <div class="empty-sub">Hãy bấm nút <strong>🔄 Làm mới</strong> hoặc <strong>Tạo phòng online</strong> ở menu chính và gửi mã cho bạn bè!</div>
        </div>
      `;
      return;
    }

    container.innerHTML = rooms.map(room => {
      const isPrivate = !!room.isPrivate;
      const count = room.count || 0;
      const specCount = room.spectatorCount || 0;
      const isPlaying = !!room.isPlaying;
      const max = room.max || 4;
      const isFull = count >= max;

      return `
        <div class="room-card" data-code="${room.code}">
          <div class="room-card-info">
            <div class="room-title-row">
              <span class="room-name">${this.escapeHtml(room.name || 'Phòng ' + room.code)}</span>
              <span class="badge-privacy ${isPrivate ? 'badge-private' : 'badge-public'}">
                ${isPrivate ? '🔒 Riêng Tư' : '🌐 Công Khai'}
              </span>
              ${isPlaying ? '<span class="badge-live-stream"><span class="live-dot-mini"></span> 🔴 TRỰC TIẾP</span>' : ''}
            </div>
            <div class="room-meta-row">
              <span class="room-host">👑 Host: <strong>${this.escapeHtml(room.hostName || 'Chủ phòng')}</strong></span>
              <span class="room-capacity ${isFull ? 'text-coral' : 'text-teal'}">
                👥 ${count}/${max} đấu thủ
              </span>
              <span class="room-spec-count text-cyan">
                👁️ ${specCount} khán giả
              </span>
              <span class="room-code-tag">Mã: <strong>${room.code}</strong></span>
            </div>
          </div>
          <div class="room-card-actions">
            <button type="button" class="btn-room-join ${isFull || isPlaying ? 'disabled' : (isPrivate ? 'btn-secondary' : 'btn-primary')}"
              ${isFull || isPlaying ? 'disabled' : ''} data-code="${room.code}" data-private="${isPrivate}">
              ${isPlaying ? 'ĐANG ĐẤU' : (isFull ? 'ĐÃ ĐỦ' : (isPrivate ? '🔒 Vào Đấu' : '👉 Vào Đấu'))}
            </button>
            <button type="button" class="btn-room-spectate btn-secondary" data-code="${room.code}" data-private="${isPrivate}" title="Vào xem trận đấu với tư cách Khán giả">
              👁️ Vào Xem
            </button>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.btn-room-join:not(.disabled)').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        sound.playClick();
        const code = btn.dataset.code;
        const isPrivate = btn.dataset.private === 'true';
        this.handleJoinFromRoomList(code, isPrivate, false);
      });
    });

    container.querySelectorAll('.btn-room-spectate').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        sound.playClick();
        const code = btn.dataset.code;
        const isPrivate = btn.dataset.private === 'true';
        this.handleJoinFromRoomList(code, isPrivate, true);
      });
    });
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// --------------------------------------------------------
// Launch game on DOM load
// --------------------------------------------------------
window.addEventListener('DOMContentLoaded', () => {
  window.game = new ColorSpillGame();
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('testMatch') === '1') {
    setTimeout(() => {
      window.game.startOfflineMatch();

      if (urlParams.get('selectCard') === '1') {
        setTimeout(() => {
          const firstCard = document.querySelector('.game-card-item');
          if (firstCard) firstCard.click();
        }, 500);
      }
    }, 150);
  }
});
