# maniwa-tcg 仕様書

2人対戦のカードバトルゲーム。ポケモンカードゲームポケットのルール骨格（デッキ20枚 / バトル場1体＋ベンチ3体 / エネルギー自動供給 / ポイント先取）を題材とする。

本書は実装前の確定用ドキュメントである。**承認前に実装へ入らないこと**（CLAUDE.md 7章）。
未確定事項は「14. 要確認事項」にまとめてあり、承認時に回答が必要。

---

## 1. v1 スコープ

CLAUDE.md 7章「バーティカルスライス優先」に従い、v1 は**対戦ループ1本を完成品質で通す**ことを目標とする。

### v1 に含む

- 2人対戦（プレイヤー vs CPU、および CPU vs CPU のシミュレーション）
- たね（進化なし）クリーチャーのみ
- バトル場 / ベンチの管理、にげる
- エネルギーの自動供給と付与
- 攻撃、弱点、きぜつ、ポイント獲得、勝敗判定
- 効果タイプ: ダメージ / コイン依存ダメージ / 回復 / 自傷 / エネルギートラッシュ / ベンチへのダメージ / どく
- 決定論リプレイ（シード + 入力列 → 状態ハッシュ一致）

### v1 に含まない（v2 以降）

- 進化、グッズ / サポート等のトレーナーカード、特性
- ねむり / まひ / こんらん（ターン境界でのコイン処理が必要なため）
- オンライン対戦、デッキ編集 UI、カードの量産

**カードデータのスキーマは v2 の要素も表現できる形で先に確定させる**（8章・14章参照）。スキーマを後から壊さないことを優先する。

---

## 2. 用語

| 用語 | 意味 |
|---|---|
| クリーチャー | 場に出して戦うカード。ポケモンに相当 |
| バトル場 | 攻撃・攻撃対象になる位置。常に0体または1体 |
| ベンチ | 控え。最大3体 |
| EX級 | きぜつ時に相手へ2ポイント与える強力なクリーチャー |
| 個体 | 場に出たクリーチャー1体分の状態。同じカードでも別個体 |
| エネルギー | 攻撃コストとして個体に付与する資源。カードとしては存在しない |
| ポイント | 相手をきぜつさせて得る点数。3点先取で勝利 |

---

## 3. ルール

### 3.1 デッキ構築

- 20枚ちょうど
- 同名カードは2枚まで（`CardDef.name` で判定する。`id` ではない）
- クリーチャーを最低1枚含む（v1 は全カードがクリーチャーなので自明）
- デッキごとに**エネルギータイプを1〜3種**指定する。これが供給されるエネルギーの抽選元になる

### 3.2 ゲーム開始

1. シードから PRNG を初期化する
2. 先攻を決める（`start` アクションで外部から与える。シミュレーションでは交互 / ランダムを選べる）
3. 両者デッキをシャッフルし、5枚引く
4. 手札にクリーチャーが1枚も無ければ、手札をデッキに戻して引き直す（最大10回。10回失敗したらそのデッキは不正としてエラー終了）
5. 両者がバトル場に1体、任意でベンチに最大3体を伏せて出す（`setupPlace` / `setupDone`）
6. 先攻のターン1へ

### 3.3 ターン進行

ターン開始時に自動で以下を行う（プレイヤーの操作は不要）:

1. **エネルギー供給** — デッキのエネルギータイプから1つ抽選し、エネルギーゾーンに置く
2. **ドロー** — 1枚引く。デッキが空なら引かない（**山札切れによる敗北は無い**）
3. にげる使用フラグ / エネルギー付与フラグをリセット

メインフェーズでは以下を任意の順・任意の回数（制限があるものは記載どおり）行える:

| 行動 | 制限 |
|---|---|
| ベンチにクリーチャーを出す | ベンチが3体未満のとき。回数制限なし |
| エネルギーを付与する | **1ターンに1回**。エネルギーゾーンに在庫があるとき |
| にげる | **1ターンに1回**。バトル場の個体からにげるコスト分のエネルギーをトラッシュし、ベンチの1体と入れ替える |
| 攻撃する | **1ターンに1回。攻撃するとターンが終了する** |
| ターンを終了する | いつでも |

