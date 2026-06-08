import Phaser from 'phaser';
import type { GameState } from '../../logic/GameState';

type CropType = 'berry' | 'veggie';

class FarmPlot extends Phaser.GameObjects.Container {
  private growthStage: 0 | 1 | 2 | 3 = 0;
  private growthMinutes = 0;
  private readonly MINUTES_PER_STAGE = 480; // 8ゲーム時間
  private cropType: CropType;
  private visual!: Phaser.GameObjects.Graphics;
  private stageLabel!: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, cropType: CropType = 'berry') {
    super(scene, x, y);
    this.cropType = cropType;
    scene.add.existing(this);
    this.setDepth(y + 1);
    this._buildVisual();
  }

  private _buildVisual(): void {
    if (this.visual) this.visual.destroy();
    if (this.stageLabel) this.stageLabel.destroy();

    const g = this.scene.add.graphics();
    // 畑の土台
    g.fillStyle(0x5a3a10, 0.9);
    g.fillRect(-24, -16, 48, 28);
    g.lineStyle(1.5, 0x3a2008, 0.8);
    g.strokeRect(-24, -16, 48, 28);

    // 成長ステージ別の表示
    const stageColors: number[] = [0x888844, 0x44aa44, 0x22cc22, 0xff8800];
    const stageH = [2, 6, 12, 14];
    if (this.growthStage > 0) {
      g.fillStyle(stageColors[this.growthStage], 1);
      const h = stageH[this.growthStage];
      for (let i = -18; i <= 12; i += 12) {
        g.fillEllipse(i, -8 - h / 2, 8, h);
      }
    }

    // 収穫可能時に実を表示
    if (this.growthStage >= 3) {
      const fruitColor = this.cropType === 'berry' ? 0xff3333 : 0xffaa00;
      g.fillStyle(fruitColor, 1);
      for (let i = -14; i <= 10; i += 12) {
        g.fillCircle(i, -18, 4);
      }
    }

    g.generateTexture(`farmplot-s${this.growthStage}-${this.cropType}`, 52, 36);
    g.destroy();

    this.visual = this.scene.add.graphics();
    this.visual.fillStyle(0x5a3a10, 0.9);
    this.visual.fillRect(-24, -16, 48, 28);
    this.visual.lineStyle(1.5, 0x3a2008, 0.8);
    this.visual.strokeRect(-24, -16, 48, 28);
    if (this.growthStage > 0) {
      this.visual.fillStyle(stageColors[this.growthStage], 1);
      const h = stageH[this.growthStage];
      for (let i = -18; i <= 12; i += 12) {
        this.visual.fillEllipse(i, -8 - h / 2, 8, h);
      }
    }
    if (this.growthStage >= 3) {
      const fruitColor = this.cropType === 'berry' ? 0xff3333 : 0xffaa00;
      this.visual.fillStyle(fruitColor, 1);
      for (let i = -14; i <= 10; i += 12) {
        this.visual.fillCircle(i, -18, 4);
      }
    }
    this.add(this.visual);

    const labels = ['🌱', '🌿', '🌳', '✨収穫可能'];
    this.stageLabel = this.scene.add.text(0, -28, labels[this.growthStage], {
      fontSize: '10px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5, 1);
    this.add(this.stageLabel);
  }

  advanceTime(gameMins: number, isRaining: boolean): void {
    if (this.growthStage >= 3) return; // 収穫待ち
    const rate = isRaining ? 1.5 : 1.0;
    this.growthMinutes += gameMins * rate;
    const newStage = Math.min(3, Math.floor(this.growthMinutes / this.MINUTES_PER_STAGE)) as 0 | 1 | 2 | 3;
    if (newStage !== this.growthStage) {
      this.growthStage = newStage;
      this._buildVisual();
    }
  }

  isHarvestable(): boolean {
    return this.growthStage >= 3;
  }

  harvest(gs: GameState): void {
    const amount = 2 + Math.floor(Math.random() * 2) + (gs.skills.gatherer >= 2 ? 1 : 0);
    if (this.cropType === 'berry') {
      gs.eatFood(15 * amount, 'safe', true);
    } else {
      gs.addItem('vegetable', amount);
    }
    gs.onFarmHarvested();
    // リセット
    this.growthStage  = 0;
    this.growthMinutes = 0;
    this._buildVisual();
  }

  getCropType(): CropType { return this.cropType; }
}

export default FarmPlot;
