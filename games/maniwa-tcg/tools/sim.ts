/**
 * バランスシミュレーション（SPEC 12章）。
 *
 *   npm run sim -- maniwa-tcg
 *   npm run sim -- maniwa-tcg --games=2000 --policy=random --json
 *
 * 基準を外れた数値は報告するだけで、カードデータは書き換えない（CLAUDE.md 5章）。
 */
import { EMPTY_STATE, isOver, reduce } from '../src/core/reduce.ts'
import { createRng } from '../src/core/rng.ts'
import type { Deck, EndReason, GameState, PlayerId } from '../src/core/types.ts'
import { MAX_TURNS } from '../src/core/types.ts'
import { CARDS } from '../src/data/cards.ts'
import { DECKS } from '../src/data/decks.ts'
import type { Policy } from './ai.ts'
import { POLICIES, greedyPolicy } from './ai.ts'

// ---------------------------------------------------------------- 設定

/** 1ターンあたりの想定操作時間（秒）。根拠のない暫定値で、実機プレイ後に実測して更新する（SPEC 14章 Q4） */
const SECONDS_PER_TURN = 12
const MAX_STEPS = 20000

interface Options {
  readonly games: number
  readonly seed: number
  readonly policy: Policy
  readonly policyName: string
  readonly json: boolean
}

function parseOptions(argv: readonly string[]): Options {
  const get = (name: string): string | undefined =>
    argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1]
  const policyName = get('policy') ?? 'greedy'
  return {
    games: Number(get('games') ?? 10000),
    seed: Number(get('seed') ?? 20260815),
    policy: POLICIES[policyName] ?? greedyPolicy,
    policyName: POLICIES[policyName] === undefined ? 'greedy' : policyName,
    json: argv.includes('--json'),
  }
}

// ---------------------------------------------------------------- 1試合

interface MatchResult {
  readonly winner: PlayerId | null
  readonly endReason: EndReason | null
  readonly turns: number
  readonly firstPlayer: PlayerId
  /** プレイヤーごとに、実際に場に出す・攻撃するのに使ったカード */
  readonly used: readonly [ReadonlySet<string>, ReadonlySet<string>]
  readonly attacks: readonly [number, number]
  readonly retreats: readonly [number, number]
  readonly attaches: readonly [number, number]
  /** 使われずに終わったエネルギー */
  readonly wastedEnergy: number
}

function runMatch(seed: number, decks: readonly [Deck, Deck], firstPlayer: PlayerId, policy: Policy): MatchResult {
  let state: GameState = reduce(EMPTY_STATE, { type: 'start', seed, decks, firstPlayer })
  let rng = createRng(seed ^ 0x9e3779b9)

  const used: [Set<string>, Set<string>] = [new Set(), new Set()]
  const attacks: [number, number] = [0, 0]
  const retreats: [number, number] = [0, 0]
  const attaches: [number, number] = [0, 0]
  let wastedEnergy = 0

  for (let step = 0; step < MAX_STEPS && !isOver(state); step += 1) {
    const before = state
    const chosen = policy(state, rng)
    if (chosen === null) break
    rng = chosen.rng
    const action = chosen.action

    switch (action.type) {
      case 'setupPlace':
      case 'playCreature': {
        const cardId = before.players[action.player].hand[action.handIndex]
        if (cardId !== undefined) used[action.player].add(cardId)
        break
      }
      case 'attack': {
        const active = before.players[action.player].active
        if (active !== null) used[action.player].add(active.cardId)
        attacks[action.player] += 1
        break
      }
      case 'retreat':
        retreats[action.player] += 1
        break
      case 'attachEnergy':
        attaches[action.player] += 1
        break
      default:
        break
    }

    state = reduce(state, action)

    // 手番が移った瞬間に在庫が残っていたら余剰。攻撃でもターンは終わるため、
    // endTurn だけを見ていると取りこぼす（random AI で約25%の過小計上になっていた）
    if (before.current !== state.current && before.players[before.current].energy.current !== null) {
      wastedEnergy += 1
    }
  }

  return {
    winner: state.winner,
    endReason: state.endReason,
    turns: state.turn,
    firstPlayer,
    used: [used[0], used[1]],
    attacks,
    retreats,
    attaches,
    wastedEnergy,
  }
}

