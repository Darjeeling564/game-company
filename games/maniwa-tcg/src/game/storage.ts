/**
 * セーブデータ（SPEC 10章）。キーは <game-name>_v1 形式。
 * スキーマを変えるときはバージョンを上げ、旧データのマイグレーションをここに書く。
 */
const KEY = 'maniwa-tcg_v1'

export interface SaveData {
  readonly version: 1
  readonly deckName: string | null
  readonly record: { readonly wins: number; readonly losses: number; readonly draws: number }
}

const DEFAULT: SaveData = {
  version: 1,
  deckName: null,
  record: { wins: 0, losses: 0, draws: 0 },
}

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
        wins: Number(parsed.record?.wins ?? 0),
        losses: Number(parsed.record?.losses ?? 0),
        draws: Number(parsed.record?.draws ?? 0),
      },
    }
  } catch {
    // 壊れたデータで起動不能にしない
    return DEFAULT
  }
}

export function save(data: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    // 保存できなくても対戦は続行できる
  }
}

export function recordResult(outcome: 'win' | 'loss' | 'draw'): SaveData {
  const current = load()
  const record = { ...current.record }
  if (outcome === 'win') record.wins += 1
  else if (outcome === 'loss') record.losses += 1
  else record.draws += 1
  const updated: SaveData = { ...current, record }
  save(updated)
  return updated
}
