/**
 * 絶技が死に札になっていないかを検査する CLI（SPEC 16.5.1）。
 *
 *   node games/maniwa-tcg/tools/ultimate-check.ts          # 全絶技を出す
 *   node games/maniwa-tcg/tools/ultimate-check.ts --diff   # 基準を外れたものだけ（外れていれば終了コード1）
 *
 * 絶技は撃つとターンが終わるので、対応する姫神の通常ワザより
 * **1エネルギーあたりで強くなければ撃つ価値が無い**。
 *
 * 「最強ワザより評価値で +10〜+20」という raw の差で見ていた時期に、
 * この検査が無いまま2度死に札を作っている（u003 黄の印 / 2026-08-23 の未採用案）。
 * どちらも raw の基準は満たしていた。人が気づける差ではないので機械で見る。
 */
import { CREATURES } from '../src/data/cards.ts'
import { ULTIMATES } from '../src/data/support.ts'
import { expectedDamage } from './ai.ts'

/**
 * SPEC 16.5.1。対応姫神の最強ワザに対する「効率の比」の許容範囲。
 *
 * 帯は当てずっぽうではなく、pool 3万戦の実測から引いた。
 *
 *   比 0.857 → 使用率  1.3%（死に札。2026-08-23 の未採用案）
 *   比 1.095 → 使用率 32.0%（u004 地底の眠り。健全）
 *   比 1.250 → 使用率 28.3%（u005 神威の雷。健全）
 *
 * 境界は 0.857 と 1.095 のあいだにある。両側に余裕を取って 1.05〜1.30 とした。
 * 1.10 にすると u004（実測32%で健全）を誤って弾く。
 */
const MIN_RATIO = 1.05
const MAX_RATIO = 1.30

interface Row {
  readonly id: string
  readonly name: string
  readonly requires: string
  readonly creature: string
  readonly ultEfficiency: number
  readonly bestEfficiency: number
  readonly bestCost: number
  readonly ratio: number
  readonly ok: boolean
  readonly note: string
}

const rows: Row[] = ULTIMATES.map((u) => {
  const creature = CREATURES.find((c) => c.id === u.requires)
  if (creature === undefined) {
    throw new Error(`${u.id} ${u.name} が要求する ${u.requires} が姫神に無い`)
  }
  // AI が最強とみなすのは評価値が最大のワザ。効率はそのワザのコストで割る
  let best = { value: -1, cost: 1 }
  for (const attack of creature.attacks) {
    const value = expectedDamage(attack.effects)
    if (value > best.value) best = { value, cost: attack.cost.length }
  }
  const ultEfficiency = expectedDamage(u.effects) / u.cost.length
  const bestEfficiency = best.value / best.cost
  const ratio = ultEfficiency / bestEfficiency

  // コスト3でない姫神に付いている場合は、比を満たしていても警告する（SPEC 16.5.2）
  const note = best.cost < u.cost.length
    ? `対応姫神の最強ワザがコスト${best.cost}（絶技はコスト${u.cost.length}）`
    : ''

  return {
    id: u.id, name: u.name, requires: u.requires, creature: creature.name,
    ultEfficiency, bestEfficiency, bestCost: best.cost, ratio,
    ok: ratio >= MIN_RATIO && ratio <= MAX_RATIO,
    note,
  }
})

const diffOnly = process.argv.includes('--diff')
const shown = diffOnly ? rows.filter((r) => !r.ok || r.note !== '') : rows

if (shown.length > 0) {
  console.log(`\n■ 絶技の効率比（SPEC 16.5.1: ${MIN_RATIO}〜${MAX_RATIO} 倍）`)
  console.log('  ID   名前              絶技効率  姫神効率   比     判定')
  for (const r of [...shown].sort((a, b) => b.ratio - a.ratio)) {
    const verdict = r.ok ? 'OK' : (r.ratio < MIN_RATIO ? '★弱すぎ（死に札）' : '★強すぎ')
    console.log(
      `  ${r.id} ${r.name.padEnd(9, '　')} ${r.ultEfficiency.toFixed(1).padStart(7)}` +
      `  ${r.bestEfficiency.toFixed(1).padStart(7)}  ${r.ratio.toFixed(3)}  ${verdict}` +
      (r.note === '' ? '' : `  ← ${r.note}`),
    )
  }
}

const bad = rows.filter((r) => !r.ok)
const warned = rows.filter((r) => r.ok && r.note !== '')
console.log(`\n基準を外れた絶技: ${bad.length} 種` +
  (warned.length > 0 ? `（ほかに要注意 ${warned.length} 種）` : ''))

process.exit(bad.length > 0 && diffOnly ? 1 : 0)
