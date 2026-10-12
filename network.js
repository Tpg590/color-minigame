// ========================================================
// COLOR SPILL - NETWORK MANAGER (P2P WebRTC + Multi-layer Room Discovery)
// Multi-layer Discovery: BroadcastChannel + LocalStorage Cache + MQTT Cloud
// Turn-based multiplayer with authoritative Host & automatic Bot failover
// ========================================================

class NetworkManager {
  constructor(game) {
    this.game = game;
    this.peer = null;
    this.isHost = false;
    this.isOnline = false;
    this.roomCode = null;
    this.roomInfo = null;
    this.connections = []; // For Host: list of guest data connections
    this.hostConn = null;  // For Guest: connection to host
    this.lobbyPlayers = [];
    this.peerPrefix = 'csp-tb-';
    this.myNetId = 0;

    // Room Discovery
    this.discoveredRooms = {};
    this.heartbeatInterval = null;
    this.joinTimeout = null;

    // 1. BroadcastChannel Discovery (Instant between tabs on same device/browser)
    this.bc = null;
    this.initBroadcastChannelDiscovery();

    // 2. MQTT Discovery Client (Cloud Discovery between different devices)
    this.mqttClient = null;
    this.initMqttDiscovery();

    // 3. Load existing local cache
    this.loadLocalStorageRooms();
  }

  generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // ----------------------------------------------------
  // MULTI-LAYER ROOM DISCOVERY
  // ----------------------------------------------------
  initBroadcastChannelDiscovery() {
    if (typeof BroadcastChannel === 'undefined') return;
    try {
      this.bc = new BroadcastChannel('colorspill_room_discovery');
      this.bc.onmessage = (event) => {
        const data = event.data;
        if (!data || !data.type) return;

        if (data.type === 'ROOM_ANNOUNCE' && data.room) {
          const r = data.room;
          r.lastSeen = Date.now();
          this.discoveredRooms[r.code] = r;
          this.saveLocalStorageRooms();
          this.notifyRoomsUpdated();
        } else if (data.type === 'ROOM_QUERY') {
          // If this tab is Host, immediately reply with room announce
          if (this.isHost && this.roomInfo && this.roomCode) {
            this.broadcastRoomHeartbeatOnce();
          }
        } else if (data.type === 'ROOM_CLOSED' && data.code) {
          delete this.discoveredRooms[data.code];
          this.saveLocalStorageRooms();
          this.notifyRoomsUpdated();
        }
      };
    } catch (err) {
      console.warn('BroadcastChannel not supported or failed:', err);
    }
  }

  initMqttDiscovery() {
    if (typeof mqtt === 'undefined') return;

    try {
      this.mqttClient = mqtt.connect('wss://broker.emqx.io:8084/mqtt', {
        clientId: 'csp_' + Math.random().toString(16).substr(2, 8),
        keepalive: 30,
        reconnectPeriod: 5000,
        connectTimeout: 5000
      });

      this.mqttClient.on('connect', () => {
        this.mqttClient.subscribe('colorspill/arena/rooms/#');
        this.mqttClient.subscribe('colorspill/arena/queries');
      });

      this.mqttClient.on('message', (topic, payload) => {
        try {
          if (topic === 'colorspill/arena/queries') {
            if (this.isHost && this.roomInfo && this.roomCode) {
              this.broadcastRoomHeartbeatOnce();
            }
            return;
          }

          const str = payload.toString();
          if (!str) return;
          const info = JSON.parse(str);
          if (info && info.code) {
            info.lastSeen = Date.now();
            this.discoveredRooms[info.code] = info;
            this.saveLocalStorageRooms();
            this.notifyRoomsUpdated();
          }
        } catch (e) {}
      });
    } catch (err) {
      console.warn('MQTT Discovery init error:', err);
    }
  }

  loadLocalStorageRooms() {
    try {
      const stored = localStorage.getItem('csp_active_rooms');
      if (stored) {
        const parsed = JSON.parse(stored);
        const now = Date.now();
        for (const code in parsed) {
          if (now - parsed[code].lastSeen < 8000) {
            this.discoveredRooms[code] = parsed[code];
          }
        }
      }
    } catch (e) {}
  }

  saveLocalStorageRooms() {
    try {
      const clean = {};
      const now = Date.now();
      for (const code in this.discoveredRooms) {
        if (now - this.discoveredRooms[code].lastSeen < 8000) {
          clean[code] = this.discoveredRooms[code];
        }
      }
      localStorage.setItem('csp_active_rooms', JSON.stringify(clean));
    } catch (e) {}
  }

  getCleanRoomList() {
    const now = Date.now();
    const list = [];
    for (const code in this.discoveredRooms) {
      const r = this.discoveredRooms[code];
      if (now - (r.lastSeen || 0) < 8000) {
        list.push(r);
      } else {
        delete this.discoveredRooms[code];
      }
    }
    return list;
  }

