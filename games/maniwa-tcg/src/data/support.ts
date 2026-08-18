/**
 * キャラ以外のカード定義。アイテム・行動・絶技（SPEC 16章）。
 *
 * 効果はすべてデータで表現し、関数や switch は書かない（CLAUDE.md 4章）。
 * 解釈は core/effects.ts に一元化されているので、ここに足すだけで動く。
 *
 * 系統は8神話に散らす。イラストの題材にするため、どの神話の道具・儀式なのかを
 * 必ず決めておく。絶技は対応するキャラと同じ系統にそろえる。
 *
 * 回復量はダメージ量より小さくする（SPEC 8.2）。同値以上にすると互いに削れない
 * 膠着が生まれ、ターン上限まで試合が終わらなくなる。アイテムと行動にも同じ制約を
 * 適用する。
 */
import type { ActionCard, ItemCard, UltimateCard } from '../core/types.ts'

// ------------------------------------------------ アイテム（1ターンに何枚でも）

export const ITEMS: readonly ItemCard[] = [
  {
    id: 'i001', name: '神饌の香', ruby: 'しんせんのこう', kind: 'item', origin: 'japan', rarity: 'common',
    flavor: '神前に供える香。焚けば傷が癒え、荒ぶる心も鎮まるという。',
    effects: [{ type: 'heal', target: 'ownActive', value: 20 }],
  },
  {
    id: 'i002', name: '供物の果実', ruby: 'くもつのかじつ', kind: 'item', origin: 'greece', rarity: 'common',
    flavor: '祭壇に積まれた果実。分け与えられた者には次の一手が見えるという。',
    effects: [{ type: 'draw', value: 2 }],
  },
  {
    id: 'i003', name: '神託の石版', ruby: 'しんたくのせきばん', kind: 'item', origin: 'mesopotamia', rarity: 'rare',
    flavor: '運命が刻まれた粘土板。読み解けば、来たるべき者の名が浮かぶ。',
    effects: [{ type: 'searchCreature' }],
  },
  {
    id: 'i004', name: '聖油の壺', ruby: 'せいゆのつぼ', kind: 'item', origin: 'egypt', rarity: 'rare',
    flavor: '王の戴冠に用いる香油。注がれた者は、その日に限り二度の力を得る。',
    effects: [{ type: 'gainEnergy' }],
  },
  {
    id: 'i005', name: '護符の紐', ruby: 'ごふのひも', kind: 'item', origin: 'india', rarity: 'common',
    flavor: '手首に結ぶ祈りの紐。結び目のひとつひとつが力を宿す。',
    effects: [{ type: 'attachEnergy', target: 'ownActive', value: 1 }],
  },
  {
    id: 'i006', name: '不死の霊薬', ruby: 'ふしのれいやく', kind: 'item', origin: 'china', rarity: 'rare',
    flavor: '仙人が練り上げた丹薬。飲めば傷は塞がるが、量は限られている。',
    effects: [{ type: 'heal', target: 'ownActive', value: 30 }],
  },
  {
    id: 'i007', name: '呪詛の釘', ruby: 'じゅそのくぎ', kind: 'item', origin: 'japan', rarity: 'common',
    flavor: '丑の刻に打ち込む釘。憎しみの分だけ深く刺さる。',
    effects: [{ type: 'damage', target: 'opponentActive', value: 10 }],
  },
  {
    id: 'i008', name: '星辰の羅針', ruby: 'せいしんのらしん', kind: 'item', origin: 'cthulhu', rarity: 'rare',
    flavor: '星の位置が正しいときだけ針が動く。指す先を見た者は帰らない。',
    effects: [{ type: 'draw', value: 1 }, { type: 'gainEnergy' }],
  },
  {
    id: 'i009', name: '生贄の刃', ruby: 'いけにえのやいば', kind: 'item', origin: 'mesopotamia', rarity: 'common',
    flavor: '己の血を捧げる儀式刀。痛みと引き換えに知恵を得る。',
    effects: [{ type: 'selfDamage', value: 10 }, { type: 'draw', value: 2 }],
  },
  {
    id: 'i010', name: '双面の鏡', ruby: 'そうめんのかがみ', kind: 'item', origin: 'greece', rarity: 'common',
    flavor: '覗き込んだ者と映った者が入れ替わる。どちらが本物かは誰も知らない。',
    effects: [{ type: 'switchOpponent' }],
  },
  {
    id: 'i011', name: '冥府の渡し銭', ruby: 'めいふのわたしせん', kind: 'item', origin: 'norse', rarity: 'common',
    flavor: '死者の口に含ませる銭。払えぬ者は岸で立ち尽くす。',
    effects: [{ type: 'discardEnergy', target: 'opponentActive', value: 1 }],
  },
  {
    id: 'i012', name: '豊穣の壺', ruby: 'ほうじょうのつぼ', kind: 'item', origin: 'norse', rarity: 'common',
    flavor: '汲んでも尽きぬ蜜酒の壺。控えの者たちにも等しく回される。',
    effects: [{ type: 'heal', target: 'ownBenchAll', value: 10 }],
  },
]

