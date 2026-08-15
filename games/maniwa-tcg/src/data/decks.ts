/**
 * プリセットデッキ。
 *
 * デッキは20枚ちょうど・同名2枚まで（SPEC 3.1）。この制約から1デッキには
 * 最低10種が必要になるため、専用6種 + 共通4種をそれぞれ2枚ずつ入れて20枚にする。
 */
import type { Deck } from '../core/types.ts'
import { COLORLESS_IDS, FIRE_IDS, GRASS_IDS } from './cards.ts'

function twoOfEach(ids: readonly string[]): readonly string[] {
  return ids.flatMap((id) => [id, id])
}

export const FIRE_DECK: Deck = {
  name: 'ほのお',
  cards: [...twoOfEach(FIRE_IDS), ...twoOfEach(COLORLESS_IDS)],
  energy: ['fire'],
}

export const GRASS_DECK: Deck = {
  name: 'くさ',
  cards: [...twoOfEach(GRASS_IDS), ...twoOfEach(COLORLESS_IDS)],
  energy: ['grass'],
}

export const DECKS: readonly Deck[] = [FIRE_DECK, GRASS_DECK]
