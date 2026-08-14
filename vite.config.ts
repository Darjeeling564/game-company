/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import { listBuildableGames } from './tools/games.ts'

// index.html を持つゲームだけがビルド対象。SPEC のみのディレクトリは実装前として除外する
const games = listBuildableGames()

// ランディング（index.html）と games/<name>/index.html をまとめてビルドする。
// ゲームを追加しても設定を触る必要はない。
const input: Record<string, string> = { index: resolve(import.meta.dirname, 'index.html') }
for (const name of games) {
  input[name] = resolve(import.meta.dirname, 'games', name, 'index.html')
}

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    rollupOptions: { input },
  },
  define: {
    __GAMES__: JSON.stringify(games),
  },
  test: {
    include: ['tests/**/*.test.ts', 'games/*/tests/**/*.test.ts'],
    environment: 'node',
  },
})
