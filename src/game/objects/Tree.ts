import Phaser from 'phaser';

class Tree extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'dummy-tree');

    // シーンの描画ツリーに追加
    scene.add.existing(this);

    // 物理エンジンに登録（第2引数 true で Static（静的）ボディになり、動かない壁になる）
    scene.physics.add.existing(this, true);
  }

  /**
   * 自身が伐採された時のエフェクトと消滅処理（カプセル化）
   * @param onComplete 完全に消滅した後に実行したいコールバック（アイテム追加用など）
   */
  harvest(onComplete: () => void) {
    // すでに伐採アニメーション中の場合は重複処理を避ける
    if (this.scale === 0) return;

    // MainSceneにあったアニメーションロジックをこちらにカプセル化
    this.scene.tweens.add({
      targets: this,
      scale: 0,
      duration: 200,
      onComplete: () => {
        this.destroy(); // オブジェクトの破棄
        onComplete();   // 完了通知
      }
    });
  }
}

export default Tree;