ターン終了時に **どく** の処理を行う（3.4 参照）。

#### 先攻1ターン目の制限

- **攻撃できない**
- **エネルギーは供給される**（禁止されるのは攻撃のみ。14章 Q1 で決定済み）

### 3.4 攻撃とダメージ

1. 攻撃には `cost`（必要エネルギーの並び）を満たす必要がある。`colorless` は任意のタイプ1個で支払える
2. `effects` を配列の先頭から順に解決する
3. ダメージ計算:
   - 基礎ダメージ = 効果の `value`（コイン依存の場合は表の数で決まる）
   - 対象がバトル場の個体で、対象の `weakness` が攻撃側個体のタイプと一致する場合、**+20**
   - ベンチへのダメージには弱点を適用しない
   - 結果が負なら0にクランプする
4. 個体に蓄積ダメージ（`damage`）として加算する

**どく**: 付与された個体は、**そのターンの終了時ごと**に10ダメージを受ける。バトル場から離れる（にげる / きぜつ）と解除される。

### 3.5 きぜつとポイント

1. すべての効果の解決後、両プレイヤーの全個体について `damage >= hp` を判定する
2. きぜつした個体は、付与エネルギーごとトラッシュへ送る
3. きぜつさせた側が **EX級なら2、それ以外は1** ポイントを得る
4. バトル場が空になったプレイヤーは、ベンチから1体をバトル場に出す（`promote`）
   - 両者が同時に空になった場合、**手番プレイヤーの相手 → 手番プレイヤー** の順に処理する
   - ベンチにも1体もいない場合は敗北条件を満たす（3.6）
5. `promote` が完了するまで他の行動は受け付けない

### 3.6 勝敗判定

以下を上から順に評価する。

| 順 | 条件 | 結果 |
|---|---|---|
| 1 | 両者が同時に3ポイント以上に達した | **手番プレイヤーの勝ち**（`endReason: 'simultaneous'`）※14章 Q2、承認待ち |
| 2 | 片方が3ポイント以上に達した | そのプレイヤーの勝ち（`'points'`） |
| 3 | バトル場が空で、ベンチにも個体がいない | そのプレイヤーの負け（`'noCreature'`） |
| 4 | ターン数が `MAX_TURNS` に達した | ポイントが多い方の勝ち。同点なら引き分け（`'turnLimit'`） |

- `MAX_TURNS = 100`（両者合計のターン数）。**終局保証テストのための上限であり、通常の対戦で到達してはならない**。到達率はシミュレーションで監視する（12章）
- 山札切れでは敗北しない

---

## 4. 状態の型定義

`src/core/types.ts` に置く。すべて `readonly`。core は純粋関数のみで構成する（CLAUDE.md 3章）。

