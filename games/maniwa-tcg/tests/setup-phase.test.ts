/**
 * 配置フェーズの検証（SPEC 3.2 / 3.3.1）。
 *
 * ゲーム開始時に伏せて置けるのはコモンの姫神だけ。
 * 詰みを防ぐ引き直し条件と、デッキ構築側の保証もここで縛る。
 */
import { describe, expect, it } from 'vitest'
import { EMPTY_STATE, legalActions, reduce, validateDeck } from '../src/core/reduce.ts'
import { createRng } from '../src/core/rng.ts'
import { DECKS } from '../src/data/decks.ts'
import { findCard } from '../src/data/cards.ts'
import type { GameState, PlayerState } from '../src/core/types.ts'

const COMMON = 'f004' // アグニ
const RARE = 'f001' // カグツチ
const ULTRA = 'f002' // カグツチEX
const ITEM = 'i001' // 神饌の香

function player(hand: readonly string[]): PlayerState {
  return {
    deck: [], hand, discard: [],
    active: null, bench: [], points: 0,
    energy: { pool: ['fire'], current: null, next: 'fire' },
    attachedThisTurn: false, retreatedThisTurn: false, usedActionThisTurn: false,
  }
}

function setupState(hand: readonly string[]): GameState {
  return {
    ...EMPTY_STATE,
    rng: createRng(1), turn: 0, current: 0, firstPlayer: 0,
    phase: { kind: 'setup' }, players: [player(hand), player([COMMON])],
    setupDone: [false, false], nextInstanceId: 1,
  }
}

describe('配置フェーズはコモンの姫神だけ', () => {
  it('合法手に出るのはコモンの姫神だけで、レア以上と支援カードは出ない', () => {
    const state = setupState([COMMON, RARE, ULTRA, ITEM])
    const places = legalActions(state).filter((a) => a.type === 'setupPlace' && a.player === 0)
    expect(places.map((a) => (a.type === 'setupPlace' ? a.handIndex : -1))).toEqual([0])
  })

  it('レアを置こうとすると拒否される', () => {
    const state = setupState([COMMON, RARE])
    const next = reduce(state, { type: 'setupPlace', player: 0, handIndex: 1 })
    expect(next.players[0].active).toBeNull()
    expect(next.log.at(-1)?.detail).toContain('コモンの姫神だけ')
  })

  it('コモンならバトル場にもベンチにも置ける', () => {
    let state: GameState = setupState([COMMON, COMMON, COMMON])
    state = reduce(state, { type: 'setupPlace', player: 0, handIndex: 0 })
    expect(state.players[0].active).not.toBeNull()
    state = reduce(state, { type: 'setupPlace', player: 0, handIndex: 0 })
    expect(state.players[0].bench).toHaveLength(1)
  })
})

describe('詰みの防止', () => {
  it('初期手札には必ずコモンの姫神が入る（全基準デッキ × 200回）', () => {
    for (const deck of DECKS) {
      for (let seed = 1; seed <= 200; seed += 1) {
        const started = reduce(EMPTY_STATE, {
          type: 'start', seed, firstPlayer: 0, decks: [deck, deck],
        })
        for (const p of started.players) {
          const hasCommon = p.hand.some((id) => {
            const card = findCard(id)
            return card?.kind === 'creature' && card.rarity === 'common'
          })
          expect(hasCommon, `${deck.name} / seed ${seed}`).toBe(true)
        }
      }
    }
  })

  it('開始直後は両者に必ず合法手がある（詰みが無い）', () => {
    for (const deck of DECKS) {
      for (let seed = 1; seed <= 100; seed += 1) {
        const started = reduce(EMPTY_STATE, {
          type: 'start', seed, firstPlayer: 0, decks: [deck, deck],
        })
        for (const id of [0, 1] as const) {
          const mine = legalActions(started).filter((a) => a.type !== 'start' && a.player === id)
          expect(mine.length, `${deck.name} / seed ${seed} / p${id}`).toBeGreaterThan(0)
        }
      }
    }
  })

  it('コモンの姫神が無いデッキは validateDeck で弾かれる', () => {
    const cards = [RARE, ULTRA, ...Array.from({ length: 18 }, () => ITEM)]
    const errors = validateDeck({ name: 'テスト', energy: ['fire'], cards })
    expect(errors.some((e) => e.includes('コモンの姫神を1枚以上'))).toBe(true)
  })

  it('基準デッキはすべてこの条件を満たす', () => {
    for (const deck of DECKS) expect(validateDeck(deck), deck.name).toEqual([])
  })
})
