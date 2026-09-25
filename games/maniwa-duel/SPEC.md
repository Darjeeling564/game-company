# maniwa-duel 仕様書

**姫神速闘（ひめがみそくとう）** — 遊戯王デュエルリンクス（スピードデュエル）の骨格を借りた
1対1のカードバトル。

`maniwa-tcg`（姫神演義）とは**別のゲーム**である。ルールは共有しない。
共有するのは**カードイラストだけ**（2章）。`maniwa-tcg` 側は1バイトも変更しない。

---

## 0. このゲームを作る理由

`maniwa-tcg` はポケモンカードゲームポケット型（デッキ20枚 / バトル場1＋ベンチ3 /
エネルギー自動供給 / ポイント先取）である。デュエルリンクスは**遊戯王側の同じ位置**にあり、
本家を携帯向けに削ったもの同士なので、発想の階層がそろう。

すでに **288枚のイラスト**と **87体の姫神**という世界観の資産がある。
これを別のルールで動かす。

### 元にした規則の確度

2026-09-25 に調べた。**確認できたものと、できなかったものを分けて記録する。**

| 項目 | 値 | 確度 |
|---|---|---|
| ライフポイント | 4000 | 確認済み |
| 盤面（片側） | モンスター3 / 魔法罠3 / フィールド1 | 確認済み |
| メインデッキ | 20〜30枚 | 確認済み |
| 初期手札 | 4枚。先攻1ターン目はドローしない | 確認済み |
| **メインフェイズ2** | **無い** | 確認済み（本家との最大の違い） |
| 手札上限 | エンドフェイズに6枚 | 確認済み |
| エクストラデッキ | 上限9枚（ミッションで解放） | 初期値が 5 か 6 か情報が割れた |
| 召喚法の追加 | シンクロ＝5D's / エクシーズ＝ZEXAL / ペンデュラム＝ARC-V / リンク＝VRAINS | 順序のみ確認。日付は取れず |
| 制限時間 | ターン制ではなく**時間制**。1ターン3〜4分＋通算の持ち時間 | 確認済み |
| 時間切れの勝者 | — | **確認できなかった** |

**このゲームは正確な再現を目標にしない。** 個人で遊ぶためのものなので、
上の表で埋まらなかったところは自分たちで決める。

---

## 1. v1 スコープ

CLAUDE.md 7章の「バーティカルスライス優先 — 全機能を薄く作らず、最小構成を完成品質で1本通す」
に従う。

### v1 に含む

- 通常召喚 / セット / リリース（生贄）召喚
- 攻撃表示 / 表側守備表示 / 裏側守備表示
- バトル（攻撃宣言・戦闘ダメージ・戦闘破壊・ダイレクトアタック）
- 魔法（**神具と絶技**）の発動、罠（道標）のセットと**バトル中の割り込み1段**
- ライフ4000・デッキ切れ・ターン上限による決着
- CPU 対戦（貪欲法）
- **ライフに連動するダメージイラスト**（9.3）
- 2属性ぶんの姫神とプリセットデッキ2つ

### v1 に含まない（v2 以降）

| 項目 | 理由 |
|---|---|
| エクストラデッキ（融合・シンクロ・エクシーズ・ペンデュラム・リンク） | 姫神87体はレベルとリリースだけで回せる。EMZ とリンク先の規則は v1 に不要 |
| **スキル** | デュエルリンクス固有の要素だが、決闘が1本通ってから乗せる。**絶技を充てる案は取り下げた**（6.3） |
| フィールド魔法ゾーン | 使うカードが無い |
| 永続魔法・装備魔法・カウンター罠 | 効果の種類を増やす前にルールを固める。**v1 の魔法はすべて通常魔法**（6.3） |
| チェーン2段以上 | 11章。v1 は1段 |
| 8属性すべてのデッキ | ロジックとテストが安定してから（CLAUDE.md 7章5） |
| 時間制限 | 1人で遊ぶので不要。終局保証はターン上限で行う（3.7） |

---

## 2. カードイラストは maniwa-tcg と共有する

**複製しない。** `games/maniwa-tcg/src/data/art/` を相対参照する。

```ts
// games/maniwa-duel/src/game/art.ts
const FILES = import.meta.glob('../../../maniwa-tcg/src/data/art/*.webp', {
  eager: true, query: '?url', import: 'default',
})
```

288枚・約43MB を git に重複させないためである。

**引き換えに結合が生まれる。** `maniwa-tcg` 側で `src/data/art/` を移動・改名すると
このゲームが壊れる。**この一点だけは両ゲームの間の約束**として、
`games/maniwa-duel/src/game/art.ts` の冒頭と `games/maniwa-tcg/src/data/art/README.md`
の両方に書く（README への追記は `maniwa-tcg` の変更になるため、**実装時に承認を取る**）。

