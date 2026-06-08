import React, { useState, useEffect } from 'react';
import { GameEventBus, GAME_EVENTS, gameState } from '../../logic/index';
import type { StatusEffects, WeatherType, TideLevel, TechLevel } from '../../logic/GameState';

const SEASON_ICONS: Record<string, string> = {
  spring: '🌸', summer: '☀️', autumn: '🍂', winter: '❄️',
};
const WEATHER_ICONS: Record<WeatherType, string> = {
  sunny: '☀️', cloudy: '☁️', rainy: '🌧', storm: '⛈',
};

const bar = (value: number, max: number, color: string): React.CSSProperties => ({
  display: 'inline-block',
  width: `${Math.max(0, (value / max) * 80)}px`,
  height: '8px',
  backgroundColor: color,
  borderRadius: '4px',
  verticalAlign: 'middle',
  transition: 'width 0.3s ease',
});

const StatusHUD: React.FC = () => {
  const [health,      setHealth]      = useState(gameState.health);
  const [hunger,      setHunger]      = useState(gameState.hunger);
  const [hydration,   setHydration]   = useState(gameState.hydration);
  const [bodyTemp,    setBodyTemp]    = useState(gameState.bodyTemp);
  const [sleep_,      setSleep]       = useState(gameState.sleep);
  const [mental,      setMental]      = useState(gameState.mentalHealth);
  const [stamina,     setStamina]     = useState(100);
  const [time,        setTime]        = useState(gameState.time);
  const [season,      setSeason]      = useState(gameState.currentSeason);
  const [weather,     setWeather]     = useState<WeatherType>(gameState.weather);
  const [tide,        setTide]        = useState<TideLevel>(gameState.tideLevel);
  const [techLevel,   setTechLevel]   = useState<TechLevel>(gameState.techLevel);
  const [xpInfo,      setXpInfo]      = useState({ xp: 0, level: 1, needed: 80 });
  const [statusFx,    setStatusFx]    = useState<StatusEffects>({ ...gameState.statusEffects });
  const [inv,         setInv]         = useState(gameState.inventory);
  const [notification, setNotification] = useState<string | null>(null);
  const [nutrition,    setNutrition]    = useState({ vitaminC: 80, salt: 80, protein: 80 });
  const [windAngle,    setWindAngle]    = useState(0);

  useEffect(() => {
    const h  = (v: number)  => setHealth(v);
    const hu = (v: number)  => setHunger(v);
    const hy = (v: number)  => setHydration(v);
    const te = (v: number)  => setBodyTemp(v);
    const sl = (v: number)  => setSleep(v);
    const me = (v: number)  => setMental(v);
    const st = (v: number)  => setStamina(v);
    const ti = (v: typeof gameState.time) => setTime({ ...v });
    const sc = () => setSeason(gameState.currentSeason);
    const we = (v: WeatherType) => setWeather(v);
    const td = (v: TideLevel) => setTide(v);
    const tl = (v: number) => setTechLevel(v as TechLevel);
    const xp = (d: { xp: number; level: number; needed: number }) => setXpInfo(d);
    const sf = (v: StatusEffects) => setStatusFx({ ...v });
    const iv = (v: typeof gameState.inventory) => setInv({ ...v });
    const nt = (v: { vitaminC: number; salt: number; protein: number }) => setNutrition({ ...v });
    const wa = (v: number) => setWindAngle(v);
    const notif = (msg: string) => {
      setNotification(msg);
      setTimeout(() => setNotification(null), 4000);
    };

    GameEventBus.on(GAME_EVENTS.HEALTH_UPDATED,       h);
    GameEventBus.on(GAME_EVENTS.HUNGER_UPDATED,        hu);
    GameEventBus.on(GAME_EVENTS.HYDRATION_UPDATED,     hy);
    GameEventBus.on(GAME_EVENTS.TEMPERATURE_UPDATED,   te);
    GameEventBus.on(GAME_EVENTS.SLEEP_UPDATED,         sl);
    GameEventBus.on(GAME_EVENTS.MENTAL_HEALTH_UPDATED, me);
    GameEventBus.on(GAME_EVENTS.STAMINA_UPDATED,       st);
    GameEventBus.on(GAME_EVENTS.TIME_UPDATED,          ti);
    GameEventBus.on(GAME_EVENTS.SEASON_CHANGED,        sc);
    GameEventBus.on(GAME_EVENTS.WEATHER_CHANGED,       we);
    GameEventBus.on(GAME_EVENTS.TIDE_CHANGED,          td);
    GameEventBus.on(GAME_EVENTS.TECH_LEVEL_UP,         tl);
    GameEventBus.on(GAME_EVENTS.XP_GAINED,             xp);
    GameEventBus.on(GAME_EVENTS.STATUS_EFFECT_CHANGED, sf);
    GameEventBus.on(GAME_EVENTS.INVENTORY_UPDATED,     iv);
    GameEventBus.on(GAME_EVENTS.NOTIFICATION,          notif);
    GameEventBus.on(GAME_EVENTS.NUTRITION_UPDATED,     nt);
    GameEventBus.on(GAME_EVENTS.WIND_CHANGED,          wa);

    return () => {
      GameEventBus.off(GAME_EVENTS.HEALTH_UPDATED,       h);
      GameEventBus.off(GAME_EVENTS.HUNGER_UPDATED,        hu);
      GameEventBus.off(GAME_EVENTS.HYDRATION_UPDATED,     hy);
      GameEventBus.off(GAME_EVENTS.TEMPERATURE_UPDATED,   te);
      GameEventBus.off(GAME_EVENTS.SLEEP_UPDATED,         sl);
      GameEventBus.off(GAME_EVENTS.MENTAL_HEALTH_UPDATED, me);
      GameEventBus.off(GAME_EVENTS.STAMINA_UPDATED,       st);
      GameEventBus.off(GAME_EVENTS.TIME_UPDATED,          ti);
      GameEventBus.off(GAME_EVENTS.SEASON_CHANGED,        sc);
      GameEventBus.off(GAME_EVENTS.WEATHER_CHANGED,       we);
      GameEventBus.off(GAME_EVENTS.TIDE_CHANGED,          td);
      GameEventBus.off(GAME_EVENTS.TECH_LEVEL_UP,         tl);
      GameEventBus.off(GAME_EVENTS.XP_GAINED,             xp);
      GameEventBus.off(GAME_EVENTS.STATUS_EFFECT_CHANGED, sf);
      GameEventBus.off(GAME_EVENTS.INVENTORY_UPDATED,     iv);
      GameEventBus.off(GAME_EVENTS.NOTIFICATION,          notif);
      GameEventBus.off(GAME_EVENTS.NUTRITION_UPDATED,     nt);
      GameEventBus.off(GAME_EVENTS.WIND_CHANGED,          wa);
    };
  }, []);

  const fHour   = String(time.hour).padStart(2, '0');
  const fMin    = String(time.minute).padStart(2, '0');
  const isNight = time.hour >= 18 || time.hour < 6;

  // 状態異常タグ
  const activeEffects: string[] = [];
  if (statusFx.bleeding)             activeEffects.push('🩸 出血');
  if (statusFx.deepWound)            activeEffects.push('🩸 深傷');
  if (statusFx.infected)             activeEffects.push('🤒 感染');
  if (statusFx.sepsis)               activeEffects.push('💀 敗血症');
  if (statusFx.fractured)            activeEffects.push('🦴 骨折');
  if (statusFx.foodPoisoning)        activeEffects.push('🤢 食中毒');
  if (statusFx.heatstroke)           activeEffects.push('🥵 熱中症');
  if (statusFx.hypothermiaLevel > 0) activeEffects.push(`🥶 低体温Lv${statusFx.hypothermiaLevel}`);

  const tempColor = bodyTemp < 35 ? '#88ccff'
    : bodyTemp > 39 ? '#ff6644' : '#ffffff';

  const container: React.CSSProperties = {
    position: 'fixed',
    top: '12px',
    left: '12px',
    backgroundColor: 'rgba(0,0,0,0.62)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '10px',
    padding: '10px 14px',
    color: '#fff',
    fontSize: '13px',
    lineHeight: '1.7',
    zIndex: 10000,
    userSelect: 'none',
    pointerEvents: 'none',
    minWidth: '220px',
    backdropFilter: 'blur(4px)',
  };

  const row: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '2px',
  };

  const label: React.CSSProperties = {
    width: '28px',
    fontSize: '12px',
    opacity: 0.8,
  };

  const value: React.CSSProperties = {
    width: '32px',
    textAlign: 'right',
    fontSize: '12px',
  };

  return (
    <>
    {/* 通知バナー */}
    {notification && (
      <div style={{
        position: 'fixed', top: '70px', left: '50%', transform: 'translateX(-50%)',
        backgroundColor: 'rgba(0,0,0,0.82)', border: '1px solid rgba(255,255,255,0.25)',
        borderRadius: '10px', padding: '10px 20px', color: '#fff', fontSize: '14px',
        zIndex: 99998, whiteSpace: 'nowrap', pointerEvents: 'none',
        animation: 'fadeIn 0.3s ease',
      }}>
        {notification}
      </div>
    )}
    <div style={container}>
      {/* 時刻・天候 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '5px' }}>
        <span style={{ color: isNight ? '#aaccff' : '#ffee99', fontWeight: 'bold' }}>
          Day {time.day}　{fHour}:{fMin}
        </span>
        <span style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {SEASON_ICONS[season]} {WEATHER_ICONS[weather]}
          <span style={{
            fontSize: '11px', padding: '1px 5px', borderRadius: '4px',
            backgroundColor: tide === 'low' ? 'rgba(100,200,255,0.25)' : 'rgba(30,80,200,0.35)',
            color: tide === 'low' ? '#88eeff' : '#6699ff',
          }}>
            {tide === 'low' ? '🏖️干潮' : '🌊満潮'}
          </span>
        </span>
      </div>

      {/* 6軸バー */}
      <div style={row}>
        <span style={label}>HP</span>
        <span style={bar(health, 100, health > 50 ? '#4caf50' : health > 25 ? '#ff9800' : '#f44336')} />
        <span style={{ ...value, color: health <= 25 ? '#ff6644' : '#fff' }}>{Math.floor(health)}</span>
      </div>
      <div style={row}>
        <span style={label}>腹</span>
        <span style={bar(hunger, 100, hunger > 40 ? '#ff9800' : '#cc4400')} />
        <span style={value}>{Math.floor(hunger)}</span>
      </div>
      <div style={row}>
        <span style={label}>水</span>
        <span style={bar(hydration, 100, hydration > 40 ? '#29b6f6' : '#0066aa')} />
        <span style={value}>{Math.floor(hydration)}</span>
      </div>
      <div style={row}>
        <span style={label}>体温</span>
        <span style={{ fontSize: '12px', color: tempColor, fontWeight: 'bold' }}>
          {bodyTemp.toFixed(1)}℃
        </span>
      </div>
      <div style={row}>
        <span style={label}>眠</span>
        <span style={bar(sleep_, 100, sleep_ > 40 ? '#7e57c2' : '#4a2080')} />
        <span style={value}>{Math.floor(sleep_)}</span>
      </div>
      <div style={row}>
        <span style={label}>精神</span>
        <span style={bar(mental, 100, mental > 40 ? '#26c6da' : '#006688')} />
        <span style={value}>{Math.floor(mental)}</span>
      </div>
      <div style={row}>
        <span style={label}>ST</span>
        <span style={bar(stamina, 100, stamina > 40 ? '#ab47bc' : '#6a0080')} />
        <span style={{ ...value, color: stamina < 25 ? '#ff88ff' : '#fff' }}>{Math.floor(stamina)}</span>
      </div>

      {/* インベントリ（簡易） */}
      {/* 栄養素（低い時だけ強調） */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', marginTop: '4px', paddingTop: '4px' }}>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', fontSize: '11px' }}>
          <span style={{ width: '16px', opacity: 0.7 }}>🍊</span>
          <span style={bar(nutrition.vitaminC, 100, nutrition.vitaminC > 30 ? '#ff8c00' : '#cc2200')} />
          <span style={{ width: '16px', opacity: 0.7 }}>🧂</span>
          <span style={bar(nutrition.salt,     100, nutrition.salt     > 30 ? '#aaaaff' : '#4444cc')} />
          <span style={{ width: '16px', opacity: 0.7 }}>🥩</span>
          <span style={bar(nutrition.protein,  100, nutrition.protein  > 30 ? '#ff6666' : '#aa1111')} />
        </div>
        {nutrition.vitaminC < 30 && <div style={{ fontSize: '10px', color: '#ff8844' }}>⚠️ ビタミンC不足 → 壊血病リスク</div>}
        {nutrition.salt     < 30 && <div style={{ fontSize: '10px', color: '#8888ff' }}>⚠️ 塩分不足 → 足痙攣リスク</div>}
        {nutrition.protein  < 30 && <div style={{ fontSize: '10px', color: '#ff6666' }}>⚠️ タンパク不足 → 筋力低下リスク</div>}
      </div>

      {/* 風向きコンパス */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', marginTop: '4px', paddingTop: '4px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
        <span style={{ opacity: 0.7 }}>🧭 風:</span>
        <span style={{
          display: 'inline-block',
          transform: `rotate(${(windAngle * 180 / Math.PI).toFixed(0)}deg)`,
          fontSize: '14px',
          lineHeight: 1,
        }}>↑</span>
        <span style={{ fontSize: '10px', color: '#aaa' }}>下風から近づくとステルス可</span>
      </div>

      {/* XP/レベル */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', marginTop: '4px', paddingTop: '4px', fontSize: '11px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
          <span style={{ color: '#ffcc44' }}>⚔️ Lv{xpInfo.level}</span>
          <span style={{ color: '#aaa' }}>{xpInfo.xp}/{xpInfo.needed} XP</span>
        </div>
        <div style={{ background: '#333', borderRadius: '3px', height: '5px' }}>
          <div style={{
            background: '#4CAF50', height: '5px', borderRadius: '3px',
            width: `${Math.min(100, (xpInfo.xp / xpInfo.needed) * 100)}%`,
            transition: 'width 0.3s',
          }} />
        </div>
      </div>

      {/* 技術レベル */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', marginTop: '4px', paddingTop: '4px', fontSize: '11px', color: '#aaa' }}>
        🔬 Tier {techLevel}
        {techLevel === 0 && <span style={{ color: '#ff8844' }}> (石ナイフを作るとTier1解放)</span>}
        {techLevel === 1 && <span style={{ color: '#88ccff' }}> (技術書でTier2解放)</span>}
        {techLevel === 2 && <span style={{ color: '#88ff88' }}> (最高技術)</span>}
      </div>

      {/* インベントリ */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', marginTop: '4px', paddingTop: '4px', fontSize: '12px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
          {inv.wood          > 0 && <span>🪵{inv.wood}</span>}
          {inv.stone         > 0 && <span>🪨{inv.stone}</span>}
          {inv.vine          > 0 && <span>🌿{inv.vine}</span>}
          {inv.fiber         > 0 && <span>🧵{inv.fiber}</span>}
          {inv.rawMeat       > 0 && <span>🥩{inv.rawMeat}</span>}
          {inv.cookedMeat    > 0 && <span>🍖{inv.cookedMeat}</span>}
          {inv.rawFish       > 0 && <span>🐠{inv.rawFish}</span>}
          {inv.cookedFish    > 0 && <span>🐟{inv.cookedFish}</span>}
          {inv.cannedFood    > 0 && <span>🥫{inv.cannedFood}</span>}
          {inv.bandage       > 0 && <span>🩹{inv.bandage}</span>}
          {inv.herbs         > 0 && <span>🌱{inv.herbs}</span>}
          {inv.herbMedicine  > 0 && <span>💊{inv.herbMedicine}</span>}
          {inv.antibiotics   > 0 && <span>💉{inv.antibiotics}</span>}
          {inv.stoneKnife    > 0 && <span>🔪{inv.stoneKnife}</span>}
          {inv.stoneAxe      > 0 && <span>🪓{inv.stoneAxe}</span>}
          {inv.fishingRod    > 0 && <span>🎣{inv.fishingRod}</span>}
          {inv.trap          > 0 && <span>🪤{inv.trap}</span>}
          {inv.warmClothing  > 0 && <span>🧥{inv.warmClothing}</span>}
          {inv.electronicParts > 0 && <span>⚡{inv.electronicParts}</span>}
          {inv.boatParts     > 0 && <span>⛵{inv.boatParts}</span>}
          {inv.fuelTank      > 0 && <span>⛽{inv.fuelTank}</span>}
          {inv.rotorPart     > 0 && <span>🔧{inv.rotorPart}</span>}
          {inv.navigationMap > 0 && <span>🗺️</span>}
          {inv.flightManual  > 0 && <span>📋✈</span>}
          {inv.techManual    > 0 && <span>📗Tech</span>}
        </div>
      </div>

      {/* 状態異常 */}
      {activeEffects.length > 0 && (
        <div style={{ marginTop: '6px', borderTop: '1px solid rgba(255,100,100,0.3)', paddingTop: '4px' }}>
          {activeEffects.map((e, i) => (
            <div key={i} style={{ fontSize: '11px', color: '#ff8888', animation: 'pulse 1s infinite' }}>{e}</div>
          ))}
        </div>
      )}
    </div>
    </>
  );
};

export default StatusHUD;