```ts
export type PlayerId = 0 | 1
export type CardId = string        // 例: "c001"
export type InstanceId = number    // 場に出た個体の一意ID。単調増加

export type EnergyType =
  | 'grass' | 'fire' | 'water' | 'lightning'
  | 'psychic' | 'fighting' | 'darkness' | 'metal'
  | 'colorless'                    // コスト表記専用。供給・付与はされない

export type Status = 'poisoned'    // v1 は どく のみ

/** シード付きPRNG。状態として持ち回る（CLAUDE.md 3章） */
export interface Rng {
  readonly seed: number            // xorshift32 の内部状態
}

/** 場に出ている1体分の状態 */
export interface Creature {
  readonly instanceId: InstanceId
  readonly cardId: CardId
  readonly damage: number          // 蓄積ダメージ。hp 以上できぜつ
  readonly attached: readonly EnergyType[]
  readonly status: readonly Status[]
  readonly placedTurn: number      // 場に出たターン。v2 の進化制限で使う
}

/** エネルギーゾーン */
export interface EnergyZone {
  readonly pool: readonly EnergyType[]   // デッキが供給しうるタイプ（1〜3種）
  readonly current: EnergyType | null    // 今ターン付与できる在庫。付与すると null
  readonly next: EnergyType | null       // 次ターンに来るタイプ（UI表示用。先に抽選済み）
}

export interface PlayerState {
  readonly deck: readonly CardId[]       // 先頭が山札の一番上
  readonly hand: readonly CardId[]
  readonly discard: readonly CardId[]
  readonly active: Creature | null
  readonly bench: readonly Creature[]    // 最大3
  readonly points: number
  readonly energy: EnergyZone
  readonly attachedThisTurn: boolean
  readonly retreatedThisTurn: boolean
}

export type Phase =
  | { readonly kind: 'setup' }                                   // 初期配置待ち
  | { readonly kind: 'main' }                                    // 通常のターン
  | { readonly kind: 'promote'; readonly queue: readonly PlayerId[] }  // きぜつ後の入れ替え待ち
  | { readonly kind: 'ended' }

export type EndReason = 'points' | 'noCreature' | 'turnLimit' | 'simultaneous'

export interface LogEntry {
  readonly turn: number
  readonly player: PlayerId
  readonly kind: string            // 'attack' | 'ko' | 'rejected' | ...
  readonly detail: string
}

export interface GameState {
  readonly rng: Rng
  readonly turn: number                  // 1始まり。手番が移るたびに +1
  readonly current: PlayerId             // 手番プレイヤー
  readonly firstPlayer: PlayerId
  readonly phase: Phase
  readonly players: readonly [PlayerState, PlayerState]
  readonly setupDone: readonly [boolean, boolean]
  readonly nextInstanceId: InstanceId
  readonly winner: PlayerId | null       // null かつ phase.kind==='ended' なら引き分け
  readonly endReason: EndReason | null
  readonly log: readonly LogEntry[]
}
```

### 設計上の約束

- `CardDef`（カードの静的定義）は **`GameState` に含めない**。`cardId` で `data/cards.ts` を参照する。状態を小さく保ち、ハッシュ計算を安定させるため
- `log` は**状態ハッシュの計算対象外**。デバッグ用であり、リプレイ一致判定に影響させない
- `reduce` は**例外を投げない**。不正な Action は状態を変更せず `log` に `kind: 'rejected'` を積むだけとする。これによりシミュレーションとファジングが安全に回る

---

## 5. Action 一覧

`src/core/actions.ts` に置く。core の唯一の入口は `reduce(state, action)`（CLAUDE.md 3章）。

```ts
export type Action =
  // --- 開始 ---
  | { readonly type: 'start'
      readonly seed: number
      readonly decks: readonly [Deck, Deck]
      readonly firstPlayer: PlayerId }

  // --- 初期配置 ---
  | { readonly type: 'setupPlace'; readonly player: PlayerId; readonly handIndex: number }
  | { readonly type: 'setupDone';  readonly player: PlayerId }

  // --- メイン ---
  | { readonly type: 'playCreature'; readonly player: PlayerId; readonly handIndex: number }
  | { readonly type: 'attachEnergy'; readonly player: PlayerId; readonly target: InstanceId }
  | { readonly type: 'retreat';      readonly player: PlayerId; readonly benchIndex: number }
  | { readonly type: 'attack';       readonly player: PlayerId; readonly attackIndex: number }
  | { readonly type: 'endTurn';      readonly player: PlayerId }

  // --- きぜつ後 ---
  | { readonly type: 'promote';      readonly player: PlayerId; readonly benchIndex: number }
```

すべての Action が `player` を持つ。core は手番と `phase` を照合し、不一致なら拒否する。
これによりリプレイログが単体で読めるようになり、「誰の入力か」を外部状態に依存せず検証できる。

### 補助関数（core、純粋）

```ts
export function reduce(state: GameState, action: Action): GameState
export function legalActions(state: GameState): readonly Action[]   // AI・シミュレータ・UIの活性判定が共用する
export function hashState(state: GameState): string                 // log を除いた正規化 → FNV-1a
export function isOver(state: GameState): boolean
```

`legalActions` を単一の真実にすることで、「UI では押せるのに core が弾く」という不整合を防ぐ。

---

## 6. カードデータのスキーマ

`src/data/cards.ts` に置く。**効果は必ずデータで表現し、関数や switch を書かない**（CLAUDE.md 4章）。

