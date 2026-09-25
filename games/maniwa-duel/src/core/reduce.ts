/**
 * core の唯一の入口（CLAUDE.md 3章）。
 *
 *   function reduce(state: GameState, action: Action): GameState
 *
 * **reduce は例外を投げない。** 不正な Action は状態を変更せず log に rejected を
 * 積むだけとする。これにより1万回シミュレーションとファジングを安全に回せる
 * （SPEC 4章）。
 */
import { findCard, findMonster } from '../data/cards.ts'
import type { Action } from './actions.ts'
import { describeAction, validateDeck } from './actions.ts'
import { createRng, shuffle } from './rng.ts'
import { battleResult, canAttack, canAttackDirectly, effectiveAtk, effectiveDef } from './rules.ts'
import {
  findOnField,
  log,
  monstersOf,
  playerAt,
  reject,
  sendToGraveyard,
  updateMonster,
  withPlayer,
} from './state.ts'
import type {
  EndReason,
  GameState,
  InstanceId,
  MonsterOnField,
  PlayerId,
  PendingAttack,
  PlayerSide,
  Position,
} from './types.ts'
import {
  DECK_SIZE,
  HAND_LIMIT,
  HAND_SIZE_AT_START,
  LIFE_POINTS,
  MAX_SAME_NAME,
  MAX_TURNS,
  MONSTER_ZONES,
  SPELL_ZONES,
  opponentOf,
  tributesRequired,
} from './types.ts'

// ---------------------------------------------------------------- 初期状態

const EMPTY_SIDE: PlayerSide = {
  lp: LIFE_POINTS,
  deck: [],
  hand: [],
  graveyard: [],
  monsters: Array.from({ length: MONSTER_ZONES }, () => null),
  spells: Array.from({ length: SPELL_ZONES }, () => null),
  field: null,
  summonedThisTurn: false,
}

export const EMPTY_STATE: GameState = {
  phase: 'over',
  turn: 0,
  turnPlayer: 0,
  priority: 0,
  firstPlayer: 0,
  players: [EMPTY_SIDE, EMPTY_SIDE],
  pendingAttack: null,
  rng: createRng(1),
  log: [],
  winner: null,
  endReason: null,
  nextInstanceId: 1,
}

export function isOver(state: GameState): boolean {
  return state.phase === 'over'
}

// ---------------------------------------------------------------- 決着

function finish(state: GameState, winner: PlayerId | null, reason: EndReason): GameState {
  const detail =
    winner === null ? `引き分け（${reason}）` : `プレイヤー${winner}の勝ち（${reason}）`
  return log({ ...state, phase: 'over', winner, endReason: reason, pendingAttack: null },
    state.turnPlayer, 'end', detail)
}

/**
 * ライフが0以下になっていないか調べる（SPEC 3.7）。
 * **同時に0以下なら引き分け。**
 */
function checkLife(state: GameState): GameState {
  const dead0 = state.players[0].lp <= 0
  const dead1 = state.players[1].lp <= 0
  if (dead0 && dead1) return finish(state, null, 'lifePoints')
  if (dead0) return finish(state, 1, 'lifePoints')
  if (dead1) return finish(state, 0, 'lifePoints')
  return state
}

/** ライフを増減する。決着判定まで行う */
export function changeLife(state: GameState, player: PlayerId, delta: number): GameState {
  const side = playerAt(state, player)
  const next = withPlayer(state, player, { ...side, lp: side.lp + delta })
  const kind = delta < 0 ? 'damage' : 'heal'
  return checkLife(log(next, player, kind, `ライフ ${side.lp} → ${side.lp + delta}`))
}

// ---------------------------------------------------------------- ターン境界

/** ターンの初めに、1ターンかぎりの印をすべて落とす */
function clearTurnMarks(side: PlayerSide): PlayerSide {
  const monsters = side.monsters.map((m): MonsterOnField | null =>
    m === null ? null : { ...m, hasAttacked: false, summonedThisTurn: false, changedThisTurn: false, atkDelta: 0 })
  return { ...side, monsters, summonedThisTurn: false }
}

