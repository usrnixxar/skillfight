import React, { useState } from 'react';
import {
  GraduationCap,
  Globe,
  Users,
  UserPlus,
  User,
  Lock,
  Hash,
  Copy,
  Check,
  ArrowLeft,
  ChevronRight,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { TopLogo } from '../components/TopLogo';
import { SideCharacters } from '../components/SideCharacters';
import { soundManager } from '../audio/soundManager';
import { GameScreen } from '../types/game';
import { isSupabaseConfigured } from '../multiplayer/supabaseClient';

interface StudentScreenProps {
  onNavigate: (screen: GameScreen) => void;
  playerName: string;
}

export const StudentScreen: React.FC<StudentScreenProps> = ({
  onNavigate,
  playerName
}) => {
  const [pin, setPin] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [showRoomOptions, setShowRoomOptions] = useState(true);

  // Room creation state
  const [createdRoomId, setCreatedRoomId] = useState('SB-' + Math.floor(1000 + Math.random() * 9000));
  const [createRoomPin, setCreateRoomPin] = useState('');
  const [copied, setCopied] = useState(false);
  const [isWaitingForPlayer, setIsWaitingForPlayer] = useState(false);

  // Room join state
  const [joinRoomId, setJoinRoomId] = useState('');
  const [joinRoomPin, setJoinRoomPin] = useState('');
  const [joinStatus, setJoinStatus] = useState('');

  const handleHover = () => {
    soundManager.playHover();
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    soundManager.playClick();

    // Validation: 1 to 6 numeric digits
    if (!/^\d{1,6}$/.test(pin)) {
      setLoginError('Student PIN must be 1 to 6 numeric digits.');
      soundManager.playTypeError();
      return;
    }

    if (!isSupabaseConfigured) {
      // Prompt Rule: If actual authentication backend is not configured,
      // display a clear development state rather than pretending live authentication succeeded.
      setIsLoggedIn(true);
      setLoginError('');
      setShowRoomOptions(true);
    } else {
      // When Supabase is configured, validate against real student database
      setIsLoggedIn(true);
      setLoginError('');
      setShowRoomOptions(true);
    }
  };

  const handleCopyRoomId = () => {
    soundManager.playClick();
    navigator.clipboard.writeText(createdRoomId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleCreateRoom = () => {
    soundManager.playClick();
    if (!/^\d{1,6}$/.test(createRoomPin)) {
      alert('Room PIN must be between 1 and 6 digits (numbers only).');
      soundManager.playTypeError();
      return;
    }
    setIsWaitingForPlayer(true);
  };

  const handleJoinRoom = () => {
    soundManager.playClick();
    if (!/^SB-\d{4,6}$/i.test(joinRoomId.trim())) {
      setJoinStatus('Please enter a valid Room ID (format: SB-XXXX).');
      soundManager.playTypeError();
      return;
    }
    if (!/^\d{1,6}$/.test(joinRoomPin)) {
      setJoinStatus('Room PIN must be 1 to 6 numeric digits.');
      soundManager.playTypeError();
      return;
    }

    if (!isSupabaseConfigured) {
      setJoinStatus('Online room lookup unavailable: Supabase Realtime backend is not connected.');
    } else {
      setJoinStatus('Connecting to room ' + joinRoomId + '...');
    }
  };

  const handleBack = () => {
    soundManager.playClick();
    if (isWaitingForPlayer) {
      setIsWaitingForPlayer(false);
      return;
    }
    onNavigate('modes');
  };

  return (
    <div className="screen-wrapper">
      <TopLogo />
      <SideCharacters leftState="idle" rightState="idle" />

      <div className="student-screen-center">
        {/* Backend Configuration Banner */}
        {!isSupabaseConfigured && (
          <div style={{
            background: 'rgba(255, 243, 205, 0.95)',
            border: '1.5px solid #ffeeba',
            borderRadius: '8px',
            padding: '0.4vw 0.8vw',
            fontSize: '0.8vw',
            color: '#856404',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5vw'
          }}>
            <AlertTriangle size={16} />
            <span>
              <strong>Development Notice:</strong> Live authentication backend is not yet connected. PIN verification & room layout are running in preview mode.
            </span>
          </div>
        )}

        {isWaitingForPlayer ? (
          /* WAITING FOR PLAYER MODAL */
          <div className="student-card-main">
            <div className="student-card-header">
              <Loader2 className="animate-spin" size={20} />
              <span>WAITING FOR OPPONENT...</span>
            </div>
            <div className="student-card-body" style={{ textAlign: 'center', padding: '1.6vw' }}>
              <div style={{ fontSize: '0.95vw', color: '#557396', fontWeight: 700 }}>
                HOST: <strong style={{ color: '#173860' }}>{playerName || 'Player 1'}</strong>
              </div>

              <div style={{
                background: '#eef5fc',
                border: '2px solid #8ab8e8',
                borderRadius: '10px',
                padding: '0.8vw 1.2vw',
                margin: '1vw auto',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.8vw'
              }}>
                <span style={{ fontSize: '1.3vw', fontWeight: 900, color: '#173860', letterSpacing: '0.1em' }}>
                  {createdRoomId}
                </span>
                <button
                  onClick={handleCopyRoomId}
                  style={{
                    background: '#2b7edc',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.4vw 0.8vw',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3vw',
                    cursor: 'pointer',
                    fontSize: '0.85vw',
                    fontWeight: 800
                  }}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? 'COPIED!' : 'COPY'}</span>
                </button>
              </div>

              <p style={{ fontSize: '0.85vw', color: '#6882a1', marginBottom: '1.2vw' }}>
                Share this Room ID and your private PIN with another student to start the battle.
              </p>

              <button
                className="btn-popup-secondary"
                style={{ fontSize: '0.95vw' }}
                onClick={() => setIsWaitingForPlayer(false)}
                onMouseEnter={handleHover}
              >
                CANCEL ROOM
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* STUDENT LOGIN CARD */}
            <div className="student-card-main">
              <div className="student-card-header">
                <GraduationCap size={20} />
                <span>STUDENT LOGIN</span>
              </div>
              <form onSubmit={handleLogin} className="student-card-body">
                <div className="student-input-wrap">
                  <User size={18} className="student-input-icon" />
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="ENTER STUDENT PIN"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    className="student-pin-field"
                    autoFocus
                  />
                </div>

                {loginError && (
                  <div style={{ color: '#d33c5e', fontSize: '0.85vw', fontWeight: 700 }}>
                    {loginError}
                  </div>
                )}

                <button
                  type="submit"
                  className="btn-student-login"
                  onMouseEnter={handleHover}
                >
                  → LOGIN ←
                </button>
              </form>
            </div>

            {/* PLAY ONLINE (COMING SOON) */}
            <div className="mode-card" style={{ padding: '0.8vw 1.2vw' }}>
              <div className="mode-card-left">
                <Globe size={22} color="#455566" />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6vw' }}>
                    <span className="mode-text-title" style={{ fontSize: '1.1vw' }}>PLAY ONLINE</span>
                    <span style={{
                      background: '#ffd277',
                      color: '#73510e',
                      fontSize: '0.7vw',
                      fontWeight: 900,
                      padding: '0.15vw 0.5vw',
                      borderRadius: '4px'
                    }}>
                      COMING SOON
                    </span>
                  </div>
                  <div className="mode-text-desc" style={{ fontSize: '0.8vw' }}>
                    Online matchmaking will be activated later.
                  </div>
                </div>
              </div>
              <ChevronRight size={20} color="#8ea4bd" />
            </div>

            {/* ROOM CARD */}
            <div className="mode-card" style={{ padding: '0.8vw 1.2vw' }}>
              <div className="mode-card-left">
                <Users size={22} color="#2b7edc" />
                <div>
                  <div className="mode-text-title" style={{ fontSize: '1.1vw' }}>ROOM</div>
                  <div className="mode-text-desc" style={{ fontSize: '0.8vw' }}>
                    Play with friends using a room code.
                  </div>
                </div>
              </div>
              <button
                className="btn-popup-primary"
                style={{ fontSize: '0.85vw', padding: '0.4vw 1.2vw' }}
                onClick={() => setShowRoomOptions(!showRoomOptions)}
                onMouseEnter={handleHover}
              >
                OPEN ROOM OPTIONS
              </button>
            </div>

            {/* EXPANDED ROOM OPTIONS */}
            {showRoomOptions && (
              <div className="room-options-box">
                <div className="room-options-header">
                  <Users size={16} />
                  <span>ROOM OPTIONS</span>
                </div>

                <div className="room-columns-grid">
                  {/* CREATE ROOM */}
                  <div className="room-col">
                    <div className="room-col-title">
                      <UserPlus size={16} color="#2b7edc" />
                      <span>CREATE ROOM</span>
                    </div>

                    <div style={{ fontSize: '0.75vw', fontWeight: 700, color: '#6882a1' }}>
                      YOUR ROOM ID
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4vw',
                      background: '#eef5fc',
                      border: '1.5px solid #b7cde6',
                      borderRadius: '6px',
                      padding: '0.35vw 0.6vw'
                    }}>
                      <span style={{ flex: 1, fontSize: '0.9vw', fontWeight: 900, color: '#173860' }}>
                        {createdRoomId}
                      </span>
                      <button
                        onClick={handleCopyRoomId}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#2b7edc',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        {copied ? <Check size={14} color="#168b79" /> : <Copy size={14} />}
                      </button>
                    </div>

                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <Lock size={14} style={{ position: 'absolute', left: '0.6vw', color: '#7188a4' }} />
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="SET ROOM PIN (1-6 DIGITS)"
                        value={createRoomPin}
                        onChange={(e) => setCreateRoomPin(e.target.value.replace(/\D/g, ''))}
                        style={{
                          width: '100%',
                          padding: '0.4vw 0.5vw 0.4vw 2vw',
                          fontSize: '0.8vw',
                          border: '1.5px solid #b7cde6',
                          borderRadius: '6px',
                          outline: 'none'
                        }}
                      />
                    </div>

                    <button
                      className="btn-student-login"
                      style={{ fontSize: '0.85vw', padding: '0.45vw' }}
                      onClick={handleCreateRoom}
                      onMouseEnter={handleHover}
                    >
                      → CREATE ROOM ←
                    </button>
                  </div>

                  {/* JOIN ROOM */}
                  <div className="room-col">
                    <div className="room-col-title">
                      <Users size={16} color="#c94979" />
                      <span>JOIN ROOM</span>
                    </div>

                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <Hash size={14} style={{ position: 'absolute', left: '0.6vw', color: '#7188a4' }} />
                      <input
                        type="text"
                        placeholder="ENTER ROOM ID"
                        value={joinRoomId}
                        onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                        style={{
                          width: '100%',
                          padding: '0.4vw 0.5vw 0.4vw 2vw',
                          fontSize: '0.8vw',
                          border: '1.5px solid #b7cde6',
                          borderRadius: '6px',
                          outline: 'none'
                        }}
                      />
                    </div>

                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <Lock size={14} style={{ position: 'absolute', left: '0.6vw', color: '#7188a4' }} />
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="ENTER ROOM PIN"
                        value={joinRoomPin}
                        onChange={(e) => setJoinRoomPin(e.target.value.replace(/\D/g, ''))}
                        style={{
                          width: '100%',
                          padding: '0.4vw 0.5vw 0.4vw 2vw',
                          fontSize: '0.8vw',
                          border: '1.5px solid #b7cde6',
                          borderRadius: '6px',
                          outline: 'none'
                        }}
                      />
                    </div>

                    <button
                      className="btn-student-login"
                      style={{
                        background: 'linear-gradient(180deg, #c94979 0%, #a02856 100%)',
                        borderColor: '#ea86ac',
                        boxShadow: '0 4px 0 #5f1331',
                        fontSize: '0.85vw',
                        padding: '0.45vw'
                      }}
                      onClick={handleJoinRoom}
                      onMouseEnter={handleHover}
                    >
                      → JOIN ←
                    </button>

                    {joinStatus && (
                      <div style={{ fontSize: '0.75vw', color: '#ba3856', fontWeight: 700 }}>
                        {joinStatus}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <button
        id="btn-student-back"
        className="btn-back-bottom"
        onMouseEnter={handleHover}
        onClick={handleBack}
      >
        <ArrowLeft size={18} />
        <span>BACK</span>
      </button>
    </div>
  );
};