カードIDは `maniwa-tcg` と同じものを使う（`f001` = カグツチ）。
**イラストとIDの対応を崩さないため**で、これにより `art-files.ts` の進捗集計も共用できる。

---

## 3. ルール

### 3.1 デッキ構築

- **20枚ちょうど**
- 同名カードは**2枚まで**（`maniwa-tcg` と同じ。デュエルリンクスは3枚だが、
  カードプールが2枚制限を前提に作られているのでそろえる）
- エクストラデッキは無い（v1）

推奨の内訳（プリセットデッキ）:

| 種別 | 枚数 |
|---|---|
| 姫神（モンスター） | 11 |
| 神具・絶技（魔法） | 5 |
| 道標（罠） | 4 |

### 3.2 盤面

片側につき:

- **モンスターゾーン 3**
- **魔法罠ゾーン 3**
- デッキ / 手札 / 墓地
- ライフポイント **4000**

### 3.3 ゲーム開始

1. 両者のデッキをシャッフル（シード付きPRNG）
2. 先攻を決める
3. 両者が**4枚**引く
4. **先攻1ターン目はドローしない**
5. **先攻1ターン目はバトルフェイズを行えない**（本家と同じ）

引き直し（マリガン）は**行わない**。`maniwa-tcg` では初手に置けるカードが無いと詰むため
導入したが、こちらは場に何も出せなくてもターンを渡せるので詰まない。

### 3.4 ターン進行

```
ドローフェイズ → メインフェイズ → バトルフェイズ → エンドフェイズ
```

**メインフェイズ2は無い。** 罠と魔法はバトルに入る前に置ききる必要がある。
これはデュエルリンクスで確認できた仕様で、**このゲームの手触りを決める中心**である。

| フェイズ | できること |
|---|---|
| ドロー | デッキから1枚引く（先攻1ターン目を除く）。デッキが空なら**敗北** |
| メイン | 通常召喚/セット（**1ターンに1回**）/ 表示形式の変更 / 魔法の発動 / 罠のセット |
| バトル | 攻撃宣言。1体につき1回 |
| エンド | 手札が**6枚**を超えていたら超過分を捨てる |

### 3.5 召喚

通常召喚は**1ターンに1回**。レベルでリリース（生贄）が要る。

| レベル | リリース |
|---|---|
| 1〜4 | 不要 |
| 5〜6 | 1体 |
| 7以上 | 2体 |

- **セット**（裏側守備表示で置く）も通常召喚1回を消費する
- リリースしたモンスターは墓地へ
- **召喚したターンは表示形式を変更できない**
- 表示形式の変更は1ターンに1回まで

### 3.6 バトル

- 攻撃できるのは**攻撃表示のモンスターだけ**。1体につき1回
- **召喚したターンでも攻撃できる**（本家と同じ）
- 相手のモンスターゾーンが空なら**ダイレクトアタック**（攻撃力ぶんライフを削る）

戦闘の計算:

| 相手 | 結果 |
|---|---|
| 攻撃表示 | 攻撃力が低いほうが破壊され、**差が破壊された側のライフへ**。同値なら両方破壊・ダメージ無し |
| 表側守備表示 | 攻撃力 > 守備力 → 破壊のみ（**ダメージ無し**）。攻撃力 < 守備力 → **攻撃側が差を受ける**。同値なら何も起きない |
| 裏側守備表示 | **表にしてから**上と同じ |

貫通は v1 では作らない。

### 3.7 勝敗

| 決着 | 条件 |
|---|---|
| `lifePoints` | どちらかのライフが **0以下** |
| `deckOut` | ドローフェイズにデッキが空 |
| `turnLimit` | **ターン上限**（`MAX_TURNS = 60`）に到達。ライフの多いほうが勝ち、同値なら引き分け |

**同時に0になったら引き分け。**

`turnLimit` は**終局保証のための安全弁**であり、通常の対戦で到達してはならない
（CLAUDE.md 5章「1万回の自動対戦がすべて規定ターン以内に終了する」）。
デッキ20枚・初期手札4枚・毎ターン1ドローなので、**16ターン前後でデッキが尽きる**。
`turnLimit` 到達率が 0% でないなら、それは設計の失敗として報告する。

---

## 4. 状態の型定義

`core` は純粋関数のみ（CLAUDE.md 3章）。すべて `readonly`。

