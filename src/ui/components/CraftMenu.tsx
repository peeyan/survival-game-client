import React, { useState, useEffect } from 'react';
import { GameEventBus, GAME_EVENTS } from '../../logic/GameEventBus';
import { gameState } from '../../logic/GameState';

type Tab = 'tool' | 'food' | 'build' | 'escape';

const TAB_LABELS: Record<Tab, string> = {
  tool:   '🛠️ 道具',
  food:   '🍖 食料',
  build:  '🏗️ 建設',
  escape: '🎯 脱出',
};

const CraftMenu: React.FC = () => {
  const [inv,  setInv]  = useState(gameState.inventory);
  const [tech, setTech] = useState(gameState.techLevel);
  const [tab,  setTab]  = useState<Tab>('tool');

  useEffect(() => {
    const onInv  = (v: typeof gameState.inventory) => setInv({ ...v });
    const onTech = (lv: number) => setTech(lv as 0 | 1 | 2);
    GameEventBus.on(GAME_EVENTS.INVENTORY_UPDATED, onInv);
    GameEventBus.on(GAME_EVENTS.TECH_LEVEL_UP,     onTech);
    return () => {
      GameEventBus.off(GAME_EVENTS.INVENTORY_UPDATED, onInv);
      GameEventBus.off(GAME_EVENTS.TECH_LEVEL_UP,     onTech);
    };
  }, []);

  const panel: React.CSSProperties = {
    position: 'fixed',
    bottom: '140px',
    right: '12px',
    backgroundColor: 'rgba(10,10,10,0.88)',
    border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: '12px',
    padding: '0',
    color: '#fff',
    width: '168px',
    zIndex: 10000,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    backdropFilter: 'blur(4px)',
  };

  const tabRow: React.CSSProperties = {
    display: 'flex',
    borderBottom: '1px solid rgba(255,255,255,0.12)',
  };

  const tabBtn = (t: Tab): React.CSSProperties => ({
    flex: 1,
    padding: '5px 2px',
    backgroundColor: tab === t ? 'rgba(255,255,255,0.12)' : 'transparent',
    border: 'none',
    color: tab === t ? '#fff' : '#888',
    fontSize: '10px',
    cursor: 'pointer',
    transition: 'background 0.15s',
  });

  const scrollArea: React.CSSProperties = {
    padding: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    maxHeight: '320px',
    overflowY: 'auto',
  };

  const btn = (can: boolean, color = '#cc4400'): React.CSSProperties => ({
    width: '100%',
    padding: '6px 4px',
    backgroundColor: can ? color : '#2a2a2a',
    color: can ? '#fff' : '#555',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 'bold',
    fontSize: '11px',
    cursor: can ? 'pointer' : 'not-allowed',
    textAlign: 'left',
    paddingLeft: '8px',
  });

  const hint: React.CSSProperties = {
    fontSize: '9px', color: '#777', marginTop: '-2px', paddingLeft: '4px',
  };

  const techBadge = (minLevel: 0 | 1 | 2): React.ReactNode => {
    if (minLevel === 0 || tech >= minLevel) return null;
    return <span style={{ fontSize: '9px', color: '#ff8844', marginLeft: '4px' }}>Tier{minLevel}必要</span>;
  };

  const row = (
    label: string,
    recipe: string,
    can: boolean,
    event: string,
    color?: string,
    minLevel: 0 | 1 | 2 = 0,
  ) => (
    <div key={label}>
      <button
        style={btn(can && tech >= minLevel, color)}
        disabled={!can || tech < minLevel}
        onClick={() => (can && tech >= minLevel) && GameEventBus.emit(event)}
      >
        {label}{techBadge(minLevel)}
      </button>
      <div style={hint}>{recipe}</div>
    </div>
  );

  return (
    <div style={panel}>
      {/* タブバー */}
      <div style={tabRow}>
        {(Object.keys(TAB_LABELS) as Tab[]).map(t => (
          <button key={t} style={tabBtn(t)} onClick={() => setTab(t)}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      <div style={scrollArea}>

        {/* ── 道具タブ ──────────────────────────────────────── */}
        {tab === 'tool' && <>
          {row('🔪 石ナイフ', '🪨×2 → 採集+1', inv.stone >= 2, GAME_EVENTS.CRAFT_STONE_KNIFE)}
          {row('🪓 石斧', '🪨×3+🪵×1 → 木×2', inv.stone >= 3 && inv.wood >= 1, GAME_EVENTS.CRAFT_STONE_AXE)}
          {row('🎣 釣り竿', '🪵×2+🌿×2', inv.wood >= 2 && inv.vine >= 2, GAME_EVENTS.CRAFT_FISHING_ROD, '#cc4400', 1)}
        {row('🔱 槍', '🪵×2+🪨×3', inv.wood >= 2 && inv.stone >= 3, GAME_EVENTS.CRAFT_SPEAR, '#884400', 1)}
        {row('🏹 弓', '🪵×2+🌿×2', inv.wood >= 2 && inv.vine >= 2, GAME_EVENTS.CRAFT_FISHING_ROD, '#554400', 1)}
        {row('🔩 矢×3', '🪵×1+🪨×1+🧵×1', inv.wood >= 1 && inv.stone >= 1 && inv.fiber >= 1, GAME_EVENTS.CRAFT_ARROW, '#665500', 1)}
          {row('🪤 罠', '🪵×3+🌿×1', inv.wood >= 3 && inv.vine >= 1, GAME_EVENTS.CRAFT_TRAP, '#cc4400', 1)}
          {row('🧥 防寒具', '🧵×4+🥩×2', inv.fiber >= 4 && inv.rawMeat >= 2, GAME_EVENTS.CRAFT_WARM_CLOTHING, '#1a6b8a', 1)}
          {row('🩹 包帯', '🧵×2', inv.fiber >= 2, GAME_EVENTS.CRAFT_BANDAGE)}
          {row('💊 薬草煎じ薬', '🌱×3', inv.herbs >= 3, GAME_EVENTS.CRAFT_HERB_MEDICINE)}
        </>}

        {/* ── 食料タブ ──────────────────────────────────────── */}
        {tab === 'food' && <>
          {row('🍖 肉を焼く', '🥩×1（焚き火近く）', inv.rawMeat >= 1, GAME_EVENTS.COOK_MEAT)}
          {row('🐟 魚を焼く', '🐠×1（焚き火近く）', inv.rawFish >= 1, GAME_EVENTS.COOK_FISH)}
          <div style={{ fontSize: '10px', color: '#888', marginTop: '4px', paddingLeft: '4px' }}>
            🥫 缶詰{inv.cannedFood}個 / 🍖{inv.cookedMeat}個 / 🐟{inv.cookedFish}個
          </div>
          {inv.cookedMeat > 0 && (
            <div>
              <button style={btn(true, '#885500')} onClick={() => gameState.eatCookedMeat()}>
                🍖 焼き肉を食べる
              </button>
              <div style={hint}>+55kcal</div>
            </div>
          )}
          {inv.cookedFish > 0 && (
            <div>
              <button style={btn(true, '#226688')} onClick={() => gameState.eatCookedFish()}>
                🐟 焼き魚を食べる
              </button>
              <div style={hint}>+65kcal</div>
            </div>
          )}
          {inv.cannedFood > 0 && (
            <div>
              <button style={btn(true, '#445566')} onClick={() => gameState.eatCannedFood()}>
                🥫 缶詰を食べる
              </button>
              <div style={hint}>+30kcal+水分+10+塩分</div>
            </div>
          )}
          {inv.seaweed > 0 && (
            <div>
              <button style={btn(true, '#1a5a2a')} onClick={() => gameState.eatSeaweed()}>
                🌿 海藻を食べる
              </button>
              <div style={hint}>+10kcal 塩分+30</div>
            </div>
          )}
        </>}

        {/* ── 建設タブ ──────────────────────────────────────── */}
        {tab === 'build' && <>
          {row('🔥 焚き火', '🪵×3+🪨×3', inv.wood >= 3 && inv.stone >= 3, GAME_EVENTS.CRAFT_REQUEST)}
          {row('🏠 シェルター', '🪵×10+🪨×6', inv.wood >= 10 && inv.stone >= 6, GAME_EVENTS.CRAFT_SAVEHOUSE)}
        {row('🔨 作業台', '🪵×5+🪨×4（修理が可能に）', inv.wood >= 5 && inv.stone >= 4, GAME_EVENTS.CRAFT_WORKBENCH, '#553300')}
        {row('🌾 農場', '🪵×3+🪨×1', inv.wood >= 3 && inv.stone >= 1, GAME_EVENTS.CRAFT_FARM_PLOT, '#1a6b3a')}
        </>}

        {/* ── 脱出タブ ──────────────────────────────────────── */}
        {tab === 'escape' && <>
          <div style={{ fontSize: '10px', color: '#aaa', marginBottom: '4px' }}>
            Tier{tech} 技術レベル{tech < 2 && <span style={{ color: '#ff8844' }}> (技術書でTier2解放)</span>}
          </div>
          {row('🛶 いかだ', '🪵×8+🌿×6', inv.wood >= 8 && inv.vine >= 6, GAME_EVENTS.CRAFT_RAFT, '#1a6b3a')}
          <div style={{ fontSize: '10px', color: '#888', marginTop: '4px' }}>
            ⛵ 船修理：廃村の港でインタラクト<br/>
            <span style={{ color: inv.boatParts >= 3 ? '#88ff88' : '#888' }}>船パーツ {inv.boatParts}/3</span>{' '}
            <span style={{ color: inv.fuelTank >= 1 ? '#88ff88' : '#888' }}>燃料 {inv.fuelTank}/1</span>{' '}
            <span style={{ color: inv.navigationMap >= 1 ? '#88ff88' : '#888' }}>航海図 {inv.navigationMap ? '✓' : '✗'}</span>
          </div>
          <div style={{ fontSize: '10px', color: '#888', marginTop: '4px' }}>
            🚁 ヘリ修理：山頂でインタラクト<br/>
            <span style={{ color: inv.rotorPart >= 2 ? '#88ff88' : '#888' }}>ローター {inv.rotorPart}/2</span>{' '}
            <span style={{ color: inv.fuelTank >= 2 ? '#88ff88' : '#888' }}>燃料 {inv.fuelTank}/2</span>{' '}
            <span style={{ color: inv.flightManual >= 1 ? '#88ff88' : '#888' }}>マニュアル {inv.flightManual ? '✓' : '✗'}</span>
          </div>
          <div style={{ fontSize: '10px', color: '#888', marginTop: '4px' }}>
            ⚡ SOS無線：廃村の発電機<br/>
            <span style={{ color: inv.electronicParts >= 4 ? '#88ff88' : '#888' }}>電子部品 {inv.electronicParts}/4</span>
          </div>
        </>}
      </div>
    </div>
  );
};

export default CraftMenu;
