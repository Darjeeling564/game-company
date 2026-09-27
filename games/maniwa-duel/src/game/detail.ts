/**
 * カードの詳細（SPEC 8.3 / 8.6）。
 *
 * カード一覧と対戦画面で**同じものを出す**。詳細の作り方を2か所に書くと必ずずれる。
 *
 * 対戦中は長押し、一覧は1回押しで開く。対戦中は「押す＝出す」が先にあるためで、
 * 一覧には他の意味が無いためである（SPEC 8.6）。
 */
import { findCard } from '../data/cards.ts'
import type { Attribute, CardDef, CardId, EffectTarget, OneShot } from '../core/types.ts'
import { ORIGIN_STYLE, RARITY_STYLE, applyCardTheme } from './theme.ts'
import { artUrl } from './art.ts'

const ATTRIBUTE_LABEL: Readonly<Record<Attribute, string>> = {
  fire: 'ほのお', forest: 'もり', wind: 'かぜ', earth: 'つち', thunder: 'いかずち',
  water: 'みず', light: 'ひかり', dark: 'やみ', colorless: 'むぞく',
}

const ORIGIN_LABEL: Readonly<Record<string, string>> = {
  japan: '日本', china: '中国', egypt: 'エジプト', greece: 'ギリシア', norse: '北欧',
  india: 'インド', mesopotamia: 'メソポタミア', cthulhu: 'クトゥルフ', original: 'オリジナル',
}

const SPELL_TYPE_LABEL: Readonly<Record<string, string>> = {
  normal: '通常魔法', continuous: '永続魔法', equip: '装備魔法',
  field: 'フィールド魔法', quick: '速攻魔法',
}

const TRAP_TYPE_LABEL: Readonly<Record<string, string>> = {
  normal: '通常罠', continuous: '永続罠', counter: 'カウンター罠',
}

const TARGET_LABEL: Readonly<Record<EffectTarget, string>> = {
  opponent: '相手',
  self: '自分',
  opponentMonsterAll: '相手の姫神すべて',
  opponentMonsterOne: '相手の姫神1体',
  ownMonsterAll: '自分の姫神すべて',
  ownMonsterOne: '自分の姫神1体',
  attacker: '攻撃してきた姫神',
}

/**
 * 効果を日本語にする。**効果はデータで表現してある**（CLAUDE.md 4章）ので、
 * ここは解釈するだけで、効果の中身を持たない。
 */
export function describeEffect(e: OneShot): string {
  switch (e.type) {
    case 'lifeDamage':
      return `${e.target === 'opponent' ? '相手' : '自分'}のライフに ${e.value} ダメージ`
    case 'lifeHeal':
      return `${e.target === 'opponent' ? '相手' : '自分'}のライフを ${e.value} 回復`
    case 'destroy':
      return `${TARGET_LABEL[e.target]} を破壊`
    case 'atkChange':
      return e.value >= 0
        ? `${TARGET_LABEL[e.target]} の攻撃力を ${e.value} 上げる（ターン終了まで）`
        : `${TARGET_LABEL[e.target]} の攻撃力を ${-e.value} 下げる（ターン終了まで）`
    case 'draw':
      return `カードを ${e.value} 枚引く`
    case 'discard':
      return `${e.target === 'opponent' ? '相手' : '自分'}の手札を ${e.value} 枚捨てる`
    case 'search':
      return `デッキから${e.kind === 'monster' ? '姫神' : e.kind === 'spell' ? '魔法' : '罠'}を1枚手札に加える`
    case 'negateAttack':
      return '攻撃を無効にする'
    case 'position':
      return `${TARGET_LABEL[e.target]} を${e.position === 'attack' ? '攻撃' : '守備'}表示にする`
    case 'revive':
      return '自分の墓地の姫神1体を特殊召喚する'
  }
}

