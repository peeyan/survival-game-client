import Phaser from 'phaser';
import type { GameState } from '../../logic/GameState';
import { GameEventBus, GAME_EVENTS } from '../../logic/GameEventBus';

export default class Bear extends Phaser.Physics.Arcade.Sprite {
  private wanderAngle = Math.random() * Math.PI * 2;
  private wanderTimer = 0;
  private isTracking = false;
  private damageCooldown = 2200;
  private lastDamageTime = 0;
  private readonly campfireAvoidRange = 280;
  private isNight = false;

  public hp = 150;
  private stunUntil = 0;
  private kbVx = 0;
  private kbVy = 0;

  private get speed(): number { return 140; }
  private get detectionRange(): number { return this.isNight ? 520 : 160; }
  private get damage(): number { return 25; }

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'bear-img');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    (this.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
    (this.body as Phaser.Physics.Arcade.Body).setSize(36, 30);
    this.setDepth(y);
  }

  takeDamage(damage: number, knockbackAngle: number): boolean {
    this.hp -= damage;
    this.stunUntil = Date.now() + 200; // クマはスタンが短い
    const spd = 150;
    this.kbVx = Math.cos(knockbackAngle) * spd;
    this.kbVy = Math.sin(knockbackAngle) * spd;
    this.isTracking = true; // 攻撃されたら必ず追跡開始
    this.setTint(0xff4444);
    this.scene.time.delayedCall(110, () => { if (this.active) this.clearTint(); });
    return this.hp <= 0;
  }

  update(
    player: Phaser.GameObjects.Sprite,
    campfires: Phaser.GameObjects.Group,
    gs: GameState
  ): void {
    this.isNight = gs.time.hour >= 18 || gs.time.hour <= 5;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const now = Date.now();

    if (now < this.stunUntil) {
      body.setVelocity(this.kbVx, this.kbVy);
      this.setDepth(this.y);
      return;
    }

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    if (this.isNight) {
      const nearFire = campfires.getChildren().some((cf: any) =>
        Phaser.Math.Distance.Between(this.x, this.y, cf.x, cf.y) < this.campfireAvoidRange
      );
      if (nearFire) { this.isTracking = false; body.setVelocity(0, 0); return; }
    }

    if (!this.isNight && dist < 200 && !this.isTracking) {
      const angle = Phaser.Math.Angle.Between(player.x, player.y, this.x, this.y);
      body.setVelocity(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);
      this.setDepth(this.y);
      return;
    }

    const detectMult = gs.getAnimalDetectionMult(this.x, this.y, player.x, player.y);
    if (dist < this.detectionRange * detectMult) this.isTracking = true;
    else if (dist > this.detectionRange * 1.5) this.isTracking = false;

    if (this.isTracking) {
      const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
      body.setVelocity(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);
      if (dist < 50 && now - this.lastDamageTime >= this.damageCooldown) {
        this.lastDamageTime = now;
        GameEventBus.emit(GAME_EVENTS.PLAYER_TOOK_DAMAGE, this.damage);
      }
    } else {
      this.wanderTimer -= 16;
      if (this.wanderTimer <= 0) {
        this.wanderAngle += Phaser.Math.FloatBetween(-0.5, 0.5);
        this.wanderTimer = Phaser.Math.Between(1500, 4000);
      }
      body.setVelocity(Math.cos(this.wanderAngle) * 40, Math.sin(this.wanderAngle) * 40);
    }

    this.setDepth(this.y);
    this.setFlipX(body.velocity.x < 0);
  }
}
