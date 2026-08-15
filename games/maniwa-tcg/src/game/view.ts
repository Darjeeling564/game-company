/**
 * 描画。core を読むだけで、ルール判定は一切持たない。
 * ボタンの活性は legalActions の結果のみで決める（SPEC 9章）。
 */
import type { Action } from '../core/actions.ts'
import { legalActions } from '../core/reduce.ts'
import type { Creature, GameState, PlayerId, PlayerState } from '../core/types.ts'
import { BENCH_SIZE } from '../core/types.ts'
import { requireCard } from '../data/cards.ts'

export const HUMAN: PlayerId = 0
export const CPU: PlayerId = 1

const ENERGY_LABEL: Readonly<Record<string, string>> = {
  fire: '炎', grass: '草', water: '水', lightning: '電', psychic: '超',
  fighting: '闘', darkness: '悪', metal: '鋼', colorless: '無',
}

export function energyLabel(type: string | null): string {
  return type === null ? '—' : (ENERGY_LABEL[type] ?? type)
}

/** EX はカード名に含める運用なので、名前に無いときだけ印を足す */
function displayName(name: string, ex: boolean): string {
  return ex && !name.includes('EX') ? `${name}(EX)` : name
}

const LOG_LABEL: Readonly<Record<string, string>> = {
  beginTurn: 'ターンかいし', setupPlace: 'じゅんび', playCreature: 'ベンチにだす',
  attachEnergy: 'エネルギー', retreat: 'にげる', attack: 'こうげき', damage: 'ダメージ',
  ko: 'きぜつ', poison: 'どく', coin: 'コイン', promote: 'いれかえ', status: 'じょうたい',
  selfDamage: 'はんどう', endTurn: 'ターンおわり', end: 'しゅうりょう',
}

export function logLabel(kind: string): string | null {
  return LOG_LABEL[kind] ?? null
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className !== undefined) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

/** 選択できる Action を個体に結びつけて渡すためのハンドラ */
export interface Handlers {
  readonly onAction: (action: Action) => void
  readonly onAttackMenu: () => void
  readonly onRetreatMenu: () => void
}

function creatureCard(
  creature: Creature,
  isActive: boolean,
  selectable: boolean,
  onSelect?: () => void,
): HTMLElement {
  const card = requireCard(creature.cardId)
  const remaining = Math.max(0, card.hp - creature.damage)
  const node = el('button', `card${isActive ? ' card--active' : ''}${selectable ? ' card--selectable' : ''}`)
  node.type = 'button'

  node.append(el('span', 'card__name', displayName(card.name, card.ex)))
  node.append(el('span', 'card__hp', `${remaining}/${card.hp}`))

  const bar = el('div', 'card__bar')
  const fill = el('span')
  fill.style.width = `${(remaining / card.hp) * 100}%`
  bar.append(fill)
  node.append(bar)

  const tags: string[] = []
  if (creature.attached.length > 0) tags.push(creature.attached.map((e) => energyLabel(e)).join(''))
  if (creature.status.includes('poisoned')) tags.push('どく')
  if (tags.length > 0) node.append(el('span', 'card__tags', tags.join(' ')))

  if (onSelect !== undefined) node.addEventListener('click', onSelect)
  else node.disabled = true
  return node
}

function emptySlot(label: string): HTMLElement {
  const node = el('div', 'card card--empty', label)
  return node
}

function sideView(
  state: GameState,
  id: PlayerId,
  handlers: Handlers,
  attachTargets: ReadonlySet<number>,
): HTMLElement {
  const player: PlayerState = state.players[id]
  const side = el('div', 'side')

  const head = el('div', 'side__head')
  head.append(el('span', undefined, id === HUMAN ? 'じぶん' : 'あいて'))
  const points = el('span', 'points', '●'.repeat(Math.min(3, player.points)) + '○'.repeat(Math.max(0, 3 - player.points)))
  head.append(points)
  head.append(el('span', 'muted', `手札${player.hand.length} 山札${player.deck.length}`))
  side.append(head)

  const bench = el('div', 'slots')
  for (let i = 0; i < BENCH_SIZE; i += 1) {
    const creature = player.bench[i]
    if (creature === undefined) {
      bench.append(emptySlot('ベンチ'))
      continue
    }
    const selectable = attachTargets.has(creature.instanceId)
    bench.append(
      creatureCard(creature, false, selectable,
        selectable ? () => handlers.onAction({ type: 'attachEnergy', player: id, target: creature.instanceId }) : undefined),
    )
  }

  const active = el('div', 'slots')
  if (player.active === null) active.append(emptySlot('バトル場'))
  else {
    const selectable = attachTargets.has(player.active.instanceId)
    const creature = player.active
    active.append(
      creatureCard(creature, true, selectable,
        selectable ? () => handlers.onAction({ type: 'attachEnergy', player: id, target: creature.instanceId }) : undefined),
    )
  }

  // 相手側はベンチを上、バトル場を下に置いて向かい合わせる
  if (id === CPU) {
    side.append(bench, active)
  } else {
    side.append(active, bench)
  }
  return side
}

