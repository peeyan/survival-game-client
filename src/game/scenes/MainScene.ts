import Phaser from 'phaser';
import { createNoise2D } from 'simplex-noise';
import {
  Player, Tree, Stone, Campfire, Berry, Rabbit, Deer, WildBoar, Bear, SaveHouse,
  Wolf, LootCrate, FarmPlot, Arrow, Workbench,
} from '../objects/index';
import { GameEventBus, GAME_EVENTS, gameState, SaveSystem } from '../../logic/index';
import type { SaveData } from '../../logic/index';
import type { WeatherType } from '../../logic/GameState';
import { bgmSystem, type BGMState } from '../systems/BGMSystem';
import { mulberry32 } from '../systems/SeededRandom';
import { multiplayerManager, type RemotePlayerData } from '../systems/MultiplayerManager';
import RemotePlayer from '../objects/RemotePlayer';

export class MainScene extends Phaser.Scene {
  private player!: Player;
  private trees!: Phaser.GameObjects.Group;
  private stones!: Phaser.GameObjects.Group;
  private campfires!: Phaser.GameObjects.Group;
  private berries!: Phaser.GameObjects.Group;
  private saveHouses!: Phaser.GameObjects.Group;
  private lootCrates!: Phaser.GameObjects.Group;
  private seaweeds!: Phaser.GameObjects.Group;
  private farmPlots:    FarmPlot[]     = [];
  private arrows:       Arrow[]        = [];
  private workbenches:  Workbench[]    = [];
  private remotePlayers: Map<string, RemotePlayer> = new Map();
  private lastWeatherForShelter: string = 'sunny';
  private gameStateHostTimer = 0; // ゲーム状態送信タイマー（ホスト用）

  // ワールド生成シード（マルチプレイヤー時は共有）
  public worldSeed = 0;
  private waterTiles!: Phaser.Physics.Arcade.StaticGroup;
  private rabbits: Rabbit[] = [];
  private deers:   Deer[]   = [];
  private boars:   WildBoar[] = [];
  private bears:   Bear[]   = [];
  private wolves:  Wolf[]   = [];

  private darkness!: Phaser.GameObjects.RenderTexture;

  // 天候オーバーレイ
  private weatherOverlay!: Phaser.GameObjects.RenderTexture;
  private currentWeather: WeatherType = 'sunny';

  // BGM状態トラッカー（毎フレーム呼ばないためのキャッシュ）
  private lastBGMState: BGMState = 'day';

  // 潮汐
  private tideBarrier!: Phaser.Physics.Arcade.StaticGroup;
  private tideZoneOverlay!: Phaser.GameObjects.Rectangle;
  private readonly REEF_X = 20000 * 0.82;
  private readonly REEF_Y = 20000 * 0.80;

  // SOS
  private readonly GEN_X = 20000 * 0.72;
  private readonly GEN_Y = 20000 * 0.18;
  private generatorSprite!: Phaser.GameObjects.Image;

  // 船修理 END
  private readonly HARBOR_X = 20000 * 0.68;
  private readonly HARBOR_Y = 20000 * 0.21;
  // ヘリEND
  private readonly HELI_X = 20000 * 0.73;
  private readonly HELI_Y = 20000 * 0.12;

  // 釣りタイマー
  private isFishing = false;
  private fishingTimer = 0;

  // 足音・サウンドタイマー
  private footstepTimer   = 0;
  private footstepInterval = 380;
  private hungerWarnTimer = 0;
  private hungerWarnInterval = 8000;

  private isPaused = false;

  // ── イベントハンドラ ─────────────────────────────────────────
  private handleActionButton  = () => { this.tryInteract(); };
  private handleCraftRequest  = () => {
    if (!this.player) return;
    if (gameState.canCraftCampfire()) {
      const fire = new Campfire(this, this.player.x, this.player.y + 20);
      this.campfires.add(fire);
      this.sound.play('se_craft_success', { volume: 0.8 });
    }
  };
  private handleCraftSaveHouse = () => {
    if (!this.player) return;
    if (gameState.canCraftSaveHouse()) {
      const sh = new SaveHouse(this, this.player.x, this.player.y + 30);
      this.saveHouses.add(sh);
      this.physics.add.collider(this.player, sh);
      this.sound.play('se_craft_success', { volume: 0.9 });
    }
  };
  private handleCraftRaft = () => {
    if (gameState.canCraftRaft()) {
      this.sound.play('se_craft_success', { volume: 1.0 });
      GameEventBus.emit(GAME_EVENTS.GAME_WIN, 'raft');
    }
  };
  private handleCraftBandage = () => {
    gameState.canCraftBandage();
    GameEventBus.emit(GAME_EVENTS.INVENTORY_UPDATED, gameState.inventory);
  };
  private handleCraftHerbMedicine = () => {
    gameState.canCraftHerbMedicine();
    GameEventBus.emit(GAME_EVENTS.INVENTORY_UPDATED, gameState.inventory);
  };
  private handleCookMeat = () => {
    if (!this.player) return;
    const nearFire = this.campfires.getChildren().some((cf: any) =>
      Phaser.Math.Distance.Between(this.player.x, this.player.y, cf.x, cf.y) < 80
    );
    if (nearFire && gameState.cookMeat()) {
      this.sound.play('se_craft_success', { volume: 0.7 });
    }
  };
  private handleCookFish = () => {
    if (!this.player) return;
    const nearFire = this.campfires.getChildren().some((cf: any) =>
      Phaser.Math.Distance.Between(this.player.x, this.player.y, cf.x, cf.y) < 80
    );
    if (nearFire && gameState.cookFish()) {
      this.sound.play('se_craft_success', { volume: 0.7 });
    }
  };
  private handleCraftStoneKnife   = () => { gameState.canCraftStoneKnife();   this.sound.play('se_craft_success', { volume: 0.7 }); };
  private handleCraftStoneAxe     = () => { gameState.canCraftStoneAxe();     this.sound.play('se_craft_success', { volume: 0.7 }); };
  private handleCraftFishingRod   = () => { gameState.canCraftFishingRod();   this.sound.play('se_craft_success', { volume: 0.8 }); };
  private handleCraftTrap         = () => { gameState.canCraftTrap();         this.sound.play('se_craft_success', { volume: 0.7 }); };
  private handleCraftWarmClothing = () => { gameState.canCraftWarmClothing(); this.sound.play('se_craft_success', { volume: 0.8 }); };
  private handleCraftSpear = () => {
    if (gameState.canCraftSpear()) this.sound.play('se_craft_success', { volume: 0.9 });
  };
  private handleCraftArrow = () => {
    if (gameState.canCraftArrow()) this.sound.play('se_craft_success', { volume: 0.6 });
  };
  private handleCraftWorkbench = () => {
    if (!this.player) return;
    if (gameState.canCraftWorkbench()) {
      const wb = new Workbench(this, this.player.x + 80, this.player.y);
      this.workbenches.push(wb);
      this.sound.play('se_craft_success', { volume: 1.0 });
    }
  };
  private handleArrowFired = (data: { x: number; y: number; angle: number; damage: number }) => {
    const arrow = new Arrow(this, data.x, data.y, data.angle, data.damage);
    this.physics.add.existing(arrow);
    this.arrows.push(arrow);
  };
  private handleCraftFarmPlot = () => {
    if (!this.player) return;
    if (gameState.canCraftFarmPlot()) {
      const fp = new FarmPlot(this, this.player.x + 60, this.player.y, 'berry');
      this.farmPlots.push(fp);
      this.sound.play('se_craft_success', { volume: 0.8 });
      GameEventBus.emit(GAME_EVENTS.FARM_PLACED, this.farmPlots.length);
    }
  };
  private handlePlayerDied = () => {
    GameEventBus.emit(GAME_EVENTS.GAME_OVER, undefined);
    this.scene.pause();
  };
  private handlePlayerTookDamage = () => {
    if (this.sound.get('se_damage')) this.sound.play('se_damage', { volume: 0.7 });
  };
  private handlePauseToggle = () => {
    if (this.isPaused) {
      this.isPaused = false;
      this.scene.resume();
      GameEventBus.emit(GAME_EVENTS.GAME_RESUMED);
    } else {
      this.isPaused = true;
      this.scene.pause();
      GameEventBus.emit(GAME_EVENTS.GAME_PAUSED);
    }
  };
  private handleGameResumed = () => {
    if (this.isPaused) { this.isPaused = false; this.scene.resume(); }
  };
  private handleGameLoaded = (saveData: SaveData) => {
    SaveSystem.applySave(saveData, gameState);
  };
  private handleWeatherChanged = (w: WeatherType) => {
    this.currentWeather = w;
    this._updateWeatherOverlay();
  };
  private handlePlayerAttackEvent = (data: { x: number; y: number; angle: number; range?: number; arc?: number; damage?: number }) => {
    this._doMeleeAttack(data.x, data.y, data.angle, data.range, data.arc, data.damage);
  };
  private handleMentalEffect = (msg: string) => {
    GameEventBus.emit(GAME_EVENTS.NOTIFICATION, msg);
  };
  private handleTideChanged = (tide: 'low' | 'high') => {
    this._applyTide(tide);
    const msg = tide === 'low' ? '🏖️ 干潮 — 珊瑚礁への道が開いた' : '🌊 満潮 — 珊瑚礁への道が塞がれた';
    GameEventBus.emit(GAME_EVENTS.NOTIFICATION, msg);
  };

