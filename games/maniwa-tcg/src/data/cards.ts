/**
 * キャラクターのカード定義。効果はすべてデータで表現し、関数や switch を書かない
 * （CLAUDE.md 4章）。解釈は core/effects.ts に一元化されているため、カード追加時に
 * ロジックを触る必要はない。
 *
 * 属性は9種（炎・森・風・土・雷・水・光・闇・無）。相性は core/types.ts の
 * WEAKNESS_CHART に1箇所だけ置き、カードは弱点を持たない（SPEC 17.4）。
 *
 * モチーフは世界の神話8系統（日本・エジプト・北欧・インド・中東・クトゥルフ・
 * ギリシア・中国）。属性ごとに8体、無8体の計72体で、どの属性にもどの系統にも
 * 偏りが出ないように配分している。神格はイラストの側で美少女として擬人化する
 * （SPEC 9.2）。解説は擬人化の根拠になるので、出典の姿や持ち物を残しておく。
 *
 * レアリティは HP とワザの期待値から決める（SPEC 8.3）。全デッキ共通で使われる
 * 無は稀少性が低いぶん1段下げている。
 *
 * ワザは「安い順」に並べる。AI が最後のワザを最強とみなす約束になっている。
 */
import type { CardDef, CardId, CardIndex, CreatureCard } from '../core/types.ts'
import { ACTIONS, ITEMS, ULTIMATES } from './support.ts'

