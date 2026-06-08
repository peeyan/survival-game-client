import { useEffect, useState } from 'react';
import { GameEventBus, GAME_EVENTS } from '../../logic/GameEventBus';
import { gameState } from '../../logic/GameState';

const SaveLoadUI = () => {
  const [toast, setToast]     = useState(false);
  const [fading, setFading]   = useState(false);
  const [dialog, setDialog]   = useState(false);

  useEffect(() => {
    let fadeTimer: ReturnType<typeof setTimeout>;
    let hideTimer: ReturnType<typeof setTimeout>;

    // GAME_SAVED → トースト表示
    const handleSaved = () => {
      setFading(false);
      setToast(true);
      setDialog(false);
      fadeTimer = setTimeout(() => setFading(true), 2000);
      hideTimer = setTimeout(() => { setToast(false); setFading(false); }, 2500);
    };

    // セーブハウスに近づいた → ダイアログ表示
    const handleSaveHouseInteract = () => {
      setDialog(true);
    };

    GameEventBus.on(GAME_EVENTS.GAME_SAVED, handleSaved);
    GameEventBus.on(GAME_EVENTS.SAVE_HOUSE_INTERACT, handleSaveHouseInteract);

    return () => {
      GameEventBus.off(GAME_EVENTS.GAME_SAVED, handleSaved);
      GameEventBus.off(GAME_EVENTS.SAVE_HOUSE_INTERACT, handleSaveHouseInteract);
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  const handleSave = () => {
    gameState.manualSave();
    setDialog(false);
  };

  return (
    <>
      {/* セーブダイアログ */}
      {dialog && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 20000,
        }}>
          <div style={{
            background: '#1a1a2e', border: '2px solid #6C63FF',
            borderRadius: '16px', padding: '32px 40px',
            color: '#fff', textAlign: 'center', minWidth: '260px',
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🏠</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '6px' }}>
              セーブハウス
            </div>
            <div style={{ fontSize: '13px', color: '#aaa', marginBottom: '24px' }}>
              ゲームを保存しますか？
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={handleSave} style={{
                padding: '10px 24px', background: '#6C63FF',
                border: 'none', borderRadius: '8px',
                color: '#fff', fontWeight: 'bold', fontSize: '15px',
                cursor: 'pointer',
              }}>
                💾 保存する
              </button>
              <button onClick={() => setDialog(false)} style={{
                padding: '10px 24px', background: '#444',
                border: 'none', borderRadius: '8px',
                color: '#fff', fontSize: '15px',
                cursor: 'pointer',
              }}>
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 保存完了トースト */}
      {toast && (
        <div style={{
          position: 'fixed', top: '12px', left: '12px',
          backgroundColor: 'rgba(0,0,0,0.6)',
          color: '#fff', fontSize: '14px',
          padding: '4px 10px', borderRadius: '4px',
          pointerEvents: 'none', userSelect: 'none',
          zIndex: 10000,
          opacity: fading ? 0 : 1,
          transition: fading ? 'opacity 0.5s ease-out' : 'none',
        }}>
          💾 保存しました
        </div>
      )}
    </>
  );
};

export default SaveLoadUI;
