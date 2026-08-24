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
import { BENCH_SIZE, WEAKNESS_CHART, weaknessBonus } from '../core/types.ts'
import { requireCard, requireCreature } from '../data/cards.ts'
import { artStage, artUrl } from './art.ts'
import { RARITY_STYLE, TYPE_COLOR, applyCardTheme } from './theme.ts'

export const HUMAN: PlayerId = 0
export const CPU: PlayerId = 1

const ENERGY_LABEL: Readonly<Record<string, string>> = {
  fire: '炎', forest: '森', wind: '風', earth: '土', thunder: '雷', water: '水',
  light: '光', dark: '闇', colorless: '無',
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

/** レアリティは記号ではなくアルファベットで表す（C / R / SR / UR） */
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
      return `自分を${effect.value}回復`
    case 'selfDamage':
      return `自分に${effect.value}の反動`
    case 'discardEnergy':
      return effect.target === 'self'
        ? `自分のエネルギーを${effect.value}つトラッシュ`
        : `相手のエネルギーを${effect.value}つトラッシュ`
    case 'applyStatus':
      return effect.status === 'poisoned' ? '相手を毒にする' : String(effect.status)
    case 'draw':
      return `${effect.value}枚引く`
    case 'gainEnergy':
      return 'エネルギーをもう1回付けられる'
    case 'attachEnergy':
      return effect.target === 'ownBenchAll'
        ? `自分のベンチ全体にエネルギーを${effect.value}個付ける`
        : `エネルギーを${effect.value}個付ける`
    case 'switchOpponent':
      return '相手のバトル場をベンチと入れ替える'
    case 'searchCreature':
      return '山札から姫神を1枚手札に加える'
  }
}

const KIND_LABEL: Readonly<Record<CardDef['kind'], string>> = {
  creature: '姫神',
  item: '神具',
  action: '道標',
  ultimate: '絶技',
}

export function kindLabel(kind: CardDef['kind']): string {
  return KIND_LABEL[kind]
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
      return `攻撃「${detail}」`
    case 'damage':
      return amount === undefined ? null : `${amount}ダメージを受けた`
    case 'selfDamage':
      return amount === undefined ? null : `反動で${amount}受けた`
    case 'poison':
      return amount === undefined ? null : `毒で${amount}受けた`
    case 'ko':
      return `気絶（相手に+${detail.match(/\+(\d+)$/)?.[1] ?? '?'}ポイント）`
    case 'coin':
      return `コイン ${detail}`
    case 'status':
      return detail === 'poisoned' ? '毒になった' : detail
    case 'promote':
      return 'バトル場に出した'
    case 'attachEnergy':
      return `エネルギーをつけた（${energyLabel(detail.split(' ')[0] ?? null)}）`
    case 'retreat':
      return '逃げた'
    default:
      return null
  }
}

export function recentLog(state: GameState, count: number): readonly string[] {
  const lines: string[] = []
  for (const entry of state.log) {
    const text = formatLogEntry(entry.kind, entry.detail)
    if (text === null) continue
    lines.push(`${entry.player === HUMAN ? '自分' : '相手'}: ${text}`)
  }
  return lines.slice(-count)
}

/**
 * その属性が誰に弱いかを1行にする。相性は表から引くので、カードごとの記述は無い。
 * 「何に強いか」ではなく「何にやられるか」を出す。守るときに要る情報だから。
 */
function weakOf(type: EnergyType): string {
  const attackers = (Object.keys(WEAKNESS_CHART) as EnergyType[]).filter((a) =>
    WEAKNESS_CHART[a].includes(type),
  )
  if (attackers.length === 0) return '弱点 なし'
  const bonus = weaknessBonus(attackers[0] as EnergyType, type)
  return `弱点 ${attackers.map((a) => energyLabel(a)).join('・')}（+${bonus}）`
}

/** 属性を色丸に白文字で示す。丸の色は theme.ts の TYPE_COLOR */
function typeBadge(type: EnergyType): HTMLElement {
  const badge = el('span', 'badge', energyLabel(type))
  badge.style.setProperty('--card-type', TYPE_COLOR[type])
  return badge
}

/**
 * 「見出し ＋ 丸の並び」を1つの項目にまとめる。
 * detail__facts は span を横に並べるだけなので、見出しと丸が離れて折り返さないよう
 * ひとかたまりにしておく。
 */
function labelled(label: string, node: HTMLElement): HTMLElement {
  const wrap = el('span', 'badgeRow')
  wrap.append(el('span', undefined, label), node)
  return wrap
}

