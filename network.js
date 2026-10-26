// ========================================================
// COLOR SPILL - NETWORK MANAGER (Hybrid P2P WebRTC + MQTT Cloud Relay)
// Multi-layer Discovery & Communication:
// Layer 1: BroadcastChannel (Instant between tabs on same device)
// Layer 2: PeerJS WebRTC Direct DataChannel (Ultra-low latency P2P with TURN relay)
// Layer 3: MQTT Cloud Broker Relay (100% NAT/Firewall proof fallback across any network)
// ========================================================

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'stun:openrelay.metered.ca:80' },
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  }
];

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
    this.guestClientId = 'g_' + Math.random().toString(36).substr(2, 9);

    // Message deduplication cache
    this.processedMsgIds = new Set();

    // Room Discovery & Join Timers
    this.discoveredRooms = {};
    this.heartbeatInterval = null;
    this.joinTimeout = null;
    this.joinRetryInterval = null;

    // 1. BroadcastChannel Discovery (Instant between tabs on same device/browser)
    this.bc = null;
    this.initBroadcastChannelDiscovery();

    // 2. MQTT Discovery & Relay Client (Cloud Discovery & Messaging between different devices)
    this.mqttClient = null;
    this.initMqttDiscovery();

    // 3. Load existing local cache
    this.loadLocalStorageRooms();

    // 4. Cross-tab window storage listener (Instant 0ms sync on same device/browser)
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === 'csp_active_rooms') {
          this.loadLocalStorageRooms();
          this.notifyRoomsUpdated();
        }
      });
    }
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
  // MULTI-LAYER ROOM DISCOVERY & MESSAGING
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
      // Connect to HiveMQ Public WebSocket broker (ultra-low latency, 100% reliable)
      this.mqttClient = mqtt.connect('wss://broker.hivemq.com:8884/mqtt', {
        clientId: 'csp_' + Math.random().toString(16).substr(2, 8),
        keepalive: 30,
        reconnectPeriod: 2500,
        connectTimeout: 5000
      });

      this.mqttClient.on('connect', () => {
        this.mqttClient.subscribe('colorspill/arena/rooms/#');
        this.mqttClient.subscribe('colorspill/arena/queries');
        if (this.roomCode) {
          this.mqttClient.subscribe(`colorspill/arena/room/${this.roomCode}/#`);
        }
        if (this.isHost && this.roomInfo && this.roomCode) {
          this.broadcastRoomHeartbeatOnce();
        }
      });

      this.mqttClient.on('message', (topic, payload) => {
        try {
          if (topic === 'colorspill/arena/queries') {
            if (this.isHost && this.roomInfo && this.roomCode) {
              this.broadcastRoomHeartbeatOnce();
            }
            return;
          }

          if (topic.startsWith('colorspill/arena/rooms/')) {
            const str = payload.toString();
            const codeFromTopic = topic.split('/').pop();
            if (!str || str.trim() === '') {
              // Room was closed / retained message cleared
              if (codeFromTopic && this.discoveredRooms[codeFromTopic]) {
                delete this.discoveredRooms[codeFromTopic];
                this.saveLocalStorageRooms();
                this.notifyRoomsUpdated();
              }
              return;
            }
            const info = JSON.parse(str);
            if (info && info.code) {
              info.lastSeen = Date.now();
              this.discoveredRooms[info.code] = info;
              this.saveLocalStorageRooms();
              this.notifyRoomsUpdated();
            }
            return;
          }

          // In-Room Hybrid Relay messages
          if (topic.startsWith('colorspill/arena/room/')) {
            const str = payload.toString();
            if (!str) return;
            const data = JSON.parse(str);
            if (!data || !data.type) return;

            // Deduplication
            if (data.msgId) {
              if (this.processedMsgIds.has(data.msgId)) return;
              this.processedMsgIds.add(data.msgId);
              if (this.processedMsgIds.size > 300) {
                const first = this.processedMsgIds.values().next().value;
                this.processedMsgIds.delete(first);
              }
            }

            // Route to Host or Guest handler
            if (this.isHost && topic.endsWith('/to_host')) {
              this.handleHostReceivedData(null, data);
            } else if (!this.isHost) {
              if (
                topic.endsWith('/broadcast') ||
                topic.endsWith('/guest/' + this.guestClientId) ||
                (this.myNetId && topic.endsWith('/guest/' + this.myNetId))
              ) {
                this.handleGuestReceivedData(data);
              }
            }
          }
        } catch (e) {
          console.warn('MQTT message parse error:', e);
        }
      });
    } catch (err) {
      console.warn('MQTT Discovery init error:', err);
    }
  }

  subscribeToRoomMqtt(code) {
    if (!this.mqttClient || !code) return;
    try {
      this.mqttClient.subscribe(`colorspill/arena/room/${code}/#`);
    } catch (e) {}
  }

  loadLocalStorageRooms() {
    try {
      const stored = localStorage.getItem('csp_active_rooms');
      if (stored) {
        const parsed = JSON.parse(stored);
        const now = Date.now();
        for (const code in parsed) {
          if (now - (parsed[code].lastSeen || 0) < 35000) {
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
        if (now - (this.discoveredRooms[code].lastSeen || 0) < 35000) {
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
      if (now - (r.lastSeen || 0) < 35000) {
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
    // 0. Load any updated rooms from local storage
    this.loadLocalStorageRooms();

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

    // MQTT Cloud with retain: true (Delivered instantly to any new searchers!)
    if (this.mqttClient && this.mqttClient.connected) {
      try {
        this.mqttClient.publish(
          `colorspill/arena/rooms/${this.roomCode}`,
          JSON.stringify(payload),
          { qos: 0, retain: true }
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
          // Clear retained room on MQTT broker
          this.mqttClient.publish(`colorspill/arena/rooms/${code}`, '', { qos: 0, retain: true });
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

    this.lobbyPlayers = [
      { id: 1, name: localPlayerInfo.name, color: localPlayerInfo.color, isHost: true }
    ];

    // Announce room immediately on both local storage and MQTT
    this.subscribeToRoomMqtt(this.roomCode);
    this.startRoomHeartbeat();

    if (this.peer) {
      try { this.peer.destroy(); } catch (e) {}
    }

    try {
      this.peer = new Peer(peerId, {
        debug: 1,
        config: {
          iceServers: ICE_SERVERS
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
  // GUEST: JOIN ROOM (HYBRID WEBRTC + MQTT CLOUD RELAY)
  // ----------------------------------------------------
  joinRoom(code, password, localPlayerInfo, onJoined, onError) {
    this.isHost = false;
    this.isOnline = true;
    clearTimeout(this.joinTimeout);
    clearInterval(this.joinRetryInterval);

    // Clean code formatting: allow "CSP-8492" or "8492" or lower/upper case
    const cleanCode = (code || '').trim().toUpperCase().replace(/^CSP-/, '').replace(/[^A-Z0-9]/g, '');
    if (!cleanCode || cleanCode.length < 3) {
      if (onError) onError('Mã phòng không hợp lệ (cần ít nhất 4 ký tự)!');
      return;
    }

    this.roomCode = cleanCode;
    this.guestClientId = 'g_' + Math.random().toString(36).substr(2, 9);
    const targetPeerId = this.peerPrefix + cleanCode.toLowerCase();

    // Subscribe to MQTT room topics immediately
    this.subscribeToRoomMqtt(cleanCode);

    if (this.peer) {
      try { this.peer.destroy(); } catch (e) {}
    }

    let hasHandledSuccess = false;

    const joinPayload = {
      type: 'JOIN_REQUEST',
      guestClientId: this.guestClientId,
      player: {
        name: localPlayerInfo.name,
        color: localPlayerInfo.color
      },
      password: password ? String(password).trim() : '',
      msgId: 'join_' + this.guestClientId + '_' + Date.now()
    };

    // Helper to send join request over both WebRTC (if ready) and MQTT Cloud Relay
    const sendJoinRequest = () => {
      if (hasHandledSuccess) return;

      // 1. Send via WebRTC DataChannel if open
      if (this.hostConn && this.hostConn.open) {
        try { this.hostConn.send(joinPayload); } catch (e) {}
      }

      // 2. Send via MQTT Cloud Relay (traverses symmetric NAT, mobile 4G/5G, firewalls)
      if (this.mqttClient && this.mqttClient.connected) {
        try {
          this.mqttClient.publish(
            `colorspill/arena/room/${cleanCode}/to_host`,
            JSON.stringify(joinPayload),
            { qos: 0 }
          );
        } catch (e) {}
      }
    };

    // Send immediately via MQTT, and retry every 2 seconds
    sendJoinRequest();
    this.joinRetryInterval = setInterval(() => {
      if (hasHandledSuccess) {
        clearInterval(this.joinRetryInterval);
        return;
      }
      sendJoinRequest();
    }, 2000);

    // Start WebRTC Peer connection
    try {
      this.peer = new Peer({
        debug: 1,
        config: {
          iceServers: ICE_SERVERS
        }
      });
    } catch (e) {
      console.warn('PeerJS init warning:', e);
    }

    // Extended 16-second timeout (accommodates slow mobile networks & STUN/TURN negotiation)
    this.joinTimeout = setTimeout(() => {
      if (!hasHandledSuccess) {
        clearInterval(this.joinRetryInterval);
        this.disconnect();
        if (onError) {
          onError(`Hết thời gian chờ kết nối! Không tìm thấy phòng "${cleanCode}" hoặc Chủ phòng đã đóng.`);
        }
      }
    }, 16000);

    if (this.peer) {
      this.peer.on('open', () => {
        const conn = this.peer.connect(targetPeerId, { reliable: true });
        this.hostConn = conn;

        conn.on('data', (data) => {
          this.handleGuestReceivedData(data);
        });

        if (conn.open) {
          sendJoinRequest();
        } else {
          conn.on('open', sendJoinRequest);
        }

        conn.on('error', (err) => {
          console.warn('Guest WebRTC connection error:', err);
          // Don't abort immediately on WebRTC error; MQTT Cloud Relay may still succeed
        });

        conn.on('close', () => {
          if (this.game && this.game.isMatchActive) {
            if (window.appAlert) {
              window.appAlert('Mất kết nối tới Chủ phòng (Host)! Trở về sảnh.', 'MẤT KẾT NỐI', 'warning');
            }
            this.game.exitMatchToLobby();
          }
        });
      });

      this.peer.on('error', (err) => {
        console.warn('PeerJS Guest error:', err);
        // If peer-unavailable on PeerJS Cloud, MQTT Cloud Relay might still connect to active host
      });
    }

    // Hook internal callbacks into instance so handleGuestReceivedData can trigger onJoined/onError
    this._onJoined = (roomCode) => {
      if (hasHandledSuccess) return;
      hasHandledSuccess = true;
      clearInterval(this.joinRetryInterval);
      clearTimeout(this.joinTimeout);
      if (onJoined) onJoined(roomCode);
    };

    this._onJoinRejected = (reason) => {
      if (hasHandledSuccess) return;
      hasHandledSuccess = true;
      clearInterval(this.joinRetryInterval);
      clearTimeout(this.joinTimeout);
      this.disconnect();
      if (onError) onError(reason);
    };
  }

  // ----------------------------------------------------
  // HOST DATA HANDLING
  // ----------------------------------------------------
  sendToGuest(conn, guestClientId, msg) {
    msg.msgId = msg.msgId || ('h_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6));
    if (conn && conn.open) {
      try { conn.send(msg); } catch (e) {}
    }
    if (this.mqttClient && this.mqttClient.connected && this.roomCode) {
      try {
        const topic = guestClientId
          ? `colorspill/arena/room/${this.roomCode}/guest/${guestClientId}`
          : `colorspill/arena/room/${this.roomCode}/broadcast`;
        this.mqttClient.publish(topic, JSON.stringify(msg), { qos: 0 });
      } catch (e) {}
    }
  }

  broadcastToAll(msg) {
    msg.msgId = msg.msgId || ('h_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6));
    this.connections.forEach(conn => {
      if (conn && conn.open) {
        try { conn.send(msg); } catch (e) {}
      }
    });
    if (this.mqttClient && this.mqttClient.connected && this.roomCode) {
      try {
        this.mqttClient.publish(
          `colorspill/arena/room/${this.roomCode}/broadcast`,
          JSON.stringify(msg),
          { qos: 0 }
        );
      } catch (e) {}
    }
  }

  handleHostReceivedData(conn, data) {
    if (!data || !data.type) return;

    if (data.type === 'JOIN_REQUEST') {
      const guestClientId = data.guestClientId || (conn ? conn.peer : null);

      if (this.roomInfo && this.roomInfo.isPrivate) {
        const guestPass = (data.password || '').trim();
        const roomPass = (this.roomInfo.password || '').trim();
        if (!guestPass || guestPass !== roomPass) {
          this.sendToGuest(conn, guestClientId, {
            type: 'JOIN_REJECT',
            reason: 'Sai mật khẩu phòng! Vui lòng thử lại.'
          });
          if (conn) setTimeout(() => { try { conn.close(); } catch (e) {} }, 600);
          return;
        }
      }

      if (this.lobbyPlayers.length >= 4) {
        this.sendToGuest(conn, guestClientId, {
          type: 'JOIN_REJECT',
          reason: 'Phòng đã đủ tối đa 4 người chơi!'
        });
        if (conn) setTimeout(() => { try { conn.close(); } catch (e) {} }, 600);
        return;
      }

      if (this.game && this.game.isMatchActive) {
        this.sendToGuest(conn, guestClientId, {
          type: 'JOIN_REJECT',
          reason: 'Trận đấu đang diễn ra, không thể tham gia lúc này!'
        });
        if (conn) setTimeout(() => { try { conn.close(); } catch (e) {} }, 600);
        return;
      }

      // Check if player is already added
      let existing = this.lobbyPlayers.find(p => (guestClientId && p.guestClientId === guestClientId) || (conn && p.connId === conn.peer));
      let assignedId = existing ? existing.id : this.lobbyPlayers.length + 1; // 2, 3, 4

      if (conn && !this.connections.includes(conn)) {
        this.connections.push(conn);
      }

      if (!existing) {
        this.lobbyPlayers.push({
          id: assignedId,
          name: (data.player && data.player.name) || `Người chơi ${assignedId}`,
          color: (data.player && data.player.color) || '#ff3366',
          connId: conn ? conn.peer : null,
          guestClientId: guestClientId,
          isHost: false
        });
      }

      this.sendToGuest(conn, guestClientId, {
        type: 'JOIN_SUCCESS',
        myId: assignedId,
        roomCode: this.roomCode
      });

      this.broadcastLobbyState();
      this.broadcastRoomHeartbeatOnce();
    }
    else if (data.type === 'CLIENT_ACTION') {
      if (this.game && this.game.handleClientTurnAction) {
        this.game.handleClientTurnAction(data.playerId, data.action);
      }
    }
  }

  broadcastLobbyState() {
    this.broadcastToAll({
      type: 'LOBBY_STATE',
      players: this.lobbyPlayers
    });
    if (this.game && this.game.onLobbyUpdate) {
      this.game.onLobbyUpdate(this.lobbyPlayers);
    }
  }

  broadcastGameStart(matchData) {
    this.broadcastToAll({
      type: 'GAME_START',
      matchData: matchData
    });
  }

  broadcastHostSnapshot(snapshot) {
    this.broadcastToAll({
      type: 'HOST_SNAPSHOT',
      snapshot: snapshot
    });
  }

  broadcastGameOver(result) {
    this.broadcastToAll({
      type: 'GAME_OVER',
      result: result
    });
  }

  // ----------------------------------------------------
  // GUEST DATA HANDLING
  // ----------------------------------------------------
  handleGuestReceivedData(data) {
    if (!data || !data.type) return;

    if (data.type === 'JOIN_SUCCESS') {
      this.myNetId = data.myId;
      if (this._onJoined) {
        this._onJoined(this.roomCode);
      }
    } else if (data.type === 'JOIN_REJECT') {
      if (this._onJoinRejected) {
        this._onJoinRejected(data.reason || 'Bị từ chối tham gia phòng!');
      }
      return;
    } else if (data.type === 'LOBBY_STATE') {
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
    const msg = {
      type: 'CLIENT_ACTION',
      playerId: this.myNetId,
      guestClientId: this.guestClientId,
      action: action,
      msgId: 'g_' + this.myNetId + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6)
    };

    if (this.hostConn && this.hostConn.open) {
      try { this.hostConn.send(msg); } catch (e) {}
    }

    if (this.mqttClient && this.mqttClient.connected && this.roomCode) {
      try {
        this.mqttClient.publish(
          `colorspill/arena/room/${this.roomCode}/to_host`,
          JSON.stringify(msg),
          { qos: 0 }
        );
      } catch (e) {}
    }
  }

  disconnect() {
    clearTimeout(this.joinTimeout);
    clearInterval(this.joinRetryInterval);
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

