import { useState, useEffect } from 'react';
import { PhaserGame } from './game/PhaserGame';
import {
  VirtualJoystick, ActionButton, CraftMenu, GameOverScreen,
  SaveLoadUI, TitleScreen, PauseScreen, StatusHUD, AttackButton,
  SkillTreePanel, WeaponHotbar, EquipmentPanel, RoomPanel,
} from './ui/components/index';
import { multiplayerManager } from './game/systems/MultiplayerManager';
import { GameEventBus, GAME_EVENTS, gameState } from './logic/index';

function App() {
  const [gameStarted, setGameStarted] = useState(false);
  const [showTitle, setShowTitle]     = useState(true);
  const [winEnd,       setWinEnd]       = useState<string | null>(null);
  const [winDays,      setWinDays]      = useState(0);
  const [showSkillTree,  setShowSkillTree]  = useState(false);
  const [showEquipment,  setShowEquipment]  = useState(false);
  const [showRoomPanel,  setShowRoomPanel]  = useState(false);
  const [pendingSeed,    setPendingSeed]    = useState<number | null>(null);

  useEffect(() => {
    const handleWin = (endType: string) => {
      setWinEnd(endType);
      setWinDays(gameState.daysAlive);
    };
    GameEventBus.on(GAME_EVENTS.GAME_WIN, handleWin);
    return () => { GameEventBus.off(GAME_EVENTS.GAME_WIN, handleWin); };
  }, []);

  const END_LABELS: Record<string, string> = {
    raft: 'いかだで脱出',
    sos:  'SOS無線で救助',
    boat: '船を修理して出航',
    heli: 'ヘリを飛ばして脱出',
    settle: '島に定住することを選んだ',
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <PhaserGame />

      {gameStarted && (
        <>
          <StatusHUD />
          <VirtualJoystick />
          <ActionButton />
          <CraftMenu />
          <AttackButton />
          <SkillTreePanel  visible={showSkillTree}  onClose={() => setShowSkillTree(false)} />
          <EquipmentPanel  visible={showEquipment}  onClose={() => setShowEquipment(false)} />
          <WeaponHotbar />
          {/* スキルツリーボタン */}
          <button onClick={() => setShowSkillTree(v => !v)} style={{
            position: 'fixed', top: '12px', right: '64px', zIndex: 9999,
            background: 'rgba(0,0,0,0.45)', border: '1.5px solid rgba(255,204,68,0.5)',
            borderRadius: '50%', width: '44px', height: '44px',
            color: '#ffcc44', fontSize: '20px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>⚔️</button>
          {/* 装備パネルボタン */}
          <button onClick={() => setShowEquipment(v => !v)} style={{
            position: 'fixed', top: '12px', right: '116px', zIndex: 9999,
            background: 'rgba(0,0,0,0.45)', border: '1.5px solid rgba(100,200,255,0.5)',
            borderRadius: '50%', width: '44px', height: '44px',
            color: '#88ccff', fontSize: '20px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>🛡️</button>
          <GameOverScreen onShowTitle={() => setShowTitle(true)} />
          <SaveLoadUI />
          <PauseScreen />
          <button
            onClick={() => GameEventBus.emit(GAME_EVENTS.GAME_PAUSED)}
            style={{
              position: 'fixed', top: '12px', right: '12px', zIndex: 9999,
              background: 'rgba(0,0,0,0.45)', border: '1.5px solid rgba(255,255,255,0.3)',
              borderRadius: '50%', width: '44px', height: '44px',
              color: '#ffffff', fontSize: '20px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ⏸
          </button>
        </>
      )}

      {showTitle && (
        <TitleScreen onStart={() => { setGameStarted(true); setShowTitle(false); }} />
      )}

      {/* ゲームクリア画面 */}
      {winEnd && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.88)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', zIndex: 99999,
        }}>
          <div style={{
            background: '#fff', borderRadius: '24px', padding: '48px 56px',
            textAlign: 'center', maxWidth: '440px', width: '90vw',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1a6b3a', marginBottom: '16px' }}>
              脱出成功！
            </div>
            <div style={{ fontSize: '18px', color: '#555', marginBottom: '8px' }}>
              {END_LABELS[winEnd] ?? winEnd}
            </div>
            <div style={{ fontSize: '16px', color: '#888', marginBottom: '32px' }}>
              生存日数：<strong>{winDays}日</strong>
            </div>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '14px 40px', backgroundColor: '#1a6b3a', border: 'none',
                borderRadius: '28px', color: '#fff', fontSize: '18px',
                fontWeight: 'bold', cursor: 'pointer',
              }}
            >
              もう一度プレイ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
