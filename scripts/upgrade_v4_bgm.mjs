import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] || process.cwd();

function replaceExact(content, target, replacement, label) {
  if (!content.includes(target)) {
    throw new Error(`[upgrade_v4_bgm] Anchor not found for: ${label}`);
  }
  return content.replace(target, replacement);
}

// ============================================================================
// 1. Replace src/audio/AudioManager.ts with Full Adaptive Web Audio BGM + SFX
// ============================================================================
const audioManagerPath = path.join(root, 'src/audio/AudioManager.ts');
const newAudioManagerCode = `import type { StageId, TowerTier } from '../types';

export type BgmScene = 'hub' | 'prep' | 'combat' | 'overdrive' | 'boss' | 'victory' | 'defeat';
export type BgmOverrideMode = 'auto' | BgmScene;

export const BGM_SCENE_LABELS: Record<BgmScene, string> = {
  hub: 'I. 轨道静默 · Quiet Orbit',
  prep: 'II. 信标校准 · Cradle Calibration',
  combat: 'III. 钢铁防线 · Iron Perimeter',
  overdrive: 'IV. 超载狂潮 · Overdrive Surge',
  boss: 'V. 主宰降临 · Overlord Siege',
  victory: 'VI. 返航星光 · Earthrise Fanfare',
  defeat: 'VII. 信标熄灭 · Signal Lost',
};

export const BGM_SCENE_META: Record<BgmScene, { bpm: number; modeTag: string }> = {
  hub: { bpm: 82, modeTag: 'D Dorian · 82 BPM' },
  prep: { bpm: 104, modeTag: 'Sector Minor · 104 BPM' },
  combat: { bpm: 126, modeTag: 'Mecha Synthwave · 126 BPM' },
  overdrive: { bpm: 132, modeTag: 'High-Tension · 132 BPM' },
  boss: { bpm: 140, modeTag: 'Phrygian Siege · 140 BPM' },
  victory: { bpm: 98, modeTag: 'Lunar Lydian · 98 BPM' },
  defeat: { bpm: 70, modeTag: 'Dark Elegy · 70 BPM' },
};

const MUTE_STORAGE_KEY = 'lunar_beacon_td_muted_v2';
const SAVE_V2_STORAGE_KEY = 'lunar_beacon_save_v2';
const AUDIO_MIX_STORAGE_KEY = 'lunar_beacon_audio_mix_v4';

let fallbackMutedMemory = false;

interface AudioMixPrefs {
  bgmEnabled: boolean;
  bgmVolume: number;
  sfxVolume: number;
}

let fallbackMixMemory: AudioMixPrefs = {
  bgmEnabled: true,
  bgmVolume: 0.72,
  sfxVolume: 0.92,
};

function readInitialMutedFromStorage(): boolean {
  try {
    const rawV2 = localStorage.getItem(SAVE_V2_STORAGE_KEY);
    if (rawV2) {
      const parsed = JSON.parse(rawV2) as { muted?: unknown };
      if (typeof parsed?.muted === 'boolean') {
        fallbackMutedMemory = parsed.muted;
        return parsed.muted;
      }
    }
    const legacy = localStorage.getItem(MUTE_STORAGE_KEY);
    if (legacy !== null) {
      fallbackMutedMemory = legacy === '1';
      return fallbackMutedMemory;
    }
  } catch {
    // Sandboxed iframe storage restriction — use in-memory state cleanly
  }
  return fallbackMutedMemory;
}

function readAudioMixFromStorage(): AudioMixPrefs {
  try {
    const raw = localStorage.getItem(AUDIO_MIX_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AudioMixPrefs>;
      fallbackMixMemory = {
        bgmEnabled: typeof parsed.bgmEnabled === 'boolean' ? parsed.bgmEnabled : true,
        bgmVolume:
          typeof parsed.bgmVolume === 'number'
            ? Math.max(0, Math.min(1, parsed.bgmVolume))
            : 0.72,
        sfxVolume:
          typeof parsed.sfxVolume === 'number'
            ? Math.max(0, Math.min(1, parsed.sfxVolume))
            : 0.92,
      };
    }
  } catch {
    // Ignore sandboxed storage restriction
  }
  return { ...fallbackMixMemory };
}

function persistAudioMixToStorage(prefs: AudioMixPrefs): void {
  fallbackMixMemory = { ...prefs };
  try {
    localStorage.setItem(AUDIO_MIX_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore sandboxed storage restriction
  }
}

function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

const STAGE_ROOT_MIDI: Record<StageId, number> = {
  stage_01: 38, // D2 — Dawn Maintenance Station
  stage_02: 40, // E2 — Twin Rift Mine
  stage_03: 42, // F#2 — Maglev Launch Corridor
  stage_04: 36, // C2 — Omega Ark Citadel
  endless: 43, // G2 — Endless Overdrive
};

// 8-bar melodic & arpeggio phrases (semitone offsets from root, null = rest)
const HUB_ARP_STEPS: ReadonlyArray<number | null> = [
  24, null, 19, null, 26, null, 15, null, 22, null, 19, null, 29, null, 26, null,
  24, null, 19, null, 21, null, 17, null, 26, null, 21, null, 29, null, 24, null,
];

const PREP_ARP_STEPS: ReadonlyArray<number | null> = [
  12, null, 15, 19, null, 15, 24, null, 22, null, 19, 15, null, 19, 26, null,
  12, null, 17, 20, null, 17, 24, null, 22, null, 19, 17, null, 14, 19, null,
];

const COMBAT_BASS_RHYTHM: ReadonlyArray<number | null> = [
  0, 0, 12, 0, null, 0, 12, 0, 0, 0, 12, 0, 7, 0, 12, 10,
];

const COMBAT_LEAD_SECTION_A: ReadonlyArray<number | null> = [
  // Bar 1
  24, null, null, 27, null, null, 31, null, 29, null, 27, null, 26, null, 24, null,
  // Bar 2
  20, null, null, 24, null, null, 27, null, 31, null, 29, null, 27, null, null, null,
  // Bar 3
  22, null, null, 26, null, null, 29, null, 34, null, 31, null, 29, null, 26, null,
  // Bar 4
  27, null, 26, null, 24, null, 19, null, 22, null, 23, null, null, null, null, null,
];

const COMBAT_LEAD_SECTION_B: ReadonlyArray<number | null> = [
  // Bar 5
  32, null, null, 31, null, 27, null, 24, null, 27, 31, null, 32, null, 34, null,
  // Bar 6
  34, null, null, 31, null, 29, null, 26, null, 29, 31, null, 34, null, 36, null,
  // Bar 7
  36, null, null, 34, null, 31, null, 27, 29, null, 31, null, 34, null, 31, null,
  // Bar 8
  31, null, 34, null, 35, null, null, 35, 36, null, 31, null, 23, null, null, null,
];

const BOSS_BASS_OSTINATO: ReadonlyArray<number> = [
  0, 0, 12, 0, 1, 0, 12, 0, 0, 0, 7, 6, 5, 3, 1, 0,
];

const BOSS_BRASS_MOTIF: ReadonlyArray<number | null> = [
  // Bar 1
  24, null, 25, null, 28, null, 24, null, 31, null, 30, 28, 25, null, 24, null,
  // Bar 2
  25, null, 27, null, 32, null, 27, null, 31, null, 28, null, 25, null, null, null,
  // Bar 3
  24, null, 28, null, 31, null, 36, null, 37, null, 36, 31, 28, null, 25, null,
  // Bar 4
  29, null, 27, null, 26, null, 24, null, 23, null, null, 25, 23, null, null, null,
];

const VICTORY_MELODY: ReadonlyArray<number | null> = [
  // Bar 1-2
  24, null, 28, null, 31, null, 36, null, 35, null, 31, null, 26, null, null, null,
  26, null, 31, null, 33, null, 38, null, 36, null, 33, null, 31, null, null, null,
  // Bar 3-4
  33, null, 35, null, 36, null, 40, null, 38, null, 36, null, 31, null, 28, null,
  26, null, 28, null, 31, null, 35, null, 36, null, null, null, null, null, null, null,
];

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private bgmBus: GainNode | null = null;
  private bgmDuckGain: GainNode | null = null;
  private bgmFilter: BiquadFilterNode | null = null;
  private reverbConvolver: ConvolverNode | null = null;
  private delaySend: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private muted = false;
  private bgmEnabled = true;
  private bgmVolume = 0.72;
  private sfxVolume = 0.92;

  private autoScene: BgmScene = 'prep';
  private overrideMode: BgmOverrideMode = 'auto';
  private stageId: StageId = 'stage_01';
  private gamePaused = false;

  private schedulerTimer: number | null = null;
  private nextNoteTime = 0;
  private currentStep = 0;
  private lastScheduledScene: BgmScene | null = null;

  private lastShotTime: Record<string, number> = {};
  private onMuteChange?: (muted: boolean) => void;

  constructor(initialMuted?: boolean, onMuteChange?: (muted: boolean) => void) {
    this.onMuteChange = onMuteChange;
    if (typeof initialMuted === 'boolean') {
      this.muted = initialMuted;
      fallbackMutedMemory = initialMuted;
    } else {
      this.muted = readInitialMutedFromStorage();
    }
    const mix = readAudioMixFromStorage();
    this.bgmEnabled = mix.bgmEnabled;
    this.bgmVolume = mix.bgmVolume;
    this.sfxVolume = mix.sfxVolume;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    fallbackMutedMemory = muted;
    if (this.onMuteChange) {
      this.onMuteChange(this.muted);
    } else {
      try {
        localStorage.setItem(MUTE_STORAGE_KEY, this.muted ? '1' : '0');
      } catch {
        // Ignore storage restriction
      }
    }
    this.syncGainLevels();
  }

  public toggleMute(): boolean {
    this.unlock();
    this.setMuted(!this.muted);
    return this.muted;
  }

  public isBgmEnabled(): boolean {
    return this.bgmEnabled;
  }

  public setBgmEnabled(enabled: boolean): void {
    this.unlock();
    this.bgmEnabled = enabled;
    this.persistMix();
    this.syncGainLevels();
  }

  public toggleBgm(): boolean {
    this.setBgmEnabled(!this.bgmEnabled);
    return this.bgmEnabled;
  }

  public getBgmVolume(): number {
    return this.bgmVolume;
  }

  public setBgmVolume(vol: number): void {
    this.unlock();
    this.bgmVolume = Math.max(0, Math.min(1, vol));
    if (this.bgmVolume > 0.01 && !this.bgmEnabled) {
      this.bgmEnabled = true;
    }
    this.persistMix();
    this.syncGainLevels();
  }

  public getSfxVolume(): number {
    return this.sfxVolume;
  }

  public setSfxVolume(vol: number): void {
    this.unlock();
    this.sfxVolume = Math.max(0, Math.min(1, vol));
    this.persistMix();
    this.syncGainLevels();
  }

  public getBgmOverrideMode(): BgmOverrideMode {
    return this.overrideMode;
  }

  public setBgmOverrideMode(mode: BgmOverrideMode): void {
    this.unlock();
    if (this.overrideMode !== mode) {
      this.overrideMode = mode;
      this.currentStep = 0;
      if (this.ctx) {
        this.nextNoteTime = Math.max(this.ctx.currentTime + 0.03, this.nextNoteTime);
      }
    }
    if (!this.bgmEnabled && mode !== 'auto') {
      this.bgmEnabled = true;
      this.persistMix();
    }
    this.syncGainLevels();
    this.syncFilterCutoff();
  }

  public getActiveBgmScene(): BgmScene {
    return this.overrideMode === 'auto' ? this.autoScene : this.overrideMode;
  }

  public getActiveBgmLabel(): string {
    return BGM_SCENE_LABELS[this.getActiveBgmScene()];
  }

  public getActiveBgmMeta(): { bpm: number; modeTag: string; stepBar: number } {
    const meta = BGM_SCENE_META[this.getActiveBgmScene()];
    return {
      bpm: meta.bpm,
      modeTag: meta.modeTag,
      stepBar: Math.floor(this.currentStep / 16) + 1,
    };
  }

  public updateAdaptiveBgm(params: {
    scene: BgmScene;
    stageId: StageId;
    paused: boolean;
  }): void {
    const prevEffective = this.getActiveBgmScene();
    this.autoScene = params.scene;
    this.stageId = params.stageId;
    this.gamePaused = params.paused;
    const nextEffective = this.getActiveBgmScene();
    if (prevEffective !== nextEffective) {
      // Align transition to next bar / phrase boundary cleanly
      this.currentStep = 0;
    }
    this.syncFilterCutoff();
  }

  private persistMix(): void {
    persistAudioMixToStorage({
      bgmEnabled: this.bgmEnabled,
      bgmVolume: this.bgmVolume,
      sfxVolume: this.sfxVolume,
    });
  }

  private syncGainLevels(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 0.46, now, 0.025);
    }
    if (this.sfxBus) {
      this.sfxBus.gain.setTargetAtTime(this.sfxVolume, now, 0.02);
    }
    if (this.bgmBus) {
      const targetBgm = this.bgmEnabled && !this.muted ? this.bgmVolume * 0.76 : 0;
      this.bgmBus.gain.setTargetAtTime(targetBgm, now, 0.06);
    }
  }

  private syncFilterCutoff(): void {
    if (!this.ctx || !this.bgmFilter) return;
    const now = this.ctx.currentTime;
    // Muffle BGM underwater when paused ONLY if player hasn't manually chosen a preview track
    const muffle = this.gamePaused && this.overrideMode === 'auto';
    const scene = this.getActiveBgmScene();
    const baseHz = scene === 'defeat' ? 1450 : 16500;
    const targetHz = muffle ? 520 : baseHz;
    this.bgmFilter.frequency.setTargetAtTime(targetHz, now, 0.14);
  }

  private duckBgm(dipGain: number, holdSec: number, recoverSec: number): void {
    if (!this.ctx || !this.bgmDuckGain) return;
    const t0 = this.ctx.currentTime;
    const g = this.bgmDuckGain.gain;
    g.cancelScheduledValues(t0);
    g.setValueAtTime(Math.max(0.05, g.value), t0);
    g.linearRampToValueAtTime(Math.max(0.04, dipGain), t0 + 0.035);
    g.setValueAtTime(Math.max(0.04, dipGain), t0 + holdSec);
    g.linearRampToValueAtTime(1.0, t0 + holdSec + recoverSec);
  }

  private buildLunarCavernImpulse(ctx: AudioContext): AudioBuffer {
    const duration = 1.65;
    const len = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    const earlyMs = [17, 33, 54, 79, 112];
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const u = i / len;
        const env = Math.pow(1 - u, 2.85);
        const white = (Math.random() * 2 - 1) * env * 0.42;
        lp = lp * 0.54 + white * 0.46;
        data[i] = lp;
      }
      for (let e = 0; e < earlyMs.length; e++) {
        const idx = Math.floor(((earlyMs[e] + ch * 6) / 1000) * ctx.sampleRate);
        if (idx < len) {
          data[idx] += (e % 2 === 0 ? 0.36 : -0.28) * Math.pow(0.78, e);
        }
      }
    }
    return buf;
  }

  public unlock(): void {
    if (!this.ctx) {
      const AudioCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) return;
      this.ctx = new AudioCtor();

      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.knee.value = 12;
      comp.ratio.value = 5;
      comp.attack.value = 0.004;
      comp.release.value = 0.18;

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.46;
      this.masterGain.connect(comp);
      comp.connect(this.ctx.destination);

      // SFX sub-bus
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = this.sfxVolume;
      this.sfxBus.connect(this.masterGain);

      // BGM sub-bus with low-pass pause filter, sidechain ducking, cavern reverb & stereo ping-pong delay
      this.bgmBus = this.ctx.createGain();
      this.bgmBus.gain.value = this.bgmEnabled && !this.muted ? this.bgmVolume * 0.76 : 0;
      this.bgmBus.connect(this.masterGain);

      this.bgmDuckGain = this.ctx.createGain();
      this.bgmDuckGain.gain.value = 1.0;
      this.bgmDuckGain.connect(this.bgmBus);

      this.bgmFilter = this.ctx.createBiquadFilter();
      this.bgmFilter.type = 'lowpass';
      this.bgmFilter.frequency.value = 16500;
      this.bgmFilter.Q.value = 0.7;
      this.bgmFilter.connect(this.bgmDuckGain);

      // Stereo Lunar Cavern Convolution Reverb
      this.reverbConvolver = this.ctx.createConvolver();
      this.reverbConvolver.buffer = this.buildLunarCavernImpulse(this.ctx);
      const reverbWet = this.ctx.createGain();
      reverbWet.gain.value = 0.32;
      this.reverbConvolver.connect(reverbWet);
      reverbWet.connect(this.bgmFilter);

      // Stereo Ping-Pong Tape Delay
      this.delaySend = this.ctx.createGain();
      this.delaySend.gain.value = 1.0;
      const delayL = this.ctx.createDelay(1.0);
      const delayR = this.ctx.createDelay(1.0);
      delayL.delayTime.value = 0.27;
      delayR.delayTime.value = 0.405;
      const delayTone = this.ctx.createBiquadFilter();
      delayTone.type = 'lowpass';
      delayTone.frequency.value = 2250;
      const delayFb = this.ctx.createGain();
      delayFb.gain.value = 0.29;
      const merger = this.ctx.createChannelMerger(2);
      const delayWet = this.ctx.createGain();
      delayWet.gain.value = 0.23;

      this.delaySend.connect(delayTone);
      delayTone.connect(delayL);
      delayL.connect(delayR);
      delayR.connect(delayFb);
      delayFb.connect(delayTone);
      delayL.connect(merger, 0, 0);
      delayR.connect(merger, 0, 1);
      merger.connect(delayWet);
      delayWet.connect(this.bgmFilter);

      // Reusable 0.5s white-noise buffer for percussion & SFX
      const sampleCount = Math.max(1, Math.floor(this.ctx.sampleRate * 0.5));
      this.noiseBuffer = this.ctx.createBuffer(1, sampleCount, this.ctx.sampleRate);
      const chan = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < sampleCount; i++) {
        chan[i] = Math.random() * 2 - 1;
      }

      this.syncFilterCutoff();
      this.startBgmScheduler();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  public dispose(): void {
    if (this.schedulerTimer !== null) {
      window.clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
  }

  // ==================== BGM LOOKAHEAD SEQUENCER & SYNTH INSTRUMENTS ====================

  private startBgmScheduler(): void {
    if (this.schedulerTimer !== null || !this.ctx) return;
    this.nextNoteTime = this.ctx.currentTime + 0.05;
    this.currentStep = 0;
    this.schedulerTimer = window.setInterval(() => this.advanceBgmScheduler(), 25);
  }

  private advanceBgmScheduler(): void {
    if (!this.ctx || !this.bgmFilter) return;
    if (this.ctx.state !== 'running') return;

    // Prevent burst catch-up after tab backgrounding
    const now = this.ctx.currentTime;
    if (this.nextNoteTime < now - 0.12) {
      this.nextNoteTime = now + 0.03;
    }

    const scene = this.getActiveBgmScene();
    if (this.lastScheduledScene !== scene) {
      this.lastScheduledScene = scene;
      this.syncFilterCutoff();
    }

    const bpm = BGM_SCENE_META[scene].bpm;
    const stepDur = 60 / bpm / 4; // 16th-note duration in seconds

    while (this.nextNoteTime < now + 0.11) {
      if (!this.muted && this.bgmEnabled && this.bgmVolume > 0.005) {
        this.scheduleStep(scene, this.currentStep, this.nextNoteTime, stepDur);
      }
      this.nextNoteTime += stepDur;
      this.currentStep = (this.currentStep + 1) % 128;
    }
  }

  private scheduleStep(scene: BgmScene, step: number, t0: number, stepDur: number): void {
    const bar = Math.floor(step / 16); // 0..7
    const inBar = step % 16; // 0..15
    const stageRoot = STAGE_ROOT_MIDI[this.stageId] ?? 38;

    if (scene === 'hub') {
      const root = 38; // D2 Dorian
      const chords: ReadonlyArray<ReadonlyArray<number>> = [
        [12, 15, 19, 22, 26], // Dm9
        [5, 12, 17, 21, 26], // Gadd9/B (Dorian IV)
        [8, 15, 19, 24, 26], // Bbmaj7(#11)
        [10, 17, 22, 24, 26], // Csus2/6
      ];
      const phraseIdx = Math.floor(bar / 2) % 4;
      if (step % 32 === 0) {
        const notes = chords[phraseIdx].map((n) => root + n);
        this.playPadChord(t0, notes, stepDur * 31, 1280, 0.095);
        this.playBassNote(t0, root + (phraseIdx === 1 ? 5 : phraseIdx === 2 ? 8 : phraseIdx === 3 ? 10 : 0), stepDur * 14, 260, 220, 0.14, false);
      }
      if (step % 32 === 16) {
        this.playArpPluck(t0, root + 36, stepDur * 6, 0.05, 0.2);
      }
      const arpNote = HUB_ARP_STEPS[step % HUB_ARP_STEPS.length];
      if (arpNote !== null) {
        const pan = ((step % 8) - 3.5) * 0.16;
        this.playArpPluck(t0, root + arpNote, stepDur * 3.2, 0.068, pan);
      }
      return;
    }

    if (scene === 'prep') {
      const root = stageRoot;
      const barChords: ReadonlyArray<{ bass: number; pad: ReadonlyArray<number> }> = [
        { bass: 0, pad: [12, 15, 19, 26] },
        { bass: 10, pad: [10, 15, 19, 24] },
        { bass: 8, pad: [8, 15, 19, 24] },
        { bass: 10, pad: [10, 14, 17, 24] },
        { bass: 0, pad: [12, 15, 19, 26] },
        { bass: 5, pad: [5, 12, 17, 20] },
        { bass: 8, pad: [8, 15, 20, 24] },
        { bass: 7, pad: [7, 14, 17, 23] },
      ];
      const cur = barChords[bar];
      if (inBar === 0) {
        this.playPadChord(t0, cur.pad.map((n) => root + n), stepDur * 15.5, 1380, 0.082);
      }
      const bassGate = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0];
      if (bassGate[inBar]) {
        const oct = inBar === 6 || inBar === 14 ? 12 : 0;
        const bMidi = root + (cur.bass >= 8 ? cur.bass - 12 : cur.bass) + oct;
        this.playBassNote(t0, bMidi, stepDur * 1.8, 280, 520, 0.13, false);
      }
      if (inBar === 0 || inBar === 8) {
        this.playPerc(t0, 'kick', inBar === 0 ? 0.46 : 0.34);
      }
      if (inBar % 2 === 0) {
        this.playPerc(t0, 'hat', inBar % 4 === 0 ? 0.24 : 0.14);
      }
      if (bar % 2 === 1 && inBar === 12) {
        this.playPerc(t0, 'snare', 0.22);
      }
      const arp = PREP_ARP_STEPS[step % PREP_ARP_STEPS.length];
      if (arp !== null) {
        const pan = inBar % 4 === 0 ? -0.35 : 0.35;
        this.playArpPluck(t0, root + arp, stepDur * 2.2, 0.062, pan);
      }
      return;
    }

    if (scene === 'combat' || scene === 'overdrive') {
      const high = scene === 'overdrive';
      const root = stageRoot;
      const barProg: ReadonlyArray<{ bass: number; chord: ReadonlyArray<number> }> = [
        { bass: 0, chord: [12, 15, 19, 24] }, // i
        { bass: -4, chord: [8, 15, 20, 24] }, // bVI
        { bass: -2, chord: [10, 14, 17, 22] }, // bVII
        { bass: 7, chord: [7, 14, 19, 22] }, // v
        { bass: -4, chord: [8, 15, 20, 27] }, // bVI
        { bass: -2, chord: [10, 17, 22, 26] }, // bVII
        { bass: 0, chord: [12, 15, 19, 26] }, // i9
        { bass: 7, chord: [7, 14, 17, 23] }, // V7
      ];
      const cur = barProg[bar];

      // Pad bed on bar downbeat + punchy synthwave stabs on 0, 6, 12
      if (inBar === 0) {
        this.playPadChord(t0, cur.chord.map((n) => root + n), stepDur * 15.2, 1650, 0.068);
      }
      if (inBar === 0 || inBar === 6 || inBar === 12) {
        this.playStabChord(t0, cur.chord.map((n) => root + n), stepDur * 2.1, high ? 2400 : 1950, 0.062);
      }

      // Driving 16th-note mecha bassline
      const bassStep = COMBAT_BASS_RHYTHM[inBar];
      if (bassStep !== null) {
        const bNote = root + cur.bass + (bassStep === 12 ? 12 : bassStep === 7 ? 7 : bassStep === 10 ? 10 : 0);
        this.playBassNote(t0, bNote, stepDur * 0.92, 310, high ? 1150 : 880, 0.165, false);
      }

      // Drums: punchy electronic groove + turnaround tom fills on bar 3 & bar 7
      if (inBar === 0 || inBar === 8 || (high && inBar === 14) || (inBar === 6 && bar % 2 === 1)) {
        this.playPerc(t0, 'kick', inBar === 0 ? 0.72 : 0.56);
      }
      if (inBar === 4 || inBar === 12) {
        this.playPerc(t0, 'snare', 0.56);
      }
      if ((bar === 3 || bar === 7) && (inBar === 13 || inBar === 15)) {
        this.playPerc(t0, 'tom', inBar === 15 ? 0.55 : 0.42);
      }
      if (high || bar >= 4) {
        if (inBar === 2 || inBar === 10) {
          this.playPerc(t0, 'openhat', 0.24);
        } else {
          this.playPerc(t0, 'hat', inBar % 2 === 0 ? 0.25 : 0.14);
        }
      } else if (inBar % 2 === 0 || inBar === 7 || inBar === 15) {
        this.playPerc(t0, 'hat', inBar % 4 === 0 ? 0.26 : 0.15);
      }

      // High-intensity shimmering 16th counter-arpeggio
      if (high || bar >= 4) {
        const chordTone = cur.chord[inBar % cur.chord.length];
        if (high || inBar % 2 === 0) {
          const pan = (inBar % 4 - 1.5) * 0.24;
          this.playArpPluck(t0, root + chordTone + 12, stepDur * 1.1, high ? 0.056 : 0.042, pan);
        }
      }

      // 8-Bar Heroic Mecha Lead Melody
      const leadArr = bar < 4 ? COMBAT_LEAD_SECTION_A : COMBAT_LEAD_SECTION_B;
      const leadIdx = (bar % 4) * 16 + inBar;
      const leadSemi = leadArr[leadIdx];
      if (leadSemi !== null) {
        // Look ahead to hold sustained melody notes naturally
        let holdSteps = 1;
        while (leadIdx + holdSteps < leadArr.length && leadArr[leadIdx + holdSteps] === null && holdSteps < 4) {
          holdSteps++;
        }
        this.playLeadNote(t0, root + leadSemi, stepDur * (holdSteps * 0.92), 0.088);
      }
      return;
    }

    if (scene === 'boss') {
      const root = 38; // D2 Phrygian Dominant siege
      const bossProg: ReadonlyArray<{ bass: number; chord: ReadonlyArray<number> }> = [
        { bass: 0, chord: [12, 16, 19, 22] }, // D7(b9) Phrygian Dom
        { bass: 1, chord: [13, 17, 20, 24] }, // Ebmaj7
        { bass: 0, chord: [12, 16, 19, 24] }, // D
        { bass: 5, chord: [12, 17, 20, 24] }, // Gm/D
        { bass: -4, chord: [8, 15, 20, 24] }, // Bb
        { bass: 1, chord: [13, 17, 20, 26] }, // Ebmaj7(#11)
        { bass: 0, chord: [12, 16, 18, 22] }, // D7(b5)
        { bass: -5, chord: [7, 14, 17, 20, 23] }, // A7b9
      ];
      const cur = bossProg[bar];

      if (inBar === 0 || inBar === 8) {
        this.playStabChord(t0, cur.chord.map((n) => root + n), stepDur * 3.2, 2650, 0.078);
      }
      if (inBar === 0) {
        this.playPadChord(t0, cur.chord.map((n) => root + n), stepDur * 15.0, 1900, 0.072);
      }

      // Relentless gritty Reese 16th ostinato
      const ost = BOSS_BASS_OSTINATO[inBar];
      this.playBassNote(t0, root + cur.bass + ost, stepDur * 0.9, 360, 1380, 0.185, true);

      // Industrial war drums + double-kick patterns
      if (inBar === 0 || inBar === 3 || inBar === 6 || inBar === 8 || inBar === 11 || inBar === 14) {
        this.playPerc(t0, 'kick', inBar === 0 || inBar === 8 ? 0.82 : 0.62);
      }
      if (inBar === 4 || inBar === 12) {
        this.playPerc(t0, 'snare', 0.68);
      }
      if (inBar % 2 === 1 && bar % 2 === 1 && inBar >= 11) {
        this.playPerc(t0, 'tom', 0.58);
      }
      this.playPerc(t0, inBar % 4 === 2 ? 'openhat' : 'hat', inBar % 2 === 0 ? 0.28 : 0.17);

      // Urgent alarm arpeggio + menacing Phrygian Dominant brass motif
      if (inBar % 2 === 0) {
        const cNote = cur.chord[(inBar / 2) % cur.chord.length];
        this.playArpPluck(t0, root + cNote + 12, stepDur * 0.95, 0.055, inBar % 4 === 0 ? -0.42 : 0.42);
      }
      const brassIdx = (bar % 4) * 16 + inBar;
      const brassNote = BOSS_BRASS_MOTIF[brassIdx];
      if (brassNote !== null) {
        this.playLeadNote(t0, root + brassNote + (bar >= 4 ? 12 : 0), stepDur * 1.75, 0.096);
      }
      return;
    }

    if (scene === 'victory') {
      const root = 38; // D Lydian
      const vicChords: ReadonlyArray<{ bass: number; chord: ReadonlyArray<number> }> = [
        { bass: 0, chord: [12, 16, 19, 23, 26] }, // Dmaj9
        { bass: 2, chord: [14, 20, 21, 26] }, // E/D Lydian lift
        { bass: -3, chord: [9, 16, 21, 24, 28] }, // Bm9
        { bass: -5, chord: [7, 14, 19, 21, 26] }, // Aadd9
      ];
      const idx = Math.floor(bar / 2) % 4;
      const cur = vicChords[idx];
      if (step % 32 === 0) {
        this.playPadChord(t0, cur.chord.map((n) => root + n), stepDur * 31, 2200, 0.095);
      }
      if (inBar === 0 || inBar === 8) {
        this.playBassNote(t0, root + cur.bass + (inBar === 8 ? 12 : 0), stepDur * 6.5, 340, 620, 0.135, false);
        this.playPerc(t0, 'kick', 0.48);
      }
      if (inBar === 4 || inBar === 12) {
        this.playPerc(t0, 'snare', 0.34);
      }
      if (inBar % 2 === 0) {
        const arpTone = cur.chord[(inBar / 2) % cur.chord.length];
        this.playArpPluck(t0, root + arpTone + 12, stepDur * 2.4, 0.064, ((inBar % 8) - 3.5) * 0.14);
      }
      const mel = VICTORY_MELODY[step % VICTORY_MELODY.length];
      if (mel !== null) {
        this.playLeadNote(t0, root + mel, stepDur * 3.1, 0.086);
      }
      return;
    }

    // scene === 'defeat'
    const root = 38;
    const defChords: ReadonlyArray<ReadonlyArray<number>> = [
      [12, 15, 19, 24],
      [8, 15, 20, 24],
      [5, 12, 17, 20],
      [7, 14, 17, 23],
    ];
    const dIdx = Math.floor(bar / 2) % 4;
    if (step % 32 === 0) {
      this.playPadChord(t0, defChords[dIdx].map((n) => root + n), stepDur * 30, 820, 0.09);
      this.playBassNote(t0, root - 2, stepDur * 24, 180, 120, 0.12, false);
    }
    if (inBar === 0 || inBar === 10) {
      const bell = defChords[dIdx][inBar === 0 ? 3 : 2];
      this.playArpPluck(t0, root + bell + 12, stepDur * 5.5, 0.052, inBar === 0 ? -0.25 : 0.25);
    }
  }

  private playPadChord(
    t0: number,
    midiNotes: ReadonlyArray<number>,
    dur: number,
    cutoffHz: number,
    volume: number
  ): void {
    if (!this.ctx || !this.bgmFilter) return;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 1.2;
    filter.frequency.setValueAtTime(Math.max(180, cutoffHz * 0.58), t0);
    filter.frequency.linearRampToValueAtTime(cutoffHz, t0 + dur * 0.45);
    filter.frequency.linearRampToValueAtTime(Math.max(180, cutoffHz * 0.62), t0 + dur);

    const env = this.ctx.createGain();
    const perNoteGain = volume / Math.max(2, Math.sqrt(midiNotes.length));
    const attack = Math.min(0.32, dur * 0.25);
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.linearRampToValueAtTime(perNoteGain, t0 + attack);
    env.gain.setValueAtTime(perNoteGain * 0.9, Math.max(t0 + attack, t0 + dur - 0.35));
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.18);

    filter.connect(env);
    env.connect(this.bgmFilter);
    if (this.reverbConvolver) {
      const revSend = this.ctx.createGain();
      revSend.gain.value = 0.52;
      env.connect(revSend);
      revSend.connect(this.reverbConvolver);
    }

    midiNotes.forEach((m, idx) => {
      if (!this.ctx) return;
      const hz = midiToHz(m);
      for (const det of [-6.5, 6.5]) {
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(hz, t0);
        osc.detune.setValueAtTime(det, t0);
        osc.connect(filter);
        osc.start(t0);
        osc.stop(t0 + dur + 0.22);
      }
      if (idx === 0) {
        const sub = this.ctx.createOscillator();
        sub.type = 'triangle';
        sub.frequency.setValueAtTime(hz * 0.5, t0);
        sub.connect(filter);
        sub.start(t0);
        sub.stop(t0 + dur + 0.22);
      }
    });
  }

  private playStabChord(
    t0: number,
    midiNotes: ReadonlyArray<number>,
    dur: number,
    cutoffHz: number,
    volume: number
  ): void {
    if (!this.ctx || !this.bgmFilter) return;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 1.8;
    filter.frequency.setValueAtTime(cutoffHz * 1.6, t0);
    filter.frequency.exponentialRampToValueAtTime(Math.max(240, cutoffHz * 0.45), t0 + dur);

    const env = this.ctx.createGain();
    const g = volume / Math.max(2, Math.sqrt(midiNotes.length));
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.linearRampToValueAtTime(g, t0 + 0.014);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.04);

    filter.connect(env);
    env.connect(this.bgmFilter);
    if (this.delaySend) {
      const dSend = this.ctx.createGain();
      dSend.gain.value = 0.24;
      env.connect(dSend);
      dSend.connect(this.delaySend);
    }

    for (const m of midiNotes) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(midiToHz(m), t0);
      osc.detune.setValueAtTime((m % 2 === 0 ? 1 : -1) * 4.5, t0);
      osc.connect(filter);
      osc.start(t0);
      osc.stop(t0 + dur + 0.06);
    }
  }

  private playArpPluck(
    t0: number,
    midi: number,
    dur: number,
    volume: number,
    pan = 0
  ): void {
    if (!this.ctx || !this.bgmFilter) return;
    const hz = midiToHz(midi);

    const carrier = this.ctx.createOscillator();
    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(hz, t0);

    const body = this.ctx.createOscillator();
    body.type = 'triangle';
    body.frequency.setValueAtTime(hz, t0);

    // 2-op FM bell modulator
    const mod = this.ctx.createOscillator();
    mod.type = 'sine';
    mod.frequency.setValueAtTime(hz * 2.0, t0);
    const modGain = this.ctx.createGain();
    modGain.gain.setValueAtTime(hz * 1.35, t0);
    modGain.gain.exponentialRampToValueAtTime(0.5, t0 + Math.min(0.09, dur * 0.6));
    mod.connect(modGain);
    modGain.connect(carrier.frequency);

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.linearRampToValueAtTime(volume, t0 + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    carrier.connect(env);
    const bodyGain = this.ctx.createGain();
    bodyGain.gain.value = 0.35;
    body.connect(bodyGain);
    bodyGain.connect(env);

    let outNode: AudioNode = env;
    if (typeof this.ctx.createStereoPanner === 'function') {
      const panner = this.ctx.createStereoPanner();
      panner.pan.setValueAtTime(Math.max(-0.85, Math.min(0.85, pan)), t0);
      env.connect(panner);
      outNode = panner;
    }

    outNode.connect(this.bgmFilter);
    if (this.delaySend) {
      const ds = this.ctx.createGain();
      ds.gain.value = 0.42;
      outNode.connect(ds);
      ds.connect(this.delaySend);
    }
    if (this.reverbConvolver) {
      const rs = this.ctx.createGain();
      rs.gain.value = 0.36;
      outNode.connect(rs);
      rs.connect(this.reverbConvolver);
    }

    carrier.start(t0);
    body.start(t0);
    mod.start(t0);
    const stopAt = t0 + dur + 0.03;
    carrier.stop(stopAt);
    body.stop(stopAt);
    mod.stop(stopAt);
  }

  private playBassNote(
    t0: number,
    midi: number,
    dur: number,
    baseCutoff: number,
    envDepth: number,
    volume: number,
    reese: boolean
  ): void {
    if (!this.ctx || !this.bgmFilter) return;
    const hz = midiToHz(midi);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = reese ? 3.2 : 2.4;
    filter.frequency.setValueAtTime(baseCutoff + envDepth, t0);
    filter.frequency.exponentialRampToValueAtTime(Math.max(75, baseCutoff), t0 + Math.min(0.11, dur * 0.75));

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.linearRampToValueAtTime(volume, t0 + 0.009);
    env.gain.setValueAtTime(volume * 0.78, Math.max(t0 + 0.01, t0 + dur * 0.55));
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.025);

    const saw = this.ctx.createOscillator();
    saw.type = 'sawtooth';
    saw.frequency.setValueAtTime(hz, t0);
    saw.connect(filter);

    const sub = this.ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(hz * 0.5, t0);
    const subGain = this.ctx.createGain();
    subGain.gain.value = 0.68;
    sub.connect(subGain);
    subGain.connect(env);

    filter.connect(env);
    env.connect(this.bgmFilter);

    const stopAt = t0 + dur + 0.04;
    saw.start(t0);
    sub.start(t0);
    saw.stop(stopAt);
    sub.stop(stopAt);

    if (reese) {
      const saw2 = this.ctx.createOscillator();
      saw2.type = 'sawtooth';
      saw2.frequency.setValueAtTime(hz, t0);
      saw2.detune.setValueAtTime(11, t0);
      saw2.connect(filter);
      saw2.start(t0);
      saw2.stop(stopAt);
    }
  }

  private playLeadNote(t0: number, midi: number, dur: number, volume: number): void {
    if (!this.ctx || !this.bgmFilter) return;
    const hz = midiToHz(midi);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 1.6;
    filter.frequency.setValueAtTime(2900, t0);
    filter.frequency.exponentialRampToValueAtTime(1550, t0 + dur);

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.linearRampToValueAtTime(volume, t0 + 0.016);
    env.gain.setValueAtTime(volume * 0.82, Math.max(t0 + 0.02, t0 + dur * 0.72));
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.05);

    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(hz, t0);
    osc1.detune.setValueAtTime(-4, t0);

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(hz, t0);
    osc2.detune.setValueAtTime(4, t0);

    // Subtle expressive vibrato on sustained notes
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(5.6, t0);
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(0, t0);
    lfoGain.gain.linearRampToValueAtTime(hz * 0.007, t0 + Math.min(0.14, dur * 0.5));
    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);
    lfoGain.connect(osc2.frequency);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(env);
    env.connect(this.bgmFilter);

    if (this.delaySend) {
      const ds = this.ctx.createGain();
      ds.gain.value = 0.34;
      env.connect(ds);
      ds.connect(this.delaySend);
    }
    if (this.reverbConvolver) {
      const rs = this.ctx.createGain();
      rs.gain.value = 0.32;
      env.connect(rs);
      rs.connect(this.reverbConvolver);
    }

    const stopAt = t0 + dur + 0.07;
    osc1.start(t0);
    osc2.start(t0);
    lfo.start(t0);
    osc1.stop(stopAt);
    osc2.stop(stopAt);
    lfo.stop(stopAt);
  }

  private playPerc(
    t0: number,
    kind: 'kick' | 'snare' | 'hat' | 'openhat' | 'tom',
    vel: number
  ): void {
    if (!this.ctx || !this.bgmFilter || !this.noiseBuffer) return;

    if (kind === 'kick') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(148, t0);
      osc.frequency.exponentialRampToValueAtTime(38, t0 + 0.14);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(vel * 0.34, t0 + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.21);
      osc.connect(gain);
      gain.connect(this.bgmFilter);
      osc.start(t0);
      osc.stop(t0 + 0.23);

      // Subtle punch click
      const click = this.ctx.createOscillator();
      const cGain = this.ctx.createGain();
      click.type = 'triangle';
      click.frequency.setValueAtTime(760, t0);
      click.frequency.exponentialRampToValueAtTime(110, t0 + 0.018);
      cGain.gain.setValueAtTime(vel * 0.11, t0);
      cGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.02);
      click.connect(cGain);
      cGain.connect(this.bgmFilter);
      click.start(t0);
      click.stop(t0 + 0.025);
      return;
    }

    if (kind === 'tom') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(132, t0);
      osc.frequency.exponentialRampToValueAtTime(52, t0 + 0.2);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(vel * 0.26, t0 + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
      osc.connect(gain);
      gain.connect(this.bgmFilter);
      osc.start(t0);
      osc.stop(t0 + 0.24);
      return;
    }

    if (kind === 'snare') {
      const body = this.ctx.createOscillator();
      const bGain = this.ctx.createGain();
      body.type = 'triangle';
      body.frequency.setValueAtTime(195, t0);
      body.frequency.exponentialRampToValueAtTime(108, t0 + 0.09);
      bGain.gain.setValueAtTime(vel * 0.16, t0);
      bGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.1);
      body.connect(bGain);
      bGain.connect(this.bgmFilter);
      body.start(t0);
      body.stop(t0 + 0.12);

      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(1650, t0);
      bp.Q.value = 0.9;
      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0.0001, t0);
      nGain.gain.linearRampToValueAtTime(vel * 0.17, t0 + 0.004);
      nGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.15);
      src.connect(bp);
      bp.connect(nGain);
      nGain.connect(this.bgmFilter);
      if (this.reverbConvolver) {
        const rs = this.ctx.createGain();
        rs.gain.value = 0.24;
        nGain.connect(rs);
        rs.connect(this.reverbConvolver);
      }
      src.start(t0);
      src.stop(t0 + 0.17);
      return;
    }

    // hat / openhat
    const dur = kind === 'openhat' ? 0.16 : 0.042;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(kind === 'openhat' ? 6200 : 7500, t0);
    const hGain = this.ctx.createGain();
    hGain.gain.setValueAtTime(0.0001, t0);
    hGain.gain.linearRampToValueAtTime(vel * 0.13, t0 + 0.003);
    hGain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(hp);
    hp.connect(hGain);
    hGain.connect(this.bgmFilter);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  // ==================== TACTICAL & COMBAT SFX ====================

  private canPlayRateLimited(key: string, minIntervalMs: number): boolean {
    if (this.muted || this.sfxVolume <= 0.005 || !this.ctx || !this.sfxBus) return false;
    const now = performance.now();
    if (now - (this.lastShotTime[key] ?? 0) < minIntervalMs) return false;
    this.lastShotTime[key] = now;
    return true;
  }

  private tone(
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    delay = 0
  ): void {
    if (this.muted || this.sfxVolume <= 0.005 || !this.ctx || !this.sfxBus) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(24, freqStart), t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(24, freqEnd), t0 + duration);

    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(volume, t0 + Math.min(0.014, duration * 0.25));
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

    osc.connect(gain);
    gain.connect(this.sfxBus);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  private noiseBurst(
    duration: number,
    filterType: BiquadFilterType,
    filterFreq: number,
    volume: number,
    delay = 0
  ): void {
    if (this.muted || this.sfxVolume <= 0.005 || !this.ctx || !this.sfxBus || !this.noiseBuffer) return;
    const t0 = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(Math.max(40, filterFreq), t0);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(volume, t0 + Math.min(0.012, duration * 0.2));
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxBus);
    src.start(t0);
    src.stop(t0 + duration + 0.02);
  }

  public playUiClick(): void {
    this.unlock();
    this.tone(680, 920, 0.055, 'triangle', 0.16);
  }

  public playInsufficientGold(): void {
    this.unlock();
    this.tone(210, 145, 0.11, 'sawtooth', 0.2);
    this.tone(165, 118, 0.13, 'square', 0.16, 0.08);
  }

  public playBeaconLampBoot(stepIndex: number): void {
    if (this.muted || !this.ctx) return;
    const pitches = [330, 415, 494, 659];
    const f = pitches[stepIndex % pitches.length];
    this.tone(180, 120, 0.05, 'square', 0.12);
    this.tone(f, f * 1.02, 0.22, 'sine', 0.18, 0.02);
  }

  public playTowerBuildLand(): void {
    this.unlock();
    this.tone(145, 44, 0.19, 'triangle', 0.36);
    this.tone(420, 260, 0.09, 'square', 0.14, 0.06);
    this.tone(620, 880, 0.11, 'triangle', 0.16, 0.15);
  }

  public playPartSnapLock(stepIndex: number, tier: TowerTier): void {
    if (this.muted || !this.ctx) return;
    const base = 360 + tier * 70 + stepIndex * 85;
    this.tone(base * 0.7, base, 0.075, 'triangle', 0.2);
  }

  public playTierIgnite(tier: TowerTier): void {
    this.unlock();
    if (tier === 4) {
      this.duckBgm(0.35, 0.32, 0.35);
      const notes = [392, 493.88, 587.33, 783.99, 987.77];
      notes.forEach((n, idx) => {
        this.tone(n, n * 1.01, 0.55, 'triangle', 0.22, idx * 0.06);
      });
    } else {
      const root = tier === 2 ? 440 : 523.25;
      this.tone(root, root * 1.25, 0.22, 'triangle', 0.22);
      this.tone(root * 1.5, root * 1.5, 0.26, 'sine', 0.18, 0.06);
    }
  }

  public playAutocannonShot(): void {
    if (!this.canPlayRateLimited('ac', 55)) return;
    this.tone(310, 95, 0.065, 'sawtooth', 0.15);
  }

  public playMortarLaunch(): void {
    if (!this.canPlayRateLimited('ml', 110)) return;
    this.tone(165, 62, 0.16, 'triangle', 0.26);
    this.tone(520, 280, 0.12, 'sine', 0.14, 0.02);
  }

  public playMortarImpact(): void {
    if (!this.canPlayRateLimited('mi', 95)) return;
    this.tone(128, 36, 0.28, 'sawtooth', 0.3);
    this.tone(380, 140, 0.18, 'sine', 0.16);
  }

  public playMagneticPulse(): void {
    if (!this.canPlayRateLimited('mg', 120)) return;
    this.tone(260, 520, 0.22, 'sine', 0.18);
    this.tone(520, 220, 0.24, 'triangle', 0.12, 0.05);
  }

  public playMetallicArmorHit(): void {
    if (!this.canPlayRateLimited('clank', 85)) return;
    this.tone(1180, 720, 0.055, 'triangle', 0.11);
  }

  public playBossChargeAndSlam(): void {
    this.unlock();
    // Sidechain duck BGM through the 0.93s charge + vacuum silence, slamming back at 1.16s!
    this.duckBgm(0.06, 1.15, 0.18);
    this.tone(85, 640, 0.93, 'sawtooth', 0.24, 0);
    this.tone(130, 880, 0.93, 'sine', 0.18, 0);
    this.tone(720, 90, 0.09, 'triangle', 0.26, 0.94);
    this.tone(110, 28, 0.58, 'sawtooth', 0.42, 1.14);
    this.tone(72, 26, 0.65, 'triangle', 0.42, 1.14);
  }

  public playBossSkillWarning(): void {
    if (!this.canPlayRateLimited('warn', 400)) return;
    this.tone(480, 620, 0.16, 'square', 0.18, 0);
    this.tone(480, 620, 0.16, 'square', 0.18, 0.24);
  }

  public playBossSkillSlam(): void {
    this.duckBgm(0.32, 0.18, 0.24);
    this.tone(135, 34, 0.42, 'sawtooth', 0.36);
  }

  public playBossSubExplosion(stepIndex: number): void {
    this.unlock();
    const base = 195 + stepIndex * 35;
    this.tone(base, 40, 0.24, 'sawtooth', 0.32);
    this.tone(420 + stepIndex * 40, 125, 0.11, 'square', 0.18);
  }

  public playClimaxKillBurst(isBoss: boolean): void {
    this.unlock();
    if (isBoss) this.duckBgm(0.22, 0.45, 0.35);
    const dur = isBoss ? 0.72 : 0.38;
    this.tone(150, 32, dur, 'sawtooth', 0.38);
    if (isBoss) {
      this.tone(120, 30, 0.65, 'triangle', 0.38, 0.22);
      this.tone(523.25, 783.99, 0.5, 'triangle', 0.24, 0.45);
    }
  }

  public playBeaconDamageAlarm(): void {
    this.unlock();
    if (!this.canPlayRateLimited('bcn_hit', 180)) return;
    this.tone(620, 340, 0.18, 'square', 0.24, 0);
    this.tone(140, 45, 0.26, 'sawtooth', 0.28, 0.02);
  }

  public playDefeatShutdown(): void {
    this.unlock();
    this.duckBgm(0.18, 0.6, 0.5);
    this.tone(440, 52, 0.75, 'sawtooth', 0.34, 0);
    this.tone(261.6, 82, 0.85, 'triangle', 0.28, 0.06);
  }

  public playBeaconBeamIgnite(): void {
    this.unlock();
    this.tone(220, 880, 0.55, 'sine', 0.24, 0);
    const chord = [440, 659.25, 880, 1318.5];
    chord.forEach((f, idx) => {
      this.tone(f, f * 1.015, 0.42, 'triangle', 0.16, 0.08 + idx * 0.06);
    });
  }

  public playMechanismActivate(kind: 'crystal_vein' | 'capacitor_pylon' | 'laser_gate'): void {
    this.unlock();
    if (kind === 'crystal_vein') {
      this.tone(784, 1174.66, 0.14, 'sine', 0.2, 0);
      this.tone(1046.5, 1567.98, 0.18, 'triangle', 0.18, 0.07);
    } else if (kind === 'capacitor_pylon') {
      this.tone(920, 180, 0.22, 'sawtooth', 0.28, 0);
      this.tone(1480, 420, 0.16, 'square', 0.2, 0.03);
    } else {
      this.tone(220, 660, 0.18, 'sawtooth', 0.24, 0);
      this.tone(540, 520, 0.32, 'triangle', 0.18, 0.06);
    }
  }

  public playTechUpgrade(level: number): void {
    this.unlock();
    const base = 440 + level * 80;
    this.tone(base, base * 1.25, 0.14, 'triangle', 0.2, 0);
    this.tone(base * 1.5, base * 1.52, 0.2, 'sine', 0.18, 0.07);
  }

  public playTechRespec(): void {
    this.unlock();
    this.tone(784, 392, 0.22, 'triangle', 0.2, 0);
    this.tone(587.33, 880, 0.18, 'sine', 0.16, 0.1);
  }

  public playAchievementClaim(): void {
    this.unlock();
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.tone(n, n * 1.01, 0.28, 'triangle', 0.2, idx * 0.06);
    });
  }

  public playLootChime(isCrystal: boolean): void {
    if (!this.canPlayRateLimited(isCrystal ? 'crys' : 'coin', 45)) return;
    if (isCrystal) {
      this.tone(880, 1318.5, 0.16, 'sine', 0.17);
    } else {
      this.tone(740, 987.7, 0.1, 'triangle', 0.14);
    }
  }

  public playChestOpenFanfare(): void {
    this.unlock();
    this.duckBgm(0.3, 0.45, 0.35);
    this.tone(240, 480, 0.12, 'square', 0.2);
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, i) => {
      this.tone(n, n * 1.01, 0.48, 'triangle', 0.24, 0.12 + i * 0.09);
    });
  }

  public playTacticalArm(): void {
    this.unlock();
    this.tone(520, 1040, 0.075, 'triangle', 0.18, 0);
    this.tone(1040, 1560, 0.09, 'sine', 0.16, 0.06);
  }

  public playOrbitalLockOn(): void {
    this.unlock();
    this.tone(320, 1280, 0.48, 'sine', 0.2, 0);
    this.tone(880, 1320, 0.06, 'square', 0.14, 0.12);
    this.tone(1174.66, 1760, 0.06, 'square', 0.16, 0.32);
  }

  public playOrbitalStrike(): void {
    this.unlock();
    this.duckBgm(0.28, 0.22, 0.28);
    this.tone(165, 28, 0.56, 'sawtooth', 0.38, 0);
    this.tone(92, 24, 0.62, 'triangle', 0.36, 0.02);
    this.tone(1480, 380, 0.24, 'sine', 0.22, 0);
    this.noiseBurst(0.36, 'bandpass', 620, 0.28, 0.01);
  }

  public playOrbitalStrikeImpact(): void {
    this.playOrbitalStrike();
  }

  public playEmpOverdrive(): void {
    this.unlock();
    this.tone(960, 95, 0.34, 'sawtooth', 0.3, 0);
    this.tone(240, 880, 0.38, 'triangle', 0.22, 0.05);
    const chord = [440, 659.25, 880];
    chord.forEach((f, idx) => {
      this.tone(f, f * 1.04, 0.34, 'sine', 0.16, 0.1 + idx * 0.05);
    });
    this.noiseBurst(0.22, 'highpass', 1800, 0.18, 0);
  }

  public playNanoRepair(): void {
    this.unlock();
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((n, idx) => {
      this.tone(n, n * 1.015, 0.34, idx % 2 === 0 ? 'sine' : 'triangle', 0.19, idx * 0.065);
    });
  }

  public playNanoBeaconRepair(): void {
    this.playNanoRepair();
  }

  public playFluxCombo(): void {
    if (!this.canPlayRateLimited('flux_combo', 110)) return;
    this.tone(1380, 310, 0.17, 'sawtooth', 0.24, 0);
    this.tone(145, 42, 0.22, 'triangle', 0.24, 0.01);
    this.noiseBurst(0.14, 'highpass', 2100, 0.16, 0);
  }

  public playFluxDetonation(): void {
    this.playFluxCombo();
  }

  public playArmorShred(isCrit = false): void {
    if (!this.canPlayRateLimited(isCrit ? 'shred_crit' : 'shred', 95)) return;
    this.tone(1320, 460, 0.08, 'square', 0.15, 0);
    if (isCrit) {
      this.tone(1174.66, 1760, 0.14, 'triangle', 0.2, 0.02);
    }
  }

  public playWeakPointCrit(): void {
    this.playArmorShred(true);
  }

  public playSingularityPull(): void {
    if (!this.canPlayRateLimited('sing_pull', 180)) return;
    this.tone(86, 340, 0.2, 'sine', 0.24, 0);
    this.tone(340, 56, 0.2, 'triangle', 0.26, 0.18);
    this.noiseBurst(0.28, 'lowpass', 380, 0.18, 0.04);
  }

  public playClusterSalvo(): void {
    if (!this.canPlayRateLimited('cluster_salvo', 120)) return;
    [0, 0.065, 0.13].forEach((delay, idx) => {
      const pitch = 340 + idx * 45;
      this.tone(pitch, 130, 0.12, 'sawtooth', 0.18, delay);
      this.noiseBurst(0.11, 'bandpass', 1200 + idx * 200, 0.14, delay);
    });
  }

  public playClusterRocketLaunch(): void {
    this.playClusterSalvo();
  }

  public playRailgunShot(): void {
    if (!this.canPlayRateLimited('railgun', 110)) return;
    this.tone(1860, 210, 0.13, 'sawtooth', 0.24, 0);
    this.tone(142, 38, 0.18, 'triangle', 0.26, 0);
    this.noiseBurst(0.09, 'highpass', 2400, 0.18, 0);
  }

  public playArcMatrix(): void {
    if (!this.canPlayRateLimited('arc_matrix', 110)) return;
    this.tone(1520, 380, 0.14, 'square', 0.18, 0);
    this.tone(880, 1640, 0.11, 'sawtooth', 0.15, 0.03);
    this.noiseBurst(0.1, 'highpass', 2600, 0.14, 0);
  }

  public playTeslaArc(): void {
    this.playArcMatrix();
  }

  public playShieldBreak(): void {
    if (!this.canPlayRateLimited('shld_brk', 95)) return;
    this.tone(1680, 420, 0.14, 'triangle', 0.2, 0);
    [1318.5, 987.77, 659.25].forEach((f, i) => {
      this.tone(f, f * 0.85, 0.1, 'sine', 0.14, 0.02 + i * 0.035);
    });
  }
}
`;
fs.writeFileSync(audioManagerPath, newAudioManagerCode, 'utf8');

