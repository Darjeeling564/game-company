/**
 * ランディング画面。games/ 配下のゲームへのリンクを並べるだけの薄い層。
 * ゲーム一覧はビルド時に vite.config.ts の define から注入される。
 */
const list = document.getElementById('game-list')

if (list) {
  if (__GAMES__.length === 0) {
    const empty = document.createElement('li')
    empty.className = 'game-list__empty'
    empty.textContent = 'まだゲームがありません。games/<game-name>/ を作成してください。'
    list.append(empty)
  } else {
    for (const name of __GAMES__) {
      const item = document.createElement('li')
      const link = document.createElement('a')
      link.className = 'game-list__link'
      link.href = `./games/${name}/index.html`
      link.textContent = name
      item.append(link)
      list.append(item)
    }
  }
}
