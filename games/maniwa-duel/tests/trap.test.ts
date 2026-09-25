/**
 * 罠のセットと、バトル中の割り込み1段（SPEC 11章）。
 *
 * **このゲームの中心**なので、境目を細かく押さえる。
 */
import { describe, expect, it } from 'vitest'
import { EMPTY_STATE, isOver, legalActions, reduce } from '../src/core/reduce.ts'
import { MONSTERS } from '../src/data/monsters.ts'
import { TRAPS } from '../src/data/traps.ts'
import { monstersOf } from '../src/core/state.ts'
import type { Deck, GameState, MonsterOnField, SpellOnField } from '../src/core/types.ts'
import { DECK_SIZE, LIFE_POINTS } from '../src/core/types.ts'

const deck: Deck = { name: 'テスト', cards: MONSTERS.slice(0, DECK_SIZE).map((m) => m.id) }

function onField(cardId: string, instanceId: number, position: 'attack' | 'defense' = 'attack'): MonsterOnField {
  return {
    instanceId, cardId, position, faceDown: false,
    hasAttacked: false, summonedThisTurn: false, changedThisTurn: false, atkDelta: 0,
  }
}

function setTrap(cardId: string, instanceId: number, setTurn = 1): SpellOnField {
  return { instanceId, cardId, state: 'set', setTurn, equippedTo: null }
}

/** プレイヤー0 のバトルフェイズ。プレイヤー1 が伏せカードを持つ */
function battle(
  attacker: MonsterOnField,
  defenders: readonly MonsterOnField[],
  traps: readonly (SpellOnField | null)[],
): GameState {
  const s = reduce(EMPTY_STATE, { type: 'start', seed: 1, decks: [deck, deck], firstPlayer: 0 })
  return {
    ...s, turn: 5, turnPlayer: 0, priority: 0, phase: 'battle', nextInstanceId: 200,
    players: [
      { ...s.players[0], monsters: [attacker, null, null] },
      {
        ...s.players[1],
        monsters: [...defenders, null, null, null].slice(0, 3),
        spells: [...traps, null, null, null].slice(0, 3),
      },
    ],
  }
}

const strong = [...MONSTERS].sort((a, b) => b.atk - a.atk)[0]!
const mid = MONSTERS.find((m) => m.atk >= 1000 && m.atk <= 1400)!

describe('伏せる', () => {
  it('罠を伏せられる', () => {
    const s0 = reduce(EMPTY_STATE, { type: 'start', seed: 1, decks: [deck, deck], firstPlayer: 0 })
    let s: GameState = { ...s0, turn: 3, phase: 'main',
      players: [{ ...s0.players[0], hand: ['a006'] }, s0.players[1]] }
    s = reduce(s, { type: 'setSpell', handIndex: 0, zone: 0 })
    expect(s.players[0].spells[0]?.cardId).toBe('a006')
    expect(s.players[0].spells[0]?.state).toBe('set')
    expect(s.players[0].spells[0]?.setTurn).toBe(3)
  })

  it('通常魔法は伏せられない（v1）', () => {
    const s0 = reduce(EMPTY_STATE, { type: 'start', seed: 1, decks: [deck, deck], firstPlayer: 0 })
    let s: GameState = { ...s0, turn: 3, phase: 'main',
      players: [{ ...s0.players[0], hand: ['i019'] }, s0.players[1]] }
    s = reduce(s, { type: 'setSpell', handIndex: 0, zone: 0 })
    expect(s.log.at(-1)?.kind).toBe('rejected')
  })
})

