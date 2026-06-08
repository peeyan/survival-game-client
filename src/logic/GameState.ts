import { GameEventBus, GAME_EVENTS } from './GameEventBus';
import { SaveSystem } from './SaveSystem';

export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'storm';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface StatusEffects {
  bleeding: boolean;
  deepWound: boolean;
  infected: boolean;
  sepsis: boolean;
  fractured: boolean;
  foodPoisoning: boolean;
  hypothermiaLevel: 0 | 1 | 2 | 3;
  heatstroke: boolean;
}

export type TideLevel = 'low' | 'high';
export type TechLevel = 0 | 1 | 2;

export interface Inventory {
  // 基本素材
  wood: number;
  stone: number;
  vine: number;
  fiber: number;
  // 食料
  rawMeat: number;
  cookedMeat: number;
  rawFish: number;
  cookedFish: number;
  cannedFood: number;
  // 医薬品
  bandage: number;
  herbs: number;
  herbMedicine: number;
  antibiotics: number;
  // 道具（Tier 1）
  stoneKnife: number;
  stoneAxe: number;
  fishingRod: number;
  trap: number;
  warmClothing: number;
  // 電子・脱出素材（Tier 2）
  electronicParts: number;
  boatParts: number;
  fuelTank: number;
  rotorPart: number;
  // 書類（0=未入手 / 1=入手済）
  navigationMap: number;
  flightManual: number;
  techManual: number;
  // 海岸採集
  seaweed: number;
  // 農業
  berrySeed: number;
  veggieSeed: number;
  vegetable: number;
  // 武器・弾薬
  spear: number;
  arrow: number;
}

// ── スキルツリー型定義 ───────────────────────────────────────
export type SkillName = 'hunter' | 'gatherer' | 'cook' | 'medic' | 'builder' | 'explorer';
export interface Skills {
  hunter:   0 | 1 | 2 | 3;
  gatherer: 0 | 1 | 2 | 3;
  cook:     0 | 1 | 2 | 3;
  medic:    0 | 1 | 2 | 3;
  builder:  0 | 1 | 2 | 3;
  explorer: 0 | 1 | 2 | 3;
}

// ── 武器タイプ ──────────────────────────────────────────────
export type WeaponType = 'fist' | 'stoneKnife' | 'spear' | 'bow';

// ── 道具名 ──────────────────────────────────────────────────
export type ToolName = 'stoneAxe' | 'stoneKnife' | 'fishingRod' | 'spear' | 'bow';

// ── 道具条件（0-100%） ──────────────────────────────────────
export type ToolConditions = Record<ToolName, number>;

// ── 旧耐久度（後方互換用） ──────────────────────────────────
export interface ToolDurability {
  stoneAxe:    number;
  stoneKnife:  number;
  fishingRod:  number;
}

export class GameState {
  public inventory: Inventory = {
    wood: 0, stone: 0, vine: 0, fiber: 0,
    rawMeat: 0, cookedMeat: 0, rawFish: 0, cookedFish: 0, cannedFood: 0,
    bandage: 0, herbs: 0, herbMedicine: 0, antibiotics: 0,
    stoneKnife: 0, stoneAxe: 0, fishingRod: 0, trap: 0, warmClothing: 0,
    electronicParts: 0, boatParts: 0, fuelTank: 0, rotorPart: 0,
    navigationMap: 0, flightManual: 0, techManual: 0,
    seaweed: 0,
    berrySeed: 0, veggieSeed: 0, vegetable: 0,
    spear: 0, arrow: 0,
  };

  // ── 6軸ステータス ───────────────────────────────────────────
  public health     = 100;
  public maxHealth  = 100;
  public hunger     = 100;  // カロリー
  public maxHunger  = 100;
  public hydration  = 100;  // 水分
  public bodyTemp   = 37.0; // 体温(℃)
  public sleep      = 100;  // 睡眠
  public mentalHealth = 100;// 精神衛生

  // ── 状態異常 ────────────────────────────────────────────────
  public statusEffects: StatusEffects = {
    bleeding: false,
    deepWound: false,
    infected: false,
    sepsis: false,
    fractured: false,
    foodPoisoning: false,
    hypothermiaLevel: 0,
    heatstroke: false,
  };

  // 状態異常の内部タイマー（秒単位）
  private bleedingTimer    = 0;
  private infectionTimer   = 0; // ゲーム内時間（秒）
  private foodPoiTimer     = 0;

  // ── 天候 ───────────────────────────────────────────────────
  public weather: WeatherType = 'sunny';
  private weatherTimer = 0; // 秒
  private static readonly WEATHER_DURATIONS: Record<WeatherType, number> = {
    sunny: 480, cloudy: 240, rainy: 180, storm: 60,
  };

  // ── 時間 ───────────────────────────────────────────────────
  public totalMinutes = 0;
  public time = { day: 1, hour: 0, minute: 0 };

  // ── スコア・進行 ────────────────────────────────────────────
  public score       = 0;
  public daysAlive   = 0;
  public hintsFound  = 0;
  public isAlive     = true;
  public lastSaveTime = 0;

  // ── 季節 ───────────────────────────────────────────────────
  public currentSeason: Season = 'spring';
  public seasonDay = 1;

  // ── 生態系 ─────────────────────────────────────────────────
  public rabbitCount = 30;

  // ── 潮汐 ───────────────────────────────────────────────────
  public tideLevel: TideLevel = 'low';
  private tideMinutes = 0; // 0〜359:干潮 / 360〜719:満潮（360分=6ゲーム時間周期）

  // ── SOS進行 ────────────────────────────────────────────────
  public generatorRepaired = false;

  // ── 技術ツリー ─────────────────────────────────────────────
  public techLevel: TechLevel = 0;

  // ── 罠タイマー（ゲーム内分） ──────────────────────────────
  public trapsActive = 0;
  private trapTimer  = 0;
  private readonly TRAP_CATCH_MINUTES = 180;

  // ── 栄養素（0〜100） ───────────────────────────────────────
  public vitaminC = 80;
  public salt     = 80;
  public protein  = 80;
  // 欠乏継続日数
  private vitaminCDefDays = 0;
  private saltDefDays     = 0;
  private proteinDefDays  = 0;
  // 栄養欠乏状態
  public hasScurvy         = false; // 壊血病
  public hasMuscleWeakness = false; // 筋力低下
  // 塩分不足による足痙攣
  public isCramped  = false;
  private crampTimer = 0; // ms

