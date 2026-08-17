/**
 * カードイラストの読み込み。
 *
 * 画像は `src/data/art/<カードid>.webp` に置く。ファイル名でカードと結び付けるので、
 * 外部で生成した絵を足すときもデータやロジックを触る必要がない（CLAUDE.md 4章）。
 * 未配置のカードは null を返し、呼び出し側が代替表示に落とす。
 */
import type { CardId } from '../core/types.ts'

const FILES = import.meta.glob('../data/art/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Readonly<Record<string, string>>

const BY_ID = new Map<CardId, string>()
for (const [path, url] of Object.entries(FILES)) {
  const id = path.split('/').pop()?.replace(/\.webp$/, '')
  if (id !== undefined) BY_ID.set(id, url)
}

export function artUrl(cardId: CardId): string | null {
  return BY_ID.get(cardId) ?? null
}