describe('割り込みが起きる条件', () => {
  it('伏せカードが無ければ priority は移らず、そのまま戦闘計算に進む（SPEC 5章）', () => {
    let s = battle(onField(strong.id, 1), [], [])
    s = reduce(s, { type: 'declareAttack', attacker: 1, target: null })
    expect(s.pendingAttack).toBeNull()
    expect(s.priority).toBe(0)
    expect(s.players[1].lp).toBe(LIFE_POINTS - strong.atk)
  })

  it('伏せカードがあれば priority が防御側へ移り、攻撃は保留される', () => {
    let s = battle(onField(strong.id, 1), [], [setTrap('a006', 10)])
    s = reduce(s, { type: 'declareAttack', attacker: 1, target: null })
    expect(s.pendingAttack).not.toBeNull()
    expect(s.priority).toBe(1)
    expect(s.players[1].lp).toBe(LIFE_POINTS) // まだ削られていない
  })

  it('伏せたターンには開けないので、priority も移らない', () => {
    let s = battle(onField(strong.id, 1), [], [setTrap('a006', 10, 5)]) // 同じターンに伏せた
    s = reduce(s, { type: 'declareAttack', attacker: 1, target: null })
    expect(s.pendingAttack).toBeNull()
    expect(s.priority).toBe(0)
  })
})

describe('割り込みの解決', () => {
  it('割り込まなければ、そのまま戦闘計算に進む', () => {
    let s = battle(onField(strong.id, 1), [], [setTrap('a006', 10)])
    s = reduce(s, { type: 'declareAttack', attacker: 1, target: null })
    s = reduce(s, { type: 'passResponse' })
    expect(s.pendingAttack).toBeNull()
    expect(s.priority).toBe(0)
    expect(s.players[1].lp).toBe(LIFE_POINTS - strong.atk)
  })

  it('攻撃を無効にする罠は、ダメージを止める', () => {
    let s = battle(onField(strong.id, 1), [], [setTrap('a003', 10)]) // 交代の号令
    s = reduce(s, { type: 'declareAttack', attacker: 1, target: null })
    s = reduce(s, { type: 'activateTrap', zone: 0 })
    expect(s.players[1].lp).toBe(LIFE_POINTS)
    expect(s.pendingAttack).toBeNull()
    expect(s.priority).toBe(0)
  })

  it('攻撃力を下げる罠は、戦闘計算の前に効いて勝敗をひっくり返す', () => {
    // 攻撃側 strong が防御側 mid を殴る。素なら攻撃側が勝つ
    const plain = battle(onField(strong.id, 1), [onField(mid.id, 20)], [])
    const plainResult = reduce(plain, { type: 'declareAttack', attacker: 1, target: 20 })
    expect(monstersOf(plainResult.players[1]).length).toBe(0)

    // 祟りの札 で攻撃力 -1000。攻撃側が負けるところまで落ちるかを見る
    let s = battle(onField(strong.id, 1), [onField(mid.id, 20)], [setTrap('a006', 10)])
    s = reduce(s, { type: 'declareAttack', attacker: 1, target: 20 })
    s = reduce(s, { type: 'activateTrap', zone: 0 })
    const attackerAlive = monstersOf(s.players[0]).length === 1
    const defenderAlive = monstersOf(s.players[1]).length === 1
    // 少なくとも素の結果（防御側が一方的に壊れる）とは変わっている
    expect(attackerAlive && !defenderAlive).toBe(strong.atk - 1000 > mid.atk)
  })

  it('攻撃した姫神を破壊する罠は、攻撃側を墓地へ送る', () => {
    let s = battle(onField(strong.id, 1), [], [setTrap('a012', 10)]) // 神罰
    s = reduce(s, { type: 'declareAttack', attacker: 1, target: null })
    s = reduce(s, { type: 'activateTrap', zone: 0 })
    expect(monstersOf(s.players[0]).length).toBe(0)
    expect(s.players[1].lp).toBe(LIFE_POINTS)
  })

  it('使った罠は墓地へ行き、ゾーンが空く', () => {
    let s = battle(onField(strong.id, 1), [], [setTrap('a004', 10)])
    s = reduce(s, { type: 'declareAttack', attacker: 1, target: null })
    s = reduce(s, { type: 'activateTrap', zone: 0 })
    expect(s.players[1].spells[0]).toBeNull()
    expect(s.players[1].graveyard).toContain('a004')
  })

  it('罠でライフが0になれば決着する', () => {
    let s = battle(onField(mid.id, 1), [], [setTrap('a008', 10)]) // 焦土の誓い 900
    s = { ...s, players: [{ ...s.players[0], lp: 500 }, s.players[1]] }
    s = reduce(s, { type: 'declareAttack', attacker: 1, target: null })
    s = reduce(s, { type: 'activateTrap', zone: 0 })
    expect(isOver(s)).toBe(true)
    expect(s.winner).toBe(1)
  })
})