// ------------------------------------------------ 炎
const FIRE: readonly CreatureCard[] = [
  {
    id: 'f001', name: 'カグツチ', kind: 'creature',
    flavor: '生まれ落ちた瞬間に母を焼いた火の神。切り裂かれた体からさらに神々が生まれた。',
    origin: 'japan', rarity: 'rare',
    type: 'fire', hp: 120, ex: false, retreatCost: 2, stage: 0,
    attacks: [
      { name: 'ひのこ', cost: ['fire'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 30 }] },
      { name: 'やきつくす', cost: ['fire', 'fire', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 70 }] },
    ],
  },
  {
    id: 'f002', name: 'カグツチEX', kind: 'creature',
    flavor: '荒ぶる火そのもの。鎮められてなお、封じた社の奥で熱を放ち続けている。',
    origin: 'japan', rarity: 'ultra',
    type: 'fire', hp: 180, ex: true, retreatCost: 3, stage: 0,
    attacks: [
      { name: 'ほむらのつるぎ', cost: ['fire', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 50 }] },
      { name: 'てんそうのほのお', cost: ['fire', 'fire', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 90 }, { type: 'damage', target: 'opponentBenchAll', value: 10 }] },
    ],
  },
  {
    id: 'f003', name: 'スルト', kind: 'creature',
    flavor: '世界の終わりに南方から現れ、炎の剣で大地を焼き尽くす巨人。',
    origin: 'norse', rarity: 'rare',
    type: 'fire', hp: 130, ex: false, retreatCost: 3, stage: 0,
    attacks: [
      { name: 'やいばのひらめき', cost: ['fire', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 40 }] },
      { name: 'レーヴァテイン', cost: ['fire', 'fire', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 80 }, { type: 'selfDamage', value: 10 }] },
    ],
  },
  {
    id: 'f004', name: 'アグニ', kind: 'creature',
    flavor: '七つの舌を持つ火の神。供物を焼いて神々へ届ける、天と地の使者。',
    origin: 'india', rarity: 'common',
    type: 'fire', hp: 100, ex: false, retreatCost: 2, stage: 0,
    attacks: [
      { name: 'ささげび', cost: ['fire'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 20 }, { type: 'draw', value: 1 }] },
      { name: 'しちまいのした', cost: ['fire', 'fire'],
        effects: [{ type: 'damagePerHeads', target: 'opponentActive', count: 2, value: 40 }] },
    ],
  },
  {
    id: 'f005', name: 'ヘパイストス', kind: 'creature',
    flavor: '足の悪い鍛冶の神。神々の武具はすべてこの手から生まれた。',
    origin: 'greece', rarity: 'rare',
    type: 'fire', hp: 110, ex: false, retreatCost: 2, stage: 0,
    attacks: [
      { name: 'つちのひとうち', cost: ['fire'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
      { name: 'たんれんのほのお', cost: ['fire', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 50 }, { type: 'discardEnergy', target: 'opponentActive', value: 1 }] },
    ],
  },
  {
    id: 'f006', name: 'シュクユウ', kind: 'creature',
    flavor: '南方をつかさどる火の神。人に火の扱いを教えたとされる。',
    origin: 'china', rarity: 'common',
    type: 'fire', hp: 80, ex: false, retreatCost: 1, stage: 0,
    attacks: [
      { name: 'なんぽうのほのお', cost: ['fire'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
      { name: 'ひをさずける', cost: ['fire', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 40 }] },
    ],
  },
  {
    id: 'f007', name: 'セクメト', kind: 'creature',
    flavor: '獅子の頭を持つ戦いの女神。怒りは疫病となって国を焼いた。',
    origin: 'egypt', rarity: 'common',
    type: 'fire', hp: 90, ex: false, retreatCost: 1, stage: 0,
    attacks: [
      { name: 'しし のつめ', cost: ['fire'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
      { name: 'やくびょうのいぶき', cost: ['fire', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 30 }, { type: 'applyStatus', target: 'opponentActive', status: 'poisoned' }] },
    ],
  },
  {
    id: 'f008', name: 'ギビル', kind: 'creature',
    flavor: '金属を精錬し、呪いを焼き払う火の神。裁きの場に立ち会う証人でもある。',
    origin: 'mesopotamia', rarity: 'common',
    type: 'fire', hp: 90, ex: false, retreatCost: 1, stage: 0,
    attacks: [
      { name: 'きよめのひ', cost: ['fire'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
      { name: 'るつぼ', cost: ['fire', 'fire'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 50 }] },
    ],
  },
  {
    id: 'f009', name: 'クトゥグア', kind: 'creature',
    flavor: '炎の精を率いる旧支配者。這い寄る混沌を焼くために、星の彼方から呼ばれた。',
    origin: 'cthulhu', rarity: 'common',
    type: 'fire', hp: 90, ex: false, retreatCost: 1, stage: 0,
    attacks: [
      { name: 'ひのたま', cost: ['fire'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
      { name: 'せいなるほのお', cost: ['fire', 'colorless'],
        effects: [
          { type: 'damage', target: 'opponentActive', value: 40 },
          { type: 'discardEnergy', target: 'opponentActive', value: 1 },
        ] },
    ],
  },
]

// ------------------------------------------------ 森
const FOREST: readonly CreatureCard[] = [
  {
    id: 's001', name: 'ユグドラシルEX', kind: 'creature',
    flavor: '九つの世界を貫く大樹。根は泉に届き、枝は天を覆う。',
    origin: 'norse', rarity: 'ultra',
    type: 'forest', hp: 170, ex: true, retreatCost: 3, stage: 0,
    attacks: [
      { name: 'ねをのばす', cost: ['forest', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 40 }, { type: 'heal', target: 'self', value: 10 }] },
      { name: 'せかいじゅのしんぱん', cost: ['forest', 'forest', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 100 }] },
    ],
  },
  {
    id: 's002', name: 'セイオウボ', kind: 'creature',
    flavor: '崑崙に住まう女仙。三千年に一度実る桃を管理している。',
    origin: 'china', rarity: 'superRare',
    type: 'forest', hp: 120, ex: false, retreatCost: 2, stage: 0,
    attacks: [
      { name: 'ばんとう', cost: ['forest'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 30 }, { type: 'heal', target: 'self', value: 20 }] },
      { name: 'ふろうのみ', cost: ['forest', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 60 }] },
    ],
  },
  {
    id: 's003', name: 'シュブニグラス', kind: 'creature',
    flavor: '千匹の仔を孕む森の黒山羊。豊穣と繁殖の名のもとに増え続ける。',
    origin: 'cthulhu', rarity: 'rare',
    type: 'forest', hp: 120, ex: false, retreatCost: 2, stage: 0,
    attacks: [
      { name: 'こやぎのむれ', cost: ['forest'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 20 }, { type: 'damage', target: 'opponentBenchRandom', value: 10 }] },
      { name: 'くろきめやぎ', cost: ['forest', 'forest', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 70 }] },
    ],
  },
  {
    id: 's004', name: 'パン', kind: 'creature',
    flavor: '山羊の脚を持つ牧神。その叫びは軍勢を恐慌に陥れた。',
    origin: 'greece', rarity: 'rare',
    type: 'forest', hp: 90, ex: false, retreatCost: 1, stage: 0,
    attacks: [
      { name: 'あしぶえ', cost: ['forest'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
      { name: 'パニックのさけび', cost: ['forest', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 50 }, { type: 'discardEnergy', target: 'opponentActive', value: 1 }] },
    ],
  },
  {
    id: 's005', name: 'ヴァースキ', kind: 'creature',
    flavor: '乳海を撹拌する綱にされた蛇王。締めつけられた口から毒を吐いた。',
    origin: 'india', rarity: 'common',
    type: 'forest', hp: 90, ex: false, retreatCost: 1, stage: 0,
    attacks: [
      { name: 'とぐろ', cost: ['forest'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
      { name: 'にゅうかいのつな', cost: ['forest', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 60 }, { type: 'selfDamage', value: 10 }] },
    ],
  },
  {
    id: 's006', name: 'オシリス', kind: 'creature',
    flavor: '殺され、繋ぎ合わされて甦った緑の肌の王。冥界と穀物をつかさどる。',
    origin: 'egypt', rarity: 'superRare',
    type: 'forest', hp: 120, ex: false, retreatCost: 2, stage: 0,
    attacks: [
      { name: 'あおきて', cost: ['forest'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 30 }, { type: 'heal', target: 'self', value: 10 }] },
      { name: 'よみがえり', cost: ['forest', 'forest'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 70 }, { type: 'heal', target: 'self', value: 10 }] },
    ],
  },
  {
    id: 's007', name: 'ククノチ', kind: 'creature',
    flavor: '木々を生み出した神。山に立つ一本一本にその名が宿るという。',
    origin: 'japan', rarity: 'common',
    type: 'forest', hp: 90, ex: false, retreatCost: 1, stage: 0,
    attacks: [
      { name: 'こだま', cost: ['forest'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
      { name: 'もりのいぶき', cost: ['forest', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 50 }] },
    ],
  },
  {
    id: 's008', name: 'フンババ', kind: 'creature',
    flavor: '杉の森を守る番人。七つの威光をまとい、侵す者を捉えて離さない。',
    origin: 'mesopotamia', rarity: 'rare',
    type: 'forest', hp: 110, ex: false, retreatCost: 2, stage: 0,
    attacks: [
      { name: 'もりのさけび', cost: ['forest'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 30 }] },
      { name: 'すぎのまもり', cost: ['forest', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 60 }, { type: 'heal', target: 'self', value: 10 }] },
    ],
  },
  {
    id: 's009', name: 'ダフネ', kind: 'creature',
    flavor: '追われて月桂樹に姿を変えた妖精。その葉は勝者の冠となり、枯れることがない。',
    origin: 'greece', rarity: 'rare',
    type: 'forest', hp: 110, ex: false, retreatCost: 1, stage: 0,
    attacks: [
      { name: 'わかばのまもり', cost: ['forest'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 20 }, { type: 'heal', target: 'self', value: 10 }] },
      { name: 'げっけいのかんむり', cost: ['forest', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 60 }] },
    ],
  },
]

