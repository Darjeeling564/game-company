/**
 * 1枚のカードの価値を、基準デッキ上の差し替えで測る CLI（SPEC 12章）。
 *
 *   node games/maniwa-tcg/tools/card-value.ts a013
 *   node games/maniwa-tcg/tools/card-value.ts a013 --games=20000
 *
 * プール全体の平均（`sim --decks=pool`）では「既存の何と比べて強いのか」が出ない。
 * 基準デッキの同種別の1枠を対象カードに差し替え、**抜いたカードと入れたカードの
 * 勝率寄与を並べる**ことで、採用する価値があるかを判断できるようにする。
 *
 * 夜間ジョブが毎晩スクリプトを書き捨てて同じことをしていたので、固定した。
 *
 * decks.ts のファイルを書き換えるのではなく、デッキを組み替えて sim の中身を
 * 直接呼ぶ。ファイルを触ると、失敗したときに書き換えたまま残る危険がある。
 */
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { requireCard } from '../src/data/cards.ts'
import { DECKS } from '../src/data/decks.ts'

const [target, ...rest] = process.argv.slice(2)
if (target === undefined) {
  console.error('使い方: node games/maniwa-tcg/tools/card-value.ts <カードID> [--games=N]')
  process.exit(2)
}

const card = requireCard(target)
if (card.kind === 'creature') {
  console.error(`${target} は姫神。このツールは神具・道標・絶技のみを対象にする`)
  process.exit(2)
}

const games = Number(rest.find((a) => a.startsWith('--games='))?.split('=')[1] ?? 10000)

/** 対象と同じ種別のカードが入っているデッキを探し、その枠を差し替える */
const candidates = DECKS.flatMap((deck) =>
  deck.cards
    .map((id, index) => ({ deck, id, index }))
    .filter(({ id }) => id !== target && requireCard(id).kind === card.kind),
)

if (candidates.length === 0) {
  console.error(`${target} と同じ種別（${card.kind}）のカードが基準デッキに無く、差し替え先が決められない`)
  process.exit(2)
}

// 差し替え先は毎回同じになるよう、デッキ名とIDで並べて先頭を取る
const slot = [...candidates].sort((a, b) =>
  a.deck.name === b.deck.name ? a.id.localeCompare(b.id) : a.deck.name.localeCompare(b.deck.name),
)[0] as (typeof candidates)[number]

const removed = requireCard(slot.id)

const SIM = fileURLToPath(new URL('./sim.ts', import.meta.url))

/** sim を子プロセスで回し、指定カードの行だけ拾う */
function run(swap: { from: string; to: string } | null): Map<string, { use: number; win: number; contrib: number }> {
  const args = [SIM, `--games=${games}`]
  if (swap !== null) args.push(`--swap=${slot.deck.name}:${swap.from}:${swap.to}`)
  const out = execFileSync('node', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  const rows = new Map<string, { use: number; win: number; contrib: number }>()
  for (const m of out.matchAll(/^\s+(\w\d\d\d) \S+\s+\S+\s+([\d.]+)% \/\s+([\d.]+)% \/\s+([\d.]+)% \/\s+([+-][\d.]+)pt/gm)) {
    rows.set(m[1] as string, {
      use: Number(m[3]), win: Number(m[4]), contrib: Number(m[5]),
    })
  }
  return rows
}

console.log(`\n=== ${card.name}（${target}）の価値 ===`)
console.log(`  ${games} 戦 / 基準デッキ「${slot.deck.name}」の ${removed.name}（${slot.id}）と差し替え\n`)

const before = run(null)
const after = run({ from: slot.id, to: target })

const b = before.get(slot.id)
const a = after.get(target)
if (b === undefined || a === undefined) {
  console.error('sim の出力からカード行を読み取れなかった')
  process.exit(1)
}

const line = (label: string, r: { use: number; win: number; contrib: number }): string =>
  `  ${label.padEnd(22, '　')} 使用 ${String(r.use).padStart(5)}%  勝率 ${String(r.win).padStart(5)}%  寄与 ${r.contrib > 0 ? '+' : ''}${r.contrib}pt`

console.log(line(`抜いた ${removed.name}`, b))
console.log(line(`入れた ${card.name}`, a))
console.log(`\n  差分 ${(a.contrib - b.contrib).toFixed(1)}pt` +
  `（プラスなら ${removed.name} より強い）`)
