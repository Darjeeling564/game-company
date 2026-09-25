/**
 * 型と定数の約束を守る（SPEC 3.5・3.7）。
 * 型そのものはテストできないので、型に付随する純粋関数と定数だけを確かめる。
 */
import { describe, expect, it } from 'vitest'
import {
  DECK_SIZE,
  HAND_LIMIT,
  HAND_SIZE_AT_START,
  LIFE_POINTS,
  MAX_TURNS,
  MONSTER_ZONES,
  SPELL_ZONES,
  opponentOf,
  tributesRequired,
} from '../src/core/types.ts'

describe('tributesRequired', () => {
  it('レベル1〜4はリリース不要', () => {
    for (const level of [1, 2, 3, 4]) expect(tributesRequired(level)).toBe(0)
  })

  it('レベル5〜6は1体', () => {
    for (const level of [5, 6]) expect(tributesRequired(level)).toBe(1)
  })

  it('レベル7以上は2体', () => {
    for (const level of [7, 8, 9, 12]) expect(tributesRequired(level)).toBe(2)
  })

  it('レアリティとの対応（SPEC 6.1）がそのまま成り立つ', () => {
    // コモン3 / レア4 → 不要、SR 5〜6 → 1体、UR 7〜8 → 2体
    expect(tributesRequired(3)).toBe(0)
    expect(tributesRequired(4)).toBe(0)
    expect(tributesRequired(5)).toBe(1)
    expect(tributesRequired(6)).toBe(1)
    expect(tributesRequired(7)).toBe(2)
    expect(tributesRequired(8)).toBe(2)
  })
})

describe('opponentOf', () => {
  it('入れ替える', () => {
    expect(opponentOf(0)).toBe(1)
    expect(opponentOf(1)).toBe(0)
  })
})

describe('定数', () => {
  it('デュエルリンクスで確認した値になっている（SPEC 0章）', () => {
    expect(LIFE_POINTS).toBe(4000)
    expect(HAND_SIZE_AT_START).toBe(4)
    expect(HAND_LIMIT).toBe(6)
    expect(MONSTER_ZONES).toBe(3)
    expect(SPELL_ZONES).toBe(3)
  })

  it('デッキ20枚・初期手札4枚なら、ターン上限より先にデッキが尽きる（SPEC 3.7）', () => {
    // 1人あたり 20 - 4 = 16 回ドローできる。両者が交互なので最大 32 ターン。
    // MAX_TURNS はその外側に置く安全弁であって、通常は到達しない。
    const drawsPerPlayer = DECK_SIZE - HAND_SIZE_AT_START
    expect(drawsPerPlayer * 2).toBeLessThan(MAX_TURNS)
  })
})
