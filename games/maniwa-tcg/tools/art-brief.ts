/**
 * イラスト生成AIに渡す入力データを書き出す CLI。
 *
 * 渡すのは「カードID・カード名・系統・レアリティ・解説」の5項目だけにする。
 * タイプやHPやワザは絵に影響させたくないので含めない（含めると、炎タイプだから
 * 燃やす、といった具合に絵が数値に引きずられる）。
 *
 * 使い方:
 *   node games/maniwa-tcg/tools/art-brief.ts          全40種をテキストで出す
 *   node games/maniwa-tcg/tools/art-brief.ts --json   JSON で出す
 *   node games/maniwa-tcg/tools/art-brief.ts f002 g006  IDを指定して抜き出す
 *
 * 出力はカードデータから毎回組み立てるので、カードを足しても手で直す必要はない。
 */
import { CARDS } from '../src/data/cards.ts'
import type { CardDef, Origin, Rarity } from '../src/core/types.ts'

const ORIGIN_LABEL: Readonly<Record<Origin, string>> = {
  japan: '日本神話',
  egypt: 'エジプト神話',
  norse: '北欧神話',
  india: 'インド神話',
  mesopotamia: '中東神話',
  cthulhu: 'クトゥルフ神話',
  greece: 'ギリシア神話',
  china: '中国神話',
  original: 'オリジン',
}

const RARITY_LABEL: Readonly<Record<Rarity, string>> = {
  common: 'C（コモン）',
  rare: 'R（レア）',
  superRare: 'SR（スーパーレア）',
  ultra: 'UR（ウルトラレア）',
}

interface Brief {
  readonly id: string
  readonly name: string
  readonly origin: string
  readonly rarity: string
  readonly flavor: string
}

function toBrief(card: CardDef): Brief {
  return {
    id: card.id,
    name: card.name,
    origin: ORIGIN_LABEL[card.origin],
    rarity: RARITY_LABEL[card.rarity],
    flavor: card.flavor,
  }
}

function format(brief: Brief): string {
  return [
    `【${brief.id}】`,
    `カード名: ${brief.name}`,
    `系統: ${brief.origin}`,
    `レアリティ: ${brief.rarity}`,
    `解説: ${brief.flavor}`,
  ].join('\n')
}

/**
 * 衣装の条件（2026-09-01 更新・src/data/art/README.md）。
 *
 * もとは「カップ＋肩紐＋アンダーバンドが繋がった三角ビキニ」という**形**を指定していたが、
 * 覆えているのに形が違うだけの絵まで弾いてしまうため、形の指定を外した。
 * 判定は「胸が不透明に隠れているか」の1点だけで行う。
 *
 * 生成のたびに手で書き添えていた条件を、ここに移して出力に必ず載るようにする。
 */
const COSTUME_NOTE: readonly string[] = [
  '**胸の頂点が描かれていないこと。** 取り込めるかどうかはこの1点で決まる',
  '手段は問わない。布・革・金属・鎧のほか、髪・腕・抱えた道具・水面・湯気・影でもよい',
  '形も問わない。ビキニ型・一枚布のドレープ・片肩・コルセット・胸当て、どれでもよい',
  '薄手・半透明の布も通る。透けていること自体は問題にしない',
  '通らないのは次の3つ。いずれも実際に見送った例がある',
  '  貼り付け型で頂点だけを覆う（ニップレス類） / 鎖・紐だけが掛かっている',
  '  布はあるが縁にずれて頂点が出ている',
]

/** 種別ごとの描き方。カードに渡す5項目は変えず、指示だけを分ける */
const KIND_BRIEF: readonly {
  readonly kind: CardDef['kind']
  readonly title: string
  readonly note: readonly string[]
}[] = [
  {
    kind: 'creature',
    title: '姫神',
    note: [
      '神格はすべて美少女として擬人化して描く（男神・獣・怪物も同様）',
      '1キャラにつき3枚。無傷 / 傷ついた姿 / 追い詰められた姿',
      '  ファイル名は <カードID>.webp / <カードID>-d1.webp / <カードID>-d2.webp',
      '3枚とも同一人物・同一衣装・同一画風で揃える',
    ],
  },
  /*
   * 支援カードも人物を主役にする（2026-08-27 決定・src/data/art/README.md）。
   * 物体だけを描く案もあったが、プール全体で画風をそろえるほうを選んだ。
   * i001〜i007 はこの方針で作ってある
   */
  {
    kind: 'item',
    title: '神具',
    note: [
      '姫神と同じく**人物を主役**に描き、その道具を持たせる（物体だけの絵にしない）',
      '1枚のみ。ダメージ違いは作らない',
    ],
  },
  {
    kind: 'action',
    title: '道標',
    note: [
      '姫神と同じく**人物を主役**に描き、その儀式や現象を起こしている姿にする',
      '1枚のみ。ダメージ違いは作らない',
    ],
  },
  {
    kind: 'ultimate',
    title: '絶技',
    note: [
      '対応する姫神が技を放つ瞬間を描く。姿は元のカードと揃える',
      '1枚のみ。構図はカードの中でもっとも派手にする',
    ],
  },
]

function main(argv: readonly string[]): number {
  const json = argv.includes('--json')
  const ids = argv.filter((a) => !a.startsWith('--'))

  const cards = ids.length === 0
    ? CARDS
    : ids.map((id) => {
        const found = CARDS.find((c) => c.id === id)
        if (found === undefined) throw new Error(`カードが見つからない: ${id}`)
        return found
      })

  if (json) {
    console.log(JSON.stringify(cards.map(toBrief), null, 2))
    return 0
  }

  console.log(`姫神演義 カードイラスト入力データ（${cards.length}種）`)
  console.log('1024×1024 の正方形。渡すデータは5項目のみで、ここに無い要素を足さない。')
  console.log('')
  console.log('━━━ 衣装（全種別に共通・取り込みの可否を決める）')
  for (const line of COSTUME_NOTE) console.log(`・${line}`)

  for (const section of KIND_BRIEF) {
    const group = cards.filter((c) => c.kind === section.kind)
    if (group.length === 0) continue
    console.log('')
    console.log(`━━━ ${section.title}（${group.length}種）`)
    for (const line of section.note) console.log(`・${line}`)
    console.log('')
    for (const card of group) {
      console.log(format(toBrief(card)))
      console.log('')
    }
  }
  return 0
}

process.exitCode = main(process.argv.slice(2))
