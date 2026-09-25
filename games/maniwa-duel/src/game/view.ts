/**
 * 描画（SPEC 8章・9章）。**core を呼ぶだけで、ルールは持たない**（CLAUDE.md 2章）。
 *
 * DOM を毎回組み直す素朴な作りにしてある。盤面が12枠＋手札なので、
 * 差分更新を入れるほどの量にならない。
 */
import { findCard, findMonster, findSpell, findTrap } from '../data/cards.ts'
import { effectiveAtk, effectiveDef } from '../core/rules.ts'
import { monstersOf } from '../core/state.ts'
import type {
  CardDef,
  CardId,
  GameState,
  MonsterOnField,
  PlayerId,
  SpellOnField,
} from '../core/types.ts'
import { opponentOf } from '../core/types.ts'
import { artStage, artUrl } from './art.ts'
import { applyCardTheme, RARITY_STYLE } from './theme.ts'

/** 画面が受け取る操作。main.ts が中身を詰める */
export interface ViewHandlers {
  readonly onHandCard: (index: number) => void
  readonly onMonster: (player: PlayerId, instanceId: number) => void
  readonly onSpellZone: (player: PlayerId, zone: number) => void
  /** 相手の番の待ち時間を飛ばす（SPEC 8.1） */
  readonly onFastForward: () => void
}

export interface ViewModel {
  readonly state: GameState
  /** 人が操作する側 */
  readonly human: PlayerId
  /** いま選んでいる手札の番号 */
  readonly selectedHand: number | null
  /** いま選んでいる自分の姫神 */
  readonly selectedMonster: number | null
  /** デッキの主の姫神。立ち絵に使う（SPEC 8.1）。無ければ null */
  readonly leaders: readonly [CardId | null, CardId | null]
  /** 画面下に出す説明 */
  readonly message: string
  /** 出すボタン */
  readonly buttons: readonly { readonly label: string; readonly onTap: () => void }[]
  /** 早送り中か */
  readonly fast: boolean
}

