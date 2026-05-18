import Phaser from 'phaser';
import { createNoise2D } from 'simplex-noise';
import { Player, Tree, Stone, Campfire, Berry } from '../objects/index';
import { GameEventBus, GAME_EVENTS, gameState } from '../../logic/index';

export class MainScene extends Phaser.Scene {
  private player!: Player;
  private trees!: Phaser.GameObjects.Group;
  private stones!: Phaser.GameObjects.Group;
  private campfires!: Phaser.GameObjects.Group;
  private berries!: Phaser.GameObjects.Group;
  private waterTiles!: Phaser.Physics.Arcade.StaticGroup;
  
  // 暗闇描画用のレイヤー
  private darkness!: Phaser.GameObjects.RenderTexture;

  private handleActionButton = () => { this.tryHarvest(); };
  private handleCraftRequest = () => {
    if (!this.player) return;
    if (gameState.canCraftCampfire()) {
      const fire = new Campfire(this, this.player.x, this.player.y + 20);
      this.campfires.add(fire);
    }
  };

  constructor() {
    super({ key: 'MainScene' });
  }

  preload() {
    this.load.spritesheet('player-sprite', '/assets/player.png', { frameWidth: 48, frameHeight: 48 });
    this.load.image('tree-img', '/assets/tree.png');
    this.load.image('stone-img', '/assets/stone.png');
    this.load.image('campfire-img', '/assets/campfire.png');

    const makeTile = (key: string, color: number) => {
      const g = this.add.graphics();
      g.fillStyle(color, 1);
      g.fillRect(0, 0, 64, 64);
      g.lineStyle(2, 0x000000, 0.05);
      g.strokeRect(0, 0, 64, 64);
      g.generateTexture(key, 64, 64);
      g.destroy();
    };

    makeTile('tile-water', 0x4169E1);
    makeTile('tile-sand', 0xEEDD82); 
    makeTile('tile-grass', 0x228B22);

    const graphics = this.add.graphics();
    graphics.fillStyle(0xff0000, 1);
    graphics.fillCircle(8, 8, 6);
    graphics.lineStyle(2, 0x8b0000);
    graphics.strokeCircle(8, 8, 6);
    graphics.generateTexture('berry-img', 16, 16);
    graphics.destroy();
  }