  constructor() {
    super({ key: 'MainScene' });
  }

  preload() {
    this.load.spritesheet('player-sprite', '/assets/player.png', {
      frameWidth: 48, frameHeight: 48,
    });
    this.load.image('tree-img',     '/assets/tree.png');
    this.load.image('stone-img',    '/assets/stone.png');
    this.load.image('campfire-img', '/assets/campfire.png');

    this.load.audio('se_wood_chop',      '/assets/sounds/se/se_wood_chop.ogg');
    this.load.audio('se_stone_hit',      '/assets/sounds/se/se_stone_hit.ogg');
    this.load.audio('se_eat',            '/assets/sounds/se/se_eat.ogg');
    this.load.audio('se_craft_success',  '/assets/sounds/se/se_craft_success.ogg');
    this.load.audio('se_damage',         '/assets/sounds/se/se_damage.ogg');
    this.load.audio('se_warning_hunger', '/assets/sounds/se/se_warning_hunger.ogg');
    this.load.audio('se_footstep_grass', '/assets/sounds/se/se_footstep_grass.ogg');

    this._generateAnimalTextures();
    this._generateTileTextures();
    this._generateDecoTextures();
    this._generateBuildingTextures();
  }

  private _generateAnimalTextures(): void {
    const ag = this.add.graphics();

    // ウサギ
    ag.clear();
    ag.fillStyle(0xdddddd, 1); ag.fillEllipse(16, 22, 22, 16);
    ag.fillStyle(0xcccccc, 1); ag.fillRect(10, 4, 5, 16); ag.fillRect(17, 4, 5, 16);
    ag.fillStyle(0xffaaaa, 0.8); ag.fillRect(11, 6, 3, 12); ag.fillRect(18, 6, 3, 12);
    ag.fillStyle(0x222222, 1); ag.fillCircle(20, 20, 2);
    ag.generateTexture('rabbit-img', 32, 32);

    // シカ
    ag.clear();
    ag.fillStyle(0xb87040, 1); ag.fillEllipse(24, 32, 28, 20); ag.fillEllipse(24, 18, 14, 12);
    ag.fillStyle(0x7a4a20, 1);
    ag.fillRect(14, 4, 3, 14); ag.fillRect(10, 4, 7, 3);
    ag.fillRect(31, 4, 3, 14); ag.fillRect(31, 4, 7, 3);
    ag.fillStyle(0xfff0e0, 1); ag.fillEllipse(24, 36, 16, 10);
    ag.fillStyle(0x111111, 1); ag.fillCircle(28, 16, 2);
    ag.generateTexture('deer-img', 48, 48);

    // イノシシ
    ag.clear();
    ag.fillStyle(0x4a2e10, 1); ag.fillEllipse(24, 30, 32, 22); ag.fillEllipse(22, 20, 18, 14);
    ag.fillStyle(0xaaaaaa, 1); ag.fillRect(10, 22, 8, 3); ag.fillRect(10, 25, 5, 6);
    ag.fillStyle(0xffffff, 1); ag.fillRect(10, 22, 6, 2); ag.fillRect(32, 22, 6, 2);
    ag.fillStyle(0x111111, 1); ag.fillCircle(28, 18, 2);
    ag.generateTexture('boar-img', 48, 48);

    // クマ
    ag.clear();
    ag.fillStyle(0x2e1a08, 1);
    ag.fillCircle(28, 36, 18); ag.fillCircle(24, 20, 12);
    ag.fillCircle(15, 12, 6); ag.fillCircle(33, 12, 6);
    ag.fillStyle(0x4a2e10, 1); ag.fillCircle(24, 22, 8);
    ag.fillStyle(0x111111, 1); ag.fillCircle(27, 18, 2);
    ag.generateTexture('bear-img', 56, 56);

    // セーブハウス
    ag.clear();
    ag.fillStyle(0x8b5e3c, 1); ag.fillRect(10, 36, 60, 36);
    ag.fillStyle(0xcc4400, 1); ag.fillTriangle(8, 36, 72, 36, 40, 8);
    ag.fillStyle(0x5a3a20, 1); ag.fillRect(30, 52, 20, 20);
    ag.fillStyle(0x6ec6f5, 0.6); ag.fillRect(14, 42, 12, 12); ag.fillRect(54, 42, 12, 12);
    ag.generateTexture('savehouse-img', 80, 80);

    ag.destroy();
  }

  private _generateTileTextures(): void {
    const makeTile = (key: string, base: number, spots?: { color: number; alpha: number; count: number }) => {
      const g = this.add.graphics();
      g.fillStyle(base, 1);
      g.fillRect(0, 0, 64, 64);
      if (spots) {
        for (let i = 0; i < spots.count; i++) {
          const sx = Phaser.Math.Between(4, 60);
          const sy = Phaser.Math.Between(4, 60);
          const sr = Phaser.Math.Between(2, 6);
          g.fillStyle(spots.color, spots.alpha);
          g.fillCircle(sx, sy, sr);
        }
      }
      g.generateTexture(key, 64, 64);
      g.destroy();
    };

    makeTile('tile-deep-water',    0x1a3a8a, { color: 0x2a4faa, alpha: 0.4, count: 6 });
    makeTile('tile-shallow-water', 0x3d75c0, { color: 0x6499d4, alpha: 0.5, count: 8 });
    makeTile('tile-sand',          0xc9a84c, { color: 0xdfc06a, alpha: 0.4, count: 5 });
    makeTile('tile-grass',         0x3a8c3a, { color: 0x2d6e2d, alpha: 0.3, count: 4 });
    makeTile('tile-forest',        0x1d5c1d, { color: 0x154814, alpha: 0.4, count: 3 });
    makeTile('tile-dirt',          0x8b6340, { color: 0xa07848, alpha: 0.35, count: 5 });
    // 廃村用タイル（灰色のコンクリート風）
    makeTile('tile-ruin',          0x888888, { color: 0x666666, alpha: 0.4, count: 8 });
  }