// ---------------------------------------------------------------- 集計

function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] as number
}

function mean(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length
}

function pct(part: number, total: number): string {
  return total === 0 ? '-' : `${((part / total) * 100).toFixed(1)}%`
}

interface CardStat {
  readonly id: string
  readonly name: string
  readonly origin: string
  readonly rarity: string
  inDeck: number
  usedIn: number
  winsWhenUsed: number
}

/** レアリティは記号ではなくアルファベットで表す（SPEC 9.1）。UI と表記を揃える */
const RARITY_MARK: Readonly<Record<string, string>> = {
  common: 'C', uncommon: 'U', rare: 'R', ultra: 'UR',
}
const RARITY_ORDER = ['ultra', 'rare', 'uncommon', 'common']

// ---------------------------------------------------------------- 実行

const options = parseOptions(process.argv.slice(2))

/**
 * ミラーマッチ（先手勝率の測定用）と、デッキの全組み合わせ（相性の測定用）を作る。
 * デッキを増やしても、ここを触らずに対戦表が広がる。
 */
function buildGroups(total: number): readonly { label: string; decks: readonly [Deck, Deck]; count: number; mirror: boolean }[] {
  const mirrors = DECKS.map((deck) => ({
    label: `${deck.name} vs ${deck.name}`,
    decks: [deck, deck] as readonly [Deck, Deck],
    mirror: true,
  }))
  const crosses = DECKS.flatMap((a, i) =>
    DECKS.slice(i + 1).map((b) => ({
      label: `${a.name} vs ${b.name}`,
      decks: [a, b] as readonly [Deck, Deck],
      mirror: false,
    })),
  )

  // 先手勝率はミラーでしか測れないので、試合数の6割をミラーに割り当てる
  const mirrorBudget = Math.floor(total * 0.6)
  const perMirror = Math.floor(mirrorBudget / Math.max(1, mirrors.length))
  const crossBudget = total - perMirror * mirrors.length
  const perCross = Math.floor(crossBudget / Math.max(1, crosses.length))
  const remainder = crossBudget - perCross * crosses.length

  return [
    ...mirrors.map((g) => ({ ...g, count: perMirror })),
    ...crosses.map((g, i) => ({ ...g, count: perCross + (i === 0 ? remainder : 0) })),
  ]
}

const groups = buildGroups(options.games)

const stats = new Map<string, CardStat>(
  CARDS.map((c) => [
    c.id,
    { id: c.id, name: c.name, origin: c.origin, rarity: c.rarity, inDeck: 0, usedIn: 0, winsWhenUsed: 0 },
  ]),
)

const allTurns: number[] = []
const endReasons = new Map<string, number>()
const matchupWins = new Map<string, { a: number; b: number; draw: number }>()
let mirrorDecided = 0
let mirrorFirstWins = 0
let draws = 0
let turnLimitHits = 0
let totalAttacks = 0
let totalRetreats = 0
let totalAttaches = 0
let totalWasted = 0

const startedAt = performance.now()
let seed = options.seed

