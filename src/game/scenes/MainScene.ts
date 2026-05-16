import Phaser from 'phaser';
import { Player, Tree, Stone, Campfire } from '../objects/index';
import { GameEventBus, GAME_EVENTS, gameState } from '../../logic/index';

export class MainScene extends Phaser.Scene {
  private player!: Player;
  private trees!: Phaser.GameObjects.Group;
  private stones!: Phaser.GameObjects.Group;
  private campfires!: Phaser.GameObjects.Group;

  private handleActionButton = () => {
    this.tryHarvestTree();
  };

  private handleCraftRequest = () => {
    if (!this.player) return;

    // GameState側で素材が足りているかバリデーション
    if (gameState.canCraftCampfire()) {
      // プレイヤーの目の前（少し下）に焚き火を生成
      const spawnX = this.player.x;
      const spawnY = this.player.y + 40;
      const fire = new Campfire(this, spawnX, spawnY);
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
    // プレイヤーのダミーテクスチャ
    const pGraphics = this.add.graphics();
    pGraphics.fillStyle(0x00ff00, 1.0);
    pGraphics.fillRect(0, 0, 32, 32);
    pGraphics.generateTexture('dummy-player', 32, 32);
    pGraphics.destroy();

    // 木
    const tGraphics = this.add.graphics();
    tGraphics.fillStyle(0x8B4513, 1.0);
    tGraphics.fillRect(0, 0, 48, 48);
    tGraphics.generateTexture('dummy-tree', 48, 48);
    tGraphics.destroy();

    // 石
    const sGraphics = this.add.graphics();
    sGraphics.fillStyle(0x808080, 1.0);
    sGraphics.fillRect(0, 0, 32, 32);
    sGraphics.generateTexture('dummy-stone', 32, 32);
    sGraphics.destroy();

    // 焚き火
    const fGraphics = this.add.graphics();
    fGraphics.fillStyle(0xFF4500, 1.0);
    fGraphics.fillRect(0, 0, 24, 24);
    fGraphics.generateTexture('dummy-campfire', 24, 24);
    fGraphics.destroy();
  }

  create() {
    const worldWidth = 2000;
    const worldHeight = 2000;
    this.cameras.main.setBackgroundColor('#2d2d2d');
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

    // グリッド背景の描画
    this.add.grid(worldWidth / 2, worldHeight / 2, worldWidth, worldHeight, 64, 64, 0x3d3d3d, 1, 0x4d4d4d, 1);

    // 1. オブジェクトのグループを作成
    this.trees = this.add.group();
    this.stones = this.add.group();
    this.campfires = this.add.group();

    // 木の配置
    for (let i = 0; i < 50; i++) {
      const x = Phaser.Math.Between(100, worldWidth - 100);
      const y = Phaser.Math.Between(100, worldHeight - 100);
      const tree = new Tree(this, x, y);
      this.trees.add(tree);
    }

    // 石の配置
    for (let i = 0; i < 30; i++) {
      const x = Phaser.Math.Between(100, worldWidth - 100);
      const y = Phaser.Math.Between(100, worldHeight - 100);
      const stone = new Stone(this, x, y);
      this.stones.add(stone);
    }

    // 2. プレイヤーの生成
    this.player = new Player(this, worldWidth / 2, worldHeight / 2);

    // 3. プレイヤーとオブジェクトの当たり判定を設定
    this.physics.add.collider(this.player, this.trees);
    this.physics.add.collider(this.player, this.stones);

    // 4. カメラの設定
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // 5. イベントリスナーの登録（安全なピンポイント指定）
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

  // 近くのオブジェクトを探して、適切なアクションを実行する（例: 木の伐採）
  private tryHarvestTree() {
    if (!this.player) return;
    const range = 60; // 手が届く範囲

    // 木を探す
    const nearbyTrees = this.trees.getChildren().filter((t) => {
      return Phaser.Math.Distance.Between(this.player.x, this.player.y, (t as Tree).x, (t as Tree).y) < range;
    }) as Tree[];

    if (nearbyTrees.length > 0) {
      nearbyTrees[0].harvest(() => gameState.addWood(1));
      return;
    }

    // 石を探す
    const nearbyStones = this.stones.getChildren().filter((s) => {
      return Phaser.Math.Distance.Between(this.player.x, this.player.y, (s as Stone).x, (s as Stone).y) < range;
    }) as Stone[];

    if (nearbyStones.length > 0) {
      nearbyStones[0].harvest(() => gameState.addStone(1));
    }
  }

  update() {
    if (this.player) {
      this.player.update();
    }
  }
}