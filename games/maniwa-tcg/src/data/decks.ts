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
 * そこで**実測で選んだ**。
 *
 * 現在の配分は、直前の配分を起点に「2デッキ間でカードを1枚交換する」山登りで求めた。
 * ランダム生成は45回試して1つも改善が出なかったのに対し、局所探索は40回で
 * レンジを 14.1pt から 4.2pt まで縮めた（2026-08-21）。
 *
 * **目的関数は複数シードの平均にすること。** 単一シードで山登りすると、そのシードに
 * だけ都合の良い配分を掴む。実際、単一シードで 4.0pt まで縮めた案は、4シード平均では
 * 5.9pt → 6.2pt と悪化した（2026-08-22）。3シード平均を目的関数にして25回まわしても
 * 改善は0回で、この配分は局所最適だと確認している。
 *
 * 4シード平均で 12.4pt → 6.2pt。カードを足したら測り直して作り直すこと。
 *
 * 当初は12種を8デッキ×3枠に配って各2回ずつ使う形だった。この表は手で読める形に
 * してあるが、意味づけで並んでいるわけではない。カードを足したら測り直して作り直すこと。
 *
 * 2026-08-30: つちの i010 双面の鏡 を i014 真理の羽根 に替えた（承認済み）。
 * つちは入れ替え札を2枚（i010 と a003 交代の号令）持っていて重複しており、
 * 片方を妨害＋ドローに替えると **4シード平均で 23.87pt → 16.71pt** に縮む。
 * 探索に使っていない3シードでも再現し、先手勝率と平均ターン数は動かない。
 */
const ITEM_SETS: readonly (readonly string[])[] = [
  ['i009', 'i008', 'i007'],
  ['i009', 'i006', 'i004'],
  ['i011', 'i003', 'i001'],
  ['i001', 'i014', 'i005'],
  ['i003', 'i007', 'i010'],
  ['i006', 'i011', 'i002'],
  ['i005', 'i012', 'i008'],
  ['i002', 'i012', 'i004'],
]

const ACTION_SETS: readonly (readonly string[])[] = [
  ['a001', 'a012', 'a002'],
  ['a003', 'a001', 'a007'],
  ['a010', 'a011', 'a005'],
  ['a009', 'a008', 'a006'],
  ['a010', 'a008', 'a011'],
  ['a006', 'a009', 'a012'],
  ['a004', 'a003', 'a007'],
  ['a002', 'a004', 'a005'],
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

/**
 * 基準デッキの専用キャラ枠。**プールが増えても20枚の内訳は変えない。**
 *
 * `r.main` は属性の全カード（FIRE_IDS など）なので、属性に9体目を足すと
 * そのまま9枚入り、デッキが21枚になってデッキ不正で全試合が開始できなくなる。
 * しかも validateDeck に弾かれた状態は「カード総数が 0」と表示され、
 * 21枚が原因だと読み取れない（2026-08-20 に実際に踏んだ）。
 */
const MAIN_PER_DECK = 8

function build(r: Recipe, index: number): Deck {
  return {
    name: r.name,
    cards: [
      ...r.main.slice(0, MAIN_PER_DECK),
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