function el(tag: string, className?: string, text?: string): HTMLElement {
  const node = document.createElement(tag)
  if (className !== undefined) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

/** ルビ付きの名前。ルビが無ければそのまま */
function nameNode(def: CardDef): HTMLElement {
  const wrap = el('span', 'card__name')
  if ('ruby' in def && def.ruby !== undefined) {
    const ruby = document.createElement('ruby')
    ruby.textContent = def.name
    const rt = document.createElement('rt')
    rt.textContent = def.ruby
    ruby.appendChild(rt)
    wrap.appendChild(ruby)
  } else {
    wrap.textContent = def.name
  }
  return wrap
}

/**
 * カード1枚の見た目。
 *
 * 左下の「攻 2100 / 守 1700」と右下のレベル・属性バッジは
 * **種別を見分ける唯一の手がかり**なので消してはならない（SPEC 9.1）。
 */
export function cardNode(cardId: CardId, opts: {
  readonly lp?: number
  readonly faceDown?: boolean
  readonly small?: boolean
  readonly atk?: number
  readonly def?: number
} = {}): HTMLElement {
  const node = el('div', `card${opts.small === true ? ' card--small' : ''}`)
  if (opts.faceDown === true) {
    node.classList.add('card--back')
    node.appendChild(el('div', 'card__crest', '姫'))
    return node
  }

  const def = findCard(cardId)
  if (def === null) {
    node.appendChild(el('div', 'card__name', cardId))
    return node
  }

  const monster = def.kind === 'monster' ? def : null
  applyCardTheme(node, def.origin, def.rarity, monster?.attribute ?? 'colorless')

  const art = el('div', 'card__art')
  const url = artUrl(cardId, opts.lp === undefined ? 'normal' : artStage(opts.lp))
  if (url !== null) art.style.backgroundImage = `url(${url})`
  node.appendChild(art)

  node.appendChild(nameNode(def))

  const foot = el('div', 'card__foot')
  if (monster !== null) {
    const atk = opts.atk ?? monster.atk
    const dfn = opts.def ?? monster.def
    foot.appendChild(el('span', 'card__stat', `攻${atk}`))
    foot.appendChild(el('span', 'card__stat', `守${dfn}`))
    const badge = el('span', 'card__badge', '★'.repeat(Math.min(monster.level, 8)))
    badge.classList.add('card__badge--level')
    foot.appendChild(badge)
  } else {
    const kind = def.kind === 'spell' ? (def.form === 'art' ? '絶技' : '神具') : '道標'
    foot.appendChild(el('span', 'card__stat', kind))
    foot.appendChild(el('span', 'card__badge', RARITY_STYLE[def.rarity].code))
  }
  node.appendChild(foot)
  return node
}

/** 場の姫神1体 */
function monsterNode(vm: ViewModel, owner: PlayerId, m: MonsterOnField, h: ViewHandlers): HTMLElement {
  const slot = el('div', 'slot slot--monster')
  const lp = vm.state.players[owner].lp
  const hidden = m.faceDown && owner !== vm.human
  const node = cardNode(m.cardId, {
    lp,
    faceDown: hidden,
    small: true,
    atk: effectiveAtk(vm.state, m.instanceId),
    def: effectiveDef(vm.state, m.instanceId),
  })
  if (m.position === 'defense') node.classList.add('card--defense')
  if (m.faceDown) node.classList.add('card--facedown')
  if (m.hasAttacked) node.classList.add('card--spent')
  if (vm.selectedMonster === m.instanceId) node.classList.add('card--selected')
  node.addEventListener('click', () => h.onMonster(owner, m.instanceId))
  slot.appendChild(node)
  return slot
}

/** 魔法罠ゾーン1枠 */
function spellNode(vm: ViewModel, owner: PlayerId, zone: number, card: SpellOnField | null,
                   h: ViewHandlers): HTMLElement {
  const slot = el('div', 'slot slot--spell')
  if (card === null) {
    slot.classList.add('slot--empty')
    slot.addEventListener('click', () => h.onSpellZone(owner, zone))
    return slot
  }
  const hidden = card.state === 'set' && owner !== vm.human
  const node = cardNode(card.cardId, { faceDown: hidden, small: true })
  node.classList.add('card--spellzone')
  // 割り込みで開ける伏せカードは光らせる（SPEC 8.2）
  const canOpen =
    vm.state.pendingAttack !== null &&
    vm.state.priority === vm.human &&
    owner === vm.human &&
    card.state === 'set' &&
    card.setTurn < vm.state.turn
  if (canOpen) node.classList.add('card--openable')
  node.addEventListener('click', () => h.onSpellZone(owner, zone))
  slot.appendChild(node)
  return slot
}

/**
 * 1列ぶん。両端に札束の枠を置く（SPEC 8.1）。
 *
 * 遊戯王の盤は自分から見て**デッキが右・墓地が左**なので、それに合わせる。
 * 札束はモンスターの枠を狭めないよう、44px 角に固定する。
 */
function zoneRow(vm: ViewModel, owner: PlayerId, kind: 'monster' | 'spell',
                 h: ViewHandlers, left: HTMLElement | null, right: HTMLElement | null): HTMLElement {
  const row = el('div', `row row--${kind}`)
  row.appendChild(left ?? el('div', 'pile pile--blank'))
  const side = vm.state.players[owner]
  if (kind === 'monster') {
    side.monsters.forEach((m, i) => {
      if (m === null) {
        const empty = el('div', 'slot slot--monster slot--empty')
        empty.dataset['zone'] = String(i)
        row.appendChild(empty)
      } else {
        row.appendChild(monsterNode(vm, owner, m, h))
      }
    })
  } else {
    side.spells.forEach((c, i) => row.appendChild(spellNode(vm, owner, i, c, h)))
  }
  row.appendChild(right ?? el('div', 'pile pile--blank'))
  return row
}

/**
 * ライフの帯と、決闘者の立ち絵（SPEC 8.1）。
 *
 * **ライフは画面で一番大きい要素にする。** 決着はライフでしか起きないので、
 * 最も読む数字を最も大きく置く。斜めの帯は実物の見せ方から取った。
 *
 * 立ち絵は**デッキの主の姫神**で、**ライフで絵が切り替わる**（SPEC 9.3 と同じ規則）。
 * 盤にカードが1枚も無いときでも劣勢が伝わる。
 */
function lifeBanner(vm: ViewModel, owner: PlayerId, side: 'top' | 'bottom'): HTMLElement {
  const player = vm.state.players[owner]
  const wrap = el('div', `banner banner--${side}`)

  const face = el('div', 'banner__face')
  const leader = vm.leaders[owner]
  if (leader !== null) {
    const url = artUrl(leader, artStage(player.lp))
    if (url !== null) face.style.backgroundImage = `url(${url})`
  }
  wrap.appendChild(face)

  const box = el('div', 'banner__box')
  box.appendChild(el('span', 'banner__who', owner === vm.human ? '自分' : '相手'))
  const lp = el('span', 'banner__lp', String(Math.max(0, player.lp)))
  const ratio = Math.max(0, Math.min(1, player.lp / 4000))
  lp.style.setProperty('--lp-ratio', String(ratio))
  if (ratio <= 0.4) lp.classList.add('banner__lp--low')
  box.appendChild(lp)
  wrap.appendChild(box)
  return wrap
}

/** 盤の上に置く札束。数を札の上に載せる（SPEC 8.1） */
function pile(kind: 'deck' | 'grave', count: number): HTMLElement {
  const node = el('div', `pile pile--${kind}`)
  node.appendChild(el('span', 'pile__label', kind === 'deck' ? '山' : '墓'))
  node.appendChild(el('span', 'pile__count', String(count)))
  if (count === 0) node.classList.add('pile--empty')
  return node
}

function handRow(vm: ViewModel, h: ViewHandlers): HTMLElement {
  const row = el('div', 'hand')
  const side = vm.state.players[vm.human]
  side.hand.forEach((id, i) => {
    const wrap = el('div', 'hand__slot')
    const node = cardNode(id, { small: true })
    if (vm.selectedHand === i) node.classList.add('card--selected')
    node.addEventListener('click', () => h.onHandCard(i))
    wrap.appendChild(node)
    row.appendChild(wrap)
  })
  if (side.hand.length === 0) row.appendChild(el('div', 'hand__empty', '手札なし'))
  return row
}

const PHASE_LABEL: Readonly<Record<string, string>> = {
  setup: '準備', draw: 'ドロー', main: 'メイン', battle: 'バトル', end: 'エンド', over: '終了',
}

export function renderDuel(root: HTMLElement, vm: ViewModel, h: ViewHandlers): void {
  root.textContent = ''
  const foe = opponentOf(vm.human)
  const me = vm.state.players[vm.human]
  const them = vm.state.players[foe]

  // --- 上部: 相手のライフ / ターンとフェイズ / 早送り（SPEC 8.1）
  const head = el('div', 'head')
  head.appendChild(lifeBanner(vm, foe, 'top'))

  const turn = el('div', 'turn')
  turn.appendChild(el('span', 'turn__no', `ターン${vm.state.turn}`))
  const who = vm.state.turnPlayer === vm.human ? '自分' : '相手'
  const phase = PHASE_LABEL[vm.state.phase] ?? vm.state.phase
  const label = el('span', 'turn__phase', `${who}の${phase}`)
  if (vm.state.turnPlayer !== vm.human) label.classList.add('turn__phase--foe')
  turn.appendChild(label)
  head.appendChild(turn)

  const ff = el('button', `ff${vm.fast ? ' ff--on' : ''}`, '≫')
  ff.setAttribute('aria-label', '早送り')
  ff.addEventListener('click', h.onFastForward)
  head.appendChild(ff)
  root.appendChild(head)

  // --- 盤（SPEC 8.1）。相手側は奥へ、自分側は手前へ
  const board = el('div', 'board')
  const far = el('div', 'field field--far')
  far.appendChild(zoneRow(vm, foe, 'spell', h, pile('deck', them.deck.length), null))
  far.appendChild(zoneRow(vm, foe, 'monster', h, pile('grave', them.graveyard.length), null))
  board.appendChild(far)

  board.appendChild(el('div', 'board__line'))

  const near = el('div', 'field field--near')
  near.appendChild(zoneRow(vm, vm.human, 'monster', h, null, null))
  near.appendChild(zoneRow(vm, vm.human, 'spell', h,
    pile('grave', me.graveyard.length), pile('deck', me.deck.length)))
  board.appendChild(near)
  root.appendChild(board)

  // --- 下部: 自分のライフ、手札、説明、ボタン
  root.appendChild(lifeBanner(vm, vm.human, 'bottom'))
  root.appendChild(handRow(vm, h))
  root.appendChild(el('div', 'message', vm.message))

  const buttons = el('div', 'buttons')
  for (const b of vm.buttons) {
    const btn = el('button', 'button', b.label)
    btn.addEventListener('click', b.onTap)
    buttons.appendChild(btn)
  }
  root.appendChild(buttons)
}

/** 場に出ている姫神の数。main.ts が表示の判断に使う */
export function fieldCount(state: GameState, player: PlayerId): number {
  return monstersOf(state.players[player]).length
}

export { findMonster, findSpell, findTrap }
