/**
 * 効果音（SPEC 9.6）。
 *
 * **音声ファイルは持たず、Web Audio API で毎回合成する。**
 * - 外部ライブラリを足さない（CLAUDE.md 1章）
 * - Artifact の CSP は外部の音声を読み込めず、埋め込むと16MB制限にも当たる
 *
 * 音そのものは**データで表現**し、鳴らし方の解釈は playVoice に一元化する。
 * 音を足すときに再生ロジックを触らなくてよい状態を保つ（4章と同じ考え）。
 *
 * ここはブラウザAPIを直接触るので `src/game/` に置く。core からは参照しない（3章）。
 *
 * ## 音づくりの方針（SPEC 9.6.1）
 *
 * 素の矩形波を鳴らすだけだと安っぽくなる。次の5つで質を上げている。
 *
 * 1. **フィルタの動き** — 発振器の直後にローパスを入れ、鳴っている間に
 *    カットオフを動かす。これが一番効く。開くと明るく、閉じると丸くなる
 * 2. **残響** — 生成したインパルス応答で軽く響かせる。乾いた音は玩具に聞こえる
 * 3. **重ね** — 数セント外した2つ目の発振器を足して厚みを出す
 * 4. **定位** — 相手の行動は奥・左寄り、自分の行動は手前・中央に置く
 * 5. **ばらつき** — 同じ音でも毎回わずかに音程と時間をずらす。
 *    まったく同じ波形が続くと機械に聞こえる
 *
 * 出口にはコンプレッサを置く。効果音が重なったときの歪みを抑えるため。
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
  /** 立ち上がりの秒数。既定 0.006。打撃は短く、余韻ものは長く */
  readonly attack?: number
  /** 音源をノイズに差し替える。打撃・爆ぜる音に使う */
  readonly noise?: boolean
  /** ノイズのバンドパス中心(Hz) */
  readonly band?: number
  /** ノイズのバンドパス終端(Hz)。動かすと「掃ける」音になる */
  readonly bandTo?: number
  /** ローパスの開始カットオフ(Hz)。既定は開放（22050） */
  readonly cutoff?: number
  /** ローパスの終端カットオフ(Hz)。from と変えると音色が動く */
  readonly cutoffTo?: number
  /** 何セントずらした2つ目を重ねるか。0 なら重ねない */
  readonly detune?: number
  /** 定位（-1 左 〜 1 右） */
  readonly pan?: number
  /** 残響へ送る量（0〜1）。既定 0.18 */
  readonly space?: number
}

type Sfx = readonly Voice[]

/**
 * 音階は**都節（ヒラヨシ）**から取る。日本神話を軸にした題材なので、
 * 長三和音を積むより馴染む。D を主音にした 1・2・♭3・5・♭6。
 */
const N = {
  d3: 146.83, f3: 174.61, a3: 220.0, bb3: 233.08,
  d4: 293.66, e4: 329.63, f4: 349.23, a4: 440.0, bb4: 466.16,
  d5: 587.33, e5: 659.26, f5: 698.46, a5: 880.0, bb5: 932.33,
  d6: 1174.66, f6: 1396.91, a6: 1760.0,
} as const

/**
 * 効果音の定義。キーは core のログ種別（`LogEntry.kind`）と、UI 固有の名前。
 * ログ種別に対応があれば、対戦中の出来事は勝手に鳴る。
 */
