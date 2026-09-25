/**
 * カードイラストの読み込み。
 *
 * **画像は maniwa-tcg のものを共有する**（SPEC 2章）。複製すると 288枚・約43MB が
 * git に二重に入るため、相対参照にしている。
 *
 * ┌─────────────────────────────────────────────┐
 * │ **maniwa-tcg 側との約束**                     │
 * │ `games/maniwa-tcg/src/data/art/` を移動・改名  │
 * │ すると、このゲームの絵が全部消える。           │
 * └─────────────────────────────────────────────┘
 *
 * カードIDは maniwa-tcg と同じものを使っているので、ファイル名の対応もそのまま。
 *
 *   <カードid>.webp      無傷
 *   <カードid>-d1.webp   傷
 *   <カードid>-d2.webp   追い詰められた姿
 *
 * 未配置のときは1段ずつ手前に戻し、最後は null を返す。
 */
import type { CardId } from '../core/types.ts'
import { ART_D2, LIFE_POINTS } from '../core/types.ts'

const FILES = import.meta.glob('../../../maniwa-tcg/src/data/art/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Readonly<Record<string, string>>

const BY_FILE = new Map<string, string>()
for (const [path, url] of Object.entries(FILES)) {
  const file = path.split('/').pop()?.replace(/\.webp$/, '')
  if (file !== undefined) BY_FILE.set(file, url)
}

/** 絵の段階。**表示だけの区分で、ルールには関与しない** */
export type ArtStage = 'normal' | 'damaged' | 'critical'

/**
 * **持ち主のライフから絵の段階を決める**（SPEC 9.3）。
 *
 * このゲームには姫神のHPが無いので、maniwa-tcg のように1体ごとの傷では決められない。
 * かわりに決闘者の状況に紐づける。d2 は「瀕死の姿」ではなく「追い詰められた姿」なので、
 * 1体の話ではなく場の話に読み替えても意図がずれない。
 *
 * 区切りは 1万戦の実測から決めた（SPEC 9.3）。
 */
export function artStage(lp: number): ArtStage {
  if (lp >= LIFE_POINTS) return 'normal'
  return lp <= ART_D2 ? 'critical' : 'damaged'
}

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
