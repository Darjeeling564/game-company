/**
 * カード定義。効果はすべてデータで表現し、関数や switch を書かない（CLAUDE.md 4章）。
 * 解釈は core/effects.ts に一元化されているため、カード追加時にロジックを触る必要はない。
 *
 * v1 は「遊べる最小プール」の16種（無色4・炎6・草6）。本格的な量産は
 * core とテストが安定してから行う（SPEC 8.1）。
 */
import type { CardDef, CardId, CardIndex } from '../core/types.ts'

// ------------------------------------------------ 無色（両デッキ共通のコア）

const COLORLESS: readonly CardDef[] = [
  {
    id: 'n001', name: 'ノラガラス', kind: 'creature',
    type: 'colorless', hp: 60, ex: false, retreatCost: 1, weakness: 'lightning', stage: 0,
    attacks: [
      { name: 'つつく', cost: ['colorless'], effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
    ],
  },
  {
    id: 'n002', name: 'ハネネズミ', kind: 'creature',
    type: 'colorless', hp: 50, ex: false, retreatCost: 1, weakness: 'fighting', stage: 0,
    attacks: [
      { name: 'ひっかき', cost: ['colorless'], effects: [{ type: 'damage', target: 'opponentActive', value: 10 }] },
      { name: 'とっしん', cost: ['colorless', 'colorless'],
        effects: [
          { type: 'damage', target: 'opponentActive', value: 40 },
          { type: 'selfDamage', value: 10 },
        ] },
    ],
  },
  {
    id: 'n003', name: 'イシコロベエ', kind: 'creature',
    type: 'colorless', hp: 90, ex: false, retreatCost: 3, weakness: 'fighting', stage: 0,
    attacks: [
      { name: 'ころがる', cost: ['colorless', 'colorless'], effects: [{ type: 'damage', target: 'opponentActive', value: 30 }] },
      { name: 'のしかかり', cost: ['colorless', 'colorless', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 70 }] },
    ],
  },
  {
    id: 'n004', name: 'カゼキリ', kind: 'creature',
    type: 'colorless', hp: 70, ex: false, retreatCost: 1, weakness: 'lightning', stage: 0,
    attacks: [
      { name: 'かまいたち', cost: ['colorless', 'colorless'],
        effects: [{ type: 'damagePerHeads', target: 'opponentActive', count: 2, value: 30 }] },
    ],
  },
]

// ------------------------------------------------ 炎

