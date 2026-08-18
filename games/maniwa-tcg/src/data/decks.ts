/**
 * プリセットデッキ。
 *
 * デッキは20枚ちょうど・同名2枚まで（SPEC 3.1）。種別ごとの内訳は次のとおり。
 *
 *   専用キャラ 6種 × 2枚 = 12
 *   無色キャラ 2種 × 1枚 =  2
 *   アイテム / 行動 / 絶技      =  6
 *
 * 属性ごとに2デッキ用意し、プールのすべてのカードがどこかのデッキで使われる形に
 * している。使われないカードがあると、シミュレーションで採用率が測れない（SPEC 12章）。
 *
 * 絶技は対応するキャラが同じデッキにいないと死に札になるため、キャラの振り分けに
 * 合わせて置く（SPEC 16.5）。草はキャラに紐づく絶技が1種しか無いので、
 * 「くさ・叢雲」には絶技を入れず、そのぶんアイテムと行動を厚くしている。
 */
import type { Deck } from '../core/types.ts'

function twoOfEach(ids: readonly string[]): readonly string[] {
  return ids.flatMap((id) => [id, id])
}

interface Recipe {
  readonly name: string
  readonly energy: Deck['energy']
  /** 専用キャラ6種。各2枚 */
  readonly main: readonly string[]
  /** 無色キャラ・アイテム・行動・絶技。各1枚 */
  readonly singles: readonly string[]
}

function build(recipe: Recipe): Deck {
  return {
    name: recipe.name,
    cards: [...twoOfEach(recipe.main), ...recipe.singles],
    energy: recipe.energy,
  }
}

export const FIRE_DECK: Deck = build({
  name: 'ほのお・日輪',
  energy: ['fire'],
  main: ['f001', 'f002', 'f004', 'f006', 'f009', 'f011'],
  singles: ['n001', 'n002', 'i001', 'i007', 'a002', 'a006', 'u001', 'u004'],
})

export const FIRE_DECK_B: Deck = build({
  name: 'ほのお・業火',
  energy: ['fire'],
  main: ['f003', 'f005', 'f007', 'f008', 'f010', 'f012'],
  singles: ['n003', 'n004', 'i004', 'i009', 'a009', 'a012', 'u005', 'u006'],
})

export const GRASS_DECK: Deck = build({
  name: 'くさ・世界樹',
  energy: ['grass'],
  main: ['g001', 'g003', 'g005', 'g006', 'g008', 'g010'],
  singles: ['n001', 'n004', 'i003', 'i012', 'a004', 'a005', 'u002', 'u002'],
})

export const GRASS_DECK_B: Deck = build({
  name: 'くさ・叢雲',
  energy: ['grass'],
  main: ['g002', 'g004', 'g007', 'g009', 'g011', 'g012'],
  singles: ['n002', 'n003', 'i005', 'i008', 'i012', 'a001', 'a008', 'a011'],
})

export const WATER_DECK: Deck = build({
  name: 'みず・大海',
  energy: ['water'],
  main: ['w001', 'w002', 'w005', 'w007', 'w010', 'w011'],
  singles: ['n001', 'n003', 'i002', 'i011', 'a001', 'a007', 'u003', 'u007'],
})

export const WATER_DECK_B: Deck = build({
  name: 'みず・世界蛇',
  energy: ['water'],
  main: ['w003', 'w004', 'w006', 'w008', 'w009', 'w012'],
  singles: ['n002', 'n004', 'i006', 'i010', 'a003', 'a010', 'u008', 'u008'],
})

export const DECKS: readonly Deck[] = [
  FIRE_DECK,
  FIRE_DECK_B,
  GRASS_DECK,
  GRASS_DECK_B,
  WATER_DECK,
  WATER_DECK_B,
]