const SFX: Readonly<Record<string, Sfx>> = {
  // --- UI ---
  tap: [
    { wave: 'triangle', from: N.a5, to: N.d6, time: 0.05, gain: 0.10, cutoff: 4200, cutoffTo: 7000, space: 0.1 },
  ],
  back: [
    { wave: 'triangle', from: N.f5, to: N.a4, time: 0.08, gain: 0.10, cutoff: 3400, cutoffTo: 1400, space: 0.1 },
  ],
  draw: [
    // 紙が擦れる音をノイズで、札の実体を三角波で
    { noise: true, from: 0, band: 2600, bandTo: 5200, time: 0.11, gain: 0.07, space: 0.14 },
    { wave: 'triangle', from: N.d5, to: N.a5, time: 0.10, gain: 0.11, cutoff: 2000, cutoffTo: 6500, detune: 7 },
  ],

  // --- 盤面 ---
  setupPlace: [
    { noise: true, from: 0, band: 1200, bandTo: 500, time: 0.09, gain: 0.09 },
    { wave: 'triangle', from: N.d4, to: N.d3, time: 0.13, gain: 0.13, cutoff: 1800, cutoffTo: 500, attack: 0.002 },
  ],
  playCreature: [
    { noise: true, from: 0, band: 1500, bandTo: 600, time: 0.10, gain: 0.10 },
    { wave: 'triangle', from: N.f4, to: N.f3, time: 0.15, gain: 0.14, cutoff: 2200, cutoffTo: 600, attack: 0.002 },
    { wave: 'sine', from: N.f5, time: 0.09, gain: 0.05, delay: 0.02, space: 0.3 },
  ],
  /** リリースして上位を出した。沈んでから昇る2段で、入れ替わったと分かるようにする */
  release: [
    { wave: 'sawtooth', from: N.a4, to: N.d3, time: 0.17, gain: 0.12, cutoff: 2600, cutoffTo: 340 },
    { noise: true, from: 0, band: 900, bandTo: 300, time: 0.14, gain: 0.07 },
    { wave: 'triangle', from: N.d4, to: N.d5, time: 0.2, gain: 0.15, delay: 0.15, cutoff: 700, cutoffTo: 5200, detune: 9, space: 0.34 },
  ],
  promote: [
    { wave: 'triangle', from: N.f4, to: N.d5, time: 0.16, gain: 0.13, cutoff: 1400, cutoffTo: 4800, detune: 6, space: 0.26 },
  ],
  retreat: [
    { noise: true, from: 0, band: 2000, bandTo: 700, time: 0.13, gain: 0.07 },
    { wave: 'triangle', from: N.a4, to: N.f4, time: 0.13, gain: 0.10, cutoff: 2400, cutoffTo: 900 },
  ],

  // --- エネルギー ---
  /** 鈴。倍音を少し外して重ね、余韻を長めに残す */
  attachEnergy: [
    { wave: 'sine', from: N.d6, time: 0.34, gain: 0.11, attack: 0.002, space: 0.5 },
    { wave: 'sine', from: N.a6, time: 0.26, gain: 0.05, attack: 0.002, delay: 0.005, space: 0.5 },
    { wave: 'triangle', from: N.d5, to: N.d6, time: 0.1, gain: 0.08, cutoff: 3000, cutoffTo: 9000, detune: 11 },
  ],
  gainEnergy: [
    { wave: 'sine', from: N.a5, to: N.d6, time: 0.14, gain: 0.09, space: 0.4 },
  ],

  // --- 支援カード ---
  item: [
    { noise: true, from: 0, band: 3200, bandTo: 1400, time: 0.09, gain: 0.06 },
    { wave: 'triangle', from: N.f5, to: N.a5, time: 0.13, gain: 0.11, cutoff: 2400, cutoffTo: 5200, detune: 8, space: 0.24 },
  ],
  action: [
    { wave: 'triangle', from: N.d5, to: N.f5, time: 0.14, gain: 0.11, cutoff: 1800, cutoffTo: 5000, detune: 8, space: 0.28 },
    { wave: 'sine', from: N.a5, to: N.d6, time: 0.16, gain: 0.07, delay: 0.07, space: 0.36 },
  ],

  // --- 戦闘 ---
  /** 打撃。低い胴と、掃けるノイズの2枚重ね */
  attack: [
    { noise: true, from: 0, band: 3400, bandTo: 700, time: 0.13, gain: 0.15, attack: 0.001 },
    { wave: 'sawtooth', from: 190, to: 52, time: 0.19, gain: 0.15, cutoff: 3000, cutoffTo: 260, attack: 0.001 },
    { wave: 'sine', from: 88, to: 44, time: 0.24, gain: 0.11, attack: 0.001, space: 0.24 },
  ],
  damage: [
    { noise: true, from: 0, band: 1500, bandTo: 420, time: 0.11, gain: 0.11, attack: 0.001 },
    { wave: 'triangle', from: 150, to: 70, time: 0.13, gain: 0.08, cutoff: 1200, cutoffTo: 300 },
  ],
  selfDamage: [
    { wave: 'triangle', from: 210, to: 120, time: 0.15, gain: 0.09, cutoff: 1000, cutoffTo: 380 },
  ],
  poison: [
    { wave: 'sine', from: 330, to: 262, time: 0.2, gain: 0.08, space: 0.4 },
    { wave: 'sine', from: 262, to: 336, time: 0.18, gain: 0.07, delay: 0.16, space: 0.4 },
    { noise: true, from: 0, band: 620, bandTo: 380, time: 0.3, gain: 0.04, attack: 0.05, space: 0.4 },
  ],
  coin: [
    { wave: 'triangle', from: N.d6, time: 0.05, gain: 0.09, cutoff: 6000, space: 0.3 },
    { wave: 'triangle', from: N.a6, time: 0.07, gain: 0.09, delay: 0.08, cutoff: 8000, space: 0.34 },
  ],
  /** 絶技。溜めてから撃つ。和音は都節で積む */
  ultimate: [
    // 溜め
    { noise: true, from: 0, band: 400, bandTo: 5200, time: 0.3, gain: 0.07, attack: 0.24, space: 0.4 },
    { wave: 'sawtooth', from: N.d3, to: N.d4, time: 0.3, gain: 0.06, cutoff: 300, cutoffTo: 2600, attack: 0.24 },
    // 一撃
    { noise: true, from: 0, band: 6000, bandTo: 900, time: 0.3, gain: 0.14, delay: 0.3, attack: 0.001, space: 0.5 },
    { wave: 'sawtooth', from: N.d4, to: N.d3, time: 0.5, gain: 0.12, delay: 0.3, cutoff: 5200, cutoffTo: 300, attack: 0.002 },
    { wave: 'triangle', from: N.d5, time: 0.55, gain: 0.10, delay: 0.31, detune: 10, space: 0.55 },
    { wave: 'triangle', from: N.f5, time: 0.52, gain: 0.08, delay: 0.34, detune: 10, space: 0.55 },
    { wave: 'triangle', from: N.a5, time: 0.5, gain: 0.07, delay: 0.37, detune: 10, space: 0.55 },
  ],
  ko: [
    { noise: true, from: 0, band: 1800, bandTo: 260, time: 0.28, gain: 0.13, attack: 0.001 },
    { wave: 'sawtooth', from: N.f4, to: 46, time: 0.5, gain: 0.14, cutoff: 3200, cutoffTo: 180, attack: 0.002, space: 0.4 },
    { wave: 'sine', from: 70, to: 38, time: 0.55, gain: 0.09, space: 0.4 },
  ],
  /** ポイント獲得。都節の上行2音を鈴で */
  point: [
    { wave: 'sine', from: N.a5, time: 0.16, gain: 0.12, attack: 0.002, space: 0.5 },
    { wave: 'sine', from: N.d6, time: 0.34, gain: 0.12, delay: 0.1, attack: 0.002, space: 0.55 },
    { wave: 'triangle', from: N.d6, time: 0.1, gain: 0.05, delay: 0.1, cutoff: 6000, detune: 12 },
  ],
  beginTurn: [
    { wave: 'sine', from: N.d4, to: N.a4, time: 0.16, gain: 0.08, space: 0.4 },
  ],

  // --- 決着 ---
  win: [
    { wave: 'triangle', from: N.d4, time: 0.15, gain: 0.12, cutoff: 2600, detune: 7, space: 0.4 },
    { wave: 'triangle', from: N.f4, time: 0.15, gain: 0.12, delay: 0.14, cutoff: 3000, detune: 7, space: 0.4 },
    { wave: 'triangle', from: N.a4, time: 0.15, gain: 0.12, delay: 0.28, cutoff: 3600, detune: 7, space: 0.4 },
    { wave: 'triangle', from: N.d5, time: 0.7, gain: 0.14, delay: 0.42, cutoff: 4400, detune: 7, space: 0.6 },
    { wave: 'sine', from: N.d6, time: 0.66, gain: 0.06, delay: 0.42, attack: 0.01, space: 0.6 },
    { wave: 'sine', from: N.a5, time: 0.66, gain: 0.05, delay: 0.45, attack: 0.01, space: 0.6 },
  ],
  lose: [
    { wave: 'triangle', from: N.d5, time: 0.2, gain: 0.11, cutoff: 1800, cutoffTo: 1200, space: 0.4 },
    { wave: 'triangle', from: N.bb4, time: 0.2, gain: 0.11, delay: 0.18, cutoff: 1500, cutoffTo: 1000, space: 0.4 },
    { wave: 'triangle', from: N.f4, time: 0.24, gain: 0.11, delay: 0.36, cutoff: 1300, cutoffTo: 800, space: 0.45 },
    { wave: 'sawtooth', from: N.d4, to: N.d3, time: 0.9, gain: 0.11, delay: 0.56, cutoff: 900, cutoffTo: 200, space: 0.5 },
  ],
  draw_game: [
    { wave: 'triangle', from: N.d5, time: 0.22, gain: 0.10, cutoff: 2200, space: 0.4 },
    { wave: 'triangle', from: N.d5, time: 0.5, gain: 0.09, delay: 0.24, cutoff: 1800, cutoffTo: 900, space: 0.5 },
  ],
}

