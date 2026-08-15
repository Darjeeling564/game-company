/**
 * バランスシミュレーションのディスパッチャ。
 *
 *   npm run sim              sim.ts を持つ全ゲームを順に実行
 *   npm run sim -- <name>    指定したゲームだけ実行
 *
 * 各ゲームは games/<name>/tools/sim.ts を実装する（CLAUDE.md 5章）。
 * SPEC.md だけが置かれた実装前のディレクトリは、一括実行時にはスキップする。
 */
import { existsSync } from 'node:fs'
import { listGames, listSimulatableGames, simEntry } from './games.ts'

const requested = process.argv.slice(2).filter((a) => !a.startsWith('-'))
const all = listGames()

if (all.length === 0) {
  console.log('games/ にゲームがありません。シミュレーション対象なしとして終了します。')
  process.exit(0)
}

let targets: string[]

if (requested.length > 0) {
  // 明示指定されたゲームは、sim.ts が無ければエラーにする（指定ミスに気付けるように）
  const unknown = requested.filter((t) => !all.includes(t))
  if (unknown.length > 0) {
    console.error(`不明なゲーム: ${unknown.join(', ')}`)
    console.error(`利用可能: ${all.join(', ')}`)
    process.exit(1)
  }
  const missing = requested.filter((t) => !existsSync(simEntry(t)))
  if (missing.length > 0) {
    for (const name of missing) {
      console.error(`${name}: games/${name}/tools/sim.ts がありません（未実装）`)
    }
    process.exit(1)
  }
  targets = requested
} else {
  targets = listSimulatableGames()
  const skipped = all.filter((name) => !targets.includes(name))
  for (const name of skipped) {
    console.log(`${name}: sim.ts が無いためスキップします（SPEC のみ / 実装前）`)
  }
  if (targets.length === 0) {
    console.log('実行可能なシミュレーションがありません。対象なしとして終了します。')
    process.exit(0)
  }
}

for (const name of targets) {
  console.log(`--- sim: ${name} ---`)
  await import(simEntry(name))
}
