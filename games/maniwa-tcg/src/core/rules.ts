/**
 * ルールの本体。コスト判定・ターン境界・きぜつ・勝敗判定（SPEC 3章）。
 * 状態遷移は state.ts のヘルパ経由で行い、効果の解釈は effects.ts に委ねる。
 */
import { applyEffects } from './effects.ts'
import { pick } from './rng.ts'
import type { Rng } from './rng.ts'
import { allCreatures, drawOne, log, playerAt, withPlayer } from './state.ts'
import type { Creature, EnergyType, GameState, PlayerId, PlayerState } from './types.ts'
import {
  MAX_TURNS,
  POINTS_FOR_EX,
  POINTS_FOR_NORMAL,
  POINTS_TO_WIN,
  POISON_DAMAGE,
  opponentOf,
} from './types.ts'
import { requireCard } from '../data/cards.ts'

// ---------------------------------------------------------------- コスト

/**
 * 付与されているエネルギーで攻撃コストを支払えるか。
 * colorless は任意のタイプ1個で支払えるため、先に色指定を消費してから残数で判定する。
 */
export function canPayCost(attached: readonly EnergyType[], cost: readonly EnergyType[]): boolean {
  const pool = [...attached]
  let colorless = 0
  for (const required of cost) {
    if (required === 'colorless') {
      colorless += 1
      continue
    }
    const index = pool.indexOf(required)
    if (index === -1) return false
    pool.splice(index, 1)
  }
  return pool.length >= colorless
}

export function isKnockedOut(creature: Creature): boolean {
  return creature.damage >= requireCard(creature.cardId).hp
}

// ---------------------------------------------------------------- ターン境界

function rollEnergy(rng: Rng, pool: readonly EnergyType[]): { readonly rng: Rng; readonly energy: EnergyType | null } {
  const picked = pick(rng, pool)
  return { rng: picked.rng, energy: picked.item }
}

/** 手番開始時の自動処理: エネルギー供給 → ドロー → フラグのリセット（SPEC 3.3） */
export function beginTurn(state: GameState): GameState {
  if (state.turn > MAX_TURNS) return finishByTurnLimit(state)

  const id = state.current
  const player = playerAt(state, id)
  const rolled = rollEnergy(state.rng, player.energy.pool)

  const supplied: PlayerState = {
    ...player,
    energy: { ...player.energy, current: player.energy.next, next: rolled.energy },
    attachedThisTurn: false,
    retreatedThisTurn: false,
  }

  const next = withPlayer({ ...state, rng: rolled.rng }, id, drawOne(supplied))
  return log(next, id, 'beginTurn', `turn=${next.turn}`)
}

export function finishByTurnLimit(state: GameState): GameState {
  const a = playerAt(state, 0).points
  const b = playerAt(state, 1).points
  const winner: PlayerId | null = a === b ? null : a > b ? 0 : 1
  return log(
    { ...state, phase: { kind: 'ended' }, winner, endReason: 'turnLimit' },
    state.current,
    'end',
    `turnLimit points=${a}:${b}`,
  )
}

/** 未使用エネルギーは持ち越さずに手番を渡す */
export function passTurn(state: GameState): GameState {
  const id = state.current
  const player = playerAt(state, id)
  const cleared = withPlayer(state, id, { ...player, energy: { ...player.energy, current: null } })
  return beginTurn({ ...cleared, current: opponentOf(id), turn: cleared.turn + 1 })
}

// ---------------------------------------------------------------- きぜつと勝敗

/**
 * きぜつ判定と得点。手番プレイヤーの相手 → 手番プレイヤー の順に処理する（SPEC 3.5）。
 * 自分の反動で自分がきぜつした場合も、得点は相手に入る。
 */
function resolveKnockouts(state: GameState, actor: PlayerId): GameState {
  let current = state

  for (const id of [opponentOf(actor), actor] as const) {
    const player = playerAt(current, id)
    const knocked = allCreatures(player).filter(isKnockedOut)
    if (knocked.length === 0) continue

    const ids = new Set(knocked.map((c) => c.instanceId))
    const gained = knocked.reduce(
      (sum, c) => sum + (requireCard(c.cardId).ex ? POINTS_FOR_EX : POINTS_FOR_NORMAL),
      0,
    )

    current = withPlayer(current, id, {
      ...player,
      active: player.active !== null && ids.has(player.active.instanceId) ? null : player.active,
      bench: player.bench.filter((c) => !ids.has(c.instanceId)),
      discard: [...player.discard, ...knocked.map((c) => c.cardId)],
    })

    const foe = opponentOf(id)
    const scorer = playerAt(current, foe)
    current = withPlayer(current, foe, { ...scorer, points: scorer.points + gained })
    current = log(current, id, 'ko', `${knocked.length}体きぜつ / p${foe} +${gained}`)
  }

  return current
}

