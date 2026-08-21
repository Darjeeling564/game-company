/**
 * レアリティの算出を SPEC 8.3 の式でコード化した CLI。
 *
 * 感覚で振らず、必ずこの出力に合わせる。カードを足したら実行し、
 * 「現状のレアリティ」と「算出結果」がずれていないか確認する。
 *
 *   node games/maniwa-tcg/tools/rarity.ts            # 全種別を出す
 *   node games/maniwa-tcg/tools/rarity.ts --diff     # ずれているカードだけ出す
 *
 * キャラクターと支援カードで基準線が違う（後述）ので、種別ごとに分けて出す。
 */
import type { CardDef, Rarity } from '../src/core/types.ts'
import { CREATURES } from '../src/data/cards.ts'
import { ACTIONS, ITEMS, ULTIMATES } from '../src/data/support.ts'
import { expectedDamage } from './ai.ts'

/**
 * SPEC 8.3 の総合力。`HP + 効率 × 3 + 最大威力 × 0.6`
 *
 * 支援カードは HP を持たないので、その項が丸ごと落ちる。キャラの HP は 90〜170 で
 * 平均するとおよそ 110 あり、これがそのまま下駄になっている。だから
 * **キャラの区切りを支援カードにそのまま当てると全部コモンになる。**
 *
 * 区切りは種族ごとに、その分布から決める。両者は形が違うので、片方の値を平行移動
 * しても揃わない（キャラは HP の下駄で 120〜354 に密集し、支援は -18〜252 に広く散る）。
 * 揃えるのは値ではなく**目標とする形**で、下のレアリティほど枚数が多くなるように取る。
 *
 * - キャラクター 300 / 255 / 225 → UR8 / SR13 / R21 / C30
 * - 支援カード   190 / 115 /  60 → UR1 / SR5 / R5 / C13（絶技8種を除く）
 *
 * キャラの UR 300 はちょうど EX 8種だけを拾う線で、「UR は EX 級」と一致している。
 */
const CREATURE_BANDS: readonly (readonly [number, Rarity])[] = [
  [300, 'ultra'], [255, 'superRare'], [225, 'rare'],
]
const SUPPORT_BANDS: readonly (readonly [number, Rarity])[] = [
  [190, 'ultra'], [115, 'superRare'], [60, 'rare'],
]

function classify(power: number, bands: readonly (readonly [number, Rarity])[]): Rarity {
  for (const [floor, rarity] of bands) if (power >= floor) return rarity
  return 'common'
}

/** 無属性は全デッキ共通で2枚積みされ稀少性が低いので1段下げる（SPEC 8.3） */
const DOWNGRADE: Readonly<Record<Rarity, Rarity>> = {
  ultra: 'superRare', superRare: 'rare', rare: 'common', common: 'common',
}

/**
 * 絶技は対応キャラがバトル場にいるときしか撃てず、そのキャラを積んだデッキにしか
 * 入らない。無属性を「どこにでも入るから1段下げる」としているのと同じ理屈を
 * 逆向きに当て、**1段上げる**。強さだけでなく稀少性も見る、という 8.3 の建前を
 * 両方向に効かせるため。
 */
const UPGRADE: Readonly<Record<Rarity, Rarity>> = {
  ultra: 'ultra', superRare: 'ultra', rare: 'superRare', common: 'rare',
}

interface Row {
  readonly id: string
  readonly name: string
  readonly efficiency: number
  readonly peak: number
  readonly power: number
  readonly computed: Rarity
  readonly actual: Rarity
}

function creatureRow(card: (typeof CREATURES)[number]): Row {
  const efficiency = Math.max(...card.attacks.map((a) => expectedDamage(a.effects) / a.cost.length))
  const peak = Math.max(...card.attacks.map((a) => expectedDamage(a.effects)))
  const power = card.hp + efficiency * 3 + peak * 0.6
  const base = classify(power, CREATURE_BANDS)
  return {
    id: card.id, name: card.name, efficiency, peak, power,
    computed: card.type === 'colorless' ? DOWNGRADE[base] : base,
    actual: card.rarity,
  }
}

/** アイテム・行動はコストが無いので効率＝評価値。絶技はエネルギー数で割る */
function supportRow(card: CardDef & { readonly effects: readonly unknown[] }): Row {
  const c = card as unknown as {
    id: string; name: string; rarity: Rarity; kind: string
    effects: Parameters<typeof expectedDamage>[0]
    cost?: readonly unknown[]
  }
  const peak = expectedDamage(c.effects)
  const efficiency = peak / (c.cost?.length ?? 1)
  const power = efficiency * 3 + peak * 0.6
  const base = classify(power, SUPPORT_BANDS)
  return {
    id: c.id, name: c.name, efficiency, peak, power,
    computed: c.kind === 'ultimate' ? UPGRADE[base] : base,
    actual: c.rarity,
  }
}

const LABEL: Readonly<Record<Rarity, string>> = {
  ultra: 'UR', superRare: 'SR', rare: 'R ', common: 'C ',
}

const diffOnly = process.argv.includes('--diff')
let mismatches = 0

const groups: readonly (readonly [string, readonly Row[]])[] = [
  ['姫神', CREATURES.map(creatureRow)],
  ['神具', ITEMS.map((c) => supportRow(c as never))],
  ['道標', ACTIONS.map((c) => supportRow(c as never))],
  ['絶技', ULTIMATES.map((c) => supportRow(c as never))],
]

for (const [title, rows] of groups) {
  const sorted = [...rows].sort((a, b) => b.power - a.power)
  const shown = diffOnly ? sorted.filter((r) => r.computed !== r.actual) : sorted
  if (shown.length === 0) continue
  console.log(`\n■ ${title}`)
  console.log('  ID   名前              効率   最大威力  総合力  算出  現状')
  for (const r of shown) {
    const flag = r.computed === r.actual ? '' : '  ← ずれ'
    if (r.computed !== r.actual) mismatches++
    console.log(
      `  ${r.id} ${r.name.padEnd(9, '　')} ${r.efficiency.toFixed(1).padStart(6)} ` +
      `${r.peak.toFixed(0).padStart(8)} ${r.power.toFixed(1).padStart(7)}  ` +
      `${LABEL[r.computed]}    ${LABEL[r.actual]}${flag}`,
    )
  }
}

console.log(`\nずれているカード: ${mismatches} 枚`)
process.exit(mismatches > 0 && diffOnly ? 1 : 0)
