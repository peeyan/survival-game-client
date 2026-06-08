import React, { useState, useEffect } from 'react';
import { GameEventBus, GAME_EVENTS, gameState } from '../../logic/index';

// 季節アイコンマップ
const SEASON_ICONS: Record<'spring' | 'summer' | 'autumn' | 'winter', string> = {
  spring: '🌸',
  summer: '☀️',
  autumn: '🍂',
  winter: '❄️',
};

const InventoryUI: React.FC = () => {
  const [inv, setInv] = useState(gameState.inventory);
  const [hunger, setHunger] = useState(gameState.hunger);
  const [health, setHealth] = useState(gameState.health);
  const [time, setTime] = useState(gameState.time); // ★ 追加：時間
  const [season, setSeason] = useState<'spring' | 'summer' | 'autumn' | 'winter'>(
    gameState.currentSeason
  );
  const [seasonDay, setSeasonDay] = useState(gameState.seasonDay);

  useEffect(() => {
    const handleInvUpdate = (newInventory: typeof gameState.inventory) => {
      setInv({ ...newInventory });
    };

    const handleHungerUpdate = (newHunger: number) => {
      setHunger(newHunger);
    };

    // 体力更新ハンドラ
    const handleHealthUpdate = (newHealth: number) => {
      setHealth(newHealth);
    };

    // ★ 追加：時間の更新を受け取る
    const handleTimeUpdate = (newTime: typeof gameState.time) => {
      setTime({ ...newTime });
    };

    // 季節変更ハンドラ
    const handleSeasonChanged = (newSeason: 'spring' | 'summer' | 'autumn' | 'winter') => {
      setSeason(newSeason);
      setSeasonDay(gameState.seasonDay);
    };

    // onNewDay が呼ばれる度に seasonDay も更新（SCORE_UPDATED を利用）
    const handleScoreUpdated = () => {
      setSeasonDay(gameState.seasonDay);
    };

    GameEventBus.on(GAME_EVENTS.INVENTORY_UPDATED, handleInvUpdate);
    GameEventBus.on(GAME_EVENTS.HUNGER_UPDATED, handleHungerUpdate);
    GameEventBus.on(GAME_EVENTS.HEALTH_UPDATED, handleHealthUpdate);
    GameEventBus.on(GAME_EVENTS.TIME_UPDATED, handleTimeUpdate);
    GameEventBus.on(GAME_EVENTS.SEASON_CHANGED, handleSeasonChanged);
    GameEventBus.on(GAME_EVENTS.SCORE_UPDATED, handleScoreUpdated);
    GameEventBus.on(GAME_EVENTS.PLAYER_TOOK_DAMAGE, () => {
      setHealth(gameState.health);
    });
    GameEventBus.on(GAME_EVENTS.PLAYER_DIED, () => {
      setHealth(0);
    });

    return () => {
      GameEventBus.off(GAME_EVENTS.INVENTORY_UPDATED, handleInvUpdate);
      GameEventBus.off(GAME_EVENTS.HUNGER_UPDATED, handleHungerUpdate);
      GameEventBus.off(GAME_EVENTS.HEALTH_UPDATED, handleHealthUpdate);
      GameEventBus.off(GAME_EVENTS.TIME_UPDATED, handleTimeUpdate);
      GameEventBus.off(GAME_EVENTS.SEASON_CHANGED, handleSeasonChanged);
      GameEventBus.off(GAME_EVENTS.SCORE_UPDATED, handleScoreUpdated);
    };
  }, []);

  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    top: '20px',
    right: '20px',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    border: '2px solid #8B4513',
    borderRadius: '8px',
    padding: '10px 20px',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    zIndex: 10,
    userSelect: 'none',
    pointerEvents: 'none',
  };

  const itemRowStyle: React.CSSProperties = {
    display: 'flex',
    gap: '15px'
  };

  // ★ 時間を 00:00 のフォーマットにする
  const formattedHour = String(time.hour).padStart(2, '0');
  const formattedMinute = String(time.minute).padStart(2, '0');
  const seasonIcon = SEASON_ICONS[season];
  const seasonLabel = gameState.getSeason();

  return (
    <div style={containerStyle}>
      {/* ★ 追加：日付と時間 */}
      <div style={{ color: '#EEDD82', borderBottom: '1px solid #777', paddingBottom: '5px' }}>
        🕒 Day {time.day} - {formattedHour}:{formattedMinute}
      </div>
      {/* 季節表示 */}
      <div style={{ color: '#AADDFF', fontSize: '16px' }}>
        {seasonIcon} {seasonLabel} / Day {seasonDay}
      </div>
      <div style={itemRowStyle}>
        <div>🪵 木材: {inv.wood}</div>
        <div>🪨 石材: {inv.stone}</div>
      </div>
      <div>🍖 空腹度: {hunger}/100</div>
      <div style={{ color: health <= 30 ? '#ff4444' : '#ffffff' }}>
        ❤️ 体力: {health}/100
      </div>
    </div>
  );
};

export default InventoryUI;