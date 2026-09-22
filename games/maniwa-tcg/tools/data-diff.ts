/**
 * カード定義の巻き戻し検査（SPEC 8.3 / 夜間ジョブの関門8）。
 *
 * **行数ではなくデータで突き合わせる。** `git diff --numstat` の削除行数で
 * 判定していた頃は、配列の末尾に1件足すだけで嘘の警告が出ていた。
 * `cards.ts` の一部の配列が `  },]` という閉じ方（最後の要素の閉じ括弧と
 * 配列の閉じ括弧が同じ行）をしていて、末尾に足すにはその行を2行に割るしかなく、
 * それが「1行削除」と数えられていたためである（2026-09-23 に実際に踏んだ。
 * 既存153枚は1枚残らず一致していたのに関門8が落ちた）。
 *
 * 関門が守りたいのは「**既存カードの数値を巻き戻していないか**」であって
 * 行数ではない。測る対象を目的に合わせる。
 *
 *   node games/maniwa-tcg/tools/data-diff.ts <基準のref> [比較先のref]
 *
 * 比較先を省くと作業ツリーの現在の内容を使う。
 * **消えたカードか、内容が変わったカードが1件でもあれば終了コード1**を返す。
 * 増えただけなら 0 を返す。
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ROOT = new URL('../../..', import.meta.url).pathname.replace(/\/$/, '')
const DATA = 'games/maniwa-tcg/src/data'
/** 突き合わせる定義ファイルと、そこから読む名前 */
const SOURCES: readonly (readonly [string, readonly string[]])[] = [
  ['cards.ts', ['CREATURES']],
  ['support.ts', ['ITEMS', 'ACTIONS', 'ULTIMATES']],
]

interface Entry {
  readonly id: string
  readonly json: string
}

function show(ref: string | null, file: string): string {
  if (ref === null) return readFileSync(join(ROOT, DATA, file), 'utf8')
  return execFileSync('git', ['-C', ROOT, 'show', `${ref}:${DATA}/${file}`], { encoding: 'utf8' })
}

/**
 * その ref の定義ファイルを一時ディレクトリに写して読み込む。
 *
 * **`types.ts` への相対 import を絶対パスに書き換える。** 一時ディレクトリから
 * 読むので、`../core/types.ts` のままでは解決できない。
 */
async function load(ref: string | null): Promise<Map<string, Entry>> {
  const dir = mkdtempSync(join(tmpdir(), 'maniwa-datadiff-'))
  try {
    const out = new Map<string, Entry>()
    for (const [file, names] of SOURCES) {
      const src = show(ref, file).replace(
        /from '(\.\.?\/[^']*)'/g,
        (_m, rel: string) => `from '${join(ROOT, DATA, rel)}'`,
      )
      const path = join(dir, file)
      writeFileSync(path, src)
      const mod = (await import(path)) as Record<string, unknown>
      for (const name of names) {
        const list = mod[name]
        if (!Array.isArray(list)) throw new Error(`${file} に ${name} が無い（ref=${ref ?? '作業ツリー'}）`)
        for (const card of list as readonly { id: string }[]) {
          out.set(card.id, { id: card.id, json: JSON.stringify(card) })
        }
      }
    }
    return out
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

async function main(argv: readonly string[]): Promise<number> {
  const base = argv[0]
  if (base === undefined) {
    console.error('使い方: node games/maniwa-tcg/tools/data-diff.ts <基準のref> [比較先のref]')
    return 2
  }
  const head = argv[1] ?? null
  const before = await load(base)
  const after = await load(head)

  const removed: string[] = []
  const changed: string[] = []
  for (const [id, entry] of before) {
    const now = after.get(id)
    if (now === undefined) removed.push(id)
    else if (now.json !== entry.json) changed.push(id)
  }
  const added = [...after.keys()].filter((id) => !before.has(id))

  console.log(`基準 ${base} : ${before.size}枚`)
  console.log(`比較 ${head ?? '作業ツリー'} : ${after.size}枚`)
  console.log('')
  for (const id of removed) console.log(`  消えた   ${id}`)
  for (const id of changed) console.log(`  変わった ${id}`)
  console.log(`消えたカード: ${removed.length} 枚`)
  console.log(`内容が変わったカード: ${changed.length} 枚`)
  console.log(`増えたカード: ${added.length} 枚${added.length > 0 ? `（${added.join(', ')}）` : ''}`)

  const bad = removed.length + changed.length
  console.log('')
  console.log(bad === 0 ? '巻き戻し: なし' : `巻き戻し: ${bad} 件`)
  return bad === 0 ? 0 : 1
}

process.exitCode = await main(process.argv.slice(2))