  notifyRoomsUpdated() {
    if (this.game && typeof this.game.onRoomsUpdated === 'function') {
      this.game.onRoomsUpdated(this.getCleanRoomList());
    }
  }

  queryActiveRooms() {
    // 1. Broadcast query locally across tabs
    if (this.bc) {
      try {
        this.bc.postMessage({ type: 'ROOM_QUERY' });
      } catch (e) {}
    }
    // 2. Broadcast query over MQTT
    if (this.mqttClient && this.mqttClient.connected) {
      try {
        this.mqttClient.publish('colorspill/arena/queries', '1', { qos: 0 });
      } catch (e) {}
    }
    // 3. Immediately clean and notify
    this.notifyRoomsUpdated();
  }

  getRoomPayload() {
    return {
      code: this.roomCode,
      name: (this.roomInfo && this.roomInfo.name) || `Phòng ${this.roomCode}`,
      hostName: (this.roomInfo && this.roomInfo.hostName) || 'Chủ Phòng',
      isPrivate: !!(this.roomInfo && this.roomInfo.isPrivate),
      count: this.lobbyPlayers.length || 1,
      max: 4,
      timestamp: Date.now(),
      lastSeen: Date.now()
    };
  }

  broadcastRoomHeartbeatOnce() {
    if (!this.isHost || !this.roomInfo || !this.roomCode) return;
    const payload = this.getRoomPayload();

    // Local BroadcastChannel
    if (this.bc) {
      try {
        this.bc.postMessage({ type: 'ROOM_ANNOUNCE', room: payload });
      } catch (e) {}
    }

    // LocalStorage
    this.discoveredRooms[this.roomCode] = payload;
    this.saveLocalStorageRooms();

    // MQTT Cloud
    if (this.mqttClient && this.mqttClient.connected) {
      try {
        this.mqttClient.publish(
          `colorspill/arena/rooms/${this.roomCode}`,
          JSON.stringify(payload),
          { qos: 0 }
        );
      } catch (e) {}
    }
  }

  startRoomHeartbeat() {
    clearInterval(this.heartbeatInterval);
    this.broadcastRoomHeartbeatOnce();
    this.heartbeatInterval = setInterval(() => {
      this.broadcastRoomHeartbeatOnce();
    }, 2000);
  }

  stopRoomHeartbeat() {
    clearInterval(this.heartbeatInterval);
    const code = this.roomCode;
    if (code) {
      if (this.bc) {
        try {
          this.bc.postMessage({ type: 'ROOM_CLOSED', code });
        } catch (e) {}
      }
      delete this.discoveredRooms[code];
      this.saveLocalStorageRooms();

      if (this.mqttClient && this.mqttClient.connected) {
        try {
          this.mqttClient.publish(`colorspill/arena/rooms/${code}`, '', { qos: 0 });
        } catch (e) {}
      }
    }
  }

