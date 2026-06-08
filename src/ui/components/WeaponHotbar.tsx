import React, { useState, useEffect } from 'react';
import { GameEventBus, GAME_EVENTS, gameState } from '../../logic/index';
import type { WeaponType } from '../../logic/GameState';

const WEAPONS: { type: WeaponType; icon: string; label: string; key: string }[] = [
  { type: 'fist',       icon: '👊', label: '拳',    key: '1' },
  { type: 'stoneKnife', icon: '🔪', label: 'ナイフ', key: '2' },
  { type: 'spear',      icon: '🔱', label: '槍',    key: '3' },
  { type: 'bow',        icon: '🏹', label: '弓',    key: '4' },
];

const WeaponHotbar: React.FC = () => {
  const [active, setActive] = useState<WeaponType>(gameState.activeWeapon);
  const [inv,    setInv]    = useState(gameState.inventory);

  useEffect(() => {
    const onWeapon = (w: WeaponType) => setActive(w);
    const onInv    = (v: typeof gameState.inventory) => setInv({ ...v });
    GameEventBus.on(GAME_EVENTS.WEAPON_CHANGED,    onWeapon);
    GameEventBus.on(GAME_EVENTS.INVENTORY_UPDATED, onInv);
    return () => {
      GameEventBus.off(GAME_EVENTS.WEAPON_CHANGED,    onWeapon);
      GameEventBus.off(GAME_EVENTS.INVENTORY_UPDATED, onInv);
    };
  }, []);

  const hasWeapon = (w: WeaponType): boolean => {
    if (w === 'fist') return true;
    return ((inv as unknown as Record<string, number>)[w] ?? 0) > 0;
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '220px',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      gap: '8px',
      zIndex: 10000,
    }}>
      {WEAPONS.map(({ type, icon, label, key }) => {
        const has = hasWeapon(type);
        const isActive = active === type;
        return (
          <div
            key={type}
            onClick={() => has && gameState.setWeapon(type)}
            style={{
              width: '56px', height: '56px',
              backgroundColor: isActive ? 'rgba(255,204,68,0.35)' : 'rgba(0,0,0,0.55)',
              border: `2px solid ${isActive ? '#ffcc44' : 'rgba(255,255,255,0.2)'}`,
              borderRadius: '10px',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              cursor: has ? 'pointer' : 'default',
              opacity: has ? 1 : 0.35,
              userSelect: 'none',
              transition: 'all 0.15s',
            }}
          >
            <span style={{ fontSize: '22px' }}>{icon}</span>
            <span style={{ fontSize: '9px', color: '#aaa' }}>{label} [{key}]</span>
            {type === 'bow' && inv.arrow > 0 && (
              <span style={{ fontSize: '9px', color: '#ffcc44', marginTop: '-2px' }}>×{inv.arrow}</span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default WeaponHotbar;
