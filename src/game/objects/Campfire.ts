import Phaser from 'phaser';

class Campfire extends Phaser.GameObjects.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'dummy-campfire');
    scene.add.existing(this);

    // 演出：火が燃えているように、少しサイズをパタパタ揺らす（Tween）
    scene.tweens.add({
      targets: this,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 300,
      yoyo: true,
      repeat: -1 // 無限ループ
    });
  }
}

export default Campfire;