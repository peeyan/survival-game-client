import { GameEventBus, GAME_EVENTS } from './GameEventBus';
import type { GameState, WeatherType, Season, StatusEffects, Inventory, TideLevel, Skills, ToolDurability, ToolConditions, WeaponType } from './GameState';

export interface SaveData {
  version: string;
  savedAt: string;
  gameState: {
    totalMinutes: number;
    daysAlive: number;
    hintsFound: number;
    health: number;
    hunger: number;
    hydration: number;
    bodyTemp: number;
    sleep: number;
    mentalHealth: number;
    inventory: Inventory;
    score: number;
    weather: WeatherType;
    currentSeason: Season;
    seasonDay: number;
    rabbitCount: number;
    statusEffects: StatusEffects;
    tideLevel: TideLevel;
    generatorRepaired: boolean;
    techLevel: number;
    trapsActive: number;
    xp: number;
    level: number;
    skillPoints: number;
    skills: Skills;
    toolDurability: ToolDurability;
    farmsHarvested: number;
    saveHouseCount: number;
    toolConditions: ToolConditions;
    activeWeapon: WeaponType;
    shelterHP: number;
  };
}

export class SaveSystem {
  static readonly SAVE_KEY = 'survivalIsland_save_v3';

  static save(gs: GameState): void {
    const data: SaveData = {
      version: '3.0.0',
      savedAt: new Date().toISOString(),
      gameState: {
        totalMinutes: gs.totalMinutes,
        daysAlive: gs.daysAlive,
        hintsFound: gs.hintsFound,
        health: gs.health,
        hunger: gs.hunger,
        hydration: gs.hydration,
        bodyTemp: gs.bodyTemp,
        sleep: gs.sleep,
        mentalHealth: gs.mentalHealth,
        inventory: { ...gs.inventory },
        score: gs.score,
        weather: gs.weather,
        currentSeason: gs.currentSeason,
        seasonDay: gs.seasonDay,
        rabbitCount: gs.rabbitCount,
        statusEffects: { ...gs.statusEffects },
        tideLevel: gs.tideLevel,
        generatorRepaired: gs.generatorRepaired,
        techLevel: gs.techLevel,
        trapsActive: gs.trapsActive,
        xp: gs.xp,
        level: gs.level,
        skillPoints: gs.skillPoints,
        skills: { ...gs.skills },
        toolDurability: { ...gs.toolDurability },
        farmsHarvested:  gs.farmsHarvested,
        saveHouseCount:   gs.saveHouseCount,
        toolConditions:  { ...gs.toolConditions },
        activeWeapon:    gs.activeWeapon,
        shelterHP:       gs.shelterHP,
      },
    };

    try {
      localStorage.setItem(SaveSystem.SAVE_KEY, JSON.stringify(data));
      GameEventBus.emit(GAME_EVENTS.GAME_SAVED, data);
    } catch (e) {
      console.error('[SaveSystem] 保存に失敗しました:', e);
    }
  }

  static load(): SaveData | null {
    try {
      const raw = localStorage.getItem(SaveSystem.SAVE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as SaveData;
    } catch {
      return null;
    }
  }

  static hasSave(): boolean {
    return localStorage.getItem(SaveSystem.SAVE_KEY) !== null;
  }

  static deleteSave(): void {
    localStorage.removeItem(SaveSystem.SAVE_KEY);
  }

  static applySave(data: SaveData, gs: GameState): void {
    const s = data.gameState;
    gs.totalMinutes  = s.totalMinutes;
    gs.daysAlive     = s.daysAlive;
    gs.hintsFound    = s.hintsFound;
    gs.health        = s.health;
    gs.hunger        = s.hunger;
    gs.hydration     = s.hydration ?? 100;
    gs.bodyTemp      = s.bodyTemp  ?? 37.0;
    gs.sleep         = s.sleep     ?? 100;
    gs.mentalHealth  = s.mentalHealth ?? 100;
    gs.score         = s.score;
    gs.weather       = s.weather ?? 'sunny';
    gs.currentSeason = s.currentSeason ?? 'spring';
    gs.seasonDay     = s.seasonDay ?? 1;
    gs.rabbitCount   = s.rabbitCount ?? 30;

    if (s.inventory)     Object.assign(gs.inventory, s.inventory);
    if (s.statusEffects) Object.assign(gs.statusEffects, s.statusEffects);
    gs.tideLevel         = s.tideLevel         ?? 'low';
    gs.generatorRepaired = s.generatorRepaired  ?? false;
    gs.techLevel         = (s.techLevel         ?? 0) as 0 | 1 | 2;
    gs.trapsActive       = s.trapsActive        ?? 0;
    gs.xp                = s.xp                ?? 0;
    gs.level             = s.level             ?? 1;
    gs.skillPoints       = s.skillPoints       ?? 0;
    if (s.skills)          Object.assign(gs.skills, s.skills);
    if (s.toolDurability)  Object.assign(gs.toolDurability, s.toolDurability);
    gs.farmsHarvested    = s.farmsHarvested    ?? 0;
    gs.saveHouseCount    = s.saveHouseCount    ?? 0;
    if (s.toolConditions) Object.assign(gs.toolConditions, s.toolConditions);
    gs.activeWeapon      = s.activeWeapon      ?? 'fist';
    gs.shelterHP         = s.shelterHP         ?? 100;

    gs.time.day    = Math.floor(s.totalMinutes / 1440) + 1;
    gs.time.hour   = Math.floor((s.totalMinutes % 1440) / 60);
    gs.time.minute = s.totalMinutes % 60;

    GameEventBus.emit(GAME_EVENTS.GAME_LOADED, data);
  }
}
