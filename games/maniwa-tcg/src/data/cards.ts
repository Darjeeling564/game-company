/**
 * カード定義。効果はすべてデータで表現し、関数や switch を書かない（CLAUDE.md 4章）。
 * 解釈は core/effects.ts に一元化されているため、カード追加時にロジックを触る必要はない。
 *
 * v1 は「遊べる最小プール」の16種（無色4・炎6・草6）。本格的な量産は
 * core とテストが安定してから行う（SPEC 8.1）。
 *
 * モチーフは世界の神話から8系統（日本・エジプト・北欧・インド・中東・クトゥルフ・
 * ギリシア・中国）を取り、各系統2枚ずつ配分する。炎は火と鍛冶と破壊、草は大地と
 * 豊穣と蛇、無色は眷属という対応で、タイプごとの性格づけと噛み合わせている
 * （SPEC 14章 Q6）。各カードの由来はコメントに残す。
 */
import type { CardDef, CardId, CardIndex } from '../core/types.ts'

// ------------------------------------------------ 無色: 眷属（両デッキ共通のコア）

const COLORLESS: readonly CardDef[] = [
  {
    id: 'n001', name: 'ガルダ', kind: 'creature',  // インド（迦楼羅）
    type: 'colorless', hp: 60, ex: false, retreatCost: 1, weakness: 'lightning', stage: 0,
    attacks: [
      { name: 'へびとりのつめ', cost: ['colorless'], effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
    ],
  },
  {
    id: 'n002', name: 'ペガソス', kind: 'creature',  // ギリシア（天馬）
    type: 'colorless', hp: 50, ex: false, retreatCost: 1, weakness: 'fighting', stage: 0,
    attacks: [
      { name: 'ひづめうち', cost: ['colorless'], effects: [{ type: 'damage', target: 'opponentActive', value: 10 }] },
      { name: 'てんがけ', cost: ['colorless', 'colorless'],
        effects: [
          { type: 'damage', target: 'opponentActive', value: 40 },
          { type: 'selfDamage', value: 10 },
        ] },
    ],
  },
  {
    id: 'n003', name: 'タオテツ', kind: 'creature',  // 中国（饕餮）
    type: 'colorless', hp: 90, ex: false, retreatCost: 3, weakness: 'fighting', stage: 0,
    attacks: [
      { name: 'くらいつく', cost: ['colorless', 'colorless'], effects: [{ type: 'damage', target: 'opponentActive', value: 30 }] },
      { name: 'むさぼりぐい', cost: ['colorless', 'colorless', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 70 }] },
    ],
  },
  {
    id: 'n004', name: 'パズズ', kind: 'creature',  // 中東（風の魔神）
    type: 'colorless', hp: 70, ex: false, retreatCost: 1, weakness: 'lightning', stage: 0,
    attacks: [
      { name: 'あくふうのやいば', cost: ['colorless', 'colorless'],
        effects: [{ type: 'damagePerHeads', target: 'opponentActive', count: 2, value: 30 }] },
    ],
  },
]

// ------------------------------------------------ 炎: 火と鍛冶

const FIRE: readonly CardDef[] = [
  {
    id: 'f001', name: 'シュクユウ', kind: 'creature',  // 中国（祝融・火の神）
    type: 'fire', hp: 60, ex: false, retreatCost: 1, weakness: 'water', stage: 0,
    attacks: [
      { name: 'なんぽうのほのお', cost: ['fire'], effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
    ],
  },
  {
    id: 'f002', name: 'ラー', kind: 'creature',  // エジプト（太陽神）
    type: 'fire', hp: 70, ex: false, retreatCost: 1, weakness: 'water', stage: 0,
    attacks: [
      { name: 'たいようのつばさ', cost: ['colorless'], effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
      { name: 'にちりんのこうき', cost: ['fire', 'colorless'], effects: [{ type: 'damage', target: 'opponentActive', value: 40 }] },
    ],
  },
  {
    id: 'f003', name: 'ハスター', kind: 'creature',  // クトゥルフ（黄衣の王）
    type: 'fire', hp: 60, ex: false, retreatCost: 1, weakness: 'water', stage: 0,
    attacks: [
      { name: 'きいろのいぶき', cost: ['fire'],
        effects: [
          { type: 'damage', target: 'opponentActive', value: 10 },
          { type: 'applyStatus', target: 'opponentActive', status: 'poisoned' },
        ] },
    ],
  },
  {
    id: 'f004', name: 'スルト', kind: 'creature',  // 北欧（炎の巨人）
    type: 'fire', hp: 100, ex: false, retreatCost: 2, weakness: 'water', stage: 0,
    attacks: [
      { name: 'レーヴァテイン', cost: ['fire', 'fire'], effects: [{ type: 'damage', target: 'opponentActive', value: 50 }] },
    ],
  },
  {
    id: 'f005', name: 'カグツチ', kind: 'creature',  // 日本（迦具土）
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
    id: 'f006', name: 'カグツチEX', kind: 'creature',  // 日本（迦具土）
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
    id: 'g001', name: 'デメテル', kind: 'creature',  // ギリシア（豊穣の女神）
    type: 'grass', hp: 60, ex: false, retreatCost: 1, weakness: 'fire', stage: 0,
    attacks: [
      { name: 'みのりのつち', cost: ['grass'], effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
    ],
  },
  {
    id: 'g002', name: 'ドゥムジ', kind: 'creature',  // 中東（牧羊と植物の神）
    type: 'grass', hp: 80, ex: false, retreatCost: 2, weakness: 'fire', stage: 0,
    attacks: [
      { name: 'わかばのむち', cost: ['grass', 'colorless'], effects: [{ type: 'damage', target: 'opponentActive', value: 30 }] },
    ],
  },
  {
    id: 'g003', name: 'ヴァースキ', kind: 'creature',  // インド（蛇王）
    type: 'grass', hp: 70, ex: false, retreatCost: 1, weakness: 'fire', stage: 0,
    attacks: [
      { name: 'まきつく', cost: ['grass'], effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
      { name: 'じゃおうのむち', cost: ['grass', 'colorless'], effects: [{ type: 'damage', target: 'opponentActive', value: 40 }] },
    ],
  },
  {
    id: 'g004', name: 'シュブニグラス', kind: 'creature',  // クトゥルフ（黒山羊）
    type: 'grass', hp: 60, ex: false, retreatCost: 1, weakness: 'fire', stage: 0,
    attacks: [
      { name: 'せんびきのこやぎ', cost: ['grass'],
        effects: [
          { type: 'damage', target: 'opponentActive', value: 10 },
          { type: 'applyStatus', target: 'opponentActive', status: 'poisoned' },
        ] },
    ],
  },
  {
    id: 'g005', name: 'オシリス', kind: 'creature',  // エジプト（再生の神）
    type: 'grass', hp: 90, ex: false, retreatCost: 2, weakness: 'fire', stage: 0,
    attacks: [
      { name: 'よみがえりのめぐみ', cost: ['grass', 'colorless'],
        effects: [
          { type: 'damage', target: 'opponentActive', value: 30 },
          { type: 'heal', target: 'self', value: 20 },
        ] },
    ],
  },
  {
    id: 'g006', name: 'ユグドラシルEX', kind: 'creature',  // 北欧（世界樹）
    type: 'grass', hp: 130, ex: true, retreatCost: 2, weakness: 'fire', stage: 0,
    attacks: [
      { name: 'せかいじゅのいかり', cost: ['grass', 'grass'], effects: [{ type: 'damage', target: 'opponentActive', value: 60 }] },
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
