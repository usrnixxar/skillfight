import { GameSettings } from '../types/game';

class SoundManager {
  private ctx: AudioContext | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private bgmOscillators: (OscillatorNode | GainNode)[] = [];
  private bgmPlaying = false;
  private isMuted = false;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.bgmGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();

      this.bgmGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public updateSettings(settings: GameSettings) {
    this.initContext();
    if (!this.ctx || !this.masterGain || !this.bgmGain || !this.sfxGain) return;

    const master = (settings.masterVolume / 100);
    const bgm = settings.musicEnabled ? (settings.musicVolume / 100) : 0;
    const sfx = settings.sfxEnabled ? (settings.sfxVolume / 100) : 0;

    this.masterGain.gain.setValueAtTime(master, this.ctx.currentTime);
    this.bgmGain.gain.setValueAtTime(bgm * 0.35, this.ctx.currentTime); // keep BGM pleasant behind SFX
    this.sfxGain.gain.setValueAtTime(sfx * 0.8, this.ctx.currentTime);

    if (settings.musicEnabled && !this.bgmPlaying) {
      this.startBgm();
    } else if (!settings.musicEnabled && this.bgmPlaying) {
      this.stopBgm();
    }
  }

  // --- UI SOUNDS ---

  public playHover() {
    try {
      this.initContext();
      if (!this.ctx || !this.sfxGain) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, t);
      osc.frequency.exponentialRampToValueAtTime(740, t + 0.06);

      gain.gain.setValueAtTime(0.04, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.06);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  public playClick() {
    try {
      this.initContext();
      if (!this.ctx || !this.sfxGain) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(140, t + 0.08);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.08);
    } catch {}
  }

  // --- COUNTDOWN SOUNDS ---

  public playCountdownTick(num: number) {
    try {
      this.initContext();
      if (!this.ctx || !this.sfxGain) return;
      const t = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // Pitch rises: 3 -> 440Hz, 2 -> 550Hz, 1 -> 660Hz
      const freq = num === 3 ? 440 : num === 2 ? 550 : 660;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.22);
    } catch {}
  }

  public playGoSound() {
    try {
      this.initContext();
      if (!this.ctx || !this.sfxGain) return;
      const t = this.ctx.currentTime;

      // Bright major chord for "GO!"
      [880, 1100, 1320].forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.05, t + 0.4);

        gain.gain.setValueAtTime(0.15 / (i + 1), t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);

        osc.connect(gain);
        gain.connect(this.sfxGain!);

        osc.start(t);
        osc.stop(t + 0.45);
      });
    } catch {}
  }

  // --- TYPING SOUNDS ---

  public playTypingKey() {
    try {
      this.initContext();
      if (!this.ctx || !this.sfxGain) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const freq = 600 + Math.random() * 200;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.03, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.04);
    } catch {}
  }

  public playTypeError() {
    try {
      this.initContext();
      if (!this.ctx || !this.sfxGain) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, t);
      osc.frequency.linearRampToValueAtTime(110, t + 0.12);

      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.12);
    } catch {}
  }

  // --- COMBAT ATTACK SOUNDS ---

  public playShoot(isPlayer: boolean) {
    try {
      this.initContext();
      if (!this.ctx || !this.sfxGain) return;
      const t = this.ctx.currentTime;

      // Laser energy zap with sweep
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      const startF = isPlayer ? 1200 : 980;
      const endF = isPlayer ? 280 : 220;

      osc.frequency.setValueAtTime(startF, t);
      osc.frequency.exponentialRampToValueAtTime(endF, t + 0.35);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.35);
    } catch {}
  }

  public playImpact(isPlayer: boolean) {
    try {
      this.initContext();
      if (!this.ctx || !this.sfxGain) return;
      const t = this.ctx.currentTime;

      // Impact crunch (noise + low thud)
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.28);

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.28);
    } catch {}
  }

  // --- ROUND & MATCH VICTORY/DEFEAT ---

  public playRoundWin() {
    try {
      this.initContext();
      if (!this.ctx || !this.sfxGain) return;
      const t = this.ctx.currentTime;

      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        const delay = idx * 0.08;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + delay);

        gain.gain.setValueAtTime(0.12, t + delay);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.3);

        osc.connect(gain);
        gain.connect(this.sfxGain!);

        osc.start(t + delay);
        osc.stop(t + delay + 0.3);
      });
    } catch {}
  }

  public playVictory() {
    try {
      this.initContext();
      if (!this.ctx || !this.sfxGain) return;
      const t = this.ctx.currentTime;

      // Fanfare sequence
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        const delay = idx * 0.12;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t + delay);

        gain.gain.setValueAtTime(0.18, t + delay);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.6);

        osc.connect(gain);
        gain.connect(this.sfxGain!);

        osc.start(t + delay);
        osc.stop(t + delay + 0.6);
      });
    } catch {}
  }

  public playDefeat() {
    try {
      this.initContext();
      if (!this.ctx || !this.sfxGain) return;
      const t = this.ctx.currentTime;

      const notes = [440, 415.30, 392, 349.23];
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        const delay = idx * 0.15;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + delay);

        gain.gain.setValueAtTime(0.15, t + delay);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.5);

        osc.connect(gain);
        gain.connect(this.sfxGain!);

        osc.start(t + delay);
        osc.stop(t + delay + 0.5);
      });
    } catch {}
  }

  // --- AMBIENT BGM SYNTHESIS ---

  public startBgm() {
    if (this.bgmPlaying) return;
    try {
      this.initContext();
      if (!this.ctx || !this.bgmGain) return;

      this.bgmPlaying = true;
      this.loopBgmBeat();
    } catch {}
  }

  private bgmInterval: number | null = null;
  private loopBgmBeat() {
    if (!this.bgmPlaying || !this.ctx || !this.bgmGain) return;

    // Synthesize a calming, rhythmic fantasy battle pulse
    const chordProgressions = [
      [130.81, 196.00, 261.63], // C3, G3, C4
      [146.83, 220.00, 293.66], // D3, A3, D4
      [110.00, 164.81, 220.00], // A2, E3, A3
      [123.47, 185.00, 246.94]  // B2, F#3, B3
    ];
    let step = 0;

    const playChord = () => {
      if (!this.bgmPlaying || !this.ctx || !this.bgmGain) return;
      const t = this.ctx.currentTime;
      const notes = chordProgressions[step % chordProgressions.length];
      step++;

      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const filter = this.ctx!.createBiquadFilter();
        const gain = this.ctx!.createGain();

        osc.type = idx === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, t);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(700, t);

        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(0.06 / (idx + 1), t + 0.6);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.bgmGain!);

        osc.start(t);
        osc.stop(t + 2.5);
      });
    };

    playChord();
    this.bgmInterval = window.setInterval(playChord, 2400);
  }

  public stopBgm() {
    this.bgmPlaying = false;
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }
}

export const soundManager = new SoundManager();