// ------------------------------------------------ 行動（1ターンに1枚）

export const ACTIONS: readonly ActionCard[] = [
  {
    id: 'a001', name: '天啓', ruby: 'てんけい', kind: 'action', origin: 'greece', rarity: 'rare',
    flavor: '神託所に降りる啓示。問うた者の前に、進むべき道が三つ示される。',
    effects: [{ type: 'draw', value: 3 }],
  },
  {
    id: 'a002', name: '招雷の儀', ruby: 'しょうらいのぎ', kind: 'action', origin: 'india', rarity: 'rare',
    flavor: '雷を呼び下ろす秘儀。触れた者の内に、二重の力が満ちる。',
    effects: [{ type: 'attachEnergy', target: 'ownActive', value: 2 }],
  },
  {
    id: 'a003', name: '交代の号令', ruby: 'こうたいのごうれい', kind: 'action', origin: 'china', rarity: 'common',
    flavor: '陣を組み替える一声。前に立つ者と控える者が、瞬時に入れ替わる。',
    effects: [{ type: 'switchOpponent' }],
  },
  {
    id: 'a004', name: '大癒しの祈り', ruby: 'おおいやしのいのり', kind: 'action', origin: 'egypt', rarity: 'superRare',
    flavor: '女神が死者の体を繋ぎ合わせた祈り。裂けた傷も元の形に戻る。',
    effects: [{ type: 'heal', target: 'ownActive', value: 40 }],
  },
  {
    id: 'a005', name: '招集の祈り', ruby: 'しょうしゅうのいのり', kind: 'action', origin: 'japan', rarity: 'rare',
    flavor: '八百万を呼び集める祝詞。応じた者が一柱、列に加わる。',
    effects: [{ type: 'searchCreature' }, { type: 'draw', value: 1 }],
  },
  {
    id: 'a006', name: '祟りの札', ruby: 'たたりのふだ', kind: 'action', origin: 'japan', rarity: 'rare',
    flavor: '恨みを封じた呪符。貼られた者は、じわじわと蝕まれてゆく。',
    effects: [
      { type: 'damage', target: 'opponentActive', value: 20 },
      { type: 'applyStatus', target: 'opponentActive', status: 'poisoned' },
    ],
  },
  {
    id: 'a007', name: '封印の陣', ruby: 'ふういんのじん', kind: 'action', origin: 'china', rarity: 'rare',
    flavor: '地に描いた八角の陣。踏み入った者は力を吸い上げられる。',
    effects: [{ type: 'discardEnergy', target: 'opponentActive', value: 2 }],
  },
  {
    id: 'a008', name: '焦土の誓い', ruby: 'しょうどのちかい', kind: 'action', origin: 'mesopotamia', rarity: 'rare',
    flavor: '進軍の前に土地を焼き払う誓い。控える者にまで熱が届く。',
    effects: [{ type: 'damage', target: 'opponentBenchAll', value: 10 }],
  },
  {
    id: 'a009', name: '巫女の舞', ruby: 'みこのまい', kind: 'action', origin: 'japan', rarity: 'common',
    flavor: '鈴を鳴らして舞う奉納。場が清まり、力の巡りが早くなる。',
    effects: [{ type: 'gainEnergy' }, { type: 'draw', value: 1 }],
  },
  {
    id: 'a010', name: '双龍の采配', ruby: 'そうりゅうのさいはい', kind: 'action', origin: 'china', rarity: 'superRare',
    flavor: '二頭の龍を従えた将の指示。控えの列すべてに気が通る。',
    effects: [{ type: 'attachEnergy', target: 'ownBenchAll', value: 1 }],
  },
  {
    id: 'a011', name: '犠牲の契約', ruby: 'ぎせいのけいやく', kind: 'action', origin: 'cthulhu', rarity: 'common',
    flavor: '正気と引き換えに知識を得る契約。署名の墨は、いつも赤い。',
    effects: [{ type: 'selfDamage', value: 20 }, { type: 'draw', value: 3 }],
  },
  {
    id: 'a012', name: '神罰', ruby: 'しんばつ', kind: 'action', origin: 'norse', rarity: 'superRare',
    flavor: '天から下る裁き。避けようとした者にこそ、まっすぐ落ちる。',
    effects: [
      { type: 'coinFlip', count: 1, min: 1, then: [{ type: 'damage', target: 'opponentActive', value: 50 }] },
    ],
  },
]