// ============================================================================
// 2. Patch src/types.ts to expose BGM state in UISnapshot
// ============================================================================
const typesPath = path.join(root, 'src/types.ts');
let typesSrc = fs.readFileSync(typesPath, 'utf8');
const bgmSnapshotFields = `  bgmEnabled?: boolean;
  bgmVolume?: number;
  sfxVolume?: number;
  bgmOverrideMode?: string;
  bgmTrackLabel?: string;
  bgmModeTag?: string;`;
const snapshotStart = typesSrc.indexOf('export interface UISnapshot {');
if (snapshotStart < 0) {
  throw new Error('[upgrade_v4_bgm] UISnapshot interface not found');
}
// Repair earlier V4 archives that inserted these UI fields into save data.
const beforeSnapshot = typesSrc.slice(0, snapshotStart).replace('\n' + bgmSnapshotFields, '');
let snapshotSrc = typesSrc.slice(snapshotStart);
if (!snapshotSrc.includes('bgmEnabled?: boolean')) {
  snapshotSrc = replaceExact(
    snapshotSrc,
    '  muted: boolean;',
    '  muted: boolean;\n' + bgmSnapshotFields,
    'UISnapshot BGM fields'
  );
}
typesSrc = beforeSnapshot + snapshotSrc;
fs.writeFileSync(typesPath, typesSrc, 'utf8');

