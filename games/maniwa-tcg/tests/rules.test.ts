/**
 * ルールの個別検証。弱点 +20、EX の2ポイント、どくの10ダメージ、
 * コスト支払い、先攻1ターン目の攻撃禁止、同時到達の扱い。
 */
import { describe, expect, it } from 'vitest'
import { EMPTY_STATE, legalActions, reduce } from '../src/core/reduce.ts'
import { createRng } from '../src/core/rng.ts'
import { canPayCost } from '../src/core/rules.ts'
import type { Creature, EnergyType, GameState, PlayerState } from '../src/core/types.ts'
import { FIRE_DECK, GRASS_DECK } from '../src/data/decks.ts'
import { requireCard } from '../src/data/cards.ts'

function creature(instanceId: number, cardId: string, attached: readonly EnergyType[] = [], damage = 0): Creature {
  return { instanceId, cardId, damage, attached, status: [], placedTurn: 0 }
}

function player(active: Creature | null, bench: readonly Creature[] = []): PlayerState {
  return {
    deck: [], hand: [], discard: [],
    active, bench, points: 0,
    energy: { pool: ['fire'], current: null, next: 'fire' },
    attachedThisTurn: false, retreatedThisTurn: false, usedActionThisTurn: false,
  }
}

function battleState(a: PlayerState, b: PlayerState, turn = 5): GameState {
  return {
    ...EMPTY_STATE,
    rng: createRng(1),
    turn,
    current: 0,
    firstPlayer: 0,
    phase: { kind: 'main' },
    players: [a, b],
    setupDone: [true, true],
    nextInstanceId: 100,
  }
}

describe('canPayCost', () => {
  it('色指定はぴったり一致が必要', () => {
    expect(canPayCost(['fire'], ['fire'])).toBe(true)
    expect(canPayCost(['grass'], ['fire'])).toBe(false)
    expect(canPayCost([], ['fire'])).toBe(false)
  })

  it('colorless は任意のタイプ1個で払える', () => {
    expect(canPayCost(['grass'], ['colorless'])).toBe(true)
    expect(canPayCost(['fire', 'grass'], ['fire', 'colorless'])).toBe(true)
    expect(canPayCost(['fire'], ['fire', 'colorless'])).toBe(false)
  })

  it('色指定を先に消費してから colorless を数える', () => {
    // fire2個で「fire + colorless」は払える
    expect(canPayCost(['fire', 'fire'], ['fire', 'colorless'])).toBe(true)
    // fire1個 + grass1個で「fire + fire」は払えない
    expect(canPayCost(['fire', 'grass'], ['fire', 'fire'])).toBe(false)
  })

  it('余分なエネルギーがあっても払える', () => {
    expect(canPayCost(['fire', 'fire', 'fire'], ['fire'])).toBe(true)
  })
})

describe('弱点', () => {
  it('炎の攻撃は草（弱点:炎）に +20 される', () => {
    // f001 シュクユウ「なんぽうのほのお」20ダメージ → g001 デメテル（弱点 fire）
    const state = battleState(
      player(creature(1, 'f001', ['fire'])),
      player(creature(2, 'g001')),
    )
    const after = reduce(state, { type: 'attack', player: 0, attackIndex: 0 })
    const target = after.players[1].active
    expect(target?.damage).toBe(40) // 20 + 20
  })

  it('弱点が一致しなければ素通し', () => {
    // 炎 → 炎（弱点 grass）は加算されない
    const state = battleState(
      player(creature(1, 'f001', ['fire'])),
      player(creature(2, 'f001')),
    )
    const after = reduce(state, { type: 'attack', player: 0, attackIndex: 0 })
    expect(after.players[1].active?.damage).toBe(20)
  })

  it('ベンチへのダメージには弱点を適用しない', () => {
    // f006 カグツチEX「あまのおはばり」: バトル場90 + ベンチ全体10
    const state = battleState(
      player(creature(1, 'f006', ['fire', 'fire', 'fire'])),
      player(creature(2, 'g002'), [creature(3, 'g001')]),
    )
    const after = reduce(state, { type: 'attack', player: 0, attackIndex: 1 })
    expect(after.players[1].bench[0]?.damage).toBe(10) // +20 されない
  })
})

