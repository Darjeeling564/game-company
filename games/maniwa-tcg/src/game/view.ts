/**
 * 描画。core を読むだけで、ルール判定は一切持たない。
 * ボタンの活性は legalActions の結果のみで決める（SPEC 9章）。
 */
import type { Action } from '../core/actions.ts'
import { legalActions } from '../core/reduce.ts'
import type {
  AttackDef,
  CardDef,
  Creature,
  Effect,
  EnergyType,
  GameState,
  Origin,
  PlayerId,
  PlayerState,
  Rarity,
} from '../core/types.ts'
import { BENCH_SIZE, WEAKNESS_BONUS } from '../core/types.ts'
import { requireCard } from '../data/cards.ts'
import { artUrl } from './art.ts'
import { RARITY_STYLE, TYPE_COLOR, applyCardTheme } from './theme.ts'

export const HUMAN: PlayerId = 0
export const CPU: PlayerId = 1

const ENERGY_LABEL: Readonly<Record<string, string>> = {
  fire: '炎', grass: '草', water: '水', lightning: '電', psychic: '超',
  fighting: '闘', darkness: '悪', metal: '鋼', colorless: '無',
}

export function energyLabel(type: string | null): string {
  return type === null ? '—' : (ENERGY_LABEL[type] ?? type)
}

const ORIGIN_LABEL: Readonly<Record<Origin, string>> = {
  japan: '日本神話',
  egypt: 'エジプト神話',
  norse: '北欧神話',
  india: 'インド神話',
  mesopotamia: '中東神話',
  cthulhu: 'クトゥルフ神話',
  greece: 'ギリシア神話',
  china: '中国神話',
  original: 'オリジン',
}

export function originLabel(origin: Origin): string {
  return ORIGIN_LABEL[origin]
}

/** レアリティは記号ではなくアルファベットで表す（C / U / R / UR） */
export function rarityCode(rarity: Rarity): string {
  return RARITY_STYLE[rarity].code
}

export function rarityLabel(rarity: Rarity): string {
  const style = RARITY_STYLE[rarity]
  return `${style.code} — ${style.label}`
}

/** コストを「炎炎無」の形にする */
export function formatCost(cost: readonly EnergyType[]): string {
  return cost.length === 0 ? 'なし' : cost.map((e) => energyLabel(e)).join('')
}

/** 効果を日本語1行にする。ワザの威力を読めるようにするのが目的 */
export function describeEffect(effect: Effect): string {
  switch (effect.type) {
    case 'damage':
      if (effect.target === 'opponentBenchAll') return `相手ベンチ全体に${effect.value}`
      if (effect.target === 'opponentBenchRandom') return `相手ベンチの1体に${effect.value}`
      return `${effect.value}ダメージ`
    case 'damagePerHeads':
      return `コイン${effect.count}回・表1つにつき${effect.value}`
    case 'coinFlip':
      return `コイン${effect.count}回・表${effect.min}つ以上で「${effect.then.map(describeEffect).join('・')}」`
    case 'heal':
      return `自分を${effect.value}かいふく`
    case 'selfDamage':
      return `自分に${effect.value}のはんどう`
    case 'discardEnergy':
      return effect.target === 'self'
        ? `自分のエネルギーを${effect.value}つトラッシュ`
        : `相手のエネルギーを${effect.value}つトラッシュ`
    case 'applyStatus':
      return effect.status === 'poisoned' ? '相手をどくにする' : String(effect.status)
    case 'draw':
      return `${effect.value}枚ひく`
  }
}

export function describeAttack(attack: AttackDef): string {
  return attack.effects.map(describeEffect).join(' / ')
}

/** EX はカード名に含める運用なので、名前に無いときだけ印を足す */
function displayName(name: string, ex: boolean): string {
  return ex && !name.includes('EX') ? `${name}(EX)` : name
}


/** ログ1件を「誰が / 何を / いくつ」の形にする。数が出ないと何が起きたか追えない */
function formatLogEntry(kind: string, detail: string): string | null {
  const amount = detail.match(/\+(\d+)/)?.[1]
  switch (kind) {
    case 'attack':
      return `こうげき「${detail}」`
    case 'damage':
      return amount === undefined ? null : `${amount}ダメージをうけた`
    case 'selfDamage':
      return amount === undefined ? null : `はんどうで${amount}うけた`
    case 'poison':
      return amount === undefined ? null : `どくで${amount}うけた`
    case 'ko':
      return `きぜつ（あいてに+${detail.match(/\+(\d+)$/)?.[1] ?? '?'}ポイント）`
    case 'coin':
      return `コイン ${detail}`
    case 'status':
      return detail === 'poisoned' ? 'どくになった' : detail
    case 'promote':
      return 'バトル場にだした'
    case 'attachEnergy':
      return `エネルギーをつけた（${energyLabel(detail.split(' ')[0] ?? null)}）`
    case 'retreat':
      return 'にげた'
    default:
      return null
  }
}