function beginTurn(state: GameState, player: PlayerId): GameState {
  const turn = state.turn + 1
  if (turn > MAX_TURNS) {
    const [a, b] = [state.players[0].lp, state.players[1].lp]
    const winner: PlayerId | null = a === b ? null : a > b ? 0 : 1
    return finish({ ...state, turn: state.turn }, winner, 'turnLimit')
  }
  const cleared = withPlayer(
    withPlayer(state, 0, clearTurnMarks(state.players[0])),
    1,
    clearTurnMarks(state.players[1]),
  )
  return log(
    { ...cleared, turn, turnPlayer: player, priority: player, phase: 'draw', pendingAttack: null },
    player, 'turn', `ターン${turn} 開始`)
}

// ---------------------------------------------------------------- 開始

function start(state: GameState, action: Extract<Action, { type: 'start' }>): GameState {
  const nameOf = (id: string) => findCard(id)?.name ?? null
  for (const player of [0, 1] as const) {
    const bad = validateDeck(action.decks[player], DECK_SIZE, MAX_SAME_NAME, nameOf)
    if (bad !== null) return reject(state, player, `デッキ不正: ${bad}`)
  }

  let rng = createRng(action.seed)
  const sides: PlayerSide[] = []
  for (const player of [0, 1] as const) {
    const r = shuffle(rng, action.decks[player].cards)
    rng = r.rng
    sides.push({
      ...EMPTY_SIDE,
      deck: r.items.slice(HAND_SIZE_AT_START),
      hand: r.items.slice(0, HAND_SIZE_AT_START),
    })
  }

  const fresh: GameState = {
    ...EMPTY_STATE,
    rng,
    turn: 0,
    firstPlayer: action.firstPlayer,
    players: [sides[0] as PlayerSide, sides[1] as PlayerSide],
    log: [],
  }
  return beginTurn(fresh, action.firstPlayer)
}

// ---------------------------------------------------------------- ドロー

function drawPhase(state: GameState): GameState {
  const player = state.turnPlayer
  // 先攻1ターン目は引かない（SPEC 3.3）
  if (state.turn === 1 && player === state.firstPlayer) {
    return log({ ...state, phase: 'main' }, player, 'draw', '先攻1ターン目のためドローなし')
  }
  const side = playerAt(state, player)
  if (side.deck.length === 0) {
    // 引けなければ負け（SPEC 3.7）
    return finish(state, opponentOf(player), 'deckOut')
  }
  const [top, ...rest] = side.deck
  const next = withPlayer(state, player, {
    ...side, deck: rest, hand: [...side.hand, top as string],
  })
  return log({ ...next, phase: 'main' }, player, 'draw', `1枚引いた（残り${rest.length}枚）`)
}

// ---------------------------------------------------------------- ターン終了

function endPhase(state: GameState): GameState {
  const player = state.turnPlayer
  const side = playerAt(state, player)
  if (side.hand.length > HAND_LIMIT) {
    // 捨てるまで待つ。priority は手番のまま
    return log({ ...state, phase: 'end' }, player, 'end',
      `手札${side.hand.length}枚。${HAND_LIMIT}枚まで捨てる`)
  }
  return beginTurn({ ...state, phase: 'end' }, opponentOf(player))
}

function discardToLimit(state: GameState, handIndex: number): GameState {
  const player = state.turnPlayer
  const side = playerAt(state, player)
  if (state.phase !== 'end') return reject(state, player, 'エンドフェイズではない')
  if (side.hand.length <= HAND_LIMIT) return reject(state, player, '捨てる必要がない')
  const card = side.hand[handIndex]
  if (card === undefined) return reject(state, player, `手札${handIndex}が無い`)
  const next = withPlayer(state, player, {
    ...side,
    hand: side.hand.filter((_, i) => i !== handIndex),
    graveyard: [...side.graveyard, card],
  })
  const logged = log(next, player, 'discard', `${findCard(card)?.name ?? card} を捨てた`)
  return endPhase(logged)
}

// ---------------------------------------------------------------- 召喚

/**
 * 通常召喚とセット（SPEC 3.5）。
 *
 * - **1ターンに1回**。セットも同じ枠を使う
 * - レベル5〜6で1体、7以上で2体をリリースする
 * - リリースは**先に済ませてから**置く。埋まっているゾーンを空けて置けるようにするため
 */
