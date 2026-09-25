/**
 * 効果音。WebAudio でその場で作る（音声ファイルを持たない）。
 *
 * maniwa-tcg と同じく**都節（みやこぶし）**の音階に寄せて、
 * 2本を行き来しても違う世界に聞こえないようにしている。
 *
 * 音が出せない環境（自動再生の制限・WebAudio 非対応）でも
 * **例外を投げずに黙る**。遊べる状態は壊さない。
 */
type Sfx = 'start' | 'draw' | 'summon' | 'attack' | 'spell' | 'trap' | 'set' | 'win' | 'lose' | 'draw_game'

let ctx: AudioContext | null = null
let muted = false

export function setMuted(value: boolean): void {
  muted = value
}

function context(): AudioContext | null {
  if (muted) return null
  try {
    if (ctx === null) ctx = new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

/** 単音。時間は秒 */
function tone(at: number, freq: number, dur: number, gain: number, type: OscillatorType): void {
  const c = context()
  if (c === null) return
  const osc = c.createOscillator()
  const amp = c.createGain()
  osc.type = type
  osc.frequency.value = freq
  amp.gain.setValueAtTime(0, c.currentTime + at)
  amp.gain.linearRampToValueAtTime(gain, c.currentTime + at + 0.01)
  amp.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + at + dur)
  osc.connect(amp)
  amp.connect(c.destination)
  osc.start(c.currentTime + at)
  osc.stop(c.currentTime + at + dur + 0.02)
}

/** 都節・D主音。d4 / es4 / g4 / a4 / c5 / d5 */
const D4 = 293.66
const ES4 = 311.13
const G4 = 392.0
const A4 = 440.0
const C5 = 523.25
const D5 = 587.33

export function play(name: Sfx): void {
  if (muted) return
  switch (name) {
    case 'start':
      tone(0, D4, 0.18, 0.18, 'triangle')
      tone(0.12, A4, 0.18, 0.16, 'triangle')
      tone(0.24, D5, 0.35, 0.14, 'triangle')
      break
    case 'draw':
      tone(0, C5, 0.07, 0.10, 'sine')
      break
    case 'summon':
      tone(0, G4, 0.10, 0.16, 'triangle')
      tone(0.08, C5, 0.16, 0.14, 'triangle')
      break
    case 'attack':
      tone(0, ES4, 0.08, 0.20, 'sawtooth')
      tone(0.06, D4, 0.16, 0.16, 'sawtooth')
      break
    case 'spell':
      tone(0, A4, 0.09, 0.14, 'sine')
      tone(0.07, D5, 0.20, 0.12, 'sine')
      break
    case 'trap':
      // 割り込みは「止める」音。下行させる
      tone(0, D5, 0.08, 0.18, 'square')
      tone(0.07, G4, 0.10, 0.16, 'square')
      tone(0.15, D4, 0.24, 0.14, 'square')
      break
    case 'set':
      tone(0, D4, 0.06, 0.10, 'sine')
      break
    case 'win':
      tone(0, D4, 0.14, 0.18, 'triangle')
      tone(0.12, G4, 0.14, 0.18, 'triangle')
      tone(0.24, C5, 0.14, 0.18, 'triangle')
      tone(0.36, D5, 0.45, 0.16, 'triangle')
      break
    case 'lose':
      tone(0, D5, 0.16, 0.14, 'triangle')
      tone(0.16, A4, 0.16, 0.14, 'triangle')
      tone(0.32, D4, 0.55, 0.14, 'triangle')
      break
    case 'draw_game':
      tone(0, G4, 0.22, 0.14, 'triangle')
      tone(0.2, G4, 0.35, 0.12, 'triangle')
      break
  }
}
