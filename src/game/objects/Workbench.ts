import Phaser from 'phaser';

class Workbench extends Phaser.GameObjects.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    if (!scene.textures.exists('workbench-texture')) Workbench.generateTexture(scene);
    super(scene, x, y, 'workbench-texture');
    scene.add.existing(this);
    this.setDepth(y + 1);
  }

  private static generateTexture(scene: Phaser.Scene): void {
    const g = scene.add.graphics();
    // 天板
    g.fillStyle(0x8b5e3c, 1);
    g.fillRect(2, 4, 60, 18);
    g.lineStyle(1.5, 0x5a3a20, 1);
    g.strokeRect(2, 4, 60, 18);
    // 脚
    g.fillStyle(0x6b4a2a, 1);
    g.fillRect(6, 20, 8, 14);
    g.fillRect(50, 20, 8, 14);
    // 道具の影（斧と鋸のシルエット）
    g.fillStyle(0x555555, 0.6);
    g.fillRect(12, 7, 3, 10); // 斧の柄
    g.fillRect(10, 6, 7, 3);  // 斧の刃
    g.fillRect(38, 8, 14, 2); // 鋸
    // ハイライト
    g.lineStyle(1, 0xddaa88, 0.4);
    g.strokeRect(2, 4, 60, 6);
    g.generateTexture('workbench-texture', 64, 34);
    g.destroy();
  }
}

export default Workbench;
