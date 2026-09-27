/**
 * セーブデータ（SPEC 10章）。キーは `<game-name>_v<n>` 形式。
 * スキーマを変えるときはバージョンを上げ、旧データの移行をここに書く。
 *
 * `maniwa-tcg_v3` とは独立。同じ localStorage を使うが、キーが違うので混ざらない。
 *
 * **v2（2026-09-28）** でデッキ編集（SPEC 8.5）と対戦相手の選択（8.4）を足した。
 * 移行は読み出しのときに行い、**v1 のキーは消さない**（戻せなくなるため）。
 */
const KEY = 'maniwa-duel_v2'
const KEY_V1 = 'maniwa-duel_v1'

/** 自作デッキ。20枚に満たなくても保存できる（SPEC 8.5）。対戦に出せないだけ */
export interface CustomDeck {
  readonly name: string
  readonly cards: readonly string[]
}

export interface SaveData {
  readonly version: 2
  readonly deckName: string | null
  readonly record: { readonly wins: number; readonly losses: number; readonly draws: number }
  readonly muted: boolean
  readonly customDecks: readonly CustomDeck[]
  /** 前回選んだ対戦相手の姫神ID（SPEC 8.4） */
  readonly opponentId: string | null
}

const DEFAULT: SaveData = {
  version: 2,
  deckName: null,
  record: { wins: 0, losses: 0, draws: 0 },
  muted: false,
  customDecks: [],
  opponentId: null,
}

interface Loose {
  version?: unknown
  deckName?: unknown
  record?: { wins?: unknown; losses?: unknown; draws?: unknown }
  muted?: unknown
  customDecks?: unknown
  opponentId?: unknown
}

/**
 * 自作デッキの読み直し。
 *
 * **1つのデッキが壊れていても、他のデッキを巻き添えにしない**（SPEC 10.1）。
 * 配列でない・名前が無い・札が配列でないものだけを落とす。
 */
function readCustomDecks(raw: unknown): readonly CustomDeck[] {
  if (!Array.isArray(raw)) return []
  const out: CustomDeck[] = []
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue
    const d = item as { name?: unknown; cards?: unknown }
    if (typeof d.name !== 'string') continue
    if (!Array.isArray(d.cards)) continue
    out.push({ name: d.name, cards: d.cards.filter((c): c is string => typeof c === 'string') })
  }
  return out
}

function fromLoose(parsed: Loose): SaveData {
  return {
    version: 2,
    deckName: typeof parsed.deckName === 'string' ? parsed.deckName : null,
    record: {
      wins: Number(parsed.record?.wins ?? 0) || 0,
      losses: Number(parsed.record?.losses ?? 0) || 0,
      draws: Number(parsed.record?.draws ?? 0) || 0,
    },
    muted: parsed.muted === true,
    customDecks: readCustomDecks(parsed.customDecks),
    opponentId: typeof parsed.opponentId === 'string' ? parsed.opponentId : null,
  }
}

/**
 * 読み出し。**壊れていても既定値を返して例外を投げない。**
 * プライベートブラウズや容量超過で localStorage が使えないことがあるため。
 *
 * v2 が無ければ v1 を読んで移行する（SPEC 10.1）。
 */
export function load(): SaveData {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw !== null) {
      const parsed = JSON.parse(raw) as Loose
      if (parsed.version !== 2) return DEFAULT
      return fromLoose(parsed)
    }
    // --- v1 からの移行。v1 のキーは消さない
    const old = localStorage.getItem(KEY_V1)
    if (old === null) return DEFAULT
    const parsedOld = JSON.parse(old) as Loose
    if (parsedOld.version !== 1) return DEFAULT
    return fromLoose(parsedOld)
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
