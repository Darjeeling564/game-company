/**
 * 開始・ドロー・ターン進行・勝敗（SPEC 3.3・3.4・3.7）。
 *
 * 召喚もバトルもまだ無いので、**ターンを渡し続けるだけ**の対局を回して
 * 境界の振る舞いを確かめる。
 */
import { describe, expect, it } from 'vitest'
import { EMPTY_STATE, isOver, reduce } from '../src/core/reduce.ts'
import { MONSTERS } from '../src/data/monsters.ts'
import type { Deck, GameState } from '../src/core/types.ts'
import { DECK_SIZE, HAND_SIZE_AT_START, LIFE_POINTS, MAX_TURNS } from '../src/core/types.ts'

/** 同名2枚までを守った20枚。v1 のデッキ（SPEC 3.1）とは別の、テスト用の並び */
function testDeck(offset: number, name = 'テスト'): Deck {
  const ids = MONSTERS.slice(offset, offset + DECK_SIZE).map((m) => m.id)
  return { name, cards: ids }
}

function begin(seed = 1, firstPlayer: 0 | 1 = 0): GameState {
  return reduce(EMPTY_STATE, {
    type: 'start', seed, decks: [testDeck(0, '先'), testDeck(30, '後')], firstPlayer,
  })
}

/**
 * 何もせずターンを渡し続ける。
 *
 * 引くだけで捨てないと手札が7枚を超えてエンドフェイズで止まるので、
 * **上限処理も回す**。止まったまま回し続けると決着しない。
 */
function passUntilOver(start: GameState, limit = 500): GameState {
  let s = start
  for (let i = 0; i < limit && !isOver(s); i += 1) {
    if (s.phase === 'draw') s = reduce(s, { type: 'draw' })
    else if (s.phase === 'end') s = reduce(s, { type: 'discardToLimit', handIndex: 0 })
    else s = reduce(s, { type: 'endTurn' })
  }
  return s
}

describe('start', () => {
  it('両者が4枚引き、デッキは16枚になる（SPEC 3.3）', () => {
    const s = begin()
    for (const p of [0, 1] as const) {
      expect(s.players[p].hand.length).toBe(HAND_SIZE_AT_START)
      expect(s.players[p].deck.length).toBe(DECK_SIZE - HAND_SIZE_AT_START)
    }
  })

  it('ライフは4000から始まる', () => {
    const s = begin()
    expect(s.players[0].lp).toBe(LIFE_POINTS)
    expect(s.players[1].lp).toBe(LIFE_POINTS)
  })

  it('ターン1・先攻の手番・ドローフェイズから始まる', () => {
    const s = begin(1, 1)
    expect(s.turn).toBe(1)
    expect(s.turnPlayer).toBe(1)
    expect(s.priority).toBe(1)
    expect(s.phase).toBe('draw')
  })

  it('同じシードなら同じ手札になる', () => {
    expect(begin(777).players[0].hand).toEqual(begin(777).players[0].hand)
  })

  it('違うシードなら並びが変わる', () => {
    expect(begin(1).players[0].deck).not.toEqual(begin(2).players[0].deck)
  })

  it('20枚でないデッキは拒否し、状態を壊さない（SPEC 4章）', () => {
    const bad: Deck = { name: '短い', cards: MONSTERS.slice(0, 5).map((m) => m.id) }
    const s = reduce(EMPTY_STATE, { type: 'start', seed: 1, decks: [bad, bad], firstPlayer: 0 })
    expect(s.log.at(-1)?.kind).toBe('rejected')
    expect(s.turn).toBe(0)
  })

  it('同名3枚のデッキは拒否する（SPEC 3.1）', () => {
    const id = MONSTERS[0]!.id
    const cards = [id, id, id, ...MONSTERS.slice(1, 18).map((m) => m.id)]
    const bad: Deck = { name: '3枚', cards }
    expect(bad.cards.length).toBe(DECK_SIZE)
    const s = reduce(EMPTY_STATE, { type: 'start', seed: 1, decks: [bad, bad], firstPlayer: 0 })
    expect(s.log.at(-1)?.detail).toContain('同名')
  })
})

