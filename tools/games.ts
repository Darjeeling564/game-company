import { existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

/** リポジトリのルート（tools/ の1つ上） */
export const ROOT = resolve(import.meta.dirname, '..')

/** games/ 配下のディレクトリ名として許可する形式（小文字・数字・ハイフン） */
export function isGameName(name: string): boolean {
  return /^[a-z0-9][a-z0-9-]*$/.test(name)
}

/**
 * ディレクトリ一覧からゲーム名だけを抽出して整列する。
 * fs に触らない純粋関数なのでテストしやすい。
 */
export function pickGameNames(entries: readonly string[]): string[] {
  return entries.filter(isGameName).sort()
}

/** games/ を走査して実在するゲーム名を返す */
export function listGames(root: string = ROOT): string[] {
  const dir = resolve(root, 'games')
  if (!existsSync(dir)) return []
  const dirs = readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
  return pickGameNames(dirs)
}

/** games/<name>/tools/sim.ts の絶対パス */
export function simEntry(name: string, root: string = ROOT): string {
  return resolve(root, 'games', name, 'tools', 'sim.ts')
}