function el(tag: string, className?: string, text?: string): HTMLElement {
  const node = document.createElement(tag)
  if (className !== undefined) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

/** 種類の見出し（姫神 / 通常魔法・神具 / 通常罠 など） */
export function kindLabel(def: CardDef): string {
  if (def.kind === 'monster') return '姫神（モンスター）'
  if (def.kind === 'spell') {
    const t = SPELL_TYPE_LABEL[def.spellType] ?? '魔法'
    return `${t}・${def.form === 'art' ? '絶技' : '神具'}`
  }
  return `${TRAP_TYPE_LABEL[def.trapType] ?? '罠'}・道標`
}

let openPanel: HTMLElement | null = null

/** 開いている詳細を閉じる。開いていなければ何もしない */
export function closeDetail(): void {
  openPanel?.remove()
  openPanel = null
}

/**
 * 詳細を出す。**すでに開いていれば置き換える。**
 *
 * 背景を含め、どこを押しても閉じる（SPEC 8.6）。
 */
export function openDetail(cardId: CardId): void {
  const def = findCard(cardId)
  if (def === null) return
  closeDetail()

  const back = el('div', 'detail')
  const panel = el('div', 'detail__panel')
  applyCardTheme(panel, def.origin, def.rarity, def.kind === 'monster' ? def.attribute : 'colorless')

  const art = el('div', 'detail__art')
  const url = artUrl(cardId, 'normal')
  if (url !== null) art.style.backgroundImage = `url(${url})`
  panel.appendChild(art)

  const head = el('div', 'detail__head')
  head.appendChild(el('h2', 'detail__name', def.name))
  if (def.ruby !== undefined) head.appendChild(el('p', 'detail__ruby', def.ruby))
  panel.appendChild(head)

  const tags = el('div', 'detail__tags')
  const rarity = RARITY_STYLE[def.rarity]
  const rarityTag = el('span', 'detail__tag', `${rarity.code} ${rarity.label}`)
  rarityTag.style.borderColor = rarity.frame
  tags.appendChild(rarityTag)
  tags.appendChild(el('span', 'detail__tag', kindLabel(def)))
  const originTag = el('span', 'detail__tag', ORIGIN_LABEL[def.origin] ?? def.origin)
  originTag.style.borderColor = ORIGIN_STYLE[def.origin].bg
  tags.appendChild(originTag)
  if (def.kind === 'monster') {
    tags.appendChild(el('span', 'detail__tag', ATTRIBUTE_LABEL[def.attribute]))
  }
  panel.appendChild(tags)

  if (def.kind === 'monster') {
    const stats = el('div', 'detail__stats')
    stats.appendChild(el('span', 'detail__stat', `★${def.level}`))
    stats.appendChild(el('span', 'detail__stat', `攻 ${def.atk}`))
    stats.appendChild(el('span', 'detail__stat', `守 ${def.def}`))
    const need = def.level >= 7 ? 2 : def.level >= 5 ? 1 : 0
    stats.appendChild(el('span', 'detail__stat', need === 0 ? '召喚にリリース不要' : `リリース${need}体`))
    panel.appendChild(stats)
  } else {
    const list = el('ul', 'detail__effects')
    for (const e of def.onActivate) list.appendChild(el('li', 'detail__effect', describeEffect(e)))
    if (def.onActivate.length === 0) list.appendChild(el('li', 'detail__effect', '（効果なし）'))
    panel.appendChild(list)
    if (def.kind === 'spell' && def.requires !== undefined) {
      const req = findCard(def.requires)
      panel.appendChild(el('p', 'detail__requires',
        `発動条件: 自分の場に「${req?.name ?? def.requires}」が表側で必要`))
    }
  }

  panel.appendChild(el('p', 'detail__flavor', def.flavor))

  back.appendChild(panel)
  back.addEventListener('click', closeDetail)
  document.body.appendChild(back)
  openPanel = back
}

/**
 * 長押しで詳細を出す（SPEC 8.6）。
 *
 * - 400ms 押し続けたら、**指を離す前に**出す
 * - **10px 動いたら出さない。** 盤の縦スクロールと区別するため
 * - 詳細を出したら、その指の `click` は通さない。誤って札を出さないようにする
 *
 * 戻り値は後始末の関数ではなく、`click` を無視すべきかを返す判定である。
 * 呼ぶ側は `shouldSwallowClick()` を見てから本来の処理を行う。
 */
export function attachLongPress(node: HTMLElement, cardId: () => CardId | null): void {
  let timer: number | null = null
  let start: { x: number; y: number } | null = null
  let fired = false

  const cancel = (): void => {
    if (timer !== null) window.clearTimeout(timer)
    timer = null
    start = null
  }

  node.addEventListener('pointerdown', (ev: PointerEvent) => {
    fired = false
    start = { x: ev.clientX, y: ev.clientY }
    timer = window.setTimeout(() => {
      const id = cardId()
      if (id !== null) {
        fired = true
        openDetail(id)
      }
      timer = null
    }, 400)
  })
  node.addEventListener('pointermove', (ev: PointerEvent) => {
    if (start === null) return
    if (Math.abs(ev.clientX - start.x) > 10 || Math.abs(ev.clientY - start.y) > 10) cancel()
  })
  node.addEventListener('pointerup', cancel)
  node.addEventListener('pointercancel', cancel)
  node.addEventListener('pointerleave', cancel)
  // 長押しで開いたときは、続けて飛んでくる click を止める
  node.addEventListener('click', (ev) => {
    if (!fired) return
    fired = false
    ev.stopPropagation()
    ev.preventDefault()
  }, true)
}