  create() {
    this.anims.create({ key: 'walk-down', frames: this.anims.generateFrameNumbers('player-sprite', { start: 0, end: 5 }), frameRate: 10, repeat: -1 });
    this.anims.create({ key: 'walk-side', frames: this.anims.generateFrameNumbers('player-sprite', { start: 6, end: 11 }), frameRate: 10, repeat: -1 });
    this.anims.create({ key: 'walk-up', frames: this.anims.generateFrameNumbers('player-sprite', { start: 12, end: 17 }), frameRate: 10, repeat: -1 });
    this.anims.create({ key: 'idle-down', frames: [{ key: 'player-sprite', frame: 0 }], frameRate: 10 });
    this.anims.create({ key: 'idle-side', frames: [{ key: 'player-sprite', frame: 6 }], frameRate: 10 });
    this.anims.create({ key: 'idle-up', frames: [{ key: 'player-sprite', frame: 12 }], frameRate: 10 });

    const worldWidth = 4000;
    const worldHeight = 4000;
    const tileSize = 64;
    
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.setBackgroundColor('#4169E1');

    // 光源を表現するためのフワッとした丸いマスク画像を生成
    const maskGraphics = this.add.graphics();
    for (let r = 100; r > 0; r -= 5) {
      maskGraphics.fillStyle(0xffffff, 0.05);
      maskGraphics.fillCircle(100, 100, r);
    }
    maskGraphics.generateTexture('light-mask', 200, 200);
    maskGraphics.destroy();

    // 画面全体を覆う暗闇のRenderTexture
    this.darkness = this.add.renderTexture(0, 0, this.cameras.main.width, this.cameras.main.height);
    this.darkness.setOrigin(0, 0);
    this.darkness.setScrollFactor(0); // カメラの動きに合わせて画面に固定
    this.darkness.setDepth(9999);     // 全てのオブジェクトより手前に描画する

    this.trees = this.add.group();
    this.stones = this.add.group();
    this.campfires = this.add.group();
    this.berries = this.add.group();
    this.waterTiles = this.physics.add.staticGroup();

    const noise2D = createNoise2D();

    for (let y = 0; y < worldHeight; y += tileSize) {
      for (let x = 0; x < worldWidth; x += tileSize) {
        
        const baseNoise = noise2D(x * 0.0005, y * 0.0005); 
        const detailNoise = noise2D(x * 0.003, y * 0.003) * 0.5;
        let noiseValue = baseNoise + detailNoise;

        const distanceToCenter = Phaser.Math.Distance.Between(x, y, worldWidth / 2, worldHeight / 2);
        const maxDistance = worldWidth / 2;
        const edgeFalloff = Math.max(0, distanceToCenter / maxDistance); 
        
        noiseValue -= (edgeFalloff * 1.3); 

        let tileKey = '';
        let isWater = false, isSand = false, isGrass = false;

        if (noiseValue < -0.1) {
          tileKey = 'tile-water';
          isWater = true;
        } else if (noiseValue < 0.2) {
          tileKey = 'tile-sand';
          isSand = true;
        } else {
          tileKey = 'tile-grass';
          isGrass = true;
        }

        const tile = this.add.image(x + tileSize/2, y + tileSize/2, tileKey);
        tile.setDepth(-1000);

        if (isWater) {
          const waterBody = this.add.rectangle(x + tileSize/2, y + tileSize/2, tileSize, tileSize);
          this.waterTiles.add(waterBody);
        } else if (isGrass) {
          const r = Math.random();
          if (r < 0.15) {
            this.trees.add(new Tree(this, x + tileSize/2, y + tileSize/2));
          } else if (r < 0.17) {
            this.berries.add(new Berry(this, x + tileSize/2, y + tileSize/2));
          }
        } else if (isSand && Math.random() < 0.05) {
          this.stones.add(new Stone(this, x + tileSize/2, y + tileSize/2));
        }
      }
    }

    this.player = new Player(this, worldWidth / 2, worldHeight / 2);

    this.physics.add.collider(this.player, this.trees);
    this.physics.add.collider(this.player, this.stones);
    this.physics.add.collider(this.player, this.berries);
    this.physics.add.collider(this.player, this.waterTiles);

    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    GameEventBus.on(GAME_EVENTS.ACTION_BUTTON, this.handleActionButton);
    GameEventBus.on(GAME_EVENTS.CRAFT_REQUEST, this.handleCraftRequest);
    if (this.input.keyboard) this.input.keyboard.on('keydown-SPACE', this.handleActionButton);

    // 空腹度を減らすタイマー
    this.time.addEvent({
      delay: 2000,
      callback: () => { gameState.consumeHunger(1); },
      loop: true
    });

    // 現実の1秒(1000ms)で、ゲーム内の10分を進めるタイマー
    this.time.addEvent({
      delay: 1000,
      callback: () => { gameState.advanceTime(10); },
      loop: true
    });

    this.events.once('destroy', () => {
      GameEventBus.off(GAME_EVENTS.ACTION_BUTTON, this.handleActionButton);
      GameEventBus.off(GAME_EVENTS.CRAFT_REQUEST, this.handleCraftRequest);
    });
  }

  private tryHarvest() {
    if (!this.player) return;
    const range = 60; 

    const nearbyBerries = this.berries.getChildren().filter((b) => Phaser.Math.Distance.Between(this.player.x, this.player.y, (b as Berry).x, (b as Berry).y) < range) as Berry[];
    if (nearbyBerries.length > 0) {
      nearbyBerries[0].harvest(() => gameState.eatFood(20));
      return;
    }

    const nearbyTrees = this.trees.getChildren().filter((t) => Phaser.Math.Distance.Between(this.player.x, this.player.y, (t as Tree).x, (t as Tree).y) < range) as Tree[];
    if (nearbyTrees.length > 0) {
      nearbyTrees[0].harvest(() => gameState.addWood(1));
      return;
    }
    const nearbyStones = this.stones.getChildren().filter((s) => Phaser.Math.Distance.Between(this.player.x, this.player.y, (s as Stone).x, (s as Stone).y) < range) as Stone[];
    if (nearbyStones.length > 0) {
      nearbyStones[0].harvest(() => gameState.addStone(1));
    }
  }

  update() {
    if (this.player) this.player.update();

    if (this.darkness.width !== this.cameras.main.width || this.darkness.height !== this.cameras.main.height) {
      this.darkness.resize(this.cameras.main.width, this.cameras.main.height);
    }

    const fHour = gameState.time.hour + gameState.time.minute / 60.0;
    let alpha = 0;

    // 時刻に応じた暗さの計算 (夜の最大値を 0.9 に設定)
    if (fHour >= 17 && fHour <= 18) {
      alpha = 0.9 * (fHour - 17);
    } else if (fHour > 18 || fHour < 5) {
      alpha = 0.9;
    } else if (fHour >= 5 && fHour <= 6) {
      alpha = 0.9 * (1 - (fHour - 5));
    }

    // パフォーマンスと描画バグ回避のため、昼間は完全に描画スキップ、夜間はAlpha設定＋100%塗りつぶしで対応
    if (alpha <= 0) {
      this.darkness.setVisible(false);
    } else {
      this.darkness.setVisible(true);
      this.darkness.setAlpha(alpha);
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