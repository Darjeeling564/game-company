/**
 * カード定義。効果はすべてデータで表現し、関数や switch を書かない（CLAUDE.md 4章）。
 * 解釈は core/effects.ts に一元化されているため、カード追加時にロジックを触る必要はない。
 *
 * モチーフは世界の神話から8系統（日本・エジプト・北欧・インド・中東・クトゥルフ・
 * ギリシア・中国）を取り、各系統5枚ずつ均等に配分する。炎は火と太陽と破壊、
 * 草は大地と豊穣、水は海と河、無色は眷属という対応（SPEC 14章 Q6）。
 * 各カードの由来はコメントに残す。
 *
 * 弱点は 草→炎→水→草 の3すくみ（SPEC 8.2）。
 */
import type { CardDef, CardId, CardIndex } from '../core/types.ts'

// ------------------------------------------------ 無色: 眷属（全デッキ共通のコア）

const COLORLESS: readonly CardDef[] = [
  {
    id: 'n001', name: 'ガルダ', kind: 'creature',  // インド（迦楼羅）
    type: 'colorless', hp: 80, ex: false, retreatCost: 1, weakness: 'lightning', stage: 0,
    attacks: [
      { name: 'へびとりのつめ', cost: ['colorless'], effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
    ],
  },
  {
    id: 'n002', name: 'ペガソス', kind: 'creature',  // ギリシア（天馬）
    type: 'colorless', hp: 60, ex: false, retreatCost: 1, weakness: 'fighting', stage: 0,
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
    type: 'colorless', hp: 120, ex: false, retreatCost: 3, weakness: 'fighting', stage: 0,
    attacks: [
      { name: 'くらいつく', cost: ['colorless', 'colorless'], effects: [{ type: 'damage', target: 'opponentActive', value: 30 }] },
      { name: 'むさぼりぐい', cost: ['colorless', 'colorless', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 70 }] },
    ],
  },
  {
    id: 'n004', name: 'パズズ', kind: 'creature',  // 中東（風の魔神）
    type: 'colorless', hp: 90, ex: false, retreatCost: 1, weakness: 'lightning', stage: 0,
    attacks: [
      { name: 'あくふうのやいば', cost: ['colorless', 'colorless'],
        effects: [{ type: 'damagePerHeads', target: 'opponentActive', count: 2, value: 30 }] },
    ],
  },
]

// ------------------------------------------------ 炎: 火・太陽・破壊

