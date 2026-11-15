export type MusicGenre =
  | 'bollywood_pop'
  | 'lofi_chill'
  | 'hiphop_rap'
  | 'edm_club'
  | 'romantic_acoustic';

export interface SynthMixConfig {
  bpm: number;
  genre: MusicGenre;
  scaleNotes: number[]; // Frequencies in Hz
  chordProgression: number[][]; // 4 chords, each array of Hz
  drumsEnabled: boolean;
  bassEnabled: boolean;
  chordsEnabled: boolean;
  vocalEnabled: boolean;
}

export const GENRE_SCALES: Record<
  MusicGenre,
  { scale: number[]; chords: number[][] }
> = {
  bollywood_pop: {
    // A minor / C major uplifting Bollywood scale
    scale: [440, 493.88, 523.25, 587.33, 659.25, 698.46, 783.99, 880],
    chords: [
      [220, 261.63, 329.63], // Am
      [174.61, 220, 261.63], // F
      [261.63, 329.63, 392.0], // C
      [196.0, 246.94, 293.66], // G
    ],
  },
  lofi_chill: {
    // D minor 7th chill lo-fi
    scale: [293.66, 329.63, 349.23, 392.0, 440, 523.25, 587.33],
    chords: [
      [293.66, 349.23, 440, 523.25], // Dm7
      [196.0, 246.94, 293.66, 349.23], // G7
      [261.63, 329.63, 392.0, 493.88], // Cmaj7
      [220, 261.63, 329.63, 392.0], // Am7
    ],
  },
  hiphop_rap: {
    // E minor Phrygian trap
    scale: [329.63, 349.23, 392.0, 440, 493.88, 523.25, 659.25],
    chords: [
      [164.81, 246.94, 329.63], // Em
      [174.61, 261.63, 349.23], // F
      [196.0, 293.66, 392.0], // G
      [164.81, 246.94, 329.63], // Em
    ],
  },
  edm_club: {
    // F# minor festival progression
    scale: [369.99, 415.3, 440, 493.88, 554.37, 587.33, 659.25, 739.99],
    chords: [
      [185.0, 220, 277.18], // F#m
      [146.83, 185.0, 220], // D
      [220, 277.18, 329.63], // A
      [164.81, 207.65, 246.94], // E
    ],
  },
  romantic_acoustic: {
    // C major warm ballad
    scale: [261.63, 293.66, 329.63, 392.0, 440, 523.25, 587.33],
    chords: [
      [261.63, 329.63, 392.0], // C
      [196.0, 246.94, 293.66], // G
      [220, 261.63, 329.63], // Am
      [174.61, 220, 261.63], // F
    ],
  },
};

function createNoiseBuffer(ctx: BaseAudioContext, durationSec = 0.25): AudioBuffer {
  const length = Math.max(1, Math.floor(ctx.sampleRate * durationSec));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

export function triggerKick(
  ctx: BaseAudioContext,
  dest: AudioNode,
  time: number,
  gainAmount = 0.72
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(145, time);
  osc.frequency.exponentialRampToValueAtTime(42, time + 0.14);

  gain.gain.setValueAtTime(gainAmount, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.28);

  osc.connect(gain);
  gain.connect(dest);
  osc.start(time);
  osc.stop(time + 0.29);
}

export function triggerSnare(
  ctx: BaseAudioContext,
  dest: AudioNode,
  noiseBuffer: AudioBuffer,
  time: number,
  gainAmount = 0.36
) {
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1850, time);
  filter.Q.setValueAtTime(1.1, time);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(gainAmount, time);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);

  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(dest);
  noise.start(time);
  noise.stop(time + 0.17);

  const body = ctx.createOscillator();
  const bodyGain = ctx.createGain();
  body.type = 'triangle';
  body.frequency.setValueAtTime(185, time);
  body.frequency.exponentialRampToValueAtTime(95, time + 0.08);
  bodyGain.gain.setValueAtTime(gainAmount * 0.65, time);
  bodyGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
  body.connect(bodyGain);
  bodyGain.connect(dest);
  body.start(time);
  body.stop(time + 0.11);
}

