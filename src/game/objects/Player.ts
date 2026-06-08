import Phaser from 'phaser';
import { GameEventBus, GAME_EVENTS } from '../../logic/GameEventBus';
import { gameState } from '../../logic/GameState';

class Player extends Phaser.Physics.Arcade.Sprite {
  private padInput = { x: 0, y: 0 };
  private keyboardInput = { x: 0, y: 0 };
  // playerSpeed は gameState.getPlayerSpeed() に委譲
  private lastDirection: 'down' | 'up' | 'side' = 'down';

  // 攻撃・回避
  public facingAngle = Math.PI / 2; // 下向き初期値
  private attackCooldownMs = 0;
  // ATTACK_COOLDOWN は gameState.getAttackStats().cooldown に委譲
  private readonly ATTACK_STAMINA_COST = 15;

  private dodgeCooldownMs = 0;
  private readonly DODGE_COOLDOWN = 900;
  private readonly DODGE_STAMINA_COST = 25;
  private readonly DODGE_DURATION = 220;
  private readonly DODGE_SPEED = 520;
  private isDodging = false;
  private dodgeTimer = 0;
  private dodgeVx = 0;
  private dodgeVy = 0;

  // スタミナ
  public stamina = 100;
  private readonly MAX_STAMINA = 100;
  private readonly STAMINA_REGEN = 20; // per second

  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys?: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private attackKey?: Phaser.Input.Keyboard.Key;
  private dodgeKey?: Phaser.Input.Keyboard.Key;
  private weaponKeys: Phaser.Input.Keyboard.Key[] = [];

