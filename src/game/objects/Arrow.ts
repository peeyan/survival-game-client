import Phaser from 'phaser';

class Arrow extends Phaser.Physics.Arcade.Sprite {
  private readonly MAX_RANGE = 420;
  private traveledDist = 0;
  private readonly speed = 600;
  public damage: number;
  private vx: number;
  private vy: number;

  constructor(scene: Phaser.Scene, x: number, y: number, angle: number, damage: number) {
    if (!scene.textures.exists('arrow-texture')) Arrow.generateTexture(scene);
    super(scene, x, y, 'arrow-texture');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.damage = damage;
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;
    this.setRotation(angle);
    this.setDepth(y);
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(this.vx, this.vy);
  }

  private static generateTexture(scene: Phaser.Scene): void {
    const g = scene.add.graphics();
    g.fillStyle(0x8b6340, 1);
    g.fillRect(0, 2, 24, 2);          // 矢の棒
    g.fillStyle(0xcccccc, 1);
    g.fillTriangle(24, 3, 20, 0, 20, 6); // 鏃
    g.fillStyle(0xdddddd, 0.8);
    g.fillRect(0, 2, 4, 2);           // 羽根
    g.generateTexture('arrow-texture', 26, 6);
    g.destroy();
  }

  update(delta: number): boolean {
    const dist = Math.sqrt(this.vx * this.vx + this.vy * this.vy) * (delta / 1000);
    this.traveledDist += dist;
    this.setDepth(this.y);
    return this.traveledDist >= this.MAX_RANGE;
  }
}

export default Arrow;
