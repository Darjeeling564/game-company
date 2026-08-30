/**
 * 画面遷移と入力（SPEC 9章）。
 * ルールの判定はすべて core に委ね、ここは「見せる」「受け取る」だけを担当する。
 */
import type { Action } from '../core/actions.ts'
import { EMPTY_STATE, isOver, legalActions, reduce } from '../core/reduce.ts'
import type { Rng } from '../core/rng.ts'
import { createRng } from '../core/rng.ts'
import type { Deck, GameState, PlayerId } from '../core/types.ts'
import { requireCard, requireCreature } from '../data/cards.ts'
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
  renderFinish,
} from './view.ts'
import { load, recordResult, save } from './storage.ts'
import { hasSfx, isMuted, play, setMuted } from './sound.ts'

const root = document.getElementById('app') as HTMLElement
const CPU_DELAY_MS = 450

setMuted(load().muted)

/*
 * 押した瞬間に鳴らす。描画のたびに個々のボタンへ付けると付け忘れが出るので、
 * document で1回だけ拾う。capture 段で拾い、途中で止められても鳴るようにする
 */
document.addEventListener('pointerdown', (event) => {
  const target = event.target
  if (!(target instanceof Element)) return
  const button = target.closest('button')
  if (button === null || button.disabled) return
  play(button.classList.contains('btn--ghost') ? 'back' : 'tap')
}, true)

/**
 * 対戦中の音は core のログから作る。
 * ログ種別と効果音の名前をそろえてあるので、対応があるものだけ鳴る。
 * ここを増やさなくても、core が新しい種別を吐けば sound.ts の定義追加だけで鳴る
 */
let soundedLog = 0
let soundedHand = 0

function playFromLog(next: GameState): void {
  const fresh = next.log.slice(soundedLog)
  soundedLog = next.log.length
  for (const entry of fresh) {
    // 相手の行動は左へ寄せる。誰が動いたのかが音だけで分かる（SPEC 9.6.1）
    const pan = entry.player === HUMAN ? 0.1 : -0.32
    if (entry.kind === 'ko') {
      play('ko', pan)
      play('point', -pan)
      continue
    }
    if (hasSfx(entry.kind)) play(entry.kind, pan)
  }
  // ドローはログに残らないので手札の増減で見る（自分のぶんだけ）
  const hand = next.players[HUMAN].hand.length
  if (hand > soundedHand && next.phase.kind !== 'setup') play('draw')
  soundedHand = hand
}

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
  screen.append(el('h1', 'title', '姫神演義'))
  screen.append(el('p', 'muted', '2人対戦カードバトル / 3ポイント先取'))

  const saved = load()
  screen.append(el('p', 'muted', `${saved.record.wins}勝 ${saved.record.losses}敗 ${saved.record.draws}分`))
  if (saved.deckName !== null) screen.append(el('p', 'muted', `前回のデッキ: ${saved.deckName}`))

  const start = el('button', 'btn', '対戦')
  start.type = 'button'
  start.addEventListener('click', showDeckSelect)
  screen.append(start)
  screen.append(soundToggle(showTitle))
  root.append(screen)
}

/** 効果音の入切。押した結果をその場で鳴らして、切り替わったことを耳で分かるようにする */
function soundToggle(redraw: () => void): HTMLElement {
  const btn = el('button', 'btn btn--ghost', isMuted() ? '効果音: オフ' : '効果音: オン')
  btn.type = 'button'
  btn.addEventListener('click', () => {
    const next = !isMuted()
    setMuted(next)
    save({ ...load(), muted: next })
    if (!next) play('tap')
    redraw()
  })
  return btn
}

function showDeckSelect(): void {
  root.replaceChildren()
  const screen = el('div', 'screen')
  screen.append(el('h1', 'title', 'デッキを選ぶ'))

  for (const deck of DECKS) {
    const btn = el('button', 'btn deck-option')
    btn.type = 'button'
    btn.append(el('span', 'deck-option__name', deck.name))
    btn.append(el('span', 'muted', `${deck.cards.length}枚 / ${new Set(deck.cards).size}種`))
    btn.addEventListener('click', () => startBattle(deck))
    screen.append(btn)
  }

  const back = el('button', 'btn btn--ghost', '戻る')
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
  screen.append(el('h1', 'title', outcome === 'win' ? '勝ち！' : outcome === 'loss' ? '負け…' : '引き分け'))
  screen.append(
    el('p', 'muted', `ポイント ${state.players[HUMAN].points} - ${state.players[CPU].points} / ${state.turn}ターン`),
  )
  screen.append(el('p', 'muted', `通算 ${record.wins}勝 ${record.losses}敗 ${record.draws}分`))

  const again = el('button', 'btn', 'もう一度')
  again.type = 'button'
  again.addEventListener('click', showDeckSelect)
  screen.append(again)

  const back = el('button', 'btn btn--ghost', 'タイトルへ')
  back.type = 'button'
  back.addEventListener('click', showTitle)
  screen.append(back)
  screen.append(soundToggle(showResult))
  root.append(screen)
}

