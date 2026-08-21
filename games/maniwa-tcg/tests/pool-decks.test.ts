/**
 * プールデッキの検査（SPEC 3.1.1）。
 *
 * プールデッキは抽選で組むので、基準デッキと違って「壊れた組み合わせ」が出うる。
 * 20枚ちょうど・同名2枚まで・絶技と対応キャラの同居、といった条件を
 * どのシードでも満たすことをここで担保する。
 */
import { describe, expect, it } from 'vitest'
import { validateDeck } from '../src/core/reduce.ts'
import { DECK_SIZE } from '../src/core/types.ts'
import { CARDS, requireCard } from '../src/data/cards.ts'
import { POOL_TYPES, buildPoolDeck, buildPoolDecks } from '../src/data/pool-decks.ts'

const SEEDS = [1, 2, 3, 42, 20260822, 999983]

describe('プールデッキ', () => {
  it('8属性ぶん作られる', () => {
    expect(buildPoolDecks(1)).toHaveLength(POOL_TYPES.length)
  })

  it.each(SEEDS)('seed=%i: どのデッキもルール上正しい', (seed) => {
    for (const deck of buildPoolDecks(seed)) {
      expect(deck.cards.length, `${deck.name} の枚数`).toBe(DECK_SIZE)
      expect(validateDeck(deck), `${deck.name} の検証`).toEqual([])
    }
  })

  it.each(SEEDS)('seed=%i: 絶技には対応する姫神が同居している', (seed) => {
    for (const deck of buildPoolDecks(seed)) {
      const inDeck = new Set(deck.cards)
      for (const id of deck.cards) {
        const card = requireCard(id)
        if (card.kind !== 'ultimate') continue
        expect(inDeck.has(card.requires), `${deck.name}: ${card.name} に ${card.requires} が無い`).toBe(true)
      }
    }
  })

  it.each(SEEDS)('seed=%i: 専用キャラ枠はデッキの属性でそろっている', (seed) => {
    for (const deck of buildPoolDecks(seed)) {
      const wrong = deck.cards
        .map((id) => requireCard(id))
        .filter((c) => c.kind === 'creature' && c.type !== 'colorless' && c.type !== deck.energy[0])
        .map((c) => c.id)
      expect(wrong, `${deck.name} に別属性の姫神`).toEqual([])
    }
  })

  it('同じシードなら同じデッキになる（決定論）', () => {
    expect(buildPoolDeck('fire', 12345).cards).toEqual(buildPoolDeck('fire', 12345).cards)
  })

  it('シードを変えると別の抽選結果になる', () => {
    const a = buildPoolDeck('fire', 1).cards.join()
    const b = buildPoolDeck('fire', 2).cards.join()
    expect(a).not.toBe(b)
  })

  /**
   * 抽選が一様であることの担保。強さで選ぶと弱いカードが永久に測れなくなるため、
   * 「十分な回数引けば全カードが出る」ことを条件にしている（SPEC 3.1.1）
   */
  it('回数を重ねればプール内のカードが全て選ばれる', () => {
    const seen = new Set<string>()
    for (let seed = 1; seed <= 200; seed += 1) {
      for (const deck of buildPoolDecks(seed)) for (const id of deck.cards) seen.add(id)
    }
    // 基準デッキに入っていないカードでも、抽選なら必ずどこかで出る
    const never = CARDS.filter((c) => !seen.has(c.id)).map((c) => `${c.id} ${c.name}`)
    expect(never).toEqual([])
  })
})
