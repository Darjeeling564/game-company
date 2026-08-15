/**
 * カード定義。効果はすべてデータで表現し、関数や switch を書かない（CLAUDE.md 4章）。
 * 解釈は core/effects.ts に一元化されているため、カード追加時にロジックを触る必要はない。
 *
 * v1 は「遊べる最小プール」の16種（無色4・炎6・草6）。本格的な量産は
 * core とテストが安定してから行う（SPEC 8.1）。
 *
 * モチーフは日本神話・伝承で統一する。炎は火と鍛冶の神、草は大地と木の神、
 * 無色は両デッキ共通の眷属にあたる（SPEC 14章 Q6）。
 */
import type { CardDef, CardId, CardIndex } from '../core/types.ts'

// ------------------------------------------------ 無色: 眷属（両デッキ共通のコア）

const COLORLESS: readonly CardDef[] = [
  {
    id: 'n001', name: 'ヤタガラス', kind: 'creature',
    type: 'colorless', hp: 60, ex: false, retreatCost: 1, weakness: 'lightning', stage: 0,
    attacks: [
      { name: 'みちびき', cost: ['colorless'], effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
    ],
  },
  {
    id: 'n002', name: 'シロウサギ', kind: 'creature',
    type: 'colorless', hp: 50, ex: false, retreatCost: 1, weakness: 'fighting', stage: 0,
    attacks: [
      { name: 'しろのつめ', cost: ['colorless'], effects: [{ type: 'damage', target: 'opponentActive', value: 10 }] },
      { name: 'かけぬけ', cost: ['colorless', 'colorless'],
        effects: [
          { type: 'damage', target: 'opponentActive', value: 40 },
          { type: 'selfDamage', value: 10 },
        ] },
    ],
  },
  {
    id: 'n003', name: 'イワナガヒメ', kind: 'creature',
    type: 'colorless', hp: 90, ex: false, retreatCost: 3, weakness: 'fighting', stage: 0,
    attacks: [
      { name: 'いわおとし', cost: ['colorless', 'colorless'], effects: [{ type: 'damage', target: 'opponentActive', value: 30 }] },
      { name: 'とこしえのおもみ', cost: ['colorless', 'colorless', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 70 }] },
    ],
  },
  {
    id: 'n004', name: 'シナツヒコ', kind: 'creature',
    type: 'colorless', hp: 70, ex: false, retreatCost: 1, weakness: 'lightning', stage: 0,
    attacks: [
      { name: 'かまいたち', cost: ['colorless', 'colorless'],
        effects: [{ type: 'damagePerHeads', target: 'opponentActive', count: 2, value: 30 }] },
    ],
  },
]

// ------------------------------------------------ 炎: 火と鍛冶

