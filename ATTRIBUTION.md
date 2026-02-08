# Attribution and Source Usage

## Source project

This repository was created by reusing and adapting code from:

- Project: [madara88645/Compiler](https://github.com/madara88645/Compiler)
- Original license: MIT

## What was reused

The following parts were copied and used as the base:

- `core/api/*` (FastAPI backend)
- `core/app/*` (compiler logic, LLM engine, heuristics, RAG, optimizer, reporting)
- `core/cli/*` (CLI commands)
- `core/web/*` (Next.js UI)
- `core/templates/*`, `core/schema/*`, `core/tests/*`, `core/scripts/*`

## What was changed in this repo

- Added Electron shell to run backend + frontend as a desktop app:
  - `electron/main.js`
  - `start_app.bat`
- Added runtime provider support wiring for:
  - OpenAI-compatible
  - OpenAI
  - Anthropic
  - Gemini
- Added/updated UI settings flow for provider/model/base URL/API key.
- Startup and process-management fixes for desktop usage.

## License and notice

This project keeps attribution to the original work and follows the original MIT license terms for reused parts.
Please keep this attribution file and the original license references when redistributing.

## Setup summary

```bash
cd complier-gui
npm install
npm run setup
npm run dev
```