```ts
export interface Deck {
  readonly name: string
  readonly cards: readonly CardId[]          // 20枚ちょうど
  readonly energy: readonly EnergyType[]     // 1〜3種。colorless は不可
}

export interface CardDef {
  readonly id: CardId
  readonly name: string
  readonly kind: 'creature'                  // v2 で 'item' | 'supporter' を追加
  readonly type: EnergyType
  readonly hp: number
  readonly ex: boolean                       // true ならきぜつ時に相手へ2ポイント
  readonly retreatCost: number               // にげるのに必要なエネルギー数
  readonly weakness: EnergyType | null       // 一致で +20
  readonly attacks: readonly AttackDef[]
  readonly stage?: 0                         // v1 は 0（たね）固定。v2 で進化段階に使う
  readonly evolvesFrom?: string              // v2 用。v1 では未使用
}

export interface AttackDef {
  readonly name: string
  readonly cost: readonly EnergyType[]       // 例: ['fire','fire','colorless']
  readonly effects: readonly Effect[]        // 先頭から順に解決
}
```

カードを追加するときに触るのは `data/` だけであること。`core/` に手を入れる必要が生じたら、それはスキーマ設計の失敗とみなす。

---

## 7. 効果（Effect）の一覧

解釈は `src/core/effects.ts` に一元化する（CLAUDE.md 4章）。

```ts
export type Target =
  | 'opponentActive'      // 相手のバトル場
  | 'opponentBenchAll'    // 相手のベンチ全体
  | 'opponentBenchRandom' // 相手のベンチから1体（PRNG使用）
  | 'self'                // 攻撃している自分の個体
  | 'ownActive'           // 自分のバトル場（self と同義だが意図を明示）

export type Effect =
  /** 対象にダメージ。弱点はバトル場への攻撃時のみ適用 */
  | { readonly type: 'damage'; readonly target: Target; readonly value: number }

  /** コインを count 回投げ、表の数 × value のダメージ */
  | { readonly type: 'damagePerHeads'; readonly target: Target
      readonly count: number; readonly value: number }

  /** コインを count 回投げ、表が min 枚以上なら then を解決 */
  | { readonly type: 'coinFlip'; readonly count: number
      readonly min: number; readonly then: readonly Effect[] }

  /** 対象の蓄積ダメージを value 回復（0未満にはならない） */
  | { readonly type: 'heal'; readonly target: Target; readonly value: number }

  /** 自分の個体に value ダメージ（反動） */
  | { readonly type: 'selfDamage'; readonly value: number }

  /** 対象から value 個のエネルギーをトラッシュ */
  | { readonly type: 'discardEnergy'; readonly target: Target; readonly value: number }

  /** 対象に状態異常を付与 */
  | { readonly type: 'applyStatus'; readonly target: Target; readonly status: Status }

  /** value 枚引く */
  | { readonly type: 'draw'; readonly value: number }
```

- `coinFlip.then` に `Effect[]` を入れ子にできる。「表なら追加40ダメージ」のような表現をデータのまま書ける
- 乱数を使うのは `damagePerHeads` / `coinFlip` / `opponentBenchRandom` のみ。いずれも `state.rng` を消費し、新しい `rng` を返す
- 効果タイプを追加するときは `effects.ts` の解釈テーブルに1件足す。それ以外のコードは触らない

---

## 8. カード例

**スキーマの妥当性を確認するための3枚のみ**。量産は core とテストが安定してから最後に行う（CLAUDE.md 7章5項）。

```ts
export const CARDS: readonly CardDef[] = [
  {
    id: 'c001', name: 'モリネズミ', kind: 'creature',
    type: 'grass', hp: 60, ex: false, retreatCost: 1, weakness: 'fire', stage: 0,
    attacks: [
      { name: 'たいあたり', cost: ['grass'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
    ],
  },
  {
    id: 'c002', name: 'カガリグマ', kind: 'creature',
    type: 'fire', hp: 90, ex: false, retreatCost: 2, weakness: 'water', stage: 0,
    attacks: [
      { name: 'ひっかく', cost: ['fire', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 30 }] },
      { name: 'ほのおのいぶき', cost: ['fire', 'fire', 'colorless'],
        effects: [
          { type: 'damage', target: 'opponentActive', value: 70 },
          { type: 'discardEnergy', target: 'self', value: 1 },   // 撃つたびに自分が細る
        ] },
    ],
  },
  {
    id: 'c003', name: 'カガリグマEX', kind: 'creature',
    type: 'fire', hp: 140, ex: true, retreatCost: 2, weakness: 'water', stage: 0,
    attacks: [
      { name: 'バーンラッシュ', cost: ['fire', 'fire'],
        effects: [{ type: 'damagePerHeads', target: 'opponentActive', count: 2, value: 40 }] },
      { name: 'フレアバースト', cost: ['fire', 'fire', 'colorless'],
        effects: [
          { type: 'damage', target: 'opponentActive', value: 90 },
          { type: 'damage', target: 'opponentBenchAll', value: 10 },
          { type: 'selfDamage', value: 20 },
        ] },
    ],
  },
]
```