  // ----------------------------------------------------
  // HOST: CREATE ROOM
  // ----------------------------------------------------
  createRoom(config, localPlayerInfo, onReady, onError) {
    this.isHost = true;
    this.isOnline = true;
    this.myNetId = 1; // Host is Player 1
    this.connections = [];
    this.roomCode = this.generateRoomCode();
    const peerId = this.peerPrefix + this.roomCode.toLowerCase();

    this.roomInfo = {
      code: this.roomCode,
      name: config.roomName || `Phòng của ${localPlayerInfo.name}`,
      hostName: localPlayerInfo.name,
      isPrivate: !!config.isPrivate,
      password: config.password ? String(config.password).trim() : ''
    };

    if (this.peer) {
      try { this.peer.destroy(); } catch (e) {}
    }

    try {
      this.peer = new Peer(peerId, {
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
          ]
        }
      });
    } catch (e) {
      if (onError) onError(e.message || String(e));
      return;
    }

    this.peer.on('open', () => {
      this.lobbyPlayers = [
        { id: 1, name: localPlayerInfo.name, color: localPlayerInfo.color, isHost: true }
      ];
      this.startRoomHeartbeat();
      if (onReady) onReady(this.roomCode, this.roomInfo);
    });

    this.peer.on('connection', (conn) => {
      // Attach data handler IMMEDIATELY (do not wait for 'open' event which can drop initial packets)
      conn.on('data', (data) => {
        this.handleHostReceivedData(conn, data);
      });

      const handleConnOpen = () => {
        // Ready for bidirectional messaging
      };

      if (conn.open) {
        handleConnOpen();
      } else {
        conn.on('open', handleConnOpen);
      }

      conn.on('close', () => {
        const disconnectedPlayer = this.lobbyPlayers.find(p => p.connId === conn.peer);
        this.connections = this.connections.filter(c => c !== conn);
        this.lobbyPlayers = this.lobbyPlayers.filter(p => p.connId !== conn.peer);
        this.broadcastLobbyState();
        this.broadcastRoomHeartbeatOnce();

        if (disconnectedPlayer && this.game && this.game.onPlayerDisconnectedInMatch) {
          this.game.onPlayerDisconnectedInMatch(disconnectedPlayer.id);
        }
      });

      conn.on('error', (err) => {
        console.warn('Host connection error with peer:', conn.peer, err);
      });
    });

    this.peer.on('error', (err) => {
      console.warn('PeerJS Host error:', err);
      let errMsg = 'Lỗi tạo máy chủ phòng: ';
      if (err.type === 'unavailable-id') {
        errMsg += 'Mã phòng bị trùng, vui lòng thử lại!';
      } else {
        errMsg += err.message || err.type || String(err);
      }
      if (onError) onError(errMsg);
    });
  }

  // ----------------------------------------------------
  // GUEST: JOIN ROOM
  // ----------------------------------------------------
  joinRoom(code, password, localPlayerInfo, onJoined, onError) {
    this.isHost = false;
    this.isOnline = true;
    clearTimeout(this.joinTimeout);

    // Clean code formatting: allow "CSP-8492" or "8492" or lower/upper case
    const cleanCode = (code || '').trim().toUpperCase().replace(/^CSP-/, '').replace(/[^A-Z0-9]/g, '');
    if (!cleanCode || cleanCode.length < 3) {
      if (onError) onError('Mã phòng không hợp lệ (cần ít nhất 4 ký tự)!');
      return;
    }

    this.roomCode = cleanCode;
    const targetPeerId = this.peerPrefix + cleanCode.toLowerCase();

    if (this.peer) {
      try { this.peer.destroy(); } catch (e) {}
    }

    try {
      this.peer = new Peer({
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
          ]
        }
      });
    } catch (e) {
      if (onError) onError(e.message || String(e));
      return;
    }

    let hasHandledSuccess = false;

    // Timeout: if no connection within 8.5 seconds
    this.joinTimeout = setTimeout(() => {
      if (!hasHandledSuccess) {
        this.disconnect();
        if (onError) {
          onError(`Hết thời gian chờ kết nối! Không tìm thấy phòng "${cleanCode}" hoặc Chủ phòng đã đóng.`);
        }
      }
    }, 8500);

    this.peer.on('open', () => {
      const conn = this.peer.connect(targetPeerId, { reliable: true });
      this.hostConn = conn;

      conn.on('data', (data) => {
        if (data.type === 'JOIN_SUCCESS') {
          hasHandledSuccess = true;
          clearTimeout(this.joinTimeout);
          this.myNetId = data.myId;
          if (onJoined) onJoined(this.roomCode);
        } else if (data.type === 'JOIN_REJECT') {
          hasHandledSuccess = true;
          clearTimeout(this.joinTimeout);
          this.disconnect();
          if (onError) {
            onError(data.reason || 'Bị từ chối tham gia phòng!');
          }
          return;
        }

        this.handleGuestReceivedData(data);
      });

      const sendJoinRequest = () => {
        conn.send({
          type: 'JOIN_REQUEST',
          player: {
            name: localPlayerInfo.name,
            color: localPlayerInfo.color
          },
          password: password ? String(password).trim() : ''
        });
      };

      if (conn.open) {
        sendJoinRequest();
      } else {
        conn.on('open', sendJoinRequest);
      }

      conn.on('error', (err) => {
        console.warn('Guest connection error:', err);
        clearTimeout(this.joinTimeout);
        if (onError) onError('Lỗi đường truyền tới Chủ phòng: ' + (err.message || String(err)));
      });

      conn.on('close', () => {
        clearTimeout(this.joinTimeout);
        if (this.game && this.game.isMatchActive) {
          alert('Mất kết nối tới Chủ phòng (Host)! Trở về sảnh.');
          this.game.exitMatchToLobby();
        }
      });
    });

    this.peer.on('error', (err) => {
      console.warn('PeerJS Guest error:', err);
      clearTimeout(this.joinTimeout);
      let errorMsg = 'Lỗi kết nối phòng: ';
      if (err.type === 'peer-unavailable') {
        errorMsg = `Phòng "${cleanCode}" không tồn tại hoặc Chủ phòng đã rời đi!`;
      } else if (err.type === 'network' || err.type === 'socket-error' || err.type === 'socket-closed') {
        errorMsg = 'Lỗi máy chủ P2P Cloud. Vui lòng kiểm tra lại mạng hoặc thử lại!';
      } else {
        errorMsg += err.message || err.type || String(err);
      }
      if (onError) onError(errorMsg);
    });
  }

  // ----------------------------------------------------
  // HOST DATA HANDLING
  // ----------------------------------------------------
  handleHostReceivedData(conn, data) {
    if (data.type === 'JOIN_REQUEST') {
      if (this.roomInfo && this.roomInfo.isPrivate) {
        const guestPass = (data.password || '').trim();
        const roomPass = (this.roomInfo.password || '').trim();
        if (!guestPass || guestPass !== roomPass) {
          conn.send({ type: 'JOIN_REJECT', reason: 'Sai mật khẩu phòng! Vui lòng thử lại.' });
          setTimeout(() => conn.close(), 600);
          return;
        }
      }

      if (this.lobbyPlayers.length >= 4) {
        conn.send({ type: 'JOIN_REJECT', reason: 'Phòng đã đủ tối đa 4 người chơi!' });
        setTimeout(() => conn.close(), 600);
        return;
      }

      if (this.game && this.game.isMatchActive) {
        conn.send({ type: 'JOIN_REJECT', reason: 'Trận đấu đang diễn ra, không thể tham gia lúc này!' });
        setTimeout(() => conn.close(), 600);
        return;
      }

      const assignedId = this.lobbyPlayers.length + 1; // 2, 3, 4
      this.connections.push(conn);
      this.lobbyPlayers.push({
        id: assignedId,
        name: data.player.name || `Người chơi ${assignedId}`,
        color: data.player.color,
        connId: conn.peer,
        isHost: false
      });

      conn.send({
        type: 'JOIN_SUCCESS',
        myId: assignedId,
        roomCode: this.roomCode
      });

      this.broadcastLobbyState();
      this.broadcastRoomHeartbeatOnce();
    }
    else if (data.type === 'CLIENT_ACTION') {
      // Guest sends an in-match turn action to Host
      if (this.game && this.game.handleClientTurnAction) {
        this.game.handleClientTurnAction(data.playerId, data.action);
      }
    }
  }

  broadcastLobbyState() {
    const msg = {
      type: 'LOBBY_STATE',
      players: this.lobbyPlayers
    };
    this.connections.forEach(conn => {
      if (conn.open) {
        try { conn.send(msg); } catch (e) {}
      }
    });
    if (this.game && this.game.onLobbyUpdate) {
      this.game.onLobbyUpdate(this.lobbyPlayers);
    }
  }

  broadcastGameStart(matchData) {
    const msg = {
      type: 'GAME_START',
      matchData: matchData
    };
    this.connections.forEach(conn => {
      if (conn.open) {
        try { conn.send(msg); } catch (e) {}
      }
    });
  }

  broadcastHostSnapshot(snapshot) {
    const msg = {
      type: 'HOST_SNAPSHOT',
      snapshot: snapshot
    };
    this.connections.forEach(conn => {
      if (conn.open) {
        try { conn.send(msg); } catch (e) {}
      }
    });
  }

  broadcastGameOver(result) {
    const msg = {
      type: 'GAME_OVER',
      result: result
    };
    this.connections.forEach(conn => {
      if (conn.open) {
        try { conn.send(msg); } catch (e) {}
      }
    });
  }

  // ----------------------------------------------------
  // GUEST DATA HANDLING
  // ----------------------------------------------------
  handleGuestReceivedData(data) {
    if (data.type === 'LOBBY_STATE') {
      this.lobbyPlayers = data.players;
      if (this.game && this.game.onLobbyUpdate) {
        this.game.onLobbyUpdate(this.lobbyPlayers);
      }
    } else if (data.type === 'GAME_START') {
      if (this.game && this.game.startOnlineMatchAsGuest) {
        this.game.startOnlineMatchAsGuest(data.matchData, this.myNetId);
      }
    } else if (data.type === 'HOST_SNAPSHOT') {
      if (this.game && this.game.applyHostSnapshot) {
        this.game.applyHostSnapshot(data.snapshot);
      }
    } else if (data.type === 'GAME_OVER') {
      if (this.game && this.game.finishMatch) {
        this.game.finishMatch(data.result.winnerId, data.result.subtitle);
      }
    }
  }

  sendActionToHost(action) {
    if (this.hostConn && this.hostConn.open) {
      try {
        this.hostConn.send({
          type: 'CLIENT_ACTION',
          playerId: this.myNetId,
          action: action
        });
      } catch (e) {}
    }
  }

  disconnect() {
    clearTimeout(this.joinTimeout);
    this.stopRoomHeartbeat();
    this.isOnline = false;
    this.isHost = false;
    this.roomCode = null;
    this.roomInfo = null;
    this.connections.forEach(c => {
      try { c.close(); } catch (e) {}
    });
    this.connections = [];
    if (this.hostConn) {
      try { this.hostConn.close(); } catch (e) {}
      this.hostConn = null;
    }
    if (this.peer) {
      try { this.peer.destroy(); } catch (e) {}
      this.peer = null;
    }
  }
}

window.NetworkManager = NetworkManager;
