/**
 * 画面遷移と入力（SPEC 9章）。
 * ルールの判定はすべて core に委ね、ここは「見せる」「受け取る」だけを担当する。
 */
import type { Action } from '../core/actions.ts'
import { EMPTY_STATE, isOver, legalActions, reduce, validateDeck } from '../core/reduce.ts'
import type { Rng } from '../core/rng.ts'
import { createRng } from '../core/rng.ts'
import type { Deck, EnergyType, GameState, PlayerId } from '../core/types.ts'
import { DECK_SIZE, MAX_SAME_NAME } from '../core/types.ts'
import { CARDS, requireCard, requireCreature } from '../data/cards.ts'
import { DECKS } from '../data/decks.ts'
// 方策はシミュレータと共有する。CPU の打ち筋とバランス測定を一致させるため
import { greedyPolicy } from '../../tools/ai.ts'
import {
  CPU,
  HUMAN,
  cardDetailPanel,
  describeAttack,
  energyLabel,
  kindLabel,
  rarityCode,
  el,
  formatCost,
  renderBattle,
  renderChoices,
  renderFinish,
} from './view.ts'
import type { CustomDeck } from './storage.ts'
import { load, recordResult, save } from './storage.ts'
import { artUrl } from './art.ts'
import { applyCardTheme } from './theme.ts'
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

/**
 * タイトル画面（SPEC 9.8）。
 *
 * 背景にカードを漂わせる。**絵は既にあるものを使い回す**ので、
 * 素材を足さずに「カードゲームの入口」に見せられる。
 */
const TITLE_CARDS = [
  'f002', 'w002', 'l001', 'e008', 'k006', 'd001',
  's001', 't003', 'i008', 'a002', 'n003', 'l004',
] as const