export function triggerHiHat(
  ctx: BaseAudioContext,
  dest: AudioNode,
  noiseBuffer: AudioBuffer,
  time: number,
  open = false
) {
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;

  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.setValueAtTime(6800, time);

  const gain = ctx.createGain();
  const dur = open ? 0.14 : 0.045;
  gain.gain.setValueAtTime(open ? 0.14 : 0.1, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

  noise.connect(hp);
  hp.connect(gain);
  gain.connect(dest);
  noise.start(time);
  noise.stop(time + dur + 0.01);
}

export function triggerBassNote(
  ctx: BaseAudioContext,
  dest: AudioNode,
  freq: number,
  time: number,
  duration: number
) {
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(freq / 2, time);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(340, time);
  filter.frequency.exponentialRampToValueAtTime(140, time + duration);

  gain.gain.setValueAtTime(0.001, time);
  gain.gain.linearRampToValueAtTime(0.28, time + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  osc.start(time);
  osc.stop(time + duration + 0.02);
}

export function triggerChordPad(
  ctx: BaseAudioContext,
  dest: AudioNode,
  chordFreqs: number[],
  time: number,
  duration: number
) {
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1450, time);

  gain.gain.setValueAtTime(0.001, time);
  gain.gain.linearRampToValueAtTime(0.11, time + 0.08);
  gain.gain.setValueAtTime(0.09, time + duration * 0.72);
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

  filter.connect(gain);
  gain.connect(dest);

  for (const freq of chordFreqs) {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);
    osc.connect(filter);
    osc.start(time);
    osc.stop(time + duration + 0.03);
  }
}

export function triggerVocalSynthNote(
  ctx: BaseAudioContext,
  dest: AudioNode,
  freq: number,
  time: number,
  duration: number,
  vowelIndex = 0
) {
  // Dual-formant vocal synthesizer ("aah / ooh / eeh") with subtle vibrato
  const osc = ctx.createOscillator();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(freq, time);

  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(5.4, time);
  lfoGain.gain.setValueAtTime(4.2, time);
  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);

  const formants = [
    [730, 1090], // "ah"
    [400, 1800], // "eh"
    [320, 920], // "oh"
  ];
  const [f1Freq, f2Freq] = formants[vowelIndex % formants.length];

  const f1 = ctx.createBiquadFilter();
  f1.type = 'bandpass';
  f1.frequency.setValueAtTime(f1Freq, time);
  f1.Q.setValueAtTime(4.5, time);

  const f2 = ctx.createBiquadFilter();
  f2.type = 'bandpass';
  f2.frequency.setValueAtTime(f2Freq, time);
  f2.Q.setValueAtTime(5.5, time);

  const master = ctx.createGain();
  master.gain.setValueAtTime(0.001, time);
  master.gain.linearRampToValueAtTime(0.24, time + 0.045);
  master.gain.setValueAtTime(0.2, time + duration * 0.65);
  master.gain.exponentialRampToValueAtTime(0.001, time + duration);

  osc.connect(f1);
  osc.connect(f2);
  f1.connect(master);
  f2.connect(master);
  master.connect(dest);

  osc.start(time);
  lfo.start(time);
  osc.stop(time + duration + 0.03);
  lfo.stop(time + duration + 0.03);
}

