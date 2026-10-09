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
    id: 'i003', name: '神託の石版', ruby: 'しんたくのせきばん', kind: 'item', origin: 'mesopotamia', rarity: 'common',
    flavor: '運命が刻まれた粘土板。読み解けば、来たるべき者の名が浮かぶ。',
    effects: [{ type: 'searchCreature' }],
  },
  {
    id: 'i004', name: '聖油の壺', ruby: 'せいゆのつぼ', kind: 'item', origin: 'egypt', rarity: 'rare',
    flavor: '王の戴冠に用いる香油。注がれた者は、その日に限り二度の力を得る。',
    effects: [{ type: 'gainEnergy' }],
  },
  {
    id: 'i005', name: '護符の紐', ruby: 'ごふのひも', kind: 'item', origin: 'india', rarity: 'superRare',
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
    id: 'i008', name: '星辰の羅針', ruby: 'せいしんのらしん', kind: 'item', origin: 'cthulhu', rarity: 'superRare',
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
  {
    id: 'i013', name: '劫初の猛毒', ruby: 'ごうしょのもうどく', kind: 'item', origin: 'india', rarity: 'rare',
    flavor: '乳海を攪拌したとき、甘露より先に湧き出た毒。世界を焼くまえに飲み干された。',
    effects: [
      { type: 'damage', target: 'opponentActive', value: 10 },
      { type: 'applyStatus', target: 'opponentActive', status: 'poisoned' },
    ],
  },
  {
    id: 'i014', name: '真理の羽根', ruby: 'しんりのはね', kind: 'item', origin: 'egypt', rarity: 'rare',
    flavor: '死者の心臓と釣り合わせる一枚。偽りを載せた皿は、必ず重く傾く。',
    effects: [
      { type: 'discardEnergy', target: 'opponentActive', value: 1 },
      { type: 'draw', value: 1 },
    ],
  },
  {
    id: 'i015', name: '亀甲の卜', ruby: 'きっこうのぼく', kind: 'item', origin: 'china', rarity: 'rare',
    flavor: '亀の甲を焼き、生じた罅で吉凶を読む。王はこれに従って兵を出した。',
    effects: [
      { type: 'coinFlip', count: 1, min: 1, then: [{ type: 'gainEnergy' }, { type: 'draw', value: 1 }] },
    ],
  },
  {
    id: 'i016', name: '銀の鍵', ruby: 'ぎんのかぎ', kind: 'item', origin: 'cthulhu', rarity: 'rare',
    flavor: '幾つもの門を開く鍵。持つ者は、いま立つ世界の外側へ踏み出せる。',
    effects: [
      { type: 'switchOpponent' },
      { type: 'searchCreature' },
    ],
  },
  {
    id: 'i017', name: '筊杯', ruby: 'きょうはい', kind: 'item', origin: 'china', rarity: 'rare',
    flavor: '神前に投げる三日月形の木片。表と裏の出方で神意を問い、吉と出た者にだけ力が下りる。',
    effects: [
      { type: 'coinFlip', count: 1, min: 1, then: [{ type: 'gainEnergy' }] },
      { type: 'draw', value: 1 },
    ],
  },
  {
    id: 'i018', name: '狂気の囁き', ruby: 'きょうきのささやき', kind: 'item', origin: 'cthulhu', rarity: 'rare',
    flavor: '深海の底で眠る者が漏らす寝言。意味を成さない音だが、聞き取れた回数だけ正気が削れる。',
    effects: [{ type: 'damagePerHeads', target: 'opponentActive', value: 20, count: 2 }],
  },
  {
    id: 'i019', name: 'アグニの火箭', ruby: 'アグニのかせん', kind: 'item', origin: 'india', rarity: 'rare',
    flavor: '火神の放つ無数の矢。狙いは定めず、控えて待つ者たちの頭上へ等しく降りそそぐ。',
    // 神具で opponentBenchAll を使うのは初。控えを一度に削る手段が神具に無かった
    effects: [{ type: 'damage', target: 'opponentBenchAll', value: 20 }],
  },
  {
    id: 'i020', name: 'ウシャブティ', kind: 'item', origin: 'egypt', rarity: 'superRare',
    flavor: '墓に納める従者の人形。死者の代わりに畑を耕すよう、名を呼ばれた数だけ起き上がる。',
    // 神具で ownBenchAll にエネルギーを配るのは初。控えの立ち上がりを早める役割
    effects: [{ type: 'attachEnergy', target: 'ownBenchAll', value: 1 }],
  },
  /*
   * **神具は3種別のうち唯一 UR が0種だった**（神具 C8 R9 SR3 UR0 に対し、
   * 道標は UR1）。i021 でその穴を埋める。
   */
  {
    id: 'i021', name: 'グングニル', kind: 'item', origin: 'norse', rarity: 'ultra',
    flavor: '投げれば必ず的を貫く槍。射抜かれた者は、立っていた場所から引きずり出される。',
    // 神具で damage + switchOpponent を組むのは初。i010 は入れ替えのみ、i007 は打点のみ
    effects: [
      { type: 'damage', target: 'opponentActive', value: 45 },
      { type: 'switchOpponent' },
    ],
  },
  {
    id: 'i022', name: 'パンドラの匣', ruby: 'パンドラのはこ', kind: 'item', origin: 'greece', rarity: 'superRare',
    flavor: '開けた者の手から災いが飛び散り、底には希望だけが残る。',
    // 神具で damage + heal を組むのは初。災いは控えへ散り、希望は前に立つ者を癒す。
    // 回復15はダメージ20より小さい（SPEC 8.2）
    effects: [
      { type: 'damage', target: 'opponentBenchAll', value: 20 },
      { type: 'heal', target: 'ownActive', value: 15 },
    ],
  },
  {
    id: 'i023', name: '八尺瓊勾玉', ruby: 'やさかにのまがたま', kind: 'item', origin: 'japan', rarity: 'ultra',
    flavor: '三種の神器のひとつ。岩戸の前に掲げられ、隠れた光を招き出した玉。',
    // 神具の UR は i021 グングニル の1種だけだった。あちらが攻めの UR なので、
    // こちらは支えの UR にする。回復と付与を組むのは神具では初
    effects: [
      { type: 'heal', target: 'ownActive', value: 30 },
      { type: 'attachEnergy', target: 'ownActive', value: 1 },
    ],
  },
  {
    id: 'i024', name: '天の牡牛の角', ruby: 'あめのおうしのつの', kind: 'item', origin: 'mesopotamia', rarity: 'superRare',
    flavor: '天から降された牡牛の角。踏み荒らされた地は七年のあいだ実らない。',
    // 控えへの範囲打撃とエネルギー剥がしを組むのは神具では初。
    // 牡牛は地を荒らし（控えへ）、旱魃で蓄えを奪う（エネルギー）
    effects: [
      { type: 'damage', target: 'opponentBenchAll', value: 20 },
      { type: 'discardEnergy', target: 'opponentActive', value: 1 },
    ],
  },
  {
    id: 'i025', name: '九鼎', ruby: 'きゅうてい', kind: 'item', origin: 'china', rarity: 'superRare',
    flavor: '禹が九州の金を集めて鋳た九つの鼎。王朝が移るたびに運ばれ、天下が定まったことの証しとされた。',
    // 中国の神具は3種すべてが R で、8系統で唯一レアリティが1つに固まっていた（2026-09-25 実測）。
    // あわせて**効果を3つ持つ神具は0種**だったので、ここで初めて作る。
    // 鼎は集めて容れるものなので、エネルギー・手札・人の3つを集める形にした
    effects: [
      { type: 'gainEnergy' },
      { type: 'draw', value: 1 },
      { type: 'searchCreature' },
    ],
  },
  {
    id: 'i026', name: '黄金の林檎', ruby: 'おうごんのりんご', kind: 'item', origin: 'greece', rarity: 'rare',
    flavor: '「最も美しい者へ」と刻まれ、宴のただ中に投げ込まれた。誰の手に落ちるかで、戦は始まった。',
    // ギリシアの神具は C2 / SR1 で R が無かった（2026-09-25 実測）。
    // あわせて**opponentBenchRandom を使う神具も0種**だったので、ここで初めて使う。
    // 誰に当たるか分からない林檎なので、控えの1体を無作為に選ぶ形がそのまま合う
    effects: [
      { type: 'damage', target: 'opponentBenchRandom', value: 40 },
      { type: 'draw', value: 1 },
    ],
  },
  {
    id: 'i027', name: 'ネクロノミコン', kind: 'item', origin: 'cthulhu', rarity: 'ultra',
    flavor: '狂えるアラブ人が書き遺した書。読み解いた者は世界の裏側を知り、知った量だけ正気を手放す。',
    // 神具の UR は norse と japan の2系統だけだった（2026-10-01 実測。china / cthulhu /
    // egypt / greece / india / mesopotamia に無い）。ここで cthulhu に1枚置く。
    // あわせて**効果を4つ持つ支援カードは0種**だったので、ここで初めて作る（i025 の3つが最多だった）。
    // selfDamage は神具で1種しか使っていない効果でもある。
    // 禁書は何もかもを前借りさせる代わりに正気を削るので、引く・前借り・直付けの3つに
    // 反動を添えた形がそのまま合う
    effects: [
      { type: 'draw', value: 4 },
      { type: 'gainEnergy' },
      { type: 'attachEnergy', target: 'ownActive', value: 1 },
      { type: 'selfDamage', value: 20 },
    ],
  },
  {
    id: 'i028', name: 'ウジャトの眼', ruby: 'ウジャトのめ', kind: 'item', origin: 'egypt', rarity: 'ultra',
    flavor: '抉り取られ、月の数だけ欠けたのち、ふたたび満ちた眼。見通し、癒し、そして射抜く。',
    // 同じく UR の空いていた egypt に置く。前夜に足した k010 ホルスEX の眼にあたるので、
    // 既存カードとの関係でも据わりがよい。
    // damage + heal + searchCreature を組むのは支援カードでは初。
    // 回復20はダメージ35より小さい（SPEC 8.2）
    effects: [
      { type: 'damage', target: 'opponentActive', value: 35 },
      { type: 'heal', target: 'ownActive', value: 20 },
      { type: 'searchCreature' },
    ],
  },
  {
    id: 'i029', name: '軒轅剣', ruby: 'けんえんけん', kind: 'item', origin: 'china', rarity: 'ultra',
    flavor: '黄帝が蚩尤を討ったときの剣。抜けば刃の光が後ろに控える者まで届き、構えた力を削ぎ落とす。',
    // 神具の UR が無い系統は china / greece / india / mesopotamia の4つだった（2026-10-09 実測）。
    // ここで china を埋める。既存カードとの関係では e011 黄帝EX の剣にあたる。
    // **ダメージ効果を2つ持つ支援カードは0種だった**ので、ここで初めて作る。
    // あわせて opponentBenchRandom は神具で1種しか使っていない最も薄い対象である
    // （opponentActive 9 / ownActive 8 に対して1）。
    effects: [
      { type: 'damage', target: 'opponentActive', value: 35 },
      { type: 'damage', target: 'opponentBenchRandom', value: 20 },
      { type: 'discardEnergy', target: 'opponentActive', value: 1 },
    ],
  },
  {
    id: 'i030', name: '運命の粘土板', ruby: 'うんめいのねんどばん', kind: 'item', origin: 'mesopotamia', rarity: 'ultra',
    flavor: '天の定めが刻まれた板。書き換えられた者は、立つ場所も蓄えた力も、気づかぬうちに入れ替わっている。',
    // 同じく UR の空いていた mesopotamia に置く。w011 ティアマトEX が持ち、
    // t009 マルドゥク が奪った板なので、既存カード2枚との関係で据わりがよい。
    // switchOpponent + discardEnergy + draw を組むのは支援カードでは初
    // （a026 ヘカの言葉 は switchOpponent + damage + discardEnergy、a018 七つの門 は
    //  discardEnergy + switchOpponent の2つ）。
    effects: [
      { type: 'switchOpponent' },
      { type: 'discardEnergy', target: 'opponentActive', value: 2 },
      { type: 'draw', value: 3 },
    ],
  },
]

