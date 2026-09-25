/**
 * カード定義の参照表。
 *
 * GameState はカードIDしか持たず、定義はここから引く（SPEC 4章）。
 * 状態にカード定義を埋め込まないことで、状態の比較とハッシュが軽くなり、
 * 決定論リプレイのテストが書きやすくなる。
 */
import type { CardDef, CardId, CardIndex, MonsterDef, SpellDef, TrapDef } from '../core/types.ts'
import { MONSTERS } from './monsters.ts'
import { SPELLS } from './spells.ts'
import { TRAPS } from './traps.ts'

export const ALL_CARDS: readonly CardDef[] = [...MONSTERS, ...SPELLS, ...TRAPS]

export const CARD_INDEX: CardIndex = new Map(ALL_CARDS.map((c) => [c.id, c]))

export function findCard(id: CardId): CardDef | null {
  return CARD_INDEX.get(id) ?? null
}

/**
 * モンスターとして引く。見つからないか種別が違えば null。
 *
 * **例外を投げない。** reduce は不正な入力でも状態を壊さず log に積むだけという
 * 約束（SPEC 4章）なので、引けなかったことを呼び出し側が扱えるようにする。
 */
export function findMonster(id: CardId): MonsterDef | null {
  const c = CARD_INDEX.get(id)
  return c !== undefined && c.kind === 'monster' ? c : null
}

export function findSpell(id: CardId): SpellDef | null {
  const c = CARD_INDEX.get(id)
  return c !== undefined && c.kind === 'spell' ? c : null
}

export function findTrap(id: CardId): TrapDef | null {
  const c = CARD_INDEX.get(id)
  return c !== undefined && c.kind === 'trap' ? c : null
}

/** 属性ごとの姫神のIDを、定義順に並べて返す */
export function monsterIdsOf(attribute: MonsterDef['attribute']): readonly CardId[] {
  return MONSTERS.filter((m) => m.attribute === attribute).map((m) => m.id)
}
