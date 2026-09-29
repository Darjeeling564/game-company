/**
 * 1枚のカードの価値を、プリセットデッキ上の差し替えで測る CLI（SPEC 13.4）。
 *
 *   node games/maniwa-duel/tools/card-value.ts i012
 *   node games/maniwa-duel/tools/card-value.ts f003 --games=20000
 *
 * **「既存の何と比べて強いのか」を出す道具である。** プール全体の平均では
 * 比較の相手が定まらない。同じ種別の1枠を対象カードに差し替え、
 * **抜いた札と入れた札の勝率寄与を並べる**ことで、採用する価値を判断できる。
 *
 * `decks.ts` のファイルは書き換えない。`sim.ts` の `--swap` に渡して、
 * 読み込んだ配列の写しの上で差し替える。ファイルを触ると、失敗したときに
 * 差し替えたまま残る危険がある（maniwa-tcg の同名ファイルと同じ考え方）。
 */
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { findCard } from '../src/data/cards.ts'
import { DECKS } from '../src/data/decks.ts'

const [target, ...rest] = process.argv.slice(2)
if (target === undefined) {
  console.error('使い方: node games/maniwa-duel/tools/card-value.ts <カードID> [--games=N]')
  process.exit(2)
}

const card = findCard(target)
if (card === null) {
  console.error(`${target} というカードが無い`)
  process.exit(2)
}

const games = Number(rest.find((a) => a.startsWith('--games='))?.split('=')[1] ?? 10000)

/**
 * 対象と同じ種別のカードが入っているデッキを探し、その枠を差し替える。
 *
 * **絶技（`requires` を持つ魔法）は、対応する姫神が同じデッキにいないと死に札になる**
 * （SPEC 6.3）。差し替え先を選ぶ時点で弾く。入れた側が一度も撃てないまま
 * 「寄与がほぼ0」と出ると、弱いのか撃てないのかが区別できない。
 */
const needs = card.kind === 'spell' ? card.requires : undefined
const candidates = DECKS.flatMap((deck) =>
  deck.cards
    .map((id, index) => ({ deck, id, index }))
    .filter(({ id }) => id !== target && findCard(id)?.kind === card.kind)
    .filter(() => needs === undefined || deck.cards.includes(needs)),
)

if (candidates.length === 0) {
  if (needs !== undefined) {
    console.error(
      `${target}（${card.name}）は ${needs} ${findCard(needs)?.name ?? ''} を要求するが、` +
      `その姫神が入っているプリセットデッキが無いため差し替えで測れない。`,
    )
  } else {
    console.error(`${target} と同じ種別（${card.kind}）のカードがプリセットデッキに無く、差し替え先が決められない`)
  }
  process.exit(2)
}

// 差し替え先は毎回同じになるよう、デッキ名とIDで並べて先頭を取る
const slot = [...candidates].sort((a, b) =>
  a.deck.name === b.deck.name ? a.id.localeCompare(b.id) : a.deck.name.localeCompare(b.deck.name),
)[0] as (typeof candidates)[number]

const removed = findCard(slot.id)
const SIM = fileURLToPath(new URL('./sim.ts', import.meta.url))

interface Row { readonly use: number; readonly win: number; readonly contrib: number }

/**
 * sim を子プロセスで回し、カード別の行を拾う。
 *
 * 拾う形は `  u001 天叢焼　　　　　　　　    4.3% /  82.4% / +32.4pt`。
 * 名前の余白は全角空白で、JavaScript の `\s` はこれに当たる。
 */
function run(swap: { from: string; to: string } | null): Map<string, Row> {
  const args = [SIM, `--games=${games}`]
  if (swap !== null) args.push(`--swap=${slot.deck.name}:${swap.from}:${swap.to}`)
  const out = execFileSync('node', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  const rows = new Map<string, Row>()
  for (const m of out.matchAll(/^\s+(\w\d\d\d)\s+\S+\s+([\d.]+)% \/\s+([\d.]+)% \/\s+([+-][\d.]+)pt/gm)) {
    rows.set(m[1] as string, { use: Number(m[2]), win: Number(m[3]), contrib: Number(m[4]) })
  }
  return rows
}

console.log(`\n=== ${card.name}（${target}）の価値 ===`)
console.log(`  ${games} 戦 / デッキ「${slot.deck.name}」の ${removed?.name ?? slot.id}（${slot.id}）と差し替え\n`)

const before = run(null)
const after = run({ from: slot.id, to: target })

const b = before.get(slot.id)
const a = after.get(target)
if (b === undefined || a === undefined) {
  console.error('sim の出力からカード行を読み取れなかった')
  console.error(`  抜いた ${slot.id}: ${b === undefined ? '見つからない' : 'OK'} / 入れた ${target}: ${a === undefined ? '見つからない' : 'OK'}`)
  process.exit(1)
}

const line = (label: string, r: Row): string =>
  `  ${label.padEnd(22, '　')} 採用 ${String(r.use).padStart(5)}%  勝率 ${String(r.win).padStart(5)}%  寄与 ${r.contrib > 0 ? '+' : ''}${r.contrib}pt`

console.log(line(`抜いた ${removed?.name ?? slot.id}`, b))
console.log(line(`入れた ${card.name}`, a))
console.log(`\n  差分 ${(a.contrib - b.contrib).toFixed(1)}pt（プラスなら ${removed?.name ?? slot.id} より強い）`)
