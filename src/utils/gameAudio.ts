class GameAudioEngine {
  private ctx: AudioContext | null = null;
  public muted = false;

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.12
  ) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(20, freqEnd),
      now + duration
    );

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  private playNoise(duration: number, filterFreq: number, volume = 0.12) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const sampleCount = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start();
    noise.stop(ctx.currentTime + duration);
  }

  playShoot() {
    this.playTone(420, 95, 0.09, 'sawtooth', 0.09);
    this.playNoise(0.06, 2200, 0.08);
  }

  playHit() {
    this.playTone(760, 440, 0.06, 'triangle', 0.08);
  }

  playEnemyDown() {
    this.playTone(300, 75, 0.18, 'square', 0.1);
    setTimeout(() => this.playTone(620, 880, 0.11, 'sine', 0.08), 55);
  }

  playDamage() {
    this.playTone(150, 65, 0.14, 'sawtooth', 0.1);
  }

  playPickup() {
    this.playTone(520, 780, 0.08, 'sine', 0.1);
    setTimeout(() => this.playTone(780, 1040, 0.1, 'sine', 0.1), 65);
  }

  playBoost() {
    this.playTone(220, 680, 0.25, 'sawtooth', 0.09);
  }

  playCrash() {
    this.playNoise(0.22, 700, 0.16);
    this.playTone(130, 42, 0.22, 'triangle', 0.12);
  }

  playLap() {
    this.playTone(523, 523, 0.09, 'triangle', 0.1);
    setTimeout(() => this.playTone(659, 659, 0.09, 'triangle', 0.1), 90);
    setTimeout(() => this.playTone(784, 1046, 0.18, 'triangle', 0.12), 180);
  }

  playGameOver() {
    this.playTone(360, 220, 0.18, 'triangle', 0.11);
    setTimeout(() => this.playTone(220, 110, 0.32, 'triangle', 0.12), 160);
  }
}

export const gameAudio = new GameAudioEngine();
