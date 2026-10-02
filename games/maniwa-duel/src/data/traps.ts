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
]
