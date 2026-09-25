/**
 * バランスシミュレーション（SPEC 13章 / CLAUDE.md 5章）。
 *
 *   npm run sim -- maniwa-duel
 *
 * **数値が基準を外れても、独断でカードデータを書き換えない。** 報告のみ行う。
 */
import { EMPTY_STATE, isOver, reduce } from '../src/core/reduce.ts'
import { createRng } from '../src/core/rng.ts'
import { ALL_CARDS, findCard } from '../src/data/cards.ts'
import { DECKS } from '../src/data/decks.ts'
import type { Deck, EndReason, GameState, PlayerId } from '../src/core/types.ts'
import { LIFE_POINTS, MAX_TURNS } from '../src/core/types.ts'
import { ART_D2 } from '../src/core/types.ts'
import { greedyPolicy } from './ai.ts'

const GAMES = Number(process.argv.find((a) => a.startsWith('--games='))?.slice(8) ?? 10000)
const SEED = Number(process.argv.find((a) => a.startsWith('--seed='))?.slice(7) ?? 20260925)

interface Result {
  readonly winner: PlayerId | null
  readonly reason: EndReason | null
  readonly turns: number
  /** ターンごとの、両者のライフ */
  readonly lifeByTurn: readonly (readonly [number, number])[]
  readonly traps: number
  readonly directAttacks: number
  readonly tributeSummons: number
  /** 使われたカードID（1試合につき重複を除く）。プレイヤーごと */
  readonly used: readonly (readonly string[])[]
}

function play(seed: number, decks: readonly [Deck, Deck], firstPlayer: PlayerId): Result {
  let state: GameState = reduce(EMPTY_STATE, { type: 'start', seed, decks, firstPlayer })
  let rng = createRng(seed ^ 0x5bf03635)
  const lifeByTurn: [number, number][] = []
  const used: [Set<string>, Set<string>] = [new Set(), new Set()]
  let traps = 0
  let directAttacks = 0
  let tributeSummons = 0
  let lastTurn = 0

  for (let step = 0; step < 6000 && !isOver(state); step += 1) {
    if (state.turn !== lastTurn) {
      lastTurn = state.turn
      lifeByTurn.push([state.players[0].lp, state.players[1].lp])
    }
    const choice = greedyPolicy(state, rng)
    if (choice === null) break
    rng = choice.rng
    const actor = state.priority
    const a = choice.action
    if (a.type === 'activateTrap') {
      traps += 1
      const card = state.players[actor].spells[a.zone]
      if (card !== null && card !== undefined) used[actor].add(card.cardId)
    }
    if (a.type === 'declareAttack' && a.target === null) directAttacks += 1
    if ((a.type === 'normalSummon' || a.type === 'setMonster') && a.tributes.length > 0) {
      tributeSummons += 1
    }
    if (a.type === 'normalSummon' || a.type === 'setMonster' || a.type === 'activateSpell' ||
        a.type === 'setSpell') {
      const card = state.players[actor].hand[a.handIndex]
      if (card !== undefined) used[actor].add(card)
    }
    state = reduce(state, choice.action)
  }

  return {
    winner: state.winner, reason: state.endReason, turns: state.turn,
    lifeByTurn, traps, directAttacks, tributeSummons,
    used: [[...used[0]], [...used[1]]],
  }
}

function pct(n: number, total: number): string {
  return total === 0 ? '—' : `${((n / total) * 100).toFixed(1)}%`
}

function pad(s: string, n: number): string {
  return s.padEnd(n, '　')
}

function median(xs: readonly number[]): number {
  if (xs.length === 0) return 0
  const a = [...xs].sort((p, q) => p - q)
  return a[Math.floor(a.length / 2)] as number
}

// ---------------------------------------------------------------- 実行

console.log('\n=== maniwa-duel バランスシミュレーション ===')
console.log(`  ${GAMES} 戦 / policy=greedy / seed=${SEED} / デッキ ${DECKS.length}種\n`)

