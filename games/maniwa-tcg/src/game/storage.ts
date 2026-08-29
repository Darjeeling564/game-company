/**
 * セーブデータ（SPEC 10章）。キーは <game-name>_v<n> 形式。
 * スキーマを変えるときはバージョンを上げ、旧データのマイグレーションをここに書く。
 */
const KEY = 'maniwa-tcg_v2'
/** v1 の保存先。効果音の設定（muted）を足したときに v2 へ上げた */
const KEY_V1 = 'maniwa-tcg_v1'

export interface SaveData {
  readonly version: 2
  readonly deckName: string | null
  readonly record: { readonly wins: number; readonly losses: number; readonly draws: number }
  /** 効果音を止めているか（SPEC 9.6） */
  readonly muted: boolean
}

const DEFAULT: SaveData = {
  version: 2,
  deckName: null,
  record: { wins: 0, losses: 0, draws: 0 },
  muted: false,
}

interface Stored {
  readonly version?: number
  readonly deckName?: unknown
  readonly record?: { readonly wins?: unknown; readonly losses?: unknown; readonly draws?: unknown }
  readonly muted?: unknown
}

function fromStored(parsed: Stored): SaveData {
  return {
    version: 2,
    deckName: typeof parsed.deckName === 'string' ? parsed.deckName : null,
    record: {
      wins: Number(parsed.record?.wins ?? 0),
      losses: Number(parsed.record?.losses ?? 0),
      draws: Number(parsed.record?.draws ?? 0),
    },
    muted: parsed.muted === true,
  }
}

export function load(): SaveData {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw !== null) {
      const parsed = JSON.parse(raw) as Stored
      if (parsed.version === 2) return fromStored(parsed)
    }
    // v1 からの移行。戦績とデッキ名を引き継ぎ、muted は既定（鳴らす）にする
    const old = localStorage.getItem(KEY_V1)
    if (old !== null) {
      const parsed = JSON.parse(old) as Stored
      if (parsed.version === 1) {
        const migrated = fromStored(parsed)
        save(migrated)
        return migrated
      }
    }
    return DEFAULT
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
