/**
 * 罠（道標26種）。
 *
 * 道標は「兆し」や「合図」で、状況を引っくり返す側にあるので罠になる（SPEC 6.3）。
 *
 * **v1 はすべて通常罠（trapType: 'normal'）**。永続・カウンターは型だけ用意して
 * 実装しない（SPEC 6.4）。カウンター罠はチェーンが無いと意味を持たない。
 *
 * 実装順序8で埋める（SPEC 14章）。
 */
import type { TrapDef } from '../core/types.ts'

export const TRAPS: readonly TrapDef[] = []