let ctx: AudioContext | null = null
let bus: GainNode | null = null
let send: GainNode | null = null
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
      buildBus(ctx)
    } catch {
      return null // 音が出せなくても対戦は続けられる
    }
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/**
 * 出口の共通経路。
 *
 *   各音 ──┬─────────────→ bus ─→ コンプレッサ ─→ 出力
 *          └─ send ─→ 残響 ─┘
 *
 * コンプレッサを挟むのは、効果音が重なったときに歪ませないため。
 */
function buildBus(audio: AudioContext): void {
  const comp = audio.createDynamicsCompressor()
  comp.threshold.setValueAtTime(-18, 0)
  comp.knee.setValueAtTime(24, 0)
  comp.ratio.setValueAtTime(3.2, 0)
  comp.attack.setValueAtTime(0.004, 0)
  comp.release.setValueAtTime(0.2, 0)
  comp.connect(audio.destination)

  bus = audio.createGain()
  bus.gain.setValueAtTime(0.9, 0)
  bus.connect(comp)

  const reverb = audio.createConvolver()
  reverb.buffer = impulse(audio)
  const wet = audio.createGain()
  wet.gain.setValueAtTime(0.55, 0)
  reverb.connect(wet)
  wet.connect(comp)

  send = audio.createGain()
  send.gain.setValueAtTime(1, 0)
  send.connect(reverb)
}

