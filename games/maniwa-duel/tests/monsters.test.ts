/**
 * 姫神87体の数値が、SPEC 6.1 の取り決めから外れていないこと。
 *
 * 値そのものは maniwa-tcg から機械的に起こしたたたき台なので、
 * **個別の値ではなく、守るべき性質のほうをテストする。**
 */
import { describe, expect, it } from 'vitest'
import { MONSTERS } from '../src/data/monsters.ts'
import { ALL_CARDS, CARD_INDEX, findMonster } from '../src/data/cards.ts'
import { tributesRequired } from '../src/core/types.ts'

describe('姫神のデータ', () => {
  it('87体ある', () => {
    expect(MONSTERS.length).toBe(87)
  })

  it('IDが重複しない', () => {
    expect(new Set(MONSTERS.map((m) => m.id)).size).toBe(MONSTERS.length)
  })

  it('攻撃力・守備力が負値でも NaN でもない', () => {
    for (const m of MONSTERS) {
      expect(Number.isFinite(m.atk)).toBe(true)
      expect(Number.isFinite(m.def)).toBe(true)
      expect(m.atk).toBeGreaterThan(0)
      expect(m.def).toBeGreaterThan(0)
    }
  })

  it('攻撃力・守備力が10の倍数（SPEC 6.1 の丸め）', () => {
    for (const m of MONSTERS) {
      expect(m.atk % 10).toBe(0)
      expect(m.def % 10).toBe(0)
    }
  })

  it('レベルがレアリティと対応する（SPEC 6.1）', () => {
    const allowed: Record<string, readonly number[]> = {
      common: [3], rare: [4], superRare: [5, 6], ultra: [7, 8],
    }
    for (const m of MONSTERS) {
      expect(allowed[m.rarity]).toContain(m.level)
    }
  })

  it('レアリティがそのままリリース数になる（SPEC 6.1）', () => {
    for (const m of MONSTERS) {
      const expected = m.rarity === 'ultra' ? 2 : m.rarity === 'superRare' ? 1 : 0
      expect(tributesRequired(m.level)).toBe(expected)
    }
  })

  it('レアリティが上がるほど攻撃力の平均も上がる', () => {
    const avg = (r: string) => {
      const xs = MONSTERS.filter((m) => m.rarity === r)
      return xs.reduce((t, m) => t + m.atk, 0) / xs.length
    }
    expect(avg('ultra')).toBeGreaterThan(avg('superRare'))
    expect(avg('superRare')).toBeGreaterThan(avg('rare'))
    expect(avg('rare')).toBeGreaterThan(avg('common'))
  })

  it('ライフ4000 に対して、最大の攻撃力でも一撃で倒せない', () => {
    // 一撃必殺があると、引いた順だけで決着してしまう
    expect(Math.max(...MONSTERS.map((m) => m.atk))).toBeLessThan(4000)
  })
})

describe('参照表', () => {
  it('モンスターとして引ける', () => {
    expect(findMonster('f001')?.name).toBe('カグツチ')
  })

  it('無いIDは null を返し、例外を投げない（SPEC 4章）', () => {
    expect(findMonster('zzz999')).toBeNull()
  })

  it('索引に全カードが入っていて、IDが重複していない', () => {
    expect(CARD_INDEX.size).toBe(ALL_CARDS.length)
  })

  it('姫神は全部索引から引ける', () => {
    for (const m of MONSTERS) expect(findMonster(m.id)?.id).toBe(m.id)
  })
})