// ------------------------------------------------ 風
const WIND: readonly CreatureCard[] = [
  {
    id: 'k001', name: 'パズズ', kind: 'creature',
    flavor: '熱風と疫病を運ぶ魔神。一方で、他の魔を退ける護符にもなった。',
    origin: 'mesopotamia', rarity: 'common',
    type: 'wind', hp: 100, ex: false, retreatCost: 1, stage: 0,
    attacks: [
      { name: 'あくふう', cost: ['wind'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 30 }] },
      { name: 'えきびょうのかぜ', cost: ['wind', 'colorless'],
        effects: [{ type: 'damagePerHeads', target: 'opponentActive', count: 2, value: 40 }] },
    ],
  },
  {
    id: 'k002', name: 'シナツヒコ', kind: 'creature',
    flavor: '国生みの霧を吹き払った風の神。その息が海を渡る船を押す。',
    origin: 'japan', rarity: 'rare',
    type: 'wind', hp: 100, ex: false, retreatCost: 1, stage: 0,
    attacks: [
      { name: 'いぶき', cost: ['wind'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
      { name: 'かみかぜ', cost: ['wind', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 50 }, { type: 'discardEnergy', target: 'opponentActive', value: 1 }] },
    ],
  },
  {
    id: 'k003', name: 'ヴァーユ', kind: 'creature',
    flavor: '生類の息を司る風神。千頭の馬に引かせた車で天を駆ける。',
    origin: 'india', rarity: 'superRare',
    type: 'wind', hp: 110, ex: false, retreatCost: 1, stage: 0,
    attacks: [
      { name: 'しっぷう', cost: ['wind'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 30 }] },
      { name: 'せんりのかぜ', cost: ['wind', 'wind'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 70 }, { type: 'draw', value: 1 }] },
    ],
  },
  {
    id: 'k004', name: 'アイオロス', kind: 'creature',
    flavor: '風を革袋に封じて管理する島の王。解き放てば船は行き先を失う。',
    origin: 'greece', rarity: 'common',
    type: 'wind', hp: 110, ex: false, retreatCost: 1, stage: 0,
    attacks: [
      { name: 'かぜのふくろ', cost: ['wind'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 30 }] },
      { name: 'よっつのかぜ', cost: ['wind', 'colorless'],
        effects: [{ type: 'damagePerHeads', target: 'opponentActive', count: 2, value: 40 }] },
    ],
  },
  {
    id: 'k005', name: 'シュウ', kind: 'creature',
    flavor: '天と地の間に立ち、両者を引き離し続ける大気の神。',
    origin: 'egypt', rarity: 'superRare',
    type: 'wind', hp: 110, ex: false, retreatCost: 1, stage: 0,
    attacks: [
      { name: 'たいきをささえる', cost: ['wind'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 20 }, { type: 'heal', target: 'self', value: 10 }] },
      { name: 'てんちをわかつ', cost: ['wind', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 70 }] },
    ],
  },
  {
    id: 'k006', name: 'ハスターEX', kind: 'creature',
    flavor: '名を口にすることさえ憚られる存在。黄の印を見た者は正気を失う。',
    origin: 'cthulhu', rarity: 'ultra',
    type: 'wind', hp: 170, ex: true, retreatCost: 2, stage: 0,
    attacks: [
      { name: 'きいろのしるし', cost: ['wind', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 40 }, { type: 'discardEnergy', target: 'opponentActive', value: 1 }] },
      { name: 'かぜにのるもの', cost: ['wind', 'wind', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 100 }, { type: 'applyStatus', target: 'opponentActive', status: 'poisoned' }] },
    ],
  },
  {
    id: 'k007', name: 'ニョルズ', kind: 'creature',
    flavor: '航海と豊漁をつかさどる神。祈れば風は必ず追い風に変わる。',
    origin: 'norse', rarity: 'superRare',
    type: 'wind', hp: 120, ex: false, retreatCost: 2, stage: 0,
    attacks: [
      { name: 'しおかぜ', cost: ['wind'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 30 }] },
      { name: 'じゅんぷう', cost: ['wind', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 60 }, { type: 'draw', value: 1 }] },
    ],
  },
  {
    id: 'k008', name: 'フェイリェン', kind: 'creature',
    flavor: '風伯と呼ばれる風の司。鹿の体に雀の頭を持つ姿で描かれる。',
    origin: 'china', rarity: 'rare',
    type: 'wind', hp: 100, ex: false, retreatCost: 1, stage: 0,
    attacks: [
      { name: 'つむじかぜ', cost: ['wind'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
      { name: 'ふうはくのまい', cost: ['wind', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 60 }] },
    ],
  },
]