const results: Result[] = []
const t0 = Date.now()
let seed = SEED
// 全組み合わせ（ミラーを含む）× 先後
const pairs: [number, number][] = []
for (let i = 0; i < DECKS.length; i += 1) {
  for (let j = 0; j < DECKS.length; j += 1) pairs.push([i, j])
}
const perPair = Math.max(1, Math.floor(GAMES / (pairs.length * 2)))

const firstWins = { win: 0, games: 0, draw: 0 }
const deckWins = DECKS.map(() => ({ win: 0, games: 0 }))
const cardGames = new Map<string, number>()
const cardWins = new Map<string, number>()

for (const [i, j] of pairs) {
  for (const first of [0, 1] as PlayerId[]) {
    for (let g = 0; g < perPair; g += 1) {
      seed += 1
      const r = play(seed, [DECKS[i] as Deck, DECKS[j] as Deck], first)
      results.push(r)

      firstWins.games += 1
      if (r.winner === first) firstWins.win += 1
      if (r.winner === null) firstWins.draw += 1

      deckWins[i]!.games += 1
      deckWins[j]!.games += 1
      if (r.winner === 0) deckWins[i]!.win += 1
      if (r.winner === 1) deckWins[j]!.win += 1

      for (const p of [0, 1] as PlayerId[]) {
        for (const id of r.used[p] as readonly string[]) {
          cardGames.set(id, (cardGames.get(id) ?? 0) + 1)
          if (r.winner === p) cardWins.set(id, (cardWins.get(id) ?? 0) + 1)
        }
      }
    }
  }
}

const n = results.length
const elapsed = (Date.now() - t0) / 1000

// --- 先手勝率
const firstRate = (firstWins.win / firstWins.games) * 100
const firstOk = firstRate >= 45 && firstRate <= 55
console.log('■ 先手勝率')
console.log(`  ${pad('先手勝率', 28)} ${firstRate.toFixed(1)}%  ${firstOk ? 'OK' : '要調整（45〜55%）'}`)
console.log(`  ${pad('引き分け率', 28)} ${pct(firstWins.draw, firstWins.games)}`)

// --- 試合の長さ
const turns = results.map((r) => r.turns)
console.log('\n■ 試合の長さ')
console.log(`  ${pad('平均ターン数', 28)} ${(turns.reduce((a, b) => a + b, 0) / n).toFixed(1)}`)
console.log(`  ${pad('中央値 / 最小 / 最大', 24)} ${median(turns)} / ${Math.min(...turns)} / ${Math.max(...turns)}`)
console.log(`  ${pad('実行時間', 28)} ${((elapsed / n) * 1000).toFixed(2)} ms/試合（合計 ${elapsed.toFixed(1)} 秒）`)
const hitLimit = results.filter((r) => r.reason === 'turnLimit').length
console.log(`  ${pad(`ターン上限(${MAX_TURNS})到達率`, 24)} ${pct(hitLimit, n)}  ${hitLimit === 0 ? 'OK' : '要調査'}`)

// --- 決着理由
console.log('\n■ 決着理由')
for (const reason of ['lifePoints', 'deckOut', 'turnLimit'] as EndReason[]) {
  const c = results.filter((r) => r.reason === reason).length
  console.log(`  ${pad(reason, 24)} ${String(c).padStart(6)} (${pct(c, n)})`)
}

// --- デッキ別
console.log('\n■ デッキ別勝率')
const rates = deckWins.map((d) => (d.win / d.games) * 100)
DECKS.forEach((d, i) => {
  console.log(`  ${pad(d.name, 20)} ${rates[i]!.toFixed(1)}%`)
})
console.log(`  ${pad('レンジ（最大−最小）', 22)} ${(Math.max(...rates) - Math.min(...rates)).toFixed(2)}pt`)

// --- 動きの内訳
console.log('\n■ 動きの内訳（1試合あたり）')
const avg = (f: (r: Result) => number) => (results.reduce((t, r) => t + f(r), 0) / n).toFixed(2)
console.log(`  ${pad('罠の発動', 24)} ${avg((r) => r.traps)} 回`)
console.log(`  ${pad('ダイレクトアタック', 22)} ${avg((r) => r.directAttacks)} 回`)
console.log(`  ${pad('リリース召喚', 24)} ${avg((r) => r.tributeSummons)} 回`)