function end(state: GameState, winner: PlayerId | null, reason: GameState['endReason']): GameState {
  return log({ ...state, phase: { kind: 'ended' }, winner, endReason: reason }, state.current, 'end', `${reason}`)
}

/** SPEC 3.6 の順序どおりに評価する */
function checkVictory(state: GameState, actor: PlayerId): GameState {
  const p0 = playerAt(state, 0).points
  const p1 = playerAt(state, 1).points

  // 1. 同時到達は手番プレイヤーの勝ち（14章 Q2）
  if (p0 >= POINTS_TO_WIN && p1 >= POINTS_TO_WIN) return end(state, actor, 'simultaneous')
  if (p0 >= POINTS_TO_WIN) return end(state, 0, 'points')
  if (p1 >= POINTS_TO_WIN) return end(state, 1, 'points')

  // 3. バトル場が空でベンチにも出せる個体がいない
  const stranded = ([0, 1] as const).filter((id) => {
    const p = playerAt(state, id)
    return p.active === null && p.bench.length === 0
  })
  if (stranded.length === 2) return end(state, actor, 'noCreature')
  const loser = stranded[0]
  if (loser !== undefined) return end(state, opponentOf(loser), 'noCreature')

  return state
}

function promoteQueue(state: GameState, actor: PlayerId): readonly PlayerId[] {
  return ([opponentOf(actor), actor] as const).filter((id) => {
    const p = playerAt(state, id)
    return p.active === null && p.bench.length > 0
  })
}

/** 効果解決後の共通処理: きぜつ → 勝敗 → 入れ替え待ち or 手番交代 */
function settle(state: GameState, actor: PlayerId): GameState {
  const resolved = checkVictory(resolveKnockouts(state, actor), actor)
  if (resolved.phase.kind === 'ended') return resolved

  const queue = promoteQueue(resolved, actor)
  if (queue.length > 0) return { ...resolved, phase: { kind: 'promote', queue } }
  return passTurn(resolved)
}

/**
 * ターンの締め。どくのダメージを与えてから、きぜつと勝敗をまとめて解決する。
 * 攻撃で終わる場合も同じ経路を通り、きぜつ判定が1回で済むようにしている。
 */
export function finishTurn(state: GameState, actor: PlayerId): GameState {
  let current = state
  for (const id of [0, 1] as const) {
    const player = playerAt(current, id)
    const active = player.active
    if (active === null || !active.status.includes('poisoned')) continue
    current = withPlayer(current, id, { ...player, active: { ...active, damage: active.damage + POISON_DAMAGE } })
    current = log(current, id, 'poison', `#${active.instanceId} +${POISON_DAMAGE}`)
  }
  return settle(current, actor)
}

/** 入れ替えがすべて済んだあとに呼ぶ */
export function afterPromote(state: GameState): GameState {
  return passTurn(state)
}

// ---------------------------------------------------------------- 攻撃

/** 攻撃可能かを判定する。不可なら理由を返す（SPEC 3.3・3.4） */
export function attackError(state: GameState, actor: PlayerId, attackIndex: number): string | null {
  if (state.turn === 1 && actor === state.firstPlayer) return '先攻1ターン目は攻撃できない'
  const active = playerAt(state, actor).active
  if (active === null) return 'バトル場が空'
  const attack = requireCard(active.cardId).attacks[attackIndex]
  if (attack === undefined) return 'そのワザは無い'
  if (!canPayCost(active.attached, attack.cost)) return 'エネルギーが足りない'
  return null
}

export function performAttack(state: GameState, actor: PlayerId, attackIndex: number): GameState {
  const active = playerAt(state, actor).active as Creature
  const attack = requireCard(active.cardId).attacks[attackIndex]
  if (attack === undefined) return state

  const announced = log(state, actor, 'attack', attack.name)
  const resolved = applyEffects(announced, actor, attack.effects)
  return finishTurn(resolved, actor)
}
