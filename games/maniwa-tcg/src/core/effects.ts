/**
 * 効果タイプの解釈を一元化する（CLAUDE.md 4章）。
 *
 * カードは効果をデータとして持ち、ここが唯一の解釈者になる。
 * 新しい効果タイプを増やすときに触るのはこのファイルと types.ts の Effect だけで、
 * カードを追加するだけならロジックには一切触れない。
 */
import { flipCoins, nextInt } from './rng.ts'
import { allCreatures, drawOne, log, playerAt, updateCreature, withPlayer } from './state.ts'
import type { Creature, Effect, GameState, InstanceId, PlayerId, Target } from './types.ts'
import { WEAKNESS_BONUS, opponentOf } from './types.ts'
import { requireCard } from '../data/cards.ts'

interface Slot {
  readonly owner: PlayerId
  readonly instanceId: InstanceId
  /** バトル場の個体か。弱点はバトル場への攻撃にのみ適用する（SPEC 3.4） */
  readonly isActive: boolean
}

function slotOf(creature: Creature, owner: PlayerId, isActive: boolean): Slot {
  return { owner, instanceId: creature.instanceId, isActive }
}

/** 対象を解決する。opponentBenchRandom だけが乱数を消費する */
function resolveTargets(
  state: GameState,
  actor: PlayerId,
  target: Target,
): { readonly state: GameState; readonly slots: readonly Slot[] } {
  const foe = opponentOf(actor)
  const me = playerAt(state, actor)
  const them = playerAt(state, foe)

  switch (target) {
    case 'self':
    case 'ownActive':
      return { state, slots: me.active === null ? [] : [slotOf(me.active, actor, true)] }

    case 'opponentActive':
      return { state, slots: them.active === null ? [] : [slotOf(them.active, foe, true)] }

    case 'opponentBenchAll':
      return { state, slots: them.bench.map((c) => slotOf(c, foe, false)) }

    case 'opponentBenchRandom': {
      if (them.bench.length === 0) return { state, slots: [] }
      const rolled = nextInt(state.rng, them.bench.length)
      const chosen = them.bench[rolled.value] as Creature
      return { state: { ...state, rng: rolled.rng }, slots: [slotOf(chosen, foe, false)] }
    }
  }
}

/** 攻撃している側のタイプ。弱点判定に使う */
function attackerType(state: GameState, actor: PlayerId): string | null {
  const active = playerAt(state, actor).active
  return active === null ? null : requireCard(active.cardId).type
}

function dealDamage(state: GameState, actor: PlayerId, slot: Slot, base: number): GameState {
  if (base <= 0) return state
  const owner = playerAt(state, slot.owner)
  const target = allCreatures(owner).find((c) => c.instanceId === slot.instanceId)
  if (target === undefined) return state

  const card = requireCard(target.cardId)
  const type = attackerType(state, actor)
  const weak = slot.isActive && slot.owner !== actor && card.weakness !== null && card.weakness === type
  const amount = Math.max(0, base + (weak ? WEAKNESS_BONUS : 0))

  const updated = updateCreature(owner, slot.instanceId, (c) => ({ ...c, damage: c.damage + amount }))
  return log(withPlayer(state, slot.owner, updated), slot.owner, 'damage', `#${slot.instanceId} +${amount}`)
}

function applyOne(state: GameState, actor: PlayerId, effect: Effect): GameState {
  switch (effect.type) {
    case 'damage': {
      const resolved = resolveTargets(state, actor, effect.target)
      return resolved.slots.reduce((s, slot) => dealDamage(s, actor, slot, effect.value), resolved.state)
    }

    case 'damagePerHeads': {
      const flipped = flipCoins(state.rng, effect.count)
      const withRng = log({ ...state, rng: flipped.rng }, actor, 'coin', `${flipped.heads}/${effect.count} 表`)
      const resolved = resolveTargets(withRng, actor, effect.target)
      const total = effect.value * flipped.heads
      return resolved.slots.reduce((s, slot) => dealDamage(s, actor, slot, total), resolved.state)
    }

    case 'coinFlip': {
      const flipped = flipCoins(state.rng, effect.count)
      const withRng = log({ ...state, rng: flipped.rng }, actor, 'coin', `${flipped.heads}/${effect.count} 表`)
      if (flipped.heads < effect.min) return withRng
      return applyEffects(withRng, actor, effect.then)
    }

    case 'heal': {
      const resolved = resolveTargets(state, actor, effect.target)
      return resolved.slots.reduce((s, slot) => {
        const owner = playerAt(s, slot.owner)
        const updated = updateCreature(owner, slot.instanceId, (c) => ({
          ...c,
          damage: Math.max(0, c.damage - effect.value),
        }))
        return withPlayer(s, slot.owner, updated)
      }, resolved.state)
    }

    case 'selfDamage': {
      const resolved = resolveTargets(state, actor, 'self')
      return resolved.slots.reduce((s, slot) => {
        const owner = playerAt(s, slot.owner)
        const updated = updateCreature(owner, slot.instanceId, (c) => ({
          ...c,
          damage: c.damage + Math.max(0, effect.value),
        }))
        return log(withPlayer(s, slot.owner, updated), slot.owner, 'selfDamage', `+${effect.value}`)
      }, resolved.state)
    }

    case 'discardEnergy': {
      const resolved = resolveTargets(state, actor, effect.target)
      return resolved.slots.reduce((s, slot) => {
        const owner = playerAt(s, slot.owner)
        const updated = updateCreature(owner, slot.instanceId, (c) => ({
          ...c,
          attached: c.attached.slice(Math.max(0, effect.value)),
        }))
        return withPlayer(s, slot.owner, updated)
      }, resolved.state)
    }

    case 'applyStatus': {
      const resolved = resolveTargets(state, actor, effect.target)
      return resolved.slots.reduce((s, slot) => {
        const owner = playerAt(s, slot.owner)
        const updated = updateCreature(owner, slot.instanceId, (c) =>
          c.status.includes(effect.status) ? c : { ...c, status: [...c.status, effect.status] },
        )
        return log(withPlayer(s, slot.owner, updated), slot.owner, 'status', effect.status)
      }, resolved.state)
    }

    case 'draw': {
      let player = playerAt(state, actor)
      for (let i = 0; i < effect.value; i += 1) player = drawOne(player)
      return withPlayer(state, actor, player)
    }
  }
}

/** 効果を配列の先頭から順に解決する（SPEC 3.4） */
export function applyEffects(state: GameState, actor: PlayerId, effects: readonly Effect[]): GameState {
  return effects.reduce((s, effect) => applyOne(s, actor, effect), state)
}