export function recentLog(state: GameState, count: number): readonly string[] {
  const lines: string[] = []
  for (const entry of state.log) {
    const text = formatLogEntry(entry.kind, entry.detail)
    if (text === null) continue
    lines.push(`${entry.player === HUMAN ? 'じぶん' : 'あいて'}: ${text}`)
  }
  return lines.slice(-count)
}

/** 属性を色丸に白文字で示す。丸の色は theme.ts の TYPE_COLOR */
function typeBadge(type: EnergyType): HTMLElement {
  const badge = el('span', 'badge', energyLabel(type))
  badge.style.setProperty('--card-type', TYPE_COLOR[type])
  return badge
}

/** ワザ名。ruby があるときだけ <ruby> にしてフリガナを振る */
function attackNameNode(attack: AttackDef): HTMLElement {
  const span = el('span', 'detail__attackName')
  if (attack.ruby === undefined) {
    span.append(attack.name)
  } else {
    const ruby = el('ruby')
    ruby.append(attack.name)
    ruby.append(el('rt', undefined, attack.ruby))
    span.append(ruby)
  }
  span.append(el('span', 'detail__attackCost', `[${formatCost(attack.cost)}]`))
  return span
}

/**
 * カード1枚の詳細。カードとしての体裁（イラスト・系統色の地・レアリティ色の枠）で
 * 見せたうえで、ワザのコストと効果まで文字で出す。
 */
export function cardDetailPanel(card: CardDef, creature: Creature | null): HTMLElement {
  const box = el('div', 'detail')
  applyCardTheme(box, card.origin, card.rarity, card.type)

  const url = artUrl(card.id)
  if (url === null) {
    // 絵が未配置のカードは、属性の丸だけを置いた枠で代用する
    const placeholder = el('div', 'detail__art detail__art--empty')
    placeholder.append(typeBadge(card.type))
    box.append(placeholder)
  } else {
    const art = el('img', 'detail__art')
    art.src = url
    art.alt = card.name
    art.decoding = 'async'
    box.append(art)
  }

  box.append(el('div', 'detail__name', displayName(card.name, card.ex)))
  box.append(el('div', 'detail__rule'))

  const foot = el('div', 'detail__foot')
  foot.append(typeBadge(card.type))
  foot.append(el('span', 'detail__origin', originLabel(card.origin)))
  foot.append(el('span', 'detail__code', `${rarityCode(card.rarity)} HP${card.hp}`))
  box.append(foot)

  const remaining = creature === null ? card.hp : Math.max(0, card.hp - creature.damage)
  const facts = [
    `HP ${remaining}/${card.hp}`,
    card.weakness === null ? '弱点 なし' : `弱点 ${energyLabel(card.weakness)}（+${WEAKNESS_BONUS}）`,
    `にげる エネ${card.retreatCost}`,
    `レアリティ ${rarityLabel(card.rarity)}`,
  ]
  if (creature !== null && creature.attached.length > 0) {
    facts.push(`ついているエネルギー ${creature.attached.map((e) => energyLabel(e)).join('')}`)
  }
  if (creature !== null && creature.status.includes('poisoned')) facts.push('どく')
  const factRow = el('div', 'detail__facts')
  for (const fact of facts) factRow.append(el('span', undefined, fact))
  box.append(factRow)

  for (const attack of card.attacks) {
    const row = el('div', 'detail__attack')
    row.append(attackNameNode(attack))
    row.append(el('span', 'detail__attackText', describeAttack(attack)))
    box.append(row)
  }

  box.append(el('div', 'detail__flavor', card.flavor))
  return box
}

const LONG_PRESS_MS = 450

/**
 * タップと長押しを振り分ける。
 * ハイライト中のカードはタップでそのまま行動し、長押しで内容を確認できるようにする。
 * ホバーは使わない（CLAUDE.md 6章）。
 */
/**
 * 長押しが成立したら、指を離したときのクリックを1回だけ捨てる。
 *
 * 長押しで詳細を開くと盤面が描き直され、モーダルが指の位置に重なる。そのまま
 * 離すと、新しく生えたカードやモーダルのボタンが押されてしまう。時間で止めると
 * 直後の正当なタップまで飲み込むため、「次の1クリックだけ」を対象にする。
 */
let suppressNextClick = false

document.addEventListener(
  'click',
  (event) => {
    if (!suppressNextClick) return
    suppressNextClick = false
    event.stopPropagation()
    event.preventDefault()
  },
  true,
)

// 離してもクリックが発生しない場合があるため、次に押し始めた時点で必ず解除する。
// 残したままだと、そのあとの正当なタップを1回食べてしまう。
document.addEventListener('pointerdown', () => {
  suppressNextClick = false
}, true)

