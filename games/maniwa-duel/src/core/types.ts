/**
 * maniwa-duel の状態とカードデータの型。SPEC.md 4章・6章・7章に対応する。
 *
 * core 層は純粋関数のみで構成する（CLAUDE.md 3章）。状態はすべて readonly とし、
 * reduce は新しい GameState を返す。
 *
 * このゲームは maniwa-tcg とは**別のゲーム**である。共有するのはカードイラストだけで
 * （SPEC 2章）、型もルールも共有しない。
 */
import type { Rng } from './rng.ts'

// ---------------------------------------------------------------- 基本

export type PlayerId = 0 | 1
export type CardId = string
export type InstanceId = number

/**
 * 属性。maniwa-tcg の EnergyType と同じ9種を使う。
 *
 * **ただし戦闘には影響しない。** 遊戯王の属性は戦闘計算に関与しないため、
 * maniwa-tcg の弱点表（WEAKNESS_CHART）は持ち込まない。
 * デッキの色分けと見た目にだけ使う（SPEC 6章）。
 */
export type Attribute =
  | 'fire'
  | 'forest'
  | 'wind'
  | 'earth'
  | 'thunder'
  | 'water'
  | 'light'
  | 'dark'
  | 'colorless'

/** カードの系統（モチーフの出典）。maniwa-tcg と同じ */
export type Origin =
  | 'japan'
  | 'egypt'
  | 'norse'
  | 'india'
  | 'mesopotamia'
  | 'cthulhu'
  | 'greece'
  | 'china'
  | 'original'

/** レアリティ。**そのままレベル（リリース数）になる**（SPEC 6.1） */
export type Rarity = 'common' | 'rare' | 'superRare' | 'ultra'

// ---------------------------------------------------------------- 定数

export const LIFE_POINTS = 4000
export const DECK_SIZE = 20
export const MAX_SAME_NAME = 2
export const MONSTER_ZONES = 3
export const SPELL_ZONES = 3
export const HAND_SIZE_AT_START = 4
export const HAND_LIMIT = 6

/**
 * 終局保証のための安全弁（SPEC 3.7）。
 *
 * デッキ20枚・初期手札4枚・毎ターン1ドローなので16ターン前後でデッキが尽きる。
 * **通常の対戦で到達してはならない。** 到達率が 0% でないなら設計の失敗として報告する。
 */
export const MAX_TURNS = 60

/** レベルごとのリリース数（SPEC 3.5） */
export function tributesRequired(level: number): 0 | 1 | 2 {
  if (level >= 7) return 2
  if (level >= 5) return 1
  return 0
}

export function opponentOf(player: PlayerId): PlayerId {
  return player === 0 ? 1 : 0
}

// ---------------------------------------------------------------- カードデータ

/** 魔法の種類（SPEC 6.4）。**v1 が実装するのは 'normal' のみ** */
export type SpellType = 'normal' | 'continuous' | 'equip' | 'field' | 'quick'

/** 罠の種類（SPEC 6.4）。**v1 が実装するのは 'normal' のみ** */
export type TrapType = 'normal' | 'continuous' | 'counter'

export type Position = 'attack' | 'defense'

export type EffectTarget =
  | 'opponent' // 相手プレイヤー
  | 'self' // 自分プレイヤー
  | 'opponentMonsterAll'
  | 'opponentMonsterOne'
  | 'ownMonsterAll'
  | 'ownMonsterOne'
  | 'attacker' // 罠専用。攻撃してきたモンスター

/** 発動したとき1回だけ起きること。**v1 が実装するのはこちらだけ**（SPEC 7章） */
export type OneShot =
  | { readonly type: 'lifeDamage'; readonly target: 'opponent' | 'self'; readonly value: number }
  | { readonly type: 'lifeHeal'; readonly target: 'opponent' | 'self'; readonly value: number }
  | { readonly type: 'destroy'; readonly target: EffectTarget }
  /** 負値で弱体化。ターン終了で戻る */
  | { readonly type: 'atkChange'; readonly target: EffectTarget; readonly value: number }
  | { readonly type: 'draw'; readonly value: number }
  | { readonly type: 'discard'; readonly target: 'opponent' | 'self'; readonly value: number }
  | { readonly type: 'search'; readonly kind: 'monster' | 'spell' | 'trap' }
  /** 罠専用。攻撃を無効にする */
  | { readonly type: 'negateAttack' }
  | { readonly type: 'position'; readonly target: EffectTarget; readonly position: Position }
  /** 自分の墓地のモンスター1体を特殊召喚 */
  | { readonly type: 'revive' }

/** 継続効果が及ぶ範囲（SPEC 7章） */
export type Scope =
  | 'ownMonsters'
  | 'opponentMonsters'
  | 'allMonsters'
  /** 装備魔法。equippedTo の1体だけ */
  | 'equippedMonster'

