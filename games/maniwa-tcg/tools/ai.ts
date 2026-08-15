/**
 * シミュレーションと CPU 対戦で共用する行動選択。
 *
 * 合法手の列挙は core の legalActions に任せ、ここでは「どれを選ぶか」だけを決める。
 * ルールを二重に実装しないための分担（SPEC 5章）。
 * 選択は乱数を持ち回るため、方策も含めて完全に決定論的になる。
 */
import type { Action } from '../src/core/actions.ts'
import { legalActions } from '../src/core/reduce.ts'
import type { Rng } from '../src/core/rng.ts'
import { pick } from '../src/core/rng.ts'
import { canPayCost } from '../src/core/rules.ts'
import type { Effect, GameState, PlayerId } from '../src/core/types.ts'
import { BENCH_SIZE, WEAKNESS_BONUS } from '../src/core/types.ts'
import { requireCard } from '../src/data/cards.ts'

export interface Choice {
  readonly rng: Rng
  readonly action: Action
}

/**
 * only を渡すと、そのプレイヤーの手だけを選ぶ。
 * 初期配置は両プレイヤーが同時に動けるため、指定が無いと相手の分まで
 * 打ってしまう。CPU 対戦では CPU を指定し、シミュレーションでは省略する。
 */
export type Policy = (state: GameState, rng: Rng, only?: PlayerId) => Choice | null

/** コイン依存は期待値で見積もる。順序付けにしか使わないので粗くてよい */
export function expectedDamage(effects: readonly Effect[]): number {
  let total = 0
  for (const effect of effects) {
    switch (effect.type) {
      case 'damage':
        if (effect.target === 'opponentActive') total += effect.value
        break
      case 'damagePerHeads':
        if (effect.target === 'opponentActive') total += (effect.value * effect.count) / 2
        break
      case 'coinFlip':
        total += expectedDamage(effect.then) / 2
        break
      case 'selfDamage':
        total -= effect.value / 4 // 反動はわずかに嫌う
        break
      default:
        break
    }
  }
  return total
}

function firstOf(actions: readonly Action[], type: Action['type']): Action | undefined {
  return actions.find((a) => a.type === type)
}

// ---------------------------------------------------------------- ランダム

/** 合法手から一様に選ぶ。無限ループ検出のストレス用 */
export const randomPolicy: Policy = (state, rng, only) => {
  const all = legalActions(state)
  const legal = only === undefined ? all : all.filter((a) => a.type !== 'start' && a.player === only)
  // 対象プレイヤーに手が無いときに相手の手を返すと、代わりに打ってしまう。
  // 手が無いことを null で返し、呼び出し側に判断させる
  if (legal.length === 0) return null
  const chosen = pick(rng, legal)
  return { rng: chosen.rng, action: chosen.item as Action }
}

// ---------------------------------------------------------------- 貪欲

/**
 * 素直な方策。ベンチを埋め、バトル場にエネルギーを乗せ、最大ダメージで殴る。
 * 人がひととおり考えて打つ手に近く、バランス測定の基準として使う。
 */