const FIRE: readonly CardDef[] = [
  {
    id: 'f001', name: 'ホノアカリ', kind: 'creature',
    type: 'fire', hp: 60, ex: false, retreatCost: 1, weakness: 'water', stage: 0,
    attacks: [
      { name: 'ほのあかり', cost: ['fire'], effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
    ],
  },
  {
    id: 'f002', name: 'キンシ', kind: 'creature',
    type: 'fire', hp: 70, ex: false, retreatCost: 1, weakness: 'water', stage: 0,
    attacks: [
      { name: 'こがねのつばさ', cost: ['colorless'], effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
      { name: 'きんしのせんこう', cost: ['fire', 'colorless'], effects: [{ type: 'damage', target: 'opponentActive', value: 40 }] },
    ],
  },
  {
    id: 'f003', name: 'ヨモツシコメ', kind: 'creature',
    type: 'fire', hp: 60, ex: false, retreatCost: 1, weakness: 'water', stage: 0,
    attacks: [
      { name: 'よもつのいぶき', cost: ['fire'],
        effects: [
          { type: 'damage', target: 'opponentActive', value: 10 },
          { type: 'applyStatus', target: 'opponentActive', status: 'poisoned' },
        ] },
    ],
  },
  {
    id: 'f004', name: 'アマツマラ', kind: 'creature',
    type: 'fire', hp: 100, ex: false, retreatCost: 2, weakness: 'water', stage: 0,
    attacks: [
      { name: 'ふいごのほのお', cost: ['fire', 'fire'], effects: [{ type: 'damage', target: 'opponentActive', value: 50 }] },
    ],
  },
  {
    id: 'f005', name: 'カグツチ', kind: 'creature',
    type: 'fire', hp: 90, ex: false, retreatCost: 2, weakness: 'water', stage: 0,
    attacks: [
      { name: 'ひのつめ', cost: ['fire', 'colorless'], effects: [{ type: 'damage', target: 'opponentActive', value: 30 }] },
      { name: 'ほむらのいぶき', cost: ['fire', 'fire', 'colorless'],
        effects: [
          { type: 'damage', target: 'opponentActive', value: 70 },
          { type: 'discardEnergy', target: 'self', value: 1 },
        ] },
    ],
  },
  {
    id: 'f006', name: 'カグツチEX', kind: 'creature',
    type: 'fire', hp: 140, ex: true, retreatCost: 2, weakness: 'water', stage: 0,
    attacks: [
      { name: 'ほむらのつるぎ', cost: ['fire', 'fire'],
        effects: [{ type: 'damagePerHeads', target: 'opponentActive', count: 2, value: 40 }] },
      { name: 'あまのおはばり', cost: ['fire', 'fire', 'colorless'],
        effects: [
          { type: 'damage', target: 'opponentActive', value: 90 },
          { type: 'damage', target: 'opponentBenchAll', value: 10 },
          { type: 'selfDamage', value: 20 },
        ] },
    ],
  },
]

// ------------------------------------------------ 草: 大地と木

const GRASS: readonly CardDef[] = [
  {
    id: 'g001', name: 'ハニヤス', kind: 'creature',
    type: 'grass', hp: 60, ex: false, retreatCost: 1, weakness: 'fire', stage: 0,
    attacks: [
      { name: 'つちくれ', cost: ['grass'], effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
    ],
  },
  {
    id: 'g002', name: 'ククノチ', kind: 'creature',
    type: 'grass', hp: 80, ex: false, retreatCost: 2, weakness: 'fire', stage: 0,
    attacks: [
      { name: 'こずえうち', cost: ['grass', 'colorless'], effects: [{ type: 'damage', target: 'opponentActive', value: 30 }] },
    ],
  },
  {
    id: 'g003', name: 'ノヅチ', kind: 'creature',
    type: 'grass', hp: 70, ex: false, retreatCost: 1, weakness: 'fire', stage: 0,
    attacks: [
      { name: 'まきつく', cost: ['grass'], effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
      { name: 'のづちのむち', cost: ['grass', 'colorless'], effects: [{ type: 'damage', target: 'opponentActive', value: 40 }] },
    ],
  },
  {
    id: 'g004', name: 'ツチグモ', kind: 'creature',
    type: 'grass', hp: 60, ex: false, retreatCost: 1, weakness: 'fire', stage: 0,
    attacks: [
      { name: 'しびれのいと', cost: ['grass'],
        effects: [
          { type: 'damage', target: 'opponentActive', value: 10 },
          { type: 'applyStatus', target: 'opponentActive', status: 'poisoned' },
        ] },
    ],
  },
  {
    id: 'g005', name: 'ワカムスヒ', kind: 'creature',
    type: 'grass', hp: 90, ex: false, retreatCost: 2, weakness: 'fire', stage: 0,
    attacks: [
      { name: 'みのりのめぐみ', cost: ['grass', 'colorless'],
        effects: [
          { type: 'damage', target: 'opponentActive', value: 30 },
          { type: 'heal', target: 'self', value: 20 },
        ] },
    ],
  },
  {
    id: 'g006', name: 'オオヤマツミEX', kind: 'creature',
    type: 'grass', hp: 130, ex: true, retreatCost: 2, weakness: 'fire', stage: 0,
    attacks: [
      { name: 'やまのいかり', cost: ['grass', 'grass'], effects: [{ type: 'damage', target: 'opponentActive', value: 60 }] },
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
