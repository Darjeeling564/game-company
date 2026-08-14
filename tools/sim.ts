/**
 * バランスシミュレーションのディスパッチャ。
 *
 *   npm run sim              全ゲームの sim を順に実行
 *   npm run sim -- <name>    指定したゲームだけ実行
 *
 * 各ゲームは games/<name>/tools/sim.ts を実装する（CLAUDE.md 5章）。
 */
import { existsSync } from 'node:fs'
import { listGames, simEntry } from './games.ts'

const requested = process.argv.slice(2).filter((a) => !a.startsWith('-'))
const all = listGames()

if (all.length === 0) {
  console.log('games/ にゲームがありません。シミュレーション対象なしとして終了します。')
  process.exit(0)
}

const targets = requested.length > 0 ? requested : all

const unknown = targets.filter((t) => !all.includes(t))
if (unknown.length > 0) {
  console.error(`不明なゲーム: ${unknown.join(', ')}`)
  console.error(`利用可能: ${all.join(', ')}`)
  process.exit(1)
}

for (const name of targets) {
  const entry = simEntry(name)
  if (!existsSync(entry)) {
    console.error(`${name}: games/${name}/tools/sim.ts がありません`)
    process.exit(1)
  }
  console.log(`--- sim: ${name} ---`)
  await import(entry)
}
