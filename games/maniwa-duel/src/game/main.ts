/**
 * 入力と進行（SPEC 8章）。**ルールは持たず、core の legalActions が返した手しか出さない。**
 *
 * ボタンは legalActions から組み立てる。こうしておくと「画面には出ているのに
 * 押すと拒否される」が構造的に起きない。
 */
import type { Action } from '../core/actions.ts'
import { EMPTY_STATE, isOver, legalActions, reduce } from '../core/reduce.ts'
import { createRng } from '../core/rng.ts'
import type { Rng } from '../core/rng.ts'
import { findCard } from '../data/cards.ts'
import { DECKS } from '../data/decks.ts'
import { greedyPolicy } from '../../tools/ai.ts'
import type { CardId, Deck, GameState, PlayerId } from '../core/types.ts'
import { HAND_LIMIT } from '../core/types.ts'
import { cardNode, renderDuel } from './view.ts'
import type { ViewHandlers, ViewModel } from './view.ts'
import { load, save } from './storage.ts'
import { play as playSfx, setMuted } from './sound.ts'

const root = document.getElementById('app') as HTMLElement

let saveData = load()
setMuted(saveData.muted)

// ---------------------------------------------------------------- 対局の状態

const HUMAN: PlayerId = 0
let state: GameState = EMPTY_STATE
let rng: Rng = createRng(1)
let selectedHand: number | null = null
let selectedMonster: number | null = null
let message = ''
let cpuTimer: number | null = null
/** 相手の番の待ち時間を飛ばす（SPEC 8.1） */
let fast = false
/** デッキの主の姫神。立ち絵に使う（SPEC 8.1） */
let leaders: [CardId | null, CardId | null] = [null, null]

/** そのデッキの顔になる姫神。1枚目の姫神を使う */
function leaderOf(deck: Deck): CardId | null {
  for (const id of deck.cards) {
    if (findCard(id)?.kind === 'monster') return id
  }
  return null
}

