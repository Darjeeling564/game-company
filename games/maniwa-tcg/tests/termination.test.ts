/**
 * 終局保証（CLAUDE.md 5章の必須テスト）。無限ループの検出が目的。
 *
 * 2つの水準で確認する。
 *  - ランダムAI: 1万回すべてが有限ステップで終了する（ターン上限での打ち切りを含む）
 *  - 貪欲AI  : 1万回すべてが MAX_TURNS 未満で決着する（打ち切り率0%）
 *
 * ランダムAIは無意味な手を選び続けるためターン上限に届くことがある。これは
 * 無限ループではないので、上限到達を許さない基準は貪欲AI側に課している。
 */
import { describe, expect, it } from 'vitest'
import { EMPTY_STATE, isOver, reduce } from '../src/core/reduce.ts'
import { createRng } from '../src/core/rng.ts'
import type { Deck, GameState, PlayerId } from '../src/core/types.ts'
import { MAX_TURNS } from '../src/core/types.ts'
import { DECKS, FIRE_DECK, GRASS_DECK } from '../src/data/decks.ts'
import type { Policy } from '../tools/ai.ts'
import { greedyPolicy, randomPolicy } from '../tools/ai.ts'

const GAMES = 10000
const STEP_LIMIT = 20000

interface Outcome {
  readonly finished: boolean
  readonly steps: number
  readonly state: GameState
}

function play(seed: number, decks: readonly [Deck, Deck], policy: Policy): Outcome {
  let state = reduce(EMPTY_STATE, {
    type: 'start', seed, decks, firstPlayer: (seed % 2) as PlayerId,
  })
  let rng = createRng(seed ^ 0x9e3779b9)
  let steps = 0

  while (steps < STEP_LIMIT && !isOver(state)) {
    const chosen = policy(state, rng)
    if (chosen === null) break
    rng = chosen.rng
    state = reduce(state, chosen.action)
    steps += 1
  }
  return { finished: isOver(state), steps, state }
}

describe('終局保証', () => {
  it('ランダムAIの1万回がすべて有限ステップで終了する', () => {
    const stuck: string[] = []
    let maxSteps = 0
    for (let seed = 1; seed <= GAMES; seed += 1) {
      const outcome = play(seed, [FIRE_DECK, GRASS_DECK], randomPolicy)
      maxSteps = Math.max(maxSteps, outcome.steps)
      if (!outcome.finished) stuck.push(`seed=${seed} steps=${outcome.steps} turn=${outcome.state.turn}`)
      if (stuck.length >= 3) break
    }
    expect(stuck).toEqual([])
    expect(maxSteps).toBeLessThan(STEP_LIMIT)
  }, 120000)

  it('貪欲AIの1万回がすべてターン上限に達せず決着する', () => {
    const overrun: string[] = []
    let maxTurn = 0
    for (let seed = 1; seed <= GAMES; seed += 1) {
      const outcome = play(seed, [FIRE_DECK, GRASS_DECK], greedyPolicy)
      maxTurn = Math.max(maxTurn, outcome.state.turn)
      if (!outcome.finished || outcome.state.endReason === 'turnLimit') {
        overrun.push(`seed=${seed} turn=${outcome.state.turn} reason=${outcome.state.endReason}`)
      }
      if (overrun.length >= 3) break
    }
    expect(overrun).toEqual([])
    expect(maxTurn).toBeLessThan(MAX_TURNS)
  }, 120000)

  it('ミラーマッチでも決着する', () => {
    const overrun: string[] = []
    for (let seed = 1; seed <= 2000; seed += 1) {
      const outcome = play(seed, [FIRE_DECK, FIRE_DECK], greedyPolicy)
      if (outcome.state.endReason === 'turnLimit') overrun.push(`seed=${seed}`)
      if (overrun.length >= 3) break
    }
    expect(overrun).toEqual([])
  }, 60000)
})

describe('全デッキの終局保証', () => {
  it('6デッキの総当たりが規定ターン以内に終わる', () => {
    const overruns: string[] = []
    let seed = 1
    for (const a of DECKS) {
      for (const b of DECKS) {
        for (let i = 0; i < 40; i += 1) {
          const outcome = play(seed, [a, b], greedyPolicy)
          if (!outcome.finished) overruns.push(`${a.name} vs ${b.name} seed=${seed}`)
          seed += 1
        }
      }
    }
    expect(overruns.slice(0, 5)).toEqual([])
  })
})
