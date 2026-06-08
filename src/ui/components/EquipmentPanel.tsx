import React, { useState, useEffect } from 'react';
import { GameEventBus, GAME_EVENTS, gameState } from '../../logic/index';
import type { ToolConditions, ToolName } from '../../logic/GameState';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const TOOL_INFO: { key: ToolName; icon: string; label: string; repairCost: string }[] = [
  { key: 'stoneAxe',   icon: '🪓', label: '石斧',    repairCost: '石×1' },
  { key: 'stoneKnife', icon: '🔪', label: '石ナイフ', repairCost: '石×1' },
  { key: 'fishingRod', icon: '🎣', label: '釣り竿',  repairCost: '蔓×1' },
  { key: 'spear',      icon: '🔱', label: '槍',      repairCost: '石×1+木×1' },
  { key: 'bow',        icon: '🏹', label: '弓',      repairCost: '蔓×2' },
];

const conditionColor = (c: number) =>
  c >= 75 ? '#44cc44' : c >= 50 ? '#ffcc00' : c >= 25 ? '#ff8800' : '#ff3333';

const conditionLabel = (c: number) =>
  c >= 75 ? '良好' : c >= 50 ? '劣化' : c >= 25 ? '損傷' : '破滅寸前';

const EquipmentPanel: React.FC<Props> = ({ visible, onClose }) => {
  const [conds, setConds]  = useState<ToolConditions>({ ...gameState.toolConditions });
  const [inv,   setInv]    = useState(gameState.inventory);
  const [wb,    setWB]     = useState(gameState.workbenchNearby);
  const [shelterHP, setShelterHP] = useState(gameState.shelterHP);

  useEffect(() => {
    const onCond    = (c: ToolConditions) => setConds({ ...c });
    const onInv     = (v: typeof gameState.inventory) => setInv({ ...v });
    const onRepair  = () => { setConds({ ...gameState.toolConditions }); setWB(gameState.workbenchNearby); };
    const onShelter = (hp: number) => setShelterHP(hp);
    GameEventBus.on(GAME_EVENTS.TOOL_CONDITION_CHANGED, onCond);
    GameEventBus.on(GAME_EVENTS.INVENTORY_UPDATED,      onInv);
    GameEventBus.on(GAME_EVENTS.SHELTER_DAMAGED,        onShelter);
    GameEventBus.on(GAME_EVENTS.SHELTER_REPAIRED,       onRepair);
    return () => {
      GameEventBus.off(GAME_EVENTS.TOOL_CONDITION_CHANGED, onCond);
      GameEventBus.off(GAME_EVENTS.INVENTORY_UPDATED,      onInv);
      GameEventBus.off(GAME_EVENTS.SHELTER_DAMAGED,        onShelter);
      GameEventBus.off(GAME_EVENTS.SHELTER_REPAIRED,       onRepair);
    };
  }, []);

  if (!visible) return null;

  const hasTool = (key: ToolName) => ((inv as unknown as Record<string, number>)[key] ?? 0) > 0;

  return (
    <div style={{
      position: 'fixed', inset: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 99989,
    }} onClick={onClose}>
      <div style={{
        background: '#111122', border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: '16px', padding: '24px',
        width: '420px', maxWidth: '95vw', color: '#fff',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
          <span style={{ fontSize: '18px', fontWeight: 'bold' }}>🛡️ 装備・道具状態</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>

        {/* シェルター耐久度 */}
        <div style={{ marginBottom: '16px', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px' }}>
            <span>🏠 シェルター耐久度</span>
            <span style={{ color: conditionColor(shelterHP) }}>{shelterHP}%</span>
          </div>
          <div style={{ background: '#333', borderRadius: '4px', height: '8px' }}>
            <div style={{ background: conditionColor(shelterHP), height: '8px', borderRadius: '4px', width: `${shelterHP}%`, transition: 'width 0.3s' }} />
          </div>
          <div style={{ fontSize: '11px', color: '#aaa', marginTop: '4px' }}>
            嵐で-10。近くでアクション（木×2+石×1）で修理
          </div>
        </div>

        {/* 道具リスト */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {TOOL_INFO.map(({ key, icon, label, repairCost }) => {
            const has  = hasTool(key);
            const cond = conds[key] ?? 100;
            return (
              <div key={key} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '8px 12px',
                background: has ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                borderRadius: '8px', opacity: has ? 1 : 0.4,
              }}>
                <span style={{ fontSize: '20px', width: '28px', textAlign: 'center' }}>{icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '3px' }}>
                    <span>{label}</span>
                    <span style={{ color: conditionColor(cond) }}>{Math.floor(cond)}% {conditionLabel(cond)}</span>
                  </div>
                  <div style={{ background: '#333', borderRadius: '3px', height: '6px' }}>
                    <div style={{ background: conditionColor(cond), height: '6px', borderRadius: '3px', width: `${cond}%`, transition: 'width 0.3s' }} />
                  </div>
                </div>
                {has && cond < 100 && (
                  <button
                    onClick={() => { gameState.repairTool(key); setConds({ ...gameState.toolConditions }); }}
                    style={{
                      padding: '4px 8px', fontSize: '11px',
                      background: wb ? '#2a4a2a' : '#333',
                      border: `1px solid ${wb ? '#44aa44' : '#555'}`,
                      borderRadius: '6px', color: wb ? '#88ff88' : '#666',
                      cursor: wb ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap',
                    }}
                    title={wb ? `修理 (${repairCost})` : '作業台が必要'}
                  >
                    🔧 {repairCost}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {!wb && (
          <div style={{ marginTop: '12px', fontSize: '11px', color: '#ff8844', textAlign: 'center' }}>
            ⚠️ 作業台（木×5+石×4）に近づくと修理可能
          </div>
        )}
      </div>
    </div>
  );
};

export default EquipmentPanel;