function summon(
  state: GameState,
  handIndex: number,
  zone: number,
  position: Position,
  faceDown: boolean,
  tributes: readonly InstanceId[],
): GameState {
  const player = state.turnPlayer
  if (state.phase !== 'main') return reject(state, player, 'メインフェイズではない')
  if (state.priority !== player) return reject(state, player, '手番ではない')

  const side = playerAt(state, player)
  if (side.summonedThisTurn) return reject(state, player, '通常召喚はこのターンもう使った')

  const cardId = side.hand[handIndex]
  if (cardId === undefined) return reject(state, player, `手札${handIndex}が無い`)
  const def = findMonster(cardId)
  if (def === null) return reject(state, player, `${cardId} は姫神ではない`)

  const need = tributesRequired(def.level)
  if (tributes.length !== need) {
    return reject(state, player, `レベル${def.level}のリリースは${need}体（${tributes.length}体）`)
  }
  if (new Set(tributes).size !== tributes.length) {
    return reject(state, player, '同じ姫神を二重にリリースしている')
  }
  for (const id of tributes) {
    const found = findOnField(state, id)
    if (found === null || found.player !== player) {
      return reject(state, player, `#${id} は自分の場にいない`)
    }
  }

  // リリースしてから置く
  const released = side.monsters.map((m) =>
    m !== null && tributes.includes(m.instanceId) ? null : m)
  const graveyard = [...side.graveyard, ...side.monsters
    .filter((m): m is MonsterOnField => m !== null && tributes.includes(m.instanceId))
    .map((m) => m.cardId)]

  if (zone < 0 || zone >= MONSTER_ZONES) return reject(state, player, `ゾーン${zone}は無い`)
  if (released[zone] !== null) return reject(state, player, `ゾーン${zone}は埋まっている`)

  const placed: MonsterOnField = {
    instanceId: state.nextInstanceId,
    cardId,
    position,
    faceDown,
    hasAttacked: false,
    summonedThisTurn: true,
    changedThisTurn: false,
    atkDelta: 0,
  }
  const monsters = released.map((m, i) => (i === zone ? placed : m))

  const next = withPlayer({ ...state, nextInstanceId: state.nextInstanceId + 1 }, player, {
    ...side,
    hand: side.hand.filter((_, i) => i !== handIndex),
    monsters,
    graveyard,
    summonedThisTurn: true,
  })
  const how = faceDown ? 'セット' : position === 'attack' ? '攻撃表示で召喚' : '守備表示で召喚'
  const cost = need > 0 ? `（${need}体リリース）` : ''
  return log(next, player, 'summon', `${def.name} を${how}${cost}`)
}

/**
 * 表示形式の変更（SPEC 3.5）。
 *
 * 1ターンに1回まで。召喚したターンは変えられない。
 * 裏側守備表示から変えるときは表側攻撃表示になる（リバース）。
 */
function changePosition(state: GameState, id: InstanceId): GameState {
  const player = state.turnPlayer
  if (state.phase !== 'main') return reject(state, player, 'メインフェイズではない')
  const found = findOnField(state, id)
  if (found === null || found.player !== player) {
    return reject(state, player, `#${id} は自分の場にいない`)
  }
  const m = found.monster
  if (m.summonedThisTurn) return reject(state, player, '召喚したターンは変えられない')
  if (m.changedThisTurn) return reject(state, player, 'このターンもう変えた')
  if (m.hasAttacked) return reject(state, player, '攻撃した後は変えられない')

  const next: MonsterOnField = m.faceDown
    ? { ...m, faceDown: false, position: 'attack', changedThisTurn: true }
    : { ...m, position: m.position === 'attack' ? 'defense' : 'attack', changedThisTurn: true }

  const side = playerAt(state, player)
  const monsters = side.monsters.map((x, i) => (i === found.zone ? next : x))
  const name = findCard(m.cardId)?.name ?? m.cardId
  const label = next.position === 'attack' ? '攻撃表示' : '守備表示'
  return log(withPlayer(state, player, { ...side, monsters }), player, 'position',
    `${name} を${label}にした`)
}

// ---------------------------------------------------------------- バトル

/**
 * 攻撃宣言（SPEC 3.6）。
 *
 * 割り込みはまだ無いので、宣言したらそのまま戦闘計算へ進む。
 * 割り込み（実装順序8）を入れるときは、ここと resolveAttack の間に
 * priority の受け渡しが挟まる。
 */
