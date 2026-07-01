/// <reference types="@cloudflare/workers-types" />
import {
  emptyLiveScore,
  scoringEventSchema,
  type LiveMatchState,
  type MatRoomServerMessage,
  type ScoringEvent,
} from '@bushi/domain';
import type { Env } from '../env.js';

/**
 * MatRoom — one Durable Object instance per live match/mat. It owns the
 * authoritative live match state, accepts validated scoring events from
 * scorekeepers/referees, broadcasts state frames to every connected client
 * (scorekeepers, display boards, public viewers), survives disconnects via the
 * WebSocket hibernation API, and enqueues durable persistence side effects.
 */
export class MatRoom implements DurableObject {
  private state: LiveMatchState;

  constructor(
    private readonly ctx: DurableObjectState,
    private readonly env: Env,
  ) {
    this.state = defaultState('unknown');
    // Restore persisted state on wake.
    this.ctx.blockConcurrencyWhile(async () => {
      const saved = await this.ctx.storage.get<LiveMatchState>('state');
      if (saved) this.state = saved;
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // WebSocket upgrade — a client joining the room.
    if (request.headers.get('Upgrade') === 'websocket') {
      const role = url.searchParams.get('role') ?? 'spectator';
      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];
      this.ctx.acceptWebSocket(server, [role]);
      // Send current state immediately.
      server.send(JSON.stringify({ type: 'state', state: this.state } satisfies MatRoomServerMessage));
      this.broadcastPresence();
      return new Response(null, { status: 101, webSocket: client });
    }

    // REST control plane (used by the API to seed / inspect a room).
    if (url.pathname.endsWith('/init') && request.method === 'POST') {
      const body = (await request.json()) as Partial<LiveMatchState> & { matchId: string };
      this.state = { ...defaultState(body.matchId), ...body, version: this.state.version + 1, updatedAt: Date.now() };
      await this.persist();
      this.broadcastState();
      return Response.json(this.state);
    }

    if (url.pathname.endsWith('/state')) {
      return Response.json(this.state);
    }

    return new Response('Not found', { status: 404 });
  }

  // --- WebSocket hibernation handlers ---

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const tags = this.ctx.getTags(ws);
    const canScore = tags.includes('scorekeeper') || tags.includes('referee') || tags.includes('organizer');
    let parsed: unknown;
    try {
      parsed = JSON.parse(typeof message === 'string' ? message : new TextDecoder().decode(message));
    } catch {
      return this.sendError(ws, 'Malformed message');
    }
    const result = scoringEventSchema.safeParse(parsed);
    if (!result.success) return this.sendError(ws, 'Invalid scoring event');
    if (!canScore) return this.sendError(ws, 'Not permitted to score');

    this.applyEvent(result.data);
    await this.persist();
    this.broadcastState();
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    try {
      ws.close();
    } catch {
      /* already closed */
    }
    this.broadcastPresence();
  }

  async webSocketError(): Promise<void> {
    this.broadcastPresence();
  }

  // --- scoring logic ---

  private applyEvent(event: ScoringEvent): void {
    const s = this.state;
    switch (event.type) {
      case 'score': {
        const key = event.participant === 'a' ? 'a' : 'b';
        s.score[key] = Math.max(0, s.score[key] + event.points);
        break;
      }
      case 'penalty': {
        const key = event.participant === 'a' ? 'penaltiesA' : 'penaltiesB';
        s.score[key] = Math.max(0, s.score[key] + event.amount);
        break;
      }
      case 'timer': {
        this.handleTimer(event);
        break;
      }
      case 'period': {
        if (event.action === 'next' && s.clock.period < s.clock.totalPeriods) s.clock.period++;
        if (event.action === 'previous' && s.clock.period > 1) s.clock.period--;
        s.clock.remainingSeconds = s.clock.periodLengthSeconds;
        s.clock.running = false;
        s.clock.startedAt = null;
        break;
      }
      case 'result': {
        s.status = 'completed';
        s.result = { winner: event.winner, method: event.method };
        s.clock.running = false;
        s.clock.startedAt = null;
        this.enqueuePersistResult(event.winner, event.method);
        break;
      }
      case 'reset_match': {
        const { a, b } = s.fighters;
        this.state = { ...defaultState(s.matchId), matNumber: s.matNumber, divisionName: s.divisionName, fighters: { a, b }, version: s.version };
        break;
      }
    }
    this.state.version++;
    this.state.updatedAt = Date.now();
  }

  private handleTimer(event: Extract<ScoringEvent, { type: 'timer' }>): void {
    const clock = this.state.clock;
    switch (event.action) {
      case 'start':
        clock.running = true;
        clock.startedAt = Date.now();
        this.state.status = 'live';
        break;
      case 'pause':
        this.settleClock();
        clock.running = false;
        clock.startedAt = null;
        break;
      case 'reset':
        clock.running = false;
        clock.startedAt = null;
        clock.remainingSeconds = clock.periodLengthSeconds;
        break;
      case 'set':
        clock.remainingSeconds = event.seconds ?? clock.periodLengthSeconds;
        break;
    }
  }

  /** Deduct elapsed wall-clock time when pausing so the clock is accurate. */
  private settleClock(): void {
    const clock = this.state.clock;
    if (clock.running && clock.startedAt) {
      const elapsed = Math.floor((Date.now() - clock.startedAt) / 1000);
      clock.remainingSeconds = Math.max(0, clock.remainingSeconds - elapsed);
    }
  }

  // --- broadcasting ---

  private broadcastState(): void {
    this.broadcast({ type: 'state', state: this.state });
  }

  private broadcastPresence(): void {
    const sockets = this.ctx.getWebSockets();
    let scorekeepers = 0;
    let spectators = 0;
    for (const ws of sockets) {
      const tags = this.ctx.getTags(ws);
      if (tags.includes('scorekeeper') || tags.includes('referee') || tags.includes('organizer')) scorekeepers++;
      else spectators++;
    }
    this.broadcast({ type: 'presence', scorekeepers, spectators });
  }

  private broadcast(message: MatRoomServerMessage): void {
    const payload = JSON.stringify(message);
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(payload);
      } catch {
        /* drop broken socket */
      }
    }
  }

  private sendError(ws: WebSocket, message: string): void {
    try {
      ws.send(JSON.stringify({ type: 'error', message } satisfies MatRoomServerMessage));
    } catch {
      /* ignore */
    }
  }

  private async persist(): Promise<void> {
    await this.ctx.storage.put('state', this.state);
  }

  private enqueuePersistResult(winner: 'a' | 'b' | 'draw', method: string): void {
    if (winner === 'draw') return;
    const fighter = winner === 'a' ? this.state.fighters.a : this.state.fighters.b;
    // Best-effort: the queue may be absent in local dev.
    try {
      void this.env.JOBS?.send({
        kind: 'persist_match_result',
        matchId: this.state.matchId,
        winnerAthleteId: fighter.id,
        method,
      });
    } catch {
      /* queue not bound */
    }
  }
}

function defaultState(matchId: string): LiveMatchState {
  return {
    matchId,
    matNumber: 1,
    divisionName: '',
    status: 'pending',
    fighters: {
      a: { id: 'a', name: 'Red', color: 'red' },
      b: { id: 'b', name: 'Blue', color: 'blue' },
    },
    score: emptyLiveScore(),
    clock: {
      running: false,
      remainingSeconds: 180,
      periodLengthSeconds: 180,
      period: 1,
      totalPeriods: 1,
      startedAt: null,
    },
    result: null,
    version: 0,
    updatedAt: Date.now(),
  };
}
