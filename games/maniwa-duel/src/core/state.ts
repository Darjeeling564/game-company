/**
 * 状態を組み替えるヘルパ。すべて純粋関数で、引数の状態を書き換えない。
 *
 * reduce と rules から使う。ここに集めておくことで
 * 「players[0] を差し替えるつもりが [1] を触っていた」といった取り違えを1か所に閉じる。
 */
import type {
  GameState,
  InstanceId,
  LogEntry,
  MonsterOnField,
  PlayerId,
  PlayerSide,
  SpellOnField,
} from './types.ts'

export function playerAt(state: GameState, id: PlayerId): PlayerSide {
  return state.players[id]
}

/** 片側だけを差し替えた新しい状態を返す */
export function withPlayer(state: GameState, id: PlayerId, side: PlayerSide): GameState {
  const players: [PlayerSide, PlayerSide] =
    id === 0 ? [side, state.players[1]] : [state.players[0], side]
  return { ...state, players }
}

export function log(state: GameState, player: PlayerId, kind: string, detail: string): GameState {
  const entry: LogEntry = { turn: state.turn, player, kind, detail }
  return { ...state, log: [...state.log, entry] }
}

/**
 * 不正な Action を受けたときの扱い。
 *
 * **例外を投げず、状態を変えず、log に積むだけ**（SPEC 4章）。
 * これにより1万回シミュレーションとファジングを安全に回せる。
 */
export function reject(state: GameState, player: PlayerId, detail: string): GameState {
  return log(state, player, 'rejected', detail)
}

export interface FoundMonster {
  readonly player: PlayerId
  readonly zone: number
  readonly monster: MonsterOnField
}

/** 両者の場からモンスターを探す。見つからなければ null */
export function findOnField(state: GameState, id: InstanceId): FoundMonster | null {
  for (const player of [0, 1] as const) {
    const zones = state.players[player].monsters
    for (let zone = 0; zone < zones.length; zone += 1) {
      const m = zones[zone]
      if (m !== null && m !== undefined && m.instanceId === id) return { player, zone, monster: m }
    }
  }
  return null
}

/** 場のモンスターを差し替える。居なければ状態をそのまま返す */
export function updateMonster(
  state: GameState,
  id: InstanceId,
  update: (m: MonsterOnField) => MonsterOnField,
): GameState {
  const found = findOnField(state, id)
  if (found === null) return state
  const side = state.players[found.player]
  const monsters = side.monsters.map((m, i) => (i === found.zone ? update(found.monster) : m))
  return withPlayer(state, found.player, { ...side, monsters })
}

/** 場からモンスターを取り除いて墓地へ送る */
export function sendToGraveyard(state: GameState, id: InstanceId): GameState {
  const found = findOnField(state, id)
  if (found === null) return state
  const side = state.players[found.player]
  const monsters = side.monsters.map((m, i) => (i === found.zone ? null : m))
  return withPlayer(state, found.player, {
    ...side,
    monsters,
    graveyard: [...side.graveyard, found.monster.cardId],
  })
}

/** 場に出ているモンスターだけを並べる（null を除く） */
export function monstersOf(side: PlayerSide): readonly MonsterOnField[] {
  return side.monsters.filter((m): m is MonsterOnField => m !== null)
}

/** 魔法罠ゾーンに出ているカードだけを並べる（null を除く） */
export function spellsOf(side: PlayerSide): readonly SpellOnField[] {
  return side.spells.filter((s): s is SpellOnField => s !== null)
}

/** 空いているゾーンの番号。無ければ -1 */
export function firstEmptyZone(zones: readonly (unknown | null)[]): number {
  return zones.findIndex((z) => z === null)
}