function declareAttack(
  state: GameState,
  attackerId: InstanceId,
  targetId: InstanceId | null,
): GameState {
  const player = state.turnPlayer
  if (state.phase !== 'battle') return reject(state, player, 'バトルフェイズではない')
  if (state.priority !== player) return reject(state, player, '手番ではない')
  if (state.pendingAttack !== null) return reject(state, player, '前の攻撃の処理中')

  const attacker = findOnField(state, attackerId)
  if (attacker === null || attacker.player !== player) {
    return reject(state, player, `#${attackerId} は自分の場にいない`)
  }
  if (!canAttack(state, attacker.monster)) {
    return reject(state, player, `#${attackerId} は攻撃できない`)
  }

  if (targetId === null) {
    if (!canAttackDirectly(state, player)) {
      return reject(state, player, '相手に姫神がいるのでダイレクトアタックできない')
    }
  } else {
    const target = findOnField(state, targetId)
    if (target === null || target.player === player) {
      return reject(state, player, `#${targetId} は相手の場にいない`)
    }
  }

  const pending: PendingAttack = {
    attacker: attackerId, target: targetId, responded: false, negated: false,
  }
  const name = findCard(attacker.monster.cardId)?.name ?? attacker.monster.cardId
  const detail = targetId === null ? `${name} がダイレクトアタック` : `${name} が攻撃宣言`
  return resolveAttack(log({ ...state, pendingAttack: pending }, player, 'attack', detail))
}

/**
 * 戦闘計算（SPEC 3.6）。pendingAttack を消化する。
 *
 * 裏側守備表示の相手は、**計算の前に表にする**。
 */
function resolveAttack(state: GameState): GameState {
  const pending = state.pendingAttack
  if (pending === null) return state
  const player = state.turnPlayer
  const foe = opponentOf(player)

  const clear = (s: GameState): GameState => ({ ...s, pendingAttack: null })

  // 攻撃したという印は、無効化されても付く（1体1回）
  let next = updateMonster(state, pending.attacker, (m) => ({ ...m, hasAttacked: true }))

  if (pending.negated) {
    return clear(log(next, player, 'battle', '攻撃は無効になった'))
  }

  const attacker = findOnField(next, pending.attacker)
  if (attacker === null) {
    // 割り込みで攻撃側が消えた場合
    return clear(log(next, player, 'battle', '攻撃した姫神がいなくなった'))
  }
  const atk = effectiveAtk(next, pending.attacker)

  if (pending.target === null) {
    if (!canAttackDirectly(next, player)) {
      return clear(log(next, player, 'battle', '相手に姫神が出たのでダイレクトアタックは通らない'))
    }
    next = log(next, player, 'battle', `ダイレクトアタック ${atk}`)
    return clear(changeLife(next, foe, -atk))
  }

  const target = findOnField(next, pending.target)
  if (target === null) {
    return clear(log(next, player, 'battle', '相手の姫神がいなくなった'))
  }

  // 裏側なら先に表にする
  if (target.monster.faceDown) {
    next = updateMonster(next, pending.target, (m) => ({ ...m, faceDown: false }))
    const name = findCard(target.monster.cardId)?.name ?? target.monster.cardId
    next = log(next, foe, 'flip', `${name} が表になった`)
  }

  const defAtk = effectiveAtk(next, pending.target)
  const defDef = effectiveDef(next, pending.target)
  const result = battleResult(atk, defAtk, defDef, target.monster.position)

  next = log(next, player, 'battle',
    `${atk} vs ${target.monster.position === 'attack' ? defAtk : defDef}` +
    `（${target.monster.position === 'attack' ? '攻撃表示' : '守備表示'}）`)

  if (result.destroyed === 'attacker' || result.destroyed === 'both') {
    next = sendToGraveyard(next, pending.attacker)
  }
  if (result.destroyed === 'defender' || result.destroyed === 'both') {
    next = sendToGraveyard(next, pending.target)
  }
  if (result.damage > 0 && result.damageTo !== null) {
    next = changeLife(next, result.damageTo === 'attacker' ? player : foe, -result.damage)
  }
  return clear(next)
}

// ---------------------------------------------------------------- 選べる操作

/**
 * いま出せる操作をすべて数え上げる（SPEC 5章）。
 *
 * CPU はここが返したものからしか選ばない。画面もここを使ってボタンの可否を決める。
 * **priority が指す側の操作だけ**を返す。
 */
