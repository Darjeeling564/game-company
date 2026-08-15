/**
 * core の唯一の入口（CLAUDE.md 3章）。
 *
 *   function reduce(state: GameState, action: Action): GameState
 *
 * reduce は例外を投げない。不正な Action は状態を変更せず log に rejected を積むだけとする。
 * これにより1万回シミュレーションとファジングを安全に回せる（SPEC 4章「設計上の約束」）。
 */
import type { Action } from './actions.ts'
import { describeAction } from './actions.ts'
import { createRng, pick, shuffle } from './rng.ts'
import type {
  CardId,
  Creature,
  Deck,
  EnergyType,
  GameState,
  LogEntry,
  PlayerId,
  PlayerState,
} from './types.ts'
import {
  BENCH_SIZE,
  DECK_SIZE,
  HAND_SIZE_AT_START,
  MAX_MULLIGAN,
  MAX_SAME_NAME,
  MAX_TURNS,
  opponentOf,
} from './types.ts'
import { findCard, requireCard } from '../data/cards.ts'

// ---------------------------------------------------------------- 初期状態

const EMPTY_PLAYER: PlayerState = {
  deck: [],
  hand: [],
  discard: [],
  active: null,
  bench: [],
  points: 0,
  energy: { pool: [], current: null, next: null },
  attachedThisTurn: false,
  retreatedThisTurn: false,
}

export const EMPTY_STATE: GameState = {
  rng: createRng(1),
  turn: 0,
  current: 0,
  firstPlayer: 0,
  phase: { kind: 'ended' },
  players: [EMPTY_PLAYER, EMPTY_PLAYER],
  setupDone: [false, false],
  nextInstanceId: 1,
  winner: null,
  endReason: null,
  log: [],
}

// ---------------------------------------------------------------- 小道具

function log(state: GameState, player: PlayerId, kind: string, detail: string): GameState {
  const entry: LogEntry = { turn: state.turn, player, kind, detail }
  return { ...state, log: [...state.log, entry] }
}

function reject(state: GameState, action: Action, reason: string): GameState {
  const player = action.type === 'start' ? state.current : action.player
  return log(state, player, 'rejected', `${describeAction(action)}: ${reason}`)
}

export function playerAt(state: GameState, id: PlayerId): PlayerState {
  return state.players[id]
}

export function withPlayer(state: GameState, id: PlayerId, player: PlayerState): GameState {
  const players: readonly [PlayerState, PlayerState] =
    id === 0 ? [player, state.players[1]] : [state.players[0], player]
  return { ...state, players }
}

/** バトル場・ベンチを通した全個体 */
export function allCreatures(player: PlayerState): readonly Creature[] {
  return player.active === null ? player.bench : [player.active, ...player.bench]
}

// ---------------------------------------------------------------- デッキ検証

export function validateDeck(deck: Deck): readonly string[] {
  const errors: string[] = []
  if (deck.cards.length !== DECK_SIZE) {
    errors.push(`デッキは${DECK_SIZE}枚ちょうどにする（現在 ${deck.cards.length}枚）`)
  }
  const unknown = deck.cards.filter((id) => findCard(id) === undefined)
  if (unknown.length > 0) errors.push(`未知のカード: ${[...new Set(unknown)].join(', ')}`)

  const byName = new Map<string, number>()
  for (const id of deck.cards) {
    const card = findCard(id)
    if (card === undefined) continue
    byName.set(card.name, (byName.get(card.name) ?? 0) + 1)
  }
  for (const [name, count] of byName) {
    if (count > MAX_SAME_NAME) errors.push(`同名カードは${MAX_SAME_NAME}枚まで: ${name} が${count}枚`)
  }

  if (deck.energy.length === 0) errors.push('エネルギータイプを1種以上指定する')
  if (deck.energy.includes('colorless')) errors.push('colorless はエネルギータイプに指定できない')

  const hasCreature = deck.cards.some((id) => findCard(id)?.kind === 'creature')
  if (!hasCreature) errors.push('クリーチャーを1枚以上入れる')

  return errors
}

// ---------------------------------------------------------------- 開始

function drawOpeningHand(
  rng: GameState['rng'],
  cards: readonly CardId[],
): { readonly rng: GameState['rng']; readonly deck: readonly CardId[]; readonly hand: readonly CardId[] } {
  let cur = rng
  for (let attempt = 0; attempt < MAX_MULLIGAN; attempt += 1) {
    const shuffled = shuffle(cur, cards)
    cur = shuffled.rng
    const hand = shuffled.items.slice(0, HAND_SIZE_AT_START)
    const deck = shuffled.items.slice(HAND_SIZE_AT_START)
    if (hand.some((id) => findCard(id)?.kind === 'creature')) {
      return { rng: cur, deck, hand }
    }
  }
  // ここに来るのはデッキ構築が不正な場合のみ。validateDeck で弾いている
  const shuffled = shuffle(cur, cards)
  return {
    rng: shuffled.rng,
    deck: shuffled.items.slice(HAND_SIZE_AT_START),
    hand: shuffled.items.slice(0, HAND_SIZE_AT_START),
  }
}

