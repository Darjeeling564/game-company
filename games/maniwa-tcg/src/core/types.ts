/**
 * maniwa-tcg の状態とカードデータの型。SPEC.md 4章・6章・7章に対応する。
 *
 * core 層は純粋関数のみで構成する（CLAUDE.md 3章）。状態はすべて readonly とし、
 * reduce は新しい GameState を返す。
 */
import type { Rng } from './rng.ts'

// ---------------------------------------------------------------- 基本

export type PlayerId = 0 | 1
export type CardId = string
export type InstanceId = number

export type EnergyType =
  | 'grass'
  | 'fire'
  | 'water'
  | 'lightning'
  | 'psychic'
  | 'fighting'
  | 'darkness'
  | 'metal'
  | 'colorless' // コスト表記専用。供給・付与はされない

/** v1 は どく のみ */
export type Status = 'poisoned'

/**
 * カードの系統（モチーフの出典）。
 * 'original' は神話に由来しない独自キャラクター用の枠で、v1 では未使用。
 */
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

/** レアリティ。強さと稀少性から決める（SPEC 8.3） */
export type Rarity = 'common' | 'rare' | 'superRare' | 'ultra'

// ---------------------------------------------------------------- 定数

export const DECK_SIZE = 20
export const MAX_SAME_NAME = 2
export const BENCH_SIZE = 3
export const HAND_SIZE_AT_START = 5
export const MAX_MULLIGAN = 10
export const POINTS_TO_WIN = 3
export const POINTS_FOR_EX = 2
export const POINTS_FOR_NORMAL = 1
export const WEAKNESS_BONUS = 20
export const POISON_DAMAGE = 10

/** 終局保証のための上限。通常の対戦で到達してはならない（SPEC 3.6） */
export const MAX_TURNS = 100

// ---------------------------------------------------------------- カードデータ

export interface Deck {
  readonly name: string
  readonly cards: readonly CardId[]
  readonly energy: readonly EnergyType[]
}

export type Target =
  | 'opponentActive'
  | 'opponentBenchAll'
  | 'opponentBenchRandom'
  | 'self'
  | 'ownActive'
  | 'ownBenchAll'

export type Effect =
  | { readonly type: 'damage'; readonly target: Target; readonly value: number }
  | {
      readonly type: 'damagePerHeads'
      readonly target: Target
      readonly count: number
      readonly value: number
    }
  | {
      readonly type: 'coinFlip'
      readonly count: number
      readonly min: number
      readonly then: readonly Effect[]
    }
  | { readonly type: 'heal'; readonly target: Target; readonly value: number }
  | { readonly type: 'selfDamage'; readonly value: number }
  | { readonly type: 'discardEnergy'; readonly target: Target; readonly value: number }
  | { readonly type: 'applyStatus'; readonly target: Target; readonly status: Status }
  | { readonly type: 'draw'; readonly value: number }
  /**
   * エネルギーの付与をやり直せるようにする。付与済みフラグを戻し、在庫が空なら補充する。
   * 「もう1回つけられる」を1つの効果で表すため、フラグと在庫の両方を面倒みる。
   */
  | { readonly type: 'gainEnergy' }
  /** 対象に value 個のエネルギーを直接つける。付与済みフラグは消費しない */
  | { readonly type: 'attachEnergy'; readonly target: Target; readonly value: number }
  /** 相手のバトル場をベンチの1体と入れ替える（PRNG使用） */
  | { readonly type: 'switchOpponent' }
  /** 山札からクリーチャーを1枚手札に加え、山札を切り直す（PRNG使用） */
  | { readonly type: 'searchCreature' }

export interface AttackDef {
  readonly name: string
  /** 漢字や英語を使ったワザ名のフリガナ。かな書きのワザには付けない */
  readonly ruby?: string
  readonly cost: readonly EnergyType[]
  readonly effects: readonly Effect[]
}

/** どの種別にも共通する項目 */
interface CardBase {
  readonly id: CardId
  readonly name: string
  /** モチーフになった神格・霊獣の説明。必須にして、カード追加時の書き忘れを型で防ぐ */
  readonly flavor: string
  /** 系統（どの神話に属するか） */
  readonly origin: Origin
  readonly rarity: Rarity
}

