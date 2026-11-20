# Between Web

Run locally with Node.js:

```sh
cd web
npm run dev
```

Open http://127.0.0.1:4173. No installation or build is needed to run the app. The server disables caching so refreshing picks up the latest fixes.

For the development checks:

```sh
npm install
npm run check
npm test
```

The tests run the app in jsdom through its rendered controls, using controlled timers. They cover three-card progression, card uniqueness, scrolling and drag handlers, reshuffling, navigation during animation, saved readings, legacy Journal positions, reduced motion, and storage failures. They do not replace visual testing in a browser.