  private _generateDecoTextures(): void {
    const g2 = this.add.graphics();

    // 草むら
    g2.clear();
    g2.fillStyle(0x2e7d2e, 1);
    for (let i = 0; i < 5; i++) {
      const bx = 4 + i * 6;
      g2.fillTriangle(bx, 18, bx + 3, 4, bx + 6, 18);
    }
    g2.generateTexture('deco-grass-tuft', 36, 20);

    // 花
    g2.clear();
    const fc = [0xffdd44, 0xff88cc, 0xff6644, 0xaaddff][Phaser.Math.Between(0, 3)];
    g2.fillStyle(fc, 1);
    for (let a = 0; a < 4; a++) {
      g2.fillCircle(Math.cos(a * Math.PI / 2) * 4 + 8, Math.sin(a * Math.PI / 2) * 4 + 8, 3);
    }
    g2.fillStyle(0xffff88, 1);
    g2.fillCircle(8, 8, 3);
    g2.generateTexture('deco-flower', 16, 16);

    // 小石
    g2.clear();
    [[4,8],[9,5],[14,9],[7,13],[12,12]].forEach(([px, py]) => {
      g2.fillStyle(0x999999, 1); g2.fillEllipse(px, py, 5, 4);
      g2.fillStyle(0xbbbbbb, 0.6); g2.fillEllipse(px - 1, py - 1, 2, 2);
    });
    g2.generateTexture('deco-pebble', 20, 18);

    // 睡蓮
    g2.clear();
    g2.fillStyle(0x2d8a4e, 0.85); g2.fillEllipse(12, 12, 22, 18);
    g2.fillStyle(0xffccdd, 1); g2.fillCircle(12, 8, 4);
    g2.generateTexture('deco-lily', 24, 24);

    // ベリー
    g2.clear();
    g2.fillStyle(0xff3333, 1); g2.fillCircle(8, 8, 6);
    g2.fillStyle(0xcc0000, 0.5); g2.fillCircle(6, 6, 3);
    g2.generateTexture('berry-img', 16, 16);

    // 海藻
    g2.clear();
    g2.fillStyle(0x1a7a3a, 1);
    for (let i = 0; i < 4; i++) {
      const bx = 2 + i * 5;
      g2.fillEllipse(bx + 2, 8 - i * 2, 4, 10);
    }
    g2.generateTexture('seaweed-img', 22, 18);

    g2.destroy();
  }

  private _generateBuildingTextures(): void {
    const g = this.add.graphics();

    // 廃墟建物（壁だけ残った家）
    g.clear();
    g.fillStyle(0x888888, 1);
    g.fillRect(0, 16, 64, 48);    // 壁（前面）
    g.fillStyle(0x666666, 1);
    g.fillRect(0, 0, 64, 20);     // 崩れた屋根
    g.fillStyle(0x444444, 1);
    g.fillRect(24, 36, 16, 28);   // ドア穴
    g.fillStyle(0x999999, 0.5);
    g.fillRect(4, 22, 12, 10);    // 窓
    g.fillRect(48, 22, 12, 10);   // 窓
    g.lineStyle(2, 0x333333, 0.8);
    g.strokeRect(0, 16, 64, 48);
    g.generateTexture('ruin-building', 64, 64);

    // 発電機
    g.clear();
    g.fillStyle(0x555555, 1); g.fillRect(4, 8, 40, 24);
    g.fillStyle(0x333333, 1); g.fillRect(8, 12, 10, 16);
    g.fillStyle(0xff4400, 1); g.fillCircle(32, 18, 5);
    g.lineStyle(2, 0x222222, 1); g.strokeRect(4, 8, 40, 24);
    g.generateTexture('generator-img', 48, 40);

    // 朽ちた船（Harbor用）
    g.clear();
    g.fillStyle(0x6b4c2a, 1);
    g.fillRect(4, 20, 80, 28);   // 船体
    g.fillRect(0, 30, 10, 16);   // 舳先
    g.fillRect(78, 28, 12, 18);  // 艫
    g.fillStyle(0x4a3020, 1);
    g.fillRect(36, 4, 8, 24);    // マスト
    g.fillStyle(0xbbaa88, 0.6);
    g.fillRect(38, 8, 28, 14);   // 帆（ボロボロ）
    g.lineStyle(2, 0x3a2010, 1);
    g.strokeRect(4, 20, 80, 28);
    g.generateTexture('harbor-boat', 90, 48);

    // 墜落ヘリコプター
    g.clear();
    g.fillStyle(0x555555, 1);
    g.fillEllipse(44, 22, 70, 20); // 胴体
    g.fillStyle(0x333333, 1);
    g.fillRect(10, 20, 28, 8);     // 尾部
    g.fillStyle(0xaaaaaa, 0.7);
    // ローター（壊れた感じ）
    g.fillRect(22, 12, 44, 4);
    g.fillStyle(0xff4400, 0.8);
    g.fillCircle(44, 22, 6);       // 炎/損傷
    g.lineStyle(1.5, 0x222222, 1);
    g.strokeEllipse(44, 22, 70, 20);
    g.generateTexture('crashed-heli', 90, 44);

    g.destroy();
  }

