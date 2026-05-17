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
      const fire = new Campfire(this, this.player.x, this.player.y + 20);
      this.campfires.add(fire);
    }
  };

  constructor() {
    super({ key: 'MainScene' });
  }

  preload() {
    this.load.spritesheet('player-sprite', '/assets/player.png', {
      frameWidth: 48,
      frameHeight: 48
    });

    this.load.image('tree-img', '/assets/tree.png');
    this.load.image('stone-img', '/assets/stone.png');
    this.load.image('campfire-img', '/assets/campfire.png');
  }

  create() {
    // ★ 画像（横6コマ）に合わせた完璧なアニメーション設定

    // 下歩き (1行目: 0~5コマ目)
    this.anims.create({
      key: 'walk-down',
      frames: this.anims.generateFrameNumbers('player-sprite', { start: 0, end: 5 }),
      frameRate: 10,
      repeat: -1
    });

    // 横歩き (2行目: 6~11コマ目)
    this.anims.create({
      key: 'walk-side',
      frames: this.anims.generateFrameNumbers('player-sprite', { start: 6, end: 11 }),
      frameRate: 10,
      repeat: -1
    });

    // 上歩き (3行目: 12~17コマ目)
    this.anims.create({
      key: 'walk-up',
      frames: this.anims.generateFrameNumbers('player-sprite', { start: 12, end: 17 }),
      frameRate: 10,
      repeat: -1
    });

    // 止まった時の待機ポーズ（各行の最初の1コマだけを指定）
    this.anims.create({ key: 'idle-down', frames: [{ key: 'player-sprite', frame: 0 }], frameRate: 10 });
    this.anims.create({ key: 'idle-side', frames: [{ key: 'player-sprite', frame: 6 }], frameRate: 10 });
    this.anims.create({ key: 'idle-up', frames: [{ key: 'player-sprite', frame: 12 }], frameRate: 10 });

    const worldWidth = 2000;
    const worldHeight = 2000;
    this.cameras.main.setBackgroundColor('#2E8B57');
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

    this.add.grid(worldWidth / 2, worldHeight / 2, worldWidth, worldHeight, 64, 64, 0x228B22, 1, 0x006400, 0.5);

    this.trees = this.add.group();
    this.stones = this.add.group();
    this.campfires = this.add.group();

    for (let i = 0; i < 50; i++) {
      this.trees.add(new Tree(this, Phaser.Math.Between(100, worldWidth - 100), Phaser.Math.Between(100, worldHeight - 100)));
    }
    for (let i = 0; i < 30; i++) {
      this.stones.add(new Stone(this, Phaser.Math.Between(100, worldWidth - 100), Phaser.Math.Between(100, worldHeight - 100)));
    }

    this.player = new Player(this, worldWidth / 2, worldHeight / 2);

    this.physics.add.collider(this.player, this.trees);
    this.physics.add.collider(this.player, this.stones);

    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    GameEventBus.on(GAME_EVENTS.ACTION_BUTTON, this.handleActionButton);
    GameEventBus.on(GAME_EVENTS.CRAFT_REQUEST, this.handleCraftRequest);
    if (this.input.keyboard) this.input.keyboard.on('keydown-SPACE', this.handleActionButton);

    this.events.once('destroy', () => {
      GameEventBus.off(GAME_EVENTS.ACTION_BUTTON, this.handleActionButton);
      GameEventBus.off(GAME_EVENTS.CRAFT_REQUEST, this.handleCraftRequest);
    });
  }

  private tryHarvestTree() {
    if (!this.player) return;
    const range = 60; 
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