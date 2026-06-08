import Phaser from 'phaser';
import { GameEventBus, GAME_EVENTS } from '../../logic/GameEventBus';
import type { GameState } from '../../logic/GameState';
import type Campfire from './Campfire';

/** ラプター（ヴェロキラプトル風）の夜行性肉食獣クラス */
class Raptor extends Phaser.GameObjects.Sprite {
  private speed = 120;
  private detectionRange = 300;
  private attackRange = 30;
  private campfireAvoidRange = 150;
  private damageCooldown = 1500; // ms
  private lastDamageTime = 0;
  private isTracking = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    // プログラム生成テクスチャのキーが未登録なら生成する
    if (!scene.textures.exists('raptor-texture')) {
      Raptor.generateTexture(scene);
    }

    super(scene, x, y, 'raptor-texture');
    scene.add.existing(this);

    // 初期状態は非アクティブ（昼間）
    this.setActive(false);
    this.setVisible(false);
    this.setDepth(this.y);
  }

  /** グラフィックスでラプターのテクスチャを生成する */
  private static generateTexture(scene: Phaser.Scene): void {
    const g = scene.add.graphics();

    // 緑がかった楕円ボディ（かわいいシルエット）
    g.fillStyle(0x4a7c59, 1);
    g.fillEllipse(16, 12, 32, 24);

    // 輪郭線
    g.lineStyle(1.5, 0x2d5a3d, 1);
    g.strokeEllipse(16, 12, 32, 24);

    // 左目（白い点）
    g.fillStyle(0xffffff, 1);
    g.fillCircle(10, 8, 3);

    // 右目（白い点）
    g.fillCircle(22, 8, 3);

    // 瞳（黒）
    g.fillStyle(0x000000, 1);
    g.fillCircle(10, 8, 1.5);
    g.fillCircle(22, 8, 1.5);

    g.generateTexture('raptor-texture', 32, 24);
    g.destroy();
  }

  /**
   * 毎フレーム呼び出す更新メソッド
   * @param player プレイヤーオブジェクト
   * @param campfires 焚き火グループ
   * @param gs GameStateのインスタンス
   */
  update(
    player: Phaser.GameObjects.Sprite,
    campfires: Phaser.GameObjects.Group,
    gs: GameState
  ): void {
    const hour = gs.time.hour;
    const isNight = hour >= 18 || hour <= 5;

    // 夜間でないとき非表示にして処理をスキップ
    if (!isNight) {
      if (this.active) {
        this.setActive(false);
        this.setVisible(false);
        this.isTracking = false;
      }
      return;
    }

    // 夜間なら表示状態にする
    if (!this.active) {
      this.setActive(true);
      this.setVisible(true);
    }

    const distToPlayer = Phaser.Math.Distance.Between(
      this.x, this.y,
      player.x, player.y
    );

    // 焚き火回避チェック
    const isNearCampfire = campfires.getChildren().some((cf) => {
      const fire = cf as Campfire;
      return Phaser.Math.Distance.Between(this.x, this.y, fire.x, fire.y) < this.campfireAvoidRange;
    });

    if (isNearCampfire) {
      // 焚き火に近い場合は追跡を中止してその場で止まる
      this.isTracking = false;
      this.setDepth(this.y);
      return;
    }

    // 発見判定
    if (distToPlayer <= this.detectionRange) {
      this.isTracking = true;
    }

    if (!this.isTracking) {
      this.setDepth(this.y);
      return;
    }

    // 接触ダメージ判定
    const now = Date.now();
    if (distToPlayer <= this.attackRange) {
      if (now - this.lastDamageTime >= this.damageCooldown) {
        this.lastDamageTime = now;
        GameEventBus.emit(GAME_EVENTS.PLAYER_TOOK_DAMAGE, 10);
      }
      // 接触中は移動しない
      this.setDepth(this.y);
      return;
    }

    // プレイヤーへ向かって移動（冬は速度1.3倍）
    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    const delta = this.scene.game.loop.delta / 1000; // 秒単位
    const effectiveSpeed = this.speed * gs.getEnemySpeedMultiplier();
    this.x += Math.cos(angle) * effectiveSpeed * delta;
    this.y += Math.sin(angle) * effectiveSpeed * delta;
    this.setDepth(this.y);

    // 向きに応じて反転
    this.setFlipX(player.x < this.x);
  }
}

export default Raptor;