/**
 * 残響のインパルス応答を作る。音声ファイルを持たないので自分で合成する。
 * 左右で減衰の乱数を変え、広がりを出す。0.9秒の小さめの間。
 */
function impulse(audio: AudioContext): AudioBuffer {
  const length = Math.floor(audio.sampleRate * 0.9)
  const buffer = audio.createBuffer(2, length, audio.sampleRate)
  for (let ch = 0; ch < 2; ch += 1) {
    const data = buffer.getChannelData(ch)
    for (let i = 0; i < length; i += 1) {
      // 初期の数msは薄くして、直接音との境目を作らない
      const t = i / length
      const decay = Math.pow(1 - t, 2.6)
      data[i] = (Math.random() * 2 - 1) * decay * (i < 240 ? i / 240 : 1)
    }
  }
  return buffer
}

/** 打撃音のもと。1度だけ作って使い回す */
function noiseBuffer(audio: AudioContext): AudioBuffer {
  if (noise !== null) return noise
  const length = Math.floor(audio.sampleRate * 0.6)
  const buffer = audio.createBuffer(1, length, audio.sampleRate)
  const data = buffer.getChannelData(0)
  // 乱数は演出用。core の決定論とは無関係（3章の制約は core のみ）
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1
  noise = buffer
  return buffer
}

