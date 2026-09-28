/**
 * 対戦相手のデッキ生成（SPEC 8.4）。
 *
 * **87体すべてで検査する。** 1体だけ通しても意味が無く、
 * 属性の薄いところで崩れるのがこの手の生成の常だからである。
 */
import { describe, expect, it } from 'vitest'
import { buildDeck, MONSTER_SLOTS, SPELL_SLOTS, TRAP_SLOTS } from '../src/data/autodeck.ts'
import { validateDeck } from '../src/core/actions.ts'
import { findCard } from '../src/data/cards.ts'
import { MONSTERS } from '../src/data/monsters.ts'
import { DECK_SIZE, MAX_SAME_NAME } from '../src/core/types.ts'
import type { SpellDef } from '../src/core/types.ts'

const nameOf = (id: string): string | null => findCard(id)?.name ?? null

describe('buildDeck', () => {
  it('内訳の合計がデッキの枚数と一致する', () => {
    expect(MONSTER_SLOTS + SPELL_SLOTS + TRAP_SLOTS).toBe(DECK_SIZE)
  })

  it('87体すべてで、core の validateDeck を通るデッキになる', () => {
    const bad: string[] = []
    for (const leader of MONSTERS) {
      const deck = buildDeck(leader.id)
      if (deck === null) { bad.push(`${leader.id} ${leader.name}: 組めなかった`); continue }
      const err = validateDeck(deck, DECK_SIZE, MAX_SAME_NAME, nameOf)
      if (err !== null) bad.push(`${leader.id} ${leader.name}: ${err}`)
    }
    expect(bad).toEqual([])
  })

  it('87体すべてで、主が自分のデッキに入っている', () => {
    const bad = MONSTERS
      .filter((m) => !(buildDeck(m.id)?.cards.includes(m.id) ?? false))
      .map((m) => `${m.id} ${m.name}`)
    expect(bad).toEqual([])
  })

  it('87体すべてで、内訳が 姫神11 / 魔法5 / 罠4 になる', () => {
    const bad: string[] = []
    for (const leader of MONSTERS) {
      const deck = buildDeck(leader.id)
      if (deck === null) { bad.push(`${leader.id}: null`); continue }
      const kinds = deck.cards.map((id) => findCard(id)?.kind)
      const n = (k: string): number => kinds.filter((x) => x === k).length
      if (n('monster') !== MONSTER_SLOTS || n('spell') !== SPELL_SLOTS || n('trap') !== TRAP_SLOTS) {
        bad.push(`${leader.id} ${leader.name}: 姫神${n('monster')} 魔法${n('spell')} 罠${n('trap')}`)
      }
    }
    expect(bad).toEqual([])
  })

  it('requires を満たさない絶技を入れない（死に札を作らない）', () => {
    const bad: string[] = []
    for (const leader of MONSTERS) {
      const deck = buildDeck(leader.id)
      if (deck === null) continue
      const held = new Set(deck.cards)
      for (const id of deck.cards) {
        const def = findCard(id)
        if (def?.kind !== 'spell') continue
        const spell = def as SpellDef
        if (spell.requires !== undefined && !held.has(spell.requires)) {
          bad.push(`${leader.id} ${leader.name}: ${spell.id} ${spell.name} が要る ${spell.requires} が居ない`)
        }
      }
    }
    expect(bad).toEqual([])
  })

  it('決定論である。同じ主なら何度組んでも同じ並びになる', () => {
    for (const leader of MONSTERS) {
      expect(buildDeck(leader.id)?.cards).toEqual(buildDeck(leader.id)?.cards)
    }
  })

  it('姫神でないIDを渡したら null を返す', () => {
    expect(buildDeck('u001')).toBeNull()
    expect(buildDeck('a003')).toBeNull()
    expect(buildDeck('存在しない')).toBeNull()
  })
})
