/**
 * 戦闘計算（SPEC 3.6）を全パターン。
 *
 * この表はゲームの中心なので、実装より先に表のとおり書いてある。
 */
import { describe, expect, it } from 'vitest'
import { battleResult } from '../src/core/rules.ts'

describe('battleResult — 相手が攻撃表示', () => {
  it('攻撃力が上なら相手を破壊し、差が相手のライフへ', () => {
    expect(battleResult(2000, 1500, 999, 'attack')).toEqual({
      destroyed: 'defender', damageTo: 'defender', damage: 500,
    })
  })

  it('攻撃力が下なら自分が破壊され、差が自分のライフへ', () => {
    expect(battleResult(1200, 1800, 999, 'attack')).toEqual({
      destroyed: 'attacker', damageTo: 'attacker', damage: 600,
    })
  })

  it('同値なら両方破壊され、ダメージは無い', () => {
    expect(battleResult(1500, 1500, 999, 'attack')).toEqual({
      destroyed: 'both', damageTo: null, damage: 0,
    })
  })

  it('守備力は参照しない', () => {
    const a = battleResult(2000, 1500, 0, 'attack')
    const b = battleResult(2000, 1500, 9999, 'attack')
    expect(a).toEqual(b)
  })
})

describe('battleResult — 相手が守備表示', () => {
  it('攻撃力が守備力を上回れば破壊するが、ダメージは出ない（貫通なし）', () => {
    expect(battleResult(2000, 999, 1500, 'defense')).toEqual({
      destroyed: 'defender', damageTo: null, damage: 0,
    })
  })

  it('攻撃力が守備力を下回れば、攻撃した側が差を受ける', () => {
    expect(battleResult(1200, 999, 1800, 'defense')).toEqual({
      destroyed: 'none', damageTo: 'attacker', damage: 600,
    })
  })

  it('同値なら何も起きない', () => {
    expect(battleResult(1500, 999, 1500, 'defense')).toEqual({
      destroyed: 'none', damageTo: null, damage: 0,
    })
  })

  it('相手の攻撃力は参照しない', () => {
    const a = battleResult(1200, 0, 1800, 'defense')
    const b = battleResult(1200, 9999, 1800, 'defense')
    expect(a).toEqual(b)
  })
})

describe('battleResult — 守るべき性質', () => {
  it('ダメージが負値や NaN にならない', () => {
    for (const atk of [0, 100, 1200, 2400, 4000]) {
      for (const d of [0, 100, 1200, 2400, 4000]) {
        for (const pos of ['attack', 'defense'] as const) {
          const r = battleResult(atk, d, d, pos)
          expect(Number.isFinite(r.damage)).toBe(true)
          expect(r.damage).toBeGreaterThanOrEqual(0)
        }
      }
    }
  })

  it('ダメージが出るときは必ず受け手が決まっている', () => {
    for (const atk of [0, 800, 1600, 2400]) {
      for (const d of [0, 800, 1600, 2400]) {
        for (const pos of ['attack', 'defense'] as const) {
          const r = battleResult(atk, d, d, pos)
          if (r.damage > 0) expect(r.damageTo).not.toBeNull()
          if (r.damageTo === null) expect(r.damage).toBe(0)
        }
      }
    }
  })

  it('守備表示の相手からは、攻撃した側しかダメージを受けない', () => {
    for (const atk of [0, 800, 1600, 2400]) {
      for (const def of [0, 800, 1600, 2400]) {
        const r = battleResult(atk, 0, def, 'defense')
        expect(r.damageTo).not.toBe('defender')
      }
    }
  })
})