const NYQUIST = 20000

function playVoice(audio: AudioContext, voice: Voice, at: number, wobble: number): void {
  if (bus === null || send === null) return
  const start = at + (voice.delay ?? 0)
  const end = start + voice.time * (1 + wobble * 0.06)
  const peak = voice.gain ?? 0.18
  const attack = voice.attack ?? 0.006

  const amp = audio.createGain()
  amp.gain.setValueAtTime(0.0001, start)
  amp.gain.exponentialRampToValueAtTime(peak, start + attack)
  amp.gain.exponentialRampToValueAtTime(0.0001, end)

  // 定位。奥行きの演出は pan と残響の量で作る
  const pan = audio.createStereoPanner()
  pan.pan.setValueAtTime(Math.max(-1, Math.min(1, voice.pan ?? 0)), start)
  amp.connect(pan)
  pan.connect(bus)

  const dry = audio.createGain()
  dry.gain.setValueAtTime(voice.space ?? 0.18, start)
  pan.connect(dry)
  dry.connect(send)

  if (voice.noise === true) {
    const src = audio.createBufferSource()
    src.buffer = noiseBuffer(audio)
    src.playbackRate.setValueAtTime(1 + wobble * 0.1, start)
    const band = audio.createBiquadFilter()
    band.type = 'bandpass'
    band.Q.setValueAtTime(1.1, start)
    band.frequency.setValueAtTime(voice.band ?? 1000, start)
    if (voice.bandTo !== undefined) band.frequency.exponentialRampToValueAtTime(voice.bandTo, end)
    src.connect(band)
    band.connect(amp)
    src.start(start)
    src.stop(end + 0.02)
    return
  }

  // ローパスを1枚必ず通す。カットオフを動かすのが「安っぽさ」を消す一番の要素
  const lp = audio.createBiquadFilter()
  lp.type = 'lowpass'
  lp.Q.setValueAtTime(0.9, start)
  lp.frequency.setValueAtTime(voice.cutoff ?? NYQUIST, start)
  if (voice.cutoffTo !== undefined) lp.frequency.exponentialRampToValueAtTime(voice.cutoffTo, end)
  lp.connect(amp)

  // 毎回わずかに音程をずらす。同じ波形が続くと機械に聞こえる
  const shift = 1 + wobble * 0.012
  const count = voice.detune === undefined || voice.detune === 0 ? 1 : 2
  for (let i = 0; i < count; i += 1) {
    const osc = audio.createOscillator()
    osc.type = voice.wave ?? 'triangle'
    if (i === 1) osc.detune.setValueAtTime(voice.detune ?? 0, start)
    osc.frequency.setValueAtTime(voice.from * shift, start)
    if (voice.to !== undefined) osc.frequency.exponentialRampToValueAtTime(voice.to * shift, end)
    osc.connect(lp)
    osc.start(start)
    osc.stop(end + 0.02)
  }
}

/**
 * 定義があれば鳴らす。無ければ黙って何もしない（対応表を網羅しなくてよい）。
 *
 * `pan` は呼び出し側の事情（相手の行動か自分の行動か）を音に乗せるための引数。
 * 定義そのものは局面を知らないので、ここで足す。
 */
export function play(name: string, pan = 0): void {
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

  const wobble = Math.random() * 2 - 1
  for (const voice of sfx) {
    playVoice(audio, pan === 0 ? voice : { ...voice, pan: (voice.pan ?? 0) + pan }, now, wobble)
  }
}

/** 対応する効果音を持つログ種別か */
export function hasSfx(name: string): boolean {
  return SFX[name] !== undefined
}
