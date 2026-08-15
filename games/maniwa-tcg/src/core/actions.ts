/**
 * core の入力。reduce(state, action) の action 側（SPEC.md 5章）。
 *
 * すべての Action が player を持つ。core は手番と phase を照合して不一致を拒否する。
 * これによりリプレイログが単体で読め、「誰の入力か」を外部状態に依存せず検証できる。
 */
import type { Deck, InstanceId, PlayerId } from './types.ts'

export type Action =
  // --- 開始 ---
  | {
      readonly type: 'start'
      readonly seed: number
      readonly decks: readonly [Deck, Deck]
      readonly firstPlayer: PlayerId
    }
  // --- 初期配置 ---
  | { readonly type: 'setupPlace'; readonly player: PlayerId; readonly handIndex: number }
  | { readonly type: 'setupDone'; readonly player: PlayerId }
  // --- メイン ---
  | { readonly type: 'playCreature'; readonly player: PlayerId; readonly handIndex: number }
  | { readonly type: 'attachEnergy'; readonly player: PlayerId; readonly target: InstanceId }
  | { readonly type: 'retreat'; readonly player: PlayerId; readonly benchIndex: number }
  | { readonly type: 'attack'; readonly player: PlayerId; readonly attackIndex: number }
  | { readonly type: 'endTurn'; readonly player: PlayerId }
  // --- きぜつ後 ---
  | { readonly type: 'promote'; readonly player: PlayerId; readonly benchIndex: number }

export type ActionType = Action['type']

/** ログ・デバッグ用の短い表現 */
export function describeAction(action: Action): string {
  switch (action.type) {
    case 'start':
      return `start seed=${action.seed} first=${action.firstPlayer}`
    case 'setupPlace':
      return `setupPlace p${action.player} hand[${action.handIndex}]`
    case 'setupDone':
      return `setupDone p${action.player}`
    case 'playCreature':
      return `playCreature p${action.player} hand[${action.handIndex}]`
    case 'attachEnergy':
      return `attachEnergy p${action.player} -> #${action.target}`
    case 'retreat':
      return `retreat p${action.player} bench[${action.benchIndex}]`
    case 'attack':
      return `attack p${action.player} attack[${action.attackIndex}]`
    case 'endTurn':
      return `endTurn p${action.player}`
    case 'promote':
      return `promote p${action.player} bench[${action.benchIndex}]`
  }
}
