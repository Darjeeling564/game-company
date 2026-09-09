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
  LogEntry,
  Origin,
  PlayerId,
  PlayerState,
  Rarity,
} from '../core/types.ts'
import { BENCH_SIZE, WEAKNESS_CHART, weaknessBonus } from '../core/types.ts'
import { requireCard, requireCreature } from '../data/cards.ts'
import { artStage, artUrl } from './art.ts'
import { ORIGIN_STYLE, RARITY_STYLE, TYPE_COLOR, applyCardTheme } from './theme.ts'

export const HUMAN: PlayerId = 0
export const CPU: PlayerId = 1

const ENERGY_LABEL: Readonly<Record<string, string>> = {
  fire: '炎', forest: '森', wind: '風', earth: '土', thunder: '雷', water: '水',
  light: '光', dark: '闇', colorless: '無',
}

export function energyLabel(type: string | null): string {
  return type === null ? '—' : (ENERGY_LABEL[type] ?? type)
}

/**
 * コスト欄での表記（SPEC 9.1.1）。
 *
 * **コストの colorless は「全」と書く。** 属性としての無（そのカードが無属性）と
 * 同じ「無」を出していたため、「無エネルギーが要る」と読めてしまっていた。
 * 実際は**どの属性のエネルギーでも1個で払える**ので、「全」のほうが実態に近い。
 * 無エネルギーは供給されないので（17.1）、コストの無は必ず他の属性で払われる。
 */