この3枚で `damage` / `damagePerHeads` / `discardEnergy` / `selfDamage` / ベンチ範囲 / EX / 弱点 / にげるコストがすべて登場する。

**「カガリグマ」と「カガリグマEX」は `name` が異なるため、それぞれ2枚ずつ計4枚をデッキに入れられる**（3.1 の同名制限）。

---

## 9. 画面遷移と UI

CLAUDE.md 6章に従う。DotGothic16 / 森緑 `#2d5a3d` / クリーム `#f5f0e1` / タップ領域44px以上 / 横スクロール無し / ホバー非依存。

```
[タイトル]
   │ 「たいせん」
   ▼
[デッキせんたく]  ── プリセットデッキから選ぶ（v1は編集不可）
   │
   ▼
[しょきはいち]    ── バトル場1体 + ベンチを伏せて出す
   │
   ▼
[たいせん] ◀────┐
   │            │ ターン交代 / きぜつ
   │            │
   ├─[いれかえ]─┘   きぜつ時のベンチ選択（モーダル）
   │
   ▼
[けっか]          ── 勝敗・ポイント・ターン数。タイトルへ戻る
```

### 対戦画面のレイアウト（縦持ち前提）

```
┌──────────────┐
│ 相手 ポイント ●●○   手札5  山札12 │
│        [相手ベンチ ×3]           │
│        [相手バトル場]            │
├──────────────┤
│        [自分バトル場]            │
│        [自分ベンチ ×3]           │
│ エネルギー: 🔥(次: 🌿)           │
│ [ こうげき ][ にげる ][ ターンしゅうりょう ] │
│ [ 手札（横並び・折り返し無し） ]  │
└──────────────┘
```

- ボタンの活性判定は `legalActions(state)` の結果のみで決める。UI 側でルールを再実装しない
- 手札は横スクロールではなく**枚数に応じて縮める**（横スクロール禁止のため）
- アニメーションは CSS。Canvas は使わない

---

## 10. セーブデータ

- `localStorage` キー: `maniwa-tcg_v1`
- 保存する内容: 選択中デッキ、通算成績（勝敗数）、設定（アニメ有無）
- **対戦中の `GameState` は保存しない**（v1）。中断復帰は v2
- スキーマ変更時はキーのバージョンを上げ、旧データのマイグレーションを書く

---

## 11. テスト方針

`games/maniwa-tcg/tests/` に置き、**core のみを対象**とする（CLAUDE.md 2章）。

### 必須テスト（CLAUDE.md 5章）

| テスト | 内容 |
|---|---|
| **決定論リプレイ** | 同一シード + 同一 Action 列を2回流し、`hashState` の完全一致を確認する。途中の全ステップでも比較する |
| **ルール不変条件** | 全ステップで以下を検査: `damage >= 0` / `points >= 0` / 手札・山札・トラッシュ・場の合計が常に20 / ベンチ ≤ 3 / `attached.length >= 0` / いずれの数値も `NaN` でない |
| **終局保証** | ランダムAI同士の自動対戦を1万回実行し、**全試合が `MAX_TURNS` 未満で終了する**ことを確認する |

### その他

- `legalActions` が返す Action は必ず `reduce` で受理される（拒否ログが出ない）
- `legalActions` が空になるのは `phase.kind === 'ended'` のときだけ
- 先攻1ターン目に `attack` が `legalActions` に含まれない
- 弱点 +20、EX の2ポイント、どくの10ダメージの個別検証
- `reduce` は入力 `state` を書き換えない（凍結オブジェクトを渡して検証）

