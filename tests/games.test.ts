import { describe, expect, it } from 'vitest'
import {
  isGameName,
  listBuildableGames,
  listGames,
  listSimulatableGames,
  pickGameNames,
  simEntry,
} from '../tools/games.ts'

describe('isGameName', () => {
  it('小文字・数字・ハイフンのみ許可する', () => {
    expect(isGameName('rail-tycoon')).toBe(true)
    expect(isGameName('game2')).toBe(true)
  })

  it('隠しディレクトリや大文字・記号を弾く', () => {
    for (const bad of ['.git', 'node_modules/x', 'MyGame', '-lead', '', 'a_b']) {
      expect(isGameName(bad)).toBe(false)
    }
  })
})

describe('pickGameNames', () => {
  it('不正な名前を除外して昇順に整列する', () => {
    expect(pickGameNames(['zoo', '.DS_Store', 'apple', 'Bad'])).toEqual(['apple', 'zoo'])
  })

  it('入力配列を破壊しない', () => {
    const input = ['b', 'a']
    pickGameNames(input)
    expect(input).toEqual(['b', 'a'])
  })
})

describe('listGames', () => {
  it('games/ が存在しないルートでは空配列を返す', () => {
    expect(listGames('/nonexistent-root-for-test')).toEqual([])
  })

  it('実リポジトリを走査しても例外を投げない', () => {
    expect(Array.isArray(listGames())).toBe(true)
  })
})

describe('simEntry', () => {
  it('games/<name>/tools/sim.ts を指す', () => {
    expect(simEntry('rail-tycoon', '/repo')).toBe('/repo/games/rail-tycoon/tools/sim.ts')
  })
})

describe('実装状況によるふるい分け', () => {
  it('ビルド対象は games/ 全体の部分集合になる', () => {
    const all = listGames()
    for (const name of listBuildableGames()) {
      expect(all).toContain(name)
    }
  })

  it('シミュレーション対象は games/ 全体の部分集合になる', () => {
    const all = listGames()
    for (const name of listSimulatableGames()) {
      expect(all).toContain(name)
    }
  })

  it('games/ が存在しないルートでは空配列を返す', () => {
    expect(listBuildableGames('/nonexistent-root-for-test')).toEqual([])
    expect(listSimulatableGames('/nonexistent-root-for-test')).toEqual([])
  })
})