describe('ドローフェイズ', () => {
  it('先攻1ターン目は引かない（SPEC 3.3）', () => {
    const s = reduce(begin(1, 0), { type: 'draw' })
    expect(s.players[0].hand.length).toBe(HAND_SIZE_AT_START)
    expect(s.phase).toBe('main')
  })

  it('後攻1ターン目は引く', () => {
    let s = begin(1, 0)
    s = reduce(s, { type: 'draw' })
    s = reduce(s, { type: 'endTurn' })
    expect(s.turnPlayer).toBe(1)
    s = reduce(s, { type: 'draw' })
    expect(s.players[1].hand.length).toBe(HAND_SIZE_AT_START + 1)
  })

  it('ドローフェイズ以外では拒否する', () => {
    let s = reduce(begin(), { type: 'draw' })
    s = reduce(s, { type: 'draw' })
    expect(s.log.at(-1)?.kind).toBe('rejected')
  })
})

describe('先攻1ターン目のバトル', () => {
  it('先攻はバトルフェイズに入れない（SPEC 3.3）', () => {
    let s = reduce(begin(1, 0), { type: 'draw' })
    s = reduce(s, { type: 'toBattle' })
    expect(s.phase).toBe('main')
    expect(s.log.at(-1)?.detail).toContain('先攻1ターン目')
  })

  it('後攻は1ターン目でもバトルフェイズに入れる', () => {
    let s = begin(1, 0)
    s = reduce(s, { type: 'draw' })
    s = reduce(s, { type: 'endTurn' })
    s = reduce(s, { type: 'draw' })
    s = reduce(s, { type: 'toBattle' })
    expect(s.phase).toBe('battle')
  })
})

describe('決着', () => {
  it('引けなくなった側が負ける（SPEC 3.7）', () => {
    const s = passUntilOver(begin())
    expect(isOver(s)).toBe(true)
    expect(s.endReason).toBe('deckOut')
    expect(s.winner).not.toBeNull()
  })

  it('同じシードなら同じ決着になる（決定論）', () => {
    const a = passUntilOver(begin(4242))
    const b = passUntilOver(begin(4242))
    expect(a.turn).toBe(b.turn)
    expect(a.winner).toBe(b.winner)
    expect(a.log.length).toBe(b.log.length)
  })

  it('デッキ切れはターン上限より先に来る（SPEC 3.7）', () => {
    const s = passUntilOver(begin())
    expect(s.endReason).not.toBe('turnLimit')
    expect(s.turn).toBeLessThan(MAX_TURNS)
  })

  it('終了後の操作は状態を変えない', () => {
    const s = passUntilOver(begin())
    const after = reduce(s, { type: 'draw' })
    expect(after.winner).toBe(s.winner)
    expect(after.turn).toBe(s.turn)
    expect(after.log.at(-1)?.kind).toBe('rejected')
  })
})

describe('手札上限', () => {
  it('7枚以上あるとエンドフェイズで止まり、捨てると相手のターンになる（SPEC 3.4）', () => {
    // 手札を増やすため、ドローだけを繰り返してから終了する
    let s = begin(1, 0)
    s = reduce(s, { type: 'draw' })
    // 手札を7枚に膨らませた状態を直接作る（召喚がまだ無いため）
    const side = s.players[0]
    const extra = side.deck.slice(0, 3)
    s = {
      ...s,
      players: [{ ...side, hand: [...side.hand, ...extra], deck: side.deck.slice(3) }, s.players[1]],
    }
    expect(s.players[0].hand.length).toBe(7)
    s = reduce(s, { type: 'endTurn' })
    expect(s.phase).toBe('end')
    expect(s.turnPlayer).toBe(0)
    s = reduce(s, { type: 'discardToLimit', handIndex: 0 })
    expect(s.players[0].hand.length).toBe(6)
    expect(s.turnPlayer).toBe(1)
    expect(s.phase).toBe('draw')
  })

  it('捨てる必要が無いときは拒否する', () => {
    let s = reduce(begin(), { type: 'draw' })
    s = reduce(s, { type: 'discardToLimit', handIndex: 0 })
    expect(s.log.at(-1)?.kind).toBe('rejected')
  })
})

describe('ターンの印', () => {
  it('ターンが変わるたびに summonedThisTurn が落ちる', () => {
    let s = reduce(begin(), { type: 'draw' })
    s = { ...s, players: [{ ...s.players[0], summonedThisTurn: true }, s.players[1]] }
    s = reduce(s, { type: 'endTurn' })
    expect(s.players[0].summonedThisTurn).toBe(false)
  })
})