export const greedyPolicy: Policy = (state, rng, only) => {
  const all = legalActions(state)
  const legal = only === undefined ? all : all.filter((a) => a.type !== 'start' && a.player === only)
  if (legal.length === 0) return null

  // --- 初期配置 ---
  if (state.phase.kind === 'setup') {
    for (const id of [0, 1] as const) {
      if (only !== undefined && id !== only) continue
      if (state.setupDone[id]) continue
      const player = state.players[id]
      const places = legal.filter((a) => a.type === 'setupPlace' && a.player === id)
      const wantsMore = player.active === null || player.bench.length < BENCH_SIZE
      if (wantsMore && places.length > 0) {
        // 先発は初撃の速さを優先する。HP だけで選ぶと最安ワザが重いカードが先発になり、
        // 序盤に殴れないターンが生まれてしまう。ベンチは素直に HP の高い順。
        const forActive = player.active === null
        const scoreOf = (action: (typeof places)[number]): number => {
          if (action.type !== 'setupPlace') return -Infinity
          const card = requireCard(player.hand[action.handIndex] as string)
          if (!forActive) return card.hp
          const minCost = Math.min(...card.attacks.map((a) => a.cost.length))
          return -minCost * 1000 + card.hp
        }
        const best = places.reduce((a, b) => (scoreOf(b) > scoreOf(a) ? b : a))
        return { rng, action: best }
      }
      const done = legal.find((a) => a.type === 'setupDone' && a.player === id)
      if (done !== undefined) return { rng, action: done }
    }
  }

  // --- 入れ替え: 残り HP が最も多い個体を出す ---
  if (state.phase.kind === 'promote') {
    const owner = state.phase.queue[0] as PlayerId
    const bench = state.players[owner].bench
    const promotes = legal.filter((a) => a.type === 'promote')
    const best = promotes.reduce((a, b) => {
      const remaining = (x: typeof a) => {
        if (x.type !== 'promote') return -1
        const c = bench[x.benchIndex]
        return c === undefined ? -1 : requireCard(c.cardId).hp - c.damage
      }
      return remaining(b) > remaining(a) ? b : a
    })
    return { rng, action: best }
  }

  const id = state.current
  const player = state.players[id]

  // --- ベンチを埋める（HP の高い順） ---
  const plays = legal.filter((a) => a.type === 'playCreature')
  if (plays.length > 0) {
    const best = plays.reduce((a, b) => {
      const hpOf = (x: typeof a) =>
        x.type === 'playCreature' ? requireCard(player.hand[x.handIndex] as string).hp : 0
      return hpOf(b) > hpOf(a) ? b : a
    })
    return { rng, action: best }
  }

  // --- エネルギー: バトル場が最強のワザを撃てないなら優先、撃てるならベンチを育てる ---
  const attaches = legal.filter((a) => a.type === 'attachEnergy')
  if (attaches.length > 0) {
    const active = player.active
    // 最後のワザを最も強いものとして扱う（データの並び順の約束）
    const strongest = active === null ? undefined : requireCard(active.cardId).attacks.at(-1)
    const activeReady =
      active !== null && strongest !== undefined && canPayCost(active.attached, strongest.cost)

    if (active !== null && !activeReady) {
      const toActive = attaches.find((a) => a.type === 'attachEnergy' && a.target === active.instanceId)
      if (toActive !== undefined) return { rng, action: toActive }
    }
    const benchTargets = new Set(player.bench.map((c) => c.instanceId))
    const toBench = attaches.find((a) => a.type === 'attachEnergy' && benchTargets.has(a.target))
    return { rng, action: toBench ?? (attaches[0] as Action) }
  }

  // --- 攻撃: 期待ダメージが最大のワザ。相手を倒せるなら最優先 ---
  const attacks = legal.filter((a) => a.type === 'attack')
  if (attacks.length > 0 && player.active !== null) {
    const card = requireCard(player.active.cardId)
    const foe = state.players[id === 0 ? 1 : 0].active
    const remaining =
      foe === null ? Number.POSITIVE_INFINITY : requireCard(foe.cardId).hp - foe.damage
    const weak =
      foe !== null && requireCard(foe.cardId).weakness === card.type ? WEAKNESS_BONUS : 0

    const scored = attacks.map((action) => {
      const index = action.type === 'attack' ? action.attackIndex : 0
      const attack = card.attacks[index]
      const damage = attack === undefined ? 0 : expectedDamage(attack.effects) + weak
      return { action, score: damage >= remaining ? damage + 1000 : damage }
    })
    return { rng, action: scored.reduce((a, b) => (b.score > a.score ? b : a)).action }
  }

  const end = firstOf(legal, 'endTurn')
  if (end !== undefined) return { rng, action: end }
  return randomPolicy(state, rng, only)
}

export const POLICIES: Readonly<Record<string, Policy>> = {
  random: randomPolicy,
  greedy: greedyPolicy,
}
