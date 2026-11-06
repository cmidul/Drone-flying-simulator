/**
 * Procedural Web Audio Engine for Drone Flight & Racing.
 * Synthesizes dynamic quadcopter motor sound, boost effects, checkpoint chimes,
 * countdown beeps, impact collisions, and ambient wind.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  
  // Drone motor oscillators & nodes
  private motorOsc1: OscillatorNode | null = null;
  private motorOsc2: OscillatorNode | null = null;
  private motorGain: GainNode | null = null;
  private motorFilter: BiquadFilterNode | null = null;

  // Wind noise node
  private windGain: GainNode | null = null;

  private isRunning = false;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.motorGain) {
      this.motorGain.gain.value = this.isMuted ? 0 : 0.08;
    }
    if (this.windGain) {
      this.windGain.gain.value = this.isMuted ? 0 : 0.04;
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Starts the continuous drone engine sound and background wind.
   */
  public startMotor() {
    if (this.isRunning) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      // 1. Motor Synthesis (Dual sawtooth oscillators detuned slightly for authentic quadcopter buzz)
      this.motorOsc1 = this.ctx.createOscillator();
      this.motorOsc2 = this.ctx.createOscillator();
      this.motorOsc1.type = 'sawtooth';
      this.motorOsc2.type = 'triangle';

      this.motorOsc1.frequency.value = 110; // Base hum ~110 Hz
      this.motorOsc2.frequency.value = 220; // First harmonic

      this.motorFilter = this.ctx.createBiquadFilter();
      this.motorFilter.type = 'lowpass';
      this.motorFilter.frequency.value = 650;

      this.motorGain = this.ctx.createGain();
      this.motorGain.gain.value = this.isMuted ? 0 : 0.08;

      this.motorOsc1.connect(this.motorFilter);
      this.motorOsc2.connect(this.motorFilter);
      this.motorFilter.connect(this.motorGain);
      this.motorGain.connect(this.ctx.destination);

      this.motorOsc1.start();
      this.motorOsc2.start();

      // 2. Wind Noise Generator (Filtered pinkish noise)
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        output[i] = (b0 + b1 + b2) * 0.08;
      }

      const noiseNode = this.ctx.createBufferSource();
      noiseNode.buffer = noiseBuffer;
      noiseNode.loop = true;

      const windFilter = this.ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 350;
      windFilter.Q.value = 0.6;

      this.windGain = this.ctx.createGain();
      this.windGain.gain.value = this.isMuted ? 0 : 0.03;

      noiseNode.connect(windFilter);
      windFilter.connect(this.windGain);
      this.windGain.connect(this.ctx.destination);

      noiseNode.start();
      this.isRunning = true;
    } catch {
      // Audio autoplay policy may defer until user gesture
    }
  }

  /**
   * Updates motor pitch and wind intensity based on drone RPM and speed.
   */
  public updateMotor(rpm: number, speedMps: number, isBoosting: boolean) {
    if (!this.ctx || !this.isRunning || this.isMuted) return;

    const baseFreq = 95 + rpm * 260 + (isBoosting ? 80 : 0);
    const filterFreq = 450 + rpm * 1200 + (isBoosting ? 600 : 0);

    if (this.motorOsc1 && this.motorOsc2 && this.motorFilter) {
      const now = this.ctx.currentTime;
      this.motorOsc1.frequency.setTargetAtTime(baseFreq, now, 0.05);
      this.motorOsc2.frequency.setTargetAtTime(baseFreq * 2.02, now, 0.05);
      this.motorFilter.frequency.setTargetAtTime(filterFreq, now, 0.06);
    }

    if (this.windGain) {
      const windLevel = Math.min(0.12, 0.02 + (speedMps / 50.0) * 0.08);
      this.windGain.gain.setTargetAtTime(windLevel, this.ctx.currentTime, 0.1);
    }
  }

  /**
   * Checkpoint ring chime when crossing a race gate.
   */
  public playGatePass(lapCompleted = false) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = lapCompleted ? [523.25, 659.25, 783.99, 1046.5] : [587.33, 880.0]; // C-E-G-C or D-A

    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0.15, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.4);
    });
  }

  /**
   * Energy core collected in explore mode.
   */
  public playOrbCollect() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(740, now);
    osc.frequency.exponentialRampToValueAtTime(1480, now + 0.18);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  /**
   * Countdown beep for race start (3, 2, 1, GO!).
   */
  public playCountdown(isGo = false) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isGo ? 'sawtooth' : 'sine';
    osc.frequency.setValueAtTime(isGo ? 987.77 : 440, now); // B5 for GO, A4 for 3,2,1

    const dur = isGo ? 0.45 : 0.18;
    gain.gain.setValueAtTime(isGo ? 0.22 : 0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + dur + 0.05);
  }

  /**
   * Ground or obstacle impact thud with camera shake sync.
   */
  public playImpact(severity = 1.0) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.2);

    const vol = Math.min(0.3, 0.08 * severity);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  public stopMotor() {
    if (this.motorGain && this.ctx) {
      this.motorGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
  }

  public resumeMotor() {
    if (this.motorGain && this.ctx && !this.isMuted) {
      this.motorGain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    }
  }
}

export const soundEngine = new SoundEngine();
