import { useCallback, useEffect, useRef, useState } from 'react';
import {
  emptyLiveScore,
  type LiveMatchState,
  type MatRoomServerMessage,
  type ScoringEvent,
} from '@bushi/domain';
import { WS_BASE } from '../lib/api.js';

function seed(matchId: string): LiveMatchState {
  return {
    matchId,
    matNumber: 1,
    divisionName: 'BJJ Adult Purple -76kg',
    status: 'ready',
    fighters: {
      a: { id: 'a', name: 'Kenji Tanaka', school: 'Ironbound BJJ', color: 'red' },
      b: { id: 'b', name: 'Diego Garcia', school: 'Ronin Academy', color: 'blue' },
    },
    score: emptyLiveScore(),
    clock: { running: false, remainingSeconds: 300, periodLengthSeconds: 300, period: 1, totalPeriods: 1, startedAt: null },
    result: null,
    version: 0,
    updatedAt: Date.now(),
  };
}

/**
 * Connects to the MatRoom Durable Object over WebSockets. If the socket can't
 * connect (no backend in a demo), it transparently falls back to a local
 * in-memory simulator so the scoring UI is always interactive.
 */
export function useMatRoom(matchId: string, role: string) {
  const [state, setState] = useState<LiveMatchState>(() => seed(matchId));
  const [connected, setConnected] = useState(false);
  const [live, setLive] = useState(false); // true when a real socket is attached
  const wsRef = useRef<WebSocket | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(`${WS_BASE}/api/live/${encodeURIComponent(matchId)}?role=${role}`);
      wsRef.current = ws;
      ws.onopen = () => {
        if (cancelled) return;
        setConnected(true);
        setLive(true);
      };
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data as string) as MatRoomServerMessage;
        if (msg.type === 'state') setState(msg.state);
      };
      ws.onclose = () => {
        setConnected(false);
        setLive(false);
      };
      ws.onerror = () => {
        setLive(false);
      };
    } catch {
      setLive(false);
    }
    return () => {
      cancelled = true;
      ws?.close();
    };
  }, [matchId, role]);

  // Local clock ticker for the simulator fallback.
  useEffect(() => {
    if (live) return;
    if (state.clock.running) {
      tickRef.current = setInterval(() => {
        setState((s) => {
          if (!s.clock.running) return s;
          const remaining = Math.max(0, s.clock.remainingSeconds - 1);
          return { ...s, clock: { ...s.clock, remainingSeconds: remaining, running: remaining > 0 }, updatedAt: Date.now() };
        });
      }, 1000);
    }
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [live, state.clock.running]);

  const send = useCallback(
    (event: ScoringEvent) => {
      if (live && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(event));
        return;
      }
      // Simulator: apply locally.
      setState((s) => applyLocal(s, event));
    },
    [live],
  );

  return { state, connected, live, send };
}

function applyLocal(s: LiveMatchState, event: ScoringEvent): LiveMatchState {
  const next: LiveMatchState = { ...s, score: { ...s.score }, clock: { ...s.clock }, updatedAt: Date.now(), version: s.version + 1 };
  switch (event.type) {
    case 'score':
      if (event.participant === 'a') next.score.a = Math.max(0, next.score.a + event.points);
      else next.score.b = Math.max(0, next.score.b + event.points);
      break;
    case 'penalty':
      if (event.participant === 'a') next.score.penaltiesA += event.amount;
      else next.score.penaltiesB += event.amount;
      break;
    case 'timer':
      if (event.action === 'start') {
        next.clock.running = true;
        next.status = 'live';
      } else if (event.action === 'pause') next.clock.running = false;
      else if (event.action === 'reset') {
        next.clock.running = false;
        next.clock.remainingSeconds = next.clock.periodLengthSeconds;
      } else if (event.action === 'set') next.clock.remainingSeconds = event.seconds ?? next.clock.periodLengthSeconds;
      break;
    case 'result':
      next.status = 'completed';
      next.result = { winner: event.winner, method: event.method };
      next.clock.running = false;
      break;
    case 'reset_match':
      next.score = emptyLiveScore();
      next.result = null;
      next.status = 'ready';
      next.clock = { ...next.clock, running: false, remainingSeconds: next.clock.periodLengthSeconds };
      break;
    case 'period':
      break;
  }
  return next;
}
