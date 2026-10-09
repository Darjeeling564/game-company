/**
 * カードの配色表。描画専用のデータで、ルールには一切関与しない。
 *
 * 見た目の役割分担（SPEC 12章）:
 *   背景 = 系統 / 枠 = レアリティ / 属性 = 色丸に白文字 / 文字色 = レアリティ
 *
 * 色は CSS 変数として DOM に渡し、style.css 側で使う。ここに集約しておけば、
 * 系統やレアリティが増えてもテンプレート側を触らずに済む。
 */
import type { EnergyType, Origin, Rarity } from '../core/types.ts'

/** UR の虹。枠にも文字にも同じ定義を使う */
const RAINBOW =
  'linear-gradient(100deg, #ff6b6b, #ffd166, #8ce99a, #74c0fc, #b197fc, #ff8fd0)'

export interface OriginStyle {
  /** カード地の色 */
  readonly bg: string
  /** 文字を載せる下部の色。地より暗くして可読性を確保する */
  readonly deep: string
}

/** 系統ごとのカード背景。神話の印象に寄せつつ、隣り合っても混ざらない明度差をつける */
export const ORIGIN_STYLE: Readonly<Record<Origin, OriginStyle>> = {
  japan: { bg: '#9c4750', deep: '#6d2f36' },
  china: { bg: '#b0762f', deep: '#7c5120' },
  egypt: { bg: '#a08d2c', deep: '#6f6119' },
  greece: { bg: '#3d857c', deep: '#275b55' },
  norse: { bg: '#48709c', deep: '#2f4d6e' },
  india: { bg: '#78589f', deep: '#523a70' },
  mesopotamia: { bg: '#8a6243', deep: '#5f412c' },
  cthulhu: { bg: '#5f7356', deep: '#3f4e39' },
  // オリジンは神話の外側なので、どの系統色とも重ならない黒に置く
  original: { bg: '#161616', deep: '#050505' },
}

export interface RarityStyle {
  /** 記号ではなくアルファベットで表す */
  readonly code: string
  readonly label: string
  /** 装飾枠の色 */
  readonly frame: string
  /** カード名・ワザ名の色 */
  readonly text: string
  /**
   * 文字の縁取り色。文字色と明度を逆にしないと、背景と同化したときに潰れる。
   * C は黒文字なので明るい縁、それ以外は暗い縁になる。
   */
  readonly edge: string
  /** 文字色がグラデーションで、background-clip が必要かどうか */
  readonly gradientText: boolean
}

export const RARITY_STYLE: Readonly<Record<Rarity, RarityStyle>> = {
  common: {
    code: 'C', label: 'コモン',
    frame: '#7e7e7e', text: '#14100c', edge: '#f2ece0', gradientText: false,
  },
  rare: {
    code: 'R', label: 'レア',
    frame: '#c8d2d8', text: '#ffffff', edge: '#1a1410', gradientText: false,
  },
  superRare: {
    code: 'SR', label: 'スーパーレア',
    frame: '#e0bf5c', text: '#f5d98a', edge: '#1a1410', gradientText: false,
  },
  ultra: {
    code: 'UR', label: 'ウルトラレア',
    frame: RAINBOW, text: RAINBOW, edge: '#1a1410', gradientText: true,
  },
}

/**
 * 属性の丸の色。**中の文字色は白と墨から、丸の明るさで選ぶ**（SPEC 9.11）。
 *
 * 以前は常に白にしていたが、2026-10-08 の実測で**9色のうち4色が
 * 白文字とのコントラスト 4.5:1 を満たしていなかった**
 * （光 2.42 / 雷 2.95 / 風 3.05 / 無 3.68）。
 * 色を暗くして白を通すと、光（金）と雷（黄）が茶色になって属性が見分けられなくなる。
 * **9属性は色で見分けるものなので、色ではなく文字のほうを変える。**
 */
export const TYPE_COLOR: Readonly<Record<EnergyType, string>> = {
  fire: '#c0392b',
  forest: '#3f7452',
  wind: '#5f9ea0',
  earth: '#8a6a3a',
  thunder: '#b8912a',
  water: '#2f6f96',
  light: '#c9a227',
  dark: '#4a3a5c',
  colorless: '#8a8578',
}

/** #rrggbb の相対輝度（WCAG）。丸の文字色を決めるためだけに使う */
function luminance(hex: string): number {
  const ch = (i: number): number => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * ch(1) + 0.7152 * ch(3) + 0.0722 * ch(5)
}

/**
 * 丸の中の文字色（SPEC 9.11）。**白で 4.5:1 を満たすときだけ白にする。**
 *
 * 判定を色の表と同じ場所に置いてあるのは、色を足したり変えたりしたときに
 * 文字色だけ古いまま残らないようにするためである（9.4.18 と同じ考え方）。
 */
export function badgeInk(color: string): string {
  const ratio = 1.05 / (luminance(color) + 0.05)
  return ratio >= 4.5 ? '#ffffff' : '#141410'
}

/**
 * カード1枚ぶんの CSS 変数をまとめて要素に載せる。
 * 文字色がグラデーションのときだけクラスを足し、style.css で background-clip する。
 */
export function applyCardTheme(
  node: HTMLElement,
  origin: Origin,
  rarity: Rarity,
  type: EnergyType,
): void {
  const o = ORIGIN_STYLE[origin]
  const r = RARITY_STYLE[rarity]
  node.style.setProperty('--card-bg', o.bg)
  node.style.setProperty('--card-deep', o.deep)
  node.style.setProperty('--card-frame', r.frame)
  node.style.setProperty('--card-text', r.text)
  node.style.setProperty('--card-edge', r.edge)
  node.style.setProperty('--card-type', TYPE_COLOR[type])
  node.style.setProperty('--badge-ink', badgeInk(TYPE_COLOR[type]))
  if (r.gradientText) node.classList.add('is-gradient-text')
  // 3D 表示の光沢を上位レアだけに載せるための目印（SPEC 9.7）
  if (rarity === 'superRare' || rarity === 'ultra') node.classList.add(`card--${r.code.toLowerCase()}`)
}