// ------------------------------------------------ 土
const EARTH: readonly CreatureCard[] = [
  {
    id: 'e001', name: 'デメテル', kind: 'creature',
    flavor: '穀物の女神。娘を奪われた嘆きが、大地から実りを消し去った。',
    origin: 'greece', rarity: 'superRare',
    type: 'earth', hp: 120, ex: false, retreatCost: 2, stage: 0,
    attacks: [
      { name: 'みのりのつえ', cost: ['earth'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 30 }] },
      { name: 'だいちのなげき', cost: ['earth', 'earth'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 60 }, { type: 'discardEnergy', target: 'opponentActive', value: 1 }] },
    ],
  },
  {
    id: 'e002', name: 'オオゲツヒメ', kind: 'creature',
    flavor: '体から食物を生み出す女神。斬られた亡骸から五穀が芽吹いた。',
    origin: 'japan', rarity: 'common',
    type: 'earth', hp: 100, ex: false, retreatCost: 1, stage: 0,
    attacks: [
      { name: 'もてなし', cost: ['earth'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 20 }, { type: 'heal', target: 'self', value: 10 }] },
      { name: 'ごこくのめぐみ', cost: ['earth', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 50 }] },
    ],
  },
  {
    id: 'e003', name: 'シェンノウ', kind: 'creature',
    flavor: '農耕と医薬を教えた神農。百草を舐めて薬と毒を見分けたという。',
    origin: 'china', rarity: 'common',
    type: 'earth', hp: 110, ex: false, retreatCost: 2, stage: 0,
    attacks: [
      { name: 'くわのひとふり', cost: ['earth'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
      { name: 'ひゃくそうをなめる', cost: ['earth', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 40 }, { type: 'heal', target: 'self', value: 10 }] },
    ],
  },
  {
    id: 'e004', name: 'ゲブ', kind: 'creature',
    flavor: '横たわる大地そのものである神。笑うと地が揺れると言われた。',
    origin: 'egypt', rarity: 'rare',
    type: 'earth', hp: 110, ex: false, retreatCost: 2, stage: 0,
    attacks: [
      { name: 'だいちのせなか', cost: ['earth'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
      { name: 'じしん', cost: ['earth', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 40 }, { type: 'damage', target: 'opponentBenchAll', value: 10 }] },
    ],
  },
  {
    id: 'e005', name: 'ニンフルサグ', kind: 'creature',
    flavor: '粘土から人を形づくった大地の母。傷を癒す術も彼女のものだ。',
    origin: 'mesopotamia', rarity: 'common',
    type: 'earth', hp: 100, ex: false, retreatCost: 1, stage: 0,
    attacks: [
      { name: 'つちくれ', cost: ['earth'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
      { name: 'いのちをかたどる', cost: ['earth', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 40 }, { type: 'heal', target: 'self', value: 20 }] },
    ],
  },
  {
    id: 'e006', name: 'プリティヴィー', kind: 'creature',
    flavor: '広大な大地の女神。すべてを載せて揺るがぬ、最も古い神の一柱。',
    origin: 'india', rarity: 'common',
    type: 'earth', hp: 100, ex: false, retreatCost: 1, stage: 0,
    attacks: [
      { name: 'ふみしめる', cost: ['earth'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
      { name: 'だいちのかご', cost: ['earth', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 40 }] },
    ],
  },
  {
    id: 'e007', name: 'ヨルズ', kind: 'creature',
    flavor: '雷神の母である大地の女神。荒々しい力の源はここにある。',
    origin: 'norse', rarity: 'common',
    type: 'earth', hp: 110, ex: false, retreatCost: 2, stage: 0,
    attacks: [
      { name: 'いわつぶて', cost: ['earth'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
      { name: 'だいちのちから', cost: ['earth', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 50 }] },
    ],
  },
  {
    id: 'e008', name: 'ツァトゥグアEX', kind: 'creature',
    flavor: '地底の洞窟に眠る蟇蛙めいた神。眠りを妨げた者は闇に呑まれる。',
    origin: 'cthulhu', rarity: 'ultra',
    type: 'earth', hp: 170, ex: true, retreatCost: 3, stage: 0,
    attacks: [
      { name: 'ちていのねむり', cost: ['earth', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 40 }, { type: 'heal', target: 'self', value: 20 }] },
      { name: 'くろきどろ', cost: ['earth', 'earth', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 90 }, { type: 'discardEnergy', target: 'opponentActive', value: 1 }] },
    ],
  },
]

// ------------------------------------------------ 雷
const THUNDER: readonly CreatureCard[] = [
  {
    id: 't001', name: 'スサノオ', kind: 'creature',
    flavor: '海原を追われた嵐の神。八岐大蛇を退治し、その尾から剣を得た。',
    origin: 'japan', rarity: 'superRare',
    type: 'thunder', hp: 120, ex: false, retreatCost: 2, stage: 0,
    attacks: [
      { name: 'あらぶる', cost: ['thunder'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 30 }] },
      { name: 'あめのむらくも', cost: ['thunder', 'thunder'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 70 }] },
    ],
  },
  {
    id: 't002', name: 'インドラ', kind: 'creature',
    flavor: '金剛杵を振るう雷神。旱魃の蛇を討ち、堰き止められた水を解き放った。',
    origin: 'india', rarity: 'superRare',
    type: 'thunder', hp: 120, ex: false, retreatCost: 2, stage: 0,
    attacks: [
      { name: 'ヴァジュラ', cost: ['thunder'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 30 }] },
      { name: 'らいじんのいかり', cost: ['thunder', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 50 }, { type: 'discardEnergy', target: 'opponentActive', value: 1 }] },
    ],
  },
  {
    id: 't003', name: 'ゼウスEX', kind: 'creature',
    flavor: '神々の王。振り下ろす雷霆に逆らえる者は、天にも地にもいない。',
    origin: 'greece', rarity: 'ultra',
    type: 'thunder', hp: 180, ex: true, retreatCost: 3, stage: 0,
    attacks: [
      { name: 'らくらい', cost: ['thunder', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 50 }] },
      { name: 'しんいのいかずち', cost: ['thunder', 'thunder', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 90 }, { type: 'selfDamage', value: 10 }] },
    ],
  },
  {
    id: 't004', name: 'トール', kind: 'creature',
    flavor: '赤髭の雷神。投げた槌は必ず手元に戻り、巨人の頭を砕き続ける。',
    origin: 'norse', rarity: 'rare',
    type: 'thunder', hp: 130, ex: false, retreatCost: 3, stage: 0,
    attacks: [
      { name: 'ミョルニル', cost: ['thunder', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 40 }] },
      { name: 'かみなりのつち', cost: ['thunder', 'thunder', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 70 }] },
    ],
  },
  {
    id: 't005', name: 'アダド', kind: 'creature',
    flavor: '嵐と雨をもたらす神。恵みの雨も、都を沈める洪水も同じ手による。',
    origin: 'mesopotamia', rarity: 'common',
    type: 'thunder', hp: 100, ex: false, retreatCost: 1, stage: 0,
    attacks: [
      { name: 'いなびかり', cost: ['thunder'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
      { name: 'あらしをよぶ', cost: ['thunder', 'colorless'],
        effects: [{ type: 'damagePerHeads', target: 'opponentActive', count: 2, value: 40 }] },
    ],
  },
  {
    id: 't006', name: 'レイコウ', kind: 'creature',
    flavor: '連太鼓を背負う雷公。罰を受けるべき者を選んで雷を落とす。',
    origin: 'china', rarity: 'common',
    type: 'thunder', hp: 90, ex: false, retreatCost: 1, stage: 0,
    attacks: [
      { name: 'たいこをうつ', cost: ['thunder'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
      { name: 'らいこうのばち', cost: ['thunder', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 40 }] },
    ],
  },
  {
    id: 't007', name: 'セト', kind: 'creature',
    flavor: '砂漠と嵐を統べる神。兄を殺した簒奪者でありながら、太陽の船も守る。',
    origin: 'egypt', rarity: 'rare',
    type: 'thunder', hp: 110, ex: false, retreatCost: 2, stage: 0,
    attacks: [
      { name: 'すなあらし', cost: ['thunder'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
      { name: 'こんとんのやり', cost: ['thunder', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 40 }, { type: 'applyStatus', target: 'opponentActive', status: 'poisoned' }] },
    ],
  },
  {
    id: 't008', name: 'イタクァ', kind: 'creature',
    flavor: '極北の空を渡る巨人。連れ去られた者は、遠い空から凍って落ちてくる。',
    origin: 'cthulhu', rarity: 'rare',
    type: 'thunder', hp: 110, ex: false, retreatCost: 1, stage: 0,
    attacks: [
      { name: 'こごえるかぜ', cost: ['thunder'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
      { name: 'かぜをわたるもの', cost: ['thunder', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 50 }, { type: 'discardEnergy', target: 'opponentActive', value: 1 }] },
    ],
  },
]

// ------------------------------------------------ 水
const WATER: readonly CreatureCard[] = [
  {
    id: 'w001', name: 'ポセイドン', kind: 'creature',
    flavor: '海と地震をつかさどる神。矛で海底を突けば、大陸すら揺れる。',
    origin: 'greece', rarity: 'superRare',
    type: 'water', hp: 130, ex: false, retreatCost: 3, stage: 0,
    attacks: [
      { name: 'みつまたのほこ', cost: ['water', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 40 }] },
      { name: 'だいかいしょう', cost: ['water', 'water', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 80 }] },
    ],
  },
  {
    id: 'w002', name: 'クトゥルフEX', kind: 'creature',
    flavor: '海底の都に眠る巨大な存在。星の位置が正しくなるとき、再び目覚める。',
    origin: 'cthulhu', rarity: 'ultra',
    type: 'water', hp: 180, ex: true, retreatCost: 3, stage: 0,
    attacks: [
      { name: 'しょくしゅ', cost: ['water', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 40 }] },
      { name: 'せいしんさいりん', cost: ['water', 'water', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 100 }, { type: 'selfDamage', value: 10 }] },
    ],
  },
  {
    id: 'w003', name: 'ヨルムンガンド', kind: 'creature',
    flavor: '世界を取り巻くほど巨大な蛇。自らの尾を咥えて海に沈んでいる。',
    origin: 'norse', rarity: 'superRare',
    type: 'water', hp: 120, ex: false, retreatCost: 2, stage: 0,
    attacks: [
      { name: 'どくのきば', cost: ['water'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 20 }, { type: 'applyStatus', target: 'opponentActive', status: 'poisoned' }] },
      { name: 'せかいへびのあぎと', cost: ['water', 'water'],
        effects: [{ type: 'damagePerHeads', target: 'opponentActive', count: 3, value: 40 }] },
    ],
  },
  {
    id: 'w004', name: 'ワタツミ', kind: 'creature',
    flavor: '海を治める龍神。潮の満ち引きを操る二つの珠を持つ。',
    origin: 'japan', rarity: 'rare',
    type: 'water', hp: 110, ex: false, retreatCost: 2, stage: 0,
    attacks: [
      { name: 'しおのたま', cost: ['water'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
      { name: 'うしおのかんまん', cost: ['water', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 40 }, { type: 'discardEnergy', target: 'opponentActive', value: 1 }] },
    ],
  },
  {
    id: 'w005', name: 'ソベク', kind: 'creature',
    flavor: '鰐の頭を持つ河の神。恐れられると同時に、豊穣の象徴でもあった。',
    origin: 'egypt', rarity: 'common',
    type: 'water', hp: 90, ex: false, retreatCost: 1, stage: 0,
    attacks: [
      { name: 'わにのあぎと', cost: ['water'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
      { name: 'ナイルのながれ', cost: ['water', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 40 }] },
    ],
  },
  {
    id: 'w006', name: 'アプスー', kind: 'creature',
    flavor: 'すべての水の源である原初の淡水。ここから神々が生まれた。',
    origin: 'mesopotamia', rarity: 'common',
    type: 'water', hp: 100, ex: false, retreatCost: 1, stage: 0,
    attacks: [
      { name: 'ちかすい', cost: ['water'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
      { name: 'げんしょのうみ', cost: ['water', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 30 }, { type: 'heal', target: 'self', value: 10 }] },
    ],
  },
  {
    id: 'w007', name: 'ヴァルナ', kind: 'creature',
    flavor: '水と法をつかさどる神。縄を手に、誓いを破った者を捕らえる。',
    origin: 'india', rarity: 'rare',
    type: 'water', hp: 100, ex: false, retreatCost: 1, stage: 0,
    attacks: [
      { name: 'けいやくのなわ', cost: ['water'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 20 }, { type: 'discardEnergy', target: 'opponentActive', value: 1 }] },
      { name: 'てんのおきて', cost: ['water', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 50 }] },
    ],
  },
  {
    id: 'w008', name: 'ゴンゴン', kind: 'creature',
    flavor: '共工。争いに敗れて天を支える柱に頭をぶつけ、大洪水を起こした。',
    origin: 'china', rarity: 'rare',
    type: 'water', hp: 110, ex: false, retreatCost: 2, stage: 0,
    attacks: [
      { name: 'こうずい', cost: ['water'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
      { name: 'てんばしらをくだく', cost: ['water', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 50 }, { type: 'damage', target: 'opponentBenchAll', value: 10 }] },
    ],
  },
]

// ------------------------------------------------ 光
const LIGHT: readonly CreatureCard[] = [
  {
    id: 'l001', name: 'アマテラスEX', kind: 'creature',
    flavor: '高天原を統べる太陽の女神。岩戸に隠れると、世界から光が消えた。',
    origin: 'japan', rarity: 'ultra',
    type: 'light', hp: 170, ex: true, retreatCost: 2, stage: 0,
    attacks: [
      { name: 'ひのひかり', cost: ['light', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 40 }, { type: 'heal', target: 'self', value: 10 }] },
      { name: 'あまのいわとびらき', cost: ['light', 'light', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 90 }, { type: 'draw', value: 1 }] },
    ],
  },
  {
    id: 'l002', name: 'ラー', kind: 'creature',
    flavor: '昼は天空を舟で渡り、夜は冥界を巡る太陽そのもの。隼の頭を持つ。',
    origin: 'egypt', rarity: 'superRare',
    type: 'light', hp: 120, ex: false, retreatCost: 2, stage: 0,
    attacks: [
      { name: 'たいようのつばさ', cost: ['light'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 30 }] },
      { name: 'にちりんのこうき', cost: ['light', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 60 }, { type: 'damage', target: 'opponentBenchAll', value: 10 }] },
    ],
  },
  {
    id: 'l003', name: 'アポロン', kind: 'creature',
    flavor: '光と予言と医術の神。放つ矢は病をもたらし、また病を癒す。',
    origin: 'greece', rarity: 'superRare',
    type: 'light', hp: 120, ex: false, retreatCost: 2, stage: 0,
    attacks: [
      { name: 'ぎんのゆみ', cost: ['light'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 30 }] },
      { name: 'しんたくのや', cost: ['light', 'light'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 70 }] },
    ],
  },
  {
    id: 'l004', name: 'バルドル', kind: 'creature',
    flavor: '万物に愛された光の神。ただ一つ誓いを立てなかった宿り木に倒れた。',
    origin: 'norse', rarity: 'common',
    type: 'light', hp: 110, ex: false, retreatCost: 1, stage: 0,
    attacks: [
      { name: 'けがれなきひかり', cost: ['light'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 20 }, { type: 'heal', target: 'self', value: 10 }] },
      { name: 'あいされしもの', cost: ['light', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 50 }] },
    ],
  },
  {
    id: 'l005', name: 'スーリヤ', kind: 'creature',
    flavor: '七頭の馬に車を引かせて天を巡る太陽神。その輝きは削られてなお強い。',
    origin: 'india', rarity: 'rare',
    type: 'light', hp: 110, ex: false, retreatCost: 2, stage: 0,
    attacks: [
      { name: 'ななとうのうま', cost: ['light'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
      { name: 'てんくうのしゃりん', cost: ['light', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 50 }, { type: 'draw', value: 1 }] },
    ],
  },
  {
    id: 'l006', name: 'シャマシュ', kind: 'creature',
    flavor: '太陽と正義の神。すべてを照らし、隠された罪を残らず暴く。',
    origin: 'mesopotamia', rarity: 'rare',
    type: 'light', hp: 100, ex: false, retreatCost: 1, stage: 0,
    attacks: [
      { name: 'さばきのひかり', cost: ['light'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 20 }, { type: 'discardEnergy', target: 'opponentActive', value: 1 }] },
      { name: 'ほうりつをさずける', cost: ['light', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 50 }] },
    ],
  },
  {
    id: 'l007', name: 'シーホー', kind: 'creature',
    flavor: '羲和。十個の太陽を産み、毎朝ひとつずつ湯谷から送り出した母神。',
    origin: 'china', rarity: 'common',
    type: 'light', hp: 100, ex: false, retreatCost: 1, stage: 0,
    attacks: [
      { name: 'ひのくるま', cost: ['light'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
      { name: 'じゅうのたいよう', cost: ['light', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 40 }] },
    ],
  },
  {
    id: 'l008', name: 'ノーデンス', kind: 'creature',
    flavor: '深淵の大神。混沌に与せず、時に人の側へわずかな加護を寄こす。',
    origin: 'cthulhu', rarity: 'common',
    type: 'light', hp: 100, ex: false, retreatCost: 1, stage: 0,
    attacks: [
      { name: 'しんえんのひかり', cost: ['light'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
      { name: 'おおいなるふちのぬし', cost: ['light', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 40 }, { type: 'heal', target: 'self', value: 10 }] },
    ],
  },
  {
    id: 'l009', name: 'ダイワスカーレット', kind: 'creature',
    flavor: '誰より速く駆けることだけを目指す光の化身。夏をプールで満喫中。',
    origin: 'original', rarity: 'ultra',
    type: 'light', hp: 180, ex: true, retreatCost: 2, stage: 0,
    attacks: [
      { name: '夢の扉を開く者', ruby: 'ゆめのとびらをひらくもの', cost: ['light', 'light'],
        effects: [
          { type: 'damage', target: 'opponentActive', value: 60 },
          // 「行動不能にする」に相当する状態異常が無いので、エネルギーを奪って
          // 次のターンにワザを撃てなくする形に置き換えている
          { type: 'discardEnergy', target: 'opponentActive', value: 2 },
        ] },
      { name: 'パーフェクト・レッドエース', cost: ['light', 'light', 'light'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 120 }] },
    ],
  },
]

