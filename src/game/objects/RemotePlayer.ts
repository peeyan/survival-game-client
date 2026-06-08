import Phaser from 'phaser';
import type { RemotePlayerData } from '../systems/MultiplayerManager';

const PLAYER_COLORS = [0x44aaff, 0xff44aa, 0x44ffaa, 0xffaa44];
let colorIndex = 0;

class RemotePlayer extends Phaser.GameObjects.Container {
  private sprite!:   Phaser.GameObjects.Sprite;
  private nameLabel!: Phaser.GameObjects.Text;
  private hpBar!:    Phaser.GameObjects.Graphics;
  private color:     number;

  public  playerId:     string;
  public  displayName:  string;

  // 補間用
  private targetX = 0;
  private targetY = 0;

  constructor(scene: Phaser.Scene, data: RemotePlayerData) {
    super(scene, data.x, data.y);
    this.playerId    = data.id;
    this.displayName = data.displayName;
    this.color       = PLAYER_COLORS[colorIndex++ % PLAYER_COLORS.length];

    scene.add.existing(this);
    this.setDepth(data.y);
    this._build(scene);
    this.updateFromData(data);
  }

  private _build(scene: Phaser.Scene): void {
    // プレイヤースプライト（色違い）
    this.sprite = scene.add.sprite(0, 0, 'player-sprite');
    this.sprite.setScale(2.5).setTint(this.color);
    this.sprite.setOrigin(0.5, 1.0);
    this.add(this.sprite);

    // 名前ラベル
    this.nameLabel = scene.add.text(0, -80, this.displayName, {
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.55)',
      padding: { x: 4, y: 2 },
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5, 1);
    this.add(this.nameLabel);

    // HPバー
    this.hpBar = scene.add.graphics();
    this.add(this.hpBar);
  }

  updateFromData(data: RemotePlayerData): void {
    this.targetX = data.x;
    this.targetY = data.y;
    this.sprite.setFlipX(data.facingAngle > Math.PI / 2 || data.facingAngle < -Math.PI / 2);

    // HPバー更新
    this.hpBar.clear();
    const barW = 40, barH = 5;
    const hpFrac = Math.max(0, data.hp / 100);
    this.hpBar.fillStyle(0x222222, 0.8);
    this.hpBar.fillRect(-barW / 2, -90, barW, barH);
    const color = hpFrac > 0.5 ? 0x44cc44 : hpFrac > 0.25 ? 0xffcc00 : 0xff3333;
    this.hpBar.fillStyle(color, 1);
    this.hpBar.fillRect(-barW / 2, -90, barW * hpFrac, barH);
  }

  update(): void {
    // スムーズ補間（6フレーム）
    this.x += (this.targetX - this.x) * 0.18;
    this.y += (this.targetY - this.y) * 0.18;
    this.setDepth(this.y);

    // 歩行アニメーション
    const moving = Math.abs(this.targetX - this.x) > 1 || Math.abs(this.targetY - this.y) > 1;
    if (moving) {
      this.sprite.anims.play('walk-side', true);
    } else {
      this.sprite.anims.play('idle-down', true);
    }
  }
}

export default RemotePlayer;
