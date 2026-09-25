/**
 * 姫神（モンスター）87体。
 *
 * **数値は maniwa-tcg の姫神から機械的に起こしたたたき台である**（SPEC 6.1）。
 *
 *   攻撃力 = 最大威力 × 20（10刻みに丸め）
 *   守備力 = HP × 10（10刻みに丸め）
 *   レベル = レアリティ（コモン3 / レア4 / SR 5〜6 / UR 7〜8）
 *
 * 「最大威力」は maniwa-tcg の tools/rarity.ts と同じ定義、すなわち
 * そのワザの期待ダメージ換算の最大値である。素のダメージ値ではない。
 *
 * SR と UR は帯の中で2段階に分かれる。境目は**その帯の総合力の中央値**
 * （SR: 267 / UR: 332）で、帯の中で上半分が重いほうのレベルになる。
 *
 * **レアリティがそのままリリース数になる**（SPEC 6.1）。
 * maniwa-tcg で積み上げたレアリティ判定の仕事が、そのまま召喚コストとして生きる。
 *
 * 名前・ルビ・説明文・系統・レアリティ・イラストは maniwa-tcg と同じものである。
 * カードIDも同じで、イラストはIDで結び付く（SPEC 2章）。
 *
 * この式は仮であり、tools/sim.ts で測ってから確定する。
 * **数値が基準を外れても独断で書き換えない**（CLAUDE.md 5章）。
 */
import type { MonsterDef } from '../core/types.ts'

