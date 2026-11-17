import type { EndlessRunResult, RankingEntry } from './types';

export const RANKING_CONFIG = {
  baseUrl: 'https://ranking-api-production-a8ed42bc.up.railway.app',
  game: 'tdk',
  board: 'endless',
  pageSize: 20,
} as const;
const NAME_KEY = 'lunar_beacon_player_name_v1';
const PENDING_KEY = 'lunar_beacon_ranking_pending_v1';
const DEFEAT_KEY = 'lunar_beacon_ranking_first_defeat_v1';
const REGISTRATION_RUN_KEY = 'lunar_beacon_ranking_registration_run_v1';

export interface RankingConfig { baseUrl: string; game: string; board: string; pageSize: number }

interface Identity { playerId: string; token: string; expiresAt: number }
interface PendingScore { run: EndlessRunResult; username: string }
export interface LeaderboardState {
  revision: number;
  username: string;
  unlocked: boolean;
  persistent: boolean;
  entries: RankingEntry[];
  total: number;
  offset: number;
  loading: boolean;
  error: string;
  myEntry: RankingEntry | null;
  myError: string;
  pending: boolean;
  submitting: boolean;
  submissionMessage: string;
}

class RankingError extends Error {
  status: number;
  code: string;
  constructor(message: string, status = 0, code = '') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof RankingError) {
    if (error.status === 429) return '操作较频繁，请稍后再试。';
    if (error.status === 401 || error.status === 403) return '排行榜身份暂不可用，请稍后重试。';
    if (error.code === 'GAME_NOT_FOUND' || error.code === 'BOARD_NOT_FOUND') return '排行榜暂未开放，请稍后再试。';
    if (error.message) return error.message;
  }
  return '暂时无法连接排行榜，请检查网络后重试。';
}

function betterRun(a: EndlessRunResult, b: EndlessRunResult): boolean {
  return a.completedWaves > b.completedWaves ||
    (a.completedWaves === b.completedWaves && (a.kills > b.kills ||
      (a.kills === b.kills && a.duration < b.duration)));
}

function validRun(value: unknown): value is EndlessRunResult {
  if (!value || typeof value !== 'object') return false;
  const run = value as EndlessRunResult;
  return typeof run.runId === 'string' && run.runId.length > 0 &&
    Number.isSafeInteger(run.completedWaves) && run.completedWaves >= 0 &&
    Number.isSafeInteger(run.kills) && run.kills >= 0 &&
    Number.isFinite(run.duration) && run.duration > 0 && run.duration <= Number.MAX_SAFE_INTEGER;
}

/** One shared client per page; never put administrator/game-backend keys here. */
export class LeaderboardService {
  private config: Readonly<RankingConfig>;
  private identityKey: string;
  private pendingKey: string;
  private legacyPending = false;
  private storage: Storage | null = null;
  private username = '';
  private firstDefeat = false;
  private registrationRun: EndlessRunResult | null = null;
  private persistent = true;
  private identity: Identity | null = null;
  private identityRequest: Promise<Identity> | null = null;
  private pendingScore: PendingScore | null = null;
  private submitRequest: Promise<void> | null = null;
  private refreshRequest: { offset: number; promise: Promise<void> } | null = null;
  private refreshVersion = 0;
  private listeners = new Set<() => void>();
  private state: Omit<LeaderboardState, 'username' | 'unlocked' | 'persistent' | 'pending' | 'submitting'> = {
    revision: 0, entries: [], total: 0, offset: 0, loading: false,
    error: '', myEntry: null, myError: '', submissionMessage: '',
  };

