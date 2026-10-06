// ========================================================
// COLOR SPILL - AUDIO MANAGER (SFX + BGM)
// Uses genuine audio assets from Color_Spill with synthetic fallback
// ========================================================

class SoundManager {
  constructor() {
    this.ctx = null;
    this.soundEnabled = true;
    this.musicEnabled = true;
    this.audioPool = {};
    this.bgmAudio = null;
    this.currentBgmTrack = null;

    this.sfxPaths = {
      click: 'assets/sfx/ClickButton.mp3',
      cardPlay: 'assets/sfx/CardPlay.mp3',
      drawCard: 'assets/sfx/DrawCard.mp3',
      shuffle: 'assets/sfx/Xaobai.mp3',
      tick: 'assets/sfx/Tick.mp3',
      countdown: 'assets/sfx/321.mp3',
      capture: 'assets/sfx/auraframing.mp3',
      win: 'assets/sfx/YouWin.mp3',
      lose: 'assets/sfx/Lose.mp3',
      tap: 'assets/sfx/virtual_vibes-pop-tap-click-fx-383733.mp3'
    };

    this.bgmPaths = {
      lobby: 'assets/music/Lobby1.mp3',
      match: 'assets/music/Music.mp3',
      waiting: 'assets/music/WaitingRoom.mp3'
    };
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    return this.soundEnabled;
  }

  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    if (!this.musicEnabled && this.bgmAudio) {
      this.bgmAudio.pause();
    } else if (this.musicEnabled && this.bgmAudio) {
      this.bgmAudio.play().catch(() => {});
    }
    return this.musicEnabled;
  }

  playFileSfx(key, volume = 0.7) {
    if (!this.soundEnabled) return;
    this.init();
    const path = this.sfxPaths[key];
    if (!path) return;

    try {
      const audio = new Audio(path);
      audio.volume = volume;
      audio.play().catch(() => {
        // Fallback to web audio synth if file playback blocked
        this.synthFallback(key);
      });
    } catch (e) {
      this.synthFallback(key);
    }
  }

  playBgm(trackKey = 'match', volume = 0.35) {
    if (this.currentBgmTrack === trackKey && this.bgmAudio && !this.bgmAudio.paused) return;
    this.stopBgm();

    const path = this.bgmPaths[trackKey];
    if (!path) return;

    try {
      this.bgmAudio = new Audio(path);
      this.bgmAudio.loop = true;
      this.bgmAudio.volume = volume;
      this.currentBgmTrack = trackKey;
      if (this.musicEnabled) {
        this.bgmAudio.play().catch(e => {
          // Autoplay policy: will start on first user interaction
        });
      }
    } catch (e) {}
  }

  stopBgm() {
    if (this.bgmAudio) {
      this.bgmAudio.pause();
      this.bgmAudio.currentTime = 0;
      this.bgmAudio = null;
    }
    this.currentBgmTrack = null;
  }

  // Synthesizer fallback if assets fail or offline
  synthFallback(type) {
    if (!this.soundEnabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      if (type === 'click' || type === 'tap') {
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.05);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === 'capture') {
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(560, now + 0.25);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'cardPlay') {
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
      }
    } catch (e) {}
  }

  // Common SFX Shortcuts
  playClick() { this.playFileSfx('click', 0.5); }
  playCard() { this.playFileSfx('cardPlay', 0.8); }
  playDraw() { this.playFileSfx('drawCard', 0.7); }
  playShuffle() { this.playFileSfx('shuffle', 0.8); }
  playTick() { this.playFileSfx('tick', 0.4); }
  playCountdown() { this.playFileSfx('countdown', 0.8); }
  playCapture() { this.playFileSfx('capture', 0.85); }
  playWin() { this.playFileSfx('win', 0.9); }
  playLose() { this.playFileSfx('lose', 0.8); }
}

window.sound = new SoundManager();
