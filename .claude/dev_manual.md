# 開発部マニュアル — PROJECT 01 サバイバルゲーム

## 担当範囲
- コーディング・実装全般
- バグ調査・修正
- 技術選定・アーキテクチャ判断
- コードレビュー

---

## コーディング規約

### 言語・型
- TypeScript strict モードを目指す（現在は部分適用）
- `any` 型は原則禁止。型定義を明示すること
- 新規コードでは `any` を使用しない

### ファイル命名
- コンポーネント：`PascalCase.tsx`
- ユーティリティ・ロジック：`camelCase.ts`
- 定数：`UPPER_SNAKE_CASE`

### コメント
- コードが自明でない箇所のみコメントを書く
- 「何をしているか」ではなく「なぜそうしているか」を書く

---

## 重要ファイル一覧

| ファイル | 役割 | 注意点 |
|--------|------|------|
| `src/game/scenes/MainScene.ts` | ゲームメインロジック全般 | 最も複雑。変更時は影響範囲を必ず確認 |
| `src/game/objects/Player.ts` | プレイヤー操作・アニメーション | destroy()でリスナー未削除のバグあり |
| `src/logic/GameState.ts` | シングルトン状態管理 | 初期時刻が16:30（テスト値）→要修正 |
| `src/logic/GameEventBus.ts` | イベント定義 | 新イベント追加時はここに定義 |
| `src/game/PhaserGame.tsx` | Phaser初期化 | debug: true のまま→要修正 |

---

## 即日修正リスト
優先度順。Phase 1着手前に必ず修正すること：

1. `PhaserGame.tsx`：`debug: true` → `debug: false`
2. `GameState.ts`：初期時刻を `16 * 60 + 30` → `0`（0:00スタート）
3. `Player.ts`：`destroy()`にキーボードリスナーのクリーンアップを追加

---

## Phase 1 実装タスク

### タスク1：ゲームオーバー実装
- 飢餓度が 0 になったら死亡判定
- ゲームオーバー画面（Phaser Scene or React Modal）
- リスタートボタン（MainScene をリセット）

### タスク2：夜間の敵出現
- シンプルな追跡AI（プレイヤーを追いかける敵スプライト）
- 夜間（18:00〜翌5:00）のみ出現
- 接触でダメージ（空腹度や別のHP値に影響）
- 焚き火の近くでは出現しない（または退散する）

### タスク3：各種画面追加
- タイトル画面（Phaser Scene として実装推奨）
- ポーズメニュー（Escキーまたはボタンで開く）
- ゲームオーバー画面

---

## デバッグ・テスト方法
```bash
npm run dev   # http://localhost:5173 で開発サーバー起動
npm run lint  # 型チェック + ESLint
npm run build # ビルドエラーの確認
```

## よくある落とし穴
- Phaser と React の状態を二重管理しない（EventBus 経由で通信する）
- `GameState` はシングルトン。直接書き換えず必ずメソッド経由で変更する
- `RenderTexture` は毎フレーム clear() するためパフォーマンスに注意