function rollEnergy(
  rng: GameState['rng'],
  pool: readonly EnergyType[],
): { readonly rng: GameState['rng']; readonly energy: EnergyType | null } {
  const picked = pick(rng, pool)
  return { rng: picked.rng, energy: picked.item }
}

function startGame(state: GameState, action: Extract<Action, { type: 'start' }>): GameState {
  const errors = [...validateDeck(action.decks[0]), ...validateDeck(action.decks[1])]
  if (errors.length > 0) return reject(state, action, errors.join(' / '))

  let rng = createRng(action.seed)
  const players: PlayerState[] = []

  for (const deck of action.decks) {
    const opening = drawOpeningHand(rng, deck.cards)
    rng = opening.rng
    const rolled = rollEnergy(rng, deck.energy)
    rng = rolled.rng
    players.push({
      ...EMPTY_PLAYER,
      deck: opening.deck,
      hand: opening.hand,
      energy: { pool: deck.energy, current: null, next: rolled.energy },
    })
  }

  return {
    ...EMPTY_STATE,
    rng,
    turn: 0,
    current: action.firstPlayer,
    firstPlayer: action.firstPlayer,
    phase: { kind: 'setup' },
    players: [players[0] as PlayerState, players[1] as PlayerState],
    log: [{ turn: 0, player: action.firstPlayer, kind: 'start', detail: describeAction(action) }],
  }
}

// ---------------------------------------------------------------- ターン境界

function drawOne(player: PlayerState): PlayerState {
  const top = player.deck[0]
  if (top === undefined) return player // 山札切れでも敗北しない（SPEC 3.3）
  return { ...player, deck: player.deck.slice(1), hand: [...player.hand, top] }
}

/** 手番開始時の自動処理: エネルギー供給 → ドロー → フラグのリセット */
function beginTurn(state: GameState): GameState {
  if (state.turn > MAX_TURNS) return finishByTurnLimit(state)

  const id = state.current
  const player = playerAt(state, id)

  const rolled = rollEnergy(state.rng, player.energy.pool)
  const supplied: PlayerState = {
    ...player,
    energy: { ...player.energy, current: player.energy.next, next: rolled.energy },
    attachedThisTurn: false,
    retreatedThisTurn: false,
  }

  const next = withPlayer({ ...state, rng: rolled.rng }, id, drawOne(supplied))
  return log(next, id, 'beginTurn', `turn=${next.turn}`)
}

export function finishByTurnLimit(state: GameState): GameState {
  const [a, b] = [playerAt(state, 0).points, playerAt(state, 1).points]
  const winner: PlayerId | null = a === b ? null : a > b ? 0 : 1
  return log(
    { ...state, phase: { kind: 'ended' }, winner, endReason: 'turnLimit' },
    state.current,
    'end',
    `turnLimit points=${a}:${b}`,
  )
}

/** 手番を相手に渡す。きぜつ処理は stage4 の rules 側で先に済ませておく */
export function passTurn(state: GameState): GameState {
  const id = state.current
  const ended: PlayerState = {
    ...playerAt(state, id),
    energy: { ...playerAt(state, id).energy, current: null }, // 未使用エネルギーは持ち越さない
  }
  const cleared = withPlayer(state, id, ended)
  const next: GameState = { ...cleared, current: opponentOf(id), turn: cleared.turn + 1 }
  return beginTurn(next)
}

// ---------------------------------------------------------------- 配置系

function makeCreature(state: GameState, cardId: CardId): Creature {
  return {
    instanceId: state.nextInstanceId,
    cardId,
    damage: 0,
    attached: [],
    status: [],
    placedTurn: state.turn,
  }
}

function placeFromHand(
  state: GameState,
  id: PlayerId,
  handIndex: number,
  to: 'active' | 'bench',
): GameState | string {
  const player = playerAt(state, id)
  const cardId = player.hand[handIndex]
  if (cardId === undefined) return '手札の範囲外'
  const card = findCard(cardId)
  if (card === undefined) return '未知のカード'
  if (card.kind !== 'creature') return 'クリーチャーではない'
  if (to === 'active' && player.active !== null) return 'バトル場が空いていない'
  if (to === 'bench' && player.bench.length >= BENCH_SIZE) return 'ベンチが満杯'

  const creature = makeCreature(state, cardId)
  const hand = [...player.hand.slice(0, handIndex), ...player.hand.slice(handIndex + 1)]
  const updated: PlayerState =
    to === 'active'
      ? { ...player, hand, active: creature }
      : { ...player, hand, bench: [...player.bench, creature] }

  return withPlayer({ ...state, nextInstanceId: state.nextInstanceId + 1 }, id, updated)
}