// ============================================================================
// 3. Patch src/game/GameEngine.ts to drive adaptive BGM transitions & dispose
// ============================================================================
const enginePath = path.join(root, 'src/game/GameEngine.ts');
let engineSrc = fs.readFileSync(enginePath, 'utf8');
if (!engineSrc.includes('syncAdaptiveBgm')) {
  engineSrc = replaceExact(
    engineSrc,
    "import { AudioManager } from '../audio/AudioManager';",
    "import { AudioManager, type BgmOverrideMode, type BgmScene } from '../audio/AudioManager';",
    'GameEngine AudioManager imports'
  );

  engineSrc = replaceExact(
    engineSrc,
    '    this.composer.dispose();\n  }',
    '    this.audio.dispose();\n    this.composer.dispose();\n  }',
    'GameEngine audio dispose'
  );

  engineSrc = replaceExact(
    engineSrc,
    `  public toggleMute(): boolean {
    const muted = this.audio.toggleMute();
    this.progression.setMuted(muted);
    this.emitSnapshot();
    return muted;
  }`,
    `  public toggleMute(): boolean {
    const muted = this.audio.toggleMute();
    this.progression.setMuted(muted);
    this.emitSnapshot();
    return muted;
  }

  public toggleBgm(): boolean {
    const enabled = this.audio.toggleBgm();
    this.emitSnapshot();
    return enabled;
  }

  public setBgmVolume(vol: number): void {
    this.audio.setBgmVolume(vol);
    this.emitSnapshot();
  }

  public setSfxVolume(vol: number): void {
    this.audio.setSfxVolume(vol);
    this.emitSnapshot();
  }

  public setBgmOverrideMode(mode: BgmOverrideMode): void {
    this.audio.setBgmOverrideMode(mode);
    this.emitSnapshot();
  }

  private syncAdaptiveBgm(hasActiveBoss: boolean): void {
    let scene: BgmScene = 'prep';
    if (this.overlayPaused) {
      scene = 'hub';
    } else if (this.mode === 'defeat') {
      scene = 'defeat';
    } else if (
      this.mode === 'victory_cinematic' ||
      this.mode === 'victory_panel' ||
      this.mode === 'reward_claiming' ||
      this.mode === 'reward_claimed'
    ) {
      scene = 'victory';
    } else if (this.mode === 'boss_intro' || hasActiveBoss) {
      scene = 'boss';
    } else if (this.waveInProgress) {
      const lowBeacon = this.beaconHp / Math.max(1, this.maxBeaconHp) <= 0.45;
      const lateWave = this.isEndlessMode() || this.waveIndex >= 3;
      scene = lowBeacon || lateWave ? 'overdrive' : 'combat';
    } else {
      scene = 'prep';
    }
    this.audio.updateAdaptiveBgm({
      scene,
      stageId: this.currentStageId,
      paused: this.mode === 'paused',
    });
  }`,
    'GameEngine BGM control methods'
  );

  engineSrc = replaceExact(
    engineSrc,
    '      muted: this.audio.isMuted(),',
    `      muted: this.audio.isMuted(),
      bgmEnabled: this.audio.isBgmEnabled(),
      bgmVolume: this.audio.getBgmVolume(),
      sfxVolume: this.audio.getSfxVolume(),
      bgmOverrideMode: this.audio.getBgmOverrideMode(),
      bgmTrackLabel: this.audio.getActiveBgmLabel(),
      bgmModeTag: this.audio.getActiveBgmMeta().modeTag,`,
    'GameEngine getSnapshot BGM fields'
  );

  engineSrc = replaceExact(
    engineSrc,
    '    const activeBoss = this.enemies.find((e) => e.isBoss && !e.dead && e.hp > 0) ?? null;',
    `    const activeBoss = this.enemies.find((e) => e.isBoss && !e.dead && e.hp > 0) ?? null;
    this.syncAdaptiveBgm(activeBoss !== null);`,
    'GameEngine syncAdaptiveBgm in getSnapshot'
  );

  fs.writeFileSync(enginePath, engineSrc, 'utf8');
}

