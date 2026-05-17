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

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player-sprite');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    
    // 木や石と同じように少し大きくします
    this.setScale(2.5);

    // ★ 追加：プレイヤーの当たり判定を「足元だけ」にする
    if (this.body) {
      // 48x48の画像の、下の方（16x16）だけを当たり判定にします
      this.body.setSize(16, 16);
      this.body.setOffset(16, 32); 
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

    // アニメーション制御
    if (this.body && this.body.velocity.x < 0) {
      this.anims.play('left', true);
    } else if (this.body && this.body.velocity.x > 0) {
      this.anims.play('right', true);
    } else if (this.body && this.body.velocity.y !== 0) {
      if (!this.anims.isPlaying) this.anims.play('turn'); 
    } else {
      this.anims.play('turn', true);
    }

    // ★ 追加：移動するたびに自分の「奥行き(Z-Index)」を更新する
    this.setDepth(this.y);
  }

  destroy(fromScene?: boolean) {
    GameEventBus.off(GAME_EVENTS.PLAYER_MOVE, this.handlePlayerMove);
    super.destroy(fromScene);
  }
}

export default Player;