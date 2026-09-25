/**
 * ルールの本体のうち、状態を進めない「判定」だけを置く（SPEC 3.5・3.6）。
 * 状態遷移は reduce.ts、効果の解釈は effects.ts が受け持つ。
 */
import { findMonster, findSpell, findTrap } from '../data/cards.ts'
import { findOnField, monstersOf, spellsOf } from './state.ts'
import type {
  Continuous,
  GameState,
  InstanceId,
  MonsterOnField,
  PlayerId,
  Position,
  Scope,
  SpellOnField,
} from './types.ts'
import { opponentOf } from './types.ts'

// ---------------------------------------------------------------- 攻撃力・守備力

/**
 * 継続効果が、指定したモンスターに及ぶか（SPEC 6.4 第2層）。
 *
 * `owner` はその継続効果を出しているカードの持ち主、`target` は当てる相手。
 */
function scopeApplies(
  scope: Scope,
  owner: PlayerId,
  target: PlayerId,
  card: SpellOnField,
  targetId: InstanceId,
): boolean {
  switch (scope) {
    case 'allMonsters':
      return true
    case 'ownMonsters':
      return owner === target
    case 'opponentMonsters':
      return owner !== target
    case 'equippedMonster':
      return card.equippedTo === targetId
  }
}

/** 場に表側で出ているカードの継続効果をすべて数え上げる */
function continuousOn(state: GameState, id: InstanceId): readonly Continuous[] {
  const found = findOnField(state, id)
  if (found === null) return []
  const out: Continuous[] = []
  for (const owner of [0, 1] as const) {
    const side = state.players[owner]
    const cards = [...spellsOf(side), ...(side.field === null ? [] : [side.field])]
    for (const card of cards) {
      if (card.state !== 'active') continue
      const def = findSpell(card.cardId) ?? findTrap(card.cardId)
      for (const c of def?.whileOnField ?? []) {
        if (scopeApplies(c.scope, owner, found.player, card, id)) out.push(c)
      }
    }
  }
  return out
}

/**
 * **攻撃力はここだけで出す。カードの値を直接読まない**（SPEC 6.4）。
 *
 * v1 は「カードの値 + atkDelta」しか返さない。継続効果を持つカードが1枚も無いためで、
 * `state: 'active'` になるカードも v1 には存在しない。
 * それでも走査を書いておくのは、永続魔法・装備魔法を足す日に
 * **このファイルの外を1行も触らずに済ませる**ためである。
 */
export function effectiveAtk(state: GameState, id: InstanceId): number {
  const found = findOnField(state, id)
  if (found === null) return 0
  const def = findMonster(found.monster.cardId)
  if (def === null) return 0
  let value = def.atk + found.monster.atkDelta
  for (const c of continuousOn(state, id)) {
    if (c.type === 'atkBoost') value += c.value
  }
  return Math.max(0, value)
}

/** 守備力。攻撃力と同じ理由でここだけで出す（SPEC 6.4） */
export function effectiveDef(state: GameState, id: InstanceId): number {
  const found = findOnField(state, id)
  if (found === null) return 0
  const def = findMonster(found.monster.cardId)
  if (def === null) return 0
  let value = def.def
  for (const c of continuousOn(state, id)) {
    if (c.type === 'defBoost') value += c.value
  }
  return Math.max(0, value)
}

// ---------------------------------------------------------------- 召喚

/** レベルごとのリリース数（SPEC 3.5）。types.ts の同名関数を再輸出する */
export { tributesRequired } from './types.ts'

// ---------------------------------------------------------------- 戦闘

export interface BattleResult {
  readonly destroyed: 'attacker' | 'defender' | 'both' | 'none'
  /**
   * ダメージを受ける側。null なら誰も受けない。
   * プレイヤー番号ではなく「攻撃側 / 防御側」で返す。
   * この関数は数値しか受け取らないので、どちらのプレイヤーかを知らないため。
   */
  readonly damageTo: 'attacker' | 'defender' | null
  readonly damage: number
}

const NOTHING: BattleResult = { destroyed: 'none', damageTo: null, damage: 0 }

/**
 * 戦闘の計算（SPEC 3.6）。
 *
 * | 相手 | 結果 |
 * |---|---|
 * | 攻撃表示 | 攻撃力が低いほうが破壊され、差が**破壊された側**のライフへ。同値なら両方破壊・ダメージ無し |
 * | 守備表示 | 攻撃力 > 守備力 → 破壊のみ（ダメージ無し）。攻撃力 < 守備力 → **攻撃側が差を受ける**。同値なら何も起きない |
 *
 * 貫通は v1 では作らない。
 */
export function battleResult(
  attackerAtk: number,
  defenderAtk: number,
  defenderDef: number,
  position: Position,
): BattleResult {
  if (position === 'attack') {
    if (attackerAtk > defenderAtk) {
      return { destroyed: 'defender', damageTo: 'defender', damage: attackerAtk - defenderAtk }
    }
    if (attackerAtk < defenderAtk) {
      return { destroyed: 'attacker', damageTo: 'attacker', damage: defenderAtk - attackerAtk }
    }
    return { destroyed: 'both', damageTo: null, damage: 0 }
  }
  // 守備表示
  if (attackerAtk > defenderDef) return { destroyed: 'defender', damageTo: null, damage: 0 }
  if (attackerAtk < defenderDef) {
    return { destroyed: 'none', damageTo: 'attacker', damage: defenderDef - attackerAtk }
  }
  return NOTHING
}

// ---------------------------------------------------------------- 攻撃できるか

/**
 * そのモンスターが攻撃できるか（SPEC 3.6）。
 *
 * - 攻撃表示であること
 * - このターンまだ攻撃していないこと
 * - **先攻1ターン目はバトルフェイズに入れない**（reduce 側で phase を進めないので、
 *   ここでは扱わない）
 * - 継続効果 cannotAttack を受けていないこと（v1 では該当カードが無い）
 *
 * 召喚したターンでも攻撃できる（本家と同じ）。
 */
export function canAttack(state: GameState, monster: MonsterOnField): boolean {
  if (monster.position !== 'attack') return false
  if (monster.faceDown) return false
  if (monster.hasAttacked) return false
  for (const c of continuousOn(state, monster.instanceId)) {
    if (c.type === 'cannotAttack') return false
  }
  return true
}

/** 相手の場にモンスターが1体もいなければダイレクトアタックできる */
export function canAttackDirectly(state: GameState, attacker: PlayerId): boolean {
  return monstersOf(state.players[opponentOf(attacker)]).length === 0
}