// ============================================================================
// 4. Patch src/ui/UIManager.ts for HUD Soundtrack Button & Jukebox Popover
// ============================================================================
const uiPath = path.join(root, 'src/ui/UIManager.ts');
let uiSrc = fs.readFileSync(uiPath, 'utf8');
if (!uiSrc.includes('btn-bgm')) {
  uiSrc = replaceExact(
    uiSrc,
    'const VOLUME_ON_SVG =',
    `const MUSIC_ON_SVG = \`<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>\`;
const MUSIC_OFF_SVG = \`<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/><line x1="3" y1="3" x2="21" y2="21"/></svg>\`;

const BGM_MODE_OPTIONS: ReadonlyArray<{ id: string; shortLabel: string }> = [
  { id: 'auto', shortLabel: '🤖 战况自适应' },
  { id: 'hub', shortLabel: '🛰 I. 轨道静默' },
  { id: 'prep', shortLabel: '📡 II. 信标校准' },
  { id: 'combat', shortLabel: '⚔ III. 钢铁防线' },
  { id: 'overdrive', shortLabel: '🔥 IV. 超载狂潮' },
  { id: 'boss', shortLabel: '☠ V. 主宰降临' },
  { id: 'victory', shortLabel: '🌟 VI. 返航星光' },
];

const VOLUME_ON_SVG =`,
    'UIManager music SVG constants'
  );

  uiSrc = replaceExact(
    uiSrc,
    '  private btnSpeed!: HTMLButtonElement;\n  private btnMute!: HTMLButtonElement;',
    `  private btnSpeed!: HTMLButtonElement;
  private btnBgm!: HTMLButtonElement;
  private btnMute!: HTMLButtonElement;
  private bgmPopoverHost!: HTMLElement;
  private bgmPopoverOpen = false;
  private lastBgmPopSig = '';`,
    'UIManager btnBgm fields'
  );

  uiSrc = replaceExact(
    uiSrc,
    `    this.btnSpeed.addEventListener('click', () => this.engine.toggleSpeed());
    this.btnMute.addEventListener('click', () => this.engine.toggleMute());`,
    `    this.btnSpeed.addEventListener('click', () => this.engine.toggleSpeed());
    this.btnBgm.addEventListener('click', (ev) => {
      ev.stopPropagation();
      this.engine.getAudio().playUiClick();
      this.bgmPopoverOpen = !this.bgmPopoverOpen;
      this.lastBgmPopSig = '';
      this.renderBgmPopover(this.engine.getSnapshot());
    });
    this.btnMute.addEventListener('click', () => this.engine.toggleMute());

    const unlockOnce = () => {
      this.engine.getAudio().unlock();
    };
    window.addEventListener('pointerdown', unlockOnce, { passive: true });
    window.addEventListener('keydown', unlockOnce, { passive: true });
    window.addEventListener('pointerdown', (ev) => {
      if (!this.bgmPopoverOpen) return;
      const target = ev.target as Node | null;
      if (target && (this.bgmPopoverHost.contains(target) || this.btnBgm.contains(target))) return;
      this.bgmPopoverOpen = false;
      this.lastBgmPopSig = '';
      this.bgmPopoverHost.innerHTML = '';
    });`,
    'UIManager bindEngine BGM events'
  );

  uiSrc = replaceExact(
    uiSrc,
    `    if (ev.key === 'Escape') {`,
    `    if (ev.key === 'Escape') {
      if (this.bgmPopoverOpen) {
        this.bgmPopoverOpen = false;
        this.lastBgmPopSig = '';
        this.bgmPopoverHost.innerHTML = '';
        return;
      }`,
    'UIManager Escape closes BGM popover'
  );

  uiSrc = replaceExact(
    uiSrc,
    `    } else if (k === 'h') {
      if (this.hubOpen) this.closeHub();
      else this.openHub('campaign');
    }`,
    `    } else if (k === 'm') {
      this.engine.toggleBgm();
    } else if (k === 'h') {
      if (this.hubOpen) this.closeHub();
      else this.openHub('campaign');
    }`,
    'UIManager M hotkey toggles BGM'
  );

  uiSrc = replaceExact(
    uiSrc,
    `          <button class="enamel-icon-btn" id="btn-speed" type="button" aria-label="切换战斗倍速">1x</button>
          <button class="enamel-icon-btn" id="btn-mute" type="button" aria-label="静音开关">\${VOLUME_ON_SVG}</button>`,
    `          <button class="enamel-icon-btn" id="btn-speed" type="button" aria-label="切换战斗倍速">1x</button>
          <button class="enamel-icon-btn bgm-active" id="btn-bgm" type="button" title="原声配乐混音台 [快捷键 M]" aria-label="原声配乐控制台">\${MUSIC_ON_SVG}</button>
          <button class="enamel-icon-btn" id="btn-mute" type="button" aria-label="静音开关">\${VOLUME_ON_SVG}</button>`,
    'UIManager HUD btn-bgm markup'
  );

  uiSrc = replaceExact(
    uiSrc,
    '      <div id="combo-float-layer" class="combo-float-layer" aria-hidden="true"></div>',
    `      <div id="bgm-popover-slot" class="bgm-popover-slot"></div>
      <div id="combo-float-layer" class="combo-float-layer" aria-hidden="true"></div>`,
    'UIManager bgm-popover-slot markup'
  );

  uiSrc = replaceExact(
    uiSrc,
    `    this.btnSpeed = this.host.querySelector('#btn-speed')!;
    this.btnMute = this.host.querySelector('#btn-mute')!;`,
    `    this.btnSpeed = this.host.querySelector('#btn-speed')!;
    this.btnBgm = this.host.querySelector('#btn-bgm')!;
    this.btnMute = this.host.querySelector('#btn-mute')!;
    this.bgmPopoverHost = this.host.querySelector('#bgm-popover-slot')!;`,
    'UIManager querySelector btn-bgm'
  );

  uiSrc = replaceExact(
    uiSrc,
    `    this.btnMute.innerHTML = snap.muted ? VOLUME_OFF_SVG : VOLUME_ON_SVG;
    this.btnMute.classList.toggle('muted-toggle', snap.muted);`,
    `    const bgmOn = (snap.bgmEnabled ?? true) && !snap.muted;
    this.btnBgm.innerHTML = bgmOn ? MUSIC_ON_SVG : MUSIC_OFF_SVG;
    this.btnBgm.classList.toggle('bgm-active', bgmOn);
    this.btnBgm.classList.toggle('muted-toggle', !bgmOn);
    this.btnBgm.title = \`星区配乐台：\${snap.bgmTrackLabel ?? '自适应配乐'} [点击展开混音台 / M键开关]\`;
    this.btnMute.innerHTML = snap.muted ? VOLUME_OFF_SVG : VOLUME_ON_SVG;
    this.btnMute.classList.toggle('muted-toggle', snap.muted);
    this.renderBgmPopover(snap);`,
    'UIManager updateSnapshot btn-bgm state'
  );

  uiSrc = replaceExact(
    uiSrc,
    '  private renderBottomTray(snap: UISnapshot): void {',
    `  private renderBgmPopover(snap: UISnapshot): void {
    if (!this.bgmPopoverOpen) {
      if (this.lastBgmPopSig !== '') {
        this.lastBgmPopSig = '';
        this.bgmPopoverHost.innerHTML = '';
      }
      return;
    }

    const bgmOn = snap.bgmEnabled ?? true;
    const bgmVolPct = Math.round((snap.bgmVolume ?? 0.72) * 100);
    const sfxVolPct = Math.round((snap.sfxVolume ?? 0.92) * 100);
    const curMode = snap.bgmOverrideMode ?? 'auto';
    const trackLabel = snap.bgmTrackLabel ?? 'II. 信标校准 · Cradle Calibration';
    const modeTag = snap.bgmModeTag ?? '104 BPM';
    const sig = \`\${bgmOn ? 1 : 0}:\${snap.muted ? 1 : 0}:\${curMode}:\${trackLabel}:\${bgmVolPct}:\${sfxVolPct}\`;
    if (this.lastBgmPopSig === sig) return;
    this.lastBgmPopSig = sig;

    const pillsHtml = BGM_MODE_OPTIONS.map((opt) => {
      const active = curMode === opt.id;
      return \`<button class="bgm-mode-pill \${active ? 'active' : ''}" data-bgm-mode="\${opt.id}" type="button">\${opt.shortLabel}</button>\`;
    }).join('');

    this.bgmPopoverHost.innerHTML = \`
      <aside class="bgm-console-card" id="bgm-console-popover" role="dialog" aria-label="星区原声配乐混音台">
        <div class="bgm-console-head">
          <div class="bgm-title-wrap">
            <span class="bgm-live-dot \${bgmOn && !snap.muted ? 'playing' : ''}"></span>
            <strong>星区原声配乐台</strong>
          </div>
          <div class="bgm-head-actions">
            <button class="bgm-power-btn \${bgmOn ? 'on' : 'off'}" id="btn-bgm-power" type="button">
              \${bgmOn ? '🎵 音乐开启' : '🔇 音乐关闭'}
            </button>
            <button class="sheet-close-btn bgm-close" id="btn-close-bgm-pop" type="button" aria-label="关闭配乐台">✕</button>
          </div>
        </div>

        <div class="bgm-now-playing">
          <div class="bgm-track-name" id="bgm-now-track">\${trackLabel}</div>
          <div class="bgm-track-meta">\${modeTag} · Web Audio 实时合成器</div>
        </div>

        <div class="bgm-mode-grid" id="bgm-mode-grid">
          \${pillsHtml}
        </div>

        <div class="bgm-sliders-box">
          <label class="bgm-slider-row">
            <span>音乐音量</span>
            <input type="range" id="slider-bgm-vol" min="0" max="100" value="\${bgmVolPct}" />
            <strong id="val-bgm-vol">\${bgmVolPct}%</strong>
          </label>
          <label class="bgm-slider-row">
            <span>战斗音效</span>
            <input type="range" id="slider-sfx-vol" min="0" max="100" value="\${sfxVolPct}" />
            <strong id="val-sfx-vol">\${sfxVolPct}%</strong>
          </label>
        </div>
      </aside>
    \`;

    this.bgmPopoverHost.querySelector('#btn-close-bgm-pop')!.addEventListener('click', () => {
      this.engine.getAudio().playUiClick();
      this.bgmPopoverOpen = false;
      this.lastBgmPopSig = '';
      this.bgmPopoverHost.innerHTML = '';
    });

    this.bgmPopoverHost.querySelector('#btn-bgm-power')!.addEventListener('click', () => {
      this.engine.getAudio().playUiClick();
      this.engine.toggleBgm();
    });

    this.bgmPopoverHost.querySelectorAll<HTMLButtonElement>('[data-bgm-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.bgmMode;
        if (!mode) return;
        this.engine.getAudio().playUiClick();
        this.engine.setBgmOverrideMode(mode as Parameters<GameEngine['setBgmOverrideMode']>[0]);
      });
    });

    const bgmSlider = this.bgmPopoverHost.querySelector<HTMLInputElement>('#slider-bgm-vol');
    const bgmVal = this.bgmPopoverHost.querySelector<HTMLElement>('#val-bgm-vol');
    if (bgmSlider) {
      bgmSlider.addEventListener('input', () => {
        const v = Number(bgmSlider.value);
        if (bgmVal) bgmVal.textContent = \`\${v}%\`;
        this.engine.getAudio().setBgmVolume(v / 100);
      });
      bgmSlider.addEventListener('change', () => {
        this.engine.setBgmVolume(Number(bgmSlider.value) / 100);
      });
    }

    const sfxSlider = this.bgmPopoverHost.querySelector<HTMLInputElement>('#slider-sfx-vol');
    const sfxVal = this.bgmPopoverHost.querySelector<HTMLElement>('#val-sfx-vol');
    if (sfxSlider) {
      sfxSlider.addEventListener('input', () => {
        const v = Number(sfxSlider.value);
        if (sfxVal) sfxVal.textContent = \`\${v}%\`;
        this.engine.getAudio().setSfxVolume(v / 100);
      });
      sfxSlider.addEventListener('change', () => {
        this.engine.setSfxVolume(Number(sfxSlider.value) / 100);
      });
    }
  }

  private renderBottomTray(snap: UISnapshot): void {`,
    'UIManager renderBgmPopover method'
  );

  fs.writeFileSync(uiPath, uiSrc, 'utf8');
}

