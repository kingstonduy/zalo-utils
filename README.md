# Zalo Utils

A collection of developer utility tools built with React 19 + Vite 8, deployed to GitHub Pages.

## Features

### Time / Epoch Converter
- Real-time Unix timestamp display (milliseconds)
- Milliseconds to Date conversion (UTC and local time)
- Date to Milliseconds conversion with text input and interactive date picker
- Quick "Now" buttons and copy support

### JSON Tools
- JSON formatter with adjustable indentation (2, 3, 4 spaces or tab)
- JSON minifier and validator
- String to JSON converter (handles escaped strings, JSONL, auto-corrects quotes)
- Dual-panel editor with character count

### SQL Tools
- SQL formatter, minifier, and validator
- Keyword case converter (UPPERCASE / lowercase)
- Syntax highlighting for keywords, strings, numbers, comments
- Dual-panel editor with character count

### Redis Client
- Key getter with string key and byte array key modes
- Key pattern search with cursor-based pagination
- Key metadata display (type, encoding, size, TTL)
- TTL editor, key deletion, and copy value support

## Getting Started

```bash
npm install
npm run dev
```

## Scripts

| Command             | Description                  |
|---------------------|------------------------------|
| `npm run dev`       | Start dev server with HMR    |
| `npm run build`     | Build for production to `dist/` |
| `npm run preview`   | Preview production build     |
| `npm run lint`      | Run ESLint                   |

## CI/CD — GitHub Pages Deployment

This project uses **GitHub Actions** to automatically build and deploy to GitHub Pages on every push to `master`.

### How it works

```
Push to master
     |
     v
+--------------------+
|   1. Checkout       |  Clone the repository
+--------------------+
     |
     v
+--------------------+
|   2. Setup Node 20  |  Install Node.js and cache npm dependencies
+--------------------+
     |
     v
+--------------------+
|   3. npm ci         |  Clean install dependencies from lockfile
+--------------------+
     |
     v
+--------------------+
|   4. npm run build  |  Vite builds the app into dist/
+--------------------+
     |
     v
+--------------------+
|   5. Upload artifact|  Upload dist/ as a Pages artifact
+--------------------+
     |
     v
+--------------------+
|   6. Deploy Pages   |  GitHub deploys the artifact to Pages
+--------------------+
     |
     v
  Live at https://<username>.github.io/zalo-utils/
```

### Setup required

1. Go to your GitHub repo **Settings > Pages**
2. Under **Build and deployment > Source**, select **GitHub Actions**
3. Push to `master` — the workflow runs automatically

The workflow config is at `.github/workflows/deploy.yml`. The Vite `base` is set to `/zalo-utils/` to match the GitHub Pages subpath.

## Tech Stack

- React 19
- Vite 8
- React Router (HashRouter)
- ESLint
- GitHub Actions + GitHub Pages
