/**
 * 対戦以外の画面（SPEC 8.3 / 8.4 / 8.5）。
 *
 * ホーム / カード一覧 / 対戦相手を選ぶ / デッキ / デッキ編集。
 * **ルールは持たない。** デッキの検査は core の `validateDeck` をそのまま呼ぶ。
 * 同じ規則を画面側に書き直すと必ずずれる（SPEC 8.5）。
 */
import { validateDeck } from '../core/actions.ts'
import { DECK_SIZE, MAX_SAME_NAME } from '../core/types.ts'
import type { Attribute, CardDef, CardId, Deck, MonsterDef, Rarity } from '../core/types.ts'
import { ALL_CARDS, findCard } from '../data/cards.ts'
import { DECKS } from '../data/decks.ts'
import { MONSTERS } from '../data/monsters.ts'
import { buildDeck, leadersByAttribute } from '../data/autodeck.ts'
import { cardNode } from './view.ts'
import { attachLongPress, openDetail } from './detail.ts'
import type { CustomDeck, SaveData } from './storage.ts'

const ATTRIBUTES: readonly Attribute[] = [
  'fire', 'forest', 'wind', 'earth', 'thunder', 'water', 'light', 'dark', 'colorless',
]
const ATTRIBUTE_LABEL: Readonly<Record<Attribute, string>> = {
  fire: 'ほのお', forest: 'もり', wind: 'かぜ', earth: 'つち', thunder: 'いかずち',
  water: 'みず', light: 'ひかり', dark: 'やみ', colorless: 'むぞく',
}
const RARITIES: readonly Rarity[] = ['ultra', 'superRare', 'rare', 'common']
const RARITY_LABEL: Readonly<Record<Rarity, string>> = {
  ultra: 'UR', superRare: 'SR', rare: 'R', common: 'C',
}
const KINDS = ['monster', 'spell', 'trap'] as const
const KIND_LABEL: Readonly<Record<string, string>> = {
  monster: '姫神', spell: '魔法', trap: '罠',
}

export interface ScreenDeps {
  readonly root: HTMLElement
  readonly save: SaveData
  readonly setSave: (next: SaveData) => void
  /** 対戦を始める。自分のデッキと相手の主 */
  readonly startDuel: (mine: Deck, leaderId: CardId) => void
  readonly showTitle: () => void
}