export function schedulePatternStep(
  ctx: BaseAudioContext,
  dest: AudioNode,
  noiseBuffer: AudioBuffer,
  stepIndex: number,
  time: number,
  config: SynthMixConfig
) {
  const stepInBar = stepIndex % 16;
  const barIndex = Math.floor(stepIndex / 16) % config.chordProgression.length;
  const stepSec = 60 / config.bpm / 4; // 16th note duration
  const chord = config.chordProgression[barIndex];

  // 1. Drums
  if (config.drumsEnabled) {
    if (config.genre === 'edm_club' || config.genre === 'bollywood_pop') {
      if (stepInBar % 4 === 0) triggerKick(ctx, dest, time, 0.72);
      if (stepInBar === 4 || stepInBar === 12) triggerSnare(ctx, dest, noiseBuffer, time, 0.34);
      if (stepInBar % 2 === 1) triggerHiHat(ctx, dest, noiseBuffer, time, stepInBar === 10);
    } else if (config.genre === 'hiphop_rap') {
      if (stepInBar === 0 || stepInBar === 6 || stepInBar === 10) triggerKick(ctx, dest, time, 0.78);
      if (stepInBar === 4 || stepInBar === 12) triggerSnare(ctx, dest, noiseBuffer, time, 0.4);
      triggerHiHat(ctx, dest, noiseBuffer, time, stepInBar === 14);
    } else {
      if (stepInBar === 0 || stepInBar === 10) triggerKick(ctx, dest, time, 0.52);
      if (stepInBar === 4 || stepInBar === 12) triggerSnare(ctx, dest, noiseBuffer, time, 0.24);
      if (stepInBar % 2 === 0) triggerHiHat(ctx, dest, noiseBuffer, time, false);
    }
  }

  // 2. Bassline
  if (config.bassEnabled && chord.length > 0) {
    if (stepInBar === 0 || stepInBar === 6 || stepInBar === 8 || stepInBar === 12) {
      triggerBassNote(ctx, dest, chord[0], time, stepSec * 2.2);
    }
  }

  // 3. Chord Pad on bar downbeat
  if (config.chordsEnabled && stepInBar === 0) {
    triggerChordPad(ctx, dest, chord, time, stepSec * 15.2);
  }

  // 4. Vocal Lead Melody
  const melodyPattern = [0, -1, 2, -1, 4, -1, 3, 2, 1, -1, 2, 4, 5, -1, 4, -1];
  if (config.vocalEnabled) {
    const scaleIdx = melodyPattern[stepInBar];
    if (scaleIdx >= 0 && config.scaleNotes.length > 0) {
      const noteFreq =
        config.scaleNotes[(scaleIdx + barIndex) % config.scaleNotes.length];
      triggerVocalSynthNote(
        ctx,
        dest,
        noteFreq,
        time,
        stepSec * 1.9,
        stepInBar + barIndex
      );
    }
  }
}

function encodeWavFromAudioBuffer(buffer: AudioBuffer): Blob {
  const numChannels = Math.min(2, buffer.numberOfChannels);
  const sampleRate = buffer.sampleRate;
  const numFrames = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = numFrames * blockAlign;
  const totalSize = 44 + dataSize;

  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // AudioFormat = PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // Bits per sample
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channels.push(buffer.getChannelData(c));
  }

  let offset = 44;
  for (let i = 0; i < numFrames; i++) {
    for (let c = 0; c < numChannels; c++) {
      const sample = Math.max(-1, Math.min(1, channels[c][i]));
      view.setInt16(
        offset,
        sample < 0 ? sample * 0x8000 : sample * 0x7fff,
        true
      );
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

export async function renderSongToWavBlob(
  config: SynthMixConfig,
  bars = 8
): Promise<Blob> {
  const sampleRate = 44100;
  const totalSteps = bars * 16;
  const stepSec = 60 / config.bpm / 4;
  const totalDuration = totalSteps * stepSec + 1.2;

  const offlineCtx = new OfflineAudioContext(
    2,
    Math.ceil(sampleRate * totalDuration),
    sampleRate
  );

  const masterGain = offlineCtx.createGain();
  masterGain.gain.setValueAtTime(0.85, 0);
  masterGain.connect(offlineCtx.destination);

  const noiseBuffer = createNoiseBuffer(offlineCtx, 0.25);

  for (let step = 0; step < totalSteps; step++) {
    const time = 0.05 + step * stepSec;
    schedulePatternStep(
      offlineCtx,
      masterGain,
      noiseBuffer,
      step,
      time,
      config
    );
  }

  const rendered = await offlineCtx.startRendering();
  return encodeWavFromAudioBuffer(rendered);
}

export function createLiveNoiseBuffer(ctx: AudioContext): AudioBuffer {
  return createNoiseBuffer(ctx, 0.25);
}