/**
 * コストを丸バッジの並びにする。1つのエネルギーにつき丸1つ。
 *
 * 「炎炎無」と字で書くと、同じ字が続いたときに数が読み取りにくい。丸にすると
 * 数がそのまま個数として見えるうえ、属性の色が付くので何が要るかも一目でわかる。
 * コストが無いカードは丸を出さず「なし」と書く（丸ゼロ個は不在と区別できない）。
 */
function costBadges(cost: readonly EnergyType[]): HTMLElement {
  const row = el('span', 'badgeRow')
  if (cost.length === 0) {
    row.append(el('span', undefined, 'なし'))
    return row
  }
  for (const type of cost) row.append(typeBadge(type))
  return row
}

/**
 * 種別の丸。姫神以外は属性を持たないので、代わりにこれを出す。
 * 字は種別名の頭文字を取る（KIND_LABEL と対応させること）
 */
function kindBadge(kind: CardDef['kind']): HTMLElement {
  const mark: Readonly<Record<CardDef['kind'], string>> = {
    creature: '姫', item: '神', action: '道', ultimate: '絶',
  }
  const badge = el('span', 'badge', mark[kind])
  badge.style.setProperty('--card-type', kind === 'ultimate' ? '#8e44ad' : '#4a5a66')
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
  span.append(costBadges(attack.cost))
  return span
}

/**
 * カード1枚の詳細。カードとしての体裁（イラスト・系統色の地・レアリティ色の枠）で
 * 見せたうえで、ワザのコストと効果まで文字で出す。
 *
 * 種別ごとに出す項目が違う。キャラは HP と弱点とワザ、アイテムと行動は効果だけ、
 * 絶技は撃てる相手とコストを足す。無い項目を空欄で並べても読みにくいだけなので、
 * 種別で分けて必要なものだけ出す。
 */
