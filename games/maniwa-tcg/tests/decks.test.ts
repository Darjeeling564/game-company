/**
 * プリセットデッキそのものの検査。
 *
 * 他のテストはデッキを使って対戦させるので、デッキが不正だと
 * 「カード総数が 0」（＝試合が開始できていない）という無関係な表示になり、
 * 何が壊れたのか読み取れない。ここで先にデッキ自体を見て、原因を名指しする。
 */
import { describe, expect, it } from 'vitest'
import { validateDeck } from '../src/core/reduce.ts'
import { DECK_SIZE } from '../src/core/types.ts'
import { requireCard } from '../src/data/cards.ts'
import { DECKS } from '../src/data/decks.ts'

describe('プリセットデッキ', () => {
  it('8デッキある', () => {
    expect(DECKS).toHaveLength(8)
  })

  for (const deck of DECKS) {
    describe(deck.name, () => {
      /**
       * 属性にキャラを足すと基準デッキが21枚になる事故を、ここで止める。
       * decks.ts の MAIN_PER_DECK がその防波堤になっている
       */
      it(`${DECK_SIZE}枚ちょうど`, () => {
        expect(deck.cards.length).toBe(DECK_SIZE)
      })

      it('ルール上正しい（validateDeck が通る）', () => {
        expect(validateDeck(deck)).toEqual([])
      })

      it('内訳が 姫神8 / 無4 / 神具3 / 道標3 / 絶技2', () => {
        const count = { creature: 0, colorless: 0, item: 0, action: 0, ultimate: 0 }
        for (const id of deck.cards) {
          const card = requireCard(id)
          if (card.kind !== 'creature') {
            count[card.kind] += 1
          } else if (card.type === 'colorless') {
            count.colorless += 1
          } else {
            count.creature += 1
          }
        }
        expect(count).toEqual({ creature: 8, colorless: 4, item: 3, action: 3, ultimate: 2 })
      })

      it('専用キャラはデッキの属性でそろっている', () => {
        const wrong = deck.cards
          .map((id) => requireCard(id))
          .filter((c) => c.kind === 'creature' && c.type !== 'colorless' && c.type !== deck.energy[0])
          .map((c) => c.id)
        expect(wrong).toEqual([])
      })
    })
  }
})