```ts
export type PlayerId = 0 | 1
export type CardId = string
export type InstanceId = number

export type Phase = 'setup' | 'draw' | 'main' | 'battle' | 'end' | 'over'
export type Position = 'attack' | 'defense'
export type EndReason = 'lifePoints' | 'deckOut' | 'turnLimit'

export const LIFE_POINTS = 4000
export const DECK_SIZE = 20
export const MAX_SAME_NAME = 2
export const MONSTER_ZONES = 3
export const SPELL_ZONES = 3
export const HAND_SIZE_AT_START = 4
export const HAND_LIMIT = 6
export const MAX_TURNS = 60

export interface MonsterOnField {
  readonly instanceId: InstanceId
  readonly cardId: CardId
  readonly position: Position
  readonly faceDown: boolean
  /** このターンに攻撃したか */
  readonly hasAttacked: boolean
  /** このターンに召喚されたか（表示形式の変更を禁じるため） */
  readonly summonedThisTurn: boolean
  /** このターンに表示形式を変えたか */
  readonly changedThisTurn: boolean
  /** 効果による攻撃力の増減。ターン終了で 0 に戻る */
  readonly atkDelta: number
}

export interface SpellOnField {
  readonly instanceId: InstanceId
  readonly cardId: CardId
  readonly faceDown: boolean
  /** 伏せたターン。同一ターンの発動を禁じるため */
  readonly setTurn: number
}

export interface PlayerSide {
  readonly lp: number
  readonly deck: readonly CardId[]
  readonly hand: readonly CardId[]
  readonly graveyard: readonly CardId[]
  /** 長さ MONSTER_ZONES。空きは null */
  readonly monsters: readonly (MonsterOnField | null)[]
  /** 長さ SPELL_ZONES。空きは null */
  readonly spells: readonly (SpellOnField | null)[]
  /** このターンに通常召喚を使ったか */
  readonly summonedThisTurn: boolean
}

/** 割り込みの最中だけ存在する。攻撃宣言から戦闘計算までの間 */
export interface PendingAttack {
  readonly attacker: InstanceId
  /** null はダイレクトアタック */
  readonly target: InstanceId | null
  /** 防御側がすでに応答したか。true なら二度目は求めない（チェーン1段） */
  readonly responded: boolean
  /** 罠によって無効化されたか */
  readonly negated: boolean
}

export interface GameState {
  readonly phase: Phase
  readonly turn: number
  /** そのターンの手番 */
  readonly turnPlayer: PlayerId
  /**
   * **いま行動を求められているプレイヤー。**
   * 通常は turnPlayer と同じ。割り込み中だけ相手になる。
   */
  readonly priority: PlayerId
  readonly players: readonly [PlayerSide, PlayerSide]
  readonly pendingAttack: PendingAttack | null
  readonly rng: Rng
  readonly log: readonly LogEntry[]
  readonly winner: PlayerId | null
  readonly endReason: EndReason | null
  readonly nextInstanceId: InstanceId
}
```

### 設計上の約束

- **`priority` を `turnPlayer` と分ける。** これが割り込みを `reduce(state, action)` の形の
  まま作れる鍵である。割り込み中は `priority` が防御側を指し、`legalActions(state)` は
  防御側の選べる行動（罠を開く / 流す）だけを返す
- `pendingAttack` は攻撃宣言から戦闘計算までの**一時的な状態**。`null` でないときは
  必ず `phase === 'battle'`
- 乱数は `rng` として持ち回る。`Math.random()` は使わない
- `atkDelta` はターン終了時に 0 へ戻す。永続の増減は v1 では作らない

---

## 5. Action 一覧

```ts
export type Action =
  | { readonly type: 'start'; readonly seed: number
      readonly decks: readonly [Deck, Deck]; readonly firstPlayer: PlayerId }
  | { readonly type: 'draw' }
  | { readonly type: 'normalSummon'; readonly handIndex: number
      readonly zone: number; readonly position: Position
      readonly tributes: readonly InstanceId[] }
  | { readonly type: 'setMonster'; readonly handIndex: number
      readonly zone: number; readonly tributes: readonly InstanceId[] }
  | { readonly type: 'changePosition'; readonly instanceId: InstanceId }
  | { readonly type: 'activateSpell'; readonly handIndex: number
      readonly target: InstanceId | null }
  | { readonly type: 'setSpell'; readonly handIndex: number; readonly zone: number }
  | { readonly type: 'toBattle' }
  | { readonly type: 'declareAttack'
      readonly attacker: InstanceId; readonly target: InstanceId | null }
  | { readonly type: 'activateTrap'; readonly zone: number }
  | { readonly type: 'passResponse' }
  | { readonly type: 'endTurn' }
  | { readonly type: 'discardToLimit'; readonly handIndex: number }
```

### 割り込みの流れ

```
[攻撃側] declareAttack
  → pendingAttack が立ち、priority が防御側へ移る
[防御側] activateTrap  または  passResponse
  → 罠を解決（攻撃を無効化する罠なら negated = true）
  → responded = true、priority が攻撃側へ戻る
  → 戦闘計算を行い、pendingAttack を null にする
```

