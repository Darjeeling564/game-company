/**
 * プリセットデッキ。属性ごとに1つ、計8デッキ（SPEC 17.5）。
 *
 * デッキは20枚ちょうど・同名2枚まで（SPEC 3.1）。内訳は次のとおり。
 *
 *   専用キャラ 8種 × 1枚 =  8
 *   無キャラ   4種 × 1枚 =  4
 *   アイテム   3種       =  3
 *   行動       3種       =  3
 *   絶技       1種 × 2枚 =  2
 *
 * 専用キャラを8種すべて1枚ずつ入れることで、64体すべてがどこかのデッキで使われる。
 * 使われないカードがあると採用率が測れない（SPEC 12章）。
 *
 * 絶技は対応するキャラが同じデッキにいないと死に札になるため、その属性の絶技を
 * 2枚積む（SPEC 16.5）。
 */
import type { Deck, EnergyType } from '../core/types.ts'
import {
  COLORLESS_IDS,
  DARK_IDS,
  EARTH_IDS,
  FIRE_IDS,
  FOREST_IDS,
  LIGHT_IDS,
  THUNDER_IDS,
  WATER_IDS,
  WIND_IDS,
} from './cards.ts'

/**
 * 支援カードの配り方。
 *
 * 手で割り当てたところ、風だけがドローと入れ替えばかりの支援になり、回復も打点も
 * 無いデッキになっていた（勝率が他より20pt低い）。役割順に配り直すと今度は逆に
 * 20pt 開いた。支援カードは1枚あたりの効きがキャラより大きく、配り方だけで
 * デッキの地力が決まってしまう。
 *
 * 評価関数で採点して合計点をそろえる方法も試したが、うまく行かなかった。
 * 手で付けた重みは実際の強さを言い当てられず、点数をそろえても勝率は25pt開いた。
 * そこで**実測で選んだ**。組み合わせを多数試し、総当たりの平均勝率がもっともそろう
 * ものを採用している（8デッキのレンジ 10.5pt）。
 *
 * 12種を8デッキ×3枠に配ると各2回ずつ使われる。この表は手で読める形にしてあるが、
 * 意味づけで並んでいるわけではない。カードを足したら測り直して作り直すこと。
 */
const ITEM_SETS: readonly (readonly string[])[] = [
  ['i006', 'i008', 'i012'],
  ['i009', 'i006', 'i004'],
  ['i011', 'i003', 'i001'],
  ['i001', 'i010', 'i009'],
  ['i003', 'i005', 'i010'],
  ['i007', 'i011', 'i002'],
  ['i005', 'i007', 'i008'],
  ['i002', 'i012', 'i004'],
]

const ACTION_SETS: readonly (readonly string[])[] = [
  ['a001', 'a012', 'a002'],
  ['a003', 'a001', 'a007'],
  ['a010', 'a011', 'a008'],
  ['a009', 'a011', 'a006'],
  ['a010', 'a005', 'a008'],
  ['a006', 'a005', 'a012'],
  ['a004', 'a003', 'a007'],
  ['a002', 'a004', 'a009'],
]

interface Recipe {
  readonly name: string
  readonly energy: EnergyType
  /** その属性のキャラ8種。各1枚 */
  readonly main: readonly string[]
  /** 絶技1種。2枚積む */
  readonly ultimate: string
}

/** 無キャラは8種を2つの組に分け、デッキごとに交互に使う */
const NEUTRAL_A = COLORLESS_IDS.slice(0, 4)
const NEUTRAL_B = COLORLESS_IDS.slice(4, 8)

function build(r: Recipe, index: number): Deck {
  return {
    name: r.name,
    cards: [
      // 属性の先頭8種だけを採る。新しいキャラを配列に足したとき、デッキが
      // 黙って21枚になって不正になるのを防ぐ（2026-08-20 の夜間ジョブで踏んだ）
      ...r.main.slice(0, 8),
      ...(index % 2 === 0 ? NEUTRAL_A : NEUTRAL_B),
      ...(ITEM_SETS[index] as readonly string[]),
      ...(ACTION_SETS[index] as readonly string[]),
      r.ultimate,
      r.ultimate,
    ],
    energy: [r.energy],
  }
}

export const FIRE_DECK: Deck = build(
  { name: 'ほのお', energy: 'fire', main: FIRE_IDS, ultimate: 'u001' }, 0)
export const FOREST_DECK: Deck = build(
  { name: 'もり', energy: 'forest', main: FOREST_IDS, ultimate: 'u002' }, 1)
export const WIND_DECK: Deck = build(
  { name: 'かぜ', energy: 'wind', main: WIND_IDS, ultimate: 'u003' }, 2)
export const EARTH_DECK: Deck = build(
  { name: 'つち', energy: 'earth', main: EARTH_IDS, ultimate: 'u004' }, 3)
export const THUNDER_DECK: Deck = build(
  { name: 'いかずち', energy: 'thunder', main: THUNDER_IDS, ultimate: 'u005' }, 4)
export const WATER_DECK: Deck = build(
  { name: 'みず', energy: 'water', main: WATER_IDS, ultimate: 'u006' }, 5)
export const LIGHT_DECK: Deck = build(
  { name: 'ひかり', energy: 'light', main: LIGHT_IDS, ultimate: 'u007' }, 6)
export const DARK_DECK: Deck = build(
  { name: 'やみ', energy: 'dark', main: DARK_IDS, ultimate: 'u008' }, 7)

export const DECKS: readonly Deck[] = [
  FIRE_DECK,
  FOREST_DECK,
  WIND_DECK,
  EARTH_DECK,
  THUNDER_DECK,
  WATER_DECK,
  LIGHT_DECK,
  DARK_DECK,
]

/** 旧名の参照を残すと分かりづらいので、テストが使う別名だけを置く */
export const GRASS_DECK = FOREST_DECK
