import Phaser from 'phaser';

class Stone extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'stone-img');
    scene.add.existing(this);
    scene.physics.add.existing(this, true);

    // ★ 足元原点にして拡大
    this.setOrigin(0.5, 1.0);
    this.setScale(2.5);

    // ★ 岩の形に合わせて、下半分をしっかり壁にする
    if (this.body) {
      const body = this.body as Phaser.Physics.Arcade.StaticBody;
      const bWidth = this.width * 0.8;
      const bHeight = this.height * 0.5;
      
      body.setSize(bWidth, bHeight);
      body.setOffset((this.width - bWidth) / 2, this.height - bHeight);
      body.updateFromGameObject();
    }

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

export default Stone;