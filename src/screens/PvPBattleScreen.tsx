import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../multiplayer/supabaseClient';

const WORDS = ['keyboard', 'fighter', 'computer', 'typing', 'victory', 'academy', 'practice', 'challenge', 'speed', 'battle', 'creative', 'learning'];
type EventPayload = { type: 'start' | 'progress' | 'finish' | 'result' | 'rematch'; round?: number; word?: string; role?: string; value?: string; winner?: string; hostHp?: number; guestHp?: number };
interface Props { roomId: string; hostName: string; guestName: string; playerName: string; onLeave: () => void }

export const PvPBattleScreen: React.FC<Props> = ({ roomId, hostName, guestName, playerName, onLeave }) => {
  const isHost = playerName === hostName;
  const role = isHost ? 'host' : 'guest';
  const [status, setStatus] = useState('Connecting to opponent...');
  const [round, setRound] = useState(0);
  const [word, setWord] = useState('');
  const [input, setInput] = useState('');
  const [opponentInput, setOpponentInput] = useState('');
  const [hostHp, setHostHp] = useState(5);
  const [guestHp, setGuestHp] = useState(5);
  const [connected, setConnected] = useState(false);
  const [finished, setFinished] = useState(false);
  const channel = useRef<ReturnType<NonNullable<typeof supabase>['channel']> | null>(null);
  const authoritative = useRef({ round: 0, hostHp: 5, guestHp: 5, resolved: false });
  const send = (payload: EventPayload) => channel.current?.send({ type: 'broadcast', event: 'fight', payload });
  const begin = (nextRound: number) => {
    const nextWord = WORDS[(nextRound - 1) % WORDS.length];
    authoritative.current.round = nextRound;
    authoritative.current.resolved = false;
    setRound(nextRound); setWord(nextWord); setInput(''); setOpponentInput('');
    setStatus('TYPE THE WORD!');
    void send({ type: 'start', round: nextRound, word: nextWord });
  };
  const resolve = (winningRole: string, targetRound: number) => {
    const state = authoritative.current;
    if (!isHost || state.resolved || state.round !== targetRound) return;
    state.resolved = true;
    if (winningRole === 'host') state.guestHp = Math.max(0, state.guestHp - 1);
    else state.hostHp = Math.max(0, state.hostHp - 1);
    setHostHp(state.hostHp); setGuestHp(state.guestHp);
    void send({ type: 'result', winner: winningRole, round: targetRound, hostHp: state.hostHp, guestHp: state.guestHp });
    setStatus(winningRole === role ? 'HIT! You scored.' : 'You were hit!');
    if (state.hostHp === 0 || state.guestHp === 0) { setFinished(true); return; }
    window.setTimeout(() => { if (channel.current) begin(targetRound + 1); }, 1100);
  };
  const resolver = useRef(resolve);
  resolver.current = resolve;

  useEffect(() => {
    if (!supabase) { setStatus('Supabase is not configured.'); return; }
    const ch = supabase.channel('skillfight-pvp-' + roomId, { config: { broadcast: { self: false }, presence: { key: role } } });
    channel.current = ch;
    ch.on('broadcast', { event: 'fight' }, ({ payload }: { payload: EventPayload }) => {
      if (payload.type === 'start' && payload.word && payload.round) {
        setRound(payload.round); setWord(payload.word); setInput(''); setOpponentInput(''); setStatus('TYPE THE WORD!');
      }
      if (payload.type === 'progress' && payload.role !== role) setOpponentInput(payload.value || '');
      if (payload.type === 'finish' && payload.role && payload.round) resolver.current(payload.role, payload.round);
      if (payload.type === 'result' && payload.round) {
        setHostHp(payload.hostHp ?? 5); setGuestHp(payload.guestHp ?? 5);
        setStatus(payload.winner === role ? 'HIT! You scored.' : 'You were hit!');
        if (payload.hostHp === 0 || payload.guestHp === 0) setFinished(true);
      }
      if (payload.type === 'rematch') {
        setFinished(false); setHostHp(5); setGuestHp(5);
        authoritative.current = { round: 0, hostHp: 5, guestHp: 5, resolved: false };
        if (isHost) begin(1);
      }
    });
    ch.on('presence', { event: 'sync' }, () => {
      const presences = ch.presenceState();
      const both = Boolean(presences.host?.length && presences.guest?.length);
      setConnected(both);
      if (both && isHost && authoritative.current.round === 0) begin(1);
    });
    ch.subscribe(async state => {
      if (state === 'SUBSCRIBED') await ch.track({ joined_at: Date.now() });
      if (state === 'CHANNEL_ERROR' || state === 'TIMED_OUT') setStatus('Connection interrupted. Rejoin the room.');
    });
    return () => { channel.current = null; void supabase!.removeChannel(ch); };
  }, [roomId, role, isHost]);

  const onType = (value: string) => {
    if (!word || !connected || finished || value.length > word.length || !word.startsWith(value)) return;
    setInput(value);
    void send({ type: 'progress', role, value, round });
    if (value === word) {
      setStatus('Attack sent!');
      if (isHost) resolve(role, round);
      else void send({ type: 'finish', role, round });
    }
  };
  const myHp = isHost ? hostHp : guestHp;
  const theirHp = isHost ? guestHp : hostHp;
  return <section className="student-flow-card" style={{ width: 'min(92vw,650px)', textAlign: 'center' }}>
    <h2>LIVE 1v1 FIGHT</h2>
    <p>{hostName} VS {guestName} · {roomId}</p>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, margin: '16px 0' }}>
      <strong>{playerName}: {myHp} HP</strong><strong>{isHost ? guestName : hostName}: {theirHp} HP</strong>
    </div>
    <p>ROUND {round || '—'}</p>
    <h2 style={{ letterSpacing: 2 }}>{finished ? (myHp > 0 ? 'YOU WIN!' : 'YOU LOSE') : (word || 'Waiting...')}</h2>
    <input aria-label="Type fighting word" autoFocus autoComplete="off" value={input} disabled={!connected || finished || !word || input === word} onChange={e => onType(e.target.value.toLowerCase())} style={{ width: '90%', padding: 14, fontSize: 20 }} />
    <p>Opponent progress: {opponentInput.length}/{word.length || 0}</p>
    <p role="status">{connected ? status : 'Waiting for both players to connect...'}</p>
    {finished && isHost && <button className="student-flow-button main" onClick={() => { setFinished(false); setHostHp(5); setGuestHp(5); authoritative.current = { round: 0, hostHp: 5, guestHp: 5, resolved: false }; void send({ type: 'rematch' }); begin(1); }}>REMATCH</button>}
    <button className="student-flow-button" onClick={onLeave}>LEAVE ROOM</button>
  </section>;
};