function el(tag: string, className?: string, text?: string): HTMLElement {
  const node = document.createElement(tag)
  if (className !== undefined) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

function apply(action: Action): void {
  const before = state
  state = reduce(state, action)
  if (state.log.at(-1)?.kind === 'rejected') {
    // legalActions から作っている以上ここには来ないが、来たら状態を戻して知らせる
    state = before
    message = 'その操作はできません'
  }
  selectedHand = null
  selectedMonster = null
  soundFor(action)
  render()
}

function soundFor(action: Action): void {
  switch (action.type) {
    case 'normalSummon': case 'setMonster': playSfx('summon'); break
    case 'declareAttack': playSfx('attack'); break
    case 'activateSpell': playSfx('spell'); break
    case 'activateTrap': playSfx('trap'); break
    case 'setSpell': playSfx('set'); break
    case 'draw': playSfx('draw'); break
    default: break
  }
}

// ---------------------------------------------------------------- CPU

function scheduleCpu(): void {
  if (cpuTimer !== null) window.clearTimeout(cpuTimer)
  if (isOver(state) || state.priority === HUMAN) return
  cpuTimer = window.setTimeout(() => {
    cpuTimer = null
    const choice = greedyPolicy(state, rng)
    if (choice === null) return
    rng = choice.rng
    state = reduce(state, choice.action)
    soundFor(choice.action)
    render()
  }, fast ? 60 : 550)
}

// ---------------------------------------------------------------- ボタンの組み立て

interface Button { readonly label: string; readonly onTap: () => void }

function describeTributes(tributes: readonly number[]): string {
  if (tributes.length === 0) return ''
  const names = tributes.map((id) => {
    for (const m of state.players[HUMAN].monsters) {
      if (m !== null && m.instanceId === id) return findCard(m.cardId)?.name ?? '?'
    }
    return '?'
  })
  return `（${names.join('・')}をリリース）`
}

/** 選んだ手札に対して出せる手を、重複しないボタンにまとめる */
function handButtons(index: number): Button[] {
  const out: Button[] = []
  const seen = new Set<string>()
  for (const a of legalActions(state)) {
    let label: string | null = null
    if ((a.type === 'normalSummon' || a.type === 'setMonster' || a.type === 'activateSpell' ||
         a.type === 'setSpell') && a.handIndex !== index) continue
    if (a.type === 'normalSummon') {
      label = `${a.position === 'attack' ? '攻撃表示' : '守備表示'}で召喚${describeTributes(a.tributes)}`
    } else if (a.type === 'setMonster') {
      label = `セット（裏守備）${describeTributes(a.tributes)}`
    } else if (a.type === 'activateSpell') {
      const target = a.target === null ? '' : `→ ${targetName(a.target)}`
      label = `発動 ${target}`.trim()
    } else if (a.type === 'setSpell') {
      label = '伏せる'
    }
    if (label === null || seen.has(label)) continue
    seen.add(label)
    out.push({ label, onTap: () => apply(a) })
  }
  return out
}

function targetName(instanceId: number): string {
  for (const p of [0, 1] as PlayerId[]) {
    for (const m of state.players[p].monsters) {
      if (m !== null && m.instanceId === instanceId) return findCard(m.cardId)?.name ?? '?'
    }
  }
  return '?'
}

function monsterButtons(instanceId: number): Button[] {
  const out: Button[] = []
  for (const a of legalActions(state)) {
    if (a.type === 'changePosition' && a.instanceId === instanceId) {
      out.push({ label: '表示形式を変える', onTap: () => apply(a) })
    }
    if (a.type === 'declareAttack' && a.attacker === instanceId && a.target === null) {
      out.push({ label: 'ダイレクトアタック', onTap: () => apply(a) })
    }
  }
  return out
}

// ---------------------------------------------------------------- 画面の組み立て

function buildViewModel(): ViewModel {
  const buttons: Button[] = []
  let msg = message

  if (isOver(state)) {
    msg = state.winner === HUMAN ? '勝ち！' : state.winner === null ? '引き分け' : '負け…'
    buttons.push({ label: 'もう一度', onTap: () => showTitle() })
  } else if (state.priority !== HUMAN) {
    msg = msg === '' ? '相手の番です' : msg
  } else if (state.pendingAttack !== null) {
    // 割り込み（SPEC 8.2）。伏せカードを光らせ、2択だけを出す
    msg = '攻撃されています。伏せカードを開きますか？'
    for (const a of legalActions(state)) {
      if (a.type === 'activateTrap') {
        const card = state.players[HUMAN].spells[a.zone]
        const name = card === null || card === undefined ? '伏せカード' : findCard(card.cardId)?.name ?? '?'
        buttons.push({ label: `${name} を開く`, onTap: () => apply(a) })
      }
      if (a.type === 'passResponse') buttons.push({ label: '開かない', onTap: () => apply(a) })
    }
  } else if (state.phase === 'end' && state.players[HUMAN].hand.length > HAND_LIMIT) {
    msg = `手札が ${state.players[HUMAN].hand.length} 枚。${HAND_LIMIT} 枚まで捨ててください`
  } else if (selectedHand !== null) {
    const id = state.players[HUMAN].hand[selectedHand]
    msg = `${findCard(id ?? '')?.name ?? ''} をどうしますか`
    buttons.push(...handButtons(selectedHand))
    buttons.push({ label: 'やめる', onTap: () => { selectedHand = null; render() } })
  } else if (selectedMonster !== null) {
    msg = `${targetName(selectedMonster)} — 相手を選ぶか、下から選んでください`
    buttons.push(...monsterButtons(selectedMonster))
    buttons.push({ label: 'やめる', onTap: () => { selectedMonster = null; render() } })
  } else {
    if (msg === '') msg = state.phase === 'battle' ? '攻撃する姫神を選んでください' : 'カードを選んでください'
    for (const a of legalActions(state)) {
      if (a.type === 'toBattle') buttons.push({ label: 'バトルへ', onTap: () => apply(a) })
      if (a.type === 'endTurn') buttons.push({ label: 'ターン終了', onTap: () => apply(a) })
    }
  }

  return {
    state, human: HUMAN, leaders, selectedHand, selectedMonster, message: msg, buttons, fast,
  }
}

const handlers: ViewHandlers = {
  onHandCard(index) {
    if (state.priority !== HUMAN || isOver(state)) return
    if (state.phase === 'end' && state.players[HUMAN].hand.length > HAND_LIMIT) {
      apply({ type: 'discardToLimit', handIndex: index })
      return
    }
    selectedMonster = null
    selectedHand = selectedHand === index ? null : index
    message = ''
    render()
  },
  onMonster(player, instanceId) {
    if (state.priority !== HUMAN || isOver(state)) return
    if (player === HUMAN) {
      selectedHand = null
      selectedMonster = selectedMonster === instanceId ? null : instanceId
      message = ''
      render()
      return
    }
    // 相手の姫神をタップ＝攻撃先の指定
    if (selectedMonster === null) return
    for (const a of legalActions(state)) {
      if (a.type === 'declareAttack' && a.attacker === selectedMonster && a.target === instanceId) {
        apply(a)
        return
      }
    }
    message = 'いまその相手は狙えません'
    render()
  },
  onSpellZone(player, zone) {
    if (state.priority !== HUMAN || isOver(state)) return
    if (player !== HUMAN) return
    if (state.pendingAttack === null) return
    for (const a of legalActions(state)) {
      if (a.type === 'activateTrap' && a.zone === zone) {
        apply(a)
        return
      }
    }
  },
  onFastForward() {
    fast = !fast
    render()
  },
}

function render(): void {
  if (isOver(state) && state.endReason !== null) recordResultOnce()
  renderDuel(root, buildViewModel(), handlers)
  message = ''
  // ドローフェイズは選択肢が1つしかないので自動で進める
  if (!isOver(state) && state.priority === HUMAN && state.phase === 'draw') {
    window.setTimeout(() => apply({ type: 'draw' }), fast ? 40 : 300)
    return
  }
  scheduleCpu()
}

let recorded = false
function recordResultOnce(): void {
  if (recorded) return
  recorded = true
  const r = saveData.record
  const next = state.winner === HUMAN
    ? { ...r, wins: r.wins + 1 }
    : state.winner === null
      ? { ...r, draws: r.draws + 1 }
      : { ...r, losses: r.losses + 1 }
  saveData = { ...saveData, record: next }
  save(saveData)
  playSfx(state.winner === HUMAN ? 'win' : state.winner === null ? 'draw_game' : 'lose')
}

// ---------------------------------------------------------------- タイトルとデッキ選び

function startDuel(myDeck: Deck, foeDeck: Deck): void {
  const seed = (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0
  rng = createRng(seed ^ 0x5bf03635)
  // 先攻はランダム
  const first = ((seed >>> 3) & 1) as PlayerId
  leaders = [leaderOf(myDeck), leaderOf(foeDeck)]
  state = reduce(EMPTY_STATE, {
    type: 'start', seed, decks: [myDeck, foeDeck], firstPlayer: first,
  })
  selectedHand = null
  selectedMonster = null
  recorded = false
  message = first === HUMAN ? 'あなたの先攻です' : '相手の先攻です'
  playSfx('start')
  render()
}

function showTitle(): void {
  if (cpuTimer !== null) window.clearTimeout(cpuTimer)
  root.textContent = ''
  const wrap = el('div', 'title')
  wrap.appendChild(el('h1', 'title__name', '姫神速闘'))
  wrap.appendChild(el('p', 'title__sub', 'ひめがみそくとう'))
  const r = saveData.record
  wrap.appendChild(el('p', 'title__record', `${r.wins}勝 ${r.losses}敗 ${r.draws}分`))

  wrap.appendChild(el('p', 'title__lead', 'デッキを選んでください'))
  const list = el('div', 'decklist')
  for (const deck of DECKS) {
    const btn = el('button', 'deckbtn')
    btn.appendChild(el('span', 'deckbtn__name', deck.name))
    const preview = el('div', 'deckbtn__preview')
    for (const id of deck.cards.slice(0, 4)) preview.appendChild(cardNode(id, { small: true }))
    btn.appendChild(preview)
    btn.addEventListener('click', () => {
      const foe = DECKS.find((d) => d.name !== deck.name) ?? deck
      saveData = { ...saveData, deckName: deck.name }
      save(saveData)
      startDuel(deck, foe)
    })
    list.appendChild(btn)
  }
  wrap.appendChild(list)

  const mute = el('button', 'button button--quiet', saveData.muted ? '音を出す' : '音を消す')
  mute.addEventListener('click', () => {
    saveData = { ...saveData, muted: !saveData.muted }
    setMuted(saveData.muted)
    save(saveData)
    showTitle()
  })
  wrap.appendChild(mute)

  root.appendChild(wrap)
}

showTitle()