function costLabel(type: EnergyType): string {
  return type === 'colorless' ? '全' : energyLabel(type)
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
  return cost.length === 0 ? 'なし' : cost.map((e) => costLabel(e)).join('')
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

/**
 * 属性を色丸に白文字で示す。丸の色は theme.ts の TYPE_COLOR。
 *
 * `asCost` はコスト欄かどうか。同じ colorless でも、属性なら「無」、
 * コストなら「全」と書き分ける（SPEC 9.1.1）
 */
function typeBadge(type: EnergyType, asCost = false): HTMLElement {
  const badge = el('span', 'badge', asCost ? costLabel(type) : energyLabel(type))
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
  for (const type of cost) row.append(typeBadge(type, true))
  return row
}

/**
 * 実際に付いているエネルギーの丸。こちらはコストではないので「全」にしない。
 * 無エネルギーは供給されないため（17.1）ここに colorless は現れないが、
 * コスト欄と取り違えないよう関数を分けておく
 */
function attachedBadges(attached: readonly EnergyType[]): HTMLElement {
  const row = el('span', 'badgeRow')
  for (const type of attached) row.append(typeBadge(type))
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
      facts.push(labelled('付いているエネルギー', attachedBadges(creature.attached)))
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
  /** 出し方が複数あるとき（リリース先を選ぶとき）に開く */
  readonly onHandPlace: (handIndex: number) => void
}

/*
 * 「引いた」「出した」に動きを付けるための追跡（SPEC 9.4）。
 *
 * renderBattle は毎回 root.replaceChildren() で作り直すので、CSS アニメーションを
 * 素直に書くと**再描画のたびに全カードが動いてしまう**。前回の描画に居なかったものだけ
 * にクラスを付ける必要があり、その差分をここで持つ。
 *
 * core の状態ではなく描画の都合なので、reduce には持ち込まない（CLAUDE.md 3章）。
 */
let prevHand: readonly string[] = []
let prevBoard: ReadonlySet<number> = new Set()
/** 個体ごとの前回の蓄積ダメージ。増えていたら被弾の演出を出す */
let prevDamage: ReadonlyMap<number, number> = new Map()
/** 個体ごとの前回のエネルギー数。増えていたら付与の演出を出す */
let prevEnergy: ReadonlyMap<number, number> = new Map()
/** 前回のバトル場。消えていたら気絶の演出を出す（SPEC 9.4.3） */
let prevActive: readonly [Creature | null, Creature | null] = [null, null]

/**
 * 1回の描画だけに出す演出。core は純粋なので状態に演出は持てない。
 * 「前回の描画と何が変わったか」から毎回作り直す（SPEC 9.4 と同じ作り）
 */
interface Fx {
  /** 個体ID -> 今回受けたダメージ */
  readonly hit: ReadonlyMap<number, number>
  /** エネルギーが増えた個体 */
  readonly charged: ReadonlySet<number>
  /** 今回場に出た個体 */
  readonly placed: ReadonlySet<number>
  /** 直前に絶技を撃った側。バトル場の姫神を一回転させる */
  readonly ultimate: PlayerId | null
  /** 直前に攻撃した側。バトル場のカードを相手のほうへ踏み込ませる（SPEC 9.4.4） */
  readonly lunge: PlayerId | null
  /**
   * 着弾のエフェクト。**色と派手さは攻撃した側のカードから取る**（SPEC 9.4.4）。
   * 受け手の色で光ると、誰が撃ったのか分からない
   */
  readonly burst: BurstStyle | null
  /** 気絶して消えた個体。1描画ぶんだけ幽霊として置く（SPEC 9.4.3） */
  readonly faint: ReadonlyMap<PlayerId, Creature>
  /** 入れ替えでバトル場に入った個体（SPEC 9.4.5） */
  readonly swapIn: ReadonlySet<number>
  /** 入れ替えでバトル場から下がった個体（SPEC 9.4.5） */
  readonly swapOut: ReadonlySet<number>
}

/** 着弾エフェクトの見た目。専用の配色表は作らず theme.ts の3つをそのまま使う */
interface BurstStyle {
  /** 系統。閃光の色味 */
  readonly origin: Origin
  /** レアリティ。輪の太さと破片の数 */
  readonly rarity: Rarity
  /** 属性。着弾の色 */
  readonly type: EnergyType
}

function boardCreatures(state: GameState): readonly Creature[] {
  const out: Creature[] = []
  for (const player of state.players) {
    if (player.active !== null) out.push(player.active)
    out.push(...player.bench)
  }
  return out
}

/** 直前の1手が絶技だったか。ログの末尾だけを見る */
function lastUltimate(state: GameState): PlayerId | null {
  const last = state.log.at(-1)
  return last !== undefined && last.kind === 'ultimate' ? last.player : null
}

/**
 * 前回の描画から増えたログ。攻撃と気絶を拾うのに使う（SPEC 9.4.3 / 9.4.4）。
 *
 * 攻撃のログは末尾に残らない（`attack` のあとに `damage` や `ko` が続く）ので、
 * `lastUltimate` のように末尾だけを見る方法では取れない。**差分を見る。**
 * これは音の実装（`main.ts` の `playFromLog`）と同じ考え方である。
 */
let prevLogLen = 0

function freshLog(state: GameState): readonly LogEntry[] {
  return state.log.length >= prevLogLen ? state.log.slice(prevLogLen) : state.log
}

/** 差分の中で最後に攻撃した側。絶技も攻撃として数える */
function lastAttacker(fresh: readonly LogEntry[]): PlayerId | null {
  let who: PlayerId | null = null
  for (const entry of fresh) {
    if (entry.kind === 'attack' || entry.kind === 'ultimate') who = entry.player
  }
  return who
}

function makeFx(state: GameState, placed: ReadonlySet<number>): Fx {
  const hit = new Map<number, number>()
  const charged = new Set<number>()
  for (const c of boardCreatures(state)) {
    const before = prevDamage.get(c.instanceId)
    if (before !== undefined && c.damage > before) hit.set(c.instanceId, c.damage - before)
    const energy = prevEnergy.get(c.instanceId)
    if (energy !== undefined && c.attached.length > energy) charged.add(c.instanceId)
  }

  const fresh = freshLog(state)
  const lunge = lastAttacker(fresh)
  /*
   * エフェクトの色は**攻撃した側のバトル場**から取る（SPEC 9.4.4）。
   * 撃った直後に気絶して居なくなっている場合があるので、居なければ出さない
   */
  const striker = lunge === null ? null : state.players[lunge].active
  const burst = striker === null || hit.size === 0
    ? null
    : (() => {
        const card = requireCreature(striker.cardId)
        return { origin: card.origin, rarity: card.rarity, type: card.type }
      })()

  const swap = makeSwap(state)
  return {
    hit, charged, placed, ultimate: lastUltimate(state), lunge, burst,
    faint: makeFaint(state, fresh), swapIn: swap.in, swapOut: swap.out,
  }
}

/**
 * バトル場の入れ替えを拾う（SPEC 9.4.5）。逃げる・引きずり出す・気絶後の登板の3つ。
 *
 * **「バトル場のカードが変わった」だけでは気絶と区別できない。**
 * 下がったほうがまだ盤面に居るかどうかで見分ける。居なければ気絶（9.4.3）なので、
 * こちらでは扱わない。
 */
function makeSwap(state: GameState): { readonly in: ReadonlySet<number>; readonly out: ReadonlySet<number> } {
  const entered = new Set<number>()
  const left = new Set<number>()
  const ids = boardIds(state)
  for (const id of [0, 1] as const) {
    const before = prevActive[id]
    const now = state.players[id].active
    if (before === null || now === null) continue
    if (before.instanceId === now.instanceId) continue
    // 前のバトル場が盤面から消えていれば気絶。入れ替えではない
    if (!ids.has(before.instanceId)) continue
    entered.add(now.instanceId)
    left.add(before.instanceId)
  }
  return { in: entered, out: left }
}

/**
 * 気絶して盤面から消えた個体を拾う（SPEC 9.4.3）。
 *
 * **バトル場のぶんだけを見る。** 気絶はほぼバトル場で起き、そのあと枠が空くので
 * 幽霊を元の位置に置ける。ベンチは配列が詰められて位置が動くため、
 * 同じ場所に置けない。ベンチの気絶（benchAll のワザ）は演出しない
 */
function makeFaint(state: GameState, fresh: readonly LogEntry[]): ReadonlyMap<PlayerId, Creature> {
  const out = new Map<PlayerId, Creature>()
  if (!fresh.some((e) => e.kind === 'ko')) return out
  for (const id of [0, 1] as const) {
    const before = prevActive[id]
    if (before === null) continue
    // 同じ個体がまだ居るなら気絶していない（逃げただけならベンチに残る）
    if (boardIds(state).has(before.instanceId)) continue
    out.set(id, before)
  }
  return out
}

function rememberBoard(state: GameState): void {
  const damage = new Map<number, number>()
  const energy = new Map<number, number>()
  for (const c of boardCreatures(state)) {
    damage.set(c.instanceId, c.damage)
    energy.set(c.instanceId, c.attached.length)
  }
  prevDamage = damage
  prevEnergy = energy
  prevActive = [state.players[0].active, state.players[1].active]
  prevLogLen = state.log.length
}

/** 手札のうち、前回の描画に居なかった位置。山札から引かれた枚数ぶん末尾に増える */
function drawnIndices(hand: readonly string[]): ReadonlySet<number> {
  const grew = hand.length - prevHand.length
  if (grew <= 0) return new Set()
  const fresh = new Set<number>()
  for (let i = hand.length - grew; i < hand.length; i += 1) fresh.add(i)
  return fresh
}

/** 盤面に居る全てのインスタンスID（バトル場＋ベンチ、両者ぶん） */
function boardIds(state: GameState): ReadonlySet<number> {
  const ids = new Set<number>()
  for (const player of state.players) {
    if (player.active !== null) ids.add(player.active.instanceId)
    for (const c of player.bench) ids.add(c.instanceId)
  }
  return ids
}

/**
 * 着弾のエフェクト（SPEC 9.4.4）。
 *
 * **専用の配色表を作らない。** theme.ts の3つをそのまま引く。
 * 表が二重になると、系統やレアリティを足したときに片方だけ直し忘れる。
 *
 *   属性 → 着弾の色 / 系統 → 閃光の色味 / レアリティ → 輪の太さと破片の数
 *
 * 破片は DOM を増やさず `repeating-conic-gradient` の繰り返し数で出す。
 * 手札まで含めた再描画のたびに要素を10個足すと重くなるため。
 */
const BURST_SHARDS: Readonly<Record<Rarity, number>> = {
  common: 4, rare: 6, superRare: 8, ultra: 10,
}

/** 輪の太さ(px)。0 は輪を出さない */
const BURST_RING: Readonly<Record<Rarity, number>> = {
  common: 0, rare: 2, superRare: 4, ultra: 4,
}

function burstNode(style: BurstStyle): HTMLElement {
  const node = el('span', `burst${style.rarity === 'ultra' ? ' burst--ur' : ''}`)
  node.style.setProperty('--burst-type', TYPE_COLOR[style.type])
  node.style.setProperty('--burst-origin', ORIGIN_STYLE[style.origin].bg)
  node.style.setProperty('--burst-shards', String(BURST_SHARDS[style.rarity]))
  node.style.setProperty('--burst-ring', `${BURST_RING[style.rarity]}px`)
  // UR の枠色はグラデーションなので border に入らない。輪は属性色で描き、虹は別層で掃く
  node.style.setProperty('--burst-ring-color', style.rarity === 'ultra'
    ? TYPE_COLOR[style.type]
    : RARITY_STYLE[style.rarity].frame)
  return node
}

function creatureCard(
  creature: Creature,
  isActive: boolean,
  selectable: boolean,
  onTap: () => void,
  onDetail: () => void,
  fx: Fx,
  owner: PlayerId,
): HTMLElement {
  const card = requireCreature(creature.cardId)
  const remaining = Math.max(0, card.hp - creature.damage)
  const damage = fx.hit.get(creature.instanceId)
  const node = el('button', `card card--board${isActive ? ' card--active' : ''}`
    + `${selectable ? ' card--attachable' : ''}`
    + `${fx.placed.has(creature.instanceId) ? ' card--enter' : ''}`
    + `${damage !== undefined ? ' card--hit' : ''}`
    + `${fx.charged.has(creature.instanceId) ? ' card--charged' : ''}`
    + `${remaining <= card.hp / 2 ? ' card--wounded' : ''}`
    + `${isActive && fx.ultimate === owner ? ' card--ultimate' : ''}`
    /*
     * 攻撃した側のバトル場だけが踏み込む。向きは side--human / side--cpu で決まる。
     * **絶技のときは付けない。** 一回転（card--ultimate）を残す決まりで（SPEC 9.4.4）、
     * 両方付けると transform が競合してどちらか片方しか効かない
     */
    + `${isActive && fx.lunge === owner && fx.ultimate !== owner ? ' card--lunge' : ''}`
    /*
     * 入れ替え（SPEC 9.4.5）。位置が変わったことのほうが被弾より読み取りに要るので、
     * 同じカードに乗ったときは入れ替えを優先する（CSS 側の詳細度で解決している）
     */
    + `${fx.swapIn.has(creature.instanceId) ? ' card--swap-in' : ''}`
    + `${fx.swapOut.has(creature.instanceId) ? ' card--swap-out' : ''}`)
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

  // ついているエネルギーは丸で出す。詳細画面のコスト表記と同じ見た目にそろえ、
  // 「あと何個で撃てるか」をカードの行き来なしに数えられるようにする
  if (creature.attached.length > 0 || creature.status.includes('poisoned')) {
    const tags = el('span', 'card__tags')
    if (creature.attached.length > 0) tags.append(attachedBadges(creature.attached))
    if (creature.status.includes('poisoned')) tags.append(el('span', 'card__status', '毒'))
    body.append(tags)
  }

  /*
   * バトル場のカードだけはワザまで出す（SPEC 9 の対戦画面レイアウト）。
   * 「いま何を撃てるか」を長押しせずに読めるようにするため。
   * ベンチは幅が無く、出すと絵が帯になって誰か分からなくなるので出さない。
   */
  if (isActive) {
    const attacks = el('span', 'card__attacks')
    for (const attack of card.attacks) {
      const row = el('span', 'card__attack')
      // 盤面はフリガナを出さない。152px 幅で2段になると絵が潰れる。
      // 読みが要るときは長押しで詳細を開く（そちらには出る）
      row.append(el('span', 'card__attackName', attack.name))
      row.append(costBadges(attack.cost))
      attacks.append(row)
    }
    body.append(attacks)
  }

  // 受けたダメージを一瞬だけ浮かせる。ログを読まなくても何が起きたか分かるように
  if (damage !== undefined) body.append(el('span', 'card__pop', `-${damage}`))
  // 着弾のエフェクトは被弾した側に出す。色は攻撃した側から取る（SPEC 9.4.4）
  if (damage !== undefined && fx.burst !== null) body.append(burstNode(fx.burst))
  node.append(body)

  /*
   * 残りHPはカードの外に出す（SPEC 9.7.2）。上端に半分かけるので、
   * 縦に増えるのは1枠あたり10px程度で済み、絵の面積も広くなる
   */
  const meter = el('span', 'meter')
  meter.append(el('span', 'meter__hp', String(remaining)))
  const bar = el('span', 'meter__bar')
  const fill = el('span')
  fill.style.width = `${(remaining / card.hp) * 100}%`
  if (remaining * 2 <= card.hp) fill.classList.add('is-low')
  bar.append(fill)
  meter.append(bar)
  node.append(meter)

  bindTap(node, onTap, onDetail)
  return node
}

/**
 * 山札とトラッシュの積み。裏面はCSSだけで描く（画像を足さない）。
 * 卓の左右に置いて、盤面が「カードゲームの卓」に見えるようにする（SPEC 9.7.2）
 */
function pileView(kind: 'deck' | 'discard', count: number): HTMLElement {
  const pile = el('div', `pile pile--${kind}`)
  // 3枚まで重ねて厚みを出す。0枚なら枠だけ残して「置き場所」を示す
  for (let i = 0; i < Math.min(3, count); i += 1) pile.append(el('span', 'pile__card'))
  pile.append(el('span', 'pile__count', String(count)))
  return pile
}

/**
 * 空きスロット。**盤面カードと同じ寸法クラスを付ける**のが要点で、
 * これが無いと空き枠だけ帯になり、残りの幅を全部吸って隣のカードが潰れる。
 */
function emptySlot(label: string, isActive = false): HTMLElement {
  return el('div', `card card--board card--empty${isActive ? ' card--active-slot' : ''}`, label)
}

function sideView(
  state: GameState,
  id: PlayerId,
  handlers: Handlers,
  attachTargets: ReadonlySet<number>,
  fx: Fx,
): HTMLElement {
  const player: PlayerState = state.players[id]
  // 相手側は一回り小さくする。8枠ぶんを原寸で並べると縦が画面に収まらない（SPEC 9）
  const side = el('div', `side side--${id === HUMAN ? 'human' : 'cpu'}`)

  const head = el('div', 'side__head')
  head.append(el('span', undefined, id === HUMAN ? '自分' : '相手'))
  const points = el('span', 'points')
  for (let i = 0; i < 3; i += 1) {
    points.append(el('span', `points__pip${i < player.points ? ' points__pip--on' : ''}`))
  }
  head.append(points)
  head.append(el('span', 'muted', `手札${player.hand.length}`))
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
      detail, fx, id),
    )
  }

  // バトル場は列ごと手前に出す。カード側に置くと、被弾や配置の
  // transform アニメーションと打ち消し合う（SPEC 9.7）
  const active = el('div', 'slots slots--active')
  const faint = fx.faint.get(id)
  if (player.active === null) {
    /*
     * 気絶した姫神を1描画ぶんだけ置き直す（SPEC 9.4.3）。
     * 倒れてから消えるので、どこに居た誰が倒れたのかが分かる。
     * **押せないようにする**（CSS の pointer-events）。押せると盤面と食い違う
     */
    if (faint !== undefined) {
      const ghost = creatureCard(faint, true, false, () => undefined, () => undefined,
        { ...fx, hit: new Map(), charged: new Set(), placed: new Set(), burst: null,
          swapIn: new Set(), swapOut: new Set() }, id)
      ghost.classList.add('card--faint')
      if (ghost instanceof HTMLButtonElement) ghost.disabled = true
      active.append(ghost)
    } else active.append(emptySlot('バトル場', true))
  } else {
    const creature = player.active
    const canAttach = attachTargets.has(creature.instanceId)
    const detail = (): void => handlers.onCreatureTap(id, creature.instanceId)
    active.append(
      creatureCard(creature, true, canAttach, canAttach
        ? () => handlers.onAction({ type: 'attachEnergy', player: id, target: creature.instanceId })
        : detail,
      detail, fx, id),
    )
  }

  side.append(pileView('deck', player.deck.length))
  side.append(pileView('discard', player.discard.length))

  // 相手側はベンチを上、バトル場を下に置いて向かい合わせる
  if (id === CPU) {
    side.append(bench, active)
  } else {
    side.append(active, bench)
  }
  return side
}

