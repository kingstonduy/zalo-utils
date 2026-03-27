# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

-   **Dev server:** `npm run dev` (Vite with HMR)
-   **Build:** `npm run build` (outputs to `dist/`)
-   **Preview production build:** `npm run preview`
-   **Lint:** `npm run lint` (ESLint with react-hooks and react-refresh plugins)

## Architecture

React 19 + Vite 8 single-page app (JavaScript, no TypeScript). Entry point is `src/main.jsx` which renders `<App />` into `#root`. Currently a single-component app with no routing or state management beyond React's built-in hooks.

## Lint Rules

-   ESLint targets `**/*.{js,jsx}` files
-   `no-unused-vars` errors except for variables matching `^[A-Z_]`
-   React Hooks and React Refresh rules are enabled

## TASK

now i want you to read the source code,
now write for me a program use only html, css, js
u should have multiple page,
first page that can cover all the feature from this https://currentmillis.com/
second page should cover all feature from https://jsonformatter.org/ but add a feature to convert sttring to json
