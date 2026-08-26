/**
 * 絶技のデータ検査（SPEC 16.5）。
 *
 * 効率比は `tools/ultimate-check.ts`、レアリティは `tools/rarity.ts` が見るが、
 * **どちらも「誰に付けたか」は見ない**。requires の指定が壊れていても、
 * 数値だけは基準内に収まってしまう。ここがその穴を塞ぐ。
 */
import { describe, expect, it } from 'vitest'
import { requireCreature } from '../src/data/cards.ts'
import { ULTIMATES } from '../src/data/support.ts'

describe('絶技', () => {
  it('requires が実在する姫神を指している', () => {
    const broken = ULTIMATES.filter((u) => {
      try {
        requireCreature(u.requires)
        return false
      } catch {
        return true
      }
    }).map((u) => `${u.id} ${u.name} → ${u.requires}`)
    expect(broken).toEqual([])
  })

  /**
   * SPEC 16.5.3。無属性は全8デッキに入る共通枠なので、絶技を付けると
   * どのデッキからでも撃ててしまい「1デッキ＝1絶技」の設計が崩れる。
   *
   * そのうえ pool-decks.ts の抽選が無属性を絶技の候補に含めないため、
   * プールデッキでは一度も選ばれない完全な死に札になる。
   * pool-decks.test.ts の「全カードが選ばれる」でも落ちるが、
   * あちらは原因が読み取れないので、ここで名指しする。
   */
  it('無属性の姫神には付いていない（SPEC 16.5.3）', () => {
    const wrong = ULTIMATES
      .filter((u) => requireCreature(u.requires).type === 'colorless')
      .map((u) => `${u.id} ${u.name} → ${u.requires} ${requireCreature(u.requires).name}（無属性）`)
    expect(wrong).toEqual([])
  })

  /**
   * SPEC 16.5.1〜16.5.2。最強ワザがコスト3でない姫神に付けると、
   * 効率比 1.05〜1.30 をほぼ満たせない。満たせても不健全な数値になる。
   */
  it('対応姫神の最強ワザがコスト3である（SPEC 16.5.2）', () => {
    const wrong: string[] = []
    for (const u of ULTIMATES) {
      const creature = requireCreature(u.requires)
      // 「最強」は威力ではなくコストの最大値で見る。評価値は ai.ts 側の責務
      const maxCost = Math.max(...creature.attacks.map((a) => a.cost.length))
      if (maxCost !== 3) wrong.push(`${u.id} ${u.name} → ${creature.name} の最大コストが ${maxCost}`)
    }
    expect(wrong).toEqual([])
  })
})
