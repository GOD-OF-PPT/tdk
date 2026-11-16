import type { TowerTier } from '../types';

const MUTE_STORAGE_KEY = 'lunar_beacon_td_muted_v2';
const SAVE_V2_STORAGE_KEY = 'lunar_beacon_save_v2';
let fallbackMutedMemory = false;

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

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private muted = false;
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
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.42, this.ctx.currentTime);
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  public unlock(): void {
    if (!this.ctx) {
      const AudioCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) return;
      this.ctx = new AudioCtor();
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.ratio.value = 6;
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.42;
      this.masterGain.connect(comp);
      comp.connect(this.ctx.destination);

      // Build reusable 0.5s white-noise buffer for procedural exhaust, ion thunder & arc crackles
      const sampleCount = Math.max(1, Math.floor(this.ctx.sampleRate * 0.5));
      this.noiseBuffer = this.ctx.createBuffer(1, sampleCount, this.ctx.sampleRate);
      const chan = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < sampleCount; i++) {
        chan[i] = Math.random() * 2 - 1;
      }
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  private canPlayRateLimited(key: string, minIntervalMs: number): boolean {
    if (this.muted || !this.ctx || !this.masterGain) return false;
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
    if (this.muted || !this.ctx || !this.masterGain) return;
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
    gain.connect(this.masterGain);
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
    if (this.muted || !this.ctx || !this.masterGain || !this.noiseBuffer) return;
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
    gain.connect(this.masterGain);
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
      // Heroic Golden Legendary Mecha chord!
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

  /**
   * Stage 3 Boss Charge-Up: ~0.93s rising pitch -> 90ms vacuum contraction -> 110ms dead silence -> 1.14s arrival slam!
   */
  public playBossChargeAndSlam(): void {
    this.unlock();
    // Rising turbine whine over 0.93s
    this.tone(85, 640, 0.93, 'sawtooth', 0.24, 0);
    this.tone(130, 880, 0.93, 'sine', 0.18, 0);
    // Sudden vacuum contraction (0.94s -> 1.03s), leaving 110ms pure silence before 1.14s!
    this.tone(720, 90, 0.09, 'triangle', 0.26, 0.94);
    // Massive Boss arrival impact at 1.14s (0.35 + 1.14 = 1.49s timeline sync!)
    this.tone(110, 28, 0.58, 'sawtooth', 0.42, 1.14);
    this.tone(72, 26, 0.65, 'triangle', 0.42, 1.14);
  }

  public playBossSkillWarning(): void {
    if (!this.canPlayRateLimited('warn', 400)) return;
    this.tone(480, 620, 0.16, 'square', 0.18, 0);
    this.tone(480, 620, 0.16, 'square', 0.18, 0.24);
  }

  public playBossSkillSlam(): void {
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
    // Mechanical clasp pop + triumphant brass/chime arpeggio
    this.tone(240, 480, 0.12, 'square', 0.2);
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, i) => {
      this.tone(n, n * 1.01, 0.48, 'triangle', 0.24, 0.12 + i * 0.09);
    });
  }

  // ==================== M3 TACTICAL SKILLS, SYNERGY COMBOS & T4 BRANCH SFX ====================

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
