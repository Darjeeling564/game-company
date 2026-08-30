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

/** 属性の丸の色。中の文字は常に白にする */
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
  if (r.gradientText) node.classList.add('is-gradient-text')
  // 3D 表示の光沢を上位レアだけに載せるための目印（SPEC 9.7）
  if (rarity === 'superRare' || rarity === 'ultra') node.classList.add(`card--${r.code.toLowerCase()}`)
}
