// ========================================================
// COLOR SPILL - NETWORK MANAGER (P2P WebRTC + MQTT Room Discovery)
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
      this.mqttClient.publish(`colorspill/arena/rooms/${this.roomCode}`, '', { qos: 0 });
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
        { id: 1, name: localPlayerInfo.name, color: localPlayerInfo.color, isHost: true }
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
          const disconnectedPlayer = this.lobbyPlayers.find(p => p.connId === conn.peer);
          this.connections = this.connections.filter(c => c !== conn);
          this.lobbyPlayers = this.lobbyPlayers.filter(p => p.connId !== conn.peer);
          this.broadcastLobbyState();

          if (disconnectedPlayer && this.game.onPlayerDisconnectedInMatch) {
            this.game.onPlayerDisconnectedInMatch(disconnectedPlayer.id);
          }
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
      if (this.roomInfo && this.roomInfo.isPrivate) {
        if (!data.password || data.password !== this.roomInfo.password) {
          conn.send({ type: 'JOIN_REJECT', reason: 'Sai mật khẩu phòng!' });
          setTimeout(() => conn.close(), 500);
          return;
        }
      }

      if (this.lobbyPlayers.length >= 4) {
        conn.send({ type: 'JOIN_REJECT', reason: 'Phòng đã đủ 4 người chơi!' });
        setTimeout(() => conn.close(), 500);
        return;
      }

      if (this.game.isMatchActive) {
        conn.send({ type: 'JOIN_REJECT', reason: 'Trận đấu đang diễn ra!' });
        setTimeout(() => conn.close(), 500);
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
    }
    else if (data.type === 'CLIENT_ACTION') {
      // Guest sends an in-match turn action to Host
      if (this.game.handleClientTurnAction) {
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
      this.game.finishMatch(data.result.winnerId, data.result.subtitle);
    }
  }

  sendActionToHost(action) {
    if (this.hostConn && this.hostConn.open) {
      this.hostConn.send({
        type: 'CLIENT_ACTION',
        playerId: this.myNetId,
        action: action
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
