import Phaser from 'phaser';
import { GameEventBus, GAME_EVENTS } from '../../logic/GameEventBus';
import type { GameState } from '../../logic/GameState';
import type Campfire from './Campfire';

class Wolf extends Phaser.GameObjects.Sprite {
  private speed = 130;
  private detectionRange = 280;
  private attackRange = 28;
  private campfireAvoidRange = 160;
  private damageCooldown = 1200;
  private lastDamageTime = 0;
  private isTracking = false;

  public hp = 60;
  private stunUntil = 0;
  private kbVx = 0;
  private kbVy = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    if (!scene.textures.exists('wolf-texture')) {
      Wolf.generateTexture(scene);
    }
    super(scene, x, y, 'wolf-texture');
    scene.add.existing(this);
    this.setActive(false);
    this.setVisible(false);
    this.setDepth(this.y);
  }

  private static generateTexture(scene: Phaser.Scene): void {
    const g = scene.add.graphics();

    // 胴体（細長い楕円）
    g.fillStyle(0x5a4a3a, 1);
    g.fillEllipse(20, 14, 38, 20);

    // 頭部（小さな楕円）
    g.fillStyle(0x4a3a2a, 1);
    g.fillEllipse(7, 10, 16, 14);

    // 耳（三角）
    g.fillStyle(0x3a2a1a, 1);
    g.fillTriangle(3, 8, 7, 2, 11, 8);

    // 目（黄色）
    g.fillStyle(0xffcc00, 1);
    g.fillCircle(6, 9, 2.5);

    // 瞳（黒）
    g.fillStyle(0x000000, 1);
    g.fillCircle(6, 9, 1.2);

    // 尻尾（細い楕円）
    g.fillStyle(0x5a4a3a, 1);
    g.fillEllipse(36, 10, 12, 5);

    // 輪郭
    g.lineStyle(1, 0x2a1a0a, 0.8);
    g.strokeEllipse(20, 14, 38, 20);

    g.generateTexture('wolf-texture', 44, 26);
    g.destroy();
  }

  takeDamage(damage: number, knockbackAngle: number): boolean {
    this.hp -= damage;
    this.stunUntil = Date.now() + 300;
    const spd = 220;
    this.kbVx = Math.cos(knockbackAngle) * spd;
    this.kbVy = Math.sin(knockbackAngle) * spd;
    this.isTracking = true;
    this.setTint(0xff4444);
    this.scene.time.delayedCall(120, () => { if (this.active) this.clearTint(); });
    return this.hp <= 0;
  }

  update(
    player: Phaser.GameObjects.Sprite,
    campfires: Phaser.GameObjects.Group,
    gs: GameState
  ): void {
    const now = Date.now();
    if (now < this.stunUntil) {
      this.x += this.kbVx * (this.scene.game.loop.delta / 1000);
      this.y += this.kbVy * (this.scene.game.loop.delta / 1000);
      this.setDepth(this.y);
      return;
    }

    const h = gs.time.hour;
    const isNight = h >= 18 || h <= 5;

    // 食物連鎖：ウサギが少ないと昼も活動
    const hungerAggression = gs.rabbitCount < 10;
    const isActive = isNight || (hungerAggression && gs.weather !== 'storm');

    if (!isActive) {
      if (this.active) {
        this.setActive(false);
        this.setVisible(false);
        this.isTracking = false;
      }
      return;
    }

    if (!this.active) {
      this.setActive(true);
      this.setVisible(true);
    }

    const distToPlayer = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    // 焚き火回避
    const isNearCampfire = campfires.getChildren().some((cf) => {
      const fire = cf as Campfire;
      return Phaser.Math.Distance.Between(this.x, this.y, fire.x, fire.y) < this.campfireAvoidRange;
    });

    if (isNearCampfire) {
      this.isTracking = false;
      this.setDepth(this.y);
      return;
    }

    const detectMult = gs.getAnimalDetectionMult(this.x, this.y, player.x, player.y);
    if (distToPlayer <= this.detectionRange * detectMult) {
      this.isTracking = true;
    }

    if (!this.isTracking) {
      this.setDepth(this.y);
      return;
    }

    // 攻撃判定
    const attackNow = Date.now();
    if (distToPlayer <= this.attackRange) {
      if (attackNow - this.lastDamageTime >= this.damageCooldown) {
        this.lastDamageTime = attackNow;
        GameEventBus.emit(GAME_EVENTS.PLAYER_TOOK_DAMAGE, 12);
      }
      this.setDepth(this.y);
      return;
    }

    // 追跡移動
    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    const delta = this.scene.game.loop.delta / 1000;
    const spd = this.speed * gs.getEnemySpeedMultiplier();
    this.x += Math.cos(angle) * spd * delta;
    this.y += Math.sin(angle) * spd * delta;
    this.setDepth(this.y);
    this.setFlipX(player.x < this.x);
  }
}

export default Wolf;
