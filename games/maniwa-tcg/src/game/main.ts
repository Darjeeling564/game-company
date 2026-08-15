/**
 * 画面遷移と入力（SPEC 9章）。
 * ルールの判定はすべて core に委ね、ここは「見せる」「受け取る」だけを担当する。
 */
import type { Action } from '../core/actions.ts'
import { EMPTY_STATE, isOver, legalActions, reduce } from '../core/reduce.ts'
import type { Rng } from '../core/rng.ts'
import { createRng } from '../core/rng.ts'
import type { Deck, GameState, PlayerId } from '../core/types.ts'
import { requireCard } from '../data/cards.ts'
import { DECKS } from '../data/decks.ts'
// 方策はシミュレータと共有する。CPU の打ち筋とバランス測定を一致させるため
import { greedyPolicy } from '../../tools/ai.ts'
import {
  CPU,
  HUMAN,
  cardDetailPanel,
  describeAttack,
  el,
  formatCost,
  renderBattle,
  renderChoices,
} from './view.ts'
import { load, recordResult } from './storage.ts'

const root = document.getElementById('app') as HTMLElement
const CPU_DELAY_MS = 450

let state: GameState = EMPTY_STATE
let cpuRng: Rng = createRng(1)
let cpuTimer: number | null = null

/**
 * 開いているモーダルの描画関数。
 * CPU の手番でも再描画が走るため、モーダルを root に直接置くと消えてしまう。
 * 描画関数として保持し、毎回の render で描き直すことで表示を保たせる。
 */
let overlay: (() => void) | null = null

function openOverlay(draw: () => void): void {
  overlay = draw
  render()
}

function closeOverlay(): void {
  overlay = null
  render()
}

// ---------------------------------------------------------------- 画面

function clearTimer(): void {
  if (cpuTimer !== null) {
    clearTimeout(cpuTimer)
    cpuTimer = null
  }
}

function showTitle(): void {
  clearTimer()
  root.replaceChildren()
  const screen = el('div', 'screen')
  screen.append(el('h1', 'title', 'maniwa-tcg'))
  screen.append(el('p', 'muted', '2人対戦カードバトル / 3ポイント先取'))

  const record = load().record
  screen.append(el('p', 'muted', `${record.wins}勝 ${record.losses}敗 ${record.draws}分`))

  const start = el('button', 'btn', 'たいせん')
  start.type = 'button'
  start.addEventListener('click', showDeckSelect)
  screen.append(start)
  root.append(screen)
}

function showDeckSelect(): void {
  root.replaceChildren()
  const screen = el('div', 'screen')
  screen.append(el('h1', 'title', 'デッキをえらぶ'))

  for (const deck of DECKS) {
    const btn = el('button', 'btn deck-option')
    btn.type = 'button'
    btn.append(el('span', 'deck-option__name', deck.name))
    btn.append(el('span', 'muted', `${deck.cards.length}枚 / ${new Set(deck.cards).size}種`))
    btn.addEventListener('click', () => startBattle(deck))
    screen.append(btn)
  }

  const back = el('button', 'btn btn--ghost', 'もどる')
  back.type = 'button'
  back.addEventListener('click', showTitle)
  screen.append(back)
  root.append(screen)
}

function showResult(): void {
  clearTimer()
  const outcome = state.winner === null ? 'draw' : state.winner === HUMAN ? 'win' : 'loss'
  const record = recordResult(outcome).record

  root.replaceChildren()
  const screen = el('div', 'screen')
  screen.append(el('h1', 'title', outcome === 'win' ? 'かち！' : outcome === 'loss' ? 'まけ…' : 'ひきわけ'))
  screen.append(
    el('p', 'muted', `ポイント ${state.players[HUMAN].points} - ${state.players[CPU].points} / ${state.turn}ターン`),
  )
  screen.append(el('p', 'muted', `つうさん ${record.wins}勝 ${record.losses}敗 ${record.draws}分`))

  const again = el('button', 'btn', 'もういちど')
  again.type = 'button'
  again.addEventListener('click', showDeckSelect)
  screen.append(again)

  const back = el('button', 'btn btn--ghost', 'タイトルへ')
  back.type = 'button'
  back.addEventListener('click', showTitle)
  screen.append(back)
  root.append(screen)
}

// ---------------------------------------------------------------- 対戦

function startBattle(deck: Deck): void {
  // 起動時刻をシードにする。core は純粋なままで、乱数の入口はここだけ
  const seed = Date.now() >>> 0
  cpuRng = createRng(seed ^ 0x5bf03635)
  const firstPlayer: PlayerId = (seed % 2) as PlayerId
  // タイプ相性が3すくみなので、CPU のデッキを固定すると特定の選択だけが常に有利になる
  const cpuDeck = DECKS[seed % DECKS.length] as Deck
  state = reduce(EMPTY_STATE, { type: 'start', seed, decks: [deck, cpuDeck], firstPlayer })
  render()
}

