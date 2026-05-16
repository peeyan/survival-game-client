import React, { useState, useEffect } from 'react';
import { GameEventBus, GAME_EVENTS, gameState } from '../../logic/index';

const InventoryUI: React.FC = () => {
  // 初期値はGameStateから直接取得
  const [inv, setInv] = useState(gameState.inventory);

  useEffect(() => {
    // EventBus経由でインベントリ更新の通知を受け取ったら、ReactのStateを更新して再描画
    const handleUpdate = (newInventory: typeof gameState.inventory) => {
      setInv({ ...newInventory }); // 参照を新しくして再レンダリングをトリガー
    };

    GameEventBus.on(GAME_EVENTS.INVENTORY_UPDATED, handleUpdate);

    return () => {
      GameEventBus.off(GAME_EVENTS.INVENTORY_UPDATED, handleUpdate);
    };
  }, []);

  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    top: '20px',
    right: '20px', // 右上に配置
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    border: '2px solid #8B4513',
    borderRadius: '8px',
    padding: '10px 20px',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    zIndex: 10,
    userSelect: 'none',
    pointerEvents: 'none', // UIの下の画面もタッチできるようにする
  };

  return (
    <div style={containerStyle}>
      <div>🪵 木材: {inv.wood}</div>
      <div>🪨 石材: {inv.stone}</div>
    </div>
  );
};

export default InventoryUI;