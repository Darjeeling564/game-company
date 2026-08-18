/**
 * カード定義。効果はすべてデータで表現し、関数や switch を書かない（CLAUDE.md 4章）。
 * 解釈は core/effects.ts に一元化されているため、カード追加時にロジックを触る必要はない。
 *
 * モチーフは世界の神話から8系統（日本・エジプト・北欧・インド・中東・クトゥルフ・
 * ギリシア・中国）を取り、各系統5枚ずつ均等に配分する。神格はイラストの側で美少女として
 * 擬人化する（SPEC 9.2）。解説は擬人化の根拠になるので、出典の姿や持ち物を残しておく。炎は火と太陽と破壊、
 * 草は大地と豊穣、水は海と河、無色は眷属という対応（SPEC 14章 Q6）。
 * 系統（origin）とレアリティ（rarity）は項目として持つ。レアリティは HP とワザの
 * 期待値から算出し、全デッキ共通で2枚積みされる無色は稀少性が低いぶん1段下げている
 * （SPEC 8.3）。
 *
 * 弱点は 草→炎→水→草 の3すくみ（SPEC 8.2）。無色は3すくみの外側なので弱点を持たない。
 */
import type { CardDef, CardId, CardIndex, CreatureCard } from '../core/types.ts'
import { ACTIONS, ITEMS, ULTIMATES } from './support.ts'

// ------------------------------------------------ 無色: 眷属（全デッキ共通のコア）

const COLORLESS: readonly CreatureCard[] = [
  {
    id: 'n001', name: 'ガルダ', kind: 'creature',  // インド（迦楼羅）
    flavor: 'インドの霊鳥。蛇族ナーガを喰らう天の乗り物で、その翼は太陽を覆うという。',
    origin: 'india', rarity: 'common',
    type: 'colorless', hp: 80, ex: false, retreatCost: 1, weakness: null, stage: 0,
    attacks: [
      { name: 'へびとりのつめ', cost: ['colorless'], effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
    ],
  },
  {
    id: 'n002', name: 'ペガソス', kind: 'creature',  // ギリシア（天馬）
    flavor: 'メドゥーサの血から生まれた翼馬。蹄で大地を打つと泉が湧いたと伝わる。',
    origin: 'greece', rarity: 'common',
    type: 'colorless', hp: 60, ex: false, retreatCost: 1, weakness: null, stage: 0,
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
    flavor: '何でも食らう伝説の悪獣。青銅器に刻まれ、貪欲そのものを表す。',
    origin: 'china', rarity: 'rare',
    type: 'colorless', hp: 120, ex: false, retreatCost: 3, weakness: null, stage: 0,
    attacks: [
      { name: 'くらいつく', cost: ['colorless', 'colorless'], effects: [{ type: 'damage', target: 'opponentActive', value: 30 }] },
      { name: 'むさぼりぐい', cost: ['colorless', 'colorless', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 70 }] },
    ],
  },
  {
    id: 'n004', name: 'パズズ', kind: 'creature',  // 中東（風の魔神）
    flavor: '熱風と疫病を運ぶメソポタミアの魔神。一方で、他の魔を退ける護符にもなった。',
    origin: 'mesopotamia', rarity: 'common',
    type: 'colorless', hp: 90, ex: false, retreatCost: 1, weakness: null, stage: 0,
    attacks: [
      { name: 'あくふうのやいば', cost: ['colorless', 'colorless'],
        effects: [{ type: 'damagePerHeads', target: 'opponentActive', count: 2, value: 30 }] },
    ],
  },
]

// ------------------------------------------------ 炎: 火・太陽・破壊

