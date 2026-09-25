/**
 * 終局保証（CLAUDE.md 5章の必須テスト）。
 *
 * **1万回の自動対戦がすべて規定ターン以内に終了する。**
 * 無限ループを検出するためのもので、ここが落ちたらルールのどこかに
 * 進まない状態がある。
 */
import { describe, expect, it } from 'vitest'
import { EMPTY_STATE, isOver, reduce } from '../src/core/reduce.ts'
import { createRng } from '../src/core/rng.ts'
import { greedyPolicy } from '../tools/ai.ts'
import { FIRE_DECK, WATER_DECK } from '../src/data/decks.ts'
import { MAX_TURNS } from '../src/core/types.ts'

describe('終局保証', () => {
  it('10000戦すべてが MAX_TURNS 以内に決着する', () => {
    let hitLimit = 0
    let unfinished = 0
    for (let seed = 1; seed <= 10000; seed += 1) {
      let state = reduce(EMPTY_STATE, {
        type: 'start', seed, decks: [FIRE_DECK, WATER_DECK], firstPlayer: (seed % 2) as 0 | 1,
      })
      let rng = createRng(seed ^ 0x2468ace)
      let steps = 0
      for (; steps < 6000 && !isOver(state); steps += 1) {
        const c = greedyPolicy(state, rng)
        if (c === null) break
        rng = c.rng
        state = reduce(state, c.action)
      }
      if (!isOver(state)) unfinished += 1
      if (state.endReason === 'turnLimit') hitLimit += 1
    }
    expect(unfinished).toBe(0)
    // ターン上限は安全弁であって、通常の対戦で到達してはならない（SPEC 3.7）
    expect(hitLimit).toBe(0)
    expect(MAX_TURNS).toBeGreaterThan(0)
  }, 60000)
})
