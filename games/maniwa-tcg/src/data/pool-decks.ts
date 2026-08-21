/**
 * プールデッキ（SPEC 3.1.1）。カードプール全体から20枚を抽選して組む。
 *
 * 基準デッキ（decks.ts）は固定なので、あとから足したカードは永久に一度も戦わず、
 * 採用率も勝率寄与も出せない。プールが増え続ける前提だと、それでは12章の指標が
 * 前提を失う。こちらはプール全体を抽選対象にして、**カードを足した翌日から
 * 何もしなくても性能が測られる**状態を作る。
 *
 * 抽選は一様。強い順に選ぶと、弱いカードは選ばれず、選ばれないから測れず、
 * 測れないから弱いと分からない循環に入り、死に札の検出ができなくなる（SPEC 3.1.1）。
 *
 * 乱数は Math.random ではなく core の PRNG をシードから回す。決定論リプレイを
 * 壊さないため（CLAUDE.md 3章）。この層は core ではないが、同じ理由で揃えている。
 */
import type { Rng } from '../core/rng.ts'
import { createRng, nextInt } from '../core/rng.ts'
import type { Deck, EnergyType } from '../core/types.ts'
import { CREATURES } from './cards.ts'
import { ACTIONS, ITEMS, ULTIMATES } from './support.ts'

/** 基準デッキと同じ内訳（SPEC 3.1.1） */
const MAIN_COUNT = 8
const NEUTRAL_COUNT = 4
const ITEM_COUNT = 3
const ACTION_COUNT = 3
const ULTIMATE_COPIES = 2

/** 抽選対象になる属性。無は専用枠ではなく共通枠から取るので除く */
export const POOL_TYPES: readonly EnergyType[] = [
  'fire', 'forest', 'wind', 'earth', 'thunder', 'water', 'light', 'dark',
]

const TYPE_NAME: Readonly<Record<EnergyType, string>> = {
  fire: 'ほのお', forest: 'もり', wind: 'かぜ', earth: 'つち', thunder: 'いかずち',
  water: 'みず', light: 'ひかり', dark: 'やみ', colorless: 'む',
}

/**
 * items から count 枚を重複なしで抜く。引いた側の Rng を返す。
 *
 * shuffle して先頭を取る形にはしない。プールが増えるほど無駄が増えるうえ、
 * 「何枚目までを使ったか」が抽選結果に影響して再現時に読みにくくなる。
 */
function sample<T>(rng: Rng, items: readonly T[], count: number): { rng: Rng; picked: readonly T[] } {
  const rest = [...items]
  const picked: T[] = []
  let cur = rng
  const take = Math.min(count, rest.length)
  for (let i = 0; i < take; i += 1) {
    const r = nextInt(cur, rest.length)
    cur = r.rng
    picked.push(rest[r.value] as T)
    rest.splice(r.value, 1)
  }
  return { rng: cur, picked }
}

/**
 * 1つの属性ぶんのプールデッキを組む。
 *
 * 絶技は**対応キャラを必ず同居させる**。対応キャラがいない絶技は死に札で、
 * validateDeck にも弾かれる（SPEC 3.1.1）。そこで先に絶技を決め、
 * 専用キャラ枠の1枚目をその対応キャラで埋めてから、残りを抽選する。
 */
export function buildPoolDeck(type: EnergyType, seed: number): Deck {
  let rng = createRng(seed)

  const mainPool = CREATURES.filter((c) => c.type === type)
  const neutralPool = CREATURES.filter((c) => c.type === 'colorless')
  const ultimatePool = ULTIMATES.filter((u) => mainPool.some((c) => c.id === u.requires))

  // 絶技 → その対応キャラ → 残りの専用キャラ、の順に決める
  const u = sample(rng, ultimatePool, 1)
  rng = u.rng
  const ultimate = u.picked[0]

  const required = ultimate === undefined ? [] : [ultimate.requires]
  const restMain = mainPool.filter((c) => !required.includes(c.id))
  const m = sample(rng, restMain, MAIN_COUNT - required.length)
  rng = m.rng

  const n = sample(rng, neutralPool, NEUTRAL_COUNT)
  rng = n.rng
  const i = sample(rng, ITEMS, ITEM_COUNT)
  rng = i.rng
  const a = sample(rng, ACTIONS, ACTION_COUNT)
  rng = a.rng

  const cards: string[] = [
    ...required,
    ...m.picked.map((c) => c.id),
    ...n.picked.map((c) => c.id),
    ...i.picked.map((c) => c.id),
    ...a.picked.map((c) => c.id),
  ]
  // 絶技が引けない属性（対応キャラが1体もいない）は、専用キャラで埋めて20枚にする
  if (ultimate === undefined) {
    const filler = sample(rng, mainPool.filter((c) => !cards.includes(c.id)), ULTIMATE_COPIES)
    rng = filler.rng
    cards.push(...filler.picked.map((c) => c.id))
  } else {
    for (let k = 0; k < ULTIMATE_COPIES; k += 1) cards.push(ultimate.id)
  }

  return { name: `${TYPE_NAME[type]}(プール)`, cards, energy: [type] }
}

/** 8属性ぶんのプールデッキ。seed を変えると別の抽選結果になる */
export function buildPoolDecks(seed: number): readonly Deck[] {
  return POOL_TYPES.map((type, index) => buildPoolDeck(type, seed + index * 7919))
}
