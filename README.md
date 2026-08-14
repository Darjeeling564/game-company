# game-company
カード/シミュレーション中心のゲーム開発リポジトリ（TypeScript + Vite）

## 必要環境

Node 22.6 以上が必要。`npm run sim` は追加ライブラリを使わず、Node の型ストリップ機能で `.ts` を直接実行するため。バージョンは `.nvmrc` で 22 に固定している。

```bash
nvm use          # .nvmrc の 22 に合わせる
npm ci
```

## コマンド

```bash
npm run dev        # 開発サーバ
npm run typecheck  # tsc --noEmit
npm run test       # vitest run
npm run sim        # バランスシミュレーション（npm run sim -- <game-name> で単体指定）
npm run build      # 本番ビルド
```
