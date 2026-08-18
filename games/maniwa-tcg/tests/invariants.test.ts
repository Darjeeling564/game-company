/**
 * ルール不変条件（CLAUDE.md 5章の必須テスト）。
 * 全ステップで、手札枚数・リソース・HP等が負値や NaN にならないことを確認する。
 *
 * ステップごとに expect を呼ぶと1万ステップ規模で極端に遅くなるため、
 * 違反を文字列として収集し、対戦ごとに1回だけ検証する。
 */
import { describe, expect, it } from 'vitest'
import type { Action } from '../src/core/actions.ts'
import { EMPTY_STATE, isOver, legalActions, reduce } from '../src/core/reduce.ts'
import { createRng, pick } from '../src/core/rng.ts'
import { allCreatures } from '../src/core/state.ts'
import type { Deck, GameState, PlayerId } from '../src/core/types.ts'
import { BENCH_SIZE, DECK_SIZE } from '../src/core/types.ts'
import { DECKS, FIRE_DECK, GRASS_DECK } from '../src/data/decks.ts'

function violations(state: GameState, label: string): readonly string[] {
  const found: string[] = []
  const bad = (condition: boolean, message: string) => {
    if (condition) found.push(`${label}: ${message}`)
  }
  const number = (n: number, what: string) => {
    bad(!Number.isFinite(n) || Number.isNaN(n), `${what} が数値として不正 (${n})`)
  }

  number(state.turn, 'turn')
  bad(state.turn < 0, 'turn が負')

  for (const id of [0, 1] as const) {
    const p = state.players[id]

    number(p.points, `p${id}.points`)
    bad(p.points < 0, `p${id}.points が負`)
    bad(p.hand.length < 0, `p${id}.hand が負`)
    bad(p.deck.length < 0, `p${id}.deck が負`)
    bad(p.bench.length > BENCH_SIZE, `p${id}.bench が上限超過 (${p.bench.length})`)

    for (const c of allCreatures(p)) {
      number(c.damage, `p${id} #${c.instanceId}.damage`)
      bad(c.damage < 0, `p${id} #${c.instanceId}.damage が負`)
      bad(c.attached.length < 0, `p${id} #${c.instanceId}.attached が負`)
      bad(new Set(c.status).size !== c.status.length, `p${id} #${c.instanceId}.status が重複`)
    }

    // カードの総数は常に20枚（山札 + 手札 + トラッシュ + 場）
    const total = p.deck.length + p.hand.length + p.discard.length + allCreatures(p).length
    bad(total !== DECK_SIZE, `p${id} のカード総数が ${total}（${DECK_SIZE}のはず）`)
  }

  if (state.phase.kind === 'ended') {
    bad(state.endReason === null, '終了に理由が無い')
  } else {
    bad(state.winner !== null, '未終了なのに勝者がいる')
  }

  return found
}

function playRandom(seed: number, decks: readonly [Deck, Deck]): readonly string[] {
  let state = reduce(EMPTY_STATE, {
    type: 'start', seed, decks, firstPlayer: (seed % 2) as PlayerId,
  })
  const found: string[] = [...violations(state, `seed=${seed} step=0`)]

  let chooser = createRng(seed ^ 0x2545f491)
  for (let step = 0; step < 4000 && !isOver(state); step += 1) {
    const legal = legalActions(state)
    if (legal.length === 0) break
    const chosen = pick(chooser, legal)
    chooser = chosen.rng
    state = reduce(state, chosen.item as Action)
    found.push(...violations(state, `seed=${seed} step=${step + 1}`))
    if (found.length > 0) break
  }
  return found
}

describe('ルール不変条件', () => {
  it('ミラーマッチ100回の全ステップで不変条件が保たれる', () => {
    const found: string[] = []
    for (let seed = 1; seed <= 100; seed += 1) found.push(...playRandom(seed, [FIRE_DECK, FIRE_DECK]))
    expect(found.slice(0, 5)).toEqual([])
  })

  it('異なるデッキどうしでも保たれる', () => {
    const found: string[] = []
    for (let seed = 1; seed <= 100; seed += 1) found.push(...playRandom(seed, [FIRE_DECK, GRASS_DECK]))
    expect(found.slice(0, 5)).toEqual([])
  })

  it('全デッキの総当たりでも保たれる（アイテム・行動・絶技を含む）', () => {
    const found: string[] = []
    let seed = 1
    for (const a of DECKS) {
      for (const b of DECKS) {
        found.push(...playRandom(seed, [a, b]))
        seed += 1
      }
    }
    expect(found.slice(0, 5)).toEqual([])
  })

  it('拒否された Action は状態を変えない', () => {
    let state = reduce(EMPTY_STATE, {
      type: 'start', seed: 5, decks: [FIRE_DECK, GRASS_DECK], firstPlayer: 0,
    })
    const before = JSON.stringify({ ...state, log: [] })
    state = reduce(state, { type: 'attack', player: 0, attackIndex: 0 })
    expect(JSON.stringify({ ...state, log: [] })).toBe(before)
    expect(state.log.at(-1)?.kind).toBe('rejected')
  })
})
