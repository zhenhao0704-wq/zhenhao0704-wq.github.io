# Testing

A lightweight safety net for this static site. Runs automatically on every push
and pull request via GitHub Actions (`.github/workflows/ci.yml`).

## Run everything

```bash
npm install        # first time only
npm test           # id check + HTML validation + Playwright smoke tests
```

## Individual checks

| Command | What it does |
|---------|--------------|
| `npm run check:ids` | Verifies every `getElementById('x')` in the inline scripts points at an element that actually declares `id="x"`, and that no id is duplicated. (Catches the class of bug where the lightbox `<img id="lightboxImg">` was referenced as `getElementById('lightbox-img')`.) |
| `npm run check:html` | Validates markup structure with `html-validate` — unclosed/stray tags, etc. Stylistic rules are relaxed in `.htmlvalidate.json`. |
| `npm run test:e2e` | Playwright smoke tests in `tests/smoke.spec.js`: page loads without JS errors, gallery lightbox opens/closes, video modal opens/closes, teaching carousel advances. |

## Notes

- Playwright serves the site locally with `python3 -m http.server` (see `playwright.config.js`).
- The config auto-detects a pre-installed Chromium via `PLAYWRIGHT_BROWSERS_PATH`;
  in CI it installs one with `npx playwright install chromium`.
