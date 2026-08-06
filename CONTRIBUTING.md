# Contributing to LifeOS

Thanks for helping make personal productivity calmer, more private and more useful.

## Before you begin

- Search existing issues before opening a new one.
- For a large feature, open a discussion issue before writing code.
- Keep personal data on-device unless a feature is explicitly optional and encrypted.
- Avoid adding production dependencies without a strong reason.

## Local setup

```bash
git clone https://github.com/mmoya113/lifeos.git
cd lifeos
python -m http.server 8080
```

Open `http://localhost:8080`. Run the tests with `npm test`.

## Project structure

- `index.html` — accessible app structure and dialogs
- `styles.css` — design system and responsive layout
- `src/app.js` — state, rendering and interactions
- `src/core.js` — framework-free business logic
- `tests/` — Node built-in tests
- `sw.js` — offline service worker

## Pull requests

1. Fork the repository and create a focused branch.
2. Keep changes small and explain the user benefit.
3. Test desktop and mobile widths.
4. Run `npm test`.
5. Include screenshots for visual changes.

By contributing, you agree that your work may be distributed under the MIT License.
