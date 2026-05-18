import Phaser from 'phaser';

// Phaserが内部で持っているEventEmitterを流用して、グローバルなEventBusを作ります
export const GameEventBus = new Phaser.Events.EventEmitter();

export const GAME_EVENTS = {
  PLAYER_MOVE: 'player_move',
  ACTION_BUTTON: 'action_button_pressed',
  INVENTORY_UPDATED: 'inventory_updated',
  CRAFT_REQUEST: 'craft_request',
  CRAFT_SUCCESS: 'craft_success',
  HUNGER_UPDATED: 'hunger_updated',
};