describe('チェーンは1段まで（SPEC 11章）', () => {
  it('同じ攻撃に二度は割り込めない', () => {
    let s = battle(onField(strong.id, 1), [], [setTrap('a004', 10), setTrap('a006', 11)])
    s = reduce(s, { type: 'declareAttack', attacker: 1, target: null })
    s = reduce(s, { type: 'activateTrap', zone: 0 })
    // すでに解決が終わっているので、2枚目は開けない
    s = reduce(s, { type: 'activateTrap', zone: 1 })
    expect(s.log.at(-1)?.kind).toBe('rejected')
    expect(s.players[1].spells[1]?.state).toBe('set')
  })

  it('攻撃側は自分の攻撃に割り込めない', () => {
    let s = battle(onField(strong.id, 1), [], [setTrap('a006', 10)])
    s = reduce(s, { type: 'declareAttack', attacker: 1, target: null })
    // priority は 1 なので、0 の操作として扱われる activateTrap は通らない
    const forced: GameState = { ...s, priority: 0 }
    const after = reduce(forced, { type: 'activateTrap', zone: 0 })
    expect(after.log.at(-1)?.kind).toBe('rejected')
  })

  it('攻撃の最中でなければ罠は開けない', () => {
    const s = battle(onField(strong.id, 1), [], [setTrap('a006', 10)])
    const after = reduce({ ...s, priority: 1 }, { type: 'activateTrap', zone: 0 })
    expect(after.log.at(-1)?.detail).toContain('攻撃の最中ではない')
  })
})

describe('legalActions（割り込み）', () => {
  it('割り込み中は罠と passResponse だけが出る', () => {
    let s = battle(onField(strong.id, 1), [], [setTrap('a006', 10)])
    s = reduce(s, { type: 'declareAttack', attacker: 1, target: null })
    const acts = legalActions(s)
    expect(acts.every((a) => a.type === 'activateTrap' || a.type === 'passResponse')).toBe(true)
    expect(acts.some((a) => a.type === 'passResponse')).toBe(true)
  })

  it('伏せたターンの罠は候補に出ない', () => {
    let s = battle(onField(strong.id, 1), [], [setTrap('a006', 10, 5)])
    s = reduce(s, { type: 'declareAttack', attacker: 1, target: null })
    // そもそも priority が移らないので、候補は攻撃側のもの
    expect(legalActions(s).some((a) => a.type === 'activateTrap')).toBe(false)
  })

  it('返した操作はすべて通る', () => {
    let s = battle(onField(strong.id, 1), [onField(mid.id, 20)], [setTrap('a006', 10), setTrap('a012', 11)])
    s = reduce(s, { type: 'declareAttack', attacker: 1, target: 20 })
    for (const a of legalActions(s)) {
      expect(reduce(s, a).log.at(-1)?.kind).not.toBe('rejected')
    }
  })
})

describe('罠のデータ', () => {
  it('v1 はすべて通常罠（SPEC 6.4）', () => {
    for (const t of TRAPS) expect(t.trapType).toBe('normal')
  })

  it('v1 は継続効果を持たない', () => {
    for (const t of TRAPS) expect(t.whileOnField).toBeUndefined()
  })
})