  create() {
    this.anims.create({ key: 'walk-down',  frames: this.anims.generateFrameNumbers('player-sprite', { start: 0,  end: 5  }), frameRate: 10, repeat: -1 });
    this.anims.create({ key: 'walk-side',  frames: this.anims.generateFrameNumbers('player-sprite', { start: 6,  end: 11 }), frameRate: 10, repeat: -1 });
    this.anims.create({ key: 'walk-up',    frames: this.anims.generateFrameNumbers('player-sprite', { start: 12, end: 17 }), frameRate: 10, repeat: -1 });
    this.anims.create({ key: 'idle-down',  frames: [{ key: 'player-sprite', frame: 0  }], frameRate: 10 });
    this.anims.create({ key: 'idle-side',  frames: [{ key: 'player-sprite', frame: 6  }], frameRate: 10 });
    this.anims.create({ key: 'idle-up',    frames: [{ key: 'player-sprite', frame: 12 }], frameRate: 10 });

    const worldWidth  = 20000;
    const worldHeight = 20000;
    const tileSize    = 128;

    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.setBackgroundColor('#1a3a8a');

    // 光源マスク
    const maskG = this.add.graphics();
    for (let r = 100; r > 0; r -= 5) {
      maskG.fillStyle(0xffffff, 0.05);
      maskG.fillCircle(100, 100, r);
    }
    maskG.generateTexture('light-mask', 200, 200);
    maskG.destroy();

    // 暗闇レイヤー
    this.darkness = this.add.renderTexture(0, 0, this.cameras.main.width, this.cameras.main.height);
    this.darkness.setOrigin(0, 0).setScrollFactor(0).setDepth(9999);

    // 天候オーバーレイ
    this.weatherOverlay = this.add.renderTexture(0, 0, this.cameras.main.width, this.cameras.main.height);
    this.weatherOverlay.setOrigin(0, 0).setScrollFactor(0).setDepth(9998).setVisible(false);

    this.trees      = this.add.group();
    this.stones     = this.add.group();
    this.campfires  = this.add.group();
    this.berries    = this.add.group();
    this.lootCrates = this.add.group();
    this.seaweeds   = this.add.group();
    this.waterTiles = this.physics.add.staticGroup();

    // ── マップ生成（シード固定でマルチ全員同じワールド）────────
    const seed = this.worldSeed || Date.now();
    const rng  = mulberry32(seed);
    const noise2D  = createNoise2D(rng);
    const noise2D2 = createNoise2D(rng);
    const noise2D3 = createNoise2D(rng);
    const cx = worldWidth / 2, cy = worldHeight / 2;
    const maxDist = worldWidth / 2;
    const decorations = this.add.group();

    // 廃村ゾーン定義（北東固定）
    const villageX = worldWidth  * 0.72;
    const villageY = worldHeight * 0.18;
    const villageRadius = 1400;

    for (let y = 0; y < worldHeight; y += tileSize) {
      for (let x = 0; x < worldWidth; x += tileSize) {
        const tx = x + tileSize / 2;
        const ty = y + tileSize / 2;

        // 廃村ゾーンは特別処理
        const distToVillage = Phaser.Math.Distance.Between(tx, ty, villageX, villageY);
        if (distToVillage < villageRadius) {
          const tile = this.add.image(tx, ty, 'tile-ruin');
          tile.setDepth(-1000);
          // 廃墟建物をランダム配置
          if (Math.random() < 0.04) {
            const b = this.add.image(tx, ty, 'ruin-building');
            b.setDepth(ty);
          }
          continue;
        }

        const n1 = noise2D(x * 0.0002,  y * 0.0002);
        const n2 = noise2D2(x * 0.0009, y * 0.0009) * 0.45;
        const n3 = noise2D3(x * 0.004,  y * 0.004)  * 0.15;
        let nv = n1 + n2 + n3;

        const nx = (x - cx) / maxDist;
        const ny = (y - cy) / maxDist;
        const radial = Math.sqrt(nx * nx + ny * ny);
        nv -= Math.max(0, radial * 1.35 + n3 * 0.4);

        type Biome = 'deep-water' | 'shallow-water' | 'sand' | 'grass' | 'forest';
        let tileKey: string;
        let biome: Biome;

        if      (nv < -0.40) { tileKey = 'tile-deep-water';    biome = 'deep-water'; }
        else if (nv < -0.12) { tileKey = 'tile-shallow-water'; biome = 'shallow-water'; }
        else if (nv <  0.10) { tileKey = 'tile-sand';          biome = 'sand'; }
        else if (nv <  0.50) { tileKey = 'tile-grass';         biome = 'grass'; }
        else                 { tileKey = 'tile-forest';         biome = 'forest'; }

        if (biome === 'grass' && Math.random() < 0.04) tileKey = 'tile-dirt';

        const tile = this.add.image(tx, ty, tileKey);
        tile.setDepth(-1000);

        if (biome === 'deep-water' || biome === 'shallow-water') {
          const wb = this.add.rectangle(tx, ty, tileSize, tileSize);
          this.waterTiles.add(wb);
        }

        const r = Math.random();

        if (biome === 'forest') {
          if (r < 0.42) {
            const tree = new Tree(this, tx, ty);
            tree.setScale(2.2 + Math.random() * 1.4);
            const tint = Phaser.Display.Color.GetColor(
              20 + Math.floor(Math.random() * 20),
              80 + Math.floor(Math.random() * 40),
              20 + Math.floor(Math.random() * 20)
            );
            tree.setTint(tint);
            this.trees.add(tree);
          } else if (r < 0.46) {
            this.berries.add(new Berry(this, tx, ty));
          }
        } else if (biome === 'grass') {
          if (r < 0.10) {
            const tree = new Tree(this, tx, ty);
            tree.setScale(2.2 + Math.random() * 1.0);
            this.trees.add(tree);
          } else if (r < 0.12) {
            this.berries.add(new Berry(this, tx, ty));
          } else if (r < 0.15) {
            this.stones.add(new Stone(this, tx, ty));
          } else if (r < 0.26) {
            decorations.add(this.add.image(tx + Phaser.Math.Between(-8, 8), ty, 'deco-grass-tuft').setDepth(ty - 1));
          } else if (r < 0.30) {
            decorations.add(this.add.image(tx + Phaser.Math.Between(-10, 10), ty + Phaser.Math.Between(-8, 8), 'deco-flower').setDepth(ty - 1));
          }
        } else if (biome === 'sand') {
          if (r < 0.07) {
            this.stones.add(new Stone(this, tx, ty));
          } else if (r < 0.20) {
            decorations.add(this.add.image(tx + Phaser.Math.Between(-12, 12), ty + Phaser.Math.Between(-8, 8), 'deco-pebble').setDepth(ty - 1));
          }
        } else if (biome === 'shallow-water') {
          if (r < 0.06) {
            decorations.add(this.add.image(tx, ty, 'deco-lily').setDepth(ty - 1));
          } else if (r < 0.10) {
            // 海藻（採集可能）
            const sw = this.add.image(tx + Phaser.Math.Between(-16, 16), ty, 'seaweed-img');
            sw.setDepth(ty - 1);
            this.seaweeds.add(sw);
          }
        }
      }
    }

    // ── 廃村のLootCrate配置 ────────────────────────────────
    const lootPositions = [
      { x: villageX - 400, y: villageY + 200 },
      { x: villageX + 300, y: villageY - 100 },
      { x: villageX - 200, y: villageY - 400 },
      { x: villageX + 500, y: villageY + 300 },
      { x: villageX,       y: villageY + 600 },
      { x: villageX - 600, y: villageY - 200 },
      { x: villageX + 200, y: villageY - 600 },
      { x: villageX + 700, y: villageY + 100 },
    ];
    lootPositions.forEach(pos => {
      this.lootCrates.add(new LootCrate(this, pos.x, pos.y));
    });

    // 発電機（廃村中心・インタラクト対象）
    this.generatorSprite = this.add.image(this.GEN_X, this.GEN_Y, 'generator-img').setDepth(this.GEN_Y);

    // 朽ちた船（Harbor）
    this.add.image(this.HARBOR_X, this.HARBOR_Y, 'harbor-boat').setDepth(this.HARBOR_Y).setScale(1.8);

    // 墜落ヘリ（山頂）
    this.add.image(this.HELI_X, this.HELI_Y, 'crashed-heli').setDepth(this.HELI_Y).setScale(2.0);
    // 周辺に墜落ルートクレートを数個配置
    [
      { x: this.HELI_X - 200, y: this.HELI_Y + 100 },
      { x: this.HELI_X + 150, y: this.HELI_Y + 80  },
    ].forEach(pos => this.lootCrates.add(new LootCrate(this, pos.x, pos.y)));

    // ── 潮汐システム ─────────────────────────────────────────
    // 珊瑚礁エリアへの通路を塞ぐバリア（満潮時に有効）
    this.tideBarrier = this.physics.add.staticGroup();
    const barrierW = 800, barrierH = 200;
    const barrier = this.add.rectangle(this.REEF_X - 1000, this.REEF_Y, barrierW, barrierH, 0x2255aa, 0);
    this.physics.add.existing(barrier, true);
    this.tideBarrier.add(barrier);
    this.physics.add.collider(this.player, this.tideBarrier);

    // 珊瑚礁エリアのビジュアル（浅瀬タイル風）
    const reefSize = 1200;
    for (let rx = -reefSize / 2; rx < reefSize / 2; rx += 128) {
      for (let ry = -reefSize / 2; ry < reefSize / 2; ry += 128) {
        const rt = this.add.image(this.REEF_X + rx, this.REEF_Y + ry, 'tile-shallow-water');
        rt.setDepth(-999).setTint(0x88ddff);
      }
    }

    // 珊瑚礁の特殊ルートクレート（電子部品×3 + 缶詰×2）
    const reefCrate = new LootCrate(this, this.REEF_X, this.REEF_Y);
    (reefCrate as unknown as { loot: Record<string, number> }).loot = { electronicParts: 3, cannedFood: 2 };
    this.lootCrates.add(reefCrate);

    // 潮汐ゾーンオーバーレイ（満潮時に青く染まる）
    this.tideZoneOverlay = this.add.rectangle(
      this.REEF_X - 1000, this.REEF_Y, barrierW * 1.5, barrierH * 4, 0x2255cc, 0
    ).setDepth(9990);

    // 初期潮汐状態を適用
    this._applyTide(gameState.tideLevel);

    // ── プレイヤー・動物配置 ────────────────────────────────
    this.player    = new Player(this, worldWidth / 2, worldHeight / 2);
    this.saveHouses = this.add.group();

    const pX = worldWidth / 2, pY = worldHeight / 2;
    const minDist = 600;
    const spawnAnimal = <T>(count: number, factory: (x: number, y: number) => T): T[] => {
      return Array.from({ length: count }, () => {
        let rx = 0, ry = 0, tries = 0;
        do {
          rx = Phaser.Math.Between(500, worldWidth  - 500);
          ry = Phaser.Math.Between(500, worldHeight - 500);
          tries++;
        } while (Phaser.Math.Distance.Between(rx, ry, pX, pY) < minDist && tries < 50);
        return factory(rx, ry);
      });
    };

    this.rabbits = spawnAnimal(30, (x, y) => new Rabbit(this, x, y));
    this.deers   = spawnAnimal(20, (x, y) => new Deer(this, x, y));
    this.boars   = spawnAnimal(12, (x, y) => new WildBoar(this, x, y));
    this.bears   = spawnAnimal(6,  (x, y) => new Bear(this, x, y));
    this.wolves  = spawnAnimal(8,  (x, y) => new Wolf(this, x, y));

    this.physics.add.collider(this.player, this.trees);
    this.physics.add.collider(this.player, this.stones);
    this.physics.add.collider(this.player, this.berries);
    this.physics.add.collider(this.player, this.waterTiles);
    this.physics.add.collider(this.player, this.saveHouses);

    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // ── イベント登録 ─────────────────────────────────────────
    GameEventBus.on(GAME_EVENTS.ACTION_BUTTON,       this.handleActionButton);
    GameEventBus.on(GAME_EVENTS.CRAFT_REQUEST,       this.handleCraftRequest);
    GameEventBus.on(GAME_EVENTS.CRAFT_SAVEHOUSE,     this.handleCraftSaveHouse);
    GameEventBus.on(GAME_EVENTS.CRAFT_RAFT,          this.handleCraftRaft);
    GameEventBus.on(GAME_EVENTS.CRAFT_BANDAGE,       this.handleCraftBandage);
    GameEventBus.on(GAME_EVENTS.CRAFT_HERB_MEDICINE, this.handleCraftHerbMedicine);
    GameEventBus.on(GAME_EVENTS.COOK_MEAT,           this.handleCookMeat);
    GameEventBus.on(GAME_EVENTS.COOK_FISH,           this.handleCookFish);
    GameEventBus.on(GAME_EVENTS.CRAFT_STONE_KNIFE,   this.handleCraftStoneKnife);
    GameEventBus.on(GAME_EVENTS.CRAFT_STONE_AXE,     this.handleCraftStoneAxe);
    GameEventBus.on(GAME_EVENTS.CRAFT_FISHING_ROD,   this.handleCraftFishingRod);
    GameEventBus.on(GAME_EVENTS.CRAFT_TRAP,          this.handleCraftTrap);
    GameEventBus.on(GAME_EVENTS.CRAFT_WARM_CLOTHING, this.handleCraftWarmClothing);
    GameEventBus.on(GAME_EVENTS.CRAFT_FARM_PLOT,   this.handleCraftFarmPlot);
    GameEventBus.on(GAME_EVENTS.CRAFT_SPEAR,       this.handleCraftSpear);
    GameEventBus.on(GAME_EVENTS.CRAFT_ARROW,       this.handleCraftArrow);
    GameEventBus.on(GAME_EVENTS.CRAFT_WORKBENCH,   this.handleCraftWorkbench);
    GameEventBus.on(GAME_EVENTS.ARROW_FIRED,       this.handleArrowFired);

    // マルチ：インベントリ変化を全員に共有
    GameEventBus.on(GAME_EVENTS.INVENTORY_UPDATED, () => {
      if (multiplayerManager.isOnline) {
        multiplayerManager.pushInventory(gameState.inventory);
      }
    });

    // 希望：戦利品発見で精神衛生回復
    GameEventBus.on(GAME_EVENTS.LOOT_FOUND, () => {
      gameState.mentalHealth = Math.min(100, gameState.mentalHealth + 15);
      GameEventBus.emit(GAME_EVENTS.MENTAL_HEALTH_UPDATED, gameState.mentalHealth);
    });
    GameEventBus.on(GAME_EVENTS.PLAYER_DIED,         this.handlePlayerDied);
    GameEventBus.on(GAME_EVENTS.PLAYER_TOOK_DAMAGE,  this.handlePlayerTookDamage);
    GameEventBus.on(GAME_EVENTS.GAME_LOADED,         this.handleGameLoaded);
    GameEventBus.on(GAME_EVENTS.GAME_RESUMED,        this.handleGameResumed);
    GameEventBus.on(GAME_EVENTS.WEATHER_CHANGED,     this.handleWeatherChanged);
    GameEventBus.on(GAME_EVENTS.PLAYER_ATTACK,       this.handlePlayerAttackEvent);
    GameEventBus.on(GAME_EVENTS.TIDE_CHANGED,        this.handleTideChanged);
    GameEventBus.on(GAME_EVENTS.MENTAL_EFFECT,       this.handleMentalEffect);

    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-SPACE', this.handleActionButton);
      this.input.keyboard.on('keydown-ESC',   this.handlePauseToggle);
    }