  // ── 風 ──────────────────────────────────────────────────
  public windAngle = Math.random() * Math.PI * 2; // ラジアン
  private windTimer = 0; // 積算秒数

  // ── プレイヤー移動（動物の感知に使用）───────────────────────
  public playerIsMoving = false;

  // ── 水道 ────────────────────────────────────────────────
  public waterPumpActive = false;

  // ── 経験値・レベル ─────────────────────────────────────────
  public xp          = 0;
  public level       = 1;
  public skillPoints = 0;
  public skills: Skills = {
    hunter: 0, gatherer: 0, cook: 0, medic: 0, builder: 0, explorer: 0,
  };

  // ── 道具耐久度（後方互換、新システムは toolConditions を使用）──
  public toolDurability: ToolDurability = {
    stoneAxe: 30, stoneKnife: 20, fishingRod: 15,
  };

  // ── 道具条件（0-100%、リアリティ強化版）──────────────────────
  public toolConditions: ToolConditions = {
    stoneAxe: 100, stoneKnife: 100, fishingRod: 100,
    spear: 100, bow: 100,
  };

  // ── 武器 ───────────────────────────────────────────────────
  public activeWeapon: WeaponType = 'fist';
  public workbenchNearby = false;

  // ── シェルター耐久度 ───────────────────────────────────────
  public shelterHP    = 100;
  public shelterHPMax = 100;

  // ── 定住進行 ───────────────────────────────────────────────
  public farmsHarvested = 0;   // 累計収穫回数
  public saveHouseCount  = 0;   // 建設したシェルター数

  // ── 無敵フラグ（回避ダッシュ中）────────────────────────────
  public isInvincible = false;

  constructor() {
    GameEventBus.on(GAME_EVENTS.PLAYER_TOOK_DAMAGE, (damage: number) => {
      this.takeDamage(damage);
    });
  }

  // ═══════════════════════════════════════════════════════════
  // メインサバイバルティック（MainScene.update から毎フレーム呼ぶ）
  // ═══════════════════════════════════════════════════════════
  tickSurvival(deltaMs: number, isNearCampfire: boolean, isInShelter: boolean): void {
    if (!this.isAlive) return;
    const s = deltaMs / 1000;

    this._tickHydration(s);
    this._tickBodyTemp(s, isNearCampfire, isInShelter);
    this._tickSleep(s);
    this._tickMentalHealth(s, isNearCampfire);
    this._tickStatusEffects(s);
    this._tickWeather(s);
    this._tickTraps(s);
    this._tickWind(s);
    this._tickCramp(s);
    this._tickMentalEffects(s);
  }

  private _tickHydration(s: number): void {
    let rate = 2 / 60; // -2/分
    if (this.bodyTemp > 39) rate *= 2;
    this.hydration = Math.max(0, this.hydration - rate * s);
    GameEventBus.emit(GAME_EVENTS.HYDRATION_UPDATED, this.hydration);

    if (this.hydration === 0 && this.isAlive) {
      this.health = Math.max(0, this.health - 2 * s);
      GameEventBus.emit(GAME_EVENTS.HEALTH_UPDATED, this.health);
      this._checkDeath();
    }
  }

  private _tickBodyTemp(s: number, isNearCampfire: boolean, isInShelter: boolean): void {
    const h = this.time.hour;
    const isNight = h >= 18 || h < 6;
    let delta = 0;

    switch (this.weather) {
      case 'sunny':  delta = isNight ? -0.3 : 0; break;
      case 'cloudy': delta = isNight ? -0.4 : -0.1; break;
      case 'rainy':  delta = -0.6; break;
      case 'storm':  delta = -1.2; break;
    }
    if (isNearCampfire)               delta += 0.5;
    if (isInShelter)                  delta += 0.3;
    if (this.inventory.warmClothing > 0 && delta < 0) delta *= 0.45; // 防寒具：冷却55%軽減

    this.bodyTemp = Math.max(30, Math.min(42, this.bodyTemp + delta * s / 60));
    GameEventBus.emit(GAME_EVENTS.TEMPERATURE_UPDATED, this.bodyTemp);

    // 低体温症レベル判定
    const prev = this.statusEffects.hypothermiaLevel;
    let level: 0 | 1 | 2 | 3 = 0;
    if (this.bodyTemp < 31)      level = 3;
    else if (this.bodyTemp < 33) level = 2;
    else if (this.bodyTemp < 35) level = 1;

    if (level !== prev) {
      this.statusEffects.hypothermiaLevel = level;
      GameEventBus.emit(GAME_EVENTS.STATUS_EFFECT_CHANGED, this.statusEffects);
    }

    // 低体温症Lv3 → HP減少
    if (level === 3) {
      this.health = Math.max(0, this.health - 5 * s);
      GameEventBus.emit(GAME_EVENTS.HEALTH_UPDATED, this.health);
      this._checkDeath();
    }

    // 熱中症
    const hadHeatstroke = this.statusEffects.heatstroke;
    this.statusEffects.heatstroke = this.bodyTemp >= 39;
    if (this.statusEffects.heatstroke !== hadHeatstroke) {
      GameEventBus.emit(GAME_EVENTS.STATUS_EFFECT_CHANGED, this.statusEffects);
    }
  }

  private _tickSleep(s: number): void {
    this.sleep = Math.max(0, this.sleep - (3 / 60) * s);
    GameEventBus.emit(GAME_EVENTS.SLEEP_UPDATED, this.sleep);
  }

  private _tickMentalHealth(s: number, isNearCampfire: boolean): void {
    const rate = isNearCampfire ? 3 / 60 : -(5 / (24 * 60));
    this.mentalHealth = Math.max(0, Math.min(100, this.mentalHealth + rate * s));
    GameEventBus.emit(GAME_EVENTS.MENTAL_HEALTH_UPDATED, this.mentalHealth);
  }

