/**
 * 決定論リプレイ（CLAUDE.md 5章の必須テスト）。
 *
 * **同一シード＋同一入力列 → 最終状態のハッシュが完全一致。**
 * core が純粋であることの実地の証明で、これが崩れると
 * シミュレーションの数値もリプレイも意味を失う。
 */
import { describe, expect, it } from 'vitest'
import { EMPTY_STATE, isOver, reduce } from '../src/core/reduce.ts'
import { createRng } from '../src/core/rng.ts'
import { greedyPolicy } from '../tools/ai.ts'
import { FIRE_DECK, WATER_DECK } from '../src/data/decks.ts'
import type { GameState } from '../src/core/types.ts'

/** 状態を文字列にして比べる。log も含めるので、途中経過の違いも拾う */
function hash(state: GameState): string {
  return JSON.stringify({
    turn: state.turn, phase: state.phase, winner: state.winner, reason: state.endReason,
    players: state.players.map((p) => ({
      lp: p.lp, deck: p.deck, hand: p.hand, graveyard: p.graveyard,
      monsters: p.monsters, spells: p.spells,
    })),
    rng: state.rng, log: state.log,
  })
}

function playOut(seed: number): GameState {
  let state = reduce(EMPTY_STATE, {
    type: 'start', seed, decks: [FIRE_DECK, WATER_DECK], firstPlayer: 0,
  })
  let rng = createRng(seed ^ 0x5bf03635)
  for (let i = 0; i < 6000 && !isOver(state); i += 1) {
    const c = greedyPolicy(state, rng)
    if (c === null) break
    rng = c.rng
    state = reduce(state, c.action)
  }
  return state
}

describe('決定論リプレイ', () => {
  it('同一シードなら最終状態が完全一致する', () => {
    for (const seed of [1, 42, 20260925, 999983]) {
      expect(hash(playOut(seed))).toBe(hash(playOut(seed)))
    }
  })

  it('違うシードなら違う対局になる', () => {
    expect(hash(playOut(1))).not.toBe(hash(playOut(2)))
  })

  it('reduce は引数の状態を書き換えない', () => {
    const s = reduce(EMPTY_STATE, {
      type: 'start', seed: 7, decks: [FIRE_DECK, WATER_DECK], firstPlayer: 0,
    })
    const before = hash(s)
    reduce(s, { type: 'draw' })
    reduce(s, { type: 'endTurn' })
    reduce(s, { type: 'normalSummon', handIndex: 0, zone: 0, position: 'attack', tributes: [] })
    expect(hash(s)).toBe(before)
  })
})
