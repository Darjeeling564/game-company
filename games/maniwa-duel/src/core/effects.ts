/**
 * 効果の解釈を一元化する（CLAUDE.md 4章・SPEC 7章）。
 *
 * カードは効果を**データ**として持ち、ここだけがその意味を決める。
 * カードを足すときにロジックを触らずに済ませるための境界である。
 *
 * **v1 が解釈するのは OneShot だけ。** 継続効果（Continuous）は
 * rules.ts の effectiveAtk / effectiveDef が場を走査して当てるので、
 * ここには現れない（SPEC 6.4）。
 */
import { findCard, findMonster } from '../data/cards.ts'
import { nextInt } from './rng.ts'
import {
  findOnField,
  log,
  monstersOf,
  playerAt,
  sendToGraveyard,
  updateMonster,
  withPlayer,
} from './state.ts'
import type {
  EffectTarget,
  GameState,
  InstanceId,
  OneShot,
  PlayerId,
} from './types.ts'
import { opponentOf } from './types.ts'

export interface EffectContext {
  /** 効果を出した側 */
  readonly player: PlayerId
  /**
   * 発動時に選んだ姫神。opponentMonsterOne / ownMonsterOne が使う。
   * 選ぶ必要があるのに null なら、その効果は不発になる（状態は壊さない）。
   */
  readonly chosen: InstanceId | null
}

/** その効果が「1体を選ぶ」ことを要求するか。legalActions が候補を並べるのに使う */
export function needsChoice(effects: readonly OneShot[]): boolean {
  return effects.some(
    (e) =>
      'target' in e && (e.target === 'opponentMonsterOne' || e.target === 'ownMonsterOne'),
  )
}

/** 効果の対象になる姫神を並べる */
function resolveMonsters(
  state: GameState,
  target: EffectTarget,
  ctx: EffectContext,
): readonly InstanceId[] {
  const foe = opponentOf(ctx.player)
  switch (target) {
    case 'opponentMonsterAll':
      return monstersOf(playerAt(state, foe)).map((m) => m.instanceId)
    case 'ownMonsterAll':
      return monstersOf(playerAt(state, ctx.player)).map((m) => m.instanceId)
    case 'opponentMonsterOne': {
      if (ctx.chosen === null) return []
      const found = findOnField(state, ctx.chosen)
      return found !== null && found.player === foe ? [ctx.chosen] : []
    }
    case 'ownMonsterOne': {
      if (ctx.chosen === null) return []
      const found = findOnField(state, ctx.chosen)
      return found !== null && found.player === ctx.player ? [ctx.chosen] : []
    }
    case 'attacker': {
      // 罠専用。攻撃してきた姫神
      const id = state.pendingAttack?.attacker
      return id === undefined ? [] : [id]
    }
    case 'opponent':
    case 'self':
      return []
  }
}

function playerOf(target: 'opponent' | 'self', ctx: EffectContext): PlayerId {
  return target === 'self' ? ctx.player : opponentOf(ctx.player)
}

/**
 * 効果をひとつ当てる。
 *
 * **ライフの増減だけは reduce 側の changeLife を通す必要がある**（決着判定を含むため）。
 * ここでは素朴に足し引きし、呼び出し元がまとめて決着を見る。
 */
