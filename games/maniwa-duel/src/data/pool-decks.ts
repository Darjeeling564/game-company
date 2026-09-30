/**
 * プールデッキ（SPEC 13.5）。カードプール全体から20枚を抽選して組む。
 *
 * プリセットデッキ（`decks.ts`）は2つ固定なので、**そこに入っていないカードは
 * 永久に一度も戦わない**。待ち行列5で魔法・罠を44種・26種まで増やす予定なので、
 * 固定デッキだけで測っていると、足したカードの性能が永久に分からない。
 *
 * **抽選は一様。** 強い順に選ぶと、弱いカードは選ばれず、選ばれないから測れず、
 * 測れないから弱いと分からない循環に入り、死に札の検出ができなくなる。
 * （maniwa-tcg の `pool-decks.ts` と同じ考え方）
 *
 * **乱数は core の PRNG をシードから回す。** `Math.random()` は使わない。
 * この層は core ではないが、同じ実行を再現できるようにしておく（CLAUDE.md 3章）。
 *
 * **`autodeck.ts` とは別物である。** あちらは対戦相手を組むための決定論的な
 * 「強い順」で、こちらは計測のための一様抽選。混ぜない。
 */
import type { Rng } from '../core/rng.ts'
import { createRng, nextInt } from '../core/rng.ts'
import type { Attribute, CardId, Deck, SpellDef } from '../core/types.ts'
import { DECK_SIZE, MAX_SAME_NAME } from '../core/types.ts'
import { MONSTERS } from './monsters.ts'
import { SPELLS } from './spells.ts'
import { TRAPS } from './traps.ts'

/** プリセットデッキと同じ内訳（SPEC 3.1 / 8.4） */
const MONSTER_COUNT = 11
const SPELL_COUNT = 5
const TRAP_COUNT = 4

/**
 * 抽選する属性。**無属性も入れる。**
 *
 * 最初は「姫神が9体しかなく重複が増えて偏る」として外していたが、
 * そうすると **無属性の姫神9体（n001〜n009）が永久に一度も抽選されない**。
 * 未使用カードの検査が9枚ぶん盲目になるほうが、重複の偏りよりはるかに悪い
 * （2026-10-01 に実測して気付いた）。
 *
 * 9体から11枚を引くと2枚は同名の2枚目になるが、同名2枚までは規則の範囲内である
 * （SPEC 3.1）。ほのお10体・やみ10体でも1枚は2枚目になるので、特別扱いではない。
 */
export const POOL_ATTRIBUTES: readonly Attribute[] = [
  'fire', 'forest', 'wind', 'earth', 'thunder', 'water', 'light', 'dark', 'colorless',
]

const ATTRIBUTE_NAME: Readonly<Record<Attribute, string>> = {
  fire: 'ほのお', forest: 'もり', wind: 'かぜ', earth: 'つち', thunder: 'いかずち',
  water: 'みず', light: 'ひかり', dark: 'やみ', colorless: 'むぞく',
}

/**
 * `items` から `count` 個を**重複なく**抜く。引いた側の Rng を返す。
 *
 * shuffle して先頭を取る形にしないのは、プールが増えるほど無駄が増えるうえ、
 * 「何枚目までを使ったか」が抽選結果に影響して再現時に読みにくくなるためである。
 */
function sample<T>(rng: Rng, items: readonly T[], count: number): { rng: Rng; picked: readonly T[] } {
  const rest = [...items]
  const picked: T[] = []
  let cur = rng
  const take = Math.min(count, rest.length)
  for (let i = 0; i < take; i += 1) {
    const r = nextInt(cur, rest.length)
    cur = r.rng
    picked.push(rest[r.value] as T)
    rest.splice(r.value, 1)
  }
  return { rng: cur, picked }
}

/**
 * 1属性ぶんのデッキを組む。
 *
 * **姫神が11体に満たない属性では2枚目を入れる**（同名2枚まで・SPEC 3.1）。
 * どの属性も9〜11体いるので、足りないのは最大2枚である。
 *
 * **絶技は `requires` の姫神がこのデッキに居るものだけを候補にする。**
 * 居ない絶技を入れると一度も発動できず、「採用されたのに使われない」という
 * 意味のない行がカード別の表に並ぶ（SPEC 6.3）。
 */
function buildOne(rng: Rng, attribute: Attribute): { rng: Rng; deck: Deck } {
  let cur = rng
  const pool = MONSTERS.filter((m) => m.attribute === attribute)
  const first = sample(cur, pool, MONSTER_COUNT)
  cur = first.rng
  const monsters: CardId[] = first.picked.map((m) => m.id)
  // 足りないぶんは、すでに入っている中から2枚目を引く
  while (monsters.length < MONSTER_COUNT) {
    const r = nextInt(cur, first.picked.length)
    cur = r.rng
    const id = (first.picked[r.value] as { id: CardId }).id
    if (monsters.filter((x) => x === id).length < MAX_SAME_NAME) monsters.push(id)
  }

  const held = new Set(monsters)
  const usableSpells = SPELLS.filter((s: SpellDef) => s.requires === undefined || held.has(s.requires))
  const sp = sample(cur, usableSpells, SPELL_COUNT)
  cur = sp.rng
  const tr = sample(cur, TRAPS, TRAP_COUNT)
  cur = tr.rng

  const cards = [...monsters, ...sp.picked.map((s) => s.id), ...tr.picked.map((t) => t.id)]
  return { rng: cur, deck: { name: ATTRIBUTE_NAME[attribute], cards } }
}

/**
 * 8属性ぶんのプールデッキを1組つくる。
 *
 * **20枚に満たないデッキは返さない。** 魔法や罠のプールが内訳に足りないときに
 * 黙って19枚のデッキを返すと、`validateDeck` で全試合が開始できず、
 * sim は落ちずに「引き分け」として数えてしまう。
 */
export function buildPoolDecks(seed: number): readonly Deck[] {
  let rng = createRng(seed >>> 0)
  const out: Deck[] = []
  for (const attribute of POOL_ATTRIBUTES) {
    const r = buildOne(rng, attribute)
    rng = r.rng
    if (r.deck.cards.length === DECK_SIZE) out.push(r.deck)
  }
  return out
}