for (const group of groups) {
  const tally = { a: 0, b: 0, draw: 0 }

  for (let i = 0; i < group.count; i += 1) {
    seed += 1
    const firstPlayer: PlayerId = (i % 2) as PlayerId
    const result = runMatch(seed, group.decks, firstPlayer, options.policy)

    allTurns.push(result.turns)
    endReasons.set(result.endReason ?? 'none', (endReasons.get(result.endReason ?? 'none') ?? 0) + 1)
    if (result.endReason === 'turnLimit') turnLimitHits += 1
    totalAttacks += result.attacks[0] + result.attacks[1]
    totalRetreats += result.retreats[0] + result.retreats[1]
    totalAttaches += result.attaches[0] + result.attaches[1]
    totalWasted += result.wastedEnergy

    if (result.winner === null) {
      draws += 1
      tally.draw += 1
    } else {
      if (result.winner === 0) tally.a += 1
      else tally.b += 1
      if (group.mirror) {
        mirrorDecided += 1
        if (result.winner === firstPlayer) mirrorFirstWins += 1
      }
    }

    for (const id of [0, 1] as const) {
      const deckCards = new Set(group.decks[id].cards)
      for (const cardId of deckCards) {
        const stat = stats.get(cardId)
        if (stat !== undefined) stat.inDeck += 1
      }
      for (const cardId of result.used[id]) {
        const stat = stats.get(cardId)
        if (stat === undefined) continue
        stat.usedIn += 1
        if (result.winner === id) stat.winsWhenUsed += 1
      }
    }
  }

  matchupWins.set(group.label, tally)
}

const elapsed = performance.now() - startedAt
const sortedTurns = [...allTurns].sort((a, b) => a - b)
const avgTurns = mean(allTurns)
const overallWinRate = 0.5 // 2人対戦なので全体勝率は定義上50%
const unused = [...stats.values()].filter((s) => s.usedIn === 0)
const firstRate = mirrorDecided === 0 ? 0 : mirrorFirstWins / mirrorDecided

// ---------------------------------------------------------------- 出力

