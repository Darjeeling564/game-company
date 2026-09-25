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
]
