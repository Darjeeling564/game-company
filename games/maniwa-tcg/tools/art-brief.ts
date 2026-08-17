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

  const briefs = cards.map(toBrief)
  if (json) {
    console.log(JSON.stringify(briefs, null, 2))
    return 0
  }

  console.log(`maniwa-tcg カードイラスト入力データ（${briefs.length}種）`)
  console.log('1枚ずつ Gem に貼り付ける。渡すのは以下の5項目のみ。')
  console.log('')
  for (const brief of briefs) {
    console.log(format(brief))
    console.log('')
  }
  return 0
}

process.exitCode = main(process.argv.slice(2))