// ---------------------------------------------------------------- reduce

/** start は局面に依存しないため、局面別ハンドラからは除外する */
type PlayerAction = Exclude<Action, { readonly type: 'start' }>

export function reduce(state: GameState, action: Action): GameState {
  if (action.type === 'start') return startGame(state, action)
  if (state.phase.kind === 'ended') return reject(state, action, 'ゲームは終了している')

  switch (state.phase.kind) {
    case 'setup':
      return reduceSetup(state, action)
    case 'promote':
      return reducePromote(state, action)
    case 'main':
      return reduceMain(state, action)
  }
}

function reduceSetup(state: GameState, action: PlayerAction): GameState {
  const id = action.player
  if (state.setupDone[id]) return reject(state, action, '初期配置は完了している')

  switch (action.type) {
    case 'setupPlace': {
      const player = playerAt(state, id)
      const to = player.active === null ? 'active' : 'bench'
      const result = placeFromHand(state, id, action.handIndex, to)
      if (typeof result === 'string') return reject(state, action, result)
      return log(result, id, 'setupPlace', `${to}`)
    }
    case 'setupDone': {
      if (playerAt(state, id).active === null) return reject(state, action, 'バトル場が空')
      const setupDone: readonly [boolean, boolean] =
        id === 0 ? [true, state.setupDone[1]] : [state.setupDone[0], true]
      const marked = log({ ...state, setupDone }, id, 'setupDone', '')
      if (!setupDone[0] || !setupDone[1]) return marked
      return beginTurn({ ...marked, phase: { kind: 'main' }, turn: 1, current: marked.firstPlayer })
    }
    default:
      return reject(state, action, '初期配置中は使えない')
  }
}

function reducePromote(state: GameState, action: PlayerAction): GameState {
  if (state.phase.kind !== 'promote') return reject(state, action, '入れ替え中ではない')
  const expected = state.phase.queue[0]
  if (expected === undefined) return reject(state, action, '入れ替え対象がいない')
  if (action.type !== 'promote') return reject(state, action, '入れ替えを先に行う')
  if (action.player !== expected) return reject(state, action, `p${expected} の入れ替え待ち`)

  const player = playerAt(state, action.player)
  const chosen = player.bench[action.benchIndex]
  if (chosen === undefined) return reject(state, action, 'ベンチの範囲外')

  const bench = [...player.bench.slice(0, action.benchIndex), ...player.bench.slice(action.benchIndex + 1)]
  const promoted = withPlayer(state, action.player, { ...player, active: chosen, bench })
  const queue = state.phase.queue.slice(1)
  const next = log(promoted, action.player, 'promote', `#${chosen.instanceId}`)

  if (queue.length > 0) return { ...next, phase: { kind: 'promote', queue } }
  return passTurn({ ...next, phase: { kind: 'main' } })
}

function reduceMain(state: GameState, action: PlayerAction): GameState {
  if (action.player !== state.current) return reject(state, action, '手番ではない')
  const id = state.current
  const player = playerAt(state, id)

  switch (action.type) {
    case 'playCreature': {
      const result = placeFromHand(state, id, action.handIndex, 'bench')
      if (typeof result === 'string') return reject(state, action, result)
      return log(result, id, 'playCreature', '')
    }

    case 'attachEnergy': {
      if (player.attachedThisTurn) return reject(state, action, 'このターンは付与済み')
      const energy = player.energy.current
      if (energy === null) return reject(state, action, 'エネルギーの在庫がない')

      const target = allCreatures(player).find((c) => c.instanceId === action.target)
      if (target === undefined) return reject(state, action, '対象がいない')

      const attach = (c: Creature): Creature =>
        c.instanceId === action.target ? { ...c, attached: [...c.attached, energy] } : c
      const updated: PlayerState = {
        ...player,
        active: player.active === null ? null : attach(player.active),
        bench: player.bench.map(attach),
        energy: { ...player.energy, current: null },
        attachedThisTurn: true,
      }
      return log(withPlayer(state, id, updated), id, 'attachEnergy', `${energy} -> #${action.target}`)
    }

    case 'retreat': {
      if (player.retreatedThisTurn) return reject(state, action, 'このターンはにげる済み')
      const active = player.active
      if (active === null) return reject(state, action, 'バトル場が空')
      const chosen = player.bench[action.benchIndex]
      if (chosen === undefined) return reject(state, action, 'ベンチの範囲外')

      const cost = requireCard(active.cardId).retreatCost
      if (active.attached.length < cost) return reject(state, action, `エネルギーが${cost}個必要`)

      const retreated: Creature = {
        ...active,
        attached: active.attached.slice(cost),
        status: [], // 場を離れると状態異常は解除される（SPEC 3.4）
      }
      const bench = [...player.bench.slice(0, action.benchIndex), ...player.bench.slice(action.benchIndex + 1), retreated]
      const updated: PlayerState = {
        ...player,
        active: chosen,
        bench,
        retreatedThisTurn: true,
      }
      return log(withPlayer(state, id, updated), id, 'retreat', `#${chosen.instanceId}`)
    }

    case 'endTurn':
      return passTurn(log(state, id, 'endTurn', ''))

    case 'attack':
      return reject(state, action, '攻撃は未実装')

    default:
      return reject(state, action, 'この局面では使えない')
  }
}

