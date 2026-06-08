# セキュリティ部 現場マニュアル — PROJECT 01 サバイバルファミリー

## プロジェクト固有のセキュリティ方針
全社共通指針は `.claude/security_brain.md`（ルート）を参照。
このファイルはプロジェクト固有の審査記録・リスク状況を管理する。

---

## 現在のセキュリティ審査ステータス

**最終審査日：** 2026-05-20
**審査フェーズ：** Phase 1 完了時点

### 審査結果サマリ
| カテゴリ | 状況 | 詳細 |
|---------|-----|-----|
| XSS リスク | ✅ 問題なし | JSX テンプレートのみ使用 |
| セーブデータ検証 | ⚠️ 要改善 | バリデーションが不十分（後述） |
| 認証情報の漏洩 | ✅ 問題なし | API キー等なし |
| デバッグ設定 | ✅ 修正済み | `debug: false` に修正済み |
| 依存関係の脆弱性 | 🔍 未確認 | `npm audit` 未実施 |
| Capacitor 設定 | ⚠️ 要対処 | appId が `com.example.app` のまま |

---

## 検出済み脆弱性・リスク

---

### [SEVERITY: MEDIUM] セーブデータの無検証ロード

**発見日：** 2026-05-20
**対象ファイル：** `src/logic/SaveSystem.ts`

**概要：**
`applySave()` でlocalStorageから読み込んだデータをGameStateに直接適用している。
ユーザーがlocalStorageを手動書き換えした場合、異常な値（`health: 999999`、`daysAlive: -1`など）がゲームに適用される。

**攻撃シナリオ：**
1. ブラウザの開発者ツールでlocalStorageを開く
2. `lostlands_save_v1` のJSONを書き換え、`daysAlive: 99999` に設定
3. 「続きから」でロードするとスコアが不正に高くなる

**推奨修正：**
```typescript
// SaveSystem.applySave() にバリデーションを追加
static validateSaveData(data: SaveData): boolean {
  if (typeof data.gameState.health !== 'number') return false;
  if (data.gameState.health < 0 || data.gameState.health > 100) return false;
  if (data.gameState.hunger < 0 || data.gameState.hunger > 100) return false;
  if (data.gameState.daysAlive < 0 || data.gameState.daysAlive > 36500) return false;
  if (data.gameState.inventory.wood < 0) return false;
  if (data.gameState.inventory.stone < 0) return false;
  if (!['1.0.0'].includes(data.version)) return false;
  return true;
}
```

**修正状況：** ⚠️ 未対処（Phase 2 中に修正推奨）

---

### [SEVERITY: LOW] console.log のデバッグ出力残存の可能性

**発見日：** 2026-05-20
**対象：** `src/` 配下全体

**概要：**
開発中に追加された `console.log` が本番ビルドに残ると、ゲームの内部状態がブラウザの開発者ツールに露出する。

**推奨修正：**
`vite.config.ts` に以下を追加：
```typescript
build: {
  minify: 'terser',
  terserOptions: {
    compress: {
      drop_console: true,  // 本番ビルドでconsole.*を除去
    }
  }
}
```

**修正状況：** ⚠️ 未対処（Phase 3 リリース前に対応）

---

### [SEVERITY: LOW] Capacitor appId が未設定

**発見日：** 2026-05-20
**対象ファイル：** `capacitor.config.ts`

**概要：**
`appId: 'com.example.app'` のままリリースすると、他のアプリとのID衝突・ストア審査拒否のリスクがある。

**推奨修正：**
```typescript
appId: 'jp.dekoboko.survivalfamily', // 実際のドメインに変更
appName: 'サバイバルファミリー',
```

**修正状況：** ⚠️ 未対処（Phase 4 リリース準備時に対応）

---

## 依存関係の脆弱性チェック手順

```bash
# プロジェクトルートで実行
npm audit

# HIGH以上の脆弱性がある場合
npm audit fix

# 自動修正できない場合は内容を確認してCEOに報告
npm audit --json > audit_report.json
```

**定期実施タイミング：** 各フェーズ開始前・外部ライブラリ追加時

---

## Phase 別 セキュリティ対応計画

### Phase 2（現在）
- [ ] `SaveSystem` のバリデーション実装（MEDIUM対処）
- [ ] `npm audit` の実施と報告

### Phase 3（マルチプレイ実装時）
- [ ] WebSocket通信のWSS（TLS）対応
- [ ] サーバー側でのゲーム状態検証設計
- [ ] JWT認証の導入検討
- [ ] レート制限の実装

### Phase 4（リリース前）
- [ ] `capacitor.config.ts` の appId 変更
- [ ] `vite.config.ts` に `drop_console: true` 追加
- [ ] HTTPS強制設定の確認
- [ ] 最終セキュリティ審査レポートの作成・社長提出

---

## セキュリティ審査依頼の出し方

開発部がセキュリティ審査を依頼する場合：
1. 変更ファイルのリストをセキュリティ部に提示
2. 「外部入力を扱う処理」「データ保存・読み込み処理」「ネットワーク通信」が含まれる場合は必須
3. セキュリティ部は上記チェックリストに沿って審査し、結果をこのファイルに追記する
