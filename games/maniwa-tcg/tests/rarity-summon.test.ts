/**
 * レアリティ召喚の検証（SPEC 3.3.1）。
 *
 * 姫神を出すとき、レアリティに応じて場の姫神をリリースする規則。
 * エネルギーの引き継ぎと、先攻1ターン目の制限までここで縛る。
 */
import { describe, expect, it } from 'vitest'
import { EMPTY_STATE, legalActions, reduce } from '../src/core/reduce.ts'
import { createRng } from '../src/core/rng.ts'
import type { Action } from '../src/core/actions.ts'
import type { Creature, EnergyType, GameState, PlayerState } from '../src/core/types.ts'

/** 炎属性で C / R / UR がそろっているので、そのまま使う */
const COMMON = 'f004' // アグニ
const RARE = 'f001' // カグツチ
const ULTRA = 'f002' // カグツチEX

function creature(instanceId: number, cardId: string, attached: readonly EnergyType[] = [], damage = 0): Creature {
  return { instanceId, cardId, damage, attached, status: [], placedTurn: 0 }
}

function player(active: Creature | null, bench: readonly Creature[] = [], hand: readonly string[] = []): PlayerState {
  return {
    deck: [], hand, discard: [],
    active, bench, points: 0,
    energy: { pool: ['fire'], current: 'fire', next: 'fire' },
    attachedThisTurn: false, retreatedThisTurn: false, usedActionThisTurn: false,
  }
}

function battleState(a: PlayerState, b: PlayerState, turn = 5): GameState {
  return {
    ...EMPTY_STATE,
    rng: createRng(1), turn, current: 0, firstPlayer: 0,
    phase: { kind: 'main' }, players: [a, b], setupDone: [true, true], nextInstanceId: 100,
  }
}

/** 手札 handIndex を出す行動のうち、release が一致するものを取る */
function playOf(state: GameState, handIndex: number, release: number | null): Action | undefined {
  return legalActions(state).find(
    (a) => a.type === 'playCreature' && a.handIndex === handIndex && a.release === release,
  )
}

describe('レアリティ召喚（SPEC 3.3.1）', () => {
  it('コモンはリリースなしで空きベンチに出せる', () => {
    const state = battleState(player(creature(1, COMMON), [], [COMMON]), player(creature(2, COMMON)))
    const action = playOf(state, 0, null)
    expect(action, 'コモンはリリースなしで出せるはず').toBeDefined()
    const next = reduce(state, action as Action)
    expect(next.players[0].bench).toHaveLength(1)
  })

  it('レアはリリースなしでは出せない', () => {
    const state = battleState(player(creature(1, COMMON), [], [RARE]), player(creature(2, COMMON)))
    expect(playOf(state, 0, null), 'レアがリリースなしで出せてはいけない').toBeUndefined()
  })

  it('レアはエネルギー1つ以上の姫神をリリースすれば出せる', () => {
    const noEnergy = battleState(player(creature(1, COMMON, []), [], [RARE]), player(creature(2, COMMON)))
    expect(playOf(noEnergy, 0, 1), 'エネルギー0ではリリースできない').toBeUndefined()

    const withEnergy = battleState(player(creature(1, COMMON, ['fire']), [], [RARE]), player(creature(2, COMMON)))
    expect(playOf(withEnergy, 0, 1), 'エネルギー1つならリリースできる').toBeDefined()
  })

  it('ウルトラレアはエネルギー3つ必要（2つでは足りない）', () => {
    const two = battleState(player(creature(1, COMMON, ['fire', 'fire']), [], [ULTRA]), player(creature(2, COMMON)))
    expect(playOf(two, 0, 1)).toBeUndefined()

    const three = battleState(
      player(creature(1, COMMON, ['fire', 'fire', 'fire']), [], [ULTRA]), player(creature(2, COMMON)),
    )
    expect(playOf(three, 0, 1)).toBeDefined()
  })

  /**
   * 引き継ぎが無いと「3ターン貯める → 捨てる → また3ターン貯め直す」になり、
   * 絶技10種のうち9種（対応姫神が UR EX）が撃てなくなる
   */
  it('リリース元のエネルギーを引き継ぎ、ダメージは引き継がない', () => {
    const state = battleState(
      player(creature(1, COMMON, ['fire', 'fire', 'fire'], 40), [], [ULTRA]), player(creature(2, COMMON)),
    )
    const next = reduce(state, playOf(state, 0, 1) as Action)
    const placed = next.players[0].active
    expect(placed?.cardId, 'バトル場のものをリリースしたのでバトル場に出る').toBe(ULTRA)
    expect(placed?.attached, 'エネルギーは引き継ぐ').toEqual(['fire', 'fire', 'fire'])
    expect(placed?.damage, 'ダメージは引き継がない').toBe(0)
  })

  it('ベンチをリリースしたらその枠に出る', () => {
    const state = battleState(
      player(creature(1, COMMON), [creature(2, COMMON, ['fire'])], [RARE]), player(creature(3, COMMON)),
    )
    const next = reduce(state, playOf(state, 0, 2) as Action)
    expect(next.players[0].active?.cardId, 'バトル場は変わらない').toBe(COMMON)
    expect(next.players[0].bench.map((c) => c.cardId), 'ベンチの枠が入れ替わる').toEqual([RARE])
  })

  it('リリースした姫神はトラッシュへ行き、ポイントは動かない', () => {
    const state = battleState(player(creature(1, COMMON, ['fire']), [], [RARE]), player(creature(2, COMMON)))
    const next = reduce(state, playOf(state, 0, 1) as Action)
    expect(next.players[0].discard, 'リリース元がトラッシュに入る').toEqual([COMMON])
    expect(next.players[1].points, 'きぜつではないので相手にポイントは入らない').toBe(0)
  })

  /** SPEC 3.3.1 の先手対策2。既存の「先攻1ターン目は攻撃できない」と同じ形 */
  it('先攻1ターン目はリリースできない（コモンは出せる）', () => {
    const base = player(creature(1, COMMON, ['fire']), [], [RARE, COMMON])
    const turn1 = battleState(base, player(creature(2, COMMON)), 1)
    expect(playOf(turn1, 0, 1), '先攻1ターン目はリリース不可').toBeUndefined()
    expect(playOf(turn1, 1, null), 'コモンはそのまま出せる').toBeDefined()

    const turn2 = battleState(base, player(creature(2, COMMON)), 2)
    expect(playOf(turn2, 0, 1), 'ターン2からはリリースできる').toBeDefined()
  })

  it('後攻は1ターン目でもリリースできる', () => {
    const state: GameState = {
      ...battleState(player(creature(1, COMMON)), player(creature(2, COMMON, ['fire']), [], [RARE]), 1),
      current: 1,
    }
    const action = legalActions(state).find(
      (a) => a.type === 'playCreature' && a.player === 1 && a.release === 2,
    )
    expect(action, '制限がかかるのは先攻だけ').toBeDefined()
  })
})
