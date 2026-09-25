/**
 * reduce が受け取る操作（SPEC 5章）。
 *
 * 画面もCPUも、この型を通してしかゲームを動かせない。
 * legalActions が返した以外の Action を渡しても、reduce は状態を変えずに
 * log へ rejected を積むだけである（SPEC 4章）。
 */
import type { CardId, Deck, InstanceId, PlayerId, Position } from './types.ts'

export type Action =
  | {
      readonly type: 'start'
      readonly seed: number
      readonly decks: readonly [Deck, Deck]
      readonly firstPlayer: PlayerId
    }
  /** ドローフェイズ。先攻1ターン目は引かずにメインへ進む */
  | { readonly type: 'draw' }
  | {
      readonly type: 'normalSummon'
      readonly handIndex: number
      readonly zone: number
      readonly position: Position
      readonly tributes: readonly InstanceId[]
    }
  /** 裏側守備表示で置く。通常召喚1回を消費する */
  | {
      readonly type: 'setMonster'
      readonly handIndex: number
      readonly zone: number
      readonly tributes: readonly InstanceId[]
    }
  | { readonly type: 'changePosition'; readonly instanceId: InstanceId }
  | {
      readonly type: 'activateSpell'
      readonly handIndex: number
      readonly target: InstanceId | null
    }
  | { readonly type: 'setSpell'; readonly handIndex: number; readonly zone: number }
  | { readonly type: 'toBattle' }
  | {
      readonly type: 'declareAttack'
      readonly attacker: InstanceId
      /** null はダイレクトアタック */
      readonly target: InstanceId | null
    }
  /** 割り込み。相手のバトルフェイズ・攻撃宣言時にだけ出せる（SPEC 11章） */
  | { readonly type: 'activateTrap'; readonly zone: number }
  /** 割り込みを行わない */
  | { readonly type: 'passResponse' }
  | { readonly type: 'endTurn' }
  /** エンドフェイズの手札上限処理 */
  | { readonly type: 'discardToLimit'; readonly handIndex: number }

/** log に残す短い説明。テストの読みやすさのためにも一元化する */
export function describeAction(action: Action): string {
  switch (action.type) {
    case 'start':
      return `開始 seed=${action.seed} 先攻=${action.firstPlayer}`
    case 'draw':
      return 'ドロー'
    case 'normalSummon':
      return `通常召喚 手札${action.handIndex} → ゾーン${action.zone} ${action.position}` +
        (action.tributes.length > 0 ? ` リリース${action.tributes.length}体` : '')
    case 'setMonster':
      return `セット 手札${action.handIndex} → ゾーン${action.zone}` +
        (action.tributes.length > 0 ? ` リリース${action.tributes.length}体` : '')
    case 'changePosition':
      return `表示形式の変更 #${action.instanceId}`
    case 'activateSpell':
      return `魔法の発動 手札${action.handIndex}`
    case 'setSpell':
      return `伏せる 手札${action.handIndex} → ゾーン${action.zone}`
    case 'toBattle':
      return 'バトルフェイズへ'
    case 'declareAttack':
      return action.target === null
        ? `ダイレクトアタック #${action.attacker}`
        : `攻撃宣言 #${action.attacker} → #${action.target}`
    case 'activateTrap':
      return `罠の発動 ゾーン${action.zone}`
    case 'passResponse':
      return '割り込まない'
    case 'endTurn':
      return 'ターン終了'
    case 'discardToLimit':
      return `手札上限で捨てる 手札${action.handIndex}`
  }
}

/** デッキ構築の検査（SPEC 3.1）。問題が無ければ null */
export function validateDeck(
  deck: Deck,
  size: number,
  maxSameName: number,
  nameOf: (id: CardId) => string | null,
): string | null {
  if (deck.cards.length !== size) return `デッキは${size}枚ちょうど（${deck.cards.length}枚）`
  const count = new Map<string, number>()
  for (const id of deck.cards) {
    const name = nameOf(id)
    if (name === null) return `未知のカード ${id}`
    const n = (count.get(name) ?? 0) + 1
    if (n > maxSameName) return `同名は${maxSameName}枚まで（${name}）`
    count.set(name, n)
  }
  return null
}