// ---------------------------------------------------------------- 対戦

function startBattle(deck: Deck): void {
  finishShown = false
  soundedLog = 0
  soundedHand = 0
  save({ ...load(), deckName: deck.name })
  // 起動時刻をシードにする。core は純粋なままで、乱数の入口はここだけ
  const seed = Date.now() >>> 0
  cpuRng = createRng(seed ^ 0x5bf03635)
  const firstPlayer: PlayerId = (seed % 2) as PlayerId
  // タイプ相性が3すくみなので、CPU のデッキを固定すると特定の選択だけが常に有利になる
  const cpuDeck = DECKS[seed % DECKS.length] as Deck
  state = reduce(EMPTY_STATE, { type: 'start', seed, decks: [deck, cpuDeck], firstPlayer })
  render()
}

function commit(action: Action): void {
  const before = state
  state = reduce(state, action)
  // リリースを伴う配置は、ただ出したときと音を変える（入れ替えが起きたと分かるように）
  if (action.type === 'playCreature' && action.release !== null && state !== before) play('release')
  playFromLog(state)
  render()
}

/** 人間の操作。自分で選んだときだけモーダルを閉じる */
function apply(action: Action): void {
  overlay = null
  commit(action)
}

/** CPU の手番・CPU の初期配置・CPU の入れ替えを1手ずつ進める */
function cpuShouldMove(): boolean {
  if (isOver(state)) return false
  if (state.phase.kind === 'setup') return !state.setupDone[CPU]
  if (state.phase.kind === 'promote') return state.phase.queue[0] === CPU
  return state.current === CPU
}

/**
 * 決着した盤面を1回見せてから結果画面へ進む。
 * ボタンを押した瞬間に画面が変わると、何が起きて終わったのか読めない
 */
let finishShown = false

function render(): void {
  clearTimer()

  if (isOver(state)) {
    if (finishShown) {
      showResult()
      return
    }
    finishShown = true
    play(state.winner === null ? 'draw_game' : state.winner === HUMAN ? 'win' : 'lose')
    renderBattle(root, state, {
      onAction: () => undefined,
      onAttackMenu: () => undefined,
      onRetreatMenu: () => undefined,
      onCreatureTap: (owner, id) => openOverlay(() => showCreatureDetail(owner, id)),
      onHandTap: (index) => openOverlay(() => showHandDetail(index)),
      onHandPlace: () => undefined,
    })
    renderFinish(root, state, showResult)
    return
  }

  renderBattle(root, state, {
    onAction: apply,
    onAttackMenu: () => openOverlay(showAttackMenu),
    onRetreatMenu: () => openOverlay(showRetreatMenu),
    onCreatureTap: (owner, id) => openOverlay(() => showCreatureDetail(owner, id)),
    onHandTap: (index) => openOverlay(() => showHandDetail(index)),
    onHandPlace: (index) => openOverlay(() => showPlacementMenu(index)),
  })

  // 自分の入れ替えが必要なら、選ぶまで他の操作をさせない
  if (state.phase.kind === 'promote' && state.phase.queue[0] === HUMAN) {
    showPromoteMenu()
    return
  }

  if (overlay !== null) overlay()

  if (cpuShouldMove()) {
    cpuTimer = window.setTimeout(() => {
      // 初期配置は両者が同時に動けるので、CPU の手だけを選ばせる
      const chosen = greedyPolicy(state, cpuRng, CPU)
      if (chosen === null) return // CPU に打つ手が無い局面
      cpuRng = chosen.rng
      if (chosen.action.type !== 'start' && chosen.action.player !== CPU) return
      // CPU の行動でプレイヤーが開いているカード詳細を閉じない
      commit(chosen.action)
    }, CPU_DELAY_MS)
  }
}

function myActions(type: Action['type']): readonly Action[] {
  return legalActions(state).filter((a) => a.type === type && a.type !== 'start' && a.player === HUMAN)
}

function showAttackMenu(): void {
  const active = state.players[HUMAN].active
  if (active === null) return
  const card = requireCreature(active.cardId)
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
  renderChoices(root, 'ワザを選ぶ', choices, apply, closeOverlay)
}

function showRetreatMenu(): void {
  const player = state.players[HUMAN]
  const cost = player.active === null ? 0 : requireCreature(player.active.cardId).retreatCost
  const choices = myActions('retreat').map((action) => {
    const index = action.type === 'retreat' ? action.benchIndex : 0
    const creature = player.bench[index]
    if (creature === undefined) return { label: '?', action }
    const def = requireCreature(creature.cardId)
    return {
      label: def.name,
      sub: `HP ${def.hp - creature.damage}/${def.hp}`,
      action,
    }
  })
  renderChoices(root, `入れ替える（エネルギー${cost}をトラッシュ）`, choices, apply, closeOverlay)
}

