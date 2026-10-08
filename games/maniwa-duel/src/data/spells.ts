/**
 * 魔法（神具 ＝ 物 / 絶技 ＝ 技）。SPEC 6.3。
 *
 * **v1 はすべて通常魔法（spellType: 'normal'）。** 永続・装備・フィールド・速攻は
 * 型だけ用意して実装しない（SPEC 6.4）。
 *
 * 名前・ルビ・説明文・系統・レアリティ・イラストは maniwa-tcg と同じもので、
 * **効果だけを書き直している**（SPEC 6.2）。エネルギーが無いので
 * gainEnergy / attachEnergy / discardEnergy は意味を失い、damage も
 * 「姫神へのダメージ」から「ライフへのダメージ」に意味が変わるためである。
 *
 * 数値は maniwa-tcg の ×20（攻撃力と同じ倍率。SPEC 6.1）を目安に置いた**たたき台**で、
 * tools/sim.ts で測ってから確定する。
 *
 * **CLAUDE.md 7章5 に従い、ここはまだ全44種ではない。** v1 のデッキ2つを
 * 回すのに要る分だけを置き、ロジックとテストが安定してから残りを足す。
 */
import type { SpellDef } from '../core/types.ts'

export const SPELLS: readonly SpellDef[] = [
  // ------------------------------------------------ 神具（物）
  {
    id: 'i001', name: '神饌の香', ruby: 'しんせんのこう', kind: 'spell',
    spellType: 'normal', form: 'artifact',
    flavor: '供物とともに焚かれる香。煙が立ちのぼるあいだ、神は人の側にいる。',
    origin: 'japan', rarity: 'common',
    onActivate: [{ type: 'lifeHeal', target: 'self', value: 800 }],
  },
  {
    id: 'i002', name: '供物の果実', ruby: 'くもつのかじつ', kind: 'spell',
    spellType: 'normal', form: 'artifact',
    flavor: '祭壇に積まれた初物。捧げた者にだけ、次の実りが約束される。',
    origin: 'greece', rarity: 'common',
    onActivate: [{ type: 'draw', value: 1 }, { type: 'lifeHeal', target: 'self', value: 300 }],
  },
  {
    id: 'i003', name: '神託の石版', ruby: 'しんたくのせきばん', kind: 'spell',
    spellType: 'normal', form: 'artifact',
    flavor: '問うべき言葉だけが刻まれている。答えは、読む者の側にある。',
    origin: 'mesopotamia', rarity: 'common',
    onActivate: [{ type: 'search', kind: 'monster' }],
  },
  {
    id: 'i007', name: '呪詛の釘', ruby: 'じゅそのくぎ', kind: 'spell',
    spellType: 'normal', form: 'artifact',
    // 相手1体に打ち込む札なので、ライフではなく姫神を弱らせる形にした
    flavor: '藁に打てば人に届く。打った者の名も、同じだけ削られていく。',
    origin: 'japan', rarity: 'common',
    onActivate: [{ type: 'atkChange', target: 'opponentMonsterOne', value: -700 }],
  },
  {
    id: 'i010', name: '双面の鏡', ruby: 'そうめんのかがみ', kind: 'spell',
    spellType: 'normal', form: 'artifact',
    // 「向きを変えさせる」札なので、表示形式を守備に倒す
    flavor: '覗けば裏の顔が映る。どちらが本当かは、鏡だけが知っている。',
    origin: 'china', rarity: 'common',
    onActivate: [{ type: 'position', target: 'opponentMonsterOne', position: 'defense' }],
  },
  {
    id: 'i012', name: '豊穣の壺', ruby: 'ほうじょうのつぼ', kind: 'spell',
    spellType: 'normal', form: 'artifact',
    flavor: '底の見えない壺。汲んでも汲んでも、翌朝には満ちている。',
    origin: 'egypt', rarity: 'common',
    onActivate: [{ type: 'lifeHeal', target: 'self', value: 1000 }],
  },
  {
    id: 'i019', name: 'アグニの火箭', ruby: 'アグニのかせん', kind: 'spell',
    spellType: 'normal', form: 'artifact',
    flavor: '火の神の矢。放たれた先で、供物も敵も同じように燃える。',
    origin: 'india', rarity: 'rare',
    onActivate: [{ type: 'lifeDamage', target: 'opponent', value: 800 }],
  },
  {
    id: 'i021', name: 'グングニル', kind: 'spell',
    spellType: 'normal', form: 'artifact',
    // 「必ず当たる槍」なので、数値比べではなく破壊にした
    flavor: '狙った的を外さぬと定められた槍。投げた者にも、もう戻らない。',
    origin: 'norse', rarity: 'ultra',
    onActivate: [{ type: 'destroy', target: 'opponentMonsterOne' }],
  },
  {
    id: 'i022', name: 'パンドラの匣', ruby: 'パンドラのはこ', kind: 'spell',
    spellType: 'normal', form: 'artifact',
    // 開ければ双方に災いが出る。最後に希望が残る、を回復で表した
    flavor: '開けてはならぬと言われた箱。災いが出尽くしたあと、底に希望が残った。',
    origin: 'greece', rarity: 'superRare',
    onActivate: [
      { type: 'lifeDamage', target: 'opponent', value: 1000 },
      { type: 'lifeDamage', target: 'self', value: 400 },
      { type: 'draw', value: 1 },
    ],
  },
  {
    id: 'i026', name: '黄金の林檎', ruby: 'おうごんのりんご', kind: 'spell',
    spellType: 'normal', form: 'artifact',
    flavor: '「最も美しい者へ」と刻まれ、宴のただ中に投げ込まれた。誰の手に落ちるかで、戦は始まった。',
    origin: 'greece', rarity: 'rare',
    onActivate: [
      { type: 'lifeDamage', target: 'opponent', value: 500 },
      { type: 'draw', value: 1 },
    ],
  },

  // ------------------------------------------------ 絶技（技）
  // requires は maniwa-tcg の UltimateCard.requires をそのまま引き継いでいる。
  // 遊戯王の「自分フィールドに《X》が存在する場合に発動できる」と同じ形（SPEC 6.3）。
  {
    id: 'u001', name: '天叢焼', ruby: 'あめのむらやき', kind: 'spell',
    spellType: 'normal', form: 'art', requires: 'f002',
    flavor: '生まれた瞬間に母を焼いた火が、そのまま戦場を舐める。カグツチEXの極み。',
    origin: 'japan', rarity: 'ultra',
    onActivate: [{ type: 'lifeDamage', target: 'opponent', value: 1600 }],
  },
  {
    id: 'u011', name: '焼き払う剣', ruby: 'やきはらうつるぎ', kind: 'spell',
    spellType: 'normal', form: 'art', requires: 'f003',
    flavor: '世界の果てで振るわれる炎の剣。振り下ろされた後には、灰しか残らない。',
    origin: 'norse', rarity: 'ultra',
    onActivate: [
      { type: 'lifeDamage', target: 'opponent', value: 1000 },
      { type: 'destroy', target: 'opponentMonsterOne' },
    ],
  },
  {
    id: 'u016', name: '血より生る神', ruby: 'ちよりなるかみ', kind: 'spell',
    spellType: 'normal', form: 'art', requires: 'f001',
    // 「斬られた体から神々が生まれた」話なので、墓地から戻す形にした
    flavor: '切り裂かれた体から、次々と神が生まれ落ちる。終わりが始まりに変わる瞬間。',
    origin: 'japan', rarity: 'ultra',
    onActivate: [{ type: 'lifeDamage', target: 'opponent', value: 600 }, { type: 'revive' }],
  },
  {
    id: 'u006', name: '星辰再臨', ruby: 'せいしんさいりん', kind: 'spell',
    spellType: 'normal', form: 'art', requires: 'w002',
    flavor: '星が正しい位置に戻るとき、海の底で待つものが目を覚ます。',
    origin: 'cthulhu', rarity: 'ultra',
    onActivate: [
      { type: 'lifeDamage', target: 'opponent', value: 1400 },
      { type: 'lifeDamage', target: 'self', value: 300 },
    ],
  },
  {
    id: 'u010', name: '大地震', ruby: 'おおなゐ', kind: 'spell',
    spellType: 'normal', form: 'art', requires: 'w001',
    // 「地を揺らす」ものなので、場全体に効く形にした
    flavor: '三叉の矛が海底を突くと、陸がまるごと揺れる。地を揺らすのも海の神の業である。',
    origin: 'greece', rarity: 'ultra',
    onActivate: [
      { type: 'lifeDamage', target: 'opponent', value: 800 },
      { type: 'atkChange', target: 'opponentMonsterAll', value: -600 },
    ],
  },
  {
    id: 'u019', name: '千の御名', ruby: 'せんのみな', kind: 'spell',
    spellType: 'normal', form: 'art', requires: 'w010',
    flavor: '千の名で呼ばれる者。名を呼ぶたび、違う姿でそこにいる。',
    origin: 'india', rarity: 'ultra',
    onActivate: [
      { type: 'lifeDamage', target: 'opponent', value: 900 },
      { type: 'draw', value: 1 },
      { type: 'lifeHeal', target: 'self', value: 400 },
    ],
  },

  // --------------------------------- 2026-10-01 追加（待ち行列5・1晩目）
  {
    id: 'i009', name: '生贄の刃', ruby: 'いけにえのやいば', kind: 'spell',
    spellType: 'normal', form: 'artifact',
    // maniwa-tcg は selfDamage 10 + draw 2。こちらは姫神ではなくライフが削れる
    flavor: '己の血を捧げる儀式刀。痛みと引き換えに知恵を得る。',
    origin: 'mesopotamia', rarity: 'common',
    onActivate: [
      { type: 'lifeDamage', target: 'self', value: 200 },
      { type: 'draw', value: 2 },
    ],
  },
  {
    id: 'i011', name: '冥府の渡し銭', ruby: 'めいふのわたしせん', kind: 'spell',
    spellType: 'normal', form: 'artifact',
    // maniwa-tcg は discardEnergy。こちらにエネルギーは無いので、
    // 「渡し銭を払えない」側を採り、手札から1枚を取り上げる形にした。
    // discard を使う最初のカードになる
    flavor: '死者の口に含ませる銭。払えぬ者は岸で立ち尽くす。',
    origin: 'norse', rarity: 'common',
    onActivate: [{ type: 'discard', target: 'opponent', value: 1 }],
  },

  // --------------------------------- 2026-10-02 追加（待ち行列5・2晩目）
  {
    id: 'i006', name: '不死の霊薬', ruby: 'ふしのれいやく', kind: 'spell',
    spellType: 'normal', form: 'artifact',
    // maniwa-tcg は heal 30。姫神ではなくライフが戻る。「量は限られている」ので
    // a004 大癒しの祈り（1200）より控えめに置く
    flavor: '仙人が練り上げた丹薬。飲めば傷は塞がるが、量は限られている。',
    origin: 'china', rarity: 'rare',
    onActivate: [{ type: 'lifeHeal', target: 'self', value: 600 }],
  },
  {
    id: 'i016', name: '銀の鍵', ruby: 'ぎんのかぎ', kind: 'spell',
    spellType: 'normal', form: 'artifact',
    // maniwa-tcg は switchOpponent + searchCreature。入れ替えが無いので
    // 「門を開く」側だけを採り、開ける先を魔法にした。
    // search kind: 'spell' を使う最初のカードになる
    flavor: '幾つもの門を開く鍵。持つ者は、いま立つ世界の外側へ踏み出せる。',
    origin: 'cthulhu', rarity: 'rare',
    onActivate: [
      { type: 'search', kind: 'spell' },
      { type: 'draw', value: 1 },
    ],
  },

  // --------------------------------- 2026-10-03 追加（待ち行列5・3晩目）
  {
    id: 'u002', name: '世界樹の恵み', ruby: 'せかいじゅのめぐみ', kind: 'spell',
    spellType: 'normal', form: 'art', requires: 's001',
    // maniwa-tcg は damage 100 + heal self 20。×20 でライフに置き換える。
    // 回復800はダメージ2000より小さい（SPEC 8.2 と同じ趣旨）
    flavor: '枝が天を覆い、根が泉を汲み上げる。傷つきながらも立ち続ける大樹の力。',
    origin: 'norse', rarity: 'ultra',
    onActivate: [
      { type: 'lifeDamage', target: 'opponent', value: 2000 },
      { type: 'lifeHeal', target: 'self', value: 800 },
    ],
  },
  {
    id: 'u005', name: '神威の雷', ruby: 'しんいのいかずち', kind: 'spell',
    spellType: 'normal', form: 'art', requires: 't003',
    // maniwa-tcg は damage 120 + selfDamage 20。反動はライフへの自傷になる。
    // 対応姫神のゼウスEX は召喚時に場を薙ぐので、こちらは真正面からの一撃にした
    flavor: '天が裂け、逆らう者の上にだけ落ちる。神々の王が下す最後の答え。',
    origin: 'greece', rarity: 'ultra',
    onActivate: [
      { type: 'lifeDamage', target: 'opponent', value: 2400 },
      { type: 'lifeDamage', target: 'self', value: 400 },
    ],
  },

  // --------------------------------- 2026-10-04 追加（待ち行列5・4晩目）
  {
    id: 'i013', name: '劫初の猛毒', ruby: 'ごうしょのもうどく', kind: 'spell',
    spellType: 'normal', form: 'artifact',
    // maniwa-tcg は damage 10 + 毒。姫神戦記に継続の毒は無い（SPEC 6.4 の第2層）ので、
    // 「飲み干すまで効き続ける」側を**攻撃力の低下**に読み替えた。
    // 相手の姫神すべてに効くのは、海ごと毒された話だから
    flavor: '乳海を攪拌したとき、甘露より先に湧き出た毒。世界を焼くまえに飲み干された。',
    origin: 'india', rarity: 'rare',
    onActivate: [
      { type: 'lifeDamage', target: 'opponent', value: 200 },
      { type: 'atkChange', target: 'opponentMonsterAll', value: -400 },
    ],
  },
  {
    id: 'i023', name: '八尺瓊勾玉', ruby: 'やさかにのまがたま', kind: 'spell',
    spellType: 'normal', form: 'artifact',
    // maniwa-tcg は heal 30 + attachEnergy。エネルギーが無いので「隠れた光を招き出す」側を
    // 採り、墓地から1体を呼び戻す形にした。回復と復活を組むのは魔法では初
    flavor: '三種の神器のひとつ。岩戸の前に掲げられ、隠れた光を招き出した玉。',
    origin: 'japan', rarity: 'ultra',
    onActivate: [
      { type: 'lifeHeal', target: 'self', value: 600 },
      { type: 'revive' },
    ],
  },

  // --------------------------------- 2026-10-05 追加（待ち行列5・5晩目）
  {
    id: 'i014', name: '真理の羽根', ruby: 'しんりのはね', kind: 'spell',
    spellType: 'normal', form: 'artifact',
    // maniwa-tcg は discardEnergy + draw 1。エネルギーが無いので
    // 「偽りを載せた皿は重く傾く」を**相手の手札を落とす**側に読み替えた。
    // 釣り合わせる話なので、こちらは1枚引いて枚数を戻す
    flavor: '死者の心臓と釣り合わせる一枚。偽りを載せた皿は、必ず重く傾く。',
    origin: 'egypt', rarity: 'rare',
    onActivate: [
      { type: 'discard', target: 'opponent', value: 1 },
      { type: 'draw', value: 1 },
    ],
  },
  {
    id: 'i020', name: 'ウシャブティ', kind: 'spell',
    spellType: 'normal', form: 'artifact',
    // maniwa-tcg は attachEnergy ownBenchAll。エネルギーが無いので
    // 「名を呼ばれた数だけ起き上がる」側を採り、墓地から1体を立たせる形にした。
    // 代わりに働く人形なので、立たせるだけで打点は持たない
    flavor: '墓に納める従者の人形。死者の代わりに畑を耕すよう、名を呼ばれた数だけ起き上がる。',
    origin: 'egypt', rarity: 'superRare',
    onActivate: [{ type: 'revive' }],
  },

  // --------------------------------- 2026-10-06 追加（待ち行列5・6晩目）
  {
    id: 'i024', name: '天の牡牛の角', ruby: 'あめのおうしのつの', kind: 'spell',
    spellType: 'normal', form: 'artifact',
    // maniwa-tcg は damage opponentBenchAll + discardEnergy。控えもエネルギーも
    // 無いので、「踏み荒らされた地は七年のあいだ実らない」側を採り、
    // **相手の場の全員を弱らせる**形に読み替えた。剥ぎ取るほうは手札に当てる
    flavor: '天から降された牡牛の角。踏み荒らされた地は七年のあいだ実らない。',
    origin: 'mesopotamia', rarity: 'superRare',
    onActivate: [
      { type: 'atkChange', target: 'opponentMonsterAll', value: -400 },
      { type: 'discard', target: 'opponent', value: 1 },
    ],
  },
  {
    id: 'i028', name: 'ウジャトの眼', ruby: 'ウジャトのめ', kind: 'spell',
    spellType: 'normal', form: 'artifact',
    // maniwa-tcg は damage 35 + heal 20 + searchCreature。姫神へのダメージが
    // ライフへ移るだけで、3つの働き（射抜く・癒す・見通す）はそのまま残る。
    // 回復はダメージより小さく保つ（SPEC 8.2 と同じ向き）
    flavor: '抉り取られ、月の数だけ欠けたのち、ふたたび満ちた眼。見通し、癒し、そして射抜く。',
    origin: 'egypt', rarity: 'ultra',
    onActivate: [
      { type: 'lifeDamage', target: 'opponent', value: 700 },
      { type: 'lifeHeal', target: 'self', value: 400 },
      { type: 'search', kind: 'monster' },
    ],
  },

  // --------------------------------- 2026-10-08 追加（待ち行列5・8晩目）
  {
    id: 'i004', name: '聖油の壺', ruby: 'せいゆのつぼ', kind: 'spell',
    spellType: 'normal', form: 'artifact',
    // maniwa-tcg は gainEnergy。エネルギーが無いので「注がれた者は、その日に限り
    // 二度の力を得る」側を採った。atkChange は**ターン終了で戻る**ので、
    // 「その日に限り」がそのまま効果の寿命になる
    flavor: '王の戴冠に用いる香油。注がれた者は、その日に限り二度の力を得る。',
    origin: 'egypt', rarity: 'rare',
    onActivate: [{ type: 'atkChange', target: 'ownMonsterOne', value: 600 }],
  },
  {
    id: 'i027', name: 'ネクロノミコン', kind: 'spell',
    spellType: 'normal', form: 'artifact',
    // maniwa-tcg は draw 4 + gainEnergy + attachEnergy + selfDamage 20。
    // エネルギー2つは意味を失うが、「読み解いた者は世界の裏側を知り、
    // 知った量だけ正気を手放す」という骨格は draw と自傷だけで立つ
    flavor: '狂えるアラブ人が書き遺した書。読み解いた者は世界の裏側を知り、知った量だけ正気を手放す。',
    origin: 'cthulhu', rarity: 'ultra',
    onActivate: [
      { type: 'draw', value: 4 },
      { type: 'lifeDamage', target: 'self', value: 400 },
    ],
  },
]
