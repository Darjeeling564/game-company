/**
 * 効果音（SPEC 9.6）。
 *
 * **音声ファイルは持たず、Web Audio API で毎回合成する。**
 * - 外部ライブラリを足さない（CLAUDE.md 1章）
 * - Artifact の CSP は外部の音声を読み込めず、埋め込むと16MB制限にも当たる
 * - DotGothic16 の見た目に合うのは矩形波寄りの音で、合成のほうが狙いに近い
 *
 * 音そのものは**データで表現**し、鳴らし方の解釈は playVoice に一元化する。
 * 音を足すときに再生ロジックを触らなくてよい状態を保つ（4章と同じ考え）。
 *
 * ここはブラウザAPIを直接触るので `src/game/` に置く。core からは参照しない（3章）。
 */

/** 1つの音。これを重ねて1つの効果音にする */
interface Voice {
  /** 波形。noise を立てたときは無視される */
  readonly wave?: OscillatorType
  /** 開始周波数(Hz) */
  readonly from: number
  /** 終了周波数(Hz)。省略すると from のまま伸ばす */
  readonly to?: number
  /** 長さ(秒) */
  readonly time: number
  /** 音量(0〜1)。既定 0.18 */
  readonly gain?: number
  /** 鳴らし始めるまでの秒数。和音やアルペジオはこれでずらす */
  readonly delay?: number
  /** 音源をノイズに差し替える。打撃・爆ぜる音に使う */
  readonly noise?: boolean
  /** バンドパスの中心周波数。ノイズの色を決める */
  readonly band?: number
}

type Sfx = readonly Voice[]

/**
 * 効果音の定義。キーは core のログ種別（`LogEntry.kind`）と、UI 固有の名前。
 * ログ種別に対応があれば、対戦中の出来事は勝手に鳴る。
 */
const SFX: Readonly<Record<string, Sfx>> = {
  // --- UI ---
  tap: [{ wave: 'square', from: 660, to: 880, time: 0.045, gain: 0.10 }],
  back: [{ wave: 'square', from: 520, to: 330, time: 0.07, gain: 0.10 }],
  draw: [{ wave: 'triangle', from: 420, to: 940, time: 0.09, gain: 0.13 }],

  // --- 盤面 ---
  setupPlace: [
    { wave: 'square', from: 300, to: 520, time: 0.09, gain: 0.14 },
    { noise: true, band: 900, from: 0, time: 0.05, gain: 0.06 },
  ],
  playCreature: [
    { wave: 'square', from: 330, to: 560, time: 0.10, gain: 0.15 },
    { noise: true, band: 1100, from: 0, time: 0.06, gain: 0.07 },
  ],
  /** リリースして上位を出した。降りてから昇る2段にして、入れ替えを音で示す */
  release: [
    { wave: 'sawtooth', from: 520, to: 170, time: 0.14, gain: 0.13 },
    { wave: 'square', from: 300, to: 720, time: 0.16, gain: 0.15, delay: 0.13 },
  ],
  promote: [{ wave: 'square', from: 350, to: 700, time: 0.13, gain: 0.14 }],
  retreat: [{ wave: 'square', from: 520, to: 300, time: 0.11, gain: 0.12 }],

  // --- エネルギー ---
  attachEnergy: [
    { wave: 'sine', from: 780, to: 1240, time: 0.13, gain: 0.16 },
    { wave: 'sine', from: 1170, to: 1860, time: 0.10, gain: 0.06, delay: 0.02 },
  ],
  gainEnergy: [{ wave: 'sine', from: 900, to: 1200, time: 0.08, gain: 0.11 }],

  // --- 支援カード ---
  item: [{ wave: 'triangle', from: 540, to: 810, time: 0.11, gain: 0.13 }],
  action: [
    { wave: 'triangle', from: 620, to: 930, time: 0.12, gain: 0.13 },
    { wave: 'triangle', from: 930, to: 1240, time: 0.10, gain: 0.07, delay: 0.06 },
  ],

  // --- 戦闘 ---
  attack: [
    { noise: true, band: 1600, from: 0, time: 0.10, gain: 0.16 },
    { wave: 'sawtooth', from: 240, to: 90, time: 0.16, gain: 0.14 },
  ],
  damage: [{ noise: true, band: 700, from: 0, time: 0.09, gain: 0.12 }],
  selfDamage: [{ wave: 'square', from: 200, to: 140, time: 0.12, gain: 0.10 }],
  poison: [
    { wave: 'sine', from: 320, to: 250, time: 0.16, gain: 0.10 },
    { wave: 'sine', from: 250, to: 320, time: 0.14, gain: 0.08, delay: 0.13 },
  ],
  coin: [
    { wave: 'square', from: 1320, time: 0.04, gain: 0.10 },
    { wave: 'square', from: 1760, time: 0.05, gain: 0.10, delay: 0.07 },
  ],
  /** 絶技。和音を重ねて、通常の攻撃と明確に段を変える */
  ultimate: [
    { noise: true, band: 2400, from: 0, time: 0.22, gain: 0.10 },
    { wave: 'square', from: 523, to: 1046, time: 0.42, gain: 0.13 },
    { wave: 'square', from: 659, to: 1318, time: 0.40, gain: 0.10, delay: 0.05 },
    { wave: 'square', from: 784, to: 1568, time: 0.38, gain: 0.09, delay: 0.10 },
    { wave: 'sawtooth', from: 160, to: 60, time: 0.44, gain: 0.12 },
  ],
  ko: [
    { noise: true, band: 500, from: 0, time: 0.20, gain: 0.14 },
    { wave: 'sawtooth', from: 420, to: 55, time: 0.42, gain: 0.15 },
  ],
  /** ポイント獲得。上がる2音で「取った」と分かるようにする */
  point: [
    { wave: 'sine', from: 880, time: 0.10, gain: 0.15 },
    { wave: 'sine', from: 1320, time: 0.20, gain: 0.14, delay: 0.09 },
  ],
  beginTurn: [{ wave: 'sine', from: 440, to: 660, time: 0.11, gain: 0.09 }],

  // --- 決着 ---
  win: [
    { wave: 'square', from: 523, time: 0.13, gain: 0.14 },
    { wave: 'square', from: 659, time: 0.13, gain: 0.14, delay: 0.12 },
    { wave: 'square', from: 784, time: 0.13, gain: 0.14, delay: 0.24 },
    { wave: 'square', from: 1046, time: 0.42, gain: 0.16, delay: 0.36 },
    { wave: 'triangle', from: 1568, time: 0.40, gain: 0.08, delay: 0.36 },
  ],
  lose: [
    { wave: 'triangle', from: 440, time: 0.16, gain: 0.13 },
    { wave: 'triangle', from: 392, time: 0.16, gain: 0.13, delay: 0.15 },
    { wave: 'triangle', from: 330, time: 0.16, gain: 0.13, delay: 0.30 },
    { wave: 'sawtooth', from: 262, to: 180, time: 0.55, gain: 0.13, delay: 0.45 },
  ],
  draw_game: [
    { wave: 'triangle', from: 523, time: 0.18, gain: 0.12 },
    { wave: 'triangle', from: 523, time: 0.34, gain: 0.11, delay: 0.20 },
  ],
}