const FIRE: readonly CreatureCard[] = [
  {
    id: 'f001', name: 'シュクユウ', kind: 'creature',  // 中国（祝融・火の神）
    flavor: '南方をつかさどる火の神。人に火の扱いを教えたとされる。',
    origin: 'china', rarity: 'common',
    type: 'fire', hp: 80, ex: false, retreatCost: 1, weakness: 'water', stage: 0,
    attacks: [
      { name: 'なんぽうのほのお', cost: ['fire'], effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
    ],
  },
  {
    id: 'f002', name: 'ラー', kind: 'creature',  // エジプト（太陽神）
    flavor: '昼は天空を舟で渡り、夜は冥界を巡る太陽そのもの。隼の頭を持つ。',
    origin: 'egypt', rarity: 'common',
    type: 'fire', hp: 90, ex: false, retreatCost: 1, weakness: 'water', stage: 0,
    attacks: [
      { name: 'たいようのつばさ', cost: ['colorless'], effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
      { name: 'にちりんのこうき', cost: ['fire', 'colorless'], effects: [{ type: 'damage', target: 'opponentActive', value: 40 }] },
    ],
  },
  {
    id: 'f003', name: 'ハスター', kind: 'creature',  // クトゥルフ（黄衣の王）
    flavor: '名を口にすることさえ憚られる存在。黄の印を見た者は正気を失うという。',
    origin: 'cthulhu', rarity: 'common',
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
    flavor: '世界の終わりに炎の剣レーヴァテインを振るい、大地を焼き尽くす巨人。',
    origin: 'norse', rarity: 'superRare',
    type: 'fire', hp: 130, ex: false, retreatCost: 2, weakness: 'water', stage: 0,
    attacks: [
      { name: 'レーヴァテイン', cost: ['fire', 'fire'], effects: [{ type: 'damage', target: 'opponentActive', value: 50 }] },
    ],
  },
  {
    id: 'f005', name: 'カグツチ', kind: 'creature',  // 日本（迦具土）
    flavor: '火の神。生まれ落ちる際に母イザナミを焼き、父イザナギに斬られた。',
    origin: 'japan', rarity: 'superRare',
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
    flavor: '斬られた血と亡骸から、さらに多くの神が生まれたという。火は滅ぼすと同時に生む。',
    origin: 'japan', rarity: 'ultra',
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
    flavor: '供物を天へ運ぶ祭火の神。二つの顔と七つの舌を持つと歌われる。',
    origin: 'india', rarity: 'rare',
    type: 'fire', hp: 100, ex: false, retreatCost: 2, weakness: 'water', stage: 0,
    attacks: [
      { name: 'ごまのほのお', cost: ['fire', 'colorless'], effects: [{ type: 'damage', target: 'opponentActive', value: 40 }] },
    ],
  },
  {
    id: 'f008', name: 'ヘパイストス', kind: 'creature',  // ギリシア（鍛冶の神）
    flavor: '神々の武具を打つ鍛冶の神。足は不自由だが、その腕に並ぶ者はいない。',
    origin: 'greece', rarity: 'rare',
    type: 'fire', hp: 110, ex: false, retreatCost: 2, weakness: 'water', stage: 0,
    attacks: [
      { name: 'かじのつち', cost: ['fire', 'colorless'], effects: [{ type: 'damage', target: 'opponentActive', value: 30 }] },
      { name: 'しんぴのぶき', cost: ['fire', 'fire', 'colorless'], effects: [{ type: 'damage', target: 'opponentActive', value: 60 }] },
    ],
  },
  {
    id: 'f009', name: 'セクメト', kind: 'creature',  // エジプト（破壊の女神）
    flavor: '雌獅子の頭を持つ戦の女神。ラーの怒りが形をとった姿とされる。',
    origin: 'egypt', rarity: 'common',
    type: 'fire', hp: 90, ex: false, retreatCost: 1, weakness: 'water', stage: 0,
    attacks: [
      { name: 'しゃくねつのきば', cost: ['fire'], effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
      { name: 'いかりのつめ', cost: ['fire', 'colorless'], effects: [{ type: 'damage', target: 'opponentActive', value: 40 }] },
    ],
  },
  {
    id: 'f010', name: 'クトゥグア', kind: 'creature',  // クトゥルフ（生ける炎）
    flavor: '星々の彼方に棲む生ける炎。呼ばれれば、その場のすべてを灼き尽くす。',
    origin: 'cthulhu', rarity: 'common',
    type: 'fire', hp: 100, ex: false, retreatCost: 2, weakness: 'water', stage: 0,
    attacks: [
      { name: 'せいえんのうねり', cost: ['fire', 'colorless'],
        effects: [{ type: 'damagePerHeads', target: 'opponentActive', count: 2, value: 30 }] },
    ],
  },
  {
    id: 'f011', name: 'ネルガル', kind: 'creature',  // 中東（冥界と戦の神）
    flavor: '疫病と戦をもたらす神。冥界を妃エレシュキガルとともに治める。',
    origin: 'mesopotamia', rarity: 'rare',
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
    flavor: '高天原を治める太陽の女神。岩戸に隠れると、世は闇に包まれた。',
    origin: 'japan', rarity: 'superRare',
    type: 'fire', hp: 120, ex: false, retreatCost: 2, weakness: 'water', stage: 0,
    attacks: [
      { name: 'あまてらすのひかり', cost: ['fire', 'colorless'], effects: [{ type: 'damage', target: 'opponentActive', value: 40 }] },
      { name: 'たかまがはら', cost: ['fire', 'fire', 'colorless'], effects: [{ type: 'damage', target: 'opponentActive', value: 70 }] },
    ],
  },
]

// ------------------------------------------------ 草: 大地・豊穣

const GRASS: readonly CreatureCard[] = [
  {
    id: 'g001', name: 'デメテル', kind: 'creature',  // ギリシア（豊穣の女神）
    flavor: '穀物を育てる大地の女神。娘を奪われ嘆いた季節が、冬になったという。',
    origin: 'greece', rarity: 'common',
    type: 'grass', hp: 80, ex: false, retreatCost: 1, weakness: 'fire', stage: 0,
    attacks: [
      { name: 'みのりのつち', cost: ['grass'], effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
    ],
  },
  {
    id: 'g002', name: 'ドゥムジ', kind: 'creature',  // 中東（牧羊と植物の神）
    flavor: '半年を冥界で過ごす植物の神。その往復が、草木の枯死と再生を表す。',
    origin: 'mesopotamia', rarity: 'common',
    type: 'grass', hp: 100, ex: false, retreatCost: 2, weakness: 'fire', stage: 0,
    attacks: [
      { name: 'わかばのむち', cost: ['grass', 'colorless'], effects: [{ type: 'damage', target: 'opponentActive', value: 30 }] },
    ],
  },
  {
    id: 'g003', name: 'ヴァースキ', kind: 'creature',  // インド（蛇王）
    flavor: 'ナーガの王。乳海を攪拌する際、山に巻きつく綱の役を担った。',
    origin: 'india', rarity: 'common',
    type: 'grass', hp: 90, ex: false, retreatCost: 1, weakness: 'fire', stage: 0,
    attacks: [
      { name: 'まきつく', cost: ['grass'], effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
      { name: 'じゃおうのむち', cost: ['grass', 'colorless'], effects: [{ type: 'damage', target: 'opponentActive', value: 40 }] },
    ],
  },
  {
    id: 'g004', name: 'シュブニグラス', kind: 'creature',  // クトゥルフ（黒山羊）
    flavor: '千匹の仔を孕む森の黒山羊。豊穣であることが、そのまま恐怖になる。',
    origin: 'cthulhu', rarity: 'common',
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
    flavor: '弟に殺され、妃イシスによって蘇った。以来、冥界と再生をつかさどる。',
    origin: 'egypt', rarity: 'rare',
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
    flavor: '九つの世界を貫く大樹。根を齧られ蛇に噛まれてなお、立ち続ける。',
    origin: 'norse', rarity: 'ultra',
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
    flavor: '食物の女神。その亡骸から、稲・粟・小豆・麦・大豆が生まれた。',
    origin: 'japan', rarity: 'rare',
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
    flavor: '神々に若さを保つ黄金の林檎を配る。彼女を失えば、神々さえ老いる。',
    origin: 'norse', rarity: 'rare',
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
    flavor: '農耕を教えた神。自ら百草を嘗めて、薬と毒を見分けたという。',
    origin: 'china', rarity: 'common',
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
    flavor: '崑崙山に住まう女仙。三千年に一度実る、不老の桃を管理する。',
    origin: 'china', rarity: 'rare',
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
    flavor: '地底の洞で微睡む、蟇に似た神。動くことをひどく厭う。',
    origin: 'cthulhu', rarity: 'rare',
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
    flavor: '山羊の脚を持つ野の神。その叫びは、理由なき恐慌の語源になった。',
    origin: 'greece', rarity: 'common',
    type: 'grass', hp: 90, ex: false, retreatCost: 1, weakness: 'fire', stage: 0,
    attacks: [
      { name: 'きょうふのふえ', cost: ['grass'], effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
      { name: 'もりのらんぶ', cost: ['grass', 'colorless'],
        effects: [{ type: 'damagePerHeads', target: 'opponentActive', count: 2, value: 30 }] },
    ],
  },
]

// ------------------------------------------------ 水: 海・河

const WATER: readonly CreatureCard[] = [
  {
    id: 'w001', name: 'ワタツミ', kind: 'creature',  // 日本（綿津見・海神）
    flavor: '海をつかさどる神。海底の宮で山幸彦を迎え、潮を操る珠を授けた。',
    origin: 'japan', rarity: 'common',
    type: 'water', hp: 110, ex: false, retreatCost: 2, weakness: 'grass', stage: 0,
    attacks: [
      { name: 'しおのながれ', cost: ['water', 'colorless'], effects: [{ type: 'damage', target: 'opponentActive', value: 30 }] },
    ],
  },
  {
    id: 'w002', name: 'ポセイドン', kind: 'creature',  // ギリシア（海の神）
    flavor: '三叉の矛で海と地震を支配する。争えば、大地さえ揺らぐ。',
    origin: 'greece', rarity: 'superRare',
    type: 'water', hp: 130, ex: false, retreatCost: 2, weakness: 'grass', stage: 0,
    attacks: [
      { name: 'さんさのやり', cost: ['water', 'water'], effects: [{ type: 'damage', target: 'opponentActive', value: 50 }] },
    ],
  },
  {
    id: 'w003', name: 'ヨルムンガンド', kind: 'creature',  // 北欧（世界蛇）
    flavor: '大地を取り巻くほど巨大な毒蛇。自らの尾を咥えて海に横たわる。',
    origin: 'norse', rarity: 'superRare',
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
    flavor: '海そのものを体現する巨人。神々を招き、大釜で酒を醸した。',
    origin: 'norse', rarity: 'rare',
    type: 'water', hp: 100, ex: false, retreatCost: 2, weakness: 'grass', stage: 0,
    attacks: [
      { name: 'たけりのなみ', cost: ['water', 'colorless'], effects: [{ type: 'damage', target: 'opponentActive', value: 40 }] },
    ],
  },
  {
    id: 'w005', name: 'ソベク', kind: 'creature',  // エジプト（ワニの神）
    flavor: 'ナイルのワニの姿をとる神。荒々しくも、水辺に実りをもたらす。',
    origin: 'egypt', rarity: 'common',
    type: 'water', hp: 90, ex: false, retreatCost: 1, weakness: 'grass', stage: 0,
    attacks: [
      { name: 'かみつく', cost: ['water'], effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
      { name: 'あぎと', cost: ['water', 'colorless'], effects: [{ type: 'damage', target: 'opponentActive', value: 40 }] },
    ],
  },
  {
    id: 'w006', name: 'ハピ', kind: 'creature',  // エジプト（ナイルの氾濫）
    flavor: '毎年の氾濫を運ぶ神。その水が引いたあとに、肥沃な土が残る。',
    origin: 'egypt', rarity: 'rare',
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
    flavor: '天則を見張る神。偽りを働く者を、水の縄で縛るという。',
    origin: 'india', rarity: 'rare',
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
    flavor: '天から降る聖河の化身。シヴァの髪が、その奔流を受け止めた。',
    origin: 'india', rarity: 'rare',
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
    flavor: '万物を生んだ塩水の海。裂かれた体から、天と地が形づくられた。',
    origin: 'mesopotamia', rarity: 'rare',
    type: 'water', hp: 120, ex: false, retreatCost: 2, weakness: 'grass', stage: 0,
    attacks: [
      { name: 'げんしょのしお', cost: ['water', 'colorless'], effects: [{ type: 'damage', target: 'opponentActive', value: 40 }] },
    ],
  },
  {
    id: 'w010', name: 'アプスー', kind: 'creature',  // 中東（地下の淡水）
    flavor: 'ティアマトと対をなす淡水の淵。すべての水源の父とされる。',
    origin: 'mesopotamia', rarity: 'common',
    type: 'water', hp: 100, ex: false, retreatCost: 2, weakness: 'grass', stage: 0,
    attacks: [
      { name: 'ちていのみず', cost: ['water', 'colorless'],
        effects: [{ type: 'damagePerHeads', target: 'opponentActive', count: 2, value: 30 }] },
    ],
  },
  {
    id: 'w011', name: 'クトゥルフEX', kind: 'creature',  // クトゥルフ（旧支配者）
    flavor: '海底都市ルルイエで、死してなお夢見る者。星が正しく並ぶとき目覚める。',
    origin: 'cthulhu', rarity: 'ultra',
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
    flavor: '争いに敗れ、天を支える柱を折った水神。天は傾き、水は東へ流れた。',
    origin: 'china', rarity: 'rare',
    type: 'water', hp: 110, ex: false, retreatCost: 2, weakness: 'grass', stage: 0,
    attacks: [
      { name: 'こうずいのいかり', cost: ['water', 'colorless'], effects: [{ type: 'damage', target: 'opponentActive', value: 30 }] },
      { name: 'てんばしらをくだく', cost: ['water', 'water', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 60 }] },
    ],
  },
]

/** キャラ */
export const CREATURES: readonly CreatureCard[] = [...COLORLESS, ...FIRE, ...GRASS, ...WATER]

export const CARDS: readonly CardDef[] = [...CREATURES, ...ITEMS, ...ACTIONS, ...ULTIMATES]

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

/**
 * 場に出ている個体のカードを引く。個体はクリーチャーからしか作られないので、
 * ここで種別を絞っておけば呼び出し側が毎回 kind を確かめずに済む。
 * 種別が違えば状態の破損なので、そのまま落とす。
 */
export function requireCreature(id: CardId): CreatureCard {
  const card = requireCard(id)
  if (card.kind !== 'creature') throw new Error(`not a creature: ${id}`)
  return card
}

export const ITEM_IDS = ITEMS.map((c) => c.id)
export const ACTION_IDS = ACTIONS.map((c) => c.id)
export const ULTIMATE_IDS = ULTIMATES.map((c) => c.id)

export const COLORLESS_IDS = COLORLESS.map((c) => c.id)
export const FIRE_IDS = FIRE.map((c) => c.id)
export const GRASS_IDS = GRASS.map((c) => c.id)
export const WATER_IDS = WATER.map((c) => c.id)
