/**
 * 決定論リプレイ（CLAUDE.md 5章の必須テスト）。
 * 同一シード + 同一入力列 → 途中の全ステップと最終状態のハッシュが完全一致する。
 */
import { describe, expect, it } from 'vitest'
import type { Action } from '../src/core/actions.ts'
import { EMPTY_STATE, hashState, isOver, legalActions, reduce } from '../src/core/reduce.ts'
import { createRng, pick } from '../src/core/rng.ts'
import type { GameState } from '../src/core/types.ts'
import { FIRE_DECK, GRASS_DECK } from '../src/data/decks.ts'

const MAX_STEPS = 5000

function start(seed: number): GameState {
  return reduce(EMPTY_STATE, {
    type: 'start',
    seed,
    decks: [FIRE_DECK, GRASS_DECK],
    firstPlayer: 0,
  })
}

/** 合法手からランダムに選び続ける。選択そのものもシードから決まる */
function playRandom(seed: number): {
  readonly hashes: readonly string[]
  readonly actions: readonly Action[]
  readonly state: GameState
} {
  let state = start(seed)
  const hashes: string[] = [hashState(state)]
  const actions: Action[] = []
  let chooser = createRng(seed ^ 0x5bf03635)

  for (let step = 0; step < MAX_STEPS && !isOver(state); step += 1) {
    const legal = legalActions(state)
    if (legal.length === 0) break
    const chosen = pick(chooser, legal)
    chooser = chosen.rng
    const action = chosen.item as Action
    actions.push(action)
    state = reduce(state, action)
    hashes.push(hashState(state))
  }
  return { hashes, actions, state }
}

/** 記録した入力列をそのまま流し直す */
function replay(seed: number, actions: readonly Action[]): readonly string[] {
  let state = start(seed)
  const hashes: string[] = [hashState(state)]
  for (const action of actions) {
    state = reduce(state, action)
    hashes.push(hashState(state))
  }
  return hashes
}

describe('決定論リプレイ', () => {
  it('同一シードの対戦は全ステップのハッシュが一致する', () => {
    for (const seed of [1, 42, 2026, 999983]) {
      const a = playRandom(seed)
      const b = playRandom(seed)
      expect(b.hashes).toEqual(a.hashes)
      expect(hashState(b.state)).toBe(hashState(a.state))
    }
  })

  it('記録した入力列を流し直すと同じ経過をたどる', () => {
    for (const seed of [7, 12345]) {
      const played = playRandom(seed)
      expect(replay(seed, played.actions)).toEqual(played.hashes)
    }
  })

  it('シードが違えば経過も変わる', () => {
    expect(playRandom(1).hashes).not.toEqual(playRandom(2).hashes)
  })

  it('reduce は入力の state を書き換えない', () => {
    const state = start(31)
    const before = hashState(state)
    const legal = legalActions(state)
    for (const action of legal) reduce(state, action)
    expect(hashState(state)).toBe(before)
  })

  it('legalActions が返す Action は必ず受理される', () => {
    for (const seed of [3, 88, 1234]) {
      let state = start(seed)
      let chooser = createRng(seed)
      for (let step = 0; step < 300 && !isOver(state); step += 1) {
        const legal = legalActions(state)
        if (legal.length === 0) break

        // その局面のすべての合法手が拒否されないことを確認する
        for (const action of legal) {
          const applied = reduce(state, action)
          const added = applied.log.slice(state.log.length)
          expect(added.some((e) => e.kind === 'rejected'), `${JSON.stringify(action)} が拒否された`).toBe(false)
        }

        const chosen = pick(chooser, legal)
        chooser = chosen.rng
        state = reduce(state, chosen.item as Action)
      }
    }
  })

  it('legalActions が空になるのは終了時だけ', () => {
    let state = start(55)
    let chooser = createRng(55)
    for (let step = 0; step < 1000; step += 1) {
      const legal = legalActions(state)
      if (legal.length === 0) {
        expect(isOver(state)).toBe(true)
        return
      }
      const chosen = pick(chooser, legal)
      chooser = chosen.rng
      state = reduce(state, chosen.item as Action)
    }
  })
})

describe('デッキ検証', () => {
  it('不正なデッキでは開始を拒否する', () => {
    const broken = { ...FIRE_DECK, cards: FIRE_DECK.cards.slice(0, 19) }
    const state = reduce(EMPTY_STATE, {
      type: 'start', seed: 1, decks: [broken, GRASS_DECK], firstPlayer: 0,
    })
    expect(state.log.some((e) => e.kind === 'rejected')).toBe(true)
    expect(state.phase.kind).toBe('ended')
  })

  it('プリセットデッキは検証を通る', () => {
    expect(start(1).phase.kind).toBe('setup')
  })
})
