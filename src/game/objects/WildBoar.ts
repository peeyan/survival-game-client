import Phaser from 'phaser';
import type { GameState } from '../../logic/GameState';
import { GameEventBus, GAME_EVENTS } from '../../logic/GameEventBus';

export default class WildBoar extends Phaser.Physics.Arcade.Sprite {
  private wanderAngle = Math.random() * Math.PI * 2;
  private wanderTimer = 0;
  private readonly chargeRange = 220;
  private isCharging = false;
  private damageCooldown = 1800;
  private lastDamageTime = 0;

  public hp = 80;
  private stunUntil = 0;
  private kbVx = 0;
  private kbVy = 0;
  private isEnraged = false; // HP半分以下で激怒

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'boar-img');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    (this.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
    (this.body as Phaser.Physics.Arcade.Body).setSize(32, 22);
    this.setDepth(y);
  }

  takeDamage(damage: number, knockbackAngle: number): boolean {
    this.hp -= damage;
    if (this.hp <= 40) {
      this.isEnraged = true;
      this.setTint(0xff6600); // 激怒で橙色
    }
    this.stunUntil = Date.now() + (this.isEnraged ? 150 : 300); // 激怒中はスタン短い
    const spd = this.isEnraged ? 120 : 200;
    this.kbVx = Math.cos(knockbackAngle) * spd;
    this.kbVy = Math.sin(knockbackAngle) * spd;
    if (!this.isEnraged) {
      this.setTint(0xff4444);
      this.scene.time.delayedCall(130, () => { if (this.active && !this.isEnraged) this.clearTint(); });
    }
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
    const chargeRange = (this.isEnraged ? this.chargeRange * 1.5 : this.chargeRange) * detectMult;
    const speed = this.isEnraged ? 240 : 195;

    if (dist < chargeRange) this.isCharging = true;
    else if (dist > chargeRange * 2) this.isCharging = false;

    if (this.isCharging) {
      const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
      body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      if (dist < 40 && now - this.lastDamageTime >= this.damageCooldown) {
        this.lastDamageTime = now;
        GameEventBus.emit(GAME_EVENTS.PLAYER_TOOK_DAMAGE, this.isEnraged ? 18 : 12);
      }
    } else {
      this.wanderTimer -= 16;
      if (this.wanderTimer <= 0) {
        this.wanderAngle += Phaser.Math.FloatBetween(-0.7, 0.7);
        this.wanderTimer = Phaser.Math.Between(1000, 3000);
      }
      body.setVelocity(Math.cos(this.wanderAngle) * 50, Math.sin(this.wanderAngle) * 50);
    }

    this.setDepth(this.y);
    this.setFlipX(body.velocity.x < 0);
  }
}