    // 空腹タイマー（2秒ごと-1）
    this.time.addEvent({ delay: 2000, callback: () => { gameState.consumeHunger(1); }, loop: true });
    // ゲーム時間タイマー（1秒ごとにゲーム内10分進む）
    this.time.addEvent({ delay: 1000, callback: () => { gameState.advanceTime(10); }, loop: true });

    // BGM初期化（ユーザージェスチャ後なので安全）
    bgmSystem.init();

    // ── マルチプレイヤー統合 ──────────────────────────────────
    if (multiplayerManager.isOnline) {
      // リモートプレイヤーの表示更新
      multiplayerManager.onRemotePlayers((players: Record<string, RemotePlayerData>) => {
        const currentIds = new Set(Object.keys(players));
        // 退出プレイヤーを削除
        for (const [id, rp] of this.remotePlayers) {
          if (!currentIds.has(id)) { rp.destroy(); this.remotePlayers.delete(id); }
        }
        // 新規/更新
        for (const [id, data] of Object.entries(players)) {
          if (this.remotePlayers.has(id)) {
            this.remotePlayers.get(id)!.updateFromData(data);
          } else {
            this.remotePlayers.set(id, new RemotePlayer(this, data));
          }
        }
      });

      // 共有インベントリ（リモートからの更新）
      multiplayerManager.onInventorySync((inv) => {
        Object.assign(gameState.inventory, inv);
        GameEventBus.emit(GAME_EVENTS.INVENTORY_UPDATED, gameState.inventory);
      });

      // ホストからのゲーム状態
      multiplayerManager.onGameStateSync((state) => {
        gameState.weather       = state.weather as import('../../logic/GameState').WeatherType;
        gameState.tideLevel     = state.tideLevel as import('../../logic/GameState').TideLevel;
        // 時間はホストに追従（大きなずれのみ補正）
        if (Math.abs(gameState.totalMinutes - state.totalMinutes) > 5) {
          gameState.totalMinutes = state.totalMinutes;
        }
      });
    }