const FIRE: readonly CardDef[] = [
  {
    id: 'f001', name: 'ホムラトカゲ', kind: 'creature',
    type: 'fire', hp: 60, ex: false, retreatCost: 1, weakness: 'water', stage: 0,
    attacks: [
      { name: 'ひのこ', cost: ['fire'], effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
    ],
  },
  {
    id: 'f002', name: 'スミビドリ', kind: 'creature',
    type: 'fire', hp: 70, ex: false, retreatCost: 1, weakness: 'water', stage: 0,
    attacks: [
      { name: 'つばさでうつ', cost: ['colorless'], effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
      { name: 'かえんばね', cost: ['fire', 'colorless'], effects: [{ type: 'damage', target: 'opponentActive', value: 40 }] },
    ],
  },
  {
    id: 'f003', name: 'ヒノコウモリ', kind: 'creature',
    type: 'fire', hp: 60, ex: false, retreatCost: 1, weakness: 'water', stage: 0,
    attacks: [
      { name: 'どくのキバ', cost: ['fire'],
        effects: [
          { type: 'damage', target: 'opponentActive', value: 10 },
          { type: 'applyStatus', target: 'opponentActive', status: 'poisoned' },
        ] },
    ],
  },
  {
    id: 'f004', name: 'カエンウシ', kind: 'creature',
    type: 'fire', hp: 100, ex: false, retreatCost: 2, weakness: 'water', stage: 0,
    attacks: [
      { name: 'ほのおのつの', cost: ['fire', 'fire'], effects: [{ type: 'damage', target: 'opponentActive', value: 50 }] },
    ],
  },
  {
    id: 'f005', name: 'カガリグマ', kind: 'creature',
    type: 'fire', hp: 90, ex: false, retreatCost: 2, weakness: 'water', stage: 0,
    attacks: [
      { name: 'ひっかく', cost: ['fire', 'colorless'], effects: [{ type: 'damage', target: 'opponentActive', value: 30 }] },
      { name: 'ほのおのいぶき', cost: ['fire', 'fire', 'colorless'],
        effects: [
          { type: 'damage', target: 'opponentActive', value: 70 },
          { type: 'discardEnergy', target: 'self', value: 1 },
        ] },
    ],
  },
  {
    id: 'f006', name: 'カガリグマEX', kind: 'creature',
    type: 'fire', hp: 140, ex: true, retreatCost: 2, weakness: 'water', stage: 0,
    attacks: [
      { name: 'バーンラッシュ', cost: ['fire', 'fire'],
        effects: [{ type: 'damagePerHeads', target: 'opponentActive', count: 2, value: 40 }] },
      { name: 'フレアバースト', cost: ['fire', 'fire', 'colorless'],
        effects: [
          { type: 'damage', target: 'opponentActive', value: 90 },
          { type: 'damage', target: 'opponentBenchAll', value: 10 },
          { type: 'selfDamage', value: 20 },
        ] },
    ],
  },
]

// ------------------------------------------------ 草

const GRASS: readonly CardDef[] = [
  {
    id: 'g001', name: 'モリネズミ', kind: 'creature',
    type: 'grass', hp: 60, ex: false, retreatCost: 1, weakness: 'fire', stage: 0,
    attacks: [
      { name: 'たいあたり', cost: ['grass'], effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
    ],
  },
  {
    id: 'g002', name: 'コケカブト', kind: 'creature',
    type: 'grass', hp: 80, ex: false, retreatCost: 2, weakness: 'fire', stage: 0,
    attacks: [
      { name: 'からではさむ', cost: ['grass', 'colorless'], effects: [{ type: 'damage', target: 'opponentActive', value: 30 }] },
    ],
  },
  {
    id: 'g003', name: 'ツタヘビ', kind: 'creature',
    type: 'grass', hp: 70, ex: false, retreatCost: 1, weakness: 'fire', stage: 0,
    attacks: [
      { name: 'まきつく', cost: ['grass'], effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
      { name: 'つたのムチ', cost: ['grass', 'colorless'], effects: [{ type: 'damage', target: 'opponentActive', value: 40 }] },
    ],
  },
  {
    id: 'g004', name: 'ハナグモ', kind: 'creature',
    type: 'grass', hp: 60, ex: false, retreatCost: 1, weakness: 'fire', stage: 0,
    attacks: [
      { name: 'しびれあみ', cost: ['grass'],
        effects: [
          { type: 'damage', target: 'opponentActive', value: 10 },
          { type: 'applyStatus', target: 'opponentActive', status: 'poisoned' },
        ] },
    ],
  },
  {
    id: 'g005', name: 'ワタスギ', kind: 'creature',
    type: 'grass', hp: 90, ex: false, retreatCost: 2, weakness: 'fire', stage: 0,
    attacks: [
      { name: 'わたほうし', cost: ['grass', 'colorless'],
        effects: [
          { type: 'damage', target: 'opponentActive', value: 30 },
          { type: 'heal', target: 'self', value: 20 },
        ] },
    ],
  },
  {
    id: 'g006', name: 'モリオウEX', kind: 'creature',
    type: 'grass', hp: 130, ex: true, retreatCost: 2, weakness: 'fire', stage: 0,
    attacks: [
      { name: 'もりのいかり', cost: ['grass', 'grass'], effects: [{ type: 'damage', target: 'opponentActive', value: 60 }] },
      { name: 'だいちのうねり', cost: ['grass', 'grass', 'colorless'],
        effects: [
          { type: 'damage', target: 'opponentActive', value: 80 },
          { type: 'damage', target: 'opponentBenchAll', value: 10 },
        ] },
    ],
  },
]

export const CARDS: readonly CardDef[] = [...COLORLESS, ...FIRE, ...GRASS]

export const CARD_INDEX: CardIndex = new Map(CARDS.map((c) => [c.id, c]))

export function findCard(id: CardId): CardDef | undefined {
  return CARD_INDEX.get(id)
}

/** 存在しない cardId は状態の破損を意味するため、呼び出し側で潰す */
export function requireCard(id: CardId): CardDef {
  const card = CARD_INDEX.get(id)
  if (card === undefined) throw new Error(`unknown card: ${id}`)
  return card
}

export const COLORLESS_IDS = COLORLESS.map((c) => c.id)
export const FIRE_IDS = FIRE.map((c) => c.id)
export const GRASS_IDS = GRASS.map((c) => c.id)