**防御側に伏せカードが1枚も無いときは `priority` を移さず、そのまま戦闘計算へ進む。**
無意味な選択を求めないためで、CPU の手数も減る。

### 補助関数（core、純粋）

```ts
export function legalActions(state: GameState): readonly Action[]
export function isOver(state: GameState): boolean
export function canAttack(state: GameState, m: MonsterOnField): boolean
export function tributesRequired(level: number): 0 | 1 | 2
export function battleResult(atk: number, def: number, position: Position):
  { readonly destroyed: 'attacker' | 'defender' | 'both' | 'none'
    readonly damageTo: PlayerId | null; readonly damage: number }
```

---

## 6. カードデータのスキーマ

**カードIDは `maniwa-tcg` と共通。** 名前・ルビ・説明文・系統・レアリティ・イラストは
そのまま持ち込み、**数値と効果だけを書き直す**。

```ts
export interface MonsterDef {
  readonly id: CardId          // f001 など。maniwa-tcg と同じ
  readonly name: string
  readonly ruby?: string
  readonly kind: 'monster'
  readonly flavor: string
  readonly origin: Origin      // maniwa-tcg と同じ8系統
  readonly rarity: Rarity
  readonly attribute: Attribute // 属性。maniwa-tcg の EnergyType と同じ9種
  readonly level: number        // 1〜8
  readonly atk: number
  readonly def: number
}

export interface SpellDef {
  readonly id: CardId          // i001（神具）/ u001（絶技）
  readonly name: string
  readonly ruby?: string
  readonly kind: 'spell'
  /** 出自。v2 で装備魔法・通常魔法に分けるときの手がかり（6.3） */
  readonly form: 'artifact' | 'art'   // artifact = 神具 / art = 絶技
  readonly flavor: string
  readonly origin: Origin
  readonly rarity: Rarity
  /**
   * **絶技だけが持つ発動条件。** このカードIDの姫神が
   * 自分のモンスターゾーンに表側で存在するときだけ発動できる（6.3）。
   * maniwa-tcg の UltimateCard.requires をそのまま引き継ぐ。
   */
  readonly requires?: CardId
  readonly effects: readonly Effect[]
}

export interface TrapDef {
  readonly id: CardId          // a001 など
  readonly name: string
  readonly ruby?: string
  readonly kind: 'trap'        // 道標
  readonly flavor: string
  readonly origin: Origin
  readonly rarity: Rarity
  readonly effects: readonly Effect[]
}
```

**属性は戦闘に影響しない。** `maniwa-tcg` の弱点表は持ち込まない（遊戯王の属性は
戦闘計算に関与しないため）。デッキの色分けと見た目にだけ使う。

### 6.1 姫神の数値の決め方（出発点）

87体を手で決めるのは無理なので、`maniwa-tcg` の値から機械的に出した**たたき台**から始め、
シミュレーションで詰める。**この式は仮であり、測ってから確定する。**

| 新しい値 | たたき台の式 |
|---|---|
| 攻撃力 | **最強ワザの威力 × 20**（10刻みに丸める） |
| 守備力 | **HP × 10**（10刻みに丸める） |
| レベル | **レアリティから**（下表） |

| レアリティ | レベル | リリース |
|---|---|---|
| コモン | 3 | 不要 |
| レア | 4 | 不要 |
| スーパーレア | 5〜6 | 1体 |
| ウルトラレア | 7〜8 | 2体 |

**レアリティがそのままリリース数になる。** `maniwa-tcg` で積み上げたレアリティ判定
（`tools/rarity.ts` の区切り 300 / 255 / 225）の仕事が、そのまま召喚コストとして
生きるということである。

たたき台での実例:

| ID | 名前 | 旧HP | 旧最強威力 | → 攻撃力 | 守備力 | レベル |
|---|---|---|---|---|---|---|
| f002 | カグツチEX | 170 | 105 | **2100** | 1700 | 7 |
| l009 | ダイワスカーレット | — | 120 | **2400** | — | 8 |
| （コモンの例） | — | 60 | 30 | **600** | 600 | 3 |

ライフ4000に対して上位が2100前後なので、**2〜3回殴れば決着**する。
デッキ切れの16ターンより早く終わるはずで、ここは 12章で測る。

### 6.2 神具・絶技・道標の効果は書き直す

`maniwa-tcg` の効果12種のうち `gainEnergy` / `attachEnergy` / `discardEnergy` は
**エネルギーが無いので意味を失う**。`damage` も「モンスターへのダメージ」から
「ライフへのダメージ」に意味が変わる。絶技の `cost`（エネルギー3つ）も同様に消える。

**70種すべての `effects` を書き直す**（神具26 / 絶技18 / 道標26）。
名前・ルビ・説明文・系統・レアリティ・イラストは変えない。
絶技の `requires` だけは**そのまま引き継ぐ**（6.3）。

