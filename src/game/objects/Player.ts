import Phaser from 'phaser';
import { GameEventBus, GAME_EVENTS } from '../../logic/GameEventBus';

class Player extends Phaser.Physics.Arcade.Sprite {
  private padInput = { x: 0, y: 0 };
  private keyboardInput = { x: 0, y: 0 };
  private playerSpeed = 200;
  
  // ★ 追加：最後に歩いていた方向を記憶する
  private lastDirection: 'down' | 'up' | 'side' = 'down';

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys | undefined;
  private wasdKeys!: { W: any, A: any, S: any, D: any } | undefined;

  private handlePlayerMove = (vector: { x: number, y: number }) => {
    this.padInput = vector;
  };

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player-sprite');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);

    this.setOrigin(0.5, 1.0);
    this.setScale(2.5);

    if (this.body) {
      this.body.setSize(16, 12);
      this.body.setOffset(16, 36); 
    }

    this.setupInputs(scene);
  }

  private setupInputs(scene: Phaser.Scene) {
    GameEventBus.on(GAME_EVENTS.PLAYER_MOVE, this.handlePlayerMove);
    if (scene.input.keyboard) {
      this.cursors = scene.input.keyboard.createCursorKeys();
      this.wasdKeys = scene.input.keyboard.addKeys('W,A,S,D') as any;
    }
  }

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

    // ★ 完璧なアニメーション制御ロジック
    if (moveX === 0 && moveY === 0) {
      // 止まっている時は、最後に動いていた方向の待機画像を表示する
      this.anims.play(`idle-${this.lastDirection}`, true);
    } else {
      if (moveX !== 0) {
        this.lastDirection = 'side';
        this.setFlipX(moveX < 0); // 左なら反転
        this.anims.play('walk-side', true);
      } else if (moveY < 0) {
        this.lastDirection = 'up';
        this.setFlipX(false);
        this.anims.play('walk-up', true);
      } else if (moveY > 0) {
        this.lastDirection = 'down';
        this.setFlipX(false);
        this.anims.play('walk-down', true);
      }
    }

    this.setDepth(this.y);
  }

  destroy(fromScene?: boolean) {
    GameEventBus.off(GAME_EVENTS.PLAYER_MOVE, this.handlePlayerMove);
    super.destroy(fromScene);
  }
}

export default Player;