// ========================================================
// COLOR SPILL - PEER-TO-PEER WEBRTC NETWORK MANAGER (PEERJS)
// Zero server cost, 100% works on static Vercel hosting!
// ========================================================

class NetworkManager {
  constructor(game) {
    this.game = game;
    this.peer = null;
    this.isHost = false;
    this.isOnline = false;
    this.roomCode = null;
    this.connections = []; // For Host: list of guest data connections
    this.hostConn = null;  // For Guest: connection to host
    this.lobbyPlayers = [];
    this.peerPrefix = 'csp-v1-';
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
  // HOST: CREATE ROOM
  // ----------------------------------------------------
  createRoom(localPlayerInfo, onReady, onError) {
    this.isHost = true;
    this.isOnline = true;
    this.connections = [];
    this.roomCode = this.generateRoomCode();
    const peerId = this.peerPrefix + this.roomCode.toLowerCase();

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

    this.peer.on('open', (id) => {
      this.lobbyPlayers = [
        { id: 0, name: localPlayerInfo.name, color: localPlayerInfo.color, isHost: true }
      ];
      if (onReady) onReady(this.roomCode);
    });

    this.peer.on('connection', (conn) => {
      conn.on('open', () => {
        this.connections.push(conn);

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
  joinRoom(code, localPlayerInfo, onJoined, onError) {
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

    this.peer.on('open', (id) => {
      const conn = this.peer.connect(targetPeerId, { reliable: true });
      this.hostConn = conn;

      conn.on('open', () => {
        // Send join request with player profile
        conn.send({
          type: 'JOIN_REQUEST',
          player: {
            name: localPlayerInfo.name,
            color: localPlayerInfo.color
          }
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
      if (this.lobbyPlayers.length >= 4) {
        conn.send({ type: 'JOIN_REJECT', reason: 'Phòng đã đủ 4 người chơi!' });
        conn.close();
        return;
      }
      const newPlayer = {
        id: this.lobbyPlayers.length,
        connId: conn.peer,
        name: data.player.name || `Người chơi ${this.lobbyPlayers.length + 1}`,
        color: data.player.color,
        isHost: false
      };
      this.lobbyPlayers.push(newPlayer);
      conn.send({ type: 'JOIN_SUCCESS', myId: newPlayer.id, roomCode: this.roomCode });
      this.broadcastLobbyState();
    } else if (data.type === 'CLIENT_INPUT') {
      // Guest changed direction
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
      console.log('Joined room successfully as ID:', this.myNetId);
    } else if (data.type === 'JOIN_REJECT') {
      alert(data.reason || 'Không thể tham gia phòng!');
      this.disconnect();
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
    this.isOnline = false;
    this.isHost = false;
    this.roomCode = null;
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