### 6.3 種別の対応は、カードの性格から決める

`maniwa-tcg` の4種別を、**カードが何であるかに従って**割り当てる。

| maniwa-tcg | 種類数 | このゲーム | なぜ |
|---|---|---|---|
| 姫神 | 87 | **モンスター** | そのまま |
| **神具** | 26 | **魔法** | 九鼎・グングニル・八尺瓊勾玉・黄金の林檎…。**すべて「物」**である |
| **絶技** | 18 | **魔法** | 天叢焼・大地震・九歩の雷・血より生る神…。**すべて「技」**であり、放つ一回きりの出来事 |
| **道標** | 26 | **罠** | 天啓・交代の号令・運命の三女神・ギャラルホルン…。**すべて「兆し」や「合図」**で、状況を引っくり返す側にある |

**魔法44 / 罠26 / モンスター87 = 157枚。イラストが1枚も余らない。**

#### 絶技の発動条件は、そのまま持ち込める

`maniwa-tcg` の `UltimateCard` は最初から条件を持っている。

```ts
/** この絶技を撃てるキャラのカードID。バトル場にいることが条件 */
readonly requires: CardId
```

これは遊戯王の「**自分フィールドに《X》が存在する場合に発動できる**」と同じ形である。
**変換ではなく読み替えで済む。**

しかも**条件は緩くなる**。`maniwa-tcg` では「**バトル場**にいること」＝1枠だったが、
このゲームのモンスターゾーンは**3枠**あるので、同じカードが条件を満たしやすい。

> `decks.ts` より: 絶技は対応するキャラが同じデッキにいないと死に札になるため、
> その属性の絶技を2枚積む

**この死に札問題が3分の1の重さになる。** 2枚積む必要も薄れる。

#### 絶技をスキルに充てる案は取り下げる

前の版では「絶技18種を v2 のスキルに充てる」と書いたが、**取り下げる**。

| | スキルに充てる（旧案） | 魔法にする（新案） |
|---|---|---|
| 使える絶技 | **8種**（1デッキ1つ） | **18種すべて** |
| 実装 | v2。新しい仕組みが要る | **v1。仕組みは何も要らない** |
| 死に札 | 起きない | 起きうるが3枠ぶん軽い |

**新案が全面的に上である。** スキルは v2 で、絶技とは無関係に設計する。

#### v2 で魔法を分けるときの線

v1 の魔法はすべて通常魔法（発動して即墓地）にする。v2 で装備魔法・永続魔法を足すときは、
**`form` がそのまま線になる**。

- `form: 'artifact'`（神具）→ **装備魔法・永続魔法**。物なので場に残るのが自然
- `form: 'art'`（絶技）→ **通常魔法**。技は放てば終わる

**種別を性格から決めておくと、あとの拡張も性格が決める。**

---

## 7. 効果（Effect）の一覧

CLAUDE.md 4章に従い、効果は**データで表現**する。解釈は `core/effects.ts` に一元化し、
カードを足すときにロジックを触らない。

```ts
export type EffectTarget =
  | 'opponent'            // 相手プレイヤー
  | 'self'                // 自分プレイヤー
  | 'opponentMonsterAll'  // 相手モンスター全部
  | 'opponentMonsterOne'  // 相手モンスター1体（発動時に選ぶ）
  | 'ownMonsterAll'
  | 'ownMonsterOne'
  | 'attacker'            // 罠専用。攻撃してきたモンスター

export type Effect =
  | { type: 'lifeDamage';   target: 'opponent' | 'self'; value: number }
  | { type: 'lifeHeal';     target: 'opponent' | 'self'; value: number }
  | { type: 'destroy';      target: EffectTarget }
  | { type: 'atkChange';    target: EffectTarget; value: number }  // 負値で弱体化
  | { type: 'draw';         value: number }
  | { type: 'discard';      target: 'opponent' | 'self'; value: number }
  | { type: 'search';       kind: 'monster' | 'spell' | 'trap' }
  | { type: 'negateAttack' }        // 罠専用
  | { type: 'position';     target: EffectTarget; position: Position }
  | { type: 'revive' }              // 自分の墓地のモンスター1体を特殊召喚
```

**`negateAttack` と `attacker` は罠でしか使えない。** `core/effects.ts` が
`pendingAttack === null` のときに拒否する。データ側に書いてしまえる形にはしない。

v1 で新しい効果タイプを足すときは、**先にこの表に追記してから**実装する。

---

## 8. 画面遷移

```
タイトル
  ├→ デッキ選択 ──→ 対戦 ──→ 結果 ──→（タイトル / もう一度）
  └→ カード一覧
```

`maniwa-tcg` と同じ構成にする。遊ぶ人が2本を行き来するため。

### 8.1 対戦画面のレイアウト（縦持ち前提）