export function legalActions(state: GameState): readonly Action[] {
  if (isOver(state)) return []
  const player = state.priority
  const side = playerAt(state, player)
  const out: Action[] = []

  if (state.phase === 'draw') {
    out.push({ type: 'draw' })
    return out
  }

  if (state.phase === 'end') {
    if (side.hand.length > HAND_LIMIT) {
      for (let i = 0; i < side.hand.length; i += 1) out.push({ type: 'discardToLimit', handIndex: i })
    }
    return out
  }

  if (state.phase === 'main') {
    if (!side.summonedThisTurn) {
      for (let h = 0; h < side.hand.length; h += 1) {
        const def = findMonster(side.hand[h] as string)
        if (def === null) continue
        const need = tributesRequired(def.level)
        const own = monstersOf(side)
        if (own.length < need) continue
        for (const tributes of combinations(own.map((m) => m.instanceId), need)) {
          const free = side.monsters
            .map((m, i) => (m === null || tributes.includes(m.instanceId) ? i : -1))
            .filter((i) => i >= 0)
          for (const zone of free) {
            out.push({ type: 'normalSummon', handIndex: h, zone, position: 'attack', tributes })
            out.push({ type: 'normalSummon', handIndex: h, zone, position: 'defense', tributes })
            out.push({ type: 'setMonster', handIndex: h, zone, tributes })
          }
        }
      }
    }
    for (const m of monstersOf(side)) {
      if (!m.summonedThisTurn && !m.changedThisTurn && !m.hasAttacked) {
        out.push({ type: 'changePosition', instanceId: m.instanceId })
      }
    }
    const firstTurnOfFirstPlayer = state.turn === 1 && player === state.firstPlayer
    if (!firstTurnOfFirstPlayer) out.push({ type: 'toBattle' })
    out.push({ type: 'endTurn' })
    return out
  }

  if (state.phase === 'battle') {
    const foe = playerAt(state, opponentOf(player))
    const targets = monstersOf(foe)
    for (const m of monstersOf(side)) {
      if (!canAttack(state, m)) continue
      if (targets.length === 0) {
        out.push({ type: 'declareAttack', attacker: m.instanceId, target: null })
      } else {
        for (const t of targets) {
          out.push({ type: 'declareAttack', attacker: m.instanceId, target: t.instanceId })
        }
      }
    }
    out.push({ type: 'endTurn' })
    return out
  }

  return out
}

/** n個選ぶ組み合わせ。リリース候補の数え上げに使う */
function combinations<T>(items: readonly T[], n: number): readonly (readonly T[])[] {
  if (n === 0) return [[]]
  if (items.length < n) return []
  const out: T[][] = []
  const walk = (start: number, acc: T[]) => {
    if (acc.length === n) {
      out.push([...acc])
      return
    }
    for (let i = start; i < items.length; i += 1) {
      acc.push(items[i] as T)
      walk(i + 1, acc)
      acc.pop()
    }
  }
  walk(0, [])
  return out
}

// ---------------------------------------------------------------- 入口

export function reduce(state: GameState, action: Action): GameState {
  if (action.type === 'start') return start(state, action)
  if (isOver(state)) return reject(state, state.turnPlayer, `終了後の操作: ${describeAction(action)}`)

  switch (action.type) {
    case 'draw':
      if (state.phase !== 'draw') return reject(state, state.turnPlayer, 'ドローフェイズではない')
      return drawPhase(state)

    case 'toBattle': {
      if (state.phase !== 'main') return reject(state, state.turnPlayer, 'メインフェイズではない')
      // 先攻1ターン目はバトルフェイズを行えない（SPEC 3.3）
      if (state.turn === 1 && state.turnPlayer === state.firstPlayer) {
        return reject(state, state.turnPlayer, '先攻1ターン目はバトルできない')
      }
      return log({ ...state, phase: 'battle' }, state.turnPlayer, 'phase', 'バトルフェイズ')
    }

    case 'endTurn':
      if (state.phase !== 'main' && state.phase !== 'battle') {
        return reject(state, state.turnPlayer, 'いま終了できない')
      }
      if (state.pendingAttack !== null) {
        return reject(state, state.turnPlayer, '攻撃の処理中')
      }
      return endPhase(state)

    case 'discardToLimit':
      return discardToLimit(state, action.handIndex)

    case 'normalSummon':
      return summon(state, action.handIndex, action.zone, action.position, false, action.tributes)

    case 'setMonster':
      return summon(state, action.handIndex, action.zone, 'defense', true, action.tributes)

    case 'changePosition':
      return changePosition(state, action.instanceId)

    case 'declareAttack':
      return declareAttack(state, action.attacker, action.target)

    default:
      return reject(state, state.priority, `未実装の操作: ${describeAction(action)}`)
  }
}