const FIRE: readonly CardDef[] = [
  {
    id: 'f001', name: 'シュクユウ', kind: 'creature',  // 中国（祝融・火の神）
    type: 'fire', hp: 80, ex: false, retreatCost: 1, weakness: 'water', stage: 0,
    attacks: [
      { name: 'なんぽうのほのお', cost: ['fire'], effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
    ],
  },
  {
    id: 'f002', name: 'ラー', kind: 'creature',  // エジプト（太陽神）
    type: 'fire', hp: 90, ex: false, retreatCost: 1, weakness: 'water', stage: 0,
    attacks: [
      { name: 'たいようのつばさ', cost: ['colorless'], effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
      { name: 'にちりんのこうき', cost: ['fire', 'colorless'], effects: [{ type: 'damage', target: 'opponentActive', value: 40 }] },
    ],
  },
  {
    id: 'f003', name: 'ハスター', kind: 'creature',  // クトゥルフ（黄衣の王）
    type: 'fire', hp: 80, ex: false, retreatCost: 1, weakness: 'water', stage: 0,
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
    type: 'fire', hp: 130, ex: false, retreatCost: 2, weakness: 'water', stage: 0,
    attacks: [
      { name: 'レーヴァテイン', cost: ['fire', 'fire'], effects: [{ type: 'damage', target: 'opponentActive', value: 50 }] },
    ],
  },
  {
    id: 'f005', name: 'カグツチ', kind: 'creature',  // 日本（迦具土）
    type: 'fire', hp: 120, ex: false, retreatCost: 2, weakness: 'water', stage: 0,
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
    type: 'fire', hp: 180, ex: true, retreatCost: 2, weakness: 'water', stage: 0,
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
  {
    id: 'f007', name: 'アグニ', kind: 'creature',  // インド（火の神）
    type: 'fire', hp: 100, ex: false, retreatCost: 2, weakness: 'water', stage: 0,
    attacks: [
      { name: 'ごまのほのお', cost: ['fire', 'colorless'], effects: [{ type: 'damage', target: 'opponentActive', value: 40 }] },
    ],
  },
  {
    id: 'f008', name: 'ヘパイストス', kind: 'creature',  // ギリシア（鍛冶の神）
    type: 'fire', hp: 110, ex: false, retreatCost: 2, weakness: 'water', stage: 0,
    attacks: [
      { name: 'かじのつち', cost: ['fire', 'colorless'], effects: [{ type: 'damage', target: 'opponentActive', value: 30 }] },
      { name: 'しんぴのぶき', cost: ['fire', 'fire', 'colorless'], effects: [{ type: 'damage', target: 'opponentActive', value: 60 }] },
    ],
  },
  {
    id: 'f009', name: 'セクメト', kind: 'creature',  // エジプト（破壊の女神）
    type: 'fire', hp: 90, ex: false, retreatCost: 1, weakness: 'water', stage: 0,
    attacks: [
      { name: 'しゃくねつのきば', cost: ['fire'], effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
      { name: 'いかりのつめ', cost: ['fire', 'colorless'], effects: [{ type: 'damage', target: 'opponentActive', value: 40 }] },
    ],
  },
  {
    id: 'f010', name: 'クトゥグア', kind: 'creature',  // クトゥルフ（生ける炎）
    type: 'fire', hp: 100, ex: false, retreatCost: 2, weakness: 'water', stage: 0,
    attacks: [
      { name: 'せいえんのうねり', cost: ['fire', 'colorless'],
        effects: [{ type: 'damagePerHeads', target: 'opponentActive', count: 2, value: 30 }] },
    ],
  },
  {
    id: 'f011', name: 'ネルガル', kind: 'creature',  // 中東（冥界と戦の神）
    type: 'fire', hp: 110, ex: false, retreatCost: 2, weakness: 'water', stage: 0,
    attacks: [
      { name: 'めいかいのほのお', cost: ['fire', 'colorless'],
        effects: [
          { type: 'damage', target: 'opponentActive', value: 30 },
          { type: 'applyStatus', target: 'opponentActive', status: 'poisoned' },
        ] },
    ],
  },
  {
    id: 'f012', name: 'アマテラス', kind: 'creature',  // 日本（天照大御神）
    type: 'fire', hp: 120, ex: false, retreatCost: 2, weakness: 'water', stage: 0,
    attacks: [
      { name: 'あまてらすのひかり', cost: ['fire', 'colorless'], effects: [{ type: 'damage', target: 'opponentActive', value: 40 }] },
      { name: 'たかまがはら', cost: ['fire', 'fire', 'colorless'], effects: [{ type: 'damage', target: 'opponentActive', value: 70 }] },
    ],
  },
]

// ------------------------------------------------ 草: 大地・豊穣

const GRASS: readonly CardDef[] = [
  {
    id: 'g001', name: 'デメテル', kind: 'creature',  // ギリシア（豊穣の女神）
    type: 'grass', hp: 80, ex: false, retreatCost: 1, weakness: 'fire', stage: 0,
    attacks: [
      { name: 'みのりのつち', cost: ['grass'], effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
    ],
  },
  {
    id: 'g002', name: 'ドゥムジ', kind: 'creature',  // 中東（牧羊と植物の神）
    type: 'grass', hp: 100, ex: false, retreatCost: 2, weakness: 'fire', stage: 0,
    attacks: [
      { name: 'わかばのむち', cost: ['grass', 'colorless'], effects: [{ type: 'damage', target: 'opponentActive', value: 30 }] },
    ],
  },
  {
    id: 'g003', name: 'ヴァースキ', kind: 'creature',  // インド（蛇王）
    type: 'grass', hp: 90, ex: false, retreatCost: 1, weakness: 'fire', stage: 0,
    attacks: [
      { name: 'まきつく', cost: ['grass'], effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
      { name: 'じゃおうのむち', cost: ['grass', 'colorless'], effects: [{ type: 'damage', target: 'opponentActive', value: 40 }] },
    ],
  },
  {
    id: 'g004', name: 'シュブニグラス', kind: 'creature',  // クトゥルフ（黒山羊）
    type: 'grass', hp: 80, ex: false, retreatCost: 1, weakness: 'fire', stage: 0,
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
    type: 'grass', hp: 120, ex: false, retreatCost: 2, weakness: 'fire', stage: 0,
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
    type: 'grass', hp: 170, ex: true, retreatCost: 2, weakness: 'fire', stage: 0,
    attacks: [
      { name: 'せかいじゅのいかり', cost: ['grass', 'grass'], effects: [{ type: 'damage', target: 'opponentActive', value: 60 }] },
      { name: 'だいちのうねり', cost: ['grass', 'grass', 'colorless'],
        effects: [
          { type: 'damage', target: 'opponentActive', value: 80 },
          { type: 'damage', target: 'opponentBenchAll', value: 10 },
        ] },
    ],
  },
  {
    id: 'g007', name: 'オオゲツヒメ', kind: 'creature',  // 日本（大宜都比売・穀物の女神）
    type: 'grass', hp: 100, ex: false, retreatCost: 2, weakness: 'fire', stage: 0,
    attacks: [
      { name: 'ごこくのめぐみ', cost: ['grass', 'colorless'],
        effects: [
          { type: 'damage', target: 'opponentActive', value: 30 },
          { type: 'draw', value: 1 },
        ] },
    ],
  },
  {
    id: 'g008', name: 'イズン', kind: 'creature',  // 北欧（若返りの林檎の女神）
    type: 'grass', hp: 90, ex: false, retreatCost: 1, weakness: 'fire', stage: 0,
    attacks: [
      { name: 'わかがえりのりんご', cost: ['grass'],
        effects: [
          { type: 'damage', target: 'opponentActive', value: 20 },
          { type: 'heal', target: 'self', value: 10 },   // 回復 < ダメージ。膠着を防ぐ
        ] },
    ],
  },
  {
    id: 'g009', name: 'シェンノウ', kind: 'creature',  // 中国（神農・農耕と薬草の神）
    type: 'grass', hp: 110, ex: false, retreatCost: 2, weakness: 'fire', stage: 0,
    attacks: [
      { name: 'ひゃくそうのどく', cost: ['grass', 'colorless'],
        effects: [
          { type: 'damage', target: 'opponentActive', value: 20 },
          { type: 'applyStatus', target: 'opponentActive', status: 'poisoned' },
        ] },
    ],
  },
  {
    id: 'g010', name: 'セイオウボ', kind: 'creature',  // 中国（西王母・不老の桃）
    type: 'grass', hp: 120, ex: false, retreatCost: 2, weakness: 'fire', stage: 0,
    attacks: [
      { name: 'ばんねんのもも', cost: ['grass', 'colorless'],
        effects: [
          { type: 'damage', target: 'opponentActive', value: 30 },
          { type: 'heal', target: 'self', value: 20 },   // 回復 < ダメージ。膠着を防ぐ
        ] },
    ],
  },
  {
    id: 'g011', name: 'ツァトゥグア', kind: 'creature',  // クトゥルフ（地底に眠るもの）
    type: 'grass', hp: 100, ex: false, retreatCost: 2, weakness: 'fire', stage: 0,
    attacks: [
      { name: 'ねばつくやみ', cost: ['grass', 'colorless'],
        effects: [
          { type: 'damage', target: 'opponentActive', value: 30 },
          { type: 'discardEnergy', target: 'opponentActive', value: 1 },
        ] },
    ],
  },
  {
    id: 'g012', name: 'パン', kind: 'creature',  // ギリシア（牧神）
    type: 'grass', hp: 90, ex: false, retreatCost: 1, weakness: 'fire', stage: 0,
    attacks: [
      { name: 'きょうふのふえ', cost: ['grass'], effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
      { name: 'もりのらんぶ', cost: ['grass', 'colorless'],
        effects: [{ type: 'damagePerHeads', target: 'opponentActive', count: 2, value: 30 }] },
    ],
  },
]

// ------------------------------------------------ 水: 海・河

const WATER: readonly CardDef[] = [
  {
    id: 'w001', name: 'ワタツミ', kind: 'creature',  // 日本（綿津見・海神）
    type: 'water', hp: 110, ex: false, retreatCost: 2, weakness: 'grass', stage: 0,
    attacks: [
      { name: 'しおのながれ', cost: ['water', 'colorless'], effects: [{ type: 'damage', target: 'opponentActive', value: 30 }] },
    ],
  },
  {
    id: 'w002', name: 'ポセイドン', kind: 'creature',  // ギリシア（海の神）
    type: 'water', hp: 130, ex: false, retreatCost: 2, weakness: 'grass', stage: 0,
    attacks: [
      { name: 'さんさのやり', cost: ['water', 'water'], effects: [{ type: 'damage', target: 'opponentActive', value: 50 }] },
    ],
  },
  {
    id: 'w003', name: 'ヨルムンガンド', kind: 'creature',  // 北欧（世界蛇）
    type: 'water', hp: 120, ex: false, retreatCost: 2, weakness: 'grass', stage: 0,
    attacks: [
      { name: 'どくのしぶき', cost: ['water'],
        effects: [
          { type: 'damage', target: 'opponentActive', value: 20 },
          { type: 'applyStatus', target: 'opponentActive', status: 'poisoned' },
        ] },
      { name: 'うみへびのとぐろ', cost: ['water', 'water', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 70 }] },
    ],
  },
  {
    id: 'w004', name: 'エーギル', kind: 'creature',  // 北欧（海の巨人）
    type: 'water', hp: 100, ex: false, retreatCost: 2, weakness: 'grass', stage: 0,
    attacks: [
      { name: 'たけりのなみ', cost: ['water', 'colorless'], effects: [{ type: 'damage', target: 'opponentActive', value: 40 }] },
    ],
  },
  {
    id: 'w005', name: 'ソベク', kind: 'creature',  // エジプト（ワニの神）
    type: 'water', hp: 90, ex: false, retreatCost: 1, weakness: 'grass', stage: 0,
    attacks: [
      { name: 'かみつく', cost: ['water'], effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
      { name: 'あぎと', cost: ['water', 'colorless'], effects: [{ type: 'damage', target: 'opponentActive', value: 40 }] },
    ],
  },
  {
    id: 'w006', name: 'ハピ', kind: 'creature',  // エジプト（ナイルの氾濫）
    type: 'water', hp: 110, ex: false, retreatCost: 2, weakness: 'grass', stage: 0,
    attacks: [
      { name: 'はんらんのめぐみ', cost: ['water', 'colorless'],
        effects: [
          { type: 'damage', target: 'opponentActive', value: 30 },
          { type: 'draw', value: 1 },
        ] },
    ],
  },
  {
    id: 'w007', name: 'ヴァルナ', kind: 'creature',  // インド（水と法の神）
    type: 'water', hp: 100, ex: false, retreatCost: 2, weakness: 'grass', stage: 0,
    attacks: [
      { name: 'りっぽうのなわ', cost: ['water', 'colorless'],
        effects: [
          { type: 'damage', target: 'opponentActive', value: 30 },
          { type: 'discardEnergy', target: 'opponentActive', value: 1 },
        ] },
    ],
  },
  {
    id: 'w008', name: 'ガンガー', kind: 'creature',  // インド（河の女神）
    type: 'water', hp: 90, ex: false, retreatCost: 1, weakness: 'grass', stage: 0,
    attacks: [
      { name: 'せいりゅうのしずく', cost: ['water'],
        effects: [
          { type: 'damage', target: 'opponentActive', value: 20 },
          { type: 'heal', target: 'self', value: 10 },   // 回復 < ダメージ。膠着を防ぐ
        ] },
    ],
  },
  {
    id: 'w009', name: 'ティアマト', kind: 'creature',  // 中東（原初の海）
    type: 'water', hp: 120, ex: false, retreatCost: 2, weakness: 'grass', stage: 0,
    attacks: [
      { name: 'げんしょのしお', cost: ['water', 'colorless'], effects: [{ type: 'damage', target: 'opponentActive', value: 40 }] },
    ],
  },
  {
    id: 'w010', name: 'アプスー', kind: 'creature',  // 中東（地下の淡水）
    type: 'water', hp: 100, ex: false, retreatCost: 2, weakness: 'grass', stage: 0,
    attacks: [
      { name: 'ちていのみず', cost: ['water', 'colorless'],
        effects: [{ type: 'damagePerHeads', target: 'opponentActive', count: 2, value: 30 }] },
    ],
  },
  {
    id: 'w011', name: 'クトゥルフEX', kind: 'creature',  // クトゥルフ（旧支配者）
    type: 'water', hp: 180, ex: true, retreatCost: 3, weakness: 'grass', stage: 0,
    attacks: [
      { name: 'きょうきのささやき', cost: ['water', 'water'],
        effects: [{ type: 'damagePerHeads', target: 'opponentActive', count: 2, value: 40 }] },
      { name: 'るるいえのめざめ', cost: ['water', 'water', 'colorless'],
        effects: [
          { type: 'damage', target: 'opponentActive', value: 90 },
          { type: 'damage', target: 'opponentBenchAll', value: 10 },
          { type: 'selfDamage', value: 20 },
        ] },
    ],
  },
  {
    id: 'w012', name: 'ゴンゴン', kind: 'creature',  // 中国（共工・水神）
    type: 'water', hp: 110, ex: false, retreatCost: 2, weakness: 'grass', stage: 0,
    attacks: [
      { name: 'こうずいのいかり', cost: ['water', 'colorless'], effects: [{ type: 'damage', target: 'opponentActive', value: 30 }] },
      { name: 'てんばしらをくだく', cost: ['water', 'water', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 60 }] },
    ],
  },
]

export const CARDS: readonly CardDef[] = [...COLORLESS, ...FIRE, ...GRASS, ...WATER]

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
export const WATER_IDS = WATER.map((c) => c.id)
