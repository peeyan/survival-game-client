import Phaser from 'phaser';
import { GameEventBus, GAME_EVENTS } from '../../logic/GameEventBus';

class Player extends Phaser.Physics.Arcade.Sprite {
  private padInput = { x: 0, y: 0 };
  private keyboardInput = { x: 0, y: 0 };
  private playerSpeed = 200;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys | undefined;
  private wasdKeys!: { W: any, A: any, S: any, D: any } | undefined;

  private handlePlayerMove = (vector: { x: number, y: number }) => {
    this.padInput = vector;
  };

  // コンストラクタで初期設定（MainSceneからthisを渡して生成する）
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'dummy-player');

    // シーンの描画ツリーと物理エンジンに自分自身を登録
    scene.add.existing(this);
    scene.physics.add.existing(this);
    // ワールド境界との衝突を有効化
    this.setCollideWorldBounds(true);

    // --- 入力のセットアップ ---
    this.setupInputs(scene);
  }

  private setupInputs(scene: Phaser.Scene) {
    GameEventBus.on(GAME_EVENTS.PLAYER_MOVE, this.handlePlayerMove);

    if (scene.input.keyboard) {
      this.cursors = scene.input.keyboard.createCursorKeys();
      this.wasdKeys = scene.input.keyboard.addKeys('W,A,S,D') as any;
    }
  }

  // 毎フレームMainSceneから呼ばれる更新処理
  update() {
    this.keyboardInput = { x: 0, y: 0 };
    if (this.cursors && this.wasdKeys) {
      if (this.cursors.left.isDown || this.wasdKeys.A.isDown) this.keyboardInput.x = -1;
      else if (this.cursors.right.isDown || this.wasdKeys.D.isDown) this.keyboardInput.x = 1;
      if (this.cursors.up.isDown || this.wasdKeys.W.isDown) this.keyboardInput.y = -1;
      else if (this.cursors.down.isDown || this.wasdKeys.S.isDown) this.keyboardInput.y = 1;
    }

    let moveX = this.padInput.x + this.keyboardInput.x;
    let moveY = this.padInput.y + this.keyboardInput.y;

    const length = Math.sqrt(moveX * moveX + moveY * moveY);
    if (length > 1) {
      moveX /= length;
      moveY /= length;
    }

    this.setVelocity(moveX * this.playerSpeed, moveY * this.playerSpeed);

    if (moveX !== 0 || moveY !== 0) {
      this.angle += 2;
    }
  }

  // 破棄時のクリーンアップ処理
  destroy(fromScene?: boolean) {
    GameEventBus.off(GAME_EVENTS.PLAYER_MOVE, this.handlePlayerMove);
    super.destroy(fromScene);
  }
}

export default Player;