    this.events.once('destroy', () => {
      GameEventBus.off(GAME_EVENTS.ACTION_BUTTON,       this.handleActionButton);
      GameEventBus.off(GAME_EVENTS.CRAFT_REQUEST,       this.handleCraftRequest);
      GameEventBus.off(GAME_EVENTS.CRAFT_SAVEHOUSE,     this.handleCraftSaveHouse);
      GameEventBus.off(GAME_EVENTS.CRAFT_RAFT,          this.handleCraftRaft);
      GameEventBus.off(GAME_EVENTS.CRAFT_BANDAGE,       this.handleCraftBandage);
      GameEventBus.off(GAME_EVENTS.CRAFT_HERB_MEDICINE, this.handleCraftHerbMedicine);
      GameEventBus.off(GAME_EVENTS.COOK_MEAT,           this.handleCookMeat);
      GameEventBus.off(GAME_EVENTS.PLAYER_DIED,         this.handlePlayerDied);
      GameEventBus.off(GAME_EVENTS.PLAYER_TOOK_DAMAGE,  this.handlePlayerTookDamage);
      GameEventBus.off(GAME_EVENTS.GAME_LOADED,         this.handleGameLoaded);
      GameEventBus.off(GAME_EVENTS.WEATHER_CHANGED,     this.handleWeatherChanged);
      GameEventBus.off(GAME_EVENTS.PLAYER_ATTACK,       this.handlePlayerAttackEvent);
      GameEventBus.off(GAME_EVENTS.TIDE_CHANGED,        this.handleTideChanged);
      GameEventBus.off(GAME_EVENTS.MENTAL_EFFECT,       this.handleMentalEffect);
    });
  }

  // ── tryInteract：アクションボタン処理 ─────────────────────
  private tryInteract() {
    if (!this.player) return;
    const range = 70;
    const px = this.player.x, py = this.player.y;

    // 優先順位：セーブハウス → 焚き火（調理）→ LootCrate → 動物（狩猟）→ ベリー → 木 → 石
    const nearbySH = this.saveHouses.getChildren().find((sh: any) =>
      Phaser.Math.Distance.Between(px, py, sh.x, sh.y) < 100
    );
    if (nearbySH) { GameEventBus.emit(GAME_EVENTS.SAVE_HOUSE_INTERACT); return; }

    // ── 船修理END ───────────────────────────────────────────
    if (Phaser.Math.Distance.Between(px, py, this.HARBOR_X, this.HARBOR_Y) < 150) {
      const inv = gameState.inventory;
      if (inv.boatParts >= 3 && inv.fuelTank >= 1 && inv.navigationMap >= 1) {
        GameEventBus.emit(GAME_EVENTS.GAME_WIN, 'boat');
      } else {
        const missing: string[] = [];
        if (inv.boatParts    < 3) missing.push(`船パーツ×${3 - inv.boatParts}`);
        if (inv.fuelTank     < 1) missing.push('燃料タンク×1');
        if (inv.navigationMap < 1) missing.push('航海図×1');
        GameEventBus.emit(GAME_EVENTS.NOTIFICATION, `⛵ 必要素材不足：${missing.join(' / ')}`);
      }
      return;
    }

    // ── ヘリEND ────────────────────────────────────────────
    if (Phaser.Math.Distance.Between(px, py, this.HELI_X, this.HELI_Y) < 160) {
      const inv = gameState.inventory;
      if (inv.rotorPart >= 2 && inv.fuelTank >= 2 && inv.flightManual >= 1) {
        GameEventBus.emit(GAME_EVENTS.GAME_WIN, 'heli');
      } else {
        const missing: string[] = [];
        if (inv.rotorPart   < 2) missing.push(`ローター×${2 - inv.rotorPart}`);
        if (inv.fuelTank    < 2) missing.push(`燃料×${2 - inv.fuelTank}`);
        if (inv.flightManual < 1) missing.push('操縦マニュアル×1');
        GameEventBus.emit(GAME_EVENTS.NOTIFICATION, `🚁 修理不足：${missing.join(' / ')}`);
      }
      return;
    }

    // 水道（発電機修理後、近くでアクション → 水分補給）
    const WATER_TAP_X = this.GEN_X + 150;
    const WATER_TAP_Y = this.GEN_Y - 80;
    if (gameState.generatorRepaired &&
        Phaser.Math.Distance.Between(px, py, WATER_TAP_X, WATER_TAP_Y) < 100) {
      gameState.drinkWater(60);
      GameEventBus.emit(GAME_EVENTS.NOTIFICATION, '🚿 水道で水分補給！+60');
      this.sound.play('se_eat', { volume: 0.5 });
      return;
    }

    // 発電機インタラクション（SOS無線END）
    if (Phaser.Math.Distance.Between(px, py, this.GEN_X, this.GEN_Y) < 120) {
      if (gameState.generatorRepaired) {
        GameEventBus.emit(GAME_EVENTS.GAME_WIN, 'sos');
      } else if (gameState.inventory.electronicParts >= 4) {
        gameState.inventory.electronicParts -= 4;
        gameState.generatorRepaired = true;
        GameEventBus.emit(GAME_EVENTS.GENERATOR_REPAIRED, undefined);
        GameEventBus.emit(GAME_EVENTS.INVENTORY_UPDATED, gameState.inventory);
        GameEventBus.emit(GAME_EVENTS.NOTIFICATION, '⚡ 発電機を修理した！もう一度インタラクトしてSOSを送信');
        this.generatorSprite.setTint(0x88ff44);
        this.sound.play('se_craft_success', { volume: 1.0 });
      } else {
        const need = 4 - gameState.inventory.electronicParts;
        GameEventBus.emit(GAME_EVENTS.NOTIFICATION, `🔧 電子部品があと${need}個必要`);
      }
      return;
    }

    // 焚き火の近くで生肉があれば調理
    const nearFire = this.campfires.getChildren().some((cf: any) =>
      Phaser.Math.Distance.Between(px, py, cf.x, cf.y) < 80
    );
    if (nearFire && gameState.inventory.rawMeat > 0) {
      if (gameState.cookMeat()) {
        this.sound.play('se_craft_success', { volume: 0.7 });
      }
      return;
    }

    // LootCrate
    const nearbyCrate = (this.lootCrates.getChildren() as LootCrate[]).find((c) =>
      Phaser.Math.Distance.Between(px, py, c.x, c.y) < range
    );
    if (nearbyCrate) {
      nearbyCrate.interact(gameState);
      this.sound.play('se_craft_success', { volume: 0.5 });
      return;
    }

    // シェルター修理（近くのシェルターでアクション）
    const nearShelterRepair = this.saveHouses.getChildren().find((sh: any) =>
      Phaser.Math.Distance.Between(px, py, sh.x, sh.y) < 100
    );
    if (nearShelterRepair && gameState.shelterHP < gameState.shelterHPMax) {
      gameState.repairShelter();
      this.sound.play('se_craft_success', { volume: 0.8 });
      return;
    }

    // 農場収穫
    const nearFarm = this.farmPlots.find(fp =>
      fp.active && fp.isHarvestable() &&
      Phaser.Math.Distance.Between(px, py, fp.x, fp.y) < range
    );
    if (nearFarm) {
      nearFarm.harvest(gameState);
      this.sound.play('se_eat', { volume: 0.7 });
      return;
    }

    // 釣り（水辺 + 釣り竿）
    if (gameState.inventory.fishingRod > 0 && !this.isFishing) {
      const nearWater = (this.waterTiles.getChildren() as Phaser.GameObjects.Rectangle[])
        .some(w => Phaser.Math.Distance.Between(px, py, w.x, w.y) < 80);
      if (nearWater) {
        this.isFishing = true;
        this.fishingTimer = 0;
        GameEventBus.emit(GAME_EVENTS.NOTIFICATION, '🎣 釣り中... (3秒)');
        return;
      }
    }

    // 罠設置（草地 + 罠）
    if (gameState.inventory.trap > 0 && gameState.trapsActive === 0) {
      gameState.deployTrap();
      return;
    }

    // ベリー
    const nearBerries = (this.berries.getChildren() as Berry[]).filter((b) =>
      Phaser.Math.Distance.Between(px, py, b.x, b.y) < range
    );
    if (nearBerries.length > 0) {
      nearBerries[0].harvest(() => gameState.eatFood(15, 'raw', true));
      this.sound.play('se_eat', { volume: 0.7 });
      return;
    }

    // 海藻採集
    const nearSeaweed = (this.seaweeds.getChildren() as Phaser.GameObjects.Image[]).find(sw =>
      sw.active && Phaser.Math.Distance.Between(px, py, sw.x, sw.y) < range
    );
    if (nearSeaweed) {
      nearSeaweed.setActive(false).setVisible(false);
      gameState.addItem('seaweed', 1);
      this.sound.play('se_eat', { volume: 0.4 });
      return;
    }

    // 木（蔓ドロップあり）
    const nearTrees = (this.trees.getChildren() as Tree[]).filter((t) =>
      Phaser.Math.Distance.Between(px, py, t.x, t.y) < range
    );
    if (nearTrees.length > 0) {
      nearTrees[0].harvest(() => {
        const amount = gameState.getWoodHarvestAmount();
        gameState.addWood(amount);
        if (Math.random() < 0.3)  gameState.addItem('vine', 1);
        if (Math.random() < 0.15) gameState.addItem('fiber', 1);
        gameState.addXP(10, 'gatherer');
      });
      this.sound.play('se_wood_chop', { volume: 0.8 });
      return;
    }

    // 石
    const nearStones = (this.stones.getChildren() as Stone[]).filter((s) =>
      Phaser.Math.Distance.Between(px, py, s.x, s.y) < range
    );
    if (nearStones.length > 0) {
      nearStones[0].harvest(() => {
        const bonus = gameState.skills.gatherer >= 1 ? 2 : 1;
        gameState.addStone(bonus);
        gameState.addXP(8, 'gatherer');
      });
      this.sound.play('se_stone_hit', { volume: 0.8 });
    }
  }

  // 近接攻撃：武器パラメータに基づく扇形範囲ダメージ
  private _doMeleeAttack(px: number, py: number, angle: number, range = 65, halfArc = Math.PI / 3, damage = 30): void {
    const RANGE    = range;
    const HALF_ARC = halfArc;
    const DAMAGE   = damage;

    // 攻撃エフェクト（扇形の黄色フラッシュ）
    const g = this.add.graphics();
    g.fillStyle(0xffcc44, 0.65);
    const steps = 10;
    const pts: Phaser.Math.Vector2[] = [new Phaser.Math.Vector2(px, py)];
    for (let i = 0; i <= steps; i++) {
      const a = angle - HALF_ARC + (i / steps) * HALF_ARC * 2;
      pts.push(new Phaser.Math.Vector2(px + Math.cos(a) * RANGE, py + Math.sin(a) * RANGE));
    }
    g.fillPoints(pts, true);
    g.setDepth(9997);
    this.tweens.add({ targets: g, alpha: 0, duration: 160, onComplete: () => g.destroy() });

    // ヒット判定
    type Hittable = Rabbit | Deer | WildBoar | Bear | Wolf;
    const allAnimals: Hittable[] = [
      ...this.rabbits, ...this.deers, ...this.boars, ...this.bears, ...this.wolves,
    ];

    allAnimals.forEach(animal => {
      if (!animal.active) return;
      const dist = Phaser.Math.Distance.Between(px, py, animal.x, animal.y);
      if (dist > RANGE) return;
      const toAnimal = Phaser.Math.Angle.Between(px, py, animal.x, animal.y);
      const diff = Phaser.Math.Angle.Wrap(toAnimal - angle);
      if (Math.abs(diff) > HALF_ARC) return;

      const knockbackAngle = toAnimal;
      const dead = animal.takeDamage(DAMAGE, knockbackAngle);
      if (dead) this._killAnimal(animal);
    });
  }

  private _killAnimal(animal: Rabbit | Deer | WildBoar | Bear | Wolf): void {
    const baseMeat = animal instanceof Bear  ? 4
      : animal instanceof WildBoar ? 3
      : animal instanceof Deer     ? 2
      : animal instanceof Wolf     ? 2 : 1;
    const meatAmount = baseMeat + gameState.getMeatHarvestBonus();

    gameState.addItem('rawMeat', meatAmount);
    animal.setActive(false).setVisible(false);

    if (animal instanceof Rabbit) {
      gameState.rabbitCount = Math.max(0, gameState.rabbitCount - 1);
      GameEventBus.emit(GAME_EVENTS.RABBIT_COUNT_CHANGED, gameState.rabbitCount);
    }
    GameEventBus.emit(GAME_EVENTS.ANIMAL_KILLED, meatAmount);
    this.sound.play('se_damage', { volume: 0.5 });
    multiplayerManager.pushWorldEvent({ type: 'animal_killed' });

    const xpByAnimal = animal instanceof Bear ? 60 : animal instanceof WildBoar ? 35
      : animal instanceof Deer ? 25 : animal instanceof Wolf ? 40 : 15;
    gameState.addXP(xpByAnimal, 'hunter');
  }

  private _applyTide(tide: 'low' | 'high'): void {
    const isHigh = tide === 'high';
    // バリアの物理ボディを有効/無効切替
    this.tideBarrier.getChildren().forEach((obj) => {
      const body = (obj as Phaser.Physics.Arcade.Image).body as Phaser.Physics.Arcade.StaticBody;
      if (body) body.enable = isHigh;
    });
    // 視覚オーバーレイ
    this.tideZoneOverlay.setAlpha(isHigh ? 0.35 : 0);
  }

  private _updateWeatherOverlay(): void {
    const w = this.currentWeather;
    if (w === 'sunny') {
      this.weatherOverlay.setVisible(false);
      return;
    }
    this.weatherOverlay.setVisible(true);
    if (w === 'cloudy') {
      this.weatherOverlay.setAlpha(0.12);
      this.weatherOverlay.fill(0x8899aa, 1);
    } else if (w === 'rainy') {
      this.weatherOverlay.setAlpha(0.25);
      this.weatherOverlay.fill(0x445566, 1);
    } else if (w === 'storm') {
      this.weatherOverlay.setAlpha(0.45);
      this.weatherOverlay.fill(0x223344, 1);
    }
  }

  update(_time: number, delta: number) {
    if (!this.player) return;

    this.player.update(delta);

    // ── マルチプレイヤー同期 ──────────────────────────────────
    if (multiplayerManager.isOnline) {
      multiplayerManager.updateLocalState(
        this.player.x, this.player.y, this.player.facingAngle,
        gameState.activeWeapon, gameState.health, gameState.hunger,
      );
      // ホストのみゲーム状態を60秒ごとに送信
      if (multiplayerManager.isHost) {
        this.gameStateHostTimer += delta;
        if (this.gameStateHostTimer >= 60000) {
          this.gameStateHostTimer = 0;
          multiplayerManager.pushGameState(
            gameState.weather, gameState.tideLevel, gameState.totalMinutes,
          );
        }
      }
      // リモートプレイヤー補間更新
      this.remotePlayers.forEach(rp => rp.update());
    }

    // ── サバイバルティック（6軸・状態異常） ─────────────────
    const isNearFire = this.campfires.getChildren().some((cf: any) =>
      Phaser.Math.Distance.Between(this.player.x, this.player.y, cf.x, cf.y) < 120
    );
    const isInShelter = this.saveHouses.getChildren().some((sh: any) =>
      Phaser.Math.Distance.Between(this.player.x, this.player.y, sh.x, sh.y) < 80
    );
    gameState.tickSurvival(delta, isNearFire, isInShelter);

    // ── 弓矢の更新 ───────────────────────────────────────────
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const arrow = this.arrows[i];
      if (!arrow.active) { this.arrows.splice(i, 1); continue; }
      const expired = arrow.update(delta);
      if (expired) { arrow.destroy(); this.arrows.splice(i, 1); continue; }

      // 動物ヒット判定
      type Hittable = Rabbit | Deer | WildBoar | Bear | Wolf;
      const allAnimals: Hittable[] = [
        ...this.rabbits, ...this.deers, ...this.boars, ...this.bears, ...this.wolves,
      ];
      for (const animal of allAnimals) {
        if (!animal.active) continue;
        if (Phaser.Math.Distance.Between(arrow.x, arrow.y, animal.x, animal.y) < 20) {
          const dead = animal.takeDamage(arrow.damage, Phaser.Math.Angle.Between(arrow.x, arrow.y, animal.x, animal.y));
          if (dead) this._killAnimal(animal);
          // 50%の確率で矢を回収
          if (Math.random() < 0.5) gameState.addItem('arrow', 1);
          arrow.destroy();
          this.arrows.splice(i, 1);
          break;
        }
      }
    }

    // ── 作業台近接チェック ────────────────────────────────────
    gameState.workbenchNearby = this.workbenches.some(wb =>
      Phaser.Math.Distance.Between(this.player.x, this.player.y, wb.x, wb.y) < 120
    );

    // ── シェルター劣化（嵐時） ────────────────────────────────
    if (this.currentWeather !== this.lastWeatherForShelter) {
      if (this.currentWeather === 'storm' && gameState.saveHouseCount > 0) {
        gameState.onStormDamagesShelter();
      }
      this.lastWeatherForShelter = this.currentWeather;
    }

    // ── 農場の成長ティック（10分ごと） ───────────────────────────
    if (gameState.totalMinutes % 10 === 0 && this.farmPlots.length > 0) {
      const isRaining = gameState.weather === 'rainy' || gameState.weather === 'storm';
      this.farmPlots.forEach(fp => fp.advanceTime(10, isRaining));
    }

    // ── 釣りタイマー ──────────────────────────────────────────
    if (this.isFishing) {
      this.fishingTimer += delta;
      if (this.fishingTimer >= 3000) {
        this.isFishing = false;
        this.fishingTimer = 0;
        if (Math.random() < 0.72) {
          gameState.addItem('rawFish', 1);
          gameState.addXP(20, 'gatherer');
          if (gameState.inventory.fishingRod > 0) gameState.useToolDurability('fishingRod');
          GameEventBus.emit(GAME_EVENTS.NOTIFICATION, '🐟 魚を釣った！生魚×1');
          this.sound.play('se_eat', { volume: 0.6 });
        } else {
          GameEventBus.emit(GAME_EVENTS.NOTIFICATION, '🎣 今回は釣れなかった…');
        }
      }
    }

    // ── BGM状態更新（変化があったときのみ） ────────────────────
    const bgmState: BGMState = gameState.weather === 'storm' ? 'storm'
      : (gameState.time.hour >= 18 || gameState.time.hour < 6) ? 'night'
      : 'day';
    if (bgmState !== this.lastBGMState) {
      this.lastBGMState = bgmState;
      bgmSystem.setState(bgmState);
    }

    // ── 足音SE ──────────────────────────────────────────────
    const isMoving = this.player.body?.velocity.x !== 0 || this.player.body?.velocity.y !== 0;
    if (isMoving) {
      this.footstepTimer += delta;
      if (this.footstepTimer >= this.footstepInterval) {
        this.footstepTimer = 0;
        this.sound.play('se_footstep_grass', { volume: 0.3 });
      }
    } else {
      this.footstepTimer = this.footstepInterval;
    }

    // ── 空腹警告SE ──────────────────────────────────────────
    if (gameState.hunger < 20 && gameState.isAlive) {
      this.hungerWarnTimer += delta;
      if (this.hungerWarnTimer >= this.hungerWarnInterval) {
        this.hungerWarnTimer = 0;
        this.sound.play('se_warning_hunger', { volume: 0.6 });
      }
    } else {
      this.hungerWarnTimer = 0;
    }

    // ── 動物更新 ────────────────────────────────────────────
    this.rabbits.forEach(a => a.update(this.player, gameState));
    this.deers.forEach(a   => a.update(this.player, gameState));
    this.boars.forEach(a   => a.update(this.player, gameState));
    this.bears.forEach(a   => a.update(this.player, this.campfires, gameState));
    this.wolves.forEach(a  => a.update(this.player, this.campfires, gameState));

    // ── 天候オーバーレイリサイズ ────────────────────────────
    const camW = this.cameras.main.width;
    const camH = this.cameras.main.height;
    if (this.weatherOverlay.width !== camW || this.weatherOverlay.height !== camH) {
      this.weatherOverlay.resize(camW, camH);
      this._updateWeatherOverlay();
    }

    // ── 暗闇レイヤー ─────────────────────────────────────────
    if (this.darkness.width !== camW || this.darkness.height !== camH) {
      this.darkness.resize(camW, camH);
    }

    const fHour = gameState.time.hour + gameState.time.minute / 60.0;
    let darkAlpha = 0;
    if      (fHour >= 17 && fHour <= 18) darkAlpha = 0.9 * (fHour - 17);
    else if (fHour > 18 || fHour < 5)   darkAlpha = 0.9;
    else if (fHour >= 5 && fHour <= 6)  darkAlpha = 0.9 * (1 - (fHour - 5));

    // 嵐では夜でなくても少し暗くなる
    if (this.currentWeather === 'storm') darkAlpha = Math.max(darkAlpha, 0.3);

    if (darkAlpha <= 0) {
      this.darkness.setVisible(false);
    } else {
      this.darkness.setVisible(true).setAlpha(darkAlpha);
      this.darkness.clear();
      this.darkness.fill(0x000000, 1);
      this.campfires.getChildren().forEach((cf: any) => {
        const cx = cf.x - this.cameras.main.scrollX;
        const cy = cf.y - this.cameras.main.scrollY;
        this.darkness.erase('light-mask', cx - 100, cy - 100);
      });
    }
  }
}