  constructor(config: Readonly<RankingConfig> = RANKING_CONFIG) {
    this.config = { ...config, baseUrl: config.baseUrl.replace(/\/+$/, '') };
    this.identityKey = `ranking:v1:${this.config.baseUrl}:${this.config.game}`;
    this.pendingKey = `${PENDING_KEY}:${this.config.game}:${this.config.board}`;
    this.legacyPending = this.config.baseUrl === RANKING_CONFIG.baseUrl && this.config.game === RANKING_CONFIG.game && this.config.board === RANKING_CONFIG.board;
    try { this.storage = window.localStorage; } catch { this.persistent = false; }
    this.username = this.read(NAME_KEY)?.trim().slice(0, 80) ?? '';
    this.firstDefeat = this.read(DEFEAT_KEY) === '1';
    try {
      const run = JSON.parse(this.read(REGISTRATION_RUN_KEY) ?? 'null');
      if (validRun(run)) this.registrationRun = run;
    } catch { /* Ignore a damaged registration result. */ }
    try {
      const id = JSON.parse(this.read(this.identityKey) ?? 'null') as Identity | null;
      if (id && typeof id.token === 'string' && typeof id.playerId === 'string' && Number.isFinite(id.expiresAt)) this.identity = id;
    } catch { /* A damaged identity cache must not discard a pending score. */ }
    try {
      const pending = JSON.parse(this.read(this.pendingKey) ?? (this.legacyPending ? this.read(PENDING_KEY) : null) ?? 'null') as PendingScore | null;
      if (pending && validRun(pending.run) && typeof pending.username === 'string' && pending.username.trim().length > 0 && pending.username.length <= 80) {
        this.pendingScore = pending;
        this.state.submissionMessage = '有一份待上传成绩，可点击重试。';
      }
    } catch { /* Ignore corrupt local cache; gameplay remains available. */ }
    if (this.firstDefeat && this.username && this.registrationRun &&
      (!this.pendingScore || betterRun(this.registrationRun, this.pendingScore.run))) {
      this.pendingScore = { run: this.registrationRun, username: this.username };
    }
  }

  private read(key: string): string | null {
    try { return this.storage?.getItem(key) ?? null; } catch { this.persistent = false; return null; }
  }
  private write(key: string, value: string | null): void {
    try {
      if (!this.storage) { this.persistent = false; return; }
      if (value === null) this.storage.removeItem(key);
      else this.storage.setItem(key, value);
    } catch { this.persistent = false; }
  }
  private changed(): void {
    this.state.revision++;
    for (const listener of this.listeners) listener();
  }
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  getState(): LeaderboardState {
    return { ...this.state, username: this.username, unlocked: this.firstDefeat && Boolean(this.username), persistent: this.persistent,
      pending: this.pendingScore !== null, submitting: this.submitRequest !== null };
  }
  getUsername(): string { return this.username; }
  needsRegistration(): boolean { return this.firstDefeat && !this.username; }
  recordDefeat(run: EndlessRunResult): void {
    if (!validRun(run)) return;
    this.firstDefeat = true;
    this.write(DEFEAT_KEY, '1');
    if (!this.username) {
      if (!this.registrationRun || betterRun(run, this.registrationRun)) {
        this.registrationRun = { ...run };
        this.write(REGISTRATION_RUN_KEY, JSON.stringify(this.registrationRun));
      }
      this.changed();
    } else this.queueResult(run);
  }
  setUsername(value: string): void {
    const name = value.trim();
    if (!name || name.length > 80) throw new Error('请输入 1–80 个字符的名字。');
    this.username = name;
    this.write(NAME_KEY, name);
    this.changed();
    if (this.firstDefeat && this.registrationRun) this.queueResult(this.registrationRun);
  }