describe('きぜつとポイント', () => {
  it('通常のクリーチャーは1ポイント', () => {
    const state = battleState(
      player(creature(1, 'f004', ['fire', 'fire'])), // レーヴァテイン 50 + 弱点20
      player(creature(2, 'g001', [], 40), [creature(3, 'g001')]), // hp80、残り40
    )
    const after = reduce(state, { type: 'attack', player: 0, attackIndex: 0 })
    expect(after.players[0].points).toBe(1)
  })

  it('EX級は2ポイント', () => {
    const state = battleState(
      player(creature(1, 'f004', ['fire', 'fire'])),
      player(creature(2, 'g006', [], 100), [creature(3, 'g001')]), // ユグドラシルEX hp170、残り70
    )
    const after = reduce(state, { type: 'attack', player: 0, attackIndex: 0 })
    expect(after.players[0].points).toBe(2)
  })

  it('きぜつしたカードはトラッシュへ送られ、入れ替え待ちになる', () => {
    const state = battleState(
      player(creature(1, 'f004', ['fire', 'fire'])),
      player(creature(2, 'g001', [], 40), [creature(3, 'g003')]),
    )
    const after = reduce(state, { type: 'attack', player: 0, attackIndex: 0 })
    expect(after.players[1].discard).toEqual(['g001'])
    expect(after.players[1].active).toBeNull()
    expect(after.phase).toEqual({ kind: 'promote', queue: [1], resume: 'pass' })
  })

  it('ベンチが無ければ場切れで負ける', () => {
    const state = battleState(
      player(creature(1, 'f004', ['fire', 'fire'])),
      player(creature(2, 'g001', [], 40)), // ベンチ無し
    )
    const after = reduce(state, { type: 'attack', player: 0, attackIndex: 0 })
    expect(after.phase.kind).toBe('ended')
    expect(after.endReason).toBe('noCreature')
    expect(after.winner).toBe(0)
  })

  it('3ポイントに達したら勝利', () => {
    const attacker = player(creature(1, 'f004', ['fire', 'fire']))
    const state = battleState(
      { ...attacker, points: 2 },
      player(creature(2, 'g001', [], 40), [creature(3, 'g001')]),
    )
    const after = reduce(state, { type: 'attack', player: 0, attackIndex: 0 })
    expect(after.winner).toBe(0)
    expect(after.endReason).toBe('points')
  })

  it('同時に3ポイントへ達した場合は手番プレイヤーの勝ち（Q2）', () => {
    // n002 ペガソス「てんがけ」: 相手40 + 自分10。両者を同時にきぜつさせる
    const attacker: PlayerState = {
      ...player(creature(1, 'n002', ['fire', 'fire'], 50), [creature(4, 'g001')]), // hp60、残り10
      points: 2,
    }
    const defender: PlayerState = {
      ...player(creature(2, 'g001', [], 40), [creature(3, 'g001')]), // hp80、残り40
      points: 2,
    }
    const after = reduce(battleState(attacker, defender), { type: 'attack', player: 0, attackIndex: 1 })
    expect(after.players[0].points).toBeGreaterThanOrEqual(3)
    expect(after.players[1].points).toBeGreaterThanOrEqual(3)
    expect(after.endReason).toBe('simultaneous')
    expect(after.winner).toBe(0) // 手番プレイヤー
  })
})

describe('どく', () => {
  it('ターン終了時に10ダメージを受ける', () => {
    // f003 ハスター「きいろのいぶき」: 10ダメージ + どく
    const state = battleState(
      player(creature(1, 'f003', ['fire'])),
      player(creature(2, 'f001')), // 炎なので弱点は乗らない
    )
    const poisoned = reduce(state, { type: 'attack', player: 0, attackIndex: 0 })
    // 攻撃10 + そのターン終了時のどく10
    expect(poisoned.players[1].active?.damage).toBe(20)
    expect(poisoned.players[1].active?.status).toContain('poisoned')

    // 相手のターンを終了させると、さらに10
    const next = reduce(poisoned, { type: 'endTurn', player: 1 })
    expect(next.players[1].active?.damage).toBe(30)
  })

  it('にげると解除される', () => {
    const active = { ...creature(1, 'f001', ['fire']), status: ['poisoned'] as const }
    const state = battleState(player(active, [creature(2, 'f002')]), player(creature(3, 'g001')))
    const after = reduce(state, { type: 'retreat', player: 0, benchIndex: 0 })
    expect(after.players[0].bench.at(-1)?.status).toEqual([])
  })
})

describe('先攻1ターン目', () => {
  const opening = (): GameState => {
    let state = reduce(EMPTY_STATE, {
      type: 'start', seed: 20260815, decks: [FIRE_DECK, GRASS_DECK], firstPlayer: 0,
    })
    state = reduce(state, { type: 'setupPlace', player: 0, handIndex: 0 })
    state = reduce(state, { type: 'setupPlace', player: 1, handIndex: 0 })
    state = reduce(state, { type: 'setupDone', player: 0 })
    state = reduce(state, { type: 'setupDone', player: 1 })
    return state
  }

  it('攻撃は合法手に含まれない', () => {
    const state = opening()
    expect(state.turn).toBe(1)
    expect(state.current).toBe(0)
    expect(legalActions(state).some((a) => a.type === 'attack')).toBe(false)
  })

  it('エネルギーは供給される（Q1）', () => {
    const state = opening()
    expect(state.players[0].energy.current).not.toBeNull()
  })

  it('攻撃を送っても拒否される', () => {
    const state = opening()
    const after = reduce(state, { type: 'attack', player: 0, attackIndex: 0 })
    expect(after.log.at(-1)?.kind).toBe('rejected')
    expect(after.log.at(-1)?.detail).toContain('先攻1ターン目')
  })
})

describe('カードデータ', () => {
  it('プリセットデッキのカードはすべて定義済み', () => {
    for (const deck of [FIRE_DECK, GRASS_DECK]) {
      for (const id of deck.cards) expect(() => requireCard(id)).not.toThrow()
    }
  })

  it('デッキのキャラは1つ以上のワザを持つ', () => {
    for (const deck of [FIRE_DECK, GRASS_DECK]) {
      for (const id of new Set(deck.cards)) {
        const card = requireCard(id)
        if (card.kind !== 'creature') continue
        expect(card.attacks.length, `${id}`).toBeGreaterThan(0)
      }
    }
  })
})
