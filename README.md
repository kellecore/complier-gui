# Complier GUI

<p align="center">
  <img src="https://i.ibb.co/VWfVJ5Yx/0-F8-F07-D2-5-DE1-42-EB-9-B49-BD003-EFF2-D8-A.png" alt="Complier GUI Screenshot" width="800" />
</p>

<p align="center">
  <strong>Desktop-first Prompt Compiler experience powered by Electron + FastAPI + Next.js</strong>
</p>

<p align="center">
  <a href="https://github.com/kellecore/complier-gui/blob/main/LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-green.svg" /></a>
  <a href="https://github.com/kellecore/complier-gui"><img alt="Platform" src="https://img.shields.io/badge/platform-Windows-blue" /></a>
  <a href="https://nodejs.org/"><img alt="Node" src="https://img.shields.io/badge/node-%3E%3D18-339933" /></a>
  <a href="https://www.python.org/"><img alt="Python" src="https://img.shields.io/badge/python-%3E%3D3.10-3776AB" /></a>
</p>

---

## Overview

**Complier GUI** is a desktop application built on top of [madara88645/Compiler](https://github.com/madara88645/Compiler), packaged with Electron for seamless local usage.

This repository:
- Runs the Compiler core under `core/`
- Automatically starts backend + frontend services via `electron/main.js`
- Provides in-app management for LLM provider, model, base URL, and API key settings

## Features

- **Electron-based desktop interface** - Native window experience
- **Prompt compilation** - Compile, optimize, and run in offline mode
- **Context Manager (RAG)** - Upload and search documents
- **Quality Coach** - Validate and fix prompts
- **Multi-provider support:**
  - OpenAI-compatible endpoints
  - OpenAI
  - Anthropic
  - Gemini
- **Language toggle** - Switch between Turkish and English

## Project Structure

```
complier-gui/
├── electron/           # Electron main process
├── core/               # Compiler core (API + web + cli + tests)
├── start_app.bat       # Windows one-click launcher
├── ATTRIBUTION.md      # Source attribution details
└── README.md
```

## Quick Start

### Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js     | 18+     |
| Python      | 3.10+   |
| OS          | Windows |

### Installation

```bash
npm install
npm run setup
```

### Running the App

**Development mode:**

```bash
npm run dev
```

**Windows one-click launch:**

```bat
start_app.bat
```

## Runtime Endpoints

| Service  | URL                     |
|----------|-------------------------|
| Backend  | `http://127.0.0.1:8080` |
| Frontend | `http://127.0.0.1:3000` |

## LLM Provider Configuration

Open the **LLM Settings** panel in the app and configure:

- Provider
- Base URL
- Model
- API Key

Settings are stored locally on your machine.

## Troubleshooting

### App not starting or loading slowly

1. Ensure frontend dependencies are installed:
   ```bash
   npm run setup
   ```

2. Verify Python packages:
   ```bash
   python -m pip install -r core/requirements.txt
   ```

### Port conflicts (3000 / 8080)

The `start_app.bat` script includes automatic cleanup of stale processes. If issues persist, manually terminate them:

```bat
for /f "tokens=5" %a in ('netstat -ano ^| findstr :8080 ^| findstr LISTENING') do taskkill /PID %a /T /F
for /f "tokens=5" %a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do taskkill /PID %a /T /F
```

## Attribution

This project builds upon the open-source [madara88645/Compiler](https://github.com/madara88645/Compiler).

For detailed attribution:
- [`ATTRIBUTION.md`](./ATTRIBUTION.md)
- [`LICENSE`](./LICENSE)

## License

MIT - see [`LICENSE`](./LICENSE).