  private _tickStatusEffects(s: number): void {
    // Medic Lv3: 自然HP回復
    if (this.skills.medic >= 3 && !this.statusEffects.bleeding && !this.statusEffects.infected) {
      this.health = Math.min(this.maxHealth, this.health + 0.05 * s);
      GameEventBus.emit(GAME_EVENTS.HEALTH_UPDATED, this.health);
    }
    const fx = this.statusEffects;

    // 出血 → 深傷の進行
    if (fx.bleeding) {
      this.health = Math.max(0, this.health - 2 * s);
      GameEventBus.emit(GAME_EVENTS.HEALTH_UPDATED, this.health);
      this._checkDeath();

      this.bleedingTimer += s;
      if (this.bleedingTimer >= 30 && !fx.deepWound) {
        fx.bleeding = false;
        fx.deepWound = true;
        this.bleedingTimer = 0;
        GameEventBus.emit(GAME_EVENTS.STATUS_EFFECT_CHANGED, fx);
      }
    }

    // 深傷 → HP減少 + 感染へ
    if (fx.deepWound) {
      this.health = Math.max(0, this.health - 4 * s);
      GameEventBus.emit(GAME_EVENTS.HEALTH_UPDATED, this.health);
      this._checkDeath();

      this.bleedingTimer += s;
      if (this.bleedingTimer >= 30 * 6 && !fx.infected) {
        fx.deepWound = false;
        fx.infected = true;
        this.bleedingTimer = 0;
        GameEventBus.emit(GAME_EVENTS.STATUS_EFFECT_CHANGED, fx);
      }
    }

    // 感染症 → HP減少 + 敗血症へ
    if (fx.infected) {
      this.health = Math.max(0, this.health - 1 * s);
      this.bodyTemp = Math.min(42, this.bodyTemp + 0.01 * s);
      GameEventBus.emit(GAME_EVENTS.HEALTH_UPDATED, this.health);
      this._checkDeath();

      this.infectionTimer += s;
      if (this.infectionTimer >= 24 * 60 * 6 && !fx.sepsis) {
        fx.infected = false;
        fx.sepsis = true;
        this.infectionTimer = 0;
        GameEventBus.emit(GAME_EVENTS.STATUS_EFFECT_CHANGED, fx);
      }
    }

    // 敗血症 → 急速HP減少
    if (fx.sepsis) {
      this.health = Math.max(0, this.health - 5 * s);
      GameEventBus.emit(GAME_EVENTS.HEALTH_UPDATED, this.health);
      this._checkDeath();
    }

    // 食中毒 → 脱水 + カロリー吸収不可
    if (fx.foodPoisoning) {
      this.hydration = Math.max(0, this.hydration - 0.5 * s);
      GameEventBus.emit(GAME_EVENTS.HYDRATION_UPDATED, this.hydration);
      this.foodPoiTimer += s;
      if (this.foodPoiTimer >= 120) {
        fx.foodPoisoning = false;
        this.foodPoiTimer = 0;
        GameEventBus.emit(GAME_EVENTS.STATUS_EFFECT_CHANGED, fx);
      }
    }
  }

  private _tickWeather(s: number): void {
    this.weatherTimer += s;
    const duration = GameState.WEATHER_DURATIONS[this.weather];
    if (this.weatherTimer >= duration) {
      this.weatherTimer = 0;
      this.weather = this._nextWeather();
      GameEventBus.emit(GAME_EVENTS.WEATHER_CHANGED, this.weather);
    }
  }

  private _tickTraps(s: number): void {
    if (this.trapsActive <= 0) return;
    this.trapTimer += s / 60; // 秒→分変換
    if (this.trapTimer >= this.TRAP_CATCH_MINUTES) {
      this.trapTimer = 0;
      const caught = this.trapsActive;
      this.addItem('rawMeat', caught);
      this.trapsActive = 0;
      GameEventBus.emit(GAME_EVENTS.NOTIFICATION, `🪤 罠に${caught}匹かかった！生肉×${caught}を入手`);
      gameState.rabbitCount = Math.max(0, gameState.rabbitCount - caught);
    }
  }

  private _tickWind(s: number): void {
    this.windTimer += s;
    if (this.windTimer >= 60) { // 60秒ごとに風向き変化
      this.windTimer = 0;
      this.windAngle += (Math.random() - 0.5) * 0.8;
      GameEventBus.emit(GAME_EVENTS.WIND_CHANGED, this.windAngle);
    }
  }

  private _tickCramp(s: number): void {
    if (!this.isCramped) {
      // 塩分欠乏中はランダムで痙攣発症
      if (this.saltDefDays >= 10 && Math.random() < 0.0003 * s) {
        this.isCramped  = true;
        this.crampTimer = 4000;
        GameEventBus.emit(GAME_EVENTS.CRAMPS_TRIGGERED, undefined);
        GameEventBus.emit(GAME_EVENTS.NOTIFICATION, '🦵 足がつった！動けない… (塩分不足)');
      }
    } else {
      this.crampTimer -= s * 1000;
      if (this.crampTimer <= 0) {
        this.isCramped  = false;
        this.crampTimer = 0;
      }
    }
  }

  private _tickMentalEffects(s: number): void {
    // 精神衛生 < 30 → 幻聴（低確率通知）
    if (this.mentalHealth < 30 && Math.random() < 0.0002 * s) {
      const msgs = [
        '👁️ 何かが見えた気がした…',
        '👂 誰かの声がした…？',
        '🐺 草むらで何かが動いた…（気のせい？）',
        '😰 後ろに気配を感じる…',
      ];
      GameEventBus.emit(GAME_EVENTS.MENTAL_EFFECT, msgs[Math.floor(Math.random() * msgs.length)]);
    }
  }

  private _nextWeather(): WeatherType {
    const season = this.currentSeason;
    const r = Math.random();
    if (season === 'winter') {
      if (r < 0.1) return 'sunny';
      if (r < 0.3) return 'cloudy';
      if (r < 0.7) return 'rainy';
      return 'storm';
    }
    if (season === 'summer') {
      if (r < 0.5) return 'sunny';
      if (r < 0.75) return 'cloudy';
      if (r < 0.9) return 'rainy';
      return 'storm';
    }
    // spring / autumn
    if (r < 0.4) return 'sunny';
    if (r < 0.6) return 'cloudy';
    if (r < 0.85) return 'rainy';
    return 'storm';
  }

