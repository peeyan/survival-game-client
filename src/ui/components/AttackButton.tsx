import React from 'react';
import { GameEventBus, GAME_EVENTS } from '../../logic/GameEventBus';

const AttackButton: React.FC = () => {
  const base: React.CSSProperties = {
    position: 'fixed',
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    border: '3px solid rgba(255,255,255,0.35)',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: '11px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    userSelect: 'none',
    touchAction: 'none',
    zIndex: 10000,
    boxShadow: '0 4px 0 rgba(0,0,0,0.4)',
    gap: '2px',
  };

  return (
    <>
      {/* 攻撃ボタン */}
      <div
        style={{
          ...base,
          bottom: '130px',
          right: '100px',
          backgroundColor: 'rgba(200, 50, 30, 0.7)',
        }}
        onTouchStart={(e) => { e.preventDefault(); GameEventBus.emit(GAME_EVENTS.PLAYER_ATTACK, undefined); }}
        onMouseDown={() => GameEventBus.emit(GAME_EVENTS.PLAYER_ATTACK, undefined)}
      >
        <span style={{ fontSize: '20px' }}>⚔️</span>
        <span>攻撃 [E]</span>
      </div>

      {/* 回避ボタン */}
      <div
        style={{
          ...base,
          bottom: '130px',
          right: '190px',
          backgroundColor: 'rgba(30, 100, 200, 0.7)',
        }}
        onTouchStart={(e) => { e.preventDefault(); GameEventBus.emit(GAME_EVENTS.PLAYER_DODGE, undefined); }}
        onMouseDown={() => GameEventBus.emit(GAME_EVENTS.PLAYER_DODGE, undefined)}
      >
        <span style={{ fontSize: '20px' }}>💨</span>
        <span>回避 [⇧]</span>
      </div>
    </>
  );
};

export default AttackButton;