// ---------------------------------------------------------------- 補助

export function isOver(state: GameState): boolean {
  return state.phase.kind === 'ended'
}

/** log を除いた正規化文字列。リプレイ一致判定に使う（SPEC 4章） */
function canonical(state: GameState): string {
  const creature = (c: Creature | null): string =>
    c === null ? '-' : `${c.instanceId}:${c.cardId}:${c.damage}:${c.attached.join('')}:${c.status.join('')}:${c.placedTurn}`
  const player = (p: PlayerState): string =>
    [
      p.deck.join(','),
      p.hand.join(','),
      p.discard.join(','),
      creature(p.active),
      p.bench.map(creature).join('|'),
      p.points,
      `${p.energy.pool.join('')}/${p.energy.current ?? '-'}/${p.energy.next ?? '-'}`,
      p.attachedThisTurn ? '1' : '0',
      p.retreatedThisTurn ? '1' : '0',
    ].join(';')

  const phase =
    state.phase.kind === 'promote' ? `promote(${state.phase.queue.join(',')})` : state.phase.kind

  return [
    state.rng.seed,
    state.turn,
    state.current,
    state.firstPlayer,
    phase,
    state.setupDone.map((d) => (d ? '1' : '0')).join(''),
    state.nextInstanceId,
    state.winner ?? '-',
    state.endReason ?? '-',
    player(state.players[0]),
    player(state.players[1]),
  ].join('#')
}

/** FNV-1a */
export function hashState(state: GameState): string {
  const source = canonical(state)
  let hash = 0x811c9dc5
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

// ---------------------------------------------------------------- 合法手

/**
 * その局面で受理される Action をすべて列挙する。
 * UI のボタン活性判定・AI・シミュレータがこれを共用し、ルールを二重に実装しない（SPEC 5章）。
 */
export function legalActions(state: GameState): readonly Action[] {
  switch (state.phase.kind) {
    case 'ended':
      return []

    case 'setup': {
      const out: Action[] = []
      for (const id of [0, 1] as const) {
        if (state.setupDone[id]) continue
        const player = playerAt(state, id)
        const canPlace = player.active === null || player.bench.length < BENCH_SIZE
        if (canPlace) {
          player.hand.forEach((cardId, handIndex) => {
            if (findCard(cardId)?.kind === 'creature') out.push({ type: 'setupPlace', player: id, handIndex })
          })
        }
        if (player.active !== null) out.push({ type: 'setupDone', player: id })
      }
      return out
    }

    case 'promote': {
      const id = state.phase.queue[0]
      if (id === undefined) return []
      return playerAt(state, id).bench.map((_, benchIndex) => ({ type: 'promote', player: id, benchIndex }) as const)
    }

    case 'main': {
      const id = state.current
      const player = playerAt(state, id)
      const out: Action[] = []

      if (player.bench.length < BENCH_SIZE) {
        player.hand.forEach((cardId, handIndex) => {
          if (findCard(cardId)?.kind === 'creature') out.push({ type: 'playCreature', player: id, handIndex })
        })
      }

      if (!player.attachedThisTurn && player.energy.current !== null) {
        for (const c of allCreatures(player)) out.push({ type: 'attachEnergy', player: id, target: c.instanceId })
      }

      const active = player.active
      if (active !== null && !player.retreatedThisTurn) {
        const cost = requireCard(active.cardId).retreatCost
        if (active.attached.length >= cost) {
          player.bench.forEach((_, benchIndex) => out.push({ type: 'retreat', player: id, benchIndex }))
        }
      }

      out.push({ type: 'endTurn', player: id })
      return out
    }
  }
}
