/**
 * CLAUDE.md 3章「core 層の制約」を機械的に検査する。
 * games/<name>/src/core/ に禁止APIが混入した時点でテストが落ちる。
 * ゲームが1つも無い間は対象0件で素通りする。
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ROOT, listGames } from '../tools/games.ts'

const FORBIDDEN: readonly { pattern: RegExp; reason: string }[] = [
  { pattern: /\bMath\.random\s*\(/, reason: 'Math.random（シード付きPRNGを状態で持ち回ること）' },
  { pattern: /\bDate\.now\s*\(/, reason: 'Date.now' },
  { pattern: /\bnew\s+Date\b/, reason: 'new Date' },
  { pattern: /\bperformance\.now\s*\(/, reason: 'performance.now' },
  { pattern: /\b(?:set|clear)(?:Timeout|Interval)\s*\(/, reason: 'タイマーAPI' },
  { pattern: /\brequestAnimationFrame\s*\(/, reason: 'requestAnimationFrame' },
  { pattern: /\b(?:window|document|localStorage|sessionStorage|navigator|fetch)\b/, reason: 'ブラウザAPI' },
]

function collectTsFiles(dir: string): string[] {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return []
  }
  const files: string[] = []
  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...collectTsFiles(path))
    else if (entry.name.endsWith('.ts')) files.push(path)
  }
  return files
}

/** コメントを除去する（誤検出を避けるため。文字列リテラルまでは踏み込まない） */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
}

const coreFiles = listGames().flatMap((name) => collectTsFiles(join(ROOT, 'games', name, 'src', 'core')))

describe('core 層の純粋性', () => {
  it.each(coreFiles.length > 0 ? coreFiles : [])('%s に禁止APIが無い', (file) => {
    const source = stripComments(readFileSync(file, 'utf8'))
    const hits = FORBIDDEN.filter(({ pattern }) => pattern.test(source)).map((f) => f.reason)
    expect(hits, `${relative(ROOT, file)} が使用: ${hits.join(', ')}`).toEqual([])
  })

  it('検査対象の一覧を取得できる', () => {
    expect(Array.isArray(coreFiles)).toBe(true)
  })
})