// ------------------------------------------------ 行動（1ターンに1枚）

export const ACTIONS: readonly ActionCard[] = [
  {
    id: 'a001', name: '天啓', ruby: 'てんけい', kind: 'action', origin: 'greece', rarity: 'common',
    flavor: '神託所に降りる啓示。問うた者の前に、進むべき道が三つ示される。',
    effects: [{ type: 'draw', value: 3 }],
  },
  {
    id: 'a002', name: '招雷の儀', ruby: 'しょうらいのぎ', kind: 'action', origin: 'india', rarity: 'ultra',
    flavor: '雷を呼び下ろす秘儀。触れた者の内に、二重の力が満ちる。',
    effects: [{ type: 'attachEnergy', target: 'ownActive', value: 2 }],
  },
  {
    id: 'a003', name: '交代の号令', ruby: 'こうたいのごうれい', kind: 'action', origin: 'china', rarity: 'common',
    flavor: '陣を組み替える一声。前に立つ者と控える者が、瞬時に入れ替わる。',
    effects: [{ type: 'switchOpponent' }],
  },
  {
    id: 'a004', name: '大癒しの祈り', ruby: 'おおいやしのいのり', kind: 'action', origin: 'egypt', rarity: 'rare',
    flavor: '女神が死者の体を繋ぎ合わせた祈り。裂けた傷も元の形に戻る。',
    effects: [{ type: 'heal', target: 'ownActive', value: 40 }],
  },
  {
    id: 'a005', name: '招集の祈り', ruby: 'しょうしゅうのいのり', kind: 'action', origin: 'japan', rarity: 'common',
    flavor: '八百万を呼び集める祝詞。応じた者が一柱、列に加わる。',
    effects: [{ type: 'searchCreature' }, { type: 'draw', value: 1 }],
  },
  {
    id: 'a006', name: '祟りの札', ruby: 'たたりのふだ', kind: 'action', origin: 'japan', rarity: 'superRare',
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
    id: 'a008', name: '焦土の誓い', ruby: 'しょうどのちかい', kind: 'action', origin: 'mesopotamia', rarity: 'common',
    flavor: '進軍の前に土地を焼き払う誓い。控える者にまで熱が届く。',
    effects: [{ type: 'damage', target: 'opponentBenchAll', value: 10 }],
  },
  {
    id: 'a009', name: '巫女の舞', ruby: 'みこのまい', kind: 'action', origin: 'japan', rarity: 'superRare',
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
    id: 'a012', name: '神罰', ruby: 'しんばつ', kind: 'action', origin: 'norse', rarity: 'rare',
    flavor: '天から下る裁き。避けようとした者にこそ、まっすぐ落ちる。',
    effects: [
      { type: 'coinFlip', count: 1, min: 1, then: [{ type: 'damage', target: 'opponentActive', value: 50 }] },
    ],
  },
  {
    id: 'a013', name: '運命の三女神', ruby: 'モイライ', kind: 'action', origin: 'greece', rarity: 'superRare',
    flavor: '糸を紡ぐ者、長さを測る者、断つ者。三姉妹の手が揃ったとき、寿命が決まる。',
    effects: [
      { type: 'damagePerHeads', target: 'opponentActive', value: 30, count: 3 },
    ],
  },
  {
    id: 'a014', name: '二羽の渡り', ruby: 'フギンとムニン', kind: 'action', origin: 'norse', rarity: 'rare',
    flavor: '思考と記憶の名を持つ双烏。世界を巡り、見聞きしたすべてを主の耳に囁く。',
    effects: [
      { type: 'draw', value: 2 },
      { type: 'searchCreature' },
    ],
  },
  {
    id: 'a015', name: '死者の書', ruby: 'ししゃのしょ', kind: 'action', origin: 'egypt', rarity: 'rare',
    flavor: '棺に納める道案内の巻物。冥界の門番の名と、通るための言葉が記してある。',
    effects: [
      { type: 'heal', target: 'ownBenchAll', value: 30 },
      { type: 'searchCreature' },
    ],
  },
  {
    id: 'a016', name: 'イシュタルの門', ruby: 'イシュタルのもん', kind: 'action', origin: 'mesopotamia', rarity: 'common',
    flavor: '冥界へ下る七つの門。くぐるたび、身に着けた物をひとつずつ奪われる。',
    effects: [
      { type: 'damage', target: 'opponentBenchRandom', value: 30 },
    ],
  },
  {
    id: 'a017', name: '星からの色', ruby: 'ほしからのいろ', kind: 'action', origin: 'cthulhu', rarity: 'rare',
    flavor: '隕石とともに落ちてきた、名前のない色。畑の隅から順に、生きているものの色が抜けていく。',
    effects: [
      { type: 'damage', target: 'opponentBenchRandom', value: 40 },
      { type: 'draw', value: 1 },
    ],
  },
  {
    id: 'a018', name: '七つの門', ruby: 'ななつのもん', kind: 'action', origin: 'mesopotamia', rarity: 'rare',
    flavor: '冥界へ下るには七つの門をくぐる。門番は一つくぐるごとに、身につけたものを一つ剥ぎ取る。',
    effects: [
      { type: 'discardEnergy', target: 'opponentActive', value: 1 },
      { type: 'switchOpponent' },
    ],
  },
  {
    id: 'a019', name: '金翅鳥の急襲', ruby: 'こんじちょうのきゅうしゅう', kind: 'action', origin: 'india', rarity: 'rare',
    flavor: '蛇を狙って舞い降りる霊鳥。掴み上げられた者は、否応なく前へ引き出される。',
    // 道標で switchOpponent + damage を組むのは初。a003 は入れ替えのみ、a018 は剥奪と入れ替え
    effects: [
      { type: 'switchOpponent' },
      { type: 'damage', target: 'opponentActive', value: 20 },
    ],
  },
  {
    id: 'a020', name: 'セルケトの針', ruby: 'セルケトのはり', kind: 'action', origin: 'egypt', rarity: 'rare',
    flavor: '死者の内臓を守る蠍の女神。刺された者は毒に痺れ、力の巡りが止まる。',
    // 道標で applyStatus + discardEnergy を組むのは初。a006 は毒と打点、a007 は剥奪のみ
    effects: [
      { type: 'applyStatus', target: 'opponentActive', status: 'poisoned' },
      { type: 'discardEnergy', target: 'opponentActive', value: 1 },
    ],
  },
  /*
   * a021 / a022 は**先に絵があってあとからカードを作った**、この2枚だけの経緯を持つ。
   * 2026-09-06 に、カードデータを記憶から作文して存在しないカードの絵を2枚頼み、
   * 出来上がった絵を捨てずに済ませるため、その作文どおりのカードを新規に起こした。
   * 番号は、当時 a019 / a020 が未マージの夜間ブランチで埋まっていたので a021 から取った
   * （その a019 / a020 は 2026-09-10 に取り込んで、いまは上に並んでいる）。
   */
  {
    id: 'a021', name: '星辰の囁き', ruby: 'せいしんのささやき', kind: 'action', origin: 'cthulhu', rarity: 'rare',
    flavor: '星が正しい位置に並ぶ夜、囁きは誰にでも聞こえる。ただし意味は分からない。',
    // 道標で draw + applyStatus を組むのは初。a006 は打点と毒、a005 は探索とドロー
    effects: [
      { type: 'draw', value: 2 },
      { type: 'applyStatus', target: 'opponentActive', status: 'poisoned' },
    ],
  },
  {
    id: 'a022', name: '深淵の呼び声', ruby: 'しんえんのよびごえ', kind: 'action', origin: 'cthulhu', rarity: 'superRare',
    flavor: '海の底から呼ばれている。応えた者は、二度と浮かんでこない。',
    // 道標で damage + discardEnergy を組むのは初。a007 は剥奪のみ、a018 は剥奪と入れ替え
    effects: [
      { type: 'damage', target: 'opponentActive', value: 20 },
      { type: 'discardEnergy', target: 'opponentActive', value: 1 },
    ],
  },
  /*
   * a023 / a024 は 2026-09-11 の夜間ジョブで追加した。**手薄な系統と対象を埋める。**
   * 追加前の道標22種は、系統が 北欧2 / インド2 / ギリシア2 で最小、対象は
   * `opponentBenchAll` が a008 焦土の誓い の1件だけだった。
   */
  {
    id: 'a023', name: 'ギャラルホルン', kind: 'action', origin: 'norse', rarity: 'superRare',
    flavor: '終末を告げる角笛。鳴り渡れば、奥に控えていた者まで残らず引き出される。',
    // 道標で opponentBenchAll + searchCreature を組むのは初。a008 は控えへの打点のみ、
    // a015 は控えの回復と探索。角笛が「控えを起こす」ことを、両側の控えに効かせて表した
    effects: [
      { type: 'damage', target: 'opponentBenchAll', value: 20 },
      { type: 'searchCreature' },
    ],
  },
  {
    id: 'a024', name: 'レテの水', ruby: 'レテのみず', kind: 'action', origin: 'greece', rarity: 'rare',
    flavor: '冥府を流れる忘却の川。ひと口飲んだ者は、握っていた力の名前を思い出せなくなる。',
    // 道標で discardEnergy + draw を組むのは初。a007 は剥奪のみ、a018 は剥奪と入れ替え、
    // a020 は毒と剥奪、a022 は打点と剥奪。忘れさせる側と思い出す側を1枚に収めた
    effects: [
      { type: 'discardEnergy', target: 'opponentActive', value: 1 },
      { type: 'draw', value: 2 },
    ],
  },
  {
    id: 'a025', name: 'ドゥルガーの凱旋', ruby: 'ドゥルガーのがいせん', kind: 'action',
    origin: 'india', rarity: 'superRare',
    flavor: '水牛の魔神を討ち取った女神が、十の腕に武器を提げて帰ってくる。倒れていた者も、その姿を見て立ち上がった。',
    /*
     * 道標で damage + heal を組むのは初（神具では i022 パンドラの匣がある）。
     * インド系統の道標は a002 と a019 の2種しか無く、8系統で唯一2種だったので
     * ここを3種にそろえる。india/superRare の枠も空いていた。
     *
     * SPEC 8.2 のとおり回復量(20)はダメージ量(30)より小さくする。
     * 評価値は 30 + 20×0.6 = 42 → 総合力 151.2 で SR の帯（115〜190）の中。
     */
    effects: [
      { type: 'damage', target: 'opponentActive', value: 30 },
      { type: 'heal', target: 'ownActive', value: 20 },
    ],
  },
  {
    id: 'a026', name: 'ヘカの言葉', ruby: 'ヘカのことば', kind: 'action',
    origin: 'egypt', rarity: 'ultra',
    flavor: '魔法そのものを司る神。正しい名で呼ばれた者は、逆らうことも隠れることもできない。',
    /*
     * 道標の UR は a002 招雷の儀の1種しか無かったので、ここを2種にする。
     * エジプトの道標は a004 / a015 / a020 がすべて R で、**1系統まるごと単一レアリティ**
     * だったのもここで崩れる。
     *
     * **支援カードで効果を3つ持つのはこれが初**（神具24種・道標24種とも、これまで最大2つ）。
     * 名を呼んで引き出し（switchOpponent）、声で討ち（damage）、持っていた力を落とさせる
     * （discardEnergy）。UR の1枚ぶんの手数として3つを1枚に収める。
     *
     * 評価値は 10 + 30 + 15 = 55 → 総合力 198.0。UR の帯（190以上）で、
     * 同じ 198.0 の i021 グングニルと並ぶ。
     */
    effects: [
      { type: 'switchOpponent' },
      { type: 'damage', target: 'opponentActive', value: 30 },
      { type: 'discardEnergy', target: 'opponentActive', value: 1 },
    ],
  },
  {
    id: 'a027', name: '天命', ruby: 'てんめい', kind: 'action',
    origin: 'china', rarity: 'ultra',
    flavor: '天が王を選び直す。与えられていた力は静かに離れ、別の手のひらへ移っていく。',
    /*
     * 道標の UR は egypt と india の2系統にしか無く、**6系統が空いていた**
     * （2026-09-25 の報告で「次に支援カードの番が来たときは、系統の空きではなく
     * UR の空きを埋めるのが効きそう」と提案したもの）。
     * 中国の道標は C1 / R1 / SR1 で、**空いているのが UR だけ**なので、ここを埋めると
     * 分布がちょうど揃う。
     *
     * 効果を3つ持つ支援カードは a026 ヘカの言葉の1種だけだった。ここで2種目にする。
     *
     * 天命は「与える側と奪う側が同時に動く」話なので、こちらが受け取り
     * （gainEnergy / draw）、相手が落とす（discardEnergy）形にした。
     *
     * 評価値は 30 + 10 + 15 = 55 → 総合力 198.0。UR の帯（190以上）で、
     * 同じ 198.0 の a026 ヘカの言葉と並ぶ。最上位の a002 招雷の儀（252.0）には届かない。
     */
    effects: [
      { type: 'gainEnergy' },
      { type: 'draw', value: 2 },
      { type: 'discardEnergy', target: 'opponentActive', value: 1 },
    ],
  },
  {
    id: 'a028', name: '星辰正しき刻', ruby: 'せいしんただしきとき', kind: 'action',
    origin: 'cthulhu', rarity: 'ultra',
    flavor: '星が正しい位置に戻る刻。囁きは意味を持ちはじめ、控えていた者まで巻き込んでいく。',
    /*
     * クトゥルフの道標は C1 / R2 / SR1 で、こちらも**空いているのが UR だけ**。
     *
     * **a021 星辰の囁きの続き**として置いた。囁き（R・draw + 毒）が聞こえる夜の、
     * その先にある刻。同じ系統の既存カードと対にすると据わりがよい（2026-09-23 の例）。
     *
     * あわせて**対象の偏りを埋める**。道標26種の対象は opponentActive 15 に対して
     * opponentBenchAll は2しかない。控えている者まで巻き込む話なので、ここで3つ目にする。
     *
     * 評価値は 25×1.5 + 15 + 5 = 57.5 → 総合力 207.0。UR の帯の中。
     */
    effects: [
      { type: 'damage', target: 'opponentBenchAll', value: 25 },
      { type: 'applyStatus', target: 'opponentActive', status: 'poisoned' },
      { type: 'draw', value: 1 },
    ],
  },
  {
    id: 'a029', name: '天命の粘土板', ruby: 'てんめいのねんばん', kind: 'action',
    origin: 'mesopotamia', rarity: 'ultra',
    flavor: '神々の序列を定める板。掲げた者が天の命を読み上げ、聞いた者は等しく従わされる。',
    /*
     * メソポタミアの道標は C2 / R1 で、**SR も UR も無い唯一の系統**だった
     * （2026-10-03 実測）。道標の UR が無いのは greece / japan / mesopotamia / norse の
     * 4系統で、今夜はそのうち mesopotamia と japan を埋める。
     *
     * あわせて**対象の偏りを埋める**。道標28種の対象は opponentActive 17 に対して
     * opponentBenchAll は3しかない。読み上げは居並ぶ者すべてに届くので、ここで4つ目にする。
     *
     * 評価値は 30×1.5 + 2×5 = 55 → 総合力 198.0。UR の帯（190以上）の中。
     */
    effects: [
      { type: 'damage', target: 'opponentBenchAll', value: 30 },
      { type: 'draw', value: 2 },
    ],
  },
  {
    id: 'a030', name: '大祓', ruby: 'おおはらえ', kind: 'action',
    origin: 'japan', rarity: 'ultra',
    flavor: '半年ぶんの穢れを川に流す神事。負うた傷も、負わせた咎も、水に溶けて海へ下る。',
    /*
     * 日本の道標は C1 / SR2 で、R も UR も無かった。UR を埋める。
     *
     * **相手を見ない道標は初めてである。** 道標28種の対象は opponentActive に17も
     * 寄っていて、ownBenchAll は2しかない。祓いは自分の側を清める神事なので、
     * 控えまで含めて戻す形がそのまま合う。
     *
     * **ダメージを持たない回復専用なので、8.2 の「回復 < ダメージ」は字義どおりには
     * 適用できない**（SPEC 16.7）。健全さは**ターン上限到達率 0%** で見る。
     * a004 大癒しの祈り（回復のみ・R）が先例。
     *
     * 評価値は 40×0.4 + 40×0.6 + 3×5 = 55 → 総合力 198.0。UR の帯の中。
     */
    effects: [
      { type: 'heal', target: 'ownBenchAll', value: 40 },
      { type: 'heal', target: 'ownActive', value: 40 },
      { type: 'draw', value: 3 },
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
      // 90 だと対応キャラ（ユグドラシルEX）の最強ワザとの差が +2 しかなく、
      // コストとターンを払って撃つ意味が無かった。他の絶技と同じ +10〜+20 に合わせる
      // （u003 黄の印 が同じ理由で死に札になった実例がある。SPEC 16.5）
      { type: 'damage', target: 'opponentActive', value: 100 },
      { type: 'heal', target: 'self', value: 20 },
    ],
  },
  {
    id: 'u003', name: '黄の印', ruby: 'きいろのしるし', kind: 'ultimate',
    origin: 'cthulhu', rarity: 'ultra', requires: 'k006',
    flavor: '風がかたちを変え、見てはならない印を空に描く。読めた者から崩れていく。',
    cost: ['wind', 'wind', 'colorless'],
    effects: [
      // ハスターEX 自身の「かぜにのるもの」と同コスト同威力だったため、
      // 絶技が一度も選ばれない死に札になっていた。他の絶技と同じく
      // 対応キャラの最強ワザより一段上に置く（夜間レポート 2026-08-19）
      { type: 'damage', target: 'opponentActive', value: 120 },
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
  {
    id: 'u009', name: '光芒一閃', ruby: 'こうぼういっせん', kind: 'ultimate',
    origin: 'original', rarity: 'ultra', requires: 'l009',
    flavor: '影が追いつくより先に、光は直線を抜けきっている。並んだ者はもう見えない。',
    cost: ['light', 'light', 'colorless'],
    effects: [
      { type: 'damage', target: 'opponentActive', value: 120 },
      { type: 'discardEnergy', target: 'opponentActive', value: 1 },
    ],
  },
  {
    id: 'u010', name: '大地震', ruby: 'おおなゐ', kind: 'ultimate',
    origin: 'greece', rarity: 'ultra', requires: 'w001',
    flavor: '矛の先が海底を打つ。ひび割れは岸まで走り、立っていられる者はいない。',
    cost: ['water', 'water', 'colorless'],
    effects: [
      { type: 'damage', target: 'opponentActive', value: 80 },
      { type: 'damage', target: 'opponentBenchAll', value: 10 },
    ],
  },
  {
    id: 'u011', name: '焼き払う剣', ruby: 'やきはらうつるぎ', kind: 'ultimate',
    origin: 'norse', rarity: 'ultra', requires: 'f003',
    flavor: '太陽より明るい炎の剣。振り抜いた跡には、燃やすものが何も残らない。',
    cost: ['fire', 'fire', 'colorless'],
    effects: [
      { type: 'damage', target: 'opponentActive', value: 70 },
      { type: 'discardEnergy', target: 'opponentActive', value: 1 },
    ],
  },
  {
    id: 'u012', name: '九歩の雷', ruby: 'きゅうほのいかずち', kind: 'ultimate',
    origin: 'norse', rarity: 'ultra', requires: 't004',
    flavor: '大蛇の頭を砕いた槌。返り血の毒を浴び、九歩あゆんで倒れると知りながら振るう。',
    cost: ['thunder', 'thunder', 'colorless'],
    effects: [
      { type: 'damage', target: 'opponentActive', value: 90 },
      { type: 'selfDamage', value: 10 },
    ],
  },
  {
    id: 'u013', name: '五色の石', ruby: 'ごしきのいし', kind: 'ultimate',
    origin: 'china', rarity: 'ultra', requires: 'e009',
    flavor: '崩れた天の裂け目を、練り上げた五色の石で塞ぐ。世界が繕われるあいだ、己の傷もまた閉じていく。',
    cost: ['earth', 'earth', 'colorless'],
    effects: [
      // 女媧の最強ワザ「天を繕う」は効率 27.33。ここを 30.67 にして比 1.122 に置く。
      // 中国系統はこれが初の絶技で、SPEC 16.5.2 が「作れない」としていた4系統のひとつ
      { type: 'damage', target: 'opponentActive', value: 80 },
      { type: 'heal', target: 'self', value: 20 },
    ],
  },
  {
    id: 'u014', name: '四方の風', ruby: 'しほうのかぜ', kind: 'ultimate',
    origin: 'mesopotamia', rarity: 'ultra', requires: 't009',
    flavor: '四方から呼んだ風で大蛇の腹を膨らませ、動けなくしてから射抜く。裂けた体は天と地に分けられた。',
    cost: ['thunder', 'thunder', 'colorless'],
    effects: [
      // マルドゥクの最強ワザ「五十の名」は効率 26.67。ここを 30.83 にして比 1.156 に置く。
      // 中東系統もこれが初の絶技
      { type: 'damage', target: 'opponentActive', value: 70 },
      { type: 'damage', target: 'opponentBenchAll', value: 15 },
    ],
  },
  {
    id: 'u015', name: 'アメン＝ラーの顕現', ruby: 'アメン＝ラーのけんげん', kind: 'ultimate',
    origin: 'egypt', rarity: 'ultra', requires: 'k009',
    flavor: '隠れていた風が姿を現し、王として立つ。名を知られた瞬間、その息はすべてを薙ぎ払う。',
    cost: ['wind', 'wind', 'colorless'],
    effects: [
      /*
       * アメンの最強ワザ「隠れたる者」は効率 26.67。ここを 33.33 にして比 1.25 に置く。
       * エジプト系統はこれが初の絶技。
       *
       * **使用率が低いのは承知のうえ。原因は効果ではなく対応姫神の生存力にある。**
       * 最初は `switchOpponent` を添えて 85ダメージにしたが、pool 1万戦で使用率 12.8%。
       * 素の打点 100 に振り直しても 13.4% でほとんど動かなかった。
       *
       * 絶技16種を対応姫神ごとに並べると、EX 由来の平均使用率 37.5% に対して
       * 非EX 由来は 21.1%。非EX のなかでも HP 順に並び、アメンは **HP110 で最小**である。
       * 撃つ価値（＝効率比）が基準内でも、**バトル場に立ち続けられなければ撃つ機会が来ない**。
       * SPEC 16.5.1 の効率比は前者しか見ていない（2026-09-05 の夜間ジョブで測定）
       */
      { type: 'damage', target: 'opponentActive', value: 100 },
    ],
  },
  {
    id: 'u016', name: '血より生る神', ruby: 'ちよりなるかみ', kind: 'ultimate',
    origin: 'japan', rarity: 'ultra', requires: 'f001',
    flavor: '斬られた体から流れた血が岩に落ち、そのたびに新しい神が立ち上がった。',
    cost: ['fire', 'fire', 'colorless'],
    effects: [
      // カグツチの最強ワザ「焼き尽くす」は効率 23.33。ここを 27.67 にして比 1.186 に置く。
      // 絶技で searchCreature を使うのは初。血から神が生まれる神話をそのまま効果にした
      { type: 'damage', target: 'opponentActive', value: 75 },
      { type: 'searchCreature' },
    ],
  },
  {
    id: 'u019', name: '千の御名', ruby: 'せんのみな', kind: 'ultimate',
    origin: 'india', rarity: 'ultra', requires: 'w010',
    flavor: '千の名で呼ばれる維持の神。名をひとつ唱えるごとに世界が保たれ、唱えた者の内にも力が満ちる。',
    cost: ['water', 'water', 'colorless'],
    effects: [
      /*
       * ヴィシュヌの最強ワザ「十の顕現」は効率 30.00。ここを 35.00 にして比 1.167 に置く。
       * **インド系統はこれが初の絶技**（16種を数えたところ india が0だった）。
       *
       * 絶技で attachEnergy を使うのも初。維持の神なので、討つと同時に
       * 自分のバトル場を整える形にした。damage + attachEnergy の組も絶技では初
       */
      { type: 'damage', target: 'opponentActive', value: 70 },
      { type: 'attachEnergy', target: 'ownActive', value: 1 },
    ],
  },
  {
    id: 'u020', name: '終わりなき夜', ruby: 'おわりなきよる', kind: 'ultimate',
    origin: 'egypt', rarity: 'ultra', requires: 'd010',
    flavor: '日輪の船を待ち伏せる大蛇。斬られても翌日にはまた地平へ戻り、夜ごと同じ戦いが繰り返される。',
    cost: ['dark', 'dark', 'colorless'],
    effects: [
      /*
       * アペプの最強ワザ「日輪を呑む」は効率 31.67。ここを 35.00 にして比 1.105 に置く。
       * 闇属性の絶技は u008 の1種だけだったので、これで2種になる。
       *
       * **絶技で damagePerHeads を使うのは初。** 毎夜くり返され、そのたびに
       * 結果が変わる戦いなので、確定打点にコイン3枚ぶんを重ねた
       */
      { type: 'damage', target: 'opponentActive', value: 75 },
      { type: 'damagePerHeads', target: 'opponentActive', value: 20, count: 3 },
    ],
  },
  {
    id: 'u021', name: '指南車', ruby: 'しなんしゃ', kind: 'ultimate',
    origin: 'china', rarity: 'ultra', requires: 'e011',
    flavor: '霧に巻かれても南を指しつづける車。隠れた者は引きずり出され、帝の正面に立たされる。',
    cost: ['earth', 'earth', 'colorless'],
    effects: [
      /*
       * 黄帝EX の最強ワザ「涿鹿の戦い」は効率 33.33。ここを 36.67 にして比 1.100 に置く。
       * 中国系統の絶技は u013 の1種だけだったので、これで2種になる。
       *
       * **絶技で switchOpponent を使うのは初。** 支援カード7枚が使っているのに
       * 絶技18種では一度も出ていなかった（2026-09-29 実測）。
       *
       * **順番に意味がある。** 効果は書いた順に適用される（core/effects.ts の
       * applyEffects）ので、**引きずり出してから殴る**。霧の中の蚩尤を指南車が
       * 見つけ出す話なので、当たるのは入れ替わって出てきたほうである。
       * ベンチが空のときは switchOpponent が何もせず、打点だけが通る。
       */
      { type: 'switchOpponent' },
      { type: 'damage', target: 'opponentActive', value: 100 },
    ],
  },
  {
    id: 'u022', name: '原初の海', ruby: 'げんしょのうみ', kind: 'ultimate',
    origin: 'mesopotamia', rarity: 'ultra', requires: 'w011',
    flavor: '真水と塩水が分かれる前の海。すべてはここから生まれ、呑まれれば元のひとつに戻る。',
    cost: ['water', 'water', 'colorless'],
    effects: [
      /*
       * ティアマトEX の最強ワザ「十一の魔獣」は効率 31.67。
       * ここを 40.00 にして比 1.263 に置く。
       * メソポタミア系統の絶技は u014 の1種だけだったので、これで2種になる。
       *
       * 生まれる前の海に戻す話なので、**バトル場とベンチの区別なく**波が及ぶ。
       */
      { type: 'damage', target: 'opponentActive', value: 90 },
      { type: 'damage', target: 'opponentBenchAll', value: 20 },
    ],
  },
  {
    id: 'u023', name: '終末の舞踏', ruby: 'しゅうまつのぶとう', kind: 'ultimate',
    origin: 'india', rarity: 'ultra', requires: 'f011',
    flavor: '踏み鳴らす足が刻を終わらせる。灰になった世界の上で、同じ足がもう一度刻を始める。',
    cost: ['fire', 'fire', 'colorless'],
    effects: [
      /*
       * シヴァEX の最強ワザ「破壊の舞」は効率 30.00。
       * ここを 34.17 にして比 1.139 に置く（SPEC 16.5.1 の 1.05〜1.30）。
       *
       * **踊り手も灼ける**ので、元のワザと同じく selfDamage を残す。
       * 世界を終わらせる話なので、バトル場だけでなく控えにも灰が降る。
       */
      { type: 'damage', target: 'opponentActive', value: 90 },
      { type: 'damage', target: 'opponentBenchAll', value: 15 },
      { type: 'selfDamage', value: 10 },
    ],
  },
  {
    id: 'u024', name: '日月の双眼', ruby: 'じつげつのそうがん', kind: 'ultimate',
    origin: 'egypt', rarity: 'ultra', requires: 'k010',
    flavor: '右の眼が日を、左の眼が月を見る。二つが同時に開いたとき、隠れていられる者はいない。',
    cost: ['wind', 'wind', 'colorless'],
    effects: [
      /*
       * ホルスEX の最強ワザ「天空の裁き」は効率 33.33。
       * ここを 38.33 にして比 1.150 に置く。
       *
       * **双眼なので的が2つ**になる。元のワザが
       * opponentActive + opponentBenchRandom だったのを引き継ぎ、
       * 「隠れていられる者はいない」ぶん控えへの一撃を強くした。
       */
      { type: 'damage', target: 'opponentActive', value: 100 },
      { type: 'damage', target: 'opponentBenchRandom', value: 30 },
    ],
  },
]
