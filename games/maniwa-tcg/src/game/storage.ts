/**
 * セーブデータ（SPEC 10章）。キーは <game-name>_v<n> 形式。
 * スキーマを変えるときはバージョンを上げ、旧データのマイグレーションをここに書く。
 */
const KEY = 'maniwa-tcg_v3'
/** 過去の保存先。設定や自作デッキを足すたびにバージョンを上げてきた */
const OLD_KEYS = ['maniwa-tcg_v2', 'maniwa-tcg_v1'] as const

/** 自作デッキ（SPEC 9.9）。core の Deck に id と作成時刻を足したもの */
export interface CustomDeck {
  readonly id: string
  readonly name: string
  readonly energy: readonly string[]
  readonly cards: readonly string[]
}

export interface SaveData {
  readonly version: 3
  readonly deckName: string | null
  readonly record: { readonly wins: number; readonly losses: number; readonly draws: number }
  /** 効果音を止めているか（SPEC 9.6） */
  readonly muted: boolean
  /** 自分で組んだデッキ（SPEC 9.9） */
  readonly decks: readonly CustomDeck[]
}

const DEFAULT: SaveData = {
  version: 3,
  deckName: null,
  record: { wins: 0, losses: 0, draws: 0 },
  muted: false,
  decks: [],
}

interface Stored {
  readonly version?: number
  readonly deckName?: unknown
  readonly record?: { readonly wins?: unknown; readonly losses?: unknown; readonly draws?: unknown }
  readonly muted?: unknown
  readonly decks?: unknown
}

/** 壊れた保存データで起動不能にしないため、1件ずつ形を確かめて拾う */
function readDecks(raw: unknown): readonly CustomDeck[] {
  if (!Array.isArray(raw)) return []
  const out: CustomDeck[] = []
  for (const item of raw) {
    if (item === null || typeof item !== 'object') continue
    const d = item as Partial<CustomDeck>
    if (typeof d.id !== 'string' || typeof d.name !== 'string') continue
    if (!Array.isArray(d.cards) || !Array.isArray(d.energy)) continue
    out.push({
      id: d.id,
      name: d.name,
      energy: d.energy.filter((e): e is string => typeof e === 'string'),
      cards: d.cards.filter((c): c is string => typeof c === 'string'),
    })
  }
  return out
}

function fromStored(parsed: Stored): SaveData {
  return {
    version: 3,
    deckName: typeof parsed.deckName === 'string' ? parsed.deckName : null,
    record: {
      wins: Number(parsed.record?.wins ?? 0),
      losses: Number(parsed.record?.losses ?? 0),
      draws: Number(parsed.record?.draws ?? 0),
    },
    muted: parsed.muted === true,
    decks: readDecks(parsed.decks),
  }
}

export function load(): SaveData {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw !== null) {
      const parsed = JSON.parse(raw) as Stored
      if (parsed.version === 3) return fromStored(parsed)
    }
    // 古い版からの移行。持っている項目だけ引き継ぎ、無い項目は既定にする
    for (const key of OLD_KEYS) {
      const old = localStorage.getItem(key)
      if (old === null) continue
      const parsed = JSON.parse(old) as Stored
      if (parsed.version !== 1 && parsed.version !== 2) continue
      const migrated = fromStored(parsed)
      save(migrated)
      return migrated
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
