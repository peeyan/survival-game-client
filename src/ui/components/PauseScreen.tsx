import React, { useState, useEffect } from 'react';
import { GameEventBus, GAME_EVENTS, SaveSystem, gameState } from '../../logic/index';

const PauseScreen: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onPause  = () => setVisible(true);
    const onResume = () => setVisible(false);
    GameEventBus.on(GAME_EVENTS.GAME_PAUSED,  onPause);
    GameEventBus.on(GAME_EVENTS.GAME_RESUMED, onResume);
    return () => {
      GameEventBus.off(GAME_EVENTS.GAME_PAUSED,  onPause);
      GameEventBus.off(GAME_EVENTS.GAME_RESUMED, onResume);
    };
  }, []);

  if (!visible) return null;

  const handleResume = () => GameEventBus.emit(GAME_EVENTS.GAME_RESUMED);

  const handleSaveAndResume = () => {
    SaveSystem.save(gameState);
    GameEventBus.emit(GAME_EVENTS.GAME_SAVED);
    GameEventBus.emit(GAME_EVENTS.GAME_RESUMED);
  };

  const handleTitle = () => {
    window.location.reload();
  };

  const overlay: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(10, 30, 10, 0.82)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99998,
    backdropFilter: 'blur(3px)',
    userSelect: 'none',
  };

  const card: React.CSSProperties = {
    background: 'linear-gradient(160deg, #1e3d1e 0%, #2d5a2d 100%)',
    border: '2px solid rgba(255,255,255,0.12)',
    borderRadius: '24px',
    padding: '48px 56px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxShadow: '0 8px 48px rgba(0,0,0,0.7)',
    minWidth: '300px',
    maxWidth: '420px',
    width: '85vw',
  };

  const titleStyle: React.CSSProperties = {
    color: '#f5e6a3',
    fontSize: '36px',
    fontWeight: 'bold',
    letterSpacing: '6px',
    marginBottom: '8px',
    fontFamily: 'serif',
    textShadow: '0 2px 8px rgba(0,0,0,0.6)',
  };

  const subtitleStyle: React.CSSProperties = {
    color: '#8fbc8f',
    fontSize: '14px',
    letterSpacing: '3px',
    marginBottom: '40px',
    fontFamily: 'serif',
  };

  const btn = (bg: string, shadow: string): React.CSSProperties => ({
    padding: '14px 44px',
    backgroundColor: bg,
    border: 'none',
    borderRadius: '28px',
    color: '#ffffff',
    fontSize: '18px',
    fontFamily: 'serif',
    fontWeight: 'bold',
    letterSpacing: '2px',
    cursor: 'pointer',
    boxShadow: `0 4px 14px ${shadow}`,
    transition: 'opacity 0.15s ease, transform 0.1s ease',
    marginBottom: '14px',
    width: '220px',
  });

  return (
    <div style={overlay} onClick={handleResume}>
      <div style={card} onClick={e => e.stopPropagation()}>
        <div style={titleStyle}>⏸ 一時停止</div>
        <div style={subtitleStyle}>PAUSED</div>

        <button
          style={btn('#FF6B35', 'rgba(255,107,53,0.45)')}
          onClick={handleResume}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'; (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.04)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1';    (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
        >
          ゲームに戻る
        </button>

        <button
          style={btn('#4a90d9', 'rgba(74,144,217,0.45)')}
          onClick={handleSaveAndResume}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'; (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.04)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1';    (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
        >
          セーブして戻る
        </button>

        <button
          style={{ ...btn('#888', 'rgba(0,0,0,0.3)'), marginBottom: 0 }}
          onClick={handleTitle}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'; (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.04)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1';    (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
        >
          タイトルへ
        </button>
      </div>
    </div>
  );
};

export default PauseScreen;
