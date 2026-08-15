import { describe, expect, it } from 'vitest'
import { createRng, flipCoin, flipCoins, next, nextInt, pick, shuffle } from '../src/core/rng.ts'

describe('createRng', () => {
  it('シード0を不動点にせず、別の値へ正規化する', () => {
    expect(createRng(0).seed).not.toBe(0)
    expect(next(createRng(0)).value).not.toBe(0)
  })

  it('同じシードからは同じ状態を作る', () => {
    expect(createRng(12345)).toEqual(createRng(12345))
  })

  it('負値や小数も32bit符号なしに正規化する', () => {
    expect(createRng(-1).seed).toBe(0xffffffff)
    expect(createRng(7.9).seed).toBe(7)
  })
})

describe('next', () => {
  it('同一シードから同一の系列を生成する', () => {
    const take = (n: number) => {
      let rng = createRng(42)
      const out: number[] = []
      for (let i = 0; i < n; i += 1) {
        const r = next(rng)
        rng = r.rng
        out.push(r.value)
      }
      return out
    }
    expect(take(50)).toEqual(take(50))
  })

  it('異なるシードでは異なる系列になる', () => {
    expect(next(createRng(1)).value).not.toBe(next(createRng(2)).value)
  })

  it('引数の Rng を書き換えない', () => {
    const rng = createRng(99)
    next(rng)
    expect(rng.seed).toBe(createRng(99).seed)
  })

  it('32bit 符号なしの範囲に収まる', () => {
    let rng = createRng(7)
    for (let i = 0; i < 200; i += 1) {
      const r = next(rng)
      rng = r.rng
      expect(Number.isInteger(r.value)).toBe(true)
      expect(r.value).toBeGreaterThanOrEqual(0)
      expect(r.value).toBeLessThanOrEqual(0xffffffff)
    }
  })

  it('短い周期に落ちない', () => {
    let rng = createRng(1)
    const seen = new Set<number>()
    for (let i = 0; i < 1000; i += 1) {
      const r = next(rng)
      rng = r.rng
      seen.add(r.value)
    }
    expect(seen.size).toBe(1000)
  })
})

describe('nextInt', () => {
  it('0 以上 maxExclusive 未満を返す', () => {
    let rng = createRng(3)
    for (let i = 0; i < 500; i += 1) {
      const r = nextInt(rng, 6)
      rng = r.rng
      expect(r.value).toBeGreaterThanOrEqual(0)
      expect(r.value).toBeLessThan(6)
    }
  })

  it('max が 1 以下なら 0 を返し、乱数を消費しない', () => {
    const rng = createRng(3)
    expect(nextInt(rng, 1)).toEqual({ rng, value: 0 })
    expect(nextInt(rng, 0)).toEqual({ rng, value: 0 })
  })
})

describe('flipCoin / flipCoins', () => {
  it('表裏がおおよそ半々になる', () => {
    let rng = createRng(2024)
    let heads = 0
    const n = 10000
    for (let i = 0; i < n; i += 1) {
      const r = flipCoin(rng)
      rng = r.rng
      if (r.heads) heads += 1
    }
    expect(heads / n).toBeGreaterThan(0.45)
    expect(heads / n).toBeLessThan(0.55)
  })

  it('flipCoins は 0〜count の範囲を返す', () => {
    let rng = createRng(5)
    for (let i = 0; i < 100; i += 1) {
      const r = flipCoins(rng, 3)
      rng = r.rng
      expect(r.heads).toBeGreaterThanOrEqual(0)
      expect(r.heads).toBeLessThanOrEqual(3)
    }
  })

  it('flipCoins(0) は乱数を消費しない', () => {
    const rng = createRng(5)
    expect(flipCoins(rng, 0)).toEqual({ rng, heads: 0 })
  })
})

describe('shuffle', () => {
  const source = Array.from({ length: 20 }, (_, i) => i)

  it('入力配列を書き換えない', () => {
    const input = source.slice()
    shuffle(createRng(1), input)
    expect(input).toEqual(source)
  })

  it('要素の多重集合が変わらない', () => {
    const { items } = shuffle(createRng(77), source)
    expect([...items].sort((a, b) => a - b)).toEqual(source)
  })

  it('同じシードなら同じ並びになる', () => {
    expect(shuffle(createRng(5), source).items).toEqual(shuffle(createRng(5), source).items)
  })

  it('実際に並びが変わる', () => {
    expect(shuffle(createRng(5), source).items).not.toEqual(source)
  })

  it('空配列・1要素でも壊れない', () => {
    expect(shuffle(createRng(1), []).items).toEqual([])
    expect(shuffle(createRng(1), ['a']).items).toEqual(['a'])
  })
})

describe('pick', () => {
  it('要素のいずれかを返す', () => {
    const { item } = pick(createRng(9), ['a', 'b', 'c'])
    expect(['a', 'b', 'c']).toContain(item)
  })

  it('空配列では null を返し、乱数を消費しない', () => {
    const rng = createRng(9)
    expect(pick(rng, [])).toEqual({ rng, item: null })
  })
})
