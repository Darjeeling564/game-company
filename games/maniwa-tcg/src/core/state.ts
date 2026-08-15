/**
 * GameState を組み替えるための小さな純粋ヘルパ。
 * reduce / rules / effects が共有する。ここに置くことで相互 import の循環を避ける。
 */
import type { Creature, GameState, InstanceId, LogEntry, PlayerId, PlayerState } from './types.ts'

export function playerAt(state: GameState, id: PlayerId): PlayerState {
  return state.players[id]
}

export function withPlayer(state: GameState, id: PlayerId, player: PlayerState): GameState {
  const players: readonly [PlayerState, PlayerState] =
    id === 0 ? [player, state.players[1]] : [state.players[0], player]
  return { ...state, players }
}

export function log(state: GameState, player: PlayerId, kind: string, detail: string): GameState {
  const entry: LogEntry = { turn: state.turn, player, kind, detail }
  return { ...state, log: [...state.log, entry] }
}

/** バトル場・ベンチを通した全個体 */
export function allCreatures(player: PlayerState): readonly Creature[] {
  return player.active === null ? player.bench : [player.active, ...player.bench]
}

/** 指定した個体だけを差し替える */
export function updateCreature(
  player: PlayerState,
  instanceId: InstanceId,
  fn: (creature: Creature) => Creature,
): PlayerState {
  const apply = (c: Creature): Creature => (c.instanceId === instanceId ? fn(c) : c)
  return {
    ...player,
    active: player.active === null ? null : apply(player.active),
    bench: player.bench.map(apply),
  }
}

/** 山札の1枚目を手札へ。山札切れでも敗北しない（SPEC 3.3） */
export function drawOne(player: PlayerState): PlayerState {
  const top = player.deck[0]
  if (top === undefined) return player
  return { ...player, deck: player.deck.slice(1), hand: [...player.hand, top] }
}