function handView(state: GameState, handlers: Handlers, drawn: ReadonlySet<number>): HTMLElement {
  const legal = legalActions(state)
  /*
   * 1枚の手札に対して出し方が複数あることがある。レアリティ召喚では
   * 「バトル場をリリース」「ベンチのどれをリリース」で結果が別物になるので、
   * **1つに畳んではいけない**。畳むと勝手に選ばれてしまう
   */
  const playable = new Map<number, Action[]>()
  for (const action of legal) {
    if (action.type === 'start' || action.player !== HUMAN) continue
    switch (action.type) {
      case 'playCreature':
      case 'setupPlace':
      case 'playItem':
      case 'playAction':
      case 'useUltimate':
        playable.set(action.handIndex, [...(playable.get(action.handIndex) ?? []), action])
        break
      default:
        break
    }
  }

  const cards = state.players[HUMAN].hand
  /*
   * 重ねるのは枚数が多いときだけ。常に重ねると、選べるカード（z-index で前に出る）が
   * 隣のカードの名前を隠す。5枚までは 390px に並べて入る
   */
  const hand = el('div', `hand${cards.length > 5 ? ' hand--dense' : ''}`)
  if (cards.length === 0) hand.append(el('div', 'muted', '手札なし'))
  cards.forEach((cardId, index) => {
    const card = requireCard(cardId)
    const options = playable.get(index) ?? []
    const action = options[0]
    const fresh = drawn.has(index)
    const node = el('button', `card card--hand${action !== undefined ? ' card--selectable' : ''}`
      + `${options.length > 1 ? ' card--choices' : ''}`
      + `${fresh ? ' card--draw' : ''}`)
    /*
     * 手札は弧に並べる（SPEC 9.7.2）。中央を0として左右に開く。
     * **角度は浅く保つ。** 傾けるほど文字が読みにくくなるので、
     * 端でも6度までにして、束に見える最小限に留める
     */
    const center = (cards.length - 1) / 2
    const spread = cards.length <= 1 ? 0 : Math.min(6, 14 / cards.length)
    node.style.setProperty('--fan-angle', `${(index - center) * spread}deg`)
    node.style.setProperty('--fan-lift', `${Math.abs(index - center) * 1.6}px`)
    node.type = 'button'
    // 同時に何枚も引いたとき（初手など）は少しずつ遅らせて、順に届くように見せる
    if (fresh) node.style.setProperty('--draw-delay', `${Math.min(index, 6) * 60}ms`)
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
    // 出し方が複数あるカードは、選ぶ必要があると分かる目印を出す
    if (options.length > 1) body.append(el('span', 'card__choices', `${options.length}通り`))
    node.append(body)
    const detail = (): void => handlers.onHandTap(index)
    /*
     * 出し方が1つだけならタップで即出す（コモンを置く速さを落とさない）。
     * 複数あるならリリース先を選ばせる。長押しは今までどおり詳細
     */
    const tap = action === undefined
      ? detail
      : options.length > 1
        ? (): void => handlers.onHandPlace(index)
        : (): void => handlers.onAction(action)
    bindTap(node, tap, detail)
    hand.append(node)
  })
  return hand
}