function bindTap(node: HTMLElement, onTap: () => void, onLongPress: () => void): void {
  let timer: number | null = null
  let longPressed = false

  const clear = (): void => {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
  }

  node.addEventListener('pointerdown', () => {
    longPressed = false
    suppressNextClick = false
    clear()
    timer = window.setTimeout(() => {
      timer = null
      longPressed = true
      suppressNextClick = true
      onLongPress()
    }, LONG_PRESS_MS)
  })
  for (const event of ['pointerup', 'pointerleave', 'pointercancel']) {
    node.addEventListener(event, clear)
  }
  // 長押し中の選択メニューや文字選択を抑える
  node.addEventListener('contextmenu', (e) => e.preventDefault())
  node.addEventListener('click', () => {
    if (longPressed) {
      longPressed = false
      return
    }
    onTap()
  })
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

/**
 * 入力のハンドラ。
 * カードのタップは「詳細を開く」に統一し、そこから行動を選ばせる。
 * こうしないと、相手のカードや手札の性能を確認する手段が無くなる。
 */
export interface Handlers {
  readonly onAction: (action: Action) => void
  readonly onAttackMenu: () => void
  readonly onRetreatMenu: () => void
  readonly onCreatureTap: (owner: PlayerId, instanceId: number) => void
  readonly onHandTap: (handIndex: number) => void
}

function creatureCard(
  creature: Creature,
  isActive: boolean,
  selectable: boolean,
  onTap: () => void,
  onDetail: () => void,
): HTMLElement {
  const card = requireCard(creature.cardId)
  const remaining = Math.max(0, card.hp - creature.damage)
  const node = el('button', `card${isActive ? ' card--active' : ''}${selectable ? ' card--selectable' : ''}`)
  node.type = 'button'
  applyCardTheme(node, card.origin, card.rarity, card.type)

  const body = el('span', 'card__body')
  body.append(typeBadge(card.type))
  body.append(el('span', 'card__name', displayName(card.name, card.ex)))
  body.append(el('span', 'card__hp', `${remaining}/${card.hp}`))

  const bar = el('div', 'card__bar')
  const fill = el('span')
  fill.style.width = `${(remaining / card.hp) * 100}%`
  bar.append(fill)
  body.append(bar)

  const tags: string[] = []
  if (creature.attached.length > 0) tags.push(creature.attached.map((e) => energyLabel(e)).join(''))
  if (creature.status.includes('poisoned')) tags.push('どく')
  if (tags.length > 0) body.append(el('span', 'card__tags', tags.join(' ')))

  node.append(body)
  bindTap(node, onTap, onDetail)
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
    const canAttach = attachTargets.has(creature.instanceId)
    const detail = (): void => handlers.onCreatureTap(id, creature.instanceId)
    bench.append(
      creatureCard(creature, false, canAttach, canAttach
        ? () => handlers.onAction({ type: 'attachEnergy', player: id, target: creature.instanceId })
        : detail,
      detail),
    )
  }

  const active = el('div', 'slots')
  if (player.active === null) active.append(emptySlot('バトル場'))
  else {
    const creature = player.active
    const canAttach = attachTargets.has(creature.instanceId)
    const detail = (): void => handlers.onCreatureTap(id, creature.instanceId)
    active.append(
      creatureCard(creature, true, canAttach, canAttach
        ? () => handlers.onAction({ type: 'attachEnergy', player: id, target: creature.instanceId })
        : detail,
      detail),
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
    applyCardTheme(node, card.origin, card.rarity, card.type)
    const body = el('span', 'card__body')
    body.append(typeBadge(card.type))
    body.append(el('span', 'card__name', displayName(card.name, card.ex)))
    body.append(el('span', 'card__hp', `HP${card.hp}`))
    node.append(body)
    const detail = (): void => handlers.onHandTap(index)
    bindTap(node, action === undefined ? detail : () => handlers.onAction(action), detail)
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

  const player = state.players[HUMAN]
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

  const retreatCost = player.active === null ? 0 : requireCard(player.active.cardId).retreatCost
  const retreatBtn = el('button', 'btn btn--ghost', `にげる（エネ${retreatCost}）`)
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

  board.append(el('div', 'hint', 'カードを長押しすると、ワザや弱点を見られます'))

  const logBox = el('div', 'log')
  for (const line of recentLog(state, 4)) logBox.append(el('div', undefined, line))
  board.append(logBox)

  root.append(board)
}

/** ワザ選択・ベンチ選択の共通モーダル */
export function renderChoices(
  root: HTMLElement,
  title: string,
  choices: readonly { readonly label: string; readonly sub?: string; readonly action: Action }[],
  onPick: (action: Action) => void,
  onCancel: (() => void) | null,
  detail: HTMLElement | null = null,
): void {
  const modal = el('div', 'modal')
  const panel = el('div', 'modal__panel')
  panel.append(el('div', 'title', title))
  if (detail !== null) panel.append(detail)
  for (const choice of choices) {
    const btn = el('button', choice.sub === undefined ? 'btn' : 'btn btn--stack')
    btn.type = 'button'
    btn.append(el('span', undefined, choice.label))
    if (choice.sub !== undefined) btn.append(el('span', 'btn__sub', choice.sub))
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