// ============================================================================
// 5. Append Soundtrack Console styles to src/style.css
// ============================================================================
const cssPath = path.join(root, 'src/style.css');
let cssSrc = fs.readFileSync(cssPath, 'utf8');
if (!cssSrc.includes('.bgm-console-card')) {
  cssSrc += `

/* ==================== V4 ADAPTIVE SOUNDTRACK CONSOLE ==================== */
.enamel-icon-btn.bgm-active {
  color: #67e8f9;
  border-color: #22d3ee;
  box-shadow: 0 2px 0 #1a1033, 0 0 10px rgba(34, 211, 238, 0.25);
}

.bgm-popover-slot {
  position: absolute;
  top: 52px;
  right: 10px;
  z-index: 48;
  pointer-events: auto;
}

.bgm-console-card {
  width: min(332px, calc(100vw - 20px));
  background: linear-gradient(180deg, rgba(25, 33, 56, 0.97), rgba(15, 21, 38, 0.98));
  border: 2.5px solid #1a1033;
  outline: 1.5px solid rgba(56, 189, 248, 0.45);
  border-radius: 14px;
  padding: 10px 12px;
  box-shadow: 0 10px 26px rgba(6, 9, 20, 0.72);
  color: #f3efe6;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bgm-console-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.bgm-title-wrap {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  letter-spacing: 0.02em;
}

.bgm-live-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #64748b;
}

.bgm-live-dot.playing {
  background: #22d3ee;
  box-shadow: 0 0 8px #22d3ee;
  animation: bgmPulseDot 1.3s ease-in-out infinite;
}

@keyframes bgmPulseDot {
  0%, 100% { transform: scale(0.92); opacity: 0.75; }
  50% { transform: scale(1.22); opacity: 1; }
}

.bgm-head-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.bgm-power-btn {
  font-size: 11px;
  font-weight: 800;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1.5px solid #38bdf8;
  background: rgba(14, 116, 144, 0.28);
  color: #e0f2fe;
  cursor: pointer;
}

.bgm-power-btn.off {
  border-color: #64748b;
  background: rgba(51, 65, 85, 0.45);
  color: #94a3b8;
}

.bgm-now-playing {
  background: rgba(11, 16, 30, 0.72);
  border: 1px solid rgba(125, 211, 252, 0.24);
  border-radius: 9px;
  padding: 6px 9px;
}

.bgm-track-name {
  font-size: 12.5px;
  font-weight: 800;
  color: #67e8f9;
}

.bgm-track-meta {
  font-size: 10.5px;
  color: #94a3b8;
  margin-top: 1px;
}

.bgm-mode-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 5px;
}

.bgm-mode-pill {
  font-size: 11px;
  font-weight: 700;
  text-align: left;
  padding: 5px 8px;
  border-radius: 8px;
  border: 1.5px solid rgba(148, 163, 184, 0.26);
  background: rgba(30, 41, 59, 0.68);
  color: #cbd5e1;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: transform 0.1s ease, border-color 0.15s ease, background 0.15s ease;
}

.bgm-mode-pill:hover {
  border-color: rgba(103, 232, 249, 0.6);
  color: #f8fafc;
}

.bgm-mode-pill.active {
  background: linear-gradient(135deg, rgba(14, 116, 144, 0.65), rgba(59, 130, 246, 0.48));
  border-color: #38bdf8;
  color: #fef08a;
}

.bgm-mode-pill[data-bgm-mode="auto"] {
  grid-column: span 2;
  text-align: center;
}

.bgm-sliders-box {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding-top: 2px;
}

.bgm-slider-row {
  display: grid;
  grid-template-columns: 56px 1fr 36px;
  align-items: center;
  gap: 7px;
  font-size: 11px;
  color: #cbd5e1;
}

.bgm-slider-row input[type="range"] {
  width: 100%;
  accent-color: #22d3ee;
  cursor: pointer;
  height: 5px;
}

.bgm-slider-row strong {
  text-align: right;
  font-size: 11px;
  color: #67e8f9;
}
`;
  fs.writeFileSync(cssPath, cssSrc, 'utf8');
}

// ============================================================================
// 6. Update .github/workflows/build-standalone.yml to run upgrade_v4_bgm.mjs too
// ============================================================================
const wfPath = path.join(root, '.github/workflows/build-standalone.yml');
if (fs.existsSync(wfPath)) {
  let wfSrc = fs.readFileSync(wfPath, 'utf8');
  if (!wfSrc.includes('upgrade_v4_bgm.mjs') && wfSrc.includes('upgrade_v3.mjs')) {
    wfSrc = wfSrc.replace(
      'node scripts/upgrade_v3.mjs',
      'node scripts/upgrade_v3.mjs\n      - run: node scripts/upgrade_v4_bgm.mjs'
    );
    fs.writeFileSync(wfPath, wfSrc, 'utf8');
  }
}

console.log('[upgrade_v4_bgm] All V4 adaptive BGM upgrades applied cleanly!');
