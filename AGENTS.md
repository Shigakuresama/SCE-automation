# Repository Guidelines

## Project Structure & Module Organization
This repo is a collection of automation tools for the SCE Rebate Center.

- `sce-helper.user.js` and `sce-replay-helper.user.js`: Tampermonkey user scripts for in-browser automation.
- `CasePackets/`: Case-specific inputs, evidence, uploads, and outputs. Use the template under `CasePackets/template/`.
- `playwright-automation/`: Playwright-based automation and Zillow scraping scripts.
- `playwright-automation/sce-proxy-server/`: Local Express proxy for property data scraping.
- `sce-mcp-server/`: TypeScript MCP server used for agent-driven workflows.

## Build, Test, and Development Commands
Run commands from the module directory you’re working in.

- Playwright automation:
  - `cd playwright-automation && npm install && npm run install` (install deps + Chromium)
  - `npm run autofill "<address>"`, `npm run scrape "<address>"`, `npm run full case-data.json`
- Proxy server:
  - `cd playwright-automation/sce-proxy-server && npm install`
  - `npm run dev` (watch mode) or `npm start`
- MCP server:
  - `cd sce-mcp-server && npm install && npm run build`
  - `npm run dev` (build + run), `npm run watch` (tsc watch)

## Coding Style & Naming Conventions
- JavaScript/TypeScript uses ES modules (`import`/`export`).
- Indentation follows existing files: 4 spaces in user scripts, 2 spaces in TypeScript (`sce-mcp-server/src`).
- Prefer descriptive, task-based filenames (e.g., `full-workflow.js`, `field-visit.ts`).
- Case packet folders follow `YYYY-MM-DD__{appId}__{address}` (see README template).

## Testing Guidelines
- `sce-mcp-server` uses a custom test runner: `npm run test` (or `npm run test -- --save-auth`).
- Playwright automation has no formal test suite yet; validate changes by running the relevant script.

## Commit & Pull Request Guidelines
- This checkout does not include Git history; follow concise, imperative commit messages (e.g., `feat: add field mapper` or `fix: handle empty selector`).
- PRs should include: purpose/summary, testing notes, and screenshots or logs when behavior changes.

## Security & Configuration Tips
- Do not commit `playwright-automation/auth/` or any cookies/session data.
- Case packets and HAR files can contain PII—sanitize or exclude before sharing.
- Runtime tuning lives in `playwright-automation/config.js`; keep secrets out of source control.
