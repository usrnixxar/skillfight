import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Copy, GraduationCap, Keyboard, Loader2, Lock, Plus, Users, UserRound, Globe, Swords, Check } from 'lucide-react';
import { soundManager } from '../audio/soundManager';
import { supabase, isSupabaseConfigured } from '../multiplayer/supabaseClient';
import type { GameScreen } from '../types/game';

interface StudentScreenProps {
  onNavigate: (screen: GameScreen) => void;
  playerName: string;
  onPlayBot?: () => void;
}
type View = 'landing' | 'login' | 'dashboard' | 'create' | 'join' | 'preview' | 'waiting' | 'online';
type Room = { id: string; name: string; host_name: string; guest_name: string | null; status: string };
const randomId = () => 'SB-' + String(Math.floor(100000 + Math.random() * 900000));

export const StudentScreen: React.FC<StudentScreenProps> = ({ onNavigate, onPlayBot }) => {
  const [view, setView] = useState<View>('landing');
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [roomName, setRoomName] = useState('');
  const [roomPin, setRoomPin] = useState('');
  const [roomId, setRoomId] = useState(() => randomId());
  const [joinId, setJoinId] = useState('');
  const [joinPin, setJoinPin] = useState('');
  const [room, setRoom] = useState<Room | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const pinValid = (value: string) => /^\d{1,6}$/.test(value);
  const safeName = useMemo(() => name.trim().replace(/\s+/g, ' '), [name]);
  const soundClick = () => soundManager.playClick();

  const changeView = (next: View) => { soundClick(); setMessage(''); setView(next); };
  const login = (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^[\p{L} ]{2,40}$/u.test(safeName)) { setMessage('Enter your name using letters only.'); return; }
    if (!pinValid(pin)) { setMessage('Student PIN must contain 1–6 digits.'); return; }
    // Credential lookup requires academy's authenticated student backend.
    // Never present this as verified identification.
    setView('dashboard');
    setMessage(isSupabaseConfigured ? '' : 'Preview login: student PIN is not verified until the academy backend is connected.');
  };

  const createRoom = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^[A-Za-z ]{2,30}$/.test(roomName.trim())) { setMessage('Room name: English letters and spaces only (2–30).'); return; }
    if (!pinValid(roomPin)) { setMessage('Room password must be 1–6 digits.'); return; }
    if (!supabase) { setMessage('Live rooms require a connected Supabase backend. The room was not created.'); return; }
    setLoading(true); setMessage('');
    // Only a server-side RPC may authenticate and store the room PIN securely.
    const { data, error } = await supabase.rpc('skillfight_create_room', {
      p_room_id: roomId, p_room_name: roomName.trim(), p_host_name: safeName, p_room_pin: roomPin
    });
    setLoading(false);
    if (error) { setMessage('Room creation unavailable: ' + error.message); return; }
    const result = data as Room | null;
    if (!result) { setMessage('Server did not confirm room creation.'); return; }
    setRoom(result); setView('waiting');
  };

  const findRoom = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^SB-\d{6}$/.test(joinId.trim().toUpperCase()) || !pinValid(joinPin)) {
      setMessage('Enter the 6-digit Room ID and its 1–6 digit password.'); return;
    }
    if (!supabase) { setMessage('Live room lookup requires the online backend.'); return; }
    setLoading(true); setMessage('');
    const { data, error } = await supabase.rpc('skillfight_check_room', {
      p_room_id: joinId.trim().toUpperCase(), p_room_pin: joinPin
    });
    setLoading(false);
    if (error || !data) { setMessage('Room not found or password incorrect.'); return; }
    setRoom(data as Room); setView('preview');
  };

  const joinRoom = async () => {
    if (!supabase || !room) return;
    setLoading(true); setMessage('');
    const { data, error } = await supabase.rpc('skillfight_join_room', {
      p_room_id: room.id, p_room_pin: joinPin, p_guest_name: safeName
    });
    setLoading(false);
    if (error || !data) { setMessage(error?.message || 'Unable to join this room.'); return; }
    setRoom(data as Room); setView('waiting');
  };

  useEffect(() => {
    if (view !== 'waiting' || !supabase || !room) return;
    // Poll with cleanup as fallback when Realtime channel access is unavailable.
    let closed = false;
    const fetchStatus = async () => {
      const { data } = await supabase!.rpc('skillfight_room_status', { p_room_id: room.id });
      if (closed || !data) return;
      const result = data as Room;
      setRoom(result);
      if (result.status === 'active') {
        // Live PvP battle state must be synchronized by the game engine before navigation.
        setMessage('Second player connected. Multiplayer battle synchronization is not enabled yet.');
      }
    };
    void fetchStatus();
    const timer = window.setInterval(() => void fetchStatus(), 1800);
    return () => { closed = true; clearInterval(timer); };
  }, [view, room?.id]);

  const back = () => {
    if (view === 'landing') onNavigate('modes');
    else if (view === 'login' || view === 'online') changeView('landing');
    else if (view === 'dashboard') changeView('login');
    else if (view === 'create' || view === 'join') changeView('dashboard');
    else if (view === 'preview') changeView('join');
    else changeView('dashboard');
  };

  return (
    <div className="screen-wrapper student-popup-screen">
      <div className="student-popup-overlay">
        <section key={view} className="student-flow-card student-page-transition">
          <div className="student-flow-header"><GraduationCap size={23}/> SKILLENCE ACADEMY <span>STUDENT</span></div>
          {view === 'landing' && <>
            <h2>STUDENT SECTION</h2><p>Choose how you want to enter the academy game.</p>
            <button className="student-flow-button main" onClick={() => changeView('login')}><UserRound/> STUDENT LOGIN</button>
            <button className="student-flow-button" onClick={() => changeView('online')}><Globe/> PLAY ONLINE</button>
          </>}
          {view === 'login' && <>
            <h2>STUDENT LOGIN</h2><p>Enter your full name and student PIN.</p>
            <form onSubmit={login} className="student-flow-form">
              <label>FULL NAME<input autoFocus placeholder="Enter student name" value={name} onChange={e=>setName(e.target.value)} maxLength={40}/></label>
              <label>STUDENT PIN<input type="password" inputMode="numeric" placeholder="Enter your PIN" value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,''))} maxLength={6}/></label>
              <button className="student-flow-button main" type="submit">LOGIN <Check size={18}/></button>
            </form>
          </>}
          {view === 'dashboard' && <>
            <h2>WELCOME, {safeName.toUpperCase()}</h2><p>Select your game mode.</p>
            <button className="student-flow-button main" onClick={() => onPlayBot ? onPlayBot() : onNavigate('modes')}><Swords/> PLAY WITH BOT</button>
            <button className="student-flow-button" onClick={() => {setRoomId(randomId());changeView('create');}}><Plus/> CREATE ROOM</button>
            <button className="student-flow-button" onClick={() => changeView('join')}><Users/> JOIN ROOM</button>
          </>}
          {view === 'online' && <><h2>PLAY ONLINE</h2><p>Open matchmaking is coming soon. Student room play requires a connected backend.</p></>}
          {view === 'create' && <>
            <h2>CREATE ROOM</h2><p>Choose a room name and private password.</p>
            <form onSubmit={createRoom} className="student-flow-form">
              <label>ROOM ID<div className="student-id-line"><strong>{roomId}</strong><button type="button" onClick={()=>navigator.clipboard?.writeText(roomId)} aria-label="Copy room ID"><Copy size={18}/></button></div></label>
              <label>ROOM NAME<input placeholder="Letters only" value={roomName} onChange={e=>setRoomName(e.target.value.replace(/[^A-Za-z ]/g,''))} maxLength={30}/></label>
              <label>ROOM PASSWORD (1–6 DIGITS)<input type="password" inputMode="numeric" placeholder="Set room password" value={roomPin} maxLength={6} onChange={e=>setRoomPin(e.target.value.replace(/\D/g,''))}/></label>
              <button type="submit" disabled={loading} className="student-flow-button main">CREATE ROOM</button>
            </form>
          </>}
          {view === 'join' && <>
            <h2>JOIN ROOM</h2><p>Enter the host's Room ID and password.</p>
            <form className="student-flow-form" onSubmit={findRoom}>
              <label>ROOM ID<input placeholder="SB-123456" value={joinId} onChange={e=>setJoinId(e.target.value.toUpperCase())}/></label>
              <label>ROOM PASSWORD<input type="password" inputMode="numeric" maxLength={6} value={joinPin} onChange={e=>setJoinPin(e.target.value.replace(/\D/g,''))}/></label>
              <button className="student-flow-button main" disabled={loading} type="submit">FIND ROOM</button>
            </form>
          </>}
          {view === 'preview' && room && <>
            <h2>{room.name.toUpperCase()}</h2>
            <div className="student-room-detail"><span>ROOM ID</span><strong>{room.id}</strong><span>CREATED BY</span><strong>{room.host_name}</strong></div>
            <button className="student-flow-button main" onClick={joinRoom} disabled={loading}>ENTER ROOM</button>
          </>}
          {view === 'waiting' && room && <>
            <Loader2 size={35} className="student-spin"/>
            <h2>{room.name.toUpperCase()}</h2>
            <p>ROOM ID: <strong>{room.id}</strong></p>
            <p>CREATED BY: <strong>{room.host_name}</strong></p>
            <div className="student-waiting-banner">{room.status === 'active' ? 'OTHER PLAYER JOINED' : 'WAITING FOR OTHER PLAYER...'}</div>
            <button className="student-flow-button" onClick={() => navigator.clipboard?.writeText(room.id)}><Copy size={18}/> COPY ROOM ID</button>
          </>}
          {message && <p role="status" className="student-flow-error">{message}</p>}
          <button className="student-flow-back" onClick={back}><ArrowLeft size={17}/> BACK</button>
        </section>
      </div>
    </div>
  );
};