function el(tag: string, className?: string, text?: string): HTMLElement {
  const node = document.createElement(tag)
  if (className !== undefined) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

function button(label: string, onTap: () => void, className = 'button'): HTMLElement {
  const b = el('button', className, label)
  b.addEventListener('click', onTap)
  return b
}

/** どの画面にも同じ形で出す上端の帯。戻るボタンと見出し */
function header(title: string, onBack: () => void, note?: string): HTMLElement {
  const bar = el('div', 'topbar')
  bar.appendChild(button('←', onBack, 'topbar__back'))
  const box = el('div', 'topbar__titles')
  box.appendChild(el('h1', 'topbar__title', title))
  if (note !== undefined) box.appendChild(el('p', 'topbar__note', note))
  bar.appendChild(box)
  return bar
}

/** 強い順。autodeck と同じ並び（レベル → 攻撃力 → ID） */
const RARITY_ORDER: Readonly<Record<Rarity, number>> = {
  ultra: 3, superRare: 2, rare: 1, common: 0,
}

function sortForList(a: CardDef, b: CardDef): number {
  const la = a.kind === 'monster' ? a.level : 0
  const lb = b.kind === 'monster' ? b.level : 0
  if (la !== lb) return lb - la
  const ra = RARITY_ORDER[a.rarity], rb = RARITY_ORDER[b.rarity]
  if (ra !== rb) return rb - ra
  const aa = a.kind === 'monster' ? a.atk : 0
  const ab = b.kind === 'monster' ? b.atk : 0
  if (aa !== ab) return ab - aa
  return a.id < b.id ? -1 : 1
}

// ---------------------------------------------------------------- ホーム

export function showHome(d: ScreenDeps): void {
  d.root.textContent = ''
  const wrap = el('div', 'home')
  wrap.appendChild(el('h1', 'home__name', '姫神戦記'))
  wrap.appendChild(el('p', 'home__sub', 'きしんせんき'))
  const r = d.save.record
  wrap.appendChild(el('p', 'home__record', `${r.wins}勝 ${r.losses}敗 ${r.draws}分`))

  const menu = el('div', 'home__menu')
  menu.appendChild(button('デュエル', () => showOpponentSelect(d), 'menu menu--primary'))
  menu.appendChild(button('カード一覧', () => showCardList(d, () => showHome(d)), 'menu'))
  menu.appendChild(button('デッキ', () => showDeckList(d), 'menu'))
  wrap.appendChild(menu)

  wrap.appendChild(button(d.save.muted ? '音を出す' : '音を消す', () => {
    d.setSave({ ...d.save, muted: !d.save.muted })
    showHome(d)
  }, 'button button--quiet'))
  d.root.appendChild(wrap)
}

// ---------------------------------------------------------------- カード一覧（SPEC 8.3）

interface ListFilter {
  kind: string | null
  attribute: Attribute | null
  rarity: Rarity | null
  /** 姫神のレベル。魔法・罠はレベルを持たないので、指定すると姫神だけが残る */
  level: number | null
  /** 効果を持つ姫神だけに絞る（SPEC 19.6）。null なら絞らない */
  hasEffect: boolean
}

/** 実在するレベル。**データから作る**ので、姫神を足しても手で直す必要がない */
const LEVELS: readonly number[] = [...new Set(MONSTERS.map((m) => m.level))].sort((a, b) => a - b)

/**
 * カード一覧。
 *
 * `onPick` を渡すとデッキ編集からの「選ぶ」用になり、渡さなければ詳細を開くだけになる。
 * **「所持/未所持」は作らない。** このゲームにカードを集める仕組みは無い（SPEC 8.3）。
 */
export function showCardList(
  d: ScreenDeps,
  onBack: () => void,
  onPick?: (id: CardId) => void,
  countOf?: (id: CardId) => number,
): void {
  const filter: ListFilter = { kind: null, attribute: null, rarity: null, level: null, hasEffect: false }

  const draw = (): void => {
    d.root.textContent = ''
    const shown = ALL_CARDS.filter((c) => {
      if (filter.kind !== null && c.kind !== filter.kind) return false
      if (filter.attribute !== null && (c.kind !== 'monster' || c.attribute !== filter.attribute)) return false
      if (filter.rarity !== null && c.rarity !== filter.rarity) return false
      if (filter.level !== null && (c.kind !== 'monster' || c.level !== filter.level)) return false
      if (filter.hasEffect && (c.kind !== 'monster'
        || (c.onSummon === undefined && c.onDestroyed === undefined))) return false
      return true
    }).slice().sort(sortForList)

    const page = el('div', 'page')
    page.appendChild(header(
      onPick === undefined ? 'カード一覧' : 'カードを選ぶ',
      onBack,
      `${ALL_CARDS.length}枚中 ${shown.length}枚`,
    ))

    const chips = el('div', 'chips')
    const row = (label: string, options: readonly { v: string | null; t: string }[],
      current: string | null, set: (v: string | null) => void): void => {
      const line = el('div', 'chips__row')
      line.appendChild(el('span', 'chips__label', label))
      for (const o of options) {
        const b = button(o.t, () => { set(o.v); draw() }, 'chip')
        if (current === o.v) b.classList.add('chip--on')
        line.appendChild(b)
      }
      chips.appendChild(line)
    }
    row('種類', [{ v: null, t: 'すべて' }, ...KINDS.map((k) => ({ v: k, t: KIND_LABEL[k] ?? k }))],
      filter.kind, (v) => { filter.kind = v })
    row('属性', [{ v: null, t: 'すべて' }, ...ATTRIBUTES.map((a) => ({ v: a, t: ATTRIBUTE_LABEL[a] }))],
      filter.attribute, (v) => { filter.attribute = v as Attribute | null })
    row('レア', [{ v: null, t: 'すべて' }, ...RARITIES.map((r) => ({ v: r, t: RARITY_LABEL[r] }))],
      filter.rarity, (v) => { filter.rarity = v as Rarity | null })
    // レベルは姫神しか持たない。選ぶと魔法・罠は自動的に消える
    row('レベル', [{ v: null, t: 'すべて' }, ...LEVELS.map((n) => ({ v: String(n), t: `★${n}` }))],
      filter.level === null ? null : String(filter.level),
      (v) => { filter.level = v === null ? null : Number(v) })
    // 効果持ち（SPEC 19.6）。姫神しか効果を持たないので、選ぶと魔法・罠は消える
    row('効果', [{ v: null, t: 'すべて' }, { v: 'yes', t: '効果持ち' }],
      filter.hasEffect ? 'yes' : null, (v) => { filter.hasEffect = v === 'yes' })
    page.appendChild(chips)

    const grid = el('div', 'grid')
    if (shown.length === 0) grid.appendChild(el('p', 'muted', 'この条件のカードはありません'))
    for (const c of shown) {
      const cell = el('button', 'grid__cell')
      cell.appendChild(cardNode(c.id))
      const n = countOf?.(c.id) ?? 0
      if (n > 0) cell.appendChild(el('span', 'grid__count', `×${n}`))
      // 長押しで詳細（SPEC 8.6）。**選ぶ用のときに効く。**
      // 1回押しは「選ぶ」に取られているので、長押しが唯一の見る手段になる。
      // attachLongPress は詳細を出したあとの click を自分で止めるので、
      // 長押しで札がデッキに入ってしまうことはない
      attachLongPress(cell, () => c.id)
      cell.addEventListener('click', () => {
        if (onPick !== undefined) { onPick(c.id); draw() } else openDetail(c.id)
      })
      grid.appendChild(cell)
    }
    page.appendChild(grid)
    d.root.appendChild(page)
  }
  draw()
}

// ---------------------------------------------------------------- 対戦相手（SPEC 8.4）

export function showOpponentSelect(d: ScreenDeps): void {
  const last = d.save.opponentId === null ? null : findCard(d.save.opponentId)
  let attribute: Attribute = last?.kind === 'monster' ? last.attribute : 'fire'

  const draw = (): void => {
    d.root.textContent = ''
    const page = el('div', 'page')
    page.appendChild(header('対戦相手を選ぶ', () => showHome(d), `姫神 ${MONSTERS.length}体から選べます`))

    const tabs = el('div', 'chips')
    const line = el('div', 'chips__row')
    for (const a of ATTRIBUTES) {
      const b = button(ATTRIBUTE_LABEL[a], () => { attribute = a; draw() }, 'chip')
      if (attribute === a) b.classList.add('chip--on')
      line.appendChild(b)
    }
    tabs.appendChild(line)
    page.appendChild(tabs)

    const pick = (id: CardId): void => {
      d.setSave({ ...d.save, opponentId: id })
      showDeckPick(d, id)
    }
    const any = button('おまかせで選ぶ', () => {
      // ここだけ乱数を使う。core には持ち込まない（SPEC 8.4）
      const m = MONSTERS[Math.floor(Math.random() * MONSTERS.length)]
      if (m !== undefined) pick(m.id)
    }, 'button button--wide')
    page.appendChild(any)

    page.appendChild(el('p', 'note',
      '相手のデッキは、選んだ主の属性からその場で組み立てます。'
      + '魔法・罠はプール共通なので、主が違ってもこの9枚はほぼ同じです。'))

    const grid = el('div', 'grid')
    for (const m of leadersByAttribute(attribute)) {
      const cell = el('button', 'grid__cell')
      cell.appendChild(cardNode(m.id))
      cell.appendChild(el('span', 'grid__caption', `★${m.level} 攻${m.atk}`))
      cell.addEventListener('click', () => pick(m.id))
      grid.appendChild(cell)
    }
    page.appendChild(grid)
    d.root.appendChild(page)
  }
  draw()
}

/** 自分のデッキを選ぶ。プリセット＋自作のうち20枚ちょうどのもの */
function showDeckPick(d: ScreenDeps, leaderId: CardId): void {
  d.root.textContent = ''
  const foe = findCard(leaderId)
  const page = el('div', 'page')
  page.appendChild(header('デッキを選ぶ', () => showOpponentSelect(d),
    `相手は ${foe?.name ?? leaderId}`))

  const usable: readonly Deck[] = [
    ...DECKS,
    ...d.save.customDecks
      .map((c): Deck => ({ name: c.name, cards: c.cards }))
      .filter((deck) => validateDeck(deck, DECK_SIZE, MAX_SAME_NAME, nameOf) === null),
  ]

  const list = el('div', 'decklist')
  for (const deck of usable) {
    const b = el('button', 'deckbtn')
    b.appendChild(el('span', 'deckbtn__name', deck.name))
    const preview = el('div', 'deckbtn__preview')
    for (const id of deck.cards.slice(0, 4)) preview.appendChild(cardNode(id, { small: true }))
    b.appendChild(preview)
    b.addEventListener('click', () => {
      d.setSave({ ...d.save, deckName: deck.name })
      d.startDuel(deck, leaderId)
    })
    list.appendChild(b)
  }
  page.appendChild(list)

  const unusable = d.save.customDecks.filter(
    (c) => validateDeck({ name: c.name, cards: c.cards }, DECK_SIZE, MAX_SAME_NAME, nameOf) !== null)
  if (unusable.length > 0) {
    page.appendChild(el('p', 'note',
      `${unusable.length}個の自作デッキは、まだ ${DECK_SIZE}枚そろっていないので出せません`))
  }
  d.root.appendChild(page)
}

// ---------------------------------------------------------------- デッキ（SPEC 8.5）

const nameOf = (id: CardId): string | null => findCard(id)?.name ?? null

export function showDeckList(d: ScreenDeps): void {
  d.root.textContent = ''
  const page = el('div', 'page')
  page.appendChild(header('デッキ', () => showHome(d),
    `自作 ${d.save.customDecks.length}個 / プリセット ${DECKS.length}個`))

  page.appendChild(button('新しく組む', () => {
    showDeckEdit(d, { name: `デッキ${d.save.customDecks.length + 1}`, cards: [] }, null)
  }, 'button button--wide'))

  const section = (title: string, node: HTMLElement): void => {
    page.appendChild(el('h2', 'section', title))
    page.appendChild(node)
  }

  const mine = el('div', 'decklist')
  if (d.save.customDecks.length === 0) mine.appendChild(el('p', 'muted', 'まだありません'))
  d.save.customDecks.forEach((deck, index) => {
    const err = validateDeck({ name: deck.name, cards: deck.cards }, DECK_SIZE, MAX_SAME_NAME, nameOf)
    const b = el('div', 'deckbtn deckbtn--row')
    const open = button(`${deck.name}（${deck.cards.length}枚）`,
      () => showDeckEdit(d, deck, index), 'deckbtn__open')
    if (err !== null) open.appendChild(el('span', 'deckbtn__warn', err))
    b.appendChild(open)
    b.appendChild(button('複製', () => {
      const copy: CustomDeck = { name: `${deck.name}の写し`, cards: deck.cards }
      d.setSave({ ...d.save, customDecks: [...d.save.customDecks, copy] })
      showDeckList(d)
    }, 'button button--small'))
    b.appendChild(button('消す', () => {
      d.setSave({
        ...d.save,
        customDecks: d.save.customDecks.filter((_, i) => i !== index),
      })
      showDeckList(d)
    }, 'button button--small button--danger'))
    mine.appendChild(b)
  })
  section('自作デッキ', mine)

  const preset = el('div', 'decklist')
  for (const deck of DECKS) {
    const b = el('div', 'deckbtn deckbtn--row')
    b.appendChild(el('span', 'deckbtn__open', `${deck.name}（${deck.cards.length}枚）`))
    b.appendChild(button('複製して直す', () => {
      const copy: CustomDeck = { name: `${deck.name}の写し`, cards: [...deck.cards] }
      d.setSave({ ...d.save, customDecks: [...d.save.customDecks, copy] })
      // 追加した直後なので、写しの位置は**新しい長さの1つ手前**である。
      // `length` を渡すと範囲外を指し、以降の編集が黙って捨てられる
      showDeckEdit(d, copy, d.save.customDecks.length - 1)
    }, 'button button--small'))
    preset.appendChild(b)
  }
  section('プリセット（直接は編集できません）', preset)

  d.root.appendChild(page)
}

/**
 * デッキ編集。`index` が null なら新規、数値ならその自作デッキを上書きする。
 *
 * **20枚に満たなくても保存できる**（SPEC 8.5）。対戦に出せないだけである。
 */
export function showDeckEdit(d: ScreenDeps, initial: CustomDeck, index: number | null): void {
  let cards: CardId[] = [...initial.cards]
  let name = initial.name

  const countOf = (id: CardId): number => cards.filter((c) => c === id).length

  /**
   * 保存先の位置。**新規のときは、最初の保存で確定させて以降は上書きにする。**
   * null のままにすると、カードを1枚足すたびに `persist()` が走って
   * **新しいデッキが増え続ける**（2026-10-02 の実機報告。15個できていた）。
   */
  let at: number | null = index

  const persist = (): void => {
    const deck: CustomDeck = { name, cards }
    if (at === null) {
      at = d.save.customDecks.length
      d.setSave({ ...d.save, customDecks: [...d.save.customDecks, deck] })
      return
    }
    d.setSave({
      ...d.save,
      customDecks: d.save.customDecks.map((c, i) => (i === at ? deck : c)),
    })
  }

  const draw = (): void => {
    d.root.textContent = ''
    const page = el('div', 'page')
    const err = validateDeck({ name, cards }, DECK_SIZE, MAX_SAME_NAME, nameOf)
    page.appendChild(header('デッキ編集', () => { persist(); showDeckList(d) },
      `${cards.length} / ${DECK_SIZE}枚`))

    const nameInput = document.createElement('input')
    nameInput.className = 'input'
    nameInput.value = name
    nameInput.setAttribute('aria-label', 'デッキ名')
    nameInput.addEventListener('input', () => { name = nameInput.value })
    page.appendChild(nameInput)

    // 内訳と警告（SPEC 8.5）。検証を落とす条件ではない
    const kinds = cards.map((id) => findCard(id)?.kind)
    const n = (k: string): number => kinds.filter((x) => x === k).length
    page.appendChild(el('p', 'note', `姫神 ${n('monster')} / 魔法 ${n('spell')} / 罠 ${n('trap')}`))

    const held = new Set(cards)
    const dead = cards
      .map((id) => findCard(id))
      .filter((c): c is CardDef & { kind: 'spell' } => c?.kind === 'spell')
      .filter((s) => s.requires !== undefined && !held.has(s.requires))
    if (dead.length > 0) {
      const names = [...new Set(dead.map((s) => s.name))].join('・')
      page.appendChild(el('p', 'warn', `発動条件の姫神が入っていない絶技があります: ${names}`))
    }
    page.appendChild(el('p', err === null ? 'ok' : 'warn', err ?? `${DECK_SIZE}枚そろっています`))

    // `.row` は対戦盤のゾーン列が使っている名前なので避ける（style.css の .actions を参照）
    const bar = el('div', 'actions')
    bar.appendChild(button('カードを足す', () => {
      persist()
      showCardList(d, () => draw(), (id) => {
        if (cards.length >= DECK_SIZE) return
        if (countOf(id) >= MAX_SAME_NAME) return
        cards = [...cards, id]
        persist()
      }, countOf)
    }, 'button'))
    bar.appendChild(button('保存して戻る', () => { persist(); showDeckList(d) }, 'button button--primary'))
    page.appendChild(bar)

    const grid = el('div', 'grid')
    if (cards.length === 0) grid.appendChild(el('p', 'muted', 'まだ1枚も入っていません'))
    const seen = new Map<CardId, number>()
    for (const id of cards) seen.set(id, (seen.get(id) ?? 0) + 1)
    for (const [id, count] of [...seen.entries()].sort((a, b) => {
      const ca = findCard(a[0]), cb = findCard(b[0])
      return ca && cb ? sortForList(ca, cb) : 0
    })) {
      const cell = el('button', 'grid__cell')
      cell.appendChild(cardNode(id))
      cell.appendChild(el('span', 'grid__count', `×${count}`))
      cell.appendChild(el('span', 'grid__caption', 'タップで1枚戻す／長押しで詳細'))
      // ここも1回押しは「戻す」に取られているので、長押しが見る手段になる
      attachLongPress(cell, () => id)
      cell.addEventListener('click', () => {
        const at = cards.lastIndexOf(id)
        if (at >= 0) cards = [...cards.slice(0, at), ...cards.slice(at + 1)]
        persist()
        draw()
      })
      grid.appendChild(cell)
    }
    page.appendChild(grid)
    d.root.appendChild(page)
  }
  draw()
}

/** 相手のデッキを組む。組めなければ null（呼ぶ側で扱う） */
export function opponentDeck(leaderId: CardId): Deck | null {
  return buildDeck(leaderId)
}

export type { MonsterDef }