if (options.json) {
  console.log(
    JSON.stringify(
      {
        games: options.games,
        seed: options.seed,
        policy: options.policyName,
        firstPlayerWinRate: firstRate,
        drawRate: draws / options.games,
        turnLimitRate: turnLimitHits / options.games,
        turns: { mean: avgTurns, median: percentile(sortedTurns, 0.5), min: sortedTurns[0], max: sortedTurns.at(-1) },
        estimatedMinutesPerGame: (avgTurns * SECONDS_PER_TURN) / 60,
        msPerGame: elapsed / options.games,
        endReasons: Object.fromEntries(endReasons),
        matchups: Object.fromEntries(matchupWins),
        cards: [...stats.values()].map((s) => ({
          id: s.id,
          name: s.name,
          origin: s.origin,
          rarity: s.rarity,
          adoptionRate: s.inDeck / (options.games * 2),
          usageRate: s.inDeck === 0 ? 0 : s.usedIn / s.inDeck,
          winRateWhenUsed: s.usedIn === 0 ? null : s.winsWhenUsed / s.usedIn,
        })),
        unusedCards: unused.map((s) => s.id),
      },
      null,
      2,
    ),
  )
} else {
  const line = (label: string, value: string) => console.log(`  ${label.padEnd(22, '　')} ${value}`)

  console.log(`\n=== maniwa-tcg バランスシミュレーション ===`)
  console.log(`  ${options.games} 戦 / policy=${options.policyName} / seed=${options.seed}\n`)

  console.log('■ 先手勝率（ミラーマッチ ' + mirrorDecided + ' 戦で測定）')
  const verdict = firstRate >= 0.45 && firstRate <= 0.55 ? 'OK' : '★基準外（45〜55%）'
  line('先手勝率', `${(firstRate * 100).toFixed(1)}%  ${verdict}`)
  line('引き分け率', pct(draws, options.games))
  console.log('')

  console.log('■ 試合の長さ')
  line('平均ターン数', avgTurns.toFixed(1))
  line('中央値 / 最小 / 最大', `${percentile(sortedTurns, 0.5)} / ${sortedTurns[0]} / ${sortedTurns.at(-1)}`)
  line('推定プレイ時間', `${((avgTurns * SECONDS_PER_TURN) / 60).toFixed(1)} 分/試合（1ターン${SECONDS_PER_TURN}秒の暫定値）`)
  line('実行時間', `${(elapsed / options.games).toFixed(2)} ms/試合（合計 ${(elapsed / 1000).toFixed(1)} 秒）`)
  const limitVerdict = turnLimitHits === 0 ? 'OK' : '★上限で打ち切られた試合がある'
  line(`ターン上限(${MAX_TURNS})到達率`, `${pct(turnLimitHits, options.games)}  ${limitVerdict}`)
  console.log('')

  console.log('■ 決着理由')
  for (const [reason, count] of [...endReasons].sort((a, b) => b[1] - a[1])) {
    line(reason, `${count} (${pct(count, options.games)})`)
  }
  console.log('')

  console.log('■ デッキ相性')
  for (const [label, tally] of matchupWins) {
    const total = tally.a + tally.b + tally.draw
    line(label, `${pct(tally.a, total)} : ${pct(tally.b, total)}（引分 ${pct(tally.draw, total)}）`)
  }
  console.log('')

  console.log('■ 行動の傾向')
  line('平均攻撃回数', (totalAttacks / options.games).toFixed(1))
  line('平均エネルギー付与', (totalAttaches / options.games).toFixed(1))
  line('にげる使用', (totalRetreats / options.games).toFixed(2))
  line('余剰エネルギー', (totalWasted / options.games).toFixed(1))
  console.log('')

  // レアリティが強さの目安として機能しているかを見る
  console.log('■ レアリティ別（種類数 / 平均使用率 / 平均勝率寄与）')
  for (const rarity of RARITY_ORDER) {
    const group = [...stats.values()].filter((s) => s.rarity === rarity && s.inDeck > 0)
    if (group.length === 0) continue
    const usage = mean(group.map((s) => s.usedIn / s.inDeck))
    const contribution = mean(group.filter((s) => s.usedIn > 0).map((s) => s.winsWhenUsed / s.usedIn - overallWinRate))
    line(`${RARITY_MARK[rarity] ?? rarity} ${rarity}`,
      `${String(group.length).padStart(2)}種 / ${(usage * 100).toFixed(1)}% / ${contribution >= 0 ? '+' : ''}${(contribution * 100).toFixed(1)}pt`)
  }
  console.log('')

  console.log('■ 系統別（種類数 / 平均使用率）')
  for (const origin of [...new Set([...stats.values()].map((s) => s.origin))].sort()) {
    const group = [...stats.values()].filter((s) => s.origin === origin && s.inDeck > 0)
    if (group.length === 0) continue
    line(origin, `${String(group.length).padStart(2)}種 / ${(mean(group.map((s) => s.usedIn / s.inDeck)) * 100).toFixed(1)}%`)
  }
  console.log('')

  console.log('■ カード別（レア度 / 採用率 / 使用率 / 使用時勝率 / 勝率寄与）')
  const rows = [...stats.values()].sort((a, b) => b.usedIn / (b.inDeck || 1) - a.usedIn / (a.inDeck || 1))
  for (const s of rows) {
    const usage = s.inDeck === 0 ? 0 : s.usedIn / s.inDeck
    const winRate = s.usedIn === 0 ? null : s.winsWhenUsed / s.usedIn
    const contribution = winRate === null ? null : winRate - overallWinRate
    console.log(
      `  ${s.id} ${s.name.padEnd(10, '　')} ${(RARITY_MARK[s.rarity] ?? '').padEnd(3)} ` +
        `${pct(s.inDeck, options.games * 2).padStart(6)} / ${(usage * 100).toFixed(1).padStart(5)}% / ` +
        `${winRate === null ? '   -  ' : `${(winRate * 100).toFixed(1)}%`.padStart(6)} / ` +
        `${contribution === null ? '  -  ' : `${contribution >= 0 ? '+' : ''}${(contribution * 100).toFixed(1)}pt`}`,
    )
  }
  console.log('')

  console.log('■ 一度も使われなかったカード')
  if (unused.length === 0) console.log('  なし')
  else for (const s of unused) console.log(`  ★ ${s.id} ${s.name}`)
  console.log('')
}