function applyOne(state: GameState, effect: OneShot, ctx: EffectContext): GameState {
  switch (effect.type) {
    case 'lifeDamage': {
      const p = playerOf(effect.target, ctx)
      const side = playerAt(state, p)
      return log(withPlayer(state, p, { ...side, lp: side.lp - effect.value }), p, 'damage',
        `ライフ ${side.lp} → ${side.lp - effect.value}`)
    }
    case 'lifeHeal': {
      const p = playerOf(effect.target, ctx)
      const side = playerAt(state, p)
      return log(withPlayer(state, p, { ...side, lp: side.lp + effect.value }), p, 'heal',
        `ライフ ${side.lp} → ${side.lp + effect.value}`)
    }
    case 'destroy': {
      let next = state
      for (const id of resolveMonsters(state, effect.target, ctx)) {
        const found = findOnField(next, id)
        if (found === null) continue
        const name = findCard(found.monster.cardId)?.name ?? found.monster.cardId
        next = log(sendToGraveyard(next, id), ctx.player, 'destroy', `${name} を破壊した`)
      }
      return next
    }
    case 'atkChange': {
      let next = state
      for (const id of resolveMonsters(state, effect.target, ctx)) {
        next = updateMonster(next, id, (m) => ({ ...m, atkDelta: m.atkDelta + effect.value }))
      }
      return resolveMonsters(state, effect.target, ctx).length === 0
        ? next
        : log(next, ctx.player, 'atk', `攻撃力 ${effect.value > 0 ? '+' : ''}${effect.value}`)
    }
    case 'position': {
      let next = state
      for (const id of resolveMonsters(state, effect.target, ctx)) {
        next = updateMonster(next, id, (m) =>
          m.faceDown
            ? { ...m, faceDown: false, position: effect.position }
            : { ...m, position: effect.position })
      }
      return next
    }
    case 'draw': {
      const side = playerAt(state, ctx.player)
      const n = Math.min(effect.value, side.deck.length)
      if (n === 0) return log(state, ctx.player, 'draw', '引けなかった')
      const next = withPlayer(state, ctx.player, {
        ...side, deck: side.deck.slice(n), hand: [...side.hand, ...side.deck.slice(0, n)],
      })
      return log(next, ctx.player, 'draw', `${n}枚引いた`)
    }
    case 'discard': {
      const p = playerOf(effect.target, ctx)
      let next = state
      for (let i = 0; i < effect.value; i += 1) {
        const side = playerAt(next, p)
        if (side.hand.length === 0) break
        // どれを捨てるかは選ばせず、乱数で決める（v1）
        const r = nextInt(next.rng, side.hand.length)
        const card = side.hand[r.value] as string
        next = withPlayer({ ...next, rng: r.rng }, p, {
          ...side,
          hand: side.hand.filter((_, k) => k !== r.value),
          graveyard: [...side.graveyard, card],
        })
        next = log(next, p, 'discard', `${findCard(card)?.name ?? card} を捨てた`)
      }
      return next
    }
    case 'search': {
      const side = playerAt(state, ctx.player)
      // 山札は既にシャッフル済みなので、先頭から探す形で十分に散る（v1）
      const index = side.deck.findIndex((id) => findCard(id)?.kind === effect.kind)
      if (index < 0) return log(state, ctx.player, 'search', '見つからなかった')
      const card = side.deck[index] as string
      const next = withPlayer(state, ctx.player, {
        ...side,
        deck: side.deck.filter((_, i) => i !== index),
        hand: [...side.hand, card],
      })
      return log(next, ctx.player, 'search', `${findCard(card)?.name ?? card} を手札に加えた`)
    }
    case 'revive': {
      const side = playerAt(state, ctx.player)
      const zone = side.monsters.findIndex((m) => m === null)
      if (zone < 0) return log(state, ctx.player, 'revive', '場が埋まっている')
      // 墓地の姫神のうち攻撃力が最大のものを選ぶ（v1 は選ばせない）
      let best: { id: string; atk: number; index: number } | null = null
      side.graveyard.forEach((id, index) => {
        const def = findMonster(id)
        if (def !== null && (best === null || def.atk > best.atk)) best = { id, atk: def.atk, index }
      })
      if (best === null) return log(state, ctx.player, 'revive', '墓地に姫神がいない')
      const chosen: { id: string; atk: number; index: number } = best
      const monsters = side.monsters.map((m, i) =>
        i === zone
          ? {
              instanceId: state.nextInstanceId,
              cardId: chosen.id,
              position: 'attack' as const,
              faceDown: false,
              hasAttacked: false,
              summonedThisTurn: true,
              changedThisTurn: false,
              atkDelta: 0,
            }
          : m)
      const next = withPlayer({ ...state, nextInstanceId: state.nextInstanceId + 1 }, ctx.player, {
        ...side,
        monsters,
        graveyard: side.graveyard.filter((_, i) => i !== chosen.index),
      })
      return log(next, ctx.player, 'revive', `${findCard(chosen.id)?.name ?? chosen.id} を蘇生した`)
    }
    case 'negateAttack': {
      // 罠専用。pendingAttack が無いときは何もしない
      if (state.pendingAttack === null) {
        return log(state, ctx.player, 'rejected', '攻撃の最中ではないので無効化できない')
      }
      return log({ ...state, pendingAttack: { ...state.pendingAttack, negated: true } },
        ctx.player, 'negate', '攻撃を無効にした')
    }
  }
}

/** 効果を順に当てる。**ライフの決着判定は呼び出し元が行う** */
export function applyEffects(
  state: GameState,
  effects: readonly OneShot[],
  ctx: EffectContext,
): GameState {
  let next = state
  for (const e of effects) next = applyOne(next, e, ctx)
  return next
}

/** 空きゾーンが要る効果かどうか。legalActions の絞り込みに使う */
export function needsEmptyZone(effects: readonly OneShot[]): boolean {
  return effects.some((e) => e.type === 'revive')
}