function handView(state: GameState, handlers: Handlers): HTMLElement {
  const legal = legalActions(state)
  const playable = new Map<number, Action>()
  for (const action of legal) {
    if ((action.type === 'playCreature' || action.type === 'setupPlace') && action.player === HUMAN) {
      playable.set(action.handIndex, action)
    }
  }

  const hand = el('div', 'hand')
  const cards = state.players[HUMAN].hand
  if (cards.length === 0) hand.append(el('div', 'muted', '手札なし'))
  cards.forEach((cardId, index) => {
    const card = requireCard(cardId)
    const action = playable.get(index)
    const node = el('button', `card${action !== undefined ? ' card--selectable' : ''}`)
    node.type = 'button'
    node.append(el('span', 'card__name', displayName(card.name, card.ex)))
    node.append(el('span', 'card__hp', `HP${card.hp}`))
    if (action === undefined) node.disabled = true
    else node.addEventListener('click', () => handlers.onAction(action))
    hand.append(node)
  })
  return hand
}

function statusBanner(state: GameState): HTMLElement {
  if (state.phase.kind === 'setup') {
    return el('div', 'banner', 'バトル場とベンチにカードを出そう。手札をタップ。')
  }
  if (state.phase.kind === 'promote') {
    const who = state.phase.queue[0] === HUMAN ? 'じぶん' : 'あいて'
    return el('div', 'banner', `${who}のバトル場が空。ベンチから出す。`)
  }
  const who = state.current === HUMAN ? 'じぶんのターン' : 'あいてのターン'
  return el('div', 'banner', `ターン${state.turn} / ${who}`)
}

export function renderBattle(root: HTMLElement, state: GameState, handlers: Handlers): void {
  const legal = legalActions(state)
  // legalActions は start を返さないが、型の上では含まれるので除いておく
  const mine = legal.filter((a) => a.type !== 'start' && a.player === HUMAN)

  const attachTargets = new Set(
    mine.filter((a) => a.type === 'attachEnergy').map((a) => (a.type === 'attachEnergy' ? a.target : -1)),
  )

  root.replaceChildren()
  const board = el('div', 'board')
  board.append(statusBanner(state))
  board.append(sideView(state, CPU, handlers, new Set()))
  board.append(sideView(state, HUMAN, handlers, attachTargets))

  const energy = el('div', 'energy')
  const zone = state.players[HUMAN].energy
  energy.append(el('span', undefined, `エネルギー: ${energyLabel(zone.current)}（次: ${energyLabel(zone.next)}）`))
  board.append(energy)

  const controls = el('div', 'row')
  const canAttack = mine.some((a) => a.type === 'attack')
  const canRetreat = mine.some((a) => a.type === 'retreat')
  const endTurn = mine.find((a) => a.type === 'endTurn')
  const setupDone = mine.find((a) => a.type === 'setupDone')

  const attackBtn = el('button', 'btn', 'こうげき')
  attackBtn.type = 'button'
  attackBtn.disabled = !canAttack
  attackBtn.addEventListener('click', handlers.onAttackMenu)
  controls.append(attackBtn)

  const retreatBtn = el('button', 'btn btn--ghost', 'にげる')
  retreatBtn.type = 'button'
  retreatBtn.disabled = !canRetreat
  retreatBtn.addEventListener('click', handlers.onRetreatMenu)
  controls.append(retreatBtn)

  if (setupDone !== undefined) {
    const doneBtn = el('button', 'btn', 'じゅんびかんりょう')
    doneBtn.type = 'button'
    doneBtn.addEventListener('click', () => handlers.onAction(setupDone))
    controls.append(doneBtn)
  } else {
    const endBtn = el('button', 'btn btn--ghost', 'ターンしゅうりょう')
    endBtn.type = 'button'
    endBtn.disabled = endTurn === undefined
    if (endTurn !== undefined) endBtn.addEventListener('click', () => handlers.onAction(endTurn))
    controls.append(endBtn)
  }
  board.append(controls)
  board.append(handView(state, handlers))

  const recent = state.log
    .slice(-8)
    .map((e) => {
      const label = logLabel(e.kind)
      return label === null ? null : `${e.player === HUMAN ? 'じぶん' : 'あいて'}: ${label}`
    })
    .filter((line): line is string => line !== null)
    .slice(-3)
  board.append(el('div', 'log', recent.join(' / ')))

  root.append(board)
}

/** ワザ選択・ベンチ選択の共通モーダル */
export function renderChoices(
  root: HTMLElement,
  title: string,
  choices: readonly { readonly label: string; readonly action: Action }[],
  onPick: (action: Action) => void,
  onCancel: (() => void) | null,
): void {
  const modal = el('div', 'modal')
  const panel = el('div', 'modal__panel')
  panel.append(el('div', 'title', title))
  for (const choice of choices) {
    const btn = el('button', 'btn', choice.label)
    btn.type = 'button'
    btn.addEventListener('click', () => onPick(choice.action))
    panel.append(btn)
  }
  if (onCancel !== null) {
    const cancel = el('button', 'btn btn--ghost', 'やめる')
    cancel.type = 'button'
    cancel.addEventListener('click', onCancel)
    panel.append(cancel)
  }
  modal.append(panel)
  root.append(modal)
}
