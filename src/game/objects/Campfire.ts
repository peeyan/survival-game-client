import Phaser from 'phaser';

class Campfire extends Phaser.GameObjects.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'campfire-img');
    scene.add.existing(this);

    // ★ 足元基準にして拡大
    this.setOrigin(0.5, 1.0);
    this.setScale(2.5);
    this.setDepth(this.y);

    // 演出：アニメーションの拡大率も2.5倍ベースに調整
    scene.tweens.add({
      targets: this,
      scaleX: 2.9,
      scaleY: 2.9,
      duration: 300,
      yoyo: true,
      repeat: -1
    });
  }
}

export default Campfire;