/** 場のカードをタップしたとき。相手のカードも中身を確認できるようにする */
function showCreatureDetail(owner: PlayerId, instanceId: number): void {
  const player = state.players[owner]
  const creature = [player.active, ...player.bench].find((c) => c !== null && c.instanceId === instanceId)
  if (creature === undefined || creature === null) {
    // きぜつなどで対象が消えた。overlay を残すと無効な状態が居座るので閉じる。
    // この関数は render の中から呼ばれるため、ここで再描画はしない
    overlay = null
    return
  }

  const detail = cardDetailPanel(requireCard(creature.cardId), creature)
  const choices = legalActions(state)
    .filter((a) => a.type === 'attachEnergy' && a.player === HUMAN && a.target === instanceId)
    .map((action) => ({ label: 'エネルギーを付ける', action }))

  renderChoices(root, owner === HUMAN ? '自分のカード' : '相手のカード', choices, apply, closeOverlay, detail)
}

/**
 * 場に出す選択肢の見出し（SPEC 3.3.1）。
 *
 * レアリティ召喚では、1枚の手札に対して**リリース対象の数だけ**選択肢が出る。
 * どれを選んだかで失う姫神が変わるので、名前と残りHPとエネルギー数を出す。
 */
function describePlacement(action: Action): string {
  if (action.type !== 'playCreature' && action.type !== 'setupPlace') return '出す'
  if (action.type === 'setupPlace' || action.release === null) {
    return state.players[HUMAN].active === null ? 'バトル場に出す' : 'ベンチに出す'
  }
  const player = state.players[HUMAN]
  const target = [player.active, ...player.bench].find(
    (c) => c !== null && c !== undefined && c.instanceId === action.release,
  )
  if (target === undefined || target === null) return 'リリースして出す'
  const def = requireCreature(target.cardId)
  const where = player.active?.instanceId === action.release ? 'バトル場' : 'ベンチ'
  return `${where}の ${def.name}（${def.hp - target.damage}/${def.hp}・エネ${target.attached.length}）をリリース`
}

/** その手札の「出し方」の一覧。リリース先が違えば別の選択肢になる */
function placementChoices(handIndex: number): readonly { label: string; sub?: string; action: Action }[] {
  return legalActions(state)
    .filter(
      (a) =>
        (a.type === 'playCreature' || a.type === 'setupPlace') &&
        a.player === HUMAN &&
        a.handIndex === handIndex,
    )
    .map((action) => {
      const sub = describeLanding(action)
      // exactOptionalPropertyTypes を有効にしているので、undefined を混ぜず鍵ごと落とす
      return sub === undefined
        ? { label: describePlacement(action), action }
        : { label: describePlacement(action), sub, action }
    })
}

/**
 * リリース先を選ぶ。
 *
 * 1枚の手札に対して出し方が複数あるとき、タップで勝手に決めてはいけない。
 * バトル場をリリースするかベンチをリリースするかで、出す先も失うものも変わる
 */
function showPlacementMenu(handIndex: number): void {
  const choices = placementChoices(handIndex)
  if (choices.length === 0) {
    overlay = null
    return
  }
  const cardId = state.players[HUMAN].hand[handIndex]
  const name = cardId === undefined ? '姫神' : requireCard(cardId).name
  renderChoices(root, `${name} を出す`, choices, apply, closeOverlay)
}

/** どこに出るか。リリース元の場所をそのまま引き継ぐ（SPEC 3.3.1） */
function describeLanding(action: Action): string | undefined {
  if (action.type !== 'playCreature' || action.release === null) return undefined
  const player = state.players[HUMAN]
  return player.active?.instanceId === action.release
    ? 'バトル場に出る。エネルギーを引き継ぐ'
    : 'そのベンチ枠に出る。エネルギーを引き継ぐ'
}

/** 手札をタップしたとき。出す前に性能を確認できるようにする */
function showHandDetail(handIndex: number): void {
  const cardId = state.players[HUMAN].hand[handIndex]
  if (cardId === undefined) {
    overlay = null
    return
  }

  const detail = cardDetailPanel(requireCard(cardId), null)
  renderChoices(root, '手札', placementChoices(handIndex), apply, closeOverlay, detail)
}

function showPromoteMenu(): void {
  const bench = state.players[HUMAN].bench
  const choices = myActions('promote').map((action) => {
    const index = action.type === 'promote' ? action.benchIndex : 0
    const creature = bench[index]
    if (creature === undefined) return { label: '?', action }
    const def = requireCreature(creature.cardId)
    return { label: `${def.name}（${def.hp - creature.damage}/${def.hp}）`, action }
  })
  renderChoices(root, 'バトル場に出す', choices, apply, null)
}

showTitle()
