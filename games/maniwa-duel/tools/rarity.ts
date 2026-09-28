/**
 * 姫神の数値の検算（SPEC 6.1 / 夜間ジョブ STEP7.5 の関門）。
 *
 *   node games/maniwa-duel/tools/rarity.ts          # 全87体を出す
 *   node games/maniwa-duel/tools/rarity.ts --diff   # ずれたものだけ（あれば終了コード1）
 *
 * **maniwa-tcg の総合力からレアリティを決め直す道具ではない。** こちらの取り決めは
 * 「maniwa-tcg の値から機械的に出す」なので、**出した値が式どおりかを見る**。
 *
 *   攻撃力 = 最強ワザの威力 × 20（10刻みに丸め）
 *   守備力 = HP × 10（10刻みに丸め）
 *   レベル = レアリティ（コモン3 / レア4 / SR 5〜6 / UR 7〜8）
 *
 * SR と UR は帯の中で2段に分かれる。境目は**その帯の総合力の中央値**で、
 * `src/data/monsters.ts` の生成時に SR 267 / UR 332 と決めた。
 * 総合力の式（`HP + 効率×3 + 最大威力×0.6`）は maniwa-tcg 8.3 のものである。
 * **この式をこちらのレアリティ判定に使っているのではなく、
 * 「どちらのレベルに寄せたか」を再現するためだけに使う。**
 *
 * **元の値は maniwa-tcg 側にある。** 姫神の HP とワザはあちらが持っているので、
 * 検算にはあちらのカード定義と `expectedDamage` を読む。
 * これは道具だけの依存で、`src/` は maniwa-tcg を読まない（SPEC 2章）。
 */
import { CREATURES } from '../../maniwa-tcg/src/data/cards.ts'
import { expectedDamage } from '../../maniwa-tcg/tools/ai.ts'
import { MONSTERS } from '../src/data/monsters.ts'
import type { Rarity } from '../src/core/types.ts'

/** レアリティごとに許されるレベルの帯（SPEC 6.1） */
const BAND: Readonly<Record<Rarity, readonly [number, number]>> = {
  common: [3, 3],
  rare: [4, 4],
  superRare: [5, 6],
  ultra: [7, 8],
}

/**
 * 帯が2段に分かれるレアリティの境目。**その帯の総合力の中央値**。
 * monsters.ts を生成したときの値で、ここを変えると87体のレベルが動く。
 */
const SPLIT: Readonly<Partial<Record<Rarity, number>>> = {
  superRare: 267,
  ultra: 332,
}

const round10 = (x: number): number => Math.round(x / 10) * 10

interface Row {
  readonly id: string
  readonly name: string
  readonly rarity: Rarity
  readonly atk: number
  readonly wantAtk: number
  readonly def: number
  readonly wantDef: number
  readonly level: number
  readonly wantLevel: number | null
  readonly power: number
  readonly ok: boolean
  readonly notes: readonly string[]
}

const rows: Row[] = MONSTERS.map((m) => {
  const c = CREATURES.find((x) => x.id === m.id)
  if (c === undefined) {
    return {
      id: m.id, name: m.name, rarity: m.rarity,
      atk: m.atk, wantAtk: NaN, def: m.def, wantDef: NaN,
      level: m.level, wantLevel: null, power: NaN,
      ok: false, notes: [`maniwa-tcg に ${m.id} の姫神が無い`],
    }
  }
  const peak = Math.max(...c.attacks.map((a) => expectedDamage(a.effects)))
  const efficiency = Math.max(...c.attacks.map((a) => expectedDamage(a.effects) / a.cost.length))
  const power = c.hp + efficiency * 3 + peak * 0.6

  const wantAtk = round10(peak * 20)
  const wantDef = round10(c.hp * 10)
  const [lo, hi] = BAND[m.rarity]
  const split = SPLIT[m.rarity]
  const wantLevel = split === undefined ? lo : power >= split ? hi : lo

  const notes: string[] = []
  if (m.atk !== wantAtk) notes.push(`攻撃力 ${m.atk} ≠ ${wantAtk}（威力 ${peak.toFixed(1)} × 20）`)
  if (m.def !== wantDef) notes.push(`守備力 ${m.def} ≠ ${wantDef}（HP ${c.hp} × 10）`)
  if (m.level < lo || m.level > hi) notes.push(`レベル ${m.level} が ${m.rarity} の帯 ${lo}〜${hi} の外`)
  else if (m.level !== wantLevel) {
    notes.push(`レベル ${m.level} ≠ ${wantLevel}（総合力 ${power.toFixed(1)} / 境目 ${String(split)}）`)
  }
  return {
    id: m.id, name: m.name, rarity: m.rarity,
    atk: m.atk, wantAtk, def: m.def, wantDef,
    level: m.level, wantLevel, power,
    ok: notes.length === 0, notes,
  }
})

const diffOnly = process.argv.includes('--diff')
const bad = rows.filter((r) => !r.ok)

if (!diffOnly) {
  console.log('\n=== 姫神の数値の検算（SPEC 6.1）===')
  console.log(`  ${MONSTERS.length}体 / 攻撃力＝威力×20 / 守備力＝HP×10 / レベル＝レアリティ`)
  console.log(`  SR の境目 総合力 ${String(SPLIT.superRare)} / UR の境目 ${String(SPLIT.ultra)}\n`)
  console.log('  ID   名前            レア  攻撃力  守備力  ★  総合力  判定')
  for (const r of rows) {
    console.log(
      `  ${r.id} ${r.name.padEnd(8, '　')} ${r.rarity.padEnd(10)} ` +
      `${String(r.atk).padStart(5)} ${String(r.def).padStart(6)} ${String(r.level).padStart(3)} ` +
      `${r.power.toFixed(1).padStart(7)}  ${r.ok ? 'OK' : 'ずれ'}`,
    )
  }
  console.log('')
}

for (const r of bad) {
  console.log(`  ${r.id} ${r.name}`)
  for (const n of r.notes) console.log(`      ${n}`)
}
console.log(`\nずれているカード: ${bad.length} 枚`)
process.exitCode = bad.length === 0 ? 0 : 1