// ------------------------------------------------ 絶技（バトル場の対応キャラ専用）

export const ULTIMATES: readonly UltimateCard[] = [
  {
    id: 'u001', name: '天叢焼', ruby: 'あめのむらやき', kind: 'ultimate',
    origin: 'japan', rarity: 'ultra', requires: 'f002',
    flavor: '生まれた瞬間に母を焼いた火が、そのまま戦場を舐める。カグツチEXの極み。',
    cost: ['fire', 'fire', 'colorless'],
    effects: [
      { type: 'damage', target: 'opponentActive', value: 110 },
      { type: 'damage', target: 'opponentBenchAll', value: 10 },
    ],
  },
  {
    id: 'u002', name: '世界樹の恵み', ruby: 'せかいじゅのめぐみ', kind: 'ultimate',
    origin: 'norse', rarity: 'ultra', requires: 's001',
    flavor: '枝が天を覆い、根が泉を汲み上げる。傷つきながらも立ち続ける大樹の力。',
    cost: ['forest', 'forest', 'colorless'],
    effects: [
      { type: 'damage', target: 'opponentActive', value: 90 },
      { type: 'heal', target: 'self', value: 20 },
    ],
  },
  {
    id: 'u003', name: '黄の印', ruby: 'きいろのしるし', kind: 'ultimate',
    origin: 'cthulhu', rarity: 'ultra', requires: 'k006',
    flavor: '風がかたちを変え、見てはならない印を空に描く。読めた者から崩れていく。',
    cost: ['wind', 'wind', 'colorless'],
    effects: [
      { type: 'damage', target: 'opponentActive', value: 100 },
      { type: 'discardEnergy', target: 'opponentActive', value: 1 },
    ],
  },
  {
    id: 'u004', name: '地底の眠り', ruby: 'ちていのねむり', kind: 'ultimate',
    origin: 'cthulhu', rarity: 'ultra', requires: 'e008',
    flavor: '黒い泥が洞窟から溢れ出す。沈んだものは二度と形を取り戻さない。',
    cost: ['earth', 'earth', 'colorless'],
    effects: [
      { type: 'damage', target: 'opponentActive', value: 100 },
      { type: 'damage', target: 'opponentBenchAll', value: 10 },
    ],
  },
  {
    id: 'u005', name: '神威の雷', ruby: 'しんいのいかずち', kind: 'ultimate',
    origin: 'greece', rarity: 'ultra', requires: 't003',
    flavor: '天が裂け、逆らう者の上にだけ落ちる。神々の王が下す最後の答え。',
    cost: ['thunder', 'thunder', 'colorless'],
    effects: [
      { type: 'damage', target: 'opponentActive', value: 120 },
      { type: 'selfDamage', value: 20 },
    ],
  },
  {
    id: 'u006', name: '星辰再臨', ruby: 'せいしんさいりん', kind: 'ultimate',
    origin: 'cthulhu', rarity: 'ultra', requires: 'w002',
    flavor: '星の位置が正しくなった。海底の都が浮上し、見た者の理性が砕ける。',
    cost: ['water', 'water', 'colorless'],
    effects: [
      { type: 'damage', target: 'opponentActive', value: 120 },
      { type: 'selfDamage', value: 20 },
    ],
  },
  {
    id: 'u007', name: '天岩戸開', ruby: 'あまのいわとびらき', kind: 'ultimate',
    origin: 'japan', rarity: 'ultra', requires: 'l001',
    flavor: '閉ざされた岩戸が開き、世界に光が戻る。隠れていたものがすべて見える。',
    cost: ['light', 'light', 'colorless'],
    effects: [
      { type: 'damage', target: 'opponentActive', value: 100 },
      { type: 'draw', value: 2 },
    ],
  },
  {
    id: 'u008', name: '這い寄る混沌', ruby: 'はいよるこんとん', kind: 'ultimate',
    origin: 'cthulhu', rarity: 'ultra', requires: 'd001',
    flavor: '千の貌のどれが本物か、誰も言い当てられない。答えを探した者から壊れる。',
    cost: ['dark', 'dark', 'colorless'],
    effects: [
      { type: 'damage', target: 'opponentActive', value: 100 },
      { type: 'applyStatus', target: 'opponentActive', status: 'poisoned' },
    ],
  },
]