上から順に。**横スクロールを発生させない**（CLAUDE.md 6章）。

```
┌──────────────────────────┐
│ 相手 ライフ 4000          デッキ 12  墓地 3 │
├──────────────────────────┤
│  [魔]  [魔]  [魔]         相手の魔法罠3  │
│  [獣]  [獣]  [獣]         相手のモンスター3│
├──────────────────────────┤
│  [獣]  [獣]  [獣]         自分のモンスター3│
│  [魔]  [魔]  [魔]         自分の魔法罠3  │
├──────────────────────────┤
│ 自分 ライフ 4000          デッキ 12  墓地 3 │
├──────────────────────────┤
│        手札（扇状）                    │
├──────────────────────────┤
│  フェイズ表示 / 進むボタン              │
└──────────────────────────┘
```

**12枠は横3つ並びなので、360px 幅でも1枠100px以上取れる。**
`maniwa-tcg` のバトル場1＋ベンチ3（4枠）より枠は増えるが、
**タップ領域44px四方の下限は余裕で満たす**（CLAUDE.md 6章）。

盤面の縦が足りないときの扱いは `maniwa-tcg` の SPEC 9.3.1〜9.3.3（画面の高さで閉じる /
スクロール位置を保つ / 上に隠れている段に手がかりを出す）と同じ方針を取る。
**実装時に実機で測る。**

### 8.2 割り込みの見せ方

罠を開けるのは**相手のバトルフェイズ中の1回だけ**である。
このとき画面は相手のターンなので、**待っているのか自分の番なのかが分からなくなりやすい。**

- 伏せカードが1枚も無いときは**そもそも止まらない**（5章）
- 止まったときは伏せカードを光らせ、「開く / 開かない」の2択だけを出す
- 時間制限は設けない（1人で遊ぶため）

---

## 9. カードの表示

### 9.1 体裁

`maniwa-tcg` の SPEC 9.1 を踏襲するが、**読み取る数字が変わる**。

| 位置 | 内容 |
|---|---|
| 上 | 名前（ルビ付き） |
| 中央 | イラスト（正方形） |
| 左下 | **攻 2100 / 守 1700**（モンスター）、**神具 / 道標**（魔法・罠） |
| 右下 | レベル（★の数）と属性のバッジ |

`maniwa-tcg` の SPEC 9.2 にある注意がそのまま効く。

> 絵は種別の手がかりにならない。手札で姫神と支援カードを見分けるのは、
> カード左下の表示と属性の丸バッジが担う。**この2つを消してはならない。**

### 9.2 フォントと配色

CLAUDE.md 6章のとおり DotGothic16 / 森緑 `#2d5a3d` / クリーム `#f5f0e1`。
**`maniwa-tcg` と同じ見た目にする。** 同じ世界の別のゲームなので。

### 9.3 ダメージイラストは**ライフポイント**で切り替える

`maniwa-tcg` では姫神の残りHPで絵が差し替わっていた（無傷 / 傷 / 追い詰められた姿）。
**このゲームにはモンスターのHPが無いので、代わりに持ち主のライフで切り替える。**

| ライフ | 絵 |
|---|---|
| 2667 以上 | `<id>.webp`（無傷） |
| 1334 〜 2666 | `<id>-d1.webp`（傷） |
| 1333 以下 | `<id>-d2.webp`（追い詰められた姿） |

**区切りの値は仮である。** 1万戦のライフ推移を測り、3つの絵がそれぞれ画面に出る
時間が極端に偏らないよう 12章で決め直す。

#### なぜこれで筋が通るか

`maniwa-tcg` の `src/data/art/README.md` にこう書かれている。

> 姫神の3枚（**無傷 / 傷 / 追い詰められた姿**）は従来どおり同一衣装で揃える。

**d2 は「追い詰められた姿」であって「瀕死の姿」ではない。** 追い詰められているかどうかは
モンスター1体の話ではなく、その決闘者が置かれた状況の話である。ライフはまさにそれなので、
絵の意図と読み替え先がずれていない。

これにより**150枚のダメージ絵が行き場を失わずに済む**。

#### 決めごと

- **場のモンスターだけ**切り替える。**手札は常に無傷の絵**。まだ出していないカードが
  傷んでいるのはおかしいため
- 相手側も同じ規則で切り替える。**相手の盤を見て自分が勝っているか分かる**
- **自分のモンスターが一斉に切り替わる。** 3体並んでいれば3枚同時に変わる
- **v1 では差し替えだけを入れ、アニメーションを足さない。** `maniwa-tcg` で
  `card--hit` と `card--drained` の取り合いを2度踏んでいる（SPEC 9.4.13）。
  演出は差し替えが安定してから別途
- ライフは1回の戦闘で増減しうる。**絵の判定は戦闘計算が終わってから1回だけ行う**
  （途中の値でちらつかせない）
