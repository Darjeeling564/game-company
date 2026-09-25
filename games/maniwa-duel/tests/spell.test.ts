/**
 * 魔法の発動と効果の解釈（SPEC 6.3・7章）。
 */
import { describe, expect, it } from 'vitest'
import { EMPTY_STATE, isOver, legalActions, reduce } from '../src/core/reduce.ts'
import { MONSTERS } from '../src/data/monsters.ts'
import { SPELLS } from '../src/data/spells.ts'
import { monstersOf } from '../src/core/state.ts'
import { effectiveAtk } from '../src/core/rules.ts'
import type { Deck, GameState, MonsterOnField } from '../src/core/types.ts'
import { DECK_SIZE, LIFE_POINTS } from '../src/core/types.ts'

const deck: Deck = { name: 'テスト', cards: MONSTERS.slice(0, DECK_SIZE).map((m) => m.id) }

function onField(cardId: string, instanceId: number, faceDown = false): MonsterOnField {
  return {
    instanceId, cardId, position: 'attack', faceDown,
    hasAttacked: false, summonedThisTurn: false, changedThisTurn: false, atkDelta: 0,
  }
}

function mainPhase(hand: readonly string[], mine: readonly MonsterOnField[] = [],
                   theirs: readonly MonsterOnField[] = []): GameState {
  const s = reduce(EMPTY_STATE, { type: 'start', seed: 1, decks: [deck, deck], firstPlayer: 0 })
  return {
    ...s, turn: 3, phase: 'main', turnPlayer: 0, priority: 0, nextInstanceId: 100,
    players: [
      { ...s.players[0], hand: [...hand], monsters: [...mine, null, null, null].slice(0, 3) },
      { ...s.players[1], monsters: [...theirs, null, null, null].slice(0, 3) },
    ],
  }
}

describe('通常魔法', () => {
  it('ライフを削り、墓地へ送られる', () => {
    let s = mainPhase(['i019']) // アグニの火箭 800
    s = reduce(s, { type: 'activateSpell', handIndex: 0, target: null })
    expect(s.players[1].lp).toBe(LIFE_POINTS - 800)
    expect(s.players[0].graveyard).toContain('i019')
    expect(s.players[0].hand.length).toBe(0)
  })

  it('回復する', () => {
    let s = mainPhase(['i012']) // 豊穣の壺 1000
    s = { ...s, players: [{ ...s.players[0], lp: 1000 }, s.players[1]] }
    s = reduce(s, { type: 'activateSpell', handIndex: 0, target: null })
    expect(s.players[0].lp).toBe(2000)
  })

  it('引く', () => {
    let s = mainPhase(['i002'])
    const before = s.players[0].deck.length
    s = reduce(s, { type: 'activateSpell', handIndex: 0, target: null })
    expect(s.players[0].deck.length).toBe(before - 1)
    expect(s.players[0].hand.length).toBe(1)
  })

  it('姫神を探して手札に加える', () => {
    let s = mainPhase(['i003'])
    s = reduce(s, { type: 'activateSpell', handIndex: 0, target: null })
    expect(s.players[0].hand.length).toBe(1)
    expect(s.log.some((e) => e.kind === 'search')).toBe(true)
  })

  it('メインフェイズ以外では拒否する', () => {
    let s: GameState = { ...mainPhase(['i019']), phase: 'battle' }
    s = reduce(s, { type: 'activateSpell', handIndex: 0, target: null })
    expect(s.log.at(-1)?.kind).toBe('rejected')
    expect(s.players[1].lp).toBe(LIFE_POINTS)
  })

  it('ライフが0になれば決着する', () => {
    let s = mainPhase(['i019'])
    s = { ...s, players: [s.players[0], { ...s.players[1], lp: 500 }] }
    s = reduce(s, { type: 'activateSpell', handIndex: 0, target: null })
    expect(isOver(s)).toBe(true)
    expect(s.winner).toBe(0)
  })
})

describe('対象を選ぶ魔法', () => {
  it('相手1体の攻撃力を下げる', () => {
    const target = MONSTERS.find((m) => m.atk >= 1000)!
    let s = mainPhase(['i007'], [], [onField(target.id, 7)])
    s = reduce(s, { type: 'activateSpell', handIndex: 0, target: 7 })
    expect(effectiveAtk(s, 7)).toBe(target.atk - 700)
  })

  it('攻撃力は0未満にならない', () => {
    const weak = [...MONSTERS].sort((a, b) => a.atk - b.atk)[0]!
    let s = mainPhase(['i007'], [], [onField(weak.id, 7)])
    s = reduce(s, { type: 'activateSpell', handIndex: 0, target: 7 })
    expect(effectiveAtk(s, 7)).toBeGreaterThanOrEqual(0)
  })

  it('対象を選ばずに撃つと拒否される', () => {
    let s = mainPhase(['i007'], [], [onField(MONSTERS[0]!.id, 7)])
    s = reduce(s, { type: 'activateSpell', handIndex: 0, target: null })
    expect(s.log.at(-1)?.detail).toContain('対象')
  })

  it('自分の姫神は対象にできない（相手を選ぶ効果）', () => {
    let s = mainPhase(['i007'], [onField(MONSTERS[0]!.id, 5)], [])
    s = reduce(s, { type: 'activateSpell', handIndex: 0, target: 5 })
    // 対象として解決されないので攻撃力は動かない
    expect(effectiveAtk(s, 5)).toBe(MONSTERS[0]!.atk)
  })

  it('グングニルは相手1体を破壊する', () => {
    let s = mainPhase(['i021'], [], [onField(MONSTERS[0]!.id, 7)])
    s = reduce(s, { type: 'activateSpell', handIndex: 0, target: 7 })
    expect(monstersOf(s.players[1]).length).toBe(0)
  })

  it('双面の鏡は相手を守備表示にする', () => {
    let s = mainPhase(['i010'], [], [onField(MONSTERS[0]!.id, 7)])
    s = reduce(s, { type: 'activateSpell', handIndex: 0, target: 7 })
    expect(s.players[1].monsters[0]?.position).toBe('defense')
  })
})

