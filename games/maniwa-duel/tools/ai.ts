/**
 * CPU の指し手（貪欲法）。
 *
 * legalActions が返した手をひとつずつ reduce に通し、**その結果の盤面を採点して
 * 一番良いものを選ぶ**。手ごとの重みを手で書かないので、カードが増えても
 * 調整し直す必要がない。
 *
 * maniwa-tcg の tools/ai.ts は効果の種類ごとに重みを持っていたが、
 * あちらは「1手で複数の効果が乗る」設計だった。こちらは1手1操作で
 * reduce が軽いので、**実際に指してみて盤面を見る**ほうが素直になる。
 */
import { legalActions, reduce, isOver } from '../src/core/reduce.ts'
import type { Action } from '../src/core/actions.ts'
import { nextInt } from '../src/core/rng.ts'
import type { Rng } from '../src/core/rng.ts'
import { effectiveAtk } from '../src/core/rules.ts'
import { monstersOf, spellsOf } from '../src/core/state.ts'
import type { GameState, PlayerId } from '../src/core/types.ts'
import { opponentOf } from '../src/core/types.ts'

/**
 * 盤面の良し悪し。**指す側から見た点数**。
 *
 * ライフ差を基準に、場の打点・手札・伏せ札を足す。
 * 係数は「ライフ1点＝1」を単位にした素朴なもので、
 * 攻撃力は1回殴ればライフに変わるのでほぼ等価に見ている。
 */
function score(state: GameState, me: PlayerId): number {
  const foe = opponentOf(me)
  if (state.winner === me) return 1e9
  if (state.winner === foe) return -1e9

  const mine = state.players[me]
  const theirs = state.players[foe]
  let value = mine.lp - theirs.lp

  for (const m of monstersOf(mine)) value += effectiveAtk(state, m.instanceId)
  for (const m of monstersOf(theirs)) value -= effectiveAtk(state, m.instanceId)

  // 手札と伏せ札は、いつか盤面に変わる分だけ軽く見る
  value += mine.hand.length * 120 - theirs.hand.length * 120
  /*
   * **チェーンに積んだ札も、まだ自分のものとして数える**（SPEC 11.1）。
   *
   * 積んだ時点でカードは伏せゾーンから外れるので、数えないと
   * 「積む」という手がその場では 150 点の損に見える。効果が出るのは
   * 解決してからなので、1手先しか読まないこの評価では**積む手が常に損**になり、
   * チェーンを組む判断ができなくなる。
   */
  const onChain = (p: PlayerId): number => state.chain.filter((l) => l.player === p).length
  value += (spellsOf(mine).length + onChain(me)) * 150
  value -= (spellsOf(theirs).length + onChain(foe)) * 150
  return value
}

/**
 * 同点のときの傾き。
 *
 * 盤面が動かない手（ターン終了など）より、動く手を選ばせる。
 * これが無いと、殴れるのに殴らずターンを終える指し手が出る。
 */
function bias(action: Action): number {
  switch (action.type) {
    case 'declareAttack': return 5
    case 'normalSummon': return 4
    case 'activateTrap': return 4
    case 'activateSpell': return 3
    case 'setMonster': return 2
    case 'setSpell': return 2
    case 'toBattle': return 1
    case 'changePosition': return 0.5
    default: return 0
  }
}

export interface Choice {
  readonly action: Action
  readonly rng: Rng
}

/** 指す手を1つ選ぶ。選べる手が無ければ null */
export function greedyPolicy(state: GameState, rng: Rng): Choice | null {
  if (isOver(state)) return null
  const actions = legalActions(state)
  if (actions.length === 0) return null

  const me = state.priority
  let best: Action[] = []
  let bestScore = -Infinity
  for (const action of actions) {
    const after = reduce(state, action)
    const s = score(after, me) + bias(action)
    if (s > bestScore + 1e-9) {
      bestScore = s
      best = [action]
    } else if (Math.abs(s - bestScore) <= 1e-9) {
      best.push(action)
    }
  }

  // 同点は乱数で割る。手番ごとの偏りを避けるため
  const r = nextInt(rng, best.length)
  return { action: best[r.value] as Action, rng: r.rng }
}
