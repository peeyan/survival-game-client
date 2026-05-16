import React, { useState, useEffect } from 'react';
import { GameEventBus, GAME_EVENTS } from '../../logic/GameEventBus';
import { gameState } from '../../logic/GameState';

const CraftMenu: React.FC = () => {
  const [inv, setInv] = useState(gameState.inventory);

  useEffect(() => {
    const handleUpdate = (newInventory: typeof gameState.inventory) => {
      setInv({ ...newInventory });
    };
    GameEventBus.on(GAME_EVENTS.INVENTORY_UPDATED, handleUpdate);
    return () => { GameEventBus.off(GAME_EVENTS.INVENTORY_UPDATED, handleUpdate); };
  }, []);

  // 焚き火のクラフト条件（木3、石3）を満たしているか
  const canCraft = inv.wood >= 3 && inv.stone >= 3;

  const handleCraft = () => {
    if (canCraft) {
      GameEventBus.emit(GAME_EVENTS.CRAFT_REQUEST);
    }
  };

  const panelStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '140px', // アクションボタンの上あたり
    right: '40px',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    border: '2px solid #555',
    borderRadius: '8px',
    padding: '10px',
    color: '#fff',
    width: '120px',
    zIndex: 10,
    textAlign: 'center',
  };

  const buttonStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 0',
    backgroundColor: canCraft ? '#FF4500' : '#444', // 素材不足時はグレーアウト
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontWeight: 'bold',
    cursor: canCraft ? 'pointer' : 'not-allowed',
    boxShadow: canCraft ? '0 3px 0 #8B0000' : 'none',
  };

  return (
    <div style={panelStyle}>
      <div style={{ fontSize: '12px', marginBottom: '5px' }}>クラフト</div>
      <button style={buttonStyle} onClick={handleCraft} disabled={!canCraft}>
        🔥 焚き火
      </button>
      <div style={{ fontSize: '10px', color: '#aaa', marginTop: '5px' }}>
        (🪵x3, 🪨x3)
      </div>
    </div>
  );
};

export default CraftMenu;