import Phaser from 'phaser';

class Tree extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'tree-img');
    scene.add.existing(this);
    this.setOrigin(0.5, 1.0);

    this.setScale(2.5);
    this.setDepth(this.y); // 奥行き表現

    // 物理ボディを一旦「動く(Dynamic)」として追加
    scene.physics.add.existing(this);

    if (this.body) {
      const body = this.body as Phaser.Physics.Arcade.Body;
      // ぶつかっても押されない（動かない）ように固定する
      body.setImmovable(true);

      // 当たり判定を「木の幹（根元）」だけに絞る
      // 横幅は半分、高さは下から20%分だけの小さな箱にします
      body.setSize(this.width * 0.5, this.height * 0.2);
      // 当たり判定の位置を、画像の下の方にずらします
      body.setOffset(this.width * 0.25, this.height * 0.8);
    }
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

export default Tree;