  private async request<T>(path: string, body?: unknown, token?: string): Promise<T> {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(`${this.config.baseUrl}/api/v1/games/${encodeURIComponent(this.config.game)}${path}`, {
        method: body === undefined ? 'GET' : 'POST', credentials: 'omit', signal: controller.signal,
        headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new RankingError(typeof data?.message === 'string' ? data.message : '排行榜暂不可用。', response.status, typeof data?.code === 'string' ? data.code : '');
      if (!data || typeof data !== 'object') throw new Error('无效的排行榜数据。');
      return data as T;
    } finally { window.clearTimeout(timer); }
  }

  private session(): Promise<Identity> {
    if (this.identity && this.identity.expiresAt > Date.now() / 1000 + 60) return Promise.resolve(this.identity);
    if (!this.identityRequest) {
      this.identityRequest = this.request<Identity>('/sessions', {}).then(identity => {
        if (!identity || typeof identity.playerId !== 'string' || typeof identity.token !== 'string' || !Number.isFinite(identity.expiresAt)) throw new Error('无效的排行榜身份。');
        this.identity = identity;
        this.write(this.identityKey, JSON.stringify(identity));
        return identity;
      }).finally(() => { this.identityRequest = null; });
    }
    return this.identityRequest;
  }

  private async myRank(): Promise<RankingEntry | null> {
    if (!this.identity) return null;
    const identity = await this.session();
    try {
      const result = await this.request<{ entry: RankingEntry }>(`/boards/${encodeURIComponent(this.config.board)}/players/${encodeURIComponent(identity.playerId)}`, undefined, identity.token);
      return result.entry;
    } catch (error) {
      if (error instanceof RankingError && error.code === 'PLAYER_NOT_RANKED') return null;
      throw error;
    }
  }

  refresh(offset = 0, force = false): Promise<void> {
    if (!this.getState().unlocked) return Promise.resolve();
    offset = Math.max(0, Math.min(10000, Math.floor(offset)));
    if (!force && this.refreshRequest?.offset === offset) return this.refreshRequest.promise;
    const version = ++this.refreshVersion;
    this.state.loading = true;
    this.state.error = '';
    this.state.offset = offset;
    this.changed();
    const task = (async () => {
      const [board, mine] = await Promise.allSettled([
        this.request<{ entries: RankingEntry[]; total: number }>(`/boards/${encodeURIComponent(this.config.board)}?limit=${this.config.pageSize}&offset=${offset}`),
        this.myRank(),
      ]);
      if (version !== this.refreshVersion) return;
      if (board.status === 'fulfilled' && board.value && Array.isArray(board.value.entries) && Number.isSafeInteger(board.value.total) && board.value.total >= 0) {
        this.state.entries = board.value.entries;
        this.state.total = board.value.total;
      } else {
        this.state.error = errorMessage(board.status === 'rejected' ? board.reason : new Error('无效的排行榜数据。'));
      }
      if (mine.status === 'fulfilled') {
        this.state.myEntry = mine.value;
        this.state.myError = '';
      } else this.state.myError = errorMessage(mine.reason);
    })().finally(() => {
      if (version === this.refreshVersion) {
        this.state.loading = false;
        this.refreshRequest = null;
        this.changed();
      }
    });
    this.refreshRequest = { offset, promise: task };
    return task;
  }

  queueResult(run: EndlessRunResult): void {
    if (!this.firstDefeat || !this.username || !validRun(run)) return;
    if (this.pendingScore && !betterRun(run, this.pendingScore.run)) {
      void this.submitPending();
      return;
    }
    this.pendingScore = { run: { ...run }, username: this.username };
    this.write(this.pendingKey, JSON.stringify(this.pendingScore));
    this.state.submissionMessage = '成绩已保留，正在上传…';
    this.changed();
    void this.submitPending();
  }

  submitPending(): Promise<void> {
    if (!this.firstDefeat || !this.username) return Promise.resolve();
    if (this.submitRequest) return this.submitRequest;
    if (!this.pendingScore) return Promise.resolve();
    this.submitRequest = (async () => {
      let submitted = false;
      while (this.pendingScore) {
        const candidate = this.pendingScore;
        try {
          const identity = await this.session();
          const { run } = candidate;
          const response = await this.request<{ accepted: boolean }>(`/boards/${encodeURIComponent(this.config.board)}/scores`, {
            username: candidate.username,
            metrics: { score: run.completedWaves, kills: run.kills, duration: run.duration },
            info: { stage: 'endless', maxOverclock: run.maxOverclock,
              arsenalLevel: run.arsenalLevel, crystalProtocolLevel: run.crystalProtocolLevel },
          }, identity.token);
          if (this.pendingScore === candidate) {
            this.pendingScore = null;
            this.write(this.pendingKey, null);
            if (this.legacyPending) this.write(PENDING_KEY, null);
          }
          if (this.registrationRun && !betterRun(this.registrationRun, run)) {
            this.registrationRun = null;
            this.write(REGISTRATION_RUN_KEY, null);
          }
          this.state.submissionMessage = response.accepted ? '成绩已记录，已更新个人最好战绩。' : '本局已结算，排行榜保留历史最好战绩。';
          submitted = true;
        } catch (error) {
          this.state.submissionMessage = `${errorMessage(error)} 成绩已保留，可点击重试。`;
          break;
        }
      }
      if (submitted) await this.refresh(0, true);
    })().finally(() => {
      this.submitRequest = null;
      this.changed();
    });
    this.changed();
    return this.submitRequest;
  }
}