function statusBanner(state: GameState): HTMLElement {
  if (state.phase.kind === 'setup') {
    // 置けるのはコモンの姫神だけ（SPEC 3.3.1）。手札の選べないカードは
    // legalActions 由来で自動的に暗くなるが、理由は文で出さないと伝わらない
    return el('div', 'banner', 'コモンの姫神をバトル場とベンチに出そう。手札をタップ。')
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

  // 動きを付ける対象を、前回の描画との差分で決める（SPEC 9.4）
  const hand = state.players[HUMAN].hand
  const drawn = drawnIndices(hand)
  const ids = boardIds(state)
  const placed = new Set([...ids].filter((id) => !prevBoard.has(id)))
  const fx = makeFx(state, placed)

  /*
   * 盤面の**スクロール位置を持ち越す**（SPEC 9.3.2）。
   * 描き直しは root.replaceChildren() で丸ごと作り直すので、下げた視界が
   * 1手ごとに先頭へ巻き戻り、画面外にある自分のベンチとログに届かなかった。
   * 対戦画面以外から来たときは `.board > .field` が無く、0 から始まる。
   *
   * `.field` は入力欄にも使っている別物があるので、必ず `.board >` で絞る
   */
  const live = root.querySelector('.board > .field')
  const keptScroll = live instanceof HTMLElement ? live.scrollTop : 0

  root.replaceChildren()
  const board = el('div', 'board')
  // 置き先の破線を、今つけようとしているエネルギーと同じ色にする
  const current = state.players[HUMAN].energy.current
  if (current !== null) board.style.setProperty('--energy-color', `var(--energy-${current})`)
  /*
   * 盤面は縦に伸びるが、操作するのは下の2段（ボタンと手札）である。
   * 画面が足りないときに切れるのが下からだと操作できなくなるので、
   * 盤面だけを内側でスクロールさせ、ボタンと手札は必ず見える位置に置く
   */
  const field = el('div', 'field')
  field.append(statusBanner(state))
  /*
   * 盤面の下敷き（SPEC 9.7.1）。カードは平面のまま、**下敷きだけ**を寝かせて
   * 奥行きを出す。文字を載せない要素なので、傾けてもにじまない
   */
  const mat = el('div', 'mat')
  mat.append(el('div', 'mat__face'))
  field.append(mat)
  field.append(sideView(state, CPU, handlers, new Set(), fx))
  field.append(sideView(state, HUMAN, handlers, attachTargets, fx))

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
  field.append(el('div', 'hint', 'カードを長押しすると、ワザや弱点を見られます'))

  const logBox = el('div', 'log')
  for (const line of recentLog(state, 4)) logBox.append(el('div', undefined, line))
  field.append(logBox)

  const dock = el('div', 'dock')
  // エネルギーの状態は必ず見えていないと意味が無い。盤面側に置くと画面外に出る
  dock.append(energyBar(state, attachTargets.size > 0))
  dock.append(controls)
  dock.append(handView(state, handlers, drawn))

  /*
   * 続きがあることの手がかり（SPEC 9.3.2）。盤面の下端をぼかす。
   * 触れないように pointer-events: none にしてある
   */
  const more = el('div', 'field__more')
  field.append(more)

  board.append(field)
  board.append(dock)
  root.append(board)

  // append したあとでないとスクロールできない（高さが決まっていない）
  field.scrollTop = keptScroll

  /*
   * **下に本当に続きがあるときだけ**手がかりを出す。出しっぱなしにすると、
   * 一番下まで見ているのに「まだ下がある」と嘘をつくことになる。
   * 描き直しのたびに付け直すので、外す処理は要らない
   */
  const syncMore = (): void => {
    const rest = field.scrollHeight - field.clientHeight - field.scrollTop
    more.classList.toggle('field__more--on', rest > 8)
  }
  syncMore()
  field.addEventListener('scroll', syncMore, { passive: true })

  // 次の描画で「前回」として使う。ここを忘れると毎回すべてが新規扱いになる
  prevHand = hand
  prevBoard = ids
  rememberBoard(state)
}

/**
 * エネルギーゾーンの状態を1行で見せる。
 *
 * 「今ターンぶんを置いたのか、まだなのか」が分からないという指摘への対応。
 * 文字だけだと読み飛ばすので、丸の見た目そのものを3状態で変える。
 */
function energyBar(state: GameState, canAttach: boolean): HTMLElement {
  const player = state.players[HUMAN]
  const zone = player.energy
  const myTurn = state.current === HUMAN && state.phase.kind === 'main'
  const used = player.attachedThisTurn
  const empty = zone.current === null

  // 置いたあとは在庫も空になるが、見た目は「空」ではなく「置いた」を優先する。
  // 空と完了を同じ灰色にすると、置き忘れなのか完了なのか読めなくなる
  const state3 = used ? 'used' : empty ? 'empty' : 'ready'
  const bar = el('div', `energy energy--${state3}`)

  const orb = el('span', `energy__orb energy__orb--${zone.current ?? 'none'}`)
  orb.append(el('span', 'energy__mark', used ? '✓' : energyLabel(zone.current)))
  bar.append(orb)

  const text = el('span', 'energy__text')
  if (used) text.textContent = 'このターンのエネルギーは置いた'
  else if (empty) text.textContent = 'エネルギーの在庫なし'
  else if (myTurn && canAttach) text.textContent = 'まだ置いていない — 姫神をタップ'
  else if (myTurn) text.textContent = 'まだ置いていない — 置ける姫神がいない'
  else text.textContent = 'まだ置いていない'
  bar.append(text)

  bar.append(el('span', 'energy__next', `次 ${energyLabel(zone.next)}`))
  return bar
}

/** 決着した盤面の上に出す幕。結果画面へはボタンで進む */
export function renderFinish(root: HTMLElement, state: GameState, onNext: () => void): void {
  const won = state.winner === HUMAN
  const drew = state.winner === null
  const veil = el('div', `finish finish--${drew ? 'draw' : won ? 'win' : 'loss'}`)
  const inner = el('div', 'finish__inner')
  inner.append(el('div', 'finish__title', drew ? '引き分け' : won ? '勝利' : '敗北'))
  inner.append(el('div', 'finish__score',
    `${state.players[HUMAN].points} - ${state.players[CPU].points}　${state.turn}ターン`))
  inner.append(el('div', 'finish__reason', END_REASON[state.endReason ?? ''] ?? ''))
  const next = el('button', 'btn finish__next', '結果を見る')
  next.type = 'button'
  next.addEventListener('click', onNext)
  inner.append(next)
  veil.append(inner)
  root.append(veil)
}

const END_REASON: Readonly<Record<string, string>> = {
  points: '3ポイント先取',
  simultaneous: '同時に3ポイント — 手番側の勝ち',
  noCreature: 'バトル場に出せる姫神が尽きた',
  turnLimit: 'ターン上限',
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
