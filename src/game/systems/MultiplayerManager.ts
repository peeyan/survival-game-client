/**
 * MultiplayerManager — Firebase Realtime Database を使用したオンライン協力
 *
 * セキュリティ設計：
 *  - ルームコードは6文字（~10^9通り）で総当たり不可
 *  - firebase.rules.json で書き込み値域・型・タイムスタンプを検証
 *  - onDisconnect() で退出時に自動クリーンアップ
 *  - ペイロード最小化で無料枠（10GB/月）を消費しにくい設計
 *
 * コスト設計：
 *  - 位置同期: 300ms間隔（~3fps）
 *  - 短縮キー名: x,y,a,w,h,g = angle,weapon,hp,hunger
 *  - 部屋は2時間で期限切れ（クライアント側チェック）
 *  - プレイヤー退出時に onDisconnect で自動削除
 */

import {
  ref, set, get, onValue, push, remove,
  onDisconnect as fbOnDisconnect,
  type Database, type Unsubscribe,
} from 'firebase/database';
import { db, firebaseReady } from '../../config/firebase';
import type { WeaponType, Inventory } from '../../logic/GameState';

export interface RemotePlayerData {
  id:           string;
  displayName:  string;
  x:            number;
  y:            number;
  facingAngle:  number;
  activeWeapon: WeaponType;
  hp:           number;
  hunger:       number;
  lastUpdate:   number;
}

export interface WorldEventData {
  type: 'animal_killed' | 'loot_taken' | 'berry_harvested' | 'seaweed_harvested';
  entityId?: string;
  data?:     unknown;
}

export type OnRemotePlayersCallback = (players: Record<string, RemotePlayerData>) => void;
export type OnInventoryCallback     = (inv: Partial<Inventory>) => void;
export type OnWorldEventCallback    = (event: WorldEventData) => void;
export type OnGameStateCallback     = (state: { weather: string; tideLevel: string; totalMinutes: number }) => void;

// 圧縮ペイロード型（帯域削減のため短縮キー）
interface CompactPlayer {
  n:  string;  // displayName
  x:  number;
  y:  number;
  a:  number;  // facingAngle
  w:  string;  // activeWeapon
  h:  number;  // hp
  g:  number;  // hunger
  t:  number;  // lastUpdate
}

const ROOM_TTL_MS = 2 * 60 * 60 * 1000; // 2時間

class MultiplayerManager {
  private database: Database | null = db;

  private roomCode     = '';
  private localId      = '';
  private localName    = '';
  public  isOnline     = false;
  public  isHost       = false;
  public  worldSeed    = 0;

  private syncTimer:  ReturnType<typeof setInterval> | null = null;
  private unsubs:     Unsubscribe[]                         = [];

  private cbPlayers?:   OnRemotePlayersCallback;
  private cbInventory?: OnInventoryCallback;
  private cbEvent?:     OnWorldEventCallback;
  private cbGameState?: OnGameStateCallback;

  // ローカル状態キャッシュ（同期用）
  private lx = 0; private ly = 0; private la = 0;
  private lw: WeaponType = 'fist';
  private lh = 100;       private lg = 100;

  // ── 部屋を作る ────────────────────────────────────────────
  async createRoom(displayName: string, seed: number): Promise<string> {
    this._assertReady();
    this.localId   = this._genId();
    this.localName = displayName;
    this.isHost    = true;
    this.worldSeed = seed;
    this.roomCode  = this._genRoomCode();

    const roomRef = ref(this.database!, `rooms/${this.roomCode}`);
    await set(roomRef, {
      meta: {
        seed,
        hostId:    this.localId,
        status:    'waiting',
        createdAt: Date.now(),
      },
      players: { [this.localId]: this._compact() },
    });

    this.isOnline = true;
    await this._setupDisconnect();
    this._startListeners();
    this._startSync();
    return this.roomCode;
  }

  // ── 部屋に入る ────────────────────────────────────────────
  async joinRoom(code: string, displayName: string): Promise<number> {
    this._assertReady();
    const snap = await get(ref(this.database!, `rooms/${code}`));
    if (!snap.exists()) throw new Error('部屋が見つかりません');

    const roomData = snap.val() as { meta: { seed: number; status: string; createdAt: number } };
    if (!roomData.meta) throw new Error('不正な部屋データ');
    if (Date.now() - roomData.meta.createdAt > ROOM_TTL_MS) throw new Error('この部屋は期限切れです');
    if (roomData.meta.status === 'ended') throw new Error('このゲームは終了しています');

    this.localId   = this._genId();
    this.localName = displayName;
    this.isHost    = false;
    this.worldSeed = roomData.meta.seed;
    this.roomCode  = code;

    await set(ref(this.database!, `rooms/${code}/players/${this.localId}`), this._compact());

    this.isOnline = true;
    await this._setupDisconnect();
    this._startListeners();
    this._startSync();
    return this.worldSeed;
  }

  // ── 位置などローカル状態を更新 ───────────────────────────
  updateLocalState(x: number, y: number, a: number, w: WeaponType, h: number, g: number): void {
    this.lx = x; this.ly = y; this.la = a;
    this.lw = w; this.lh = h; this.lg = g;
  }