export const MONSTERS: readonly MonsterDef[] = [
  {
    id: 'f001', name: 'カグツチ', kind: 'monster',
    flavor: '生まれ落ちた瞬間に母を焼いた火の神。切り裂かれた体からさらに神々が生まれた。',
    origin: 'japan', rarity: 'rare', attribute: 'fire',
    level: 4, atk: 1400, def: 1200,
  },
  {
    id: 'f002', name: 'カグツチEX', kind: 'monster',
    flavor: '荒ぶる火そのもの。鎮められてなお、封じた社の奥で熱を放ち続けている。',
    origin: 'japan', rarity: 'ultra', attribute: 'fire',
    level: 8, atk: 2100, def: 1800,
  },
  {
    id: 'f003', name: 'スルト', kind: 'monster',
    flavor: '世界の終わりに南方から現れ、炎の剣で大地を焼き尽くす巨人。',
    origin: 'norse', rarity: 'rare', attribute: 'fire',
    level: 4, atk: 1400, def: 1300,
  },
  {
    id: 'f004', name: 'アグニ', kind: 'monster',
    flavor: '七つの舌を持つ火の神。供物を焼いて神々へ届ける、天と地の使者。',
    origin: 'india', rarity: 'common', attribute: 'fire',
    level: 3, atk: 800, def: 1000,
  },
  {
    id: 'f005', name: 'ヘパイストス', kind: 'monster',
    flavor: '足の悪い鍛冶の神。神々の武具はすべてこの手から生まれた。',
    origin: 'greece', rarity: 'rare', attribute: 'fire',
    level: 4, atk: 1300, def: 1100,
  },
  {
    id: 'f006', name: 'シュクユウ', kind: 'monster',
    flavor: '南方をつかさどる火の神。人に火の扱いを教えたとされる。',
    origin: 'china', rarity: 'common', attribute: 'fire',
    level: 3, atk: 800, def: 800,
  },
  {
    id: 'f007', name: 'セクメト', kind: 'monster',
    flavor: '獅子の頭を持つ戦いの女神。怒りは疫病となって国を焼いた。',
    origin: 'egypt', rarity: 'common', attribute: 'fire',
    level: 3, atk: 900, def: 900,
  },
  {
    id: 'f008', name: 'ギビル', kind: 'monster',
    flavor: '金属を精錬し、呪いを焼き払う火の神。裁きの場に立ち会う証人でもある。',
    origin: 'mesopotamia', rarity: 'common', attribute: 'fire',
    level: 3, atk: 1000, def: 900,
  },
  {
    id: 'f009', name: 'クトゥグア', kind: 'monster',
    flavor: '炎の精を率いる旧支配者。這い寄る混沌を焼くために、星の彼方から呼ばれた。',
    origin: 'cthulhu', rarity: 'common', attribute: 'fire',
    level: 3, atk: 1100, def: 900,
  },
  {
    id: 'f010', name: 'ローギ', kind: 'monster',
    flavor: '野を走る火そのものである巨人。食らう速さで神々の王に勝った。',
    origin: 'norse', rarity: 'superRare', attribute: 'fire',
    level: 6, atk: 1400, def: 1200,
  },
  {
    id: 's001', name: 'ユグドラシルEX', kind: 'monster',
    flavor: '九つの世界を貫く大樹。根は泉に届き、枝は天を覆う。',
    origin: 'norse', rarity: 'ultra', attribute: 'forest',
    level: 7, atk: 2000, def: 1700,
  },
  {
    id: 's002', name: 'セイオウボ', kind: 'monster',
    flavor: '崑崙に住まう女仙。三千年に一度実る桃を管理している。',
    origin: 'china', rarity: 'superRare', attribute: 'forest',
    level: 6, atk: 1200, def: 1200,
  },
  {
    id: 's003', name: 'シュブニグラス', kind: 'monster',
    flavor: '千匹の仔を孕む森の黒山羊。豊穣と繁殖の名のもとに増え続ける。',
    origin: 'cthulhu', rarity: 'rare', attribute: 'forest',
    level: 4, atk: 1400, def: 1200,
  },
  {
    id: 's004', name: 'パン', kind: 'monster',
    flavor: '山羊の脚を持つ牧神。その叫びは軍勢を恐慌に陥れた。',
    origin: 'greece', rarity: 'rare', attribute: 'forest',
    level: 4, atk: 1300, def: 900,
  },
  {
    id: 's005', name: 'ヴァースキ', kind: 'monster',
    flavor: '乳海を撹拌する綱にされた蛇王。締めつけられた口から毒を吐いた。',
    origin: 'india', rarity: 'common', attribute: 'forest',
    level: 3, atk: 1000, def: 900,
  },
  {
    id: 's006', name: 'オシリス', kind: 'monster',
    flavor: '殺され、繋ぎ合わされて甦った緑の肌の王。冥界と穀物をつかさどる。',
    origin: 'egypt', rarity: 'superRare', attribute: 'forest',
    level: 6, atk: 1520, def: 1200,
  },
  {
    id: 's007', name: 'ククノチ', kind: 'monster',
    flavor: '木々を生み出した神。山に立つ一本一本にその名が宿るという。',
    origin: 'japan', rarity: 'common', attribute: 'forest',
    level: 3, atk: 1000, def: 900,
  },
  {
    id: 's008', name: 'フンババ', kind: 'monster',
    flavor: '杉の森を守る番人。七つの威光をまとい、侵す者を捉えて離さない。',
    origin: 'mesopotamia', rarity: 'rare', attribute: 'forest',
    level: 4, atk: 1320, def: 1100,
  },
  {
    id: 's009', name: 'ダフネ', kind: 'monster',
    flavor: '追われて月桂樹に姿を変えた妖精。その葉は勝者の冠となり、枯れることがない。',
    origin: 'greece', rarity: 'rare', attribute: 'forest',
    level: 4, atk: 1200, def: 1100,
  },
  {
    id: 'k001', name: 'パズズ', kind: 'monster',
    flavor: '熱風と疫病を運ぶ魔神。一方で、他の魔を退ける護符にもなった。',
    origin: 'mesopotamia', rarity: 'common', attribute: 'wind',
    level: 3, atk: 800, def: 1000,
  },
  {
    id: 'k002', name: 'シナツヒコ', kind: 'monster',
    flavor: '国生みの霧を吹き払った風の神。その息が海を渡る船を押す。',
    origin: 'japan', rarity: 'rare', attribute: 'wind',
    level: 4, atk: 1300, def: 1000,
  },
  {
    id: 'k003', name: 'ヴァーユ', kind: 'monster',
    flavor: '生類の息を司る風神。千頭の馬に引かせた車で天を駆ける。',
    origin: 'india', rarity: 'superRare', attribute: 'wind',
    level: 6, atk: 1500, def: 1100,
  },
  {
    id: 'k004', name: 'アイオロス', kind: 'monster',
    flavor: '風を革袋に封じて管理する島の王。解き放てば船は行き先を失う。',
    origin: 'greece', rarity: 'common', attribute: 'wind',
    level: 3, atk: 800, def: 1100,
  },
  {
    id: 'k005', name: 'シュウ', kind: 'monster',
    flavor: '天と地の間に立ち、両者を引き離し続ける大気の神。',
    origin: 'egypt', rarity: 'superRare', attribute: 'wind',
    level: 5, atk: 1400, def: 1100,
  },
  {
    id: 'k006', name: 'ハスターEX', kind: 'monster',
    flavor: '名を口にすることさえ憚られる存在。黄の印を見た者は正気を失う。',
    origin: 'cthulhu', rarity: 'ultra', attribute: 'wind',
    level: 8, atk: 2300, def: 1700,
  },
  {
    id: 'k007', name: 'ニョルズ', kind: 'monster',
    flavor: '航海と豊漁をつかさどる神。祈れば風は必ず追い風に変わる。',
    origin: 'norse', rarity: 'superRare', attribute: 'wind',
    level: 5, atk: 1300, def: 1200,
  },
  {
    id: 'k008', name: 'フェイリェン', kind: 'monster',
    flavor: '風伯と呼ばれる風の司。鹿の体に雀の頭を持つ姿で描かれる。',
    origin: 'china', rarity: 'rare', attribute: 'wind',
    level: 4, atk: 1200, def: 1000,
  },
  {
    id: 'k009', name: 'アメン', kind: 'monster',
    flavor: '姿を持たぬ風として世界を満たす神。名を隠したまま、王の背を押して玉座へ導く。',
    origin: 'egypt', rarity: 'rare', attribute: 'wind',
    level: 4, atk: 1600, def: 1100,
  },
  {
    id: 'e001', name: 'デメテル', kind: 'monster',
    flavor: '穀物の女神。娘を奪われた嘆きが、大地から実りを消し去った。',
    origin: 'greece', rarity: 'superRare', attribute: 'earth',
    level: 6, atk: 1500, def: 1200,
  },
  {
    id: 'e002', name: 'オオゲツヒメ', kind: 'monster',
    flavor: '体から食物を生み出す女神。斬られた亡骸から五穀が芽吹いた。',
    origin: 'japan', rarity: 'common', attribute: 'earth',
    level: 3, atk: 1000, def: 1000,
  },
  {
    id: 'e003', name: 'シェンノウ', kind: 'monster',
    flavor: '農耕と医薬を教えた神農。百草を舐めて薬と毒を見分けたという。',
    origin: 'china', rarity: 'common', attribute: 'earth',
    level: 3, atk: 920, def: 1100,
  },
  {
    id: 'e004', name: 'ゲブ', kind: 'monster',
    flavor: '横たわる大地そのものである神。笑うと地が揺れると言われた。',
    origin: 'egypt', rarity: 'rare', attribute: 'earth',
    level: 4, atk: 1100, def: 1100,
  },
  {
    id: 'e005', name: 'ニンフルサグ', kind: 'monster',
    flavor: '粘土から人を形づくった大地の母。傷を癒す術も彼女のものだ。',
    origin: 'mesopotamia', rarity: 'common', attribute: 'earth',
    level: 3, atk: 1040, def: 1000,
  },
  {
    id: 'e006', name: 'プリティヴィー', kind: 'monster',
    flavor: '広大な大地の女神。すべてを載せて揺るがぬ、最も古い神の一柱。',
    origin: 'india', rarity: 'common', attribute: 'earth',
    level: 3, atk: 800, def: 1000,
  },
  {
    id: 'e007', name: 'ヨルズ', kind: 'monster',
    flavor: '雷神の母である大地の女神。荒々しい力の源はここにある。',
    origin: 'norse', rarity: 'common', attribute: 'earth',
    level: 3, atk: 1000, def: 1100,
  },
  {
    id: 'e008', name: 'ツァトゥグアEX', kind: 'monster',
    flavor: '地底の洞窟に眠る蟇蛙めいた神。眠りを妨げた者は闇に呑まれる。',
    origin: 'cthulhu', rarity: 'ultra', attribute: 'earth',
    level: 8, atk: 2100, def: 1700,
  },
  {
    id: 'e009', name: '女媧', ruby: 'じょか', kind: 'monster',
    flavor: '人を土からこね上げた創造の女神。崩れた天の柱を、五色の石で繕った。',
    origin: 'china', rarity: 'rare', attribute: 'earth',
    level: 4, atk: 1640, def: 1200,
  },
  {
    id: 'e010', name: '埴安姫', ruby: 'はにやすひめ', kind: 'monster',
    flavor: '伊邪那美が病の床で生した土の女神。器も竈も、その埴から形を得た。',
    origin: 'japan', rarity: 'superRare', attribute: 'earth',
    level: 6, atk: 1360, def: 1300,
  },
  {
    id: 'e011', name: '黄帝EX', ruby: 'こうていEX', kind: 'monster',
    flavor: '中華の始祖とされる帝。涿鹿の野で蚩尤の軍と戦い、霧を破って天下を定めた。',
    origin: 'china', rarity: 'ultra', attribute: 'earth',
    level: 7, atk: 2000, def: 1700,
  },
  {
    id: 't001', name: 'スサノオ', kind: 'monster',
    flavor: '海原を追われた嵐の神。八岐大蛇を退治し、その尾から剣を得た。',
    origin: 'japan', rarity: 'superRare', attribute: 'thunder',
    level: 6, atk: 1400, def: 1200,
  },
  {
    id: 't002', name: 'インドラ', kind: 'monster',
    flavor: '金剛杵を振るう雷神。旱魃の蛇を討ち、堰き止められた水を解き放った。',
    origin: 'india', rarity: 'superRare', attribute: 'thunder',
    level: 5, atk: 1300, def: 1200,
  },
  {
    id: 't003', name: 'ゼウスEX', kind: 'monster',
    flavor: '神々の王。振り下ろす雷霆に逆らえる者は、天にも地にもいない。',
    origin: 'greece', rarity: 'ultra', attribute: 'thunder',
    level: 7, atk: 1600, def: 1800,
  },
  {
    id: 't004', name: 'トール', kind: 'monster',
    flavor: '赤髭の雷神。投げた槌は必ず手元に戻り、巨人の頭を砕き続ける。',
    origin: 'norse', rarity: 'rare', attribute: 'thunder',
    level: 4, atk: 1400, def: 1300,
  },
  {
    id: 't005', name: 'アダド', kind: 'monster',
    flavor: '嵐と雨をもたらす神。恵みの雨も、都を沈める洪水も同じ手による。',
    origin: 'mesopotamia', rarity: 'common', attribute: 'thunder',
    level: 3, atk: 800, def: 1000,
  },
  {
    id: 't006', name: 'レイコウ', kind: 'monster',
    flavor: '連太鼓を背負う雷公。罰を受けるべき者を選んで雷を落とす。',
    origin: 'china', rarity: 'common', attribute: 'thunder',
    level: 3, atk: 800, def: 900,
  },
  {
    id: 't007', name: 'セト', kind: 'monster',
    flavor: '砂漠と嵐を統べる神。兄を殺した簒奪者でありながら、太陽の船も守る。',
    origin: 'egypt', rarity: 'rare', attribute: 'thunder',
    level: 4, atk: 1100, def: 1100,
  },
  {
    id: 't008', name: 'イタクァ', kind: 'monster',
    flavor: '極北の空を渡る巨人。連れ去られた者は、遠い空から凍って落ちてくる。',
    origin: 'cthulhu', rarity: 'rare', attribute: 'thunder',
    level: 4, atk: 1300, def: 1100,
  },
  {
    id: 't009', name: 'マルドゥク', kind: 'monster',
    flavor: '五十の名を持つ都市の主神。原初の海の竜を網に捕らえ、雷で討ち果たした。',
    origin: 'mesopotamia', rarity: 'superRare', attribute: 'thunder',
    level: 5, atk: 1600, def: 1300,
  },
  {
    id: 'w001', name: 'ポセイドン', kind: 'monster',
    flavor: '海と地震をつかさどる神。矛で海底を突けば、大陸すら揺れる。',
    origin: 'greece', rarity: 'superRare', attribute: 'water',
    level: 5, atk: 1600, def: 1300,
  },
  {
    id: 'w002', name: 'クトゥルフEX', kind: 'monster',
    flavor: '海底の都に眠る巨大な存在。星の位置が正しくなるとき、再び目覚める。',
    origin: 'cthulhu', rarity: 'ultra', attribute: 'water',
    level: 7, atk: 1800, def: 1800,
  },
  {
    id: 'w003', name: 'ヨルムンガンド', kind: 'monster',
    flavor: '世界を取り巻くほど巨大な蛇。自らの尾を咥えて海に沈んでいる。',
    origin: 'norse', rarity: 'superRare', attribute: 'water',
    level: 5, atk: 1200, def: 1200,
  },
  {
    id: 'w004', name: 'ワタツミ', kind: 'monster',
    flavor: '海を治める龍神。潮の満ち引きを操る二つの珠を持つ。',
    origin: 'japan', rarity: 'rare', attribute: 'water',
    level: 4, atk: 1100, def: 1100,
  },
  {
    id: 'w005', name: 'ソベク', kind: 'monster',
    flavor: '鰐の頭を持つ河の神。恐れられると同時に、豊穣の象徴でもあった。',
    origin: 'egypt', rarity: 'common', attribute: 'water',
    level: 3, atk: 800, def: 900,
  },
  {
    id: 'w006', name: 'アプスー', kind: 'monster',
    flavor: 'すべての水の源である原初の淡水。ここから神々が生まれた。',
    origin: 'mesopotamia', rarity: 'common', attribute: 'water',
    level: 3, atk: 720, def: 1000,
  },
  {
    id: 'w007', name: 'ヴァルナ', kind: 'monster',
    flavor: '水と法をつかさどる神。縄を手に、誓いを破った者を捕らえる。',
    origin: 'india', rarity: 'rare', attribute: 'water',
    level: 4, atk: 1000, def: 1000,
  },
  {
    id: 'w008', name: 'ゴンゴン', kind: 'monster',
    flavor: '共工。争いに敗れて天を支える柱に頭をぶつけ、大洪水を起こした。',
    origin: 'china', rarity: 'rare', attribute: 'water',
    level: 4, atk: 1300, def: 1100,
  },
  {
    id: 'w009', name: 'ダゴン', kind: 'monster',
    flavor: '深きものたちの父。海に沈んだ都から浮かび上がり、岸の民を水底へ迎え入れる。',
    origin: 'cthulhu', rarity: 'superRare', attribute: 'water',
    level: 6, atk: 1400, def: 1300,
  },
  {
    id: 'w010', name: 'ヴィシュヌ', kind: 'monster',
    flavor: '大蛇の上で眠りながら世界を保つ神。目覚めるたび姿を変えて地上に降り、崩れかけた秩序を戻す。',
    origin: 'india', rarity: 'superRare', attribute: 'water',
    level: 6, atk: 1800, def: 1300,
  },
  {
    id: 'w011', name: 'ティアマトEX', kind: 'monster',
    flavor: '原初の塩の海そのものである竜。神々の母でありながら、十一の魔獣を生んで神々に牙を剥いた。',
    origin: 'mesopotamia', rarity: 'ultra', attribute: 'water',
    level: 8, atk: 1900, def: 1800,
  },
  {
    id: 'l001', name: 'アマテラスEX', kind: 'monster',
    flavor: '高天原を統べる太陽の女神。岩戸に隠れると、世界から光が消えた。',
    origin: 'japan', rarity: 'ultra', attribute: 'light',
    level: 7, atk: 1900, def: 1700,
  },
  {
    id: 'l002', name: 'ラー', kind: 'monster',
    flavor: '昼は天空を舟で渡り、夜は冥界を巡る太陽そのもの。隼の頭を持つ。',
    origin: 'egypt', rarity: 'superRare', attribute: 'light',
    level: 6, atk: 1500, def: 1200,
  },
  {
    id: 'l003', name: 'アポロン', kind: 'monster',
    flavor: '光と予言と医術の神。放つ矢は病をもたらし、また病を癒す。',
    origin: 'greece', rarity: 'superRare', attribute: 'light',
    level: 6, atk: 1400, def: 1200,
  },
  {
    id: 'l004', name: 'バルドル', kind: 'monster',
    flavor: '万物に愛された光の神。ただ一つ誓いを立てなかった宿り木に倒れた。',
    origin: 'norse', rarity: 'common', attribute: 'light',
    level: 3, atk: 1000, def: 1100,
  },
  {
    id: 'l005', name: 'スーリヤ', kind: 'monster',
    flavor: '七頭の馬に車を引かせて天を巡る太陽神。その輝きは削られてなお強い。',
    origin: 'india', rarity: 'rare', attribute: 'light',
    level: 4, atk: 1100, def: 1100,
  },
  {
    id: 'l006', name: 'シャマシュ', kind: 'monster',
    flavor: '太陽と正義の神。すべてを照らし、隠された罪を残らず暴く。',
    origin: 'mesopotamia', rarity: 'rare', attribute: 'light',
    level: 4, atk: 1000, def: 1000,
  },
  {
    id: 'l007', name: 'シーホー', kind: 'monster',
    flavor: '羲和。十個の太陽を産み、毎朝ひとつずつ湯谷から送り出した母神。',
    origin: 'china', rarity: 'common', attribute: 'light',
    level: 3, atk: 800, def: 1000,
  },
  {
    id: 'l008', name: 'ノーデンス', kind: 'monster',
    flavor: '深淵の大神。混沌に与せず、時に人の側へわずかな加護を寄こす。',
    origin: 'cthulhu', rarity: 'common', attribute: 'light',
    level: 3, atk: 920, def: 1000,
  },
  {
    id: 'l009', name: 'ダイワスカーレット', kind: 'monster',
    flavor: '誰より速く駆けることだけを目指す光の化身。夏をプールで満喫中。',
    origin: 'original', rarity: 'ultra', attribute: 'light',
    level: 8, atk: 2400, def: 1800,
  },
  {
    id: 'd001', name: 'ニャルラトホテプEX', kind: 'monster',
    flavor: '千の貌を持つ這い寄る混沌。神々の使者であり、人の理性を弄ぶ者。',
    origin: 'cthulhu', rarity: 'ultra', attribute: 'dark',
    level: 8, atk: 1900, def: 1800,
  },
  {
    id: 'd002', name: 'ヘル', kind: 'monster',
    flavor: '半身が死者の姿をした冥界の女王。病や老いで死んだ者を迎え入れる。',
    origin: 'norse', rarity: 'superRare', attribute: 'dark',
    level: 5, atk: 1300, def: 1200,
  },
  {
    id: 'd003', name: 'イザナミ', kind: 'monster',
    flavor: '国を生んだのち黄泉に堕ちた女神。日に千人を奪うと夫に告げた。',
    origin: 'japan', rarity: 'rare', attribute: 'dark',
    level: 4, atk: 1200, def: 1200,
  },
  {
    id: 'd004', name: 'ハデス', kind: 'monster',
    flavor: '冥界を統べる王。姿を消す兜をかぶり、死者と地下の富を管理する。',
    origin: 'greece', rarity: 'rare', attribute: 'dark',
    level: 4, atk: 1120, def: 1200,
  },
  {
    id: 'd005', name: 'ネルガル', kind: 'monster',
    flavor: '疫病と戦をもたらす神。冥界を妃エレシュキガルとともに治める。',
    origin: 'mesopotamia', rarity: 'rare', attribute: 'dark',
    level: 4, atk: 800, def: 1100,
  },
  {
    id: 'd006', name: 'カーリー', kind: 'monster',
    flavor: '黒き時を意味する殺戮の女神。舞い始めれば世界すら踏み砕く。',
    origin: 'india', rarity: 'rare', attribute: 'dark',
    level: 4, atk: 1000, def: 1100,
  },
  {
    id: 'd007', name: 'アヌビス', kind: 'monster',
    flavor: '山犬の頭を持つ冥界の案内人。死者の心臓を羽根と天秤にかける。',
    origin: 'egypt', rarity: 'common', attribute: 'dark',
    level: 3, atk: 1100, def: 1000,
  },
  {
    id: 'd008', name: 'チーヨウ', kind: 'monster',
    flavor: '蚩尤。銅の頭に鉄の額を持つ戦の神。濃霧を起こして黄帝を惑わせた。',
    origin: 'china', rarity: 'common', attribute: 'dark',
    level: 3, atk: 1000, def: 1100,
  },
  {
    id: 'd009', name: 'ラーフ', kind: 'monster',
    flavor: '不死の甘露を盗み、首だけになった魔神。日と月を呑み込んでは、切り口から逃がす。',
    origin: 'india', rarity: 'common', attribute: 'dark',
    level: 3, atk: 1100, def: 1000,
  },
  {
    id: 'd010', name: 'アペプ', kind: 'monster',
    flavor: '日輪を呑もうと毎夜あらわれる混沌の大蛇。斬られても翌日にはまた地平に戻ってくる。',
    origin: 'egypt', rarity: 'superRare', attribute: 'dark',
    level: 6, atk: 1900, def: 1200,
  },
  {
    id: 'n001', name: 'ガルダ', kind: 'monster',
    flavor: 'インドの霊鳥。蛇族ナーガを喰らう天の乗り物で、その翼は太陽を覆うという。',
    origin: 'india', rarity: 'common', attribute: 'colorless',
    level: 3, atk: 400, def: 800,
  },
  {
    id: 'n002', name: 'ペガソス', kind: 'monster',
    flavor: 'メドゥーサの血から生まれた翼馬。蹄で大地を打つと泉が湧いたと伝わる。',
    origin: 'greece', rarity: 'common', attribute: 'colorless',
    level: 3, atk: 600, def: 600,
  },
  {
    id: 'n003', name: 'タオテツ', kind: 'monster',
    flavor: '何でも食らう伝説の悪獣。青銅器に刻まれ、貪欲そのものを表す。',
    origin: 'china', rarity: 'common', attribute: 'colorless',
    level: 3, atk: 1400, def: 1200,
  },
  {
    id: 'n004', name: 'フェンリル', kind: 'monster',
    flavor: '神々に鎖で縛られた巨狼。終末の日に縛めを解き、天の光を呑む。',
    origin: 'norse', rarity: 'common', attribute: 'colorless',
    level: 3, atk: 1000, def: 1100,
  },
  {
    id: 'n005', name: 'スフィンクス', kind: 'monster',
    flavor: '獅子の体に人の顔を持つ守護獣。問いに答えられぬ者を通さない。',
    origin: 'egypt', rarity: 'common', attribute: 'colorless',
    level: 3, atk: 800, def: 900,
  },
  {
    id: 'n006', name: 'ヤタガラス', kind: 'monster',
    flavor: '三本足の大烏。道を見失った者の前に現れ、進むべき方角を示す。',
    origin: 'japan', rarity: 'common', attribute: 'colorless',
    level: 3, atk: 800, def: 800,
  },
  {
    id: 'n007', name: 'ラマッス', kind: 'monster',
    flavor: '人面有翼の牡牛。宮殿の門に据えられ、邪なものの侵入を拒む。',
    origin: 'mesopotamia', rarity: 'common', attribute: 'colorless',
    level: 3, atk: 920, def: 1000,
  },
  {
    id: 'n008', name: 'ショゴス', kind: 'monster',
    flavor: '無定形の原形質。創造主に反旗を翻し、いまも真似た声で鳴き続ける。',
    origin: 'cthulhu', rarity: 'common', attribute: 'colorless',
    level: 3, atk: 800, def: 1100,
  },
  {
    id: 'n009', name: 'スレイプニル', kind: 'monster',
    flavor: '八本の足で九つの世界を駆ける馬。地も空も海も、等しく地面として踏む。',
    origin: 'norse', rarity: 'common', attribute: 'colorless',
    level: 3, atk: 1000, def: 1000,
  },
]

