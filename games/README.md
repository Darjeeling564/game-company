# games/

1ゲーム1ディレクトリ。ディレクトリ名は小文字・数字・ハイフンのみ（`tools/games.ts` の `isGameName`）。

```
games/<game-name>/
  SPEC.md          仕様書。実装より先に必ず作成し、承認を得る
  index.html       エントリ。ビルド対象として自動的に拾われる
  src/
    core/          純粋ロジック層。reduce(state, action) => state のみ
    game/          描画・入力・音。core を呼ぶだけ
    data/          カード定義・パラメータ等のデータ
  tests/           core を対象とするテスト（*.test.ts）
  tools/
    sim.ts         バランスシミュレーション。`npm run sim` から呼ばれる
```

CLAUDE.md 7章に従い **SPEC.md を先に書いて承認を得てから実装に入る**ため、
`SPEC.md` だけが置かれた状態は正常な中間状態である。この段階では

- `index.html` が無いのでビルド対象に含まれない
- `tools/sim.ts` が無いので `npm run sim` からスキップされる（`npm run sim -- <name>` と明示した場合はエラー）

ファイルが揃った時点で、設定変更なしに以下が有効になる。

- `npm run build` — `games/<name>/index.html` がビルド対象に加わり、ランディングにリンクが並ぶ
- `npm run test` — `games/<name>/tests/**/*.test.ts` が実行される
- `npm run sim` — `games/<name>/tools/sim.ts` が実行される（`npm run sim -- <name>` で単体指定）
- `tests/core-purity.test.ts` — `src/core/` の禁止API混入を検査する

制約の詳細はリポジトリ直下の `CLAUDE.md` を参照。
