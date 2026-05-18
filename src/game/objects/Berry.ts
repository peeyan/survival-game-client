import Phaser from 'phaser';

class Berry extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'berry-img');
    scene.add.existing(this);
    scene.physics.add.existing(this, true); // 静的ボディ

    // ★ 足元原点にして拡大
    this.setOrigin(0.5, 1.0);
    this.setScale(2.5);

    // 当たり判定を調整
    if (this.body) {
      const body = this.body as Phaser.Physics.Arcade.StaticBody;
      const bWidth = this.width * 0.6;
      const bHeight = this.height * 0.4;
      
      body.setSize(bWidth, bHeight);
      body.setOffset((this.width - bWidth) / 2, this.height - bHeight);
      body.updateFromGameObject();
    }

    // Yソート
    this.setDepth(this.y);
  }

  harvest(onComplete: () => void) {
    if (this.scale === 0) return;
    this.scene.tweens.add({
      targets: this,
      scale: 0,
      duration: 200,
      onComplete: () => {
        this.destroy();
        onComplete();
      }
    });
  }
}

export default Berry;