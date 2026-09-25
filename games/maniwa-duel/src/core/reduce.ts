/**
 * core の唯一の入口（CLAUDE.md 3章）。
 *
 *   function reduce(state: GameState, action: Action): GameState
 *
 * **reduce は例外を投げない。** 不正な Action は状態を変更せず log に rejected を
 * 積むだけとする。これにより1万回シミュレーションとファジングを安全に回せる
 * （SPEC 4章）。
 */
import { findCard } from '../data/cards.ts'
import type { Action } from './actions.ts'
import { describeAction, validateDeck } from './actions.ts'
import { createRng, shuffle } from './rng.ts'
import { log, playerAt, reject, withPlayer } from './state.ts'
import type {
  EndReason,
  GameState,
  MonsterOnField,
  PlayerId,
  PlayerSide,
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

    default:
      return reject(state, state.priority, `未実装の操作: ${describeAction(action)}`)
  }
}
