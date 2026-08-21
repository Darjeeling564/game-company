/**
 * 支援カード（アイテム・行動）を1枚ずつ採点する CLI。
 *
 * デッキごとの支援の合計点をそろえるために使う（src/data/decks.ts）。
 * 採点は AI の評価関数をそのまま使う。人が付けた重みより、実際に打たれる基準に
 * 合わせたほうが、シミュレーションの結果とずれない。
 *
 *   node games/maniwa-tcg/tools/support-score.ts
 */
import { ACTIONS, ITEMS } from '../src/data/support.ts'
import { expectedDamage } from './ai.ts'

for (const [title, group] of [['神具', ITEMS], ['道標', ACTIONS]] as const) {
  console.log(`\n■ ${title}`)
  const rows = group
    .map((c) => ({ id: c.id, name: c.name, score: expectedDamage(c.effects) }))
    .sort((a, b) => b.score - a.score)
  for (const r of rows) console.log(`  ${r.id} ${r.name.padEnd(8, '　')} ${r.score.toFixed(0)}`)
  console.log(`  合計 ${rows.reduce((s, r) => s + r.score, 0).toFixed(0)} / 8デッキ×3枠の1枠あたり ${(rows.reduce((s, r) => s + r.score, 0) * 2 / 8).toFixed(1)}`)
}