---

## 12. シミュレーション指標

`games/maniwa-tcg/tools/sim.ts`。`npm run sim -- maniwa-tcg` で実行される。
**1万回**の自動対戦を行い、以下を出力する。基準を外れても**報告のみ**とし、独断でカードデータを書き換えない（CLAUDE.md 5章）。

### 必須項目

| 指標 | 基準 |
|---|---|
| 先手勝率 | **45〜55%**。逸脱したら要調整 |
| 平均ターン数 | 併せて中央値・最小・最大・分布を出す |
| 平均試合時間 | ①シミュレータ実行時間(ms/試合) ②推定プレイ時間 = ターン数 × 12秒（想定値、要確認 Q4） |
| カード別の採用率 | デッキに入っていた試合の割合 |
| カード別の勝率寄与 | そのカードを**使用**した試合の勝率 − 全体勝率 |
| 未使用カード一覧 | **1万回で一度も使われなかったカード**を全件列挙する |

### 追加で出す項目（バランス調整の判断材料）

- 引き分け率、`MAX_TURNS` 到達率（**0% であること**。終局保証と対になる）
- 決着理由の内訳（`points` / `noCreature` / `turnLimit` / `simultaneous`）
- 平均獲得ポイントと、EX きぜつが決め手になった試合の割合
- 攻撃別の使用回数と平均ダメージ
- にげる使用率、エネルギー付与の平均回数、余剰エネルギー（使われずに終わった数）
- 先攻/後攻それぞれの平均ターン数
- 使用シードと試合数（再現用）

### 出力形式

人が読むテキストサマリを標準出力へ。あわせて機械可読な JSON を任意で出力できるようにする（`--json` オプション）。CI では終了コードのみを見る。

---

## 13. ディレクトリ構成と実装順序

```
games/maniwa-tcg/
  SPEC.md                   本書
  index.html                エントリ（ルートのビルド設定が自動で拾う）
  src/
    core/
      types.ts              4章の型
      actions.ts            5章の Action
      rng.ts                xorshift32（純粋）
      effects.ts            7章の効果解釈（一元化）
      rules.ts              コスト判定・ダメージ計算・きぜつ・勝敗
      reduce.ts             reduce / legalActions / hashState
    game/
      view.ts               描画（core を呼ぶだけ）
      input.ts              タップ処理
      storage.ts            localStorage（maniwa-tcg_v1）
    data/
      cards.ts              8章のカード定義
      decks.ts              プリセットデッキ
  tests/
    determinism.test.ts     決定論リプレイ
    invariants.test.ts      ルール不変条件
    termination.test.ts     終局保証（1万回）
    rules.test.ts           弱点・EX・どく等の個別検証
  tools/
    sim.ts                  12章のシミュレーション
    ai.ts                   ランダムAI / 単純な評価関数AI
```

### 実装順序（1コミット1機能）

1. `rng.ts` + テスト（決定論の土台）
2. `types.ts` / `actions.ts`（型のみ、実装なし）
3. `reduce.ts` の骨格 — start / setup / endTurn まで。ここで決定論リプレイテストを通す
4. `rules.ts` + `effects.ts` — 攻撃・ダメージ・きぜつ・勝敗。不変条件テストを通す
5. `tools/ai.ts` + `tools/sim.ts` — 終局保証テストと `npm run sim` を通す
6. `game/` — 描画と入力。ここで初めて遊べる状態になる
7. カード量産（**ここまでのすべてが安定してから**）

---

## 14. 決定事項と推奨案

### 14.1 決定済み

| # | 論点 | 決定 |
|---|---|---|
| **Q1** | 先攻1ターン目のエネルギー供給 | **供給する**。先攻1ターン目に禁止されるのは攻撃のみ |

Q1 の帰結として、先攻はエネルギー1個ぶん先行する。先手勝率が55%を超えた場合、
**最初の調整候補は「先攻1ターン目はエネルギーを供給しない」へのルール変更**とする。
カードデータの書き換えではなくルール側の調整なので、12章の報告に含めて判断を仰ぐ。

