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
  readonly onAdvance: () => void
  readonly onEndTurn: () => void
}

export interface ViewModel {
  readonly state: GameState
  /** 人が操作する側 */
  readonly human: PlayerId
  /** いま選んでいる手札の番号 */
  readonly selectedHand: number | null
  /** いま選んでいる自分の姫神 */
  readonly selectedMonster: number | null
  /** 画面下に出す説明 */
  readonly message: string
  /** 出すボタン */
  readonly buttons: readonly { readonly label: string; readonly onTap: () => void }[]
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

function zoneRow(vm: ViewModel, owner: PlayerId, kind: 'monster' | 'spell',
                 h: ViewHandlers): HTMLElement {
  const row = el('div', `row row--${kind}`)
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
  return row
}

/** ライフとデッキ・墓地の並び */
function statusRow(vm: ViewModel, owner: PlayerId, label: string): HTMLElement {
  const side = vm.state.players[owner]
  const row = el('div', 'status')
  row.appendChild(el('span', 'status__who', label))
  const lp = el('span', 'status__lp', String(Math.max(0, side.lp)))
  // ライフが減るほど赤く寄せる。絵の切り替わりと同じ合図を数字にも出す
  const ratio = Math.max(0, Math.min(1, side.lp / 4000))
  lp.style.setProperty('--lp-ratio', String(ratio))
  if (ratio <= 0.4) lp.classList.add('status__lp--low')
  row.appendChild(lp)
  row.appendChild(el('span', 'status__count', `山${side.deck.length}`))
  row.appendChild(el('span', 'status__count', `墓${side.graveyard.length}`))
  row.appendChild(el('span', 'status__count', `手${side.hand.length}`))
  return row
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

  const board = el('div', 'board')
  board.appendChild(statusRow(vm, foe, '相手'))
  board.appendChild(zoneRow(vm, foe, 'spell', h))
  board.appendChild(zoneRow(vm, foe, 'monster', h))
  board.appendChild(el('div', 'board__line'))
  board.appendChild(zoneRow(vm, vm.human, 'monster', h))
  board.appendChild(zoneRow(vm, vm.human, 'spell', h))
  board.appendChild(statusRow(vm, vm.human, '自分'))
  root.appendChild(board)

  root.appendChild(handRow(vm, h))

  const bar = el('div', 'bar')
  const turnLabel = vm.state.turnPlayer === vm.human ? '自分のターン' : '相手のターン'
  bar.appendChild(el('span', 'bar__phase',
    `T${vm.state.turn} ${turnLabel} / ${PHASE_LABEL[vm.state.phase] ?? vm.state.phase}`))
  root.appendChild(bar)

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
