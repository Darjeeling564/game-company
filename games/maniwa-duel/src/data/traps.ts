/**
 * 罠（道標 ＝ 兆し・合図）。SPEC 6.3。
 *
 * **v1 はすべて通常罠（trapType: 'normal'）で、開けるのは
 * 相手のバトルフェイズ・攻撃宣言時の1回だけ**（SPEC 11章）。
 * 永続罠とカウンター罠は型だけ用意して実装しない。カウンター罠は
 * チェーンが無いと無効にする対象そのものが生まれないため（SPEC 6.4）。
 *
 * 罠は**戦闘計算の前**に解決される。攻撃してきた姫神の攻撃力を下げる罠は、
 * その場の勝ち負けをひっくり返せる。
 *
 * 名前・ルビ・説明文・系統・レアリティ・イラストは maniwa-tcg と同じもので、
 * 効果だけを書き直している（SPEC 6.2）。
 *
 * **CLAUDE.md 7章5 に従い、まだ全26種ではない。**
 */
import type { TrapDef } from '../core/types.ts'

export const TRAPS: readonly TrapDef[] = [
  {
    id: 'a003', name: '交代の号令', ruby: 'こうたいのごうれい', kind: 'trap',
    trapType: 'normal',
    // 「下がれ」の合図なので、攻撃を止めて守りに回らせる
    flavor: '前線に響く一声。踏み込んだ足が、そのまま退きに変わる。',
    origin: 'china', rarity: 'common',
    onActivate: [
      { type: 'negateAttack' },
      { type: 'position', target: 'attacker', position: 'defense' },
    ],
  },
  {
    id: 'a004', name: '大癒しの祈り', ruby: 'だいいやしのいのり', kind: 'trap',
    trapType: 'normal',
    flavor: '傷は消えない。ただ、立ち上がるまでの時間だけが与えられる。',
    origin: 'india', rarity: 'common',
    onActivate: [{ type: 'lifeHeal', target: 'self', value: 1200 }],
  },
  {
    id: 'a006', name: '祟りの札', ruby: 'たたりのふだ', kind: 'trap',
    trapType: 'normal',
    // 攻撃してきた相手を弱らせる。戦闘計算の前に効くので勝敗がひっくり返る
    flavor: '踏み込んだ者にだけ貼りつく。振り上げた腕が、急に重くなる。',
    origin: 'japan', rarity: 'rare',
    onActivate: [{ type: 'atkChange', target: 'attacker', value: -1000 }],
  },
  {
    id: 'a008', name: '焦土の誓い', ruby: 'しょうどのちかい', kind: 'trap',
    trapType: 'normal',
    flavor: '退くときは、何ひとつ残さない。自分の畑も、井戸も。',
    origin: 'mesopotamia', rarity: 'common',
    onActivate: [{ type: 'lifeDamage', target: 'opponent', value: 900 }],
  },
  {
    id: 'a012', name: '神罰', ruby: 'しんばつ', kind: 'trap',
    trapType: 'normal',
    // 踏み越えた者が撃たれる。攻撃してきた1体を破壊する
    flavor: '越えてはならぬ線を越えた者に下る。理由は告げられない。',
    origin: 'greece', rarity: 'rare',
    onActivate: [{ type: 'negateAttack' }, { type: 'destroy', target: 'attacker' }],
  },
  {
    id: 'a013', name: '運命の三女神', ruby: 'うんめいのさんじょしん', kind: 'trap',
    trapType: 'normal',
    flavor: '一人が糸を紡ぎ、一人が長さを測り、一人が断つ。三人の手は止まらない。',
    origin: 'norse', rarity: 'superRare',
    onActivate: [{ type: 'draw', value: 2 }],
  },
  {
    id: 'a019', name: '金翅鳥の急襲', ruby: 'こんじちょうのきゅうしゅう', kind: 'trap',
    trapType: 'normal',
    flavor: '空の一点から落ちてくる。見上げたときには、もう爪が届いている。',
    origin: 'india', rarity: 'rare',
    onActivate: [
      { type: 'atkChange', target: 'attacker', value: -600 },
      { type: 'lifeDamage', target: 'opponent', value: 300 },
    ],
  },
  {
    id: 'a023', name: 'ギャラルホルン', kind: 'trap',
    trapType: 'normal',
    // 「攻めが来たことを告げる角笛」なので、止めて備えさせる
    flavor: '世界の終わりを告げる角笛。鳴った以上、誰も知らぬふりはできない。',
    origin: 'norse', rarity: 'superRare',
    onActivate: [{ type: 'negateAttack' }, { type: 'search', kind: 'monster' }],
  },

  // --------------------------------- 2026-10-01 追加（待ち行列5・1晩目）
  {
    id: 'a002', name: '招雷の儀', ruby: 'しょうらいのぎ', kind: 'trap',
    trapType: 'normal',
    // maniwa-tcg は attachEnergy 2。こちらにエネルギーは無いので「二重の力」は
    // 表せない。雷を呼び下ろす側を採り、攻撃を止めてから場を薙ぐ形にした。
    // 罠の UR はこれが初（これまで C3 / R3 / SR2 で UR が無かった）。
    // 相手モンスター全体を破壊する札も初なので、最上位の1枚にふさわしい
    flavor: '雷を呼び下ろす秘儀。触れた者の内に、二重の力が満ちる。',
    origin: 'india', rarity: 'ultra',
    onActivate: [
      { type: 'negateAttack' },
      { type: 'destroy', target: 'opponentMonsterAll' },
    ],
  },
  {
    id: 'a007', name: '封印の陣', ruby: 'ふういんのじん', kind: 'trap',
    trapType: 'normal',
    // maniwa-tcg は discardEnergy 2。「踏み入った者から力を吸い上げる」ので、
    // 攻撃を止めたうえで手札を1枚取り上げる形にした
    flavor: '地に描いた八角の陣。踏み入った者は力を吸い上げられる。',
    origin: 'china', rarity: 'rare',
    onActivate: [
      { type: 'negateAttack' },
      { type: 'discard', target: 'opponent', value: 1 },
    ],
  },

  // --------------------------------- 2026-10-02 追加（待ち行列5・2晩目）
  {
    id: 'a005', name: '招集の祈り', ruby: 'しょうしゅうのいのり', kind: 'trap',
    trapType: 'normal',
    // 攻められた側が応援を呼ぶ形。攻撃は止めない（止める罠は既に3種あるので、
    // 「受けてから立て直す」側を増やす）
    flavor: '八百万を呼び集める祝詞。応じた者が一柱、列に加わる。',
    origin: 'japan', rarity: 'common',
    onActivate: [
      { type: 'search', kind: 'monster' },
      { type: 'draw', value: 1 },
    ],
  },
  {
    id: 'a010', name: '双龍の采配', ruby: 'そうりゅうのさいはい', kind: 'trap',
    trapType: 'normal',
    // maniwa-tcg は attachEnergy ownBenchAll。エネルギーが無いので「控えの列すべてに
    // 気が通る」を自分の姫神全体の攻撃力に読み替えた。
    // **攻撃力を上げる向きの atkChange はこれが初**（既存は相手を下げるものだけ）。
    // ターン終了で戻るので、迎え撃つ一度きりの采配になる
    flavor: '二頭の龍を従えた将の指示。控えの列すべてに気が通る。',
    origin: 'china', rarity: 'superRare',
    onActivate: [{ type: 'atkChange', target: 'ownMonsterAll', value: 600 }],
  },

  // --------------------------------- 2026-10-03 追加（待ち行列5・3晩目）
  {
    id: 'a009', name: '巫女の舞', ruby: 'みこのまい', kind: 'trap',
    trapType: 'normal',
    // maniwa-tcg は gainEnergy + draw 1。エネルギーが無いので「場が清まる」側を採り、
    // 攻撃を無効にしてから引く形にした
    flavor: '鈴を鳴らして舞う奉納。場が清まり、力の巡りが早くなる。',
    origin: 'japan', rarity: 'superRare',
    onActivate: [
      { type: 'negateAttack' },
      { type: 'draw', value: 1 },
    ],
  },
  {
    id: 'a020', name: 'セルケトの針', ruby: 'セルケトのはり', kind: 'trap',
    trapType: 'normal',
    // maniwa-tcg は applyStatus（毒）+ discardEnergy。どちらも姫神戦記には無いので、
    // 「毒に痺れて力の巡りが止まる」を**攻撃してきた姫神の弱体化と手札の剥がし**に
    // 読み替えた。attacker を狙う罠は a006 / a019 に続いて3種目
    flavor: '死者の内臓を守る蠍の女神。刺された者は毒に痺れ、力の巡りが止まる。',
    origin: 'egypt', rarity: 'rare',
    onActivate: [
      { type: 'atkChange', target: 'attacker', value: -800 },
      { type: 'discard', target: 'opponent', value: 1 },
    ],
  },

  // --------------------------------- 2026-10-04 追加（待ち行列5・4晩目）
  {
    id: 'a015', name: '死者の書', ruby: 'ししゃのしょ', kind: 'trap',
    trapType: 'normal',
    // maniwa-tcg は heal ownBenchAll + searchCreature。控えという概念が無いので、
    // 「道案内」の側を採って自分のライフを戻し、次の一柱を呼ぶ形にした
    flavor: '棺に納める道案内の巻物。冥界の門番の名と、通るための言葉が記してある。',
    origin: 'egypt', rarity: 'rare',
    onActivate: [
      { type: 'lifeHeal', target: 'self', value: 600 },
      { type: 'search', kind: 'monster' },
    ],
  },
  {
    id: 'a024', name: 'レテの水', ruby: 'レテのみず', kind: 'trap',
    trapType: 'normal',
    // maniwa-tcg は discardEnergy + draw 2。エネルギーが無いので「握っていた力の名前を
    // 思い出せなくなる」を**攻撃してきた姫神が攻撃を忘れる**＝無効化に読み替えた
    flavor: '冥府を流れる忘却の川。ひと口飲んだ者は、握っていた力の名前を思い出せなくなる。',
    origin: 'greece', rarity: 'rare',
    onActivate: [
      { type: 'negateAttack' },
      { type: 'draw', value: 2 },
    ],
  },

  // --------------------------------- 2026-10-05 追加（待ち行列5・5晩目）
  {
    id: 'a001', name: '天啓', ruby: 'てんけい', kind: 'trap',
    trapType: 'normal',
    // maniwa-tcg と同じ draw 3。攻撃を受けた側が次の道を示される形になる。
    // 止めない罠なので、受けてから立て直す側に入る
    flavor: '神託所に降りる啓示。問うた者の前に、進むべき道が三つ示される。',
    origin: 'greece', rarity: 'common',
    onActivate: [{ type: 'draw', value: 3 }],
  },
  {
    id: 'a014', name: '二羽の渡り', ruby: 'フギンとムニン', kind: 'trap',
    trapType: 'normal',
    // maniwa-tcg は draw 2 + searchCreature。こちらでも「見聞きしたすべてを
    // 主の耳に囁く」ので、引いたうえで次の一柱を呼ぶ
    flavor: '思考と記憶の名を持つ双烏。世界を巡り、見聞きしたすべてを主の耳に囁く。',
    origin: 'norse', rarity: 'rare',
    onActivate: [
      { type: 'draw', value: 2 },
      { type: 'search', kind: 'monster' },
    ],
  },

  // --------------------------------- 2026-10-06 追加（待ち行列5・6晩目）
  {
    id: 'a018', name: '七つの門', ruby: 'ななつのもん', kind: 'trap',
    trapType: 'normal',
    // maniwa-tcg は discardEnergy + switchOpponent。エネルギーが無いので
    // 「身につけたものを一つ剥ぎ取る」を手札に当て、くぐらされるほうは
    // **攻撃してきた者を守備に伏せる**形で残した
    flavor: '冥界へ下るには七つの門をくぐる。門番は一つくぐるごとに、身につけたものを一つ剥ぎ取る。',
    origin: 'mesopotamia', rarity: 'rare',
    onActivate: [
      { type: 'discard', target: 'opponent', value: 1 },
      { type: 'position', target: 'attacker', position: 'defense' },
    ],
  },
  {
    id: 'a026', name: 'ヘカの言葉', ruby: 'ヘカのことば', kind: 'trap',
    trapType: 'normal',
    // maniwa-tcg は switchOpponent + damage 30 + discardEnergy。
    // 「逆らうことも隠れることもできない」ので、攻撃してきた者を伏せ、
    // ライフを削り、手札を1枚落とす。3つの働きをそのまま移した
    flavor: '魔法そのものを司る神。正しい名で呼ばれた者は、逆らうことも隠れることもできない。',
    origin: 'egypt', rarity: 'ultra',
    onActivate: [
      { type: 'position', target: 'attacker', position: 'defense' },
      { type: 'lifeDamage', target: 'opponent', value: 600 },
      { type: 'discard', target: 'opponent', value: 1 },
    ],
  },

  // --------------------------------- 2026-10-08 追加（待ち行列5・8晩目）
  {
    id: 'a022', name: '深淵の呼び声', ruby: 'しんえんのよびごえ', kind: 'trap',
    trapType: 'normal',
    // maniwa-tcg は damage 20 + discardEnergy。エネルギーが無いので
    // 「応えた者は、二度と浮かんでこない」側を採り、**呼びかけに応えた者**
    // ＝攻撃してきた姫神を沈める形にした。罠なので attacker を指せる
    flavor: '海の底から呼ばれている。応えた者は、二度と浮かんでこない。',
    origin: 'cthulhu', rarity: 'superRare',
    onActivate: [
      { type: 'destroy', target: 'attacker' },
      { type: 'lifeDamage', target: 'opponent', value: 400 },
    ],
  },
  {
    id: 'a025', name: 'ドゥルガーの凱旋', ruby: 'ドゥルガーのがいせん', kind: 'trap',
    trapType: 'normal',
    // maniwa-tcg は damage 30 + heal 20。姫神へのダメージはライフへ移る。
    // 回復のほうは「倒れていた者も、その姿を見て立ち上がった」をそのまま採り、
    // 墓地から1体を立たせる形にした
    flavor: '水牛の魔神を討ち取った女神が、十の腕に武器を提げて帰ってくる。倒れていた者も、その姿を見て立ち上がった。',
    origin: 'india', rarity: 'superRare',
    onActivate: [
      { type: 'lifeDamage', target: 'opponent', value: 600 },
      { type: 'revive' },
    ],
  },
  {
    id: 'a017', name: '星からの色', ruby: 'ほしからのいろ', kind: 'trap',
    trapType: 'normal',
    // maniwa-tcg は damage opponentBenchRandom 40 + draw。控えという概念が無いので、
    // 「畑の隅から順に、生きているものの色が抜けていく」を**相手の場全体から
    // 力が抜ける**形にした。40×20 = 800 を場全体に散らすので -400 とする。
    // **atkChange で opponentMonsterAll を指すのは罠で初**（attacker 3 / ownMonsterAll 1 だった）
    flavor: '隕石とともに落ちてきた、名前のない色。畑の隅から順に、生きているものの色が抜けていく。',
    origin: 'cthulhu', rarity: 'rare',
    onActivate: [
      { type: 'atkChange', target: 'opponentMonsterAll', value: -400 },
      { type: 'draw', value: 1 },
    ],
  },
  {
    id: 'a027', name: '天命', ruby: 'てんめい', kind: 'trap',
    trapType: 'normal',
    // maniwa-tcg は gainEnergy + draw 2 + discardEnergy。エネルギーの2つが
    // 意味を失うので、「天が王を選び直す。与えられていた力は静かに離れ、
    // 別の手のひらへ移っていく」をそのまま**選び直し**として書いた。
    // 相手の姫神1体が退き、こちらの墓地から1体が立つ。
    // **destroy で opponentMonsterOne を指すのは罠で初**（attacker 2 /
    // opponentMonsterAll 1 だった）。revive も罠では1種しかなかった
    flavor: '天が王を選び直す。与えられていた力は静かに離れ、別の手のひらへ移っていく。',
    origin: 'china', rarity: 'ultra',
    onActivate: [
      { type: 'destroy', target: 'opponentMonsterOne' },
      { type: 'revive' },
      { type: 'draw', value: 1 },
    ],
  },
  {
    id: 'a016', name: 'イシュタルの門', ruby: 'イシュタルのもん', kind: 'trap',
    trapType: 'normal',
    // maniwa-tcg は damage opponentBenchRandom 30。控えという概念が無いので
    // ライフへ移し、×20 で 600 にした（SPEC 6.1）。
    // 「くぐるたび、身に着けた物をひとつずつ奪われる」は手札落としで表す
    flavor: '冥界へ下る七つの門。くぐるたび、身に着けた物をひとつずつ奪われる。',
    origin: 'mesopotamia', rarity: 'common',
    onActivate: [
      { type: 'discard', target: 'opponent', value: 1 },
      { type: 'lifeDamage', target: 'opponent', value: 600 },
    ],
  },
  {
    id: 'a028', name: '星辰正しき刻', ruby: 'せいしんただしきとき', kind: 'trap',
    trapType: 'normal',
    // maniwa-tcg は damage opponentBenchAll 25 + applyStatus + draw。
    // 控えも状態異常も無いので、「囁きは意味を持ちはじめ、控えていた者まで
    // 巻き込んでいく」の**控えていた者**を墓地の姫神と読み替えた。
    // **revive は罠に2種しか無かった**。u006 星辰再臨 と同じ星辰の並びの札である
    flavor: '星が正しい位置に戻る刻。囁きは意味を持ちはじめ、控えていた者まで巻き込んでいく。',
    origin: 'cthulhu', rarity: 'ultra',
    onActivate: [
      { type: 'revive' },
      { type: 'lifeDamage', target: 'opponent', value: 400 },
      { type: 'draw', value: 1 },
    ],
  },
]
