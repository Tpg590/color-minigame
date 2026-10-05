// ========================================================
// COLOR SPILL - NETWORK MANAGER (P2P WebRTC + MQTT Room Discovery)
// Serverless: 100% runs on static Vercel with zero backend costs!
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
    this.peerPrefix = 'csp-v1-';

    // MQTT Discovery Client
    this.mqttClient = null;
    this.discoveredRooms = {};
    this.heartbeatInterval = null;

    this.initMqttDiscovery();
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
  // MQTT PUBLIC ROOM DISCOVERY
  // ----------------------------------------------------
  initMqttDiscovery() {
    if (typeof mqtt === 'undefined') return;

    try {
      // Connect to free public WebSockets MQTT broker
      this.mqttClient = mqtt.connect('wss://broker.emqx.io:8084/mqtt', {
        clientId: 'csp_' + Math.random().toString(16).substr(2, 8),
        keepalive: 30,
        reconnectPeriod: 5000
      });

      this.mqttClient.on('connect', () => {
        this.mqttClient.subscribe('colorspill/arena/rooms/#');
      });

      this.mqttClient.on('message', (topic, payload) => {
        try {
          const info = JSON.parse(payload.toString());
          if (info && info.code) {
            info.lastSeen = Date.now();
            this.discoveredRooms[info.code] = info;
            if (this.game.onRoomsUpdated) {
              this.game.onRoomsUpdated(this.getCleanRoomList());
            }
          }
        } catch (e) {}
      });
    } catch (err) {
      console.warn('MQTT Discovery init error (fallback to direct code):', err);
    }
  }

  getCleanRoomList() {
    const now = Date.now();
    const list = [];
    for (const code in this.discoveredRooms) {
      const r = this.discoveredRooms[code];
      // Prune rooms silent for more than 7 seconds
      if (now - r.lastSeen < 7000) {
        list.push(r);
      } else {
        delete this.discoveredRooms[code];
      }
    }
    return list;
  }

  startRoomHeartbeat() {
    clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = setInterval(() => {
      if (this.isHost && this.roomInfo && this.mqttClient && this.mqttClient.connected) {
        const payload = {
          code: this.roomCode,
          name: this.roomInfo.name,
          hostName: this.roomInfo.hostName,
          isPrivate: this.roomInfo.isPrivate,
          count: this.lobbyPlayers.length,
          max: 4,
          timestamp: Date.now()
        };
        this.mqttClient.publish(
          `colorspill/arena/rooms/${this.roomCode}`,
          JSON.stringify(payload),
          { qos: 0 }
        );
      }
    }, 2500);
  }

  stopRoomHeartbeat() {
    clearInterval(this.heartbeatInterval);
    if (this.mqttClient && this.mqttClient.connected && this.roomCode) {
      // Clear topic
      this.mqttClient.publish(`colorspill/arena/rooms/${this.roomCode}`, '', { qos: 0 });
    }
  }

  // ----------------------------------------------------
  // HOST: CREATE ROOM
  // ----------------------------------------------------
  createRoom(config, localPlayerInfo, onReady, onError) {
    this.isHost = true;
    this.isOnline = true;
    this.connections = [];
    this.roomCode = this.generateRoomCode();
    const peerId = this.peerPrefix + this.roomCode.toLowerCase();

    this.roomInfo = {
      code: this.roomCode,
      name: config.roomName || `Phòng của ${localPlayerInfo.name}`,
      hostName: localPlayerInfo.name,
      isPrivate: config.isPrivate,
      password: config.password || ''
    };

    if (this.peer) this.peer.destroy();

    try {
      this.peer = new Peer(peerId, {
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      });
    } catch (e) {
      if (onError) onError(e);
      return;
    }

    this.peer.on('open', () => {
      this.lobbyPlayers = [
        { id: 0, name: localPlayerInfo.name, color: localPlayerInfo.color, isHost: true }
      ];
      this.startRoomHeartbeat();
      if (onReady) onReady(this.roomCode, this.roomInfo);
    });

    this.peer.on('connection', (conn) => {
      conn.on('open', () => {
        conn.on('data', (data) => {
          this.handleHostReceivedData(conn, data);
        });

        conn.on('close', () => {
          this.connections = this.connections.filter(c => c !== conn);
          this.lobbyPlayers = this.lobbyPlayers.filter(p => p.connId !== conn.peer);
          this.broadcastLobbyState();
        });
      });
    });

    this.peer.on('error', (err) => {
      console.warn('PeerJS Host error:', err);
      if (onError) onError(err);
    });
  }

  // ----------------------------------------------------
  // GUEST: JOIN ROOM
  // ----------------------------------------------------
  joinRoom(code, password, localPlayerInfo, onJoined, onError) {
    this.isHost = false;
    this.isOnline = true;
    const cleanCode = code.trim().toUpperCase().replace('CSP-', '');
    this.roomCode = cleanCode;
    const targetPeerId = this.peerPrefix + cleanCode.toLowerCase();

    if (this.peer) this.peer.destroy();

    try {
      this.peer = new Peer({
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      });
    } catch (e) {
      if (onError) onError(e);
      return;
    }

    this.peer.on('open', () => {
      const conn = this.peer.connect(targetPeerId, { reliable: true });
      this.hostConn = conn;

      conn.on('open', () => {
        // Send join request with profile & password
        conn.send({
          type: 'JOIN_REQUEST',
          player: {
            name: localPlayerInfo.name,
            color: localPlayerInfo.color
          },
          password: password || ''
        });
        if (onJoined) onJoined(this.roomCode);
      });

      conn.on('data', (data) => {
        this.handleGuestReceivedData(data);
      });

      conn.on('error', (err) => {
        if (onError) onError(err);
      });

      conn.on('close', () => {
        alert('Mất kết nối tới Chủ phòng (Host)!');
        this.game.showLobby();
      });
    });

    this.peer.on('error', (err) => {
      console.warn('PeerJS Guest error:', err);
      if (onError) onError(err);
    });
  }

  // ----------------------------------------------------
  // HOST DATA HANDLING
  // ----------------------------------------------------
  handleHostReceivedData(conn, data) {
    if (data.type === 'JOIN_REQUEST') {
      // 1. Check Private Password
      if (this.roomInfo && this.roomInfo.isPrivate) {
        if (!data.password || data.password !== this.roomInfo.password) {
          conn.send({ type: 'JOIN_REJECT', reason: 'Sai mật khẩu phòng!' });
          conn.close();
          return;
        }
      }

      // 2. Check Capacity
      if (this.lobbyPlayers.length >= 4) {
        conn.send({ type: 'JOIN_REJECT', reason: 'Phòng đã đủ 4 người chơi!' });
        conn.close();
        return;
      }

      // Accept Guest
      const newPlayer = {
        id: this.lobbyPlayers.length,
        connId: conn.peer,
        name: data.player.name || `Người chơi ${this.lobbyPlayers.length + 1}`,
        color: data.player.color,
        isHost: false
      };
      this.lobbyPlayers.push(newPlayer);
      this.connections.push(conn);

      conn.send({ type: 'JOIN_SUCCESS', myId: newPlayer.id, roomCode: this.roomCode });
      this.broadcastLobbyState();
    } else if (data.type === 'CLIENT_INPUT') {
      const p = this.game.players[data.playerId];
      if (p && p.isAlive) {
        if (data.dir && (data.dir.x !== -p.dir.x || data.dir.y !== -p.dir.y)) {
          p.nextDir = { ...data.dir };
        }
      }
    }
  }

  broadcastLobbyState() {
    const msg = {
      type: 'LOBBY_STATE',
      players: this.lobbyPlayers
    };
    this.connections.forEach(conn => {
      if (conn.open) conn.send(msg);
    });
    if (this.game.onLobbyUpdate) {
      this.game.onLobbyUpdate(this.lobbyPlayers);
    }
  }

  broadcastGameStart(matchData) {
    const msg = {
      type: 'GAME_START',
      matchData: matchData
    };
    this.connections.forEach(conn => {
      if (conn.open) conn.send(msg);
    });
  }

  broadcastHostSnapshot(snapshot) {
    const msg = {
      type: 'HOST_SNAPSHOT',
      snapshot: snapshot
    };
    this.connections.forEach(conn => {
      if (conn.open) conn.send(msg);
    });
  }

  broadcastGameOver(result) {
    const msg = {
      type: 'GAME_OVER',
      result: result
    };
    this.connections.forEach(conn => {
      if (conn.open) conn.send(msg);
    });
  }

  // ----------------------------------------------------
  // GUEST DATA HANDLING
  // ----------------------------------------------------
  handleGuestReceivedData(data) {
    if (data.type === 'JOIN_SUCCESS') {
      this.myNetId = data.myId;
    } else if (data.type === 'JOIN_REJECT') {
      alert(data.reason || 'Không thể tham gia phòng!');
      this.disconnect();
      if (this.game.onJoinFailed) this.game.onJoinFailed(data.reason);
    } else if (data.type === 'LOBBY_STATE') {
      this.lobbyPlayers = data.players;
      if (this.game.onLobbyUpdate) {
        this.game.onLobbyUpdate(this.lobbyPlayers);
      }
    } else if (data.type === 'GAME_START') {
      this.game.startOnlineMatchAsGuest(data.matchData, this.myNetId);
    } else if (data.type === 'HOST_SNAPSHOT') {
      this.game.applyHostSnapshot(data.snapshot);
    } else if (data.type === 'GAME_OVER') {
      this.game.finishMatch(data.result.isVictory, data.result.subtitle);
    }
  }

  sendInputToHost(dir) {
    if (this.hostConn && this.hostConn.open) {
      this.hostConn.send({
        type: 'CLIENT_INPUT',
        playerId: this.myNetId,
        dir: dir
      });
    }
  }

  disconnect() {
    this.stopRoomHeartbeat();
    this.isOnline = false;
    this.isHost = false;
    this.roomCode = null;
    this.roomInfo = null;
    this.connections.forEach(c => c.close());
    this.connections = [];
    if (this.hostConn) {
      this.hostConn.close();
      this.hostConn = null;
    }
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
  }
}

window.NetworkManager = NetworkManager;
