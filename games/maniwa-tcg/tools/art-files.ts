/**
 * 必要なイラストのファイル名を一覧にする CLI。
 *
 * 名前でカードと結び付けるので（src/game/art.ts）、この一覧のとおりに置けば
 * データもロジックも触らずに表示される。
 *
 *   node games/maniwa-tcg/tools/art-files.ts          説明つきの一覧
 *   node games/maniwa-tcg/tools/art-files.ts --plain  ファイル名だけ（チェック用）
 */
import { CARDS } from '../src/data/cards.ts'
import type { CardDef } from '../src/core/types.ts'

const KIND_LABEL: Readonly<Record<CardDef['kind'], string>> = {
  creature: '姫神',
  item: '神具',
  action: '道標',
  ultimate: '絶技',
}

/** キャラだけ傷み具合で3枚要る（SPEC 9.3）。それ以外は1枚 */
function filesOf(card: CardDef): readonly { readonly file: string; readonly note: string }[] {
  if (card.kind !== 'creature') return [{ file: `${card.id}.webp`, note: card.name }]
  return [
    { file: `${card.id}.webp`, note: `${card.name}（通常）` },
    { file: `${card.id}-d1.webp`, note: `${card.name}（ダメージ1）` },
    { file: `${card.id}-d2.webp`, note: `${card.name}（ダメージ2・残りHPが半分以下）` },
  ]
}

const plain = process.argv.includes('--plain')
const kinds: readonly CardDef['kind'][] = ['creature', 'item', 'action', 'ultimate']
let total = 0

if (!plain) {
  console.log('# 必要なイラストのファイル名')
  console.log('')
  console.log('games/maniwa-tcg/src/data/art/ に置く。1024×1024 の正方形 WebP。')
}

for (const kind of kinds) {
  const group = CARDS.filter((c) => c.kind === kind)
  const files = group.flatMap(filesOf)
  total += files.length
  if (!plain) console.log(`\n## ${KIND_LABEL[kind]}（${group.length}種 / ${files.length}枚）\n`)
  for (const f of files) console.log(plain ? f.file : `${f.file.padEnd(16)}${f.note}`)
}

if (!plain) console.log(`\n合計 ${total} 枚`)