function showTitle(): void {
  clearTimer()
  root.replaceChildren()
  const screen = el('div', 'title-screen')

  // 漂うカード。位置と速さを散らして、同じ動きが並ばないようにする
  const drift = el('div', 'drift')
  TITLE_CARDS.forEach((id, i) => {
    const url = artUrl(id)
    if (url === null) return
    const card = el('div', 'drift__card')
    card.style.backgroundImage = `url(${JSON.stringify(url)})`
    card.style.setProperty('--x', `${[6, 74, 22, 86, 40, 62, 12, 90, 30, 56, 4, 78][i] ?? 50}%`)
    card.style.setProperty('--y', `${[8, 12, 30, 34, 4, 22, 62, 58, 84, 76, 44, 90][i] ?? 50}%`)
    card.style.setProperty('--s', String(0.55 + ((i * 7) % 5) * 0.14))
    card.style.setProperty('--r', `${-14 + ((i * 5) % 7) * 4}deg`)
    card.style.setProperty('--d', `${(i % 6) * 1.3}s`)
    card.style.setProperty('--t', `${9 + (i % 4) * 2.5}s`)
    drift.append(card)
  })
  screen.append(drift)

  const logo = el('div', 'logo')
  logo.append(el('div', 'logo__main', '姫神演義'))
  logo.append(el('div', 'logo__sub', 'HIMEGAMI ENGI'))
  screen.append(logo)

  const start = el('button', 'title-screen__start', 'タップでスタート')
  start.type = 'button'
  start.addEventListener('click', showHome)
  screen.append(start)

  const saved = load()
  const foot = el('div', 'title-screen__foot')
  foot.append(el('span', undefined, `${saved.record.wins}勝 ${saved.record.losses}敗 ${saved.record.draws}分`))
  foot.append(el('span', undefined, `カード${CARDS.length}種`))
  screen.append(foot)

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

// ---------------------------------------------------------------- タブ

type Tab = 'home' | 'gallery' | 'decks' | 'battle'

/**
 * 下部のタブ（SPEC 9.8）。参考にした画面と同じく、常に同じ位置に置く。
 * **中身のあるものだけ並べる。** パックやミッションは機能自体が無いので出さない
 */
const TABS: readonly { readonly id: Tab; readonly label: string; readonly mark: string }[] = [
  { id: 'home', label: 'ホーム', mark: '社' },
  { id: 'gallery', label: '図鑑', mark: '巻' },
  { id: 'decks', label: 'デッキ', mark: '組' },
  { id: 'battle', label: '対戦', mark: '闘' },
]

function tabBar(current: Tab): HTMLElement {
  const bar = el('nav', 'tabbar')
  for (const tab of TABS) {
    const btn = el('button', `tabbar__item${tab.id === current ? ' is-on' : ''}`)
    btn.type = 'button'
    btn.append(el('span', 'tabbar__mark', tab.mark))
    btn.append(el('span', 'tabbar__label', tab.label))
    btn.addEventListener('click', () => {
      if (tab.id === 'home') showHome()
      else if (tab.id === 'gallery') showGallery()
      else if (tab.id === 'decks') showDeckList()
      else showBattleSelect()
    })
    bar.append(btn)
  }
  return bar
}

/** タブのある画面の外枠。中身と下部タブを縦に積む */
function shell(current: Tab, title: string, body: HTMLElement): void {
  clearTimer()
  root.replaceChildren()
  const page = el('div', 'page')
  page.append(el('div', 'page__head', title))
  const scroll = el('div', 'page__body')
  scroll.append(body)
  page.append(scroll)
  page.append(tabBar(current))
  root.append(page)
}

// ---------------------------------------------------------------- ホーム

function showHome(): void {
  const saved = load()
  const body = el('div', 'home')

  const record = el('div', 'panel')
  record.append(el('div', 'panel__title', '通算成績'))
  const row = el('div', 'record')
  for (const [label, value] of [['勝', saved.record.wins], ['敗', saved.record.losses], ['分', saved.record.draws]] as const) {
    const cell = el('div', 'record__cell')
    cell.append(el('span', 'record__num', String(value)))
    cell.append(el('span', 'record__label', label))
    row.append(cell)
  }
  record.append(row)
  if (saved.deckName !== null) record.append(el('div', 'muted', `前回のデッキ: ${saved.deckName}`))
  body.append(record)

  const go = el('button', 'btn home__go', '対戦する')
  go.type = 'button'
  go.addEventListener('click', showBattleSelect)
  body.append(go)

  const how = el('button', 'btn btn--ghost', '遊びかた')
  how.type = 'button'
  how.addEventListener('click', showHowTo)
  body.append(how)

  body.append(soundToggle(showHome))
  shell('home', '姫神演義', body)
}

// ---------------------------------------------------------------- カード図鑑

/** 図鑑の絞り込み。選んだ値は画面を出ると忘れる（保存するほどのものではない） */
let galleryFilter: 'all' | 'creature' | 'item' | 'action' | 'ultimate' = 'all'

function showGallery(): void {
  const body = el('div', 'gallery')

  const filters = el('div', 'chips')
  const kinds: readonly [typeof galleryFilter, string][] = [
    ['all', 'すべて'], ['creature', '姫神'], ['item', '神具'], ['action', '道標'], ['ultimate', '絶技'],
  ]
  for (const [id, label] of kinds) {
    const count = id === 'all' ? CARDS.length : CARDS.filter((c) => c.kind === id).length
    const chip = el('button', `chip${galleryFilter === id ? ' is-on' : ''}`)
    chip.type = 'button'
    chip.append(el('span', undefined, label))
    chip.append(el('span', 'chip__count', String(count)))
    chip.addEventListener('click', () => {
      galleryFilter = id
      showGallery()
    })
    filters.append(chip)
  }
  body.append(filters)

  const shown = galleryFilter === 'all' ? CARDS : CARDS.filter((c) => c.kind === galleryFilter)
  const grid = el('div', 'gallery__grid')
  for (const card of shown) {
    const cell = el('button', 'gallery__cell')
    cell.type = 'button'
    applyCardTheme(cell, card.origin, card.rarity, card.kind === 'creature' ? card.type : 'colorless')
    const face = el('span', 'gallery__face')
    const url = artUrl(card.id)
    if (url !== null) face.style.backgroundImage = `url(${JSON.stringify(url)})`
    else face.append(el('span', 'gallery__none', '絵なし'))
    face.append(el('span', 'gallery__name', card.name))
    cell.append(face)
    cell.append(el('span', 'gallery__rarity', rarityCode(card.rarity)))
    cell.addEventListener('click', () => showGalleryDetail(card.id))
    grid.append(cell)
  }
  body.append(grid)
  body.append(el('div', 'muted', `${shown.length}種を表示中（絵は ${shown.filter((c) => artUrl(c.id) !== null).length}種ぶん）`))
  shell('gallery', 'カード図鑑', body)
}

/** 図鑑からカード1枚を開く。対戦中の詳細と同じ体裁を使い回す */
function showGalleryDetail(cardId: string): void {
  const card = requireCard(cardId)
  root.replaceChildren()
  const back = el('div', 'modal')
  const panel = el('div', 'modal__panel')
  panel.append(cardDetailPanel(card, null))
  const close = el('button', 'btn btn--ghost', '図鑑へ戻る')
  close.type = 'button'
  close.addEventListener('click', showGallery)
  panel.append(close)
  back.append(panel)
  root.append(back)
}

// ---------------------------------------------------------------- 遊びかた

const HOW_TO: readonly { readonly title: string; readonly lines: readonly string[] }[] = [
  {
    title: '勝ちかた',
    lines: [
      '相手の姫神を気絶させてポイントを取り、先に3ポイント取れば勝ち。',
      '気絶させた姫神が EX なら2ポイント、それ以外は1ポイント。',
      'バトル場に出せる姫神がいなくなった側も負け。',
    ],
  },
  {
    title: 'はじまり',
    lines: [
      '先攻は5枚、後攻は6枚を引く。',
      '最初に伏せて置けるのは**コモンの姫神だけ**。バトル場に1体、ベンチに最大3体。',
      '先攻の1ターン目は攻撃できず、リリースもできない。',
    ],
  },
  {
    title: '1ターンにできること',
    lines: [
      'ターンの初めにエネルギーが1つ供給され、カードを1枚引く。',
      'エネルギーを付けられるのは1ターンに1回。道標も1ターンに1枚。',
      '神具は何枚でも使える。攻撃するとターンが終わる。',
    ],
  },
  {
    title: '強い姫神の出しかた',
    lines: [
      'コモンはそのままベンチに出せる。',
      'レアは**エネルギーが1つ以上**、SRは2つ以上、URは3つ以上付いた場の姫神を1体リリースして出す。',
      'エネルギーの種類は問わない。**リリース元のエネルギーはそのまま引き継ぐ**。',
      'リリース元がバトル場ならバトル場に、ベンチならその枠に出る。',
    ],
  },
  {
    title: 'コストの読みかた',
    lines: [
      '色の付いた丸はその属性のエネルギーが1つ要る。',
      '灰色の「全」は**どの属性のエネルギーでも1つ**で払える。',
      'カード右上の丸はその姫神の属性。コストの「全」とは別物。',
    ],
  },
  {
    title: '属性の相性',
    lines: [
      '炎→森→風→土→雷→水→炎 の順に、環の次のひとつに強い（+20）。',
      '光と闇は互いにだけ強い（+40）。',
      '無属性はどことも相性を持たない。突くことも突かれることもない。',
    ],
  },
]

function showHowTo(): void {
  const body = el('div', 'howto')
  for (const section of HOW_TO) {
    const box = el('div', 'panel')
    box.append(el('div', 'panel__title', section.title))
    for (const line of section.lines) {
      const p = el('p', 'howto__line')
      // ** で囲んだ部分だけ強調する。書きやすさのための最小限の記法
      for (const [i, part] of line.split('**').entries()) {
        p.append(i % 2 === 1 ? el('strong', undefined, part) : document.createTextNode(part))
      }
      box.append(p)
    }
    body.append(box)
  }
  const back = el('button', 'btn btn--ghost', '戻る')
  back.type = 'button'
  back.addEventListener('click', showHome)
  body.append(back)
  shell('home', '遊びかた', body)
}

// ---------------------------------------------------------------- デッキ編集

/**
 * 自作デッキ（SPEC 9.9）。
 *
 * **合法かどうかの判断は core の `validateDeck` に任せる。** 画面側で
 * 「20枚か」「同名2枚まで」を書き直すと、ルールが2箇所に分かれて必ずずれる。
 */
/** デッキに指定できるエネルギー。colorless は供給されないので選ばせない（SPEC 17.1） */
const ENERGY_CHOICES: readonly EnergyType[] = [
  'fire', 'forest', 'wind', 'earth', 'thunder', 'water', 'light', 'dark',
]

function toDeck(custom: CustomDeck): Deck {
  return { name: custom.name, cards: custom.cards, energy: custom.energy as EnergyType[] }
}

function saveDecks(decks: readonly CustomDeck[]): void {
  save({ ...load(), decks })
}

function showDeckList(): void {
  const body = el('div', 'decks')

  const make = el('button', 'btn', '新しいデッキを作る')
  make.type = 'button'
  make.addEventListener('click', () => {
    const id = `d${Date.now().toString(36)}`
    const fresh: CustomDeck = { id, name: '新しいデッキ', energy: ['fire'], cards: [] }
    saveDecks([...load().decks, fresh])
    showDeckEdit(id)
  })
  body.append(make)

  const mine = load().decks
  if (mine.length === 0) {
    body.append(el('div', 'muted', 'まだ自作デッキはありません。20枚ちょうどで組むと対戦で選べます。'))
  }
  for (const deck of mine) {
    const errors = validateDeck(toDeck(deck))
    const row = el('button', 'deck-row')
    row.type = 'button'
    const head = el('div', 'deck-row__head')
    head.append(el('span', 'deck-row__name', deck.name))
    head.append(el('span', `deck-row__state${errors.length === 0 ? ' is-ok' : ''}`,
      errors.length === 0 ? '対戦で使える' : `あと${errors.length}件`))
    row.append(head)
    row.append(el('div', 'muted', `${deck.cards.length}/${DECK_SIZE}枚 ・ ${deck.energy.map((e) => energyLabel(e)).join('')}`))
    row.addEventListener('click', () => showDeckEdit(deck.id))
    body.append(row)
  }

  body.append(el('div', 'muted', `※ 基準デッキ8種（${DECKS.map((d) => d.name).join(' / ')}）は編集できません。対戦画面ではそちらも選べます。`))
  shell('decks', 'デッキ', body)
}

/** 編集画面のどちら側を出しているか。画面を出ると忘れる */
let deckEditPane: 'in' | 'add' = 'in'

function showDeckEdit(id: string): void {
  const deck = load().decks.find((d) => d.id === id)
  if (deck === undefined) {
    showDeckList()
    return
  }
  const errors = validateDeck(toDeck(deck))
  const body = el('div', 'deck-edit')

  // 名前
  const name = el('input', 'field') as HTMLInputElement
  name.type = 'text'
  name.value = deck.name
  name.maxLength = 20
  name.addEventListener('change', () => {
    update(id, (d) => ({ ...d, name: name.value.trim() === '' ? '名前なし' : name.value.trim() }))
  })
  const nameBox = el('div', 'panel')
  nameBox.append(el('div', 'panel__title', 'デッキ名'))
  nameBox.append(name)
  body.append(nameBox)

  // エネルギータイプ（1〜3種）
  const energyBox = el('div', 'panel')
  energyBox.append(el('div', 'panel__title', `エネルギー（1〜3種・今 ${deck.energy.length}種）`))
  const chips = el('div', 'chips')
  for (const type of ENERGY_CHOICES) {
    const on = deck.energy.includes(type)
    const chip = el('button', `chip${on ? ' is-on' : ''}`, energyLabel(type))
    chip.type = 'button'
    chip.addEventListener('click', () => {
      update(id, (d) => {
        if (on) return { ...d, energy: d.energy.filter((e) => e !== type) }
        return d.energy.length >= 3 ? d : { ...d, energy: [...d.energy, type] }
      })
    })
    chips.append(chip)
  }
  energyBox.append(chips)
  body.append(energyBox)

  // 検証結果。core の validateDeck をそのまま出す
  const state = el('div', `panel${errors.length === 0 ? ' panel--ok' : ' panel--warn'}`)
  state.append(el('div', 'panel__title', `${deck.cards.length} / ${DECK_SIZE} 枚`))
  if (errors.length === 0) state.append(el('div', undefined, 'このデッキは対戦で使えます。'))
  else for (const e of errors) state.append(el('div', 'deck-edit__error', `・${e}`))
  body.append(state)

  // 中身 / 追加 の切り替え
  const panes = el('div', 'chips')
  for (const [pane, label] of [['in', '入っているカード'], ['add', 'カードを追加']] as const) {
    const chip = el('button', `chip${deckEditPane === pane ? ' is-on' : ''}`, label)
    chip.type = 'button'
    chip.addEventListener('click', () => { deckEditPane = pane; showDeckEdit(id) })
    panes.append(chip)
  }
  body.append(panes)

  if (deckEditPane === 'add' && deck.cards.length >= DECK_SIZE) {
    // 全部が沈んで見えるので、なぜ押せないのかを書く
    body.append(el('div', 'muted', `もう${DECK_SIZE}枚あります。入れ替えるには「入っているカード」から減らしてください。`))
  }
  body.append(deckEditPane === 'in' ? deckContents(deck) : deckPicker(deck))

  const del = el('button', 'btn btn--ghost', 'このデッキを削除')
  del.type = 'button'
  del.addEventListener('click', () => {
    saveDecks(load().decks.filter((d) => d.id !== id))
    showDeckList()
  })
  body.append(del)

  const back = el('button', 'btn btn--ghost', 'デッキ一覧へ')
  back.type = 'button'
  back.addEventListener('click', showDeckList)
  body.append(back)

  shell('decks', 'デッキを編集', body)

  function update(target: string, fn: (d: CustomDeck) => CustomDeck): void {
    saveDecks(load().decks.map((d) => (d.id === target ? fn(d) : d)))
    showDeckEdit(target)
  }
}

/** 入っているカードを種類ごとにまとめて出す。タップで1枚減らす */
function deckContents(deck: CustomDeck): HTMLElement {
  const box = el('div', 'deck-edit__list')
  if (deck.cards.length === 0) {
    box.append(el('div', 'muted', 'まだ1枚も入っていません。「カードを追加」から選んでください。'))
    return box
  }
  const counts = new Map<string, number>()
  for (const id of deck.cards) counts.set(id, (counts.get(id) ?? 0) + 1)
  for (const [cardId, n] of counts) {
    const card = requireCard(cardId)
    const row = el('button', 'deck-item')
    row.type = 'button'
    applyCardTheme(row, card.origin, card.rarity, card.kind === 'creature' ? card.type : 'colorless')
    const thumb = el('span', 'deck-item__thumb')
    const url = artUrl(card.id)
    if (url !== null) thumb.style.backgroundImage = `url(${JSON.stringify(url)})`
    row.append(thumb)
    const text = el('span', 'deck-item__text')
    text.append(el('span', 'deck-item__name', card.name))
    text.append(el('span', 'deck-item__sub', `${kindLabel(card.kind)} ・ ${rarityCode(card.rarity)}`))
    row.append(text)
    row.append(el('span', 'deck-item__count', `×${n}`))
    row.append(el('span', 'deck-item__minus', '−'))
    row.addEventListener('click', () => {
      const at = deck.cards.lastIndexOf(cardId)
      const cards = [...deck.cards.slice(0, at), ...deck.cards.slice(at + 1)]
      saveDecks(load().decks.map((d) => (d.id === deck.id ? { ...d, cards } : d)))
      showDeckEdit(deck.id)
    })
    box.append(row)
  }
  return box
}

/** 追加するカードを選ぶ。図鑑と同じ並びを使い、入っている枚数を重ねて出す */
function deckPicker(deck: CustomDeck): HTMLElement {
  const box = el('div', 'gallery__grid')
  const counts = new Map<string, number>()
  for (const id of deck.cards) counts.set(id, (counts.get(id) ?? 0) + 1)
  for (const card of CARDS) {
    // 同名2枚までは core の規則。ここでは押せる／押せないの見た目にだけ使う
    const sameName = deck.cards.filter((cid: string) => requireCard(cid).name === card.name).length
    const full = sameName >= MAX_SAME_NAME || deck.cards.length >= DECK_SIZE
    const cell = el('button', `gallery__cell${full ? ' is-full' : ''}`)
    cell.type = 'button'
    cell.disabled = full
    applyCardTheme(cell, card.origin, card.rarity, card.kind === 'creature' ? card.type : 'colorless')
    const face = el('span', 'gallery__face')
    const url = artUrl(card.id)
    if (url !== null) face.style.backgroundImage = `url(${JSON.stringify(url)})`
    face.append(el('span', 'gallery__name', card.name))
    cell.append(face)
    cell.append(el('span', 'gallery__rarity', rarityCode(card.rarity)))
    const have = counts.get(card.id) ?? 0
    if (have > 0) cell.append(el('span', 'gallery__have', `×${have}`))
    cell.addEventListener('click', () => {
      saveDecks(load().decks.map((d) => (d.id === deck.id ? { ...d, cards: [...d.cards, card.id] } : d)))
      showDeckEdit(deck.id)
    })
    box.append(cell)
  }
  return box
}

// ---------------------------------------------------------------- 対戦選択

function showBattleSelect(): void {
  const body = el('div', 'battle-select')

  const hero = el('div', 'hero')
  const art = artUrl('w002')
  if (art !== null) hero.style.backgroundImage = `url(${JSON.stringify(art)})`
  hero.append(el('div', 'hero__title', '対戦'))
  hero.append(el('div', 'hero__sub', '3ポイント先取'))
  body.append(hero)

  const solo = el('button', 'btn battle-select__main', 'ひとりで')
  solo.type = 'button'
  solo.addEventListener('click', showDeckSelect)
  body.append(solo)

  const how = el('button', 'btn btn--ghost', '遊びかた')
  how.type = 'button'
  how.addEventListener('click', showHowTo)
  body.append(how)

  body.append(el('div', 'muted', '対人戦は未実装です。今は CPU との対戦だけ遊べます。'))
  shell('battle', '対戦', body)
}

function showDeckSelect(): void {
  const body = el('div', 'decks')

  /*
   * 自作デッキを先に出す。**合法なものだけ**を並べる。
   * 20枚に足りないデッキを選べてしまうと、対戦の開始時に弾かれて
   * 何が悪いのか分からない。編集画面へ誘導するほうが早い（SPEC 9.9）
   */
  const mine = load().decks
  const usable = mine.filter((d) => validateDeck(toDeck(d)).length === 0)
  if (usable.length > 0) {
    body.append(el('div', 'panel__title', '自作デッキ'))
    for (const deck of usable) {
      const btn = el('button', 'btn deck-option')
      btn.type = 'button'
      btn.append(el('span', 'deck-option__name', deck.name))
      btn.append(el('span', 'muted', `${deck.cards.length}枚 / ${new Set(deck.cards).size}種 ・ ${deck.energy.map((e) => energyLabel(e)).join('')}`))
      btn.addEventListener('click', () => startBattle(toDeck(deck)))
      body.append(btn)
    }
  }
  const broken = mine.length - usable.length
  if (broken > 0) {
    const fix = el('button', 'btn btn--ghost', `未完成のデッキが${broken}件あります（編集する）`)
    fix.type = 'button'
    fix.addEventListener('click', showDeckList)
    body.append(fix)
  }

  body.append(el('div', 'panel__title', '基準デッキ'))
  for (const deck of DECKS) {
    const btn = el('button', 'btn deck-option')
    btn.type = 'button'
    btn.append(el('span', 'deck-option__name', deck.name))
    btn.append(el('span', 'muted', `${deck.cards.length}枚 / ${new Set(deck.cards).size}種`))
    btn.addEventListener('click', () => startBattle(deck))
    body.append(btn)
  }

  const back = el('button', 'btn btn--ghost', '戻る')
  back.type = 'button'
  back.addEventListener('click', showBattleSelect)
  body.append(back)
  shell('battle', 'デッキを選ぶ', body)
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