/**
 * 場にある間ずっと効いていること（SPEC 6.4 第2層）。
 *
 * **v1 では型だけ存在し、これを持つカードを作らない。**
 * それでも置くのは、effectiveAtk がこれを走査する形で最初から書かれていれば、
 * 第2層を足す日に core の他の場所を触らずに済むためである。
 */
export type Continuous =
  | { readonly type: 'atkBoost'; readonly scope: Scope; readonly value: number }
  | { readonly type: 'defBoost'; readonly scope: Scope; readonly value: number }
  | { readonly type: 'cannotAttack'; readonly scope: Scope }
  | { readonly type: 'noBattleDamage'; readonly scope: Scope }

interface CardBase {
  readonly id: CardId
  readonly name: string
  readonly ruby?: string
  readonly flavor: string
  readonly origin: Origin
  readonly rarity: Rarity
}

export interface MonsterDef extends CardBase {
  readonly kind: 'monster'
  readonly attribute: Attribute
  /** 1〜8。リリース数を決める（SPEC 3.5） */
  readonly level: number
  readonly atk: number
  readonly def: number
}

export interface SpellDef extends CardBase {
  readonly kind: 'spell'
  readonly spellType: SpellType
  /** 出自。artifact = 神具（物）/ art = 絶技（技）。SPEC 6.3 */
  readonly form: 'artifact' | 'art'
  /**
   * **絶技だけが持つ発動条件。** このカードIDの姫神が
   * 自分のモンスターゾーンに表側で存在するときだけ発動できる（SPEC 6.3）。
   * maniwa-tcg の UltimateCard.requires をそのまま引き継ぐ。
   */
  readonly requires?: CardId
  readonly onActivate: readonly OneShot[]
  /** 場にある間ずっと効くこと（永続・装備・フィールドのみ）。v1 では未使用 */
  readonly whileOnField?: readonly Continuous[]
}

export interface TrapDef extends CardBase {
  readonly kind: 'trap'
  readonly trapType: TrapType
  readonly onActivate: readonly OneShot[]
  /** v1 では未使用 */
  readonly whileOnField?: readonly Continuous[]
}

/**
 * カード定義。種別ごとの直和にすることで、「魔法のレベル」のような
 * 意味のない状態を型の時点で作れなくする（maniwa-tcg SPEC 6章と同じ方針）。
 */
export type CardDef = MonsterDef | SpellDef | TrapDef

/** カード定義の参照表。GameState には含めず、cardId から引く */
export type CardIndex = ReadonlyMap<CardId, CardDef>

export interface Deck {
  readonly name: string
  readonly cards: readonly CardId[]
}

// ---------------------------------------------------------------- 状態

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
  /**
   * 'set'    伏せてある（裏側）
   * 'active' 発動済みで場に残っている（永続・装備・フィールド。**v1 では発生しない**）
   */
  readonly state: 'set' | 'active'
  /** 伏せたターン。同一ターンの発動を禁じるため */
  readonly setTurn: number
  /** 装備魔法だけ使う。装備先のモンスター（v1 では常に null） */
  readonly equippedTo: InstanceId | null
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
  /** フィールド魔法ゾーン。**v1 では常に null**（SPEC 6.4） */
  readonly field: SpellOnField | null
  /** このターンに通常召喚を使ったか */
  readonly summonedThisTurn: boolean
}

export type Phase = 'setup' | 'draw' | 'main' | 'battle' | 'end' | 'over'

export type EndReason = 'lifePoints' | 'deckOut' | 'turnLimit'

/**
 * 割り込みの最中だけ存在する。攻撃宣言から戦闘計算までの間（SPEC 5章）。
 * null でないときは必ず phase === 'battle'。
 */
export interface PendingAttack {
  readonly attacker: InstanceId
  /** null はダイレクトアタック */
  readonly target: InstanceId | null
  /** 防御側がすでに応答したか。true なら二度目は求めない（チェーン1段） */
  readonly responded: boolean
  /** 罠によって無効化されたか */
  readonly negated: boolean
}

export interface LogEntry {
  readonly turn: number
  readonly player: PlayerId
  readonly kind: string
  readonly detail: string
}

export interface GameState {
  readonly phase: Phase
  readonly turn: number
  /** そのターンの手番 */
  readonly turnPlayer: PlayerId
  /**
   * **いま行動を求められているプレイヤー。**
   *
   * 通常は turnPlayer と同じ。割り込み中だけ相手になる。
   * turnPlayer と分けておくことが、解決スタックを持たずに割り込みを
   * reduce(state, action) の形のまま作れる鍵である（SPEC 4章）。
   */
  readonly priority: PlayerId
  readonly firstPlayer: PlayerId
  readonly players: readonly [PlayerSide, PlayerSide]
  readonly pendingAttack: PendingAttack | null
  readonly rng: Rng
  readonly log: readonly LogEntry[]
  readonly winner: PlayerId | null
  readonly endReason: EndReason | null
  readonly nextInstanceId: InstanceId
}
