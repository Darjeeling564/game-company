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
import { applyEffects } from './effects.ts'
import { createRng, pick, shuffle } from './rng.ts'
import { allCreatures, log, playerAt, updateCreature, withPlayer } from './state.ts'
import {
  afterPromote,
  attackError,
  beginTurn,
  canPayCost,
  finishTurn,
  performAttack,
  performUltimate,
  resolveInTurn,
  ultimateError,
} from './rules.ts'
import type { CardId, Creature, Deck, EnergyType, GameState, InstanceId, PlayerId, PlayerState } from './types.ts'
import {
  BENCH_SIZE,
  DECK_SIZE,
  HAND_SIZE_AT_START,
  MAX_MULLIGAN,
  MAX_SAME_NAME,
} from './types.ts'
import { findCard, requireCreature } from '../data/cards.ts'

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
  usedActionThisTurn: false,
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

function reject(state: GameState, action: Action, reason: string): GameState {
  const player = action.type === 'start' ? state.current : action.player
  return log(state, player, 'rejected', `${describeAction(action)}: ${reason}`)
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

  // 絶技は撃てるキャラが同じデッキに無いと死に札になる（SPEC 16.5）
  const inDeck = new Set(deck.cards)
  for (const id of new Set(deck.cards)) {
    const card = findCard(id)
    if (card?.kind !== 'ultimate') continue
    if (!inDeck.has(card.requires)) {
      errors.push(`絶技 ${card.name} には ${card.requires} が必要`)
    }
  }

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

function pickEnergy(
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
    const rolled = pickEnergy(rng, deck.energy)
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

/**
 * 実験（レアリティ召喚）: レアリティごとに必要な「リリース元のエネルギー数」。
 * 提案どおり C=0 / R=1 / SR=2 / UR=3。エネルギーの種類は問わない。
 */
const RELEASE_COST: Readonly<Record<string, number>> = {
  common: 0, rare: 1, superRare: 2, ultra: 3,
}

/**
 * 実験（レアリティ召喚・案B）: リリースした姫神のエネルギーを引き継いで場に出す。
 *
 * 引き継がないと「3ターン貯める → 捨てる → また3ターン貯める」で
 * 6ターン以上かかり、絶技が撃てなくなる。案B はそこを埋める。
 */
function releaseAndPlace(
  state: GameState,
  id: PlayerId,
  handIndex: number,
  release: InstanceId,
): GameState | string {
  const player = playerAt(state, id)
  const cardId = player.hand[handIndex]
  if (cardId === undefined) return '手札の範囲外'
  const card = findCard(cardId)
  if (card === undefined || card.kind !== 'creature') return 'クリーチャーではない'

  const need = RELEASE_COST[card.rarity] ?? 0
  const target = allCreatures(player).find((c) => c.instanceId === release)
  if (target === undefined) return 'リリース対象がいない'
  if (target.attached.length < need) return `リリース元のエネルギーが足りない（${need}個必要）`

  // 出す姫神は、リリース元のエネルギーとダメージ0で登場する（案B）
  const placed: Creature = { ...makeCreature(state, cardId), attached: target.attached }
  const hand = [...player.hand.slice(0, handIndex), ...player.hand.slice(handIndex + 1)]
  // エネルギーはカードではない（別ゾーン）。トラッシュに入れると総数20枚の不変条件が壊れる
  const discard = [...player.discard, target.cardId]

  // 提案どおり「メインをリリースしたらメインに、バックならバックに置く」
  const inActive = player.active !== null && player.active.instanceId === release
  const updated: PlayerState = inActive
    ? { ...player, hand, active: placed, discard }
    : { ...player, hand, discard, bench: player.bench.map((c) => (c.instanceId === release ? placed : c)) }

  return withPlayer({ ...state, nextInstanceId: state.nextInstanceId + 1 }, id, updated)
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

  const resume = state.phase.resume
  if (queue.length > 0) return { ...next, phase: { kind: 'promote', queue, resume } }
  return afterPromote({ ...next, phase: { kind: 'main' } }, resume)
}

function reduceMain(state: GameState, action: PlayerAction): GameState {
  if (action.player !== state.current) return reject(state, action, '手番ではない')
  const id = state.current
  const player = playerAt(state, id)

  switch (action.type) {
    case 'playCreature': {
      const result = action.release === null
        ? placeFromHand(state, id, action.handIndex, 'bench')
        : releaseAndPlace(state, id, action.handIndex, action.release)
      if (typeof result === 'string') return reject(state, action, result)
      return log(result, id, 'playCreature', '')
    }

    case 'attachEnergy': {
      if (player.attachedThisTurn) return reject(state, action, 'このターンは付与済み')
      const energy = player.energy.current
      if (energy === null) return reject(state, action, 'エネルギーの在庫がない')

      const target = allCreatures(player).find((c) => c.instanceId === action.target)
      if (target === undefined) return reject(state, action, '対象がいない')

      const attached = updateCreature(player, action.target, (c) => ({
        ...c,
        attached: [...c.attached, energy],
      }))
      const updated: PlayerState = {
        ...attached,
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

      const cost = requireCreature(active.cardId).retreatCost
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

    case 'playItem':
    case 'playAction': {
      const kind = action.type === 'playItem' ? 'item' : 'action'
      if (kind === 'action' && player.usedActionThisTurn) {
        return reject(state, action, 'このターンは行動カードを使用済み')
      }
      const cardId = player.hand[action.handIndex]
      if (cardId === undefined) return reject(state, action, '手札の範囲外')
      const card = findCard(cardId)
      if (card === undefined) return reject(state, action, '未知のカード')
      if (card.kind !== kind) return reject(state, action, `${kind} ではない`)

      // 先に手札から抜いてトラッシュへ送る。効果でドローしても位置がずれない
      const hand = [...player.hand.slice(0, action.handIndex), ...player.hand.slice(action.handIndex + 1)]
      const updated: PlayerState = {
        ...player,
        hand,
        discard: [...player.discard, cardId],
        usedActionThisTurn: kind === 'action' ? true : player.usedActionThisTurn,
      }
      const played = log(withPlayer(state, id, updated), id, kind, card.name)
      const resolved = applyEffects(played, id, card.effects)
      // ターンは終わらせない。倒れた個体だけ片付けて手番を続ける
      return resolveInTurn(resolved, id)
    }

    case 'useUltimate': {
      const error = ultimateError(state, id, action.handIndex)
      if (error !== null) return reject(state, action, error)
      return performUltimate(state, id, action.handIndex)
    }

    case 'endTurn':
      return finishTurn(log(state, id, 'endTurn', ''), id)

    case 'attack': {
      const error = attackError(state, id, action.attackIndex)
      if (error !== null) return reject(state, action, error)
      return performAttack(state, id, action.attackIndex)
    }

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
      p.usedActionThisTurn ? '1' : '0',
    ].join(';')

  const phase =
    state.phase.kind === 'promote'
      ? `promote(${state.phase.queue.join(',')}/${state.phase.resume})`
      : state.phase.kind

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
            // 実験: 配置フェーズはレアリティ制限なし（案A）。
            // コモン限定にすると引き分けが 18.9% に跳ね上がり、終局保証テストが落ちる
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

      // 実験（レアリティ召喚）: コモンは空きベンチへそのまま、レア以上はリリース元と組で出す
      player.hand.forEach((cardId, handIndex) => {
        const card = findCard(cardId)
        if (card?.kind !== 'creature') return
        const need = RELEASE_COST[card.rarity] ?? 0
        if (need === 0) {
          if (player.bench.length < BENCH_SIZE) {
            out.push({ type: 'playCreature', player: id, handIndex, release: null })
          }
          return
        }
        for (const c of allCreatures(player)) {
          if (c.attached.length >= need) {
            out.push({ type: 'playCreature', player: id, handIndex, release: c.instanceId })
          }
        }
      })

      if (!player.attachedThisTurn && player.energy.current !== null) {
        for (const c of allCreatures(player)) out.push({ type: 'attachEnergy', player: id, target: c.instanceId })
      }

      const active = player.active
      if (active !== null && !player.retreatedThisTurn) {
        const cost = requireCreature(active.cardId).retreatCost
        if (active.attached.length >= cost) {
          player.bench.forEach((_, benchIndex) => out.push({ type: 'retreat', player: id, benchIndex }))
        }
      }

      // 先攻1ターン目は攻撃できない（SPEC 3.3）
      if (active !== null && !(state.turn === 1 && id === state.firstPlayer)) {
        requireCreature(active.cardId).attacks.forEach((attack, attackIndex) => {
          if (canPayCost(active.attached, attack.cost)) out.push({ type: 'attack', player: id, attackIndex })
        })
      }

      // アイテムは枚数制限なし、行動は1ターン1枚（SPEC 16.8 Q9・Q10）
      player.hand.forEach((cardId, handIndex) => {
        const card = findCard(cardId)
        if (card === undefined) return
        if (card.kind === 'item') out.push({ type: 'playItem', player: id, handIndex })
        if (card.kind === 'action' && !player.usedActionThisTurn) {
          out.push({ type: 'playAction', player: id, handIndex })
        }
        if (card.kind === 'ultimate' && ultimateError(state, id, handIndex) === null) {
          out.push({ type: 'useUltimate', player: id, handIndex })
        }
      })

      out.push({ type: 'endTurn', player: id })
      return out
    }
  }
}
