# Башня принцессы: сервер и игра

- `server.js` раздаёт файлы из `public/`, ведёт лобби и пересылает сообщения между игроками.
- `public/index.html` лобби, `public/game.js` сама игра (хост считает мир, остальные получают снимки),
  `public/shared.js` цвета драконов, `public/test.html` проверка связи.
- Запуск локально: `npm install`, `npm start`, открыть http://localhost:3000
- Развёртывание на Render: файл `render.yaml` уже настроен (регион Frankfurt, тариф Free).
