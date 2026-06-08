import Phaser from 'phaser';
import type { GameState } from '../../logic/GameState';

export default class Rabbit extends Phaser.Physics.Arcade.Sprite {
  private wanderAngle = Math.random() * Math.PI * 2;
  private wanderTimer = 0;
  private readonly speed = 210;
  private readonly fleeRange = 200;

  public hp = 10;
  private stunUntil = 0;
  private kbVx = 0;
  private kbVy = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'rabbit-img');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    (this.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
    (this.body as Phaser.Physics.Arcade.Body).setSize(20, 16);
    this.setDepth(y);
  }

  takeDamage(damage: number, knockbackAngle: number): boolean {
    this.hp -= damage;
    this.stunUntil = Date.now() + 350;
    const spd = 260;
    this.kbVx = Math.cos(knockbackAngle) * spd;
    this.kbVy = Math.sin(knockbackAngle) * spd;
    this.setTint(0xff4444);
    this.scene.time.delayedCall(120, () => { if (this.active) this.clearTint(); });
    return this.hp <= 0;
  }

  update(player: Phaser.GameObjects.Sprite, _gs: GameState): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const now = Date.now();

    if (now < this.stunUntil) {
      body.setVelocity(this.kbVx, this.kbVy);
      this.setDepth(this.y);
      return;
    }

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const detectMult = _gs.getAnimalDetectionMult(this.x, this.y, player.x, player.y);
    if (dist < this.fleeRange * detectMult) {
      const angle = Phaser.Math.Angle.Between(player.x, player.y, this.x, this.y);
      body.setVelocity(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);
    } else {
      this.wanderTimer -= 16;
      if (this.wanderTimer <= 0) {
        this.wanderAngle += Phaser.Math.FloatBetween(-0.8, 0.8);
        this.wanderTimer = Phaser.Math.Between(800, 2400);
      }
      body.setVelocity(Math.cos(this.wanderAngle) * 55, Math.sin(this.wanderAngle) * 55);
    }

    this.setDepth(this.y);
    this.setFlipX(body.velocity.x < 0);
  }
}
