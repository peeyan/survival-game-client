import Phaser from 'phaser';
import { Player, Tree, Stone, Campfire } from '../objects/index';
import { GameEventBus, GAME_EVENTS, gameState } from '../../logic/index';

export class MainScene extends Phaser.Scene {
  private player!: Player;
  private trees!: Phaser.GameObjects.Group;
  private stones!: Phaser.GameObjects.Group;
  private campfires!: Phaser.GameObjects.Group;

  private handleActionButton = () => { this.tryHarvestTree(); };
  private handleCraftRequest = () => {
    if (!this.player) return;
    if (gameState.canCraftCampfire()) {
      // プレイヤーの足元から少し下に焚き火を設置
      const fire = new Campfire(this, this.player.x, this.player.y + 20);
      this.campfires.add(fire);
      console.log("焚き火を設置した！");
    } else {
      console.log("素材が足りません！");
    }
  };

  constructor() {
    super({ key: 'MainScene' });
  }

  preload() {
    // ★ 1コマのサイズを 48x48 に修正
    this.load.spritesheet('player-sprite', '/assets/player.png', {
      frameWidth: 48,
      frameHeight: 48
    });

    this.load.image('tree-img', '/assets/tree.png');
    this.load.image('stone-img', '/assets/stone.png');
    this.load.image('campfire-img', '/assets/campfire.png');
  }

  create() {
    // ★ 新しいプレイヤー画像（横6コマ構成）に合わせたアニメーション設定
    // 下歩き (行2: 4~7コマ目)
    this.anims.create({
      key: 'walk-down',
      frames: this.anims.generateFrameNumbers('player-sprite', { start: 4, end: 7 }),
      frameRate: 10,
      repeat: -1
    });

    // 横歩き (行6: 20~23コマ目)
    this.anims.create({
      key: 'walk-side',
      frames: this.anims.generateFrameNumbers('player-sprite', { start: 20, end: 23 }),
      frameRate: 10,
      repeat: -1
    });

    // 上歩き (行4: 12~15コマ目)
    this.anims.create({
      key: 'walk-up',
      frames: this.anims.generateFrameNumbers('player-sprite', { start: 12, end: 15 }),
      frameRate: 10,
      repeat: -1
    });

    // 正面待機 (行1: 0~3コマ目)
    this.anims.create({
      key: 'idle-down',
      frames: this.anims.generateFrameNumbers('player-sprite', { start: 0, end: 3 }),
      frameRate: 6, // 待機は少しゆっくりめに再生
      repeat: -1
    });

    const worldWidth = 2000;
    const worldHeight = 2000;
    this.cameras.main.setBackgroundColor('#2E8B57');
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

    this.add.grid(worldWidth / 2, worldHeight / 2, worldWidth, worldHeight, 64, 64, 0x228B22, 1, 0x006400, 0.5);

    this.trees = this.add.group();
    this.stones = this.add.group();
    this.campfires = this.add.group();

    for (let i = 0; i < 50; i++) {
      const x = Phaser.Math.Between(100, worldWidth - 100);
      const y = Phaser.Math.Between(100, worldHeight - 100);
      this.trees.add(new Tree(this, x, y));
    }

    for (let i = 0; i < 30; i++) {
      const x = Phaser.Math.Between(100, worldWidth - 100);
      const y = Phaser.Math.Between(100, worldHeight - 100);
      this.stones.add(new Stone(this, x, y));
    }

    this.player = new Player(this, worldWidth / 2, worldHeight / 2);

    this.physics.add.collider(this.player, this.trees);
    this.physics.add.collider(this.player, this.stones);

    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    GameEventBus.on(GAME_EVENTS.ACTION_BUTTON, this.handleActionButton);
    GameEventBus.on(GAME_EVENTS.CRAFT_REQUEST, this.handleCraftRequest);

    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-SPACE', this.handleActionButton);
    }

    this.events.once('destroy', () => {
      GameEventBus.off(GAME_EVENTS.ACTION_BUTTON, this.handleActionButton);
      GameEventBus.off(GAME_EVENTS.CRAFT_REQUEST, this.handleCraftRequest);
    });
  }

  private tryHarvestTree() {
    if (!this.player) return;
    const range = 60; 

    const nearbyTrees = this.trees.getChildren().filter((t) => {
      return Phaser.Math.Distance.Between(this.player.x, this.player.y, (t as Tree).x, (t as Tree).y) < range;
    }) as Tree[];

    if (nearbyTrees.length > 0) {
      nearbyTrees[0].harvest(() => gameState.addWood(1));
      return;
    }

    const nearbyStones = this.stones.getChildren().filter((s) => {
      return Phaser.Math.Distance.Between(this.player.x, this.player.y, (s as Stone).x, (s as Stone).y) < range;
    }) as Stone[];

    if (nearbyStones.length > 0) {
      nearbyStones[0].harvest(() => gameState.addStone(1));
    }
  }

  update() {
    if (this.player) this.player.update();
  }
}