  // ── 共有インベントリを書き込む ───────────────────────────
  async pushInventory(inv: Partial<Inventory>): Promise<void> {
    if (!this._ok()) return;
    await set(ref(this.database!, `rooms/${this.roomCode}/sharedInventory`), inv);
  }

  // ── ワールドイベントを送信（append-only） ─────────────────
  async pushWorldEvent(event: WorldEventData): Promise<void> {
    if (!this._ok()) return;
    await push(ref(this.database!, `rooms/${this.roomCode}/worldEvents`), {
      ...event,
      senderId:  this.localId,
      timestamp: Date.now(),
    });
  }

  // ── ゲーム状態を送信（ホストのみ、60秒ごと） ─────────────
  async pushGameState(weather: string, tideLevel: string, totalMinutes: number): Promise<void> {
    if (!this._ok() || !this.isHost) return;
    await set(ref(this.database!, `rooms/${this.roomCode}/gameState`), {
      weather, tideLevel, totalMinutes,
    });
  }

  // ── コールバック登録 ─────────────────────────────────────
  onRemotePlayers(cb: OnRemotePlayersCallback):  void { this.cbPlayers   = cb; }
  onInventorySync(cb: OnInventoryCallback):      void { this.cbInventory = cb; }
  onWorldEvent(cb: OnWorldEventCallback):        void { this.cbEvent     = cb; }
  onGameStateSync(cb: OnGameStateCallback):      void { this.cbGameState = cb; }

  // ── 切断 ─────────────────────────────────────────────────
  async disconnect(): Promise<void> {
    if (!this.isOnline || !this.database) return;
    if (this.syncTimer) clearInterval(this.syncTimer);
    this.unsubs.forEach(u => u());
    this.unsubs = [];
    // onDisconnect が発火するが明示的にも削除
    await remove(ref(this.database, `rooms/${this.roomCode}/players/${this.localId}`));
    this.isOnline = false;
  }

  // ── 内部 ─────────────────────────────────────────────────
  private _ok = () => this.isOnline && !!this.database;

  private _assertReady(): void {
    if (!firebaseReady || !this.database) throw new Error('Firebase未設定（.envファイルを確認）');
  }

  private async _setupDisconnect(): Promise<void> {
    const playerRef = ref(this.database!, `rooms/${this.roomCode}/players/${this.localId}`);
    await fbOnDisconnect(playerRef).remove();
  }

  private _startListeners(): void {
    const db = this.database!;

    // リモートプレイヤー
    const unsubP = onValue(ref(db, `rooms/${this.roomCode}/players`), snap => {
      if (!snap.exists() || !this.cbPlayers) return;
      const all = snap.val() as Record<string, CompactPlayer>;
      const others: Record<string, RemotePlayerData> = {};
      for (const [id, c] of Object.entries(all)) {
        if (id === this.localId) continue;
        others[id] = {
          id, displayName: c.n, x: c.x, y: c.y, facingAngle: c.a,
          activeWeapon: c.w as WeaponType, hp: c.h, hunger: c.g, lastUpdate: c.t,
        };
      }
      this.cbPlayers(others);
    });
    this.unsubs.push(unsubP);

    // 共有インベントリ
    const unsubI = onValue(ref(db, `rooms/${this.roomCode}/sharedInventory`), snap => {
      if (!snap.exists() || !this.cbInventory) return;
      this.cbInventory(snap.val() as Partial<Inventory>);
    });
    this.unsubs.push(unsubI);

    // ワールドイベント（最新のみ処理）
    let lastEventTs = Date.now();
    const unsubE = onValue(ref(db, `rooms/${this.roomCode}/worldEvents`), snap => {
      if (!snap.exists() || !this.cbEvent) return;
      const evs = snap.val() as Record<string, WorldEventData & { senderId: string; timestamp: number }>;
      for (const ev of Object.values(evs)) {
        if (ev.senderId !== this.localId && ev.timestamp > lastEventTs) {
          lastEventTs = ev.timestamp;
          this.cbEvent(ev);
        }
      }
    });
    this.unsubs.push(unsubE);

    // ゲーム状態（クライアントのみ）
    if (!this.isHost) {
      const unsubG = onValue(ref(db, `rooms/${this.roomCode}/gameState`), snap => {
        if (!snap.exists() || !this.cbGameState) return;
        this.cbGameState(snap.val());
      });
      this.unsubs.push(unsubG);
    }
  }

  private _startSync(): void {
    this.syncTimer = setInterval(async () => {
      if (!this._ok()) return;
      await set(
        ref(this.database!, `rooms/${this.roomCode}/players/${this.localId}`),
        this._compact(),
      );
    }, 300); // 3fps — 帯域最小化
  }

  private _compact(): CompactPlayer {
    return {
      n: this.localName,
      x: Math.round(this.lx), y: Math.round(this.ly),
      a: parseFloat(this.la.toFixed(2)),
      w: this.lw,
      h: Math.round(this.lh),
      g: Math.round(this.lg),
      t: Date.now(),
    };
  }

  private _genId(): string {
    // 8文字英小文字+数字（256^8相当のエントロピー）
    return crypto.randomUUID().replace(/-/g, '').slice(0, 8);
  }

  private _genRoomCode(): string {
    // 紛らわしい文字(O,0,I,1)を除いた6文字。約10^9通り
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }
}

export const multiplayerManager = new MultiplayerManager();