### 14.2 推奨案（承認待ち）

| # | 論点 | 推奨 |
|---|---|---|
| **Q2** | 両者が同時に3ポイントに達した場合の扱い | **手番プレイヤー（攻撃した側）の勝ち** |
| **Q3** | 初期配置でベンチに出せる数 | **最大3体まで同時に出せる** |
| **Q4** | 「平均試合時間」の定義 | **推定プレイ時間を主指標**とし、実行時間も併記する。目標は1試合3〜5分 |
| **Q5** | v1 の対戦相手 | **CPU のみ** |
| **Q6** | 題材の扱い | **ルールの骨格のみ原作に倣い、カード名・キャラクターは独自のものにする** |

#### Q2: 同時に3ポイント到達 → 手番プレイヤーの勝ち

`selfDamage` の反動で自分の EX が同時にきぜつする、といった稀なケースで起こりうる。

- 「3ポイント先取」は必ず決着することを狙った設計であり、引き分けはその目標と衝突する
- 反動を持つカードは「リスクを取って勝ちを狙う」設計意図で作る。同時到達で勝てないと、そのカード設計自体が成立しない
- 実装は勝敗判定で手番プレイヤーを先に評価するだけで済み、分岐が1本減る
- 引き分け自体はターン上限（3.6 の4番）で必要なので、表示・集計の実装は結局必要になる。Q2 を引き分けにしても実装は簡単にならない

原作準拠なら引き分けだが、v1 は決着優先を採る。発生率は12章で計測して報告する。

#### Q3: 初期配置でベンチに最大3体 → 同時に出せる

- ベンチが空の状態で始まると、バトル場がきぜつした瞬間に敗北（3.6 の3番）となり、事故負けが増える。先手勝率が事故率に飲まれて指標として読めなくなる
- 1体ずつしか出せない仕様にすると、序盤が「場を作るだけのターン」で埋まりテンポが落ちる。1試合3〜5分（Q4）に収めるうえで不利
- 実装は `setupPlace` を繰り返し受け付けるだけで、追加の状態を持たない

#### Q4: 平均試合時間 → 推定プレイ時間を主指標に

- CLAUDE.md 5章がこの指標を求める意図は「1試合が人にとって長すぎないか」の監視にあると解釈する。したがって推定プレイ時間が本命
- 実行時間（ms/試合）は CI での性能退行検知に使える副産物なので併記する
- **1ターン12秒という係数には根拠が無い**。v1 が実機で遊べるようになった時点で実測し、係数を更新する。それまでは暫定値と明記して出力する

#### Q5: v1 は CPU のみ

- バーティカルスライスを1本完成品質で通すのが v1 の目的（CLAUDE.md 7章2項）
- 同一端末での2人対戦は、手札を隠すための目隠し画面と受け渡しの導線が必要になり、UI 工数が大きく増える。ルールの完成度に使うべき時間を奪う
- CPU は `tools/ai.ts` をそのまま流用でき、シミュレーションと実装を共有できる。ルールの二重実装が発生しない
- 対戦相手の追加は Action の発行元を差し替えるだけなので、v2 で低コストに入れられる

#### Q6: カード名・キャラクターは独自のものにする

- ゲームのルールやシステムそのものは著作権の保護対象ではないため、骨格を原作に倣うことに問題はない
- 一方でポケモンの名称・キャラクターデザイン・イラストは権利物であり、静的ビルドに含めて配布・公開するとリスクになる
- 独自名なら配布・公開・スクリーンショット共有を制約なく行える
- `maniwa-tcg` という名前に沿って森・自然を基調にした世界観で統一すれば、カード量産時のネーミング指針にもなる（8章の3枚はこの方針で作成済み）

## 15. v2 以降の候補

- 進化（`stage` / `evolvesFrom` は既にスキーマにある）
- トレーナーカード（`kind` の拡張。1ターン1枚のサポート制限）
- 特性（常時効果。`Effect` とは別のトリガー型が必要）
- ねむり / まひ / こんらん
- 対戦中の中断復帰（`GameState` の保存。`maniwa-tcg_v2` へ）
- デッキ編集 UI