// --- ライフ推移（SPEC 9.3 の絵の区切りを決めるため）
console.log('\n■ ライフの推移（中央値。SPEC 9.3 の絵の区切りを決めるため）')
const maxTurn = Math.min(20, Math.max(...results.map((r) => r.lifeByTurn.length)))
const buckets = { normal: 0, d1: 0, d2: 0 }
for (let t = 0; t < maxTurn; t += 1) {
  const lps = results.flatMap((r) => {
    const e = r.lifeByTurn[t]
    return e === undefined ? [] : [e[0], e[1]]
  })
  if (lps.length === 0) continue
  if (t % 2 === 0 || t < 6) {
    console.log(`  ターン${String(t + 1).padStart(2)}  中央値 ${String(median(lps)).padStart(5)}`)
  }
  for (const lp of lps) {
    if (lp > (LIFE_POINTS * 2) / 3) buckets.normal += 1
    else if (lp > LIFE_POINTS / 3) buckets.d1 += 1
    else buckets.d2 += 1
  }
}
const totalLp = buckets.normal + buckets.d1 + buckets.d2
console.log(`  3等分（2667 / 1334）で分けたときの内訳:`)
console.log(`    無傷 ${pct(buckets.normal, totalLp)} / 傷 ${pct(buckets.d1, totalLp)} / 追い詰められた ${pct(buckets.d2, totalLp)}`)

// 観測されたライフの分布から、3つの絵が同じくらい出る区切りを出す
const allLp = results.flatMap((r) => r.lifeByTurn.flatMap(([a, b]) => [a, b])).sort((a, b) => b - a)
const at = (q: number) => allLp[Math.min(allLp.length - 1, Math.floor(allLp.length * q))] ?? 0
console.log(`  盤にいる時間を3等分する値: d1 ≤ ${at(1 / 3)} / d2 ≤ ${at(2 / 3)}`)
// 採用している規則での内訳（SPEC 9.3）
const chosen = { normal: 0, d1: 0, d2: 0 }
for (const lp of allLp) {
  if (lp >= LIFE_POINTS) chosen.normal += 1
  else if (lp > ART_D2) chosen.d1 += 1
  else chosen.d2 += 1
}
const ct = chosen.normal + chosen.d1 + chosen.d2
console.log(`  **採用している規則**（無傷=満タン / 傷=減っている / 追い詰められた≦${ART_D2}）:`)
console.log(`    無傷 ${pct(chosen.normal, ct)} / 傷 ${pct(chosen.d1, ct)} / 追い詰められた ${pct(chosen.d2, ct)}`)

// --- カード別
console.log('\n■ カード別（採用率 / 使用時勝率 / 勝率寄与）')
const rows = ALL_CARDS
  .filter((c) => cardGames.has(c.id))
  .map((c) => {
    const games = cardGames.get(c.id) ?? 0
    const wins = cardWins.get(c.id) ?? 0
    const winRate = (wins / games) * 100
    return { c, games, winRate, contrib: winRate - 50 }
  })
  .sort((a, b) => b.contrib - a.contrib)
for (const r of rows) {
  console.log(`  ${r.c.id} ${pad(r.c.name, 11)} ${pct(r.games, n * 2).padStart(7)} / ` +
    `${r.winRate.toFixed(1).padStart(5)}% / ${(r.contrib >= 0 ? '+' : '')}${r.contrib.toFixed(1)}pt`)
}

// --- 未使用
const deckCards = new Set(DECKS.flatMap((d) => d.cards))
const unused = [...deckCards].filter((id) => !cardGames.has(id))
console.log('\n■ 一度も使われなかったカード')
if (unused.length === 0) console.log('  なし')
else for (const id of unused) console.log(`  ★ ${id} ${findCard(id)?.name ?? ''}`)

console.log('')