describe('絶技の発動条件（SPEC 6.3）', () => {
  it('対応する姫神が場にいなければ発動できない', () => {
    let s = mainPhase(['u001']) // 天叢焼 requires f002
    s = reduce(s, { type: 'activateSpell', handIndex: 0, target: null })
    expect(s.log.at(-1)?.kind).toBe('rejected')
    expect(s.players[1].lp).toBe(LIFE_POINTS)
  })

  it('対応する姫神が表側でいれば発動できる', () => {
    let s = mainPhase(['u001'], [onField('f002', 5)])
    s = reduce(s, { type: 'activateSpell', handIndex: 0, target: null })
    expect(s.players[1].lp).toBe(LIFE_POINTS - 1600)
  })

  it('裏側では条件を満たさない', () => {
    let s = mainPhase(['u001'], [onField('f002', 5, true)])
    s = reduce(s, { type: 'activateSpell', handIndex: 0, target: null })
    expect(s.log.at(-1)?.kind).toBe('rejected')
  })

  it('ゾーンが3枠あるので、バトル場1枠だった maniwa-tcg より条件が緩い', () => {
    // 3枠目にいても条件を満たす
    let s = mainPhase(['u001'], [onField(MONSTERS[0]!.id, 4), onField(MONSTERS[1]!.id, 5), onField('f002', 6)])
    s = reduce(s, { type: 'activateSpell', handIndex: 0, target: null })
    expect(s.players[1].lp).toBe(LIFE_POINTS - 1600)
  })

  it('蘇生する絶技は、墓地の攻撃力が最大の姫神を戻す', () => {
    const low = MONSTERS.find((m) => m.atk < 1000)!
    const high = [...MONSTERS].sort((a, b) => b.atk - a.atk)[0]!
    let s = mainPhase(['u016'], [onField('f001', 5)])
    s = { ...s, players: [{ ...s.players[0], graveyard: [low.id, high.id] }, s.players[1]] }
    s = reduce(s, { type: 'activateSpell', handIndex: 0, target: null })
    expect(monstersOf(s.players[0]).some((m) => m.cardId === high.id)).toBe(true)
    expect(s.players[0].graveyard).not.toContain(high.id)
  })
})

describe('legalActions（魔法）', () => {
  it('条件を満たさない絶技は候補に出ない', () => {
    const s = mainPhase(['u001'])
    expect(legalActions(s).some((a) => a.type === 'activateSpell')).toBe(false)
  })

  it('条件を満たせば候補に出る', () => {
    const s = mainPhase(['u001'], [onField('f002', 5)])
    expect(legalActions(s).some((a) => a.type === 'activateSpell')).toBe(true)
  })

  it('対象を選ぶ魔法は、相手がいなければ候補に出ない', () => {
    const s = mainPhase(['i007'], [], [])
    expect(legalActions(s).some((a) => a.type === 'activateSpell')).toBe(false)
  })

  it('返した操作はすべて通る', () => {
    const s = mainPhase(['i019', 'i007', 'u001'], [onField('f002', 5)], [onField(MONSTERS[0]!.id, 7)])
    for (const a of legalActions(s)) {
      expect(reduce(s, a).log.at(-1)?.kind).not.toBe('rejected')
    }
  })
})

describe('魔法のデータ', () => {
  it('v1 はすべて通常魔法（SPEC 6.4）', () => {
    for (const s of SPELLS) expect(s.spellType).toBe('normal')
  })

  it('v1 は継続効果を持たない（SPEC 6.4）', () => {
    for (const s of SPELLS) expect(s.whileOnField).toBeUndefined()
  })

  it('requires を持つのは絶技だけ（SPEC 6.3）', () => {
    for (const s of SPELLS) {
      if (s.requires !== undefined) expect(s.form).toBe('art')
    }
  })

  it('requires の指す姫神が実在する', () => {
    const ids = new Set(MONSTERS.map((m) => m.id))
    for (const s of SPELLS) {
      if (s.requires !== undefined) expect(ids.has(s.requires)).toBe(true)
    }
  })

  it('negateAttack は魔法には入っていない（罠専用・SPEC 7章）', () => {
    for (const s of SPELLS) {
      expect(s.onActivate.some((e) => e.type === 'negateAttack')).toBe(false)
    }
  })
})
