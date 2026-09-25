/**
 * バトル（SPEC 3.6）。割り込みはまだ無い。
 */
import { describe, expect, it } from 'vitest'
import { EMPTY_STATE, isOver, legalActions, reduce } from '../src/core/reduce.ts'
import { MONSTERS } from '../src/data/monsters.ts'
import { monstersOf } from '../src/core/state.ts'
import type { Deck, GameState, MonsterDef, MonsterOnField, PlayerId } from '../src/core/types.ts'
import { DECK_SIZE, LIFE_POINTS } from '../src/core/types.ts'

const deck: Deck = { name: 'テスト', cards: MONSTERS.slice(0, DECK_SIZE).map((m) => m.id) }

/** 攻撃力の近いカードを選びたいので、攻撃力で引く */
function byAtk(atk: number): MonsterDef {
  return [...MONSTERS].sort((a, b) => Math.abs(a.atk - atk) - Math.abs(b.atk - atk))[0] as MonsterDef
}

function onField(cardId: string, instanceId: number, position: 'attack' | 'defense', faceDown = false): MonsterOnField {
  return {
    instanceId, cardId, position, faceDown,
    hasAttacked: false, summonedThisTurn: false, changedThisTurn: false, atkDelta: 0,
  }
}

/** バトルフェイズの盤面を直接組む。召喚を経ると手順が長くなるため */
function board(
  mine: readonly (MonsterOnField | null)[],
  theirs: readonly (MonsterOnField | null)[],
  turnPlayer: PlayerId = 0,
): GameState {
  const s = reduce(EMPTY_STATE, { type: 'start', seed: 1, decks: [deck, deck], firstPlayer: 0 })
  return {
    ...s,
    turn: 3, // 先攻1ターン目の制限を外すため
    turnPlayer, priority: turnPlayer, phase: 'battle',
    players: [
      { ...s.players[0], monsters: [...mine, null, null].slice(0, 3) },
      { ...s.players[1], monsters: [...theirs, null, null].slice(0, 3) },
    ],
    nextInstanceId: 100,
  }
}

describe('攻撃表示どうし', () => {
  it('攻撃力が上なら相手を破壊し、差が相手のライフへ', () => {
    const strong = byAtk(2000)
    const weak = byAtk(1000)
    let s = board([onField(strong.id, 1, 'attack')], [onField(weak.id, 2, 'attack')])
    s = reduce(s, { type: 'declareAttack', attacker: 1, target: 2 })
    expect(monstersOf(s.players[1]).length).toBe(0)
    expect(s.players[1].lp).toBe(LIFE_POINTS - (strong.atk - weak.atk))
    expect(s.players[0].lp).toBe(LIFE_POINTS)
    expect(s.players[1].graveyard).toContain(weak.id)
  })

  it('攻撃力が下なら自分が破壊され、差が自分のライフへ', () => {
    const strong = byAtk(2000)
    const weak = byAtk(1000)
    let s = board([onField(weak.id, 1, 'attack')], [onField(strong.id, 2, 'attack')])
    s = reduce(s, { type: 'declareAttack', attacker: 1, target: 2 })
    expect(monstersOf(s.players[0]).length).toBe(0)
    expect(s.players[0].lp).toBe(LIFE_POINTS - (strong.atk - weak.atk))
    expect(s.players[1].lp).toBe(LIFE_POINTS)
  })

  it('同値なら両方破壊され、ライフは動かない', () => {
    const a = byAtk(1200)
    let s = board([onField(a.id, 1, 'attack')], [onField(a.id, 2, 'attack')])
    s = reduce(s, { type: 'declareAttack', attacker: 1, target: 2 })
    expect(monstersOf(s.players[0]).length).toBe(0)
    expect(monstersOf(s.players[1]).length).toBe(0)
    expect(s.players[0].lp).toBe(LIFE_POINTS)
    expect(s.players[1].lp).toBe(LIFE_POINTS)
  })
})

describe('守備表示の相手', () => {
  it('攻撃力が守備力を上回れば破壊するが、ダメージは出ない（貫通なし）', () => {
    const strong = [...MONSTERS].sort((a, b) => b.atk - a.atk)[0] as MonsterDef
    const soft = [...MONSTERS].sort((a, b) => a.def - b.def)[0] as MonsterDef
    let s = board([onField(strong.id, 1, 'attack')], [onField(soft.id, 2, 'defense')])
    s = reduce(s, { type: 'declareAttack', attacker: 1, target: 2 })
    expect(monstersOf(s.players[1]).length).toBe(0)
    expect(s.players[1].lp).toBe(LIFE_POINTS)
  })

  it('攻撃力が守備力を下回れば、攻撃した側が差を受ける', () => {
    const weak = [...MONSTERS].sort((a, b) => a.atk - b.atk)[0] as MonsterDef
    const wall = [...MONSTERS].sort((a, b) => b.def - a.def)[0] as MonsterDef
    let s = board([onField(weak.id, 1, 'attack')], [onField(wall.id, 2, 'defense')])
    s = reduce(s, { type: 'declareAttack', attacker: 1, target: 2 })
    expect(monstersOf(s.players[0]).length).toBe(1) // 破壊はされない
    expect(s.players[0].lp).toBe(LIFE_POINTS - (wall.def - weak.atk))
  })

  it('裏側守備表示は、計算の前に表になる', () => {
    const strong = [...MONSTERS].sort((a, b) => b.atk - a.atk)[0] as MonsterDef
    const soft = [...MONSTERS].sort((a, b) => a.def - b.def)[0] as MonsterDef
    let s = board([onField(strong.id, 1, 'attack')], [onField(soft.id, 2, 'defense', true)])
    s = reduce(s, { type: 'declareAttack', attacker: 1, target: 2 })
    expect(s.log.some((e) => e.kind === 'flip')).toBe(true)
  })
})