  private handlePlayerMove = (vector: { x: number; y: number }) => {
    this.padInput = vector;
  };
  private handlePlayerAttack = () => { this._tryAttack(); };
  private handlePlayerDodge  = () => { this._tryDodge(); };

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player-sprite');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    this.setOrigin(0.5, 1.0);
    this.setScale(2.5);
    if (this.body) {
      this.body.setSize(16, 12);
      this.body.setOffset(16, 36);
    }
    this._setupInputs(scene);
  }

  private _setupInputs(scene: Phaser.Scene): void {
    GameEventBus.on(GAME_EVENTS.PLAYER_MOVE,   this.handlePlayerMove);
    GameEventBus.on(GAME_EVENTS.PLAYER_ATTACK, this.handlePlayerAttack);
    GameEventBus.on(GAME_EVENTS.PLAYER_DODGE,  this.handlePlayerDodge);

    if (scene.input.keyboard) {
      this.cursors   = scene.input.keyboard.createCursorKeys();
      this.wasdKeys  = scene.input.keyboard.addKeys('W,A,S,D') as typeof this.wasdKeys;
      this.attackKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
      this.dodgeKey  = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
      // 武器切替キー 1-4
      const codes = [
        Phaser.Input.Keyboard.KeyCodes.ONE, Phaser.Input.Keyboard.KeyCodes.TWO,
        Phaser.Input.Keyboard.KeyCodes.THREE, Phaser.Input.Keyboard.KeyCodes.FOUR,
      ];
      this.weaponKeys = codes.map(c => scene.input.keyboard!.addKey(c));
    }
  }

  private _tryAttack(): void {
    const stats = gameState.getAttackStats();
    if (this.attackCooldownMs > 0) return;
    if (this.stamina < this.ATTACK_STAMINA_COST) return;
    this.stamina -= this.ATTACK_STAMINA_COST;
    this.attackCooldownMs = stats.cooldown;

    if (gameState.activeWeapon === 'bow') {
      if (gameState.inventory.arrow < 1) {
        GameEventBus.emit(GAME_EVENTS.NOTIFICATION, '🏹 矢がない！');
        this.attackCooldownMs = 0;
        return;
      }
      gameState.inventory.arrow--;
      gameState.degradeTool('bow', 2);
      GameEventBus.emit(GAME_EVENTS.ARROW_FIRED, {
        x: this.x, y: this.y, angle: this.facingAngle, damage: stats.damage,
      });
    } else {
      // 近接
      if (gameState.activeWeapon === 'stoneKnife') gameState.degradeTool('stoneKnife', 5);
      if (gameState.activeWeapon === 'spear')      gameState.degradeTool('spear', 3);
      GameEventBus.emit(GAME_EVENTS.PLAYER_ATTACK, {
        x: this.x, y: this.y, angle: this.facingAngle,
        range: stats.range, arc: stats.arc, damage: stats.damage,
      });
    }
    GameEventBus.emit(GAME_EVENTS.STAMINA_UPDATED, this.stamina);
  }

  private _tryDodge(): void {
    if (this.isDodging) return;
    if (this.dodgeCooldownMs > 0) return;
    if (this.stamina < this.DODGE_STAMINA_COST) return;

    this.stamina -= this.DODGE_STAMINA_COST;
    this.isDodging = true;
    this.dodgeTimer = this.DODGE_DURATION;
    this.dodgeCooldownMs = this.DODGE_COOLDOWN;

    // 移動方向にダッシュ（止まっていれば後退）
    const mx = this.padInput.x + this.keyboardInput.x;
    const my = this.padInput.y + this.keyboardInput.y;
    if (mx !== 0 || my !== 0) {
      const len = Math.sqrt(mx * mx + my * my);
      this.dodgeVx = (mx / len) * this.DODGE_SPEED;
      this.dodgeVy = (my / len) * this.DODGE_SPEED;
    } else {
      // 向いている方向の逆に回避（バックステップ）
      this.dodgeVx = -Math.cos(this.facingAngle) * this.DODGE_SPEED;
      this.dodgeVy = -Math.sin(this.facingAngle) * this.DODGE_SPEED;
    }

    // 無敵付与
    gameState.isInvincible = true;
    this.setAlpha(0.5);

    GameEventBus.emit(GAME_EVENTS.PLAYER_DODGE, undefined);
    GameEventBus.emit(GAME_EVENTS.STAMINA_UPDATED, this.stamina);
  }

  update(delta = 16): void {
    this.keyboardInput = { x: 0, y: 0 };
    if (this.cursors && this.wasdKeys) {
      if (this.cursors.left.isDown  || this.wasdKeys.A.isDown) this.keyboardInput.x = -1;
      else if (this.cursors.right.isDown || this.wasdKeys.D.isDown) this.keyboardInput.x =  1;
      if (this.cursors.up.isDown   || this.wasdKeys.W.isDown) this.keyboardInput.y = -1;
      else if (this.cursors.down.isDown || this.wasdKeys.S.isDown) this.keyboardInput.y =  1;
    }

    // キーボード入力でのアクション
    if (this.attackKey && Phaser.Input.Keyboard.JustDown(this.attackKey)) this._tryAttack();
    if (this.dodgeKey  && Phaser.Input.Keyboard.JustDown(this.dodgeKey))  this._tryDodge();
    // 武器切替 1=拳 2=石ナイフ 3=槍 4=弓
    const weapons = ['fist', 'stoneKnife', 'spear', 'bow'] as const;
    this.weaponKeys.forEach((key, i) => {
      if (Phaser.Input.Keyboard.JustDown(key)) gameState.setWeapon(weapons[i]);
    });

    // ── 回避ダッシュ中 ────────────────────────────────────────
    if (this.isDodging) {
      this.dodgeTimer -= delta;
      this.setVelocity(this.dodgeVx, this.dodgeVy);
      if (this.dodgeTimer <= 0) {
        this.isDodging = false;
        gameState.isInvincible = false;
        this.setAlpha(1.0);
      }
      this.setDepth(this.y);
      return;
    }

    // ── 通常移動 ──────────────────────────────────────────────
    let moveX = this.padInput.x + this.keyboardInput.x;
    let moveY = this.padInput.y + this.keyboardInput.y;
    const len = Math.sqrt(moveX * moveX + moveY * moveY);
    if (len > 1) { moveX /= len; moveY /= len; }

    const effectiveSpeed = gameState.getPlayerSpeed();
    gameState.playerIsMoving = (moveX !== 0 || moveY !== 0);
    this.setVelocity(moveX * effectiveSpeed, moveY * effectiveSpeed);

    // 向き更新
    if (moveX !== 0 || moveY !== 0) {
      this.facingAngle = Math.atan2(moveY, moveX);
    }

    if (moveX === 0 && moveY === 0) {
      this.anims.play(`idle-${this.lastDirection}`, true);
    } else {
      if (moveX !== 0) {
        this.lastDirection = 'side';
        this.setFlipX(moveX < 0);
        this.anims.play('walk-side', true);
      } else if (moveY < 0) {
        this.lastDirection = 'up';
        this.setFlipX(false);
        this.anims.play('walk-up', true);
      } else {
        this.lastDirection = 'down';
        this.setFlipX(false);
        this.anims.play('walk-down', true);
      }
    }

    // ── クールダウン・スタミナ更新 ─────────────────────────────
    const s = delta / 1000;
    if (this.attackCooldownMs > 0) this.attackCooldownMs -= delta;
    if (this.dodgeCooldownMs  > 0) this.dodgeCooldownMs  -= delta;

    if (!this.isDodging && this.stamina < this.MAX_STAMINA) {
      this.stamina = Math.min(this.MAX_STAMINA, this.stamina + this.STAMINA_REGEN * s);
      GameEventBus.emit(GAME_EVENTS.STAMINA_UPDATED, this.stamina);
    }

    this.setDepth(this.y);
  }

  destroy(fromScene?: boolean): void {
    GameEventBus.off(GAME_EVENTS.PLAYER_MOVE,   this.handlePlayerMove);
    GameEventBus.off(GAME_EVENTS.PLAYER_ATTACK, this.handlePlayerAttack);
    GameEventBus.off(GAME_EVENTS.PLAYER_DODGE,  this.handlePlayerDodge);
    if (this.scene?.input?.keyboard) {
      this.scene.input.keyboard.removeAllKeys(true);
    }
    super.destroy(fromScene);
  }
}

export default Player;