/** 場に出して戦うカード */
export interface CreatureCard extends CardBase {
  readonly kind: 'creature'
  readonly type: EnergyType
  readonly hp: number
  readonly ex: boolean
  readonly retreatCost: number
  readonly weakness: EnergyType | null
  readonly attacks: readonly AttackDef[]
  readonly stage?: 0
  readonly evolvesFrom?: string
}

/** アイテム。コスト無し・1ターンに何枚でも。使ったらトラッシュ（SPEC 16.1） */
export interface ItemCard extends CardBase {
  readonly kind: 'item'
  readonly effects: readonly Effect[]
}

/** 行動。コスト無し・1ターンに1枚だけ。使ったらトラッシュ（SPEC 16.1） */
export interface ActionCard extends CardBase {
  readonly kind: 'action'
  readonly effects: readonly Effect[]
}

/**
 * 絶技（必殺技）。対応するキャラがバトル場にいるときだけ、エネルギーを払って撃てる。
 * 撃つとターンが終了する（攻撃と排他。SPEC 16.8 Q7）。
 */
export interface UltimateCard extends CardBase {
  readonly kind: 'ultimate'
  /** この絶技を撃てるキャラのカードID。バトル場にいることが条件（Q8） */
  readonly requires: CardId
  readonly cost: readonly EnergyType[]
  /** 漢字や英語のときのフリガナ */
  readonly ruby?: string
  readonly effects: readonly Effect[]
}

/**
 * カード定義。種別ごとの直和にすることで、「アイテムのHP」のような
 * 意味のない状態を型の時点で作れなくする。
 */
export type CardDef = CreatureCard | ItemCard | ActionCard | UltimateCard

// ---------------------------------------------------------------- 状態

export interface Creature {
  readonly instanceId: InstanceId
  readonly cardId: CardId
  readonly damage: number
  readonly attached: readonly EnergyType[]
  readonly status: readonly Status[]
  readonly placedTurn: number
}

export interface EnergyZone {
  readonly pool: readonly EnergyType[]
  readonly current: EnergyType | null
  readonly next: EnergyType | null
}

export interface PlayerState {
  readonly deck: readonly CardId[]
  readonly hand: readonly CardId[]
  readonly discard: readonly CardId[]
  readonly active: Creature | null
  readonly bench: readonly Creature[]
  readonly points: number
  readonly energy: EnergyZone
  readonly attachedThisTurn: boolean
  readonly retreatedThisTurn: boolean
  /** 行動カードは1ターンに1枚だけ（SPEC 16.8 Q9） */
  readonly usedActionThisTurn: boolean
}

export type Phase =
  | { readonly kind: 'setup' }
  | { readonly kind: 'main' }
  /**
   * きぜつ後の入れ替え待ち。resume は入れ替え後の戻り先。
   * 攻撃やターン終了で入ったなら手番を渡し（'pass'）、アイテムや行動の途中なら
   * そのまま手番を続ける（'continue'）。これが無いと、アイテムで相手を倒した
   * 瞬間に自分のターンが終わってしまう。
   */
  | {
      readonly kind: 'promote'
      readonly queue: readonly PlayerId[]
      readonly resume: 'pass' | 'continue'
    }
  | { readonly kind: 'ended' }

export type EndReason = 'points' | 'noCreature' | 'turnLimit' | 'simultaneous'

export interface LogEntry {
  readonly turn: number
  readonly player: PlayerId
  readonly kind: string
  readonly detail: string
}

export interface GameState {
  readonly rng: Rng
  readonly turn: number
  readonly current: PlayerId
  readonly firstPlayer: PlayerId
  readonly phase: Phase
  readonly players: readonly [PlayerState, PlayerState]
  readonly setupDone: readonly [boolean, boolean]
  readonly nextInstanceId: InstanceId
  readonly winner: PlayerId | null
  readonly endReason: EndReason | null
  readonly log: readonly LogEntry[]
}

/** カード定義の参照表。GameState には含めず、cardId から引く（SPEC 4章） */
export type CardIndex = ReadonlyMap<CardId, CardDef>

export function opponentOf(player: PlayerId): PlayerId {
  return player === 0 ? 1 : 0
}
