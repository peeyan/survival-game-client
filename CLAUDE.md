# PROJECT 01：サバイバルゲーム — プロジェクトマニュアル

## プロジェクト概要
| 項目 | 内容 |
|-----|------|
| **正式名称** | survival-game-client |
| **ジャンル** | トップダウン2D サバイバルゲーム |
| **プラットフォーム** | Web / iOS / Android（Capacitor） |
| **リポジトリ** | https://github.com/peeyan/survival-game-client |
| **ステータス** | 🔨 開発中（約45%完成） |

---

## 技術スタック
| 技術 | バージョン | 役割 |
|-----|---------|-----|
| Phaser | 4.1.0 | 2Dゲームエンジン |
| React | 19.2.6 | UI層 |
| TypeScript | 6.0.3 | メイン言語 |
| Vite | 8.0.12 | バンドラー・開発サーバー |
| Capacitor | 8.3.4 | iOS/Androidビルド |
| simplex-noise | 4.0.3 | 地形生成 |

---

## アーキテクチャ概要
```
React UI Layer
  VirtualJoystick / ActionButton / InventoryUI / CraftMenu
         ↕ GameEventBus（Phaser EventEmitter）
Logic Layer
  GameState（シングルトン） / GameEventBus
         ↕ Phaser Scene Events
Phaser Game Layer
  MainScene / Player / Tree / Stone / Berry / Campfire
         ↓
Canvas Rendering（4,000 × 4,000px ワールド）
```

---

## ディレクトリ構成
```
survival-game-client/
├── public/assets/        # 画像アセット（player.png 等）
├── src/
│   ├── game/
│   │   ├── scenes/       # MainScene.ts（メインゲームロジック）
│   │   ├── objects/      # Player, Tree, Stone, Berry, Campfire
│   │   └── PhaserGame.tsx
│   ├── logic/
│   │   ├── GameState.ts  # シングルトン状態管理
│   │   └── GameEventBus.ts
│   ├── ui/
│   │   └── components/   # React UIコンポーネント
│   └── App.tsx
├── capacitor.config.ts
├── vite.config.ts
└── package.json
```

---

## 現場部隊マニュアル
各部署の詳細な作業指針は `.claude/` フォルダを参照：

| ファイル | 担当部署 |
|--------|--------|
| `.claude/dev_manual.md` | 開発部 |
| `.claude/pm_manual.md` | PM部 |
| `.claude/design_manual.md` | デザイン部 |
| `.claude/security_manual.md` | セキュリティ部 |

---

## 実装済み機能
- [x] プレイヤー移動（PC/モバイル両対応、8方向）
- [x] 手続き型マップ生成（4,000×4,000px、水・砂・草）
- [x] リソース採集（木・石・ベリー）
- [x] インベントリ管理 + HUD表示
- [x] クラフトシステム（焚き火：木×3 + 石×3）
- [x] 飢餓システム（毎2秒-1、ベリーで+20回復）
- [x] 昼夜サイクル（リアル1秒=ゲーム10分）
- [x] ダイナミックライティング（焚き火による光源）

---

## 未実装機能（優先度順）
| 優先度 | 機能 | フェーズ |
|-------|-----|--------|
| 🔴 最高 | ゲームオーバー条件・画面 | Phase 1 |
| 🔴 高 | 夜間の敵・危険要素 | Phase 1 |
| 🔴 高 | タイトル・ポーズ・ゲームオーバー画面 | Phase 1 |
| 🔴 高 | セーブ/ロード機能 | Phase 1 |
| 🔴 高 | サウンド（BGM・SE） | Phase 2 |
| 🟡 中 | クラフトアイテム拡充（5〜10種） | Phase 2 |
| 🟡 中 | パーティクルエフェクト | Phase 2 |
| 🟢 低 | チュートリアル | Phase 2 |
| 🟢 低 | CI/CD（GitHub Actions） | Phase 3 |

---

## 既知のバグ・技術的リスク
| 重要度 | 問題 | 場所 | 対処方法 |
|-------|-----|------|--------|
| 🔴 高 | デバッグモードON | `PhaserGame.tsx` | `debug: false` に変更 |
| 🔴 高 | 初期時刻がテスト用（16:30） | `GameState.ts` | `0` に変更 |
| 🟡 中 | Player.destroy()でリスナー未削除 | `Player.ts` | キーボードリスナーのクリーンアップ追加 |
| 🟡 中 | `any`型の多用 | 複数ファイル | 型定義を追加 |
| 🟢 低 | Capacitor appId未設定 | `capacitor.config.ts` | リリース前に変更 |

---

## 開発ロードマップ
```
Phase 1（2〜3週間）：ゲームとして完結させる
  ├─ ゲームオーバー実装
  ├─ 夜間の敵出現（シンプルな追跡AI）
  ├─ タイトル・ゲームオーバー・ポーズ画面
  └─ 即日修正（デバッグモード・初期時刻）

Phase 2（3〜4週間）：ゲーム体験を豊かにする
  ├─ サウンド（BGM・SE）
  ├─ セーブ/ロード（localStorage）
  ├─ クラフトアイテム拡充
  └─ パーティクルエフェクト

Phase 3（1〜2ヶ月）：リリース準備
  ├─ CI/CD（GitHub Actions）
  ├─ ドキュメント整備（README・GDD）
  ├─ Capacitor本番設定
  └─ テスト整備
```

---

## 開発コマンド
```bash
npm install          # 依存関係インストール
npm run dev          # 開発サーバー起動
npm run build        # 本番ビルド
npm run lint         # ESLintチェック
npm run preview      # ビルドプレビュー
```
