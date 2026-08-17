/**
 * カードイラストの読み込み。
 *
 * 画像は `src/data/art/` に置く。ファイル名でカードと結び付けるので、
 * 外部で生成した絵を足すときもデータやロジックを触る必要がない（CLAUDE.md 4章）。
 *
 *   <カードid>.webp      通常
 *   <カードid>-d1.webp   ダメージ1（ダメージを受けている）
 *   <カードid>-d2.webp   ダメージ2（残りHPが半分以下）
 *
 * 未配置のときは1段ずつ手前に戻し、最後は null を返す。絵が揃っていない状態でも
 * 表示が壊れないようにするため。
 */
import type { CardId } from '../core/types.ts'

const FILES = import.meta.glob('../data/art/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Readonly<Record<string, string>>

const BY_FILE = new Map<string, string>()
for (const [path, url] of Object.entries(FILES)) {
  const file = path.split('/').pop()?.replace(/\.webp$/, '')
  if (file !== undefined) BY_FILE.set(file, url)
}

/** 傷み具合。絵の差し替えにだけ使う表示上の段階で、ルールには関与しない */
export type ArtStage = 'normal' | 'damaged' | 'critical'

/**
 * 残りHPから絵の段階を決める（SPEC 9.3）。
 * 無傷なら通常、少しでも減れば ダメージ1、半分以下まで減れば ダメージ2。
 */
export function artStage(hp: number, damage: number): ArtStage {
  if (damage <= 0) return 'normal'
  const remaining = hp - damage
  return remaining * 2 <= hp ? 'critical' : 'damaged'
}

/** 段階ごとの候補を、濃いほうから薄いほうへ並べる */
function candidates(cardId: CardId, stage: ArtStage): readonly string[] {
  switch (stage) {
    case 'critical':
      return [`${cardId}-d2`, `${cardId}-d1`, cardId]
    case 'damaged':
      return [`${cardId}-d1`, cardId]
    case 'normal':
      return [cardId]
  }
}

export function artUrl(cardId: CardId, stage: ArtStage = 'normal'): string | null {
  for (const name of candidates(cardId, stage)) {
    const url = BY_FILE.get(name)
    if (url !== undefined) return url
  }
  return null
}
