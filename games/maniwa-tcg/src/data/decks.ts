/**
 * プリセットデッキ。
 *
 * デッキは20枚ちょうど・同名2枚まで（SPEC 3.1）。
 * 専用12種を1枚ずつ + 共通の無色4種を2枚ずつで20枚とし、
 * プールのすべてのカードがいずれかのデッキで使われる形にしている。
 */
import type { Deck } from '../core/types.ts'
import { COLORLESS_IDS, FIRE_IDS, GRASS_IDS, WATER_IDS } from './cards.ts'

function twoOfEach(ids: readonly string[]): readonly string[] {
  return ids.flatMap((id) => [id, id])
}

function buildDeck(name: string, energy: Deck['energy'], mainIds: readonly string[]): Deck {
  return { name, cards: [...mainIds, ...twoOfEach(COLORLESS_IDS)], energy }
}

export const FIRE_DECK: Deck = buildDeck('ほのお', ['fire'], FIRE_IDS)
export const GRASS_DECK: Deck = buildDeck('くさ', ['grass'], GRASS_IDS)
export const WATER_DECK: Deck = buildDeck('みず', ['water'], WATER_IDS)

export const DECKS: readonly Deck[] = [FIRE_DECK, GRASS_DECK, WATER_DECK]
