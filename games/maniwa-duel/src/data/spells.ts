/**
 * 魔法（神具26種 ＋ 絶技18種 = 44種）。
 *
 * 神具は「物」、絶技は「技」なので、どちらも魔法になる（SPEC 6.3）。
 * form でどちらか分かるようにしてあり、v2 で装備魔法・永続魔法へ分けるときの線になる。
 *
 * **v1 はすべて通常魔法（spellType: 'normal'）**。永続・装備・フィールド・速攻は
 * 型だけ用意して実装しない（SPEC 6.4）。
 *
 * 実装順序7で埋める（SPEC 14章）。
 */
import type { SpellDef } from '../core/types.ts'

export const SPELLS: readonly SpellDef[] = []
