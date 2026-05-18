import { GameEventBus, GAME_EVENTS } from './GameEventBus';

class GameState {
  // インベントリのデータ（状態）
  public inventory = {
    wood: 0,
    stone: 0,
  };

  // 空腹度の状態管理
  public hunger = 100;
  public maxHunger = 100;

  // 時間の状態管理（初期値は1日目の16:30に変更して夕暮れをすぐテストできるようにする）
  public totalMinutes = 16 * 60 + 30; 
  public time = {
    day: 1,
    hour: 16,
    minute: 30
  };

  // 木材を追加するメソッド
  addWood(amount: number) {
    this.inventory.wood += amount;
    GameEventBus.emit(GAME_EVENTS.INVENTORY_UPDATED, this.inventory);
  }

  addStone(amount: number) {
    this.inventory.stone += amount;
    GameEventBus.emit(GAME_EVENTS.INVENTORY_UPDATED, this.inventory);
  }

  canCraftCampfire(): boolean {
    const cost = { wood: 3, stone: 3 };
    if (this.inventory.wood >= cost.wood && this.inventory.stone >= cost.stone) {
      // 素材を消費
      this.inventory.wood -= cost.wood;
      this.inventory.stone -= cost.stone;
      // 画面（React）に最新の所持数を通知
      GameEventBus.emit(GAME_EVENTS.INVENTORY_UPDATED, this.inventory);
      return true;
    }
    return false;
  }

  // 空腹度を減らす
  consumeHunger(amount: number) {
    this.hunger = Math.max(0, this.hunger - amount);
    GameEventBus.emit(GAME_EVENTS.HUNGER_UPDATED, this.hunger);
  }

  // 食料を食べて回復する
  eatFood(amount: number) {
    this.hunger = Math.min(this.maxHunger, this.hunger + amount);
    GameEventBus.emit(GAME_EVENTS.HUNGER_UPDATED, this.hunger);
  }

  // 時間を進める
  advanceTime(mins: number) {
    this.totalMinutes += mins;
    this.time.day = Math.floor(this.totalMinutes / (24 * 60)) + 1;
    this.time.hour = Math.floor((this.totalMinutes % (24 * 60)) / 60);
    this.time.minute = this.totalMinutes % 60;
    
    GameEventBus.emit(GAME_EVENTS.TIME_UPDATED, this.time);
  }
}

// シングルトンとしてエクスポート（アプリ全体で1つの状態を共有する）
export const gameState = new GameState();