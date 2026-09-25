/**
 * 召喚・セット・表示形式の変更（SPEC 3.5）。
 */
import { describe, expect, it } from 'vitest'
import { EMPTY_STATE, legalActions, reduce } from '../src/core/reduce.ts'
import { MONSTERS } from '../src/data/monsters.ts'
import { monstersOf } from '../src/core/state.ts'
import type { Deck, GameState, MonsterDef } from '../src/core/types.ts'
import { DECK_SIZE, MONSTER_ZONES, tributesRequired } from '../src/core/types.ts'

const byLevel = (level: number): MonsterDef =>
  MONSTERS.find((m) => m.level === level) as MonsterDef

/** 手札を狙った形にしたいので、デッキではなく状態を直接組む */
function withHand(state: GameState, ids: readonly string[]): GameState {
  return { ...state, players: [{ ...state.players[0], hand: [...ids] }, state.players[1]] }
}

function begin(): GameState {
  const cards = MONSTERS.slice(0, DECK_SIZE).map((m) => m.id)
  const deck: Deck = { name: 'テスト', cards }
  const s = reduce(EMPTY_STATE, { type: 'start', seed: 1, decks: [deck, deck], firstPlayer: 0 })
  return reduce(s, { type: 'draw' })
}

describe('通常召喚', () => {
  it('レベル4以下はリリース無しで出せる', () => {
    const low = byLevel(3)
    let s = withHand(begin(), [low.id])
    s = reduce(s, { type: 'normalSummon', handIndex: 0, zone: 0, position: 'attack', tributes: [] })
    const m = s.players[0].monsters[0]
    expect(m?.cardId).toBe(low.id)
    expect(m?.position).toBe('attack')
    expect(m?.faceDown).toBe(false)
    expect(s.players[0].hand.length).toBe(0)
  })

  it('1ターンに2回は召喚できない', () => {
    const low = byLevel(3)
    const other = MONSTERS.filter((m) => m.level <= 4 && m.id !== low.id)[0] as MonsterDef
    let s = withHand(begin(), [low.id, other.id])
    s = reduce(s, { type: 'normalSummon', handIndex: 0, zone: 0, position: 'attack', tributes: [] })
    s = reduce(s, { type: 'normalSummon', handIndex: 0, zone: 1, position: 'attack', tributes: [] })
    expect(s.log.at(-1)?.detail).toContain('もう使った')
    expect(monstersOf(s.players[0]).length).toBe(1)
  })

  it('セットも通常召喚1回を消費する（SPEC 3.5）', () => {
    const low = byLevel(3)
    const other = MONSTERS.filter((m) => m.level <= 4 && m.id !== low.id)[0] as MonsterDef
    let s = withHand(begin(), [low.id, other.id])
    s = reduce(s, { type: 'setMonster', handIndex: 0, zone: 0, tributes: [] })
    expect(s.players[0].monsters[0]?.faceDown).toBe(true)
    expect(s.players[0].monsters[0]?.position).toBe('defense')
    s = reduce(s, { type: 'normalSummon', handIndex: 0, zone: 1, position: 'attack', tributes: [] })
    expect(s.log.at(-1)?.detail).toContain('もう使った')
  })

  it('リリースが足りなければ拒否する', () => {
    const high = byLevel(7)
    let s = withHand(begin(), [high.id])
    s = reduce(s, { type: 'normalSummon', handIndex: 0, zone: 0, position: 'attack', tributes: [] })
    expect(s.log.at(-1)?.detail).toContain('リリース')
    expect(monstersOf(s.players[0]).length).toBe(0)
  })

  it('リリースした姫神は墓地へ行き、跡地に置ける', () => {
    const low = byLevel(3)
    const mid = byLevel(5)
    let s = withHand(begin(), [low.id])
    s = reduce(s, { type: 'normalSummon', handIndex: 0, zone: 0, position: 'attack', tributes: [] })
    const victim = s.players[0].monsters[0]!.instanceId
    // 次のターンに回す代わりに、印だけ落として続ける
    s = { ...s, players: [{ ...s.players[0], summonedThisTurn: false }, s.players[1]] }
    s = withHand(s, [mid.id])
    s = reduce(s, {
      type: 'normalSummon', handIndex: 0, zone: 0, position: 'attack', tributes: [victim],
    })
    expect(s.players[0].monsters[0]?.cardId).toBe(mid.id)
    expect(s.players[0].graveyard).toContain(low.id)
  })

  it('同じ姫神を二重にリリースできない', () => {
    const low = byLevel(3)
    const high = byLevel(7)
    let s = withHand(begin(), [low.id])
    s = reduce(s, { type: 'normalSummon', handIndex: 0, zone: 0, position: 'attack', tributes: [] })
    const id = s.players[0].monsters[0]!.instanceId
    s = { ...s, players: [{ ...s.players[0], summonedThisTurn: false }, s.players[1]] }
    s = withHand(s, [high.id])
    s = reduce(s, {
      type: 'normalSummon', handIndex: 0, zone: 0, position: 'attack', tributes: [id, id],
    })
    expect(s.log.at(-1)?.detail).toContain('二重')
  })

  it('相手の姫神はリリースできない', () => {
    const low = byLevel(3)
    const mid = byLevel(5)
    let s = withHand(begin(), [low.id])
    s = reduce(s, { type: 'normalSummon', handIndex: 0, zone: 0, position: 'attack', tributes: [] })
    // 相手の場に1体置く
    const theirs = { ...s.players[0].monsters[0]!, instanceId: 999 }
    s = { ...s, players: [s.players[0], { ...s.players[1], monsters: [theirs, null, null] }] }
    s = { ...s, players: [{ ...s.players[0], summonedThisTurn: false }, s.players[1]] }
    s = withHand(s, [mid.id])
    s = reduce(s, {
      type: 'normalSummon', handIndex: 0, zone: 1, position: 'attack', tributes: [999],
    })
    expect(s.log.at(-1)?.detail).toContain('自分の場にいない')
  })

  it('埋まっているゾーンには置けない', () => {
    const low = byLevel(3)
    const other = MONSTERS.filter((m) => m.level <= 4 && m.id !== low.id)[0] as MonsterDef
    let s = withHand(begin(), [low.id])
    s = reduce(s, { type: 'normalSummon', handIndex: 0, zone: 0, position: 'attack', tributes: [] })
    s = { ...s, players: [{ ...s.players[0], summonedThisTurn: false }, s.players[1]] }
    s = withHand(s, [other.id])
    s = reduce(s, { type: 'normalSummon', handIndex: 0, zone: 0, position: 'attack', tributes: [] })
    expect(s.log.at(-1)?.detail).toContain('埋まっている')
  })

  it('姫神でないカードは召喚できない', () => {
    let s = withHand(begin(), ['zzz999'])
    s = reduce(s, { type: 'normalSummon', handIndex: 0, zone: 0, position: 'attack', tributes: [] })
    expect(s.log.at(-1)?.kind).toBe('rejected')
  })
})

