import Phaser from 'phaser';
import { GameEventBus, GAME_EVENTS } from '../../logic/GameEventBus';
import type { GameState, Inventory } from '../../logic/GameState';

type LootTable = Partial<Record<keyof Inventory, number>>;

const LOOT_TABLES: LootTable[] = [
  { cannedFood: 2, fiber: 1 },
  { antibiotics: 1, bandage: 1 },
  { vine: 3, herbs: 2 },
  { cannedFood: 1, fiber: 2, herbs: 1 },
  { antibiotics: 2 },
  { vine: 4, stone: 2 },
  { electronicParts: 2, fiber: 1 },
  { electronicParts: 1, cannedFood: 1, herbs: 1 },
  // Tier2素材（村の特定クレートで出現）
  { boatParts: 1, fuelTank: 1 },
  { navigationMap: 1, cannedFood: 2 },
  { rotorPart: 1, electronicParts: 2 },
  { techManual: 1, antibiotics: 1 },
  { flightManual: 1, fiber: 2 },
  { boatParts: 2, vine: 2 },
];

class LootCrate extends Phaser.GameObjects.Sprite {
  private searched = false;
  private loot: LootTable;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    if (!scene.textures.exists('loot-texture')) {
      LootCrate.generateTexture(scene);
    }
    super(scene, x, y, 'loot-texture');
    scene.add.existing(this);
    this.setDepth(y);
    this.loot = LOOT_TABLES[Math.floor(Math.random() * LOOT_TABLES.length)];
  }

  private static generateTexture(scene: Phaser.Scene): void {
    const g = scene.add.graphics();
    // 瓦礫
    g.fillStyle(0x8b7355, 1);
    g.fillRect(0, 8, 28, 16);
    g.fillStyle(0x6b5335, 1);
    g.fillRect(2, 4, 12, 10);
    g.fillRect(16, 6, 10, 8);
    g.fillStyle(0xaaaaaa, 0.6);
    g.fillRect(6, 10, 6, 4);
    g.fillRect(18, 12, 4, 4);
    g.lineStyle(1, 0x4a3a2a, 1);
    g.strokeRect(0, 8, 28, 16);
    g.generateTexture('loot-texture', 28, 24);
    g.destroy();
  }

  interact(gs: GameState): boolean {
    if (this.searched) return false;
    this.searched = true;

    (Object.entries(this.loot) as [keyof Inventory, number][]).forEach(([key, amount]) => {
      gs.addItem(key, amount);
    });

    // 検索済み演出（暗くする）
    this.setTint(0x555555);
    GameEventBus.emit(GAME_EVENTS.LOOT_FOUND, this.loot);
    return true;
  }

  isSearched(): boolean {
    return this.searched;
  }
}

export default LootCrate;
