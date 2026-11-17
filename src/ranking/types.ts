export interface EndlessRunResult {
  runId: string;
  completedWaves: number;
  kills: number;
  duration: number;
  maxOverclock: number;
  arsenalLevel: number;
  crystalProtocolLevel: number;
}

export type EndlessRunEndReason = 'defeat' | 'restart' | 'stage-change';

export interface RankingEntry {
  rank: number;
  playerId: string;
  username: string;
  metrics: { score: number; kills: number; duration: number };
  achievedAt: string;
}