describe('ダイレクトアタック', () => {
  it('相手の場が空なら攻撃力ぶんライフを削る', () => {
    const a = byAtk(1200)
    let s = board([onField(a.id, 1, 'attack')], [])
    s = reduce(s, { type: 'declareAttack', attacker: 1, target: null })
    expect(s.players[1].lp).toBe(LIFE_POINTS - a.atk)
  })

  it('相手に姫神がいれば拒否する', () => {
    const a = byAtk(1200)
    let s = board([onField(a.id, 1, 'attack')], [onField(a.id, 2, 'defense')])
    s = reduce(s, { type: 'declareAttack', attacker: 1, target: null })
    expect(s.log.at(-1)?.detail).toContain('ダイレクトアタックできない')
    expect(s.players[1].lp).toBe(LIFE_POINTS)
  })

  it('ライフが0になったら決着する（SPEC 3.7）', () => {
    const a = byAtk(1200)
    let s = board([onField(a.id, 1, 'attack')], [])
    s = { ...s, players: [s.players[0], { ...s.players[1], lp: 100 }] }
    s = reduce(s, { type: 'declareAttack', attacker: 1, target: null })
    expect(isOver(s)).toBe(true)
    expect(s.winner).toBe(0)
    expect(s.endReason).toBe('lifePoints')
  })
})

describe('攻撃できる条件', () => {
  it('1体につき1回まで', () => {
    const a = byAtk(1200)
    let s = board([onField(a.id, 1, 'attack')], [])
    s = reduce(s, { type: 'declareAttack', attacker: 1, target: null })
    const lp = s.players[1].lp
    s = reduce(s, { type: 'declareAttack', attacker: 1, target: null })
    expect(s.log.at(-1)?.detail).toContain('攻撃できない')
    expect(s.players[1].lp).toBe(lp)
  })

  it('守備表示の姫神は攻撃できない', () => {
    const a = byAtk(1200)
    let s = board([onField(a.id, 1, 'defense')], [])
    s = reduce(s, { type: 'declareAttack', attacker: 1, target: null })
    expect(s.log.at(-1)?.detail).toContain('攻撃できない')
  })

  it('裏側の姫神は攻撃できない', () => {
    const a = byAtk(1200)
    let s = board([onField(a.id, 1, 'attack', true)], [])
    s = reduce(s, { type: 'declareAttack', attacker: 1, target: null })
    expect(s.log.at(-1)?.detail).toContain('攻撃できない')
  })

  it('相手の姫神では攻撃できない', () => {
    const a = byAtk(1200)
    let s = board([onField(a.id, 1, 'attack')], [onField(a.id, 2, 'attack')])
    s = reduce(s, { type: 'declareAttack', attacker: 2, target: 1 })
    expect(s.log.at(-1)?.detail).toContain('自分の場にいない')
  })
})

describe('legalActions（バトル）', () => {
  it('相手が空ならダイレクトアタックだけが候補に出る', () => {
    const a = byAtk(1200)
    const s = board([onField(a.id, 1, 'attack')], [])
    const attacks = legalActions(s).filter((x) => x.type === 'declareAttack')
    expect(attacks).toEqual([{ type: 'declareAttack', attacker: 1, target: null }])
  })

  it('相手がいれば相手の数だけ候補が出る', () => {
    const a = byAtk(1200)
    const s = board([onField(a.id, 1, 'attack')], [onField(a.id, 2, 'attack'), onField(a.id, 3, 'defense')])
    const attacks = legalActions(s).filter((x) => x.type === 'declareAttack')
    expect(attacks.length).toBe(2)
  })

  it('返した操作はすべて通る', () => {
    const a = byAtk(1200)
    const s = board([onField(a.id, 1, 'attack'), onField(a.id, 4, 'attack')], [onField(a.id, 2, 'attack')])
    for (const act of legalActions(s)) {
      expect(reduce(s, act).log.at(-1)?.kind).not.toBe('rejected')
    }
  })
})
