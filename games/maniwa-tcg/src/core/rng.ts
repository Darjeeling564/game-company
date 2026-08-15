/**
 * シード付きPRNG（xorshift32）。
 *
 * core 層は純粋関数のみで構成するため、乱数は Math.random ではなく
 * 状態として持ち回る（CLAUDE.md 3章）。すべての関数は新しい Rng を返し、
 * 引数の Rng を書き換えない。
 */

export interface Rng {
  readonly seed: number
}

/** xorshift32 は 0 が不動点なので、0 を避けるための既定シード */
const FALLBACK_SEED = 0x9e3779b9

export function createRng(seed: number): Rng {
  const normalized = Math.trunc(seed) >>> 0
  return { seed: normalized === 0 ? FALLBACK_SEED : normalized }
}

/** 次の 32bit 符号なし整数を返す */
export function next(rng: Rng): { readonly rng: Rng; readonly value: number } {
  let x = rng.seed >>> 0
  x = (x ^ (x << 13)) >>> 0
  x = (x ^ (x >>> 17)) >>> 0
  x = (x ^ (x << 5)) >>> 0
  return { rng: { seed: x }, value: x }
}

/**
 * 0 以上 maxExclusive 未満の整数を返す。
 * 剰余によるわずかな偏りは、この用途（山札シャッフル・コイン）では無視できる。
 */
export function nextInt(rng: Rng, maxExclusive: number): { readonly rng: Rng; readonly value: number } {
  if (maxExclusive <= 1) return { rng, value: 0 }
  const r = next(rng)
  return { rng: r.rng, value: r.value % maxExclusive }
}

export function flipCoin(rng: Rng): { readonly rng: Rng; readonly heads: boolean } {
  const r = next(rng)
  return { rng: r.rng, heads: (r.value & 1) === 1 }
}

/** count 回投げて、表が出た回数を返す */
export function flipCoins(rng: Rng, count: number): { readonly rng: Rng; readonly heads: number } {
  let cur = rng
  let heads = 0
  for (let i = 0; i < count; i += 1) {
    const r = flipCoin(cur)
    cur = r.rng
    if (r.heads) heads += 1
  }
  return { rng: cur, heads }
}

/** Fisher-Yates。入力配列は書き換えない */
export function shuffle<T>(rng: Rng, items: readonly T[]): { readonly rng: Rng; readonly items: readonly T[] } {
  const out = items.slice()
  let cur = rng
  for (let i = out.length - 1; i > 0; i -= 1) {
    const r = nextInt(cur, i + 1)
    cur = r.rng
    const a = out[i] as T
    const b = out[r.value] as T
    out[i] = b
    out[r.value] = a
  }
  return { rng: cur, items: out }
}

/** 配列から1要素を選ぶ。空配列なら null */
export function pick<T>(rng: Rng, items: readonly T[]): { readonly rng: Rng; readonly item: T | null } {
  if (items.length === 0) return { rng, item: null }
  const r = nextInt(rng, items.length)
  return { rng: r.rng, item: items[r.value] as T }
}
