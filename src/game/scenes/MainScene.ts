import Phaser from 'phaser';
import { createNoise2D } from 'simplex-noise';
import { Player, Tree, Stone, Campfire, Berry } from '../objects/index'; // ★ Berryを追加
import { GameEventBus, GAME_EVENTS, gameState } from '../../logic/index';

export class MainScene extends Phaser.Scene {
  private player!: Player;
  private trees!: Phaser.GameObjects.Group;
  private stones!: Phaser.GameObjects.Group;
  private campfires!: Phaser.GameObjects.Group;
  private berries!: Phaser.GameObjects.Group; // ★ 追加
  private waterTiles!: Phaser.Physics.Arcade.StaticGroup;

  private handleActionButton = () => { this.tryHarvest(); }; // ★ 名前を tryHarvest に変更
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

    // ★ 追加：動的にベリーのテクスチャを生成 (16x16の赤い丸)
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

    // ★ 冒険の舞台を少し広くしました
    const worldWidth = 4000;
    const worldHeight = 4000;
    const tileSize = 64;
    
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.setBackgroundColor('#4169E1');

    this.trees = this.add.group();
    this.stones = this.add.group();
    this.campfires = this.add.group();
    this.berries = this.add.group(); // ★ 追加
    this.waterTiles = this.physics.add.staticGroup();

    // ==========================================
    // ★ 改良版・地形生成（フラクタルノイズ合成）
    // ==========================================
    const noise2D = createNoise2D();

    for (let y = 0; y < worldHeight; y += tileSize) {
      for (let x = 0; x < worldWidth; x += tileSize) {
        
        // 1. ベースの大陸を作る「巨大で緩やかな波」（0.0005）
        const baseNoise = noise2D(x * 0.0005, y * 0.0005); 
        
        // 2. 海岸線のリアリティや小島を作る「細かくて弱い波」（0.003の波を半分の強さ0.5で足す）
        const detailNoise = noise2D(x * 0.003, y * 0.003) * 0.5;

        // ノイズを合成
        let noiseValue = baseNoise + detailNoise;

        // 3. 島補正（マップ端に行くほど強制的に海に沈める）
        const distanceToCenter = Phaser.Math.Distance.Between(x, y, worldWidth / 2, worldHeight / 2);
        const maxDistance = worldWidth / 2;
        const edgeFalloff = Math.max(0, distanceToCenter / maxDistance); 
        
        // 端に近づくほど標高を削る（1.3倍の強さで沈める）
        noiseValue -= (edgeFalloff * 1.3); 

        // 4. 地形の判定
        let tileKey = '';
        let isWater = false, isSand = false, isGrass = false;

        // ★ 標高のしきい値を調整
        if (noiseValue < -0.1) {
          tileKey = 'tile-water'; // 海
          isWater = true;
        } else if (noiseValue < 0.2) {
          tileKey = 'tile-sand';  // 砂浜（少し広め）
          isSand = true;
        } else {
          tileKey = 'tile-grass'; // 森
          isGrass = true;
        }

        const tile = this.add.image(x + tileSize/2, y + tileSize/2, tileKey);
        tile.setDepth(-1000);

        if (isWater) {
          const waterBody = this.add.rectangle(x + tileSize/2, y + tileSize/2, tileSize, tileSize);
          this.waterTiles.add(waterBody);
        } else if (isGrass) {
          // ★ 追加：草地の上に木またはベリーを配置するロジック
          const r = Math.random();
          if (r < 0.15) { // 15%で木
            this.trees.add(new Tree(this, x + tileSize/2, y + tileSize/2));
          } else if (r < 0.17) { // 2% (0.15~0.17) の確率でベリー
            this.berries.add(new Berry(this, x + tileSize/2, y + tileSize/2));
          }
        } else if (isSand && Math.random() < 0.05) {
          this.stones.add(new Stone(this, x + tileSize/2, y + tileSize/2));
        }
      }
    }
    // ==========================================

    this.player = new Player(this, worldWidth / 2, worldHeight / 2);

    this.physics.add.collider(this.player, this.trees);
    this.physics.add.collider(this.player, this.stones);
    this.physics.add.collider(this.player, this.berries); // ★ 追加：ベリーの当たり判定
    this.physics.add.collider(this.player, this.waterTiles);

    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    GameEventBus.on(GAME_EVENTS.ACTION_BUTTON, this.handleActionButton);
    GameEventBus.on(GAME_EVENTS.CRAFT_REQUEST, this.handleCraftRequest);
    if (this.input.keyboard) this.input.keyboard.on('keydown-SPACE', this.handleActionButton);

    // ★ 追加：2秒ごとに空腹度を1減らすタイマー
    this.time.addEvent({
      delay: 2000,
      callback: () => {
        gameState.consumeHunger(1);
      },
      loop: true
    });

    this.events.once('destroy', () => {
      GameEventBus.off(GAME_EVENTS.ACTION_BUTTON, this.handleActionButton);
      GameEventBus.off(GAME_EVENTS.CRAFT_REQUEST, this.handleCraftRequest);
    });
  }

  // ★ 汎用的に採取処理を行うようにリネームし、ベリーの処理を追加
  private tryHarvest() {
    if (!this.player) return;
    const range = 60; 

    // ベリーが近くにあれば優先して食べる
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
  }
}