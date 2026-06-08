import Phaser from 'phaser';

/** セーブハウス — 近づいてアクションボタンで手動セーブ */
export default class SaveHouse extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'savehouse-img');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setImmovable(true);
    body.setSize(60, 50);
    this.setDepth(y);
  }
}