export function cardDetailPanel(card: CardDef, creature: Creature | null): HTMLElement {
  const box = el('div', 'detail')
  // キャラ以外は属性を持たないので、丸の色は系統の暗い側で代用する
  applyCardTheme(box, card.origin, card.rarity, card.kind === 'creature' ? card.type : 'colorless')

  const stage = card.kind === 'creature' && creature !== null
    ? artStage(card.hp, creature.damage)
    : 'normal'
  const url = artUrl(card.id, stage)
  if (url === null) {
    // 絵が未配置のカードは、種別か属性を置いた枠で代用する
    const placeholder = el('div', 'detail__art detail__art--empty')
    placeholder.append(card.kind === 'creature' ? typeBadge(card.type) : kindBadge(card.kind))
    box.append(placeholder)
  } else {
    const art = el('img', 'detail__art')
    art.src = url
    art.alt = card.name
    art.decoding = 'async'
    box.append(art)
  }

  // 漢字のカード名にはフリガナを振る。ワザ名と同じ扱い
  const nameBox = el('div', 'detail__name')
  const shown = displayName(card.name, card.kind === 'creature' && card.ex)
  if (card.ruby === undefined) {
    nameBox.append(shown)
  } else {
    const ruby = el('ruby')
    ruby.append(shown)
    ruby.append(el('rt', undefined, card.ruby))
    nameBox.append(ruby)
  }
  box.append(nameBox)
  box.append(el('div', 'detail__rule'))

  const foot = el('div', 'detail__foot')
  foot.append(card.kind === 'creature' ? typeBadge(card.type) : kindBadge(card.kind))
  foot.append(el('span', 'detail__origin', originLabel(card.origin)))
  foot.append(
    el('span', 'detail__code', card.kind === 'creature'
      ? `${rarityCode(card.rarity)} HP${card.hp}`
      : rarityCode(card.rarity)),
  )
  box.append(foot)

  const facts: (string | HTMLElement)[] = [
    `種別 ${kindLabel(card.kind)}`,
    `レアリティ ${rarityLabel(card.rarity)}`,
  ]
  if (card.kind === 'creature') {
    const remaining = creature === null ? card.hp : Math.max(0, card.hp - creature.damage)
    facts.unshift(
      `HP ${remaining}/${card.hp}`,
      weakOf(card.type),
      labelled('逃げる', costBadges(Array<EnergyType>(card.retreatCost).fill('colorless'))),
    )
    if (creature !== null && creature.attached.length > 0) {
      facts.push(labelled('付いているエネルギー', costBadges(creature.attached)))
    }
    if (creature !== null && creature.status.includes('poisoned')) facts.push('毒')
  }
  if (card.kind === 'ultimate') {
    facts.unshift(
      `${requireCard(card.requires).name} がバトル場にいるとき`,
      labelled('コスト', costBadges(card.cost)),
    )
  }
  const factRow = el('div', 'detail__facts')
  for (const fact of facts) {
    factRow.append(typeof fact === 'string' ? el('span', undefined, fact) : fact)
  }
  box.append(factRow)

  if (card.kind === 'creature') {
    for (const attack of card.attacks) {
      const row = el('div', 'detail__attack')
      row.append(attackNameNode(attack))
      row.append(el('span', 'detail__attackText', describeAttack(attack)))
      box.append(row)
    }
  } else {
    // 絶技はカード名がそのままワザ名なので、名前を二度出さない
    const row = el('div', 'detail__attack')
    row.append(el('span', 'detail__attackText', card.effects.map(describeEffect).join(' / ')))
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
  const card = requireCreature(creature.cardId)
  const remaining = Math.max(0, card.hp - creature.damage)
  const node = el('button', `card${isActive ? ' card--active' : ''}${selectable ? ' card--selectable' : ''}`)
  node.type = 'button'
  applyCardTheme(node, card.origin, card.rarity, card.type)

  const body = el('span', 'card__body')
  // 絵は地に敷く。傷むと差し替わるので、詳細を開かなくても盤面で分かる
  const url = artUrl(card.id, artStage(card.hp, creature.damage))
  if (url !== null) {
    body.classList.add('card__body--art')
    body.style.backgroundImage = `url(${JSON.stringify(url)})`
  }
  body.append(typeBadge(card.type))
  body.append(el('span', 'card__name', displayName(card.name, card.ex)))
  body.append(el('span', 'card__hp', `${remaining}/${card.hp}`))

  const bar = el('div', 'card__bar')
  const fill = el('span')
  fill.style.width = `${(remaining / card.hp) * 100}%`
  bar.append(fill)
  body.append(bar)

  // ついているエネルギーは丸で出す。詳細画面のコスト表記と同じ見た目にそろえ、
  // 「あと何個で撃てるか」をカードの行き来なしに数えられるようにする
  if (creature.attached.length > 0 || creature.status.includes('poisoned')) {
    const tags = el('span', 'card__tags')
    if (creature.attached.length > 0) tags.append(costBadges(creature.attached))
    if (creature.status.includes('poisoned')) tags.append(el('span', 'card__status', '毒'))
    body.append(tags)
  }

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
  head.append(el('span', undefined, id === HUMAN ? '自分' : '相手'))
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
    if (action.type === 'start' || action.player !== HUMAN) continue
    switch (action.type) {
      case 'playCreature':
      case 'setupPlace':
      case 'playItem':
      case 'playAction':
      case 'useUltimate':
        playable.set(action.handIndex, action)
        break
      default:
        break
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
    applyCardTheme(node, card.origin, card.rarity, card.kind === 'creature' ? card.type : 'colorless')
    const body = el('span', 'card__body')
    const url = artUrl(card.id)
    if (url !== null) {
      body.classList.add('card__body--art')
      body.style.backgroundImage = `url(${JSON.stringify(url)})`
    }
    body.append(card.kind === 'creature' ? typeBadge(card.type) : kindBadge(card.kind))
    body.append(el('span', 'card__name', displayName(card.name, card.kind === 'creature' && card.ex)))
    // キャラは HP、それ以外は種別を出す。手札で何が使えるか一目で分かるようにする
    body.append(el('span', 'card__hp', card.kind === 'creature' ? `HP${card.hp}` : kindLabel(card.kind)))
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
    const who = state.phase.queue[0] === HUMAN ? '自分' : '相手'
    return el('div', 'banner', `${who}のバトル場が空。ベンチから出す。`)
  }
  const who = state.current === HUMAN ? '自分のターン' : '相手のターン'
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

  const attackBtn = el('button', 'btn', '攻撃')
  attackBtn.type = 'button'
  attackBtn.disabled = !canAttack
  attackBtn.addEventListener('click', handlers.onAttackMenu)
  controls.append(attackBtn)

  const retreatCost = player.active === null ? 0 : requireCreature(player.active.cardId).retreatCost
  const retreatBtn = el('button', 'btn btn--ghost', `逃げる（エネ${retreatCost}）`)
  retreatBtn.type = 'button'
  retreatBtn.disabled = !canRetreat
  retreatBtn.addEventListener('click', handlers.onRetreatMenu)
  controls.append(retreatBtn)

  if (setupDone !== undefined) {
    const doneBtn = el('button', 'btn', '準備完了')
    doneBtn.type = 'button'
    doneBtn.addEventListener('click', () => handlers.onAction(setupDone))
    controls.append(doneBtn)
  } else {
    const endBtn = el('button', 'btn btn--ghost', 'ターン終了')
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