// ------------------------------------------------ 闇
const DARK: readonly CreatureCard[] = [
  {
    id: 'd001', name: 'ニャルラトホテプEX', kind: 'creature',
    flavor: '千の貌を持つ這い寄る混沌。神々の使者であり、人の理性を弄ぶ者。',
    origin: 'cthulhu', rarity: 'ultra',
    type: 'dark', hp: 180, ex: true, retreatCost: 2, stage: 0,
    attacks: [
      { name: 'せんのすがた', cost: ['dark', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 40 }, { type: 'draw', value: 1 }] },
      { name: 'はいよるこんとん', cost: ['dark', 'dark', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 80 }, { type: 'applyStatus', target: 'opponentActive', status: 'poisoned' }] },
    ],
  },
  {
    id: 'd002', name: 'ヘル', kind: 'creature',
    flavor: '半身が死者の姿をした冥界の女王。病や老いで死んだ者を迎え入れる。',
    origin: 'norse', rarity: 'superRare',
    type: 'dark', hp: 120, ex: false, retreatCost: 2, stage: 0,
    attacks: [
      { name: 'はんしんのて', cost: ['dark'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 30 }] },
      { name: 'しのくにへ', cost: ['dark', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 50 }, { type: 'discardEnergy', target: 'opponentActive', value: 1 }] },
    ],
  },
  {
    id: 'd003', name: 'イザナミ', kind: 'creature',
    flavor: '国を生んだのち黄泉に堕ちた女神。日に千人を奪うと夫に告げた。',
    origin: 'japan', rarity: 'rare',
    type: 'dark', hp: 120, ex: false, retreatCost: 2, stage: 0,
    attacks: [
      { name: 'よもつしこめ', cost: ['dark'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 30 }] },
      { name: 'せんにんをころす', cost: ['dark', 'dark'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 60 }] },
    ],
  },
  {
    id: 'd004', name: 'ハデス', kind: 'creature',
    flavor: '冥界を統べる王。姿を消す兜をかぶり、死者と地下の富を管理する。',
    origin: 'greece', rarity: 'rare',
    type: 'dark', hp: 120, ex: false, retreatCost: 2, stage: 0,
    attacks: [
      { name: 'かくれかぶと', cost: ['dark'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
      { name: 'めいかいのとみ', cost: ['dark', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 50 }, { type: 'heal', target: 'self', value: 10 }] },
    ],
  },
  {
    id: 'd005', name: 'ネルガル', kind: 'creature',
    flavor: '疫病と戦をもたらす神。冥界を妃エレシュキガルとともに治める。',
    origin: 'mesopotamia', rarity: 'rare',
    type: 'dark', hp: 110, ex: false, retreatCost: 2, stage: 0,
    attacks: [
      { name: 'えきびょう', cost: ['dark'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 20 }, { type: 'applyStatus', target: 'opponentActive', status: 'poisoned' }] },
      { name: 'めいかいのほのお', cost: ['dark', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 40 }] },
    ],
  },
  {
    id: 'd006', name: 'カーリー', kind: 'creature',
    flavor: '黒き時を意味する殺戮の女神。舞い始めれば世界すら踏み砕く。',
    origin: 'india', rarity: 'rare',
    type: 'dark', hp: 110, ex: false, retreatCost: 1, stage: 0,
    attacks: [
      { name: 'けつえきのしたたり', cost: ['dark'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 30 }] },
      { name: 'はかいのぶとう', cost: ['dark', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 60 }, { type: 'selfDamage', value: 10 }] },
    ],
  },
  {
    id: 'd007', name: 'アヌビス', kind: 'creature',
    flavor: '山犬の頭を持つ冥界の案内人。死者の心臓を羽根と天秤にかける。',
    origin: 'egypt', rarity: 'common',
    type: 'dark', hp: 100, ex: false, retreatCost: 1, stage: 0,
    attacks: [
      { name: 'やみのみちびき', cost: ['dark'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
      { name: 'しんぱんのはかり', cost: ['dark', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 40 }, { type: 'discardEnergy', target: 'opponentActive', value: 1 }] },
    ],
  },
  {
    id: 'd008', name: 'チーヨウ', kind: 'creature',
    flavor: '蚩尤。銅の頭に鉄の額を持つ戦の神。濃霧を起こして黄帝を惑わせた。',
    origin: 'china', rarity: 'common',
    type: 'dark', hp: 110, ex: false, retreatCost: 2, stage: 0,
    attacks: [
      { name: 'どうのひたい', cost: ['dark'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
      { name: 'きりをおこす', cost: ['dark', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 50 }] },
    ],
  },
  {
    id: 'd009', name: 'ラーフ', kind: 'creature',
    flavor: '不死の甘露を盗み、首だけになった魔神。日と月を呑み込んでは、切り口から逃がす。',
    origin: 'india', rarity: 'common',
    type: 'dark', hp: 100, ex: false, retreatCost: 1, stage: 0,
    attacks: [
      { name: 'あぎとをひらく', cost: ['dark'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
      { name: 'にっしょく', cost: ['dark', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 40 }, { type: 'discardEnergy', target: 'opponentActive', value: 1 }] },
    ],
  },
]

// ------------------------------------------------ 無
const COLORLESS: readonly CreatureCard[] = [
  {
    id: 'n001', name: 'ガルダ', kind: 'creature',
    flavor: 'インドの霊鳥。蛇族ナーガを喰らう天の乗り物で、その翼は太陽を覆うという。',
    origin: 'india', rarity: 'common',
    type: 'colorless', hp: 80, ex: false, retreatCost: 1, stage: 0,
    attacks: [
      { name: 'へびとりのつめ', cost: ['colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
    ],
  },
  {
    id: 'n002', name: 'ペガソス', kind: 'creature',
    flavor: 'メドゥーサの血から生まれた翼馬。蹄で大地を打つと泉が湧いたと伝わる。',
    origin: 'greece', rarity: 'common',
    type: 'colorless', hp: 60, ex: false, retreatCost: 1, stage: 0,
    attacks: [
      { name: 'ひづめうち', cost: ['colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 10 }] },
      { name: 'てんがけ', cost: ['colorless', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 40 }, { type: 'selfDamage', value: 10 }] },
    ],
  },
  {
    id: 'n003', name: 'タオテツ', kind: 'creature',
    flavor: '何でも食らう伝説の悪獣。青銅器に刻まれ、貪欲そのものを表す。',
    origin: 'china', rarity: 'common',
    type: 'colorless', hp: 120, ex: false, retreatCost: 3, stage: 0,
    attacks: [
      { name: 'くらいつく', cost: ['colorless', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 30 }] },
      { name: 'むさぼりぐい', cost: ['colorless', 'colorless', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 70 }] },
    ],
  },
  {
    id: 'n004', name: 'フェンリル', kind: 'creature',
    flavor: '神々に鎖で縛られた巨狼。終末の日に縛めを解き、天の光を呑む。',
    origin: 'norse', rarity: 'common',
    type: 'colorless', hp: 110, ex: false, retreatCost: 2, stage: 0,
    attacks: [
      { name: 'かみつく', cost: ['colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
      { name: 'いましめをやぶる', cost: ['colorless', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 60 }, { type: 'selfDamage', value: 10 }] },
    ],
  },
  {
    id: 'n005', name: 'スフィンクス', kind: 'creature',
    flavor: '獅子の体に人の顔を持つ守護獣。問いに答えられぬ者を通さない。',
    origin: 'egypt', rarity: 'common',
    type: 'colorless', hp: 90, ex: false, retreatCost: 1, stage: 0,
    attacks: [
      { name: 'なぞかけ', cost: ['colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 10 }, { type: 'draw', value: 1 }] },
      { name: 'こたえぬものへ', cost: ['colorless', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 40 }] },
    ],
  },
  {
    id: 'n006', name: 'ヤタガラス', kind: 'creature',
    flavor: '三本足の大烏。道を見失った者の前に現れ、進むべき方角を示す。',
    origin: 'japan', rarity: 'common',
    type: 'colorless', hp: 80, ex: false, retreatCost: 1, stage: 0,
    attacks: [
      { name: 'みちしるべ', cost: ['colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 10 }, { type: 'draw', value: 1 }] },
      { name: 'みつあしのつばさ', cost: ['colorless', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 40 }] },
    ],
  },
  {
    id: 'n007', name: 'ラマッス', kind: 'creature',
    flavor: '人面有翼の牡牛。宮殿の門に据えられ、邪なものの侵入を拒む。',
    origin: 'mesopotamia', rarity: 'common',
    type: 'colorless', hp: 100, ex: false, retreatCost: 2, stage: 0,
    attacks: [
      { name: 'もんばんのつばさ', cost: ['colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
      { name: 'おうきゅうのまもり', cost: ['colorless', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 40 }, { type: 'heal', target: 'self', value: 10 }] },
    ],
  },
  {
    id: 'n008', name: 'ショゴス', kind: 'creature',
    flavor: '無定形の原形質。創造主に反旗を翻し、いまも真似た声で鳴き続ける。',
    origin: 'cthulhu', rarity: 'common',
    type: 'colorless', hp: 110, ex: false, retreatCost: 2, stage: 0,
    attacks: [
      { name: 'げんけいしつ', cost: ['colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
      { name: 'テケリ・リ', cost: ['colorless', 'colorless'],
        effects: [{ type: 'damagePerHeads', target: 'opponentActive', count: 2, value: 40 }] },
    ],
  },
  {
    id: 'n009', name: 'スレイプニル', kind: 'creature',
    flavor: '八本の足で九つの世界を駆ける馬。地も空も海も、等しく地面として踏む。',
    origin: 'norse', rarity: 'common',
    type: 'colorless', hp: 100, ex: false, retreatCost: 2, stage: 0,
    attacks: [
      { name: 'かける', cost: ['colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 20 }] },
      { name: 'はっそくのしっそう', cost: ['colorless', 'colorless'],
        effects: [{ type: 'damage', target: 'opponentActive', value: 50 }] },
    ],
  },
]

/** キャラ */
export const CREATURES: readonly CreatureCard[] = [
  ...FIRE, ...FOREST, ...WIND, ...EARTH, ...THUNDER, ...WATER, ...LIGHT, ...DARK, ...COLORLESS,
]

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

export const FIRE_IDS = FIRE.map((c) => c.id)
export const FOREST_IDS = FOREST.map((c) => c.id)
export const WIND_IDS = WIND.map((c) => c.id)
export const EARTH_IDS = EARTH.map((c) => c.id)
export const THUNDER_IDS = THUNDER.map((c) => c.id)
export const WATER_IDS = WATER.map((c) => c.id)
export const LIGHT_IDS = LIGHT.map((c) => c.id)
export const DARK_IDS = DARK.map((c) => c.id)
export const COLORLESS_IDS = COLORLESS.map((c) => c.id)
