/**
 * セーブデータ（SPEC 10章）。キーは `<game-name>_v<n>` 形式。
 * スキーマを変えるときはバージョンを上げ、旧データの移行をここに書く。
 *
 * `maniwa-tcg_v3` とは独立。同じ localStorage を使うが、キーが違うので混ざらない。
 */
const KEY = 'maniwa-duel_v1'

export interface SaveData {
  readonly version: 1
  readonly deckName: string | null
  readonly record: { readonly wins: number; readonly losses: number; readonly draws: number }
  readonly muted: boolean
}

const DEFAULT: SaveData = {
  version: 1,
  deckName: null,
  record: { wins: 0, losses: 0, draws: 0 },
  muted: false,
}

/**
 * 読み出し。**壊れていても既定値を返して例外を投げない。**
 * プライベートブラウズや容量超過で localStorage が使えないことがあるため。
 */
export function load(): SaveData {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw === null) return DEFAULT
    const parsed = JSON.parse(raw) as Partial<SaveData>
    if (parsed.version !== 1) return DEFAULT
    return {
      version: 1,
      deckName: typeof parsed.deckName === 'string' ? parsed.deckName : null,
      record: {
        wins: Number(parsed.record?.wins ?? 0) || 0,
        losses: Number(parsed.record?.losses ?? 0) || 0,
        draws: Number(parsed.record?.draws ?? 0) || 0,
      },
      muted: parsed.muted === true,
    }
  } catch {
    return DEFAULT
  }
}

export function save(data: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    // 保存できなくても遊べる状態は壊さない
  }
}