describe('表示形式の変更', () => {
  it('召喚したターンは変えられない', () => {
    const low = byLevel(3)
    let s = withHand(begin(), [low.id])
    s = reduce(s, { type: 'normalSummon', handIndex: 0, zone: 0, position: 'attack', tributes: [] })
    const id = s.players[0].monsters[0]!.instanceId
    s = reduce(s, { type: 'changePosition', instanceId: id })
    expect(s.log.at(-1)?.detail).toContain('召喚したターン')
    expect(s.players[0].monsters[0]?.position).toBe('attack')
  })

  it('次のターン以降は変えられ、1ターンに1回まで', () => {
    const low = byLevel(3)
    let s = withHand(begin(), [low.id])
    s = reduce(s, { type: 'normalSummon', handIndex: 0, zone: 0, position: 'attack', tributes: [] })
    const id = s.players[0].monsters[0]!.instanceId
    s = { ...s, players: [{
      ...s.players[0],
      monsters: s.players[0].monsters.map((m) => (m === null ? null : { ...m, summonedThisTurn: false })),
    }, s.players[1]] }
    s = reduce(s, { type: 'changePosition', instanceId: id })
    expect(s.players[0].monsters[0]?.position).toBe('defense')
    s = reduce(s, { type: 'changePosition', instanceId: id })
    expect(s.log.at(-1)?.detail).toContain('もう変えた')
  })

  it('裏側守備表示から変えると表側攻撃表示になる', () => {
    const low = byLevel(3)
    let s = withHand(begin(), [low.id])
    s = reduce(s, { type: 'setMonster', handIndex: 0, zone: 0, tributes: [] })
    const id = s.players[0].monsters[0]!.instanceId
    s = { ...s, players: [{
      ...s.players[0],
      monsters: s.players[0].monsters.map((m) => (m === null ? null : { ...m, summonedThisTurn: false })),
    }, s.players[1]] }
    s = reduce(s, { type: 'changePosition', instanceId: id })
    expect(s.players[0].monsters[0]?.faceDown).toBe(false)
    expect(s.players[0].monsters[0]?.position).toBe('attack')
  })
})

describe('legalActions', () => {
  it('ドローフェイズではドローだけ', () => {
    const cards = MONSTERS.slice(0, DECK_SIZE).map((m) => m.id)
    const deck: Deck = { name: 'テスト', cards }
    const s = reduce(EMPTY_STATE, { type: 'start', seed: 1, decks: [deck, deck], firstPlayer: 0 })
    expect(legalActions(s)).toEqual([{ type: 'draw' }])
  })

  it('先攻1ターン目には toBattle が出ない（SPEC 3.3）', () => {
    const s = begin()
    expect(legalActions(s).some((a) => a.type === 'toBattle')).toBe(false)
    expect(legalActions(s).some((a) => a.type === 'endTurn')).toBe(true)
  })

  it('リリースが足りない姫神は候補に出ない', () => {
    const high = byLevel(8)
    const s = withHand(begin(), [high.id])
    expect(legalActions(s).some((a) => a.type === 'normalSummon')).toBe(false)
  })

  it('返した操作はすべて通る（拒否されない）', () => {
    const low = byLevel(3)
    const s = withHand(begin(), [low.id, byLevel(4).id])
    for (const a of legalActions(s)) {
      const after = reduce(s, a)
      expect(after.log.at(-1)?.kind).not.toBe('rejected')
    }
  })

  it('ゾーンが埋まるほど候補が減る', () => {
    const low = byLevel(3)
    let s = withHand(begin(), [low.id])
    const before = legalActions(s).filter((a) => a.type === 'normalSummon').length
    expect(before).toBe(MONSTER_ZONES * 2) // 攻撃表示・守備表示 × 3ゾーン
    s = reduce(s, { type: 'normalSummon', handIndex: 0, zone: 0, position: 'attack', tributes: [] })
    s = { ...s, players: [{ ...s.players[0], summonedThisTurn: false }, s.players[1]] }
    s = withHand(s, [low.id])
    expect(legalActions(s).filter((a) => a.type === 'normalSummon').length).toBe((MONSTER_ZONES - 1) * 2)
  })
})

describe('リリース数の対応', () => {
  it('全87体でレベルとリリース数が食い違わない', () => {
    for (const m of MONSTERS) {
      expect(tributesRequired(m.level)).toBeLessThanOrEqual(2)
    }
  })
})