function apply(action: Action): void {
  overlay = null // 行動を選んだらモーダルは閉じる
  state = reduce(state, action)
  render()
}

/** CPU の手番・CPU の初期配置・CPU の入れ替えを1手ずつ進める */
function cpuShouldMove(): boolean {
  if (isOver(state)) return false
  if (state.phase.kind === 'setup') return !state.setupDone[CPU]
  if (state.phase.kind === 'promote') return state.phase.queue[0] === CPU
  return state.current === CPU
}

function render(): void {
  clearTimer()

  if (isOver(state)) {
    showResult()
    return
  }

  renderBattle(root, state, {
    onAction: apply,
    onAttackMenu: () => openOverlay(showAttackMenu),
    onRetreatMenu: () => openOverlay(showRetreatMenu),
    onCreatureTap: (owner, id) => openOverlay(() => showCreatureDetail(owner, id)),
    onHandTap: (index) => openOverlay(() => showHandDetail(index)),
  })

  // 自分の入れ替えが必要なら、選ぶまで他の操作をさせない
  if (state.phase.kind === 'promote' && state.phase.queue[0] === HUMAN) {
    showPromoteMenu()
    return
  }

  if (overlay !== null) overlay()

  if (cpuShouldMove()) {
    cpuTimer = window.setTimeout(() => {
      const chosen = greedyPolicy(state, cpuRng)
      cpuRng = chosen.rng
      apply(chosen.action)
    }, CPU_DELAY_MS)
  }
}

function myActions(type: Action['type']): readonly Action[] {
  return legalActions(state).filter((a) => a.type === type && a.type !== 'start' && a.player === HUMAN)
}

function showAttackMenu(): void {
  const active = state.players[HUMAN].active
  if (active === null) return
  const card = requireCard(active.cardId)
  // 名前とコストだけでは威力が分からず選べないので、効果まで出す
  const choices = myActions('attack').map((action) => {
    const index = action.type === 'attack' ? action.attackIndex : 0
    const attack = card.attacks[index]
    return {
      label: `${attack?.name ?? '?'}  [${attack === undefined ? '' : formatCost(attack.cost)}]`,
      sub: attack === undefined ? '' : describeAttack(attack),
      action,
    }
  })
  renderChoices(root, 'ワザをえらぶ', choices, apply, closeOverlay)
}

function showRetreatMenu(): void {
  const player = state.players[HUMAN]
  const cost = player.active === null ? 0 : requireCard(player.active.cardId).retreatCost
  const choices = myActions('retreat').map((action) => {
    const index = action.type === 'retreat' ? action.benchIndex : 0
    const creature = player.bench[index]
    if (creature === undefined) return { label: '?', action }
    const def = requireCard(creature.cardId)
    return {
      label: def.name,
      sub: `HP ${def.hp - creature.damage}/${def.hp}`,
      action,
    }
  })
  renderChoices(root, `いれかえる（エネルギー${cost}をトラッシュ）`, choices, apply, closeOverlay)
}

/** 場のカードをタップしたとき。相手のカードも中身を確認できるようにする */
function showCreatureDetail(owner: PlayerId, instanceId: number): void {
  const player = state.players[owner]
  const creature = [player.active, ...player.bench].find((c) => c !== null && c.instanceId === instanceId)
  if (creature === undefined || creature === null) return

  const detail = cardDetailPanel(requireCard(creature.cardId), creature)
  const choices = legalActions(state)
    .filter((a) => a.type === 'attachEnergy' && a.player === HUMAN && a.target === instanceId)
    .map((action) => ({ label: 'エネルギーをつける', action }))

  renderChoices(root, owner === HUMAN ? 'じぶんのカード' : 'あいてのカード', choices, apply, closeOverlay, detail)
}

/** 手札をタップしたとき。出す前に性能を確認できるようにする */
function showHandDetail(handIndex: number): void {
  const cardId = state.players[HUMAN].hand[handIndex]
  if (cardId === undefined) return

  const detail = cardDetailPanel(requireCard(cardId), null)
  const choices = legalActions(state)
    .filter(
      (a) =>
        (a.type === 'playCreature' || a.type === 'setupPlace') &&
        a.player === HUMAN &&
        a.handIndex === handIndex,
    )
    .map((action) => ({
      label: state.players[HUMAN].active === null ? 'バトル場にだす' : 'ベンチにだす',
      action,
    }))

  renderChoices(root, 'てふだ', choices, apply, closeOverlay, detail)
}

function showPromoteMenu(): void {
  const bench = state.players[HUMAN].bench
  const choices = myActions('promote').map((action) => {
    const index = action.type === 'promote' ? action.benchIndex : 0
    const creature = bench[index]
    if (creature === undefined) return { label: '?', action }
    const def = requireCard(creature.cardId)
    return { label: `${def.name}（${def.hp - creature.damage}/${def.hp}）`, action }
  })
  renderChoices(root, 'バトル場にだす', choices, apply, null)
}

showTitle()
