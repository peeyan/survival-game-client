import React, { useState, useEffect } from 'react';
import { GameEventBus, GAME_EVENTS, gameState } from '../../logic/index';
import type { Skills, SkillName } from '../../logic/GameState';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const SKILL_INFO: Record<SkillName, { icon: string; label: string; effects: string[] }> = {
  hunter:   { icon: '🏹', label: '狩人',   effects: ['肉ドロップ+1',      '動物感知-20%',      '狩猟XP+50%'] },
  gatherer: { icon: '🪵', label: '採集家', effects: ['木・石採集+1',      'ベリー・草採集×2',  '採集XP+50%'] },
  cook:     { icon: '🍳', label: '料理人', effects: ['料理回復+15',       '食中毒免疫',        '料理XP+50%'] },
  medic:    { icon: '💊', label: '医療家', effects: ['包帯でHP+10',       '感染進行50%遅延',   'HP自然回復'] },
  builder:  { icon: '🏗️', label: '建設家', effects: ['シェルター木材-1', '焚き火範囲×1.5',   'クラフトXP+50%'] },
  explorer: { icon: '🧭', label: '探索家', effects: ['ルート品質UP',      '移動速度+15%',      '探索XP+50%'] },
};

const SkillTreePanel: React.FC<Props> = ({ visible, onClose }) => {
  const [xp,          setXP]          = useState(gameState.xp);
  const [level,       setLevel]       = useState(gameState.level);
  const [needed,      setNeeded]      = useState(gameState.xpToNextLevel());
  const [skillPts,    setSkillPts]    = useState(gameState.skillPoints);
  const [skills,      setSkills]      = useState<Skills>({ ...gameState.skills });

  useEffect(() => {
    const onXP   = (d: { xp: number; level: number; needed: number }) => {
      setXP(d.xp); setLevel(d.level); setNeeded(d.needed);
    };
    const onLv   = (lv: number) => { setLevel(lv); setSkillPts(gameState.skillPoints); };
    const onSkill = (s: Skills) => { setSkills({ ...s }); setSkillPts(gameState.skillPoints); };

    GameEventBus.on(GAME_EVENTS.XP_GAINED,     onXP);
    GameEventBus.on(GAME_EVENTS.LEVEL_UP,      onLv);
    GameEventBus.on(GAME_EVENTS.SKILL_UPDATED, onSkill);
    return () => {
      GameEventBus.off(GAME_EVENTS.XP_GAINED,     onXP);
      GameEventBus.off(GAME_EVENTS.LEVEL_UP,      onLv);
      GameEventBus.off(GAME_EVENTS.SKILL_UPDATED, onSkill);
    };
  }, []);

  if (!visible) return null;

  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 99990,
  };

  const panel: React.CSSProperties = {
    background: '#1a1a2e',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '16px',
    padding: '24px',
    width: '480px',
    maxWidth: '95vw',
    color: '#fff',
  };

  const xpPct = Math.min(100, (xp / needed) * 100);

  return (
    <div style={overlay} onClick={onClose}>
      <div style={panel} onClick={e => e.stopPropagation()}>
        {/* ヘッダー */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <span style={{ fontSize: '20px', fontWeight: 'bold' }}>⚔️ スキルツリー</span>
            <span style={{ marginLeft: '12px', fontSize: '14px', color: '#aaa' }}>
              Lv {level}　{skillPts > 0 && <span style={{ color: '#ffcc44' }}>SP {skillPts} 残</span>}
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>

        {/* XPバー */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '4px' }}>
            XP: {xp} / {needed}
          </div>
          <div style={{ background: '#333', borderRadius: '4px', height: '8px' }}>
            <div style={{ background: '#4CAF50', height: '8px', borderRadius: '4px', width: `${xpPct}%`, transition: 'width 0.3s' }} />
          </div>
        </div>

        {/* スキルグリッド */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {(Object.keys(SKILL_INFO) as SkillName[]).map(name => {
            const info  = SKILL_INFO[name];
            const level = skills[name];
            return (
              <div key={name} style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px', padding: '12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '20px' }}>{info.icon}</span>
                  <span style={{ fontWeight: 'bold' }}>{info.label}</span>
                  <span style={{ marginLeft: 'auto', color: '#ffcc44', fontSize: '12px' }}>
                    {'★'.repeat(level)}{'☆'.repeat(3 - level)}
                  </span>
                </div>
                <div style={{ fontSize: '11px', lineHeight: '1.8' }}>
                  {info.effects.map((eff, i) => (
                    <div key={i} style={{ color: i < level ? '#88ff88' : '#666', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>{i < level ? '✅' : '○'}</span>
                      <span>Lv{i + 1}: {eff}</span>
                    </div>
                  ))}
                </div>
                {level < 3 && skillPts > 0 && (
                  <button
                    onClick={() => { gameState.unlockSkill(name); setSkills({ ...gameState.skills }); setSkillPts(gameState.skillPoints); }}
                    style={{
                      marginTop: '8px', width: '100%',
                      padding: '5px', background: '#4a4a00',
                      border: '1px solid #ffcc44', borderRadius: '6px',
                      color: '#ffcc44', fontSize: '11px', cursor: 'pointer',
                    }}
                  >
                    Lv{level + 1} 解放 (SP×1)
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* 定住進行 */}
        <div style={{ marginTop: '16px', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', fontSize: '12px' }}>
          <div style={{ color: '#aaa', marginBottom: '4px' }}>🏡 定住END 進行状況</div>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <span style={{ color: gameState.daysAlive >= 30 ? '#88ff88' : '#888' }}>📅 30日生存 ({gameState.daysAlive}/30)</span>
            <span style={{ color: gameState.farmsHarvested >= 3 ? '#88ff88' : '#888' }}>🌾 農場収穫 ({gameState.farmsHarvested}/3)</span>
            <span style={{ color: gameState.saveHouseCount >= 1 ? '#88ff88' : '#888' }}>🏠 シェルター {gameState.saveHouseCount >= 1 ? '✓' : '未'}</span>
            <span style={{ color: (gameState.generatorRepaired || gameState.waterPumpActive) ? '#88ff88' : '#888' }}>
              💧 水源 {(gameState.generatorRepaired || gameState.waterPumpActive) ? '✓' : '未'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkillTreePanel;