  private _checkDeath(): void {
    if (this.health <= 0 && this.isAlive) {
      this.isAlive = false;
      GameEventBus.emit(GAME_EVENTS.PLAYER_DIED, undefined);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 治療・回復
  // ═══════════════════════════════════════════════════════════
  useBandage(): boolean {
    if (this.inventory.bandage < 1) return false;
    if (!this.statusEffects.bleeding && !this.statusEffects.deepWound) return false;
    this.inventory.bandage--;
    this.statusEffects.bleeding  = false;
    this.statusEffects.deepWound = false;
    this.bleedingTimer = 0;
    if (this.skills.medic >= 1) {
      this.health = Math.min(this.maxHealth, this.health + 10);
      GameEventBus.emit(GAME_EVENTS.HEALTH_UPDATED, this.health);
    }
    GameEventBus.emit(GAME_EVENTS.STATUS_EFFECT_CHANGED, this.statusEffects);
    GameEventBus.emit(GAME_EVENTS.INVENTORY_UPDATED, this.inventory);
    this.addXP(15, 'medic');
    return true;
  }

  useHerbMedicine(): boolean {
    if (this.inventory.herbMedicine < 1) return false;
    if (!this.statusEffects.infected) return false;
    this.inventory.herbMedicine--;
    this.statusEffects.infected = false;
    this.infectionTimer = 0;
    GameEventBus.emit(GAME_EVENTS.STATUS_EFFECT_CHANGED, this.statusEffects);
    GameEventBus.emit(GAME_EVENTS.INVENTORY_UPDATED, this.inventory);
    return true;
  }

  useAntibiotics(): boolean {
    if (this.inventory.antibiotics < 1) return false;
    if (!this.statusEffects.infected && !this.statusEffects.sepsis) return false;
    this.inventory.antibiotics--;
    this.statusEffects.infected = false;
    this.statusEffects.sepsis = false;
    this.infectionTimer = 0;
    GameEventBus.emit(GAME_EVENTS.STATUS_EFFECT_CHANGED, this.statusEffects);
    GameEventBus.emit(GAME_EVENTS.INVENTORY_UPDATED, this.inventory);
    return true;
  }

  sleep_(hours: number): void {
    this.sleep = Math.min(100, this.sleep + 50 * hours);
    GameEventBus.emit(GAME_EVENTS.SLEEP_UPDATED, this.sleep);
  }

  drinkWater(amount: number): void {
    this.hydration = Math.min(100, this.hydration + amount);
    GameEventBus.emit(GAME_EVENTS.HYDRATION_UPDATED, this.hydration);
  }

  // ═══════════════════════════════════════════════════════════
  // 既存メソッド
  // ═══════════════════════════════════════════════════════════
  calculateScore(): number {
    return this.daysAlive * 100 + this.hintsFound * 300;
  }

  getSeason(): string {
    const map: Record<Season, string> = {
      spring: '春', summer: '夏', autumn: '秋', winter: '冬',
    };
    return map[this.currentSeason];
  }

  getWeatherLabel(): string {
    const map: Record<WeatherType, string> = {
      sunny: '晴れ', cloudy: '曇り', rainy: '雨', storm: '嵐',
    };
    return map[this.weather];
  }

  getWeatherIcon(): string {
    const map: Record<WeatherType, string> = {
      sunny: '☀️', cloudy: '☁️', rainy: '🌧', storm: '⛈',
    };
    return map[this.weather];
  }

  updateSeason(): void {
    const ORDER: Season[] = ['spring', 'summer', 'autumn', 'winter'];
    this.seasonDay++;
    if (this.seasonDay > 7) {
      this.seasonDay = 1;
      const next = (ORDER.indexOf(this.currentSeason) + 1) % ORDER.length;
      this.currentSeason = ORDER[next];
      GameEventBus.emit(GAME_EVENTS.SEASON_CHANGED, this.currentSeason);
    }
  }

  getResourceSpawnMultiplier(): number {
    switch (this.currentSeason) {
      case 'spring': case 'autumn': return 1.2;
      case 'summer': return 1.0;
      case 'winter': return 0.4;
    }
  }

  // ── 武器システム ────────────────────────────────────────────
  setWeapon(w: WeaponType): void {
    if (w === 'stoneKnife' && this.inventory.stoneKnife < 1) return;
    if (w === 'spear'      && this.inventory.spear      < 1) return;
    if (w === 'bow'        && this.inventory.fishingRod < 1) return; // 弓はfishingRodを流用（Phase 4で分離）
    this.activeWeapon = w;
    GameEventBus.emit(GAME_EVENTS.WEAPON_CHANGED, w);
  }

  /** 現在武器の攻撃パラメータを返す（条件劣化を反映） */
  getAttackStats(): { range: number; arc: number; damage: number; cooldown: number } {
    switch (this.activeWeapon) {
      case 'fist':
        return { range: 65, arc: Math.PI / 3, damage: 30, cooldown: 700 };
      case 'stoneKnife': {
        const eff = this.getToolEffectiveness('stoneKnife');
        return { range: 55, arc: Math.PI * 5 / 12, damage: Math.floor(38 * eff), cooldown: 580 };
      }
      case 'spear': {
        const eff = this.getToolEffectiveness('spear');
        return { range: 110, arc: Math.PI / 5, damage: Math.floor(55 * eff), cooldown: 1200 };
      }
      case 'bow':
        return { range: 400, arc: 0, damage: Math.floor(35 * this.getToolEffectiveness('bow')), cooldown: 900 };
    }
  }

  // ── 道具条件システム ────────────────────────────────────────
  getToolEffectiveness(tool: ToolName): number {
    const c = this.toolConditions[tool];
    if (c >= 75) return 1.00;
    if (c >= 50) return 0.90;
    if (c >= 25) return 0.75;
    return 0.50;
  }

  degradeTool(tool: ToolName, amount = 4): void {
    // 雨/嵐で劣化加速
    const weatherMult = this.weather === 'storm' ? 2.0 : this.weather === 'rainy' ? 1.5 : 1.0;
    // 採集スキルで劣化軽減
    const skillMult   = this.skills.gatherer >= 2 ? 0.7 : 1.0;
    const degradation = amount * weatherMult * skillMult;
    this.toolConditions[tool] = Math.max(0, this.toolConditions[tool] - degradation);
    GameEventBus.emit(GAME_EVENTS.TOOL_CONDITION_CHANGED, { ...this.toolConditions });

    if (this.toolConditions[tool] <= 0) {
      this._breakTool(tool);
    } else if (this.toolConditions[tool] <= 25) {
      GameEventBus.emit(GAME_EVENTS.NOTIFICATION, `⚠️ ${this._toolLabel(tool)} の状態が危険！修理が必要`);
    }
  }

  private _breakTool(tool: ToolName): void {
    const inv = this.inventory as unknown as Record<string, number>;
    if (tool in inv) inv[tool] = Math.max(0, (inv[tool] || 0) - 1);
    GameEventBus.emit(GAME_EVENTS.INVENTORY_UPDATED, this.inventory);
    GameEventBus.emit(GAME_EVENTS.NOTIFICATION, `💥 ${this._toolLabel(tool)} が壊れた！再クラフト or 修理が必要`);
    if (this.activeWeapon === tool as WeaponType) {
      this.activeWeapon = 'fist';
      GameEventBus.emit(GAME_EVENTS.WEAPON_CHANGED, 'fist');
    }
  }

  private _toolLabel(t: ToolName): string {
    const m: Record<ToolName, string> = {
      stoneAxe: '石斧', stoneKnife: '石ナイフ', fishingRod: '釣り竿',
      spear: '槍', bow: '弓',
    };
    return m[t];
  }

  repairTool(tool: ToolName): boolean {
    if (!this.workbenchNearby) {
      GameEventBus.emit(GAME_EVENTS.NOTIFICATION, '🔧 修理には作業台が必要です');
      return false;
    }
    const costs: Partial<Record<ToolName, Partial<Record<keyof Inventory, number>>>> = {
      stoneAxe:   { stone: 1 },
      stoneKnife: { stone: 1 },
      fishingRod: { vine:  1 },
      spear:      { stone: 1, wood: 1 },
      bow:        { vine:  2 },
    };
    const cost = costs[tool];
    if (!cost) return false;
    for (const [k, v] of Object.entries(cost) as [keyof Inventory, number][]) {
      if ((this.inventory[k] as number) < v) {
        GameEventBus.emit(GAME_EVENTS.NOTIFICATION, `🔧 修理素材不足`);
        return false;
      }
    }
    for (const [k, v] of Object.entries(cost) as [keyof Inventory, number][]) {
      (this.inventory[k] as number) -= v;
    }
    this.toolConditions[tool] = Math.min(100, this.toolConditions[tool] + 35);
    GameEventBus.emit(GAME_EVENTS.INVENTORY_UPDATED, this.inventory);
    GameEventBus.emit(GAME_EVENTS.TOOL_CONDITION_CHANGED, { ...this.toolConditions });
    GameEventBus.emit(GAME_EVENTS.NOTIFICATION, `✅ ${this._toolLabel(tool)} を修理した！(+35%)`);
    this.addXP(25, 'builder');
    return true;
  }

  // シェルター修理
  repairShelter(): boolean {
    if (this.inventory.wood < 2 || this.inventory.stone < 1) {
      GameEventBus.emit(GAME_EVENTS.NOTIFICATION, '🏠 修理には木×2・石×1が必要');
      return false;
    }
    this.inventory.wood  -= 2;
    this.inventory.stone -= 1;
    this.shelterHP = Math.min(this.shelterHPMax, this.shelterHP + 30);
    GameEventBus.emit(GAME_EVENTS.INVENTORY_UPDATED, this.inventory);
    GameEventBus.emit(GAME_EVENTS.SHELTER_REPAIRED, this.shelterHP);
    return true;
  }

  onStormDamagesShelter(): void {
    this.shelterHP = Math.max(0, this.shelterHP - 10);
    GameEventBus.emit(GAME_EVENTS.SHELTER_DAMAGED, this.shelterHP);
    if (this.shelterHP === 0) {
      GameEventBus.emit(GAME_EVENTS.NOTIFICATION, '🏚️ シェルターが崩壊した！嵐から身を守れなくなった');
    } else if (this.shelterHP <= 30) {
      GameEventBus.emit(GAME_EVENTS.NOTIFICATION, `⚠️ シェルターが大きく損傷（残HP:${this.shelterHP}）`);
    }
  }

  // 新クラフト：槍・矢・作業台
  canCraftSpear(): boolean {
    if (this.inventory.wood < 2 || this.inventory.stone < 3) return false;
    this.inventory.wood  -= 2;
    this.inventory.stone -= 3;
    this.inventory.spear += 1;
    this.toolConditions.spear = 100;
    GameEventBus.emit(GAME_EVENTS.INVENTORY_UPDATED, this.inventory);
    this.addXP(45, 'builder');
    this._tryUnlockTech1();
    return true;
  }

  canCraftArrow(): boolean {
    if (this.inventory.wood < 1 || this.inventory.stone < 1 || this.inventory.fiber < 1) return false;
    this.inventory.wood  -= 1;
    this.inventory.stone -= 1;
    this.inventory.fiber -= 1;
    this.inventory.arrow += 3;
    GameEventBus.emit(GAME_EVENTS.INVENTORY_UPDATED, this.inventory);
    this.addXP(15, 'builder');
    return true;
  }

  canCraftWorkbench(): boolean {
    if (this.inventory.wood < 5 || this.inventory.stone < 4) return false;
    this.inventory.wood  -= 5;
    this.inventory.stone -= 4;
    GameEventBus.emit(GAME_EVENTS.INVENTORY_UPDATED, this.inventory);
    this.addXP(60, 'builder');
    return true;
  }

  // ── XP・レベル ─────────────────────────────────────────────
  addXP(amount: number, source?: SkillName): void {
    let bonus = 1.0;
    if (source && this.skills[source] >= 3) bonus = 1.5;
    this.xp += Math.floor(amount * bonus);
    const needed = this.xpToNextLevel();
    if (this.xp >= needed) {
      this.xp -= needed;
      this.level++;
      this.skillPoints++;
      GameEventBus.emit(GAME_EVENTS.LEVEL_UP, this.level);
      GameEventBus.emit(GAME_EVENTS.NOTIFICATION, `🎉 レベルアップ！Lv${this.level} — スキルポイント+1`);
      this.mentalHealth = Math.min(100, this.mentalHealth + 20);
    }
    GameEventBus.emit(GAME_EVENTS.XP_GAINED, { xp: this.xp, level: this.level, needed: this.xpToNextLevel() });
  }

  xpToNextLevel(): number {
    return this.level * this.level * 80;
  }

  unlockSkill(name: SkillName): boolean {
    if (this.skillPoints < 1) return false;
    if (this.skills[name] >= 3) return false;
    this.skillPoints--;
    (this.skills[name] as number)++;
    GameEventBus.emit(GAME_EVENTS.SKILL_UPDATED, { ...this.skills });
    GameEventBus.emit(GAME_EVENTS.NOTIFICATION, `✨ スキル解放: ${this._skillLabel(name)} Lv${this.skills[name]}`);
    return true;
  }

  private _skillLabel(s: SkillName): string {
    const m: Record<SkillName, string> = {
      hunter: '狩人', gatherer: '採集家', cook: '料理人',
      medic: '医療家', builder: '建設家', explorer: '探索家',
    };
    return m[s];
  }

  // ── 道具耐久度 ─────────────────────────────────────────────
  useToolDurability(tool: keyof ToolDurability): boolean {
    if (this.toolDurability[tool] <= 0) return false; // 壊れていて使用不可
    this.toolDurability[tool]--;
    if (this.toolDurability[tool] === 0) {
      if (tool === 'stoneAxe')   { this.inventory.stoneAxe--;   }
      if (tool === 'stoneKnife') { this.inventory.stoneKnife--; }
      if (tool === 'fishingRod') { this.inventory.fishingRod--; }
      GameEventBus.emit(GAME_EVENTS.INVENTORY_UPDATED, this.inventory);
      GameEventBus.emit(GAME_EVENTS.NOTIFICATION, `💥 ${tool} が壊れた！再クラフトが必要`);
    }
    return true;
  }

  // ── 採集量（スキル・弱体・道具条件考慮） ──────────────────
  getWoodHarvestAmount(): number {
    let base = 1;
    if (this.inventory.stoneAxe > 0) {
      const eff = this.getToolEffectiveness('stoneAxe');
      base = Math.floor(2 * eff);
      this.degradeTool('stoneAxe', 4);
    }
    if (this.skills.gatherer >= 1) base += 1;
    return this.hasMuscleWeakness ? Math.max(1, Math.floor(base * 0.7)) : base;
  }

  getMeatHarvestBonus(): number {
    let bonus = 0;
    if (this.inventory.stoneKnife > 0) {
      bonus += Math.round(1 * this.getToolEffectiveness('stoneKnife'));
      this.degradeTool('stoneKnife', 5);
    }
    if (this.skills.hunter >= 1) bonus += 1;
    return bonus;
  }

  getPlayerSpeed(): number {
    let speed = 200;
    if (this.hasMuscleWeakness)   speed *= 0.9;
    if (this.isCramped)           speed  = 0;
    if (this.skills.explorer >= 2) speed *= 1.15;
    return speed;
  }

  /**
   * 動物の探知レンジ乗数を返す
   * - 下風（動物→プレイヤーが風下）: 0.45 (ステルス可)
   * - 上風: 1.35 (気づかれやすい)
   * - 移動ノイズ: ×1.25
   */
  getAnimalDetectionMult(animalX: number, animalY: number, playerX: number, playerY: number): number {
    const approachAngle = Math.atan2(playerY - animalY, playerX - animalX);
    const diff = Math.abs(Math.atan2(
      Math.sin(approachAngle - this.windAngle),
      Math.cos(approachAngle - this.windAngle),
    ));
    const windMult = diff > (Math.PI * 2 / 3) ? 0.45
      : diff < (Math.PI / 3) ? 1.35 : 1.0;
    const noiseMult = this.playerIsMoving ? 1.25 : 0.80;
    return windMult * noiseMult;
  }

  getEnemySpeedMultiplier(): number {
    // 食物連鎖：ウサギが少ないほど狼が凶暴化
    let base = this.currentSeason === 'winter' ? 1.3 : 1.0;
    if (this.rabbitCount < 5)        base *= 1.5;
    else if (this.rabbitCount < 10)  base *= 1.2;
    return base;
  }

  onNewDay(): void {
    this.daysAlive++;
    this.score = this.calculateScore();
    GameEventBus.emit(GAME_EVENTS.SCORE_UPDATED, this.score);
    this.updateSeason();
    this._tickNutritionDaily();
  }

  private _tickNutritionDaily(): void {
    // 日次減少
    this.vitaminC = Math.max(0, this.vitaminC - 5);
    this.salt     = Math.max(0, this.salt - 8);
    this.protein  = Math.max(0, this.protein - 12);
    GameEventBus.emit(GAME_EVENTS.NUTRITION_UPDATED, { vitaminC: this.vitaminC, salt: this.salt, protein: this.protein });

    // 欠乏日数カウント
    if (this.vitaminC < 20) this.vitaminCDefDays++; else this.vitaminCDefDays = 0;
    if (this.salt     < 20) this.saltDefDays++;      else this.saltDefDays     = 0;
    if (this.protein  < 20) this.proteinDefDays++;   else this.proteinDefDays  = 0;

    // 壊血病（ビタミンC欠乏14日）
    if (this.vitaminCDefDays >= 14 && !this.hasScurvy) {
      this.hasScurvy = true;
      this.maxHealth = Math.max(50, this.maxHealth - 20);
      GameEventBus.emit(GAME_EVENTS.NOTIFICATION, '⚠️ 壊血病が発症！HP上限-20（果物・ベリーを食べよう）');
    } else if (this.vitaminCDefDays === 0 && this.hasScurvy) {
      this.hasScurvy = false;
      this.maxHealth = Math.min(100, this.maxHealth + 20);
      GameEventBus.emit(GAME_EVENTS.NOTIFICATION, '✅ 壊血病が回復した');
    }

    // 筋力低下（タンパク欠乏7日）
    if (this.proteinDefDays >= 7 && !this.hasMuscleWeakness) {
      this.hasMuscleWeakness = true;
      GameEventBus.emit(GAME_EVENTS.NOTIFICATION, '⚠️ 筋力が低下した… 採集量-30%・速度-10%（肉・魚を食べよう）');
    } else if (this.proteinDefDays === 0 && this.hasMuscleWeakness) {
      this.hasMuscleWeakness = false;
      GameEventBus.emit(GAME_EVENTS.NOTIFICATION, '✅ 筋力が回復した');
    }
  }

  addWood(amount: number): void {
    this.inventory.wood += amount;
    GameEventBus.emit(GAME_EVENTS.INVENTORY_UPDATED, this.inventory);
  }

  addStone(amount: number): void {
    this.inventory.stone += amount;
    GameEventBus.emit(GAME_EVENTS.INVENTORY_UPDATED, this.inventory);
  }

  addItem(key: keyof Inventory, amount: number): void {
    (this.inventory[key] as number) += amount;
    GameEventBus.emit(GAME_EVENTS.INVENTORY_UPDATED, this.inventory);
    // 技術書入手でTier2自動解放
    if (key === 'techManual' && this.inventory.techManual >= 1) this.unlockTech2();
  }

  canCraftCampfire(): boolean {
    if (this.inventory.wood < 3 || this.inventory.stone < 3) return false;
    this.inventory.wood  -= 3;
    this.inventory.stone -= 3;
    GameEventBus.emit(GAME_EVENTS.INVENTORY_UPDATED, this.inventory);
    this.addXP(30, 'builder');
    return true;
  }

  canCraftSaveHouse(): boolean {
    const woodCost = this.skills.builder >= 1 ? 9 : 10;
    if (this.inventory.wood < woodCost || this.inventory.stone < 6) return false;
    this.inventory.wood  -= woodCost;
    this.inventory.stone -= 6;
    this.saveHouseCount++;
    GameEventBus.emit(GAME_EVENTS.INVENTORY_UPDATED, this.inventory);
    this.addXP(80, 'builder');
    this._checkSettlementProgress();
    return true;
  }

  canCraftBandage(): boolean {
    if (this.inventory.fiber < 2) return false;
    this.inventory.fiber   -= 2;
    this.inventory.bandage += 1;
    GameEventBus.emit(GAME_EVENTS.INVENTORY_UPDATED, this.inventory);
    return true;
  }

  canCraftHerbMedicine(): boolean {
    if (this.inventory.herbs < 3) return false;
    this.inventory.herbs       -= 3;
    this.inventory.herbMedicine += 1;
    GameEventBus.emit(GAME_EVENTS.INVENTORY_UPDATED, this.inventory);
    return true;
  }

  canCraftRaft(): boolean {
    if (this.inventory.wood < 8 || this.inventory.vine < 6) return false;
    this.inventory.wood -= 8;
    this.inventory.vine -= 6;
    GameEventBus.emit(GAME_EVENTS.INVENTORY_UPDATED, this.inventory);
    return true;
  }

  // ── Tier 1 クラフト ─────────────────────────────────────────
  canCraftStoneKnife(): boolean {
    if (this.inventory.stone < 2) return false;
    this.inventory.stone    -= 2;
    this.inventory.stoneKnife += 1;
    GameEventBus.emit(GAME_EVENTS.INVENTORY_UPDATED, this.inventory);
    this._tryUnlockTech1();
    return true;
  }

  canCraftStoneAxe(): boolean {
    if (this.inventory.stone < 3 || this.inventory.wood < 1) return false;
    this.inventory.stone   -= 3;
    this.inventory.wood    -= 1;
    this.inventory.stoneAxe += 1;
    GameEventBus.emit(GAME_EVENTS.INVENTORY_UPDATED, this.inventory);
    this._tryUnlockTech1();
    return true;
  }

  canCraftFishingRod(): boolean {
    if (this.techLevel < 1) return false;
    if (this.inventory.wood < 2 || this.inventory.vine < 2) return false;
    this.inventory.wood      -= 2;
    this.inventory.vine      -= 2;
    this.inventory.fishingRod += 1;
    GameEventBus.emit(GAME_EVENTS.INVENTORY_UPDATED, this.inventory);
    return true;
  }

  canCraftTrap(): boolean {
    if (this.techLevel < 1) return false;
    if (this.inventory.wood < 3 || this.inventory.vine < 1) return false;
    this.inventory.wood -= 3;
    this.inventory.vine -= 1;
    this.inventory.trap  += 1;
    GameEventBus.emit(GAME_EVENTS.INVENTORY_UPDATED, this.inventory);
    return true;
  }

  canCraftWarmClothing(): boolean {
    if (this.techLevel < 1) return false;
    if (this.inventory.fiber < 4 || this.inventory.rawMeat < 2) return false;
    this.inventory.fiber       -= 4;
    this.inventory.rawMeat     -= 2; // 毛皮代わり
    this.inventory.warmClothing += 1;
    GameEventBus.emit(GAME_EVENTS.INVENTORY_UPDATED, this.inventory);
    return true;
  }

  cookFish(): boolean {
    if (this.inventory.rawFish < 1) return false;
    this.inventory.rawFish   -= 1;
    this.inventory.cookedFish += 1;
    GameEventBus.emit(GAME_EVENTS.INVENTORY_UPDATED, this.inventory);
    return true;
  }

  eatCookedFish(): void {
    if (this.inventory.cookedFish < 1) return;
    this.inventory.cookedFish--;
    this.eatFood(65, 'safe');
    this._addNutrition(5, 10, 20);
    GameEventBus.emit(GAME_EVENTS.INVENTORY_UPDATED, this.inventory);
  }

  eatSeaweed(): void {
    if (this.inventory.seaweed < 1) return;
    this.inventory.seaweed--;
    this.eatFood(10, 'safe');
    this._addNutrition(5, 30, 5);
    GameEventBus.emit(GAME_EVENTS.INVENTORY_UPDATED, this.inventory);
  }

  private _addNutrition(vc: number, sl: number, pr: number): void {
    this.vitaminC = Math.min(100, this.vitaminC + vc);
    this.salt     = Math.min(100, this.salt     + sl);
    this.protein  = Math.min(100, this.protein  + pr);
    GameEventBus.emit(GAME_EVENTS.NUTRITION_UPDATED, { vitaminC: this.vitaminC, salt: this.salt, protein: this.protein });
  }

  deployTrap(): boolean {
    if (this.inventory.trap < 1) return false;
    this.inventory.trap--;
    this.trapsActive++;
    GameEventBus.emit(GAME_EVENTS.INVENTORY_UPDATED, this.inventory);
    GameEventBus.emit(GAME_EVENTS.NOTIFICATION, `🪤 罠を設置した（${this.TRAP_CATCH_MINUTES}ゲーム分後に収穫）`);
    return true;
  }

  canCraftFarmPlot(): boolean {
    if (this.inventory.wood < 3 || this.inventory.stone < 1) return false;
    this.inventory.wood  -= 3;
    this.inventory.stone -= 1;
    GameEventBus.emit(GAME_EVENTS.INVENTORY_UPDATED, this.inventory);
    this.addXP(40, 'builder');
    return true;
  }

  onFarmHarvested(): void {
    this.farmsHarvested++;
    this.addXP(50, 'gatherer');
    GameEventBus.emit(GAME_EVENTS.FARM_HARVESTED, this.farmsHarvested);
    this._checkSettlementProgress();
  }

  private _checkSettlementProgress(): void {
    const hasWater    = this.generatorRepaired || this.waterPumpActive;
    const hasShelter  = this.saveHouseCount >= 1;
    const hasFarm     = this.farmsHarvested >= 3;
    const survived30  = this.daysAlive >= 30;
    GameEventBus.emit(GAME_EVENTS.SETTLEMENT_PROGRESS, { hasWater, hasShelter, hasFarm, survived30 });
    if (hasWater && hasShelter && hasFarm && survived30) {
      GameEventBus.emit(GAME_EVENTS.GAME_WIN, 'settle');
    }
  }

  private _tryUnlockTech1(): void {
    if (this.techLevel === 0) {
      this.techLevel = 1;
      GameEventBus.emit(GAME_EVENTS.TECH_LEVEL_UP, 1);
      GameEventBus.emit(GAME_EVENTS.NOTIFICATION, '🔬 技術レベル1解放！釣り竿・罠・防寒具が作れるようになった');
    }
  }

  unlockTech2(): void {
    if (this.techLevel < 2) {
      this.techLevel = 2;
      GameEventBus.emit(GAME_EVENTS.TECH_LEVEL_UP, 2);
      GameEventBus.emit(GAME_EVENTS.NOTIFICATION, '🔬 技術レベル2解放！船・ヘリの修理が可能になった');
    }
  }

  cookMeat(): boolean {
    if (this.inventory.rawMeat < 1) return false;
    this.inventory.rawMeat   -= 1;
    this.inventory.cookedMeat += 1;
    GameEventBus.emit(GAME_EVENTS.INVENTORY_UPDATED, this.inventory);
    return true;
  }

  takeDamage(amount: number): void {
    if (!this.isAlive || this.isInvincible) return;
    this.health = Math.max(0, this.health - amount);
    GameEventBus.emit(GAME_EVENTS.HEALTH_UPDATED, this.health);
    // 攻撃を受けたら出血状態にする
    if (!this.statusEffects.bleeding && !this.statusEffects.deepWound) {
      this.statusEffects.bleeding = true;
      this.bleedingTimer = 0;
      GameEventBus.emit(GAME_EVENTS.STATUS_EFFECT_CHANGED, this.statusEffects);
    }
    this._checkDeath();
  }

  consumeHunger(amount: number): void {
    this.hunger = Math.max(0, this.hunger - amount);
    GameEventBus.emit(GAME_EVENTS.HUNGER_UPDATED, this.hunger);
    if (this.hunger === 0 && this.isAlive) {
      this.health = Math.max(0, this.health - 2);
      GameEventBus.emit(GAME_EVENTS.HEALTH_UPDATED, this.health);
      this._checkDeath();
    }
  }

  eatFood(amount: number, type: 'safe' | 'raw' = 'safe', isVitaminC = false): void {
    if (isVitaminC) this._addNutrition(20, 0, 0); // ベリーなど
    if (type === 'raw' && Math.random() < 0.25 && this.skills.cook < 2) {
      this.statusEffects.foodPoisoning = true;
      this.foodPoiTimer = 0;
      GameEventBus.emit(GAME_EVENTS.STATUS_EFFECT_CHANGED, this.statusEffects);
    }
    this.hunger = Math.min(this.maxHunger, this.hunger + amount);
    GameEventBus.emit(GAME_EVENTS.HUNGER_UPDATED, this.hunger);
  }

  eatCookedMeat(): void {
    if (this.inventory.cookedMeat < 1) return;
    this.inventory.cookedMeat--;
    const bonus = this.skills.cook >= 1 ? 15 : 0;
    this.eatFood(55 + bonus, 'safe');
    this._addNutrition(0, 5, 25);
    GameEventBus.emit(GAME_EVENTS.INVENTORY_UPDATED, this.inventory);
    this.addXP(20, 'cook');
  }

  eatCannedFood(): void {
    if (this.inventory.cannedFood < 1) return;
    this.inventory.cannedFood--;
    this.eatFood(30, 'safe');
    this.drinkWater(10);
    this._addNutrition(8, 15, 10);
    GameEventBus.emit(GAME_EVENTS.INVENTORY_UPDATED, this.inventory);
  }

  manualSave(): void {
    this.lastSaveTime = this.totalMinutes;
    SaveSystem.save(this);
  }

  advanceTime(mins: number): void {
    const prevHour = this.time.hour;
    const prevMin  = this.time.minute;
    this.totalMinutes += mins;
    this.time.day    = Math.floor(this.totalMinutes / 1440) + 1;
    this.time.hour   = Math.floor((this.totalMinutes % 1440) / 60);
    this.time.minute = this.totalMinutes % 60;

    if (this.time.hour === 0 && this.time.minute === 0 && (prevHour !== 0 || prevMin !== 0)) {
      this.onNewDay();
    }
    GameEventBus.emit(GAME_EVENTS.TIME_UPDATED, this.time);

    // 潮汐更新（360ゲーム分=6ゲーム時間サイクル）
    this.tideMinutes = this.totalMinutes % 720;
    const newTide: TideLevel = this.tideMinutes < 360 ? 'low' : 'high';
    if (newTide !== this.tideLevel) {
      this.tideLevel = newTide;
      GameEventBus.emit(GAME_EVENTS.TIDE_CHANGED, this.tideLevel);
    }
  }

  /** 干潮が完了するまでの残りゲーム分（0〜360） */
  getTideProgressRatio(): number {
    return this.tideMinutes < 360
      ? this.tideMinutes / 360        // 干潮中の進行度
      : (this.tideMinutes - 360) / 360; // 満潮中の進行度
  }
}

export const gameState = new GameState();
