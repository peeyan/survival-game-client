import React, { useState, useEffect } from 'react';
import { GameEventBus, GAME_EVENTS, gameState } from '../../logic/index';

const InventoryUI: React.FC = () => {
  // 初期値はGameStateから直接取得
  const [inv, setInv] = useState(gameState.inventory);
  const [hunger, setHunger] = useState(gameState.hunger); // ★ 追加

  useEffect(() => {
    // EventBus経由でインベントリ更新の通知を受け取ったら、ReactのStateを更新して再描画
    const handleInvUpdate = (newInventory: typeof gameState.inventory) => {
      setInv({ ...newInventory }); // 参照を新しくして再レンダリングをトリガー
    };

    // ★ 追加：空腹度の更新を受け取る
    const handleHungerUpdate = (newHunger: number) => {
      setHunger(newHunger);
    };

    GameEventBus.on(GAME_EVENTS.INVENTORY_UPDATED, handleInvUpdate);
    GameEventBus.on(GAME_EVENTS.HUNGER_UPDATED, handleHungerUpdate);

    return () => {
      GameEventBus.off(GAME_EVENTS.INVENTORY_UPDATED, handleInvUpdate);
      GameEventBus.off(GAME_EVENTS.HUNGER_UPDATED, handleHungerUpdate);
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
    flexDirection: 'column', // ★ 要素が増えたので縦並びに変更
    gap: '10px',
    zIndex: 10,
    userSelect: 'none',
    pointerEvents: 'none', // UIの下の画面もタッチできるようにする
  };

  const itemRowStyle: React.CSSProperties = {
    display: 'flex',
    gap: '15px'
  };

  return (
    <div style={containerStyle}>
      <div style={itemRowStyle}>
        <div>🪵 木材: {inv.wood}</div>
        <div>🪨 石材: {inv.stone}</div>
      </div>
      <div>🍖 空腹度: {hunger}/100</div> {/* ★ 追加 */}
    </div>
  );
};

export default InventoryUI;