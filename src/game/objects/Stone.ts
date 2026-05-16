import Phaser from 'phaser';

class Stone extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'dummy-stone');
    scene.add.existing(this);
    scene.physics.add.existing(this, true); // 動かない壁
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