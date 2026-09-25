/**
 * ルール不変条件（CLAUDE.md 5章の必須テスト）。
 *
 * **ライフ・手札・デッキ・ゾーンが負値や NaN にならない。**
 * 自動対戦を回しながら毎手ごとに確かめる。
 */
import { describe, expect, it } from 'vitest'
import { EMPTY_STATE, isOver, reduce } from '../src/core/reduce.ts'
import { createRng } from '../src/core/rng.ts'
import { greedyPolicy } from '../tools/ai.ts'
import { FIRE_DECK, WATER_DECK } from '../src/data/decks.ts'
import { DECK_SIZE, MONSTER_ZONES, SPELL_ZONES } from '../src/core/types.ts'
import type { GameState } from '../src/core/types.ts'

function check(state: GameState): void {
  for (const p of state.players) {
    expect(Number.isFinite(p.lp)).toBe(true)
    expect(Number.isInteger(p.lp)).toBe(true)
    expect(p.hand.length).toBeGreaterThanOrEqual(0)
    expect(p.deck.length).toBeGreaterThanOrEqual(0)
    // ゾーンの長さは常に一定。null で埋める設計なので減ってはならない
    expect(p.monsters.length).toBe(MONSTER_ZONES)
    expect(p.spells.length).toBe(SPELL_ZONES)
    // カードの総数は増えない（20枚から始まって、どこかに必ずある）
    const onField = p.monsters.filter((m) => m !== null).length + p.spells.filter((s) => s !== null).length
    const total = p.deck.length + p.hand.length + p.graveyard.length + onField
    expect(total).toBeLessThanOrEqual(DECK_SIZE)
  }
  expect(Number.isInteger(state.turn)).toBe(true)
  expect(state.turn).toBeGreaterThanOrEqual(0)
  // 割り込み中でなければ priority は手番と同じ
  if (state.pendingAttack === null && state.phase !== 'over') {
    expect(state.priority).toBe(state.turnPlayer)
  }
}

describe('ルール不変条件', () => {
  it('200戦のあいだ、毎手すべて満たす', () => {
    for (let seed = 1; seed <= 200; seed += 1) {
      let state = reduce(EMPTY_STATE, {
        type: 'start', seed, decks: [FIRE_DECK, WATER_DECK], firstPlayer: (seed % 2) as 0 | 1,
      })
      let rng = createRng(seed ^ 0x1234567)
      check(state)
      for (let i = 0; i < 6000 && !isOver(state); i += 1) {
        const c = greedyPolicy(state, rng)
        if (c === null) break
        rng = c.rng
        state = reduce(state, c.action)
        check(state)
      }
    }
  })

  it('カードは消えない（20枚がどこかに必ずある）', () => {
    let state = reduce(EMPTY_STATE, {
      type: 'start', seed: 31337, decks: [FIRE_DECK, WATER_DECK], firstPlayer: 0,
    })
    let rng = createRng(1)
    for (let i = 0; i < 6000 && !isOver(state); i += 1) {
      const c = greedyPolicy(state, rng)
      if (c === null) break
      rng = c.rng
      state = reduce(state, c.action)
    }
    for (const p of state.players) {
      const onField = p.monsters.filter((m) => m !== null).length + p.spells.filter((s) => s !== null).length
      expect(p.deck.length + p.hand.length + p.graveyard.length + onField).toBe(DECK_SIZE)
    }
  })
})