- 絵の選択は**表示側でライフから決める**。`core` には何も足さない。
  `maniwa-tcg` の SPEC 9.4.11（弱点の演出を描画側で `WEAKNESS_CHART` から引き直した）
  と同じやり方で、決定論リプレイのハッシュを動かさない

#### 失われるもの（正直に）

`maniwa-tcg` では絵が「この姫神があとどれくらい耐えるか」という**他では読めない情報**を
持っていた。ライフに紐づけると、絵は画面に大きく出ている数字と同じことを言うだけになり、
情報ではなく雰囲気になる。

ただし遊戯王型のルールには**モンスターの傷という情報がそもそも無い**ので、
比べる相手は「今の絵」ではなく「何も無い」である。

---

## 10. セーブデータ

`localStorage`、キーは **`maniwa-duel_v1`**（CLAUDE.md 6章）。
`maniwa-tcg_v1` とは独立。スキーマ変更時はバージョンを上げ、旧データの移行を書く。

保存するもの: 選んだデッキ / 戦績 / 音量。**対局の途中経過は v1 では保存しない。**

---

## 11. 割り込みを1段に限る理由

遊戯王が遊戯王である理由は、伏せた罠と、それに割り込む優先権のやりとり
（チェーン・スペルスピード）である。**v1 はここを1段に限る。**

| | v1 | 本家 |
|---|---|---|
| 割り込める場面 | **相手のバトルフェイズ・攻撃宣言時のみ** | ほぼすべての場面 |
| チェーンの深さ | **1段**（罠に罠を重ねられない） | 無制限 |
| スペルスピード | 持たない | 1 / 2 / 3 |
| 解決順 | 罠 → 戦闘計算 | 逆順（LIFO）の解決スタック |

**この割り切りが成立するのは、メインフェイズ2が無いからである。**
罠はバトル前に置ききるしかなく、割り込みが起きうる場所がバトルフェイズに集中する。
**窓口が1か所に絞れるので、解決スタックを持たずに `reduce(state, action)` のまま書ける。**

v2 でチェーンを深くするときは、`pendingAttack` を解決スタックに置き換える。
**そのとき `core` の設計が変わる**ので、v1 のうちにテストを厚くしておく。

---

## 12. テスト方針

CLAUDE.md 5章の必須3項目は必ず作る。

| テスト | 内容 |
|---|---|
| **決定論リプレイ** | 同一シード＋同一入力列 → 最終状態のハッシュが完全一致 |
| **ルール不変条件** | ライフ・手札枚数・デッキ枚数・ゾーンの数が負値や NaN にならない。ゾーンの長さが常に3 |
| **終局保証** | 1万回の自動対戦がすべて `MAX_TURNS` 以内に終了する |

このゲーム固有で足すもの:

| テスト | 内容 |
|---|---|
| 戦闘計算 | `battleResult` の表（3.6）を全パターン |
| 召喚コスト | レベルとリリース数の対応。リリース不足で召喚できないこと |
| **通常召喚は1ターン1回** | セットも消費すること |
| **伏せたターンに罠を発動できない** | `setTurn === state.turn` で拒否されること |
| **割り込みは1段** | `responded === true` のあと二度目の `priority` 移譲が起きないこと |
| **伏せカードが無いと止まらない** | `declareAttack` から直接戦闘計算へ進むこと |
| 先攻1ターン目 | ドローしない・バトルフェイズに入れない |
| 手札上限 | エンドフェイズに6枚へ落ちること |
| 効果の適用 | `negateAttack` と `attacker` が罠以外で拒否されること |
| `core` 純粋性 | 既存の `tests/core-purity.test.ts` が自動で拾う |

---

## 13. シミュレーション指標（`npm run sim`）

1万回の自動対戦。CLAUDE.md 5章の必須項目:

- **先手勝率**（45〜55% を逸脱したら要調整）
- 平均ターン数・平均試合時間
- カード別の採用率と勝率寄与
- **一度も使われなかったカードの一覧**

このゲーム固有で出すもの:

| 指標 | 見たいこと |
|---|---|
| 決着理由の内訳（`lifePoints` / `deckOut` / `turnLimit`） | **`turnLimit` は 0% であるべき** |
| **デッキ切れ決着の割合** | 高すぎるなら打点が足りない |
| **ライフの推移**（ターンごとの中央値） | **9.3 の絵の区切りをここから決める** |
| 罠の発動率 | 低すぎるなら割り込みが機能していない |
| ダイレクトアタックの割合 | 高すぎるなら盤面が維持できていない |
| リリース召喚の回数 | 0に近いなら上位モンスターが出せていない |

**数値が基準を外れても、独断でカードデータを書き換えない**（CLAUDE.md 5章）。報告のみ。

---

