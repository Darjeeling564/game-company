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
export type Rarity = 'common' | 'uncommon' | 'rare' | 'ultra'

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

export interface AttackDef {
  readonly name: string
  /** 漢字や英語を使ったワザ名のフリガナ。かな書きのワザには付けない */
  readonly ruby?: string
  readonly cost: readonly EnergyType[]
  readonly effects: readonly Effect[]
}

export interface CardDef {
  readonly id: CardId
  readonly name: string
  /** モチーフになった神格・霊獣の説明。必須にして、カード追加時の書き忘れを型で防ぐ */
  readonly flavor: string
  /** 系統（どの神話に属するか） */
  readonly origin: Origin
  readonly rarity: Rarity
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
}

export type Phase =
  | { readonly kind: 'setup' }
  | { readonly kind: 'main' }
  | { readonly kind: 'promote'; readonly queue: readonly PlayerId[] }
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
