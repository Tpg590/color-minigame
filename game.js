// ========================================================
// COLOR SPILL - CORE GAME ENGINE (EXPANDED WORLD & CAMERA)
// Supports Offline vs Bots + P2P Online Room Codes
// ========================================================

const COLOR_PALETTE = [
  { name: 'San Hô', hex: '#FF6B6B', glow: 'rgba(255, 107, 107, 0.6)' },
  { name: 'Xanh Cyber', hex: '#4ECDC4', glow: 'rgba(78, 205, 196, 0.6)' },
  { name: 'Vàng Điện', hex: '#FFE66D', glow: 'rgba(255, 230, 109, 0.6)' },
  { name: 'Tím Neon', hex: '#A29BFE', glow: 'rgba(162, 155, 254, 0.6)' },
  { name: 'Xanh Lá', hex: '#2ECC71', glow: 'rgba(46, 204, 113, 0.6)' },
  { name: 'Hồng Phấn', hex: '#FF7675', glow: 'rgba(255, 118, 117, 0.6)' },
  { name: 'Lam Điện', hex: '#00D2D3', glow: 'rgba(0, 210, 211, 0.6)' },
  { name: 'Cam Cháy', hex: '#FF9F43', glow: 'rgba(255, 159, 67, 0.6)' }
];

const BOT_NAMES = ['Viper', 'Shadow', 'Spark', 'Glitch', 'Phantom', 'Titan', 'Blaze', 'Pulse'];
const RANDOM_PLAYER_NAMES = ['ChromaKnight', 'PixelKing', 'NeonGhost', 'ColorMaster', 'HyperDrive', 'Vortex', 'CyberRider'];

const POWERUP_TYPES = [
  { type: 'speed', icon: '⚡', name: 'Tốc độ', color: '#FFE66D' },
  { type: 'bomb', icon: '💣', name: 'Bom sơn', color: '#FF6B6B' },
  { type: 'shield', icon: '🛡️', name: 'Khiên đuôi', color: '#4ECDC4' },
  { type: 'freeze', icon: '❄️', name: 'Đóng băng', color: '#00D2D3' }
];

class ColorSpillGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');

    // BIG EXPANDED BOARD (56 x 56 grid = 3,136 cells!)
    this.GRID_COLS = 56;
    this.GRID_ROWS = 56;
    this.CELL_SIZE = 26; // 1,456 x 1,456 px total world

    // Camera system
    this.camera = {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0
    };

    // Game state
    this.grid = []; // 2D array of { owner: id|null, trail: id|null }
    this.players = [];
    this.powerups = [];
    this.particles = [];
    this.floatingTexts = [];

    this.gameRunning = false;
    this.gamePaused = false;
    this.gameStartTime = 0;
    this.elapsedSeconds = 0;
    this.timerInterval = null;
    this.powerupInterval = null;
    this.hostBroadcastInterval = null;

    // Player setup config
    this.selectedColor = COLOR_PALETTE[0].hex;
    this.playerName = 'ChromaKnight';
    this.difficulty = 'normal';
    this.bestScore = parseInt(localStorage.getItem('cs_best_score') || '0', 10);
    this.myPlayerId = 0; // Local player ID in match

    // Network manager for online mode
    this.network = new NetworkManager(this);
    this.currentMode = 'offline'; // 'offline' | 'host' | 'join'

    this.initUI();
    this.initOnlineUI();
    this.bindEvents();
    this.updateBestScoreDisplay();
  }

  // ----------------------------------------------------
  // INITIALIZATION & UI
  // ----------------------------------------------------
  initUI() {
    // Update live preview card
    const updatePreview = () => {
      const avatar = document.getElementById('previewAvatar');
      const nameEl = document.getElementById('previewPlayerName');
      if (avatar) {
        avatar.style.backgroundColor = this.selectedColor;
        const colDef = COLOR_PALETTE.find(c => c.hex === this.selectedColor);
        if (colDef) avatar.style.boxShadow = `0 0 20px ${colDef.glow}`;
      }
      if (nameEl) {
        nameEl.innerHTML = `${escapeHTML(this.playerName)} <span class="badge-you">(BẠN)</span>`;
      }
    };

    // Render Color Palette in Lobby
    const paletteEl = document.getElementById('colorPalette');
    paletteEl.innerHTML = '';
    COLOR_PALETTE.forEach((item, idx) => {
      const swatch = document.createElement('div');
      swatch.className = `color-swatch ${idx === 0 ? 'active' : ''}`;
      swatch.style.backgroundColor = item.hex;
      swatch.style.setProperty('--swatch-glow', item.glow);
      swatch.title = item.name;
      swatch.addEventListener('click', () => {
        document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        this.selectedColor = item.hex;
        updatePreview();
      });
      paletteEl.appendChild(swatch);
    });

    // Input name event
    const nameInput = document.getElementById('playerNameInput');
    nameInput.addEventListener('input', (e) => {
      this.playerName = e.target.value.trim() || 'ChromaKnight';
      updatePreview();
    });

    // Random name dice button
    document.getElementById('btnRandomName').addEventListener('click', () => {
      const rand = RANDOM_PLAYER_NAMES[Math.floor(Math.random() * RANDOM_PLAYER_NAMES.length)];
      document.getElementById('playerNameInput').value = rand;
      this.playerName = rand;
      updatePreview();
    });

    updatePreview();

    // Difficulty buttons
    document.querySelectorAll('#difficultyControl .seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#difficultyControl .seg-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.difficulty = btn.dataset.diff;
      });
    });
  }

  // ----------------------------------------------------
  // MULTI-VIEW LOBBY CONTROLLER
  // ----------------------------------------------------
  switchView(targetViewId) {
    document.querySelectorAll('.lobby-view').forEach(view => {
      view.classList.add('hidden');
    });
    const target = document.getElementById(targetViewId);
    if (target) target.classList.remove('hidden');
  }

  initOnlineUI() {
    this.createPrivacy = 'public';
    this.pendingJoinCode = null;

    // 1. Navigation from Main Menu 3 Buttons
    document.getElementById('btnNavOffline').addEventListener('click', () => {
      this.switchView('viewOffline');
    });
    document.getElementById('btnNavCreateRoom').addEventListener('click', () => {
      document.getElementById('createRoomNameInput').value = `Phòng của ${this.playerName}`;
      this.switchView('viewCreateRoom');
    });
    document.getElementById('btnNavFindRoom').addEventListener('click', () => {
      this.switchView('viewFindRoom');
      this.renderPublicRoomsList();
    });

    // Back Buttons (Quay lại)
    document.querySelectorAll('.btn-back').forEach(btn => {
      btn.addEventListener('click', () => {
        this.switchView(btn.dataset.back || 'viewMain');
      });
    });

    // 2. Chơi với máy: Start Offline Button
    document.getElementById('btnStartOffline').addEventListener('click', () => {
      window.sounds.init();
      this.startOfflineMatch();
    });

    // 3. Tạo phòng: Privacy Toggle (Public / Private)
    document.querySelectorAll('#roomPrivacyControl .seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#roomPrivacyControl .seg-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.createPrivacy = btn.dataset.privacy;

        const passGroup = document.getElementById('roomPasswordGroup');
        if (this.createPrivacy === 'private') {
          passGroup.classList.remove('hidden');
          document.getElementById('createRoomPasswordInput').focus();
        } else {
          passGroup.classList.add('hidden');
          document.getElementById('createRoomPasswordInput').value = '';
        }
      });
    });

    // 4. Confirm Create Room Button
    document.getElementById('btnConfirmCreateRoom').addEventListener('click', () => {
      window.sounds.init();
      const roomName = document.getElementById('createRoomNameInput').value.trim() || `Phòng của ${this.playerName}`;
      const password = document.getElementById('createRoomPasswordInput').value.trim();

      // Enforce: Private rooms MUST have a password!
      if (this.createPrivacy === 'private' && !password) {
        alert('Phòng riêng tư bắt buộc phải đặt mật khẩu! Vui lòng nhập mật khẩu.');
        document.getElementById('createRoomPasswordInput').focus();
        return;
      }

      const btn = document.getElementById('btnConfirmCreateRoom');
      btn.textContent = '⏳ Đang khởi tạo phòng...';
      btn.disabled = true;

      this.network.createRoom(
        {
          roomName: roomName,
          isPrivate: this.createPrivacy === 'private',
          password: password
        },
        { name: this.playerName, color: this.selectedColor },
        (roomCode, roomInfo) => {
          btn.textContent = '🚀 TẠO PHÒNG & LẤY MÃ CODE';
          btn.disabled = false;

          document.getElementById('displayRoomCode').textContent = `CSP-${roomCode}`;
          const pBadge = document.getElementById('hostPrivacyBadge');
          if (roomInfo.isPrivate) {
            pBadge.textContent = '🔒 Riêng Tư';
            pBadge.className = 'badge-privacy text-yellow';
          } else {
            pBadge.textContent = '🌐 Công Khai';
            pBadge.className = 'badge-privacy text-teal';
          }

          this.renderWaitingPlayerList('hostPlayerList', this.network.lobbyPlayers);
          document.getElementById('hostPlayerCount').textContent = this.network.lobbyPlayers.length;
          this.switchView('viewHostWaiting');
        },
        (err) => {
          alert('Không thể tạo phòng: ' + (err.message || 'Lỗi kết nối WebRTC'));
          btn.textContent = '🚀 TẠO PHÒNG & LẤY MÃ CODE';
          btn.disabled = false;
        }
      );
    });

    // Copy Room Code
    document.getElementById('btnCopyCode').addEventListener('click', () => {
      const code = document.getElementById('displayRoomCode').textContent;
      navigator.clipboard.writeText(code).then(() => {
        const btn = document.getElementById('btnCopyCode');
        btn.textContent = '✓ Đã chép!';
        setTimeout(() => { btn.textContent = '📋 Sao chép'; }, 1500);
      });
    });

    // Cancel Host
    document.getElementById('btnCancelHost').addEventListener('click', () => {
      this.network.disconnect();
      this.switchView('viewMain');
    });

    // Host Start Match
    document.getElementById('btnHostStartMatch').addEventListener('click', () => {
      this.startOnlineMatchAsHost();
    });

    // 5. Tìm phòng - Cách 1: Direct Code Join
    document.getElementById('btnJoinDirect').addEventListener('click', () => {
      window.sounds.init();
      const codeInput = document.getElementById('joinDirectCodeInput').value.trim();
      if (!codeInput) {
        alert('Vui lòng nhập mã phòng (ví dụ: CSP-8492 hoặc 8492)!');
        return;
      }
      this.attemptJoinRoom(codeInput, '');
    });

    // 6. Tìm phòng - Cách 2: Refresh Rooms Button
    document.getElementById('btnRefreshRooms').addEventListener('click', () => {
      this.renderPublicRoomsList();
    });

    // MQTT Room updates callback
    this.onRoomsUpdated = () => {
      this.renderPublicRoomsList();
    };

    // 7. Password Modal Confirm / Cancel
    document.getElementById('btnSubmitPassword').addEventListener('click', () => {
      const pass = document.getElementById('inputRoomPassword').value.trim();
      if (!pass) {
        document.getElementById('passwordErrorText').textContent = 'Vui lòng nhập mật khẩu!';
        return;
      }
      document.getElementById('passwordModal').classList.add('hidden');
      if (this.pendingJoinCode) {
        this.attemptJoinRoom(this.pendingJoinCode, pass);
      }
    });

    document.getElementById('btnCancelPassword').addEventListener('click', () => {
      document.getElementById('passwordModal').classList.add('hidden');
      this.pendingJoinCode = null;
    });

    // 8. Guest Leave Room
    document.getElementById('btnLeaveGuest').addEventListener('click', () => {
      this.network.disconnect();
      this.switchView('viewMain');
    });

    // Network Lobby update callback
    this.onLobbyUpdate = (players) => {
      if (this.network.isHost) {
        this.renderWaitingPlayerList('hostPlayerList', players);
        document.getElementById('hostPlayerCount').textContent = players.length;
      } else {
        this.renderWaitingPlayerList('guestPlayerList', players);
      }
    };
  }

  attemptJoinRoom(code, password) {
    const statusEl = document.getElementById('directJoinStatus');
    statusEl.textContent = '⏳ Đang kết nối tới phòng...';

    this.network.joinRoom(
      code,
      password,
      { name: this.playerName, color: this.selectedColor },
      (roomCode) => {
        statusEl.textContent = '✓ Kết nối thành công!';
        document.getElementById('guestRoomCodeTitle').textContent = `CSP-${roomCode}`;
        this.renderWaitingPlayerList('guestPlayerList', this.network.lobbyPlayers);
        this.switchView('viewGuestWaiting');
      },
      (err) => {
        statusEl.textContent = '❌ Không tìm thấy phòng hoặc phòng đã đóng!';
      }
    );

    this.onJoinFailed = (reason) => {
      if (reason && reason.includes('mật khẩu')) {
        this.promptPasswordForRoom(code, 'Mật khẩu không chính xác, vui lòng thử lại:');
      } else {
        alert(reason || 'Không thể vào phòng!');
      }
    };
  }

  promptPasswordForRoom(code, customMsg) {
    this.pendingJoinCode = code;
    document.getElementById('inputRoomPassword').value = '';
    document.getElementById('passwordErrorText').textContent = customMsg || '';
    document.getElementById('passwordModal').classList.remove('hidden');
    document.getElementById('inputRoomPassword').focus();
  }

  renderPublicRoomsList() {
    const container = document.getElementById('publicRoomsContainer');
    if (!container) return;

    const rooms = this.network.getCleanRoomList();
    container.innerHTML = '';

    if (rooms.length === 0) {
      container.innerHTML = `
        <div class="room-empty-state">
          <div>📡 Hiện chưa thấy phòng nào đang mở trên mạng.</div>
          <div style="margin-top: 6px; font-size: 0.78rem; color: #64748b;">
            Bạn có thể bấm <strong>"TẠO PHÒNG"</strong> hoặc nhập mã code phòng ở Cách 1!
          </div>
        </div>
      `;
      return;
    }

    rooms.forEach(r => {
      const card = document.createElement('div');
      card.className = 'room-card';
      card.innerHTML = `
        <div class="rc-left">
          <div class="rc-name">${escapeHTML(r.name || 'Phòng Chiến Đấu')}</div>
          <div class="rc-meta">
            <span>Chủ: <strong>${escapeHTML(r.hostName)}</strong></span>
            <span>•</span>
            <span>Mã: <strong class="text-teal">CSP-${r.code}</strong></span>
          </div>
        </div>
        <div class="rc-right">
          <span class="${r.isPrivate ? 'rc-badge-priv' : 'rc-badge-pub'}">
            ${r.isPrivate ? '🔒 Riêng tư' : '🌐 Công khai'}
          </span>
          <span style="font-size: 0.8rem; font-weight: 700; color: #cbd5e1;">${r.count}/${r.max}</span>
        </div>
      `;

      card.addEventListener('click', () => {
        window.sounds.init();
        if (r.isPrivate) {
          this.promptPasswordForRoom(r.code);
        } else {
          this.attemptJoinRoom(r.code, '');
        }
      });

      container.appendChild(card);
    });
  }

  renderWaitingPlayerList(elementId, players) {
    const listEl = document.getElementById(elementId);
    if (!listEl) return;
    listEl.innerHTML = '';
    players.forEach((p, idx) => {
      const li = document.createElement('li');
      li.className = 'waiting-player-item';
      li.innerHTML = `
        <div class="wp-info">
          <span class="wp-color" style="background-color: ${p.color};"></span>
          <span>${escapeHTML(p.name)}</span>
        </div>
        <span class="wp-tag">${p.isHost ? '👑 CHỦ PHÒNG' : `NGƯỜI CHƠI #${idx + 1}`}</span>
      `;
      listEl.appendChild(li);
    });
  }

  bindEvents() {
    // Tutorial Modals
    const openTut = () => document.getElementById('tutorialModal').classList.remove('hidden');
    const closeTut = () => document.getElementById('tutorialModal').classList.add('hidden');
    document.getElementById('btnOpenTutorial').addEventListener('click', openTut);
    document.getElementById('btnInGameTutorial').addEventListener('click', () => {
      this.setPause(true);
      openTut();
    });
    document.getElementById('btnCloseTutorial').addEventListener('click', closeTut);
    document.getElementById('btnGotTutorial').addEventListener('click', closeTut);

    // Pause Modal
    document.getElementById('btnPause').addEventListener('click', () => this.setPause(true));
    document.getElementById('btnResume').addEventListener('click', () => this.setPause(false));
    document.getElementById('btnRestartFromPause').addEventListener('click', () => {
      this.setPause(false);
      if (this.network.isOnline) {
        this.showLobby();
      } else {
        this.startOfflineMatch();
      }
    });
    document.getElementById('btnExitToLobby').addEventListener('click', () => {
      this.setPause(false);
      this.showLobby();
    });

    // Sound toggle
    document.getElementById('btnSoundToggle').addEventListener('click', () => {
      const enabled = window.sounds.toggle();
      document.getElementById('btnSoundToggle').textContent = enabled ? '🔊' : '🔇';
    });

    // Game Over Actions
    document.getElementById('btnPlayAgain').addEventListener('click', () => {
      document.getElementById('gameOverModal').classList.add('hidden');
      if (this.network.isOnline) {
        this.showLobby();
      } else {
        this.startOfflineMatch();
      }
    });
    document.getElementById('btnChangeSettings').addEventListener('click', () => {
      document.getElementById('gameOverModal').classList.add('hidden');
      this.showLobby();
    });

    // Keyboard controls
    window.addEventListener('keydown', (e) => {
      if (!this.gameRunning || this.gamePaused) return;
      const p = this.players[this.myPlayerId];
      if (!p || !p.isAlive) return;

      let newDir = null;
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (p.dir.y === 0) newDir = { x: 0, y: -1 };
          e.preventDefault();
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (p.dir.y === 0) newDir = { x: 0, y: 1 };
          e.preventDefault();
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (p.dir.x === 0) newDir = { x: -1, y: 0 };
          e.preventDefault();
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (p.dir.x === 0) newDir = { x: 1, y: 0 };
          e.preventDefault();
          break;
        case 'p':
        case 'P':
        case 'Escape':
          this.setPause(!this.gamePaused);
          break;
      }

      if (newDir) {
        p.nextDir = newDir;
        if (this.network.isOnline && !this.network.isHost) {
          this.network.sendInputToHost(newDir);
        }
      }
    });

    // Mobile D-pad controls
    document.querySelectorAll('.dpad-btn').forEach(btn => {
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.handleDirectionInput(btn.dataset.dir);
      });
      btn.addEventListener('click', () => {
        this.handleDirectionInput(btn.dataset.dir);
      });
    });

    window.addEventListener('resize', () => this.resizeCanvas());
  }

  handleDirectionInput(dirStr) {
    if (!this.gameRunning || this.gamePaused) return;
    const p = this.players[this.myPlayerId];
    if (!p || !p.isAlive) return;

    let newDir = null;
    if (dirStr === 'up' && p.dir.y === 0) newDir = { x: 0, y: -1 };
    if (dirStr === 'down' && p.dir.y === 0) newDir = { x: 0, y: 1 };
    if (dirStr === 'left' && p.dir.x === 0) newDir = { x: -1, y: 0 };
    if (dirStr === 'right' && p.dir.x === 0) newDir = { x: 1, y: 0 };

    if (newDir) {
      p.nextDir = newDir;
      if (this.network.isOnline && !this.network.isHost) {
        this.network.sendInputToHost(newDir);
      }
    }
  }

  resizeCanvas() {
    const maxSize = Math.min(window.innerWidth - 32, 640);
    const size = Math.max(320, maxSize);
    this.canvas.width = size;
    this.canvas.height = size;
  }

  updateBestScoreDisplay() {
    const el = document.getElementById('bestScoreText');
    if (el) el.textContent = this.bestScore.toLocaleString();
  }

  setPause(paused) {
    this.gamePaused = paused;
    const modal = document.getElementById('pauseModal');
    if (paused) {
      modal.classList.remove('hidden');
    } else {
      modal.classList.add('hidden');
    }
  }

  showLobby() {
    this.gameRunning = false;
    clearInterval(this.timerInterval);
    clearInterval(this.powerupInterval);
    clearInterval(this.hostBroadcastInterval);
    this.network.disconnect();

    document.getElementById('setupScreen').classList.remove('hidden');
    document.getElementById('gameScreen').classList.add('hidden');
    document.getElementById('gameHud').classList.add('hidden');
    this.switchView('viewMain');
    this.updateBestScoreDisplay();
  }

  // ----------------------------------------------------
  // OFFLINE MATCH SETUP (VS 3 SMART BOTS)
  // ----------------------------------------------------
  startOfflineMatch() {
    this.myPlayerId = 0;
    this.initBoardAndPlayers(false);
  }

  // ----------------------------------------------------
  // ONLINE HOST MATCH SETUP
  // ----------------------------------------------------
  startOnlineMatchAsHost() {
    this.myPlayerId = 0;
    this.initBoardAndPlayers(true);

    // Broadcast Game Start to guests
    this.network.broadcastGameStart({
      grid: this.grid,
      players: this.players,
      powerups: this.powerups
    });

    // Start 20fps Host State Broadcasting
    clearInterval(this.hostBroadcastInterval);
    this.hostBroadcastInterval = setInterval(() => {
      if (this.gameRunning && !this.gamePaused) {
        this.network.broadcastHostSnapshot({
          players: this.players.map(p => ({
            id: p.id,
            x: p.x,
            y: p.y,
            dir: p.dir,
            isAlive: p.isAlive,
            trail: p.trail,
            score: p.score,
            kills: p.kills,
            hasShield: p.hasShield,
            speedBoostUntil: p.speedBoostUntil,
            frozenUntil: p.frozenUntil
          })),
          powerups: this.powerups,
          grid: this.grid
        });
      }
    }, 50);
  }

  // ----------------------------------------------------
  // ONLINE GUEST MATCH SETUP
  // ----------------------------------------------------
  startOnlineMatchAsGuest(matchData, myNetId) {
    this.myPlayerId = myNetId;
    this.resizeCanvas();
    this.gameRunning = true;
    this.gamePaused = false;
    this.particles = [];
    this.floatingTexts = [];
    this.elapsedSeconds = 0;
    this.gameStartTime = Date.now();

    document.getElementById('setupScreen').classList.add('hidden');
    document.getElementById('gameScreen').classList.remove('hidden');
    document.getElementById('gameHud').classList.remove('hidden');
    document.getElementById('pauseModal').classList.add('hidden');
    document.getElementById('gameOverModal').classList.add('hidden');

    this.grid = matchData.grid;
    this.players = matchData.players;
    this.powerups = matchData.powerups;

    // Reset camera to guest player position
    const p = this.players[this.myPlayerId];
    if (p) {
      this.camera.x = p.x * this.CELL_SIZE - this.canvas.width / 2;
      this.camera.y = p.y * this.CELL_SIZE - this.canvas.height / 2;
    }

    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  applyHostSnapshot(snapshot) {
    if (!this.gameRunning) return;
    this.grid = snapshot.grid;
    this.powerups = snapshot.powerups;

    snapshot.players.forEach(sp => {
      const p = this.players[sp.id];
      if (p) {
        p.x = sp.x;
        p.y = sp.y;
        p.dir = sp.dir;
        p.isAlive = sp.isAlive;
        p.trail = sp.trail;
        p.score = sp.score;
        p.kills = sp.kills;
        p.hasShield = sp.hasShield;
        p.speedBoostUntil = sp.speedBoostUntil;
        p.frozenUntil = sp.frozenUntil;
      }
    });
  }

  // ----------------------------------------------------
  // CORE MATCH INITIALIZATION (BOARD & SPAWN)
  // ----------------------------------------------------
  initBoardAndPlayers(isOnlineMatch) {
    this.resizeCanvas();
    this.gameRunning = true;
    this.gamePaused = false;
    this.particles = [];
    this.floatingTexts = [];
    this.powerups = [];
    this.elapsedSeconds = 0;
    this.gameStartTime = Date.now();

    document.getElementById('setupScreen').classList.add('hidden');
    document.getElementById('gameScreen').classList.remove('hidden');
    document.getElementById('gameHud').classList.remove('hidden');
    document.getElementById('pauseModal').classList.add('hidden');
    document.getElementById('gameOverModal').classList.add('hidden');

    // Init Big 56x56 Grid
    this.grid = [];
    for (let r = 0; r < this.GRID_ROWS; r++) {
      this.grid[r] = [];
      for (let c = 0; c < this.GRID_COLS; c++) {
        this.grid[r][c] = { owner: null, trail: null };
      }
    }

    // Build 4 Player slots (Human/Host + other online players or bots)
    this.players = [];

    const spawnPositions = [
      { r: 6, c: 6, dir: { x: 1, y: 0 } },
      { r: 6, c: this.GRID_COLS - 10, dir: { x: 0, y: 1 } },
      { r: this.GRID_ROWS - 10, c: 6, dir: { x: 0, y: -1 } },
      { r: this.GRID_ROWS - 10, c: this.GRID_COLS - 10, dir: { x: -1, y: 0 } }
    ];

    if (isOnlineMatch) {
      const netPlayers = this.network.lobbyPlayers;
      for (let i = 0; i < 4; i++) {
        const netP = netPlayers[i];
        if (netP) {
          // Connected human player
          this.players.push({
            id: i,
            isBot: false,
            name: netP.name,
            color: netP.color,
            isAlive: true,
            x: 0, y: 0,
            prevX: 0, prevY: 0,
            dir: { x: 0, y: 0 },
            nextDir: { x: 0, y: 0 },
            moveTimer: 0,
            moveInterval: 0.12,
            trail: [],
            score: 0,
            kills: 0,
            speedBoostUntil: 0,
            hasShield: false,
            frozenUntil: 0
          });
        } else {
          // Fill missing slot with Bot
          const botColor = COLOR_PALETTE[(i + 3) % COLOR_PALETTE.length].hex;
          this.players.push({
            id: i,
            isBot: true,
            name: BOT_NAMES[i],
            color: botColor,
            isAlive: true,
            x: 0, y: 0,
            prevX: 0, prevY: 0,
            dir: { x: 0, y: 0 },
            nextDir: { x: 0, y: 0 },
            moveTimer: 0,
            moveInterval: this.getBotSpeed(),
            trail: [],
            score: 0,
            kills: 0,
            speedBoostUntil: 0,
            hasShield: false,
            frozenUntil: 0,
            stepsInTrail: 0
          });
        }
      }
    } else {
      // Pure Offline vs 3 Bots
      const availableColors = COLOR_PALETTE.map(c => c.hex).filter(hex => hex !== this.selectedColor);
      shuffleArray(availableColors);
      const botNames = [...BOT_NAMES];
      shuffleArray(botNames);

      this.players = [
        {
          id: 0,
          isBot: false,
          name: this.playerName,
          color: this.selectedColor,
          isAlive: true,
          x: 0, y: 0,
          prevX: 0, prevY: 0,
          dir: { x: 0, y: 0 },
          nextDir: { x: 0, y: 0 },
          moveTimer: 0,
          moveInterval: 0.12,
          trail: [],
          score: 0,
          kills: 0,
          speedBoostUntil: 0,
          hasShield: false,
          frozenUntil: 0
        },
        {
          id: 1,
          isBot: true,
          name: botNames[0],
          color: availableColors[0],
          isAlive: true,
          x: 0, y: 0,
          prevX: 0, prevY: 0,
          dir: { x: 0, y: 0 },
          nextDir: { x: 0, y: 0 },
          moveTimer: 0,
          moveInterval: this.getBotSpeed(),
          trail: [],
          score: 0,
          kills: 0,
          speedBoostUntil: 0,
          hasShield: false,
          frozenUntil: 0,
          stepsInTrail: 0
        },
        {
          id: 2,
          isBot: true,
          name: botNames[1],
          color: availableColors[1],
          isAlive: true,
          x: 0, y: 0,
          prevX: 0, prevY: 0,
          dir: { x: 0, y: 0 },
          nextDir: { x: 0, y: 0 },
          moveTimer: 0,
          moveInterval: this.getBotSpeed(),
          trail: [],
          score: 0,
          kills: 0,
          speedBoostUntil: 0,
          hasShield: false,
          frozenUntil: 0,
          stepsInTrail: 0
        },
        {
          id: 3,
          isBot: true,
          name: botNames[2],
          color: availableColors[2],
          isAlive: true,
          x: 0, y: 0,
          prevX: 0, prevY: 0,
          dir: { x: 0, y: 0 },
          nextDir: { x: 0, y: 0 },
          moveTimer: 0,
          moveInterval: this.getBotSpeed(),
          trail: [],
          score: 0,
          kills: 0,
          speedBoostUntil: 0,
          hasShield: false,
          frozenUntil: 0,
          stepsInTrail: 0
        }
      ];
    }

    // Assign spawn positions & 4x4 initial bases in the 4 quadrants
    this.players.forEach((p, idx) => {
      const pos = spawnPositions[idx];
      p.x = pos.c + 1;
      p.y = pos.r + 1;
      p.prevX = p.x;
      p.prevY = p.y;
      p.dir = { ...pos.dir };
      p.nextDir = { ...pos.dir };

      // Claim 4x4 base on the big board
      for (let dr = 0; dr < 4; dr++) {
        for (let dc = 0; dc < 4; dc++) {
          this.grid[pos.r + dr][pos.c + dc].owner = p.id;
        }
      }
    });

    // Center camera on local player immediately
    const myP = this.players[this.myPlayerId];
    if (myP) {
      this.camera.x = myP.x * this.CELL_SIZE - this.canvas.width / 2;
      this.camera.y = myP.y * this.CELL_SIZE - this.canvas.height / 2;
    }

    // Start Match Timer
    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      if (!this.gamePaused && this.gameRunning) {
        this.elapsedSeconds++;
        const mins = String(Math.floor(this.elapsedSeconds / 60)).padStart(2, '0');
        const secs = String(this.elapsedSeconds % 60).padStart(2, '0');
        document.getElementById('hudTimer').textContent = `${mins}:${secs}`;
      }
    }, 1000);

    // Powerup Spawner (6 items across the large world)
    clearInterval(this.powerupInterval);
    this.powerupInterval = setInterval(() => {
      if (!this.gamePaused && this.gameRunning && this.powerups.length < 6) {
        this.spawnPowerup();
      }
    }, 6000);

    this.spawnPowerup();
    this.spawnPowerup();
    this.spawnPowerup();

    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  getBotSpeed() {
    if (this.difficulty === 'easy') return 0.16;
    if (this.difficulty === 'hard') return 0.11;
    return 0.13;
  }

  // ----------------------------------------------------
  // GAME LOOP & CAMERA TRACKING
  // ----------------------------------------------------
  gameLoop(currentTime) {
    if (!this.gameRunning) return;

    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    if (!this.gamePaused) {
      // If offline or online host, simulate game logic
      if (!this.network.isOnline || this.network.isHost) {
        this.update(dt);
      }
      this.updateCamera();
    }
    this.render();

    requestAnimationFrame((t) => this.gameLoop(t));
  }

  updateCamera() {
    const localPlayer = this.players[this.myPlayerId];
    if (localPlayer) {
      const worldX = localPlayer.x * this.CELL_SIZE + this.CELL_SIZE / 2;
      const worldY = localPlayer.y * this.CELL_SIZE + this.CELL_SIZE / 2;

      this.camera.targetX = worldX - this.canvas.width / 2;
      this.camera.targetY = worldY - this.canvas.height / 2;

      const maxX = this.GRID_COLS * this.CELL_SIZE - this.canvas.width;
      const maxY = this.GRID_ROWS * this.CELL_SIZE - this.canvas.height;
      this.camera.targetX = Math.max(0, Math.min(this.camera.targetX, Math.max(0, maxX)));
      this.camera.targetY = Math.max(0, Math.min(this.camera.targetY, Math.max(0, maxY)));

      // Smooth camera interpolation
      this.camera.x += (this.camera.targetX - this.camera.x) * 0.16;
      this.camera.y += (this.camera.targetY - this.camera.y) * 0.16;
    }
  }

  update(dt) {
    const now = Date.now();

    this.players.forEach(p => {
      if (!p.isAlive) return;
      if (p.frozenUntil > now) return;

      let interval = p.moveInterval;
      if (p.speedBoostUntil > now) {
        interval *= 0.65;
      }

      p.moveTimer += dt;
      if (p.moveTimer >= interval) {
        p.moveTimer -= interval;
        this.stepPlayer(p);
      }
    });

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.alpha -= pt.decay;
      if (pt.alpha <= 0) this.particles.splice(i, 1);
    }

    // Update floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= ft.vy;
      ft.alpha -= ft.decay;
      if (ft.alpha <= 0) this.floatingTexts.splice(i, 1);
    }

    this.updateHUD();
    this.checkWinConditions();
  }

  // ----------------------------------------------------
  // STEP PLAYER & COMBAT
  // ----------------------------------------------------
  stepPlayer(p) {
    if (p.isBot) {
      this.decideBotDirection(p);
    } else {
      if (p.nextDir && (p.nextDir.x !== -p.dir.x || p.nextDir.y !== -p.dir.y)) {
        p.dir = { ...p.nextDir };
      }
    }

    const nextX = p.x + p.dir.x;
    const nextY = p.y + p.dir.y;

    // Check Wall Collisions
    if (nextX < 0 || nextX >= this.GRID_COLS || nextY < 0 || nextY >= this.GRID_ROWS) {
      if (p.isBot) {
        this.redirectBotFromObstacle(p);
        return;
      } else {
        if (this.grid[p.y][p.x].owner !== p.id) {
          this.eliminatePlayer(p, 'Va phải rìa bản đồ khi chưa kịp về căn cứ!');
          return;
        } else {
          return;
        }
      }
    }

    const targetCell = this.grid[nextY][nextX];

    // Check Self-Trail Collision
    if (targetCell.trail === p.id) {
      if (p.hasShield) {
        p.hasShield = false;
        this.addFloatingText(p.x, p.y, '🛡️ KHIÊN ĐÃ VỠ!', '#4ECDC4');
      } else {
        this.eliminatePlayer(p, 'Tự đâm vào đuôi màu của chính mình!');
        return;
      }
    }

    // Check Rival-Trail Collision (CẮT ĐUÔI ĐỐI THỦ!)
    if (targetCell.trail !== null && targetCell.trail !== p.id) {
      const victimId = targetCell.trail;
      const victim = this.players[victimId];
      if (victim && victim.isAlive) {
        if (victim.hasShield) {
          victim.hasShield = false;
          this.addFloatingText(victim.x, victim.y, '🛡️ KHIÊN CỨU MẠNG!', '#4ECDC4');
        } else {
          p.kills++;
          p.score += 300;
          this.addFloatingText(nextX, nextY, `💥 +300 DIỆT ${victim.name.toUpperCase()}!`, p.color);
          this.createExplosionParticles(nextX, nextY, victim.color);
          window.sounds.playKill();
          this.eliminatePlayer(victim, `Bị ${p.name} cắt đuôi hạ gục!`);
        }
      }
    }

    p.prevX = p.x;
    p.prevY = p.y;
    p.x = nextX;
    p.y = nextY;

    if (p.id === this.myPlayerId) {
      window.sounds.playTurn();
    }

    // Draw trail or Capture territory
    if (targetCell.owner !== p.id) {
      p.trail.push({ x: p.x, y: p.y });
      targetCell.trail = p.id;
      if (p.isBot) p.stepsInTrail++;
    } else {
      if (p.trail.length > 0) {
        this.captureTerritory(p);
        p.trail = [];
        if (p.isBot) p.stepsInTrail = 0;
      }
    }

    this.checkPowerupPickup(p);
  }

  // ----------------------------------------------------
  // BOT AI (ADAPTED FOR BIG BOARD)
  // ----------------------------------------------------
  decideBotDirection(bot) {
    const isOutside = this.grid[bot.y][bot.x].owner !== bot.id;
    const maxSteps = this.difficulty === 'easy' ? 5 : (this.difficulty === 'hard' ? 10 : 7);

    // 1. Return home if ventured too far
    if (isOutside && (bot.stepsInTrail >= maxSteps || this.isRivalNearMyTrail(bot))) {
      const homeDir = this.findDirectionToNearestHome(bot);
      if (homeDir && this.isValidBotMove(bot, homeDir)) {
        bot.dir = homeDir;
        return;
      }
    }

    // 2. Hunt enemy trails within 6 tiles
    const huntDir = this.findDirectionToHuntEnemyTrail(bot);
    if (huntDir && this.isValidBotMove(bot, huntDir)) {
      bot.dir = huntDir;
      return;
    }

    // 3. Seek nearby powerup within 8 tiles
    const pUpDir = this.findDirectionToNearestPowerup(bot);
    if (pUpDir && this.isValidBotMove(bot, pUpDir)) {
      bot.dir = pUpDir;
      return;
    }

    // 4. Default: Smooth expansion wandering
    if (!this.isValidBotMove(bot, bot.dir) || Math.random() < 0.12) {
      const possibleDirs = [
        { x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }
      ].filter(d => this.isValidBotMove(bot, d) && !(d.x === -bot.dir.x && d.y === -bot.dir.y));

      if (possibleDirs.length > 0) {
        bot.dir = possibleDirs[Math.floor(Math.random() * possibleDirs.length)];
      }
    }
  }

  isValidBotMove(bot, dir) {
    const nx = bot.x + dir.x;
    const ny = bot.y + dir.y;
    if (nx < 0 || nx >= this.GRID_COLS || ny < 0 || ny >= this.GRID_ROWS) return false;
    if (this.grid[ny][nx].trail === bot.id) return false;
    return true;
  }

  redirectBotFromObstacle(bot) {
    const possible = [
      { x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }
    ].filter(d => this.isValidBotMove(bot, d));
    if (possible.length > 0) {
      bot.dir = possible[Math.floor(Math.random() * possible.length)];
    }
  }

  isRivalNearMyTrail(bot) {
    if (bot.trail.length === 0) return false;
    for (let p of this.players) {
      if (p.id !== bot.id && p.isAlive) {
        for (let pt of bot.trail) {
          const dist = Math.abs(p.x - pt.x) + Math.abs(p.y - pt.y);
          if (dist <= 4) return true;
        }
      }
    }
    return false;
  }

  findDirectionToNearestHome(bot) {
    let bestDist = Infinity;
    let target = null;
    // Sample search for nearest home cell
    for (let r = 0; r < this.GRID_ROWS; r += 2) {
      for (let c = 0; c < this.GRID_COLS; c += 2) {
        if (this.grid[r][c].owner === bot.id) {
          const dist = Math.abs(bot.x - c) + Math.abs(bot.y - r);
          if (dist < bestDist) {
            bestDist = dist;
            target = { x: c, y: r };
          }
        }
      }
    }
    if (!target) return null;
    return this.getStepTowards(bot.x, bot.y, target.x, target.y);
  }

  findDirectionToHuntEnemyTrail(bot) {
    let closestDist = 7;
    let target = null;
    for (let p of this.players) {
      if (p.id !== bot.id && p.isAlive && p.trail.length > 0) {
        for (let pt of p.trail) {
          const dist = Math.abs(bot.x - pt.x) + Math.abs(bot.y - pt.y);
          if (dist < closestDist) {
            closestDist = dist;
            target = pt;
          }
        }
      }
    }
    if (!target) return null;
    return this.getStepTowards(bot.x, bot.y, target.x, target.y);
  }

  findDirectionToNearestPowerup(bot) {
    if (this.powerups.length === 0) return null;
    let bestDist = 8;
    let target = null;
    for (let pu of this.powerups) {
      const dist = Math.abs(bot.x - pu.x) + Math.abs(bot.y - pu.y);
      if (dist < bestDist) {
        bestDist = dist;
        target = pu;
      }
    }
    if (!target) return null;
    return this.getStepTowards(bot.x, bot.y, target.x, target.y);
  }

  getStepTowards(fromX, fromY, toX, toY) {
    const dx = toX - fromX;
    const dy = toY - fromY;
    if (Math.abs(dx) > Math.abs(dy)) {
      return { x: Math.sign(dx), y: 0 };
    } else if (dy !== 0) {
      return { x: 0, y: Math.sign(dy) };
    }
    return null;
  }

  // ----------------------------------------------------
  // TERRITORY FLOOD-FILL CAPTURE
  // ----------------------------------------------------
  captureTerritory(player) {
    player.trail.forEach(pt => {
      this.grid[pt.y][pt.x].owner = player.id;
      this.grid[pt.y][pt.x].trail = null;
    });

    const H = this.GRID_ROWS;
    const W = this.GRID_COLS;
    const visited = [];
    for (let r = 0; r < H + 2; r++) {
      visited[r] = new Uint8Array(W + 2);
    }

    const queue = [{ r: 0, c: 0 }];
    visited[0][0] = 1;

    while (queue.length > 0) {
      const { r, c } = queue.pop();
      const neighbors = [
        { r: r - 1, c: c },
        { r: r + 1, c: c },
        { r: r, c: c - 1 },
        { r: r, c: c + 1 }
      ];

      for (let n of neighbors) {
        if (n.r >= 0 && n.r < H + 2 && n.c >= 0 && n.c < W + 2) {
          if (!visited[n.r][n.c]) {
            let isBlocked = false;
            if (n.r >= 1 && n.r <= H && n.c >= 1 && n.c <= W) {
              const gr = n.r - 1;
              const gc = n.c - 1;
              if (this.grid[gr][gc].owner === player.id) {
                isBlocked = true;
              }
            }
            if (!isBlocked) {
              visited[n.r][n.c] = 1;
              queue.push(n);
            }
          }
        }
      }
    }

    let capturedCount = 0;
    for (let r = 0; r < H; r++) {
      for (let c = 0; c < W; c++) {
        if (!visited[r + 1][c + 1]) {
          if (this.grid[r][c].owner !== player.id) {
            this.grid[r][c].owner = player.id;
            this.grid[r][c].trail = null;
            capturedCount++;

            if (Math.random() < 0.25) {
              this.createTileParticles(c, r, player.color);
            }
          }
        }
      }
    }

    const totalAward = player.trail.length + capturedCount;
    player.score += totalAward * 10;

    if (player.id === this.myPlayerId) {
      window.sounds.playCapture(totalAward);
      if (totalAward > 10) {
        this.addFloatingText(player.x, player.y, `+${totalAward * 10} CHIẾM ĐÓNG!`, player.color);
      }
    }
  }

  // ----------------------------------------------------
  // POWERUPS & EFFECTS
  // ----------------------------------------------------
  spawnPowerup() {
    let attempts = 0;
    while (attempts < 50) {
      const x = Math.floor(Math.random() * this.GRID_COLS);
      const y = Math.floor(Math.random() * this.GRID_ROWS);
      if (this.grid[y][x].trail === null && !this.powerups.some(p => p.x === x && p.y === y)) {
        const puDef = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
        this.powerups.push({
          x, y,
          type: puDef.type,
          icon: puDef.icon,
          name: puDef.name,
          color: puDef.color,
          createdAt: Date.now()
        });
        break;
      }
      attempts++;
    }
  }

  checkPowerupPickup(player) {
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const pu = this.powerups[i];
      if (pu.x === player.x && pu.y === player.y) {
        this.applyPowerup(player, pu);
        this.powerups.splice(i, 1);
        break;
      }
    }
  }

  applyPowerup(player, pu) {
    const now = Date.now();
    player.score += 50;

    if (player.id === this.myPlayerId) {
      window.sounds.playPowerup();
      this.addFloatingText(player.x, player.y, `${pu.icon} ${pu.name.toUpperCase()}!`, pu.color);
    }

    switch (pu.type) {
      case 'speed':
        player.speedBoostUntil = now + 6000;
        break;
      case 'shield':
        player.hasShield = true;
        break;
      case 'bomb':
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const nr = player.y + dr;
            const nc = player.x + dc;
            if (nr >= 0 && nr < this.GRID_ROWS && nc >= 0 && nc < this.GRID_COLS) {
              this.grid[nr][nc].owner = player.id;
              this.grid[nr][nc].trail = null;
              if (Math.random() < 0.3) this.createTileParticles(nc, nr, player.color);
            }
          }
        }
        break;
      case 'freeze':
        this.players.forEach(p => {
          if (p.id !== player.id) p.frozenUntil = now + 4000;
        });
        break;
    }
  }

  // ----------------------------------------------------
  // ELIMINATION & END GAME
  // ----------------------------------------------------
  eliminatePlayer(victim, reason) {
    victim.isAlive = false;

    victim.trail.forEach(pt => {
      this.grid[pt.y][pt.x].trail = null;
    });
    victim.trail = [];

    for (let r = 0; r < this.GRID_ROWS; r++) {
      for (let c = 0; c < this.GRID_COLS; c++) {
        if (this.grid[r][c].owner === victim.id) {
          this.grid[r][c].owner = null;
        }
        if (this.grid[r][c].trail === victim.id) {
          this.grid[r][c].trail = null;
        }
      }
    }

    if (victim.id === this.myPlayerId) {
      window.sounds.playDeath();
      this.finishMatch(false, reason);
    }
  }

  checkWinConditions() {
    const totalTiles = this.GRID_COLS * this.GRID_ROWS;
    const myP = this.players[this.myPlayerId];
    if (!myP || !myP.isAlive) return;

    const counts = [0, 0, 0, 0];
    for (let r = 0; r < this.GRID_ROWS; r++) {
      for (let c = 0; c < this.GRID_COLS; c++) {
        const o = this.grid[r][c].owner;
        if (o !== null) counts[o]++;
      }
    }

    const myPct = (counts[this.myPlayerId] / totalTiles) * 100;
    const livingRivals = this.players.filter(p => p.id !== this.myPlayerId && p.isAlive).length;

    if (myPct >= 35.0) {
      window.sounds.playWin();
      this.finishMatch(true, `Chiến thắng vang dội! Bạn đã làm chủ ${myPct.toFixed(1)}% đại đấu trường!`);
    } else if (livingRivals === 0) {
      window.sounds.playWin();
      this.finishMatch(true, 'Toàn bộ đối thủ đã bị quét sạch!');
    }
  }

  finishMatch(isVictory, subtitle) {
    this.gameRunning = false;
    clearInterval(this.timerInterval);
    clearInterval(this.powerupInterval);
    clearInterval(this.hostBroadcastInterval);

    if (this.network.isOnline && this.network.isHost) {
      this.network.broadcastGameOver({ isVictory, subtitle });
    }

    const myP = this.players[this.myPlayerId] || { score: 0, kills: 0 };
    const totalTiles = this.GRID_COLS * this.GRID_ROWS;
    let myTiles = 0;
    for (let r = 0; r < this.GRID_ROWS; r++) {
      for (let c = 0; c < this.GRID_COLS; c++) {
        if (this.grid[r][c].owner === this.myPlayerId) myTiles++;
      }
    }
    const pct = ((myTiles / totalTiles) * 100).toFixed(1);

    if (myP.score > this.bestScore) {
      this.bestScore = myP.score;
      localStorage.setItem('cs_best_score', this.bestScore.toString());
      this.updateBestScoreDisplay();
    }

    const modal = document.getElementById('gameOverModal');
    const badge = document.getElementById('goBadge');
    const title = document.getElementById('goTitle');
    const sub = document.getElementById('goSubtitle');

    if (isVictory) {
      badge.textContent = '🏆 CHIẾN THẮNG QUÁN QUÂN';
      badge.style.color = '#4ECDC4';
      badge.style.borderColor = 'rgba(78, 205, 196, 0.4)';
      title.textContent = 'BÁ CHỦ MÀU SẮC!';
      title.className = 'go-title text-teal';
    } else {
      badge.textContent = '💀 TỬ TRẬN';
      badge.style.color = '#FF6B6B';
      badge.style.borderColor = 'rgba(255, 107, 107, 0.4)';
      title.textContent = 'TRẬN CHIẾN KẾT THÚC';
      title.className = 'go-title text-coral';
    }

    sub.textContent = subtitle;
    document.getElementById('goTerritory').textContent = `${pct}%`;
    document.getElementById('goScore').textContent = myP.score.toLocaleString();
    document.getElementById('goKills').textContent = myP.kills;
    document.getElementById('goTime').textContent = document.getElementById('hudTimer').textContent;

    modal.classList.remove('hidden');
  }

  // ----------------------------------------------------
  // HUD & LEADERBOARD
  // ----------------------------------------------------
  updateHUD() {
    const totalTiles = this.GRID_COLS * this.GRID_ROWS;
    const tileCounts = [0, 0, 0, 0];
    for (let r = 0; r < this.GRID_ROWS; r++) {
      for (let c = 0; c < this.GRID_COLS; c++) {
        const o = this.grid[r][c].owner;
        if (o !== null && tileCounts[o] !== undefined) tileCounts[o]++;
      }
    }

    const myP = this.players[this.myPlayerId] || { score: 0, kills: 0 };
    document.getElementById('hudScore').textContent = myP.score;
    document.getElementById('hudKills').textContent = myP.kills;

    const myPct = ((tileCounts[this.myPlayerId] / totalTiles) * 100).toFixed(1);
    document.getElementById('playerTerritoryPct').textContent = `${myPct}%`;

    const barEl = document.getElementById('territoryBar');
    barEl.innerHTML = '';
    this.players.forEach(p => {
      const pct = (tileCounts[p.id] / totalTiles) * 100;
      if (pct > 0.4) {
        const seg = document.createElement('div');
        seg.className = 't-seg';
        seg.style.width = `${pct}%`;
        seg.style.backgroundColor = p.color;
        barEl.appendChild(seg);
      }
    });

    const now = Date.now();
    const badgesOverlay = document.getElementById('activePowerups');
    badgesOverlay.innerHTML = '';
    if (myP.speedBoostUntil > now) {
      badgesOverlay.appendChild(createBadge('⚡', 'Tốc độ', '#FFE66D'));
    }
    if (myP.hasShield) {
      badgesOverlay.appendChild(createBadge('🛡️', 'Khiên', '#4ECDC4'));
    }

    const sorted = [...this.players].map(p => ({
      ...p,
      pct: ((tileCounts[p.id] / totalTiles) * 100).toFixed(1)
    })).sort((a, b) => parseFloat(b.pct) - parseFloat(a.pct));

    const lbList = document.getElementById('lbList');
    lbList.innerHTML = '';
    sorted.forEach((item, rank) => {
      const li = document.createElement('li');
      li.className = `lb-item ${item.id === this.myPlayerId ? 'is-player' : ''} ${!item.isAlive ? 'lb-dead' : ''}`;
      li.innerHTML = `
        <div class="lb-left">
          <span class="lb-rank">#${rank + 1}</span>
          <span class="lb-color-dot" style="background-color: ${item.color};"></span>
          <span class="lb-name">${escapeHTML(item.name)} ${item.id === this.myPlayerId ? '(BẠN)' : ''}</span>
        </div>
        <span class="lb-pct">${item.pct}%</span>
      `;
      lbList.appendChild(li);
    });
  }

  // ----------------------------------------------------
  // PARTICLES & COMBAT FLOATING TEXT
  // ----------------------------------------------------
  createTileParticles(x, y, color) {
    const px = x * this.CELL_SIZE + this.CELL_SIZE / 2;
    const py = y * this.CELL_SIZE + this.CELL_SIZE / 2;
    for (let i = 0; i < 3; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = Math.random() * 2 + 1;
      this.particles.push({
        x: px, y: py,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        size: Math.random() * 3 + 2,
        color: color,
        alpha: 1,
        decay: 0.04
      });
    }
  }

  createExplosionParticles(x, y, color) {
    const px = x * this.CELL_SIZE + this.CELL_SIZE / 2;
    const py = y * this.CELL_SIZE + this.CELL_SIZE / 2;
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = Math.random() * 4 + 2;
      this.particles.push({
        x: px, y: py,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        size: Math.random() * 4 + 3,
        color: color,
        alpha: 1,
        decay: 0.03
      });
    }
  }

  addFloatingText(x, y, text, color) {
    const px = x * this.CELL_SIZE + this.CELL_SIZE / 2;
    const py = y * this.CELL_SIZE;
    this.floatingTexts.push({
      x: px, y: py,
      text: text,
      color: color,
      vy: 1.2,
      alpha: 1,
      decay: 0.02
    });
  }

  // ----------------------------------------------------
  // CANVAS RENDERING ENGINE (CAMERA OFFSET + CULLING)
  // ----------------------------------------------------
  render() {
    const ctx = this.ctx;
    const cs = this.CELL_SIZE;
    const now = Date.now();
    const camX = Math.round(this.camera.x);
    const camY = Math.round(this.camera.y);

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Save context and apply CAMERA TRANSLATION
    ctx.save();
    ctx.translate(-camX, -camY);

    // Frustum culling: calculate visible tile range (+2 margin)
    const startCol = Math.max(0, Math.floor(camX / cs) - 1);
    const endCol = Math.min(this.GRID_COLS, Math.ceil((camX + this.canvas.width) / cs) + 1);
    const startRow = Math.max(0, Math.floor(camY / cs) - 1);
    const endRow = Math.min(this.GRID_ROWS, Math.ceil((camY + this.canvas.height) / cs) + 1);

    // 1. Draw Visible Grid & Territories
    for (let r = startRow; r < endRow; r++) {
      for (let c = startCol; c < endCol; c++) {
        const cell = this.grid[r][c];
        const x = c * cs;
        const y = r * cs;

        if (cell.owner !== null) {
          const ownerPlayer = this.players[cell.owner];
          if (ownerPlayer) {
            ctx.fillStyle = ownerPlayer.color;
            ctx.globalAlpha = cell.owner === this.myPlayerId ? 0.62 : 0.42;
            ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2);

            if (cell.owner === this.myPlayerId) {
              ctx.strokeStyle = 'rgba(255, 230, 109, 0.4)';
              ctx.lineWidth = 1;
              ctx.strokeRect(x + 1.5, y + 1.5, cs - 3, cs - 3);
            }
            ctx.globalAlpha = 1.0;
          }
        } else {
          ctx.fillStyle = '#12121c';
          ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2);
        }

        // Draw Trails
        if (cell.trail !== null) {
          const trailPlayer = this.players[cell.trail];
          if (trailPlayer) {
            ctx.fillStyle = trailPlayer.color;
            ctx.shadowColor = trailPlayer.color;
            ctx.shadowBlur = cell.trail === this.myPlayerId ? 12 : 6;
            ctx.fillRect(x + 2, y + 2, cs - 4, cs - 4);
            ctx.shadowBlur = 0;
          }
        }
      }
    }

    // World border outline
    ctx.strokeStyle = 'rgba(78, 205, 196, 0.3)';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, this.GRID_COLS * cs, this.GRID_ROWS * cs);

    // 2. Draw Powerups
    const pulseScale = 1 + Math.sin(now / 180) * 0.12;
    this.powerups.forEach(pu => {
      const cx = pu.x * cs + cs / 2;
      const cy = pu.y * cs + cs / 2;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(pulseScale, pulseScale);
      ctx.shadowColor = pu.color;
      ctx.shadowBlur = 12;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.beginPath();
      ctx.arc(0, 0, cs * 0.45, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = `${Math.floor(cs * 0.65)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pu.icon, 0, 1);
      ctx.restore();
    });

    // 3. Draw Players
    const matchAge = (now - this.gameStartTime) / 1000;

    this.players.forEach(p => {
      if (!p.isAlive) return;

      const px = p.x * cs;
      const py = p.y * cs;
      const isLocal = p.id === this.myPlayerId;

      ctx.save();

      // Radar & Pointer for Local Player
      if (isLocal && matchAge < 8) {
        const ripplePhase = (now % 1200) / 1200;
        ctx.strokeStyle = '#FFE66D';
        ctx.lineWidth = 3 * (1 - ripplePhase);
        ctx.beginPath();
        ctx.arc(px + cs / 2, py + cs / 2, cs * (0.6 + ripplePhase * 2.5), 0, Math.PI * 2);
        ctx.stroke();

        const bounce = Math.sin(now / 120) * 5;
        ctx.fillStyle = '#FFE66D';
        ctx.font = 'bold 12px Montserrat, Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#FFE66D';
        ctx.shadowBlur = 10;
        ctx.fillText('▼ BẠN Ở ĐÂY!', px + cs / 2, py - 26 + bounce);
        ctx.shadowBlur = 0;
      }

      ctx.shadowColor = p.color;
      ctx.shadowBlur = isLocal ? 20 : 10;

      // Frozen
      if (p.frozenUntil > now) {
        ctx.fillStyle = '#00D2D3';
        ctx.fillRect(px, py, cs, cs);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = `${Math.floor(cs * 0.6)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('❄️', px + cs / 2, py + cs / 2);
        ctx.restore();
        return;
      }

      // Block Head
      ctx.fillStyle = p.color;
      ctx.fillRect(px + 1, py + 1, cs - 2, cs - 2);

      if (isLocal) {
        ctx.strokeStyle = '#FFE66D';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(px + 1, py + 1, cs - 2, cs - 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(px + 3, py + 3, cs - 6, cs - 6);
      } else {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(px + 2, py + 2, cs - 4, cs - 4);
      }

      // Shield Ring
      if (p.hasShield) {
        ctx.strokeStyle = '#4ECDC4';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(px + cs / 2, py + cs / 2, cs * 0.75, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Face & Eyes
      if (!p.isBot) {
        ctx.font = `${Math.floor(cs * 0.7)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('👑', px + cs / 2, py + 2);

        ctx.fillStyle = '#ffffff';
        const eyeW = Math.max(3, cs * 0.2);
        const eyeH = Math.max(3, cs * 0.25);
        const ex1 = px + cs * 0.25 + p.dir.x * 2;
        const ey1 = py + cs * 0.35 + p.dir.y * 2;
        const ex2 = px + cs * 0.55 + p.dir.x * 2;
        const ey2 = py + cs * 0.35 + p.dir.y * 2;
        ctx.fillRect(ex1, ey1, eyeW, eyeH);
        ctx.fillRect(ex2, ey2, eyeW, eyeH);

        ctx.fillStyle = '#060608';
        ctx.fillRect(ex1 + (p.dir.x > 0 ? 1 : 0), ey1 + (p.dir.y > 0 ? 1 : 0), eyeW * 0.6, eyeH * 0.6);
        ctx.fillRect(ex2 + (p.dir.x > 0 ? 1 : 0), ey2 + (p.dir.y > 0 ? 1 : 0), eyeW * 0.6, eyeH * 0.6);
      } else {
        ctx.fillStyle = '#0a0a10';
        ctx.fillRect(px + cs * 0.2, py + cs * 0.35, cs * 0.6, cs * 0.2);
        ctx.fillStyle = p.color;
        ctx.fillRect(px + cs * 0.3 + p.dir.x * 2, py + cs * 0.4, cs * 0.25, cs * 0.1);
      }

      // Name Badge
      const tagY = py - (matchAge < 8 && isLocal ? 12 : 8);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (isLocal) {
        const label = `👑 ${p.name.toUpperCase()} (BẠN)`;
        ctx.font = 'bold 10px Orbitron, Montserrat, sans-serif';
        const tw = ctx.measureText(label).width;

        ctx.fillStyle = 'rgba(6, 6, 8, 0.9)';
        ctx.strokeStyle = '#FFE66D';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(px + cs / 2 - tw / 2 - 5, tagY - 8, tw + 10, 16, 5);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#FFE66D';
        ctx.fillText(label, px + cs / 2, tagY);
      } else {
        const prefix = p.isBot ? '🤖 ' : '🎮 ';
        const label = `${prefix}${p.name}`;
        ctx.font = '9px Montserrat, sans-serif';
        const tw = ctx.measureText(label).width;

        ctx.fillStyle = 'rgba(10, 10, 15, 0.75)';
        ctx.beginPath();
        ctx.roundRect(px + cs / 2 - tw / 2 - 4, tagY - 7, tw + 8, 14, 4);
        ctx.fill();

        ctx.fillStyle = '#cbd5e1';
        ctx.fillText(label, px + cs / 2, tagY);
      }

      ctx.restore();
    });

    // 4. Draw Particles
    this.particles.forEach(pt => {
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = Math.max(0, pt.alpha);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // 5. Draw Floating Combat Text
    ctx.font = 'bold 12px Orbitron, Montserrat, sans-serif';
    ctx.textAlign = 'center';
    this.floatingTexts.forEach(ft => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.alpha);
      ctx.fillStyle = ft.color;
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 6;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    });
    ctx.globalAlpha = 1.0;

    // Restore Camera Translation
    ctx.restore();

    // ==========================================
    // SCREEN-SPACE ELEMENTS (MINIMAP & BANNER)
    // ==========================================
    this.drawMinimap(ctx);

    // Start-of-Match Announcement Banner
    if (matchAge < 3.5 && this.players[this.myPlayerId]) {
      const bannerAlpha = Math.min(1, (3.5 - matchAge) * 1.5);
      ctx.save();
      ctx.globalAlpha = bannerAlpha;

      const bw = Math.min(this.canvas.width - 40, 480);
      const bh = 42;
      const bx = (this.canvas.width - bw) / 2;
      const by = 20;

      ctx.fillStyle = 'rgba(6, 6, 8, 0.92)';
      ctx.strokeStyle = '#FFE66D';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 10);
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 12px Montserrat, sans-serif';
      ctx.fillStyle = '#FFE66D';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`🎯 BÀN CỜ 56x56 • CAMERA THEO DÕI BẠN • VƯƠNG MIỆN 👑`, this.canvas.width / 2, by + 14);
      ctx.font = '10px Montserrat, sans-serif';
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(`Quan sát Radar ở góc để định vị toàn bộ bản đồ!`, this.canvas.width / 2, by + 28);
      ctx.restore();
    }
  }

  // ----------------------------------------------------
  // MINIMAP RADAR (SCREEN-SPACE CORNER OVERLAY)
  // ----------------------------------------------------
  drawMinimap(ctx) {
    const mapSize = 120;
    const pad = 12;
    const mx = this.canvas.width - mapSize - pad;
    const my = this.canvas.height - mapSize - pad;

    ctx.save();

    // Background box
    ctx.fillStyle = 'rgba(6, 6, 12, 0.82)';
    ctx.strokeStyle = 'rgba(78, 205, 196, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(mx, my, mapSize, mapSize, 8);
    ctx.fill();
    ctx.stroke();

    // Render territory sampling
    const scale = mapSize / this.GRID_COLS;
    for (let r = 0; r < this.GRID_ROWS; r += 2) {
      for (let c = 0; c < this.GRID_COLS; c += 2) {
        const o = this.grid[r][c].owner;
        if (o !== null && this.players[o]) {
          ctx.fillStyle = this.players[o].color;
          ctx.fillRect(mx + c * scale, my + r * scale, Math.max(1, scale * 2), Math.max(1, scale * 2));
        }
      }
    }

    // Camera viewport rectangle
    const totalW = this.GRID_COLS * this.CELL_SIZE;
    const totalH = this.GRID_ROWS * this.CELL_SIZE;
    const camBoxX = mx + (this.camera.x / totalW) * mapSize;
    const camBoxY = my + (this.camera.y / totalH) * mapSize;
    const camBoxW = (this.canvas.width / totalW) * mapSize;
    const camBoxH = (this.canvas.height / totalH) * mapSize;

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(camBoxX, camBoxY, camBoxW, camBoxH);

    // Player Blips
    this.players.forEach(p => {
      if (!p.isAlive) return;
      const bx = mx + (p.x / this.GRID_COLS) * mapSize;
      const by = my + (p.y / this.GRID_ROWS) * mapSize;
      const isLocal = p.id === this.myPlayerId;

      ctx.fillStyle = isLocal ? '#FFE66D' : p.color;
      ctx.beginPath();
      ctx.arc(bx, by, isLocal ? 3.5 : 2.5, 0, Math.PI * 2);
      ctx.fill();

      if (isLocal) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });

    // Radar Header Text
    ctx.fillStyle = '#64748b';
    ctx.font = '700 8px Orbitron, Montserrat, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('RADAR 56x56', mx + 6, my + 6);

    ctx.restore();
  }
}

// ----------------------------------------------------
// UTILITY FUNCTIONS
// ----------------------------------------------------
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}

function createBadge(icon, name, color) {
  const el = document.createElement('div');
  el.className = 'powerup-pill';
  el.style.setProperty('--p-color', color);
  el.style.setProperty('--p-glow', color);
  el.innerHTML = `<span>${icon}</span><span>${name}</span>`;
  return el;
}

// Instantiate game engine on load
window.addEventListener('DOMContentLoaded', () => {
  window.game = new ColorSpillGame();
});