## 14. ディレクトリ構成と実装順序

```
games/maniwa-duel/
  SPEC.md
  index.html
  src/
    core/
      types.ts      状態とカードデータの型（4章・6章・7章）
      rng.ts        maniwa-tcg と同じ xorshift32（**複製する。共有しない**）
      rules.ts      battleResult / tributesRequired など純粋な判定
      effects.ts    効果の解釈を一元化（7章）
      actions.ts    legalActions
      reduce.ts     reduce(state, action) => GameState
    data/
      monsters.ts   姫神（v1 は2属性ぶん）
      spells.ts     神具
      traps.ts      道標
      decks.ts      プリセットデッキ
    game/
      art.ts        **maniwa-tcg の art を相対参照**（2章）
      theme.ts / style.css / view.ts / main.ts / sound.ts / storage.ts
  tests/
  tools/
    sim.ts          npm run sim から自動で拾われる
    ai.ts           貪欲法
```

`rng.ts` は**複製する。** イラストと違って46行しかなく、
`core` どうしを結合させると片方のゲームの都合がもう片方に漏れるため。

### 実装順序（1コミット1機能・CLAUDE.md 7章）

1. `core/types.ts` — 型だけ
2. `core/rng.ts` — 複製とテスト
3. `core/rules.ts` — `battleResult` と `tributesRequired`。**表(3.6)を全パターンテスト**
4. `core/reduce.ts` — 開始・ドロー・ターン進行・勝敗。**まだ召喚できない**
5. 召喚とセット（リリース含む）
6. バトル（**割り込み無しで**戦闘計算まで）
7. 魔法の発動 + `core/effects.ts`
8. 罠のセットと**割り込み1段**
9. `tools/ai.ts` + `tools/sim.ts` — ここで初めて数値が測れる
10. `data/` にカードを載せる（**この時点でたたき台の式を検算する**）
11. `index.html` + `game/` — 画面。**ここでビルド対象に入る**
12. 9.3 のライフ連動イラスト
13. 音

**9 までは画面が無い。** `core` はエンジンなしでテストできる（CLAUDE.md 3章）ので、
数値が測れる状態を先に作る。

---

## 15. v2 以降の候補

| 項目 | 備考 |
|---|---|
| **スキル** | デュエルリンクス固有の要素。デッキ外に置き、条件で発動する。**絶技とは無関係に設計する**（6.3 で絶技は魔法にしたため） |
| チェーン2段以上 | 11章。`pendingAttack` を解決スタックに置き換える |
| 永続魔法・装備魔法・カウンター罠 | **神具を装備・永続へ移す**（6.3）。効果の種類を増やす |
| 8属性すべてのデッキ | 87体ぶんの数値を確定させてから |
| エクストラデッキ | EMZ とリンク先の規則が要る。**入れるかどうかから判断する** |
| フィールド魔法 | 使うカードを作るところから |
| 時間制限 | 対人戦を作るなら |

---

## 16. 要確認事項

実装前に決めたい。**推測で埋めない。**

| # | 内容 | 仮の案 |
|---|---|---|
| Q1 | ディレクトリ名 `maniwa-duel` とゲーム名「姫神速闘」でよいか | この名前で進める |
| Q2 | v1 のプリセットデッキはどの2属性か | **ほのお と みず**（`maniwa-tcg` の相性で 27.5% : 72.5% と最も偏っていた組。属性が戦闘に関与しなくなると偏りが消えるはずで、確かめる題材になる） |
| Q3 | 6.1 のたたき台の式（攻撃力＝威力×20 / 守備力＝HP×10 / レベル＝レアリティ）で始めてよいか | この式で始め、12章で詰める |
| Q4 | 同名2枚制限でよいか（デュエルリンクスは3枚） | 2枚。カードプールが2枚前提で作られているため |
| Q5 | `maniwa-tcg` の `src/data/art/README.md` に共有の旨を1行追記してよいか | **追記したい**（2章）。`maniwa-tcg` への唯一の変更になるので承認が要る |
| Q6 | 6.3 の対応（神具・絶技→魔法 / 道標→罠）でよいか | この対応で進める。イラストが1枚も余らない |

---

## 17. 守ること

- **`maniwa-tcg` を変更しない**（Q5 の1行を除く。承認を得てから）
- `core` は純粋関数のみ。`Math.random()` / `Date.now()` / ブラウザAPI を使わない（CLAUDE.md 3章）
- 効果はデータで表現し、解釈は `core/effects.ts` に集める（CLAUDE.md 4章）
- 外部ライブラリを追加しない（CLAUDE.md 1章）
- 1コミット1機能。コミットメッセージは日本語で理由を含める（CLAUDE.md 7章）
- 数値が基準を外れても独断でカードデータを書き換えない。報告のみ（CLAUDE.md 5章）
