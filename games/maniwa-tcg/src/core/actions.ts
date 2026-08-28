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
  /**
   * レアリティ召喚（SPEC 3.3.1）: レア以上は場の姫神をリリースして出す。
   * release はリリース対象のインスタンスID。コモンは null。
   */
  | { readonly type: 'playCreature'; readonly player: PlayerId; readonly handIndex: number;
      readonly release: InstanceId | null }
  | { readonly type: 'attachEnergy'; readonly player: PlayerId; readonly target: InstanceId }
  | { readonly type: 'retreat'; readonly player: PlayerId; readonly benchIndex: number }
  | { readonly type: 'attack'; readonly player: PlayerId; readonly attackIndex: number }
  /** アイテム。1ターンに何枚でも（SPEC 16.8 Q10） */
  | { readonly type: 'playItem'; readonly player: PlayerId; readonly handIndex: number }
  /** 行動。1ターンに1枚だけ（Q9） */
  | { readonly type: 'playAction'; readonly player: PlayerId; readonly handIndex: number }
  /** 絶技。バトル場の対応キャラ＋エネルギーが要る。撃つとターンが終わる（Q7・Q8） */
  | { readonly type: 'useUltimate'; readonly player: PlayerId; readonly handIndex: number }
  | { readonly type: 'endTurn'; readonly player: PlayerId }
  // --- きぜつ後 ---
  | { readonly type: 'promote'; readonly player: PlayerId; readonly benchIndex: number }

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
      return `playCreature p${action.player} hand[${action.handIndex}]${action.release === null ? '' : ` release#${action.release}`}`
    case 'attachEnergy':
      return `attachEnergy p${action.player} -> #${action.target}`
    case 'retreat':
      return `retreat p${action.player} bench[${action.benchIndex}]`
    case 'attack':
      return `attack p${action.player} attack[${action.attackIndex}]`
    case 'playItem':
      return `playItem p${action.player} hand[${action.handIndex}]`
    case 'playAction':
      return `playAction p${action.player} hand[${action.handIndex}]`
    case 'useUltimate':
      return `useUltimate p${action.player} hand[${action.handIndex}]`
    case 'endTurn':
      return `endTurn p${action.player}`
    case 'promote':
      return `promote p${action.player} bench[${action.benchIndex}]`
  }
}
