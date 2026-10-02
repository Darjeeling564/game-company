/**
 * 姫神の効果（SPEC 19）。
 *
 * **core だけを対象にする**（CLAUDE.md 2章）。描画は見ない。
 */
import { describe, expect, it } from 'vitest'
import { needsChoice } from '../src/core/effects.ts'
import { MONSTERS } from '../src/data/monsters.ts'
import { EMPTY_STATE, isOver, reduce } from '../src/core/reduce.ts'
import { createRng } from '../src/core/rng.ts'
import { greedyPolicy } from '../tools/ai.ts'
import { FIRE_DECK, WATER_DECK } from '../src/data/decks.ts'
import type { MonsterDef } from '../src/core/types.ts'

const withEffect = MONSTERS.filter(
  (m) => m.onSummon !== undefined || m.onDestroyed !== undefined,
)

describe('姫神の効果', () => {
  it('効果を持つ姫神が1体以上いる', () => {
    expect(withEffect.length).toBeGreaterThan(0)
  })

  /**
   * SPEC 19.4。姫神の効果は勝手に発動するので、1体を選ぶ機会が無い。
   * **選ぶ効果を書くと黙って不発になる**ので、データの側で禁じる。
   */
  it('1体を選ぶ効果を持たない（SPEC 19.4）', () => {
    const bad: string[] = []
    for (const m of withEffect) {
      for (const list of [m.onSummon, m.onDestroyed]) {
        if (list !== undefined && needsChoice(list)) bad.push(`${m.id} ${m.name}`)
      }
    }
    expect(bad).toEqual([])
  })

  it('効果は空配列ではない（書き忘れを拾う）', () => {
    for (const m of withEffect) {
      if (m.onSummon !== undefined) expect(m.onSummon.length).toBeGreaterThan(0)
      if (m.onDestroyed !== undefined) expect(m.onDestroyed.length).toBeGreaterThan(0)
    }
  })

  /**
   * 回復が相手の削りより大きいと、互いに削れない膠着が生まれる。
   * maniwa-tcg SPEC 8.2 と同じ趣旨の歯止めを、姫神の効果にも当てる。
   */
  it('自分を回復する効果が、1回の攻撃の打点を超えない', () => {
    for (const m of withEffect) {
      for (const e of [...(m.onSummon ?? []), ...(m.onDestroyed ?? [])]) {
        if (e.type === 'lifeHeal' && e.target === 'self') {
          expect(e.value).toBeLessThanOrEqual((m as MonsterDef).atk)
        }
      }
    }
  })
})

/**
 * 召喚時の効果が実際に動くこと。**シードを固定して決定論で見る。**
 */
describe('召喚時の効果が実際に動く', () => {
  /**
   * **本物の対戦を回して、効果が実際に発動していることを見る。**
   * 手で状態を組み立てると「組み立て方が正しいか」のほうを試してしまう。
   */
  it('貪欲法で回すと、召喚時／破壊時の効果がログに現れる', () => {
    let fired = 0
    for (let seed = 1; seed <= 200 && fired === 0; seed += 1) {
      let state = reduce(EMPTY_STATE, {
        type: 'start', seed, decks: [FIRE_DECK, WATER_DECK], firstPlayer: (seed % 2) as 0 | 1,
      })
      let rng = createRng(seed ^ 0x5151)
      for (let i = 0; i < 4000 && !isOver(state); i += 1) {
        const choice = greedyPolicy(state, rng)
        if (choice === null) break
        rng = choice.rng
        state = reduce(state, choice.action)
      }
      fired += state.log.filter((l) => /の召喚時の効果|の破壊時の効果/.test(l.detail)).length
    }
    expect(fired).toBeGreaterThan(0)
  })

  /**
   * SPEC 19.5 の深さ2段。効果持ちが並んでも reduce が止まらないことを見る。
   * 本式の終局保証は termination.test.ts が1万戦で見ている。
   */
  it('効果が絡んでも決着する', () => {
    let state = reduce(EMPTY_STATE, {
      type: 'start', seed: 1234, decks: [FIRE_DECK, WATER_DECK], firstPlayer: 0,
    })
    let rng = createRng(99)
    let steps = 0
    for (; steps < 6000 && !isOver(state); steps += 1) {
      const choice = greedyPolicy(state, rng)
      if (choice === null) break
      rng = choice.rng
      state = reduce(state, choice.action)
    }
    expect(isOver(state)).toBe(true)
    expect(steps).toBeLessThan(6000)
  })
})
