/**
 * 主の姫神から対戦相手のデッキを組み立てる（SPEC 8.4）。
 *
 * **純粋関数。乱数を使わない。** 同じ主なら毎回まったく同じデッキになる。
 * ここを決定論にしておくと、生成したデッキを tests から全87体ぶん検査できる。
 *
 * **core には置かない。** デッキの組み方はルールではなくデータの都合であり、
 * `reduce` の外で決まるためである（SPEC 8.4）。
 *
 * **いまのカードプールでは、主が違ってもデッキは似る。** 魔法は16種・罠は8種しか
 * 載っていないので、姫神11枚は属性で完全に変わるが、魔法・罠9枚はどの主でも
 * ほぼ同じになる。これは現状の正直な姿で、画面にもそう出す（SPEC 8.4）。
 */
import { DECK_SIZE } from '../core/types.ts'
import type { Attribute, CardId, Deck, MonsterDef, Rarity, SpellDef, TrapDef } from '../core/types.ts'
import { MONSTERS } from './monsters.ts'
import { SPELLS } from './spells.ts'
import { TRAPS } from './traps.ts'

/** 内訳（SPEC 8.4）。合計が DECK_SIZE と一致することを下で検査する */
export const MONSTER_SLOTS = 11
export const SPELL_SLOTS = 5
export const TRAP_SLOTS = 4
export const MAX_ARTS = 3

/**
 * レアリティの強さ。**Record<Rarity, number> で書く。**
 * `Record<string, number>` にしていたとき `superRare` を `super` と書き誤り、
 * SR がコモン扱いで並んでいた（2026-09-28）。鍵を型で縛れば同じ誤りは通らない。
 */
const RARITY_ORDER: Readonly<Record<Rarity, number>> = {
  ultra: 3, superRare: 2, rare: 1, common: 0,
}

/** 強い順。レベル → 攻撃力 → ID の順に見て、**同点でも順序が決まる**ようにする */
function byPower(a: MonsterDef, b: MonsterDef): number {
  return b.level - a.level || b.atk - a.atk || (a.id < b.id ? -1 : 1)
}

function byRarity(a: SpellDef | TrapDef, b: SpellDef | TrapDef): number {
  const r = RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity]
  return r !== 0 ? r : a.id < b.id ? -1 : 1
}

/**
 * 姫神11枚を選ぶ。
 *
 * 主を必ず先頭に置き、同属性を強い順に足す。属性の姫神が11体に満たないときは、
 * **強いほうから2枚目を入れる**（同名2枚まで・SPEC 3.1）。
 * それでも足りなければ無属性から補う。
 */
function pickMonsters(leader: MonsterDef): CardId[] {
  const same = MONSTERS.filter((m) => m.attribute === leader.attribute && m.id !== leader.id).sort(byPower)
  const out: CardId[] = [leader.id, ...same.map((m) => m.id)].slice(0, MONSTER_SLOTS)

  // 2枚目を強い順に足す（主を含む）
  const pool = [leader, ...same].sort(byPower)
  for (let i = 0; out.length < MONSTER_SLOTS && i < pool.length; i += 1) {
    out.push((pool[i] as MonsterDef).id)
  }
  // 属性が極端に薄い場合の保険。無属性から強い順に足す
  if (out.length < MONSTER_SLOTS) {
    const fallback = MONSTERS.filter((m) => m.attribute === 'colorless').sort(byPower)
    for (const m of fallback) {
      if (out.length >= MONSTER_SLOTS) break
      const already = out.filter((id) => id === m.id).length
      if (already < 2) out.push(m.id)
    }
  }
  return out
}

/**
 * 魔法5枚。**`requires` を満たす絶技を最大3枚**入れてから、残りを神具で埋める。
 * 条件を満たさない絶技は入れない（死に札になる。SPEC 6.3）。
 */
function pickSpells(monsterIds: readonly CardId[]): CardId[] {
  const onField = new Set(monsterIds)
  const arts = SPELLS
    .filter((s) => s.form === 'art' && s.requires !== undefined && onField.has(s.requires))
    .sort(byRarity)
    .slice(0, MAX_ARTS)
  const artifacts = SPELLS.filter((s) => s.form === 'artifact').sort(byRarity)
  const out = arts.map((s) => s.id)
  for (const s of artifacts) {
    if (out.length >= SPELL_SLOTS) break
    out.push(s.id)
  }
  return out
}

/** 罠4枚。道標からレアリティの高い順 */
function pickTraps(): CardId[] {
  return TRAPS.slice().sort(byRarity).slice(0, TRAP_SLOTS).map((t) => t.id)
}

/**
 * 主の姫神から20枚のデッキを組む。
 *
 * **主が姫神でない、または見つからないときは null を返す。** 呼ぶ側で扱う。
 */
export function buildDeck(leaderId: CardId): Deck | null {
  const leader = MONSTERS.find((m) => m.id === leaderId)
  if (leader === undefined) return null
  const monsters = pickMonsters(leader)
  const spells = pickSpells(monsters)
  const traps = pickTraps()
  const cards = [...monsters, ...spells, ...traps]
  // 何かが足りなかったときに黙って19枚のデッキを返さない
  if (cards.length !== DECK_SIZE) return null
  return { name: `${leader.name}の陣`, cards }
}

/** 対戦相手として選べる姫神。87体すべて（SPEC 8.4） */
export function opponentLeaders(): readonly MonsterDef[] {
  return MONSTERS
}

/** 属性ごとの主。画面のタブに使う */
export function leadersByAttribute(attribute: Attribute): readonly MonsterDef[] {
  return MONSTERS.filter((m) => m.attribute === attribute).slice().sort(byPower)
}