export type SfxName = keyof typeof SFX

let ctx: AudioContext | null = null
let muted = false
let noise: AudioBuffer | null = null

/** 同じ描画で大量に鳴らさないための上限。ログが一度に伸びると耳が痛い */
const MAX_PER_BURST = 3
let burst = 0
let burstAt = 0

export function setMuted(value: boolean): void {
  muted = value
}

export function isMuted(): boolean {
  return muted
}

/**
 * AudioContext を作る。**最初のタップより前には作らない。**
 * ブラウザは操作前の再生を止めるので、作っても suspended のまま無音になる。
 */
function context(): AudioContext | null {
  if (muted) return null
  if (ctx === null) {
    const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (Ctor === undefined) return null
    try {
      ctx = new Ctor()
    } catch {
      return null // 音が出せなくても対戦は続けられる
    }
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/** 打撃音のもと。1度だけ作って使い回す */
function noiseBuffer(audio: AudioContext): AudioBuffer {
  if (noise !== null) return noise
  const length = Math.floor(audio.sampleRate * 0.5)
  const buffer = audio.createBuffer(1, length, audio.sampleRate)
  const data = buffer.getChannelData(0)
  // 乱数は見た目に影響しない演出用。core の決定論とは無関係（3章の制約は core のみ）
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1
  noise = buffer
  return buffer
}

function playVoice(audio: AudioContext, voice: Voice, at: number): void {
  const start = at + (voice.delay ?? 0)
  const end = start + voice.time
  const peak = voice.gain ?? 0.18

  const amp = audio.createGain()
  amp.gain.setValueAtTime(0.0001, start)
  amp.gain.exponentialRampToValueAtTime(peak, start + 0.006)
  amp.gain.exponentialRampToValueAtTime(0.0001, end)
  amp.connect(audio.destination)

  if (voice.noise === true) {
    const src = audio.createBufferSource()
    src.buffer = noiseBuffer(audio)
    const band = audio.createBiquadFilter()
    band.type = 'bandpass'
    band.frequency.setValueAtTime(voice.band ?? 1000, start)
    band.Q.setValueAtTime(1.2, start)
    src.connect(band)
    band.connect(amp)
    src.start(start)
    src.stop(end + 0.02)
    return
  }

  const osc = audio.createOscillator()
  osc.type = voice.wave ?? 'square'
  osc.frequency.setValueAtTime(voice.from, start)
  if (voice.to !== undefined) osc.frequency.exponentialRampToValueAtTime(voice.to, end)
  osc.connect(amp)
  osc.start(start)
  osc.stop(end + 0.02)
}

/** 定義があれば鳴らす。無ければ黙って何もしない（対応表を網羅しなくてよい） */
export function play(name: string): void {
  const sfx = SFX[name]
  if (sfx === undefined) return
  const audio = context()
  if (audio === null) return

  const now = audio.currentTime
  if (now - burstAt > 0.12) {
    burst = 0
    burstAt = now
  }
  burst += 1
  if (burst > MAX_PER_BURST) return

  for (const voice of sfx) playVoice(audio, voice, now)
}

/** 対応する効果音を持つログ種別か */
export function hasSfx(name: string): boolean {
  return SFX[name] !== undefined
}
